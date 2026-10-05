const FIREBASE_PROJECT_ID = 'nexusnova-6ade2';
const FIRESTORE_DATABASE = `projects/${FIREBASE_PROJECT_ID}/databases/(default)`;
const FIRESTORE_DOCUMENTS = `${FIRESTORE_DATABASE}/documents`;
const FIRESTORE_API = `https://firestore.googleapis.com/v1/${FIRESTORE_DATABASE}`;
const ACTIVATION_MILESTONE = 'first-mining-complete';
const FIRST_MINING_REWARD = 24;
const MAX_CONFIGURED_REWARD_NVX = 1_000_000;
let googleTokenCache = null;
let signingKeyCache = null;

class ReferralActivationError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

export async function processReferralMiningActivation(referredUid, env) {
  assertUid(referredUid);
  const policy = referralRewardPolicy(env);
  if (!policy.enabled) {
    return { ok: true, enabled: false, activated: false, reason: policy.reason };
  }

  const credentials = serviceAccount(env);
  const accessToken = await googleAccessToken(credentials);
  const transaction = await beginTransaction(accessToken);
  let transactionOpen = true;

  try {
    const referralName = documentName('referrals', referredUid);
    const referredProfileName = documentName('users', referredUid);
    const initialDocs = await batchGet(accessToken, [referralName, referredProfileName], transaction);
    const referral = initialDocs.get(referralName) || null;
    const referredProfile = initialDocs.get(referredProfileName) || null;

    if (!referral || !referredProfile) {
      await rollback(accessToken, transaction);
      transactionOpen = false;
      return { ok: true, enabled: true, activated: false, reason: 'no-pending-referral' };
    }

    const storedReferredUid = stringField(referral, 'referredUid');
    const referrerUid = stringField(referral, 'referrerUid');
    const status = stringField(referral, 'status') || 'pending';
    assertUid(referrerUid);
    if (storedReferredUid !== referredUid || referrerUid === referredUid) {
      throw new ReferralActivationError('invalid-referral-mapping', 'Referral mapping is invalid.');
    }

    const rewardName = documentName('referralRewards', referredUid);
    const referrerProfileName = documentName('users', referrerUid);
    const relatedDocs = await batchGet(accessToken, [rewardName, referrerProfileName], transaction);
    const rewardLedger = relatedDocs.get(rewardName) || null;
    const referrerProfile = relatedDocs.get(referrerProfileName) || null;

    if (rewardLedger) {
      const ledgerReferrer = stringField(rewardLedger, 'referrerUid');
      const ledgerReferred = stringField(rewardLedger, 'referredUid');
      const ledgerStatus = stringField(rewardLedger, 'status');
      if (ledgerReferrer !== referrerUid || ledgerReferred !== referredUid || ledgerStatus !== 'issued') {
        throw new ReferralActivationError('reward-ledger-conflict', 'Referral reward ledger is inconsistent.');
      }
      await rollback(accessToken, transaction);
      transactionOpen = false;
      return { ok: true, enabled: true, activated: true, idempotent: true, reason: 'already-issued' };
    }

    if (status !== 'pending') {
      await rollback(accessToken, transaction);
      transactionOpen = false;
      return { ok: true, enabled: true, activated: false, reason: 'referral-not-pending' };
    }

    if (!referrerProfile) {
      throw new ReferralActivationError('referrer-profile-missing', 'Referrer profile is unavailable.');
    }

    const totalMined = numberField(referredProfile, 'totalMined', 0);
    if (!Number.isFinite(totalMined) || totalMined < 0) {
      throw new ReferralActivationError('invalid-mining-state', 'Referral activation mining state is invalid.');
    }
    if (totalMined < FIRST_MINING_REWARD) {
      await rollback(accessToken, transaction);
      transactionOpen = false;
      return { ok: true, enabled: true, activated: false, reason: 'milestone-not-met' };
    }

    const referredBalance = safeBalance(referredProfile);
    const referrerBalance = safeBalance(referrerProfile);
    const now = new Date().toISOString();
    const writes = [];

    const referredFields = {
      referralStatus: fsString('verified'),
      referralVerifiedAt: fsTimestamp(now)
    };
    if (policy.referredReward > 0) {
      referredFields.balance = fsNumber(referredBalance + policy.referredReward);
    }
    writes.push(updateWrite(referredProfileName, referredFields));

    if (policy.referrerReward > 0) {
      writes.push(updateWrite(referrerProfileName, {
        balance: fsNumber(referrerBalance + policy.referrerReward)
      }));
    }

    writes.push(
      updateWrite(referralName, {
        status: fsString('verified'),
        activationMilestone: fsString(ACTIVATION_MILESTONE),
        verifiedAt: fsTimestamp(now),
        updatedAt: fsTimestamp(now),
        rewardIssued: fsBool(true),
        referrerRewardNvx: fsNumber(policy.referrerReward),
        referredRewardNvx: fsNumber(policy.referredReward)
      }),
      updateWrite(rewardName, {
        status: fsString('issued'),
        referredUid: fsString(referredUid),
        referrerUid: fsString(referrerUid),
        milestone: fsString(ACTIVATION_MILESTONE),
        referrerRewardNvx: fsNumber(policy.referrerReward),
        referredRewardNvx: fsNumber(policy.referredReward),
        issuedAt: fsTimestamp(now)
      })
    );

    await commit(accessToken, writes, transaction);
    transactionOpen = false;
    return {
      ok: true,
      enabled: true,
      activated: true,
      idempotent: false,
      milestone: ACTIVATION_MILESTONE,
      referrerRewardNvx: policy.referrerReward,
      referredRewardNvx: policy.referredReward
    };
  } catch (error) {
    if (transactionOpen) await rollback(accessToken, transaction);
    throw error;
  }
}

