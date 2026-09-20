(()=>{
  'use strict';

  const measurementId='G-YLPFKWSS12';
  const consentKey='nexusnova_analytics_consent_v1';
  if(window.__nexusnovaGa4BootstrapReady)return;
  window.__nexusnovaGa4BootstrapReady=true;

  const inSubdir=/\/(guides|articles|tech)\//.test(location.pathname);
  const base=inSubdir?'../':'';

  /* Keep analytics completely outside the first render path. */
  window.dataLayer=window.dataLayer||[];
  window.gtag=window.gtag||function(){window.dataLayer.push(arguments)};
  if(!window.__nexusnovaConsentDefaulted){
    window.gtag('consent','default',{
      analytics_storage:'denied',
      ad_storage:'denied',
      ad_user_data:'denied',
      ad_personalization:'denied',
      wait_for_update:500
    });
    window.__nexusnovaConsentDefaulted=true;
  }

  let analyticsLoaded=false;
  const readChoice=()=>{try{return localStorage.getItem(consentKey)||''}catch(_){return ''}};
  const updateConsent=granted=>window.gtag('consent','update',granted?{
    analytics_storage:'granted',
    ad_storage:'denied',
    ad_user_data:'denied',
    ad_personalization:'denied'
  }:{
    analytics_storage:'denied',
    ad_storage:'denied',
    ad_user_data:'denied',
    ad_personalization:'denied'
  });

  const loadAnalytics=(granted=false)=>{
    updateConsent(granted);
    if(analyticsLoaded||document.querySelector('script[data-nexusnova-ga4]'))return;
    analyticsLoaded=true;
    window.gtag('js',new Date());
    const analyticsScript=document.createElement('script');
    analyticsScript.async=true;
    analyticsScript.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(measurementId);
    analyticsScript.dataset.nexusnovaGa4='';
    analyticsScript.onload=()=>window.gtag('config',measurementId,{
      send_page_view:true,
      allow_google_signals:false,
      allow_ad_personalization_signals:false
    });
    document.head.appendChild(analyticsScript);
  };

  window.__nexusnovaLoadAnalytics=loadAnalytics;
  window.__nexusnovaConsentKey=consentKey;

  const loadShell=()=>{
    if(document.querySelector('script[data-nexusnova-site-shell]'))return;
    const shell=document.createElement('script');
    shell.defer=true;
    shell.src=base+'assets/js/site-main.js?v=20260920-nav4';
    shell.dataset.nexusnovaSiteShell='';
    document.head.appendChild(shell);
  };

  /* Give the browser two animation frames for the first paint before shell work. */
  if('requestAnimationFrame' in window){
    requestAnimationFrame(()=>requestAnimationFrame(loadShell));
  }else{
    window.setTimeout(loadShell,0);
  }

  const onIntent=()=>{
    const choice=readChoice();
    loadAnalytics(choice==='granted');
  };
  ['pointerdown','keydown','touchstart','scroll'].forEach(type=>{
    window.addEventListener(type,onIntent,{once:true,passive:true});
  });

  window.addEventListener('load',()=>{
    window.setTimeout(()=>{
      const choice=readChoice();
      if(choice==='granted'||choice==='denied')loadAnalytics(choice==='granted');
    },15000);
  },{once:true});
})();
