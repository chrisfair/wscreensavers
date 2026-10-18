// Dynamical Systems, Fourier Epicycles, Cellular Automata & Classic Vector Art:
// 1. attractors (Lorenz, Thomas, Aizawa, Halvorsen 3D Strange Attractors)
// 2. epicycle (Fourier Epicycle Spirographs)
// 3. gameoflife (Conway's Game of Life & HighLife with thermal age coloring)
// 4. rorschach (Symmetric Inkblot generator)
// 5. mystify (Classic bouncing polygon & Bezier ribbons)

export function createAttractors(canvas, getParams) {
  const ctx = canvas.getContext('2d');
  let trails = [];
  let activeSystem = '';
  let camAngle = 0;

  function initTrails(sysName) {
    activeSystem = sysName;
    trails = [];
    for (let i = 0; i < 6; i++) {
      const pts = [];
      let x = 0.1 + (i - 2.5) * 0.08;
      let y = 0.1 + (i % 3) * 0.06;
      let z = 0.1 + i * 0.05;
      for (let s = 0; s < 260; s++) {
        pts.push({ x, y, z });
        const next = stepSystem(sysName, x, y, z, 0.008);
        x = next.x;
        y = next.y;
        z = next.z;
      }
      trails.push({
        hue: (i * 55 + 175) % 360,
        pts
      });
    }
  }

  function stepSystem(sys, x, y, z, dt) {
    let dx = 0, dy = 0, dz = 0;
    if (sys === 'thomas') {
      const b = 0.19;
      dx = Math.sin(y) - b * x;
      dy = Math.sin(z) - b * y;
      dz = Math.sin(x) - b * z;
      dt *= 6.0;
    } else if (sys === 'aizawa') {
      const a = 0.95, b = 0.7, c = 0.6, d = 3.5, e = 0.25, f = 0.1;
      dx = (z - b) * x - d * y;
      dy = d * x + (z - b) * y;
      dz = c + a * z - (z * z * z) / 3 - (x * x + y * y) * (1 + e * z) + f * z * x * x * x;
      dt *= 1.8;
    } else if (sys === 'halvorsen') {
      const a = 1.4;
      dx = -a * x - 4 * y - 4 * z - y * y;
      dy = -a * y - 4 * z - 4 * x - z * z;
      dz = -a * z - 4 * x - 4 * y - x * x;
      dt *= 0.65;
    } else {
      // Lorenz
      const sigma = 10, rho = 28, beta = 8 / 3;
      dx = sigma * (y - x);
      dy = x * (rho - z) - y;
      dz = x * y - beta * z;
      dt *= 0.85;
    }
    return {
      x: x + dx * dt,
      y: y + dy * dt,
      z: z + dz * dt
    };
  }

  return {
    render(dt) {
      const p = getParams();
      const sys = p.system || 'lorenz';
      const speed = Number(p.speed ?? 1.0);
      const maxLen = Math.min(600, Math.max(80, Math.floor(Number(p.particles ?? 1800) / 6)));

      if (sys !== activeSystem || trails.length === 0) {
        initTrails(sys);
      }

      camAngle += dt * 0.45 * speed;

      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = 'rgba(4, 6, 15, 0.24)';
      ctx.fillRect(0, 0, w, h);

      const scale =
        sys === 'thomas'    ? Math.min(w, h) * 0.11 :
        sys === 'aizawa'    ? Math.min(w, h) * 0.22 :
        sys === 'halvorsen' ? Math.min(w, h) * 0.032 :
                              Math.min(w, h) * 0.014;

      const zOffset = sys === 'lorenz' ? -25 : 0;
      const cos = Math.cos(camAngle);
      const sin = Math.sin(camAngle);

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineWidth = 2.2;

      for (const tr of trails) {
        for (let k = 0; k < 3; k++) {
          const head = tr.pts[tr.pts.length - 1];
          const next = stepSystem(sys, head.x, head.y, head.z, 0.008 * speed);
          tr.pts.push(next);
          if (tr.pts.length > maxLen) tr.pts.shift();
        }

        ctx.beginPath();
        for (let i = 0; i < tr.pts.length; i++) {
          const pt = tr.pts[i];
          const cz = pt.z + zOffset;
          const rx = pt.x * cos - cz * sin;
          const sy = h / 2 - pt.y * scale;
          const sx = w / 2 + rx * scale;
          if (i === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.strokeStyle = `hsla(${tr.hue}, 95%, 65%, 0.72)`;
        ctx.stroke();
      }
      ctx.restore();
    }
  };
}

export function createEpicycle(canvas, getParams) {
  const ctx = canvas.getContext('2d');
  let phase = 0;
  let trace = [];
  let lastCount = 0;

  const freqRatios = [1, -3, 5, -7, 11, -13, 17, -19, 23, -29, 31, -37];

  return {
    render(dt) {
      const p = getParams();
      const harmonics = Number(p.harmonics ?? 6);
      const speed = Number(p.speed ?? 1.0);
      const showCircles = p.showCircles !== false;
      const lineWidth = Number(p.lineWidth ?? 2.5);

      if (harmonics !== lastCount) {
        lastCount = harmonics;
        trace = [];
      }

      phase += dt * 0.65 * speed;

      const w = canvas.width;
      const h = canvas.height;
      const baseR = Math.min(w, h) * 0.21;

      ctx.fillStyle = '#060812';
      ctx.fillRect(0, 0, w, h);

      let x = w / 2;
      let y = h / 2;

      for (let i = 0; i < harmonics; i++) {
        const r = baseR * Math.pow(0.62, i);
        const freq = freqRatios[i % freqRatios.length];
        const a = phase * freq;
        const nx = x + Math.cos(a) * r;
        const ny = y + Math.sin(a) * r;

        if (showCircles) {
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.24)';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.stroke();

          ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(nx, ny);
          ctx.stroke();
        }

        x = nx;
        y = ny;
      }

      trace.push({ x, y, hue: (phase * 45) % 360 });
      if (trace.length > 900) trace.shift();

      ctx.save();
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      for (let i = 1; i < trace.length; i++) {
        const alpha = i / trace.length;
        ctx.strokeStyle = `hsla(${trace[i].hue}, 95%, 65%, ${alpha.toFixed(2)})`;
        ctx.beginPath();
        ctx.moveTo(trace[i - 1].x, trace[i - 1].y);
        ctx.lineTo(trace[i].x, trace[i].y);
        ctx.stroke();
      }
      ctx.restore();
    }
  };
}

export function createGameOfLife(canvas, getParams) {
  const ctx = canvas.getContext('2d');
  let cols = 0;
  let rows = 0;
  let grid = [];
  let nextGrid = [];
  let stepAcc = 0;
  let genCount = 0;

  function initGrid(c, r) {
    cols = c;
    rows = r;
    grid = new Int16Array(cols * rows);
    nextGrid = new Int16Array(cols * rows);
    seedRandom(0.24);
  }

  function seedRandom(prob) {
    for (let i = 0; i < grid.length; i++) {
      grid[i] = Math.random() < prob ? 1 : 0;
    }
  }

  function injectGliderBurst() {
    const cx = Math.floor(Math.random() * (cols - 12)) + 6;
    const cy = Math.floor(Math.random() * (rows - 12)) + 6;
    const rPentomino = [[0,1],[1,0],[1,1],[1,2],[2,0]];
    for (const [dx, dy] of rPentomino) {
      grid[(cy + dy) * cols + (cx + dx)] = 1;
    }
  }

  return {
    render(dt) {
      const p = getParams();
      const cellSize = Number(p.cellSize ?? 8);
      const stepsPerSec = Number(p.stepsPerSec ?? 15);
      const rule = p.rule || 'conway';
      const showGridLines = p.gridLines !== false;

      const w = canvas.width;
      const h = canvas.height;
      const c = Math.max(24, Math.floor(w / cellSize));
      const r = Math.max(16, Math.floor(h / cellSize));

      if (c !== cols || r !== rows) {
        initGrid(c, r);
      }

      stepAcc += dt * stepsPerSec;
      while (stepAcc >= 1) {
        stepAcc -= 1;
        genCount++;
        let aliveTotal = 0;

        for (let y = 0; y < rows; y++) {
          for (let x = 0; x < cols; x++) {
            let n = 0;
            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nx = (x + dx + cols) % cols;
                const ny = (y + dy + rows) % rows;
                if (grid[ny * cols + nx] > 0) n++;
              }
            }
            const cur = grid[y * cols + x];
            let nextState = 0;
            if (cur > 0) {
              if (rule === 'daynight') {
                nextState = (n === 3 || n === 4 || n >= 6) ? Math.min(120, cur + 1) : 0;
              } else {
                nextState = (n === 2 || n === 3) ? Math.min(120, cur + 1) : 0;
              }
            } else {
              if (rule === 'highlife') {
                nextState = (n === 3 || n === 6) ? 1 : 0;
              } else if (rule === 'daynight') {
                nextState = (n === 3 || n >= 6) ? 1 : 0;
              } else {
                nextState = n === 3 ? 1 : 0;
              }
            }
            nextGrid[y * cols + x] = nextState;
            if (nextState > 0) aliveTotal++;
          }
        }
        const tmp = grid;
        grid = nextGrid;
        nextGrid = tmp;

        if (genCount % 45 === 0 || aliveTotal < (cols * rows) * 0.03) {
          injectGliderBurst();
        }
      }

      ctx.fillStyle = '#05080f';
      ctx.fillRect(0, 0, w, h);

      const gap = showGridLines && cellSize >= 5 ? 1 : 0;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const age = grid[y * cols + x];
          if (age <= 0) continue;
          const hue = (155 + Math.min(160, age * 3.5)) % 360;
          ctx.fillStyle = `hsl(${hue}, 92%, ${age === 1 ? 72 : 54}%)`;
          ctx.fillRect(x * cellSize, y * cellSize, cellSize - gap, cellSize - gap);
        }
      }
    }
  };
}

