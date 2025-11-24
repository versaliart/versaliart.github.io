(function () {
  // Grab the actual <svg> regardless of whether the class is on it or a wrapper
  var svg =
    document.querySelector("svg.mm-hero-svg") ||
    document.querySelector(".mm-hero-svg svg") ||
    document.querySelector("svg.mm-hero") ||
    document.querySelector("svg");

  if (!svg) {
    console.warn("[Eyes] No hero SVG found");
    return;
  }

  function setupEye(pupilId, zoneId) {
    var pupil = svg.querySelector("#" + pupilId);
    var zone  = svg.querySelector("#" + zoneId);

    if (!pupil || !zone) {
      console.warn("[Eyes] Missing pupil or zone for", pupilId, zoneId, pupil, zone);
      return null;
    }

    // Center of the pupil in SVG space
    var pupilBox = pupil.getBBox();
    var cx = pupilBox.x + pupilBox.width  / 2;
    var cy = pupilBox.y + pupilBox.height / 2;

    // Bounding box of the allowed zone (we constrain the *center* to this)
    var zoneBox = zone.getBBox();
    var zoneLeft   = zoneBox.x;
    var zoneRight  = zoneBox.x + zoneBox.width;
    var zoneTop    = zoneBox.y;
    var zoneBottom = zoneBox.y + zoneBox.height;

    // How far center can move before it hits zone edges
    var maxXNeg = cx - zoneLeft;
    var maxXPos = zoneRight - cx;
    var maxYNeg = cy - zoneTop;
    var maxYPos = zoneBottom - cy;

    // Use symmetrical limits so the motion feels even
    var maxX = Math.min(maxXNeg, maxXPos);
    var maxY = Math.min(maxYNeg, maxYPos);

    // Wrap the pupil group in a new group so we can transform it cleanly
    var wrapper = document.createElementNS("http://www.w3.org/2000/svg", "g");
    // Preserve the original ID on the wrapper
    wrapper.setAttribute("id", pupilId);

    var parent = pupil.parentNode;
    parent.replaceChild(wrapper, pupil);
    wrapper.appendChild(pupil);

    return {
      node: wrapper,
      cx: cx,
      cy: cy,
      maxX: maxX,
      maxY: maxY,
      currentX: 0,
      currentY: 0,
      targetX: 0,
      targetY: 0
    };
  }

  var leftEye  = setupEye("PupilLeft",  "PupilZoneLeft");
  var rightEye = setupEye("PupilRight", "PupilZoneRight");

var leftEye  = setupEye("PupilLeft",  "PupilZoneLeft");
var rightEye = setupEye("PupilRight", "PupilZoneRight");

if (!leftEye || !rightEye) {
  console.warn("[Eyes] Failed to setup eyes");
  return;
}

/* 🔧 Normalize ranges so both eyes move the same amount */
var sharedMaxX = Math.min(leftEye.maxX, rightEye.maxX);
var sharedMaxY = Math.min(leftEye.maxY, rightEye.maxY);

leftEye.maxX  = sharedMaxX;
rightEye.maxX = sharedMaxX;
leftEye.maxY  = sharedMaxY;
rightEye.maxY = sharedMaxY;


  if (!leftEye || !rightEye) {
    console.warn("[Eyes] Failed to setup eyes");
    return;
  }

  var isCoarse =
    window.matchMedia &&
    window.matchMedia("(pointer: coarse)").matches;

  var ease = 0.15;          // easing factor for in/out
  var squishAmtX = 0.12;    // max horizontal squish (1 -> 0.88)
  var squishAmtY = 0.12;    // max vertical squish (1 -> 0.88)
  var nonLinearPower = 1.7; // >1 = more dramatic far, gentler near

  var animating = false;

  function updateTransforms() {
    // Ease current toward target and apply transforms
    [leftEye, rightEye].forEach(function (eye) {
      // Ease in/out
      eye.currentX += (eye.targetX - eye.currentX) * ease;
      eye.currentY += (eye.targetY - eye.currentY) * ease;

      // How close are we to the horizontal/vertical bounds?
      var edgeX = eye.maxX > 0 ? Math.min(1, Math.abs(eye.currentX) / eye.maxX) : 0;
      var edgeY = eye.maxY > 0 ? Math.min(1, Math.abs(eye.currentY) / eye.maxY) : 0;

      // Squish based on how close we are to the edges
      // Zero squish at center; max squish at boundary
      var scaleX = 1 - squishAmtX * edgeX; // squish horizontally at left/right
      var scaleY = 1 - squishAmtY * edgeY; // squish vertically at top/bottom

      // Compose transform so we:
      // 1) scale around the eye's center (cx, cy)
      // 2) then translate by currentX/currentY
      var tx = eye.currentX;
      var ty = eye.currentY;

      var transform =
        "translate(" + tx + " " + ty + ") " +
        "translate(" + eye.cx + " " + eye.cy + ") " +
        "scale(" + scaleX + " " + scaleY + ") " +
        "translate(" + (-eye.cx) + " " + (-eye.cy) + ")";

      eye.node.setAttribute("transform", transform);
    });
  }

  function animate() {
    if (!animating) return;
    updateTransforms();
    requestAnimationFrame(animate);
  }

  function startAnimationLoop() {
    if (!animating) {
      animating = true;
      requestAnimationFrame(animate);
    }
  }

  function onMove(e) {
    var rect = svg.getBoundingClientRect();
    var mx = e.clientX;
    var my = e.clientY;

    // Normalize mouse position relative to SVG center in [-1, 1]
    var cx = rect.left + rect.width  / 2;
    var cy = rect.top  + rect.height / 2;

    var nx = (mx - cx) / (rect.width  / 2);
    var ny = (my - cy) / (rect.height / 2);

    // clamp
    nx = Math.max(-1, Math.min(1, nx));
    ny = Math.max(-1, Math.min(1, ny));

    // Non-linear response: gentle near center, dramatic far away
    function curve(v) {
      var s = v < 0 ? -1 : 1;
      var mag = Math.min(1, Math.abs(v));
      return s * Math.pow(mag, nonLinearPower);
    }

    var fx = curve(nx);
    var fy = curve(ny);

    [leftEye, rightEye].forEach(function (eye) {
      // Proposed offsets based on non-linear mapped cursor
      var targetX = fx * eye.maxX;
      var targetY = fy * eye.maxY;

      // Constrain by center so the center never leaves the zone box
      targetX = Math.max(-eye.maxX, Math.min(eye.maxX, targetX));
      targetY = Math.max(-eye.maxY, Math.min(eye.maxY, targetY));

      eye.targetX = targetX;
      eye.targetY = targetY;
    });

    startAnimationLoop();
  }

  if (!isCoarse) {
    window.addEventListener("mousemove", onMove);
  } else {
    console.log("[Eyes] Coarse pointer; disabled eye tracking");
  }
})();
