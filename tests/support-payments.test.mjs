import test from "node:test";
import assert from "node:assert/strict";
import { onRequestPost } from "../functions/api/support/create-checkout.js";
import { onRequestGet } from "../functions/api/support/payment-status.js";

const ORIGIN = "https://nexusnovatools.com";
const PUBLIC_KEY = "sec_test_support_key";
const SECRET_KEY = "test-only-support-secret-not-a-real-key";
const TRACKER = "track_12345678-abcd-4321-abcd-123456789abc";
const env = {
  CF_PAGES_BRANCH: "nexusnova-support-production",
  SAFEPAY_ENV: "sandbox",
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
  const request = makeRequest(ORIGIN + "/api/support/create-checkout", {
    method: "POST",
    ip,
    body: { amount }
  });
  const response = await onRequestPost({ request, env: runtimeEnv });
  return { response, data: await response.json() };
}

test("creates an allowlisted USD support checkout and signed return reference", async (t) => {
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

  const redirect = new URL(checkout.searchParams.get("redirect_url"));
  assert.equal(redirect.origin + redirect.pathname, ORIGIN + "/support-payment-success.html");
  const reference = redirect.searchParams.get("support_ref");
  assert.ok(reference);
  assert.equal(reference.split(".").length, 2);
  assert.equal(calls[0].init.headers.get("x-sfpy-merchant-secret"), SECRET_KEY);
  assert.equal(JSON.parse(calls[0].init.body).amount, 500);
  assert.equal(JSON.parse(calls[0].init.body).currency, "USD");
  assert.equal(JSON.parse(calls[0].init.body).metadata.source, "nexusnova-support");
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
  const { response, data } = await createCheckout(5, {
    ...env,
    CF_PAGES_BRANCH: "main",
    SAFEPAY_ENV: "sandbox"
  });
  assert.equal(response.status, 503);
  assert.equal(data.error, "production_checkout_not_enabled");
  assert.equal(fetchCalls, 0);
});

test("only confirms a matching signed support tracker, merchant, amount and paid state", async (t) => {
  t.after(() => { globalThis.fetch = originalFetch; });
  mockSafepay({ state: "TRACKER_ENDED", amount: 500 });
  const created = await createCheckout(5);
  assert.equal(created.response.status, 200);
  const checkout = new URL(created.data.checkout_url);
  const tracker = checkout.searchParams.get("tracker");
  const supportRef = new URL(checkout.searchParams.get("redirect_url")).searchParams.get("support_ref");

  globalThis.fetch = async (input) => {
    assert.match(String(input), new RegExp("/reporter/api/v1/payments/" + TRACKER));
    return Response.json({ data: { tracker: {
      token: TRACKER,
      client: PUBLIC_KEY,
      state: "TRACKER_ENDED",
      purchase_totals: { quote_amount: { amount: 500, currency: "USD" } }
    } } });
  };
  const request = makeRequest(ORIGIN + "/api/support/payment-status?tracker=" +
    encodeURIComponent(tracker) + "&support_ref=" + encodeURIComponent(supportRef));
  const result = await onRequestGet({ request, env });
  const body = await result.json();
  assert.equal(result.status, 200);
  assert.equal(body.paid, true);
  assert.equal(body.order_id.startsWith("NN-SUP-"), true);
  assert.equal(body.amount, 5);
  assert.equal(body.currency, "USD");
});

test("does not confirm a payment when the returned amount differs from the signed amount", async (t) => {
  t.after(() => { globalThis.fetch = originalFetch; });
  mockSafepay({ state: "TRACKER_ENDED", amount: 500 });
  const created = await createCheckout(5);
  const checkout = new URL(created.data.checkout_url);
  const tracker = checkout.searchParams.get("tracker");
  const supportRef = new URL(checkout.searchParams.get("redirect_url")).searchParams.get("support_ref");

  globalThis.fetch = async () => Response.json({ data: { tracker: {
    token: TRACKER,
    client: PUBLIC_KEY,
    state: "TRACKER_ENDED",
    purchase_totals: { quote_amount: { amount: 300, currency: "USD" } }
  } } });
  const request = makeRequest(ORIGIN + "/api/support/payment-status?tracker=" +
    encodeURIComponent(tracker) + "&support_ref=" + encodeURIComponent(supportRef));
  const result = await onRequestGet({ request, env });
  const body = await result.json();
  assert.equal(result.status, 200);
  assert.equal(body.paid, false);
});

test("rejects a tampered signed support reference before asking Safepay", async (t) => {
  t.after(() => { globalThis.fetch = originalFetch; });
  mockSafepay();
  const created = await createCheckout(5);
  const checkout = new URL(created.data.checkout_url);
  const tracker = checkout.searchParams.get("tracker");
  const genuine = new URL(checkout.searchParams.get("redirect_url")).searchParams.get("support_ref");
  const [payload, signature] = genuine.split(".");
  const tampered = (payload.slice(0, -1) + (payload.endsWith("A") ? "B" : "A")) + "." + signature;

  let reporterCalls = 0;
  globalThis.fetch = async (input) => {
    if (String(input).includes("/reporter/api/")) reporterCalls++;
    throw new Error("tampered reference must be rejected before Reporter lookup");
  };
  const request = makeRequest(ORIGIN + "/api/support/payment-status?tracker=" +
    encodeURIComponent(tracker) + "&support_ref=" + encodeURIComponent(tampered));
  const response = await onRequestGet({ request, env });
  const body = await response.json();
  assert.equal(response.status, 403);
  assert.equal(body.error, "invalid_support_reference");
  assert.equal(reporterCalls, 0);
});

test("rejects unsupported origins", async (t) => {
  t.after(() => { globalThis.fetch = originalFetch; });
  let fetchCalls = 0;
  globalThis.fetch = async () => { fetchCalls++; throw new Error("must not call Safepay"); };
  const request = makeRequest(ORIGIN + "/api/support/create-checkout", {
    method: "POST",
    origin: "https://attacker.example",
    body: { amount: 5 }
  });
  const response = await onRequestPost({ request, env });
  const body = await response.json();
  assert.equal(response.status, 403);
  assert.equal(body.error, "origin_not_allowed");
  assert.equal(fetchCalls, 0);
});
