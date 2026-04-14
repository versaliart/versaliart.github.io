/* Squarespace Opposing Card Float — v1.3 */

(() => {
  const CARD_1_WRAPPER_SELECTOR = '.sqs-layout-item:has(#block-yui_3_17_2_1_1756837579989_9426):has(#block-yui_3_17_2_1_1762293512044_1730):has(#block-yui_3_17_2_1_1757554504439_2552)';
  const CARD_2_WRAPPER_SELECTOR = '.sqs-layout-item:has(#block-057950c6d7e2d5e4fe2a):has(#block-1e14a0c2b150cb046369):has(#block-3fd5474bac7cfdc5bd19)';

  const AMPLITUDE_PX = 15; // max upward movement
  const CYCLE_MS = 4600;  // full cycle: 0 -> up -> 0

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const collectGroups = () => {
    const groups = [
      { target: document.querySelector(CARD_1_WRAPPER_SELECTOR), phaseShift: 0 },
      { target: document.querySelector(CARD_2_WRAPPER_SELECTOR), phaseShift: Math.PI },
    ].filter((group) => group.target);

    groups.forEach(({ target }) => {
      target.style.willChange = 'transform';
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

      const scaleForOffset = (value) => {
        const progress = Math.max(0, Math.min(1, (-value) / AMPLITUDE_PX));
        return 1 + (progress * 0.05);
      };

      groups.forEach(({ target, phaseShift }) => {
        const groupOffset = -(((Math.sin(phase + phaseShift) + 1) / 2) * AMPLITUDE_PX);
        const y = groupOffset.toFixed(2);
        const scale = scaleForOffset(groupOffset).toFixed(4);
        target.style.transform = `translate3d(0, ${y}px, 0) scale(${scale})`;
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
