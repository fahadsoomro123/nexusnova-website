'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  getCanonicalPath,
  isToolPage,
  render
} = require('../assets/js/related-tools.js');

const ROOT = path.resolve(__dirname, '..');
const origin = 'https://nexusnovatools.com';
const tool = (title, url, category, tags = []) => ({ title, url, category, tags, type: 'tool' });

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.dataset = {};
    this.children = [];
    this.attributes = {};
    this.textContent = '';
    this.className = '';
    this.href = '';
  }
  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }
  append(...children) {
    children.forEach(child => this.appendChild(child));
  }
  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }
}

function hasDataset(node, key) {
  if (node.dataset && Object.prototype.hasOwnProperty.call(node.dataset, key)) return true;
  return (node.children || []).some(child => hasDataset(child, key));
}

function findDatasetNode(node, key) {
  if (node.dataset && Object.prototype.hasOwnProperty.call(node.dataset, key)) return node;
  for (const child of node.children || []) {
    const found = findDatasetNode(child, key);
    if (found) return found;
  }
  return null;
}

class FakeDocument {
  constructor(canonicalHref) {
    this.readyState = 'complete';
    this.head = new FakeElement('head');
    this.main = new FakeElement('main');
    this.canonical = canonicalHref ? { href: canonicalHref } : null;
  }
  createElement(tagName) {
    return new FakeElement(tagName);
  }
  querySelector(selector) {
    if (selector === 'main') return this.main;
    if (selector === 'link[rel="canonical"]' || selector === 'link[rel=canonical]') return this.canonical;
    if (selector === '[data-nexusnova-related-tools]') return findDatasetNode(this.main, 'nexusnovaRelatedTools');
    if (selector === '[data-nexusnova-related-tools-style]') return findDatasetNode(this.head, 'nexusnovaRelatedToolsStyle');
    return null;
  }
}

test('root-level and /tools/ routes are recognized only when they match tool records', () => {
  const data = [
    tool('Image Compressor', 'image-compressor.html', 'Images'),
    tool('Image Resizer', 'image-resizer.html', 'Images'),
    tool('JPG to PNG', 'jpg-to-png.html', 'Images'),
    tool('PNG to JPG', 'png-to-jpg.html', 'Images'),
    tool('Quote Card Maker', 'tools/quote-card-maker.html', 'Creator & Social')
  ];
  assert.equal(isToolPage(data, '/image-compressor.html', { origin }), true);
  assert.equal(isToolPage(data, '/tools/quote-card-maker.html', { origin }), true);
  assert.equal(isToolPage(data, '/articles/example.html', { origin }), false);
  assert.equal(isToolPage(data, '/missing-tool.html', { origin }), false);
  assert.equal(getCanonicalPath({ url: 'image-resizer.html' }, origin), '/image-resizer.html');
});

test('related grid dynamically mounts on a root-level tool page using search-core data', () => {
  const data = [
    tool('Image Compressor', 'image-compressor.html', 'Images', ['compress', 'image']),
    tool('Current route must be excluded', 'image-compressor.html', 'Images'),
    tool('Image Resizer', 'image-resizer.html', 'Images', ['image', 'resize']),
    tool('JPG to PNG', 'jpg-to-png.html', 'Images', ['image', 'convert']),
    tool('PNG to JPG', 'png-to-jpg.html', 'Images', ['image', 'convert']),
    tool('WebP to JPG', 'webp-to-jpg.html', 'Images', ['image', 'convert'])
  ];
  const doc = new FakeDocument('https://nexusnovatools.com/image-compressor.html');
  const win = {
    location: { pathname: '/image-compressor.html', origin },
    NexusNovaSearchData: data
  };

  const section = render(doc, win);
  assert.ok(section, 'the shared renderer should mount a section for an indexed root-level tool');
  assert.equal(section.dataset.nexusnovaRelatedTools, '');
  assert.equal(section.children[0].textContent, 'You May Also Like');
  assert.equal(section.children[2].children.length, 4);
  assert.ok(section.children[2].children.every(card => card.href.startsWith('/')));
  assert.ok(section.children[2].children.every(card => card.href !== '/image-compressor.html'));
  assert.equal(doc.head.children.length, 1, 'related-tools light-theme CSS should be injected');
});

test('renderer leaves non-tool pages untouched and does not duplicate a mounted grid', () => {
  const data = [
    tool('Image Compressor', 'image-compressor.html', 'Images'),
    tool('Image Resizer', 'image-resizer.html', 'Images'),
    tool('JPG to PNG', 'jpg-to-png.html', 'Images'),
    tool('PNG to JPG', 'png-to-jpg.html', 'Images')
  ];
  const articleDoc = new FakeDocument('https://nexusnovatools.com/articles/example.html');
  const articleWin = { location: { pathname: '/articles/example.html', origin }, NexusNovaSearchData: data };
  assert.equal(render(articleDoc, articleWin), null);
  assert.equal(articleDoc.main.children.length, 0);

  const toolDoc = new FakeDocument('https://nexusnovatools.com/image-compressor.html');
  const toolWin = { location: { pathname: '/image-compressor.html', origin }, NexusNovaSearchData: data };
  assert.ok(render(toolDoc, toolWin));
  assert.equal(render(toolDoc, toolWin), null);
  assert.equal(toolDoc.main.children.filter(node => node.dataset && 'nexusnovaRelatedTools' in node.dataset).length, 1);
});

test('global shared loader reaches all 103 indexed tool pages without hand-editing every page', () => {
  const core = fs.readFileSync(path.join(ROOT, 'assets/js/search-core.js'), 'utf8');
  const main = fs.readFileSync(path.join(ROOT, 'assets/js/main.js'), 'utf8');
  const matches = [...core.matchAll(/\{\s*title\s*:\s*"[^"]+"\s*,\s*url\s*:\s*"([^"]+)"\s*,\s*type\s*:\s*"tool"/g)];
  const routes = matches.map(match => match[1]);

  assert.equal(routes.length, 103, 'test the full search-core tool catalogue, not a hand-picked subset');
  assert.match(main, /related-tools-bootstrap\.js\?v=20261016-global-related-v2/);
  assert.match(innerShell, /related-tools-bootstrap\.js\?v=20261016-global-related-v2/);
  assert.match(tier1, /related-tools-bootstrap\.js\?v=20261016-global-related-v2/);
  assert.match(bootstrap, /search-core\.js\?v=20261016-global-related-v2/);
  assert.match(bootstrap, /related-tools\.js\?v=20261016-global-related-v2/);
  assert.match(bootstrap, /NexusNovaSearchData/);
  assert.match(bootstrap, /mountIfTool/);

  const uncovered = [];
  for (const route of routes) {
    const pagePath = path.join(ROOT, route);
    assert.ok(fs.existsSync(pagePath), 'indexed tool page is missing: ' + route);
    const html = fs.readFileSync(pagePath, 'utf8');
    if (!/assets\/js\/(?:main|nn-inner-shell|tier1-tools)\.js(?:[?"'])/.test(html) && !/assets\/js\/related-tools\.js(?:[?"'])/.test(html)) {
      uncovered.push(route);
    }
  }
  assert.deepEqual(uncovered, [], 'every indexed route must load either the shared bootstrap or its existing direct loader');
});
