(() => {
'use strict';

const canvas=document.getElementById('universe');
if(!canvas)return;
const DPR_MAX=2,MAX_TILES=12,TAU=Math.PI*2,WCA=window.NexusNovaInfiniteLab;
let gl=null;
try{gl=canvas.getContext('webgl2',{alpha:false,antialias:true,powerPreference:'high-performance'});}catch(_){gl=null;}

function status(t){const e=document.getElementById('catalogStatus');if(e)e.textContent=t;}
function row(key,s){
 const r=document.querySelector('.source-row[data-source="'+key+'"]');if(!r)return;
 r.classList.remove('loading','error');if(s==='loading')r.classList.add('loading');if(s==='error')r.classList.add('error');
 const e=r.querySelector('.source-state');if(e)e.textContent=s.toUpperCase();
}
function noWebGL(message){
 const box=document.createElement('section');box.className='no-webgl';
 box.innerHTML='<div class="box"><div class="micro">RENDERER STATUS</div><h1>WebGL2 is unavailable on this device.</h1><p>'+message+'</p></div>';
 document.body.appendChild(box);status('WEBGL2 UNAVAILABLE · 3D SCENE STOPPED SAFELY');
}
if(!gl){noWebGL('Infinite Lab never substitutes a 2D canvas for the primary 3D renderer. Source-backed records and provenance remain protected, but interactive 3D is unavailable in this browser.');return;}

const vertexSource=['#version 300 es','in vec3 aPosition;','in vec4 aColor;','in float aSize;','uniform mat4 uMvp;','uniform float uPointScale;','uniform float uDpr;','out vec4 vColor;','void main(){','vec4 p=uMvp*vec4(aPosition,1.0);','gl_Position=p;','float depth=max(0.25,-p.z);','gl_PointSize=clamp(aSize*uPointScale*uDpr/depth,1.0,32.0);','vColor=aColor;','}'].join('\n');
const fragmentSource=['#version 300 es','precision highp float;','in vec4 vColor;','out vec4 outColor;','void main(){','vec2 p=gl_PointCoord*2.0-1.0;','float r=dot(p,p);','if(r>1.0)discard;','float soft=1.0-smoothstep(.06,1.0,r);','outColor=vec4(vColor.rgb,vColor.a*soft);','}'].join('\n');
function shader(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s)||'Shader compile failed');return s;}
function program(v,f){const p=gl.createProgram();gl.attachShader(p,shader(gl.VERTEX_SHADER,v));gl.attachShader(p,shader(gl.FRAGMENT_SHADER,f));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p)||'Program link failed');return p;}
let prog;
try{prog=program(vertexSource,fragmentSource);}catch(err){console.error(err);noWebGL('The WebGL2 shader program could not initialize. The scene stopped safely rather than silently falling back to 2D rendering.');return;}
const loc={p:gl.getAttribLocation(prog,'aPosition'),c:gl.getAttribLocation(prog,'aColor'),s:gl.getAttribLocation(prog,'aSize'),m:gl.getUniformLocation(prog,'uMvp'),ps:gl.getUniformLocation(prog,'uPointScale'),d:gl.getUniformLocation(prog,'uDpr')};

let W=1,H=1,dpr=1;
function resize(){W=Math.max(1,innerWidth);H=Math.max(1,innerHeight);dpr=Math.min(DPR_MAX,Math.max(1,devicePixelRatio||1));canvas.width=Math.floor(W*dpr);canvas.height=Math.floor(H*dpr);canvas.style.width=W+'px';canvas.style.height=H+'px';gl.viewport(0,0,canvas.width,canvas.height);}
addEventListener('resize',resize,{passive:true});resize();

