(()=>{
  const path=(location.pathname||'/').replace(/\/$/,'')||'/';
  const isHome=path==='/'||path.toLowerCase().endsWith('/index.html');
  if(!isHome)return;

  const mountStyles=()=>{
    if(!document.querySelector('link[data-nova-discoverability-style]')){
      const link=document.createElement('link');
      link.rel='stylesheet';
      link.href='/assets/css/nova-discoverability.css?v=20260914-1';
      link.dataset.novaDiscoverabilityStyle='';
      document.head.appendChild(link);
    }
    if(!document.querySelector('link[data-nova-responsive-fix]')){
      const link=document.createElement('link');
      link.rel='stylesheet';
      link.href='/assets/css/nova-discoverability-responsive-fix.css?v=20260914-1';
      link.dataset.novaResponsiveFix='';
      document.head.appendChild(link);
    }
  };

  const mountNav=()=>{
    const nav=document.querySelector('[data-nav]');
    if(!nav||nav.querySelector('[data-nova-intelligence-nav]'))return;
    const link=document.createElement('a');
    link.href='/nova-intelligence.html';
    link.textContent='Nova Intelligence';
    link.className='nn-nav-nova';
    link.dataset.novaIntelligenceNav='';
    link.setAttribute('aria-label','Nova Intelligence — tell Nova what you need');
    nav.insertBefore(link,nav.querySelector('.nn-nav-auth')||null);
  };

  // Bind the mobile menu immediately on the homepage. The canonical site shell is
  // intentionally lazy-loaded for performance, so the menu must remain usable
  // during the short period before site-main.js arrives.
  const mountMenuBridge=()=>{
    const nav=document.querySelector('[data-nav]');
    const button=document.querySelector('[data-menu-btn]');
    if(!nav||!button||button.dataset.novaMenuBridgeBound==='1')return;
    const close=()=>{
      nav.classList.remove('open');
      button.setAttribute('aria-expanded','false');
    };
    button.addEventListener('click',event=>{
      const open=nav.classList.toggle('open');
      button.setAttribute('aria-expanded',String(open));
      event.stopImmediatePropagation();
    });
    nav.addEventListener('click',event=>{
      if(event.target.closest('a'))close();
    });
    window.addEventListener('resize',()=>{
      if(window.innerWidth>720)close();
    });
    button.dataset.novaMenuBridgeBound='1';
  };

  const mount=()=>{mountStyles();mountNav();mountMenuBridge()};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
  else mount();
})();
