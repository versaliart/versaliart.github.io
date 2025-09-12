/* tarot-stack.js v1.2 — smooth FLIP transitions + flip-in-place */
(function(){
  const $$ = (sel, el=document) => Array.from(el.querySelectorAll(sel));

  function flipMove(el, toParent, finalizeLayout){
    // FLIP: measure first
    const first = el.getBoundingClientRect();
    // Move in DOM
    toParent.appendChild(el);
    finalizeLayout && finalizeLayout(); // update CSS variables like --i
    const last = el.getBoundingClientRect();

    // Invert
    const dx = first.left - last.left;
    const dy = first.top  - last.top;
    const sx = first.width  / last.width;
    const sy = first.height / last.height;

    // Apply inversion
    el.style.transition = 'none';
    el.style.transformOrigin = 'center center';
    el.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;

    // Play
    el.offsetHeight; // reflow
    el.style.transition = `transform var(--move-ms) var(--ease)`;
    el.style.transform = '';
  }

  class TarotStack {
    constructor(root){
      this.root = root;
      this.drawPile = root.querySelector('[data-role="draw"]');
      this.discardPile = root.querySelector('[data-role="discard"]');

      this.cards = [];
      const defs = $$('.t-def', root);
      const frag = document.createDocumentFragment();
      defs.forEach((def, idx)=>{
        const card = this._makeCard(def, idx);
        frag.appendChild(card);
        this.cards.push(card);
      });
      this.drawPile.appendChild(frag);

      this._layoutAll();
      this._updateTopCard();
      this._bind();
    }

    _makeCard(def, idx){
      const back = def.getAttribute('data-back') || '';
      const card = document.createElement('div');
      card.className = 't-card is-armed';           // armed = slight scale on top card
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
      this.root.addEventListener('click', (e)=>{
        const card = e.target.closest('.t-card');
        if (!card) return;

        const top = this._topOf('draw');
        if (card !== top) return; // only top draw-card is interactive
        if (card.getAttribute('aria-disabled') === 'true') return;

        if (!card.classList.contains('is-flipped')){
          // First click: flip in place
          card.classList.add('is-flipped');
          card.setAttribute('aria-pressed', 'true');
        } else {
          // Second click: flip back, then move to discard via FLIP
          card.classList.remove('is-flipped');
          // wait for flip transition to finish before moving
          const afterFlip = () => {
            card.removeEventListener('transitionend', afterFlip);
            card.setAttribute('aria-disabled','true');
            const finalizeLayout = () => this._layoutPile('discard');
            flipMove(card, this.discardPile, finalizeLayout);
            card.dataset.pile = 'discard';
            this._layoutAll();
            this._updateTopCard();
            this._checkExhausted();
          };
          card.addEventListener('transitionend', afterFlip, {once:true});
        }
      });
    }

    _checkExhausted(){
      if (!this.drawPile.querySelector('.t-card')) {
        const cards = $$('.t-card', this.discardPile);
        // wiggle for fun
        cards.forEach((c,i)=>{ c.classList.add('shuffle'); c.style.zIndex = 200+i; });

        // after wiggle, randomize and fly back to draw
        setTimeout(()=>{
          const shuffled = cards.sort(()=>Math.random() - 0.5);
          shuffled.forEach((c,i)=> c.classList.remove('shuffle','is-flipped'));
          const finalizeLayout = () => this._layoutPile('draw');

          // Move each with FLIP, then re-arm and re-enable
          shuffled.forEach((c,i)=>{
            c.setAttribute('aria-disabled','false');
            c.setAttribute('aria-pressed','false');
            flipMove(c, this.drawPile, finalizeLayout);
            c.dataset.pile = 'draw';
          });

          // update after last one’s movement frame
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
      // highlight & "armed" scale only on the new top draw card
      $$('.t-card', this.drawPile).forEach(c=>c.classList.remove('is-top','is-armed'));
      const top = this._topOf('draw');
      if (top){
        top.classList.add('is-top','is-armed');
        top.style.zIndex = 300 + $$('.t-card', this.drawPile).length;
      }
    }

    _layoutPile(which){
      const parent = which === 'draw' ? this.drawPile : this.discardPile;
      $$('.t-card', parent).forEach((c,i)=> c.style.setProperty('--i', i));
    }
    _layoutAll(){ this._layoutPile('draw'); this._layoutPile('discard'); }
  }

  // Auto-init
  const initAll = () => $$('.tarot-stack').forEach(root => new TarotStack(root));
  (document.readyState === 'loading')
    ? document.addEventListener('DOMContentLoaded', initAll)
    : initAll();
})();
