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

test('Image Resizer offers honest format, quality, transparency and canvas-limit guidance', () => {
  const html = read('image-resizer.html');
  const logic = read('assets/js/trending-tools.js');
  assert.match(html, /2400 × 1600 pixels/i);
  assert.match(html, /1200.*800 pixels/i);
  assert.match(html, /choose PNG, JPEG or WebP/i);
  assert.match(html, /50–100% quality control/i);
  assert.match(html, /transparent areas are placed on a white background/i);
  assert.match(html, /32 million total pixels/i);
  assert.match(html, /EXIF camera, date or GPS details/i);
  assert.match(logic, /value="image\/png"/);
  assert.match(logic, /value="image\/jpeg"/);
  assert.match(logic, /value="image\/webp"/);
  assert.match(logic, /canvasBlob\(canvas,type,Number\(quality\.value\)\/100\)/);
  assert.match(logic, /context\.fillStyle='#fff'/);
  assert.match(logic, /w\*h>32000000/);
  assert.match(logic, /downloadBlob\(blob,\`nexusnova-resized\.\$\{extension\}\`\)/);
  assert.match(logic, /URL\.revokeObjectURL\(objectUrl\)/);
  assert.doesNotMatch(html, /data-ad-content-depth-remediation-v[23]/i);
});

test('HEIC to JPG supports bounded batch conversion with one local ZIP download', () => {
  const html = read('heic-to-jpg.html');
  const logic = read('assets/js/modern-image-converters.js');
  assert.match(html, /batch-convert up to 10 HEIC or HEIF iPhone photos/i);
  assert.match(html, /Can I convert multiple HEIC photos at once\?/i);
  assert.match(html, /100 MB combined per batch/i);
  assert.match(logic, /data-file multiple/);
  assert.match(logic, /maxFiles=10,maxTotalBytes=100\*1024\*1024/);
  assert.match(logic, /loadScript\(decoderUrl,'heic2any'\)/);
  assert.match(logic, /loadScript\(zipUrl,'JSZip'\)/);
  assert.match(logic, /new window\.JSZip\(\)/);
  assert.match(logic, /generateAsync\(\{type:'blob',compression:'STORE'\}/);
  assert.match(logic, /downloadBlob\(archive,'nexusnova-heic-to-jpg\.zip'\)/);
  assert.match(logic, /not uploaded to NexusNova/);
});

test('JPG to PDF supports page size, orientation, margins and a bounded local batch', () => {
  const html = read('jpg-to-pdf.html');
  const logic = read('assets/js/popular-tools.js');
  assert.match(html, /id="pdf-page-size"/);
  assert.match(html, /value="a4"/);
  assert.match(html, /value="letter"/);
  assert.match(html, /value="legal"/);
  assert.match(html, /id="pdf-orientation"/);
  assert.match(html, /Auto \(match each image\)/);
  assert.match(html, /id="pdf-margin"/);
  assert.match(html, /100 MB combined/i);
  assert.match(logic, /maxPdfInputBytes = 100 \* 1024 \* 1024/);
  assert.match(logic, /pdfPageSizes = \{ a4: \[595\.28, 841\.89\], letter: \[612, 792\], legal: \[612, 1008\] \}/);
  assert.match(logic, /orientation === 'auto' && img\.width > img\.height/);
  assert.match(logic, /MediaBox \[0 0 \$\{pageW\} \$\{pageH\}\]/);
  assert.match(logic, /\[pageSizeKey\] \|\| 'A4'/);
});

