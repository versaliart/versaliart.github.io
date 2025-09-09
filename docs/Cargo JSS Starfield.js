// v3.1 — Balanced Large distribution (min 1/4, max 1/3; 50/50 left/right; even spacing)

(function(){
  const TARGETS = [
    { sel: '#block-yui_3_17_2_1_1756944426569_9957', fallback: 'ellipse' } // 'ellipse' | 'rect'
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
  const rand = (a,b) => a + Math.random()*(b-a);
  const DEG = Math.PI / 180;

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
    return { x: cx + rx * Math.cos(theta), y: cy + ry * Math.sin(theta), theta, cx, cy };
  }
  function sampleRectPerimeter(rect, t){
    const per = 2*(rect.width + rect.height), d = t * per;
    let x, y;
    if (d <= rect.width)                      { x = rect.left + d;                y = rect.top; }
    else if (d <= rect.width + rect.height)   { x = rect.right;                   y = rect.top + (d - rect.width); }
    else if (d <= rect.width*2 + rect.height) { x = rect.right - (d - rect.width - rect.height); y = rect.bottom; }
    else                                      { x = rect.left;                    y = rect.bottom - (d - rect.width*2 - rect.height); }
    const cx = rect.left + rect.width/2, cy = rect.top + rect.height/2;
    return { x, y, cx, cy };
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

  function cosineWindow(distDeg, halfWidthDeg){
    if (distDeg >= halfWidthDeg) return 0;
    return 0.5 * (1 + Math.cos(Math.PI * (distDeg / halfWidthDeg)));
  }
  function makeAngleGate(strength, halfWidthDeg){
    const s = clamp01(strength || 0);
    const w = Math.max(0, halfWidthDeg || 0);
    return function accept(cx, cy, px, py){
      const ang = Math.atan2(py - cy, px - cx) / DEG;
      const a = (ang + 360) % 360;
      const dTop = Math.min(Math.abs(a - 90),  360 - Math.abs(a - 90));
      const dBot = Math.min(Math.abs(a - 270), 360 - Math.abs(a - 270));
      const penalty = Math.max(cosineWindow(dTop, w), cosineWindow(dBot, w));
      const acceptProb = 1 - s * penalty;
      return Math.random() < acceptProb;
    };
  }

  /* -------------------- NEW balanced size plan helpers -------------------- */
  function clampInt(n, lo, hi){ return Math.max(lo, Math.min(hi, n)); }

  function pickEvenlySpacedIndices(len, k){
    // return up to k distinct indices in [0..len-1], spaced as evenly as possible
    if (k <= 0 || len <= 0) return [];
    const out = [];
    const step = len / k;
    for (let i = 0; i < k; i++){
      const idx = Math.floor(i*step + step/2);
      out.push(Math.min(idx, len-1));
    }
    // de-dup pass for very small len/k
    const uniq = [];
    const seen = new Set();
    for (const i of out){ if (!seen.has(i)){ seen.add(i); uniq.push(i); } }
    return uniq;
  }

  function chooseSizesPlanBalanced(N){
    // Lcount: bounded to [ceil(N/4), floor(N/3)], target ~30%
    const minL = Math.ceil(N * 0.25);
    const maxL = Math.floor(N * (1/3));
    const target = Math.floor(N * 0.30);
    const Lcount = clampInt(target, minL, maxL);
    // Non-Large tiers (M/S) plan; keep roughly 60/40 by simple alternation
    const rest = N - Lcount;
    const restPlan = new Array(rest);
    let flip = 0; // 3/5 M, 2/5 S
    for (let i = 0; i < rest; i++){ restPlan[i] = (flip++ % 5 < 3) ? 'M' : 'S'; }
    return { Lcount, restPlan };
  }
  /* ----------------------------------------------------------------------- */

  function makeParamList(count, phase){
    const N = Math.max(0, count|0);
    const T = new Array(N);
    for (let i = 0; i < N; i++){
      T[i] = ((i + 0.5) / N + phase) % 1;
    }
    return T;
  }
  function angleDeg(cx, cy, px, py){
    const ang = Math.atan2(py - cy, px - cx) / DEG;
    return (ang + 360) % 360;
  }
  function avoidAngle(aDeg, widthDeg){
    const dTop = Math.min(Math.abs(aDeg - 90),  360 - Math.abs(aDeg - 90));
    const dBot = Math.min(Math.abs(aDeg - 270), 360 - Math.abs(aDeg - 270));
    return (dTop <= widthDeg) || (dBot <= widthDeg);
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

    const gcsBody = getComputedStyle(body), gcsRoot = getComputedStyle(root);
    const count   = Math.max(0, Math.round(parseFloat(gcsBody.getPropertyValue('--star-count')) || 40));
    const durMin  = parseFloat(gcsBody.getPropertyValue('--twinkle-min')) || 0.5;
    const durMax  = parseFloat(gcsBody.getPropertyValue('--twinkle-max')) || 2.0;
    const opMin   = parseFloat(gcsBody.getPropertyValue('--opacity-min')) || 0.15;
    const opMax   = parseFloat(gcsBody.getPropertyValue('--opacity-max')) || 1.00;
    const blurMax = parseFloat(gcsBody.getPropertyValue('--max-blur')) || 0.12;
    const phi     = parseFloat(gcsBody.getPropertyValue('--phi')) || 1.618;

    const sizeLrem = parseFloat(gcsRoot.getPropertyValue('--size-large'))  || 1.5;
    const sizeMrem = parseFloat(gcsRoot.getPropertyValue('--size-medium')) || (sizeLrem / phi);
    const sizeSrem = parseFloat(gcsRoot.getPropertyValue('--size-small'))  || (sizeMrem / phi);

    const jMinRem = parseFloat(gcsBody.getPropertyValue('--jitter-min')) || 0.10;
    const jMaxRem = parseFloat(gcsBody.getPropertyValue('--jitter-max')) || 0.35;
    const jMinPx  = jMinRem * remPx();
    const jMaxPx  = Math.max(jMinPx, jMaxRem * remPx());

    const randomize = clamp01(parseFloat(gcsBody.getPropertyValue('--star-randomize')) || 0.30);
    const seedVal = parseFloat(gcsBody.getPropertyValue('--star-seed')) || Math.random();
    const phase = seedVal - Math.floor(seedVal);

    const cssGap = gcsBody.getPropertyValue('--star-min-gap').trim();
    const minGapPx = cssGap ? parseFloat(cssGap) * (cssGap.endsWith('rem') ? remPx() : 1) : 0;

    const avoidStrength = clamp01(parseFloat(gcsBody.getPropertyValue('--avoid-vert-strength')) || 0);
    const avoidWidthDeg = Math.max(0, parseFloat(gcsBody.getPropertyValue('--avoid-vert-width-deg')) || 0);
    const angleGate = makeAngleGate(avoidStrength, avoidWidthDeg);

    const hostRect = host.getBoundingClientRect();
    const sig = (() => {
      const parts = [
        'c:'+count,'w:'+Math.round(hostRect.width),'h:'+Math.round(hostRect.height),'gap:'+Math.round(minGapPx),
        'avoid:'+avoidStrength.toFixed(2)+'@'+Math.round(avoidWidthDeg)
      ];
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

    function canPlace(placed, x, y, r){
      for (let i=0;i<placed.length;i++){
        const p = placed[i];
        const dx = x - p.x, dy = y - p.y;
        const minD = p.r + r + minGapPx;
        if (dx*dx + dy*dy < minD*minD) return false;
      }
      return true;
    }

    nextFrame2(() => {
      const layerRect = layer.getBoundingClientRect();
      layer.innerHTML = '';
      const placed = [];

      function pushStar(x, y, sizeRem, inlineStyles){
        const r = (sizeRem * remPx()) / 2;
        if (!canPlace(placed, x, y, r)) return false;

        const opacity = rand(opMin, opMax);
        const twDur   = rand(durMin, durMax);
        const twDelay = -Math.random() * twDur;
        const blurPx  = rand(0, blurMax * remPx());

        const star = document.createElement('span');
        star.className = 'star';
        star.style.left = x + 'px';
        star.style.top  = y + 'px';
        if (inlineStyles){
          star.style.position = 'absolute';
          star.style.transform = 'translate(-50%, -50%)';
          star.style.width = 'var(--size, 1rem)';
          star.style.height = 'var(--size, 1rem)';
          star.style.background = 'currentColor';
          star.style.color = getComputedStyle(body).getPropertyValue('--star-color') || '#9989EC';
          star.style.willChange = 'opacity, transform';
          star.style.filter = 'drop-shadow(0 0 var(--blur,0) currentColor)';
          star.style.animation = 'twinkle var(--twinkle, 2s) ease-in-out var(--tw-delay,0s) infinite alternate';
        }
        star.style.setProperty('--size',     sizeRem + 'rem');
        star.style.setProperty('--o',        opacity.toFixed(2));
        star.style.setProperty('--twinkle',  twDur.toFixed(2) + 's');
        star.style.setProperty('--tw-delay', twDelay.toFixed(2) + 's');
        star.style.setProperty('--blur',     blurPx.toFixed(2) + 'px');
        layer.appendChild(star);

        placed.push({ x, y, r });
        return true;
      }

      let svgCenter = null;
      if (mode === 'svg'){
        if (typeof path.getBBox === 'function'){
          const bb = path.getBBox();
          svgCenter = { x: bb.x + bb.width/2, y: bb.y + bb.height/2 };
        } else {
          const vb = svg.viewBox && svg.viewBox.baseVal ? svg.viewBox.baseVal : { x:0, y:0, width: svg.clientWidth, height: svg.clientHeight };
          svgCenter = { x: vb.x + vb.width/2, y: vb.y + vb.height/2 };
        }
      }
      const rectForBox = host.getBoundingClientRect();

      function tryPlaceAtT_SVG(t, sizeRem){
        const total = path.getTotalLength();
        const d = (t % 1) * total;
        const p  = path.getPointAtLength(d);
        if (avoidStrength > 0 && avoidWidthDeg > 0 && svgCenter){
          const a = angleDeg(svgCenter.x, svgCenter.y, p.x, p.y);
          if (avoidAngle(a, avoidWidthDeg)) return false;
        }
        const p2 = path.getPointAtLength((d + 0.75) % total);
        let nx = -(p2.y - p.y), ny = (p2.x - p.x);
        const nlen = Math.hypot(nx, ny) || 1; nx/=nlen; ny/=nlen;
        const sign = outwardSignSVG(path, svg, p.x, p.y, nx, ny);
        const j = sign * rand(jMinPx, jMaxPx);
        const scr = svgToClient(svg, p.x + nx*j, p.y + ny*j);
        if (!scr) return false;
        return pushStar(scr.x - layerRect.left, scr.y - layerRect.top, sizeRem, false);
      }
      function tryPlaceAtT_BOX(t, sizeRem){
        const rect = rectForBox;
        let hit;
        if ((target.fallback || 'ellipse') === 'rect'){
          hit = sampleRectPerimeter(rect, t);
        } else {
          hit = sampleEllipsePerimeter(rect, t);
        }
        const cx = hit.cx, cy = hit.cy, hx = hit.x, hy = hit.y;
        if (avoidStrength > 0 && avoidWidthDeg > 0){
          const a = angleDeg(cx, cy, hx, hy);
          if (avoidAngle(a, avoidWidthDeg)) return false;
        }
        let px, py;
        if ((target.fallback || 'ellipse') === 'rect'){
          const vx = hx - cx, vy = hy - cy;
          const vlen = Math.hypot(vx, vy) || 1;
          const j = rand(jMinPx, jMaxPx);
          px = hx + (vx/vlen)*j; py = hy + (vy/vlen)*j;
        } else {
          const j = rand(jMinPx, jMaxPx);
          px = hx + Math.cos(hit.theta)*j; py = hy + Math.sin(hit.theta)*j;
        }
        return pushStar(px - layerRect.left, py - layerRect.top, sizeRem, false);
      }
      function placeAtT(t, sizeRem){
        return (mode === 'svg') ? tryPlaceAtT_SVG(t, sizeRem) : tryPlaceAtT_BOX(t, sizeRem);
      }

      /* -------------------- NEW: side-aware Large selection -------------------- */
      const T_all = makeParamList(count, phase);
      const { Lcount, restPlan } = chooseSizesPlanBalanced(count);

      // classify each param t to LEFT / RIGHT buckets by x vs center
      const leftIdx = [];
      const rightIdx = [];

      for (let i = 0; i < T_all.length; i++){
        const t = T_all[i];
        if (mode === 'svg'){
          const total = path.getTotalLength();
          const d = (t % 1) * total;
          const p  = path.getPointAtLength(d);
          // svgCenter is in SVG coords; p.x also in SVG coords — compare directly
          const isLeft = svgCenter ? (p.x < svgCenter.x) : (i < T_all.length/2);
          (isLeft ? leftIdx : rightIdx).push(i);
        } else {
          const hit = (target.fallback || 'ellipse') === 'rect'
            ? sampleRectPerimeter(rectForBox, t)
            : sampleEllipsePerimeter(rectForBox, t);
          const isLeft = hit.x < hit.cx;
          (isLeft ? leftIdx : rightIdx).push(i);
        }
      }

      const LleftTarget  = Math.floor(Lcount / 2);
      const LrightTarget = Lcount - LleftTarget;

      let pickLeft  = pickEvenlySpacedIndices(leftIdx.length,  LleftTarget).map(j => leftIdx[j]);
      let pickRight = pickEvenlySpacedIndices(rightIdx.length, LrightTarget).map(j => rightIdx[j]);

      // If one side is short, borrow the remainder from the other side
      const deficitLeft  = LleftTarget  - pickLeft.length;
      const deficitRight = LrightTarget - pickRight.length;
      if (deficitLeft > 0 && rightIdx.length > pickRight.length){
        const extra = pickEvenlySpacedIndices(rightIdx.length, pickRight.length + deficitLeft).slice(pickRight.length);
        pickRight = pickRight.concat(extra.map(j => rightIdx[j]));
      }
      if (deficitRight > 0 && leftIdx.length > pickLeft.length){
        const extra = pickEvenlySpacedIndices(leftIdx.length, pickLeft.length + deficitRight).slice(pickLeft.length);
        pickLeft = pickLeft.concat(extra.map(j => leftIdx[j]));
      }

      const largeIndices = new Set([...pickLeft, ...pickRight]);

      /* -------------------- place Large first, spaced w/ jitter -------------------- */
      const usedIdx = new Set();
      if (largeIndices.size > 0){
        // place in an order that alternates sides to keep visual balance as we go
        const seq = [];
        const Larr = [...pickLeft], Rarr = [...pickRight];
        const maxLen = Math.max(Larr.length, Rarr.length);
        for (let i = 0; i < maxLen; i++){
          if (i < Larr.length) seq.push(Larr[i]);
          if (i < Rarr.length) seq.push(Rarr[i]);
        }
        for (const idx of seq){
          usedIdx.add(idx);
          const baseT = T_all[idx];
          let ok = false, tries = 0;
          while (!ok && tries < 40){
            tries++;
            const dt = (randomize > 0 ? (Math.random()-0.5) * (1/Math.max(6, count)) : 0);
            const t = (baseT + dt + 1) % 1;
            ok = placeAtT(t, sizeLrem) || placeAtT((t + 0.5) % 1, sizeLrem);
          }
        }
      }

      /* -------------------- place the rest (M/S) as before -------------------- */
      const restTs = [];
      for (let i=0;i<T_all.length;i++){ if (!usedIdx.has(i)) restTs.push(T_all[i]); }
      for (let k = restTs.length - 1; k > 0; k--){ const j = Math.floor(Math.random() * (k + 1)); [restTs[k], restTs[j]] = [restTs[j], restTs[k]]; }

      let ti = 0;
      for (let i = 0; i < restPlan.length && ti < restTs.length; i++){
        const tier = restPlan[i];
        const sizeRem = (tier === 'M') ? sizeMrem : sizeSrem;
        let ok = false, tries = 0;
        while (!ok && tries < 40 && ti < restTs.length){
          const t = restTs[ti++];
          tries++;
          ok = placeAtT(t, sizeRem) || placeAtT((t + 0.5) % 1, sizeRem);
        }
      }
      /* ----------------------------------------------------------------------- */
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
