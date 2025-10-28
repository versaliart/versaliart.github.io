/* Mystic Munson • mm-marquee init v1.2 */
(function(){
  // your image/alt config (global for now)
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

  function buildSequence(){
    const frag = document.createDocumentFragment();
    imgs.forEach((url, i)=>{
      const wrap = document.createElement('div');
      wrap.className = 'mm-marquee-item';

      const im = document.createElement('img');
      im.loading = 'lazy';
      im.decoding = 'async';
      im.src = url;
      im.alt = alts[i] || '';

      wrap.appendChild(im);
      frag.appendChild(wrap);
    });
    return frag;
  }

  function initMarquee(m){
    const track = m.querySelector('.mm-marquee-track');
    if (!track) return;

    // only populate once, avoid duplicates if Squarespace re-runs scripts in editor
    if (track.__mmFilled) return;
    track.__mmFilled = true;

    // append two copies for seamless loop
    track.appendChild(buildSequence());
    track.appendChild(buildSequence());

    // JS hover pause fallback
    m.addEventListener('mouseenter', ()=>{
      track.style.animationPlayState = 'paused';
    });
    m.addEventListener('mouseleave', ()=>{
      track.style.animationPlayState = 'running';
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