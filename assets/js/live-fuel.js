(()=>{
  const set=(selector,value)=>{const el=document.querySelector(selector);if(el)el.textContent=value};
  const pkr=value=>`Rs ${new Intl.NumberFormat('en-PK',{minimumFractionDigits:2,maximumFractionDigits:2}).format(value)}`;
  const usd=value=>`$${new Intl.NumberFormat('en-US',{minimumFractionDigits:3,maximumFractionDigits:3}).format(value)}`;
  const time=(value,zone='Asia/Karachi')=>{
    if(!value)return '—';
    const date=new Date(value);
    return Number.isNaN(date.getTime())?'—':date.toLocaleString('en-US',{dateStyle:'medium',timeStyle:'short',timeZone:zone});
  };
  const dateOnly=value=>{
    if(!value)return '—';
    const parsed=/^\d{4}-\d{2}-\d{2}$/.test(value)?new Date(`${value}T00:00:00Z`):new Date(value);
    return Number.isNaN(parsed.getTime())?'—':parsed.toLocaleDateString('en-US',{dateStyle:'medium',timeZone:'UTC'});
  };
  const change=value=>{
    if(!Number.isFinite(value))return 'Previous-week comparison unavailable';
    if(value===0)return 'No change vs previous week';
    return `${value>0?'+':''}${value.toFixed(3)} USD/gal vs previous week`;
  };

  const pakistanStatus=document.querySelector('[data-fuel-status]');
  if(pakistanStatus){
    fetch('assets/data/live-fuel.json',{cache:'no-store'})
      .then(response=>{if(!response.ok)throw new Error(`HTTP ${response.status}`);return response.json()})
      .then(data=>{
        const petrol=Number(data?.prices?.petrol?.pkr_per_litre);
        const diesel=Number(data?.prices?.diesel?.pkr_per_litre);
        if(data?.status!=='ok'||!Number.isFinite(petrol)||petrol<=0||!Number.isFinite(diesel)||diesel<=0)throw new Error('Fuel reference data is not ready');
        set('[data-fuel-petrol]',pkr(petrol));
        set('[data-fuel-diesel]',pkr(diesel));
        set('[data-fuel-effective]',data.effective_date||'—');
        set('[data-fuel-generated]',time(data.generated_at));
        set('[data-fuel-notice]',data.notice||'Published PSO reference rates.');
        const source=document.querySelector('[data-fuel-source]');
        if(source&&data.source?.url){source.href=data.source.url;source.textContent=data.source.name||'Pakistan State Oil (PSO)'}
        pakistanStatus.textContent=`Official PSO published reference rates effective ${data.effective_date||'the stated source date'}. This is not a second-by-second live feed.`;
      })
      .catch(()=>{
        pakistanStatus.textContent='Pakistan fuel reference data is temporarily unavailable. NexusNova will not substitute an unverified or guessed price.';
        pakistanStatus.classList.add('is-error');
      });
  }

  const usStatus=document.querySelector('[data-fuel-us-status]');
  if(usStatus){
    fetch('assets/data/live-fuel-us.json',{cache:'no-store'})
      .then(response=>{if(!response.ok)throw new Error(`HTTP ${response.status}`);return response.json()})
      .then(data=>{
        const gasoline=Number(data?.prices?.regular_gasoline?.usd_per_gallon);
        const diesel=Number(data?.prices?.on_highway_diesel?.usd_per_gallon);
        if(data?.status!=='ok'||!Number.isFinite(gasoline)||gasoline<=0||!Number.isFinite(diesel)||diesel<=0)throw new Error('U.S. weekly fuel data is not ready');
        set('[data-fuel-us-gasoline]',usd(gasoline));
        set('[data-fuel-us-diesel]',usd(diesel));
        set('[data-fuel-us-gasoline-change]',change(Number(data?.prices?.regular_gasoline?.change_usd_per_gallon)));
        set('[data-fuel-us-diesel-change]',change(Number(data?.prices?.on_highway_diesel?.change_usd_per_gallon)));
        set('[data-fuel-us-date]',dateOnly(data.data_date));
        set('[data-fuel-us-generated]',time(data.generated_at,'America/New_York')+' ET');
        set('[data-fuel-us-notice]',data.notice||'Official EIA weekly U.S. national averages.');
        const source=document.querySelector('[data-fuel-us-source]');
        if(source&&data.source?.url){source.href=data.source.url;source.textContent=data.source.name||'U.S. Energy Information Administration (EIA)'}
        usStatus.textContent=`EIA weekly U.S. national averages loaded for ${dateOnly(data.data_date)}. These are not real-time local pump quotes.`;
      })
      .catch(()=>{
        usStatus.textContent='U.S. weekly fuel data is temporarily unavailable. NexusNova will not substitute an unverified or guessed value.';
        usStatus.classList.add('is-error');
      });
  }
})();
