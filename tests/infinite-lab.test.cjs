const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const lab = fs.readFileSync(path.join(ROOT, 'infinite-lab.html'), 'utf8');
const engine = fs.readFileSync(path.join(ROOT, 'assets/js/infinite-lab.js'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'assets/css/infinite-lab.css'), 'utf8');
const labs = fs.readFileSync(path.join(ROOT, 'labs.html'), 'utf8');

test('01 — shell has an interactive canvas', () => {
  assert.match(lab, /<canvas id="universe"/);
  assert.match(lab, /role="img"/);
});

test('02 — external assets are wired', () => {
  assert.match(lab, /assets\/css\/infinite-lab\.css/);
  assert.match(lab, /assets\/js\/infinite-lab\.js/);
});

test('03 — rendering loop is animation-frame based', () => {
  assert.match(engine, /requestAnimationFrame\(render\)/);
  assert.match(engine, /function render\(ms\)/);
});

test('04 — high-DPI resize handling is bounded', () => {
  assert.match(engine, /DPR_MAX=2/);
  assert.match(engine, /devicePixelRatio/);
  assert.match(engine, /addEventListener\('resize',resize/);
});

test('05 — canvas failure has a graceful visible fallback', () => {
  assert.match(engine, /if\(!g\)/);
  assert.match(engine, /no-canvas/);
  assert.match(css, /\.no-canvas/);
});

test('06 — pointer lifecycle is complete', () => {
  for (const term of ['pointerdown','pointermove','pointerup','pointercancel']) {
    assert.match(engine, new RegExp(term));
  }
});

test('07 — desktop wheel and double-click interactions exist', () => {
  assert.match(engine, /addEventListener\('wheel'/);
  assert.match(engine, /addEventListener\('dblclick'/);
  assert.match(css, /touch-action:none/);
});

test('08 — pinch path is implemented', () => {
  assert.match(engine, /pointers\.size===2/);
  assert.match(engine, /Math\.hypot\(a\[0\]\.x-a\[1\]\.x/);
  assert.match(engine, /pinch=/);
});

test('09 — deep zoom uses bounded rebasing', () => {
  assert.match(engine, /MAX_Z=4\.2/);
  assert.match(engine, /function advance/);
  assert.match(engine, /s\.depth\+1/);
  assert.doesNotMatch(engine, /depth<32/);
});

test('10 — deterministic procedural identity exists', () => {
  assert.match(engine, /const seedFor=/);
  assert.match(engine, /const familyFor=/);
  assert.match(engine, /Number\.isFinite\(forced\)/);
});

test('11 — world family depth ladder is meaningful', () => {
  for (const term of ['GALAXY','STELLAR REGION','PLANETARY WORLD','CITY LAYER','DATA WORLD','MICRO WORLD','FRACTAL WORLD','ANOMALY FIELD']) {
    assert.match(engine, new RegExp(term));
  }
});

test('12 — galaxy, stellar and planetary rendering layers exist', () => {
  for (const term of ['function galaxy','function orbits','function planet']) {
    assert.match(engine, new RegExp(term));
  }
});

test('13 — portal is rendered and actionable', () => {
  assert.match(engine, /function portal/);
  assert.match(engine, /function portalHit/);
  assert.match(engine, /function dive/);
  assert.match(engine, /portalHit\(p\.x,p\.y\)/);
});

test('14 — reset is functional and exposed for QA', () => {
  assert.match(engine, /function reset/);
  assert.match(engine, /getState:\(\)=>/);
  assert.match(engine, /reset,surprise,dive/);
});

test('15 — Surprise Me selects bounded interesting destinations', () => {
  assert.match(engine, /const ds=\[2,4,7,12,18,24,36,57,83,120\]/);
  assert.match(engine, /function surprise/);
  assert.match(engine, /Surprise destination selected/);
});

test('16 — local discovery history is bounded', () => {
  assert.match(engine, /localStorage\.getItem/);
  assert.match(engine, /slice\(-80\)/);
  assert.doesNotMatch(lab + engine, /fake global leaderboard/i);
});

test('17 — accessibility and reduced motion basics exist', () => {
  assert.match(lab, /aria-label="Interactive procedural Infinite Lab/);
  assert.match(lab, /aria-live="polite"/);
  assert.match(engine, /matchMedia\('/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(engine, /addEventListener\('keydown'/);
});

test('18 — mobile and desktop UX are represented', () => {
  assert.match(css, /max-width:760px/);
  assert.match(css, /max-width:460px/);
  assert.match(engine, /addEventListener\('wheel'/);
  assert.match(engine, /pointerdown/);
});

test('19 — scientific claims are explicitly bounded', () => {
  assert.match(lab, /procedural deep-zoom visual experiment/i);
  assert.match(lab, /without presenting them as real scientific maps/i);
  assert.doesNotMatch(lab + engine, /actual full universe|NASA complete universe map|real telescope view|scientifically exact infinite universe/i);
});

test('20 — Labs clearly distinguishes Infinite Lab from Universe Atlas', () => {
  assert.match(labs, /infinite-lab\.html/);
  assert.match(labs, /Infinite Lab/i);
  assert.match(labs, /INTERACTIVE EXPERIMENT/i);
  assert.match(labs, /visual experiment/i);
  assert.match(labs, /Universe Atlas/i);
});

test('21 — keyboard controls cover core actions', () => {
  for (const keyPattern of ["e.key==='r'","e.key==='s'","e.key==='+'","e.key==='Enter'","e.key==='Escape'"]) {
    assert.ok(engine.includes(keyPattern), `missing keyboard path: ${keyPattern}`);
  }
});

test('22 — no external data dependency is required by the visual engine', () => {
  assert.doesNotMatch(engine, /\bfetch\(/);
  assert.doesNotMatch(engine, /XMLHttpRequest/);
});

test('23 — bounded visual complexity is explicit', () => {
  assert.match(engine, /DPR_MAX=2/);
  assert.match(engine, /s\.quality=clamp\(s\.quality/);
  assert.match(engine, /lv=s\.depth%5\+2/);
});

test('24 — loading state communicates real work without fake progress', () => {
  assert.match(lab, /Initializing deep field/i);
  assert.match(lab, /Building a bounded procedural layer/i);
  assert.doesNotMatch(lab, /100%|progress 100|99%/i);
});
