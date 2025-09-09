/* ===== Topblock Split-Flip (Doors) v2.48 — FULL JS ===== */
(function(){
  // ---------- Build DOM for the doors ----------
  function buildDoors(url){
    const doors = document.createElement('div');
    doors.className = 'flip-doors';
    doors.dataset.image = url;

    const makeDoor = side => {
      const d = document.createElement('div');
      d.className = 'flip-door ' + side;
      const front = document.createElement('div'); front.className = 'face front';
      const back  = document.createElement('div'); back.className  = 'face back';
      d.appendChild(front); d.appendChild(back);
      return d;
    };

    doors.appendChild(makeDoor('left'));
    doors.appendChild(makeDoor('right'));
    return doors;
  }

  // ---------- Layout with sub-pixel precision ----------
  function layout(block){
    const container = block.querySelector('.fluid-image-container');
    const imgEl     = block.querySelector('img[data-sqsp-image-block-image]');
    const doors     = block.querySelector('.flip-doors');
    if (!container || !imgEl || !doors) return;

    // Container size
    const rect = container.getBoundingClientRect();
    const W = Math.max(1, rect.width);
    const H = Math.max(1, rect.height);

    // Natural image dimensions
    let iw = imgEl.naturalWidth  || 1;
    let ih = imgEl.naturalHeight || 1;
    const dims = imgEl.getAttribute('data-image-dimensions');
    if (dims && dims.includes('x')) {
      const [dwStr, dhStr] = dims.split('x');
      const dw = parseFloat(dwStr), dh = parseFloat(dhStr);
      if (dw > 0 && dh > 0) { iw = dw; ih = dh; }
    }

    // Focal point (0..1)
    let fx = 0.5, fy = 0.5;
    const fp = imgEl.getAttribute('data-image-focal-point');
    if (fp && fp.includes(',')) {
      const [sxStr, syStr] = fp.split(',');
      const sx = parseFloat(sxStr), sy = parseFloat(syStr);
      if (!Number.isNaN(sx)) fx = sx;
      if (!Number.isNaN(sy)) fy = sy;
    }

    // object-fit: cover (no rounding)
    const scale = Math.max(W / iw, H / ih);
    const bgW = iw * scale;
    const bgH = ih * scale;

    // Top-left background origin to respect focal point
    const posX = (W * fx) - (bgW * fx);
    const posY = (H * fy) - (bgH * fy);

    // seam/bleed from CSS custom props
    const cs = getComputedStyle(doors);
    const seam  = parseFloat(cs.getPropertyValue('--flip-seam'))  || 0;
    const bleed = parseFloat(cs.getPropertyValue('--edge-bleed')) || 0;

    // Faces
    const leftFront  = doors.querySelector('.flip-door.left  .face.front');
    const rightFront = doors.querySelector('.flip-door.right .face.front');
    const leftBack   = doors.querySelector('.flip-door.left  .face.back');
    const rightBack  = doors.querySelector('.flip-door.right .face.back');

    const url = doors.dataset.image || imgEl.currentSrc || imgEl.src;

    // Apply background with sub-pixel values
    const paint = (el, dx) => {
      if (!el) return;
      el.style.backgroundImage    = `url("${url}")`;
      el.style.backgroundSize     = `${bgW}px ${bgH}px`;
      el.style.backgroundPosition = `${(posX - dx + bleed)}px ${(posY + bleed)}px`;
      el.style.backgroundRepeat   = 'no-repeat';
      el.style.transform          = 'translateZ(0)';
      el.style.backfaceVisibility = 'hidden';
      el.style.webkitBackfaceVisibility = 'hidden';
    };

    // Left uses container origin; right uses center minus overlap
    paint(leftFront, 0);
    paint(leftBack,  0);
    paint(rightFront, (W / 2) - seam);
    paint(rightBack,  (W / 2) - seam);
  }

  // ---------- Utilities ----------
  function isCoarse(){ return matchMedia('(hover: none), (pointer: coarse)').matches; }
  function isFine(){   return matchMedia('(hover: hover) and (pointer: fine)').matches; }
  function getPoint(e){
    if ('clientX' in e) return { x: e.clientX, y: e.clientY };
    const t = (e.changedTouches && e.changedTouches[0]) || (e.touches && e.touches[0]);
    return t ? { x: t.clientX, y: t.clientY } : null;
  }
  function pointOutsideRect(pt, r){
    return !pt || pt.x < r.left || pt.x > r.right || pt.y < r.top || pt.y > r.bottom;
  }

  // ---------- Open/close (desktop) with real pass-through ----------
  function openBlock(block){
    if (block.__open) return;
    block.__open = true;
    block.classList.add('is-open', 'pe-through');  // pe-through => full subtree pointer-events:none

    // Track pointer; when it leaves the block rect, close.
    const onMove = (ev) => {
      const pt = getPoint(ev);
      const rect = block.getBoundingClientRect();
      if (pointOutsideRect(pt, rect)) closeBlock(block);
    };
    const onScroll = () => {
      // if scrolled so pointer no longer over rect, close
      const el = document.elementFromPoint?.(window.event?.clientX ?? 0, window.event?.clientY ?? 0);
      if (el && !block.contains(el)) closeBlock(block);
    };

    document.addEventListener('pointermove', onMove, true);
    window.addEventListener('scroll', onScroll, true);
    block.__cleanupOpen = () => {
      document.removeEventListener('pointermove', onMove, true);
      window.removeEventListener('scroll', onScroll, true);
    };
  }

  function closeBlock(block){
    if (!block.__open) return;
    block.__open = false;
    block.classList.remove('is-open', 'pe-through');
    if (block.__cleanupOpen){ try{ block.__cleanupOpen(); }catch(_){ } block.__cleanupOpen = null; }
  }

  // ---------- Initialize one block ----------
  function initOne(block){
    if (block.classList.contains('flip-top')) return;

    const container = block.querySelector('.fluid-image-container');
    const img = block.querySelector('img[data-sqsp-image-block-image]');
    if (!container || !img) return;

    const url = img.currentSrc || img.src;
    if (!url) return;

    block.classList.add('flip-top');           // mark as processed

    // 1) Build & insert doors overlay
    const doors = buildDoors(url);
    container.appendChild(doors);

    // 2) Disable the marker link only while open or flipped (CSS also covers this)
    const marker = block.querySelector('a.sqs-block-image-link[href="#flip-top"]');
    if (marker){
      marker.addEventListener('click', (e) => {
        if (block.classList.contains('is-open') || block.classList.contains('is-flipped')) {
          e.preventDefault(); e.stopPropagation();
        }
      }, true);
    }

    // 3) Desktop hover → open with pass-through; close when cursor leaves rect
    if (isFine()){
      block.addEventListener('mouseenter', () => openBlock(block));
      // We close in openBlock's pointer tracker; no reliance on mouseleave.
    }

    // 4) Mobile tap to toggle .is-flipped + pass-through
    block.addEventListener('click', function(e){
      if (!isCoarse()) return;
      if (!block.classList.contains('is-flipped')){
        e.preventDefault(); e.stopPropagation();
        block.classList.add('is-flipped', 'pe-through');
      }
    }, true);

    // Tap blank space to unflip (mobile)
    document.addEventListener('click', function(e){
      if (!isCoarse()) return;
      if (block.classList.contains('is-flipped')){
        const insideAction = e.target.closest &&
          e.target.closest('a,button,[role="button"],[role="link"],input,textarea,select,summary');
        if (!insideAction){ block.classList.remove('is-flipped', 'pe-through'); }
      }
    }, true);

    // 5) Initial layout + reactive relayouts
    const relayout = () => layout(block);
    relayout();

    const ro = new ResizeObserver(relayout);
    ro.observe(container);

    const mo = new MutationObserver(relayout);
    mo.observe(img, { attributes: true, attributeFilter: ['src', 'srcset'] });

    if (!img.complete) img.addEventListener('load', relayout, { once: true });

    window.addEventListener('resize', relayout);

    // 6) Safety: if block leaves viewport, close & reset
    if ('IntersectionObserver' in window){
      const io = new IntersectionObserver((entries)=>{
        entries.forEach((entry)=>{
          if (!entry.isIntersecting){
            closeBlock(block);
            block.classList.remove('is-flipped', 'pe-through');
          }
        });
      }, { threshold: 0.05 });
      io.observe(block);
    }
  }

  // ---------- Initialize all eligible blocks ----------
  function initAll(){
    document.querySelectorAll('.sqs-block.image-block').forEach(block => {
      const link = block.querySelector('a.sqs-block-image-link[href="#flip-top"]');
      if (link) initOne(block);
    });
  }

  // Boot + watch DOM for dynamically added blocks (Squarespace editor/lazy)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }
  const moAll = new MutationObserver(initAll);
  moAll.observe(document.documentElement, { childList: true, subtree: true });
})();
