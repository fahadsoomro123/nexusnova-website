const SHORT_WINDOW_SECONDS = 60;
const SHORT_WINDOW_LIMIT = 12;
const LONG_WINDOW_SECONDS = 10 * 60;
const LONG_WINDOW_LIMIT = 50;

const TEMP_EMAIL_DOMAINS = new Set([
  '10minutemail.com','10minutemail.net','20minutemail.com','dispostable.com',
  'emailondeck.com','fakeinbox.com','getnada.com','guerrillamail.com',
  'guerrillamail.net','guerrillamail.org','guerrillamailblock.com','grr.la',
  'maildrop.cc','mailinator.com','mailnesia.com','mintemail.com','moakt.com',
  'mytemp.email','sharklasers.com','temp-mail.org','tempail.com','tempmail.com',
  'tempmail.net','throwawaymail.com','trashmail.com','yopmail.com','yopmail.fr'
]);

export async function enforceAuthThrottle(request) {
  const ip = String(request.headers.get('CF-Connecting-IP') || '').trim();
  if (!ip || typeof caches === 'undefined' || !caches.default) {
    return { allowed: true, retryAfter: 0 };
  }

  const ua = String(request.headers.get('User-Agent') || '').trim().slice(0, 180);
  const fingerprint = await sha256Hex(`${ip}\n${ua}`);
  const [short, long] = await Promise.all([
    incrementBucket(`short:${fingerprint}`, SHORT_WINDOW_SECONDS),
    incrementBucket(`long:${fingerprint}`, LONG_WINDOW_SECONDS)
  ]);

  if (short > SHORT_WINDOW_LIMIT) {
    return { allowed: false, retryAfter: SHORT_WINDOW_SECONDS };
  }
  if (long > LONG_WINDOW_LIMIT) {
    return { allowed: false, retryAfter: LONG_WINDOW_SECONDS };
  }
  return { allowed: true, retryAfter: 0 };
}

async function incrementBucket(key, ttlSeconds) {
  const cache = caches.default;
  const cacheKey = new Request(`https://nexusnova-auth-throttle.invalid/${encodeURIComponent(key)}`, { method: 'GET' });
  const existing = await cache.match(cacheKey);
  let count = 0;
  let expiresAt = Date.now() + ttlSeconds * 1000;

  if (existing) {
    const data = await existing.json().catch(() => null);
    if (data && Number.isFinite(Number(data.count)) && Number(data.expiresAt) > Date.now()) {
      count = Number(data.count);
      expiresAt = Number(data.expiresAt);
    }
  }

  count += 1;
  const remainingSeconds = Math.max(1, Math.ceil((expiresAt - Date.now()) / 1000));
  await cache.put(cacheKey, new Response(JSON.stringify({ count, expiresAt }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': `max-age=${remainingSeconds}`
    }
  }));
  return count;
}

export function disposableEmailRisk(value) {
  const email = String(value || '').trim().toLowerCase();
  const match = /^[^\s@]{1,64}@([^\s@]{1,255})$/.exec(email);
  if (!match) return { checked: false, disposable: false, reason: 'not-provided' };
  const domain = match[1].replace(/^\.+|\.+$/g, '');
  const disposable = TEMP_EMAIL_DOMAINS.has(domain) || [...TEMP_EMAIL_DOMAINS].some(item => domain.endsWith(`.${item}`));
  return {
    checked: true,
    disposable,
    reason: disposable ? 'known-temporary-domain' : 'no-known-temporary-domain-match'
  };
}

async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join('');
}
