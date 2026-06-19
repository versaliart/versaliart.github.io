/* Squarespace Opposing Card Float + Hover Edge Sparkles — v1.6 */

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
  const SHADOW_FADE_START_DISTANCE_RATIO = 0.5; // shadow only fades in during the final half of card travel
  const CARD_SHADOW_RADIUS = '8px'; // keep the glow aligned with the cards' rounded corners

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const root = document.documentElement;
  const body = document.body;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const clamp01 = (value) => clamp(value, 0, 1);
  const rand = (min, max) => min + Math.random() * (max - min);
  const remPx = () => parseFloat(getComputedStyle(root).fontSize) || 16;

  const CARD_IMG_SELECTORS = [CARD_1_SELECTORS[0], CARD_2_SELECTORS[0]];

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
    return Math.random() < 0.42 ? sizeL : sizeM;
  };

  const chooseHoverSize = (style) => chooseSizeFromVars(style, {
    phi: '--hover-star-phi',
    large: '--hover-star-size-large',
    medium: '--hover-star-size-medium'
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

  const ensureHoverOverlay = (section) => ensureLayer(section, 'hovercard-edge-sparkles');


  const ensureSparkleStyles = () => {
    if (document.getElementById('hovercard-sparkle-styles')) return;
    const style = document.createElement('style');
    style.id = 'hovercard-sparkle-styles';
    style.textContent = `
      body.has-starfield{
        --star-glow-color: rgba(60,51,97,0.9); /* Color of the soft glow used by the card box-shadow. */
        --star-glow-blur: 20px; /* Blur radius used by the card box-shadow. */
        --star-glow-spread: 1px; /* Spread radius used by the card box-shadow. */
        --hover-star-count: 1; /* Number of hover sparkles created per burst. */
        --hover-star-burst-interval-ms: 320; /* Delay between hover sparkle bursts while hovering. */
        --hover-star-spin-ms: 550; /* Lifetime and spin duration for each hover sparkle. */
        --hover-star-fade-in-ms: 170; /* Time a hover sparkle takes to fade in. */
        --hover-star-fade-out-ms: 270; /* Time a hover sparkle takes to fade out before removal. */
        --hover-star-grow-from: 0.25; /* Starting scale for a hover sparkle. */
        --hover-star-grow-to: 1.20; /* Ending scale for a hover sparkle. */
        --hover-star-edge-jitter: 0rem; /* Random offset from the card edge for hover sparkle placement. */
        --hover-star-edge-inset-ratio: 0.75; /* Pulls hover sparkle centers inward by this fraction of their size so they hug the card edge. */
        --hover-star-color: #9989EC; /* Fill color for hover sparkle SVG masks. */
        --hover-star-glow-color: rgba(153,137,236,0.80); /* Color of the soft glow behind hover sparkles. */
        --hover-star-glow-blur: 20px; /* Fallback blur radius for hover sparkle glows. */
        --hover-star-glow-spread: 1px; /* Extra inset/outset space used by hover sparkle glow halos. */
        --hover-star-blur-min: 0.18rem; /* Minimum glow blur assigned to hover sparkles. */
        --hover-star-blur-max: 0.5rem; /* Maximum glow blur assigned to hover sparkles. */
        --hover-star-opacity-min: 0.75; /* Lowest random opacity assigned to hover sparkles. */
        --hover-star-opacity-max: 1.00; /* Highest random opacity assigned to hover sparkles. */
        --hover-star-url: url("https://versaliart.github.io/MMsparkle.svg"); /* SVG mask image used for hover sparkle shapes. */
        --hover-star-phi: 1.618; /* Golden-ratio divisor used to derive the medium hover sparkle size. */
        --hover-star-size-large: 1.5rem; /* Largest possible hover sparkle size. */
        --hover-star-size-medium: calc(var(--hover-star-size-large) / var(--hover-star-phi)); /* Smallest hover sparkle size emitted after removing the previous small size. */
      }
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
          --hover-star-count: 6; /* Emits more hover sparkles per burst on mobile/touch layouts. */
          --hover-star-size-large: 1rem; /* Reduces the largest hover sparkle size on mobile. */
        }
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
      const cardImgElements = fallbackElements.filter((element) => CARD_IMG_SELECTORS.some((selector) => element.matches(selector)));

      animatedElements.forEach((element) => {
        element.style.willChange = 'transform';
      });
      cardImgElements.forEach((element) => {
        element.style.willChange = 'transform, box-shadow';
        element.style.borderRadius = CARD_SHADOW_RADIUS;
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

  const colorWithOpacity = (color, opacity) => {
    const alphaMultiplier = clamp01(opacity);
    const rgba = color.match(/^rgba?\(([^)]+)\)$/i);
    if (rgba) {
      const parts = rgba[1].split(',').map((part) => part.trim());
      const [r, g, b] = parts;
      const alpha = parts.length > 3 ? parseFloat(parts[3]) : 1;
      const finalAlpha = (Number.isFinite(alpha) ? alpha : 1) * alphaMultiplier;
      return `rgba(${r}, ${g}, ${b}, ${clamp01(finalAlpha).toFixed(3)})`;
    }

    const hex = color.match(/^#([\da-f]{3}|[\da-f]{6})$/i);
    if (hex) {
      const value = hex[1].length === 3
        ? hex[1].split('').map((char) => char + char).join('')
        : hex[1];
      const r = parseInt(value.slice(0, 2), 16);
      const g = parseInt(value.slice(2, 4), 16);
      const b = parseInt(value.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${alphaMultiplier.toFixed(3)})`;
    }

    return alphaMultiplier <= 0 ? 'transparent' : color;
  };

  const getCardShadow = (opacity) => {
    const alpha = clamp01(opacity);
    if (alpha <= 0) return 'none';

    const s = getComputedStyle(body);
    const color = s.getPropertyValue('--star-glow-color').trim() || 'rgba(60,51,97,0.9)';
    const blur = s.getPropertyValue('--star-glow-blur').trim() || '20px';
    const spread = s.getPropertyValue('--star-glow-spread').trim() || '1px';
    return `0 0 ${blur} ${spread} ${colorWithOpacity(color, alpha)}`;
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
    let burstIndex = 0;
    let previousBurstSide = null;
    const sideCounts = { top: 0, right: 0, bottom: 0, left: 0 };
    const sides = ['top', 'right', 'bottom', 'left'];
    const GOLDEN_RATIO_CONJUGATE = 0.618033988749895;

    const getRects = () => ({
      hostRect: getUnionRect(emitterElements) || host.getBoundingClientRect(),
      sectionRect: section.getBoundingClientRect()
    });

    const chooseBurstSide = () => {
      if (burstIndex === 0) return 'top';

      const eligibleSides = sides.filter((side) => side !== previousBurstSide);
      const lowestCount = Math.min(...eligibleSides.map((side) => sideCounts[side]));
      const leastUsedSides = eligibleSides.filter((side) => sideCounts[side] === lowestCount);
      return leastUsedSides[Math.floor(rand(0, leastUsedSides.length))];
    };

    const edgePoint = (hostRect, sectionRect, jitter, inset, side, index, count) => {
      const offset = rand(-jitter, jitter);
      const spread = count > 1
        ? (index + 0.5) / count
        : ((burstIndex * GOLDEN_RATIO_CONJUGATE) % 1);
      const position = burstIndex === 0 && index === 0
        ? 0.92
        : clamp(spread + rand(-0.16, 0.16), 0.06, 0.94);
      let x;
      let y;
      if (side === 'top') {
        x = hostRect.left + (hostRect.width * position);
        y = hostRect.top + inset + offset;
      } else if (side === 'right') {
        x = hostRect.right - inset + offset;
        y = hostRect.top + (hostRect.height * position);
      } else if (side === 'bottom') {
        x = hostRect.left + (hostRect.width * (1 - position));
        y = hostRect.bottom - inset + offset;
      } else {
        x = hostRect.left + inset + offset;
        y = hostRect.top + (hostRect.height * (1 - position));
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

    const spawnHoverStar = (cfg, side, index, count) => {
      const { hostRect, sectionRect } = getRects();
      if (hostRect.width < 4 || hostRect.height < 4 || sectionRect.width < 4 || sectionRect.height < 4) return;

      const hoverSizeRem = chooseHoverSize(getComputedStyle(body));
      const point = edgePoint(hostRect, sectionRect, cfg.edgeJitter, hoverSizeRem * remPx() * cfg.edgeInsetRatio, side, index, count);
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
      const side = chooseBurstSide();
      sideCounts[side] += 1;
      previousBurstSide = side;
      for (let i = 0; i < cfg.count; i++) spawnHoverStar(cfg, side, i, cfg.count);
      burstIndex += 1;
      burstTimer = window.setTimeout(burst, cfg.burstIntervalMs);
    };

    const start = () => {
      if (hoverActive) return;
      hoverActive = true;
      burstIndex = 0;
      previousBurstSide = null;
      sides.forEach((side) => { sideCounts[side] = 0; });
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

  const startAnimation = (groups) => {
    const startTime = performance.now();
    body.classList.add('has-starfield');
    ensureSparkleStyles();
    groups.map(createHoverSparkleEngine).filter(Boolean);

    const tick = (now) => {
      const elapsed = now - startTime;
      const phase = (elapsed / CYCLE_MS) * Math.PI * 2;
      groups.forEach(({ target, fallbackElements, phaseShift }) => {
        const movementProgress = (Math.sin(phase + phaseShift) + 1) / 2;
        const groupOffset = -(movementProgress * AMPLITUDE_PX);
        const y = groupOffset.toFixed(2);
        const shadowProgress = clamp01((movementProgress - SHADOW_FADE_START_DISTANCE_RATIO) / (1 - SHADOW_FADE_START_DISTANCE_RATIO));
        const shadow = getCardShadow(shadowProgress);
        const animatedElements = target ? [target] : fallbackElements;
        const cardImgElements = fallbackElements.filter((element) => CARD_IMG_SELECTORS.some((selector) => element.matches(selector)));

        animatedElements.forEach((element) => {
          element.style.transform = `translate3d(0, ${y}px, 0)`;
        });
        cardImgElements.forEach((element) => {
          element.style.boxShadow = shadow;
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
