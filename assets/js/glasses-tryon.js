(()=>{
'use strict';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const canvas=$('[data-canvas]');
const video=$('[data-video]'),imagePreview=$('[data-image-preview]'),stage=$('[data-stage]');
if(!canvas||!video)return;
let ctx=null;
try{
  ctx=canvas.getContext('webgl2',{alpha:true,antialias:true,preserveDrawingBuffer:true,powerPreference:'high-performance'})
    ||canvas.getContext('webgl',{alpha:true,antialias:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});
}catch(_){ctx=null}
const WEBGL_AVAILABLE=!!ctx;

const imageInput=$('[data-image-input]'),cameraToggle=$('[data-camera-toggle]'),exportBtn=$('[data-export]');
const empty=$('[data-empty-state]'),status=$('[data-status]'),detectPill=$('[data-detection-status]'),resolution=$('[data-resolution]');
const faceStatus=$('[data-face-status]'),engine=$('[data-engine-state]'),engineLine=$('.vg-engine-line');
const scanPanel=$('[data-scan-panel]'),scanProgress=$('[data-scan-progress]'),scanPercent=$('[data-scan-percent]'),scanLabel=$('[data-scan-label]');
const styles=$$('[data-style]'),colors=$$('[data-color]');

const MP_URL='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35';
const MP_WASM='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm';
const MP_MODEL='https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
const EYEWEAR=[
{id:'nx-ac-obsidian',code:'A01',family:'Atelier Acetate',finish:'Obsidian',style:'classic',url:'https://cdn.3dassets.dev/assets/31688/v1/model.glb',size:.134,scale:1.0,frame:'#111827',lens:0x9bbbd1},
{id:'nx-ac-ivory',code:'A02',family:'Atelier Acetate',finish:'Ivory',style:'classic',url:'https://cdn.3dassets.dev/assets/31688/v1/model.glb',size:.134,scale:1.0,frame:'#f1f5f2',lens:0xc5d7df},
{id:'nx-ac-burgundy',code:'A03',family:'Atelier Acetate',finish:'Burgundy',style:'classic',url:'https://cdn.3dassets.dev/assets/31688/v1/model.glb',size:.134,scale:1.0,frame:'#6f2332',lens:0xc2959f},
{id:'nx-ac-espresso',code:'A04',family:'Atelier Acetate',finish:'Espresso',style:'classic',url:'https://cdn.3dassets.dev/assets/31688/v1/model.glb',size:.134,scale:1.0,frame:'#3F342A',lens:0xa98a76},
{id:'nx-wt-champagne',code:'W01',family:'Wire Atelier',finish:'Champagne',style:'round',url:'https://cdn.3dassets.dev/assets/31687/v1/model.glb',size:.131,scale:1.0,frame:'#a67c45',lens:0xb9d0dd},
{id:'nx-wt-graphite',code:'W02',family:'Wire Atelier',finish:'Graphite',style:'round',url:'https://cdn.3dassets.dev/assets/31687/v1/model.glb',size:.131,scale:1.0,frame:'#2c3138',lens:0x9eb9cc},
{id:'nx-wt-silver',code:'W03',family:'Wire Atelier',finish:'Silver',style:'round',url:'https://cdn.3dassets.dev/assets/31687/v1/model.glb',size:.131,scale:1.0,frame:'#b9c0c8',lens:0xc7d7df},
{id:'nx-wt-rose',code:'W04',family:'Wire Atelier',finish:'Rose Metal',style:'round',url:'https://cdn.3dassets.dev/assets/31687/v1/model.glb',size:.131,scale:1.0,frame:'#a86973',lens:0xd1bec3},
{id:'nx-tr-satin',code:'T01',family:'Precision Trial',finish:'Satin',style:'round',url:'https://cdn.3dassets.dev/assets/31677/v1/model.glb',size:.131,scale:1.0,frame:'#5f6670',lens:0xa8beca},
{id:'nx-tr-black',code:'T02',family:'Precision Trial',finish:'Black',style:'round',url:'https://cdn.3dassets.dev/assets/31677/v1/model.glb',size:.131,scale:1.0,frame:'#20242b',lens:0x8faebf},
{id:'nx-sp-noir',code:'S01',family:'Performance Aviator',finish:'Noir',style:'aviator',url:'https://cdn.3dassets.dev/assets/39447/v1/model.glb',size:.149,scale:1.0,frame:'#20242b',lens:0x55708c},
{id:'nx-sp-deepblue',code:'S02',family:'Performance Aviator',finish:'Deep Blue',style:'aviator',url:'https://cdn.3dassets.dev/assets/39447/v1/model.glb',size:.149,scale:1.0,frame:'#203a68',lens:0x58799a}
];


const L={ro:33,ri:133,li:362,lo:263,rt:159,rb:145,lt:386,lb:374,lf:234,rf:454};
const STYLES={
  classic:{lensW:1.18,lensH:.78,sep:1.26,corner:.15,thick:.105,bridge:.06,temple:.13},
  round:{lensW:1.06,lensH:1.00,sep:1.16,corner:.5,thick:.082,bridge:.055,temple:.12},
  'cat-eye':{lensW:1.22,lensH:.76,sep:1.28,corner:.12,thick:.10,bridge:.055,temple:.135},
  aviator:{lensW:1.14,lensH:1.04,sep:1.20,corner:.12,thick:.075,bridge:.048,temple:.12}
};
const PALETTES={
  '#111827':{frame:0x121722,metal:0xc7cbd4,lens:0x8fb8d9},
  '#3F342A':{frame:0x4b3122,metal:0xd7ad62,lens:0x9a765d},
  '#6B7280':{frame:0x68707c,metal:0xd7dde5,lens:0xa9c7dd},
  '#7C3AED':{frame:0x6e36b8,metal:0xd8c2ff,lens:0xa88bdc},
  '#0F766E':{frame:0x0f6d68,metal:0xd7c18b,lens:0x78b0ab},
  '#9A3412':{frame:0x8f3214,metal:0xdcb36d,lens:0xc18168},
  '#1D4ED8':{frame:0x1d4bb7,metal:0xb9c7e8,lens:0x749bd7},
  '#A16207':{frame:0x9a620a,metal:0xf0d18d,lens:0xc6a36b}
};
const st={source:'none',image:null,url:null,stream:null,style:'classic',color:'#111827',modelId:'nx-ac-obsidian',model:null,detected:false,busy:false,lastDetect:0,raf:0,scanStart:0,scanTimer:0,detW:window.matchMedia?.('(pointer:coarse)')?.matches?256:320,detH:window.matchMedia?.('(pointer:coarse)')?.matches?144:180,threeReady:false,scene:null,camera3:null,renderer:null,glasses:null,glassMeta:null,THREE:null,loader:null,model:null,modelLoading:false,modelWidth:.134,pmrem:null,environment:null,viewW:0,viewH:0,nativeW:0,nativeH:0};

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const mid=(a,b)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2,z:(a.z+b.z)/2});
const msg=(t,tone='')=>{if(status){status.textContent=t;status.dataset.tone=tone}};
const pill=(t,s='')=>{if(detectPill){detectPill.textContent=t;detectPill.dataset.state=s}};
const eng=(t,s='')=>{if(engine)engine.textContent=t;if(engineLine)engineLine.dataset.state=s};
const res=(w,h)=>{if(resolution)resolution.textContent=w&&h?`${w.toLocaleString()} × ${h.toLocaleString()}`:'0 × 0'};
const faceMsg=(t,v,d)=>{if(faceStatus){faceStatus.textContent=t;faceStatus.dataset.visible=v?'true':'false';faceStatus.dataset.face=d?'true':'false'}};
const stop=stream=>stream?.getTracks().forEach(t=>{try{t.stop()}catch(_){}});

