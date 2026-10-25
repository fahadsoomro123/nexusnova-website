'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const admin = fs.readFileSync(path.join(root, 'seo-audit-studio-admin.html'), 'utf8');

test('Owner Console opens as a compact command center with live workspace metrics', () => {
  assert.match(admin, /overview\.id='ownerOverview'/);
  assert.match(admin, /label:'Command center'/);
  assert.match(admin, /Everything important, one screen/);
  assert.match(admin, /AUDIT HISTORY/);
  assert.match(admin, /ACTIVE CAMPAIGNS/);
  assert.match(admin, /CLAIMS TO REVIEW/);
  assert.match(admin, /owner-quick-actions/);
  assert.match(admin, /html,body\{width:100%;height:100%;margin:0;background:var\(--flag-bg\);color:var\(--flag-ink\);overflow:hidden\}/);
  assert.match(admin, /owner-flagship-v3/);
});

test('Owner Console uses paged lists instead of forcing owners through long audit and voucher lists', () => {
  assert.match(admin, /function paginateOwnerList\(/);
  assert.match(admin, /function paginateOwnerLists\(/);
  assert.match(admin, /text\('div','','list-pagination'\)/);
  assert.match(admin, /Previous/);
  assert.match(admin, /Next/);
  assert.match(admin, /ownerListPages\[key\]/);
});

test('Owner Console directly offers automatic repair only for owner-created audits', () => {
  assert.match(admin, /Number\(a\.owner_created\)===1/);
  assert.match(admin, /button\('Fix issues automatically'/);
  assert.match(admin, /\/api\/admin\/audits\/'\+encodeURIComponent\(auditId\)\+'\/auto-fix\/plan/);
  assert.match(admin, /requiresRepositorySelection/);
  assert.match(admin, /approve only these listed safe changes/i);
  assert.match(admin, /Apply approved changes/);
  assert.match(admin, /The live page must pass verification before the job is called fixed/);
  assert.match(admin, /Fixes verified/);
  assert.match(admin, /rollbackAvailable/);
  assert.match(admin, /\/auto-fix\/'\+encodeURIComponent\(job\.id\)\+'\/rollback/);
});

test('Owner Console never presents guidance or downloads as a successful repair', () => {
  assert.doesNotMatch(admin, /Prepare repair guidance/);
  assert.doesNotMatch(admin, /renderOwnerFixKit/);
  assert.doesNotMatch(admin, /Download corrected HTML file/);
  assert.doesNotMatch(admin, /Download simple Fix List/);
  assert.doesNotMatch(admin, /\/api\/admin\/audits\/'\+encodeURIComponent\(a\.audit_id\)\+'\/fix-kit/);
  assert.match(admin, /The changes could not be verified\. No success is claimed\./);
});

test('Owner Console keeps authenticated requests in memory and preserves source records when hiding history', () => {
  assert.match(admin, /AUDIT_OWNER_ADMIN_TOKEN/);
  assert.match(admin, /X-Owner-Admin-Token/);
  assert.match(admin, /held in this page's memory/);
  assert.match(admin, /button\('Remove from history'/);
  assert.match(admin, /underlying report, payment, and entitlement records will remain stored/);
  assert.match(admin, /button\('Remove All History'/);
  assert.match(admin, /Original records were retained/);
});

test('Owner Console report uses a compact multi-view layout rather than one long checklist', () => {
  assert.match(admin, /function compactAuditReport\(shell\)/);
  assert.match(admin, /report-compact-tabs/);
  assert.match(admin, /report-compact-pane/);
  assert.match(admin, /Prioritized recommendations/);
  assert.match(admin, /All audit checks/);
});

test('Owner Console applies the Nebula v4 futuristic visual system without changing the owner API flow', () => {
  assert.match(admin, /<style id="owner-flagship-v4">/);
  assert.match(admin, /--nebula-cyan:#58e4ff/);
  assert.match(admin, /body::before/);
  assert.match(admin, /owner-workspace-tab\[aria-controls="owner-pane-overview"\]::before/);
  assert.match(admin, /\.owner-kpi::after/);
  assert.match(admin, /prefers-reduced-motion:reduce/);
  assert.match(admin, /headers\.set\('X-Owner-Admin-Token',state\.token\)/);
});

test('Owner Console keeps desktop navigation and the main shell within one viewport', () => {
  const v4Start = admin.indexOf('<style id="owner-flagship-v4">');
  const v4End = admin.indexOf('</style>', v4Start);
  const v4 = admin.slice(v4Start, v4End);
  assert.match(v4, /main\{position:relative;z-index:1;padding:[^}]*gap:0\}/);
  assert.match(v4, /grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/);
  assert.match(v4, /@media\(max-width:1050px\)[\s\S]*grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(admin, /html,body\{width:100%;height:100%;margin:0;background:var\(--flag-bg\);color:var\(--flag-ink\);overflow:hidden\}/);
  assert.match(admin, /function paginateOwnerLists\(/);
  assert.match(admin, /list-pagination/);
});

test('Owner Console v5 uses a distinct light editorial workspace and a vertical operation rail', () => {
  assert.match(admin, /<style id="owner-flagship-v5-editorial">/);
  assert.match(admin, /--paper: #f4f3ed/);
  assert.match(admin, /--pine: #173e33/);
  assert.match(admin, /grid-template-columns: 224px minmax\(0, 1fr\)/);
  assert.match(admin, /OWNER WORKSPACE/);
  assert.match(admin, /PRIVATE SESSION\\A CHANGES REQUIRE REVIEW/);
  assert.match(admin, /@media \(max-width: 850px\)/);
  assert.match(admin, /prefers-reduced-motion: reduce/);
});
