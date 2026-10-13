'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('FBR ATL guide is indexable, canonical, sourced and privacy-conscious', () => {
  const page = fs.readFileSync('guides/fbr-atl-status.html', 'utf8');
  assert.ok(page.includes('<title>FBR ATL Status Guide: CNIC, NTN &amp; Missing Results | NexusNova Tools</title>'));
  assert.ok(page.includes('<meta name="robots" content="index,follow'));
  assert.ok(page.includes('<link rel="canonical" href="https://nexusnovatools.com/guides/fbr-atl-status.html">'));
  assert.ok(page.includes('https://iris.fbr.gov.pk/'));
  assert.ok(page.includes('https://www.fbr.gov.pk/categ/active-taxpayer-list-income-tax/51147/30859/71169'));
  assert.ok(page.includes('https://www.fbr.gov.pk/download-atl/132041'));
  assert.ok(page.includes('https://www.fbr.gov.pk/press-release/174151'));
  assert.ok(page.includes('https://www.fbr.gov.pk/atl-sales-tax/163223'));
  assert.ok(page.includes('ATL [13-digit CNIC]'));
  assert.ok(page.includes('ATL [7-digit NTN]'));
  assert.ok(page.includes('does not replace official confirmation'));
  assert.ok(page.includes('Never share your IRIS password or one-time code'));
  assert.ok(page.includes('href="../fbr-atl-status-checker.html"'));
  const start = page.indexOf('<main>');
  const end = page.indexOf('</main>', start);
  const body = page.slice(start, end + '</main>'.length);
  const words = (body.replace(/<[^>]+>/g, ' ').match(/[a-z0-9'-]+/gi) || []).length;
  assert.ok(words >= 800, 'guide must contain useful explanatory content');
});

test('FBR checker cross-links to the new troubleshooting guide', () => {
  const page = fs.readFileSync('fbr-atl-status-checker.html', 'utf8');
  assert.ok(page.includes('href="guides/fbr-atl-status.html"'));
});

test('new FBR guide is listed exactly once in the sitemap and linked from Guides hub', () => {
  const sitemap = fs.readFileSync('sitemap.xml', 'utf8');
  const hub = fs.readFileSync('guides.html', 'utf8');
  const canonical = 'https://nexusnovatools.com/guides/fbr-atl-status.html';
  assert.equal(sitemap.split(canonical).length - 1, 1);
  assert.ok(hub.includes('href="guides/fbr-atl-status.html"'));
});
