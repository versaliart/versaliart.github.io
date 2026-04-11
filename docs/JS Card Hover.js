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

  const AMPLITUDE_PX = 8; // max upward movement
  const CYCLE_MS = 3600;  // full cycle: 0 -> up -> 0

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const getElements = (selectors) => selectors
    .map((selector) => document.querySelector(selector))
    .filter(Boolean);

  const collectGroups = () => {
    const group1 = getElements(CARD_1_SELECTORS);
    const group2 = getElements(CARD_2_SELECTORS);

    const groups = [
      { elements: group1, phaseShift: 0 },
      { elements: group2, phaseShift: Math.PI },
    ].filter((group) => group.elements.length > 0);

    [...card1, ...card2].forEach((element) => {
      element.style.willChange = 'transform';
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

  const startAnimation = (groups) => {
    const startTime = performance.now();

    const tick = (now) => {
      const elapsed = now - startTime;
      const phase = (elapsed / CYCLE_MS) * Math.PI * 2;

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
    const initialGroups = collectGroups();
    if (initialGroups) {
      startAnimation(initialGroups);
      return;
    }

    const observer = new MutationObserver(() => {
      const groups = collectGroups();
      if (!groups) return;
      observer.disconnect();
      startAnimation(groups);
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(() => observer.disconnect(), 10000);
  });
})();
