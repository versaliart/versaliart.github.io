let isAnimating = false;
let idleInterval = null;
let idleTimeout = null;

document.addEventListener("pageshow", function () {
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
    document.addEventListener("mousemove", () => {
        stopIdleAnimation();
        isAnimating = true;
        resetIdleTimer();
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
            window.addEventListener("deviceorientation", () => {
                stopIdleAnimation();
                isAnimating = true;
                resetIdleTimer();
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
        window.addEventListener("devicemotion", () => {
            stopIdleAnimation();
            isAnimating = true;
            resetIdleTimer();
        });
    }

    // ⏳ Idle Animation
    function startIdleAnimation() {
        if (idleInterval) return;

        console.log("Idle animation started"); // Debugging log

        let angle = 0;
        idleInterval = setInterval(() => {
            if (!isAnimating) {
                console.log("Idle animation frame", angle); // Debugging log
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
            console.log("isAnimating reset to false, idle can run"); // Debugging log
            startIdleAnimation();
        }, 3000);
    }


    startIdleAnimation();
});
