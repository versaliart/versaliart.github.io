document.addEventListener("DOMContentLoaded", function () {
    const iris = document.getElementById("iris");
    const eyeContainer = document.getElementById("eye-container");
    const maxMoveX = 50;
    const maxMoveY = 20;
    const minScale = 0.8; // Minimum squish scale factor

    let animationFrameId;

    document.addEventListener("mousemove", (event) => {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);

        animationFrameId = requestAnimationFrame(() => {
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

            // Apply transformations
            iris.setAttribute("transform", `translate(${moveX}, ${moveY}) scale(${scaleX}, ${scaleY})`);
        });
    });

    // Function to scale the entire eye
    function scaleEye(scaleFactor) {
        eyeContainer.setAttribute("transform", `scale(${scaleFactor})`);
    }


});

window.addEventListener('scroll', function () {
    let scrollPosition = window.scrollY; // Get scroll position
    let masthead = document.querySelector('.header-content');
    
    if (scrollPosition > 100) { // Adjust threshold as needed
        masthead.style.opacity = Math.max(1 - scrollPosition / 300, 0); // Fades out
        masthead.style.transform = `translateY(-${scrollPosition / 2}px)`; // Moves up
    } else {
        masthead.style.opacity = 1;
        masthead.style.transform = 'translateY(0)';
    }
});
