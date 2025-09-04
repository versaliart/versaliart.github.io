// v2.6

(function(){
  const TARGETS = [
    {
      sel: '#block-yui_3_17_2_1_1756944426569_9957',
      randomize: 0.30,
      jitterRemMin: 0.10,   // min outward jitter (in rem)
      jitterRemMax: 0.35,   // max outward jitter (in rem)
      fallback: 'ellipse'   // used only if no inline <svg><path>; 'ellipse' | 'rect'
    }
  ];
  if (!TARGETS.length) return;

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

  function sampleEllipsePerimeter(rect, t){
    const cx = rect.left + rect.width/2;
    const cy = rect.top  + rect.height/2;
    const rx = rect.width/2, ry = rect.height/2;
    const theta = t * Math.PI * 2;
    return { x: cx + rx * Math.cos(theta), y: cy + ry * Math.sin(theta), theta };
  }
  function sampleRectPerimeter(rect, t){
    const per = 2*(rect.width + rect.height);
    const d = t * per;
    if (d <= rect.width)                      return { x: rect.left + d,         y: rect.top,    edge: 'top' };
    if (d <= rect.width + rect.height)        return { x: rect.right,            y: rect.top + (d - rect.width), edge: 'right' };
    if (d <= rect.width*2 + rect.height)      return { x: rect.right - (d - rect.width - rect.height), y: rect.bottom, edge: 'bottom' };
    return { x: rect.left, y: rect.bottom - (d - rect.width*2 - rect.height), edge: 'left' };
  }

  // Choose outward normal sign using isPointInFill when possible.
  function outwardSignSVG(path, svg, px, py, nx, ny){
    if (typeof path.isPointInFill === 'function'){
      const ptPlus = svg.createSVGPoint(); ptPlus.x = px + nx; ptPlus.y = py + ny;
      const ptMinus= svg.createSVGPoint(); ptMinus.x= px - nx; ptMinus.y= py - ny;
      const inPlus  = path.isPointInFill(ptPlus);
      const inMinus = path.isPointInFill(ptMinus);
      if (inPlus && !inMinus) return -1; // minus is outside
      if (!inPlus && inMinus) return +1; // plus is outside
      if (!inPlus && !inMinus) return +1; // both outside; just pick +1
      return +1; // both inside; default +1
    }
    // Fallback: use vector from shape center (approx via viewBox center)
    const vb = svg.viewBox && svg.viewBox.baseVal ? svg.viewBox.baseVal : {x:0,y:0,width:svg.clientWidth,height:svg.clientHeight};
    const cx = vb.x + vb.width/2, cy = vb.y + vb.height/2;
    const vx = px - cx, vy = py - cy;
    return (vx*nx + vy*ny) >= 0 ? +1 : -1; // if normal points away from center, treat as outward
  }

  function buildFor(target, attempt=0){
    const host = document.querySelector(target.sel);
    if (!host) return;

    if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
    if (!readyToDraw(host)){
      if (attempt < 40) return setTimeout(() => buildFor(target, attempt+1), 100);
      return;
    }

    const svg = host.querySelector('svg');
    const hasSVG = !!svg;
    const path = hasSVG ? svg.querySelector('path') : null;
    const mode = (hasSVG && path) ? 'svg' : 'box';

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
    const jMinPx  = (target.jitterRemMin ?? 0.10) * remPx();
    const jMaxPx  = Math.max(jMinPx, (target.jitterRemMax ?? 0.35) * remPx());

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

    nextFrame2(() => {
      const layerRect = layer.getBoundingClientRect();
      layer.innerHTML = '';

      if (mode === 'svg'){
        const total = path.getTotalLength();
        for (let i = 0; i < count; i++){
          const evenD = (i + 0.5) * (total / count);
          const randD = Math.random() * total;
          const d = (lerp(evenD, randD, randomize)) % total;

          const p  = path.getPointAtLength(d);
          const p2 = path.getPointAtLength((d + 0.75) % total);
          let nx = -(p2.y - p.y), ny = (p2.x - p.x);
          const nlen = Math.hypot(nx, ny) || 1; nx /= nlen; ny /= nlen;

          const sign = outwardSignSVG(path, svg, p.x, p.y, nx, ny);
          const j = sign * rand(jMinPx, jMaxPx);

          const scr = svgToClient(svg, p.x + nx*j, p.y + ny*j);
          if (!scr) continue;

          const left = scr.x - layerRect.left;
          const top  = scr.y  - layerRect.top;

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
          star.style.background = 'currentColor';
          star.style.color = getComputedStyle(body).getPropertyValue('--star-color') || '#9989EC';
          star.style.willChange = 'opacity, transform';
          star.style.filter = 'drop-shadow(0 0 var(--blur,0) currentColor)';
          star.style.animation = 'twinkle var(--twinkle, 2s) ease-in-out var(--tw-delay,0s) infinite alternate';
          layer.appendChild(star);
        }
      } else {
        // Fallback perimeter with outward jitter from the block’s center
        for (let i = 0; i < count; i++){
          const evenT = (i + 0.5) / count;
          const randT = Math.random();
          const t = (1 - randomize) * evenT + randomize * randT;

          const r = host.getBoundingClientRect();
          let hit, px, py, ox, oy;

          if ((target.fallback || 'ellipse') === 'rect'){
            hit = sampleRectPerimeter(r, t);
            const cx = r.left + r.width/2, cy = r.top + r.height/2;
            const vx = hit.x - cx, vy = hit.y - cy;
            const vlen = Math.hypot(vx, vy) || 1;
            const j = rand(jMinPx, jMaxPx);
            ox = (vx / vlen) * j; oy = (vy / vlen) * j;
            px = hit.x + ox; py = hit.y + oy;
          } else {
            hit = sampleEllipsePerimeter(r, t);
            const j = rand(jMinPx, jMaxPx);
            ox = Math.cos(hit.theta) * j; oy = Math.sin(hit.theta) * j;
            px = hit.x + ox; py = hit.y + oy;
          }

          const left = px - layerRect.left;
          const top  = py - layerRect.top;

          const rr = Math.random();
          const sizeRem = rr < 1/3 ? sizeS : (rr < 2/3 ? sizeM : sizeL);
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
          star.style.background = 'currentColor';
          star.style.color = getComputedStyle(body).getPropertyValue('--star-color') || '#9989EC';
          star.style.willChange = 'opacity, transform';
          star.style.filter = 'drop-shadow(0 0 var(--blur,0) currentColor)';
          star.style.animation = 'twinkle var(--twinkle, 2s) ease-in-out var(--tw-delay,0s) infinite alternate';
          layer.appendChild(star);
        }
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
    body.classList.add('has-starfield');
    TARGETS.forEach(t => whenSelector(t.sel, () => safeInitAll()));
    window.addEventListener('load',   () => safeInitAll(), { passive:true });
    window.addEventListener('resize', () => safeInitAll(), { passive:true });
  });
})();
