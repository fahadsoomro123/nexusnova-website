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
  const quote=mod.deriveGoldPkr(2400,280);
  assert.equal(quote.per_gram_24k,21605.3);
  assert.equal(quote.per_tola_24k,252000);
  assert.equal(quote.per_tola_22k,231000);
  assert.equal(quote.troy_ounce_grams,31.1034768);
  assert.equal(quote.tola_grams,11.6638038);
});

test('browser gold renderer reads only NexusNova cached gold datasets',()=>{
  const client=read('assets/js/live-gold.js');
  assert.match(client,/assets\/data\/live-gold\.json/);
  assert.match(client,/assets\/data\/live-gold-history\.json/);
  assert.doesNotMatch(client,/fetch\([^)]*https?:\/\//i);
});

test('gold page clearly separates international conversion from Pakistan Sarafa board rates',()=>{
  const page=read('gold-rates.html');
  assert.match(page,/INTERNATIONAL REFERENCE/i);
  assert.match(page,/Pakistan Sarafa board rate/i);
  assert.match(page,/not a guaranteed jeweller, bullion dealer or Sarafa Bazaar transaction price/i);
  assert.match(page,/not label an international conversion as the Pakistan Sarafa Bazaar rate/i);
});

test('gold updater records the selected Sarafa source but keeps local quote fail-closed until credential integration',()=>{
  const updater=read('.github/scripts/update_live_gold.mjs');
  assert.match(updater,/deriveGoldPkr/);
  assert.match(updater,/source_ready_key_required/);
  assert.match(updater,/api\.sarafa\.pk/);
  assert.match(updater,/X-API-Key required/);
  assert.match(updater,/not publishing its local quote until a server-side Sarafa\.pk API key is configured/i);
  const seed=json('assets/data/live-gold.json');
  assert.equal(seed.local_sarafa.status,'source_ready_key_required');
  assert.equal(seed.local_sarafa.source.name,'Sarafa.pk Developer API');
  assert.equal(seed.local_sarafa.source.api_base,'https://api.sarafa.pk');
  assert.match(seed.local_sarafa.source.endpoint,/public-rates\/gold\/cities/);
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