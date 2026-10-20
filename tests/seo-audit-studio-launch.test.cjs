'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'assets/css/seo-audit-launch.css'), 'utf8');
const js = fs.readFileSync(path.join(root, 'assets/js/seo-audit-launch.js'), 'utf8');

test('homepage uses a high-visibility SEO Audit Studio launch hero below navigation and before the tools', () => {
  const header = html.indexOf('</header>');
  const main = html.indexOf('<main class="nn-main">');
  const banner = html.indexOf('class="nn-audit-launch nn-shell"');
  const h1 = html.indexOf('<h1 id="new-tools-title">');
  assert.ok(header >= 0 && main > header && banner > main && banner < h1, 'launch hero belongs directly below the main navigation and before tool discovery');
  assert.match(html, /Stop guessing\.[\s\S]{0,120}Know what to fix/);
  assert.match(html, /Claim free full-audit voucher/);
  assert.match(html, /id="nnAuditVoucherResult"/);
  assert.match(html, /href="\/seo-audit-studio\.html"/);
  assert.match(html, /assets\/css\/seo-audit-launch\.css\?v=20261020-v2/);
  assert.match(html, /assets\/js\/seo-audit-launch\.js\?v=20261020-v2/);
});

test('launch offer and voucher claim are sourced from the audit Worker and session-scoped', () => {
  assert.match(js, /\/api\/promotions\/active/);
  assert.match(js, /\/api\/promotions\/claim/);
  assert.match(js, /nexusnova_audit_session_v1/);
  assert.match(js, /nexusnova_audit_voucher_v1/);
  assert.match(js, /allowedOrigins\.has\(window\.location\.origin\)/);
  assert.match(js, /payload\.ok===true/);
  assert.match(js, /campaign\.terms/);
  assert.match(js, /campaign\.remainingClaims/);
  assert.match(js, /credentials:'omit'/);
  assert.match(js, /No fake countdowns/);
  assert.doesNotMatch(js, /setInterval|countdown|fakeUserCount|remainingClaims\s*[:=]\s*\d+/i);
  assert.match(css, /@media\(max-width:520px\)/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /linear-gradient/);
  assert.match(html, /nn-audit-launch-visual/);
});
