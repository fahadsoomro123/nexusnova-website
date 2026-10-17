document.addEventListener("DOMContentLoaded",function(){
  function normalizeInnerHeader(){
    const headers=[...document.querySelectorAll("header")].filter(h=>!h.parentElement?.closest("header"));
    const header=headers.find(h=>h.querySelector("nav"))||headers[0];
    if(!header) return;
    headers.filter(h=>h!==header).forEach(h=>h.remove());
    const navs=[...header.querySelectorAll("nav")];
    const nav=navs.find(n=>n.matches("[data-nn-nav],.nn-nav,.nn-global-shell-nav,[role='navigation']"))||navs[0];
    if(nav){
      const seen=new Set();
      navs.filter(n=>n!==nav).forEach(extra=>{
        extra.querySelectorAll("a[href]").forEach(a=>{
          const key=new URL(a.getAttribute("href")||a.href,location.href).pathname;
          if(!seen.has(key)&&![...nav.querySelectorAll("a[href]")].some(x=>new URL(x.getAttribute("href")||x.href,location.href).pathname===key)) nav.appendChild(a.cloneNode(true));
        });
        extra.remove();
      });
      nav.querySelectorAll("a[href]").forEach(a=>{
        const key=new URL(a.getAttribute("href")||a.href,location.href).pathname;
        if(seen.has(key)) a.remove(); else seen.add(key);
      });
    }
    const searches=[...header.querySelectorAll("input[type='search'],form[role='search'] input")];
    const kept=new Set();
    searches.forEach(input=>{
      if(kept.size===0){kept.add(input);return;}
      const form=input.closest("form[role='search'],.nn-global-search");
      if(form) form.remove(); else input.remove();
    });
  }

  normalizeInnerHeader();
  const yearEls=document.querySelectorAll("[data-year]");
  yearEls.forEach(function(el){el.textContent=new Date().getFullYear();});
  function ensureTrustFooter(){
    const trustDestinations = [
      { label:"Terms", href:"/terms.html" },
      { label:"Refund Policy", href:"/refund-policy.html" },
      { label:"About", href:"/about.html" },
      { label:"Editorial Team", href:"/editorial-team.html" },
      { label:"Editorial Policy", href:"/editorial-policy.html" },
      { label:"Tool Methodology", href:"/tool-methodology.html" },
      { label:"FAQ", href:"/faq.html" },
      { label:"Privacy", href:"/privacy.html" },
      { label:"Contact Us & Support", href:"/contact.html" },
      { label:"Disclaimer", href:"/disclaimer.html" }
    ];

    document.querySelectorAll(".nn-footer .nn-footer-links").forEach(function(nav){
      if(nav.querySelector(".nn-footer-trust")) return;

      const trustGroup = document.createElement("div");
      trustGroup.className = "nn-footer-trust";

      const title = document.createElement("span");
      title.className = "nn-footer-trust-title";
      title.textContent = "Trust";
      trustGroup.appendChild(title);

      const links = document.createElement("div");
      links.className = "nn-footer-trust-links";

      function makeLink(item){
        const link = document.createElement("a");
        link.href = item.href;
        link.textContent = item.label;
        let currentPath = window.location.pathname;
        while(currentPath.length > 1 && currentPath.endsWith("/")){
          currentPath = currentPath.slice(0,-1);
        }
        if(currentPath === item.href) link.setAttribute("aria-current","page");
        return link;
      }

      const pair = document.createElement("span");
      pair.className = "nn-footer-trust-pair";
      pair.appendChild(makeLink(trustDestinations[0]));
      pair.appendChild(document.createTextNode(" & "));
      pair.appendChild(makeLink(trustDestinations[1]));
      links.appendChild(pair);

      trustDestinations.slice(2).forEach(function(item){
        links.appendChild(makeLink(item));
      });

      trustGroup.appendChild(links);
      nav.appendChild(trustGroup);
    });
  }

  function ensureWebsiteLaunchesBadge(){
    const footer=document.querySelector(".nn-footer.nn-global-footer");
    if(!footer||footer.querySelector(".nn-website-launches-badge")) return;
    const main=footer.querySelector(".nn-global-footer-main");
    const bottom=footer.querySelector(".nn-global-footer-bottom");
    if(!main||!bottom) return;
    const wrap=document.createElement("div");
    wrap.className="nn-website-launches-badge";
    wrap.innerHTML='<a href="https://websitelaunches.com/site/nexusnovatools.com" target="_blank" rel="noopener"><img src="https://websitelaunches.com/badge/nexusnovatools.com.svg" alt="Established online - Public launch record" width="255" height="55" loading="lazy" decoding="async"></a>';
    footer.insertBefore(wrap,bottom);
  }
  ensureTrustFooter();
  ensureWebsiteLaunchesBadge();
  const menu=document.querySelector("[data-nn-menu]");
  const nav=document.querySelector("[data-nn-nav]");
  if(menu&&nav&&!menu.dataset.nnBound){
    menu.dataset.nnBound="true";
    menu.addEventListener("click",function(){
      const open=nav.classList.toggle("is-open");
      menu.setAttribute("aria-expanded",open?"true":"false");
      menu.setAttribute("aria-label",open?"Close navigation":"Open navigation");
    });
    nav.querySelectorAll("a").forEach(function(a){
      a.addEventListener("click",function(){
        nav.classList.remove("is-open");
        menu.setAttribute("aria-expanded","false");
      });
    });
    document.addEventListener("click",function(e){
      if(!nav.contains(e.target)&&!menu.contains(e.target)){
        nav.classList.remove("is-open");
        menu.setAttribute("aria-expanded","false");
      }
    });
  }
});

// Load the same route-aware related-tools bootstrap from the shared inner-page shell.
(function () {
  if (window.__nexusNovaRelatedToolsBootstrapScriptRequested) return;
  window.__nexusNovaRelatedToolsBootstrapScriptRequested = true;
  var loader = document.createElement('script');
  loader.src = '/assets/js/related-tools-bootstrap.js?v=20261016-related-content-v1';
  loader.async = true;
  loader.dataset.nexusnovaRelatedToolsBootstrap = '';
  loader.onerror = function () {
    window.__nexusNovaRelatedToolsBootstrapScriptRequested = false;
  };
  document.head.appendChild(loader);
})();

/* Load the shared responsive header/search/footer repair layer once per page. */
(function(){
  if(typeof window==='undefined'||!window.document)return;
  if(window.__nexusNovaGlobalShellGuardRequested)return;
  window.__nexusNovaGlobalShellGuardRequested=true;
  var script=document.createElement('script');
  script.src='/assets/js/global-shell-guard.js?v=20261017-ui-sweep';
  script.async=true;
  script.dataset.nexusnovaGlobalShellGuard='';
  script.onerror=function(){window.__nexusNovaGlobalShellGuardRequested=false;};
  (document.head||document.documentElement).appendChild(script);
})();
