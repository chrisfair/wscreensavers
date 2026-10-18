// 3D XScreenSaver Classics:
// 1. pipes3d (3D Pipes with ball joints & specular shading)
// 2. boing (Amiga 1984 Red & White checkered bouncing sphere)
// 3. flyingtoasters (Flying Toasters with flapping wings & toast)
// 4. geodesicgears (Planetary interlocking 3D gears)
// 5. maze3d (First-person raycasted 3D maze solver with HUD minimap)
// 6. molecule (3D Ball-and-stick molecular structures: Caffeine, DNA, C60, Benzene)

const PIPE_PALETTES = {
  classic: ['#ef4444', '#22c55e', '#3b82f6', '#eab308', '#a855f7', '#06b6d4'],
  copper:  ['#d97706', '#b45309', '#f59e0b', '#92400e', '#fcd34d', '#78350f'],
  neon:    ['#00f5d4', '#ff007f', '#7b2cbf', '#fee440', '#00bbf9', '#f15bb5'],
  mono:    ['#e2e8f0', '#94a3b8', '#cbd5e1', '#64748b', '#f8fafc', '#475569']
};

export function createPipes3D(canvas, getParams) {
  const ctx = canvas.getContext('2d');
  const GRID = 7;
  let visited = new Set();
  let segments = [];
  let walkers = [];
  let camAngle = 0;

  function key(x, y, z) {
    return `${x},${y},${z}`;
  }

  function resetPipeSystem(count, paletteName) {
    visited.clear();
    segments = [];
    walkers = [];
    const colors = PIPE_PALETTES[paletteName] || PIPE_PALETTES.classic;
    for (let i = 0; i < count; i++) {
      const sx = Math.floor((Math.random() - 0.5) * GRID * 1.4);
      const sy = Math.floor((Math.random() - 0.5) * GRID * 1.4);
      const sz = Math.floor((Math.random() - 0.5) * GRID * 1.4);
      visited.add(key(sx, sy, sz));
      walkers.push({
        x: sx,
        y: sy,
        z: sz,
        dir: [1, 0, 0],
        color: colors[i % colors.length],
        timer: 0
      });
    }
  }

  resetPipeSystem(4, 'classic');

  function project(x, y, z, w, h, angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const rx = x * cos - z * sin;
    const rz = x * sin + z * cos + 18;
    const ry = y * 0.92 + rz * 0.08;
    const scale = Math.min(w, h) * 0.95 / Math.max(4, rz);
    return {
      sx: w / 2 + rx * scale,
      sy: h / 2 + ry * scale,
      depth: rz,
      scale
    };
  }

  return {
    render(dt) {
      const p = getParams();
      const pipeCount = Number(p.pipeCount ?? 4);
      const speed = Number(p.speed ?? 1.2);
      const radiusFactor = Number(p.radius ?? 0.35);
      const joints = p.joints !== false;
      const rotateCamera = p.rotateCamera !== false;
      const palette = p.palette || 'classic';

      if (walkers.length !== pipeCount) {
        resetPipeSystem(pipeCount, palette);
      }

      if (rotateCamera) {
        camAngle += dt * 0.32;
      }

      // Advance walkers
      const dirs = [
        [1, 0, 0], [-1, 0, 0],
        [0, 1, 0], [0, -1, 0],
        [0, 0, 1], [0, 0, -1]
      ];

      for (const wk of walkers) {
        wk.timer += dt * 14 * speed;
        if (wk.timer >= 1) {
          wk.timer = 0;
          // Prefer current direction 55% of the time if free
          const candidates = [];
          for (const d of dirs) {
            const nx = wk.x + d[0];
            const ny = wk.y + d[1];
            const nz = wk.z + d[2];
            if (Math.abs(nx) <= GRID && Math.abs(ny) <= GRID && Math.abs(nz) <= GRID && !visited.has(key(nx, ny, nz))) {
              candidates.push(d);
            }
          }
          if (candidates.length > 0) {
            const sameDir = candidates.find(d => d[0] === wk.dir[0] && d[1] === wk.dir[1] && d[2] === wk.dir[2]);
            const chosen = (sameDir && Math.random() < 0.55)
              ? sameDir
              : candidates[Math.floor(Math.random() * candidates.length)];
            const isTurn = chosen[0] !== wk.dir[0] || chosen[1] !== wk.dir[1] || chosen[2] !== wk.dir[2];
            const nx = wk.x + chosen[0];
            const ny = wk.y + chosen[1];
            const nz = wk.z + chosen[2];
            visited.add(key(nx, ny, nz));
            segments.push({
              x1: wk.x, y1: wk.y, z1: wk.z,
              x2: nx, y2: ny, z2: nz,
              color: wk.color,
              joint: isTurn
            });
            wk.x = nx;
            wk.y = ny;
            wk.z = nz;
            wk.dir = chosen;
          } else {
            // Respawn walker if trapped
            wk.x = Math.floor((Math.random() - 0.5) * GRID * 1.5);
            wk.y = Math.floor((Math.random() - 0.5) * GRID * 1.5);
            wk.z = Math.floor((Math.random() - 0.5) * GRID * 1.5);
          }
        }
      }

      if (segments.length > 340) {
        resetPipeSystem(pipeCount, palette);
      }

      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = '#05070d';
      ctx.fillRect(0, 0, w, h);

      // Painter's algorithm sort back-to-front
      const projected = segments.map(seg => {
        const p1 = project(seg.x1, seg.y1, seg.z1, w, h, camAngle);
        const p2 = project(seg.x2, seg.y2, seg.z2, w, h, camAngle);
        return { seg, p1, p2, depth: (p1.depth + p2.depth) * 0.5 };
      });
      projected.sort((a, b) => b.depth - a.depth);

      ctx.lineCap = 'round';
      for (const item of projected) {
        const { seg, p1, p2 } = item;
        const thickness = Math.max(3, item.p1.scale * radiusFactor);

        // Shadow/base cylinder
        ctx.strokeStyle = seg.color;
        ctx.lineWidth = thickness;
        ctx.beginPath();
        ctx.moveTo(p1.sx, p1.sy);
        ctx.lineTo(p2.sx, p2.sy);
        ctx.stroke();

        // Specular highlight stripe
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.42)';
        ctx.lineWidth = Math.max(1.2, thickness * 0.28);
        ctx.beginPath();
        ctx.moveTo(p1.sx - thickness * 0.16, p1.sy - thickness * 0.16);
        ctx.lineTo(p2.sx - thickness * 0.16, p2.sy - thickness * 0.16);
        ctx.stroke();

        if (joints && seg.joint) {
          ctx.fillStyle = seg.color;
          ctx.beginPath();
          ctx.arc(p1.sx, p1.sy, thickness * 0.68, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
          ctx.beginPath();
          ctx.arc(p1.sx - thickness * 0.2, p1.sy - thickness * 0.2, thickness * 0.22, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  };
}

export function createBoing(canvas, getParams) {
  const ctx = canvas.getContext('2d');
  let bx = 0.5;
  let by = 0.32;
  let vx = 0.28;
  let vy = 0.0;
  let phase = 0;

  return {
    render(dt) {
      const p = getParams();
      const spinSpeed = Number(p.spinSpeed ?? 1.5);
      const gravity = Number(p.gravity ?? 1.0);
      const showGrid = p.grid !== false;
      const showShadow = p.shadow !== false;

      const w = canvas.width;
      const h = canvas.height;
      const radius = Math.min(w, h) * 0.19;

      ctx.fillStyle = '#7b7b7b';
      ctx.fillRect(0, 0, w, h);

      // Classic Amiga purple wireframe background grid
      if (showGrid) {
        ctx.strokeStyle = '#a820a8';
        ctx.lineWidth = 2;
        const gx0 = w * 0.14;
        const gx1 = w * 0.86;
        const gy0 = h * 0.08;
        const gy1 = h * 0.82;
        for (let i = 0; i <= 12; i++) {
          const x = gx0 + ((gx1 - gx0) * i) / 12;
          ctx.beginPath();
          ctx.moveTo(x, gy0);
          ctx.lineTo(x, gy1);
          ctx.stroke();
        }
        for (let j = 0; j <= 9; j++) {
          const y = gy0 + ((gy1 - gy0) * j) / 9;
          ctx.beginPath();
          ctx.moveTo(gx0, y);
          ctx.lineTo(gx1, y);
          ctx.stroke();
        }
        // Floor perspective lines
        for (let i = 0; i <= 12; i++) {
          const xTop = gx0 + ((gx1 - gx0) * i) / 12;
          const xBot = w * 0.04 + ((w * 0.92) * i) / 12;
          ctx.beginPath();
          ctx.moveTo(xTop, gy1);
          ctx.lineTo(xBot, h * 0.95);
          ctx.stroke();
        }
      }

      // Physics update
      vy += gravity * 0.95 * dt;
      bx += vx * dt;
      by += vy * dt;

      if (bx < 0.22) { bx = 0.22; vx = Math.abs(vx); }
      if (bx > 0.78) { bx = 0.78; vx = -Math.abs(vx); }
      if (by > 0.74) {
        by = 0.74;
        vy = -0.82 * Math.sqrt(Math.max(0.4, gravity));
      }

      phase += dt * spinSpeed * 2.6;

      const cx = bx * w;
      const cy = by * h;

      // Cast Shadow
      if (showShadow) {
        ctx.fillStyle = 'rgba(20, 20, 20, 0.45)';
        ctx.beginPath();
        ctx.ellipse(cx + radius * 0.35, cy + radius * 0.12, radius * 0.95, radius * 0.95, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Render 3D Lat/Lon checkered facets on tilted sphere
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(0.28); // Classic 16-degree Amiga Boing tilt

      const latSteps = 8;
      const lonSteps = 16;

      for (let lat = 0; lat < latSteps; lat++) {
        const theta1 = -Math.PI / 2 + (lat * Math.PI) / latSteps;
        const theta2 = -Math.PI / 2 + ((lat + 1) * Math.PI) / latSteps;

        for (let lon = 0; lon < lonSteps; lon++) {
          const phi1 = (lon * Math.PI * 2) / lonSteps + phase;
          const phi2 = ((lon + 1) * Math.PI * 2) / lonSteps + phase;

          const p1 = spherePoint(theta1, phi1, radius);
          const p2 = spherePoint(theta1, phi2, radius);
          const p3 = spherePoint(theta2, phi2, radius);
          const p4 = spherePoint(theta2, phi1, radius);

          // Back-face culling
          if (p1.z + p2.z + p3.z + p4.z < 0) continue;

          const isRed = (lat + lon) % 2 === 0;
          const shade = 0.65 + 0.35 * ((p1.z + p3.z) / (2 * radius));
          if (isRed) {
            ctx.fillStyle = `rgb(${Math.floor(235 * shade)}, ${Math.floor(20 * shade)}, ${Math.floor(20 * shade)})`;
          } else {
            ctx.fillStyle = `rgb(${Math.floor(250 * shade)}, ${Math.floor(250 * shade)}, ${Math.floor(250 * shade)})`;
          }

          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.lineTo(p3.x, p3.y);
          ctx.lineTo(p4.x, p4.y);
          ctx.closePath();
          ctx.fill();
        }
      }
      ctx.restore();
    }
  };
}

function spherePoint(theta, phi, r) {
  return {
    x: r * Math.cos(theta) * Math.sin(phi),
    y: r * Math.sin(theta),
    z: r * Math.cos(theta) * Math.cos(phi)
  };
}

export function createFlyingToasters(canvas, getParams) {
  const ctx = canvas.getContext('2d');
  let entities = [];

  function syncEntities(toastersCount, toastCount) {
    const total = toastersCount + toastCount;
    if (entities.length === total) return;
    entities = [];
    for (let i = 0; i < toastersCount; i++) {
      entities.push({
        type: 'toaster',
        x: Math.random() * 1.4,
        y: Math.random() * 1.2 - 0.2,
        z: 0.55 + Math.random() * 0.75,
        flap: Math.random() * Math.PI * 2
      });
    }
    for (let i = 0; i < toastCount; i++) {
      entities.push({
        type: 'toast',
        x: Math.random() * 1.4,
        y: Math.random() * 1.2 - 0.2,
        z: 0.45 + Math.random() * 0.65,
        flap: 0
      });
    }
    entities.sort((a, b) => a.z - b.z);
  }

  return {
    render(dt) {
      const p = getParams();
      const toasters = Number(p.toasters ?? 12);
      const toast = Number(p.toast ?? 8);
      const speed = Number(p.speed ?? 1.0);
      const toastLevel = p.toastLevel || 'golden';

      syncEntities(toasters, toast);

      const w = canvas.width;
      const h = canvas.height;

      // Starlit midnight backdrop
      ctx.fillStyle = '#05060f';
      ctx.fillRect(0, 0, w, h);

      const toastColor =
        toastLevel === 'light' ? '#f3d59b' :
        toastLevel === 'burnt' ? '#3d2516' : '#c88a3b';

      for (const e of entities) {
        e.x -= dt * 0.14 * speed * e.z;
        e.y += dt * 0.09 * speed * e.z;
        e.flap += dt * 9.5 * speed;

        if (e.x < -0.2 || e.y > 1.2) {
          e.x = 1.15 + Math.random() * 0.25;
          e.y = -0.15 + Math.random() * 0.65;
        }

        const sx = e.x * w;
        const sy = e.y * h;
        const s = 44 * e.z;

        ctx.save();
        ctx.translate(sx, sy);

        if (e.type === 'toast') {
          // Draw isometric slice of toast
          ctx.fillStyle = '#6b3e16';
          ctx.strokeStyle = '#3a1f09';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(-s * 0.6, -s * 0.4, s * 1.2, s * 0.8, 8);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = toastColor;
          ctx.beginPath();
          ctx.roundRect(-s * 0.5, -s * 0.32, s * 1.0, s * 0.64, 5);
          ctx.fill();
        } else {
          const wingAngle = Math.sin(e.flap) * 0.62;

          // Back Wing
          drawWing(ctx, -s * 0.25, -s * 0.35, s * 0.85, -wingAngle, true);

          // Chrome Toaster Body
          const grad = ctx.createLinearGradient(-s * 0.7, -s * 0.6, s * 0.7, s * 0.6);
          grad.addColorStop(0, '#f8fafc');
          grad.addColorStop(0.45, '#94a3b8');
          grad.addColorStop(0.55, '#1e293b');
          grad.addColorStop(1, '#cbd5e1');

          ctx.fillStyle = grad;
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.roundRect(-s * 0.68, -s * 0.52, s * 1.36, s * 1.04, 14);
          ctx.fill();
          ctx.stroke();

          // Toaster Slots
          ctx.strokeStyle = '#090d16';
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.moveTo(-s * 0.4, -s * 0.35);
          ctx.lineTo(s * 0.25, -s * 0.35);
          ctx.moveTo(-s * 0.3, -s * 0.2);
          ctx.lineTo(s * 0.35, -s * 0.2);
          ctx.stroke();

          // Lever
          ctx.fillStyle = '#111827';
          ctx.fillRect(-s * 0.76, -s * 0.05, s * 0.16, s * 0.12);

          // Front Wing
          drawWing(ctx, s * 0.18, -s * 0.15, s * 0.9, wingAngle, false);
        }

        ctx.restore();
      }
    }
  };
}

function drawWing(ctx, ox, oy, scale, angle, isBack) {
  ctx.save();
  ctx.translate(ox, oy);
  ctx.rotate(angle);
  ctx.fillStyle = isBack ? '#cbd5e1' : '#ffffff';
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1.6;
  for (let f = 0; f < 4; f++) {
    ctx.beginPath();
    ctx.ellipse(f * scale * 0.14, -f * scale * 0.16, scale * 0.16, scale * 0.45, 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

export function createGeodesicGears(canvas, getParams) {
  const ctx = canvas.getContext('2d');
  let baseAngle = 0;

  const gearDefs = [
    { x: 0, y: 0, r: 0.22, teeth: 18, ratio: 1, color: '#38bdf8' },
    { x: 0.355, y: 0, r: 0.135, teeth: 11, ratio: -18 / 11, color: '#f59e0b' },
    { x: -0.355, y: 0, r: 0.135, teeth: 11, ratio: -18 / 11, color: '#10b981' },
    { x: 0, y: 0.355, r: 0.135, teeth: 11, ratio: -18 / 11, color: '#ec4899' },
    { x: 0, y: -0.355, r: 0.135, teeth: 11, ratio: -18 / 11, color: '#a855f7' },
    { x: 0.26, y: 0.26, r: 0.095, teeth: 8, ratio: 18 / 8, color: '#22d3ee' },
    { x: -0.26, y: -0.26, r: 0.095, teeth: 8, ratio: 18 / 8, color: '#facc15' },
    { x: 0.26, y: -0.26, r: 0.095, teeth: 8, ratio: 18 / 8, color: '#fb7185' },
    { x: -0.26, y: 0.26, r: 0.095, teeth: 8, ratio: 18 / 8, color: '#4ade80' }
  ];

  return {
    render(dt) {
      const p = getParams();
      const speed = Number(p.speed ?? 1.0);
      const gearCount = Number(p.gearCount ?? 9);
      const wireframe = Boolean(p.wireframe);

      baseAngle += dt * speed * 0.9;

      const w = canvas.width;
      const h = canvas.height;
      const minDim = Math.min(w, h);

      ctx.fillStyle = '#070a12';
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      ctx.translate(w / 2, h / 2);

      const tilt = 0.78 + 0.18 * Math.sin(baseAngle * 0.45);
      ctx.scale(1, tilt);

      const count = Math.min(gearDefs.length, Math.max(3, gearCount));
      for (let i = 0; i < count; i++) {
        const g = gearDefs[i];
        const gx = g.x * minDim;
        const gy = g.y * minDim;
        const r = g.r * minDim;
        const angle = baseAngle * g.ratio;

        ctx.save();
        ctx.translate(gx, gy);
        ctx.rotate(angle);

        ctx.strokeStyle = g.color;
        ctx.fillStyle = wireframe ? 'transparent' : g.color + '33';
        ctx.lineWidth = wireframe ? 2 : 3;

        // Draw Involute Gear Teeth
        const innerR = r * 0.84;
        const outerR = r * 1.08;
        ctx.beginPath();
        for (let t = 0; t < g.teeth; t++) {
          const a0 = (t * Math.PI * 2) / g.teeth;
          const a1 = a0 + (Math.PI * 0.4) / g.teeth;
          const a2 = a0 + (Math.PI * 0.95) / g.teeth;
          const a3 = a0 + (Math.PI * 1.35) / g.teeth;

          ctx.lineTo(Math.cos(a0) * innerR, Math.sin(a0) * innerR);
          ctx.lineTo(Math.cos(a1) * outerR, Math.sin(a1) * outerR);
          ctx.lineTo(Math.cos(a2) * outerR, Math.sin(a2) * outerR);
          ctx.lineTo(Math.cos(a3) * innerR, Math.sin(a3) * innerR);
        }
        ctx.closePath();
        if (!wireframe) ctx.fill();
        ctx.stroke();

        // Axle & Spokes
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.32, 0, Math.PI * 2);
        ctx.stroke();
        for (let s = 0; s < 5; s++) {
          const sa = (s * Math.PI * 2) / 5;
          ctx.beginPath();
          ctx.moveTo(Math.cos(sa) * r * 0.32, Math.sin(sa) * r * 0.32);
          ctx.lineTo(Math.cos(sa) * innerR, Math.sin(sa) * innerR);
          ctx.stroke();
        }

        ctx.restore();
      }

      ctx.restore();
    }
  };
}

export function createMaze3D(canvas, getParams) {
  const ctx = canvas.getContext('2d');
  const MAP_SIZE = 13;
  const map = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,1,0,0,0,0,0,0,0,1],
    [1,0,1,0,1,0,1,1,1,1,1,0,1],
    [1,0,1,0,0,0,1,0,0,0,1,0,1],
    [1,0,1,1,1,1,1,0,1,0,1,0,1],
    [1,0,0,0,0,0,0,0,1,0,0,0,1],
    [1,1,1,0,1,1,1,0,1,1,1,0,1],
    [1,0,0,0,1,0,0,0,0,0,1,0,1],
    [1,0,1,1,1,0,1,1,1,0,1,0,1],
    [1,0,1,0,0,0,1,0,0,0,0,0,1],
    [1,0,1,0,1,1,1,0,1,1,1,0,1],
    [1,0,0,0,0,0,0,0,1,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1]
  ];

  // Precomputed patrol path around the maze
  const waypoints = [
    [1.5, 1.5], [3.5, 1.5], [3.5, 3.5], [5.5, 3.5], [5.5, 1.5],
    [11.5, 1.5], [11.5, 5.5], [9.5, 5.5], [9.5, 3.5], [7.5, 3.5],
    [7.5, 7.5], [9.5, 7.5], [9.5, 9.5], [11.5, 9.5], [11.5, 11.5],
    [9.5, 11.5], [7.5, 9.5], [7.5, 11.5], [1.5, 11.5], [1.5, 7.5],
    [3.5, 7.5], [3.5, 5.5], [1.5, 5.5]
  ];
  let wpIndex = 0;
  let px = 1.5;
  let py = 1.5;
  let pAngle = 0;

  return {
    render(dt) {
      const p = getParams();
      const speed = Number(p.speed ?? 1.2);
      const fovDeg = Number(p.fov ?? 70);
      const wallStyle = p.wallStyle || 'brick';
      const showMinimap = p.showMinimap !== false;

      const target = waypoints[wpIndex];
      const dx = target[0] - px;
      const dy = target[1] - py;
      const dist = Math.hypot(dx, dy);
      const desiredAngle = Math.atan2(dy, dx);

      let angleDiff = desiredAngle - pAngle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      pAngle += angleDiff * Math.min(1, dt * 6 * speed);
      if (Math.abs(angleDiff) < 0.35) {
        const step = Math.min(dist, dt * 2.2 * speed);
        px += Math.cos(pAngle) * step;
        py += Math.sin(pAngle) * step;
      }
      if (dist < 0.15) {
        wpIndex = (wpIndex + 1) % waypoints.length;
      }

      const w = canvas.width;
      const h = canvas.height;
      const fov = (fovDeg * Math.PI) / 180;

      // Ceiling & Floor
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, w, h / 2);
      ctx.fillStyle = '#181e29';
      ctx.fillRect(0, h / 2, w, h / 2);

      // Raycasting columns
      const strips = Math.min(240, Math.floor(w / 4));
      const stripW = Math.ceil(w / strips);

      for (let col = 0; col < strips; col++) {
        const rayAngle = pAngle - fov / 2 + (col / strips) * fov;
        const rCos = Math.cos(rayAngle);
        const rSin = Math.sin(rayAngle);

        let d = 0.05;
        let hitSide = 0;
        let hitX = 0;
        let hitY = 0;
        while (d < 16) {
          hitX = px + rCos * d;
          hitY = py + rSin * d;
          const mx = Math.floor(hitX);
          const my = Math.floor(hitY);
          if (mx < 0 || my < 0 || mx >= MAP_SIZE || my >= MAP_SIZE || map[my][mx] === 1) {
            hitSide = Math.abs(hitX - Math.round(hitX)) < Math.abs(hitY - Math.round(hitY)) ? 0 : 1;
            break;
          }
          d += 0.03;
        }

        const perpDist = Math.max(0.15, d * Math.cos(rayAngle - pAngle));
        const wallH = Math.min(h * 1.4, (h * 0.92) / perpDist);
        const topY = (h - wallH) / 2;
        const shade = Math.max(0.18, Math.min(1, 1.35 / (1 + perpDist * 0.35))) * (hitSide ? 0.78 : 1.0);

        if (wallStyle === 'neon') {
          ctx.fillStyle = `rgba(0, ${Math.floor(220 * shade)}, ${Math.floor(255 * shade)}, 0.85)`;
        } else if (wallStyle === 'stone') {
          const v = Math.floor(145 * shade);
          ctx.fillStyle = `rgb(${v}, ${v + 8}, ${v + 16})`;
        } else {
          // Classic Windows 95 Red Brick
          const r = Math.floor(185 * shade);
          const g = Math.floor(58 * shade);
          const b = Math.floor(42 * shade);
          ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        }

        ctx.fillRect(col * stripW, topY, stripW + 1, wallH);
      }

      if (showMinimap) {
        const cell = 10;
        const ox = 24;
        const oy = 24;
        ctx.fillStyle = 'rgba(5, 10, 20, 0.75)';
        ctx.fillRect(ox - 4, oy - 4, MAP_SIZE * cell + 8, MAP_SIZE * cell + 8);
        for (let y = 0; y < MAP_SIZE; y++) {
          for (let x = 0; x < MAP_SIZE; x++) {
            ctx.fillStyle = map[y][x] ? '#475569' : '#0f172a';
            ctx.fillRect(ox + x * cell, oy + y * cell, cell - 1, cell - 1);
          }
        }
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(ox + px * cell, oy + py * cell, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };
}

export function createMolecule(canvas, getParams) {
  const ctx = canvas.getContext('2d');
  let angleY = 0;
  let angleX = 0.35;

  const structures = {
    caffeine: buildCaffeine(),
    benzene: buildBenzene(),
    dna: buildDNA(),
    buckyball: buildBuckyball()
  };

  return {
    render(dt) {
      const p = getParams();
      const molName = p.molecule || 'caffeine';
      const spinSpeed = Number(p.spinSpeed ?? 1.0);
      const showLabels = p.showLabels !== false;

      angleY += dt * 0.75 * spinSpeed;
      angleX = 0.4 * Math.sin(angleY * 0.5);

      const mol = structures[molName] || structures.caffeine;
      const w = canvas.width;
      const h = canvas.height;
      const scale = Math.min(w, h) * 0.11;

      ctx.fillStyle = '#040914';
      ctx.fillRect(0, 0, w, h);

      const cosY = Math.cos(angleY), sinY = Math.sin(angleY);
      const cosX = Math.cos(angleX), sinX = Math.sin(angleX);

      const projectedAtoms = mol.atoms.map(a => {
        const x1 = a.x * cosY - a.z * sinY;
        const z1 = a.x * sinY + a.z * cosY;
        const y2 = a.y * cosX - z1 * sinX;
        const z2 = a.y * sinX + z1 * cosX;
        const persp = 8 / (8 + z2 * 0.35);
        return {
          ...a,
          sx: w / 2 + x1 * scale * persp,
          sy: h / 2 + y2 * scale * persp,
          sz: z2,
          persp
        };
      });

      // Draw covalent bonds first
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.65)';
      ctx.lineWidth = 4;
      for (const [i, j] of mol.bonds) {
        const a = projectedAtoms[i];
        const b = projectedAtoms[j];
        if (!a || !b) continue;
        ctx.beginPath();
        ctx.moveTo(a.sx, a.sy);
        ctx.lineTo(b.sx, b.sy);
        ctx.stroke();
      }

      // Draw atoms sorted back-to-front
      const sorted = [...projectedAtoms].sort((a, b) => b.sz - a.sz);
      ctx.font = 'bold 11px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (const atom of sorted) {
        const rad = Math.max(6, atom.radius * scale * 0.24 * atom.persp);
        const grad = ctx.createRadialGradient(atom.sx - rad * 0.3, atom.sy - rad * 0.3, rad * 0.1, atom.sx, atom.sy, rad);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.35, atom.color);
        grad.addColorStop(1, '#020617');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(atom.sx, atom.sy, rad, 0, Math.PI * 2);
        ctx.fill();

        if (showLabels && rad > 9) {
          ctx.fillStyle = '#ffffff';
          ctx.fillText(atom.el, atom.sx, atom.sy);
        }
      }
    }
  };
}

function buildCaffeine() {
  const atoms = [
    { el: 'N', x: -1.2, y: 0.8, z: 0.0, color: '#3b82f6', radius: 1.5 },
    { el: 'C', x: 0.0,  y: 1.4, z: 0.1, color: '#64748b', radius: 1.6 },
    { el: 'N', x: 1.2,  y: 0.7, z: -0.1, color: '#3b82f6', radius: 1.5 },
    { el: 'C', x: 1.1,  y: -0.7, z: 0.0, color: '#64748b', radius: 1.6 },
    { el: 'C', x: -0.1, y: -1.3, z: 0.1, color: '#64748b', radius: 1.6 },
    { el: 'C', x: -1.2, y: -0.6, z: 0.0, color: '#64748b', radius: 1.6 },
    { el: 'O', x: 0.0,  y: 2.6, z: 0.2, color: '#ef4444', radius: 1.4 },
    { el: 'O', x: -2.3, y: -1.2, z: -0.1, color: '#ef4444', radius: 1.4 },
    { el: 'N', x: 2.2,  y: -1.5, z: 0.1, color: '#3b82f6', radius: 1.5 },
    { el: 'C', x: 1.7,  y: -2.7, z: 0.2, color: '#64748b', radius: 1.6 },
    { el: 'N', x: 0.3,  y: -2.6, z: 0.2, color: '#3b82f6', radius: 1.5 },
    { el: 'C', x: -2.4, y: 1.6, z: -0.2, color: '#22c55e', radius: 1.4 },
    { el: 'C', x: 2.5,  y: 1.4, z: -0.2, color: '#22c55e', radius: 1.4 }
  ];
  const bonds = [
    [0,1],[1,2],[2,3],[3,4],[4,5],[5,0],
    [1,6],[5,7],[3,8],[8,9],[9,10],[10,4],[0,11],[2,12]
  ];
  return { atoms, bonds };
}

function buildBenzene() {
  const atoms = [];
  const bonds = [];
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    atoms.push({ el: 'C', x: Math.cos(a) * 1.8, y: Math.sin(a) * 1.8, z: 0, color: '#64748b', radius: 1.6 });
    atoms.push({ el: 'H', x: Math.cos(a) * 3.1, y: Math.sin(a) * 3.1, z: 0, color: '#e2e8f0', radius: 1.1 });
    bonds.push([i * 2, i * 2 + 1]);
    bonds.push([i * 2, ((i + 1) % 6) * 2]);
  }
  return { atoms, bonds };
}

function buildDNA() {
  const atoms = [];
  const bonds = [];
  for (let i = 0; i < 14; i++) {
    const y = (i - 6.5) * 0.52;
    const a = i * 0.55;
    const idx = atoms.length;
    atoms.push({ el: 'P', x: Math.cos(a) * 2.1, y, z: Math.sin(a) * 2.1, color: '#f59e0b', radius: 1.5 });
    atoms.push({ el: 'N', x: Math.cos(a + Math.PI) * 2.1, y, z: Math.sin(a + Math.PI) * 2.1, color: '#38bdf8', radius: 1.5 });
    bonds.push([idx, idx + 1]);
    if (i > 0) {
      bonds.push([idx - 2, idx]);
      bonds.push([idx - 1, idx + 1]);
    }
  }
  return { atoms, bonds };
}

function buildBuckyball() {
  const atoms = [];
  const bonds = [];
  const count = 24;
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = golden * i;
    atoms.push({
      el: 'C',
      x: Math.cos(theta) * r * 2.8,
      y: y * 2.8,
      z: Math.sin(theta) * r * 2.8,
      color: '#10b981',
      radius: 1.35
    });
  }
  for (let i = 0; i < count; i++) {
    for (let j = i + 1; j < count; j++) {
      const d = Math.hypot(atoms[i].x - atoms[j].x, atoms[i].y - atoms[j].y, atoms[i].z - atoms[j].z);
      if (d < 2.2) bonds.push([i, j]);
    }
  }
  return { atoms, bonds };
}
