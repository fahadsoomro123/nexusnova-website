const FIREBASE_PROJECT_ID = 'nexusnova-6ade2';
const FIREBASE_API_KEY = 'AIzaSyBU75WYp5ioaMD1LrNcDyAvROFW2wrTil0';
const FIRESTORE_DATABASE = `projects/${FIREBASE_PROJECT_ID}/databases/(default)`;
const FIRESTORE_DOCUMENTS = `${FIRESTORE_DATABASE}/documents`;
const FIRESTORE_API = `https://firestore.googleapis.com/v1/${FIRESTORE_DATABASE}`;
const INSTAGRAM_APP_ID = '1564402658290447';
const INSTAGRAM_REDIRECT_URI = 'https://nexusnovatools.com/instagram-callback.html';
const INSTAGRAM_TOKEN_URL = 'https://api.instagram.com/oauth/access_token';
const INSTAGRAM_GRAPH_URL = 'https://graph.instagram.com';
const MAX_BEARER_LENGTH = 10_000;
const MAX_BODY_BYTES = 8_000;
const MAX_CODE_LENGTH = 6_000;
let googleTokenCache = null;
let signingKeyCache = null;

class InstagramApiError extends Error {
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
    if (request.method === 'POST') return await linkInstagramAccount(request, env);
    return json({ ok: false, code: 'method-not-allowed', error: 'Method not allowed.' }, 405);
  } catch (error) {
    if (error instanceof InstagramApiError) {
      return json({ ok: false, code: error.code, error: error.publicMessage }, error.status);
    }
    console.error('Instagram account linking error:', error instanceof Error ? error.message : 'Unknown error');
    return json({
      ok: false,
      code: 'internal',
      error: 'Instagram account linking is temporarily unavailable.'
    }, 502);
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
    throw new InstagramApiError(409, 'failed-precondition', 'Instagram account mapping needs repair.');
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

async function linkInstagramAccount(request, env) {
  const firebaseUser = await verifyFirebaseIdToken(request.headers.get('Authorization'));
  const secret = instagramSecret(env);
  const body = await readBody(request);
  const code = cleanAuthorizationCode(body?.code);
  const redirectUri = String(body?.redirectUri || '').trim();
  if (!code || redirectUri !== INSTAGRAM_REDIRECT_URI) {
    throw new InstagramApiError(400, 'invalid-argument', 'Instagram authorization response is invalid.');
  }

  const tokenResult = await exchangeAuthorizationCode(code, secret);
  const instagramUser = await fetchInstagramIdentity(tokenResult.accessToken);
  if (tokenResult.userId && tokenResult.userId !== instagramUser.id) {
    throw new InstagramApiError(403, 'permission-denied', 'Instagram identity verification failed.');
  }

  const credentials = serviceAccount(env);
  const accessToken = await googleAccessToken(credentials);
  const transaction = await firestoreBeginTransaction(accessToken);
  let transactionOpen = true;

  try {
    const names = [
      firestoreDocumentName('instagramIdentities', instagramUser.id),
      firestoreDocumentName('instagramUserLinks', firebaseUser.uid),
      firestoreDocumentName('users', firebaseUser.uid)
    ];
    const documents = await firestoreBatchGet(accessToken, names, transaction);
    const identity = documents.get(names[0]) || null;
    const reverse = documents.get(names[1]) || null;
    const profile = documents.get(names[2]) || null;

    if (!profile) {
      throw new InstagramApiError(404, 'not-found', 'NexusNova profile not found.');
    }

    const identityUid = identity ? firestoreString(identity, 'uid') : '';
    const accountInstagramId = reverse ? firestoreString(reverse, 'instagramId') : '';
    if (identityUid && identityUid !== firebaseUser.uid) {
      throw new InstagramApiError(409, 'already-exists', 'This Instagram account is already linked to another NexusNova account.');
    }
    if (accountInstagramId && accountInstagramId !== instagramUser.id) {
      throw new InstagramApiError(409, 'already-exists', 'This NexusNova account is already linked to another Instagram account.');
    }

    const now = new Date().toISOString();
    const linkedAt = (identity && firestoreTimestamp(identity, 'linkedAt')) ||
      (reverse && firestoreTimestamp(reverse, 'linkedAt')) || now;
    await firestoreCommit(accessToken, instagramLinkWrites({
      instagramUser,
      uid: firebaseUser.uid,
      linkedAt,
      updatedAt: now
    }), transaction);
    transactionOpen = false;

    return json({
      ok: true,
      linked: true,
      idempotent: identityUid === firebaseUser.uid && accountInstagramId === instagramUser.id,
      user: instagramUser
    });
  } catch (error) {
    if (transactionOpen) await firestoreRollback(accessToken, transaction);
    throw error;
  }
}

function instagramSecret(env) {
  const secret = String(env.INSTAGRAM_APP_SECRET || '').trim();
  if (!secret) {
    throw new InstagramApiError(503, 'instagram-not-configured', 'Instagram server verification is not configured yet.');
  }
  return secret;
}

async function readBody(request) {
  const declaredLength = Number(request.headers.get('Content-Length') || 0);
  if (declaredLength > MAX_BODY_BYTES) {
    throw new InstagramApiError(413, 'invalid-argument', 'Instagram linking request is too large.');
  }
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) {
    throw new InstagramApiError(413, 'invalid-argument', 'Instagram linking request is too large.');
  }
  try {
    return JSON.parse(text || '{}');
  } catch (_) {
    throw new InstagramApiError(400, 'invalid-argument', 'Instagram linking request is invalid.');
  }
}

