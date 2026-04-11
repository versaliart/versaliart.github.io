/* Squarespace Opposing Card Float — v1.0 */

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
  const MAX_SCALE = 1.05;      // 5% scale increase at max upward offset

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return;

  const getElements = (selectors) => selectors
    .map((selector) => document.querySelector(selector))
    .filter(Boolean);

  const ensureElements = () => {
    const card1 = getElements(CARD_1_SELECTORS);
    const card2 = getElements(CARD_2_SELECTORS);

    if (!card1.length || !card2.length) return null;

    [...card1, ...card2].forEach((element) => {
      element.style.willChange = 'transform';
      element.style.transformOrigin = 'center center';
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

  const startAnimation = ({ card1, card2 }) => {
    const startTime = performance.now();

    const tick = (now) => {
      const elapsed = now - startTime;
      const phase = (elapsed / CYCLE_MS) * Math.PI * 2;
      const rawWave = Math.sin(phase);
      const easeInOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
      const easedWave = Math.sign(rawWave) * easeInOutSine(Math.abs(rawWave));
      const offset = easedWave * AMPLITUDE_PX;

      const card1Y = -offset;
      const card2Y = offset;

      // Scale is derived directly from the same eased Y value used for movement,
      // so translation + scale stay concurrent for every frame.
      const card1Lift = Math.max(0, -card1Y / AMPLITUDE_PX);
      const card2Lift = Math.max(0, -card2Y / AMPLITUDE_PX);
      const card1Scale = 1 + ((MAX_SCALE - 1) * card1Lift);
      const card2Scale = 1 + ((MAX_SCALE - 1) * card2Lift);

      card1.forEach((element) => {
        element.style.transform = `translate3d(0, ${card1Y.toFixed(2)}px, 0) scale(${card1Scale.toFixed(4)})`;
      });

      card2.forEach((element) => {
        element.style.transform = `translate3d(0, ${card2Y.toFixed(2)}px, 0) scale(${card2Scale.toFixed(4)})`;
      });

      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  };

  onReady(() => {
    const initial = ensureElements();
    if (initial) {
      startAnimation(initial);
      return;
    }

    const observer = new MutationObserver(() => {
      const elements = ensureElements();
      if (!elements) return;
      observer.disconnect();
      startAnimation(elements);
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });

    setTimeout(() => observer.disconnect(), 10000);
  });
})();
