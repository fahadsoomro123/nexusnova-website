const FIREBASE_PROJECT_ID = 'nexusnova-6ade2';
const FIREBASE_API_KEY = 'AIzaSyBU75WYp5ioaMD1LrNcDyAvROFW2wrTil0';
const FIRESTORE_DATABASE = `projects/${FIREBASE_PROJECT_ID}/databases/(default)`;
const FIRESTORE_DOCUMENTS = `${FIRESTORE_DATABASE}/documents`;
const FIRESTORE_API = `https://firestore.googleapis.com/v1/${FIRESTORE_DATABASE}`;
const REFERRAL_RE = /^NVX-[A-Z0-9]{8,16}$/;
const REFERRAL_WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_BODY_BYTES = 2048;
let googleTokenCache = null;
let signingKeyCache = null;

class ReferralError extends Error {
  constructor(status, code, publicMessage, detail = publicMessage) {
    super(detail);
    this.status = status;
    this.code = code;
    this.publicMessage = publicMessage;
  }
}

export async function attachReferralRequest(request, env) {
  try {
    const body = await readBody(request);
    const code = String(body?.code || '').trim().toUpperCase();
    if (!REFERRAL_RE.test(code)) {
      throw new ReferralError(400, 'invalid-referral', 'Referral code is invalid.');
    }

    const user = await verifyFirebaseIdToken(request.headers.get('Authorization'));
    const credentials = serviceAccount(env);
    const accessToken = await googleAccessToken(credentials);
    const transaction = await beginTransaction(accessToken);
    let transactionOpen = true;

    try {
      const referralName = documentName('referrals', user.uid);
      const codeName = documentName('referralCodes', code);
      const profileName = documentName('users', user.uid);
      const docs = await batchGet(accessToken, [referralName, codeName, profileName], transaction);
      const existing = docs.get(referralName) || null;
      const codeDoc = docs.get(codeName) || null;
      const profile = docs.get(profileName) || null;

      if (!profile) throw new ReferralError(404, 'profile-not-found', 'NexusNova profile is not ready yet.');

      if (existing) {
        const existingCode = stringField(existing, 'code');
        const existingReferrer = stringField(existing, 'referrerUid');
        if (existingCode === code && existingReferrer) {
          await rollback(accessToken, transaction);
          transactionOpen = false;
          return response({
            ok: true,
            attached: true,
            idempotent: true,
            status: stringField(existing, 'status') || 'pending',
            message: 'This referral is already attached to your NexusNova account.'
          });
        }
        throw new ReferralError(409, 'referral-already-attached', 'This account already has referral attribution.');
      }

      if (!codeDoc) throw new ReferralError(404, 'referral-not-found', 'Referral code is not active.');
      const referrerUid = stringField(codeDoc, 'ownerUid');
      assertUid(referrerUid);
      if (referrerUid === user.uid) {
        throw new ReferralError(409, 'self-referral', 'Self-referrals are not allowed.');
      }

      const createdAt = timestampField(profile, 'createdAt');
      const createdMs = Date.parse(createdAt || '');
      if (!Number.isFinite(createdMs) || Date.now() - createdMs > REFERRAL_WINDOW_MS || createdMs - Date.now() > 60_000) {
        throw new ReferralError(412, 'referral-window-expired', 'Referral window has expired for this account.');
      }

      const now = new Date().toISOString();
      const writes = [
        updateWrite(referralName, {
          referredUid: fsString(user.uid),
          referrerUid: fsString(referrerUid),
          code: fsString(code),
          status: fsString('pending'),
          createdAt: fsTimestamp(now),
          updatedAt: fsTimestamp(now)
        }),
        updateWrite(profileName, {
          invitedBy: fsString(referrerUid),
          referralCode: fsString(code),
          referralStatus: fsString('pending')
        })
      ];
      await commit(accessToken, writes, transaction);
      transactionOpen = false;

      return response({
        ok: true,
        attached: true,
        idempotent: false,
        status: 'pending',
        message: 'Referral attached securely. No reward is issued at signup; activation must be verified server-side first.'
      });
    } catch (error) {
      if (transactionOpen) await rollback(accessToken, transaction);
      throw error;
    }
  } catch (error) {
    if (error instanceof ReferralError) {
      return response({ ok: false, code: error.code, error: error.publicMessage }, error.status);
    }
    console.error('Referral API error:', error instanceof Error ? error.message : 'Unknown error');
    return response({ ok: false, code: 'internal', error: 'Referral service is temporarily unavailable.' }, 502);
  }
}

