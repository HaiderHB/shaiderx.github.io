// 'use client';
// import React, { useRef, useEffect } from 'react';
// import { SimplexNoise } from 'simplex-noise';
// import styles from './Graphic.module.css';

// const lerp = (start, end, amt) => (1 - amt) * start + amt * end;

// const getCol = () => {
//   const min = 0;
//   const max = 360;
//   const excludeMin = 50;
//   const excludeMax = 180;
//   const range = Math.random() * (max - (excludeMax - excludeMin));
//   if (range > excludeMin) return excludeMax + range;
//   return range;
// };

// const opt = {
//   size: 2,
//   cols: 300,
//   rows: 300,
//   speed: 2,
//   rot: 2,
// };

// const Graphic = () => {
//   const $canvas = useRef();
//   const $ctx = useRef();
//   const $bg = useRef();
//   const mouse = useRef({ x: 0, y: 0, prevX: 0, prevY: 0, speed: 0 });
//   const win = useRef({ w: 0, h: 0 });

//   const grid = useRef([]);
//   const line = useRef([]);
//   const rafID = useRef();
//   const noise = new SimplexNoise();

//   // ... other function definitions remain the same ...

//   const init = () => {
//     if (!$canvas.current) return;
//     const dpr = window.devicePixelRatio || 1;
//     win.current.w = window.innerWidth;
//     win.current.h = window.innerHeight;
//     $canvas.current.width = win.current.w * dpr;
//     $canvas.current.height = win.current.h * dpr;

//     $ctx.current = $canvas.current.getContext('2d');
//     $ctx.current.strokeStyle = 'rgba(255, 255, 255, .15)';
//     $ctx.current.scale(dpr, dpr);

//     $bg.current.style.background = `linear-gradient(${
//       Math.random() * 360
//     }deg, ${`hsl(${getCol()}, 90%, 40%, 1)`}, ${`hsl(${getCol()}, 90%, 40%, 1)`})`;

//     line.current = [];
//     createGrid();
//     if (rafID.current) cancelAnimationFrame(rafID.current);
//     draw();

//     mouse.current.x = win.current.w * 0.5;
//     mouse.current.y = win.current.h * 0.5;

//     // ... the rest of your init function ...
//   };

//   useEffect(() => {
//     init();
//     window.addEventListener('resize', init);
//     window.addEventListener('click', handleClick);

//     return () => {
//       window.removeEventListener('resize', init);
//       window.removeEventListener('click', handleClick);
//       cancelAnimationFrame(rafID.current);
//     };
//   }, []);

//   return (
//     <>
//       <canvas className={styles.canvas} ref={$canvas} />
//       <div className={styles.bg} ref={$bg} />
//     </>
//   );
// };

// export default Graphic;
