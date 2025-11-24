(function () {
  // Try to grab the actual <svg> regardless of where the class lives
  var svg =
    document.querySelector("svg.mm-hero-svg") ||
    document.querySelector(".mm-hero-svg svg") ||
    document.querySelector("svg.mm-hero") || // fallback if you rename
    document.querySelector("svg");

  if (!svg) {
    console.warn("[Eyes] No hero SVG found");
    return;
  }

  // Pupils by ID (your SVG uses exactly these IDs)
  var left  = svg.querySelector("#PupilLeft");
  var right = svg.querySelector("#PupilRight");

  if (!left || !right) {
    console.warn("[Eyes] Could not find PupilLeft/PupilRight", left, right);
    console.log("[Eyes] Existing pupil-like nodes:", svg.querySelectorAll('[id*="Pupil"]'));
    return;
  }

  console.log("[Eyes] Pupils found", left, right);

  var maxOffset = 5; // movement range in SVG units – tweak 3–7 to taste

  // We only need relative motion; pupils are already in the right place.
  function onMove(e) {
    var rect = svg.getBoundingClientRect();

    var nx = (e.clientX - (rect.left + rect.width  / 2)) / (rect.width  / 2);
    var ny = (e.clientY - (rect.top  + rect.height / 2)) / (rect.height / 2);

    // clamp [-1, 1]
    nx = Math.max(-1, Math.min(1, nx));
    ny = Math.max(-1, Math.min(1, ny));

    var dx = nx * maxOffset;
    var dy = ny * maxOffset;

    // Move each pupil group a little relative to its original position
    left.setAttribute("transform",  "translate(" + dx + " " + dy + ")");
    right.setAttribute("transform", "translate(" + dx + " " + dy + ")");
  }

  var isCoarse =
    window.matchMedia &&
    window.matchMedia("(pointer: coarse)").matches;

  if (!isCoarse) {
    window.addEventListener("mousemove", onMove);
  } else {
    console.log("[Eyes] Coarse pointer; disabled.");
  }
})();
