(()=>{
  'use strict';
  const tool=(location.pathname.split('/').pop()||'home').replace(/\.html$/i,'');
  const detailAllowed=()=>{
    try{return localStorage.getItem('nexusnova_analytics_consent_v1')==='granted'}catch(_){return false}
  };
  const allowed=()=>typeof window.gtag==='function'&&detailAllowed();
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
    if(el.matches('[data-go],[data-mode],#run,#scan,#remove,#image-run,#calculate'))send('tool_action','run');
  },{passive:true});
})();