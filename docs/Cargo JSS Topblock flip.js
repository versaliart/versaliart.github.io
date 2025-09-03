/* ===== Topblock Split-Flip (Doors) v2.45 — FULL JS ===== */

(function(){
  // ---------- Build DOM for the doors ----------
  function buildDoors(url){
    const doors = document.createElement('div');
    doors.className = 'flip-doors';
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
    doors.dataset.image = url; // used by layout()
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

    // Natural image dimensions (Squarespace often adds data-image-dimensions="WxH")
    let iw = imgEl.naturalWidth  || 1;
    let ih = imgEl.naturalHeight || 1;
    const dims = imgEl.getAttribute('data-image-dimensions');
    if (dims && dims.includes('x')) {
      const parts = dims.split('x');
      const dw = parseFloat(parts[0]); const dh = parseFloat(parts[1]);
      if (dw > 0 && dh > 0) { iw = dw; ih = dh; }
    }

    // Focal point (0..1)
    let fx = 0.5, fy = 0.5;
    const fp = imgEl.getAttribute('data-image-focal-point');
    if (fp && fp.includes(',')) {
      const parts = fp.split(',');
      const sx = parseFloat(parts[0]); const sy = parseFloat(parts[1]);
      if (!Number.isNaN(sx)) fx = sx;
      if (!Number.isNaN(sy)) fy = sy;
    }

    // object-fit: cover (NO rounding — keep sub-pixel precision)
    const scale = Math.max(W / iw, H / ih);
    const bgW = iw * scale;
    const bgH = ih * scale;

    // Top-left background position so focal maps correctly
    const posX = (W * fx) - (bgW * fx);
    const posY = (H * fy) - (bgH * fy);

    // Constant seam overlap (in px) from CSS var on .flip-doors
    const seam = parseFloat(getComputedStyle(doors).getPropertyValue('--flip-seam')) || 0;

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
      el.style.backgroundPosition = `${posX - dx}px ${posY}px`;  // allow decimals
      el.style.backgroundRepeat   = 'no-repeat';
      el.style.transform          = 'translateZ(0)';             // promote layer
      el.style.backfaceVisibility = 'hidden';
      el.style.webkitBackfaceVisibility = 'hidden';
    };

    // Left uses container origin; right uses center minus overlap
    paint(leftFront, 0);
    paint(leftBack,  0);
    paint(rightFront, (W / 2) - seam);
    paint(rightBack,  (W / 2) - seam);
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
    const doors = buildDoors(url);
    container.appendChild(doors);

    const relayout = () => layout(block);
    relayout();

    // Relayout on container resize
    const ro = new ResizeObserver(relayout);
    ro.observe(container);

    // Relayout on image src/srcset change (Squarespace lazy/responsive)
    const mo = new MutationObserver(relayout);
    mo.observe(img, { attributes: true, attributeFilter: ['src', 'srcset'] });

    // Ensure layout once image fully loads
    if (!img.complete) img.addEventListener('load', relayout, { once: true });

    // Relayout on hover enter/leave (rare, but keeps offsets perfect mid-flip)
    block.addEventListener('mouseenter', relayout);
    block.addEventListener('mouseleave', relayout);

    // Also on window resize (some themes resize outside container RO)
    window.addEventListener('resize', relayout);
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