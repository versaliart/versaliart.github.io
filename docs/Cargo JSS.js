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

/* ###### PARALLAX EFFECT ###### */

window.addEventListener("scroll", function () {
    let scrollPosition = window.scrollY; // Current scroll position
    let masthead = document.querySelector(".header-section");
    let slider = document.querySelector(".main-content");

    let slowFactor = 0.3;  // Masthead moves slowly
    let fastFactor = 1.3;  // Slider moves faster initially

    // Get the height of masthead (assumed full viewport height)
    let mastheadHeight = masthead.offsetHeight;

    // Get slider's top position relative to the document
    let sliderStart = mastheadHeight; // Slider initially starts right after masthead

    // Detect if masthead is still visible
    let isMastheadVisible = scrollPosition < sliderStart;

    let mastheadTranslate = scrollPosition * slowFactor;
    let sliderTranslate;

    if (isMastheadVisible) {
        // Apply fast movement while masthead is visible
        sliderTranslate = -scrollPosition * fastFactor;
    } else {
        // Smooth transition: stop applying fastFactor but continue smoothly
        let fastScrollOffset = sliderStart * (fastFactor - 1); 
        sliderTranslate = -scrollPosition - fastScrollOffset;
    }

    // Apply transformations
    masthead.style.transform = `translateY(${mastheadTranslate}px)`;
    slider.style.transform = `translateY(${sliderTranslate}px)`;
});

