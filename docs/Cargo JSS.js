document.addEventListener("pageshow", function () {
    const iris = document.getElementById("iris");
    const eyeContainer = document.getElementById("eye-container");
    const maxMoveX = 30;
    const maxMoveY = 20;
    const minScale = 0.8; // Minimum squish scale factor
    let isAnimating = false;
    let accelerometerListenerAdded = false; // Prevent duplicate event listeners

    // Ensure elements exist
    if (!iris || !eyeContainer) {
        console.error("Eye elements not found!");
        return;
    }

    function updateEyePosition(moveX, moveY) {
        // Squish effect
        const scaleX = 1 - (Math.abs(moveX) / maxMoveX) * (1 - minScale);
        const scaleY = 1 - (Math.abs(moveY) / maxMoveY) * (1 - minScale);

        // Apply transformations
        iris.setAttribute("transform", `translate(${moveX}, ${moveY}) scale(${scaleX}, ${scaleY})`);
    }

    // 🖱️ Desktop: Mouse Tracking
    document.addEventListener("mousemove", (event) => {
        if (!isAnimating) {
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
                isAnimating = false;
            });
        }
    });

    // 📱 Mobile: Gyroscope-Based Eye Movement (with iOS permission check)
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
                if (event.beta !== null && event.gamma !== null) { // Ensure valid data
                    const tiltX = event.beta; // -180 to 180 (front to back tilt)
                    const tiltY = event.gamma; // -90 to 90 (side-to-side tilt)

                    const moveX = Math.max(-maxMoveX, Math.min(maxMoveX, (tiltY / 45) * maxMoveX));
                    const moveY = Math.max(-maxMoveY, Math.min(maxMoveY, (tiltX / 45) * maxMoveY));

                    updateEyePosition(moveX, moveY);
                } else {
                    console.log("Gyroscope data not available, switching to Accelerometer...");
                    useAccelerometer();
                }
            });
        } else {
            console.log("Gyroscope not supported, switching to Accelerometer...");
            useAccelerometer();
        }
    }

    // 📱 Alternative: Use Accelerometer if No Gyro
    function useAccelerometer() {
        if (!accelerometerListenerAdded && window.DeviceMotionEvent) {
            accelerometerListenerAdded = true; // Prevent multiple event bindings
            window.addEventListener("devicemotion", (event) => {
                if (event.accelerationIncludingGravity) {
                    const accelX = event.accelerationIncludingGravity.x;
                    const accelY = event.accelerationIncludingGravity.y;

                    const moveX = Math.max(-maxMoveX, Math.min(maxMoveX, accelX * 2));
                    const moveY = Math.max(-maxMoveY, Math.min(maxMoveY, accelY * 2));

                    updateEyePosition(moveX, moveY);
                }
            });
        } else {
            console.log("Neither Gyroscope nor Accelerometer is available.");
        }
    }

    // 🌍 Detect Mobile Device and Enable Motion Sensors
    if (/Mobi|Android/i.test(navigator.userAgent)) {
        enableGyroscope();
    }
});
