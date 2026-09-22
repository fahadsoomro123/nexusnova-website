(() => {
'use strict';

const canvas=document.getElementById('catalog3d');
if(!canvas) return;
const statusEl=document.getElementById('catalogStatus');
const modeEl=document.getElementById('catalogMode');

let gl=null;
try{ gl=canvas.getContext('webgl',{alpha:true,antialias:true,powerPreference:'high-performance'}); }catch(_){ gl=null; }
if(!gl){
  if(statusEl) statusEl.textContent='WebGL unavailable · procedural layer continues safely';
  if(modeEl) modeEl.textContent='PROCEDURAL FALLBACK';
  return;
}

const TAU=Math.PI*2;
const DPR_MAX=2;
const vertexSource='attribute vec3 aPos;attribute vec3 aColor;attribute float aSize;uniform mat4 uMvp;uniform float uPixelRatio;varying vec3 vColor;void main(){vec4 v=uMvp*vec4(aPos,1.0);gl_Position=v;gl_PointSize=clamp(aSize*uPixelRatio*380.0/max(2.0,-v.z),1.0,24.0);vColor=aColor;}';
const fragmentSource='precision mediump float;varying vec3 vColor;void main(){vec2 p=gl_PointCoord*2.0-1.0;float r=dot(p,p);if(r>1.0)discard;float a=pow(1.0-smoothstep(.02,1.0,r),1.2);gl_FragColor=vec4(vColor,a*.9);}';

function shader(type,source){
  const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);
  if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(s));
  return s;
}
function program(v,f){
  const p=gl.createProgram();gl.attachShader(p,shader(gl.VERTEX_SHADER,v));gl.attachShader(p,shader(gl.FRAGMENT_SHADER,f));gl.linkProgram(p);
  if(!gl.getProgramParameter(p,gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(p));
  return p;
}
let prog;
try{prog=program(vertexSource,fragmentSource);}catch(_){
  if(statusEl)statusEl.textContent='3D shader initialization failed · safe fallback';
  if(modeEl)modeEl.textContent='PROCEDURAL FALLBACK';
  return;
}
const posLoc=gl.getAttribLocation(prog,'aPos');
const colorLoc=gl.getAttribLocation(prog,'aColor');
const sizeLoc=gl.getAttribLocation(prog,'aSize');
const mvpLoc=gl.getUniformLocation(prog,'uMvp');
const pixelLoc=gl.getUniformLocation(prog,'uPixelRatio');

let W=1,H=1,pixelRatio=1;
function resize(){
  W=Math.max(1,innerWidth);H=Math.max(1,innerHeight);pixelRatio=Math.min(DPR_MAX,Math.max(1,devicePixelRatio||1));
  canvas.width=Math.floor(W*pixelRatio);canvas.height=Math.floor(H*pixelRatio);
  canvas.style.width=W+'px';canvas.style.height=H+'px';gl.viewport(0,0,canvas.width,canvas.height);
}
addEventListener('resize',resize,{passive:true});resize();

function v3sub(a,b){return[a[0]-b[0],a[1]-b[1],a[2]-b[2]]}
function v3cross(a,b){return[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]}
function v3norm(a){const l=Math.hypot(a[0],a[1],a[2])||1;return[a[0]/l,a[1]/l,a[2]/l]}
function lookAt(eye,target,up){
  const z=v3norm(v3sub(eye,target)),x=v3norm(v3cross(up,z)),y=v3cross(z,x);
  return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-(x[0]*eye[0]+x[1]*eye[1]+x[2]*eye[2]),-(y[0]*eye[0]+y[1]*eye[1]+y[2]*eye[2]),-(z[0]*eye[0]+z[1]*eye[1]+z[2]*eye[2]),1]);
}
function perspective(fov,aspect,near,far){
  const f=1/Math.tan(fov/2),nf=1/(near-far),m=new Float32Array(16);
  m[0]=f/aspect;m[5]=f;m[10]=(far+near)*nf;m[11]=-1;m[14]=2*far*near*nf;return m;
}
function mul(a,b){
  const m=new Float32Array(16);
  for(let c=0;c<4;c++)for(let r=0;r<4;r++)m[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];
  return m;
}
function hash(n){const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x)}
function rgb(hex){
  return[parseInt(hex.slice(1,3),16)/255,parseInt(hex.slice(3,5),16)/255,parseInt(hex.slice(5,7),16)/255];
}
function skyVector(raHours,decDeg){
  const a=raHours*15*Math.PI/180,b=decDeg*Math.PI/180;
  return[Math.cos(b)*Math.cos(a),Math.sin(b),Math.cos(b)*Math.sin(a)];
}
function logDistance(d,kind){
  if(!Number.isFinite(d)||d<=0)return 0.6;
  const scale=kind==='ly'?Math.log10(d+1)/10:Math.log10(d+1)/5.3;
  return scale;
}
function pointFromAstro(ra,dec,distancePc){
  const v=skyVector(Number(ra)||0,Number(dec)||0);
  const ly=Number(distancePc)*3.26156;
  const r=logDistance(ly,'ly')*5.8;
  return[v[0]*r,v[1]*r,v[2]*r];
}

