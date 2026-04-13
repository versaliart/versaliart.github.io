/* ===== Topblock Split-Flip (Doors) v2.60 — FULL JS (desktop hover fixed + blank backs) ===== */
(function(){
  function buildDoors(url){
    const doors = document.createElement('div');
    doors.className = 'flip-doors';
    doors.dataset.image = url;

    const mk = side => {
      const d = document.createElement('div');
      d.className = 'flip-door ' + side;

      const f = document.createElement('div');
      f.className = 'face front';

      const b = document.createElement('div');
      b.className = 'face back';

      d.appendChild(f);
      d.appendChild(b);
      return d;
    };

    doors.appendChild(mk('left'));
    doors.appendChild(mk('right'));
    return doors;
  }

  function layout(block){
    const container = block.querySelector('.fluid-image-container');
    const imgEl = block.querySelector('img[data-sqsp-image-block-image]');
    const doors = block.querySelector('.flip-doors');
    if (!container || !imgEl || !doors) return;

    const rect = container.getBoundingClientRect();
    const W = Math.max(1, rect.width);
    const H = Math.max(1, rect.height);

    let iw = imgEl.naturalWidth || 1;
    let ih = imgEl.naturalHeight || 1;

    const dims = imgEl.getAttribute('data-image-dimensions');
    if (dims && dims.includes('x')) {
      const [dw, dh] = dims.split('x').map(parseFloat);
      if (dw > 0 && dh > 0) {
        iw = dw;
        ih = dh;
      }
    }

    let fx = 0.5;
    let fy = 0.5;
    const fp = imgEl.getAttribute('data-image-focal-point');
    if (fp && fp.includes(',')) {
      const [sx, sy] = fp.split(',').map(parseFloat);
      if (!Number.isNaN(sx)) fx = sx;
      if (!Number.isNaN(sy)) fy = sy;
    }

    const scale = Math.max(W / iw, H / ih);
    const bgW = iw * scale;
    const bgH = ih * scale;
    const posX = (W * fx) - (bgW * fx);
    const posY = (H * fy) - (bgH * fy);

    const cs = getComputedStyle(doors);
    const seam = parseFloat(cs.getPropertyValue('--flip-seam')) || 0;
    const bleed = parseFloat(cs.getPropertyValue('--edge-bleed')) || 0;

    const url = doors.dataset.image || imgEl.currentSrc || imgEl.src;
    if (!url) return;

    const paint = (el, dx) => {
      if (!el) return;
      el.style.backgroundImage = `url("${url}")`;
      el.style.backgroundSize = `${bgW}px ${bgH}px`;
      el.style.backgroundPosition = `${(posX - dx + bleed)}px ${(posY + bleed)}px`;
      el.style.backgroundRepeat = 'no-repeat';
      el.style.transform = 'translateZ(0)';
      el.style.backfaceVisibility = 'hidden';
      el.style.webkitBackfaceVisibility = 'hidden';
    };

    const lf = doors.querySelector('.flip-door.left .face.front');
    const lb = doors.querySelector('.flip-door.left .face.back');
    const rf = doors.querySelector('.flip-door.right .face.front');
    const rb = doors.querySelector('.flip-door.right .face.back');

    /* Paint fronts only */
    paint(lf, 0);
    paint(rf, (W / 2) - seam);

    /* Leave backs blank so the image truly opens away */
    if (lb) {
      lb.style.backgroundImage = 'none';
      lb.style.backgroundColor = 'transparent';
    }
    if (rb) {
      rb.style.backgroundImage = 'none';
      rb.style.backgroundColor = 'transparent';
    }
  }

  const closestFeBlock = el => el.closest('.fe-block') || null;

  const mobileFlipBlocks = new Set();
  let mobileCloseHandlerInstalled = false;

  function ensureMobileCloseHandler(){
    if (mobileCloseHandlerInstalled) return;
    mobileCloseHandlerInstalled = true;

    document.addEventListener('click', function(e){
      const actionable = e.target.closest &&
        e.target.closest('a,button,[role="button"],[role="link"],input,textarea,select,summary');

      if (actionable) return;

      mobileFlipBlocks.forEach(block => {
        if (block.classList.contains('is-flipped')) {
          block.classList.remove('is-flipped');
          setPassThrough(block, false);
        }
      });
    }, true);
  }

  function setPassThrough(block, on){
    const outer = closestFeBlock(block);
    if (on) {
      block.classList.add('pe-through');
      if (outer) outer.classList.add('pe-through');
    } else {
      block.classList.remove('pe-through');
      if (outer) outer.classList.remove('pe-through');
    }
  }

  function openBlock(block){
    if (block.__open) return;
    block.__open = true;
    block.classList.add('is-open');
    setPassThrough(block, true);
  }

  function closeBlock(block){
    if (!block.__open) return;
    block.__open = false;
    block.classList.remove('is-open');
    setPassThrough(block, false);
  }

  function initOne(block){
    if (!block || block.classList.contains('flip-top')) return;

    const container = block.querySelector('.fluid-image-container');
    const img = block.querySelector('img[data-sqsp-image-block-image]');
    if (!container || !img) return;

    const url = img.currentSrc || img.src;
    if (!url) return;

    block.classList.add('flip-top');

    const doors = buildDoors(url);
    container.appendChild(doors);

    /* Desktop: always bind hover */
    block.addEventListener('mouseenter', () => openBlock(block));
    block.addEventListener('mouseleave', () => closeBlock(block));

    /* Mobile/touch: tap to flip */
    block.addEventListener('click', function(e){
      const coarse = matchMedia('(hover: none), (pointer: coarse)').matches;
      if (!coarse) return;

      if (!block.classList.contains('is-flipped')) {
        e.preventDefault();
        e.stopPropagation();
        block.classList.add('is-flipped');
        setPassThrough(block, true);
      }
    }, true);

    mobileFlipBlocks.add(block);
    ensureMobileCloseHandler();

    const relayout = () => layout(block);
    relayout();

    const ro = new ResizeObserver(relayout);
    ro.observe(container);

    const mo = new MutationObserver(relayout);
    mo.observe(img, {
      attributes: true,
      attributeFilter: ['src', 'srcset', 'style']
    });

    if (!img.complete) {
      img.addEventListener('load', relayout, { once: true });
    }

    window.addEventListener('resize', relayout);

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            closeBlock(block);
            block.classList.remove('is-flipped');
            setPassThrough(block, false);
          }
        });
      }, { threshold: 0.05 });

      io.observe(block);
    }
  }

  const FLIP_BLOCK_SELECTORS = [
    '#block-yui_3_17_2_1_1756837579989_139784',
    '#block-d59fbc8ac97ccae4d7cf',
    '#block-ddcb38350b1a61378b66',
    '#block-02885c92e089f6b77857',
    '#block-ec8fd1095d8bde19b913'
  ];

  function initAll(){
    FLIP_BLOCK_SELECTORS.forEach(selector => {
      const block = document.querySelector(selector);
      if (block) initOne(block);
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