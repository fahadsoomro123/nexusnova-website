(()=>{
  const status=document.querySelector('[data-quake-status]');
  const pk=document.querySelector('[data-quake-pakistan]');
  const world=document.querySelector('[data-quake-world]');
  const generated=document.querySelector('[data-quake-generated]');
  const feedTime=document.querySelector('[data-quake-feed-time]');
  if(!status||!pk||!world)return;
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const fmtTime=value=>value?new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short'}).format(new Date(value)):'—';
  const card=event=>`<article class="live-category-card"><span>🌐 M${esc(Number(event.magnitude).toFixed(1))}</span><h3>${esc(event.place)}</h3><p><strong>Depth:</strong> ${esc(event.depth_km)} km<br><strong>Time:</strong> ${esc(fmtTime(event.time))}${event.tsunami?'<br><strong>Tsunami flag:</strong> Yes':''}</p>${event.source_url?`<strong><a href="${esc(event.source_url)}" rel="noopener noreferrer">USGS event →</a></strong>`:''}</article>`;
  fetch('assets/data/live-earthquakes.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('cached earthquake data unavailable');return r.json();}).then(data=>{
    if(data.status!=='ok')throw new Error('earthquake dataset is not published yet');
    const pkEvents=Array.isArray(data.pakistan_region_events)?data.pakistan_region_events:[];
    const worldEvents=Array.isArray(data.worldwide_events)?data.worldwide_events:[];
    pk.innerHTML=pkEvents.length?pkEvents.slice(0,12).map(card).join(''):'<p class="mini-note">No M2.5+ event from the past 24 hours falls inside the approximate Pakistan-region box in this cached snapshot.</p>';
    world.innerHTML=worldEvents.slice(0,24).map(card).join('');
    generated.textContent=fmtTime(data.generated_at);
    feedTime.textContent=fmtTime(data.feed_generated_at);
    status.textContent=`Showing ${worldEvents.length} cached recent events; ${pkEvents.length} fall inside the Pakistan-region box.`;
  }).catch(err=>{status.textContent=`Earthquake data is temporarily unavailable: ${err.message}.`;pk.innerHTML='';world.innerHTML='';});
})();
