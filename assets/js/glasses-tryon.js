(()=>{
'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const canvas=$('[data-canvas]'), ctx=canvas?.getContext('2d',{alpha:true,desynchronized:true}), video=$('[data-video]');
if(!canvas||!ctx||!video)return;

const imageInput=$('[data-image-input]'),cameraToggle=$('[data-camera-toggle]'),exportBtn=$('[data-export]');
const empty=$('[data-empty-state]'),status=$('[data-status]'),detectPill=$('[data-detection-status]'),resolution=$('[data-resolution]');
const faceStatus=$('[data-face-status]'),engine=$('[data-engine-state]'),engineLine=$('.vg-engine-line'),stage=$('[data-stage]');
const cameraFrame=$('[data-camera-frame]'),scanPanel=$('[data-scan-panel]'),scanProgress=$('[data-scan-progress]'),scanPercent=$('[data-scan-percent]'),scanLabel=$('[data-scan-label]');
const styles=$$('[data-style]'),colors=$$('[data-color]');

const BUNDLE='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35';
const WASM='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm';
const MODEL='https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
const L={ro:33,ri:133,li:362,lo:263,rt:159,rb:145,lt:386,lb:374,lf:234,rf:454};
const S={
classic:{h:.34,w:1,a:1,r:.032,b:.055,l:0,d:0,t:1},
round:{h:.37,w:.98,a:1.08,r:.033,b:.055,l:0,d:.02,t:.96},
'cat-eye':{h:.33,w:1.02,a:1,r:.032,b:.055,l:.11,d:0,t:1},
aviator:{h:.42,w:1.04,a:1.08,r:.029,b:.06,l:.01,d:.08,t:1.04}
};
const st={source:'none',image:null,url:null,stream:null,style:'classic',color:'#111827',face:null,targetFace:null,detected:false,vision:false,busy:false,lastDetect:0,raf:0,scanStart:0,scanTimer:0,lastFaceAt:0,detW:384,detH:216};

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),mid=(a,b)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2,z:(a.z+b.z)/2});
const rgba=(h,a)=>{const n=parseInt(h.replace('#',''),16);return `rgba(${n>>16&255},${n>>8&255},${n&255},${a})`};
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
function resetScan(){if(scanPanel)scanPanel.hidden=true;if(scanProgress)scanProgress.style.width='0%';if(scanPercent)scanPercent.textContent='0%';if(scanLabel)scanLabel.textContent='FACE SCAN'}
function beginScan(){
  st.scanStart=performance.now();
  if(st.scanTimer)cancelAnimationFrame(st.scanTimer);
  const tick=()=>{
    if(st.source!=='camera')return;
    if(!st.detected){
      const elapsed=(performance.now()-st.scanStart);
      const cycle=(elapsed%2200)/2200;
      const p=10+cycle*82;
      scanUi(p,'SCANNING FACE');
    }
    st.scanTimer=requestAnimationFrame(tick);
  };
  tick();
}

class Vision{
  constructor(){this.readyPromise=null;this.landmarker=null;this.mode='';this.delegate='CPU'}
  async init(){
    if(this.landmarker)return;
    if(this.readyPromise)return this.readyPromise;
    this.readyPromise=(async()=>{
      eng('Loading vision engine','busy');pill('LOADING VISION','busy');
      const x=await import(BUNDLE);
      const resolver=await x.FilesetResolver.forVisionTasks(WASM);
      let error=null;
      for(const delegate of ['GPU','CPU']){
        try{
          this.landmarker=await x.FaceLandmarker.createFromOptions(resolver,{
            baseOptions:{modelAssetPath:MODEL,delegate},
            runningMode:'IMAGE',
            numFaces:1,
            minFaceDetectionConfidence:.52,
            minFacePresenceConfidence:.52,
            minTrackingConfidence:.52
          });
          this.delegate=delegate;this.mode='IMAGE';
          eng(`Vision engine ready · ${delegate}`,'ready');pill('READY','ready');
          return;
        }catch(e){error=e}
      }
      throw error||new Error('Face vision engine could not be initialized.');
    })().catch(e=>{this.readyPromise=null;eng('Vision engine unavailable','error');pill('ENGINE ERROR','error');throw e});
    return this.readyPromise;
  }
  async setMode(mode){
    await this.init();
    if(this.mode===mode)return;
    await this.landmarker.setOptions({runningMode:mode});
    this.mode=mode;
  }
  async detectImage(source){await this.setMode('IMAGE');return this.landmarker.detect(source)}
  async detectVideo(source,timestamp){await this.setMode('VIDEO');return this.landmarker.detectForVideo(source,timestamp)}
  dispose(){try{this.landmarker?.close?.()}catch(_){}this.landmarker=null;this.readyPromise=null;this.mode=''}
}
const vision=new Vision();

