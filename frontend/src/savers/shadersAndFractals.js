// Particle Plumes, Warp Tunnels, Fractals & N-Body Cosmology:
// 1. flurry (Additive glowing plasma streams)
// 2. hyperspace (Relativistic starfield warp & nebula tunnel)
// 3. mandelbrot (Smooth Mandelbrot & Julia set fractal explorer)
// 4. galaxy (Colliding N-body spiral galaxies)
// 5. pyro (Multi-stage firework bursts)

export function createFlurry(canvas, getParams) {
  const ctx = canvas.getContext('2d');
  let particles = [];
  let t = 0;

  return {
    render(dt) {
      const p = getParams();
      const streams = Number(p.streams ?? 5);
      const speed = Number(p.speed ?? 1.0);
      const bloom = Number(p.bloom ?? 1.3);
      const preset = p.colorPreset || 'classic';

      t += dt * speed;
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2 + Math.cos(t * 0.7) * w * 0.14;
      const cy = h / 2 + Math.sin(t * 0.9) * h * 0.14;

      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(2, 3, 10, 0.12)';
      ctx.fillRect(0, 0, w, h);

      // Spawn new particles along each stream arm
      for (let s = 0; s < streams; s++) {
        const angle = t * 1.8 + (s * Math.PI * 2) / streams + Math.sin(t * 0.6 + s) * 0.8;
        const speedMag = (120 + Math.sin(t * 2 + s) * 45) * speed;
        let hue = (t * 28 + s * (360 / streams)) % 360;
        if (preset === 'fire') hue = 12 + (s * 14) % 45;
        if (preset === 'cyber') hue = s % 2 === 0 ? 188 : 312;
        if (preset === 'emerald') hue = 125 + (s * 12) % 40;

        particles.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speedMag + (Math.random() - 0.5) * 35,
          vy: Math.sin(angle) * speedMag + (Math.random() - 0.5) * 35,
          life: 1.0,
          hue,
          size: (18 + Math.random() * 24) * bloom
        });
      }

      if (particles.length > 520) {
        particles.splice(0, particles.length - 520);
      }

      ctx.globalCompositeOperation = 'lighter';
      for (let i = particles.length - 1; i >= 0; i--) {
        const pt = particles[i];
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.vx *= 0.988;
        pt.vy *= 0.988;
        pt.life -= dt * 0.58;
        if (pt.life <= 0) {
          particles.splice(i, 1);
          continue;
        }

        const r = pt.size * (1.2 - pt.life * 0.5);
        const grad = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, r);
        grad.addColorStop(0, `hsla(${pt.hue}, 100%, 82%, ${(pt.life * 0.48).toFixed(3)})`);
        grad.addColorStop(0.45, `hsla(${pt.hue}, 95%, 56%, ${(pt.life * 0.22).toFixed(3)})`);
        grad.addColorStop(1, `hsla(${pt.hue}, 95%, 40%, 0)`);

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    }
  };
}

