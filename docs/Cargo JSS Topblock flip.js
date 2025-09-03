/* Topblock Flip v1.40 — overlay doors: no DOM moves, preserve Squarespace layout */
(function(){
  function ready(fn){ if (document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn, {once:true}); }
  var COARSE='(hover: none), (pointer: coarse)', FINE='(hover: hover) and (pointer: fine)';
  function isCoarse(){ return matchMedia(COARSE).matches; }
  function isFine(){ return matchMedia(FINE).matches; }

  function closestSection(el){
    while (el && el!==document.body){
      if (el.matches('.page-section, [data-section-id], section')) return el;
      el = el.parentElement;
    }
    return null;
  }

  /* Choose the element that visually matches the image box; DO NOT MOVE IT */
  function pickAnchor(block){
    return block.querySelector('.intrinsic')                      /* preferred: aspect-ratio box */
        || block.querySelector('figure.image-block-figure')
        || block.querySelector('.image-block-outer-wrapper')
        || block.querySelector('.image-block-wrapper')
        || block.querySelector('img')
        || block;
  }

  function setEase(block, mode){
    block.classList.toggle('ease-enter', mode === 'enter');
    block.classList.toggle('ease-exit',  mode === 'exit');
  }
  function nextFrame(fn){ requestAnimationFrame(function(){ requestAnimationFrame(fn); }); }

  // Copy the visible <img> URL into CSS on the anchor and flag readiness
  function exposeImageToCSS(anchor, block){
    var img = anchor.querySelector('img') || block.querySelector('img');

    function pickSrc(el){
      if (!el) return "";
      return el.currentSrc
          || el.getAttribute('data-src')
          || el.getAttribute('data-image')
          || el.src
          || "";
    }

    function setVar(){
      var src = pickSrc(img);
      if (src){
        anchor.style.setProperty('--flip-image', 'url("'+ src +'")');
        block.classList.add('doors-ready');
      } else {
        block.classList.remove('doors-ready');
      }
    }

    if (img){
      setVar();
      img.addEventListener('load', setVar, {passive:true});
      if ('MutationObserver' in window){
        new MutationObserver(setVar)
          .observe(img, {attributes:true, attributeFilter:['src','data-src','data-image','srcset']});
      }
    }
  }

  function setupBlock(block){
    if (block.__flipReady) return;
    var marker = block.querySelector('a[href="#flip-top"]');
    if (!marker) return; // opt-in only
    block.__flipReady = true;
    block.classList.add('flip-top');

    // Add section perspective once
    var section = closestSection(block);
    if (section && !section.__flipSection){ section.__flipSection = true; section.classList.add('flip-section'); }

    // Choose anchor (no DOM changes), mark it for CSS
    var anchor = pickAnchor(block);
    if (!anchor) return;
    anchor.classList.add('flip-anchor');

    // Neutralize the marker (pure flag)
    marker.style.pointerEvents='none';
    marker.style.cursor='default';
    marker.setAttribute('aria-hidden','true');
    marker.setAttribute('tabindex','-1');

    // Desktop hover state (for doors)
    if (isFine()){
      block.addEventListener('mouseenter', function(){ setEase(block,'enter'); nextFrame(function(){ block.classList.add('hover'); }); });
      block.addEventListener('mouseleave', function(){ setEase(block,'exit');  nextFrame(function(){ block.classList.remove('hover'); }); });
    }

    // Mobile tap state
    block.addEventListener('click', function(e){
      if (!isCoarse()) return;
      if (!block.classList.contains('is-flipped')){
        e.preventDefault(); e.stopPropagation();
        setEase(block,'enter');
        nextFrame(function(){ block.classList.add('is-flipped'); });
      }
    }, true);

    // Expose image URL & gate readiness
    exposeImageToCSS(anchor, block);

    // Optional: reset when off-screen
    if ('IntersectionObserver' in window){
      var io=new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if (!entry.isIntersecting && block.classList.contains('is-flipped')){
            setEase(block,'exit');
            nextFrame(function(){ block.classList.remove('is-flipped'); });
          }
        });
      },{threshold:0.05});
      io.observe(block);
    }
  }

  function scan(){
    document.querySelectorAll('.sqs-block.image-block').forEach(function(blk){
      if (blk.querySelector('a[href="#flip-top"]')) setupBlock(blk);
    });
  }

  ready(function(){
    scan();
    // SPA/lazy: watch for new image blocks
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
