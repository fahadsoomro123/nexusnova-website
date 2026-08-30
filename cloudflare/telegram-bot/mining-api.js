import { accountEligibilityRequest } from './account-eligibility.js';

const FIREBASE_PROJECT_ID = 'nexusnova-6ade2';
const FIRESTORE_DATABASE = `projects/${FIREBASE_PROJECT_ID}/databases/(default)`;
const FIRESTORE_DOCUMENTS = `${FIRESTORE_DATABASE}/documents`;
const FIRESTORE_API = `https://firestore.googleapis.com/v1/${FIRESTORE_DATABASE}`;
const SESSION_MS = 86_400_000;
const SESSION_REWARD = 24;
const MAX_BODY_BYTES = 512;
let googleTokenCache = null;
let signingKeyCache = null;

class MiningError extends Error {
  constructor(status, code, publicMessage, detail = publicMessage) {
    super(detail);
    this.status = status;
    this.code = code;
    this.publicMessage = publicMessage;
  }
}

export async function miningSessionRequest(request, env) {
  try {
    const eligibility = await accountEligibilityRequest(request, env);
    const eligibilityData = await eligibility.clone().json().catch(() => ({}));
    if (!eligibility.ok || eligibilityData?.ok !== true) {
      throw new MiningError(
        eligibility.status || 401,
        eligibilityData?.code || 'unauthenticated',
        eligibilityData?.error || 'NexusNova account eligibility could not be verified.'
      );
    }
    if (eligibilityData.eligibleForValueActions !== true) {
      throw new MiningError(412, eligibilityData.reason || 'not-eligible', eligibilityMessage(eligibilityData.reason));
    }

    const body = await readBody(request);
    const action = String(body?.action || '').trim().toLowerCase();
    if (action !== 'start' && action !== 'restart') {
      throw new MiningError(400, 'invalid-action', 'Choose a valid mining action.');
    }

    const uid = uidFromValidatedBearer(request.headers.get('Authorization'));
    const credentials = serviceAccount(env);
    const accessToken = await googleAccessToken(credentials);
    const transaction = await beginTransaction(accessToken);
    let transactionOpen = true;

    try {
      const profileName = documentName('users', uid);
      const docs = await batchGet(accessToken, [profileName], transaction);
      const profile = docs.get(profileName) || null;
      if (!profile) throw new MiningError(404, 'profile-not-found', 'NexusNova profile is not ready yet.');

      const state = normalizeMiningState(profile);
      const now = Date.now();
      let fields;
      let earned = 0;

      if (action === 'start') {
        if (state.miningActive) {
          throw new MiningError(409, 'session-active', 'Mining is already live on this NexusNova account.');
        }
        if (state.miningStartedAt !== 0) {
          throw new MiningError(409, 'invalid-mining-state', 'Mining state needs secure repair before a new session can start.');
        }
        fields = {
          miningActive: fsBool(true),
          miningStartedAt: fsInt(now),
          miningLastUpdate: fsInt(now)
        };
      } else {
        if (!state.miningActive || state.miningStartedAt <= 0) {
          throw new MiningError(409, 'session-not-complete', 'There is no completed live session to restart.');
        }
        if (now - state.miningStartedAt < SESSION_MS) {
          throw new MiningError(409, 'session-active', 'The current 24-hour mining session is still live.');
        }
        earned = SESSION_REWARD;
        fields = {
          balance: fsNumber(state.balance + SESSION_REWARD),
          totalMined: fsNumber(state.totalMined + SESSION_REWARD),
          novaVaultPending: fsInt(state.novaVaultPending + 1),
          miningActive: fsBool(true),
          miningStartedAt: fsInt(now),
          miningLastUpdate: fsInt(now)
        };
      }

      await commit(accessToken, [updateWrite(profileName, fields)], transaction);
      transactionOpen = false;

      return Response.json({
        ok: true,
        action,
        miningActive: true,
        miningStartedAt: now,
        sessionMs: SESSION_MS,
        sessionReward: SESSION_REWARD,
        earned,
        message: action === 'restart'
          ? 'Completed session claimed and the next 24-hour mining session started.'
          : 'Your 24-hour mining session started.'
      }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
      if (transactionOpen) await rollback(accessToken, transaction);
      throw error;
    }
  } catch (error) {
    if (error instanceof MiningError) {
      return Response.json({ ok: false, code: error.code, error: error.publicMessage }, {
        status: error.status,
        headers: { 'Cache-Control': 'no-store' }
      });
    }
    console.error('Mining API error:', error instanceof Error ? error.message : 'Unknown error');
    return Response.json({
      ok: false,
      code: 'internal',
      error: 'Secure mining service is temporarily unavailable.'
    }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
}

function eligibilityMessage(reason) {
  if (reason === 'email-unverified') return 'Verify your email before starting value-bearing mining.';
  if (reason === 'disposable-email') return 'Temporary-email accounts cannot start value-bearing mining.';
  if (reason === 'account-integrity-review') return 'Mining is paused while this account needs an integrity review.';
  return 'This account is not currently eligible for value-bearing mining.';
}

async function readBody(request) {
  const declared = Number(request.headers.get('Content-Length') || 0);
  if (declared > MAX_BODY_BYTES) throw new MiningError(413, 'request-too-large', 'Mining request is too large.');
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) throw new MiningError(413, 'request-too-large', 'Mining request is too large.');
  try { return JSON.parse(text || '{}'); }
  catch (_) { throw new MiningError(400, 'invalid-argument', 'Mining request is invalid.'); }
}

function uidFromValidatedBearer(authorization) {
  const match = /^Bearer\s+([^\s]+)$/i.exec(String(authorization || ''));
  if (!match) throw new MiningError(401, 'unauthenticated', 'Sign in to NexusNova first.');
  try {
    const encoded = match[1].split('.')[1];
    const padded = encoded.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(encoded.length / 4) * 4, '=');
    const payload = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(padded), char => char.charCodeAt(0))));
    const uid = String(payload.sub || '');
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(uid)) throw new Error('bad-uid');
    return uid;
  } catch (_) {
    throw new MiningError(401, 'unauthenticated', 'Firebase session is invalid.');
  }
}

