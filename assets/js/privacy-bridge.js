(()=>{
  const styleId='nexusnova-privacy-bridge-style';
  const ensureStyle=()=>{
    if(document.getElementById(styleId))return;
    const style=document.createElement('style');
    style.id=styleId;
    style.textContent='.nn-privacy-choice-fallback{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important}#nexusnova-analytics-consent[hidden]{display:none!important}';
    (document.head||document.documentElement).appendChild(style);
  };

  const setup=()=>{
    ensureStyle();
    document.querySelectorAll('.nn-privacy-choice-fallback').forEach(node=>node.remove());
    const banner=document.getElementById('nexusnova-analytics-consent');
    if(!banner)return false;

    banner.hidden=true;
    banner.setAttribute('role','dialog');
    banner.setAttribute('aria-modal','true');
    banner.setAttribute('aria-label','Privacy and analytics settings');
    banner.style.setProperty('display','none','important');
    banner.style.setProperty('pointer-events','none','important');

    const close=()=>{
      banner.hidden=true;
      banner.style.setProperty('display','none','important');
      banner.style.setProperty('pointer-events','none','important');
    };
    const open=event=>{
      event?.preventDefault();
      banner.hidden=false;
      banner.style.setProperty('display','block','important');
      banner.style.setProperty('pointer-events','auto','important');
      banner.querySelector('[data-consent-allow]')?.focus();
    };

    const footer=document.querySelector('.site-footer .footer-bottom')||document.querySelector('.site-footer .footer-console');
    if(footer&&!footer.querySelector('[data-nexusnova-privacy-settings-link]')){
      const link=document.createElement('a');
      link.href='#privacy-analytics-settings';
      link.textContent='Privacy & Analytics';
      link.dataset.nexusnovaPrivacySettingsLink='1';
      link.setAttribute('aria-label','Open Privacy and Analytics settings');
      link.setAttribute('aria-haspopup','dialog');
      link.style.cssText='margin-left:12px;text-decoration:underline;font-size:12px;opacity:.78;cursor:pointer;color:inherit;pointer-events:auto';
      link.addEventListener('click',open);
      footer.appendChild(link);
    }

    return true;
  };

  const boot=()=>setup();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();

  const observer=new MutationObserver(()=>setup());
  observer.observe(document.documentElement,{childList:true,subtree:true});
})();
