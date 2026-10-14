(()=> {
  'use strict';
  // Homepage-only early mount. Keep this UI ahead of the delayed shared shell so it
  // does not become a late Largest Contentful Paint element after the hero has painted.
  if(window.__nexusnovaConsentUiReady||document.querySelector('[data-nexusnova-consent]'))return;
  window.__nexusnovaConsentUiReady=true;

  const consentKey='nexusnova_analytics_consent_v2';
  const legacyConsentKey='nexusnova_analytics_consent_v1';
  const readChoice=()=>{
    try{
      const current=localStorage.getItem(consentKey)||'';
      if(['basic','granted','denied','legacy-basic'].includes(current))return current;
      const legacy=localStorage.getItem(legacyConsentKey)||'';
      if(legacy==='granted'){localStorage.setItem(consentKey,'granted');return 'granted';}
      if(legacy==='denied'){localStorage.setItem(consentKey,'legacy-basic');return 'legacy-basic';}
    }catch(_){}
    return '';
  };
  const style=document.createElement('style');
  style.dataset.nexusnovaConsentStyle='';
  style.textContent='.nn-consent{position:fixed;left:16px;right:16px;bottom:72px;z-index:9999;max-width:560px;margin:auto;padding:12px 14px;border:1px solid #cbd5e1;border-radius:14px;background:#fff;color:#111827;box-shadow:0 10px 30px rgba(15,23,42,.16);font:13px/1.4 system-ui,sans-serif}.nn-consent[hidden]{display:none}.nn-consent p{margin:0 0 9px}.nn-consent-actions{display:flex;gap:7px;flex-wrap:wrap}.nn-consent button{border:1px solid #cbd5e1;border-radius:999px;padding:7px 11px;background:#fff;color:#111827;font:700 12px system-ui,sans-serif;cursor:pointer}.nn-consent .primary{background:#111827;color:#fff;border-color:#111827}.nn-consent a{color:inherit;text-decoration:underline}.nn-consent-reopen{border:0;background:none;color:inherit;text-decoration:underline;cursor:pointer;padding:0;font:inherit}@media(max-width:640px){.nn-consent{left:10px;right:10px;bottom:62px}}';
  document.head.appendChild(style);

  const banner=document.createElement('div');
  banner.className='nn-consent';
  banner.dataset.nexusnovaConsent='';
  banner.id='nexusnova-analytics-consent';
  banner.hidden=true;
  banner.setAttribute('role','region');
  banner.setAttribute('aria-label','Privacy and analytics choices');
  banner.innerHTML='<div class="nn-consent-copy"><strong>We use cookies</strong><p>Basic page-view measurement runs where permitted. Choose <strong>Accept all</strong> to enable optional detailed analytics such as selected tool run, copy and download events. <strong>Basic only</strong> keeps page-view measurement; <strong>Reject optional</strong> denies analytics storage and detailed tool interactions; limited cookie-less measurement signals may still be sent by Google Consent Mode. Advertising storage and ad personalization stay off. <a href="privacy.html">Privacy policy</a>.</p></div><div class="nn-consent-actions"><button type="button" class="primary" data-consent-allow>Accept all</button><button type="button" data-consent-basic>Basic only</button><button type="button" data-consent-off>Reject optional</button></div>';
  document.body.appendChild(banner);

  const applyChoice=choice=>{
    if(typeof window.__nexusnovaLoadAnalytics==='function')return window.__nexusnovaLoadAnalytics(choice);
    const effective=window.navigator?.globalPrivacyControl===true?'denied':choice;
    window.gtag=window.gtag||function(){(window.dataLayer=window.dataLayer||[]).push(arguments)};
    window.gtag('consent','update',{
      analytics_storage:effective==='denied'?'denied':'granted',
      ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'
    });
    try{localStorage.setItem(consentKey,effective)}catch(_){}
    return effective;
  };
  const hide=()=>{banner.hidden=true};
  banner.querySelector('[data-consent-allow]')?.addEventListener('click',()=>{
    const effective=applyChoice('granted');
    if(effective==='granted')window.gtag('event','analytics_detail_opt_in',{detail_level:'enhanced'});
    hide();
  });
  banner.querySelector('[data-consent-basic]')?.addEventListener('click',()=>{applyChoice('basic');hide()});
  banner.querySelector('[data-consent-off]')?.addEventListener('click',()=>{applyChoice('denied');hide()});

  const reopen=document.createElement('button');
  reopen.type='button';
  reopen.className='nn-consent-reopen';
  reopen.textContent='Privacy choices';
  reopen.title='Privacy choices';
  reopen.setAttribute('aria-controls','nexusnova-analytics-consent');
  const footer=document.querySelector('.nn-global-footer .nn-footer-trust-grid')||document.querySelector('.site-footer');
  if(footer)footer.appendChild(reopen);
  else document.body.appendChild(reopen);
  reopen.addEventListener('click',()=>{banner.hidden=false;banner.querySelector('[data-consent-allow]')?.focus()});

  const choice=readChoice();
  if(['granted','basic','denied'].includes(choice))hide();
  else banner.hidden=false;
})();