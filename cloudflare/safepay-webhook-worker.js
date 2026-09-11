// NexusNova Safepay webhook receiver for Cloudflare Workers
// Secrets must be configured as Worker environment variables, never committed.
// Required for webhook verification: SAFEPAY_WEBHOOK_SECRET
// Optional: SAFEPAY_PUBLIC_KEY (recommended; starts with sec_)
// Optional: SAFEPAY_ENV=sandbox|production (defaults to sandbox)
// SAFEPAY_SECRET_KEY is reserved for server-to-server checkout/API calls and is
// intentionally NOT used to authenticate incoming webhooks.

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff'
  }
});

const encoder = new TextEncoder();

function hex(bytes) {
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqualText(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function verifySafepayWebhook(payload, signature, secret) {
  if (!payload?.data || !signature || !secret) return false;

  // Safepay's standard webhook SDKs sign the JSON-encoded `data` object with
  // HMAC-SHA512 using the dashboard's shared webhook secret.
  const signedData = JSON.stringify(payload.data);
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign']
  );
  const digest = await crypto.subtle.sign('HMAC', key, encoder.encode(signedData));
  const expected = hex(digest);
  return timingSafeEqualText(expected.toLowerCase(), signature.trim().toLowerCase());
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '/health')) {
      return json({
        ok: true,
        service: 'nexusnova-safepay-webhook',
        environment: env.SAFEPAY_ENV || 'sandbox',
        webhook_verification: env.SAFEPAY_WEBHOOK_SECRET ? 'configured' : 'missing'
      });
    }

    if (url.pathname !== '/api/safepay/webhook') {
      return json({ ok: false, error: 'not_found' }, 404);
    }

    if (request.method !== 'POST') {
      return json({ ok: false, error: 'method_not_allowed' }, 405);
    }

    if (!env.SAFEPAY_WEBHOOK_SECRET) {
      console.error('Missing SAFEPAY_WEBHOOK_SECRET');
      return json({ ok: false, error: 'webhook_secret_not_configured' }, 503);
    }

    const rawBody = await request.text();
    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return json({ ok: false, error: 'invalid_json' }, 400);
    }

    const signature = request.headers.get('x-sfpy-signature');
    if (!signature) {
      console.error('Missing X-SFPY-SIGNATURE');
      return json({ ok: false, error: 'missing_signature' }, 400);
    }

    let validSignature = false;
    try {
      validSignature = await verifySafepayWebhook(payload, signature, env.SAFEPAY_WEBHOOK_SECRET);
    } catch (error) {
      console.error('Safepay signature verification error', error);
      return json({ ok: false, error: 'signature_verification_error' }, 500);
    }

    if (!validSignature) {
      console.error('Safepay webhook signature mismatch');
      return json({ ok: false, error: 'invalid_signature' }, 401);
    }

    if (env.SAFEPAY_PUBLIC_KEY && payload?.merchant_api_key !== env.SAFEPAY_PUBLIC_KEY) {
      console.error('Safepay webhook merchant key mismatch');
      return json({ ok: false, error: 'merchant_mismatch' }, 403);
    }

    const eventType = payload?.type || 'unknown';
    const tracker = payload?.data?.tracker || null;
    const state = payload?.data?.state || null;
    const paymentSucceeded = eventType === 'payment.succeeded' && state === 'TRACKER_ENDED';

    console.log(JSON.stringify({
      event: eventType,
      event_token: payload?.token || null,
      tracker,
      state,
      payment_succeeded: paymentSucceeded,
      amount: payload?.data?.amount ?? null,
      currency: payload?.data?.currency || null,
      environment: env.SAFEPAY_ENV || 'sandbox'
    }));

    // Acknowledge every authentic Safepay event with HTTP 200 so Safepay does
    // not retry it. Business logic should only treat payment_succeeded=true as
    // a paid order, and should match the tracker/order_id against server data.
    return json({
      ok: true,
      received: true,
      verified: true,
      event: eventType,
      tracker,
      state,
      payment_succeeded: paymentSucceeded
    }, 200);
  }
};
