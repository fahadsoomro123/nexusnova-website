import worker from './worker.js';
import { disposableEmailRisk, enforceAuthThrottle } from './auth-abuse.js';
import { accountEligibilityRequest } from './account-eligibility.js';
import { attachReferralRequest } from './referral-api.js';
import { miningSessionRequest } from './mining-api.js';

const AVATAR_PATH = '/api/telegram/avatar';
const AUTH_CONFIG_PATH = '/api/auth/security-config';
const TURNSTILE_VERIFY_PATH = '/api/auth/turnstile/verify';
const ACCOUNT_ELIGIBILITY_PATH = '/api/account/eligibility';
const REFERRAL_ATTACH_PATH = '/api/referral/attach';
const MINING_SESSION_PATH = '/api/mining/session';
const FBR_ATL_PATH = '/api/fbr/atl-status';
const FBR_ATL_ORIGINS = new Set([
  'https://nexusnovatools.com',
  'https://www.nexusnovatools.com'
]);
let fbrVerificationCache = { token: '', expiresAt: 0 };
const FBR_TOKEN_CACHE_MS = 5 * 60 * 1000;
const FBR_VERIFICATION_BRIDGE='https://nexusnova-fbr-staging.fahadsoomro123.workers.dev/api/fbr/atl-status';
const FBR_ATL_LIMIT_WINDOW_MS = 60 * 1000;
const FBR_ATL_LIMIT_MAX = 8;
const fbrAtlRateCache = new Map();

const ALLOWED_ORIGINS = new Set([
  'https://nexusnovatools.com',
  'https://appassets.androidplatform.net'
]);
const ALLOWED_TURNSTILE_HOSTNAME = 'nexusnovatools.com';
const TURNSTILE_ACTION = 'auth';
const TURNSTILE_SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const AVATAR_TTL_SECONDS = 5 * 60;
const MAX_AVATAR_FUTURE_SECONDS = 10 * 60;
const MAX_AUTH_BODY_BYTES = 4096;
const MAX_TURNSTILE_TOKEN_LENGTH = 2048;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const secureApiPath = url.pathname.startsWith('/api/auth/') || url.pathname.startsWith('/api/account/') || url.pathname.startsWith('/api/referral/') || url.pathname.startsWith('/api/mining/');

    if (secureApiPath && request.method === 'OPTIONS') {
      return authCors(request, new Response(null, { status: 204 }));
    }

    if (request.method === 'GET' && url.pathname === AUTH_CONFIG_PATH) {
      return authSecurityConfig(request, env);
    }

    if (request.method === 'POST' && url.pathname === TURNSTILE_VERIFY_PATH) {
      return verifyTurnstile(request, env);
    }

    if (request.method === 'GET' && url.pathname === ACCOUNT_ELIGIBILITY_PATH) {
      try {
        assertAuthOrigin(request);
      } catch (_) {
        return authJson(request, { ok: false, code: 'permission-denied', error: 'Request origin is not allowed.', eligibleForValueActions: false }, 403);
      }
      return authCors(request, await accountEligibilityRequest(request, env));
    }

    if (request.method === 'POST' && url.pathname === MINING_SESSION_PATH) {
      try { assertAuthOrigin(request); } catch (_) {
        return authJson(request, { ok: false, code: 'permission-denied', error: 'Request origin is not allowed.' }, 403);
      }
      return authCors(request, await miningSessionRequest(request, env));
    }

    if (request.method === 'POST' && url.pathname === REFERRAL_ATTACH_PATH) {
      try {
        assertAuthOrigin(request);
      } catch (_) {
        return authJson(request, { ok: false, code: 'permission-denied', error: 'Request origin is not allowed.' }, 403);
      }
      return authCors(request, await attachReferralRequest(request, env));
    }

    if (request.method === 'OPTIONS' && url.pathname === FBR_ATL_PATH) {
      const origin = String(request.headers.get('Origin') || '');
      if (!FBR_ATL_ORIGINS.has(origin)) return new Response(null, { status: 403 });
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '600',
          'Vary': 'Origin'
        }
      });
    }

    if (request.method === 'POST' && url.pathname === FBR_ATL_PATH) {
      return fbrAtlStatus(request);
    }

    if (request.method === 'GET' && url.pathname === AVATAR_PATH) {
      return telegramAvatar(request, env);
    }

    const response = await worker.fetch(request, env, ctx);
    if (request.method === 'POST' &&
        (url.pathname === '/api/telegram/session' || url.pathname === '/api/telegram/link')) {
      return decorateAccountResponse(request, response, env);
    }
    return response;
  }
};

