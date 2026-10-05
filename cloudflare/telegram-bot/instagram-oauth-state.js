const FIREBASE_PROJECT_ID = 'nexusnova-6ade2';
const FIREBASE_API_KEY = 'AIzaSyBU75WYp5ioaMD1LrNcDyAvROFW2wrTil0';
const INSTAGRAM_APP_ID = '1564402658290447';
const INSTAGRAM_REDIRECT_URI = 'https://nexusnovatools.com/instagram-callback.html';
const INSTAGRAM_AUTH_URL = 'https://www.instagram.com/oauth/authorize';
const MAX_BEARER_LENGTH = 10_000;
const MAX_BODY_BYTES = 10_000;
const STATE_TTL_SECONDS = 10 * 60;

export async function createInstagramAuthorization(request, env = {}) {
  const uid = await firebaseUid(request.headers.get('Authorization'));
  const secret = requireInstagramSecret(env);
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    uid,
    iat: now,
    exp: now + STATE_TTL_SECONDS,
    nonce: randomToken(18)
  };
  const encodedPayload = base64UrlBytes(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await hmacSign(secret, `v1.${encodedPayload}`);
  const state = `v1.${encodedPayload}.${signature}`;

  const url = new URL(INSTAGRAM_AUTH_URL);
  url.searchParams.set('client_id', INSTAGRAM_APP_ID);
  url.searchParams.set('redirect_uri', INSTAGRAM_REDIRECT_URI);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'instagram_business_basic');
  url.searchParams.set('state', state);
  url.searchParams.set('force_reauth', 'true');

  return { ok: true, authUrl: url.toString(), expiresIn: STATE_TTL_SECONDS };
}

export async function validateInstagramLinkRequest(request, env = {}) {
  const uid = await firebaseUid(request.headers.get('Authorization'));
  const secret = requireInstagramSecret(env);
  const body = await readJsonBody(request);
  const code = cleanCode(body.code);
  const state = String(body.state || '').trim();
  const redirectUri = String(body.redirectUri || '').trim();

  if (!code || !state || redirectUri !== INSTAGRAM_REDIRECT_URI) {
    throw apiError(400, 'invalid-argument', 'Instagram authorization response is invalid.');
  }

  const payload = await verifyState(state, secret);
  if (payload.uid !== uid) {
    throw apiError(403, 'permission-denied', 'Instagram security check does not match this NexusNova account.');
  }

  const headers = new Headers(request.headers);
  headers.set('Content-Type', 'application/json');
  headers.delete('Content-Length');
  return new Request(request.url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ code, redirectUri })
  });
}

async function verifyState(state, secret) {
  const parts = state.split('.');
  if (parts.length !== 3 || parts[0] !== 'v1' || !parts[1] || !parts[2]) {
    throw apiError(403, 'oauth-state-invalid', 'Instagram security check is invalid. Please connect again.');
  }

  const signed = `v1.${parts[1]}`;
  const valid = await hmacVerify(secret, signed, parts[2]);
  if (!valid) {
    throw apiError(403, 'oauth-state-invalid', 'Instagram security check is invalid. Please connect again.');
  }

  let payload;
  try {
    payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(parts[1])));
  } catch (_) {
    throw apiError(403, 'oauth-state-invalid', 'Instagram security check is invalid. Please connect again.');
  }

  const now = Math.floor(Date.now() / 1000);
  const uid = String(payload?.uid || '');
  const iat = Number(payload?.iat || 0);
  const exp = Number(payload?.exp || 0);
  const nonce = String(payload?.nonce || '');
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(uid) || !nonce || nonce.length > 128 ||
      !Number.isFinite(iat) || !Number.isFinite(exp) || iat > now + 60 || exp < now || exp - iat > STATE_TTL_SECONDS + 60) {
    throw apiError(403, 'oauth-state-expired', 'Instagram connection session expired. Please connect again.');
  }
  return { uid, iat, exp, nonce };
}

async function firebaseUid(authorization) {
  const match = /^Bearer\s+([^\s]+)$/i.exec(String(authorization || ''));
  if (!match || match[1].length > MAX_BEARER_LENGTH) {
    throw apiError(401, 'unauthenticated', 'Sign in to NexusNova first.');
  }

  let response;
  let data;
  try {
    response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: match[1] })
    });
    data = await response.json().catch(() => ({}));
  } catch (_) {
    throw apiError(502, 'firebase-unavailable', 'Firebase session verification is temporarily unavailable.');
  }

  const uid = String(data?.users?.[0]?.localId || '');
  if (!response.ok || !/^[A-Za-z0-9_-]{1,128}$/.test(uid)) {
    throw apiError(401, 'unauthenticated', 'Firebase session is invalid.');
  }
  return uid;
}

function requireInstagramSecret(env) {
  const secret = String(env.INSTAGRAM_APP_SECRET || '').trim();
  if (!secret) {
    throw apiError(503, 'instagram-not-configured', 'Instagram server verification is not configured yet.');
  }
  return secret;
}

async function readJsonBody(request) {
  const declared = Number(request.headers.get('Content-Length') || 0);
  if (declared > MAX_BODY_BYTES) throw apiError(413, 'invalid-argument', 'Instagram linking request is too large.');
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) throw apiError(413, 'invalid-argument', 'Instagram linking request is too large.');
  try {
    return JSON.parse(text || '{}');
  } catch (_) {
    throw apiError(400, 'invalid-argument', 'Instagram linking request is invalid.');
  }
}

function cleanCode(value) {
  const code = String(value || '').split('#')[0].trim();
  return code && code.length <= 6000 && !/\s/.test(code) ? code : '';
}

function randomToken(byteLength) {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
  return base64UrlBytes(bytes);
}

async function hmacSign(secret, text) {
  const key = await hmacKey(secret, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(text));
  return base64UrlBytes(new Uint8Array(signature));
}

async function hmacVerify(secret, text, encodedSignature) {
  try {
    const key = await hmacKey(secret, ['verify']);
    return await crypto.subtle.verify(
      'HMAC',
      key,
      base64UrlDecode(encodedSignature),
      new TextEncoder().encode(text)
    );
  } catch (_) {
    return false;
  }
}

async function hmacKey(secret, usages) {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    usages
  );
}

function base64UrlBytes(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlDecode(value) {
  const base64 = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  return Uint8Array.from(atob(padded), char => char.charCodeAt(0));
}

function apiError(status, code, publicMessage) {
  const error = new Error(publicMessage);
  error.status = status;
  error.code = code;
  error.publicMessage = publicMessage;
  return error;
}
