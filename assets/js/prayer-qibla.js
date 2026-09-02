(()=>{
  const cities={Karachi:[24.8607,67.0011],Lahore:[31.5204,74.3587],Islamabad:[33.6844,73.0479],Peshawar:[34.0151,71.5249],Quetta:[30.1798,66.9750],Multan:[30.1575,71.5249]};
  const city=document.querySelector('[data-prayer-city]'),madhab=document.querySelector('[data-prayer-madhab]'),tbody=document.querySelector('[data-prayer-times]'),qibla=document.querySelector('[data-qibla-value]'),status=document.querySelector('[data-prayer-status]'),useLocation=document.querySelector('[data-use-location]');
  if(!city||!madhab||!tbody||!qibla||!status)return;
  Object.keys(cities).forEach(name=>{const o=document.createElement('option');o.value=name;o.textContent=name;city.appendChild(o)});city.value='Karachi';
  const fmt=d=>new Intl.DateTimeFormat('en-PK',{timeZone:'Asia/Karachi',hour:'numeric',minute:'2-digit',hour12:true}).format(d);
  const render=(lat,lon,label)=>{
    if(!window.adhan){status.textContent='Prayer calculation library did not load. Please refresh.';return}
    const coordinates=new adhan.Coordinates(lat,lon);const params=adhan.CalculationMethod.Karachi();params.madhab=madhab.value==='shafi'?adhan.Madhab.Shafi:adhan.Madhab.Hanafi;
    const now=new Date(),p=new adhan.PrayerTimes(coordinates,now,params);const rows=[['Fajr',p.fajr],['Sunrise',p.sunrise],['Dhuhr',p.dhuhr],['Asr',p.asr],['Maghrib',p.maghrib],['Isha',p.isha]];
    tbody.innerHTML=rows.map(([n,t])=>`<tr><th scope="row">${n}</th><td>${fmt(t)}</td></tr>`).join('');qibla.textContent=`${adhan.Qibla(coordinates).toFixed(1)}° from true north`;
    status.textContent=`Calculated for ${label} · ${now.toLocaleDateString('en-PK',{timeZone:'Asia/Karachi',dateStyle:'medium'})} · University of Islamic Sciences, Karachi method (18° Fajr / 18° Isha) · ${madhab.value==='shafi'?'Shafi':'Hanafi'} Asr.`;
  };
  const renderCity=()=>{const [lat,lon]=cities[city.value];render(lat,lon,city.value)};city.addEventListener('change',renderCity);madhab.addEventListener('change',renderCity);
  useLocation?.addEventListener('click',()=>{if(!navigator.geolocation){status.textContent='Geolocation is not supported by this browser.';return}status.textContent='Waiting for your device location…';navigator.geolocation.getCurrentPosition(pos=>render(pos.coords.latitude,pos.coords.longitude,'your device location'),()=>{status.textContent='Location permission was not available. Using the selected Pakistan city instead.';renderCity()},{enableHighAccuracy:false,timeout:10000,maximumAge:300000})});
  renderCity();
})();
