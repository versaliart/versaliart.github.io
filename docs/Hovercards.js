/* Squarespace Opposing Card Float + Dripping Card Sparkles + Hover Edge Sparkles — v1.4 */

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

  const chooseSizeFromVars = (style, names) => {
    const phi = getNumVar(style, names.phi, 1.618);
    const sizeL = getNumVar(style, names.large, 1.5);
    const sizeM = getNumVar(style, names.medium, sizeL / phi);
    const sizeS = getNumVar(style, names.small, sizeM / phi);
    const r = Math.random();
    if (r < 0.30) return sizeL;
    if (r < 0.72) return sizeM;
    return sizeS;
  };

  const chooseSize = (style) => chooseSizeFromVars(style, {
    phi: '--phi',
    large: '--size-large',
    medium: '--size-medium',
    small: '--size-small'
  });

  const chooseHoverSize = (style) => chooseSizeFromVars(style, {
    phi: '--hover-star-phi',
    large: '--hover-star-size-large',
    medium: '--hover-star-size-medium',
    small: '--hover-star-size-small'
  });

  const findSection = (host) => (
    host.closest('[data-section-id]') ||
    host.closest('section') ||
    host.closest('.page-section') ||
    host.parentElement
  );

  const ensureLayer = (section, className) => {
    const cs = getComputedStyle(section);
    if (cs.position === 'static') section.style.position = 'relative';

    let layer = section.querySelector(`:scope > .${className}`);
    if (!layer) {
      layer = document.createElement('div');
      layer.className = className;
      section.appendChild(layer);
    }
    return layer;
  };

  const ensureOverlay = (section) => ensureLayer(section, 'shape-edge-sparkles');
  const ensureHoverOverlay = (section) => ensureLayer(section, 'hovercard-edge-sparkles');


  const ensureSparkleStyles = () => {
    if (document.getElementById('hovercard-drip-sparkle-styles')) return;
    const style = document.createElement('style');
    style.id = 'hovercard-drip-sparkle-styles';
    style.textContent = `
      body.has-starfield{
        --star-count: 40; /* Number of candidate edge points used when distributing drip sparkles. */
        --star-min-gap: 2px; /* Minimum spacing kept between generated drip sparkle positions. */
        --jitter-min: 0.10rem; /* Smallest random offset applied to drip sparkle spawn points. */
        --jitter-max: 2.00rem; /* Largest random offset applied to drip sparkle spawn points. */
        --star-randomize: 0.15; /* Amount of randomness blended into drip sparkle placement. */
        --spawn-spread-min: 0.10rem; /* Minimum horizontal spread from the card edge when a drip sparkle starts. */
        --spawn-spread-max: 1.50rem; /* Maximum horizontal spread from the card edge when a drip sparkle starts. */
        --spawn-fade-in-ms: 350; /* Time a newly spawned drip sparkle takes to fade in. */
        --twinkle-min: 1.0; /* Shortest twinkle cycle duration for drip sparkles, in seconds. */
        --twinkle-max: 2.0; /* Longest twinkle cycle duration for drip sparkles, in seconds. */
        --opacity-min: 0.75; /* Lowest random opacity assigned to drip sparkles. */
        --opacity-max: 1.00; /* Highest random opacity assigned to drip sparkles. */
        --phi: 1.618; /* Golden-ratio divisor used to derive medium and small drip sparkle sizes. */
        --size-large: 1.5rem; /* Largest possible drip sparkle size. */
        --size-medium: calc(var(--size-large) / var(--phi)); /* Medium drip sparkle size derived from the large size. */
        --size-small: calc(var(--size-medium) / var(--phi)); /* Smallest drip sparkle size derived from the medium size. */
        --avoid-vert-strength: 1; /* Strength of the vertical avoidance bias for drip sparkle placement. */
        --avoid-vert-width-deg: 25; /* Angular width of the vertical avoidance zone for drip sparkles. */
        --min-blur: 0.18rem; /* Minimum glow blur assigned to drip sparkles. */
        --max-blur: 0.5rem; /* Maximum glow blur assigned to drip sparkles. */
        --star-color: #5D4E98; /* Fill color for drip sparkle SVG masks. */
        --star-glow-color: rgba(60,51,97,0.9); /* Color of the soft glow behind drip sparkles. */
        --star-glow-blur: 20px; /* Fallback blur radius for drip sparkle glows. */
        --star-glow-spread: 1px; /* Extra inset/outset space used by drip sparkle glow halos. */
        --star-url: url("https://versaliart.github.io/MMsparkle.svg"); /* SVG mask image used for drip sparkle shapes. */
        --jitter-fallback-mult: 2; /* Multiplier used when fallback jitter spacing needs to expand. */
        --jitter-fallback-steps: 3; /* Number of fallback attempts for finding a jittered drip sparkle point. */
        --star-max-live: 12; /* Maximum number of drip sparkles visible at one time. */
        --spawn-rate: 1; /* Number of drip sparkles emitted per second. */
        --drift-min: 2.5rem; /* Minimum downward drift distance per second for drip sparkles. */
        --drift-max: 3.5rem; /* Maximum downward drift distance per second for drip sparkles. */
        --edge-fade-width: 7.5rem; /* Distance from section edges over which drip sparkles fade out. */
        --card-spawn-lift-max-ratio: 0.0; /* Maximum portion of card height a drip sparkle can spawn above the lower edge. */
        --hover-star-count: 2; /* Number of hover sparkles created per burst. */
        --hover-star-burst-interval-ms: 420; /* Delay between hover sparkle bursts while hovering. */
        --hover-star-spin-ms: 550; /* Lifetime and spin duration for each hover sparkle. */
        --hover-star-fade-in-ms: 170; /* Time a hover sparkle takes to fade in. */
        --hover-star-fade-out-ms: 270; /* Time a hover sparkle takes to fade out before removal. */
        --hover-star-grow-from: 0.25; /* Starting scale for a hover sparkle. */
        --hover-star-grow-to: 1.20; /* Ending scale for a hover sparkle. */
        --hover-star-edge-jitter: 0rem; /* Random offset from the card edge for hover sparkle placement. */
        --hover-star-edge-inset-ratio: 0.5; /* Pulls hover sparkle centers inward by this fraction of their size so they hug the card edge. */
        --hover-star-color: #9989EC; /* Fill color for hover sparkle SVG masks. */
        --hover-star-glow-color: rgba(153,137,236,0.80); /* Color of the soft glow behind hover sparkles. */
        --hover-star-glow-blur: 20px; /* Fallback blur radius for hover sparkle glows. */
        --hover-star-glow-spread: 1px; /* Extra inset/outset space used by hover sparkle glow halos. */
        --hover-star-blur-min: 0.18rem; /* Minimum glow blur assigned to hover sparkles. */
        --hover-star-blur-max: 0.5rem; /* Maximum glow blur assigned to hover sparkles. */
        --hover-star-opacity-min: 0.75; /* Lowest random opacity assigned to hover sparkles. */
        --hover-star-opacity-max: 1.00; /* Highest random opacity assigned to hover sparkles. */
        --hover-star-url: url("https://versaliart.github.io/MMsparkle.svg"); /* SVG mask image used for hover sparkle shapes. */
        --hover-star-phi: 1.618; /* Golden-ratio divisor used to derive medium and small hover sparkle sizes. */
        --hover-star-size-large: 1.5rem; /* Largest possible hover sparkle size. */
        --hover-star-size-medium: calc(var(--hover-star-size-large) / var(--hover-star-phi)); /* Medium hover sparkle size derived from the large size. */
        --hover-star-size-small: calc(var(--hover-star-size-medium) / var(--hover-star-phi)); /* Smallest hover sparkle size derived from the medium size. */
      }
      .shape-edge-sparkles,
      .hovercard-edge-sparkles{
        position: absolute;
        inset: 0;
        pointer-events: none;
        z-index: 10;
        overflow: visible;
        contain: layout style paint;
      }
      .hovercard-edge-sparkles{
        z-index: 11;
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
        mix-blend-mode: screen;
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

      .hovercard-edge-sparkles .hover-star{
        position: absolute;
        left: 0;
        top: 0;
        width: var(--hover-size, 1rem);
        height: var(--hover-size, 1rem);
        transform: translate(-50%, -50%) scale(var(--hover-star-grow-from, 0.25)) rotate(0deg);
        opacity: 0;
        color: var(--hover-star-color);
        mix-blend-mode: screen;
        pointer-events: none;
        z-index: 1;
        isolation: isolate;
        will-change: transform, opacity;
      }
      .hovercard-edge-sparkles .hover-star::before{
        content: '';
        position: absolute;
        inset: calc(var(--hover-star-glow-spread) * -1);
        border-radius: 50%;
        background: radial-gradient(circle, var(--hover-star-glow-color) 0%, color-mix(in srgb, var(--hover-star-glow-color) 70%, transparent) 45%, transparent 100%);
        filter: blur(var(--hover-blur, var(--hover-star-glow-blur)));
        mix-blend-mode: screen;
        pointer-events: none;
        z-index: 0;
      }
      .hovercard-edge-sparkles .hover-star::after{
        content: '';
        position: absolute;
        inset: 0;
        background: currentColor;
        -webkit-mask: var(--hover-star-url) center / contain no-repeat;
                mask: var(--hover-star-url) center / contain no-repeat;
        pointer-events: none;
        z-index: 1;
      }
      @media screen and (max-width: 767px){
        body.has-starfield{
          --edge-fade-width: 2rem; /* Narrows the drip sparkle edge fade on mobile. */
          --spawn-rate: 3; /* Increases drip sparkle emissions per second on mobile. */
          --star-max-live: 20; /* Caps simultaneous drip sparkles on mobile. */
          --size-large: 1rem; /* Reduces the largest drip sparkle size on mobile. */
          --hover-star-count: 6; /* Emits more hover sparkles per burst on mobile/touch layouts. */
          --hover-star-size-large: 1rem; /* Reduces the largest hover sparkle size on mobile. */
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
      swayMax: Math.max(0, getNumVar(s, '--card-drip-sway', 0.55) * remPx()),
      spawnLiftMaxRatio: clamp01(getNumVar(s, '--card-spawn-lift-max-ratio', 0.10))
    };
  };

  const totalFadeAlpha = (x, y, rect, edgeFade) => {
    const insideMin = Math.min(x, rect.width - x, y, rect.height - y);
    if (insideMin < 0) return 0;
    if (insideMin >= edgeFade) return 1;
    return clamp01(insideMin / edgeFade);
  };

  const getUnionRect = (elements) => {
    const rects = elements
      .filter(Boolean)
      .map((element) => element.getBoundingClientRect())
      .filter((rect) => rect.width > 0 && rect.height > 0);

    if (rects.length === 0) return null;

    const left = Math.min(...rects.map((rect) => rect.left));
    const right = Math.max(...rects.map((rect) => rect.right));
    const top = Math.min(...rects.map((rect) => rect.top));
    const bottom = Math.max(...rects.map((rect) => rect.bottom));

    return {
      left,
      right,
      top,
      bottom,
      width: right - left,
      height: bottom - top
    };
  };

  const getHoverSparkleConfig = () => {
    const s = getComputedStyle(body);
    const spinMs = Math.max(1, getNumVar(s, '--hover-star-spin-ms', 900));
    return {
      count: Math.max(1, Math.round(getNumVar(s, '--hover-star-count', 9))),
      burstIntervalMs: Math.max(1, getNumVar(s, '--hover-star-burst-interval-ms', 520)),
      spinMs,
      fadeInMs: clamp(getNumVar(s, '--hover-star-fade-in-ms', 160), 0, spinMs),
      fadeOutMs: clamp(getNumVar(s, '--hover-star-fade-out-ms', 320), 0, spinMs),
      growFrom: Math.max(0, getNumVar(s, '--hover-star-grow-from', 0.25)),
      growTo: Math.max(0, getNumVar(s, '--hover-star-grow-to', 1.2)),
      edgeJitter: Math.max(0, getNumVar(s, '--hover-star-edge-jitter', 0.55) * remPx()),
      edgeInsetRatio: Math.max(0, getNumVar(s, '--hover-star-edge-inset-ratio', 0.5)),
      starColor: s.getPropertyValue('--hover-star-color').trim() || '#9989EC',
      blurMin: Math.max(0, getNumVar(s, '--hover-star-blur-min', 0.18) * remPx()),
      blurMax: Math.max(0, getNumVar(s, '--hover-star-blur-max', 0.5) * remPx()),
      opacityMin: clamp01(getNumVar(s, '--hover-star-opacity-min', 0.75)),
      opacityMax: clamp01(getNumVar(s, '--hover-star-opacity-max', 1.0))
    };
  };

  const createHoverSparkleEngine = (group) => {
    const host = group.target || group.fallbackElements[0];
    const emitterElements = group.fallbackElements.length > 0 ? group.fallbackElements : [host];
    const section = host ? findSection(host) : null;
    if (!host || !section) return null;

    const overlay = ensureHoverOverlay(section);
    const stars = [];
    let hoverActive = false;
    let burstTimer = 0;

    const getRects = () => ({
      hostRect: getUnionRect(emitterElements) || host.getBoundingClientRect(),
      sectionRect: section.getBoundingClientRect()
    });

    const edgePoint = (hostRect, sectionRect, jitter, inset) => {
      const side = Math.floor(rand(0, 4));
      const offset = rand(-jitter, jitter);
      let x;
      let y;
      if (side === 0) {
        x = rand(hostRect.left, hostRect.right);
        y = hostRect.top + inset + offset;
      } else if (side === 1) {
        x = hostRect.right - inset + offset;
        y = rand(hostRect.top, hostRect.bottom);
      } else if (side === 2) {
        x = rand(hostRect.left, hostRect.right);
        y = hostRect.bottom - inset + offset;
      } else {
        x = hostRect.left + inset + offset;
        y = rand(hostRect.top, hostRect.bottom);
      }
      return { x: x - sectionRect.left, y: y - sectionRect.top };
    };

    const renderHoverStar = (star, cfg, ts) => {
      const progress = clamp01((ts - star.bornAt) / cfg.spinMs);
      const fadeOutStart = cfg.fadeOutMs >= cfg.spinMs ? 0 : 1 - (cfg.fadeOutMs / cfg.spinMs);
      const fadeIn = cfg.fadeInMs > 0 ? clamp01((ts - star.bornAt) / cfg.fadeInMs) : 1;
      const fadeOut = cfg.fadeOutMs > 0 && progress > fadeOutStart ? clamp01((1 - progress) / (cfg.fadeOutMs / cfg.spinMs)) : 1;
      const opacity = star.baseOpacity * Math.min(fadeIn, fadeOut);
      const scale = cfg.growFrom + ((cfg.growTo - cfg.growFrom) * progress);
      const rotation = star.rotationStart + (360 * progress * star.direction);

      star.el.style.opacity = opacity.toFixed(3);
      star.el.style.transform = `translate(-50%, -50%) scale(${scale.toFixed(3)}) rotate(${rotation.toFixed(2)}deg)`;
    };

    const removeHoverStar = (star) => {
      const index = stars.indexOf(star);
      if (index >= 0) stars.splice(index, 1);
      if (star.el && star.el.parentNode) star.el.parentNode.removeChild(star.el);
    };

    const spawnHoverStar = (cfg) => {
      const { hostRect, sectionRect } = getRects();
      if (hostRect.width < 4 || hostRect.height < 4 || sectionRect.width < 4 || sectionRect.height < 4) return;

      const hoverSizeRem = chooseHoverSize(getComputedStyle(body));
      const point = edgePoint(hostRect, sectionRect, cfg.edgeJitter, hoverSizeRem * remPx() * cfg.edgeInsetRatio);
      const el = document.createElement('span');
      el.className = 'hover-star';
      el.style.left = point.x.toFixed(2) + 'px';
      el.style.top = point.y.toFixed(2) + 'px';
      el.style.color = cfg.starColor;
      el.style.setProperty('--hover-size', hoverSizeRem + 'rem');
      el.style.setProperty('--hover-blur', rand(cfg.blurMin, Math.max(cfg.blurMin, cfg.blurMax)).toFixed(2) + 'px');
      overlay.appendChild(el);

      const star = {
        el,
        bornAt: performance.now(),
        baseOpacity: rand(cfg.opacityMin, cfg.opacityMax),
        rotationStart: rand(0, 360),
        direction: Math.random() < 0.5 ? -1 : 1
      };
      stars.push(star);

      const tick = (ts) => {
        if (!stars.includes(star)) return;
        renderHoverStar(star, cfg, ts);
        if (ts - star.bornAt >= cfg.spinMs) {
          removeHoverStar(star);
          return;
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    const burst = () => {
      if (!hoverActive) return;
      const cfg = getHoverSparkleConfig();
      for (let i = 0; i < cfg.count; i++) spawnHoverStar(cfg);
      burstTimer = window.setTimeout(burst, cfg.burstIntervalMs);
    };

    const start = () => {
      if (hoverActive) return;
      hoverActive = true;
      burst();
    };

    const stop = () => {
      hoverActive = false;
      if (burstTimer) window.clearTimeout(burstTimer);
      burstTimer = 0;
    };

    const eventTargets = group.target ? [group.target] : emitterElements;
    eventTargets.forEach((target) => {
      target.addEventListener('pointerenter', start);
      target.addEventListener('pointerleave', stop);
      target.addEventListener('focusin', start);
      target.addEventListener('focusout', stop);
    });

    return { start: () => {} };
  };

  const createDripEngine = (group) => {
    const host = group.target || group.fallbackElements[0];
    const emitterElements = group.fallbackElements.length > 0 ? group.fallbackElements : [host];
    const section = host ? findSection(host) : null;
    if (!host || !section) return null;

    const overlay = ensureOverlay(section);
    const stars = [];
    let rafId = 0;
    let lastTs = 0;
    let spawnCarry = 0;

    const getRects = () => ({
      hostRect: getUnionRect(emitterElements) || host.getBoundingClientRect(),
      sectionRect: section.getBoundingClientRect()
    });

    const spawnOne = (cfg) => {
      if (stars.length >= cfg.maxLive) return;

      const { hostRect, sectionRect } = getRects();
      if (hostRect.width < 4 || hostRect.height < 4 || sectionRect.width < 4 || sectionRect.height < 4) return;

      const x = rand(hostRect.left, hostRect.right) - sectionRect.left;
      const spawnLift = rand(0, hostRect.height * cfg.spawnLiftMaxRatio);
      const y = hostRect.bottom - sectionRect.top - spawnLift;
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
    groups.map(createHoverSparkleEngine).filter(Boolean);

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
