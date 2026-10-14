'use strict';

const fs = require('node:fs');
const test = require('node:test');
const assert = require('node:assert/strict');

test('dynamic link hydration scans inserted subtrees instead of the entire document on each mutation', () => {
  const source = fs.readFileSync('assets/js/main.js', 'utf8');
  assert.ok(source.includes("const dynamicLinkSelector='a[data-nova-dynamic-href]'"));
  assert.ok(source.includes('const hydrateDynamicLink=link=>'));
  assert.ok(source.includes('const hydrateDynamicLinks=root=>'));
  assert.ok(source.includes('const observer=new MutationObserver(records=>'));
  assert.ok(source.includes('record.addedNodes.forEach(node=>'));
  assert.ok(source.includes('if(node.nodeType===1)hydrateDynamicLinks(node)'));
  assert.ok(source.includes("if(['http:','https:'].includes(url.protocol))link.setAttribute('href',url.href)"));
  assert.ok(source.includes('hydrateDynamicLinks(body||document)'));
  assert.ok(
    !source.includes('const observer=new MutationObserver(hydrateDynamicLinks)'),
    'observer must not rescan the whole document on every body mutation'
  );
});
