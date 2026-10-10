import assert from "node:assert/strict";
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE_DIR || "playwright");
const WORKER_URL = (process.env.SUPPORT_WORKER_URL || "").replace(/\/+$/, "");
if (!/^https:\/\/[a-z0-9-]+(?:\.[a-z0-9-]+)?\.workers\.dev$/i.test(WORKER_URL)) {
  throw new Error("SUPPORT_WORKER_URL must point to the isolated HTTPS workers.dev sandbox only");
}
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(root, "artifacts", "support-preview-browser-qa");
await fs.mkdir(outputDir, { recursive: true });

const report = { worker: new URL(WORKER_URL).host, mode: "local source render + real sandbox API proxy", captures: [], checks: [] };
const allowedAmounts = new Set([3, 5, 10, 25]);
const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon"
};

function check(name, condition, details = {}) {
  report.checks.push({ name, passed: Boolean(condition), ...details });
  assert.ok(condition, name + (Object.keys(details).length ? " :: " + JSON.stringify(details) : ""));
}
function respond(res, status, type, body) {
  res.writeHead(status, { "content-type": type, "cache-control": "no-store", "x-content-type-options": "nosniff" });
  res.end(body);
}
async function readRequest(req, limit = 8192) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new Error("request_body_too_large");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
async function proxyToSandbox(req, res, url) {
  const method = req.method || "GET";
  if (method === "POST" && url.pathname === "/api/support/create-checkout") {
    const rawBody = await readRequest(req);
    let payload;
    try { payload = JSON.parse(rawBody.toString("utf8")); }
    catch { return respond(res, 400, "application/json; charset=utf-8", JSON.stringify({ ok: false, error: "invalid_json" })); }
    if (!Number.isInteger(payload?.amount) || !allowedAmounts.has(payload.amount)) {
      return respond(res, 400, "application/json; charset=utf-8", JSON.stringify({ ok: false, error: "invalid_support_amount" }));
    }
    const upstream = await fetch(WORKER_URL + url.pathname, {
      method: "POST",
      headers: { "content-type": "application/json", "origin": "https://raw.githack.com" },
      body: JSON.stringify({ amount: payload.amount })
    });
    return respond(res, upstream.status, upstream.headers.get("content-type") || "application/json; charset=utf-8", await upstream.text());
  }
  if (method === "GET" && url.pathname === "/api/support/payment-status") {
    const upstream = await fetch(WORKER_URL + url.pathname + url.search, {
      method: "GET",
      headers: { "origin": "https://raw.githack.com" }
    });
    return respond(res, upstream.status, upstream.headers.get("content-type") || "application/json; charset=utf-8", await upstream.text());
  }
  return respond(res, 404, "application/json; charset=utf-8", JSON.stringify({ ok: false, error: "not_found" }));
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    if (url.pathname === "/api/support/create-checkout" || url.pathname === "/api/support/payment-status") {
      await proxyToSandbox(req, res, url);
      return;
    }
    if (url.pathname === "/assets/js/nexusnova-support-preview-config.js") {
      respond(res, 200, "text/javascript; charset=utf-8",
        "window.NEXUSNOVA_SUPPORT_API_BASE = " + JSON.stringify(WORKER_URL) + ";\n");
      return;
    }
    const requested = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
    const filePath = path.resolve(root, "." + requested);
    if (filePath !== root && !filePath.startsWith(root + path.sep)) {
      respond(res, 403, "text/plain; charset=utf-8", "Forbidden");
      return;
    }
    const body = await fs.readFile(filePath);
    respond(res, 200, mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream", body);
  } catch (error) {
    respond(res, error?.code === "ENOENT" ? 404 : 500, "text/plain; charset=utf-8",
      error?.code === "ENOENT" ? "Not found" : "Local preview server error");
  }
});
await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", resolve);
});
const address = server.address();
const localBase = "http://127.0.0.1:" + address.port;
report.localBase = localBase;

const launchOptions = { headless: true };
if (process.env.CHROME_EXECUTABLE) launchOptions.executablePath = process.env.CHROME_EXECUTABLE;
const browser = await chromium.launch(launchOptions);

