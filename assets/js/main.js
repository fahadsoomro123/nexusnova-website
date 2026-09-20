(()=>{
  'use strict';
  const measurementId='G-YLPFKWSS12';
  if(window.__nexusnovaGa4BootstrapReady)return;
  window.__nexusnovaGa4BootstrapReady=true;
  const inSubdir=/\/(guides|articles|tech)\//.test(location.pathname);
  const base=inSubdir?'../':'';

  /* One automatic GA4 bootstrap. The site shell below owns the privacy-choice
     UI and Consent Mode state; do not pre-set its readiness guard here. */
  window.dataLayer=window.dataLayer||[];
  window.gtag=window.gtag||function(){window.dataLayer.push(arguments)};

  if(!document.querySelector('script[data-nexusnova-ga4]')){
    window.gtag('js',new Date());
    const analyticsScript=document.createElement('script');
    analyticsScript.async=true;
    analyticsScript.src=`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    analyticsScript.dataset.nexusnovaGa4='';
    analyticsScript.onload=()=>window.gtag('config',measurementId,{
      send_page_view:true,
      allow_google_signals:false,
      allow_ad_personalization_signals:false
    });
    document.head.appendChild(analyticsScript);
  }

  if(!document.querySelector('script[data-nexusnova-site-shell]')){
    const shell=document.createElement('script');
    shell.defer=true;
    shell.src=`${base}assets/js/site-main.js?v=20260915-ga4`;
    shell.dataset.nexusnovaSiteShell='';
    document.head.appendChild(shell);
  }
})();