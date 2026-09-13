(()=>{
  const boot=()=>{
    if(document.getElementById('nexusnova-privacy-ui')) return;

    const footer=document.querySelector('.site-footer .footer-bottom')||document.querySelector('.site-footer .footer-console');
    const sourceBanner=document.getElementById('nexusnova-analytics-consent');
    if(!footer||!sourceBanner) return;

    const existing=footer.querySelector('[data-nexusnova-privacy-settings-link]');
    const trigger=existing||document.createElement('button');
    if(!existing){
      trigger.type='button';
      trigger.textContent='Privacy & Analytics';
      trigger.dataset.nexusnovaPrivacySettingsLink='1';
      footer.appendChild(trigger);
    }
    trigger.setAttribute('aria-haspopup','dialog');
    trigger.setAttribute('aria-controls','nexusnova-privacy-ui');
    trigger.style.cssText='display:inline-block;margin-left:12px;padding:0;border:0;background:none;color:inherit;text-decoration:underline;font:inherit;font-size:12px;cursor:pointer;position:relative;z-index:2;touch-action:manipulation;pointer-events:auto';

    const style=document.createElement('style');
    style.textContent='#nexusnova-privacy-ui{position:fixed;inset:0;z-index:2147483646;display:none;place-items:center;padding:20px;background:rgba(2,8,23,.42);isolation:isolate}#nexusnova-privacy-ui[data-open="true"]{display:grid}#nexusnova-privacy-ui .nn-privacy-dialog{width:min(560px,calc(100vw - 32px));max-height:min(80vh,640px);overflow:auto;padding:22px;border:1px solid rgba(15,23,42,.18);border-radius:18px;background:#fff;color:#111827;box-shadow:0 24px 70px rgba(15,23,42,.28);font:14px/1.5 system-ui,sans-serif}#nexusnova-privacy-ui .nn-privacy-title{margin:0 0 8px;font-size:20px;line-height:1.2;font-weight:800}#nexusnova-privacy-ui .nn-privacy-copy{margin:0 0 16px}#nexusnova-privacy-ui .nn-privacy-actions{display:flex;flex-wrap:wrap;gap:8px}#nexusnova-privacy-ui .nn-privacy-actions button{border:1px solid #cbd5e1;border-radius:999px;padding:9px 13px;background:#fff;color:#111827;font:700 13px system-ui,sans-serif;cursor:pointer}#nexusnova-privacy-ui .nn-privacy-actions .primary{background:#111827;color:#fff;border-color:#111827}#nexusnova-privacy-ui .nn-privacy-close{float:right;border:0;background:transparent;color:#475569;font-size:24px;line-height:1;cursor:pointer;padding:2px 6px}#nexusnova-privacy-ui .nn-privacy-details{color:inherit;text-decoration:underline}';
    document.head.appendChild(style);

    const dialog=document.createElement('div');
    dialog.id='nexusnova-privacy-ui';
    dialog.hidden=true;
    dialog.innerHTML='<div class="nn-privacy-dialog" role="dialog" aria-modal="true" aria-labelledby="nexusnova-privacy-title"><button type="button" class="nn-privacy-close" data-close aria-label="Close privacy and analytics settings">×</button><h2 id="nexusnova-privacy-title" class="nn-privacy-title">Privacy & Analytics</h2><p class="nn-privacy-copy">Anonymous measurement is on. NexusNova uses denied-storage Consent Mode for basic cookieless measurement. Choose <strong>Allow detailed analytics</strong> to enable fuller GA4 analytics; advertising and personalization remain off. <a class="nn-privacy-details" href="privacy.html">Privacy details</a>.</p><div class="nn-privacy-actions"><button type="button" class="primary" data-allow>Allow detailed analytics</button><button type="button" data-deny>Keep basic measurement</button><button type="button" data-dismiss>Dismiss</button></div></div>';
    document.body.appendChild(dialog);

    sourceBanner.hidden=true;
    sourceBanner.setAttribute('aria-hidden','true');
    sourceBanner.style.display='none';
    sourceBanner.querySelector('[data-consent-allow]')?.addEventListener('click',e=>e.stopImmediatePropagation(),true);

    const save=key=>{try{localStorage.setItem('nexusnova_analytics_consent_v1',key)}catch(_) {}};
    const apply=choice=>{
      save(choice);
      if(typeof window.gtag==='function') window.gtag('consent','update',choice==='granted'?{analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'}:{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
    };
    let lastTrigger=null;
    const close=()=>{dialog.hidden=true;dialog.removeAttribute('data-open');dialog.setAttribute('aria-hidden','true');lastTrigger?.focus?.()};
    const open=event=>{event?.preventDefault();lastTrigger=trigger;dialog.hidden=false;dialog.setAttribute('data-open','true');dialog.setAttribute('aria-hidden','false');dialog.querySelector('[data-allow]')?.focus()};

    trigger.addEventListener('click',open);
    dialog.querySelector('[data-close]').addEventListener('click',close);
    dialog.querySelector('[data-dismiss]').addEventListener('click',close);
    dialog.querySelector('[data-allow]').addEventListener('click',()=>{apply('granted');close()});
    dialog.querySelector('[data-deny]').addEventListener('click',()=>{apply('denied');close()});
    dialog.addEventListener('click',event=>{if(event.target===dialog)close()});
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!dialog.hidden)close()});

    document.documentElement.classList.add('nexusnova-privacy-ui-ready');
    if(location.hash==='#privacy-analytics-settings') history.replaceState(null,'',location.pathname+location.search);
  };

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();