const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const index = fs.readFileSync('sitemap-index.xml', 'utf8');
const robots = fs.readFileSync('robots.txt', 'utf8');
const main = fs.readFileSync('sitemap.xml', 'utf8');

test('central sitemap index exposes only the canonical main sitemap', () => {
  const sitemapLocs = [...index.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  assert.deepEqual(sitemapLocs, ['https://nexusnovatools.com/sitemap.xml']);
  assert.doesNotMatch(index, /sitemap-content-|sitemap-daily-tools|humanproof-sitemap|sitemap-new-tools|sitemap-recent|sitemap-autopilot/);
});

test('robots advertises the central sitemap index', () => {
  assert.match(robots, /^Sitemap: https:\/\/nexusnovatools\.com\/sitemap-index\.xml$/m);
});

test('main sitemap contains only unique HTTPS canonical URLs and the previously omitted public pages', () => {
  const urls = [...main.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  assert.ok(urls.length >= 120);
  assert.equal(new Set(urls).size, urls.length);
  assert.ok(urls.every(url => url.startsWith('https://nexusnovatools.com/')));
  for (const url of [
    'https://nexusnovatools.com/articles/youtube-thumbnail-size-guide-2026.html',
    'https://nexusnovatools.com/articles/typing-speed-wpm-accuracy-guide.html',
    'https://nexusnovatools.com/articles/simple-invoice-checklist-guide.html',
    'https://nexusnovatools.com/humanproof.html',
    'https://nexusnovatools.com/guides/weighted-decision-matrix.html'
  ]) assert.ok(urls.includes(url), url);
});
