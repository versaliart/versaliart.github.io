/* Mystic Munson • mm-marquee init v1.3 (dynamic distance) */
(function(){
  // ===== Your images / alts =====
  const imgs = [
    "https://images.squarespace-cdn.com/content/68b0cf9aee4bdf7a0a0f8be4/4560e500-fb9f-4186-9887-8aa97ca42e81/Me01.jpg",
    "https://images.squarespace-cdn.com/content/68b0cf9aee4bdf7a0a0f8be4/e6681620-e044-4531-a05e-feaa026dffde/Me02.jpg",
    "https://images.squarespace-cdn.com/content/68b0cf9aee4bdf7a0a0f8be4/51070983-4641-4f44-806e-3b12e27e3583/Me03.jpg",
    "https://images.squarespace-cdn.com/content/68b0cf9aee4bdf7a0a0f8be4/0becf6ce-fc22-4f5c-a493-638a9813e8e0/Me04.jpg",
    "https://images.squarespace-cdn.com/content/68b0cf9aee4bdf7a0a0f8be4/db49bafa-8fbf-4f74-bda5-2f4f533b9abe/Me05.jpg"
  ];

  const alts = [
    "Me and my friend Celeste",
    "Me on an inflatable peacock with my dog",
    "Me with my dog and my friend's dog",
    "Me walking my cat in a backpack",
    "Me being playfully choked by a friend"
  ];

  // build one sequence of images
  function buildSequence(){
    const frag = document.createDocumentFragment();
    imgs.forEach((url, i)=>{
      const wrap = document.createElement('div');
      wrap.className = 'mm-marquee-item';

      const im = document.createElement('img');
      im.loading  = 'lazy';
      im.decoding = 'async';
      im.src      = url;
      im.alt      = alts[i] || '';

      wrap.appendChild(im);
      frag.appendChild(wrap);
    });
    return frag;
  }

  // create custom keyframes for THIS track based on pixel width
  function applyDynamicAnimation(track){
    // width of one sequence (the first batch of images)
    const halfWidth = track.scrollWidth / 2;

    // make a unique animation name so multiple marquees don't clash
    const animName = 'mmScroll_' + Math.random().toString(36).slice(2);

    // build a <style> tag just for this animation
    const styleTag = document.createElement('style');
    styleTag.textContent = `
      @keyframes ${animName} {
        0%   { transform: translateX(0); }
        100% { transform: translateX(-${halfWidth}px); }
      }
    `;
    document.head.appendChild(styleTag);

    // hook the track up to that animation name
    // (duration still comes from --scroll-speed on the .mm-marquee)
    track.style.animationName = animName;
    track.style.animationTimingFunction = 'linear';
    track.style.animationIterationCount = 'infinite';

    // We do NOT set animationDuration here, because you're already
    // controlling that with --scroll-speed in inline style.
  }

  function initMarquee(m){
    const track = m.querySelector('.mm-marquee-track');
    if (!track || track.__mmFilled) return;
    track.__mmFilled = true;

    // populate two copies
    track.appendChild(buildSequence());
    track.appendChild(buildSequence());

    // pause on hover (JS fallback)
    m.addEventListener('mouseenter', ()=>{
      track.style.animationPlayState = 'paused';
    });
    m.addEventListener('mouseleave', ()=>{
      track.style.animationPlayState = 'running';
    });

    // wait a frame so images lay out, then measure real width
    requestAnimationFrame(()=>{
      applyDynamicAnimation(track);
    });
  }

  function initAll(){
    document.querySelectorAll('.mm-marquee').forEach(initMarquee);
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }
})();