'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const html = fs.readFileSync(
  path.join(__dirname, '..', 'steam-playtime-calculator.html'),
  'utf8'
);

const expectedTitle = 'Steam Playtime Calculator: Hours to Days &amp; Daily Averages';
const expectedDescription = 'Convert Steam hours into full days and average hours per day, week and month. See examples for 100 to 2,000 hours instantly; no Steam login or ID needed.';

test('search title highlights Steam hours, days and daily averages', () => {
  assert.ok(html.includes('<title>' + expectedTitle + '</title>'));
  assert.ok(html.includes('<h1>Steam Playtime Calculator: Convert Hours to Days &amp; Averages</h1>'));
});

test('search description gives a concrete differentiator without promising automatic account access', () => {
  assert.ok(html.includes('<meta name="description" content="' + expectedDescription + '">'));
  assert.ok(html.includes('See examples for 100 to 2,000 hours instantly'));
  assert.ok(html.includes('no Steam login or ID needed'));
});

test('Open Graph and Twitter snippets match the search metadata', () => {
  assert.ok(html.includes('<meta property="og:title" content="' + expectedTitle + '">'));
  assert.ok(html.includes('<meta name="twitter:title" content="' + expectedTitle + '">'));
  assert.ok(html.includes('<meta property="og:description" content="' + expectedDescription + '">'));
  assert.ok(html.includes('<meta name="twitter:description" content="' + expectedDescription + '">'));
});

test('canonical URL, calculator inputs and privacy promise remain unchanged', () => {
  assert.ok(html.includes('<link rel="canonical" href="https://nexusnovatools.com/steam-playtime-calculator.html">'));
  assert.ok(html.includes('id="hours"'));
  assert.ok(html.includes('id="run"'));
  assert.ok(html.includes('no Steam login, Steam ID or account connection is required'));
});
