/* Topblock Flip v1.4 — non-destructive wrap + directional duration/easing + real click-through */

(function(){
  function ready(fn){ if (document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn, {once:true}); }
  var COARSE='(hover: none), (pointer: coarse)', FINE='(hover: hover) and (pointer: fine)';
  function isCoarse(){ return matchMedia(COARSE).matches; }
  function isFine(){ return matchMedia(FINE).matches; }

  function closestSection(el){
    while(el && el!==document.body){
      if (el.matches('.page-section, [data-section-id], section')) return el;
      el = el.parentElement;
    }
    return null;
  }

  function pickFlipTarget(block){
    return block.querySelector('figure.image-block-figure')
        || block.querySelector('.image-block-outer-wrapper')
        || block.querySelector('.intrinsic')
        || block.querySelector('.image-block-wrapper')
        || block.querySelector('img')
        || block;
  }

  // Force the browser to commit current styles before we toggle transform.
  function flush(el){
    try { void el.offsetWidth; } catch(_) {}
  }

  function setEase(block, mode){
    block.classList.toggle('ease-enter', mode === 'enter');
    block.classList.toggle('ease-exit',  mode === 'exit');
  }

  function nextFrame(fn){ requestAnimationFrame(function(){ requestAnimationFrame(fn); }); }

  function isActive(block){ return block.classList.contains('hover') || block.classList.contains('is-flipped'); }

  function getPoint(e){
    if ('clientX' in e) return {x:e.clientX, y:e.clientY};
    var t=(e.changedTouches&&e.changedTouches[0])||(e.touches&&e.touches[0]);
    return t?{x:t.clientX,y:t.clientY}:{x:0,y:0};
  }

  function forwardEvent(e, block){
    if (!isActive(block)) return;
    var pt=getPoint(e);
    var stack=(document.elementsFromPoint&&document.elementsFromPoint(pt.x,pt.y))||[];
    var under=null;
    for (var i=0;i<stack.length;i++){ if (!block.contains(stack[i])) { under=stack[i]; break; } }
    if (!under) return;

    var clickable = under.closest && under.closest('a,button,[role="button"],[role="link"],label,summary,input,textarea,select');
    if (clickable){
      try{ if (e.type==='pointerdown'||e.type==='mousedown') clickable.focus(); clickable.click(); }catch(_){}
    } else {
      var clone=new e.constructor(e.type,{bubbles:true,cancelable:true,view:window,clientX:pt.x,clientY:pt.y,
        ctrlKey:e.ctrlKey||false,shiftKey:e.shiftKey||false,altKey:e.altKey||false,metaKey:e.metaKey||false,
        button:e.button||0,buttons:e.buttons||0});
      under.dispatchEvent(clone);
    }
    e.preventDefault(); e.stopPropagation();
  }

  function flipEnter(block){
    setEase(block,'enter');                 // pick enter timing + duration
    if (block.__flipInner) flush(block.__flipInner);  // lock it in
    nextFrame(function(){ block.classList.add('hover'); });
  }

  function flipExit(block){
    setEase(block,'exit');                  // pick exit timing + duration
    if (block.__flipInner) flush(block.__flipInner);
    nextFrame(function(){ block.classList.remove('hover'); });
  }

  function setupBlock(block){
    if (block.__flipReady) return;
    var anchor = block.querySelector('a[href="#flip-top"]');
    if (!anchor) return; // opt-in only
    block.__flipReady = true;
    block.classList.add('flip-top');

    // neutralize the anchor
    anchor.style.pointerEvents='none'; anchor.style.cursor='default';
    anchor.setAttribute('aria-hidden','true'); anchor.setAttribute('tabindex','-1');

    // NON-DESTRUCTIVE: wrap only the figure target
    var target = pickFlipTarget(block);
    if (!target || !target.parentNode) return;

    var inner = document.createElement('div'); inner.className='flip-inner';
    var front = document.createElement('div'); front.className='flip-front';
    var back  = document.createElement('div'); back.className='flip-back';

    target.parentNode.insertBefore(inner, target);
    front.appendChild(target);
    inner.appendChild(front);
    inner.appendChild(back);

    block.__flipInner = inner; // save for flush()

    // add section perspective once
    var section = closestSection(block);
    if (section && !section.__flipSection){ section.__flipSection=true; section.classList.add('flip-section'); }

    // Desktop: manage hover via JS so we can set direction before transform
    if (isFine()){
      block.addEventListener('mouseenter', function(){ flipEnter(block); });
      block.addEventListener('mouseleave', function(){ flipExit(block);  });
    }

    // Mobile: tap to flip (enter)
    block.addEventListener('click', function(e){
      if (!isCoarse()) return;
      if (!block.classList.contains('is-flipped')){
        e.preventDefault(); e.stopPropagation();
        setEase(block,'enter'); if (inner) flush(inner);
        nextFrame(function(){ block.classList.add('is-flipped'); });
      }
    }, true);

    // Click-through while flipped/hovered
    ['pointerdown','pointerup','mousedown','mouseup','click','touchstart','touchend'].forEach(function(type){
      block.addEventListener(type, function(e){ forwardEvent(e, block); }, true);
    });

    // Auto-reset off-screen (exit)
    if ('IntersectionObserver' in window){
      var io=new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if (!entry.isIntersecting && block.classList.contains('is-flipped')){
            flipExit(block);
            nextFrame(function(){ block.classList.remove('is-flipped'); });
          }
        });
      },{threshold:0.05});
      io.observe(block);
    }
  }

  ready(function(){
    document.querySelectorAll('.sqs-block.image-block').forEach(function(blk){
      if (blk.querySelector('a[href="#flip-top"]')) setupBlock(blk);
    });

    // Mobile: tap blank space to unflip all (exit)
    document.addEventListener('click', function(e){
      if (!isCoarse()) return;
      if (e.target.closest('a,button,[role="button"],[role="link"],input,textarea,select,summary')) return;
      document.querySelectorAll('.flip-top.is-flipped').forEach(function(b){
        setEase(b,'exit'); if (b.__flipInner) flush(b.__flipInner);
        nextFrame(function(){ b.classList.remove('is-flipped'); });
      });
    }, true);

    // SPA/lazy
    new MutationObserver(function(muts){
      muts.forEach(function(m){
        m.addedNodes.forEach(function(n){
          if (!(n instanceof Element)) return;
          if (n.matches && n.matches('.sqs-block.image-block')){
            if (n.querySelector('a[href="#flip-top"]')) setupBlock(n);
          } else {
            n.querySelectorAll && n.querySelectorAll('.sqs-block.image-block').forEach(function(blk){
              if (blk.querySelector('a[href="#flip-top"]')) setupBlock(blk);
            });
          }
        });
      });
    }).observe(document.documentElement,{childList:true,subtree:true});
  });
})();
