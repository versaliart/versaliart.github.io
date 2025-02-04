console.log("Loaded ver.3.0!");


function initEyeAnimation() {
    const iris = document.getElementById("iris");
    const eyeSvg = document.getElementById("eye-svg");
    const maxMoveX = 30;
    const maxMoveY = 20;
    const minScale = 0.8;

    let isAnimating = false;

    function handleMouseMove(event) {
        if (!isAnimating) {
            isAnimating = true;
            requestAnimationFrame(() => {
                const rect = eyeSvg.getBoundingClientRect();
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

                const scaleX = 1 - (Math.abs(moveX) / maxMoveX) * (1 - minScale);
                const scaleY = 1 - (Math.abs(moveY) / maxMoveY) * (1 - minScale);

                iris.style.transform = `translate(${moveX}px, ${moveY}px) scale(${scaleX}, ${scaleY})`;

                isAnimating = false;
            });
        }
    }

    document.removeEventListener("mousemove", handleMouseMove);
    document.addEventListener("mousemove", handleMouseMove);

    iris.style.transform = "translate(0px, 0px) scale(1, 1)";
}

document.addEventListener("DOMContentLoaded", initEyeAnimation);

window.addEventListener('pageshow', function (event) {
    if (event.persisted) {
        console.log("Page restored from bfcache - reinitializing animation.");
        initEyeAnimation();
    }
});
