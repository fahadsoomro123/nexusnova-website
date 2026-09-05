(()=>{
  'use strict';
  const consentKey='nexusnova_analytics_consent_v1';
  const tool=(location.pathname.split('/').pop()||'home').replace(/\.html$/i,'');
  const allowed=()=>{
    try{return localStorage.getItem(consentKey)==='granted'&&typeof window.gtag==='function'}catch(_){return false}
  };
  const send=(name,action)=>{
    if(!allowed())return;
    window.gtag('event',name,{tool,action});
  };
  document.addEventListener('click',event=>{
    const el=event.target.closest('button,a');
    if(!el||el.disabled||el.getAttribute('aria-disabled')==='true')return;
    if(el.matches('#copy,[id*="copy" i]')){send('copy_result','copy');return}
    if(el.matches('#share,[id*="share" i]')){send('share_result','share');return}
    if(el.matches('#download,#image-download,[download],[id*="download" i]')){send('download_click','download');return}
    if(el.matches('[data-go],#scan,#remove,#image-run,#calculate'))send('tool_action','run');
  },{passive:true});
})();
