document.addEventListener("DOMContentLoaded", function () {
    const iris = document.getElementById("iris");
    const eyeContainer = document.getElementById("eye-svg");
    const maxMoveX = 30;
    const maxMoveY = 20;
    const maxSquishFactor = 0.8;

    // Eye animation: Follow cursor with squish effect
    document.addEventListener("mousemove", (event) => {
        const rect = eyeContainer.getBoundingClientRect();
        const eyeCenterX = rect.left + rect.width / 2;
        const eyeCenterY = rect.top + rect.height / 2;

        const deltaX = event.clientX - eyeCenterX;
        const deltaY = event.clientY - eyeCenterY;

        const moveX = Math.max(-maxMoveX, Math.min(maxMoveX, (deltaX / window.innerWidth) * maxMoveX));
        const moveY = Math.max(-maxMoveY, Math.min(maxMoveY, (deltaY / window.innerHeight) * maxMoveY));

        const scaleX = 1 - Math.abs(moveX / maxMoveX) * (1 - maxSquishFactor);
        const scaleY = 1 - Math.abs(moveY / maxMoveY) * (1 - maxSquishFactor);

        requestAnimationFrame(() => {
            iris.setAttribute("transform", `translate(${moveX}, ${moveY}) scale(${scaleX}, ${scaleY})`);
        });
    });

    // Parallax effect: Scroll to reveal content
    document.addEventListener("scroll", function () {
        const scrollThreshold = 100;
        if (window.scrollY > scrollThreshold) {
            document.body.classList.add("scrolled");
        } else {
            document.body.classList.remove("scrolled");
        }
    });
});
