/* Motif Rails v2.0 */
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
    version: '1.40',
    __installed: true,
    ping: () => '[motif] ok',
    rebuild: () => schedule('api')
  });
  console.log('[motif] rails loaded', API.version);

  // ----- utils -----
  const log = (...a)=>{ if (DBG) console.log('[motif]', ...a); };
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

  // ----- sections & ranges -----
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
  let current = null;

  for (const s of secs){
    const r = s.getBoundingClientRect();
    const t = Math.max(boundsTop, r.top + scrollY);
    const b = Math.min(boundsBottom, r.bottom + scrollY);
    if (b <= t + 2) continue; // invisible / collapsed

    if (sectionIsOff(s)) {
      if (current) { ranges.push(current); current = null; }
      continue; // break the run
    }

    // enabled: merge into the current run
    if (!current) current = { top: t, bottom: b };
    else current.bottom = Math.max(current.bottom, b);
  }

  if (current) ranges.push(current);
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
    const candidates = doc.querySelectorAll('.sqs-layout, .Index-page-content, .content, .site-content, main, #content');
    for (const el of candidates){
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) return r;
    }
    const vw = innerWidth;
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
      innerWidth, innerHeight,
      ctx.cTop|0, ctx.cH|0,
      ctx.leftX|0, ctx.rightX|0,
      rangeSig
    ].join('|');
  }

  function build(reason){
    if (isBuilding) return;
    isBuilding = true;

    applyMotifsPageToggle();
    if (!body.classList.contains('has-motifs')) { isBuilding = false; return; }

    const hideBp  = cssPx('--motif-hide-bp', 960);
    if (innerWidth < hideBp) { isBuilding = false; return; }

    const { topY, bottomY } = findBounds();

    // offsets & geometry
    const topOffset    = cssPx('--motif-top-offset', 0);
    const bottomOffset = cssPx('--motif-bottom-offset', 0);

    const railW  = cssPx('--motif-rail-width', 32);
    const railIn = cssPx('--motif-rail-inset', 12);
    const edgeIn = cssPx('--motif-edge-inset', 24);
    const segLenBase = cssPx('--motif-seg-length', 200);
    const segGapBase = cssPx('--motif-seg-gap', 24);
    const capH   = cssPx('--motif-cap-height', 24);
    const minG   = cssPx('--motif-min-gutter', 160);
    const zVar   = (getComputedStyle(body).getPropertyValue('--motif-z') || '').trim();
    const zIndex = zVar || '0';
    const opacity= (getComputedStyle(body).getPropertyValue('--motif-opacity') || '').trim() || '.55';

    const colRect = findContentColumn();
    const leftG   = Math.max(0, colRect.left);
    const rightG  = Math.max(0, innerWidth - colRect.right);
    let tight = (leftG < minG) || (rightG < minG);
    if (MODE_LOCK === 'edge') tight = true;
    if (MODE_LOCK === 'gutter') tight = false;

    let leftX, rightX;
    if (tight){
      leftX  = Math.max(0, Math.round(edgeIn));
      rightX = Math.max(0, Math.round(innerWidth - edgeIn - railW));
    }else{
      leftX  = Math.round((leftG * 0.5) - (railW * 0.5) + railIn);
      rightX = Math.round(innerWidth - (rightG * 0.5) - (railW * 0.5) - railIn);
    }

    const cTop = topY + topOffset;
    const cH   = Math.max(0, bottomY - topY - topOffset - bottomOffset);
    const ranges = enabledRangesWithin(topY + topOffset, bottomY - bottomOffset);

    // dedupe
    const sig = makeSignature({ cTop, cH, leftX, rightX, ranges });
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
      zIndex, opacity
    });
    body.appendChild(railsEl);

