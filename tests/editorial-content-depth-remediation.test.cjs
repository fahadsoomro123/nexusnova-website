'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const generatedBlockMarker = /data-ad-content-depth-remediation-v[23]|intended to support a real task, so this section focuses on verification and correct use rather than filler/i;

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

test('published pages do not contain automated depth markers or generated meta-filler intros', () => {
  const pages = publicHtmlFiles();
  assert.ok(pages.length >= 80, 'site HTML inventory was unexpectedly small');
  const offenders = pages
    .filter(file => generatedBlockMarker.test(fs.readFileSync(file, 'utf8')))
    .map(file => path.relative(root, file))
    .sort();
  assert.deepEqual(offenders, [], 'Remove generated meta-filler and preserve only topic-specific guidance');
});

test('photo restoration guide cites primary documentation for resampling and generative edits', () => {
  const file = path.join(root, 'articles', 'ai-photo-restoration-vs-enhancement.html');
  const html = fs.readFileSync(file, 'utf8');
  const sources = [
    'https://helpx.adobe.com/photoshop/desktop/crop-resize-transform/resize-adjust-resolution/resampling-options.html',
    'https://helpx.adobe.com/photoshop/desktop/repair-retouch/clean-restore-images/enhance-image-quality-with-generative-upscale.html',
    'https://helpx.adobe.com/photoshop/desktop/create-open-import-images/create-images/edit-images-with-generative-fill.html',
  ];

  assert.ok(html.includes('<h2 id="restoration-sources-title">Sources and further reading</h2>'));
  for (const url of sources) {
    assert.ok(html.includes(url), 'missing primary image-editing reference: ' + url);
    const start = html.indexOf('<a href="' + url + '"');
    assert.notEqual(start, -1, 'source URL should be linked from the article');
    const end = html.indexOf('>', start);
    const anchor = html.slice(start, end + 1);
    assert.ok(anchor.includes('target="_blank"'));
    assert.ok(anchor.includes('rel="noopener noreferrer"'));
  }

  const jsonLd = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i);
  assert.ok(jsonLd, 'Article structured data should be present');
  const article = JSON.parse(jsonLd[1]);
  assert.equal(article['@type'], 'Article');
  assert.equal(article.dateModified, '2026-10-14');
});
