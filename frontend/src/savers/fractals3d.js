// 3D Fractal Odyssey: Recursive Polyhedra, Sponge Tunnels, Mandelbulb & Apollonian Zoom Screensaver
// Renders a progression of 3D fractals (Menger Sponge, 3D Sierpinski Tetrix, Power-8 Mandelbulb,
// Mosely Snowflake Sponge, 3D Apollonian Sphere Packing, Jerusalem Cube, Koch Octahedron Flake,
// and 3D Mandelbox) with live recursive subdivision, exponential self-similar camera zoom,
// 3D SO(3) orbital rotation, ambient occlusion shading, and a Hausdorff dimension HUD.

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0 || 1), 0, 1);
  return t * t * (3 - 2 * t);
}

function rotate3D(p, yaw, pitch, roll) {
  let { x, y, z } = p;

  if (roll) {
    const cr = Math.cos(roll);
    const sr = Math.sin(roll);
    const nx = x * cr - y * sr;
    const ny = x * sr + y * cr;
    x = nx;
    y = ny;
  }

  if (pitch) {
    const cp = Math.cos(pitch);
    const sp = Math.sin(pitch);
    const ny = y * cp - z * sp;
    const nz = y * sp + z * cp;
    y = ny;
    z = nz;
  }

  if (yaw) {
    const cy = Math.cos(yaw);
    const sy = Math.sin(yaw);
    const nx = x * cy - z * sy;
    const nz = x * sy + z * cy;
    x = nx;
    z = nz;
  }

  return { x, y, z };
}

