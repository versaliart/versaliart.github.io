/*! snap-scroll.js v1.0 — scopes to sections with [data-snap-scroll] markers */
(function () {
  // ---------- small utilities ----------
  function ready(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    } else { fn(); }
  }
  function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

  // Find the Squarespace section ancestor for an element
  function getSection(el) {
    return el.closest("section.page-section, section");
  }

  // Previous/next sibling that is a SECTION tag
  function prevSectionOf(section){
    var p = section.previousElementSibling;
    while (p && p.tagName !== "SECTION") p = p.previousElementSibling;
    return p || null;
  }
  function nextSectionOf(section){
    var n = section.nextElementSibling;
    while (n && n.tagName !== "SECTION") n = n.nextElementSibling;
    return n || null;
  }

  // Smooth scroll respecting sticky header offset
  function scrollToSectionTop(target, offsetTop) {
    var rect = target.getBoundingClientRect();
    var y = rect.top + window.pageYOffset - (offsetTop || 0);
    window.scrollTo({ top: y, behavior: "smooth" });
  }

  ready(function () {
    // Collect all activators placed in content
    var markers = Array.prototype.slice.call(document.querySelectorAll("[data-snap-scroll]"));
    if (!markers.length) return;

    // Build controllers (one per marked section)
    var controllers = markers.map(function(marker){
      var section = getSection(marker);
      if (!section) return null;

      var opts = {
        direction: (marker.dataset.direction || "both").toLowerCase(), // "down"|"up"|"both"
        offsetTop: parseInt(marker.dataset.offsetTop || "0", 10) || 0,
        duration:  clamp(parseInt(marker.dataset.duration || "900", 10) || 900, 200, 4000),
        epsilon:   clamp(parseInt(marker.dataset.epsilon  || "1", 10) || 1, 0, 20),
        debug:     String(marker.dataset.debug || "false") === "true"
      };

      return {
        section: section,
        prev: prevSectionOf(section),
        next: nextSectionOf(section),
        opts: opts,
        lock: false,          // local lock for this controller
        lockTimer: null
      };
    }).filter(Boolean);

    if (!controllers.length) return;

    // Global scroll state
    var lastY = window.scrollY || 0;
    var ticking = false;
    var globalLock = false; // prevent multiple snaps at once

    function log(ctrl) {
      if (ctrl && ctrl.opts.debug) {
        var args = Array.prototype.slice.call(arguments, 1);
        console.log.apply(console, ["[snap-scroll]"].concat(args));
      }
    }

    function snap(ctrl, target, reason) {
      if (!target) return;
      if (globalLock || ctrl.lock) return;

      ctrl.lock = true;
      globalLock = true;
      scrollToSectionTop(target, ctrl.opts.offsetTop);
      log(ctrl, "snap ->", reason, "to", target);

      clearTimeout(ctrl.lockTimer);
      ctrl.lockTimer = setTimeout(function(){
        ctrl.lock = false;
        globalLock = false;
      }, ctrl.opts.duration);
    }

    function onScrollTick() {
      ticking = false;

      var y = window.scrollY || 0;
      var dir = y > lastY ? 1 : (y < lastY ? -1 : 0); // 1=down, -1=up
      lastY = y;
      if (dir === 0) return;

      var vh = window.innerHeight;

      controllers.forEach(function(ctrl){
        if (!ctrl || ctrl.lock || globalLock) return;

        var rect = ctrl.section.getBoundingClientRect();
        var EPS = ctrl.opts.epsilon;

        // DOWNWARD: trigger when the section’s bottom begins to move above the viewport bottom
        if ((ctrl.opts.direction === "down" || ctrl.opts.direction === "both") &&
            dir === 1 && ctrl.next && rect.bottom <= (vh - EPS)) {
          snap(ctrl, ctrl.next, "down/bottom-cross");
          return;
        }

        // UPWARD: trigger when the section’s top begins to move below the viewport top
        if ((ctrl.opts.direction === "up" || ctrl.opts.direction === "both") &&
            dir === -1 && ctrl.prev && rect.top >= (0 + EPS)) {
          snap(ctrl, ctrl.prev, "up/top-cross");
          return;
        }
      });
    }

    function onScroll() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(onScrollTick);
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", function(){ lastY = window.scrollY || 0; }, { passive: true });
    document.addEventListener("visibilitychange", function(){ lastY = window.scrollY || 0; });
  });
})();