const anchors=[
  {name:'Sun',ra:0,dec:0,pc:.00000156,color:'#fff2c7',size:8},
  {name:'Sirius',ra:6.7525,dec:-16.7161,pc:2.637,color:'#dcecff',size:5},
  {name:'Proxima Centauri',ra:14.4953,dec:-62.6795,pc:1.302,color:'#ff806c',size:4.5},
  {name:'Betelgeuse',ra:5.9195,dec:7.4071,pc:168.0,color:'#ff9874',size:5},
  {name:'Vega',ra:18.6156,dec:38.7837,pc:7.68,color:'#dcecff',size:5},
  {name:'Polaris',ra:2.5303,dec:89.2641,pc:132.9,color:'#fff1c8',size:5},
  {name:'M31',ra:.7119,dec:41.2692,pc:780000,color:'#d8b8ff',size:9},
  {name:'M87',ra:12.5137,dec:12.3911,pc:16400000,color:'#e2d3ff',size:9},
  {name:'Sagittarius A*',ra:17.7611,dec:-28.9998,pc:8178,color:'#ffd36f',size:8}
];

let realPoints=[];
let staticPoints=[];
let staticBuffer=null;
let realBuffer=null;
let realSize=0;
let catalogReady=false;
const cache=new Map();

function buildBuffer(points){
  const P=new Float32Array(points.length*3),C=new Float32Array(points.length*3),S=new Float32Array(points.length);
  points.forEach((p,i)=>{P.set(p.pos,i*3);C.set(p.color,i*3);S[i]=p.size||2;});
  const b={p:gl.createBuffer(),c:gl.createBuffer(),s:gl.createBuffer(),count:points.length};
  gl.bindBuffer(gl.ARRAY_BUFFER,b.p);gl.bufferData(gl.ARRAY_BUFFER,P,gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER,b.c);gl.bufferData(gl.ARRAY_BUFFER,C,gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER,b.s);gl.bufferData(gl.ARRAY_BUFFER,S,gl.STATIC_DRAW);
  return b;
}

function drawBuffer(b){
  if(!b||!b.count)return;
  gl.bindBuffer(gl.ARRAY_BUFFER,b.p);gl.enableVertexAttribArray(posLoc);gl.vertexAttribPointer(posLoc,3,gl.FLOAT,false,0,0);
  gl.bindBuffer(gl.ARRAY_BUFFER,b.c);gl.enableVertexAttribArray(colorLoc);gl.vertexAttribPointer(colorLoc,3,gl.FLOAT,false,0,0);
  gl.bindBuffer(gl.ARRAY_BUFFER,b.s);gl.enableVertexAttribArray(sizeLoc);gl.vertexAttribPointer(sizeLoc,1,gl.FLOAT,false,0,0);
  gl.drawArrays(gl.POINTS,0,b.count);
}

const starSeed=[];
for(let i=0;i<26000;i++){
  const a=hash(i)*TAU;
  const r=Math.pow(hash(i+4),.54)*5.5;
  const arm=Math.sin(a*3+r*1.8)*.24;
  const x=(Math.cos(a)*r)+Math.cos(a+1.1)*arm;
  const z=(Math.sin(a)*r)+Math.sin(a+1.1)*arm;
  const y=(hash(i+8)-.5)*(.35+2.2*(1-r/5.5));
  const hot=hash(i+13);
  const color=hot>.9?[1,.74,.56]:hot<.18?[.54,.82,1]:[.72,.82,1];
  starSeed.push({pos:[x,y,z],color,size:.55+hash(i+17)*1.45});
}
staticBuffer=buildBuffer(starSeed);
anchors.forEach(a=>staticPoints.push({name:a.name,pos:pointFromAstro(a.ra,a.dec,a.pc),color:rgb(a.color),size:a.size}));
const anchorBuffer=buildBuffer(staticPoints);

