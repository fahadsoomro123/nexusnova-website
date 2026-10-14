(()=>{
  const slug=value=>String(value||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
  const escapeHtml=value=>String(value??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  const sources={
    government:{name:'National Jobs Portal (Government of Pakistan)',badge:'GOVERNMENT',url:'https://www.njp.gov.pk/jobs/search',note:'Official government jobs portal with live and upcoming opportunities.'},
    rozee:{name:'ROZEE.PK',badge:'PRIVATE',url:'https://www.rozee.pk/',note:'Private-sector job search and online applications.'},
    mustakbil:{name:'Mustakbil',badge:'PRIVATE',url:'https://www.mustakbil.com/jobs/pakistan',note:'Private-sector job search, profiles and online applications.'}
  };
  const makeUrl=(key,q,city='')=>{
    const query=String(q||'').trim();
    const location=String(city||'').trim();
    if(key==='rozee'&&query)return 'https://www.rozee.pk/search/'+encodeURIComponent(query).replace(/%20/g,'-');
    if(key==='mustakbil'&&location)return sources.mustakbil.url+'/'+slug(location);
    return sources[key]?.url||'';
  };
  if(typeof module!=='undefined'&&module.exports){module.exports={slug,sources,makeUrl};return;}
  const form=document.querySelector('[data-jobs-form]');if(!form)return;
  const results=form.querySelector('[data-jobs-results]');
  const render=()=>{
    const q=form.elements.keyword.value.trim();
    const city=form.elements.city.value.trim();
    const type=form.elements.jobType.value;
    const keys=type==='government'?['government']:type==='private'?['rozee','mustakbil']:['government','rozee','mustakbil'];
    const cityText=escapeHtml(city||'All Pakistan');
    const safeQuery=escapeHtml(q||'all jobs');
    results.innerHTML='<div class="nn-job-query"><strong>Search:</strong> '+safeQuery+' · <strong>Location:</strong> '+cityText+' · <strong>Source:</strong> '+(type==='both'?'Government + Private':type==='government'?'Government':'Private')+'</div>'+
      '<div class="nn-job-results">'+keys.map(key=>{
        const s=sources[key];
        const guidance=key==='government'
          ?'This opens the official search form. Enter the keyword and city on the National Jobs Portal.'
          :key==='rozee'
            ?(q?'Your keyword is sent to ROZEE. Select the city in ROZEE’s own search controls.':'Enter the keyword'+(city?' and select '+cityText:'')+' in ROZEE’s search controls.')
            :(city?'Opened Mustakbil jobs for '+cityText+'. Enter the keyword there to narrow results.':'Enter the keyword and optional city in Mustakbil’s search controls.');
        const label=key==='government'?'Open NJP Search →':key==='rozee'?'Search ROZEE →':'Search Mustakbil →';
        return '<article class="nn-job-card"><div><span class="nn-job-badge">'+s.badge+'</span><h3>'+s.name+'</h3><div class="nn-job-meta"><span>'+s.note+'</span></div><p class="nn-simple-note">'+guidance+' Verify the employer, eligibility and closing date on the original source before applying.</p></div><div class="nn-job-card-actions"><a class="btn btn-primary" href="'+makeUrl(key,q,city)+'" target="_blank" rel="noopener noreferrer">'+label+'</a></div></article>';
      }).join('')+'</div>';
  };
  form.addEventListener('submit',e=>{e.preventDefault();render();});
  render();
})();