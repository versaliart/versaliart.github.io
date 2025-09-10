/* =========================================================
   Motif Rails v1.2 — universal ON, opt-out markers supported
   - Draws two decorative vertical rails (left/right gutters)
   - Spans from first content section to top of footer
   - Hides automatically on narrow viewports or tight gutters
   - PAGE opt-out: <div id="motifs-disable"></div>
   - SECTION opt-out (any one of):
       • Section class:   motifs-off
       • Marker in block: <div class="motifs-off"></div>
                          <div data-motifs="off"></div>
                          <div id="motifs-disable-section"></div>
   - Sizes/thresholds come from CSS variables on body.has-motifs:
       --motif-rail-width, --motif-rail-inset, --motif-seg-length,
       --motif-seg-gap, --motif-cap-height, --motif-center-size,
       --motif-min-gutter, --motif-hide-bp
   ========================================================= */

(function(){
  if (!('ResizeObserver' in window)) return;

  // ---------- tiny utilities ----------
  const root = document.documentElement;
  const body = document.body;

  function onReady(fn){
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn, { once:true });
  }
  function remPx(){
    return parseFloat(getComputedStyle(root).fontSize) || 16;
  }
  function cssPx(varName, fallbackPx){
    const v = getComputedStyle(body).getPropertyValue(varName).trim();
    if (!v) return fallbackPx;
    const n = parseFloat(v);
    if (isNaN(n)) return fallbackPx;
    if (v.endsWith('rem')) return n * remPx();
    if (v.endsWith('em'))  return n * (parseFloat(getComputedStyle(body).fontSize) || 16);
    return n; // px or unitless
  }

  // ---------- page-wide opt-out (default ON) ----------
  function applyMotifsPageToggle(){
    const hasOptOut = !!document.getElementById('motifs-disable');
    body.classList.toggle('has-motifs', !hasOptOut);
  }

  // Observe DOM changes so editor/page updates re-apply the toggle
  const pageToggleMO = new MutationObserver(applyMotifsPageToggle);
  pageToggleMO.observe(document.documentElement, { childList:true, subtree:true });

  // ---------- section helpers ----------
  function getSections(){
    // Squarespace 7.1 + generic fallbacks; filter hidden
    return Array.from(document.querySelectorAll(
      '.page-section, section[data-section-id], section[data-section-type], main section, #content section'
    )).filter(s => s.offsetParent !== null);
  }
  function sectionIsOff(sec){
    return (
      sec.classList.contains('motifs-off') ||
      !!sec.querySelector('.motifs-off, [data-motifs="off"], #motifs-disable-section')
    );
  }

  // Given global rails bounds, return allowed vertical ranges only where sections are NOT opted-out.
  function enabledRangesWithin(boundsTop, boundsBottom){
    const ranges = [];
    for (const sec of getSections()){
      if (sectionIsOff(sec)) continue;
      const r = sec.getBoundingClientRect();
      const top = Math.max(boundsTop, r.top + scrollY);
      const bot = Math.min(boundsBottom, r.bottom + scrollY);
      if (bot > top + 2) ranges.push({ top, bottom: bot });
    }
    return ranges;
  }

  // ---------- rails state ----------
  let railsEl = null;

  function clearRails(){
    if (railsEl && railsEl.parentNode) railsEl.parentNode.removeChild(railsEl);
    railsEl = null;
  }

  // Find top/bottom bounds (first section to top of footer)
  function findBounds(){
    const sections = getSections();
    const first = sections[0] || document.querySelector('main') || document.body;
    const footer = document.querySelector('footer');

    const topY = first ? (first.getBoundingClientRect().top + scrollY) : 0;
    const bottomY = footer
      ? (footer.getBoundingClientRect().top + scrollY)
      : document.body.scrollHeight;

    return { topY, bottomY };
  }

  // Try to detect the main content column to measure gutters
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

  // ---------- builder ----------
  function buildRails(){
    clearRails();

    // Only render if motifs are active
    if (!body.classList.contains('has-motifs')) return;

    // Thresholds
    const hideBp   = cssPx('--motif-hide-bp', 960);     // ≈ 60rem
    const minGutter= cssPx('--motif-min-gutter', 160);  // ≈ 10rem

    if (window.innerWidth < hideBp) return;

    const { topY, bottomY } = findBounds();
    const contentRect = findContentColumn();

    // Gutters (space from viewport edge to content column)
    const leftGutter  = Math.max(0, contentRect.left);
    const rightGutter = Math.max(0, window.innerWidth - contentRect.right);
    if (leftGutter < minGutter || rightGutter < minGutter) return;

    // Geometry from CSS (fallbacks in px)
    const railW   = cssPx('--motif-rail-width', 32);
    const railIn  = cssPx('--motif-rail-inset', 16);
    const segLen  = cssPx('--motif-seg-length', 224);
    const segGap  = cssPx('--motif-seg-gap', 32);
    const capH    = cssPx('--motif-cap-height', 28);

    // Rail x positions: center of each gutter, nudged inward by inset
    const leftX  = Math.round((leftGutter  * 0.5) - (railW * 0.5) + railIn);
    const rightX = Math.round(window.innerWidth - (rightGutter * 0.5) - (railW * 0.5) - railIn);

    // Container covering the full allowed vertical span
    railsEl = document.createElement('div');
    railsEl.className = 'motif-rails';
    railsEl.style.position = 'absolute';
    railsEl.style.left = '0';
    railsEl.style.right = '0';
    railsEl.style.top = `${topY}px`;
    railsEl.style.height = `${Math.max(0, bottomY - topY)}px`;
    railsEl.style.pointerEvents = 'none';
    railsEl.style.zIndex = '0';
    railsEl.style.opacity = getComputedStyle(body).getPropertyValue('--motif-opacity') || '0.55';
    document.body.appendChild(railsEl);

    // Build only inside enabled section ranges
    const ranges = enabledRangesWithin(topY, bottomY);
    if (!ranges.length) return;

    function makeRailRange(x, rangeTop, rangeBot){
      const h = Math.max(0, rangeBot - rangeTop);
      if (h < 4) return;

      const rail = document.createElement('div');
      rail.className = 'motif-rail';
      rail.style.position = 'absolute';
      rail.style.left = `${x}px`;
      rail.style.top = `${rangeTop - topY}px`; // relative to container
      rail.style.height = `${h}px`;
      rail.style.width = 'var(--motif-rail-width)';
      railsEl.appendChild(rail);

      // Evenly distribute segments within this sub-range
      const usable = h;
      let count = Math.max(1, Math.floor((usable + segGap) / (segLen + segGap)));
      const totalSegSpace = count * segLen;
      const free = Math.max(0, usable - totalSegSpace);
      const gap = count > 1 ? (free / (count - 1)) : 0;

      let cursor = 0;
      for (let i = 0; i < count; i++){
        const seg = document.createElement('div');
        seg.className = 'motif-seg';
        seg.style.position = 'absolute';
        seg.style.top = `${cursor + capH}px`; // cap pseudo-elements overhang to "meet" segments visually
        seg.style.left = '0';
        seg.style.width = '100%';
        seg.style.height = `${segLen}px`;

        const center = document.createElement('div');
        center.className = 'motif-center';
        seg.appendChild(center);

        rail.appendChild(seg);
        cursor += segLen + gap;
      }
    }

    for (const rg of ranges){
      makeRailRange(leftX,  rg.top, rg.bottom);
      makeRailRange(rightX, rg.top, rg.bottom);
    }
  }

  // ---------- observers & lifecycle ----------
  const ro = new ResizeObserver(() => buildRails());
  ro.observe(document.documentElement);

  const mo = new MutationObserver(() => buildRails());
  mo.observe(document.documentElement, { childList:true, subtree:true, attributes:true, attributeFilter:['style','class'] });

  window.addEventListener('resize', () => buildRails(), { passive:true });
  window.addEventListener('load',   () => buildRails(), { once:true, passive:true });

  // Initialize
  onReady(() => {
    applyMotifsPageToggle();      // set body.has-motifs (default ON unless motifs-disable exists)
    buildRails();                 // draw rails based on current DOM/CSS
  });
})();
