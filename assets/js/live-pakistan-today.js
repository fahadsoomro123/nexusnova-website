(()=>{
  const URLS={
    currency:'assets/data/live-currency.json',
    gold:'assets/data/live-gold.json',
    fuel:'assets/data/live-fuel.json',
    weather:'assets/data/live-weather.json'
  };
  const root=document.querySelector('[data-pakistan-today-dashboard]');
  const status=document.querySelector('[data-pakistan-today-status]');
  const grid=document.querySelector('[data-pakistan-today-grid]');
  const citySelect=document.querySelector('[data-pakistan-weather-city]');
  if(!root||!status||!grid)return;

  const money=value=>new Intl.NumberFormat('en-PK',{style:'currency',currency:'PKR',maximumFractionDigits:2}).format(value);
  const number=value=>new Intl.NumberFormat('en-PK',{maximumFractionDigits:2}).format(value);
  const date=value=>{
    if(!value)return 'Unavailable';
    const parsed=/^\d{4}-\d{2}-\d{2}$/.test(value)?new Date(`${value}T00:00:00Z`):new Date(value);
    if(Number.isNaN(parsed.getTime()))return String(value);
    return new Intl.DateTimeFormat('en-PK',{dateStyle:'medium',timeZone:'Asia/Karachi'}).format(parsed);
  };
  const dateTime=value=>{
    if(!value)return 'Unavailable';
    const parsed=new Date(value);
    if(Number.isNaN(parsed.getTime()))return String(value);
    return new Intl.DateTimeFormat('en-PK',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Karachi'}).format(parsed)+' PKT';
  };
  const valid=value=>Number.isFinite(Number(value));
  const fetchJson=async url=>{
    const response=await fetch(url,{cache:'no-cache',headers:{Accept:'application/json'}});
    if(!response.ok)throw new Error(`${url} HTTP ${response.status}`);
    const data=await response.json();
    if(data?.status!=='ok')throw new Error(`${url} is not published`);
    return data;
  };
  const card=(icon,title,value,unit,note,href)=>{
    const article=document.createElement('article');article.className='live-summary-card';
    const top=document.createElement('div');top.className='live-summary-top';
    const emoji=document.createElement('span');emoji.className='live-summary-icon';emoji.textContent=icon;
    const heading=document.createElement('h3');heading.textContent=title;top.append(emoji,heading);
    const strong=document.createElement('strong');strong.className='live-summary-value';strong.textContent=value;
    const small=document.createElement('span');small.className='live-summary-unit';small.textContent=unit;
    const p=document.createElement('p');p.textContent=note;
    const a=document.createElement('a');a.href=href;a.textContent='View details →';a.className='live-summary-link';
    article.append(top,strong,small,p,a);return article;
  };
  const weatherCard=(weather,slug)=>{
    const city=weather.cities.find(item=>item.slug===slug)||weather.cities[0];
    if(!city||!valid(city.forecast?.temperature_c))throw new Error('Weather city forecast unavailable');
    const f=city.forecast;
    return card('🌦',`${city.name} forecast`,`${number(f.temperature_c)}°C`,`${f.condition||'Forecast'} · ${number(f.next_24h?.low_c)}° / ${number(f.next_24h?.high_c)}°C low/high`,`Model valid ${dateTime(f.valid_at)} · Data from MET Norway`,'weather-live.html');
  };

  let datasets=null;
  const render=()=>{
    if(!datasets)return;
    const {currency,gold,fuel,weather}=datasets;
    const usd=currency.rates.find(item=>item.code==='USD');
    if(!usd||!valid(usd.rate))throw new Error('USD/PKR unavailable');
    const goldTola=gold.international_derived_pkr?.per_tola_24k;
    const petrol=fuel.prices?.petrol?.pkr_per_litre;
    const diesel=fuel.prices?.diesel?.pkr_per_litre;
    if(!valid(goldTola)||!valid(petrol)||!valid(diesel))throw new Error('Pakistan Today market values incomplete');
    grid.replaceChildren(
      card('💱','US Dollar',number(usd.rate),'PKR per 1 USD',`Daily reference · ${date(currency.data_date)}`,'currency-rates.html'),
      card('🥇','24K Gold / Tola',money(goldTola),'International-derived PKR reference','Not a local Sarafa board quote','gold-rates.html'),
      card('⛽','Petrol',money(petrol),'per litre',`PSO reference · effective ${date(fuel.effective_date)}`,'fuel-rates.html'),
      card('🚛','Diesel',money(diesel),'per litre',`PSO reference · effective ${date(fuel.effective_date)}`,'fuel-rates.html'),
      weatherCard(weather,citySelect?.value||'karachi')
    );
    status.textContent=`Pakistan Today loaded from four cached datasets. Latest NexusNova snapshot: ${dateTime(Math.max(...[currency.generated_at,gold.generated_at,fuel.generated_at,weather.generated_at].map(value=>new Date(value).getTime()).filter(Number.isFinite)))}.`;
    status.classList.remove('is-error');
  };

  const load=async()=>{
    try{
      const [currency,gold,fuel,weather]=await Promise.all(Object.values(URLS).map(fetchJson));
      if(!Array.isArray(weather.cities)||!weather.cities.length)throw new Error('Weather cities unavailable');
      datasets={currency,gold,fuel,weather};
      if(citySelect){
        citySelect.replaceChildren(...weather.cities.map(city=>{const option=document.createElement('option');option.value=city.slug;option.textContent=city.name;return option;}));
        citySelect.value=weather.cities.some(city=>city.slug==='karachi')?'karachi':weather.cities[0].slug;
        citySelect.addEventListener('change',()=>{try{render()}catch(error){console.warn('Pakistan Today weather card failed:',error)}});
      }
      render();
    }catch(error){
      status.textContent='Pakistan Today summary is temporarily unavailable. Open the individual LIVE pages for their latest verified status.';
      status.classList.add('is-error');
      grid.replaceChildren();
      console.warn('NexusNova Pakistan Today dashboard unavailable:',error);
    }
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
})();
