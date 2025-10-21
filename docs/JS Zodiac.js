/* Zodiac Picker v1.4 — force lowercase ext, trim attrs, no-lazy, loud logs, zero-height guard */
(function () {
  if (window.__zodiac_installed) { window.ZODIAC_reload && window.ZODIAC_reload(); return; }
  window.__zodiac_installed = true;

  // Global debug toggle (auto-on if any slot has data-debug="1")
  window.__ZODIAC_DEBUG__ = false;

  const groups = Object.create(null);

  const toNum = v => Number(String(v || "").trim() || 0);
  const toStr = v => String(v == null ? "" : v).trim();

  function shuffle(a){ for (let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
  function getBucket(group,count){
    if (!groups[group]) groups[group] = { pool: shuffle(Array.from({length:count},(_,i)=>i+1)), used: new Set() };
    return groups[group];
  }
  function pickUniqueNumber(bucket){
    for (let i=0;i<bucket.pool.length;i++){ const n=bucket.pool[i]; if (!bucket.used.has(n)) return n; }
    bucket.used.clear(); shuffle(bucket.pool); return bucket.pool[0];
  }
  function pad(n,w){ const s=String(n); const W=toNum(w); return W>0 ? s.padStart(W,"0") : s; }

  function assign(el){
    if (!el || el.dataset.zodiacInit === "1") return;

    // promote to debug if any slot asks
    if (el.dataset.debug === "1") window.__ZODIAC_DEBUG__ = true;

    const group  = toStr(el.dataset.group)  || "default";
    const count  = toNum(el.dataset.count)  || 12;
    const prefix = toStr(el.dataset.prefix) || "/s/zodiac";
    const extRaw = toStr(el.dataset.ext)    || ".png";
    const padW   = toStr(el.dataset.pad)    || "";

    // force lowercase extension & strip stray spaces
    const ext = extRaw.toLowerCase();

    const bucket = getBucket(group, count);
    const n = pickUniqueNumber(bucket);
    const url = `${prefix}${pad(n, padW)}${ext}`;

    if (window.__ZODIAC_DEBUG__) console.log("[Zodiac] assign →", {group, count, prefix, ext, padW, pick:n, url});

    // build the image
    const img = new Image();
    img.className = "zodiac-img";
    // Disable lazy to avoid deferred onload in some browsers; we want immediate paint
    // img.loading = "lazy";  // removed on purpose
    img.decoding = "async";
    img.alt = `Zodiac image ${n}`;
    img.src = url;

    img.onerror = function(){
      console.warn("[Zodiac] ✗ load error:", url);
      // try other numbers up to `count` attempts
      const tried = toNum(el.dataset.tried) + 1;
      el.dataset.tried = String(tried);
      if (tried < count) { setTimeout(()=>assign(el), 0); } else { el.dataset.zodiacInit = "1"; }
    };

    img.onload = function(){
      bucket.used.add(n);
      el.replaceChildren(img);
      el.dataset.zodiacInit = "1";
      if (window.__ZODIAC_DEBUG__) console.log("[Zodiac] ✓ OK:", url, "group:", group, "used:", Array.from(bucket.used));
    };
  }

  function boot(root=document){
    const slots = Array.from(root.querySelectorAll(".zodiac-slot"));
    if (slots.some(s => s.dataset.debug === "1")) window.__ZODIAC_DEBUG__ = true;
    if (window.__ZODIAC_DEBUG__) {
      console.log("[Zodiac] boot: found", slots.length, "slot(s)");
      console.table(slots.map((el,i)=>({
        i,
        group: toStr(el.dataset.group)||"default",
        prefix: toStr(el.dataset.prefix)||"/s/zodiac",
        ext: (toStr(el.dataset.ext)||".png").toLowerCase(),
        count: toNum(el.dataset.count)||12,
        pad: toStr(el.dataset.pad)||"",
        debug: toStr(el.dataset.debug)||"0"
      })));
    }
    slots.forEach(assign);
  }

  window.ZODIAC_reload = function(root){
    if (!root) root = document;
    root.querySelectorAll(".zodiac-slot").forEach(el => { el.dataset.zodiacInit = ""; el.dataset.tried = ""; });
    boot(root);
  };

  // Observe for Fluid Engine inserts
  const mo = new MutationObserver(muts=>{
    for (const m of muts){
      for (const node of m.addedNodes||[]){
        if (node.nodeType !== 1) continue;
        if (node.matches && node.matches(".zodiac-slot")) assign(node);
        if (node.querySelectorAll) node.querySelectorAll(".zodiac-slot").forEach(assign);
      }
    }
  });
  mo.observe(document.documentElement, { childList:true, subtree:true });

  // Minimal CSS + visual guard to detect zero-height containers
  const style = document.createElement("style");
  style.textContent = `
    .zodiac-slot { display:block; min-height:1rem; }
    .zodiac-img  { display:block; margin-inline:auto; max-width:100%; height:auto; }
  `;
  document.head.appendChild(style);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ()=>boot(document), {once:true});
  } else {
    boot(document);
  }
})();
