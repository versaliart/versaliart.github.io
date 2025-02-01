document.addEventListener("DOMContentLoaded", function () {
    const iris = document.getElementById("iris");
    const eyeContainer = document.getElementById("eye-container");
    const maxMoveX = 30;
    const maxMoveY = 20;
    const minScale = 0.8; // Minimum squish scale factor

    let isAnimating = false;

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

                // Squish effect
                const scaleX = 1 - (Math.abs(moveX) / maxMoveX) * (1 - minScale);
                const scaleY = 1 - (Math.abs(moveY) / maxMoveY) * (1 - minScale);

                // Apply transformations
                iris.setAttribute("transform", `translate(${moveX}, ${moveY}) scale(${scaleX}, ${scaleY})`);
                
                isAnimating = false;
            });
        }
    });

    // Function to scale the entire eye
    function scaleEye(scaleFactor) {
        eyeContainer.setAttribute("transform", `scale(${scaleFactor})`);
    }
});

window.addEventListener("scroll", function () {
    let scrollPosition = window.scrollY; // Get scroll position
    let masthead = document.querySelector(".header-section");
    let slider = document.querySelector(".main-content");

    let slowFactor = 0.3; // Controls masthead movement speed
    let fastFactor = 1.3; // Controls slider movement speed

    // Get the top position of the slider relative to the document
    let sliderTop = slider.offsetTop;

    // Ensure the masthead only moves while it is still visible
    let mastheadTranslate = Math.min(scrollPosition * slowFactor, sliderTop * slowFactor);

    // Ensure the slider only moves while it's not fully aligned with the top
    let sliderTranslate = Math.max(-scrollPosition * slowFactor, -sliderTop * slowFactor);

    // Apply transformations with limits
    masthead.style.transform = `translateY(${mastheadTranslate}px)`;
    slider.style.transform = `translateY(${sliderTranslate}px)`;
});
