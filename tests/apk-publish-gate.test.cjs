'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const workflow = fs.readFileSync(path.join(__dirname, '../.github/workflows/publish-nexusnova-apk-download.yml'), 'utf8');

test('APK publishing is manual-only and explicitly confirmed', () => {
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /confirm:/);
  assert.match(workflow, /PUBLISH_APK/);
  assert.doesNotMatch(workflow, /\n\s*push:\s*\n/);
  assert.doesNotMatch(workflow, /\n\s*schedule:\s*\n/);
});

test('APK artifact URL remains secret-backed and never hard-coded', () => {
  assert.match(workflow, /secrets\.NEXUSNOVA_APK_ARTIFACT_URL/);
  assert.match(workflow, /APK_ARTIFACT_URL/);
  assert.doesNotMatch(workflow, /oaiusercontent\.com|raw\?se=|sig=/i);
  assert.doesNotMatch(workflow, /https?:\/\/[^\s'"}]+\.(?:apk|zip)/i);
});

test('APK publishing requires exact caller-supplied SHA-256 and valid APK structure', () => {
  assert.match(workflow, /expected_sha256/);
  assert.match(workflow, /\[A-Fa-f0-9\]\{64\}/);
  assert.match(workflow, /sha256sum/);
  assert.match(workflow, /SHA-256 mismatch/);
  assert.match(workflow, /AndroidManifest\.xml/);
  assert.match(workflow, /classes\(\[0-9\]\+\)\?/);
  assert.match(workflow, /unzip -tq/);
});

test('APK workflow publishes versioned immutable files without changing website download UI', () => {
  assert.match(workflow, /downloads\/NexusNova-v\$\{VERSION\}\.apk/);
  assert.match(workflow, /already exists/);
  assert.match(workflow, /This workflow does not add or change a public website download button/);
  assert.doesNotMatch(workflow, /app\.html.*(?:sed|perl|python)|(?:sed|perl).*app\.html/i);
});
