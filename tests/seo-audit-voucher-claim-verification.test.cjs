'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const homepage = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const launchJs = fs.readFileSync(path.join(root, 'assets/js/seo-audit-launch.js'), 'utf8');
const owner = fs.readFileSync(path.join(root, 'seo-audit-studio-admin.html'), 'utf8');

test('homepage exposes the real voucher verification box with checklist, proof URL and terms consent', () => {
  assert.match(homepage, /id="nnAuditClaimPanel"[^>]*hidden/);
  assert.match(homepage, /id="nnAuditReadyPost"[^>]*readonly/);
  assert.match(homepage, /id="nnAuditCopyReadyPost"/);
  assert.match(homepage, /Campaign ref:/);
  assert.match(homepage, /id="nnAuditReadyPostCount"/);
  const postBlock = launchJs.slice(launchJs.indexOf('const postText=['), launchJs.indexOf('readyPostTextarea.value=postText;'));
  assert.ok(postBlock.includes('One hub. More done.'));
  assert.ok(postBlock.includes('NexusNova Tools brings useful online tools, guides and digital resources together in one place.'));
  assert.ok(postBlock.includes('https://nexusnovatools.com/'));
  assert.ok(postBlock.includes("Campaign ref: '+activeChallengeReference"));
  assert.ok(launchJs.includes('function countXWeightedCharacters'));
  assert.ok(launchJs.includes('xLength>250'));
  assert.ok(launchJs.includes("Standard X post: '+xLength+'/280 weighted characters"));
  assert.match(homepage, /id="nnAuditClaimRequirements"/);
  assert.match(homepage, /id="nnAuditClaimForm"/);
  assert.match(homepage, /id="nnAuditProofUrl"[^>]*type="url"[^>]*required/);
  assert.match(homepage, /Paste your social post URL/);
  assert.match(homepage, /id="nnAuditTermsAccepted"[^>]*type="checkbox"[^>]*required/);
  assert.match(homepage, /id="nnAuditCheckClaim"/);
  assert.match(homepage, /A supported automatic check needs both the NexusNova link and your reference/);
  assert.match(homepage, /Verify post &amp; unlock voucher/);
  assert.match(homepage, /seo-audit-launch\.js\?v=20261026-live-cls-a11y-v1/);
});

test('visitor claim submission includes exact campaign, completed steps, public proof and accepted terms', () => {
  const submit = launchJs.slice(launchJs.indexOf('async function submitClaimRequest'), launchJs.indexOf("if(claimForm)claimForm.addEventListener"));
  assert.match(submit, /activeCampaign\.claimEnabled!==true/);
  assert.match(submit, /completedRequirements/);
  assert.match(submit, /proofUrl:parsed\.href/);
  assert.match(submit, /challengeReference:activeChallengeReference/);
  assert.match(submit, /hasValidShareChallenge\(\)/);
  assert.match(launchJs, /\/api\/promotions\/claim-challenge/);
  assert.match(homepage, /Prepare &amp; copy ready post/);
  assert.match(submit, /termsAccepted:termsAcceptedInput\.checked/);
  assert.match(submit, /\/api\/promotions\/claim/);
  assert.match(submit, /payload\.status!=='pending'/);
  assert.match(submit, /pendingClaimId=payload\.claimId/);
  assert.doesNotMatch(submit, /window\.sessionStorage\.setItem\(VOUCHER_KEY,payload\.code\)/);
});

test('a pending request cannot unlock a voucher; the browser only stores code returned by approved status', () => {
  const status = launchJs.slice(launchJs.indexOf('async function checkClaimStatus'), launchJs.indexOf('async function submitClaimRequest'));
  assert.match(status, /\/api\/promotions\/claim-status\?claimId=/);
  assert.match(status, /payload\.status==='approved'&&typeof payload\.code==='string'/);
  assert.match(status, /payload\.status==='pending'/);
  assert.match(status, /No voucher code has been issued yet/);
  assert.match(status, /payload\.status==='rejected'/);
  assert.match(status, /payload\.status==='expired'/);
  assert.match(status, /showVoucherCode\(payload\)/);
});

test('the public offer cannot activate the old immediate-claim path if verification is not configured', () => {
  assert.match(launchJs, /campaign\.claimEnabled!==true/);
  assert.match(launchJs, /Voucher verification not configured/);
  assert.match(launchJs, /No code can be issued/);
  const clickHandler = launchJs.slice(launchJs.indexOf('claimButton.addEventListener'), launchJs.indexOf("copyButton?.addEventListener"));
  assert.match(clickHandler, /claimPanel\.hidden=false/);
  assert.doesNotMatch(clickHandler, /claimVoucher\(\)/);
});

test('Owner Console lets the owner configure requirements and review each public post before approval', () => {
  assert.match(owner, /id="campaignTerms" required/);
  assert.match(owner, /id="campaignClaimRequirements"[^>]*required/);
  assert.match(owner, /id="claimReviewList"/);
  assert.match(owner, /Configure verification/);
  assert.match(owner, /\/api\/admin\/promotions\/campaigns\/[\s\S]*?\/verification/);
  assert.match(owner, /\/api\/admin\/promotions\/claims\/[\s\S]*?\/review/);
  assert.match(owner, /Visitor-submitted public post \/ proof URL/);
  assert.match(owner, /Required campaign reference:/);
  assert.match(owner, /Approve and issue voucher/);
  assert.match(owner, /Reject proof/);
  assert.match(owner, /opened the public post and verified EVERY requirement/);
  assert.match(owner, /target='_blank';link\.rel='noopener noreferrer'/);
  assert.match(owner, /state\.claimRequests=promo\.claimRequests\|\|\[\]/);
});

test('visitor verification uses the existing scoped browser session and never stores an owner or provider secret', () => {
  assert.match(launchJs, /const SESSION_KEY='nexusnova_audit_session_v1'/);
  assert.match(launchJs, /const CLAIM_KEY='nexusnova_voucher_claim_request_v1'/);
  assert.doesNotMatch(launchJs, /AUDIT_OWNER_ADMIN_TOKEN|BEGIN PRIVATE KEY|sk_live_|whsec_/);
  assert.doesNotMatch(owner, /(?:gho_|sk_live_|whsec_)[A-Za-z0-9_-]{12,}/);
});
