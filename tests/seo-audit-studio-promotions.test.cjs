'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const page = fs.readFileSync(path.join(root, 'seo-audit-studio.html'), 'utf8');
const admin = fs.readFileSync(path.join(root, 'seo-audit-studio-admin.html'), 'utf8');
const promoCss = fs.readFileSync(path.join(root, 'assets/css/seo-audit-promotions.css'), 'utf8');
test('SEO Audit Studio provides a server-validated code input and separate crypto-price wording', () => {
  assert.ok(page.includes('id="promotionCodeInput"'));
  assert.ok(page.includes('id="redeemPromoBtn"'));
  assert.ok(page.includes('id="promotionCodeStatus"'));
  assert.ok(page.includes('id="claimLaunchVoucherBtn"'));
  assert.ok(page.includes("apiPost('/api/promotions/claim',{})"));
  assert.ok(page.includes("apiPost('/api/promotions/redeem',{auditId:state.auditId,code})"));
  assert.ok(page.includes("result.freeReport!==true"));
  assert.ok(page.includes('id="cryptoPriceDescription"'));
  assert.ok(page.includes('payload.minimumBufferUsd'));
  assert.doesNotMatch(page, /apiPost\('\/api\/payments\/card-session',\{auditId:state\.auditId,promotionRedemptionId/);
  assert.ok(promoCss.includes('@media(max-width:600px)'));
  assert.ok(promoCss.includes('#promotionCodeStatus[hidden]'));
});

test('voucher claim and redemption use only a free full-report entitlement, not payment discounts', () => {
  assert.ok(page.includes("apiPost('/api/promotions/claim',{})"));
  assert.ok(page.includes("apiPost('/api/promotions/redeem',{auditId:state.auditId,code})"));
  assert.ok(page.includes("if(result.freeReport!==true)"));
  assert.ok(page.includes("state.voucherAutoAttemptedAuditId===state.auditId"));
  assert.ok(page.includes("window.sessionStorage.removeItem(AUDIT_VOUCHER_KEY)"));
  assert.ok(!page.includes('estimatedDiscountMinor'));
  assert.ok(!page.includes('estimatedAmountDueMinor'));
  assert.ok(!page.includes('The server recalculates the final amount'));
  assert.doesNotMatch(page, /apiPost\('\/api\/payments\/card-session',\{auditId:state\.auditId,promotionRedemptionId/);
  assert.doesNotMatch(page, /setInterval|countdown|fakeUserCount/i);
});

test('claimed full-audit voucher auto-unlocks after an audit or when the existing preview is restored', () => {
  assert.ok(page.includes('async function applySavedVoucherForCurrentAudit()'));
  assert.ok(page.includes('await applySavedVoucherForCurrentAudit();'));
  assert.ok(page.includes("code=window.sessionStorage.getItem(AUDIT_VOUCHER_KEY)||''"));
  const runStart = page.indexOf('const runAudit = async');
  const restoreStart = page.indexOf('const restoreLatestAudit = async');
  assert.ok(runStart >= 0 && restoreStart >= 0);
  assert.ok(page.indexOf('await applySavedVoucherForCurrentAudit();', runStart) > runStart);
  assert.ok(page.indexOf('await applySavedVoucherForCurrentAudit();', restoreStart) > restoreStart);
  assert.ok(page.includes("if(state.paid)"));
  assert.ok(page.includes("claimButton.textContent='Full audit unlocked'"));
});

test('owner console is noindex and holds its token only in runtime memory', () => {
  assert.match(admin, /name="robots" content="noindex,nofollow,noarchive"/);
  assert.ok(admin.includes("const state={token:''"));
  assert.ok(admin.includes("headers.set('X-Owner-Admin-Token',state.token)"));
  assert.ok(admin.includes("state.token=''"));
  assert.doesNotMatch(admin, /localStorage|sessionStorage|document\.cookie/);
  assert.doesNotMatch(admin, /AUDIT_OWNER_ADMIN_TOKEN\s*[:=]\s*['"][^'"]+['"]/);
  assert.ok(admin.includes('/api/admin/audits'));
  assert.ok(admin.includes('/api/admin/promotions/campaigns'));
  assert.ok(admin.includes('/api/admin/promotions/codes/'));
  assert.ok(admin.includes('/api/admin/promotions/redeem') === false);
  assert.ok(admin.includes('<option value="free_report" selected>Free full technical report (launch voucher)</option>'));
  assert.doesNotMatch(admin, /option value="percent"|option value="fixed"/);
  assert.match(admin, /id="offerValue" type="number" min="100" max="100" step="1" value="100" required disabled/);
  assert.match(admin, /Payment discounts are not enabled/);
  assert.ok(admin.includes("status:'draft'") || admin.includes("status:\"draft\"") || admin.includes('Draft by default'));
});


