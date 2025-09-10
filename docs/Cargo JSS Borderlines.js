/* Motif Rails v2.8 WORKING */
(function(){
  // ----- single-instance guard -----
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
    version: '2.7-center-gap',
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

  // ----- sections & ranges (opt-out with .motifs-off / data-motifs="off") -----
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
      if (b <= t + 2) continue; // collapsed/invisible
      ranges.push({ top: t, bottom: b });
    }
    return ranges.length ? ranges : [{ top: boundsTop, bottom: boundsBottom }];
  }

  // ----- page vertical bounds -----
  function findBounds(){
    const secs = getSections();
    const first = secs[0] || doc.querySelector('main') || body;
    const footer = doc.querySelector('footer');
    const topY = first ? first.getBoundingClientRect().top + scrollY : 0;
    const bottomY = footer ? footer.getBoundingClientRect().top + scrollY : doc.body.scrollHeight;
    return { topY, bottomY };
  }

  // ----- WIDEST centered non–full-bleed content column -----
  function findWidestCenteredColumn(){
    const clientW = document.documentElement.clientWidth || window.innerWidth;
    const cands = doc.querySelectorAll(
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

      // Prefer WIDER columns; lightly penalize giant gutters so we don't pick a narrow inner
      const score = r.width + centered * clientW - Math.max(0, minGut - 64) * 4;
      if (score > bestScore){ bestScore = score; best = r; }
    }

    if (best) return best;

    // Fallback: centered 92%/max-1200
    const pct  = parseFloat(getComputedStyle(body).getPropertyValue('--motif-fallback-col-pct')) || 0.92;
    const colW = Math.min(1200, clientW * pct);
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

  // ----- build -----
  function build(reason){
    if (isBuilding) return;
    isBuilding = true;

    applyMotifsPageToggle();
    body.classList.add('has-motifs'); // ensure CSS vars exist

    const clientW = document.documentElement.clientWidth || window.innerWidth; // excludes scrollbar
    const sbw = Math.max(0, window.innerWidth - clientW);
    if (DBG) console.log('[motif] clientW=', clientW, 'scrollbar=', sbw, 'reason=', reason);

    // page-level disable
    if (doc.getElementById('motifs-disable')) {
      clearRails(); lastSig = 'hidden:off'; isBuilding = false; return;
    }

    // width breakpoint hide (no rails under this)
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

    const minG       = cssPx('--motif-min-gutter', 160);
    const hideGutter = cssPx('--motif-hide-gutter', 0); // 0 = disabled
    const maxPlaceG  = cssPx('--motif-max-gutter', 64); // cap gutter used for placement
    const autoEdgeAt = cssPx('--motif-auto-edge-at', 120); // snap to edge if a gutter < this

    const zVarCss = (getComputedStyle(body).getPropertyValue('--motif-z') || '').trim();
    const zIndex  = (DBG ? 99999 : (parseInt(zVarCss,10) || 9999));
    const opacity = (getComputedStyle(body).getPropertyValue('--motif-opacity') || '').trim() || '1';

    // gutter anchor (0=edge side .. 0.5=middle of gutter). Default near edge.
    const anchorVar = parseFloat(getComputedStyle(body).getPropertyValue('--motif-gutter-anchor'));
    const gutterAnchor = isNaN(anchorVar) ? 0.5 : Math.max(0, Math.min(1, anchorVar));

    // gutters from the WIDEST centered column
    const colRect = findWidestCenteredColumn();
    let leftG  = Math.max(0, colRect.left);
    let rightG = Math.max(0, clientW - colRect.right);

    // hide if BOTH gutters too small (unless debugging)
    const guttersTight = hideGutter > 0 && (leftG < hideGutter && rightG < hideGutter);
    if (guttersTight && !DBG){ clearRails(); lastSig = 'hidden:gutter'; isBuilding = false; return; }

    // positions
    let leftX, rightX;

    const forceEdge =
      (MODE_LOCK === 'edge') ||
      (leftG < autoEdgeAt || rightG < autoEdgeAt);

    if (forceEdge){
      leftX  = Math.max(0, Math.round(edgeIn));
      rightX = Math.max(0, Math.round(clientW - edgeIn - railW));
    } else {
      // clamp gutter used for placement so a narrow inner wrapper can't drag rails inward
      const placeLeftG  = Math.min(leftG,  maxPlaceG);
      const placeRightG = Math.min(rightG, maxPlaceG);

      leftX  = Math.round((placeLeftG  * gutterAnchor) - (railW * 0.5) + railIn);
      rightX = Math.round(clientW - (placeRightG * gutterAnchor) - (railW * 0.5) - railIn);
    }

    if (DBG) console.log('[motif] railX', { leftX, rightX, leftG, rightG, gutterAnchor, maxPlaceG, autoEdgeAt });

    // container bounds
    const cTop = topY + topOffset;
    const cH   = Math.max(0, bottomY - topY - topOffset - bottomOffset);
    const ranges = enabledRangesWithin(topY + topOffset, bottomY - bottomOffset);
    if (DBG) console.log('[motif] ranges', ranges);

    // signature (dedupe)
    const sig = [
      clientW, window.innerHeight, cTop|0, cH|0, leftX|0, rightX|0,
      ranges.map(r => (r.top|0)+'-'+(r.bottom|0)).join(',')
    ].join('|');
    if (sig === lastSig) { isBuilding = false; return; }
    lastSig = sig;

    // (re)build
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

    // ---- per-range renderer ----
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
      const insetBot = capH - 0.5*capGap; 
      const usable = h - insetTop - insetBot;
      if (usable <= 0) return;

      let padLocal = pad;
      let gapH = centerH + 2*capH + 2*padLocal + capGap;  // cap + pad + center + pad + cap + extra bottom-cap gap
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

      // TOP segment (top cap + gap cap)
      addLine(insetTop, topH);

      // BOTTOM segment (gap cap + bottom cap)
      addLine(insetTop + topH + gapH, botH);

      // Centerpiece positioned so spacing to both caps = padLocal (CSS-only bottom-cap gap)
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

  // ----- scheduling & observers -----
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
