document.addEventListener("DOMContentLoaded",function(){
  const yearEls=document.querySelectorAll("[data-year]");
  yearEls.forEach(function(el){el.textContent=new Date().getFullYear();});
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