function makeRailRange(x, rTop, rBot){
  let  segLen = segLenBase;   // local, adjustable copy
  const segGap = segGapBase;  // local alias
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

  // keep caps inside the range
  const insetTop = capH, insetBot = capH;
  const usable = h - insetTop - insetBot;
  if (usable <= 0) return;

  // read adaptive knobs
  const minSeg = cssPx('--motif-min-seg-length', segLen * 0.6);
  const minGap = cssPx('--motif-min-gap',       Math.max(6, segGap * 0.4));
  const wantMinCount = Math.max(1, parseInt(getComputedStyle(body).getPropertyValue('--motif-min-segments')) || 2);

  // base count (old behavior)
  let count = Math.max(1, Math.floor((usable + segGap) / (segLen + segGap)));

  // try to show at least min segments if physically possible with compression
  const canFitMin = usable >= (wantMinCount * minSeg + (wantMinCount - 1) * minGap);
  if (count < wantMinCount && canFitMin) count = wantMinCount;

  // compute actual sizes with clamping
  // first try: keep desired segLen, adjust gap
  let gap = count > 1 ? (usable - count * segLen) / (count - 1) : 0;

  if (count > 1 && gap < minGap){
    // not enough room → clamp gap, shrink segments evenly (but not below minSeg)
    let segLenActual = (usable - (count - 1) * minGap) / count;

    // if still too small, reduce count until segments are >= minSeg
    while (count > 1 && segLenActual < minSeg){
      count -= 1;
      segLenActual = (usable - (count - 1) * minGap) / count;
    }

    // final sizes
    gap = count > 1 ? Math.max(minGap, (usable - count * segLenActual) / (count - 1)) : 0;
    segLen = Math.max(minSeg, segLenActual);
  } else {
    // keep original segLen (no compression needed)
    gap = Math.max(0, gap);
  }

  // 1) draw segments from insetTop downward
  let y = insetTop;
  for (let i = 0; i < count; i++){
    const seg = doc.createElement('div');
    seg.className = 'motif-seg';
    Object.assign(seg.style, {
      position:'absolute', left:'0',
      top:`${y}px`,
      width:'100%',
      height:`${segLen}px`
    });

    const line = doc.createElement('div');
    line.className = 'motif-line';
    if (DBG){
      line.style.background =
        'repeating-linear-gradient(0deg, rgba(255,210,0,.28), rgba(255,210,0,.28) 10px, transparent 10px, transparent 20px)';
    }
    seg.appendChild(line);
    rail.appendChild(seg);

    y += segLen + (count > 1 ? gap : 0);
  }

  // 2) centers at gap midpoints (within inset)
  if (count > 1 && gap > 0.5){
    for (let g = 0; g < count - 1; g++){
      const mid = insetTop + (g + 1) * segLen + g * gap + (gap / 2);
      const ctr = doc.createElement('div');
      ctr.className = 'motif-center';
      ctr.style.top = `${mid}px`;
      rail.appendChild(ctr);
    }
  }
}


    for (const rg of ranges){
      makeRailRange(leftX,  rg.top, rg.bottom);
      makeRailRange(rightX, rg.top, rg.bottom);
    }

    if (DBG) console.log('[motif] built', { leftX, rightX, ranges: ranges.length, reason });
    isBuilding = false;
  }

  // ----- scheduling & observers (loop-proof) -----
  function schedule(reason){
    if (scheduled || isBuilding) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      build(reason);
    });
  }

  const ro = new ResizeObserver(() => schedule('resize'));
  ro.observe(doc.documentElement);

  const mo = new MutationObserver((records) => {
    // ignore our own changes
    for (const rec of records){
      if (!railsEl) break;
      if (rec.target === railsEl || railsEl.contains(rec.target)) return;
      // also ignore attribute changes we make to .motif-rails itself
      if (rec.type === 'attributes' && rec.target === railsEl) return;
    }
    schedule('mutation');
  });
  mo.observe(doc.documentElement, { childList:true, subtree:true, attributes:true });

  // initial
  window.addEventListener('load', () => schedule('load'), { once:true, passive:true });
  onReady(() => schedule('domready'));
})();
