'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const generatedBlockMarker = /data-ad-content-depth-remediation-v2/i;

function collectHtml(dir) {
  const found = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...collectHtml(absolute));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) found.push(absolute);
  }
  return found;
}

function publicHtmlFiles() {
  const topLevel = fs.readdirSync(root, { withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.toLowerCase().endsWith('.html'))
    .map(entry => path.join(root, entry.name));
  const nested = ['articles', 'tech', 'guides']
    .flatMap(name => {
      const dir = path.join(root, name);
      return fs.existsSync(dir) ? collectHtml(dir) : [];
    });
  return [...topLevel, ...nested];
}

test('published pages do not contain the automated content-depth filler block', () => {
  const pages = publicHtmlFiles();
  assert.ok(pages.length >= 80, 'site HTML inventory was unexpectedly small');
  const offenders = pages
    .filter(file => generatedBlockMarker.test(fs.readFileSync(file, 'utf8')))
    .map(file => path.relative(root, file))
    .sort();
  assert.deepEqual(offenders, [], 'Remove the repeated automated content-depth section instead of republishing it');
});