export function createRorschach(canvas, getParams) {
  const ctx = canvas.getContext('2d');
  let walker = { x: 0, y: 0, hue: 200 };
  let elapsed = 0;

  return {
    render(dt) {
      const p = getParams();
      const symmetry = p.symmetry || 'bilateral';
      const speed = Number(p.speed ?? 1.0);
      const colorInk = p.colorInk !== false;

      const w = canvas.width;
      const h = canvas.height;
      elapsed += dt * speed;

      if (elapsed > 14) {
        elapsed = 0;
        ctx.fillStyle = '#08070c';
        ctx.fillRect(0, 0, w, h);
        walker = { x: 0, y: 0, hue: Math.random() * 360 };
      }

      // Fade subtly
      ctx.fillStyle = 'rgba(8, 7, 12, 0.012)';
      ctx.fillRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;

      for (let i = 0; i < 45; i++) {
        walker.x += (Math.random() - 0.5) * 18 * speed;
        walker.y += (Math.random() - 0.5) * 18 * speed;
        walker.x = Math.max(-w * 0.38, Math.min(w * 0.38, walker.x));
        walker.y = Math.max(-h * 0.42, Math.min(h * 0.42, walker.y));
        walker.hue = (walker.hue + 0.15) % 360;

        const r = 4 + Math.random() * 14;
        ctx.fillStyle = colorInk
          ? `hsla(${walker.hue}, 82%, 58%, 0.14)`
          : 'rgba(226, 232, 240, 0.14)';

        const plot = (px, py) => {
          ctx.beginPath();
          ctx.arc(cx + px, cy + py, r, 0, Math.PI * 2);
          ctx.fill();
        };

        plot(walker.x, walker.y);
        plot(-walker.x, walker.y);
        if (symmetry === 'quad' || symmetry === 'kaleidoscope') {
          plot(walker.x, -walker.y);
          plot(-walker.x, -walker.y);
        }
        if (symmetry === 'kaleidoscope') {
          plot(walker.y * 0.8, walker.x * 0.8);
          plot(-walker.y * 0.8, walker.x * 0.8);
          plot(walker.y * 0.8, -walker.x * 0.8);
          plot(-walker.y * 0.8, -walker.x * 0.8);
        }
      }
    }
  };
}

