(function(){
'use strict';
if(typeof window==='undefined'||!window.document)return;
var doc=window.document;
var STYLE='/assets/css/global-shell-repair.css?v=20261017-ui-sweep';
var SEARCH_CORE='/assets/js/search-core.js?v=20261017-ui-sweep';
var RELATED_TOOLS='/assets/js/related-tools.js?v=20261017-ui-sweep';
var CORE_LINKS=[
 {label:'Home',href:'/',match:['/','/index.html']},
 {label:'All Tools',href:'/tools.html',match:['/tools.html']},
 {label:'Articles',href:'/articles.html',match:['/articles.html']},
 {label:'Guides',href:'/guides.html',match:['/guides.html']}
];
function loadStyle(){
 if(doc.querySelector('link[data-nn-global-shell-repair]'))return;
 var link=doc.createElement('link');link.rel='stylesheet';link.href=STYLE;link.dataset.nnGlobalShellRepair='';
 (doc.head||doc.documentElement).appendChild(link);
}
function loadScript(src,key,onReady){
 if(onReady&&key==='search-core'&&window.NexusNovaSearchCore){onReady();return;}
 var existing=doc.querySelector('script[data-nn-guard-script="'+key+'"]')||Array.from(doc.querySelectorAll('script[src]')).find(function(s){return (s.src||'').indexOf(src.split('?')[0])!==-1;});
 if(existing){
  if(onReady){
   if((key==='search-core'&&window.NexusNovaSearchCore)||(key==='related-tools'&&window.NexusNovaRelatedTools)){onReady();return;}
   existing.addEventListener('load',onReady,{once:true});
  }
  return;
 }
 var script=doc.createElement('script');script.src=src;script.async=true;script.dataset.nnGuardScript=key;
 if(onReady)script.addEventListener('load',onReady,{once:true});
 script.addEventListener('error',function(){if(key==='search-core')window.__nexusNovaGlobalSearchUnavailable=true;});
 (doc.head||doc.documentElement).appendChild(script);
}
function normalizedPath(href){try{var p=new URL(href,window.location.origin).pathname;return p==='/index.html'?'/':p;}catch(_){return href;}}
function makeLink(item){var a=doc.createElement('a');a.href=item.href;a.textContent=item.label;return a;}
function topLevelHeaders(){return Array.from(doc.querySelectorAll('header')).filter(function(h){return !h.parentElement||!h.parentElement.closest('header');});}
function normalizeHeaderSet(){
 var headers=topLevelHeaders();
 if(headers.length<=1)return headers[0]||null;
 var keep=headers.find(function(h){return h.querySelector('nav')||h.querySelector('input[type="search"],form[role="search"]');})||headers[0];
 headers.forEach(function(h){if(h!==keep&&h.parentNode)h.parentNode.removeChild(h);});
 return keep;
}
function normalizeHeaderChildren(header,row){
 var navs=Array.from(row.querySelectorAll('nav'));
 var nav=navs.find(function(n){return n.matches('[data-nn-nav],.nn-nav,.nn-global-shell-nav,[role="navigation"]');})||navs[0]||null;
 if(!nav){nav=doc.createElement('nav');nav.className='nn-global-shell-nav';nav.setAttribute('aria-label','Primary navigation');row.appendChild(nav);}
 navs.filter(function(n){return n!==nav;}).forEach(function(extra){
  Array.from(extra.querySelectorAll('a[href]')).forEach(function(a){
   var href=normalizedPath(a.getAttribute('href')||a.href);
   var exists=Array.from(nav.querySelectorAll('a[href]')).some(function(existing){return normalizedPath(existing.getAttribute('href')||existing.href)===href;});
   if(!exists)nav.appendChild(a.cloneNode(true));
  });
  if(extra.parentNode)extra.parentNode.removeChild(extra);
 });
 var seen={};
 Array.from(nav.querySelectorAll('a[href]')).forEach(function(a){var key=normalizedPath(a.getAttribute('href')||a.href);if(seen[key])a.parentNode&&a.parentNode.removeChild(a);else seen[key]=true;});
 return nav;
}
function normalizeHeaderSearch(header){
 var controls=Array.from(header.querySelectorAll('input[type="search"],form[role="search"] input'));
 var seenInputs=[];
 controls.forEach(function(input){if(seenInputs.indexOf(input)<0)seenInputs.push(input);});
 if(seenInputs.length>1){
  seenInputs.slice(1).forEach(function(input){var form=input.closest('form[role="search"],.nn-global-search');if(form&&form.parentNode)form.parentNode.removeChild(form);else if(input.parentNode)input.parentNode.removeChild(input);});
 }
 var globalForms=Array.from(header.querySelectorAll('form[data-nn-global-search-form]'));
 globalForms.slice(1).forEach(function(form){if(form.parentNode)form.parentNode.removeChild(form);});
 return seenInputs[0]||header.querySelector('input[type="search"]')||null;
}
function ensureHeader(){
 var header=normalizeHeaderSet();
 if(!header){
  header=doc.createElement('header');header.className='nn-global-shell-header';header.setAttribute('role','banner');
  var newRow=doc.createElement('div');newRow.className='nn-global-shell-header-row';
  var brand=doc.createElement('a');brand.className='nn-global-shell-brand';brand.href='/';brand.textContent='NEXUSNOVA TOOLS';newRow.appendChild(brand);header.appendChild(newRow);
  var main=doc.querySelector('main');if(main&&main.parentNode)main.parentNode.insertBefore(header,main);else doc.body.insertBefore(header,doc.body.firstChild);
 }
 header.classList.add('nn-global-shell-header');
 var row=header.querySelector('.nn-header-row,.ti-header-row,.nav-wrap,.wrap.top,.top,.nn-global-shell-header-row');
 if(!row)row=header;
 row.classList.add('nn-global-shell-header-row');
 if(header.querySelector('.nn-menu,[data-nn-menu],.menu-btn,[data-menu-btn]'))header.dataset.nnHasMenuToggle='true';
 var nav=normalizeHeaderChildren(header,row);
 if(!nav.children.length)CORE_LINKS.forEach(function(item){nav.appendChild(makeLink(item));});
 else CORE_LINKS.forEach(function(item){var found=Array.from(nav.querySelectorAll('a[href]')).some(function(a){return item.match.indexOf(normalizedPath(a.getAttribute('href')||a.href))!==-1;});if(!found)nav.appendChild(makeLink(item));});
 normalizeHeaderSearch(header);
 if(!header.querySelector('[data-nn-global-search-form]')&&!header.querySelector('input[type="search"]')){
  var form=doc.createElement('form');form.className='nn-global-search';form.setAttribute('role','search');form.setAttribute('aria-label','Search NexusNova tools and content');form.setAttribute('data-nn-global-search-form','');form.setAttribute('autocomplete','off');
  var label=doc.createElement('label');label.className='nn-global-search-label';label.setAttribute('for','nn-global-search-input');label.textContent='Search';
  var input=doc.createElement('input');input.id='nn-global-search-input';input.type='search';input.name='q';input.placeholder='Search tools, articles, guides…';input.setAttribute('aria-label','Search tools, articles, and guides');input.setAttribute('aria-autocomplete','list');input.setAttribute('aria-controls','nn-global-search-results');input.setAttribute('aria-expanded','false');input.autocomplete='off';input.spellcheck=false;
  var button=doc.createElement('button');button.type='submit';button.className='nn-global-search-submit';button.textContent='Search';
  var panel=doc.createElement('div');panel.className='nn-global-search-panel';panel.id='nn-global-search-results';panel.setAttribute('role','listbox');panel.setAttribute('aria-label','Search suggestions');panel.hidden=true;
  form.appendChild(label);form.appendChild(input);form.appendChild(button);form.appendChild(panel);
  if(nav.parentNode===row)row.insertBefore(form,nav);else row.appendChild(form);
 }
 return header;
}
function resolveResultUrl(url){var value=String(url||'').trim();if(!value)return '/';if(/^https?:\/\//i.test(value))return value;return '/'+value.replace(/^\.?\//,'').replace(/^\/+/,'');}
function bindSearch(){
 var form=doc.querySelector('[data-nn-global-search-form]');if(!form||form.dataset.nnSearchBound==='true')return;
 var input=form.querySelector('input[type="search"]'),panel=form.querySelector('.nn-global-search-panel');if(!input||!panel)return;
 var core=null,active=-1;
 function close(){panel.replaceChildren();panel.hidden=true;input.setAttribute('aria-expanded','false');active=-1;}
 function render(){
  if(!core)return;var query=String(input.value||'').trim();panel.replaceChildren();active=-1;if(!query){close();return;}
  var results=core.query(query).slice(0,7);
  if(!results.length){var empty=doc.createElement('div');empty.className='nn-search-empty';empty.setAttribute('role','status');empty.textContent='No matching NexusNova result found.';panel.appendChild(empty);panel.hidden=false;input.setAttribute('aria-expanded','true');return;}
  results.forEach(function(result,index){var a=doc.createElement('a');a.className='nn-search-result';a.href=resolveResultUrl(result.url);a.setAttribute('role','option');a.setAttribute('data-nn-search-result','');a.id='nn-global-search-result-'+index;var title=doc.createElement('span');title.className='nn-search-result-title';title.textContent=result.title||result.url;var meta=doc.createElement('span');meta.className='nn-search-result-meta';meta.textContent=result.category||result.type||'NexusNova';a.appendChild(title);a.appendChild(meta);panel.appendChild(a);});
  panel.hidden=false;input.setAttribute('aria-expanded','true');
 }
 input.addEventListener('input',render);input.addEventListener('focus',render);
 input.addEventListener('keydown',function(event){var items=Array.from(panel.querySelectorAll('[data-nn-search-result]'));if(event.key==='Escape'){close();return;}if(event.key==='ArrowDown'&&items.length){event.preventDefault();active=(active+1)%items.length;items[active].focus();}if(event.key==='ArrowUp'&&items.length){event.preventDefault();active=active<=0?items.length-1:active-1;items[active].focus();}});
 form.addEventListener('submit',function(event){event.preventDefault();if(!core)return;var results=core.query(String(input.value||'').trim());if(results.length)window.location.assign(resolveResultUrl(results[0].url));else render();});
 doc.addEventListener('pointerdown',function(event){if(!form.contains(event.target))close();});form.dataset.nnSearchBound='true';
 function ready(){try{core=new window.NexusNovaSearchCore({maxResults:7});render();}catch(_){close();}}
 if(window.NexusNovaSearchCore)ready();else loadScript(SEARCH_CORE,'search-core',ready);
}
function ensureFooter(){
 var footers=Array.from(doc.querySelectorAll('footer,[role="contentinfo"]'));var footer=footers[0]||null;footers.slice(1).forEach(function(extra){if(extra.parentNode)extra.parentNode.removeChild(extra);});if(footer)return footer;
 footer=doc.createElement('footer');footer.className='nn-global-shell-footer';footer.setAttribute('role','contentinfo');var wrap=doc.createElement('div');wrap.className='nn-global-shell-footer-inner';var copy=doc.createElement('p');copy.textContent='© '+new Date().getFullYear()+' NexusNova Tools';wrap.appendChild(copy);var links=doc.createElement('nav');links.setAttribute('aria-label','Footer links');[{label:'Privacy',href:'/privacy.html'},{label:'Terms',href:'/terms.html'},{label:'Disclaimer',href:'/disclaimer.html'},{label:'Contact',href:'/contact.html'}].forEach(function(item){links.appendChild(makeLink(item));});wrap.appendChild(links);footer.appendChild(wrap);doc.body.appendChild(footer);return footer;
}
function isToolPage(){var path=window.location.pathname||'/';if(/^\/(?:articles|guides)\//i.test(path))return false;if(/^\/(?:articles|guides|tools|categories|index|search|faq|privacy|terms|about|contact|disclaimer)(?:\.html)?\/?$/i.test(path))return false;var body=doc.body;if(path.indexOf('/tools/')===0)return true;if(body.hasAttribute('data-tool')||body.hasAttribute('data-western-tool')||body.hasAttribute('data-tier1-tool')||body.hasAttribute('data-calculator'))return true;var schema=Array.from(doc.querySelectorAll('script[type="application/ld+json"]')).some(function(s){return /"@type"\s*:\s*"WebApplication"/i.test(s.textContent||'');});if(schema)return true;return body.classList.contains('nn-inner-page')&&!!doc.querySelector('main form,main input,main select,main textarea,main canvas')&&!doc.querySelector('main article.article-main,main .article-main');}
function ensureToolFaq(){
 if(!isToolPage()||!doc.querySelector('main'))return;var headings=Array.from(doc.querySelectorAll('main h2,main h3')).map(function(h){return (h.textContent||'').trim();});if(headings.some(function(t){return /frequently asked|\bfaq\b|\bquestions\b|common questions/i.test(t);}))return;var main=doc.querySelector('main'),section=doc.createElement('section');section.className='nn-global-shell-faq';section.setAttribute('aria-labelledby','nn-global-shell-faq-title');var h=doc.createElement('h2');h.id='nn-global-shell-faq-title';h.textContent='Frequently asked questions';section.appendChild(h);var title=(doc.querySelector('h1')?.textContent||doc.title||'This tool').trim().replace(/\s*\|\s*NexusNova Tools$/i,'');var desc=(doc.querySelector('meta[name="description"]')?.content||'Use the controls on this page to complete the task described above.').trim();[['What does '+title+' do?',desc],['How do I use this tool?','Enter the values or choose the options shown in the tool, then activate its main action button. Review the result and adjust the inputs if needed.'],['How should I interpret the result?','Results depend on the inputs and the method or data source described on this page. Read the on-page limitations and verify high-impact decisions with the original or official source.']].forEach(function(entry){var details=doc.createElement('details'),summary=doc.createElement('summary'),answer=doc.createElement('p');summary.textContent=entry[0];answer.textContent=entry[1];details.appendChild(summary);details.appendChild(answer);section.appendChild(details);});var related=main.querySelector('.nn-related-tools,[data-nexusnova-related-tools],[data-nexusnova-related-content]');if(related)main.insertBefore(section,related);else main.appendChild(section);
}
function ensureRelatedTools(){function render(){try{if(window.NexusNovaRelatedTools&&typeof window.NexusNovaRelatedTools.render==='function'){window.NexusNovaRelatedTools.render(doc,window);return;}}catch(_){}loadScript(RELATED_TOOLS,'related-tools',function(){try{if(window.NexusNovaRelatedTools&&window.NexusNovaRelatedTools.render)window.NexusNovaRelatedTools.render(doc,window);}catch(_){}});}if(window.NexusNovaSearchCore)render();else loadScript(SEARCH_CORE,'search-core',render);}
function repair(){if(!doc.body)return;var pagePath=normalizedPath(window.location.pathname);if(pagePath==='/'||pagePath==='/app.html')return;doc.body.classList.add('nn-global-shell-ready');loadStyle();var header=ensureHeader();ensureFooter();ensureToolFaq();bindSearch();ensureRelatedTools();header.setAttribute('data-nn-global-shell-ready','');}
if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',repair,{once:true});else repair();
})();
