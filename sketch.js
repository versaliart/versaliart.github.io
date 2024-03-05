let ringobj1 = {
  name: "ring1",
  xpos: 131.5,
  ypos: 132,
  on: 1,
  radius: 118.45,
  width: 238,
  height: 237,
  alpha: 255, // Initial opacity
  display: function() {
    if (this.on){
      push();
      tint(255, this.alpha); // Apply opacity
      image(ring1, this.xpos, this.ypos);
      pop();
    }  }
};
let ringobj2 = {
  name: "ring2",
  xpos: 156.5,
  ypos: 157,
  on: 1,
  radius: 93.45,
  width: 188,
  height: 187,
  alpha: 255, // Initial opacity
  display: function() {
    if (this.on){
      push();
      tint(255, this.alpha); // Apply opacity
      image(ring2, this.xpos, this.ypos);
      pop();
    }  }
};
let ringobj3 = {
  name: "ring3",
  xpos: 181.48,
  ypos: 181.9,
  on: 1,
  radius: 68.52,
  width: 138,
  height: 138,
  alpha: 255, // Initial opacity
  display: function() {
    if (this.on){
      push();
      tint(255, this.alpha); // Apply opacity
      image(ring3, this.xpos, this.ypos);
      pop();
    }  }
};
let ringobj4 = {
  name: "ring4",
  xpos: 206.129,
  ypos: 206.5857,
  on: 1,
  radius: 43.87,
  width: 88,
  height: 89,
  alpha: 255, // Initial opacity
  display: function() {
    if (this.on){
      push();
      tint(255, this.alpha); // Apply opacity
      image(ring4, this.xpos, this.ypos);
      pop();
    }  }
};
let ringobj5 = {
  name: "ring5",
  xpos: 231.129,
  ypos: 231.5857,
  on: 1,
  radius: 18.91,
  width: 38,
  height: 39,
  alpha: 255, // Initial opacity
  display: function() {
    if (this.on){
      push();
      tint(255, this.alpha); // Apply opacity
      image(ring5, this.xpos, this.ypos);
      pop();
    }  }
};
let lightbeam1 = {
  name: "lightbeam",
  on: 1,
  color: [255, 255, 125], // Yellow color (example)
  alpha: 35, // Initial opacity
  display: function() {
    if (this.on){
      push();
      blendMode(ADD);
      fill(this.color[0], this.color[1], this.color[2], this.alpha); // Fill shape with the specified color
      beginShape();
        vertex(281, 81);
        vertex(491, 81);
        vertex(500, 666);
        vertex(62, 666);
      endShape(CLOSE);
      pop();
    }
  }
};

let lightbeam2 = {
  name: "lightbeam",
  on: 0,
  color: [55, 255, 25],
  alpha: 35, // Initial opacity
  display: function() {
    if (this.on){
      push();
      blendMode(ADD);
      fill(this.color[0], this.color[1], this.color[2], this.alpha); // Fill shape with the specified color
      beginShape();
        vertex(0, 0);
        vertex(200, 0);
        vertex(400, 666);
        vertex(0, 666);
      endShape(CLOSE);
      pop();
    }
  }
};
let lightbeam3 = {
  name: "lightbeam",
  on: 0,
  color: [255, 255, 125], // Yellow color (example)
  alpha: 35, // Initial opacity
  display: function() {
    if (this.on){
      push();
      blendMode(ADD);
      fill(this.color[0], this.color[1], this.color[2], this.alpha); // Fill shape with the specified color
      beginShape();
        vertex(230, 0);
        vertex(550, 0);
        vertex(300, 666);
        vertex(62, 666);
      endShape(CLOSE);
      pop();
    }
  }
};


let pointer = {
  xpos: 360,
  ypos: 500,
  angle: 0,
  on: 1,
  display: function() {
    if (this.on) {
      push(); // Save the current transformation state
      translate(this.xpos + pointimg.width / 2, this.ypos + pointimg.height / 2); // Move origin to the center of the image
      rotate(radians(this.angle)); // Rotate by the current angle in radians
      imageMode(CENTER); // Set image mode to center
      image(pointimg, 0, 0); // Draw the image at the translated position
      pop(); // Restore the previous transformation state
    }
  },
  reset: function() {
    if (this.on) {
      push(); // Save the current transformation state
      translate(this.xpos + pointimg.width / 2, this.ypos + pointimg.height / 2); // Move origin to the center of the image
      rotate(-radians(this.angle)); // Rotate by the negative of the current angle in radians
      imageMode(CENTER); // Set image mode to center
      image(pointimg, 0, 0); // Draw the image at the translated position
      pop(); // Restore the previous transformation state
    }
  }
};

