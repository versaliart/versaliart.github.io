/* Scrollify — only for the section that has [data-snap-scrollify] and its next sibling */

whenSelector('[data-snap-scrollify]', function (marker) {
  // 1) Ensure jQuery is present (Squarespace 7.1 may not include it on all templates)
  var needjQ = !window.jQuery;
  (needjQ
    ? loadScript('https://cdnjs.cloudflare.com/ajax/libs/jquery/3.7.1/jquery.min.js')
    : Promise.resolve()
  )
  // 2) Load Scrollify (jQuery plugin)
  .then(function () {
    return loadScript('https://cdnjs.cloudflare.com/ajax/libs/scrollify/1.0.21/jquery.scrollify.min.js');
  })
  .then(function () {
    var $ = window.jQuery;
    var section = marker.closest('section.page-section, section');
    if (!section) return;
    var next = section.nextElementSibling;
    if (!next) return;

    // Give the two target sections a unique class so Scrollify only manages these
    var uid = 'snapify-' + Math.random().toString(36).slice(2, 8);
    section.classList.add(uid);
    next.classList.add(uid);

    var offsetTop = parseInt(marker.dataset.offsetTop || '0', 10);

    // Initialize Scrollify just for these two sections
    $.scrollify({
      section: '.' + uid,
      // Important: don't force heights; let your Squarespace layout breathe
      setHeights: false,
      // Keep normal scrollbars visible
      scrollbars: true,
      // Allow inner overflow scrolling within each section
      overflowScroll: true,
      // Handle touch scrolling
      touchScroll: true,
      // Don’t modify URL hashes
      updateHash: false,
      // Align with sticky header if you have one
      offset: offsetTop,
      // If you have areas that should scroll normally inside a panel, mark them with data-standard-scroll
      standardScrollElements: '[data-standard-scroll]',
      // Optional callbacks for debugging
      afterRender: function () {
        if (marker.dataset.debug === 'true') console.log('[Scrollify] ready on', section, next);
      },
      afterResize: function () {
        // Recalculate panel positions on resize/content changes
        $.scrollify.update();
      }
    });

    // Also update on orientation changes / major resizes
    window.addEventListener('resize', function () { $.scrollify.update(); }, { passive: true });
  })
  .catch(function (err) {
    console.warn('[Loader] Scrollify failed', err);
  });
});