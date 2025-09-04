(function(){
  const TARGETS = [
    { sel: '#block-yui_3_17_2_1_1756944426569_9957', randomize: 0.30, jitterRem: 0.30 }
  ];
  if (!TARGETS.length) return;

  function onReady(fn){
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn, { once:true });
  }
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
    const mo = new MutationObserver(() => {
      clearTimeout(host.__edgeMoT);
      host.__edgeMoT = setTimeout(cb, 120);
    });
    mo.observe(host, { childList:true, subtree:true });
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

  function ensurePath(svg){
    let path = svg.querySelector('path');
    if (path) return path;
    const circ = svg.querySelector('circle, ellipse');
    if (circ){
      const cx = +circ.getAttribute('cx') || 0;
      const cy = +circ.getAttribute('cy') || 0;
      const rx = +(circ.getAttribute('rx') || circ.getAttribute('r') || 0);
      const ry = +(circ.getAttribute('ry') || circ.getAttribute('r') || 0);
      if (!rx || !ry) return null;
      const d = `M ${cx-rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx+rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx-rx} ${cy} Z`;
      path = document.createElementNS('http://www.w3.org/2000/svg','path');
      path.setAttribute('d', d);
      svg.appendChild(path);
      return path;
    }
    const poly = svg.querySelector('polygon, polyline');
    if (poly){
      const pts = (poly.getAttribute('points')||'').trim().replace(/\s+/g,' ').trim();
      if (!pts) return null;
      const d = 'M ' + pts.replace(/ /g,' L ') + (poly.tagName === 'polygon' ? ' Z' : '');
      path = document.createElementNS('http://www.w3.org/2000/svg','path');
      path.setAttribute('d', d);
      svg.appendChild(path);
      return path;
    }
    return null;
  }

  function readyToDraw(host, svg){
    if (!host || !svg) return false;
    const r = host.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) return false;
    const ctm = svg.getScreenCTM();
    if (!ctm || !Number.isFinite(ctm.a)) return false;
    return true;
  }

  function buildFor(target, attempt=0){
    const host = document.querySelector(target.sel);
    if (!host) return;

    if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
    const svg = host.querySelector('svg');
    if (!svg){
      if (attempt < 30) return setTimeout(() => buildFor(target, attempt+1), 100);
      return;
    }
    if (!readyToDraw(host, svg)){
      if (attempt < 30) return setTimeout(() => buildFor(target, attempt+1), 100);
      return;
    }

    const path = ensurePath(svg);
    if (!path){
      if (attempt < 30) return setTimeout(() => buildFor(target, attempt+1), 120);
      return;
    }
    const total = path.getTotalLength();
    if (!Number.isFinite(total) || total <= 0){
      if (attempt < 30) return setTimeout(() => buildFor(target, attempt+1), 120);
      return;
    }

    let layer = host.querySelector(':scope > .shape-edge-sparkles');
    if (!layer){
      layer = document.createElement('div');
      layer.className = 'shape-edge-sparkles';
      host.appendChild(layer);
    }

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

    const vb = svg.viewBox && svg.viewBox.baseVal ? svg.viewBox.baseVal : { x:0, y:0, width: svg.clientWidth, height: svg.clientHeight };
    const hostRect = host.getBoundingClientRect();
    const sig = [
      count,
      Math.round(hostRect.width), Math.round(hostRect.height),
      Math.round(vb.width), Math.round(vb.height),
      Math.round(total),
      Math.round((window.devicePixelRatio || 1) * 100)
    ].join('|');
    if (layer.dataset.sig === sig) return;
    layer.dataset.sig = sig;

    layer.innerHTML = '';
    const layerRect = layer.getBoundingClientRect();

    for (let i = 0; i < count; i++){
      const evenD = (i + 0.5) * (total / count);
      const randD = Math.random() * total;
      const d = (lerp(evenD, randD, randomize)) % total;
      const p  = path.getPointAtLength(d);
      const p2 = path.getPointAtLength((d + 0.5) % total);
      let nx = -(p2.y - p.y), ny = (p2.x - p.x);
      const nlen = Math.hypot(nx, ny) || 1; nx /= nlen; ny /= nlen;
      const j = (Math.random() < 0.5 ? -1 : 1) * rand(0, jitterPx);
      const scr = svgToClient(svg, p.x + nx*j, p.y + ny*j);
      if (!scr){ continue; }
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
      star.style.left = left + 'px';
      star.style.top  = top  + 'px';
      star.style.setProperty('--size',     sizeRem + 'rem');
      star.style.setProperty('--o',        opacity.toFixed(2));
      star.style.setProperty('--twinkle',  twDur.toFixed(2) + 's');
      star.style.setProperty('--tw-delay', twDelay.toFixed(2) + 's');
      star.style.setProperty('--blur',     blurPx.toFixed(2) + 'px');
      layer.appendChild(star);
    }
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
