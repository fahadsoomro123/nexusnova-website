(()=>{
  const DATA_URL='assets/data/live-currency.json';
  const NAMES={USD:'US Dollar',GBP:'British Pound',EUR:'Euro',AED:'UAE Dirham',SAR:'Saudi Riyal'};
  const ORDER=['USD','GBP','EUR','AED','SAR'];
  let rates=new Map();

  const formatRate=value=>new Intl.NumberFormat('en-PK',{minimumFractionDigits:2,maximumFractionDigits:4}).format(value);
  const formatMoney=value=>new Intl.NumberFormat('en-PK',{style:'currency',currency:'PKR',maximumFractionDigits:2}).format(value);
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
      ORDER.forEach(code=>{
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

  const convert=()=>{
    const amountEl=document.querySelector('[data-live-amount]');
    const currencyEl=document.querySelector('[data-live-currency]');
    const result=document.querySelector('[data-live-convert-result]');
    if(!amountEl||!currencyEl||!result)return;
    const amount=Number(amountEl.value);
    const rate=rates.get(currencyEl.value);
    if(!Number.isFinite(amount)||amount<0){result.textContent='Enter a valid amount of zero or more.';return}
    if(!Number.isFinite(rate)){result.textContent='The selected daily rate is not available yet.';return}
    result.textContent=`${new Intl.NumberFormat('en-PK',{maximumFractionDigits:2}).format(amount)} ${currencyEl.value} ≈ ${formatMoney(amount*rate)} using the displayed daily reference rate.`;
  };

  const bindConverter=()=>{
    const button=document.querySelector('[data-live-convert]');
    if(!button)return;
    button.addEventListener('click',convert);
    document.querySelector('[data-live-amount]')?.addEventListener('keydown',event=>{if(event.key==='Enter')convert()});
    document.querySelector('[data-live-currency]')?.addEventListener('change',convert);
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
      const valid=(data.rates||[]).filter(item=>ORDER.includes(item.code)&&Number.isFinite(item.rate)&&item.rate>0);
      if(data.status!=='ok'||valid.length!==ORDER.length)throw new Error('Daily rate file is not populated yet.');
      rates=new Map(valid.map(item=>[item.code,item.rate]));
      renderCards({...data,rates:valid});
      updateMeta(data);
      setStatus(`Daily reference rates loaded for ${formatDate(data.data_date)}. This is not second-by-second forex data.`);
      convert();
    }catch(error){
      setStatus('Daily currency data is temporarily unavailable. NexusNova is not showing guessed or stale substitute values.',true);
      document.querySelectorAll('[data-live-rate-grid]').forEach(grid=>grid.replaceChildren());
      console.warn('NexusNova LIVE currency data unavailable:',error);
    }
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
})();
