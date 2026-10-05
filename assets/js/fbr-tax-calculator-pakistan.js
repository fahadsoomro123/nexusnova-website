(()=>{
  const SALARY=[
    {max:600000,base:0,floor:0,rate:0,label:'Up to Rs 600,000'},
    {max:1200000,base:0,floor:600000,rate:.01,label:'Rs 600,001–1,200,000'},
    {max:2200000,base:6000,floor:1200000,rate:.11,label:'Rs 1,200,001–2,200,000'},
    {max:3200000,base:116000,floor:2200000,rate:.20,label:'Rs 2,200,001–3,200,000'},
    {max:4100000,base:316000,floor:3200000,rate:.25,label:'Rs 3,200,001–4,100,000'},
    {max:5600000,base:541000,floor:4100000,rate:.29,label:'Rs 4,100,001–5,600,000'},
    {max:7000000,base:976000,floor:5600000,rate:.32,label:'Rs 5,600,001–7,000,000'},
    {max:Infinity,base:1424000,floor:7000000,rate:.35,label:'Above Rs 7,000,000'}
  ];
  const NON_SALARY=[
    {max:600000,base:0,floor:0,rate:0,label:'Up to Rs 600,000'},
    {max:1200000,base:0,floor:600000,rate:.15,label:'Rs 600,001–1,200,000'},
    {max:1600000,base:90000,floor:1200000,rate:.20,label:'Rs 1,200,001–1,600,000'},
    {max:3200000,base:170000,floor:1600000,rate:.30,label:'Rs 1,600,001–3,200,000'},
    {max:5600000,base:650000,floor:3200000,rate:.40,label:'Rs 3,200,001–5,600,000'},
    {max:Infinity,base:1610000,floor:5600000,rate:.45,label:'Above Rs 5,600,000'}
  ];
  const parse=value=>{const n=Number(String(value??'').replace(/,/g,'').trim());return Number.isFinite(n)&&n>=0?n:null;};
  const round2=value=>Math.round((value+Number.EPSILON)*100)/100;
  const calculate=(annualIncome,type='salary')=>{
    const income=parse(annualIncome);if(income===null)throw new Error('Enter a valid non-negative annual taxable income.');
    const table=type==='business'?NON_SALARY:SALARY;
    const slab=table.find(x=>income<=x.max);
    const tax=slab.rate===0?0:slab.base+(income-slab.floor)*slab.rate;
    return {type,annualIncome:round2(income),annualTax:round2(tax),monthlyTax:round2(tax/12),effectiveRate:income?round2(tax/income*100):0,slab:slab.label};
  };
  if(typeof module!=='undefined'&&module.exports){module.exports={SALARY,NON_SALARY,parse,calculate};return;}
  const form=document.querySelector('[data-fbr-tax-form]');if(!form)return;  const type=form.elements.incomeType;const amount=form.elements.annualIncome;const result=form.querySelector('[data-fbr-tax-result]');
  const money=n=>new Intl.NumberFormat('en-PK',{style:'currency',currency:'PKR',maximumFractionDigits:0}).format(n);
  const render=()=>{
    try{const out=calculate(amount.value,type.value);result.className='nn-simple-result';
      result.innerHTML='<div class="nn-simple-result-grid">'+
      '<div class="nn-simple-result-item"><span>Annual taxable income</span><strong>'+money(out.annualIncome)+'</strong></div>'+
      '<div class="nn-simple-result-item"><span>Effective tax rate</span><strong>'+out.effectiveRate+'%</strong></div>'+
      '<div class="nn-simple-result-item"><span>Estimated tax per year</span><strong>'+money(out.annualTax)+'</strong></div>'+
      '<div class="nn-simple-result-item"><span>Average tax per month</span><strong>'+money(out.monthlyTax)+'</strong></div>'+
      '<div class="nn-simple-total"><span>Estimated annual income tax</span><strong>'+money(out.annualTax)+'</strong></div></div>'+
      '<p class="nn-simple-note">Applicable table: '+(out.type==='business'?'individual/AOP non-salaried':'salaried person')+' · '+out.slab+'.</p>';
    }catch(error){result.className='nn-simple-result is-error';result.textContent=error?.message||'Unable to calculate.';}
  };
  form.addEventListener('input',render);form.addEventListener('change',render);form.addEventListener('submit',e=>{e.preventDefault();render();});render();
})();