'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
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
    if (selector === '[data-nexusnova-related-content]') return findDatasetNode(this.main, 'nexusnovaRelatedContent');
    if (selector === '[data-nexusnova-featured-utilities]') return findDatasetNode(this.main, 'nexusnovaFeaturedUtilities');
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
  assert.match(doc.head.children[0].textContent, /grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
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

test('global bootstrap loads the search index then dynamically mounts related cards for a canonical tool route', () => {
  const source = fs.readFileSync(path.join(ROOT, 'assets/js/related-tools-bootstrap.js'), 'utf8');
  const doc = new FakeDocument('https://nexusnovatools.com/image-compressor.html');
  const win = {
    document: doc,
    location: { pathname: '/image-compressor.html', origin },
    NexusNovaSearchData: null
  };

  vm.runInNewContext(source, { window: win, URL, Set });

  const coreScript = doc.head.children.find(node => String(node.src).includes('search-core.js'));
  assert.ok(coreScript, 'the bootstrap should fetch search-core when the page has no indexed data');
  assert.match(coreScript.src, /search-core\.js\?v=20261016-related-content-v1/);

  win.NexusNovaSearchData = [
    tool('Image Compressor', 'image-compressor.html', 'Images', ['image', 'compress']),
    tool('Image Resizer', 'image-resizer.html', 'Images', ['image', 'resize']),
    tool('JPG to PNG', 'jpg-to-png.html', 'Images', ['image', 'convert']),
    tool('PNG to JPG', 'png-to-jpg.html', 'Images', ['image', 'convert']),
    tool('WebP to JPG', 'webp-to-jpg.html', 'Images', ['image', 'convert'])
  ];
  coreScript.onload();

  const renderer = doc.head.children.find(node => String(node.src).includes('related-tools.js'));
  assert.ok(renderer, 'the bootstrap should then load the shared renderer for indexed tool routes');
  win.NexusNovaRelatedTools = require('../assets/js/related-tools.js');
  renderer.onload();

  const section = doc.querySelector('[data-nexusnova-related-tools]');
  assert.ok(section, 'the shared bootstrap should mount the actual related-tools grid');
  assert.equal(section.children[0].textContent, 'You May Also Like');
  assert.equal(section.children[2].children.length, 4);
  assert.ok(section.children[2].children.every(card => card.href !== '/image-compressor.html'));
});

test('articles and guides dynamically mount recommended tools plus related reading', () => {
  const data = [
    tool('Image Compressor', 'image-compressor.html', 'Images', ['image compression', 'compress images', 'webp']),
    tool('Image Resizer', 'image-resizer.html', 'Images', ['image resize', 'images', 'webp']),
    tool('JPG to PDF', 'jpg-to-pdf.html', 'PDF & Documents', ['jpg to pdf', 'images', 'pdf']),
    tool('PDF Document Workbench', 'document-workbench.html', 'PDF & Documents', ['pdf', 'merge pdf', 'documents']),
    { title: 'Compress Images for the Web', url: 'articles/compress-images-for-web.html', type: 'article', category: 'Articles', tags: ['image compression', 'webp', 'images', 'compress images'] },
    { title: 'JPG vs PNG vs WebP', url: 'articles/image-formats.html', type: 'article', category: 'Articles', tags: ['images', 'image formats', 'webp', 'png'] },
    { title: 'Image Compression Guide', url: 'guides/image-compression.html', type: 'guide', category: 'Images', tags: ['image compression', 'webp', 'images', 'compress'] },
    { title: 'JPG to PDF Guide', url: 'guides/jpg-to-pdf.html', type: 'guide', category: 'PDF & Documents', tags: ['jpg to pdf', 'images', 'pdf'] }
  ];

  for (const current of [
    { path: '/articles/compress-images-for-web.html', title: 'Compress Images for the Web' },
    { path: '/guides/image-compression.html', title: 'Image Compression Guide' },
    { path: '/articles.html', title: 'Articles' },
    { path: '/guides.html', title: 'Guides' }
  ]) {
    const doc = new FakeDocument(origin + current.path);
    const win = { location: { pathname: current.path, origin }, NexusNovaSearchData: data };
    const section = render(doc, win);
    assert.ok(section, 'must dynamically mount content recommendations on ' + current.path);
    assert.equal(section.children[0].textContent, 'Recommended Tools & Related Guides');
    assert.ok(section.dataset.nexusnovaRelatedContent === '');
    assert.ok(section.children[2].children.length >= 4);
    assert.ok(section.children[2].children.some(card => card.href.startsWith('/articles/') || card.href.startsWith('/guides/')),
      'article/guide recommendations should include internal reading links');
  }
});

test('category pages and categories directory dynamically mount Featured Utilities', () => {
  const data = [
    tool('Image Compressor', 'image-compressor.html', 'Images', ['images', 'compress']),
    tool('Image Resizer', 'image-resizer.html', 'Images', ['images', 'resize']),
    tool('HEIC to JPG', 'heic-to-jpg.html', 'Images', ['images', 'convert']),
    tool('JPG to PNG', 'jpg-to-png.html', 'Images', ['images', 'convert']),
    tool('JPG to PDF', 'jpg-to-pdf.html', 'PDF & Documents', ['pdf', 'images']),
    { title: 'Images', url: 'image-tools.html', type: 'category', category: '', tags: ['images', 'image tools', 'compression'] }
  ];

  for (const current of [
    { path: '/image-tools.html', title: 'Images' },
    { path: '/categories.html', title: 'Categories' }
  ]) {
    const doc = new FakeDocument(origin + current.path);
    const win = { location: { pathname: current.path, origin }, NexusNovaSearchData: data };
    const section = render(doc, win);
    assert.ok(section, 'must mount featured utilities on ' + current.path);
    assert.equal(section.children[0].textContent, 'Featured Utilities');
    assert.equal(section.children[2].children.length, 4);
    assert.equal(section.dataset.nexusnovaFeaturedUtilities, '');
  }
});

test('global shared loader reaches all 103 indexed tool pages without hand-editing every page', () => {
  const core = fs.readFileSync(path.join(ROOT, 'assets/js/search-core.js'), 'utf8');
  const searchCore = core;
  const articlesIndex = fs.readFileSync(path.join(ROOT, 'articles.html'), 'utf8');
  const guidesIndex = fs.readFileSync(path.join(ROOT, 'guides.html'), 'utf8');
  const categoriesIndex = fs.readFileSync(path.join(ROOT, 'categories.html'), 'utf8');
  const main = fs.readFileSync(path.join(ROOT, 'assets/js/main.js'), 'utf8');
  const innerShell = fs.readFileSync(path.join(ROOT, 'assets/js/nn-inner-shell.js'), 'utf8');
  const tier1 = fs.readFileSync(path.join(ROOT, 'assets/js/tier1-tools.js'), 'utf8');
  const analytics = fs.readFileSync(path.join(ROOT, 'assets/js/analytics.js'), 'utf8');
  const bootstrap = fs.readFileSync(path.join(ROOT, 'assets/js/related-tools-bootstrap.js'), 'utf8');
  const matches = [...searchCore.matchAll(/\{\s*title\s*:\s*"[^"]+"\s*,\s*url\s*:\s*"([^"]+)"\s*,\s*type\s*:\s*"(tool|article|guide|category)"/g)];
  const entries = matches.map(match => ({ url: match[1], type: match[2] }));
  const counts = entries.reduce((result, entry) => {
    result[entry.type] = (result[entry.type] || 0) + 1;
    return result;
  }, {});
  assert.deepEqual(counts, { tool: 103, category: 9, article: 34, guide: 14 });

  assert.match(main, /related-tools-bootstrap\.js\?v=20261016-related-content-v1/);
  assert.match(innerShell, /related-tools-bootstrap\.js\?v=20261016-related-content-v1/);
  assert.match(tier1, /related-tools-bootstrap\.js\?v=20261016-related-content-v1/);
  assert.match(searchCore, /related-tools-bootstrap\.js\?v=20261016-related-content-v1/);
  assert.match(analytics, /related-tools-bootstrap\.js\?v=20261016-related-content-v1/);
  assert.match(bootstrap, /search-core\.js\?v=20261016-related-content-v1/);
  assert.match(bootstrap, /related-tools\.js\?v=20261016-related-content-v1/);
  assert.match(bootstrap, /NexusNovaSearchData/);
  assert.match(bootstrap, /mountIfSupportedPage/);
  assert.match(fs.readFileSync(path.join(ROOT, 'assets/js/related-tools.js'), 'utf8'), /Recommended Tools & Related Guides/);
  assert.match(fs.readFileSync(path.join(ROOT, 'assets/js/related-tools.js'), 'utf8'), /Featured Utilities/);

  for (const indexHtml of [articlesIndex, guidesIndex, categoriesIndex]) {
    assert.match(indexHtml, /assets\/js\/search-core\.js/);
  }

  const uncovered = [];
  for (const entry of entries) {
    const pagePath = path.join(ROOT, entry.url);
    assert.ok(fs.existsSync(pagePath), 'indexed ' + entry.type + ' page is missing: ' + entry.url);
    const html = fs.readFileSync(pagePath, 'utf8');
    if (!/assets\\/js\\/(?:main|nn-inner-shell|tier1-tools|search-core|related-tools|analytics)\.js(?:[?"'])/.test(html)) {
      uncovered.push(entry.url);
    }
  }
  for (const route of ['articles.html', 'guides.html', 'categories.html']) {
    const html = fs.readFileSync(path.join(ROOT, route), 'utf8');
    if (!/assets\\/js\\/(?:main|nn-inner-shell|tier1-tools|search-core|related-tools|analytics)\.js(?:[?"'])/.test(html)) uncovered.push(route);
  }
  assert.deepEqual(uncovered, [], 'all tool, article, guide and category routes must load a shared bootstrap entrypoint');
});
