/* Motif Rails v1.31 — diagnostics + force flags */
(function(){
  if (!('ResizeObserver' in window)) { console.warn('[motif] no ResizeObserver'); return; }
  const root = document.documentElement, body = document.body;
  const Q = new URLSearchParams(location.search);
  const FORCE = Q.has('motifforce');   // force on regardless of breakpoints/gutters
  const DBG   = Q.has('motifdebug');   // paint debug backgrounds + logs

  const log = (...a)=>{ if (DBG) console.log('[motif]', ...a); };

  function onReady(fn){
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn, { once:true });
  }
  function remPx(){ return parseFloat(getComputedStyle(root).fontSize) || 16; }
  function cssPx(name, fallback){
    try{
      const v = getComputedStyle(body).getPropertyValue(name).trim();
      if (!v) return fallback;
      const n = parseFloat(v); if (isNaN(n)) return fallback;
      if (v.endsWith('rem')) return n * remPx();
      if (v.endsWith('em'))  return n * (parseFloat(getComputedStyle(body).fontSize)||16);
      return n;
    }catch(e){ return fallback; }
  }

  // Default ON; page-level opt-out
  function applyMotifsPageToggle(){
    const hasOptOut = !!document.getElementById('motifs-disable');
    body.classList.toggle('has-motifs', FORCE || !hasOptOut);
    log('page toggle → has-motifs:', body.classList.contains('has-motifs'), '(optOut:', hasOptOut, 'force:', FORCE, ')');
  }

  const pageToggleMO = new MutationObserver(applyMotifsPageToggle);
  pageToggleMO.observe(document.documentElement, { childList:true, subtree:true });

  function getSections(){
    const list = Array.from(document.querySelectorAll(
      [
        '.page-section',
        'section[data-section-id]',
        'section.sqs-section',
        '.Index-page-content section',
        'main section',
        '#content section'
      ].join(',')
    ));
    return list.filter(s => s.offsetParent !== null);
  }
  function sectionIsOff(sec){
    return sec.classList.contains('motifs-off') ||
           !!sec.querySelector('.motifs-off, [data-motifs="off"], #motifs-disable-section');
  }
  function enabledRangesWithin(boundsTop, boundsBottom){
    const secs = getSections();
    const ranges = [];
    if (!secs.length){
      log('no sections found; falling back to full range');
      ranges.push({ top: boundsTop, bottom: boundsBottom });
      return ranges;
    }
    for (const sec of secs){
      if (sectionIsOff(sec)) continue;
      const r = sec.getBoundingClientRect();
      const top = Math.max(boundsTop, r.top + scrollY);
      const bot = Math.min(boundsBottom, r.bottom + scrollY);
      if (bot > top + 2) ranges.push({ top, bottom: bot });
    }
    return ranges;
  }

  function findBounds(){
    const secs = getSections();
    const first = secs[0] || document.querySelector('main') || document.body;
    const footer = document.querySelector('footer');
    const topY = first ? (first.getBoundingClientRect().top + scrollY) : 0;
    const bottomY = footer ? (footer.getBoundingClientRect().top + scrollY) : document.body.scrollHeight;
    return { topY, bottomY };
  }
  function findContentColumn(){
    const candidates = document.querySelectorAll(
      '.sqs-layout, .Index-page-content, .content, .site-content, main, #content'
    );
    for (const el of candidates){
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) return r;
    }
    const first = getSections()[0];
    return first ? first.getBoundingClientRect() : document.body.getBoundingClientRect();
  }

  let railsEl = null;
  function clearRails(){
    if (railsEl && railsEl.parentNode) railsEl.parentNode.removeChild(railsEl);
    railsEl = null;
  }

  function buildRails(){
    clearRails();

    if (!body.classList.contains('has-motifs') && !FORCE){
      log('bail: has-motifs missing and not forced');
      return;
    }

    const hideBp    = cssPx('--motif-hide-bp', 820);
    const minGutter = cssPx('--motif-min-gutter', 96);

    if (!FORCE && window.innerWidth < hideBp){
      log('bail: below breakpoint', window.innerWidth, '<', hideBp);
      return;
    }

    const { topY, bottomY } = findBounds();
    const contentRect = findContentColumn();

    const leftGutter  = Math.max(0, contentRect.left);
    const rightGutter = Math.max(0, window.innerWidth - contentRect.right);
    if (!FORCE && (leftGutter < minGutter || rightGutter < minGutter)){
      log('bail: gutters too small', { leftGutter, rightGutter, minGutter });
      return;
    }

    const railW  = cssPx('--motif-rail-width', 32);
    const railIn = cssPx('--motif-rail-inset', 12);
    const segLen = cssPx('--motif-seg-length', 200);
    const segGap = cssPx('--motif-seg-gap', 24);
    const capH   = cssPx('--motif-cap-height', 24);

    const leftX  = Math.round((leftGutter * 0.5) - (railW * 0.5) + railIn);
    const rightX = Math.round(window.innerWidth - (rightGutter * 0.5) - (railW * 0.5) - railIn);

    railsEl = document.createElement('div');
    railsEl.className = 'motif-rails';
    Object.assign(railsEl.style, {
      position: 'absolute',
      left: '0',
      right: '0',
      top: `${topY}px`,
      height: `${Math.max(0, bottomY - topY)}px`,
      pointerEvents: 'none',
      zIndex: '1',
      opacity: getComputedStyle(body).getPropertyValue('--motif-opacity') || (DBG ? '1' : '0.55')
    });
    document.body.appendChild(railsEl);

    const ranges = enabledRangesWithin(topY, bottomY);
    if (!ranges.length){
      log('bail: no enabled ranges (every section opted out?)');
      return;
    }

    function makeRailRange(x, rangeTop, rangeBot){
      const h = Math.max(0, rangeBot - rangeTop);
      if (h < 4) return;
      const rail = document.createElement('div');
      rail.className = 'motif-rail';
      Object.assign(rail.style, {
        position: 'absolute',
        left: `${x}px`,
        top: `${rangeTop - topY}px`,
        height: `${h}px`,
        width: 'var(--motif-rail-width)'
      });
      railsEl.appendChild(rail);

      const usable = h;
      let count = Math.max(1, Math.floor((usable + segGap) / (segLen + segGap)));
      const totalSegSpace = count * segLen;
      const free = Math.max(0, usable - totalSegSpace);
      const gap = count > 1 ? (free / (count - 1)) : 0;

      let cursor = 0;
      for (let i = 0; i < count; i++){
        const seg = document.createElement('div');
        seg.className = 'motif-seg';
        Object.assign(seg.style, {
          position: 'absolute',
          top: `${cursor + capH}px`,
          left: '0',
          width: '100%',
          height: `${segLen}px`,
          background: DBG ? 'repeating-linear-gradient(0deg, rgba(255,200,0,.25), rgba(255,200,0,.25) 8px, transparent 8px, transparent 16px)' : ''
        });
        const center = document.createElement('div');
        center.className = 'motif-center';
        if (DBG){
          Object.assign(center.style, {
            outline: '1px dashed rgba(180,120,0,.8)',
            width: 'var(--motif-center-size, 24px)',
            height: 'var(--motif-center-size, 24px)'
          });
        }
        seg.appendChild(center);
        rail.appendChild(seg);
        cursor += segLen + gap;
      }
    }

    for (const rg of ranges){
      makeRailRange(leftX,  rg.top, rg.bottom);
      makeRailRange(rightX, rg.top, rg.bottom);
    }

    log('built rails:', { topY, bottomY, leftGutter, rightGutter, leftX, rightX, ranges: ranges.length });
  }

  const ro = new ResizeObserver(buildRails);
  ro.observe(document.documentElement);
  const mo = new MutationObserver(buildRails);
  mo.observe(document.documentElement, { childList:true, subtree:true, attributes:true, attributeFilter:['style','class'] });
  window.addEventListener('resize', buildRails, { passive:true });
  window.addEventListener('load',   buildRails, { once:true, passive:true });

  onReady(() => {
    applyMotifsPageToggle();
    // give the DOM a tick to settle if script loads very early
    requestAnimationFrame(()=>requestAnimationFrame(buildRails));
  });
})();
