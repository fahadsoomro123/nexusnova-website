'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'assets/css/seo-audit-launch.css'), 'utf8');

test('homepage audit URL input uses the full available row width on desktop and mobile', () => {
  assert.match(html, /<form id="nnAuditHomeForm"[^>]*>[\s\S]*?<div class="nn-audit-url-row">\s*<input id="nnAuditLaunchUrl"[\s\S]*?<button type="submit">Continue/);
  assert.match(html, /assets\/css\/seo-audit-launch\.css\?v=20261027-cls-reserve-v1/);
  assert.match(css, /\.nn-audit-url-row\{display:grid;grid-template-columns:minmax\(0,1fr\) auto;gap:0;align-items:center;min-width:0\}/);
  assert.match(css, /\.nn-audit-url-row input\{[^}]*border:1px solid #ccd6e5;border-right:0;border-radius:4px 0 0 4px/);
  assert.match(css, /@media\(max-width:600px\)\{[\s\S]*?\.nn-audit-url-row\{grid-template-columns:minmax\(0,1fr\);gap:7px\}/);
  assert.match(css, /\.nn-audit-url-row input\{height:42px;border:1px solid #ccd6e5;border-radius:4px\}/);
  assert.match(css, /\.nn-audit-url-row button\{grid-column:auto;width:100%;min-height:42px;margin-top:0;border-radius:4px\}/);
  assert.doesNotMatch(css, /\.nn-audit-url-row\{[^}]*grid-template-columns:25px minmax\(0,1fr\) auto/);
  assert.doesNotMatch(css, /\.nn-audit-url-row\{grid-template-columns:22px minmax\(0,1fr\)/);
});