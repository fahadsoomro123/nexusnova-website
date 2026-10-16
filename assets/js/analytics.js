(()=>{
  'use strict';

  const measurementId='G-YLPFKWSS12';
  const consentKey='nexusnova_analytics_consent_v2';
  const legacyConsentKey='nexusnova_analytics_consent_v1';
  const restrictedAnalyticsRegions=['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE','IS','LI','NO','GB','CH'];
  if(window.__nexusnovaGa4BootstrapReady)return;
  window.__nexusnovaGa4BootstrapReady=true;

  window.dataLayer=window.dataLayer||[];
  window.gtag=window.gtag||function(){window.dataLayer.push(arguments)};
  const isGpcEnabled=()=>window.navigator?.globalPrivacyControl===true;
  const readChoice=()=>{
    try{
      const current=window.localStorage.getItem(consentKey)||'';
      if(['basic','granted','denied','legacy-basic'].includes(current))return current;
      const legacy=window.localStorage.getItem(legacyConsentKey)||'';
      if(legacy==='granted'){window.localStorage.setItem(consentKey,'granted');return 'granted';}
      if(legacy==='denied'){window.localStorage.setItem(consentKey,'legacy-basic');return 'legacy-basic';}
    }catch(_){}
    return '';
  };
  const applyChoice=choice=>{
    const requested=choice===true?'granted':choice===false?'denied':choice;
    const selected=['basic','granted','denied'].includes(requested)?requested:'denied';
    const effective=isGpcEnabled()?'denied':selected;
    window.gtag('consent','update',{
      analytics_storage:effective==='denied'?'denied':'granted',
      ad_storage:'denied',
      ad_user_data:'denied',
      ad_personalization:'denied'
    });
    try{window.localStorage.setItem(consentKey,effective)}catch(_){}
    return effective;
  };

  const initialChoice=readChoice();
  if(!window.__nexusnovaConsentDefaulted){
    if(isGpcEnabled()||initialChoice==='denied'){
      window.gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',wait_for_update:500});
    }else if(initialChoice==='basic'||initialChoice==='granted'){
      window.gtag('consent','default',{analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',wait_for_update:500});
    }else{
      window.gtag('consent','default',{analytics_storage:'denied',region:restrictedAnalyticsRegions,ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',wait_for_update:500});
      window.gtag('consent','default',{analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',wait_for_update:500});
    }
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

  window.__nexusnovaLoadAnalytics=choice=>applyChoice(choice);

  const mountStandaloneChoices=()=>{
    if(document.querySelector('[data-nexusnova-consent]'))return;
    const footer=document.querySelector('.nn-global-footer .nn-footer-trust-grid');
    if(!footer)return;

    const style=document.createElement('style');
    style.dataset.nexusnovaStandaloneConsent='';
    style.textContent='.nn-standalone-consent-banner{position:fixed;inset:auto 16px 16px;z-index:9998;max-width:560px;margin:auto;padding:14px;border:1px solid #cbd5e1;border-radius:14px;background:#fff;color:#111827;box-shadow:0 10px 30px rgba(15,23,42,.16);font:13px/1.45 system-ui,sans-serif}.nn-standalone-consent-banner[hidden]{display:none}.nn-standalone-consent-banner p{margin:0 0 10px}.nn-standalone-consent{position:fixed;inset:auto 16px 16px;z-index:9999;max-width:560px;margin:auto;padding:14px;border:1px solid #cbd5e1;border-radius:14px;background:#fff;color:#111827;box-shadow:0 10px 30px rgba(15,23,42,.16);font:13px/1.45 system-ui,sans-serif}.nn-standalone-consent[hidden]{display:none}.nn-standalone-consent p{margin:0 0 10px}.nn-standalone-consent-actions{display:flex;flex-wrap:wrap;gap:7px}.nn-standalone-consent button,.nn-standalone-consent-banner button{border:1px solid #cbd5e1;border-radius:999px;padding:7px 11px;background:#fff;color:#111827;font:700 12px system-ui,sans-serif;cursor:pointer}.nn-standalone-consent .primary,.nn-standalone-consent-banner .primary{background:#111827;color:#fff;border-color:#111827}.nn-standalone-consent a,.nn-standalone-consent-banner a{color:inherit;text-decoration:underline}.nn-standalone-consent-open{cursor:pointer}.nn-standalone-consent-dialog{max-width:560px;border:1px solid #cbd5e1;border-radius:14px;padding:18px;background:#fff;color:#111827;box-shadow:0 18px 45px rgba(15,23,42,.18)}.nn-standalone-consent-dialog::backdrop{background:rgba(15,23,42,.28)}@media(max-width:640px){.nn-standalone-consent-banner,.nn-standalone-consent{left:10px;right:10px;bottom:10px}}';
    document.head.appendChild(style);

    const open=document.createElement('a');
    open.href='#privacy-choices';
    open.className='nn-standalone-consent-open';
    open.textContent='Privacy choices';
    open.setAttribute('aria-controls','nexusnova-analytics-consent-dialog');
    const privacyLink=Array.from(footer.querySelectorAll('a')).find(link=>/\/privacy\.html$/i.test(link.getAttribute('href')||''));
    if(privacyLink)privacyLink.insertAdjacentElement('afterend',open);else footer.appendChild(open);

    const banner=document.createElement('div');
    banner.className='nn-standalone-consent-banner';
    banner.dataset.nexusnovaConsent='';
    banner.id='nexusnova-analytics-consent-banner';
    banner.hidden=true;
    banner.setAttribute('role','region');
    banner.setAttribute('aria-label','Privacy and analytics choices');
    banner.innerHTML='<div class="nn-standalone-consent-copy"><strong>We use cookies</strong><p>Basic page-view measurement runs where permitted. Choose <strong>Accept all</strong> to enable optional detailed analytics such as selected tool run, copy and download events. <strong>Basic only</strong> keeps page-view measurement; <strong>Reject optional</strong> denies analytics storage and detailed tool interactions; limited cookie-less measurement signals may still be sent by Google Consent Mode. Advertising storage and ad personalization stay off. <a href="privacy.html">Privacy policy</a>.</p></div><div class="nn-standalone-consent-actions"><button type="button" class="primary" data-consent-allow>Accept all</button><button type="button" data-consent-basic>Basic only</button><button type="button" data-consent-off>Reject optional</button></div>';
    document.body.appendChild(banner);

    const dialog=document.createElement('dialog');
    dialog.id='nexusnova-analytics-consent-dialog';
    dialog.className='nn-standalone-consent-dialog';
    dialog.setAttribute('aria-labelledby','nexusnova-analytics-consent-title');
    dialog.innerHTML='<h2 id="nexusnova-analytics-consent-title" style="margin:0 0 8px;font-size:18px">Cookie preferences</h2><p style="margin:0 0 10px;color:#475569">Basic page views run where permitted. Accept all enables optional detailed analytics, including selected tool run, copy and download events. Basic only keeps page-view measurement. Reject optional denies analytics storage and detailed tool interactions; limited cookie-less measurement signals may still be sent by Google Consent Mode. Advertising storage and ad personalization stay off.</p><p style="margin:0 0 14px"><a href="privacy.html">Read privacy policy</a></p><div class="nn-standalone-consent-actions"><button type="button" class="primary" data-consent-allow>Accept all</button><button type="button" data-consent-basic>Basic only</button><button type="button" data-consent-off>Reject optional</button><button type="button" data-consent-close>Close</button></div>';
    document.body.appendChild(dialog);

    const close=()=>{if(dialog.open)dialog.close();else dialog.removeAttribute('open')};
    const chooseDetailed=()=>{
      const effective=applyChoice('granted');
      if(effective==='granted'){
        window.__nexusnovaOptInEventCallback=false;
        window.__nexusnovaOptInEventRequested=true;
        window.gtag('event','analytics_detail_opt_in',{detail_level:'enhanced',send_to:measurementId,event_callback:()=>{window.__nexusnovaOptInEventCallback=true},event_timeout:3000});
      }
      banner.hidden=true;close();
    };
    const chooseBasic=()=>{applyChoice('basic');banner.hidden=true;close()};
    const chooseOff=()=>{applyChoice('denied');banner.hidden=true;close()};
    banner.querySelector('[data-consent-allow]')?.addEventListener('click',chooseDetailed);
    banner.querySelector('[data-consent-basic]')?.addEventListener('click',chooseBasic);
    banner.querySelector('[data-consent-off]')?.addEventListener('click',chooseOff);
    dialog.querySelector('[data-consent-allow]')?.addEventListener('click',chooseDetailed);
    dialog.querySelector('[data-consent-basic]')?.addEventListener('click',chooseBasic);
    dialog.querySelector('[data-consent-off]')?.addEventListener('click',chooseOff);
    dialog.querySelector('[data-consent-close]')?.addEventListener('click',close);
    open.addEventListener('click',event=>{
      event.preventDefault();
      if(typeof dialog.showModal==='function')dialog.showModal();
      else dialog.setAttribute('open','');
    });

    const choice=readChoice();
    if(choice==='granted'||choice==='basic'||choice==='denied'){
      applyChoice(choice);banner.hidden=true;
    }else{
      banner.hidden=false;
    }
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mountStandaloneChoices,{once:true});
  else mountStandaloneChoices();
  // Shared entrypoint for legacy article/guide files that only load analytics.js.
  if(!window.__nexusNovaRelatedToolsBootstrapScriptRequested){
    window.__nexusNovaRelatedToolsBootstrapScriptRequested=true;
    const relatedBootstrap=document.createElement('script');
    relatedBootstrap.src='/assets/js/related-tools-bootstrap.js?v=20261016-related-content-v1';
    relatedBootstrap.async=true;
    relatedBootstrap.dataset.nexusnovaRelatedToolsBootstrap='';
    relatedBootstrap.onerror=()=>{window.__nexusNovaRelatedToolsBootstrapScriptRequested=false;};
    document.head.appendChild(relatedBootstrap);
  }

})();


/* Load the shared responsive header/search/footer repair layer once per page. */
(function(){
  if(typeof window==='undefined'||!window.document)return;
  if(window.__nexusNovaGlobalShellGuardRequested)return;
  window.__nexusNovaGlobalShellGuardRequested=true;
  var script=document.createElement('script');
  script.src='/assets/js/global-shell-guard.js?v=20261017-ui-sweep';
  script.async=true;
  script.dataset.nexusnovaGlobalShellGuard='';
  script.onerror=function(){window.__nexusNovaGlobalShellGuardRequested=false;};
  (document.head||document.documentElement).appendChild(script);
})();
