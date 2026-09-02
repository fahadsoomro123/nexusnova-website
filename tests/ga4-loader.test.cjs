const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('GA4 production loader starts promptly instead of waiting eight seconds', () => {
  const text = fs.readFileSync('assets/js/main.js', 'utf8');
  assert.match(text, /const measurementId='G-YLPFKWSS12';/);
  assert.doesNotMatch(text, /setTimeout\(load,8000\)/);
  assert.doesNotMatch(text, /\['pointerdown','keydown','touchstart'\]\.forEach/);
  assert.match(text, /\n  load\(\);\n/);
});
