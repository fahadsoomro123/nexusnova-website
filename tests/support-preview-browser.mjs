import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE_DIR || "playwright");

const PREVIEW_URL = process.env.SUPPORT_PREVIEW_URL;
if (!PREVIEW_URL) throw new Error("SUPPORT_PREVIEW_URL is required");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(root, "artifacts", "support-preview-browser-qa");
await mkdir(outputDir, { recursive: true });

const report = { preview: new URL(PREVIEW_URL).origin, captures: [], checks: [] };
const launchOptions = { headless: true };
if (process.env.CHROME_EXECUTABLE) launchOptions.executablePath = process.env.CHROME_EXECUTABLE;
const browser = await chromium.launch(launchOptions);

function check(name, condition, details = {}) {
  report.checks.push({ name, passed: Boolean(condition), ...details });
  assert.ok(condition, name + (Object.keys(details).length ? " :: " + JSON.stringify(details) : ""));
}

async function openPreview(viewport, name) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  page.setDefaultTimeout(20_000);
  const errors = [];
  page.on("pageerror", error => errors.push(String(error.message).slice(0, 240)));
  const response = await page.goto(PREVIEW_URL, { waitUntil: "domcontentloaded", timeout: 60_000 });
  check(name + ": preview document loads", Boolean(response && response.ok()), {
    status: response?.status() ?? null
  });
  await page.waitForSelector(".nn-support-host [data-nexusnova-support]", { timeout: 30_000 });
  await page.waitForFunction(() => window.__nexusnovaSupportReady === true, { timeout: 15_000 });
  await page.screenshot({ path: path.join(outputDir, name + ".png"), fullPage: false });
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
      host: rect(host),
      support: rect(support),
      nav: rect(document.querySelector(".nn-header .nn-nav")),
      buttons: buttons.map(button => ({ label: button.getAttribute("aria-label"), ...rect(button), visible: !!(button.offsetWidth || button.offsetHeight) })),
      errorText: document.querySelector("[data-support-feedback]")?.textContent || "",
      overflowers,
      pageErrors: errors
    };
  });
  await writeFile(path.join(outputDir, name + ".json"), JSON.stringify(metrics, null, 2));
  report.captures.push(name + ".png");
  check(name + ": dedicated support row spans the header width", metrics.host && metrics.host.width >= viewport.width - 100, { host: metrics.host, viewport: metrics.viewport });
  check(name + ": support controls have usable width", metrics.support && metrics.support.width >= (viewport.width < 761 ? viewport.width - 55 : 280), { support: metrics.support });
  check(name + ": exactly four visible amount buttons", metrics.buttons.length === 4 && metrics.buttons.every(button => button.visible && button.width >= 28 && button.height >= 22), { buttons: metrics.buttons });
  check(name + ": controls stay inside their host", metrics.support && metrics.support.x >= metrics.host.x - 1 && metrics.support.right <= metrics.host.right + 1, { host: metrics.host, support: metrics.support });
  check(name + ": no horizontal viewport overflow", metrics.document.scrollWidth <= metrics.viewport.width + 1 && metrics.document.bodyScrollWidth <= metrics.viewport.width + 1, { document: metrics.document, viewport: metrics.viewport, overflowers: metrics.overflowers });
  check(name + ": no browser runtime exceptions", metrics.pageErrors.length === 0, { pageErrors: metrics.pageErrors });
  return { page, metrics };
}

let exitCode = 0;
try {
  const desktop = await openPreview({ width: 1366, height: 900 }, "homepage-desktop");
  const postPromise = desktop.page.waitForResponse(response =>
    response.request().method() === "POST" &&
    new URL(response.url()).pathname === "/api/support/create-checkout",
    { timeout: 30_000 }
  );
  await desktop.page.getByRole("button", { name: "Support with $5" }).click({ timeout: 15_000 });
  const postResponse = await postPromise;
  const payload = await postResponse.json();
  check("desktop: $5 click returns HTTP 200", postResponse.status() === 200, { status: postResponse.status() });
  check("desktop: API returns a sandbox USD $5 checkout", payload.ok === true && payload.amount === 5 && payload.currency === "USD" && payload.environment === "sandbox", {
    ok: payload.ok, amount: payload.amount, currency: payload.currency, environment: payload.environment
  });
  const checkout = new URL(payload.checkout_url);
  check("desktop: checkout uses the expected Safepay sandbox host", checkout.protocol === "https:" && checkout.hostname === "sandbox.api.getsafepay.com" && Boolean(checkout.searchParams.get("tracker")) && Boolean(checkout.searchParams.get("tbt")), {
    protocol: checkout.protocol, hostname: checkout.hostname, hasTracker: Boolean(checkout.searchParams.get("tracker")), hasTbt: Boolean(checkout.searchParams.get("tbt"))
  });
  await desktop.page.waitForURL(url => url.hostname === "sandbox.api.getsafepay.com", { timeout: 20_000, waitUntil: "domcontentloaded" });
  await desktop.page.screenshot({ path: path.join(outputDir, "safepay-sandbox-checkout.png"), fullPage: false });
  report.captures.push("safepay-sandbox-checkout.png");
  await desktop.page.close();

  const successUrl = new URL(checkout.searchParams.get("redirect_url"));
  successUrl.searchParams.set("tracker", checkout.searchParams.get("tracker"));
  successUrl.searchParams.set("order_id", checkout.searchParams.get("order_id"));
  const successPage = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  const statusPromise = successPage.waitForResponse(response =>
    response.request().method() === "GET" &&
    new URL(response.url()).pathname === "/api/support/payment-status",
    { timeout: 30_000 }
  );
  const successResponse = await successPage.goto(successUrl.href, { waitUntil: "domcontentloaded", timeout: 60_000 });
  check("success return: page loads", Boolean(successResponse && successResponse.ok()), { status: successResponse?.status() ?? null });
  const statusResponse = await statusPromise;
  const statusPayload = await statusResponse.json();
  check("success return: unpaid sandbox session is not falsely marked paid", statusResponse.status() === 200 && statusPayload.ok === true && statusPayload.paid === false, {
    status: statusResponse.status(), ok: statusPayload.ok, paid: statusPayload.paid, verification: statusPayload.verification ?? null
  });
  await successPage.getByText("No success recorded", { exact: true }).waitFor({ timeout: 20_000 });
  await successPage.screenshot({ path: path.join(outputDir, "payment-status-unpaid.png"), fullPage: false });
  report.captures.push("payment-status-unpaid.png");
  await successPage.close();

  const cancelURL = checkout.searchParams.get("cancel_url");
  const cancelPage = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  const cancelResponse = await cancelPage.goto(cancelURL, { waitUntil: "domcontentloaded", timeout: 60_000 });
  check("cancellation return: page loads", Boolean(cancelResponse && cancelResponse.ok()), { status: cancelResponse?.status() ?? null });
  await cancelPage.getByRole("heading", { name: "Sandbox checkout cancelled." }).waitFor({ timeout: 15_000 });
  await cancelPage.screenshot({ path: path.join(outputDir, "payment-cancelled.png"), fullPage: false });
  report.captures.push("payment-cancelled.png");
  await cancelPage.close();

  const mobile = await openPreview({ width: 390, height: 844 }, "homepage-mobile");
  await mobile.page.close();
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  exitCode = 1;
  report.error = String(error?.stack || error).slice(0, 5000);
  console.error(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
  await writeFile(path.join(outputDir, "report.json"), JSON.stringify(report, null, 2));
}
if (exitCode) process.exitCode = exitCode;
