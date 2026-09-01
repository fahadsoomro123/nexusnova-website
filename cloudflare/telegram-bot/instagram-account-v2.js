const FIREBASE_PROJECT_ID = 'nexusnova-6ade2';
const FIREBASE_API_KEY = 'AIzaSyBU75WYp5ioaMD1LrNcDyAvROFW2wrTil0';
const FIRESTORE_DATABASE = `projects/${FIREBASE_PROJECT_ID}/databases/(default)`;
const FIRESTORE_DOCUMENTS = `${FIRESTORE_DATABASE}/documents`;
const FIRESTORE_API = `https://firestore.googleapis.com/v1/${FIRESTORE_DATABASE}`;
const INSTAGRAM_APP_ID = '1564402658290447';
const INSTAGRAM_REDIRECT_URI = 'https://nexusnovatools.com/instagram-callback.html';
const MAX_BEARER_LENGTH = 10_000;
const MAX_BODY_BYTES = 8_000;
let googleTokenCache = null;
let signingKeyCache = null;

class ApiError extends Error {
  constructor(status, code, publicMessage, detail = publicMessage) {
    super(detail);
    this.status = status;
    this.code = code;
    this.publicMessage = publicMessage;
  }
}

export async function instagramAccountRequest(request, env = {}) {
  try {
    if (request.method === 'GET') return await instagramStatus(request, env);
    if (request.method === 'POST') return await linkInstagram(request, env);
    return json({ ok: false, code: 'method-not-allowed', error: 'Method not allowed.' }, 405);
  } catch (error) {
    if (error instanceof ApiError) {
      return json({ ok: false, code: error.code, error: error.publicMessage }, error.status);
    }
    console.error('Instagram backend error:', safeError(error));
    return json({ ok: false, code: 'internal', error: 'Instagram account linking is temporarily unavailable.' }, 502);
  }
}

async function instagramStatus(request, env) {
  const firebaseUser = await verifyFirebaseIdToken(request.headers.get('Authorization'));
  const credentials = serviceAccount(env);
  const accessToken = await googleAccessToken(credentials);
  const link = await firestoreGet(accessToken, 'instagramUserLinks', firebaseUser.uid);
  if (!link) return json({ ok: true, linked: false });
  const instagramId = firestoreString(link, 'instagramId');
  if (!validInstagramId(instagramId)) {
    throw new ApiError(409, 'failed-precondition', 'Instagram account mapping needs repair.');
  }
  return json({
    ok: true,
    linked: true,
    user: {
      id: instagramId,
      username: firestoreString(link, 'username'),
      accountType: firestoreString(link, 'accountType')
    }
  });
}

async function linkInstagram(request, env) {
  const firebaseUser = await verifyFirebaseIdToken(request.headers.get('Authorization'));
  const appSecret = String(env.INSTAGRAM_APP_SECRET || '').trim();
  if (!appSecret) throw new ApiError(503, 'instagram-not-configured', 'Instagram server verification is not configured yet.');

  const body = await readJsonBody(request);
  const code = cleanCode(body.code);
  const redirectUri = String(body.redirectUri || '').trim();
  if (!code || redirectUri !== INSTAGRAM_REDIRECT_URI) {
    throw new ApiError(400, 'invalid-argument', 'Instagram authorization response is invalid.');
  }

  const token = await exchangeInstagramCode(code, appSecret);
  const instagramUser = await fetchInstagramIdentity(token.accessToken);
  if (token.userId && token.userId !== instagramUser.id) {
    throw new ApiError(403, 'permission-denied', 'Instagram identity verification failed.');
  }

  const credentials = serviceAccount(env);
  const accessToken = await googleAccessToken(credentials);
  const transaction = await firestoreBeginTransaction(accessToken);
  let open = true;
  try {
    const identityName = docName('instagramIdentities', instagramUser.id);
    const reverseName = docName('instagramUserLinks', firebaseUser.uid);
    const profileName = docName('users', firebaseUser.uid);
    const docs = await firestoreBatchGet(accessToken, [identityName, reverseName, profileName], transaction);
    const identity = docs.get(identityName);
    const reverse = docs.get(reverseName);
    const profile = docs.get(profileName);
    if (!profile) throw new ApiError(404, 'not-found', 'NexusNova profile not found.');

    const identityUid = identity ? firestoreString(identity, 'uid') : '';
    const accountInstagramId = reverse ? firestoreString(reverse, 'instagramId') : '';
    if (identityUid && identityUid !== firebaseUser.uid) {
      throw new ApiError(409, 'already-exists', 'This Instagram account is already linked to another NexusNova account.');
    }
    if (accountInstagramId && accountInstagramId !== instagramUser.id) {
      throw new ApiError(409, 'already-exists', 'This NexusNova account is already linked to another Instagram account.');
    }

    const now = new Date().toISOString();
    const linkedAt = (identity && firestoreTimestamp(identity, 'linkedAt')) ||
      (reverse && firestoreTimestamp(reverse, 'linkedAt')) || now;
    await firestoreCommit(accessToken, instagramWrites({
      uid: firebaseUser.uid,
      instagramUser,
      linkedAt,
      updatedAt: now
    }), transaction);
    open = false;
    return json({ ok: true, linked: true, user: instagramUser });
  } catch (error) {
    if (open) await firestoreRollback(accessToken, transaction);
    throw error;
  }
}

