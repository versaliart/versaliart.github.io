/*! snap-scroll.js v1.4.4 — single snap line at marked section bottom; absolute crossing + seeded first down + immediate re-arm both ways + optional guard/input-lock */
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

    // Build controllers
    var ctrls = markers.map(function(marker){
      var section = getSection(marker);
      if (!section) return null;
      var opts = {
        direction: (marker.dataset.direction || "both").toLowerCase(),  // "down" | "up" | "both"
        offsetTop: clamp(parseInt(marker.dataset.offsetTop || "0", 10) || 0, 0, 1000),
        duration : clamp(parseInt(marker.dataset.duration  || "900", 10) || 900, 200, 4000),
        epsilon  : clamp(parseInt(marker.dataset.epsilon   || "2",  10) || 2, 0, 20),
        intentPx : clamp(parseInt(marker.dataset.intentPx  || "16", 10) || 16, 4, 200),
        guardMs  : clamp(parseInt(marker.dataset.guardMs   || "240",10) || 240, 0, 1000), // brief re-arm window
        lockInput: String(marker.dataset.lockInput || "false") === "true",
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
        seededDown: false,  // allow first DOWN when snap line already visible
        seededUp:   false,  // allow immediate UP after a DOWN snap
        guardUntil: 0
      };
    }).filter(Boolean);
    if (!ctrls.length) return;

    // Optional: temporarily block wheel/touch/keys while we're snapping (only if requested)
    function anyCtrlLockingInput(){
      for (var i=0;i<ctrls.length;i++){
        if (ctrls[i].lock && ctrls[i].opts.lockInput) return true;
      }
      return false;
    }
    function preventWhileLocked(e){
      if (anyCtrlLockingInput()){
        e.preventDefault();
        e.stopPropagation();
      }
    }
    // Attach once; passive:false is needed to preventDefault on wheel/touch
    document.addEventListener('wheel',      preventWhileLocked, { passive:false });
    document.addEventListener('touchmove',  preventWhileLocked, { passive:false });
    document.addEventListener('keydown', function(e){
      // block typical scroll keys while snapping
      if (!anyCtrlLockingInput()) return;
      var k = e.key;
      if (k === 'ArrowDown' || k === 'ArrowUp' || k === 'PageDown' || k === 'PageUp' || k === 'Home' || k === 'End' || k === ' '){
        e.preventDefault(); e.stopPropagation();
      }
    }, { passive:false });

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

      // Re-arm immediately for the reverse direction:
      // - If we snapped DOWN to next: prime UP and clear top edge so the first tiny up-nudge snaps.
      // - If we snapped UP to marked section: prime DOWN and clear bottom edge likewise.
      if (target === ctrl.next) {
        ctrl.seededUp = true;
        ctrl.lastViewTopAbs = null;
      } else if (target === ctrl.section) {
        ctrl.seededDown = true;
        ctrl.lastViewBottomAbs = null;
      }

      // brief guard window to absorb landing jitter and keep seeds live
      ctrl.guardUntil = performance.now() + ctrl.opts.guardMs;

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
      var now = performance.now();

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

        // During guard window after a snap, keep seeds alive and relax intent
        var inGuard = now < ctrl.guardUntil;

        // ----- DOWN: crossing when viewport bottom passes the line -----
        var downCross =
          (ctrl.seededDown || inGuard || ctrl.downTravel >= intent) &&
          (ctrl.lastViewBottomAbs < (lineAbs - EPS)) &&
          (viewBottomAbs        >= (lineAbs - EPS));

        if ((ctrl.opts.direction === "down" || ctrl.opts.direction === "both") &&
            dir === 1 && ctrl.next && downCross) {
          snap(ctrl, ctrl.next, "down/cross-abs-bottom");
          // keep edges current; consume seeds by snap()
          ctrl.lastViewBottomAbs = viewBottomAbs;
          ctrl.lastViewTopAbs    = viewTopAbs;
          return;
        }

// ----- UP: crossing when content top passes the line (header-aware) -----
var topThresh = lineAbs + EPS;
var upCross = ctrl.seededUp
  ? (viewTopAbs <= topThresh)                   // immediate UP after a DOWN snap
  : ((inGuard || ctrl.upTravel >= intent) &&
     (ctrl.lastViewTopAbs > topThresh) &&
     (viewTopAbs        <= topThresh));

if ((ctrl.opts.direction === "up" || ctrl.opts.direction === "both") &&
    dir === -1 && upCross) {
  snap(ctrl, ctrl.section, "up/cross-abs-top");
  ctrl.seededUp = false;                        // consume the seed
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
      ctrls.forEach(c=>{ c.lastViewBottomAbs = c.lastViewTopAbs = null; c.seededDown = false; c.seededUp = false; c.guardUntil = 0; });
    }, { passive: true });
    document.addEventListener("visibilitychange", function(){
      lastY = window.scrollY || 0;
      ctrls.forEach(c=>{ c.lastViewBottomAbs = c.lastViewTopAbs = null; c.seededDown = false; c.seededUp = false; c.guardUntil = 0; });
    });
  });
})();