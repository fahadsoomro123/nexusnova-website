(() => {
'use strict';

const TAU = Math.PI * 2;
const WORLDS = [
  {name:'EARTH / SOLAR SYSTEM',family:'SOLAR SYSTEM',type:'REAL-DATA ANCHORED + 3D CONTEXT',scale:'EARTH → PLANETARY SCALE',desc:'Begin near Earth and the Solar System. Bodies, orbital planes and source-backed anchors are rendered as a navigable 3D context; geometry is not a photograph.'},
  {name:'LOCAL STELLAR NEIGHBORHOOD',family:'NEARBY STARS',type:'REAL CATALOG + DERIVED VISUALIZATION',scale:'STELLAR NEIGHBORHOOD',desc:'Travel outward into a local stellar volume where catalog stars vary by measured brightness, colour-related fields and distance. Public catalog coverage is partial.'},
  {name:'MILKY WAY',family:'MILKY WAY GALAXY',type:'REAL CATALOG + PROCEDURAL CONTEXT',scale:'GALACTIC SCALE',desc:'See the Milky Way as a disk, bulge and spiral-arm context with catalog objects embedded inside it. The large structure is a reconstruction for exploration, not a complete observed map.'},
  {name:'LOCAL GROUP',family:'LOCAL GROUP / GALAXIES',type:'REAL CATALOG + PROCEDURAL CONTEXT',scale:'INTERGALACTIC SCALE',desc:'Resolved galaxy-form visualizations place real anchor galaxies within a Local Group context. Shapes are visual reconstructions, never telescope photographs.'},
  {name:'GALAXY CLUSTERS',family:'GALAXY CLUSTERS',type:'PUBLIC SURVEY + DERIVED CONTEXT',scale:'CLUSTER SCALE',desc:'Galaxies gather into cluster-scale environments. Survey-derived positions and procedural morphology are kept visibly distinct.'},
  {name:'COSMIC WEB',family:'FILAMENTS + VOIDS',type:'PUBLIC SURVEY + DERIVED VISUALIZATION',scale:'LARGE-SCALE STRUCTURE',desc:'Explore filamentary structure, nodes and void-like regions using public survey data where available and clearly labelled derived geometry elsewhere.'},
  {name:'DEEP UNIVERSE',family:'DEEP EXTRAGALACTIC FIELD',type:'PUBLIC SURVEY + PROCEDURAL CONTEXT',scale:'COSMOLOGICAL DEPTH',desc:'Distant galaxy fields and redshift-aware depth create the deep-universe view. Catalog coverage remains partial; the visualization does not claim completeness.'},
  {name:'SIGNAL GARDEN',family:'DATA WORLD',type:'PROCEDURAL VISUALIZATION',scale:'DATA SCALE',desc:'A deterministic information-world made from nodes, rings and traces. The geometry is synthetic.'},
  {name:'NEBULA CHAMBER',family:'NEBULA',type:'PROCEDURAL VISUALIZATION',scale:'NEBULAR SCALE',desc:'A volumetric-looking dust and emission visualization intended as context around nebular object classes.'},
  {name:'STAR SYSTEM',family:'STAR SYSTEM',type:'REAL CATALOG',scale:'STAR SYSTEM',desc:'Host-star and exoplanet records can be inspected where the public archive reports them. Orbits are visual guides, not live ephemerides.'},
  {name:'PLANET FORGE',family:'PLANET',type:'PROCEDURAL VISUALIZATION',scale:'PLANETARY SCALE',desc:'A generated planetary scene whose visual class is driven by available catalog fields when a real planet is selected.'},
  {name:'AGN CORE',family:'BLACK HOLE / AGN',type:'ILLUSTRATIVE CONTEXT',scale:'COMPACT OBJECT',desc:'A visual interpretation of an accretion-disk / active-galaxy concept. It is not a direct image of a black-hole surface.'},
  {name:'ANOMALY FIELD',family:'ANOMALY',type:'PROCEDURAL VISUALIZATION',scale:'RARE PROCEDURAL LAYER',desc:'A rare deterministic variant with warped geometry and interference patterns. It is explicitly synthetic.'}
];

const STATIC_ANCHORS = [
  {id:'sun',name:'Sun',source:'Anchor / Solar System',sourceType:'REAL CATALOG',release:'Reference anchor',ra:0,dec:0,distanceLy:0.00000508,type:'Star',mag:-26.74,spectral:'G2 V',reference:'IAU/Solar reference',sourceUrl:'https://solarsystem.nasa.gov/solar-system/sun/overview/'},
  {id:'sirius',name:'Sirius',source:'Reference anchor',sourceType:'REAL CATALOG',release:'Reference anchor',ra:101.2875/15,dec:-16.7161,distanceLy:8.6,type:'Star',mag:-1.46,spectral:'A1 V',reference:'Bright-star reference',sourceUrl:'https://simbad.cds.unistra.fr/simbad/sim-id?Ident=Sirius'},
  {id:'proxima',name:'Proxima Centauri',source:'Reference anchor',sourceType:'REAL CATALOG',release:'Reference anchor',ra:14.4953,dec:-62.6795,distanceLy:4.246,type:'Star',mag:11.13,spectral:'M5.5 Ve',reference:'Nearest-star reference',sourceUrl:'https://simbad.cds.unistra.fr/simbad/sim-id?Ident=Proxima%20Centauri'},
  {id:'vega',name:'Vega',source:'Reference anchor',sourceType:'REAL CATALOG',release:'Reference anchor',ra:18.6156,dec:38.7837,distanceLy:25.0,type:'Star',mag:0.03,spectral:'A0 V',reference:'Bright-star reference',sourceUrl:'https://simbad.cds.unistra.fr/simbad/sim-id?Ident=Vega'},
  {id:'betelgeuse',name:'Betelgeuse',source:'Reference anchor',sourceType:'REAL CATALOG',release:'Reference anchor',ra:5.9195,dec:7.4071,distanceLy:548,type:'Star',mag:0.42,spectral:'M1-2 Ia-Iab',reference:'Bright-star reference',sourceUrl:'https://simbad.cds.unistra.fr/simbad/sim-id?Ident=Betelgeuse'},
  {id:'m31',name:'M31 / Andromeda Galaxy',source:'Reference anchor',sourceType:'REAL CATALOG',release:'Reference anchor',ra:0.712,dec:41.269,distanceLy:2500000,type:'Galaxy',reference:'Extragalactic reference',sourceUrl:'https://ned.ipac.caltech.edu/'},
  {id:'m87',name:'M87',source:'Reference anchor',sourceType:'REAL CATALOG',release:'Reference anchor',ra:12.5137,dec:12.3911,distanceLy:53500000,type:'Galaxy',reference:'Extragalactic reference',sourceUrl:'https://ned.ipac.caltech.edu/'},
  {id:'sgr-a',name:'Sagittarius A*',source:'Reference anchor',sourceType:'REAL CATALOG',release:'Reference anchor',ra:17.7611,dec:-28.9998,distanceLy:26673,type:'Black hole / AGN',reference:'Galactic-center reference',sourceUrl:'https://ned.ipac.caltech.edu/'},
  {id:'kepler-22-b',name:'Kepler-22 b',source:'Reference anchor',sourceType:'REAL CATALOG',release:'Reference anchor',ra:19.1411,dec:47.7784,distanceLy:600,type:'Exoplanet',planet:'Kepler-22 b',host:'Kepler-22',reference:'NASA Exoplanet Archive',sourceUrl:'https://exoplanetarchive.ipac.caltech.edu/'}
];

const state = {
  depth:0, family:0, seed:1.234, worldId:'D00-F00-001234',
  yaw:0.28, pitch:0.18, distance:8.2, targetDistance:8.2,
  panX:0,panY:0,targetPanX:0,targetPanY:0,
  skyRA:0,skyDec:0, quality:1, origin:[0,0,0], originRebaseCount:0,
  transition:0, portalArmed:false, selectedId:null, history:[],
  catalogMessage:'Initializing public-data adapters…', cacheMax:12, staleProtection:true,
  lodEnabled:true,cullingEnabled:true,boundedDpr:2,queriesInFlight:0
};

let reducedMotion=false;
try{ reducedMotion=matchMedia('(prefers-reduced-motion:reduce)').matches; }catch(_){}
const pointers=new Map();
let pinch=null,lastTap=null,down=null,dragging=false;
const setText=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const ease=t=>{const x=clamp(t,0,1);return x*x*(3-2*x)};
function h32(s){ let h=2166136261>>>0; const str=String(s); for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619)} return (h>>>0)/4294967296; }
function hash(seed,index){return h32(String(seed)+'|'+index);}
function seedFor(parent,depth,family,salt=0){return parent*1.618033988749895 + hash(parent+'|'+depth+'|'+family,salt+17)*13.37 + hash(parent+'|'+family,salt+31)*0.731;}
function worldSignature(depth,seed,family){return 'D'+String(depth).padStart(2,'0')+'-F'+String(family).padStart(2,'0')+'-'+Math.floor(Math.abs(seed)*1e6).toString(36).toUpperCase();}
function familyFor(depth,seed){ const rare=hash(seed,991+depth); return rare>.965?12:depth%12; }
function nextWorld(seed=state.seed,depth=state.depth){const fam=familyFor(depth+1,seed);const s=seedFor(seed,depth+1,fam,depth*7+3);return{depth:depth+1, family:fam, seed:s};}
function currentWorld(){return WORLDS[state.family]||WORLDS[0];}
function updateHUD(){
  const w=currentWorld();
  state.worldId=worldSignature(state.depth,state.seed,state.family);
  setText('depthIndex',String(state.depth).padStart(2,'0'));
  setText('depthFamily',w.family);
  setText('scaleLabel',w.scale);
  document.querySelectorAll('[data-scale-step]').forEach((el)=>{const n=Number(el.getAttribute('data-scale-step'));el.classList.toggle('active',n===Math.min(6,state.depth));el.classList.toggle('passed',n<Math.min(6,state.depth));});
  setText('worldType',w.type);
  setText('worldName',w.name);
  setText('worldDescription',w.desc);
  setText('worldId',state.worldId);
  setText('seedReadout',(Math.abs(state.seed)%100000).toFixed(4).padStart(9,'0'));
  setText('catalogCount',String(getAllObjects().length)+' objects loaded');
  setText('distanceLabel',state.depth>=2?'LOGARITHMIC':'LOCAL FRAME');
  const scaleReadings=['~1–40 AU FRAME','~4–30 LY LOCAL VOLUME','~10–100 KLY GALACTIC REGION','~0.1–3 MLY GALAXY GROUP','~10–100 MLY CLUSTER CONTEXT','~0.1–1 GLY COSMIC WEB','MULTI-GLY DEEP FIELD'];
  setText('physicalScale',scaleReadings[Math.min(6,state.depth)]);
  setText('cameraDistance','CAM '+Number(state.distance||8.2).toFixed(2));
  const m=document.getElementById('depthMeter'); if(m)m.style.width=clamp(7+Math.log1p(state.depth)*14,7,94)+'%';
  const az=(state.yaw*180/Math.PI+360)%360, el=clamp(state.pitch*180/Math.PI,-89,89);
  setText('cameraReadout','AZ '+String(Math.round(az)).padStart(3,'0')+'° · EL '+(el>=0?'+':'')+Math.round(el)+'°');
  const ra=((state.skyRA%24)+24)%24; setText('vectorReadout','RA '+String(Math.floor(ra)).padStart(2,'0')+':'+String(Math.round((ra%1)*60)).padStart(2,'0')+' / DEC '+(state.skyDec>=0?'+':'')+state.skyDec.toFixed(1)+'°');
  const d=document.getElementById('radarDot'); if(d){d.style.left=clamp(50+state.panX*28,13,87)+'%';d.style.top=clamp(50+state.panY*28,13,87)+'%';}
  setText('breadcrumbText',state.history.length?currentWorld().family+' · previous '+WORLDS[state.history[state.history.length-1].family].family:currentWorld().family);
  const bb=document.getElementById('breadcrumbBack'); if(bb)bb.disabled=!state.history.length;
}
function emitEvent(msg){setText('eventText',msg);const e=document.getElementById('eventStrip');if(e){e.classList.add('on');clearTimeout(emitEvent.t);emitEvent.t=setTimeout(()=>e.classList.remove('on'),2200)}}
function setCatalogStatus(msg){state.catalogMessage=msg;setText('catalogStatus',msg);}
function sourceState(name,stateName){const row=document.querySelector('.source-row[data-source="'+name+'"]');if(row){row.classList.remove('loading','error');if(stateName==='loading')row.classList.add('loading');if(stateName==='error')row.classList.add('error');const s=row.querySelector('.source-state');if(s)s.textContent=stateName.toUpperCase();}}
function saveDiscovery(kind,objId){try{const key='nexusnova.infiniteLab.discoveries';const a=JSON.parse(localStorage.getItem(key)||'[]');const id=String(objId||state.worldId);if(!a.some(x=>x.id===id)){a.push({id,kind,depth:state.depth,family:state.family,timestamp:new Date().toISOString()});localStorage.setItem(key,JSON.stringify(a.slice(-100)));}const card=document.getElementById('discoveryCard');if(card){setText('discoveryTitle',kind);setText('discoveryText','Saved locally · depth '+state.depth+' · '+currentWorld().family);card.classList.add('on');clearTimeout(saveDiscovery.t);saveDiscovery.t=setTimeout(()=>card.classList.remove('on'),3200)}}catch(_){}}
function announce(msg){setCatalogStatus(msg);emitEvent(msg);}
function rebaseIfNeeded(){const limit=4;if(Math.max(Math.abs(state.panX),Math.abs(state.panY))>limit){const ox=Math.trunc(state.panX),oy=Math.trunc(state.panY);state.origin[0]+=ox;state.origin[1]+=oy;state.panX-=ox;state.targetPanX-=ox;state.panY-=oy;state.targetPanY-=oy;state.originRebaseCount++;}}
function zoomBy(f){const before=state.targetDistance;state.targetDistance=clamp(before*f,1.2,55);if(state.targetDistance>18)emitEvent('FAR-FIELD LOD ACTIVE');else if(state.targetDistance<2)state.portalArmed=true;}
function reset(){state.depth=0;state.family=0;state.seed=1.234;state.yaw=.28;state.pitch=.18;state.distance=8.2;state.targetDistance=8.2;state.panX=state.panY=state.targetPanX=state.targetPanY=0;state.origin=[0,0,0];state.originRebaseCount=0;state.transition=0;state.portalArmed=false;state.selectedId=null;state.history=[];updateHUD();closeInspector();emitEvent('SURFACE REINITIALIZED');saveDiscovery('World reset',state.worldId);}
function home(){reset();state.yaw=0;state.pitch=.16;updateHUD();emitEvent('HOME SCALE / EARTH + SOLAR SYSTEM');}
function queueDive(){if(state.transition>0)return;if(!state.portalArmed && state.targetDistance>2.0){zoomBy(.42);emitEvent('APPROACHING NEXT WORLD');return;}commitDepth();}
function commitDepth(custom){if(state.transition>0)return;const old={depth:state.depth,family:state.family,seed:state.seed};state.history.push(old);const n=custom||nextWorld();state.depth=n.depth;state.family=n.family;state.seed=n.seed;state.panX=state.panY=state.targetPanX=state.targetPanY=0;state.targetDistance=8.2;state.distance=state.targetDistance;state.portalArmed=false;state.transition=reducedMotion?.15:1;state.selectedId=null;updateHUD();saveDiscovery('New world: '+currentWorld().family,state.worldId);const events=['SIGNAL BLOOM','ORBIT SHIFT','ECLIPSE WINDOW','FIELD ECHO','DEEP RESONANCE','ANOMALY EVENT'];emitEvent(events[Math.floor(h32(state.seed)*events.length)]+' / '+currentWorld().family);}
function back(){const p=state.history.pop();if(!p)return;state.depth=p.depth;state.family=p.family;state.seed=p.seed;state.targetDistance=8.2;state.distance=8.2;state.portalArmed=false;state.transition=reducedMotion?.1:.55;state.selectedId=null;updateHUD();emitEvent('RETURNED TO PREVIOUS SCALE');}
function surprise(){const targets=[1,2,3,4,5,7,8,9,10,11,12,17,24,36,52,81];const depth=targets[Math.floor(Math.random()*targets.length)];const seed=Math.floor(Math.random()*900000)/100+depth*.417;const family=familyFor(depth,seed);state.history.push({depth:state.depth,family:state.family,seed:state.seed});state.depth=depth;state.seed=seed;state.family=family;state.targetDistance=8.2;state.distance=8.2;state.panX=(hash(seed,4)-.5)*.55;state.panY=(hash(seed,9)-.5)*.4;state.targetPanX=state.panX;state.targetPanY=state.panY;state.portalArmed=false;state.transition=reducedMotion?.12:.7;updateHUD();saveDiscovery('Surprise destination',state.worldId);emitEvent('SURPRISE VECTOR / D'+String(depth).padStart(2,'0'));}
function getAllObjects(){return (window.NexusNovaInfiniteLabCatalog?.getObjects?.()||[]);}
function selectObject(obj){if(!obj)return;state.selectedId=obj.id;if(Number.isFinite(Number(obj.ra)))state.skyRA=Number(obj.ra);if(Number.isFinite(Number(obj.dec)))state.skyDec=Number(obj.dec);updateHUD();showInspector(obj);saveDiscovery('Catalog object: '+(obj.name||obj.id),obj.id);emitEvent((obj.sourceType||'CATALOG')+' SELECTED');}
function openInspector(obj){selectObject(obj);}
function showInspector(obj){const p=document.getElementById('inspector');if(!p)return;p.classList.add('open');p.setAttribute('aria-hidden','false');setText('inspectorName',obj.name||'NOT REPORTED');setText('inspectorClass',obj.type||'NOT REPORTED');setText('inspectorSourceType',obj.sourceType||'REAL CATALOG');setText('inspectorSource',obj.source||'NOT REPORTED');setText('inspectorRelease',obj.release||'NOT REPORTED');const vals={id:obj.id,ra:format(obj.ra),dec:format(obj.dec),distance:formatDistance(obj.distanceLy),distanceUncertainty:formatDistance(obj.distanceUncertaintyLy),redshift:format(obj.redshift),type:obj.type,mag:obj.mag,temp:obj.temperatureK,mass:obj.mass,radius:obj.radius,pm:obj.pmRa!=null||obj.pmDec!=null?[format(obj.pmRa),format(obj.pmDec)].join(' / '):null,rv:obj.rv,spectral:obj.spectral,planet:(obj.planet||obj.host)?[obj.planet,obj.host].filter(Boolean).join(' / '):null,reference:obj.reference,orbitalPeriod:obj.orbitalPeriodDays!=null?obj.orbitalPeriodDays+' days':null,semiMajorAxis:obj.semiMajorAxisAu!=null?obj.semiMajorAxisAu+' AU':null,eccentricity:obj.eccentricity,habitableZone:obj.habitableZoneNote};for(const[k,v]of Object.entries(vals))setText('f-'+({distanceUncertainty:'distance-uncertainty',orbitalPeriod:'orbital-period',semiMajorAxis:'semi-major-axis',habitableZone:'habitable-zone'}[k]||k),valueOrNR(v));setText('p-source',obj.source||'NOT REPORTED');setText('p-release',obj.release||'NOT REPORTED');setText('p-time',obj.queriedAt||'NOT REPORTED');const a=document.getElementById('p-url');if(a){a.href=obj.sourceUrl||'#';a.setAttribute('aria-disabled',obj.sourceUrl?'false':'true');}window.NexusNovaObject3D?.show?.(obj);}
function closeInspector(){const p=document.getElementById('inspector');if(!p)return;p.classList.remove('open');p.setAttribute('aria-hidden','true');window.NexusNovaObject3D?.hide?.();}
function format(v){return v==null||v===''||!Number.isFinite(Number(v))?'NOT REPORTED':String(v);}
function valueOrNR(v){return v==null||v===''?'NOT REPORTED':String(v);}
function formatDistance(v){return v==null||!Number.isFinite(Number(v))?'NOT REPORTED':(Number(v)>=1e6?(Number(v)/1e6).toFixed(3)+' million ly':Number(v).toFixed(Number(v)<1?4:2)+' ly');}
function parseCoordinates(q){const m=q.trim().replace(/,/g,' ').match(/^\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*$/);if(!m)return null;const a=Number(m[1]),d=Number(m[2]);if(a<0||a>360||d<-90||d>90)return null;return{raDeg:a,dec:d};}
async function search(){const q=(document.getElementById('searchInput')?.value||'').trim().toLowerCase();if(!q){emitEvent('ENTER AN OBJECT, ID OR COORDINATES');return;}const filter=document.getElementById('sourceFilter')?.value||'all';const objs=getAllObjects();const hit=objs.find(o=>(filter==='all'||String(o.sourceKey||'').includes(filter))&&[o.name,o.id,o.sourceId,o.planet,o.host,o.source].filter(Boolean).some(x=>String(x).toLowerCase().includes(q)));if(hit){state.skyRA=Number(hit.ra)||state.skyRA;state.skyDec=Number(hit.dec)||state.skyDec;window.NexusNovaInfiniteLabCatalog?.focusObject?.(hit.id);selectObject(hit);return;}const coord=parseCoordinates(q);if(coord){state.skyRA=coord.raDeg/15;state.skyDec=coord.dec;state.panX=state.panY=0;state.targetPanX=state.targetPanY=0;await window.NexusNovaInfiniteLabCatalog?.loadVisibleRegion?.();emitEvent('COORDINATE REGION REQUESTED');return;}emitEvent('NOT LOADED IN CURRENT SOURCE LAYER');}
let physicsClock=performance.now();
function updatePhysics(){const now=performance.now();const dt=clamp((now-physicsClock)/1000,0,0.05)||1/60;physicsClock=now;state.distance+=(state.targetDistance-state.distance)*clamp(dt*7.2,0,1);state.panX+=(state.targetPanX-state.panX)*clamp(dt*7.2,0,1);state.panY+=(state.targetPanY-state.panY)*clamp(dt*7.2,0,1);if(state.transition>0)state.transition=Math.max(0,state.transition-dt*(reducedMotion?3.6:2.25));if(state.distance<1.38 && state.portalArmed)queueDive();rebaseIfNeeded();}
function pointerDown(e){pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});canvas.setPointerCapture?.(e.pointerId);down={x:e.clientX,y:e.clientY};dragging=true;if(pointers.size===2){const a=[...pointers.values()];pinch={d:Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y),z:state.targetDistance};dragging=false;}}
function pointerMove(e){if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2&&pinch){const a=[...pointers.values()];const d=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);state.targetDistance=clamp(pinch.z*Math.max(.2,d/Math.max(1,pinch.d)),1.2,55);if(state.targetDistance<2)state.portalArmed=true;return;}if(pointers.size===1&&down){const p=pointers.get(e.pointerId);const dx=p.x-(pointerMove.lastX??p.x),dy=p.y-(pointerMove.lastY??p.y);state.yaw-=dx*.004;state.pitch=clamp(state.pitch-dy*.003,-1.35,1.35);state.targetPanX-=dx/(Math.max(1,innerWidth)*.75)*state.distance*.045;state.targetPanY+=dy/(Math.max(1,innerHeight)*.75)*state.distance*.045;pointerMove.lastX=p.x;pointerMove.lastY=p.y;}}
function pointerUp(e){const p={x:e.clientX,y:e.clientY};const now=performance.now();const moved=down?Math.hypot(p.x-down.x,p.y-down.y):999;pointers.delete(e.pointerId);if(!pointers.size){dragging=false;pointerMove.lastX=null;pointerMove.lastY=null;}const cx=innerWidth*.5,cy=innerHeight*.52,gate=Math.min(innerWidth,innerHeight)*.22;if(now-(lastTap?.t||0)<360&&Math.hypot(p.x-(lastTap?.x||9999),p.y-(lastTap?.y||9999))<30){if(Math.hypot(p.x-cx,p.y-cy)<=gate)commitDepth();else zoomBy(.65);lastTap=null;}else if(moved<13){window.NexusNovaInfiniteLabRenderer?.handleTap?.(p.x,p.y);}else lastTap={x:p.x,y:p.y,t:now};}
function keydown(e){if(e.key==='r'||e.key==='R'){e.preventDefault();reset();}else if(e.key==='s'||e.key==='S'){e.preventDefault();surprise();}else if(e.key==='Enter'){e.preventDefault();queueDive();}else if(e.key==='Escape'){e.preventDefault();closeInspector();}else if(e.key==='+'||e.key==='='){e.preventDefault();zoomBy(.72);}else if(e.key==='-'||e.key==='_'){e.preventDefault();zoomBy(1.38);}else if(e.key==='ArrowLeft'){state.yaw-=.08;}else if(e.key==='ArrowRight'){state.yaw+=.08;}else if(e.key==='ArrowUp'){state.pitch=clamp(state.pitch+.06,-1.35,1.35);}else if(e.key==='ArrowDown'){state.pitch=clamp(state.pitch-.06,-1.35,1.35);}}
const canvas=document.getElementById('universe');
if(canvas){
  canvas.addEventListener('pointerdown',pointerDown,{passive:true});canvas.addEventListener('pointermove',pointerMove,{passive:true});canvas.addEventListener('pointerup',pointerUp,{passive:true});canvas.addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);pinch=null;dragging=false;pointerMove.lastX=null;pointerMove.lastY=null;},{passive:true});
  canvas.addEventListener('wheel',e=>{e.preventDefault();zoomBy(Math.exp(-e.deltaY*.0018));},{passive:false});
  canvas.addEventListener('dblclick',e=>{e.preventDefault();const cx=innerWidth*.5,cy=innerHeight*.52,gate=Math.min(innerWidth,innerHeight)*.22;if(Math.hypot(e.clientX-cx,e.clientY-cy)<=gate)commitDepth();else zoomBy(.65);});
}
document.getElementById('resetBtn')?.addEventListener('click',reset);
document.getElementById('homeBtn')?.addEventListener('click',home);
document.getElementById('surpriseBtn')?.addEventListener('click',surprise);
document.getElementById('breadcrumbBack')?.addEventListener('click',back);
document.getElementById('inspectorClose')?.addEventListener('click',closeInspector);
document.getElementById('searchBtn')?.addEventListener('click',()=>search().catch(()=>emitEvent('SEARCH FAILED SAFELY')));
document.getElementById('searchInput')?.addEventListener('keydown',e=>{if(e.key==='Enter')search().catch(()=>emitEvent('SEARCH FAILED SAFELY'));});
document.getElementById('loadRegionBtn')?.addEventListener('click',()=>window.NexusNovaInfiniteLabCatalog?.loadVisibleRegion?.().catch(()=>{}));
addEventListener('keydown',keydown);
addEventListener('resize',()=>window.NexusNovaInfiniteLabRenderer?.resize?.(),{passive:true});

