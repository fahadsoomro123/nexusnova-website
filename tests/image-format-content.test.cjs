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

test('PNG to JPG page explains alpha flattening, lossy output and dimensions', () => {
  const html = read('png-to-jpg.html');
  assert.match(html, /Transparent PNG pixels therefore become white/i);
  assert.match(html, /fixed quality setting/i);
  assert.match(html, /does not resize pixel dimensions/i);
  assert.match(html, /EXIF camera, date or location details/i);
  assert.doesNotMatch(html, /data-ad-content-depth-remediation-v3/i);
});

test('WebP to JPG page documents white-background alpha flattening and still-image output', () => {
  const html = read('webp-to-jpg.html');
  assert.match(html, /has no alpha channel/i);
  assert.match(html, /transparent WebP areas become white/i);
  assert.match(html, /animated WebP/i);
  assert.match(html, /does not guarantee a smaller file/i);
  assert.doesNotMatch(html, /data-ad-content-depth-remediation-v3/i);
});

test('Magic Drop clarifies what file suggestions do not certify', () => {
  const html = read('magic-drop.html');
  assert.match(html, /not an antivirus scanner/i);
  assert.match(html, /pixel dimensions/i);
  assert.match(html, /verif/i);
});

test('Image Resizer explains its actual PNG output and aspect-ratio example', () => {
  const html = read('image-resizer.html');
  const logic = read('assets/js/trending-tools.js');
  assert.match(html, /2400 × 1600 pixels/i);
  assert.match(html, /1200.*800 pixels/i);
  assert.match(html, /downloads a new PNG file named/i);
  assert.match(html, /nexusnova-resized\.png/i);
  assert.match(html, /EXIF camera, date or GPS details/i);
  assert.match(logic, /canvasBlob\(c,'image\/png'\)/);
  assert.match(logic, /downloadBlob\(blob,'nexusnova-resized\.png'\)/);
  assert.doesNotMatch(html, /data-ad-content-depth-remediation-v[23]/i);
});
