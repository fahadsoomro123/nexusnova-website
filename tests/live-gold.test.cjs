const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8');

/* ... existing tests ... */

test('browser exposes selected Sarafa source without publishing an invented local quote',()=>{
  const client=read('assets/js/live-gold.js');
  assert.match(client,/data\.local_sarafa\?\.source/);
  assert.match(client,/localSource\.url/);
});

test('primary AdSense reviewer navigation keeps LIVE out while the noindex LIVE hub remains directly usable',()=>{
  const siteShell=read('assets/js/site-main.js');
  const sitemap=read('sitemap-live.xml');
  const hub=read('live.html');
  assert.doesNotMatch(siteShell,/\['live\.html','LIVE'\]/);
  assert.match(siteShell,/\['gaming\.html','Gaming'\]/);
  assert.doesNotMatch(sitemap,/https:\/\/nexusnovatools\.com\/gold-rates\.html/);
  assert.match(read('gold-rates.html'),/<meta name="robots" content="noindex, follow">/);
  assert.match(hub,/href="gold-rates\.html"/);
});