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

  let preloadedImageUrls = null;
  let preloadPromise = null;

  const wait = (ms, signal) => new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const id = setTimeout(resolve, ms);
    if (!signal) return;
    const onAbort = () => {
      clearTimeout(id);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    signal.addEventListener('abort', onAbort, { once: true });
  });

  function readMs(el, varName, fallback){
    const raw = getComputedStyle(el).getPropertyValue(varName).trim();
    if (!raw) return fallback;
    if (raw.endsWith('ms')) return parseFloat(raw) || fallback;
    if (raw.endsWith('s')) return (parseFloat(raw) || 0) * 1000;
    const n = parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  }

  async function preloadImages(){
    if (preloadedImageUrls) return preloadedImageUrls;
    if (preloadPromise) return preloadPromise;

    preloadPromise = Promise.all(imgs.map(async (src) => {
      const response = await fetch(src, { cache: 'force-cache' });
      if (!response.ok) {
        throw new Error(`Failed to preload image: ${src}`);
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const decodedImage = new Image();
      decodedImage.src = objectUrl;
      await decodedImage.decode();
      return objectUrl;
    })).then((urls) => {
      preloadedImageUrls = urls;
      return urls;
    });

    return preloadPromise;
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

  function setContainerVisibility(container){
    const updateVisibility = () => {
      container.__mmDocVisible = document.visibilityState === 'visible';
    };

    updateVisibility();
    const onVisibilityChange = () => updateVisibility();
    document.addEventListener('visibilitychange', onVisibilityChange);

    let observer = null;
    if ('IntersectionObserver' in window){
      observer = new IntersectionObserver((entries) => {
        const entry = entries[0];
        container.__mmInView = !!entry?.isIntersecting;
      }, { threshold: 0.05 });
      observer.observe(container);
    } else {
      container.__mmInView = true;
    }

    container.__mmInView = container.__mmInView ?? true;
    container.__mmDocVisible = container.__mmDocVisible ?? true;

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      observer?.disconnect();
    };
  }

  async function waitForRenderableState(container, signal){
    while (!signal.aborted){
      if (!container.isConnected || container.__mmStopped) {
        throw new DOMException('Aborted', 'AbortError');
      }
      if (container.__mmDocVisible && container.__mmInView) return;
      await wait(150, signal);
    }
    throw new DOMException('Aborted', 'AbortError');
  }

  async function runLoop(container, localImgs){
    if (container.__mmRunning || localImgs.length === 0) return;

    container.__mmRunning = true;
    container.__mmStopped = false;

    const stage = container.querySelector('.mm-card-stage');
    const card = container.querySelector('.mm-reveal-card');
    const image = container.querySelector('.mm-face-image');
    if (!stage || !card || !image) return;

    const controller = new AbortController();
    const stopVisibility = setContainerVisibility(container);

    container.__mmStop = () => {
      if (container.__mmStopped) return;
      container.__mmStopped = true;
      controller.abort();
      stopVisibility();
    };

    const flipMs = readMs(stage, '--flip-duration', 900);
    const closedDelayMs = readMs(stage, '--delay-closed', 1000);
    const openDelayMs = readMs(stage, '--delay-open', 900);

    let index = 0;
    image.src = localImgs[index];
    image.alt = alts[index] || '';

    try {
      while (!controller.signal.aborted){
        await waitForRenderableState(container, controller.signal);
        await wait(closedDelayMs, controller.signal);

        await waitForRenderableState(container, controller.signal);
        card.classList.add('is-open');
        await wait(flipMs + openDelayMs, controller.signal);

        await waitForRenderableState(container, controller.signal);
        card.classList.remove('is-open');
        await wait(flipMs, controller.signal);

        index = (index + 1) % localImgs.length;
        image.src = localImgs[index];
        image.alt = alts[index] || '';
      }
    } catch (err) {
      if (err?.name !== 'AbortError') {
        console.error('mm-card-pile loop error', err);
      }
    } finally {
      container.__mmRunning = false;
      container.__mmStopped = true;
      stopVisibility();
      if (container.__mmStop) {
        delete container.__mmStop;
      }
    }
  }

  async function initPile(m, localImgs){
    if (m.__mmReady) return;
    m.__mmReady = true;
    buildPile(m);
    await runLoop(m, localImgs);
  }

  async function initAll(){
    const localImgs = await preloadImages();
    document.querySelectorAll('.mm-marquee').forEach((container) => {
      if (container.__mmStop) container.__mmStop();
      initPile(container, localImgs);
    });
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }
})();
