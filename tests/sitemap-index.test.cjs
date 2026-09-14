const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const index = fs.readFileSync('sitemap-index.xml', 'utf8');
const robots = fs.readFileSync('robots.txt', 'utf8');

function expectSitemap(url) {
  assert.match(index, new RegExp(`<loc>${url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</loc>`));
}

test('central sitemap index exposes every non-empty public sitemap', () => {
  expectSitemap('https://nexusnovatools.com/sitemap.xml');
  expectSitemap('https://nexusnovatools.com/sitemap-content-2026-08-25.xml');
  expectSitemap('https://nexusnovatools.com/sitemap-content-2026-08-27.xml');
  expectSitemap('https://nexusnovatools.com/sitemap-daily-tools.xml');
  expectSitemap('https://nexusnovatools.com/humanproof-sitemap.xml');
  expectSitemap('https://nexusnovatools.com/sitemap-new-tools.xml');
  expectSitemap('https://nexusnovatools.com/sitemap-recent.xml');
  assert.doesNotMatch(index, /sitemap-humanproof\.xml/);
  assert.doesNotMatch(index, /sitemap-autopilot\.xml/);
  assert.doesNotMatch(index, /sitemap-content-2026-08-26\.xml/);
  assert.doesNotMatch(index, /sitemap-live\.xml/);
});

test('robots advertises the central sitemap index and canonical main sitemap', () => {
  assert.match(robots, /^Sitemap: https:\/\/nexusnovatools\.com\/sitemap-index\.xml$/m);
  assert.match(robots, /^Sitemap: https:\/\/nexusnovatools\.com\/sitemap\.xml$/m);
});
