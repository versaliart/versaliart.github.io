/* ===========================
   Card Draw/Discard — JS
   Vanilla, Squarespace-friendly
   =========================== */
(() => {
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  const table = $('#cardTable');
  if (!table) return;

  const drawPile    = $('#drawPile', table);
  const discardPile = $('#discardPile', table);
  const seedRoot    = $('.cards-seed');

  /* Build a live card from a seed <article class="card" data-back=…> */
  const makeCard = (seedNode, idx) => {
    const backURL  = seedNode.getAttribute('data-back') || '';
    const textHTML = $('.front-content', seedNode)?.innerHTML || '';

    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.index = String(idx);

    // Gentle, repeatable tilt so stacks look organic
    const tilt = ((idx * 37) % 9) - 4; // -4..+4 deg
    card.style.setProperty('--r', tilt + 'deg');

    const flipper = document.createElement('div');
    flipper.className = 'flipper';

    const back = document.createElement('div');
    back.className = 'face back';
    back.style.backgroundImage = `url("${backURL}")`;

    const front = document.createElement('div');
    front.className = 'face front';
    const frontBox = document.createElement('div');
    frontBox.className = 'front-content';
    frontBox.innerHTML = textHTML;
    front.appendChild(frontBox);

    flipper.appendChild(back);
    flipper.appendChild(front);
    card.appendChild(flipper);
    return card;
  };

  /* FLIP technique move: keep baseline translate(-50%,-50%) */
  const moveCard = (card, toPile, {delay=0} = {}) => new Promise(resolve => {
    const from = card.getBoundingClientRect();
    toPile.appendChild(card); // reparent to new pile
    const to = card.getBoundingClientRect();

    // use centers to avoid skew from rotation/scale
    const fromCx = from.left + from.width / 2;
    const fromCy = from.top  + from.height / 2;
    const toCx   = to.left   + to.width  / 2;
    const toCy   = to.top    + to.height / 2;

    const dx = fromCx - toCx;
    const dy = fromCy - toCy;

    // 1) jump to inverse delta on top of baseline center
    card.style.transition = 'none';
    card.style.transform =
      `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) rotate(var(--r,0))`;
    // force reflow
    // eslint-disable-next-line no-unused-expressions
    card.offsetHeight;

    // 2) animate back to centered baseline
    requestAnimationFrame(() => {
      card.style.transition = `transform var(--move-duration) ease`;
      if (delay) card.style.transitionDelay = `${delay}ms`;
      card.style.transform = `translate(-50%, -50%) rotate(var(--r,0))`;
    });

    const done = () => {
      card.style.transition = '';
      card.style.transitionDelay = '';
      resolve();
    };
    const onEnd = (e) => {
      if (e.propertyName === 'transform') {
        card.removeEventListener('transitionend', onEnd);
        done();
      }
    };
    card.addEventListener('transitionend', onEnd);
  });

  /* Only top card in draw pile is clickable */
  const refreshInteractivity = () => {
    $$('.card', drawPile).forEach(c => c.style.pointerEvents = 'none');
    const top = $$('.card', drawPile).at(-1);
    if (top) top.style.pointerEvents = '';
  };

  /* Click behavior:
     - First click: flip open.
     - Second click: flip back, send to discard, disable clicks.
  */
  const onCardClick = (ev) => {
    const card = ev.currentTarget;

    // only act if this is the top card of the draw pile
    if ($$('.card', drawPile).at(-1) !== card) return;

    if (!card.classList.contains('is-flipped')) {
      card.classList.add('is-flipped');
      return;
    }

    // Flip shut then move to discard
    const afterFlip = () => {
      card.removeEventListener('transitionend', afterFlip);
      // wait a frame so the retract starts visually, then move
      requestAnimationFrame(async () => {
        card.classList.add('is-discarded');
        await moveCard(card, discardPile);
        refreshInteractivity();
        maybeReshuffle();
      });
    };

    // ensure we have a listener even if timing is tight
    card.addEventListener('transitionend', afterFlip, {once:true});
    card.classList.remove('is-flipped');
  };

  /* When draw is empty: stream discard -> draw with a small stagger */
  const maybeReshuffle = async () => {
    if ($$('.card', drawPile).length) return;
    const cards = $$('.card', discardPile);
    if (!cards.length) return;

    const stepDelay = 110; // ms between cards
    for (let i = cards.length - 1, k = 0; i >= 0; i--, k++) {
      const card = cards[i];
      card.classList.remove('is-discarded');
      // fresh micro-tilt so it feels shuffled
      const tilt = (((Date.now()+i) * 13) % 9) - 4;
      card.style.setProperty('--r', tilt + 'deg');
      await moveCard(card, drawPile, {delay: k * stepDelay});
    }
    refreshInteractivity();
  };

  /* ------ Init from .cards-seed ------ */
  const seedCards = $$('.cards-seed .card').map(makeCard);
  seedCards.forEach(c => {
    drawPile.appendChild(c);
    c.addEventListener('click', onCardClick);
  });
  refreshInteractivity();

  /* Optional public API */
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
})();
