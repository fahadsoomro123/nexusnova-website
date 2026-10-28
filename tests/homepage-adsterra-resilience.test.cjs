'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const homepage = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

test('homepage does not include the Adsterra adult-ad placement or loader', () => {
  assert.ok(!homepage.includes('nn-adsterra-slot-css'));
  assert.ok(!homepage.includes('nn-adsterra-slot'));
  assert.ok(!homepage.includes('nn-adsterra-auto-loader'));
  assert.ok(!homepage.includes('data-nn-adsterra-placement'));
  assert.ok(!homepage.includes('container-b7cb02fa163a7585244e7c2876553cea'));
  assert.ok(!homepage.includes('profitableratecpmnetwork.com'));
  assert.ok(!homepage.includes('adult creatives may appear'));
});

test('homepage keeps its primary content and search entry point after ad removal', () => {
  assert.ok(homepage.includes('Find a NexusNova tool'));
  assert.ok(homepage.includes('data-nexusnova-search'));
  assert.ok(homepage.includes('NexusNova'));
});
