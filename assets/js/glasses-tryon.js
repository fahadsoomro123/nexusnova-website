(()=>{
'use strict';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const canvas=$('[data-canvas]'),ctx=canvas?.getContext('webgl2',{alpha:true,antialias:true,preserveDrawingBuffer:true})||canvas?.getContext('webgl',{alpha:true,antialias:true,preserveDrawingBuffer:true});
const video=$('[data-video]'),imagePreview=$('[data-image-preview]'),stage=$('[data-stage]');
if(!canvas||!ctx||!video)return;

const imageInput=$('[data-image-input]'),cameraToggle=$('[data-camera-toggle]'),exportBtn=$('[data-export]');
const empty=$('[data-empty-state]'),status=$('[data-status]'),detectPill=$('[data-detection-status]'),resolution=$('[data-resolution]');
const faceStatus=$('[data-face-status]'),engine=$('[data-engine-state]'),engineLine=$('.vg-engine-line');
const scanPanel=$('[data-scan-panel]'),scanProgress=$('[data-scan-progress]'),scanPercent=$('[data-scan-percent]'),scanLabel=$('[data-scan-label]');
const styles=$$('[data-style]'),colors=$$('[data-color]');

const THREE_URL='https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js';
const MP_URL='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35';
const MP_WASM='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm';
const MP_MODEL='https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

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
const st={source:'none',image:null,url:null,stream:null,style:'classic',color:'#111827',face:null,detected:false,busy:false,lastDetect:0,raf:0,scanStart:0,scanTimer:0,detW:320,detH:180,threeReady:false,scene:null,camera3:null,renderer:null,mediaTexture:null,glasses:null,glassMeta:null};

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
  const r=new THREE.WebGLRenderer({canvas,context:ctx,alpha:true,antialias:true,preserveDrawingBuffer:true});
  r.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
  r.outputColorSpace=THREE.SRGBColorSpace;
  r.toneMapping=THREE.ACESFilmicToneMapping;
  r.toneMappingExposure=1.04;
  st.renderer=r;
  st.scene=new THREE.Scene();
  st.camera3=new THREE.OrthographicCamera(-1,1,1,-1,.1,1000);
  st.camera3.position.set(0,0,50);
  st.scene.add(new THREE.HemisphereLight(0xffffff,0xcbd5e1,2.1));
  const key=new THREE.DirectionalLight(0xffffff,3.0);key.position.set(-220,260,300);st.scene.add(key);
  const fill=new THREE.DirectionalLight(0xbfd7ff,1.8);fill.position.set(260,80,220);st.scene.add(fill);
  const rim=new THREE.DirectionalLight(0xffd8a8,1.4);rim.position.set(0,-230,260);st.scene.add(rim);
  resizeRenderer();
}
function resizeRenderer(){
  if(!st.renderer||!canvas.width||!canvas.height)return;
  const w=canvas.width,h=canvas.height;
  st.renderer.setSize(w,h,false);
  st.camera3.left=-w/2;st.camera3.right=w/2;st.camera3.top=h/2;st.camera3.bottom=-h/2;st.camera3.updateProjectionMatrix();
}
function disposeObject(o){
  if(!o)return;
  o.traverse(n=>{if(n.geometry)n.geometry.dispose();if(n.material){const m=Array.isArray(n.material)?n.material:[n.material];m.forEach(x=>x.dispose())}});
  o.parent?.remove(o);
}
function roundRectPath(THREE,w,h,r,outer=true){
  const s=new THREE.Shape();
  const x=w/2,y=h/2,rr=Math.min(r,Math.min(x,y)*.95);
  s.moveTo(-x+rr,y);s.lineTo(x-rr,y);s.quadraticCurveTo(x,y,x,y-rr);s.lineTo(x,-y+rr);s.quadraticCurveTo(x,-y,x-rr,-y);s.lineTo(-x+rr,-y);s.quadraticCurveTo(-x,-y,-x,-y+rr);s.lineTo(-x,y-rr);s.quadraticCurveTo(-x,y,-x+rr,y);s.closePath();
  if(!outer){
    const h1=new THREE.Path();const ix=w*.82,iy=h*.78,ir=Math.max(.035,rr*.58);
    h1.moveTo(-ix/2+ir,iy/2);h1.lineTo(ix/2-ir,iy/2);h1.quadraticCurveTo(ix/2,iy/2,ix/2,iy/2-ir);h1.lineTo(ix/2,-iy/2+ir);h1.quadraticCurveTo(ix/2,-iy/2,ix/2-ir,-iy/2);h1.lineTo(-ix/2+ir,-iy/2);h1.quadraticCurveTo(-ix/2,-iy/2,-ix/2,-iy/2+ir);h1.lineTo(-ix/2,iy/2-ir);h1.quadraticCurveTo(-ix/2,iy/2,-ix/2+ir,iy/2);h1.closePath();s.holes.push(h1);
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
  const h=new THREE.Path();h.moveTo(-.48,.23);h.quadraticCurveTo(-.15,.34,.47,.24);h.quadraticCurveTo(.55,.18,.50,-.22);h.quadraticCurveTo(.25,-.30,-.08,-.25);h.quadraticCurveTo(-.39,-.30,-.49,-.08);h.quadraticCurveTo(-.53,.08,-.48,.23);h.closePath();s.holes.push(h);return s;
}
function aviatorRing(THREE){
  const s=new THREE.Shape();
  s.moveTo(-.50,.34);s.quadraticCurveTo(0,.48,.50,.34);s.quadraticCurveTo(.63,.05,.49,-.42);s.quadraticCurveTo(0,-.57,-.49,-.42);s.quadraticCurveTo(-.63,.05,-.50,.34);s.closePath();
  const h=new THREE.Path();h.moveTo(-.39,.28);h.quadraticCurveTo(0,.38,.39,.28);h.quadraticCurveTo(.49,.05,.37,-.32);h.quadraticCurveTo(0,-.43,-.37,-.32);h.quadraticCurveTo(-.49,.05,-.39,.28);h.closePath();s.holes.push(h);return s;
}
function ringShape(THREE,style){
  if(style==='round')return circleRing(THREE,.53,.53);
  if(style==='cat-eye')return catEyeRing(THREE);
  if(style==='aviator')return aviatorRing(THREE);
  return roundRectPath(THREE,1.18,.78,.16);
}
function lensShape(THREE,style){
  if(style==='round'){const s=new THREE.Shape();s.absellipse(0,0,.405,.405,0,Math.PI*2,false,0);return s}
  if(style==='cat-eye'){const s=new THREE.Shape();s.moveTo(-.47,.22);s.quadraticCurveTo(-.12,.33,.49,.22);s.quadraticCurveTo(.54,.12,.46,-.19);s.quadraticCurveTo(.20,-.27,-.06,-.22);s.quadraticCurveTo(-.36,-.27,-.47,-.05);s.quadraticCurveTo(-.51,.10,-.47,.22);return s}
  if(style==='aviator'){const s=new THREE.Shape();s.moveTo(-.40,.27);s.quadraticCurveTo(0,.39,.40,.27);s.quadraticCurveTo(.47,.04,.37,-.30);s.quadraticCurveTo(0,-.41,-.37,-.30);s.quadraticCurveTo(-.47,.04,-.40,.27);return s}
  return (()=>{const s=new THREE.Shape();const x=.48,y=.30,r=.10;s.moveTo(-x+r,y);s.lineTo(x-r,y);s.quadraticCurveTo(x,y,x,y-r);s.lineTo(x,-y+r);s.quadraticCurveTo(x,-y,x-r,-y);s.lineTo(-x+r,-y);s.quadraticCurveTo(-x,-y,-x,-y+r);s.lineTo(-x,y-r);s.quadraticCurveTo(-x,y,-x+r,y);s.closePath();return s})();
}
function materialFrame(THREE,color){
  return new THREE.MeshPhysicalMaterial({color,metalness:.04,roughness:.24,clearcoat:.82,clearcoatRoughness:.1,specularIntensity:1});
}
function materialMetal(THREE,color){
  return new THREE.MeshPhysicalMaterial({color,metalness:.92,roughness:.18,clearcoat:.36,clearcoatRoughness:.08});
}
function materialLens(THREE,color){
  return new THREE.MeshPhysicalMaterial({color,transparent:true,opacity:.28,roughness:.08,metalness:.02,transmission:.28,thickness:.04,clearcoat:.7,clearcoatRoughness:.08,side:THREE.DoubleSide,depthWrite:false});
}
function templeShape(THREE,length,height){
  const s=roundRectPath(THREE,length,height,height*.32);
  return new THREE.ExtrudeGeometry(s,{depth:.12,steps:1,bevelEnabled:true,bevelSegments:2,bevelSize:.025,bevelThickness:.025});
}
function buildGlasses(THREE,style,color){
  const p=PALETTES[color]||PALETTES['#111827'],cfg=STYLES[style],root=new THREE.Group();
  const fm=materialFrame(THREE,p.frame),mm=materialMetal(THREE,p.metal),lm=materialLens(THREE,p.lens);
  const ringGeoSettings={depth:.13,steps:1,bevelEnabled:true,bevelSegments:3,bevelSize:.025,bevelThickness:.035,curveSegments:32};
  const ring=ringShape(THREE,style);
  const ringGeo=new THREE.ExtrudeGeometry(ring,ringGeoSettings);
  const left=new THREE.Mesh(ringGeo,fm),right=new THREE.Mesh(ringGeo.clone(),fm);left.position.x=-cfg.sep/2;right.position.x=cfg.sep/2;root.add(left,right);
  const lensG=new THREE.ShapeGeometry(lensShape(THREE,style),48);
  const lensL=new THREE.Mesh(lensG,lm),lensR=new THREE.Mesh(lensG.clone(),lm);lensL.position.set(-cfg.sep/2,0,.09);lensR.position.set(cfg.sep/2,0,.09);root.add(lensL,lensR);
  const bridge=new THREE.Mesh(new THREE.CylinderGeometry(cfg.bridge,cfg.bridge,cfg.sep*.62,18),mm);bridge.rotation.z=Math.PI/2;bridge.position.z=.075;root.add(bridge);
  const hingeGeo=new THREE.CylinderGeometry(.105,.105,.17,18);
  for(const side of [-1,1]){
    const x=side*(cfg.sep/2+.58);const hinge=new THREE.Mesh(hingeGeo,mm);hinge.rotation.x=Math.PI/2;hinge.position.set(x,0,.04);root.add(hinge);
    const screwGeo=new THREE.CylinderGeometry(.028,.028,.185,12);
    const screw=new THREE.Mesh(screwGeo,mm);screw.rotation.x=Math.PI/2;screw.position.set(x,0,.14);root.add(screw);
    const temple=new THREE.Mesh(templeShape(THREE,.88,.12),fm);temple.position.set(side*(cfg.sep/2+.98),-.015,-.02);temple.scale.x=side;root.add(temple);
    const tip=new THREE.Mesh(templeShape(THREE,.34,.115),fm);tip.position.set(side*(cfg.sep/2+1.57),-.015,-.02);tip.scale.x=side*.93;root.add(tip);
    const pad=new THREE.Mesh(new THREE.SphereGeometry(.082,16,12),mm);pad.scale.set(1.35,.58,.48);pad.position.set(side*.07,-.39,.12);root.add(pad);
  }
  if(style==='aviator'){
    const topbar=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,cfg.sep*1.15,14),mm);topbar.rotation.z=Math.PI/2;topbar.position.y=.31;topbar.position.z=.07;root.add(topbar);
  }
  const cheekL=new THREE.Mesh(new THREE.SphereGeometry(.032,10,8),mm);cheekL.position.set(-cfg.sep/2,-.29,.14);root.add(cheekL);
  const cheekR=cheekL.clone();cheekR.position.x=cfg.sep/2;root.add(cheekR);
  root.userData={materials:{fm,mm,lm},cfg};
  return root;
}
function setStyle(){
  if(!st.threeReady)return;
  if(st.glasses)disposeObject(st.glasses);
  st.glasses=buildGlasses(window.THREE,st.style,st.color);
  st.scene.add(st.glasses);
}
function setColor(){
  if(!st.glasses)return;
  const p=PALETTES[st.color]||PALETTES['#111827'],m=st.glasses.userData.materials;
  m.fm.color.setHex(p.frame);m.mm.color.setHex(p.metal);m.lm.color.setHex(p.lens);
}

