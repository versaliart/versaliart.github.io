/* ==========================
   3. JavaScript Eye Movement Fixes
   ========================== */
   document.addEventListener("DOMContentLoaded", function () {
    const iris = document.getElementById("iris");
    const eyeContainer = document.getElementById("eye-container");
    const headerSection = document.querySelector(".header-section");
    const maxMoveX = 30;
    const maxMoveY = 20;

    if (!iris) {
        console.error("Iris element not found in DOM.");
        return;
    }

    console.log("Eye movement script initialized.");

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

        console.log(`Moving iris: X=${moveX.toFixed(2)}, Y=${moveY.toFixed(2)}`);

        requestAnimationFrame(() => {
            iris.setAttribute("transform", `translate(${moveX}, ${moveY})`);
        });
    });
});
