(()=>{
  'use strict';

  const measurementId='G-YLPFKWSS12';
  const consentKey='nexusnova_analytics_consent_v1';
  if(window.__nexusnovaGa4BootstrapReady)return;
  window.__nexusnovaGa4BootstrapReady=true;

  window.dataLayer=window.dataLayer||[];
  window.gtag=window.gtag||function(){window.dataLayer.push(arguments)};
  const readChoice=()=>{try{return window.localStorage.getItem(consentKey)||''}catch(_){return ''}};
  const applyChoice=granted=>{
    window.gtag('consent','update',{
      analytics_storage:granted?'granted':'denied',
      ad_storage:'denied',
      ad_user_data:'denied',
      ad_personalization:'denied'
    });
    try{window.localStorage.setItem(consentKey,granted?'granted':'denied')}catch(_){}
  };

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

  const isProductionAnalyticsHost=/^(?:www\.)?nexusnovatools\.com$/i.test(location.hostname);
  if(isProductionAnalyticsHost&&!document.querySelector('script[data-nexusnova-ga4]')){
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

  window.__nexusnovaLoadAnalytics=granted=>applyChoice(!!granted);

  const mountStandaloneChoices=()=>{
    if(document.querySelector('[data-nexusnova-consent]'))return;
    const footer=document.querySelector('.nn-global-footer .nn-footer-trust-grid');
    if(!footer)return;

    const style=document.createElement('style');
    style.dataset.nexusnovaStandaloneConsent='';
    style.textContent='.nn-standalone-consent{position:fixed;inset:auto 16px 16px;z-index:9999;max-width:560px;margin:auto;padding:14px;border:1px solid #cbd5e1;border-radius:14px;background:#fff;color:#111827;box-shadow:0 10px 30px rgba(15,23,42,.16);font:13px/1.45 system-ui,sans-serif}.nn-standalone-consent[hidden]{display:none}.nn-standalone-consent p{margin:0 0 10px}.nn-standalone-consent-actions{display:flex;flex-wrap:wrap;gap:7px}.nn-standalone-consent button{border:1px solid #cbd5e1;border-radius:999px;padding:7px 11px;background:#fff;color:#111827;font:700 12px system-ui,sans-serif;cursor:pointer}.nn-standalone-consent .primary{background:#111827;color:#fff;border-color:#111827}.nn-standalone-consent a{color:inherit;text-decoration:underline}.nn-standalone-consent-open{cursor:pointer}.nn-standalone-consent-dialog{max-width:560px;border:1px solid #cbd5e1;border-radius:14px;padding:18px;background:#fff;color:#111827;box-shadow:0 18px 45px rgba(15,23,42,.18)}.nn-standalone-consent-dialog::backdrop{background:rgba(15,23,42,.28)}';
    document.head.appendChild(style);

    const open=document.createElement('a');
    open.href='#privacy-choices';
    open.className='nn-standalone-consent-open';
    open.textContent='Privacy choices';
    open.setAttribute('aria-controls','nexusnova-analytics-consent-dialog');
    const privacyLink=Array.from(footer.querySelectorAll('a')).find(link=>/\/privacy\.html$/i.test(link.getAttribute('href')||''));
    if(privacyLink)privacyLink.insertAdjacentElement('afterend',open);else footer.appendChild(open);

    const dialog=document.createElement('dialog');
    dialog.id='nexusnova-analytics-consent-dialog';
    dialog.className='nn-standalone-consent-dialog';
    dialog.dataset.nexusnovaConsent='';
    dialog.setAttribute('aria-labelledby','nexusnova-analytics-consent-title');
    dialog.innerHTML='<h2 id="nexusnova-analytics-consent-title" style="margin:0 0 8px;font-size:18px">Privacy & Analytics Settings</h2><p style="margin:0 0 10px;color:#475569">Detailed GA4 analytics stays denied until you explicitly allow it. Basic measurement remains privacy-preserving, and advertising/personalization storage stays off.</p><p style="margin:0 0 14px"><a href="privacy.html">Read privacy details</a></p><div class="nn-standalone-consent-actions"><button type="button" class="primary" data-consent-allow>Allow detailed analytics</button><button type="button" data-consent-deny>Keep basic measurement</button><button type="button" data-consent-close>Close</button></div>';
    document.body.appendChild(dialog);

    const close=()=>dialog.close();
    dialog.querySelector('[data-consent-allow]')?.addEventListener('click',()=>{
      applyChoice(true);
      window.gtag('event','analytics_detail_opt_in',{detail_level:'enhanced'});
      close();
    });
    dialog.querySelector('[data-consent-deny]')?.addEventListener('click',()=>{applyChoice(false);close()});
    dialog.querySelector('[data-consent-close]')?.addEventListener('click',close);
    open.addEventListener('click',event=>{
      event.preventDefault();
      if(typeof dialog.showModal==='function')dialog.showModal();
      else dialog.setAttribute('open','');
    });

    const choice=readChoice();
    if(choice==='granted'||choice==='denied')applyChoice(choice==='granted');
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mountStandaloneChoices,{once:true});
  else mountStandaloneChoices();
})();