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
  assert.match(html, /Auto-fix with GitHub/);
  assert.match(html, /fixIssuesConsentText/);
  assert.match(html, /No payment was taken/);
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
  assert.match(html, /preview ready below\. No payment has been taken/);
});
test('Fix Issues offers a platform-guided path with an exact preview and no manual checkout', () => {
  assert.match(html, /id="fixIssuesGuidedBtn"/);
  assert.match(html, /Other platforms · free guidance/);
  assert.match(html, /\/api\/fix-issues\/plan\/guided/);
  assert.match(html, /\/manual-package/);
  assert.match(html, /deliveryMode === 'manual'/);
  assert.match(html, /Download my Fix Kit/);
  assert.match(html, /Automatic publishing is not supported for this platform yet/i);
  assert.match(html, /payButton\.hidden = isManual \|\| !payload\.canCheckout/);
  assert.match(html, /no payment was started/i);
  assert.match(html, /platform-specific steps/i);
});
test('paid auto-publish failure exposes a fallback download without claiming live fixes', () => {
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  const fixController = scripts.at(-1);
  assert.ok(fixController.includes("!['manual', 'manual_fallback'].includes"));
  assert.match(fixController, /Download fallback Fix Kit/);
  assert.match(fixController, /Download recovery instructions/);
  assert.match(fixController, /typeof payload\.content === 'string'/);
  assert.match(fixController, /EXACT SEO VALUES/);
  assert.match(fixController, /No live change is claimed/);
  assert.ok(fixController.includes("verification.deliveryMode === 'manual_fallback'"));
  assert.ok(fixController.includes("!['manual', 'manual_fallback'].includes"));
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

test('Guided fixes use a short, plain-language path for non-GitHub hosting', () => {
  assert.match(html, /Other platforms receive free guidance only/i);
  assert.match(html, /Other platforms · free guidance/);
  assert.match(html, /guidanceAvailable = payload\.guidanceAvailable === true/);
  assert.match(html, /guidedButton\.disabled = busy \|\| !guidanceAvailable/);
  assert.match(html, /Auto-fix with GitHub/);
});
