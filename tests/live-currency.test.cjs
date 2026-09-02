const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');

const root=path.resolve(__dirname,'..');

test('currency updater converts PKR-based quotes into foreign-currency-to-PKR rates',async()=>{
  const module=await import(pathToFileURL(path.join(root,'.github/scripts/update_live_currency.mjs')).href);
  const rows=[
    {date:'2026-09-01',base:'PKR',quote:'USD',rate:0.00356},
    {date:'2026-09-01',base:'PKR',quote:'GBP',rate:0.00270},
    {date:'2026-09-01',base:'PKR',quote:'EUR',rate:0.00306},
    {date:'2026-09-01',base:'PKR',quote:'AED',rate:0.01308},
    {date:'2026-09-01',base:'PKR',quote:'SAR',rate:0.01335}
  ];
  const data=module.buildPayload(rows,{rates:[]});
  assert.equal(data.status,'ok');
  assert.equal(data.quote_currency,'PKR');
  assert.deepEqual(data.rates.map(item=>item.code),['USD','GBP','EUR','AED','SAR']);
  assert.ok(Math.abs(data.rates[0].rate-(1/0.00356))<0.001);
  assert.ok(data.rates.every(item=>Number.isFinite(item.rate)&&item.rate>0));
});

test('currency updater refuses incomplete source data',async()=>{
  const module=await import(pathToFileURL(path.join(root,'.github/scripts/update_live_currency.mjs')).href);
  assert.throws(()=>module.buildPayload([{date:'2026-09-01',base:'PKR',quote:'USD',rate:0.00356}],{rates:[]}),/Missing PKR\/GBP quote/);
});

test('public pages explain source, timestamp and non-real-time limitation',()=>{
  for(const file of ['live.html','currency-rates.html']){
    const html=fs.readFileSync(path.join(root,file),'utf8');
    assert.match(html,/Frankfurter/);
    assert.match(html,/data-live-data-date/);
    assert.match(html,/data-live-generated/);
    assert.match(html,/daily reference/i);
    assert.match(html,/second-by-second/i);
  }
});

test('browser code reads the cached local JSON instead of calling the upstream API',()=>{
  const js=fs.readFileSync(path.join(root,'assets/js/live-currency.js'),'utf8');
  assert.match(js,/assets\/data\/live-currency\.json/);
  assert.doesNotMatch(js,/api\.frankfurter\.dev/);
});
