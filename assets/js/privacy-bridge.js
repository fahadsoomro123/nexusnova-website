(()=>{
  const setup=()=>{
    const banner=document.getElementById('nexusnova-analytics-consent');
    const footer=document.querySelector('.site-footer .footer-bottom')||document.querySelector('.site-footer .footer-console');
    if(!footer || !banner) return false;

    banner.hidden=true;
    banner.removeAttribute('aria-hidden');
    banner.setAttribute('role','dialog');
    banner.setAttribute('aria-modal','true');
    banner.setAttribute('aria-label','Privacy and analytics settings');

    let link=footer.querySelector('[data-nexusnova-privacy-settings-link]');
    if(!link){
      link=document.createElement('a');
      link.href='#privacy-analytics-settings';
      link.textContent='Privacy & Analytics';
      link.dataset.nexusnovaPrivacySettingsLink='1';
      link.setAttribute('aria-label','Open Privacy and Analytics settings');
      link.setAttribute('aria-haspopup','dialog');
      link.style.cssText='display:inline-block;margin-left:12px;text-decoration:underline;font-size:12px;opacity:.78;cursor:pointer;color:inherit;pointer-events:auto!important;position:relative;z-index:2147483647;touch-action:manipulation';
      footer.appendChild(link);
    }

    link.onclick=open;
    return true;
  };

  const open=event=>{
    event?.preventDefault();
    const banner=document.getElementById('nexusnova-analytics-consent');
    if(!banner) return false;

    banner.hidden=false;
    banner.removeAttribute('hidden');
    banner.removeAttribute('aria-hidden');
    banner.style.setProperty('display','block','important');
    banner.style.setProperty('visibility','visible','important');
    banner.style.setProperty('opacity','1','important');
    banner.style.setProperty('pointer-events','auto','important');
    history.replaceState(null,'','#privacy-analytics-settings');
    banner.querySelector('[data-consent-allow]')?.focus();
    return false;
  };

  const closeOnHash=()=>{
    if(location.hash!=='#privacy-analytics-settings') return;
    const banner=document.getElementById('nexusnova-analytics-consent');
    if(banner){
      banner.hidden=false;
      banner.removeAttribute('hidden');
      banner.removeAttribute('aria-hidden');
      banner.style.setProperty('display','block','important');
      banner.style.setProperty('visibility','visible','important');
      banner.style.setProperty('opacity','1','important');
      banner.style.setProperty('pointer-events','auto','important');
    }
  };

  const boot=()=>{
    if(setup()){
      closeOnHash();
      return;
    }
    window.setTimeout(boot,100);
  };

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
