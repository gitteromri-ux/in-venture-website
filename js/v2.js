/* IN VENTURE V2 — motion system.
   Preloader, curtain, magnetic cursor, Lenis smooth scroll, GSAP scroll choreography. */

export function initV2({ onProgress, onReady } = {}){
  document.body.classList.add('v2');
  mountPreloader(onReady);
  mountCursor();
  return mountMotion(onProgress);
}

/* ---------------- preloader ---------------- */
function mountPreloader(onReady){
  const el = document.createElement('div');
  el.className = 'pre';
  el.innerHTML = `
    <div class="pre-inner">
      <svg class="pre-mark" viewBox="0 0 46 34" fill="none" aria-hidden="true">
        <circle cx="7.4" cy="5.2" r="4.4" fill="#FF2A31"/>
        <rect x="1.6" y="12" width="4.4" height="21" fill="#E8F3ED"/>
        <rect x="8.6" y="12" width="4.4" height="21" fill="#E8F3ED"/>
        <path d="M18.6 33V12h4.6l12.4 14.1V12h4.6v21h-4.6L23.2 18.9V33h-4.6z" fill="#E8F3ED" opacity=".42"/>
      </svg>
      <div class="pre-bar"><i></i></div>
      <span class="pre-n">000</span>
    </div>`;
  document.body.appendChild(el);
  const curtain = document.createElement('div');
  curtain.className = 'curtain';
  document.body.appendChild(curtain);
  setTimeout(()=>document.body.classList.remove('is-locked'), 1600);
  document.body.classList.add('is-locked');

  const bar = el.querySelector('.pre-bar i');
  const num = el.querySelector('.pre-n');
  const DUR = 1500, t0 = Date.now();
  let done = false;

  function finish(){
    if(done) return; done = true;
    bar.style.right = '0%'; num.textContent = '100';
    el.classList.add('gone');
    curtain.classList.add('up');
    document.body.classList.remove('is-locked');
    document.querySelectorAll('.ln').forEach((l,i)=> setTimeout(()=>l.classList.add('on'), 120 + i*105));
    setTimeout(()=>{ el.remove(); curtain.remove(); }, 1400);
    if(onReady) setTimeout(onReady, 120);
  }

  /* wall-clock driven so a busy main thread can never strand it */
  const tick = setInterval(()=>{
    const p = Math.min(1, (Date.now()-t0)/DUR);
    bar.style.right = ((1-p)*100)+'%';
    num.textContent = String(Math.floor(p*100)).padStart(3,'0');
    if(p >= 1){ clearInterval(tick); finish(); }
  }, 40);
  setTimeout(()=>{ clearInterval(tick); finish(); }, DUR + 900);
  setTimeout(finish, 2600);
}