function normalizeMiningState(document) {
  const balance = numberField(document, 'balance');
  const totalMined = numberField(document, 'totalMined');
  const novaVaultPending = numberField(document, 'novaVaultPending', 0);
  const miningStartedAt = numberField(document, 'miningStartedAt', 0);
  const miningActive = document?.fields?.miningActive?.booleanValue === true;
  if (![balance, totalMined, novaVaultPending, miningStartedAt].every(Number.isFinite) ||
      balance < 0 || totalMined < 0 || novaVaultPending < 0 || miningStartedAt < 0) {
    throw new MiningError(409, 'invalid-mining-state', 'Mining account values need secure repair.');
  }
  return { balance, totalMined, novaVaultPending, miningStartedAt, miningActive };
}

function serviceAccount(env) {
  if (env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      const parsed = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON);
      if (parsed.project_id === FIREBASE_PROJECT_ID && parsed.client_email && parsed.private_key) return parsed;
    } catch (_) {}
  }
  const clientEmail = String(env.FIREBASE_CLIENT_EMAIL || '').trim();
  const privateKey = String(env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n').trim();
  if (!clientEmail || !privateKey) {
    throw new MiningError(503, 'failed-precondition', 'Mining backend credentials are not configured.');
  }
  return { project_id: FIREBASE_PROJECT_ID, client_email: clientEmail, private_key: privateKey, private_key_id: '' };
}

