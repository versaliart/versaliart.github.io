/*! snap-scroll.js v1.5.0 — Scrollify-style input capture (optional) + single snap line engine */
(function () {
  function ready(fn){ if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn, { once:true }); else fn(); }
  function clamp(n,a,b){ return Math.max(a, Math.min(b,n)); }
  function getSection(el){ return el.closest("section.page-section, section"); }
  function nextSectionOf(section){
    var n = section.nextElementSibling;
    while (n && !n.matches("section.page-section, section")) n = n.nextElementSibling;
    return n || null;
  }
  function absTop(el){ var r = el.getBoundingClientRect(); return window.scrollY + r.top; }
  function absBottom(el){ var r = el.getBoundingClientRect(); return window.scrollY + r.bottom; }
  function scrollToSectionTop(target, offsetTop){
    var r = target.getBoundingClientRect();
    var y = r.top + window.pageYOffset - (offsetTop || 0);
    window.scrollTo({ top: y, behavior: "smooth" });
  }

  ready(function(){
    var markers = [].slice.call(document.querySelectorAll("[data-snap-scroll]"));
    if (!markers.length) return;

    var ctrls = markers.map(function(marker){
      var section = getSection(marker);
      if (!section) return null;
      var opts = {
        direction: (marker.dataset.direction || "both").toLowerCase(),  // "down" | "up" | "both"
        offsetTop: clamp(parseInt(marker.dataset.offsetTop || "0", 10) || 0, 0, 2000),
        duration : clamp(parseInt(marker.dataset.duration  || "900", 10) || 900, 120, 5000),
        epsilon  : clamp(parseInt(marker.dataset.epsilon   || "2",  10) || 2, 0, 20),
        intentPx : clamp(parseInt(marker.dataset.intentPx  || "0",  10) || 0, 0, 200),
        // NEW for Scrollify-like behavior
        capture  : (marker.dataset.capture || "off").toLowerCase(),     // "off" | "snap" | "always"
        momentum : clamp(parseInt(marker.dataset.momentumMs || "280", 10) || 280, 0, 1500),
        restEps  : clamp(parseInt(marker.dataset.restEps    || "2",  10) || 2, 0, 12),
        debug    : String(marker.dataset.debug || "false") === "true"
      };
      return {
        section,
        next: nextSectionOf(section),
        opts,
        lock:false,
        lockTimer:null,
        // snapline state
        lastDir:0,
        upTravel:0,
        downTravel:0,
        lastViewBottomAbs: null,
        lastViewTopAbs:    null,
        seededDown: false,   // first DOWN when snapline starts visible
        seededUp:   false,   // immediate UP after a DOWN snap
        // capture state
        cooldownUntil: 0,
        touchStartY: null
      };
    }).filter(Boolean);
    if (!ctrls.length) return;

    function log(ctrl){ if (ctrl && ctrl.opts.debug) console.log.apply(console, ["[snap-scroll]"].concat([].slice.call(arguments,1))); }

    // --- helpers for capture mode ---
    function inPair(ctrl){
      if (!ctrl.next) return false;
      var y = window.scrollY, vh = window.innerHeight;
      var t = absTop(ctrl.section) - ctrl.opts.offsetTop;
      var b = absBottom(ctrl.next);
      var viewTop = y + ctrl.opts.offsetTop;
      var viewBot = y + vh;
      return (viewBot > t) && (viewTop < b);
    }
    function atTopOf(el, offsetTop, restEps){
      var top = el.getBoundingClientRect().top;
      return Math.abs(top - offsetTop) <= restEps;
    }
    function activeCtrl(){
      // choose the pair whose snapline is closest to the viewport edges
      var y = window.scrollY, vh = window.innerHeight, best=null, bestScore=Infinity;
      ctrls.forEach(function(c){
        if (!c.next) return;
        var lineAbs = absBottom(c.section); // snapline
        var dist = Math.min(Math.abs((y+vh)-lineAbs), Math.abs((y+c.opts.offsetTop)-lineAbs));
        if (dist < bestScore){ best=c; bestScore=dist; }
      });
      return best || ctrls[0] || null;
    }

    function snap(ctrl, target, reason){
      if (!target || ctrl.lock) return;
      ctrl.lock = true;
      scrollToSectionTop(target, ctrl.opts.offsetTop);
      log(ctrl, "snap ->", reason, target);

      // reset intent accumulators
      ctrl.upTravel = ctrl.downTravel = 0;

      // prime reverse direction immediately, like Scrollify
      if (target === ctrl.next) {
        ctrl.seededUp = true;
        ctrl.lastViewTopAbs = null;   // make reverse crossing immediate
      } else if (target === ctrl.section) {
        ctrl.seededDown = true;
        ctrl.lastViewBottomAbs = null;
      }

      // brief cooldown to swallow momentum
      ctrl.cooldownUntil = performance.now() + ctrl.opts.momentum;

      clearTimeout(ctrl.lockTimer);
      ctrl.lockTimer = setTimeout(function(){ ctrl.lock = false; }, ctrl.opts.duration);
    }

    // --- Scroll engine (snapline crossings — kept as robust fallback) ---
    var lastY = window.scrollY || 0, ticking = false;
    function onScrollTick(){
      ticking = false;
      var y = window.scrollY || 0;
      var dir = y > lastY ? 1 : (y < lastY ? -1 : 0);
      var dy  = Math.abs(y - lastY);
      lastY = y;
      if (dir === 0) return;

      var vh = window.innerHeight;

      ctrls.forEach(function (ctrl) {
        if (!ctrl.next || ctrl.lock) return;

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
        if (dir === 1) ctrl.downTravel += dy; else if (dir === -1) ctrl.upTravel += dy;

        // seed previous edges (handles short first section)
        if (ctrl.lastViewBottomAbs == null) {
          ctrl.lastViewBottomAbs = (viewBottomAbs >= lineAbs - EPS) ? (lineAbs - EPS - 1) : viewBottomAbs;
          if (viewBottomAbs >= lineAbs - EPS) ctrl.seededDown = true;
        }
        if (ctrl.lastViewTopAbs == null) {
          ctrl.lastViewTopAbs = (viewTopAbs <= lineAbs + EPS) ? (lineAbs + EPS + 1) : viewTopAbs;
        }

        // DOWN crossing (viewport bottom passes snapline)
        if ((ctrl.opts.direction === "down" || ctrl.opts.direction === "both") &&
            dir === 1 &&
            (ctrl.seededDown || ctrl.downTravel >= intent) &&
            ctrl.lastViewBottomAbs < (lineAbs - EPS) &&
            viewBottomAbs      >= (lineAbs - EPS)) {
          snap(ctrl, ctrl.next, "down/cross-abs-bottom");
          ctrl.lastViewBottomAbs = viewBottomAbs;
          ctrl.lastViewTopAbs    = viewTopAbs;
          ctrl.seededDown = false;
          return;
        }

        // UP crossing (content top passes snapline), seededUp bypasses prior-edge check/intent
        var topThresh = lineAbs + EPS;
        var upCross = ctrl.seededUp
          ? (viewTopAbs <= topThresh)
          : ((ctrl.upTravel >= intent) &&
             (ctrl.lastViewTopAbs > topThresh) &&
             (viewTopAbs        <= topThresh));

        if ((ctrl.opts.direction === "up" || ctrl.opts.direction === "both") &&
            dir === -1 && upCross) {
          snap(ctrl, ctrl.section, "up/cross-abs-top");
          ctrl.seededUp = false;
          ctrl.lastViewBottomAbs = viewBottomAbs;
          ctrl.lastViewTopAbs    = viewTopAbs;
          return;
        }

        ctrl.lastViewBottomAbs = viewBottomAbs;
        ctrl.lastViewTopAbs    = viewTopAbs;
      });
    }
    function onScroll(){ if (!ticking) { ticking = true; requestAnimationFrame(onScrollTick); } }
    window.addEventListener("scroll", onScroll, { passive: true });

    // --- Scrollify-style input capture (wheel/touch/keys) ---
    function captureEnabled(ctrl){
      return ctrl && (ctrl.opts.capture === "always" || (ctrl.opts.capture === "snap" && ctrl.lock));
    }
    function currentCtrlForCapture(){
      var c = activeCtrl();
      return (c && inPair(c)) ? c : null;
    }

    // Wheel
    function onWheel(e){
      var ctrl = currentCtrlForCapture();
      if (!ctrl || !captureEnabled(ctrl)) return;

      var now = performance.now();
      if (now < ctrl.cooldownUntil) { e.preventDefault(); return; }

      var dy = e.deltaY || 0;
      if (dy === 0) { e.preventDefault(); return; }

      // Decide direction and target; prevent native scroll
      e.preventDefault();

      var atTopMarked = atTopOf(ctrl.section, ctrl.opts.offsetTop, ctrl.opts.restEps);
      var atTopNext   = atTopOf(ctrl.next,    ctrl.opts.offsetTop, ctrl.opts.restEps);

      if (dy > 0) { // want DOWN
        if (!atTopNext) snap(ctrl, ctrl.next, "capture/wheel-down");
      } else {      // want UP
        if (!atTopMarked) snap(ctrl, ctrl.section, "capture/wheel-up");
      }
    }
    document.addEventListener("wheel", onWheel, { passive:false });

    // Touch (simple vertical swipe)
    function onTouchStart(e){
      var ctrl = currentCtrlForCapture();
      if (!ctrl || !captureEnabled(ctrl)) return;
      ctrl.touchStartY = e.touches ? e.touches[0].clientY : null;
    }
    function onTouchMove(e){
      var ctrl = currentCtrlForCapture();
      if (!ctrl || !captureEnabled(ctrl)) return;
      if (ctrl.touchStartY == null) return;
      var y = e.touches ? e.touches[0].clientY : null;
      if (y == null) return;
      var dy = ctrl.touchStartY - y; // positive = swipe up (go DOWN)
      var threshold = 30; // px
      if (Math.abs(dy) < threshold) return;

      e.preventDefault();
      var atTopMarked = atTopOf(ctrl.section, ctrl.opts.offsetTop, ctrl.opts.restEps);
      var atTopNext   = atTopOf(ctrl.next,    ctrl.opts.offsetTop, ctrl.opts.restEps);

      if (dy > 0) { // swipe up => go DOWN
        if (!atTopNext) snap(ctrl, ctrl.next, "capture/touch-down");
      } else {      // swipe down => go UP
        if (!atTopMarked) snap(ctrl, ctrl.section, "capture/touch-up");
      }
      ctrl.touchStartY = null; // consume
    }
    document.addEventListener("touchstart", onTouchStart, { passive:true });
    document.addEventListener("touchmove",  onTouchMove,  { passive:false });

    // Keys
    function onKey(e){
      var ctrl = currentCtrlForCapture();
      if (!ctrl || !captureEnabled(ctrl)) return;
      var k = e.key;
      if (k === "ArrowDown" || k === "PageDown" || k === " "){
        e.preventDefault();
        var atTopNext = atTopOf(ctrl.next, ctrl.opts.offsetTop, ctrl.opts.restEps);
        if (!atTopNext) snap(ctrl, ctrl.next, "capture/key-down");
      } else if (k === "ArrowUp" || k === "PageUp" || k === "Home"){
        e.preventDefault();
        var atTopMarked = atTopOf(ctrl.section, ctrl.opts.offsetTop, ctrl.opts.restEps);
        if (!atTopMarked) snap(ctrl, ctrl.section, "capture/key-up");
      } else if (k === "End"){
        e.preventDefault();
        var atTopNext2 = atTopOf(ctrl.next, ctrl.opts.offsetTop, ctrl.opts.restEps);
        if (!atTopNext2) snap(ctrl, ctrl.next, "capture/key-end");
      }
    }
    document.addEventListener("keydown", onKey, { passive:false });

    // Resize/visibility resets
    window.addEventListener("resize", function(){
      ctrls.forEach(function(c){
        c.lastViewBottomAbs = c.lastViewTopAbs = null;
        c.seededDown = c.seededUp = false;
        c.cooldownUntil = 0;
      });
    }, { passive:true });
    document.addEventListener("visibilitychange", function(){
      ctrls.forEach(function(c){
        c.lastViewBottomAbs = c.lastViewTopAbs = null;
        c.seededDown = c.seededUp = false;
        c.cooldownUntil = 0;
      });
    });
  });
})();
