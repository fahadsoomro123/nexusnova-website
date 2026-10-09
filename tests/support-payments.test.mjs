import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import supportWorker from "../cloudflare/support-payments/worker.js";

const ORIGIN = "https://nexusnovatools.com";
const WORKER_ORIGIN = "https://nexusnova-support-payments.test.workers.dev";
const PUBLIC_KEY = "sec_test_support_key";
const SECRET_KEY = "test-only-support-secret-not-a-real-key";
const TRACKER = "track_12345678-abcd-4321-abcd-123456789abc";
const env = {
  SUPPORT_CHECKOUT_ENABLED: "true",
  SAFEPAY_ENV: "sandbox",
  SUPPORT_SUCCESS_URL: "https://raw.githack.com/fahadsoomro123/nexusnova-website/nexusnova-support-production/support-payment-success-preview.html",
  SUPPORT_CANCEL_URL: "https://raw.githack.com/fahadsoomro123/nexusnova-website/nexusnova-support-production/support-payment-cancelled-preview.html",
  SAFEPAY_PUBLIC_KEY: PUBLIC_KEY,
  SAFEPAY_SECRET_KEY: SECRET_KEY
};
const originalFetch = globalThis.fetch;

function makeRequest(url, { method = "GET", body, origin = ORIGIN, ip = "203.0.113.1" } = {}) {
  const headers = new Headers();
  if (origin) headers.set("origin", origin);
  headers.set("cf-connecting-ip", ip);
  if (body !== undefined) headers.set("content-type", "application/json");
  return new Request(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
}

function mockSafepay({ state = "TRACKER_ENDED", amount = 500, currency = "USD", client = PUBLIC_KEY } = {}) {
  const calls = [];
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input);
    calls.push({ url, init });
    if (url.endsWith("/order/payments/v3/")) {
      return Response.json({ data: { tracker: { token: TRACKER } } });
    }
    if (url.endsWith("/client/passport/v1/token")) {
      return Response.json({ data: "mock-short-lived-token" });
    }
    if (url.includes("/reporter/api/v1/payments/")) {
      return Response.json({ data: { tracker: {
        token: TRACKER,
        client,
        state,
        purchase_totals: { quote_amount: { amount, currency } }
      } } });
    }
    throw new Error("Unexpected Safepay URL: " + url);
  };
  return calls;
}

async function createCheckout(amount = 5, runtimeEnv = env, ip = "203.0.113.1") {
  const request = makeRequest(WORKER_ORIGIN + "/api/support/create-checkout", {
    method: "POST",
    ip,
    body: { amount }
  });
  const response = await supportWorker.fetch(request, runtimeEnv);
  return { response, data: await response.json() };
}

test("creates an allowlisted USD support checkout with signed order ID and clean return URLs", async (t) => {
  t.after(() => { globalThis.fetch = originalFetch; });
  const calls = mockSafepay();
  const { response, data } = await createCheckout(5);
  assert.equal(response.status, 200);
  assert.equal(data.ok, true);
  assert.equal(data.amount, 5);
  assert.equal(data.currency, "USD");
  assert.match(data.checkout_url, /^https:\/\/sandbox\.api\.getsafepay\.com\/embedded\//);
  assert.equal(data.checkout_url.includes(SECRET_KEY), false);
  assert.equal(calls.length, 2);

  const checkout = new URL(data.checkout_url);
  assert.equal(checkout.searchParams.get("tracker"), TRACKER);
  assert.equal(checkout.searchParams.get("tbt"), "mock-short-lived-token");
  assert.equal(checkout.searchParams.get("source"), "hosted");
  assert.equal(checkout.searchParams.get("cancel_url"), env.SUPPORT_CANCEL_URL);

  const redirect = new URL(checkout.searchParams.get("redirect_url"));
  assert.equal(redirect.href, env.SUPPORT_SUCCESS_URL);
  assert.equal(redirect.search, "", "Safepay return URL should stay query-free");
  const orderId = checkout.searchParams.get("order_id");
  assert.match(orderId, /^NNS-[0-9]{13}-5-[A-F0-9]{8}-[A-F0-9]{24}$/);
  const metadata = JSON.parse(calls[0].init.body).metadata;
  assert.equal(metadata.order_id, orderId);
  assert.equal(metadata.source, "nexusnova-support");
  assert.equal(Object.hasOwn(metadata, "purpose"), false, "Safepay session setup must not include the provider-rejected purpose field");
  assert.equal(calls[0].init.headers.get("x-sfpy-merchant-secret"), SECRET_KEY);
  assert.equal(JSON.parse(calls[0].init.body).amount, 500);
  assert.equal(JSON.parse(calls[0].init.body).currency, "USD");
});

test("accepts each approved support amount and sends the matching minor-unit amount to Safepay", async (t) => {
  t.after(() => { globalThis.fetch = originalFetch; });
  const calls = mockSafepay();
  const amounts = [3, 5, 10, 25];
  for (const [index, amount] of amounts.entries()) {
    const { response, data } = await createCheckout(amount, env, "192.0.2." + (index + 1));
    assert.equal(response.status, 200);
    assert.equal(data.amount, amount);
    assert.equal(data.currency, "USD");
    const createCall = calls[index * 2];
    const payload = JSON.parse(createCall.init.body);
    assert.equal(payload.amount, amount * 100);
    assert.equal(payload.currency, "USD");
  }
  assert.equal(calls.length, amounts.length * 2);
});

test("reports only the HTTP status when Safepay rejects session creation", async (t) => {
  t.after(() => { globalThis.fetch = originalFetch; });
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return Response.json({ status: { message: "unauthorized", errors: [{ code: "auth_error", message: "Key not accepted" }] } }, { status: 401 });
  };
  const { response, data } = await createCheckout(3);
  assert.equal(response.status, 502);
  assert.equal(data.error, "session_creation_failed");
  assert.equal(data.upstream_status, 401);
  assert.equal(data.upstream_message, "unauthorized");
  assert.deepEqual(data.upstream_errors, [{ code: "auth_error", message: "Key not accepted" }]);
  assert.equal(Object.prototype.hasOwnProperty.call(data, "secret"), false);
  assert.equal(calls, 1);
});

