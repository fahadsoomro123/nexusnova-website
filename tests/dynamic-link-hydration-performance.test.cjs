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
  assert.ok(source.includes('if(!body||!body.querySelector(dynamicLinkSelector))return'));
  assert.ok(source.includes('const scheduleDynamicLinkHydration=()=>'));
  assert.ok(source.includes("window.requestIdleCallback(startDynamicLinkHydration,{timeout:1800})"));
  assert.ok(source.includes("document.addEventListener('click',hydrateClickedDynamicLink,true)"));
  assert.ok(
    !source.includes('hydrateDynamicLinks(body||document)'),
    'the whole-body link scan must not run on pages with no dynamic links'
  );
  assert.ok(
    !source.includes('enforceSelectedHeaderLogo') &&
    !source.includes('normalizeFooterStructure') &&
    !source.includes('global-shell-guard.js'),
    'header/footer must remain static instead of being mutated at runtime'
  );
  assert.ok(source.includes('},2800);'), 'share control should wait until after initial rendering');

});
