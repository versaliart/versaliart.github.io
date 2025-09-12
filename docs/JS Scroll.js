/*! snap-scroll.js v1.4.0 — single snap line at marked section bottom; absolute crossing detection */
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
        epsilon  : clamp(parseInt(marker.dataset.epsilon   || "2",  10) || 2, 0, 20),
        intentPx : clamp(parseInt(marker.dataset.intentPx  || "16", 10) || 16, 4, 200),
        debug    : String(marker.dataset.debug || "false") === "true"
      };
      return {
        section,
        next: nextSectionOf(section),
        opts,
        lock:false,
        lockTimer:null,
        // state
        lastDir:0,
        upTravel:0,
        downTravel:0,
        lastViewBottomAbs: null,  // previous absolute viewport bottom (y + innerHeight)
        lastViewTopAbs:    null   // previous absolute viewport "content top" (y + offsetTop)
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
      ctrl.upTravel = ctrl.downTravel = 0;
      clearTimeout(ctrl.lockTimer);
      ctrl.lockTimer = setTimeout(function(){ ctrl.lock = false; globalLock = false; }, ctrl.opts.duration);
    }

    function onScrollTick(){
      ticking = false;

      var y = window.scrollY || 0;
      var dir = y > lastY ? 1 : (y < lastY ? -1 : 0); // 1=down, -1=up
      var dy  = Math.abs(y - lastY);
      lastY = y;
      if (dir === 0) return;

      var vh = window.innerHeight;
      var viewBottomAbs = y + vh;                 // absolute Y of viewport bottom
      // header-aware top edge (content start)
      ctrls.forEach(function (ctrl) {
        if (!ctrl || ctrl.lock || globalLock) return;

        var rect = ctrl.section.getBoundingClientRect();
        var lineAbs = (rect.top + y) + rect.height; // absolute Y of snap line (section bottom)
        var EPS     = ctrl.opts.epsilon;
        var viewTopAbs = y + ctrl.opts.offsetTop;   // absolute Y of content top (after sticky header)
        var intent  = ctrl.opts.intentPx;

        // track intent
        if (dir !== ctrl.lastDir) {
          ctrl.upTravel = ctrl.downTravel = 0;
          ctrl.lastDir = dir;
        }
        if (dir === 1) ctrl.downTravel += dy;
        else if (dir === -1) ctrl.upTravel += dy;

        // ---- Seed previous viewport edges on first tick (handles short first sections) ----
        if (ctrl.lastViewBottomAbs == null) {
          // if already at/over the line, seed just "before" so the first down move is a crossing
          ctrl.lastViewBottomAbs = (viewBottomAbs >= lineAbs - EPS) ? (lineAbs - EPS - 1) : viewBottomAbs;
        }
        if (ctrl.lastViewTopAbs == null) {
          // if already above the line, seed just "after" so the first up move is a crossing
          ctrl.lastViewTopAbs = (viewTopAbs <= lineAbs + EPS) ? (lineAbs + EPS + 1) : viewTopAbs;
        }

        // ---------- DOWN: crossing when viewport bottom passes the line ----------
        if ((ctrl.opts.direction === "down" || ctrl.opts.direction === "both") &&
            dir === 1 && ctrl.next &&
            ctrl.downTravel >= intent &&
            ctrl.lastViewBottomAbs < (lineAbs - EPS) &&
            viewBottomAbs      >= (lineAbs - EPS)) {
          snap(ctrl, ctrl.next, "down/cross-abs-bottom");
          ctrl.lastViewBottomAbs = viewBottomAbs;
          ctrl.lastViewTopAbs    = viewTopAbs;
          return;
        }

        // ---------- UP: crossing when content top passes the line (header-aware) ----------
        if ((ctrl.opts.direction === "up" || ctrl.opts.direction === "both") &&
            dir === -1 &&
            ctrl.upTravel >= intent &&
            ctrl.lastViewTopAbs > (lineAbs + EPS) &&
            viewTopAbs     <= (lineAbs + EPS)) {
          snap(ctrl, ctrl.section, "up/cross-abs-top");
          ctrl.lastViewBottomAbs = viewBottomAbs;
          ctrl.lastViewTopAbs    = viewTopAbs;
          return;
        }

        // store for next tick
        ctrl.lastViewBottomAbs = viewBottomAbs;
        ctrl.lastViewTopAbs    = viewTopAbs;
      });
    }

    function onScroll(){ if (!ticking) { ticking = true; requestAnimationFrame(onScrollTick); } }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", function(){
      lastY = window.scrollY || 0;
      ctrls.forEach(c=>{ c.lastViewBottomAbs = c.lastViewTopAbs = null; });
    }, { passive: true });
    document.addEventListener("visibilitychange", function(){
      lastY = window.scrollY || 0;
      ctrls.forEach(c=>{ c.lastViewBottomAbs = c.lastViewTopAbs = null; });
    });
  });
})();
