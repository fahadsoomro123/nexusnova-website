(() => {
'use strict';

const canvas = document.getElementById('universe');
const ctx = canvas && canvas.getContext ? canvas.getContext('2d', { alpha:false, desynchronized:true }) : null;
if (!canvas || !ctx) {
  document.body.innerHTML = '<main class="no-canvas"><div class="panel"><h1>Infinite Lab needs a canvas-enabled browser.</h1><p>The renderer could not create a usable canvas context, so the experiment stopped safely instead of showing a broken scene.</p></div></main>';
  return;
}

const TAU = Math.PI * 2;
const MIN_Z = 0.72;
const MAX_Z = 4.85;
const DPR_MAX = 2;
const VIEW_SCALE = 0.92;

const WORLDS = [
  {name:'THE FIRST FIELD', family:'COSMIC FIELD', kicker:'PROCEDURAL FIELD', desc:'A wide generated field where constellations, dust and nested cores establish the first visual scale.'},
  {name:'SPIRAL MEMORY', family:'GALAXY', kicker:'GALACTIC LAYER', desc:'A luminous spiral system with layered arms, drifting dust and a dense core that carries the next world.'},
  {name:'ORBITAL GARDEN', family:'STELLAR REGION', kicker:'STELLAR LAYER', desc:'A local star neighborhood of orbital traces, companion lights and slow-moving debris.'},
  {name:'EMBER WORLD', family:'PLANETARY WORLD', kicker:'PLANETARY LAYER', desc:'A generated planet chosen from six visual archetypes, wrapped in atmosphere, terrain and moons.'},
  {name:'NEON DISTRICT', family:'CITY LAYER', kicker:'CIVIC LAYER', desc:'A stylized city basin nested beneath the planetary scale, built from streets, towers and signal windows.'},
  {name:'SIGNAL GARDEN', family:'DATA WORLD', kicker:'INFORMATION LAYER', desc:'An abstract data landscape where rings, nodes and traces reorganize around a central gateway.'},
  {name:'CELLULAR SEA', family:'MICRO WORLD', kicker:'MICRO LAYER', desc:'A dense micro-world of cells, filaments and particles that makes the next scale feel impossibly close.'},
  {name:'RECURSIVE VAULT', family:'FRACTAL WORLD', kicker:'RECURSIVE LAYER', desc:'A bounded recursive geometry that repeats its grammar at different scales without unbounded computation.'},
  {name:'ALIEN BIOSPHERE', family:'BIOSPHERE', kicker:'LIFE-LIKE LAYER', desc:'A procedural ecosystem of luminous growths, streams and floating structures assembled from the current seed.'},
  {name:'ANOMALY FIELD', family:'ANOMALY', kicker:'RARE VARIANT', desc:'A rare visual variant with warped grids, interference arcs and a more unstable central geometry.'}
];

const EVENTS = ['FIELD ECHO','SIGNAL BLOOM','ORBIT SHIFT','ECLIPSE WINDOW','FRACTURE CASCADE','DEEP RESONANCE'];

let W = 1, H = 1, dpr = 1;
let resizeQueued = false;
let lastFrame = performance.now();
let fpsSmoother = 60;
let raf = 0;
let eventTimer = 0;
let discoveryTimer = 0;
let tapTimer = 0;
let firstFrame = false;
let reducedMotion = false;

try { reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) {}

const state = {
  x:0, y:0, z:1, tx:0, ty:0, tz:1,
  depth:0, seed:1.234, family:0,
  time:0, quality:1, transition:0,
  pulse:0, eventPulse:0, rebaseCooldown:0,
  diveRequested:false, dragging:false,
  angle:0, angleTarget:0
};

const pointers = new Map();
let pinch = null;
let down = null;
let downAt = 0;
let lastPoint = null;
let lastTap = null;

function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
function ease(t){ t=clamp(t,0,1); return t*t*(3-2*t); }
function hash(seed,index){
  const n=Math.sin(seed*127.1 + index*311.7 + 17.3)*43758.5453123;
  return n-Math.floor(n);
}
function hash2(seed,index){
  return hash(seed,index)*0.73 + hash(seed,index+19.47)*0.27;
}
function hue(seed){
  const hues=[188,211,241,270,302,329,156,52];
  return hues[Math.floor(hash(seed,4)*hues.length)];
}
function seedFor(parent, depth, salt){
  return parent*1.61803398875
    + hash(parent,901 + depth*7.19 + salt*2.31)*9.73
    + hash(parent,1701 + depth*11.23 + salt*4.17)*0.731;
}
function familyFor(depth, seed){
  if (hash(seed,88)>0.965) return 9;
  return depth % (WORLDS.length-1);
}
function nextSignature(depth,seed,family){
  return String(depth)+':'+String(family)+':'+Math.round(seed*1000000);
}
function worldPoint(x,y){
  const k = Math.min(W,H)*VIEW_SCALE*Math.max(0.001,state.z);
  return {x:W*0.5+(x-state.x)*k, y:H*0.54+(y-state.y)*k};
}
function screenToWorld(px,py){
  const k = Math.min(W,H)*VIEW_SCALE*Math.max(0.001,state.z);
  return {x:state.x+(px-W*0.5)/k, y:state.y+(py-H*0.54)/k};
}
function setText(id,value){
  const e=document.getElementById(id);
  if(e) e.textContent=value;
}
function bootPhase(label,width,copy){
  const phase=document.getElementById('loadingPhase');
  const bar=document.getElementById('loadingBar');
  const text=document.getElementById('loadingCopy');
  if(phase) phase.textContent=label;
  if(bar) bar.style.width=width+'%';
  if(text) text.textContent=copy;
}
function setStatus(text){
  const e=document.getElementById('portalStatus');
  if(e) e.textContent=text;
  const strip=document.getElementById('eventStrip');
  if(strip){
    strip.classList.add('on');
    clearTimeout(eventTimer);
    eventTimer=setTimeout(()=>strip.classList.remove('on'),1400);
  }
}
function emitEvent(custom){
  const label=custom || EVENTS[Math.floor(hash(state.seed, state.depth+404)*EVENTS.length)];
  setText('eventText', label);
  const strip=document.getElementById('eventStrip');
  if(strip){
    strip.classList.add('on');
    clearTimeout(eventTimer);
    eventTimer=setTimeout(()=>strip.classList.remove('on'),2200);
  }
}
function updateHud(){
  const world=WORLDS[state.family];
  setText('depthIndex',String(state.depth).padStart(2,'0'));
  setText('depthFamily',world.family);
  setText('worldKicker',world.kicker);
  setText('worldName',world.name);
  setText('worldDescription',world.desc);
  setText('seedReadout',(Math.abs(state.seed)%100000).toFixed(4).padStart(9,'0'));
  setText('nodeReadout','D'+String(state.depth).padStart(2,'0')+' / '+world.family.split(' ')[0]);
  const meter=document.getElementById('depthMeter');
  if(meter) meter.style.width=clamp(8+Math.log1p(state.depth)*16,8,92)+'%';
  const angle=(Math.atan2(state.y,state.x)*180/Math.PI+360)%360;
  setText('vectorReadout',(Math.hypot(state.x,state.y)<0.025?'CENTER':'OFFSET')+' / '+String(Math.round(angle)).padStart(3,'0')+'°');
  const dot=document.getElementById('radarDot');
  if(dot){
    const rx=clamp(50+state.x*42,12,88);
    const ry=clamp(50+state.y*42,12,88);
    dot.style.left=rx+'%'; dot.style.top=ry+'%';
  }
}
function saveDiscovery(kind){
  try{
    const key='nexusnova.infiniteLab.discoveries';
    const current=JSON.parse(localStorage.getItem(key)||'[]');
    const id=nextSignature(state.depth,state.seed,state.family);
    if(current.some(item=>item.id===id)) return;
    current.push({id,kind,depth:state.depth,family:state.family,at:Date.now()});
    localStorage.setItem(key,JSON.stringify(current.slice(-100)));
    const card=document.getElementById('discoveryCard');
    if(card){
      setText('discoveryTitle',kind);
      setText('discoveryText','Saved locally on this browser · depth '+state.depth+' · '+WORLDS[state.family].family);
      card.classList.add('on');
      clearTimeout(discoveryTimer);
      discoveryTimer=setTimeout(()=>card.classList.remove('on'),3200);
    }
  }catch(_){}
}

function resize(){
  if(resizeQueued) return;
  resizeQueued=true;
  requestAnimationFrame(()=>{
    resizeQueued=false;
    W=Math.max(1,innerWidth);
    H=Math.max(1,innerHeight);
    dpr=clamp(devicePixelRatio||1,1,DPR_MAX);
    canvas.width=Math.floor(W*dpr);
    canvas.height=Math.floor(H*dpr);
    canvas.style.width=W+'px';
    canvas.style.height=H+'px';
    ctx.setTransform(dpr,0,0,dpr,0,0);
    updateHud();
  });
}
addEventListener('resize',resize,{passive:true});
resize();

function clearFrame(){
  ctx.fillStyle='#03050a';
  ctx.fillRect(0,0,W,H);
}
function drawBackdrop(seed,t){
  const h=hue(seed);
  const center=ctx.createRadialGradient(W*.5,H*.48,0,W*.5,H*.48,Math.max(W,H)*.84);
  center.addColorStop(0,'hsla('+h+',78%,13%,1)');
  center.addColorStop(.34,'hsla('+((h+45)%360)+',55%,7%,1)');
  center.addColorStop(.72,'rgba(3,5,11,1)');
  center.addColorStop(1,'rgba(1,2,5,1)');
  ctx.fillStyle=center; ctx.fillRect(0,0,W,H);

  const glowA=ctx.createRadialGradient(W*.24,H*.27,0,W*.24,H*.27,Math.min(W,H)*.48);
  glowA.addColorStop(0,'hsla('+((h+120)%360)+',90%,64%,.05)');
  glowA.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=glowA; ctx.fillRect(0,0,W,H);

  const glowB=ctx.createRadialGradient(W*.8,H*.72,0,W*.8,H*.72,Math.min(W,H)*.55);
  glowB.addColorStop(0,'hsla('+((h+245)%360)+',90%,64%,.035)');
  glowB.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=glowB; ctx.fillRect(0,0,W,H);

  const count=Math.floor(180*state.quality);
  for(let i=0;i<count;i++){
    const a=hash(seed+3,i*2.13)*TAU;
    const r=Math.pow(hash(seed+7,i*3.11),.62)*1.55;
    const p=worldPoint(Math.cos(a)*r,Math.sin(a)*r*.7);
    if(p.x<-2||p.x>W+2||p.y<-2||p.y>H+2) continue;
    const size=.35+hash(seed+9,i*4.17)*1.55;
    const alpha=.16+hash(seed+12,i*5.23)*.58;
    const c=((h+hash(seed+16,i)*72)%360).toFixed(1);
    ctx.fillStyle='hsla('+c+',90%,88%,'+alpha.toFixed(3)+')';
    ctx.fillRect(p.x,p.y,size,size);
  }
  ctx.save();
  ctx.translate(W*.5,H*.54);
  ctx.rotate(-.16);
  ctx.strokeStyle='rgba(255,255,255,.025)';
  ctx.lineWidth=1;
  const grid=11;
  for(let i=-grid;i<=grid;i++){
    const z=i*52;
    ctx.beginPath(); ctx.moveTo(z,-H); ctx.lineTo(z,H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-W,z); ctx.lineTo(W,z); ctx.stroke();
  }
  ctx.restore();
}

function glowCircle(x,y,r,color,alpha){
  ctx.save();
  ctx.globalAlpha=alpha;
  ctx.shadowColor=color;
  ctx.shadowBlur=Math.max(8,r*.72);
  ctx.fillStyle=color;
  ctx.beginPath();
  ctx.arc(x,y,r,0,TAU);
  ctx.fill();
  ctx.restore();
}
function ring(x,y,r,color,width,alpha,start,end){
  ctx.save();
  ctx.strokeStyle=color;
  ctx.lineWidth=width;
  ctx.globalAlpha=alpha;
  ctx.beginPath();
  ctx.arc(x,y,r,start==null?0:start,end==null?TAU:end);
  ctx.stroke();
  ctx.restore();
}
function drawStars(seed,count,spread,t){
  const total=Math.floor(count*state.quality);
  const h=hue(seed);
  for(let i=0;i<total;i++){
    const a=hash(seed,200+i*1.7)*TAU;
    const r=Math.pow(hash(seed,240+i*2.1),.58)*spread;
    const wobble=.012*Math.sin(t*.5+hash(seed,260+i)*TAU);
    const p=worldPoint(Math.cos(a)*r*(1+wobble),Math.sin(a)*r*.66);
    if(p.x<-4||p.x>W+4||p.y<-4||p.y>H+4) continue;
    const s=.5+hash(seed,280+i*3.2)*2.1;
    const c=((h+hash(seed,310+i)*52)%360).toFixed(1);
    ctx.fillStyle='hsla('+c+',90%,88%,'+(0.24+hash(seed,340+i)*.6).toFixed(3)+')';
    ctx.beginPath(); ctx.arc(p.x,p.y,s,0,TAU); ctx.fill();
    if(s>1.8 && state.quality>.7){
      ctx.strokeStyle='hsla('+c+',90%,90%,.1)';
      ctx.lineWidth=.6;
      ctx.beginPath(); ctx.moveTo(p.x-s*2,p.y); ctx.lineTo(p.x+s*2,p.y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(p.x,p.y-s*2); ctx.lineTo(p.x,p.y+s*2); ctx.stroke();
    }
  }
}
function drawDust(seed,t){
  const h=hue(seed);
  for(let i=0;i<7;i++){
    const p=worldPoint((hash(seed,500+i)*2-1)*.62,(hash(seed,540+i)*2-1)*.38);
    const rx=Math.min(W,H)*(.17+hash(seed,560+i)*.24);
    const ry=rx*(.16+hash(seed,580+i)*.18);
    const q=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,rx);
    q.addColorStop(0,'hsla('+((h+25+i*17)%360)+',88%,70%,.075)');
    q.addColorStop(.52,'hsla('+((h+70+i*13)%360)+',72%,45%,.028)');
    q.addColorStop(1,'rgba(0,0,0,0)');
    ctx.save();
    ctx.translate(p.x,p.y);
    ctx.rotate(i*.37+t*.008*(i%2?1:-1));
    ctx.fillStyle=q;
    ctx.beginPath(); ctx.ellipse(0,0,rx,ry,0,0,TAU); ctx.fill();
    ctx.restore();
  }
}
function drawConstellations(seed,t){
  const h=hue(seed);
  for(let i=0;i<12;i++){
    const x1=(hash(seed,700+i*8)-.5)*1.35;
    const y1=(hash(seed,730+i*8)-.5)*.92;
    const x2=x1+(hash(seed,760+i*8)-.5)*.34;
    const y2=y1+(hash(seed,790+i*8)-.5)*.24;
    const a=worldPoint(x1,y1), b=worldPoint(x2,y2);
    ctx.strokeStyle='hsla('+h+',80%,78%,.12)';
    ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
    glowCircle(a.x,a.y,1.4+hash(seed,820+i)*1.8,'hsl('+h+',90%,84%)',.48);
    glowCircle(b.x,b.y,1.2+hash(seed,840+i)*1.5,'hsl('+((h+28)%360)+',90%,84%)',.36);
  }
}
function drawGalaxy(seed,t){
  const h=hue(seed);
  const c=worldPoint(0,0);
  for(let arm=0;arm<5;arm++){
    ctx.beginPath();
    for(let i=0;i<=92;i++){
      const u=i/92;
      const a=arm*TAU/5 + u*6.7 + t*.015*(arm%2?1:-1);
      const r=.035+u*.78;
      const wobble=1+.11*Math.sin(u*28+seed);
      const p=worldPoint(Math.cos(a)*r*wobble,Math.sin(a)*r*.56);
      if(i===0) ctx.moveTo(p.x,p.y); else ctx.lineTo(p.x,p.y);
    }
    ctx.strokeStyle='hsla('+((h+arm*12)%360)+',92%,78%,.19)';
    ctx.lineWidth=Math.max(1,Math.min(W,H)*.005*state.z);
    ctx.stroke();
  }
  for(let i=0;i<110*state.quality;i++){
    const a=hash(seed,910+i*2.4)*TAU;
    const r=.11+Math.pow(hash(seed,950+i*1.3),.8)*.76;
    const p=worldPoint(Math.cos(a)*r,Math.sin(a)*r*.55);
    glowCircle(p.x,p.y,.45+hash(seed,980+i)*1.4,'hsl('+((h+hash(seed,1000+i)*42)%360)+',90%,86%)',.22+hash(seed,1020+i)*.28);
  }
  const core=ctx.createRadialGradient(c.x,c.y,0,c.x,c.y,Math.min(W,H)*.16*state.z);
  core.addColorStop(0,'rgba(255,255,255,.96)');
  core.addColorStop(.08,'hsla('+h+',100%,90%,.76)');
  core.addColorStop(.38,'hsla('+((h+38)%360)+',88%,66%,.17)');
  core.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=core; ctx.beginPath(); ctx.arc(c.x,c.y,Math.min(W,H)*.17*state.z,0,TAU); ctx.fill();
  drawDust(seed,t);
}
function drawStellar(seed,t){
  const h=hue(seed);
  const c=worldPoint(0,0);
  for(let i=0;i<6;i++){
    const rx=Math.min(W,H)*(.09+i*.072)*state.z;
    ctx.save();
    ctx.translate(c.x,c.y);
    ctx.rotate((i-2.5)*.26+t*.002*(i+1));
    ctx.strokeStyle='hsla('+((h+i*18)%360)+',85%,78%,.13)';
    ctx.lineWidth=1;
    ctx.beginPath(); ctx.ellipse(0,0,rx,rx*(.37+i*.045),0,0,TAU); ctx.stroke();
    const a=t*(.07+i*.019)+hash(seed,1080+i)*TAU;
    const px=Math.cos(a)*rx, py=Math.sin(a)*rx*(.37+i*.045);
    glowCircle(px,py,3.2+hash(seed,1100+i)*2.5,'hsl('+((h+28*i)%360)+',95%,83%)',.72);
    ctx.restore();
  }
  drawStars(seed+44,110,.86,t);
}
function drawPlanet(seed,t){
  const h=hue(seed);
  const type=Math.floor(hash(seed,6100)*6);
  const names=['OCEAN','DESERT','ICE','VOLCANIC','GAS GIANT','FOREST'];
  const p=worldPoint(0,0);
  const R=Math.min(W,H)*.245*state.z;
  if(R<2) return;
  const offsetX=-R*.26, offsetY=-R*.31;
  const bodyHue=(h+[0,34,74,112,156,196][type])%360;
  const g=ctx.createRadialGradient(p.x+offsetX,p.y+offsetY,R*.05,p.x,p.y,R);
  g.addColorStop(0,'hsla('+((bodyHue+38)%360)+',72%,72%,.98)');
  g.addColorStop(.54,'hsla('+bodyHue+',68%,40%,.99)');
  g.addColorStop(.86,'hsla('+((bodyHue+24)%360)+',76%,18%,1)');
  g.addColorStop(1,'hsla('+bodyHue+',80%,7%,1)');
  ctx.fillStyle=g; ctx.beginPath(); ctx.arc(p.x,p.y,R,0,TAU); ctx.fill();

  ctx.save();
  ctx.beginPath(); ctx.arc(p.x,p.y,R,0,TAU); ctx.clip();
  if(type===0||type===5){
    for(let i=0;i<18;i++){
      const yy=p.y-R*.8+i*R*.1;
      ctx.strokeStyle='hsla('+((bodyHue+65)%360)+',72%,82%,'+(.07+hash(seed,800+i)*.15)+')';
      ctx.lineWidth=Math.max(1,R*.018);
      ctx.beginPath();
      ctx.moveTo(p.x-R,yy);
      ctx.quadraticCurveTo(p.x+R*.18,yy-R*.1*Math.sin(t*.3+i),p.x+R,yy+R*.04);
      ctx.stroke();
    }
  }
  if(type===0){
    ctx.fillStyle='rgba(92,209,232,.16)';
    for(let i=0;i<8;i++){
      const a=hash(seed,830+i)*TAU;
      const rr=.18+hash(seed,850+i)*.58;
      const gx=p.x+Math.cos(a)*rr*R;
      const gy=p.y+Math.sin(a)*rr*.72*R;
      ctx.beginPath(); ctx.ellipse(gx,gy,R*(.05+hash(seed,870+i)*.1),R*(.03+hash(seed,880+i)*.07),a,0,TAU); ctx.fill();
    }
  } else if(type===1){
    ctx.fillStyle='rgba(248,201,111,.14)';
    for(let i=0;i<20;i++){
      const a=hash(seed,890+i)*TAU, rr=(.16+hash(seed,910+i)*.72)*R;
      ctx.beginPath(); ctx.arc(p.x+Math.cos(a)*rr,p.y+Math.sin(a)*rr*.73,Math.max(1,R*.012),0,TAU); ctx.fill();
    }
  } else if(type===2){
    ctx.strokeStyle='rgba(225,246,255,.24)';
    ctx.lineWidth=Math.max(2,R*.025);
    for(let i=0;i<5;i++){ctx.beginPath();ctx.moveTo(p.x-R,p.y-R*.7+i*R*.32);ctx.lineTo(p.x+R,p.y-R*.55+i*R*.29);ctx.stroke();}
  } else if(type===3){
    ctx.strokeStyle='rgba(255,137,74,.22)';
    ctx.lineWidth=Math.max(2,R*.028);
    for(let i=0;i<7;i++){const yy=p.y-R*.7+i*R*.24;ctx.beginPath();ctx.moveTo(p.x-R,yy);ctx.quadraticCurveTo(p.x,yy+R*.14,p.x+R,yy-R*.03);ctx.stroke();}
  } else if(type===4){
    for(let i=0;i<10;i++){ctx.strokeStyle='rgba(228,194,145,'+(.06+i*.009)+')';ctx.lineWidth=Math.max(1,R*.02);ctx.beginPath();ctx.ellipse(p.x,p.y,R*(.3+i*.06),R*(.08+i*.022),-.2,0,TAU);ctx.stroke();}
  }
  ctx.restore();

  const ringR=R*1.1;
  ctx.strokeStyle='hsla('+((bodyHue+90)%360)+',80%,82%,.3)';
  ctx.lineWidth=Math.max(1,R*.022);
  ctx.beginPath(); ctx.ellipse(p.x,p.y,ringR,ringR*.28,-.34+t*.002,0,TAU); ctx.stroke();

  ctx.fillStyle='rgba(255,255,255,.55)';
  ctx.font='800 '+Math.max(8,Math.min(11,R*.045))+'px system-ui';
  ctx.textAlign='center';
  ctx.fillText(names[type],p.x,p.y+R+18);
}
function drawCity(seed,t){
  const h=hue(seed);
  const base=H*.72;
  ctx.save();
  ctx.translate(0,base);
  ctx.strokeStyle='rgba(255,255,255,.045)';
  ctx.lineWidth=1;
  for(let i=0;i<11;i++){
    const y=-i*i*3;
    ctx.beginPath(); ctx.moveTo(W*.08,y); ctx.lineTo(W*.92,y-20*i); ctx.stroke();
  }
  for(let i=0;i<28*state.quality;i++){
    const x=W*(.08+hash(seed,910+i)*.84);
    const bh=28+hash(seed,940+i)*Math.min(H*.34,180);
    const bw=12+hash(seed,970+i)*42;
    ctx.fillStyle='hsla('+((h+i*7)%360)+',22%,'+(13+hash(seed,1000+i)*20)+'%,.95)';
    ctx.fillRect(x-bw*.5,-bh,bw,bh);
    ctx.fillStyle='hsla('+((h+55)%360)+',92%,82%,.5)';
    const cols=Math.max(2,Math.floor(bw/9));
    const rows=Math.max(2,Math.floor(bh/19));
    for(let cx=0;cx<cols;cx++) for(let cy=0;cy<rows;cy++){
      if(hash(seed,1040+i*31+cx*7+cy*9)>.57) ctx.fillRect(x-bw*.36+cx*8,-bh+9+cy*15,3,5);
    }
  }
  ctx.strokeStyle='hsla('+h+',90%,82%,.28)';
  ctx.lineWidth=2;
  ctx.beginPath(); ctx.moveTo(W*.1,-10); ctx.lineTo(W*.4,-85); ctx.lineTo(W*.9,-15); ctx.stroke();
  ctx.restore();
  drawStars(seed+11,40,.8,t);
}
function drawData(seed,t){
  const h=hue(seed);
  const p=worldPoint(0,0);
  for(let i=0;i<9;i++){
    const r=Math.min(W,H)*(.075+i*.072)*state.z;
    ring(p.x,p.y,r,'hsla('+((h+i*17)%360)+',88%,78%,.24)',1,.8,(i%2?t:-t)*.14,(i%2?t:-t)*.14+TAU*(.57+hash(seed,1180+i)*.28));
  }
  for(let i=0;i<38*state.quality;i++){
    const a=hash(seed,1230+i)*TAU;
    const r=.12+hash(seed,1270+i)*.82;
    const q=worldPoint(Math.cos(a)*r,Math.sin(a)*r*.72);
    const next=worldPoint(Math.cos(a+.34)*r*.96,Math.sin(a+.34)*r*.72);
    ctx.strokeStyle='hsla('+((h+hash(seed,1310+i)*60)%360)+',88%,78%,.08)';
    ctx.beginPath(); ctx.moveTo(q.x,q.y); ctx.lineTo(next.x,next.y); ctx.stroke();
    glowCircle(q.x,q.y,1.4+hash(seed,1350+i)*3.2,'hsl('+((h+20)%360)+',90%,84%)',.38);
  }
}
function drawMicro(seed,t){
  const h=hue(seed);
  for(let i=0;i<45*state.quality;i++){
    const a=hash(seed,1410+i)*TAU;
    const r=.12+hash(seed,1450+i)*.86;
    const p=worldPoint(Math.cos(a)*r,Math.sin(a)*r*.7);
    const size=2+hash(seed,1490+i)*9;
    ctx.strokeStyle='hsla('+((h+i*5)%360)+',82%,78%,.13)';
    ctx.lineWidth=1;
    ctx.beginPath();
    ctx.arc(p.x,p.y,size,t*.12+i, t*.12+i+TAU*.76);
    ctx.stroke();
    glowCircle(p.x,p.y,1.2+hash(seed,1520+i)*2.1,'hsl('+((h+40)%360)+',90%,80%)',.25);
  }
  drawStars(seed+9,55,.72,t*.7);
}
function drawFractal(seed,t){
  const h=hue(seed);
  const unit=Math.min(W,H)*.6*state.z;
  function branch(x,y,r,n,rot){
    if(n<=0||r*unit<4) return;
    const p=worldPoint(x,y);
    ctx.save();
    ctx.translate(p.x,p.y);
    ctx.rotate(rot);
    ctx.strokeStyle='hsla('+((h+n*22)%360)+',86%,80%,'+(.08+n*.018)+')';
    ctx.lineWidth=Math.max(.7,r*11*state.z);
    ctx.strokeRect(-r*unit*.5,-r*unit*.5,r*unit,r*unit);
    ctx.restore();
    for(let i=0;i<4;i++){
      const a=rot+TAU*i/4+t*.008;
      branch(x+Math.cos(a)*r*.64,y+Math.sin(a)*r*.64,r*.42,n-1,a);
    }
  }
  branch(0,0,.55,Math.min(5,3+(state.depth%3)),0);
}
function drawBiosphere(seed,t){
  const h=hue(seed);
  const center=worldPoint(0,0);
  for(let i=0;i<36*state.quality;i++){
    const a=hash(seed,1600+i)*TAU;
    const r=.11+hash(seed,1640+i)*.9;
    const p=worldPoint(Math.cos(a)*r,Math.sin(a)*r*.66);
    const stem=14+hash(seed,1680+i)*42;
    ctx.strokeStyle='hsla('+((h+90+hash(seed,1710+i)*45)%360)+',85%,78%,.16)';
    ctx.lineWidth=1+hash(seed,1740+i);
    ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.quadraticCurveTo(p.x+Math.sin(t*.4+i)*5,p.y-stem*.4,p.x+Math.cos(a)*6,p.y-stem); ctx.stroke();
    glowCircle(p.x+Math.cos(a)*6,p.y-stem,2+hash(seed,1770+i)*3,'hsl('+((h+110)%360)+',92%,80%)',.38);
  }
  for(let i=0;i<5;i++){
    const rr=Math.min(W,H)*(.12+i*.11)*state.z;
    ring(center.x,center.y,rr,'hsla('+((h+100+i*22)%360)+',80%,76%,.1)',1,.75,t*.03*(i%2?1:-1),t*.03*(i%2?1:-1)+TAU*.72);
  }
}
function drawAnomaly(seed,t){
  const h=hue(seed);
  const center=worldPoint(0,0);
  for(let i=0;i<18;i++){
    const rr=Math.min(W,H)*(.07+i*.058)*state.z;
    ring(center.x,center.y,rr,'hsla('+((h+i*19)%360)+',92%,76%,.18)',Math.max(1,(i%4)+1),.55,t*(.02+i*.001),t*(.02+i*.001)+TAU*(.32+hash(seed,1840+i)*.54));
  }
  ctx.save();
  ctx.translate(center.x,center.y);
  ctx.rotate(t*.03);
  ctx.strokeStyle='hsla('+h+',90%,82%,.16)';
  ctx.lineWidth=1;
  for(let i=0;i<10;i++){
    const x=(i-5)*Math.min(W,H)*.06;
    ctx.beginPath(); ctx.moveTo(x,-H*.45); ctx.lineTo(x*.2,H*.45); ctx.stroke();
  }
  ctx.restore();
  glowCircle(center.x,center.y,Math.min(W,H)*.075*state.z,'#ffffff',.14);
}

function drawWorld(family,seed,t){
  switch(family){
    case 0: drawStars(seed+1,150,.98,t); drawConstellations(seed,t); drawDust(seed,t); break;
    case 1: drawStars(seed+22,60,.96,t); drawGalaxy(seed,t); break;
    case 2: drawStellar(seed,t); break;
    case 3: drawPlanet(seed,t); break;
    case 4: drawCity(seed,t); break;
    case 5: drawData(seed,t); break;
    case 6: drawMicro(seed,t); break;
    case 7: drawFractal(seed,t); break;
    case 8: drawBiosphere(seed,t); break;
    default: drawAnomaly(seed,t); break;
  }
}

function nextWorld(){
  const nextDepth=state.depth+1;
  const nextSeed=seedFor(state.seed,nextDepth, state.family+1);
  const nextFamily=familyFor(nextDepth,nextSeed);
  return {depth:nextDepth,seed:nextSeed,family:nextFamily};
}
function drawPreview(family,seed,x,y,r,t){
  ctx.save();
  ctx.beginPath(); ctx.arc(x,y,r,0,TAU); ctx.clip();
  ctx.fillStyle='rgba(2,4,9,.94)'; ctx.fillRect(x-r,y-r,r*2,r*2);
  const baseHue=hue(seed);
  const g=ctx.createRadialGradient(x-r*.3,y-r*.35,0,x,y,r);
  g.addColorStop(0,'hsla('+((baseHue+40)%360)+',82%,66%,.36)');
  g.addColorStop(.46,'hsla('+baseHue+',74%,31%,.35)');
  g.addColorStop(1,'rgba(1,2,5,.96)');
  ctx.fillStyle=g; ctx.fillRect(x-r,y-r,r*2,r*2);
  if(family===0||family===1){
    for(let i=0;i<40;i++){
      const a=hash(seed,2000+i)*TAU, rr=hash(seed,2040+i)*r*.95;
      glowCircle(x+Math.cos(a)*rr,y+Math.sin(a)*rr*.64,Math.max(.5,r*.012+hash(seed,2080+i)*r*.024),'hsl('+((baseHue+hash(seed,2120+i)*55)%360)+',90%,86%)',.5);
    }
  } else if(family===2||family===5||family===6){
    for(let i=0;i<6;i++){
      ring(x,y,r*(.12+i*.13),'hsla('+((baseHue+i*22)%360)+',90%,82%,.24)',1.1,.8,t*.04*(i%2?1:-1),t*.04*(i%2?1:-1)+TAU*.76);
    }
  } else if(family===3){
    const q=ctx.createRadialGradient(x-r*.25,y-r*.3,0,x,y,r*.8);
    q.addColorStop(0,'hsla('+((baseHue+40)%360)+',75%,74%,.96)');
    q.addColorStop(.7,'hsla('+baseHue+',70%,32%,.98)');
    q.addColorStop(1,'hsla('+((baseHue+20)%360)+',80%,8%,1)');
    ctx.fillStyle=q; ctx.beginPath(); ctx.arc(x,y,r*.72,0,TAU); ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,.18)'; ctx.lineWidth=2; ctx.beginPath(); ctx.ellipse(x,y,r*.83,r*.22,-.28,0,TAU); ctx.stroke();
  } else if(family===4){
    ctx.fillStyle='rgba(210,239,255,.18)';
    for(let i=0;i<13;i++){const bx=x-r*.85+hash(seed,2200+i)*r*1.7;const bh=r*(.2+hash(seed,2230+i)*.9);ctx.fillRect(bx,y+r*.7-bh,r*(.07+hash(seed,2260+i)*.14),bh);}
  } else if(family===7||family===9){
    ctx.strokeStyle='hsla('+baseHue+',90%,80%,.23)'; ctx.lineWidth=1;
    for(let i=0;i<4;i++){ctx.strokeRect(x-r*(.45-i*.08),y-r*(.45-i*.08),r*(.9-i*.16),r*(.9-i*.16));}
  } else if(family===8){
    for(let i=0;i<18;i++){const a=hash(seed,2300+i)*TAU,rr=hash(seed,2330+i)*r*.8;ctx.strokeStyle='hsla('+((baseHue+95)%360)+',86%,76%,.26)';ctx.beginPath();ctx.moveTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr);ctx.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr-r*.3);ctx.stroke();}
  }
  ctx.restore();
}
function drawPortal(seed,t){
  const h=hue(seed);
  const p=worldPoint(0,0);
  const R=Math.min(W,H)*.18*state.z;
  if(R<2) return;
  const incoming=nextWorld();
  const pulse=1 + .055*Math.sin(t*2.1+hash(seed,2400)*TAU);
  const halo=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,R*1.65);
  halo.addColorStop(0,'hsla('+h+',100%,86%,.24)');
  halo.addColorStop(.2,'hsla('+((h+45)%360)+',100%,72%,.1)');
  halo.addColorStop(.58,'rgba(2,4,9,.74)');
  halo.addColorStop(1,'rgba(2,4,9,0)');
  ctx.fillStyle=halo; ctx.beginPath(); ctx.arc(p.x,p.y,R*1.65,0,TAU); ctx.fill();

  for(let i=0;i<5;i++){
    const rr=R*(.83+i*.085)*pulse;
    ctx.save();
    ctx.translate(p.x,p.y);
    ctx.rotate(t*.028*(i%2?1:-1));
    ctx.strokeStyle='hsla('+((h+i*18)%360)+',100%,78%,'+(.12+i*.105)+')';
    ctx.shadowColor='hsl('+((h+i*18)%360)+',95%,72%)';
    ctx.shadowBlur=16+i*10;
    ctx.lineWidth=Math.max(1,R*(.009+i*.002));
    ctx.beginPath();
    ctx.arc(0,0,rr,-.32,TAU-.32);
    ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  ctx.globalCompositeOperation='lighter';
  for(let i=0;i<24*state.quality;i++){
    const a=hash(seed,2500+i)*TAU+t*(.04+hash(seed,2530+i)*.02);
    const rr=R*(.6+hash(seed,2560+i)*.5);
    glowCircle(p.x+Math.cos(a)*rr,p.y+Math.sin(a)*rr*.68,1+hash(seed,2590+i)*2.2,'hsl('+((h+hash(seed,2620+i)*50)%360)+',95%,84%)',.22);
  }
  ctx.restore();

  drawPreview(incoming.family,incoming.seed,p.x,p.y,R*.7,t);

  const core=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,R*.78);
  core.addColorStop(0,'rgba(255,255,255,.92)');
  core.addColorStop(.045,'hsla('+h+',100%,92%,.72)');
  core.addColorStop(.26,'hsla('+((h+36)%360)+',100%,72%,.22)');
  core.addColorStop(.62,'rgba(2,4,9,.78)');
  core.addColorStop(1,'rgba(2,4,9,0)');
  ctx.fillStyle=core; ctx.beginPath(); ctx.arc(p.x,p.y,R*.84,0,TAU); ctx.fill();

  ring(p.x,p.y,R*.99,'hsla('+h+',100%,82%,.18)',1.2,.9,t*.05,t*.05+TAU*.64);
  const edge=ctx.createRadialGradient(p.x,p.y,R*.7,p.x,p.y,R*1.05);
  edge.addColorStop(0,'rgba(255,255,255,0)');
  edge.addColorStop(.78,'hsla('+h+',100%,82%,.04)');
  edge.addColorStop(1,'hsla('+h+',100%,82%,.24)');
  ctx.fillStyle=edge; ctx.beginPath(); ctx.arc(p.x,p.y,R*1.05,0,TAU); ctx.fill();
}
function drawTransition(t){
  if(state.transition<=0) return;
  const q=ease(state.transition);
  const centerX=W*.5, centerY=H*.54;
  const radius=Math.max(W,H)*(1.15-q*.9);
  const g=ctx.createRadialGradient(centerX,centerY,0,centerX,centerY,radius);
  g.addColorStop(0,'rgba(255,255,255,'+(0.12*q)+')');
  g.addColorStop(.18,'hsla('+hue(state.seed)+',100%,84%,'+(0.1*q)+')');
  g.addColorStop(1,'rgba(1,2,6,0)');
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
  ctx.strokeStyle='rgba(255,255,255,'+(0.14*q)+')';
  ctx.lineWidth=1;
  ctx.beginPath(); ctx.arc(centerX,centerY,Math.min(W,H)*(.28+q*.55),0,TAU); ctx.stroke();
}

