(() => {
'use strict';

const canvas=document.getElementById('universe');
if(!canvas)return;
const DPR_MAX=2,MAX_TILES=12,TAU=Math.PI*2,WCA=window.NexusNovaInfiniteLab;
let gl=null;
try{gl=canvas.getContext('webgl2',{alpha:false,antialias:true,powerPreference:'high-performance'});}catch(_){gl=null;}
function status(t){const e=document.getElementById('catalogStatus');if(e)e.textContent=t;}
function row(key,s){const r=document.querySelector('.source-row[data-source="'+key+'"]');if(!r)return;r.classList.remove('loading','error');if(s==='loading')r.classList.add('loading');if(s==='error')r.classList.add('error');const e=r.querySelector('.source-state');if(e)e.textContent=s.toUpperCase();}
function noWebGL(message){const box=document.createElement('section');box.className='no-webgl';box.innerHTML='<div class="box"><div class="micro">RENDERER STATUS</div><h1>WebGL2 is unavailable on this device.</h1><p>'+message+'</p></div>';document.body.appendChild(box);status('WEBGL2 UNAVAILABLE · 3D SCENE STOPPED SAFELY');}
if(!gl){noWebGL('Infinite Lab never substitutes a 2D canvas for the primary 3D renderer. Source-backed records and provenance remain protected, but interactive 3D is unavailable in this browser.');return;}

const pointVS=['#version 300 es','in vec3 aPosition;','in vec4 aColor;','in float aSize;','uniform mat4 uMvp;','uniform float uPointScale;','uniform float uDpr;','out vec4 vColor;','void main(){vec4 p=uMvp*vec4(aPosition,1.0);gl_Position=p;float d=max(.22,-p.z);gl_PointSize=clamp(aSize*uPointScale*uDpr/d,1.0,34.0);vColor=aColor;}'].join('\n');
const pointFS=['#version 300 es','precision highp float;','in vec4 vColor;','out vec4 outColor;','void main(){vec2 p=gl_PointCoord*2.0-1.0;float r=dot(p,p);if(r>1.0)discard;float g=1.0-smoothstep(.02,1.0,r);float c=1.0-smoothstep(.0,.28,r);outColor=vec4(vColor.rgb,(.18*g+.92*c)*vColor.a);}'].join('\n');
const meshVS=['#version 300 es','in vec3 aPosition;','in vec3 aNormal;','uniform mat4 uMvp;','uniform mat4 uModel;','out vec3 vNormal;','out vec3 vLocal;','void main(){vec4 p=uModel*vec4(aPosition,1.0);gl_Position=uMvp*p;vNormal=normalize(mat3(uModel)*aNormal);vLocal=aPosition;}'].join('\n');
const meshFS=['#version 300 es','precision highp float;','uniform vec3 uColor;','uniform float uOpacity;','uniform float uEmission;','in vec3 vNormal;','in vec3 vLocal;','out vec4 outColor;','void main(){vec3 n=normalize(vNormal);float l=.52+.48*max(0.,dot(n,normalize(vec3(.45,.78,.32))));float rim=pow(1.-max(0.,dot(n,vec3(0.,0.,1.))),2.0);float grain=.97+.03*sin((vLocal.x+vLocal.y*1.7+vLocal.z*.8)*20.);vec3 c=uColor*(l*grain)+uColor*(uEmission*(.5+.5*rim));outColor=vec4(c,uOpacity);}'].join('\n');
const lineVS=['#version 300 es','in vec3 aPosition;','uniform mat4 uMvp;','void main(){gl_Position=uMvp*vec4(aPosition,1.0);}'].join('\n');
const lineFS=['#version 300 es','precision highp float;','uniform vec4 uColor;','out vec4 outColor;','void main(){outColor=uColor;}'].join('\n');
function shader(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s)||'Shader compile failed');return s;}
function program(v,f){const p=gl.createProgram();gl.attachShader(p,shader(gl.VERTEX_SHADER,v));gl.attachShader(p,shader(gl.FRAGMENT_SHADER,f));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p)||'Program link failed');return p;}
let pointProg,meshProg,lineProg;try{pointProg=program(pointVS,pointFS);meshProg=program(meshVS,meshFS);lineProg=program(lineVS,lineFS);}catch(err){console.error(err);noWebGL('The WebGL2 scene programs could not initialize. The scene stopped safely rather than substituting a 2D canvas.');return;}
const ploc={p:gl.getAttribLocation(pointProg,'aPosition'),c:gl.getAttribLocation(pointProg,'aColor'),s:gl.getAttribLocation(pointProg,'aSize'),m:gl.getUniformLocation(pointProg,'uMvp'),ps:gl.getUniformLocation(pointProg,'uPointScale'),d:gl.getUniformLocation(pointProg,'uDpr')};
const mloc={p:gl.getAttribLocation(meshProg,'aPosition'),n:gl.getAttribLocation(meshProg,'aNormal'),m:gl.getUniformLocation(meshProg,'uMvp'),model:gl.getUniformLocation(meshProg,'uModel'),color:gl.getUniformLocation(meshProg,'uColor'),opacity:gl.getUniformLocation(meshProg,'uOpacity'),emission:gl.getUniformLocation(meshProg,'uEmission')};
const lloc={p:gl.getAttribLocation(lineProg,'aPosition'),m:gl.getUniformLocation(lineProg,'uMvp'),color:gl.getUniformLocation(lineProg,'uColor')};
let W=1,H=1,dpr=1;function resize(){W=Math.max(1,innerWidth);H=Math.max(1,innerHeight);dpr=Math.min(DPR_MAX,Math.max(1,devicePixelRatio||1));canvas.width=Math.floor(W*dpr);canvas.height=Math.floor(H*dpr);canvas.style.width=W+'px';canvas.style.height=H+'px';gl.viewport(0,0,canvas.width,canvas.height);}addEventListener('resize',resize,{passive:true});resize();
function sub(a,b){return[a[0]-b[0],a[1]-b[1],a[2]-b[2]]}function cross(a,b){return[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]}function norm(a){const l=Math.hypot(a[0],a[1],a[2])||1;return[a[0]/l,a[1]/l,a[2]/l]}
function lookAt(eye,target,up){const z=norm(sub(eye,target)),x=norm(cross(up,z)),y=cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-(x[0]*eye[0]+x[1]*eye[1]+x[2]*eye[2]),-(y[0]*eye[0]+y[1]*eye[1]+y[2]*eye[2]),-(z[0]*eye[0]+z[1]*eye[1]+z[2]*eye[2]),1]);}
function perspective(fov,aspect,near,far){const f=1/Math.tan(fov/2),nf=1/(near-far),m=new Float32Array(16);m[0]=f/aspect;m[5]=f;m[10]=(far+near)*nf;m[11]=-1;m[14]=2*far*near*nf;return m;}
function mul(a,b){const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)o[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];return o;}
function model(x,y,z,sx,sy,sz,rx=0,ry=0,rz=0){const cx=Math.cos(rx),sxr=Math.sin(rx),cy=Math.cos(ry),syr=Math.sin(ry),cz=Math.cos(rz),szr=Math.sin(rz),Rx=new Float32Array([1,0,0,0,0,cx,sxr,0,0,-sxr,cx,0,0,0,0,1]),Ry=new Float32Array([cy,0,-syr,0,0,1,0,0,syr,0,cy,0,0,0,0,1]),Rz=new Float32Array([cz,szr,0,0,-szr,cz,0,0,0,0,1,0,0,0,0,1]);let m=mul(mul(Rz,Ry),Rx);m[0]*=sx;m[1]*=sx;m[2]*=sx;m[4]*=sy;m[5]*=sy;m[6]*=sy;m[8]*=sz;m[9]*=sz;m[10]*=sz;m[12]=x;m[13]=y;m[14]=z;return m;}
function mvp(s){const dist=Math.max(1.35,Math.min(70,Number(s.distance)||8.2)),cp=Math.cos(s.pitch||0),sp=Math.sin(s.pitch||0),cy=Math.cos(s.yaw||0),sy=Math.sin(s.yaw||0),o=s.origin||[0,0,0],tx=(Number(o[0])||0)+(Number(s.panX)||0),ty=(Number(o[1])||0)+(Number(s.panY)||0),eye=[tx+sy*cp*dist,ty+sp*dist,cy*cp*dist],view=lookAt(eye,[tx,ty,0],[0,1,0]),proj=perspective(.74,W/Math.max(1,H),.03,95);return mul(proj,view);}
function project(m,p){const x=p[0],y=p[1],z=p[2],cx=m[0]*x+m[4]*y+m[8]*z+m[12],cy=m[1]*x+m[5]*y+m[9]*z+m[13],cz=m[2]*x+m[6]*y+m[10]*z+m[14],cw=m[3]*x+m[7]*y+m[11]*z+m[15];if(cw<=.001)return null;const nx=cx/cw,ny=cy/cw,nz=cz/cw;if(nx<-1.12||nx>1.12||ny<-1.12||ny>1.12||nz<-1.03||nz>1.03)return null;return{x:(nx+1)*.5*W,y:(1-ny)*.5*H,z:nz};}
function hash(s){let h=2166136261>>>0;const x=String(s);for(let i=0;i<x.length;i++){h^=x.charCodeAt(i);h=Math.imul(h,16777619)}return(h>>>0)/4294967296;}function rand(seed,i){return hash(seed+'|'+i);}function sky(ra,dec){const a=Number(ra)*15*Math.PI/180,b=Number(dec)*Math.PI/180;return[Math.cos(b)*Math.cos(a),Math.sin(b),Math.cos(b)*Math.sin(a)];}
function astroPos(o){const v=sky(o.ra,o.dec),ly=Number(o.distanceLy),z=Number(o.redshift);let r=.62;if(Number.isFinite(ly)&&Math.abs(ly)>0)r+=Math.log10(Math.abs(ly)+1)*.92;else if(Number.isFinite(z)){o.visualDepthDerived=true;r+=Math.log10(1+Math.max(0,z)*1200)*.65;}return[v[0]*r,v[1]*r,v[2]*r];}
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
];anchors.forEach(o=>o.position=astroPos(o));let objects=[...anchors];
function makePointBuffer(points,usage){if(!points.length)return null;const P=new Float32Array(points.length*3),C=new Float32Array(points.length*4),S=new Float32Array(points.length);points.forEach((x,i)=>{P.set(x.p,i*3);C.set(x.c,i*4);S[i]=x.s;});const b={p:gl.createBuffer(),c:gl.createBuffer(),s:gl.createBuffer(),count:points.length};gl.bindBuffer(gl.ARRAY_BUFFER,b.p);gl.bufferData(gl.ARRAY_BUFFER,P,usage||gl.DYNAMIC_DRAW);gl.bindBuffer(gl.ARRAY_BUFFER,b.c);gl.bufferData(gl.ARRAY_BUFFER,C,usage||gl.DYNAMIC_DRAW);gl.bindBuffer(gl.ARRAY_BUFFER,b.s);gl.bufferData(gl.ARRAY_BUFFER,S,usage||gl.DYNAMIC_DRAW);return b;}
function makeMeshBuffer(v,n,usage){const b={v:gl.createBuffer(),n:gl.createBuffer(),count:v.length/3};gl.bindBuffer(gl.ARRAY_BUFFER,b.v);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(v),usage||gl.STATIC_DRAW);gl.bindBuffer(gl.ARRAY_BUFFER,b.n);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(n),usage||gl.STATIC_DRAW);return b;}
function delPoint(b){if(!b)return;gl.deleteBuffer(b.p);gl.deleteBuffer(b.c);gl.deleteBuffer(b.s);}function delMesh(b){if(!b)return;gl.deleteBuffer(b.v);gl.deleteBuffer(b.n);}
function drawPoints(b,mat,scale){if(!b||!b.count)return;gl.useProgram(pointProg);gl.bindBuffer(gl.ARRAY_BUFFER,b.p);gl.enableVertexAttribArray(ploc.p);gl.vertexAttribPointer(ploc.p,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ARRAY_BUFFER,b.c);gl.enableVertexAttribArray(ploc.c);gl.vertexAttribPointer(ploc.c,4,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ARRAY_BUFFER,b.s);gl.enableVertexAttribArray(ploc.s);gl.vertexAttribPointer(ploc.s,1,gl.FLOAT,false,0,0);gl.uniformMatrix4fv(ploc.m,false,mat);gl.uniform1f(ploc.ps,scale||15);gl.uniform1f(ploc.d,dpr);gl.drawArrays(gl.POINTS,0,b.count);}
function drawMesh(b,mat,mdl,color,opacity=1,emission=.7){if(!b||!b.count)return;gl.useProgram(meshProg);gl.bindBuffer(gl.ARRAY_BUFFER,b.v);gl.enableVertexAttribArray(mloc.p);gl.vertexAttribPointer(mloc.p,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ARRAY_BUFFER,b.n);gl.enableVertexAttribArray(mloc.n);gl.vertexAttribPointer(mloc.n,3,gl.FLOAT,false,0,0);gl.uniformMatrix4fv(mloc.m,false,mat);gl.uniformMatrix4fv(mloc.model,false,mdl);gl.uniform3fv(mloc.color,new Float32Array(color));gl.uniform1f(mloc.opacity,opacity);gl.uniform1f(mloc.emission,emission);gl.drawArrays(gl.TRIANGLES,0,b.count);}
function drawLineBuffer(buf,mat,color){if(!buf||!buf.count)return;gl.useProgram(lineProg);gl.bindBuffer(gl.ARRAY_BUFFER,buf.buffer);gl.enableVertexAttribArray(lloc.p);gl.vertexAttribPointer(lloc.p,3,gl.FLOAT,false,0,0);gl.uniformMatrix4fv(lloc.m,false,mat);gl.uniform4fv(lloc.color,new Float32Array(color));gl.drawArrays(gl.LINE_STRIP,0,buf.count);}
function sphereGeometry(seg=28,rings=18){const v=[],n=[];for(let y=0;y<rings;y++){const p0=y/rings*Math.PI,p1=(y+1)/rings*Math.PI;for(let x=0;x<seg;x++){const a0=x/seg*TAU,a1=(x+1)/seg*TAU,qs=[[p0,a0],[p1,a0],[p1,a1],[p0,a0],[p1,a1],[p0,a1]];qs.forEach(([p,a])=>{const s=Math.sin(p),c=Math.cos(p),ca=Math.cos(a),sa=Math.sin(a),nx=s*ca,ny=c,nz=s*sa;v.push(nx,ny,nz);n.push(nx,ny,nz);});}}return makeMeshBuffer(v,n);}
function discGeometry(inner=.3,outer=1,seg=100){const v=[],n=[];for(let i=0;i<seg;i++){const a0=i/seg*TAU,a1=(i+1)/seg*TAU,ps=[[inner,a0],[outer,a0],[outer,a1],[inner,a0],[outer,a1],[inner,a1]];ps.forEach(([r,a])=>{v.push(r*Math.cos(a),0,r*Math.sin(a));n.push(0,1,0);});}return makeMeshBuffer(v,n);}
function ribbon(points,widths){const v=[],n=[];for(let i=0;i<points.length-1;i++){const a=points[i],b=points[i+1],t=norm(sub(b,a));let side=norm(cross(t,[0,1,0]));if(Math.hypot(...side)<.2)side=norm(cross(t,[1,0,0]));const wa=widths[i]||.05,wb=widths[i+1]||wa,l0=[a[0]+side[0]*wa,a[1]+side[1]*wa,a[2]+side[2]*wa],r0=[a[0]-side[0]*wa,a[1]-side[1]*wa,a[2]-side[2]*wa],l1=[b[0]+side[0]*wb,b[1]+side[1]*wb,b[2]+side[2]*wb],r1=[b[0]-side[0]*wb,b[1]-side[1]*wb,b[2]-side[2]*wb];[l0,r0,l1,r0,r1,l1].forEach(p=>{v.push(p[0],p[1],p[2]);n.push(0,1,0);});}return makeMeshBuffer(v,n);}
const solarSphere=sphereGeometry(),solarOrbits=[.82,1.18,1.62,2.08,2.55,3.08,3.66].map(r=>{const a=[];for(let i=0;i<=160;i++){const t=i/160*TAU;a.push(r*Math.cos(t),0,r*Math.sin(t));}const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(a),gl.STATIC_DRAW);return{buffer:b,count:a.length/3};});
function makePointArray(seed,q,depth){const count=Math.floor((depth<2?2200:depth<8?4300:3600)*Math.max(.5,Math.min(1,q))),out=[];for(let i=0;i<count;i++){const u=rand(seed,i),v=rand(seed,i+7),w=rand(seed,i+19),a=u*TAU,p=Math.acos(2*v-1),r=.3+Math.pow(w,.55)*(depth<2?21:27),t=rand(seed,i+41);let c=[.78,.88,1,1];if(t<.18)c=[1,.58,.35,1];else if(t<.44)c=[1,.8,.52,1];else if(t<.77)c=[.7,.84,1,1];out.push({p:[r*Math.sin(p)*Math.cos(a),r*Math.cos(p),r*Math.sin(p)*Math.sin(a)],c,s:.4+rand(seed,i+43)*1.8});}return out;}
function makeGalaxy(seed,scale,tilt=0){const disk=discGeometry(.22,1,72),bulge=solarSphere,arms=[];for(let arm=0;arm<3;arm++){const pts=[],ws=[];for(let i=0;i<70;i++){const u=i/69,r=.3+u*2.0,a=arm*TAU/3+u*TAU*1.55+hash(seed+'a'+arm,i)*.08;pts.push([Math.cos(a)*r,(hash(seed+'y'+arm,i)-.5)*.06,Math.sin(a)*r]);ws.push(.035+.045*u);}arms.push(ribbon(pts,ws));}return{disk,bulge,arms,scale,tilt};}
let galaxyKey='',galaxyScene=null,starsKey='',starsBuf=null,catBuf=null,projected=[],webNetworkNodes=[];
function releaseGalaxy(){if(!galaxyScene)return;if(galaxyScene.disk)delMesh(galaxyScene.disk);if(galaxyScene.arms)galaxyScene.arms.forEach(delMesh);galaxyScene=null;}
function ensureGalaxy(seed){const gk=String(seed);if(galaxyKey===gk&&galaxyScene)return;releaseGalaxy();galaxyScene=makeGalaxy(seed,1,0);galaxyKey=gk;}
function sceneMode(s){const d=Number(s.depth)||0,f=Number(s.family)||0;if(d===0)return'solar';if(d===1)return'neighborhood';if(d===2)return'milkyway';if(d===3||d===4)return'galaxy-group';if(d===5)return'cosmic-web';if(d===6)return'deep-universe';if(f===7)return'data-world';if(f===8)return'nebula';if(f===9)return'star-system';if(f===10)return'planet';if(f===11)return'agn';if(f===12)return'anomaly';return'deep-universe';}
function getScene(depth,seed,q,family){const sceneDepth=Math.max(0,Number(depth)||0),key=sceneDepth+'|'+String(family||0)+'|'+Number(seed).toFixed(5)+'|'+Math.round(q*100);if(starsKey!==key){if(starsBuf)delPoint(starsBuf);starsBuf=makePointBuffer(makePointArray(seed,q,sceneDepth),gl.STATIC_DRAW);starsKey=key;}
 if(sceneDepth>=2&&sceneDepth<=7)ensureGalaxy(seed);return{mode:sceneMode({depth:sceneDepth,family:Number(family)||0}),key};}
