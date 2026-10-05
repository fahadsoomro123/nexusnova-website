(()=>{
  'use strict';
  const page=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  if(page!=='index.html'||document.querySelector('[data-humanproof-home]')) return;

  const mount=()=>{
    const oldHero=document.querySelector('.nn-command-hero');
    if(!oldHero||document.querySelector('[data-humanproof-home]')) return;

    const hero=document.createElement('section');
    hero.className='hp-hero';
    hero.dataset.humanproofHome='';
    hero.innerHTML=`
      <div class="container hp-grid">
        <div class="hp-copy">
          <div class="hp-eyebrow"><i></i> NEXUSNOVA FLAGSHIP SECURITY LAYER</div>
          <h1>Trust the action. <span>Not just the screen.</span></h1>
          <p class="hp-lede">NexusNova HumanProof adds a live human approval layer to sensitive actions. Confirm a real person is present, bind approval to the exact action, and create an auditable verification receipt.</p>
          <div class="hp-actions">
            <a class="hp-btn primary" href="humanproof.html">Explore HumanProof →</a>
            <a class="hp-btn secondary" href="humanproof.html#live-verification">Try Live Verification</a>
            <a class="hp-btn secondary" href="tools.html">Browse NexusNova Tools</a>
          </div>
          <div class="hp-proofrow">
            <span><i></i> Live human response</span>
            <span><i></i> Exact-action binding</span>
            <span><i></i> Auditable receipt architecture</span>
          </div>
        </div>
        <section class="hp-visual-shell" aria-label="NexusNova HumanProof rotating 3D head">
          <div class="hp-visual-top">
            <strong>HUMANPROOF // VERIFIED ACTION</strong>
            <span>360° HUMAN SCAN</span>
          </div>
          <div class="hp-v20-inline">
            <div class="hp-v20-viewer">
              <canvas id="hpV20Canvas" aria-label="Rotating 3D human head scan"></canvas>
              <div class="hp-v20-loading" id="hpV20Loading">LOADING HUMAN HEAD…</div>
              <div class="hp-v20-scan-band"></div>
              <div class="hp-v20-scan-line"></div>
              <div class="hp-v20-corner tl"></div><div class="hp-v20-corner tr"></div>
              <div class="hp-v20-corner bl"></div><div class="hp-v20-corner br"></div>
              <div class="hp-v20-label"><i></i>FACE SCAN ACTIVE</div>
            </div>
            <div class="hp-v20-caption">HEAD ONLY // REAL 3D MESH // 360°</div>
            <div class="hp-model-credit">3D head by Lee Perry-Smith • <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noopener noreferrer">CC BY 3.0</a></div>
          </div>
          <div class="hp-visual-bottom">
            <span>HUMAN SCAN CONCEPT</span>
            <b>NO INNER SCROLL</b>
          </div>
        </section>
      </div>`;

    const promo=document.createElement('section');
    promo.className='hp-featured';
    promo.dataset.humanproofFeatured='';
    promo.innerHTML=`
      <div class="container">
        <div class="hp-ad">
          <div>
            <div class="hp-ad-label">FEATURED • NEXUSNOVA HUMANPROOF</div>
            <h2>Human approval for high-risk digital actions.</h2>
            <p>Built for AI-agent approvals, admin changes, account recovery, refunds, deployments, data export, crypto withdrawals and other sensitive workflows where “someone clicked” is not enough.</p>
            <div class="hp-actions" style="margin-top:17px">
              <a class="hp-btn primary" href="humanproof.html#business">See Business Platform →</a>
              <a class="hp-btn secondary" href="humanproof.html#live-verification">Open Live Verification</a>
            </div>
          </div>
          <div class="hp-ad-badge">
            <small>PRODUCT LINE</small>
            <b>VERIFIED ACTION</b>
            <small style="margin-top:8px">PERSONAL • BUSINESS • ENTERPRISE</small>
          </div>
        </div>
      </div>`;

    // HumanProof becomes the flagship first impression without deleting or rewriting
    // the existing NexusNova tools hero/search. The original homepage continues intact.
    oldHero.insertAdjacentElement('beforebegin',hero);
    hero.insertAdjacentElement('afterend',promo);

    if(!document.getElementById('humanproof-home-schema')){
      const s=document.createElement('script');
      s.id='humanproof-home-schema';
      s.type='application/ld+json';
      s.textContent=JSON.stringify({
        '@context':'https://schema.org',
        '@type':'SoftwareApplication',
        name:'NexusNova HumanProof',
        applicationCategory:'SecurityApplication',
        operatingSystem:'Web',
        url:new URL('humanproof.html',location.origin).href,
        description:'A live human approval layer for sensitive digital actions with exact-action binding and auditable verification receipt architecture.',
        publisher:{'@type':'Organization',name:'NexusNova Tools',url:location.origin+'/'}
      });
      document.head.appendChild(s);
    }
    initV20();
  };

  async function initV20(){
    const canvas=document.getElementById('hpV20Canvas'),loading=document.getElementById('hpV20Loading');
    if(!canvas||!loading) return;
    try{
      const THREE=await import('https://cdn.jsdelivr.net/npm/three@0.180.0/+esm');
      const loaderMod=await import('https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js/+esm');
      const GLTFLoader=loaderMod.GLTFLoader;

      const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
      const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
      renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
      renderer.setClearColor(0x03080f,1);
      renderer.outputColorSpace=THREE.SRGBColorSpace;

      const scene=new THREE.Scene();
      const camera3=new THREE.PerspectiveCamera(27,1,.01,100);
      camera3.position.set(0,.03,4.8);
      const rig=new THREE.Group();scene.add(rig);
      const shaders=[];
      const MODEL='https://cdn.jsdelivr.net/gh/mrdoob/three.js@master/examples/models/gltf/LeePerrySmith/LeePerrySmith.glb';

      function trimGeometry(sourceGeo,cutY){
        const geo=sourceGeo.toNonIndexed(),pos=geo.getAttribute('position'),out=[];
        for(let i=0;i<pos.count;i+=3){
          const cy=(pos.getY(i)+pos.getY(i+1)+pos.getY(i+2))/3;
          if(cy<cutY)continue;
          for(let k=0;k<3;k++)out.push(pos.getX(i+k),pos.getY(i+k),pos.getZ(i+k));
        }
        const g=new THREE.BufferGeometry();
        g.setAttribute('position',new THREE.Float32BufferAttribute(out,3));
        g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();
        return g;
      }
      function wireMaterial(){
        return new THREE.ShaderMaterial({
          wireframe:true,transparent:true,depthTest:true,depthWrite:false,side:THREE.FrontSide,
          uniforms:{uTime:{value:0}},
          vertexShader:`varying vec3 vPos;varying vec3 vNormal;void main(){vPos=position;vNormal=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
          fragmentShader:`uniform float uTime;varying vec3 vPos;varying vec3 vNormal;vec3 cCyan=vec3(.33,.95,1.0);vec3 cBlue=vec3(.37,.56,1.0);vec3 cViolet=vec3(.61,.43,1.0);vec3 cMagenta=vec3(.94,.39,.86);void main(){float px=clamp(vPos.x*.14+.50,0.0,1.0);float py=clamp(vPos.y*.10+.50,0.0,1.0);vec3 a=mix(cCyan,cBlue,smoothstep(0.0,.50,px));vec3 b=mix(cViolet,cMagenta,smoothstep(.50,1.0,px));vec3 col=mix(a,b,smoothstep(.42,.78,px));float facing=.72+.28*abs(vNormal.z);float pulse=.94+.06*sin(uTime*.55+py*5.0);gl_FragColor=vec4(col*facing*pulse,.94);}`
        });
      }

      new GLTFLoader().load(MODEL,gltf=>{
        const src=gltf.scene.children[0],geo0=src.geometry.clone();
        geo0.computeBoundingBox();
        const box0=geo0.boundingBox,size0=new THREE.Vector3();
        box0.getSize(size0);
        const geo=trimGeometry(geo0,box0.min.y+size0.y*.225);
        geo.computeBoundingBox();
        const box=geo.boundingBox,center=new THREE.Vector3(),size=new THREE.Vector3();
        box.getCenter(center);box.getSize(size);
        geo.translate(-center.x,-center.y,-center.z);geo.scale(1.045,1,.965);

        rig.add(new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:0x03080f,side:THREE.DoubleSide,depthWrite:true,depthTest:true})));
        const wm=wireMaterial();shaders.push(wm);
        const wire=new THREE.Mesh(geo,wm);wire.scale.setScalar(1.0017);rig.add(wire);
        const gm=wireMaterial();gm.opacity=.16;gm.blending=THREE.AdditiveBlending;shaders.push(gm);
        const glow=new THREE.Mesh(geo,gm);glow.scale.setScalar(1.006);rig.add(glow);

        const tb=new THREE.Box3().setFromObject(rig),ts=new THREE.Vector3();tb.getSize(ts);
        rig.scale.setScalar(2.55/Math.max(ts.x,ts.y));
        loading.classList.add('hide');
      },undefined,()=>{loading.textContent='3D HEAD COULD NOT LOAD';});

      const resize=()=>{
        const r=canvas.parentElement.getBoundingClientRect();
        const w=Math.max(1,Math.round(r.width)),h=Math.max(1,Math.round(r.height));
        renderer.setSize(w,h,false);camera3.aspect=w/h;camera3.updateProjectionMatrix();
      };
      const ro=new ResizeObserver(resize);ro.observe(canvas.parentElement);resize();
      const clock=new THREE.Clock();
      let raf=0,running=false,visible=true,lastFrame=0;
      const frameInterval=reducedMotion.matches?1000:50;
      const animate=(now=0)=>{
        if(!running)return;
        raf=requestAnimationFrame(animate);
        if(now-lastFrame<frameInterval)return;
        lastFrame=now;
        const t=clock.getElapsedTime();
        rig.rotation.y=(t/48)*Math.PI*2;
        rig.position.y=reducedMotion.matches?0:Math.sin(t*.32)*.012;
        for(const s of shaders)s.uniforms.uTime.value=t;
        renderer.render(scene,camera3);
      };
      const sync=()=>{
        const shouldRun=visible&&!document.hidden;
        if(shouldRun&&!running){running=true;clock.start();raf=requestAnimationFrame(animate);}
        else if(!shouldRun&&running){running=false;cancelAnimationFrame(raf);clock.stop();}
      };
      const io=new IntersectionObserver(entries=>{visible=entries[0]?.isIntersecting??true;sync();},{rootMargin:'80px'});
      io.observe(canvas);
      document.addEventListener('visibilitychange',sync);
      reducedMotion.addEventListener?.('change',()=>location.reload(),{once:true});
      sync();
      addEventListener('pagehide',()=>{running=false;cancelAnimationFrame(raf);io.disconnect();ro.disconnect();renderer.dispose()},{once:true});
    }catch(e){
      console.warn('[HumanProof V20]',e);
      loading.innerHTML='<div class="hp-home-fallback">360° scan unavailable on this browser.<br>HumanProof content remains available below.</div>';
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
  else mount();
})();
