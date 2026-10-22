'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const page = fs.readFileSync(path.join(root, 'seo-audit-studio.html'), 'utf8');
const admin = fs.readFileSync(path.join(root, 'seo-audit-studio-admin.html'), 'utf8');
const promoCss = fs.readFileSync(path.join(root, 'assets/css/seo-audit-promotions.css'), 'utf8');
const launchCss = fs.readFileSync(path.join(root, 'assets/css/seo-audit-launch.css'), 'utf8');
const launchJs = fs.readFileSync(path.join(root, 'assets/js/seo-audit-launch.js'), 'utf8');
const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

test('voucher is issued only by the active server campaign and optional sharing never claims verification', () => {
  assert.match(home, /class="nn-audit-voucher-terms"/);
  assert.match(home, /Sharing is optional and does not change voucher eligibility/);
  assert.match(home, /https:\/\/twitter\.com\/intent\/tweet/);
  assert.match(home, /https:\/\/www\.facebook\.com\/sharer\/sharer\.php/);
  assert.match(home, /Only server-issued vouchers are displayed/);
  assert.match(launchJs, /\/api\/promotions\/active/);
  assert.match(launchJs, /\/api\/promotions\/claim/);
  assert.match(launchJs, /payload.ok!==true/);
  assert.match(launchJs, /typeof payload\.code!=='string'/);
  assert.match(launchJs, /No code was issued/);
  assert.doesNotMatch(launchJs, /setInterval|countdown|fakeUserCount|verifiedFollow|shareVerified/i);
});

test('voucher claim and redemption stay separate and use the backend free-report entitlement', () => {
  assert.ok(page.includes('id="promotionCodeInput"'));
  assert.ok(page.includes('id="redeemPromoBtn"'));
  assert.ok(page.includes('id="claimLaunchVoucherBtn"'));
  assert.ok(page.includes("apiPost('/api/promotions/claim',{})"));
  assert.ok(page.includes("apiPost('/api/promotions/redeem',{auditId:state.auditId,code})"));
  assert.ok(page.includes('if(result.freeReport!==true)'));
  assert.ok(page.includes('state.voucherAutoAttemptedAuditId===state.auditId'));
  assert.ok(page.includes("window.sessionStorage.removeItem(AUDIT_VOUCHER_KEY)"));
  assert.doesNotMatch(page, /estimatedDiscountMinor|estimatedAmountDueMinor/);
  assert.doesNotMatch(page, /apiPost\('\/api\/payments\/card-session',\{auditId:state\.auditId,promotionRedemptionId/);
});

test('partial or unmeasured audits do not redeem vouchers or enable report checkout', () => {
  assert.match(page, /if\s*\(!hasCompleteReportEvidence\(state\.report\)\)\s*\{\s*setStatus\(status,\s*'Voucher redemption is paused/);
  assert.match(page, /if\s*\(!hasCompleteReportEvidence\(state\.report\)\)\s*\{/);
  assert.match(page, /No payment order will be created/);
  assert.match(page, /result\.freeReport!==true/);
});

test('saved vouchers are applied to the current audit once, not blindly unlocked on the client', () => {
  assert.match(page, /async function applySavedVoucherForCurrentAudit\(\)/);
  assert.match(page, /if\(!state\.auditId\|\|state\.paid\|\|state\.voucherAutoAttemptedAuditId===state\.auditId\)return false/);
  assert.match(page, /const result=await apiPost\('\/api\/promotions\/redeem',\{auditId:state\.auditId,code\}\)/);
  assert.match(page, /await unlockReport\(state\.auditId\)/);
  assert.match(page, /await applySavedVoucherForCurrentAudit\(\)/);
});

test('Owner Console is noindex, token stays in memory, and campaign offers are free-report only', () => {
  assert.match(admin, /name="robots" content="noindex,nofollow,noarchive"/);
  assert.match(admin, /const state=\{token:'',campaigns:\[\],codes:\[\],redemptions:\[\],audits:\[\]\}/);
  assert.match(admin, /headers\.set\('X-Owner-Admin-Token',state\.token\)/);
  assert.match(admin, /state\.token=''/);
  assert.doesNotMatch(admin, /localStorage|sessionStorage|document\.cookie/);
  assert.match(admin, /\/api\/admin\/promotions/);
  assert.match(admin, /\/api\/admin\/promotions\/campaigns/);
  assert.match(admin, /\/api\/admin\/promotions\/codes\//);
  assert.match(admin, /<option value="free_report" selected>/);
  assert.match(admin, /Payment discounts are not enabled/);
  assert.doesNotMatch(admin, /<option value="percent"|<option value="fixed"/);
});

test('promotion controls remain mobile-safe and never imply a successful fake checkout', () => {
  assert.match(promoCss, /@media\(max-width:600px\)/);
  assert.match(promoCss, /#promotionCodeStatus\[hidden\]/);
  assert.match(launchCss, /nn-audit-voucher-terms/);
  assert.match(launchCss, /nn-audit-share-link/);
  assert.match(page, /Unlocked only after server-side payment verification or a valid voucher/i);
  assert.match(page, /only after server-side payment verification or a valid voucher/i);
});
