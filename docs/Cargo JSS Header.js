/*  v1.0 */

/* Mystic Munson — Header behavior (top-of-section everywhere; home waits for section 2) */
(function(){
  function getStickyTopPx(){
    var v = getComputedStyle(document.documentElement).getPropertyValue('--mm-sticky-top');
    var n = parseFloat(v);
    return Number.isFinite(n) ? n : 12;
  }
  function selectSections(){
    var page = document.getElementById('page') || document.body;
    var sel = ['#page .page-section','#page section[data-section-id]','.page-section','section[data-section-id]'].join(',');
    return Array.from(page.querySelectorAll(sel)).filter(Boolean);
  }
  function normalizePath(p){ return (p || '/').replace(/\/+$/, '/') || '/'; }
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
      var threshold = 0;

      // park at top offset always
      Object.assign(hdr.style, {
        position: 'fixed',
        left: '50%',
        top: STICKY + 'px',
        transform: 'translate(-50%, 0)'
      });

      // helpers to toggle real invisibility / interactivity
      function hideHeader(){
        hdr.classList.remove('mm-visible');
        hdr.setAttribute('aria-hidden','true');
        hdr.setAttribute('inert','');
        hdr.style.pointerEvents = 'none';
        hdr.style.visibility = 'hidden';
      }
      function showHeader(){
        hdr.classList.add('mm-visible');
        hdr.removeAttribute('aria-hidden');
        hdr.removeAttribute('inert');
        hdr.style.pointerEvents = '';
        hdr.style.visibility = 'visible';
      }

      // page padding control (kill padding on home; keep on others)
      var pageEl = document.getElementById('page');
      function applyPagePadding(){
        if (!pageEl) return;
        if (isHome){
          pageEl.style.paddingTop = '0px';
        } else {
          // if you want space under the fixed header on non-home:
          var hVar = getComputedStyle(document.documentElement).getPropertyValue('--mm-header-h');
          var headerH = parseFloat(hVar) || 52; // px-ish fallback
          pageEl.style.paddingTop = (headerH + STICKY) + 'px';
        }
      }

      function computeThreshold(){
        if (!isHome){ threshold = 0; return; }
        var sections = selectSections();
        if (sections.length < 2){ threshold = 0; return; }
        var r2 = sections[1].getBoundingClientRect();
        threshold = window.scrollY + r2.top - STICKY;
        if (threshold < 0) threshold = 0;
      }

      function update(){
        if (isHome){
          if (window.scrollY >= threshold) showHeader();
          else hideHeader();
        } else {
          showHeader();
        }
      }

      // init
      applyPagePadding();
      computeThreshold();
      update();

      window.addEventListener('scroll', update, {passive:true});
      window.addEventListener('resize', function(){ computeThreshold(); applyPagePadding(); update(); });

      // re-measure once for late DOM shifts
      var t=null, mo=new MutationObserver(function(){
        clearTimeout(t);
        t=setTimeout(function(){ computeThreshold(); applyPagePadding(); update(); }, 100);
      });
      mo.observe(document.body, {childList:true, subtree:true});
      setTimeout(function(){ mo.disconnect(); }, 4000);
    });
  }

  if (document.readyState!=='loading') setup();
  else document.addEventListener('DOMContentLoaded', setup, {once:true});
})();