function applyDetection(result){
  const pts=result?.faceLandmarks?.[0]||null;
  if(pts){
    st.targetFace=pts;
    if(!st.face||st.face.length!==pts.length)st.face=pts.map(p=>({x:p.x,y:p.y,z:p.z||0}));
    else for(let i=0;i<pts.length;i++){const q=pts[i],o=st.face[i];o.x+=(q.x-o.x)*.42;o.y+=(q.y-o.y)*.42;o.z+=(q.z-o.z)*.42}
    st.lastFaceAt=performance.now();st.detected=true;
  }else{
    st.detected=false;
  }
  if(stage)stage.dataset.face=st.detected?'true':'false';
  setFaceState();
}
function point(p,w,h,i,mir){const q=p[i];return q?{x:(mir?1-q.x:q.x)*w,y:q.y*h,z:q.z}:null}
function geometry(p,w,h,mir,name){
  if(!p||p.length<300)return null;
  const s=S[name]||S.classic,P=i=>point(p,w,h,i,mir);
  const ro=P(L.ro),ri=P(L.ri),li=P(L.li),lo=P(L.lo),rt=P(L.rt),rb=P(L.rb),lt=P(L.lt),lb=P(L.lb),lf=P(L.lf),rf=P(L.rf);
  if(!ro||!ri||!li||!lo)return null;
  const A=mid(ro,ri),B=mid(lo,li),o=[A,B].sort((a,b)=>a.x-b.x),le=o[0],re=o[1],ipd=dist(le,re);
  const ang=Math.atan2(re.y-le.y,re.x-le.x);
  const eh=Math.max(ipd*.2,((rt&&rb?dist(rt,rb):ipd*.22)+(lt&&lb?dist(lt,lb):ipd*.22))*.5);
  const yaw=clamp((le.z-re.z)/.085,-.9,.9),comp=clamp(1-Math.abs(yaw)*.24,.73,1);
  const rx=ipd*.49*s.w*comp,ry=ipd*s.h*s.a,cd=ipd*.995*(1-Math.abs(yaw)*.035),cy=(le.y+re.y)/2+eh*.055;
  return{style:s,styleName:name,center:{x:(le.x+re.x)/2,y:cy},
    left:{x:(le.x+re.x)/2-cd/2,y:cy,rx:rx*(1+yaw*.28),ry,top:s.l*ry,bottom:s.d*ry},
    right:{x:(le.x+re.x)/2+cd/2,y:cy,rx:rx*(1-yaw*.28),ry,top:s.l*ry,bottom:s.d*ry},
    angle:ang,bridge:Math.max(ipd*.025,ipd*s.b),rim:clamp(ipd*s.r,1.8,13),temple:ipd*.58*s.t,yaw
  };
}