async function googleAccessToken(credentials) {
  const now = Math.floor(Date.now() / 1000);
  const cacheKey = `${credentials.client_email}:${credentials.private_key_id || 'split'}`;
  if (googleTokenCache?.key === cacheKey && googleTokenCache.expiresAt > now + 60) return googleTokenCache.token;
  const assertion = await signJwt(credentials, {
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  });
  const form = new URLSearchParams({ grant_type: 'urn:ietf:params:oauth-type:jwt-bearer', assertion });
  form.set('grant_type', 'urn:ietf:params:oauth:grant-type:jwt-bearer');
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString()
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.access_token) {
    throw new MiningError(502, 'unavailable', 'Mining profile service is unavailable.');
  }
  googleTokenCache = { key: cacheKey, token: result.access_token, expiresAt: now + Number(result.expires_in || 3600) - 120 };
  return googleTokenCache.token;
}

async function signJwt(credentials, claims) {
  const header = { alg: 'RS256', typ: 'JWT' };
  if (credentials.private_key_id) header.kid = credentials.private_key_id;
  const unsigned = `${base64UrlJson(header)}.${base64UrlJson(claims)}`;
  const key = await signingKey(credentials);
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned));
  return `${unsigned}.${base64UrlBytes(new Uint8Array(signature))}`;
}

async function signingKey(credentials) {
  const cacheKey = `${credentials.client_email}:${credentials.private_key_id || 'split'}`;
  if (signingKeyCache?.keyId === cacheKey) return signingKeyCache.key;
  const pem = credentials.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, '');
  const bytes = Uint8Array.from(atob(pem), char => char.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', bytes, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  signingKeyCache = { keyId: cacheKey, key };
  return key;
}

function base64UrlJson(value) { return base64UrlBytes(new TextEncoder().encode(JSON.stringify(value))); }
function base64UrlBytes(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
function documentName(collection, id) { return `${FIRESTORE_DOCUMENTS}/${collection}/${id}`; }

async function beginTransaction(accessToken) {
  const result = await firestoreJson(`${FIRESTORE_API}/documents:beginTransaction`, {
    accessToken,
    method: 'POST',
    body: { options: { readWrite: {} } }
  });
  if (!result.transaction) throw new MiningError(502, 'unavailable', 'Mining transaction could not start.');
  return result.transaction;
}

async function batchGet(accessToken, names, transaction) {
  const rows = await firestoreJson(`${FIRESTORE_API}/documents:batchGet`, {
    accessToken,
    method: 'POST',
    body: { documents: names, transaction }
  });
  const docs = new Map(names.map(name => [name, null]));
  for (const row of Array.isArray(rows) ? rows : []) {
    if (row.found?.name) docs.set(row.found.name, row.found);
    if (row.missing) docs.set(row.missing, null);
  }
  return docs;
}

async function commit(accessToken, writes, transaction) {
  return firestoreJson(`${FIRESTORE_API}/documents:commit`, {
    accessToken,
    method: 'POST',
    body: { writes, transaction }
  });
}

async function rollback(accessToken, transaction) {
  try {
    await firestoreJson(`${FIRESTORE_API}/documents:rollback`, {
      accessToken,
      method: 'POST',
      body: { transaction }
    });
  } catch (_) {}
}

async function firestoreJson(url, { accessToken, method = 'GET', body = null }) {
  const response = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${accessToken}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const conflict = response.status === 409 || result.error?.status === 'ABORTED';
    throw new MiningError(conflict ? 409 : 502, conflict ? 'aborted' : 'unavailable', conflict ? 'Mining state changed. Please retry.' : 'Mining profile service is unavailable.');
  }
  return result;
}

function updateWrite(name, fields) {
  return { update: { name, fields }, updateMask: { fieldPaths: Object.keys(fields) } };
}
function numberField(document, field, fallback = NaN) {
  const value = document?.fields?.[field];
  if (!value) return fallback;
  const raw = value.integerValue ?? value.doubleValue;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}
function fsBool(value) { return { booleanValue: Boolean(value) }; }
function fsInt(value) { return { integerValue: String(Math.trunc(Number(value) || 0)) }; }
function fsNumber(value) { return { doubleValue: Number(value) }; }
