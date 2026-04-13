/* ===== Card Deck Piles — v1.5 ===== */

(() => {
  const $  = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  function onReady(fn){
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      queueMicrotask(fn);
    } else {
      document.addEventListener('DOMContentLoaded', fn, {once:true});
    }
  }
  function waitFor(sel, timeoutMs=6000){
    return new Promise((resolve, reject) => {
      const hit = $(sel);
      if (hit) return resolve(hit);
      const mo = new MutationObserver(() => {
        const el = $(sel);
        if (el){ mo.disconnect(); resolve(el); }
      });
      mo.observe(document.documentElement, {childList:true, subtree:true});
      setTimeout(() => { mo.disconnect(); reject(new Error('timeout')); }, timeoutMs);
    });
  }

  function init(table){
    const drawPile    = $('#drawPile', table);
    const discardPile = $('#discardPile', table);
    const seedRoot    = $('.cards-seed');
    let discardZ = 0;
    if (!drawPile || !discardPile || !seedRoot) return;

const backAssets = (() => {
  try {
    const raw = seedRoot.getAttribute('data-back-assets');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
})();

const makeCard = (seedNode, idx) => {
  const backKey = seedNode.getAttribute('data-back-key') || '';
  const backURL  = seedNode.getAttribute('data-back') || backAssets[backKey] || '';
  const textHTML = $('.front-content', seedNode)?.innerHTML || '';

  const card = document.createElement('div');
  card.className = 'cdp-card';
  card.dataset.index = String(idx);
  card.dataset.backUrl = backURL;
  card.dataset.backApplied = '0';

  const shuttle = document.createElement('div');
  shuttle.className = 'cdp-shuttle';
  const initTilt = ((idx * 37) % 9) - 4;  // -4..+4
  card.dataset.tilt = String(initTilt);
  shuttle.style.transform = `rotate(${initTilt}deg)`;

  const flipper = document.createElement('div');
  flipper.className = 'cdp-flipper';

  const back = document.createElement('div');
  back.className = 'cdp-face cdp-back';

  const front = document.createElement('div');
  front.className = 'cdp-face cdp-front';
  const frontBox = document.createElement('div');
  frontBox.className = 'front-content';
  frontBox.innerHTML = textHTML;
  front.appendChild(frontBox);

  flipper.appendChild(back);
  flipper.appendChild(front);
  shuttle.appendChild(flipper);
  card.appendChild(shuttle);
  return card;
};

const ensureBackImage = (card) => {
  if (!card || card.dataset.backApplied === '1') return;
  const backURL = card.dataset.backUrl || '';
  if (!backURL) return;
  const backFace = card.querySelector('.cdp-back');
  if (!backFace) return;
  backFace.style.backgroundImage = `url("${backURL}")`;
  card.dataset.backApplied = '1';
};

const applyStackLayout = () => {
  const drawCards = $$('.cdp-card', drawPile);
  drawCards.forEach((card, i) => {
    ensureBackImage(card);
    const fromTop = drawCards.length - 1 - i;
    card.style.setProperty('--stack-x', `${Math.min(fromTop * 0.45, 5)}px`);
    card.style.setProperty('--stack-y', `${Math.min(fromTop * 0.55, 7)}px`);
    card.style.zIndex = '';
  });

  const discardCards = $$('.cdp-card', discardPile);
  discardCards.forEach((card, i) => {
    ensureBackImage(card);
    card.style.setProperty('--stack-x', `${Math.min(i * 0.35, 4)}px`);
    card.style.setProperty('--stack-y', `${Math.min(i * 0.4, 6)}px`);
  });
};



// read a CSS time (e.g., "0.5s" or "500ms") → ms number
const _parseMs = (t) => {
  if (!t) return 500;
  const s = String(t).trim();
  if (s.endsWith('ms')) return parseFloat(s) || 0;
  if (s.endsWith('s'))  return (parseFloat(s) || 0) * 1000;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 500;
};

// cache the move duration from #cardTable
const _getMoveMs = (() => {
  let cached;
  return () => {
    if (cached != null) return cached;
    const table = document.getElementById('cardTable');
    const cs = table ? getComputedStyle(table) : null;
    cached = _parseMs(cs?.getPropertyValue('--move-duration') || '.5s');
    return cached;
  };
})();

const _isMobileDeckLayout = () => window.matchMedia('(max-width: 768px)').matches;


// Z-order safe move in overlay; tilt stays visible during motion.
// Pass { tilt: newAngle } only for reshuffle moves.
// For discards, call without `tilt` so the current angle stays constant.
const moveCard = (card, toPile, { delay = 0, tilt = null } = {}) => new Promise((resolve) => {
  // Ensure a top overlay exists (once per table)
  const overlay = (() => {
    let el = document.getElementById('cdpOverlay');
    if (!el) {
      el = document.createElement('div');
      el.id = 'cdpOverlay';
      table.appendChild(el); // `table` is the #cardTable element in scope
    }
    return el;
  })();

  const center = (r) => [r.left + r.width / 2, r.top + r.height / 2];

  // 1) Measure before any move (viewport coordinates)
  const fromRect = card.getBoundingClientRect();
  const [fromCx, fromCy] = center(fromRect);

  const toRect = toPile.getBoundingClientRect();
  let [toCx, toCy] = center(toRect);

  // On mobile, discarded cards should move fully off-screen to avoid covering opened fronts.
  if (_isMobileDeckLayout() && toPile.id === 'discardPile') {
    toCx = window.innerWidth + (fromRect.width * 1.5);
    toCy = fromCy;
  }

  const shuttle = card.querySelector('.cdp-shuttle');
  const currentTilt = Number(card.dataset.tilt || 0);
  const endTilt     = (tilt == null) ? currentTilt : Number(tilt);
  const changeTilt  = (tilt != null) && (endTilt !== currentTilt);

  // 2) Reparent into overlay so it renders above both piles while moving
  overlay.appendChild(card);

  // Compute overlay-relative start/end offsets
  const midRect = card.getBoundingClientRect();
  const [overlayCx, overlayCy] = center(midRect);
  const startDx = fromCx - overlayCx;
  const startDy = fromCy - overlayCy;
  const endDx   = toCx   - overlayCx;
  const endDy   = toCy   - overlayCy;

  // 3) Stage start states WITHOUT transitions
  card.style.transition = 'none';
  card.style.transform  = `translate(calc(-50% + ${startDx}px), calc(-50% + ${startDy}px))`;

  if (shuttle) {
    // Keep the current tilt visible during motion
    shuttle.style.transition = 'none';
    shuttle.style.transform  = `rotate(${currentTilt}deg)`;
  }

  // Commit staged styles
  // eslint-disable-next-line no-unused-expressions
  card.offsetHeight;

  // 4) Animate slide (and optionally the tilt) in the SAME frame
  const moveMs = (typeof _getMoveMs === 'function') ? _getMoveMs() : 350;

  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;

    // Reparent to the target pile on the next frame (avoid same-paint snap)
    requestAnimationFrame(() => {
      // Stop animating; reset to pile baseline
      card.style.transition = 'none';
      card.style.transform  = 'translate(calc(-50% + var(--stack-x, 0px)), calc(-50% + var(--stack-y, 0px)))';
      toPile.appendChild(card);

      // Ensure the final tilt is set and persisted (no transition)
      if (shuttle) {
        shuttle.style.transition = 'none';
        shuttle.style.transform  = `rotate(${endTilt}deg)`;
      }
      card.dataset.tilt = String(endTilt);

      // Newest on top in discard
      if (toPile.id === 'discardPile') {
        discardZ = (typeof discardZ === 'number') ? discardZ + 1 : 1;
        card.style.zIndex = String(discardZ);
      } else {
        card.style.zIndex = '';
      }

      // Cleanup
      card.style.transition = '';
      if (shuttle) shuttle.style.transition = '';
      applyStackLayout();
      resolve();
    });
  };

  const onEnd = (e) => {
    if (e.target !== card || e.propertyName !== 'transform') return;
    card.removeEventListener('transitionend', onEnd);
    finish();
  };
  card.addEventListener('transitionend', onEnd);

  // Fire animations together
  requestAnimationFrame(() => {
    // Slide
    card.style.transition = `transform ${moveMs}ms ease ${delay}ms`;
    card.style.transform  = `translate(calc(-50% + ${endDx}px), calc(-50% + ${endDy}px))`;

    // Only during reshuffle: rotate tilt in sync with the slide
    if (shuttle && changeTilt) {
      shuttle.style.transition = `transform ${moveMs}ms ease ${delay}ms`;
      shuttle.style.transform  = `rotate(${endTilt}deg)`;
    }
  });

  // Safety fallback
  setTimeout(() => {
    card.removeEventListener('transitionend', onEnd);
    finish();
  }, moveMs + delay + 120);
});







    const getDrawCards = () => $$('.cdp-card', drawPile);

    const refreshInteractivity = () => {
      const cardsInDraw = getDrawCards();
      cardsInDraw.forEach(c => c.style.pointerEvents = 'none');
      const top = cardsInDraw.at(-1);
      if (top) {
        ensureBackImage(top);
        top.style.pointerEvents = '';
      }
    };

const onCardClick = (ev) => {
  const card = ev.currentTarget;

  // only the top card in draw acts
  if (getDrawCards().at(-1) !== card) return;
  ensureBackImage(card);

  // First click → open
  if (!card.classList.contains('is-flipped')) {
    card.classList.add('is-flipped');
    return;
  }

  // Second click → flip shut + move to discard simultaneously
  card.classList.add('is-discarded');   // disable future clicks
  card.classList.remove('is-flipped');  // triggers .cdp-flipper rotation (0.6s default)

  moveCard(card, discardPile).then(() => {
    refreshInteractivity();
    maybeReshuffle();
  });
};

// Reshuffle so BOTTOM cards go first and the TOP card returns LAST.
// That way, no post-animation "pop" is needed and stacking stays correct.
const maybeReshuffle = async () => {
  if (getDrawCards().length) return;

  const cards = $$('.cdp-card', discardPile); // DOM order: bottom..top (last = topmost)
  const n = cards.length;
  if (!n) return;

  const stepDelay = 25; // keep the nice flowing look
  const moves = [];

  // Move bottom → top. Top card gets the largest delay, so it arrives last.
for (let j = 0; j < n; j++) {
  const card = cards[j];              // DOM order: bottom..top
  card.classList.remove('is-discarded');

  const newTilt = (((Date.now() + j) * 13) % 9) - 4;

  // Key: bottom (j=0) should arrive LAST, so it becomes the top again.
  const delay = (n - 1 - j) * stepDelay;

  moves.push(
    moveCard(card, drawPile, { delay, tilt: newTilt })
  );
}


  await Promise.all(moves);
  refreshInteractivity();
  applyStackLayout();
};

// Seed so the FIRST <article> in HTML becomes the TOP of the draw pile
const seeds = $$('.cards-seed .card');
const cards = seeds.map(makeCard);

// Append in reverse so the earliest HTML card ends up as the last child (top)
for (let i = cards.length - 1; i >= 0; i--) {
  const c = cards[i];
  drawPile.appendChild(c);
  c.addEventListener('click', onCardClick);
}
refreshInteractivity();
applyStackLayout();


    // Optional API
    window.CardDeckPiles = {
      addCard: ({back, html}) => {
        const stub = document.createElement('article');
        stub.className = 'card';
        stub.setAttribute('data-back', back);
        const fc = document.createElement('div');
        fc.className = 'front-content';
        fc.innerHTML = html;
        stub.appendChild(fc);

        const card = makeCard(stub, Date.now() % 1000);
        drawPile.appendChild(card);
        card.addEventListener('click', onCardClick);
        refreshInteractivity();
        applyStackLayout();
      }
    };
  }

  onReady(async () => {
    const table = $('#cardTable');
    if (table) { init(table); return; }
    try {
      const t = await waitFor('#cardTable', 6000);
      init(t);
    } catch { /* no-op */ }
  });
})();
