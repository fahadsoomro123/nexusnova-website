(()=>{
  const path=(location.pathname||'/').replace(/\/$/,'')||'/';
  const isHome=path==='/'||path.toLowerCase().endsWith('/index.html');
  if(!isHome)return;

  const mountStyles=()=>{
    if(document.querySelector('link[data-nova-discoverability-style]'))return;
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='/assets/css/nova-discoverability.css?v=20260914-1';
    link.dataset.novaDiscoverabilityStyle='';
    document.head.appendChild(link);
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

  const mountFeature=()=>{
    const main=document.querySelector('main');
    const anchor=document.querySelector('#humanproof-overview');
    if(!main||!anchor||document.querySelector('[data-nova-discovery]'))return;
    const section=document.createElement('section');
    section.className='section nn-nova-discovery';
    section.dataset.novaDiscovery='';
    section.setAttribute('aria-labelledby','nova-discovery-title');
    section.innerHTML=`<div class="container"><div class="nn-nova-discovery-card"><div class="nn-nova-discovery-copy"><span class="nn-nova-discovery-kicker">NOVA INTELLIGENCE • FLAGSHIP DISCOVERY</span><h2 id="nova-discovery-title">Tell Nova what you need.</h2><p>It finds the right NexusNova capability, explains the next step, and routes you to the working tool instead of making you hunt through the library.</p><div class="nn-nova-discovery-actions"><a class="btn btn-primary" href="/nova-intelligence.html">Try Nova Intelligence →</a><a class="btn" href="/tools.html">Browse tools</a></div><p class="nn-nova-discovery-note">Product preview • deterministic local routing • no fake live results</p></div><div class="nn-nova-flow" aria-label="How Nova Intelligence works"><article class="nn-nova-flow-step"><span class="nn-nova-flow-num">01</span><h3>Understand</h3><p>Turn a natural-language request into a clear task the visitor can act on.</p></article><article class="nn-nova-flow-step"><span class="nn-nova-flow-num">02</span><h3>Route</h3><p>Match the request to a real NexusNova capability or show a transparent guided state.</p></article><article class="nn-nova-flow-step"><span class="nn-nova-flow-num">03</span><h3>Act</h3><p>Open the working tool so the next step is useful, direct, and verifiable.</p></article></div></div></div>`;
    main.insertBefore(section,anchor);
  };

  const mount=()=>{mountStyles();mountNav();mountFeature()};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
  else mount();
})();