async function verifyFirebaseIdToken(authorization) {
  const match = /^Bearer\s+([^\s]+)$/i.exec(String(authorization || ''));
  if (!match || match[1].length > MAX_BEARER_LENGTH) {
    throw new ApiError(401, 'unauthenticated', 'Sign in to NexusNova first.');
  }
  const idToken = match[1];
  let response;
  let data;
  try {
    response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken })
    });
    data = await response.json().catch(() => ({}));
  } catch (error) {
    throw new ApiError(502, 'firebase-unavailable', 'Firebase session verification is temporarily unavailable.', safeError(error));
  }
  const user = data.users?.[0];
  if (!response.ok || !user?.localId) throw new ApiError(401, 'unauthenticated', 'Firebase session is invalid.');

  const payload = decodeJwtPayload(idToken);
  const uid = String(user.localId);
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(uid)) throw new ApiError(401, 'unauthenticated', 'Firebase session is invalid.');
  const now = Math.floor(Date.now() / 1000);
  if (payload.sub !== uid || payload.aud !== FIREBASE_PROJECT_ID ||
      payload.iss !== `https://securetoken.google.com/${FIREBASE_PROJECT_ID}` || Number(payload.exp || 0) <= now) {
    throw new ApiError(401, 'unauthenticated', 'Firebase session is invalid.');
  }
  return { uid };
}

function decodeJwtPayload(token) {
  try {
    const encoded = token.split('.')[1];
    const padded = encoded.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(encoded.length / 4) * 4, '=');
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(padded), c => c.charCodeAt(0))));
  } catch (_) {
    throw new ApiError(401, 'unauthenticated', 'Firebase session is invalid.');
  }
}

function serviceAccount(env) {
  let credentials = null;
  const raw = String(env.FIREBASE_SERVICE_ACCOUNT_JSON || '').trim();
  if (raw) {
    try { credentials = JSON.parse(raw); } catch (_) { credentials = null; }
  }
  if (!credentials) {
    const clientEmail = String(env.FIREBASE_CLIENT_EMAIL || '').trim();
    const privateKey = normalizePrivateKey(env.FIREBASE_PRIVATE_KEY);
    const privateKeyId = String(env.FIREBASE_PRIVATE_KEY_ID || '').trim();
    if (clientEmail && privateKey) {
      credentials = {
        project_id: FIREBASE_PROJECT_ID,
        client_email: clientEmail,
        private_key: privateKey,
        private_key_id: privateKeyId
      };
    }
  }
  if (!credentials || credentials.project_id !== FIREBASE_PROJECT_ID ||
      !credentials.client_email || !credentials.private_key) {
    throw new ApiError(503, 'firebase-admin-not-configured', 'Firebase server verification is not configured correctly.');
  }
  credentials.private_key = normalizePrivateKey(credentials.private_key);
  credentials.private_key_id = String(credentials.private_key_id || '').trim();
  return credentials;
}

function normalizePrivateKey(value) {
  return String(value || '').trim().replace(/\\n/g, '\n');
}

