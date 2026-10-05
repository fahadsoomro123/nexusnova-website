const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {TAX_YEAR,PERIOD,SLABS,calculateAnnualTax,calculateFromInput}=require('../assets/js/salary-tax-calculator-pakistan.js');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('Tax Year 2027 slab boundaries stay deterministic',()=>{
  const cases=[
    [600000,0],[1200000,6000],[2200000,116000],[3200000,316000],
    [4100000,541000],[5600000,976000],[7000000,1424000],[10000000,2474000]
  ];
  for(const [income,expected] of cases) assert.equal(calculateAnnualTax(income).annualTax,expected,`income ${income}`);
});

test('monthly taxable salary is annualized before applying the progressive table',()=>{
  const out=calculateFromInput({amount:100000,frequency:'monthly'});
  assert.equal(out.annualTaxableSalary,1200000);
  assert.equal(out.annualTax,6000);
  assert.equal(out.averageMonthlyTax,500);
});

test('top Tax Year 2027 salaried slab begins above Rs 7 million at 35 percent',()=>{
  const out=calculateAnnualTax(8000000);
  assert.equal(out.marginalRate,.35);
  assert.equal(out.annualTax,1774000);
  assert.equal(SLABS.at(-1).floor,7000000);
});

test('zero and invalid salary inputs fail safely',()=>{
  assert.equal(calculateAnnualTax(0).annualTax,0);
  assert.throws(()=>calculateAnnualTax(-1),/valid non-negative taxable salary/i);
  assert.throws(()=>calculateFromInput({amount:'abc',frequency:'annual'}),/valid non-negative taxable salary/i);
  assert.throws(()=>calculateFromInput({amount:100000,frequency:'weekly'}),/Unknown salary frequency/);
});

test('calculator identifies Tax Year 2027 period and salaried eligibility guard',()=>{
  assert.equal(TAX_YEAR,'2027');
  assert.equal(PERIOD,'1 July 2026 – 30 June 2027');
  const html=read('salary-tax-calculator-pakistan.html');
  assert.match(html,/Tax Year 2027/i);
  assert.match(html,/Finance Act 2026/i);
  assert.match(html,/exceeds 75% of taxable income/i);
  assert.match(html,/taxable salary/i);
});

test('public page exposes all final Finance Act 2026 salaried marginal rates and FBR sources',()=>{
  const html=read('salary-tax-calculator-pakistan.html');
  for(const rate of ['1%','11%','20%','25%','29%','32%','35%']) assert.match(html,new RegExp(rate.replace('%','%')));
  assert.match(html,/fbr\.gov\.pk\/Budget2026-27\/FinanceAct\.html/i);
  assert.match(html,/withholding-taxes-rate-card/i);
  assert.match(html,/Rs 1,424,000 \+ 35% above Rs 7,000,000/i);
});

test('salary tax calculator remains local-only and does not call tax APIs',()=>{
  const js=read('assets/js/salary-tax-calculator-pakistan.js');
  assert.doesNotMatch(js,/fetch\s*\(/);
  assert.doesNotMatch(js,/XMLHttpRequest/);
  assert.doesNotMatch(js,/api\./i);
});
