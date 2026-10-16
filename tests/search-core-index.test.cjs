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
    tool: 108,
    category: 9,
    article: 34,
    guide: 14
  });
  assert.equal(search.size, 165);
  assert.equal(SearchCore.DATASET_SIZE, search.size);
  assert.deepEqual({ ...SearchCore.DATASET_COUNTS }, { ...search.getCounts() });
});

test('PDF Document Workbench replaces the separate merge and split discovery pages', () => {
  const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const directory = fs.readFileSync(path.join(root, 'tools.html'), 'utf8');
  const pdfHub = fs.readFileSync(path.join(root, 'pdf-tools.html'), 'utf8');
  const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  const mergePage = fs.readFileSync(path.join(root, 'merge-pdf.html'), 'utf8');
  const splitPage = fs.readFileSync(path.join(root, 'split-pdf.html'), 'utf8');
  const homeCards = [...home.matchAll(/<a class="nn-master-tool" href="([^"]+)"/g)].map(m => m[1]);
  const directoryCards = [...directory.matchAll(/<a class="nn-tool-card" href="([^"]+)"/g)].map(m => m[1]);
  const legacy = ['merge-pdf.html', 'split-pdf.html'];

  assert.equal(homeCards.length, 92, 'homepage master directory count should match the published 92-tool label');
  assert.equal(directoryCards.length, 108, 'tool directory card count should match the published count');
  assert.equal(data.filter(record => record.type === 'tool').length, 108);
  assert.ok(homeCards.includes('document-workbench.html'));
  assert.ok(directoryCards.includes('document-workbench.html'));
  assert.ok(pdfHub.includes('href="document-workbench.html"'));
  assert.ok(search.query('PDF Document Workbench').some(result => result.url === 'document-workbench.html'));
  assert.ok(sitemap.includes('https://nexusnovatools.com/document-workbench.html'));

  for (const [path, html] of [['merge-pdf.html', mergePage], ['split-pdf.html', splitPage]]) {
    assert.match(html, /<meta name="robots" content="noindex,follow,max-image-preview:large">/);
    assert.ok(html.includes('href="document-workbench.html"'), path + ' must point visitors to the consolidated workflow');
    assert.ok(!homeCards.includes(path), path + ' must not remain in homepage tool discovery');
    assert.ok(!directoryCards.includes(path), path + ' must not remain in directory discovery');
    assert.ok(!data.some(record => record.url === path), path + ' must not remain in internal search');
    assert.ok(!sitemap.includes('https://nexusnovatools.com/' + path), path + ' must not remain in sitemap.xml');
    assert.ok(!pdfHub.includes(path), path + ' must not remain in the focused PDF hub');
  }
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

test('Chrome 152 archive and retained timeline follow the approved NOINDEX quarantine consistently', () => {
  const archivePath = path.join(root, 'articles/chrome-152-for-android-adds-desktop-security-fixes.html');
  const archive = fs.readFileSync(archivePath, 'utf8');
  const hub = fs.readFileSync(path.join(root, 'articles.html'), 'utf8');
  const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  const primaryPath = path.join(root, 'articles/google-releases-chrome-152-for-android.html');
  const primary = fs.readFileSync(primaryPath, 'utf8');
  const approvedPolicy = fs.readFileSync(path.join(root, 'ADSENSE-REMEDIATION-REPORT-2026-09-11.md'), 'utf8');
  const feed = JSON.parse(fs.readFileSync(path.join(root, 'articles.json'), 'utf8'));
  const archiveUrl = 'articles/chrome-152-for-android-adds-desktop-security-fixes.html';
  const primaryUrl = 'articles/google-releases-chrome-152-for-android.html';

  const canonicalPrimaryUrl = 'https://nexusnovatools.com/' + primaryUrl;

  assert.match(archive, /<meta name="robots" content="noindex,follow/i);
  assert.ok(archive.includes('href="https://nexusnovatools.com/' + primaryUrl + '"'), 'archive canonical should point to the consolidated page');
  assert.ok(archive.includes('href="google-releases-chrome-152-for-android.html"'), 'archive should link visitors to the maintained page');
  assert.ok(!hub.includes('href="' + archiveUrl + '"'), 'archive should not remain in the indexable article hub');
  assert.ok(!sitemap.includes(archiveUrl), 'noindex archive must not appear in sitemap.xml');
  assert.ok(primary.includes('<meta name="robots" content="noindex,follow,max-image-preview:large">'), 'retained timeline must remain noindex under the current approved quarantine');
  assert.ok(approvedPolicy.includes('- `' + primaryUrl + '`'), 'retained timeline must stay listed in the approved NOINDEX plan until explicitly reviewed');
  assert.ok(!sitemap.includes(canonicalPrimaryUrl), 'approved noindex timeline must not appear in sitemap.xml');
  assert.equal(feed.items.some(record => record.url === canonicalPrimaryUrl), false, 'articles.json must exclude the approved noindex timeline');
  assert.ok(hub.includes('href="' + primaryUrl + '"'), 'retained timeline remains available through the visitor-facing hub');
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
  const starts = [...hub.matchAll(/<article class="nn-guide-card"[^>]*data-guide-card[^>]*>/g)];
  const cards = starts.map(match => {
    const end = hub.indexOf('</article>', match.index);
    return end < 0 ? '' : hub.slice(match.index, end + '</article>'.length);
  });
  const indexed = new Set(data.filter(record => record.type === 'guide').map(record => record.url));
  assert.equal(cards.length, 14, 'guide hub card count should match the index');
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


