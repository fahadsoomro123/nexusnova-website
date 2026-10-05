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

test('EIA parser reads latest U.S. weekly national row and previous-week change',async()=>{
  const moduleUrl=pathToFileURL(path.join(root,'.github/scripts/live_fuel_us_parser.mjs')).href;
  const {parseEiaWeeklyUsRow}=await import(moduleUrl);
  const html=`
    <h1>Weekly Retail Gasoline and Diesel Prices</h1>
    <div>Show Data By:</div>
    <table>
      <tr><th>08/17/26</th><th>08/24/26</th><th>08/31/26</th><th>View History</th></tr>
      <tr><td>U.S.</td><td>4.049</td><td>4.085</td><td>4.071</td><td>1990-2026</td></tr>
      <tr><td>East Coast (PADD1)</td><td>3.900</td><td>3.950</td><td>3.940</td></tr>
    </table>`;
  assert.deepEqual(parseEiaWeeklyUsRow(html),{
    data_date:'2026-08-31',
    usd_per_gallon:4.071,
    previous_usd_per_gallon:4.085,
    change_usd_per_gallon:-0.014
  });
});

test('EIA parser fails closed when the national row is missing or incomplete',async()=>{
  const moduleUrl=pathToFileURL(path.join(root,'.github/scripts/live_fuel_us_parser.mjs')).href;
  const {parseEiaWeeklyUsRow}=await import(moduleUrl);
  const malformed='<h1>Weekly Retail Gasoline and Diesel Prices</h1><div>Show Data By:</div><span>08/24/26 08/31/26</span><div>East Coast 4.000 4.100</div>';
  assert.throws(()=>parseEiaWeeklyUsRow(malformed),/U\.S\. national row/i);
});

test('fuel browser code reads only cached NexusNova JSON files for Pakistan, U.S. and EU',()=>{
  const client=read('assets/js/live-fuel.js');
  assert.match(client,/assets\/data\/live-fuel\.json/);
  assert.match(client,/assets\/data\/live-fuel-us\.json/);
  assert.match(client,/assets\/data\/live-fuel-eu\.json/);
  assert.doesNotMatch(client,/psopk\.com/);
  assert.doesNotMatch(client,/eia\.gov/);
  assert.doesNotMatch(client,/energy\.ec\.europa\.eu/);
});

test('fuel page shows Pakistan, U.S. and EU source freshness without fake real-time claims',()=>{
  const page=read('fuel-rates.html');
  assert.match(page,/Pakistan State Oil \(PSO\)/i);
  assert.match(page,/Effective from:/i);
  assert.match(page,/U\.S\. Energy Information Administration \(EIA\)/i);
  assert.match(page,/weekly national averages/i);
  assert.match(page,/USD per gallon/i);
  assert.match(page,/European Commission Weekly Oil Bulletin/i);
  assert.match(page,/EU27/i);
  assert.match(page,/EUR per litre/i);
  assert.match(page,/EUR\/1000 L/i);
  assert.match(page,/CC BY 4\.0/i);
  assert.match(page,/including taxes/i);
  assert.match(page,/not a local station quote/i);
  assert.match(page,/second-by-second/i);
  assert.match(page,/applicable freight charges/i);
});

test('Pakistan fuel data contract is explicit before and after the verified publisher runs',()=>{
  const data=JSON.parse(read('assets/data/live-fuel.json'));
  assert.equal(data.source.name,'Pakistan State Oil (PSO)');
  assert.ok(['pending','ok'].includes(data.status));
  if(data.status==='pending'){
    assert.equal(data.prices,null);
  }else{
    assert.ok(Number(data.prices?.petrol?.pkr_per_litre)>0);
    assert.ok(Number(data.prices?.diesel?.pkr_per_litre)>0);
    assert.match(data.effective_date,/^\d{4}-\d{2}-\d{2}$/);
  }
});

test('U.S. fuel data contract stays weekly, sourced and fail-closed',()=>{
  const data=JSON.parse(read('assets/data/live-fuel-us.json'));
  assert.equal(data.source.name,'U.S. Energy Information Administration (EIA)');
  assert.equal(data.country,'US');
  assert.ok(['pending','ok'].includes(data.status));
  if(data.status==='pending'){
    assert.equal(data.prices,null);
  }else{
    assert.match(data.data_date,/^\d{4}-\d{2}-\d{2}$/);
    assert.ok(Number(data.prices?.regular_gasoline?.usd_per_gallon)>0);
    assert.ok(Number(data.prices?.on_highway_diesel?.usd_per_gallon)>0);
  }
});

test('EU fuel data contract stays weekly, EU27, EUR/litre and fail-closed',()=>{
  const data=JSON.parse(read('assets/data/live-fuel-eu.json'));
  assert.equal(data.source.name,'European Commission Weekly Oil Bulletin');
  assert.equal(data.region,'EU27');
  assert.equal(data.currency,'EUR');
  assert.equal(data.unit,'EUR per litre');
  assert.equal(data.frequency,'weekly');
  assert.ok(['pending','ok'].includes(data.status));
  if(data.status==='pending'){
    assert.deepEqual(data.countries,[]);
  }else{
    assert.match(data.data_date,/^\d{4}-\d{2}-\d{2}$/);
    assert.equal(data.countries.length,27);
    assert.ok(data.countries.every(item=>Number(item.gasoline_eur_per_litre)>0&&Number(item.diesel_eur_per_litre)>0));
  }
});
