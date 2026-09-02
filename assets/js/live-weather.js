(()=>{
  const status=document.querySelector('[data-weather-status]');const grid=document.querySelector('[data-weather-grid]');const region=document.querySelector('[data-weather-region]');if(!status||!grid)return;
  const num=(value,digits=1)=>new Intl.NumberFormat('en-PK',{minimumFractionDigits:digits,maximumFractionDigits:digits}).format(value);
  const localTime=value=>{if(!value)return '—';const date=new Date(value);return Number.isNaN(date.getTime())?'—':date.toLocaleString('en-PK',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Karachi'})};
  const icon=code=>{const value=String(code||'').toLowerCase();if(/thunder/.test(value))return '⛈️';if(/snow|sleet/.test(value))return '🌨️';if(/rain|shower/.test(value))return '🌧️';if(/fog/.test(value))return '🌫️';if(/cloudy/.test(value))return '☁️';if(/partlycloudy/.test(value))return '⛅';if(/fair/.test(value))return '🌤️';if(/clearsky/.test(value))return '☀️';return '🌦️'};
  let dataset=null;
  const render=()=>{
    if(!dataset)return;grid.innerHTML='';const mode=region?.value||'pakistan';const selected=dataset.cities.filter(city=>mode==='world'?city.country!=='Pakistan':city.country==='Pakistan');
    selected.forEach(city=>{const f=city.forecast;if(!f)return;const card=document.createElement('article');card.className='live-rate-card weather-card';card.innerHTML=`<header><h3>${city.name}</h3><span class="live-code">${icon(f.symbol_code)} ${f.condition||'Forecast'}</span></header><strong class="live-rate-value">${num(Number(f.temperature_c),1)}°C</strong><span class="live-rate-unit">${city.country} · forecast valid ${localTime(f.valid_at)}</span><div class="weather-details"><span>24h: ${num(Number(f.next_24h?.low_c),1)}° / ${num(Number(f.next_24h?.high_c),1)}°</span><span>Humidity: ${num(Number(f.humidity_pct),0)}%</span><span>Wind: ${num(Number(f.wind_speed_ms),1)} m/s</span><span>Next hour rain: ${num(Number(f.precipitation_next_hour_mm||0),1)} mm</span></div>`;grid.appendChild(card)});
    status.textContent=mode==='world'?'Featured worldwide city model forecasts loaded from the same cached MET Norway feed. These are forecasts, not observed station readings.':'Pakistan city model forecasts loaded. These are forecast values from MET Norway, not observed station readings.';
  };
  region?.addEventListener('change',render);
  fetch('assets/data/live-weather.json',{cache:'no-store'}).then(response=>{if(!response.ok)throw new Error(`HTTP ${response.status}`);return response.json()}).then(data=>{
    if(data?.status!=='ok'||!Array.isArray(data.cities)||!data.cities.length)throw new Error('Weather forecast data is not ready');dataset=data;render();const updated=[...data.cities].map(city=>city.forecast?.model_updated_at).filter(Boolean).sort().pop();const generated=document.querySelector('[data-weather-generated]');if(generated)generated.textContent=localTime(data.generated_at);const model=document.querySelector('[data-weather-model-updated]');if(model)model.textContent=localTime(updated);
  }).catch(()=>{grid.innerHTML='';status.textContent='Weather forecast data is temporarily unavailable. NexusNova will not invent replacement conditions.';status.classList.add('is-error')});
})();