async function googleAccessToken(credentials) {
  const now = Math.floor(Date.now() / 1000);
  const cacheKey = credentials.private_key_id || credentials.client_email;
  if (googleTokenCache?.key === cacheKey && googleTokenCache.expiresAt > now + 60) return googleTokenCache.token;
  const assertion = await signJwt(credentials, {
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  });
  let response;
  let data;
  try {
    const form = new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion });
    response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString()
    });
    data = await response.json().catch(() => ({}));
  } catch (error) {
    throw new ApiError(502, 'firebase-admin-unavailable', 'Firebase backend authentication is temporarily unavailable.', safeError(error));
  }
  if (!response.ok || !data.access_token) {
    throw new ApiError(502, 'firebase-admin-auth-failed', 'Firebase backend authentication failed.');
  }
  googleTokenCache = {
    key: cacheKey,
    token: data.access_token,
    expiresAt: now + Number(data.expires_in || 3600) - 120
  };
  return data.access_token;
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
  const cacheKey = `${credentials.client_email}:${credentials.private_key_id || 'no-kid'}`;
  if (signingKeyCache?.keyId === cacheKey) return signingKeyCache.key;
  try {
    const pem = normalizePrivateKey(credentials.private_key)
      .replace(/-----BEGIN PRIVATE KEY-----/g, '')
      .replace(/-----END PRIVATE KEY-----/g, '')
      .replace(/\s/g, '');
    const bytes = Uint8Array.from(atob(pem), c => c.charCodeAt(0));
    const key = await crypto.subtle.importKey(
      'pkcs8', bytes,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false, ['sign']
    );
    signingKeyCache = { keyId: cacheKey, key };
    return key;
  } catch (error) {
    throw new ApiError(503, 'firebase-private-key-invalid', 'Firebase server private key is invalid.', safeError(error));
  }
}

async function exchangeInstagramCode(code, appSecret) {
  let response;
  let data;
  try {
    const form = new URLSearchParams({
      client_id: INSTAGRAM_APP_ID,
      client_secret: appSecret,
      grant_type: 'authorization_code',
      redirect_uri: INSTAGRAM_REDIRECT_URI,
      code
    });
    response = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString()
    });
    data = await response.json().catch(() => ({}));
  } catch (error) {
    throw new ApiError(502, 'instagram-unavailable', 'Instagram verification is temporarily unavailable.', safeError(error));
  }
  const accessToken = String(data.access_token || '').trim();
  const userId = String(data.user_id || '').trim();
  if (!response.ok || !accessToken) {
    throw new ApiError(403, 'instagram-authorization-failed', 'Instagram authorization could not be verified. Please connect again.');
  }
  return { accessToken, userId };
}

async function fetchInstagramIdentity(accessToken) {
  const url = new URL('https://graph.instagram.com/me');
  url.searchParams.set('fields', 'id,username,account_type');
  let response;
  let data;
  try {
    response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' }
    });
    data = await response.json().catch(() => ({}));
  } catch (error) {
    throw new ApiError(502, 'instagram-unavailable', 'Instagram verification is temporarily unavailable.', safeError(error));
  }
  const id = String(data.id || '').trim();
  const username = cleanText(data.username, 64);
  const accountType = cleanText(data.account_type, 32).toUpperCase();
  if (!response.ok || !validInstagramId(id) || !username) {
    throw new ApiError(403, 'instagram-identity-failed', 'Instagram account identity could not be verified.');
  }
  return { id, username, accountType };
}

async function readJsonBody(request) {
  const declared = Number(request.headers.get('Content-Length') || 0);
  if (declared > MAX_BODY_BYTES) throw new ApiError(413, 'invalid-argument', 'Instagram linking request is too large.');
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) throw new ApiError(413, 'invalid-argument', 'Instagram linking request is too large.');
  try { return JSON.parse(text || '{}'); }
  catch (_) { throw new ApiError(400, 'invalid-argument', 'Instagram linking request is invalid.'); }
}

function cleanCode(value) {
  const code = String(value || '').split('#')[0].trim();
  return code && code.length <= 6000 && !/\s/.test(code) ? code : '';
}

function validInstagramId(value) {
  return /^[1-9]\d{5,30}$/.test(String(value || ''));
}