/* ---------------- magnetic cursor ---------------- */
function mountCursor(){
  if(matchMedia('(hover:none)').matches) return;
  const c = document.createElement('div');
  c.className = 'cur';
  c.innerHTML = '<span class="cur-d"></span><span class="cur-r"></span>';
  document.body.appendChild(c);
  const dot = c.querySelector('.cur-d'), ring = c.querySelector('.cur-r');
  let mx=-400,my=-400, dx=-400,dy=-400, rx=-400,ry=-400;
  addEventListener('pointermove', e=>{ mx=e.clientX; my=e.clientY; c.classList.add('live'); }, {passive:true});
  (function raf(){
    dx += (mx-dx)*0.42; dy += (my-dy)*0.42;
    rx += (mx-rx)*0.13; ry += (my-ry)*0.13;
    dot.style.transform = `translate(${dx}px,${dy}px) translate(-50%,-50%)`;
    ring.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%)`;
    requestAnimationFrame(raf);
  })();
  const on = ()=>c.classList.add('hot'), off = ()=>c.classList.remove('hot');
  const bind = ()=> document.querySelectorAll('a,button,.hcard,.dcell,.pf-row').forEach(el=>{
    if(el.dataset.cb) return; el.dataset.cb='1';
    el.addEventListener('pointerenter', on); el.addEventListener('pointerleave', off);
  });
  bind(); new MutationObserver(bind).observe(document.body,{childList:true,subtree:true});
}

/* ---------------- scroll motion ---------------- */
function mountMotion(onProgress){
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const state = { y:0 };

  /* reveals */
  const io = new IntersectionObserver(es=>es.forEach(e=>{
    if(e.isIntersecting){ e.target.classList.add('on'); io.unobserve(e.target); }
  }), { threshold:0.14, rootMargin:'0px 0px -6% 0px' });
  const scan = ()=> document.querySelectorAll('.up:not(.on), .wipe:not(.on)').forEach((el,i)=>{
    if(!el.style.transitionDelay) el.style.transitionDelay = ((i%5)*80)+'ms';
    io.observe(el);
  });
  scan(); new MutationObserver(scan).observe(document.body,{childList:true,subtree:true});

  /* line reveals for non-hero headings */
  const lio = new IntersectionObserver(es=>es.forEach(e=>{
    if(!e.isIntersecting) return;
    lio.unobserve(e.target);
    e.target.querySelectorAll('.ln').forEach((l,i)=> setTimeout(()=>l.classList.add('on'), i*95));
  }), { threshold:0.3 });
  document.querySelectorAll('[data-lines]').forEach(el=>lio.observe(el));

  /* counters */
  const cio = new IntersectionObserver(es=>es.forEach(e=>{
    if(!e.isIntersecting) return; cio.unobserve(e.target);
    const el = e.target, to = parseFloat(el.dataset.to), t0 = performance.now(), dur = 1700;
    (function step(n){
      const p = Math.min(1,(n-t0)/dur), k = 1-Math.pow(1-p,3);
      el.textContent = Math.round(to*k).toLocaleString('en-US');
      if(p<1) requestAnimationFrame(step);
    })(t0);
  }), { threshold:0.5 });
  document.querySelectorAll('[data-to]').forEach(el=>cio.observe(el));

  /* raf-driven scroll effects */
  const hero = document.querySelector('.vhero');
  const pins = [...document.querySelectorAll('.pinwrap')];
  const hwrap = document.querySelector('.hwrap');
  const htrack = document.querySelector('.htrack');
  const hprog = document.querySelector('.hprog i');

  function frame(){
    requestAnimationFrame(frame);
    const y = scrollY;
    if(Math.abs(y - state.y) < 0.4 && !reduce) { /* still run, cheap */ }
    state.y = y;

    if(hero && onProgress){
      const h = hero.offsetHeight;
      onProgress(Math.max(0, Math.min(1, y / h)));
    }

    pins.forEach(w=>{
      const r = w.getBoundingClientRect();
      const total = w.offsetHeight - innerHeight;
      const p = Math.max(0, Math.min(1, -r.top / (total || 1)));
      const img = w.querySelector('.pin-media img');
      const body = w.querySelector('.pin-body');
      if(img) img.style.transform = `scale(${1.12 - p*0.10}) translateY(${(p-0.5)*-40}px)`;
      if(body){
        body.style.transform = `translateY(${(p-0.5)*-70}px)`;
        body.style.opacity = String(1 - Math.max(0, (p-0.72))*3.2);
      }
    });

    if(hwrap && htrack && innerWidth > 820){
      const r = hwrap.getBoundingClientRect();
      const total = hwrap.offsetHeight - innerHeight;
      const p = Math.max(0, Math.min(1, -r.top / (total || 1)));
      const dist = Math.max(0, htrack.scrollWidth - innerWidth + 80);
      htrack.style.transform = `translate3d(${-dist * p}px,0,0)`;
      if(hprog) hprog.style.right = (100 - p*100) + '%';
    }
  }
  frame();

  return state;
}
