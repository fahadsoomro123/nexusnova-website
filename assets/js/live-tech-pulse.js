(()=>{
  const path=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  if(path!=='index.html'&&location.pathname!=='/') return;
  const mountBefore=document.querySelector('[data-popular-banner]')||document.querySelector('main .section');
  if(!mountBefore||document.querySelector('[data-live-tech-pulse]')) return;
  const fmt=value=>{try{return new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(value))}catch{return value||''}};
  const absolute=url=>/^https?:\/\//i.test(url);
  const make=(tag,className,text)=>{const el=document.createElement(tag);if(className)el.className=className;if(text)el.textContent=text;return el};
  fetch('assets/data/live-tech-pulse.json?ts='+Date.now(),{cache:'no-store'})
    .then(r=>{if(!r.ok)throw new Error('pulse unavailable');return r.json()})
    .then(data=>{
      const items=Array.isArray(data.items)?data.items.slice(0,8):[];
      if(!items.length)return;
      const section=make('section','section nn-live-tech');section.dataset.liveTechPulse='';
      const container=make('div','container');section.appendChild(container);
      const rail=make('div','section-rail');rail.innerHTML='<span>LIVE</span><i></i><small>TECH PULSE</small>';container.appendChild(rail);
      const head=make('div','section-head');
      const headCopy=make('div');headCopy.append(make('span','kicker','FRESH + SOURCE-BACKED'),make('h2','',"What's moving in tech right now."));
      const meta=make('p','nn-pulse-updated','Updated '+fmt(data.generated_at)+' • Official-source monitoring');
      head.append(headCopy,meta);container.appendChild(head);
      const grid=make('div','nn-pulse-grid');
      items.forEach((item,index)=>{
        const card=make('article','nn-pulse-card'+(index<2?' is-featured':''));
        const top=make('div','nn-pulse-meta');top.append(make('span','nn-pulse-category',item.category||'Tech'),make('span','nn-pulse-source',item.source||'Official source'));card.appendChild(top);
        card.appendChild(make('h3','',item.title||'Tech update'));
        if(item.summary)card.appendChild(make('p','',item.summary));
        const foot=make('div','nn-pulse-foot');foot.appendChild(make('time','',fmt(item.published)));
        const link=make('a','card-link','Open source →');link.href=item.url;link.rel=absolute(item.url)?'noopener noreferrer':'';if(absolute(item.url))link.target='_blank';foot.appendChild(link);card.appendChild(foot);grid.appendChild(card);
      });
      container.appendChild(grid);
      if(data.tool_of_day&&data.tool_of_day.url){
        const tool=make('a','nn-tool-of-day');tool.href=data.tool_of_day.url;
        const label=make('span','kicker','TOOL OF THE DAY');
        const body=make('div');body.append(make('strong','',data.tool_of_day.title||'NexusNova Tool'),make('p','',data.tool_of_day.summary||''));
        tool.append(label,body,make('b','','Open tool →'));container.appendChild(tool);
      }
      mountBefore.parentNode.insertBefore(section,mountBefore);
    })
    .catch(()=>{});
})();