function scanUi(percent,label){
  if(scanPanel)scanPanel.hidden=false;
  if(scanProgress)scanProgress.style.width=`${clamp(percent,0,100)}%`;
  if(scanPercent)scanPercent.textContent=`${Math.round(clamp(percent,0,100))}%`;
  if(scanLabel)scanLabel.textContent=label;
}
function resetScan(){
  if(scanPanel)scanPanel.hidden=true;
  if(scanProgress)scanProgress.style.width='0%';
  if(scanPercent)scanPercent.textContent='0%';
  if(scanLabel)scanLabel.textContent='FACE SCAN';
}
function beginScan(){
  st.scanStart=performance.now();
  if(st.scanTimer)cancelAnimationFrame(st.scanTimer);
  const tick=()=>{
    if(st.source!=='camera')return;
    if(!st.detected){
      const p=Math.min(92,4+((performance.now()-st.scanStart)/2800)*88);
      scanUi(p,p>=92?'HOLDING SCAN':'SCANNING FACE');
    }
    st.scanTimer=requestAnimationFrame(tick);
  };
  tick();
}

class Vision{
  constructor(){this.ready=null;this.landmarker=null;this.mode='';this.delegate='CPU'}
  async init(){
    if(this.landmarker)return;
    if(this.ready)return this.ready;
    this.ready=(async()=>{
      eng('Loading face vision','busy');pill('LOADING VISION','busy');msg('Loading client-side face vision…');
      const x=await import(MP_URL);
      const resolver=await x.FilesetResolver.forVisionTasks(MP_WASM);
      let error=null;
      for(const delegate of ['GPU','CPU']){
        try{
          this.landmarker=await x.FaceLandmarker.createFromOptions(resolver,{
            baseOptions:{modelAssetPath:MP_MODEL,delegate},
            runningMode:'IMAGE',numFaces:1,
            minFaceDetectionConfidence:.52,minFacePresenceConfidence:.52,minTrackingConfidence:.52
          });
          this.delegate=delegate;this.mode='IMAGE';
          eng(`Face vision ready · ${delegate}`,'ready');pill('READY','ready');return;
        }catch(e){error=e}
      }
      throw error||new Error('Face vision engine could not be initialized.');
    })().catch(e=>{this.ready=null;eng('Face vision unavailable','error');pill('ENGINE ERROR','error');throw e});
    return this.ready;
  }
  async setMode(mode){
    await this.init();
    if(this.mode===mode)return;
    await this.landmarker.setOptions({runningMode:mode});
    this.mode=mode;
  }
  async image(source){await this.setMode('IMAGE');return this.landmarker.detect(source)}
  async video(source,ts){await this.setMode('VIDEO');return this.landmarker.detectForVideo(source,ts)}
  dispose(){try{this.landmarker?.close?.()}catch(_){}this.landmarker=null;this.ready=null;this.mode=''}
}
const vision=new Vision();

