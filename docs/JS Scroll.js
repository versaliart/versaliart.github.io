/*! snap-scroll.js v1.4.3 — single snap line at marked section bottom; absolute crossing + seeded first down + immediate up after down */
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
        lastViewBottomAbs: null,
        lastViewTopAbs:    null,
        seededDown: false,   // allow first DOWN crossing when snapline is already visible
        seededUp:   false    // NEW: allow immediate UP after a DOWN snap
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

      // reset intent accumulators
      ctrl.upTravel = ctrl.downTravel = 0;

      // After snapping DOWN to the next section, prime UP so the first upward nudge can snap immediately
      ctrl.seededUp = (target === ctrl.next);

      // Consumed after use
      ctrl.seededDown = false;

      clearTimeout(ctrl.lockTimer);
      ctrl.lockTimer = setTimeout(function(){ ctrl.lock = false; globalLock = false; }, ctrl.opts.duration);
    }

    function onScrollTick(){
      ticking = false;

      var y = window.scrollY || 0;
      var dir = y > lastY ? 1 : (y < lastY ? -1 : 0);
      var dy  = Math.abs(y - lastY);
      lastY = y;
      if (dir === 0) return;

      var vh = window.innerHeight;

      ctrls.forEach(function (ctrl) {
        if (!ctrl || ctrl.lock || globalLock) return;

        var rect = ctrl.section.getBoundingClientRect();
        var EPS     = ctrl.opts.epsilon;
        var viewTopAbs = y + ctrl.opts.offsetTop;   // absolute content-top
        var viewBottomAbs = y + vh;                 // absolute viewport bottom
        var lineAbs = (rect.top + y) + rect.height; // absolute snap line (section bottom)
        var intent  = ctrl.opts.intentPx;

        // intent accumulation
        if (dir !== ctrl.lastDir) {
          ctrl.upTravel = ctrl.downTravel = 0;
          ctrl.lastDir = dir;
        }
        if (dir === 1) ctrl.downTravel += dy;
        else if (dir === -1) ctrl.upTravel += dy;

        // seed previous edges (handles short first section)
        if (ctrl.lastViewBottomAbs == null) {
          if (viewBottomAbs >= lineAbs - EPS) {
            ctrl.lastViewBottomAbs = (lineAbs - EPS) - 1;
            ctrl.seededDown = true;    // permit first down crossing without intent
          } else {
            ctrl.lastViewBottomAbs = viewBottomAbs;
          }
        }
        if (ctrl.lastViewTopAbs == null) {
          if (viewTopAbs <= lineAbs + EPS) {
            ctrl.lastViewTopAbs = (lineAbs + EPS) + 1;
          } else {
            ctrl.lastViewTopAbs = viewTopAbs;
          }
        }

        // ----- DOWN: crossing when viewport bottom passes the line -----
        if ((ctrl.opts.direction === "down" || ctrl.opts.direction === "both") &&
            dir === 1 && ctrl.next &&
            (ctrl.seededDown || ctrl.downTravel >= intent) &&
            ctrl.lastViewBottomAbs < (lineAbs - EPS) &&
            viewBottomAbs      >= (lineAbs - EPS)) {
          snap(ctrl, ctrl.next, "down/cross-abs-bottom");
          // keep last edges current
          ctrl.lastViewBottomAbs = viewBottomAbs;
          ctrl.lastViewTopAbs    = viewTopAbs;
          // after DOWN, allow immediate UP
          ctrl.seededUp = true;
          return;
        }

        // ----- UP: crossing when content top passes the line (header-aware) -----
        // If seededUp is true (we just snapped DOWN), ignore the "prev > threshold" check and intent.
        var crossedUp =
          (ctrl.seededUp && (viewTopAbs <= (lineAbs + EPS))) ||
          (!ctrl.seededUp &&
            ctrl.upTravel >= intent &&
            ctrl.lastViewTopAbs > (lineAbs + EPS) &&
            viewTopAbs     <= (lineAbs + EPS));

        if ((ctrl.opts.direction === "up" || ctrl.opts.direction === "both") &&
            dir === -1 && crossedUp) {
          snap(ctrl, ctrl.section, "up/cross-abs-top");
          ctrl.lastViewBottomAbs = viewBottomAbs;
          ctrl.lastViewTopAbs    = viewTopAbs;
          ctrl.seededUp = false; // consume the seed
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
      ctrls.forEach(c=>{ c.lastViewBottomAbs = c.lastViewTopAbs = null; c.seededDown = false; c.seededUp = false; });
    }, { passive: true });
    document.addEventListener("visibilitychange", function(){
      lastY = window.scrollY || 0;
      ctrls.forEach(c=>{ c.lastViewBottomAbs = c.lastViewTopAbs = null; c.seededDown = false; c.seededUp = false; });
    });
  });
})();
