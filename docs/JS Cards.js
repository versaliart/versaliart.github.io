/* tarot-stack.js v1.0 — vanilla, dependency-free */
(function(){
  const $$ = (sel, el=document) => Array.from(el.querySelectorAll(sel));

  class TarotStack {
    constructor(root){
      this.root = root;
      this.drawPile = root.querySelector('[data-role="draw"]');
      this.discardPile = root.querySelector('[data-role="discard"]');

      // Build cards from child template nodes
      this.cards = [];
      const defs = $$('.t-def', root);
      if (!defs.length) return;

      const frag = document.createDocumentFragment();
      defs.forEach((def, idx) => {
        const card = this._makeCard(def, idx);
        frag.appendChild(card);
        this.cards.push(card);
      });
      this.drawPile.appendChild(frag);

      this._layoutPile('draw');
      this._updateTopCard();
      this._bind();
    }

    _makeCard(def, idx){
      const back = def.getAttribute('data-back') || '';
      const face = document.createElement('div');
      face.className = 't-card';
      face.setAttribute('role','button');
      face.setAttribute('aria-pressed','false');
      face.dataset.index = String(idx);
      face.dataset.pile = 'draw';
      face.style.zIndex = 100 + idx;

      // faces
      const backEl = document.createElement('div');
      backEl.className = 't-face t-back';
      backEl.style.backgroundImage = back ? `url("${back}")` : 'none';

      const frontEl = document.createElement('div');
      frontEl.className = 't-face t-front';
      const content = document.createElement('div');
      content.className = 't-content';
      // copy inner HTML of def into content
      content.innerHTML = def.innerHTML || '';
      frontEl.appendChild(content);

      face.append(backEl, frontEl);
      return face;
    }

    _bind(){
      this.root.addEventListener('click', (e)=>{
        const card = e.target.closest('.t-card');
        if (!card) return;
        if (card.getAttribute('aria-disabled') === 'true') return;

        // Only allow interacting with the top card in the draw pile
        const top = this._topOf('draw');
        if (card !== top) return;

        if (!card.classList.contains('is-flipped')){
          // First click: flip
          card.classList.add('is-flipped');
          card.setAttribute('aria-pressed','true');
        } else {
          // Second click: send to discard
          this._toDiscard(card);
        }
      });
    }

    _toDiscard(card){
      card.classList.remove('is-top');
      card.classList.add('fly-right');
      card.setAttribute('aria-disabled','true');

      // Move after transition
      const after = () => {
        card.removeEventListener('transitionend', after);
        card.classList.remove('fly-right');
        card.dataset.pile = 'discard';
        this.discardPile.appendChild(card);
        this._layoutPile('discard');
        this._layoutPile('draw');
        this._updateTopCard();
        this._checkExhausted();
      };
      card.addEventListener('transitionend', after, {once:true});
    }

    _checkExhausted(){
      if (!this.drawPile.querySelector('.t-card')) {
        // All discarded -> shuffle back
        const cards = $$('.t-card', this.discardPile);
        // Visual: wiggle/shuffle
        cards.forEach((c,i)=>{
          c.classList.add('shuffle');
          c.style.zIndex = 100 + i;
        });

        // After a short beat, fly left, reset states, re-order randomly
        setTimeout(()=>{
          // randomize
          const shuffled = cards.sort(()=>Math.random() - 0.5);
          const frag = document.createDocumentFragment();
          shuffled.forEach((c,i)=>{
            c.classList.remove('is-flipped','shuffle');
            c.setAttribute('aria-disabled','false');
            c.setAttribute('aria-pressed','false');
            c.classList.add('fly-left');
            c.dataset.pile = 'draw';
            frag.appendChild(c);
          });
          this.drawPile.appendChild(frag);
          // when the last finishes, clean up
          const last = shuffled[shuffled.length-1];
          last.addEventListener('transitionend', ()=>{
            shuffled.forEach(c=>c.classList.remove('fly-left'));
            this._layoutPile('draw');
            this._updateTopCard();
          }, {once:true});
        }, 280);
      }
    }

    _topOf(which){
      const parent = which === 'draw' ? this.drawPile : this.discardPile;
      const cards = $$('.t-card', parent);
      return cards[cards.length-1] || null;
    }

    _updateTopCard(){
      // Only the top draw card gets the “is-top” highlight
      $$('.t-card', this.drawPile).forEach(c=>c.classList.remove('is-top'));
      const top = this._topOf('draw');
      if (top){
        top.classList.add('is-top');
        // ensure top card sits highest
        const z = 200 + $$('.t-card', this.drawPile).length;
        top.style.zIndex = z;
      }
    }

    _layoutPile(which){
      const parent = which === 'draw' ? this.drawPile : this.discardPile;
      $$('.t-card', parent).forEach((c,i)=>{
        c.style.setProperty('--i', i);
        c.dataset.pile = which;
      });
    }
  }

  // Auto-init any .tarot-stack on the page
  const initAll = () => {
    $$('.tarot-stack').forEach(root => new TarotStack(root));
  };

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }
})();
