'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'assets/css/seo-audit-launch.css'), 'utf8');
const js = fs.readFileSync(path.join(root, 'assets/js/seo-audit-launch.js'), 'utf8');
const auditHtml = fs.readFileSync(path.join(root, 'seo-audit-studio.html'), 'utf8');

test('homepage audit launch uses a practical URL-first layout before tool discovery', () => {
  const header = html.indexOf('</header>');
  const main = html.indexOf('<main class="nn-main">');
  const banner = html.indexOf('class="nn-audit-launch nn-shell"');
  const toolsHeading = html.indexOf('<h2 id="new-tools-title">');
  assert.ok(header >= 0 && main > header && banner > main && banner < toolsHeading, 'audit launch belongs directly below navigation and before tool discovery');
  assert.match(html, /Find what's<br><span>holding your site back\.<\/span>/);
  assert.match(html, /id="nnAuditHomeForm"/);
  assert.match(html, /id="nnAuditLaunchUrl"/);
  assert.match(html, /Claim a free full-audit voucher/);
  assert.match(html, /id="nnAuditVoucherResult"/);
  assert.match(html, /href="\/seo-audit-studio\.html"/);
  assert.match(html, /assets\/css\/seo-audit-launch\.css\?v=20261021-v2/);
  assert.match(html, /assets\/js\/seo-audit-launch\.js\?v=20261021-v1/);
  assert.match(html, /EXAMPLE REPORT · NOT LIVE RESULTS/);
  assert.match(html, /Report layout preview\. Your results are generated after you run an audit\./);
});

test('homepage URL handoff validates HTTP(S) URLs and Audit Studio prefills without auto-running', () => {
  assert.match(js, /nnAuditHomeForm/);
  assert.match(js, /new URL\(candidate\)/);
  assert.match(js, /target\.searchParams\.set\('url',parsed\.href\)/);
  assert.match(auditHtml, /new URLSearchParams\(window\.location\.search\)\.get\('url'\)/);
  assert.match(auditHtml, /input\.value = target\.href/);
  assert.match(auditHtml, /history\.replaceState/);
});

test('voucher offer remains backend-driven, session-scoped and free of invented scarcity', () => {
  assert.match(js, /\/api\/promotions\/active/);
  assert.match(js, /\/api\/promotions\/claim/);
  assert.match(js, /nexusnova_audit_session_v1/);
  assert.match(js, /nexusnova_audit_voucher_v1/);
  assert.match(js, /ALLOWED_ORIGINS\.has\(window\.location\.origin\)/);
  assert.match(js, /payload\.ok===true/);
  assert.match(js, /campaign\.terms/);
  assert.match(js, /campaign\.remainingClaims/);
  assert.match(js, /credentials:'omit'/);
  assert.match(js, /availability and expiry must come from the backend/);
  assert.doesNotMatch(js, /setInterval|countdown|fakeUserCount|remainingClaims\s*[:=]\s*\d+/i);
});

test('audit launch visual system is responsive, accessible and distinct from the rejected concept', () => {
  assert.match(css, /@media\(max-width:560px\)/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /--nn-audit-blue:#2457d6/);
  assert.match(css, /nn-audit-preview-window/);
  assert.match(css, /nn-audit-preview-queue/);
  assert.doesNotMatch(css, /linear-gradient|radial-gradient|font-family:Georgia/i);
});
