(()=>{
  'use strict';
  const measurementId='G-YLPFKWSS12';
  const consentKey='nexusnova_analytics_consent_v1';
  if(window.__nexusnovaConsentReady)return;
  window.__nexusnovaConsentReady=true;
  window.dataLayer=window.dataLayer||[];
  window.gtag=window.gtag||function(){window.dataLayer.push(arguments)};
  window.gtag('consent','default',{
    analytics_storage:'denied',
    ad_storage:'denied',
    ad_user_data:'denied',
    ad_personalization:'denied',
    wait_for_update:500
  });
  const readChoice=()=>{try{return localStorage.getItem(consentKey)||''}catch(_){return ''}};
  let analyticsLoaded=false;
  const loadAnalytics=(granted=true)=>{
    if(!granted||analyticsLoaded||document.querySelector('script[data-nexusnova-ga4]'))return;
    analyticsLoaded=true;
    window.gtag('consent','update',{
      analytics_storage:'granted',
      ad_storage:'denied',
      ad_user_data:'denied',
      ad_personalization:'denied'
    });
    window.gtag('config',measurementId,{send_page_view:true,allow_google_signals:false,allow_ad_personalization_signals:false});
    window.gtag('js',new Date());
    const script=document.createElement('script');
    script.async=true;
    script.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(measurementId);
    script.dataset.nexusnovaGa4='';
    document.head.appendChild(script);
  };
  const denyAnalytics=()=>window.gtag('consent','update',{
    analytics_storage:'denied',
    ad_storage:'denied',
    ad_user_data:'denied',
    ad_personalization:'denied'
  });
  const autoEnable=()=>{try{return Intl.DateTimeFormat().resolvedOptions().timeZone==='Asia/Karachi'||new Date().getTimezoneOffset()===-300}catch(_){return new Date().getTimezoneOffset()===-300}};
  window.__nexusnovaLoadAnalytics=granted=>loadAnalytics(Boolean(granted));
  const enable=()=>{
    const choice=readChoice();
    if(choice==='granted')loadAnalytics(true);
    else if(choice==='denied')denyAnalytics();
    else if(autoEnable()){
      window.__nexusnovaAnalyticsAutoEnabled=true;
      try{window.dispatchEvent(new Event('nexusnova-analytics-auto-enabled'))}catch(_){ }
      loadAnalytics(true);
    }
  };
  ['pointerdown','keydown'].forEach(type=>window.addEventListener(type,enable,{once:true,passive:true}));
  const deferred=()=>{const arm=()=>window.setTimeout(enable,5000);if('requestIdleCallback' in window)window.requestIdleCallback(arm,{timeout:2000});else arm();};
  if(document.readyState==='loading')window.addEventListener('load',deferred,{once:true});
  else deferred();

  const inSubdir=/\/(guides|articles|tech)\//.test(location.pathname);
  const base=inSubdir?'../':'';
  const loadShell=()=>{
    if(document.querySelector('script[data-nexusnova-site-shell]'))return;
    const shell=document.createElement('script');
    shell.src=base+'assets/js/site-main.js?v=20260921-nav17';
    shell.dataset.nexusnovaSiteShell='';
    document.body.appendChild(shell);
  };
  const scheduleShell=()=>{
    if('requestIdleCallback' in window){
      window.requestIdleCallback(loadShell,{timeout:1200});
    }else{
      window.setTimeout(loadShell,120);
    }
  };
  if(document.readyState==='loading'){
    window.addEventListener('DOMContentLoaded',scheduleShell,{once:true});
  }else{
    scheduleShell();
  }
})();
