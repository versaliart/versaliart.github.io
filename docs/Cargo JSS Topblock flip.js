/* Topblock v2.0 */
(function(){
  /**
   * Split-Flip Doors for Topblock
   * - Finds .flip-top blocks that already have .flip-inner and .flip-front with --flip-image
   * - Injects a .flip-doors with two hinged halves sharing the same image
   * - Adds a click handler (optional) and exposes a tiny API:
   *     window.TopblockDoors.open(el)
   *     window.TopblockDoors.close(el)
   *     window.TopblockDoors.toggle(el)
   */

  // Utility: get CSS variable value even if written as url("...") / url(...)
  function getVar(el, name){
    const v = getComputedStyle(el).getPropertyValue(name).trim();
    return v || null;
  }

  function ensureDoors(flipTop){
    if (flipTop.__doorsReady) return;
    const inner = flipTop.querySelector('.flip-inner');
    const front = flipTop.querySelector('.flip-front');

    if (!inner || !front) return;

    // Read the image from existing variable (keeps your current pipeline)
    const img = getVar(front, '--flip-image') || getVar(flipTop, '--flip-image') || 'none';

    // Create doors host
    const doors = document.createElement('div');
    doors.className = 'flip-doors';

    // Create left/right doors with front/back faces
    const makeDoor = (side) => {
      const d = document.createElement('div');
      d.className = 'flip-door ' + side;

      const frontFace = document.createElement('div');
      frontFace.className = 'face front';
      frontFace.style.setProperty('--flip-image', img);

      const backFace = document.createElement('div');
      backFace.className = 'face back';
      backFace.style.setProperty('--flip-image', img);

      d.appendChild(frontFace);
      d.appendChild(backFace);
      return d;
    };

    doors.appendChild(makeDoor('left'));
    doors.appendChild(makeDoor('right'));

    // Put doors on top of the old front, but let clicks pass through
    inner.appendChild(doors);

    // Default state
    if (!flipTop.classList.contains('is-open') && !flipTop.classList.contains('is-closed')){
      flipTop.classList.add('is-closed');
    }

    flipTop.__doorsReady = true;
  }

  // Public API so you can drive state from your existing triggers (scroll, hover, etc.)
  const API = {
    open(el){ el.classList.remove('is-closed'); el.classList.add('is-open'); },
    close(el){ el.classList.remove('is-open'); el.classList.add('is-closed'); },
    toggle(el){
      if (el.classList.contains('is-open')) API.close(el);
      else API.open(el);
    }
  };
  window.TopblockDoors = API;

  // Init on DOM ready + editor mutations
  function init(){
    document.querySelectorAll('.flip-top').forEach(ensureDoors);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Optional: delegate click to toggle (remove if you already trigger via scroll/hover)
  document.addEventListener('click', function(ev){
    const top = ev.target.closest('.flip-top');
    if (!top) return;
    // Only toggle if the block is meant to be interactive by click;
    // if yours is scroll-driven, delete this block.
    API.toggle(top);
  });

})();