function portalHit(px,py){
  const p=worldPoint(0,0);
  const R=Math.max(44,Math.min(W,H)*.18*state.z*1.24);
  return Math.hypot(px-p.x,py-p.y)<=R;
}
function queueDive(){
  if(state.rebaseCooldown>0) return;
  state.tz=MAX_Z;
  state.diveRequested=true;
  state.pulse=1;
  setStatus('CORE LOCKED');
  emitEvent('DESCENT VECTOR ARMED');
}
function commitDepth(){
  const n=nextWorld();
  state.depth=n.depth;
  state.seed=n.seed;
  state.family=n.family;
  state.x=0; state.y=0; state.tx=0; state.ty=0;
  state.z=1.04; state.tz=1.04;
  state.transition=reducedMotion ? .18 : 1;
  state.rebaseCooldown=.9;
  state.diveRequested=false;
  state.pulse=1;
  updateHud();
  saveDiscovery(state.family===9?'Rare anomaly':'New world: '+WORLDS[state.family].family);
  emitEvent();
}
function maybeAdvance(){
  if(state.rebaseCooldown>0){ state.rebaseCooldown-=.016; return; }
  if(state.diveRequested || state.tz>MAX_Z*.92){
    commitDepth();
  }
}
function reset(){
  state.x=0;state.y=0;state.z=1;state.tx=0;state.ty=0;state.tz=1;
  state.depth=0;state.seed=1.234;state.family=0;state.transition=0;state.pulse=.2;
  state.diveRequested=false;state.rebaseCooldown=0;state.quality=Math.max(state.quality,.8);
  updateHud(); emitEvent('SURFACE REINITIALIZED');
}
function surprise(){
  const destinations=[2,4,7,11,18,27,41,64,89,128,177];
  const target=destinations[Math.floor(Math.random()*destinations.length)];
  let seed=Math.random()*9000+target*.371;
  state.depth=target;
  state.seed=seed;
  state.family=familyFor(target,seed);
  state.x=(hash(seed,2800)-.5)*.42;
  state.y=(hash(seed,2840)-.5)*.3;
  state.tx=state.x; state.ty=state.y;
  state.z=1.52; state.tz=1.72;
  state.transition=reducedMotion ? .12 : .65;
  state.pulse=1;
  state.rebaseCooldown=.7;
  state.diveRequested=false;
  updateHud();
  saveDiscovery('Surprise destination · '+WORLDS[state.family].family);
  emitEvent('SURPRISE VECTOR / D'+String(target).padStart(2,'0'));
}
function zoomAt(f,px,py){
  const before=screenToWorld(px==null?W*.5:px,py==null?H*.54:py);
  state.tz=clamp(state.tz*f,MIN_Z,MAX_Z);
  const k=Math.min(W,H)*VIEW_SCALE*state.tz;
  const sx=px==null?W*.5:px, sy=py==null?H*.54:py;
  state.tx=before.x-(sx-W*.5)/k;
  state.ty=before.y-(sy-H*.54)/k;
}
function stepRotation(dx){
  state.angleTarget=clamp(state.angleTarget+dx,-1.8,1.8);
}
function updateInputVisual(){
  canvas.classList.toggle('dragging',state.dragging);
}

