(()=>{
  const status=document.querySelector('[data-crypto-status]');
  const grid=document.querySelector('[data-crypto-grid]');
  const meta=document.querySelector('[data-crypto-meta]');
  if(!status||!grid)return;
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const usd=value=>Number.isFinite(Number(value))?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:Number(value)<1?6:2}).format(Number(value)):'—';
  const pkr=value=>Number.isFinite(Number(value))?new Intl.NumberFormat('en-PK',{style:'currency',currency:'PKR',maximumFractionDigits:2}).format(Number(value)):'—';
  const dt=value=>{const d=new Date(value);return Number.isNaN(d.getTime())?'—':d.toLocaleString('en-PK',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Karachi'})};
  fetch('assets/data/live-crypto.json',{cache:'no-store'})
    .then(res=>{if(!res.ok)throw new Error(`HTTP ${res.status}`);return res.json()})
    .then(data=>{
      if(data?.status!=='ok'||!Array.isArray(data.coins)||data.coins.length!==5)throw new Error('Crypto publisher has not produced validated data yet');
      grid.innerHTML=data.coins.map(row=>{
        const change=Number(row.change_24h_pct);
        const changeLabel=Number.isFinite(change)?`${change>=0?'+':''}${change.toFixed(2)}%`:'—';
        const pkrLine=Number.isFinite(Number(row.price_pkr))?`Derived PKR reference: ${pkr(row.price_pkr)}`:'Derived PKR reference unavailable';
        return `<article class="live-rate-card"><header><h3>${esc(row.name)}</h3><span class="live-code">${esc(row.symbol)}</span></header><strong class="live-rate-value">${esc(usd(row.price_usd))}</strong><span class="live-rate-unit">USD market reference</span><span class="live-change">24h change: ${esc(changeLabel)}</span><p class="mini-note">${esc(pkrLine)}${row.rank?` · Coinranking rank #${esc(row.rank)}`:''}</p></article>`;
      }).join('');
      status.textContent='Loaded 5 validated Coinranking market references. Prices are cached snapshots, not executable exchange quotes.';
      if(meta)meta.innerHTML=`<span><strong>Source:</strong> <a href="${esc(data.source?.url||'https://coinranking.com/')}" rel="noopener noreferrer">Coinranking</a> — Data provided by Coinranking</span><span><strong>24h change:</strong> source-calculated 24-hour period</span><span><strong>NexusNova refresh:</strong> ${esc(dt(data.generated_at))}</span>${data.usd_pkr_reference?`<span><strong>USD/PKR reference date:</strong> ${esc(data.usd_pkr_reference.data_date||'—')}</span>`:''}`;
    })
    .catch(()=>{
      status.textContent='Crypto market data is not published yet. The server-side source key or validated upstream response is unavailable; NexusNova will not show guessed prices.';
      status.classList.add('is-error');
      grid.innerHTML='<article class="live-category-card"><span>₿</span><h3>Awaiting verified market data</h3><p>No fallback price is substituted when the Coinranking server-side source is unavailable.</p></article>';
    });
})();
