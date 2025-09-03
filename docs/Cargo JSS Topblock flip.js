/* Topblock Flip v1.1 — directional easing, no un-hover lag
   Opt-in via Image Block Clickthrough URL:  <a href="#flip-top">
   Desktop: hover flips (ease-in), un-hover flips back (ease-out), immediate
   Mobile: tap flips; outside click/tap (not a link/control) flips back
   While flipped, clicks are forwarded to elements underneath
   No DOM reparenting; resets on viewport exit; SPA-safe; Externalized;
   Fixed selector for footer injection
*/

(function () {
  // Run whether or not DOMContentLoaded already fired
  function onReady(fn){
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  }

  onReady(function initTopblock(){
    // Anchor-based opt-in (or allow an actual #flip-top marker if you add one)
    if (!document.querySelector('#flip-top, a[href="#flip-top"]')) {
      console.info('[Topblock] no #flip-top marker/anchor found; skipping');
      return;
    }

    var COARSE  = '(hover: none), (pointer: coarse)';
    var FINE    = '(hover: hover) and (pointer: fine)';
    var LINKISH = 'a, [role="link"], button, [role="button"], input, textarea, select, summary, [contenteditable="true"]';

    function isCoarse(){ return window.matchMedia(COARSE).matches; }
    function isFine(){ return window.matchMedia(FINE).matches; }

    function closestSection(el){
      while (el && el !== document.body){
        if (el.matches('.page-section, [data-section-id], section')) return el;
        el = el.parentElement;
      }
      return null;
    }

    function markSection(section){
      if (!section || section.__flipBound) return;
      section.__flipBound = true;
      section.classList.add('flip-section');
    }

    // Choose a stable internal element to rotate (no layout collapse)
    function pickFlipTarget(block){
      return block.querySelector('figure.image-block-figure')
          || block.querySelector('.image-block-outer-wrapper')
          || block.querySelector('.intrinsic')
          || block.querySelector('.image-block-wrapper')
          || block.querySelector('img')
          || block;
    }

    // Two-RAF to ensure ease class applies before transform toggles
    function nextFrame(fn){ requestAnimationFrame(function(){ requestAnimationFrame(fn); }); }

    function setEase(block, mode){
      if (mode === 'enter'){ block.classList.remove('ease-exit'); }
      else if (mode === 'exit'){ block.classList.add('ease-exit'); }
    }

    // Forward pointer/mouse events to whatever is under a flipped block
    function forwardEvent(e, block){
      if (!block.classList.contains('is-flipped')) return;
      var prev = block.style.pointerEvents;
      block.style.pointerEvents = 'none';
      var target = document.elementFromPoint(e.clientX, e.clientY);
      block.style.pointerEvents = prev;
      if (!target || target === block) return;

      var evt = new e.constructor(e.type, {
        bubbles: true, cancelable: true, view: window,
        clientX: e.clientX, clientY: e.clientY, screenX: e.screenX, screenY: e.screenY,
        ctrlKey: e.ctrlKey, shiftKey: e.shiftKey, altKey: e.altKey, metaKey: e.metaKey,
        button: e.button, buttons: e.buttons
      });
      target.dispatchEvent(evt);
      e.preventDefault(); e.stopPropagation();
    }

    function setupFlipBlock(block){
      if (block.__flipReady) return;
      var marker = block.querySelector('a[href="#flip-top"]');
      if (!marker) return; // opt-in only

      block.__flipReady = true;
      block.classList.add('flip-top');

      var target  = pickFlipTarget(block);
      target.classList.add('flip-target');

      var section = closestSection(block);
      markSection(section);

      // Prevent marker navigation (used only as a trigger)
      marker.addEventListener('click', function(e){
        if (!block.classList.contains('is-flipped')){ e.preventDefault(); e.stopPropagation(); }
      }, true);

      // DESKTOP: hover-in → ENTER curve; leave → EXIT curve
      block.addEventListener('mouseenter', function(){
        if (!isFine()) return;
        setEase(block, 'enter');
        nextFrame(function(){ block.classList.add('is-flipped'); });
      });

      block.addEventListener('mouseleave', function(){
        if (!isFine()) return;
        setEase(block, 'exit');
        nextFrame(function(){ block.classList.remove('is-flipped'); });
      });

      // MOBILE: tap to flip (enter)
      block.addEventListener('click', function(e){
        if (!isCoarse()) return;
        if (!block.classList.contains('is-flipped')){
          e.preventDefault(); e.stopPropagation();
          setEase(block, 'enter');
          nextFrame(function(){ block.classList.add('is-flipped'); });
        }
      }, true);

      // While flipped, forward click-ish events to underlying elements
      ['pointerdown','pointerup','mousedown','mouseup','click'].forEach(function(type){
        block.addEventListener(type, function(e){ forwardEvent(e, block); }, true);
      });

      // Clean up the ease-exit flag after the transition completes
      target.addEventListener('transitionend', function(ev){
        if (ev.propertyName === 'transform'){ block.classList.remove('ease-exit'); }
      });

      // Reset when leaving viewport (use exit curve)
      if ('IntersectionObserver' in window){
        var io = new IntersectionObserver(function(entries){
          entries.forEach(function(entry){
            if (!entry.isIntersecting && block.classList.contains('is-flipped')){
              setEase(block, 'exit');
              nextFrame(function(){ block.classList.remove('is-flipped'); });
            }
          });
        }, { threshold: 0.05 });
        io.observe(block);
      }
    }

    function scan(root){
      (root || document).querySelectorAll('.sqs-block.image-block').forEach(function(block){
        if (block.querySelector('a[href="#flip-top"]')) setupFlipBlock(block);
      });
    }

    // Initial scan (ready-safe)
    scan(document);

    // Outside click/tap (not on a link/control) → EXIT curve then unflip all
    document.addEventListener('click', function(e){
      if (e.target.closest('.flip-top')) return;
      if (e.target.closest(LINKISH)) return;
      document.querySelectorAll('.flip-top.is-flipped').forEach(function(b){
        setEase(b, 'exit');
        nextFrame(function(){ b.classList.remove('is-flipped'); });
      });
    }, true);

    // SPA / lazy-load safety
    new MutationObserver(function(muts){
      muts.forEach(function(m){
        m.addedNodes.forEach(function(n){
          if (!(n instanceof Element)) return;
          if (n.matches && n.matches('.sqs-block.image-block')){
            if (n.querySelector('a[href="#flip-top"]')) setupFlipBlock(n);
          } else {
            scan(n);
          }
        });
      });
    }).observe(document.documentElement, { childList: true, subtree: true });

    console.log('[Topblock] init complete');
  });
})();