test("rejects amounts outside the four approved values without contacting Safepay", async (t) => {
  t.after(() => { globalThis.fetch = originalFetch; });
  let fetchCalls = 0;
  globalThis.fetch = async () => { fetchCalls++; throw new Error("must not call Safepay"); };
  const invalidAmounts = [0, 1, 3.5, 4, 100, "5", null];
  for (const [index, amount] of invalidAmounts.entries()) {
    const { response, data } = await createCheckout(amount, env, "198.51.100." + (index + 1));
    assert.equal(response.status, 400, "amount: " + String(amount));
    assert.equal(data.error, "invalid_support_amount");
  }
  assert.equal(fetchCalls, 0);
});

test("fails closed when production checkout is not explicitly enabled", async (t) => {
  t.after(() => { globalThis.fetch = originalFetch; });
  let fetchCalls = 0;
  globalThis.fetch = async () => { fetchCalls++; throw new Error("must not call Safepay"); };
  const request = makeRequest(ORIGIN + "/api/support/create-checkout", {
    method: "POST",
    body: { amount: 5 }
  });
  const response = await supportWorker.fetch(request, { ...env, SAFEPAY_ENV: "sandbox" });
  const data = await response.json();
  assert.equal(response.status, 503);
  assert.equal(data.error, "support_checkout_not_configured");
  assert.equal(fetchCalls, 0);
});

test("only confirms a matching signed support tracker, merchant, amount and paid state", async (t) => {
  t.after(() => { globalThis.fetch = originalFetch; });
  mockSafepay({ state: "TRACKER_ENDED", amount: 500 });
  const created = await createCheckout(5);
  assert.equal(created.response.status, 200);
  const checkout = new URL(created.data.checkout_url);
  const tracker = checkout.searchParams.get("tracker");
  const orderId = checkout.searchParams.get("order_id");

  globalThis.fetch = async (input) => {
    assert.match(String(input), new RegExp("/reporter/api/v1/payments/" + TRACKER));
    return Response.json({ data: { tracker: {
      token: TRACKER,
      client: PUBLIC_KEY,
      state: "TRACKER_ENDED",
      metadata: { order_id: { value: orderId }, source: { value: "nexusnova-support" } },
      purchase_totals: { quote_amount: { amount: 500, currency: "USD" } }
    } } });
  };
  const request = makeRequest(WORKER_ORIGIN + "/api/support/payment-status?tracker=" +
    encodeURIComponent(tracker) + "&order_id=" + encodeURIComponent(orderId));
  const result = await supportWorker.fetch(request, env);
  const body = await result.json();
  assert.equal(result.status, 200);
  assert.equal(body.paid, true);
  assert.equal(body.order_id.startsWith("NNS-"), true);
  assert.equal(body.amount, 5);
  assert.equal(body.currency, "USD");
});

