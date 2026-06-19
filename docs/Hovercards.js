/* Squarespace Opposing Card Float + Dripping Card Sparkles — v1.3 */

(() => {
  const CARD_1_SELECTORS = [
    '#block-yui_3_17_2_1_1756837579989_9426', /* Card img */
    '#block-yui_3_17_2_1_1776188012368_12782', /* Text */
    '#block-yui_3_17_2_1_1776188012368_13820' /* Overlay */
  ];

  const CARD_2_SELECTORS = [
    '#block-1e14a0c2b150cb046369', /* Card img */
    '#block-yui_3_17_2_1_1776188842920_49603', /* Text */
    '#block-yui_3_17_2_1_1776188842920_50691' /* Overlay */
  ];

  const AMPLITUDE_PX = 15; // max upward movement
  const CYCLE_MS = 4600;  // full cycle: 0 -> up -> 0
  const DEG = Math.PI / 180;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const root = document.documentElement;
  const body = document.body;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const clamp01 = (value) => clamp(value, 0, 1);
  const rand = (min, max) => min + Math.random() * (max - min);
  const remPx = () => parseFloat(getComputedStyle(root).fontSize) || 16;

  const getElements = (selectors) => selectors
    .map((selector) => document.querySelector(selector))
    .filter(Boolean);

  const getNumVar = (style, name, fallback) => {
    const raw = style.getPropertyValue(name).trim();
    const n = parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  };

  const chooseSize = (style) => {
    const phi = getNumVar(style, '--phi', 1.618);
    const sizeL = getNumVar(style, '--size-large', 1.5);
    const sizeM = getNumVar(style, '--size-medium', sizeL / phi);
    const sizeS = getNumVar(style, '--size-small', sizeM / phi);
    const r = Math.random();
    if (r < 0.30) return sizeL;
    if (r < 0.72) return sizeM;
    return sizeS;
  };

  const findSection = (host) => (
    host.closest('[data-section-id]') ||
    host.closest('section') ||
    host.closest('.page-section') ||
    host.parentElement
  );

  const ensureOverlay = (section) => {
    const cs = getComputedStyle(section);
    if (cs.position === 'static') section.style.position = 'relative';

    let layer = section.querySelector(':scope > .shape-edge-sparkles');
    if (!layer) {
      layer = document.createElement('div');
      layer.className = 'shape-edge-sparkles';
      section.appendChild(layer);
    }
    return layer;
  };


  const ensureSparkleStyles = () => {
    if (document.getElementById('hovercard-drip-sparkle-styles')) return;
    const style = document.createElement('style');
    style.id = 'hovercard-drip-sparkle-styles';
    style.textContent = `
      body.has-starfield{
        --star-count: 120;
        --star-min-gap: 2px;
        --jitter-min: 0.10rem;
        --jitter-max: 2.00rem;
        --star-randomize: 0.15;
        --spawn-spread-min: 0.10rem;
        --spawn-spread-max: 1.50rem;
        --spawn-fade-in-ms: 450;
        --twinkle-min: 1.0;
        --twinkle-max: 2.0;
        --opacity-min: 0.75;
        --opacity-max: 1.00;
        --phi: 1.618;
        --size-large: 1.5rem;
        --size-medium: calc(var(--size-large) / var(--phi));
        --size-small: calc(var(--size-medium) / var(--phi));
        --avoid-vert-strength: 1;
        --avoid-vert-width-deg: 25;
        --min-blur: 0.18rem;
        --max-blur: 0.5rem;
        --star-color: #5D4E98;
        --star-glow-color: rgba(60,51,97,0.9);
        --star-glow-blur: 20px;
        --star-glow-spread: 1px;
        --star-url: url("https://versaliart.github.io/MMsparkle.svg");
        --jitter-fallback-mult: 2;
        --jitter-fallback-steps: 3;
        --star-max-live: 60;
        --spawn-rate: 4;
        --drift-min: 2.5rem;
        --drift-max: 3.5rem;
        --edge-fade-width: 7rem;
      }
      .shape-edge-sparkles{
        position: absolute;
        inset: 0;
        pointer-events: none;
        z-index: 1;
        overflow: visible;
        contain: layout style paint;
      }
      .shape-edge-sparkles .star{
        position: absolute;
        left: 0;
        top: 0;
        width: var(--size, 1rem);
        height: var(--size, 1rem);
        transform: translate(-50%, -50%);
        opacity: 0;
        color: var(--star-color);
        pointer-events: none;
        z-index: 1;
        isolation: isolate;
        will-change: transform, opacity;
        animation: none;
      }
      .shape-edge-sparkles .star::before{
        content: '';
        position: absolute;
        inset: calc(var(--star-glow-spread) * -1);
        border-radius: 50%;
        background: radial-gradient(circle, var(--star-glow-color) 0%, color-mix(in srgb, var(--star-glow-color) 70%, transparent) 45%, transparent 100%);
        filter: blur(var(--blur, var(--star-glow-blur)));
        pointer-events: none;
        z-index: 0;
      }
      .shape-edge-sparkles .star::after{
        content: '';
        position: absolute;
        inset: 0;
        background: currentColor;
        -webkit-mask: var(--star-url) center / contain no-repeat;
                mask: var(--star-url) center / contain no-repeat;
        pointer-events: none;
        z-index: 1;
      }
      @media screen and (max-width: 767px){
        body.has-starfield{
          --edge-fade-width: 2rem;
          --spawn-rate: 3;
          --star-max-live: 20;
          --size-large: 1rem;
        }
      }
      @media (prefers-reduced-motion: reduce){
        .shape-edge-sparkles .star{ animation: none !important; }
      }
    `;
    document.head.appendChild(style);
  };

  const wrapGroup = (elements, wrapperClassName) => {
    if (elements.length < 2) return elements[0] || null;

    const parent = elements[0].parentElement;
    if (!parent || elements.some((element) => element.parentElement !== parent)) {
      return null;
    }

    const orderedElements = [...elements].sort((a, b) => {
      if (a === b) return 0;
      return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    });

    const existingWrapper = orderedElements[0].closest(`.${wrapperClassName.split(' ').join('.')}`);
    if (existingWrapper && orderedElements.every((element) => existingWrapper.contains(element))) {
      return existingWrapper;
    }

    const wrapper = document.createElement('div');
    wrapper.className = wrapperClassName;
    wrapper.style.position = 'relative';

    parent.insertBefore(wrapper, orderedElements[0]);
    orderedElements.forEach((element) => wrapper.appendChild(element));

    return wrapper;
  };

  const collectGroups = () => {
    const group1 = getElements(CARD_1_SELECTORS);
    const group2 = getElements(CARD_2_SELECTORS);

    const group1Wrapper = wrapGroup(group1, 'hovercard-group hovercard-group-1');
    const group2Wrapper = wrapGroup(group2, 'hovercard-group hovercard-group-2');

    const groups = [
      { target: group1Wrapper, fallbackElements: group1, phaseShift: 0 },
      { target: group2Wrapper, fallbackElements: group2, phaseShift: Math.PI },
    ].filter((group) => group.target || group.fallbackElements.length > 0);

    groups.forEach(({ target, fallbackElements }) => {
      const animatedElements = target ? [target] : fallbackElements;
      animatedElements.forEach((element) => {
        element.style.willChange = 'transform';
      });
    });

    return groups;
  };

  const onReady = (fn) => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
      return;
    }
    fn();
  };

  const getSparkleConfig = () => {
    const s = getComputedStyle(body);
    return {
      starColor: s.getPropertyValue('--star-color').trim() || '#5D4E98',
      maxLive: Math.max(1, Math.round(getNumVar(s, '--card-star-max-live', getNumVar(s, '--star-max-live', 60)))),
      spawnRate: Math.max(0, getNumVar(s, '--card-spawn-rate', getNumVar(s, '--spawn-rate', 4))),
      driftMin: Math.max(0, getNumVar(s, '--drift-min', 2.5) * remPx()),
      driftMax: Math.max(0, getNumVar(s, '--drift-max', 3.5) * remPx()),
      edgeFade: Math.max(1, getNumVar(s, '--edge-fade-width', 7) * remPx()),
      opacityMin: clamp01(getNumVar(s, '--opacity-min', 0.75)),
      opacityMax: clamp01(getNumVar(s, '--opacity-max', 1.0)),
      blurMin: Math.max(0, getNumVar(s, '--min-blur', 0.18) * remPx()),
      blurMax: Math.max(0, getNumVar(s, '--max-blur', 0.5) * remPx()),
      twinkleMin: Math.max(0.01, getNumVar(s, '--twinkle-min', 1.0)),
      twinkleMax: Math.max(0.02, getNumVar(s, '--twinkle-max', 2.0)),
      fadeInMs: Math.max(0, getNumVar(s, '--spawn-fade-in-ms', 450)),
      swayMax: Math.max(0, getNumVar(s, '--card-drip-sway', 0.55) * remPx())
    };
  };

  const totalFadeAlpha = (x, y, rect, edgeFade) => {
    const insideMin = Math.min(x, rect.width - x, y, rect.height - y);
    if (insideMin < 0) return 0;
    if (insideMin >= edgeFade) return 1;
    return clamp01(insideMin / edgeFade);
  };

  const createDripEngine = (group) => {
    const host = group.target || group.fallbackElements[0];
    const section = host ? findSection(host) : null;
    if (!host || !section) return null;

    const overlay = ensureOverlay(section);
    const stars = [];
    let rafId = 0;
    let lastTs = 0;
    let spawnCarry = 0;

    const getRects = () => ({
      hostRect: host.getBoundingClientRect(),
      sectionRect: section.getBoundingClientRect()
    });

    const spawnOne = (cfg) => {
      if (stars.length >= cfg.maxLive) return;

      const { hostRect, sectionRect } = getRects();
      if (hostRect.width < 4 || hostRect.height < 4 || sectionRect.width < 4 || sectionRect.height < 4) return;

      const x = rand(hostRect.left, hostRect.right) - sectionRect.left;
      const y = hostRect.bottom - sectionRect.top + rand(0.1, 1.5) * remPx();
      const speed = rand(cfg.driftMin, cfg.driftMax);
      const angle = (90 + rand(-18, 18)) * DEG;
      const el = document.createElement('span');
      el.className = 'star';

      const sizeRem = chooseSize(getComputedStyle(body));
      const baseOpacity = rand(cfg.opacityMin, cfg.opacityMax);
      const twDur = rand(cfg.twinkleMin, cfg.twinkleMax);
      const twPhase = Math.random() * Math.PI * 2;
      const blurPx = rand(cfg.blurMin, Math.max(cfg.blurMin, cfg.blurMax));

      el.style.color = cfg.starColor;
      el.style.setProperty('--size', sizeRem + 'rem');
      el.style.setProperty('--blur', blurPx.toFixed(2) + 'px');
      overlay.appendChild(el);

      const star = {
        el,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.abs(Math.sin(angle) * speed),
        baseOpacity,
        twDur,
        twPhase,
        bornAt: performance.now(),
        swayAmp: rand(0, cfg.swayMax),
        swayDur: rand(2.4, 5.2),
        swayPhase: Math.random() * Math.PI * 2
      };
      stars.push(star);
      renderStar(star, cfg, performance.now());
    };

    const renderStar = (star, cfg, ts) => {
      const { sectionRect } = getRects();
      const fade = totalFadeAlpha(star.x, star.y, sectionRect, cfg.edgeFade);
      const twinkle = 0.15 + 0.85 * (0.5 + 0.5 * Math.sin((ts / 1000) * ((Math.PI * 2) / star.twDur) + star.twPhase));
      const fadeIn = cfg.fadeInMs > 0 ? clamp01((ts - star.bornAt) / cfg.fadeInMs) : 1;
      const sway = star.swayAmp * Math.sin((ts / 1000) * ((Math.PI * 2) / star.swayDur) + star.swayPhase);

      star.el.style.left = (star.x + sway).toFixed(2) + 'px';
      star.el.style.top = star.y.toFixed(2) + 'px';
      star.el.style.opacity = Math.max(0, star.baseOpacity * twinkle * fade * fadeIn).toFixed(3);
    };

    const killStar = (index) => {
      const star = stars[index];
      if (star && star.el && star.el.parentNode) star.el.parentNode.removeChild(star.el);
      stars.splice(index, 1);
    };

    const tick = (ts) => {
      if (!lastTs) lastTs = ts;
      const dt = Math.min(0.05, (ts - lastTs) / 1000);
      lastTs = ts;

      const cfg = getSparkleConfig();
      spawnCarry += cfg.spawnRate * dt;
      while (spawnCarry >= 1) {
        spawnOne(cfg);
        spawnCarry -= 1;
      }

      const { sectionRect } = getRects();
      for (let i = stars.length - 1; i >= 0; i--) {
        const star = stars[i];
        star.x += star.vx * dt;
        star.y += star.vy * dt;

        if (totalFadeAlpha(star.x, star.y, sectionRect, cfg.edgeFade) <= 0) {
          killStar(i);
          continue;
        }
        renderStar(star, cfg, ts);
      }

      rafId = requestAnimationFrame(tick);
    };

    return {
      start() {
        if (rafId) cancelAnimationFrame(rafId);
        lastTs = 0;
        spawnCarry = 0;
        rafId = requestAnimationFrame(tick);
      }
    };
  };

  const startAnimation = (groups) => {
    const startTime = performance.now();
    body.classList.add('has-starfield');
    ensureSparkleStyles();
    groups.map(createDripEngine).filter(Boolean).forEach((engine) => engine.start());

    const tick = (now) => {
      const elapsed = now - startTime;
      const phase = (elapsed / CYCLE_MS) * Math.PI * 2;
      groups.forEach(({ target, fallbackElements, phaseShift }) => {
        const groupOffset = -(((Math.sin(phase + phaseShift) + 1) / 2) * AMPLITUDE_PX);
        const y = groupOffset.toFixed(2);
        const animatedElements = target ? [target] : fallbackElements;
        animatedElements.forEach((element) => {
          element.style.transform = `translate3d(0, ${y}px, 0)`;
        });
      });

      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  };

  onReady(() => {
    const initialGroups = collectGroups();
    if (initialGroups.length > 0) {
      startAnimation(initialGroups);
      return;
    }

    const observer = new MutationObserver(() => {
      const groups = collectGroups();
      if (groups.length === 0) return;
      observer.disconnect();
      startAnimation(groups);
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(() => observer.disconnect(), 10000);
  });
})();
