document.addEventListener("pageshow", function () {
    const iris = document.getElementById("iris");
    const eyeContainer = document.getElementById("eye-container");
    const maxMoveX = 30;
    const maxMoveY = 20;
    const minScale = 0.8; // Minimum squish scale factor

    let isAnimating = false;

    function updateEyePosition(moveX, moveY) {
        // Squish effect
        const scaleX = 1 - (Math.abs(moveX) / maxMoveX) * (1 - minScale);
        const scaleY = 1 - (Math.abs(moveY) / maxMoveY) * (1 - minScale);

        // Apply transformations
        iris.setAttribute("transform", `translate(${moveX}, ${moveY}) scale(${scaleX}, ${scaleY})`);
    }

    // Desktop: Mouse Tracking
    document.addEventListener("mousemove", (event) => {
        if (!isAnimating) {
            isAnimating = true;
            requestAnimationFrame(() => {
                const rect = eyeContainer.getBoundingClientRect();
                const eyeCenterX = rect.left + rect.width / 2;
                const eyeCenterY = rect.top + rect.height / 2;
                const screenWidth = window.innerWidth;
                const screenHeight = window.innerHeight;

                const deltaX = event.clientX - eyeCenterX;
                const deltaY = event.clientY - eyeCenterY;

                const percentX = deltaX / (screenWidth / 2);
                const percentY = deltaY / (screenHeight / 2);

                const moveX = Math.max(-maxMoveX, Math.min(maxMoveX, percentX * maxMoveX));
                const moveY = Math.max(-maxMoveY, Math.min(maxMoveY, percentY * maxMoveY));

                updateEyePosition(moveX, moveY);
                isAnimating = false;
            });
        }
    });

    // Mobile: Gyroscope-Based Eye Movement
    if (window.DeviceOrientationEvent) {
        window.addEventListener("deviceorientation", (event) => {
            const tiltX = event.beta; // -180 to 180 (front to back tilt)
            const tiltY = event.gamma; // -90 to 90 (side-to-side tilt)

            const moveX = Math.max(-maxMoveX, Math.min(maxMoveX, (tiltY / 45) * maxMoveX));
            const moveY = Math.max(-maxMoveY, Math.min(maxMoveY, (tiltX / 45) * maxMoveY));

            updateEyePosition(moveX, moveY);
        });
    }


        // Function to link up SVG Arrows
          // Get the stored link from the meta tag
          const svgLink = document.getElementById("down-arrow-url").getAttribute("data-url");

          // Apply the link to the down-arrow SVG
          document.querySelectorAll(".dynamic-svg").forEach(svg => {
              svg.setAttribute("xlink:href", svgLink);
              svg.setAttribute("href", svgLink); // Some browsers require this for compatibility
          });
          // Get the stored link from the meta tag
        const svgLink = document.getElementById("down-arrow-url").getAttribute("data-url");


});


