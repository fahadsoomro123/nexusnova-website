'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const workflow = fs.readFileSync(path.resolve(__dirname, '../.github/workflows/site-quality-audit.yml'), 'utf8');

test('full-site browser audit uses bounded cached Chromium setup with dependency fallback', () => {
  assert.match(workflow, /playwright==1\.64\.0/);
  assert.match(workflow, /python -m playwright install --only-shell chromium/);
  assert.match(workflow, /timeout-minutes: 8/);
  assert.match(workflow, /browser = playwright\.chromium\.launch\(headless=True\)/);
  assert.match(workflow, /python -m playwright install-deps chromium/);
  assert.match(workflow, /Verify desktop and mobile browser quality/);
  assert.match(workflow, /Require zero browser findings/);
});