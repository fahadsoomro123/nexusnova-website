// NexusNova Safepay checkout + webhook Worker for Cloudflare Workers
// Secrets must be configured as Worker environment variables, never committed.
// Required for checkout: SAFEPAY_PUBLIC_KEY, SAFEPAY_SECRET_KEY
// Required for webhook verification: SAFEPAY_WEBHOOK_SECRET
// Optional: SAFEPAY_ENV=sandbox|production (defaults to sandbox)

const SITE_ORIGINS = new Set([
  'https://nexusnovatools.com',
  'https://www.nexusnovatools.com'
]);

const PLANS = Object.freeze({
  personal: { name: 'Personal', amount: 100, currency: 'USD' },
  starter: { name: 'Business Starter', amount: 999, currency: 'USD' },
  growth: { name: 'Business Growth', amount: 2499, currency: 'USD' }
});

const encoder = new TextEncoder();

function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      ...extraHeaders
    }
  });
}

function corsHeaders(request) {
  const origin = request.headers.get('origin');
  if (!origin || !SITE_ORIGINS.has(origin)) return {};
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400',
    'vary': 'Origin'
  };
}

function hex(bytes) {
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqualText(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function verifySafepayWebhook(rawBody, signature, secret) {
  if (!rawBody || !signature || !secret) return false;
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign']
  );
  const digest = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody));
  const expected = hex(digest);
  const provided = signature.trim().toLowerCase().replace(/^sha512=/, '');
  return timingSafeEqualText(expected.toLowerCase(), provided);
}

function environmentConfig(env) {
  const environment = env.SAFEPAY_ENV === 'production' ? 'production' : 'sandbox';
  return {
    environment,
    apiHost: environment === 'production'
      ? 'https://api.getsafepay.com'
      : 'https://sandbox.api.getsafepay.com',
    checkoutHost: environment === 'production'
      ? 'https://getsafepay.com/embedded/'
      : 'https://sandbox.api.getsafepay.com/embedded/'
  };
}

async function safepayRequest(url, secret, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set('accept', 'application/json');
  headers.set('content-type', 'application/json');
  headers.set('x-sfpy-merchant-secret', secret);
  return fetch(url, { ...init, headers });
}

