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
    const navElement = document.querySelector(".nn-header .nn-nav");
    const navLinks = Array.from(navElement?.querySelectorAll("a") || []).map(link => {
      const r = link.getBoundingClientRect();
      return {
        text: link.textContent.trim(),
        x: Math.round(r.x),
        right: Math.round(r.right),
        width: Math.round(r.width),
        clientWidth: link.clientWidth,
        scrollWidth: link.scrollWidth
      };
    });
    const buttons = Array.from(support?.querySelectorAll("[data-support-amount]") || []);
    const overflowers = Array.from(document.querySelectorAll("body *"))
      .map(element => ({ tag: element.tagName.toLowerCase(), cls: typeof element.className === "string" ? element.className.slice(0, 90) : "", right: Math.round(element.getBoundingClientRect().right), width: Math.round(element.getBoundingClientRect().width) }))
      .filter(element => element.right > window.innerWidth + 1 && element.width > 0)
      .sort((a, b) => b.right - a.right)
      .slice(0, 8);
    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      document: { clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth, bodyScrollWidth: document.body.scrollWidth },
      host: rect(host), support: rect(support), nav: rect(navElement),
      navMetrics: {
        clientWidth: navElement?.clientWidth ?? 0,
        scrollWidth: navElement?.scrollWidth ?? 0,
        links: navLinks
      },
      buttons: buttons.map(button => ({ label: button.getAttribute("aria-label"), ...rect(button), visible: !!(button.offsetWidth || button.offsetHeight) })),
      overflowers
    };
  });
  metrics.pageErrors = pageErrors;
  metrics.failedRequests = failedRequests;
  await fs.writeFile(path.join(outputDir, name + ".json"), JSON.stringify(metrics, null, 2));
  check(name + ": dedicated support host spans header width", metrics.host && metrics.host.width >= viewport.width - 100, { host: metrics.host, viewport: metrics.viewport });
  check(name + ": support controls have usable width", metrics.support && metrics.support.width >= (viewport.width < 761 ? viewport.width - 55 : 280), { support: metrics.support });
  check(name + ": four visible amount buttons", metrics.buttons.length === 4 && metrics.buttons.every(button => button.visible && button.width >= 28 && button.height >= 22), { buttons: metrics.buttons });
  check(name + ": all navigation links remain visible and uncut", metrics.navMetrics.links.length === 6 &&
    metrics.navMetrics.scrollWidth <= metrics.navMetrics.clientWidth + 1 &&
    metrics.navMetrics.links.every(link => link.right <= metrics.viewport.width + 1 && link.scrollWidth <= link.clientWidth + 2),
    { navMetrics: metrics.navMetrics, viewport: metrics.viewport });
  check(name + ": support fits inside host", metrics.support && metrics.support.x >= metrics.host.x - 1 && metrics.support.right <= metrics.host.right + 1, { host: metrics.host, support: metrics.support });
  check(name + ": no horizontal overflow", metrics.document.scrollWidth <= metrics.viewport.width + 1 && metrics.document.bodyScrollWidth <= metrics.viewport.width + 1, { document: metrics.document, viewport: metrics.viewport, overflowers: metrics.overflowers });
  check(name + ": no page runtime exceptions", metrics.pageErrors.length === 0, { pageErrors: metrics.pageErrors });
  return page;
}

async function installReturnPageRoutes(page) {
  for (const filename of ["support-payment-success-preview.html", "support-payment-cancelled-preview.html"]) {
    await page.route("**/" + filename + "**", async route => {
      const requestUrl = new URL(route.request().url());
      if (requestUrl.hostname !== "raw.githack.com" || !requestUrl.pathname.endsWith("/" + filename)) {
        await route.continue();
        return;
      }
      let html = await fs.readFile(path.join(root, filename), "utf8");
      html = html.replace(/<head>/i, '<head><base href="' + localBase + '/">');
      await route.fulfill({
        status: 200,
        contentType: "text/html; charset=utf-8",
        headers: { "cache-control": "no-store" },
        body: html
      });
      report.returnRoutesIntercepted = report.returnRoutesIntercepted || [];
      report.returnRoutesIntercepted.push(filename);
    });
  }
}

