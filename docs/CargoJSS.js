/* ==========================
   3. JavaScript Scroll & Eye Effect Fixes
   ========================== */
   document.addEventListener("DOMContentLoaded", function () {
    const iris = document.getElementById("iris");
    const eyeContainer = document.getElementById("eye-container");
    const maxMoveX = 30;
    const maxMoveY = 20;

    document.addEventListener("mousemove", (event) => {
        const rect = eyeContainer.getBoundingClientRect();
        const eyeCenterX = rect.left + rect.width / 2;
        const eyeCenterY = rect.top + rect.height / 2;
        const distance = Math.hypot(event.clientX - eyeCenterX, event.clientY - eyeCenterY);
        
        // Normalize movement: closer = less movement, farther = more movement
        const intensity = Math.min(1, distance / 200);

        const deltaX = (event.clientX - eyeCenterX) * intensity;
        const deltaY = (event.clientY - eyeCenterY) * intensity;

        const moveX = Math.max(-maxMoveX, Math.min(maxMoveX, deltaX * 0.2));
        const moveY = Math.max(-maxMoveY, Math.min(maxMoveY, deltaY * 0.2));

        requestAnimationFrame(() => {
            iris.setAttribute("transform", `translate(${moveX}, ${moveY})`);
        });
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
