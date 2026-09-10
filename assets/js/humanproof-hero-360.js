// NexusNova HumanProof hero — locked V20 head-only geometry in Emerald Mist.
// 3D head source: Lee Perry-Smith model used by three.js examples (CC BY 3.0).
(async()=>{
  const canvas=document.getElementById('nnHumanProof360');
  const holder=document.querySelector('[data-hp-360-holder]');
  const load=document.getElementById('nnHumanProof360Load');
  if(!canvas||!holder||!load)return;

  try{
    const THREE=await import('https://esm.sh/three@0.180.0');
    const {GLTFLoader}=await import('https://esm.sh/three@0.180.0/examples/jsm/loaders/GLTFLoader.js');

    const compactViewport=window.matchMedia('(max-width:720px)').matches;
    const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'high-performance'});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,compactViewport?1.25:1.5));
    renderer.setClearColor(0x000000,0);
    renderer.outputColorSpace=THREE.SRGBColorSpace;

    const scene=new THREE.Scene();
    const camera=new THREE.PerspectiveCamera(27,1,.01,100);
    camera.position.set(0,.03,4.8);
    const rig=new THREE.Group();
    scene.add(rig);

    const materials=[];
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

    const wireMaterial=(alpha=.96)=>new THREE.ShaderMaterial({
      wireframe:true,
      transparent:true,
      depthTest:true,
      depthWrite:false,
      blending:alpha<.5?THREE.AdditiveBlending:THREE.NormalBlending,
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
          float x=clamp(vPos.x*.14+.50,0.,1.);
          float y=clamp(vPos.y*.10+.50,0.,1.);
          vec3 emerald=vec3(.18,.60,.45);
          vec3 mint=vec3(.34,.84,.64);
          vec3 lilac=vec3(.65,.57,.91);
          vec3 rose=vec3(.82,.50,.68);
          vec3 a=mix(emerald,mint,smoothstep(.0,.50,x));
          vec3 b=mix(lilac,rose,smoothstep(.50,1.,x));
          vec3 col=mix(a,b,smoothstep(.42,.78,x));
          col=mix(col,vec3(.90,1.0,.82),smoothstep(.72,1.,y)*.14);
          float facing=.72+.28*abs(vNormal.z);
          float pulse=.96+.04*sin(uTime*.55+y*5.0);
          gl_FragColor=vec4(col*facing*pulse,uAlpha);
        }
      `
    });

    new GLTFLoader().load(
      'https://cdn.jsdelivr.net/gh/mrdoob/three.js@master/examples/models/gltf/LeePerrySmith/LeePerrySmith.glb',
      gltf=>{
        let source=null;
        gltf.scene.traverse(node=>{if(!source&&node.isMesh&&node.geometry)source=node;});
        if(!source)throw new Error('No mesh in HumanProof head model');

        const geometry0=source.geometry.clone();
        geometry0.computeBoundingBox();
        const box0=geometry0.boundingBox;
        const size0=new THREE.Vector3();
        box0.getSize(size0);

        // Locked V20 rule: remove the lower ~22.5% so neck/shoulders cannot return.
        const geometry=trimGeometry(geometry0,box0.min.y+size0.y*.225);
        geometry.computeBoundingBox();
        const box=geometry.boundingBox;
        const size=new THREE.Vector3();
        const center=new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);
        geometry.translate(-center.x,-center.y,-center.z);
        geometry.scale(1.045,1,.965);

        // Opaque pearl shell hides back-side wires, matching the locked V20 depth behavior.
        const shell=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({
          color:0xf1fff7,
          side:THREE.DoubleSide,
          depthWrite:true,
          depthTest:true
        }));
        rig.add(shell);

        const wire=wireMaterial(.96);
        materials.push(wire);
        const wireMesh=new THREE.Mesh(geometry,wire);
        wireMesh.scale.setScalar(1.0017);
        rig.add(wireMesh);

        const glow=wireMaterial(.16);
        materials.push(glow);
        const glowMesh=new THREE.Mesh(geometry,glow);
        glowMesh.scale.setScalar(1.006);
        rig.add(glowMesh);

        const trimmedBox=new THREE.Box3().setFromObject(rig);
        const trimmedSize=new THREE.Vector3();
        trimmedBox.getSize(trimmedSize);
        rig.scale.setScalar(2.55/Math.max(trimmedSize.x,trimmedSize.y));
        rig.rotation.set(0,0,0);

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

    const resize=()=>{
      const rect=canvas.getBoundingClientRect();
      const width=Math.max(1,Math.round(rect.width));
      const height=Math.max(1,Math.round(rect.height));
      renderer.setSize(width,height,false);
      camera.aspect=width/height;
      camera.updateProjectionMatrix();
    };
    const observer=new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const clock=new THREE.Clock();
    let visible=true;
    let timer=0;
    let disposed=false;
    const frameDelay=reduced?700:67; // ~15fps instead of a permanent 60fps loop.

    const draw=()=>{
      if(disposed)return;
      if(visible&&!document.hidden){
        const t=clock.getElapsedTime();
        rig.rotation.y=reduced?-.18:(t/48)*Math.PI*2;
        rig.position.y=reduced?0:Math.sin(t*.32)*.012;
        materials.forEach(material=>material.uniforms.uTime.value=t);
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
      materials.forEach(material=>material.dispose());
    },{once:true});
  }catch(error){
    console.warn('[HumanProof 360]',error);
    load.textContent='3D HUMAN SCAN UNAVAILABLE';
    holder.classList.add('is-error');
  }
})();