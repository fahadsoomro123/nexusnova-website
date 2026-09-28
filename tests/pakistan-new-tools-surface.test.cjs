const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {normalizeCNIC,isValidCNIC,formatCNIC}=require('../assets/js/fbr-atl-status-checker.js');
const {calculate,SALARY,NON_SALARY}=require('../assets/js/fbr-tax-calculator-pakistan.js');
const {sources,makeUrl}=require('../assets/js/pakistan-jobs-finder.js');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('FBR CNIC checker normalizes and validates exactly 13 digits',()=>{
  assert.equal(normalizeCNIC('35202-1234567-1'),'3520212345671');
  assert.equal(isValidCNIC('35202-1234567-1'),true);
  assert.equal(formatCNIC('3520212345671'),'35202-1234567-1');
  assert.equal(isValidCNIC('35202-1234567'),false);
  assert.equal(isValidCNIC('35202-1234567-X'),false);
});

test('FBR CNIC checker is format-only and never calls a remote API',()=>{
  const js=read('assets/js/fbr-atl-status-checker.js');
  assert.doesNotMatch(js,/fetch\s*\(/);
  assert.doesNotMatch(js,/XMLHttpRequest/);
  assert.match(read('fbr-atl-status-checker.html'),/iris\.fbr\.gov\.pk/);
  assert.match(read('fbr-atl-status-checker.html'),/9966/);
});

test('FBR salary tax table boundaries are deterministic for Tax Year 2027',()=>{
  assert.equal(calculate(600000,'salary').annualTax,0);
  assert.equal(calculate(1200000,'salary').annualTax,6000);
  assert.equal(calculate(2200000,'salary').annualTax,116000);
  assert.equal(calculate(3200000,'salary').annualTax,316000);
  assert.equal(calculate(7000000,'salary').annualTax,1424000);
  assert.equal(calculate(7000001,'salary').annualTax,1424000.35);
  assert.equal(SALARY.at(-1).rate,.35);
});

test('FBR non-salaried table is kept separate from the salaried table',()=>{
  assert.equal(calculate(1200000,'business').annualTax,90000);
  assert.equal(calculate(1600000,'business').annualTax,170000);
  assert.equal(calculate(3200000,'business').annualTax,650000);
  assert.equal(calculate(5600000,'business').annualTax,1610000);
  assert.equal(NON_SALARY.at(-1).rate,.45);
});

test('FBR calculator surface is simple and local-only',()=>{
  const html=read('fbr-tax-calculator-pakistan.html');
  const js=read('assets/js/fbr-tax-calculator-pakistan.js');
  assert.match(html,/data-fbr-tax-form/);
  assert.match(html,/annualIncome/);
  assert.match(html,/incomeType/);
  assert.match(html,/Tax Year 2027/);
  assert.doesNotMatch(js,/fetch\s*\(/);
  assert.doesNotMatch(js,/XMLHttpRequest/);
});

test('Pakistan jobs finder exposes the requested government and private sources',()=>{
  assert.equal(sources.government.badge,'GOVERNMENT');
  assert.equal(sources.rozee.badge,'PRIVATE');
  assert.equal(sources.mustakbil.badge,'PRIVATE');
  assert.match(makeUrl('government','teacher'),/njp\.gov\.pk\/jobs/);
  assert.match(makeUrl('rozee','software engineer'),/rozee\.pk/);
  assert.equal(makeUrl('mustakbil','anything'),sources.mustakbil.url);
});

test('Pakistan jobs finder does not fake an in-site application submission',()=>{
  const html=read('pakistan-jobs-finder.html');
  const js=read('assets/js/pakistan-jobs-finder.js');
  assert.match(html,/original portal/i);
  assert.match(html,/Apply|application/i);
  assert.doesNotMatch(js,/fetch\s*\(/);
  assert.doesNotMatch(js,/navigator\.sendBeacon/);
});

test('all three new Pakistan pages have canonical URLs and shared navigation',()=>{
  for(const file of ['fbr-atl-status-checker.html','fbr-tax-calculator-pakistan.html','pakistan-jobs-finder.html']){
    const html=read(file);
    assert.match(html,/rel="canonical"/);
    assert.match(html,/href="index\.html"/);
    assert.match(html,/href="tools\.html"/);
    assert.match(html,/<main>/);
    assert.equal((html.match(/<\/main>/g)||[]).length,1);
  }
});