function cleanAuthorizationCode(value) {
  const code = String(value || '').split('#')[0].trim();
  if (!code || code.length > MAX_CODE_LENGTH || /\s/.test(code)) return '';
  return code;
}

async function exchangeAuthorizationCode(code, secret) {
  const form = new FormData();
  form.set('client_id', INSTAGRAM_APP_ID);
  form.set('client_secret', secret);
  form.set('grant_type', 'authorization_code');
  form.set('redirect_uri', INSTAGRAM_REDIRECT_URI);
  form.set('code', code);

  let response;
  let result;
  try {
    response = await fetch(INSTAGRAM_TOKEN_URL, {
      method: 'POST',
      body: form,
      redirect: 'error'
    });
    result = await response.json().catch(() => ({}));
  } catch (error) {
    console.error('Instagram token exchange unavailable:', error instanceof Error ? error.message : 'Unknown error');
    throw new InstagramApiError(502, 'instagram-unavailable', 'Instagram verification is temporarily unavailable.');
  }

  const accessToken = String(result?.access_token || '').trim();
  const userId = String(result?.user_id || '').trim();
  if (!response.ok || !accessToken || accessToken.length > 4096) {
    console.warn('Instagram token exchange rejected', { status: response.status, errorType: String(result?.error_type || result?.error?.type || '') });
    throw new InstagramApiError(403, 'instagram-authorization-failed', 'Instagram authorization could not be verified. Please connect again.');
  }
  if (userId && !validInstagramId(userId)) {
    throw new InstagramApiError(403, 'instagram-authorization-failed', 'Instagram authorization could not be verified. Please connect again.');
  }
  return { accessToken, userId };
}

async function fetchInstagramIdentity(accessToken) {
  const url = new URL(`${INSTAGRAM_GRAPH_URL}/me`);
  url.searchParams.set('fields', 'id,username,account_type');
  let response;
  let result;
  try {
    response = await fetch(url.toString(), {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
      cache: 'no-store',
      redirect: 'error'
    });
    result = await response.json().catch(() => ({}));
  } catch (error) {
    console.error('Instagram identity lookup unavailable:', error instanceof Error ? error.message : 'Unknown error');
    throw new InstagramApiError(502, 'instagram-unavailable', 'Instagram verification is temporarily unavailable.');
  }

  const id = String(result?.id || '').trim();
  const username = cleanText(result?.username, 64);
  const accountType = cleanText(result?.account_type, 32).toUpperCase();
  if (!response.ok || !validInstagramId(id) || !username) {
    console.warn('Instagram identity lookup rejected', { status: response.status });
    throw new InstagramApiError(403, 'instagram-identity-failed', 'Instagram account identity could not be verified.');
  }
  return { id, username, accountType };
}

