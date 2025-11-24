(function () {
  function ready(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  // Load external SVG and return its inner nodes as a fragment
  function loadPupilGraphic(url) {
    return fetch(url)
      .then(r => r.text())
      .then(txt => {
        var wrap = document.createElement("div");
        wrap.innerHTML = txt.trim();
        var svg = wrap.querySelector("svg");
        if (!svg) return null;

        var frag = document.createDocumentFragment();
        while (svg.firstChild) frag.appendChild(svg.firstChild);
        return frag;
      })
      .catch(err => {
        console.error("Cannot load pupil.svg", err);
        return null;
      });
  }

  ready(function () {
    var svg = document.querySelector(".mm-hero-svg");
    if (!svg) return;

    var zoneLeft  = svg.querySelector("#PupilZoneLeft");
    var zoneRight = svg.querySelector("#PupilZoneRight");
    if (!zoneLeft || !zoneRight) return;

    var isCoarse = window.matchMedia("(pointer: coarse)").matches;
    var pupilURL = "https://www.mysticmunson.design/s/pupil.svg";

    var maxOffset = 12; // movement radius in SVG units

    loadPupilGraphic(pupilURL).then(function (graphic) {
      if (!graphic) return;

      // Create a pupil inside a zone and compute its center
function makeEye(zone, cls) {
  // Outer wrapper that we will MOVE around
  var group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  group.classList.add("mm-pupil", cls);

  // Inner group that holds the pupil artwork and gets SCALED
  var inner = document.createElementNS("http://www.w3.org/2000/svg", "g");
  inner.classList.add("mm-pupil-inner");

  inner.appendChild(graphic.cloneNode(true));
  group.appendChild(inner);
  zone.appendChild(group);

  // Eye zone bbox – defines center + available area
  var zoneBox = zone.getBBox();
  var cx = zoneBox.x + zoneBox.width / 2;
  var cy = zoneBox.y + zoneBox.height / 2;

  // First, center the whole pupil group in the eye zone
  group.setAttribute("transform", "translate(" + cx + " " + cy + ")");

  // Now measure the raw pupil artwork
  var artBox = inner.getBBox();

  // Decide how big the pupil should be relative to the eye zone
  // 0.45 = 45% of the smaller dimension of the zone; tweak this
  var targetSize = Math.min(zoneBox.width, zoneBox.height) * 0.45;
  var artMaxDim = Math.max(artBox.width, artBox.height) || 1;
  var scale = targetSize / artMaxDim;

  // Scale the pupil artwork around its own origin
  inner.setAttribute("transform", "scale(" + scale + ")");

  return {
    group: group,   // we animate this one (translate only)
    baseX: cx,
    baseY: cy
  };
}


      var leftEye  = makeEye(zoneLeft, "mm-left");
      var rightEye = makeEye(zoneRight, "mm-right");

      function onMouse(e) {
        var rect = svg.getBoundingClientRect();
        var nx = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
        var ny = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);

        // clamp into [-1,1]
        nx = Math.max(-1, Math.min(1, nx));
        ny = Math.max(-1, Math.min(1, ny));

        var dx = nx * maxOffset;
        var dy = ny * maxOffset;

        leftEye.group.setAttribute(
          "transform",
          `translate(${leftEye.baseX + dx} ${leftEye.baseY + dy})`
        );

        rightEye.group.setAttribute(
          "transform",
          `translate(${rightEye.baseX + dx} ${rightEye.baseY + dy})`
        );
      }

      if (!isCoarse) window.addEventListener("mousemove", onMouse);
    });
  });
})();
