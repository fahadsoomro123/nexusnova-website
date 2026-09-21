(()=>{
  'use strict';
  const base=/\/(guides|articles|tech)\//.test(location.pathname)?'../':'';
  const profiles=[
    ['X','@NexusNovaTools','https://x.com/NexusNovaTools'],
    ['Facebook','NexusNovaTools','https://www.facebook.com/NexusNovaTools/'],
    ['Instagram','@nexusnovatools','https://www.instagram.com/nexusnovatools/'],
    ['Telegram','@NexusNovaTools','https://t.me/NexusNovaTools']
  ];
  const url='https://nexusnovatools.com'+(location.pathname==='/'?'':location.pathname)+location.search;
  const message='Check out NexusNova Tools — free browser utilities, Pakistan tools and practical guides: '+url;
  const mount=()=>{
    const footer=document.querySelector('.site-footer');
    if(footer&&!footer.querySelector('[data-social-links]')){
      const consoleEl=footer.querySelector('.footer-console');
      const brandColumn=consoleEl?.firstElementChild;
      if(brandColumn){
        const title=document.createElement('div');
        title.className='footer-title nn-social-title';
        title.dataset.socialLinks='';
        title.textContent='Follow NexusNova';
        const links=document.createElement('div');
        links.className='footer-links nn-social-links';
        links.setAttribute('aria-label','Official NexusNova social profiles');
        profiles.forEach(([name,handle,href])=>{
          const a=document.createElement('a');
          a.href=href;a.target='_blank';a.rel='me noopener noreferrer';a.textContent=`${name} · ${handle}`;
          links.appendChild(a);
        });
        brandColumn.append(title,links);
      }
    }
    if(document.querySelector('[data-nexusnova-share-widget]'))return;
    const style=document.createElement('style');
    style.dataset.nexusnovaSocialStyle='';
    style.textContent='.nn-share-widget{position:fixed;right:18px;bottom:18px;z-index:1200;display:flex;align-items:center;gap:12px;max-width:min(520px,calc(100vw - 28px));padding:10px 12px;border:1px solid rgba(15,23,42,.14);border-radius:16px;background:rgba(17,24,39,.96);box-shadow:0 12px 34px rgba(15,23,42,.22);color:#fff;font:13px/1.25 system-ui,sans-serif}.nn-share-label{display:grid;gap:2px}.nn-share-label strong{font-size:13px}.nn-share-label span{font-size:11px;opacity:.78}.nn-share-actions{display:flex;gap:7px;flex-wrap:wrap}.nn-share-btn{min-height:38px;padding:8px 12px;border:1px solid rgba(255,255,255,.2);border-radius:999px;background:#fff;color:#111827;font:700 12px system-ui,sans-serif;cursor:pointer}.nn-share-whatsapp{background:#25d366;color:#062d14;border-color:#25d366}.nn-share-close{background:transparent;color:#fff}.nn-social-links{margin-top:8px}.nn-social-title{margin-top:16px}@media(max-width:720px){.nn-share-widget{left:10px;right:10px;bottom:10px;display:grid;gap:8px}.nn-share-actions{width:100%}.nn-share-btn{flex:1 1 auto}}';
    document.head.appendChild(style);
    const widget=document.createElement('div');
    widget.className='nn-share-widget';
    widget.dataset.nexusnovaShareWidget='';
    widget.setAttribute('aria-label','Share and support NexusNova Tools');
    widget.innerHTML='<div class="nn-share-label"><strong>Share &amp; Support NexusNova</strong><span>Help someone discover a useful free tool</span></div><div class="nn-share-actions"><button class="nn-share-btn nn-share-whatsapp" type="button" data-share-whatsapp>WhatsApp</button><button class="nn-share-btn" type="button" data-share-copy>Copy link</button><button class="nn-share-btn nn-share-close" type="button" data-share-close aria-label="Close share bar">×</button></div>';
    document.body.appendChild(widget);
    const whatsapp=widget.querySelector('[data-share-whatsapp]');
    whatsapp.addEventListener('click',()=>window.open('https://wa.me/?text='+encodeURIComponent(message),'_blank','noopener,noreferrer'));
    widget.querySelector('[data-share-copy]').addEventListener('click',async()=>{
      try{await navigator.clipboard.writeText(message);widget.querySelector('[data-share-copy]').textContent='Copied';setTimeout(()=>widget.querySelector('[data-share-copy]').textContent='Copy link',1400)}catch(_){window.prompt('Copy this NexusNova link:',message)}});
    widget.querySelector('[data-share-close]').addEventListener('click',()=>widget.remove());
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(mount,1400),{once:true});
  else setTimeout(mount,1400);
})();
