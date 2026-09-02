(()=>{
  const TAX_YEAR='2027';
  const PERIOD='1 July 2026 – 30 June 2027';
  const SLABS=[
    {max:600000,base:0,floor:0,rate:0,label:'Up to Rs 600,000'},
    {max:1200000,base:0,floor:600000,rate:.01,label:'Rs 600,001 – 1,200,000'},
    {max:2200000,base:6000,floor:1200000,rate:.11,label:'Rs 1,200,001 – 2,200,000'},
    {max:3200000,base:116000,floor:2200000,rate:.20,label:'Rs 2,200,001 – 3,200,000'},
    {max:4100000,base:316000,floor:3200000,rate:.25,label:'Rs 3,200,001 – 4,100,000'},
    {max:5600000,base:541000,floor:4100000,rate:.29,label:'Rs 4,100,001 – 5,600,000'},
    {max:7000000,base:976000,floor:5600000,rate:.32,label:'Rs 5,600,001 – 7,000,000'},
    {max:Infinity,base:1424000,floor:7000000,rate:.35,label:'Above Rs 7,000,000'}
  ];

  const parseNonNegative=value=>{
    const text=String(value??'').replace(/,/g,'').trim();
    if(text==='') return 0;
    const number=Number(text);
    return Number.isFinite(number)&&number>=0?number:null;
  };
  const round2=value=>Math.round((value+Number.EPSILON)*100)/100;
  const calculateAnnualTax=annualTaxableSalary=>{
    const income=parseNonNegative(annualTaxableSalary);
    if(income===null) throw new Error('Enter a valid non-negative taxable salary.');
    const slab=SLABS.find(item=>income<=item.max);
    const tax=slab.rate===0?0:slab.base+((income-slab.floor)*slab.rate);
    return {
      taxYear:TAX_YEAR,period:PERIOD,annualTaxableSalary:round2(income),slabLabel:slab.label,
      marginalRate:slab.rate,annualTax:round2(tax),averageMonthlyTax:round2(tax/12),
      effectiveRate:income>0?round2((tax/income)*100):0,
      annualAfterTax:round2(income-tax),monthlyAfterTax:round2((income-tax)/12)
    };
  };
  const calculateFromInput=({amount,frequency='monthly'})=>{
    const clean=parseNonNegative(amount);
    if(clean===null) throw new Error('Enter a valid non-negative taxable salary.');
    if(!['monthly','annual'].includes(frequency)) throw new Error('Unknown salary frequency.');
    return calculateAnnualTax(frequency==='monthly'?clean*12:clean);
  };

  if(typeof module!=='undefined'&&module.exports){module.exports={TAX_YEAR,PERIOD,SLABS,parseNonNegative,calculateAnnualTax,calculateFromInput};return;}
  const form=document.querySelector('[data-salary-tax-form]');
  if(!form)return;
  const result=form.querySelector('[data-salary-tax-result]');
  const money=value=>new Intl.NumberFormat('en-PK',{style:'currency',currency:'PKR',maximumFractionDigits:2}).format(value);
  const number=value=>new Intl.NumberFormat('en-PK',{maximumFractionDigits:2}).format(value);
  const render=()=>{
    try{
      const confirmed=form.elements.salaryShare.checked;
      if(!confirmed) throw new Error('This calculator uses the salaried-person table only. Confirm that salary income exceeds 75% of your taxable income, or use professional/FBR guidance for the correct table.');
      const out=calculateFromInput({amount:form.elements.salaryAmount.value,frequency:form.elements.frequency.value});
      result.classList.remove('is-error');
      result.innerHTML=`
        <div><span>Annual taxable salary</span><strong>${money(out.annualTaxableSalary)}</strong></div>
        <div><span>Tax slab</span><strong>${out.slabLabel}</strong></div>
        <div><span>Marginal rate</span><strong>${number(out.marginalRate*100)}%</strong></div>
        <div><span>Estimated annual income tax</span><strong>${money(out.annualTax)}</strong></div>
        <div><span>Average monthly tax</span><strong>${money(out.averageMonthlyTax)}</strong></div>
        <div><span>Effective tax rate</span><strong>${number(out.effectiveRate)}%</strong></div>
        <div class="tax-total"><span>Salary after this income-tax estimate</span><strong>${money(out.annualAfterTax)} / year</strong></div>
        <p>Approx. ${money(out.monthlyAfterTax)} per month after this income-tax estimate only. Actual payroll withholding can vary during the year because employers annualize salary, bonuses, adjustments, tax credits and tax already deducted.</p>`;
    }catch(error){
      result.classList.add('is-error');
      result.innerHTML=`<p>${error?.message||'Unable to calculate. No tax value is guessed from invalid input.'}</p>`;
    }
  };
  form.addEventListener('input',render);
  form.addEventListener('change',render);
  form.addEventListener('submit',event=>{event.preventDefault();render()});
  render();
})();
