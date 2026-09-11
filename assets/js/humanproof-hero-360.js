// NexusNova HumanProof hero — approved sci-fi mesh treatment with responsive standard camera framing.
// 3D head source: Lee Perry-Smith model used by three.js examples (CC BY 3.0).
(()=>{
  const canvas=document.getElementById('nnHumanProof360');
  const holder=document.querySelector('[data-hp-360-holder]');
  const load=document.getElementById('nnHumanProof360Load');
  if(!canvas||!holder||!load)return;

  const compactViewport=window.matchMedia('(max-width:720px)').matches;
  const boot=async()=>{
  try{
    const THREE=await import('https://esm.sh/three@0.180.0');
    const {GLTFLoader}=await import('https://esm.sh/three@0.180.0/examples/jsm/loaders/GLTFLoader.js');

    const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'high-performance'});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,compactViewport?1.25:1.5));
    renderer.setClearColor(0x000000,0);
    renderer.outputColorSpace=THREE.SRGBColorSpace;

    const scene=new THREE.Scene();
    const camera=new THREE.PerspectiveCamera(29,1,.01,100);
    const rig=new THREE.Group();
    scene.add(rig);

    // Approved preview lighting: cyan core, indigo rim and violet accent.
    const key=new THREE.PointLight(0x22d3ee,18,8);
    key.position.set(-2.3,1.8,3);
    scene.add(key);
    const rim=new THREE.PointLight(0x6558ff,13,7);
    rim.position.set(2.2,1.0,2);
    scene.add(rim);
    const accent=new THREE.PointLight(0x8b5cf6,8,7);
    accent.position.set(0,-1,2.5);
    scene.add(accent);
    scene.add(new THREE.AmbientLight(0xffffff,2.1));

    let modelMetrics=null;
    const shaderMaterials=[];
    const disposableMaterials=[];

    const trimGeometry=(sourceGeo,cutY)=>{
      const source=sourceGeo.toNonIndexed();
      const position=source.getAttribute('position');
      const out=[];
      for(let i=0;i<position.count;i+=3){
        const cy=(position.getY(i)+position.getY(i+1)+position.getY(i+2))/3;
        if(cy<cutY)continue;
        for(let k=0;k<3;k++)out.push(position.getX(i+k),position.getY(i+k),position.getZ(i+k));
      }
      const geometry=new THREE.BufferGeometry();
      geometry.setAttribute('position',new THREE.Float32BufferAttribute(out,3));
      geometry.computeVertexNormals();
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
      return geometry;
    };

    const sciWireMaterial=(alpha=.98)=>{
      const material=new THREE.ShaderMaterial({
        wireframe:true,
        transparent:true,
        depthTest:true,
        depthWrite:false,
        blending:alpha<.35?THREE.AdditiveBlending:THREE.NormalBlending,
        uniforms:{uTime:{value:0},uAlpha:{value:alpha}},
        vertexShader:`
          varying vec3 vPos;
          varying vec3 vNormal;
          void main(){
            vPos=position;
            vNormal=normalize(normalMatrix*normal);
            gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
          }
        `,
        fragmentShader:`
          uniform float uTime;
          uniform float uAlpha;
          varying vec3 vPos;
          varying vec3 vNormal;
          void main(){
            float x=clamp(vPos.x*.22+.50,0.,1.);
            float y=clamp(vPos.y*.17+.50,0.,1.);
            vec3 cyan=vec3(.03,.66,.84);
            vec3 indigo=vec3(.40,.35,1.0);
            vec3 violet=vec3(.55,.36,.96);
            vec3 col=mix(cyan,indigo,smoothstep(.28,.72,x));
            col=mix(col,violet,smoothstep(.68,1.,x)*.75);
            float pulse=.84+.16*sin(uTime*1.7+y*7.0);
            float fresnel=.65+.55*pow(1.-abs(vNormal.z),1.8);
            gl_FragColor=vec4(col*pulse*fresnel,uAlpha);
          }
        `
      });
      shaderMaterials.push(material);
      disposableMaterials.push(material);
      return material;
    };

    const fitCamera=()=>{
      const rect=canvas.getBoundingClientRect();
      const width=Math.max(1,Math.round(rect.width));
      const height=Math.max(1,Math.round(rect.height));
      renderer.setSize(width,height,false);
      camera.aspect=width/height;

      if(modelMetrics){
        const vFov=THREE.MathUtils.degToRad(camera.fov);
        const tanV=Math.tan(vFov/2);
        const tanH=tanV*camera.aspect;
        const fill=width<=520?.78:width<=980?.77:.80;
        const distanceV=modelMetrics.halfHeight/(tanV*fill);
        const distanceH=modelMetrics.halfTurnWidth/(tanH*fill);
        const distance=Math.max(distanceV,distanceH)*1.025;
        camera.position.set(0,.015,distance);
        camera.near=Math.max(.01,distance-modelMetrics.radius*2.1);
        camera.far=distance+modelMetrics.radius*3.2;
      }else{
        camera.position.set(0,.015,4.8);
      }
      camera.updateProjectionMatrix();
    };

    new GLTFLoader().load(
      'https://cdn.jsdelivr.net/gh/mrdoob/three.js@master/examples/models/gltf/LeePerrySmith/LeePerrySmith.glb',
      gltf=>{
        let source=null;
        gltf.scene.traverse(node=>{if(!source&&node.isMesh&&node.geometry)source=node;});
        if(!source){
          load.textContent='3D HUMAN SCAN UNAVAILABLE';
          holder.classList.add('is-error');
          return;
        }

        const geometry0=source.geometry.clone();
        geometry0.computeBoundingBox();
        const box0=geometry0.boundingBox;
        const size0=new THREE.Vector3();
        box0.getSize(size0);

        // Preserve the approved head-only cut and standard responsive framing.
        const geometry=trimGeometry(geometry0,box0.min.y+size0.y*.30);
        geometry0.dispose();
        geometry.computeBoundingBox();
        const center=new THREE.Vector3();
        geometry.boundingBox.getCenter(center);
        geometry.translate(-center.x,-center.y,-center.z);
        geometry.scale(1.045,1,.965);
        geometry.computeBoundingBox();
        geometry.computeBoundingSphere();

        const fittedSize=new THREE.Vector3();
        geometry.boundingBox.getSize(fittedSize);
        modelMetrics={
          halfHeight:fittedSize.y*.5,
          halfTurnWidth:Math.max(fittedSize.x,fittedSize.z)*.5,
          radius:(geometry.boundingSphere?.radius||1)
        };

        const shellMaterial=new THREE.MeshPhysicalMaterial({
          color:0xf0f5ff,
          roughness:.22,
          metalness:.08,
          transmission:.06,
          transparent:true,
          opacity:.80,
          clearcoat:1,
          clearcoatRoughness:.18,
          side:THREE.DoubleSide,
          depthWrite:true,
          depthTest:true
        });
        disposableMaterials.push(shellMaterial);
        rig.add(new THREE.Mesh(geometry,shellMaterial));

        const wire=new THREE.Mesh(geometry,sciWireMaterial(.98));
        wire.scale.setScalar(1.002);
        rig.add(wire);

        const glow=new THREE.Mesh(geometry,sciWireMaterial(.20));
        glow.scale.setScalar(1.010);
        rig.add(glow);

        const pointsMaterial=new THREE.PointsMaterial({
          color:0x8b5cf6,
          size:.006,
          transparent:true,
          opacity:.24,
          depthWrite:false,
          blending:THREE.AdditiveBlending
        });
        disposableMaterials.push(pointsMaterial);
        const points=new THREE.Points(geometry,pointsMaterial);
        points.scale.setScalar(1.013);
        rig.add(points);

        rig.scale.setScalar(1);
        rig.rotation.set(0,0,0);
        fitCamera();
        load.classList.add('is-hidden');
        holder.classList.add('is-ready');
      },
      undefined,
      err=>{
        console.warn('[HumanProof 360] model load failed',err);
        load.textContent='3D HUMAN SCAN UNAVAILABLE';
        holder.classList.add('is-error');
      }
    );

    const observer=new ResizeObserver(fitCamera);
    observer.observe(canvas);
    fitCamera();

    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const clock=new THREE.Clock();
    let visible=true;
    let timer=0;
    let disposed=false;
    const frameDelay=reduced?700:67;

    const draw=()=>{
      if(disposed)return;
      if(visible&&!document.hidden){
        const t=clock.getElapsedTime();
        rig.rotation.y=reduced?-.18:(t/48)*Math.PI*2;
        rig.position.y=reduced?0:Math.sin(t*.32)*.012;
        shaderMaterials.forEach(material=>material.uniforms.uTime.value=t);
        renderer.render(scene,camera);
      }
      timer=window.setTimeout(draw,frameDelay);
    };

    const visibilityObserver=new IntersectionObserver(entries=>{
      visible=entries.some(entry=>entry.isIntersecting);
    },{rootMargin:'120px'});
    visibilityObserver.observe(holder);
    draw();

    window.addEventListener('pagehide',()=>{
      disposed=true;
      clearTimeout(timer);
      observer.disconnect();
      visibilityObserver.disconnect();
      renderer.dispose();
      disposableMaterials.forEach(material=>material.dispose());
      rig.traverse(node=>{if(node.geometry)node.geometry.dispose();});
    },{once:true});
  }catch(error){
    console.warn('[HumanProof 360]',error);
    load.textContent='3D HUMAN SCAN UNAVAILABLE';
    holder.classList.add('is-error');
  }
  };

  if(compactViewport){
    // Mobile keeps the approved scan stage but moves expensive WebGL/model work
    // behind an explicit user action so it cannot block initial content or input.
    load.textContent='TAP TO LOAD 3D HUMAN SCAN';
    load.setAttribute('role','button');
    load.setAttribute('tabindex','0');
    holder.classList.add('is-paused');
    let started=false;
    const start=()=>{
      if(started)return;
      started=true;
      holder.classList.remove('is-paused');
      load.removeAttribute('role');
      load.removeAttribute('tabindex');
      load.textContent='LOADING 360° HUMAN SCAN…';
      boot();
    };
    load.addEventListener('click',start,{once:true});
    load.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();start()}},{once:true});
  }else if('requestIdleCallback' in window){
    requestIdleCallback(()=>boot(),{timeout:1800});
  }else{
    setTimeout(()=>boot(),500);
  }
})();
