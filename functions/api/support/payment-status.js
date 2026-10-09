const ALLOWED_ORIGINS = new Set([
  "https://nexusnovatools.com",
  "https://www.nexusnovatools.com"
]);
const ALLOWED_AMOUNTS_MINOR = new Set([300, 500, 1000, 2500]);

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

export async function onRequestGet({ request, env }) {
  const origin = request.headers.get("origin");
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return json({ ok: false, paid: false, error: "origin_not_allowed" }, 403, request);
  }
  if (!env.SAFEPAY_SECRET_KEY) {
    return json({ ok: false, paid: false, error: "support_checkout_not_configured" }, 503, request);
  }

  const url = new URL(request.url);
  const tracker = url.searchParams.get("tracker") || "";
  const orderId = url.searchParams.get("order_id") || "";
  if (!/^track_[A-Za-z0-9-]{10,120}$/.test(tracker) ||
      !/^NN-SUP-[0-9]{13}-[A-F0-9]{8}$/.test(orderId)) {
    return json({ ok: false, paid: false, error: "invalid_return_reference" }, 400, request);
  }

  const { environment, apiHost } = apiConfig(env);
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
    const metadata =
      candidate?.metadata ||
      data?.data?.metadata ||
      data?.metadata ||
      {};
    const returnedOrderId = metadata?.order_id || candidate?.order_id || null;
    const source = metadata?.source || null;
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

    if (env.SAFEPAY_PUBLIC_KEY && clientKey && clientKey !== env.SAFEPAY_PUBLIC_KEY) {
      return json({ ok: false, paid: false, error: "merchant_mismatch" }, 403, request);
    }

    const totals = candidate?.purchase_totals || {};
    const quote = totals?.quote_amount || totals?.base_amount || {};
    const amountMinor = typeof quote?.amount === "number" ? quote.amount : null;
    const currency = quote?.currency || candidate?.currency || data?.data?.currency || null;
    const transactionMatches =
      source === "nexusnova-support" &&
      returnedOrderId === orderId &&
      (currency === "USD" || currency === "usd") &&
      (amountMinor === null || ALLOWED_AMOUNTS_MINOR.has(amountMinor));

    const statePaid = state === "TRACKER_ENDED" || state === "PAID" || state === "COMPLETED";
    const paid = Boolean(statePaid && transactionMatches);

    return json({
      ok: true,
      paid,
      state,
      tracker,
      order_id: orderId,
      amount: amountMinor === null ? null : amountMinor / 100,
      currency: currency || "USD",
      environment,
      verification: transactionMatches ? "support_order_matched" : "support_order_not_matched"
    }, 200, request);
  } catch (error) {
    console.error("Support payment status request failed", error?.name || "unknown_error");
    return json({ ok: false, paid: false, error: "status_lookup_failed" }, 502, request);
  }
}
