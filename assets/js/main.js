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
  const inGuides=location.pathname.includes('/guides/');
  const base=inGuides?'../':'';
  const styles=[
    ['scifi',`${base}assets/css/scifi.css`],
    ['motion',`${base}assets/css/motion.css`]
  ];
  styles.forEach(([key,href])=>{
    if(document.querySelector(`link[data-nexusnova-${key}]`)) return;
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href=href;
    link.dataset[`nexusnova${key[0].toUpperCase()}${key.slice(1)}`]='';
    document.head.appendChild(link);
  });
  document.documentElement.classList.add('nexusnova-scifi');
})();

(()=>{
  const year=document.querySelector('[data-year]');
  if(year) year.textContent=String(new Date().getFullYear());

  const header=document.querySelector('[data-header]');
  const updateHeader=()=>header?.classList.toggle('scrolled',window.scrollY>8);
  updateHeader();
  window.addEventListener('scroll',updateHeader,{passive:true});

  const pathParts=location.pathname.split('/').filter(Boolean);
  const path=pathParts[pathParts.length-1]||'index.html';
  const inGuides=location.pathname.includes('/guides/');
  const base=inGuides?'../':'';
  const button=document.querySelector('[data-menu-btn]');
  const nav=document.querySelector('[data-nav]');

  if(nav){
    const popularHref=`${base}popular-tools.html`;
    if(!nav.querySelector(`a[href="${popularHref}"]`)){
      const daily=nav.querySelector(`a[href="${base}tools.html"]`);
      const link=document.createElement('a');
      link.href=popularHref;
      link.textContent='Popular Tools';
      if(daily) daily.insertAdjacentElement('afterend',link);
      else nav.appendChild(link);
    }

    const trendingHref=`${base}trending-tools.html`;
    if(!nav.querySelector(`a[href="${trendingHref}"]`)){
      const popular=nav.querySelector(`a[href="${popularHref}"]`);
      const link=document.createElement('a');
      link.href=trendingHref;
      link.textContent='Trending';
      if(popular) popular.insertAdjacentElement('afterend',link);
      else nav.appendChild(link);
    }

    const accountHref=`${base}register.html`;
    if(!nav.querySelector(`a[href="${accountHref}"]`)&&!nav.querySelector(`a[href="${base}account.html"]`)){
      const link=document.createElement('a');
      link.href=accountHref;
      link.textContent='Account';
      const contact=nav.querySelector(`a[href="${base}contact.html"]`);
      if(contact) contact.insertAdjacentElement('beforebegin',link);
      else nav.appendChild(link);
    }
  }

  if(button&&nav){
    const closeMenu=()=>{nav.classList.remove('open');button.setAttribute('aria-expanded','false')};
    button.addEventListener('click',()=>{const isOpen=nav.classList.toggle('open');button.setAttribute('aria-expanded',String(isOpen))});
    nav.addEventListener('click',event=>{if(event.target.closest('a'))closeMenu()});
    window.addEventListener('resize',()=>{if(window.innerWidth>720)closeMenu()});
  }

  if(path==='index.html'&&!document.querySelector('[data-trending-banner]')){
    const anchor=document.querySelector('[data-popular-banner]');
    if(anchor){
      const section=document.createElement('section');
      section.className='section nn-section';
      section.dataset.trendingBanner='';
      section.innerHTML=`<div class="container">
        <div class="section-rail"><span>02</span><i></i><small>SEARCH-LED EXPANSION</small></div>
        <div class="section-head nn-head"><div><span class="kicker">20 NEW BROWSER TOOLS</span><h2>More useful reasons to come back.</h2></div><p>QR codes, scientific and finance calculators, timers, image conversion, PDF workflows and developer-friendly converters — each with a focused page and clear purpose.</p></div>
        <div class="bento-grid">
          <a class="bento-card bento-wide" href="qr-code-generator.html"><span class="bento-code">WEB://QR</span><div class="bento-icon">⌗</div><div><h3>QR Code Generator</h3><p>Create QR codes for links and text.</p></div><strong>OPEN ↗</strong></a>
          <a class="bento-card" href="scientific-calculator.html"><span class="bento-code">CALC://SCI</span><div class="bento-icon">∑</div><div><h3>Scientific Calculator</h3><p>Trig, logs, roots and powers.</p></div><strong>OPEN ↗</strong></a>
          <a class="bento-card" href="merge-pdf.html"><span class="bento-code">PDF://MERGE</span><div class="bento-icon">▤</div><div><h3>Merge PDF</h3><p>Combine PDF files in your browser.</p></div><strong>OPEN ↗</strong></a>
          <a class="bento-card" href="image-resizer.html"><span class="bento-code">IMG://SIZE</span><div class="bento-icon">▣</div><div><h3>Image Resizer</h3><p>Resize images to exact pixel dimensions.</p></div><strong>OPEN ↗</strong></a>
          <a class="bento-card bento-wide bento-accent" href="trending-tools.html"><span class="bento-code">GRID://20</span><div class="bento-icon">⌁</div><div><h3>Explore 20 New Tools</h3><p>Browse the full search-led utility grid.</p></div><strong>EXPLORE ALL ↗</strong></a>
        </div>
      </div>`;
      anchor.insertAdjacentElement('afterend',section);
    }
  }

  if(path==='tools.html'&&!document.querySelector('[data-popular-tools-notice]')){
    const search=document.querySelector('.search-tools');
    if(search){
      const note=document.createElement('div');
      note.className='notice';
      note.dataset.popularToolsNotice='';
      note.style.marginBottom='18px';
      note.innerHTML=`<strong>Need image, PDF, QR or specialist tools?</strong> <a href="trending-tools.html" style="color:var(--accent);font-weight:800">Open Trending Tools →</a>`;
      search.insertAdjacentElement('beforebegin',note);
    }
  }

  const toolSearch=document.querySelector('[data-tool-search]');
  if(toolSearch){
    const cards=[...document.querySelectorAll('[data-tool-card]')];
    const empty=document.querySelector('[data-no-results]');
    toolSearch.addEventListener('input',()=>{
      const q=toolSearch.value.trim().toLowerCase();
      let shown=0;
      cards.forEach(card=>{const match=!q||card.textContent.toLowerCase().includes(q);card.classList.toggle('hidden',!match);card.style.display=match?'':'none';if(match)shown+=1});
      if(empty) empty.style.display=shown===0?'block':'none';
    });
  }

  const motionOkay=!window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealTargets=[...document.querySelectorAll('.section,.trend-card,.trend-workspace,.trend-info-card,.bento-card,.system-panel,.metric-grid article,.cta,.final-terminal')];
  if(motionOkay&&'IntersectionObserver' in window){
    revealTargets.forEach(el=>el.classList.add('nn-reveal'));
    const observer=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('nn-visible');observer.unobserve(entry.target)}})},{threshold:.08,rootMargin:'0px 0px -35px 0px'});
    revealTargets.forEach(el=>observer.observe(el));
  }else revealTargets.forEach(el=>el.classList.add('nn-visible'));
})();
