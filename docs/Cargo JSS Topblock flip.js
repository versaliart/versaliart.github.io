/* ===== Topblock Split-Flip (Doors) v2.52 — hover-stable ===== */
(function(){
  const isCoarse = () => matchMedia('(hover: none), (pointer: coarse)').matches;
  const isFine   = () => matchMedia('(hover: hover) and (pointer: fine)').matches;

  // rAF throttler
  const makeRaf = (fn)=>{ let s=false; return (...a)=>{ if(s) return; s=true; requestAnimationFrame(()=>{ s=false; fn(...a); }); }; };

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
    // IMPORTANT: the overlay never intercepts pointer on desktop
    doors.style.pointerEvents = 'auto'; // default; we’ll toggle when open
    return doors;
  }

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

  // Only toggle pass-through on the DOORS overlay (keeps :hover on block stable)
  function setDoorsPassThrough(block, on){
    const doors = block.querySelector('.flip-doors');
    if (!doors) return;
    doors.style.pointerEvents = on ? 'none' : 'auto';
  }

  function openBlock(block){
    if (block.__open) return;
    block.__open = true;
    block.classList.add('is-open');
    // On desktop, let clicks fall through the visual overlay but keep hover on the block
    if (isFine()) setDoorsPassThrough(block, true);
  }

  function closeBlock(block){
    if (!block.__open) return;
    block.__open = false;
    block.classList.remove('is-open');
    setDoorsPassThrough(block, false);
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

    // Prevent marker navigation only while open/flipped
    const marker = block.querySelector('a.sqs-block-image-link[href="#flip-top"]');
    if (marker){
      marker.addEventListener('click', (e) => {
        if (block.classList.contains('is-open') || block.classList.contains('is-flipped')) {
          e.preventDefault(); e.stopPropagation();
        }
      }, {capture:true});
    }

    // DESKTOP: stable hover using pointerenter/leave on the block (no doc handlers)
    if (isFine()){
      block.addEventListener('pointerenter', () => openBlock(block), {passive:true});
      block.addEventListener('pointerleave', () => closeBlock(block), {passive:true});
    }

    // MOBILE: tap to open persistent
    block.addEventListener('click', function(e){
      if (!isCoarse()) return;
      if (!block.classList.contains('is-flipped')){
        e.preventDefault(); e.stopPropagation();
        block.classList.add('is-flipped');
        // while flipped on mobile, also let taps go through the overlay
        setDoorsPassThrough(block, true);
      }
    }, {capture:true});

    // Relayout (rAF-batched)
    const relayout = makeRaf(()=> layout(block));
    relayout();

    const ro = new ResizeObserver(relayout);
    ro.observe(container);
    block.__ro = ro;

    const mo = new MutationObserver(relayout);
    mo.observe(img, { attributes: true, attributeFilter: ['src', 'srcset'] });
    block.__mo = mo;

    if (!img.complete) img.addEventListener('load', relayout, { once: true });

    // Close when off-screen
    if ('IntersectionObserver' in window){
      const io = new IntersectionObserver((entries)=>{
        entries.forEach((entry)=>{
          if (!entry.isIntersecting){
            closeBlock(block);
            block.classList.remove('is-flipped');
            setDoorsPassThrough(block, false);
          }
        });
      }, { threshold: 0.05 });
      io.observe(block);
      block.__io = io;
    }
  }

  // Global mobile blank-space closer (single listener)
  document.addEventListener('click', function(e){
    if (!isCoarse()) return;
    const actionable = e.target.closest && e.target.closest('a,button,[role="button"],[role="link"],input,textarea,select,summary');
    if (actionable) return;
    document.querySelectorAll('.sqs-block.image-block.flip-top.is-flipped').forEach(block=>{
      block.classList.remove('is-flipped');
      setDoorsPassThrough(block, false);
    });
  }, {capture:true, passive:true});

  function initAll(root=document){
    root.querySelectorAll('.sqs-block.image-block').forEach(block => {
      const link = block.querySelector('a.sqs-block-image-link[href="#flip-top"]');
      if (link) initOne(block);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initAll());
  } else {
    initAll();
  }

  // Narrow, batched watcher for newly-added image blocks
  let pendingInit = false;
  const batchedInit = () => {
    if (pendingInit) return; pendingInit = true;
    queueMicrotask(()=>{ pendingInit = false; initAll(); });
  };
  const moAll = new MutationObserver((mutList)=>{
    for (const m of mutList){
      if (m.type !== 'childList' || !m.addedNodes?.length) continue;
      for (const n of m.addedNodes){
        if (!(n instanceof Element)) continue;
        if (n.matches?.('.sqs-block.image-block') || n.querySelector?.('.sqs-block.image-block')){
          batchedInit(); return;
        }
      }
    }
  });
  moAll.observe(document.body || document.documentElement, { childList: true, subtree: true });
})();
