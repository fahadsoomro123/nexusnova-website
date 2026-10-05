const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {calculateNonTou,calculateTou,TOU}=require('../assets/js/electricity-bill-calculator.js');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('protected consumers receive the one-previous-slab benefit',()=>{
  const out=calculateNonTou({category:'protected',units:150,sanctionedLoadKw:3});
  assert.equal(out.energyCharge,1704.5);
  assert.equal(out.fixedCharge,900);
  assert.equal(out.total,2604.5);
});

test('unprotected consumers pay the landing-slab rate on all monthly units',()=>{
  const out=calculateNonTou({category:'unprotected',units:301,sanctionedLoadKw:3});
  assert.equal(out.energyRate,36.46);
  assert.equal(out.energyCharge,10974.46);
  assert.equal(out.fixedCharge,1200);
  assert.equal(out.total,12174.46);
});

test('lifeline does not receive a previous-slab benefit and has no fixed charge',()=>{
  const out=calculateNonTou({category:'lifeline',units:75,sanctionedLoadKw:1});
  assert.equal(out.energyRate,7.74);
  assert.equal(out.energyCharge,580.5);
  assert.equal(out.fixedCharge,0);
});

test('Time-of-Use uses peak/off-peak rates and higher of half load or MDI',()=>{
  const out=calculateTou({peakUnits:100,offPeakUnits:200,sanctionedLoadKw:6,mdiKw:4});
  assert.equal(TOU.peakRate,46.85);
  assert.equal(TOU.offPeakRate,34.53);
  assert.equal(out.applicableLoadKw,4);
  assert.equal(out.energyCharge,11591);
  assert.equal(out.fixedCharge,2700);
  assert.equal(out.total,14291);
});

test('signed FCA QTA charges and credits are applied without inventing values',()=>{
  const out=calculateNonTou({category:'unprotected',units:100,sanctionedLoadKw:2,fcaRate:1.5,qtaRate:-2,otherCharges:500,arrearsOrCredits:-100});
  assert.equal(out.fcaCharge,150);
  assert.equal(out.qtaCharge,-200);
  assert.equal(out.fixedCharge,550);
  assert.equal(out.total,3144);
});

test('category and load guards fail closed on invalid residential combinations',()=>{
  assert.throws(()=>calculateNonTou({category:'protected',units:201,sanctionedLoadKw:3}),/Protected mode supports up to 200 units/);
  assert.throws(()=>calculateNonTou({category:'lifeline',units:101,sanctionedLoadKw:1}),/Lifeline mode supports up to 100 units/);
  assert.throws(()=>calculateNonTou({category:'unprotected',units:300,sanctionedLoadKw:5}),/Time-of-Use mode/);
  assert.throws(()=>calculateTou({peakUnits:10,offPeakUnits:20,sanctionedLoadKw:4.9,mdiKw:2}),/5 kW or above/);
});

test('public page cites official tariff sources and labels changing adjustments as manual estimates',()=>{
  const html=read('electricity-bill-calculator-pakistan.html');
  assert.match(html,/S\.R\.O\. 279\(I\)\/2026/);
  assert.match(html,/NEPRA decision/);
  assert.match(html,/FCA \/ FPA rate/);
  assert.match(html,/QTA rate/);
  assert.match(html,/informational estimate/i);
  assert.match(html,/printed utility bill remains the authoritative amount|invoice is authoritative/i);
});

test('browser calculator is local-only and does not call utility or tariff APIs',()=>{
  const js=read('assets/js/electricity-bill-calculator.js');
  assert.doesNotMatch(js,/fetch\s*\(/);
  assert.doesNotMatch(js,/XMLHttpRequest/);
  assert.doesNotMatch(js,/api\./i);
});
