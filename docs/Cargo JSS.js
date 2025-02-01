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
    let masthead = document.querySelector(".header-section");
    let slider = document.querySelector(".main-content");

    let slowFactor = 0.3;  
    let fastFactor = 1.3;  

    let mastheadHeight = masthead.offsetHeight;
    let excessMovement = mastheadHeight * (fastFactor - 1);

    // Adjust body height to account for extra movement
    let newBodyHeight = Math.max(document.documentElement.scrollHeight - excessMovement, window.innerHeight);
    document.body.style.height = `${newBodyHeight}px`;

    let scrollPosition = window.scrollY;
    let mastheadTranslate, sliderTranslate;

    if (scrollPosition < mastheadHeight) {
        // While the masthead is fully in view, use parallax transforms:
        // • The header moves upward slowly (negative value gives upward movement)
        // • The slider moves upward faster
        mastheadTranslate = -scrollPosition * slowFactor;
        sliderTranslate = -scrollPosition * fastFactor;
    } else {
        // Once the masthead is scrolled past:
        // • Pin the header so it remains at the top (translateY = 0)
        // • Continue the main-content’s scroll, but offset by the extra fast movement that occurred
        mastheadTranslate = 0;
        let fastScrollOffset = mastheadHeight * (fastFactor - 1);
        sliderTranslate = -scrollPosition - fastScrollOffset;
    }

    masthead.style.transform = `translateY(${mastheadTranslate}px)`;
    slider.style.transform = `translateY(${sliderTranslate}px)`;
});

