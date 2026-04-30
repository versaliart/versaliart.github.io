/* Mystic Munson — Header v2.7 */
(function(){
  function onceHeader(cb){
    let hdr = document.querySelector('header#header[data-test="header"]');
    if (hdr) return cb(hdr);
    const mo = new MutationObserver(() => {
      hdr = document.querySelector('header#header[data-test="header"]');
      if (hdr){ mo.disconnect(); cb(hdr); }
    });
    mo.observe(document.documentElement, {childList:true, subtree:true});
  }

  function isHome(){
    return !!document.getElementById('mm-home-marker');
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

      function applyMobileFrame(){
        const mobile = window.matchMedia('(max-width: 767px)').matches;
        hdr.style.left = mobile ? '50vw' : '50%';
      }

      Object.assign(hdr.style, {
        position: 'fixed',
        left: '50%',
        top: STICKY + 'px',
      });
      applyMobileFrame();

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

      const page = document.getElementById('page');

      function applyPagePadding(){
        if (isHome()){
          if (page) page.style.setProperty('padding-top', '0px', 'important');
          document.body.style.setProperty('padding-top', '0px', 'important');
          document.body.style.setProperty('margin-top', '0px', 'important');
        } else {
          if (!page) return;
          const h = parseFloat(getComputedStyle(hdr).height) || 52;
          page.style.setProperty('padding-top', (h + STICKY) + 'px', 'important');
          document.body.style.removeProperty('padding-top');
          document.body.style.removeProperty('margin-top');
        }
      }

      let revealAt = 0;

      function computeThreshold(){
        if (!isHome()){
          revealAt = 0;
          return;
        }

        const sections = selectSections();
        if (sections.length < 2){
          revealAt = 0;
          return;
        }

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

      let rafId = 0;
      function scheduleUpdate(full = false){
        if (rafId) return;
        rafId = requestAnimationFrame(() => {
          rafId = 0;
          if (full){
            enforceNavOrder();
            ensureCustomNav();
            applyPagePadding();
            computeThreshold();
            syncEdgePad();
            syncCustomNavPillWidth();
            applyMobileFrame();
          }
          update();
        });
      }

      function enforceNavOrder(){
        const lists = hdr.querySelectorAll('.header-nav-list');
        if (!lists.length) return;

        const desired = [
          { text: 'Work', href: 'https://www.mysticmunson.design/#projects' },
          { text: 'Contact', href: 'https://www.mysticmunson.design/about#contact' },
          { text: 'About', href: 'https://www.mysticmunson.design/about' }
        ];

        lists.forEach((list) => {
          const items = Array.from(list.querySelectorAll(':scope > .header-nav-item'));
          if (!items.length) return;

          const ordered = desired.map((target, index) => {
            let item = items.find((candidate) => {
              const a = candidate.querySelector('a');
              return a && (a.textContent || '').trim().toLowerCase() === target.text.toLowerCase();
            });

            if (!item) {
              item = document.createElement('li');
              item.className = 'header-nav-item';
              const a = document.createElement('a');
              a.href = target.href;
              a.textContent = target.text;
              item.appendChild(a);
            }

            const link = item.querySelector('a');
            if (link) {
              link.href = target.href;
              link.textContent = target.text;
              link.setAttribute('aria-label', target.text);
            }
            item.setAttribute('data-mm-slot', String(index + 1));
            return item;
          });

          list.innerHTML = '';
          ordered.forEach((item) => list.appendChild(item));
        });
      }


      function ensureCustomNav(){
        let nav = hdr.querySelector('.mm-custom-nav');
        if (!nav){
          nav = document.createElement('nav');
          nav.className = 'mm-custom-nav';
          nav.setAttribute('aria-label', 'Primary');
          nav.innerHTML = `
            <a class="mm-pill" href="https://www.mysticmunson.design/#projects" aria-label="Work">Work</a>
            <span class="mm-sparkle" aria-hidden="true"></span>
            <a class="mm-pill" href="https://www.mysticmunson.design/about#contact" aria-label="Contact">Contact</a>
            <span class="mm-sparkle" aria-hidden="true"></span>
            <a class="mm-pill" href="https://www.mysticmunson.design/about" aria-label="About">About</a>
          `;
          hdr.appendChild(nav);
        }
      }


      function syncCustomNavPillWidth(){
        const nav = hdr.querySelector('.mm-custom-nav');
        if (!nav) return;
        const pills = Array.from(nav.querySelectorAll('.mm-pill'));
        if (!pills.length) return;

        pills.forEach((pill) => { pill.style.inlineSize = 'auto'; });

        let maxPillWidth = 0;
        pills.forEach((pill) => {
          const rect = pill.getBoundingClientRect();
          const totalWidth = Math.max(0, rect.width);
          maxPillWidth = Math.max(maxPillWidth, totalWidth);
        });

        nav.style.setProperty('--mm-pill-w', `${Math.ceil(maxPillWidth)}px`);
      }

      function syncEdgePad(){
        if (window.matchMedia('(max-width: 767px)').matches){
          document.documentElement.style.setProperty('--mm-edge-pad', '0px');
          return;
        }

        const leftLink = hdr.querySelector('.header-nav-item:first-child > a');
        if (!leftLink) return;
        const hr = hdr.getBoundingClientRect();
        const ar = leftLink.getBoundingClientRect();
        const vGap = Math.max(0, Math.round((hr.height - ar.height) / 2));
        const fudge = parseFloat(getComputedStyle(document.documentElement)
                        .getPropertyValue('--mm-edge-fudge')) || 0;
        document.documentElement.style.setProperty('--mm-edge-pad', (vGap + fudge) + 'px');
      }

      enforceNavOrder();
      ensureCustomNav();
      applyPagePadding();
      computeThreshold();
      syncEdgePad();
      syncCustomNavPillWidth();
      applyMobileFrame();
      update();

      window.addEventListener('scroll', () => scheduleUpdate(false), {passive:true});
      window.addEventListener('resize', () => {
        scheduleUpdate(true);
        syncCustomNavPillWidth();
      }, {passive:true});

      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => {
          scheduleUpdate(true);
          syncCustomNavPillWidth();
        }).catch(()=>{});
      }

      let t = null;
      const mo = new MutationObserver(() => {
        clearTimeout(t);
        t = setTimeout(() => {
          scheduleUpdate(true);
          syncCustomNavPillWidth();
        }, 100);
      });
      mo.observe(document.body, {childList:true, subtree:true});
      setTimeout(() => mo.disconnect(), 4000);
    });
  }

  if (document.readyState !== 'loading') setup();
  else document.addEventListener('DOMContentLoaded', setup, {once:true});
})();
