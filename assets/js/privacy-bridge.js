(()=>{
  'use strict';
  const CONSENT_ID='nexusnova-analytics-consent';
  const CONSENT_KEY='nexusnova_analytics_consent_v2';
  const LEGACY_CONSENT_KEY='nexusnova_analytics_consent_v1';
  const REOPEN_SELECTOR='[data-nexusnova-privacy-settings-link]';

  const readChoice=()=>{try{
    const current=localStorage.getItem(CONSENT_KEY)||'';
    if(current)return current;
    const legacy=localStorage.getItem(LEGACY_CONSENT_KEY)||'';
    if(legacy==='granted'){localStorage.setItem(CONSENT_KEY,'granted');return 'granted'}
    if(legacy==='denied'){localStorage.setItem(CONSENT_KEY,'legacy-basic');return 'legacy-basic'}
    return '';
  }catch(_){return ''}};

  const boot=()=>{
    const banner=document.getElementById(CONSENT_ID);
    if(!banner)return;

    const footer=document.querySelector('.site-footer .footer-bottom')||document.querySelector('.site-footer .footer-console');
    if(!footer)return;

    let trigger=footer.querySelector(REOPEN_SELECTOR);
    if(!trigger){
      trigger=document.createElement('button');
      trigger.type='button';
      trigger.textContent='Privacy & Analytics';
      trigger.dataset.nexusnovaPrivacySettingsLink='1';
      footer.appendChild(trigger);
    }

    trigger.setAttribute('aria-haspopup','dialog');
    trigger.setAttribute('aria-controls',CONSENT_ID);
    trigger.style.cssText='display:inline-block;margin-left:12px;padding:0;border:0;background:none;color:inherit;text-decoration:underline;font:inherit;font-size:12px;cursor:pointer;position:relative;z-index:2;touch-action:manipulation;pointer-events:auto';

    trigger.addEventListener('click',event=>{
      event.preventDefault();
      banner.hidden=false;
      banner.setAttribute('aria-hidden','false');
      banner.querySelector('[data-consent-allow]')?.focus();
    });

    if(!readChoice()){
      banner.hidden=false;
      banner.setAttribute('aria-hidden','false');
    }

    document.documentElement.classList.add('nexusnova-privacy-ui-ready');
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
