'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const heroPath = path.join(root, 'assets/js/humanproof-hero-360.js');
const source = fs.readFileSync(heroPath, 'utf8');

test('3D hero script remains valid JavaScript', () => {
  assert.doesNotThrow(() => new vm.Script(source, { filename: heroPath }));
});

test('automatic 3D hero waits for visibility and browser idle before booting', () => {
  const autoStart = source.match(/if\(autoStart\)\{([\s\S]*?)\n\s*return;\n\s*\}/);
  assert.ok(autoStart, 'autostart branch should exist');

  const branch = autoStart[1];
  assert.match(branch, /new IntersectionObserver/);
  assert.match(branch, /observer\.observe\(holder\)/);
  assert.match(branch, /requestIdleCallback/);
  assert.match(branch, /setTimeout\(schedule,1800\)/);
  assert.match(branch, /window\.addEventListener\('load',observeStage/);
  assert.doesNotMatch(branch, /^\s*boot\(\);/m,
    'autostart must not immediately perform WebGL setup before visibility/idle checks');
});

test('manual-load mode and the approved placeholder remain available', () => {
  assert.match(source, /TAP TO LOAD 3D HUMAN SCAN/);
  assert.match(source, /CLICK TO LOAD 3D HUMAN SCAN/);
  assert.match(source, /holder\.classList\.add\('is-paused'\)/);
  assert.match(source, /holder\.classList\.add\('is-ready'\)/);
  assert.match(source, /scene\.add\(new THREE\.AmbientLight/);
  assert.match(source, /LeePerrySmith\.glb/);
});
