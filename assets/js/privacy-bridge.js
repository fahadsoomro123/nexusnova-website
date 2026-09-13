(()=>{
  const open=()=>{
    const banner=document.getElementById('nexusnova-analytics-consent');
    const button=document.querySelector('.nn-privacy-choice-fallback');
    if(!banner||!button)return false;
    banner.hidden=false;
    button.hidden=true;
    banner.style.setProperty('display','block','important');
    banner.style.setProperty('visibility','visible','important');
    banner.querySelector('[data-consent-allow]')?.focus();
    return true;
  };
  const bind=()=>{
    const button=document.querySelector('.nn-privacy-choice-fallback');
    if(!button||button.dataset.nnPrivacyBridge==='1')return !!button;
    button.dataset.nnPrivacyBridge='1';
    button.disabled=false;
    button.style.setProperty('pointer-events','auto','important');
    button.style.setProperty('touch-action','manipulation','important');
    button.onclick=event=>{event.preventDefault();event.stopPropagation();open();};
    button.addEventListener('pointerdown',event=>{event.preventDefault();event.stopPropagation();open();},{capture:true});
    return true;
  };
  const boot=()=>{bind();open();};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
  const observer=new MutationObserver(()=>bind());
  observer.observe(document.documentElement,{childList:true,subtree:true});
})();
