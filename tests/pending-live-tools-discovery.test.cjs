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
  assert.match(home, /NexusNova Tools — 92 Free Browser Tools/);
  assert.ok(home.includes('href="social-security-cola-calculator-2027.html"'));
  assert.match(tools, /id="directory-search-count">92 tools/);
  assert.ok(tools.includes('href="social-security-cola-calculator-2027.html"'));
  assert.ok(search.includes('title:"2027 Social Security COLA Calculator", url:"social-security-cola-calculator-2027.html", type:"tool"'));
  assert.ok(search.includes('tool:92,'));
  assert.ok(search.includes('DATASET_SIZE=144'));
});
