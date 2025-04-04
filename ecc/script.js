document.addEventListener("DOMContentLoaded", function() {
    const canvas = document.getElementById("curveCanvas");
    const ctx = canvas.getContext("2d");
  
    // Get toolbar inputs and equation heading
    const aInput = document.getElementById("aParam");
    const bInput = document.getElementById("bParam");
    const equationHeading = document.getElementById("equation");
  
    // Define world coordinates as variables for dynamic updating
    let xMin = -2, xMax = 3, yMin = -4, yMax = 4;
  
    // Tick mark settings
    const tickLength = 5;
    ctx.font = "10px Arial";
    ctx.fillStyle = "#000";
  
    // Convert world x coordinate to canvas x coordinate
    function transformX(x) {
      return ((x - xMin) / (xMax - xMin)) * canvas.width;
    }
  
    // Convert world y coordinate to canvas y coordinate (inverting the y-axis)
    function transformY(y) {
      return canvas.height - ((y - yMin) / (yMax - yMin)) * canvas.height;
    }
  
    // Draw coordinate axes with tick marks and labels
    function drawAxes() {
      ctx.strokeStyle = "#aaa";
      ctx.lineWidth = 1;
      const hasXAxis = (yMin < 0 && yMax > 0);
      const hasYAxis = (xMin < 0 && xMax > 0);
  
      if (hasYAxis) {
        const xZero = transformX(0);
        ctx.beginPath();
        ctx.moveTo(xZero, 0);
        ctx.lineTo(xZero, canvas.height);
        ctx.stroke();
  
        for (let y = Math.ceil(yMin); y <= Math.floor(yMax); y++) {
          const cy = transformY(y);
          ctx.beginPath();
          ctx.moveTo(xZero - tickLength, cy);
          ctx.lineTo(xZero + tickLength, cy);
          ctx.stroke();
          ctx.fillText(y, xZero - tickLength - 20, cy + 3);
        }
      }
  
      if (hasXAxis) {
        const yZero = transformY(0);
        ctx.beginPath();
        ctx.moveTo(0, yZero);
        ctx.lineTo(canvas.width, yZero);
        ctx.stroke();
  
        for (let x = Math.ceil(xMin); x <= Math.floor(xMax); x++) {
          const cx = transformX(x);
          ctx.beginPath();
          ctx.moveTo(cx, yZero - tickLength);
          ctx.lineTo(cx, yZero + tickLength);
          ctx.stroke();
          ctx.fillText(x, cx - 5, yZero + tickLength + 15);
        }
      }
    }
  
    // Initialize parameters (they update dynamically)
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
  
      // Upper branch (y = +sqrt(f(x)))
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
  
      // Lower branch (y = -sqrt(f(x)))
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
  
    // Clear the canvas and redraw axes and the curve
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
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
  
    // Resize the canvas to fill the window and redraw the graph
    function resizeCanvas() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      draw();
    }
  
    // Zoom on scroll: adjust the world coordinate range while keeping the center fixed
    canvas.addEventListener("wheel", function(event) {
      event.preventDefault();
      const zoomFactor = event.deltaY < 0 ? 0.9 : 1.1;
      const centerX = (xMin + xMax) / 2;
      const centerY = (yMin + yMax) / 2;
      const widthRange = (xMax - xMin) * zoomFactor;
      const heightRange = (yMax - yMin) * zoomFactor;
      xMin = centerX - widthRange / 2;
      xMax = centerX + widthRange / 2;
      yMin = centerY - heightRange / 2;
      yMax = centerY + heightRange / 2;
      draw();
    });
  
    window.addEventListener("resize", resizeCanvas);
    aInput.addEventListener("input", updateCurve);
    bInput.addEventListener("input", updateCurve);
  
    // Initial setup
    resizeCanvas();
    updateHeading();
  });
  