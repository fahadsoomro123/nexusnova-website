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
    style.textContent='.nn-trust-band{display:grid;grid-template-columns:minmax(0,1.45fr) repeat(3,minmax(180px,.7fr));gap:14px;align-items:stretch;padding:24px;border:1px solid rgba(205,212,225,.82);border-radius:28px;background:rgba(255,255,255,.78);box-shadow:0 20px 55px rgba(31,41,71,.08);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}.nn-trust-copy{min-width:0;padding:4px 10px 4px 2px}.nn-trust-copy h2{margin:10px 0 10px;font-size:clamp(30px,3.4vw,48px);line-height:1.02}.nn-trust-copy>p{margin:0;color:#647188;font-size:14px;line-height:1.7;max-width:760px}.nn-category-rail{display:flex;flex-wrap:wrap;gap:8px;margin-top:18px}.nn-category-rail a{display:inline-flex;align-items:center;min-height:34px;padding:7px 11px;border:1px solid #dfe4ee;border-radius:999px;background:#fff;color:#46536a;font-size:11px;font-weight:780;line-height:1;box-shadow:0 5px 14px rgba(31,41,71,.045);transition:transform .18s ease,border-color .18s ease,background .18s ease}.nn-category-rail a:hover{transform:translateY(-1px);border-color:#bfc8d8;background:#f8f9fd}.nn-trust-item{min-width:0;display:flex;flex-direction:column;justify-content:flex-start;gap:9px;padding:18px;border:1px solid #e0e5ed;border-radius:20px;background:rgba(255,255,255,.88);box-shadow:0 10px 28px rgba(31,41,71,.055);transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease}.nn-trust-item:hover{transform:translateY(-2px);border-color:#c8d1df;box-shadow:0 16px 34px rgba(31,41,71,.09)}.nn-trust-item b{color:#182035;font-size:13px;line-height:1.25}.nn-trust-item span{color:#718096;font-size:11px;line-height:1.55}.nn-share-widget{position:fixed;right:18px;bottom:18px;z-index:1200;display:flex;align-items:center;gap:12px;max-width:min(520px,calc(100vw - 28px));padding:10px 12px;border:1px solid rgba(15,23,42,.14);border-radius:16px;background:rgba(17,24,39,.96);box-shadow:0 12px 34px rgba(15,23,42,.22);color:#fff;font:13px/1.25 system-ui,sans-serif}.nn-share-label{display:grid;gap:2px}.nn-share-label strong{font-size:13px}.nn-share-label span{font-size:11px;opacity:.78}.nn-share-actions{display:flex;gap:7px;flex-wrap:wrap}.nn-share-btn{min-height:38px;padding:8px 12px;border:1px solid rgba(255,255,255,.2);border-radius:999px;background:#fff;color:#111827;font:700 12px system-ui,sans-serif;cursor:pointer}.nn-share-whatsapp{background:#25d366;color:#062d14;border-color:#25d366}.nn-share-native{display:grid;place-items:center;width:42px;padding:8px;color:#111827}.nn-share-native svg{width:20px;height:20px}.nn-social-links{margin-top:8px}.nn-social-title{margin-top:16px}@media(max-width:1080px){.nn-trust-band{grid-template-columns:1fr 1fr}.nn-trust-copy{grid-column:1/-1}}@media(max-width:720px){.nn-trust-band{grid-template-columns:1fr;padding:18px;border-radius:22px}.nn-trust-copy{padding:2px}.nn-trust-copy h2{font-size:32px}.nn-category-rail{gap:7px}.nn-trust-item{padding:16px}.nn-share-widget{left:10px;right:10px;bottom:10px;display:grid;gap:8px}.nn-share-actions{width:100%}.nn-share-btn{flex:1 1 auto}.nn-share-native{flex:0 0 42px}}';
    document.head.appendChild(style);
    const widget=document.createElement('div');
    widget.className='nn-share-widget';
    widget.dataset.nexusnovaShareWidget='';
    widget.setAttribute('aria-label','Share and support NexusNova Tools');
    widget.innerHTML='<div class="nn-share-label"><strong>Share &amp; Support NexusNova</strong><span>Help someone discover a useful free tool</span></div><div class="nn-share-actions"><button class="nn-share-btn nn-share-whatsapp" type="button" data-share-whatsapp>WhatsApp</button><button class="nn-share-btn" type="button" data-share-copy>Copy link</button><button class="nn-share-btn nn-share-native" type="button" data-share-native aria-label="Share NexusNova Tools" title="Share"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="18" cy="5" r="2.5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="6" cy="12" r="2.5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="18" cy="19" r="2.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="m8.2 10.8 7.5-4.3M8.2 13.2l7.5 4.3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button></div>';
    document.body.appendChild(widget);
    widget.querySelector('[data-share-whatsapp]').addEventListener('click',()=>window.open('https://wa.me/?text='+encodeURIComponent(message),'_blank','noopener,noreferrer'));
    widget.querySelector('[data-share-copy]').addEventListener('click',async()=>{
      try{await navigator.clipboard.writeText(message);widget.querySelector('[data-share-copy]').textContent='Copied';setTimeout(()=>widget.querySelector('[data-share-copy]').textContent='Copy link',1400)}catch(_){window.prompt('Copy this NexusNova link:',message)}});
    widget.querySelector('[data-share-native]').addEventListener('click',async()=>{
      if(typeof navigator.share==='function'){
        try{await navigator.share({title:'NexusNova Tools',text:message,url});return}catch(error){if(error?.name==='AbortError')return}
      }
      try{await navigator.clipboard.writeText(message);widget.querySelector('[data-share-copy]').textContent='Copied';setTimeout(()=>widget.querySelector('[data-share-copy]').textContent='Copy link',1400)}catch(_){window.prompt('Copy this NexusNova link:',message)}
    });
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
  else mount();
})();
