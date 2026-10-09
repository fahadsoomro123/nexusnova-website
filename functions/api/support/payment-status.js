const ALLOWED_ORIGINS = new Set([
  "https://nexusnovatools.com",
  "https://www.nexusnovatools.com"
]);
const ALLOWED_AMOUNTS = new Set([3, 5, 10, 25]);

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
      : "https://sandbox.api.getsafepay.com"
  };
}

async function safepayRequest(url, secret) {
  return fetch(url, {
    method: "GET",
    headers: {
      "accept": "application/json",
      "content-type": "application/json",
      "x-sfpy-merchant-secret": secret
    }
  });
}

async function readJson(response) {
  const text = await response.text();
  try { return text ? JSON.parse(text) : {}; } catch { return {}; }
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

async function verifySupportReference(reference, secret) {
  if (typeof reference !== "string" || reference.length > 2048) return null;
  const parts = reference.split(".");
  if (parts.length !== 2) return null;

  try {
    const payloadBytes = fromBase64Url(parts[0]);
    const signatureBytes = fromBase64Url(parts[1]);
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBytes,
      new TextEncoder().encode(parts[0])
    );
    if (!valid) return null;

    const payload = JSON.parse(new TextDecoder().decode(payloadBytes));
    if (
      payload?.version !== 1 ||
      payload?.purpose !== "nexusnova-support" ||
      typeof payload?.tracker !== "string" ||
      !/^track_[A-Za-z0-9-]{10,120}$/.test(payload.tracker) ||
      typeof payload?.order_id !== "string" ||
      !/^NN-SUP-[0-9]{13}-[A-F0-9]{8}$/.test(payload.order_id) ||
      !Number.isInteger(payload.amount) ||
      !ALLOWED_AMOUNTS.has(payload.amount) ||
      payload.currency !== "USD" ||
      !Number.isFinite(payload.expires_at) ||
      payload.expires_at < Date.now()
    ) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function onRequestGet({ request, env }) {
  const origin = request.headers.get("origin");
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return json({ ok: false, paid: false, error: "origin_not_allowed" }, 403, request);
  }
  if (!env.SAFEPAY_SECRET_KEY || !env.SAFEPAY_PUBLIC_KEY) {
    return json({ ok: false, paid: false, error: "support_checkout_not_configured" }, 503, request);
  }

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
    const response = await safepayRequest(
      `${apiHost}/reporter/api/v1/payments/${encodeURIComponent(tracker)}`,
      env.SAFEPAY_SECRET_KEY
    );
    const data = await readJson(response);
    if (!response.ok) {
      console.error("Support payment status lookup failed", response.status);
      return json({ ok: false, paid: false, error: "status_lookup_failed" }, 502, request);
    }

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
    const clientValue =
      candidate?.client ||
      candidate?.merchant_api_key ||
      data?.data?.client ||
      data?.data?.merchant_api_key ||
      data?.client ||
      data?.merchant_api_key ||
      null;
    const clientKey = typeof clientValue === "string"
      ? clientValue
      : clientValue?.api_key || clientValue?.apiKey || null;

    // The signed support reference ties this tracker to the support action; the
    // reporter response must also belong to this merchant and exact expected amount.
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

    if (statePaid && !amountMatches) {
      console.error("Support payment status amount mismatch", tracker);
    }

    return json({
      ok: true,
      paid,
      state,
      tracker,
      order_id: support.order_id,
      amount: support.amount,
      currency: support.currency,
      environment,
      verification: paid ? "verified_support_payment" : "payment_not_confirmed"
    }, 200, request);
  } catch (error) {
    console.error("Support payment status request failed", error?.name || "unknown_error");
    return json({ ok: false, paid: false, error: "status_lookup_failed" }, 502, request);
  }
}
