(()=>{
  const consentKey='nexusnova_analytics_consent_v1';
  const open=()=>{
    const banner=document.getElementById('nexusnova-analytics-consent');
    const button=document.querySelector('.nn-privacy-choice-fallback');
    if(!banner||!button)return false;
    banner.hidden=false;
    button.hidden=true;
    banner.querySelector('button')?.focus();
    return true;
  };
  document.addEventListener('click',event=>{
    const target=event.target?.closest?.('.nn-privacy-choice-fallback');
    if(!target)return;
    event.preventDefault();
    event.stopPropagation();
    open();
  },true);
  const boot=()=>{ if(!open()) setTimeout(open,250); };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
