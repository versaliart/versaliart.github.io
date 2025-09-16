/* deck-piles.js — vanilla JS card draw/discard with flip & shuffle
   Author: ChatGPT for Joshua — 2025-09
*/
(() => {
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  const table = $('#cardTable');
  if (!table) return;

  const drawPile    = $('#drawPile', table);
  const discardPile = $('#discardPile', table);
  const seed = $('.cards-seed');

  // ----- Build card DOM for each seed <article> -----
  const makeCard = (node, idx) => {
    const backURL = node.getAttribute('data-back') || '';
    const textHTML = $('.front-content', node)?.innerHTML || '';
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.index = String(idx);

    // Slight, repeatable tilt
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

  // Move card between piles with FLIP animation
  const moveCard = (card, toPile, {delay=0}={}) => new Promise(res => {
    const fromRect = card.getBoundingClientRect();
    toPile.appendChild(card); // reparent
    const toRect = card.getBoundingClientRect();

    // FLIP: compute inverse transform then animate to identity
    const dx = fromRect.left - toRect.left;
    const dy = fromRect.top  - toRect.top;
    card.style.transition = 'none';
    card.style.transform = `translate(${dx}px, ${dy}px) rotate(var(--r,0))`;
    // force reflow
    card.offsetHeight; // eslint-disable-line no-unused-expressions
    requestAnimationFrame(() => {
      card.style.transition = `transform var(--move-duration) ease`;
      if (delay) card.style.transitionDelay = `${delay}ms`;
      card.style.transform = `translate(-50%,-50%) rotate(var(--r,0))`;
    });

    const done = () => {
      card.style.transition = '';
      card.style.transitionDelay = '';
      res();
    };
    card.addEventListener('transitionend', function onEnd(e){
      if (e.propertyName === 'transform'){ card.removeEventListener('transitionend', onEnd); done(); }
    });
  });

  // Only the top (visually last child) of draw pile is clickable
  const refreshInteractivity = () => {
    // disable all
    $$('.card', drawPile).forEach(c => c.style.pointerEvents = 'none');
    const top = $$('.card', drawPile).at(-1);
    if (top) top.style.pointerEvents = '';
  };

  // Clicking logic: first click flips; second click flips back & send to discard
  const onCardClick = (ev) => {
    const card = ev.currentTarget;
    // Only act if it's the current top of draw pile
    if ($$('.card', drawPile).at(-1) !== card) return;

    if (!card.classList.contains('is-flipped')) {
      card.classList.add('is-flipped');
    } else {
      // flip back then move to discard
      const afterFlip = () => {
        card.removeEventListener('transitionend', afterFlip);
        card.classList.remove('is-flipped');
        // Wait one frame so the scale retract begins, feels snappier
        requestAnimationFrame(async () => {
          card.classList.add('is-discarded');
          await moveCard(card, discardPile);
          refreshInteractivity();
          maybeReshuffle();
        });
      };
      // If transition already finished (fast click), move immediately
      card.addEventListener('transitionend', afterFlip);
      // Trigger the retract if not already doing so
      card.classList.remove('is-flipped');
    }
  };

  // Reshuffle: when draw is empty, stream discard -> draw with stagger
  const maybeReshuffle = async () => {
    if ($$('.card', drawPile).length) return;
    const cards = $$('.card', discardPile);
    if (!cards.length) return;

    // Send back one-by-one, last-in first-out feels natural
    const stepDelay = 110; // ms between cards
    for (let i = cards.length - 1, k = 0; i >= 0; i--, k++){
      const card = cards[i];
      card.classList.remove('is-discarded');
      // fresh tiny tilt so the stack feels shuffled
      const tilt = (((Date.now()+i)*13) % 9) - 4;
      card.style.setProperty('--r', tilt + 'deg');
      await moveCard(card, drawPile, {delay: k * stepDelay});
    }
    refreshInteractivity();
  };

  // ----- Initialize -----
  // Seed the draw pile with cards from the hidden .cards-seed block.
  const cards = $$('.cards-seed .card').map(makeCard);
  cards.forEach(c => {
    drawPile.appendChild(c);
    c.addEventListener('click', onCardClick);
  });
  refreshInteractivity();

  // Public helper (optional): programmatically add a card later
  window.CardDeckPiles = {
    addCard: ({back, html}) => {
      const stub = document.createElement('article');
      stub.className = 'card';
      stub.setAttribute('data-back', back);
      const fc = document.createElement('div');
      fc.className = 'front-content';
      fc.innerHTML = html;
      stub.appendChild(fc);
      const card = makeCard(stub, Date.now()%1000);
      drawPile.appendChild(card);
      card.addEventListener('click', onCardClick);
      refreshInteractivity();
    }
  };
})();
