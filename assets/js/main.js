(()=>{
  'use strict';

  const enforceCleanCanonical=()=>{const link=document.querySelector('link[rel="canonical"]');if(!link)return;try{const canonical=new URL(link.getAttribute('href')||location.href,location.origin);canonical.search='';canonical.hash='';link.setAttribute('href',canonical.href);}catch(_){}};
  enforceCleanCanonical();
  if(document.readyState==='loading')window.addEventListener('DOMContentLoaded',enforceCleanCanonical,{once:true});
  const measurementId='G-YLPFKWSS12';
  if(window.__nexusnovaGa4BootstrapReady)return;
  window.__nexusnovaGa4BootstrapReady=true;

  /* Historical GA4 bootstrap: immediate collection, matching the 19 September 2026
     production behavior before the later performance deferral experiments. */
  window.__nexusnovaConsentReady=true;
  window.dataLayer=window.dataLayer||[];
  window.gtag=window.gtag||function(){window.dataLayer.push(arguments)};

  if(!document.querySelector('script[data-nexusnova-ga4]')){
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
  }

  /* Keep the current privacy-settings UI bridge functional while the historical
     GA4 loader remains automatic. */
  window.__nexusnovaLoadAnalytics=granted=>{
    if(!granted||document.querySelector('script[data-nexusnova-ga4]'))return;
    window.gtag('consent','update',{
      analytics_storage:'granted',
      ad_storage:'denied',
      ad_user_data:'denied',
      ad_personalization:'denied'
    });
  };
  const hydrateDynamicLinks=()=>{document.querySelectorAll('a[data-nova-dynamic-href]').forEach(link=>{const target=link.dataset.novaDynamicHref;if(!target)return;try{const url=new URL(target,location.href);if(['http:','https:'].includes(url.protocol))link.setAttribute('href',url.href);}catch(_){}})};
  const startDynamicLinkHydration=()=>{hydrateDynamicLinks();if(document.body){const observer=new MutationObserver(hydrateDynamicLinks);observer.observe(document.body,{childList:true,subtree:true});}};
  if(document.readyState==='loading')window.addEventListener('DOMContentLoaded',startDynamicLinkHydration,{once:true});else startDynamicLinkHydration();

  // Keep every visible footer Contact link consistent across the entire site.
  // Enforce the selected NexusNova logo at runtime on every shared header variant.
  const enforceSelectedHeaderLogo=()=>{
    const base=(document.querySelector('base')?.href||document.baseURI);
    const logoUrl=new URL((/\/(guides|articles|tech)\//.test(location.pathname)?'../':'')+'assets/logo.png',base).href;
    document.querySelectorAll('.site-header .brand-mark,.site-header .mark,nav.nav .brand .mark,.header .brandmark').forEach(mark=>{
      mark.style.backgroundImage='url("'+logoUrl.replace(/"/g,'%22')+'")';
      mark.style.backgroundSize='contain';
      mark.style.backgroundPosition='center';
      mark.style.backgroundRepeat='no-repeat';
      mark.style.color='transparent';
      mark.style.fontSize='0';
      mark.style.boxShadow='none';
    });
  };
  if(document.readyState==='loading')window.addEventListener('DOMContentLoaded',enforceSelectedHeaderLogo,{once:true});else enforceSelectedHeaderLogo();

  const normalizeFooterContact=()=>{document.querySelectorAll('.site-footer .footer-links a[href="contact.html"]').forEach(link=>{link.textContent='Contact Us & Support';});};
  if(document.readyState==='loading')window.addEventListener('DOMContentLoaded',normalizeFooterContact,{once:true});else normalizeFooterContact();

  // Keep legacy footer link lists from duplicating the structured footer on compact pages.
  const normalizeFooterStructure=()=>{
    document.querySelectorAll('.site-footer').forEach(footer=>{
      const structured=footer.querySelector('.footer-console,.footer-grid');
      const orphan=footer.querySelector(':scope > .footer-links');
      if(structured&&orphan)orphan.remove();
    });
  };
  if(document.readyState==='loading')window.addEventListener('DOMContentLoaded',normalizeFooterStructure,{once:true});else normalizeFooterStructure();

  // Global share action: one compact button, no in-page share panel.
  // Global share action: one compact button, no in-page share panel.
  const mountShareWidget=()=>{
    if(document.querySelector('[data-nexusnova-share-widget]'))return;
    const canonical=document.querySelector('link[rel="canonical"]')?.href||location.href.split('#')[0];
    const pageTitle=(document.querySelector('h1')?.textContent||document.title||'NexusNova Tools').trim().replace(/\s+/g,' ');
    const shareUrl=canonical;
    const shareText='Check out '+pageTitle+' on NexusNova Tools.';
    const style=document.createElement('style');
    style.dataset.nexusnovaShareStyle='';
    style.textContent=[
      '.nn-share-widget{position:fixed;right:16px;bottom:max(20px,env(safe-area-inset-bottom));z-index:80;font-family:inherit}',
      '.nn-share-fab{width:46px;height:46px;padding:0;border:1px solid rgba(15,23,42,.10);border-radius:15px;display:grid;place-items:center;color:#24324a;background:rgba(255,255,255,.92);box-shadow:0 10px 28px rgba(15,23,42,.16),0 0 0 1px rgba(122,167,255,.08);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);cursor:pointer;transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease}',
      '.nn-share-fab::before{content:"";position:absolute;inset:-1px;border-radius:15px;padding:1px;background:linear-gradient(135deg,rgba(121,242,192,.65),rgba(122,167,255,.55),rgba(184,135,255,.60));-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;pointer-events:none}',
      '.nn-share-fab:hover{transform:translateY(-2px);box-shadow:0 14px 32px rgba(15,23,42,.18),0 0 0 4px rgba(122,167,255,.08)}',
      '.nn-share-fab:active{transform:translateY(0) scale(.97)}',
      '.nn-share-fab:focus-visible{outline:3px solid rgba(121,242,192,.72);outline-offset:3px}',
      '.nn-share-fab svg{width:20px;height:20px}',
      '.nn-share-toast{position:fixed;left:50%;bottom:max(78px,calc(58px + env(safe-area-inset-bottom)));z-index:81;transform:translate(-50%,8px);max-width:min(340px,calc(100vw - 28px));padding:10px 13px;border:1px solid rgba(15,23,42,.10);border-radius:999px;background:rgba(255,255,255,.96);color:#24324a;font-size:11px;font-weight:800;line-height:1.3;box-shadow:0 12px 32px rgba(15,23,42,.16);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);opacity:0;pointer-events:none;transition:opacity .18s ease,transform .18s ease}',
      '.nn-share-toast.show{opacity:1;transform:translate(-50%,0)}',
      '@media(max-width:560px){.nn-share-widget{right:14px;bottom:max(14px,env(safe-area-inset-bottom))}.nn-share-fab{width:44px;height:44px;border-radius:14px}.nn-share-fab::before{border-radius:14px}.nn-share-toast{bottom:max(70px,calc(54px + env(safe-area-inset-bottom)));max-width:calc(100vw - 28px)}}',
      '@media(prefers-reduced-motion:reduce){.nn-share-fab,.nn-share-toast{transition:none}}'
    ].join('');
    document.head.appendChild(style);

    const widget=document.createElement('div');
    widget.dataset.nexusnovaShareWidget='';
    widget.className='nn-share-widget';
    widget.innerHTML='<button class="nn-share-fab" type="button" aria-label="Share this page" title="Share this page"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="2.25"></circle><circle cx="6" cy="12" r="2.25"></circle><circle cx="18" cy="19" r="2.25"></circle><path d="m8 11 7.8-4.3M8 13l7.8 4.3"></path></svg></button>';
    document.body.appendChild(widget);

    const toast=document.createElement('div');
    toast.className='nn-share-toast';
    toast.setAttribute('role','status');
    toast.setAttribute('aria-live','polite');
    document.body.appendChild(toast);

    const button=widget.querySelector('.nn-share-fab');
    let toastTimer=0;
    const showToast=message=>{
      toast.textContent=message;
      toast.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer=window.setTimeout(()=>toast.classList.remove('show'),2200);
    };
    const copyLink=async()=>{
      try{
        await navigator.clipboard.writeText(shareUrl);
        showToast('Page link copied.');
      }catch{
        const helper=document.createElement('textarea');
        helper.value=shareUrl;
        helper.setAttribute('readonly','');
        helper.style.position='fixed';
        helper.style.opacity='0';
        document.body.appendChild(helper);
        helper.select();
        let copied=false;
        try{copied=document.execCommand('copy')}catch{}
        helper.remove();
        showToast(copied?'Page link copied.':'Sharing is unavailable in this browser.');
      }
    };
    button.addEventListener('click',async()=>{
      const data={title:pageTitle,text:shareText,url:shareUrl};
      if(typeof navigator.share==='function'&&(!navigator.canShare||navigator.canShare(data))){
        try{
          await navigator.share(data);
          return;
        }catch(error){
          if(error&&error.name==='AbortError')return;
        }
      }
      await copyLink();
    });
  };

  const loadShareOnIntent=()=>mountShareWidget();
  ['pointerdown','keydown','touchstart','scroll'].forEach(type=>window.addEventListener(type,loadShareOnIntent,{once:true,passive:true}));
  const scheduleShare=()=>window.setTimeout(mountShareWidget,900);
  if(document.readyState==='loading')window.addEventListener('DOMContentLoaded',scheduleShare,{once:true});
  else scheduleShare();

  const inSubdir=/\/(guides|articles|tech)\//.test(location.pathname);const base=inSubdir?'../':'';
  const loadShell=()=>{if(document.querySelector('script[data-nexusnova-site-shell]'))return;const shell=document.createElement('script');shell.src=base+'assets/js/site-main.js?v=20260930-nav20';shell.dataset.nexusnovaSiteShell='';document.body.appendChild(shell);};
  const loadSocialShare=()=>{if(document.querySelector('script[data-nexusnova-social-share]'))return;const script=document.createElement('script');script.src=base+'assets/js/social-share.js?v=20260930-social4';script.dataset.nexusnovaSocialShare='';document.body.appendChild(script);};
  const scheduleShell=()=>{if(location.pathname==='/'||/\/index\.html$/.test(location.pathname)){const loadHomepageRuntime=()=>{loadShell();loadSocialShare();};if('requestIdleCallback' in window)window.requestIdleCallback(()=>window.setTimeout(loadHomepageRuntime,3200),{timeout:1800});else window.setTimeout(loadHomepageRuntime,3200);['pointerdown','keydown','scroll'].forEach(type=>window.addEventListener(type,loadHomepageRuntime,{once:true,passive:true}));return;}if('requestIdleCallback' in window){window.requestIdleCallback(loadShell,{timeout:1200});window.requestIdleCallback(loadSocialShare,{timeout:1800});}else{window.setTimeout(loadShell,120);window.setTimeout(loadSocialShare,1400);}};
  if(document.readyState==='loading')window.addEventListener('DOMContentLoaded',scheduleShell,{once:true});else scheduleShell();
})();