function sub(a,b){return[a[0]-b[0],a[1]-b[1],a[2]-b[2]]}
function cross(a,b){return[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]}
function norm(a){const l=Math.hypot(a[0],a[1],a[2])||1;return[a[0]/l,a[1]/l,a[2]/l]}
function lookAt(eye,target,up){const z=norm(sub(eye,target)),x=norm(cross(up,z)),y=cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-(x[0]*eye[0]+x[1]*eye[1]+x[2]*eye[2]),-(y[0]*eye[0]+y[1]*eye[1]+y[2]*eye[2]),-(z[0]*eye[0]+z[1]*eye[1]+z[2]*eye[2]),1]);}
function perspective(fov,aspect,near,far){const f=1/Math.tan(fov/2),nf=1/(near-far),m=new Float32Array(16);m[0]=f/aspect;m[5]=f;m[10]=(far+near)*nf;m[11]=-1;m[14]=2*far*near*nf;return m;}
function mul(a,b){const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)o[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];return o;}
function mvp(s){
 const dist=Math.max(1.7,Math.min(62,Number(s.distance)||8.2)),cp=Math.cos(s.pitch||0),sp=Math.sin(s.pitch||0),cy=Math.cos(s.yaw||0),sy=Math.sin(s.yaw||0);
 const origin=s.origin||[0,0,0],tx=(Number(origin[0])||0)+(Number(s.panX)||0),ty=(Number(origin[1])||0)+(Number(s.panY)||0);
 const eye=[tx+sy*cp*dist,ty+sp*dist,cy*cp*dist];
 const view=lookAt(eye,[tx,ty,0],[0,1,0]);const proj=perspective(.78,W/Math.max(1,H),.03,90);return mul(proj,view);
}
function project(m,p){
 const x=p[0],y=p[1],z=p[2];
 const cx=m[0]*x+m[4]*y+m[8]*z+m[12],cy=m[1]*x+m[5]*y+m[9]*z+m[13],cz=m[2]*x+m[6]*y+m[10]*z+m[14],cw=m[3]*x+m[7]*y+m[11]*z+m[15];
 if(cw<=.001)return null;const nx=cx/cw,ny=cy/cw,nz=cz/cw;if(nx<-1.12||nx>1.12||ny<-1.12||ny>1.12||nz<-1.03||nz>1.03)return null;return{x:(nx+1)*.5*W,y:(1-ny)*.5*H,z:nz};
}
function hash(s){let h=2166136261>>>0;const x=String(s);for(let i=0;i<x.length;i++){h^=x.charCodeAt(i);h=Math.imul(h,16777619)}return(h>>>0)/4294967296;}
function rand(seed,i){return hash(seed+'|'+i);}
function sky(ra,dec){const a=Number(ra)*15*Math.PI/180,b=Number(dec)*Math.PI/180;return[Math.cos(b)*Math.cos(a),Math.sin(b),Math.cos(b)*Math.sin(a)];}
function astroPos(o){
 const v=sky(o.ra,o.dec),ly=Number(o.distanceLy),z=Number(o.redshift);
 let r=.7;
 if(Number.isFinite(ly)&&Math.abs(ly)>0)r+=Math.log10(Math.abs(ly)+1)*.92;
 else if(Number.isFinite(z)){o.visualDepthDerived=true;r+=Math.log10(1+Math.max(0,z)*1200)*.65;}
 return[v[0]*r,v[1]*r,v[2]*r];
}
const anchors=[
 {id:'sun',name:'Sun',source:'Anchor / Solar System',sourceType:'REAL CATALOG',release:'Reference anchor',ra:0,dec:0,distanceLy:.00000508,type:'Star',mag:-26.74,spectral:'G2 V',reference:'IAU / NASA Solar System',sourceUrl:'https://solarsystem.nasa.gov/solar-system/sun/overview/'},
 {id:'sirius',name:'Sirius',source:'Reference anchor',sourceType:'REAL CATALOG',release:'Reference anchor',ra:6.7525,dec:-16.7161,distanceLy:8.6,type:'Star',mag:-1.46,spectral:'A1 V',reference:'Bright-star reference',sourceUrl:'https://simbad.cds.unistra.fr/simbad/sim-id?Ident=Sirius'},
 {id:'proxima',name:'Proxima Centauri',source:'Reference anchor',sourceType:'REAL CATALOG',release:'Reference anchor',ra:14.4953,dec:-62.6795,distanceLy:4.246,type:'Star',mag:11.13,spectral:'M5.5 Ve',reference:'Nearest-star reference',sourceUrl:'https://simbad.cds.unistra.fr/simbad/sim-id?Ident=Proxima%20Centauri'},
 {id:'vega',name:'Vega',source:'Reference anchor',sourceType:'REAL CATALOG',release:'Reference anchor',ra:18.6156,dec:38.7837,distanceLy:25,type:'Star',mag:.03,spectral:'A0 V',reference:'Bright-star reference',sourceUrl:'https://simbad.cds.unistra.fr/simbad/sim-id?Ident=Vega'},
 {id:'betelgeuse',name:'Betelgeuse',source:'Reference anchor',sourceType:'REAL CATALOG',release:'Reference anchor',ra:5.9195,dec:7.4071,distanceLy:548,type:'Star',mag:.42,spectral:'M1-2 Ia-Iab',reference:'Bright-star reference',sourceUrl:'https://simbad.cds.unistra.fr/simbad/sim-id?Ident=Betelgeuse'},
 {id:'m31',name:'M31 / Andromeda Galaxy',source:'Reference anchor',sourceType:'REAL CATALOG',release:'Reference anchor',ra:.712,dec:41.269,distanceLy:2500000,type:'Galaxy',reference:'Extragalactic reference',sourceUrl:'https://ned.ipac.caltech.edu/'},
 {id:'m87',name:'M87',source:'Reference anchor',sourceType:'REAL CATALOG',release:'Reference anchor',ra:12.5137,dec:12.3911,distanceLy:53500000,type:'Galaxy',reference:'Extragalactic reference',sourceUrl:'https://ned.ipac.caltech.edu/'},
 {id:'sgr-a',name:'Sagittarius A*',source:'Anchor / Galactic Center',sourceType:'REAL CATALOG',release:'Reference anchor',ra:17.7611,dec:-28.9998,distanceLy:26673,type:'Black hole / AGN',reference:'Galactic-center reference',sourceUrl:'https://ned.ipac.caltech.edu/'},
 {id:'kepler-22-b',name:'Kepler-22 b',source:'NASA Exoplanet Archive',sourceType:'REAL CATALOG',release:'Reference anchor',ra:19.1411,dec:47.7784,distanceLy:600,type:'Exoplanet',planet:'Kepler-22 b',host:'Kepler-22',reference:'NASA Exoplanet Archive',sourceUrl:'https://exoplanetarchive.ipac.caltech.edu/'}
];
anchors.forEach(o=>o.position=astroPos(o));
let objects=[...anchors];

