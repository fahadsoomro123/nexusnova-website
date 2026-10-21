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

test('homepage introduces a realistic SEO audit workspace before tool discovery', () => {
  const header = html.indexOf('</header>');
  const main = html.indexOf('<main class="nn-main">');
  const banner = html.indexOf('class="nn-audit-launch nn-shell"');
  const toolsHeading = html.indexOf('<h2 id="new-tools-title">');
  assert.ok(header >= 0 && main > header && banner > main && banner < toolsHeading);
  assert.match(html, /See what search engines see\./);
  assert.match(html, /class="nn-audit-workspace"/);
  assert.match(html, /class="nn-audit-sidebar"/);
  assert.match(html, /class="nn-audit-mini-metrics"/);
  assert.match(html, /Your report will appear here/);
  assert.match(html, /Run an audit to populate findings, evidence and affected URLs\./);
  assert.match(html, /id="nnAuditHomeForm"/);
  assert.match(html, /id="nnAuditLaunchUrl"/);
  assert.match(html, /id="nnAuditClaimVoucher"/);
  assert.match(html, /assets\/css\/seo-audit-launch\.css\?v=20261021-v6/);
  assert.match(html, /assets\/js\/seo-audit-launch\.js\?v=20261021-v3/);
  assert.doesNotMatch(html, /Missing page title|Meta description review|Image alt-text review/);
});

test('homepage URL handoff validates HTTP(S) URLs and Audit Studio prefills without auto-running', () => {
  assert.match(js, /nnAuditHomeForm/);
  assert.match(js, /new URL\(candidate\)/);
  assert.match(js, /target\.searchParams\.set\('url',parsed\.href\)/);
  assert.match(auditHtml, /new URLSearchParams\(window\.location\.search\)\.get\('url'\)/);
  assert.match(auditHtml, /input\.value = target\.href/);
  assert.match(auditHtml, /history\.replaceState/);
});

test('voucher claims require backend confirmation and fail closed on preview connectivity errors', () => {
  assert.match(js, /\/api\/promotions\/active/);
  assert.match(js, /\/api\/promotions\/claim/);
  assert.match(js, /nexusnova_audit_session_v1/);
  assert.match(js, /nexusnova_audit_voucher_v1/);
  assert.match(js, /ALLOWED_ORIGINS\.has\(window\.location\.origin\)/);
  assert.match(js, /payload\.ok===true/);
  assert.match(js, /campaign\.terms/);
  assert.match(js, /campaign\.remainingClaims/);
  assert.match(js, /credentials:'omit'/);
  assert.match(js, /voucherServiceReady=false/);
  assert.match(js, /isolated voucher service is not responding in this preview/);
  assert.match(js, /No code was issued/);
  assert.doesNotMatch(js, /setInterval|countdown|fakeUserCount|remainingClaims\s*[:=]\s*\d+/i);
});

test('real workspace styling is responsive and accessible with a restrained premium offer', () => {
  assert.match(css, /@media\(max-width:600px\)/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /--audit-blue:#3157b7/);
  assert.match(css, /nn-audit-workspace-layout/);
  assert.match(css, /nn-audit-report-card/);
  assert.match(css, /radial-gradient\(circle at 91% 6%/);
  assert.match(css, /linear-gradient\(125deg,#142239/);
  assert.match(css, /background:#f7f2e8/);
  assert.doesNotMatch(css, /--audit-lime|#dfff00|acid-lime/i);
  assert.match(js, /showOfferUnavailable/);
  assert.match(js, /NEXUSNOVA \| LAUNCH PRIVILEGE/);
});

test('review preview MutationObserver cannot create a self-triggering DOM mutation loop', () => {
  const mock = fs.readFileSync(path.join(root, 'assets/js/seo-audit-studio-preview-mock.js'), 'utf8');
  assert.match(mock, /if\(pill\.textContent!==['"]Preview simulation · sample data['"]\)pill\.textContent=/);
  assert.match(mock, /if\(pill\.className!==['"]source-pill partial['"]\)pill\.className=/);
  assert.match(mock, /if\(desc&&desc\.textContent!==description\)desc\.textContent=description/);
  assert.match(mock, /if\(top&&document\.body\.classList\.contains\('report-is-paid'\)&&top\.textContent!==topText\)top\.textContent=topText/);
  assert.match(mock, /observer\.observe\(reportSection,\{attributes:true,attributeFilter:\[['"]hidden['"]\]\}\)/);
  assert.match(mock, /observer\.observe\(document\.body,\{attributes:true,attributeFilter:\[['"]class['"]\]\}\)/);
  assert.doesNotMatch(mock, /observer\.observe\(document\.body,\{(?:childList|subtree):true/);
});

test('review preview audit requests have bounded waits and always release the loading UI', () => {
  assert.ok(auditHtml.indexOf('seo-audit-studio-preview-mock.js?v=20261021-demo3') < auditHtml.indexOf('// Isolated NexusNova Audit Worker'));
  assert.match(auditHtml, /async function requestAuditSession\(callerSignal\)/);
  assert.match(auditHtml, /const timeoutMs = isReviewPreview \? 8000 : 20000/);
  assert.match(auditHtml, /const requestTimeoutMs = isReviewPreview \? 12000 : 240000/);
  assert.match(auditHtml, /payload\.ok!==true \|\| typeof payload\.auditId!=='string' \|\| !payload\.preview/);
  assert.match(auditHtml, /clearInterval\(state\.progressTimer\); state\.progressTimer = null;/);
  assert.match(auditHtml, /Voucher redemption must not hold the audit preview spinner open/);
  assert.doesNotMatch(auditHtml, /window\.setTimeout\(async\(\)=>\{\s*renderReport\(payload\.preview\)/);
});
