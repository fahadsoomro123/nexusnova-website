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

  assert.match(html, /<h2 id="restoration-sources-title">Sources and further reading<\\/h2>/);
  for (const url of sources) {
    assert.ok(html.includes(url), 'missing primary image-editing reference: ' + url);
    const anchor = html.match(new RegExp('<a\\b(?=[^>]*href="' + url.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&') + '")[^>]*>', 'i'));
    assert.ok(anchor, 'source URL should be linked from the article');
    assert.match(anchor[0], /target="_blank"/);
    assert.match(anchor[0], /rel="noopener noreferrer"/);
  }

  const graph = [...html.matchAll(/<script type="application\\/ld\\+json">([\\s\\S]*?)<\\/script>/gi)]
    .map(block => JSON.parse(block[1]));
  const article = graph.find(item => item['@type'] === 'Article');
  assert.ok(article, 'Article structured data should remain valid');
  assert.equal(article.dateModified, '2026-10-14');
});
