/* IN VENTURE — Tel Aviv ⇄ Tokyo WebGL globe.
   Fibonacci point-shell + graticule + great-circle arc + refractive sun disc. */
import * as THREE from 'three';

const CITIES = {
  'Tel Aviv':      [32.0853, 34.7818],
  'Tokyo':         [35.6762, 139.6503],
  'London':        [51.5072, -0.1276],
  'San Francisco': [37.7749, -122.4194],
  'Hong Kong':     [22.3193, 114.1694]
};

export function initGlobe(canvas, opts={}){
  if(!canvas) return;
  const marks = opts.cities || ['Tel Aviv','Tokyo'];
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));

  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(34, 1, .1, 100);
  cam.position.set(0,0,7.4);

  const root = new THREE.Group();
  scene.add(root);

  const onDark = opts.theme === 'dark';
  const FOREST = new THREE.Color(onDark ? '#F2EDE3' : '#0B3B2E');
  const MOSS   = new THREE.Color(onDark ? '#7FA894' : '#4E7A63');
  const RED    = new THREE.Color('#E0202B');

  const R = 2.35;

  /* ---- sun disc (behind globe, Japanese hinomaru) ---- */
  const sun = new THREE.Mesh(
    new THREE.CircleGeometry(1.18, 96),
    new THREE.MeshBasicMaterial({color:RED, transparent:true, opacity:.90})
  );
  sun.position.set(opts.sunX ?? 1.15, opts.sunY ?? 1.05, -3.4);
  if(opts.sunScale) sun.geometry = new THREE.CircleGeometry(1.18*opts.sunScale, 96);
  scene.add(sun);

  const halo = new THREE.Mesh(
    new THREE.RingGeometry(1.22, 2.0, 96),
    new THREE.MeshBasicMaterial({color:RED, transparent:true, opacity:.07, side:THREE.DoubleSide})
  );
  halo.position.copy(sun.position);
  scene.add(halo);

  /* ---- point shell ---- */
  const N = 2600, pos = new Float32Array(N*3), siz = new Float32Array(N);
  const gold = Math.PI*(3-Math.sqrt(5));
  for(let i=0;i<N;i++){
    const y = 1 - (i/(N-1))*2, r = Math.sqrt(Math.max(0,1-y*y)), th = gold*i;
    pos[i*3]   = Math.cos(th)*r*R;
    pos[i*3+1] = y*R;
    pos[i*3+2] = Math.sin(th)*r*R;
    siz[i] = 1.4 + Math.random()*2.1;
  }
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.BufferAttribute(pos,3));
  pg.setAttribute('aSize', new THREE.BufferAttribute(siz,1));

  const pts = new THREE.Points(pg, new THREE.ShaderMaterial({
    transparent:true, depthWrite:false,
    uniforms:{ uTime:{value:0}, uColor:{value:FOREST}, uDpr:{value:Math.min(devicePixelRatio,2)} },
    vertexShader:`
      attribute float aSize; uniform float uTime; uniform float uDpr;
      varying float vFade;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position,1.0);
        vFade = smoothstep(-2.4, 2.4, mv.z);
        float pulse = .82 + .18*sin(uTime*1.1 + position.y*2.4 + position.x*1.7);
        gl_PointSize = aSize * pulse * uDpr * (9.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader:`
      uniform vec3 uColor; varying float vFade;
      void main(){
        float d = length(gl_PointCoord - .5);
        if(d > .5) discard;
        float a = smoothstep(.5,.12,d) * mix(.16,1.0,vFade);
        gl_FragColor = vec4(uColor, a);
      }`
  }));
  root.add(pts);

  /* ---- graticule ---- */
  const gmat = new THREE.LineBasicMaterial({color:MOSS, transparent:true, opacity:.34});
  for(let k=-4;k<=4;k++){
    const lat = (k/5)*Math.PI/2, rr = Math.cos(lat)*R, yy = Math.sin(lat)*R, p=[];
    for(let a=0;a<=128;a++){ const t=a/128*Math.PI*2; p.push(new THREE.Vector3(Math.cos(t)*rr, yy, Math.sin(t)*rr)); }
    root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(p), gmat));
  }
  for(let k=0;k<12;k++){
    const lon = k/12*Math.PI*2, p=[];
    for(let a=0;a<=128;a++){
      const t = -Math.PI/2 + a/128*Math.PI;
      p.push(new THREE.Vector3(Math.cos(t)*Math.cos(lon)*R, Math.sin(t)*R, Math.cos(t)*Math.sin(lon)*R));
    }
    root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(p), gmat));
  }

  /* ---- cities ---- */
  const toVec = (latDeg, lonDeg, rad=R) => {
    const la = latDeg*Math.PI/180, lo = lonDeg*Math.PI/180;
    return new THREE.Vector3(Math.cos(la)*Math.cos(lo)*rad, Math.sin(la)*rad, Math.cos(la)*Math.sin(lo)*rad);
  };
  const TLV = toVec(...CITIES['Tel Aviv']);
  const TYO = toVec(...CITIES['Tokyo']);

  marks.map(n=>toVec(...CITIES[n])).forEach(v=>{
    const m = new THREE.Mesh(new THREE.SphereGeometry(.055,20,20), new THREE.MeshBasicMaterial({color:RED}));
    m.position.copy(v); root.add(m);
    const ring = new THREE.Mesh(new THREE.RingGeometry(.09,.105,48), new THREE.MeshBasicMaterial({color:RED, transparent:true, opacity:.55, side:THREE.DoubleSide}));
    ring.position.copy(v); ring.lookAt(0,0,0); root.add(ring);
    ring.userData.pulse = true; root.userData.rings = (root.userData.rings||[]).concat(ring);
  });

  /* ---- great-circle arcs from Tel Aviv ---- */
  const STEPS=180;
  const mkArc = (a,b)=>{
    const p=[];
    for(let i=0;i<=STEPS;i++){
      const t=i/STEPS;
      const v = new THREE.Vector3().copy(a).lerp(b,t).normalize();
      p.push(v.multiplyScalar(R*(1 + Math.sin(Math.PI*t)*0.30)));
    }
    root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(p),
      new THREE.LineBasicMaterial({color:RED, transparent:true, opacity:.5})));
    return p;
  };
  const arcPts = mkArc(TLV, TYO);
  marks.filter(n=>n!=='Tel Aviv' && n!=='Tokyo').forEach(n=> mkArc(TLV, toVec(...CITIES[n])));

  /* travelling comet along the arc */
  const comet = new THREE.Mesh(new THREE.SphereGeometry(.05,16,16), new THREE.MeshBasicMaterial({color:RED}));
  root.add(comet);
  const trailN = 34;
  const trailGeo = new THREE.BufferGeometry();
  trailGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(trailN*3),3));
  const trail = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({color:RED, transparent:true, opacity:.85}));
  root.add(trail);

  root.rotation.y = -1.32; root.rotation.x = .22;

  /* ---- interaction ---- */
  const target = {x:0,y:0}; const cur = {x:0,y:0};
  window.addEventListener('pointermove', e=>{
    target.x = (e.clientX/innerWidth - .5);
    target.y = (e.clientY/innerHeight - .5);
  }, {passive:true});

  function resize(){
    const p = canvas.parentElement;
    const w = p.clientWidth, h = p.clientHeight;
    renderer.setSize(w,h,false);
    cam.aspect = w/h; cam.updateProjectionMatrix();
    const s = Math.min(1, w/900);
    root.scale.setScalar(.72 + s*.28);
    sun.scale.setScalar(.72 + s*.28);
    halo.scale.setScalar(.72 + s*.28);
  }
  new ResizeObserver(resize).observe(canvas.parentElement); resize();

  let t0 = performance.now();
  (function loop(now){
    requestAnimationFrame(loop);
    const t = (now-t0)/1000;
    if(!reduce) root.rotation.y += .0016;
    cur.x += (target.x-cur.x)*.045; cur.y += (target.y-cur.y)*.045;
    root.rotation.x = .22 + cur.y*.28;
    root.position.x = cur.x*.30;
    pts.material.uniforms.uTime.value = t;
    sun.material.opacity = .88 + Math.sin(t*.7)*.05;

    const tt = (((t*.11)%1)+1)%1;
    const idx = Math.max(0, Math.min(STEPS, Math.floor(tt*STEPS)));
    comet.position.copy(arcPts[idx]);
    const tp = trailGeo.attributes.position.array;
    for(let i=0;i<trailN;i++){
      const j = Math.max(0, Math.min(STEPS, idx - i*2));
      tp[i*3]=arcPts[j].x; tp[i*3+1]=arcPts[j].y; tp[i*3+2]=arcPts[j].z;
    }
    trailGeo.attributes.position.needsUpdate = true;

    (root.userData.rings||[]).forEach((r,i)=>{
      const s = 1 + (Math.sin(t*1.6 + i*1.6)*.5+.5)*1.5;
      r.scale.setScalar(s); r.material.opacity = .55*(1 - (s-1)/1.5);
    });

    renderer.render(scene, cam);
  })(performance.now());
}
