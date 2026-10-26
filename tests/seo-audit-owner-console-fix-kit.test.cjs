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
  assert.match(admin, /<style id="owner-flagship-v5-editorial">/);
  assert.match(admin, /--pine: #173e33/);
  assert.match(admin, /owner-workspace-tabs::before/);
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

test('Owner Console replaces the rejected dark theme with the editorial pine-and-paper system', () => {
  assert.match(admin, /<style id="owner-flagship-v5-editorial">/);
  assert.match(admin, /--paper: #f4f3ed/);
  assert.match(admin, /--pine: #173e33/);
  assert.match(admin, /--clay: #b65d3d/);
  assert.match(admin, /owner-workspace-tab\[aria-controls="owner-pane-overview"\]::before/);
  assert.match(admin, /body\.owner-session-active #console > \.panel\.row #globalStatus\.good/);
  assert.match(admin, /prefers-reduced-motion: reduce/);
  assert.match(admin, /headers\.set\('X-Owner-Admin-Token',state\.token\)/);
});

test('Owner Console uses a desktop rail and keeps mobile navigation responsive', () => {
  const v5Start = admin.indexOf('<style id="owner-flagship-v5-editorial">');
  const v5End = admin.indexOf('</style>', v5Start);
  const v5 = admin.slice(v5Start, v5End);
  assert.match(v5, /height:\s*100dvh !important/);
  assert.match(v5, /grid-template-columns: 224px minmax\(0, 1fr\)/);
  assert.match(v5, /@media \(max-width: 850px\)/);
  assert.match(v5, /@media \(max-height: 760px\) and \(min-width: 851px\)/);
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

test('Owner Console expands the desktop workspace and avoids nested list scrolling', () => {
  const v5Start = admin.indexOf('<style id="owner-flagship-v5-editorial">');
  const v5End = admin.indexOf('</style>', v5Start);
  const v5 = admin.slice(v5Start, v5End);
  assert.match(v5, /Owner workspace v6: reclaim vertical room/);
  assert.match(v5, /padding: 10px clamp\(12px, 1\.5vw, 26px\) 10px !important/);
  assert.match(v5, /max-height: none !important;\s*overflow: visible !important/);
  assert.match(v5, /@media \(min-width: 851px\)/);
});

test('Owner Console flags legacy automatic-fix no-op responses and status as unresolved', () => {
  assert.match(admin, /No supported automatic fixes matched the measured findings/);
  assert.match(admin, /Live repair backend is returning legacy no-op diagnostics/);
  assert.match(admin, /function isLegacyOwnerAutoFixNoOp\(/);
  assert.match(admin, /The live auto-fix Worker is using the legacy engine/);
  assert.match(admin, /this is not a completed fix/);
});

test('Owner Console displays a reason and concrete next action for unsupported Fix Issues findings', () => {
  assert.match(admin, /plan\.unresolvedFindings/);
  assert.match(admin, /Manual actions still required/);
  assert.match(admin, /Why this was not auto-fixed:/);
  assert.match(admin, /Next action:/);
  assert.match(admin, /Number\(plan\?\.manualGuidanceVersion\)!==1/);
});

test('Owner Console keeps full Fix Issues guidance visible without nested scrolling', () => {
  const v5Start = admin.indexOf('<style id="owner-flagship-v5-editorial">');
  const v5End = admin.indexOf('</style>', v5Start);
  const v5 = admin.slice(v5Start, v5End);
  assert.match(v5, /body\.owner-session-active \.report-compact-pane\s*\{[\s\S]*?max-height:\s*none !important;[\s\S]*?overflow:\s*visible !important;/);
  assert.match(v5, /body\.owner-session-active \.owner-auto-fix-result,[\s\S]*?max-height:\s*none !important;[\s\S]*?overflow:\s*visible !important;/);
  assert.match(v5, /\.owner-auto-fix-result p,[\s\S]*?font-size:\s*13px !important;[\s\S]*?line-height:\s*1\.65 !important;/);
  assert.match(v5, /\.owner-auto-fix-result h3 \{[^}]*font-size:\s*18px !important/);
  assert.match(v5, /:root \{ --muted:\s*#53645a; \}/);
  assert.match(v5, /\.report-compact-tab:hover:not\(\[aria-selected="true"\]\)[\s\S]*?color:\s*#173e33 !important;/);
  assert.match(v5, /\.report-compact-tab\[aria-selected="true"\]:hover[\s\S]*?color:\s*#ffffff !important;/);
});

