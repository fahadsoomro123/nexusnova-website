'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'seo-audit-studio.html'), 'utf8');
const backendModulePath = path.resolve(root, '..', 'nexusnova-fix-issues-phase2-backend-20261023', 'cloudflare', 'fix-issues.js');

test('Fix Issues is initially hidden and reveals only after a real audit-report-ready event', () => {
  assert.match(html, /<section id="fixIssuesPanel" class="fix-issues-panel panel"[^>]*\shidden>/);
  assert.match(html, /nexusnova:audit-report-ready/);
  assert.match(html, /detail\.mode === 'sample'/);
  assert.match(html, /if \(!detail\.completeEvidence\)/);
  assert.match(html, /panel\.hidden = false/);
});

test('Fix Issues reserves the US$5 checkout for direct automatic fixes and keeps a consent gate', () => {
  assert.match(html, /US\$5.*direct auto-fixes only/);
  assert.match(html, /id="fixIssuesPayBtn"[^>]*disabled[^>]*>Pay \$5\.00 USD and apply fixes/);
  assert.match(html, /id="fixIssuesAccept" type="checkbox"/);
  assert.match(html, /accept\.checked && plan\.changes/);
  assert.match(html, /acceptedPlan: true/);
  assert.match(html, /changes.length === 0 \|\| !payload.canCheckout \|\| !accept.checked/);
  assert.match(html, /Connect website for automatic fixes/);
  assert.match(html, /fixIssuesConsentText/);
  assert.match(html, /No payment or website change|No payment was taken|No charge was created|no payment has been taken/i);
});

test('Fix Issues can verify an existing GitHub installation without a repeated install redirect', () => {
  assert.match(html, /id="fixIssuesInstallationId"/);
  assert.match(html, /id="fixIssuesExistingConnectBtn"/);
  assert.match(html, /\/api\/fix-issues\/connect\/existing/);
  assert.match(html, /matching website domain/);
  assert.match(html, /github_installation_verification_failed/);
});
test('one-click connection previews the sole verified repository and never enables payment before consent', () => {
  assert.match(html, /repositories\.length === 1/);
  assert.match(html, /api\('\/api\/fix-issues\/connect\/repo'/);
  assert.match(html, /api\('\/api\/fix-issues\/plan'/);
  assert.match(html, /No safe change is needed on this page, so checkout stays disabled/);
  assert.match(html, /automatic repair plan is ready|preview ready below\. No payment has been taken/i);
});
test('Fix Issues never offers manual guidance or Fix Kit downloads', () => {
  assert.doesNotMatch(html, /fixIssuesGuidedBtn/);
  assert.doesNotMatch(html, /Other platforms · free guidance/i);
  assert.doesNotMatch(html, /\/api\/fix-issues\/plan\/guided/);
  assert.doesNotMatch(html, /\/manual-package/);
  assert.doesNotMatch(html, /Download (?:my |fallback )?Fix Kit/i);
  assert.doesNotMatch(html, /Download recovery instructions/i);
  assert.match(html, /This audit has no currently supported, verified automatic repair plan/);
  assert.match(html, /The issue remains unresolved/);
  assert.match(html, /No payment or website change|No payment was taken|No charge was created|no payment has been taken/i);
});

test('Phase 2 has a separate payment order and never reuses report unlock checkout or voucher entitlements', () => {
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  const fixController = scripts.at(-1);
  assert.ok(fixController);
  assert.match(fixController, /\/api\/fix-issues\/checkout/);
  assert.match(fixController, /\/api\/fix-issues\/orders\//);
  assert.match(fixController, /checkout redirect alone is not confirmation|A return from Safepay is not proof of payment/i);
  assert.doesNotMatch(fixController, /\/api\/payments\/card-session|\/api\/promotions\/redeem|\/api\/audits\/[^'"]+\/full/);
  assert.match(html, /The report\/voucher entitlement is unchanged/);
});

test('Fix Issues shows proposed changes, verification and rollback from backend job state', () => {
  assert.match(html, /id="fixIssuesChangeList"/);
  assert.match(html, /id="fixIssuesJob"/);
  assert.match(html, /Live-page verification is still pending/);
  assert.match(html, /rollbackAvailable/);
  assert.match(html, /\/api\/fix-issues\/jobs\/[\s\S]*?\/rollback/);
  assert.match(html, /repository changed after planning|repository version/i);
});

test('Fix Issues browser controller does not hold GitHub installation credentials', () => {
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  const fixController = scripts.at(-1);
  assert.doesNotMatch(fixController, /BEGIN PRIVATE KEY|FIX_ISSUES_GITHUB_APP_PRIVATE_KEY|gh[pousr]_[A-Za-z0-9]{24,}/);
  assert.match(fixController, /token\(\)/);
  assert.match(fixController, /credentials: 'omit'/);
});

test('Fix Issues requires a direct writable source and verifies supported repairs', () => {
  assert.match(html, /Connect website for automatic fixes/);
  assert.match(html, /matching website domain/);
  assert.match(html, /Only the exact listed edits will be committed after payment verification/);
  assert.match(html, /live page must confirm the exact planned values/);
  assert.match(html, /This finding remains unresolved until a tested automatic repair can be applied and verified/);
  assert.doesNotMatch(html, /guidanceAvailable/);
});