export function referralRewardPolicy(env) {
  const milestone = String(env?.REFERRAL_ACTIVATION_MILESTONE || '').trim().toLowerCase();
  if (!milestone) return { enabled: false, reason: 'not-configured', referrerReward: 0, referredReward: 0 };
  if (milestone !== ACTIVATION_MILESTONE) {
    return { enabled: false, reason: 'unsupported-milestone', referrerReward: 0, referredReward: 0 };
  }

  const referrerReward = parseRewardAmount(env?.REFERRAL_REFERRER_REWARD_NVX);
  const referredReward = parseRewardAmount(env?.REFERRAL_REFERRED_REWARD_NVX);
  if (referrerReward === null || referredReward === null || (referrerReward === 0 && referredReward === 0)) {
    return { enabled: false, reason: 'invalid-reward-config', referrerReward: 0, referredReward: 0 };
  }
  return { enabled: true, reason: 'configured', referrerReward, referredReward };
}

function parseRewardAmount(value) {
  const text = String(value ?? '').trim();
  if (!/^\d+(?:\.\d{1,6})?$/.test(text)) return null;
  const amount = Number(text);
  if (!Number.isFinite(amount) || amount < 0 || amount > MAX_CONFIGURED_REWARD_NVX) return null;
  return amount;
}

function safeBalance(document) {
  const balance = numberField(document, 'balance', NaN);
  if (!Number.isFinite(balance) || balance < 0) {
    throw new ReferralActivationError('invalid-balance', 'Referral reward balance is invalid.');
  }
  return balance;
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
    throw new ReferralActivationError('failed-precondition', 'Referral activation credentials are not configured.');
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
    throw new ReferralActivationError('unavailable', 'Referral activation profile service is unavailable.');
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
    throw new ReferralActivationError('invalid-uid', 'Referral activation account mapping is invalid.');
  }
}
function documentName(collection, id) { return `${FIRESTORE_DOCUMENTS}/${collection}/${id}`; }

async function beginTransaction(accessToken) {
  const result = await firestoreJson(`${FIRESTORE_API}/documents:beginTransaction`, {
    accessToken,
    method: 'POST',
    body: { options: { readWrite: {} } }
  });
  if (!result.transaction) throw new ReferralActivationError('unavailable', 'Referral activation transaction could not start.');
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
    throw new ReferralActivationError(conflict ? 'aborted' : 'unavailable', conflict ? 'Referral state changed. Please retry.' : 'Referral activation service is unavailable.');
  }
  return result;
}

function updateWrite(name, fields) {
  return { update: { name, fields }, updateMask: { fieldPaths: Object.keys(fields) } };
}
function stringField(document, field) {
  return String(document?.fields?.[field]?.stringValue || '');
}
function numberField(document, field, fallback = NaN) {
  const value = document?.fields?.[field];
  if (!value) return fallback;
  const raw = value.integerValue ?? value.doubleValue;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}
function fsString(value) { return { stringValue: String(value) }; }
function fsTimestamp(value) { return { timestampValue: String(value) }; }
function fsBool(value) { return { booleanValue: Boolean(value) }; }
function fsNumber(value) { return { doubleValue: Number(value) }; }