async function visibleControls(page) {
  const output = [];
  for (const frame of page.frames()) {
    let elements;
    try { elements = frame.locator("input:visible, textarea:visible, select:visible, button:visible, [role=button]:visible"); }
    catch { continue; }
    const count = await elements.count().catch(() => 0);
    for (let i = 0; i < count; i++) {
      const locator = elements.nth(i);
      const details = await locator.evaluate(element => {
        const labels = Array.from(element.labels || []).map(label => label.innerText || label.textContent || "").join(" ");
        const parentText = element.closest("label")?.innerText || element.parentElement?.innerText || "";
        return {
          tag: element.tagName.toLowerCase(),
          type: element.getAttribute("type") || "",
          name: element.getAttribute("name") || "",
          id: element.id || "",
          placeholder: element.getAttribute("placeholder") || "",
          ariaLabel: element.getAttribute("aria-label") || "",
          autocomplete: element.getAttribute("autocomplete") || "",
          labels: labels.slice(0, 120),
          parentText: parentText.trim().replace(/\s+/g, " ").slice(0, 180),
          text: (element.innerText || element.getAttribute("value") || element.getAttribute("aria-label") || "").trim().replace(/\s+/g, " ").slice(0, 100),
          disabled: Boolean(element.disabled),
          options: element.tagName.toLowerCase() === "select" ? Array.from(element.options).map(option => ({ label: option.textContent.trim(), value: option.value })) : []
        };
      }).catch(() => null);
      if (details) output.push({ frame, locator, details, descriptor: Object.values(details).filter(value => typeof value === "string").join(" ").toLowerCase() });
    }
  }
  return output;
}

async function fillField(page, pattern, value, { required = true } = {}) {
  const controls = await visibleControls(page);
  const candidate = controls.find(control =>
    ["input", "textarea", "select"].includes(control.details.tag) &&
    pattern.test(control.descriptor) &&
    !control.details.disabled
  );
  if (!candidate) {
    if (!required) return false;
    throw new Error("Required checkout input not found: " + pattern + " :: " + JSON.stringify(controls.map(control => control.details)).slice(0, 4000));
  }
  if (candidate.details.tag === "select") {
    const option = candidate.details.options.find(item => /pakistan/i.test(item.label) || /^pk$/i.test(item.value));
    if (option) await candidate.locator.selectOption(option.value);
    else if (required) throw new Error("Pakistan billing country option missing");
  } else {
    await candidate.locator.fill(value);
  }
  return candidate.locator;
}

async function clickCheckoutAction(page, pattern) {
  const controls = await visibleControls(page);
  const candidate = controls.find(control =>
    ["button"].includes(control.details.tag) &&
    !control.details.disabled &&
    pattern.test(control.details.text || control.details.ariaLabel) &&
    !/cancel|google pay|terms|privacy|save card/i.test(control.details.text + " " + control.details.ariaLabel)
  );
  if (!candidate) throw new Error("Checkout action not found: " + pattern + " :: " + JSON.stringify(controls.map(control => control.details)).slice(0, 4000));
  await candidate.locator.click({ timeout: 15_000 });
  return candidate.details.text || candidate.details.ariaLabel;
}

async function snapshotCheckout(page, stage) {
  const controls = await visibleControls(page);
  const state = {
    stage,
    url: page.url(),
    hostname: new URL(page.url()).hostname,
    title: await page.title().catch(() => ""),
    bodyText: (await page.locator("body").innerText().catch(() => "")).trim().replace(/\s+/g, " ").slice(0, 900),
    frameText: (await Promise.all(page.frames().map(frame => frame.locator("body").innerText().catch(() => "")))).join(" ").replace(/\s+/g, " ").slice(0, 1600),
    controls: controls.map(control => control.details)
  };
  report.sandboxPaymentSteps = report.sandboxPaymentSteps || [];
  report.sandboxPaymentSteps.push(state);
  await fs.writeFile(path.join(outputDir, "checkout-step-" + stage + ".json"), JSON.stringify(state, null, 2));
  return { state, controls };
}

