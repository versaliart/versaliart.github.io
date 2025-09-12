(function () {
  document.addEventListener("DOMContentLoaded", function () {
    const codeBlock = document.currentScript.closest(".sqs-block-code");
    if (!codeBlock) return;

    const section = codeBlock.closest("section");
    if (!section) return;

    const prevSection = section.previousElementSibling;
    const nextSection = section.nextElementSibling;

    let autoScrolling = false;
    let lastY = window.scrollY;

    function onScroll() {
      if (autoScrolling) return;

      const y = window.scrollY;
      const dir = y > lastY ? 1 : (y < lastY ? -1 : 0); // 1=down, -1=up
      lastY = y;

      const rect = section.getBoundingClientRect();
      const vh = window.innerHeight;

      // Small hysteresis to avoid jitter around exact edges
      const EPS = 1; // px

      // DOWN: trigger as soon as the section's bottom begins to move above the viewport bottom
      if (dir === 1 && nextSection && rect.bottom <= vh - EPS) {
        autoScrolling = true;
        nextSection.scrollIntoView({ behavior: "smooth" });
        setTimeout(() => (autoScrolling = false), 900);
        return;
      }

      // UP: trigger as soon as the section's top begins to move below the viewport top
      if (dir === -1 && prevSection && rect.top >= 0 + EPS) {
        autoScrolling = true;
        prevSection.scrollIntoView({ behavior: "smooth" });
        setTimeout(() => (autoScrolling = false), 900);
        return;
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
  });
})();