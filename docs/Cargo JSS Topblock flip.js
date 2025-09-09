/* ===== Topblock Split-Flip (Doors) v2.464 — FULL JS ===== */
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
      // +bleed on both axes because the painted face extends outward
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

  function isOpen(block){
  return block.matches(':hover') || block.classList.contains('is-flipped');
}

function getPoint(e){
  if ('clientX' in e) return { x: e.clientX, y: e.clientY };
  const t = (e.changedTouches && e.changedTouches[0]) || (e.touches && e.touches[0]);
  return t ? { x: t.clientX, y: t.clientY } : null;
}

function findClickableUnder(block, x, y){
  if (!document.elementsFromPoint) return null;
  const stack = document.elementsFromPoint(x, y);
  const CLICKABLE_SEL = 'a,button,[role="button"],[role="link"],label,input,textarea,select,summary';
  // scan the whole stack and pick the first clickable outside Topflip
  for (let i = 0; i < stack.length; i++){
    const el = stack[i];
    if (block.contains(el)) continue;
    if (
      el.matches?.(CLICKABLE_SEL) ||
      el.closest?.(CLICKABLE_SEL)    // covers nested anchors inside SQS containers
    ){
      const chosen = el.matches?.(CLICKABLE_SEL) ? el : el.closest(CLICKABLE_SEL);
      if (chosen && !block.contains(chosen)) return chosen;
    }
  }
  // fallback: first element outside block
  for (let i = 0; i < stack.length; i++){
    const el = stack[i];
    if (!block.contains(el)) return el;
  }
  return null;
}


  // ---------- Utility: is block "open"? ----------
  function isOpen(block){
    return block.matches(':hover') || block.classList.contains('is-flipped');
  }

function forwardEventIfOpen(e, block){
  if (!isOpen(block)) return;

  const pt = getPoint(e);
  if (!pt) return;

  const target = findClickableUnder(block, pt.x, pt.y);
  if (!target) return;

  // Stop the original on Topflip
  try { e.preventDefault(); e.stopPropagation(); } catch(_) {}

  // Re-dispatch a similar event on the element underneath
  const type = e.type;
  const commonInit = {
    bubbles: true, cancelable: true, view: window,
    clientX: pt.x, clientY: pt.y,
    ctrlKey: !!e.ctrlKey, shiftKey: !!e.shiftKey, altKey: !!e.altKey, metaKey: !!e.metaKey,
    button: e.button || 0, buttons: e.buttons || 0
  };

  try {
    if (window.PointerEvent && (type.startsWith('pointer') || type === 'click')){
      target.dispatchEvent(new PointerEvent(type, commonInit));
    } else if (window.MouseEvent){
      target.dispatchEvent(new MouseEvent(type, commonInit));
    } else {
      target.click?.(); // ultimate fallback
    }
  } catch(_){
    try { target.click?.(); } catch(__){}
  }

  // Extra nudge for anchors & SQS buttons
  if (type === 'click' && target.tagName === 'A'){
    // Many SQS buttons are anchors; .click() above usually handles it.
    // Nothing else needed unless your theme cancels it.
  }
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

    // 2) Disable the marker link only while open (CSS also covers this)
    const marker = block.querySelector('a.sqs-block-image-link[href="#flip-top"]');
    if (marker){
      marker.addEventListener('click', (e) => {
        if (isOpen(block)) { e.preventDefault(); e.stopPropagation(); }
      }, true);
    }

    // 3) True click-through while open
    ['pointerdown','pointerup','mousedown','mouseup','click','touchend'].forEach(type=>{
      block.addEventListener(type, function(ev){ forwardEventIfOpen(ev, block); }, true);
    });

    // 4) Initial layout + reactive relayouts
    const relayout = () => layout(block);
    relayout();

    const ro = new ResizeObserver(relayout);
    ro.observe(container);

    const mo = new MutationObserver(relayout);
    mo.observe(img, { attributes: true, attributeFilter: ['src', 'srcset'] });

    if (!img.complete) img.addEventListener('load', relayout, { once: true });

    block.addEventListener('mouseenter', relayout);
    block.addEventListener('mouseleave', relayout);
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
