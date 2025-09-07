<script>
(function(){
  const hdr = document.querySelector('header#header[data-test="header"]');
  if (!hdr) return;

  const STUCK_CLS = 'mm-stuck';
  const TOP = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--mm-sticky-top')) || 12;
  let threshold = 0;

  function computeThreshold(){
    const rect = hdr.getBoundingClientRect();
    // Trigger stick when the bar's top would cross the target top offset
    threshold = window.scrollY + rect.top - TOP;
  }

  function onScroll(){
    if (window.scrollY > threshold) {
      if (!hdr.classList.contains(STUCK_CLS)) hdr.classList.add(STUCK_CLS);
    } else {
      hdr.classList.remove(STUCK_CLS);
    }
  }

  // Initial & responsive recalculation
  computeThreshold();
  onScroll();
  window.addEventListener('scroll', onScroll, {passive:true});
  window.addEventListener('resize', () => { computeThreshold(); onScroll(); });

  // If Squarespace injects announcement bar later, re-measure after paint
  new MutationObserver((muts) => {
    for (const m of muts){
      if (m.type === 'childList') { computeThreshold(); onScroll(); break; }
    }
  }).observe(document.body, {childList:true, subtree:true});
})();
</script>
