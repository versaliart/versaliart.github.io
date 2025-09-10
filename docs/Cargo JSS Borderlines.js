/* Motif Rails v2.4 — center-gap layout (top/bottom caps + gap caps) */
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


if (DBG) console.log('[motif] gutters', { leftG: Math.max(0, findContentColumn().left),
                                          rightG: Math.max(0, (document.documentElement.clientWidth||innerWidth) - findContentColumn().right),
                                          hideGutter: cssPx('--motif-hide-gutter', 0) });


  // public API
  const API = window.MOTIF_RAILS = Object.assign(window.MOTIF_RAILS || {}, {
    version: '2.2-center-gap',
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

  // ----- page toggle (default ON; opt out with #motifs-disable) -----
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
  // one range per eligible section (no merging)
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

  // ----- bounds & column -----
  function findBounds(){
    const secs = getSections();
    const first = secs[0] || doc.querySelector('main') || body;
    const footer = doc.querySelector('footer');
    const topY = first ? first.getBoundingClientRect().top + scrollY : 0;
    const bottomY = footer ? footer.getBoundingClientRect().top + scrollY : doc.body.scrollHeight;
    return { topY, bottomY };
  }
function findContentColumn(){
  const clientW = document.documentElement.clientWidth || window.innerWidth;
  const cands = doc.querySelectorAll(
    '.sqs-layout, .Index-page-content, .content, .site-content, main, #content'
  );

  let best = null, bestScore = -Infinity;
  for (const el of cands){
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) continue;

    const left  = Math.max(0, r.left);
    const right = Math.max(0, clientW - r.right);
    const gutters = Math.min(left, right);                 // bigger is better
    const centered = 1 - Math.min(1, Math.abs(left-right)/clientW); // 1 = perfectly centered
    const narrower = Math.max(0, clientW - r.width);       // prefer narrower-than-viewport

    const score = gutters * 2 + centered * 1000 + narrower;
    if (score > bestScore){ bestScore = score; best = r; }
  }

  if (best) return best;

  // fallback: centered 92%/max-1200px column
  const vw = clientW;
  const colW = Math.min(1200, vw * 0.92);
  const left = (vw - colW)/2;
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

  function makeSignature(ctx){
    const rangeSig = ctx.ranges.map(r => (r.top|0)+'-'+(r.bottom|0)).join(',');
    return [
      ctx.vw, window.innerHeight,
      ctx.cTop|0, ctx.cH|0,
      ctx.leftX|0, ctx.rightX|0,
      rangeSig
    ].join('|');
  }

function build(reason){
  if (isBuilding) return;
  isBuilding = true;

  applyMotifsPageToggle();

  // viewport width EXCLUDING scrollbar
  const clientW = document.documentElement.clientWidth || window.innerWidth;
  const sbw = Math.max(0, window.innerWidth - clientW);
  if (DBG) console.log('[motif] clientW=', clientW, 'scrollbar=', sbw, 'reason=', reason);

  // If a page-level disable is present, we stop (but say why).
  if (document.getElementById('motifs-disable')) {
    if (DBG) console.warn('[motif] hidden: page toggle (#motifs-disable present)');
    clearRails(); lastSig = 'hidden:off'; isBuilding = false; return;
  }
  // Ensure the CSS vars are available on body during the build.
  body.classList.add('has-motifs');

  // breakpoint hide (and clear) — unless we're debugging
  const hideBp  = cssPx('--motif-hide-bp', 960);
  if (!DBG && clientW < hideBp) {
    if (DBG) console.warn('[motif] hidden:bp', { clientW, hideBp });
    clearRails(); lastSig = 'hidden:bp'; isBuilding = false; return;
  }

  const { topY, bottomY } = findBounds();

  // geometry from CSS
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
  const zVar   = (getComputedStyle(body).getPropertyValue('--motif-z') || '').trim(); // may be ""
  const zIndex = DBG ? 99999 : (parseInt(zVar, 10) || 9999); // default to 9999 if unset/0
  const opacity= (getComputedStyle(body).getPropertyValue('--motif-opacity') || '').trim() || '.55';

  const colRect = findContentColumn();
  const leftG   = Math.max(0, colRect.left);
  const rightG  = Math.max(0, clientW - colRect.right);

  // optional: hide when gutters are tight — unless debugging
  const hideGutter = cssPx('--motif-hide-gutter', 0); // 0 = disabled
  if (!DBG && hideGutter > 0 && (leftG < hideGutter || rightG < hideGutter)) {
    if (DBG) console.warn('[motif] hidden:gutter', { leftG, rightG, hideGutter });
    clearRails(); lastSig = 'hidden:gutter'; isBuilding = false; return;
  }

  let tight = (leftG < minG) || (rightG < minG);
  if (MODE_LOCK === 'edge')   tight = true;
  if (MODE_LOCK === 'gutter') tight = false;

  let leftX, rightX;
  if (tight){
    leftX  = Math.max(0, Math.round(edgeIn));
    rightX = Math.max(0, Math.round(clientW - edgeIn - railW));
  }else{
    leftX  = Math.round((leftG * 0.5) - (railW * 0.5) + railIn);
    rightX = Math.round(clientW - (rightG * 0.5) - (railW * 0.5) - railIn);
  }

  const cTop = topY + topOffset;
  const cH   = Math.max(0, bottomY - topY - topOffset - bottomOffset);
  const ranges = enabledRangesWithin(topY + topOffset, bottomY - bottomOffset);

  if (DBG) console.log('[motif] ranges', ranges);

  // dedupe
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
    zIndex: DBG ? '99999' : zVar,   // raise in debug so it’s definitely on top
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
    const insetBot = capH; // CSS supplies bottom-cap visual gap
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

  // Always apply the line art from the CSS var as an inline style.
  // This avoids cases where the var fails to cascade or gets stripped/minified.
  const lineImg = getComputedStyle(body).getPropertyValue('--motif-line-url').trim();
  if (lineImg) {
    line.style.backgroundImage  = lineImg;        // e.g. url(".../linerail.svg")
    line.style.backgroundRepeat = 'repeat-y';
    line.style.backgroundPosition = '50% 0';
    line.style.backgroundSize   = 'var(--motif-line-width) auto';
    line.style.left = '50%';
    line.style.transform = 'translateX(-50%)';
    line.style.width = 'var(--motif-line-width)';
    line.style.height = '100%';
  } else if (DBG) {
    // Visible fallback when the URL var is missing (debug only)
    line.style.background =
      'repeating-linear-gradient(0deg, rgba(255,210,0,.30), rgba(255,210,0,.30) 10px, transparent 10px, transparent 20px)';
    line.style.left = '50%';
    line.style.transform = 'translateX(-50%)';
    line.style.width = 'var(--motif-line-width)';
    line.style.height = '100%';
  }

  seg.appendChild(line);
  rail.appendChild(seg);
}


    addLine(insetTop, topH);
    addLine(insetTop + topH + gapH, botH);

    // centerpiece
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
    // ignore our own changes
    for (const rec of records){
      if (!railsEl) break;
      if (rec.target === railsEl || railsEl.contains(rec.target)) return;
      if (rec.type === 'attributes' && rec.target === railsEl) return;
    }
    schedule('mutation');
  });
  mo.observe(doc.documentElement, { childList:true, subtree:true, attributes:true });

  window.addEventListener('load', () => schedule('load'), { once:true, passive:true });
  onReady(() => schedule('domready'));
})();
