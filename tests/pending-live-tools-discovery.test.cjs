'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const read = path => fs.readFileSync(path, 'utf8');

test('source-pending AQI and crypto pages are excluded from indexable discovery', () => {
  for (const path of ['aqi-live.html', 'crypto-live.html']) {
    const html = read(path);
    const sitemap = read('sitemap.xml');
    assert.match(html, /<meta name="robots" content="noindex,follow">/);
    assert.equal(sitemap.includes('https://nexusnovatools.com/' + path), false);
    assert.equal(read('index.html').includes('href="' + path + '"'), false);
    assert.equal(read('tools.html').includes('href="' + path + '"'), false);
    assert.equal(read('live.html').includes('href="' + path + '"'), false);
    assert.equal(read('assets/js/search-core.js').includes('url:"' + path + '"'), false);
  }
});

test('a working COLA calculator occupies the freed directory slot and is discoverable', () => {
  const home = read('index.html');
  const tools = read('tools.html');
  const search = read('assets/js/search-core.js');
  assert.ok(home.includes('<title>NexusNova Tools — 108 Free Online Browser Tools &amp; PDFs</title>'));
  assert.ok(home.includes('href="social-security-cola-calculator-2027.html"'));
  assert.match(tools, /id="directory-search-count">108 tools/);
  assert.ok(tools.includes('href="social-security-cola-calculator-2027.html"'));
  assert.ok(search.includes('title:"2027 Social Security COLA Calculator", url:"social-security-cola-calculator-2027.html", type:"tool"'));
  assert.ok(search.includes('tool:108,'));
  const countsMatch = search.match(/NexusNovaSearchCore\.DATASET_COUNTS=Object\.freeze\(\{tool:(\d+),category:(\d+),article:(\d+),guide:(\d+)\}\);/);
  assert.ok(countsMatch, 'search dataset counts should be declared');
  const counts = countsMatch.slice(1).map(Number);
  assert.equal(counts[0], 108);
  assert.ok(counts[2] >= 45);
  const size = Number(search.match(/NexusNovaSearchCore\.DATASET_SIZE=(\d+);/)?.[1]);
  assert.equal(size, counts.reduce((sum, value) => sum + value, 0));
});