function sourceColor(o){
 if(o.sourceType==='PUBLIC SURVEY')return[.458,.91,1,.86];
 if(o.sourceType==='DERIVED FROM SOURCE DATA')return[.68,.6,1,.8];
 return[.49,.89,.67,.92];
}
function makeBuffer(points,usage){
 if(!points.length)return null;
 const P=new Float32Array(points.length*3),C=new Float32Array(points.length*4),S=new Float32Array(points.length);
 points.forEach((x,i)=>{P.set(x.p,i*3);C.set(x.c,i*4);S[i]=x.s;});
 const b={p:gl.createBuffer(),c:gl.createBuffer(),s:gl.createBuffer(),count:points.length};
 gl.bindBuffer(gl.ARRAY_BUFFER,b.p);gl.bufferData(gl.ARRAY_BUFFER,P,usage||gl.DYNAMIC_DRAW);
 gl.bindBuffer(gl.ARRAY_BUFFER,b.c);gl.bufferData(gl.ARRAY_BUFFER,C,usage||gl.DYNAMIC_DRAW);
 gl.bindBuffer(gl.ARRAY_BUFFER,b.s);gl.bufferData(gl.ARRAY_BUFFER,S,usage||gl.DYNAMIC_DRAW);
 return b;
}
function del(b){if(!b)return;gl.deleteBuffer(b.p);gl.deleteBuffer(b.c);gl.deleteBuffer(b.s);}
function draw(b,scale){
 if(!b||!b.count)return;
 gl.bindBuffer(gl.ARRAY_BUFFER,b.p);gl.enableVertexAttribArray(loc.p);gl.vertexAttribPointer(loc.p,3,gl.FLOAT,false,0,0);
 gl.bindBuffer(gl.ARRAY_BUFFER,b.c);gl.enableVertexAttribArray(loc.c);gl.vertexAttribPointer(loc.c,4,gl.FLOAT,false,0,0);
 gl.bindBuffer(gl.ARRAY_BUFFER,b.s);gl.enableVertexAttribArray(loc.s);gl.vertexAttribPointer(loc.s,1,gl.FLOAT,false,0,0);
 gl.uniform1f(loc.ps,scale||15);gl.drawArrays(gl.POINTS,0,b.count);
}

