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
  assert.match(source, /const autoStart=holder\.hasAttribute\('data-hp-360-autostart'\)/);
  assert.match(source, /new IntersectionObserver\(entries=>/);
  assert.match(source, /observer\.observe\(holder\)/);
  assert.match(source, /requestIdleCallback/);
  assert.match(source, /setTimeout\(schedule,1800\)/);
  assert.match(source, /window\.addEventListener\('load',observeStage/);
  assert.doesNotMatch(source, /if\(autoStart\)\{\s*boot\(\);\s*return;/,
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


test('homepage 3D scan uses the default explicit-load mode rather than automatic playback', () => {
  const homepage = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.doesNotMatch(homepage, /data-hp-360-autostart/);
  assert.match(homepage, /id="nnHumanProof360Load">Click to load 3D human scan…<\/div>/);
  assert.match(source, /CLICK TO LOAD 3D HUMAN SCAN/);
  assert.match(source, /load\.addEventListener\('click',start,\{once:true\}\)/);
  assert.match(source, /load\.addEventListener\('keydown'/);
});
