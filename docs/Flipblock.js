/* ===== Topblock Split-Flip v3.10 — paired image blocks ===== */
(function(){
  const OPEN_DURATION = 480; /* match CSS --flip-open-duration */
  const FLIP_PAIRS = [
    {
      image: '#block-yui_3_17_2_1_1756837579989_139784', /* BH */
    },
    {
      image: '#block-d59fbc8ac97ccae4d7cf',  /* Carlos */
    },
    {
      image: '#block-ddcb38350b1a61378b66', /* WINGS */
    },
        {
      image: '#block-02885c92e089f6b77857', /* Rough Trade */
    },
        {
      image: '#block-6cae5cdc3440b816bef2', /* Gilbert */
    }
  ];

  function buildDoors(){
    const doors = document.createElement('div');
    doors.className = 'flip-doors';

    function mk(side){
      const d = document.createElement('div');
      d.className = 'flip-door ' + side;

      const f = document.createElement('div');
      f.className = 'face front';

      const b = document.createElement('div');
      b.className = 'face back';

      d.appendChild(f);
      d.appendChild(b);
      return d;
    }

    doors.appendChild(mk('left'));
    doors.appendChild(mk('right'));
    return doors;
  }

  function closestFeBlock(el){
    return el.closest('.fe-block') || null;
  }

  function pointInRect(x, y, rect){
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  }

function setPassThrough(block, on){
  const fe = closestFeBlock(block);

  if (on) {
    block.classList.add('pe-through');
    if (fe) fe.classList.add('pe-through');
  } else {
    block.classList.remove('pe-through');
    if (fe) fe.classList.remove('pe-through');
  }
}

  function clearTimers(block){
    clearTimeout(block.__ptTimer);
    block.__ptTimer = null;
  }

  function removePairWatcher(pair){
    if (pair.pointerWatcher) {
      document.removeEventListener('pointermove', pair.pointerWatcher, true);
      pair.pointerWatcher = null;
    }
  }

  function getPairUnionRect(pair){
    const rects = (pair.watchBlocks || pair.blocks)
      .filter(Boolean)
      .map(function(el){ return el.getBoundingClientRect(); });

    if (!rects.length) return null;

    return {
      left: Math.min.apply(null, rects.map(function(r){ return r.left; })),
      top: Math.min.apply(null, rects.map(function(r){ return r.top; })),
      right: Math.max.apply(null, rects.map(function(r){ return r.right; })),
      bottom: Math.max.apply(null, rects.map(function(r){ return r.bottom; }))
    };
  }

  function startPairWatcher(pair){
    removePairWatcher(pair);

    pair.pointerWatcher = function(e){
      if (!pair.open) return;

      const rect = getPairUnionRect(pair);
      if (!rect) return;

      if (!pointInRect(e.clientX, e.clientY, rect)) {
        closePair(pair);
      }
    };

    document.addEventListener('pointermove', pair.pointerWatcher, true);
  }

  function openBlock(block){
    clearTimers(block);

    if (!block.__open) {
      block.__open = true;
      block.classList.add('is-open');
    }

    block.__ptTimer = setTimeout(function(){
      if (!block.__open) return;
      setPassThrough(block, true);
    }, OPEN_DURATION);
  }

  function closeBlock(block){
    clearTimers(block);
    block.__open = false;
    setPassThrough(block, false);
    block.classList.remove('is-open');
  }

  function openPair(pair){
    if (pair.open) return;
    pair.open = true;

    pair.blocks.forEach(function(block){
      if (block) openBlock(block);
    });

    startPairWatcher(pair);
  }

  function closePair(pair){
    pair.open = false;
    removePairWatcher(pair);

    pair.blocks.forEach(function(block){
      if (block) closeBlock(block);
    });
  }

  function isImageBlock(block){
    return !!block.querySelector('img[data-sqsp-image-block-image]');
  }

  function buildImageDoors(block){
    if (block.__flipBuilt) return true;

    const container = block.querySelector('.fluid-image-container');
    const img = block.querySelector('img[data-sqsp-image-block-image]');
    if (!container || !img) return false;

    const url = img.currentSrc || img.src;
    if (!url) return false;

    block.classList.add('flip-top', 'flip-image');
    container.style.position = 'relative';

    const doors = buildDoors();
    doors.dataset.image = url;
    container.appendChild(doors);

    block.__flipType = 'image';
    block.__flipHost = container;
    block.__flipImg = img;
    block.__flipDoors = doors;
    block.__flipBuilt = true;

    const relayout = function(){ layoutImageBlock(block); };
    block.__relayout = relayout;

    relayout();

    const ro = new ResizeObserver(relayout);
    ro.observe(container);
    block.__flipRO = ro;

    const mo = new MutationObserver(relayout);
    mo.observe(img, {
      attributes: true,
      attributeFilter: ['src', 'srcset', 'style']
    });
    block.__flipMO = mo;

    if (!img.complete) {
      img.addEventListener('load', relayout, { once: true });
    }

    window.addEventListener('resize', relayout);
    return true;
  }

  function layoutImageBlock(block){
    const container = block.__flipHost || block.querySelector('.fluid-image-container');
    const imgEl = block.__flipImg || block.querySelector('img[data-sqsp-image-block-image]');
    const doors = block.__flipDoors || block.querySelector('.flip-doors');
    if (!container || !imgEl || !doors) return;

    const rect = container.getBoundingClientRect();
    const W = Math.max(1, rect.width);
    const H = Math.max(1, rect.height);

    let iw = imgEl.naturalWidth || 1;
    let ih = imgEl.naturalHeight || 1;

    const dims = imgEl.getAttribute('data-image-dimensions');
    if (dims && dims.includes('x')) {
      const parts = dims.split('x').map(parseFloat);
      const dw = parts[0];
      const dh = parts[1];
      if (dw > 0 && dh > 0) {
        iw = dw;
        ih = dh;
      }
    }

    let fx = 0.5;
    let fy = 0.5;
    const fp = imgEl.getAttribute('data-image-focal-point');
    if (fp && fp.includes(',')) {
      const parts = fp.split(',').map(parseFloat);
      const sx = parts[0];
      const sy = parts[1];
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

    function paint(el, dx){
      if (!el) return;
      el.style.backgroundImage = 'url("' + url + '")';
      el.style.backgroundSize = bgW + 'px ' + bgH + 'px';
      el.style.backgroundPosition = (posX - dx + bleed) + 'px ' + (posY + bleed) + 'px';
      el.style.backgroundRepeat = 'no-repeat';
      el.style.transform = 'translateZ(0)';
      el.style.backfaceVisibility = 'hidden';
      el.style.webkitBackfaceVisibility = 'hidden';
    }

    const lf = doors.querySelector('.flip-door.left .face.front');
    const lb = doors.querySelector('.flip-door.left .face.back');
    const rf = doors.querySelector('.flip-door.right .face.front');
    const rb = doors.querySelector('.flip-door.right .face.back');

    paint(lf, 0);
    paint(rf, (W / 2) - seam);

    if (lb) {
      lb.style.backgroundImage = 'none';
      lb.style.backgroundColor = 'transparent';
    }
    if (rb) {
      rb.style.backgroundImage = 'none';
      rb.style.backgroundColor = 'transparent';
    }
  }

  function initBlock(block){
    if (!block) return false;
    if (block.__flipBuilt) return true;

    if (isImageBlock(block)) return buildImageDoors(block);

    return false;
  }

  function initPair(pairConfig){
    const imageBlock = document.querySelector(pairConfig.image);
    const textBlock = document.querySelector(pairConfig.text);

    if (!imageBlock) return;
    if (imageBlock.__pairBound || (textBlock && textBlock.__pairBound)) return;

    const imageReady = initBlock(imageBlock);
    if (!imageReady) return;

    const pair = {
      blocks: [imageBlock],
      watchBlocks: [imageBlock, textBlock].filter(Boolean),
      open: false,
      pointerWatcher: null
    };

    function bindOpen(el){
      const hoverHost = closestFeBlock(el) || el;
      hoverHost.addEventListener('mouseenter', function(){
        openPair(pair);
      });
    }

    bindOpen(imageBlock);
    if (textBlock) bindOpen(textBlock);

    imageBlock.__pairBound = true;
    imageBlock.__pairRef = pair;
    if (textBlock) {
      textBlock.__pairBound = true;
      textBlock.__pairRef = pair;
    }

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if (!entry.isIntersecting) closePair(pair);
        });
      }, { threshold: 0.05 });

      io.observe(imageBlock);
      if (textBlock) io.observe(textBlock);
    }
  }

  function initAll(){
    FLIP_PAIRS.forEach(initPair);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  const moAll = new MutationObserver(initAll);
  moAll.observe(document.documentElement, { childList: true, subtree: true });
})();