let procKey='',procBuf=null,catBuf=null,projected=[];let gateKey='',gateBuf=null,transitionKey='',transitionBuf=null;let frameN=0,lastFrame=performance.now(),fpsEMA=60;
function procedural(s){
 const key=s.depth+'|'+s.family+'|'+Number(s.seed).toFixed(6)+'|'+Math.round(Number(s.quality)*100);
 if(key===procKey)return;procKey=key;if(procBuf)del(procBuf);
 const family=Number(s.family)||0,seed=Number(s.seed)||1,q=Math.max(.45,Math.min(1,Number(s.quality)||1));
 const base=family===1?15000:family===2?12000:family===11?9500:8000,count=Math.floor(base*q),out=[];
 for(let i=0;i<count;i++){
  const u=rand(seed,i),v=rand(seed,i+11),w=rand(seed,i+23),a=u*TAU;
  let x=0,y=0,z=0,sz=.45+rand(seed,i+31)*1.8,c=[.55,.8,1];
  if(family===0){const r=Math.pow(v,.53)*8.5;x=Math.cos(a)*r;z=Math.sin(a)*r;y=(w-.5)*2.4;sz*=.48;}
  else if(family===1){const arm=(i%7)*TAU/7;const rr=.4+v*8.3;x=Math.cos(arm+rr*.42)*rr;z=Math.sin(arm+rr*.42)*rr;y=(w-.5)*2.8;c=[.42,.88,1];sz*=.55;}
  else if(family===2){const rr=.15+Math.pow(v,.7)*5.4,arm=Math.floor(u*5)*TAU/5,aa=arm+rr*1.42;x=Math.cos(aa)*rr;z=Math.sin(aa)*rr*.58;y=(w-.5)*(1.1-rr*.12);c=[.75,.56,1];sz*=.7;}
  else if(family===3){const r=Math.pow(v,.64)*5.1;x=Math.cos(a)*r;z=Math.sin(a)*r*.78;y=(w-.5)*1.7;c=[.52,.84,1];sz*=.62;}
  else if(family===4){const r=.2+Math.pow(v,.82)*4.2;x=Math.cos(a)*r*.72;z=Math.sin(a)*r*.72;y=(w-.5)*.9;c=[.58,.9,1];sz*=.7;}
  else if(family===5){const R=3.2+v*1.2,ph=Math.acos(2*w-1);x=R*Math.sin(ph)*Math.cos(a);y=R*Math.cos(ph);z=R*Math.sin(ph)*Math.sin(a);c=[.42,.72,1];}
  else if(family===6){x=((i%9)-4)*.65+(w-.5)*.12;z=((Math.floor(i/9)%9)-4)*.65+(u-.5)*.12;y=rand(seed,i+51)*1.2;c=[1,.6,.84];sz=.35+rand(seed,i+61)*1.5;}
  else if(family===7){const ring=i%15,r=1+ring*.22+v*.25;a2=a+ring*.24;x=Math.cos(a2)*r;z=Math.sin(a2)*r;y=(w-.5)*.35;c=[.5,1,.84];}
  else if(family===8){const r=Math.pow(v,.56)*4.8;x=Math.cos(a)*r;z=Math.sin(a)*r;y=Math.sin(a*3+r)*.72+(w-.5);c=[.55,1,.76];}
  else if(family===9){const r=.3+Math.pow(v,.7)*4.5;a2=a+Math.sin(r+seed)*.65;x=Math.cos(a2)*r;z=Math.sin(a2)*r;y=(w-.5)*1.1;c=[.8,.66,1];}
  else if(family===10){const r=Math.pow(v,.5)*4.7;x=Math.cos(a)*r*.92;z=Math.sin(a)*r*.92;y=(w-.5)*2.3;c=[.45,1,.9];}
  else {const r=.45+v*4.3;a2=a+Math.sin(r*1.8+seed)*.8;x=Math.cos(a2)*r;z=Math.sin(a2)*r;y=(w-.5)*1.5;c=[1,.55,.35];}
  out.push({p:[x,y,z],c:[c[0],c[1],c[2],.14+.55*rand(seed,i+81)],s:sz});
 }
 procBuf=makeBuffer(out,gl.STATIC_DRAW);
}
function rebuildCatalog(){
 const s=WCA?.getState?.()||{quality:1,distance:8,depth:0};
 if(catBuf)del(catBuf);
 const far=Number(s.distance)>18||Number(s.depth)>8,step=Math.max(1,far?Math.ceil(6/Math.max(.45,s.quality)):Math.ceil(2/Math.max(.45,s.quality)));
 const matrix=mvp(s),list=[];projected=[];
 for(let i=0;i<objects.length;i+=step){
  const o=objects[i];if(!o.position)o.position=astroPos(o);
  const screen=project(matrix,o.position);if(!screen)continue;
  if(far&&step>1){
    const group=objects.slice(i,i+step).filter(x=>x?.position);
    const p=group.reduce((a,x)=>[a[0]+x.position[0],a[1]+x.position[1],a[2]+x.position[2]],[0,0,0]).map(v=>v/group.length);
    list.push({p,c:[.67,.62,1,.33],s:1.7+group.length*.05});projected.push(null);
  }else{list.push({p:o.position,c:sourceColor(o),s:o.sourceType==='PUBLIC SURVEY'?2.1:2.5});projected.push(o);}
 }
 catBuf=makeBuffer(list,gl.DYNAMIC_DRAW);
}

