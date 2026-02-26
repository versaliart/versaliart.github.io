/* Mystic Munson • mm-card-pile loop v2.0 */
(function(){
  const imgs = [
    "https://images.squarespace-cdn.com/content/68b0cf9aee4bdf7a0a0f8be4/e6681620-e044-4531-a05e-feaa026dffde/Me02.jpg",
    "https://images.squarespace-cdn.com/content/68b0cf9aee4bdf7a0a0f8be4/51070983-4641-4f44-806e-3b12e27e3583/Me03.jpg",
    "https://images.squarespace-cdn.com/content/68b0cf9aee4bdf7a0a0f8be4/4560e500-fb9f-4186-9887-8aa97ca42e81/Me01.jpg",
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

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function readMs(el, varName, fallback){
    const raw = getComputedStyle(el).getPropertyValue(varName).trim();
    if (!raw) return fallback;
    if (raw.endsWith('ms')) return parseFloat(raw) || fallback;
    if (raw.endsWith('s')) return (parseFloat(raw) || 0) * 1000;
    const n = parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  }

  function preloadImages(){
    imgs.forEach((src) => {
      const im = new Image();
      im.src = src;
    });
  }

  function buildPile(container){
    container.innerHTML = `
      <div class="mm-card-stage" aria-live="polite">
        <div class="mm-stack-card mm-stack-card--back-1" aria-hidden="true"></div>
        <div class="mm-stack-card mm-stack-card--back-2" aria-hidden="true"></div>
        <div class="mm-reveal-card">
          <div class="mm-reveal-flipper">
            <div class="mm-face mm-face--back" aria-hidden="true"></div>
            <div class="mm-face mm-face--front">
              <img class="mm-face-image" loading="eager" decoding="async" alt="" />
            </div>
          </div>
        </div>
      </div>
    `;
  }

  async function runLoop(container){
    if (container.__mmRunning || imgs.length === 0) return;
    container.__mmRunning = true;

    const stage = container.querySelector('.mm-card-stage');
    const card = container.querySelector('.mm-reveal-card');
    const image = container.querySelector('.mm-face-image');
    if (!stage || !card || !image) return;

    const flipMs = readMs(stage, '--flip-duration', 900);
    const closedDelayMs = readMs(stage, '--delay-closed', 1000);
    const openDelayMs = readMs(stage, '--delay-open', 900);

    let index = 0;
    image.src = imgs[index];
    image.alt = alts[index] || '';

    while (true){
      await wait(closedDelayMs);

      card.classList.add('is-open');
      await wait(flipMs + openDelayMs);

      card.classList.remove('is-open');
      await wait(flipMs);

      index = (index + 1) % imgs.length;
      image.src = imgs[index];
      image.alt = alts[index] || '';
    }
  }

  function initPile(m){
    if (m.__mmReady) return;
    m.__mmReady = true;
    buildPile(m);
    runLoop(m);
  }

  function initAll(){
    preloadImages();
    document.querySelectorAll('.mm-marquee').forEach(initPile);
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }
})();
