// Starfield v2.3

(function(){
  // ---------- CONFIG: your exact Shape Block ID ----------
  const TARGETS = [
    { sel: '#block-yui_3_17_2_1_1756944426569_9957', randomize: 0.30, jitterRem: 0.30 }
  ];

  if (!TARGETS.length) return;

  // ---------- Utilities ----------
  function onReady(fn){
    if (document.readyState !== 'loading') { fn(); }
    else document.addEventListener('DOMContentLoaded', fn, { once: true });
  }

  // Wait for a selector to exist (covers editor/lazy DOM swaps)
  function whenSelector(sel, cb){
    const el = document.querySelector(sel);
    if (el) return cb(el);
    const mo = new MutationObserver(() => {
      const n = document.querySelector(sel);
      if (n){ mo.disconnect(); cb(n); }
    });
    mo.observe(document.documentElement, { childList:true, subtree:true });
  }

  const root = document.documentElement;
  const body = document.body;
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
    const pt = svg.createSVGPoint();
    pt.x = x; pt.y = y;
    const o = pt.matrixTransform(svg.getScreenCTM());
    return { x: o.x, y: o.y };
  }

  // Debounced/Rate-limited wrapper to avoid thrash
  function rateLimited(fn, minGapMs){
    let last = 0, raf = 0;
    return function(){
      const now = performance.now();
      if (now - last < minGapMs){
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {});
        return;
      }
      last = now;
      fn();
    };
  }

  // Per-element ResizeObserver (debounced) — we will NOT observe our own layer
  const ro = new ResizeObserver(entries => {
    for (const e of entries){
      const cb = e.target.__edgeCb;
      if (!cb) continue;
      clearTimeout(e.target.__edgeTo);
      e.target.__edgeTo = setTimeout(cb, 120);
    }
  });
  function observeResize(el, cb){ el.__edgeCb = cb; ro.observe(el); }

  // Narrow MutationObserver to each host (not document.body)
  function watchHost(host, cb){
    const mo = new MutationObserver(() => {
      clearTimeout(host.__edgeMoT);
      host.__edgeMoT = setTimeout(cb, 120);
    });
    mo.observe(host, { childList:true, subtree:true });
    host.__edgeMo = mo;
  }

  // Discover a <path>; if absent, synthesize one from circle/ellipse/polygon/polyline
  function ensurePath(svg){
    let path = svg.querySelector('path');
    if (path) return path;

    const circ = svg.querySelector('circle, ellipse');
    if (circ){
      const cx = +circ.getAttribute('cx') || 0;
      const cy = +circ.getAttribute('cy') || 0;
      const rx = +(circ.getAttribute('rx') || circ.getAttribute('r') || 0);
      const ry = +(circ.getAttribute('ry') || circ.getAttribute('r') || 0);
      const d = `M ${cx-rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx+rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx-rx} ${cy} Z`;
      path = document.createElementNS('http://www.w3.org/2000/svg','path');
      path.setAttribute('d', d);
      svg.appendChild(path);
      return path;
    }

    const poly = svg.querySelector('polygon, polyline');
    if (poly){
      const pts = (poly.getAttribute('points')||'').trim().replace(/\s+/g,' ').trim();
      const d = 'M ' + pts.replace(/ /g,' L ') + (poly.tagName === 'polygon' ? ' Z' : '');
      path = document.createElementNS('http://www.w3.org/2000/svg','path');
      path.setAttribute('d', d);
      svg.appendChild(path);
      return path;
    }

    return null;
  }

  // ---------- Core builder with signature guard ----------
  function buildFor(target){
    const host = document.querySelector(target.sel);
    if (!host) return;

    if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
    const svg = host.querySelector('svg');
    if (!svg) return;

    const path = ensurePath(svg);
    if (!path) return;

    // Edge layer (we do NOT observe this element)
    let layer = host.querySelector(':scope > .shape-edge-sparkles');
    if (!layer){
      layer = document.createElement('div');
      layer.className = 'shape-edge-sparkles';
      host.appendChild(layer);
    }

    // Read variables (inherit from your CSS)
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

    const total = path.getTotalLength();
    if (!total) return;

    // ----- signature: if unchanged, keep existing stars (no reset) -----
    const vb = svg.viewBox && svg.viewBox.baseVal ? svg.viewBox.baseVal : { x:0, y:0, width: svg.clientWidth, height: svg.clientHeight };
    const hostRect = host.getBoundingClientRect();
    const sig = [
      count,
      Math.round(hostRect.width), Math.round(hostRect.height),
      Math.round(vb.width), Math.round(vb.height),
      Math.round(total),
      Math.round((window.devicePixelRatio || 1) * 100)
    ].join('|');

    if (layer.dataset.sig === sig) return;   // nothing significant changed
    layer.dataset.sig = sig;

    // ----- (re)build only now -----
    layer.innerHTML = '';
    const layerRect = layer.getBoundingClientRect();

    for (let i = 0; i < count; i++){
      // arc-length choice: blend even spacing with random to avoid patterns
      const evenD = (i + 0.5) * (total / count);
      const randD = Math.random() * total;
      const d = (lerp(evenD, randD, randomize)) % total;

      const p  = path.getPointAtLength(d);
      const p2 = path.getPointAtLength((d + 0.5) % total);

      // normal (perpendicular to tangent)
      let nx = -(p2.y - p.y), ny = (p2.x - p.x);
      const nlen = Math.hypot(nx, ny) || 1; nx /= nlen; ny /= nlen;

      // inward/outward jitter
      const j = (Math.random() < 0.5 ? -1 : 1) * rand(0, jitterPx);
      const scr = svgToClient(svg, p.x + nx*j, p.y + ny*j);

      const left = scr.x - layerRect.left;
      const top  = scr.y - layerRect.top;

      // star element — quantized sizes + negative delay to desync twinkle
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
      star.style.setProperty('--size',    sizeRem + 'rem');
      star.style.setProperty('--o',       opacity.toFixed(2));
      star.style.setProperty('--twinkle', twDur.toFixed(2) + 's');
      star.style.setProperty('--tw-delay', twDelay.toFixed(2) + 's');
      star.style.setProperty('--blur',    blurPx.toFixed(2) + 'px');

      layer.appendChild(star);
    }
  }

  // ---------- Init wiring ----------
  const initAll = () => {
    TARGETS.forEach(t => {
      const host = document.querySelector(t.sel);
      if (!host) return;
      buildFor(t);

      // Observe only host + its SVG for resizes/DOM swaps
      const svg = host.querySelector('svg');
      if (svg) observeResize(svg,  safeInitAll);
      observeResize(host, safeInitAll);
      watchHost(host,     safeInitAll);
    });
  };

  const safeInitAll = rateLimited(initAll, 250);

  onReady(() => {
    // Ensure CSS vars apply
    body.classList.add('has-starfield');

    // Wait for the specific host to exist once; then wire everything
    TARGETS.forEach(t => {
      whenSelector(t.sel, () => { safeInitAll(); });
    });

    // One more pass after load (covers late layout)
    window.addEventListener('load', () => safeInitAll(), { passive:true });
    // Light resize handling (rate-limited)
    window.addEventListener('resize', () => safeInitAll(), { passive:true });
  });
})();