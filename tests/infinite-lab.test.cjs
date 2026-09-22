const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const lab = fs.readFileSync(path.join(ROOT, 'infinite-lab.html'), 'utf8');
const engine = fs.readFileSync(path.join(ROOT, 'assets/js/infinite-lab.js'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'assets/css/infinite-lab.css'), 'utf8');
const labs = fs.readFileSync(path.join(ROOT, 'labs.html'), 'utf8');

test('Infinite Lab shell and rendering core exist', () => {
  assert.match(lab, /<canvas id="universe"/);
  assert.match(lab, /assets\/css\/infinite-lab\.css/);
  assert.match(lab, /assets\/js\/infinite-lab\.js/);
  assert.match(engine, /getContext\?\.\('2d'/);
  assert.match(engine, /requestAnimationFrame\(render\)/);
});

test('Input paths cover desktop, touch and portal entry', () => {
  for (const term of ['pointerdown','pointermove','pointerup','pointercancel','touch-action:none','addEventListener\(\'wheel\'','dblclick']) assert.match(lab + engine, new RegExp(term));
});

test('Deep zoom uses bounded rebasing instead of unbounded recursion', () => {
  assert.match(engine, /MAX_Z=4\.2/);
  assert.match(engine, /function advance/);
  assert.match(engine, /seedFor/);
  assert.match(engine, /s\.depth\+1/);
  assert.doesNotMatch(engine, /depth<32/);
});

test('Procedural world families and deterministic identity exist', () => {
  for (const term of ['GALAXY','STELLAR REGION','PLANETARY WORLD','CITY LAYER','DATA WORLD','MICRO WORLD','FRACTAL WORLD','ANOMALY FIELD']) assert.match(engine, new RegExp(term));
  assert.match(engine, /familyFor/);
  assert.match(engine, /Number\.isFinite\(forced\)/);
});

test('Reset, Surprise Me, discovery storage and accessibility exist', () => {
  for (const term of ['function reset','function surprise','localStorage\.getItem','slice\(-80\)','aria-label="Interactive procedural Infinite Lab','aria-live="polite"','prefers-reduced-motion']) assert.match(lab + engine, new RegExp(term));
  assert.doesNotMatch(lab + engine, /fake global leaderboard/i);
});

test('Scientific representation is explicitly bounded', () => {
  assert.match(lab, /procedural browser experience/i);
  assert.match(lab, /without presenting them as real scientific maps/i);
  assert.doesNotMatch(lab + engine, /actual full universe|NASA complete universe map|real telescope view|scientifically exact infinite universe/i);
});

test('Labs integration advertises Infinite Lab distinctly', () => {
  assert.match(labs, /infinite-lab\.html/);
  assert.match(labs, /Infinite Lab/i);
  assert.match(labs, /interactive browser experiment/i);
  assert.match(labs, /Universe Atlas/i);
});