function makeRenderer(THREE){
  if(!WEBGL_AVAILABLE||!ctx)throw new Error('WebGL is unavailable on this device/browser.');
  const opts={canvas,alpha:true,antialias:true,preserveDrawingBuffer:true,powerPreference:'high-performance'};
  opts.context=ctx;
  const r=new THREE.WebGLRenderer(opts);
  const touch=window.matchMedia?.('(pointer:coarse)')?.matches;
  r.setPixelRatio(Math.min(window.devicePixelRatio||1,touch?1.25:1.5));
  r.transmissionResolutionScale=touch?.5:.75;
  r.outputColorSpace=THREE.SRGBColorSpace;
  r.toneMapping=THREE.ACESFilmicToneMapping;
  r.toneMappingExposure=1.02;
  r.setClearColor(0x000000,0);
  r.autoClear=true;
  st.renderer=r;st.scene=new THREE.Scene();
  st.camera3=new THREE.OrthographicCamera(-1,1,1,-1,.1,100);
  st.camera3.position.set(0,0,20);
  const hemi=new THREE.HemisphereLight(0xffffff,0x8b96a8,1.5);st.scene.add(hemi);
  const key=new THREE.DirectionalLight(0xffffff,2.7);key.position.set(-180,240,260);st.scene.add(key);
  const fill=new THREE.DirectionalLight(0xdbeafe,1.35);fill.position.set(220,60,180);st.scene.add(fill);
  const warm=new THREE.DirectionalLight(0xffd2aa,1.05);warm.position.set(40,-220,230);st.scene.add(warm);
}
function resizeRenderer(){
  if(!st.renderer||!st.viewW||!st.viewH)return;
  st.renderer.setSize(st.viewW,st.viewH,false);
  st.camera3.left=-st.viewW/2;st.camera3.right=st.viewW/2;st.camera3.top=st.viewH/2;st.camera3.bottom=-st.viewH/2;st.camera3.updateProjectionMatrix();
}
function setViewSize(w,h){
  const max=window.matchMedia?.('(pointer:coarse)')?.matches?1280:1600;
  const ratio=Math.min(max/Math.max(w,1),max/Math.max(h,1),1);
  st.viewW=Math.max(1,Math.round(w*ratio));st.viewH=Math.max(1,Math.round(h*ratio));
  canvas.width=st.viewW;canvas.height=st.viewH;resizeRenderer();
}
function disposeObject(o){
  if(!o)return;
  o.traverse(n=>{if(n.geometry)n.geometry.dispose();if(n.material){const m=Array.isArray(n.material)?n.material:[n.material];m.forEach(x=>x.dispose())}});
  o.parent?.remove(o);
}
function roundRectPath(THREE,w,h,r,ring=false){
  const s=new THREE.Shape();
  const x=w/2,y=h/2,rr=Math.min(r,Math.min(x,y)*.95);
  s.moveTo(-x+rr,y);s.lineTo(x-rr,y);s.quadraticCurveTo(x,y,x,y-rr);s.lineTo(x,-y+rr);s.quadraticCurveTo(x,-y,x-rr,-y);s.lineTo(-x+rr,-y);s.quadraticCurveTo(-x,-y,-x,-y+rr);s.lineTo(-x,y-rr);s.quadraticCurveTo(-x,y,-x+rr,y);s.closePath();
  if(ring){
    const h1=new THREE.Path();const ix=w*.82,iy=h*.78,ir=Math.max(.035,rr*.58);
    h1.moveTo(-ix/2+ir,iy/2);h1.quadraticCurveTo(-ix/2,iy/2,-ix/2,iy/2-ir);h1.lineTo(-ix/2,-iy/2+ir);h1.quadraticCurveTo(-ix/2,-iy/2,-ix/2+ir,-iy/2);h1.lineTo(ix/2-ir,-iy/2);h1.quadraticCurveTo(ix/2,-iy/2,ix/2,-iy/2+ir);h1.lineTo(ix/2,iy/2-ir);h1.quadraticCurveTo(ix/2,iy/2,ix/2-ir,iy/2);h1.closePath();s.holes.push(h1);
  }
  return s;
}
function circleRing(THREE,rx,ry){
  const s=new THREE.Shape();s.absellipse(0,0,rx,ry,0,Math.PI*2,false,0);
  const h=new THREE.Path();h.absellipse(0,0,rx*.78,ry*.78,0,Math.PI*2,true,0);s.holes.push(h);return s;
}
function catEyeRing(THREE){
  const s=new THREE.Shape();
  s.moveTo(-.60,.30);s.quadraticCurveTo(-.18,.43,.58,.30);s.quadraticCurveTo(.69,.25,.63,-.32);s.quadraticCurveTo(.30,-.43,-.10,-.34);s.quadraticCurveTo(-.48,-.40,-.63,-.12);s.quadraticCurveTo(-.69,.10,-.60,.30);s.closePath();
  const h=new THREE.Path();h.moveTo(-.48,.23);h.quadraticCurveTo(-.53,.08,-.49,-.08);h.quadraticCurveTo(-.39,-.30,-.08,-.25);h.quadraticCurveTo(.25,-.30,.50,-.22);h.quadraticCurveTo(.55,.18,.47,.24);h.quadraticCurveTo(-.15,.34,-.48,.23);h.closePath();s.holes.push(h);return s;
}
function aviatorRing(THREE){
  const s=new THREE.Shape();
  s.moveTo(-.50,.34);s.quadraticCurveTo(0,.48,.50,.34);s.quadraticCurveTo(.63,.05,.49,-.42);s.quadraticCurveTo(0,-.57,-.49,-.42);s.quadraticCurveTo(-.63,.05,-.50,.34);s.closePath();
  const h=new THREE.Path();h.moveTo(-.39,.28);h.quadraticCurveTo(-.49,.05,-.37,-.32);h.quadraticCurveTo(0,-.43,.37,-.32);h.quadraticCurveTo(.49,.05,.39,.28);h.quadraticCurveTo(0,.38,-.39,.28);h.closePath();s.holes.push(h);return s;
}
function ringShape(THREE,style){
  if(style==='round')return circleRing(THREE,.53,.53);
  if(style==='cat-eye')return catEyeRing(THREE);
  if(style==='aviator')return aviatorRing(THREE);
  return roundRectPath(THREE,1.18,.78,.16,true);
}
function lensShape(THREE,style){
  if(style==='round'){const s=new THREE.Shape();s.absellipse(0,0,.405,.405,0,Math.PI*2,false,0);return s}
  if(style==='cat-eye'){const s=new THREE.Shape();s.moveTo(-.47,.22);s.quadraticCurveTo(-.12,.33,.49,.22);s.quadraticCurveTo(.54,.12,.46,-.19);s.quadraticCurveTo(.20,-.27,-.06,-.22);s.quadraticCurveTo(-.36,-.27,-.47,-.05);s.quadraticCurveTo(-.51,.10,-.47,.22);return s}
  if(style==='aviator'){const s=new THREE.Shape();s.moveTo(-.40,.27);s.quadraticCurveTo(0,.39,.40,.27);s.quadraticCurveTo(.47,.04,.37,-.30);s.quadraticCurveTo(0,-.41,-.37,-.30);s.quadraticCurveTo(-.47,.04,-.40,.27);return s}
  return (()=>{const s=new THREE.Shape();const x=.48,y=.30,r=.10;s.moveTo(-x+r,y);s.lineTo(x-r,y);s.quadraticCurveTo(x,y,x,y-r);s.lineTo(x,-y+r);s.quadraticCurveTo(x,-y,x-r,-y);s.lineTo(-x+r,-y);s.quadraticCurveTo(-x,-y,-x,-y+r);s.lineTo(-x,y-r);s.quadraticCurveTo(-x,y,-x+r,y);s.closePath();return s})();
}
function materialFrame(THREE,color){
  return new THREE.MeshPhysicalMaterial({color,metalness:.07,roughness:.18,clearcoat:1,clearcoatRoughness:.055,specularIntensity:1,ior:1.46,side:THREE.DoubleSide});
}
function materialFrameAccent(THREE,color){
  return new THREE.MeshPhysicalMaterial({color,metalness:.03,roughness:.12,clearcoat:1,clearcoatRoughness:.04,specularIntensity:1,side:THREE.DoubleSide});
}
function materialMetal(THREE,color){
  return new THREE.MeshPhysicalMaterial({color,metalness:.98,roughness:.13,clearcoat:.48,clearcoatRoughness:.06,ior:2.0,specularIntensity:1,side:THREE.DoubleSide});
}
function materialLens(THREE,color){
  return new THREE.MeshPhysicalMaterial({color,transparent:true,opacity:.90,roughness:.055,metalness:.01,transmission:.72,thickness:.065,ior:1.52,clearcoat:.85,clearcoatRoughness:.045,side:THREE.DoubleSide,depthWrite:false,envMapIntensity:1.65});
}
function materialDetail(THREE,color){
  return new THREE.MeshStandardMaterial({color,metalness:.35,roughness:.22,envMapIntensity:1.15});
}
function ringShape(THREE,style){
  if(style==='round')return circleRing(THREE,.56,.53);
  if(style==='cat-eye')return catEyeRing(THREE);
  if(style==='aviator')return aviatorRing(THREE);
  return roundRectPath(THREE,1.20,.80,.17,true);
}
function lensShape(THREE,style){
  if(style==='round'){const s=new THREE.Shape();s.absellipse(0,0,.405,.392,0,Math.PI*2,false,0);return s}
  if(style==='cat-eye'){const s=new THREE.Shape();s.moveTo(-.47,.22);s.quadraticCurveTo(-.12,.33,.49,.22);s.quadraticCurveTo(.55,.12,.46,-.19);s.quadraticCurveTo(.20,-.28,-.06,-.22);s.quadraticCurveTo(-.36,-.27,-.47,-.05);s.quadraticCurveTo(-.51,.10,-.47,.22);s.closePath();return s}
  if(style==='aviator'){const s=new THREE.Shape();s.moveTo(-.40,.27);s.quadraticCurveTo(0,.39,.40,.27);s.quadraticCurveTo(.47,.04,.37,-.30);s.quadraticCurveTo(0,-.41,-.37,-.30);s.quadraticCurveTo(-.47,.04,-.40,.27);s.closePath();return s}
  const s=new THREE.Shape(),x=.48,y=.30,r=.10;s.moveTo(-x+r,y);s.lineTo(x-r,y);s.quadraticCurveTo(x,y,x,y-r);s.lineTo(x,-y+r);s.quadraticCurveTo(x,-y,x-r,-y);s.lineTo(-x+r,-y);s.quadraticCurveTo(-x,-y,-x,-y+r);s.lineTo(-x,y-r);s.quadraticCurveTo(-x,y,-x+r,y);s.closePath();return s
}
function lensShell(THREE,shape,material){
  const geo=new THREE.ExtrudeGeometry(shape,{depth:.035,steps:1,bevelEnabled:true,bevelSegments:2,bevelSize:.012,bevelThickness:.014,curveSegments:48});
  const mesh=new THREE.Mesh(geo,material);mesh.position.z=.14;return mesh
}
function curvedBridge(THREE,style,material){
  const z=.08,curve=new THREE.CatmullRomCurve3([new THREE.Vector3(-.42,0,z),new THREE.Vector3(-.16,.06,z+.015),new THREE.Vector3(0,.085,z+.02),new THREE.Vector3(.16,.06,z+.015),new THREE.Vector3(.42,0,z)],false,'catmullrom',.42);
  return new THREE.Mesh(new THREE.TubeGeometry(curve,28,style==='aviator'?.035:.044,10,false),material);
}
function createRim(THREE,shape,material){
  const geo=new THREE.ExtrudeGeometry(shape,{depth:.145,steps:1,bevelEnabled:true,bevelSegments:4,bevelSize:.032,bevelThickness:.032,curveSegments:48});
  return new THREE.Mesh(geo,material);
}
function createInnerLip(THREE,shape,material){
  const geo=new THREE.ExtrudeGeometry(shape,{depth:.048,steps:1,bevelEnabled:true,bevelSegments:2,bevelSize:.015,bevelThickness:.014,curveSegments:48});
  const m=new THREE.Mesh(geo,material);m.position.set(0,0,.13);m.scale.set(.88,.88,1);return m;
}
function addTemple(THREE,root,cfg,fm,mm,side){
  const y=-.005,z=-.012,x=side*(cfg.sep/2+.68);
  const main=new THREE.Mesh(new THREE.BoxGeometry(.98,.12,.12),fm);
  main.position.set(side*(cfg.sep/2+.98),y,z);main.scale.x=side;root.add(main);
  const taper=new THREE.Mesh(new THREE.CylinderGeometry(.060,.072,.26,16),fm);
  taper.rotation.z=Math.PI/2;taper.position.set(side*(cfg.sep/2+1.52),y,z);taper.scale.x=side;root.add(taper);
  const hinge=new THREE.Mesh(new THREE.TorusGeometry(.09,.028,10,24),mm);
  hinge.rotation.y=Math.PI/2;hinge.position.set(x,0,.02);root.add(hinge);
  const screw=new THREE.Mesh(new THREE.CylinderGeometry(.026,.026,.20,16),mm);
  screw.rotation.z=Math.PI/2;screw.position.set(x,0,.10);root.add(screw);
  const accent=new THREE.Mesh(new THREE.BoxGeometry(.44,.035,.035),materialDetail(THREE,0x8b8f97));
  accent.position.set(side*(cfg.sep/2+1.18),-.055,.052);accent.scale.x=side;root.add(accent);
}
function addNosePad(THREE,root,side,mm){
  const pad=new THREE.Mesh(new THREE.CapsuleGeometry(.048,.085,5,12),mm);pad.rotation.z=Math.PI/2;pad.rotation.x=-.22;
  pad.position.set(side*.13,-.40,.115);pad.scale.set(1.15,.72,.64);root.add(pad);
  const arm=new THREE.Mesh(new THREE.CylinderGeometry(.018,.018,.17,10),mm);arm.rotation.z=Math.PI/2;arm.position.set(side*.08,-.33,.10);root.add(arm);
}
function buildGlasses(THREE,style,color){
  const p=PALETTES[color]||PALETTES['#111827'],cfg=STYLES[style]||STYLES.classic,root=new THREE.Group();
  const fm=materialFrame(THREE,p.frame),fa=materialFrameAccent(THREE,new THREE.Color(p.frame).offsetHSL(0,0,.05)),mm=materialMetal(THREE,p.metal),lm=materialLens(THREE,p.lens);
  const outer=ringShape(THREE,style);
  const left=createRim(THREE,outer,fm),right=createRim(THREE,outer,fm.clone());
  left.position.x=-cfg.sep/2;right.position.x=cfg.sep/2;root.add(left,right);
  const inner=createInnerLip(THREE,outer,fa),innerR=inner.clone();inner.position.x=-cfg.sep/2;innerR.position.x=cfg.sep/2;root.add(inner,innerR);
  const lensShapeG=lensShape(THREE,style);
  const lensL=lensShell(THREE,lensShapeG,lm),lensR=lensShell(THREE,lensShapeG,lm.clone());lensL.position.x=-cfg.sep/2;lensR.position.x=cfg.sep/2;root.add(lensL,lensR);
  const bridge=curvedBridge(THREE,style,mm);root.add(bridge);
  for(const side of [-1,1])addTemple(THREE,root,cfg,fm,mm,side);
  addNosePad(THREE,root,-1,mm);addNosePad(THREE,root,1,mm);
  if(style==='aviator'){
    const bar=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,cfg.sep*1.15,16),mm);bar.rotation.z=Math.PI/2;bar.position.y=.31;bar.position.z=.10;root.add(bar);
    const cross=new THREE.Mesh(new THREE.TorusGeometry(.065,.018,8,18),mm);cross.rotation.x=Math.PI/2;cross.position.set(0,.18,.13);root.add(cross);
  }
  const badge=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,.12,12),mm);badge.rotation.z=Math.PI/2;badge.position.set(-cfg.sep/2-.03,-.30,.15);root.add(badge);
  root.traverse(o=>{if(o.isMesh){o.frustumCulled=false;o.castShadow=false;o.receiveShadow=false}});
  root.renderOrder=20;root.userData={materials:{fm,fa,mm,lm},cfg};
  return root;
}
async function loadEyewearModel(modelId){
  const spec=EYEWEAR.find(x=>x.id===modelId)||EYEWEAR[0];
  if(!st.loader||!st.THREE)return;
  if(st.modelId===spec.id&&st.glasses)return;
  if(st.modelLoading)return;
  st.modelId=spec.id;st.style=spec.style;st.color=spec.frame;st.modelLoading=true;
  if(st.glasses)disposeObject(st.glasses);
  st.glasses=null;
  pill('LOADING FRAME','busy');msg(`Loading ${spec.family} ${spec.code}…`);
  try{
    const gltf=await new Promise((resolve,reject)=>st.loader.load(spec.url,resolve,undefined,reject));
    const root=gltf.scene;
    root.traverse(o=>{
      if(!o.isMesh)return;
      o.frustumCulled=false;o.renderOrder=20;
      const mats=Array.isArray(o.material)?o.material:[o.material];
      mats.forEach(m=>{
        m.side=st.THREE.DoubleSide;
        if(m.transparent||/lens|glass/i.test(m.name||'')){
          m.transparent=true;m.depthWrite=false;m.opacity=Math.min(1,Math.max(.30,m.opacity??.82));
          m.roughness=.07;m.metalness=.01;
          if(m.color)m.color.setHex(spec.lens);
          if('envMapIntensity' in m)m.envMapIntensity=1.55;
        }else if(m.metalness>.65||/metal|chrome|steel|hinge|screw/i.test(m.name||'')){
          m.metalness=.94;m.roughness=.12;
        }else{
          if(m.color)m.color.set(spec.frame);
          m.roughness=.15;m.metalness=.05;
          if('clearcoat' in m)m.clearcoat=.92;
          if('clearcoatRoughness' in m)m.clearcoatRoughness=.05;
        }
      });
    });
    const box=new st.THREE.Box3().setFromObject(root),size=box.getSize(new st.THREE.Vector3());
    const width=Math.max(size.x,.0001);
    root.position.sub(box.getCenter(new st.THREE.Vector3()));
    const canonical=.134;
    root.scale.setScalar(canonical/width);
    const scaled=new st.THREE.Box3().setFromObject(root),scaledSize=scaled.getSize(new st.THREE.Vector3());
    st.modelWidth=Math.max(scaledSize.x,.0001);
    st.glasses=root;st.scene.add(root);st.model=spec;root.visible=!!st.detected;
    setColor();updateModelCards();
    pill(st.detected?'FACE FIT READY':'FRAME READY','ready');
    msg(st.detected?'Premium 3D eyewear fitted automatically.':`${spec.family} ${spec.code} ready.`,'success');
  }catch(e){
    msg('This eyewear model could not load. Retrying with the NexusNova fallback.','error');pill('MODEL UNAVAILABLE','error');
    if(spec.id!=='nx-ac-obsidian')try{await loadEyewearModel('nx-ac-obsidian')}catch(_){}
    else throw e;
  }finally{st.modelLoading=false}
}
function setStyle(){
  const candidates=EYEWEAR.filter(x=>x.style===st.style);
  const current=candidates.find(x=>x.id===st.modelId)||candidates[0];
  if(current)loadEyewearModel(current.id).catch(()=>{});
}
function setColor(){
  if(!st.glasses)return;
  const spec=EYEWEAR.find(x=>x.id===st.modelId);
  const p=PALETTES[st.color]||PALETTES['#111827'];
  st.glasses.traverse(o=>{
    if(!o.isMesh)return;
    const mats=Array.isArray(o.material)?o.material:[o.material];
    mats.forEach(m=>{
      if(m.transparent||/lens|glass/i.test(m.name||'')){m.color?.setHex(spec?.lens||p.lens)}
      else if(m.metalness>.65||/metal|chrome|steel|hinge|screw/i.test(m.name||'')){m.metalness=.92}
      else m.color?.set(spec?.frame||st.color)
    });
  });
}
function updateModelCards(){
  $$('[data-model-id]').forEach(b=>{const on=b.dataset.modelId===st.modelId;b.classList.toggle('is-active',on);b.setAttribute('aria-selected',on?'true':'false')});
}
async function initThree(){
  if(st.threeReady)return;
  if(!WEBGL_AVAILABLE)throw new Error('WebGL is unavailable on this device/browser.');
  eng('Preparing NexusNova 3D renderer','busy');pill('STARTING 3D','busy');
  const THREE=await import('three');
  const {GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js');
  st.THREE=THREE;window.THREE=THREE;st.loader=new GLTFLoader();
  makeRenderer(THREE);st.threeReady=true;
  await loadEyewearModel(st.modelId||'nx-ac-obsidian');
  st.renderer.compileAsync?.(st.scene,st.camera3).catch(()=>{});
  eng('NexusNova luxury eyewear ready','ready');pill('READY','ready');
}
function render3D(){
  if(!st.threeReady||!st.renderer)return;
  st.renderer.clear(true,true,true);
  st.renderer.render(st.scene,st.camera3);
}
function fitGlasses(pts,w,h,mir){
  if(!pts||!st.glasses)return;
  const P=i=>{const q=pts[i];return q?{x:(mir?1-q.x:q.x)*w,y:q.y*h,z:q.z||0}:null};
  const ro=P(L.ro),ri=P(L.ri),li=P(L.li),lo=P(L.lo),rt=P(L.rt),rb=P(L.rb),lt=P(L.lt),lb=P(L.lb);
  if(!ro||!ri||!li||!lo)return;
  const A=mid(ro,ri),B=mid(lo,li),eyes=[A,B].sort((a,b)=>a.x-b.x),le=eyes[0],re=eyes[1];
  const ipd=dist(le,re),angle=Math.atan2(re.y-le.y,re.x-le.x);
  const eyeHeight=Math.max(ipd*.18,((rt&&rb?dist(rt,rb):ipd*.22)+(lt&&lb?dist(lt,lb):ipd*.22))*.5);
  const yaw=clamp((le.z-re.z)/.085,-.72,.72),pitch=clamp(((re.z+le.z)*.5)*.72,-.28,.28);
  const fitScale=ipd/Math.max(st.modelWidth,.0001);
  const centerY=(le.y+re.y)*.5+eyeHeight*.02;
  st.glasses.position.set((le.x+re.x)*.5-w/2,h/2-centerY,0);
  st.glasses.scale.setScalar(fitScale);
  st.glasses.rotation.set(pitch,-yaw*.36,-angle);
  st.glasses.visible=true;
}
function clearGlasses(){if(st.glasses){st.glasses.visible=false}}
function applyDetection(result){
  const pts=result?.faceLandmarks?.[0]||null;
  st.face=pts;
  st.detected=!!pts;
  if(stage)stage.dataset.face=st.detected?'true':'false';
  if(st.detected){
    fitGlasses(st.face,canvas.width,canvas.height,st.source==='camera');
    faceMsg('FACE LOCKED · 3D FIT',true,true);pill(st.source==='camera'?'FACE LOCKED':'FACE DETECTED','ready');
    msg(st.source==='camera'?'Face locked. Premium 3D eyewear is tracking live.':'Face detected. Premium 3D glasses automatically fitted.','success');
    scanUi(100,'FACE SCAN COMPLETE');
  }else{
    clearGlasses();faceMsg('FACE NOT DETECTED',true,false);pill('SEARCHING FOR FACE','busy');
    msg(st.source==='camera'?'Center your face inside the green scan frame.':'No clear face found in this image. Please use a front-facing portrait.','');
    if(st.source==='image')scanUi(70,'SCANNING IMAGE');
  }
}
function prepareDetectionCanvas(w,h,source){
  const ratio=Math.min(st.detW/Math.max(w,1),st.detH/Math.max(h,1),1);
  const dw=Math.max(1,Math.round(w*ratio)),dh=Math.max(1,Math.round(h*ratio));
  const c=prepareDetectionCanvas.canvas||(prepareDetectionCanvas.canvas=document.createElement('canvas'));c.width=dw;c.height=dh;
  const cc=c.getContext('2d',{alpha:false});
  cc.drawImage(source,0,0,dw,dh);return c;
}

async function loadImage(file){
  stop(st.stream);st.stream=null;video.pause();video.srcObject=null;
  if(st.raf)cancelAnimationFrame(st.raf);st.raf=0;
  st.source='none';st.face=null;st.detected=false;resetScan();clearGlasses();
  if(st.url)URL.revokeObjectURL(st.url);
  const u=URL.createObjectURL(file);st.url=u;
  try{
    eng('Preparing portrait','busy');pill('PREPARING IMAGE','busy');msg('Loading portrait for automatic 3D fitting…');
    const img=new Image();img.decoding='async';img.src=u;
    await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(new Error('The browser could not decode this image.'))});
    st.image=img;st.source='image';st.nativeW=img.naturalWidth;st.nativeH=img.naturalHeight;setViewSize(st.nativeW,st.nativeH);res(st.nativeW,st.nativeH);
    stage.dataset.camera='false';stage.dataset.image='true';stage.dataset.face='false';imagePreview.src=u;
    empty.hidden=true;cameraToggle.textContent='LIVE CAMERA';exportBtn.disabled=false;faceMsg('ANALYZING FACE',true,false);scanUi(12,'SCANNING IMAGE');
    await Promise.all([vision.init(),initThree()]);resizeRenderer();
    const detector=prepareDetectionCanvas(img.naturalWidth,img.naturalHeight,img);
    const result=await vision.image(detector);applyDetection(result);if(!st.glasses)await loadEyewearModel(st.modelId||'nx-ac-obsidian');if(st.face&&st.detected)fitGlasses(st.face,st.nativeW||canvas.width,st.nativeH||canvas.height,false);render3D();
  }catch(e){
    st.source='none';exportBtn.disabled=true;empty.hidden=false;stage.dataset.image='false';resetScan();eng('Vision engine error','error');pill('IMAGE SCAN ERROR','error');msg(e?.message||'Unable to scan this image.','error');
  }
}

