const ALLOWED_ORIGINS = new Set([
  "https://nexusnovatools.com",
  "https://www.nexusnovatools.com"
]);
const ALLOWED_AMOUNTS = new Set([3, 5, 10, 25]);
const RATE_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 5;
const ipRequests = new Map();

function json(body, status, request, extraHeaders = {}) {
  const headers = new Headers({
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    ...extraHeaders
  });
  const origin = request.headers.get("origin");
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers.set("access-control-allow-origin", origin);
    headers.set("vary", "Origin");
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

function fromBase64Url(input) {
  if (typeof input !== "string" || !/^[A-Za-z0-9_-]+$/.test(input)) throw new Error("invalid_reference_encoding");
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - base64.length % 4) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function createSupportReference(payload, secret) {
  const payloadPart = base64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), {
    name: "HMAC", hash: "SHA-256"
  }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadPart));
  return payloadPart + "." + base64Url(signature);
}

async function verifySupportReference(reference, secret) {
  if (typeof reference !== "string" || reference.length > 2048) return null;
  const parts = reference.split(".");
  if (parts.length !== 2) return null;
  try {
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), {
      name: "HMAC", hash: "SHA-256"
    }, false, ["verify"]);
    const valid = await crypto.subtle.verify("HMAC", key, fromBase64Url(parts[1]), new TextEncoder().encode(parts[0]));
    if (!valid) return null;
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(parts[0])));
    if (payload?.version !== 1 ||
        payload?.purpose !== "nexusnova-support" ||
        typeof payload?.tracker !== "string" ||
        !/^track_[A-Za-z0-9-]{10,120}$/.test(payload.tracker) ||
        typeof payload?.order_id !== "string" ||
        !/^NN-SUP-[0-9]{13}-[A-F0-9]{8}$/.test(payload.order_id) ||
        !Number.isInteger(payload.amount) ||
        !ALLOWED_AMOUNTS.has(payload.amount) ||
        payload.currency !== "USD" ||
        !Number.isFinite(payload.expires_at) ||
        payload.expires_at < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
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
  if (ipRequests.size > 5000) {
    for (const [key, stamps] of ipRequests) {
      if (!stamps.some((stamp) => now - stamp < RATE_WINDOW_MS)) ipRequests.delete(key);
      if (ipRequests.size <= 4000) break;
    }
  }
  return false;
}

function configReady(env) {
  return env.SUPPORT_CHECKOUT_ENABLED === "true" &&
    Boolean(env.SAFEPAY_PUBLIC_KEY) &&
    Boolean(env.SAFEPAY_SECRET_KEY) &&
    (env.SAFEPAY_ENV === "sandbox" || env.SAFEPAY_ENV === "production");
}

