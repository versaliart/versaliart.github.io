(function(){
  const imgs = [
    "https://images.squarespace-cdn.com/content/68b0cf9aee4bdf7a0a0f8be4/4560e500-fb9f-4186-9887-8aa97ca42e81/Me01.jpg",
    "https://images.squarespace-cdn.com/content/68b0cf9aee4bdf7a0a0f8be4/e6681620-e044-4531-a05e-feaa026dffde/Me02.jpg",
    "https://images.squarespace-cdn.com/content/68b0cf9aee4bdf7a0a0f8be4/51070983-4641-4f44-806e-3b12e27e3583/Me03.jpg",
    "https://images.squarespace-cdn.com/content/68b0cf9aee4bdf7a0a0f8be4/0becf6ce-fc22-4f5c-a493-638a9813e8e0/Me04.jpg",
    "https://images.squarespace-cdn.com/content/68b0cf9aee4bdf7a0a0f8be4/db49bafa-8fbf-4f74-bda5-2f4f533b9abe/Me05.jpg"
  ];

  // OPTIONAL: If you want per-image alt text, same length as imgs.
  // Otherwise it'll fallback to empty string.
  const alts = [
    "Me and my friend Celeste",
    "Me on an inflatable peacock with my dog",
    "Me with my dog and my friend's dog",
    "Me walking my cat in a backpack",
    "Me being playfully choked by a friend"
  ];

  // ============================
  // DO NOT EDIT BELOW THIS LINE
  // ============================

  // Grab the closest .mm-marquee in THIS code block only
  // (lets you reuse multiple times on a page)
  const blockRoot = document.currentScript.closest('.mm-marquee');
  const track = blockRoot.querySelector('.mm-marquee-track');

  // Build one sequence of <div class="mm-marquee-item"><img></div>
  function buildSequence(){
    const frag = document.createDocumentFragment();
    imgs.forEach((url, i)=>{
      const wrap = document.createElement('div');
      wrap.className = 'mm-marquee-item';

      const im = document.createElement('img');
      im.loading = "lazy";
      im.decoding = "async";
      im.src = url;
      im.alt = (alts[i] || "");

      wrap.appendChild(im);
      frag.appendChild(wrap);
    });
    return frag;
  }

  // We append the sequence twice.
  // Why twice? When we slide left by 50%, the second half lines up
  // perfectly after the first half, creating an endless loop.
  track.appendChild(buildSequence());
  track.appendChild(buildSequence());

  // === Dynamic duration tuning (optional upgrade logic) ==========
  // The animation moves -50% of the track's width.
  // If you change number/size of images, 40s may feel too fast/slow.
  // We can auto-scale speed based on total pixel width if you prefer.
  // Leave commented unless you want auto.
  
  /*
  requestAnimationFrame(()=>{
    const totalWidth = track.scrollWidth / 2; // width of one sequence
    // pixels per second target (lower = slower)
    const pxPerSec = 40;
    const newDur = (totalWidth / pxPerSec) + 's';
    track.style.animationDuration = newDur;
  });
  */

  // Pause on hover using JS fallback for older browsers (optional)
  blockRoot.addEventListener('mouseenter', ()=>{
    track.style.animationPlayState = 'paused';
  });
  blockRoot.addEventListener('mouseleave', ()=>{
    track.style.animationPlayState = 'running';
  });

})();