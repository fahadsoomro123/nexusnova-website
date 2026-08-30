(()=>{
  'use strict';
  document.documentElement.classList.add('nexusnova-scifi');

  const year=document.querySelector('[data-year]');
  if(year)year.textContent=String(new Date().getFullYear());

  const header=document.querySelector('[data-header]');
  const updateHeader=()=>header?.classList.toggle('scrolled',window.scrollY>6);
  updateHeader();
  window.addEventListener('scroll',updateHeader,{passive:true});

  const nav=document.querySelector('[data-nav]');
  const button=document.querySelector('[data-menu-btn]');
  if(button&&nav){
    const close=()=>{
      nav.classList.remove('open');
      button.setAttribute('aria-expanded','false');
    };
    button.addEventListener('click',()=>{
      const open=nav.classList.toggle('open');
      button.setAttribute('aria-expanded',String(open));
    });
    nav.addEventListener('click',event=>{
      if(event.target.closest('a'))close();
    });
    window.addEventListener('resize',()=>{
      if(window.innerWidth>720)close();
    });
  }

  const loadModule=(src,key)=>{
    const selector=`script[data-${key.replace(/[A-Z]/g,m=>`-${m.toLowerCase()}`)}]`;
    if(document.querySelector(selector))return;
    const script=document.createElement('script');
    script.type='module';
    script.src=new URL(src,document.currentScript?.src||location.href).href;
    script.dataset[key]='1';
    document.head.appendChild(script);
  };

  if(document.querySelector('[data-dashboard]')&&document.querySelector('[data-mission="email"]')){
    for(const [src,key] of [
      ['./account-eligibility-ui.js?v=20260830-1','nexusnovaEligibility'],
      ['./referral-code-ui.js?v=20260830-1','nexusnovaReferralCode']
    ]) loadModule(src,key);
  }

  if(document.querySelector('[data-account-form]')||document.querySelector('[data-dashboard]')){
    loadModule('./google-auth-ui.js?v=20260831-1','nexusnovaGoogleAuth');
    loadModule('./external-auth-ui.js?v=20260830-1','nexusnovaExternalAuth');
  }
})();