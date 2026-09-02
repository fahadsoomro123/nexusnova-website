(()=>{
  const statusEl=document.querySelector('[data-gold-status]');
  if(!statusEl)return;
  const set=(selector,value)=>{const el=document.querySelector(selector);if(el)el.textContent=value};
  const money=(value,digits=2)=>new Intl.NumberFormat('en-PK',{minimumFractionDigits:digits,maximumFractionDigits:digits}).format(value);
  const pkr=value=>`Rs ${new Intl.NumberFormat('en-PK',{maximumFractionDigits:0}).format(value)}`;
  const time=value=>{
    if(!value)return '—';
    const date=new Date(value);
    return Number.isNaN(date.getTime())?'—':date.toLocaleString('en-PK',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Karachi'});
  };
  fetch('assets/data/live-gold.json',{cache:'no-store'})
    .then(response=>{if(!response.ok)throw new Error(`HTTP ${response.status}`);return response.json()})
    .then(data=>{
      if(data?.status!=='ok'||!data?.xau||!data?.international_derived_pkr||!data?.fx)throw new Error('Gold reference data is not ready');
      const xau=Number(data.xau.usd_per_troy_ounce);
      const derived=data.international_derived_pkr;
      if(!Number.isFinite(xau)||xau<=0)throw new Error('Invalid gold price');
      set('[data-gold-xau]',`$${money(xau,2)}`);
      set('[data-gold-tola]',pkr(Number(derived.per_tola_24k)));
      set('[data-gold-10g]',pkr(Number(derived.per_10g_24k)));
      set('[data-gold-gram]',pkr(Number(derived.per_gram_24k)));
      set('[data-gold-22k-tola]',pkr(Number(derived.per_tola_22k)));
      set('[data-gold-upstream-updated]',time(data.xau.updated_at));
      set('[data-gold-generated]',time(data.generated_at));
      set('[data-gold-fx-date]',data.fx.data_date||'—');
      set('[data-gold-usdpkr]',`1 USD = ${money(Number(data.fx.usd_pkr),4)} PKR`);
      const source=document.querySelector('[data-gold-source]');
      if(source&&data.source?.url){source.href=data.source.url;source.textContent=data.source.name||'Gold API'}
      statusEl.textContent='International gold reference loaded. PKR values are calculated from XAU/USD and the published USD/PKR reference rate; they are not Pakistan Sarafa board quotes.';
      const local=document.querySelector('[data-gold-local-status]');
      if(local)local.textContent=data.local_sarafa?.message||'Local Sarafa rate not published.';
    })
    .catch(()=>{
      statusEl.textContent='Gold reference data is temporarily unavailable. No estimated or stale replacement has been invented.';
      statusEl.classList.add('is-error');
    });
})();