function cleanText(value, max) {
  return String(value || '').replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function docName(collection, id) {
  return `${FIRESTORE_DOCUMENTS}/${collection}/${id}`;
}

async function firestoreGet(accessToken, collection, id) {
  return firestoreJson(`${FIRESTORE_API}/documents/${collection}/${encodeURIComponent(id)}`, { accessToken, allow404: true });
}

async function firestoreBeginTransaction(accessToken) {
  const data = await firestoreJson(`${FIRESTORE_API}/documents:beginTransaction`, {
    accessToken, method: 'POST', body: { options: { readWrite: {} } }
  });
  if (!data.transaction) throw new ApiError(502, 'firebase-unavailable', 'Firebase transaction could not start.');
  return data.transaction;
}

async function firestoreBatchGet(accessToken, names, transaction) {
  const rows = await firestoreJson(`${FIRESTORE_API}/documents:batchGet`, {
    accessToken, method: 'POST', body: { documents: names, transaction }
  });
  const result = new Map(names.map(name => [name, null]));
  for (const row of Array.isArray(rows) ? rows : []) {
    if (row.found?.name) result.set(row.found.name, row.found);
    else if (row.missing) result.set(row.missing, null);
  }
  return result;
}

async function firestoreCommit(accessToken, writes, transaction) {
  return firestoreJson(`${FIRESTORE_API}/documents:commit`, {
    accessToken, method: 'POST', body: { writes, transaction }
  });
}

async function firestoreRollback(accessToken, transaction) {
  try {
    await firestoreJson(`${FIRESTORE_API}/documents:rollback`, {
      accessToken, method: 'POST', body: { transaction }
    });
  } catch (_) {}
}

async function firestoreJson(url, { accessToken, method = 'GET', body = null, allow404 = false }) {
  let response;
  let data;
  try {
    response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(body ? { 'Content-Type': 'application/json' } : {})
      },
      body: body ? JSON.stringify(body) : undefined
    });
    if (allow404 && response.status === 404) return null;
    data = await response.json().catch(() => ({}));
  } catch (error) {
    throw new ApiError(502, 'firebase-unavailable', 'Firebase profile service is temporarily unavailable.', safeError(error));
  }
  if (!response.ok) {
    if (response.status === 409 || data.error?.status === 'ABORTED') {
      throw new ApiError(409, 'aborted', 'Account linking changed during this request. Please retry.');
    }
    throw new ApiError(502, 'firebase-unavailable', 'Firebase profile service is unavailable.');
  }
  return data;
}

function instagramWrites({ uid, instagramUser, linkedAt, updatedAt }) {
  return [
    updateWrite(docName('instagramIdentities', instagramUser.id), {
      id: fsString(instagramUser.id), username: fsString(instagramUser.username),
      accountType: fsString(instagramUser.accountType), uid: fsString(uid),
      provider: fsString('instagram-business-login'), linkedAt: fsTimestamp(linkedAt), updatedAt: fsTimestamp(updatedAt)
    }),
    updateWrite(docName('instagramUserLinks', uid), {
      uid: fsString(uid), instagramId: fsString(instagramUser.id), username: fsString(instagramUser.username),
      accountType: fsString(instagramUser.accountType), linkedAt: fsTimestamp(linkedAt), updatedAt: fsTimestamp(updatedAt)
    }),
    updateWrite(docName('users', uid), {
      instagram: { mapValue: { fields: {
        id: fsString(instagramUser.id), username: fsString(instagramUser.username), accountType: fsString(instagramUser.accountType),
        provider: fsString('instagram-business-login'), linked: { booleanValue: true },
        linkedAt: fsTimestamp(linkedAt), updatedAt: fsTimestamp(updatedAt)
      } } }
    })
  ];
}

function updateWrite(name, fields) {
  return { update: { name, fields }, updateMask: { fieldPaths: Object.keys(fields) } };
}
function firestoreString(doc, field) { return String(doc?.fields?.[field]?.stringValue || ''); }
function firestoreTimestamp(doc, field) { return String(doc?.fields?.[field]?.timestampValue || ''); }
function fsString(value) { return { stringValue: String(value || '') }; }
function fsTimestamp(value) { return { timestampValue: String(value) }; }
function base64UrlJson(value) { return base64UrlBytes(new TextEncoder().encode(JSON.stringify(value))); }
function base64UrlBytes(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
function safeError(error) {
  return String(error instanceof Error ? error.message : error || 'unknown').replace(/[\r\n]+/g, ' ').slice(0, 220);
}
function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}
