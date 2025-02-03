console.log("Script version 2.3 loaded!")

document.addEventListener("pageshow", function () {
    document.addEventListener("DOMContentLoaded", function () {
        console.log("DOM fully loaded!");
    
        const iris = document.getElementById("iris");
        const eyeSvg = document.getElementById("eye-svg");
        const eyeContainer = document.getElementById("eye-container");
    
        if (!iris || !eyeSvg || !eyeContainer) {
            console.error("🚨 Eye elements not found! Check IDs in HTML.");
            return;
        }
    
        console.log("✅ Eye elements found!", { iris, eyeSvg, eyeContainer });
    });
    
    const maxMoveX = 30;
    const maxMoveY = 20;
    const minScale = 0.8; // Minimum squish scale factor

    let isAnimating = false;

    document.addEventListener("mousemove", (event) => {
        console.log("mousemove detected at:", event.clientX, event.clientY);
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

                // Apply transformations (Fix: Use `style.transform` instead of `setAttribute`)
                iris.style.transform = `translate(${moveX}px, ${moveY}px) scale(${scaleX}, ${scaleY})`;
                console.log("squish!")
                isAnimating = false;
            });
        }
    });

    // Function to scale the entire eye (Fix: Use `style.transform`)
    function scaleEye(scaleFactor) {
        eyeContainer.style.transform = `scale(${scaleFactor})`;
    }
});
