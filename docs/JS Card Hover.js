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
      const offset = Math.sin(phase) * AMPLITUDE_PX;

      const upOffset = -offset;
      const downOffset = offset;

      const scaleForOffset = (value) => {
        const progress = Math.max(0, Math.min(1, (-value) / AMPLITUDE_PX));
        return 1 + (progress * 0.05);
      };

      card1.forEach((element) => {
        const y = upOffset.toFixed(2);
        const scale = scaleForOffset(upOffset).toFixed(4);
        element.style.transform = `translate3d(0, ${y}px, 0) scale(${scale})`;
      });

      card2.forEach((element) => {
        const y = downOffset.toFixed(2);
        const scale = scaleForOffset(downOffset).toFixed(4);
        element.style.transform = `translate3d(0, ${y}px, 0) scale(${scale})`;
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