let dart = {
  xpos: 500,
  ypos: 600,
  gotox: 0,
  gotoy: 0,
  angle: 0,
  display: function() {
    if (this.gotox !== 0 && this.gotoy !== 0 && thrown !== 0) {
      let dx = this.gotox - (this.xpos + dartimg.width / 2); // Adjust x position to align top center instead of top left
      let dy = this.gotoy - this.ypos;
      let distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > dartSpeed) {
        let ratio = dartSpeed / distance;
        this.xpos += dx * ratio;
        this.ypos += dy * ratio;

        // Calculate angle
        this.angle = Math.atan2(dy, dx)/2;
      } else {
        this.xpos = this.gotox - dartimg.width / 2; // Adjust final position
        this.ypos = this.gotoy;
        this.gotox = 0; // reset goto coords and flight indicator variable
        this.gotoy = 0;
        thrown = 2;
      }
    }
    push(); // Save the current drawing style settings
    translate(this.xpos + dartimg.width / 2, this.ypos); // Move origin to the top center of the dart
    rotate(this.angle); // Rotate by the calculated angle
    imageMode(CENTER); // Set image mode to center
    image(dartimg, 0, dartimg.height / 2); // Draw the dart at the translated position with the top center aligned
    pop(); // Restore the drawing style settings
    }  
};


let barstate = 0; // victory state
let thrown = 0; // is a dart currently en route
let dartSpeed = 35; // dart flight speed
let ringtargets = []; // throw all the rings in an array 
let clickX = 0; // variables for where we last clicked
let clickY = 0; // variables for where we last clicked

function vanish(ringobj) {
  // Gradually decrease opacity over 0.2 seconds
  let duration = 200; // milliseconds
  let fadeOutInterval = 10; // milliseconds
  let steps = duration / fadeOutInterval;
  let stepAlpha = ringobj.alpha / steps;
  let intervalId = setInterval(() => {
    ringobj.alpha -= stepAlpha;
    if (ringobj.alpha <= 0) {
      ringobj.on = 0; // Turn off ring object when fully faded out
      let allRingsOff = ringtargets.every(ring => !ring.on);
      clearInterval(intervalId); // Stop the interval when fading is complete
      clickX = 0; // reset clickpos
      clickY = 0;
      thrown = 0;
      soundTriggered = false; // Reset the flag that stops the sound from playing every frame
      if(allRingsOff) {victory();}
    }
  }, fadeOutInterval);
  soundTriggered = true;
}

function victory() {
//  bg = bgnew
  scratchsfx.play(); // Play scratch sound effect
  lightbeam1.color = [255, 25, 25];
  lightbeam1.alpha = 75;
  lightbeam2.on = 1;
  lightbeam3.on = 1;
  setTimeout(() => { // Set a delay using setTimeout
    barstate = 1; // Change barstate after the delay
    musicCurrent.stop(); // Stop current music
    musicCurrent = musicBritney; // Change to Britney music
    musicCurrent.play(); // Start playing Britney music
    musicCurrent.loop(); // Loop Britney music
  }, 50); // Adjust the delay time in milliseconds (1000 ms = 1 second)
}

function collide(ringobj){
    // Calculate the center coordinates of the ring
    let centerX = ringobj.xpos + ringobj.width / 2;
    let centerY = ringobj.ypos + ringobj.height / 2;
    // Calculate the distance between the mouse coordinates and the center of the ring
    let distance = Math.sqrt((clickX - centerX) ** 2 + (clickY - centerY) ** 2);

    // Check if the distance is less than or equal to the radius of the ring
    return distance <= ringobj.radius && distance >= max((ringobj.radius - 25),0);
    }

function preload(){ // set image pointers & prep audio
  bg = loadImage("asset/BGdefault.png");
  bgnew = loadImage("asset/BGbritney.png");
  pointimg = loadImage("asset/POINTER.png");
  beer = loadImage("asset/BEER.png");
  dartimg = loadImage("asset/DART.png");
  dartpile = loadImage("asset/DARTPILE.png");
  table = loadImage("asset/TABLE.png");
  lamp = loadImage("asset/LAMP.png");

  ring1 = loadImage("asset/RING1.png");
  ring2 = loadImage("asset/RING2.png");
  ring3 = loadImage("asset/RING3.png");
  ring4 = loadImage("asset/RING4.png");
  ring5 = loadImage("asset/RING5.png");
  britney = loadImage("asset/BRITNEY.png")

  cursorimg = loadImage("asset/CROSSHAIR.png")

  popsfx = loadSound("asset/POPsfx.mp3");
  bzztsfx = loadSound("asset/BZZT.mp3");
  scratchsfx = loadSound("asset/scratch.mp3")
  musicDefault = loadSound("asset/toby.mp3")
  musicBritney = loadSound("asset/Britney.mp3");
  musicCurrent = musicDefault;
  append(ringtargets,ringobj1);
  append(ringtargets,ringobj2);
  append(ringtargets,ringobj3);
  append(ringtargets,ringobj4);
  append(ringtargets,ringobj5);

}

let soundTriggered = false;

