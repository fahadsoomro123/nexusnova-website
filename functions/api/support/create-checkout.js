const ALLOWED_ORIGINS = new Set([
  "https://nexusnovatools.com",
  "https://www.nexusnovatools.com"
]);
const ALLOWED_AMOUNTS = new Set([3, 5, 10, 25]);
const ipRequests = new Map();
const RATE_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 5;

function json(body, status, request) {
  const headers = {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff"
  };
  const origin = request.headers.get("origin");
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers["access-control-allow-origin"] = origin;
    headers["vary"] = "Origin";
  }
  return new Response(JSON.stringify(body), { status, headers });
}

function apiConfig(env) {
  const environment = env.SAFEPAY_ENV === "production" ? "production" : "sandbox";
  return {
    environment,
    apiHost: environment === "production"
      ? "https://api.getsafepay.com"
      : "https://sandbox.api.getsafepay.com",
    checkoutHost: environment === "production"
      ? "https://getsafepay.com/embedded/"
      : "https://sandbox.api.getsafepay.com/embedded/"
  };
}

async function safepayRequest(url, secret, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("accept", "application/json");
  headers.set("content-type", "application/json");
  headers.set("x-sfpy-merchant-secret", secret);
  return fetch(url, { ...init, headers });
}

async function readJson(response) {
  const text = await response.text();
  try { return text ? JSON.parse(text) : {}; } catch { return {}; }
}

export async function onRequestOptions({ request }) {
  const origin = request.headers.get("origin");
  if (!origin || !ALLOWED_ORIGINS.has(origin)) return new Response(null, { status: 403 });
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": origin,
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type",
      "access-control-max-age": "86400",
      "vary": "Origin"
    }
  });
}

export async function onRequestPost({ request, env }) {
  const origin = request.headers.get("origin");
  if (origin && !ALLOWED_ORIGINS.has(origin)) return json({ ok: false, error: "origin_not_allowed" }, 403, request);

  const publicKey = env.SAFEPAY_PUBLIC_KEY;
  const secretKey = env.SAFEPAY_SECRET_KEY;
  if (!publicKey || !secretKey) {
    return json({ ok: false, error: "support_checkout_not_configured" }, 503, request);
  }

  const ip = request.headers.get("cf-connecting-ip") || "anonymous";
  const now = Date.now();
  const recent = (ipRequests.get(ip) || []).filter((stamp) => now - stamp < RATE_WINDOW_MS);
  if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
    return json({ ok: false, error: "rate_limited" }, 429, request);
  }
  recent.push(now);
  ipRequests.set(ip, recent);

  let body;
  try { body = await request.json(); }
  catch { return json({ ok: false, error: "invalid_json" }, 400, request); }

  const amountDollars = Number(body?.amount);
  if (!ALLOWED_AMOUNTS.has(amountDollars)) {
    return json({ ok: false, error: "invalid_support_amount" }, 400, request);
  }

  const { environment, apiHost, checkoutHost } = apiConfig(env);
  const orderId = "NN-SUP-" + Date.now() + "-" + crypto.randomUUID().split("-")[0].toUpperCase();
  const metadata = {
    order_id: orderId,
    source: "nexusnova-support",
    purpose: "support-free-tools"
  };

  try {
    const sessionResponse = await safepayRequest(`${apiHost}/order/payments/v3/`, secretKey, {
      method: "POST",
      body: JSON.stringify({
        merchant_api_key: publicKey,
        intent: "CYBERSOURCE",
        mode: "payment",
        entry_mode: "raw",
        currency: "USD",
        amount: amountDollars * 100,
        metadata,
        include_fees: false
      })
    });
    const session = await readJson(sessionResponse);
    if (!sessionResponse.ok) {
      console.error("Support checkout session creation failed", sessionResponse.status);
      return json({ ok: false, error: "session_creation_failed" }, 502, request);
    }
    const tracker =
      session?.data?.tracker?.token ||
      session?.data?.tracker ||
      session?.tracker?.token ||
      session?.tracker ||
      null;
    if (typeof tracker !== "string" || !tracker.startsWith("track_")) {
      console.error("Support checkout returned no valid tracker");
      return json({ ok: false, error: "tracker_missing" }, 502, request);
    }

    const passportResponse = await safepayRequest(`${apiHost}/client/passport/v1/token`, secretKey, {
      method: "POST",
      body: "{}"
    });
    const passport = await readJson(passportResponse);
    if (!passportResponse.ok) {
      console.error("Support checkout passport creation failed", passportResponse.status);
      return json({ ok: false, error: "passport_creation_failed" }, 502, request);
    }
    const tbt = typeof passport?.data === "string"
      ? passport.data
      : passport?.data?.token || passport?.data?.tbt || null;
    if (!tbt) {
      console.error("Support checkout passport returned no token");
      return json({ ok: false, error: "passport_token_missing" }, 502, request);
    }

    // Hosted checkout URLs must not receive secrets in client-side code. Safepay's token is short-lived.
    const checkoutUrl = new URL(checkoutHost);
    checkoutUrl.searchParams.set("environment", environment);
    checkoutUrl.searchParams.set("tbt", tbt);
    checkoutUrl.searchParams.set("tracker", tracker);
    checkoutUrl.searchParams.set("source", "hosted");
    checkoutUrl.searchParams.set("order_id", orderId);
    checkoutUrl.searchParams.set("redirect_url", "https://nexusnovatools.com/support-payment-success.html");
    checkoutUrl.searchParams.set("cancel_url", "https://nexusnovatools.com/support-payment-cancelled.html");

    return json({
      ok: true,
      checkout_url: checkoutUrl.toString(),
      tracker,
      order_id: orderId,
      amount: amountDollars,
      currency: "USD",
      environment
    }, 200, request);
  } catch (error) {
    console.error("Support checkout request failed", error?.name || "unknown_error");
    return json({ ok: false, error: "checkout_unavailable" }, 502, request);
  }
}
