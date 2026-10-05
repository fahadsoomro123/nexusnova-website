const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');

const root=path.resolve(__dirname,'..');

test('currency updater converts required PKR-based quotes and keeps optional worldwide rates when available',async()=>{
  const module=await import(pathToFileURL(path.join(root,'.github/scripts/update_live_currency.mjs')).href);
  const rows=[
    {date:'2026-09-01',base:'PKR',quote:'USD',rate:0.00356},
    {date:'2026-09-01',base:'PKR',quote:'GBP',rate:0.00270},
    {date:'2026-09-01',base:'PKR',quote:'EUR',rate:0.00306},
    {date:'2026-09-01',base:'PKR',quote:'AED',rate:0.01308},
    {date:'2026-09-01',base:'PKR',quote:'SAR',rate:0.01335},
    {date:'2026-09-01',base:'PKR',quote:'CAD',rate:0.00482},
    {date:'2026-09-01',base:'PKR',quote:'JPY',rate:0.526}
  ];
  const data=module.buildPayload(rows,{rates:[]});
  assert.equal(data.status,'ok');
  assert.equal(data.quote_currency,'PKR');
  assert.deepEqual(data.rates.slice(0,5).map(item=>item.code),['USD','GBP','EUR','AED','SAR']);
  assert.ok(data.supported_codes.includes('CAD'));
  assert.ok(data.supported_codes.includes('JPY'));
  assert.ok(Math.abs(data.rates[0].rate-(1/0.00356))<0.001);
  assert.ok(data.rates.every(item=>Number.isFinite(item.rate)&&item.rate>0));
});

test('currency updater refuses incomplete Pakistan-featured source data but does not require every worldwide code',async()=>{
  const module=await import(pathToFileURL(path.join(root,'.github/scripts/update_live_currency.mjs')).href);
  const incomplete=[{date:'2026-09-01',base:'PKR',quote:'USD',rate:0.00356}];
  assert.throws(()=>module.buildPayload(incomplete,{rates:[]}),/Missing PKR\/GBP quote/);
  const requiredOnly=[
    {date:'2026-09-01',base:'PKR',quote:'USD',rate:0.00356},
    {date:'2026-09-01',base:'PKR',quote:'GBP',rate:0.00270},
    {date:'2026-09-01',base:'PKR',quote:'EUR',rate:0.00306},
    {date:'2026-09-01',base:'PKR',quote:'AED',rate:0.01308},
    {date:'2026-09-01',base:'PKR',quote:'SAR',rate:0.01335}
  ];
  assert.equal(module.buildPayload(requiredOnly,{rates:[]}).rates.length,5);
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

test('currency page exposes worldwide from and to selectors while keeping Pakistan featured rates',()=>{
  const html=fs.readFileSync(path.join(root,'currency-rates.html'),'utf8');
  assert.match(html,/data-live-from-currency/);
  assert.match(html,/data-live-to-currency/);
  assert.match(html,/USD, GBP, EUR, AED & SAR/);
  assert.match(html,/worldwide pair converter/i);
});

test('browser code derives pairs from cached PKR references and never calls the upstream API',()=>{
  const js=fs.readFileSync(path.join(root,'assets/js/live-currency.js'),'utf8');
  assert.match(js,/assets\/data\/live-currency\.json/);
  assert.match(js,/rates\.set\('PKR',1\)/);
  assert.match(js,/\(amount\*fromRate\)\/toRate/);
  assert.doesNotMatch(js,/api\.frankfurter\.dev/);
});
