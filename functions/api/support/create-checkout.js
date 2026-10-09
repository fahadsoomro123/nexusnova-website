const ALLOWED_ORIGINS = new Set([
  "https://nexusnovatools.com",
  "https://www.nexusnovatools.com"
]);
const ALLOWED_AMOUNTS = new Set([3, 5, 10, 25]);
const RATE_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 5;
const ipRequests = new Map();

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

function base64Url(bytes) {
  let binary = "";
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function createSupportReference(payload, secret) {
  const payloadPart = base64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadPart));
  return payloadPart + "." + base64Url(signature);
}

function isRateLimited(ip) {
  const now = Date.now();
  const recent = (ipRequests.get(ip) || []).filter((stamp) => now - stamp < RATE_WINDOW_MS);
  if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
    ipRequests.set(ip, recent);
    return true;
  }
  recent.push(now);
  ipRequests.set(ip, recent);

  // Bound isolate memory if this endpoint is hit by many one-off IP addresses.
  if (ipRequests.size > 5000) {
    for (const [key, stamps] of ipRequests) {
      if (!stamps.some((stamp) => now - stamp < RATE_WINDOW_MS)) ipRequests.delete(key);
      if (ipRequests.size <= 4000) break;
    }
  }
  return false;
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
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return json({ ok: false, error: "origin_not_allowed" }, 403, request);
  }

  // Fail closed in production; never send live visitors to sandbox checkout.
  if (env.CF_PAGES_BRANCH === "main" && env.SAFEPAY_ENV !== "production") {
    return json({ ok: false, error: "production_checkout_not_enabled" }, 503, request);
  }

  const publicKey = env.SAFEPAY_PUBLIC_KEY;
  const secretKey = env.SAFEPAY_SECRET_KEY;
  if (!publicKey || !secretKey) {
    return json({ ok: false, error: "support_checkout_not_configured" }, 503, request);
  }

  const ip = request.headers.get("cf-connecting-ip") || "anonymous";
  if (isRateLimited(ip)) return json({ ok: false, error: "rate_limited" }, 429, request);

  let body;
  try { body = await request.json(); }
  catch { return json({ ok: false, error: "invalid_json" }, 400, request); }

  const amount = body?.amount;
  if (!Number.isInteger(amount) || !ALLOWED_AMOUNTS.has(amount)) {
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
    // This is the same documented Safepay v3 tracker + passport flow used by
    // the existing HumanProof integration, without modifying that Worker.
    const sessionResponse = await safepayRequest(`${apiHost}/order/payments/v3/`, secretKey, {
      method: "POST",
      body: JSON.stringify({
        merchant_api_key: publicKey,
        intent: "CYBERSOURCE",
        mode: "payment",
        entry_mode: "raw",
        currency: "USD",
        amount: amount * 100,
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

    // Signed return reference ties the returning tracker to this support-created session,
    // amount and purpose without a database or edits to the existing Worker.
    const supportRef = await createSupportReference({
      version: 1,
      purpose: "nexusnova-support",
      tracker,
      order_id: orderId,
      amount,
      currency: "USD",
      environment,
      expires_at: Date.now() + 6 * 60 * 60 * 1000
    }, secretKey);

    const redirectUrl = new URL("https://nexusnovatools.com/support-payment-success.html");
    redirectUrl.searchParams.set("support_ref", supportRef);
    const cancelUrl = "https://nexusnovatools.com/support-payment-cancelled.html";

    // Match the proven checkout URL structure used by the existing Worker.
    const checkoutUrl = new URL(checkoutHost);
    checkoutUrl.searchParams.set("environment", environment);
    checkoutUrl.searchParams.set("tbt", tbt);
    checkoutUrl.searchParams.set("tracker", tracker);
    checkoutUrl.searchParams.set("source", "hosted");
    checkoutUrl.searchParams.set("order_id", orderId);
    checkoutUrl.searchParams.set("redirect_url", redirectUrl.toString());
    checkoutUrl.searchParams.set("cancel_url", cancelUrl);

    return json({
      ok: true,
      checkout_url: checkoutUrl.toString(),
      amount,
      currency: "USD",
      environment
    }, 200, request);
  } catch (error) {
    console.error("Support checkout request failed", error?.name || "unknown_error");
    return json({ ok: false, error: "checkout_unavailable" }, 502, request);
  }
}
