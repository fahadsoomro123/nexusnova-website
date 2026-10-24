'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const admin = fs.readFileSync(path.join(root, 'seo-audit-studio-admin.html'), 'utf8');

test('Owner Console labels downloadable suggestions as guidance, not an automatic live fix', () => {
  assert.match(admin, /button\('Prepare repair guidance'/);
  assert.match(admin, /\/api\/admin\/audits\/'\+encodeURIComponent\(a\.audit_id\)\+'\/fix-kit/);
  assert.match(admin, /function renderOwnerFixKit\(item,kit\)/);
  assert.match(admin, /Download proposed HTML patch/);
  assert.match(admin, /Download manual fix checklist/);
  assert.match(admin, /This is guidance only; the live website was not changed/);
});

test('Owner Console offers direct repair only for owner-created audits with a preview, explicit approval and verification', () => {
  assert.match(admin, /Number\(a\.owner_created\)===1/);
  assert.match(admin, /button\('Fix safe issues'/);
  assert.match(admin, /\/api\/admin\/audits\/'\+encodeURIComponent\(auditId\)\+'\/auto-fix\/plan/);
  assert.match(admin, /requiresRepositorySelection/);
  assert.match(admin, /approve only these listed safe changes/i);
  assert.match(admin, /Apply approved changes/);
  assert.match(admin, /The live page must pass verification before the job is called fixed/);
  assert.match(admin, /Fixes verified/);
  assert.match(admin, /rollbackAvailable/);
  assert.match(admin, /\/auto-fix\/'\+encodeURIComponent\(job\.id\)\+'\/rollback/);
  assert.match(admin, /The live page must pass verification before the job is called fixed/);
});

test('Owner Console Fix Kit download uses current report findings and platform recovery details', () => {
  assert.match(admin, /function ownerFixKitText\(kit\)/);
  assert.match(admin, /PLATFORM INSTRUCTIONS/);
  assert.match(admin, /EXACT SEO VALUES/);
  assert.match(admin, /SAFETY: This package is a proposal only/);
  assert.match(admin, /typeof kit\.correctedHtml==='string'/);
});

test('Owner Console can remove an audit from the history list without deleting the audit record', () => {
  assert.match(admin, /button\('Remove from history'/);
  assert.match(admin, /\/api\/admin\/audits\/'\+encodeURIComponent\(a\.audit_id\)\+'\/hide/);
  assert.match(admin, /The underlying report, payment, and entitlement records will remain stored/);
  assert.match(admin, /history list/);
});

test('Owner Console Fix List gives readable next steps and handles missing live-page access', () => {
  assert.match(admin, /function renderOwnerFixKit\(item,kit\)/);
  assert.match(admin, /audit_evidence_incomplete:/);
  assert.match(admin, /could not be safely re-read|could not be read just now/i);
  assert.match(admin, /Do these 3 steps/);
  assert.match(admin, /Download manual fix checklist/);
});

test('Owner Console can remove all history in one confirmed request without deleting source records', () => {
  assert.match(admin, /button\('Remove All History'/);
  assert.match(admin, /\/api\/admin\/audits\/hide-all/);
  assert.match(admin, /Reports, payments, and entitlements are retained/);
  assert.match(admin, /Original records were retained/);
});

test('Owner Command Center v2 surfaces direct repair, overview metrics and paginated searchable lists', () => {
  assert.match(admin, /\{id:'overview',label:'Overview'/);
  assert.match(admin, /Owner command navigation/);
  assert.match(admin, /aria-orientation','vertical'/);
  assert.match(admin, /function renderOwnerOverview\(\)/);
  assert.match(admin, /owner-overview-metrics/);
  assert.match(admin, /function setupCompactList\(root,key,placeholder\)/);
  assert.match(admin, /setupCompactList\(root,'audits','Search audit URL or reference/);
  assert.match(admin, /setupCompactList\(root,'claims','Search pending claims/);
  assert.match(admin, /Preview safe repairs/);
  assert.match(admin, /page is not marked fixed until live verification succeeds/i);
  assert.match(admin, /<meta name="robots" content="noindex,nofollow,noarchive">/);
  assert.match(admin, /It is not saved in browser storage/);
  assert.match(admin, /PageSpeed opportunities/);
  assert.match(admin, /Download raw report JSON/);
  assert.doesNotMatch(admin, /Download corrected HTML file/);
});