function pointerDown(e){
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  canvas.setPointerCapture?.(e.pointerId);
  down={x:e.clientX,y:e.clientY}; downAt=performance.now();
  lastPoint=down;
  if(pointers.size===2){
    const a=[...pointers.values()];
    pinch={d:Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y),z:state.tz};
    state.dragging=false;
  } else {
    state.dragging=true;
  }
  updateInputVisual();
}
function pointerMove(e){
  if(!pointers.has(e.pointerId)) return;
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pointers.size===2 && pinch){
    const a=[...pointers.values()];
    const d=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);
    state.tz=clamp(pinch.z*d/Math.max(1,pinch.d),MIN_Z,MAX_Z);
    return;
  }
  if(pointers.size===1 && lastPoint){
    const dx=e.clientX-lastPoint.x, dy=e.clientY-lastPoint.y;
    state.tx-=(dx)/(Math.min(W,H)*VIEW_SCALE*Math.max(.001,state.tz));
    state.ty-=(dy)/(Math.min(W,H)*VIEW_SCALE*Math.max(.001,state.tz));
    state.x=state.tx; state.y=state.ty;
    stepRotation(dx*.003);
    lastPoint={x:e.clientX,y:e.clientY};
  }
}
function pointerUp(e){
  const p={x:e.clientX,y:e.clientY};
  const now=performance.now();
  const elapsed=now-downAt;
  const move=down?Math.hypot(p.x-down.x,p.y-down.y):999;
  pointers.delete(e.pointerId);
  if(pointers.size<2) pinch=null;
  if(pointers.size===0){state.dragging=false;lastPoint=null;updateInputVisual();}
  if(elapsed<380 && move<14){
    const isDouble=lastTap && now-lastTap.t<360 && Math.hypot(p.x-lastTap.x,p.y-lastTap.y)<30;
    if(portalHit(p.x,p.y)||isDouble) queueDive();
    lastTap={x:p.x,y:p.y,t:now};
  }
}

