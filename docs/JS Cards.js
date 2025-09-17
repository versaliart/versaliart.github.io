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

  // shuttle = holds tilt + shadow, isolates travel axes from rotation
  const shuttle = document.createElement('div');
  shuttle.className = 'cdp-shuttle';
  const tilt = ((idx * 37) % 9) - 4; // -4..+4deg
  shuttle.style.setProperty('--r', tilt + 'deg');

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

// Move by animating the CARD’s transform; reparent only after it finishes
const moveCard = (card, toPile, {delay=0} = {}) => new Promise((resolve) => {
  const from = card.getBoundingClientRect();
  const toRect = toPile.getBoundingClientRect();

  const fromCx = from.left + from.width / 2;
  const fromCy = from.top  + from.height / 2;
  const toCx   = toRect.left + toRect.width / 2;
  const toCy   = toRect.top  + toRect.height / 2;

  const dx = toCx - fromCx;
  const dy = toCy - fromCy;

  // start from the baseline center
  card.style.transitionProperty = 'transform';
  card.style.transitionTimingFunction = 'ease';
  card.style.transitionDuration = '0ms';
  card.style.transitionDelay = '0ms';
  card.style.transform = 'translate(-50%, -50%)';

  // force reflow, then animate to the offset
  // eslint-disable-next-line no-unused-expressions
  card.offsetHeight;

  const moveMs = _getMoveMs();
  let finished = false;

  const end = () => {
    if (finished) return;
    finished = true;

    // freeze, reparent, reset baseline
    card.style.transitionDuration = '0ms';
    toPile.appendChild(card);
    card.style.transform = 'translate(-50%, -50%)';

    // cleanup (let future moves use var duration again)
    card.style.transitionProperty = '';
    card.style.transitionTimingFunction = '';
    card.style.transitionDuration = '';
    card.style.transitionDelay = '';

    resolve();
  };

  const onEnd = (e) => {
    // only accept THIS card’s transform end (ignore bubbled child transitions)
    if (e.target !== card || e.propertyName !== 'transform') return;
    card.removeEventListener('transitionend', onEnd);
    end();
  };
  card.addEventListener('transitionend', onEnd);

  // kick the animation
  requestAnimationFrame(() => {
    card.style.transitionDuration = `${moveMs}ms`;
    if (delay) card.style.transitionDelay = `${delay}ms`;
    // travel toward the other pile; tilt (on shuttle) can change simultaneously
    card.style.transform =
      `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  });

  // safety fallback: if the browser never fires transitionend, still finish
  setTimeout(() => {
    card.removeEventListener('transitionend', onEnd);
    end();
  }, moveMs + delay + 60);
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

  const stepDelay = 25; // fast
  const moves = [];

  for (let i = cards.length - 1, k = 0; i >= 0; i--, k++) {
    const card = cards[i];
    card.classList.remove('is-discarded');

    // re-tilt on the SHUTTLE so translation axes aren’t rotated
    const shuttle = $('.cdp-shuttle', card);
    const tilt = (((Date.now() + i) * 13) % 9) - 4;
    shuttle.style.setProperty('--r', tilt + 'deg');

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
