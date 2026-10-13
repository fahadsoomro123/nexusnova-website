const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const js=fs.readFileSync('assets/js/live-pakistan-today.js','utf8');
const aqi=JSON.parse(fs.readFileSync('assets/data/live-aqi.json','utf8'));
const crypto=JSON.parse(fs.readFileSync('assets/data/live-crypto.json','utf8'));
const aqiPage=fs.readFileSync('aqi-live.html','utf8');
const cryptoPage=fs.readFileSync('crypto-live.html','utf8');
const sitemap=fs.readFileSync('sitemap.xml','utf8');

test('optional LIVE modules derive availability from their published JSON status',()=>{
  assert.match(js,/assets\/data\/live-aqi\.json/);
  assert.match(js,/assets\/data\/live-crypto\.json/);
  assert.match(js,/data\?\.status==='ok'/);
  assert.match(js,/classList\.toggle\('is-active',ready\)/);
  assert.match(js,/classList\.toggle\('is-pending',!ready\)/);
});

test('pending source modules are labelled as source activation pending',()=>{
  assert.match(js,/AQI source activation pending/);
  assert.match(js,/Crypto source activation pending/);
});

test('current seeded optional datasets remain fail-closed until credentials publish validated data',()=>{
  assert.equal(aqi.status,'pending');
  assert.equal(crypto.status,'pending');
  assert.deepEqual(aqi.cities,[]);
  assert.deepEqual(crypto.coins,[]);
});


test('pending AQI and crypto pages are not indexable or submitted in the sitemap',()=>{
  assert.match(aqiPage,/<meta name="robots" content="noindex,follow">/);
  assert.match(cryptoPage,/<meta name="robots" content="noindex,follow">/);
  assert.doesNotMatch(sitemap,/https:\/\/nexusnovatools\.com\/(?:aqi-live|crypto-live)\.html/);
});
