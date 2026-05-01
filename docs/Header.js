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

      function ensurePillGlow(){
        const pills = Array.from(hdr.querySelectorAll('.mm-custom-nav .mm-pill'));
        if (!pills.length) return;

        pills.forEach((pill) => {
          if (pill.querySelector('.mm-glow-container')) return;

          const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          svg.classList.add('mm-glow-container');
          svg.setAttribute('aria-hidden', 'true');
          svg.setAttribute('focusable', 'false');
          svg.setAttribute('viewBox', '0 0 100 100');
          svg.setAttribute('preserveAspectRatio', 'none');

          const blurRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          blurRect.classList.add('mm-glow-blur');

          const lineRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          lineRect.classList.add('mm-glow-line');

          [blurRect, lineRect].forEach((rect) => {
            rect.setAttribute('x', '1');
            rect.setAttribute('y', '1');
            rect.setAttribute('width', '98');
            rect.setAttribute('height', '98');
            rect.setAttribute('pathLength', '100');
            rect.setAttribute('rx', '12');
            rect.setAttribute('ry', '12');
        });

    svg.appendChild(blurRect);
    svg.appendChild(lineRect);
    pill.prepend(svg);
  });
}

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
      let hasMeasuredWidth = false;
      let fontsSettled = !document.fonts || !document.fonts.ready;
      let pillWidthCache = 0;
      let headerWidthCache = 0;

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
        const needsStableDesktopWidth = !window.matchMedia('(max-width: 767px)').matches;
        const readyToShow = !needsStableDesktopWidth || (hasMeasuredWidth && fontsSettled);

        if (isHome()){
          if (window.scrollY >= revealAt){
            if (!readyToShow){
              hideHeader();
              return;
            }
            showHeader();
          }
          else hideHeader();
        } else {
          if (!readyToShow){
            hideHeader();
            return;
          }
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
            ensurePillGlow();
            applyPagePadding();
            computeThreshold();
            syncEdgePad();
            syncCustomNavPillWidth();
            syncHeaderWidth();
            applyMobileFrame();
          }
          update();
        });
      }

      let thresholdRafId = 0;
      function scheduleThresholdUpdate(){
        if (thresholdRafId) return;
        thresholdRafId = requestAnimationFrame(() => {
          thresholdRafId = 0;
          computeThreshold();
          update();
        });
      }

      function enforceNavOrder(){
        const lists = hdr.querySelectorAll('.header-nav-list');
        if (!lists.length) return;

        const desired = ['Work', 'Contact', 'About'];

        lists.forEach((list) => {
          const items = Array.from(list.querySelectorAll(':scope > .header-nav-item'));
          if (!items.length) return;

          const byLabel = new Map();
          items.forEach((item) => {
            const link = item.querySelector('a');
            if (!link) return;
            const label = (link.textContent || '').trim().toLowerCase();
            if (!byLabel.has(label)) byLabel.set(label, item);
          });

          const ordered = desired.map((text, index) => {
            let item = byLabel.get(text.toLowerCase());
            if (!item) {
              item = document.createElement('li');
              item.className = 'header-nav-item';
              const a = document.createElement('a');
              a.href = '#';
              a.textContent = text;
              a.setAttribute('aria-label', text);
              item.appendChild(a);
            }

            const link = item.querySelector('a');
            if (link) {
              link.textContent = text;
              link.setAttribute('aria-label', text);
            }
            item.setAttribute('data-mm-slot', String(index + 1));
            return item;
          });

          const shouldReorder = ordered.some((item, index) => list.children[index] !== item);
          if (shouldReorder) {
            ordered.forEach((item, index) => {
              const current = list.children[index];
              if (current !== item) list.insertBefore(item, current || null);
            });
          }
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

  // Always release the previous fixed width before measuring.
  nav.style.setProperty('--mm-pill-w', 'auto');
  pills.forEach((pill) => {
    pill.style.removeProperty('inline-size');
  });

  let maxPillWidth = 0;

  pills.forEach((pill) => {
    const rect = pill.getBoundingClientRect();
    maxPillWidth = Math.max(maxPillWidth, rect.width);
  });

  const next = Math.ceil(maxPillWidth);

  if (next > 0){
    nav.style.setProperty('--mm-pill-w', `${next}px`);
    pillWidthCache = next;
  }
}


      function syncHeaderWidth(){
        const nav = hdr.querySelector('.mm-custom-nav');
        if (!nav) return;


const kids = Array.from(nav.children);
if (!kids.length) return;

let left = Infinity;
let right = -Infinity;

kids.forEach((el) => {
  const rect = el.getBoundingClientRect();
  left = Math.min(left, rect.left);
  right = Math.max(right, rect.right);
});

const width = Math.ceil(right - left);
const maxWidth = Math.max(0, window.innerWidth - 8);
const finalWidth = Math.min(width, maxWidth);

if (finalWidth > 0 && finalWidth !== headerWidthCache){
  hdr.style.width = finalWidth + 'px';
  document.documentElement.style.setProperty('--mm-bar-w', finalWidth + 'px');
  headerWidthCache = finalWidth;
}

if (finalWidth > 0){
  hasMeasuredWidth = true;
}
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
      ensurePillGlow();
      applyPagePadding();
      computeThreshold();
      syncEdgePad();
      syncCustomNavPillWidth();
      syncHeaderWidth();
      applyMobileFrame();
      update();

      window.addEventListener('scroll', () => scheduleUpdate(false), {passive:true});
let resizeSettleTimer = null;

window.addEventListener('resize', () => {
  pillWidthCache = 0;
  headerWidthCache = 0;

  scheduleUpdate(true);

  clearTimeout(resizeSettleTimer);
  resizeSettleTimer = setTimeout(() => {
    pillWidthCache = 0;
    headerWidthCache = 0;

    syncCustomNavPillWidth();
    syncHeaderWidth();
    applyMobileFrame();
    update();
  }, 250);
}, {passive:true});

      if (document.fonts && document.fonts.ready) {
        setTimeout(() => {
          if (fontsSettled) return;
          fontsSettled = true;
          scheduleUpdate(true);
        }, 1500);
        document.fonts.ready.then(() => {
          fontsSettled = true;
          pillWidthCache = 0;
          headerWidthCache = 0;
          hasMeasuredWidth = false;
          scheduleUpdate(true);
        }).catch(()=>{});
      }

      let t = null;
      const scheduleFullUpdateFromMutation = () => {
        clearTimeout(t);
        t = setTimeout(() => {
          scheduleUpdate(true);
        }, 100);
      };

      const headerMO = new MutationObserver((mutations) => {
        const relevant = mutations.some((m) =>
          m.type === 'childList' && (
            m.target === hdr ||
            (m.target instanceof Element && m.target.classList.contains('mm-custom-nav'))
          )
        );
        if (!relevant) return;
        scheduleFullUpdateFromMutation();
      });
      headerMO.observe(hdr, {childList:true, subtree:true});
      setTimeout(() => headerMO.disconnect(), 4000);

      if (page){
        const pageMO = new MutationObserver((mutations) => {
          const relevant = mutations.some((m) => {
            if (m.type !== 'childList') return false;
            if (!(m.target instanceof Element)) return false;
            if (!page.contains(m.target)) return false;

            const sectionNodeChanged = (node) => node instanceof Element &&
              (node.tagName === 'SECTION' || !!node.querySelector('section'));

            return (
              sectionNodeChanged(m.target) ||
              Array.from(m.addedNodes).some(sectionNodeChanged) ||
              Array.from(m.removedNodes).some(sectionNodeChanged)
            );
          });
          if (!relevant) return;
          scheduleThresholdUpdate();
        });

        pageMO.observe(page, {childList:true, subtree:true});
      }
    });
  }

  if (document.readyState !== 'loading') setup();
  else document.addEventListener('DOMContentLoaded', setup, {once:true});
})();

/* Mystic Munson — Squarespace Button Glow */
(function(){
  function addGlowToButton(button){
    if (!button || button.querySelector('.mm-glow-container')) return;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('mm-glow-container');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('preserveAspectRatio', 'none');

    const blurRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    blurRect.classList.add('mm-glow-blur');

    const lineRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    lineRect.classList.add('mm-glow-line');

    [blurRect, lineRect].forEach((rect) => {
      rect.setAttribute('x', '1');
      rect.setAttribute('y', '1');
      rect.setAttribute('width', '98');
      rect.setAttribute('height', '98');
      rect.setAttribute('pathLength', '100');

      const radius = parseFloat(getComputedStyle(button).borderRadius) || 12;
      rect.setAttribute('rx', String(radius));
      rect.setAttribute('ry', String(radius));
    });

    svg.appendChild(blurRect);
    svg.appendChild(lineRect);
    button.prepend(svg);
  }

  function setupButtonGlow(){
    document.querySelectorAll('.sqs-block-button-element').forEach(addGlowToButton);
  }

  if (document.readyState !== 'loading') setupButtonGlow();
  else document.addEventListener('DOMContentLoaded', setupButtonGlow, {once:true});

  const mo = new MutationObserver(setupButtonGlow);
  mo.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();