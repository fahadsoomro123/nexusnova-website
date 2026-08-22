(()=>{
  const measurementId='G-YLPFKWSS12';
  if(!document.querySelector('script[data-nexusnova-ga4]')){
    window.dataLayer=window.dataLayer||[];
    window.gtag=window.gtag||function(){window.dataLayer.push(arguments)};
    window.gtag('js',new Date());
    window.gtag('config',measurementId,{allow_google_signals:false,allow_ad_personalization_signals:false});
    const analyticsScript=document.createElement('script');
    analyticsScript.async=true;
    analyticsScript.src=`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    analyticsScript.dataset.nexusnovaGa4='';
    document.head.appendChild(analyticsScript);
  }
})();

(()=>{
  const inSubdir=/\/(guides|articles)\//.test(location.pathname);
  const base=inSubdir?'../':'';
  const styles=[
    ['scifi',`${base}assets/css/scifi.css`],
    ['motion',`${base}assets/css/motion.css`],
    ['tool-icons',`${base}assets/css/tool-icons.css`]
  ];
  styles.forEach(([key,href])=>{
    if(document.querySelector(`link[data-nexusnova-${key}]`)) return;
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href=href;
    link.setAttribute(`data-nexusnova-${key}`,'');
    document.head.appendChild(link);
  });
  document.documentElement.classList.add('nexusnova-scifi');
})();

(()=>{
  const inSubdir=/\/(guides|articles)\//.test(location.pathname);
  const base=inSubdir?'../':'';
  const year=document.querySelector('[data-year]');if(year)year.textContent=String(new Date().getFullYear());
  const header=document.querySelector('[data-header]');const updateHeader=()=>header?.classList.toggle('scrolled',window.scrollY>6);updateHeader();window.addEventListener('scroll',updateHeader,{passive:true});
  const nav=document.querySelector('[data-nav]');const button=document.querySelector('[data-menu-btn]');
  if(nav){
    [...nav.querySelectorAll('a')].forEach(link=>{if(/world-conflict-updates|\/news\//i.test(link.getAttribute('href')||''))link.remove()});
    [['tools.html','Tools'],['trending-tools.html','Trending'],['articles.html','Articles'],['guides.html','Guides']].forEach(([file,label])=>{
      const href=`${base}${file}`;if(nav.querySelector(`a[href="${href}"]`))return;const link=document.createElement('a');link.href=href;link.textContent=label;const app=nav.querySelector(`a[href="${base}app.html"]`);if(app)app.insertAdjacentElement('beforebegin',link);else nav.appendChild(link);
    });
    const accountHref=`${base}register.html`;if(!nav.querySelector(`a[href="${accountHref}"]`)&&!nav.querySelector(`a[href="${base}account.html"]`)){const link=document.createElement('a');link.href=accountHref;link.textContent='Account';nav.appendChild(link)}
  }
  if(button&&nav){const close=()=>{nav.classList.remove('open');button.setAttribute('aria-expanded','false')};button.addEventListener('click',()=>{const open=nav.classList.toggle('open');button.setAttribute('aria-expanded',String(open))});nav.addEventListener('click',e=>{if(e.target.closest('a'))close()});window.addEventListener('resize',()=>{if(innerWidth>720)close()})}

  const iconArt={
    image:'<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="9" r="1.6"/><path d="m5.5 17 4.2-4.2 3.1 3.1 2.4-2.4 3.3 3.5"/>',
    pdf:'<path d="M6 2.8h7l5 5V21H6z"/><path d="M13 2.8V8h5"/><path d="M8.8 12.2h6.4M8.8 15.2h6.4M8.8 18.2h4.2"/>',
    qr:'<rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="3" width="6" height="6" rx="1"/><rect x="3" y="15" width="6" height="6" rx="1"/><path d="M15 15h2v2h-2zM19 15h2M19 19h2v2h-2zM15 19v2"/>',
    calc:'<rect x="4" y="2.8" width="16" height="18.4" rx="3"/><path d="M7.5 6.3h9M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 18.5h.01M12 18.5h4"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
    text:'<path d="M5 5h14M12 5v14M8.5 19h7"/><path d="M4 9h3M17 9h3"/>',
    lock:'<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14.5v3"/>',
    money:'<circle cx="12" cy="12" r="9"/><path d="M15.2 8.8c-.8-.7-1.8-1-3-1-1.6 0-2.8.8-2.8 2s1 1.8 2.8 2.2 2.8 1 2.8 2.2-1.2 2-2.9 2c-1.2 0-2.3-.4-3.2-1.2M12 6.2v11.6"/>',
    calendar:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4M17 3v4M3 9h18M7 13h2M11 13h2M15 13h2M7 17h2M11 17h2"/>',
    convert:'<path d="M5 7h12l-3-3M19 17H7l3 3"/><path d="m17 4 3 3-3 3M7 14l-3 3 3 3"/>',
    database:'<ellipse cx="12" cy="5" rx="7.5" ry="3"/><path d="M4.5 5v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3V5M4.5 11v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-6"/>',
    dice:'<rect x="4" y="4" width="16" height="16" rx="4"/><circle cx="8" cy="8" r="1" fill="currentColor" stroke="none"/><circle cx="16" cy="8" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="8" cy="16" r="1" fill="currentColor" stroke="none"/><circle cx="16" cy="16" r="1" fill="currentColor" stroke="none"/>',
    resume:'<path d="M6 3h12v18H6z"/><circle cx="10" cy="9" r="2"/><path d="M7.8 14c.7-1.4 1.5-2 2.2-2s1.5.6 2.2 2M14 8h2M14 11h2M9 17h7"/>',
    ai:'<path d="m12 3 1.2 3.3L16.5 7.5l-3.3 1.2L12 12l-1.2-3.3-3.3-1.2 3.3-1.2zM18 13l.8 2.2L21 16l-2.2.8L18 19l-.8-2.2L15 16l2.2-.8zM6 14l.7 1.8 1.8.7-1.8.7L6 19l-.7-1.8-1.8-.7 1.8-.7z"/>',
    code:'<path d="m8.5 8-4 4 4 4M15.5 8l4 4-4 4M14 5l-4 14"/>',
    color:'<circle cx="8" cy="10" r="4"/><circle cx="16" cy="10" r="4"/><circle cx="12" cy="16" r="4"/> '
  };
  const iconSvg=kind=>`<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${iconArt[kind]||iconArt.code}</svg>`;
  const kindFor=el=>{
    const hay=[el.getAttribute?.('href')||'',el.id||'',el.querySelector?.('h1,h2,h3')?.textContent||'',el.textContent||''].join(' ').toLowerCase();
    if(/qr\b/.test(hay)) return 'qr';
    if(/pdf/.test(hay)) return 'pdf';
    if(/image|png|jpe?g|webp|photo/.test(hay)) return 'image';
    if(/resume|cv\b/.test(hay)) return 'resume';
    if(/ai prompt|prompt builder|artificial intelligence/.test(hay)) return 'ai';
    if(/password|security|secure/.test(hay)) return 'lock';
    if(/developer|json|base64|uuid|sha-?256|url component|code/.test(hay)) return 'code';
    if(/rgb|hex|color/.test(hay)) return 'color';
    if(/timer|stopwatch|pomodoro|timestamp|time duration|clock/.test(hay)) return 'clock';
    if(/age|date difference|date calculator|calendar/.test(hay)) return 'calendar';
    if(/emi|loan|bill|tip|discount|saving|finance|price/.test(hay)) return 'money';
    if(/calculator|percentage|bmi|scientific|arithmetic/.test(hay)) return 'calc';
    if(/storage|byte|\bkb\b|\bmb\b|\bgb\b|\btb\b/.test(hay)) return 'database';
    if(/converter|conversion|unit|roman numeral/.test(hay)) return 'convert';
    if(/random|picker|dice/.test(hay)) return 'dice';
    if(/word|character|text case|number to words|quick note|\btext\b/.test(hay)) return 'text';
    return 'code';
  };
  const symbolFor=el=>{
    const kind=kindFor(el);const span=document.createElement('span');span.className='nn-tool-symbol';span.dataset.kind=kind;span.setAttribute('aria-hidden','true');span.innerHTML=iconSvg(kind);return span;
  };
  const decorateCard=el=>{
    if(el.dataset.nnSymbolic==='1') return;el.dataset.nnSymbolic='1';const kind=kindFor(el);
    const existing=el.matches('.trend-card')?el.querySelector(':scope > .trend-icon'):null;
    if(existing){existing.classList.add('nn-tool-symbol');existing.dataset.kind=kind;existing.setAttribute('aria-hidden','true');existing.innerHTML=iconSvg(kind);return}
    const symbol=symbolFor(el);const heading=el.querySelector(':scope > h1,:scope > h2,:scope > h3');el.insertBefore(symbol,heading||el.firstChild);
  };
  document.querySelectorAll('.home-tool,.tool-card,.trend-card,.popular-card,.category-card').forEach(decorateCard);
  document.querySelectorAll('.command-dock a,.node').forEach(el=>{if(el.querySelector(':scope > .nn-tool-symbol'))return;el.insertBefore(symbolFor(el),el.firstChild)});
  const pageFile=(location.pathname.split('/').pop()||'').toLowerCase();
  const hubFiles=new Set(['','index.html','tools.html','popular-tools.html','trending-tools.html','developer-tools.html','guides.html','articles.html','about.html','contact.html','privacy.html','terms.html','disclaimer.html','faq.html','tool-methodology.html','editorial-policy.html','app.html','register.html','account.html']);
  if(pageFile&&!hubFiles.has(pageFile)){
    const hero=document.querySelector('.page-hero .container');
    if(hero&&!hero.querySelector(':scope > .nn-tool-symbol')){const proxy=document.createElement('span');proxy.textContent=pageFile.replace(/[-.]/g,' ');proxy.setAttribute('href',pageFile);hero.insertBefore(symbolFor(proxy),hero.firstChild)}
  }

  const toolSearch=document.querySelector('[data-tool-search]');
  if(toolSearch){const cards=[...document.querySelectorAll('[data-tool-card]')];const empty=document.querySelector('[data-no-results]');const apply=()=>{const q=toolSearch.value.trim().toLowerCase();let shown=0;cards.forEach(card=>{const match=!q||card.textContent.toLowerCase().includes(q);card.classList.toggle('hidden',!match);if(match)shown++});empty?.classList.toggle('show',shown===0)};toolSearch.addEventListener('input',apply);const q=new URLSearchParams(location.search).get('q');if(q){toolSearch.value=q;apply()}}
  const homeSearch=document.querySelector('[data-home-search]');
  if(homeSearch){const form=homeSearch.closest('form');const cards=[...document.querySelectorAll('[data-home-tool]')];const filter=()=>{const q=homeSearch.value.trim().toLowerCase();cards.forEach(card=>card.classList.toggle('hidden',Boolean(q)&&!card.textContent.toLowerCase().includes(q)))};homeSearch.addEventListener('input',filter);form?.addEventListener('submit',e=>{e.preventDefault();const q=homeSearch.value.trim();const first=cards.find(card=>!card.classList.contains('hidden'));if(first?.href)location.href=first.href;else location.href=`trending-tools.html?q=${encodeURIComponent(q)}`})}
  const motionOkay=!matchMedia('(prefers-reduced-motion: reduce)').matches;const targets=[...document.querySelectorAll('.section,.home-tool,.article-card,.category-card,.tool-card,.guide-card,.bento-card,.article-main,.side-panel')];
  if(motionOkay&&'IntersectionObserver'in window){targets.forEach(el=>el.classList.add('nn-reveal'));const io=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('nn-visible');io.unobserve(entry.target)}})},{threshold:.06,rootMargin:'0px 0px -18px'});targets.forEach(el=>io.observe(el))}else targets.forEach(el=>el.classList.add('nn-visible'));
  if(!document.querySelector('script[data-nova-assistant]')){const s=document.createElement('script');s.src=`${base}assets/js/assistant.js`;s.defer=true;s.dataset.novaAssistant='';document.body.appendChild(s)}
  if(document.querySelector('[data-article-comments]')&&!document.querySelector('script[data-nova-comments]')){const s=document.createElement('script');s.type='module';s.src=`${base}assets/js/comments.js`;s.dataset.novaComments='';document.body.appendChild(s)}
})();

(()=>{
  const addJsonLd=(id,data)=>{
    if(document.getElementById(id)) return;
    const script=document.createElement('script');
    script.id=id;
    script.type='application/ld+json';
    script.textContent=JSON.stringify(data);
    document.head.appendChild(script);
  };
  const path=location.pathname;
  const absolute=url=>new URL(url,location.origin).href;
  const isHome=path==='/'||/\/index\.html$/.test(path);
  if(isHome){
    addJsonLd('nexusnova-organization-schema',{
      '@context':'https://schema.org',
      '@type':'Organization',
      name:'NexusNova Tools',
      alternateName:'NexusNova',
      url:'https://nexusnovatools.com/',
      logo:'https://nexusnovatools.com/assets/nexusnova-logo-512.svg',
      description:'Free browser tools and practical guides for PDF, images, calculators, QR codes, text and productivity.',
      sameAs:['https://github.com/fahadsoomro123']
    });
  }
  if(/\/articles\/[^/]+\.html$/.test(path)){
    const articleSchema=[...document.querySelectorAll('script[type="application/ld+json"]')].find(script=>{
      try{return JSON.parse(script.textContent||'{}')['@type']==='Article'}catch{return false}
    });
    if(articleSchema){
      try{
        const data=JSON.parse(articleSchema.textContent||'{}');
        data.author={...(data.author||{}),'@type':'Organization',name:'NexusNova Editorial Team',url:'https://nexusnovatools.com/editorial-team.html'};
        data.publisher={...(data.publisher||{}),'@type':'Organization',name:'NexusNova Tools',url:'https://nexusnovatools.com/',logo:{'@type':'ImageObject',url:'https://nexusnovatools.com/assets/nexusnova-logo-512.svg'}};
        articleSchema.textContent=JSON.stringify(data);
      }catch{}
    }
    const title=document.querySelector('.article-main h1,h1')?.textContent?.trim()||document.title;
    addJsonLd('nexusnova-breadcrumb-schema',{
      '@context':'https://schema.org',
      '@type':'BreadcrumbList',
      itemListElement:[
        {'@type':'ListItem',position:1,name:'Home',item:absolute('../index.html')},
        {'@type':'ListItem',position:2,name:'Articles',item:absolute('../articles.html')},
        {'@type':'ListItem',position:3,name:title,item:location.href.split('#')[0]}
      ]
    });
    const meta=[...document.querySelectorAll('.article-meta span')].find(el=>el.textContent.trim()==='NexusNova Editorial Team');
    if(meta&&!meta.querySelector('a')){
      const link=document.createElement('a');
      link.href='../editorial-team.html';
      link.textContent='NexusNova Editorial Team';
      link.setAttribute('aria-label','About the NexusNova Editorial Team');
      meta.textContent='';
      meta.appendChild(link);
    }
  }
})();