async function camera(){
  if(st.source==='camera'){
    stop(st.stream);st.stream=null;video.pause();video.srcObject=null;st.source='none';st.face=null;st.detected=false;clearGlasses();
    if(st.raf)cancelAnimationFrame(st.raf);st.raf=0;if(st.scanTimer)cancelAnimationFrame(st.scanTimer);st.scanTimer=0;
    stage.dataset.camera='false';stage.dataset.face='false';stage.dataset.image='false';empty.hidden=false;exportBtn.disabled=true;cameraToggle.textContent='LIVE CAMERA';resetScan();
    faceMsg('',false,false);pill('READY','ready');msg('Live camera stopped.');render3D();return;
  }

  try{
    if(!window.isSecureContext)throw new Error('Live camera requires a secure HTTPS page.');
    if(!navigator.mediaDevices?.getUserMedia)throw new Error('This browser does not expose camera access.');

    st.image=null;st.face=null;st.detected=false;
    if(st.raf)cancelAnimationFrame(st.raf);st.raf=0;
    if(st.scanTimer)cancelAnimationFrame(st.scanTimer);st.scanTimer=0;
    eng('Opening camera','busy');pill('STARTING CAMERA','busy');msg('Opening your camera…');

    // Deliberately request only the camera. Mobile browsers negotiate their own
    // supported resolution/facing mode instead of rejecting our preferred mode.
    const stream=await navigator.mediaDevices.getUserMedia({video:true,audio:false});

    st.stream=stream;st.source='camera';st.mirror=true;
    video.muted=true;video.autoplay=true;video.playsInline=true;video.setAttribute('playsinline','');video.setAttribute('autoplay','');video.srcObject=stream;

    // Make the video visible before asking it to play. Keeping it display:none
    // during startup is unreliable on some mobile WebView/Chrome combinations.
    stage.dataset.camera='true';stage.dataset.image='false';stage.dataset.face='false';
    empty.hidden=true;exportBtn.disabled=false;cameraToggle.textContent='STOP CAMERA';
    faceMsg('SEARCHING FOR FACE',true,false);pill('CAMERA LIVE','busy');scanUi(4,'STARTING FACE SCAN');

    const syncVideoSize=()=>{
      const vw=video.videoWidth||stream.getVideoTracks?.()[0]?.getSettings?.().width||1280;
      const vh=video.videoHeight||stream.getVideoTracks?.()[0]?.getSettings?.().height||720;
      if(vw&&vh){
        st.nativeW=vw;st.nativeH=vh;setViewSize(vw,vh);res(vw,vh);
      }
    };
    video.addEventListener('loadedmetadata',syncVideoSize,{once:true});
    video.addEventListener('loadeddata',syncVideoSize,{once:true});
    syncVideoSize();

    st.lastDetect=0;st.busy=false;beginScan();cameraLoop();

    // Do not gate camera state on play(). It is enough to attach the live
    // stream now; play failures are surfaced while the stream remains open.
    video.play().catch(()=>{
      if(st.source==='camera'){
        msg('Camera permission is active, but video playback was blocked. Tap LIVE CAMERA once more.','error');
      }
    });

    // Face vision and 3D are secondary and cannot prevent camera startup.
    vision.init().then(()=>vision.setMode('VIDEO')).then(()=>{
      if(st.source!=='camera')return;
      eng(`Live vision ready · ${vision.delegate}`,'ready');pill('SCANNING','busy');msg('Camera live. Center your face inside the green scan frame.');
      return initThree().catch(()=>{});
    }).catch(()=>{
      if(st.source!=='camera')return;
      eng('Camera live · face scan unavailable','error');pill('CAMERA LIVE','ready');
      msg('Camera is live. Face scanning is unavailable on this device right now.','error');
    });

    const track=stream.getVideoTracks?.()[0];
    track?.addEventListener?.('ended',()=>{
      if(st.source==='camera'){
        stop(st.stream);st.stream=null;st.source='none';video.pause();video.srcObject=null;
        stage.dataset.camera='false';stage.dataset.face='false';empty.hidden=false;cameraToggle.textContent='LIVE CAMERA';exportBtn.disabled=true;resetScan();
        faceMsg('',false,false);pill('CAMERA ENDED','error');eng('Camera ended','error');msg('The camera stream ended. Reopen LIVE CAMERA to restart it.','error');
      }
    },{once:true});
  }catch(e){
    stop(st.stream);st.stream=null;st.source='none';st.face=null;st.detected=false;clearGlasses();
    video.pause();video.srcObject=null;
    stage.dataset.camera='false';stage.dataset.face='false';stage.dataset.image='false';empty.hidden=false;
    cameraToggle.textContent='LIVE CAMERA';exportBtn.disabled=true;resetScan();faceMsg('',false,false);
    const n=e?.name||'';
    msg(n==='NotAllowedError'||n==='PermissionDeniedError'?'Camera permission was denied.':
      n==='NotFoundError'?'No camera was found.':
      n==='NotReadableError'?'The camera is already in use by another app or browser tab.':
      n==='OverconstrainedError'?'This camera does not support the requested mode.':
      e?.message||'Unable to start camera.','error');
    pill('CAMERA ERROR','error');eng('Camera unavailable','error');
  }
}
function cameraLoop(){
  if(st.source!=='camera')return;
  if(video.readyState>=2){
    const vw=video.videoWidth||1280,vh=video.videoHeight||720;
    if(st.nativeW!==vw||st.nativeH!==vh){
      st.nativeW=vw;st.nativeH=vh;setViewSize(vw,vh);res(vw,vh);
    }
    const now=performance.now(),interval=window.matchMedia?.('(pointer:coarse)')?.matches?420:240;
    if(!st.busy&&now-st.lastDetect>=interval&&vision.landmarker){
      st.busy=true;st.lastDetect=now;
      try{
        const detector=prepareDetectionCanvas(vw,vh,video);
        const result=vision.landmarker.detectForVideo(detector,now);
        applyDetection(result);
      }catch(e){
        msg(e?.message||'Live face tracking failed.','error');pill('TRACKING ERROR','error');
      }finally{st.busy=false}
    }
    if(st.face&&st.detected){
      if(st.glasses)fitGlasses(st.face,st.nativeW,st.nativeH,true);
      else if(st.threeReady&&!st.modelLoading)loadEyewearModel(st.modelId||'nx-ac-obsidian').catch(()=>{});
    }
    render3D();
  }
  if(st.source==='camera'&&document.visibilityState!=='hidden')st.raf=requestAnimationFrame(cameraLoop);
}
function exportPng(){
  if(st.source==='none'||!st.renderer)return;
  render3D();
  const out=document.createElement('canvas'),w=st.source==='camera'?video.videoWidth:st.image.naturalWidth,h=st.source==='camera'?video.videoHeight:st.image.naturalHeight;out.width=w;out.height=h;
  const o=out.getContext('2d',{alpha:false});
  o.fillStyle='#fff';o.fillRect(0,0,w,h);
  o.save();
  if(st.source==='camera'){o.translate(w,0);o.scale(-1,1);o.drawImage(video,0,0,w,h);o.restore();o.drawImage(canvas,0,0,w,h)}
  else{o.drawImage(st.image,0,0,w,h);o.drawImage(canvas,0,0,w,h)}
  o.restore?.();
  out.toBlob(b=>{if(!b)return;const u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download='nexusnova-premium-glasses-try-on.png';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);msg(`PNG exported at ${w.toLocaleString()} × ${h.toLocaleString()}px.`,'success')},'image/png');
}
function syncStyles(){styles.forEach(b=>{const on=b.dataset.style===st.style;b.classList.toggle('is-active',on);b.setAttribute('aria-pressed',on?'true':'false')})}
function syncColors(){colors.forEach(b=>{const on=b.dataset.color.toUpperCase()===st.color.toUpperCase();b.classList.toggle('is-active',on);b.setAttribute('aria-pressed',on?'true':'false')})}

