'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
globalThis.window = {};
require(path.join(root, 'assets/js/search-core.js'));

const SearchCore = globalThis.window.NexusNovaSearchCore;
const data = globalThis.window.NexusNovaSearchData;
const search = new SearchCore({ maxResults: 100 });

test('search index count constants match the actual dataset', () => {
  assert.deepEqual({ ...search.getCounts() }, {
    tool: 95,
    category: 9,
    article: 35,
    guide: 8
  });
  assert.equal(search.size, 147);
  assert.equal(SearchCore.DATASET_SIZE, search.size);
  assert.deepEqual({ ...SearchCore.DATASET_COUNTS }, { ...search.getCounts() });
});

test('every article card in the Articles hub exists in the site search index', () => {
  const hub = fs.readFileSync(path.join(root, 'articles.html'), 'utf8');
  const hrefs = [...hub.matchAll(/<a class="nn-article-card" href="([^"]+\.html)"/g)]
    .map(match => match[1]);
  const indexed = new Set(data.filter(record => record.type === 'article').map(record => record.url));

  assert.equal(hrefs.length, 35, 'hub article count should match its published cards');
  assert.equal(new Set(hrefs).size, hrefs.length, 'hub should not contain duplicate article cards');
  assert.deepEqual(hrefs.filter(url => !indexed.has(url)), []);
});

test('COLA calculator and explainer are discoverable from a natural search query', () => {
  const urls = new Set(search.query('2027 social security cola').map(result => result.url));
  assert.ok(urls.has('social-security-cola-calculator-2027.html'));
  assert.ok(urls.has('articles/social-security-cola-2027-estimate.html'));
});
