(()=>{"use strict";
if(window.__nexusnovaSupportPreviewLoaded)return;
window.__nexusnovaSupportPreviewLoaded=true;

function mount(){
  if(document.querySelector("[data-nexusnova-support-preview]"))return;

  const nav=document.querySelector(".nn-header .nn-nav, header .nn-nav, [data-nn-nav], .site-header nav, .site-header .nav, .navin .navlinks");
  const row=(nav&&nav.closest(".nn-header-row"))||(nav&&nav.closest(".site-header"))||(nav&&nav.closest("header"));
  if(!nav||!row)return;

  const style=document.createElement("style");
  style.dataset.nexusnovaSupportPreviewStyle="";
  style.textContent=[
    ".nn-support-preview{display:inline-flex;align-items:center;gap:7px;margin-left:12px;padding-left:12px;border-left:1px solid #e2e8f0;white-space:nowrap;flex:0 0 auto}",
    ".nn-support-preview-mark{width:17px;height:17px;display:grid;place-items:center;color:#111827;font-size:15px;line-height:1;flex:0 0 auto}",
    ".nn-support-preview-label{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono',monospace;font-size:8px;font-weight:900;letter-spacing:.10em;text-transform:uppercase;color:#64748b}",
    ".nn-support-preview-amount{width:29px;height:24px;display:inline-flex!important;flex-direction:row!important;flex-wrap:nowrap!important;align-items:center!important;justify-content:center!important;gap:1px;white-space:nowrap;overflow:hidden;border:1px solid #cbd5e1;border-radius:0;background:#fff;color:#334155;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono',monospace;font-size:8px;font-weight:900;line-height:1;cursor:pointer;padding:0;transition:transform .15s ease,border-color .15s ease,color .15s ease,background .15s ease}",
    ".nn-support-preview-amount:hover,.nn-support-preview-amount:focus-visible{transform:translateY(-1px);border-color:#8b5cf6;color:#6d28d9}",
    ".nn-support-preview-amount.primary{background:#6d28d9;border-color:#6d28d9;color:#fff}",
    ".nn-support-preview-dollar{color:#00843d;font-size:8px!important;font-weight:inherit!important;line-height:1!important;vertical-align:baseline!important;position:static!important;display:inline!important;flex:0 0 auto}",
    ".nn-support-preview-amount.primary .nn-support-preview-dollar{color:#8af5b7!important}",
    ".nn-support-preview-number{display:inline!important;font-size:8px!important;line-height:1!important;font-weight:900!important;color:inherit!important;vertical-align:baseline!important;position:static!important;flex:0 0 auto}",
    "@media(max-width:1120px){.nn-support-preview{margin-left:6px;padding-left:8px;gap:5px}.nn-support-preview-label{display:none}.nn-support-preview-amount{width:28px;height:24px}}",
    "@media(max-width:760px){.nn-support-preview{width:100%;margin:2px 0 0;padding:5px 0 0;border-left:0;border-top:1px solid #e2e8f0;justify-content:flex-start;gap:6px}.nn-support-preview-label{display:inline}.nn-support-preview-amount{width:29px;height:24px}}"
  ].join("");
  document.head.appendChild(style);

  const wrap=document.createElement("div");
  wrap.className="nn-support-preview";
  wrap.dataset.nexusnovaSupportPreview="";
  wrap.setAttribute("aria-label","Support NexusNova with a one-time contribution");
  wrap.innerHTML=
    '<span class="nn-support-preview-mark" aria-hidden="true">☕</span>'+
    '<span class="nn-support-preview-label">Support</span>'+
    '<button type="button" class="nn-support-preview-amount" data-support-amount="3" aria-label="Support with $3"><span class="nn-support-preview-dollar">$</span><span class="nn-support-preview-number">3</span></button>'+
    '<button type="button" class="nn-support-preview-amount primary" data-support-amount="5" aria-label="Support with $5"><span class="nn-support-preview-dollar">$</span><span class="nn-support-preview-number">5</span></button>'+
    '<button type="button" class="nn-support-preview-amount" data-support-amount="10" aria-label="Support with $10"><span class="nn-support-preview-dollar">$</span><span class="nn-support-preview-number">10</span></button>'+
    '<button type="button" class="nn-support-preview-amount" data-support-amount="25" aria-label="Support with $25"><span class="nn-support-preview-dollar">$</span><span class="nn-support-preview-number">25</span></button>';

  row.appendChild(wrap);

  wrap.querySelectorAll("[data-support-amount]").forEach(btn=>{
    btn.addEventListener("click",()=>{
      wrap.querySelectorAll("[data-support-amount]").forEach(x=>x.classList.remove("primary"));
      btn.classList.add("primary");
    });
  });
}

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount,{once:true});
else mount();
})();