async function fbrAtlStatus(request) {
  const origin = String(request.headers.get('Origin') || '');
  if (!FBR_ATL_ORIGINS.has(origin)) {
    return fbrJson(origin, { ok: false, code: 'permission-denied', error: 'Request origin is not allowed.' }, 403);
  }

  const ip = String(request.headers.get('CF-Connecting-IP') || 'anonymous');
  const now = Date.now();
  const recent = (fbrAtlRateCache.get(ip) || []).filter((time) => now - time < FBR_ATL_LIMIT_WINDOW_MS);
  if (recent.length >= FBR_ATL_LIMIT_MAX) {
    return fbrJson(origin, { ok: false, code: 'too-many-requests', error: 'Too many FBR checks. Please wait a little and try again.' }, 429, { 'Retry-After': '60' });
  }
  recent.push(now);
  fbrAtlRateCache.set(ip, recent);

  let body;
  try {
    const text = await request.text();
    if (text.length > 4096) throw new Error('request-too-large');
    body = JSON.parse(text || '{}');
  } catch (error) {
    return fbrJson(origin, { ok: false, code: error && error.message === 'request-too-large' ? 'request-too-large' : 'invalid-body', error: 'The verification request is invalid.' }, 400);
  }

  const identifierType = String(body && body.identifierType || '').trim();
  const identifier = normalizeFbrIdentifier(identifierType, body && body.identifier);
  const validTypes = new Set(['CNIC', 'NTN', 'Passport No.', 'Reg/Inc. No.']);
  if (!validTypes.has(identifierType) || !isValidFbrIdentifier(identifierType, identifier)) {
    return fbrJson(origin, { ok: false, code: 'invalid-identifier', error: 'Enter a valid identification number for the selected type.' }, 400);
  }

  try {
    const bridgeResponse = await fetch(FBR_VERIFICATION_BRIDGE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: origin },
      body: JSON.stringify({ identifierType, identifier })
    });
    const bridgeData = await bridgeResponse.json().catch(() => null);
    if (bridgeResponse.ok && bridgeData && bridgeData.ok) {
      return fbrJson(origin, bridgeData, 200);
    }
  } catch (error) {
    console.error('FBR bridge unavailable', String(error && error.message || error || 'unknown'));
  }

  const payload = JSON.stringify({
    protocolId: '1004',
    outputType: '4',
    identifierType,
    identifier,
    date: currentFbrDate()
  });

  let upstream;
  try {
    let token = await getFbrVerificationToken(false);
    upstream = await callFbrUpstream(token, payload);
    if (upstream.status === 401) {
      token = await getFbrVerificationToken(true);
      upstream = await callFbrUpstream(token, payload);
    }
  } catch (error) {
    console.error('FBR ATL upstream unavailable', String(error && error.message || error || 'unknown'));
    return fbrJson(origin, { ok: false, code: 'fbr-unavailable', error: 'FBR verification is temporarily unavailable. Please try again.' }, 503);
  }

  const upstreamText = await upstream.text();
  if (!upstream.ok) {
    console.error('FBR ATL upstream returned', upstream.status);
    return fbrJson(origin, {
      ok: false,
      code: upstream.status === 401 ? 'fbr-auth-expired' : 'fbr-upstream-error',
      error: upstream.status === 404 ? 'No FBR verification result was returned.' : 'FBR verification could not be completed right now.'
    }, upstream.status === 404 ? 404 : 502);
  }

  let data;
  try {
    data = JSON.parse(upstreamText);
  } catch {
    return fbrJson(origin, { ok: false, code: 'fbr-invalid-response', error: 'FBR returned an unexpected response.' }, 502);
  }

  const parsed = parseFbrAtlResponse(data);
  return fbrJson(origin, {
    ok: true,
    identifierType,
    identifierLast4: identifier.slice(-4),
    status: parsed.status,
    statusText: parsed.statusText,
    registrationNo: parsed.registrationNo || null,
    checkedAt: new Date().toISOString(),
    source: 'FBR IRIS 2.0'
  });
}

