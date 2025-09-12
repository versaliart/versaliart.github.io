/*! snap-scroll.js v1.3.0 — single snap line at marked section bottom with true edge-cross detection */
(function () {
  function ready(fn){ if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn, { once:true }); else fn(); }
  function clamp(n,a,b){ return Math.max(a, Math.min(b,n)); }
  function getSection(el){ return el.closest("section.page-section, section"); }
  function nextSectionOf(section){
    var n = section.nextElementSibling;
    while (n && !n.matches("section.page-section, section")) n = n.nextElementSibling;
    return n || null;
  }
  function scrollToSectionTop(target, offsetTop){
    var rect = target.getBoundingClientRect();
    var y = rect.top + window.pageYOffset - (offsetTop || 0);
    window.scrollTo({ top: y, behavior: "smooth" });
  }

  ready(function () {
    var markers = [].slice.call(document.querySelectorAll("[data-snap-scroll]"));
    if (!markers.length) return;

    var ctrls = markers.map(function(marker){
      var section = getSection(marker);
      if (!section) return null;
      var opts = {
        direction: (marker.dataset.direction || "both").toLowerCase(), // "down" | "up" | "both"
        offsetTop: clamp(parseInt(marker.dataset.offsetTop || "0", 10) || 0, 0, 1000),
        duration : clamp(parseInt(marker.dataset.duration  || "900", 10) || 900, 200, 4000),
        epsilon  : clamp(parseInt(marker.dataset.epsilon   || "1",  10) || 1, 0, 20),
        intentPx : clamp(parseInt(marker.dataset.intentPx  || "20", 10) || 20, 4, 200),
        debug    : String(marker.dataset.debug || "false") === "true"
      };
      return {
        section,
        next: nextSectionOf(section),
        opts,
        lock:false,
        lockTimer:null,
        // state for crossing + intent
        lastDir:0,
        upTravel:0,
        downTravel:0,
        lastLineY: null // previous position of the snap line (section bottom) in viewport coords
      };
    }).filter(Boolean);
    if (!ctrls.length) return;

    var lastY = window.scrollY || 0;
    var ticking = false;
    var globalLock = false;

    function log(ctrl){ if (ctrl && ctrl.opts.debug) console.log.apply(console, ["[snap-scroll]"].concat([].slice.call(arguments,1))); }

    function snap(ctrl, target, reason){
      if (!target || globalLock || ctrl.lock) return;
      ctrl.lock = true; globalLock = true;
      scrollToSectionTop(target, ctrl.opts.offsetTop);
      log(ctrl, "snap ->", reason, target);

      // reset intent counters after a snap
      ctrl.upTravel = ctrl.downTravel = 0;

      clearTimeout(ctrl.lockTimer);
      ctrl.lockTimer = setTimeout(function(){ ctrl.lock = false; globalLock = false; }, ctrl.opts.duration);
    }

    function onScrollTick(){
      ticking = false;

      var y = window.scrollY || 0;
      var dir = y > lastY ? 1 : (y < lastY ? -1 : 0); // 1=down, -1=up, 0=still
      var dy  = Math.abs(y - lastY);
      lastY = y;
      if (dir === 0) return;

      var vh = window.innerHeight;

      ctrls.some(function (ctrl) {
        if (!ctrl || ctrl.lock || globalLock) return false;

        var rect = ctrl.section.getBoundingClientRect();
        var lineY = rect.bottom;              // <-- the single snap line (bottom of marked section)
        var prev  = (ctrl.lastLineY == null) ? lineY : ctrl.lastLineY;
        var EPS   = ctrl.opts.epsilon;
        var off   = ctrl.opts.offsetTop;
        var intent= ctrl.opts.intentPx;

        // track per-direction travel to enforce intent
        if (dir !== ctrl.lastDir) {
          ctrl.upTravel = ctrl.downTravel = 0;
          ctrl.lastDir = dir;
        }
        if (dir === 1) ctrl.downTravel += dy;
        else if (dir === -1) ctrl.upTravel += dy;

        // --- DOWNWARD crossing: (prev > bottomThreshold) && (lineY <= bottomThreshold)
        var bottomThreshold = vh - EPS;
        if ((ctrl.opts.direction === "down" || ctrl.opts.direction === "both") &&
            dir === 1 && ctrl.next &&
            ctrl.downTravel >= intent &&
            prev > bottomThreshold && lineY <= bottomThreshold) {
          snap(ctrl, ctrl.next, "down/cross-bottom-line");
          ctrl.lastLineY = lineY;  // update after snap to current reading
          return true;
        }

        // --- UPWARD crossing: (prev < topThreshold) && (lineY >= topThreshold)
        // topThreshold is the visible content top (header-aware)
        var topThreshold = off + EPS;
        if ((ctrl.opts.direction === "up" || ctrl.opts.direction === "both") &&
            dir === -1 &&
            ctrl.upTravel >= intent &&
            prev < topThreshold && lineY >= topThreshold) {
          // Up snaps back to THIS marked section’s top
          snap(ctrl, ctrl.section, "up/cross-top-line");
          ctrl.lastLineY = lineY;
          return true;
        }

        // store for next tick
        ctrl.lastLineY = lineY;
        return false;
      });
    }

    function onScroll(){ if (!ticking) { ticking = true; requestAnimationFrame(onScrollTick); } }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", function(){ lastY = window.scrollY || 0; ctrls.forEach(c=>{ c.lastLineY = null; }); }, { passive: true });
    document.addEventListener("visibilitychange", function(){ lastY = window.scrollY || 0; ctrls.forEach(c=>{ c.lastLineY = null; }); });
  });
})();
