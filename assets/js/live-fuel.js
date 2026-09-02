(()=>{
  const set=(selector,value)=>{const el=document.querySelector(selector);if(el)el.textContent=value};
  const pkr=value=>`Rs ${new Intl.NumberFormat('en-PK',{minimumFractionDigits:2,maximumFractionDigits:2}).format(value)}`;
  const usd=value=>`$${new Intl.NumberFormat('en-US',{minimumFractionDigits:3,maximumFractionDigits:3}).format(value)}`;
  const eur=value=>`€${new Intl.NumberFormat('en-US',{minimumFractionDigits:3,maximumFractionDigits:3}).format(value)}`;
  const optionalNumber=value=>value===null||value===undefined||value===''?NaN:Number(value);
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
  const usChange=value=>{
    if(!Number.isFinite(value))return 'Previous-week comparison unavailable';
    if(value===0)return 'No change vs previous week';
    return `${value>0?'+':''}${value.toFixed(3)} USD/gal vs previous week`;
  };
  const euChange=value=>{
    if(!Number.isFinite(value))return 'Previous published-week comparison unavailable';
    if(value===0)return 'No change vs previous published week';
    return `${value>0?'+':''}${value.toFixed(4)} EUR/L vs previous published week`;
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
        set('[data-fuel-us-gasoline-change]',usChange(optionalNumber(data?.prices?.regular_gasoline?.change_usd_per_gallon)));
        set('[data-fuel-us-diesel-change]',usChange(optionalNumber(data?.prices?.on_highway_diesel?.change_usd_per_gallon)));
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

  const euStatus=document.querySelector('[data-fuel-eu-status]');
  if(euStatus){
    fetch('assets/data/live-fuel-eu.json',{cache:'no-store'})
      .then(response=>{if(!response.ok)throw new Error(`HTTP ${response.status}`);return response.json()})
      .then(data=>{
        const countries=Array.isArray(data?.countries)?data.countries:[];
        if(data?.status!=='ok'||countries.length!==27)throw new Error('EU27 weekly fuel data is not ready');
        const valid=countries.filter(item=>item?.country_code&&item?.country&&Number(item.gasoline_eur_per_litre)>0&&Number(item.diesel_eur_per_litre)>0);
        if(valid.length!==27)throw new Error('EU27 weekly fuel rows failed validation');
        const selector=document.querySelector('[data-fuel-eu-country]');
        if(!selector)throw new Error('EU country selector is missing');
        selector.replaceChildren();
        valid.forEach(item=>{
          const option=document.createElement('option');
          option.value=item.country_code;
          option.textContent=`${item.country} (${item.country_code})`;
          selector.append(option);
        });
        const byCode=new Map(valid.map(item=>[item.country_code,item]));
        const render=()=>{
          const item=byCode.get(selector.value)||valid[0];
          if(!item)return;
          set('[data-fuel-eu-selected]',item.country);
          set('[data-fuel-eu-gasoline]',eur(Number(item.gasoline_eur_per_litre)));
          set('[data-fuel-eu-diesel]',eur(Number(item.diesel_eur_per_litre)));
          set('[data-fuel-eu-gasoline-change]',euChange(optionalNumber(item.gasoline_change_eur_per_litre)));
          set('[data-fuel-eu-diesel-change]',euChange(optionalNumber(item.diesel_change_eur_per_litre)));
        };
        selector.value=byCode.has('DE')?'DE':valid[0].country_code;
        selector.addEventListener('change',render);
        render();
        set('[data-fuel-eu-date]',dateOnly(data.data_date));
        set('[data-fuel-eu-generated]',time(data.generated_at,'Europe/Brussels')+' Brussels time');
        set('[data-fuel-eu-notice]',data.notice||'European Commission weekly consumer-price references including taxes.');
        const source=document.querySelector('[data-fuel-eu-source]');
        if(source&&data.source?.url){source.href=data.source.url;source.textContent=data.source.name||'European Commission Weekly Oil Bulletin'}
        euStatus.textContent=`European Commission weekly EU27 fuel references loaded for ${dateOnly(data.data_date)}. Select a country below; these are not real-time station quotes.`;
      })
      .catch(()=>{
        euStatus.textContent='EU27 weekly fuel data is temporarily unavailable. NexusNova will not substitute an unverified or guessed value.';
        euStatus.classList.add('is-error');
      });
  }
})();
