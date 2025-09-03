/* Topblock Flip v1.0 — directional easing + real click-through
   Opt-in via Image Block Clickthrough URL: <a href="#flip-top">
   Desktop: hover flips (ease-in/out)
   Mobile: tap flips; tap outside (not control) resets
   Click-through: while rotated, forward clicks to underlying content
*/

(function(){
  // -------- utilities --------
  function ready(fn){ if (document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn, {once:true}); }
  function closestSection(el){
    while(el && el!==document.body){
      if(el.matches('.page-section, [data-section-id], section')) return el;
      el = el.parentElement;
    }
    return null;
  }
  var COARSE = '(hover: none), (pointer: coarse)';
  var FINE   = '(hover: hover) and (pointer: fine)';
  function isCoarse(){ return matchMedia(COARSE).matches; }
  function isFine(){ return matchMedia(FINE).matches; }

  // active = “visually flipped right now”
  function isActive(block){
    // desktop flips via :hover; mobile via .is-flipped
    return (isFine() && block.matches(':hover')) || block.classList.contains('is-flipped');
  }

  // robust coords for mouse/pointer/touch
  function getPoint(e){
    if ('clientX' in e && 'clientY' in e) return {x: e.clientX, y: e.clientY};
    var t = (e.changedTouches && e.changedTouches[0]) || (e.touches && e.touches[0]);
    return t ? {x: t.clientX, y: t.clientY} : {x: 0, y: 0};
  }

  // forward event to the first element under the block
  function forwardEvent(e, block){
    if (!isActive(block)) return;
    var pt = getPoint(e);
    var stack = (document.elementsFromPoint && document.elementsFromPoint(pt.x, pt.y)) || [];
    var under = null;
    for (var i=0; i<stack.length; i++){
      var el = stack[i];
      if (!block.contains(el)) { under = el; break; }
    }
    if (!under) return;

    // Prefer forwarding to a clickable ancestor
    var clickable = under.closest && under.closest('a,button,[role="button"],[role="link"],label,summary,input,textarea,select');
    if (clickable){
      // focus early for inputs on down events
      if ((e.type === 'pointerdown' || e.type === 'mousedown') && typeof clickable.focus === 'function'){
        try { clickable.focus(); } catch(_){}
      }
      // .click() triggers default action (navigation) unlike dispatched synthetic events
      try { clickable.click(); } catch(_){}
    } else {
      // fallback: clone and dispatch the same event at the element under
      var clone = new e.constructor(e.type, {
        bubbles: true, cancelable: true, view: window,
        clientX: pt.x, clientY: pt.y, screenX: e.screenX || 0, screenY: e.screenY || 0,
        ctrlKey: e.ctrlKey || false, shiftKey: e.shiftKey || false,
        altKey: e.altKey || false, metaKey: e.metaKey || false,
        button: e.button || 0, buttons: e.buttons || 0
      });
      under.dispatchEvent(clone);
    }

    // stop the event at the flip block so the page doesn’t see a “double”
    e.preventDefault();
    e.stopPropagation();
  }

  function setupBlock(block){
    if (block.__flipReady) return;
    var marker = block.querySelector('a[href="#flip-top"]');
    if (!marker) return; // opt-in only

    block.__flipReady = true;
    block.classList.add('flip-top');

    // neutralize the marker: no cursor/interaction flicker
    marker.style.pointerEvents = 'none';
    marker.style.cursor = 'default';
    marker.setAttribute('aria-hidden', 'true');
    marker.setAttribute('tabindex', '-1');

    // Build flip DOM: .flip-inner > (.flip-front [orig], .flip-back [empty])
    var inner = document.createElement('div'); inner.className = 'flip-inner';
    var front = document.createElement('div'); front.className = 'flip-front';
    var back  = document.createElement('div'); back.className  = 'flip-back';
    while(block.firstChild){ front.appendChild(block.firstChild); }
    inner.appendChild(front); inner.appendChild(back);
    block.appendChild(inner);

    // Section perspective
    var section = closestSection(block);
    if (section && !section.__flipSection){
      section.__flipSection = true;
      section.classList.add('flip-section');
    }

    // Desktop hover flips (pure CSS via :hover). No JS needed for enter/leave.

    // Mobile: tap to flip this block
    block.addEventListener('click', function(e){
      if (!isCoarse()) return;
      if (!block.classList.contains('is-flipped')){
        e.preventDefault(); e.stopPropagation();
        block.classList.add('is-flipped');
      }
    }, true);

    // Click-through while flipped/hovered
    ['pointerdown','pointerup','mousedown','mouseup','click','touchstart','touchend'].forEach(function(type){
      block.addEventListener(type, function(e){ forwardEvent(e, block); }, true);
    });

    // Auto-reset when leaving viewport
    if ('IntersectionObserver' in window){
      var io = new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if (!entry.isIntersecting) block.classList.remove('is-flipped');
        });
      }, { threshold: 0.05 });
      io.observe(block);
    }
  }

  ready(function(){
    // Scope to the section that contains this script tag
    var section = (function(sel){
      var el = document.currentScript;
      while (el && el !== document.body){
        if (el.matches && el.matches(sel)) return el;
        el = el.parentElement;
      }
      return closestSection(document.currentScript);
    })('.page-section, [data-section-id], section');

    if (section) section.classList.add('flip-section');

    var blocks = Array.from((section || document).querySelectorAll('.sqs-block.image-block'))
      .filter(function(blk){ return !!blk.querySelector('a[href="#flip-top"]'); });

    if (!blocks.length){
      console.warn('FlipTop: No Image Blocks with href="#flip-top" found in scope.');
      return;
    }

    blocks.forEach(setupBlock);

    // Mobile convenience: tap blank space in the section to reset all flips
    (section || document).addEventListener('click', function(e){
      if (!isCoarse()) return;
      if (!e.target.closest('a, button, [role="button"], [role="link"], input, textarea, select, summary')) {
        (section || document).querySelectorAll('.flip-top.is-flipped').forEach(function(b){
          b.classList.remove('is-flipped');
        });
      }
    }, true);

    // SPA / lazy-load safety: watch for new image blocks
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
    }).observe(document.documentElement, { childList: true, subtree: true });
  });
})();
