(()=>{
  const measurementId='G-YLPFKWSS12';
  if(window.__nexusnovaGa4Scheduled||document.querySelector('script[data-nexusnova-ga4]'))return;
  window.__nexusnovaGa4Scheduled=true;
  window.dataLayer=window.dataLayer||[];
  window.gtag=window.gtag||function(){window.dataLayer.push(arguments)};
  window.gtag('js',new Date());
  window.gtag('config',measurementId,{allow_google_signals:false,allow_ad_personalization_signals:false});
  let loaded=false;
  const load=()=>{
    if(loaded||document.querySelector('script[data-nexusnova-ga4]'))return;
    loaded=true;
    const analyticsScript=document.createElement('script');
    analyticsScript.async=true;
    analyticsScript.src=`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    analyticsScript.dataset.nexusnovaGa4='';
    document.head.appendChild(analyticsScript);
  };
  ['pointerdown','keydown','touchstart'].forEach(type=>window.addEventListener(type,load,{once:true,passive:true}));
  window.addEventListener('scroll',load,{once:true,passive:true});
  const schedule=()=>setTimeout(load,8000);
  if(document.readyState==='complete')schedule();
  else window.addEventListener('load',schedule,{once:true});
})();

(()=>{
  const inSubdir=/\/(guides|articles|tech)\//.test(location.pathname);
  const base=inSubdir?'../':'';
  const styles=[
    ['scifi',`${base}assets/css/scifi.css`],
    ['motion',`${base}assets/css/motion.css`],
    ['tool-icons',`${base}assets/css/tool-icons.css`],
    ['polish',`${base}assets/css/polish.css`],
    ['auth-nav',`${base}assets/css/auth-nav.css`]
  ];
  styles.forEach(([key,href])=>{
    if(document.querySelector(`link[data-nexusnova-${key}]`)) return;
    const link=document.createElement('link');
    link.rel='stylesheet';link.href=href;link.setAttribute(`data-nexusnova-${key}`,'');document.head.appendChild(link);
  });
  document.documentElement.classList.add('nexusnova-scifi');
})();

(()=>{
  const inSubdir=/\/(guides|articles|tech)\//.test(location.pathname);
  const base=inSubdir?'../':'';
  const year=document.querySelector('[data-year]');if(year)year.textContent=String(new Date().getFullYear());
  const header=document.querySelector('[data-header]');const updateHeader=()=>header?.classList.toggle('scrolled',window.scrollY>6);updateHeader();window.addEventListener('scroll',updateHeader,{passive:true});
  const nav=document.querySelector('[data-nav]');const button=document.querySelector('[data-menu-btn]');
  const page=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  const gamingPages=new Set(['gaming.html','gaming-sensitivity-converter.html','edpi-calculator.html','fps-frame-time-calculator.html','reaction-time-test.html','steam-playtime-calculator.html','minecraft-coordinate-converter.html','gaming-settings-notes.html','gamer-name-generator.html']);
  if(nav){
    const items=[
      ['index.html','Home'],['tools.html','Tools'],['trending-tools.html','Trending'],['smart-tools.html','Smart'],['gaming.html','Gaming'],['articles.html','Articles'],['tech.html','Tech'],['guides.html','Guides'],['developer-tools.html','Developer'],['app.html','App']
    ];
    nav.innerHTML='';
    items.forEach(([file,label])=>{
      const link=document.createElement('a');link.href=`${base}${file}`;link.textContent=label;
      if(page===file||(file==='gaming.html'&&gamingPages.has(page))||(file==='articles.html'&&/\/articles\//.test(location.pathname))||(file==='tech.html'&&/\/tech\//.test(location.pathname))||(file==='guides.html'&&/\/guides\//.test(location.pathname))) link.setAttribute('aria-current','page');
      nav.appendChild(link);
    });
    const authMode=new URLSearchParams(location.search).get('mode')==='signin'?'signin':'register';
    const signIn=document.createElement('a');signIn.href=`${base}register.html?mode=signin`;signIn.textContent='Sign in';signIn.className='nn-nav-auth nn-nav-signin';if(page==='register.html'&&authMode==='signin')signIn.setAttribute('aria-current','page');nav.appendChild(signIn);
    const signUp=document.createElement('a');signUp.href=`${base}register.html?mode=register`;signUp.textContent='Sign up';signUp.className='nn-nav-auth nn-nav-signup';if(page==='register.html'&&authMode!=='signin')signUp.setAttribute('aria-current','page');nav.appendChild(signUp);
  }
  if(button&&nav){const close=()=>{nav.classList.remove('open');button.setAttribute('aria-expanded','false')};button.addEventListener('click',()=>{const open=nav.classList.toggle('open');button.setAttribute('aria-expanded',String(open))});nav.addEventListener('click',e=>{if(e.target.closest('a'))close()});window.addEventListener('resize',()=>{if(innerWidth>720)close()})}

  const socialProfiles=[
    ['X','@NexusNovaTools','https://x.com/NexusNovaTools'],
    ['Facebook','NexusNovaTools','https://www.facebook.com/NexusNovaTools/'],
    ['Instagram','@nexusnovatools','https://www.instagram.com/nexusnovatools/'],
    ['Telegram','@NexusNovaTools','https://t.me/NexusNovaTools']
  ];
  const footerGrid=document.querySelector('.site-footer .footer-console,.site-footer .footer-grid');
  if(footerGrid&&!footerGrid.querySelector('[data-social-links]')){
    const brandColumn=footerGrid.firstElementChild;
    if(brandColumn){
      const title=document.createElement('div');title.className='footer-title';title.dataset.socialLinks='';title.textContent='Follow NexusNova';brandColumn.appendChild(title);
      const links=document.createElement('div');links.className='footer-links';links.setAttribute('aria-label','Official NexusNova social profiles');
      socialProfiles.forEach(([platform,handle,href])=>{const link=document.createElement('a');link.href=href;link.target='_blank';link.rel='me noopener noreferrer';link.textContent=`${platform} · ${handle}`;links.appendChild(link)});
      brandColumn.appendChild(links);
    }
  }

  const iconArt={
    image:'<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="9" r="1.6"/><path d="m5.5 17 4.2-4.2 3.1 3.1 2.4-2.4 3.3 3.5"/>',
    pdf:'<path d="M6 2.8h7l5 5V21H6z"/><path d="M13 2.8V8h5"/><path d="M8.8 12.2h6.4M8.8 15.2h6.4M8.8 18.2h4.2"/>',
    qr:'<rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="3" width="6" height="6" rx="1"/><rect x="3" y="15" width="6" height="6" rx="1"/><path d="M15 15h2v2h-2zM19 15h2M19 19h2v2h-2zM15 19v2"/>',
    scan:'<path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"/><path d="M7 12h10M8 9h2M14 9h2M8 15h8"/>',
    calc:'<rect x="4" y="2.8" width="16" height="18.4" rx="3"/><path d="M7.5 6.3h9M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 18.5h.01M12 18.5h4"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
    text:'<path d="M5 5h14M12 5v14M8.5 19h7"/><path d="M4 9h3M17 9h3"/>',
    lock:'<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14.5v3"/>',
    privacy:'<path d="M12 3 5 6v5c0 4.8 3 8 7 10 4-2 7-5.2 7-10V6z"/><path d="m9 12 2 2 4-5"/>',
    chat:'<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h6"/>',
    globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9S14.5 18.4 12 21M12 3c-2.5 2.6-3.8 5.6-3.8 9S9.5 18.4 12 21"/>',
    gpu:'<rect x="5" y="5" width="14" height="14" rx="3"/><rect x="9" y="9" width="6" height="6" rx="1"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/>',
    seo:'<path d="M4 19V8M10 19V12M16 19V5"/><path d="m3 6 6-3 5 3 7-4"/><circle cx="19" cy="16" r="3"/><path d="m21 18 2 2"/>',
    paper:'<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v5h4M9 12h7M9 16h7"/>',
    money:'<circle cx="12" cy="12" r="9"/><path d="M15.2 8.8c-.8-.7-1.8-1-3-1-1.6 0-2.8.8-2.8 2s1 1.8 2.8 2.2 2.8 1 2.8 2.2-1.2 2-2.9 2c-1.2 0-2.3-.4-3.2-1.2M12 6.2v11.6"/>',
    calendar:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4M17 3v4M3 9h18M7 13h2M11 13h2M15 13h2M7 17h2M11 17h2"/>',
    convert:'<path d="M5 7h12l-3-3M19 17H7l3 3"/><path d="m17 4 3 3-3 3M7 14l-3 3 3 3"/>',
    database:'<ellipse cx="12" cy="5" rx="7.5" ry="3"/><path d="M4.5 5v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3V5M4.5 11v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-6"/>',
    dice:'<rect x="4" y="4" width="16" height="16" rx="4"/><circle cx="8" cy="8" r="1" fill="currentColor" stroke="none"/><circle cx="16" cy="8" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="8" cy="16" r="1" fill="currentColor" stroke="none"/><circle cx="16" cy="16" r="1" fill="currentColor" stroke="none"/>',
    resume:'<path d="M6 3h12v18H6z"/><circle cx="10" cy="9" r="2"/><path d="M7.8 14c.7-1.4 1.5-2 2.2-2s1.5.6 2.2 2M14 8h2M14 11h2M9 17h7"/>',
    ai:'<path d="m12 3 1.2 3.3L16.5 7.5l-3.3 1.2L12 12l-1.2-3.3-3.3-1.2 3.3-1.2zM18 13l.8 2.2L21 16l-2.2.8L18 19l-.8-2.2L15 16l2.2-.8zM6 14l.7 1.8 1.8.7-1.8.7L6 19l-.7-1.8-1.8-.7 1.8-.7z"/>',
    code:'<path d="m8.5 8-4 4 4 4M15.5 8l4 4-4 4M14 5l-4 14"/>',
    color:'<circle cx="8" cy="10" r="4"/><circle cx="16" cy="10" r="4"/><circle cx="12" cy="16" r="4"/>'
  };
  const iconSvg=kind=>`<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${iconArt[kind]||iconArt.code}</svg>`;
  const kindFor=el=>{
    const hay=[el.getAttribute?.('href')||'',el.id||'',el.querySelector?.('h1,h2,h3')?.textContent||'',el.textContent||''].join(' ').toLowerCase();
    if(/whatsapp|wa\.me|chat link/.test(hay)) return 'chat';
    if(/timezone|world time|meeting planner/.test(hay)) return 'globe';
    if(/vram|gpu|model memory/.test(hay)) return 'gpu';
    if(/metadata|exif|gps privacy/.test(hay)) return 'privacy';
    if(/ocr|image to text|scan text/.test(hay)) return 'scan';
    if(/meta tag|open graph|seo/.test(hay)) return 'seo';
    if(/paper size|dpi/.test(hay)) return 'paper';
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
  const symbolFor=el=>{const kind=kindFor(el);const span=document.createElement('span');span.className='nn-tool-symbol';span.dataset.kind=kind;span.setAttribute('aria-hidden','true');span.innerHTML=iconSvg(kind);return span};
  const decorateCard=el=>{if(el.dataset.nnSymbolic==='1')return;el.dataset.nnSymbolic='1';const kind=kindFor(el);const existing=el.matches('.trend-card')?el.querySelector(':scope > .trend-icon'):null;if(existing){existing.classList.add('nn-tool-symbol');existing.dataset.kind=kind;existing.setAttribute('aria-hidden','true');existing.innerHTML=iconSvg(kind);return}const symbol=symbolFor(el);const heading=el.querySelector(':scope > h1,:scope > h2,:scope > h3');el.insertBefore(symbol,heading||el.firstChild)};
  const decorateDock=()=>document.querySelectorAll('.command-dock a,.node').forEach(el=>{if(el.querySelector(':scope > .nn-tool-symbol'))return;el.insertBefore(symbolFor(el),el.firstChild)});
if(page==='index.html'){
  decorateDock();
  let homeDecorated=false;
  const decorateHome=()=>{if(homeDecorated)return;homeDecorated=true;document.querySelectorAll('.home-tool,.trend-card,.popular-card,.category-card').forEach(decorateCard)};
  ['pointerdown','keydown'].forEach(type=>window.addEventListener(type,decorateHome,{once:true,passive:true}));
  window.addEventListener('scroll',decorateHome,{once:true,passive:true});
}else{
  document.querySelectorAll('.home-tool,.tool-card,.trend-card,.popular-card,.category-card').forEach(decorateCard);
  decorateDock();
}
  const pageFile=(location.pathname.split('/').pop()||'').toLowerCase();
  const hubFiles=new Set(['','index.html','tools.html','popular-tools.html','trending-tools.html','smart-tools.html','gaming.html','developer-tools.html','guides.html','articles.html','tech.html','about.html','contact.html','privacy.html','terms.html','disclaimer.html','faq.html','tool-methodology.html','editorial-policy.html','editorial-team.html','app.html','register.html','account.html','404.html']);
  if(pageFile&&!hubFiles.has(pageFile)){const hero=document.querySelector('.page-hero .container');if(hero&&!hero.querySelector(':scope > .nn-tool-symbol')){const proxy=document.createElement('span');proxy.textContent=pageFile.replace(/[-.]/g,' ');proxy.setAttribute('href',pageFile);hero.insertBefore(symbolFor(proxy),hero.firstChild)}}

  const searchIndex=[
    ['photo-cctv-enhancer.html','Photo & CCTV Image Enhancer','photo old restore sharpen cctv clarity upscale'],
    ['image-metadata-remover.html','EXIF & GPS Metadata Remover','image photo privacy metadata exif gps remove'],
    ['image-to-text-ocr.html','Image to Text OCR','ocr screenshot scan image text extract copy'],
    ['qr-code-scanner.html','QR Code Scanner','qr scan decode screenshot image link'],
    ['meta-tag-generator.html','Meta Tag & Open Graph Generator','seo meta tags og open graph twitter social preview'],
    ['paper-size-converter.html','Paper Size & DPI Converter','a4 letter legal paper dpi pixels print'],
    ['whatsapp-link-generator.html','WhatsApp Link Generator','whatsapp wa me chat message business link'],
    ['timezone-meeting-planner.html','Timezone Meeting Planner','timezone world time meeting pakistan dubai london new york'],
    ['ai-vram-calculator.html','AI VRAM Calculator','ai gpu vram llm parameters memory quantization'],
    ['image-compressor.html','Image Compressor','compress jpg png webp image smaller'],
    ['image-resizer.html','Image Resizer','resize image width height pixels'],
    ['heic-to-jpg.html','HEIC to JPG','iphone heic heif jpg convert'],
    ['webp-to-jpg.html','WebP to JPG','webp jpg convert image'],
    ['webp-to-png.html','WebP to PNG','webp png transparency convert'],
    ['avif-to-jpg.html','AVIF to JPG','avif jpg convert image'],
    ['png-to-jpg.html','PNG to JPG','png jpg convert image'],
    ['jpg-to-png.html','JPG to PNG','jpg png convert image'],
    ['jpg-to-pdf.html','JPG to PDF','image jpg pdf document'],
    ['merge-pdf.html','Merge PDF','combine pdf files'],
    ['split-pdf.html','Split PDF','extract pdf pages'],
    ['text-to-pdf.html','Text to PDF','text document pdf'],
    ['qr-code-generator.html','QR Code Generator','qr create link text'],
    ['scientific-calculator.html','Scientific Calculator','math trig log calculator'],
    ['emi-calculator.html','EMI Calculator','loan payment interest emi'],
    ['bmi-calculator.html','BMI Calculator','body mass index height weight'],
    ['pomodoro-timer.html','Pomodoro Timer','focus work break productivity'],
    ['password-strength-checker.html','Password Strength Checker','password security strength'],
    ['unix-timestamp-converter.html','Unix Timestamp Converter','unix epoch date time developer'],
    ['resume-builder.html','Resume Builder','cv resume job career'],
    ['ai-prompt-builder.html','AI Prompt Builder','ai prompt generator writing'],
    ['gaming.html','Gaming Tools','gaming aim sensitivity edpi fps reaction minecraft steam settings'],
    ['gaming-sensitivity-converter.html','CS2 ↔ Valorant Sensitivity Converter','gaming cs2 valorant aim sensitivity convert mouse'],
    ['edpi-calculator.html','Gaming eDPI Calculator','gaming edpi dpi sensitivity aim mouse'],
    ['fps-frame-time-calculator.html','FPS & Frame Time Calculator','gaming fps frame time milliseconds performance'],
    ['reaction-time-test.html','Reaction Time Test','gaming reaction speed reflex test'],
    ['minecraft-coordinate-converter.html','Minecraft Nether Coordinate Converter','minecraft nether overworld coordinates convert'],
    ['steam-playtime-calculator.html','Steam Playtime Calculator','steam gaming playtime hours daily weekly monthly'],
    ['gaming-settings-notes.html','Gaming Settings & Crosshair Notes','gaming settings crosshair dpi sensitivity notes local'],
    ['gamer-name-generator.html','Gamer Name Generator','gaming gamer tag name generator ideas'],
    ['developer-tools.html','Developer Tools','json base64 uuid sha url developer'],
    ['articles.html','Practical Articles','articles guides learning'],
    ['tech.html','Tech & Security','passkeys security ai browser quantum tech'],
    ['guides.html','Guides','how to guide tutorial']
  ];
  const score=(q,item)=>{const words=q.toLowerCase().split(/\s+/).filter(Boolean),hay=(item[1]+' '+item[2]).toLowerCase();return words.reduce((n,w)=>n+(hay.includes(w)?1:0),0)};
  const toolSearch=document.querySelector('[data-tool-search]');
  if(toolSearch){const cards=[...document.querySelectorAll('[data-tool-card]')];const empty=document.querySelector('[data-no-results]');const apply=()=>{const q=toolSearch.value.trim().toLowerCase();let shown=0;cards.forEach(card=>{const match=!q||card.textContent.toLowerCase().includes(q);card.classList.toggle('hidden',!match);if(match)shown++});empty?.classList.toggle('show',shown===0)};toolSearch.addEventListener('input',apply);const q=new URLSearchParams(location.search).get('q');if(q){toolSearch.value=q;apply()}}
  const homeSearch=document.querySelector('[data-home-search]');
  if(homeSearch){
    const form=homeSearch.closest('form');const cards=[...document.querySelectorAll('[data-home-tool]')];
    const ensureSearchList=()=>{if(document.getElementById('nn-site-search-list'))return;const list=document.createElement('datalist');list.id='nn-site-search-list';searchIndex.forEach(item=>{const o=document.createElement('option');o.value=item[1];list.appendChild(o)});document.body.appendChild(list);homeSearch.setAttribute('list',list.id)};
  homeSearch.addEventListener('focus',ensureSearchList,{once:true});
    const filter=()=>{const q=homeSearch.value.trim().toLowerCase();cards.forEach(card=>card.classList.toggle('hidden',Boolean(q)&&!card.textContent.toLowerCase().includes(q)))};homeSearch.addEventListener('input',filter);
    form?.addEventListener('submit',e=>{e.preventDefault();const q=homeSearch.value.trim();if(!q)return;const ranked=searchIndex.map(item=>[score(q,item),item]).sort((a,b)=>b[0]-a[0]);if(ranked[0]?.[0]>0)location.href=ranked[0][1][0];else location.href=`trending-tools.html?q=${encodeURIComponent(q)}`});
  }
  const motionOkay=!matchMedia('(prefers-reduced-motion: reduce)').matches;const targets=[...document.querySelectorAll('.section,.home-tool,.article-card,.category-card,.tool-card,.guide-card,.bento-card,.article-main,.side-panel')];
  if(motionOkay&&'IntersectionObserver'in window){targets.forEach(el=>el.classList.add('nn-reveal'));const io=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('nn-visible');io.unobserve(entry.target)}})},{threshold:.06,rootMargin:'0px 0px -18px'});targets.forEach(el=>io.observe(el))}else targets.forEach(el=>el.classList.add('nn-visible'));
  if(!document.querySelector('script[data-nexusnova-auth-header]')){const m=document.createElement('script');m.type='module';m.src=`${base}assets/js/auth-header-state.js`;m.dataset.nexusnovaAuthHeader='';document.body.appendChild(m)}
const loadNovaAssistant=()=>{if(document.querySelector('script[data-nova-assistant]'))return;const s=document.createElement('script');s.src=`${base}assets/js/assistant.js`;s.defer=true;s.dataset.novaAssistant='';document.body.appendChild(s)};
if(page==='index.html'){['pointerdown','keydown'].forEach(type=>window.addEventListener(type,loadNovaAssistant,{once:true,passive:true}));window.addEventListener('scroll',loadNovaAssistant,{once:true,passive:true})}else loadNovaAssistant();
  if(document.querySelector('[data-article-comments]')&&!document.querySelector('script[data-nova-comments]')){const s=document.createElement('script');s.type='module';s.src=`${base}assets/js/comments.js`;s.dataset.novaComments='';document.body.appendChild(s)}
})();

(()=>{
  const addJsonLd=(id,data)=>{if(document.getElementById(id))return;const script=document.createElement('script');script.id=id;script.type='application/ld+json';script.textContent=JSON.stringify(data);document.head.appendChild(script)};
  const path=location.pathname;const absolute=url=>new URL(url,location.origin).href;const isHome=path==='/'||/\/index\.html$/.test(path);
  if(isHome){addJsonLd('nexusnova-organization-schema',{'@context':'https://schema.org','@type':'Organization',name:'NexusNova Tools',alternateName:'NexusNova',url:'https://nexusnovatools.com/',logo:'https://nexusnovatools.com/assets/nexusnova-logo-512.svg',description:'Free browser tools and practical guides for PDF, images, privacy, calculators, QR codes, AI and productivity.',sameAs:['https://x.com/NexusNovaTools','https://www.facebook.com/NexusNovaTools/','https://www.instagram.com/nexusnovatools/','https://t.me/NexusNovaTools','https://github.com/fahadsoomro123']})}
  const section=/\/(articles|tech)\/[^/]+\.html$/.exec(path)?.[1];
  if(section){
    const articleSchema=[...document.querySelectorAll('script[type="application/ld+json"]')].find(script=>{try{return JSON.parse(script.textContent||'{}')['@type']==='Article'}catch{return false}});
    if(articleSchema){try{const data=JSON.parse(articleSchema.textContent||'{}');data.author={...(data.author||{}),'@type':'Organization',name:'NexusNova Editorial Team',url:'https://nexusnovatools.com/editorial-team.html'};data.publisher={...(data.publisher||{}),'@type':'Organization',name:'NexusNova Tools',url:'https://nexusnovatools.com/',logo:{'@type':'ImageObject',url:'https://nexusnovatools.com/assets/nexusnova-logo-512.svg'}};articleSchema.textContent=JSON.stringify(data)}catch{}}
    const title=document.querySelector('.article-main h1,h1')?.textContent?.trim()||document.title;const hub=section==='tech'?'Tech & Security':'Articles';const hubFile=section==='tech'?'../tech.html':'../articles.html';
    addJsonLd('nexusnova-breadcrumb-schema',{'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'Home',item:absolute('../index.html')},{'@type':'ListItem',position:2,name:hub,item:absolute(hubFile)},{'@type':'ListItem',position:3,name:title,item:location.href.split('#')[0]}]});
    const meta=[...document.querySelectorAll('.article-meta span')].find(el=>el.textContent.trim()==='NexusNova Editorial Team');if(meta&&!meta.querySelector('a')){const link=document.createElement('a');link.href='../editorial-team.html';link.textContent='NexusNova Editorial Team';link.setAttribute('aria-label','About the NexusNova Editorial Team');meta.textContent='';meta.appendChild(link)}
  }
})();