async function inspectViewport(viewport, name) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  page.setDefaultTimeout(20_000);
  const pageErrors = [];
  const failedRequests = [];
  page.on("pageerror", error => pageErrors.push(String(error.message).slice(0, 240)));
  page.on("requestfailed", request => failedRequests.push({ url: request.url(), error: request.failure()?.errorText || "unknown" }));
  const response = await page.goto(localBase + "/", { waitUntil: "domcontentloaded", timeout: 60_000 });
  check(name + ": local source page loads", Boolean(response && response.ok()), { status: response?.status() ?? null });
  try {
    await page.waitForSelector(".nn-support-host [data-nexusnova-support]", { timeout: 15_000 });
    await page.waitForFunction(() => window.__nexusnovaSupportReady === true, { timeout: 5_000 });
  } catch (error) {
    await page.screenshot({ path: path.join(outputDir, name + "-support-missing.png"), fullPage: false });
    report.captures.push(name + "-support-missing.png");
    const state = await page.evaluate(() => ({
      url: location.href,
      title: document.title,
      body: document.body.innerText.slice(0, 800),
      scripts: Array.from(document.scripts).map(s => s.src || "[inline]"),
      hasHeader: !!document.querySelector(".nn-header"),
      hasNav: !!document.querySelector(".nn-header .nn-nav"),
      hasSupportHost: !!document.querySelector(".nn-support-host")
    }));
    throw new Error(name + ": Support did not mount: " + JSON.stringify({ state, pageErrors, failedRequests, cause: String(error) }).slice(0, 4500));
  }
  await page.screenshot({ path: path.join(outputDir, name + ".png"), fullPage: false });
  report.captures.push(name + ".png");
  const metrics = await page.evaluate(() => {
    const rect = element => {
      if (!element) return null;
      const r = element.getBoundingClientRect();
      return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height), right: Math.round(r.right), bottom: Math.round(r.bottom) };
    };
    const host = document.querySelector(".nn-support-host");
    const support = host?.querySelector("[data-nexusnova-support]");
    const buttons = Array.from(support?.querySelectorAll("[data-support-amount]") || []);
    const overflowers = Array.from(document.querySelectorAll("body *"))
      .map(element => ({ tag: element.tagName.toLowerCase(), cls: typeof element.className === "string" ? element.className.slice(0, 90) : "", right: Math.round(element.getBoundingClientRect().right), width: Math.round(element.getBoundingClientRect().width) }))
      .filter(element => element.right > window.innerWidth + 1 && element.width > 0)
      .sort((a, b) => b.right - a.right)
      .slice(0, 8);
    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      document: { clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth, bodyScrollWidth: document.body.scrollWidth },
      host: rect(host), support: rect(support), nav: rect(document.querySelector(".nn-header .nn-nav")),
      buttons: buttons.map(button => ({ label: button.getAttribute("aria-label"), ...rect(button), visible: !!(button.offsetWidth || button.offsetHeight) })),
      pageErrors, failedRequests, overflowers
    };
  });
  await fs.writeFile(path.join(outputDir, name + ".json"), JSON.stringify(metrics, null, 2));
  check(name + ": dedicated support host spans header width", metrics.host && metrics.host.width >= viewport.width - 100, { host: metrics.host, viewport: metrics.viewport });
  check(name + ": support controls have usable width", metrics.support && metrics.support.width >= (viewport.width < 761 ? viewport.width - 55 : 280), { support: metrics.support });
  check(name + ": four visible amount buttons", metrics.buttons.length === 4 && metrics.buttons.every(button => button.visible && button.width >= 28 && button.height >= 22), { buttons: metrics.buttons });
  check(name + ": support fits inside host", metrics.support && metrics.support.x >= metrics.host.x - 1 && metrics.support.right <= metrics.host.right + 1, { host: metrics.host, support: metrics.support });
  check(name + ": no horizontal overflow", metrics.document.scrollWidth <= metrics.viewport.width + 1 && metrics.document.bodyScrollWidth <= metrics.viewport.width + 1, { document: metrics.document, viewport: metrics.viewport, overflowers: metrics.overflowers });
  check(name + ": no page runtime exceptions", metrics.pageErrors.length === 0, { pageErrors: metrics.pageErrors });
  return page;
}