function rebuildCatalog(){const s=WCA?.getState?.()||{quality:1,distance:8,depth:0};if(catBuf)delPoint(catBuf);const far=Number(s.distance)>18||Number(s.depth)>8,step=Math.max(1,far?Math.ceil(7/Math.max(.45,s.quality)):Math.ceil(2/Math.max(.45,s.quality)));const matrix=mvp(s),list=[];projected=[];for(let i=0;i<objects.length;i+=step){const o=objects[i];if(!o.position)o.position=astroPos(o);const p=project(matrix,o.position);if(!p)continue;if(far&&step>1){const group=objects.slice(i,i+step).filter(x=>x?.position);const c=group.reduce((a,x)=>[a[0]+x.position[0],a[1]+x.position[1],a[2]+x.position[2]],[0,0,0]).map(v=>v/group.length);list.push({p:c,c:[.5,.66,1,.32],s:1.8+group.length*.05});projected.push(null);}else{list.push({p:o.position,c:o.sourceType==='PUBLIC SURVEY'?[.46,.91,1,.95]:[.48,.92,.74,1],s:o.sourceType==='PUBLIC SURVEY'?2.2:2.9});projected.push(o);}}catBuf=makePointBuffer(list,gl.DYNAMIC_DRAW);}
const cache=new Map();
let epoch=0;
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
function desiRow(r){return finish({id:'desi-'+(r.TARGETID??r.targetid??'target'),name:'DESI '+(r.TARGETID??r.targetid??'target'),source:'DESI DR1 / NOIRLab Data Lab',sourceKey:'desi',sourceType:'PUBLIC SURVEY',release:'DR1',ra:n(r.MEAN_FIBER_RA??r.mean_fiber_ra??r.RA??r.ra)/15,dec:n(r.MEAN_FIBER_DEC??r.mean_fiber_dec??r.DEC??r.dec),redshift:n(r.Z??r.z),type:st(r.SPECTYPE??r.spectype),reference:'DESI DR1',sourceUrl:'https://datalab.noirlab.edu/desi/'});}
let inflight=0;const activeControllers=new Set();
const ASTRONOMY_PROXY='https://nexusnova-telegram-bot.fahadsoomro123.workers.dev/api/astronomy/query';
async function fetchAstronomy(source,query,timeout=20000){const ctl=new AbortController();activeControllers.add(ctl);inflight++;const timer=setTimeout(()=>ctl.abort(),timeout);try{const r=await fetch(ASTRONOMY_PROXY,{method:'POST',cache:'no-store',signal:ctl.signal,headers:{Accept:'application/json','Content-Type':'application/json'},body:JSON.stringify({source,query})});if(!r.ok)throw Error('HTTP '+r.status);const data=await r.json();if(data?.ok===false)throw Error(data.error||data.code||'Astronomy proxy failure');return data;}finally{clearTimeout(timer);activeControllers.delete(ctl);inflight--;}}
function centerFor(s){const ra=((Number(s.skyRA)||0)*15+360)%360,dec=Math.max(-90,Math.min(90,Number(s.skyDec)||0));return{ra,dec};}
function tileFor(s){const c=centerFor(s);return Math.floor(c.ra/10)+'|'+Math.floor((c.dec+90)/10)+'|D'+Math.min(12,Number(s.depth)||0);}
const adapters={
 gaia:{label:'ESA Gaia DR3',q:(c)=> "SELECT TOP 1200 source_id,ra,dec,parallax,parallax_error,pmra,pmdec,radial_velocity,phot_g_mean_mag,bp_rp,teff_gspphot,mass_flame,radius_flame,ruwe,parallax_over_error FROM gaiadr3.gaia_source WHERE parallax>0 AND parallax_over_error>5 AND CONTAINS(POINT('ICRS',ra,dec),CIRCLE('ICRS',"+c.ra.toFixed(5)+","+c.dec.toFixed(5)+",5))=1",u:q=>'https://gea.esac.esa.int/tap-server/tap/sync?REQUEST=doQuery&LANG=ADQL&FORMAT=json&QUERY='+encodeURIComponent(q),parse:d=>normalizeRows(d).map(gaiaRow)},
 exo:{label:'NASA Exoplanet Archive',q:(c)=> "SELECT TOP 700 pl_name,hostname,ra,dec,sy_dist,sy_disterr1,sy_disterr2,pl_rade,pl_masse,pl_orbper,pl_orbsmax,pl_orbeccen,st_teff,disc_refname,discoverymethod FROM pscomppars WHERE ra IS NOT NULL AND dec IS NOT NULL AND sy_dist IS NOT NULL AND CONTAINS(POINT('ICRS',ra*15,dec),CIRCLE('ICRS',"+c.ra.toFixed(5)+","+c.dec.toFixed(5)+",5))=1",u:q=>'https://exoplanetarchive.ipac.caltech.edu/TAP/sync?query='+encodeURIComponent(q)+'&format=json',parse:d=>normalizeRows(d).map(exoRow)},
 ned:{label:'NASA/IPAC NED',q:(c)=>"SELECT TOP 250 prefname,ra,dec,z,pretype FROM objdir WHERE CONTAINS(POINT('J2000',ra,dec),CIRCLE('J2000',"+c.ra.toFixed(5)+","+c.dec.toFixed(5)+",2.5))=1",u:q=>'https://ned.ipac.caltech.edu/tap/sync?QUERY='+encodeURIComponent(q)+'&LANG=ADQL&REQUEST=doQuery&FORMAT=json&MAXREC=250',parse:d=>normalizeRows(d).map(nedRow)},
 sdss:{label:'SDSS DR20',q:(c)=>'https://skyserver.sdss.org/dr20/SkyServerWS/SearchTools/RadialSearch?ra='+c.ra+'&dec='+c.dec+'&radius=2.5&whichway=equatorial&limit=250&format=json&fp=none&whichquery=imaging',u:q=>q,parse:d=>arrayRows(d).map(sdssRow)},
 desi:{label:'DESI DR1',q:(c)=>'SELECT TOP 250 targetid,mean_fiber_ra,mean_fiber_dec,z,spectype,zwarn FROM desi_dr1.zpix WHERE q3c_radial_query(mean_fiber_ra,mean_fiber_dec,'+c.ra.toFixed(5)+','+c.dec.toFixed(5)+',2.5)',u:q=>'https://datalab.noirlab.edu/tap/sync?REQUEST=doQuery&LANG=ADQL&FORMAT=json&QUERY='+encodeURIComponent(q),parse:d=>normalizeRows(d).map(desiRow)}
};