async function verifyFirebaseIdToken(authorization) {
  const match = /^Bearer\s+([^\s]+)$/i.exec(String(authorization || ''));
  if (!match || match[1].length > MAX_BEARER_LENGTH) {
    throw new InstagramApiError(401, 'unauthenticated', 'Sign in to NexusNova first.');
  }
  const idToken = match[1];
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken })
  });
  const result = await response.json().catch(() => ({}));
  const user = result.users?.[0];
  if (!response.ok || !user?.localId) {
    throw new InstagramApiError(401, 'unauthenticated', 'Firebase session is invalid.');
  }

  const payload = decodeJwtPayload(idToken);
  const uid = String(user.localId || '');
  assertFirebaseUid(uid);
  const now = Math.floor(Date.now() / 1000);
  if (payload.sub !== uid || payload.aud !== FIREBASE_PROJECT_ID ||
      payload.iss !== `https://securetoken.google.com/${FIREBASE_PROJECT_ID}` ||
      Number(payload.exp || 0) <= now) {
    throw new InstagramApiError(401, 'unauthenticated', 'Firebase session is invalid.');
  }
  return { uid };
}

function decodeJwtPayload(token) {
  try {
    const encoded = token.split('.')[1];
    const padded = encoded.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(encoded.length / 4) * 4, '=');
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(padded), char => char.charCodeAt(0))));
  } catch (_) {
    throw new InstagramApiError(401, 'unauthenticated', 'Firebase session is invalid.');
  }
}

function serviceAccount(env) {
  if (!env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    throw new InstagramApiError(503, 'failed-precondition', 'Instagram server verification is not configured yet.');
  }
  let credentials;
  try {
    credentials = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON);
  } catch (_) {
    throw new InstagramApiError(503, 'failed-precondition', 'Instagram server verification is not configured yet.');
  }
  if (credentials.project_id !== FIREBASE_PROJECT_ID || !credentials.client_email ||
      !credentials.private_key || !credentials.private_key_id) {
    throw new InstagramApiError(503, 'failed-precondition', 'Instagram server verification is not configured yet.');
  }
  return credentials;
}

async function googleAccessToken(credentials) {
  const now = Math.floor(Date.now() / 1000);
  if (googleTokenCache?.keyId === credentials.private_key_id && googleTokenCache.expiresAt > now + 60) {
    return googleTokenCache.token;
  }
  const assertion = await signJwt(credentials, {
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  });
  const form = new URLSearchParams({
    grant_type: 'urn:ietf:params:grant-type:jwt-bearer',
    assertion
  });
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString()
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.access_token) {
    throw new InstagramApiError(502, 'unavailable', 'Firebase backend authentication failed.');
  }
  googleTokenCache = {
    keyId: credentials.private_key_id,
    token: result.access_token,
    expiresAt: now + Number(result.expires_in || 3600) - 120
  };
  return googleTokenCache.token;
}

async function signJwt(credentials, claims) {
  const header = { alg: 'RS256', typ: 'JWT', kid: credentials.private_key_id };
  const unsigned = `${base64UrlJson(header)}.${base64UrlJson(claims)}`;
  const key = await signingKey(credentials);
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned));
  return `${unsigned}.${base64UrlBytes(new Uint8Array(signature))}`;
}

async function signingKey(credentials) {
  if (signingKeyCache?.keyId === credentials.private_key_id) return signingKeyCache.key;
  const pem = credentials.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, '');
  const keyBytes = Uint8Array.from(atob(pem), char => char.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    'pkcs8',
    keyBytes,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
  signingKeyCache = { keyId: credentials.private_key_id, key };
  return key;
}

function base64UrlJson(value) {
  return base64UrlBytes(new TextEncoder().encode(JSON.stringify(value)));
}

function base64UrlBytes(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function assertFirebaseUid(uid) {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(String(uid || ''))) {
    throw new InstagramApiError(409, 'failed-precondition', 'NexusNova account mapping is invalid.');
  }
}

function validInstagramId(value) {
  return /^[1-9]\d{5,30}$/.test(String(value || ''));
}

