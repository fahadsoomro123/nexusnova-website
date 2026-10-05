const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const js=fs.readFileSync('assets/js/live-pakistan-today.js','utf8');
const aqi=JSON.parse(fs.readFileSync('assets/data/live-aqi.json','utf8'));
const crypto=JSON.parse(fs.readFileSync('assets/data/live-crypto.json','utf8'));

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
