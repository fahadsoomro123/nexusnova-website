const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('PSO parser selects the newest validated petrol and diesel block instead of an archive',async()=>{
  const moduleUrl=pathToFileURL(path.join(root,'.github/scripts/live_fuel_parser.mjs')).href;
  const {parsePsoFuelPrices}=await import(moduleUrl);
  const html=`
    <div>Effective From: August 08, 2026</div>
    <table><tr><td>PREMIER EURO 5</td><td>Rs.327.62/Ltr</td></tr><tr><td>HI-CETANE DIESEL EURO 5</td><td>Rs.380.86/Ltr</td></tr></table>
    <div>Effective From: September 01, 2026</div>
    <table><tr><td>PREMIER EURO 5</td><td>Rs.342.79/Ltr</td></tr><tr><td>HI-CETANE DIESEL EURO 5</td><td>Rs.370.41/Ltr</td></tr></table>`;
  assert.deepEqual(parsePsoFuelPrices(html),{effective_date:'2026-09-01',petrol_pkr_per_litre:342.79,diesel_pkr_per_litre:370.41});
});

test('PSO parser fails closed when petrol and diesel are not validated together',async()=>{
  const moduleUrl=pathToFileURL(path.join(root,'.github/scripts/live_fuel_parser.mjs')).href;
  const {parsePsoFuelPrices}=await import(moduleUrl);
  assert.throws(()=>parsePsoFuelPrices('<div>Effective From: September 01, 2026</div><p>PREMIER EURO 5 Rs.342.79/Ltr</p>'),/No validated PSO POL block/i);
});

test('fuel browser code reads cached local JSON and never scrapes PSO from the visitor browser',()=>{
  const client=read('assets/js/live-fuel.js');
  assert.match(client,/assets\/data\/live-fuel\.json/);
  assert.doesNotMatch(client,/psopk\.com/);
});

test('fuel page shows source freshness and avoids fake real-time claims',()=>{
  const page=read('fuel-rates.html');
  assert.match(page,/Pakistan State Oil \(PSO\)/i);
  assert.match(page,/Effective from:/i);
  assert.match(page,/not a second-by-second/i);
  assert.match(page,/applicable freight charges/i);
});

test('fuel seed data remains unavailable until the verified publisher runs',()=>{
  const seed=JSON.parse(read('assets/data/live-fuel.json'));
  assert.equal(seed.status,'pending');
  assert.equal(seed.prices,null);
});
