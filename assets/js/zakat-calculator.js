(()=>{
  const DEFAULT_BANK_NISAB=503529;
  const ZAKAT_RATE=0.025;

  const parseAmount=value=>{
    const text=String(value??'').replace(/,/g,'').trim();
    if(text==='') return 0;
    const number=Number(text);
    if(!Number.isFinite(number)||number<0) return null;
    return number;
  };

  const calculateZakat=({assets=[],liabilities=0,nisab=DEFAULT_BANK_NISAB,rate=ZAKAT_RATE})=>{
    const cleanAssets=assets.map(parseAmount);
    const cleanLiabilities=parseAmount(liabilities);
    const cleanNisab=parseAmount(nisab);
    const cleanRate=Number(rate);
    if(cleanAssets.some(value=>value===null)||cleanLiabilities===null||cleanNisab===null||!Number.isFinite(cleanRate)||cleanRate<0) throw new Error('Invalid non-negative calculator input');
    const totalAssets=cleanAssets.reduce((sum,value)=>sum+value,0);
    const deductible=Math.min(cleanLiabilities,totalAssets);
    const net=Math.max(0,totalAssets-deductible);
    const thresholdMet=net>=cleanNisab;
    const zakat=thresholdMet?net*cleanRate:0;
    return {totalAssets,deductibleLiabilities:deductible,netZakatable:net,nisab:cleanNisab,thresholdMet,zakat,rate:cleanRate};
  };

  if(typeof module!=='undefined'&&module.exports){module.exports={DEFAULT_BANK_NISAB,ZAKAT_RATE,parseAmount,calculateZakat};return;}

  const form=document.querySelector('[data-zakat-form]');
  if(!form)return;
  const fields=[...form.querySelectorAll('[data-zakat-asset]')];
  const liabilities=form.querySelector('[data-zakat-liabilities]');
  const nisab=form.querySelector('[data-zakat-nisab]');
  const mode=form.querySelector('[data-zakat-nisab-mode]');
  const result=form.querySelector('[data-zakat-result]');
  const money=value=>new Intl.NumberFormat('en-PK',{style:'currency',currency:'PKR',maximumFractionDigits:0}).format(value);

  const setBankMode=()=>{
    if(mode?.value==='bank-2026'){
      nisab.value=String(DEFAULT_BANK_NISAB);
      nisab.readOnly=true;
    }else{
      nisab.readOnly=false;
    }
  };

  const render=()=>{
    try{
      const out=calculateZakat({assets:fields.map(field=>field.value),liabilities:liabilities.value,nisab:nisab.value});
      result.classList.remove('is-error');
      result.innerHTML=`<div><span>Total entered assets</span><strong>${money(out.totalAssets)}</strong></div><div><span>Deductible liabilities used</span><strong>${money(out.deductibleLiabilities)}</strong></div><div><span>Net zakatable amount</span><strong>${money(out.netZakatable)}</strong></div><div><span>Selected nisab</span><strong>${money(out.nisab)}</strong></div><div class="zakat-total"><span>${out.thresholdMet?'Estimated Zakat at 2.5%':'Estimated Zakat'}</span><strong>${money(out.zakat)}</strong></div><p>${out.thresholdMet?'The net amount meets or exceeds the selected nisab. This is a mathematical estimate only.':'The net amount is below the selected nisab, so this calculator returns zero for this estimate.'}</p>`;
    }catch{
      result.classList.add('is-error');
      result.innerHTML='<p>Please enter only valid non-negative PKR amounts. No result is guessed from invalid input.</p>';
    }
  };

  mode?.addEventListener('change',()=>{setBankMode();render()});
  form.addEventListener('input',event=>{if(event.target!==mode)render()});
  form.addEventListener('submit',event=>{event.preventDefault();render()});
  setBankMode();render();
})();
