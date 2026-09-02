(()=>{
  const status=document.querySelector('[data-fuel-status]');
  if(!status)return;
  const set=(selector,value)=>{const el=document.querySelector(selector);if(el)el.textContent=value};
  const money=value=>`Rs ${new Intl.NumberFormat('en-PK',{minimumFractionDigits:2,maximumFractionDigits:2}).format(value)}`;
  const time=value=>{
    if(!value)return '—';
    const date=new Date(value);
    return Number.isNaN(date.getTime())?'—':date.toLocaleString('en-PK',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Karachi'});
  };
  fetch('assets/data/live-fuel.json',{cache:'no-store'})
    .then(response=>{if(!response.ok)throw new Error(`HTTP ${response.status}`);return response.json()})
    .then(data=>{
      const petrol=Number(data?.prices?.petrol?.pkr_per_litre);
      const diesel=Number(data?.prices?.diesel?.pkr_per_litre);
      if(data?.status!=='ok'||!Number.isFinite(petrol)||petrol<=0||!Number.isFinite(diesel)||diesel<=0)throw new Error('Fuel reference data is not ready');
      set('[data-fuel-petrol]',money(petrol));
      set('[data-fuel-diesel]',money(diesel));
      set('[data-fuel-effective]',data.effective_date||'—');
      set('[data-fuel-generated]',time(data.generated_at));
      set('[data-fuel-notice]',data.notice||'Published PSO reference rates.');
      const source=document.querySelector('[data-fuel-source]');
      if(source&&data.source?.url){source.href=data.source.url;source.textContent=data.source.name||'Pakistan State Oil (PSO)'}
      status.textContent=`Official PSO published reference rates effective ${data.effective_date||'the stated source date'}. This is not a second-by-second live feed.`;
    })
    .catch(()=>{
      status.textContent='Fuel reference data is temporarily unavailable. NexusNova will not substitute an unverified or guessed price.';
      status.classList.add('is-error');
    });
})();