async function loadAdapter(key,c,reqEpoch){
 const a=adapters[key];if(!a)return[];
 row(key,'loading');
 try{const query=a.q(c),data=await fetchAstronomy(key,query);if(reqEpoch!==epoch)return[];const result=a.parse(data).filter(Boolean);row(key,'ready');return result;}
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

let lastRendered=null,lastScene='',webKey='',webRibbons=[],portalMesh=null;
function linePoints(arr){const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(arr),gl.STATIC_DRAW);return{buffer:b,count:arr.length/3};}
function torusGeometry(R=1,r=.055,seg=72,tube=10){const v=[],n=[];for(let i=0;i<seg;i++){const a0=i/seg*TAU,a1=(i+1)/seg*TAU;for(let j=0;j<tube;j++){const b0=j/tube*TAU,b1=(j+1)/tube*TAU;const ps=[[a0,b0],[a1,b0],[a1,b1],[a0,b0],[a1,b1],[a0,b1]];ps.forEach(([a,b])=>{const rr=R+r*Math.cos(b),x=rr*Math.cos(a),y=r*Math.sin(b),z=rr*Math.sin(a),nx=Math.cos(b)*Math.cos(a),ny=Math.sin(b),nz=Math.cos(b)*Math.sin(a);v.push(x,y,z);n.push(nx,ny,nz);});}}return makeMeshBuffer(v,n);}
function ensurePortal(){if(!portalMesh)portalMesh=torusGeometry(1.25,.035,96,10);}
function makeWeb(seed){
 const nodes=[],filaments=[];
 for(let i=0;i<18;i++){const u=hash(seed+'cn'+i),v=hash(seed+'cm'+i),w=hash(seed+'cp'+i),a=u*TAU,p=(v-.5)*Math.PI*.72,r=1.8+w*7.8;nodes.push([Math.cos(a)*Math.cos(p)*r,(w-.5)*9,Math.sin(a)*Math.cos(p)*r]);}
 for(let i=0;i<nodes.length;i++){const links=2+(hash(seed+'lk'+i)*3|0);for(let j=1;j<=links;j++){const k=(i+j+1)%nodes.length;if(k<=i)continue;const A=nodes[i],B=nodes[k],pts=[],ws=[];for(let n=0;n<9;n++){const t=n/8,curve=Math.sin(t*Math.PI)*(hash(seed+'cv'+i+'|'+k)-.5)*1.8;pts.push([A[0]+(B[0]-A[0])*t+curve,A[1]+(B[1]-A[1])*t+Math.sin(t*Math.PI*2)*(hash(seed+'cy'+i+'|'+k)-.5)*1.1,A[2]+(B[2]-A[2])*t+curve*.72]);ws.push(.018+.045*Math.sin(Math.PI*t));}filaments.push(ribbon(pts,ws));}}
 return{nodes,filaments};
}
function ensureWeb(seed){const k=String(seed);if(webKey===k&&webNetworkNodes.length)return;if(webRibbons.length)webRibbons.forEach(delMesh);const net=makeWeb(seed);webRibbons=net.filaments;webNetworkNodes=net.nodes;webKey=k;}
function glowBlob(mat,mdl,color,opacity,em){drawMesh(solarSphere,mat,mdl,color,opacity,em);}
function ringMeshBuffer(inner,outer,seg=128){const v=[],n=[];for(let i=0;i<seg;i++){const a0=i/seg*TAU,a1=(i+1)/seg*TAU,ps=[[inner,a0],[outer,a0],[outer,a1],[inner,a0],[outer,a1],[inner,a1]];ps.forEach(([r,a])=>{v.push(r*Math.cos(a),0,r*Math.sin(a));n.push(0,1,0);});}return makeMeshBuffer(v,n);}
let saturnRingMesh=null;
function ensureSaturnRing(){if(!saturnRingMesh)saturnRingMesh=ringMeshBuffer(.42,.82,96);}
function drawSolarScene(s,mat,t){
 gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);
 solarOrbits.forEach((o)=>drawLineBuffer(o,mat,[.24,.5,.72,.2]));
 const sun=model(0,0,0,.72,.72,.72,t*.045,0,0);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);glowBlob(mat,sun,[1,.53,.12],1,2.7);
 const planets=[
  {name:'Mercury',r:.82,s:.1,c:[.52,.52,.48]},
  {name:'Venus',r:1.18,s:.16,c:[.92,.69,.4]},
  {name:'Earth',r:1.62,s:.19,c:[.12,.38,.9]},
  {name:'Mars',r:2.08,s:.13,c:[.72,.3,.18]},
  {name:'Jupiter',r:2.55,s:.32,c:[.78,.56,.33]},
  {name:'Saturn',r:3.08,s:.28,c:[.85,.72,.48]},
  {name:'Uranus',r:3.66,s:.23,c:[.38,.72,.9]}
 ];
 planets.forEach((p,i)=>{
   const ang=t*(.12/(i+1))+i*1.31,x=Math.cos(ang)*p.r,z=Math.sin(ang)*p.r;
   gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);drawMesh(solarSphere,mat,model(x,0,z,p.s,p.s,p.s,0,t*.06,0),p.c,1,.32);
   if(p.name==='Earth'){drawMesh(solarSphere,mat,model(x,0,z,p.s*1.075,p.s*1.075,p.s*1.075,0,t*.04,0),[.16,.5,1],.11,.55);drawMesh(solarSphere,mat,model(x+.27,0,z+.12,.055,.055,.055,0,t*.2,0),[.75,.78,.84],1,.18);}
   if(p.name==='Saturn'){ensureSaturnRing();drawMesh(saturnRingMesh,mat,model(x,0,z,p.s*1.65,p.s*.34,p.s*1.65,.15,0,0),[.9,.7,.45],.65,.35);}
 });
 gl.blendFunc(gl.SRC_ALPHA,gl.ONE);drawPoints(starsBuf,mat,12);
}
function drawNeighborhoodScene(s,mat,t){
 const pts=makePointArray(s.seed,s.quality,1);if(starsKey!==String(s.seed)+'n'){if(starsBuf)delPoint(starsBuf);starsBuf=makePointBuffer(pts,gl.STATIC_DRAW);starsKey=String(s.seed)+'n';}
 drawRealStarLayer(s,mat,16,.42);drawPoints(starsBuf,mat,18);
 gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);for(let i=0;i<18;i++){const a=hash(s.seed+'na',i)*TAU,p=(hash(s.seed+'np',i)-.5)*Math.PI*.8,r=.8+hash(s.seed+'nr',i)*5.0,x=Math.cos(a)*Math.cos(p)*r,y=Math.sin(p)*r,z=Math.sin(a)*Math.cos(p)*r,sz=.035+hash(s.seed+'ns',i)*.09,c=hash(s.seed+'nc',i);drawMesh(solarSphere,mat,model(x,y,z,sz,sz,sz,0,t*.03,0),c<.25?[1,.42,.2]:c<.62?[1,.75,.4]:[.54,.78,1],1,.42);}
 gl.blendFunc(gl.SRC_ALPHA,gl.ONE);
}
function catalogPosition(o,base=1){
 const v=sky(o.ra,o.dec);const z=Number(o.redshift),ly=Number(o.distanceLy);
 let r=base;
 if(Number.isFinite(ly)&&ly>0)r+=Math.log10(ly+1)*.42;
 else if(Number.isFinite(z))r+=Math.log1p(Math.max(0,z)*2600)*.7;
 return[v[0]*r,v[1]*r,v[2]*r];
}
function starCatalogs(limit=18){
 return objects.filter(o=>String(o.type||'').toLowerCase().includes('star')||String(o.sourceKey||'')==='gaia').filter(o=>Number.isFinite(Number(o.ra))&&Number.isFinite(Number(o.dec))).slice(0,limit);
}
function starColor(o){
 const m=Number(o.mag);if(Number.isFinite(m)&&m<-5)return[1,.55,.2];
 const s=String(o.spectral||'').toLowerCase();if(s.includes('m'))return[1,.48,.28];if(s.includes('a'))return[.72,.84,1];if(s.includes('f'))return[.86,.92,1];if(s.includes('g'))return[1,.9,.62];if(s.includes('k'))return[1,.67,.38];return[.82,.9,1];
}
function drawRealStarLayer(s,mat,limit=18,base=.55){
 const list=starCatalogs(limit);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);gl.depthMask(false);
 list.forEach((o,i)=>{const p=catalogPosition(o,base),m=Number(o.mag),brightness=Number.isFinite(m)?Math.max(.05,Math.min(1,(11-Math.max(-5,Math.min(12,m)))/12)):.42,sc=.022+.105*brightness;drawMesh(solarSphere,mat,model(p[0],p[1],p[2],sc,sc,sc,0,(performance.now()/10000)+i,0),starColor(o),.82,1.0+brightness*.7);});
 return list.length;
}

