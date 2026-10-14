'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const picker = require('../assets/js/random-picker.js');

function fakeCrypto(values) {
  const sequence = values.slice();
  let calls = 0;
  return {
    get calls() { return calls; },
    getRandomValues(array) {
      if (!sequence.length) throw new Error('Fake random sequence exhausted');
      array[0] = sequence.shift();
      calls += 1;
      return array;
    }
  };
}

test('parseItems trims entries and ignores blank lines', () => {
  assert.deepEqual(picker.parseItems('  Ali \n\nSara\r\n  Hamza  \n'), ['Ali', 'Sara', 'Hamza']);
});

test('uniqueItems removes exact duplicates while preserving order and case', () => {
  assert.deepEqual(picker.uniqueItems(['Ali', 'Sara', 'Ali', 'ali', 'Sara']), ['Ali', 'Sara', 'ali']);
});

test('randomIndex rejects out-of-range samples instead of introducing modulo bias', () => {
  const crypto = fakeCrypto([0xffffffff, 8]);
  assert.equal(picker.randomIndex(3, crypto), 2);
  assert.equal(crypto.calls, 2);
});

test('randomIndex rejects invalid pool sizes and missing crypto provider', () => {
  assert.throws(() => picker.randomIndex(0, fakeCrypto([0])), RangeError);
  assert.throws(() => picker.randomIndex(3), /Secure browser randomness is unavailable/);
});

test('multiple winners are drawn without replacement from list positions', () => {
  const result = picker.drawWithoutReplacement(['Ali', 'Sara', 'Hamza'], 2, false, fakeCrypto([2, 1]));
  assert.deepEqual(result.winners, ['Hamza', 'Sara']);
  assert.equal(result.eligibleCount, 3);
});

test('duplicate removal is optional and counts the eligible entries correctly', () => {
  const withDuplicates = picker.drawWithoutReplacement(['Ali', 'Sara', 'Ali'], 3, false, fakeCrypto([0, 0, 0]));
  assert.deepEqual(withDuplicates.winners, ['Ali', 'Sara', 'Ali']);
  assert.equal(withDuplicates.eligibleCount, 3);
  const withoutDuplicates = picker.drawWithoutReplacement(['Ali', 'Sara', 'Ali'], 2, true, fakeCrypto([0, 0]));
  assert.deepEqual(withoutDuplicates.winners, ['Ali', 'Sara']);
  assert.equal(withoutDuplicates.eligibleCount, 2);
});

test('draw validation prevents empty pools and impossible winner counts', () => {
  assert.throws(() => picker.drawWithoutReplacement(['', '  '], 1, false, fakeCrypto([0])), /Add at least one/);
  assert.throws(() => picker.drawWithoutReplacement(['Ali'], 2, false, fakeCrypto([0])), /more winners than eligible entries/);
  assert.throws(() => picker.drawWithoutReplacement(['Ali'], 0, false, fakeCrypto([0])), /between 1 and 100/);
});

test('shuffleItems follows Fisher-Yates while retaining every eligible entry', () => {
  assert.deepEqual(picker.shuffleItems(['Ali', 'Sara', 'Hamza'], false, fakeCrypto([0, 0])), ['Sara', 'Hamza', 'Ali']);
  assert.deepEqual(picker.shuffleItems(['Ali', 'Ali', 'Sara'], true, fakeCrypto([0])), ['Sara', 'Ali']);
});

const fs = require('node:fs');
const path = require('node:path');

test('random picker page exposes multi-draw controls and explains its rules', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'random-picker.html'), 'utf8');
  for (const marker of [
    'id="winner-count"',
    'id="dedupe-items"',
    'id="shuffle"',
    'id="clean-list"',
    'id="copy-winners"',
    'assets/js/random-picker.js',
    'draw several winners without repeating an entry',
    'certified public draw'
  ]) {
    assert.ok(html.toLowerCase().includes(marker.toLowerCase()), marker);
  }
  assert.doesNotMatch(html, /<script>pick\.onclick=/);
});
