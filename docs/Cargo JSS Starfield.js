// v4.0 — Section-flow starfield for exact target block
// Injects overlay into nearest section so stars can travel across the whole section.

(function () {
  const TARGETS = [
    { sel: '#block-yui_3_17_2_1_1756944426569_9957', fallback: 'ellipse' } // 'ellipse' | 'rect'
  ];
  if (!TARGETS.length) return;

  const root = document.documentElement;
  const body = document.body;
  const DEG = Math.PI / 180;

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const clamp01 = v => clamp(v, 0, 1);
  const rand = (a, b) => a + Math.random() * (b - a);
  const now = () => performance.now();
  const remPx = () => parseFloat(getComputedStyle(root).fontSize) || 16;

  function onReady(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn, { once: true });
  }

  function whenSelector(sel, cb) {
    const el = document.querySelector(sel);
    if (el) return cb(el);
    const mo = new MutationObserver(() => {
      const found = document.querySelector(sel);
      if (found) {
        mo.disconnect();
        cb(found);
      }
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });
  }

  function rateLimited(fn, gapMs) {
    let last = 0;
    return function () {
      const t = performance.now();
      if (t - last < gapMs) return;
      last = t;
      fn();
    };
  }

  function getNumVar(style, name, fallback) {
    const raw = style.getPropertyValue(name).trim();
    const n = parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  }

  function getPxVar(style, name, fallbackPx) {
    const raw = style.getPropertyValue(name).trim();
    if (!raw) return fallbackPx;
    const n = parseFloat(raw);
    if (!Number.isFinite(n)) return fallbackPx;
    if (raw.endsWith('rem')) return n * remPx();
    return n;
  }

  function svgToClient(svg, x, y) {
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const pt = svg.createSVGPoint();
    pt.x = x;
    pt.y = y;
    const out = pt.matrixTransform(ctm);
    if (!Number.isFinite(out.x) || !Number.isFinite(out.y)) return null;
    return { x: out.x, y: out.y };
  }

  function sampleEllipsePerimeter(rect, t) {
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const rx = rect.width / 2;
    const ry = rect.height / 2;
    const theta = t * Math.PI * 2;
    return { x: cx + rx * Math.cos(theta), y: cy + ry * Math.sin(theta), cx, cy, theta };
  }

  function sampleRectPerimeter(rect, t) {
    const per = 2 * (rect.width + rect.height);
    const d = t * per;
    let x, y;
    if (d <= rect.width) {
      x = rect.left + d;
      y = rect.top;
    } else if (d <= rect.width + rect.height) {
      x = rect.right;
      y = rect.top + (d - rect.width);
    } else if (d <= rect.width * 2 + rect.height) {
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

  function outwardSignSVG(path, svg, px, py, nx, ny) {
    if (typeof path.isPointInFill === 'function') {
      const plus = svg.createSVGPoint();
      plus.x = px + nx;
      plus.y = py + ny;
      const minus = svg.createSVGPoint();
      minus.x = px - nx;
      minus.y = py - ny;
      const inPlus = path.isPointInFill(plus);
      const inMinus = path.isPointInFill(minus);
      if (inPlus && !inMinus) return -1;
      if (!inPlus && inMinus) return 1;
      if (!inPlus && !inMinus) return 1;
      return 1;
    }

    const vb = svg.viewBox && svg.viewBox.baseVal
      ? svg.viewBox.baseVal
      : { x: 0, y: 0, width: svg.clientWidth, height: svg.clientHeight };

    const cx = vb.x + vb.width / 2;
    const cy = vb.y + vb.height / 2;
    const vx = px - cx;
    const vy = py - cy;
    return (vx * nx + vy * ny) >= 0 ? 1 : -1;
  }

  function angleDeg(cx, cy, px, py) {
    const ang = Math.atan2(py - cy, px - cx) / DEG;
    return (ang + 360) % 360;
  }

  function cosineWindow(distDeg, halfWidthDeg) {
    if (distDeg >= halfWidthDeg) return 0;
    return 0.5 * (1 + Math.cos(Math.PI * (distDeg / halfWidthDeg)));
  }

  function makeAngleGate(strength, halfWidthDeg) {
    const s = clamp01(strength || 0);
    const w = Math.max(0, halfWidthDeg || 0);

    return function accept(cx, cy, px, py) {
      const a = angleDeg(cx, cy, px, py);
      const dTop = Math.min(Math.abs(a - 90), 360 - Math.abs(a - 90));
      const dBot = Math.min(Math.abs(a - 270), 360 - Math.abs(a - 270));
      const penalty = Math.max(cosineWindow(dTop, w), cosineWindow(dBot, w));
      const acceptProb = 1 - s * penalty;
      return Math.random() < acceptProb;
    };
  }

  function chooseSize(style) {
    const phi = getNumVar(style, '--phi', 1.618);
    const sizeL = getNumVar(style, '--size-large', 1.5);
    const sizeM = getNumVar(style, '--size-medium', sizeL / phi);
    const sizeS = getNumVar(style, '--size-small', sizeM / phi);

    const r = Math.random();
    if (r < 0.30) return sizeL;
    if (r < 0.72) return sizeM;
    return sizeS;
  }

  function findSection(host) {
    return (
      host.closest('[data-section-id]') ||
      host.closest('section') ||
      host.closest('.page-section') ||
      host.parentElement
    );
  }

  function ensureOverlay(section) {
    const cs = getComputedStyle(section);
    if (cs.position === 'static') section.style.position = 'relative';

    let layer = section.querySelector(':scope > .shape-edge-sparkles');
    if (!layer) {
      layer = document.createElement('div');
      layer.className = 'shape-edge-sparkles';
      section.appendChild(layer);
    }
    return layer;
  }

  function pointToSection(clientPt, sectionRect) {
    return {
      x: clientPt.x - sectionRect.left,
      y: clientPt.y - sectionRect.top
    };
  }

  function buildSpawner(target) {
    const host = document.querySelector(target.sel);
    if (!host) return null;

    const section = findSection(host);
    if (!section) return null;

    const overlay = ensureOverlay(section);
    const sectionRect = section.getBoundingClientRect();
    const hostRect = host.getBoundingClientRect();
    if (sectionRect.width < 4 || sectionRect.height < 4 || hostRect.width < 4 || hostRect.height < 4) return null;

    const svg = host.querySelector('svg');
    const path = svg ? svg.querySelector('path') : null;
    const mode = (svg && path) ? 'svg' : 'box';

    const bodyStyle = getComputedStyle(body);
    const angleGate = makeAngleGate(
      getNumVar(bodyStyle, '--avoid-vert-strength', 0),
      getNumVar(bodyStyle, '--avoid-vert-width-deg', 0)
    );

    const jitterMinPx = getNumVar(bodyStyle, '--jitter-min', 0.10) * remPx();
    const jitterMaxPx = Math.max(jitterMinPx, getNumVar(bodyStyle, '--jitter-max', 2.00) * remPx());
    const randomize = clamp01(getNumVar(bodyStyle, '--star-randomize', 0));
    const seed = getNumVar(bodyStyle, '--star-seed', Math.random());
    const basePhase = seed - Math.floor(seed);

    const sectionCenter = {
      x: sectionRect.width / 2,
      y: sectionRect.height / 2
    };

    const pathTotalLength = mode === 'svg' ? path.getTotalLength() : 0;
    let svgCenter = null;

    if (mode === 'svg') {
      if (typeof path.getBBox === 'function') {
        const bb = path.getBBox();
        svgCenter = { x: bb.x + bb.width / 2, y: bb.y + bb.height / 2 };
      } else {
        const vb = svg.viewBox && svg.viewBox.baseVal
          ? svg.viewBox.baseVal
          : { x: 0, y: 0, width: svg.clientWidth, height: svg.clientHeight };
        svgCenter = { x: vb.x + vb.width / 2, y: vb.y + vb.height / 2 };
      }
    }

    function sampleSpawnPoint() {
      for (let tries = 0; tries < 40; tries++) {
        const evenT = Math.random();
        const dt = randomize > 0 ? (Math.random() - 0.5) * 0.08 : 0;
        const t = (evenT + dt + basePhase + 1) % 1;

        if (mode === 'svg') {
          const d = t * pathTotalLength;
          const p = path.getPointAtLength(d);
          const p2 = path.getPointAtLength((d + 0.75) % pathTotalLength);

          if (svgCenter && !angleGate(svgCenter.x, svgCenter.y, p.x, p.y)) continue;

          let nx = -(p2.y - p.y);
          let ny = (p2.x - p.x);
          const nlen = Math.hypot(nx, ny) || 1;
          nx /= nlen;
          ny /= nlen;

          const sign = outwardSignSVG(path, svg, p.x, p.y, nx, ny);
          const jitter = sign * rand(jitterMinPx, jitterMaxPx);

          const client = svgToClient(svg, p.x + nx * jitter, p.y + ny * jitter);
          if (!client) continue;

          const pos = pointToSection(client, sectionRect);
          const dirX = pos.x - sectionCenter.x;
          const dirY = pos.y - sectionCenter.y;
          const dirLen = Math.hypot(dirX, dirY) || 1;

          return {
            x: pos.x,
            y: pos.y,
            vx: dirX / dirLen,
            vy: dirY / dirLen
          };
        } else {
          const hit = (target.fallback || 'ellipse') === 'rect'
            ? sampleRectPerimeter(hostRect, t)
            : sampleEllipsePerimeter(hostRect, t);

          if (!angleGate(hit.cx, hit.cy, hit.x, hit.y)) continue;

          let px, py;
          if ((target.fallback || 'ellipse') === 'rect') {
            const dx = hit.x - hit.cx;
            const dy = hit.y - hit.cy;
            const dl = Math.hypot(dx, dy) || 1;
            const j = rand(jitterMinPx, jitterMaxPx);
            px = hit.x + (dx / dl) * j;
            py = hit.y + (dy / dl) * j;
          } else {
            const j = rand(jitterMinPx, jitterMaxPx);
            px = hit.x + Math.cos(hit.theta) * j;
            py = hit.y + Math.sin(hit.theta) * j;
          }

          const pos = {
            x: px - sectionRect.left,
            y: py - sectionRect.top
          };

          const dirX = pos.x - sectionCenter.x;
          const dirY = pos.y - sectionCenter.y;
          const dirLen = Math.hypot(dirX, dirY) || 1;

          return {
            x: pos.x,
            y: pos.y,
            vx: dirX / dirLen,
            vy: dirY / dirLen
          };
        }
      }

      return null;
    }

    return {
      host,
      section,
      overlay,
      rect: sectionRect,
      sampleSpawnPoint
    };
  }

  function createEngine(target) {
    let spawner = buildSpawner(target);
    if (!spawner) return null;

    const overlay = spawner.overlay;
    const stars = [];
    let rafId = 0;
    let lastTs = 0;
    let spawnCarry = 0;

    function getConfig() {
      const s = getComputedStyle(body);
      return {
        starColor: s.getPropertyValue('--star-color').trim() || '#9989EC',
        maxLive: Math.max(1, Math.round(getNumVar(s, '--star-max-live', 170))),
        spawnRate: Math.max(0, getNumVar(s, '--spawn-rate', 22)),
        driftMin: Math.max(0, getNumVar(s, '--drift-min', 1.2) * remPx()),
        driftMax: Math.max(0, getNumVar(s, '--drift-max', 3.8) * remPx()),
        edgeFade: Math.max(1, getNumVar(s, '--edge-fade-width', 7) * remPx()),
        opacityMin: clamp01(getNumVar(s, '--opacity-min', 0.15)),
        opacityMax: clamp01(getNumVar(s, '--opacity-max', 1.0)),
        blurMax: Math.max(0, getNumVar(s, '--max-blur', 0.22) * remPx()),
        twinkleMin: Math.max(0.01, getNumVar(s, '--twinkle-min', 0.5)),
        twinkleMax: Math.max(0.02, getNumVar(s, '--twinkle-max', 2.0))
      };
    }

    function minDistToRectEdge(x, y, rect) {
      return Math.min(x, rect.width - x, y, rect.height - y);
    }

    function outsideDistance(x, y, rect) {
      const dx = x < 0 ? -x : (x > rect.width ? x - rect.width : 0);
      const dy = y < 0 ? -y : (y > rect.height ? y - rect.height : 0);
      return Math.hypot(dx, dy);
    }

    function totalFadeAlpha(x, y, rect, edgeFade) {
      const insideMin = minDistToRectEdge(x, y, rect);
      if (insideMin >= 0) {
        return clamp01(insideMin / edgeFade);
      }
      const out = outsideDistance(x, y, rect);
      return clamp01(1 - (out / edgeFade));
    }

    function spawnOne(cfg) {
      if (stars.length >= cfg.maxLive) return;

      const spawn = spawner.sampleSpawnPoint();
      if (!spawn) return;

      const el = document.createElement('span');
      el.className = 'star';

      const sizeRem = chooseSize(getComputedStyle(body));
      const baseOpacity = rand(cfg.opacityMin, cfg.opacityMax);
      const twDur = rand(cfg.twinkleMin, cfg.twinkleMax);
      const twDelay = -Math.random() * twDur;
      const blurPx = rand(0, cfg.blurMax);
      const speed = rand(cfg.driftMin, cfg.driftMax);

      el.style.color = cfg.starColor;
      el.style.setProperty('--size', sizeRem + 'rem');
      el.style.setProperty('--blur', blurPx.toFixed(2) + 'px');
      el.style.setProperty('--twinkle', twDur.toFixed(2) + 's');
      el.style.setProperty('--tw-delay', twDelay.toFixed(2) + 's');

      overlay.appendChild(el);

      const star = {
        el,
        x: spawn.x,
        y: spawn.y,
        vx: spawn.vx * speed,
        vy: spawn.vy * speed,
        baseOpacity
      };

      stars.push(star);
      renderStar(star, cfg);
    }

    function renderStar(star, cfg) {
      const a = star.baseOpacity * totalFadeAlpha(star.x, star.y, spawner.rect, cfg.edgeFade);
      star.el.style.left = star.x.toFixed(2) + 'px';
      star.el.style.top = star.y.toFixed(2) + 'px';
      star.el.style.opacity = Math.max(0, a).toFixed(3);
    }

    function killStar(i) {
      const star = stars[i];
      if (star && star.el && star.el.parentNode) {
        star.el.parentNode.removeChild(star.el);
      }
      stars.splice(i, 1);
    }

    function tick(ts) {
      if (!lastTs) lastTs = ts;
      const dt = Math.min(0.05, (ts - lastTs) / 1000);
      lastTs = ts;

      const cfg = getConfig();

      spawnCarry += cfg.spawnRate * dt;
      while (spawnCarry >= 1) {
        spawnOne(cfg);
        spawnCarry -= 1;
      }

      for (let i = stars.length - 1; i >= 0; i--) {
        const s = stars[i];
        s.x += s.vx * dt;
        s.y += s.vy * dt;

        const alpha = totalFadeAlpha(s.x, s.y, spawner.rect, cfg.edgeFade);
        if (alpha <= 0) {
          killStar(i);
          continue;
        }

        renderStar(s, cfg);
      }

      rafId = requestAnimationFrame(tick);
    }

    function rebuild() {
      const fresh = buildSpawner(target);
      if (!fresh) return;

      spawner = fresh;

      for (let i = stars.length - 1; i >= 0; i--) {
        const s = stars[i];
        if (!spawner.overlay.contains(s.el)) {
          spawner.overlay.appendChild(s.el);
        }
      }
    }

    function start() {
      if (rafId) cancelAnimationFrame(rafId);
      lastTs = 0;
      spawnCarry = 0;
      rafId = requestAnimationFrame(tick);
    }

    function stop() {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
      while (stars.length) killStar(stars.length - 1);
    }

    return { rebuild, start, stop, get section() { return spawner.section; }, get host() { return spawner.host; } };
  }

  const engines = new Map();
  const rebuildAll = rateLimited(() => {
    for (const engine of engines.values()) engine.rebuild();
  }, 120);

  const ro = new ResizeObserver(() => rebuildAll());

  function watchMutations(el) {
    const mo = new MutationObserver(() => rebuildAll());
    mo.observe(el, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class']
    });
    return mo;
  }

  onReady(() => {
    body.classList.add('has-starfield');

    TARGETS.forEach(target => {
      whenSelector(target.sel, () => {
        if (engines.has(target.sel)) return;

        const engine = createEngine(target);
        if (!engine) return;

        engines.set(target.sel, engine);
        engine.start();

        ro.observe(engine.host);
        ro.observe(engine.section);

        const svg = engine.host.querySelector('svg');
        if (svg) ro.observe(svg);

        watchMutations(engine.host);
        watchMutations(engine.section);
      });
    });

    window.addEventListener('resize', rebuildAll, { passive: true });
    window.addEventListener('load', rebuildAll, { passive: true });
  });
})();