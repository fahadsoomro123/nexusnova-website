'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');

test('JPG to PNG page explains lossy-source limits and alpha transparency', () => {
  const html = read('jpg-to-png.html');
  assert.match(html, /JPEG is a lossy format/i);
  assert.match(html, /JPG has no alpha channel|A JPG has no alpha channel/i);
  assert.match(html, /does not rebuild missing detail/i);
  assert.match(html, /EXIF metadata/i);
  assert.match(html, /developer\.mozilla\.org\/en-US\/docs\/Web\/Media\/Guides\/Formats\/Image_types/);
  assert.doesNotMatch(html, /data-ad-content-depth-remediation-v3/i);
});

test('WebP to PNG page documents transparency, still-image output and source limitations', () => {
  const html = read('webp-to-png.html');
  assert.match(html, /alpha channel/i);
  assert.match(html, /checkerboard transparency view/i);
  assert.match(html, /animated WebP/i);
  assert.match(html, /(?:does not|cannot) reverse quality loss/i);
  assert.match(html, /developers\.google\.com\/speed\/webp/);
  assert.doesNotMatch(html, /data-ad-content-depth-remediation-v2|data-ad-content-depth-remediation-v3/i);
});
