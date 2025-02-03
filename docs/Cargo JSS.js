
/*  VERSION 2.01   */

document.addEventListener("pageshow", function () {
let isAnimating = false;
let idleInterval = null;
let idleTimeout = null;
let lastMoveX = 0;
let lastMoveY = 0;
let lastAlpha = 0, lastBeta = 0, lastGamma = 0;
    const iris = document.getElementById("iris");
    const eyeContainer = document.getElementById("eye-container");
    const maxMoveX = 30;
    const maxMoveY = 20;
    const minScale = 0.8; // Minimum squish scale factor

    // 🌍 Detect Mobile Device and Enable Motion Sensors
    if (/Mobi|Android/i.test(navigator.userAgent)) {
        enableGyroscope();
    }

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
        const moveX = event.clientX;
        const moveY = event.clientY;

        // Only trigger if movement is significant
        if (Math.abs(moveX - lastMoveX) > 2 || Math.abs(moveY - lastMoveY) > 2) {
            lastMoveX = moveX;
            lastMoveY = moveY;
            stopIdleAnimation();
            isAnimating = true;
            resetIdleTimer();
        }
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
                const { alpha, beta, gamma } = event;

                // Only trigger if movement is significant
                if (Math.abs(alpha - lastAlpha) > 2 || Math.abs(beta - lastBeta) > 2 || Math.abs(gamma - lastGamma) > 2) {
                    lastAlpha = alpha;
                    lastBeta = beta;
                    lastGamma = gamma;
                    stopIdleAnimation();
                    isAnimating = true;
                    resetIdleTimer();
                }
            });
        } else {
            console.log("Gyroscope not supported, switching to Accelerometer...");
            useAccelerometer();
        }
    }

    function useAccelerometer() {
        if (!window.DeviceMotionEvent) {
            console.log("Neither Gyroscope nor Accelerometer is available.");
            return;
        }
        window.addEventListener("devicemotion", (event) => {
            const { acceleration } = event;

            if (acceleration && (Math.abs(acceleration.x) > 0.5 || Math.abs(acceleration.y) > 0.5 || Math.abs(acceleration.z) > 0.5)) {
                stopIdleAnimation();
                isAnimating = true;
                resetIdleTimer();
            }
        });
    }

    // ⏳ Idle Animation
    function startIdleAnimation() {
        if (idleInterval) {
            clearInterval(idleInterval); // Ensure no multiple intervals
        }

        console.log("Idle animation started");

        let angle = 0;
        idleInterval = setInterval(() => {
            if (!isAnimating) { // Ensures idle animation only runs when no movement
                angle += 0.05;
                const idleX = Math.sin(angle) * 5;
                const idleY = Math.cos(angle) * 3;
                updateEyePosition(idleX, idleY);
            }
        }, 100);
    }

    function stopIdleAnimation() {
        if (idleInterval) {
            clearInterval(idleInterval);
            idleInterval = null;
        }
    }

    function resetIdleTimer() {
        if (!isAnimating) return;

        stopIdleAnimation();
        clearTimeout(idleTimeout);

        idleTimeout = setTimeout(() => {
            isAnimating = false;
            console.log("Idle animation can now start.");
            startIdleAnimation();
        }, 3000);
    }

    // Start the idle animation initially
    startIdleAnimation();
});
