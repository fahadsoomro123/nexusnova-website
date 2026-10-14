'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const policyPath = path.join(root, 'ADSENSE-REMEDIATION-REPORT-2026-09-11.md');
const sitemapPath = path.join(root, 'sitemap.xml');

function approvedNoindexPaths() {
  const report = fs.readFileSync(policyPath, 'utf8');
  const heading = '## NOINDEX — exact pages';
  const start = report.indexOf(heading);
  assert.notEqual(start, -1, 'The approved AdSense report must retain its NOINDEX section');
  const remainder = report.slice(start + heading.length);
  const nextHeading = remainder.search(/^## /m);
  const section = nextHeading >= 0 ? remainder.slice(0, nextHeading) : remainder;
  const tick = String.fromCharCode(96);
  const bullet = new RegExp('^\\s*-\\s*' + tick + '([^' + tick + ']+\\.html)' + tick + '\\s*$', 'gm');
  return [...section.matchAll(bullet)].map(match => match[1]);
}

test('all pages in the approved AdSense NOINDEX plan stay noindex and out of sitemap.xml', () => {
  const planned = approvedNoindexPaths();
  assert.equal(planned.length, 74, 'The approved NOINDEX plan changed; review the policy explicitly before updating this test');

  const sitemapText = fs.readFileSync(sitemapPath, 'utf8');
  const sitemapUrls = [...sitemapText.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)].map(match => match[1].trim());
  assert.equal(new Set(sitemapUrls).size, sitemapUrls.length, 'The main sitemap must not contain duplicate URLs');

  for (const relative of planned) {
    const file = path.join(root, relative);
    assert.ok(fs.existsSync(file), 'Approved NOINDEX target is missing: ' + relative);

    const html = fs.readFileSync(file, 'utf8');
    const robotsTag = (html.match(/<meta\b(?=[^>]*\bname=["']robots["'])[^>]*>/i) || [])[0];
    assert.ok(robotsTag, relative + ' must declare a robots meta tag');
    const content = (robotsTag.match(/\bcontent=["']([^"']*)["']/i) || [])[1] || '';
    assert.match(content, /^noindex(?:\s*,|\s*$)/i, relative + ' must remain noindex');

    const canonicalUrl = 'https://nexusnovatools.com/' + relative;
    assert.ok(!sitemapUrls.includes(canonicalUrl), relative + ' must not be submitted in sitemap.xml');
  }
});
