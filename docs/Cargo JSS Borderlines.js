/* Motif Rails v1.38 — offsets + z-index var + mode lock */
(function(){
  const doc = document, body = doc.body, root = doc.documentElement;
  const Q = new URLSearchParams(location.search);
  const DBG = Q.has('motifdebug');
  const MODE_LOCK = Q.get('motifmode'); // "edge" | "gutter" | null

  // prove file loaded + give you rebuild/ping hooks
  const api = { version:'1.38', ping: ()=>'[motif] ok', rebuild: () => rebuild() };
  window.MOTIF_RAILS = Object.assign(window.MOTIF_RAILS || {}, api);
  console.log('[motif] rails loaded', api.version);

  // utils
  const log = (...a)=>{ if (DBG) console.log('[motif]', ...a); };
  const onReady = fn => (doc.readyState !== 'loading') ? fn() : doc.addEventListener('DOMContentLoaded', fn, {once:true});
  const remPx = () => parseFloat(getComputedStyle(root).fontSize) || 16;
  function cssPx(name, fallback){
    const v = getComputedStyle(body).getPropertyValue(name).trim();
    if (!v) return fallback;
    const n = parseFloat(v); if (isNaN(n)) return fallback;
    if (v.endsWith('rem')) return n * remPx();
    if (v.endsWith('em'))  return n * (parseFloat(getComputedStyle(body).fontSize)||16);
    return n;
  }

  // default ON; page opt-out with #motifs-disable
  function applyMotifsPageToggle(){
    const off = !!doc.getElementById('motifs-disable');
    body.classList.toggle('has-motifs', !off);
  }
  new MutationObserver(applyMotifsPageToggle).observe(doc.documentElement, { childList:true, subtree:true });

  // sections & ranges (honor .motifs-off markers)
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
    const out = [];
    for (const s of secs){
      if (sectionIsOff(s)) continue;
      const r = s.getBoundingClientRect();
      const t = Math.max(boundsTop, r.top + scrollY);
      const b = Math.min(boundsBottom, r.bottom + scrollY);
      if (b > t + 2) out.push({ top: t, bottom: b });
    }
    return out.length ? out : [{ top: boundsTop, bottom: boundsBottom }];
  }

  // vertical bounds (first section → top of footer)
  function findBounds(){
    const secs = getSections();
    const first = secs[0] || doc.querySelector('main') || body;
    const footer = doc.querySelector('footer');
    const topY = first ? first.getBoundingClientRect().top + scrollY : 0;
    const bottomY = footer ? footer.getBoundingClientRect().top + scrollY : doc.body.scrollHeight;
    return { topY, bottomY };
  }

  // content column; fallback to centered 92vw (max 1200px)
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

  let railsEl = null;
  function clearRails(){
    doc.querySelectorAll('.motif-rails').forEach(n => n.remove());
    railsEl = null;
  }

  function build(){
    clearRails();
    applyMotifsPageToggle();
    if (!body.classList.contains('has-motifs')) { log('bail: page opt-out'); return; }

    // geometry / thresholds (CSS-driven)
    const hideBp  = cssPx('--motif-hide-bp', 960);
    if (innerWidth < hideBp) { log('bail: below breakpoint'); return; }

    const { topY, bottomY } = findBounds();

    // NEW: offsets to keep the hero clean or lift above footer overlap
    const topOffset    = cssPx('--motif-top-offset', 0);
    const bottomOffset = cssPx('--motif-bottom-offset', 0);

    const railW  = cssPx('--motif-rail-width', 32);
    const railIn = cssPx('--motif-rail-inset', 12);
    const edgeIn = cssPx('--motif-edge-inset', 24);
    const segLen = cssPx('--motif-seg-length', 200);
    const segGap = cssPx('--motif-seg-gap', 24);
    const capH   = cssPx('--motif-cap-height', 24);
    const minG   = cssPx('--motif-min-gutter', 160);
    const zVar   = (getComputedStyle(body).getPropertyValue('--motif-z') || '').trim();
    const zIndex = zVar || '0'; // default behind most content unless overridden by CSS
    const opacity= (getComputedStyle(body).getPropertyValue('--motif-opacity') || '').trim() || '.55';

    const colRect = findContentColumn();
    const leftG   = Math.max(0, colRect.left);
    const rightG  = Math.max(0, innerWidth - colRect.right);

    let leftX, rightX, mode;
    let tight = (leftG < minG) || (rightG < minG);
    if (MODE_LOCK === 'edge') tight = true;
    if (MODE_LOCK === 'gutter') tight = false;

    if (tight){
      mode = 'edge';
      leftX  = Math.max(0, Math.round(edgeIn));
      rightX = Math.max(0, Math.round(innerWidth - edgeIn - railW));
    }else{
      mode = 'gutter';
      leftX  = Math.round((leftG * 0.5) - (railW * 0.5) + railIn);
      rightX = Math.round(innerWidth - (rightG * 0.5) - (railW * 0.5) - railIn);
    }
    log('mode:', mode, 'x:', leftX, rightX, 'gutters:', {leftG, rightG, minG});

    // container
    const cTop = topY + topOffset;
    const cH   = Math.max(0, bottomY - topY - topOffset - bottomOffset);

    railsEl = doc.createElement('div');
    railsEl.className = 'motif-rails';
    Object.assign(railsEl.style, {
      position:'absolute', left:'0', right:'0',
      top: `${cTop}px`, height: `${cH}px`,
      pointerEvents:'none',
      zIndex, opacity
    });
    body.appendChild(railsEl);

    // ranges (respect section opt-outs)
    const ranges = enabledRangesWithin(topY + topOffset, bottomY - bottomOffset);
    log('ranges:', ranges.length);

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

      const usable = h;
      let count = Math.max(1, Math.floor((usable + segGap) / (segLen + segGap)));
      const total = count * segLen;
      const free  = Math.max(0, usable - total);
      const gap   = count > 1 ? (free / (count - 1)) : 0;

      let y = 0;
      for (let i=0; i<count; i++){
        const seg = doc.createElement('div');
        seg.className = 'motif-seg';
        Object.assign(seg.style, {
          position:'absolute', left:'0',
          top:`${y + capH}px`,
          width:'100%', height:`${segLen}px`,
          ...(DBG ? { background:'repeating-linear-gradient(0deg, rgba(255,210,0,.28), rgba(255,210,0,.28) 10px, transparent 10px, transparent 20px)' } : {})
        });
        const ctr = doc.createElement('div');
        ctr.className = 'motif-center';
        if (DBG) Object.assign(ctr.style, { outline:'1px dashed rgba(180,120,0,.85)', width:'var(--motif-center-size,24px)', height:'var(--motif-center-size,24px)' });
        seg.appendChild(ctr);
        rail.appendChild(seg);
        y += segLen + gap;
      }
    }

    for (const rg of ranges){
      makeRailRange(leftX,  rg.top, rg.bottom);
      makeRailRange(rightX, rg.top, rg.bottom);
    }

    console.log('[motif] built', {mode, leftX, rightX, ranges: ranges.length});
  }

  const rebuild = () => requestAnimationFrame(() => requestAnimationFrame(build));
  new ResizeObserver(rebuild).observe(doc.documentElement);
  new MutationObserver(rebuild).observe(doc.documentElement, { childList:true, subtree:true, attributes:true, attributeFilter:['style','class'] });
  window.addEventListener('resize', rebuild, { passive:true });
  window.addEventListener('load',   rebuild, { once:true, passive:true });
  onReady(rebuild);
})();
