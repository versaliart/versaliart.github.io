/* Motif Rails v2.6.1 — gutter placement (default) + optional bounds mode */
(function(){
  if (window.MOTIF_RAILS && window.MOTIF_RAILS.__installed) {
    console.warn('[motif] rails already installed, skipping');
    return;
  }

  const doc = document, body = doc.body, root = doc.documentElement;
  const Q = new URLSearchParams(location.search);
  const DBG = Q.has('motifdebug');
  const MODE_LOCK = Q.get('motifmode'); // "edge" | "gutter" | null

  // API
  const API = window.MOTIF_RAILS = Object.assign(window.MOTIF_RAILS || {}, {
    version: '2.6.1-center-gap',
    __installed: true,
    ping: () => '[motif] ok',
    rebuild: () => schedule('api')
  });
  if (DBG) console.log('[motif] rails loaded', API.version);

  // utils
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

  // sections & ranges
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

  // page bounds
  function findBounds(){
    const secs = getSections();
    const first = secs[0] || doc.querySelector('main') || body;
    const footer = doc.querySelector('footer');
    const topY = first ? first.getBoundingClientRect().top + scrollY : 0;
    const bottomY = footer ? footer.getBoundingClientRect().top + scrollY : doc.body.scrollHeight;
    return { topY, bottomY };
  }

  // Narrow content column (for gutter placement) – prefers centered, narrower-than-viewport
// Pick the WIDEST centered non-full-bleed column
function findContentColumn(){
  const clientW = document.documentElement.clientWidth || window.innerWidth;
  const cands = document.querySelectorAll(
    '.sqs-layout, .Index-page-content, .content, .site-content, main, #content, ' +
    '.content-wrapper, .page-content, .sqs-container, .sqs-row'
  );

  let best = null, bestScore = -Infinity;
  for (const el of cands){
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) continue;
    if (r.width >= clientW - 1) continue; // ignore full-bleed

    const left  = Math.max(0, r.left);
    const right = Math.max(0, clientW - r.right);
    const minGut = Math.min(left, right);

    const centered = 1 - Math.min(1, Math.abs(left - right) / Math.max(1, clientW));
    // NEW: prefer wider columns; lightly penalize huge gutters so we don't pick a narrow inner
    const score = (r.width) + centered * clientW - Math.max(0, minGut - 64) * 4;

    if (score > bestScore){ bestScore = score; best = r; }
  }

  if (best) return best;

  // Fallback: make the column fairly wide by default (92%)
  const pct  = parseFloat(getComputedStyle(document.body).getPropertyValue('--motif-fallback-col-pct')) || 0.92;
  const colW = Math.min(1200, clientW * pct);
  const left = (clientW - colW)/2;
  return { left, right: left + colW };
}

  // Outermost content bounds (optional alternate placement)
  function findContentBounds(){
    const clientW = document.documentElement.clientWidth || window.innerWidth;
    const cands = doc.querySelectorAll(
      '.sqs-layout, .Index-page-content, .content, .site-content, main, #content, ' +
      '.content-wrapper, .site-wrapper, .page-content, .sqs-container, .sqs-row'
    );
    let minLeft = Infinity, maxRight = -Infinity;
    for (const el of cands){
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) continue;
      if (r.width >= clientW - 1) continue;               // ignore full-bleed
      minLeft  = Math.min(minLeft,  Math.max(0, r.left));
      maxRight = Math.max(maxRight, Math.min(clientW, r.right));
    }
    if (isFinite(minLeft) && isFinite(maxRight) && maxRight > minLeft) {
      return { left: minLeft, right: maxRight };
    }
    // fall back to column
    return findContentColumn();
  }

  // build state
  let railsEl = null;
  let isBuilding = false;
  let scheduled = false;
  let lastSig = '';

  function clearRails(){
    if (railsEl && railsEl.parentNode) railsEl.remove();
    railsEl = null;
  }

  // build
  function build(reason){
    if (isBuilding) return;
    isBuilding = true;

    applyMotifsPageToggle();
    body.classList.add('has-motifs');
    const maxGutterForPlacement = cssPx('--motif-max-gutter', 64); // cap used only for positioning
    const clientW = document.documentElement.clientWidth || window.innerWidth;
    const sbw = Math.max(0, window.innerWidth - clientW);
    if (DBG) console.log('[motif] clientW=', clientW, 'scrollbar=', sbw, 'reason=', reason);

    if (doc.getElementById('motifs-disable')) {
      clearRails(); lastSig = 'hidden:off'; isBuilding = false; return;
    }

    const hideBp  = cssPx('--motif-hide-bp', 960);
    if (!DBG && clientW < hideBp) {
      clearRails(); lastSig = 'hidden:bp'; isBuilding = false; return;
    }

    const { topY, bottomY } = findBounds();

    // geometry / knobs
    const topOffset    = cssPx('--motif-top-offset', 0);
    const bottomOffset = cssPx('--motif-bottom-offset', 0);
    const capGap       = cssPx('--motif-bottom-cap-gap', 0);

    const railW   = cssPx('--motif-rail-width', 32);
    const railIn  = cssPx('--motif-rail-inset', 12);
    const edgeIn  = cssPx('--motif-edge-inset', 24);
    const capH    = cssPx('--motif-cap-height', 24);
    const centerH = cssPx('--motif-center-height', 36);
    let   pad     = cssPx('--motif-center-gap-pad', 0);

    const minG    = cssPx('--motif-min-gutter', 160);
    const zVarCss = (getComputedStyle(body).getPropertyValue('--motif-z') || '').trim();
    const zIndex  = (DBG ? 99999 : (parseInt(zVarCss,10) || 9999));
    const opacity = (getComputedStyle(body).getPropertyValue('--motif-opacity') || '').trim() || '1';

    const placementMode = (getComputedStyle(body).getPropertyValue('--motif-placement-mode') || '').trim() || 'gutter';
    const gutterAnchor  = parseFloat(getComputedStyle(body).getPropertyValue('--motif-gutter-anchor')) || 0.5;
    const contentClear  = cssPx('--motif-content-clear', railIn);

    // gutters & placement
    let leftG, rightG, leftX, rightX;

    const colRect  = findContentColumn();   // for gutter mode
    const bounds   = findContentBounds();   // for bounds mode
    const useBounds= (placementMode === 'bounds');

    if (!useBounds){
      // GUTTER MODE (classic look)
      leftG  = Math.max(0, colRect.left);
      rightG = Math.max(0, clientW - colRect.right);

      let tight = (leftG < minG) || (rightG < minG);
      if (MODE_LOCK === 'edge')   tight = true;
      if (MODE_LOCK === 'gutter') tight = false;

      if (tight){
        leftX  = Math.max(0, Math.round(edgeIn));
        rightX = Math.max(0, Math.round(clientW - edgeIn - railW));
      } else {
        leftX  = Math.round((leftG  * gutterAnchor) - (railW * 0.5) + railIn);
        rightX = Math.round(clientW - (rightG * gutterAnchor) - (railW * 0.5) - railIn);
      }
    } else {
      // BOUNDS MODE (outside outermost content)
      leftG  = Math.max(0, bounds.left);
      rightG = Math.max(0, clientW - bounds.right);

      leftX  = Math.round(bounds.left  - contentClear - railW);
      rightX = Math.round(bounds.right + contentClear);
      leftX  = Math.max(0, leftX);
      rightX = Math.min(clientW - railW, rightX);

      const need = railW + contentClear;
      if ((leftG < need) && (rightG < need)){
        leftX  = Math.max(0, Math.round(edgeIn));
        rightX = Math.max(0, Math.round(clientW - edgeIn - railW));
      }
    }

    // gutter hide (only hide if BOTH sides tight; never in debug)
    const hideGutter = cssPx('--motif-hide-gutter', 0);
    const guttersTight = hideGutter > 0 && (leftG < hideGutter && rightG < hideGutter);
    if (guttersTight && !DBG){
      clearRails(); lastSig = 'hidden:gutter'; isBuilding = false; return;
    }

    if (DBG) console.log('[motif] railX', { leftX, rightX, leftG, rightG, placementMode });

    // container
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

    // per-range render
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

      // top / bottom segments
      addLine(insetTop, topH);
      addLine(insetTop + topH + gapH, botH);

      // centered centerpiece (equal pad to gap caps)
      const ctr = document.createElement('div');
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

  // scheduling
  function schedule(reason){
    if (scheduled || isBuilding) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; build(reason); });
  }

  const ro = new ResizeObserver(() => schedule('resize'));
  ro.observe(doc.documentElement);

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
