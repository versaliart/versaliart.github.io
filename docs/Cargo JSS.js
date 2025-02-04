console.log("Loaded ver.2.5!")

function initEyeAnimation() {
    const iris = document.getElementById("iris");
    const eyeSvg = document.getElementById("eye-svg"); // Outer SVG container
    const eyeContainer = document.getElementById("eye-container");
    const maxMoveX = 30;
    const maxMoveY = 20;
    const minScale = 0.8; // Minimum squish scale factor

    let isAnimating = false;

    function handleMouseMove(event) {
        if (!isAnimating) {
            isAnimating = true;
            requestAnimationFrame(() => {
                const rect = eyeSvg.getBoundingClientRect();
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

                // Squish effect
                const scaleX = 1 - (Math.abs(moveX) / maxMoveX) * (1 - minScale);
                const scaleY = 1 - (Math.abs(moveY) / maxMoveY) * (1 - minScale);

                // Apply transformations
                iris.style.transform = `translate(${moveX}px, ${moveY}px) scale(${scaleX}, ${scaleY})`;

                isAnimating = false;
            });
        }
    }

    // Remove old event listener if any and attach a new one
    document.removeEventListener("mousemove", handleMouseMove);
    document.addEventListener("mousemove", handleMouseMove);

    // Reset animation state
    iris.style.transform = "translate(0px, 0px) scale(1, 1)";
}

// Function to force a reflow (resets styles)
function forceReflow(element) {
    element.style.display = "none";  // Temporarily hide the element
    element.offsetHeight;  // Trigger reflow
    element.style.display = "";  // Restore display
}

// Run on 'DOMContentLoaded' (Initial load)
document.addEventListener("DOMContentLoaded", initEyeAnimation, { once: true });

// Run on 'pageshow' (Back button or forward navigation)
window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
        forceReflow(document.body); // Force a reflow to ensure styles reset
    }
    initEyeAnimation(); // Reinitialize animation logic
});
