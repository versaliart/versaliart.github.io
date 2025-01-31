document.addEventListener("DOMContentLoaded", function () {
  const iris = document.getElementById("iris");
  const eyeContainer = document.getElementById("eye-container");
  const maxMoveX = 30; // Max horizontal movement
  const maxMoveY = 20; // Max vertical movement
  const maxSquishFactor = 0.8; // How much the iris squishes at max movement

  document.addEventListener("mousemove", (event) => {
      const rect = eyeContainer.getBoundingClientRect();
      const eyeCenterX = rect.left + rect.width / 2;
      const eyeCenterY = rect.top + rect.height / 2;
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;

      const deltaX = event.clientX - eyeCenterX;
      const deltaY = event.clientY - eyeCenterY;

      // Normalize movement within the max ranges
      const percentX = deltaX / (screenWidth / 2);
      const percentY = deltaY / (screenHeight / 2);
      const moveX = Math.max(-maxMoveX, Math.min(maxMoveX, percentX * maxMoveX));
      const moveY = Math.max(-maxMoveY, Math.min(maxMoveY, percentY * maxMoveY));

      // Calculate squish factor based on movement
      const scaleX = 1 - Math.abs(moveX / maxMoveX) * (1 - maxSquishFactor);
      const scaleY = 1 - Math.abs(moveY / maxMoveY) * (1 - maxSquishFactor);

      requestAnimationFrame(() => {
          iris.setAttribute("transform", `translate(${moveX}, ${moveY}) scale(${scaleX}, ${scaleY})`);
      });
  });

  // Function to scale the eye temporarily and reset
  function scaleEye(scaleFactor) {
      eyeContainer.setAttribute("transform", `scale(${scaleFactor})`);
      setTimeout(() => {
          eyeContainer.setAttribute("transform", `scale(1)`);
      }, 200);
  }

  // Scale the eye when clicking anywhere (with reset)
  document.addEventListener("click", () => {
      scaleEye(1.2);
  });
});

/* ==========================
   2. JavaScript Scroll Effect
   ========================== */
   document.addEventListener("scroll", function () {
    const scrollY = window.scrollY;
    const headerHeight = document.querySelector(".header-section").offsetHeight;
    const pageContent = document.querySelector(".page-content");

    if (scrollY > headerHeight * 0.3) {
        pageContent.style.transform = `translateY(-${headerHeight}px)`;
    } else {
        pageContent.style.transform = "translateY(0)";
    }
});
