(()=>{
  'use strict';
  const measurementId='G-YLPFKWSS12';
  if(window.__nexusnovaGa4BootstrapReady)return;
  window.__nexusnovaGa4BootstrapReady=true;
  const inSubdir=/\/(guides|articles|tech)\//.test(location.pathname);
  const base=inSubdir?'../':'';

  /* One automatic GA4 bootstrap. The existing site shell is loaded separately
     so its legacy analytics/consent bootstrap cannot initialize twice. */
  window.__nexusnovaConsentReady=true;
  window.dataLayer=window.dataLayer||[];
  window.gtag=window.gtag||function(){window.dataLayer.push(arguments)};

  const loadAnalytics=()=>{
    if(document.querySelector('script[data-nexusnova-ga4]'))return;
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
  /* Analytics is non-critical to first paint. Load it on real user intent so
     GA4 cannot occupy the homepage's initial render/main-thread budget. */
  ['pointerdown','keydown','touchstart','scroll'].forEach(type=>{
    window.addEventListener(type,loadAnalytics,{once:true,passive:true});
  });

  if(!document.querySelector('script[data-nexusnova-site-shell]')){
    const shell=document.createElement('script');
    shell.defer=true;
    shell.src=`${base}assets/js/site-main.js?v=20260920-nav4`;
    shell.dataset.nexusnovaSiteShell='';
    document.head.appendChild(shell);
  }
  /* Floating share/support widget: keeps sharing explicit, user-initiated,
     and lightweight. No automatic messages or background sharing occur. */
  if(!document.querySelector('[data-nexusnova-share-widget]')){
    const shareMessage='Bhai, check out this 100% Free and Private AI & Web Utility Tools website: https://nexusnovatools.com - Zero latency, works completely in the browser!';
    const shareUrl='https://nexusnovatools.com';
    const whatsappUrl='https://wa.me/?text='+encodeURIComponent(shareMessage);
    const style=document.createElement('style');
    style.dataset.nexusnovaShareStyle='';
    style.textContent=`
      .nn-share-widget{position:fixed;right:18px;bottom:18px;z-index:80;display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid rgba(255,255,255,.14);border-radius:18px;background:rgba(7,17,31,.94);box-shadow:0 18px 46px rgba(0,0,0,.34);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}
      .nn-share-label{display:flex;flex-direction:column;gap:1px;padding:0 4px 0 2px;line-height:1.15}
      .nn-share-label strong{font-size:13px;color:#f7fbff;letter-spacing:-.01em}
      .nn-share-label span{font-size:10px;color:#a9b7c8}
      .nn-share-actions{display:flex;gap:8px}
      .nn-share-btn{width:44px;height:44px;border:1px solid rgba(255,255,255,.12);border-radius:13px;display:grid;place-items:center;color:#f7fbff;background:rgba(255,255,255,.06);transition:transform .18s ease,background .18s ease,border-color .18s ease;box-shadow:none}
      .nn-share-btn:hover{transform:translateY(-1px);background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.22)}
      .nn-share-btn:focus-visible{outline:3px solid rgba(121,242,192,.78);outline-offset:3px}
      .nn-share-btn svg{width:21px;height:21px}
      .nn-share-whatsapp{color:#79f2c0;border-color:rgba(121,242,192,.28);background:rgba(121,242,192,.1)}
      .nn-share-whatsapp:hover{background:rgba(121,242,192,.17)}
      .nn-share-toast{position:fixed;right:18px;bottom:84px;z-index:81;max-width:min(360px,calc(100vw - 36px));padding:12px 15px;border:1px solid rgba(121,242,192,.3);border-radius:14px;background:rgba(7,17,31,.96);color:#eafff6;font-size:13px;font-weight:800;box-shadow:0 18px 45px rgba(0,0,0,.35);opacity:0;transform:translateY(8px);pointer-events:none;transition:opacity .2s ease,transform .2s ease}
      .nn-share-toast.show{opacity:1;transform:translateY(0)}
      @media(max-width:560px){
        .nn-share-widget{left:11px;right:11px;bottom:11px;justify-content:space-between;padding:9px 10px;border-radius:16px}
        .nn-share-label{min-width:0}
        .nn-share-label strong{font-size:12px}
        .nn-share-actions{flex-shrink:0}
        .nn-share-toast{left:11px;right:11px;bottom:78px;max-width:none}
      }
    `;
    document.head.appendChild(style);

    const widget=document.createElement('div');
    widget.dataset.nexusnovaShareWidget='';
    widget.className='nn-share-widget';
    widget.setAttribute('aria-label','Share and support NexusNova Tools');
    widget.innerHTML=`
      <div class="nn-share-label">
        <strong>Share &amp; Support this Free Tool</strong>
        <span>Help someone discover a useful free utility</span>
      </div>
      <div class="nn-share-actions">
        <button class="nn-share-btn nn-share-whatsapp" type="button" data-share-whatsapp aria-label="Share NexusNova Tools on WhatsApp" title="Share on WhatsApp">
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="none">
            <path d="M20.5 11.4A8.45 8.45 0 0 1 8.08 19.2L3.5 20.5l1.34-4.46A8.46 8.46 0 1 1 20.5 11.4Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>
            <path d="M8.38 7.55c.22-.48.48-.5.78-.51h.65c.2 0 .39.08.5.31l.72 1.62c.1.22.08.39-.07.58l-.52.63c-.12.15-.09.33 0 .49.4.68 1.03 1.31 1.68 1.72.17.11.34.14.48.01l.64-.58c.17-.15.35-.18.58-.08l1.55.73c.22.1.34.26.32.5-.06.46-.26.9-.61 1.23-.42.4-1.08.61-1.75.44-1.19-.31-2.53-1.13-3.63-2.17-1.06-1-1.88-2.17-2.18-3.2-.2-.68-.08-1.36.22-1.72Z" fill="currentColor"/>
          </svg>
        </button>
        <button class="nn-share-btn" type="button" data-share-copy aria-label="Copy NexusNova invitation link" title="Copy invite link">
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="none">
            <rect x="8" y="8" width="10" height="10" rx="2" stroke="currentColor" stroke-width="1.7"/>
            <path d="M6 16H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
          </svg>
        </button>
        <button class="nn-share-btn" type="button" data-share-native aria-label="Use device sharing to share NexusNova Tools" title="More sharing options">
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="none">
            <circle cx="18" cy="5" r="2.2" stroke="currentColor" stroke-width="1.7"/>
            <circle cx="6" cy="12" r="2.2" stroke="currentColor" stroke-width="1.7"/>
            <circle cx="18" cy="19" r="2.2" stroke="currentColor" stroke-width="1.7"/>
            <path d="M8 11l7.7-4.7M8 13l7.7 4.7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    `;
    document.body.appendChild(widget);

    const toast=document.createElement('div');
    toast.className='nn-share-toast';
    toast.setAttribute('role','status');
    toast.setAttribute('aria-live','polite');
    document.body.appendChild(toast);

    let toastTimer=0;
    const showToast=(message)=>{
      toast.textContent=message;
      toast.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer=window.setTimeout(()=>toast.classList.remove('show'),2400);
    };

    const copyInvite=async()=>{
      try{
        await navigator.clipboard.writeText(shareMessage);
        showToast('Invite message copied successfully. Share it with a friend!');
      }catch{
        const helper=document.createElement('textarea');
        helper.value=shareMessage;
        helper.setAttribute('readonly','');
        helper.style.position='fixed';
        helper.style.opacity='0';
        document.body.appendChild(helper);
        helper.select();
        let copied=false;
        try{copied=document.execCommand('copy')}catch{}
        helper.remove();
        showToast(copied?'Invite message copied successfully. Share it with a friend!':'Copy was blocked by the browser. Please copy the message manually.');
      }
    };

    widget.querySelector('[data-share-whatsapp]').addEventListener('click',()=>{
      window.open(whatsappUrl,'_blank','noopener,noreferrer');
    });

    widget.querySelector('[data-share-copy]').addEventListener('click',copyInvite);

    widget.querySelector('[data-share-native]').addEventListener('click',async()=>{
      if(typeof navigator.share==='function'){
        try{
          await navigator.share({title:'NexusNova Tools',text:shareMessage,url:shareUrl});
          showToast('Share sheet opened successfully.');
          return;
        }catch(error){
          if(error&&error.name==='AbortError')return;
        }
      }
      await copyInvite();
    });
  }

})();