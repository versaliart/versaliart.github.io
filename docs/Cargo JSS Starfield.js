/* ===== Edge-only sparkles driven by --star-count ===== */
(function(){
  // List your Shape Block(s) by exact ID (Squarespace 7.1)
  const TARGETS = [
    // Example: replace with your real block ID
    // { sel:'#block-yui_3_17_2_1_1756422477850_41937', randomize:0.30, jitterRem:0.30 }
  ];
  if(!TARGETS.length) return;

  // ---------- utils ----------
  function onReady(fn){ if(document.readyState!=='loading') fn(); else document.addEventListener('DOMContentLoaded',fn,{once:true}); }
  const rem = () => parseFloat(getComputedStyle(document.documentElement).fontSize)||16;
  const lerp=(a,b,t)=>a+(b-a)*t, clamp01=v=>Math.max(0,Math.min(1,v));
  const rand=(a,b)=>a+Math.random()*(b-a);

  function cssNum(el, name, fallback){
    const v=getComputedStyle(el).getPropertyValue(name).trim();
    const n=parseFloat(v); return Number.isFinite(n)?n:fallback;
  }

  function svgToClient(svg,x,y){
    const pt=svg.createSVGPoint(); pt.x=x; pt.y=y;
    const o=pt.matrixTransform(svg.getScreenCTM()); return {x:o.x,y:o.y};
  }

  // Make/refresh stars for one Shape Block
  function buildFor(target){
    const host=document.querySelector(target.sel);
    if(!host) return;

    if(getComputedStyle(host).position==='static') host.style.position='relative';
    const svg=host.querySelector('svg'); if(!svg) return;

    // Try to find a <path>, else approximate from circle/ellipse/polygon
    let path=svg.querySelector('path');
    if(!path){
      const circ=svg.querySelector('circle,ellipse');
      if(circ){
        const cx=+circ.getAttribute('cx')||0, cy=+circ.getAttribute('cy')||0;
        const rx=+(circ.getAttribute('rx')||circ.getAttribute('r')||0);
        const ry=+(circ.getAttribute('ry')||circ.getAttribute('r')||0);
        const d=`M ${cx-rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx+rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx-rx} ${cy} Z`;
        path=document.createElementNS('http://www.w3.org/2000/svg','path'); path.setAttribute('d',d); svg.appendChild(path);
      }else{
        const poly=svg.querySelector('polygon,polyline');
        if(poly){
          const pts=(poly.getAttribute('points')||'').trim().replace(/\s+/g,' ').trim();
          const d='M '+pts.replace(/ /g,' L ')+(poly.tagName==='polygon'?' Z':'');
          path=document.createElementNS('http://www.w3.org/2000/svg','path'); path.setAttribute('d',d); svg.appendChild(path);
        }
      }
    }
    if(!path) return;

    // Layer to hold edge stars
    let layer=host.querySelector(':scope > .shape-edge-sparkles');
    if(!layer){ layer=document.createElement('div'); layer.className='shape-edge-sparkles'; host.appendChild(layer); }
    layer.innerHTML='';

    // Shared vars (inherit from your Starfield CSS)
    const body=document.body, root=document.documentElement;
    const count   = Math.max(0, Math.round(cssNum(body,'--star-count',40)));  // <-- uses CSS var
    const durMin  = cssNum(body,'--twinkle-min',0.5);
    const durMax  = cssNum(body,'--twinkle-max',2.0);
    const opMin   = cssNum(body,'--opacity-min',0.15);
    const opMax   = cssNum(body,'--opacity-max',1.0);
    const blurMax = cssNum(body,'--max-blur',0.12);
    const phi     = cssNum(body,'--phi',1.618);
    const sizeL   = cssNum(root,'--size-large',1.5);
    const sizeM   = sizeL / (phi||1.618);
    const sizeS   = sizeM / (phi||1.618);

    const randomize = clamp01(target.randomize ?? 0.35);
    const jitterPx  = (target.jitterRem ?? 0.30) * rem();

    const total = path.getTotalLength(); if(!total) return;
    const layerRect = layer.getBoundingClientRect();

    for(let i=0;i<count;i++){
      // Choose arc length: blend even spacing with random
      const evenD=(i+0.5)*(total/count), randD=Math.random()*total;
      const d=(lerp(evenD,randD,randomize))%total;

      const p=path.getPointAtLength(d), p2=path.getPointAtLength((d+0.5)%total);
      // normal
      let nx=-(p2.y-p.y), ny=(p2.x-p.x); const nlen=Math.hypot(nx,ny)||1; nx/=nlen; ny/=nlen;
      const j=(Math.random()<0.5?-1:1)*rand(0,jitterPx);
      const scr=svgToClient(svg, p.x+nx*j, p.y+ny*j);
      const left=scr.x-layerRect.left, top=scr.y-layerRect.top;

      // Star element with your quantized sizes + timings
      const r=Math.random();
      const sizeRem = r<1/3 ? sizeS : (r<2/3 ? sizeM : sizeL);
      const opacity = rand(opMin, opMax);
      const twDur   = rand(durMin, durMax);
      const twDelay = -Math.random()*twDur;
      const blurPx  = rand(0, blurMax*rem());

      const star=document.createElement('span');
      star.className='star';
      star.style.left=left+'px'; star.style.top=top+'px';
      star.style.setProperty('--size', sizeRem+'rem');
      star.style.setProperty('--o', opacity.toFixed(2));
      star.style.setProperty('--twinkle', twDur.toFixed(2)+'s');
      star.style.setProperty('--tw-delay', twDelay.toFixed(2)+'s');
      star.style.setProperty('--blur', blurPx.toFixed(2)+'px');
      layer.appendChild(star);
    }

    // Rebuild on resizes/layout shifts
    observeResize(host,  () => buildFor(target));
    observeResize(svg,   () => buildFor(target));
    observeResize(layer, () => buildFor(target));
  }

  // Debounced ResizeObserver
  const ro=new ResizeObserver(entries=>{
    for(const e of entries){
      const cb=e.target.__edgeCb; if(!cb) continue;
      clearTimeout(e.target.__edgeTo); e.target.__edgeTo=setTimeout(cb,60);
    }
  });
  function observeResize(el, cb){ el.__edgeCb=cb; ro.observe(el); }

  // Keep in sync with editor DOM changes + var tweaks (your sentinel still works)
  const mo=new MutationObserver(()=>{ clearTimeout(window.__edgeOnlyT); window.__edgeOnlyT=setTimeout(initAll,120); });
  function initAll(){ TARGETS.forEach(buildFor); }

  onReady(()=>{
    document.body.classList.add('has-starfield');
    initAll();
    mo.observe(document.body,{subtree:true,childList:true});
    window.addEventListener('resize',()=>initAll(),{passive:true});
    window.addEventListener('load',()=>initAll());
  });
})();