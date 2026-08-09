/* IN VENTURE V2 — cinematic hero scene.
   Refractive glass sphere + volumetric sun + orbital ring + starfield,
   scroll-driven camera, bloom, film grain, chromatic aberration. */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

export function initScene(canvas){
  if(!canvas) return null;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const host = canvas.parentElement;

  const renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:false, powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.4));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0A0A0B');
  scene.fog = new THREE.FogExp2('#0A0A0B', 0.05);

  const cam = new THREE.PerspectiveCamera(38, 1, 0.1, 120);
  cam.position.set(0, 0.15, 9.2);

  const RED = new THREE.Color('#E8121C');
  const GRN = new THREE.Color('#A1A1A6');

  /* ---------- environment for refraction ---------- */
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  const envSphere = new THREE.Mesh(
    new THREE.SphereGeometry(30, 32, 32),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms:{ uA:{value:new THREE.Color('#0A0A0B')}, uB:{value:new THREE.Color('#6E6E73')}, uC:{value:RED} },
      vertexShader:`varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
      fragmentShader:`
        uniform vec3 uA,uB,uC; varying vec3 vP;
        void main(){
          vec3 n = normalize(vP);
          float t = n.y*.5+.5;
          vec3 c = mix(uA,uB,smoothstep(.1,.95,t));
          float sun = pow(max(0., dot(n, normalize(vec3(.55,.42,-.72)))), 22.0);
          c += uC*sun*2.4;
          float rim = pow(max(0., dot(n, normalize(vec3(-.7,.1,.4)))), 8.0);
          c += vec3(.92,.92,.94)*rim*.55;
          gl_FragColor = vec4(c,1.);
        }`
    })
  );
  envScene.add(envSphere);
  const envRT = pmrem.fromScene(envScene, 0.03);
  scene.environment = envRT.texture;

  const root = new THREE.Group();
  scene.add(root);

  /* ---------- the object: refractive glass core ---------- */
  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.72, 8),
    new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#E9E9EC'),
      roughness: 0.06, metalness: 0.55,
      clearcoat: 1, clearcoatRoughness: 0.04,
      iridescence: 0.35, iridescenceIOR: 1.35, iridescenceThicknessRange:[140, 560],
      envMapIntensity: 2.4
    })
  );
  root.add(core);


  /* ---------- the sun: volumetric hinomaru behind the glass ---------- */
  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(1.05, 48, 48),
    new THREE.MeshBasicMaterial({color:RED})
  );
  sun.position.set(2.55, 1.28, -3.6);
  root.add(sun);

  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(2.9, 48, 48),
    new THREE.ShaderMaterial({
      transparent:true, depthWrite:false, side:THREE.BackSide, blending:THREE.AdditiveBlending,
      uniforms:{ uC:{value:RED} },
      vertexShader:`varying vec3 vN; varying vec3 vV;
        void main(){ vec4 mv = modelViewMatrix*vec4(position,1.);
          vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz);
          gl_Position = projectionMatrix*mv; }`,
      fragmentShader:`uniform vec3 uC; varying vec3 vN; varying vec3 vV;
        void main(){ float f = pow(1.0 - abs(dot(vN,vV)), 2.6);
          gl_FragColor = vec4(uC, f*0.42); }`
    })
  );
  glow.position.copy(sun.position);
  root.add(glow);

  /* ---------- orbital rings ---------- */
  const ringGrp = new THREE.Group();
  root.add(ringGrp);
  for(let i=0;i<3;i++){
    const r = 2.55 + i*0.52;
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(r, 0.0055 + i*0.0018, 8, 320),
      new THREE.MeshBasicMaterial({color: i===1 ? RED : new THREE.Color('#FFFFFF'), transparent:true, opacity: i===1 ? 0.85 : 0.34})
    );
    ring.rotation.x = Math.PI/2 - 0.32 - i*0.10;
    ring.rotation.z = i*0.42;
    ring.userData.spd = 0.0012 + i*0.0007;
    ringGrp.add(ring);
  }

  /* ---------- great-circle arc, Tel Aviv to Tokyo ---------- */
  const toVec = (la,lo,rad)=>{ la*=Math.PI/180; lo*=Math.PI/180;
    return new THREE.Vector3(Math.cos(la)*Math.cos(lo)*rad, Math.sin(la)*rad, Math.cos(la)*Math.sin(lo)*rad); };
  const AR = 2.42, STEPS = 220;
  const A = toVec(32.0853, 34.7818, AR), B = toVec(35.6762, 139.6503, AR);
  const arcPts = [];
  for(let i=0;i<=STEPS;i++){
    const t=i/STEPS;
    arcPts.push(new THREE.Vector3().copy(A).lerp(B,t).normalize().multiplyScalar(AR*(1+Math.sin(Math.PI*t)*0.28)));
  }
  const arcGrp = new THREE.Group();
  arcGrp.rotation.y = -1.15; arcGrp.rotation.x = 0.16;
  root.add(arcGrp);
  arcGrp.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(arcPts),
    new THREE.LineBasicMaterial({color:RED, transparent:true, opacity:0.45})));
  [A,B].forEach(v=>{
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.052,18,18), new THREE.MeshBasicMaterial({color:RED}));
    m.position.copy(v); arcGrp.add(m);
  });
  const comet = new THREE.Mesh(new THREE.SphereGeometry(0.055,16,16), new THREE.MeshBasicMaterial({color:'#FFD9D6'}));
  arcGrp.add(comet);
  const TN = 48, trailGeo = new THREE.BufferGeometry();
  trailGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TN*3),3));
  arcGrp.add(new THREE.Line(trailGeo, new THREE.LineBasicMaterial({color:RED, transparent:true, opacity:0.9})));

  /* ---------- dust field ---------- */
  const DN = 1500, dp = new Float32Array(DN*3), ds = new Float32Array(DN);
  for(let i=0;i<DN;i++){
    const r = 5 + Math.random()*16, th = Math.random()*Math.PI*2, ph = Math.acos(2*Math.random()-1);
    dp[i*3]   = Math.sin(ph)*Math.cos(th)*r;
    dp[i*3+1] = (Math.random()-0.5)*13;
    dp[i*3+2] = Math.sin(ph)*Math.sin(th)*r - 4;
    ds[i] = 0.6 + Math.random()*2.2;
  }
  const dg = new THREE.BufferGeometry();
  dg.setAttribute('position', new THREE.BufferAttribute(dp,3));
  dg.setAttribute('aS', new THREE.BufferAttribute(ds,1));
  const dust = new THREE.Points(dg, new THREE.ShaderMaterial({
    transparent:true, depthWrite:false, blending:THREE.AdditiveBlending,
    uniforms:{ uT:{value:0}, uD:{value:Math.min(devicePixelRatio,1.75)} },
    vertexShader:`attribute float aS; uniform float uT, uD; varying float vA;
      void main(){ vec3 p = position; p.y += sin(uT*0.35 + p.x*0.25)*0.25;
        vec4 mv = modelViewMatrix*vec4(p,1.);
        vA = smoothstep(-26.0, 2.0, mv.z);
        gl_PointSize = aS*uD*(26.0/-mv.z);
        gl_Position = projectionMatrix*mv; }`,
    fragmentShader:`varying float vA;
      void main(){ float d = length(gl_PointCoord-0.5); if(d>0.5) discard;
        gl_FragColor = vec4(1.0,1.0,1.0, smoothstep(0.5,0.0,d)*vA*0.5); }`
  }));
  scene.add(dust);

  /* ---------- lights ---------- */
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const key = new THREE.DirectionalLight(0xffffff, 1.5); key.position.set(4,5,4); scene.add(key);
  const rim = new THREE.PointLight(RED, 26, 22); rim.position.set(2.9,1.6,-2.4); scene.add(rim);
  const fill = new THREE.PointLight(0xffffff, 12, 22); fill.position.set(-4.4,-1.6,3.4); scene.add(fill);

  /* ---------- post ---------- */
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, cam));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1,1), 0.85, 0.7, 0.7);
  composer.addPass(bloom);
  composer.addPass(new ShaderPass({
    uniforms:{ tDiffuse:{value:null}, uT:{value:0}, uAmt:{value:0.0016}, uV:{value:1.02} },
    vertexShader:`varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader:`
      uniform sampler2D tDiffuse; uniform float uT, uAmt, uV; varying vec2 vUv;
      float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      void main(){
        vec2 d = vUv-0.5; float r2 = dot(d,d);
        vec2 off = d*uAmt*(1.0+r2*3.0);
        vec4 c;
        c.r = texture2D(tDiffuse, vUv+off).r;
        c.g = texture2D(tDiffuse, vUv).g;
        c.b = texture2D(tDiffuse, vUv-off).b;
        c.a = 1.0;
        c.rgb *= smoothstep(1.32, 0.18, r2*uV*2.0)*0.34 + 0.66;
        float g = hash(vUv*vec2(1920.0,1080.0) + uT)*0.055 - 0.0275;
        c.rgb += g;
        gl_FragColor = c;
      }`
  }));

  /* ---------- resize ---------- */
  function resize(){
    const w = host.clientWidth, h = host.clientHeight;
    renderer.setSize(w,h,false); composer.setSize(w,h);
    bloom.resolution.set(w,h);
    cam.aspect = w/h; cam.updateProjectionMatrix();
    const s = Math.max(0.62, Math.min(1, w/1280));
    root.scale.setScalar(s);
  }
  new ResizeObserver(resize).observe(host); resize();

  /* ---------- interaction ---------- */
  const tgt = {x:0,y:0}, cur = {x:0,y:0};
  addEventListener('pointermove', e=>{ tgt.x = e.clientX/innerWidth-0.5; tgt.y = e.clientY/innerHeight-0.5; }, {passive:true});

  const api = { progress: 0 };
  let t0 = performance.now(), live = true;
  new IntersectionObserver(es=>es.forEach(e=>{ live = e.isIntersecting; }),{threshold:0}).observe(host);

  (function loop(now){
    requestAnimationFrame(loop);
    if(!live) return;
    const t = Math.max(0,(now-t0)/1000);

    cur.x += (tgt.x-cur.x)*0.05; cur.y += (tgt.y-cur.y)*0.05;

    if(!reduce){
      core.rotation.y += 0.0022; core.rotation.x = Math.sin(t*0.22)*0.08;
      ringGrp.children.forEach((r,i)=>{ r.rotation.z += r.userData.spd*(i%2?-1:1); });
      arcGrp.rotation.y += 0.0014;
    }

    /* breathing */
    const b = 1 + Math.sin(t*0.75)*0.018;
    core.scale.set(b, b*(1+Math.sin(t*0.55)*0.012), b);

    /* comet */
    const tt = (t*0.10)%1, idx = Math.max(0, Math.min(STEPS, Math.floor(tt*STEPS)));
    comet.position.copy(arcPts[idx]);
    const tp = trailGeo.attributes.position.array;
    for(let i=0;i<TN;i++){
      const j = Math.max(0, Math.min(STEPS, idx - i*2));
      tp[i*3]=arcPts[j].x; tp[i*3+1]=arcPts[j].y; tp[i*3+2]=arcPts[j].z;
    }
    trailGeo.attributes.position.needsUpdate = true;

    dust.material.uniforms.uT.value = t;
    composer.passes[2].uniforms.uT.value = t;

    /* scroll-driven camera dolly */
    const p = api.progress;
    cam.position.x = cur.x*0.85;
    cam.position.y = 0.15 - cur.y*0.55 - p*1.1;
    cam.position.z = 9.2 - p*3.4;
    root.rotation.y = cur.x*0.32 + p*0.5;
    root.rotation.x = cur.y*0.16;
    cam.lookAt(0, -p*0.5, 0);
    bloom.strength = 0.72 + p*0.45;

    composer.render();
  })(performance.now());

  return api;
}
