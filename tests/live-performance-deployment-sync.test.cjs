'use strict';

const fs = require('node:fs');
const test = require('node:test');
const assert = require('node:assert/strict');

test('live Lighthouse waits for the exact deployed runtime and changed static assets', () => {
  const workflow = fs.readFileSync('.github/workflows/live-performance-100.yml', 'utf8');
  assert.ok(workflow.includes('fetch-depth: 2'), 'checkout must include the parent for changed-file detection');
  assert.ok(workflow.includes('Wait for exact homepage and changed assets to reach production'));
  assert.ok(workflow.includes("'assets/js/main.js'"), 'shared runtime must always be verified');
  assert.ok(workflow.includes("'index.html', 'assets/js/main.js'"), 'homepage and runtime are both mandatory checks');
  assert.ok(workflow.includes("'git', 'diff', '--name-only', 'HEAD^', 'HEAD'"));
  assert.ok(workflow.includes('hashlib.sha256'));
  assert.ok(workflow.includes("'Cache-Control': 'no-cache, no-store, max-age=0'"));
  assert.ok(workflow.includes('range(1, 41)'), 'the deployment wait must be bounded');
  assert.ok(workflow.includes('refusing to measure a stale deployment'));
  assert.ok(
    workflow.indexOf('Wait for exact homepage and changed assets to reach production') <
    workflow.indexOf('Audit the actual production homepage'),
    'Lighthouse must run only after the source and production assets match'
  );
});
