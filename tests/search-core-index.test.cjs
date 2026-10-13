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
    guide: 9
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


test('search index stores compact article metadata rather than full page bodies', () => {
  const source = fs.readFileSync(path.join(root, 'assets/js/search-core.js'), 'utf8');
  const oversizedTags = data.flatMap(record => record.tags
    .filter(tag => tag.length > 900)
    .map(tag => ({ url: record.url, length: tag.length })));

  assert.ok(source.length < 90000, 'search index unexpectedly grew beyond the compact-data budget');
  assert.deepEqual(oversizedTags, [], 'Do not embed full article bodies in search tags');

  const queries = [
    ['EXIF GPS metadata photos', 'articles/remove-exif-gps-metadata-photos.html'],
    ['AI search planning 2026', 'articles/ai-search-planning-decisions-2026.html'],
    ['Google Search Console platform properties 2026', 'articles/google-search-console-platform-properties-2026.html'],
    ['Chrome 152 327 security fixes', 'articles/google-releases-chrome-152-with-327-security-fixes.html'],
    ['AI tokens context windows', 'articles/ai-token-count-context-window-guide.html']
  ];
  for (const [query, expectedUrl] of queries) {
    assert.ok(search.query(query).some(result => result.url === expectedUrl),
      'expected a compact-index search hit for: ' + query);
  }
});

test('every guide card is linked to its search-index entry', () => {
  const hub = fs.readFileSync(path.join(root, 'guides.html'), 'utf8');
  const cards = [...hub.matchAll(/<article class="nn-guide-card"[^>]*data-guide-card[^>]*>[\\s\\S]*?<\\/article>/g)].map(match => match[0]);
  const indexed = new Set(data.filter(record => record.type === 'guide').map(record => record.url));
  assert.equal(cards.length, 9, 'guide hub card count should match the index');
  for (const card of cards) {
    const url = (card.match(/data-search-url="([^"]+)"/) || [])[1];
    const link = (card.match(/<a class="nn-guide-link" href="([^"]+)"/) || [])[1];
    assert.ok(url, 'guide card must carry data-search-url');
    assert.equal(url, link, 'filter URL must equal the Read Guide href');
    assert.ok(indexed.has(url), 'guide card must exist in search index: ' + url);
  }
  assert.ok(search.query('FBR ATL status CNIC NTN 9966')
    .some(result => result.url === 'guides/fbr-atl-status.html'));
});
