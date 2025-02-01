document.addEventListener("DOMContentLoaded", function () {
  const iris = document.getElementById("iris");
  const eyeContainer = document.getElementById("eye-container");
  const maxMoveX = 30;
  const maxMoveY = 20;

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

      iris.setAttribute("transform", `translate(${moveX}, ${moveY})`);
  });

  // Function to scale the eye
  function scaleEye(scaleFactor) {
      eyeContainer.setAttribute("transform", `scale(${scaleFactor})`);
  }

  // Example: Scale the eye when clicking anywhere
  document.addEventListener("click", () => {
      scaleEye(1.2);
  });
});