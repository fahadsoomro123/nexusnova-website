const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const calc=require(path.join(root,'assets/js/zakat-calculator.js'));
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('Zakat estimate applies 2.5 percent only when selected nisab is met',()=>{
  const result=calc.calculateZakat({assets:[600000],liabilities:0,nisab:503529});
  assert.equal(result.netZakatable,600000);
  assert.equal(result.thresholdMet,true);
  assert.equal(result.zakat,15000);
  const below=calc.calculateZakat({assets:[500000],liabilities:0,nisab:503529});
  assert.equal(below.thresholdMet,false);
  assert.equal(below.zakat,0);
});

test('eligible liabilities reduce the entered asset total without creating a negative base',()=>{
  const result=calc.calculateZakat({assets:[400000,300000],liabilities:100000,nisab:503529});
  assert.equal(result.totalAssets,700000);
  assert.equal(result.deductibleLiabilities,100000);
  assert.equal(result.netZakatable,600000);
  assert.equal(result.zakat,15000);
  const overDebt=calc.calculateZakat({assets:[100000],liabilities:900000,nisab:1});
  assert.equal(overDebt.netZakatable,0);
  assert.equal(overDebt.deductibleLiabilities,100000);
});

test('invalid or negative calculator values fail closed instead of being guessed',()=>{
  assert.throws(()=>calc.calculateZakat({assets:['nope'],liabilities:0,nisab:503529}),/Invalid non-negative/);
  assert.throws(()=>calc.calculateZakat({assets:[100],liabilities:-1,nisab:503529}),/Invalid non-negative/);
  assert.equal(calc.parseAmount(''),0);
  assert.equal(calc.parseAmount('503,529'),503529);
});

test('page separates official Pakistan bank-deduction Nisab from personal Zakat guidance',()=>{
  const page=read('zakat-calculator-pakistan.html');
  assert.match(page,/Rs 503,529/);
  assert.match(page,/bank-deduction threshold/i);
  assert.match(page,/not.*universal personal/i);
  assert.match(page,/manual personal nisab amount/i);
  assert.match(page,/not an official government calculator/i);
  assert.match(page,/not.*fatwa/i);
});

test('page cites SBP source and keeps entered financial values local to browser calculation',()=>{
  const page=read('zakat-calculator-pakistan.html');
  const client=read('assets/js/zakat-calculator.js');
  assert.match(page,/sbp\.org\.pk\/bprd\/2026\/CL3-Notification\.pdf/);
  assert.match(page,/17 February 2026/);
  assert.match(page,/calculated in your browser/i);
  assert.doesNotMatch(client,/fetch\(|XMLHttpRequest|axios|https?:\/\//i);
});
