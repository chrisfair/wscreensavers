// 4D Hypercubes, Non-Orientable Klein Manifolds & Impossible Topologies Screensaver
// Performs true R^4 -> R^3 stereographic/perspective projection with SO(4) 6-plane rotations
// (XY, XZ, YZ, XW, YW, ZW), W-coordinate depth coloring, translucent 4D cell facets,
// and an optional topological & Schlafli invariant HUD.

const PHI = (1 + Math.sqrt(5)) / 2;

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Rotate a 4D vector (x, y, z, w) through all 6 planes of SO(4)
function rotate4D(v, angles) {
  let { x, y, z, w } = v;

  // 1. XW plane (4D inside-out rotation)
  if (angles.xw) {
    const c = Math.cos(angles.xw);
    const s = Math.sin(angles.xw);
    const nx = x * c - w * s;
    const nw = x * s + w * c;
    x = nx;
    w = nw;
  }
  // 2. YW plane
  if (angles.yw) {
    const c = Math.cos(angles.yw);
    const s = Math.sin(angles.yw);
    const ny = y * c - w * s;
    const nw = y * s + w * c;
    y = ny;
    w = nw;
  }
  // 3. ZW plane
  if (angles.zw) {
    const c = Math.cos(angles.zw);
    const s = Math.sin(angles.zw);
    const nz = z * c - w * s;
    const nw = z * s + w * c;
    z = nz;
    w = nw;
  }
  // 4. XY plane (3D roll)
  if (angles.xy) {
    const c = Math.cos(angles.xy);
    const s = Math.sin(angles.xy);
    const nx = x * c - y * s;
    const ny = x * s + y * c;
    x = nx;
    y = ny;
  }
  // 5. XZ plane (3D yaw)
  if (angles.xz) {
    const c = Math.cos(angles.xz);
    const s = Math.sin(angles.xz);
    const nx = x * c - z * s;
    const nz = x * s + z * c;
    x = nx;
    z = nz;
  }
  // 6. YZ plane (3D pitch)
  if (angles.yz) {
    const c = Math.cos(angles.yz);
    const s = Math.sin(angles.yz);
    const ny = y * c - z * s;
    const nz = y * s + z * c;
    y = ny;
    z = nz;
  }

  return { x, y, z, w };
}

// Project R^4 -> R^3 via perspective or stereographic projection from the 4D hyper-camera at w = wCam
function project4Dto3D(v4, wCam = 2.65) {
  const denom = Math.max(0.32, wCam - v4.w);
  const scale4 = 1.75 / denom;
  return {
    x: v4.x * scale4,
    y: v4.y * scale4,
    z: v4.z * scale4,
    w: v4.w,
    scale4
  };
}

// Build exact 4D geometry for polytopes (vertices, edges, and quad/triangle faces)
function buildTesseract() {
  const vertices = [];
  for (let i = 0; i < 16; i++) {
    vertices.push({
      x: i & 1 ? 1 : -1,
      y: i & 2 ? 1 : -1,
      z: i & 4 ? 1 : -1,
      w: i & 8 ? 1 : -1
    });
  }
  const edges = [];
  for (let i = 0; i < 16; i++) {
    for (let bit = 0; bit < 4; bit++) {
      const j = i ^ (1 << bit);
      if (i < j) edges.push([i, j]);
    }
  }
  // 24 2-faces of the tesseract (where 2 bits vary and 2 bits are fixed)
  const faces = [];
  for (let a = 0; a < 4; a++) {
    for (let b = a + 1; b < 4; b++) {
      const otherBits = [0, 1, 2, 3].filter((k) => k !== a && k !== b);
      for (let mask = 0; mask < 4; mask++) {
        const base =
          ((mask & 1 ? 1 : 0) << otherBits[0]) |
          ((mask & 2 ? 1 : 0) << otherBits[1]);
        const v00 = base;
        const v10 = base | (1 << a);
        const v11 = base | (1 << a) | (1 << b);
        const v01 = base | (1 << b);
        faces.push([v00, v10, v11, v01]);
      }
    }
  }
  return { vertices, edges, faces };
}

function build16Cell() {
  // 8 vertices at (±1.35, 0, 0, 0) permutations
  const s = 1.45;
  const vertices = [
    { x: s, y: 0, z: 0, w: 0 },
    { x: -s, y: 0, z: 0, w: 0 },
    { x: 0, y: s, z: 0, w: 0 },
    { x: 0, y: -s, z: 0, w: 0 },
    { x: 0, y: 0, z: s, w: 0 },
    { x: 0, y: 0, z: -s, w: 0 },
    { x: 0, y: 0, z: 0, w: s },
    { x: 0, y: 0, z: 0, w: -s }
  ];
  const edges = [];
  for (let i = 0; i < 8; i++) {
    for (let j = i + 1; j < 8; j++) {
      if ((i >> 1) !== (j >> 1)) {
        edges.push([i, j]);
      }
    }
  }
  const faces = [];
  for (let ix = 0; ix < 2; ix++) {
    for (let iy = 2; iy < 4; iy++) {
      for (let iz = 4; iz < 6; iz++) {
        faces.push([ix, iy, iz]);
      }
      for (let iw = 6; iw < 8; iw++) {
        faces.push([ix, iy, iw]);
      }
    }
  }
  return { vertices, edges, faces };
}

