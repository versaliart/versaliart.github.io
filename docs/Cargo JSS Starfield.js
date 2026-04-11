// Starfield v5.0 — CSS-first 3D flythrough with image-masked stars
(function () {
  const TARGETS = [
    '#block-yui_3_17_2_1_1756944426569_9957'
  ];

  if (!TARGETS.length) return;

  const body = document.body;

  function onReady(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn, { once: true });
  }

  function whenSelector(sel, cb) {
    const found = document.querySelector(sel);
    if (found) return cb(found);

    const mo = new MutationObserver(() => {
      const node = document.querySelector(sel);
      if (!node) return;
      mo.disconnect();
      cb(node);
    });

    mo.observe(document.documentElement, { childList: true, subtree: true });
  }

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function ensureLayer(host) {
    let layer = host.querySelector(':scope > .shape-edge-sparkles');
    if (!layer) {
      layer = document.createElement('div');
      layer.className = 'shape-edge-sparkles';
      host.appendChild(layer);
    }

    let stars = layer.querySelector(':scope > .stars');
    if (!stars) {
      stars = document.createElement('div');
      stars.className = 'stars';
      layer.appendChild(stars);
    }

    return stars;
  }

  function buildShadows() {
    const styles = getComputedStyle(body);
    const count = Math.max(1, Math.round(parseFloat(styles.getPropertyValue('--star-count')) || 350));
    const width = Math.max(100, Math.round(parseFloat(styles.getPropertyValue('--starfield-width')) || 3000));
    const height = Math.max(100, Math.round(parseFloat(styles.getPropertyValue('--starfield-height')) || 960));

    const halfW = Math.floor(width / 2);
    const halfH = Math.floor(height / 2);
    const shadows = [];

    for (let i = 0; i < count; i++) {
      const x = randomInt(-halfW, halfW);
      const y = randomInt(-halfH, halfH);
      const light = randomInt(75, 100);
      shadows.push(`${x}px ${y}px hsl(90 0% ${light}%)`);
    }

    return shadows.join(', ');
  }

  function mountStarfield(host) {
    if (getComputedStyle(host).position === 'static') {
      host.style.position = 'relative';
    }

    const stars = ensureLayer(host);
    const shadowString = buildShadows();
    stars.style.setProperty('--star-shadows', shadowString);
  }

  function init() {
    body.classList.add('has-starfield');

    TARGETS.forEach((selector) => {
      whenSelector(selector, (host) => {
        mountStarfield(host);

        const rebuild = () => mountStarfield(host);
        window.addEventListener('resize', rebuild, { passive: true });
      });
    });
  }

  onReady(init);
})();
