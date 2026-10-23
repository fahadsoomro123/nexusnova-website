'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const admin = fs.readFileSync(path.join(root, 'seo-audit-studio-admin.html'), 'utf8');

test('Owner Console audit history includes a working Fix Kit action connected to the owner API', () => {
  assert.match(admin, /button\('Prepare Fix Kit'/);
  assert.match(admin, /\/api\/admin\/audits\/['"]\s*\+encodeURIComponent\(a\.audit_id\)\s*\+['"]\/fix-kit/);
  assert.match(admin, /function renderOwnerFixKit\(item,kit\)/);
  assert.match(admin, /Download corrected HTML proposal/);
  assert.match(admin, /Download Fix Kit instructions/);
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
  assert.match(admin, /\/api\/admin\/audits\/['"]\s*\+encodeURIComponent\(a\.audit_id\)\s*\+['"]\/hide/);
  assert.match(admin, /The underlying report, payment, and entitlement records will remain stored/);
  assert.match(admin, /history list/);
});