export function createHyperspace(canvas, getParams) {
  const ctx = canvas.getContext('2d');
  let stars = [];
  let phase = 0;

  function ensureStars(count) {
    while (stars.length < count) {
      stars.push({
        x: (Math.random() - 0.5) * 2.4,
        y: (Math.random() - 0.5) * 2.4,
        z: 0.05 + Math.random() * 1.95,
        hue: 185 + Math.random() * 120
      });
    }
    if (stars.length > count) {
      stars.length = count;
    }
  }

  return {
    render(dt) {
      const p = getParams();
      const warpSpeed = Number(p.warpSpeed ?? 1.5);
      const starCount = Number(p.starCount ?? 800);
      const nebula = Number(p.nebulaIntensity ?? 0.8);
      const tunnelTwist = Number(p.tunnelTwist ?? 0.6);

      ensureStars(starCount);
      phase += dt * warpSpeed;

      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2 + Math.cos(phase * 0.5) * w * 0.08 * tunnelTwist;
      const cy = h / 2 + Math.sin(phase * 0.7) * h * 0.08 * tunnelTwist;

      ctx.fillStyle = 'rgba(3, 4, 14, 0.28)';
      ctx.fillRect(0, 0, w, h);

      // Cosmic Nebula Plasma Ribbons
      if (nebula > 0.05) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 3; i++) {
          const rad = Math.min(w, h) * (0.28 + i * 0.14);
          const nx = cx + Math.cos(phase * 0.6 + i * 2.1) * 70;
          const ny = cy + Math.sin(phase * 0.8 + i * 2.1) * 70;
          const grad = ctx.createRadialGradient(nx, ny, 10, nx, ny, rad);
          const hue = (phase * 25 + i * 95) % 360;
          grad.addColorStop(0, `hsla(${hue}, 90%, 60%, ${0.09 * nebula})`);
          grad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(nx, ny, rad, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      const fov = Math.min(w, h) * 0.55;
      ctx.lineCap = 'round';

      for (const s of stars) {
        const prevZ = s.z;
        s.z -= dt * 0.75 * warpSpeed;
        if (s.z <= 0.03) {
          s.x = (Math.random() - 0.5) * 2.4;
          s.y = (Math.random() - 0.5) * 2.4;
          s.z = 1.95;
          continue;
        }

        const twistAngle = (2.0 - s.z) * tunnelTwist * 0.45;
        const cosT = Math.cos(twistAngle);
        const sinT = Math.sin(twistAngle);
        const rx = s.x * cosT - s.y * sinT;
        const ry = s.x * sinT + s.y * cosT;

        const sx = cx + (rx / s.z) * fov;
        const sy = cy + (ry / s.z) * fov;
        const px = cx + (rx / prevZ) * fov;
        const py = cy + (ry / prevZ) * fov;

        const alpha = Math.min(1, (2.0 - s.z) * 0.75);
        ctx.strokeStyle = `hsla(${s.hue}, 95%, 82%, ${alpha.toFixed(2)})`;
        ctx.lineWidth = Math.max(1, (2.1 - s.z) * 1.8);
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(sx, sy);
        ctx.stroke();
      }
    }
  };
}

export function createMandelbrot(canvas, getParams) {
  const ctx = canvas.getContext('2d');
  const offscreen = document.createElement('canvas');
  const offCtx = offscreen.getContext('2d');
  let animTime = 0;

  // Famous Seahorse Valley target coordinates
  const targetReal = -0.7436438870371587;
  const targetImag = 0.13182590420531197;

  return {
    render(dt) {
      const p = getParams();
      const maxIter = Number(p.maxIterations ?? 128);
      const zoomSpeed = Number(p.zoomSpeed ?? 1.0);
      const mode = p.fractalType || 'julia-morph';
      const scheme = p.colorScheme || 'electric';

      animTime += dt * zoomSpeed;

      const w = canvas.width;
      const h = canvas.height;
      // Render at 1/3 resolution and upscale smoothly for 60fps real-time performance
      const rw = Math.max(160, Math.floor(w / 3.2));
      const rh = Math.max(90, Math.floor(h / 3.2));
      if (offscreen.width !== rw || offscreen.height !== rh) {
        offscreen.width = rw;
        offscreen.height = rh;
      }

      const img = offCtx.createImageData(rw, rh);
      const data = img.data;

      const aspect = rw / rh;
      const zoom = mode === 'mandelbrot'
        ? Math.pow(1.38, (animTime % 18))
        : 1.35 + 0.25 * Math.sin(animTime * 0.4);

      const jCr = -0.7269 + 0.045 * Math.cos(animTime * 0.55);
      const jCi = 0.1889 + 0.045 * Math.sin(animTime * 0.42);

      let ptr = 0;
      for (let py = 0; py < rh; py++) {
        const y0 = ((py / rh) - 0.5) * (2.6 / zoom);
        for (let px = 0; px < rw; px++) {
          const x0 = ((px / rw) - 0.5) * (2.6 * aspect / zoom);

          let zr, zi, cr, ci;
          if (mode === 'mandelbrot') {
            cr = targetReal + x0;
            ci = targetImag + y0;
            zr = 0;
            zi = 0;
          } else {
            zr = x0;
            zi = y0;
            cr = jCr;
            ci = jCi;
          }

          let iter = 0;
          let zr2 = zr * zr;
          let zi2 = zi * zi;
          while (zr2 + zi2 <= 4.0 && iter < maxIter) {
            zi = 2 * zr * zi + ci;
            zr = zr2 - zi2 + cr;
            zr2 = zr * zr;
            zi2 = zi * zi;
            iter++;
          }

          if (iter === maxIter) {
            data[ptr++] = 4;
            data[ptr++] = 6;
            data[ptr++] = 14;
            data[ptr++] = 255;
          } else {
            const t = (iter / maxIter) * 6.283 + animTime * 0.35;
            if (scheme === 'magma') {
              data[ptr++] = Math.floor(140 + 115 * Math.sin(t));
              data[ptr++] = Math.floor(70 + 85 * Math.sin(t - 1.1));
              data[ptr++] = Math.floor(30 + 40 * Math.cos(t));
            } else if (scheme === 'neon') {
              data[ptr++] = Math.floor(127 + 127 * Math.sin(t * 1.5));
              data[ptr++] = Math.floor(127 + 127 * Math.sin(t * 1.5 + 2.1));
              data[ptr++] = Math.floor(127 + 127 * Math.sin(t * 1.5 + 4.2));
            } else {
              // Electric Indigo
              data[ptr++] = Math.floor(80 + 95 * Math.sin(t));
              data[ptr++] = Math.floor(120 + 110 * Math.sin(t + 1.4));
              data[ptr++] = Math.floor(195 + 60 * Math.cos(t * 0.8));
            }
            data[ptr++] = 255;
          }
        }
      }

      offCtx.putImageData(img, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(offscreen, 0, 0, w, h);
    }
  };
}

export function createGalaxy(canvas, getParams) {
  const ctx = canvas.getContext('2d');
  let galaxies = [];
  let simTime = 0;

  function initGalaxies(count, starsPerGalaxy) {
    galaxies = [];
    for (let g = 0; g < count; g++) {
      const angle = (g * Math.PI * 2) / count;
      const dist = count === 1 ? 0 : 0.24;
      const gx = 0.5 + Math.cos(angle) * dist;
      const gy = 0.5 + Math.sin(angle) * dist;
      const vx = -Math.sin(angle) * 0.035;
      const vy = Math.cos(angle) * 0.035;
      const baseHue = (g * 135 + 200) % 360;

      const stars = [];
      for (let i = 0; i < starsPerGalaxy; i++) {
        const r = 0.015 + Math.pow(Math.random(), 1.5) * 0.18;
        const armAngle = Math.random() * Math.PI * 2;
        const orbitalV = Math.sqrt(0.0022 / Math.max(0.015, r));
        stars.push({
          x: gx + Math.cos(armAngle) * r,
          y: gy + Math.sin(armAngle) * r * 0.78,
          vx: vx - Math.sin(armAngle) * orbitalV,
          vy: vy + Math.cos(armAngle) * orbitalV * 0.78,
          hue: baseHue + (Math.random() - 0.5) * 40,
          size: 1.1 + Math.random() * 1.6
        });
      }

      galaxies.push({ x: gx, y: gy, vx, vy, mass: 0.0022, baseHue, stars });
    }
  }

  return {
    render(dt) {
      const p = getParams();
      const gCount = Number(p.galaxies ?? 2);
      const sCount = Number(p.starsPerGalaxy ?? 450);
      const speed = Number(p.speed ?? 1.0);
      const trails = Boolean(p.trails);

      if (galaxies.length !== gCount || (galaxies[0] && Math.abs(galaxies[0].stars.length - sCount) > 50)) {
        initGalaxies(gCount, sCount);
      }

      simTime += dt * speed;
      if (simTime > 42) {
        simTime = 0;
        initGalaxies(gCount, sCount);
      }

      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = trails ? 'rgba(3, 4, 12, 0.14)' : 'rgba(3, 4, 12, 0.45)';
      ctx.fillRect(0, 0, w, h);

      const step = dt * 0.55 * speed;

      // Update galactic cores
      for (let i = 0; i < galaxies.length; i++) {
        for (let j = i + 1; j < galaxies.length; j++) {
          const dx = galaxies[j].x - galaxies[i].x;
          const dy = galaxies[j].y - galaxies[i].y;
          const d2 = dx * dx + dy * dy + 0.006;
          const f = 0.0014 / d2;
          galaxies[i].vx += dx * f * step;
          galaxies[i].vy += dy * f * step;
          galaxies[j].vx -= dx * f * step;
          galaxies[j].vy -= dy * f * step;
        }
      }
      for (const g of galaxies) {
        g.x += g.vx * step;
        g.y += g.vy * step;
      }

      ctx.globalCompositeOperation = 'lighter';
      for (const g of galaxies) {
        // Draw core glow
        const cx = g.x * w;
        const cy = g.y * h;
        const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, 42);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.35, `hsla(${g.baseHue}, 95%, 65%, 0.55)`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, 42, 0, Math.PI * 2);
        ctx.fill();

        for (const st of g.stars) {
          for (const core of galaxies) {
            const dx = core.x - st.x;
            const dy = core.y - st.y;
            const d2 = dx * dx + dy * dy + 0.0025;
            const accel = core.mass / d2;
            st.vx += (dx / Math.sqrt(d2)) * accel * step;
            st.vy += (dy / Math.sqrt(d2)) * accel * step;
          }
          st.x += st.vx * step;
          st.y += st.vy * step;

          ctx.fillStyle = `hsla(${st.hue}, 90%, 75%, 0.85)`;
          ctx.fillRect(st.x * w, st.y * h, st.size, st.size);
        }
      }
      ctx.globalCompositeOperation = 'source-over';
    }
  };
}