canvas.addEventListener('pointerdown',pointerDown,{passive:true});
canvas.addEventListener('pointermove',pointerMove,{passive:true});
canvas.addEventListener('pointerup',pointerUp,{passive:true});
canvas.addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);pinch=null;state.dragging=false;lastPoint=null;updateInputVisual();},{passive:true});
canvas.addEventListener('wheel',e=>{
  e.preventDefault();
  const factor=Math.exp(-e.deltaY*.00185);
  zoomAt(factor,e.clientX,e.clientY);
},{passive:false});
canvas.addEventListener('dblclick',e=>{e.preventDefault();queueDive();});

document.getElementById('reset')?.addEventListener('click',reset);
document.getElementById('jump')?.addEventListener('click',surprise);

addEventListener('keydown',e=>{
  if(e.key==='r'||e.key==='R'){e.preventDefault();reset();}
  else if(e.key==='s'||e.key==='S'){e.preventDefault();surprise();}
  else if(e.key==='+'||e.key==='='){e.preventDefault();zoomAt(1.35);}
  else if(e.key==='-'||e.key==='_'){e.preventDefault();zoomAt(.74);}
  else if(e.key==='Enter'){e.preventDefault();queueDive();}
  else if(e.key==='Escape'){e.preventDefault();reset();}
  else if(e.key==='ArrowLeft'){stepRotation(-.08);}
  else if(e.key==='ArrowRight'){stepRotation(.08);}
});