function build24Cell() {
  // 24 vertices: all permutations of (±1, ±1, 0, 0)
  const vertices = [];
  const coords = [0, 1, 2, 3];
  for (let a = 0; a < 4; a++) {
    for (let b = a + 1; b < 4; b++) {
      for (const sa of [-1, 1]) {
        for (const sb of [-1, 1]) {
          const p = [0, 0, 0, 0];
          p[coords[a]] = sa * 1.05;
          p[coords[b]] = sb * 1.05;
          vertices.push({ x: p[0], y: p[1], z: p[2], w: p[3] });
        }
      }
    }
  }
  const edges = [];
  const faces = [];
  for (let i = 0; i < vertices.length; i++) {
    for (let j = i + 1; j < vertices.length; j++) {
      const dx = vertices[i].x - vertices[j].x;
      const dy = vertices[i].y - vertices[j].y;
      const dz = vertices[i].z - vertices[j].z;
      const dw = vertices[i].w - vertices[j].w;
      const d2 = dx * dx + dy * dy + dz * dz + dw * dw;
      if (Math.abs(d2 - 2.205) < 0.15) {
        edges.push([i, j]);
      }
    }
  }
  // Triangular faces where all 3 pairs of vertices share an edge
  const edgeSet = new Set(edges.map(([a, b]) => `${a}:${b}`));
  for (let i = 0; i < vertices.length; i++) {
    for (let j = i + 1; j < vertices.length; j++) {
      if (!edgeSet.has(`${i}:${j}`)) continue;
      for (let k = j + 1; k < vertices.length; k++) {
        if (edgeSet.has(`${i}:${k}`) && edgeSet.has(`${j}:${k}`)) {
          faces.push([i, j, k]);
        }
      }
    }
  }
  return { vertices, edges, faces };
}

function build600CellShell() {
  // Golden-ratio 4D vertices of the 600-cell / 120-cell symmetry group:
  // 8 vertices of (±1, 0, 0, 0), 16 of (±1/2, ±1/2, ±1/2, ±1/2), and even permutations of (±phi/2, ±1/2, ±1/(2phi), 0)
  const scale = 1.38;
  const vertices = [];
  for (let a = 0; a < 4; a++) {
    for (const s of [-1, 1]) {
      const p = [0, 0, 0, 0];
      p[a] = s * scale;
      vertices.push({ x: p[0], y: p[1], z: p[2], w: p[3] });
    }
  }
  for (let m = 0; m < 16; m++) {
    vertices.push({
      x: (m & 1 ? 0.5 : -0.5) * scale,
      y: (m & 2 ? 0.5 : -0.5) * scale,
      z: (m & 4 ? 0.5 : -0.5) * scale,
      w: (m & 8 ? 0.5 : -0.5) * scale
    });
  }
  const a = 0.5 * PHI * scale;
  const b = 0.5 * scale;
  const c = (0.5 / PHI) * scale;
  const perms = [
    [0, 1, 2, 3],
    [0, 2, 3, 1],
    [0, 3, 1, 2],
    [1, 0, 3, 2],
    [2, 0, 1, 3],
    [3, 0, 2, 1]
  ];
  for (const perm of perms) {
    for (const sa of [-1, 1]) {
      for (const sb of [-1, 1]) {
        for (const sc of [-1, 1]) {
          const p = [0, 0, 0, 0];
          p[perm[0]] = sa * a;
          p[perm[1]] = sb * b;
          p[perm[2]] = sc * c;
          p[perm[3]] = 0;
          vertices.push({ x: p[0], y: p[1], z: p[2], w: p[3] });
        }
      }
    }
  }

  const targetEdgeSq = Math.pow(scale / PHI, 2);
  const edges = [];
  for (let i = 0; i < vertices.length; i++) {
    for (let j = i + 1; j < vertices.length; j++) {
      const dx = vertices[i].x - vertices[j].x;
      const dy = vertices[i].y - vertices[j].y;
      const dz = vertices[i].z - vertices[j].z;
      const dw = vertices[i].w - vertices[j].w;
      const d2 = dx * dx + dy * dy + dz * dz + dw * dw;
      if (Math.abs(d2 - targetEdgeSq) < 0.08) {
        edges.push([i, j]);
      }
    }
  }
  return { vertices, edges, faces: [] };
}

