(()=>{
  const status=document.querySelector('[data-aqi-status]');
  const grid=document.querySelector('[data-aqi-grid]');
  const meta=document.querySelector('[data-aqi-meta]');
  if(!status||!grid)return;
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const dateTime=value=>{const d=new Date(value);return Number.isNaN(d.getTime())?'—':d.toLocaleString('en-PK',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Karachi'})};
  fetch('assets/data/live-aqi.json',{cache:'no-store'})
    .then(res=>{if(!res.ok)throw new Error(`HTTP ${res.status}`);return res.json()})
    .then(data=>{
      if(data?.status!=='ok'||!Array.isArray(data.cities)||!data.cities.length)throw new Error('AQI publisher has not produced validated data yet');
      grid.innerHTML=data.cities.map(row=>`<article class="live-rate-card"><header><h3>${esc(row.city)}</h3><span class="live-code">${esc(row.instrument_type||'OBSERVED')}</span></header><strong class="live-rate-value">${esc(row.aqi_estimate)}</strong><span class="live-rate-unit">PM2.5-based AQI estimate · ${esc(row.aqi_category)}</span><span class="live-change">Rolling PM2.5: ${esc(row.pm25_rolling_24h_ug_m3)} µg/m³ · ${esc(row.coverage_hours)} hourly values</span><p class="mini-note">Station: ${esc(row.station_name)} · Provider: ${esc(row.provider||'—')} · Latest included hour: ${esc(dateTime(row.latest_hour_at))}</p><a href="${esc(row.openaq_url)}" rel="noopener noreferrer">OpenAQ station details →</a></article>`).join('');
      status.textContent=`Loaded ${data.cities.length} validated Pakistan station/sensor AQI estimates. These are rolling PM2.5-based estimates, not official citywide declarations.`;
      if(meta) meta.innerHTML=`<span><strong>Source:</strong> <a href="${esc(data.source?.url||'https://openaq.org/')}" rel="noopener noreferrer">OpenAQ</a></span><span><strong>Method:</strong> rolling ~24h PM2.5 + EPA breakpoints</span><span><strong>NexusNova refresh:</strong> ${esc(dateTime(data.generated_at))}</span>`;
    })
    .catch(()=>{
      status.textContent='Observed Pakistan AQI data is not published yet. The server-side source key or minimum hourly coverage is unavailable; NexusNova will not show guessed AQI values.';
      status.classList.add('is-error');
      grid.innerHTML='<article class="live-category-card"><span>🌫</span><h3>Awaiting verified observations</h3><p>No fallback number is substituted when OpenAQ access, licensing metadata or rolling-hour coverage cannot be validated.</p></article>';
    });
})();