export function createMystify(canvas, getParams) {
  const ctx = canvas.getContext('2d');
  let shapes = [];

  function ensureShapes(polyCount, vertexCount) {
    if (shapes.length === polyCount && shapes[0]?.verts.length === vertexCount) return;
    shapes = [];
    for (let s = 0; s < polyCount; s++) {
      const verts = [];
      for (let v = 0; v < vertexCount; v++) {
        verts.push({
          x: Math.random(),
          y: Math.random(),
          vx: (Math.random() - 0.5) * 0.55,
          vy: (Math.random() - 0.5) * 0.55
        });
      }
      shapes.push({
        hue: (s * 140 + 180) % 360,
        verts,
        history: []
      });
    }
  }

  return {
    render(dt) {
      const p = getParams();
      const polygons = Number(p.polygons ?? 2);
      const vertices = Number(p.vertices ?? 4);
      const trails = Number(p.trails ?? 18);
      const speed = Number(p.speed ?? 1.0);
      const curved = Boolean(p.curved);

      ensureShapes(polygons, vertices);

      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = '#04060d';
      ctx.fillRect(0, 0, w, h);

      for (const sh of shapes) {
        sh.hue = (sh.hue + dt * 24 * speed) % 360;
        for (const v of sh.verts) {
          v.x += v.vx * dt * speed;
          v.y += v.vy * dt * speed;
          if (v.x < 0.02 || v.x > 0.98) v.vx = -v.vx;
          if (v.y < 0.02 || v.y > 0.98) v.vy = -v.vy;
        }

        sh.history.push({
          hue: sh.hue,
          pts: sh.verts.map(v => ({ x: v.x * w, y: v.y * h }))
        });
        while (sh.history.length > trails) {
          sh.history.shift();
        }

        for (let i = 0; i < sh.history.length; i++) {
          const snap = sh.history[i];
          const alpha = (i + 1) / sh.history.length;
          ctx.strokeStyle = `hsla(${snap.hue}, 95%, 65%, ${alpha.toFixed(2)})`;
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          if (curved && snap.pts.length >= 3) {
            const firstMidX = (snap.pts[0].x + snap.pts[snap.pts.length - 1].x) / 2;
            const firstMidY = (snap.pts[0].y + snap.pts[snap.pts.length - 1].y) / 2;
            ctx.moveTo(firstMidX, firstMidY);
            for (let k = 0; k < snap.pts.length; k++) {
              const cur = snap.pts[k];
              const next = snap.pts[(k + 1) % snap.pts.length];
              ctx.quadraticCurveTo(cur.x, cur.y, (cur.x + next.x) / 2, (cur.y + next.y) / 2);
            }
          } else {
            snap.pts.forEach((pt, idx) => {
              if (idx === 0) ctx.moveTo(pt.x, pt.y);
              else ctx.lineTo(pt.x, pt.y);
            });
            ctx.closePath();
          }
          ctx.stroke();
        }
      }
    }
  };
}