async function createCheckout(request, env) {
  const origin = request.headers.get("origin");
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return json({ ok: false, error: "origin_not_allowed" }, 403, request);
  }

  const publicHost = new URL(request.url).hostname === "nexusnovatools.com" ||
    new URL(request.url).hostname === "www.nexusnovatools.com";
  if (!configReady(env) || (publicHost && env.SAFEPAY_ENV !== "production")) {
    return json({ ok: false, error: "support_checkout_not_configured" }, 503, request);
  }

  const ip = request.headers.get("cf-connecting-ip") || "anonymous";
  if (isRateLimited(ip)) {
    return json({ ok: false, error: "rate_limited" }, 429, request, { "retry-after": "60" });
  }

  let body;
  try { body = await request.json(); }
  catch { return json({ ok: false, error: "invalid_json" }, 400, request); }

  const amount = body?.amount;
  if (!Number.isInteger(amount) || !ALLOWED_AMOUNTS.has(amount)) {
    return json({ ok: false, error: "invalid_support_amount" }, 400, request);
  }

  const { environment, apiHost, checkoutHost } = apiConfig(env);
  const orderId = "NN-SUP-" + Date.now() + "-" + crypto.randomUUID().split("-")[0].toUpperCase();
  const metadata = { order_id: orderId, source: "nexusnova-support", purpose: "support-free-tools" };

  try {
    // Separate support endpoint, same documented Safepay v3 checkout pattern as the existing integration.
    const sessionResponse = await safepayRequest(apiHost + "/order/payments/v3/", env.SAFEPAY_SECRET_KEY, {
      method: "POST",
      body: JSON.stringify({
        merchant_api_key: env.SAFEPAY_PUBLIC_KEY,
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

    const tracker = session?.data?.tracker?.token || session?.data?.tracker ||
      session?.tracker?.token || session?.tracker || null;
    if (typeof tracker !== "string" || !tracker.startsWith("track_")) {
      console.error("Support checkout returned no valid tracker");
      return json({ ok: false, error: "tracker_missing" }, 502, request);
    }

    const passportResponse = await safepayRequest(apiHost + "/client/passport/v1/token", env.SAFEPAY_SECRET_KEY, {
      method: "POST",
      body: "{}"
    });
    const passport = await readJson(passportResponse);
    if (!passportResponse.ok) {
      console.error("Support checkout passport creation failed", passportResponse.status);
      return json({ ok: false, error: "passport_creation_failed" }, 502, request);
    }
    const tbt = typeof passport?.data === "string" ? passport.data : passport?.data?.token || passport?.data?.tbt || null;
    if (!tbt) {
      console.error("Support checkout passport returned no token");
      return json({ ok: false, error: "passport_token_missing" }, 502, request);
    }

    const supportRef = await createSupportReference({
      version: 1,
      purpose: "nexusnova-support",
      tracker,
      order_id: orderId,
      amount,
      currency: "USD",
      environment,
      expires_at: Date.now() + 6 * 60 * 60 * 1000
    }, env.SAFEPAY_SECRET_KEY);

    const redirectUrl = new URL("https://nexusnovatools.com/support-payment-success.html");
    redirectUrl.searchParams.set("support_ref", supportRef);
    const cancelUrl = "https://nexusnovatools.com/support-payment-cancelled.html";
    const checkoutUrl = new URL(checkoutHost);
    checkoutUrl.searchParams.set("environment", environment);
    checkoutUrl.searchParams.set("tbt", tbt);
    checkoutUrl.searchParams.set("tracker", tracker);
    checkoutUrl.searchParams.set("source", "hosted");
    checkoutUrl.searchParams.set("order_id", orderId);
    checkoutUrl.searchParams.set("redirect_url", redirectUrl.toString());
    checkoutUrl.searchParams.set("cancel_url", cancelUrl);

    return json({ ok: true, checkout_url: checkoutUrl.toString(), amount, currency: "USD", environment }, 200, request);
  } catch (error) {
    console.error("Support checkout request failed", error?.name || "unknown_error");
    return json({ ok: false, error: "checkout_unavailable" }, 502, request);
  }
}

async function paymentStatus(request, env) {
  const origin = request.headers.get("origin");
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return json({ ok: false, paid: false, error: "origin_not_allowed" }, 403, request);
  }
  if (!configReady(env)) return json({ ok: false, paid: false, error: "support_checkout_not_configured" }, 503, request);

  const url = new URL(request.url);
  const tracker = url.searchParams.get("tracker") || "";
  const supportRef = url.searchParams.get("support_ref") || "";
  if (!/^track_[A-Za-z0-9-]{10,120}$/.test(tracker)) {
    return json({ ok: false, paid: false, error: "invalid_tracker" }, 400, request);
  }

  const support = await verifySupportReference(supportRef, env.SAFEPAY_SECRET_KEY);
  if (!support || support.tracker !== tracker) {
    return json({ ok: false, paid: false, error: "invalid_support_reference" }, 403, request);
  }

  const { environment, apiHost } = apiConfig(env);
  if (support.environment !== environment) {
    return json({ ok: false, paid: false, error: "environment_mismatch" }, 403, request);
  }

  try {
    const response = await safepayRequest(apiHost + "/reporter/api/v1/payments/" + encodeURIComponent(tracker), env.SAFEPAY_SECRET_KEY);
    const data = await readJson(response);
    if (!response.ok) {
      console.error("Support payment status lookup failed", response.status);
      return json({ ok: false, paid: false, error: "status_lookup_failed" }, 502, request);
    }

    const candidate = data?.data?.tracker || data?.data?.payment || data?.data || data?.tracker || data?.payment || data || {};
    const state = candidate?.state || candidate?.status || data?.data?.state || data?.state || null;
    const clientValue = candidate?.client || candidate?.merchant_api_key || data?.data?.client ||
      data?.data?.merchant_api_key || data?.client || data?.merchant_api_key || null;
    const clientKey = typeof clientValue === "string" ? clientValue : clientValue?.api_key || clientValue?.apiKey || null;
    if (!clientKey || clientKey !== env.SAFEPAY_PUBLIC_KEY) {
      console.error("Support payment status merchant mismatch");
      return json({ ok: false, paid: false, error: "merchant_mismatch" }, 403, request);
    }

    const quote = candidate?.purchase_totals?.quote_amount || null;
    const quoteAmount = typeof quote?.amount === "number" ? quote.amount : null;
    const quoteCurrency = typeof quote?.currency === "string" ? quote.currency.toUpperCase() : null;
    const amountMatches = quoteAmount === support.amount * 100 && quoteCurrency === support.currency;
    const statePaid = state === "TRACKER_ENDED" || state === "PAID" || state === "COMPLETED";
    const paid = Boolean(statePaid && amountMatches);
    if (statePaid && !amountMatches) console.error("Support payment status amount mismatch", tracker);

    return json({
      ok: true, paid, state, tracker, order_id: support.order_id,
      amount: support.amount, currency: support.currency, environment,
      verification: paid ? "verified_support_payment" : "payment_not_confirmed"
    }, 200, request);
  } catch (error) {
    console.error("Support payment status request failed", error?.name || "unknown_error");
    return json({ ok: false, paid: false, error: "status_lookup_failed" }, 502, request);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/health" && request.method === "GET") {
      return json({
        ok: true,
        service: "nexusnova-support-payments",
        enabled: env.SUPPORT_CHECKOUT_ENABLED === "true",
        environment: env.SAFEPAY_ENV || "sandbox",
        credentials: env.SAFEPAY_PUBLIC_KEY && env.SAFEPAY_SECRET_KEY ? "configured" : "missing"
      }, 200, request);
    }

    if (url.pathname === "/api/support/create-checkout") {
      if (request.method === "OPTIONS") {
        const origin = request.headers.get("origin");
        if (!origin || !ALLOWED_ORIGINS.has(origin)) return new Response(null, { status: 403 });
        return new Response(null, { status: 204, headers: {
          "access-control-allow-origin": origin,
          "access-control-allow-methods": "POST, OPTIONS",
          "access-control-allow-headers": "content-type",
          "access-control-max-age": "86400",
          "vary": "Origin"
        }});
      }
      if (request.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405, request, { allow: "POST, OPTIONS" });
      return createCheckout(request, env);
    }

    if (url.pathname === "/api/support/payment-status") {
      if (request.method !== "GET") return json({ ok: false, paid: false, error: "method_not_allowed" }, 405, request, { allow: "GET" });
      return paymentStatus(request, env);
    }

    return json({ ok: false, error: "not_found" }, 404, request);
  }
};
