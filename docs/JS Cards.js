/* ===== Card Deck Piles — v1.0 ===== */
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

// Move a card by animating in viewport coordinates, then reparent at the end
const moveCard = (card, toPile, {delay=0} = {}) => new Promise(resolve => {
  // measure current card box and target pile center
  const from = card.getBoundingClientRect();
  const toRect = toPile.getBoundingClientRect();

  const targetLeft = toRect.left + toRect.width  / 2 - from.width  / 2;
  const targetTop  = toRect.top  + toRect.height / 2 - from.height / 2;

  // elevate above everything so shadows/text never overlay incorrectly
  const prev = {
    position: card.style.position,
    left:     card.style.left,
    top:      card.style.top,
    transform:card.style.transform,
    zIndex:   card.style.zIndex,
    transition: card.style.transition,
    delay:      card.style.transitionDelay
  };

  // Freeze in place visually
  card.style.zIndex = '999';
  card.style.transition = 'none';
  // Put it in viewport space exactly where it is now
  card.style.position = 'fixed';
  card.style.left = `${from.left}px`;
  card.style.top  = `${from.top}px`;
  // Drop the baseline translate; keep rotation (tilt)
  card.style.transform = `rotate(var(--r,0))`;

  // ensure styles apply
  // eslint-disable-next-line no-unused-expressions
  card.offsetHeight;

  requestAnimationFrame(() => {
    card.style.transition = `left var(--move-duration) ease, top var(--move-duration) ease, transform var(--move-duration) ease`;
    if (delay) card.style.transitionDelay = `${delay}ms`;
    // animate to the other pile's center; rotation animates concurrently if --r changed
    card.style.left = `${targetLeft}px`;
    card.style.top  = `${targetTop}px`;
  });

  const onEnd = (e) => {
    // wait for the 'top' or 'left' transition to finish
    if (e.propertyName !== 'top' && e.propertyName !== 'left') return;
    card.removeEventListener('transitionend', onEnd);

    // Reparent AFTER the move, then restore baseline centering style
    card.style.transition = 'none';
    toPile.appendChild(card);
    // restore original inline props and baseline transform used in piles
    card.style.position  = prev.position || '';
    card.style.left      = prev.left || '';
    card.style.top       = prev.top || '';
    card.style.transform = `translate(-50%, -50%) rotate(var(--r,0))`;
    card.style.zIndex    = prev.zIndex || '';
    card.style.transitionDelay = prev.delay || '';
    card.style.transition = prev.transition || '';

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

  const stepDelay = 25; // much shorter stagger

  const moves = [];
  for (let i = cards.length - 1, k = 0; i >= 0; i--, k++) {
    const card = cards[i];
    card.classList.remove('is-discarded');

    // set new tilt BEFORE starting move so rotation + translation animate together
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
