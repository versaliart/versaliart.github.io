/* ===== Topblock Split-Flip (Doors) v2.41===== */

(function(){
  // ---------- DOM builders ----------
  function buildDoors(){
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
    return doors;
  }

  function buildSeamShield(){
    const shield = document.createElement('div');
    shield.className = 'flip-seam-shield'; // full-size, behind doors
    shield.style.pointerEvents = 'none';
    return shield;
  }

  // ---------- Cover sizing + focal point (shared for shield and doors) ----------
  function computeCover(container, imgEl){
    const rect = container.getBoundingClientRect();
    const W = Math.max(1, rect.width);
    const H = Math.max(1, rect.height);

    let iw = imgEl.naturalWidth  || 1;
    let ih = imgEl.naturalHeight || 1;
    const dims = imgEl.getAttribute('data-image-dimensions');
    if (dims && dims.includes('x')) {
      const [dw, dh] = dims.split('x').map(Number);
      if (dw && dh) { iw = dw; ih = dh; }
    }

    let fx = 0.5, fy = 0.5;
    const fp = imgEl.getAttribute('data-image-focal-point');
    if (fp && fp.includes(',')) {
      const [sx, sy] = fp.split(',').map(Number);
      if (!isNaN(sx)) fx = sx;
      if (!isNaN(sy)) fy = sy;
    }

    const scale = Math.max(W / iw, H / ih);
    const bgW = Math.round(iw * scale);
    const bgH = Math.round(ih * scale);
    const posX = Math.round((W * fx) - (bgW * fx));
    const posY = Math.round((H * fy) - (bgH * fy));

    return { W, H, bgW, bgH, posX, posY };
  }

  // ---------- Layout everything (doors + seam shield) ----------
  function layout(block){
    const container = block.querySelector('.fluid-image-container');
    const imgEl     = block.querySelector('img[data-sqsp-image-block-image]');
    const doors     = block.querySelector('.flip-doors');
    const shield    = block.querySelector('.flip-seam-shield');
    if (!container || !imgEl || !doors || !shield) return;

    const { W, H, bgW, bgH, posX, posY } = computeCover(container, imgEl);

    // Read current URL (srcset may have swapped)
    const url = imgEl.currentSrc || imgEl.src;

    // Seam variables (px) — hover-aware because your CSS widens doors on hover
    const cs = getComputedStyle(doors);
    const seamIdle = parseFloat(cs.getPropertyValue('--flip-seam')) || 0;
    const seamOpen = parseFloat(cs.getPropertyValue('--flip-seam-open')) || seamIdle;
    const isHovering = block.matches(':hover');
    const seam = isHovering ? seamOpen : seamIdle;

    // Paint seam shield with the same image/cover — sits *under* the doors
    shield.style.backgroundImage  = `url("${url}")`;
    shield.style.backgroundSize   = `${bgW}px ${bgH}px`;
    shield.style.backgroundPosition = `${posX}px ${posY}px`;
    shield.style.backgroundRepeat = 'no-repeat';

    // Door faces
    const leftFront  = doors.querySelector('.flip-door.left  .face.front');
    const rightFront = doors.querySelector('.flip-door.right .face.front');
    const leftBack   = doors.querySelector('.flip-door.left  .face.back');
    const rightBack  = doors.querySelector('.flip-door.right .face.back');

    const styleFace = (el, dx) => {
      if (!el) return;
      el.style.backgroundImage    = `url("${url}")`;
      el.style.backgroundSize     = `${bgW}px ${bgH}px`;
      el.style.backgroundPosition = `${posX - dx}px ${posY}px`;
      el.style.backgroundRepeat   = 'no-repeat';
      // promote for stability
      el.style.transform = 'translateZ(0)';
      el.style.backfaceVisibility = 'hidden';
      el.style.webkitBackfaceVisibility = 'hidden';
    };

    // Left uses container origin; right uses center minus overlap
    styleFace(leftFront, 0);
    styleFace(leftBack,  0);
    styleFace(rightFront, (W / 2) - seam);
    styleFace(rightBack,  (W / 2) - seam);
  }

  // ---------- Init one Squarespace image block ----------
  function initOne(block){
    if (block.classList.contains('flip-top')) return;

    const container = block.querySelector('.fluid-image-container');
    const img = block.querySelector('img[data-sqsp-image-block-image]');
    if (!container || !img) return;

    // Leave the original IMG visible (opacity 1); we’ll cover it with shield+doors.
    // This keeps the underlying content identical to stock and aids AA.

    // Insert seam shield (under doors)
    const shield = buildSeamShield();
    shield.style.position = 'absolute';
    shield.style.inset = '0';
    shield.style.zIndex = '0'; // base of our overlay stack
    container.appendChild(shield);

    // Insert doors (above shield)
    const doors = buildDoors();
    doors.style.position = 'absolute';
    doors.style.inset = '0';
    doors.style.zIndex = '1';
    container.appendChild(doors);

    // Mark processed
    block.classList.add('flip-top');

    const relayout = () => layout(block);
    // Initial layout
    relayout();

    // Resize / srcset swaps / load
    const ro = new ResizeObserver(relayout);
    ro.observe(container);

    const mo = new MutationObserver(relayout);
    mo.observe(img, { attributes: true, attributeFilter: ['src', 'srcset'] });

    if (!img.complete) img.addEventListener('load', relayout, { once: true });

    // Recompute when hover state changes, to keep offset matching open width
    block.addEventListener('mouseenter', relayout);
    block.addEventListener('mouseleave', relayout);
    block.addEventListener('touchstart', relayout, { passive: true });
    block.addEventListener('touchend',   relayout, { passive: true });
  }

  // ---------- Init all eligible blocks (href="#flip-top") ----------
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
