(function () {
  var svg = document.querySelector(".mm-hero-svg");
  if (!svg) return;

  var zoneLeft  = svg.querySelector("#PupilZoneLeft");
  var zoneRight = svg.querySelector("#PupilZoneRight");
  if (!zoneLeft || !zoneRight) {
    console.warn("[Eyes] Pupil zones not found");
    return;
  }

  console.log("[Eyes] Zones found", zoneLeft, zoneRight);

  var pupilURL = "https://www.mysticmunson.design/s/pupil.svg"; // <-- put your real URL here
  var maxOffset = 5; // movement in SVG units; tweak to taste

  var XLINK_NS = "http://www.w3.org/1999/xlink";

  function makeEye(zone, cls) {
    // Outer group we will move
    var g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.classList.add("mm-pupil", cls);

    // Pupil image
    var img = document.createElementNS("http://www.w3.org/2000/svg", "image");
    img.setAttributeNS(XLINK_NS, "href", pupilURL);
    img.setAttribute("href", pupilURL); // modern browsers

    // Eye zone bbox: 40×20 for you
    var box = zone.getBBox();
    var cx = box.x + box.width / 2;
    var cy = box.y + box.height / 2;

    // How big should the pupil be? ~60% of eye height
    var pupilH = box.height * 0.6;   // 0.6 * 20 = 12 units tall
    var pupilW = pupilH;             // make it roughly circular

    // Center the image around (0,0) inside its group
    img.setAttribute("width", pupilW);
    img.setAttribute("height", pupilH);
    img.setAttribute("x", -pupilW / 2);
    img.setAttribute("y", -pupilH / 2);

    // Optional: add a debug dot to confirm the center
    /*
    var debug = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    debug.setAttribute("cx", 0);
    debug.setAttribute("cy", 0);
    debug.setAttribute("r", 1.5);
    debug.setAttribute("fill", "red");
    g.appendChild(debug);
    */

    g.appendChild(img);

    // Place the whole group at the eye center
    g.setAttribute("transform", "translate(" + cx + " " + cy + ")");
    zone.appendChild(g);

    return {
      group: g,
      baseX: cx,
      baseY: cy
    };
  }

  var leftEye  = makeEye(zoneLeft,  "mm-left");
  var rightEye = makeEye(zoneRight, "mm-right");
  if (!leftEye || !rightEye) return;

  var isCoarse =
    window.matchMedia &&
    window.matchMedia("(pointer: coarse)").matches;

  function onMove(e) {
    var rect = svg.getBoundingClientRect();
    var mx = e.clientX;
    var my = e.clientY;

    var cx = rect.left + rect.width / 2;
    var cy = rect.top + rect.height / 2;

    var nx = (mx - cx) / (rect.width / 2);
    var ny = (my - cy) / (rect.height / 2);

    // clamp to [-1, 1]
    nx = Math.max(-1, Math.min(1, nx));
    ny = Math.max(-1, Math.min(1, ny));

    var dx = nx * maxOffset;
    var dy = ny * maxOffset;

    leftEye.group.setAttribute(
      "transform",
      "translate(" + (leftEye.baseX + dx) + " " + (leftEye.baseY + dy) + ")"
    );

    rightEye.group.setAttribute(
      "transform",
      "translate(" + (rightEye.baseX + dx) + " " + (rightEye.baseY + dy) + ")"
    );
  }

  if (!isCoarse) {
    window.addEventListener("mousemove", onMove);
  } else {
    console.log("[Eyes] Coarse pointer detected, disabling eye tracking");
  }
})();
