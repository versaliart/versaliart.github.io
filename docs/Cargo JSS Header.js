/* Mystic Munson — Header behavior (top-of-section everywhere; home waits for section 2) */
(function(){
  // Config via CSS variable; fallback to 12px
  function getStickyTopPx(){
    var v = getComputedStyle(document.documentElement).getPropertyValue('--mm-sticky-top');
    var n = parseFloat(v);
    return Number.isFinite(n) ? n : 12;
  }

  function selectSections(){
    // Robust across 7.1 / editor
    var page = document.getElementById('page') || document.body;
    var sel = [
      '#page .page-section',
      '#page section[data-section-id]',
      '.page-section',
      'section[data-section-id]'
    ].join(',');
    return Array.from(page.querySelectorAll(sel)).filter(Boolean);
  }

  function normalizePath(p){
    return (p || '/').replace(/\/+$/, '/') || '/';
  }

  function onceHeader(cb){
    var hdr = document.querySelector('header#header[data-test="header"]');
    if (hdr) return cb(hdr);
    var mo = new MutationObserver(function(){
      hdr = document.querySelector('header#header[data-test="header"]');
      if (hdr){ mo.disconnect(); cb(hdr); }
    });
    mo.observe(document.documentElement, {childList:true, subtree:true});
  }

  function setup(){
    onceHeader(function(hdr){
      var isHome = normalizePath(location.pathname) === '/';
      var STICKY = getStickyTopPx();
      var threshold = 0; // document Y where header becomes visible (home only)

      // Ensure base state: fixed, parked at top offset. Visibility via .mm-visible
      hdr.style.position = 'fixed';
      hdr.style.left = '50%';
      hdr.style.top = STICKY + 'px';
      hdr.style.transform = 'translate(-50%, 0)';

      function computeThreshold(){
        if (!isHome){ threshold = 0; return; }
        var sections = selectSections();
        if (sections.length < 2){ threshold = 0; return; }
        var r = sections[1].getBoundingClientRect();
        threshold = window.scrollY + r.top - STICKY;
        if (threshold < 0) threshold = 0;
      }

      function update(){
        if (isHome){
          if (window.scrollY >= threshold) hdr.classList.add('mm-visible');
          else hdr.classList.remove('mm-visible');
        } else {
          hdr.classList.add('mm-visible');
        }
      }

      computeThreshold();
      update();

      window.addEventListener('scroll', update, {passive:true});
      window.addEventListener('resize', function(){ computeThreshold(); update(); });

      // Recompute once if late DOM shifts occur (announcement bar, lazy sections)
      var timer = null;
      var mo = new MutationObserver(function(){
        clearTimeout(timer);
        timer = setTimeout(function(){ computeThreshold(); update(); }, 100);
      });
      mo.observe(document.body, {childList:true, subtree:true});
      setTimeout(function(){ mo.disconnect(); }, 4000);
    });
  }

  if (document.readyState !== 'loading') setup();
  else document.addEventListener('DOMContentLoaded', setup, {once:true});
})();