function buildDuoprism(p = 6, q = 6) {
  const vertices = [];
  const r = 1.05;
  for (let i = 0; i < p; i++) {
    const u = (i / p) * Math.PI * 2;
    const x = Math.cos(u) * r;
    const y = Math.sin(u) * r;
    for (let j = 0; j < q; j++) {
      const v = (j / q) * Math.PI * 2;
      const z = Math.cos(v) * r;
      const w = Math.sin(v) * r;
      vertices.push({ x, y, z, w });
    }
  }
  const edges = [];
  const faces = [];
  for (let i = 0; i < p; i++) {
    const ni = (i + 1) % p;
    for (let j = 0; j < q; j++) {
      const nj = (j + 1) % q;
      const v00 = i * q + j;
      const v10 = ni * q + j;
      const v01 = i * q + nj;
      const v11 = ni * q + nj;
      edges.push([v00, v10]);
      edges.push([v00, v01]);
      faces.push([v00, v10, v11, v01]);
    }
  }
  return { vertices, edges, faces };
}

function buildNestedTesseractPair() {
  // Concentric dual-scale 4D hypercubes bridged along all 16 W-vertices + inner 16-cell core
  const outer = buildTesseract();
  const vertices = [];
  const edges = [];
  const faces = [];

  for (let i = 0; i < outer.vertices.length; i++) {
    const v = outer.vertices[i];
    vertices.push({ x: v.x * 1.12, y: v.y * 1.12, z: v.z * 1.12, w: v.w * 1.12 });
  }
  for (let i = 0; i < outer.vertices.length; i++) {
    const v = outer.vertices[i];
    vertices.push({ x: v.x * 0.56, y: v.y * 0.56, z: v.z * 0.56, w: v.w * 0.56 });
  }
  for (const [a, b] of outer.edges) {
    edges.push([a, b]);
    edges.push([a + 16, b + 16]);
  }
  for (let i = 0; i < 16; i++) {
    edges.push([i, i + 16]);
  }
  for (const f of outer.faces) {
    faces.push(f);
  }
  return { vertices, edges, faces };
}

const POLYTOPE_CACHE = {
  tesseract: buildTesseract(),
  orthoplex16: build16Cell(),
  icositetrachoron24: build24Cell(),
  hexacosichoron600: build600CellShell(),
  duoprism: buildDuoprism(7, 7),
  hypernested: buildNestedTesseractPair()
};

