const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const index = fs.readFileSync('sitemap-index.xml', 'utf8');
const robots = fs.readFileSync('robots.txt', 'utf8');

function expectSitemap(url) {
  assert.match(index, new RegExp(`<loc>${url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</loc>`));
}

test('central sitemap index includes core discovery sitemaps', () => {
  expectSitemap('https://nexusnovatools.com/sitemap.xml');
  expectSitemap('https://nexusnovatools.com/sitemap-new-tools.xml');
  expectSitemap('https://nexusnovatools.com/sitemap-live.xml');
  expectSitemap('https://nexusnovatools.com/sitemap-recent.xml');
});

test('robots advertises the central sitemap index', () => {
  assert.match(robots, /^Sitemap: https:\/\/nexusnovatools\.com\/sitemap-index\.xml$/m);
});