const cache=new Map();let epoch=0;
function arrayRows(d){if(Array.isArray(d))return d;if(Array.isArray(d.data))return d.data;if(Array.isArray(d.results))return d.results;return[];}
function fieldNames(d){if(Array.isArray(d.fields))return d.fields.map(x=>x&&x.name?x.name:x);if(Array.isArray(d.metadata))return d.metadata.map(x=>x&&x.name?x.name:'');return[];}
function normalizeRows(d){const f=fieldNames(d);return arrayRows(d).map(r=>{if(Array.isArray(r)){const o={};f.forEach((k,i)=>o[k]=r[i]);return o;}return r||{};});}
function n(v){const x=Number(v);return Number.isFinite(x)?x:null;}function st(v){return v==null||v===''?null:String(v);}
function finish(o){if(!o||o.ra==null||o.dec==null||!Number.isFinite(Number(o.ra))||!Number.isFinite(Number(o.dec)))return null;o.id=String(o.id||o.sourceId||o.name||'object');o.queriedAt=new Date().toISOString();o.position=astroPos(o);return o;}
function gaiaRow(r){
 const par=n(r.parallax),pe=n(r.parallax_error),dpc=par&&par>0?1000/par:null,u=par&&pe?1000*pe/(par*par):null;
 return finish({id:'gaia-'+r.source_id,sourceId:r.source_id,name:'Gaia DR3 '+r.source_id,source:'ESA Gaia',sourceKey:'gaia',sourceType:'REAL CATALOG',release:'DR3',ra:n(r.ra)/15,dec:n(r.dec),distanceLy:dpc==null?null:dpc*3.26156,distanceUncertaintyLy:u==null?null:u*3.26156,mag:n(r.phot_g_mean_mag),temperatureK:n(r.teff_gspphot),mass:n(r.mass_flame),radius:n(r.radius_flame),pmRa:n(r.pmra),pmDec:n(r.pmdec),rv:n(r.radial_velocity),spectral:n(r.bp_rp)==null?null:'BP-RP '+n(r.bp_rp),reference:'ESA Gaia Archive',sourceUrl:'https://gea.esac.esa.int/archive/'});
}
function exoRow(r){
 const d=n(r.sy_dist);
 return finish({id:'exo-'+(r.pl_name||'object'),name:st(r.pl_name)||'NOT REPORTED',source:'NASA Exoplanet Archive',sourceKey:'exo',sourceType:'REAL CATALOG',release:'PSCompPars',ra:n(r.ra)/15,dec:n(r.dec),distanceLy:d==null?null:d*3.26156,distanceUncertaintyLy:n(r.sy_disterr1)==null?null:Math.abs(n(r.sy_disterr1))*3.26156,radius:n(r.pl_rade),mass:n(r.pl_masse),orbitalPeriodDays:n(r.pl_orbper),semiMajorAxisAu:n(r.pl_orbsmax),eccentricity:n(r.pl_orbeccen),temperatureK:n(r.st_teff),planet:st(r.pl_name),host:st(r.hostname),reference:st(r.disc_refname)||st(r.discoverymethod)||'NASA Exoplanet Archive',sourceUrl:r.pl_name?'https://exoplanetarchive.ipac.caltech.edu/overview/'+encodeURIComponent(r.pl_name):'https://exoplanetarchive.ipac.caltech.edu/'});
}
function nedRow(r){const name=st(r.prefname)||'NED object';return finish({id:'ned-'+name,name,source:'NASA/IPAC NED',sourceKey:'ned',sourceType:'REAL CATALOG',release:'Current NED TAP',ra:n(r.ra)/15,dec:n(r.dec),redshift:n(r.z),type:st(r.pretype),reference:'NED',sourceUrl:'https://ned.ipac.caltech.edu/byname?objname='+encodeURIComponent(name)});}
function sdssRow(r){const ra=n(r.ra??r.RA),dec=n(r.dec??r.DEC),name=st(r.objid??r.ObjID??r.specObjID)||'SDSS object';return finish({id:'sdss-'+name,name:'SDSS '+name,source:'SDSS DR20',sourceKey:'sdss',sourceType:'PUBLIC SURVEY',release:'DR20',ra:ra==null?null:ra/15,dec,type:st(r.type),redshift:n(r.z),mag:n(r.modelMag_r??r.mag_r),spectral:st(r.class),reference:'SDSS DR20',sourceUrl:'https://skyserver.sdss.org/dr20/'});}
function desiRow(r){return finish({id:'desi-'+(r.TARGETID??r.targetid??'target'),name:'DESI '+(r.TARGETID??r.targetid??'target'),source:'DESI DR1 / NOIRLab Data Lab',sourceKey:'desi',sourceType:'PUBLIC SURVEY',release:'DR1',ra:n(r.RA??r.ra)/15,dec:n(r.DEC??r.dec),redshift:n(r.Z??r.z),type:st(r.SPECTYPE??r.spectype),reference:'DESI DR1',sourceUrl:'https://datalab.noirlab.edu/desi/'});}
let inflight=0;const activeControllers=new Set();
async function fetchJSON(url,timeout=14500){const ctl=new AbortController();activeControllers.add(ctl);inflight++;const timer=setTimeout(()=>ctl.abort(),timeout);try{const r=await fetch(url,{cache:'no-store',signal:ctl.signal,headers:{Accept:'application/json'}});if(!r.ok)throw Error('HTTP '+r.status);return await r.json();}finally{clearTimeout(timer);activeControllers.delete(ctl);inflight--;}}
function centerFor(s){const ra=((Number(s.skyRA)||0)*15+360)%360,dec=Math.max(-90,Math.min(90,Number(s.skyDec)||0));return{ra,dec};}
function tileFor(s){const c=centerFor(s);return Math.floor(c.ra/10)+'|'+Math.floor((c.dec+90)/10)+'|D'+Math.min(12,Number(s.depth)||0);}
const adapters={
 gaia:{label:'ESA Gaia DR3',q:(c)=> "SELECT TOP 1200 source_id,ra,dec,parallax,parallax_error,pmra,pmdec,radial_velocity,phot_g_mean_mag,bp_rp,teff_gspphot,mass_flame,radius_flame,ruwe,parallax_over_error FROM gaiadr3.gaia_source WHERE parallax>0 AND parallax_over_error>5 AND CONTAINS(POINT('ICRS',ra,dec),CIRCLE('ICRS',"+c.ra.toFixed(5)+","+c.dec.toFixed(5)+",5))=1",u:q=>'https://gea.esac.esa.int/tap-server/tap/sync?REQUEST=doQuery&LANG=ADQL&FORMAT=json&QUERY='+encodeURIComponent(q),parse:d=>normalizeRows(d).map(gaiaRow)},
 exo:{label:'NASA Exoplanet Archive',q:(c)=> "SELECT TOP 700 pl_name,hostname,ra,dec,sy_dist,sy_disterr1,sy_disterr2,pl_rade,pl_masse,pl_orbper,pl_orbsmax,pl_orbeccen,st_teff,disc_refname,discoverymethod FROM pscomppars WHERE ra IS NOT NULL AND dec IS NOT NULL AND sy_dist IS NOT NULL AND CONTAINS(POINT('ICRS',ra*15,dec),CIRCLE('ICRS',"+c.ra.toFixed(5)+","+c.dec.toFixed(5)+",5))=1",u:q=>'https://exoplanetarchive.ipac.caltech.edu/TAP/sync?query='+encodeURIComponent(q)+'&format=json',parse:d=>normalizeRows(d).map(exoRow)},
 ned:{label:'NASA/IPAC NED',q:(c)=>"SELECT TOP 250 prefname,ra,dec,z,pretype FROM objdir WHERE CONTAINS(POINT('J2000',ra,dec),CIRCLE('J2000',"+c.ra.toFixed(5)+","+c.dec.toFixed(5)+",2.5))=1",u:q=>'https://ned.ipac.caltech.edu/tap/sync?QUERY='+encodeURIComponent(q)+'&LANG=ADQL&REQUEST=doQuery&FORMAT=json&MAXREC=250',parse:d=>normalizeRows(d).map(nedRow)},
 sdss:{label:'SDSS DR20',q:(c)=>'https://skyserver.sdss.org/dr20/SkyServerWS/SearchTools/RadialSearch?ra='+c.ra+'&dec='+c.dec+'&radius=2.5&whichway=equatorial&limit=250&format=json&fp=none&whichquery=imaging',u:q=>q,parse:d=>arrayRows(d).map(sdssRow)},
 desi:{label:'DESI DR1',q:(c)=>'SELECT TOP 250 TARGETID,RA,DEC,Z,SPECTYPE,ZWARN FROM desi_dr1.zpix WHERE RA BETWEEN '+(c.ra-2.5).toFixed(5)+' AND '+(c.ra+2.5).toFixed(5)+' AND DEC BETWEEN '+(c.dec-2.5).toFixed(5)+' AND '+(c.dec+2.5).toFixed(5),u:q=>'https://datalab.noirlab.edu/tap/sync?REQUEST=doQuery&LANG=ADQL&FORMAT=json&QUERY='+encodeURIComponent(q),parse:d=>normalizeRows(d).map(desiRow)}
};

