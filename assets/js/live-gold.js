(()=>{
  const statusEl=document.querySelector('[data-gold-status]');
  if(!statusEl)return;
  const set=(selector,value)=>{const el=document.querySelector(selector);if(el)el.textContent=value};
  const money=(value,digits=2)=>new Intl.NumberFormat('en-PK',{minimumFractionDigits:digits,maximumFractionDigits:digits}).format(value);
  const pkr=value=>`Rs ${new Intl.NumberFormat('en-PK',{maximumFractionDigits:0}).format(value)}`;
  const time=value=>{if(!value)return '—';const date=new Date(value);return Number.isNaN(date.getTime())?'—':date.toLocaleString('en-PK',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Karachi'})};
  const renderHistory=data=>{
    const table=document.querySelector('[data-gold-history-rows]'),chart=document.querySelector('[data-gold-history-chart]'),summary=document.querySelector('[data-gold-history-summary]');
    if(!table||!chart||!summary)return;
    const points=Array.isArray(data?.points)?data.points.filter(p=>Number.isFinite(Number(p?.pkr_per_tola_24k))):[];
    if(!points.length){summary.textContent='No NexusNova history snapshots are available yet.';return}
    const recent=points.slice(-30);table.innerHTML=recent.slice().reverse().map(p=>`<tr><td>${p.date}</td><td>${pkr(Number(p.pkr_per_tola_24k))}</td><td>$${money(Number(p.xau_usd),2)}</td><td>${money(Number(p.usd_pkr),4)}</td></tr>`).join('');
    if(recent.length<2){summary.textContent='History tracking has started. A daily change will appear after a second dated snapshot.';chart.innerHTML='';return}
    const first=Number(recent[0].pkr_per_tola_24k),last=Number(recent.at(-1).pkr_per_tola_24k),change=((last-first)/first)*100;summary.textContent=`NexusNova snapshot change across ${recent.length} dated point(s): ${change>=0?'+':''}${change.toFixed(2)}%. This is NexusNova-collected history, not a backfilled market-history feed.`;
    const vals=recent.map(p=>Number(p.pkr_per_tola_24k)),min=Math.min(...vals),max=Math.max(...vals),span=max-min||1,w=600,h=160,pad=10;const coords=vals.map((v,i)=>`${pad+(i*(w-2*pad))/Math.max(1,vals.length-1)},${h-pad-((v-min)/span)*(h-2*pad)}`).join(' ');chart.innerHTML=`<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="NexusNova 24K gold per tola snapshot trend"><polyline points="${coords}" fill="none" stroke="currentColor" stroke-width="4" vector-effect="non-scaling-stroke"/></svg>`;
  };
  Promise.all([
    fetch('assets/data/live-gold.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.json()}),
    fetch('assets/data/live-gold-history.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null)
  ]).then(([data,history])=>{
    if(data?.status!=='ok'||!data?.xau||!data?.international_derived_pkr||!data?.fx)throw new Error('Gold reference data is not ready');
    const xau=Number(data.xau.usd_per_troy_ounce),derived=data.international_derived_pkr;if(!Number.isFinite(xau)||xau<=0)throw new Error('Invalid gold price');
    set('[data-gold-xau]',`$${money(xau,2)}`);set('[data-gold-tola]',pkr(Number(derived.per_tola_24k)));set('[data-gold-10g]',pkr(Number(derived.per_10g_24k)));set('[data-gold-gram]',pkr(Number(derived.per_gram_24k)));set('[data-gold-22k-tola]',pkr(Number(derived.per_tola_22k)));set('[data-gold-upstream-updated]',time(data.xau.updated_at));set('[data-gold-generated]',time(data.generated_at));set('[data-gold-fx-date]',data.fx.data_date||'—');set('[data-gold-usdpkr]',`1 USD = ${money(Number(data.fx.usd_pkr),4)} PKR`);
    const source=document.querySelector('[data-gold-source]');if(source&&data.source?.url){source.href=data.source.url;source.textContent=data.source.name||'Gold API'}
    statusEl.textContent='International gold reference loaded. PKR values are calculated from XAU/USD and the published USD/PKR reference rate; they are not Pakistan Sarafa board quotes.';
    const local=document.querySelector('[data-gold-local-status]');
    if(local){
      local.replaceChildren(document.createTextNode(data.local_sarafa?.message||'Local Sarafa rate not published.'));
      const localSource=data.local_sarafa?.source;
      if(localSource?.url){
        local.append(document.createTextNode(' Source: '));
        const link=document.createElement('a');link.href=localSource.url;link.rel='noopener noreferrer';link.target='_blank';link.textContent=localSource.name||'local market API';local.appendChild(link);
      }
    }
    renderHistory(history);
  }).catch(()=>{statusEl.textContent='Gold reference data is temporarily unavailable. No estimated or stale replacement has been invented.';statusEl.classList.add('is-error')});
})();
