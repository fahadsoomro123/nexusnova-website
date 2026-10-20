'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'assets/css/seo-audit-launch.css'), 'utf8');
const js = fs.readFileSync(path.join(root, 'assets/js/seo-audit-launch.js'), 'utf8');

test('homepage presents SEO Audit Studio launch CTA before the existing first section', () => {
  const header = html.indexOf('</header>');
  const main = html.indexOf('<main class="nn-main">');
  const banner = html.indexOf('class="nn-audit-launch nn-shell"');
  assert.ok(header >= 0 && banner > header && banner < main, 'launch banner must be immediately visible after site navigation');
  assert.match(html, /NEW LAUNCH[\s\S]{0,150}EARLY ACCESS/);
  assert.match(html, /Run Your Free Audit/);
  assert.match(html, /href="seo-audit-studio\.html"/);
  assert.match(html, /assets\/css\/seo-audit-launch\.css\?v=20261020-v1/);
  assert.match(html, /assets\/js\/seo-audit-launch\.js\?v=20261020-v1/);
});

test('limited-time offer details require a backend-confirmed campaign and actual remaining claims', () => {
  assert.match(js, /\/api\/promotions\/active/);
  assert.match(js, /payload\.ok === true/);
  assert.match(js, /campaign\.remainingClaims/);
  assert.match(js, /offerBox\.hidden = false/);
  assert.match(js, /Number\(campaign\.remainingClaims\) \+ ' claims remaining'/);
  assert.match(js, /credentials: 'omit'/);
  assert.match(js, /offerBox\.append/);
  assert.doesNotMatch(js, /setInterval|setTimeout|countdown|fakeUserCount|remainingClaims\s*[:=]\s*\d+/i);
  assert.match(css, /@media\(max-width:720px\)/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion/);
});
