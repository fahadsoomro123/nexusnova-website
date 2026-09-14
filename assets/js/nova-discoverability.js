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

  const mount=()=>{mountStyles();mountNav()};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
  else mount();
})();
