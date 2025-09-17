/* ===== Card Deck Piles — Namespaced, Squarespace-safe ===== */
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
    if (!drawPile || !discardPile || !seedRoot) return;

    const makeCard = (seedNode, idx) => {
      const backURL  = seedNode.getAttribute('data-back') || '';
      const textHTML = $('.front-content', seedNode)?.innerHTML || '';

      const card = document.createElement('div');
      card.className = 'cdp-card';
      card.dataset.index = String(idx);
      const tilt = ((idx * 37) % 9) - 4;
      card.style.setProperty('--r', tilt + 'deg');

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
      card.appendChild(flipper);
      return card;
    };

    const moveCard = (card, toPile, {delay=0} = {}) => new Promise(resolve => {
      const from = card.getBoundingClientRect();
      toPile.appendChild(card);
      const to = card.getBoundingClientRect();

      const fromCx = from.left + from.width / 2;
      const fromCy = from.top  + from.height / 2;
      const toCx   = to.left   + to.width  / 2;
      const toCy   = to.top    + to.height / 2;

      const dx = fromCx - toCx;
      const dy = fromCy - toCy;

      card.style.transition = 'none';
      card.style.transform =
        `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) rotate(var(--r,0))`;
      // force reflow
      // eslint-disable-next-line no-unused-expressions
      card.offsetHeight;

      requestAnimationFrame(() => {
        card.style.transition = `transform var(--move-duration) ease`;
        if (delay) card.style.transitionDelay = `${delay}ms`;
        card.style.transform = `translate(-50%, -50%) rotate(var(--r,0))`;
      });

      const onEnd = (e) => {
        if (e.propertyName !== 'transform') return;
        card.removeEventListener('transitionend', onEnd);
        card.style.transition = '';
        card.style.transitionDelay = '';
        resolve();
      };
      card.addEventListener('transitionend', onEnd);
    });

    const refreshInteractivity = () => {
      $$('.cdp-card', drawPile).forEach(c => c.style.pointerEvents = 'none');
      const top = $$('.cdp-card', drawPile).at(-1);
      if (top) top.style.pointerEvents = '';
    };

const onCardClick = (ev) => {
  const card = ev.currentTarget;

  // only the top card in draw can act
  if ($$('.cdp-card', drawPile).at(-1) !== card) return;

  // first click → open
  if (!card.classList.contains('is-flipped')) {
    card.classList.add('is-flipped');
    return;
  }

  // second click → flip shut + move to discard SIMULTANEOUSLY
  card.classList.add('is-discarded');   // disables pointer events
  card.classList.remove('is-flipped');  // flipper rotates back (0.6s)

  // move animation on the card element happens concurrently with the flip
  moveCard(card, discardPile).then(() => {
    refreshInteractivity();
    maybeReshuffle();
  });
};


const maybeReshuffle = async () => {
  if ($$('.cdp-card', drawPile).length) return;
  const cards = $$('.cdp-card', discardPile);
  if (!cards.length) return;

  const stepDelay = 35; // was ~110ms → much faster now

  // stream back right-to-left, re-tilt and move in the same frame
  const moves = [];
  for (let i = cards.length - 1, k = 0; i >= 0; i--, k++) {
    const card = cards[i];
    card.classList.remove('is-discarded');

    // set a fresh tilt BEFORE starting the move (so rotation + translation animate together)
    const tilt = (((Date.now() + i) * 13) % 9) - 4;
    card.style.setProperty('--r', tilt + 'deg');

    moves.push(moveCard(card, drawPile, { delay: k * stepDelay }));
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
