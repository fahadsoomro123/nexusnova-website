const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('app preview loads the shared consent UI during the initial deferred script pass', () => {
  const html = fs.readFileSync('app.html', 'utf8');
  const main = '<script src="assets/js/main.js?v=20261015-v4" defer></script>';
  const shell = '<script src="assets/js/site-main.js?v=20261015-v4" defer data-nexusnova-site-shell></script>';
  assert.ok(html.includes(main), 'the shared runtime remains loaded');
  assert.ok(html.includes(shell), 'site-main consent UI is loaded from the HTML instead of waiting for requestIdleCallback');
  assert.ok(html.indexOf(main) < html.indexOf(shell), 'the direct shell tag follows main.js, so its marker prevents a duplicate idle load');
});

test('indexed-tool audit accepts only the intentional shared-shell cache version exception', () => {
  const workflow = fs.readFileSync('.github/workflows/total-site-overhaul.yml', 'utf8');
  assert.ok(workflow.includes("const isSharedShellAsset = value =>"), 'shared shell exception must be explicit');
  assert.ok(workflow.includes('20261017-static-shell-v1'), 'exception must pin the known static-shell key');
  assert.ok(workflow.includes('!value.includes(`v=${VERSION}`)'), 'the current global asset key remains required by default');
  assert.ok(workflow.includes('!isSharedShellAsset(value)'), 'only the explicit shared-shell exception bypasses the global asset key');
  assert.ok(workflow.includes('FAST_TOOL_AUDIT_PASS tools='), 'the indexed-tool audit success contract remains intact');
});
