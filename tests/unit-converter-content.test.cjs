'use strict';

const fs = require('node:fs');
const test = require('node:test');
const assert = require('node:assert/strict');

test('unit converter teaches concrete checks for its supported categories', () => {
  const html = fs.readFileSync('unit-converter.html', 'utf8');
  assert.ok(html.includes('1 mile = 1.609344 kilometres'));
  assert.ok(html.includes('500 grams = 0.5 kilograms'));
  assert.ok(html.includes('0°C = 32°F = 273.15 K'));
  assert.ok(html.includes('multiply by 9/5 and add 32'));
  assert.ok(html.includes('It does not convert area, volume, speed, pressure or data storage'));
  assert.ok(html.includes('calculated locally in your browser'));
  assert.ok(html.includes('https://nexusnovatools.com/unit-converter.html'));
});
