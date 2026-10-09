import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const excluded = new Set([
  "humanproof-checkout.html",
  "humanproof-payment-success.html",
  "humanproof-payment-success-v2.html",
  "humanproof-payment-cancelled.html",
  "support-payment-success.html",
  "support-payment-cancelled.html",
  "support-payment-success-preview.html",
  "support-payment-cancelled-preview.html",
  "register.html",
  "support-checkout-preview.html",
  "support-payment-result-preview.html"
]);

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === ".git" || entry.name === "node_modules" || entry.name === ".github") continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(absolute));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith(".html")) files.push(absolute);
  }
  return files;
}

test("all standard HTML pages load the shared support runtime directly or via a common shell", async () => {
  const files = await walk(root);
  const uncovered = [];
  let covered = 0;
  for (const file of files) {
    const relative = path.relative(root, file).split(path.sep).join("/");
    const name = path.basename(file).toLowerCase();
    if (relative.startsWith("ota/") || relative.startsWith("support-") || excluded.has(name) || /(?:^|\/)[^/]*preview[^/]*\.html$/i.test(relative)) continue;
    const html = await readFile(file, "utf8");
    const direct = /id=["']nexusnova-support-runtime-loader["']|id=["']nexusnova-support-direct-loader["']/i.test(html);
    const shared = /assets\/js\/(?:main|nn-inner-shell)\.js(?:[?#"'])/i.test(html);
    if (direct || shared) covered++;
    else uncovered.push(relative);
  }
  assert.equal(uncovered.length, 0, "Support runtime not wired on: " + uncovered.slice(0, 60).join(", "));
  assert.ok(covered > 100, "Expected broad sitewide support coverage, found only " + covered + " pages.");
});
