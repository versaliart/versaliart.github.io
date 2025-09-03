(() => {
  const ATTRS = ['data-tags','data-sort','data-case','data-prefix','data-target','data-limit','data-more-pill','data-hash'];

  function titleCaseSmart(s){
    return s.replace(/\b[\w'-]+\b/g, w => {
      if (/^[A-Z]{2,}$/.test(w)) return w;          // ACRONYM (ABC)
      if (/\d/.test(w) && /[A-Za-z]/.test(w)) {
        // Mixed alnum like 3D, H2O → keep caps on letters
        return w.replace(/[A-Za-z]+/g, m => m.toUpperCase());
      }
      return w[0].toUpperCase() + w.slice(1).toLowerCase();
    });
  }

  function parseTagsFrom(el){
    const hasAttr = el.hasAttribute('data-tags');
    let tags;

    if (hasAttr) {
      // Comma-separated ONLY (ignore spaces)
      const raw = (el.getAttribute('data-tags') || '').trim();
      tags = raw ? raw.split(/\s*,\s*/).filter(Boolean) : [];
    } else {
      // If you type lines inside the Code Block instead of data-tags
      const raw = (el.textContent || '');
      tags = raw.split(/\r?\n+/).map(t => t.trim()).filter(Boolean);
    }

    // De-dupe case-insensitively (keep first appearance)
    const seen = new Map();
    for (const t of tags) {
      const k = t.toLowerCase();
      if (!seen.has(k)) seen.set(k, t);
    }
    tags = Array.from(seen.values());

    // Casing
    const how = (el.dataset.case || 'as-is').toLowerCase();
    if (how === 'upper') tags = tags.map(t => t.toUpperCase());
    else if (how === 'lower') tags = tags.map(t => t.toLowerCase());
    else if (how === 'title') tags = tags.map(titleCaseSmart);

    // Sort
    if ((el.dataset.sort || '').toLowerCase().startsWith('alpha')) {
      tags.sort((a,b) => a.localeCompare(b, undefined, {sensitivity:'base'}));
    }
    return tags;
  }

  function buildList(el){
    const prefix   = el.dataset.prefix || '';
    const target   = el.dataset.target || '';
    const limit    = parseInt(el.dataset.limit || '0', 10);
    const showMore = (el.dataset.morePill || 'show').toLowerCase() !== 'hide';
    const showHash = (el.dataset.hash || 'show').toLowerCase() !== 'hide';

    let tags = parseTagsFrom(el);
    const total = tags.length;

    let extraCount = 0;
    if (limit > 0 && total > limit) { extraCount = total - limit; tags = tags.slice(0, limit); }

    const ul = document.createElement('ul');
    ul.className = 'tag-pills__list';
    ul.setAttribute('role','list');

    for (const t of tags){
      const li = document.createElement('li');
      const node = prefix ? document.createElement('a') : document.createElement('span');
      node.className = 'tag-pill';
      if (prefix) {
        node.href = prefix + encodeURIComponent(t);
        if (target) node.target = target;
        if (target === '_blank') node.rel = 'noopener';
      }
      node.innerHTML = (showHash ? '<span class="hash">#</span>' : '') + t;
      li.appendChild(node);
      ul.appendChild(li);
    }

    if (showMore && extraCount > 0){
      const li = document.createElement('li');
      const more = document.createElement(prefix ? 'a' : 'span');
      more.className = 'tag-pill is-more';
      more.textContent = `+${extraCount}`;
      if (prefix){ more.href = prefix.replace(/=$/, ''); }
      li.appendChild(more);
      ul.appendChild(li);
    }
    return ul;
  }

  function render(el){
    if (el.__rendering) return;
    el.__rendering = true;
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
      if (!el.dataset.enhanced) render(el);
      observeTagPills(el);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', enhanceAll);
  else enhanceAll();

  const pageMO = new MutationObserver(muts => {
    for (const m of muts){
      m.addedNodes?.forEach(n => {
        if (n.nodeType === 1) {
          if (n.matches?.('.tag-pills')) enhanceAll(n);
          if (n.querySelectorAll) enhanceAll(n);
        }
      });
    }
  });
  pageMO.observe(document.documentElement, { childList:true, subtree:true });
})();