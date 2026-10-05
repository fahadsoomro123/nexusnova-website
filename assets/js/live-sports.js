(()=>{
  const buttons=[...document.querySelectorAll('[data-sport]')];
  const status=document.querySelector('[data-sports-status]');
  const grid=document.querySelector('[data-sports-grid]');
  if(!buttons.length||!status||!grid)return;

  const API='https://sportscore.com/api/widget/matches/';
  const SPORTS=new Set(['cricket','football','basketball','tennis']);
  const PAKISTAN_TERMS=['pakistan','pakistan super league','psl','karachi','lahore','islamabad','rawalpindi','peshawar','quetta','multan','sialkot','faisalabad'];
  let active='cricket';
  let refreshTimer=null;
  let controller=null;

  const escapeText=value=>String(value??'').trim();
  const fmtTime=value=>{
    if(!value)return 'Time unavailable';
    const d=new Date(value);
    if(Number.isNaN(d.getTime()))return escapeText(value)||'Time unavailable';
    return new Intl.DateTimeFormat('en-PK',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Karachi'}).format(d)+' PKT';
  };
  const isLive=match=>/live|in.?progress|playing|1st|2nd|quarter|inning|set/i.test(`${match?.status||''} ${match?.status_text||''}`) && !/finished|final|ended|scheduled|upcoming|not started/i.test(`${match?.status||''} ${match?.status_text||''}`);
  const pakistanScore=match=>{
    const hay=[match?.home,match?.away,match?.competition].map(escapeText).join(' ').toLowerCase();
    return PAKISTAN_TERMS.reduce((score,term)=>score+(hay.includes(term)?1:0),0);
  };
  const orderMatches=(matches,sport)=>[...matches].sort((a,b)=>{
    const liveDiff=Number(isLive(b))-Number(isLive(a));
    if(liveDiff)return liveDiff;
    if(sport==='cricket'){
      const pk=pakistanScore(b)-pakistanScore(a);
      if(pk)return pk;
    }
    return new Date(b?.time||0).getTime()-new Date(a?.time||0).getTime();
  });
  const scoreText=match=>{
    const home=escapeText(match?.home_score);
    const away=escapeText(match?.away_score);
    if(home||away)return `${home||'—'} - ${away||'—'}`;
    return 'vs';
  };
  const card=match=>{
    const article=document.createElement('article');article.className='live-rate-card sports-match-card';
    const header=document.createElement('header');
    const h3=document.createElement('h3');h3.textContent=escapeText(match?.competition)||'Match';
    const badge=document.createElement('span');badge.className='live-code';badge.textContent=isLive(match)?'● LIVE':(escapeText(match?.status_text)||escapeText(match?.status)||'Status unavailable');
    header.append(h3,badge);
    const teams=document.createElement('strong');teams.className='live-rate-value';teams.textContent=`${escapeText(match?.home)||'Home'} ${scoreText(match)} ${escapeText(match?.away)||'Away'}`;
    const when=document.createElement('span');when.className='live-rate-unit';when.textContent=fmtTime(match?.time);
    const details=document.createElement('div');details.className='weather-details';
    const source=document.createElement('span');source.textContent='Source: SportScore';details.appendChild(source);
    if(match?.url){const link=document.createElement('a');link.href=`https://sportscore.com${String(match.url).startsWith('/')?match.url:`/${match.url}`}`;link.target='_blank';link.rel='noopener';link.textContent='Match details at source →';details.appendChild(link)}
    article.append(header,teams,when,details);return article;
  };

  async function load(sport,{silent=false}={}){
    if(!SPORTS.has(sport))return;
    active=sport;
    buttons.forEach(button=>button.classList.toggle('btn-primary',button.dataset.sport===sport));
    if(controller)controller.abort();
    controller=new AbortController();
    if(!silent){status.textContent=`Loading ${sport} matches from SportScore…`;status.classList.remove('is-error')}
    try{
      const url=new URL(API);url.searchParams.set('sport',sport);url.searchParams.set('limit','50');url.searchParams.set('src','nexusnovatools.com');
      const response=await fetch(url,{headers:{Accept:'application/json'},signal:controller.signal,cache:'no-store'});
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      const data=await response.json();
      if(!Array.isArray(data?.matches))throw new Error('Invalid matches response');
      const matches=orderMatches(data.matches,sport);
      grid.replaceChildren(...matches.map(card));
      const liveCount=matches.filter(isLive).length;
      const pkCount=sport==='cricket'?matches.filter(match=>pakistanScore(match)>0).length:0;
      const updated=data.updated?fmtTime(data.updated):'source timestamp unavailable';
      status.textContent=`${matches.length} ${sport} matches loaded · ${liveCount} live${sport==='cricket'?` · ${pkCount} Pakistan-relevant in this feed`:''} · source updated ${updated}.`;
      status.classList.remove('is-error');
    }catch(error){
      if(error?.name==='AbortError')return;
      if(!silent)grid.replaceChildren();
      status.textContent='Sports feed is temporarily unavailable. NexusNova will not invent replacement scores.';
      status.classList.add('is-error');
    }
  }

  buttons.forEach(button=>button.addEventListener('click',()=>load(button.dataset.sport)));
  const schedule=()=>{
    clearInterval(refreshTimer);
    refreshTimer=setInterval(()=>{if(document.visibilityState==='visible')load(active,{silent:true})},90000);
  };
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')load(active,{silent:true})});
  load(active);schedule();
})();
