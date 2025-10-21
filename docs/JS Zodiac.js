/* Zodiac Picker v1.2 — unique random images per group, pad + 404 retry */
(function () {
  if (window.__zodiac_installed) return; // guard against double-load
  window.__zodiac_installed = true;

  const groups = Object.create(null); // { [group]: {pool:number[], used:Set<number>} }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function getBucket(group, count) {
    if (!groups[group]) {
      groups[group] = {
        pool: shuffle(Array.from({ length: count }, (_, i) => i + 1)),
        used: new Set()
      };
    }
    return groups[group];
  }

  function pickUniqueNumber(bucket) {
    for (let i = 0; i < bucket.pool.length; i++) {
      const n = bucket.pool[i];
      if (!bucket.used.has(n)) return n;
    }
    // all used: reshuffle and start over (covers >count blocks)
    bucket.used.clear();
    shuffle(bucket.pool);
    return bucket.pool[0];
  }

  function pad(num, width) {
    const n = String(num);
    const w = Number(width || 0);
    return w > 0 ? n.padStart(w, '0') : n;
  }

  function setImg(el, bucket, tryCount = 0) {
    const count  = Number(el.dataset.count || 12);
    const prefix = el.dataset.prefix || '/s/zodiac';
    const ext    = el.dataset.ext || '.jpg';
    const alt    = el.dataset.alt || 'Zodiac image';
    const padW   = el.dataset.pad || '';

    // choose a unique number
    const n = pickUniqueNumber(bucket);
    const url = `${prefix}${pad(n, padW)}${ext}`;

    const img = new Image();
    img.className = 'zodiac-img';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.alt = `${alt} ${n}`;
    img.src = url;

    img.onerror = function () {
      console.warn('[Zodiac] 404 (or load error):', url);
      // If the image failed, don't mark n as used; try another number.
      // Limit retries to "count" attempts to avoid infinite loops.
      if (tryCount + 1 < count) {
        setImg(el, bucket, tryCount + 1);
      } else {
        // final fallback: show nothing but mark initialized so we don’t loop forever
        el.dataset.zodiacInit = '1';
      }
    };

    img.onload = function () {
      bucket.used.add(n);
      el.replaceChildren(img);
      el.dataset.zodiacInit = '1';
      // helpful debug
      if (el.dataset.debug === '1') {
        console.log('[Zodiac] OK:', url, 'group=', el.dataset.group || 'default');
      }
    };
  }

  function assign(el) {
    if (!el || el.dataset.zodiacInit === '1') return;

    const group = el.dataset.group || 'default';
    const count = Number(el.dataset.count || 12);
    const bucket = getBucket(group, count);

    setImg(el, bucket, 0);
  }

  function boot(root = document) {
    root.querySelectorAll('.zodiac-slot').forEach(assign);
  }

  // Run now or on DOM ready (works fine with your remote loader)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }

  // Watch for Fluid Engine / AJAX inserts
  const mo = new MutationObserver((muts) => {
    for (const m of muts) {
      for (const node of m.addedNodes || []) {
        if (node.nodeType !== 1) continue;
        if (node.matches && node.matches('.zodiac-slot')) assign(node);
        if (node.querySelectorAll) node.querySelectorAll('.zodiac-slot').forEach(assign);
      }
    }
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });

  // Tiny CSS for centering
  const style = document.createElement('style');
  style.textContent = `
    .zodiac-slot { display:block; }
    .zodiac-img  { display:block; margin-inline:auto; max-width:100%; height:auto; }
  `;
  document.head.appendChild(style);
})();
