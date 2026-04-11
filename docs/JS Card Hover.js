/* Squarespace Opposing Card Float — v1.1 */

(() => {
  const CARD_1_SELECTORS = [
    '#block-yui_3_17_2_1_1756837579989_9426',
    '#block-yui_3_17_2_1_1762293512044_1730',
    '#block-0a2a57dba5d721018c4c',
    '#block-yui_3_17_2_1_1757554504439_2552',
  ];

  const CARD_2_SELECTORS = [
    '#block-057950c6d7e2d5e4fe2a',
    '#block-1e14a0c2b150cb046369',
    '#block-3fd5474bac7cfdc5bd19',
    '#block-yui_3_17_2_1_1772052368029_9026',
  ];

  const AMPLITUDE_PX = 8;      // max vertical movement up/down
  const CYCLE_MS = 3600;       // time for a full up+down cycle
  const MAX_SCALE = 1.2;       // +20% at the top
  const SHADOW_MIN_SCALE = 0.8; // -20% at the top
  const APPEAR_TIMEOUT_MS = 2200;
  const shadowCache = new WeakMap();

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return;

  const getElements = (selectors) => selectors
    .map((selector) => document.querySelector(selector))
    .filter(Boolean);

  const scaleShadowValue = (value, scale) => {
    if (!value || value === 'none') return '';
    return value.replace(/-?\d*\.?\d+px/g, (match) => {
      const raw = Number.parseFloat(match);
      if (!Number.isFinite(raw)) return match;
      return `${(raw * scale).toFixed(2)}px`;
    });
  };

  const primeShadowCache = (element) => {
    if (shadowCache.has(element)) return;
    const style = window.getComputedStyle(element);
    shadowCache.set(element, {
      boxShadow: style.boxShadow,
      filter: style.filter,
    });
  };

  const applyInverseShadowScale = (element, scale) => {
    const cached = shadowCache.get(element);
    if (!cached) return;

    if (cached.boxShadow && cached.boxShadow !== 'none') {
      element.style.boxShadow = scaleShadowValue(cached.boxShadow, scale);
    }

    if (cached.filter && cached.filter !== 'none' && cached.filter.includes('drop-shadow')) {
      element.style.filter = scaleShadowValue(cached.filter, scale);
    }
  };

  const ensureElements = () => {
    const card1 = getElements(CARD_1_SELECTORS);
    const card2 = getElements(CARD_2_SELECTORS);

    if (!card1.length || !card2.length) return null;

    [...card1, ...card2].forEach((element) => {
      element.style.willChange = 'transform, filter';
      element.style.transformOrigin = 'center center';
      primeShadowCache(element);
    });

    return { card1, card2 };
  };

  const onReady = (fn) => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
      return;
    }
    fn();
  };

  const easeInOutSine = (t) => 0.5 - (Math.cos(Math.PI * t) / 2);

  const inferAppearDurationMs = (elements) => {
    let maxMs = 0;
    elements.forEach((element) => {
      const style = window.getComputedStyle(element);
      const parseTimeList = (value) => value
        .split(',')
        .map((token) => token.trim())
        .map((token) => (
          token.endsWith('ms')
            ? Number.parseFloat(token)
            : Number.parseFloat(token) * 1000
        ))
        .filter((n) => Number.isFinite(n) && n > 0);

      const transitionDurations = parseTimeList(style.transitionDuration);
      const transitionDelays = parseTimeList(style.transitionDelay);
      const animationDurations = parseTimeList(style.animationDuration);
      const animationDelays = parseTimeList(style.animationDelay);

      const transitionMs = transitionDurations.reduce((acc, duration, index) => {
        const delay = transitionDelays[index] ?? transitionDelays[0] ?? 0;
        return Math.max(acc, duration + delay);
      }, 0);

      const animationMs = animationDurations.reduce((acc, duration, index) => {
        const delay = animationDelays[index] ?? animationDelays[0] ?? 0;
        return Math.max(acc, duration + delay);
      }, 0);

      maxMs = Math.max(maxMs, transitionMs, animationMs);
    });
    return maxMs;
  };

  const waitForOnAppearComplete = (elements, timeoutMs = APPEAR_TIMEOUT_MS) => new Promise((resolve) => {
    const settleMs = Math.min(Math.max(inferAppearDurationMs(elements), 0), timeoutMs);
    if (settleMs === 0) {
      requestAnimationFrame(resolve);
      return;
    }
    window.setTimeout(resolve, settleMs);
  });

  const startAnimation = ({ card1, card2 }) => {
    const startTime = performance.now();

    const tick = (now) => {
      const elapsed = now - startTime;
      const cycle = (elapsed % CYCLE_MS) / CYCLE_MS; // 0..1
      const eased = easeInOutSine(cycle);
      const offset = ((eased * 2) - 1) * AMPLITUDE_PX; // -amp..+amp

      const card1Progress = 1 - eased; // card1 is at top when eased=0
      const card2Progress = eased;     // card2 is at top when eased=1

      const card1Scale = 1 + ((MAX_SCALE - 1) * card1Progress);
      const card2Scale = 1 + ((MAX_SCALE - 1) * card2Progress);

      const card1ShadowScale = 1 - ((1 - SHADOW_MIN_SCALE) * card1Progress);
      const card2ShadowScale = 1 - ((1 - SHADOW_MIN_SCALE) * card2Progress);

      card1.forEach((element) => {
        element.style.transform = `translate3d(0, ${(-offset).toFixed(2)}px, 0) scale(${card1Scale.toFixed(4)})`;
        applyInverseShadowScale(element, card1ShadowScale);
      });

      card2.forEach((element) => {
        element.style.transform = `translate3d(0, ${offset.toFixed(2)}px, 0) scale(${card2Scale.toFixed(4)})`;
        applyInverseShadowScale(element, card2ShadowScale);
      });

      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  };

  onReady(() => {
    const initial = ensureElements();
    if (initial) {
      waitForOnAppearComplete([...initial.card1, ...initial.card2]).then(() => {
        startAnimation(initial);
      });
      return;
    }

    const observer = new MutationObserver(() => {
      const elements = ensureElements();
      if (!elements) return;
      observer.disconnect();
      waitForOnAppearComplete([...elements.card1, ...elements.card2]).then(() => {
        startAnimation(elements);
      });
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });

    setTimeout(() => observer.disconnect(), 10000);
  });
})();