const MANIFOLDS = [
  {
    id: 'tesseract',
    name: '4D Tesseract (8-Cell Hypercube)',
    badge: 'REGULAR 4-POLYTOPE · SCHLÄFLI {4, 3, 3}',
    formula: 'C₈ = [-1, 1]⁴ ⊂ ℝ⁴,   (V=16, E=32, F=24, C=8)',
    invariants: '8 cubic cells · Euler χ₄ = V - E + F - C = 0 · SO(4) isoclinic rotation',
    type: 'polytope',
    polyKey: 'tesseract'
  },
  {
    id: 'klein_bottle_4d',
    name: '4D Non-Intersecting Klein Bottle',
    badge: 'NON-ORIENTABLE 2-MANIFOLD IN ℝ⁴ · χ = 0',
    formula: 'x=(R+r·cos u)cos v,  y=(R+r·cos u)sin v,  z=r·sin u·cos(v/2),  w=r·sin u·sin(v/2)',
    invariants: 'Embedded in ℝ⁴ without self-intersection (w separates neck from wall) · One-sided',
    type: 'parametric4d',
    eval4D(u, v, t) {
      const U = u * Math.PI * 2;
      const V = v * Math.PI * 2;
      const cosU = Math.cos(U);
      const sinU = Math.sin(U);
      const cosV = Math.cos(V);
      const sinV = Math.sin(V);

      // Classic bottle profile + 4th-dimension separation of neck intersection
      let x, y, z;
      if (V < Math.PI) {
        x = 0.62 * cosU * (1 + Math.sin(V)) + 0.42 * (1 - 0.5 * cosU) * Math.cos(V);
        y = 1.28 * Math.sin(V) + 0.42 * (1 - 0.5 * cosU) * Math.sin(V) * cosU;
      } else {
        x = 0.62 * cosU * (1 + Math.sin(V)) - 0.42 * (1 - 0.5 * cosU) * Math.cos(V);
        y = 1.28 * Math.sin(V);
      }
      z = 0.55 * sinU * (1 - 0.35 * Math.sin(V));
      // 4D coordinate w resolves the 3D self-intersection where the neck crosses the body
      const w = 0.85 * sinU * Math.sin(V * 0.5 + t * 0.3) + 0.45 * cosU * Math.cos(V * 0.5);
      return { x: x * 0.88, y: (y - 0.35) * 0.82, z: z * 1.15, w };
    }
  },
  {
    id: 'icositetrachoron24',
    name: '24-Cell (Icositetrachoron)',
    badge: 'SELF-DUAL 4-POLYTOPE · SCHLÄFLI {3, 4, 3}',
    formula: 'Permutations of (±1, ±1, 0, 0) ∈ ℝ⁴,   (V=24, E=96, F=96, C=24)',
    invariants: 'Unique to 4D (no regular 3D analogue) · 24 octahedral cells · D₄ root lattice',
    type: 'polytope',
    polyKey: 'icositetrachoron24'
  },
  {
    id: 'clifford_torus',
    name: 'Clifford Flat Torus in S³ ⊂ ℝ⁴',
    badge: 'INTRINSICALLY FLAT MANIFOLD · S¹ × S¹ ⊂ S³',
    formula: 'Φ(u, v) = (cos u, sin u, cos v, sin v) / √2  ∈  S³ ⊂ ℝ⁴',
    invariants: 'Zero Gaussian curvature K = 0 everywhere in ℝ⁴ · Turns inside-out under XW/ZW rotation',
    type: 'parametric4d',
    eval4D(u, v) {
      const U = u * Math.PI * 2;
      const V = v * Math.PI * 2;
      const inv = 1.18;
      return {
        x: Math.cos(U) * inv,
        y: Math.sin(U) * inv,
        z: Math.cos(V) * inv,
        w: Math.sin(V) * inv
      };
    }
  },
  {
    id: 'klein_lawson',
    name: 'Lawson Klein Surface & Mobius Strip in S³',
    badge: 'MINIMAL NON-ORIENTABLE IMMERSION IN S³ · τ_{2,1}',
    formula: 'Ψ(u, v) = (cos u·cos v, sin u·cos v, cos(u/2)·sin v, sin(u/2)·sin v) ∈ S³',
    invariants: 'Compact non-orientable minimal surface in S³ · Half-twist Mobius holonomy along u',
    type: 'parametric4d',
    eval4D(u, v) {
      const U = u * Math.PI * 2;
      const V = v * Math.PI * 2;
      const r = 1.25;
      return {
        x: r * Math.cos(U) * Math.cos(V),
        y: r * Math.sin(U) * Math.cos(V),
        z: r * Math.cos(U * 0.5) * Math.sin(V),
        w: r * Math.sin(U * 0.5) * Math.sin(V)
      };
    }
  },
  {
    id: 'orthoplex16',
    name: '16-Cell (4D Cross-Polytope / Hexadecachoron)',
    badge: 'DUAL OF TESSERACT · SCHLÄFLI {3, 3, 4}',
    formula: 'conv{±e₁, ±e₂, ±e₃, ±e₄} ⊂ ℝ⁴,   (V=8, E=24, F=32, C=16)',
    invariants: '16 regular tetrahedral cells · Dual of the 8-cell hypercube in ℝ⁴',
    type: 'polytope',
    polyKey: 'orthoplex16'
  },
  {
    id: 'boys_surface',
    name: "Boy's Surface (Real Projective Plane ℝP²)",
    badge: 'IMMERSION OF ℝP² IN ℝ³ × ℝ¹ · APÉRY / BRYANT-KUSNER',
    formula: 'g₁ = -3/2·Im[w(1 - w⁴)/D],  g₂ = -3/2·Re[w(1 + w⁴)/D],  g₃ = Im[(1 + w⁶)/D] - 1/2',
    invariants: '3-fold symmetry · Single-sided non-orientable immersion of ℝP² with χ = 1',
    type: 'parametric4d',
    eval4D(u, v) {
      // Polar disk parameter w = r * e^{i theta} for Bryant-Kusner parameterization of Boy's surface
      const r = 0.12 + u * 0.86;
      const theta = v * Math.PI * 2;
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);

      const r2 = r * r;
      const r4 = r2 * r2;
      const r6 = r4 * r2;
      const cos3 = Math.cos(3 * theta);
      const sin3 = Math.sin(3 * theta);
      const cos6 = Math.cos(6 * theta);
      const sin6 = Math.sin(6 * theta);

      // Denominator D = r^6 + sqrt(5)*r^3*cos(3*theta) + 1
      const denom = Math.max(0.45, 1 + r6 + Math.sqrt(5) * r * r2 * cos3);
      const x = (-1.5 * r * (cosT - r4 * Math.cos(5 * theta))) / denom;
      const y = (-1.5 * r * (sinT + r4 * Math.sin(5 * theta))) / denom;
      const z = (1 + r6 * cos6) / denom - 0.5;
      const w = (r * r2 * sin3 + 0.4 * r6 * sin6) / denom;
      return { x: x * 1.15, y: y * 1.15, z: z * 1.15, w: w * 1.1 };
    }
  },
  {
    id: 'hopf_fibration',
    name: 'Hopf Fibration (S³ → S² Villarceau Fibers)',
    badge: 'PRINCIPAL S¹ BUNDLE OVER S² · π₃(S²) = ℤ',
    formula: 'p(z₁, z₂) = (2·z₁z̄₂, |z₁|² - |z₂|²) ∈ S²,   Linked S¹ fibers in S³',
    invariants: 'Every pair of distinct fiber circles in ℝ³ is topologically linked (Hopf invariant = 1)',
    type: 'parametric4d',
    eval4D(u, v, t) {
      // u selects fiber on base latitude/longitude, v traces the S^1 fiber around S^3
      const ringIdx = Math.floor(u * 14);
      const ringFrac = ringIdx / 14;
      const eta = 0.28 + (ringIdx % 3) * 0.34; // Torus shell angle in (0, pi/2)
      const xi1 = ringFrac * Math.PI * 2 + t * 0.15;
      const xi2 = v * Math.PI * 2;

      const scale = 1.32;
      return {
        x: scale * Math.cos(eta) * Math.cos(xi1 + xi2),
        y: scale * Math.cos(eta) * Math.sin(xi1 + xi2),
        z: scale * Math.sin(eta) * Math.cos(xi1 - xi2),
        w: scale * Math.sin(eta) * Math.sin(xi1 - xi2)
      };
    }
  },
  {
    id: 'hexacosichoron600',
    name: '600-Cell (Hexacosichoron H₄ Golden Polytope)',
    badge: '4D ICOSAHEDRAL SYMMETRY · SCHLÄFLI {3, 3, 5}',
    formula: '120 vertices ∈ S³ with golden ratio φ = (1+√5)/2,   (V=120, E=720, F=1200, C=600)',
    invariants: '600 regular tetrahedral cells · 20 tetrahedra meet at every vertex · H₄ Coxeter group',
    type: 'polytope',
    polyKey: 'hexacosichoron600'
  },
  {
    id: 'duoprism',
    name: '4D Heptagonal Duoprism (C₇ × C₇ ⊂ ℝ⁴)',
    badge: 'CARTESIAN PRODUCT 4-POLYTOPE · ℝ² ⊕ ℝ²',
    formula: 'P₇ × P₇ = {(x,y,z,w) : (x,y) ∈ P₇, (z,w) ∈ P₇},   (V=49, E=98, F=98, C=14)',
    invariants: 'Two orthogonal rings of 7 heptagonal prisms interlocked in 4D space',
    type: 'polytope',
    polyKey: 'duoprism'
  },
  {
    id: 'hypernested',
    name: 'Double-Tesseract Hyper-Lattice (4D Cube-in-Cube)',
    badge: 'PERSPECTIVE SCHLEGEL PROJECTION · ℝ⁴ → ℝ³',
    formula: 'C₈(R₁) ∪ C₈(R₂) + 16 W-axis struts rotating through w = 0',
    invariants: 'Inner & outer 3-cubes continually swap places as the 4D hypercube rotates in XW',
    type: 'polytope',
    polyKey: 'hypernested'
  }
];