function galaxyCatalogs(limit=12){
 return objects.filter(o=>/galaxy|agn|quasar/i.test(String(o.type||''))||['ned','sdss','desi'].includes(o.sourceKey)).filter(o=>Number.isFinite(Number(o.ra))&&Number.isFinite(Number(o.dec))).slice(0,limit);
}
function drawRealGalaxyLayer(s,mat,limit,base){
 const list=galaxyCatalogs(limit);
 list.forEach((o,i)=>{const p=catalogPosition(o,base),scale=.055+Math.min(.16,Math.max(.035,(Number(o.mag)!=null?(12-Math.min(12,Math.max(-3,Number(o.mag))))/90:.08)));const kind=(hash(o.id+'kind',i)*4)|0;drawGalaxy(mat,o.id,p[0],p[1],p[2],scale,hash(o.id+'rot',i)*TAU,(hash(o.id+'tilt',i)-.5)*1.15,kind);});
 return list.length;
}
function drawCatalogNodes(s,mat,limit=28){
 const list=galaxyCatalogs(limit);if(!list.length)return 0;
 gl.blendFunc(gl.SRC_ALPHA,gl.ONE);gl.depthMask(false);
 list.forEach((o,i)=>{const p=catalogPosition(o,1.5),sc=.018+hash(o.id+'node',i)*.055;drawMesh(solarSphere,mat,model(p[0],p[1],p[2],sc,sc,sc),o.sourceType==='PUBLIC SURVEY'?[.32,.9,1]:[.58,1,.72],.55,1.25);});
 return list.length;
}