async function callFbrUpstream(token, payload) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 50000);
  try {
    return await fetch('https://api.fbr.gov.pk/iris2ovs/v1/getdata', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        Accept: 'application/json, text/plain, */*',
        'Content-Type': 'application/json',
        Origin: 'https://iris.fbr.gov.pk',
        Referer: 'https://iris.fbr.gov.pk/',
        'User-Agent': 'Mozilla/5.0'
      },
      body: payload,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timer);
  }
}

function fbrJson(origin, data, status, extraHeaders) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Access-Control-Allow-Origin': origin, 'Vary': 'Origin', ...(extraHeaders || {}) }
  });
}

function normalizeFbrIdentifier(type, value) {
  const raw = String(value == null ? '' : value).trim();
  if (type === 'CNIC') return raw.replace(/[^0-9]/g, '');
  if (type === 'NTN') return raw.replace(/[^0-9]/g, '');
  return raw.replace(/\s+/g, ' ').slice(0, 20);
}

function isValidFbrIdentifier(type, value) {
  if (type === 'CNIC') return /^\d{13}$/.test(value);
  if (type === 'NTN') return /^\d{7}$/.test(value);
  return /^[A-Za-z0-9][A-Za-z0-9 ./_-]{0,19}$/.test(value);
}

function currentFbrDate() {
  const date = new Date(Date.now() + 5 * 60 * 60 * 1000);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return String(date.getUTCDate()).padStart(2, '0') + ',' + months[date.getUTCMonth()] + ',' + date.getUTCFullYear();
}