function sampleWColor(wNorm, palette = 'hyper_cyan') {
  const t = clamp(wNorm * 0.5 + 0.5, 0, 1);
  if (palette === 'klein_gold') {
    return {
      r: Math.round(lerp(56, 255, t)),
      g: Math.round(lerp(189, 175, t)),
      b: Math.round(lerp(248, 45, t))
    };
  }
  if (palette === 'matrix_emerald') {
    return {
      r: Math.round(lerp(16, 165, t)),
      g: Math.round(lerp(185, 255, t)),
      b: Math.round(lerp(129, 195, t))
    };
  }
  if (palette === 'crimson_void') {
    return {
      r: Math.round(lerp(139, 255, t)),
      g: Math.round(lerp(92, 95, t)),
      b: Math.round(lerp(246, 125, t))
    };
  }
  // Default 'hyper_cyan': deep indigo (-w) -> electric cyan (0) -> neon magenta/amber (+w)
  if (t < 0.5) {
    const u = t * 2;
    return {
      r: Math.round(lerp(99, 56, u)),
      g: Math.round(lerp(102, 212, u)),
      b: Math.round(lerp(241, 255, u))
    };
  }
  const u = (t - 0.5) * 2;
  return {
    r: Math.round(lerp(56, 244, u)),
    g: Math.round(lerp(212, 114, u)),
    b: Math.round(lerp(255, 182, u))
  };
}