function cleanText(value, maxLength) {
  return String(value || '').replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function firestoreDocumentName(collection, id) {
  return `${FIRESTORE_DOCUMENTS}/${collection}/${id}`;
}

async function firestoreGet(accessToken, collection, id) {
  const url = `${FIRESTORE_API}/documents/${collection}/${encodeURIComponent(id)}`;
  return firestoreJson(url, { accessToken, allowNotFound: true });
}

async function firestoreBeginTransaction(accessToken) {
  const result = await firestoreJson(`${FIRESTORE_API}/documents:beginTransaction`, {
    accessToken,
    method: 'POST',
    body: { options: { readWrite: {} } }
  });
  if (!result.transaction) throw new InstagramApiError(502, 'unavailable', 'Firebase transaction could not start.');
  return result.transaction;
}

async function firestoreBatchGet(accessToken, names, transaction) {
  const rows = await firestoreJson(`${FIRESTORE_API}/documents:batchGet`, {
    accessToken,
    method: 'POST',
    body: { documents: names, transaction }
  });
  const documents = new Map(names.map(name => [name, null]));
  for (const row of Array.isArray(rows) ? rows : []) {
    if (row.found?.name) documents.set(row.found.name, row.found);
    if (row.missing) documents.set(row.missing, null);
  }
  return documents;
}

async function firestoreCommit(accessToken, writes, transaction = '') {
  const body = { writes };
  if (transaction) body.transaction = transaction;
  return firestoreJson(`${FIRESTORE_API}/documents:commit`, {
    accessToken,
    method: 'POST',
    body
  });
}

async function firestoreRollback(accessToken, transaction) {
  try {
    await firestoreJson(`${FIRESTORE_API}/documents:rollback`, {
      accessToken,
      method: 'POST',
      body: { transaction }
    });
  } catch (_) {}
}

async function firestoreJson(url, { accessToken, method = 'GET', body = null, allowNotFound = false }) {
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(body ? { 'Content-Type': 'application/json' } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (allowNotFound && response.status === 404) return null;
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const conflict = response.status === 409 || result.error?.status === 'ABORTED';
    throw new InstagramApiError(
      conflict ? 409 : 502,
      conflict ? 'aborted' : 'unavailable',
      conflict ? 'Account linking changed during this request. Please retry.' : 'Firebase profile service is unavailable.'
    );
  }
  return result;
}

function instagramLinkWrites({ instagramUser, uid, linkedAt, updatedAt }) {
  const identityFields = {
    id: fsString(instagramUser.id),
    username: fsString(instagramUser.username),
    accountType: fsString(instagramUser.accountType),
    uid: fsString(uid),
    provider: fsString('instagram-business-login'),
    linkedAt: fsTimestamp(linkedAt),
    updatedAt: fsTimestamp(updatedAt)
  };
  const reverseFields = {
    uid: fsString(uid),
    instagramId: fsString(instagramUser.id),
    username: fsString(instagramUser.username),
    accountType: fsString(instagramUser.accountType),
    linkedAt: fsTimestamp(linkedAt),
    updatedAt: fsTimestamp(updatedAt)
  };
  const profileInstagramFields = {
    id: fsString(instagramUser.id),
    username: fsString(instagramUser.username),
    accountType: fsString(instagramUser.accountType),
    provider: fsString('instagram-business-login'),
    linked: fsBoolean(true),
    linkedAt: fsTimestamp(linkedAt),
    updatedAt: fsTimestamp(updatedAt)
  };
  return [
    firestoreUpdate(firestoreDocumentName('instagramIdentities', instagramUser.id), identityFields),
    firestoreUpdate(firestoreDocumentName('instagramUserLinks', uid), reverseFields),
    firestoreUpdate(firestoreDocumentName('users', uid), {
      instagram: { mapValue: { fields: profileInstagramFields } }
    })
  ];
}

function firestoreUpdate(name, fields) {
  return {
    update: { name, fields },
    updateMask: { fieldPaths: Object.keys(fields) }
  };
}

function firestoreString(document, field) {
  return String(document?.fields?.[field]?.stringValue || '');
}

function firestoreTimestamp(document, field) {
  return String(document?.fields?.[field]?.timestampValue || '');
}

function fsString(value) {
  return { stringValue: String(value || '') };
}

function fsBoolean(value) {
  return { booleanValue: value === true };
}

function fsTimestamp(value) {
  return { timestampValue: String(value) };
}

function json(body, status = 200) {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
  });
}
