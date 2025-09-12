/* tarot-piles.js v1.5 — mirrors example behavior; multiple cards; flip-in-place; flip-while-moving-to-discard */

(function(){
  const $$ = (sel, el=document) => Array.from(el.querySelectorAll(sel));

  // FLIP for position+size change on the moving container (.t-card)
  function flip(el, mutate, dur='520ms', ease='cubic-bezier(.2,.7,.2,1)'){
    const first = el.getBoundingClientRect();
    mutate(); // reparent, change size/left/top, etc.
    const last  = el.getBoundingClientRect();

    const dx = first.left - last.left;
    const dy = first.top  - last.top;
    const sx = first.width  / last.width;
    const sy = first.height / last.height;

    el.style.transition = 'none';
    el.style.transformOrigin = 'center center';
    el.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
    el.offsetHeight; // force reflow
    el.style.transition = `transform ${dur} ${ease}`;
    el.style.transform = '';
  }

  class Tarot {
    constructor(root){
      this.root = root;
      this.draw  = root.querySelector('[data-role="draw"]');
      this.disc  = root.querySelector('[data-role="discard"]');

      // Build cards from templates (unique backs supported)
      const defs = $$('.t-def', root);
      const frag = document.createDocumentFragment();
      this.cards = [];

      defs.forEach((def, i)=>{
        const c = this._makeCard(def, i);
        frag.appendChild(c);
        this.cards.push(c);
      });
      this.draw.appendChild(frag);

      this._layoutAll();
      this._updateTop();
      this._bind();
    }

    _makeCard(def, i){
      const backURL = def.getAttribute('data-back') || '';
      const card = document.createElement('div');
      card.className = 't-card';
      card.dataset.pile = 'draw';
      card.setAttribute('role','button');
      card.setAttribute('aria-pressed','false');

      // movement left/top: stagger in each pile
      card.style.left = `calc(1rem + ${i} * var(--pile-gap))`;
      card.style.top  = `calc(1rem + ${i} * var(--pile-gap))`;

      const scale = document.createElement('div');
      scale.className = 't-scale';
      scale.style.setProperty('--fan', `${(i % 7 - 3) * 0.3}deg`);

      const flipWrap = document.createElement('div');
      flipWrap.className = 't-flip';

      const back = document.createElement('div');
      back.className = 't-face t-back';
      if (backURL) back.style.backgroundImage = `url("${backURL}")`;

      const front = document.createElement('div');
      front.className = 't-face t-front';
      const content = document.createElement('div');
      content.className = 't-content';
      content.innerHTML = def.innerHTML || '';
      front.appendChild(content);

      flipWrap.append(back, front);
      scale.appendChild(flipWrap);
      card.appendChild(scale);
      return card;
    }

    _bind(){
      this.root.addEventListener('click', (e)=>{
        const card = e.target.closest('.t-card');
        if (!card) return;

        const top = this._top(this.draw);
        const flipWrap = card.querySelector('.t-flip');
        const scaler   = card.querySelector('.t-scale');

        // Only the top draw card is interactive (or ignore clicks in discard)
        if (card.dataset.pile !== 'draw' || card !== top) return;

        const isFront = flipWrap.classList.contains('is-flipped') === false;

        if (isFront){
          // FIRST CLICK: flip to front in place + slight scale (like example)
          scaler.classList.add('is-active');
          flipWrap.classList.add('is-flipped');
          card.setAttribute('aria-pressed','true');
          // keep it visually top-most
          card.style.zIndex = 300 + $$('.t-card', this.draw).length;
        } else {
          // SECOND CLICK: unflip WHILE flying to discard (single FLIP)
          // Rotation happens on .t-flip; movement on .t-card. Apply both together.
          flipWrap.classList.remove('is-flipped');
          scaler.classList.remove('is-active');

          flip(card, ()=>{
            // reparent to discard and restagger
            this.disc.appendChild(card);
            card.dataset.pile = 'discard';
            this._restagger(this.disc);
          }, getComputedStyle(this.root).getPropertyValue('--move-ms').trim(), getComputedStyle(this.root).getPropertyValue('--ease').trim());

          const onDone = () => {
            card.removeEventListener('transitionend', onDone);
            card.setAttribute('aria-pressed','false');
            card.setAttribute('aria-disabled','true'); // discard is inert
            this._updateTop();
            this._maybeShuffle();
          };
          card.addEventListener('transitionend', onDone, {once:true});
        }
      });
    }

    _maybeShuffle(){
      if (this.draw.querySelector('.t-card')) return;

      const cards = $$('.t-card', this.disc);
      // wiggle for feedback
      cards.forEach((c,i)=> c.querySelector('.t-flip').classList.add('shuffle'));

      setTimeout(()=>{
        // randomize order
        const shuffled = cards.sort(()=>Math.random() - 0.5);
        shuffled.forEach((c,i)=>{
          const wrap = c.querySelector('.t-flip');
          wrap.classList.remove('shuffle', 'is-flipped');
          c.querySelector('.t-scale').classList.remove('is-active');
          c.setAttribute('aria-disabled','false');

          flip(c, ()=>{
            this.draw.appendChild(c);
            c.dataset.pile = 'draw';
            this._restagger(this.draw);
          }, getComputedStyle(this.root).getPropertyValue('--move-ms').trim(), getComputedStyle(this.root).getPropertyValue('--ease').trim());
        });

        requestAnimationFrame(()=> this._updateTop());
      }, 220);
    }

    _top(container){ const list = $$('.t-card', container); return list[list.length-1] || null; }

    _updateTop(){
      $$('.t-card', this.draw).forEach(c=>c.classList.remove('is-top'));
      const t = this._top(this.draw);
      if (t) t.classList.add('is-top');
    }

    _restagger(container){
      $$('.t-card', container).forEach((c,i)=>{
        c.style.left = `calc(1rem + ${i} * var(--pile-gap))`;
        c.style.top  = `calc(1rem + ${i} * var(--pile-gap))`;
        c.querySelector('.t-scale').style.setProperty('--fan', `${(i % 7 - 3) * 0.3}deg`);
        c.style.zIndex = 100 + i;
      });
    }

    _layoutAll(){ this._restagger(this.draw); this._restagger(this.disc); }
  }

  // auto-init
  const init = () => $$('.tarot-stack').forEach(node => new Tarot(node));
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
