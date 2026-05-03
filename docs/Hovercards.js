/* Squarespace Opposing Card Float — v1.2 */

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

  const GLOW_STYLE_ID = 'hovercard-glow-styles';

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const getElements = (selectors) => selectors
    .map((selector) => document.querySelector(selector))
    .filter(Boolean);

  const ensureGlowStyles = () => {
    if (document.getElementById(GLOW_STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = GLOW_STYLE_ID;
    style.textContent = `
      .hovercard-visual-block {
        position: relative;
        isolation: isolate;
        overflow: visible !important;
        --mm-glow-line-color: rgba(153, 137, 236, 0.95);
        --mm-glow-blur-color: rgba(153, 137, 236, 0.75);
        --mm-glow-line-thickness: 2px;
        --mm-glow-blur-size: 10px;
        --mm-glow-line-length: 18;
        --mm-glow-speed: 1200ms;
        --mm-glow-radius: 18;
      }

      .hovercard-visual-block .mm-glow-container {
        position: absolute;
        inset: -8px;
        width: calc(100% + 16px);
        height: calc(100% + 16px);
        pointer-events: none;
        opacity: 0;
        z-index: 2;
      }

      .hovercard-visual-block .mm-glow-line,
      .hovercard-visual-block .mm-glow-blur {
        fill: transparent;
        stroke-dasharray: var(--mm-glow-line-length) calc(50 - var(--mm-glow-line-length));
        stroke-dashoffset: 0;
      }

      .hovercard-visual-block .mm-glow-line {
        stroke: var(--mm-glow-line-color);
        stroke-width: var(--mm-glow-line-thickness);
      }

      .hovercard-visual-block .mm-glow-blur {
        stroke: var(--mm-glow-blur-color);
        stroke-width: var(--mm-glow-blur-size);
        filter: blur(var(--mm-glow-blur-size));
      }

      .hovercard-visual-block:hover .mm-glow-line,
      .hovercard-visual-block:focus-within .mm-glow-line,
      .hovercard-visual-block:hover .mm-glow-blur,
      .hovercard-visual-block:focus-within .mm-glow-blur {
        stroke-dashoffset: -80;
        transition:
          stroke-dashoffset var(--mm-glow-speed) ease-in-out,
          stroke-dasharray var(--mm-glow-speed) ease-in-out;
      }

      .hovercard-visual-block:hover .mm-glow-container,
      .hovercard-visual-block:focus-within .mm-glow-container {
        animation: mm-glow-visibility var(--mm-glow-speed) ease-in-out;
      }

      @keyframes mm-glow-visibility {
        0%,
        100% { opacity: 0; }
        25%,
        75% { opacity: 1; }
      }
    `;

    document.head.appendChild(style);
  };

  const addGlowToVisualBlock = (block) => {
    if (!block || block.querySelector('.mm-glow-container')) return;

    block.classList.add('hovercard-visual-block');

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('mm-glow-container');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('preserveAspectRatio', 'none');

    const blurRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    blurRect.classList.add('mm-glow-blur');

    const lineRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    lineRect.classList.add('mm-glow-line');

    [blurRect, lineRect].forEach((rect) => {
      rect.setAttribute('x', '1');
      rect.setAttribute('y', '1');
      rect.setAttribute('width', '98');
      rect.setAttribute('height', '98');
      rect.setAttribute('pathLength', '100');

      const style = getComputedStyle(block);
      const glowRadius = parseFloat(style.getPropertyValue('--mm-glow-radius'));
      const radius = Number.isFinite(glowRadius)
        ? glowRadius
        : (parseFloat(style.borderRadius) || 18);
      rect.setAttribute('rx', String(radius));
      rect.setAttribute('ry', String(radius));
    });

    svg.appendChild(blurRect);
    svg.appendChild(lineRect);
    block.prepend(svg);
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
    ensureGlowStyles();

    [CARD_1_SELECTORS[0], CARD_2_SELECTORS[0]]
      .map((selector) => document.querySelector(selector))
      .filter(Boolean)
      .forEach((block) => addGlowToVisualBlock(block));

    const initialGroups = collectGroups();
    if (initialGroups.length > 0) {
      startAnimation(initialGroups);
      return;
    }

    const observer = new MutationObserver(() => {
      [CARD_1_SELECTORS[0], CARD_2_SELECTORS[0]]
        .map((selector) => document.querySelector(selector))
        .filter(Boolean)
        .forEach((block) => addGlowToVisualBlock(block));

      const groups = collectGroups();
      if (groups.length === 0) return;
      observer.disconnect();
      startAnimation(groups);
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(() => observer.disconnect(), 10000);
  });
})();