function tick(){updatePhysics();updateHUD();window.NexusNovaInfiniteLabRenderer?.setState?.(state);requestAnimationFrame(tick);}
window.NexusNovaInfiniteLab={
  getState:()=>({...state,world:{...currentWorld()},history:state.history.map(x=>({...x})),quality:state.quality}),
  emitEvent,
  reset,home,surprise,dive:queueDive,zoomBy,back,selectObject,openInspector,closeInspector,search,
  setQuality:q=>{state.quality=clamp(Number(q)||1,.45,1);},
  deterministicSignature:(seed,depth,family)=>worldSignature(depth,seed,family),
  getDebug:()=>{const rt=window.__nnRuntime||{},cd=window.NexusNovaInfiniteLabCatalog?.getDebug?.()||{};return{webgl2:rt.webgl2===true,primaryRenderer:rt.webgl2===true?'WebGL2':'UNAVAILABLE',boundedDpr:state.boundedDpr,lod:state.lodEnabled,culling:state.cullingEnabled,cache:{size:cd.cacheSize||0,max:state.cacheMax},staleProtection:state.staleProtection,requestsCancellable:cd.requestsCancellable===true,originRebaseCount:state.originRebaseCount,queriesInFlight:cd.queriesInFlight||0,sourceAdapters:cd.sources||[],worldDepth:state.depth,worldId:state.worldId};},
  __testResetStorage:()=>{localStorage.removeItem('nexusnova.infiniteLab.discoveries');},
  __testFillStorage:n=>{const a=[];for(let i=0;i<n;i++)a.push({id:'test-'+i,timestamp:new Date().toISOString()});localStorage.setItem('nexusnova.infiniteLab.discoveries',JSON.stringify(a.slice(-100)));return JSON.parse(localStorage.getItem('nexusnova.infiniteLab.discoveries')).length;}
};
updateHUD();
emitEvent('INFINITE LAB ONLINE');
tick();
window.setInterval(()=>{window.NexusNovaInfiniteLabRenderer?.setTransition?.(state.transition);},100);
})();