async function initThree(){
  if(st.threeReady)return;
  const THREE=await import(THREE_URL);
  window.THREE=THREE;
  makeRenderer(THREE);
  setStyle();st.threeReady=true;
  eng(`3D eyewear engine ready`,'ready');
}
function render3D(){
  if(!st.threeReady||!st.renderer)return;
  st.renderer.clear();
  st.renderer.render(st.scene,st.camera3);
}
function fitGlasses(pts,w,h,mir){
  if(!pts||!st.glasses)return;
  const P=i=>{const q=pts[i];return q?{x:(mir?1-q.x:q.x)*w,y:q.y*h,z:q.z||0}:null};
  const ro=P(L.ro),ri=P(L.ri),li=P(L.li),lo=P(L.lo);if(!ro||!ri||!li||!lo)return;
  const A=mid(ro,ri),B=mid(lo,li);const eyes=[A,B].sort((a,b)=>a.x-b.x),le=eyes[0],re=eyes[1];
  const ipd=dist(le,re),center=mid(le,re),angle=Math.atan2(re.y-le.y,re.x-le.x),yaw=clamp((le.z-re.z)/.085,-.7,.7);
  const cfg=STYLES[st.style];
  const scale=ipd/cfg.sep;
  st.glasses.position.set(center.x-w/2,h/2-center.y,55);
  st.glasses.scale.set(scale,scale,scale);
  st.glasses.rotation.set(-yaw*.18, yaw*.62, -angle);
  const pitch=clamp(((re.z+le.z)*.5)*.55,-.24,.24);st.glasses.rotation.x=pitch;
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
    if(st.source==='camera')scanUi(100,'FACE SCAN COMPLETE');
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
    st.image=img;st.source='image';canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;res(canvas.width,canvas.height);
    stage.dataset.camera='false';stage.dataset.image='true';stage.dataset.face='false';imagePreview.src=u;
    empty.hidden=true;cameraToggle.textContent='LIVE CAMERA';exportBtn.disabled=false;faceMsg('ANALYZING FACE',true,false);scanUi(12,'SCANNING IMAGE');
    await vision.init();await initThree();resizeRenderer();
    const detector=prepareDetectionCanvas(img.naturalWidth,img.naturalHeight,img);
    const result=await vision.image(detector);applyDetection(result);render3D();
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
    eng('Opening camera','busy');pill('STARTING CAMERA','busy');msg('Opening your camera…');
    const s=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'user'},width:{ideal:1280,max:1920},height:{ideal:720,max:1080},frameRate:{ideal:30,max:30}},audio:false});
    video.srcObject=s;await video.play();if(!video.videoWidth||!video.videoHeight)await new Promise(resolve=>video.addEventListener('loadeddata',resolve,{once:true}));
    st.stream=s;st.source='camera';st.mirror=true;
    stage.dataset.camera='true';stage.dataset.image='false';stage.dataset.face='false';empty.hidden=true;exportBtn.disabled=false;cameraToggle.textContent='STOP CAMERA';
    canvas.width=video.videoWidth||1280;canvas.height=video.videoHeight||720;res(canvas.width,canvas.height);
    faceMsg('SEARCHING FOR FACE',true,false);pill('CAMERA LIVE','busy');scanUi(4,'STARTING FACE SCAN');beginScan();
    await vision.init();await initThree();await vision.setMode('VIDEO');resizeRenderer();
    eng(`Live 3D eyewear ready · ${vision.delegate}`,'ready');pill('SCANNING','busy');msg('Camera live. Center your face inside the green scan frame.');st.lastDetect=0;st.busy=false;
    cameraLoop();
  }catch(e){
    stop(st.stream);st.stream=null;video.pause();video.srcObject=null;st.source='none';st.face=null;st.detected=false;clearGlasses();
    stage.dataset.camera='false';stage.dataset.face='false';cameraToggle.textContent='LIVE CAMERA';exportBtn.disabled=true;resetScan();
    const n=e?.name||'';msg(n==='NotAllowedError'||n==='PermissionDeniedError'?'Camera permission was denied.':n==='NotFoundError'?'No camera was found.':e?.message||'Unable to start camera.','error');
    pill('CAMERA ERROR','error');eng('Camera unavailable','error');faceMsg('',false,false);
  }
}
function cameraLoop(){
  if(st.source!=='camera')return;
  if(video.readyState>=2){
    const now=performance.now();
    if(!st.busy&&now-st.lastDetect>=220&&vision.landmarker){
      st.busy=true;st.lastDetect=now;
      try{
        const detector=prepareDetectionCanvas(video.videoWidth||1280,video.videoHeight||720,video);
        const result=vision.landmarker.detectForVideo(detector,now);
        applyDetection(result);
      }catch(e){
        msg(e?.message||'Live 3D face tracking failed.','error');pill('TRACKING ERROR','error');eng('Tracking error','error');
      }finally{st.busy=false}
    }
    if(st.face&&st.detected)fitGlasses(st.face,canvas.width,canvas.height,true);
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
  if(st.source==='camera'){o.translate(w,0);o.scale(-1,1);o.drawImage(video,0,0,w,h);o.restore();o.save();o.translate(w,0);o.scale(-1,1);o.drawImage(canvas,0,0,w,h);o.restore()}
  else{o.drawImage(st.image,0,0,w,h);o.drawImage(canvas,0,0,w,h)}
  o.restore?.();
  out.toBlob(b=>{if(!b)return;const u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download='nexusnova-premium-glasses-try-on.png';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);msg(`PNG exported at ${w.toLocaleString()} × ${h.toLocaleString()}px.`,'success')},'image/png');
}
function syncStyles(){styles.forEach(b=>{const on=b.dataset.style===st.style;b.classList.toggle('is-active',on);b.setAttribute('aria-pressed',on?'true':'false')})}
function syncColors(){colors.forEach(b=>{const on=b.dataset.color.toUpperCase()===st.color.toUpperCase();b.classList.toggle('is-active',on);b.setAttribute('aria-pressed',on?'true':'false')})}

imageInput.onchange=()=>{const f=imageInput.files?.[0];if(f)loadImage(f)};
cameraToggle.onclick=()=>camera();exportBtn.onclick=exportPng;
styles.forEach(b=>b.onclick=()=>{st.style=b.dataset.style;syncStyles();setStyle();if(st.face&&st.detected)fitGlasses(st.face,canvas.width,canvas.height,st.source==='camera');render3D()});
colors.forEach(b=>b.onclick=()=>{st.color=b.dataset.color;syncColors();setColor();render3D()});
document.addEventListener('visibilitychange',()=>{if(st.source==='camera'&&document.visibilityState==='visible')requestAnimationFrame(cameraLoop)});
window.addEventListener('resize',resizeRenderer);
window.addEventListener('beforeunload',()=>{stop(st.stream);vision.dispose();if(st.url)URL.revokeObjectURL(st.url);try{st.renderer?.dispose()}catch(_){}});
eng('Ready for premium eyewear','ready');pill('READY','ready');msg('Upload a portrait or activate live camera.');syncStyles();syncColors();
initThree().catch(e=>{eng('3D eyewear engine unavailable','error');pill('ENGINE ERROR','error');msg(e?.message||'Unable to initialize 3D eyewear engine.','error')});
})();