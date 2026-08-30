'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const workflow = fs.readFileSync(path.join(__dirname, '../.github/workflows/nexusnova-major-web-launch.yml'), 'utf8');

test('major web launch remains manual and explicitly confirmed', () => {
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /inputs:\s*\n\s*confirm:/);
  assert.match(workflow, /inputs\.confirm[^\n]+LAUNCH|\$\{\{ inputs\.confirm \}\}[^\n]+LAUNCH/);
  assert.doesNotMatch(workflow, /schedule:\s*\n/);
});

test('major web launch gate covers auth missions and referral release sections', () => {
  assert.match(workflow, /release_sections=\{1,2,3,4,5,6,7,8,11,12,13\}/);
  assert.match(workflow, /section not in release_sections/);
  assert.match(workflow, /raw\.startswith\('- \[ \] '\)/);
  assert.match(workflow, /blockers\.append/);
  assert.match(workflow, /raise SystemExit\(2\)/);
});

test('future APK Play triggers remain outside the web-launch gate while post-launch checks are nonblocking', () => {
  assert.doesNotMatch(workflow, /release_sections=\{[^}]*9[^}]*\}/);
  assert.doesNotMatch(workflow, /release_sections=\{[^}]*10[^}]*\}/);
  assert.match(workflow, /Verify each destination result from workflow output\/report before claiming success/);
  assert.match(workflow, /Automatic launch should run only after this master website checklist/);
});

test('duplicate successful major launch remains blocked', () => {
  assert.match(workflow, /row\.get\('published'\) is True/);
  assert.match(workflow, /duplicate launch blocked/);
});
