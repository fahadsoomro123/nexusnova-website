const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const json=file=>JSON.parse(read(file));

test('gold conversion math uses troy ounce and tola mass constants correctly',async()=>{
  const source=read('.github/scripts/live_gold_math.mjs');
  assert.match(source,/31\.1034768/);
  assert.match(source,/11\.6638038/);
  const mod=await import(`../.github/scripts/live_gold_math.mjs?test=${Date.now()}`);
  const quote=mod.computeGoldReferences({xauUsd:2400,usdPkr:280});
  assert.equal(Math.round(quote.usdPerGram*100)/100,77.16);
  assert.equal(Math.round(quote.pkrPerTola24k),251963);
  assert.equal(Math.round(quote.pkrPerTola22k),230966);
});

test('browser gold renderer reads only the cached local dataset',()=>{
  const client=read('assets/js/live-gold.js');
  assert.match(client,/assets\/data\/gold-latest\.json/);
  assert.doesNotMatch(client,/metals-api|goldapi|fetch\([^)]*https?:\/\//i);
});

test('gold page clearly separates international conversion from Pakistan Sarafa board rates',()=>{
  const page=read('gold-rates.html');
  assert.match(page,/International reference/);
  assert.match(page,/Pakistan local Sarafa quote/);
  assert.match(page,/not a jeweller quote/i);
});

test('gold updater selects a dedicated Sarafa API but keeps local quote fail-closed until server key and response validation',()=>{
  const updater=read('.github/scripts/update_live_gold.mjs');
  assert.match(updater,/SARAFAPK_API_KEY/);
  assert.match(updater,/api\.sarafa\.pk\/api\/gold-rate/);
  assert.match(updater,/computeGoldReferences/);
  assert.match(updater,/parseSarafaPayload/);
  assert.match(updater,/PK\/PAK|Pakistan|PKR/i);
  assert.match(updater,/if\(!res\.ok\)throw new Error/);
  const seed=json('assets/data/gold-latest.json');
  assert.equal(seed.local_sarafa.status,'pending_source');
  assert.equal(seed.local_sarafa.source.name,'Sarafa.pk Developer API');
  assert.match(seed.local_sarafa.message,/server-side Sarafa\.pk API key/i);
  assert.equal(seed.local_sarafa.per_tola_24k,undefined);
});

test('browser exposes selected Sarafa source without publishing an invented local quote',()=>{
  const client=read('assets/js/live-gold.js');
  assert.match(client,/data\.local_sarafa\?\.source/);
  assert.match(client,/localSource\.url/);
});

test('primary AdSense reviewer navigation keeps LIVE out while the noindex LIVE hub remains directly usable',()=>{
  const main=read('assets/js/main.js');
  const sitemap=read('sitemap-live.xml');
  const hub=read('live.html');
  assert.doesNotMatch(main,/\['live\.html','LIVE'\]/);
  assert.match(main,/\['gaming\.html','Gaming'\]/);
  assert.doesNotMatch(sitemap,/https:\/\/nexusnovatools\.com\/gold-rates\.html/);
  assert.match(read('gold-rates.html'),/<meta name="robots" content="noindex, follow">/);
  assert.match(hub,/href="gold-rates\.html"/);
});