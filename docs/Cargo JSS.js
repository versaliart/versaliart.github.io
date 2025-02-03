let isAnimating = false;
let idleInterval = null;
let idleTimeout = null;

document.addEventListener("pageshow", function () {
    const iris = document.getElementById("iris");
    const eyeContainer = document.getElementById("eye-container");
    const maxMoveX = 30;
    const maxMoveY = 20;
    const minScale = 0.8; // Minimum squish scale factor

    if (!iris || !eyeContainer) {
        console.error("Eye elements not found!");
        return;
    }

    function updateEyePosition(moveX, moveY) {
        const scaleX = 1 - (Math.abs(moveX) / maxMoveX) * (1 - minScale);
        const scaleY = 1 - (Math.abs(moveY) / maxMoveY) * (1 - minScale);
        iris.setAttribute("transform", `translate(${moveX}, ${moveY}) scale(${scaleX}, ${scaleY})`);
    }

    // 🖱️ Mouse Tracking for Desktop
    document.addEventListener("mousemove", (event) => {
        stopIdleAnimation();
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

            updateEyePosition(moveX, moveY);
            resetIdleTimer();
        });
    });

    // 📱 Gyroscope / Accelerometer-Based Movement for Mobile
    function enableGyroscope() {
        if (typeof DeviceOrientationEvent.requestPermission === "function") {
            DeviceOrientationEvent.requestPermission()
                .then((permissionState) => {
                    if (permissionState === "granted") {
                        attachGyroscope();
                    } else {
                        console.log("Gyroscope permission denied. Using accelerometer.");
                        useAccelerometer();
                    }
                })
                .catch(console.error);
        } else {
            attachGyroscope();
        }
    }

    function attachGyroscope() {
        if (window.DeviceOrientationEvent) {
            window.addEventListener("deviceorientation", (event) => {
                if (event.beta !== null && event.gamma !== null) {
                    stopIdleAnimation();
                    const tiltX = event.beta;
                    const tiltY = event.gamma;

                    const moveX = Math.max(-maxMoveX, Math.min(maxMoveX, (tiltY / 45) * maxMoveX));
                    const moveY = Math.max(-maxMoveY, Math.min(maxMoveY, (tiltX / 45) * maxMoveY));

                    updateEyePosition(moveX, moveY);
                    resetIdleTimer();
                } else {
                    console.log("Gyroscope data not available, switching to Accelerometer...");
                    useAccelerometer();
                }
            });
        }
    }

    function useAccelerometer() {
        if (!window.DeviceMotionEvent) {
            console.log("Neither Gyroscope nor Accelerometer is available.");
            return;
        }

        window.addEventListener("devicemotion", (event) => {
            if (event.accelerationIncludingGravity) {
                stopIdleAnimation();
                const accelX = event.accelerationIncludingGravity.x;
                const accelY = event.accelerationIncludingGravity.y;

                const moveX = Math.max(-maxMoveX, Math.min(maxMoveX, accelX * 2));
                const moveY = Math.max(-maxMoveY, Math.min(maxMoveY, accelY * 2));

                updateEyePosition(moveX, moveY);
                resetIdleTimer();
            }
        });
    }

    // ⏳ Idle Animation: Moves Eye Slightly When No Interaction
    function startIdleAnimation() {
        if (idleInterval) return;

        let angle = 0;
        idleInterval = setInterval(() => {
            if (!isAnimating) {
                angle += 0.05;
                const idleX = Math.sin(angle) * 5;
                const idleY = Math.cos(angle) * 3;
                updateEyePosition(idleX, idleY);
            }
        }, 100);
    }

    function stopIdleAnimation() {
        clearInterval(idleInterval);
        idleInterval = null;
    }

    function resetIdleTimer() {
        stopIdleAnimation();
        isAnimating = true;

        clearTimeout(idleTimeout);
        idleTimeout = setTimeout(() => {
            isAnimating = false;
            startIdleAnimation();
        }, 3000);
    }

    // 🌍 Detect Mobile Device and Enable Motion Sensors
    if (/Mobi|Android/i.test(navigator.userAgent)) {
        enableGyroscope();
    }

    startIdleAnimation();
});
