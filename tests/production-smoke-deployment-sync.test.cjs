'use strict';

const fs = require('node:fs');
const test = require('node:test');
const assert = require('node:assert/strict');

test('production smoke waits for changed static files to match the exact commit', () => {
  const workflow = fs.readFileSync('.github/workflows/production-smoke.yml', 'utf8');
  assert.ok(workflow.includes('Checkout exact commit for deployment comparison'));
  assert.ok(workflow.includes("'git', 'diff', '--name-only', 'HEAD^', 'HEAD'"));
  assert.ok(workflow.includes('hashlib.sha256'));
  assert.ok(workflow.includes('Cache-Control: no-cache, no-store, max-age=0'));
  assert.ok(workflow.includes('range(1, 41)'), 'deployment wait must remain bounded but exceed the previous 20-second homepage-only wait');
  assert.ok(workflow.includes('changed static file(s) match commit'));
  assert.ok(workflow.includes('did not match this commit within the bounded wait'));
  assert.ok(
    workflow.indexOf('Wait for changed static files to match this commit') <
    workflow.indexOf('Verify production routes and content markers with diagnostics'),
    'content checks must run only after changed static files are current'
  );
});
