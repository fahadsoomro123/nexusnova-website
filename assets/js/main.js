(()=>{
  'use strict';
  const measurementId='G-YLPFKWSS12';
  const consentKey='nexusnova_analytics_consent_v1';
  if(window.__nexusnovaConsentReady)return;
  window.__nexusnovaConsentReady=true;
  window.dataLayer=window.dataLayer||[];
  window.gtag=window.gtag||function(){window.dataLayer.push(arguments)};
  window.gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',wait_for_update:500});
  const readChoice=()=>{try{return localStorage.getItem(consentKey)||''}catch(_){return ''}};
  let analyticsLoaded=false;
  const loadAnalytics=(granted=true)=>{
    if(!granted||analyticsLoaded||document.querySelector('script[data-nexusnova-ga4]'))return;
    analyticsLoaded=true;
    window.gtag('consent','update',{analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
    window.gtag('config',measurementId,{send_page_view:true,allow_google_signals:false,allow_ad_personalization_signals:false});
    window.gtag('js',new Date());
    const script=document.createElement('script');script.async=true;script.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(measurementId);script.dataset.nexusnovaGa4='';document.head.appendChild(script);
  };
  const denyAnalytics=()=>window.gtag('consent','update',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
  const autoEnable=()=>{try{return Intl.DateTimeFormat().resolvedOptions().timeZone==='Asia/Karachi'||new Date().getTimezoneOffset()===-300}catch(_){return new Date().getTimezoneOffset()===-300}};
  window.__nexusnovaLoadAnalytics=granted=>loadAnalytics(Boolean(granted));
  const enable=()=>{const choice=readChoice();if(choice==='granted')loadAnalytics(true);else if(choice==='denied')denyAnalytics();else if(autoEnable()){window.__nexusnovaAnalyticsAutoEnabled=true;try{window.dispatchEvent(new Event('nexusnova-analytics-auto-enabled'))}catch(_){ }loadAnalytics(true);}};
  ['pointerdown','keydown'].forEach(type=>window.addEventListener(type,enable,{once:true,passive:true}));
  const deferred=()=>{const arm=()=>window.setTimeout(enable,5000);if('requestIdleCallback' in window)window.requestIdleCallback(arm,{timeout:2000});else arm();};
  if(document.readyState==='loading')window.addEventListener('load',deferred,{once:true});else deferred();

  // Keep every visible footer Contact link consistent across the entire site.
  const normalizeFooterContact=()=>{document.querySelectorAll('.site-footer .footer-links a[href="contact.html"]').forEach(link=>{link.textContent='Contact Us & Support';});};
  if(document.readyState==='loading')window.addEventListener('DOMContentLoaded',normalizeFooterContact,{once:true});else normalizeFooterContact();

  // Global page sharing: compact at rest, expandable on demand.
  const mountShareWidget=()=>{
    if(document.querySelector('[data-nexusnova-share-widget]'))return;
    const canonical=document.querySelector('link[rel="canonical"]')?.href||location.href.split('#')[0];
    const pageTitle=(document.querySelector('h1')?.textContent||document.title||'NexusNova Tools').trim().replace(/\s+/g,' ');
    const shareUrl=canonical;
    const shareMessage='Check out '+pageTitle+' on NexusNova Tools: '+shareUrl;
    const whatsappUrl='https://wa.me/?text='+encodeURIComponent(shareMessage);
    const style=document.createElement('style');
    style.dataset.nexusnovaShareStyle='';
    style.textContent=[
      '.nn-share-widget{position:fixed;right:20px;bottom:max(20px,env(safe-area-inset-bottom));z-index:80;font-family:inherit}',
      '.nn-share-fab{width:48px;height:48px;padding:0;border:1px solid rgba(255,255,255,.15);border-radius:15px;display:grid;place-items:center;color:var(--text,#f7fbff);background:rgba(7,17,31,.9);box-shadow:0 10px 28px rgba(0,0,0,.22);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);cursor:pointer;transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease,background .18s ease}',
      '.nn-share-fab:hover{transform:translateY(-2px);background:rgba(7,17,31,.97);border-color:rgba(121,242,192,.38);box-shadow:0 15px 34px rgba(0,0,0,.28)}',
      '.nn-share-fab:focus-visible{outline:3px solid rgba(121,242,192,.76);outline-offset:3px}',
      '.nn-share-fab svg{width:21px;height:21px}',
      '.nn-share-panel{position:absolute;right:0;bottom:58px;width:min(320px,calc(100vw - 28px));padding:15px;border:1px solid rgba(255,255,255,.12);border-radius:20px;background:rgba(7,17,31,.97);box-shadow:0 22px 60px rgba(0,0,0,.32);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);opacity:0;transform:translateY(8px) scale(.98);transform-origin:bottom right;pointer-events:none;transition:opacity .18s ease,transform .18s ease}',
      '.nn-share-widget.is-open .nn-share-panel{opacity:1;transform:none;pointer-events:auto}',
      '.nn-share-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:13px}',
      '.nn-share-copy strong{display:block;font-size:13px;line-height:1.25;color:var(--text,#f7fbff);letter-spacing:-.01em}',
      '.nn-share-copy span{display:block;margin-top:3px;font-size:10px;line-height:1.4;color:var(--muted,#a9b7c8)}',
      '.nn-share-close{width:30px;height:30px;padding:0;border:1px solid rgba(255,255,255,.1);border-radius:10px;display:grid;place-items:center;background:rgba(255,255,255,.05);color:var(--muted,#a9b7c8);font-size:16px;cursor:pointer}',
      '.nn-share-close:hover{background:rgba(255,255,255,.1);color:var(--text,#f7fbff)}',
      '.nn-share-actions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}',
      '.nn-share-btn{min-height:48px;padding:8px 6px;border:1px solid rgba(255,255,255,.1);border-radius:13px;display:grid;place-items:center;gap:5px;color:var(--text,#f7fbff);background:rgba(255,255,255,.045);font:750 10px/1 inherit;cursor:pointer;transition:transform .16s ease,background .16s ease,border-color .16s ease}',
      '.nn-share-btn:hover{transform:translateY(-1px);background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.18)}',
      '.nn-share-btn:focus-visible{outline:3px solid rgba(121,242,192,.72);outline-offset:2px}',
      '.nn-share-btn svg{width:18px;height:18px}',
      '.nn-share-whatsapp{border-color:rgba(121,242,192,.3);background:rgba(121,242,192,.08)}',
      '.nn-share-note{margin:10px 2px 0;font-size:9px;line-height:1.35;color:var(--muted,#a9b7c8);text-align:center}',
      '.nn-share-toast{position:fixed;right:20px;bottom:max(80px,calc(62px + env(safe-area-inset-bottom)));z-index:81;max-width:min(360px,calc(100vw - 32px));padding:11px 14px;border:1px solid rgba(121,242,192,.26);border-radius:12px;background:rgba(7,17,31,.97);color:#eafff6;font-size:12px;font-weight:800;line-height:1.35;box-shadow:0 14px 38px rgba(0,0,0,.3);opacity:0;transform:translateY(7px);pointer-events:none;transition:opacity .18s ease,transform .18s ease}',
      '.nn-share-toast.show{opacity:1;transform:none}',
      '@media(max-width:560px){.nn-share-widget{right:14px;bottom:max(14px,env(safe-area-inset-bottom))}.nn-share-fab{width:46px;height:46px;border-radius:14px}.nn-share-panel{right:0;bottom:55px;width:min(310px,calc(100vw - 28px));padding:13px}.nn-share-toast{left:14px;right:14px;bottom:max(70px,calc(58px + env(safe-area-inset-bottom)));max-width:none}}'
    ].join('');
    document.head.appendChild(style);

    const widget=document.createElement('div');
    widget.dataset.nexusnovaShareWidget='';
    widget.className='nn-share-widget';
    widget.innerHTML=[
      '<button class="nn-share-fab" type="button" aria-expanded="false" aria-controls="nn-share-panel" aria-label="Share this page" title="Share this page">',
        '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="2.25"></circle><circle cx="6" cy="12" r="2.25"></circle><circle cx="18" cy="19" r="2.25"></circle><path d="m8 11 7.8-4.3M8 13l7.8 4.3"></path></svg>',
      '</button>',
      '<div class="nn-share-panel" id="nn-share-panel" role="dialog" aria-label="Share this page" aria-hidden="true">',
        '<div class="nn-share-head">',
          '<div class="nn-share-copy"><strong>Share this page</strong><span>Send this NexusNova page to someone who may find it useful.</span></div>',
          '<button class="nn-share-close" type="button" aria-label="Close share panel" title="Close">×</button>',
        '</div>',
        '<div class="nn-share-actions">',
          '<button class="nn-share-btn nn-share-whatsapp" type="button" data-share-whatsapp aria-label="Share on WhatsApp" title="Share on WhatsApp"><svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M20.52 3.48A11.8 11.8 0 0 0 3.84 20.1L3 23l2.98-.78A11.8 11.8 0 0 0 20.52 3.48Zm-8.7 16.16a9.77 9.77 0 0 1-4.98-1.36l-.36-.22-1.77.46.47-1.72-.24-.37a9.77 9.77 0 1 1 6.88 3.21Zm5.35-7.34c-.29-.15-1.7-.84-1.96-.94-.26-.1-.45-.15-.64.15-.19.29-.74.94-.9 1.13-.16.2-.33.22-.62.08-.29-.15-1.23-.45-2.34-1.44-.87-.77-1.46-1.72-1.63-2.01-.17-.29-.02-.45.13-.59.13-.13.29-.33.44-.49.15-.16.2-.28.3-.47.1-.2.05-.37-.03-.52-.08-.15-.64-1.54-.87-2.11-.23-.55-.46-.47-.64-.48h-.55c-.19 0-.49.07-.75.36-.26.29-.98.96-.98 2.35s1 2.73 1.13 2.92c.14.2 1.96 2.99 4.75 4.19.66.28 1.18.45 1.58.58.67.21 1.28.18 1.76.11.54-.08 1.7-.69 1.94-1.35.24-.67.24-1.24.17-1.36-.06-.12-.25-.19-.54-.34Z"></path></svg><span>WhatsApp</span></button>',
          '<button class="nn-share-btn" type="button" data-share-copy aria-label="Copy page link" title="Copy page link"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="10" height="10" rx="2"></rect><path d="M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3"></path></svg><span>Copy link</span></button>',
          '<button class="nn-share-btn" type="button" data-share-native aria-label="More sharing options" title="More sharing options"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="7" cy="12" r="2"></circle><circle cx="17" cy="6" r="2"></circle><circle cx="17" cy="18" r="2"></circle><path d="m8.8 11 6.4-3.7M8.8 13l6.4 3.7"></path></svg><span>More</span></button>',
        '</div>',
        '<p class="nn-share-note">NexusNova Tools · no third-party share widget required</p>',
      '</div>'
    ].join('');
    document.body.appendChild(widget);

    const toast=document.createElement('div');
    toast.className='nn-share-toast';
    toast.setAttribute('role','status');
    toast.setAttribute('aria-live','polite');
    document.body.appendChild(toast);

    const fab=widget.querySelector('.nn-share-fab');
    const panel=widget.querySelector('.nn-share-panel');
    const close=widget.querySelector('.nn-share-close');
    let toastTimer=0;

    const setOpen=open=>{
      widget.classList.toggle('is-open',open);
      fab.setAttribute('aria-expanded',String(open));
      panel.setAttribute('aria-hidden',String(!open));
      if(open)window.setTimeout(()=>close.focus(),0);
      else fab.focus();
    };
    const showToast=message=>{
      toast.textContent=message;
      toast.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer=window.setTimeout(()=>toast.classList.remove('show'),2200);
    };
    fab.addEventListener('click',()=>setOpen(!widget.classList.contains('is-open')));
    close.addEventListener('click',()=>setOpen(false));
    widget.querySelector('[data-share-whatsapp]').addEventListener('click',()=>{window.open(whatsappUrl,'_blank','noopener,noreferrer');setOpen(false)});
    widget.querySelector('[data-share-copy]').addEventListener('click',async()=>{
      try{await navigator.clipboard.writeText(shareUrl);showToast('Page link copied.')}catch{
        const helper=document.createElement('textarea');helper.value=shareUrl;helper.setAttribute('readonly','');helper.style.position='fixed';helper.style.opacity='0';document.body.appendChild(helper);helper.select();
        let copied=false;try{copied=document.execCommand('copy')}catch{}helper.remove();showToast(copied?'Page link copied.':'Copy was blocked by the browser.');
      }
      setOpen(false);
    });
    widget.querySelector('[data-share-native]').addEventListener('click',async()=>{
      const data={title:pageTitle,text:shareMessage,url:shareUrl};
      if(typeof navigator.share==='function'&&(!navigator.canShare||navigator.canShare(data))){
        try{await navigator.share(data);setOpen(false);return}catch(error){if(error&&error.name==='AbortError')return;}
      }
      try{await navigator.clipboard.writeText(shareUrl);showToast('Page link copied.')}catch{showToast('More sharing is unavailable on this browser.');}
      setOpen(false);
    });
    document.addEventListener('click',event=>{if(widget.classList.contains('is-open')&&!widget.contains(event.target))setOpen(false)});
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&widget.classList.contains('is-open'))setOpen(false)});
  };

  // Mount after the page is interactive; first user interaction mounts immediately.
  const loadShareOnIntent=()=>mountShareWidget();
  ['pointerdown','keydown','touchstart','scroll'].forEach(type=>window.addEventListener(type,loadShareOnIntent,{once:true,passive:true}));
  const scheduleShare=()=>window.setTimeout(mountShareWidget,900);
  if(document.readyState==='loading')window.addEventListener('DOMContentLoaded',scheduleShare,{once:true});
  else scheduleShare();
  const inSubdir=/\/(guides|articles|tech)\//.test(location.pathname);const base=inSubdir?'../':'';
  const loadShell=()=>{if(document.querySelector('script[data-nexusnova-site-shell]'))return;const shell=document.createElement('script');shell.src=base+'assets/js/site-main.js?v=20260921-nav19';shell.dataset.nexusnovaSiteShell='';document.body.appendChild(shell);};
  const loadSocialShare=()=>{if(document.querySelector('script[data-nexusnova-social-share]'))return;const script=document.createElement('script');script.src=base+'assets/js/social-share.js?v=20260921-social3';script.dataset.nexusnovaSocialShare='';document.body.appendChild(script);};
  const scheduleShell=()=>{if(location.pathname==='/'||/\/index\.html$/.test(location.pathname)){const loadHomepageRuntime=()=>{loadShell();loadSocialShare();};if('requestIdleCallback' in window)window.requestIdleCallback(()=>window.setTimeout(loadHomepageRuntime,3200),{timeout:1800});else window.setTimeout(loadHomepageRuntime,3200);['pointerdown','keydown','scroll'].forEach(type=>window.addEventListener(type,loadHomepageRuntime,{once:true,passive:true}));return;}if('requestIdleCallback' in window){window.requestIdleCallback(loadShell,{timeout:1200});window.requestIdleCallback(loadSocialShare,{timeout:1800});}else{window.setTimeout(loadShell,120);window.setTimeout(loadSocialShare,1400);}};
  if(document.readyState==='loading')window.addEventListener('DOMContentLoaded',scheduleShell,{once:true});else scheduleShell();
})();
