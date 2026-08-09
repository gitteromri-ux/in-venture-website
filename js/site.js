import { NAV, PORTFOLIO, TEAM } from './data.js';

/* ============ logo ============ */
const LOGO = `
<a href="index.html" class="brand" aria-label="IN Venture home">
  <svg width="46" height="34" viewBox="0 0 46 34" fill="none" aria-hidden="true">
    <circle cx="7.4" cy="5.2" r="4.4" fill="#E0202B"/>
    <rect x="1.6" y="12" width="4.4" height="21" fill="currentColor"/>
    <rect x="8.6" y="12" width="4.4" height="21" fill="currentColor"/>
    <path d="M18.6 33V12h4.6l12.4 14.1V12h4.6v21h-4.6L23.2 18.9V33h-4.6z" fill="currentColor" opacity=".42"/>
  </svg>
  <span class="brand-txt">IN&nbsp;Venture</span>
</a>`;

/* ============ header + drawer ============ */
export function mountChrome(active, onDark=false){
  const links = NAV.map(n=>`<a href="${n.href}"${n.label===active?' class="active"':''}>${n.label}</a>`).join('');
  document.body.insertAdjacentHTML('afterbegin', `
  <header class="hdr${onDark?' on-dark':''}">
    ${LOGO}
    <nav class="nav">${links}
      <button class="cmd-trigger" aria-label="Open command menu"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.6-3.6"/></svg><kbd>⌘K</kbd></button>
    </nav>
    <button class="burger" aria-label="Menu"><i></i><i></i></button>
  </header>
  <div class="drawer"><nav>${links}</nav></div>`);

  const hdr = document.querySelector('.hdr');
  document.querySelector('.burger').addEventListener('click', ()=>{
    document.body.classList.toggle('menu-open');
    document.body.classList.toggle('is-locked');
  });
  const darkSel = '.dark, .abyss, .bleed, [data-hdr="dark"]';
  const onScroll = ()=>{
    hdr.classList.toggle('stuck', scrollY > 40);
    const y = hdr.offsetHeight * 0.55;
    let over = onDark;
    document.querySelectorAll(darkSel).forEach(s=>{
      const r = s.getBoundingClientRect();
      if(r.top <= y && r.bottom >= y) over = true;
    });
    hdr.classList.toggle('on-dark', over);
  };
  addEventListener('scroll', onScroll, {passive:true});
  addEventListener('resize', onScroll, {passive:true});
  onScroll();

  mountFooter();
  mountPalette();
  mountCursor();
  mountReveals();
}

/* ============ footer ============ */
function mountFooter(){
  document.body.insertAdjacentHTML('beforeend', `
  <footer class="ftr">
    <div class="wrap">
      <div class="ftr-top">
        <div>
          <p class="display h2 ftr-line">Two clocks.<br><span class="italic">One desk.</span></p>
          <div class="ftr-clocks" id="ftrClocks"></div>
        </div>
        <div class="ftr-cols">
          <div><p class="tag">Navigate</p>${NAV.map(n=>`<a href="${n.href}">${n.label}</a>`).join('')}</div>
          <div><p class="tag">Visit</p>
            <a href="https://maps.google.com/?q=94+Yigal+Alon+Tel+Aviv" target="_blank" rel="noopener">94 Yigal Alon<br>Alon Tower 2, Floor 26<br>Tel Aviv, Israel 6789156</a>
          </div>
          <div><p class="tag">Write</p>
            <a href="mailto:contact@in-venture.com">contact@in-venture.com</a>
            <p class="tag" style="margin-top:1.6rem">Follow</p>
            <a href="https://www.linkedin.com/company/in-venture-sc/about/" target="_blank" rel="noopener">LinkedIn</a>
            <a href="https://twitter.com/INVenture12" target="_blank" rel="noopener">X / Twitter</a>
          </div>
        </div>
      </div>
      <hr class="rule-dark" style="margin:3.2rem 0 1.6rem">
      <div class="ftr-legal">
        <span>©2026 IN Venture</span>
        <span>A Sumitomo Corporation backed venture fund</span>
        <a href="legal.html">Japan disclosure</a>
      </div>
    </div>
  </footer>`);
  mountClocks(document.getElementById('ftrClocks'));
}

