/* Motif Rails v2.6 — robust gutters + inline line art */
(function(){
  if (window.MOTIF_RAILS && window.MOTIF_RAILS.__installed) {
    console.warn('[motif] rails already installed, skipping');
    return;
  }

  const doc = document, body = doc.body, root = doc.documentElement;
  const Q = new URLSearchParams(location.search);
  const DBG = Q.has('motifdebug');
  const MODE_LOCK = Q.get('motifmode'); // "edge" | "gutter" | null

  // public API
  const API = window.MOTIF_RAILS = Object.assign(window.MOTIF_RAILS || {}, {
    version: '2.5-center-gap',
    __installed: true,
    ping: () => '[motif] ok',
    rebuild: () => schedule('api')
  });
  if (DBG) console.log('[motif] rails loaded', API.version);

  // ----- utils -----
  const onReady = fn => (doc.readyState !== 'loading')
    ? fn()
    : doc.addEventListener('DOMContentLoaded', fn, { once:true });

  const remPx = () => parseFloat(getComputedStyle(root).fontSize) || 16;
  function cssPx(name, fallback){
    const v = getComputedStyle(body).getPropertyValue(name).trim();
    if (!v) return fallback;
    const n = parseFloat(v); if (isNaN(n)) return fallback;
    if (v.endsWith('rem')) return n * remPx();
    if (v.endsWith('em'))  return n * (parseFloat(getComputedStyle(body).fontSize)||16);
    return n;
  }

  function applyMotifsPageToggle(){
    const off = !!doc.getElementById('motifs-disable');
    body.classList.toggle('has-motifs', !off);
  }

  function getSections(){
    return Array.from(doc.querySelectorAll(
      '.page-section, section[data-section-id], section.sqs-section, .Index-page-content section, main section, #content section'
    )).filter(s => s.offsetParent !== null);
  }
  function sectionIsOff(sec){
    return sec.classList.contains('motifs-off') ||
           !!sec.querySelector('.motifs-off,[data-motifs="off"],#motifs-disable-section');
  }
  function enabledRangesWithin(boundsTop, boundsBottom){
    const secs = getSections();
    if (!secs.length) return [{ top: boundsTop, bottom: boundsBottom }];
    const ranges = [];
    for (const s of secs){
      if (sectionIsOff(s)) continue;
      const r = s.getBoundingClientRect();
      const t = Math.max(boundsTop, r.top + scrollY);
      const b = Math.min(boundsBottom, r.bottom + scrollY);
      if (b <= t + 2) continue;
      ranges.push({ top: t, bottom: b });
    }
    return ranges.length ? ranges : [{ top: boundsTop, bottom: boundsBottom }];
  }

  function findBounds(){
    const secs = getSections();
    const first = secs[0] || doc.querySelector('main') || body;
    const footer = doc.querySelector('footer');
    const topY = first ? first.getBoundingClientRect().top + scrollY : 0;
    const bottomY = footer ? footer.getBoundingClientRect().top + scrollY : doc.body.scrollHeight;
    return { topY, bottomY };
  }

  // Robust content column finder (ignores full-bleed)
  function findContentColumn(){
    const clientW = document.documentElement.clientWidth || window.innerWidth;
    const cands = doc.querySelectorAll(
      '.sqs-layout, .Index-page-content, .content, .site-content, main, #content, ' +
      '.content-wrapper, .site-wrapper, .page-content, .sqs-container, .sqs-row'
    );

    const MIN_GUTTER_PX = 2;
    let best = null, bestScore = -Infinity;
    for (const el of cands){
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) continue;

      const left  = Math.max(0, r.left);
      const right = Math.max(0, clientW - r.right);
      const minGut = Math.min(left, right);

      if (r.width >= clientW - 1 || minGut < MIN_GUTTER_PX) continue; // ignore full-bleed

      const centered = 1 - Math.min(1, Math.abs(left - right) / clientW);
      const narrower = Math.max(0, clientW - r.width);
      const score = minGut * 2 + centered * 1000 + narrower;
      if (score > bestScore){ bestScore = score; best = r; }
    }
    if (best) return best;

    // Fallback: centered 88%/max-1200px (≈6% gutters each side)
    const pctVar = parseFloat(getComputedStyle(body).getPropertyValue('--motif-fallback-col-pct')) || 0.92;
    const colW = Math.min(1200, clientW * pctVar);
    const left = (clientW - colW)/2;
    return { left, right: left + colW };
  }

  // ----- build state -----
  let railsEl = null;
  let isBuilding = false;
  let scheduled = false;
  let lastSig = '';

  function clearRails(){
    if (railsEl && railsEl.parentNode) railsEl.remove();
    railsEl = null;
  }

  function build(reason){
    if (isBuilding) return;
    isBuilding = true;

    applyMotifsPageToggle();
    body.classList.add('has-motifs'); // ensure CSS vars exist
    const contentClear = cssPx('--motif-content-clear', cssPx('--motif-rail-inset', 12));
    const clientW = document.documentElement.clientWidth || window.innerWidth;
    const sbw = Math.max(0, window.innerWidth - clientW);
    if (DBG) console.log('[motif] clientW=', clientW, 'scrollbar=', sbw, 'reason=', reason);

    // page-level disable
    if (doc.getElementById('motifs-disable')) {
      console.warn('[motif] hidden: page toggle (#motifs-disable present)');
      clearRails(); lastSig = 'hidden:off'; isBuilding = false; return;
    }

    // breakpoint hide (only in normal mode)
    const hideBp  = cssPx('--motif-hide-bp', 960);
    if (!DBG && clientW < hideBp) {
      console.warn('[motif] hidden:bp', { clientW, hideBp });
      clearRails(); lastSig = 'hidden:bp'; isBuilding = false; return;
    }

    const { topY, bottomY } = findBounds();

    // geometry
    const topOffset    = cssPx('--motif-top-offset', 0);
    const bottomOffset = cssPx('--motif-bottom-offset', 0);
    const capGap = cssPx('--motif-bottom-cap-gap', 0);

    const railW  = cssPx('--motif-rail-width', 32);
    const railIn = cssPx('--motif-rail-inset', 12);
    const edgeIn = cssPx('--motif-edge-inset', 24);
    const capH   = cssPx('--motif-cap-height', 24);
    const centerH= cssPx('--motif-center-height', 36);
    let   pad    = cssPx('--motif-center-gap-pad', 0);

    const minG   = cssPx('--motif-min-gutter', 160);
    const zVarCss= (getComputedStyle(body).getPropertyValue('--motif-z') || '').trim();
    const zIndex = (DBG ? 99999 : (parseInt(zVarCss,10) || 9999));
    const opacity= (getComputedStyle(body).getPropertyValue('--motif-opacity') || '').trim() || '1';

    const colRect = findContentColumn();
    const leftG   = Math.max(0, colRect.left);
    const rightG  = Math.max(0, clientW - colRect.right);

    // gutter hide: only hide if BOTH sides are tight (and not in debug)
    const hideGutter = cssPx('--motif-hide-gutter', 0);
    const guttersTight = hideGutter > 0 && (leftG < hideGutter && rightG < hideGutter);
    if (guttersTight && !DBG){
      console.warn('[motif] hidden:gutter', { leftG, rightG, hideGutter, clientW });
      clearRails(); lastSig = 'hidden:gutter'; isBuilding = false; return;
    } else if (DBG) {
      console.log('[motif] gutters', { leftG, rightG, hideGutter, clientW });
    }

    let tight = (leftG < minG) || (rightG < minG);
    if (MODE_LOCK === 'edge')   tight = true;
    if (MODE_LOCK === 'gutter') tight = false;

    let leftX, rightX;
const placeFromContent = () => {
  // Never overlap content: sit just OUTSIDE the narrowest inner column
  leftX  = Math.round(colRect.left  - contentClear - railW);
  rightX = Math.round(colRect.right + contentClear);

  // Clamp to viewport so we don’t go negative or off-screen
  leftX  = Math.max(0, leftX);
  rightX = Math.min(clientW - railW, rightX);
};

// Force-edge lock still respected via URL (?motifmode=edge)
if (MODE_LOCK === 'edge') {
  leftX  = Math.max(0, Math.round(edgeIn));
  rightX = Math.max(0, Math.round(clientW - edgeIn - railW));
} else {
  placeFromContent();

  // If BOTH gutters are truly too small to fit the rail with clearance,
  // fall back to edge placement (or your hide logic will kick in).
  const needL = railW + contentClear;
  const needR = railW + contentClear;
  if ((leftG < needL) && (rightG < needR)) {
    leftX  = Math.max(0, Math.round(edgeIn));
    rightX = Math.max(0, Math.round(clientW - edgeIn - railW));
  }
}

if (DBG) console.log('[motif] railX', { leftX, rightX, leftG, rightG, contentClear, railW });


    const cTop = topY + topOffset;
    const cH   = Math.max(0, bottomY - topY - topOffset - bottomOffset);
    const ranges = enabledRangesWithin(topY + topOffset, bottomY - bottomOffset);

    if (DBG) console.log('[motif] ranges', ranges);

    const sig = [
      clientW, window.innerHeight, cTop|0, cH|0, leftX|0, rightX|0,
      ranges.map(r => (r.top|0)+'-'+(r.bottom|0)).join(',')
    ].join('|');
    if (sig === lastSig) { isBuilding = false; return; }
    lastSig = sig;

    clearRails();

    railsEl = doc.createElement('div');
    railsEl.className = 'motif-rails';
    Object.assign(railsEl.style, {
      position:'absolute', left:'0', right:'0',
      top: `${cTop}px`, height: `${cH}px`,
      pointerEvents:'none',
      zIndex: String(zIndex),
      opacity
    });
    if (DBG) railsEl.style.outline = '1px dashed rgba(255,0,0,.35)';
    body.appendChild(railsEl);

    // per-range renderer
    function makeRailRange(x, rTop, rBot){
      const h = Math.max(0, rBot - rTop);
      if (h < 4) return;

      const rail = doc.createElement('div');
      rail.className = 'motif-rail';
      Object.assign(rail.style, {
        position:'absolute',
        left:`${x}px`,
        top:`${rTop - cTop}px`,
        height:`${h}px`,
        width:'var(--motif-rail-width)'
      });
      railsEl.appendChild(rail);

      const insetTop = capH;
      const insetBot = capH;
      const usable = h - insetTop - insetBot;
      if (usable <= 0) return;

      let padLocal = pad;
      let gapH = centerH + 2*capH + 2*padLocal + capGap;
      if (gapH > usable){
        const spare = Math.max(0, usable - centerH - capGap);
        padLocal = Math.max(0, spare/2 - capH);
        gapH = centerH + 2*capH + 2*padLocal + capGap;
      }
      const topH = Math.max(0, Math.floor((usable - gapH)/2));
      const botH = Math.max(0, usable - gapH - topH);

      function addLine(atTopPx, heightPx){
        const seg = doc.createElement('div');
        seg.className = 'motif-seg';
        Object.assign(seg.style, {
          position:'absolute', left:'0', top:`${atTopPx}px`, width:'100%', height:`${heightPx}px`
        });

        const line = doc.createElement('div');
        line.className = 'motif-line';

        // Apply line art inline to beat global resets
        const lineImgVar   = getComputedStyle(body).getPropertyValue('--motif-line-url').trim();
        const lineWidthVar = getComputedStyle(body).getPropertyValue('--motif-line-width').trim() || '2px';

        if (lineImgVar){
          line.style.setProperty('background-image',  lineImgVar, 'important');
          line.style.setProperty('background-repeat', 'repeat-y', 'important');
          line.style.setProperty('background-position', '50% 0', 'important');
          line.style.setProperty('background-size',   `${lineWidthVar} auto`, 'important');
        } else if (DBG){
          line.style.background =
            'repeating-linear-gradient(0deg, rgba(255,210,0,.30), rgba(255,210,0,.30) 10px, transparent 10px, transparent 20px)';
        }
        line.style.left = '50%';
        line.style.transform = 'translateX(-50%)';
        line.style.width = lineWidthVar;
        line.style.height = '100%';

        seg.appendChild(line);
        rail.appendChild(seg);
      }

      addLine(insetTop, topH);
      addLine(insetTop + topH + gapH, botH);

      const ctr = doc.createElement('div');
      ctr.className = 'motif-center';
      ctr.style.top = `${insetTop + topH + capH + capGap + padLocal}px`;
      rail.appendChild(ctr);
    }

    for (const rg of ranges){
      makeRailRange(leftX,  rg.top, rg.bottom);
      makeRailRange(rightX, rg.top, rg.bottom);
    }

    if (DBG) console.log('[motif] built', { leftX, rightX, ranges: ranges.length, reason });
    isBuilding = false;
  }

  function schedule(reason){
    if (scheduled || isBuilding) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; build(reason); });
  }

  const ro = new ResizeObserver(() => schedule('resize'));
  ro.observe(doc.documentElement);

  // ignore attribute churn — just DOM structure changes
  const mo = new MutationObserver((records) => {
    for (const rec of records){
      if (!railsEl) break;
      if (rec.target === railsEl || railsEl.contains(rec.target)) return;
    }
    schedule('mutation');
  });
  mo.observe(doc.documentElement, { childList:true, subtree:true });

  window.addEventListener('load', () => schedule('load'), { once:true, passive:true });
  onReady(() => schedule('domready'));
})();
