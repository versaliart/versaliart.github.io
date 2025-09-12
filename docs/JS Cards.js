/* tarot-stack.js v1.3 — 80% pile sizing; flip-to-full; flip-while-moving-to-discard via FLIP */
(function(){
  const $$ = (sel, el=document) => Array.from(el.querySelectorAll(sel));

  // FLIP helper: animate element from current box to its new box after a DOM/class change.
  function flipAnimate(el, mutate, timingVar='--move-ms'){
    const first = el.getBoundingClientRect();
    mutate(); // change DOM/class/parent/size
    const last = el.getBoundingClientRect();

    const dx = first.left - last.left;
    const dy = first.top  - last.top;
    const sx = first.width  / last.width;
    const sy = first.height / last.height;

    el.style.transition = 'none';
    el.style.transformOrigin = 'center center';
    el.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
    el.offsetHeight; // reflow
    el.style.transition = `transform var(${timingVar}) var(--ease)`;
    el.style.transform = '';
  }

  // compute and set CSS vars so that:
  // - piles are columns (50% each)
  // - card width = 80% of the pile column width
  // - card height = 80% of the Code Block height
  function sizeFor(root){
    const cw = root.clientWidth;
    const ch = root.clientHeight || root.getBoundingClientRect().height || 0;
    const pileColW = Math.max(1, cw / 2);
    const cardW = Math.floor(pileColW * 0.8);
    const cardH = Math.floor(ch * 0.8);

    root.style.setProperty('--card-w', cardW + 'px');
    root.style.setProperty('--card-h', cardH + 'px');
  }

  class TarotStack {
    constructor(root){
      this.root = root;
      this.drawPile = root.querySelector('[data-role="draw"]');
      this.discardPile = root.querySelector('[data-role="discard"]');

      // build cards from templates
      const defs = $$('.t-def', root);
      const frag = document.createDocumentFragment();
      this.cards = [];
      defs.forEach((def, idx)=>{
        const card = this._makeCard(def, idx);
        frag.appendChild(card);
        this.cards.push(card);
      });
      this.drawPile.appendChild(frag);

      // initial sizing and layout
      sizeFor(this.root);
      this._layoutAll();
      this._updateTopCard();

      // events
      this._bind();

      // resize observer to keep 80% sizing responsive
      const ro = new ResizeObserver(()=> sizeFor(this.root));
      ro.observe(this.root);
      this._ro = ro;
    }

    _makeCard(def, idx){
      const back = def.getAttribute('data-back') || '';
      const card = document.createElement('div');
      card.className = 't-card';
      card.setAttribute('role','button');
      card.setAttribute('aria-pressed','false');
      card.dataset.index = String(idx);
      card.dataset.pile = 'draw';
      card.style.zIndex = 100 + idx;

      const backEl = document.createElement('div');
      backEl.className = 't-face t-back';
      backEl.style.backgroundImage = back ? `url("${back}")` : 'none';

      const frontEl = document.createElement('div');
      frontEl.className = 't-face t-front';
      const content = document.createElement('div');
      content.className = 't-content';
      content.innerHTML = def.innerHTML || '';
      frontEl.appendChild(content);

      card.append(backEl, frontEl);
      return card;
    }

    _bind(){
      // Click behavior:
      // 1st click on top draw: flip + expand to full Code Block (overlay)
      // 2nd click on the same card: flip back WHILE moving to discard (single FLIP)
      this.root.addEventListener('click', (e)=>{
        const card = e.target.closest('.t-card');
        if (!card) return;

        // only top draw card or expanded card is interactive
        const top = this._topOf('draw');
        const isExpanded = card.classList.contains('is-expanded');

        if (!isExpanded && card !== top) return;
        if (card.getAttribute('aria-disabled') === 'true') return;

        if (!card.classList.contains('is-flipped') && !isExpanded){
          // First click: expand to full + flip to front (two steps via FLIP)
          flipAnimate(card, ()=>{ card.classList.add('is-expanded'); }, '--move-ms');
          card.classList.add('is-flipped');
          card.setAttribute('aria-pressed','true');
          // keep it above everything while expanded
          card.style.zIndex = 999;
        } else {
          // Second click: flip back WHILE flying to discard using one FLIP pass.
          // We’ll include rotateY change as part of the same transform animation by
          // toggling the class before moving and letting FLIP handle position/size.
          flipAnimate(card, ()=>{
            // start flipping back immediately
            card.classList.remove('is-flipped');

            // move out of expanded state and into discard pile in one DOM tick
            card.classList.remove('is-expanded');
            card.setAttribute('aria-disabled','true');

            // Reparent to discard and relayout indices
            this.discardPile.appendChild(card);
            card.dataset.pile = 'discard';
            this._layoutPile('discard');
          }, '--move-ms');

          // after the movement finishes, tidy and update
          const onDone = () => {
            card.removeEventListener('transitionend', onDone);
            card.style.zIndex = 100 + $$('.t-card', this.discardPile).length;
            this._layoutAll();
            this._updateTopCard();
            this._checkExhausted();
          };
          card.addEventListener('transitionend', onDone, {once:true});
        }
      });
    }

    _checkExhausted(){
      if (!this.drawPile.querySelector('.t-card')) {
        const cards = $$('.t-card', this.discardPile);
        cards.forEach((c,i)=>{ c.classList.add('shuffle'); c.style.zIndex = 200+i; });

        setTimeout(()=>{
          const shuffled = cards.sort(()=>Math.random() - 0.5);
          // Move each back to draw with FLIP (no expansion here)
          shuffled.forEach((c,i)=>{
            c.classList.remove('shuffle','is-flipped','is-expanded');
            c.setAttribute('aria-disabled','false');
            c.setAttribute('aria-pressed','false');
            flipAnimate(c, ()=>{
              this.drawPile.appendChild(c);
              c.dataset.pile = 'draw';
              this._layoutPile('draw');
            }, '--move-ms');
          });

          requestAnimationFrame(()=>{ this._layoutAll(); this._updateTopCard(); });
        }, 220);
      }
    }

    _topOf(which){
      const parent = which === 'draw' ? this.drawPile : this.discardPile;
      const cards = $$('.t-card', parent);
      return cards[cards.length-1] || null;
    }

    _updateTopCard(){
      // Top card highlight only on draw pile
      $$('.t-card', this.drawPile).forEach(c=>c.classList.remove('is-top'));
      const top = this._topOf('draw');
      if (top){
        top.classList.add('is-top');
        top.style.zIndex = 300 + $$('.t-card', this.drawPile).length;
      }
    }

    _layoutPile(which){
      const parent = which === 'draw' ? this.drawPile : this.discardPile;
      $$('.t-card', parent).forEach((c,i)=> c.style.setProperty('--i', i));
    }
    _layoutAll(){ this._layoutPile('draw'); this._layoutPile('discard'); }
  }

  // Auto-init all stacks on page
  const initAll = () => $$('.tarot-stack').forEach(root => new TarotStack(root));
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }
})();
