/* Motif Rails v1.33 FAILSAFE — always draw */
(function(){
  const body = document.body, root = document.documentElement;

  function remPx(){ return parseFloat(getComputedStyle(root).fontSize) || 16; }
  function cssPx(name, fallback){
    const v = getComputedStyle(body).getPropertyValue(name).trim();
    if (!v) return fallback;
    const n = parseFloat(v); if (isNaN(n)) return fallback;
    if (v.endsWith('rem')) return n * remPx();
    if (v.endsWith('em'))  return n * (parseFloat(getComputedStyle(body).fontSize)||16);
    return n;
  }

  function firstSection(){
    return document.querySelector('.page-section, section[data-section-id], section.sqs-section, main section, #content section') || document.querySelector('main') || body;
  }
  function bounds(){
    const topEl = firstSection();
    const footer = document.querySelector('footer');
    const topY = topEl ? topEl.getBoundingClientRect().top + scrollY : 0;
    const bottomY = footer ? footer.getBoundingClientRect().top + scrollY : document.body.scrollHeight;
    return { topY, bottomY };
  }

  function build(){
    // ensure class is on so your CSS vars apply
    body.classList.add('has-motifs');

    // nuke any previous
    document.querySelectorAll('.motif-rails').forEach(n=>n.remove());

    const { topY, bottomY } = bounds();

    const railW  = cssPx('--motif-rail-width', 32);
    const railIn = cssPx('--motif-rail-inset', 12);
    const segLen = cssPx('--motif-seg-length', 200);
    const segGap = cssPx('--motif-seg-gap', 24);
    const capH   = cssPx('--motif-cap-height', 24);
    const opacity= getComputedStyle(body).getPropertyValue('--motif-opacity') || '0.55';

    // crude content column guess = page center at 1200px wide column
    const vw = innerWidth;
    const colW = Math.min(1200, vw * 0.92);
    const colLeft = (vw - colW)/2;
    const colRight = colLeft + colW;

    const leftGutter  = Math.max(0, colLeft);
    const rightGutter = Math.max(0, vw - colRight);

    const leftX  = Math.round((leftGutter * 0.5) - (railW * 0.5) + railIn);
    const rightX = Math.round(vw - (rightGutter * 0.5) - (railW * 0.5) - railIn);

    const rails = document.createElement('div');
    rails.className = 'motif-rails';
    Object.assign(rails.style, {
      position:'absolute', left:'0', right:'0',
      top: `${topY}px`, height: `${Math.max(0, bottomY - topY)}px`,
      pointerEvents:'none', zIndex:'1', opacity
    });
    document.body.appendChild(rails);

    function makeRail(x){
      const h = rails.getBoundingClientRect().height;
      const rail = document.createElement('div');
      rail.className = 'motif-rail';
      Object.assign(rail.style, { position:'absolute', left:`${x}px`, top:'0', height:`${h}px`, width:'var(--motif-rail-width)' });
      rails.appendChild(rail);

      const usable = h;
      let count = Math.max(1, Math.floor((usable + segGap) / (segLen + segGap)));
      const totalSegSpace = count * segLen;
      const free = Math.max(0, usable - totalSegSpace);
      const gap = count > 1 ? (free / (count - 1)) : 0;

      let cursor = 0;
      for (let i=0;i<count;i++){
        const seg = document.createElement('div');
        seg.className = 'motif-seg';
        Object.assign(seg.style, { position:'absolute', top:`${cursor + capH}px`, left:'0', width:'100%', height:`${segLen}px` });
        const ctr = document.createElement('div');
        ctr.className = 'motif-center';
        seg.appendChild(ctr);
        rail.appendChild(seg);
        cursor += segLen + gap;
      }
    }

    makeRail(leftX);
    makeRail(rightX);
  }

  // build and keep it refreshed
  const rebuild = ()=> requestAnimationFrame(()=>requestAnimationFrame(build));
  window.addEventListener('load', rebuild, { once:true });
  window.addEventListener('resize', rebuild, { passive:true });
  new MutationObserver(rebuild).observe(document.documentElement, { childList:true, subtree:true });

  // first paint
  if (document.readyState !== 'loading') rebuild();
  else document.addEventListener('DOMContentLoaded', rebuild, { once:true });
})();
