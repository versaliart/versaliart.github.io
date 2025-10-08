/* Mystic Munson — Header v2.6 */
(function(){
  function normalizePath(p){ return (p || '/').replace(/\/+$/, '/') || '/'; }
  function isHome(){ return normalizePath(location.pathname) === '/'; }

  function onceHeader(cb){
    let hdr = document.querySelector('header#header[data-test="header"]');
    if (hdr) return cb(hdr);
    const mo = new MutationObserver(() => {
      hdr = document.querySelector('header#header[data-test="header"]');
      if (hdr){ mo.disconnect(); cb(hdr); }
    });
    mo.observe(document.documentElement, {childList:true, subtree:true});
  }

  function selectSections(){
    const root = document.getElementById('page') || document.body;
    const sel = ['#page .page-section','#page section[data-section-id]','.page-section','section[data-section-id]'].join(',');
    return Array.from(root.querySelectorAll(sel));
  }

  function pxVar(name, fallback){
    const v = getComputedStyle(document.documentElement).getPropertyValue(name);
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : fallback;
  }

  function setup(){
    onceHeader(function(hdr){
      const STICKY = pxVar('--mm-sticky-top', 12);

      // Park the header (no animation)
      Object.assign(hdr.style, {
        position: 'fixed',
        left: '50%',
        top: STICKY + 'px',
        // Let CSS control the Y drop; we only center on X here:
        transform: 'translateX(-50%)'
      });


      // Visibility helpers (make hidden truly inert)
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

      // Page top padding (none on home, space elsewhere)
      const page = document.getElementById('page');
      function applyPagePadding(){
        if (!page) return;
        if (isHome()){
          page.style.paddingTop = '0px';
        } else {
          const h = parseFloat(getComputedStyle(hdr).height) || 52;
          page.style.paddingTop = (h + STICKY) + 'px';
        }
      }

      // Home-only reveal threshold (top of Section 2 at viewport top)
      let revealAt = 0;
      function computeThreshold(){
        if (!isHome()){ revealAt = 0; return; }
        const sections = selectSections();
        if (sections.length < 2){ revealAt = 0; return; }
        const r2 = sections[1].getBoundingClientRect();
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

      // Make left/right inset equal the vertical “air” inside the bar
      function syncEdgePad(){
        const leftLink = hdr.querySelector('.header-nav-item:first-child > a');
        if (!leftLink) return;
        const hr = hdr.getBoundingClientRect();
        const ar = leftLink.getBoundingClientRect();
        const vGap = Math.max(0, Math.round((hr.height - ar.height) / 2));
        const fudge = parseFloat(getComputedStyle(document.documentElement)
                        .getPropertyValue('--mm-edge-fudge')) || 0;
        document.documentElement.style.setProperty('--mm-edge-pad', (vGap + fudge) + 'px');
      }

      // Init
      applyPagePadding();
      computeThreshold();
      syncEdgePad();
      update();

      // Listeners
      window.addEventListener('scroll', update, {passive:true});
      window.addEventListener('resize', () => { applyPagePadding(); computeThreshold(); syncEdgePad(); update(); });

      // Re-sync when fonts load (sizes change)
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(syncEdgePad).catch(()=>{});
      }

      // Re-measure once for late DOM shifts (lazy sections, announcement bar)
      let t = null;
      const mo = new MutationObserver(() => {
        clearTimeout(t);
        t = setTimeout(() => { applyPagePadding(); computeThreshold(); syncEdgePad(); update(); }, 100);
      });
      mo.observe(document.body, {childList:true, subtree:true});
      setTimeout(() => mo.disconnect(), 4000);
    });
  }

  if (document.readyState !== 'loading') setup();
  else document.addEventListener('DOMContentLoaded', setup, {once:true});
})();