async function loadAdapter(key,c,reqEpoch){
 const a=adapters[key];if(!a)return[];
 row(key,'loading');
 try{const query=a.q(c),data=await fetchJSON(a.u(query));if(reqEpoch!==epoch)return[];const result=a.parse(data).filter(Boolean);row(key,'ready');return result;}
 catch(err){if(reqEpoch===epoch)row(key,'error');throw err;}
}
async function loadVisibleRegion(){
 const s=WCA?.getState?.()||{skyRA:0,skyDec:0,depth:0},key=tileFor(s);
 if(cache.has(key)){status('VISIBLE TILE CACHED · '+key);return cache.get(key).objects;}
 activeControllers.forEach(c=>{try{c.abort()}catch(_){}});activeControllers.clear();
 const c=centerFor(s),reqEpoch=++epoch;
 status('QUERYING VISIBLE TILE · PUBLIC SOURCES');
 const results=await Promise.allSettled(Object.keys(adapters).map(k=>loadAdapter(k,c,reqEpoch)));
 if(reqEpoch!==epoch)return[];
 const merged=results.flatMap(r=>r.status==='fulfilled'?r.value:[]);
 cache.set(key,{objects:merged,loadedAt:new Date().toISOString(),sources:Object.keys(adapters)});
 while(cache.size>MAX_TILES)cache.delete(cache.keys().next().value);
 objects=[...anchors,...[...cache.values()].flatMap(x=>x.objects)];
 rebuildCatalog();
 const good=results.filter(r=>r.status==='fulfilled'&&r.value.length>0).length;
 status(good?'VISIBLE TILE LOADED · '+merged.length+' returned records · provenance retained':'PUBLIC DATA SOURCE TEMPORARILY UNAVAILABLE');
 const cs=document.getElementById('cacheStatus');if(cs)cs.textContent='CACHE '+cache.size+' / '+MAX_TILES+' TILES';
 return merged;
}
async function bootSources(){
 const s=WCA?.getState?.()||{skyRA:0,skyDec:0,depth:0},c=centerFor(s),reqEpoch=++epoch;
 const rr=await Promise.allSettled(['gaia','exo'].map(k=>loadAdapter(k,c,reqEpoch))),merged=rr.flatMap(r=>r.status==='fulfilled'?r.value:[]);
 if(reqEpoch!==epoch)return;
 if(merged.length){const key=tileFor(s);cache.set(key,{objects:merged,loadedAt:new Date().toISOString(),sources:['gaia','exo']});objects=[...anchors,...merged];rebuildCatalog();status('PUBLIC CATALOG SAMPLE READY · Gaia DR3 + NASA Exoplanet Archive');}
 else status('PUBLIC DATA SOURCE TEMPORARILY UNAVAILABLE · ANCHORS + PROCEDURAL LAYER PRESERVED');
}
window.NexusNovaInfiniteLabCatalog={
 getObjects:()=>objects,
 focusObject:id=>objects.find(o=>o.id===id)||null,
 loadVisibleRegion,
 getDebug:()=>({sources:Object.values(adapters).map(a=>a.label),cacheSize:cache.size,cacheMax:MAX_TILES,tileLoading:true,staleProtection:true,requestsCancellable:true,queriesInFlight:inflight}),
 __setObjects:a=>{objects=Array.isArray(a)?a:objects;}
};

