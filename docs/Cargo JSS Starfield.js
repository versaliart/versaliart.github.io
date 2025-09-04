// v2.7

(function(){
  const TARGETS = [
    { sel: '#block-yui_3_17_2_1_1756944426569_9957', fallback: 'ellipse' }
  ];
  if (!TARGETS.length) return;

  function onReady(fn){ if (document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn, { once:true }); }
  function whenSelector(sel, cb){
    const el = document.querySelector(sel);
    if (el) return cb(el);
    const mo = new MutationObserver(() => { const n = document.querySelector(sel); if (n){ mo.disconnect(); cb(n); } });
    mo.observe(document.documentElement, { childList:true, subtree:true });
  }

  const root = document.documentElement, body = document.body;
  const remPx = () => parseFloat(getComputedStyle(root).fontSize) || 16;
  const clamp01 = v => Math.max(0, Math.min(1, v));
  const lerp = (a,b,t) => a + (b-a)*t;
  const rand = (a,b) => a + Math.random()*(b-a);

  function cssNum(fromEl, name, fallback){
    const v = getComputedStyle(fromEl).getPropertyValue(name).trim();
    if (!v) return fallback;
    const n = parseFloat(v);
    if (!Number.isFinite(n)) return fallback;
    if (v.endsWith('rem')) return n;            // caller decides to * remPx() when needed
    if (v.endsWith('px'))  return n / remPx();  // return as rem-equivalent where helpful
    return n;
  }

  function svgToClient(svg, x, y){
    const ctm = svg.getScreenCTM(); if (!ctm) return null;
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
      for (const m of muts){
        if (m.type === 'childList' || (m.type === 'attributes' && (m.attributeName === 'style' || m.attributeName === 'class'))){
          clearTimeout(host.__edgeMoT);
          host.__edgeMoT = setTimeout(cb, 120);
          break;
        }
      }
    });
    mo.observe(host, { childList:true, subtree:true, attributes:true, attributeFilter:['style','class'] });
    host.__edgeMo = mo;
  }
  function rateLimited(fn, gapMs){ let last = 0; return function(){ const now = performance.now(); if (now - last < gapMs) return; last = now; fn(); }; }
  function ensureLayer(host){
    let layer = host.querySelector(':scope > .shape-edge-sparkles');
    if (!layer){ layer = document.createElement('div'); layer.className = 'shape-edge-sparkles'; host.appendChild(layer); }
    const st = layer.style; st.position='absolute'; st.left='0'; st.top='0'; st.right='0'; st.bottom='0'; st.pointerEvents='none'; st.zIndex='2';
    return layer;
  }
  function readyToDraw(host){ const r = host?.getBoundingClientRect(); return !!r && r.width >= 4 && r.height >= 4; }
  function nextFrame2(fn){ requestAnimationFrame(() => requestAnimationFrame(fn)); }

  function sampleEllipsePerimeter(rect, t){
    const cx = rect.left + rect.width/2, cy = rect.top + rect.height/2;
    const rx = rect.width/2, ry = rect.height/2;
    const theta = t * Math.PI * 2;
    return { x: cx + rx * Math.cos(theta), y: cy + ry * Math.sin(theta), theta };
  }
  function sampleRectPerimeter(rect, t){
    const per = 2*(rect.width + rect.height), d = t * per;
    if (d <= rect.width)                      return { x: rect.left + d,         y: rect.top,    edge:'top' };
    if (d <= rect.width + rect.height)        return { x: rect.right,            y: rect.top + (d - rect.width), edge:'right' };
    if (d <= rect.width*2 + rect.height)      return { x: rect.right - (d - rect.width - rect.height), y: rect.bottom, edge:'bottom' };
    return { x: rect.left, y: rect.bottom - (d - rect.width*2 - rect.height), edge:'left' };
  }

  function outwardSignSVG(path, svg, px, py, nx, ny){
    if (typeof path.isPointInFill === 'function'){
      const plus = svg.createSVGPoint(); plus.x = px + nx; plus.y = py + ny;
      const minus= svg.createSVGPoint(); minus.x= px - nx; minus.y= py - ny;
      const inPlus  = path.isPointInFill(plus), inMinus = path.isPointInFill(minus);
      if (inPlus && !inMinus) return -1;
      if (!inPlus && inMinus) return +1;
      if (!inPlus && !inMinus) return +1;
      return +1;
    }
    const vb = svg.viewBox && svg.viewBox.baseVal ? svg.viewBox.baseVal : {x:0,y:0,width:svg.clientWidth,height:svg.clientHeight};
    const cx = vb.x + vb.width/2, cy = vb.y + vb.height/2;
    const vx = px - cx, vy = py - cy;
    return (vx*nx + vy*ny) >= 0 ? +1 : -1;
  }

  function chooseSizesPlan(total, sizeRems){
    const N = Math.max(0, total|0);
    const minL = Math.floor(N/6);
    const maxL = Math.floor(N/3);
    const wantL = (maxL >= minL) ? (minL + Math.floor(Math.random() * (maxL - minL + 1))) : minL;
    let remainingL = wantL;
    const plan = new Array(N);
    for (let i=0;i<N;i++){
      const remaining = N - i;
      const pL = remainingL > 0 ? (remainingL / remaining) : 0;  // ensures we hit wantL exactly if placement always succeeds
      const r = Math.random();
      let pick = null;
      if (r < pL){ pick = 'L'; remainingL--; }
      else { pick = (Math.random() < 0.5 ? 'M' : 'S'); }
      plan[i] = pick;
    }
    const map = { L: sizeRems.L, M: sizeRems.M, S: sizeRems.S };
    return { plan, wantL, minL, maxL, sizeOf: (k)=>map[k] };
  }

  function buildFor(target, attempt=0){
    const host = document.querySelector(target.sel);
    if (!host) return;

    if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
    if (!readyToDraw(host)){ if (attempt < 40) return setTimeout(() => buildFor(target, attempt+1), 100); return; }

    const svg = host.querySelector('svg');
    const path = svg ? svg.querySelector('path') : null;
    const mode = (svg && path) ? 'svg' : 'box';

    const layer = ensureLayer(host);

    const count   = Math.max(0, Math.round(parseFloat(getComputedStyle(body).getPropertyValue('--star-count')) || 40));
    const durMin  = parseFloat(getComputedStyle(body).getPropertyValue('--twinkle-min')) || 0.5;
    const durMax  = parseFloat(getComputedStyle(body).getPropertyValue('--twinkle-max')) || 2.0;
    const opMin   = parseFloat(getComputedStyle(body).getPropertyValue('--opacity-min')) || 0.15;
    const opMax   = parseFloat(getComputedStyle(body).getPropertyValue('--opacity-max')) || 1.00;
    const blurMax = parseFloat(getComputedStyle(body).getPropertyValue('--max-blur')) || 0.12;
    const phi     = parseFloat(getComputedStyle(body).getPropertyValue('--phi')) || 1.618;

    const sizeLrem = parseFloat(getComputedStyle(root).getPropertyValue('--size-large')) || 1.5;
    const sizeMrem = parseFloat(getComputedStyle(root).getPropertyValue('--size-medium')) || (sizeLrem / phi);
    const sizeSrem = parseFloat(getComputedStyle(root).getPropertyValue('--size-small'))  || (sizeMrem / phi);

    const jMinRem = parseFloat(getComputedStyle(body).getPropertyValue('--jitter-min')) || 0.10;
    const jMaxRem = parseFloat(getComputedStyle(body).getPropertyValue('--jitter-max')) || 0.35;
    const jMinPx  = jMinRem * remPx();
    const jMaxPx  = Math.max(jMinPx, jMaxRem * remPx());

    const randomize = clamp01(parseFloat(getComputedStyle(body).getPropertyValue('--star-randomize')) || 0.30);
    const cssGap = getComputedStyle(body).getPropertyValue('--star-min-gap').trim();
    const minGapPx = cssGap ? parseFloat(cssGap) * (cssGap.endsWith('rem') ? remPx() : 1) : 0;

    const hostRect = host.getBoundingClientRect();
    const sig = (() => {
      const parts = ['c:'+count, 'w:'+Math.round(hostRect.width), 'h:'+Math.round(hostRect.height), 'gap:'+Math.round(minGapPx)];
      if (mode === 'svg'){
        const vb = svg.viewBox && svg.viewBox.baseVal ? svg.viewBox.baseVal : { x:0, y:0, width: svg.clientWidth, height: svg.clientHeight };
        const total = path.getTotalLength();
        parts.push('vbw:'+Math.round(vb.width), 'vbh:'+Math.round(vb.height), 'len:'+Math.round(total));
      } else {
        parts.push('mode:'+(target.fallback || 'ellipse'));
      }
      return parts.join('|');
    })();
    if (layer.dataset.sig === sig) return;
    layer.dataset.sig = sig;

    nextFrame2(() => {
      const layerRect = layer.getBoundingClientRect();
      layer.innerHTML = '';

      const placed = []; // {x, y, r}
      function canPlace(x, y, r){
        for (let i=0;i<placed.length;i++){
          const p = placed[i];
          const dx = x - p.x, dy = y - p.y;
          const minD = p.r + r + minGapPx;
          if (dx*dx + dy*dy < minD*minD) return false;
        }
        return true;
      }
      function pushStar(x, y, sizeRem){
        const r = (sizeRem * remPx()) / 2;
        if (!canPlace(x, y, r)) return false;

        const opacity = rand(opMin, opMax);
        const twDur   = rand(durMin, durMax);
        const twDelay = -Math.random() * twDur;
        const blurPx  = rand(0, blurMax * remPx());

        const star = document.createElement('span');
        star.className = 'star';
        star.style.left = x + 'px';
        star.style.top  = y + 'px';
        star.style.setProperty('--size',     sizeRem + 'rem');
        star.style.setProperty('--o',        opacity.toFixed(2));
        star.style.setProperty('--twinkle',  twDur.toFixed(2) + 's');
        star.style.setProperty('--tw-delay', twDelay.toFixed(2) + 's');
        star.style.setProperty('--blur',     blurPx.toFixed(2) + 'px');
        layer.appendChild(star);

        placed.push({ x, y, r });
        return true;
      }

      const sizePlan = chooseSizesPlan(count, { L:sizeLrem, M:sizeMrem, S:sizeSrem });

      if (mode === 'svg'){
        const total = path.getTotalLength();
        for (let i = 0; i < count; i++){
          let ok = false, tries = 0;
          const tier = sizePlan.plan[i];
          const sizeRem = (tier === 'L') ? sizePlan.sizeOf('L') : (tier === 'M' ? sizePlan.sizeOf('M') : sizePlan.sizeOf('S'));

          while (!ok && tries < 80){
            tries++;
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
            if (!scr) break;

            const x = scr.x - layerRect.left;
            const y = scr.y - layerRect.top;
            ok = pushStar(x, y, sizeRem);
          }
          // If a Large fails to fit after many tries, it will be skipped.
          // On tight perimeters you may end below the requested Large quota.
        }
      } else {
        const rect = host.getBoundingClientRect();
        for (let i = 0; i < count; i++){
          let ok = false, tries = 0;
          const tier = sizePlan.plan[i];
          const sizeRem = (tier === 'L') ? sizePlan.sizeOf('L') : (tier === 'M' ? sizePlan.sizeOf('M') : sizePlan.sizeOf('S'));

          while (!ok && tries < 80){
            tries++;
            const evenT = (i + 0.5) / count;
            const randT = Math.random();
            const t = (1 - randomize) * evenT + randomize * randT;

            let px, py, ox, oy;
            if ((target.fallback || 'ellipse') === 'rect'){
              const hit = sampleRectPerimeter(rect, t);
              const cx = rect.left + rect.width/2, cy = rect.top + rect.height/2;
              const vx = hit.x - cx, vy = hit.y - cy;
              const vlen = Math.hypot(vx, vy) || 1;
              const j = rand(jMinPx, jMaxPx);
              ox = (vx / vlen) * j; oy = (vy / vlen) * j;
              px = hit.x + ox; py = hit.y + oy;
            } else {
              const hit = sampleEllipsePerimeter(rect, t);
              const j = rand(jMinPx, jMaxPx);
              ox = Math.cos(hit.theta) * j; oy = Math.sin(hit.theta) * j;
              px = hit.x + ox; py = hit.y + oy;
            }

            const x = px - layerRect.left;
            const y = py - layerRect.top;
            ok = pushStar(x, y, sizeRem);
          }
        }
      }

      // Optional: console.info('[EdgeStars] placed', placed.length, 'of', count, '| large quota', sizePlan.wantL, '∈ [', sizePlan.minL, ',', sizePlan.maxL, ']');
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