function qualityTick(dt){
  const fps=1000/Math.max(1,dt);
  fpsSmoother=fpsSmoother*.9+fps*.1;
  if(fpsSmoother<43) state.quality=clamp(state.quality-.018,.48,1);
  else if(fpsSmoother>56) state.quality=clamp(state.quality+.008,.48,1);
}

function render(ms){
  const dt=Math.min(50,Math.max(8,ms-lastFrame));
  lastFrame=ms;
  state.time=ms*.001;
  qualityTick(dt);
  state.z += (state.tz-state.z)*(reducedMotion ? .24 : .115);
  state.x += (state.tx-state.x)*.1;
  state.y += (state.ty-state.y)*.1;
  state.angle += (state.angleTarget-state.angle)*.06;
  if(state.transition>0) state.transition=Math.max(0,state.transition-(reducedMotion ? .045 : .026));
  if(state.pulse>0) state.pulse=Math.max(0,state.pulse-.018);
  maybeAdvance();

  clearFrame();
  drawBackdrop(state.seed,state.time);

  ctx.save();
  ctx.translate(W*.5,H*.54);
  ctx.rotate(state.angle*.018);
  ctx.translate(-W*.5,-H*.54);

  drawWorld(state.family,state.seed,state.time);

  if(state.transition>0){
    ctx.globalAlpha=clamp(state.transition*1.15,.08,1);
  }
  drawPortal(state.seed,state.time);
  ctx.globalAlpha=1;
  ctx.restore();

  if(state.pulse>0){
    ctx.fillStyle='rgba(195,231,255,'+(state.pulse*.025)+')';
    ctx.fillRect(0,0,W,H);
  }
  drawTransition(state.time);
  raf=requestAnimationFrame(render);
}

window.NexusNovaInfiniteLab={
  getState:()=>({...state}),
  reset,
  surprise,
  dive:queueDive,
  zoom:f=>zoomAt(f),
  testPortalHit:portalHit,
  commitDepth,
  worlds:WORLDS.map(w=>w.family)
};

bootPhase('PHASE 01 / FOUNDATION',26,'Mounting the canvas, sizing the visual field and preparing input-safe rendering.');
requestAnimationFrame(()=>{
  bootPhase('PHASE 02 / RENDERING CORE',62,'Calibrating the procedural field, deterministic world seed and bounded visual complexity.');
  setTimeout(()=>{
    firstFrame=true;
    bootPhase('PHASE 03 / PORTAL CALIBRATION',100,'The first gateway is ready. Every descent re-seeds the next world locally.');
    document.getElementById('loading')?.classList.add('hidden');
    updateHud();
    emitEvent('DEEP FIELD ONLINE');
  },reducedMotion?80:420);
});
updateHud();
raf=requestAnimationFrame(render);

})();