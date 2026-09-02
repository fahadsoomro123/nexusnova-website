(()=>{
  const status=document.querySelector('[data-weather-status]');
  const grid=document.querySelector('[data-weather-grid]');
  const region=document.querySelector('[data-weather-region]');
  const worldForm=document.querySelector('[data-world-weather-search]');
  const worldQuery=document.querySelector('[data-world-weather-query]');
  const worldStatus=document.querySelector('[data-world-weather-status]');
  const worldResult=document.querySelector('[data-world-weather-result]');
  const useLocation=document.querySelector('[data-use-weather-location]');
  const satelliteImage=document.querySelector('[data-weather-satellite-image]');
  const satelliteMessage=document.querySelector('[data-weather-satellite-message]');
  const radarImage=document.querySelector('[data-weather-radar-image]');
  const radarMessage=document.querySelector('[data-weather-radar-message]');
  const radarStatus=document.querySelector('[data-radar-status]');
  if(!status||!grid)return;

  const MET_FORECAST='https://api.met.no/weatherapi/locationforecast/2.0/compact';
  const NOMINATIM='https://nominatim.openstreetmap.org/search';
  const MET_SATELLITE='https://api.met.no/weatherapi/geosatellite/1.4/';
  const MET_NORDIC_RADAR='https://api.met.no/weatherapi/radar/2.0/?type=reflectivity&area=nordic&content=animation';
  const NOAA_AMERICAS_RADAR='https://mapservices.weather.noaa.gov/eventdriven/rest/services/radar/radar_base_reflectivity/MapServer/export?bbox=-175,5,-50,72&bboxSR=4326&size=1200,650&imageSR=3857&format=png32&transparent=false&f=image';
  const CACHE_PREFIX='nexusnova-weather-v1:';
  const FORECAST_TTL=30*60*1000;
  const GEOCODE_TTL=30*24*60*60*1000;
  let dataset=null;
  let lastGeocodeAt=0;

  const num=(value,digits=1)=>new Intl.NumberFormat('en-PK',{minimumFractionDigits:digits,maximumFractionDigits:digits}).format(value);
  const localTime=value=>{if(!value)return '—';const date=new Date(value);return Number.isNaN(date.getTime())?'—':date.toLocaleString('en-PK',{dateStyle:'medium',timeStyle:'short'})};
  const utcTime=value=>{if(!value)return '—';const date=new Date(value);return Number.isNaN(date.getTime())?'—':date.toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short',timeZone:'UTC'})+' UTC'};
  const icon=code=>{const value=String(code||'').toLowerCase();if(/thunder/.test(value))return '⛈️';if(/snow|sleet/.test(value))return '🌨️';if(/rain|shower/.test(value))return '🌧️';if(/fog/.test(value))return '🌫️';if(/cloudy/.test(value))return '☁️';if(/partlycloudy/.test(value))return '⛅';if(/fair/.test(value))return '🌤️';if(/clearsky/.test(value))return '☀️';return '🌦️'};
  const safeStorage={
    get(key,ttl){try{const raw=localStorage.getItem(CACHE_PREFIX+key);if(!raw)return null;const parsed=JSON.parse(raw);if(!parsed||Date.now()-parsed.saved_at>ttl){localStorage.removeItem(CACHE_PREFIX+key);return null}return parsed.value}catch{return null}},
    set(key,value){try{localStorage.setItem(CACHE_PREFIX+key,JSON.stringify({saved_at:Date.now(),value}))}catch{}}
  };
  const fetchJson=async(url,timeout=15000)=>{const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeout);try{const response=await fetch(url,{headers:{Accept:'application/json'},signal:controller.signal});if(!response.ok)throw new Error(`HTTP ${response.status}`);return await response.json()}finally{clearTimeout(timer)}};

  const parseForecast=payload=>{
    const series=payload?.properties?.timeseries;
    if(!Array.isArray(series)||!series.length)throw new Error('Forecast timeseries unavailable');
    const now=Date.now();let index=series.findIndex(item=>new Date(item.time).getTime()>=now);if(index<0)index=0;
    const current=series[index];const details=current?.data?.instant?.details||{};
    const temperature=Number(details.air_temperature);const humidity=Number(details.relative_humidity);const wind=Number(details.wind_speed);
    if(!Number.isFinite(temperature)||!Number.isFinite(humidity)||!Number.isFinite(wind))throw new Error('Forecast core values unavailable');
    const next=current?.data?.next_1_hours||current?.data?.next_6_hours||{};
    const symbol=next?.summary?.symbol_code||'';
    const rain=Number(current?.data?.next_1_hours?.details?.precipitation_amount||0);
    const window=series.slice(index,index+25).map(item=>Number(item?.data?.instant?.details?.air_temperature)).filter(Number.isFinite);
    if(!window.length)throw new Error('Forecast range unavailable');
    return {valid_at:current.time,model_updated_at:payload?.properties?.meta?.updated_at||null,temperature_c:temperature,humidity_pct:humidity,wind_speed_ms:wind,precipitation_next_hour_mm:Number.isFinite(rain)?rain:0,symbol_code:symbol,condition:String(symbol||'Forecast').replace(/_/g,' ').replace(/day|night/g,'').replace(/\b\w/g,m=>m.toUpperCase()).trim()||'Forecast',next_24h:{low_c:Math.min(...window),high_c:Math.max(...window)}};
  };

  const buildForecastCard=(place,f)=>{
    const card=document.createElement('article');card.className='live-rate-card weather-card weather-search-result-card';
    const header=document.createElement('header');const h3=document.createElement('h3');h3.textContent=place;const code=document.createElement('span');code.className='live-code';code.textContent=`${icon(f.symbol_code)} ${f.condition}`;header.append(h3,code);
    const strong=document.createElement('strong');strong.className='live-rate-value';strong.textContent=`${num(f.temperature_c,1)}°C`;
    const unit=document.createElement('span');unit.className='live-rate-unit';unit.textContent=`Forecast valid ${utcTime(f.valid_at)}`;
    const details=document.createElement('div');details.className='weather-details';
    [`Next 24h: ${num(f.next_24h.low_c,1)}° / ${num(f.next_24h.high_c,1)}°C`,`Humidity: ${num(f.humidity_pct,0)}%`,`Wind: ${num(f.wind_speed_ms,1)} m/s`,`Next hour rain: ${num(f.precipitation_next_hour_mm,1)} mm`,`Model updated: ${utcTime(f.model_updated_at)}`].forEach(text=>{const span=document.createElement('span');span.textContent=text;details.appendChild(span)});
    card.append(header,strong,unit,details);return card;
  };

  const renderCached=()=>{
    if(!dataset)return;grid.innerHTML='';const mode=region?.value||'pakistan';const selected=dataset.cities.filter(city=>mode==='world'?city.country!=='Pakistan':city.country==='Pakistan');
    selected.forEach(city=>{const f=city.forecast;if(!f)return;const card=document.createElement('article');card.className='live-rate-card weather-card';card.innerHTML=`<header><h3>${city.name}</h3><span class="live-code">${icon(f.symbol_code)} ${f.condition||'Forecast'}</span></header><strong class="live-rate-value">${num(Number(f.temperature_c),1)}°C</strong><span class="live-rate-unit">${city.country} · forecast valid ${localTime(f.valid_at)}</span><div class="weather-details"><span>24h: ${num(Number(f.next_24h?.low_c),1)}° / ${num(Number(f.next_24h?.high_c),1)}°</span><span>Humidity: ${num(Number(f.humidity_pct),0)}%</span><span>Wind: ${num(Number(f.wind_speed_ms),1)} m/s</span><span>Next hour rain: ${num(Number(f.precipitation_next_hour_mm||0),1)} mm</span></div>`;grid.appendChild(card)});
    status.textContent=mode==='world'?'Featured worldwide city forecasts loaded from the cached MET Norway feed. Search above for any other place.':'Pakistan city forecasts loaded from the cached MET Norway feed. Search above for any place worldwide.';
  };
  region?.addEventListener('change',renderCached);

  const fetchForecast=async(lat,lon)=>{
    const roundedLat=Number(lat).toFixed(4);const roundedLon=Number(lon).toFixed(4);const key=`forecast:${roundedLat},${roundedLon}`;const cached=safeStorage.get(key,FORECAST_TTL);if(cached)return cached;
    const payload=await fetchJson(`${MET_FORECAST}?lat=${encodeURIComponent(roundedLat)}&lon=${encodeURIComponent(roundedLon)}`);const parsed=parseForecast(payload);safeStorage.set(key,parsed);return parsed;
  };
  const geocode=async query=>{
    const key=`geocode:${query.trim().toLowerCase()}`;const cached=safeStorage.get(key,GEOCODE_TTL);if(cached)return cached;
    const wait=1100-(Date.now()-lastGeocodeAt);if(wait>0)await new Promise(resolve=>setTimeout(resolve,wait));lastGeocodeAt=Date.now();
    const params=new URLSearchParams({format:'jsonv2',limit:'1',q:query});const results=await fetchJson(`${NOMINATIM}?${params.toString()}`);if(!Array.isArray(results)||!results[0])throw new Error('Place not found');
    const hit={lat:Number(results[0].lat),lon:Number(results[0].lon),label:String(results[0].display_name||query)};if(!Number.isFinite(hit.lat)||!Number.isFinite(hit.lon))throw new Error('Invalid place coordinates');safeStorage.set(key,hit);return hit;
  };
  const showWorldForecast=async({lat,lon,label})=>{
    worldStatus.textContent=`Loading forecast for ${label}…`;worldStatus.classList.remove('is-error');worldResult?.replaceChildren();
    const forecast=await fetchForecast(lat,lon);worldResult?.replaceChildren(buildForecastCard(label,forecast));worldStatus.textContent=`Worldwide forecast loaded from MET Norway for ${Number(lat).toFixed(4)}, ${Number(lon).toFixed(4)}. This is a model forecast, not a station observation.`;
  };
  worldForm?.addEventListener('submit',async event=>{event.preventDefault();const query=worldQuery?.value.trim();if(!query)return;try{const hit=await geocode(query);await showWorldForecast(hit)}catch(error){worldStatus.textContent=error?.message==='Place not found'?'Place not found. Try a city plus country, for example “Paris, France”.':'Worldwide weather is temporarily unavailable. No replacement conditions were invented.';worldStatus.classList.add('is-error')}});
  useLocation?.addEventListener('click',()=>{if(!navigator.geolocation){worldStatus.textContent='Location access is not supported by this browser.';worldStatus.classList.add('is-error');return}worldStatus.textContent='Waiting for your device location permission…';navigator.geolocation.getCurrentPosition(position=>showWorldForecast({lat:position.coords.latitude,lon:position.coords.longitude,label:'Your device location'}).catch(()=>{worldStatus.textContent='Weather could not be loaded for your location.';worldStatus.classList.add('is-error')}),()=>{worldStatus.textContent='Location permission was not granted. You can still search a city manually.';worldStatus.classList.add('is-error')},{enableHighAccuracy:false,timeout:10000,maximumAge:15*60*1000})});

  const setSatellite=type=>{if(!satelliteImage)return;document.querySelectorAll('[data-satellite-type]').forEach(button=>button.classList.toggle('btn-primary',button.dataset.satelliteType===type));satelliteMessage.textContent=`Loading global ${type} satellite image…`;satelliteMessage.hidden=false;satelliteImage.src=`${MET_SATELLITE}?area=global&type=${encodeURIComponent(type)}`;satelliteImage.onload=()=>{satelliteMessage.hidden=true};satelliteImage.onerror=()=>{satelliteMessage.hidden=false;satelliteMessage.textContent='Satellite image is temporarily unavailable from the source.'}};
  document.querySelectorAll('[data-satellite-type]').forEach(button=>button.addEventListener('click',()=>setSatellite(button.dataset.satelliteType)));
  setSatellite('infrared');

  const setRadar=view=>{if(!radarImage)return;document.querySelectorAll('[data-radar-view]').forEach(button=>button.classList.toggle('btn-primary',button.dataset.radarView===view));radarMessage.hidden=false;radarImage.onload=()=>{radarMessage.hidden=true};radarImage.onerror=()=>{radarMessage.hidden=false;radarMessage.textContent='Radar image is temporarily unavailable from the source.'};if(view==='nordic'){radarMessage.textContent='Loading Nordic animated radar…';radarImage.src=MET_NORDIC_RADAR;radarImage.alt='Latest Nordic weather radar animation from MET Norway';if(radarStatus)radarStatus.textContent='MET Norway Nordic radar is a regional composite. It does not represent global radar coverage.'}else{radarMessage.textContent='Loading NOAA Americas radar…';radarImage.src=NOAA_AMERICAS_RADAR;radarImage.alt='Latest NOAA weather radar composite for supported Americas coverage';if(radarStatus)radarStatus.textContent='NOAA MRMS radar covers the continental U.S., Canada, Alaska, Caribbean, Hawaii and Guam. It does not cover the whole world.'}};
  document.querySelectorAll('[data-radar-view]').forEach(button=>button.addEventListener('click',()=>setRadar(button.dataset.radarView)));
  setRadar('americas');

  fetch('assets/data/live-weather.json',{cache:'no-store'}).then(response=>{if(!response.ok)throw new Error(`HTTP ${response.status}`);return response.json()}).then(data=>{
    if(data?.status!=='ok'||!Array.isArray(data.cities)||!data.cities.length)throw new Error('Weather forecast data is not ready');dataset=data;renderCached();const updated=[...data.cities].map(city=>city.forecast?.model_updated_at).filter(Boolean).sort().pop();const generated=document.querySelector('[data-weather-generated]');if(generated)generated.textContent=localTime(data.generated_at);const model=document.querySelector('[data-weather-model-updated]');if(model)model.textContent=localTime(updated);
  }).catch(()=>{grid.innerHTML='';status.textContent='Cached quick forecasts are temporarily unavailable. Worldwide manual search may still work.';status.classList.add('is-error')});
})();
