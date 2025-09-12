/*! snap-scroll.js v1.0.4 — only snaps UP when you're near the TOP of the next section */
(function () {
  function ready(fn){ if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn, {once:true}); else fn(); }
  function clamp(n,a,b){ return Math.max(a, Math.min(b,n)); }
  function getSection(el){ return el.closest("section.page-section, section"); }
  function prevSectionOf(section){
    var n = section.previousElementSibling;
    while (n && !n.matches("section.page-section, section")) n = n.previousElementSibling;
    return n || null;
  }
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
        offsetTop: parseInt(marker.dataset.offsetTop || "0", 10) || 0,
        duration:  clamp(parseInt(marker.dataset.duration  || "900", 10) || 900, 200, 4000),
        epsilon:   clamp(parseInt(marker.dataset.epsilon   || "1",   10) || 1, 0, 20),
        upWindow:  clamp(parseInt(marker.dataset.upWindow  || "64",  10) || 64, 8, 200),
        debug:     String(marker.dataset.debug || "false") === "true"
      };
      return { section, prev: prevSectionOf(section), next: nextSectionOf(section), opts, lock:false, lockTimer:null };
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
      clearTimeout(ctrl.lockTimer);
      ctrl.lockTimer = setTimeout(function(){ ctrl.lock = false; globalLock = false; }, ctrl.opts.duration);
    }

    function onScrollTick(){
      ticking = false;
      var y = window.scrollY || 0;
      var dir = y > lastY ? 1 : (y < lastY ? -1 : 0); // 1=down, -1=up
      lastY = y; if (dir === 0) return;

      var vh = window.innerHeight;

      ctrls.some(function(ctrl){
        if (!ctrl || ctrl.lock || globalLock) return false;

        var rect = ctrl.section.getBoundingClientRect();
        var EPS  = ctrl.opts.epsilon;

        // DOWN: as soon as the marked section's bottom crosses viewport bottom
        if ((ctrl.opts.direction === "down" || ctrl.opts.direction === "both") &&
            dir === 1 && ctrl.next && rect.bottom <= (vh - EPS)) {
          snap(ctrl, ctrl.next, "down/bottom-cross");
          return true;
        }

        // UP (fixed): only when user scrolls UP from the TOP of the *next* section
        // Define a tight "snap zone" near the next section's top.
        if ((ctrl.opts.direction === "up" || ctrl.opts.direction === "both") &&
            dir === -1 && ctrl.prev && ctrl.next) {

          var nextTop = ctrl.next.getBoundingClientRect().top;
          var topDist = nextTop - ctrl.opts.offsetTop; // distance from desired pinned top

          // Only arm when near the top of the next section (not anywhere within it).
          if (topDist >= -EPS && topDist <= ctrl.opts.upWindow) {
            snap(ctrl, ctrl.prev, "up/from-next-top-zone");
            return true;
          }
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
