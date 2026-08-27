(()=>{
  'use strict';
  const current=document.currentScript;
  const currentSrc=current?.src||'';
  const coreSrc=currentSrc?currentSrc.replace(/assistant\.js(?:\?.*)?$/,'assistant-core.js'):'assets/js/assistant-core.js';
  const core=document.createElement('script');
  core.src=coreSrc;
  core.defer=true;

  const daily=[
    ['calculator.html','MATH','Basic Calculator','Fast everyday arithmetic.'],
    ['percentage-calculator.html','MATH','Percentage Calculator','Percentage of a number, percent-of and percentage change.'],
    ['age-calculator.html','DATES','Age Calculator','Exact age in years, months and days.'],
    ['date-difference-calculator.html','DATES','Date Difference','Count days and weeks between two dates.'],
    ['unit-converter.html','CONVERT','Unit Converter','Common length, weight and temperature conversions.'],
    ['word-counter.html','TEXT','Word & Character Counter','Live words, characters, lines and reading time.'],
    ['password-generator.html','SECURITY','Password Generator','Create strong random passwords locally.'],
    ['bill-split-tip-calculator.html','MONEY','Bill Split & Tip','Calculate tip, total and per-person share.'],
    ['private-quick-note.html','PRIVACY','Private Quick Note','Save a small note locally in this browser.'],
    ['discount-calculator.html','MONEY','Discount Calculator','Find final price and savings.'],
    ['percentage-change-calculator.html','MATH','Percentage Change','Measure increase or decrease between two values.'],
    ['storage-size-converter.html','STORAGE','Storage Size Converter','Convert B, KB, MB, GB and TB.'],
    ['time-duration-calculator.html','TIME','Time Duration Calculator','Find elapsed hours and minutes.'],
    ['text-case-converter.html','TEXT','Text Case Converter','Switch upper, lower, title and sentence case.'],
    ['random-picker.html','RANDOM','Random Picker','Choose one name or item from a list.']
  ];
  const aliases=[
    [/\bbasic calculator\b|\barithmetic\b|quick calculation/,'calculator.html'],
    [/percentage change|percent increase|percent decrease/,'percentage-change-calculator.html'],
    [/percentage|percent of/,'percentage-calculator.html'],
    [/\bage\b|date of birth/,'age-calculator.html'],
    [/date difference|days between/,'date-difference-calculator.html'],
    [/unit convert|length convert|weight convert|temperature convert/,'unit-converter.html'],
    [/word count|character count/,'word-counter.html'],
    [/password generator|generate password|random password/,'password-generator.html'],
    [/bill split|split bill|tip calculator|per person/,'bill-split-tip-calculator.html'],
    [/quick note|private note|browser note/,'private-quick-note.html'],
    [/discount|sale price|savings/,'discount-calculator.html'],
    [/storage convert|storage size|bytes to|kb to|mb to|gb to|tb to/,'storage-size-converter.html'],
    [/time duration|hours between|minutes between/,'time-duration-calculator.html'],
    [/text case|uppercase|lowercase|title case|sentence case/,'text-case-converter.html'],
    [/random picker|pick a name|pick one|random choice/,'random-picker.html'],
    [/daily tools|everyday tools/,'daily-tools-directory.html']
  ];
  const getBase=()=>/\/(guides|articles|tech)\//.test(location.pathname)?'../':'';
  const matchAlias=q=>aliases.find(([re])=>re.test(q))?.[1]||'';
  const card=([href,tag,title,desc])=>`<a class="article-card" href="${href}"><span class="tag">${tag}</span><h3>${title}</h3><p>${desc}</p><span class="card-link">Open tool →</span></a>`;

  const sync=()=>{
    const base=getBase();
    const page=(location.pathname.split('/').pop()||'index.html').toLowerCase();

    const nav=document.querySelector('[data-nav]');
    if(nav&&!nav.querySelector('a[href$="gaming.html"]')){
      const a=document.createElement('a');a.href=`${base}gaming.html`;a.textContent='Gaming';
      const trending=[...nav.querySelectorAll('a')].find(x=>x.getAttribute('href')?.endsWith('trending-tools.html'));
      if(trending)trending.after(a);else nav.appendChild(a);
    }

    if(page==='tools.html'){
      const section=document.getElementById('dedicated-daily-pages');
      if(section){
        const title=section.querySelector('h2');if(title)title.textContent='All 15 daily tools now have dedicated pages.';
        const intro=section.querySelector('.section-head p');if(intro)intro.textContent='The all-in-one tools below still work; each everyday utility now also has a focused URL that is easier to bookmark, share and find in search.';
        const grid=section.querySelector('.article-grid');
        if(grid){
          daily.forEach(item=>{if(!grid.querySelector(`a[href="${item[0]}"]`))grid.insertAdjacentHTML('beforeend',card(item))});
        }
        if(!section.querySelector('a[href="daily-tools-directory.html"]')){
          const actions=document.createElement('div');actions.className='hero-actions';actions.style.marginTop='18px';actions.innerHTML='<a class="btn btn-primary" href="daily-tools-directory.html">Browse dedicated Daily Tools →</a>';section.querySelector('.container')?.appendChild(actions);
        }
      }
    }

    const datalist=document.getElementById('nn-site-search-list');
    if(datalist){daily.forEach(([, ,title])=>{if(![...datalist.options].some(o=>o.value===title)){const o=document.createElement('option');o.value=title;datalist.appendChild(o)}})}

    const homeForm=document.querySelector('.home-search');
    if(homeForm&&!homeForm.dataset.dailySync){
      homeForm.dataset.dailySync='1';
      homeForm.addEventListener('submit',e=>{
        const q=homeForm.querySelector('[data-home-search]')?.value?.trim().toLowerCase()||'';
        const href=matchAlias(q);if(!href)return;
        e.preventDefault();e.stopImmediatePropagation();location.href=href;
      },true);
    }

    if(!document.documentElement.dataset.novaDailySync){
      document.documentElement.dataset.novaDailySync='1';
      document.addEventListener('submit',e=>{
        const form=e.target;if(!(form instanceof HTMLFormElement)||!form.matches('.nova-assistant-form'))return;
        const q=form.querySelector('input')?.value?.trim().toLowerCase()||'';
        const href=matchAlias(q);if(!href)return;
        e.preventDefault();e.stopImmediatePropagation();location.href=`${base}${href}`;
      },true);
    }
  };

  core.addEventListener('load',()=>{sync();setTimeout(sync,0)});
  core.addEventListener('error',()=>console.error('NOVA assistant core failed to load.'));
  document.head.appendChild(core);
})();

(()=>{
  const page=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  if(page!=='index.html'&&location.pathname!=='/')return;
  if(!document.querySelector('link[data-nexusnova-live-tech]')){
    const link=document.createElement('link');link.rel='stylesheet';link.href='assets/css/live-tech-pulse.css';link.dataset.nexusnovaLiveTech='';document.head.appendChild(link);
  }
  if(!document.querySelector('script[data-nexusnova-live-tech]')){
    const script=document.createElement('script');script.src='assets/js/live-tech-pulse.js';script.defer=true;script.dataset.nexusnovaLiveTech='';document.body.appendChild(script);
  }
})();
