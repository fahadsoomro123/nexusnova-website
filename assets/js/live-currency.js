(()=>{
  const DATA_URL='assets/data/live-currency.json';
  const NAMES={
    PKR:'Pakistani Rupee',USD:'US Dollar',GBP:'British Pound',EUR:'Euro',AED:'UAE Dirham',SAR:'Saudi Riyal',
    CAD:'Canadian Dollar',AUD:'Australian Dollar',NZD:'New Zealand Dollar',JPY:'Japanese Yen',CNY:'Chinese Yuan',INR:'Indian Rupee',
    TRY:'Turkish Lira',CHF:'Swiss Franc',SEK:'Swedish Krona',NOK:'Norwegian Krone',DKK:'Danish Krone',SGD:'Singapore Dollar',
    HKD:'Hong Kong Dollar',KRW:'South Korean Won',THB:'Thai Baht',MYR:'Malaysian Ringgit',IDR:'Indonesian Rupiah',ZAR:'South African Rand',
    QAR:'Qatari Riyal',KWD:'Kuwaiti Dinar',BHD:'Bahraini Dinar',OMR:'Omani Rial'
  };
  const FEATURED=['USD','GBP','EUR','AED','SAR'];
  let rates=new Map();

  const formatRate=value=>new Intl.NumberFormat('en-PK',{minimumFractionDigits:2,maximumFractionDigits:4}).format(value);
  const formatAmount=value=>new Intl.NumberFormat('en-PK',{maximumFractionDigits:6}).format(value);
  const formatDate=value=>{
    if(!value)return 'Unavailable';
    const parsed=/^\d{4}-\d{2}-\d{2}$/.test(value)?new Date(`${value}T00:00:00Z`):new Date(value);
    if(Number.isNaN(parsed.getTime()))return value;
    return new Intl.DateTimeFormat('en-PK',{dateStyle:'medium',timeZone:'Asia/Karachi'}).format(parsed);
  };
  const formatDateTime=value=>{
    if(!value)return 'Unavailable';
    const parsed=new Date(value);
    if(Number.isNaN(parsed.getTime()))return value;
    return new Intl.DateTimeFormat('en-PK',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Karachi'}).format(parsed)+' PKT';
  };

  const setStatus=(message,error=false)=>{
    document.querySelectorAll('[data-live-status]').forEach(el=>{
      el.textContent=message;
      el.classList.toggle('is-error',error);
    });
  };

  const updateMeta=data=>{
    document.querySelectorAll('[data-live-data-date]').forEach(el=>el.textContent=formatDate(data.data_date));
    document.querySelectorAll('[data-live-generated]').forEach(el=>el.textContent=formatDateTime(data.generated_at));
    document.querySelectorAll('[data-live-source]').forEach(el=>{
      el.textContent=data.source?.name||'Source';
      if(data.source?.url)el.href=data.source.url;
    });
  };

  const renderCards=data=>{
    const byCode=new Map((data.rates||[]).map(item=>[item.code,item]));
    document.querySelectorAll('[data-live-rate-grid]').forEach(grid=>{
      grid.replaceChildren();
      FEATURED.forEach(code=>{
        const item=byCode.get(code);
        if(!item)return;
        const card=document.createElement('article');
        card.className='live-rate-card';
        const header=document.createElement('header');
        const title=document.createElement('h3');title.textContent=NAMES[code]||code;
        const badge=document.createElement('span');badge.className='live-code';badge.textContent=`${code} → PKR`;
        header.append(title,badge);
        const value=document.createElement('strong');value.className='live-rate-value';value.textContent=formatRate(item.rate);
        const unit=document.createElement('span');unit.className='live-rate-unit';unit.textContent=`PKR per 1 ${code}`;
        card.append(header,value,unit);
        if(Number.isFinite(item.change_pct)){
          const change=document.createElement('span');
          change.className=`live-change ${item.change_pct>0?'is-up':item.change_pct<0?'is-down':''}`.trim();
          const sign=item.change_pct>0?'+':'';
          change.textContent=`${sign}${item.change_pct.toFixed(2)}% vs previous source date`;
          card.append(change);
        }
        grid.append(card);
      });
    });
  };

  const populateSelect=(select,codes,preferred)=>{
    if(!select)return;
    const current=select.value||preferred;
    select.replaceChildren();
    codes.forEach(code=>{
      const option=document.createElement('option');
      option.value=code;
      option.textContent=`${code} — ${NAMES[code]||code}`;
      select.append(option);
    });
    select.value=codes.includes(current)?current:preferred;
  };

  const populateConverter=valid=>{
    const available=valid.map(item=>item.code);
    const extra=available.filter(code=>!FEATURED.includes(code)).sort((a,b)=>a.localeCompare(b));
    const fromCodes=[...FEATURED.filter(code=>available.includes(code)),...extra,'PKR'];
    const toCodes=['PKR',...FEATURED.filter(code=>available.includes(code)),...extra];
    populateSelect(document.querySelector('[data-live-from-currency]'),fromCodes,'USD');
    populateSelect(document.querySelector('[data-live-to-currency]'),toCodes,'PKR');
  };

  const convert=()=>{
    const amountEl=document.querySelector('[data-live-amount]');
    const fromEl=document.querySelector('[data-live-from-currency]');
    const toEl=document.querySelector('[data-live-to-currency]');
    const result=document.querySelector('[data-live-convert-result]');
    if(!amountEl||!fromEl||!toEl||!result)return;
    const amount=Number(amountEl.value);
    const fromRate=rates.get(fromEl.value);
    const toRate=rates.get(toEl.value);
    if(!Number.isFinite(amount)||amount<0){result.textContent='Enter a valid amount of zero or more.';return}
    if(!Number.isFinite(fromRate)||!Number.isFinite(toRate)){result.textContent='One of the selected daily rates is not available yet.';return}
    const converted=(amount*fromRate)/toRate;
    result.textContent=`${formatAmount(amount)} ${fromEl.value} ≈ ${formatAmount(converted)} ${toEl.value} using the displayed daily reference rates.`;
  };

  const bindConverter=()=>{
    const button=document.querySelector('[data-live-convert]');
    if(!button)return;
    button.addEventListener('click',convert);
    document.querySelector('[data-live-amount]')?.addEventListener('keydown',event=>{if(event.key==='Enter')convert()});
    document.querySelector('[data-live-from-currency]')?.addEventListener('change',convert);
    document.querySelector('[data-live-to-currency]')?.addEventListener('change',convert);
  };

  const addLiveNav=()=>{
    document.querySelectorAll('[data-nav]').forEach(nav=>{
      if(nav.querySelector('a[href$="live.html"]'))return;
      const link=document.createElement('a');link.href='live.html';link.textContent='LIVE';
      const articles=[...nav.querySelectorAll('a')].find(item=>/articles\.html(?:$|\?)/.test(item.getAttribute('href')||''));
      if(articles)nav.insertBefore(link,articles);else nav.appendChild(link);
      const page=(location.pathname.split('/').pop()||'index.html').toLowerCase();
      if(page==='live.html'||page==='currency-rates.html')link.setAttribute('aria-current','page');
    });
  };

  const load=async()=>{
    addLiveNav();
    bindConverter();
    try{
      const response=await fetch(DATA_URL,{cache:'no-cache',headers:{Accept:'application/json'}});
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      const data=await response.json();
      const valid=(data.rates||[]).filter(item=>typeof item.code==='string'&&Number.isFinite(item.rate)&&item.rate>0);
      const byCode=new Map(valid.map(item=>[item.code,item]));
      if(data.status!=='ok'||FEATURED.some(code=>!byCode.has(code)))throw new Error('Daily rate file is not populated yet.');
      rates=new Map(valid.map(item=>[item.code,item.rate]));
      rates.set('PKR',1);
      renderCards({...data,rates:valid});
      populateConverter(valid);
      updateMeta(data);
      setStatus(`Daily reference rates loaded for ${formatDate(data.data_date)}. ${valid.length} foreign currencies are cached; this is not second-by-second forex data.`);
      convert();
    }catch(error){
      setStatus('Daily currency data is temporarily unavailable. NexusNova is not showing guessed or stale substitute values.',true);
      document.querySelectorAll('[data-live-rate-grid]').forEach(grid=>grid.replaceChildren());
      console.warn('NexusNova LIVE currency data unavailable:',error);
    }
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
})();