imageInput.onchange=()=>{const f=imageInput.files?.[0];if(f)loadImage(f)};
$('[data-model-id]').forEach(b=>b.onclick=async()=>{
  const id=b.dataset.modelId;
  try{await initThree();pill('LOADING FRAME','busy');msg(`Loading ${b.dataset.modelId}…`);await loadEyewearModel(id);if(st.face&&st.detected)fitGlasses(st.face,st.nativeW||canvas.width,st.nativeH||canvas.height,st.source==='camera');render3D();pill('FACE FIT READY','ready');msg('NexusNova eyewear fitted automatically.','success')}catch(_){}
});

window.__NexusNovaTryOnMainReady=true;window.__NexusNovaTryOnCamera=camera;
cameraToggle.onclick=()=>camera();exportBtn.onclick=exportPng;
styles.forEach(b=>b.onclick=()=>{st.style=b.dataset.style;syncStyles();setStyle();if(st.face&&st.detected)fitGlasses(st.face,canvas.width,canvas.height,st.source==='camera');render3D()});
colors.forEach(b=>b.onclick=()=>{st.color=b.dataset.color;syncColors();setColor();render3D()});
document.addEventListener('visibilitychange',()=>{if(st.source==='camera'&&document.visibilityState==='visible')requestAnimationFrame(cameraLoop)});
window.addEventListener('resize',resizeRenderer);
window.addEventListener('beforeunload',()=>{stop(st.stream);vision.dispose();if(st.url)URL.revokeObjectURL(st.url);try{st.renderer?.dispose()}catch(_){}});
eng(WEBGL_AVAILABLE?'Ready for premium eyewear':'Camera-ready · 3D renderer unavailable','ready');
pill('READY','ready');msg('Upload a portrait or activate live camera.');syncStyles();syncColors();
// Vision and 3D initialize on demand so live camera startup stays independent of model/network loading.
})();