test("does not confirm a payment when the returned amount differs from the signed amount", async (t) => {
  t.after(() => { globalThis.fetch = originalFetch; });
  mockSafepay({ state: "TRACKER_ENDED", amount: 500 });
  const created = await createCheckout(5);
  const checkout = new URL(created.data.checkout_url);
  const tracker = checkout.searchParams.get("tracker");
  const orderId = checkout.searchParams.get("order_id");

  globalThis.fetch = async () => Response.json({ data: { tracker: {
    token: TRACKER,
    client: PUBLIC_KEY,
    state: "TRACKER_ENDED",
    metadata: { order_id: orderId, source: "nexusnova-support" },
    purchase_totals: { quote_amount: { amount: 300, currency: "USD" } }
  } } });
  const request = makeRequest(WORKER_ORIGIN + "/api/support/payment-status?tracker=" +
    encodeURIComponent(tracker) + "&order_id=" + encodeURIComponent(orderId));
  const result = await supportWorker.fetch(request, env);
  const body = await result.json();
  assert.equal(result.status, 200);
  assert.equal(body.paid, false);
  assert.equal(body.verification, "payment_not_confirmed");
});

test("rejects a tampered signed order ID before asking Safepay", async (t) => {
  t.after(() => { globalThis.fetch = originalFetch; });
  mockSafepay();
  const created = await createCheckout(5);
  const checkout = new URL(created.data.checkout_url);
  const tracker = checkout.searchParams.get("tracker");
  const genuine = checkout.searchParams.get("order_id");
  const tampered = genuine.slice(0, -1) + (genuine.endsWith("A") ? "B" : "A");

  let reporterCalls = 0;
  globalThis.fetch = async (input) => {
    if (String(input).includes("/reporter/api/")) reporterCalls++;
    throw new Error("tampered reference must be rejected before Reporter lookup");
  };
  const request = makeRequest(WORKER_ORIGIN + "/api/support/payment-status?tracker=" +
    encodeURIComponent(tracker) + "&order_id=" + encodeURIComponent(tampered));
  const response = await supportWorker.fetch(request, env);
  const body = await response.json();
  assert.equal(response.status, 403);
  assert.equal(body.error, "invalid_support_order");
  assert.equal(reporterCalls, 0);
});

test("exposes a routed production health endpoint without leaking credentials", async () => {
  const request = makeRequest("https://nexusnovatools.com/api/support/health", {
    method: "GET",
    origin: ORIGIN
  });
  const response = await supportWorker.fetch(request, {
    ...env,
    SAFEPAY_ENV: "production",
    SAFEPAY_PUBLIC_KEY: PUBLIC_KEY,
    SAFEPAY_SECRET_KEY: SECRET_KEY
  });
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.enabled, true);
  assert.equal(body.environment, "production");
  assert.equal(body.credentials, "configured");
  assert.equal(JSON.stringify(body).includes(SECRET_KEY), false);
});

test("rejects production checkout creation without an official NexusNova Origin", async (t) => {
  t.after(() => { globalThis.fetch = originalFetch; });
  let fetchCalls = 0;
  globalThis.fetch = async () => { fetchCalls++; throw new Error("must not call Safepay"); };
  const productionEnv = { ...env, SAFEPAY_ENV: "production" };
  const request = makeRequest("https://nexusnovatools.com/api/support/create-checkout", {
    method: "POST",
    origin: null,
    body: { amount: 5 }
  });
  const response = await supportWorker.fetch(request, productionEnv);
  const body = await response.json();
  assert.equal(response.status, 403);
  assert.equal(body.error, "origin_not_allowed");
  assert.equal(fetchCalls, 0);
});

test("allows the raw.githack preview origin only for sandbox CORS", async () => {
  const request = makeRequest(WORKER_ORIGIN + "/api/support/create-checkout", {
    method: "OPTIONS",
    origin: "https://raw.githack.com"
  });
  const response = await supportWorker.fetch(request, env);
  assert.equal(response.status, 204);
  assert.equal(response.headers.get("access-control-allow-origin"), "https://raw.githack.com");
});

test("rejects unsupported origins", async (t) => {
  t.after(() => { globalThis.fetch = originalFetch; });
  let fetchCalls = 0;
  globalThis.fetch = async () => { fetchCalls++; throw new Error("must not call Safepay"); };
  const request = makeRequest(WORKER_ORIGIN + "/api/support/create-checkout", {
    method: "POST",
    origin: "https://attacker.example",
    body: { amount: 5 }
  });
  const response = await supportWorker.fetch(request, env);
  const body = await response.json();
  assert.equal(response.status, 403);
  assert.equal(body.error, "origin_not_allowed");
  assert.equal(fetchCalls, 0);
});


test("production Support deployment is manual-only and cannot activate on push", () => {
  const workflow = readFileSync(new URL("../.github/workflows/deploy-support-payments-production.yml", import.meta.url), "utf8");
  const triggerBlock = workflow.split("\npermissions:")[0];
  assert.match(triggerBlock, /on:[\s\S]*workflow_dispatch:/);
  assert.doesNotMatch(triggerBlock, /^\s+push:/m, "pushing or merging code must not deploy/activate the production Support Worker");
  assert.doesNotMatch(triggerBlock, /^\s+pull_request:/m, "opening or updating a PR must not deploy/activate the production Support Worker");
});
