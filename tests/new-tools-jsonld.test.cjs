const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

function newToolsItemList() {
  const html = fs.readFileSync('new-tools.html', 'utf8');
  const match = html.match(/<script type="application\/ld\+json">(\{.*?\})<\/script>/s);
  assert.ok(match, 'new-tools.html must contain JSON-LD');
  const data = JSON.parse(match[1]);
  const itemList = data['@graph']?.find(item => item['@type'] === 'ItemList');
  assert.ok(itemList, 'new-tools.html must contain an ItemList node');
  return itemList;
}

test('New Tools structured data stays in sync with the 17-tool collection', () => {
  const itemList = newToolsItemList();
  const rows = itemList.itemListElement;
  assert.equal(itemList.numberOfItems, 17);
  assert.equal(rows.length, 17);
  assert.deepEqual(rows.map(row => row.position), Array.from({ length: 17 }, (_, i) => i + 1));
  assert.equal(new Set(rows.map(row => row.url)).size, 17, 'ItemList URLs must be unique');

  const required = [
    'salary-tax-calculator-pakistan.html',
    'electricity-bill-calculator-pakistan.html',
    'zakat-calculator-pakistan.html',
    'prayer-times-qibla-pakistan.html',
    'pakistan-public-holidays-2026.html',
    'dns-lookup.html',
    'ip-cidr-calculator.html',
    'website-reachability-checker.html',
    'decision-matrix-calculator.html',
    'paper-size-in-pixels.html',
    'timezone-meeting-planner.html',
    'qr-code-scanner.html',
    'ai-token-calculator.html',
    'invoice-maker.html',
    'fbr-atl-status-checker.html',
    'fbr-tax-calculator-pakistan.html',
    'pakistan-jobs-finder.html',
  ].map(path => `https://nexusnovatools.com/${path}`);

  assert.deepEqual(rows.map(row => row.url), required);
});
