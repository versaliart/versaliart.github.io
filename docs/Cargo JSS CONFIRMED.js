<script>
/* Starfield v1.0 — Per-section build + Bottom overlay + Edge-biased placement
   - Stars ONLY in the section with:
       <div id="starfield-enable" style="display:none" aria-hidden="true"></div>
   - No drift (opacity twinkle only)
   - Sizes are quantized to CSS S/M/L via the golden ratio
   - Bottom-centered overlay image (above stars, below content)
   - NEW: Edge-biased placement (fewer in the center, more toward edges)
*/

(function () {
  // 1) Limit to the section that contains the marker
  const marker = document.getElementById('starfield-enable');
  if (!marker) return;
  const targetSection = marker.closest('section.page-section, section.sqs-section');
  if (!targetSection) return;

  document.body.classList.add('has-starfield');

  // ---------- helpers ----------
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

function getCssLenPx(name, fallbackPx){
  const root = document.documentElement;
  const remPx = parseFloat(getComputedStyle(root).fontSize) || 16;
  const raw = getComputedStyle(document.body).getPropertyValue(name).trim();
  if (!raw) return fallbackPx;
  const n = parseFloat(raw);
  if (!Number.isFinite(n)) return fallbackPx;
  if (raw.endsWith('rem')) return n * remPx;
  return n; // px by default (also fine for unitless)
}

  function getCssNum(name, fallback) {
    const from = (el) => {
      const v = getComputedStyle(el).getPropertyValue(name).trim();
      const n = parseFloat(v);
      return Number.isFinite(n) ? n : null;
    };
    return from(document.body) ?? from(document.documentElement) ?? fallback;
  }
  function getCssRem(name, fallbackRem) {
    const root = document.documentElement;
    const remPx = parseFloat(getComputedStyle(root).fontSize) || 16;
    const raw = getComputedStyle(document.body).getPropertyValue(name).trim();
    if (!raw) return fallbackRem;
    const n = parseFloat(raw);
    if (!Number.isFinite(n)) return fallbackRem;
    return raw.endsWith('px') ? (n / remPx) : n; // convert px→rem if needed
  }



  // U-shaped sampler in [0,1]: values more likely near 0 or 1 (edges), less near 0.5 (center).
  // power = 1 → ~uniform; power < 1 → stronger pull to edges.
  function uShape(power = 0.6) {
    const p = clamp(power, 0.05, 3); // keep sane
    const u = Math.random();                   // [0,1]
    const v = u < 0.5 ? 2 * u : 2 * (1 - u);   // fold at center → [0,1], 0=center, 1=edge
    const w = Math.pow(v, p);                  // bias
    return u < 0.5 ? 0.5 - 0.5 * w : 0.5 + 0.5 * w;  // unfold → [0,1], U-shaped
  }

  // ---------- read CSS variables each build ----------
function readVars() {
  return {
    totalCount: Math.max(0, Math.round(getCssNum('--star-count', 40))),
    durMin:     getCssNum('--twinkle-min', 2.5),
    durMax:     getCssNum('--twinkle-max', 6.5),
    opMin:      getCssNum('--opacity-min', 0.35),
    opMax:      getCssNum('--opacity-max', 0.95),
    blurMax:    getCssNum('--max-blur', 0.12),
    phi:        getCssNum('--phi', 1.618),
    sizeLrem:   getCssRem('--size-large', 1.5),
    gapPx:      getCssLenPx('--star-min-gap', 0),
    /* NEW: radial bias strength (k). 1 = uniform disk; higher = more edge-weighted */
    radialK:    getCssNum('--radial-bias-k', 2.5)
  };
}


  // ---------- star factory (no drift; sizes S/M/L from CSS) ----------
  function createStar(vars) {
    const { durMin, durMax, opMin, opMax, blurMax, phi, sizeLrem } = vars;

    const el = document.createElement('span');
    el.className = 'star';

    const sizeMrem = sizeLrem / (phi || 1.618);
    const sizeSrem = sizeMrem / (phi || 1.618);

    // Pick exactly one of S / M / L (equal weights; adjust as desired)
    const r = Math.random();
    const sizeRem = r < 1/3 ? sizeSrem : (r < 2/3 ? sizeMrem : sizeLrem);

    const scale   = 1; // preserve quantized sizes
    const opacity = Math.random() * (opMax - opMin) + opMin;

    // Twinkle timing (opacity only), start mid-cycle (negative delay)
    const twinkleDur   = Math.random() * (durMax - durMin) + durMin;
    const twinkleDelay = -Math.random() * twinkleDur;

    // Subtle glow
    const remPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const blur = Math.random() * blurMax * remPx;

    // Cache for safe placement
    const sizePx = sizeRem * remPx;
    el.dataset.sizePx = sizePx.toFixed(2);
    el.dataset.dx = '0';
    el.dataset.dy = '0';

    // Per-star CSS vars
    el.style.setProperty('--size', `${sizeRem}rem`);
    el.style.setProperty('--scale', scale.toFixed(3));
    el.style.setProperty('--o', opacity.toFixed(2));
    el.style.setProperty('--twinkle', `${twinkleDur.toFixed(2)}s`);
    el.style.setProperty('--tw-delay', `${twinkleDelay.toFixed(2)}s`);
    el.style.setProperty('--dx', `0px`);
    el.style.setProperty('--dy', `0px`);
    el.style.setProperty('--blur', `${blur.toFixed(2)}px`);

    return el;
  }

  // ---------- ensureContainer: stars + bottom overlay in THIS section ----------
  function ensureContainer(section) {
    // Stars (above background, below content)
    let container = section.querySelector(':scope > .star-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'star-container';
      const content = section.querySelector(':scope > .content-wrapper');
      if (content) section.insertBefore(container, content);
      else section.appendChild(container);
    }


    return container;
  }

  // ---------- placement (edge-biased; stays within safe margins) ----------
// sample r in [0..1] with pdf ∝ r^k  (k=1 gives uniform disk; higher = more edge bias)
function sampleRadius(k){
  const kk = Math.max(0, k || 1);       // guard
  const u  = Math.random();              // [0,1]
  return Math.pow(u, 1 / (kk + 1));      // r = u^(1/(k+1))
}

// sample r in [0..1] with pdf ∝ r^k (k=1 uniform disk; higher = more edge bias)
function sampleRadius(k){
  const kk = Math.max(0, k || 1);
  const u  = Math.random();
  return Math.pow(u, 1 / (kk + 1));
}

function positionStarsInSection(section, container, vars) {
  const vw = section.clientWidth  || 0;
  const vh = section.clientHeight || 0;
  if (!vw || !vh) return;

  // Pre-extract star nodes and their radii
  const stars = Array.from(container.querySelectorAll('.star')).map(el => ({
    el,
    r: (parseFloat(el.dataset.sizePx) || 0) / 2 // radius in px
  }));

  // Safe margins so the full shape remains inside
  // (We’ll still clamp final positions, but this reduces retries.)
  const maxR = stars.reduce((m, s) => Math.max(m, s.r), 0);
  let marginX = vw ? ((maxR) / vw * 100) : 2;
  let marginY = vh ? ((maxR) / vh * 100) : 2;
  marginX = Math.min(45, Math.max(0, marginX));
  marginY = Math.min(45, Math.max(0, marginY));

  const minX = marginX / 100, maxX = 1 - marginX / 100;
  const minY = marginY / 100, maxY = 1 - marginY / 100;

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const ax = (maxX - minX) / 2; // ellipse axes for radial bias
  const ay = (maxY - minY) / 2;

  const placed = []; // {xPx,yPx,r}

  stars.forEach((s) => {
    const attemptsMax = 30; // cost ceiling; raise if you increase density a lot
    let xPx=0, yPx=0, ok=false;

    for (let attempt=0; attempt<attemptsMax && !ok; attempt++){
      const theta = Math.random() * Math.PI * 2;
      const rN    = sampleRadius(vars.radialK);

      // Candidate in normalized [0..1]
      let xN = cx + ax * rN * Math.cos(theta);
      let yN = cy + ay * rN * Math.sin(theta);

      // Clamp to box
      xN = Math.min(maxX, Math.max(minX, xN));
      yN = Math.min(maxY, Math.max(minY, yN));

      xPx = xN * vw;
      yPx = yN * vh;

      // Check distance to previous stars (radius + radius + gap)
      ok = true;
      for (let i=0;i<placed.length;i++){
        const p = placed[i];
        const dx = xPx - p.xPx;
        const dy = yPx - p.yPx;
        const minD = p.r + s.r + (vars.gapPx || 0);
        if ((dx*dx + dy*dy) < (minD*minD)) { ok = false; break; }
      }
    }

    // Accept last candidate even if not ok to avoid infinite loops at extreme densities
    placed.push({ xPx, yPx, r: s.r });

    // Apply as percentages back to CSS vars
    s.el.style.setProperty('--x', `${(xPx / vw * 100).toFixed(4)}%`);
    s.el.style.setProperty('--y', `${(yPx / vh * 100).toFixed(4)}%`);
  });
}



  // ---------- build ----------
  function buildAll() {
    const vars = readVars();

    // Clear old stars ONLY in this section
    targetSection.querySelectorAll(':scope > .star-container').forEach(n => n.remove());

    if (vars.totalCount === 0 || targetSection.classList.contains('stars-off')) {
      document.body.setAttribute('data-stars', '0');
      return;
    }

    const container = ensureContainer(targetSection);
    container.innerHTML = '';
    const frag = document.createDocumentFragment();
    for (let i = 0; i < vars.totalCount; i++) frag.appendChild(createStar(vars));
    container.appendChild(frag);
    positionStarsInSection(targetSection, container, vars);

    document.body.setAttribute('data-stars', String(vars.totalCount));
  }

  // Initial build after one paint so CSS is applied
  requestAnimationFrame(buildAll);

  // Rebuild when --star-count changes (even with CSS panel open)
  (function () {
    if (document.querySelector('.star-var-sentinel')) return;
    const s = document.createElement('div');
    s.className = 'star-var-sentinel';
    s.setAttribute('aria-hidden', 'true');
    s.style.cssText =
      'position:absolute;left:-9999px;top:-9999px;height:0;overflow:hidden;pointer-events:none;opacity:0;width:calc(var(--star-count) * 1px);';
    document.body.appendChild(s);
    new ResizeObserver(buildAll).observe(s);
  })();

  // Rebuild on resize / load
  let t;
  window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(buildAll, 150); });
  window.addEventListener('load',   () => setTimeout(buildAll, 50));
})();
</script>
<script>
/* Topblock Flip v1.0 — Integrated JS (directional easing, no un-hover lag)
   - Opt-in via Image Block Clickthrough URL "#flip-top"
   - Desktop: hover flips (ease-in), un-hover flips back (ease-out), immediate
   - Mobile: tap flips; outside click/tap (not a link/control) flips back
   - While flipped, clicks are forwarded to elements underneath
   - No DOM reparenting of SS internals; resets on viewport exit; SPA-safe
*/
(function(){
  var COARSE = '(hover: none), (pointer: coarse)';
  var FINE   = '(hover: hover) and (pointer: fine)';
  var LINKISH = 'a, [role="link"], button, [role="button"], input, textarea, select, summary, [contenteditable="true"]';

  function isCoarse(){ return window.matchMedia(COARSE).matches; }
  function isFine(){ return window.matchMedia(FINE).matches; }

  function closestSection(el){
    while (el && el !== document.body){
      if (el.matches('.page-section, [data-section-id], section')) return el;
      el = el.parentElement;
    }
    return null;
  }

  function markSection(section){
    if (!section || section.__flipBound) return;
    section.__flipBound = true;
    section.classList.add('flip-section');
  }

  // Choose a stable internal element to rotate (no layout collapse)
  function pickFlipTarget(block){
    return block.querySelector('figure.image-block-figure')
        || block.querySelector('.image-block-outer-wrapper')
        || block.querySelector('.intrinsic')
        || block.querySelector('.image-block-wrapper')
        || block.querySelector('img')
        || block;
  }

  // Two-RAF to ensure style (ease) is applied before we toggle transform
  function nextFrame(fn){ requestAnimationFrame(function(){ requestAnimationFrame(fn); }); }

  function setEase(block, mode){
    if (mode === 'enter'){ block.classList.remove('ease-exit'); }
    else if (mode === 'exit'){ block.classList.add('ease-exit'); }
  }

  // Forward pointer/mouse events to whatever is under a flipped block
  function forwardEvent(e, block){
    if (!block.classList.contains('is-flipped')) return;
    var prev = block.style.pointerEvents;
    block.style.pointerEvents = 'none';
    var target = document.elementFromPoint(e.clientX, e.clientY);
    block.style.pointerEvents = prev;
    if (!target || target === block) return;

    var evt = new e.constructor(e.type, {
      bubbles: true, cancelable: true, view: window,
      clientX: e.clientX, clientY: e.clientY, screenX: e.screenX, screenY: e.screenY,
      ctrlKey: e.ctrlKey, shiftKey: e.shiftKey, altKey: e.altKey, metaKey: e.metaKey,
      button: e.button, buttons: e.buttons
    });
    target.dispatchEvent(evt);
    e.preventDefault(); e.stopPropagation();
  }

  function setupFlipBlock(block){
    if (block.__flipReady) return;
    var marker = block.querySelector('a[href="#flip-top"]');
    if (!marker) return; // opt-in only

    block.__flipReady = true;
    block.classList.add('flip-top');

    var target = pickFlipTarget(block);
    target.classList.add('flip-target');

    var section = closestSection(block);
    markSection(section);

    // Prevent marker navigation (used only as a trigger)
    marker.addEventListener('click', function(e){
      if (!block.classList.contains('is-flipped')){ e.preventDefault(); e.stopPropagation(); }
    }, true);

    // DESKTOP: hover-in → ENTER curve, then flip; leave → EXIT curve, then unflip
    block.addEventListener('mouseenter', function(){
      if (!isFine()) return;
      setEase(block, 'enter');
      nextFrame(function(){ block.classList.add('is-flipped'); });
    });

    block.addEventListener('mouseleave', function(){
      if (!isFine()) return;
      setEase(block, 'exit');
      nextFrame(function(){ block.classList.remove('is-flipped'); });
    });

    // MOBILE: tap to flip (enter); outside click resets (exit)
    block.addEventListener('click', function(e){
      if (!isCoarse()) return;
      if (!block.classList.contains('is-flipped')){
        e.preventDefault(); e.stopPropagation();
        setEase(block, 'enter');
        nextFrame(function(){ block.classList.add('is-flipped'); });
      }
    }, true);

    // While flipped, forward click-ish events to underlying elements
    ['pointerdown','pointerup','mousedown','mouseup','click'].forEach(function(type){
      block.addEventListener(type, function(e){ forwardEvent(e, block); }, true);
    });

    // Clean up the ease-exit flag after the transition completes
    target.addEventListener('transitionend', function(ev){
      if (ev.propertyName === 'transform'){ block.classList.remove('ease-exit'); }
    });

    // Reset when leaving viewport (use exit curve for consistency)
    if ('IntersectionObserver' in window){
      var io = new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if (!entry.isIntersecting && block.classList.contains('is-flipped')){
            setEase(block, 'exit');
            nextFrame(function(){ block.classList.remove('is-flipped'); });
          }
        });
      }, { threshold: 0.05 });
      io.observe(block);
    }
  }

  function scan(root){
    (root || document).querySelectorAll('.sqs-block.image-block').forEach(function(block){
      if (block.querySelector('a[href="#flip-top"]')) setupFlipBlock(block);
    });
  }

  // Initial scan
  if (document.readyState !== 'loading') scan(document);
  else document.addEventListener('DOMContentLoaded', function(){ scan(document); });

  // Outside click/tap (not on a link/control) → EXIT curve then unflip all
  document.addEventListener('click', function(e){
    if (e.target.closest('.flip-top')) return;
    if (e.target.closest(LINKISH)) return;
    document.querySelectorAll('.flip-top.is-flipped').forEach(function(b){
      setEase(b, 'exit');
      nextFrame(function(){ b.classList.remove('is-flipped'); });
    });
  }, true);

  // SPA / lazy-load safety
  new MutationObserver(function(muts){
    muts.forEach(function(m){
      m.addedNodes.forEach(function(n){
        if (!(n instanceof Element)) return;
        if (n.matches && n.matches('.sqs-block.image-block')){
          if (n.querySelector('a[href="#flip-top"]')) setupFlipBlock(n);
        } else {
          scan(n);
        }
      });
    });
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
</script>
