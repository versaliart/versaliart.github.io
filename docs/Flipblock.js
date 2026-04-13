/* ===== Topblock Split-Flip v3.10 — paired image + real text block support ===== */
(function(){
  const OPEN_DURATION = 480; /* match CSS --flip-open-duration */

  const FLIP_PAIRS = [
    {
      image: '#block-yui_3_17_2_1_1756837579989_139784',
      text:  '#block-268c84cc2c21ba0a6914'
    }
    /* Add more pairs here:
    ,{
      image: '#block-image-2',
      text:  '#block-text-2'
    }
    */
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
    if (on) {
      block.classList.add('pe-through');
    } else {
      block.classList.remove('pe-through');
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
    const rects = pair.blocks
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

  function isTextBlock(block){
    return !!block.querySelector('.sqs-html-content[data-sqsp-text-block-content], .sqs-html-content');
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

  function buildTextDoors(block){
    if (block.__flipBuilt) return true;

    const content = block.querySelector('.sqs-html-content[data-sqsp-text-block-content], .sqs-html-content');
    const blockContent = block.querySelector('.sqs-block-content');
    if (!content || !blockContent) return false;

    block.classList.add('flip-top', 'flip-text');
    blockContent.style.position = 'relative';

    const doors = buildDoors();
    blockContent.appendChild(doors);

    const lf = doors.querySelector('.flip-door.left .face.front');
    const lb = doors.querySelector('.flip-door.left .face.back');
    const rf = doors.querySelector('.flip-door.right .face.front');
    const rb = doors.querySelector('.flip-door.right .face.back');

    function makeInner(side){
      const inner = document.createElement('div');
      inner.className = 'face-inner face-inner-' + side;
      inner.setAttribute('aria-hidden', 'true');

      const clone = content.cloneNode(true);
      clone.removeAttribute('data-sqsp-text-block-content');

      clone.querySelectorAll('style, script').forEach(function(node){
        node.remove();
      });

      inner.appendChild(clone);
      return inner;
    }

    if (lf) {
      lf.innerHTML = '';
      lf.appendChild(makeInner('left'));
    }
    if (rf) {
      rf.innerHTML = '';
      rf.appendChild(makeInner('right'));
    }
    if (lb) {
      lb.innerHTML = '';
      lb.style.background = 'transparent';
    }
    if (rb) {
      rb.innerHTML = '';
      rb.style.background = 'transparent';
    }

    block.__flipType = 'text';
    block.__flipHost = blockContent;
    block.__flipTextSource = content;
    block.__flipDoors = doors;
    block.__flipBuilt = true;

    const relayout = function(){ layoutTextBlock(block); };
    block.__relayout = relayout;

    relayout();

    const ro = new ResizeObserver(relayout);
    ro.observe(blockContent);
    ro.observe(content);
    block.__flipRO = ro;

    const mo = new MutationObserver(function(){
      rebuildTextDoors(block);
      layoutTextBlock(block);
    });
    mo.observe(content, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true
    });
    block.__flipMO = mo;

    window.addEventListener('resize', relayout);
    return true;
  }

  function rebuildTextDoors(block){
    const doors = block.__flipDoors;
    const content = block.__flipTextSource || block.querySelector('.sqs-html-content[data-sqsp-text-block-content], .sqs-html-content');
    if (!doors || !content) return;

    const lf = doors.querySelector('.flip-door.left .face.front');
    const rf = doors.querySelector('.flip-door.right .face.front');

    function replaceInner(face, side){
      if (!face) return;
      face.innerHTML = '';

      const inner = document.createElement('div');
      inner.className = 'face-inner face-inner-' + side;
      inner.setAttribute('aria-hidden', 'true');

      const clone = content.cloneNode(true);
      clone.removeAttribute('data-sqsp-text-block-content');

      clone.querySelectorAll('style, script').forEach(function(node){
        node.remove();
      });

      inner.appendChild(clone);
      face.appendChild(inner);
    }

    replaceInner(lf, 'left');
    replaceInner(rf, 'right');
  }

  function layoutTextBlock(block){
    const host = block.__flipHost || block.querySelector('.sqs-block-content');
    const source = block.__flipTextSource || block.querySelector('.sqs-html-content[data-sqsp-text-block-content], .sqs-html-content');
    const doors = block.__flipDoors || block.querySelector('.flip-doors');
    if (!host || !source || !doors) return;

    const rect = host.getBoundingClientRect();
    const W = Math.max(1, rect.width);
    const H = Math.max(1, rect.height);

    doors.style.width = W + 'px';
    doors.style.height = H + 'px';

    const inners = doors.querySelectorAll('.face-inner');
    inners.forEach(function(inner){
      inner.style.position = 'absolute';
      inner.style.top = '0';
      inner.style.left = '0';
      inner.style.width = (W * 2) + 'px';
      inner.style.height = H + 'px';
      inner.style.pointerEvents = 'none';
      inner.style.transform = inner.classList.contains('face-inner-right')
        ? 'translateX(-50%)'
        : 'translateX(0)';
    });
  }

  function initBlock(block){
    if (!block) return false;
    if (block.__flipBuilt) return true;

    if (isImageBlock(block)) return buildImageDoors(block);
    if (isTextBlock(block)) return buildTextDoors(block);

    return false;
  }

  function initPair(pairConfig){
    const imageBlock = document.querySelector(pairConfig.image);
    const textBlock = document.querySelector(pairConfig.text);

    if (!imageBlock || !textBlock) return;
    if (imageBlock.__pairBound || textBlock.__pairBound) return;

    const imageReady = initBlock(imageBlock);
    const textReady = initBlock(textBlock);
    if (!imageReady || !textReady) return;

    const pair = {
      blocks: [imageBlock, textBlock],
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
    bindOpen(textBlock);

    imageBlock.__pairBound = true;
    textBlock.__pairBound = true;
    imageBlock.__pairRef = pair;
    textBlock.__pairRef = pair;

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if (!entry.isIntersecting) closePair(pair);
        });
      }, { threshold: 0.05 });

      io.observe(imageBlock);
      io.observe(textBlock);
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