let lastRendered=null;
function render(){
 const s=WCA?.getState?.()||{depth:0,family:0,seed:1.234,yaw:0,pitch:0,distance:8.2,quality:1,transition:0,origin:[0,0,0]};
 lastRendered=s;
 procedural(s);if(!catBuf)rebuildCatalog();
 gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);gl.enable(gl.DEPTH_TEST);gl.depthMask(false);gl.clearDepth(1);gl.clearColor(.004,.007,.014,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
 gl.useProgram(prog);gl.uniform1f(loc.d,dpr);gl.uniformMatrix4fv(loc.m,false,mvp(s));
 draw(procBuf,15);draw(catBuf,17);gl.depthMask(true);
 const t=performance.now()/1000,h=hash(s.seed)*TAU,base=[.42,.82,1],g=[];
 for(let r=0;r<3;r++)for(let i=0;i<100;i++){const a=i/100*TAU+h+t*(.11+r*.03),rr=1.0+r*.43;g.push({p:[Math.cos(a)*rr,(hash(s.seed+'g'+i+r)-.5)*.08,Math.sin(a)*rr],c:[base[0],base[1],base[2],.22-.03*r],s:1.25});}
 const gkey=String(s.depth)+'|'+String(s.family)+'|'+Number(s.seed).toFixed(5);
 if(gkey!==gateKey){if(gateBuf)del(gateBuf);const gp=[];for(let rr=0;rr<3;rr++)for(let i=0;i<100;i++){const a=i/100*TAU+hash(s.seed+'ga'+rr),rad=1.0+rr*.43;gp.push({p:[Math.cos(a)*rad,(hash(s.seed+'gy'+i+rr)-.5)*.08,Math.sin(a)*rad],c:[.42,.82,1,.22-.03*rr],s:1.25});}gateBuf=makeBuffer(gp,gl.STATIC_DRAW);gateKey=gkey;}
 draw(gateBuf,18);
 if(s.transition>0){const tkey=String(s.depth)+'|'+Number(s.seed).toFixed(5);if(tkey!==transitionKey){if(transitionBuf)del(transitionBuf);const tp=[];for(let i=0;i<140;i++){const a=hash(s.seed+'t'+i)*TAU,r=2+hash(s.seed+'r'+i)*7;tp.push({p:[Math.cos(a)*r,(hash(s.seed+'y'+i)-.5)*2.2,Math.sin(a)*r],c:[.72,.88,1,.10],s:1.0});}transitionBuf=makeBuffer(tp,gl.STATIC_DRAW);transitionKey=tkey;}draw(transitionBuf,14);}
 const now=performance.now();const frameDt=now-lastFrame;lastFrame=now;if(frameDt>0)fpsEMA=fpsEMA*.9+(1000/frameDt)*.1;frameN++;if(frameN%60===0&&WCA?.setQuality){if(fpsEMA<43)WCA.setQuality(Math.max(.45,s.quality-.08));else if(fpsEMA>57)WCA.setQuality(Math.min(1,s.quality+.035));}
 window.NexusNovaInfiniteLabRenderer?.setRuntime?.({webgl2:true,dpr,culling:true,lod:true,catalogObjects:objects.length,cacheSize:cache.size,adaptiveQuality:true,fps:fpsEMA,originRebased:s.origin?.slice?.()||[0,0,0]});
 requestAnimationFrame(render);
}
function tap(x,y){
 if(!lastRendered)return;rebuildCatalog();const m=mvp(lastRendered);let best=null,bd=31;
 projected.forEach((o,i)=>{if(!o)return;const q=project(m,o.position);if(!q)return;const dd=Math.hypot(q.x-x,q.y-y);if(dd<bd){bd=dd;best=o;}});
 if(best){WCA?.selectObject?.(best);return;}
 const dd=Math.hypot(x-width*.5,y-height*.52);if(dd<Math.min(width,height)*.22)WCA?.dive?.();
}
window.NexusNovaInfiniteLabRenderer={
 resize,
 handleTap:tap,
 setState:()=>{},
 setRuntime:r=>{window.__nnRuntime=r;},
 setTransition:()=>{}
};
status('WEBGL2 ACTIVE · GPU POINT RENDERING · CAMERA-RELATIVE VIEW · PROGRESSIVE LOAD');
bootSources().catch(()=>status('PUBLIC DATA SOURCE TEMPORARILY UNAVAILABLE · ANCHORS + PROCEDURAL LAYER PRESERVED'));
requestAnimationFrame(render);

