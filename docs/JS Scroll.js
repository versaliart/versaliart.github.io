/*! snap-scroll.js v1.2.0 — single snap line at marked section bottom with arming+intent */
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
        epsilon  : clamp(parseInt(marker.dataset.epsilon   || "1",   10) || 1, 0, 20),
        armPx    : clamp(parseInt(marker.dataset.armPx     || "48",  10) || 48,  8, 400),
        intentPx : clamp(parseInt(marker.dataset.intentPx  || "24",  10) || 24,  4, 400),
        debug    : String(marker.dataset.debug || "false") === "true"
      };
      return {
        section,
        next: nextSectionOf(section),
        opts,
        lock:false,
        lockTimer:null,
        // state for hysteresis
        upArmed:false,
        downArmed:false,
        lastDir:0,
        upTravel:0,
        downTravel:0
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

      // reset intent + arm after a snap
      ctrl.upArmed = ctrl.downArmed = false;
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

      var vh = window.innerHeight;

      ctrls.some(function (ctrl) {
        if (!ctrl || ctrl.lock || globalLock) return false;

        var rect = ctrl.section.getBoundingClientRect();
        var EPS  = ctrl.opts.epsilon;
        var off  = ctrl.opts.offsetTop;
        var arm  = ctrl.opts.armPx;
        var intent = ctrl.opts.intentPx;

        // track direction travel to filter micro jitters
        if (dir !== ctrl.lastDir) {
          ctrl.upTravel = ctrl.downTravel = 0;
          ctrl.lastDir = dir;
        }
        if (dir === 1) ctrl.downTravel += dy;
        else if (dir === -1) ctrl.upTravel += dy;

        // ---- Update arming windows relative to the single snap line (section bottom) ----
        // Down is armed only if we've moved the snap line well ABOVE the viewport bottom
        if (rect.bottom >= vh + arm) ctrl.downArmed = true;
        // Up is armed only if we've moved the snap line well BELOW the top content edge
        if (rect.bottom <= off - arm) ctrl.upArmed = true;

        // Optional disarm when far from the line (prevents stale arms):
        if (rect.bottom > vh + arm*1.5) ctrl.upArmed = false;         // far above bottom → not near up line
        if (rect.bottom < off - arm*1.5) ctrl.downArmed = false;      // far below top  → not near down line

        // ---- DOWN: cross snap line at viewport bottom, with arming + intent ----
        if ((ctrl.opts.direction === "down" || ctrl.opts.direction === "both") &&
            dir === 1 && ctrl.next &&
            ctrl.downArmed && ctrl.downTravel >= intent &&
            rect.bottom <= (vh - EPS)) {
          snap(ctrl, ctrl.next, "down/line-cross-bottom");
          return true;
        }

        // ---- UP: cross the SAME snap line at the top (header-aware), with arming + intent ----
        if ((ctrl.opts.direction === "up" || ctrl.opts.direction === "both") &&
            dir === -1 &&
            ctrl.upArmed && ctrl.upTravel >= intent &&
            rect.bottom >= (off + EPS)) {
          // Up snaps back to THIS marked section
          snap(ctrl, ctrl.section, "up/line-cross-top");
          return true;
        }

        return false;
      });
    }

    function onScroll(){ if (!ticking) { ticking = true; requestAnimationFrame(onScrollTick); } }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", function(){ lastY = window.scrollY || 0; }, { passive: true });
    document.addEventListener("visibilitychange", function(){ lastY = window.scrollY || 0; });
  });
})();