async function getFbrVerificationToken(forceRefresh) {
  if (!forceRefresh && fbrVerificationCache.token && Date.now() < fbrVerificationCache.expiresAt) {
    return fbrVerificationCache.token;
  }

  const home = await fetch('https://iris.fbr.gov.pk/', {
    redirect: 'follow',
    headers: { Accept: 'text/html', 'User-Agent': 'Mozilla/5.0' }
  });
  if (!home.ok) throw new Error('fbr-home-' + home.status);

  const html = await home.text();
  const refs = [...html.matchAll(/(?:src|href)=["']([^"']+\.js(?:\?[^"']*)?)["']/gi)]
    .map((match) => new URL(match[1], 'https://iris.fbr.gov.pk/').toString());

  const candidates = [...new Set(refs)].sort(
    (a, b) =>
      Number(/\/main(?:\.|-)/i.test(b)) -
      Number(/\/main(?:\.|-)/i.test(a))
  );

  const ranges = [
    'bytes=3500000-4499999',
    'bytes=2500000-3499999',
    'bytes=4500000-5499999',
    'bytes=1500000-2499999',
    'bytes=5500000-6499999'
  ];

  for (const url of candidates) {
    try {
      for (const range of ranges) {
        const response = await fetch(url, {
          headers: {
            Range: range,
            Accept: 'application/javascript,text/javascript,*/*;q=0.8',
            'User-Agent': 'Mozilla/5.0'
          }
        });
        if (response.status !== 206) continue;
        const source = await response.text();
        const token = extractFbrVerificationToken(source);
        if (token) {
          fbrVerificationCache = {
            token,
            expiresAt: Date.now() + FBR_TOKEN_CACHE_MS
          };
          return token;
        }
      }
    } catch (_) {
      // Try the next candidate script.
    }
  }

  throw new Error('fbr-verification-token-not-found');
}

function extractFbrVerificationToken(source) {
  const text = String(source || '');
  const lower = text.toLowerCase();

  for (const key of ['authorization_key_verifcation', 'authorization_key_verification']) {
    const index = lower.indexOf(key);
    if (index < 0) continue;

    const slice = text.slice(index, index + 5000);
    const direct = slice.match(
      /authorization_key_verif(?:cation|ication)\s*[:=]\s*["']([^"']+)["']/i
    );
    if (direct) return direct[1];

    const jwt = slice.match(
      /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/
    );
    if (jwt) return jwt[0];
  }

  const jwt = text.match(
    /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/
  );
  return jwt ? jwt[0] : '';
}

function parseFbrAtlResponse(data) {
  const fields = new Map();
  const statusParts = [];
  const allParts = [];
  collectFbrValues(data && data.response !== undefined ? data.response : data, '', fields, statusParts, allParts);
  const topStatus = data && typeof data.status === 'string' ? stripFbrMarkup(data.status) : '';
  const topMessage = data && typeof data.message === 'string' ? stripFbrMarkup(data.message) : '';
  if (topStatus) statusParts.push(topStatus);
  if (topMessage) allParts.push(topMessage);

  const combined = allParts.join(' ');
  const statusText = statusParts.join(' ') || findFbrField(fields, ['filing status', 'atl status', 'status']) || combined;
  const registrationNo = findFbrField(fields, ['registration no', 'registration number']);
  const result = classifyFbrStatus(statusText, combined);
  return { status: result.status, statusText: result.text, registrationNo: registrationNo };
}

function collectFbrValues(node, key, fields, statusParts, allParts) {
  if (node == null) return;
  if (Array.isArray(node)) {
    for (const item of node) collectFbrValues(item, '', fields, statusParts, allParts);
    return;
  }
  if (typeof node === 'object') {
    const title = stripFbrMarkup(node.Title || node.title || key);
    const directResponse = stripFbrMarkup(node.Response || node.response || '');
    const value = stripFbrMarkup(node.Value || node.value || '');
    if (!title && directResponse) {
      allParts.push(directResponse);
      statusParts.push(directResponse);
    } else if (title && value) {
      const normalizedTitle = title.toLowerCase();
      fields.set(normalizedTitle, value);
      allParts.push(title + ' ' + value);
      if (/filing status|atl status|status/.test(normalizedTitle)) statusParts.push(value);
      if (/no record|not found/.test((title + ' ' + value).toLowerCase())) statusParts.push(title + ' ' + value);
    }
    for (const [childKey, childValue] of Object.entries(node)) {
      if (['Title', 'title', 'Value', 'value', 'Response', 'response'].includes(childKey)) continue;
      collectFbrValues(childValue, childKey, fields, statusParts, allParts);
    }
    return;
  }
  const text = stripFbrMarkup(node);
  if (!text) return;
  allParts.push(key ? key + ' ' + text : text);
  if (/status|record|active|filer/i.test(key)) statusParts.push(text);
}

function findFbrField(fields, names) {
  for (const entry of fields.entries()) {
    if (names.some((name) => entry[0].includes(name))) return entry[1];
  }
  return '';
}

function classifyFbrStatus(primary, fallback) {
  const text = String(primary || fallback || '').trim();
  const lower = text.toLowerCase();
  if (!text) return { status: 'unknown', text: 'FBR returned no readable status.' };
  if (/no record exists|not found|no record/.test(lower)) return { status: 'not-found', text: 'No ATL record found for this identifier.' };
  if (/late filer|late-filer|latefiler/.test(lower)) return { status: 'late-filer', text: 'Late Filer' };
  if (/non.?atl|not active|inactive|non.?filer/.test(lower)) return { status: 'inactive', text: 'Not Active / Non-ATL' };
  if (/\bactive\b/.test(lower)) return { status: 'active', text: 'Active Taxpayer' };
  return { status: 'unknown', text: primary || 'FBR returned a result that NexusNova could not classify.' };
}

function stripFbrMarkup(value) {
  return String(value == null ? '' : value).replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
}
function assertAuthOrigin(request) {
  const origin = String(request.headers.get('Origin') || '');
  if (!ALLOWED_ORIGINS.has(origin)) {
    throw new Error('origin-not-allowed');
  }
}

function authCors(request, response) {
  const headers = new Headers(response.headers);
  const origin = String(request.headers.get('Origin') || '');
  if (ALLOWED_ORIGINS.has(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    headers.set('Access-Control-Max-Age', '600');
    headers.set('Vary', 'Origin');
  }
  headers.set('Cache-Control', 'no-store');
  headers.set('X-Content-Type-Options', 'nosniff');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function authJson(request, data, status = 200, extraHeaders = null) {
  const headers = new Headers({ 'Content-Type': 'application/json; charset=utf-8' });
  if (extraHeaders) {
    for (const [key, value] of Object.entries(extraHeaders)) headers.set(key, String(value));
  }
  return authCors(request, new Response(JSON.stringify(data), { status, headers }));
}

function authSecurityConfig(request, env) {
  try {
    assertAuthOrigin(request);
  } catch (_) {
    return authJson(request, { ok: false, code: 'permission-denied' }, 403);
  }

  const siteKey = String(env.TURNSTILE_SITE_KEY || '').trim();
  const secretReady = Boolean(String(env.TURNSTILE_SECRET_KEY || '').trim());
  const enabled = Boolean(siteKey && secretReady);

  return authJson(request, {
    ok: true,
    provider: 'cloudflare-turnstile',
    enabled,
    siteKey: enabled ? siteKey : '',
    action: TURNSTILE_ACTION
  });
}

async function readAuthBody(request) {
  const declaredLength = Number(request.headers.get('Content-Length') || 0);
  if (declaredLength > MAX_AUTH_BODY_BYTES) throw new Error('request-too-large');
  const text = await request.text();
  if (text.length > MAX_AUTH_BODY_BYTES) throw new Error('request-too-large');
  try {
    return JSON.parse(text || '{}');
  } catch (_) {
    throw new Error('invalid-body');
  }
}

async function verifyTurnstile(request, env) {
  try {
    assertAuthOrigin(request);
  } catch (_) {
    return authJson(request, { ok: false, code: 'permission-denied', error: 'Request origin is not allowed.' }, 403);
  }

  const throttle = await enforceAuthThrottle(request).catch(error => {
    console.warn('Auth throttle degraded:', String(error?.message || error || 'unknown'));
    return { allowed: true, retryAfter: 0 };
  });
  if (!throttle.allowed) {
    return authJson(request, {
      ok: false,
      code: 'too-many-requests',
      error: 'Too many security attempts. Wait briefly and try again.'
    }, 429, { 'Retry-After': throttle.retryAfter || 60 });
  }

  const siteKey = String(env.TURNSTILE_SITE_KEY || '').trim();
  const secret = String(env.TURNSTILE_SECRET_KEY || '').trim();
  if (!siteKey || !secret) {
    return authJson(request, {
      ok: false,
      code: 'turnstile-not-configured',
      error: 'Bot protection is not configured on the server yet.'
    }, 503);
  }

  let body;
  try {
    body = await readAuthBody(request);
  } catch (error) {
    const tooLarge = error?.message === 'request-too-large';
    return authJson(request, {
      ok: false,
      code: tooLarge ? 'request-too-large' : 'invalid-argument',
      error: tooLarge ? 'Security request is too large.' : 'Security request is invalid.'
    }, tooLarge ? 413 : 400);
  }

  const token = String(body?.token || '').trim();
  const action = String(body?.action || TURNSTILE_ACTION).trim();
  if (!token || token.length > MAX_TURNSTILE_TOKEN_LENGTH || action !== TURNSTILE_ACTION) {
    return authJson(request, { ok: false, code: 'invalid-argument', error: 'Complete the security check and try again.' }, 400);
  }

  const emailRisk = disposableEmailRisk(body?.email);
  const form = new URLSearchParams({
    secret,
    response: token
  });
  const remoteIp = String(request.headers.get('CF-Connecting-IP') || '').trim();
  if (remoteIp) form.set('remoteip', remoteIp);

  let result;
  try {
    const response = await fetch(TURNSTILE_SITEVERIFY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form
    });
    if (!response.ok) throw new Error(`siteverify-${response.status}`);
    result = await response.json();
  } catch (error) {
    console.error('Turnstile Siteverify unavailable:', String(error?.message || error || 'unknown'));
    return authJson(request, {
      ok: false,
      code: 'turnstile-unavailable',
      error: 'Security verification is temporarily unavailable. Please try again.'
    }, 503);
  }

  const valid = result?.success === true &&
    String(result?.hostname || '') === ALLOWED_TURNSTILE_HOSTNAME &&
    String(result?.action || '') === TURNSTILE_ACTION;

  if (!valid) {
    console.warn('Turnstile verification rejected', {
      success: result?.success === true,
      hostname: String(result?.hostname || ''),
      action: String(result?.action || ''),
      errorCodes: Array.isArray(result?.['error-codes']) ? result['error-codes'].slice(0, 6) : []
    });
    return authJson(request, {
      ok: false,
      code: 'turnstile-failed',
      error: 'Security verification failed. Please retry the check.'
    }, 403);
  }

  return authJson(request, {
    ok: true,
    verified: true,
    provider: 'cloudflare-turnstile',
    emailRisk
  });
}

async function decorateAccountResponse(request, response, env) {
  if (!response.ok || !env.TELEGRAM_BOT_TOKEN) return response;

  const data = await response.clone().json().catch(() => null);
  if (!data?.ok || !validTelegramId(data?.user?.id)) {
    return data === null ? response : jsonResponse(data, response);
  }

  const id = String(data.user.id);
  const expires = Math.floor(Date.now() / 1000) + AVATAR_TTL_SECONDS;
  const sig = await signAvatar(env.TELEGRAM_BOT_TOKEN, id, expires);
  const backendOrigin = new URL(request.url).origin;
  data.user.avatarUrl = `${backendOrigin}${AVATAR_PATH}?id=${encodeURIComponent(id)}&expires=${expires}&sig=${sig}`;

  const inlineAvatar = await telegramAvatarAsset(env.TELEGRAM_BOT_TOKEN, id, true).catch(() => null);
  if (inlineAvatar?.bytes?.byteLength) {
    data.user.avatarDataUrl = `data:${inlineAvatar.contentType};base64,${bytesToBase64(inlineAvatar.bytes)}`;
    data.user.avatarState = 'available';
  } else {
    data.user.avatarState = 'unavailable';
  }

  return jsonResponse(data, response);
}

function jsonResponse(data, original) {
  const headers = new Headers(original.headers);
  headers.set('Content-Type', 'application/json; charset=utf-8');
  headers.set('Cache-Control', 'no-store');
  return new Response(JSON.stringify(data), {
    status: original.status,
    statusText: original.statusText,
    headers
  });
}

async function telegramAvatar(request, env) {
  const token = env.TELEGRAM_BOT_TOKEN;
  if (!token) return noStore('Avatar service is unavailable.', 503);

  const url = new URL(request.url);
  const id = String(url.searchParams.get('id') || '');
  const expires = Number(url.searchParams.get('expires') || 0);
  const sig = String(url.searchParams.get('sig') || '');
  const now = Math.floor(Date.now() / 1000);

  if (!validTelegramId(id) || !Number.isInteger(expires) || expires < now ||
      expires > now + MAX_AVATAR_FUTURE_SECONDS || !/^[a-f0-9]{64}$/i.test(sig)) {
    return noStore('Invalid avatar request.', 403);
  }

  const expected = await signAvatar(token, id, expires);
  if (!constantTimeTextEqual(expected, sig.toLowerCase())) {
    return noStore('Invalid avatar request.', 403);
  }

  const asset = await telegramAvatarAsset(token, id, false).catch(() => null);
  if (!asset?.bytes?.byteLength) {
    return noStore('Telegram profile photo is unavailable.', 404);
  }

  const headers = new Headers();
  headers.set('Content-Type', asset.contentType);
  headers.set('Cache-Control', `private, max-age=${AVATAR_TTL_SECONDS}`);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Cross-Origin-Resource-Policy', 'cross-origin');
  return new Response(asset.bytes, { status: 200, headers });
}

async function telegramAvatarAsset(token, id, preferSmall) {
  const numericId = Number(id);
  if (!Number.isSafeInteger(numericId)) return null;

  const photos = await telegramApi(token, 'getUserProfilePhotos', {
    user_id: numericId,
    offset: 0,
    limit: 1
  });
  const sizes = photos?.result?.photos?.[0];
  if (!Array.isArray(sizes) || sizes.length === 0) return null;

  const selected = preferSmall ? sizes[0] : sizes[sizes.length - 1];
  const fileId = selected?.file_id;
  if (!fileId) return null;

  const file = await telegramApi(token, 'getFile', { file_id: fileId });
  const filePath = String(file?.result?.file_path || '');
  if (!filePath || filePath.includes('..') || filePath.startsWith('/')) return null;

  const upstream = await fetch(`https://api.telegram.org/file/bot${token}/${filePath}`, {
    redirect: 'follow'
  });
  if (!upstream?.ok) return null;

  const upstreamType = String(upstream.headers.get('Content-Type') || '').toLowerCase();
  const contentType = upstreamType.startsWith('image/') ? upstreamType : 'image/jpeg';
  const bytes = new Uint8Array(await upstream.arrayBuffer());
  return bytes.byteLength ? { bytes, contentType } : null;
}

function bytesToBase64(bytes) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

async function telegramApi(token, method, body) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.ok) throw new Error(`Telegram ${method} failed`);
  return result;
}

function validTelegramId(value) {
  return /^[1-9]\d{0,19}$/.test(String(value || ''));
}

async function signAvatar(token, id, expires) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(token),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const bytes = new Uint8Array(await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`NexusNovaAvatar:${id}:${expires}`)
  ));
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

function constantTimeTextEqual(left, right) {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
}

function noStore(text, status) {
  return new Response(text, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}