async function createCheckout(request, env) {
  const cors = corsHeaders(request);
  const origin = request.headers.get('origin');
  if (origin && !SITE_ORIGINS.has(origin)) {
    return json({ ok: false, error: 'origin_not_allowed' }, 403, cors);
  }

  if (!env.SAFEPAY_PUBLIC_KEY || !env.SAFEPAY_SECRET_KEY) {
    console.error('Safepay checkout credentials are not configured');
    return json({ ok: false, error: 'checkout_not_configured' }, 503, cors);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'invalid_json' }, 400, cors);
  }

  const planKey = typeof body?.plan === 'string' ? body.plan.toLowerCase() : '';
  const plan = PLANS[planKey];
  if (!plan) return json({ ok: false, error: 'invalid_plan' }, 400, cors);

  const { environment, apiHost, checkoutHost } = environmentConfig(env);
  const random = crypto.randomUUID().split('-')[0].toUpperCase();
  const orderId = `NN-HP-${Date.now()}-${random}`;

  const sessionResponse = await safepayRequest(
    `${apiHost}/order/payments/v3/`,
    env.SAFEPAY_SECRET_KEY,
    {
      method: 'POST',
      body: JSON.stringify({
        merchant_api_key: env.SAFEPAY_PUBLIC_KEY,
        intent: 'CYBERSOURCE',
        mode: 'payment',
        entry_mode: 'raw',
        currency: plan.currency,
        amount: plan.amount,
        metadata: {
          order_id: orderId,
          source: 'nexusnova-humanproof'
        },
        include_fees: false
      })
    }
  );

  const sessionText = await sessionResponse.text();
  let sessionJson = {};
  try { sessionJson = sessionText ? JSON.parse(sessionText) : {}; } catch {}

  if (!sessionResponse.ok) {
    console.error('Safepay session creation failed', sessionResponse.status, sessionText.slice(0, 800));
    return json({ ok: false, error: 'session_creation_failed', status: sessionResponse.status }, 502, cors);
  }

  const tracker =
    sessionJson?.data?.tracker?.token ||
    sessionJson?.data?.tracker ||
    sessionJson?.tracker?.token ||
    sessionJson?.tracker ||
    null;

  if (typeof tracker !== 'string' || !tracker.startsWith('track_')) {
    console.error('Safepay session response missing tracker');
    return json({ ok: false, error: 'tracker_missing' }, 502, cors);
  }

  const passportResponse = await safepayRequest(
    `${apiHost}/client/passport/v1/token`,
    env.SAFEPAY_SECRET_KEY,
    { method: 'POST', body: '{}' }
  );

  const passportText = await passportResponse.text();
  let passportJson = {};
  try { passportJson = passportText ? JSON.parse(passportText) : {}; } catch {}

  if (!passportResponse.ok) {
    console.error('Safepay passport creation failed', passportResponse.status, passportText.slice(0, 800));
    return json({ ok: false, error: 'passport_creation_failed', status: passportResponse.status }, 502, cors);
  }

  const tbt = typeof passportJson?.data === 'string'
    ? passportJson.data
    : (passportJson?.data?.token || passportJson?.data?.tbt || null);

  if (!tbt) {
    console.error('Safepay passport response missing token');
    return json({ ok: false, error: 'passport_token_missing' }, 502, cors);
  }

  // Keep these URLs free of their own query string. Safepay appends tracker/order data.
  const redirectUrl = 'https://nexusnovatools.com/humanproof-payment-success.html';
  const cancelUrl = 'https://nexusnovatools.com/humanproof-payment-cancelled.html';

  const checkoutUrl = new URL(checkoutHost);
  checkoutUrl.searchParams.set('environment', environment);
  checkoutUrl.searchParams.set('tbt', tbt);
  checkoutUrl.searchParams.set('tracker', tracker);
  checkoutUrl.searchParams.set('source', 'hosted');
  checkoutUrl.searchParams.set('order_id', orderId);
  checkoutUrl.searchParams.set('redirect_url', redirectUrl);
  checkoutUrl.searchParams.set('cancel_url', cancelUrl);

  console.log(JSON.stringify({
    event: 'checkout.created',
    order_id: orderId,
    tracker,
    plan: planKey,
    amount: plan.amount,
    currency: plan.currency,
    environment
  }));

  return json({
    ok: true,
    checkout_url: checkoutUrl.toString(),
    tracker,
    order_id: orderId,
    plan: planKey,
    amount: plan.amount,
    currency: plan.currency,
    environment
  }, 200, cors);
}