async function readBody(request) {
  const declared = Number(request.headers.get('Content-Length') || 0);
  if (declared > MAX_BODY_BYTES) throw new ReferralError(413, 'invalid-argument', 'Referral request is too large.');
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) throw new ReferralError(413, 'invalid-argument', 'Referral request is too large.');
  try { return JSON.parse(text || '{}'); }
  catch (_) { throw new ReferralError(400, 'invalid-argument', 'Referral request is invalid.'); }
}

async function verifyFirebaseIdToken(authorization) {
  const match = /^Bearer\s+([^\s]+)$/i.exec(String(authorization || ''));
  if (!match || match[1].length > 10_000) throw new ReferralError(401, 'unauthenticated', 'Sign in to NexusNova first.');
  const idToken = match[1];
  const lookup = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken })
  });
  const result = await lookup.json().catch(() => ({}));
  const record = result.users?.[0];
  if (!lookup.ok || !record?.localId) throw new ReferralError(401, 'unauthenticated', 'Firebase session is invalid.');

  const payload = decodeJwtPayload(idToken);
  const uid = String(record.localId);
  assertUid(uid);
  const now = Math.floor(Date.now() / 1000);
  if (payload.sub !== uid || payload.aud !== FIREBASE_PROJECT_ID ||
      payload.iss !== `https://securetoken.google.com/${FIREBASE_PROJECT_ID}` ||
      Number(payload.exp || 0) <= now) {
    throw new ReferralError(401, 'unauthenticated', 'Firebase session is invalid.');
  }
  return { uid };
}

function decodeJwtPayload(token) {
  try {
    const encoded = token.split('.')[1];
    const padded = encoded.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(encoded.length / 4) * 4, '=');
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(padded), char => char.charCodeAt(0))));
  } catch (_) {
    throw new ReferralError(401, 'unauthenticated', 'Firebase session is invalid.');
  }
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
    throw new ReferralError(503, 'failed-precondition', 'Referral backend credentials are not configured.');
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
  const form = new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion });
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString()
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.access_token) {
    throw new ReferralError(502, 'unavailable', 'Referral profile service is unavailable.');
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

function assertUid(uid) {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(String(uid || ''))) {
    throw new ReferralError(409, 'failed-precondition', 'NexusNova account mapping is invalid.');
  }
}

function documentName(collection, id) { return `${FIRESTORE_DOCUMENTS}/${collection}/${id}`; }

async function beginTransaction(accessToken) {
  const result = await firestoreJson(`${FIRESTORE_API}/documents:beginTransaction`, { accessToken, method: 'POST', body: { options: { readWrite: {} } } });
  if (!result.transaction) throw new ReferralError(502, 'unavailable', 'Referral transaction could not start.');
  return result.transaction;
}

async function batchGet(accessToken, names, transaction) {
  const rows = await firestoreJson(`${FIRESTORE_API}/documents:batchGet`, { accessToken, method: 'POST', body: { documents: names, transaction } });
  const docs = new Map(names.map(name => [name, null]));
  for (const row of Array.isArray(rows) ? rows : []) {
    if (row.found?.name) docs.set(row.found.name, row.found);
    if (row.missing) docs.set(row.missing, null);
  }
  return docs;
}

async function commit(accessToken, writes, transaction) {
  return firestoreJson(`${FIRESTORE_API}/documents:commit`, { accessToken, method: 'POST', body: { writes, transaction } });
}

async function rollback(accessToken, transaction) {
  try { await firestoreJson(`${FIRESTORE_API}/documents:rollback`, { accessToken, method: 'POST', body: { transaction } }); }
  catch (_) {}
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
    throw new ReferralError(conflict ? 409 : 502, conflict ? 'aborted' : 'unavailable', conflict ? 'Referral state changed. Please retry.' : 'Referral profile service is unavailable.');
  }
  return result;
}

function updateWrite(name, fields) {
  return { update: { name, fields }, updateMask: { fieldPaths: Object.keys(fields) } };
}
function stringField(document, field) { return String(document?.fields?.[field]?.stringValue || ''); }
function timestampField(document, field) { return String(document?.fields?.[field]?.timestampValue || ''); }
function fsString(value) { return { stringValue: String(value || '') }; }
function fsTimestamp(value) { return { timestampValue: String(value) }; }
function response(body, status = 200) { return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } }); }
