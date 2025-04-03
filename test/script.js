document.addEventListener("DOMContentLoaded", function() {
    const canvas = document.getElementById("curveCanvas");
    const ctx = canvas.getContext("2d");
  
    // Get toolbar inputs and equation heading
    const aInput = document.getElementById("aParam");
    const bInput = document.getElementById("bParam");
    const equationHeading = document.getElementById("equation");
  
    // Define world coordinates for drawing (adjustable as needed)
    const xMin = -2, xMax = 3;
    const yMin = -4, yMax = 4;
    const width = canvas.width, height = canvas.height;
  
    // Convert world x coordinate to canvas x coordinate
    function transformX(x) {
      return ((x - xMin) / (xMax - xMin)) * width;
    }
  
    // Convert world y coordinate to canvas y coordinate (inverting the y-axis)
    function transformY(y) {
      return height - ((y - yMin) / (yMax - yMin)) * height;
    }
  
    // Draw coordinate axes for reference
    function drawAxes() {
      ctx.strokeStyle = "#aaa";
      ctx.lineWidth = 1;
  
      // Draw y-axis (x = 0)
      if (xMin < 0 && xMax > 0) {
        const xZero = transformX(0);
        ctx.beginPath();
        ctx.moveTo(xZero, 0);
        ctx.lineTo(xZero, height);
        ctx.stroke();
      }
  
      // Draw x-axis (y = 0)
      if (yMin < 0 && yMax > 0) {
        const yZero = transformY(0);
        ctx.beginPath();
        ctx.moveTo(0, yZero);
        ctx.lineTo(width, yZero);
        ctx.stroke();
      }
    }
  
    // Initialize parameters (they will update dynamically)
    let a = parseFloat(aInput.value);
    let b = parseFloat(bInput.value);
  
    // Update the heading to reflect the current parameters
    function updateHeading() {
      // Format equation string nicely depending on sign of parameters.
      let aStr = a >= 0 ? " + " + a + "x" : " - " + Math.abs(a) + "x";
      let bStr = b >= 0 ? " + " + b : " - " + Math.abs(b);
      equationHeading.textContent = "Elliptic Curve: y² = x³" + aStr + bStr;
    }
  
    // Function f(x) = x³ + a*x + b (right-hand side of the curve)
    function f(x) {
      return x * x * x + a * x + b;
    }
  
    // Draw the elliptic curve by plotting points for both branches
    function drawCurve() {
      ctx.strokeStyle = "#0077cc";
      ctx.lineWidth = 2;
  
      // Use a small step for a smooth curve
      const step = (xMax - xMin) / 1000;
  
      // Draw the upper branch (y = +sqrt(f(x)))
      ctx.beginPath();
      let started = false;
      for (let x = xMin; x <= xMax; x += step) {
        const val = f(x);
        if (val >= 0) {  // Only real y values where f(x) is non-negative
          const y = Math.sqrt(val);
          const cx = transformX(x);
          const cy = transformY(y);
          if (!started) {
            ctx.moveTo(cx, cy);
            started = true;
          } else {
            ctx.lineTo(cx, cy);
          }
        } else {
          started = false;
        }
      }
      ctx.stroke();
  
      // Draw the lower branch (y = -sqrt(f(x)))
      ctx.beginPath();
      started = false;
      for (let x = xMin; x <= xMax; x += step) {
        const val = f(x);
        if (val >= 0) {
          const y = -Math.sqrt(val);
          const cx = transformX(x);
          const cy = transformY(y);
          if (!started) {
            ctx.moveTo(cx, cy);
            started = true;
          } else {
            ctx.lineTo(cx, cy);
          }
        } else {
          started = false;
        }
      }
      ctx.stroke();
    }
  
    // Clear the canvas and draw axes and the curve
    function draw() {
      ctx.clearRect(0, 0, width, height);
      drawAxes();
      drawCurve();
    }
  
    // Update curve when parameters change
    function updateCurve() {
      a = parseFloat(aInput.value);
      b = parseFloat(bInput.value);
      updateHeading();
      draw();
    }
  
    // Listen for changes in the toolbar inputs
    aInput.addEventListener("input", updateCurve);
    bInput.addEventListener("input", updateCurve);
  
    // Initial drawing
    updateHeading();
    draw();
  });
  