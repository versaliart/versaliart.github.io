console.log("Loaded ver.2.7!")

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

    // Remove old event listener and attach a new one
    document.removeEventListener("mousemove", handleMouseMove);
    document.addEventListener("mousemove", handleMouseMove);

    // Reset the position of the iris
    iris.style.transform = "translate(0px, 0px) scale(1, 1)";
}

// **Force SVG Refresh (Fix for bfcache restoring non-functional state)**
function refreshSVG() {
    const eyeContainer = document.getElementById("eye-container");
    const eyeSvg = document.getElementById("eye-svg");

    if (eyeSvg) {
        const newEyeSvg = eyeSvg.cloneNode(true); // Clone the SVG element
        eyeContainer.replaceChild(newEyeSvg, eyeSvg); // Replace the old SVG
    }
}

// Run on 'DOMContentLoaded' (Initial page load)
document.addEventListener("DOMContentLoaded", initEyeAnimation, { once: true });

// Run on 'pageshow' (Back button or forward navigation)
window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
        console.log("Page restored from bfcache - refreshing SVG and reinitializing animation");
        refreshSVG(); // Force the eye SVG to refresh
    }
    initEyeAnimation(); // Reinitialize animation logic
});
