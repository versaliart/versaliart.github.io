// v2.5


(function(){
  const TARGETS = [
    { sel: '#block-yui_3_17_2_1_1756944426569_9957', randomize: 0.30, jitterRem: 0.30, fallback: 'ellipse' } // 'ellipse' | 'rect'
  ];
  if (!TARGETS.length) return;

  // ---------- utils ----------
  function onReady(fn){ if (document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn, { once:true }); }
  function whenSelector(sel, cb){
    const el = document.querySelector(sel);
    if (el) return cb(el);
    const mo = new MutationObserver(() => {
      const n = document.querySelector(sel);
      if (n){ mo.disconnect(); cb(n); }
    });
    mo.observe(document.documentElement, { childList:true, subtree:true });
  }
  const root = document.documentElement, body = document.body;
  const remPx = () => parseFloat(getComputedStyle(root).fontSize) || 16;
  const clamp01 = v => Math.max(0, Math.min(1, v));
  const lerp = (a,b,t) => a + (b-a)*t;
  const rand = (a,b) => a + Math.random()*(b-a);
  function cssNum(fromEl, name, fallback){
    const v = getComputedStyle(fromEl).getPropertyValue(name).trim();
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : fallback;
  }
  function svgToClient(svg, x, y){
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const pt = svg.createSVGPoint(); pt.x = x; pt.y = y;
    const o = pt.matrixTransform(ctm);
    if (!Number.isFinite(o.x) || !Number.isFinite(o.y)) return null;
    return { x:o.x, y:o.y };
  }
  const ro = new ResizeObserver(entries => {
    for (const e of entries){
      const cb = e.target.__edgeCb;
      if (!cb) continue;
      clearTimeout(e.target.__edgeTo);
      e.target.__edgeTo = setTimeout(cb, 120);
    }
  });
  function observeResize(el, cb){ el.__edgeCb = cb; ro.observe(el); }
  function watchHost(host, cb){
    const mo = new MutationObserver(muts => {
      let relevant = false;
      for (const m of muts){
        if (m.type === 'childList') { relevant = true; break; }
        if (m.type === 'attributes' && (m.attributeName === 'style' || m.attributeName === 'class')) { relevant = true; break; }
      }
      if (!relevant) return;
      clearTimeout(host.__edgeMoT);
      host.__edgeMoT = setTimeout(cb, 120);
    });
    mo.observe(host, { childList:true, subtree:true, attributes:true, attributeFilter:['style','class'] });
    host.__edgeMo = mo;
  }
  function rateLimited(fn, gapMs){
    let last = 0;
    return function(){
      const now = performance.now();
      if (now - last < gapMs) return;
      last = now; fn();
    };
  }
  function ensureLayer(host){
    let layer = host.querySelector(':scope > .shape-edge-sparkles');
    if (!layer){
      layer = document.createElement('div');
      layer.className = 'shape-edge-sparkles';
      host.appendChild(layer);
    }
    const st = layer.style;
    st.position = 'absolute';
    st.left = '0'; st.top = '0'; st.right = '0'; st.bottom = '0';
    st.pointerEvents = 'none';
    st.zIndex = '2';
    return layer;
  }
  function readyToDraw(host){
    if (!host) return false;
    const r = host.getBoundingClientRect();
    return r.width >= 4 && r.height >= 4;
  }
  function nextFrame2(fn){ requestAnimationFrame(() => requestAnimationFrame(fn)); }

  // ---------- perimeter samplers (fallback) ----------
  function sampleEllipsePerimeter(rect, t){ // t in [0,1)
    const cx = rect.left + rect.width/2;
    const cy = rect.top  + rect.height/2;
    // use an approximate ellipse aligned to the box
    const rx = rect.width/2, ry = rect.height/2;
    const theta = t * Math.PI * 2;
    return { x: cx + rx * Math.cos(theta), y: cy + ry * Math.sin(theta) };
  }
  function sampleRectPerimeter(rect, t){ // t in [0,1)
    const per = 2*(rect.width + rect.height);
    const d = t * per;
    if (d <= rect.width)                      return { x: rect.left + d,         y: rect.top };
    if (d <= rect.width + rect.height)        return { x: rect.right,            y: rect.top + (d - rect.width) };
    if (d <= rect.width*2 + rect.height)      return { x: rect.right - (d - rect.width - rect.height), y: rect.bottom };
    return { x: rect.left, y: rect.bottom - (d - rect.width*2 - rect.height) };
  }

  // ---------- core builder ----------
  function buildFor(target, attempt=0){
    const host = document.querySelector(target.sel);
    if (!host) return;

    if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
    if (!readyToDraw(host)){
      if (attempt < 40) return setTimeout(() => buildFor(target, attempt+1), 100);
      return;
    }

    const svg = host.querySelector('svg');          // inline SVG (ideal)
    const img = !svg ? host.querySelector('img') : null;  // common Shape Block variant

    // Decide mode
    let mode = 'box';          // default fallback
    let path = null;
    if (svg){
      path = svg.querySelector('path'); // only real path (no synthetic)
      if (path) mode = 'svg';
    }else if (img){
      mode = 'box';
    }

    const layer = ensureLayer(host);
    const count   = Math.max(0, Math.round(cssNum(body,'--star-count', 40)));
    const durMin  = cssNum(body,'--twinkle-min', 0.5);
    const durMax  = cssNum(body,'--twinkle-max', 2.0);
    const opMin   = cssNum(body,'--opacity-min', 0.15);
    const opMax   = cssNum(body,'--opacity-max', 1.00);
    const blurMax = cssNum(body,'--max-blur', 0.12);
    const phi     = cssNum(body,'--phi', 1.618);
    const sizeL   = cssNum(root,'--size-large', 1.5);
    const sizeM   = sizeL / (phi || 1.618);
    const sizeS   = sizeM / (phi || 1.618);
    const randomize = clamp01(target.randomize ?? 0.30);
    const jitterPx  = (target.jitterRem ?? 0.30) * remPx();

    // Signature (avoid redraw if nothing changed)
    const hostRect = host.getBoundingClientRect();
    let sigParts = [ 'c:'+count, 'w:'+Math.round(hostRect.width), 'h:'+Math.round(hostRect.height) ];
    if (mode === 'svg'){
      const vb = svg.viewBox && svg.viewBox.baseVal ? svg.viewBox.baseVal : { x:0, y:0, width: svg.clientWidth, height: svg.clientHeight };
      const total = path.getTotalLength();
      sigParts.push('vbw:'+Math.round(vb.width), 'vbh:'+Math.round(vb.height), 'len:'+Math.round(total));
    } else {
      sigParts.push('mode:'+ (target.fallback || 'ellipse'));
    }
    const sig = sigParts.join('|');
    if (layer.dataset.sig === sig) return;
    layer.dataset.sig = sig;

    layer.innerHTML = '';

    // Place stars after geometry settles
    nextFrame2(() => {
      const layerRect = layer.getBoundingClientRect();

      for (let i = 0; i < count; i++){
        // even vs random distribution along perimeter
        const evenT = (i + 0.5) / count;
        const randT = Math.random();
        const t = (1 - randomize) * evenT + randomize * randT;

        let px = 0, py = 0;

        if (mode === 'svg' && svg && path){
          const total = path.getTotalLength();
          const d = (t * total) % total;
          const p  = path.getPointAtLength(d);
          const p2 = path.getPointAtLength((d + 0.5) % total);
          let nx = -(p2.y - p.y), ny = (p2.x - p.x);
          const nlen = Math.hypot(nx, ny) || 1; nx /= nlen; ny /= nlen;
          const j = (Math.random() < 0.5 ? -1 : 1) * rand(0, jitterPx);
          const scr = svgToClient(svg, p.x + nx*j, p.y + ny*j);
          if (!scr) continue;
          px = scr.x; py = scr.y;
        } else {
          // box perimeter fallback (ellipse or rect)
          const r = host.getBoundingClientRect();
          const hit = (target.fallback === 'rect') ? sampleRectPerimeter(r, t) : sampleEllipsePerimeter(r, t);
          // small outward jitter normal-ish: use angle for ellipse, segment for rect
          let jx = 0, jy = 0;
          if (target.fallback === 'rect'){
            // nudge outward from center
            const cx = r.left + r.width/2, cy = r.top + r.height/2;
            const vx = hit.x - cx, vy = hit.y - cy;
            const vlen = Math.hypot(vx, vy) || 1;
            jx = (vx / vlen) * rand(0, jitterPx); jy = (vy / vlen) * rand(0, jitterPx);
          } else {
            const theta = t * Math.PI * 2;
            jx = Math.cos(theta) * rand(0, jitterPx);
            jy = Math.sin(theta) * rand(0, jitterPx);
          }
          px = hit.x + jx; py = hit.y + jy;
        }

        const left = px - layerRect.left;
        const top  = py - layerRect.top;

        const r = Math.random();
        const sizeRem = r < 1/3 ? sizeS : (r < 2/3 ? sizeM : sizeL);
        const opacity = rand(opMin, opMax);
        const twDur   = rand(durMin, durMax);
        const twDelay = -Math.random() * twDur;
        const blurPx  = rand(0, blurMax * remPx());

        const star = document.createElement('span');
        star.className = 'star';
        star.style.position = 'absolute';
        star.style.left = left + 'px';
        star.style.top  = top  + 'px';
        star.style.transform = 'translate(-50%, -50%)';
        star.style.width = 'var(--size, 1rem)';
        star.style.height = 'var(--size, 1rem)';
        star.style.setProperty('--size',     sizeRem + 'rem');
        star.style.setProperty('--o',        opacity.toFixed(2));
        star.style.setProperty('--twinkle',  twDur.toFixed(2) + 's');
        star.style.setProperty('--tw-delay', twDelay.toFixed(2) + 's');
        star.style.setProperty('--blur',     blurPx.toFixed(2) + 'px');

        // minimal visuals if CSS hasn’t loaded yet
        star.style.background = 'currentColor';
        star.style.color = getComputedStyle(body).getPropertyValue('--star-color') || '#9989EC';
        star.style.willChange = 'opacity, transform';
        star.style.filter = 'drop-shadow(0 0 var(--blur,0) currentColor)';

        // animation via class if your CSS exists; otherwise opacity will still apply
        star.style.animation = 'twinkle var(--twinkle, 2s) ease-in-out var(--tw-delay,0s) infinite alternate';

        layer.appendChild(star);
      }

      // helpful diagnostics
      if (typeof console !== 'undefined'){
        console.info('[EdgeStars] mode:', mode, 'count:', count, 'target:', target.sel);
        if (mode !== 'svg'){ console.info('[EdgeStars] Using', (target.fallback || 'ellipse'), 'fallback (no inline <svg><path> found)'); }
      }
    });
  }

  const safeInitAll = rateLimited(initAll, 250);
  function initAll(){
    TARGETS.forEach(t => {
      const host = document.querySelector(t.sel);
      if (!host) return;
      buildFor(t, 0);
      const svg = host.querySelector('svg');
      if (svg) observeResize(svg,  safeInitAll);
      observeResize(host, safeInitAll);
      watchHost(host,     safeInitAll);
    });
  }

  onReady(() => {
    body.classList.add('has-starfield'); // ensures your CSS vars exist
    TARGETS.forEach(t => whenSelector(t.sel, () => safeInitAll()));
    window.addEventListener('load',   () => safeInitAll(), { passive:true });
    window.addEventListener('resize', () => safeInitAll(), { passive:true });
  });
})();