class Renderer{
  lens(c,g,kind){
    const rx=g[kind].rx,ry=g[kind].ry,cx=g[kind].x,cy=g[kind].y;c.beginPath();
    if(g.styleName==='round'){
      c.ellipse(cx,cy+(g[kind].top+g[kind].bottom)*.15,rx,ry*.96,0,0,Math.PI*2);
    }else if(g.styleName==='cat-eye'){
      c.moveTo(cx-rx*.95,cy-ry*.64);
      c.quadraticCurveTo(cx-rx*.28,cy-ry+g[kind].top,cx+rx*.78,cy-ry*.7);
      c.quadraticCurveTo(cx+rx,cy-.1*ry,cx+rx*.83,cy+ry*.88+g[kind].bottom);
      c.quadraticCurveTo(cx,cy+ry+g[kind].bottom,cx-rx*.72,cy+ry*.9);
      c.quadraticCurveTo(cx-rx,cy,cx-rx*.95,cy-ry*.64);
    }else if(g.styleName==='aviator'){
      c.moveTo(cx-rx*.86,cy-ry*.67);c.quadraticCurveTo(cx-rx*.24,cy-ry,cx+rx*.86,cy-ry*.67);
      c.quadraticCurveTo(cx+rx,cy,cx+rx*.66,cy+ry);c.quadraticCurveTo(cx,cy+ry*1.05,cx-rx*.66,cy+ry);
      c.quadraticCurveTo(cx-rx,cy,cx-rx*.86,cy-ry*.67);
    }else{
      const r=Math.min(rx*.7,ry*.32);
      c.moveTo(cx-rx+r,cy-ry+g[kind].top);c.lineTo(cx+rx-r,cy-ry+g[kind].top);
      c.quadraticCurveTo(cx+rx,cy-ry+g[kind].top,cx+rx,cy-ry+r+g[kind].top);
      c.lineTo(cx+rx,cy+ry-r+g[kind].bottom);c.quadraticCurveTo(cx+rx,cy+ry+g[kind].bottom,cx+rx-r,cy+ry+g[kind].bottom);
      c.lineTo(cx-rx+r,cy+ry+g[kind].bottom);c.quadraticCurveTo(cx-rx,cy+ry+g[kind].bottom,cx-rx,cy+ry-r+g[kind].bottom);
      c.lineTo(cx-rx,cy-ry+r+g[kind].top);c.quadraticCurveTo(cx-rx,cy-ry+g[kind].top,cx-rx+r,cy-ry+g[kind].top);
    }
    c.closePath();
  }
  draw(c,g,color){
    c.save();c.translate(g.center.x,g.center.y);c.rotate(g.angle);c.translate(-g.center.x,-g.center.y);
    for(const k of ['left','right']){
      this.lens(c,g,k);c.fillStyle=rgba(color,.055);c.fill();
      this.lens(c,g,k);c.strokeStyle=color;c.lineWidth=g.rim;c.lineCap='round';c.lineJoin='round';c.stroke();
      this.lens(c,g,k);c.strokeStyle=rgba('#fff',.3);c.lineWidth=Math.max(1,g.rim*.2);c.stroke();
    }
    const l=g.left.x+g.left.rx*.9,r=g.right.x-g.right.rx*.9,y=g.center.y,m=(l+r)/2;
    c.beginPath();c.moveTo(l,y);c.bezierCurveTo(l+(r-l)*.25,y-g.bridge*.75,m-(r-l)*.12,y-g.bridge*.75,m,y-g.bridge*.12);
    c.bezierCurveTo(m+(r-l)*.12,y-g.bridge*.75,r-(r-l)*.25,y-g.bridge*.75,r,y);
    c.strokeStyle=color;c.lineWidth=g.rim;c.stroke();
    c.beginPath();c.moveTo(g.left.x-g.left.rx*.9,y);c.lineTo(g.left.x-g.left.rx*.9-g.temple,y);
    c.moveTo(g.right.x+g.right.rx*.9,y);c.lineTo(g.right.x+g.right.rx*.9+g.temple,y);
    c.lineWidth=Math.max(2,g.rim*.84);c.stroke();
    c.restore();
  }
}
const renderer=new Renderer();

function clearOverlay(){
  ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);
}
function renderOverlay(){
  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0,0,canvas.width,canvas.height);
  if(st.source==='image'&&st.image)ctx.drawImage(st.image,0,0,canvas.width,canvas.height);
  if(st.face&&st.targetFace&&(st.detected||performance.now()-st.lastFaceAt<260)){
    const g=geometry(st.face,canvas.width,canvas.height,st.source==='camera',st.style);
    if(g)renderer.draw(ctx,g,st.color);
  }
}
function prepareDetectionCanvas(w,h){
  const ratio=Math.min(st.detW/Math.max(w,1),st.detH/Math.max(h,1),1);
  const dw=Math.max(1,Math.round(w*ratio)),dh=Math.max(1,Math.round(h*ratio));
  const c=prepareDetectionCanvas.canvas||(prepareDetectionCanvas.canvas=document.createElement('canvas'));
  c.width=dw;c.height=dh;
  const cctx=c.getContext('2d',{alpha:false,willReadFrequently:true});
  cctx.drawImage(st.source==='image'?st.image:video,0,0,dw,dh);
  return c;
}

