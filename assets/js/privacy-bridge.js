(()=>{
  const setup=()=>{
    const banner=document.getElementById('nexusnova-analytics-consent');
    if(!banner)return false;
    const floating=document.querySelector('.nn-privacy-choice-fallback');
    if(floating)floating.remove();

    banner.hidden=true;
    banner.setAttribute('role','dialog');
    banner.setAttribute('aria-modal','true');
    banner.setAttribute('aria-label','Privacy and analytics settings');
    banner.style.setProperty('position','fixed','important');
    banner.style.setProperty('left','50%','important');
    banner.style.setProperty('right','auto','important');
    banner.style.setProperty('top','50%','important');
    banner.style.setProperty('bottom','auto','important');
    banner.style.setProperty('transform','translate(-50%,-50%)','important');
    banner.style.setProperty('width','min(92vw,500px)','important');
    banner.style.setProperty('max-width','500px','important');
    banner.style.setProperty('z-index','2147483647','important');
    banner.style.setProperty('box-sizing','border-box','important');
    banner.style.setProperty('margin','0','important');

    const copy=banner.querySelector('p');
    if(copy)copy.innerHTML='<strong>Privacy & Analytics</strong><br>Choose whether to allow detailed Google Analytics. Advertising and personalization remain off.';

    const host=document.querySelector('.site-footer .footer-bottom')||document.querySelector('.site-footer .footer-console');
    if(host&&!host.querySelector('[data-nexusnova-privacy-settings-link]')){
      const link=document.createElement('a');
      link.href='#privacy-analytics-settings';
      link.textContent='Privacy & Analytics';
      link.dataset.nexusnovaPrivacySettingsLink='';
      link.setAttribute('aria-haspopup','dialog');
      link.style.cssText='margin-left:12px;text-decoration:underline;font-size:12px;opacity:.78;cursor:pointer;color:inherit';
      link.addEventListener('click',event=>{
        event.preventDefault();
        banner.hidden=false;
        banner.style.setProperty('display','block','important');
        banner.querySelector('[data-consent-allow]')?.focus();
      });
      host.appendChild(link);
    }
    return true;
  };

  const boot=()=>{ if(!setup())setTimeout(setup,100); };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
