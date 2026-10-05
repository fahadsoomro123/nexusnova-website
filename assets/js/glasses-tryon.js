(()=>{
'use strict';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const canvas=$('[data-canvas]'),ctx=canvas?.getContext('2d',{alpha:false,desynchronized:true});
if(!canvas||!ctx)return;
const imageInput=$('[data-image-input]'),cameraToggle=$('[data-camera-toggle]'),exportBtn=$('[data-export]'),empty=$('[data-empty-state]'),status=$('[data-status]'),detectPill=$('[data-detection-status]'),resolution=$('[data-resolution]'),faceStatus=$('[data-face-status]'),engine=$('[data-engine-state]'),engineLine=$('.vg-engine-line');
const styles=$$('[data-style]'),colors=$$('[data-color]');
const BUNDLE='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32',WASM='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm',MODEL='https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
const L={ro:33,ri:133,li:362,lo:263,rt:159,rb:145,lt:386,lb:374,lf:234,rf:454};
const S={
classic:{h:.34,w:1,a:1,r:.032,b:.055,l:0,d:0,t:1,c:.28},
round:{h:.37,w:.98,a:1.08,r:.033,b:.055,l:0,d:.02,t:.96,c:.88},
'cat-eye':{h:.33,w:1.02,a:1,r:.032,b:.055,l:.11,d:0,t:1,c:.28},
aviator:{h:.42,w:1.04,a:1.08,r:.029,b:.06,l:.01,d:.08,t:1.04,c:.72}
};
const st={source:'none',image:null,url:null,stream:null,video:null,mirror:false,style:'classic',color:'#111827',face:null,detected:false,vision:false,busy:false,lastDetect:0,raf:0};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),mid=(a,b)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2,z:(a.z+b.z)/2});
const rgba=(h,a)=>{const n=parseInt(h.replace('#',''),16);return `rgba(${n>>16&255},${n>>8&255},${n&255},${a})`};
const msg=(t,tone='')=>{if(status){status.textContent=t;status.dataset.tone=tone}};
const pill=(t,s='')=>{if(detectPill){detectPill.textContent=t;detectPill.dataset.state=s}};
const eng=(t,s='')=>{if(engine)engine.textContent=t;if(engineLine)engineLine.dataset.state=s};
const res=(w,h)=>{if(resolution)resolution.textContent=w&&h?`${w.toLocaleString()} × ${h.toLocaleString()}`:'0 × 0'};
const faceMsg=(t,v,d)=>{if(faceStatus){faceStatus.textContent=t;faceStatus.dataset.visible=v?'true':'false';faceStatus.dataset.face=d?'true':'false'}};
const stop=stream=>stream?.getTracks().forEach(t=>{try{t.stop()}catch(_){}});
class Vision{
  constructor(){this.readyPromise=null;this.landmarker=null;this.mode=null;this.delegate='CPU'}
  async init(){
    if(this.landmarker)return;
    if(this.readyPromise)return this.readyPromise;
    this.readyPromise=(async()=>{
      const x=await import(BUNDLE);
      const r=await x.FilesetResolver.forVisionTasks(WASM);
      let lastError=null;
      for(const delegate of ['GPU','CPU']){
        try{
          this.landmarker=await x.FaceLandmarker.createFromOptions(r,{
            baseOptions:{modelAssetPath:MODEL,delegate},
            runningMode:'IMAGE',
            numFaces:1,
            minFaceDetectionConfidence:.52,
            minFacePresenceConfidence:.52,
            minTrackingConfidence:.52
          });
          this.delegate=delegate;
          this.mode='IMAGE';
          return;
        }catch(e){lastError=e}
      }
      throw lastError||new Error('Face vision engine could not be initialized.');
    })().catch(e=>{this.readyPromise=null;throw e});
    return this.readyPromise;
  }
  async setMode(mode){
    await this.init();
    if(this.mode===mode)return;
    await this.landmarker.setOptions({runningMode:mode});
    this.mode=mode;
  }
  async detectImage(image){
    await this.setMode('IMAGE');
    return this.landmarker.detect(image);
  }
  async detectVideo(video,timestamp){
    await this.setMode('VIDEO');
    return this.landmarker.detectForVideo(video,timestamp);
  }
  dispose(){
    try{this.landmarker?.close?.()}catch(_){}
    this.landmarker=null;
    this.readyPromise=null;
    this.mode=null;
  }
}
const vision=new Vision();
function applyDetection(result){
  const pts=result?.faceLandmarks?.[0]||null;
  st.face=pts||null;
  st.detected=!!pts;
  setFaceState();
}
function setFaceState(){if(st.detected){faceMsg('FACE LOCKED · AUTO FIT',true,true);pill(st.source==='camera'?'LIVE TRACKING':'FACE DETECTED','ready');msg(st.source==='camera'?'Face locked. Frame follows the live landmark stream.':'Face detected. Glasses automatically fitted.','success')}else{faceMsg('FACE NOT DETECTED',true,false);pill('SEARCHING FOR FACE','busy');msg('Move the face into clearer view for automatic fitting.')}} 
function point(p,w,h,i,mir){const q=p[i];return q?{x:(mir?1-q.x:q.x)*w,y:q.y*h,z:q.z}:null}
function geometry(p,w,h,mir,name){if(!p||p.length<300)return null;const s=S[name]||S.classic,P=i=>point(p,w,h,i,mir);const ro=P(L.ro),ri=P(L.ri),li=P(L.li),lo=P(L.lo),rt=P(L.rt),rb=P(L.rb),lt=P(L.lt),lb=P(L.lb),lf=P(L.lf),rf=P(L.rf);if(!ro||!ri||!li||!lo)return null;const A=mid(ro,ri),B=mid(lo,li),o=[A,B].sort((a,b)=>a.x-b.x),le=o[0],re=o[1],ipd=dist(le,re),ang=Math.atan2(re.y-le.y,re.x-le.x),fw=lf&&rf?Math.max(dist(lf,rf),ipd*2.05):ipd*2.1,eh=Math.max(ipd*.2,((rt&&rb?dist(rt,rb):ipd*.22)+(lt&&lb?dist(lt,lb):ipd*.22))*.5),yaw=clamp((le.z-re.z)/.085,-.9,.9),comp=clamp(1-Math.abs(yaw)*.24,.73,1),rx=ipd*.49*s.w*comp,ry=ipd*s.h*s.a,cd=ipd*.995*(1-Math.abs(yaw)*.035),cy=(le.y+re.y)/2+eh*.055;return{style:s,styleName:name,center:{x:(le.x+re.x)/2,y:cy},left:{x:(le.x+re.x)/2-cd/2,y:cy,rx:rx*(1+yaw*.28),ry,top:s.l*ry,bottom:s.d*ry},right:{x:(le.x+re.x)/2+cd/2,y:cy,rx:rx*(1-yaw*.28),ry,top:s.l*ry,bottom:s.d*ry},angle,bridge:Math.max(ipd*.025,ipd*s.b),rim:clamp(ipd*s.r,1.8,13),temple:ipd*.58*s.t,yaw,fw}}
class Renderer{
  constructor(c){this.c=c}
  lens(ctx,g,kind){const s=g.style,rx=g[kind].rx,ry=g[kind].ry,cx=g[kind].x,cy=g[kind].y;ctx.beginPath();if(g.styleName==='round'){ctx.ellipse(cx,cy+(g[kind].top+g[kind].bottom)*.15,rx,ry*.96,0,0,Math.PI*2)}else if(g.styleName==='cat-eye'){ctx.moveTo(cx-rx*.95,cy-ry*.64);ctx.quadraticCurveTo(cx-rx*.28,cy-ry+g[kind].top,cx+rx*.78,cy-ry*.7);ctx.quadraticCurveTo(cx+rx,cy-.1*ry,cx+rx*.83,cy+ry*.88+g[kind].bottom);ctx.quadraticCurveTo(cx,cy+ry+g[kind].bottom,cx-rx*.72,cy+ry*.9);ctx.quadraticCurveTo(cx-rx,cy,cx-rx*.95,cy-ry*.64)}else if(g.styleName==='aviator'){ctx.moveTo(cx-rx*.86,cy-ry*.67);ctx.quadraticCurveTo(cx-rx*.24,cy-ry,cx+rx*.86,cy-ry*.67);ctx.quadraticCurveTo(cx+rx,cy,cx+rx*.66,cy+ry);ctx.quadraticCurveTo(cx,cy+ry*1.05,cx-rx*.66,cy+ry);ctx.quadraticCurveTo(cx-rx,cy,cx-rx*.86,cy-ry*.67)}else{const r=Math.min(rx*.7,ry*.32);ctx.moveTo(cx-rx+r,cy-ry+g[kind].top);ctx.lineTo(cx+rx-r,cy-ry+g[kind].top);ctx.quadraticCurveTo(cx+rx,cy-ry+g[kind].top,cx+rx,cy-ry+r+g[kind].top);ctx.lineTo(cx+rx,cy+ry-r+g[kind].bottom);ctx.quadraticCurveTo(cx+rx,cy+ry+g[kind].bottom,cx+rx-r,cy+ry+g[kind].bottom);ctx.lineTo(cx-rx+r,cy+ry+g[kind].bottom);ctx.quadraticCurveTo(cx-rx,cy+ry+g[kind].bottom,cx-rx,cy+ry-r+g[kind].bottom);ctx.lineTo(cx-rx,cy-ry+r+g[kind].top);ctx.quadraticCurveTo(cx-rx,cy-ry+g[kind].top,cx-rx+r,cy-ry+g[kind].top)}ctx.closePath()}
  draw(g,color){const c=this.c;c.save();c.translate(g.center.x,g.center.y);c.rotate(g.angle);c.translate(-g.center.x,-g.center.y);for(const k of ['left','right']){this.lens(c,g,k);c.fillStyle=rgba(color,.05);c.fill();this.lens(c,g,k);c.strokeStyle=color;c.lineWidth=g.rim;c.lineCap='round';c.lineJoin='round';c.stroke();this.lens(c,g,k);c.strokeStyle=rgba('#fff',.3);c.lineWidth=Math.max(1,g.rim*.2);c.stroke()}const l=g.left.x+g.left.rx*.9,r=g.right.x-g.right.rx*.9,y=g.center.y,m=(l+r)/2;c.beginPath();c.moveTo(l,y);c.bezierCurveTo(l+(r-l)*.25,y-g.bridge*.75,m-(r-l)*.12,y-g.bridge*.75,m,y-g.bridge*.12);c.bezierCurveTo(m+(r-l)*.12,y-g.bridge*.75,r-(r-l)*.25,y-g.bridge*.75,r,y);c.strokeStyle=color;c.lineWidth=g.rim;c.stroke();c.beginPath();c.moveTo(g.left.x-g.left.rx*.9,y);c.lineTo(g.left.x-g.left.rx*.9-g.temple,y);c.moveTo(g.right.x+g.right.rx*.9,y);c.lineTo(g.right.x+g.right.rx*.9+g.temple,y);c.lineWidth=Math.max(2,g.rim*.84);c.stroke();c.restore()}
}
const renderer=new Renderer(ctx);
function render(){if(st.source==='none')return;let w=canvas.width,h=canvas.height;ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,w,h);if(st.source==='image'&&st.image)ctx.drawImage(st.image,0,0,w,h);if(st.source==='camera'&&st.video){ctx.save();if(st.mirror){ctx.translate(w,0);ctx.scale(-1,1)}ctx.drawImage(st.video,0,0,w,h);ctx.restore()}if(st.face&&st.detected){const g=geometry(st.face,w,h,st.mirror,st.style);if(g)renderer.draw(g,st.color)}}
async function loadImage(file){stop(st.stream);st.stream=null;st.video=null;st.source='none';if(st.url)URL.revokeObjectURL(st.url);const u=URL.createObjectURL(file);st.url=u;try{const img=new Image();img.decoding='async';img.src=u;await new Promise((r,j)=>{img.onload=r;img.onerror=()=>j(new Error('The browser could not decode this image.'))});st.image=img;st.source='image';st.mirror=false;canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;res(canvas.width,canvas.height);empty.hidden=true;cameraToggle.textContent='LIVE CAMERA';exportBtn.disabled=false;faceMsg('ANALYZING FACE',true,false);pill('ANALYZING IMAGE','busy');msg('Image loaded. Detecting face…');await vision.init();const r=await vision.detectImage(img);applyDetection(r)}catch(e){msg(e.message||'Unable to load image.','error');pill('IMAGE ERROR','error')}}
async function camera(){
  if(st.source==='camera'){
    stop(st.stream);st.stream=null;st.video=null;st.source='none';st.face=null;st.detected=false;
    cameraToggle.textContent='LIVE CAMERA';exportBtn.disabled=true;empty.hidden=false;
    if(st.raf)cancelAnimationFrame(st.raf);st.raf=0;pill('READY','ready');faceMsg('',false,false);
    msg('Live camera stopped.');
    return;
  }
  try{
    if(!window.isSecureContext)throw new Error('Live camera requires a secure HTTPS page.');
    if(!navigator.mediaDevices?.getUserMedia)throw new Error('This browser does not expose camera access.');
    await vision.init();
    const s=await navigator.mediaDevices.getUserMedia({
      video:{facingMode:{ideal:'user'},width:{ideal:1280},height:{ideal:720}},
      audio:false
    });
    const v=document.createElement('video');
    v.autoplay=true;v.muted=true;v.playsInline=true;v.setAttribute('playsinline','');
    v.srcObject=s;
    await new Promise((resolve,reject)=>{
      const ok=()=>{v.removeEventListener('error',bad);resolve()};
      const bad=()=>{v.removeEventListener('loadedmetadata',ok);reject(new Error('Camera video stream could not be initialized.'))};
      v.addEventListener('loadedmetadata',ok,{once:true});
      v.addEventListener('error',bad,{once:true});
    });
    await v.play();
    st.stream=s;st.video=v;st.source='camera';st.mirror=true;st.face=null;st.detected=false;
    empty.hidden=true;exportBtn.disabled=false;cameraToggle.textContent='STOP CAMERA';
    pill('LIVE TRACKING','busy');faceMsg('SEARCHING FOR FACE',true,false);
    msg('Camera active. Looking for your face…');
    await vision.setMode('VIDEO');
    st.lastDetect=0;st.busy=false;
    loop();
  }catch(e){
    stop(st.stream);st.stream=null;st.video=null;st.source='none';
    cameraToggle.textContent='LIVE CAMERA';exportBtn.disabled=true;
    const name=e?.name||'';
    msg(name==='NotAllowedError'||name==='PermissionDeniedError'?'Camera permission was denied.':name==='NotFoundError'?'No camera was found.':e.message||'Unable to start camera.','error');
    pill('CAMERA ERROR','error');faceMsg('',false,false);
  }
}
async function loop(){
  if(st.source!=='camera')return;
  if(st.video?.readyState>=2){
    if(canvas.width!==st.video.videoWidth||canvas.height!==st.video.videoHeight){
      canvas.width=st.video.videoWidth||1280;canvas.height=st.video.videoHeight||720;res(canvas.width,canvas.height)
    }
    const now=performance.now();
    if(!st.busy&&now-st.lastDetect>120){
      st.busy=true;st.lastDetect=now;
      try{
        const r=await vision.detectVideo(st.video,now);
        applyDetection(r);
      }catch(e){
        eng('Tracking error','error');pill('CAMERA ERROR','error');
        msg(e?.message||'Live face tracking failed.','error');
      }finally{
        st.busy=false;
      }
    }
    render();
  }
  if(st.source==='camera'&&document.visibilityState!=='hidden')st.raf=requestAnimationFrame(loop);
}
function syncStyles(){styles.forEach(b=>{const on=b.dataset.style===st.style;b.classList.toggle('is-active',on);b.setAttribute('aria-pressed',on?'true':'false')})}
function syncColors(){colors.forEach(b=>{const on=b.dataset.color.toUpperCase()===st.color.toUpperCase();b.classList.toggle('is-active',on);b.setAttribute('aria-pressed',on?'true':'false')})}
imageInput.onchange=()=>{const f=imageInput.files?.[0];if(f)loadImage(f)};
cameraToggle.onclick=()=>camera();
exportBtn.onclick=()=>{if(st.source==='none')return;render();canvas.toBlob(b=>{if(!b)return;const u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download='nexusnova-virtual-glasses.png';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);msg(`PNG exported at ${canvas.width.toLocaleString()} × ${canvas.height.toLocaleString()}px.`,'success')},'image/png')};
styles.forEach(b=>b.onclick=()=>{st.style=b.dataset.style;syncStyles();render()});
colors.forEach(b=>b.onclick=()=>{st.color=b.dataset.color;syncColors();render()});
document.addEventListener('visibilitychange',()=>{if(st.source==='camera'&&document.visibilityState==='visible')requestAnimationFrame(loop)});
window.addEventListener('beforeunload',()=>{stop(st.stream);vision.dispose();if(st.url)URL.revokeObjectURL(st.url)});
eng('Vision engine loading','');pill('INITIALIZING VISION','busy');msg('Loading NexusNova vision engine…');syncStyles();syncColors();
vision.init().then(()=>{st.vision=true;eng('Vision engine ready','ready');pill('READY','ready');msg('Vision engine ready. Upload an image or activate live camera.')}).catch(e=>{eng('Vision engine unavailable','error');pill('ENGINE ERROR','error');msg(e.message||'Unable to initialize vision engine.','error')});
})();