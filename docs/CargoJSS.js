/* ==========================
   3. JavaScript Scroll & Eye Effect Fixes
   ========================== */
   document.addEventListener("DOMContentLoaded", function () {
    const iris = document.getElementById("iris");
    const eyeContainer = document.getElementById("eye-container");
    const maxMoveX = 30;
    const maxMoveY = 20;
    const maxSquishFactor = 0.8; // Define squish factor

    document.addEventListener("mousemove", (event) => {
        const rect = eyeContainer.getBoundingClientRect();
        const eyeCenterX = rect.left + rect.width / 2;
        const eyeCenterY = rect.top + rect.height / 2;

        const deltaX = event.clientX - eyeCenterX;
        const deltaY = event.clientY - eyeCenterY;

        const moveX = Math.max(-maxMoveX, Math.min(maxMoveX, deltaX * 0.1));
        const moveY = Math.max(-maxMoveY, Math.min(maxMoveY, deltaY * 0.1));

        const scaleX = 1 - Math.abs(moveX / maxMoveX) * (1 - maxSquishFactor);
        const scaleY = 1 - Math.abs(moveY / maxMoveY) * (1 - maxSquishFactor);

        requestAnimationFrame(() => {
            iris.setAttribute("transform", `translate(${moveX}, ${moveY}) scale(${scaleX}, ${scaleY})`);
        });
    });

    // Scale the eye when clicking anywhere (with reset)
    function scaleEye(scaleFactor) {
        iris.setAttribute("transform", `scale(${scaleFactor})`);
        setTimeout(() => {
            iris.setAttribute("transform", "scale(1)");
        }, 200);
    }

    document.addEventListener("click", () => {
        scaleEye(1.2);
    });
});

/* ==========================
   4. JavaScript Scroll Effect
   ========================== */
document.addEventListener("scroll", function () {
    const scrollY = window.scrollY;
    const header = document.querySelector(".header-section");
    const mainContent = document.querySelector(".main-content");
    const headerHeight = header.offsetHeight;

    if (scrollY >= headerHeight) {
        header.style.position = "absolute"; /* Allow covering */
        header.style.top = `${scrollY}px`;
    } else {
        header.style.position = "fixed";
        header.style.top = "0";
    }
});
