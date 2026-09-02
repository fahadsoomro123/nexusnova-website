const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('gold conversion math uses troy ounce and tola mass constants correctly',async()=>{
  const moduleUrl=pathToFileURL(path.join(root,'.github/scripts/live_gold_math.mjs')).href;
  const {deriveGoldPkr,TROY_OUNCE_GRAMS,TOLA_GRAMS}=await import(moduleUrl);
  assert.equal(TROY_OUNCE_GRAMS,31.1034768);
  assert.equal(TOLA_GRAMS,11.6638038);
  const result=deriveGoldPkr(4000,280);
  assert.equal(result.per_tola_24k,420000);
  assert.equal(result.per_tola_22k,385000);
  assert.equal(result.per_10g_24k,360088.36);
  assert.equal(result.per_gram_24k,36008.84);
});

test('browser gold renderer reads only the cached local dataset',()=>{
  const client=read('assets/js/live-gold.js');
  assert.match(client,/assets\/data\/live-gold\.json/);
  assert.doesNotMatch(client,/api\.gold-api\.com/);
  assert.doesNotMatch(client,/frankfurter\.dev/);
});

test('gold page clearly separates international conversion from Pakistan Sarafa board rates',()=>{
  const page=read('gold-rates.html');
  assert.match(page,/kept separate from local Sarafa board rates/i);
  assert.match(page,/Pakistan Sarafa board rate/i);
  assert.match(page,/does not label an international conversion as the Pakistan Sarafa Bazaar rate/i);
  assert.match(page,/upstream gold timestamp/i);
});

test('gold updater selects a dedicated Sarafa API but keeps local quote fail-closed until server key and response validation',()=>{
  const updater=read('.github/scripts/update_live_gold.mjs');
  const seed=JSON.parse(read('assets/data/live-gold.json'));
  assert.match(updater,/https:\/\/api\.gold-api\.com\/price\/XAU/);
  assert.match(updater,/deriveGoldPkr/);
  assert.match(updater,/Sarafa\.pk Developer API/);
  assert.match(updater,/https:\/\/api\.sarafa\.pk/);
  assert.equal(seed.local_sarafa.status,'source_ready_key_required');
  assert.equal(seed.local_sarafa.source.name,'Sarafa.pk Developer API');
  assert.match(seed.local_sarafa.message,/server-side Sarafa\.pk API key/i);
  assert.equal(seed.local_sarafa.per_tola_24k,undefined);
});

test('browser exposes selected Sarafa source without publishing an invented local quote',()=>{
  const client=read('assets/js/live-gold.js');
  assert.match(client,/data\.local_sarafa\?\.source/);
  assert.match(client,/localSource\.url/);
});

test('shared navigation exposes NexusNova LIVE and gold is indexed in the LIVE sitemap',()=>{
  const main=read('assets/js/main.js');
  const sitemap=read('sitemap-live.xml');
  const hub=read('live.html');
  assert.match(main,/\['live\.html','LIVE'\]/);
  assert.match(sitemap,/https:\/\/nexusnovatools\.com\/gold-rates\.html/);
  assert.match(hub,/href="gold-rates\.html"/);
});
