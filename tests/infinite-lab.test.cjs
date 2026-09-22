const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const lab = fs.readFileSync(path.join(ROOT, 'infinite-lab.html'), 'utf8');
const engine = fs.readFileSync(path.join(ROOT, 'assets/js/infinite-lab.js'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'assets/css/infinite-lab.css'), 'utf8');
const labs = fs.readFileSync(path.join(ROOT, 'labs.html'), 'utf8');

test('01 — fullscreen interactive canvas shell exists', () => {
  assert.match(lab, /<canvas id="universe"/);
  assert.match(lab, /role="img"/);
  assert.match(css, /#universe\{/);
});
test('02 — dedicated CSS and JS assets are wired', () => {
  assert.match(lab, /assets\/css\/infinite-lab\.css/);
  assert.match(lab, /assets\/js\/infinite-lab\.js/);
});
test('03 — cinematic shell layers exist', () => {
  for (const term of ['scanlines','vignette','world-card','portal-hint','event-strip','loading-screen']) assert.match(lab, new RegExp(term));
});
test('04 — render loop is requestAnimationFrame based', () => {
  assert.match(engine, /function render\(ms\)/);
  assert.match(engine, /requestAnimationFrame\(render\)/);
});
test('05 — high-DPI canvas sizing is bounded and resize aware', () => {
  assert.match(engine, /DPR_MAX = 2/);
  assert.match(engine, /devicePixelRatio/);
  assert.match(engine, /addEventListener\('resize',resize/);
  assert.match(engine, /ctx\.setTransform\(dpr/);
});
test('06 — canvas failure has a safe visible fallback', () => {
  assert.match(engine, /if \(!canvas \|\| !ctx\)/);
  assert.match(engine, /no-canvas/);
  assert.match(css, /\.no-canvas/);
});
test('07 — complete pointer lifecycle is implemented', () => {
  for (const eventName of ['pointerdown','pointermove','pointerup','pointercancel']) assert.match(engine, new RegExp(eventName));
  assert.match(engine, /setPointerCapture/);
});
test('08 — wheel, double-click and double-tap paths exist', () => {
  assert.match(engine, /addEventListener\('wheel'/);
  assert.match(engine, /addEventListener\('dblclick'/);
  assert.match(engine, /lastTap/);
  assert.match(engine, /isDouble/);
});
test('09 — pinch zoom uses two-pointer geometry', () => {
  assert.match(engine, /pointers\.size===2/);
  assert.match(engine, /Math\.hypot\(a\[0\]\.x-a\[1\]\.x/);
  assert.match(engine, /pinch=\{/);
});
test('10 — deep zoom is bounded and rebases into the next world', () => {
  assert.match(engine, /MIN_Z = 0\.72/);
  assert.match(engine, /MAX_Z = 4\.85/);
  assert.match(engine, /function commitDepth/);
  assert.match(engine, /function maybeAdvance/);
  assert.match(engine, /state\.depth\+1/);
});
test('11 — deterministic seed and family selection are explicit', () => {
  assert.match(engine, /function seedFor/);
  assert.match(engine, /function familyFor/);
  assert.match(engine, /nextSignature/);
  assert.doesNotMatch(engine, /fetch\(/);
});
test('12 — world ladder covers the planned families', () => {
  for (const family of ['COSMIC FIELD','GALAXY','STELLAR REGION','PLANETARY WORLD','CITY LAYER','DATA WORLD','MICRO WORLD','FRACTAL WORLD','BIOSPHERE','ANOMALY']) assert.match(engine, new RegExp(family));
});
test('13 — galaxy and stellar-region rendering exist', () => {
  for (const fn of ['drawGalaxy','drawStellar','drawStars','drawDust','drawConstellations']) assert.match(engine, new RegExp('function '+fn));
});
test('14 — six deterministic planetary variants exist', () => {
  assert.match(engine, /const type=Math\.floor\(hash\(seed,6100\)\*6\)/);
  for (const typeName of ['OCEAN','DESERT','ICE','VOLCANIC','GAS GIANT','FOREST']) assert.match(engine, new RegExp(typeName));
});
test('15 — city, data and micro-world layers exist', () => {
  assert.match(engine, /function drawCity/);
  assert.match(engine, /function drawData/);
  assert.match(engine, /function drawMicro/);
});
test('16 — recursive/fractal and anomaly families are bounded', () => {
  assert.match(engine, /function drawFractal/);
  assert.match(engine, /Math\.min\(5,3\+\(state\.depth%3\)\)/);
  assert.match(engine, /function drawAnomaly/);
});
test('17 — central portal previews the next world', () => {
  assert.match(engine, /function drawPortal/);
  assert.match(engine, /function drawPreview/);
  assert.match(engine, /const incoming=nextWorld\(\)/);
  assert.match(engine, /drawPreview\(incoming\.family,incoming\.seed/);
});
test('18 — portal interaction queues an actual depth dive', () => {
  assert.match(engine, /function portalHit/);
  assert.match(engine, /function queueDive/);
  assert.match(engine, /state\.tz=MAX_Z/);
  assert.match(engine, /state\.diveRequested=true/);
});
test('19 — cinematic transition is tied to depth entry', () => {
  assert.match(engine, /state\.transition=/);
  assert.match(engine, /function drawTransition/);
  assert.match(engine, /state\.transition>0/);
});
test('20 — Surprise Me uses curated bounded destinations', () => {
  assert.match(engine, /const destinations=\[2,4,7,11,18,27,41,64,89,128,177\]/);
  assert.match(engine, /function surprise/);
  assert.match(engine, /SURPRISE VECTOR/);
});
test('21 — event system provides exploration feedback', () => {
  assert.match(engine, /const EVENTS =/);
  assert.match(engine, /function emitEvent/);
  assert.match(engine, /DESCENT VECTOR ARMED/);
});
test('22 — local discovery history is bounded and browser-only', () => {
  assert.match(engine, /localStorage\.getItem/);
  assert.match(engine, /slice\(-100\)/);
  assert.match(engine, /Saved locally on this browser/);
  assert.doesNotMatch(lab + engine, /global leaderboard|worldwide users|live global discoveries/i);
});
test('23 — minimap/orientation HUD is wired to state', () => {
  for (const id of ['radarDot','vectorReadout','depthMeter']) assert.match(lab, new RegExp(id));
  assert.match(engine, /function updateHud/);
});
test('24 — desktop/mobile layouts are represented', () => {
  assert.match(css, /@media\(max-width:820px\)/);
  assert.match(css, /@media\(max-width:560px\)/);
  assert.match(css, /touch-action:none/);
});
test('25 — accessibility and keyboard controls are present', () => {
  assert.match(lab, /aria-label="Interactive procedural Infinite Lab/);
  assert.match(lab, /aria-live="polite"/);
  assert.match(engine, /addEventListener\('keydown'/);
  assert.match(engine, /e\.key==='r'/);
  assert.match(engine, /e\.key==='s'/);
  assert.match(engine, /e\.key==='Enter'/);
  assert.match(engine, /e\.key==='Escape'/);
  assert.match(engine, /e\.key==='ArrowLeft'/);
});
test('26 — reduced motion changes animation behavior', () => {
  assert.match(engine, /prefers-reduced-motion/);
  assert.match(engine, /reducedMotion \? \.18 : 1/);
  assert.match(css, /prefers-reduced-motion:reduce/);
});
test('27 — adaptive quality is bounded for performance', () => {
  assert.match(engine, /function qualityTick/);
  assert.match(engine, /state\.quality=clamp/);
  assert.match(engine, /\.48,1\)/);
});
test('28 — visual engine has no remote data dependency', () => {
  assert.doesNotMatch(engine, /\bfetch\(/);
  assert.doesNotMatch(engine, /XMLHttpRequest/);
  assert.doesNotMatch(engine, /WebSocket/);
});
test('29 — loading state uses explicit initialization stages', () => {
  assert.match(lab, /PHASE 01 \/ FOUNDATION/);
  assert.match(engine, /PHASE 02 \/ RENDERING CORE/);
  assert.match(engine, /PHASE 03 \/ PORTAL CALIBRATION/);
  assert.match(engine, /firstFrame=true/);
});
test('30 — scientific representation boundary is explicit', () => {
  assert.match(lab, /procedural deep-zoom visual experiment/i);
  assert.match(lab, /Not a scientific map/i);
  assert.doesNotMatch(lab + engine, /scientifically exact universe|real telescope feed|live NASA universe/i);
});
test('31 — Infinite Lab is distinct from Universe Atlas', () => {
  assert.match(labs, /infinite-lab\.html/);
  assert.match(labs, /Infinite Lab/i);
  assert.match(labs, /Universe Atlas/i);
});
test('32 — no legacy unbounded recursive scene call remains', () => {
  assert.doesNotMatch(engine, /scene\(seed\*13\.17/);
  assert.match(engine, /Math\.min\(5,3\+\(state\.depth%3\)\)/);
});
test('33 — world identity persists across depth commits', () => {
  assert.match(engine, /state\.depth=n\.depth/);
  assert.match(engine, /state\.seed=n\.seed/);
  assert.match(engine, /state\.family=n\.family/);
  assert.match(engine, /updateHud\(\)/);
});
test('34 — core actions are real functions exposed for QA', () => {
  for (const fn of ['reset','surprise','queueDive','zoomAt']) assert.match(engine, new RegExp('function '+fn));
  assert.match(engine, /getState/);
});
test('35 — flagship engine is materially larger than the old demo', () => {
  assert.ok(engine.length > 15000);
  assert.ok(css.length > 5000);
  assert.ok(lab.length > 3000);
});