async function paymentStatus(request, env) {
  const cors = corsHeaders(request);
  const origin = request.headers.get('origin');
  if (origin && !SITE_ORIGINS.has(origin)) {
    return json({ ok: false, error: 'origin_not_allowed' }, 403, cors);
  }
  if (!env.SAFEPAY_SECRET_KEY) {
    return json({ ok: false, error: 'checkout_not_configured' }, 503, cors);
  }

  const url = new URL(request.url);
  const tracker = url.searchParams.get('tracker') || '';
  if (!/^track_[A-Za-z0-9-]{10,120}$/.test(tracker)) {
    return json({ ok: false, error: 'invalid_tracker' }, 400, cors);
  }

  const { environment, apiHost } = environmentConfig(env);
  const response = await safepayRequest(
    `${apiHost}/reporter/api/v1/payments/${encodeURIComponent(tracker)}`,
    env.SAFEPAY_SECRET_KEY,
    { method: 'GET' }
  );

  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch {}

  if (!response.ok) {
    console.error('Safepay payment status lookup failed', response.status, text.slice(0, 800));
    return json({ ok: false, error: 'status_lookup_failed', status: response.status }, 502, cors);
  }

  // Safepay Reporter responses have appeared in more than one envelope shape.
  // Accept only known server-returned fields; never trust browser state.
  const candidate =
    data?.data?.tracker ||
    data?.data?.payment ||
    data?.data ||
    data?.tracker ||
    data?.payment ||
    data ||
    {};

  const state =
    candidate?.state ||
    candidate?.status ||
    data?.data?.state ||
    data?.state ||
    null;

  const client =
    candidate?.client ||
    candidate?.merchant_api_key ||
    data?.data?.client ||
    data?.data?.merchant_api_key ||
    data?.client ||
    data?.merchant_api_key ||
    null;

  if (env.SAFEPAY_PUBLIC_KEY && client && client !== env.SAFEPAY_PUBLIC_KEY) {
    console.error('Safepay payment status merchant mismatch');
    return json({ ok: false, error: 'merchant_mismatch' }, 403, cors);
  }

  const paid = state === 'TRACKER_ENDED' || state === 'PAID' || state === 'COMPLETED';

  console.log(JSON.stringify({
    event: 'payment.status',
    tracker,
    state,
    paid,
    environment
  }));

  return json({
    ok: true,
    tracker,
    state,
    paid,
    environment
  }, 200, cors);
}

async function webhook(request, env) {
  if (!env.SAFEPAY_WEBHOOK_SECRET) {
    console.error('Missing SAFEPAY_WEBHOOK_SECRET');
    return json({ ok: false, error: 'webhook_secret_not_configured' }, 503);
  }

  const rawBody = await request.text();
  const signature = request.headers.get('x-sfpy-signature');
  if (!signature) {
    console.error('Missing X-SFPY-SIGNATURE');
    return json({ ok: false, error: 'missing_signature' }, 400);
  }

  let validSignature = false;
  try {
    validSignature = await verifySafepayWebhook(rawBody, signature, env.SAFEPAY_WEBHOOK_SECRET);
  } catch (error) {
    console.error('Safepay signature verification error', error);
    return json({ ok: false, error: 'signature_verification_error' }, 500);
  }

  if (!validSignature) {
    console.error('Safepay webhook signature mismatch');
    return json({ ok: false, error: 'invalid_signature' }, 401);
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return json({ ok: false, error: 'invalid_json' }, 400);
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
    order_id: payload?.data?.metadata?.order_id || null,
    amount: payload?.data?.amount ?? null,
    currency: payload?.data?.currency || null,
    environment: env.SAFEPAY_ENV || 'sandbox'
  }));

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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = corsHeaders(request);

    if (request.method === 'OPTIONS' && (
      url.pathname === '/api/safepay/create-checkout' ||
      url.pathname === '/api/safepay/payment-status'
    )) {
      const origin = request.headers.get('origin');
      if (!origin || !SITE_ORIGINS.has(origin)) return new Response(null, { status: 403 });
      return new Response(null, { status: 204, headers: cors });
    }

    if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '/health')) {
      return json({
        ok: true,
        service: 'nexusnova-safepay',
        environment: env.SAFEPAY_ENV || 'sandbox',
        webhook_verification: env.SAFEPAY_WEBHOOK_SECRET ? 'configured' : 'missing',
        checkout: env.SAFEPAY_PUBLIC_KEY && env.SAFEPAY_SECRET_KEY ? 'configured' : 'missing'
      });
    }

    if (url.pathname === '/api/safepay/create-checkout') {
      if (request.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405, cors);
      return createCheckout(request, env);
    }

    if (url.pathname === '/api/safepay/payment-status') {
      if (request.method !== 'GET') return json({ ok: false, error: 'method_not_allowed' }, 405, cors);
      return paymentStatus(request, env);
    }

    if (url.pathname === '/api/safepay/webhook') {
      if (request.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405);
      return webhook(request, env);
    }

    return json({ ok: false, error: 'not_found' }, 404);
  }
};