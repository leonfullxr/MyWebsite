document.addEventListener("DOMContentLoaded", function() {
    const canvas = document.getElementById("curveCanvas");
    const ctx = canvas.getContext("2d");
  
    // Define world coordinates for drawing
    // These ranges can be adjusted as needed.
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
  
    // Elliptic curve parameters: y² = x³ + a*x + b
    const a = -1, b = 1;
  
    // Function f(x) = x³ + a*x + b
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
          // When f(x) < 0, the curve is not defined for real y;
          // start a new path segment.
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
  
    // Clear the canvas and draw the axes and curve
    function draw() {
      ctx.clearRect(0, 0, width, height);
      drawAxes();
      drawCurve();
    }
  
    draw();
  });
  