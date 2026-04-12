// v4.0 — Edge emitter with continuous outward section-clipped drift

(function(){
  const TARGETS = [
    { sel: '#block-yui_3_17_2_1_1756944426569_9957', fallback: 'ellipse' } // 'ellipse' | 'rect'
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
      if (n){
        mo.disconnect();
        cb(n);
      }
    });
    mo.observe(document.documentElement, { childList:true, subtree:true });
  }

  const root = document.documentElement;
  const body = document.body;
  const remPx = () => parseFloat(getComputedStyle(root).fontSize) || 16;
  const clamp01 = v => Math.max(0, Math.min(1, v));
  const rand = (a, b) => a + Math.random() * (b - a);
  const DEG = Math.PI / 180;

  function svgToClient(svg, x, y){
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const pt = svg.createSVGPoint();
    pt.x = x;
    pt.y = y;
    const out = pt.matrixTransform(ctm);
    if (!Number.isFinite(out.x) || !Number.isFinite(out.y)) return null;
    return { x: out.x, y: out.y };
  }

  function sampleEllipsePerimeter(rect, t){
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const rx = rect.width / 2;
    const ry = rect.height / 2;
    const theta = t * Math.PI * 2;
    return {
      x: cx + rx * Math.cos(theta),
      y: cy + ry * Math.sin(theta),
      theta,
      cx,
      cy
    };
  }

  function sampleRectPerimeter(rect, t){
    const per = 2 * (rect.width + rect.height);
    const d = t * per;
    let x, y;

    if (d <= rect.width){
      x = rect.left + d;
      y = rect.top;
    } else if (d <= rect.width + rect.height){
      x = rect.right;
      y = rect.top + (d - rect.width);
    } else if (d <= rect.width * 2 + rect.height){
      x = rect.right - (d - rect.width - rect.height);
      y = rect.bottom;
    } else {
      x = rect.left;
      y = rect.bottom - (d - rect.width * 2 - rect.height);
    }

    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    return { x, y, cx, cy };
  }

  function outwardSignSVG(path, svg, px, py, nx, ny){
    if (typeof path.isPointInFill === 'function'){
      const plus = svg.createSVGPoint();
      plus.x = px + nx;
      plus.y = py + ny;

      const minus = svg.createSVGPoint();
      minus.x = px - nx;
      minus.y = py - ny;

      const inPlus = path.isPointInFill(plus);
      const inMinus = path.isPointInFill(minus);

      if (inPlus && !inMinus) return -1;
      if (!inPlus && inMinus) return +1;
      if (!inPlus && !inMinus) return +1;
      return +1;
    }

    const vb = svg.viewBox && svg.viewBox.baseVal
      ? svg.viewBox.baseVal
      : { x:0, y:0, width:svg.clientWidth, height:svg.clientHeight };

    const cx = vb.x + vb.width / 2;
    const cy = vb.y + vb.height / 2;
    const vx = px - cx;
    const vy = py - cy;
    return (vx * nx + vy * ny) >= 0 ? +1 : -1;
  }

  function angleDeg(cx, cy, px, py){
    const ang = Math.atan2(py - cy, px - cx) / DEG;
    return (ang + 360) % 360;
  }

  function avoidAngle(aDeg, widthDeg){
    const dTop = Math.min(Math.abs(aDeg - 90), 360 - Math.abs(aDeg - 90));
    const dBot = Math.min(Math.abs(aDeg - 270), 360 - Math.abs(aDeg - 270));
    return (dTop <= widthDeg) || (dBot <= widthDeg);
  }

  function clampInt(n, lo, hi){
    return Math.max(lo, Math.min(hi, n));
  }

  function pickEvenlySpacedIndices(len, k){
    if (k <= 0 || len <= 0) return [];
    const out = [];
    const step = len / k;
    for (let i = 0; i < k; i++){
      out.push(Math.min(len - 1, Math.floor(i * step + step / 2)));
    }
    const seen = new Set();
    return out.filter(i => {
      if (seen.has(i)) return false;
      seen.add(i);
      return true;
    });
  }

  function chooseSizesPlanBalanced(N){
    const minL = Math.ceil(N * 0.25);
    const maxL = Math.floor(N * (1 / 3));
    const target = Math.floor(N * 0.30);
    const Lcount = clampInt(target, minL, maxL);

    const rest = N - Lcount;
    const restPlan = new Array(rest);
    let flip = 0;
    for (let i = 0; i < rest; i++){
      restPlan[i] = (flip++ % 5 < 3) ? 'M' : 'S';
    }
    return { Lcount, restPlan };
  }

  function makeParamList(count, phase){
    const N = Math.max(0, count | 0);
    const T = new Array(N);
    for (let i = 0; i < N; i++){
      T[i] = ((i + 0.5) / N + phase) % 1;
    }
    return T;
  }

  function readyToDraw(el){
    const r = el?.getBoundingClientRect();
    return !!r && r.width >= 4 && r.height >= 4;
  }

  function nextFrame2(fn){
    requestAnimationFrame(() => requestAnimationFrame(fn));
  }

  function rateLimited(fn, gapMs){
    let last = 0;
    return function(){
      const now = performance.now();
      if (now - last < gapMs) return;
      last = now;
      fn();
    };
  }

  const ro = new ResizeObserver(entries => {
    for (const e of entries){
      const cb = e.target.__edgeCb;
      if (!cb) continue;
      clearTimeout(e.target.__edgeTo);
      e.target.__edgeTo = setTimeout(cb, 120);
    }
  });

  function observeResize(el, cb){
    el.__edgeCb = cb;
    ro.observe(el);
  }

  function watchHost(host, cb){
    const mo = new MutationObserver(muts => {
      for (const m of muts){
        if (
          m.type === 'childList' ||
          (m.type === 'attributes' && (m.attributeName === 'style' || m.attributeName === 'class'))
        ){
          clearTimeout(host.__edgeMoT);
          host.__edgeMoT = setTimeout(cb, 120);
          break;
        }
      }
    });
    mo.observe(host, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class']
    });
    host.__edgeMo = mo;
  }

  function findSectionFor(host){
    return (
      host.closest('[data-section-id]') ||
      host.closest('section') ||
      host.parentElement ||
      host
    );
  }

  function ensureLayer(section){
    section.classList.add('starfield-section');
    let layer = section.querySelector(':scope > .shape-edge-sparkles');
    if (!layer){
      layer = document.createElement('div');
      layer.className = 'shape-edge-sparkles';
      section.appendChild(layer);
    }
    return layer;
  }

  function destroyField(layer){
    if (!layer) return;
    if (layer.__starfield){
      layer.__starfield.stop();
      layer.__starfield = null;
    }
    layer.innerHTML = '';
    delete layer.dataset.sig;
  }

  function createField(target, host, section, layer, cfg){
    const stars = new Set();
    let rafId = 0;
    let running = true;
    let lastTs = 0;
    let spawnCarry = 0;
    let spawnIndex = 0;

    function getRects(){
      return {
        hostRect: host.getBoundingClientRect(),
        sectionRect: section.getBoundingClientRect(),
        viewport: {
          left: 0,
          top: 0,
          right: window.innerWidth,
          bottom: window.innerHeight
        }
      };
    }

    function distanceToViewportEdge(x, y, dx, dy, viewport){
      const tx = dx > 0
        ? (viewport.right - x) / dx
        : dx < 0
          ? (viewport.left - x) / dx
          : Infinity;

      const ty = dy > 0
        ? (viewport.bottom - y) / dy
        : dy < 0
          ? (viewport.top - y) / dy
          : Infinity;

      const t = Math.min(
        tx > 0 ? tx : Infinity,
        ty > 0 ? ty : Infinity
      );

      return Number.isFinite(t) ? t : 0;
    }

    function buildSpawnPool(){
      const svg = host.querySelector('svg');
      const path = svg ? svg.querySelector('path') : null;
      const mode = (svg && path) ? 'svg' : 'box';

      const {
        starCount,
        randomize,
        avoidStrength,
        avoidWidthDeg,
        jitterMinPx,
        jitterMaxPx,
        sizeLrem,
        sizeMrem,
        sizeSrem,
        seedPhase
      } = cfg;

      const T_all = makeParamList(starCount, seedPhase);
      const { Lcount, restPlan } = chooseSizesPlanBalanced(starCount);

      const hostRect = host.getBoundingClientRect();
      const pathTotalLength = mode === 'svg' ? path.getTotalLength() : 0;

      let svgCenter = null;
      if (mode === 'svg'){
        if (typeof path.getBBox === 'function'){
          const bb = path.getBBox();
          svgCenter = { x: bb.x + bb.width / 2, y: bb.y + bb.height / 2 };
        } else {
          const vb = svg.viewBox && svg.viewBox.baseVal
            ? svg.viewBox.baseVal
            : { x:0, y:0, width:svg.clientWidth, height:svg.clientHeight };
          svgCenter = { x: vb.x + vb.width / 2, y: vb.y + vb.height / 2 };
        }
      }

      const leftIdx = [];
      const rightIdx = [];

      for (let i = 0; i < T_all.length; i++){
        const t = T_all[i];
        if (mode === 'svg'){
          const d = (t % 1) * pathTotalLength;
          const p = path.getPointAtLength(d);
          const isLeft = svgCenter ? (p.x < svgCenter.x) : (i < T_all.length / 2);
          (isLeft ? leftIdx : rightIdx).push(i);
        } else {
          const hit = (target.fallback || 'ellipse') === 'rect'
            ? sampleRectPerimeter(hostRect, t)
            : sampleEllipsePerimeter(hostRect, t);
          const isLeft = hit.x < hit.cx;
          (isLeft ? leftIdx : rightIdx).push(i);
        }
      }

      const LleftTarget = Math.floor(Lcount / 2);
      const LrightTarget = Lcount - LleftTarget;

      let pickLeft = pickEvenlySpacedIndices(leftIdx.length, LleftTarget).map(j => leftIdx[j]);
      let pickRight = pickEvenlySpacedIndices(rightIdx.length, LrightTarget).map(j => rightIdx[j]);

      const deficitLeft = LleftTarget - pickLeft.length;
      const deficitRight = LrightTarget - pickRight.length;

      if (deficitLeft > 0 && rightIdx.length > pickRight.length){
        const extra = pickEvenlySpacedIndices(rightIdx.length, pickRight.length + deficitLeft)
          .slice(pickRight.length)
          .map(j => rightIdx[j]);
        pickRight = pickRight.concat(extra);
      }

      if (deficitRight > 0 && leftIdx.length > pickLeft.length){
        const extra = pickEvenlySpacedIndices(leftIdx.length, pickLeft.length + deficitRight)
          .slice(pickLeft.length)
          .map(j => leftIdx[j]);
        pickLeft = pickLeft.concat(extra);
      }

      const largeIndices = new Set([...pickLeft, ...pickRight]);
      const usedIdx = new Set();
      const pool = [];

      function buildPointAtT(t, sizeRem){
        if (mode === 'svg'){
          const d = (t % 1) * pathTotalLength;
          const p = path.getPointAtLength(d);

          if (avoidStrength > 0 && avoidWidthDeg > 0 && svgCenter){
            const a = angleDeg(svgCenter.x, svgCenter.y, p.x, p.y);
            if (avoidAngle(a, avoidWidthDeg)) return null;
          }

          const p2 = path.getPointAtLength((d + 0.75) % pathTotalLength);
          let nx = -(p2.y - p.y);
          let ny = (p2.x - p.x);
          const nLen = Math.hypot(nx, ny) || 1;
          nx /= nLen;
          ny /= nLen;

          const sign = outwardSignSVG(path, svg, p.x, p.y, nx, ny);
          const j = sign * rand(jitterMinPx, jitterMaxPx);

          const edgeScr = svgToClient(svg, p.x, p.y);
          const spawnScr = svgToClient(svg, p.x + nx * j, p.y + ny * j);
          if (!edgeScr || !spawnScr) return null;

          let dx = spawnScr.x - edgeScr.x;
          let dy = spawnScr.y - edgeScr.y;
          const len = Math.hypot(dx, dy) || 1;
          dx /= len;
          dy /= len;

          const side = (spawnScr.x < hostRect.left + hostRect.width / 2) ? 'L' : 'R';

          return {
            x: spawnScr.x,
            y: spawnScr.y,
            dx,
            dy,
            sizeRem,
            side
          };
        }

        const hit = (target.fallback || 'ellipse') === 'rect'
          ? sampleRectPerimeter(hostRect, t)
          : sampleEllipsePerimeter(hostRect, t);

        if (avoidStrength > 0 && avoidWidthDeg > 0){
          const a = angleDeg(hit.cx, hit.cy, hit.x, hit.y);
          if (avoidAngle(a, avoidWidthDeg)) return null;
        }

        let px, py, dx, dy;

        if ((target.fallback || 'ellipse') === 'rect'){
          dx = hit.x - hit.cx;
          dy = hit.y - hit.cy;
          const vLen = Math.hypot(dx, dy) || 1;
          dx /= vLen;
          dy /= vLen;
          const j = rand(jitterMinPx, jitterMaxPx);
          px = hit.x + dx * j;
          py = hit.y + dy * j;
        } else {
          dx = Math.cos(hit.theta);
          dy = Math.sin(hit.theta);
          const j = rand(jitterMinPx, jitterMaxPx);
          px = hit.x + dx * j;
          py = hit.y + dy * j;
        }

        const side = px < hit.cx ? 'L' : 'R';

        return {
          x: px,
          y: py,
          dx,
          dy,
          sizeRem,
          side
        };
      }

      if (largeIndices.size > 0){
        const seq = [];
        const Larr = [...pickLeft];
        const Rarr = [...pickRight];
        const maxLen = Math.max(Larr.length, Rarr.length);
        for (let i = 0; i < maxLen; i++){
          if (i < Larr.length) seq.push(Larr[i]);
          if (i < Rarr.length) seq.push(Rarr[i]);
        }

        for (const idx of seq){
          usedIdx.add(idx);
          const baseT = T_all[idx];
          let made = null;
          let tries = 0;

          while (!made && tries < 40){
            tries++;
            const dt = randomize > 0 ? (Math.random() - 0.5) * (1 / Math.max(6, starCount)) : 0;
            const t = (baseT + dt + 1) % 1;
            made = buildPointAtT(t, sizeLrem) || buildPointAtT((t + 0.5) % 1, sizeLrem);
          }

          if (made) pool.push(made);
        }
      }

      const restTs = [];
      for (let i = 0; i < T_all.length; i++){
        if (!usedIdx.has(i)) restTs.push(T_all[i]);
      }

      for (let k = restTs.length - 1; k > 0; k--){
        const j = Math.floor(Math.random() * (k + 1));
        [restTs[k], restTs[j]] = [restTs[j], restTs[k]];
      }

      let ti = 0;
      for (let i = 0; i < restPlan.length && ti < restTs.length; i++){
        const sizeRem = restPlan[i] === 'M' ? sizeMrem : sizeSrem;
        let made = null;
        let tries = 0;

        while (!made && tries < 40 && ti < restTs.length){
          const t = restTs[ti++];
          tries++;
          made = buildPointAtT(t, sizeRem) || buildPointAtT((t + 0.5) % 1, sizeRem);
        }

        if (made) pool.push(made);
      }

      return pool;
    }

    let spawnPool = buildSpawnPool();
    if (!spawnPool.length) return null;

    function spawnStar(){
      if (!running) return;
      if (stars.size >= cfg.maxLiveStars) return;
      if (!spawnPool.length) return;

      const sectionRect = section.getBoundingClientRect();
      const viewport = {
        left: 0,
        top: 0,
        right: window.innerWidth,
        bottom: window.innerHeight
      };

      const poolItem = spawnPool[spawnIndex % spawnPool.length];
      spawnIndex++;

      const sideDrift = rand(-cfg.wobblePx, cfg.wobblePx);
      const perpX = -poolItem.dy;
      const perpY = poolItem.dx;

      let dx = poolItem.dx + perpX * (sideDrift / 120);
      let dy = poolItem.dy + perpY * (sideDrift / 120);
      const dirLen = Math.hypot(dx, dy) || 1;
      dx /= dirLen;
      dy /= dirLen;

      const startX = poolItem.x;
      const startY = poolItem.y;
      const distToEdge = distanceToViewportEdge(startX, startY, dx, dy, viewport);
      const fadeDistance = Math.max(1, distToEdge + cfg.driftOvershootPx);

      const speed = rand(cfg.speedMin, cfg.speedMax);
      const baseOpacity = rand(cfg.opacityMin, cfg.opacityMax);
      const blurPx = rand(0, cfg.blurMaxPx);
      const twDur = rand(cfg.twinkleMin, cfg.twinkleMax);
      const twDelay = -Math.random() * twDur;
      const scale = rand(cfg.scaleMin, cfg.scaleMax);

      const el = document.createElement('span');
      el.className = 'star';
      el.style.setProperty('--size', `${poolItem.sizeRem}rem`);
      el.style.setProperty('--blur', `${blurPx.toFixed(2)}px`);
      el.style.setProperty('--twinkle', `${twDur.toFixed(2)}s`);
      el.style.setProperty('--tw-delay', `${twDelay.toFixed(2)}s`);
      el.style.setProperty('--scale', scale.toFixed(3));

      layer.appendChild(el);

      const star = {
        el,
        x: startX,
        y: startY,
        startX,
        startY,
        dx,
        dy,
        speed,
        life: 0,
        fadeDistance,
        baseOpacity,
        sectionRect
      };

      stars.add(star);
      renderStar(star);
    }

    function renderStar(star){
      const x = star.x - star.sectionRect.left;
      const y = star.y - star.sectionRect.top;
      star.el.style.left = `${x}px`;
      star.el.style.top = `${y}px`;

      const traveled = Math.hypot(star.x - star.startX, star.y - star.startY);
      const fade = 1 - clamp01(traveled / star.fadeDistance);
      const opacity = star.baseOpacity * fade;
      star.el.style.opacity = opacity.toFixed(3);
    }

    function recycleStar(star){
      if (star.el && star.el.parentNode === layer){
        layer.removeChild(star.el);
      }
      stars.delete(star);
    }

    function step(ts){
      if (!running) return;
      if (!lastTs) lastTs = ts;
      const dt = Math.min(64, ts - lastTs) / 1000;
      lastTs = ts;

      const { sectionRect, viewport } = getRects();

      spawnCarry += dt * 1000;
      while (spawnCarry >= cfg.spawnIntervalMs){
        spawnCarry -= cfg.spawnIntervalMs;
        for (let i = 0; i < cfg.spawnPerTick; i++) spawnStar();
      }

      for (const star of stars){
        star.sectionRect = sectionRect;
        star.life += dt;
        star.x += star.dx * star.speed * dt;
        star.y += star.dy * star.speed * dt;

        renderStar(star);

        const traveled = Math.hypot(star.x - star.startX, star.y - star.startY);
        const outPastViewport =
          star.x < viewport.left - cfg.driftOvershootPx ||
          star.x > viewport.right + cfg.driftOvershootPx ||
          star.y < viewport.top - cfg.driftOvershootPx ||
          star.y > viewport.bottom + cfg.driftOvershootPx ||
          traveled > star.fadeDistance + cfg.driftOvershootPx;

        if (outPastViewport || parseFloat(star.el.style.opacity || '0') <= 0.001){
          recycleStar(star);
        }
      }

      rafId = requestAnimationFrame(step);
    }

    function stop(){
      running = false;
      cancelAnimationFrame(rafId);
      for (const star of stars){
        if (star.el && star.el.parentNode === layer) layer.removeChild(star.el);
      }
      stars.clear();
    }

    function rebuild(){
      spawnPool = buildSpawnPool();
      if (!spawnPool.length) return;
      for (const star of [...stars]) recycleStar(star);
      spawnIndex = 0;
      spawnCarry = 0;

      const initial = Math.min(cfg.maxLiveStars, Math.max(24, Math.floor(cfg.starCount * 0.45)));
      for (let i = 0; i < initial; i++) spawnStar();
    }

    layer.__starfield = { stop, rebuild };

    rebuild();
    rafId = requestAnimationFrame(step);

    return { stop, rebuild };
  }

  function buildFor(target, attempt = 0){
    const host = document.querySelector(target.sel);
    if (!host) return;

    if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
    if (!readyToDraw(host)){
      if (attempt < 40) setTimeout(() => buildFor(target, attempt + 1), 100);
      return;
    }

    const section = findSectionFor(host);
    if (!section || !readyToDraw(section)){
      if (attempt < 40) setTimeout(() => buildFor(target, attempt + 1), 100);
      return;
    }

    const layer = ensureLayer(section);

    const gcsBody = getComputedStyle(body);
    const gcsRoot = getComputedStyle(root);
    const phi = parseFloat(gcsBody.getPropertyValue('--phi')) || 1.618;

    const cfg = {
      starCount: Math.max(0, Math.round(parseFloat(gcsBody.getPropertyValue('--star-count')) || 40)),
      randomize: clamp01(parseFloat(gcsBody.getPropertyValue('--star-randomize')) || 0),
      opacityMin: parseFloat(gcsBody.getPropertyValue('--opacity-min')) || 0.35,
      opacityMax: parseFloat(gcsBody.getPropertyValue('--opacity-max')) || 1.0,
      twinkleMin: parseFloat(gcsBody.getPropertyValue('--twinkle-min')) || 1.2,
      twinkleMax: parseFloat(gcsBody.getPropertyValue('--twinkle-max')) || 2.8,
      blurMaxPx: (parseFloat(gcsBody.getPropertyValue('--max-blur')) || 0.22) * remPx(),
      jitterMinPx: (parseFloat(gcsBody.getPropertyValue('--jitter-min')) || 0.10) * remPx(),
      jitterMaxPx: Math.max(
        (parseFloat(gcsBody.getPropertyValue('--jitter-min')) || 0.10) * remPx(),
        (parseFloat(gcsBody.getPropertyValue('--jitter-max')) || 2.0) * remPx()
      ),
      avoidStrength: clamp01(parseFloat(gcsBody.getPropertyValue('--avoid-vert-strength')) || 0),
      avoidWidthDeg: Math.max(0, parseFloat(gcsBody.getPropertyValue('--avoid-vert-width-deg')) || 0),
      sizeLrem: parseFloat(gcsRoot.getPropertyValue('--size-large')) || 1.5,
      sizeMrem: parseFloat(gcsRoot.getPropertyValue('--size-medium')) || (1.5 / phi),
      sizeSrem: parseFloat(gcsRoot.getPropertyValue('--size-small')) || ((1.5 / phi) / phi),
      speedMin: parseFloat(gcsBody.getPropertyValue('--drift-speed-min')) || 22,
      speedMax: parseFloat(gcsBody.getPropertyValue('--drift-speed-max')) || 58,
      driftOvershootPx: parseFloat(gcsBody.getPropertyValue('--drift-overshoot')) || 80,
      wobblePx: (parseFloat(gcsBody.getPropertyValue('--drift-wobble')) || 0.18) * remPx(),
      scaleMin: parseFloat(gcsBody.getPropertyValue('--drift-scale-min')) || 0.92,
      scaleMax: parseFloat(gcsBody.getPropertyValue('--drift-scale-max')) || 1.10,
      spawnIntervalMs: Math.max(16, parseFloat(gcsBody.getPropertyValue('--spawn-interval')) || 140),
      spawnPerTick: Math.max(1, Math.round(parseFloat(gcsBody.getPropertyValue('--spawn-per-tick')) || 2)),
      maxLiveStars: Math.max(8, Math.round(parseFloat(gcsBody.getPropertyValue('--max-live-stars')) || 180)),
      seedPhase: (() => {
        const seedVal = parseFloat(gcsBody.getPropertyValue('--star-seed'));
        const v = Number.isFinite(seedVal) ? seedVal : Math.random();
        return v - Math.floor(v);
      })()
    };

    const svg = host.querySelector('svg');
    const path = svg ? svg.querySelector('path')