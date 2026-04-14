/* Squarespace Opposing Card Float — v1.2 */

(() => {
  const CARD_1_SELECTORS = [
    '#block-yui_3_17_2_1_1756837579989_9426', /* Card img */
  ];

  const CARD_2_SELECTORS = [
    '#block-1e14a0c2b150cb046369', /* Card img */
  ];

  const AMPLITUDE_PX = 15; // max upward movement
  const CYCLE_MS = 4600;  // full cycle: 0 -> up -> 0

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const getElements = (selectors) => selectors
    .map((selector) => document.querySelector(selector))
    .filter(Boolean);

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

  const startAnimation = (groups) => {
    const startTime = performance.now();

    const tick = (now) => {
      const elapsed = now - startTime;
      const phase = (elapsed / CYCLE_MS) * Math.PI * 2;
      const offset = ((Math.sin(phase) + 1) / 2) * AMPLITUDE_PX;

      const scaleForOffset = (value) => {
        const progress = Math.max(0, Math.min(1, (-value) / AMPLITUDE_PX));
        return 1 + (progress * 0.05);
      };

      groups.forEach(({ target, fallbackElements, phaseShift }) => {
        const groupOffset = -(((Math.sin(phase + phaseShift) + 1) / 2) * AMPLITUDE_PX);
        const y = groupOffset.toFixed(2);
        const scale = scaleForOffset(groupOffset).toFixed(4);
        const animatedElements = target ? [target] : fallbackElements;
        animatedElements.forEach((element) => {
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
