/* Squarespace Opposing Card Float — v1.2 */

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
  const CYCLE_MS = 4600;  // full cycle: 0 -> up -> 0
  const WRAPPER_CLASS = 'hovercard-float-wrap';

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const getElements = (selectors) => selectors
    .map((selector) => document.querySelector(selector))
    .filter(Boolean);

  const sortByDomOrder = (elements) => [...elements].sort((a, b) => {
    if (a === b) return 0;
    const relation = a.compareDocumentPosition(b);
    return relation & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
  });

  const canWrapTogether = (elements) => {
    if (elements.length < 2) return true;
    const parent = elements[0].parentNode;
    return elements.every((element) => element.parentNode === parent);
  };

  const ensureGroupWrapper = (elements) => {
    if (elements.length === 0 || !canWrapTogether(elements)) return null;

    const ordered = sortByDomOrder(elements);
    const first = ordered[0];
    const existingWrapper = first.parentElement?.classList?.contains(WRAPPER_CLASS)
      ? first.parentElement
      : null;

    if (existingWrapper) {
      existingWrapper.style.willChange = 'transform';
      return existingWrapper;
    }

    const wrapper = document.createElement('div');
    wrapper.className = WRAPPER_CLASS;
    wrapper.style.willChange = 'transform';

    first.parentNode.insertBefore(wrapper, first);
    ordered.forEach((element) => wrapper.appendChild(element));
    return wrapper;
  };

  const collectGroups = () => {
    const groupConfigs = [
      { selectors: CARD_1_SELECTORS, phaseShift: 0 },
      { selectors: CARD_2_SELECTORS, phaseShift: Math.PI },
    ];

    return groupConfigs.map(({ selectors, phaseShift }) => {
      const elements = getElements(selectors);
      if (elements.length === 0) return null;

      const wrapper = ensureGroupWrapper(elements);
      const largeElements = getElements(selectors.slice(0, 2));

      if (!wrapper) {
        elements.forEach((element) => { element.style.willChange = 'transform'; });
      }

      return {
        elements,
        largeElements,
        wrapper,
        phaseShift,
      };
    }).filter(Boolean);
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

      groups.forEach(({ elements, largeElements, wrapper, phaseShift }) => {
        const groupOffset = -(((Math.sin(phase + phaseShift) + 1) / 2) * AMPLITUDE_PX);
        const y = groupOffset.toFixed(2);
        const scale = scaleForOffset(groupOffset).toFixed(4);

        if (wrapper) {
          wrapper.style.transform = `translate3d(0, ${y}px, 0) scale(${scale})`;
          return;
        }

        const largeSet = new Set(largeElements);
        elements.forEach((element) => {
          element.style.transform = `translate3d(0, ${y}px, 0)`;
        });
        largeSet.forEach((element) => {
          element.style.transform = `translate3d(0, ${y}px, 0) scale(${scale})`;
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
