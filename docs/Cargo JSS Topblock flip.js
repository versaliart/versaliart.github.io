/* v2.1 */
(function(){
  /**
   * Auto-opt-in any Squarespace image block whose link has href="#flip-top".
   * Injects two “doors” over the image and uses the image URL as the background.
   */

  function buildDoors(url){
    const doors = document.createElement('div');
    doors.className = 'flip-doors';
    const makeDoor = side => {
      const d = document.createElement('div');
      d.className = 'flip-door ' + side;
      const front = document.createElement('div');
      front.className = 'face front';
      front.style.backgroundImage = `url("${url}")`;
      const back  = document.createElement('div');
      back.className = 'face back';
      back.style.backgroundImage = `url("${url}")`;
      d.appendChild(front); d.appendChild(back);
      return d;
    };
    doors.appendChild(makeDoor('left'));
    doors.appendChild(makeDoor('right'));
    return doors;
  }

  function initOne(block){
    if (block.classList.contains('flip-top')) return; // already done
    const container = block.querySelector('.fluid-image-container');
    const img = block.querySelector('img[data-sqsp-image-block-image]');
    if (!container || !img) return;

    // Use the actual rendered source (handles srcset)
    const url = img.currentSrc || img.src;
    if (!url) return;

    // Mark + inject
    block.classList.add('flip-top');
    const doors = buildDoors(url);
    container.appendChild(doors);
  }

  function initAll(){
    // Opt-in rule: the block contains an <a> with href="#flip-top"
    document.querySelectorAll('.sqs-block.image-block').forEach(block => {
      const link = block.querySelector('a.sqs-block-image-link[href="#flip-top"]');
      if (link) initOne(block);
    });
  }

  // Run now and on dynamic changes (Squarespace editor / lazy loads)
  const ready = () => { initAll(); };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ready);
  } else {
    ready();
  }
  const mo = new MutationObserver(ready);
  mo.observe(document.documentElement, { childList:true, subtree:true });
})();