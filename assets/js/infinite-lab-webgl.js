const pointVS=['#version 300 es','in vec3 aPosition;','in vec4 aColor;','in float aSize;','uniform mat4 uMvp;','uniform float uPointScale;','uniform float uDpr;','out vec4 vColor;','void main(){vec4 p=uMvp*vec4(aPosition,1.0);gl_Position=p;float d=max(.22,-p.z);gl_PointSize=clamp(aSize*uPointScale*uDpr/d,1.0,34.0);vColor=aColor;}'].join('\\n');
const pointFS=['#version 300 es','precision highp float;','in vec4 vColor;','out vec4 outColor;','void main(){vec2 p=gl_PointCoord*2.0-1.0;float r=dot(p,p);if(r>1.0)discard;float g=1.0-smoothstep(.02,1.0,r);float c=1.0-smoothstep(.0,.28,r);outColor=vec4(vColor.rgb,(.18*g+.92*c)*vColor.a);}'].join('\\n');
const meshVS=['#version 300 es','in vec3 aPosition;','in vec3 aNormal;','uniform mat4 uMvp;','uniform mat4 uModel;','out vec3 vNormal;','out vec3 vLocal;','void main(){vec4 p=uModel*vec4(aPosition,1.0);gl_Position=uMvp*p;vNormal=normalize(mat3(uModel)*aNormal);vLocal=aPosition;}'].join('\\n');
const meshFS=['#version 300 es','precision highp float;','uniform vec3 uColor;','uniform float uOpacity;','uniform float uEmission;','in vec3 vNormal;','in vec3 vLocal;','out vec4 outColor;','void main(){vec3 n=normalize(vNormal);float l=.52+.48*max(0.,dot(n,normalize(vec3(.45,.78,.32))));float rim=pow(1.-max(0.,dot(n,vec3(0.,0.,1.))),2.0);float grain=.97+.03*sin((vLocal.x+vLocal.y*1.7+vLocal.z*.8)*20.);vec3 c=uColor*(l*grain)+uColor*(uEmission*(.5+.5*rim));outColor=vec4(c,uOpacity);}'].join('\\n');
const lineVS=['#version 300 es','in vec3 aPosition;','uniform mat4 uMvp;','void main(){gl_Position=uMvp*vec4(aPosition,1.0);}'].join('\\n');
const lineFS=['#version 300 es','precision highp float;','uniform vec4 uColor;','out vec4 outColor;','void main(){outColor=uColor;}'].join('\\n');
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
let galaxyKey='',galaxyScene=null,starsKey='',starsBuf=null,catBuf=null,projected=[];
function getScene(depth,seed,q){const sceneDepth=Math.max(0,Number(depth)||0);const key=sceneDepth+'|'+Number(seed).toFixed(5)+'|'+Math.round(q*100);if(starsKey!==key){if(starsBuf)delPoint(starsBuf);starsBuf=makePointBuffer(makePointArray(seed,q,sceneDepth),gl.STATIC_DRAW);starsKey=key;}
 if(sceneDepth>=2&&sceneDepth<=5){const k='g|'+key;if(galaxyKey!==k){galaxyScene=makeGalaxy(seed,1,0);galaxyKey=k;}}return{mode:sceneDepth===0?'solar':sceneDepth===1?'neighborhood':sceneDepth<=4?'milkyway':sceneDepth<=7?'galaxy-group':sceneDepth<=11?'cosmic-web':'deep-universe'};}
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
 const dd=Math.hypot(x-W*.5,y-H*.52);if(dd<Math.min(W,H)*.22)WCA?.dive?.();
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