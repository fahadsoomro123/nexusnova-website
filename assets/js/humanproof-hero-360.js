// NexusNova HumanProof hero — real code-rendered 360° Three.js mesh.
// 3D head source: Lee Perry-Smith model used by three.js examples (CC BY 3.0).
(async()=>{
  const canvas=document.getElementById('nnHumanProof360');
  const holder=document.querySelector('[data-hp-360-holder]');
  const load=document.getElementById('nnHumanProof360Load');
  if(!canvas||!holder||!load)return;

  try{
    const THREE=await import('https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js');
    const {GLTFLoader}=await import('https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js');

    const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'high-performance'});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
    renderer.setClearColor(0x000000,0);
    renderer.outputColorSpace=THREE.SRGBColorSpace;

    const scene=new THREE.Scene();
    const camera=new THREE.PerspectiveCamera(26,1,.01,100);
    camera.position.set(0,.02,4.7);
    const rig=new THREE.Group();
    scene.add(rig);

    const materials=[];
    const wireMaterial=()=>new THREE.ShaderMaterial({
      wireframe:true,
      transparent:true,
      depthTest:true,
      depthWrite:false,
      uniforms:{uTime:{value:0}},
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
        varying vec3 vPos;
        varying vec3 vNormal;
        void main(){
          float x=clamp(vPos.x*.15+.5,0.,1.);
          float y=clamp(vPos.y*.11+.52,0.,1.);
          vec3 emerald=vec3(.20,.66,.49);
          vec3 mint=vec3(.35,.84,.64);
          vec3 lilac=vec3(.65,.57,.91);
          vec3 rose=vec3(.81,.50,.68);
          vec3 left=mix(emerald,mint,smoothstep(.0,.52,x));
          vec3 right=mix(lilac,rose,smoothstep(.5,1.,x));
          vec3 col=mix(left,right,smoothstep(.40,.78,x));
          col=mix(col,vec3(.90,1.0,.82),smoothstep(.72,1.,y)*.16);
          float face=.78+.22*abs(vNormal.z);
          float pulse=.97+.03*sin(uTime*.55+vPos.y*.55);
          gl_FragColor=vec4(col*face*pulse,.96);
        }
      `
    });

    new GLTFLoader().load(
      'https://cdn.jsdelivr.net/gh/mrdoob/three.js@master/examples/models/gltf/LeePerrySmith/LeePerrySmith.glb',
      gltf=>{
        let source=null;
        gltf.scene.traverse(node=>{if(!source&&node.isMesh&&node.geometry)source=node;});
        if(!source)throw new Error('No mesh in HumanProof head model');

        const geometry=source.geometry.clone();
        geometry.computeBoundingBox();
        const box=geometry.boundingBox;
        const size=new THREE.Vector3();
        const center=new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);
        geometry.translate(-center.x,-center.y+size.y*.03,-center.z);

        const softBase=new THREE.MeshBasicMaterial({
          color:0xf0fff6,
          transparent:true,
          opacity:.82,
          side:THREE.DoubleSide
        });
        const baseMesh=new THREE.Mesh(geometry,softBase);
        rig.add(baseMesh);

        const wire=wireMaterial();
        materials.push(wire);
        const wireMesh=new THREE.Mesh(geometry,wire);
        wireMesh.scale.setScalar(1.002);
        rig.add(wireMesh);

        rig.scale.setScalar(2.58/Math.max(size.x,size.y));
        rig.rotation.x=-.035;
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
      const rect=holder.getBoundingClientRect();
      const width=Math.max(1,Math.round(rect.width));
      const height=Math.max(1,Math.round(rect.height));
      renderer.setSize(width,height,false);
      camera.aspect=width/height;
      camera.updateProjectionMatrix();
    };
    const observer=new ResizeObserver(resize);
    observer.observe(holder);
    resize();

    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const clock=new THREE.Clock();
    let visible=true;
    let raf=0;

    const draw=()=>{
      raf=requestAnimationFrame(draw);
      if(!visible||document.hidden)return;
      const t=clock.getElapsedTime();
      rig.rotation.y=reduced ? -.18 : (t/42)*Math.PI*2;
      rig.position.y=reduced ? 0 : Math.sin(t*.32)*.012;
      materials.forEach(material=>material.uniforms.uTime.value=t);
      renderer.render(scene,camera);
    };

    const visibilityObserver=new IntersectionObserver(entries=>{
      visible=entries.some(entry=>entry.isIntersecting);
    },{rootMargin:'160px'});
    visibilityObserver.observe(holder);
    draw();

    window.addEventListener('pagehide',()=>{
      cancelAnimationFrame(raf);
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
