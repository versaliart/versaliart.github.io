/* ===== Card Deck Piles — v1.2 ===== */

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


// Move the CARD (translate) and optionally animate TILT on the SHUTTLE in perfect sync.
// Also ensures newly discarded cards land visually on top.
// Move the CARD (translate) and, if tilt!=null, animate the SHUTTLE tilt in the same frame.
// Move the CARD (translate) and, if tilt!=null, rotate the SHUTTLE in the same tick.
// Also keeps newest discard on top.
const moveCard = (card, toPile, { delay = 0, tilt = null } = {}) => new Promise((resolve) => {
  const from   = card.getBoundingClientRect();
  const toRect = toPile.getBoundingClientRect();

  const fromCx = from.left + from.width  / 2;
  const fromCy = from.top  + from.height / 2;
  const toCx   = toRect.left + toRect.width  / 2;
  const toCy   = toRect.top  + toRect.height / 2;

  const dx = toCx - fromCx;
  const dy = toCy - fromCy;

  const moveMs  = (typeof _getMoveMs === 'function') ? _getMoveMs() : 350;
  const shuttle = card.querySelector('.cdp-shuttle');

  // target tilt (if provided) and precise numeric start tilt
  const startTilt = Number(card.dataset.tilt || 0);
  const endTilt   = (tilt == null) ? startTilt : Number(tilt);

  // raise during travel so nothing draws over it
  const prevZ = card.style.zIndex;
  card.style.zIndex = '9999';

  // Stage start states (no transitions)
  card.style.transition = 'none';
  card.style.transform  = 'translate(-50%, -50%)';
  if (shuttle) {
    shuttle.style.transition = 'none';
    shuttle.style.transform  = `rotate(${startTilt}deg)`;
  }
  // commit staged styles
  // eslint-disable-next-line no-unused-expressions
  card.offsetHeight;

  // Complete/cleanup
  let finished = false;
  const end = () => {
    if (finished) return;
    finished = true;

    // reparent and reset baseline
    card.style.transition = 'none';
    toPile.appendChild(card);
    card.style.transform = 'translate(-50%, -50%)';

    // newest discard on top
    if (toPile.id === 'discardPile') {
      discardZ += 1;
      card.style.zIndex = String(1000 + discardZ);
    } else {
      card.style.zIndex = '';
    }

    // persist the new tilt so next move starts from the correct angle
    if (tilt != null) card.dataset.tilt = String(endTilt);

    // clear inline transitions
    card.style.transition = '';
    if (shuttle) shuttle.style.transition = '';

    resolve();
  };

  const onEnd = (e) => {
    if (e.target !== card || e.propertyName !== 'transform') return;
    card.removeEventListener('transitionend', onEnd);
    end();
  };
  card.addEventListener('transitionend', onEnd);

  // Fire both animations in the same frame with the same timing
  requestAnimationFrame(() => {
    card.style.transition = `transform ${moveMs}ms ease ${delay}ms`;
    card.style.transform  = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;

    if (shuttle && endTilt !== startTilt) {
      shuttle.style.transition = `transform ${moveMs}ms ease ${delay}ms`;
      shuttle.style.transform  = `rotate(${endTilt}deg)`;
    }
  });

  // safety
  setTimeout(() => {
    card.removeEventListener('transitionend', onEnd);
    end();
  }, moveMs + delay + 100);
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