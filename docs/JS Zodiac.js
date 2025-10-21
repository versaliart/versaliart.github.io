/* Zodiac Picker v1.0 — unique random images per group */

(function () {
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

  function pickUniqueNumber(bucket, count) {
    // Try to find an unused number from the shuffled pool
    for (let i = 0; i < bucket.pool.length; i++) {
      const n = bucket.pool[i];
      if (!bucket.used.has(n)) return n;
    }
    // If everything was used (more slots than count), reset and reshuffle
    bucket.used.clear();
    bucket.pool = shuffle(bucket.pool);
    return bucket.pool[0];
  }

  function assign(el) {
    if (el.dataset.zodiacInit === "1") return;

    const group = el.dataset.group || "default";                 // all blocks in this group are unique
    const count = Number(el.dataset.count || 12);                // total variants (default 12)
    const prefix = el.dataset.prefix || "/s/zodiac";             // URL prefix before the number
    const ext = el.dataset.ext || ".jpg";                        // file extension
    const alt = el.dataset.alt || "Zodiac image";                // alt text (base)

    const bucket = getBucket(group, count);
    const n = pickUniqueNumber(bucket, count);
    bucket.used.add(n);

    const img = new Image();
    img.className = "zodiac-img";
    img.loading = "lazy";
    img.decoding = "async";
    img.alt = `${alt} ${n}`;
    img.src = `${prefix}${n}${ext}`;

    el.replaceChildren(img);
    el.dataset.zodiacInit = "1";
  }

  function boot(root = document) {
    root.querySelectorAll(".zodiac-slot").forEach(assign);
  }

  // Initial run
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  // Watch for AJAX / Fluid Engine changes
  const mo = new MutationObserver((muts) => {
    for (const m of muts) {
      for (const node of m.addedNodes || []) {
        if (node.nodeType !== 1) continue;
        if (node.matches && node.matches(".zodiac-slot")) assign(node);
        if (node.querySelectorAll) node.querySelectorAll(".zodiac-slot").forEach(assign);
      }
    }
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });
})();