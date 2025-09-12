/* tarot-stack.js v1.4 — fix flip/move conflict; FLIP on container, rotate on inner wrap; 80% sizing; move-while-flip */
(function(){
  const $$ = (sel, el=document) => Array.from(el.querySelectorAll(sel));
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  // FLIP on the moving container (t-card); rotation stays on inner .t-wrap
  function flipMove(el, mutate, durVar='--move-ms'){
    const first = el.getBoundingClientRect();
    mutate();
    const last  = el.getBoundingClientRect();

    const dx = first.left - last.left;
    const dy = first.top  - last.top;
    const sx = first.width  / last.width;
    const sy = first.height / last.height;

    el.style.transition = 'none';
    el.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
    el.offsetHeight; // reflow
    el.style.transition = `transform var(${durVar}) var(--ease)`;
    el.style.transform = '';
  }

  // Compute card size:
  // - two columns (each ~50% width of root)
  // - card width = 80% of column width
  // - card height = min( 80% of root height, width * aspect )
  function sizeFor(root){
    const ratio = parseFloat(root.getAttribute('data-ratio')) || 1.38; // H/W
    const rect  = root.getBoundingClientRect();
    const cw = Math.max(1, rect.width);
    const ch = Math.max(1, rect.height);

    const colW = cw / 2;
    const wConstraint = colW * 0.8;
    const hConstraint = ch * 0.8;

    let w = wConstraint;
    let h = w * ratio;
    if (h > hConstraint){
      h = hConstraint;
      w = h / ratio;
    }
    w = Math.floor(w);
    h = Math.floor(h);

    root.style.setProperty('--card-w', w + 'px');
    root.style.setProperty('--card-h', h + 'px');
  }

  class TarotStack {
    constructor(root){
      this.root = root;
      this.drawPile = root.querySelector('[data-role="draw"]');
      this.discardPile = root.querySelector('[data-role="discard"]');

      const defs = $$('.t-def', root);
      const frag = document.createDocumentFragment();
      this.cards = [];

      defs.forEach((def, idx)=>{
        const card = this._makeCard(def, idx);
        frag.appendChild(card);
        this.cards.push(card);
      });
      this.drawPile.appendChild(frag);

      sizeFor(this.root);
      this._layoutAll();
      this._updateTop();

      this._bind();

      // keep sizing responsive
      const ro = new ResizeObserver(()=> sizeFor(this.root));
      ro.observe(this.root);
      this._ro = ro;
    }

    _makeCard(def, idx){
      const back = def.getAttribute('data-back') || '';
      const card = document.createElement('div');
      card.className = 't-card';
      card.dataset.index = String(idx);
      card.dataset.pile  = 'draw';
      card.setAttribute('role','button');
      card.setAttribute('aria-pressed','false');

      const wrap = document.createElement('div');
      wrap.className = 't-wrap';
      wrap.style.setProperty('--rz', `${(idx % 7 - 3) * 0.3}deg`);

      const backEl = document.createElement('div');
      backEl.className = 't-face t-back';
      backEl.style.backgroundImage = back ? `url("${back}")` : 'none';

      const frontEl = document.createElement('div');
      frontEl.className = 't-face t-front';
      const content = document.createElement('div');
      content.className = 't-content';
      content.innerHTML = def.innerHTML || '';
      frontEl.appendChild(content);

      wrap.append(backEl, frontEl);
      card.appendChild(wrap);
      return card;
    }

    _bind(){
      this.root.addEventListener('click', (e)=>{
        const card = e.target.closest('.t-card');
        if (!card) return;

        const top = this._topOf('draw');
        const wrap = card.querySelector('.t-wrap');
        const expanded = card.classList.contains('is-expanded');

        // Only top card in draw pile OR the expanded card is interactive
        if (!expanded && card !== top) return;
        if (card.getAttribute('aria-disabled') === 'true') return;

        if (!wrap.classList.contains('is-flipped') && !expanded){
          // 1) Expand to full block (FLIP), 2) then flip to front (wrapper)
          flipMove(card, ()=> card.classList.add('is-expanded'));
          wrap.classList.add('is-flipped');
          card.setAttribute('aria-pressed','true');
          card.style.zIndex = 999;
        } else {
          // Flip back WHILE flying to discard:
          // - start wrapper unflip immediately
          // - in the same frame, shrink + reparent the mover via FLIP
          flipMove(card, ()=>{
            wrap.classList.remove('is-flipped');
            card.classList.remove('is-expanded');
            card.setAttribute('aria-disabled','true');
            this.discardPile.appendChild(card);
            card.dataset.pile = 'discard';
            this._layoutPile('discard');
          });

          const onDone = () => {
            card.removeEventListener('transitionend', onDone);
            card.style.zIndex = 100 + $$('.t-card', this.discardPile).length;
            this._layoutAll();
            this._updateTop();
            this._maybeShuffle();
          };
          card.addEventListener('transitionend', onDone, {once:true});
        }
      });
    }

    _maybeShuffle(){
      if (this.drawPile.querySelector('.t-card')) return;
      const cards = $$('.t-card', this.discardPile);
      cards.forEach((c,i)=> c.classList.add('shuffle'));

      setTimeout(()=>{
        const shuffled = cards.sort(()=>Math.random() - 0.5);
        shuffled.forEach(c=>{
          c.classList.remove('shuffle');
          c.querySelector('.t-wrap').classList.remove('is-flipped');
          c.classList.remove('is-expanded');
          c.setAttribute('aria-disabled','false');
          c.setAttribute('aria-pressed','false');

          flipMove(c, ()=>{
            this.drawPile.appendChild(c);
            c.dataset.pile = 'draw';
            this._layoutPile('draw');
          });
        });

        requestAnimationFrame(()=>{ this._layoutAll(); this._updateTop(); });
      }, 220);
    }

    _topOf(which){
      const parent = which === 'draw' ? this.drawPile : this.discardPile;
      const cards = $$('.t-card', parent);
      return cards[cards.length - 1] || null;
    }

    _updateTop(){
      $$('.t-card', this.drawPile).forEach(c=>c.classList.remove('is-top'));
      const top = this._topOf('draw');
      if (top) top.classList.add('is-top');
    }

    _layoutPile(which){
      const parent = which === 'draw' ? this.drawPile : this.discardPile;
      $$('.t-card', parent).forEach((c,i)=>{
        c.style.setProperty('--i', i);
        const wrap = c.querySelector('.t-wrap');
        wrap && wrap.style.setProperty('--rz', `${(i % 7 - 3) * 0.3}deg`);
      });
    }
    _layoutAll(){ this._layoutPile('draw'); this._layoutPile('discard'); }
  }

  const initAll = () => $$('.tarot-stack').forEach(root => new TarotStack(root));
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAll);
  else initAll();
})();