let exitCode = 0;
try {
  const healthResponse = await fetch(WORKER_URL + "/health");
  const health = await healthResponse.json();
  check("sandbox Worker health/config is ready", healthResponse.ok && health.ok === true && health.enabled === true && health.environment === "sandbox" && health.credentials === "configured", {
    status: healthResponse.status, environment: health.environment, enabled: health.enabled, credentials: health.credentials
  });

  const desktop = await inspectViewport({ width: 1366, height: 900 }, "homepage-desktop");
  await desktop.route("https://sandbox.api.getsafepay.com/**", async route => {
    const target = route.request().url();
    report.interceptedCheckoutUrl = target;
    await route.fulfill({
      status: 200,
      contentType: "text/html; charset=utf-8",
      body: "<!doctype html><html><head><meta charset='utf-8'><title>Safepay sandbox destination captured</title></head><body><h1>Safepay sandbox checkout destination captured</h1><p>Automated QA does not submit a payment instrument.</p></body></html>"
    });
  });
  const responsePromise = desktop.waitForResponse(response =>
    response.request().method() === "POST" && new URL(response.url()).pathname === "/api/support/create-checkout",
    { timeout: 30_000 }
  );
  await desktop.getByRole("button", { name: "Support with $5" }).click({ timeout: 15_000 });
  const apiResponse = await responsePromise;
  const payload = await apiResponse.json();
  check("desktop: $5 click completes live sandbox session request", apiResponse.status() === 200, { status: apiResponse.status() });
  check("desktop: checkout session matches USD $5 sandbox request", payload.ok === true && payload.amount === 5 && payload.currency === "USD" && payload.environment === "sandbox", {
    ok: payload.ok, amount: payload.amount, currency: payload.currency, environment: payload.environment
  });
  const checkout = new URL(payload.checkout_url);
  check("desktop: checkout redirects to Safepay sandbox", checkout.protocol === "https:" && checkout.hostname === "sandbox.api.getsafepay.com" && Boolean(checkout.searchParams.get("tracker")) && Boolean(checkout.searchParams.get("tbt")), {
    protocol: checkout.protocol, hostname: checkout.hostname, hasTracker: Boolean(checkout.searchParams.get("tracker")), hasTbt: Boolean(checkout.searchParams.get("tbt"))
  });
  await desktop.waitForURL(url => url.hostname === "sandbox.api.getsafepay.com", { timeout: 20_000, waitUntil: "domcontentloaded" });
  await desktop.screenshot({ path: path.join(outputDir, "safepay-sandbox-destination.png"), fullPage: false });
  report.captures.push("safepay-sandbox-destination.png");
  await desktop.close();

  // Validate the return-page UI using an explicit unpaid fixture, then separately call the real status API below.
  const successPage = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  await successPage.route("**/api/support/payment-status**", async route => {
    const url = new URL(route.request().url());
    await route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify({ ok: true, paid: false, state: "PENDING", tracker: url.searchParams.get("tracker"), order_id: url.searchParams.get("order_id"), amount: 5, currency: "USD", environment: "sandbox", verification: "payment_not_confirmed" })
    });
  });
  const successLocalUrl = new URL("/support-payment-success-preview.html", localBase);
  successLocalUrl.searchParams.set("tracker", checkout.searchParams.get("tracker"));
  successLocalUrl.searchParams.set("order_id", checkout.searchParams.get("order_id"));
  const successResponse = await successPage.goto(successLocalUrl.href, { waitUntil: "domcontentloaded", timeout: 60_000 });
  check("success return: page loads", Boolean(successResponse && successResponse.ok()), { status: successResponse?.status() ?? null });
  await successPage.getByText("No success recorded", { exact: true }).waitFor({ timeout: 15_000 });
  check("success return: pending fixture never claims payment success", (await successPage.locator("#title").innerText()) === "Payment status not confirmed.", { title: await successPage.locator("#title").innerText() });
  await successPage.screenshot({ path: path.join(outputDir, "payment-status-pending.png"), fullPage: false });
  report.captures.push("payment-status-pending.png");
  await successPage.close();

  const cancelPage = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  const cancelResponse = await cancelPage.goto(new URL("/support-payment-cancelled-preview.html", localBase).href, { waitUntil: "domcontentloaded", timeout: 60_000 });
  check("cancel return: page loads", Boolean(cancelResponse && cancelResponse.ok()), { status: cancelResponse?.status() ?? null });
  await cancelPage.getByRole("heading", { name: "Sandbox checkout cancelled." }).waitFor({ timeout: 15_000 });
  await cancelPage.screenshot({ path: path.join(outputDir, "payment-cancelled.png"), fullPage: false });
  report.captures.push("payment-cancelled.png");
  await cancelPage.close();

  const mobile = await inspectViewport({ width: 390, height: 844 }, "homepage-mobile");
  await mobile.close();

  // Live status smoke for the new unpaid tracker. A failed lookup must fail closed and must never return paid=true.
  const liveStatusUrl = new URL(WORKER_URL + "/api/support/payment-status");
  liveStatusUrl.searchParams.set("tracker", checkout.searchParams.get("tracker"));
  liveStatusUrl.searchParams.set("order_id", checkout.searchParams.get("order_id"));
  const liveStatusResponse = await fetch(liveStatusUrl, { headers: { origin: "https://raw.githack.com" } });
  let liveStatus = {};
  try { liveStatus = await liveStatusResponse.json(); } catch {}
  check("live status smoke does not falsely mark the unpaid session as paid", liveStatus.paid !== true, {
    status: liveStatusResponse.status, ok: liveStatus.ok ?? false, paid: liveStatus.paid ?? false, error: liveStatus.error ?? null, verification: liveStatus.verification ?? null
  });

  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  exitCode = 1;
  report.error = String(error?.stack || error).slice(0, 6000);
  console.error(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
  await fs.writeFile(path.join(outputDir, "report.json"), JSON.stringify(report, null, 2));
}
if (exitCode) process.exitCode = 1;
