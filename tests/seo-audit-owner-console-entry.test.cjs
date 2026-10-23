'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const auditHtml = fs.readFileSync(path.join(root, 'seo-audit-studio.html'), 'utf8');
const homepage = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const adminHtml = fs.readFileSync(path.join(root, 'seo-audit-studio-admin.html'), 'utf8');

test('Audit Studio footer exposes a clear Owner Console entry without exposing credentials', () => {
  assert.match(auditHtml, /<a href="\/seo-audit-studio-admin\.html" rel="nofollow" aria-label="Owner-only SEO Audit Studio administration">Owner Console<\/a>/);
  assert.match(homepage, /href="\/seo-audit-studio-admin\.html"[^>]*>Owner Console<\/a>/, 'homepage exposes Owner Console next to Open Audit Studio');
  assert.match(adminHtml, /<meta name="robots" content="noindex,nofollow,noarchive">/);
  assert.match(adminHtml, /<input id="ownerTokenInput" type="password"/);
  assert.match(adminHtml, /headers\.set\('X-Owner-Admin-Token',state\.token\)/);
  assert.doesNotMatch(adminHtml, /(?:gho_|sk_live_|whsec_)[A-Za-z0-9_-]{12,}/);
});
