/* Zodiac Picker v1.3 — unique random images per group, pad + verbose debug + reload hook */
(function () {
  if (window.__zodiac_installed) {
    if (window.__ZODIAC_DEBUG__) console.log("[Zodiac] already installed; calling reload()");
    if (typeof window.ZODIAC_reload === "function") window.ZODIAC_reload();
    return;
  }
  window.__zodiac_installed = true;

  // turn on global debug if any slot requests it
  window.__ZODIAC_DEBUG__ = false;

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
      if (window.__ZODIAC_DEBUG__) console.log("[Zodiac] New bucket:", group, "count=", count, "pool=", groups[group].pool);
    }
    return groups[group];
  }

  function pickUniqueNumber(bucket) {
    for (let i = 0; i < bucket.pool.length; i++) {
      const n = bucket.pool[i];
      if (!bucket.used.has(n)) return n;
    }
    // all used → reshuffle
    bucket.used.clear();
    shuffle(bucket.pool);
    return bucket.pool[0];
  }

  function pad(num, width) {
    const n = String(num);
    const w = Number(width || 0);
    return w > 0 ? n.padStart(w, "0") : n;
  }

  function assign(el) {
    if (!el || el.dataset.zodiacInit === "1") return;

    // promote to global debug if any slot has data-debug="1"
    if (el.dataset.debug === "1") window.__ZODIAC_DEBUG__ = true;

    const group  = el.dataset.group  || "default";
    const count  = Number(el.dataset.count || 12);
    const prefix = el.dataset.prefix || "/s/zodiac";
    const ext    = el.dataset.ext    || ".jpg";
    const alt    = el.dataset.alt    || "Zodiac image";
    const padW   = el.dataset.pad    || "";

    const bucket = getBucket(group, count);
    const n = pickUniqueNumber(bucket);
    const url = `${prefix}${pad(n, padW)}${ext}`;

    if (window.__ZODIAC_DEBUG__) {
      console.log("[Zodiac] assign →", { group, count, prefix, ext, padW, pick: n, url, el });
    }

    const img = new Image();
    img.className = "zodiac-img";
    img.loading = "lazy";
    img.decoding = "async";
    img.alt = `${alt} ${n}`;
    img.src = url;

    img.onerror = function () {
      console.warn("[Zodiac] Image failed to load:", url);
      // don't mark used; try a different number (bounded by count to avoid loops)
      const tried = Number(el.dataset.tried || 0) + 1;
      el.dataset.tried = String(tried);
      if (tried < count) {
        // try again with a new pick
        setTimeout(() => assign(el), 0);
      } else {
        console.warn("[Zodiac] Gave up after", tried, "attempts for", el);
        el.dataset.zodiacInit = "1";
      }
    };

    img.onload = function () {
      bucket.used.add(n);
      el.replaceChildren(img);
      el.dataset.zodiacInit = "1";
      if (window.__ZODIAC_DEBUG__) console.log("[Zodiac] OK:", url, "used in group", group, "used=", Array.from(bucket.used));
    };
  }

  function boot(root = document) {
    const slots = Array.from(root.querySelectorAll(".zodiac-slot"));
    // turn on global debug if any slot asks for it
    if (slots.some(s => s.dataset.debug === "1")) window.__ZODIAC_DEBUG__ = true;

    if (window.__ZODIAC_DEBUG__) {
      console.log("[Zodiac] boot: found", slots.length, "slot(s)");
      if (slots.length) {
        console.table(slots.map(el => ({
          group: el.dataset.group || "default",
          prefix: el.dataset.prefix || "/s/zodiac",
          ext: el.dataset.ext || ".jpg",
          count: Number(el.dataset.count || 12),
          pad: el.dataset.pad || "",
          debug: el.dataset.debug || "0"
        })));
      }
    }

    if (!slots.length && window.__ZODIAC_DEBUG__) {
      console.warn("[Zodiac] No .zodiac-slot elements found at boot.");
    }

    slots.forEach(assign);
  }

  // Expose a manual reload for debugging
  window.ZODIAC_reload = function (root) {
    if (window.__ZODIAC_DEBUG__) console.log("[Zodiac] reload()");
    if (!root) root = document;
    root.querySelectorAll(".zodiac-slot").forEach(el => {
      el.dataset.zodiacInit = ""; // clear flag
      el.dataset.tried = "";
    });
    boot(root);
  };

  // Initial run or DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => boot(document), { once: true });
  } else {
    boot(document);
  }

  // Observe for Fluid Engine inserts
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

  // Centering CSS
  const style = document.createElement("style");
  style.textContent = `
    .zodiac-slot { display:block; }
    .zodiac-img  { display:block; margin-inline:auto; max-width:100%; height:auto; }
  `;
  document.head.appendChild(style);

  if (window.__ZODIAC_DEBUG__) console.log("[Zodiac] v1.3 installed");
})();
