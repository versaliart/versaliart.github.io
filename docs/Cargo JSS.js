document.addEventListener("pageshow", function () {
    const irisGroup = document.getElementById("iris-group"); // Change to iris-group
    const eyeContainer = document.getElementById("eye-container");
    const maxMoveX = 30;
    const maxMoveY = 20;
    const minScale = 0.8; // Minimum squish scale factor

    if (!irisGroup || !eyeContainer) {
        console.error("Eye elements not found!");
        return;
    }

    document.addEventListener("mousemove", (event) => {
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

            // Squish effect
            const scaleX = 1 - (Math.abs(moveX) / maxMoveX) * (1 - minScale);
            const scaleY = 1 - (Math.abs(moveY) / maxMoveY) * (1 - minScale);

            // Apply transformations to the <g> element instead of the <image>
            irisGroup.setAttribute("transform", `translate(${moveX}, ${moveY}) scale(${scaleX}, ${scaleY})`);
        });
    });
});
