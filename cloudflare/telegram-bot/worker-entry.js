import worker from './worker.js';

const AVATAR_PATH = '/api/telegram/avatar';
const AVATAR_TTL_SECONDS = 5 * 60;
const MAX_AVATAR_FUTURE_SECONDS = 10 * 60;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

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

  const numericId = Number(id);
  if (!Number.isSafeInteger(numericId)) return noStore('Invalid Telegram ID.', 400);

  const photos = await telegramApi(token, 'getUserProfilePhotos', {
    user_id: numericId,
    offset: 0,
    limit: 1
  }).catch(() => null);
  const sizes = photos?.result?.photos?.[0];
  if (!Array.isArray(sizes) || sizes.length === 0) {
    return noStore('Telegram profile photo is unavailable.', 404);
  }

  const fileId = sizes[sizes.length - 1]?.file_id;
  if (!fileId) return noStore('Telegram profile photo is unavailable.', 404);

  const file = await telegramApi(token, 'getFile', { file_id: fileId }).catch(() => null);
  const filePath = String(file?.result?.file_path || '');
  if (!filePath || filePath.includes('..') || filePath.startsWith('/')) {
    return noStore('Telegram profile photo is unavailable.', 404);
  }

  const upstream = await fetch(`https://api.telegram.org/file/bot${token}/${filePath}`, {
    redirect: 'follow'
  }).catch(() => null);
  if (!upstream?.ok || !upstream.body) {
    return noStore('Telegram profile photo is unavailable.', 404);
  }

  const upstreamType = String(upstream.headers.get('Content-Type') || '').toLowerCase();
  const contentType = upstreamType.startsWith('image/') ? upstreamType : 'image/jpeg';
  const headers = new Headers();
  headers.set('Content-Type', contentType);
  headers.set('Cache-Control', `private, max-age=${AVATAR_TTL_SECONDS}`);
  headers.set('X-Content-Type-Options', 'nosniff');
  return new Response(upstream.body, { status: 200, headers });
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
