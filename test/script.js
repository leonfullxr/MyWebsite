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
  
    // Length of tick marks in pixels
    const tickLength = 5;
    ctx.font = "10px Arial";
    ctx.fillStyle = "#000";
  
    // Convert world x coordinate to canvas x coordinate
    function transformX(x) {
      return ((x - xMin) / (xMax - xMin)) * width;
    }
  
    // Convert world y coordinate to canvas y coordinate (inverting the y-axis)
    function transformY(y) {
      return height - ((y - yMin) / (yMax - yMin)) * height;
    }
  
    // Draw coordinate axes and add tick marks and labels
    function drawAxes() {
      ctx.strokeStyle = "#aaa";
      ctx.lineWidth = 1;
  
      // Determine x-axis (y = 0) and y-axis (x = 0) positions if they exist within the range
      const hasXAxis = (yMin < 0 && yMax > 0);
      const hasYAxis = (xMin < 0 && xMax > 0);
  
      if (hasYAxis) {
        const xZero = transformX(0);
        // Draw y-axis line
        ctx.beginPath();
        ctx.moveTo(xZero, 0);
        ctx.lineTo(xZero, height);
        ctx.stroke();
  
        // Add tick marks on y-axis
        // We'll mark at every integer value from Math.ceil(yMin) to Math.floor(yMax)
        for (let y = Math.ceil(yMin); y <= Math.floor(yMax); y++) {
          const cy = transformY(y);
          // Draw tick (horizontal line centered at the axis)
          ctx.beginPath();
          ctx.moveTo(xZero - tickLength, cy);
          ctx.lineTo(xZero + tickLength, cy);
          ctx.stroke();
          // Label the tick slightly to the left of the axis
          ctx.fillText(y, xZero - tickLength - 20, cy + 3);
        }
      }
  
      if (hasXAxis) {
        const yZero = transformY(0);
        // Draw x-axis line
        ctx.beginPath();
        ctx.moveTo(0, yZero);
        ctx.lineTo(width, yZero);
        ctx.stroke();
  
        // Add tick marks on x-axis
        // Mark at every integer value from Math.ceil(xMin) to Math.floor(xMax)
        for (let x = Math.ceil(xMin); x <= Math.floor(xMax); x++) {
          const cx = transformX(x);
          // Draw tick (vertical line centered at the axis)
          ctx.beginPath();
          ctx.moveTo(cx, yZero - tickLength);
          ctx.lineTo(cx, yZero + tickLength);
          ctx.stroke();
          // Label the tick below the axis
          ctx.fillText(x, cx - 5, yZero + tickLength + 15);
        }
      }
    }
  
    // Initialize parameters (they will update dynamically)
    let a = parseFloat(aInput.value);
    let b = parseFloat(bInput.value);
  
    // Update the heading to reflect the current parameters
    function updateHeading() {
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
      const step = (xMax - xMin) / 1000;
  
      // Draw the upper branch (y = +sqrt(f(x)))
      ctx.beginPath();
      let started = false;
      for (let x = xMin; x <= xMax; x += step) {
        const val = f(x);
        if (val >= 0) {
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
  
    // Clear the canvas and redraw axes, scale, and the curve
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
  