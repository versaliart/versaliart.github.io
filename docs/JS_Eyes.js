(function () {
  var svg = document.querySelector(".mm-hero-svg");
  if (!svg) return;

  var left = svg.querySelector("#PupilLeft");
  var right = svg.querySelector("#PupilRight");

  if (!left || !right) {
    console.warn("[Eyes] Could not find PupilLeft/PupilRight");
    return;
  }

  console.log("[Eyes] Pupils found");

  // Compute their original center positions by reading their current transform box
  function getCenter(node) {
    var box = node.getBBox();
    return {
      x: box.x + box.width / 2,
      y: box.y + box.height / 2
    };
  }

  var baseLeft  = getCenter(left);
  var baseRight = getCenter(right);

  var maxOffset = 5; // adjust for playfulness

  function onMove(e) {
    var rect = svg.getBoundingClientRect();

    var nx = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
    var ny = (e.clientY - (rect.top  + rect.height / 2)) / (rect.height / 2);

    // clamp [-1,1]
    nx = Math.max(-1, Math.min(1, nx));
    ny = Math.max(-1, Math.min(1, ny));

    var dx = nx * maxOffset;
    var dy = ny * maxOffset;

    left.setAttribute(
      "transform",
      "translate(" + (baseLeft.x + dx) + " " + (baseLeft.y + dy) + ")"
    );

    right.setAttribute(
      "transform",
      "translate(" + (baseRight.x + dx) + " " + (baseRight.y + dy) + ")"
    );
  }

  var isCoarse =
    window.matchMedia &&
    window.matchMedia("(pointer: coarse)").matches;

  if (!isCoarse) {
    window.addEventListener("mousemove", onMove);
  } else {
    console.log("[Eyes] Coarse pointer detected; disabled.");
  }
})();
