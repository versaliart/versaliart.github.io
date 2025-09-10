/* ===== Motif Rails v1.0 (JS) =====
   Builds two decorative vertical rails that:
   - start at first content section and end at last content section
   - never enter the footer
   - auto-hide on narrow viewports or tiny gutters

   Activate by adding `has-motifs` to <body> and setting the CSS vars.
*/

(function(){
  if (!('ResizeObserver' in window)) return;

  // ---------- config (tweak via CSS vars; these are only fallbacks) ----------
  const F = {
    hideBpPx: 960,        // fallback for --motif-hide-bp
    minGutterPx: 160,     // fallback for --motif-min-gutter
    segGapPx: 32,         // fallback for --motif-seg-gap
    railInsetPx: 16,      // fallback for --motif-rail-inset
  };

  function rem(n){
    const fs = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    return n * fs;
  }

  function cssPx(name, fallback){
    const v = getComputedStyle(document.body).getPropertyValue(name).trim();
    if (!v) return fallback;
    if (v.endsWith('rem')) return rem(parseFloat(v));
    if (v.endsWith('px'))  return parseFloat(v);
    if (v.endsWith('em'))  return parseFloat(v) * parseFloat(getComputedStyle(document.body).fontSize || 16);
    if (!isNaN(parseFloat(v))) return parseFloat(v);
    return fallback;
  }

  // Find the content stack (first and last section) and the footer
  function findBounds(){
    const allSections = Array.from(document.querySelectorAll(
      // Squarespace 7.1 + Cargo-friendly guesses:
      '.page-section, section[data-section-id], section[data-section-type], main section, #content section'
    )).filter(s => s.offsetParent !== null);

    const first = allSections[0] || document.querySelector('main') || document.body;
    const footer = document.querySelector('footer');

    // If the theme wraps sections, prefer their parent as a stable bounding node
    const topY = (first.getBoundingClientRect().top + window.scrollY);
    const bottomY = (footer ? footer.getBoundingClientRect().top + window.scrollY : document.body.scrollHeight);

    return { topY, bottomY, firstEl: first };
  }

  // Get the main content column box to compute gutters
  function findContentColumn(){
    // Try common containers; fall back to first section rect
    const candidates = document.querySelectorAll(
      '.sqs-layout, .Index-page-content, .content, .site-content, main, #content'
    );
    for (const el of candidates){
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) return r;
    }
    const first = document.querySelector('.page-section, main section');
    return first ? first.getBoundingClientRect() : document.body.getBoundingClientRect();
  }

  let railsEl = null;

  function clearRails(){
    if (railsEl && railsEl.parentNode) railsEl.parentNode.removeChild(railsEl);
    railsEl = null;
  }

  function buildRails(){
    clearRails();
    if (!document.body.classList.contains('has-motifs')) return;

    const hideBp = cssPx('--motif-hide-bp', F.hideBpPx);
    if (window.innerWidth < hideBp) return;

    const { topY, bottomY, firstEl } = findBounds();
    const contentRect = findContentColumn();

    const railWidth = cssPx('--motif-rail-width', 32);
    const railInset = cssPx('--motif-rail-inset', F.railInsetPx);
    const minGutter = cssPx('--motif-min-gutter', F.minGutterPx);
    const segLen = cssPx('--motif-seg-length', 224);
    const segGap = cssPx('--motif-seg-gap', F.segGapPx);
    const capH = cssPx('--motif-cap-height', 28);

    // Compute gutters from the content column
    const leftGutter = Math.max(0, contentRect.left);
    const rightGutter = Math.max(0, window.innerWidth - contentRect.right);

    // Hide if either side is too tight
    if (leftGutter < minGutter || rightGutter < minGutter) return;

    // Rail X positions: center each rail in its gutter, then inset
    const leftX  = Math.round((leftGutter * 0.5) - (railWidth * 0.5) + railInset);
    const rightX = Math.round(window.innerWidth - (rightGutter * 0.5) - (railWidth * 0.5) - railInset);

    // Build container sized to the content vertical span
    railsEl = document.createElement('div');
    railsEl.className = 'motif-rails';
    railsEl.style.top = `${topY}px`;
    railsEl.style.height = `${Math.max(0, bottomY - topY)}px`;
    railsEl.style.left = '0';
    railsEl.style.right = '0';
    document.body.appendChild(railsEl);

    // Helper to make one rail (left or right)
    function makeRail(x){
      const rail = document.createElement('div');
      rail.className = 'motif-rail';
      rail.style.left = `${x}px`;
      rail.style.top = '0';
      rail.style.height = '100%';
      railsEl.appendChild(rail);

      const usable = railsEl.getBoundingClientRect().height;
      const segFull = segLen + (segGap + capH * 2); // include external cap overhang space
      let count = Math.max(1, Math.floor((usable + segGap) / (segLen + segGap)));
      // Even spacing so top/bottom margins look balanced
      const totalSegSpace = count * segLen;
      const free = Math.max(0, usable - totalSegSpace);
      const gap = count > 1 ? (free / (count - 1)) : 0;

      let cursor = 0;
      for (let i = 0; i < count; i++){
        const seg = document.createElement('div');
        seg.className = 'motif-seg';
        seg.style.position = 'absolute';
        seg.style.top = `${cursor + capH}px`;   // push inside so caps overhang to “meet” next segment
        seg.style.left = '0';
        seg.style.width = '100%';
        seg.style.height = `${segLen}px`;

        const center = document.createElement('div');
        center.className = 'motif-center';
        seg.appendChild(center);

        rail.appendChild(seg);

        cursor += segLen + gap;
      }

      return rail;
    }

    makeRail(leftX);
    makeRail(rightX);
  }

  // Rebuild on resize & when layout changes (editor, images loading, etc.)
  const ro = new ResizeObserver(() => buildRails());
  ro.observe(document.documentElement);

  const mo = new MutationObserver(() => buildRails());
  mo.observe(document.documentElement, { childList: true, subtree: true });

  window.addEventListener('load', buildRails, { once: true });
  document.addEventListener('DOMContentLoaded', buildRails);
  buildRails();

  // --- Toggle body.has-motifs when #motifs-enable is present ---
function applyMotifs() {
  const hasMarker = !!document.getElementById('motifs-enable');
  document.body.classList.toggle('has-motifs', hasMarker);
}

// Run once on load
if (document.readyState !== 'loading') applyMotifs();
else document.addEventListener('DOMContentLoaded', applyMotifs, { once:true });

// Keep it synced if editor injects/removes blocks dynamically
const mo = new MutationObserver(() => applyMotifs());
mo.observe(document.documentElement, { childList:true, subtree:true });

})();
