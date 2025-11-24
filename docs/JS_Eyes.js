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
        var group = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "g"
        );
        group.classList.add("mm-pupil", cls);

        // Insert the loaded shapes
        group.appendChild(graphic.cloneNode(true));
        zone.appendChild(group);

        // The zone’s bounding box defines the center point
        var b = zone.getBBox();
        var cx = b.x + b.width / 2;
        var cy = b.y + b.height / 2;

        // Initial placement
        group.setAttribute("transform", "translate(" + cx + " " + cy + ")");

        return { group, baseX: cx, baseY: cy };
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