/* ============ dual clocks (brand metaphor) ============ */
export function mountClocks(host){
  if(!host) return;
  const cities = [{n:'Tel Aviv', tz:'Asia/Jerusalem'},{n:'Tokyo', tz:'Asia/Tokyo'}];
  host.innerHTML = cities.map(c=>`
    <div class="clock" data-tz="${c.tz}">
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r="47" class="c-face"/>
        ${Array.from({length:12},(_,i)=>{const a=i*30*Math.PI/180;
          return `<line x1="${50+Math.sin(a)*41}" y1="${50-Math.cos(a)*41}" x2="${50+Math.sin(a)*45}" y2="${50-Math.cos(a)*45}" class="c-tick"/>`}).join('')}
        <line class="c-h" x1="50" y1="50" x2="50" y2="27"/>
        <line class="c-m" x1="50" y1="50" x2="50" y2="16"/>
        <line class="c-s" x1="50" y1="54" x2="50" y2="14"/>
        <circle cx="50" cy="50" r="2.6" class="c-pin"/>
      </svg>
      <div class="clock-meta"><span class="clock-city">${c.n}</span><span class="clock-time"></span></div>
    </div>`).join('');
  const tick = ()=>{
    host.querySelectorAll('.clock').forEach(el=>{
      const tz = el.dataset.tz;
      const p = new Intl.DateTimeFormat('en-GB',{timeZone:tz,hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).formatToParts(new Date());
      const g = t => +p.find(x=>x.type===t).value;
      const h=g('hour'), m=g('minute'), s=g('second');
      el.querySelector('.c-h').style.transform = `rotate(${(h%12)*30 + m*.5}deg)`;
      el.querySelector('.c-m').style.transform = `rotate(${m*6 + s*.1}deg)`;
      el.querySelector('.c-s').style.transform = `rotate(${s*6}deg)`;
      el.querySelector('.clock-time').textContent = String(h).padStart(2,'0')+':'+String(m).padStart(2,'0');
    });
  };
  tick(); setInterval(tick, 1000);
}

/* ============ command palette (⌘K) ============ */
function mountPalette(){
  const items = [
    ...NAV.map(n=>({t:n.label, s:'Page', h:n.href})),
    ...PORTFOLIO.map(p=>({t:p.name, s:`${p.status} · ${p.sector}`, h:'portfolio.html#'+p.name.toLowerCase()})),
    ...TEAM.map(p=>({t:p.name, s:p.title, h:'team.html'})),
    {t:'Quantum Computing', s:'Insight · Eyal Rosner', h:'quantum-computing.html'},
    {t:'contact@in-venture.com', s:'Write to us', h:'mailto:contact@in-venture.com'},
    {t:'LinkedIn', s:'External', h:'https://www.linkedin.com/company/in-venture-sc/about/'},
    {t:'X / Twitter', s:'External', h:'https://twitter.com/INVenture12'},
    {t:'Sumitomo Corporation', s:'External', h:'https://www.sumitomocorp.com/en/jp'}
  ];
  document.body.insertAdjacentHTML('beforeend',`
  <div class="palette" id="palette" role="dialog" aria-modal="true" aria-label="Command menu">
    <div class="palette-box">
      <div class="palette-in">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.6-3.6"/></svg>
        <input type="text" placeholder="Search companies, people, pages" aria-label="Search" autocomplete="off">
        <kbd>ESC</kbd>
      </div>
      <ul class="palette-list"></ul>
    </div>
  </div>`);

  const pal = document.getElementById('palette');
  const input = pal.querySelector('input');
  const list = pal.querySelector('.palette-list');
  let idx = 0, view = items;

  const render = q=>{
    const s = q.trim().toLowerCase();
    view = s ? items.filter(i=>(i.t+' '+i.s).toLowerCase().includes(s)) : items;
    idx = 0;
    list.innerHTML = view.length
      ? view.map((i,k)=>`<li${k===0?' class="sel"':''}><a href="${i.h}"><span>${i.t}</span><em>${i.s}</em></a></li>`).join('')
      : `<li class="empty">No match. Write to <a href="mailto:contact@in-venture.com">contact@in-venture.com</a></li>`;
  };
  const sel = n=>{
    const li = list.querySelectorAll('li'); if(!li.length) return;
    idx = (n + li.length) % li.length;
    li.forEach((l,k)=>l.classList.toggle('sel', k===idx));
    li[idx].scrollIntoView({block:'nearest'});
  };
  const open = ()=>{ pal.classList.add('on'); document.body.classList.add('is-locked'); render(''); input.value=''; setTimeout(()=>input.focus(),60); };
  const close = ()=>{ pal.classList.remove('on'); document.body.classList.remove('is-locked'); };

  document.querySelectorAll('.cmd-trigger').forEach(b=>b.addEventListener('click', open));
  addEventListener('keydown', e=>{
    if((e.metaKey||e.ctrlKey) && e.key.toLowerCase()==='k'){ e.preventDefault(); pal.classList.contains('on')?close():open(); }
    if(!pal.classList.contains('on')) return;
    if(e.key==='Escape') close();
    if(e.key==='ArrowDown'){ e.preventDefault(); sel(idx+1); }
    if(e.key==='ArrowUp'){ e.preventDefault(); sel(idx-1); }
    if(e.key==='Enter'){ const a=list.querySelectorAll('li')[idx]?.querySelector('a'); if(a) a.click(); }
  });
  input.addEventListener('input', ()=>render(input.value));
  pal.addEventListener('click', e=>{ if(e.target===pal) close(); });
}

/* ============ magnetic cursor ============ */
function mountCursor(){
  if(matchMedia('(hover:none)').matches) return;
  const c = document.createElement('div'); c.className='cursor'; document.body.appendChild(c);
  let x=-50,y=-50,tx=-50,ty=-50;
  addEventListener('pointermove', e=>{ tx=e.clientX; ty=e.clientY; }, {passive:true});
  (function raf(){ x+=(tx-x)*.18; y+=(ty-y)*.18;
    c.style.transform=`translate3d(${x}px,${y}px,0) translate(-50%,-50%)`; requestAnimationFrame(raf); })();
  const grow = ()=>c.classList.add('big'), shrink = ()=>c.classList.remove('big');
  const bind = ()=> document.querySelectorAll('a,button,.pf-row,.hoverable').forEach(el=>{
    if(el.dataset.cur) return; el.dataset.cur='1';
    el.addEventListener('pointerenter',grow); el.addEventListener('pointerleave',shrink);
  });
  bind(); new MutationObserver(bind).observe(document.body,{childList:true,subtree:true});
}

/* ============ scroll reveals ============ */
export function mountReveals(){
  const io = new IntersectionObserver(es=>es.forEach(e=>{
    if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); }
  }), {threshold:.12, rootMargin:'0px 0px -8% 0px'});
  const scan = ()=> document.querySelectorAll('.rv:not(.in)').forEach((el,i)=>{
    if(!el.style.transitionDelay) el.style.transitionDelay = ((i%6)*70)+'ms';
    io.observe(el);
  });
  scan(); new MutationObserver(scan).observe(document.body,{childList:true,subtree:true});
}

/* ============ count-up stats ============ */
export function mountCounters(){
  const io = new IntersectionObserver(es=>es.forEach(e=>{
    if(!e.isIntersecting) return; io.unobserve(e.target);
    const el = e.target, to = parseFloat(el.dataset.to), dec = +(el.dataset.dec||0), t0 = performance.now(), dur = 1600;
    const step = n=>{ const p = Math.min(1,(n-t0)/dur), k = 1-Math.pow(1-p,3);
      el.textContent = (to*k).toFixed(dec).replace(/\B(?=(\d{3})+(?!\d))/g,',');
      if(p<1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }), {threshold:.5});
  document.querySelectorAll('[data-to]').forEach(el=>io.observe(el));
}
