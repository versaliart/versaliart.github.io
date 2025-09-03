
/* ===== Topblock Split-Flip (Doors) v2.2===== */

(function(){
  function buildDoors(url){
    const doors = document.createElement('div');
    doors.className = 'flip-doors';
    const makeDoor = side => {
      const d = document.createElement('div');
      d.className = 'flip-door ' + side;
      const front = document.createElement('div');
      front.className = 'face front';
      const back  = document.createElement('div');
      back.className  = 'face back';
      d.appendChild(front); d.appendChild(back);
      return d;
    };
    doors.appendChild(makeDoor('left'));
    doors.appendChild(makeDoor('right'));
    // Store the image URL on the host for layout()
    doors.dataset.image = url;
    return doors;
  }

  // Compute pixel-accurate background-size/position for both halves
  function layout(block){
    const container = block.querySelector('.fluid-image-container');
    const imgEl = block.querySelector('img[data-sqsp-image-block-image]');
    const doors = block.querySelector('.flip-doors');
    if (!container || !imgEl || !doors) return;

    // Container size
    const rect = container.getBoundingClientRect();
    const W = Math.max(1, rect.width);
    const H = Math.max(1, rect.height);

    // Natural image size (Squarespace puts this on the img)
    // Fallback to current displayed if missing
    let iw = imgEl.naturalWidth || 1;
    let ih = imgEl.naturalHeight || 1;
    const dims = imgEl.getAttribute('data-image-dimensions');
    if (dims && dims.includes('x')) {
      const [dw, dh] = dims.split('x').map(Number);
      if (dw && dh) { iw = dw; ih = dh; }
    }

    // Focal point (0..1,0..1), default center
    let fx = 0.5, fy = 0.5;
    const fp = imgEl.getAttribute('data-image-focal-point');
    if (fp && fp.includes(',')) {
      const [sx, sy] = fp.split(',').map(Number);
      if (!isNaN(sx)) fx = sx;
      if (!isNaN(sy)) fy = sy;
    }

    // COVER scale
    const scale = Math.max(W / iw, H / ih);
    const bgW = Math.round(iw * scale);
    const bgH = Math.round(ih * scale);

    // Background top-left, relative to the full container (pixels)
    // Align so the focal point in the image maps to the same focal in the container
    const posX = Math.round((W * fx) - (bgW * fx));
    const posY = Math.round((H * fy) - (bgH * fy));

    // Each half’s background-position is relative to *its own* left edge.
    // Right half begins at containerLeft + W/2, so subtract W/2.
    const leftDoor  = doors.querySelector('.flip-door.left  .face.front');
    const rightDoor = doors.querySelector('.flip-door.right .face.front');
    const leftBack  = doors.querySelector('.flip-door.left  .face.back');
    const rightBack = doors.querySelector('.flip-door.right .face.back');

    const url = doors.dataset.image || (imgEl.currentSrc || imgEl.src);

    // Apply identical size, with door-relative X offsets
    const styleFace = (el, dx) => {
      if (!el) return;
      el.style.backgroundImage  = `url("${url}")`;
      el.style.backgroundSize   = `${bgW}px ${bgH}px`;
      el.style.backgroundPosition = `${posX - dx}px ${posY}px`;
      el.style.backgroundRepeat = 'no-repeat';
    };

    styleFace(leftDoor,  0);
    styleFace(leftBack,  0);
    styleFace(rightDoor, W / 2);
    styleFace(rightBack, W / 2);
  }

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

    // layout now and on changes
    const relayout = () => layout(block);
    relayout();

    // When the responsive image swaps, relayout
    const io = new ResizeObserver(relayout);
    io.observe(container);

    // Also watch for src/srcset changes (Squarespace lazy loads)
    const mo = new MutationObserver(relayout);
    mo.observe(img, { attributes: true, attributeFilter: ['src', 'srcset'] });

    // In case natural sizes weren’t ready yet
    if (!img.complete) img.addEventListener('load', relayout, { once: true });
  }

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
  moAll.observe(document.documentElement, { childList:true, subtree:true });
})();