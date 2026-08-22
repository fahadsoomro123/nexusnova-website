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
  const styles=[['scifi',`${base}assets/css/scifi.css`],['motion',`${base}assets/css/motion.css`]];
  styles.forEach(([key,href])=>{
    if(document.querySelector(`link[data-nexusnova-${key}]`)) return;
    const link=document.createElement('link');
    link.rel='stylesheet';link.href=href;link.dataset[`nexusnova${key[0].toUpperCase()}${key.slice(1)}`]='';document.head.appendChild(link);
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
  const toolSearch=document.querySelector('[data-tool-search]');
  if(toolSearch){const cards=[...document.querySelectorAll('[data-tool-card]')];const empty=document.querySelector('[data-no-results]');const apply=()=>{const q=toolSearch.value.trim().toLowerCase();let shown=0;cards.forEach(card=>{const match=!q||card.textContent.toLowerCase().includes(q);card.classList.toggle('hidden',!match);if(match)shown++});empty?.classList.toggle('show',shown===0)};toolSearch.addEventListener('input',apply);const q=new URLSearchParams(location.search).get('q');if(q){toolSearch.value=q;apply()}}
  const homeSearch=document.querySelector('[data-home-search]');
  if(homeSearch){const form=homeSearch.closest('form');const cards=[...document.querySelectorAll('[data-home-tool]')];const filter=()=>{const q=homeSearch.value.trim().toLowerCase();cards.forEach(card=>card.classList.toggle('hidden',Boolean(q)&&!card.textContent.toLowerCase().includes(q)))};homeSearch.addEventListener('input',filter);form?.addEventListener('submit',e=>{e.preventDefault();const q=homeSearch.value.trim();const first=cards.find(card=>!card.classList.contains('hidden'));if(first?.href)location.href=first.href;else location.href=`trending-tools.html?q=${encodeURIComponent(q)}`})}
  const motionOkay=!matchMedia('(prefers-reduced-motion: reduce)').matches;const targets=[...document.querySelectorAll('.section,.home-tool,.article-card,.category-card,.tool-card,.guide-card,.bento-card,.article-main,.side-panel')];
  if(motionOkay&&'IntersectionObserver'in window){targets.forEach(el=>el.classList.add('nn-reveal'));const io=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('nn-visible');io.unobserve(entry.target)}})},{threshold:.06,rootMargin:'0px 0px -18px'});targets.forEach(el=>io.observe(el))}else targets.forEach(el=>el.classList.add('nn-visible'));
  if(!document.querySelector('script[data-nova-assistant]')){const s=document.createElement('script');s.src=`${base}assets/js/assistant.js`;s.defer=true;s.dataset.novaAssistant='';document.body.appendChild(s)}
  if(document.querySelector('[data-article-comments]')&&!document.querySelector('script[data-nova-comments]')){const s=document.createElement('script');s.type='module';s.src=`${base}assets/js/comments.js`;s.dataset.novaComments='';document.body.appendChild(s)}
})();
