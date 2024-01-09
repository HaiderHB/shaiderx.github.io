import React, { useRef, useEffect } from 'react';
import { createNoise3D } from 'simplex-noise';

const lerp = (start, end, amt) => (1 - amt) * start + amt * end;

const getCol = () => {
  const excludeMin = 50;
  const excludeMax = 180;
  const range = Math.random() * (360 - (excludeMax - excludeMin));
  return range > excludeMin ? excludeMax + range : range;
};

const opt = {
  size: 2,
  cols: 300,
  rows: 300,
  speed: 2,
  rot: 2,
};

const GraphicCanvas = () => {
  const $canvas = useRef(null);
  const $ctx = useRef(null);
  const $bg = useRef(null);
  const win = useRef({ w: 0, h: 0 });
  const grid = useRef([]);
  const line = useRef([]);
  const rafID = useRef();
  const noise = createNoise3D();

  const lines = () => {
    const $c = $ctx.current;
    $c.globalCompositeOperation = 'screen';
    $c.lineWidth = 1;
    line.current.forEach((l, i) => {
      l.forEach(({ x, y }) => {
        const x1 = x - (win.current.w - opt.size * opt.cols) * 0.5;
        const y1 = y - (win.current.h - opt.size * opt.rows) * 0.5;

        if (x1 > 0 && x1 < opt.size * opt.cols && y1 > 0 && y1 < opt.size * opt.rows) {
          $c.save();
          $c.beginPath();
          $c.translate(x, y);
          const id = getCell(x1, y1);
          $c.moveTo(0, 0);

          const { rot } = grid.current[id + ((i % 3) * Math.random() > 0.5 ? 1 : -1)];
          const newX = Math.sin(rot + Math.PI * 0.5) * opt.speed;
          const newY = Math.cos(rot - Math.PI * 0.5) * opt.speed;
          $c.lineTo(newX, newY);
          $c.stroke();
          $c.restore();

          if (!l.drawed) {
            line.current.push([{ x: x + newX, y: y + newY }]);
            l.drawed = true;
          }
        }
      });
    });
  };

  const draw = () => {
    const $c = $ctx.current;
    if (!$c) return;

    $c.clearRect(0, 0, win.current.w, win.current.h);

    // Test drawing
    $c.fillStyle = 'red';
    $c.fillRect(10, 10, 100, 100); // Draw a simple red rectangle

    // lines(); // Comment this out for now
    // rafID.current = requestAnimationFrame(draw); // Comment this out for now
  };

  const getCell = (x, y) => {
    const id = Math.floor(y / opt.size) * opt.rows + Math.floor(x / opt.size);
    return id;
  };

  const createGrid = () => {
    grid.current = [];
    let i = 0;
    const zoom = 0.005 + Math.random() * 0.01;
    const offset = Math.random() * 10;
    for (let y = 0; y < opt.rows; y++) {
      for (let x = 0; x < opt.cols; x++) {
        const gx = win.current.w * 0.5 - opt.size * opt.cols * 0.5 + x * 2;
        const gy = win.current.h * 0.5 - opt.size * opt.rows * 0.5 + y * 2;
        const rot = noise(x * zoom, y * zoom, offset) * Math.PI * opt.rot;
        grid.current.push({
          id: i,
          x: gx,
          y: gy,
          rot,
        });
        i++;
      }
    }
  };

  const init = () => {
    if (!$canvas.current) return;
    const dpr = window.devicePixelRatio || 1;
    win.current.w = window.innerWidth;
    win.current.h = window.innerHeight;
    $canvas.current.width = win.current.w * dpr;
    $canvas.current.height = win.current.h * dpr;

    $ctx.current = $canvas.current.getContext('2d');
    $ctx.current.strokeStyle = 'rgba(255, 255, 255, .15)';
    $ctx.current.scale(dpr, dpr);

    $bg.current.style.background = `linear-gradient(${
      Math.random() * 360
    }deg, ${`hsl(${getCol()}, 90%, 40%, 1)`}, ${`hsl(${getCol()}, 90%, 40%, 1)`})`;

    // Centering the square
    const centerX = win.current.w / 2;
    const centerY = win.current.h / 2;
    $ctx.current.fillStyle = 'red';
    $ctx.current.fillRect(centerX - 50, centerY - 50, 100, 100); // Centered red rectangle

    line.current = [];
    createGrid();
    if (rafID.current) cancelAnimationFrame(rafID.current);
    draw();
  };

  useEffect(() => {
    window.addEventListener('resize', init);
    init();

    return () => {
      window.removeEventListener('resize', init);
      cancelAnimationFrame(rafID.current);
    };
  }, []);

  return (
    <>
      <canvas className="canvas" ref={$canvas} />
      <div className="bg" ref={$bg} />
    </>
  );
};

export default GraphicCanvas;
