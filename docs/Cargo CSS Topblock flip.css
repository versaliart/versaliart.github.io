/* ===== Topblock Split-Flip (Doors) v2.50 — FULL JS (bare) ===== */
(function(){
  // Build doors
  function buildDoors(url){
    const doors = document.createElement('div');
    doors.className = 'flip-doors';
    doors.dataset.image = url;
    const mk = side => {
      const d = document.createElement('div');
      d.className = 'flip-door ' + side;
      const f = document.createElement('div'); f.className = 'face front';
      const b = document.createElement('div'); b.className = 'face back';
      d.appendChild(f); d.appendChild(b);
      return d;
    };
    doors.appendChild(mk('left'));
    doors.appendChild(mk('right'));
    return doors;
  }

  // Paint geometry with sub-pixel precision
  function layout(block){
    const container = block.querySelector('.fluid-image-container');
    const imgEl     = block.querySelector('img[data-sqsp-image-block-image]');
    const doors     = block.querySelector('.flip-doors');
    if (!container || !imgEl || !doors) return;

    const rect = container.getBoundingClientRect();
    const W = Math.max(1, rect.width), H = Math.max(1, rect.height);

    let iw = imgEl.naturalWidth  || 1;
    let ih = imgEl.naturalHeight || 1;
    const dims = imgEl.getAttribute('data-image-dimensions');
    if (dims && dims.includes('x')) {
      const [dw, dh] = dims.split('x').map(parseFloat);
      if (dw > 0 && dh > 0){ iw = dw; ih = dh; }
    }

    let fx = 0.5, fy = 0.5;
    const fp = imgEl.getAttribute('data-image-focal-point');
    if (fp && fp.includes(',')){
      const [sx, sy] = fp.split(',').map(parseFloat);
      if (!Number.isNaN(sx)) fx = sx;
      if (!Number.isNaN(sy)) fy = sy;
    }

    const scale = Math.max(W / iw, H / ih);
    const bgW = iw * scale, bgH = ih * scale;
    const posX = (W * fx) - (bgW * fx);
    const posY = (H * fy) - (bgH * fy);

    const cs    = getComputedStyle(doors);
    const seam  = parseFloat(cs.getPropertyValue('--flip-seam'))  || 0;
    const bleed = parseFloat(cs.getPropertyValue('--edge-bleed')) || 0;

    const url = doors.dataset.image || imgEl.currentSrc || imgEl.src;

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

    const lf = doors.querySelector('.flip-door.left  .face.front');
    const lb = doors.querySelector('.flip-door.left  .face.back');
    const rf = doors.querySelector('.flip-door.right .face.front');
    const rb = doors.querySelector('.flip-door.right .face.back');

    paint(lf, 0); paint(lb, 0);
    paint(rf, (W/2) - seam); paint(rb, (W/2) - seam);
  }

  // Utilities
  const isCoarse = () => matchMedia('(hover: none), (pointer: coarse)').matches;
  const isFine   = () => matchMedia('(hover: hover) and (pointer: fine)').matches;

  const closestFeBlock = el => el.closest('.fe-block') || null;

  function setPassThrough(block, on){
    const outer = closestFeBlock(block);
    if (on){
      block.classList.add('pe-through');
      outer && outer.classList.add('pe-through');
    } else {
      block.classList.remove('pe-through');
      outer && outer.classList.remove('pe-through');
    }
  }

  // Robust open/close with multiple fallbacks
  function openBlock(block){
    if (block.__open) return;
    block.__open = true;
    block.classList.add('is-open');
    setPassThrough(block, true);

    // Track last pointer; close when pointer is outside rect
    const updatePt = (e) => {
      block.__lastPt = ('clientX' in e) ? {x:e.clientX, y:e.clientY}
        : (e.changedTouches && e.changedTouches[0]) ? {x:e.changedTouches[0].clientX, y:e.changedTouches[0].clientY}
        : block.__lastPt || null;
      if (!block.__lastPt) return;
      const r = block.getBoundingClientRect();
      const p = block.__lastPt;
      if (p.x < r.left || p.x > r.right || p.y < r.top || p.y > r.bottom){
        closeBlock(block);
      }
    };

    const onPointerMove  = (e) => updatePt(e);
    const onPointerOver  = (e) => updatePt(e); // covers fast transitions without move
    const onScroll       = ()  => {
      if (!block.__lastPt) return;
      const r = block.getBoundingClientRect();
      const p = block.__lastPt;
      if (p.x < r.left || p.x > r.right || p.y < r.top || p.y > r.bottom){
        closeBlock(block);
      }
    };
    const onBlur         = ()  => closeBlock(block);
    const onVisibility   = ()  => { if (document.visibilityState !== 'visible') closeBlock(block); };

    document.addEventListener('pointermove', onPointerMove, true);
    document.addEventListener('pointerover', onPointerOver, true);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('blur', onBlur, true);
    document.addEventListener('visibilitychange', onVisibility, true);

    block.__cleanupOpen = () => {
      document.removeEventListener('pointermove', onPointerMove, true);
      document.removeEventListener('pointerover', onPointerOver, true);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('blur', onBlur, true);
      document.removeEventListener('visibilitychange', onVisibility, true);
      block.__lastPt = null;
    };
  }

  function closeBlock(block){
    if (!block.__open) return;
    block.__open = false;
    block.classList.remove('is-open');
    setPassThrough(block, false);
    if (block.__cleanupOpen){ try{ block.__cleanupOpen(); }catch(_){ } block.__cleanupOpen = null; }
  }

  // Initialize one
  function initOne(block){
    if (block.classList.contains('flip-top')) return;

    const container = block.querySelector('.fluid-image-container');
    const img = block.querySelector('img[data-sqsp-image-block-image]');
    if (!container || !img) return;

    const url = img.currentSrc || img.src;
    if (!url) return;

    block.classList.add('flip-top');

    const doors = buildDoors(url);
    container.appendChild(doors);

    // Disable the marker link only while open/tapped-open (CSS also covers this)
    const marker = block.querySelector('a.sqs-block-image-link[href="#flip-top"]');
    if (marker){
      marker.addEventListener('click', (e) => {
        if (block.classList.contains('is-open') || block.classList.contains('is-flipped')) {
          e.preventDefault(); e.stopPropagation();
        }
      }, true);
    }

    // Desktop: open with pass-through; close via robust document listeners
    if (isFine()){
      block.addEventListener('mouseenter', () => openBlock(block));
    }

    // Mobile: tap to open persistent
    block.addEventListener('click', function(e){
      if (!isCoarse()) return;
      if (!block.classList.contains('is-flipped')){
        e.preventDefault(); e.stopPropagation();
        block.classList.add('is-flipped');
        setPassThrough(block, true);
      }
    }, true);

    // Tap blank space to close on mobile
    document.addEventListener('click', function(e){
      if (!isCoarse()) return;
      if (block.classList.contains('is-flipped')){
        const actionable = e.target.closest &&
          e.target.closest('a,button,[role="button"],[role="link"],input,textarea,select,summary');
        if (!actionable){
          block.classList.remove('is-flipped');
          setPassThrough(block, false);
        }
      }
    }, true);

    // Layout + reactions
    const relayout = () => layout(block);
    relayout();

    const ro = new ResizeObserver(relayout);
    ro.observe(container);

    const mo = new MutationObserver(relayout);
    mo.observe(img, { attributes: true, attributeFilter: ['src', 'srcset'] });

    if (!img.complete) img.addEventListener('load', relayout, { once: true });
    window.addEventListener('resize', relayout);

    // Safety: close when off-screen
    if ('IntersectionObserver' in window){
      const io = new IntersectionObserver((entries)=>{
        entries.forEach((entry)=>{
          if (!entry.isIntersecting){
            closeBlock(block);
            block.classList.remove('is-flipped');
            setPassThrough(block, false);
          }
        });
      }, { threshold: 0.05 });
      io.observe(block);
    }
  }

  // Initialize all eligible blocks
  function initAll(){
    document.querySelectorAll('.sqs-block.image-block').forEach(block => {
      const link = block.querySelector('a.sqs-block-image-link[href="#flip-top"]');
      if (link) initOne(block);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }
  const moAll = new MutationObserver(initAll);
  moAll.observe(document.documentElement, { childList: true, subtree: true });
})();
