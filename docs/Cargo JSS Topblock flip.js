/* ===== Topblock Split-Flip (Doors) v2.42===== */
(function(){
  // ... keep your existing builders/init; only this function changes:
  function layout(block){
    const container = block.querySelector('.fluid-image-container');
    const imgEl     = block.querySelector('img[data-sqsp-image-block-image]');
    const doors     = block.querySelector('.flip-doors');
    if (!container || !imgEl || !doors) return;

    // container size
    const rect = container.getBoundingClientRect();
    const W = Math.max(1, rect.width);
    const H = Math.max(1, rect.height);

    // natural image size (Squarespace also puts data-image-dimensions="WxH")
    let iw = imgEl.naturalWidth  || 1;
    let ih = imgEl.naturalHeight || 1;
    const dims = imgEl.getAttribute('data-image-dimensions');
    if (dims && dims.includes('x')) {
      const [dw, dh] = dims.split('x').map(Number);
      if (dw && dh) { iw = dw; ih = dh; }
    }

    // focal point (0..1)
    let fx = 0.5, fy = 0.5;
    const fp = imgEl.getAttribute('data-image-focal-point');
    if (fp && fp.includes(',')) {
      const [sx, sy] = fp.split(',').map(Number);
      if (!isNaN(sx)) fx = sx;
      if (!isNaN(sy)) fy = sy;
    }

    // object-fit: cover math
    const scale = Math.max(W / iw, H / ih);
    const bgW = Math.round(iw * scale);
    const bgH = Math.round(ih * scale);
    const posX = Math.round((W * fx) - (bgW * fx));
    const posY = Math.round((H * fy) - (bgH * fy));

    // constant overlap (no hover-based change)
    const seam = parseFloat(getComputedStyle(doors).getPropertyValue('--flip-seam')) || 0;

    // faces
    const leftFront  = doors.querySelector('.flip-door.left  .face.front');
    const leftBack   = doors.querySelector('.flip-door.left  .face.back');
    const rightFront = doors.querySelector('.flip-door.right .face.front');
    const rightBack  = doors.querySelector('.flip-door.right .face.back');

    const url = imgEl.currentSrc || imgEl.src;

    const paint = (el, dx) => {
      if (!el) return;
      el.style.backgroundImage    = `url("${url}")`;
      el.style.backgroundSize     = `${bgW}px ${bgH}px`;
      el.style.backgroundPosition = `${posX - dx}px ${posY}px`;
      el.style.backgroundRepeat   = 'no-repeat';
    };

    // left uses container origin; right is centered minus overlap
    paint(leftFront, 0);
    paint(leftBack,  0);
    paint(rightFront, (W / 2) - seam);
    paint(rightBack,  (W / 2) - seam);
  }

  // expose for your existing init to call if needed
  window.__TopFlipLayout = layout;
})();
