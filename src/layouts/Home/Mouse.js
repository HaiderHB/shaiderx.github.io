// CustomMouseTrail.js
import React, { useEffect, useRef } from 'react';

const CustomMouseTrail = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const pointer = {
      x: 0.5 * window.innerWidth,
      y: 0.5 * window.innerHeight,
    };
    const params = {
      pointsNumber: 40,
      widthFactor: 0.3,
      spring: 0.4,
      friction: 0.5,
    };
    const trail = new Array(params.pointsNumber)
      .fill(null)
      .map(() => ({ ...pointer, dx: 0, dy: 0 }));

    const updateMousePosition = (eX, eY) => {
      // Adjust mouse position calculations for scrolling
      const scrollY = window.scrollY || window.pageYOffset;
      pointer.x = eX;
      pointer.y = eY - scrollY; // Subtract scroll offset from pageY
    };

    window.addEventListener('mousemove', e => updateMousePosition(e.pageX, e.pageY));
    window.addEventListener('touchmove', e =>
      updateMousePosition(e.targetTouches[0].pageX, e.targetTouches[0].pageY)
    );

    const update = t => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      trail.forEach((p, i) => {
        const prev = i === 0 ? pointer : trail[i - 1];
        p.dx += (prev.x - p.x) * params.spring;
        p.dy += (prev.y - p.y) * params.spring;
        p.dx *= params.friction;
        p.dy *= params.friction;
        p.x += p.dx;
        p.y += p.dy;
      });

      ctx.beginPath();
      ctx.moveTo(trail[0].x, trail[0].y);
      for (let i = 1; i < trail.length - 1; i++) {
        const xc = 0.5 * (trail[i].x + trail[i + 1].x);
        const yc = 0.5 * (trail[i].y + trail[i + 1].y);
        ctx.quadraticCurveTo(trail[i].x, trail[i].y, xc, yc);
        ctx.lineWidth = params.widthFactor * (params.pointsNumber - i);
        ctx.strokeStyle = '#00E5FF'; // Trail color set to #00E5FF
        ctx.stroke();
      }
      ctx.lineTo(trail[trail.length - 1].x, trail[trail.length - 1].y);
      ctx.stroke();

      animationFrameId = window.requestAnimationFrame(update);
    };

    const setupCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('mousemove', e => updateMousePosition(e.pageX, e.pageY));
    window.addEventListener('touchmove', e =>
      updateMousePosition(e.targetTouches[0].pageX, e.targetTouches[0].pageY)
    );
    window.addEventListener('resize', setupCanvas);

    setupCanvas();
    animationFrameId = window.requestAnimationFrame(update);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', updateMousePosition);
      window.removeEventListener('touchmove', updateMousePosition);
      window.removeEventListener('resize', setupCanvas);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed', // Keep the canvas fixed relative to the viewport
        top: 0,
        left: 0,
        width: '100vw', // Set width to 100% of the viewport width
        height: '100vh', // Set height to 100% of the viewport height
        pointerEvents: 'none', // Ensure the canvas does not block interactions with elements beneath it
        zIndex: 1000, // Keep the canvas on top of other content
      }}
    />
  );
};

export default CustomMouseTrail;