const objVS=['#version 300 es','in vec3 aPos;','uniform mat4 uM;','uniform float uT;','uniform vec3 uScale;','void main(){float c=cos(uT),s=sin(uT);vec3 p=vec3(c*aPos.x-s*aPos.z,aPos.y,s*aPos.x+c*aPos.z);p*=uScale;gl_Position=uM*vec4(p,1.0);}'].join('\n');
const objFS=['#version 300 es','precision highp float;','uniform vec3 uColor;','out vec4 outColor;','void main(){outColor=vec4(uColor,1.0);}'].join('\n');
let ogl=null,op=null,obuf=null,ibuf=null,ic=0,ov=null,oi=null,orot=.4,oz=3.2,ovis=false,oraf=false,oScale=[1,1,1],oColor=[.53,.8,1];
function ocompile(t,s){const sh=ogl.createShader(t);ogl.shaderSource(sh,s);ogl.compileShader(sh);return sh;}
function oinit(){const c=document.getElementById('object3d');if(!c)return;ov=c;if(ogl)return;try{ogl=c.getContext('webgl2',{alpha:false,antialias:true});}catch(_){ogl=null;}if(!ogl)return;op=ogl.createProgram();ogl.attachShader(op,ocompile(ogl.VERTEX_SHADER,objVS));ogl.attachShader(op,ocompile(ogl.FRAGMENT_SHADER,objFS));ogl.linkProgram(op);
 const seg=28,rings=18,V=[],I=[];for(let y=0;y<=rings;y++){const ph=y/rings*Math.PI;for(let x=0;x<=seg;x++){const th=x/seg*TAU;V.push(Math.sin(ph)*Math.cos(th),Math.cos(ph),Math.sin(ph)*Math.sin(th));}}for(let y=0;y<rings;y++)for(let x=0;x<seg;x++){const a=y*(seg+1)+x,b=a+seg+1;I.push(a,b,a+1,b,b+1,a+1);}obuf=ogl.createBuffer();ogl.bindBuffer(ogl.ARRAY_BUFFER,obuf);ogl.bufferData(ogl.ARRAY_BUFFER,new Float32Array(V),ogl.STATIC_DRAW);ibuf=ogl.createBuffer();ogl.bindBuffer(ogl.ELEMENT_ARRAY_BUFFER,ibuf);ogl.bufferData(ogl.ELEMENT_ARRAY_BUFFER,new Uint16Array(I),ogl.STATIC_DRAW);ic=I.length;
}
function omul(a,b){return mul(a,b)}
function orender(){if(!ogl||!ovis)return;const c=ov,w=Math.max(1,c.clientWidth),h=Math.max(1,c.clientHeight),dr=Math.min(2,devicePixelRatio||1);c.width=w*dr;c.height=h*dr;ogl.viewport(0,0,c.width,c.height);ogl.enable(ogl.DEPTH_TEST);ogl.clearColor(.012,.02,.04,1);ogl.clear(ogl.COLOR_BUFFER_BIT|ogl.DEPTH_BUFFER_BIT);ogl.useProgram(op);const lp=ogl.getAttribLocation(op,'aPos');ogl.bindBuffer(ogl.ARRAY_BUFFER,obuf);ogl.enableVertexAttribArray(lp);ogl.vertexAttribPointer(lp,3,ogl.FLOAT,false,0,0);ogl.bindBuffer(ogl.ELEMENT_ARRAY_BUFFER,ibuf);const M=perspective(.8,w/h,.1,20),V=lookAt([0,0,oz],[0,0,0],[0,1,0]);ogl.uniformMatrix4fv(ogl.getUniformLocation(op,'uM'),false,mul(M,V));ogl.uniform1f(ogl.getUniformLocation(op,'uT'),orot);ogl.uniform3fv(ogl.getUniformLocation(op,'uScale'),new Float32Array(oScale));ogl.uniform3fv(ogl.getUniformLocation(op,'uColor'),new Float32Array(oColor));ogl.drawElements(ogl.TRIANGLES,ic,ogl.UNSIGNED_SHORT,0);oraf=requestAnimationFrame(orender);}
function oshow(obj){oinit();if(!ogl)return;ovis=true;orot=.4;oz=3.2;const t=String(obj?.type||'').toLowerCase();if(t.includes('galaxy')){oScale=[1.45,.52,1]}else if(t.includes('black hole')||t.includes('agn')){oScale=[1.55,.42,1.55];oColor=[1,.32,.08]}else if(t.includes('nebula')){oScale=[1.4,.9,1.2];oColor=[.42,1,.82]}else if(t.includes('planet')||obj?.planet){oScale=[1,1,1];oColor=[.42,.7,1]}else{oScale=[1.08,1.08,1.08];oColor=[.72,.83,1]};if(!oraf)oraf=requestAnimationFrame(orender);}
function ohide(){ovis=false;}
window.NexusNovaObject3D={show:oshow,hide:ohide,rotate:x=>{orot+=x;},zoom:f=>{oz=Math.max(1.8,Math.min(7,oz*f));}};
document.getElementById('object3d')?.addEventListener('pointermove',e=>{if(e.buttons)window.NexusNovaObject3D?.rotate?.(e.movementX*.01);},{passive:true});
document.getElementById('object3d')?.addEventListener('wheel',e=>{e.preventDefault();window.NexusNovaObject3D?.zoom?.(Math.exp(e.deltaY*.001));},{passive:false});
setTimeout(()=>document.getElementById('loadingScreen')?.classList.add('hidden'),650);
})();