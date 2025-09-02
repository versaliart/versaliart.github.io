<script>
(() => {
  const ATTRS = ['data-tags','data-sort','data-case','data-prefix','data-target','data-limit','data-more-pill','data-hash'];

  function titleCase(s){
    return s.replace(/\w\S*/g, w => /[A-Z]{2,}/.test(w) ? w : w[0].toUpperCase() + w.slice(1).toLowerCase());
  }

  function parseTagsFrom(el){
    const src = (el.getAttribute('data-tags')?.trim()) ? el.getAttribute('data-tags') : el.textContent;
    let tags = (src || '')
      .split(/[,\\n]/).map(t => t.trim()).filter(Boolean);

    // dedupe case-insensitively, keep first appearance
    const map = new Map();
    for (const t of tags){ const k = t.toLowerCase(); if (!map.has(k)) map.set(k,t); }
    tags = Array.from(map.values());

    // casing
    const how = (el.dataset.case || 'as-is').toLowerCase();
    if (how === 'upper') tags = tags.map(t => t.toUpperCase());
    else if (how === 'lower') tags = tags.map(t => t.toLowerCase());
    else if (how === 'title') tags = tags.map(titleCase);

    // sort
    if ((el.dataset.sort || '').toLowerCase().startsWith('alpha')){
      tags.sort((a,b) => a.localeCompare(b, undefined, {sensitivity:'base'}));
    }
    return tags;
  }

  function buildList(el){
    const prefix = el.dataset.prefix || '';
    const target = el.dataset.target || '';
    const limit  = parseInt(el.dataset.limit || '0', 10);
    const showMore = (el.dataset.morePill || 'show').toLowerCase() !== 'hide';
    const showHash = (el.dataset.hash || 'show').toLowerCase() !== 'hide';

    let tags = parseTagsFrom(el);
    const total = tags.length;

    let extraCount = 0;
    if (limit > 0 && total > limit){
      extraCount = total - limit;
      tags = tags.slice(0, limit);
    }

    const ul = document.createElement('ul');
    ul.className = 'tag-pills__list';
    ul.setAttribute('role','list');

    for (const t of tags){
      const li = document.createElement('li');
      let node;
      if (prefix){
        const a = document.createElement('a');
        a.className = 'tag-pill';
        a.href = prefix + encodeURIComponent(t);
        if (target) a.target = target;
        if (target === '_blank') a.rel = 'noopener';
        a.innerHTML = (showHash ? '<span class="hash">#</span>' : '') + t;
        node = a;
      } else {
        const span = document.createElement('span');
        span.className = 'tag-pill';
        span.innerHTML = (showHash ? '<span class="hash">#</span>' : '') + t;
        node = span;
      }
      li.appendChild(node);
      ul.appendChild(li);
    }

    if (showMore && extraCount > 0){
      const li = document.createElement('li');
      const more = document.createElement(prefix ? 'a' : 'span');
      more.className = 'tag-pill is-more';
      more.textContent = `+${extraCount}`;
      if (prefix){ more.href = prefix.replace(/\\=$/, ''); }
      li.appendChild(more);
      ul.appendChild(li);
    }
    return ul;
  }

  function render(el){
    // prevent re-entrant loops from its own MutationObserver
    if (el.__rendering) return;
    el.__rendering = true;

    // (Re)render
    const ul = buildList(el);
    el.replaceChildren(ul);

    el.__rendering = false;
    el.dataset.enhanced = '1';
  }

  function observeTagPills(el){
    if (el.__observed) return;
    el.__observed = true;
    const mo = new MutationObserver(() => render(el));
    mo.observe(el, { childList:true, subtree:true, characterData:true, attributes:true, attributeFilter: ATTRS });
  }

  function enhanceAll(root=document){
    root.querySelectorAll('.tag-pills').forEach(el => {
      // Only render if not already rendered, otherwise ensure it is being watched for edits
      if (!el.dataset.enhanced) render(el);
      observeTagPills(el);
    });
  }

  // Initial run
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', () => enhanceAll());
  } else {
    enhanceAll();
  }

  // Watch for blocks added/changed in the editor
  const pageMO = new MutationObserver(muts => {
    for (const m of muts){
      m.addedNodes?.forEach(n => {
        if (n.nodeType !== 1) return;
        if (n.matches?.('.tag-pills')) enhanceAll(n);
        if (n.querySelectorAll) enhanceAll(n);
      });
    }
  });
  pageMO.observe(document.documentElement, { childList:true, subtree:true });
})();
</script>
