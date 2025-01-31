/* ==========================
   3. JavaScript Eye Movement Fixes
   ========================== */
   document.addEventListener("DOMContentLoaded", function () {
    const iris = document.getElementById("iris");
    const eyeContainer = document.getElementById("eye-container");
    const headerSection = document.querySelector(".header-section");
    const maxMoveX = 30;
    const maxMoveY = 20;

    headerSection.addEventListener("mousemove", (event) => {
        const rect = eyeContainer.getBoundingClientRect();
        const eyeCenterX = rect.left + rect.width / 2;
        const eyeCenterY = rect.top + rect.height / 2;
        
        const deltaX = event.clientX - eyeCenterX;
        const deltaY = event.clientY - eyeCenterY;
        
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const maxDistance = Math.min(window.innerWidth, window.innerHeight) / 2;
        const intensity = Math.min(1, distance / maxDistance);
        
        const moveX = deltaX * intensity * 0.3;
        const moveY = deltaY * intensity * 0.3;

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