async function handleThreeDSIfShown(page, state, controls) {
  if (!/3.?d secure|payer authentication|authentication emulator|one.time passcode|otp/i.test(state.bodyText + " " + (state.frameText || "") + " " + state.url)) return false;
  report.threeDSDetected = true;
  const otp = controls.find(control => ["input"].includes(control.details.tag) && /otp|one.time|authentication code|verification code/i.test(control.descriptor));
  if (otp) {
    await otp.locator.fill("123456");
    await clickCheckoutAction(page, /verify|authenticate|confirm|continue|submit/i);
    return true;
  }
  const successChoice = controls.find(control =>
    ["button"].includes(control.details.tag) &&
    /successful authentication|authenticate successfully|approve payment|confirm authentication/i.test(control.details.text + " " + control.details.ariaLabel) &&
    !/failure|cancel|decline/i.test(control.details.text + " " + control.details.ariaLabel)
  );
  if (successChoice) {
    await successChoice.locator.click({ timeout: 15_000 });
    return true;
  }
  // Some Safepay emulators use labeled radios to choose a 3DS outcome.
  for (const frame of page.frames()) {
    for (const selector of ['label:visible', '[role=radio]:visible', 'input[type=radio]:visible']) {
      const list = frame.locator(selector);
      const count = await list.count().catch(() => 0);
      for (let i = 0; i < count; i++) {
        const item = list.nth(i);
        const label = (await item.innerText().catch(() => "")) + " " + (await item.getAttribute("aria-label").catch(() => "") || "");
        if (/successful authentication|authentication successful|approve/i.test(label) && !/failure|decline|cancel/i.test(label)) {
          await item.click({ timeout: 15_000 });
          await clickCheckoutAction(page, /continue|confirm|authenticate|submit|complete/i);
          return true;
        }
      }
    }
  }
  throw new Error("Safepay 3DS emulator shown but no explicit successful test-authentication action was found: " + JSON.stringify(state).slice(0, 3000));
}