async function loadImage(file){
  stop(st.stream);st.stream=null;video.pause();video.srcObject=null;st.source='none';st.face=null;st.detected=false;resetScan();
  if(st.url)URL.revokeObjectURL(st.url);
  const u=URL.createObjectURL(file);st.url=u;
  try{
    eng('Preparing image scan','busy');pill('PREPARING IMAGE','busy');msg('Image loaded. Starting automatic face scan…');
    const img=new Image();img.decoding='async';img.src=u;
    await new Promise((r,j)=>{img.onload=r;img.onerror=()=>j(new Error('The browser could not decode this image.'))});
    st.image=img;st.source='image';st.face=null;st.targetFace=null;st.detected=false;canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;res(canvas.width,canvas.height);
    stage.dataset.camera='false';stage.dataset.face='false';empty.hidden=true;cameraToggle.textContent='LIVE CAMERA';exportBtn.disabled=false;
    faceMsg('ANALYZING FACE',true,false);scanUi(16,'SCANNING IMAGE');
    await vision.init();
    const detectorSource=prepareDetectionCanvas(img.naturalWidth,img.naturalHeight);
    const result=await vision.detectImage(detectorSource);
    applyDetection(result);renderOverlay();
  }catch(e){
    st.source='none';exportBtn.disabled=true;empty.hidden=false;resetScan();
    msg(e?.message||'Unable to scan this image.','error');pill('IMAGE SCAN ERROR','error');eng('Vision engine error','error');
  }
}

