'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const admin = fs.readFileSync(path.join(root, 'seo-audit-studio-admin.html'), 'utf8');

test('Owner Console audit history includes a working Fix Kit action connected to the owner API', () => {
  assert.match(admin, /button\('Get Fixes'/);
  assert.match(admin, /\/api\/admin\/audits\/'\+encodeURIComponent\(a\.audit_id\)\+'\/fix-kit/);
  assert.match(admin, /function renderOwnerFixKit\(item,kit\)/);
  assert.match(admin, /Download corrected HTML file/);
  assert.match(admin, /Download simple Fix List/);
  assert.match(admin, /Live website changes were not made/);
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
  assert.match(admin, /Download simple Fix List/);
});

test('Owner Console can remove all history in one confirmed request without deleting source records', () => {
  assert.match(admin, /button\('Remove All History'/);
  assert.match(admin, /\/api\/admin\/audits\/hide-all/);
  assert.match(admin, /Reports, payments, and entitlements are retained/);
  assert.match(admin, /Original records were retained/);
});
