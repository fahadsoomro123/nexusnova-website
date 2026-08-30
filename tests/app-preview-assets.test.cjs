'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const approvedPrefix = 'ota/files/assets/icons/nova-hub/';

test('Android app preview uses approved real Nova Hub image assets only', () => {
  const app = read('app.html');
  const duo = read('assets/js/app-duo.js');

  const htmlImageSources = [...app.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["']/gi)].map(match => match[1]);
  assert.ok(htmlImageSources.length >= 12, 'Expected real Nova Hub preview images in app.html');
  for (const src of htmlImageSources) {
    assert.ok(src.startsWith(approvedPrefix), `Unapproved app preview image source: ${src}`);
  }

  const duoAssetSources = [...duo.matchAll(/["'](ota\/files\/assets\/icons\/nova-hub\/[^"']+)["']/g)].map(match => match[1]);
  assert.ok(duoAssetSources.length >= 1, 'Expected approved mining preview asset candidates');
  for (const src of duoAssetSources) {
    assert.ok(src.startsWith(approvedPrefix), `Unapproved mining preview image source: ${src}`);
  }

  assert.doesNotMatch(app, /data:image|placeholder\.(?:png|jpe?g|webp)|generated[-_ ]preview/i);
  assert.doesNotMatch(duo, /data:image|placeholder\.(?:png|jpe?g|webp)|generated[-_ ]preview/i);
});

test('Android app preview keeps truthful release and mining presentation', () => {
  const app = read('app.html');
  const duo = read('assets/js/app-duo.js');

  assert.match(app, /57\+ smart tools/i);
  assert.match(app, /no fake balance, rate or countdown/i);
  assert.match(app, /Signed APK and Play Store destinations appear only when genuinely verified/i);
  assert.match(duo, /Preview only\. No fake balance, rate or countdown/i);
  assert.match(duo, /24H manual/);
  assert.match(duo, /START MINING • MANUAL/);
});
