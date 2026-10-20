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
  assert.ok(page.includes("promotionRedemptionId:state.promotionRedemptionId"));
  assert.ok(page.includes('id="cryptoPriceDescription"'));
  assert.ok(page.includes('payload.minimumBufferUsd'));
  assert.ok(promoCss.includes('@media(max-width:600px)'));
  assert.ok(promoCss.includes('#promotionCodeStatus[hidden]'));
});

test('promotion status and discount claims come only from backend responses', () => {
  assert.ok(page.includes("if(result.freeReport===true)"));
  assert.ok(page.includes("window.sessionStorage.setItem(AUDIT_VOUCHER_KEY,result.code)"));
  assert.ok(page.includes("state.voucherAutoAttemptedAuditId!==state.auditId"));
  assert.ok(page.includes("apiPost('/api/promotions/claim',{})"));
  assert.ok(page.includes('result.estimatedDiscountMinor'));
  assert.ok(page.includes('result.estimatedAmountDueMinor'));
  assert.ok(page.includes('The server recalculates the final amount'));
  assert.ok(!/remainingClaims\s*[:=]\s*\d+/.test(page));
  assert.ok(!/freeReport\s*=\s*true/.test(page));
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
  assert.ok(admin.includes('option value="percent"'));
  assert.ok(admin.includes('option value="fixed"'));
  assert.ok(admin.includes('option value="free_report"'));
  assert.ok(admin.includes("status:'draft'") || admin.includes("status:\"draft\"") || admin.includes('Draft by default'));
});


