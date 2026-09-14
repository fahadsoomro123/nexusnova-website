const SHORT_WINDOW_SECONDS = 60;
const SHORT_WINDOW_LIMIT = 24;
const LONG_WINDOW_SECONDS = 10 * 60;
const LONG_WINDOW_LIMIT = 80;

export async function enforceNovaThrottle(request) {
  const ip = String(request.headers.get('CF-Connecting-IP') || '').trim();
  if (!ip || typeof caches === 'undefined' || !caches.default) return { allowed: true, retryAfter: 0 };
  const ua = String(request.headers.get('User-Agent') || '').trim().slice(0, 180);
  const fingerprint = await sha256Hex(`${ip}\n${ua}`);
  const [short, long] = await Promise.all([
    incrementBucket(`short:${fingerprint}`, SHORT_WINDOW_SECONDS),
    incrementBucket(`long:${fingerprint}`, LONG_WINDOW_SECONDS)
  ]);
  if (short > SHORT_WINDOW_LIMIT) return { allowed: false, retryAfter: SHORT_WINDOW_SECONDS };
  if (long > LONG_WINDOW_LIMIT) return { allowed: false, retryAfter: LONG_WINDOW_SECONDS };
  return { allowed: true, retryAfter: 0 };
}

async function incrementBucket(key, ttlSeconds) {
  const cacheKey = new Request(`https://nexusnova-nova-throttle.invalid/${encodeURIComponent(key)}`, { method: 'GET' });
  const existing = await caches.default.match(cacheKey);
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
  await caches.default.put(cacheKey, new Response(JSON.stringify({ count, expiresAt }), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': `max-age=${remainingSeconds}` }
  }));
  return count;
}

async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join('');
}