function checkCollisionsWithRings() {
  let dartCollided = false; // Flag to track if dart collided with any ring
  if (!soundTriggered) {
    for (let i = 0; i < ringtargets.length; i++) {
      let ring = ringtargets[i];
      if (collide(ring) && ring.on) {
        // Play sound effect
        popsfx.play();
        soundTriggered = true;
        dartCollided = true; // Set the flag to true if dart collided with a ring
        // Fade out the collided ring after a short delay
        setTimeout(() => {
          vanish(ring);
        }, 150); // Introduce a short delay before executing the code
      }
    }
  }
  // If dart did not collide with any ring, play the bzztsfx
  if (!dartCollided && !soundTriggered) {
    bzztsfx.setVolume(0.25);
    bzztsfx.play();
    soundTriggered = true; // Set the flag to true to prevent repeated triggering
  }
  setTimeout(() => {
    // After a delay, reset the dart's position
    dart.xpos = 500;
    dart.ypos = 600;
    thrown = 0;
  }, 250); // Adjust the delay time as needed
}

function pointerspin(){
  pointer.reset
  pointer.angle = random(0, 360); // Set the angle of the pointer to a random value between 0 and 360 degrees
}

function setup(){
  createCanvas(500,666);
}

function draw(){
  clear()
  background(bg)
  image(table, 0, 507);
  image(beer, 115, 466);
  image(dartpile, 22, 507);
  image(lamp, 276, -5);
  image(britney, 131.5439,132.01)

  if (musicCurrent.isLooping()){
  }else{
    musicCurrent.play();
    musicCurrent.loop();
  }

  cursor("asset/CROSSHAIR.png",25,25); // make the cursor a crosshair centered on the mouse

  if (barstate == 0){

    push(); // Save the current transformation state
    pointer.display(); // Draw the pointer with transformations
    pop(); // Restore the previous transformation state

    ringobj1.display();
    ringobj2.display();
    ringobj3.display();
    ringobj4.display();
    ringobj5.display();
    dart.display();
    lightbeam1.display();

  }else{
    ringobj1.on = 0;
    ringobj2.on = 0;
    ringobj3.on = 0;
    ringobj4.on = 0;
    ringobj5.on = 0;

    // Flashing behavior for light beams
    if (random() < 0.05) { // Adjust the probability to control the frequency of flashing
      lightbeam1.on = 1 - lightbeam1.on; // Toggle lightbeam1 on/off
    }
    if (random() < 0.05) {
      lightbeam2.on = 1 - lightbeam2.on;
    }
    if (random() < 0.05) {
      lightbeam3.on = 1 - lightbeam3.on;
    }

    lightbeam1.display();
    lightbeam2.display();
    lightbeam3.display();
  }
  if (thrown == 2) {
    checkCollisionsWithRings();
    pointerspin();
  }
}


function mouseReleased() {
  if (thrown == 0 && mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height) {
    soundTriggered = false; // Reset the flag at the beginning of the function
    let offset = 50; // Offset distance from the mouse position in the x-direction

    // Calculate the offset in the x and y directions based on the angle
    let angleRadians = radians(pointer.angle); // Convert angle to radians
    let dx = max(25,cos(angleRadians) * offset); // Offset in the x-direction
    let dy = max(25,sin(angleRadians) * offset); // Offset in the y-direction

    // Determine whether to add or subtract based on the angle's quadrant
    if (pointer.angle > 0 && pointer.angle < 90) { // Upper right quadrant
      dart.gotox = mouseX + dx;
      dart.gotoy = mouseY - dy;
      console.log("UR")
    } else if (pointer.angle > 90 && pointer.angle < 180) { // Lower right quadrant
      dart.gotox = mouseX + dx;
      dart.gotoy = mouseY + dy;
      console.log("LR")
    } else if (pointer.angle > 180 && pointer.angle < 270) { // Lower left quadrant
      dart.gotox = mouseX - dx;
      dart.gotoy = mouseY + dy;
      console.log("LL")
    } else if (pointer.angle > 270 && pointer.angle < 360) { // Upper left quadrant
      dart.gotox = mouseX - dx;
      dart.gotoy = mouseY - dy;
      console.log("UL")
    } else if (pointer.angle === 0 || pointer.angle === 360) { // Angle is exactly 90 degrees (vertical up)
      dart.gotox = mouseX;
      dart.gotoy = mouseY - offset;
      console.log("0 degs")
    } else if (pointer.angle === 270) { // Angle is exactly 180 degrees (horizontal left)
      dart.gotox = mouseX - offset;
      dart.gotoy = mouseY;
      console.log("270 degs")
    } else if (pointer.angle === 180) { // Angle is exactly 270 degrees (vertical down)
      dart.gotox = mouseX;
      dart.gotoy = mouseY + offset;
      console.log("180 degs")
    } else if (pointer.angle === 90) { // Angle is exactly 0 or 360 degrees (horizontal right)
      dart.gotox = mouseX + offset;
      dart.gotoy = mouseY;
      console.log("90 degs")
    }

    clickX = dart.gotox;
    clickY = dart.gotoy;
    thrown = 1;
  }
}


function keyPressed() {
  // Check if both the shift and enter keys are pressed simultaneously
  if (keyIsDown(ENTER) && keyIsDown(SHIFT)) {
    victory(); // Call the victory function
  }
}