function normalize3(v) {
  const len = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

function sub3(a, b) {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function cross3(a, b) {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x
  };
}

function dot3(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

const PALETTES = {
  quantum_cyan: {
    name: 'Quantum Cyan & Solar Gold',
    bgTop: '#040814',
    bgBot: '#0a1428',
    stops: [
      { r: 30, g: 64, b: 175 },
      { r: 14, g: 165, b: 233 },
      { r: 45, g: 212, b: 191 },
      { r: 250, g: 204, b: 21 }
    ],
    accentHex: '#38bdf8',
    accentRgb: { r: 56, g: 189, b: 248 }
  },
  emerald_nebula: {
    name: 'Matrix Emerald & Cyber Mint',
    bgTop: '#030d09',
    bgBot: '#071f16',
    stops: [
      { r: 6, g: 95, b: 70 },
      { r: 16, g: 185, b: 129 },
      { r: 110, g: 231, b: 183 },
      { r: 163, g: 230, b: 53 }
    ],
    accentHex: '#10b981',
    accentRgb: { r: 16, g: 185, b: 129 }
  },
  crimson_gold: {
    name: 'Magma Crimson & Imperial Gold',
    bgTop: '#0e0508',
    bgBot: '#1f0b12',
    stops: [
      { r: 136, g: 19, b: 55 },
      { r: 225, g: 29, b: 72 },
      { r: 249, g: 115, b: 22 },
      { r: 253, g: 224, b: 71 }
    ],
    accentHex: '#f59e0b',
    accentRgb: { r: 245, g: 158, b: 11 }
  },
  ultraviolet: {
    name: 'Ultraviolet & Hyper Magenta',
    bgTop: '#090414',
    bgBot: '#160b2e',
    stops: [
      { r: 88, g: 28, b: 135 },
      { r: 168, g: 85, b: 247 },
      { r: 236, g: 72, b: 153 },
      { r: 103, g: 232, b: 249 }
    ],
    accentHex: '#c084fc',
    accentRgb: { r: 192, g: 132, b: 252 }
  }
};

function samplePalette(t, paletteKey) {
  const pal = PALETTES[paletteKey] || PALETTES.quantum_cyan;
  const stops = pal.stops;
  const u = clamp(t, 0, 1) * (stops.length - 1);
  const idx = Math.min(stops.length - 2, Math.floor(u));
  const frac = u - idx;
  const c0 = stops[idx];
  const c1 = stops[idx + 1];
  return {
    r: Math.round(lerp(c0.r, c1.r, frac)),
    g: Math.round(lerp(c0.g, c1.g, frac)),
    b: Math.round(lerp(c0.b, c1.b, frac))
  };
}

const FRACTAL_CATALOG = [
  {
    id: 'menger_sponge',
    name: 'Menger Sponge (3D Universal Curve)',
    badge: 'IFS SUBDIVISION • CANTOR TUNNEL TOPOLOGY',
    formula: 'M_{n+1} = ⋃_{(i,j,k) ∈ {-1,0,1}³, |i|+|j|+|k| > 1} (M_n / 3 + (i,j,k)/3)',
    hausdorff: 'D_H = ln(20) / ln(3) ≈ 2.726833',
    selfSimilarScale: 3.0,
    focalAttractor: { x: 1.0, y: 1.0, z: 1.0 }
  },
  {
    id: 'sierpinski_tetrix',
    name: '3D Sierpiński Tetrix (Tetrahedral Gasket)',
    badge: 'TETRAHEDRAL IFS • OCTAHEDRAL CENTRAL VOIDS',
    formula: 'T_{n+1} = ⋃_{k=1}^4 (T_n / 2 + v_k / 2),   V(T_n) = (4/8)^n V_0',
    hausdorff: 'D_H = ln(4) / ln(2) = 2.000000',
    selfSimilarScale: 2.0,
    focalAttractor: { x: 0.0, y: 1.15, z: 0.0 }
  },
  {
    id: 'mandelbulb_8',
    name: '3D Mandelbulb (Power-8 Triplex Algebra)',
    badge: 'WHITE-NYLANDER SPHERICAL TRIPLEX • POWER n = 8',
    formula: 'v ↦ v^8 + c,   ⟨r,θ,ϕ⟩^8 = r^8 ⟨sin(8θ)cos(8ϕ), sin(8θ)sin(8ϕ), cos(8θ)⟩',
    hausdorff: 'D_H ≈ 2.891 (Boundary Corona)',
    selfSimilarScale: 2.6,
    focalAttractor: { x: 0.0, y: 0.88, z: 0.42 }
  },
  {
    id: 'mosely_snowflake',
    name: 'Mosely 3D Snowflake Sponge',
    badge: 'CRYSTALLINE DENDRITIC SPONGE • 18-SUBCUBE IFS',
    formula: 'S_{n+1} = ⋃_{0 < |i|+|j|+|k| < 3} (S_n / 3 + (i,j,k)/3)',
    hausdorff: 'D_H = ln(18) / ln(3) ≈ 2.630930',
    selfSimilarScale: 3.0,
    focalAttractor: { x: 1.0, y: 1.0, z: 0.0 }
  },
  {
    id: 'apollonian_3d',
    name: '3D Apollonian Gasket (Soddy Kissing Spheres)',
    badge: 'DESCARTES-SODDY 3D SPHERE PACKING • MÖBIUS INVARIANT',
    formula: '2(∑ k_i²) = (∑ k_i)²   (5 Mutually Tangent Spheres in ℝ³)',
    hausdorff: 'D_H ≈ 2.473946 (3D Soddy Packing)',
    selfSimilarScale: 2.4,
    focalAttractor: { x: 0.52, y: 0.52, z: 0.52 }
  },
  {
    id: 'octahedron_flake',
    name: 'Sierpiński-Koch 3D Octahedral Flake',
    badge: '6-VERTEX OCTAHEDRAL SUBDIVISION • CUBIC DUAL',
    formula: 'O_{n+1} = ⋃_{k=1}^6 (O_n / 2 + ±e_k / 2)',
    hausdorff: 'D_H = ln(6) / ln(2) ≈ 2.584963',
    selfSimilarScale: 2.0,
    focalAttractor: { x: 0.0, y: 1.15, z: 0.0 }
  },
  {
    id: 'mandelbox_fold',
    name: '3D Mandelbox (Box-Fold + Sphere-Fold Lattice)',
    badge: 'TOM LOWE 2010 • CONFORMAL BOX/BALL FOLDING',
    formula: 'z_{n+1} = s · ballFold(r_min, 1, boxFold(z_n)) + c   (s = 2.15)',
    hausdorff: 'D_H ≈ 2.845 (Folded Filigree)',
    selfSimilarScale: 2.5,
    focalAttractor: { x: 0.78, y: 0.78, z: 0.78 }
  }
];

// Cube 6 faces (unit half-size = s around center cx, cy, cz)
function appendCubeFaces(outFaces, cx, cy, cz, s, depthNorm, aoFactor = 1.0) {
  const v = [
    { x: cx - s, y: cy - s, z: cz - s },
    { x: cx + s, y: cy - s, z: cz - s },
    { x: cx + s, y: cy + s, z: cz - s },
    { x: cx - s, y: cy + s, z: cz - s },
    { x: cx - s, y: cy - s, z: cz + s },
    { x: cx + s, y: cy - s, z: cz + s },
    { x: cx + s, y: cy + s, z: cz + s },
    { x: cx - s, y: cy + s, z: cz + s }
  ];
  const quads = [
    [4, 5, 6, 7],
    [1, 0, 3, 2],
    [3, 7, 6, 2],
    [0, 1, 5, 4],
    [0, 4, 7, 3],
    [5, 1, 2, 6]
  ];
  for (let i = 0; i < 6; i++) {
    const q = quads[i];
    outFaces.push({
      verts: [v[q[0]], v[q[1]], v[q[2]], v[q[3]]],
      depthNorm,
      aoFactor
    });
  }
}

// Regular Tetrahedron 4 triangular faces around (cx, cy, cz) with radius s
function appendTetraFaces(outFaces, cx, cy, cz, s, depthNorm, aoFactor = 1.0) {
  const v0 = { x: cx, y: cy + s, z: cz };
  const v1 = { x: cx - s * 0.9428, y: cy - s * 0.3333, z: cz - s * 0.5443 };
  const v2 = { x: cx + s * 0.9428, y: cy - s * 0.3333, z: cz - s * 0.5443 };
  const v3 = { x: cx, y: cy - s * 0.3333, z: cz + s * 1.0887 };

  outFaces.push(
    { verts: [v0, v1, v2], depthNorm, aoFactor },
    { verts: [v0, v2, v3], depthNorm, aoFactor },
    { verts: [v0, v3, v1], depthNorm, aoFactor },
    { verts: [v1, v3, v2], depthNorm, aoFactor }
  );
}

// Regular Octahedron 8 triangular faces around (cx, cy, cz) with half-extent s
function appendOctaFaces(outFaces, cx, cy, cz, s, depthNorm, aoFactor = 1.0) {
  const top = { x: cx, y: cy + s, z: cz };
  const bot = { x: cx, y: cy - s, z: cz };
  const px = { x: cx + s, y: cy, z: cz };
  const nx = { x: cx - s, y: cy, z: cz };
  const pz = { x: cx, y: cy, z: cz + s };
  const nz = { x: cx, y: cy, z: cz - s };

  outFaces.push(
    { verts: [top, pz, px], depthNorm, aoFactor },
    { verts: [top, px, nz], depthNorm, aoFactor },
    { verts: [top, nz, nx], depthNorm, aoFactor },
    { verts: [top, nx, pz], depthNorm, aoFactor },
    { verts: [bot, px, pz], depthNorm, aoFactor },
    { verts: [bot, nz, px], depthNorm, aoFactor },
    { verts: [bot, nx, nz], depthNorm, aoFactor },
    { verts: [bot, pz, nx], depthNorm, aoFactor }
  );
}

// Generate Menger Sponge or Mosely Snowflake Sponge adaptive hierarchy
// Subdivides deeper near the zoom focal path so we get multi-level detail without 20^4 = 160,000 cubes
function generateSpongeFaces(isMosely, maxDepth, morphFrac, focusPt) {
  const faces = [];

  function recurse(cx, cy, cz, halfSize, level) {
    const distToFocus = Math.hypot(cx - focusPt.x, cy - focusPt.y, cz - focusPt.z);
    // Allow deep level (level === maxDepth) near the zoom focal corridor
    const effectiveMax = distToFocus < halfSize * 3.1 ? maxDepth : Math.max(1, maxDepth - 1);

    if (level >= effectiveMax) {
      const ao = clamp(0.62 + 0.38 * (Math.hypot(cx, cy, cz) / 1.75), 0.45, 1.05);
      appendCubeFaces(faces, cx, cy, cz, halfSize * 0.96, level / Math.max(1, maxDepth), ao);
      return;
    }

    const childHalf = halfSize / 3;
    const isTransitionLevel = level === effectiveMax - 1;
    const spread = isTransitionLevel ? lerp(0.0, 2.0, smoothstep(0, 1, morphFrac)) : 2.0;

    for (let ix = -1; ix <= 1; ix++) {
      for (let iy = -1; iy <= 1; iy++) {
        for (let iz = -1; iz <= 1; iz++) {
          const sumAbs = Math.abs(ix) + Math.abs(iy) + Math.abs(iz);
          if (isMosely) {
            // Mosely Snowflake: remove the 8 corners (sumAbs === 3) and the center (sumAbs === 0)
            if (sumAbs === 0 || sumAbs === 3) continue;
          } else {
            // Menger Sponge: remove face centers and center (sumAbs <= 1)
            if (sumAbs <= 1) continue;
          }
          const nx = cx + ix * childHalf * spread;
          const ny = cy + iy * childHalf * spread;
          const nz = cz + iz * childHalf * spread;
          recurse(nx, ny, nz, childHalf, level + 1);
        }
      }
    }
  }

  recurse(0, 0, 0, 1.25, 0);
  return faces;
}

// Generate 3D Sierpinski Tetrahedron (Tetrix) adaptive hierarchy
function generateSierpinskiTetrixFaces(maxDepth, morphFrac, focusPt) {
  const faces = [];
  const dirs = [
    { x: 0, y: 1.0, z: 0 },
    { x: -0.9428, y: -0.3333, z: -0.5443 },
    { x: 0.9428, y: -0.3333, z: -0.5443 },
    { x: 0, y: -0.3333, z: 1.0887 }
  ];

  function recurse(cx, cy, cz, scale, level) {
    const distToFocus = Math.hypot(cx - focusPt.x, cy - focusPt.y, cz - focusPt.z);
    const effectiveMax = distToFocus < scale * 2.8 ? maxDepth + 1 : maxDepth;

    if (level >= effectiveMax) {
      const ao = clamp(0.58 + 0.42 * (Math.hypot(cx, cy, cz) / 1.5), 0.5, 1.05);
      appendTetraFaces(faces, cx, cy, cz, scale * 0.98, level / (maxDepth + 1), ao);
      return;
    }

    const childScale = scale * 0.5;
    const isTransition = level === effectiveMax - 1;
    const expand = isTransition ? smoothstep(0, 1, morphFrac) : 1.0;

    for (let k = 0; k < 4; k++) {
      const d = dirs[k];
      recurse(
        cx + d.x * childScale * expand,
        cy + d.y * childScale * expand,
        cz + d.z * childScale * expand,
        childScale,
        level + 1
      );
    }
  }

  recurse(0, 0, 0, 1.55, 0);
  return faces;
}

// Generate 3D Koch / Sierpinski Octahedral Flake
function generateOctaFlakeFaces(maxDepth, morphFrac, focusPt) {
  const faces = [];
  const dirs = [
    { x: 0, y: 1, z: 0 },
    { x: 0, y: -1, z: 0 },
    { x: 1, y: 0, z: 0 },
    { x: -1, y: 0, z: 0 },
    { x: 0, y: 0, z: 1 },
    { x: 0, y: 0, z: -1 }
  ];

  function recurse(cx, cy, cz, scale, level) {
    const distToFocus = Math.hypot(cx - focusPt.x, cy - focusPt.y, cz - focusPt.z);
    const effectiveMax = distToFocus < scale * 2.6 ? maxDepth : Math.max(1, maxDepth - 1);

    if (level >= effectiveMax) {
      const ao = clamp(0.55 + 0.45 * (Math.hypot(cx, cy, cz) / 1.5), 0.5, 1.05);
      appendOctaFaces(faces, cx, cy, cz, scale * 0.96, level / Math.max(1, maxDepth), ao);
      return;
    }

    const childScale = scale * 0.5;
    const isTransition = level === effectiveMax - 1;
    const expand = isTransition ? smoothstep(0, 1, morphFrac) : 1.0;

    for (let k = 0; k < 6; k++) {
      const d = dirs[k];
      recurse(
        cx + d.x * childScale * expand,
        cy + d.y * childScale * expand,
        cz + d.z * childScale * expand,
        childScale,
        level + 1
      );
    }
  }

  recurse(0, 0, 0, 1.48, 0);
  return faces;
}

// Evaluate Mandelbulb Power-8 distance estimator and surface shell
function mandelbulbRadiusAtAngle(theta, phi, power, maxIter) {
  // Raymarch outward/inward along unit direction (sin(theta)cos(phi), cos(theta), sin(theta)sin(phi))
  const dx = Math.sin(theta) * Math.cos(phi);
  const dy = Math.cos(theta);
  const dz = Math.sin(theta) * Math.sin(phi);

  let lo = 0.55;
  let hi = 1.28;
  let lastTrap = 0.5;

  for (let b = 0; b < 7; b++) {
    const mid = (lo + hi) * 0.5;
    const cx = dx * mid;
    const cy = dy * mid;
    const cz = dz * mid;

    let zx = cx;
    let zy = cy;
    let zz = cz;
    let escaped = false;
    let minOrbit = 10.0;

    for (let i = 0; i < maxIter; i++) {
      const r = Math.hypot(zx, zy, zz);
      if (r < minOrbit) minOrbit = r;
      if (r > 2.0) {
        escaped = true;
        break;
      }
      if (r < 1e-6) break;
      const th = Math.acos(clamp(zy / r, -1, 1)) * power;
      const ph = Math.atan2(zz, zx) * power;
      const rn = Math.pow(r, power);
      zx = rn * Math.sin(th) * Math.cos(ph) + cx;
      zy = rn * Math.cos(th) + cy;
      zz = rn * Math.sin(th) * Math.sin(ph) + cz;
    }

    lastTrap = clamp(minOrbit, 0, 1);
    if (escaped) {
      hi = mid;
    } else {
      lo = mid;
    }
  }

  const rSurf = (lo + hi) * 0.5;
  return {
    x: dx * rSurf,
    y: dy * rSurf,
    z: dz * rSurf,
    rSurf,
    trap: lastTrap
  };
}

function generateMandelbulbFaces(detailLevel, morphFrac) {
  const nTheta = 16 + detailLevel * 5;
  const nPhi = 28 + detailLevel * 8;
  const power = lerp(4.0, 8.0, smoothstep(0, 1, morphFrac * 0.4 + 0.6));
  const maxIter = Math.min(7, 2 + detailLevel);

  const grid = [];
  for (let i = 0; i <= nTheta; i++) {
    const theta = (i / nTheta) * Math.PI;
    const row = [];
    for (let j = 0; j <= nPhi; j++) {
      const phi = (j / nPhi) * Math.PI * 2;
      row.push(mandelbulbRadiusAtAngle(theta, phi, power, maxIter));
    }
    grid.push(row);
  }

  const faces = [];
  for (let i = 0; i < nTheta; i++) {
    for (let j = 0; j < nPhi; j++) {
      const v00 = grid[i][j];
      const v10 = grid[i + 1][j];
      const v11 = grid[i + 1][j + 1];
      const v01 = grid[i][j + 1];
      const avgR = (v00.rSurf + v10.rSurf + v11.rSurf + v01.rSurf) * 0.25;
      const depthNorm = clamp((avgR - 0.68) / 0.48, 0, 1);
      const ao = clamp(0.45 + depthNorm * 0.6, 0.42, 1.05);
      faces.push({
        verts: [v00, v10, v11, v01],
        depthNorm,
        aoFactor: ao
      });
    }
  }
  return faces;
}

// Generate 3D Apollonian Gasket (Soddy Kissing Spheres)
function generateApollonianSpheres(maxDepth, morphFrac) {
  const spheres = [];
  const tetraDirs = [
    { x: 1, y: 1, z: 1 },
    { x: 1, y: -1, z: -1 },
    { x: -1, y: 1, z: -1 },
    { x: -1, y: -1, z: 1 }
  ].map(normalize3);

  const octDirs = [
    { x: 1, y: 0, z: 0 },
    { x: -1, y: 0, z: 0 },
    { x: 0, y: 1, z: 0 },
    { x: 0, y: -1, z: 0 },
    { x: 0, y: 0, z: 1 },
    { x: 0, y: 0, z: -1 }
  ];

  function addPack(cx, cy, cz, rad, level) {
    spheres.push({
      x: cx,
      y: cy,
      z: cz,
      r: rad,
      depthNorm: level / Math.max(1, maxDepth + 1)
    });

    if (level >= maxDepth) return;

    const isTransition = level === maxDepth - 1;
    const grow = isTransition ? smoothstep(0, 1, morphFrac) : 1.0;
    if (grow <= 0.02) return;

    // 4 primary Soddy spheres + 6 octahedral interstitial kissing spheres
    const rPrimary = rad * 0.44 * grow;
    const distPrimary = rad * 0.68;
    for (let i = 0; i < 4; i++) {
      const d = tetraDirs[i];
      addPack(cx + d.x * distPrimary, cy + d.y * distPrimary, cz + d.z * distPrimary, rPrimary, level + 1);
    }

    const rInter = rad * 0.24 * grow;
    const distInter = rad * 0.86;
    for (let i = 0; i < 6; i++) {
      const d = octDirs[i];
      addPack(cx + d.x * distInter, cy + d.y * distInter, cz + d.z * distInter, rInter, level + 1);
    }
  }

  addPack(0, 0, 0, 1.18, 0);
  return spheres;
}

// Generate 3D Mandelbox folded lattice
function generateMandelboxFaces(maxDepth, morphFrac, focusPt) {
  const faces = [];

  function boxFoldCoord(v) {
    if (v > 1) return 2 - v;
    if (v < -1) return -2 - v;
    return v;
  }

  function recurse(cx, cy, cz, halfSize, level) {
    const distToFocus = Math.hypot(cx - focusPt.x, cy - focusPt.y, cz - focusPt.z);
    const effectiveMax = distToFocus < halfSize * 2.9 ? maxDepth : Math.max(1, maxDepth - 1);

    if (level >= effectiveMax) {
      const r = Math.hypot(cx, cy, cz);
      const ao = clamp(0.52 + 0.48 * (r / 1.75), 0.48, 1.05);
      appendCubeFaces(faces, cx, cy, cz, halfSize * 0.9, clamp(r / 1.65, 0, 1), ao);
      return;
    }

    const childHalf = halfSize * 0.36;
    const isTransition = level === effectiveMax - 1;
    const expand = isTransition ? smoothstep(0, 1, morphFrac) : 1.0;

    // 8 folded corners + 6 folded face struts
    for (let ix = -1; ix <= 1; ix++) {
      for (let iy = -1; iy <= 1; iy++) {
        for (let iz = -1; iz <= 1; iz++) {
          const sumAbs = Math.abs(ix) + Math.abs(iy) + Math.abs(iz);
          if (sumAbs !== 3 && sumAbs !== 1) continue;
          const rawX = cx + ix * halfSize * 0.66 * expand;
          const rawY = cy + iy * halfSize * 0.66 * expand;
          const rawZ = cz + iz * halfSize * 0.66 * expand;
          const fx = lerp(rawX, boxFoldCoord(rawX * 1.15) * 0.88, 0.35);
          const fy = lerp(rawY, boxFoldCoord(rawY * 1.15) * 0.88, 0.35);
          const fz = lerp(rawZ, boxFoldCoord(rawZ * 1.15) * 0.88, 0.35);
          recurse(fx, fy, fz, childHalf, level + 1);
        }
      }
    }
  }

  recurse(0, 0, 0, 1.18, 0);
  return faces;
}

export function createFractals3D(canvas, getParams) {
  const ctx = canvas.getContext('2d');
  let width = canvas.width || 1280;
  let height = canvas.height || 720;

  let simTime = 0;
  let stageElapsed = 0;
  let currentIdx = 0;
  let lastPreset = 'cycle';

  // Background ambient 3D star/fractal dust motes
  const motes = [];
  for (let i = 0; i < 56; i++) {
    motes.push({
      x: Math.sin(i * 19.3) * 3.2,
      y: Math.cos(i * 31.7) * 3.2,
      z: Math.sin(i * 47.1) * 3.2,
      size: 1.0 + (i % 3) * 0.6,
      tint: (i % 10) / 10
    });
  }

  function resize(w, h) {
    width = w || canvas.width || 1280;
    height = h || canvas.height || 720;
  }

  function drawBackground(paletteKey) {
    const pal = PALETTES[paletteKey] || PALETTES.quantum_cyan;
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, pal.bgTop);
    grad.addColorStop(1, pal.bgBot);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    const radial = ctx.createRadialGradient(
      width * 0.5,
      height * 0.5,
      12,
      width * 0.5,
      height * 0.5,
      Math.max(width, height) * 0.62
    );
    const { r, g, b } = pal.accentRgb;
    radial.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.14)`);
    radial.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, 0.04)`);
    radial.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, width, height);
  }

  function project3D(pt, focusOffset, zoomFactor, yaw, pitch, roll, fovScale) {
    // Shift toward the self-similar attractor as zoom increases, then rotate and scale
    const centered = {
      x: (pt.x - focusOffset.x) * zoomFactor,
      y: (pt.y - focusOffset.y) * zoomFactor,
      z: (pt.z - focusOffset.z) * zoomFactor
    };
    const r = rotate3D(centered, yaw, pitch, roll);
    const camDist = 4.6;
    const zCam = camDist - r.z;
    if (zCam <= 0.22) return null;
    const persp = fovScale / zCam;
    return {
      x: width * 0.5 + r.x * persp,
      y: height * 0.5 - r.y * persp,
      z: r.z,
      zCam,
      persp,
      r3: r
    };
  }

  function renderHud(fractal, paletteKey, recursionDepth, zoomMagnification, stageProgress) {
    const pal = PALETTES[paletteKey] || PALETTES.quantum_cyan;
    const { r, g, b } = pal.accentRgb;

    ctx.save();
    const padX = 22;
    const padY = 20;
    const boxW = Math.min(545, width - 44);
    const boxH = 126;

    ctx.fillStyle = 'rgba(5, 10, 22, 0.78)';
    ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.42)`;
    ctx.lineWidth = 1.2;

    if (typeof ctx.roundRect === 'function') {
      ctx.beginPath();
      ctx.roundRect(padX, padY, boxW, boxH, 10);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillRect(padX, padY, boxW, boxH);
      ctx.strokeRect(padX, padY, boxW, boxH);
    }

    ctx.fillStyle = pal.accentHex;
    ctx.font = '700 15px "Inter", "Segoe UI", sans-serif';
    ctx.fillText(fractal.name, padX + 14, padY + 24);

    ctx.fillStyle = 'rgba(186, 230, 253, 0.92)';
    ctx.font = '600 10.5px "JetBrains Mono", "Fira Code", monospace';
    ctx.fillText(fractal.badge, padX + 14, padY + 43);

    ctx.fillStyle = 'rgba(241, 245, 249, 0.95)';
    ctx.font = '500 11px "JetBrains Mono", "Fira Code", monospace';
    ctx.fillText(fractal.formula, padX + 14, padY + 65);

    ctx.fillStyle = 'rgba(148, 163, 184, 0.92)';
    ctx.font = '500 10.5px "JetBrains Mono", "Fira Code", monospace';
    ctx.fillText(
      `${fractal.hausdorff}   |   Subdivision Level k = ${recursionDepth}   |   Zoom: ${zoomMagnification.toFixed(1)}×`,
      padX + 14,
      padY + 86
    );

    // Progression bar inside HUD
    const barX = padX + 14;
    const barY = padY + 102;
    const barW = boxW - 28;
    const barH = 6;
    ctx.fillStyle = 'rgba(30, 41, 59, 0.85)';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = pal.accentHex;
    ctx.fillRect(barX, barY, barW * clamp(stageProgress, 0, 1), barH);

    ctx.restore();
  }

  function render(dt = 0.016) {
    const p = (typeof getParams === 'function' ? getParams() : {}) || {};
    const fractalPreset = String(p.fractalType || 'cycle');
    const zoomSpeed = clamp(Number(p.zoomSpeed ?? 1.0), 0.25, 3.0);
    const rotSpeed = clamp(Number(p.rotSpeed ?? 1.0), 0.1, 3.0);
    const cycleSeconds = clamp(Number(p.cycleSeconds ?? 14), 6, 45);
    const maxDetail = clamp(Math.round(Number(p.maxDetail ?? 2)), 1, 3);
    const renderStyle = String(p.renderStyle || 'shaded_crystal');
    const paletteKey = String(p.palette || 'quantum_cyan');
    const showHud = p.showHud !== false;

    const safeDt = clamp(dt, 0.001, 0.1);
    simTime += safeDt * rotSpeed;
    stageElapsed += safeDt * zoomSpeed;

    if (fractalPreset !== lastPreset) {
      lastPreset = fractalPreset;
      stageElapsed = 0;
      if (fractalPreset !== 'cycle' && fractalPreset !== 'random') {
        const idx = FRACTAL_CATALOG.findIndex((f) => f.id === fractalPreset);
        if (idx !== -1) currentIdx = idx;
      }
    }

    if (fractalPreset === 'cycle' || fractalPreset === 'random') {
      if (stageElapsed >= cycleSeconds) {
        stageElapsed = 0;
        if (fractalPreset === 'random') {
          currentIdx =
            (currentIdx + 1 + Math.floor(Math.abs(Math.sin(simTime * 17.3)) * (FRACTAL_CATALOG.length - 1))) %
            FRACTAL_CATALOG.length;
        } else {
          currentIdx = (currentIdx + 1) % FRACTAL_CATALOG.length;
        }
      }
    } else {
      const idx = FRACTAL_CATALOG.findIndex((f) => f.id === fractalPreset);
      if (idx !== -1) currentIdx = idx;
      if (stageElapsed >= cycleSeconds) {
        stageElapsed = stageElapsed % cycleSeconds;
      }
    }

    const fractal = FRACTAL_CATALOG[currentIdx] || FRACTAL_CATALOG[0];
    const stageProgress = clamp(stageElapsed / cycleSeconds, 0, 1);

    // Subdivision & Exponential Zoom progression:
    // 0.00..0.42: Subdivision unfolds across levels (1 -> maxDetail + 1)
    // 0.25..1.00: Exponential camera zoom into the self-similar focal attractor (1.0x -> 64x+)
    const subdivContinuous = clamp(stageProgress * 2.1, 0.15, 1.0) * maxDetail;
    const activeDepth = Math.max(1, Math.min(maxDetail, Math.ceil(subdivContinuous)));
    const morphFrac = subdivContinuous - Math.floor(subdivContinuous) || 1.0;

    const zoomPhase = smoothstep(0.12, 0.98, stageProgress);
    // Visual zoom factor for 3D camera + exponential display magnification
    const zoomFactor = Math.pow(fractal.selfSimilarScale || 2.5, zoomPhase * 1.45);
    const displayMagnification = Math.pow(fractal.selfSimilarScale || 2.5, zoomPhase * 3.8);

    const focusBlend = smoothstep(0.18, 0.92, stageProgress) * 0.62;
    const focusOffset = {
      x: fractal.focalAttractor.x * focusBlend,
      y: fractal.focalAttractor.y * focusBlend,
      z: fractal.focalAttractor.z * focusBlend
    };

    const yaw = simTime * 0.52;
    const pitch = Math.sin(simTime * 0.37) * 0.58 + 0.28;
    const roll = Math.cos(simTime * 0.29) * 0.34;
    const fovScale = Math.min(width, height) * 0.95;

    // 1. Background
    drawBackground(paletteKey);

    // 2. Ambient 3D fractal dust motes
    for (let i = 0; i < motes.length; i++) {
      const m = motes[i];
      const mp = project3D(m, { x: 0, y: 0, z: 0 }, 1.0 + zoomPhase * 0.35, yaw * 0.6, pitch * 0.6, roll * 0.6, fovScale);
      if (!mp || mp.x < 0 || mp.x > width || mp.y < 0 || mp.y > height) continue;
      const col = samplePalette(m.tint, paletteKey);
      ctx.fillStyle = `rgba(${col.r}, ${col.g}, ${col.b}, 0.24)`;
      ctx.beginPath();
      ctx.arc(mp.x, mp.y, m.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Render 3D Apollonian Kissing Spheres OR Polyhedral/Manifold 3D Fractal
    if (fractal.id === 'apollonian_3d') {
      const spheres = generateApollonianSpheres(activeDepth + 1, morphFrac);
      const projectedSpheres = [];
      for (let i = 0; i < spheres.length; i++) {
        const sp = spheres[i];
        const pp = project3D(sp, focusOffset, zoomFactor, yaw, pitch, roll, fovScale);
        if (!pp) continue;
        const screenR = sp.r * zoomFactor * pp.persp;
        if (screenR < 1.2 || screenR > Math.max(width, height) * 0.95) continue;
        projectedSpheres.push({
          ...pp,
          screenR,
          depthNorm: sp.depthNorm
        });
      }

      projectedSpheres.sort((a, b) => a.z - b.z);

      for (let i = 0; i < projectedSpheres.length; i++) {
        const s = projectedSpheres[i];
        const col = samplePalette(s.depthNorm, paletteKey);

        if (renderStyle === 'neon_holo') {
          ctx.fillStyle = `rgba(${col.r}, ${col.g}, ${col.b}, 0.22)`;
          ctx.strokeStyle = `rgba(${col.r}, ${col.g}, ${col.b}, 0.88)`;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.screenR, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        } else {
          const grad = ctx.createRadialGradient(
            s.x - s.screenR * 0.34,
            s.y - s.screenR * 0.34,
            s.screenR * 0.08,
            s.x,
            s.y,
            s.screenR
          );
          grad.addColorStop(0, `rgb(${Math.min(255, col.r + 75)}, ${Math.min(255, col.g + 75)}, ${Math.min(255, col.b + 75)})`);
          grad.addColorStop(0.55, `rgb(${col.r}, ${col.g}, ${col.b})`);
          grad.addColorStop(1, `rgb(${Math.round(col.r * 0.28)}, ${Math.round(col.g * 0.28)}, ${Math.round(col.b * 0.28)})`);
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.screenR, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else {
      let faces = [];
      if (fractal.id === 'menger_sponge') {
        faces = generateSpongeFaces(false, activeDepth, morphFrac, focusOffset);
      } else if (fractal.id === 'mosely_snowflake') {
        faces = generateSpongeFaces(true, activeDepth, morphFrac, focusOffset);
      } else if (fractal.id === 'sierpinski_tetrix') {
        faces = generateSierpinskiTetrixFaces(activeDepth, morphFrac, focusOffset);
      } else if (fractal.id === 'octahedron_flake') {
        faces = generateOctaFlakeFaces(activeDepth + 1, morphFrac, focusOffset);
      } else if (fractal.id === 'mandelbulb_8') {
        faces = generateMandelbulbFaces(activeDepth, morphFrac);
      } else {
        faces = generateMandelboxFaces(activeDepth, morphFrac, focusOffset);
      }

      const lightDir = normalize3({ x: -0.42, y: 0.72, z: 0.56 });
      const drawFaces = [];

      for (let i = 0; i < faces.length; i++) {
        const f = faces[i];
        const pv = [];
        let zSum = 0;
        let valid = true;

        for (let k = 0; k < f.verts.length; k++) {
          const pp = project3D(f.verts[k], focusOffset, zoomFactor, yaw, pitch, roll, fovScale);
          if (!pp) {
            valid = false;
            break;
          }
          pv.push(pp);
          zSum += pp.z;
        }
        if (!valid) continue;

        // Screen-space bounding box check to skip off-screen faces during deep zoom
        let minX = pv[0].x;
        let maxX = pv[0].x;
        let minY = pv[0].y;
        let maxY = pv[0].y;
        for (let k = 1; k < pv.length; k++) {
          if (pv[k].x < minX) minX = pv[k].x;
          if (pv[k].x > maxX) maxX = pv[k].x;
          if (pv[k].y < minY) minY = pv[k].y;
          if (pv[k].y > maxY) maxY = pv[k].y;
        }
        if (maxX < -40 || minX > width + 40 || maxY < -40 || minY > height + 40) continue;

        const e1 = sub3(pv[1].r3, pv[0].r3);
        const e2 = sub3(pv[2].r3, pv[0].r3);
        let normal = normalize3(cross3(e1, e2));
        if (normal.z < 0) {
          normal = { x: -normal.x, y: -normal.y, z: -normal.z };
        }

        const diff = Math.max(0, dot3(normal, lightDir));
        const spec = Math.pow(Math.max(0, normal.z), 16) * 44;
        const lit = (0.34 + diff * 0.66) * (f.aoFactor || 1.0);

        const baseCol = samplePalette(f.depthNorm, paletteKey);
        const r = clamp(Math.round(baseCol.r * lit + spec), 0, 255);
        const g = clamp(Math.round(baseCol.g * lit + spec), 0, 255);
        const b = clamp(Math.round(baseCol.b * lit + spec), 0, 255);

        drawFaces.push({
          zSort: zSum / pv.length,
          pv,
          r,
          g,
          b
        });
      }

      drawFaces.sort((a, b) => a.zSort - b.zSort);

      for (let i = 0; i < drawFaces.length; i++) {
        const df = drawFaces[i];
        const pv = df.pv;

        if (renderStyle === 'point_voxels') {
          let cx = 0;
          let cy = 0;
          for (let k = 0; k < pv.length; k++) {
            cx += pv[k].x;
            cy += pv[k].y;
          }
          cx /= pv.length;
          cy /= pv.length;
          ctx.fillStyle = `rgb(${df.r}, ${df.g}, ${df.b})`;
          ctx.beginPath();
          ctx.arc(cx, cy, clamp(pv[0].persp * 0.012, 1.5, 4.5), 0, Math.PI * 2);
          ctx.fill();
          continue;
        }

        ctx.beginPath();
        ctx.moveTo(pv[0].x, pv[0].y);
        for (let k = 1; k < pv.length; k++) {
          ctx.lineTo(pv[k].x, pv[k].y);
        }
        ctx.closePath();

        if (renderStyle === 'neon_holo') {
          ctx.fillStyle = `rgba(${df.r}, ${df.g}, ${df.b}, 0.24)`;
          ctx.fill();
          ctx.strokeStyle = `rgba(${df.r}, ${df.g}, ${df.b}, 0.85)`;
          ctx.lineWidth = 0.9;
          ctx.stroke();
        } else {
          ctx.fillStyle = `rgb(${df.r}, ${df.g}, ${df.b})`;
          ctx.fill();
          ctx.strokeStyle = 'rgba(15, 23, 42, 0.35)';
          ctx.lineWidth = 0.55;
          ctx.stroke();
        }
      }
    }

    // 4. Mathematical & Hausdorff Dimension HUD
    if (showHud) {
      renderHud(fractal, paletteKey, activeDepth + 1, displayMagnification, stageProgress);
    }
  }

  function destroy() {}

  return { render, resize, destroy };
}