async function completeSandboxCardPayment(page, amount) {
  const email = "nexusnova-sandbox-" + Date.now() + "@example.com";
  let phoneFilled = false;
  const emailInput = await fillField(page, /type email|email address|email/i, email);
  await emailInput.press("Tab").catch(() => {});
  await page.waitForTimeout(500);
  // Safepay lazily loads the phone-country options; wait for Pakistan to appear before selecting it.
  let countrySelect = null;
  let pakistan = null;
  let controlsBeforePhone = [];
  for (let attempt = 0; attempt < 14; attempt++) {
    controlsBeforePhone = await visibleControls(page);
    countrySelect = controlsBeforePhone.find(control =>
      control.details.tag === "select" &&
      control.details.options.some(option => /pakistan/i.test(option.label) || /^pk$/i.test(option.value))
    );
    if (countrySelect) {
      pakistan = countrySelect.details.options.find(option => /pakistan/i.test(option.label) || /^pk$/i.test(option.value));
      break;
    }
    await page.waitForTimeout(500);
  }
  if (!countrySelect || !pakistan) {
    const selects = controlsBeforePhone.filter(control => control.details.tag === "select").map(control => ({
      label: control.details.labels,
      optionCount: control.details.options.length,
      lastOptions: control.details.options.slice(-5)
    }));
    throw new Error("Safepay phone country selector did not load Pakistan option: " + JSON.stringify(selects).slice(0, 3000));
  }
  await countrySelect.locator.selectOption(pakistan.value);
  const phoneInput = await fillField(page, /mobile phone number|phone number|contact number|\\btel\\b/i, "3021111111");
  await phoneInput.press("Tab").catch(() => {});
  phoneFilled = true;
  await page.waitForTimeout(900);
  let payEnabled = false;
  for (let attempt = 0; attempt < 8; attempt++) {
    const now = await visibleControls(page);
    const payButton = now.find(control => control.details.tag === "button" &&
      new RegExp("pay\\s*\\$?\\s*" + amount + "(?:\\.00)?", "i").test(control.details.text) &&
      !control.details.disabled);
    if (payButton) { payEnabled = true; break; }
    await page.waitForTimeout(350);
  }
  if (!payEnabled) {
    // Some checkout builds update validation only after keyboard input and blur.
    await emailInput.fill("");
    await emailInput.pressSequentially(email, { delay: 18 });
    await emailInput.press("Tab").catch(() => {});
    await page.waitForTimeout(1200);
    const afterKeyboard = await visibleControls(page);
    payEnabled = afterKeyboard.some(control => control.details.tag === "button" &&
      new RegExp("pay\\s*\\$?\\s*" + amount + "(?:\\.00)?", "i").test(control.details.text) &&
      !control.details.disabled);
    if (!payEnabled) {
      const state = await snapshotCheckout(page, "email-validation-blocked");
      throw new Error("Safepay Pay button stays disabled after email fill, blur, and keyboard input: " + JSON.stringify(state.state).slice(0, 3000));
    }
  }
  await page.screenshot({ path: path.join(outputDir, "safepay-email-entered.png"), fullPage: false });
  report.captures.push("safepay-email-entered.png");
  await clickCheckoutAction(page, new RegExp("pay\\s*\\$?\\s*" + amount + "(?:\\.00)?|continue|next|proceed", "i"));

  let cardFilled = false;
  let paymentSubmitted = false;
  let sawCard = false;
  for (let step = 1; step <= 9; step++) {
    await page.waitForTimeout(1500);
    const { state, controls } = await snapshotCheckout(page, step);
    if (state.hostname === "raw.githack.com" && state.url.includes("support-payment-success-preview.html")) {
      check("sandbox card transaction redirects to Support success return", true, { step });
      report.sandboxPaymentSubmitted = paymentSubmitted;
      return state;
    }
    if (state.hostname !== "sandbox.api.getsafepay.com" && state.hostname !== "raw.githack.com") {
      throw new Error("Sandbox checkout left the allowed provider/return hosts: " + state.hostname);
    }
    if (await handleThreeDSIfShown(page, state, controls)) {
      await page.waitForTimeout(1500);
      continue;
    }

    const hasCardNumber = controls.some(control => /card number|cc-number|cardnumber|card_number|credit card number/i.test(control.descriptor) && control.details.tag === "input");
    const hasExpiry = controls.some(control => /expiry date|expiration date|expir|cc-exp|card expiry/i.test(control.descriptor) && ["input", "select"].includes(control.details.tag));
    const hasCvc = controls.some(control => /cvc|cvv|security code|cc-csc|card verification/i.test(control.descriptor) && control.details.tag === "input");

    if (hasCardNumber && !cardFilled) {
      await fillField(page, /card number|cc-number|cardnumber|card_number|credit card number/i, "4111111111111111");
      await fillField(page, /expiry date|expiration date|expir|cc-exp|card expiry/i, "12/30");
      await fillField(page, /cvc|cvv|security code|cc-csc|card verification/i, "123");
      await fillField(page, /phone number|mobile number|contact number|\\btel\\b/i, "3021111111", { required: false });
      await fillField(page, /cardholder|name on card|card name|cc-name/i, "NexusNova Sandbox QA", { required: false });
      await fillField(page, /billing.*address|address line|street address|address/i, "10 Commercial Lane", { required: false });
      await fillField(page, /city/i, "Karachi", { required: false });
      await fillField(page, /state|province/i, "Sindh", { required: false });
      await fillField(page, /postal|zip/i, "75500", { required: false });
      await fillField(page, /country/i, "Pakistan", { required: false });
      const fieldsAfterFill = await visibleControls(page);
      const cardNumberNow = fieldsAfterFill.some(control => /card number|cc-number|cardnumber|card_number|credit card number/i.test(control.descriptor) && control.details.tag === "input");
      const expiryNow = fieldsAfterFill.some(control => /expiry date|expiration date|expir|cc-exp|card expiry/i.test(control.descriptor) && ["input", "select"].includes(control.details.tag));
      const cvcNow = fieldsAfterFill.some(control => /cvc|cvv|security code|cc-csc|card verification/i.test(control.descriptor) && control.details.tag === "input");
      check("sandbox test card fields were located", cardNumberNow && expiryNow && cvcNow, { cardNumberNow, expiryNow, cvcNow });
      await page.screenshot({ path: path.join(outputDir, "safepay-test-card-ready.png"), fullPage: false });
      report.captures.push("safepay-test-card-ready.png");
      cardFilled = true;
      sawCard = true;
      await clickCheckoutAction(page, new RegExp("make payment|pay\\s*\\$?\\s*" + amount + "(?:\\.00)?|pay now|submit payment|confirm payment", "i"));
      paymentSubmitted = true;
      report.sandboxPaymentSubmitted = true;
      continue;
    }

    const phone = controls.find(control => control.details.tag === "input" && !phoneFilled && (control.details.type === "tel" || /phone number|mobile number|contact number/i.test(control.descriptor)));
    if (phone) {
      await phone.locator.fill("3021111111");
      phoneFilled = true;
      await clickCheckoutAction(page, new RegExp("continue|next|proceed|pay\\s*\\$?\\s*" + amount + "(?:\\.00)?", "i"));
      continue;
    }
    if (controls.some(control => control.details.tag === "input" && /email address|email/i.test(control.descriptor)) && !paymentSubmitted && !sawCard) {
      throw new Error("Safepay still requests email after it was submitted: " + JSON.stringify(state).slice(0, 3000));
    }
    if (paymentSubmitted && /payment failed|transaction failed|payment declined|unable to process/i.test(state.bodyText)) {
      throw new Error("Safepay sandbox test-card transaction failed: " + JSON.stringify(state).slice(0, 3000));
    }
    throw new Error("Unrecognized Safepay sandbox checkout step: " + JSON.stringify(state).slice(0, 4000));
  }
  throw new Error("Safepay sandbox did not complete the test-card flow within nine steps.");
}

