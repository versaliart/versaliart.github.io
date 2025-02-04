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

    // Ensure previous event listeners are removed before adding new ones
    document.removeEventListener("mousemove", handleMouseMove);
    document.addEventListener("mousemove", handleMouseMove);
}

// Run on 'DOMContentLoaded' (initial load)
document.addEventListener("DOMContentLoaded", initEyeAnimation, { once: true });

// Run on 'pageshow' (when returning via Back button)
window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
        initEyeAnimation(); // Reinitialize animation logic
    }
});
