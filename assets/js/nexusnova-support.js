(()=>{"use strict";
if(window.__nexusnovaSupportReady)return;
if(/\/(humanproof-checkout|humanproof-payment-success(?:-v2)?|humanproof-payment-cancelled|support-payment-success|support-payment-cancelled|register)\.html$/i.test(location.pathname))return;
function getSandboxPreviewApiBase(){
  // API overrides are accepted only on raw.githack preview URLs, never on the live domain.
  if(location.hostname!=="raw.githack.com")return "";
  const raw=new URLSearchParams(location.search).get("supportApiBase");
  if(!raw)return "";
  try{
    const url=new URL(raw);
    return url.protocol==="https:"&&/^[a-z0-9-]+\.workers\.dev$/i.test(url.hostname)?url.origin:"";
  }catch(_){return "";}
}
const SUPPORT_API_BASE=getSandboxPreviewApiBase();
window.__nexusnovaSupportReady=true;

function mount(){
  if(document.querySelector("[data-nexusnova-support]"))return;
  const nav=document.querySelector(".nn-header .nn-nav, header .nn-nav, [data-nn-nav], .site-header nav, .site-header .nav, .navin .navlinks");
  const row=(nav&&nav.closest(".nn-header-row"))||(nav&&nav.closest(".site-header"))||(nav&&nav.closest("header"));
  if(!nav||!row)return;
  row.classList.add("nn-support-row");

  if(!document.querySelector("style[data-nexusnova-support-style]")){
    const style=document.createElement("style");
    style.dataset.nexusnovaSupportStyle="";
    style.textContent=[
      ".nn-support{display:inline-flex;align-items:center;gap:7px;margin-left:12px;padding-left:12px;border-left:1px solid #e2e8f0;white-space:nowrap;flex:0 0 auto;font-family:inherit}",
      ".nn-support-cup{width:20px;height:20px;display:grid;place-items:center;font-size:17px;line-height:1;flex:0 0 auto}",
      ".nn-support-copy{display:flex;flex-direction:column;gap:2px;min-width:0;width:170px;max-width:170px;margin-right:3px;line-height:1.2;white-space:normal}",
      ".nn-support-copy strong{font-size:10px;font-weight:850;color:#1f2937;white-space:normal;line-height:1.15}",
      ".nn-support-copy small{display:block;font-size:8px;font-weight:550;color:#64748b;white-space:normal;max-width:170px;line-height:1.25}",
      ".nn-support-amount{width:29px;height:24px;display:inline-flex!important;flex-direction:row!important;flex-wrap:nowrap!important;align-items:center!important;justify-content:center!important;gap:1px;white-space:nowrap;overflow:hidden;border:1px solid #cbd5e1;border-radius:0;background:#fff;color:#334155;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono',monospace;font-size:8px;font-weight:900;line-height:1;cursor:pointer;padding:0;transition:transform .15s ease,border-color .15s ease,color .15s ease,background .15s ease}",
      ".nn-support-amount:hover,.nn-support-amount:focus-visible{transform:translateY(-1px);border-color:#8b5cf6;color:#6d28d9}",
      ".nn-support-amount.primary{background:#6d28d9;border-color:#6d28d9;color:#fff}",
      ".nn-support-dollar{color:#00843d;font-size:8px!important;font-weight:inherit!important;line-height:1!important;vertical-align:baseline!important;position:static!important;display:inline!important;flex:0 0 auto}",
      ".nn-support-amount.primary .nn-support-dollar{color:#8af5b7!important}",
      ".nn-support-number{display:inline!important;font-size:8px!important;line-height:1!important;font-weight:900!important;color:inherit!important;vertical-align:baseline!important;position:static!important;flex:0 0 auto}",
      ".nn-support-feedback{display:none;flex:0 0 100%;width:100%;font-size:10px;line-height:1.4;color:#a12626;white-space:normal;margin-top:3px}",
      ".nn-support-feedback[data-visible=true]{display:block}",
      ".nn-support-amount:disabled{opacity:.62;cursor:wait;transform:none}",
      "@media(min-width:1121px) and (max-width:1280px){.nn-support-copy{width:145px;max-width:145px}.nn-support-copy strong{font-size:9px}.nn-support-copy small{font-size:7px;display:block}}",
      "@media(min-width:761px) and (max-width:1440px){.nn-support-row{flex-wrap:wrap!important}.nn-support{flex:0 0 100%;width:100%;max-width:100%;box-sizing:border-box;margin:6px 0 0;padding:8px 0 3px;border-left:0;border-top:1px solid #e2e8f0;justify-content:flex-start;gap:8px;white-space:normal}.nn-support-copy{width:auto;max-width:none;flex:1;min-width:220px}.nn-support-copy strong{font-size:11px}.nn-support-copy small{display:block;font-size:9px;max-width:none}.nn-support-amount{width:34px;height:27px;flex:0 0 34px}}",
      "@media(max-width:760px){.nn-support-row{flex-wrap:wrap!important}.nn-support{flex:0 0 100%;width:100%;max-width:100%;box-sizing:border-box;margin:7px 0 0;padding:8px 0 2px;border-left:0;border-top:1px solid #e2e8f0;justify-content:flex-start;gap:7px;flex-wrap:wrap;white-space:normal}.nn-support-copy{width:auto;max-width:none;flex:1 1 100%;order:1}.nn-support-copy strong{font-size:11px;line-height:1.2}.nn-support-copy small{display:block;font-size:9px;line-height:1.3;max-width:100%}.nn-support-cup{order:0}.nn-support-amount{width:29px;height:24px;flex:0 0 29px;order:2}.nn-support-feedback{order:3}}",
      "@media(prefers-reduced-motion:reduce){.nn-support-amount{transition:none}}"
    ].join("");
    document.head.appendChild(style);
  }

  const wrap=document.createElement("div");
  wrap.className="nn-support";
  wrap.dataset.nexusnovaSupport="";
  wrap.setAttribute("aria-label","Support NexusNova with a one-time contribution");
  wrap.innerHTML=
    '<span class="nn-support-cup" aria-hidden="true">☕</span>'+
    '<span class="nn-support-copy"><strong>Keep NexusNova’s free tools online</strong><small>One-time support helps cover hosting, maintenance and new tools.</small></span>'+
    '<button type="button" class="nn-support-amount" data-support-amount="3" aria-label="Support with $3"><span class="nn-support-dollar">$</span><span class="nn-support-number">3</span></button>'+
    '<button type="button" class="nn-support-amount primary" data-support-amount="5" aria-label="Support with $5"><span class="nn-support-dollar">$</span><span class="nn-support-number">5</span></button>'+
    '<button type="button" class="nn-support-amount" data-support-amount="10" aria-label="Support with $10"><span class="nn-support-dollar">$</span><span class="nn-support-number">10</span></button>'+
    '<button type="button" class="nn-support-amount" data-support-amount="25" aria-label="Support with $25"><span class="nn-support-dollar">$</span><span class="nn-support-number">25</span></button>'+
    '<span class="nn-support-feedback" role="status" aria-live="polite" data-support-feedback></span>';
  row.appendChild(wrap);

  const feedback=wrap.querySelector("[data-support-feedback]");
  const buttons=Array.from(wrap.querySelectorAll("[data-support-amount]"));
  buttons.forEach(btn=>{
    btn.addEventListener("click",async()=>{
      if(buttons.some(x=>x.disabled))return;
      const amount=Number(btn.getAttribute("data-support-amount"));
      buttons.forEach(x=>{x.disabled=true;x.classList.toggle("primary",x===btn)});
      feedback.textContent="Connecting to secure checkout…";
      feedback.style.color="#64748b";
      feedback.dataset.visible="true";
      try{
        const endpoint=SUPPORT_API_BASE
          ? new URL("/api/support/create-checkout",SUPPORT_API_BASE).href
          : "/api/support/create-checkout";
        const response=await fetch(endpoint,{
          method:"POST",
          headers:{"content-type":"application/json"},
          cache:"no-store",
          credentials:SUPPORT_API_BASE?"omit":"same-origin",
          body:JSON.stringify({amount})
        });
        let data={};
        try{data=await response.json()}catch{}
        if(!response.ok||!data.ok||typeof data.checkout_url!=="string"){
          throw new Error("checkout_unavailable");
        }
        const target=new URL(data.checkout_url);
        if(target.protocol!=="https:"||!(target.hostname==="getsafepay.com"||target.hostname.endsWith(".getsafepay.com"))){
          throw new Error("invalid_checkout_host");
        }
        window.location.assign(target.href);
      }catch(_){
        feedback.textContent="Secure checkout is temporarily unavailable. No payment was taken. Please try again later or contact NexusNova support.";
        feedback.style.color="#a12626";
        buttons.forEach(x=>{x.disabled=false});
      }
    });
  });
}

function start(){
  mount();
  if(document.body&&!window.__nexusnovaSupportObserver){
    window.__nexusnovaSupportObserver=new MutationObserver(()=>{
      if(!document.querySelector("[data-nexusnova-support]"))mount();
    });
    window.__nexusnovaSupportObserver.observe(document.body,{childList:true,subtree:true});
  }
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});
else start();
})();