let exitCode = 0;
try {
  const healthResponse = await fetch(WORKER_URL + "/health");
  const health = await healthResponse.json();
  check("sandbox Worker health/config is ready", healthResponse.ok && health.ok === true && health.enabled === true && health.environment === "sandbox" && health.credentials === "configured", {
    status: healthResponse.status, environment: health.environment, enabled: health.enabled, credentials: health.credentials
  });

  const desktop = await inspectViewport({ width: 1366, height: 900 }, "homepage-desktop");
  await installReturnPageRoutes(desktop);
  await desktop.on("response", async response => {
    try {
      const url = new URL(response.url());
      if (url.pathname === "/api/support/payment-status") {
        const data = await response.json();
        report.paymentStatusResponses = report.paymentStatusResponses || [];
        report.paymentStatusResponses.push(data);
      }
    } catch {}
  });
  let providerMainResponse = null;
  desktop.on("response", response => {
    try {
      if (response.request().isNavigationRequest() &&
          response.request().frame() === desktop.mainFrame() &&
          new URL(response.url()).hostname === "sandbox.api.getsafepay.com") {
        providerMainResponse = {
          status: response.status(),
          url: response.url(),
          contentType: response.headers()["content-type"] || ""
        };
      }
    } catch {}
  });
  let checkoutPayload = null;
  let checkoutStatus = null;
  await desktop.route("**/api/support/create-checkout", async route => {
    const upstream = await route.fetch();
    checkoutStatus = upstream.status();
    const body = await upstream.body();
    try { checkoutPayload = JSON.parse(body.toString("utf8")); } catch {}
    await route.fulfill({
      status: checkoutStatus,
      headers: {
        "content-type": upstream.headers()["content-type"] || "application/json; charset=utf-8",
        "cache-control": "no-store",
        "x-content-type-options": "nosniff"
      },
      body
    });
  });
  const responsePromise = desktop.waitForResponse(response =>
    response.request().method() === "POST" && new URL(response.url()).pathname === "/api/support/create-checkout",
    { timeout: 30_000 }
  );
  await desktop.getByRole("button", { name: "Support with $5" }).click({ timeout: 15_000 });
  await responsePromise;
  const payload = checkoutPayload || {};
  check("desktop: $5 click completes live sandbox session request", checkoutStatus === 200, { status: checkoutStatus });
  check("desktop: checkout session matches USD $5 sandbox request", payload.ok === true && payload.amount === 5 && payload.currency === "USD" && payload.environment === "sandbox", {
    ok: payload.ok, amount: payload.amount, currency: payload.currency, environment: payload.environment
  });
  const checkout = new URL(payload.checkout_url);
  check("desktop: checkout redirects to Safepay sandbox", checkout.protocol === "https:" && checkout.hostname === "sandbox.api.getsafepay.com" && Boolean(checkout.searchParams.get("tracker")) && Boolean(checkout.searchParams.get("tbt")), {
    protocol: checkout.protocol, hostname: checkout.hostname, hasTracker: Boolean(checkout.searchParams.get("tracker")), hasTbt: Boolean(checkout.searchParams.get("tbt"))
  });
  const providerConsoleErrors = [];
  const providerFailedRequests = [];
  const providerPageErrors = [];
  desktop.on("console", message => { if (message.type() === "error") providerConsoleErrors.push(message.text().slice(0, 400)); });
  desktop.on("requestfailed", request => providerFailedRequests.push({ url: request.url(), error: request.failure()?.errorText || "unknown" }));
  desktop.on("pageerror", error => providerPageErrors.push(String(error.message).slice(0, 300)));
  await desktop.waitForURL(url => url.hostname === "sandbox.api.getsafepay.com", { timeout: 30_000, waitUntil: "domcontentloaded" });
  await desktop.waitForLoadState("domcontentloaded", { timeout: 15_000 }).catch(() => {});
  await desktop.waitForTimeout(7000);
  const providerDom = await desktop.evaluate(() => ({
    url: location.href,
    title: document.title,
    bodyText: (document.body?.innerText || "").trim().slice(0, 1600),
    htmlLength: document.documentElement?.innerHTML?.length || 0,
    forms: document.querySelectorAll("form").length,
    inputs: Array.from(document.querySelectorAll("input")).map(input => ({ type: input.type, name: input.name, placeholder: input.placeholder })).slice(0, 15),
    iframes: Array.from(document.querySelectorAll("iframe")).map(frame => ({ title: frame.title, src: frame.src })).slice(0, 8)
  }));
  report.safepayCheckout = { response: providerMainResponse, dom: providerDom, consoleErrors: providerConsoleErrors, failedRequests: providerFailedRequests, pageErrors: providerPageErrors, paymentSubmitted: false };
  await desktop.screenshot({ path: path.join(outputDir, "safepay-sandbox-checkout.png"), fullPage: false });
  report.captures.push("safepay-sandbox-checkout.png");
  check("actual Safepay sandbox checkout content rendered without submitting a payment", Boolean(
    providerMainResponse && providerMainResponse.status >= 200 && providerMainResponse.status < 400 &&
    providerDom.url.startsWith("https://sandbox.api.getsafepay.com/") &&
    (providerDom.bodyText.length > 20 || providerDom.forms > 0 || providerDom.inputs.length > 0 ||
      providerDom.iframes.some(frame => frame.src && frame.src !== "about:blank"))
  ), report.safepayCheckout);

  // Use published dummy test data only. No production host, key, or real card is used.
  await completeSandboxCardPayment(desktop, 5);
  await desktop.waitForURL(url => url.hostname === "raw.githack.com" && url.pathname.endsWith("/support-payment-success-preview.html"), {
    timeout: 90_000,
    waitUntil: "domcontentloaded"
  });
  await desktop.getByText("Sandbox payment confirmed.", { exact: true }).waitFor({ timeout: 35_000 });
  const successTitle = await desktop.locator("#title").innerText();
  check("real sandbox test-card flow returns to confirmed Support page", successTitle === "Sandbox payment confirmed.", { title: successTitle });
  await desktop.screenshot({ path: path.join(outputDir, "payment-status-confirmed.png"), fullPage: false });
  report.captures.push("payment-status-confirmed.png");
  await desktop.waitForTimeout(300);
  const statusSuccess = (report.paymentStatusResponses || []).find(response => response.paid === true &&
    response.amount === 5 && response.currency === "USD" && response.environment === "sandbox" &&
    response.order_id === checkout.searchParams.get("order_id"));
  check("server verifies exact sandbox order, amount and currency as PAID", Boolean(statusSuccess), {
    confirmed: Boolean(statusSuccess),
    responseCount: (report.paymentStatusResponses || []).length
  });
  report.sandboxPayment = {
    amount: 5,
    currency: "USD",
    environment: "sandbox",
    dummyCardUsed: true,
    paymentSubmitted: true,
    confirmedByWorker: Boolean(statusSuccess)
  };
  await desktop.close();

  // Additional allowed amounts must create sandbox sessions; only $5 is submitted as a dummy-card test.
  for (const amount of [3, 10, 25]) {
    const response = await fetch(WORKER_URL + "/api/support/create-checkout", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://raw.githack.com" },
      body: JSON.stringify({ amount })
    });
    let session = {};
    try { session = await response.json(); } catch {}
    const sessionUrl = new URL(session.checkout_url || "https://invalid.example/");
    check("sandbox API creates a valid USD $" + amount + " session", response.status === 200 &&
      session.ok === true && session.amount === amount && session.currency === "USD" &&
      session.environment === "sandbox" && sessionUrl.hostname === "sandbox.api.getsafepay.com" &&
      Boolean(sessionUrl.searchParams.get("tracker")) && Boolean(sessionUrl.searchParams.get("tbt")), {
        status: response.status, ok: session.ok, amount: session.amount, currency: session.currency,
        environment: session.environment, checkoutHost: sessionUrl.hostname
      });
  }

  // Cancel a separate sandbox session through Safepay's actual Cancel payment link.
  const cancelPage = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  await installReturnPageRoutes(cancelPage);
  let cancelPayload = null;
  let cancelSessionStatus = null;
  await cancelPage.route("**/api/support/create-checkout", async route => {
    const upstream = await route.fetch();
    cancelSessionStatus = upstream.status();
    const body = await upstream.body();
    try { cancelPayload = JSON.parse(body.toString("utf8")); } catch {}
    await route.fulfill({
      status: cancelSessionStatus,
      headers: { "content-type": upstream.headers()["content-type"] || "application/json; charset=utf-8", "cache-control": "no-store" },
      body
    });
  });
  await cancelPage.goto(localBase + "/", { waitUntil: "domcontentloaded", timeout: 60_000 });
  const cancelSessionPromise = cancelPage.waitForResponse(response =>
    response.request().method() === "POST" && new URL(response.url()).pathname === "/api/support/create-checkout",
    { timeout: 30_000 }
  );
  await cancelPage.getByRole("button", { name: "Support with $3" }).click({ timeout: 15_000 });
  await cancelSessionPromise;
  const cancelCheckout = new URL(cancelPayload?.checkout_url || "https://invalid.example/");
  check("cancel flow starts a separate USD $3 sandbox session", cancelSessionStatus === 200 &&
    cancelPayload?.ok === true && cancelPayload.amount === 3 && cancelPayload.currency === "USD" &&
    cancelPayload.environment === "sandbox" && cancelCheckout.hostname === "sandbox.api.getsafepay.com", {
      status: cancelSessionStatus, amount: cancelPayload?.amount, currency: cancelPayload?.currency,
      environment: cancelPayload?.environment, checkoutHost: cancelCheckout.hostname
    });
  await cancelPage.waitForURL(url => url.hostname === "sandbox.api.getsafepay.com", { timeout: 30_000, waitUntil: "domcontentloaded" });
  await cancelPage.getByText("Cancel payment", { exact: true }).click({ timeout: 20_000 });
  await cancelPage.waitForURL(url => url.hostname === "raw.githack.com" && url.pathname.endsWith("/support-payment-cancelled-preview.html"), {
    timeout: 60_000, waitUntil: "domcontentloaded"
  });
  await cancelPage.getByRole("heading", { name: "Sandbox checkout cancelled." }).waitFor({ timeout: 20_000 });
  await cancelPage.screenshot({ path: path.join(outputDir, "payment-cancelled.png"), fullPage: false });
  report.captures.push("payment-cancelled.png");
  const cancelStatusUrl = new URL(WORKER_URL + "/api/support/payment-status");
  cancelStatusUrl.searchParams.set("tracker", cancelCheckout.searchParams.get("tracker"));
  cancelStatusUrl.searchParams.set("order_id", cancelCheckout.searchParams.get("order_id"));
  const cancelStatusResponse = await fetch(cancelStatusUrl, { headers: { origin: "https://raw.githack.com" } });
  let cancelStatus = {};
  try { cancelStatus = await cancelStatusResponse.json(); } catch {}
  check("cancelled sandbox order is never marked PAID", cancelStatusResponse.status === 200 &&
    cancelStatus.ok === true && cancelStatus.paid === false && cancelStatus.order_id === cancelCheckout.searchParams.get("order_id"), {
      status: cancelStatusResponse.status, ok: cancelStatus.ok, paid: cancelStatus.paid,
      state: cancelStatus.state, verification: cancelStatus.verification
    });
  await cancelPage.close();

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

  const mobile = await inspectViewport({ width: 390, height: 844 }, "homepage-mobile");
  await mobile.close();

  // Re-check the completed $5 sandbox payment directly after the return-page confirmation.
  const liveStatusUrl = new URL(WORKER_URL + "/api/support/payment-status");
  liveStatusUrl.searchParams.set("tracker", checkout.searchParams.get("tracker"));
  liveStatusUrl.searchParams.set("order_id", checkout.searchParams.get("order_id"));
  const liveStatusResponse = await fetch(liveStatusUrl, { headers: { origin: "https://raw.githack.com" } });
  let liveStatus = {};
  try { liveStatus = await liveStatusResponse.json(); } catch {}
  check("live status independently confirms the sandbox USD $5 payment", liveStatusResponse.status === 200 &&
    liveStatus.ok === true && liveStatus.paid === true && liveStatus.amount === 5 &&
    liveStatus.currency === "USD" && liveStatus.environment === "sandbox" &&
    liveStatus.order_id === checkout.searchParams.get("order_id") &&
    liveStatus.verification === "verified_support_payment", {
      status: liveStatusResponse.status, ok: liveStatus.ok ?? false, paid: liveStatus.paid ?? false,
      amount: liveStatus.amount ?? null, currency: liveStatus.currency ?? null,
      environment: liveStatus.environment ?? null, verification: liveStatus.verification ?? null
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
