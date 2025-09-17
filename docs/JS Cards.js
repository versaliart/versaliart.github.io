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

const makeCard = (seedNode, idx) => {
  const backURL  = seedNode.getAttribute('data-back') || '';
  const textHTML = $('.front-content', seedNode)?.innerHTML || '';

  const card = document.createElement('div');
  card.className = 'cdp-card';
  card.dataset.index = String(idx);

  const shuttle = document.createElement('div');
  shuttle.className = 'cdp-shuttle';
  const initTilt = ((idx * 37) % 9) - 4;  // -4..+4
  card.dataset.tilt = String(initTilt);
  shuttle.style.transform = `rotate(${initTilt}deg)`;

  const flipper = document.createElement('div');
  flipper.className = 'cdp-flipper';

  const back = document.createElement('div');
  back.className = 'cdp-face cdp-back';
  back.style.backgroundImage = `url("${backURL}")`;

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
  const [toCx, toCy] = center(toRect);

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
      card.style.transform  = 'translate(-50%, -50%)';
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
        card.style.zIndex = String(1000 + discardZ);
      } else {
        card.style.zIndex = '';
      }

      // Cleanup
      card.style.transition = '';
      if (shuttle) shuttle.style.transition = '';
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







    const refreshInteractivity = () => {
      $$('.cdp-card', drawPile).forEach(c => c.style.pointerEvents = 'none');
      const top = $$('.cdp-card', drawPile).at(-1);
      if (top) top.style.pointerEvents = '';
    };

const onCardClick = (ev) => {
  const card = ev.currentTarget;

  // only the top card in draw acts
  if ($$('.cdp-card', drawPile).at(-1) !== card) return;

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

const maybeReshuffle = async () => {
  if ($$('.cdp-card', drawPile).length) return;
  const cards = $$('.cdp-card', discardPile);
  if (!cards.length) return;

  const stepDelay = 25;
  const moves = [];
  for (let i = cards.length - 1, k = 0; i >= 0; i--, k++) {
    const card = cards[i];
    card.classList.remove('is-discarded');
    const newTilt = (((Date.now() + i) * 13) % 9) - 4;
    moves.push(moveCard(card, drawPile, { delay: k * stepDelay, tilt: newTilt }));
  }
  await Promise.all(moves);
  refreshInteractivity();
};

    // Seed from your hidden articles (still use your <article class="card"> seeds)
    const seeds = $$('.cards-seed .card');
    const cards = seeds.map(makeCard);
    cards.forEach(c => {
      drawPile.appendChild(c);
      c.addEventListener('click', onCardClick);
    });
    refreshInteractivity();

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