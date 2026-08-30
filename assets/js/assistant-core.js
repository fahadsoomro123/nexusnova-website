(()=>{
  'use strict';
  if(window.__nexusNovaWebAssistant)return;
  window.__nexusNovaWebAssistant=true;

  const path=location.pathname;
  const inSubdir=/\/(guides|articles|tech)\//.test(path);
  const base=inSubdir?'../':'';
  const page=(path.split('/').pop()||'index.html').toLowerCase();
  const isHome=page==='index.html'&&(path==='/'||/\/index\.html$/.test(path));
  const gamingFiles=new Set(['gaming.html','gaming-sensitivity-converter.html','edpi-calculator.html','fps-frame-time-calculator.html','reaction-time-test.html','gamer-name-generator.html','minecraft-coordinate-converter.html','gaming-settings-notes.html','steam-playtime-calculator.html']);

  const style=document.createElement('style');
  style.id='nexusnova-phase2-ui';
  style.textContent='.breadcrumbs{display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin:0 0 18px;color:var(--muted);font-size:13px;font-weight:750}.breadcrumbs a{color:var(--accent)}.breadcrumbs span[aria-current="page"]{color:var(--text)}';
  if(!document.getElementById(style.id))document.head.appendChild(style);

  /* main.js rebuilds the nav; restore Gaming in the shared navigation. */
  const nav=document.querySelector('[data-nav]');
  if(nav&&!nav.querySelector('a[href$="gaming.html"]')){
    const link=document.createElement('a');
    link.href=`${base}gaming.html`;
    link.textContent='Gaming';
    if(gamingFiles.has(page))link.setAttribute('aria-current','page');
    const trending=[...nav.querySelectorAll('a')].find(a=>a.getAttribute('href')?.endsWith('trending-tools.html'));
    if(trending)trending.after(link);else nav.appendChild(link);
  }

  const schemaScripts=()=>[...document.querySelectorAll('script[type="application/ld+json"]')];
  const hasSchemaType=type=>schemaScripts().some(s=>{try{const d=JSON.parse(s.textContent||'{}');return d['@type']===type||d['@graph']?.some(x=>x?.['@type']===type)}catch{return false}});
  const addSchema=(id,data)=>{if(document.getElementById(id))return;const s=document.createElement('script');s.id=id;s.type='application/ld+json';s.textContent=JSON.stringify(data);document.head.appendChild(s)};
  const hubFiles=new Set(['','index.html','tools.html','popular-tools.html','trending-tools.html','smart-tools.html','gaming.html','developer-tools.html','guides.html','articles.html','tech.html','about.html','contact.html','privacy.html','terms.html','disclaimer.html','faq.html','tool-methodology.html','editorial-policy.html','editorial-team.html','app.html','register.html','account.html','404.html']);

  /* SEO safety net for older root-level tool pages. */
  if(!inSubdir&&page&&!hubFiles.has(page)){
    const hero=document.querySelector('.page-hero .container');
    const title=document.querySelector('h1')?.textContent?.trim()||document.title.split('|')[0].trim();
    const gaming=gamingFiles.has(page);
    const hubName=gaming?'Gaming Tools':'Tools';
    const hubHref=gaming?'gaming.html':'trending-tools.html';
    if(hero&&!hero.querySelector('.breadcrumbs')){
      const crumbs=document.createElement('nav');
      crumbs.className='breadcrumbs';crumbs.setAttribute('aria-label','Breadcrumb');
      crumbs.innerHTML=`<a href="index.html">Home</a><span>›</span><a href="${hubHref}">${hubName}</a><span>›</span><span aria-current="page"></span>`;
      crumbs.querySelector('[aria-current="page"]').textContent=title;
      hero.insertBefore(crumbs,hero.firstChild);
    }
    if(!hasSchemaType('BreadcrumbList'))addSchema('nexusnova-tool-breadcrumb-schema',{'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'Home',item:'https://nexusnovatools.com/'},{'@type':'ListItem',position:2,name:hubName,item:`https://nexusnovatools.com/${hubHref}`},{'@type':'ListItem',position:3,name:title,item:location.href.split('#')[0]}]});
    if(!hasSchemaType('WebApplication')){
      const canonical=document.querySelector('link[rel="canonical"]')?.href||location.href.split('#')[0];
      const desc=document.querySelector('meta[name="description"]')?.content||'';
      addSchema('nexusnova-tool-app-schema',{'@context':'https://schema.org','@type':'WebApplication',name:title,url:canonical,applicationCategory:'UtilitiesApplication',operatingSystem:'Any',isAccessibleForFree:true,description:desc});
    }
  }

  const card=(href,tag,title,desc)=>`<a class="article-card" href="${href}"><span class="tag">${tag}</span><h3>${title}</h3><p>${desc}</p><span class="card-link">Open tool →</span></a>`;

  /* Curated homepage block: useful selection, not a fake live popularity counter. */
  if(isHome&&!document.getElementById('popular-right-now')){
    const section=document.createElement('section');
    section.className='section';section.id='popular-right-now';
    section.innerHTML=`<div class="container"><div class="section-head"><div><span class="kicker">POPULAR RIGHT NOW</span><h2>Useful picks worth opening.</h2></div><p>A hand-picked mix of new and repeat-use tools. No fake live counters.</p></div><div class="article-grid">${card('gaming-sensitivity-converter.html','GAMING','CS2 ↔ Valorant Sensitivity','Convert competitive-shooter sensitivity in either direction.')}${card('edpi-calculator.html','GAMING','eDPI Calculator','Compare mouse DPI and in-game sensitivity.')}${card('reaction-time-test.html','GAMING','Reaction Time Test','Test simple visual reaction time in your browser.')}${card('percentage-calculator.html','CALCULATOR','Percentage Calculator','Solve common percentage calculations on a focused page.')}${card('image-compressor.html','IMAGE','Image Compressor','Reduce JPG, PNG and WebP file size locally.')}${card('image-to-text-ocr.html','OCR','Image to Text OCR','Extract copyable text from screenshots and scans.')}${card('heic-to-jpg.html','IMAGE','HEIC to JPG','Convert iPhone HEIC photos to compatible JPG.')}${card('merge-pdf.html','PDF','Merge PDF','Combine multiple PDFs into one file.')}</div></div>`;
    const anchor=document.querySelector('[data-popular-banner]');
    if(anchor)anchor.before(section);else document.querySelector('main')?.appendChild(section);
  }

  /* Give high-intent daily tasks their own discoverable URLs while keeping the all-in-one page. */
  if(page==='tools.html'&&!document.getElementById('dedicated-daily-pages')){
    const section=document.createElement('section');
    section.className='section';section.id='dedicated-daily-pages';
    section.innerHTML=`<div class="container"><div class="section-head"><div><span class="kicker">FOCUSED DAILY PAGES</span><h2>Popular daily tools now have dedicated pages.</h2></div><p>The all-in-one tools below still work; these focused URLs are easier to bookmark, share and find in search.</p></div><div class="article-grid">${card('percentage-calculator.html','MATH','Percentage Calculator','Percentage of a number, percent-of and percentage change.')}${card('age-calculator.html','DATES','Age Calculator','Calculate exact calendar age in years, months and days.')}${card('date-difference-calculator.html','DATES','Date Difference','Count days and weeks between two dates.')}${card('unit-converter.html','CONVERT','Unit Converter','Convert common length, weight and temperature units.')}${card('word-counter.html','TEXT','Word & Character Counter','Live words, characters, lines and reading time.')}${card('discount-calculator.html','MONEY','Discount Calculator','Find final sale price, savings and stacked discounts.')}</div></div>`;
    document.querySelector('main')?.appendChild(section);
  }

  /* Let homepage search understand the new dedicated pages before main.js fallback handles other queries. */
  const homeForm=document.querySelector('.home-search');
  if(isHome&&homeForm){
    const aliases=[
      [/percentage|percent/, 'percentage-calculator.html'],[/\bage\b|date of birth/, 'age-calculator.html'],[/date difference|days between/, 'date-difference-calculator.html'],[/unit convert|length convert|weight convert|temperature convert/, 'unit-converter.html'],[/word count|character count/, 'word-counter.html'],[/discount|sale price|savings/, 'discount-calculator.html'],[/reaction/, 'reaction-time-test.html'],[/frame time|\bfps\b/, 'fps-frame-time-calculator.html'],[/minecraft|nether coordinate/, 'minecraft-coordinate-converter.html'],[/steam playtime|game hours/, 'steam-playtime-calculator.html'],[/gamer name|gamertag|nickname/, 'gamer-name-generator.html'],[/gaming settings|crosshair notes/, 'gaming-settings-notes.html']
    ];
    homeForm.addEventListener('submit',e=>{const q=homeForm.querySelector('[data-home-search]')?.value?.trim().toLowerCase()||'';const hit=aliases.find(([re])=>re.test(q));if(hit){e.preventDefault();e.stopImmediatePropagation();location.href=hit[1]}},true);
  }

  const tools=[
    {keys:['percentage calculator','percent of','percentage change'],name:'Percentage Calculator',href:'percentage-calculator.html',desc:'Calculate percentages and percentage change.'},
    {keys:['age calculator','calculate age','date of birth'],name:'Age Calculator',href:'age-calculator.html',desc:'Calculate exact age in years, months and days.'},
    {keys:['date difference','days between dates'],name:'Date Difference Calculator',href:'date-difference-calculator.html',desc:'Count days and weeks between dates.'},
    {keys:['unit converter','convert units','length converter','weight converter','temperature converter'],name:'Unit Converter',href:'unit-converter.html',desc:'Convert common length, weight and temperature units.'},
    {keys:['word counter','character counter','count words'],name:'Word & Character Counter',href:'word-counter.html',desc:'Count words, characters, lines and reading time.'},
    {keys:['discount calculator','sale price','savings calculator'],name:'Discount Calculator',href:'discount-calculator.html',desc:'Calculate final sale price and savings.'},
    {keys:['cs2 valorant','sensitivity converter','valorant sensitivity','cs2 sensitivity'],name:'CS2 ↔ Valorant Sensitivity Converter',href:'gaming-sensitivity-converter.html',desc:'Convert aim sensitivity between CS2 and Valorant.'},
    {keys:['edpi','effective dpi','dpi sensitivity'],name:'Gaming eDPI Calculator',href:'edpi-calculator.html',desc:'Calculate DPI × in-game sensitivity.'},
    {keys:['fps frame time','frame time','milliseconds per frame'],name:'FPS & Frame Time Calculator',href:'fps-frame-time-calculator.html',desc:'Convert FPS to milliseconds per frame and back.'},
    {keys:['reaction time','reaction test','click reaction'],name:'Reaction Time Test',href:'reaction-time-test.html',desc:'Run a simple browser reaction-time test.'},
    {keys:['minecraft nether','minecraft coordinates','nether coordinates'],name:'Minecraft Nether Coordinate Converter',href:'minecraft-coordinate-converter.html',desc:'Convert Overworld and Nether X/Z coordinates.'},
    {keys:['steam playtime','playtime calculator','game hours'],name:'Steam Playtime Calculator',href:'steam-playtime-calculator.html',desc:'Turn total playtime into daily and weekly averages.'},
    {keys:['gaming settings','crosshair notes','save sensitivity','game settings notes'],name:'Gaming Settings Notes',href:'gaming-settings-notes.html',desc:'Save DPI, sensitivity, resolution and config notes locally.'},
    {keys:['gamer name','gamertag','gaming name','nickname generator'],name:'Gamer Name Generator',href:'gamer-name-generator.html',desc:'Generate random gamer-tag ideas.'},
    {keys:['compress image','compress photo','reduce image','smaller image','image size','photo size'],name:'Image Compressor',href:'image-compressor.html',desc:'Compress JPG, PNG or WebP in your browser.'},
    {keys:['resize image','resize photo','pixels','dimensions'],name:'Image Resizer',href:'image-resizer.html',desc:'Resize an image to exact pixel dimensions.'},
    {keys:['merge pdf','combine pdf','join pdf'],name:'Merge PDF',href:'merge-pdf.html',desc:'Combine multiple PDF files.'},
    {keys:['split pdf','extract pdf','separate pdf'],name:'Split PDF',href:'split-pdf.html',desc:'Split or extract PDF pages.'},
    {keys:['jpg to pdf','image to pdf','photo to pdf'],name:'JPG to PDF',href:'jpg-to-pdf.html',desc:'Turn images into a PDF.'},
    {keys:['qr','qr code'],name:'QR Code Generator',href:'qr-code-generator.html',desc:'Create a QR code for a URL or text.'},
    {keys:['emi','loan','installment','instalment'],name:'EMI Calculator',href:'emi-calculator.html',desc:'Estimate monthly loan installments.'},
    {keys:['bmi','body mass'],name:'BMI Calculator',href:'bmi-calculator.html',desc:'Calculate BMI from height and weight.'},
    {keys:['scientific','sin','cos','tan','logarithm','log ','square root'],name:'Scientific Calculator',href:'scientific-calculator.html',desc:'Use scientific math functions.'},
    {keys:['resume','cv','curriculum vitae'],name:'Resume Builder',href:'resume-builder.html',desc:'Build a clean resume in the browser.'},
    {keys:['pomodoro','focus timer','study timer'],name:'Pomodoro Timer',href:'pomodoro-timer.html',desc:'Run focused work and break sessions.'},
    {keys:['password strength','strong password','password check'],name:'Password Strength Checker',href:'password-strength-checker.html',desc:'Check password strength locally.'},
    {keys:['ai prompt','prompt builder','chatgpt prompt','gemini prompt'],name:'AI Prompt Builder',href:'ai-prompt-builder.html',desc:'Structure a clearer prompt for AI tools.'},
    {keys:['png to jpg'],name:'PNG to JPG',href:'png-to-jpg.html',desc:'Convert PNG images to JPG.'},
    {keys:['jpg to png'],name:'JPG to PNG',href:'jpg-to-png.html',desc:'Convert JPG images to PNG.'},
    {keys:['webp to jpg'],name:'WebP to JPG',href:'webp-to-jpg.html',desc:'Convert WebP images to JPG.'},
    {keys:['timestamp','unix time'],name:'Unix Timestamp Converter',href:'unix-timestamp-converter.html',desc:'Convert Unix timestamps and dates.'},
    {keys:['roman numeral'],name:'Roman Numeral Converter',href:'roman-numeral-converter.html',desc:'Convert numbers and Roman numerals.'},
    {keys:['color','hex','rgb'],name:'RGB / HEX Converter',href:'rgb-hex-converter.html',desc:'Convert RGB and HEX color values.'}
  ];

  const button=document.createElement('button');button.type='button';button.className='nova-assistant-button';button.textContent='Ask NOVA';button.setAttribute('aria-label','Open NOVA smart tool assistant');
  const panel=document.createElement('section');panel.className='nova-assistant-panel';panel.setAttribute('aria-label','NOVA smart tool assistant');panel.innerHTML=`<div class="nova-assistant-head"><div><strong>NOVA Assistant</strong><small>SMART TOOL FINDER</small></div><button class="nova-assistant-close" type="button" aria-label="Close">×</button></div><div class="nova-assistant-body" aria-live="polite"><div class="nova-msg">Tell me what you need to do — for example “calculate my age”, “convert CS2 sensitivity”, “compress my image” or “merge PDFs”. I’ll take you to the right NexusNova tool.</div></div><form class="nova-assistant-form"><input maxlength="160" autocomplete="off" aria-label="Ask NOVA" placeholder="What do you need?"><button type="submit" aria-label="Send">→</button></form>`;
  document.body.append(panel,button);
  const body=panel.querySelector('.nova-assistant-body');const input=panel.querySelector('input');
  const close=()=>{panel.classList.remove('open');button.setAttribute('aria-expanded','false')};
  const open=()=>{panel.classList.add('open');button.setAttribute('aria-expanded','true');setTimeout(()=>input.focus(),50)};
  button.addEventListener('click',()=>panel.classList.contains('open')?close():open());
  panel.querySelector('.nova-assistant-close').addEventListener('click',close);
  const add=(html,user=false)=>{const msg=document.createElement('div');msg.className=`nova-msg${user?' user':''}`;if(user)msg.textContent=html;else msg.innerHTML=html;body.appendChild(msg);body.scrollTop=body.scrollHeight};
  const findTool=text=>{const q=text.toLowerCase().replace(/\s+/g,' ').trim();return tools.map(tool=>({tool,score:tool.keys.reduce((n,key)=>n+(q.includes(key)?key.length:0),0)})).sort((a,b)=>b.score-a.score)[0]};
  panel.querySelector('form').addEventListener('submit',e=>{e.preventDefault();const text=input.value.trim();if(!text)return;add(text,true);input.value='';const match=findTool(text);if(match?.score>0){const {tool}=match;add(`<strong>${tool.name}</strong><br>${tool.desc}<br><a href="${base}${tool.href}">Open ${tool.name} →</a>`);try{window.gtag?.('event','assistant_tool_match',{tool_name:tool.name})}catch{}}else add(`I couldn't match that exactly. Try gaming, PDF, image, calculator, QR, resume, password or productivity. <a href="${base}trending-tools.html">Browse all tools →</a>`)});
})();
