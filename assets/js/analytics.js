(()=>{
  'use strict';

  const measurementId='G-YLPFKWSS12';
  const consentKey='nexusnova_analytics_consent_v1';
  if(window.__nexusnovaGa4BootstrapReady)return;
  window.__nexusnovaGa4BootstrapReady=true;

  window.dataLayer=window.dataLayer||[];
  window.gtag=window.gtag||function(){window.dataLayer.push(arguments)};
  const readChoice=()=>{try{return window.localStorage.getItem(consentKey)||''}catch(_){return ''}};

  if(!window.__nexusnovaConsentDefaulted){
    window.gtag('consent','default',{
      analytics_storage:readChoice()==='granted'?'granted':'denied',
      ad_storage:'denied',
      ad_user_data:'denied',
      ad_personalization:'denied',
      wait_for_update:500
    });
    window.__nexusnovaConsentDefaulted=true;
  }
  window.__nexusnovaConsentReady=true;

  if(!document.querySelector('script[data-nexusnova-ga4]')){
    window.gtag('js',new Date());
    const analyticsScript=document.createElement('script');
    analyticsScript.async=true;
    analyticsScript.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(measurementId);
    analyticsScript.dataset.nexusnovaGa4='';
    analyticsScript.onload=()=>window.gtag('config',measurementId,{
      send_page_view:true,
      allow_google_signals:false,
      allow_ad_personalization_signals:false,
      ads_data_redaction:true
    });
    document.head.appendChild(analyticsScript);
  }

  window.__nexusnovaLoadAnalytics=granted=>{
    window.gtag('consent','update',{
      analytics_storage:granted?'granted':'denied',
      ad_storage:'denied',
      ad_user_data:'denied',
      ad_personalization:'denied'
    });
    try{window.localStorage.setItem(consentKey,granted?'granted':'denied')}catch(_){}
  };
})();