export function createHyperdimension(canvas, getParams) {
  const ctx = canvas.getContext('2d');
  let width = canvas.width || 800;
  let height = canvas.height || 600;

  let simTime = 0;
  let stageElapsed = 0;
  let currentIdx = 0;
  let lastShapePreset = 'cycle';

  // Background ambient 4D dust motes
  const motes = [];
  for (let i = 0; i < 90; i++) {
    motes.push({
      x: ((i * 73) % 100) / 25 - 2,
      y: ((i * 41) % 100) / 25 - 2,
      z: ((i * 59) % 100) / 25 - 2,
      w: ((i * 31) % 100) / 25 - 2,
      size: 0.8 + (i % 3) * 0.65
    });
  }

  function resize(w, h) {
    width = Math.max(300, Math.floor(w || canvas.width || 800));
    height = Math.max(200, Math.floor(h || canvas.height || 600));
  }

  function project3Dto2D(p3, fovScale) {
    const camZ = 4.25;
    const dz = camZ - p3.z;
    if (dz <= 0.2) return null;
    const scale = fovScale / dz;
    return {
      x: width * 0.5 + p3.x * scale,
      y: height * 0.5 - p3.y * scale,
      z: p3.z,
      w: p3.w,
      scale
    };
  }

  function drawBackground(palette) {
    const bg = ctx.createRadialGradient(
      width * 0.5,
      height * 0.5,
      Math.min(width, height) * 0.05,
      width * 0.5,
      height * 0.5,
      Math.max(width, height) * 0.78
    );
    bg.addColorStop(0, '#0a1226');
    bg.addColorStop(0.55, '#050914');
    bg.addColorStop(1, '#02040a');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    // Subtle 4D coordinate reference reticle
    const cx = width * 0.5;
    const cy = height * 0.5;
    const r = Math.min(width, height) * 0.36;
    const c = sampleWColor(0.2, palette);
    ctx.strokeStyle = `rgba(${c.r}, ${c.g}, ${c.b}, 0.08)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  function renderPolytope(manifold, angles, wCam, fovScale, renderMode, palette) {
    const poly = POLYTOPE_CACHE[manifold.polyKey] || POLYTOPE_CACHE.tesseract;

    // Transform & project all 4D vertices
    const projVerts = poly.vertices.map((v) => {
      const r4 = rotate4D(v, angles);
      const p3 = project4Dto3D(r4, wCam);
      return project3Dto2D(p3, fovScale);
    });

    // 1. Render translucent 4D cell facets (sorted back-to-front by 3D depth)
    if (renderMode !== 'wireframe' && poly.faces.length > 0) {
      const sortedFaces = [];
      for (let i = 0; i < poly.faces.length; i++) {
        const face = poly.faces[i];
        let sumZ = 0;
        let sumW = 0;
        let valid = true;
        for (let k = 0; k < face.length; k++) {
          const pv = projVerts[face[k]];
          if (!pv) {
            valid = false;
            break;
          }
          sumZ += pv.z;
          sumW += pv.w;
        }
        if (valid) {
          sortedFaces.push({
            face,
            avgZ: sumZ / face.length,
            avgW: sumW / face.length
          });
        }
      }
      sortedFaces.sort((a, b) => a.avgZ - b.avgZ);

      for (let i = 0; i < sortedFaces.length; i++) {
        const { face, avgW } = sortedFaces[i];
        const col = sampleWColor(avgW / 1.4, palette);
        const alpha = renderMode === 'solid_manifold' ? 0.24 : 0.12;
        ctx.fillStyle = `rgba(${col.r}, ${col.g}, ${col.b}, ${alpha})`;
        ctx.beginPath();
        const first = projVerts[face[0]];
        ctx.moveTo(first.x, first.y);
        for (let k = 1; k < face.length; k++) {
          const pt = projVerts[face[k]];
          ctx.lineTo(pt.x, pt.y);
        }
        ctx.closePath();
        ctx.fill();
      }
    }

    // 2. Render 4D edges sorted by depth with W-coordinate color interpolation
    const sortedEdges = [];
    for (let i = 0; i < poly.edges.length; i++) {
      const [ia, ib] = poly.edges[i];
      const pa = projVerts[ia];
      const pb = projVerts[ib];
      if (!pa || !pb) continue;
      sortedEdges.push({
        pa,
        pb,
        avgZ: (pa.z + pb.z) * 0.5,
        avgW: (pa.w + pb.w) * 0.5
      });
    }
    sortedEdges.sort((a, b) => a.avgZ - b.avgZ);

    for (let i = 0; i < sortedEdges.length; i++) {
      const { pa, pb, avgZ, avgW } = sortedEdges[i];
      const col = sampleWColor(avgW / 1.35, palette);
      const depthBoost = clamp((avgZ + 2.2) / 4.2, 0.35, 1.0);
      const lineW = clamp(1.15 + depthBoost * 1.65, 1.0, 3.0);

      ctx.strokeStyle = `rgba(${col.r}, ${col.g}, ${col.b}, ${(0.42 + depthBoost * 0.55).toFixed(3)})`;
      ctx.lineWidth = lineW;
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.stroke();
    }

    // 3. Render glowing 4D vertices
    for (let i = 0; i < projVerts.length; i++) {
      const pv = projVerts[i];
      if (!pv) continue;
      const col = sampleWColor(pv.w / 1.35, palette);
      const rad = clamp(pv.scale * 0.022, 2.0, 6.2);
      ctx.fillStyle = `rgb(${Math.min(255, col.r + 45)}, ${Math.min(255, col.g + 45)}, ${Math.min(255, col.b + 45)})`;
      ctx.beginPath();
      ctx.arc(pv.x, pv.y, rad, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function renderParametricManifold(manifold, angles, wCam, fovScale, renderMode, palette, res) {
    const uSteps = clamp(Math.round(res * 1.15), 16, 44);
    const vSteps = clamp(Math.round(res), 14, 38);

    // Evaluate 2D grid of 4D points, rotate in SO(4), and project R^4 -> R^3 -> R^2
    const grid = [];
    for (let iu = 0; iu <= uSteps; iu++) {
      const u = iu / uSteps;
      const row = [];
      for (let iv = 0; iv <= vSteps; iv++) {
        const v = iv / vSteps;
        const p4 = manifold.eval4D(u, v, simTime);
        const r4 = rotate4D(p4, angles);
        const p3 = project4Dto3D(r4, wCam);
        const p2 = project3Dto2D(p3, fovScale);
        row.push({ p3, p2 });
      }
      grid.push(row);
    }

    const quads = [];
    for (let iu = 0; iu < uSteps; iu++) {
      for (let iv = 0; iv < vSteps; iv++) {
        const c00 = grid[iu][iv];
        const c10 = grid[iu + 1][iv];
        const c11 = grid[iu + 1][iv + 1];
        const c01 = grid[iu][iv + 1];
        if (!c00.p2 || !c10.p2 || !c11.p2 || !c01.p2) continue;

        const avgZ = (c00.p3.z + c10.p3.z + c11.p3.z + c01.p3.z) * 0.25;
        const avgW = (c00.p3.w + c10.p3.w + c11.p3.w + c01.p3.w) * 0.25;

        // 3D surface normal for two-sided non-orientable lighting
        const ux = c10.p3.x - c00.p3.x;
        const uy = c10.p3.y - c00.p3.y;
        const uz = c10.p3.z - c00.p3.z;
        const vx = c01.p3.x - c00.p3.x;
        const vy = c01.p3.y - c00.p3.y;
        const vz = c01.p3.z - c00.p3.z;
        const nx = uy * vz - uz * vy;
        const ny = uz * vx - ux * vz;
        const nz = ux * vy - uy * vx;
        const nLen = Math.hypot(nx, ny, nz) || 1;
        // Use abs(dot) so non-orientable surfaces (Klein bottle / Boy's surface) illuminate smoothly across Mobius twists
        const light = Math.abs((nx * 0.45 + ny * 0.65 + nz * 0.61) / nLen);

        quads.push({
          p00: c00.p2,
          p10: c10.p2,
          p11: c11.p2,
          p01: c01.p2,
          avgZ,
          avgW,
          light
        });
      }
    }

    quads.sort((a, b) => a.avgZ - b.avgZ);

    for (let i = 0; i < quads.length; i++) {
      const q = quads[i];
      const col = sampleWColor(q.avgW / 1.25, palette);
      const shade = 0.42 + q.light * 0.72;
      const r = clamp(Math.round(col.r * shade), 0, 255);
      const g = clamp(Math.round(col.g * shade), 0, 255);
      const b = clamp(Math.round(col.b * shade), 0, 255);

      ctx.beginPath();
      ctx.moveTo(q.p00.x, q.p00.y);
      ctx.lineTo(q.p10.x, q.p10.y);
      ctx.lineTo(q.p11.x, q.p11.y);
      ctx.lineTo(q.p01.x, q.p01.y);
      ctx.closePath();

      if (renderMode !== 'wireframe') {
        const fillAlpha = renderMode === 'solid_manifold' ? 0.76 : 0.42;
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${fillAlpha})`;
        ctx.fill();
      }

      if (renderMode !== 'solid_manifold') {
        ctx.strokeStyle = `rgba(${Math.min(255, r + 40)}, ${Math.min(255, g + 40)}, ${Math.min(255, b + 40)}, 0.68)`;
        ctx.lineWidth = 0.9;
        ctx.stroke();
      }
    }
  }

  function drawHud(manifold, angles, palette) {
    ctx.save();
    const padX = 22;
    const padY = 20;
    const boxW = Math.min(470, width - 40);
    const boxH = 112;

    const accent = sampleWColor(0.55, palette);
    ctx.fillStyle = 'rgba(6, 11, 23, 0.76)';
    ctx.strokeStyle = `rgba(${accent.r}, ${accent.g}, ${accent.b}, 0.38)`;
    ctx.lineWidth = 1;
    if (typeof ctx.roundRect === 'function') {
      ctx.beginPath();
      ctx.roundRect(padX, padY, boxW, boxH, 10);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillRect(padX, padY, boxW, boxH);
      ctx.strokeRect(padX, padY, boxW, boxH);
    }

    ctx.fillStyle = `rgb(${accent.r}, ${accent.g}, ${accent.b})`;
    ctx.font = '700 15px "Inter", "Segoe UI", sans-serif';
    ctx.fillText(manifold.name, padX + 14, padY + 24);

    ctx.fillStyle = 'rgba(186, 230, 253, 0.9)';
    ctx.font = '600 10.5px "JetBrains Mono", "Fira Code", monospace';
    ctx.fillText(manifold.badge, padX + 14, padY + 43);

    ctx.fillStyle = 'rgba(241, 245, 249, 0.94)';
    ctx.font = '500 11px "JetBrains Mono", "Fira Code", monospace';
    ctx.fillText(manifold.formula, padX + 14, padY + 65);

    ctx.fillStyle = 'rgba(148, 163, 184, 0.92)';
    ctx.font = '500 10.5px "JetBrains Mono", "Fira Code", monospace';
    ctx.fillText(manifold.invariants, padX + 14, padY + 84);

    const degXW = Math.round(((angles.xw * 180) / Math.PI) % 360);
    const degYW = Math.round(((angles.yw * 180) / Math.PI) % 360);
    const degZW = Math.round(((angles.zw * 180) / Math.PI) % 360);
    ctx.fillStyle = 'rgba(125, 211, 252, 0.88)';
    ctx.fillText(
      `SO(4) Hyperspace Planes:  θ_xw=${degXW}°   θ_yw=${degYW}°   θ_zw=${degZW}°   (Color = W-Depth)`,
      padX + 14,
      padY + 102
    );

    ctx.restore();
  }

  function render(dt = 0.016) {
    const p = (typeof getParams === 'function' ? getParams() : {}) || {};
    const shapePreset = String(p.shapePreset || 'cycle');
    const rotSpeed = Number(p.rotSpeed ?? 1.0);
    const cycleSeconds = Math.max(5, Number(p.cycleSeconds ?? 14));
    const renderMode = String(p.renderMode || 'translucent_cells');
    const palette = String(p.palette || 'hyper_cyan');
    const wDistance = clamp(Number(p.wDistance ?? 2.65), 1.9, 4.0);
    const resolution = clamp(Number(p.resolution ?? 26), 14, 40);
    const showHud = p.showHud !== false;

    const scaledDt = dt * clamp(rotSpeed, 0.2, 3.0);
    simTime += scaledDt;
    stageElapsed += dt;

    if (shapePreset !== lastShapePreset) {
      lastShapePreset = shapePreset;
      stageElapsed = 0;
      if (shapePreset !== 'cycle' && shapePreset !== 'random') {
        const idx = MANIFOLDS.findIndex((m) => m.id === shapePreset);
        if (idx !== -1) currentIdx = idx;
      }
    }

    if (shapePreset === 'cycle' || shapePreset === 'random') {
      if (stageElapsed >= cycleSeconds) {
        stageElapsed = 0;
        if (shapePreset === 'random') {
          currentIdx = (currentIdx + 1 + Math.floor(Math.abs(Math.sin(simTime * 19.7)) * (MANIFOLDS.length - 1))) % MANIFOLDS.length;
        } else {
          currentIdx = (currentIdx + 1) % MANIFOLDS.length;
        }
      }
    } else {
      const idx = MANIFOLDS.findIndex((m) => m.id === shapePreset);
      if (idx !== -1) currentIdx = idx;
    }

    const manifold = MANIFOLDS[currentIdx] || MANIFOLDS[0];
    const angles = {
      xw: simTime * 0.62,
      yw: simTime * 0.44,
      zw: simTime * 0.37,
      xy: simTime * 0.23,
      xz: simTime * 0.31,
      yz: simTime * 0.19
    };

    const fovScale = Math.min(width, height) * 0.85;

    // 1. Background
    drawBackground(palette);

    // 2. Ambient 4D hyperspace dust motes
    for (let i = 0; i < motes.length; i++) {
      const r4 = rotate4D(motes[i], angles);
      const p3 = project4Dto3D(r4, wDistance);
      const p2 = project3Dto2D(p3, fovScale);
      if (!p2 || p2.x < 0 || p2.x > width || p2.y < 0 || p2.y > height) continue;
      const col = sampleWColor(r4.w * 0.5, palette);
      ctx.fillStyle = `rgba(${col.r}, ${col.g}, ${col.b}, 0.26)`;
      ctx.beginPath();
      ctx.arc(p2.x, p2.y, motes[i].size, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Main 4D Polytope or Non-Orientable Topological Manifold
    if (manifold.type === 'polytope') {
      renderPolytope(manifold, angles, wDistance, fovScale, renderMode, palette);
    } else {
      renderParametricManifold(
        manifold,
        angles,
        wDistance,
        fovScale,
        renderMode,
        palette,
        resolution
      );
    }

    // 4. Topological & Schläfli Invariant HUD
    if (showHud) {
      drawHud(manifold, angles, palette);
    }
  }

  function destroy() {}

  return { render, resize, destroy };
}
