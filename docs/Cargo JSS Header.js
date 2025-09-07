/*  v2.4 */

/* Mystic Munson — Header behavior (parked at top; Home reveals at Section 2) */
(function(){
  function normalizePath(p){ return (p || '/').replace(/\/+$/, '/') || '/'; }
  function isHome(){ return normalizePath(location.pathname) === '/'; }
  // Measure the vertical gap and mirror it to the horizontal edge pad
  function syncEdgePad(){
    const leftLink = hdr.querySelector('.header-nav-item:first-child > a');
    if (!leftLink) return;

    const hr = hdr.getBoundingClientRect();
    const ar = leftLink.getBoundingClientRect();

    // vertical "air" between pill and bar
    const vGap = Math.max(0, Math.round((hr.height - ar.height) / 2));

    // optional tiny optical nudge via CSS var --mm-edge-fudge (defaults to 0)
    const fudgeStr = getComputedStyle(document.documentElement)
                      .getPropertyValue('--mm-edge-fudge').trim();
    const fudge = parseFloat(fudgeStr) || 0;

    // make L/R inset match the vertical air (+ optional fudge)
    document.documentElement.style.setProperty('--mm-edge-pad', (vGap + fudge) + 'px');
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

  function selectSections(){
    var root = document.getElementById('page') || document.body;
    var sel = ['#page .page-section','#page section[data-section-id]',
               '.page-section','section[data-section-id]'].join(',');
    return Array.from(root.querySelectorAll(sel));
  }

  function pxVar(name, fallback){
    var v = getComputedStyle(document.documentElement).getPropertyValue(name);
    var n = parseFloat(v);
    return Number.isFinite(n) ? n : fallback;
  }

  function setup(){
    onceHeader(function(hdr){
      var STICKY = pxVar('--mm-sticky-top', 12);
      // Ensure header is parked (no animation)
      Object.assign(hdr.style, {
        position: 'fixed',
        left: '50%',
        top: STICKY + 'px',
        transform: 'translate(-50%, 0)'
      });

      // helper: make hidden truly inert
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

      // control page top padding (no padding on home; padding elsewhere)
      var page = document.getElementById('page');
      function applyPagePadding(){
        if (!page) return;
        if (isHome()){
          page.style.paddingTop = '0px';
        } else {
          var h = parseFloat(getComputedStyle(hdr).height) || 52; // in px
          page.style.paddingTop = (h + STICKY) + 'px';
        }
      }

      // compute when to reveal on home (top of second section at viewport top)
      var revealAt = 0;
      function computeThreshold(){
        if (!isHome()){ revealAt = 0; return; }
        var sections = selectSections();
        if (sections.length < 2){ revealAt = 0; return; }
        var r2 = sections[1].getBoundingClientRect();
        revealAt = window.scrollY + r2.top - STICKY;
        if (revealAt < 0) revealAt = 0;
      }

      function update(){
        if (isHome()){
          if (window.scrollY >= revealAt) showHeader();
          else hideHeader();
        } else {
          showHeader();
        }
      }

      // init
      applyPagePadding();
      computeThreshold();
      update();

      // listeners
      window.addEventListener('scroll', update, {passive:true});
      window.addEventListener('resize', function(){ applyPagePadding(); computeThreshold(); update(); });

      // re-measure once for late DOM shifts (lazy sections/announcement bar)
      var t=null, mo=new MutationObserver(function(){
        clearTimeout(t);
        t = setTimeout(function(){ applyPagePadding(); computeThreshold(); update(); }, 100);
      });
      mo.observe(document.body, {childList:true, subtree:true});
      setTimeout(function(){ mo.disconnect(); }, 4000);
    });
  }

  if (document.readyState !== 'loading') setup();
  else document.addEventListener('DOMContentLoaded', setup, {once:true});
})();
