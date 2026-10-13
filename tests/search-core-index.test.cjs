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
    article: 34,
    guide: 8
  });
  assert.equal(search.size, 146);
  assert.equal(SearchCore.DATASET_SIZE, search.size);
  assert.deepEqual({ ...SearchCore.DATASET_COUNTS }, { ...search.getCounts() });
});

test('every article card in the Articles hub exists in the site search index', () => {
  const hub = fs.readFileSync(path.join(root, 'articles.html'), 'utf8');
  const hrefs = [...hub.matchAll(/<a class="nn-article-card" href="([^"]+\.html)"/g)]
    .map(match => match[1]);
  const indexed = new Set(data.filter(record => record.type === 'article').map(record => record.url));

  assert.equal(hrefs.length, 34, 'hub article count should match its published cards');
  assert.equal(new Set(hrefs).size, hrefs.length, 'hub should not contain duplicate article cards');
  assert.deepEqual(hrefs.filter(url => !indexed.has(url)), []);
});

test('COLA calculator and explainer are discoverable from a natural search query', () => {
  const urls = new Set(search.query('2027 social security cola').map(result => result.url));
  assert.ok(urls.has('social-security-cola-calculator-2027.html'));
  assert.ok(urls.has('articles/social-security-cola-2027-estimate.html'));
});

test('the older Chrome 152 Android article is excluded from indexing and points to the consolidated timeline', () => {
  const archivePath = path.join(root, 'articles/chrome-152-for-android-adds-desktop-security-fixes.html');
  const archive = fs.readFileSync(archivePath, 'utf8');
  const hub = fs.readFileSync(path.join(root, 'articles.html'), 'utf8');
  const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  const archiveUrl = 'articles/chrome-152-for-android-adds-desktop-security-fixes.html';
  const primaryUrl = 'articles/google-releases-chrome-152-for-android.html';

  assert.match(archive, /<meta name="robots" content="noindex,follow/i);
  assert.ok(archive.includes('href="https://nexusnovatools.com/' + primaryUrl + '"'), 'archive canonical should point to the consolidated page');
  assert.ok(archive.includes('href="google-releases-chrome-152-for-android.html"'), 'archive should link visitors to the maintained page');
  assert.ok(!hub.includes('href="' + archiveUrl + '"'), 'archive should not remain in the indexable article hub');
  assert.ok(!sitemap.includes(archiveUrl), 'noindex archive must not appear in sitemap.xml');
  assert.equal(data.some(record => record.url === archiveUrl), false);
  assert.equal(data.some(record => record.url === primaryUrl), true);
  assert.ok(search.query('Chrome 152 Android release timeline').some(result => result.url === primaryUrl));
});