function drawGalaxy(mat,seed,x,y,z,scale,rot,tilt,kind=0){
 if(kind===1){drawMesh(galaxyScene.bulge,mat,model(x,y,z,scale*.86,scale*.35,scale*.86,tilt,rot,0),[.64,.68,.78],.44,1.6);drawMesh(galaxyScene.bulge,mat,model(x+.03,y,z,scale*.46,scale*.18,scale*.46,tilt,rot+.4,0),[.96,.78,.52],.24,1.5);return;}
 const thick=kind===2?.18:.11,mdl=()=>model(x,y,z,scale,scale*thick,scale,tilt,rot,0);
 drawMesh(galaxyScene.disk,mat,mdl(),kind===2?[.44,.58,.68]:[.22,.48,.8],.28,1.8);
 drawMesh(galaxyScene.bulge,mat,model(x,y,z,scale*.33,scale*.16,scale*.33,tilt,rot,0),kind===2?[.82,.44,.33]:[.95,.62,.38],.62,2.0);
 if(kind!==2)galaxyScene.arms.forEach((arm,i)=>drawMesh(arm,mat,model(x,y,z,scale,scale*.72,scale,tilt,rot+i*.02,0),kind===3?(i%2?[1,.42,.32]:[.55,.4,1]):(i%2?[.25,.62,1]:[.7,.38,1]),.55,1.8));
}
function drawMilkyWayScene(s,mat,t){
 ensureGalaxy(s.seed);
 gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);
 drawMesh(galaxyScene.disk,mat,model(0,0,0,5.9,.055,5.9,0,0,0),[.08,.24,.46],.48,.55);
 drawMesh(galaxyScene.bulge,mat,model(0,0,0,.7,.32,.7,0,0,0),[1,.46,.2],.88,2.5);
 galaxyScene.arms.forEach((arm,i)=>drawMesh(arm,mat,model(0,.02,0,2.85,.45,2.85,0,i*.02+t*.006,0),i%2?[.22,.55,1]:[.62,.36,1],.56,2.4));
 drawRealStarLayer(s,mat,18,.65);
 for(let i=0;i<9;i++){const a=hash(s.seed+'n'+i)*TAU,r=.9+hash(s.seed+'r'+i)*4.7;drawMesh(solarSphere,mat,model(Math.cos(a)*r,(hash(s.seed+'y'+i)-.5)*.28,Math.sin(a)*r,.12+hash(s.seed+'sz'+i)*.26,.08,.18+hash(s.seed+'zz'+i)*.2,0,a,0),[.18,.62,1],.11,2.2);}
 gl.blendFunc(gl.SRC_ALPHA,gl.ONE);drawPoints(starsBuf,mat,16);
}
function drawGalaxyGroupScene(s,mat,t){
 if(!galaxyScene||galaxyKey!==String(s.seed)){galaxyScene=makeGalaxy(s.seed,1,0);galaxyKey=String(s.seed);}
 gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);
 const count=Math.max(7,Math.floor(14*Math.max(.5,Math.min(1,s.quality))));for(let i=0;i<count;i++){const u=hash(s.seed+'u'+i),a=hash(s.seed+'a'+i)*TAU,rr=2.1+u*10,x=Math.cos(a)*rr,y=(hash(s.seed+'y'+i)-.5)*7,z=Math.sin(a)*rr,sc=.12+hash(s.seed+'s'+i)*.32;drawGalaxy(mat,s.seed+'g'+i,x,y,z,sc,hash(s.seed+'ro'+i)*TAU,(hash(s.seed+'ti'+i)-.5)*1.4,i%4);}
 drawRealGalaxyLayer(s,mat,8,2.2);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);drawPoints(starsBuf,mat,12);
}
function drawCosmicWebScene(s,mat,t){
 ensureWeb(s.seed);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);gl.depthMask(false);
 webRibbons.forEach((r,i)=>drawMesh(r,mat,identity(),i%3===0?[.35,.92,1]:[.55,.52,1],.18,.9));
 const nodes=Math.max(20,Math.floor(44*Math.max(.45,Math.min(1,s.quality))));for(let i=0;i<nodes;i++){const a=hash(s.seed+'n'+i)*TAU,rr=1.2+hash(s.seed+'r'+i)*7.5,y=(hash(s.seed+'y'+i)-.5)*10,x=Math.cos(a)*rr,z=Math.sin(a)*rr;drawMesh(galaxyScene?.bulge||solarSphere,mat,model(x,y,z,.018,.018,.018),[.48,.84,1],.45,1.7);}
}
function drawDataWorldScene(s,mat,t){
 gl.blendFunc(gl.SRC_ALPHA,gl.ONE);gl.depthMask(false);ensurePortal();
 for(let i=0;i<7;i++){const a=t*(.08+i*.01)+i*TAU/7,r=1.2+i*.32,x=Math.cos(a)*r,z=Math.sin(a)*r;drawMesh(portalMesh,mat,model(x,(hash(s.seed+'dy'+i)-.5)*.7,z,.45,.045,.45,Math.PI*.5,a,0),[.2,.85,1],.1,.9);}
 for(let i=0;i<24;i++){const a=hash(s.seed+'da'+i)*TAU,r=.7+hash(s.seed+'dr'+i)*4.2,x=Math.cos(a)*r,y=(hash(s.seed+'dy2'+i)-.5)*2,z=Math.sin(a)*r,sc=.025+hash(s.seed+'ds'+i)*.08;drawMesh(solarSphere,mat,model(x,y,z,sc,sc,sc,0,t*.1,0),i%4?[.45,.86,1]:[.84,.42,1],.6,1.3);}
 gl.blendFunc(gl.SRC_ALPHA,gl.ONE);drawPoints(starsBuf,mat,7);
}
function drawNebulaScene(s,mat,t){
 gl.blendFunc(gl.SRC_ALPHA,gl.ONE);gl.depthMask(false);
 for(let i=0;i<18;i++){const a=hash(s.seed+'na'+i)*TAU,r=.5+hash(s.seed+'nr'+i)*3.8,x=Math.cos(a)*r,y=(hash(s.seed+'ny'+i)-.5)*2.5,z=Math.sin(a)*r,sc=.25+hash(s.seed+'ns'+i)*1.0;const col=i%3===0?[.98,.22,.52]:i%3===1?[.25,.72,1]:[.52,.38,1];drawMesh(solarSphere,mat,model(x,y,z,sc,sc*(.55+hash(s.seed+'nsy'+i)*.7),sc*.8,0,a,0),col,.055,.95);}
 drawPoints(starsBuf,mat,9);
}
function drawStarSystemScene(s,mat,t){drawSolarScene(s,mat,t);}
function drawPlanetScene(s,mat,t){
 gl.blendFunc(gl.SRC_ALPHA,gl.ONE);gl.depthMask(false);
 const spin=t*.08,planet=model(0,0,0,1.65,1.65,1.65,0,spin,0);drawMesh(solarSphere,mat,planet,[.18,.55,.96],1,.55);
 drawMesh(solarSphere,mat,model(0,0,0,1.71,1.71,1.71,0,spin*.8,0),[.15,.38,.9],.08,.35);
 ensurePortal();drawMesh(portalMesh,mat,model(0,0,0,2.25,.055,2.25,Math.PI*.5,spin,0),[.9,.52,.26],.18,1.2);
 drawMesh(solarSphere,mat,model(2.55,.35,.2,.22,.22,.22,0,t*.18,0),[.72,.76,.82],1,.3);
 drawMesh(solarSphere,mat,model(-2.1,-.8,.65,.12,.12,.12,0,t*.25,0),[.62,.72,.98],1,.32);
 gl.blendFunc(gl.SRC_ALPHA,gl.ONE);drawPoints(starsBuf,mat,8);
}
function drawAGNScene(s,mat,t){
 ensureGalaxy(s.seed);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);gl.depthMask(false);
 drawMesh(solarSphere,mat,model(0,0,0,.52,.52,.52,0,t*.2,0),[.008,.01,.02],1,.05);
 drawMesh(galaxyScene.disk,mat,model(0,0,0,2.5,.075,2.5,0,t*.12,0),[1,.18,.035],.34,2.8);
 drawMesh(galaxyScene.disk,mat,model(0,0,0,1.65,.04,1.65,0,-t*.18,0),[.96,.62,.12],.26,2.4);
 drawMesh(solarSphere,mat,model(0,1.6,0,.13,1.8,.13,0,0,0),[.36,.7,1],.08,2.0);
 drawMesh(solarSphere,mat,model(0,-1.6,0,.13,1.8,.13,0,0,0),[.36,.7,1],.08,2.0);
 drawRealGalaxyLayer(s,mat,8,2.8);drawPoints(starsBuf,mat,7);
}
function drawAnomalyScene(s,mat,t){
 ensurePortal();gl.blendFunc(gl.SRC_ALPHA,gl.ONE);gl.depthMask(false);
 for(let i=0;i<5;i++){const a=t*(.12+i*.025)+i*TAU/5,sc=1+i*.42;drawMesh(portalMesh,mat,model(0,0,0,sc,sc*.08,sc,.35+i*.15,a,0),i%2?[.35,.92,1]:[.85,.35,1],.12,.9);}
 drawPoints(starsBuf,mat,8);
}
function drawDeepUniverseScene(s,mat,t){
 if(!galaxyScene||galaxyKey!==String(s.seed)){galaxyScene=makeGalaxy(s.seed,1,0);galaxyKey=String(s.seed);}
 gl.blendFunc(gl.SRC_ALPHA,gl.ONE);gl.depthMask(false);
 const count=Math.max(12,Math.floor(22*Math.max(.45,Math.min(1,s.quality))));for(let i=0;i<count;i++){const a=hash(s.seed+'a'+i)*TAU,p=(hash(s.seed+'p'+i)-.5)*Math.PI*.86,r=2.0+hash(s.seed+'r'+i)*17,x=Math.cos(a)*Math.cos(p)*r,y=Math.sin(p)*r,z=Math.sin(a)*Math.cos(p)*r,sc=.045+hash(s.seed+'s'+i)*.22,mdl=model(x,y,z,sc,sc*.11,sc,((hash(s.seed+'ti'+i)-.5)*1.5),hash(s.seed+'q'+i)*TAU,0);drawMesh(galaxyScene.disk,mat,mdl,[.22,.48,.8],.26,1.8);drawMesh(galaxyScene.bulge,mat,model(x,y,z,sc*.33,sc*.16,sc*.33,((hash(s.seed+'ti'+i)-.5)*1.5),hash(s.seed+'q'+i)*TAU,0),[.92,.58,.4],.52,2.0);}
 drawPoints(starsBuf,mat,10);
}
function render(){
 const s=WCA?.getState?.()||{depth:0,family:0,seed:1.234,yaw:0,pitch:0,distance:8.2,quality:1,transition:0,origin:[0,0,0]};
 lastRendered=s;const t=performance.now()/1000,mat=mvp(s),scene=getScene(s.depth,s.seed,s.quality,s.family);
 if(scene!==lastScene){lastScene=scene;emitScene(scene);}
 gl.enable(gl.BLEND);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.clearColor(.002,.004,.01,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
 gl.uniformMatrix4fv(ploc.m,false,mat);gl.uniformMatrix4fv(mloc.m,false,mat);
 if(scene==='solar')drawSolarScene(s,mat,t);
 else if(scene==='neighborhood')drawNeighborhoodScene(s,mat,t);
 else if(scene==='milkyway')drawMilkyWayScene(s,mat,t);
 else if(scene==='galaxy-group')drawGalaxyGroupScene(s,mat,t);
 else if(scene==='cosmic-web')drawCosmicWebScene(s,mat,t);
 else if(scene==='data-world')drawDataWorldScene(s,mat,t);
 else if(scene==='nebula')drawNebulaScene(s,mat,t);
 else if(scene==='star-system')drawStarSystemScene(s,mat,t);
 else if(scene==='planet')drawPlanetScene(s,mat,t);
 else if(scene==='agn')drawAGNScene(s,mat,t);
 else if(scene==='anomaly')drawAnomalyScene(s,mat,t);
 else drawDeepUniverseScene(s,mat,t);
 gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);ensurePortal();const pd=.62+.18*Math.sin(t*1.3);drawMesh(portalMesh,mat,model(0,0,0,pd,pd,pd,Math.PI*.5,t*.22,0),[.28,.72,1],.16,.9);
 if(s.transition>0){const q=1+(.9-s.transition)*2.4;gl.blendFunc(gl.SRC_ALPHA,gl.ONE);drawMesh(portalMesh,mat,model(0,0,0,q,q,q,Math.PI*.5,-t*.18,0),[.52,.38,1],.24,.9);}
 rebuildCatalogIfNeeded(s);
 const now=performance.now(),dt=now-lastFrame;lastFrame=now;if(dt>0)fpsEMA=fpsEMA*.9+(1000/dt)*.1;frameN++;if(frameN%60===0&&WCA?.setQuality){if(fpsEMA<43)WCA.setQuality(Math.max(.45,s.quality-.07));else if(fpsEMA>57)WCA.setQuality(Math.min(1,s.quality+.025));}
 window.NexusNovaInfiniteLabRenderer?.setRuntime?.({webgl2:true,dpr,culling:true,lod:true,catalogObjects:objects.length,cacheSize:cache.size,adaptiveQuality:true,fps:fpsEMA,originRebased:s.origin?.slice?.()||[0,0,0],scene});
 requestAnimationFrame(render);
}
function emitScene(scene){const labels={solar:'SOLAR SYSTEM / 3D BODIES + ORBITAL CONTEXT',neighborhood:'LOCAL STELLAR NEIGHBORHOOD / STAR COLOUR + DEPTH',milkyway:'MILKY WAY / DISK + BULGE + SPIRAL ARMS + NEBULAR REGIONS','galaxy-group':'LOCAL GROUP / GALAXY MORPHOLOGY + CLUSTER CONTEXT','cosmic-web':'COSMIC WEB / FILAMENTS + VOIDS + STRUCTURE',nebula:'NEBULA / EMISSION + DUST CONTEXT','star-system':'STAR SYSTEM / HOST + ORBITAL CONTEXT',planet:'PLANETARY SCALE / 3D BODY + MOONS',agn:'AGN CORE / ACCRETION DISK + JET CONTEXT',anomaly:'ANOMALY FIELD / PROCEDURAL RECURSION','deep-universe':'DEEP UNIVERSE / GALAXY FIELD + COSMOLOGICAL DEPTH'};emitEvent(labels[scene]||'3D COSMIC SCENE');}
function rebuildCatalogIfNeeded(s){const key=String(s.depth)+'|'+Number(s.distance).toFixed(1)+'|'+Number(s.yaw).toFixed(2)+'|'+Number(s.pitch).toFixed(2)+'|'+Number(s.panX).toFixed(2)+'|'+Number(s.panY).toFixed(2)+'|'+objects.length;if(rebuildCatalogIfNeeded.k===key)return;rebuildCatalogIfNeeded.k=key;rebuildCatalog();}
function tap(x,y){
 if(!lastRendered)return;rebuildCatalog();const mm=mvp(lastRendered);let best=null,bd=34;
 projected.forEach(o=>{if(!o)return;const q=project(mm,o.position);if(!q)return;const dd=Math.hypot(q.x-x,q.y-y);if(dd<bd){bd=dd;best=o;}});
 if(best){WCA?.selectObject?.(best);return;}
 if(Math.hypot(x-W*.5,y-H*.52)<Math.min(W,H)*.22)WCA?.dive?.();
}
window.NexusNovaInfiniteLabRenderer={resize,handleTap:tap,setState:()=>{},setRuntime:r=>{window.__nnRuntime=r;},setTransition:()=>{}};
status('WEBGL2 ACTIVE · SCALE-AWARE 3D SCENE GRAPH · MESH + GPU POINT LAYERS · PROGRESSIVE LOAD');
bootSources().catch(()=>status('PUBLIC DATA SOURCE TEMPORARILY UNAVAILABLE · 3D SCENE + ANCHORS PRESERVED'));
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