/* Squarespace Opposing Card Float — v1.4 */

(() => {
  const CARD_1_WRAPPER_SELECTOR = '.sqs-layout-item:has(#block-yui_3_17_2_1_1756837579989_9426):has(#block-yui_3_17_2_1_1762293512044_1730):has(#block-yui_3_17_2_1_1757554504439_2552)';
  const CARD_2_WRAPPER_SELECTOR = '.sqs-layout-item:has(#block-057950c6d7e2d5e4fe2a):has(#block-1e14a0c2b150cb046369):has(#block-3fd5474bac7cfdc5bd19)';

  const CARD_1_BLOCK_SELECTORS = [
    '#block-yui_3_17_2_1_1756837579989_9426',
    '#block-yui_3_17_2_1_1762293512044_1730',
    '#block-yui_3_17_2_1_1757554504439_2552'
  ];

  const CARD_2_BLOCK_SELECTORS = [
    '#block-057950c6d7e2d5e4fe2a',
    '#block-1e14a0c2b150cb046369',
    '#block-3fd5474bac7cfdc5bd19'
  ];

  const AMPLITUDE_PX = 15; // max upward movement
  const CYCLE_MS = 4600;  // full cycle: 0 -> up -> 0

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const getCommonAncestor = (elements) => {
    if (elements.length === 0) return null;

    const chains = elements.map((element) => {
      const chain = [];
      let current = element;
      while (current) {
        chain.push(current);
        current = current.parentElement;
      }
      return chain;
    });

    return chains[0].find((candidate) => chains.every((chain) => chain.includes(candidate))) || null;
  };

  const resolveCardWrapper = (wrapperSelector, blockSelectors) => {
    const directWrapper = document.querySelector(wrapperSelector);
    if (directWrapper) return directWrapper;

    const elements = blockSelectors
      .map((selector) => document.querySelector(selector))
      .filter(Boolean);

    if (elements.length < 2) return null;

    const commonAncestor = getCommonAncestor(elements);
    if (!commonAncestor) return null;

    const viableWrapper = commonAncestor.closest('.sqs-layout-item, .sqs-col, .sqs-row, .sqs-block') || commonAncestor;
    if (!viableWrapper || viableWrapper === document.documentElement || viableWrapper === document.body) {
      return null;
    }

    return viableWrapper;
  };

  const collectGroups = () => {
    const groups = [
      { target: resolveCardWrapper(CARD_1_WRAPPER_SELECTOR, CARD_1_BLOCK_SELECTORS), phaseShift: 0 },
      { target: resolveCardWrapper(CARD_2_WRAPPER_SELECTOR, CARD_2_BLOCK_SELECTORS), phaseShift: Math.PI },
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
