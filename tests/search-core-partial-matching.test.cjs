'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
globalThis.window = {};
require(path.join(root, 'assets/js/search-core.js'));
const SearchCore = globalThis.window.NexusNovaSearchCore;
const search = new SearchCore({ maxResults: 100 });
const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const directory = fs.readFileSync(path.join(root, 'tools.html'), 'utf8');

test('partial substrings, prefixes and small typos work while typing', () => {
  const cases = [
    ['tik', 'short-form-video-hook-generator.html'],
    ['tok', 'short-form-video-hook-generator.html'],
    ['TikTok', 'short-form-video-hook-generator.html'],
    ['calc', 'calculator.html'],
    ['calcuator', 'calculator.html'],
    ['tax', 'crypto-tax-profit-estimator.html'],
    ['Crypto Tax', 'crypto-tax-profit-estimator.html'],
    ['c', 'csv-json-converter.html']
  ];
  for (const [query, expectedUrl] of cases) {
    const results = search.query(query);
    assert.ok(results.length > 0, 'no results for input: ' + query);
    assert.ok(results.some(result => result.url === expectedUrl),
      'expected ' + expectedUrl + ' for query "' + query + '"');
  }
});

test('PDF alias returns all indexed PDF tools', () => {
  const results = search.query('pdf');
  const matched = new Set(results.filter(result => result.type === 'tool').map(result => result.url));
  for (const url of ['jpg-to-pdf.html', 'document-workbench.html', 'text-to-pdf.html']) {
    assert.ok(matched.has(url), 'PDF alias must return ' + url);
  }
  assert.equal(matched.size, 3);
});

test('single-character queries prioritize tools and never return empty', () => {
  for (const query of ['T', 'c']) {
    const results = search.query(query);
    assert.ok(results.length > 0, 'empty results for single character: ' + query);
    assert.ok(results.slice(0, 8).every(result => result.type === 'tool'),
      'tools should rank before editorial matches: ' + query);
  }
});

test('all 97 indexed tool routes are represented by directory cards and searchable', () => {
  const records = search.getData().filter(record => record.type === 'tool');
  const hrefs = new Set([...directory.matchAll(/<a class="nn-tool-card" href="([^"]+)"/g)].map(match => match[1]));
  assert.equal(records.length, 97);
  assert.equal(hrefs.size, 97);
  for (const record of records) {
    assert.ok(hrefs.has(record.url), 'directory lacks ' + record.url);
    assert.ok(search.query(record.title).some(result => result.url === record.url),
      'full title not searchable: ' + record.url);
  }
});

test('homepage uses input events and a fresh cache key for search-core', () => {
  assert.match(home, /input\.addEventListener\('input', runQuery\)/);
  assert.match(home, /assets\/js\/search-core\.js\?build=20261015-tier1-expansion-1&v=20261015-v3/);
  assert.match(directory, /input\.addEventListener\('input',\(\)=>update\(input\.value\)\)/);
});