async function camera(){
  if(st.source==='camera'){
    stop(st.stream);st.stream=null;video.pause();video.srcObject=null;st.source='none';st.face=null;st.targetFace=null;st.detected=false;
    if(st.raf)cancelAnimationFrame(st.raf);st.raf=0;if(st.scanTimer)cancelAnimationFrame(st.scanTimer);st.scanTimer=0;
    stage.dataset.camera='false';stage.dataset.face='false';clearOverlay();empty.hidden=false;exportBtn.disabled=true;cameraToggle.textContent='LIVE CAMERA';resetScan();
    faceMsg('',false,false);pill('READY','ready');msg('Live camera stopped.');
    return;
  }
  try{
    if(!window.isSecureContext)throw new Error('Live camera requires a secure HTTPS page.');
    if(!navigator.mediaDevices?.getUserMedia)throw new Error('This browser does not expose camera access.');

    st.image=null;st.face=null;st.targetFace=null;st.detected=false;
    eng('Starting secure camera','busy');pill('STARTING CAMERA','busy');msg('Opening your camera…');
    const s=await navigator.mediaDevices.getUserMedia({
      video:{facingMode:{ideal:'user'},width:{ideal:1280,max:1920},height:{ideal:720,max:1080},frameRate:{ideal:30,max:30}},
      audio:false
    });
    video.srcObject=s;await video.play();
    if(!video.videoWidth||!video.videoHeight)await new Promise(resolve=>video.addEventListener('loadeddata',resolve,{once:true}));

    st.stream=s;st.video=video;st.source='camera';st.mirror=true;
    stage.dataset.camera='true';stage.dataset.face='false';empty.hidden=true;exportBtn.disabled=false;cameraToggle.textContent='STOP CAMERA';
    canvas.width=video.videoWidth||1280;canvas.height=video.videoHeight||720;res(canvas.width,canvas.height);
    faceMsg('SEARCHING FOR FACE',true,false);pill('CAMERA LIVE','busy');scanUi(4,'STARTING FACE SCAN');beginScan();

    await vision.init();
    await vision.setMode('VIDEO');
    eng(`Live vision ready · ${vision.delegate}`,'ready');pill('SCANNING','busy');msg('Camera live. Center your face inside the green scan frame.');
    st.lastDetect=0;st.busy=false;cameraLoop();
  }catch(e){
    stop(st.stream);st.stream=null;video.pause();video.srcObject=null;st.source='none';st.face=null;st.targetFace=null;st.detected=false;
    stage.dataset.camera='false';stage.dataset.face='false';cameraToggle.textContent='LIVE CAMERA';exportBtn.disabled=true;resetScan();
    const name=e?.name||'';msg(name==='NotAllowedError'||name==='PermissionDeniedError'?'Camera permission was denied.':name==='NotFoundError'?'No camera was found.':e?.message||'Unable to start camera.','error');
    pill('CAMERA ERROR','error');eng('Vision engine error','error');faceMsg('',false,false);
  }
}
function cameraLoop(){
  if(st.source!=='camera')return;
  if(video.readyState>=2){
    if(canvas.width!==video.videoWidth||canvas.height!==video.videoHeight){
      canvas.width=video.videoWidth||1280;canvas.height=video.videoHeight||720;res(canvas.width,canvas.height)
    }
    const now=performance.now();
    if(!st.busy&&now-st.lastDetect>=180&&vision.landmarker){
      st.busy=true;st.lastDetect=now;
      try{
        const source=prepareDetectionCanvas(video.videoWidth||1280,video.videoHeight||720);
        const result=vision.landmarker.detectForVideo(source,now);
        applyDetection(result);
      }catch(e){
        msg(e?.message||'Live face tracking failed.','error');pill('TRACKING ERROR','error');eng('Tracking error','error');
      }finally{st.busy=false}
    }
    renderOverlay();
  }
  if(st.source==='camera'&&document.visibilityState!=='hidden')st.raf=requestAnimationFrame(cameraLoop);
}
function compositeCameraExport(){
  const out=document.createElement('canvas'),w=video.videoWidth||canvas.width,h=video.videoHeight||canvas.height;out.width=w;out.height=h;
  const o=out.getContext('2d',{alpha:false}),mir=true;
  o.save();if(mir){o.translate(w,0);o.scale(-1,1)}o.drawImage(video,0,0,w,h);o.restore();
  if(st.face&&st.detected){const g=geometry(st.face,w,h,true,st.style);if(g)renderer.draw(o,g,st.color)}
  return out;
}
function exportPng(){
  if(st.source==='none')return;
  renderOverlay(); const source=st.source==='camera'?compositeCameraExport():canvas;
  source.toBlob?.(b=>{
    if(!b)return;const u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download='nexusnova-glasses-try-on.png';a.click();
    setTimeout(()=>URL.revokeObjectURL(u),1000);
    msg(`PNG exported at ${source.width.toLocaleString()} × ${source.height.toLocaleString()}px.`,'success');
  },'image/png');
}

function syncStyles(){styles.forEach(b=>{const on=b.dataset.style===st.style;b.classList.toggle('is-active',on);b.setAttribute('aria-pressed',on?'true':'false')})}
function syncColors(){colors.forEach(b=>{const on=b.dataset.color.toUpperCase()===st.color.toUpperCase();b.classList.toggle('is-active',on);b.setAttribute('aria-pressed',on?'true':'false')})}

imageInput.onchange=()=>{const f=imageInput.files?.[0];if(f)loadImage(f)};
cameraToggle.onclick=()=>camera();
exportBtn.onclick=exportPng;
styles.forEach(b=>b.onclick=()=>{st.style=b.dataset.style;syncStyles();renderOverlay()});
colors.forEach(b=>b.onclick=()=>{st.color=b.dataset.color;syncColors();renderOverlay()});
document.addEventListener('visibilitychange',()=>{if(st.source==='camera'&&document.visibilityState==='visible')requestAnimationFrame(cameraLoop)});
window.addEventListener('beforeunload',()=>{stop(st.stream);vision.dispose();if(st.url)URL.revokeObjectURL(st.url)});
eng('Ready for scan','ready');pill('READY','ready');msg('Upload a photo or activate live camera.');syncStyles();syncColors();
})();