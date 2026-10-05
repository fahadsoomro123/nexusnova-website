(()=>{
  const slug=value=>String(value||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
  const escapeHtml=value=>String(value??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));const sources={
    government:{name:'National Jobs Portal (Government of Pakistan)',badge:'GOVERNMENT',url:'https://www.njp.gov.pk/jobs',note:'Official government jobs portal with live and upcoming opportunities.'},
    rozee:{name:'ROZEE.PK',badge:'PRIVATE',url:'https://www.rozee.pk/',note:'Private-sector job search and online applications.'},
    mustakbil:{name:'Mustakbil',badge:'PRIVATE',url:'https://www.mustakbil.com/',note:'Private-sector job search, profiles and online applications.'}
  };
  const makeUrl=(key,q)=>{if(key==='rozee'&&q)return 'https://www.rozee.pk/search/'+encodeURIComponent(q).replace(/%20/g,'-');return sources[key].url;};
  if(typeof module!=='undefined'&&module.exports){module.exports={slug,sources,makeUrl};return;}
  const form=document.querySelector('[data-jobs-form]');if(!form)return;
  const results=form.querySelector('[data-jobs-results]');
  const render=()=>{
    const q=form.elements.keyword.value.trim();const city=form.elements.city.value.trim();const type=form.elements.jobType.value;
    const keys=type==='government'?['government']:type==='private'?['rozee','mustakbil']:['government','rozee','mustakbil'];
    const cityText=escapeHtml(city||'All Pakistan');const safeQuery=escapeHtml(q||'all jobs');
    results.innerHTML='<div class="nn-job-query"><strong>Search:</strong> '+(safeQuery||'Any job')+' · <strong>Location:</strong> '+cityText+' · <strong>Source:</strong> '+(type==='both'?'Government + Private':type==='government'?'Government':'Private')+'</div>'+
      '<div class="nn-job-results">'+keys.map(key=>{const s=sources[key];return '<article class="nn-job-card"><div><span class="nn-job-badge">'+s.badge+'</span><h3>'+s.name+'</h3><div class="nn-job-meta"><span>'+s.note+'</span></div><p class="nn-simple-note">Your search words: <strong>'+safeQuery+'</strong>. Verify the job title, employer, location and deadline on the source before applying.</p></div><div class="nn-job-card-actions"><a class="btn btn-primary" href="'+makeUrl(key,q)+'" target="_blank" rel="noopener noreferrer">Open Jobs →</a></div></article>';}).join('')+'</div>';
  };
  form.addEventListener('submit',e=>{e.preventDefault();render();});
  render();
})();