function csvOrJsonData(data){
  if(Array.isArray(data)) return data;
  if(Array.isArray(data.data)) return data.data.map(row=>Array.isArray(row)?row:row);
  return [];
}
function fieldsOf(data){
  if(Array.isArray(data.fields)) return data.fields.map(x=>x.name||x);
  if(Array.isArray(data.metadata)) return data.metadata.map(x=>x.name||x.column||'');
  return [];
}
function rowToObj(data,row){
  if(!Array.isArray(row)) return row;
  const fields=fieldsOf(data);const o={};fields.forEach((k,i)=>o[k]=row[i]);return o;
}
async function fetchJSON(url,timeoutMs=12000){
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{const r=await fetch(url,{cache:'no-store',signal:controller.signal,headers:{Accept:'application/json'}});if(!r.ok)throw Error('HTTP '+r.status);return await r.json();}
  finally{clearTimeout(timer);}
}
function addReal(obj,kind){
  const ra=Number(obj.ra),dec=Number(obj.dec);
  const d=Number(obj.parallax)>0 ? 1000/Number(obj.parallax) : Number(obj.sy_dist);
  if(!Number.isFinite(ra)||!Number.isFinite(dec)||!Number.isFinite(d)||d<=0)return;
  const pos=pointFromAstro(ra,dec,d);
  let color='#8bb8ff',size=1.9;
  if(kind==='exo'){color='#ff8fd9';size=2.4;}
  realPoints.push({name:obj.source_id||obj.hostname||obj.pl_name||'catalog object',source:kind,pos,color:rgb(color),size});
}
async function loadGaia(){
  const q='SELECT TOP 1800 source_id,ra,dec,parallax,phot_g_mean_mag FROM gaiadr3.gaia_source WHERE parallax>0 AND parallax_over_error>5 AND random_index<80000';
  const url='https://gea.esac.esa.int/tap-server/tap/sync?REQUEST=doQuery&LANG=ADQL&FORMAT=json&QUERY='+encodeURIComponent(q);
  const data=await fetchJSON(url);const rows=csvOrJsonData(data);rows.map(r=>rowToObj(data,r)).forEach(o=>addReal(o,'Gaia DR3'));
  return rows.length;
}
async function loadExoplanets(){
  const q='SELECT TOP 700 hostname,pl_name,ra,dec,sy_dist FROM pscomppars WHERE ra IS NOT NULL AND dec IS NOT NULL AND sy_dist IS NOT NULL';
  const url='https://exoplanetarchive.ipac.caltech.edu/TAP/sync?query='+encodeURIComponent(q)+'&format=json';
  const data=await fetchJSON(url);const rows=csvOrJsonData(data);rows.map(r=>rowToObj(data,r)).forEach(o=>addReal(o,'NASA Exoplanet Archive'));
  return rows.length;
}
async function loadCatalogs(){
  const results=await Promise.allSettled([loadGaia(),loadExoplanets()]);
  const ok=results.filter(x=>x.status==='fulfilled').map(x=>x.value);
  realSize=realPoints.length;
  if(realBuffer) [realBuffer.p,realBuffer.c,realBuffer.s].forEach(gl.deleteBuffer.bind(gl));
  realBuffer=buildBuffer(realPoints);
  catalogReady=true;
  if(statusEl){
    statusEl.textContent=ok.length?'Public catalogs loaded · Gaia '+(ok[0]||0)+' · NASA Exoplanets '+(ok[1]||0)+' sample records':'Public catalog APIs unavailable · sourced anchor layer remains visible';
  }
}
loadCatalogs().catch(()=>{if(statusEl)statusEl.textContent='Public catalog APIs unavailable · sourced anchor layer remains visible';});

function projection(state,time){
  const depth=Math.min(12,state.depth||0);
  const scale=1+depth*.11;
  const baseDistance=12.5/scale;
  const yaw=time*.035+(state.angle||0)*.08;
  const pitch=.22+Math.sin(time*.08)*.015;
  const cp=Math.cos(pitch);
  const eye=[Math.sin(yaw)*cp*baseDistance,Math.sin(pitch)*baseDistance,Math.cos(yaw)*cp*baseDistance];
  const view=lookAt(eye,[0,0,0],[0,1,0]);
  const proj=perspective(.78,W/Math.max(1,H),.05,80);
  return mul(proj,view);
}
function render(ms){
  const t=ms*.001;
  const state=window.NexusNovaInfiniteLab?.getState?window.NexusNovaInfiniteLab.getState():{depth:0,angle:0};
  gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);
  gl.useProgram(prog);gl.uniform1f(pixelLoc,pixelRatio);gl.uniformMatrix4fv(mvpLoc,false,projection(state,t));
  drawBuffer(staticBuffer);drawBuffer(anchorBuffer);drawBuffer(realBuffer);
  requestAnimationFrame(render);
}
if(modeEl)modeEl.textContent='3D PUBLIC CATALOG + LOD';
requestAnimationFrame(render);

window.NexusNovaInfiniteLabCatalog={
  getStatus:()=>({ready:catalogReady,realPoints:realSize,anchors:anchors.length}),
  reload:loadCatalogs,
  sources:['ESA Gaia DR3 TAP','NASA Exoplanet Archive TAP']
};

})();