document.addEventListener("DOMContentLoaded", function () {
    const iris = document.getElementById("iris");
    const eyeContainer = document.getElementById("eye-container");
    const maxMoveX = 50;
    const maxMoveY = 20;
    const minScale = 0.8; // Minimum scale factor when fully squished

    document.addEventListener("mousemove", (event) => {
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

        // Calculate squish factor based on movement percentage
        const scaleX = 1 - (Math.abs(moveX) / maxMoveX) * (1 - minScale);
        const scaleY = 1 - (Math.abs(moveY) / maxMoveY) * (1 - minScale);

        // Apply transformations
        iris.setAttribute("transform", `translate(${moveX}, ${moveY}) scale(${scaleX}, ${scaleY})`);
    });

    // Function to scale the entire eye
    function scaleEye(scaleFactor) {
        eyeContainer.setAttribute("transform", `scale(${scaleFactor})`);
    }

    document.addEventListener("scroll", function () {
        let scrollY = window.scrollY;
        let header = document.querySelector(".header-section");

        if (!header) {
            console.error("Header section not found!"); // Debugging
            return;
        }

        let headerHeight = header.offsetHeight;
        let clipValue = Math.min(scrollY / headerHeight, 1) * 100;

        header.style.clipPath = `inset(${clipValue}% 0px 0px 0px)`;
        console.log(`clip-path updated: inset(${clipValue}% 0px 0px 0px)`);
    });
});
