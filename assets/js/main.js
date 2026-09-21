(()=>{
  'use strict';
  const measurementId='G-YLPFKWSS12';
  const consentKey='nexusnova_analytics_consent_v1';
  if(window.__nexusnovaConsentReady)return;
  window.__nexusnovaConsentReady=true;
  window.dataLayer=window.dataLayer||[];
  window.gtag=window.gtag||function(){window.dataLayer.push(arguments)};
  window.gtag('consent','default',{
    analytics_storage:'denied',
    ad_storage:'denied',
    ad_user_data:'denied',
    ad_personalization:'denied',
    wait_for_update:500
  });
  window.gtag('js',new Date());

  const readChoice=()=>{try{return localStorage.getItem(consentKey)||''}catch(_){return ''}};
  const saveChoice=value=>{try{localStorage.setItem(consentKey,value)}catch(_){} };
  let analyticsLoaded=false;
  const loadAnalytics=(granted=true)=>{
    if(!granted)return;
    window.gtag('consent','update',{
      analytics_storage:'granted',
      ad_storage:'denied',
      ad_user_data:'denied',
      ad_personalization:'denied'
    });
    if(analyticsLoaded||document.querySelector('script[data-nexusnova-ga4]'))return;
    analyticsLoaded=true;
    window.gtag('js',new Date());
    const analyticsScript=document.createElement('script');
    analyticsScript.async=true;
    analyticsScript.src=`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    analyticsScript.dataset.nexusnovaGa4='';
    analyticsScript.onload=()=>window.gtag('config',measurementId,{
      send_page_view:true,
      allow_google_signals:false,
      allow_ad_personalization_signals:false
    });
    document.head.appendChild(analyticsScript);
  };
  const denyAnalytics=()=>window.gtag('consent','update',{
    analytics_storage:'denied',
    ad_storage:'denied',
    ad_user_data:'denied',
    ad_personalization:'denied'
  });
  const shouldAutoEnableAnalytics=()=>{
    try{return Intl.DateTimeFormat().resolvedOptions().timeZone==='Asia/Karachi'}catch(_){return false}
  };
  window.__nexusnovaLoadAnalytics=granted=>loadAnalytics(Boolean(granted));
  window.__nexusnovaConsentKey=consentKey;

  const mountChoices=()=>{
    if(document.querySelector('[data-nexusnova-consent]'))return;
    const inSubdir=/\/(guides|articles|tech)\//.test(location.pathname);
    const base=inSubdir?'../':'';
    const style=document.createElement('style');
    style.dataset.nexusnovaConsentStyle='';
    style.textContent='.nn-consent{position:fixed;left:16px;right:16px;bottom:16px;z-index:9999;max-width:780px;margin:auto;padding:16px 18px;border:1px solid #cbd5e1;border-radius:18px;background:#fff;color:#111827;box-shadow:0 18px 55px rgba(15,23,42,.22);font:14px/1.45 system-ui,sans-serif}.nn-consent[hidden]{display:none}.nn-consent p{margin:0 0 12px}.nn-consent-actions{display:flex;gap:8px;flex-wrap:wrap}.nn-consent button,.nn-privacy-choice{border:1px solid #cbd5e1;border-radius:999px;padding:9px 13px;background:#fff;color:#111827;font:700 13px system-ui,sans-serif;cursor:pointer}.nn-consent .primary{background:#111827;color:#fff;border-color:#111827}.nn-consent a{color:inherit;text-decoration:underline}.nn-privacy-choice{position:fixed;right:14px;bottom:14px;z-index:9998;box-shadow:0 8px 24px rgba(15,23,42,.14)}@media(max-width:640px){.nn-consent{left:10px;right:10px;bottom:10px}.nn-privacy-choice{right:10px;bottom:10px}}';
    document.head.appendChild(style);
    const banner=document.createElement('div');
    banner.className='nn-consent';
    banner.dataset.nexusnovaConsent='';
    banner.setAttribute('role','dialog');
    banner.setAttribute('aria-label','Analytics privacy choice');
    banner.innerHTML=`<p><strong>Optional analytics</strong><br>NexusNova can use Google Analytics to measure website traffic. You can allow or decline optional analytics at any time. <a href="${base}privacy.html">Privacy details</a>.</p><div class="nn-consent-actions"><button type="button" class="primary" data-consent-allow>Allow analytics</button><button type="button" data-consent-deny>No thanks</button></div>`;
    document.body.appendChild(banner);
    const reopen=document.createElement('button');
    reopen.type='button';
    reopen.className='nn-privacy-choice';
    reopen.textContent='Privacy choices';
    reopen.setAttribute('aria-label','Open analytics privacy choices');
    document.body.appendChild(reopen);
    const hide=()=>{banner.hidden=true};
    banner.querySelector('[data-consent-allow]').addEventListener('click',()=>{saveChoice('granted');loadAnalytics();hide()});
    banner.querySelector('[data-consent-deny]').addEventListener('click',()=>{saveChoice('denied');denyAnalytics();hide()});
    reopen.addEventListener('click',()=>{banner.hidden=false;banner.querySelector('button')?.focus()});
    const choice=readChoice();
    if(choice==='granted'||choice==='denied'||(!choice&&shouldAutoEnableAnalytics()))hide();
    else banner.hidden=false;
  };
  const runDeferredAnalytics=()=>{
    const choice=readChoice();
    if(choice==='granted'||(!choice&&shouldAutoEnableAnalytics()))loadAnalytics(true);
    else if(choice==='denied')denyAnalytics();
  };
  const loadAnalyticsOnIntent=()=>{
    const choice=readChoice();
    if(choice==='granted'||(!choice&&shouldAutoEnableAnalytics()))loadAnalytics(true);
  };
  ['pointerdown','keydown','touchstart','scroll'].forEach(type=>window.addEventListener(type,loadAnalyticsOnIntent,{once:true,passive:true}));
  const scheduleDeferred=()=>window.setTimeout(runDeferredAnalytics,7000);
  const scheduleChoices=()=>window.setTimeout(mountChoices,7000);
  if(document.readyState==='loading'){
    window.addEventListener('load',scheduleDeferred,{once:true});
    window.addEventListener('load',scheduleChoices,{once:true});
  }else{
    scheduleDeferred();
    scheduleChoices();
  }

  const inSubdir=/\/(guides|articles|tech)\//.test(location.pathname);
  const base=inSubdir?'../':'';
  if(!document.querySelector('script[data-nexusnova-site-shell]')){
    const shell=document.createElement('script');
    shell.defer=true;
    shell.src=`${base}assets/js/site-main.js?v=20260920-nav4`;
    shell.dataset.nexusnovaSiteShell='';
    document.head.appendChild(shell);
  }

  const mountShareWidget=()=>{
    if(document.querySelector('[data-nexusnova-share-widget]'))return;
    const shareMessage='Bhai, check out this 100% Free and Private AI & Web Utility Tools website: https://nexusnovatools.com - Zero latency, works completely in the browser!';
    const shareUrl='https://nexusnovatools.com';
    const whatsappUrl='https://wa.me/?text='+encodeURIComponent(shareMessage);
    const style=document.createElement('style');
    style.dataset.nexusnovaShareStyle='';
    style.textContent='.nn-share-widget{position:fixed;right:18px;bottom:18px;z-index:80;display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid rgba(255,255,255,.14);border-radius:18px;background:rgba(7,17,31,.94);box-shadow:0 18px 46px rgba(0,0,0,.34);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}.nn-share-label{display:flex;flex-direction:column;gap:1px;padding:0 4px 0 2px;line-height:1.15}.nn-share-label strong{font-size:13px;color:#f7fbff;letter-spacing:-.01em}.nn-share-label span{font-size:10px;color:#a9b7c8}.nn-share-actions{display:flex;gap:8px}.nn-share-btn{width:44px;height:44px;border:1px solid rgba(255,255,255,.12);border-radius:13px;display:grid;place-items:center;color:#f7fbff;background:rgba(255,255,255,.06);transition:transform .18s ease,background .18s ease,border-color .18s ease;box-shadow:none}.nn-share-btn:hover{transform:translateY(-1px);background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.22)}.nn-share-btn:focus-visible{outline:3px solid rgba(121,242,192,.78);outline-offset:3px}.nn-share-btn svg{width:21px;height:21px}.nn-share-whatsapp{color:#79f2c0;border-color:rgba(121,242,192,.28);background:rgba(121,242,192,.1)}.nn-share-toast{position:fixed;right:18px;bottom:84px;z-index:81;max-width:min(360px,calc(100vw - 36px));padding:12px 15px;border:1px solid rgba(121,242,192,.3);border-radius:14px;background:rgba(7,17,31,.96);color:#eafff6;font-size:13px;font-weight:800;box-shadow:0 18px 45px rgba(0,0,0,.35);opacity:0;transform:translateY(8px);pointer-events:none;transition:opacity .2s ease,transform .2s ease}.nn-share-toast.show{opacity:1;transform:translateY(0)}@media(max-width:560px){.nn-share-widget{left:11px;right:11px;bottom:11px;justify-content:space-between;padding:9px 10px;border-radius:16px}.nn-share-label{min-width:0}.nn-share-label strong{font-size:12px}.nn-share-actions{flex-shrink:0}.nn-share-toast{left:11px;right:11px;bottom:78px;max-width:none}}';
    document.head.appendChild(style);
    const widget=document.createElement('div');
    widget.dataset.nexusnovaShareWidget='';
    widget.className='nn-share-widget';
    widget.setAttribute('aria-label','Share and support NexusNova Tools');
    widget.innerHTML='<div class="nn-share-label"><strong>Share &amp; Support this Free Tool</strong><span>Help someone discover a useful free utility</span></div><div class="nn-share-actions"><button class="nn-share-btn nn-share-whatsapp" type="button" data-share-whatsapp aria-label="Share NexusNova Tools on WhatsApp" title="Share on WhatsApp">WhatsApp</button><button class="nn-share-btn" type="button" data-share-copy aria-label="Copy NexusNova invitation link" title="Copy invite link">Copy</button><button class="nn-share-btn" type="button" data-share-native aria-label="Use device sharing to share NexusNova Tools" title="More sharing options">Share</button></div>';
    document.body.appendChild(widget);
    const toast=document.createElement('div');
    toast.className='nn-share-toast';
    toast.setAttribute('role','status');
    toast.setAttribute('aria-live','polite');
    document.body.appendChild(toast);
    let toastTimer=0;
    const showToast=message=>{toast.textContent=message;toast.classList.add('show');clearTimeout(toastTimer);toastTimer=window.setTimeout(()=>toast.classList.remove('show'),2400)};
    const copyInvite=async()=>{try{await navigator.clipboard.writeText(shareMessage);showToast('Invite message copied successfully. Share it with a friend!')}catch{showToast('Copy was blocked by the browser. Please copy the message manually.')}};
    widget.querySelector('[data-share-whatsapp]').addEventListener('click',()=>window.open(whatsappUrl,'_blank','noopener,noreferrer'));
    widget.querySelector('[data-share-copy]').addEventListener('click',copyInvite);
    widget.querySelector('[data-share-native]').addEventListener('click',async()=>{if(typeof navigator.share==='function'){try{await navigator.share({title:'NexusNova Tools',text:shareMessage,url:shareUrl});showToast('Share sheet opened successfully.');return}catch(error){if(error&&error.name==='AbortError')return}}await copyInvite()});
  };
  const loadShareOnIntent=()=>mountShareWidget();
  ['pointerdown','keydown','touchstart','scroll'].forEach(type=>window.addEventListener(type,loadShareOnIntent,{once:true,passive:true}));
  const scheduleShare=()=>window.setTimeout(mountShareWidget,7000);
  if(document.readyState==='loading')window.addEventListener('load',scheduleShare,{once:true});
  else scheduleShare();
})();