export function createPyro(canvas, getParams) {
  const ctx = canvas.getContext('2d');
  let rockets = [];
  let sparks = [];

  return {
    render(dt) {
      const p = getParams();
      const freq = Number(p.frequency ?? 1.5);
      const count = Number(p.particlesPerBurst ?? 90);
      const gravity = Number(p.gravity ?? 1.0);

      const w = canvas.width;
      const h = canvas.height;

      ctx.fillStyle = 'rgba(4, 6, 14, 0.22)';
      ctx.fillRect(0, 0, w, h);

      if (Math.random() < dt * freq * 1.4 && rockets.length < 8) {
        rockets.push({
          x: w * (0.15 + Math.random() * 0.7),
          y: h,
          vx: (Math.random() - 0.5) * 60,
          vy: -(h * (0.55 + Math.random() * 0.35)),
          targetY: h * (0.16 + Math.random() * 0.36),
          hue: Math.floor(Math.random() * 360)
        });
      }

      ctx.globalCompositeOperation = 'lighter';

      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        r.x += r.vx * dt;
        r.y += r.vy * dt;
        r.vy += 180 * gravity * dt;

        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.arc(r.x, r.y, 3, 0, Math.PI * 2);
        ctx.fill();

        if (r.y <= r.targetY || r.vy >= -20) {
          for (let s = 0; s < count; s++) {
            const a = Math.random() * Math.PI * 2;
            const spd = 40 + Math.random() * 220;
            sparks.push({
              x: r.x,
              y: r.y,
              vx: Math.cos(a) * spd,
              vy: Math.sin(a) * spd,
              hue: (r.hue + (Math.random() - 0.5) * 50 + 360) % 360,
              life: 1.0,
              decay: 0.45 + Math.random() * 0.45
            });
          }
          rockets.splice(i, 1);
        }
      }

      for (let i = sparks.length - 1; i >= 0; i--) {
        const sp = sparks[i];
        sp.x += sp.vx * dt;
        sp.y += sp.vy * dt;
        sp.vx *= 0.985;
        sp.vy = sp.vy * 0.985 + 140 * gravity * dt;
        sp.life -= sp.decay * dt;
        if (sp.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        ctx.fillStyle = `hsla(${sp.hue}, 100%, 70%, ${sp.life.toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, 2.2 * sp.life + 0.6, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalCompositeOperation = 'source-over';
    }
  };
}
