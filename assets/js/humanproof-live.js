import{FaceLandmarker,FilesetResolver}from'../vendor/humanproof/vision_bundle.mjs';
const v=document.getElementById('v'),c=document.getElementById('c'),ctx=c.getContext('2d'),camera=document.getElementById('camera'),start=document.getElementById('start'),reset=document.getElementById('reset'),state=document.getElementById('state'),prompt=document.getElementById('prompt'),progressEl=document.getElementById('progress'),progressBar=document.getElementById('progressBar'),ok=document.getElementById('ok'),err=document.getElementById('err');
let lm=null,initPromise=null,stream=null,run=false,last=-1,res=null,phase=0,faceSince=0,idx=0,hold=0,seq=[],challengeState=null,sessionStarted=0,lastDetectionAt=0,prevPose=null,frameSamples=0,attempts=0,challengeRetries=0;
const challenges=[
 {k:'blink',t:'Blink once'},
 {k:'smile',t:'Give a small smile'},
 {k:'mouth',t:'Open your mouth briefly'},
 {k:'brows',t:'Raise your eyebrows'},
 {k:'turnLeft',t:'Turn your head left'},
 {k:'turnRight',t:'Turn your head right'}
];
function secureRandomInt(max){const buf=new Uint32Array(1);crypto.getRandomValues(buf);return Math.floor((buf[0]/4294967296)*max)}
function shuffleSecure(list){const a=[...list];for(let i=a.length-1;i>0;i--){const j=secureRandomInt(i+1);[a[i],a[j]]=[a[j],a[i]]}return a}
function makePath(){
 const first=secureRandomInt(2)?'left':'right',second=first==='left'?'right':'left';
 const patterns=[[first,'center',second],[first,second,'center']];
 return patterns[secureRandomInt(patterns.length)];
}
function pick(){
 const s=shuffleSecure(challenges).slice(0,2);
 return shuffleSecure([...s,{k:'path',t:'Follow the live direction sequence'}]);
}
function makeChallengeState(k){
 const blink=k==='blink',now=performance.now(),path=k==='path';
 return{phase:'neutral',startedAt:now,neutralSince:0,activeSince:0,returnSince:0,
   holdMs:blink?90+secureRandomInt(110):240+secureRandomInt(240),
   readyAt:now+650+secureRandomInt(700),deadline:0,revealed:false,
   baselineValue:null,baselineYawSum:0,baselinePitchSum:0,baselineCount:0,activeSeen:false,
   path:path?makePath():null,pathIndex:0,pathSince:0,pathHoldMs:path?330+secureRandomInt(300):0
 }
}
function resize(){const r=c.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2),w=Math.round(r.width*d),h=Math.round(r.height*d);if(c.width!==w||c.height!==h){c.width=w;c.height=h}ctx.setTransform(d,0,0,d,0,0)}
new ResizeObserver(resize).observe(camera);addEventListener('resize',resize);
function init(){if(lm)return Promise.resolve();if(initPromise)return initPromise;prompt.textContent='Preparing biometric scan…';initPromise=(async()=>{const vision=await FilesetResolver.forVisionTasks('/assets/vendor/humanproof/wasm');lm=await FaceLandmarker.createFromOptions(vision,{baseOptions:{modelAssetPath:'/assets/vendor/humanproof/face_landmarker.task'},runningMode:'VIDEO',numFaces:2,outputFaceBlendshapes:true,minFaceDetectionConfidence:.60,minFacePresenceConfidence:.60,minTrackingConfidence:.60});return lm})().finally(()=>{initPromise=null});return initPromise}
function score(r){const o={};for(const q of r.faceBlendshapes?.[0]?.categories||[])o[q.categoryName]=q.score;return o}
function faceQuality(landmarks){
 if(!Array.isArray(landmarks)||landmarks.length<468)return false;
 let minX=1,maxX=0,minY=1,maxY=0;
 for(const p of landmarks){if(!Number.isFinite(p.x)||!Number.isFinite(p.y))return false;minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y)}
 const w=maxX-minX,h=maxY-minY,cx=(minX+maxX)/2,cy=(minY+maxY)/2;
 return w>=.12&&w<=.90&&h>=.16&&h<=.98&&cx>=.10&&cx<=.90&&cy>=.10&&cy<=.95;
}
function poseScore(landmarks){
 const eyeL=landmarks[33],eyeR=landmarks[263],nose=landmarks[1],fore=landmarks[10],chin=landmarks[152];
 if(!eyeL||!eyeR||!nose||!fore||!chin)return{yaw:0,pitch:0};
 const midX=(eyeL.x+eyeR.x)/2,eyeSpan=Math.max(.02,Math.abs(eyeR.x-eyeL.x));
 const faceH=Math.max(.04,Math.abs(chin.y-fore.y));
 return{yaw:(nose.x-midX)/eyeSpan,pitch:(nose.y-(eyeL.y+eyeR.y)/2)/faceH};
}
function rawActionValue(k,s,p){
 if(k==='blink')return Math.min(s.eyeBlinkLeft||0,s.eyeBlinkRight||0);
 if(k==='smile')return ((s.mouthSmileLeft||0)+(s.mouthSmileRight||0))/2;
 if(k==='mouth')return s.jawOpen||0;
 if(k==='brows')return s.browInnerUp||0;
 if(k==='turnLeft')return p.yaw;
 if(k==='turnRight')return -p.yaw;
 return 0;
}
function actionValue(k,s,p,st){
 const raw=rawActionValue(k,s,p);
 if(k==='turnLeft'||k==='turnRight')return raw-(st?.baselineYaw||0);
 return raw;
}
function updateBaseline(k,s,p,st){
 if(!st||st.baselineCount>=24)return;
 const raw=rawActionValue(k,s,p);
 if(!Number.isFinite(raw))return;
 if(k==='turnLeft'||k==='turnRight'){
   st.baselineYawSum+=p.yaw;st.baselinePitchSum+=p.pitch;st.baselineCount++;
   st.baselineYaw=st.baselineYawSum/st.baselineCount;st.baselinePitch=st.baselinePitchSum/st.baselineCount;
 }else{
   st.baselineValue=st.baselineValue===null?raw:Math.min(st.baselineValue,raw);
   st.baselineCount++;
 }
}
function activeThreshold(k,st){
 const b=k==='turnLeft'||k==='turnRight'?0:(st?.baselineValue??0);
 if(k==='blink')return Math.max(.46,b+.34);
 if(k==='smile')return Math.max(.38,b+.28);
 if(k==='mouth')return Math.max(.45,b+.30);
 if(k==='brows')return Math.max(.30,b+.22);
 if(k==='turnLeft'||k==='turnRight')return Math.max(.18,b+.22);
 return 1;
}
function neutralTolerance(k){return k==='blink'?.13:k==='smile'?.12:k==='mouth'?.12:k==='brows'?.11:.10}
function isNeutral(k,s,p,st){
 const raw=rawActionValue(k,s,p);
 if(k==='turnLeft'||k==='turnRight'){
   const by=Math.abs(p.yaw-(st?.baselineYaw||0));
   const bp=Math.abs(p.pitch-(st?.baselinePitch||0));
   return by<.11&&bp<.24;
 }
 const base=st?.baselineValue??0;
 return Math.abs(raw-base)<=neutralTolerance(k);
}
function isActive(k,s,p,st){
 const v=actionValue(k,s,p,st);
 if(k==='turnLeft'||k==='turnRight')return v>activeThreshold(k,st)&&Math.abs(p.pitch-(st?.baselinePitch||0))<.45;
 return v>activeThreshold(k,st);
}
function pathPass(s,p,now){
 const st=challengeState;if(!st||!st.path)return false;
 if(st.deadline&&now>st.deadline)return false;
 if(st.baselineCount<24)updateBaseline('turnLeft',s,p,st);
 if(now<st.readyAt)return false;
 if(st.baselineCount<8)return false;
 const by=p.yaw-(st.baselineYaw||0),bp=p.pitch-(st.baselinePitch||0),target=st.path[st.pathIndex];
 const matched=target==='left'?by<-.20&&Math.abs(bp)<.45:target==='right'?by>.20&&Math.abs(bp)<.45:Math.abs(by)<.10&&Math.abs(bp)<.22;
 if(st.phase==='neutral'){
   if(target==='center' && matched){st.neutralSince=st.neutralSince||now;if(now-st.neutralSince>=260)st.phase='armed'}
   else if(target!=='center' && Math.abs(by)<.11&&Math.abs(bp)<.24){st.neutralSince=st.neutralSince||now;if(now-st.neutralSince>=260)st.phase='armed'}
   else st.neutralSince=0;
   return false;
 }
 if(st.phase==='armed'){
   if(matched){st.activeSince=st.activeSince||now;if(now-st.activeSince>=st.pathHoldMs){st.activeSeen=true;st.phase='return';st.returnSince=0}}
   else st.activeSince=0;
   return false;
 }
 if(st.phase==='return'){
   const neutral=Math.abs(by)<.11&&Math.abs(bp)<.24;
   if(neutral){st.returnSince=st.returnSince||now;if(now-st.returnSince>=260){
     st.pathIndex++;
     if(st.pathIndex>=st.path.length)return true;
     st.phase='neutral';st.neutralSince=0;st.activeSince=0;st.returnSince=0;st.activeSeen=false;st.pathHoldMs=330+secureRandomInt(300);st.readyAt=now+120+secureRandomInt(220);st.deadline=now+5500+secureRandomInt(2500);updatePathPrompt();
   }}else st.returnSince=0;
 }
 return false;
}
function updatePathPrompt(){
 const st=challengeState;if(!st?.path)return;
 const labels={left:'LEFT',right:'RIGHT',center:'CENTER'};
 prompt.textContent=`Follow the live direction sequence • ${st.pathIndex+1}/${st.path.length}: ${labels[st.path[st.pathIndex]]}`;
}
function challengePass(k,s,p,now){
 const st=challengeState;if(!st)return false;
 if(k==='path')return pathPass(s,p,now);
 if(st.deadline&&now>st.deadline)return false;
 if(st.baselineCount<24)updateBaseline(k,s,p,st);
 if(now<st.readyAt)return false;
 if(st.phase==='neutral'){
   if(isNeutral(k,s,p,st)){
     st.neutralSince=st.neutralSince||now;
     if(st.baselineCount>=8&&now-st.neutralSince>=380){st.phase='armed';st.neutralSince=0}
   }else st.neutralSince=0;
   return false;
 }
 if(st.phase==='armed'){
   if(isActive(k,s,p,st)){
     st.activeSince=st.activeSince||now;
     if(k==='blink'){st.activeSeen=true;st.phase='return';st.returnSince=0}
     else if(now-st.activeSince>=st.holdMs){st.activeSeen=true;st.phase='return';st.returnSince=0}
   }else st.activeSince=0;
   return false;
 }
 if(st.phase==='return'){
   if(isNeutral(k,s,p,st)){
     st.returnSince=st.returnSince||now;
     if(now-st.returnSince>=(k==='blink'?220:280)&&st.activeSeen)return true;
   }else st.returnSince=0;
 }
 return false;
}
function setProgress(value){const n=Math.max(0,Math.min(100,Math.round(value)));progressEl.textContent=n+'%';if(progressBar){progressBar.style.width=n+'%';progressBar.parentElement.setAttribute('aria-valuenow',String(n))}}
function retryChallenge(){
 if(challengeRetries>=1){failVerification('We could not confirm the challenge after a second attempt. Please try again.');return}
 challengeRetries++;
 const used=seq.filter((_,i)=>i!==idx).map(x=>x.k),previous=seq[idx]?.k;
 if(previous==='path'){seq[idx]={k:'path',t:'Follow the live direction sequence'}}else{
   const pool=challenges.filter(x=>x.k!==previous&&!used.includes(x.k));
   seq[idx]=(pool.length?pool:challenges.filter(x=>x.k!==previous))[secureRandomInt(pool.length?pool.length:Math.max(1,challenges.length-1))];
 }
 state.textContent='NEW CHALLENGE';prompt.textContent='New challenge incoming…';showChallenge();
}
function showChallenge(){
 challengeState=makeChallengeState(seq[idx].k);
 if(seq[idx].k==='path')updatePathPrompt();else prompt.textContent=seq[idx].t;
 setProgress(Math.min(90,40+idx*20));
}
function failVerification(message){
 run=false;
 if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}
 v.srcObject=null;res=null;faceSince=0;lastDetectionAt=0;prevPose=null;frameSamples=0;challengeState=null;
 state.textContent='VERIFICATION FAILED';
 prompt.textContent='Please try again';
 setProgress(0);
 err.textContent=message;
 err.classList.add('show');
 start.disabled=false;
}
function map(p){const cw=c.clientWidth,ch=c.clientHeight,vw=v.videoWidth||1280,vh=v.videoHeight||720,s=Math.max(cw/vw,ch/vh),dw=vw*s,dh=vh*s,ox=(cw-dw)/2,oy=(ch-dh)/2;return{x:cw-(ox+p.x*dw),y:oy+p.y*dh,z:p.z||0}}
function faceData(a){const pts=a.map(map);let minX=1e9,maxX=-1e9,minY=1e9,maxY=-1e9;for(const p of pts){minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y)}return{pts,minX,maxX,minY,maxY,cx:(minX+maxX)/2,cy:(minY+maxY)/2,w:maxX-minX,h:maxY-minY}}
function line(a,b,c,d,col='rgba(74,234,249,.62)',w=.8,blur=0){ctx.save();ctx.strokeStyle=col;ctx.lineWidth=w;if(blur){ctx.shadowColor=col;ctx.shadowBlur=blur}ctx.beginPath();ctx.moveTo(a,b);ctx.lineTo(c,d);ctx.stroke();ctx.restore()}
function txt(t,x,y,s=7,al=.82){ctx.save();ctx.font=`600 ${s}px ui-monospace,SFMono-Regular,monospace`;ctx.fillStyle=`rgba(104,239,252,${al})`;ctx.fillText(t,x,y);ctx.restore()}
function node(p,r=1.7,al=.8){ctx.save();ctx.fillStyle=`rgba(91,241,255,${al})`;ctx.shadowColor='rgba(72,230,247,.65)';ctx.shadowBlur=4;ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fill();ctx.restore()}
function corner(p,side=1){line(p.x,p.y,p.x+side*13,p.y,'rgba(95,240,251,.72)',1,5);line(p.x,p.y,p.x,p.y+10,'rgba(95,240,251,.72)',1,5)}
function drawInitialMesh(b,age){const connectors=FaceLandmarker.FACE_LANDMARKS_TESSELATION||[],fade=Math.max(0,1-age/1.8),cutoff=b.cx+b.w*.08;for(const e of connectors){const a=b.pts[e.start],d=b.pts[e.end];if(!a||!d)continue;const mx=(a.x+d.x)/2;if(mx<cutoff)continue;line(a.x,a.y,d.x,d.y,`rgba(57,227,245,${.34*fade})`,.55,0)}const scan=b.cx+b.w*(.15+.42*Math.min(age/1.8,1)),g=ctx.createLinearGradient(scan-10,0,scan+10,0);g.addColorStop(0,'rgba(66,236,251,0)');g.addColorStop(.5,`rgba(103,246,255,${.26*fade})`);g.addColorStop(1,'rgba(66,236,251,0)');ctx.fillStyle=g;ctx.fillRect(scan-10,b.minY-4,20,b.h+8)}
function drawSparseFace(b){const IDs=[10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152,33,133,263,362,1,61,291,13,14];for(const id of IDs){const p=b.pts[id];if(p&&p.x>=b.cx-b.w*.05)node(p,1.25,.66)}const traces=[[10,338],[338,297],[297,332],[332,284],[284,251],[251,389],[389,356],[356,454],[263,362],[33,133],[61,13],[13,291],[14,291],[1,13],[152,377],[377,400],[400,378]];for(const [a,d] of traces){const p=b.pts[a],q=b.pts[d];if(p&&q&&((p.x+q.x)/2)>=b.cx-b.w*.08)line(p.x,p.y,q.x,q.y,'rgba(67,232,248,.46)',.72,0)}const pL=b.pts[33],pR=b.pts[263],mouth=b.pts[291],fore=b.pts[10];if(pL)corner({x:pL.x-13,y:pL.y-9},1);if(pR)corner({x:pR.x+13,y:pR.y-9},-1);if(mouth)line(mouth.x+8,mouth.y,mouth.x+24,mouth.y,'rgba(78,235,250,.58)',.8);if(fore)line(fore.x+5,fore.y+5,fore.x+21,fore.y+5,'rgba(78,235,250,.48)',.75)}
function dial(cx,cy,r,spin,active=true){ctx.save();ctx.strokeStyle='rgba(69,226,244,.20)';ctx.lineWidth=1;ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.stroke();ctx.strokeStyle=active?'rgba(80,238,252,.78)':'rgba(80,238,252,.34)';ctx.lineWidth=1.3;ctx.shadowColor='rgba(72,230,247,.55)';ctx.shadowBlur=5;ctx.beginPath();ctx.arc(cx,cy,r-3,-Math.PI/2+spin,-Math.PI/2+spin+Math.PI*1.35);ctx.stroke();ctx.shadowBlur=0;ctx.beginPath();ctx.arc(cx,cy,r-9,0,Math.PI*2);ctx.strokeStyle='rgba(75,232,249,.32)';ctx.stroke();line(cx-r-8,cy,cx+r+8,cy,'rgba(76,233,249,.35)',.65);line(cx,cy-r-8,cx,cy+r+8,'rgba(76,233,249,.25)',.55);for(let i=0;i<8;i++){const a=i/8*Math.PI*2+spin*.15;line(cx+Math.cos(a)*(r-1),cy+Math.sin(a)*(r-1),cx+Math.cos(a)*(r-5),cy+Math.sin(a)*(r-5),'rgba(98,239,251,.45)',.65)}ctx.restore()}
function topLabel(b,age){if(age<2.15)return;const p=Math.min(1,(age-2.15)/.55),x=Math.max(12,b.minX-b.w*.72),y=Math.max(55,b.minY-20);ctx.save();ctx.globalAlpha=p;line(x,y-5,x,y+26,'rgba(77,236,250,.7)',1,5);for(let i=0;i<4;i++){const yy=y+i*7;line(x-3,yy,x+3,yy+4,'rgba(77,236,250,.65)',.7);line(x+3,yy,x-3,yy+4,'rgba(77,236,250,.45)',.7)}const bx=x+12,by=y+2,w=122,h=18;ctx.fillStyle='rgba(5,67,82,.58)';ctx.fillRect(bx,by,w*p,h);ctx.fillStyle='rgba(65,230,247,.28)';ctx.fillRect(bx,by,Math.max(4,88*p),h);txt('LIVENESS ANALYSIS',bx+9,by+12,7,.96*p);ctx.restore()}
function leftDials(b,age){if(age<2.75)return;const p=Math.min(1,(age-2.75)/.7),x=Math.max(46,b.minX-b.w*.40),y=b.cy+4;ctx.save();ctx.globalAlpha=p;dial(x,y-43,22,phase*.45,true);dial(x+35,y-8,24,-phase*.38,idx>=1);dial(x+4,y+43,25,phase*.32,idx>=1);ctx.fillStyle='rgba(75,233,249,.48)';ctx.fillRect(x-34,y-53,24,3);ctx.fillRect(x+24,y-68,20,3);ctx.fillRect(x-22,y+63,28,3);txt('LIVE',x-32,y-58,5,.62);txt(idx===0?'SCAN':idx===1?'50%':idx===2?'75%':'100%',x-20,y+67,5,.72);ctx.restore()}
function drawHud(a){phase+=.03;const b=faceData(a),age=(performance.now()-faceSince)/1000;drawInitialMesh(b,age);if(age>.75)drawSparseFace(b);topLabel(b,age);leftDials(b,age)}
async function begin(){err.classList.remove('show');ok.classList.remove('show');idx=0;hold=0;seq=pick();challengeState=null;res=null;faceSince=0;lastDetectionAt=0;prevPose=null;frameSamples=0;sessionStarted=performance.now();attempts++;challengeRetries=0;start.disabled=true;setProgress(10);try{if(!isSecureContext)throw Error('Secure HTTPS is required.');await Promise.race([init(),new Promise((_,reject)=>setTimeout(()=>reject(new Error('Verification service is taking too long to initialize. Please check your connection and try again.')),15000))]);stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:1280},height:{ideal:720}},audio:false});v.srcObject=stream;await v.play();resize();run=true;setProgress(25);state.textContent='ACQUIRING FACE';prompt.textContent='Look at the camera';requestAnimationFrame(loop)}catch(e){stop();prompt.textContent='Camera unavailable';err.textContent=e?.message||String(e);err.classList.add('show')}}
function stop(){run=false;if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}v.srcObject=null;res=null;faceSince=0;lastDetectionAt=0;prevPose=null;frameSamples=0;challengeState=null;start.disabled=false;state.textContent='SYSTEM STANDBY';prompt.textContent='Ready when you are.';setProgress(0);ctx.clearRect(0,0,c.clientWidth,c.clientHeight)}
start.onclick=begin;reset.onclick=stop;addEventListener('pagehide',stop,{once:true});
function loop(){
 if(!run)return;
 const now=performance.now();
 if(now-sessionStarted>90000){failVerification('Verification session expired. Please try again.');return}
 resize();ctx.clearRect(0,0,c.clientWidth,c.clientHeight);
 let freshFrame=false;
 if(v.readyState>=2&&v.currentTime!==last){last=v.currentTime;freshFrame=true;try{res=lm.detectForVideo(v,now)}catch{res=null}}
 if(!freshFrame){requestAnimationFrame(loop);return}
 if(res?.faceLandmarks?.length===1&&faceQuality(res.faceLandmarks[0])){
   if(!faceSince)faceSince=now;
   if(lastDetectionAt&&now-lastDetectionAt>700){
     if(challengeState){challengeState.phase='neutral';challengeState.neutralSince=0;challengeState.activeSince=0;challengeState.returnSince=0;challengeState.readyAt=now+700+secureRandomInt(700);challengeState.startedAt=now;challengeState.deadline=0;challengeState.revealed=false;challengeState.pathIndex=0;challengeState.pathSince=0}
   }
   lastDetectionAt=now;frameSamples++;
   const landmarks=res.faceLandmarks[0],scores=score(res),pose=poseScore(landmarks);
   if(prevPose&&(Math.abs(pose.yaw-prevPose.yaw)+Math.abs(pose.pitch-prevPose.pitch)>.02))frameSamples++;
   prevPose=pose;
   state.textContent='LIVE ANALYSIS';
   if(idx===0&&prompt.textContent==='Look at the camera')setProgress(30);
   drawHud(landmarks);
   const age=(now-faceSince)/1000;
   if(age>3.25&&frameSamples>=36&&idx===0&&!challengeState)showChallenge();
   if(challengeState){
     if(challengeState.revealed&&challengeState.deadline&&now>challengeState.deadline){retryChallenge();return}
     if(!challengeState.revealed&&now>=challengeState.readyAt){challengeState.revealed=true;challengeState.deadline=now+(seq[idx].k==='blink'?10000:seq[idx].k==='path'?6500+secureRandomInt(3500):12000);if(seq[idx].k==='path')updatePathPrompt();else prompt.textContent=seq[idx].t}
     if(challengeState.revealed&&challengePass(seq[idx].k,scores,pose,now)){
       idx++;hold=0;challengeRetries=0;
       if(idx>=seq.length){
         setProgress(100);run=false;
         if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}
         v.srcObject=null;res=null;challengeState=null;
         state.textContent='PENDING PAYMENT';
         prompt.textContent='Challenge complete • no HumanProof result issued';
         ok.textContent='PENDING PAYMENT • NOT VERIFIED. No HumanProof result has been issued. Production verification requires an activated paid flow and server confirmation.';
         ok.classList.add('show');start.disabled=false;return
       }
       showChallenge();
     }
   }
 }else{
   if(res?.faceLandmarks?.length>1){
     faceSince=0;state.textContent='MULTIPLE FACES';prompt.textContent='Only one person should be visible';hold=0;prevPose=null;
     if(challengeState){challengeState.phase='neutral';challengeState.neutralSince=0;challengeState.activeSince=0;challengeState.returnSince=0;challengeState.startedAt=now;challengeState.readyAt=now+900;challengeState.deadline=0;challengeState.revealed=false}
   }else if(lastDetectionAt&&now-lastDetectionAt>650){
     faceSince=0;state.textContent='ACQUIRING FACE';prompt.textContent=challengeState?'Re-centre your face':'Look at the camera';hold=0;prevPose=null;
     if(challengeState){challengeState.phase='neutral';challengeState.neutralSince=0;challengeState.activeSince=0;challengeState.returnSince=0;challengeState.startedAt=now;challengeState.readyAt=now+800;challengeState.deadline=0;challengeState.revealed=false}
   }
 }
 requestAnimationFrame(loop);
}
