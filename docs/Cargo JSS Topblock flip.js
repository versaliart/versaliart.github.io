/* ===== Topblock Split-Flip (Doors) v2.4===== */

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

  // ---------- Pixel-accurate cover sizing + focal point, with seam overlap ----------
  function layout(block){
    const container = block.querySelector('.fluid-image-container');
    const imgEl     = block.querySelector('img[data-sqsp-image-block-image]');
    const doors     = block.querySelector('.flip-doors');
    if (!container || !imgEl || !doors) return;

    // Container size
    const rect = container.getBoundingClientRect();
    const W = Math.max(1, rect.width);
    const H = Math.max(1, rect.height);

    // Natural image dimensions (Squarespace also provides data-image-dimensions="WxH")
    let iw = imgEl.naturalWidth  || 1;
    let ih = imgEl.naturalHeight || 1;
    const dims = imgEl.getAttribute('data-image-dimensions');
    if (dims && dims.includes('x')) {
      const [dw, dh] = dims.split('x').map(Number);
      if (dw && dh) { iw = dw; ih = dh; }
    }

    // Focal point (0..1, 0..1). Default center.
    let fx = 0.5, fy = 0.5;
    const fp = imgEl.getAttribute('data-image-focal-point');
    if (fp && fp.includes(',')) {
      const [sx, sy] = fp.split(',').map(Number);
      if (!isNaN(sx)) fx = sx;
      if (!isNaN(sy)) fy = sy;
    }

    // Compute "cover" scale like object-fit: cover
    const scale = Math.max(W / iw, H / ih);
    const bgW = Math.round(iw * scale);
    const bgH = Math.round(ih * scale);

    // Top-left background position so focal point aligns
    const posX = Math.round((W * fx) - (bgW * fx));
    const posY = Math.round((H * fy) - (bgH * fy));

    // Seam overlap (px) from CSS variables
    const cs = getComputedStyle(doors);
    const seamIdle = parseFloat(cs.getPropertyValue('--flip-seam')) || 0;
    const seamOpen = parseFloat(cs.getPropertyValue('--flip-seam-open')) || seamIdle;

    // Detect hover to switch overlap used by CSS widths
    const isHovering = block.matches(':hover');
    const seam = isHovering ? seamOpen : seamIdle;

    // Faces
    const leftFront  = doors.querySelector('.flip-door.left  .face.front');
    const rightFront = doors.querySelector('.flip-door.right .face.front');
    const leftBack   = doors.querySelector('.flip-door.left  .face.back');
    const rightBack  = doors.querySelector('.flip-door.right .face.back');

    const url = doors.dataset.image || imgEl.currentSrc || imgEl.src;

    // Apply background to a face; dx is the door's local x offset
    const styleFace = (el, dx) => {
      if (!el) return;
      el.style.backgroundImage    = `url("${url}")`;
      el.style.backgroundSize     = `${bgW}px ${bgH}px`;
      el.style.backgroundPosition = `${posX - dx}px ${posY}px`;
      el.style.backgroundRepeat   = 'no-repeat';
    };

    // Left door uses container origin; right door's origin is center minus overlap
    styleFace(leftFront, 0);
    styleFace(leftBack,  0);
    styleFace(rightFront, (W / 2) - seam);
    styleFace(rightBack,  (W / 2) - seam);
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

    // ResizeObserver: relayout on container size changes
    const ro = new ResizeObserver(relayout);
    ro.observe(container);

    // MutationObserver: relayout if img src/srcset swaps (lazy/responsive)
    const mo = new MutationObserver(relayout);
    mo.observe(img, { attributes: true, attributeFilter: ['src', 'srcset'] });

    // Ensure layout after the image fully loads
    if (!img.complete) img.addEventListener('load', relayout, { once: true });

    // Also relayout when hover state changes (so seam offset matches open/idle widths)
    block.addEventListener('mouseenter', relayout);
    block.addEventListener('mouseleave', relayout);
    // Touch: treat first touch as hover change on mobile
    block.addEventListener('touchstart', relayout, { passive: true });
    block.addEventListener('touchend', relayout,   { passive: true });
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