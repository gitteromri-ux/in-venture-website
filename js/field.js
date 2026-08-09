/* Sector-tinted flow field — 2D canvas, cheap, motion-reduced aware.
   Used as the ground for the full-bleed rhetorical modules. */
const HUES = {
  energy:   ['#0E4A36','#1E7A55','#E0202B'],
  cyber:    ['#101B3A','#2E3A6B','#E0202B'],
  mobility: ['#0B2C3C','#1F5C7A','#E0202B'],
  health:   ['#2A0E15','#8A2A3B','#E0202B'],
  agtech:   ['#1B2409','#6B7A22','#E0202B']
};

export function initField(canvas, key='energy', overlay=true){
  if(!canvas) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ctx = canvas.getContext('2d');
  const [c1,c2,accent] = HUES[key] || HUES.energy;
  let w=0,h=0,dpr=Math.min(devicePixelRatio,2), P=[];

  function seed(){
    const n = Math.round((w*h)/5200);
    P = Array.from({length:Math.max(320, Math.min(2200,n))},()=>({
      x:Math.random()*w, y:Math.random()*h,
      s:.18+Math.random()*.7, o:.14+Math.random()*.55,
      r:Math.random()<.06
    }));
  }
  function resize(){
    const p = canvas.parentElement;
    w = p.clientWidth; h = p.clientHeight;
    canvas.width = w*dpr; canvas.height = h*dpr;
    canvas.style.width = w+'px'; canvas.style.height = h+'px';
    ctx.setTransform(dpr,0,0,dpr,0,0);
    seed(); paintBase();
  }
  function paintBase(){
    if(overlay){ ctx.clearRect(0,0,w,h); return; }
    const g = ctx.createLinearGradient(0,0,w,h);
    g.addColorStop(0,c1); g.addColorStop(1,c2);
    ctx.fillStyle = g; ctx.fillRect(0,0,w,h);
  }
  new ResizeObserver(resize).observe(canvas.parentElement); resize();

  let t = 0, run = false;
  new IntersectionObserver(es=>es.forEach(e=>{ run = e.isIntersecting; }),{threshold:.02}).observe(canvas);

  function noise(x,y,tt){
    return Math.sin(x*0.0021 + tt) * Math.cos(y*0.0026 - tt*0.7)
         + Math.sin((x+y)*0.0013 + tt*1.3)*0.6;
  }
  function frame(){
    requestAnimationFrame(frame);
    if(!run) return;
    t += reduce ? 0 : 0.0022;
    ctx.globalCompositeOperation='source-over';
    if(overlay){ ctx.clearRect(0,0,w,h); }
    else {
      const g = ctx.createLinearGradient(0,0,w,h);
      g.addColorStop(0,c1); g.addColorStop(1,c2);
      ctx.fillStyle = g; ctx.globalAlpha = .055; ctx.fillRect(0,0,w,h);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation='lighter';
    for(const p of P){
      const a = noise(p.x,p.y,t)*Math.PI;
      p.x += Math.cos(a)*p.s*1.6;
      p.y += Math.sin(a)*p.s*1.6;
      if(p.x<-10) p.x=w+10; if(p.x>w+10) p.x=-10;
      if(p.y<-10) p.y=h+10; if(p.y>h+10) p.y=-10;
      ctx.fillStyle = p.r ? accent : '#F2EDE3';
      ctx.globalAlpha = p.r ? p.o*1.5 : p.o*.9;
      ctx.fillRect(p.x, p.y, p.r ? 1.9 : 1.5, p.r ? 1.9 : 1.5);
    }
    ctx.globalAlpha = 1;
  }
  frame();
}
