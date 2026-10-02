document.addEventListener("DOMContentLoaded",function(){
  const yearEls=document.querySelectorAll("[data-year]");
  yearEls.forEach(function(el){el.textContent=new Date().getFullYear();});
  function ensureTrustFooter(){
    const trustDestinations = [
      { label:"Terms", href:"/terms.html" },
      { label:"Refund Policy", href:"/refund-policy.html" },
      { label:"About", href:"/about.html" },
      { label:"Editorial Policy", href:"/editorial-policy.html" },
      { label:"Tool Methodology", href:"/tool-methodology.html" },
      { label:"Privacy", href:"/privacy.html" },
      { label:"Contact Us & Support", href:"/contact.html" }
    ];
    const destinationSet = new Set(trustDestinations.map(function(item){ return item.href; }));

    document.querySelectorAll(".nn-footer .nn-footer-links").forEach(function(nav){
      Array.from(nav.children).forEach(function(child){
        if(child.tagName !== "A") return;
        const href = child.getAttribute("href") || "";
        if(destinationSet.has(href)) child.remove();
      });

      let trustGroup = null;
      Array.from(nav.children).forEach(function(child){
        const title = child.querySelector && child.querySelector(".nn-footer-title");
        if(title && title.textContent.trim().toLowerCase() === "trust"){
          trustGroup = child;
        }
      });

      if(!trustGroup){
        trustGroup = document.createElement("div");
        nav.appendChild(trustGroup);
      }

      trustGroup.replaceChildren();

      const title = document.createElement("span");
      title.className = "nn-footer-title";
      title.textContent = "Trust";
      trustGroup.appendChild(title);

      function makeLink(label, href){
        const link = document.createElement("a");
        link.href = href;
        link.textContent = label;
        let currentPath = window.location.pathname;
        while(currentPath.length > 1 && currentPath.endsWith("/")){
          currentPath = currentPath.slice(0,-1);
        }
        if(currentPath === href){
          link.setAttribute("aria-current", "page");
        }
        return link;
      }

      const pair = document.createElement("span");
      pair.className = "nn-footer-trust-pair";
      pair.appendChild(makeLink("Terms", "/terms.html"));
      pair.appendChild(document.createTextNode(" & "));
      pair.appendChild(makeLink("Refund Policy", "/refund-policy.html"));
      trustGroup.appendChild(pair);

      trustDestinations.slice(2).forEach(function(item){
        trustGroup.appendChild(makeLink(item.label, item.href));
      });
    });
  }
  ensureTrustFooter();
  const menu=document.querySelector("[data-nn-menu]");
  const nav=document.querySelector("[data-nn-nav]");
  if(menu&&nav){
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