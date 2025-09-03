<script>
/* -----------------------------------------------------------
   Starfield v1.0 (patched)
   - Bootstrap wrapper ensures live/editor readiness
   - Adds body.has-starfield
   - Ensures #starfield-enable exists INSIDE a real section
   - Then runs your per-section Starfield build
----------------------------------------------------------- */

console.log("[Starfield] external JS executing (patched)");

(function () {
  // ---- helpers for readiness / selection
  function onReady(fn) {
    if (document.readyState === "complete" || document.readyState === "interactive") {
      setTimeout(fn, 0);
    } else {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    }
  }

  function whenSelector(sel, cb) {
    const el = document.querySelector(sel);
    if (el) return cb(el);
    const mo = new MutationObserver(() => {
      const found = document.querySelector(sel);
      if (found) { mo.disconnect(); cb(found); }
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });
  }

  function findOrCreateTargetSection() {
    // Prefer an existing marker living inside a section
    let marker = document.getElementById("starfield-enable");
    let section = marker?.closest?.("section.page-section, section.sqs-section") || null;

    // If no good section-marker pair, choose the first visible Squarespace section and inject a hidden marker there
    if (!section) {
      section = document.querySelector("section.page-section, section.sqs-section");
      if (!section) return null; // nothing to do yet
      marker = document.createElement("div");
      marker.id = "starfield-enable";
      marker.hidden = true;
      marker.style.display = "none";
      const content = section.querySelector(":scope > .content-wrapper");
      if (content) section.insertBefore(marker, content);
      else section.prepend(marker);
      console.info("[Starfield] injected #starfield-enable into first section");
    }

    return { marker, section };
  }

  onReady(function () {
    // Wait until Squarespace has laid out at least one major wrapper/section
    whenSelector("section.page-section, section.sqs-section, .content-wrapper, main", function () {
      const ctx = findOrCreateTargetSection();
      if (!ctx) { console.info("[Starfield] No section found yet; aborting"); return; }
      const targetSection = ctx.section;

      document.body.classList.add("has-starfield"); // global toggle some CSS uses

      console.log("[Starfield] init start");

      /* =========================================================
         Your Starfield v1.0 code (slightly tidied, no logic change)
      ==========================================================*/

      // ---------- helpers ----------
      const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

      function getCssLenPx(name, fallbackPx){
        const root = document.documentElement;
        const remPx = parseFloat(getComputedStyle(root).fontSize) || 16;
        const raw = getComputedStyle(document.body).getPropertyValue(name).trim();
        if (!raw) return fallbackPx;
        const n = parseFloat(raw);
        if (!Number.isFinite(n)) return fallbackPx;
        if (raw.endsWith('rem')) return n * remPx;
        return n; // px by default (also fine for unitless)
      }

      function getCssNum(name, fallback) {
        const from = (el) => {
          const v = getComputedStyle(el).getPropertyValue(name).trim();
          const n = parseFloat(v);
          return Number.isFinite(n) ? n : null;
        };
        return from(document.body) ?? from(document.documentElement) ?? fallback;
      }

      function getCssRem(name, fallbackRem) {
        const root = document.documentElement;
        const remPx = parseFloat(getComputedStyle(root).fontSize) || 16;
        const raw = getComputedStyle(document.body).getPropertyValue(name).trim();
        if (!raw) return fallbackRem;
        const n = parseFloat(raw);
        if (!Number.isFinite(n)) return fallbackRem;
        return raw.endsWith('px') ? (n / remPx) : n; // convert px→rem if needed
      }

      // U-shaped sampler (unused in current placement but kept for future tweaks)
      function uShape(power = 0.6) {
        const p = clamp(power, 0.05, 3);
        const u = Math.random();                   // [0,1]
        const v = u < 0.5 ? 2 * u : 2 * (1 - u);   // fold at center
        const w = Math.pow(v, p);                  // bias
        return u < 0.5 ? 0.5 - 0.5 * w : 0.5 + 0.5 * w;
      }

      // ---------- read CSS variables each build ----------
      function readVars() {
        return {
          totalCount: Math.max(0, Math.round(getCssNum('--star-count', 40))),
          durMin:     getCssNum('--twinkle-min', 2.5),
          durMax:     getCssNum('--twinkle-max', 6.5),
          opMin:      getCssNum('--opacity-min', 0.35),
          opMax:      getCssNum('--opacity-max', 0.95),
          blurMax:    getCssNum('--max-blur', 0.12),
          phi:        getCssNum('--phi', 1.618),
          sizeLrem:   getCssRem('--size-large', 1.5),
          gapPx:      getCssLenPx('--star-min-gap', 0),
          /* radial bias strength (k). 1 = uniform disk; higher = more edge-weighted */
          radialK:    getCssNum('--radial-bias-k', 2.5)
        };
      }

      // ---------- star factory (no drift; sizes S/M/L from CSS) ----------
      function createStar(vars) {
        const { durMin, durMax, opMin, opMax, blurMax, phi, sizeLrem } = vars;

        const el = document.createElement('span');
        el.className = 'star';

        const sizeMrem = sizeLrem / (phi || 1.618);
        const sizeSrem = sizeMrem / (phi || 1.618);

        // Pick exactly one of S / M / L (equal weights; adjust as desired)
        const r = Math.random();
        const sizeRem = r < 1/3 ? sizeSrem : (r < 2/3 ? sizeMrem : sizeLrem);

        const scale   = 1; // preserve quantized sizes
        const opacity = Math.random() * (opMax - opMin) + opMin;

        // Twinkle timing (opacity only), start mid-cycle (negative delay)
        const twinkleDur   = Math.random() * (durMax - durMin) + durMin;
        const twinkleDelay = -Math.random() * twinkleDur;

        // Subtle glow
        const remPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
        const blur = Math.random() * blurMax * remPx;

        // Cache for safe placement
        const sizePx = sizeRem * remPx;
        el.dataset.sizePx = sizePx.toFixed(2);
        el.dataset.dx = '0';
        el.dataset.dy = '0';

        // Per-star CSS vars
        el.style.setProperty('--size', `${sizeRem}rem`);
        el.style.setProperty('--scale', scale.toFixed(3));
        el.style.setProperty('--o', opacity.toFixed(2));
        el.style.setProperty('--twinkle', `${twinkleDur.toFixed(2)}s`);
        el.style.setProperty('--tw-delay', `${twinkleDelay.toFixed(2)}s`);
        el.style.setProperty('--dx', `0px`);
        el.style.setProperty('--dy', `0px`);
        el.style.setProperty('--blur', `${blur.toFixed(2)}px`);

        return el;
      }

      // ---------- ensureContainer: stars in THIS section ----------
      function ensureContainer(section) {
        let container = section.querySelector(':scope > .star-container');
        if (!container) {
          container = document.createElement('div');
          container.className = 'star-container';
          const content = section.querySelector(':scope > .content-wrapper');
          if (content) section.insertBefore(container, content);
          else section.appendChild(container);
        }
        return container;
      }

      // sample r in [0..1] with pdf ∝ r^k (k=1 uniform disk; higher = more edge bias)
      function sampleRadius(k){
        const kk = Math.max(0, k || 1);
        const u  = Math.random();
        return Math.pow(u, 1 / (kk + 1));
      }

      function positionStarsInSection(section, container, vars) {
        const vw = section.clientWidth  || 0;
        const vh = section.clientHeight || 0;
        if (!vw || !vh) return;

        // Pre-extract star nodes and their radii
        const stars = Array.from(container.querySelectorAll('.star')).map(el => ({
          el,
          r: (parseFloat(el.dataset.sizePx) || 0) / 2 // radius in px
        }));

        // Safe margins so the full shape remains inside
        const maxR = stars.reduce((m, s) => Math.max(m, s.r), 0);
        let marginX = vw ? ((maxR) / vw * 100) : 2;
        let marginY = vh ? ((maxR) / vh * 100) : 2;
        marginX = Math.min(45, Math.max(0, marginX));
        marginY = Math.min(45, Math.max(0, marginY));

        const minX = marginX / 100, maxX = 1 - marginX / 100;
        const minY = marginY / 100, maxY = 1 - marginY / 100;

        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;
        const ax = (maxX - minX) / 2; // ellipse axes for radial bias
        const ay = (maxY - minY) / 2;

        const placed = []; // {xPx,yPx,r}

        stars.forEach((s) => {
          const attemptsMax = 30;
          let xPx=0, yPx=0, ok=false;

          for (let attempt=0; attempt<attemptsMax && !ok; attempt++){
            const theta = Math.random() * Math.PI * 2;
            const rN    = sampleRadius(vars.radialK);

            // Candidate in normalized [0..1]
            let xN = cx + ax * rN * Math.cos(theta);
            let yN = cy + ay * rN * Math.sin(theta);

            // Clamp to box
            xN = Math.min(maxX, Math.max(minX, xN));
            yN = Math.min(maxY, Math.max(minY, yN));

            xPx = xN * vw;
            yPx = yN * vh;

            // Check distance to previous stars (radius + radius + gap)
            ok = true;
            for (let i=0;i<placed.length;i++){
              const p = placed[i];
              const dx = xPx - p.xPx;
              const dy = yPx - p.yPx;
              const minD = p.r + s.r + (vars.gapPx || 0);
              if ((dx*dx + dy*dy) < (minD*minD)) { ok = false; break; }
            }
          }

          // Accept last candidate even if not ok to avoid infinite loops
          placed.push({ xPx, yPx, r: s.r });

          // Apply as percentages back to CSS vars
          s.el.style.setProperty('--x', `${(xPx / vw * 100).toFixed(4)}%`);
          s.el.style.setProperty('--y', `${(yPx / vh * 100).toFixed(4)}%`);
        });
      }

      // ---------- build ----------
      function buildAll() {
        const vars = readVars();

        // Clear old stars ONLY in this section
        targetSection.querySelectorAll(':scope > .star-container').forEach(n => n.remove());

        if (vars.totalCount === 0 || targetSection.classList.contains('stars-off')) {
          document.body.setAttribute('data-stars', '0');
          return;
        }

        const container = ensureContainer(targetSection);
        container.innerHTML = '';
        const frag = document.createDocumentFragment();
        for (let i = 0; i < vars.totalCount; i++) frag.appendChild(createStar(vars));
        container.appendChild(frag);
        positionStarsInSection(targetSection, container, vars);

        document.body.setAttribute('data-stars', String(vars.totalCount));
      }

      // Initial build after one paint so CSS is applied
      requestAnimationFrame(buildAll);

      // Rebuild when --star-count changes (even with CSS panel open)
      (function () {
        if (document.querySelector('.star-var-sentinel')) return;
        const s = document.createElement('div');
        s.className = 'star-var-sentinel';
        s.setAttribute('aria-hidden', 'true');
        s.style.cssText =
          'position:absolute;left:-9999px;top:-9999px;height:0;overflow:hidden;pointer-events:none;opacity:0;width:calc(var(--star-count) * 1px);';
        document.body.appendChild(s);
        new ResizeObserver(buildAll).observe(s);
      })();

      // Rebuild on resize / load
      let t;
      window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(buildAll, 150); });
      window.addEventListener('load',   () => setTimeout(buildAll, 50));

      console.log("[Starfield] init complete");
    });
  });
})();
</script>
