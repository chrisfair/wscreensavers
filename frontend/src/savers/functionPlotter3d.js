const FUNCTIONS_3D = [
  {
    id: 'sombrero',
    name: 'Sinc Wave (Sombrero Ripple)',
    coordSystem: 'rectangular',
    coordBadge: 'RECTANGULAR · CARTESIAN (x, y, z)',
    equation: 'z(x, y, t) = 1.6 · sin(√(x² + y²) - ωt) / √(x² + y²)',
    domainText: 'x ∈ [-3π, 3π],  y ∈ [-3π, 3π]',
    subtitle: 'Radially symmetric damped standing wave propagating from the Cartesian origin',
    evalPoint(u, v, t) {
      const span = Math.PI * 3.0;
      const x = (u * 2 - 1) * span;
      const y = (v * 2 - 1) * span;
      const r = Math.sqrt(x * x + y * y);
      const z = r < 1e-4 ? 1.6 * Math.cos(t * 2.2) : (1.6 * Math.sin(r - t * 2.2)) / (r * 0.45 + 0.6);
      const scale = 0.26;
      return { x: x * scale, y: y * scale, z: z * 0.85, metric: z * 0.6 };
    }
  },
  {
    id: 'polar_rose',
    name: 'Polar Rhodonea Harmonic Surface',
    coordSystem: 'polar',
    coordBadge: 'POLAR · CYLINDRICAL (r, θ, z)',
    equation: 'z(r, θ, t) = r · cos(5θ + ωt) · exp(-r²/5) · cos(1.8r - ωt)',
    domainText: 'r ∈ [0, 3.2],  θ ∈ [0, 2π],  k = 5 petals',
    subtitle: 'Five-petal Grandi rose harmonic modulated by a radial decay envelope',
    evalPoint(u, v, t) {
      const r = u * 3.2;
      const theta = v * Math.PI * 2;
      const x = r * Math.cos(theta);
      const y = r * Math.sin(theta);
      const z =
        1.45 *
        (r * 0.65) *
        Math.cos(5 * theta + t * 1.1) *
        Math.exp(-(r * r) / 5.2) *
        Math.cos(1.8 * r - t * 1.8);
      const scale = 0.72;
      return { x: x * scale, y: y * scale, z: z * 1.15, metric: z };
    }
  },
  {
    id: 'saddle',
    name: 'Hyperbolic & Monkey Saddle Homotopy',
    coordSystem: 'rectangular',
    coordBadge: 'RECTANGULAR · CARTESIAN (x, y, z)',
    equation: 'z(x, y, t) = cos(ωt)·(x² - y²)/2 + sin(ωt)·(x³ - 3xy²)/4',
    domainText: 'x ∈ [-2.0, 2.0],  y ∈ [-2.0, 2.0]',
    subtitle: 'Continuous deformation between a Gaussian hyperbolic paraboloid and a 3-fold monkey saddle',
    evalPoint(u, v, t) {
      const x = (u * 2 - 1) * 2.0;
      const y = (v * 2 - 1) * 2.0;
      const c = Math.cos(t * 0.75);
      const s = Math.sin(t * 0.75);
      const zHyp = 0.42 * (x * x - y * y);
      const zMonkey = 0.22 * (x * x * x - 3 * x * y * y);
      const z = c * zHyp + s * zMonkey;
      return { x: x * 1.1, y: y * 1.1, z: z * 0.85, metric: z * 0.6 };
    }
  },
  {
    id: 'spherical_harmonic',
    name: 'Spherical Harmonic Orbital Y₃²(θ, φ)',
    coordSystem: 'polar',
    coordBadge: 'POLAR · SPHERICAL (r, θ, φ)',
    equation: 'r(θ, φ, t) = 1.1 + 0.55 · sin²(φ)·cos(φ) · cos(2θ + ωt)',
    domainText: 'θ ∈ [0, 2π],  φ ∈ [0, π],  (l = 3, m = 2)',
    subtitle: 'Angular momentum eigenstate surface plotted in 3D spherical polar coordinates',
    evalPoint(u, v, t) {
      const phi = u * Math.PI;
      const theta = v * Math.PI * 2;
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);
      const y32 = sinPhi * sinPhi * cosPhi * Math.cos(2 * theta + t * 1.4);
      const y20 = 0.5 * (3 * cosPhi * cosPhi - 1) * Math.sin(t * 0.9);
      const r = 1.25 + 1.15 * y32 + 0.28 * y20;
      const x = r * sinPhi * Math.cos(theta);
      const y = r * sinPhi * Math.sin(theta);
      const z = r * cosPhi;
      return { x: x * 1.15, y: y * 1.15, z: z * 1.15, metric: (r - 1.25) * 1.6 };
    }
  },
  {
    id: 'eggcrate',
    name: 'Bi-Harmonic Standing Wave Membrane',
    coordSystem: 'rectangular',
    coordBadge: 'RECTANGULAR · CARTESIAN (x, y, z)',
    equation: 'z(x, y, t) = sin(kx + ωt)·cos(ky - ωt) + 0.4·cos(2kx - 2ky)',
    domainText: 'x ∈ [-π, π],  y ∈ [-π, π]',
    subtitle: 'Superposition of orthogonal Fourier eigenmodes across a 2D rectangular domain',
    evalPoint(u, v, t) {
      const x = (u * 2 - 1) * Math.PI;
      const y = (v * 2 - 1) * Math.PI;
      const z =
        0.72 * Math.sin(1.5 * x + t * 1.6) * Math.cos(1.5 * y - t * 1.4) +
        0.32 * Math.cos(2.5 * x - 2.5 * y + t * 0.9);
      const scale = 0.74;
      return { x: x * scale, y: y * scale, z: z * 1.05, metric: z };
    }
  },
  {
    id: 'bessel_drum',
    name: 'Circular Drumhead Bessel Mode J₃(kr)',
    coordSystem: 'polar',
    coordBadge: 'POLAR · CYLINDRICAL (r, θ, z)',
    equation: 'z(r, θ, t) = J₃(α₃,₂ · r) · cos(3θ + φ₀) · cos(ωt)',
    domainText: 'r ∈ [0, 3.0],  θ ∈ [0, 2π],  mode (m=3, n=2)',
    subtitle: 'Chladni acoustic normal mode of a circular membrane governed by the cylindrical wave equation',
    evalPoint(u, v, t) {
      const r = u * 3.0;
      const theta = v * Math.PI * 2;
      const kr = r * 2.8;
      const j3 =
        Math.pow(r / 3.0, 1.3) *
        Math.sin(kr - 0.4) *
        Math.exp(-0.22 * r);
      const z =
        1.45 * j3 * Math.cos(3 * theta + t * 0.6) * Math.cos(t * 2.0) +
        0.35 * Math.cos(kr - t * 2.2) * Math.exp(-0.35 * r);
      const scale = 0.76;
      return {
        x: r * Math.cos(theta) * scale,
        y: r * Math.sin(theta) * scale,
        z: z * 1.15,
        metric: z
      };
    }
  },
  {
    id: 'gabor',
    name: '2D Gaussian Gabor Wavepacket',
    coordSystem: 'rectangular',
    coordBadge: 'RECTANGULAR · CARTESIAN (x, y, z)',
    equation: 'z(x, y, t) = exp(-(x² + y²)/2σ²) · cos(kₓx + kᵧy - ωt)',
    domainText: 'x ∈ [-3.0, 3.0],  y ∈ [-3.0, 3.0],  σ = 1.35',
    subtitle: 'Localized quantum phase wavepacket modulated by an isotropic 2D Gaussian envelope',
    evalPoint(u, v, t) {
      const x = (u * 2 - 1) * 3.0;
      const y = (v * 2 - 1) * 3.0;
      const env = Math.exp(-(x * x + y * y) / 3.6);
      const kx = 2.6 * Math.cos(t * 0.35);
      const ky = 2.6 * Math.sin(t * 0.35);
      const z = 1.45 * env * Math.cos(kx * x + ky * y - t * 2.6);
      const scale = 0.76;
      return { x: x * scale, y: y * scale, z, metric: z };
    }
  },
  {
    id: 'torus_wave',
    name: 'Toroidal Trefoil Harmonic Manifold',
    coordSystem: 'polar',
    coordBadge: 'POLAR · TOROIDAL (R, r, θ, φ)',
    equation: 'r(θ, φ, t) = R₀ + (r₀ + 0.25·sin(3θ + 2φ - ωt))·cos(φ)',
    domainText: 'θ ∈ [0, 2π],  φ ∈ [0, 2π],  (p=3, q=2)',
    subtitle: 'Closed genus-1 polar manifold carrying a (3,2)-trefoil harmonic wave around the torus',
    evalPoint(u, v, t) {
      const theta = u * Math.PI * 2;
      const phi = v * Math.PI * 2;
      const R0 = 1.55;
      const wave = 0.24 * Math.sin(3 * theta + 2 * phi - t * 2.1);
      const rTube = 0.62 + wave;
      const rad = R0 + rTube * Math.cos(phi);
      const x = rad * Math.cos(theta);
      const y = rad * Math.sin(theta);
      const z = rTube * Math.sin(phi);
      return { x: x * 0.96, y: y * 0.96, z: z * 1.08, metric: z + wave * 2.2 };
    }
  },
  {
    id: 'enneper',
    name: 'Enneper Minimal Surface (H = 0)',
    coordSystem: 'rectangular',
    coordBadge: 'RECTANGULAR · PARAMETRIC (u, v → x, y, z)',
    equation: 'x = u - u³/3 + uv²,   y = v - v³/3 + u²v,   z = (u² - v²)·cos(ωt)',
    domainText: 'u ∈ [-1.35, 1.35],  v ∈ [-1.35, 1.35]',
    subtitle: 'Classical differential geometry surface with vanishing mean curvature everywhere',
    evalPoint(u, v, t) {
      const uu = (u * 2 - 1) * 1.32;
      const vv = (v * 2 - 1) * 1.32;
      const x = uu - (uu * uu * uu) / 3 + uu * vv * vv;
      const y = vv - (vv * vv * vv) / 3 + vv * uu * uu;
      const z = (uu * uu - vv * vv) * (0.65 + 0.35 * Math.cos(t * 1.2));
      const scale = 0.78;
      return { x: x * scale, y: y * scale, z: z * 0.82, metric: z * 0.6 };
    }
  },
  {
    id: 'archimedean_vortex',
    name: 'Logarithmic Spiral Gravity Vortex',
    coordSystem: 'polar',
    coordBadge: 'POLAR · CYLINDRICAL (r, θ, z)',
    equation: 'z(r, θ, t) = -1.1 / (r + 0.45) + 0.32 · sin(3θ - 3.5r + ωt)',
    domainText: 'r ∈ [0.18, 3.0],  θ ∈ [0, 2π]',
    subtitle: 'Hyperbolic potential funnel sculpted by three-arm Archimedean spiral density waves',
    evalPoint(u, v, t) {
      const r = 0.18 + u * 2.82;
      const theta = v * Math.PI * 2;
      const well = -1.15 / (r + 0.48) + 0.72;
      const spiral = 0.32 * Math.sin(3 * theta - 3.5 * r + t * 2.3) * (r / 3.0);
      const z = well + spiral;
      const scale = 0.76;
      return {
        x: r * Math.cos(theta) * scale,
        y: r * Math.sin(theta) * scale,
        z: z * 1.2,
        metric: z + spiral * 1.5
      };
    }
  },
  {
    id: 'helicoid_catenoid',
    name: 'Catenoid–Helicoid Minimal Isometry',
    coordSystem: 'polar',
    coordBadge: 'POLAR · CYLINDRICAL ISOMETRY (r, θ, z)',
    equation: 'r(u, θ) = cos(α)·sinh(u) + sin(α)·cosh(u),  z = θ·cos(α) + u·sin(α)',
    domainText: 'u ∈ [-1.25, 1.25],  θ ∈ [-π, π],  α = ωt',
    subtitle: 'Locally isometric minimal surface family continuously bending a catenoid into a helicoid',
    evalPoint(u, v, t) {
      const uu = (u * 2 - 1) * 1.22;
      const theta = (v * 2 - 1) * Math.PI;
      const alpha = t * 0.65;
      const ca = Math.cos(alpha);
      const sa = Math.sin(alpha);
      const sinhU = Math.sinh(uu);
      const coshU = Math.cosh(uu);
      const x = (ca * sinhU * Math.sin(theta) + sa * coshU * Math.cos(theta)) * 0.92;
      const y = (-ca * sinhU * Math.cos(theta) + sa * coshU * Math.sin(theta)) * 0.92;
      const z = (ca * theta * 0.52 + sa * uu * 0.85) * 0.95;
      return { x, y, z, metric: z * 0.8 };
    }
  },
  {
    id: 'astroidal_dome',
    name: 'Superquadric Astroidal Wave Dome',
    coordSystem: 'rectangular',
    coordBadge: 'RECTANGULAR · CARTESIAN (x, y, z)',
    equation: 'z(x, y, t) = (1.3 - |x|^(2/3) - |y|^(2/3)) · cos(2r - ωt)',
    domainText: 'x ∈ [-2.2, 2.2],  y ∈ [-2.2, 2.2]',
    subtitle: 'Four-cusped hypocycloid envelope modulated by concentric phase ripples',
    evalPoint(u, v, t) {
      const x = (u * 2 - 1) * 2.15;
      const y = (v * 2 - 1) * 2.15;
      const r = Math.sqrt(x * x + y * y);
      const ax = Math.pow(Math.abs(x), 0.6667);
      const ay = Math.pow(Math.abs(y), 0.6667);
      const env = 1.35 - 0.52 * (ax + ay);
      const z = env * Math.cos(1.9 * r - t * 2.0);
      return { x: x * 0.95, y: y * 0.95, z: z * 0.98, metric: z };
    }
  },
  {
    id: 'spherical_lissajous',
    name: 'Spherical Tesseral Harmonic Y₄³(θ, φ)',
    coordSystem: 'polar',
    coordBadge: 'POLAR · SPHERICAL (r, θ, φ)',
    equation: 'r(θ, φ, t) = 1.2 + 0.65 · sin³(φ)·cos(φ) · sin(3θ - ωt)',
    domainText: 'θ ∈ [0, 2π],  φ ∈ [0, π],  (l = 4, m = 3)',
    subtitle: 'Octupole-order spherical harmonic eigenfunction on the unit 2-sphere',
    evalPoint(u, v, t) {
      const phi = u * Math.PI;
      const theta = v * Math.PI * 2;
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);
      const lobe = Math.pow(sinPhi, 3) * cosPhi * Math.sin(3 * theta - t * 1.65);
      const zonal = 0.22 * (5 * Math.pow(cosPhi, 3) - 3 * cosPhi) * Math.cos(t * 1.1);
      const r = 1.22 + 1.35 * lobe + zonal;
      const x = r * sinPhi * Math.cos(theta);
      const y = r * sinPhi * Math.sin(theta);
      const z = r * cosPhi;
      return { x: x * 1.12, y: y * 1.12, z: z * 1.12, metric: (r - 1.22) * 1.5 };
    }
  },
  {
    id: 'breather_soliton',
    name: 'Sine-Gordon Nonlinear Breather Soliton',
    coordSystem: 'rectangular',
    coordBadge: 'RECTANGULAR · CARTESIAN (x, y, z)',
    equation: 'z(x, y, t) = 4·arctan(cos(ωt) / cosh(0.8·√(x² + y²))) - cos(kx)·sin(ky)/4',
    domainText: 'x ∈ [-3.2, 3.2],  y ∈ [-3.2, 3.2]',
    subtitle: 'Localized oscillating soliton solution to the 2D relativistic Sine-Gordon wave equation',
    evalPoint(u, v, t) {
      const x = (u * 2 - 1) * 3.1;
      const y = (v * 2 - 1) * 3.1;
      const r = Math.sqrt(x * x + y * y);
      const soliton = 1.15 * Math.atan((Math.cos(t * 1.85) * 1.6) / Math.cosh(0.82 * r));
      const carrier = 0.24 * Math.cos(1.8 * x + t) * Math.sin(1.8 * y - t);
      const z = soliton + carrier;
      const scale = 0.72;
      return { x: x * scale, y: y * scale, z: z * 1.05, metric: z };
    }
  },
  {
    id: 'klein_figure8',
    name: 'Figure-8 Klein Immersion Manifold',
    coordSystem: 'polar',
    coordBadge: 'POLAR · TOROIDAL IMMERSION (r, θ, φ)',
    equation: 'r(θ, φ) = R + cos(θ/2)·sin(φ) - sin(θ/2)·sin(2φ + ωt)',
    domainText: 'θ ∈ [0, 2π],  φ ∈ [0, 2π]',
    subtitle: 'Non-orientable genus-2 surface immersed in 3D cylindrical polar coordinates',
    evalPoint(u, v, t) {
      const theta = u * Math.PI * 2;
      const phi = v * Math.PI * 2;
      const half = theta * 0.5 + t * 0.35;
      const sinPhi = Math.sin(phi);
      const sin2Phi = Math.sin(2 * phi + t * 1.1) * 0.5;
      const rad = 1.65 + Math.cos(half) * sinPhi - Math.sin(half) * sin2Phi;
      const x = rad * Math.cos(theta);
      const y = rad * Math.sin(theta);
      const z = Math.sin(half) * sinPhi + Math.cos(half) * sin2Phi;
      return { x: x * 0.88, y: y * 0.88, z: z * 1.05, metric: z };
    }
  },
  {
    id: 'ripple_interference',
    name: 'Two-Source Dipole Wave Interference',
    coordSystem: 'rectangular',
    coordBadge: 'RECTANGULAR · CARTESIAN (x, y, z)',
    equation: 'z(x, y, t) = sin(k·r₁ - ωt)/(0.5r₁+1) + sin(k·r₂ - ωt)/(0.5r₂+1)',
    domainText: 'x ∈ [-2.8, 2.8],  y ∈ [-2.8, 2.8],  sources (±1.1, 0)',
    subtitle: 'Constructive and destructive nodal hyperbolas from two coherent point emitters',
    evalPoint(u, v, t) {
      const x = (u * 2 - 1) * 2.8;
      const y = (v * 2 - 1) * 2.8;
      const r1 = Math.sqrt((x - 1.1) * (x - 1.1) + y * y);
      const r2 = Math.sqrt((x + 1.1) * (x + 1.1) + y * y);
      const w1 = Math.sin(3.4 * r1 - t * 2.4) / (0.55 * r1 + 1.0);
      const w2 = Math.sin(3.4 * r2 - t * 2.4) / (0.55 * r2 + 1.0);
      const z = (w1 + w2) * 0.92;
      const scale = 0.8;
      return { x: x * scale, y: y * scale, z: z * 1.05, metric: z };
    }
  }
];

function createProceduralFunction(coordFilter) {
  const choosePolar =
    coordFilter === 'polar' ? true : coordFilter === 'rectangular' ? false : Math.random() < 0.5;

  if (choosePolar) {
    const petals = 2 + Math.floor(Math.random() * 6); // 2..7
    const radialFreq = Number((1.4 + Math.random() * 2.2).toFixed(1));
    const twist = Number((0.6 + Math.random() * 2.2).toFixed(1));
    const sphericalMode = Math.random() < 0.38;

    if (sphericalMode) {
      const l = petals + 1;
      const m = Math.max(1, petals - 1);
      return {
        id: `proc_sph_${l}_${m}`,
        name: `Randomized Spherical Harmonic Y(${l},${m})`,
        coordSystem: 'polar',
        coordBadge: 'POLAR · SPHERICAL (r, θ, φ)',
        equation: `r(θ, φ, t) = 1.2 + 0.6·sin^${m}(φ)·cos(φ)·cos(${m}θ - ${radialFreq}t)`,
        domainText: `θ ∈ [0, 2π],  φ ∈ [0, π],  random mode (l=${l}, m=${m})`,
        subtitle: 'Procedurally synthesized spherical harmonic eigenmode',
        evalPoint(u, v, t) {
          const phi = u * Math.PI;
          const theta = v * Math.PI * 2;
          const sinPhi = Math.sin(phi);
          const cosPhi = Math.cos(phi);
          const harmonic = Math.pow(Math.abs(sinPhi), m) * cosPhi * Math.cos(m * theta - t * 1.5);
          const overtone = 0.24 * Math.sin(petals * phi - t * 1.1);
          const r = 1.22 + 1.15 * harmonic + overtone;
          return {
            x: r * sinPhi * Math.cos(theta) * 1.1,
            y: r * sinPhi * Math.sin(theta) * 1.1,
            z: r * cosPhi * 1.1,
            metric: (r - 1.22) * 1.5
          };
        }
      };
    }

    return {
      id: `proc_polar_${petals}_${radialFreq}`,
      name: `Randomized Polar Harmonic (k=${petals}, kr=${radialFreq})`,
      coordSystem: 'polar',
      coordBadge: 'POLAR · CYLINDRICAL (r, θ, z)',
      equation: `z(r, θ, t) = r·cos(${petals}θ - ${twist}r + ωt)·exp(-r²/5.5)·cos(${radialFreq}r - ωt)`,
      domainText: `r ∈ [0, 3.1],  θ ∈ [0, 2π],  k = ${petals} harmonic lobes`,
      subtitle: 'Procedurally synthesized cylindrical polar harmonic surface',
      evalPoint(u, v, t) {
        const r = u * 3.1;
        const theta = v * Math.PI * 2;
        const env = (r * 0.68) * Math.exp(-(r * r) / 5.4);
        const z =
          1.45 *
          env *
          Math.cos(petals * theta - twist * r + t * 1.4) *
          Math.cos(radialFreq * r - t * 1.9);
        const scale = 0.74;
        return {
          x: r * Math.cos(theta) * scale,
          y: r * Math.sin(theta) * scale,
          z: z * 1.15,
          metric: z
        };
      }
    };
  }

  const kx = 1 + Math.floor(Math.random() * 4);
  const ky = 1 + Math.floor(Math.random() * 4);
  const crossAmp = Number((0.25 + Math.random() * 0.45).toFixed(2));
  const damp = Number((0.12 + Math.random() * 0.18).toFixed(2));

  return {
    id: `proc_rect_${kx}_${ky}`,
    name: `Randomized Cartesian Eigenmode (${kx}×${ky})`,
    coordSystem: 'rectangular',
    coordBadge: 'RECTANGULAR · CARTESIAN (x, y, z)',
    equation: `z(x, y, t) = [sin(${kx}x + ωt)·cos(${ky}y - ωt) + ${crossAmp}·cos(2r - ωt)]·e^(-${damp}r²)`,
    domainText: `x ∈ [-π, π],  y ∈ [-π, π],  modes (kx=${kx}, ky=${ky})`,
    subtitle: 'Procedurally synthesized 2D Cartesian Fourier-Gaussian surface',
    evalPoint(u, v, t) {
      const x = (u * 2 - 1) * Math.PI;
      const y = (v * 2 - 1) * Math.PI;
      const r2 = x * x + y * y;
      const r = Math.sqrt(r2);
      const env = Math.exp(-damp * r2);
      const z =
        1.25 *
        env *
        (Math.sin(kx * x + t * 1.6) * Math.cos(ky * y - t * 1.4) +
          crossAmp * Math.cos(2.1 * r - t * 2.0));
      const scale = 0.74;
      return { x: x * scale, y: y * scale, z: z * 1.08, metric: z };
    }
  };
}

const PALETTES = {
  spectrum: {
    accent: '#38bdf8',
    polarAccent: '#f472b6',
    gridLine: 'rgba(148, 163, 184, 0.22)',
    axisColor: 'rgba(56, 189, 248, 0.55)',
    hueForMetric(m) {
      const norm = Math.max(0, Math.min(1, (m + 1.1) / 2.2));
      return (225 - norm * 240 + 360) % 360;
    },
    sat: 90
  },
  plasma: {
    accent: '#f59e0b',
    polarAccent: '#c084fc',
    gridLine: 'rgba(192, 132, 252, 0.22)',
    axisColor: 'rgba(245, 158, 11, 0.55)',
    hueForMetric(m) {
      const norm = Math.max(0, Math.min(1, (m + 1.1) / 2.2));
      return (275 + norm * 145) % 360;
    },
    sat: 92
  },
  cyber: {
    accent: '#22d3ee',
    polarAccent: '#818cf8',
    gridLine: 'rgba(34, 211, 238, 0.24)',
    axisColor: 'rgba(34, 211, 238, 0.6)',
    hueForMetric(m) {
      const norm = Math.max(0, Math.min(1, (m + 1.1) / 2.2));
      return 175 + norm * 55;
    },
    sat: 95
  },
  emerald: {
    accent: '#34d399',
    polarAccent: '#a3e635',
    gridLine: 'rgba(52, 211, 153, 0.22)',
    axisColor: 'rgba(52, 211, 153, 0.55)',
    hueForMetric(m) {
      const norm = Math.max(0, Math.min(1, (m + 1.1) / 2.2));
      return 115 + norm * 50;
    },
    sat: 88
  }
};

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function filterPool(coordFilter) {
  const pool = FUNCTIONS_3D.filter(fn => {
    if (coordFilter === 'rectangular') return fn.coordSystem === 'rectangular';
    if (coordFilter === 'polar') return fn.coordSystem === 'polar';
    return true;
  });
  return pool.length > 0 ? pool : FUNCTIONS_3D;
}

export function createSurface3D(canvas, getParams) {
  const ctx = canvas.getContext('2d');
  let phase = 0;
  let yaw = 0.65;
  let pitch = 0.52;
  let roll = 0.08;
  let cycleTimer = 0;

  let shuffleBag = [];
  let orderedIndex = Math.floor(Math.random() * FUNCTIONS_3D.length);
  let activeFn = null;
  let prevFn = null;
  let morphProgress = 1.0;
  let lastCoordFilter = null;
  let lastPreset = null;

  function drawNextRandom(pool, currentId) {
    if (shuffleBag.length === 0) {
      shuffleBag = pool.slice();
      for (let i = shuffleBag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = shuffleBag[i];
        shuffleBag[i] = shuffleBag[j];
        shuffleBag[j] = tmp;
      }
      // Avoid immediate repeat across deck boundary when pool has > 1 item
      if (shuffleBag.length > 1 && shuffleBag[shuffleBag.length - 1].id === currentId) {
        const last = shuffleBag.pop();
        shuffleBag.unshift(last);
      }
    }
    return shuffleBag.pop();
  }

  function pickNextFunction(p, forceRandom) {
    const coordFilter = p.coordMode || 'both';
    const preset = p.functionPreset || 'random';
    const randomizeOrder = p.randomizeOrder !== false;

    if (preset === 'procedural') {
      return createProceduralFunction(coordFilter);
    }

    if (preset !== 'random' && preset !== 'cycle') {
      const fixed = FUNCTIONS_3D.find(fn => fn.id === preset);
      if (fixed) return fixed;
    }

    const pool = filterPool(coordFilter);
    if (forceRandom || preset === 'random' || randomizeOrder) {
      return drawNextRandom(pool, activeFn ? activeFn.id : null);
    }

    orderedIndex = (orderedIndex + 1) % pool.length;
    return pool[orderedIndex];
  }

  function ensureActiveFunction(p) {
    const coordFilter = p.coordMode || 'both';
    const preset = p.functionPreset || 'random';

    if (coordFilter !== lastCoordFilter) {
      shuffleBag = [];
      lastCoordFilter = coordFilter;
    }

    if (!activeFn || preset !== lastPreset) {
      lastPreset = preset;
      activeFn = pickNextFunction(p, preset === 'random');
      prevFn = null;
      morphProgress = 1.0;
      cycleTimer = 0;
    } else if (
      coordFilter !== 'both' &&
      activeFn.coordSystem !== coordFilter &&
      preset !== 'sombrero' &&
      preset !== 'polar_rose' &&
      !FUNCTIONS_3D.some(fn => fn.id === preset)
    ) {
      activeFn = pickNextFunction(p, true);
      prevFn = null;
      morphProgress = 1.0;
    }
  }

  function rotateAndProject(x, y, z, w, h, cy, sy, cp, sp, cr, sr, fovScale) {
    // Rotate around Z (yaw in XY math plane, since Z is vertical function height)
    const x1 = x * cy - y * sy;
    const y1 = x * sy + y * cy;
    const z1 = z;

    // Tilt pitch around X axis so Z points upward on screen
    const x2 = x1;
    const y2 = y1 * cp - z1 * sp;
    const z2 = y1 * sp + z1 * cp;

    // Gentle 3D roll around Y axis for full 3D space tumble
    const x3 = x2 * cr + z2 * sr;
    const y3 = y2;
    const z3 = -x2 * sr + z2 * cr;

    const camDist = 6.2;
    const depth = camDist + y3;
    const persp = fovScale / Math.max(1.5, depth);

    return {
      sx: w * 0.5 + x3 * persp,
      sy: h * 0.54 - z3 * persp,
      depth,
      x3,
      y3,
      z3
    };
  }

  function drawCoordinateFrame(fn, w, h, cy, sy, cp, sp, cr, sr, fovScale, pal) {
    ctx.save();
    const proj = (x, y, z) => rotateAndProject(x, y, z, w, h, cy, sy, cp, sp, cr, sr, fovScale);

    if (fn.coordSystem === 'polar') {
      // Polar cylindrical/spherical reference rings in the z = 0 plane and radial spokes
      const radii = [0.75, 1.5, 2.25];
      ctx.lineWidth = 1.0;
      ctx.strokeStyle = pal.gridLine;

      for (const r of radii) {
        ctx.beginPath();
        const steps = 48;
        for (let i = 0; i <= steps; i++) {
          const a = (i / steps) * Math.PI * 2;
          const pt = proj(r * Math.cos(a), r * Math.sin(a), 0);
          if (i === 0) ctx.moveTo(pt.sx, pt.sy);
          else ctx.lineTo(pt.sx, pt.sy);
        }
        ctx.stroke();
      }

      // 8 polar angle rays (θ = 0, π/4, π/2, ...)
      const angleLabels = ['θ=0', 'π/4', 'θ=π/2', '3π/4', 'θ=π', '5π/4', 'θ=3π/2', '7π/4'];
      ctx.font = '600 11px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (let k = 0; k < 8; k++) {
        const a = (k * Math.PI) / 4;
        const p0 = proj(0, 0, 0);
        const p1 = proj(2.35 * Math.cos(a), 2.35 * Math.sin(a), 0);
        ctx.strokeStyle = k % 2 === 0 ? pal.axisColor : pal.gridLine;
        ctx.beginPath();
        ctx.moveTo(p0.sx, p0.sy);
        ctx.lineTo(p1.sx, p1.sy);
        ctx.stroke();

        if (k % 2 === 0) {
          const pLbl = proj(2.58 * Math.cos(a), 2.58 * Math.sin(a), 0);
          ctx.fillStyle = pal.polarAccent;
          ctx.fillText(angleLabels[k], pLbl.sx, pLbl.sy);
        }
      }

      // Vertical Z / Polar axis
      const zBot = proj(0, 0, -1.65);
      const zTop = proj(0, 0, 1.65);
      ctx.strokeStyle = pal.axisColor;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(zBot.sx, zBot.sy);
      ctx.lineTo(zTop.sx, zTop.sy);
      ctx.stroke();

      const zLbl = proj(0, 0, 1.85);
      ctx.fillStyle = pal.accent;
      ctx.fillText('+Z (r,θ)', zLbl.sx, zLbl.sy);
    } else {
      // Rectangular Cartesian (x, y, z) reference plane and orthogonal axes
      const bound = 2.25;
      ctx.lineWidth = 1.0;
      ctx.strokeStyle = pal.gridLine;

      // Base grid lines on z = -1.35 floor plane
      const zFloor = -1.35;
      for (let i = -3; i <= 3; i++) {
        const offset = (i / 3) * bound;
        const a1 = proj(offset, -bound, zFloor);
        const a2 = proj(offset, bound, zFloor);
        ctx.beginPath();
        ctx.moveTo(a1.sx, a1.sy);
        ctx.lineTo(a2.sx, a2.sy);
        ctx.stroke();

        const b1 = proj(-bound, offset, zFloor);
        const b2 = proj(bound, offset, zFloor);
        ctx.beginPath();
        ctx.moveTo(b1.sx, b1.sy);
        ctx.lineTo(b2.sx, b2.sy);
        ctx.stroke();
      }

      // Principal X, Y, Z axes passing through origin
      const axes = [
        { from: [-2.45, 0, 0], to: [2.45, 0, 0], label: '+X', negLabel: '-X', color: '#38bdf8' },
        { from: [0, -2.45, 0], to: [0, 2.45, 0], label: '+Y', negLabel: '-Y', color: '#34d399' },
        { from: [0, 0, -1.65], to: [0, 0, 1.65], label: '+Z', negLabel: '-Z', color: '#f59e0b' }
      ];

      ctx.font = '700 11px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (const ax of axes) {
        const p0 = proj(ax.from[0], ax.from[1], ax.from[2]);
        const p1 = proj(ax.to[0], ax.to[1], ax.to[2]);
        ctx.strokeStyle = ax.color;
        ctx.globalAlpha = 0.65;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(p0.sx, p0.sy);
        ctx.lineTo(p1.sx, p1.sy);
        ctx.stroke();

        const pPos = proj(ax.to[0] * 1.09, ax.to[1] * 1.09, ax.to[2] * 1.09);
        ctx.globalAlpha = 0.92;
        ctx.fillStyle = ax.color;
        ctx.fillText(ax.label, pPos.sx, pPos.sy);
      }
    }

    ctx.restore();
  }

  function drawEquationHud(fn, w, h, pal, isAutoSwitch, isRandomized, cycleSeconds) {
    ctx.save();
    const padX = Math.max(20, Math.min(36, w * 0.03));
    const padY = Math.max(18, Math.min(32, h * 0.035));
    const isCompact = w < 680;

    const badgeColor = fn.coordSystem === 'polar' ? pal.polarAccent : pal.accent;
    const cardW = Math.min(w - padX * 2, isCompact ? 520 : 650);
    const cardH = isCompact ? 118 : 136;

    // Translucent glass panel
    ctx.fillStyle = 'rgba(7, 11, 22, 0.84)';
    ctx.strokeStyle = badgeColor;
    ctx.lineWidth = 1.4;
    roundRectPath(ctx, padX, padY, cardW, cardH, 10);
    ctx.fill();
    ctx.stroke();

    // Coordinate System Pill Badge
    ctx.font = `700 ${isCompact ? 10 : 11}px "JetBrains Mono", monospace`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const badgeText = fn.coordBadge;
    const badgeW = ctx.measureText(badgeText).width + 18;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
    ctx.strokeStyle = badgeColor;
    ctx.lineWidth = 1.1;
    roundRectPath(ctx, padX + 14, padY + 12, badgeW, 22, 5);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = badgeColor;
    ctx.fillText(badgeText, padX + 23, padY + 23);

    // Function Title next to badge
    ctx.fillStyle = '#f8fafc';
    ctx.font = `700 ${isCompact ? 14 : 17}px system-ui, -apple-system, sans-serif`;
    ctx.fillText(fn.name, padX + badgeW + 24, padY + 23);

    // Highlighted Mathematical Function Formula Box
    const eqBoxY = padY + 42;
    const eqBoxH = isCompact ? 34 : 40;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.28)';
    ctx.lineWidth = 1.0;
    roundRectPath(ctx, padX + 14, eqBoxY, cardW - 28, eqBoxH, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fef08a';
    ctx.font = `700 ${isCompact ? 12 : 14}px "JetBrains Mono", monospace`;
    ctx.fillText(fn.equation, padX + 22, eqBoxY + eqBoxH * 0.52);

    // Domain, Live 3D Spin Angles & Cadence Countdown Footer
    const footerY = eqBoxY + eqBoxH + (isCompact ? 17 : 20);
    ctx.fillStyle = '#94a3b8';
    ctx.font = `500 ${isCompact ? 10 : 11.5}px "JetBrains Mono", monospace`;
    const degYaw = Math.round(((yaw * 180) / Math.PI) % 360);
    const degPitch = Math.round(((pitch * 180) / Math.PI) % 360);
    const remaining = Math.max(0, cycleSeconds - cycleTimer).toFixed(1);
    const cadenceTag = isAutoSwitch
      ? `${isRandomized ? 'RANDOM' : 'CYCLE'} ${remaining}s/${cycleSeconds}s`
      : 'FIXED';
    const footerText = `${fn.domainText}  |  Spin (${degYaw}°, ${degPitch}°)  |  ${cadenceTag}`;
    ctx.fillText(footerText, padX + 14, footerY);

    // Regular Cadence Progress Bar along bottom of HUD card
    if (isAutoSwitch) {
      const barX = padX + 14;
      const barY = padY + cardH - 8;
      const barW = cardW - 28;
      const frac = Math.max(0, Math.min(1, cycleTimer / cycleSeconds));
      ctx.fillStyle = 'rgba(30, 41, 59, 0.85)';
      ctx.fillRect(barX, barY, barW, 3);
      ctx.fillStyle = badgeColor;
      ctx.fillRect(barX, barY, barW * frac, 3);
    }

    ctx.restore();
  }

  return {
    render(dt) {
      const p = getParams();
      const spinSpeed = Number(p.spinSpeed ?? 1.0);
      const gridRes = Math.min(44, Math.max(16, Math.floor(Number(p.resolution ?? 30))));
      const renderStyle = p.renderStyle || 'shaded_wire';
      const paletteName = p.palette || 'spectrum';
      const showAxes = p.showAxes !== false;
      const showEquation = p.showEquation !== false;
      const cycleSeconds = Math.max(4, Number(p.cycleSeconds ?? 10));
      const preset = p.functionPreset || 'random';
      const randomizeOrder = p.randomizeOrder !== false;
      const isAutoSwitch = preset === 'random' || preset === 'cycle' || preset === 'procedural';
      const isRandomized = preset === 'random' || preset === 'procedural' || randomizeOrder;

      const pal = PALETTES[paletteName] || PALETTES.spectrum;

      ensureActiveFunction(p);

      phase += dt * 0.85 * spinSpeed;
      yaw += dt * 0.42 * spinSpeed;
      pitch = 0.56 + Math.sin(phase * 0.37) * 0.28;
      roll = Math.cos(phase * 0.29) * 0.22;

      if (isAutoSwitch) {
        cycleTimer += dt;
        if (cycleTimer >= cycleSeconds) {
          cycleTimer = 0;
          prevFn = activeFn;
          activeFn = pickNextFunction(p, isRandomized);
          morphProgress = 0.0;
        }
      }

      if (morphProgress < 1.0) {
        const morphDuration = Math.min(1.1, cycleSeconds * 0.25);
        morphProgress = Math.min(1.0, morphProgress + dt / Math.max(0.25, morphDuration));
      }

      const fn = activeFn;
      const morphBlend =
        prevFn && morphProgress < 1.0
          ? morphProgress * morphProgress * (3 - 2 * morphProgress)
          : 1.0;

      const w = canvas.width;
      const h = canvas.height;

      // Deep space mathematical studio backdrop
      ctx.fillStyle = '#050814';
      ctx.fillRect(0, 0, w, h);

      const fovScale = Math.min(w, h) * 1.18;
      const cy = Math.cos(yaw);
      const sy = Math.sin(yaw);
      const cp = Math.cos(pitch);
      const sp = Math.sin(pitch);
      const cr = Math.cos(roll);
      const sr = Math.sin(roll);

      if (showAxes) {
        drawCoordinateFrame(fn, w, h, cy, sy, cp, sp, cr, sr, fovScale, pal);
      }

      // Sample 3D surface vertices (gridRes + 1) x (gridRes + 1)
      const cols = gridRes + 1;
      const rows = gridRes + 1;
      const verts = new Array(cols * rows);

      for (let i = 0; i <= gridRes; i++) {
        const u = i / gridRes;
        for (let j = 0; j <= gridRes; j++) {
          const v = j / gridRes;
          let pt3 = fn.evalPoint(u, v, phase);
          if (morphBlend < 1.0 && prevFn) {
            const oldPt = prevFn.evalPoint(u, v, phase);
            const inv = 1.0 - morphBlend;
            pt3 = {
              x: oldPt.x * inv + pt3.x * morphBlend,
              y: oldPt.y * inv + pt3.y * morphBlend,
              z: oldPt.z * inv + pt3.z * morphBlend,
              metric: oldPt.metric * inv + pt3.metric * morphBlend
            };
          }
          const proj = rotateAndProject(pt3.x, pt3.y, pt3.z, w, h, cy, sy, cp, sp, cr, sr, fovScale);
          proj.metric = pt3.metric;
          verts[i * rows + j] = proj;
        }
      }

      // Build quads for depth-sorted painter's algorithm
      const quads = [];
      for (let i = 0; i < gridRes; i++) {
        for (let j = 0; j < gridRes; j++) {
          const p00 = verts[i * rows + j];
          const p10 = verts[(i + 1) * rows + j];
          const p11 = verts[(i + 1) * rows + (j + 1)];
          const p01 = verts[i * rows + (j + 1)];

          const avgDepth = (p00.depth + p10.depth + p11.depth + p01.depth) * 0.25;
          const avgMetric = (p00.metric + p10.metric + p11.metric + p01.metric) * 0.25;

          // Approximate 3D camera-space normal for directional specular lighting
          const ux = p10.x3 - p00.x3;
          const uy = p10.y3 - p00.y3;
          const uz = p10.z3 - p00.z3;
          const vx = p01.x3 - p00.x3;
          const vy = p01.y3 - p00.y3;
          const vz = p01.z3 - p00.z3;
          const nx = uy * vz - uz * vy;
          const ny = uz * vx - ux * vz;
          const nz = ux * vy - uy * vx;
          const nLen = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;

          // Light source from upper-front-left
          const lightDot = Math.abs((nx * -0.35 + ny * -0.55 + nz * 0.75) / nLen);

          quads.push({
            p00,
            p10,
            p11,
            p01,
            avgDepth,
            avgMetric,
            lightDot
          });
        }
      }

      // Sort back-to-front
      quads.sort((a, b) => b.avgDepth - a.avgDepth);

      ctx.save();
      ctx.lineJoin = 'round';

      for (let q = 0; q < quads.length; q++) {
        const { p00, p10, p11, p01, avgMetric, lightDot } = quads[q];
        const hue = pal.hueForMetric(avgMetric);
        const light = Math.round(28 + lightDot * 44);

        ctx.beginPath();
        ctx.moveTo(p00.sx, p00.sy);
        ctx.lineTo(p10.sx, p10.sy);
        ctx.lineTo(p11.sx, p11.sy);
        ctx.lineTo(p01.sx, p01.sy);
        ctx.closePath();

        if (renderStyle !== 'wireframe') {
          const fillAlpha = renderStyle === 'solid_contour' ? 0.88 : 0.68;
          ctx.fillStyle = `hsla(${hue.toFixed(0)}, ${pal.sat}%, ${light}%, ${fillAlpha})`;
          ctx.fill();
        }

        if (renderStyle !== 'solid_contour') {
          const strokeLight = Math.min(86, light + 22);
          ctx.lineWidth = renderStyle === 'wireframe' ? 1.25 : 0.75;
          ctx.strokeStyle = `hsla(${hue.toFixed(0)}, 95%, ${strokeLight}%, ${
            renderStyle === 'wireframe' ? 0.82 : 0.48
          })`;
          ctx.stroke();
        }
      }

      ctx.restore();

      if (showEquation) {
        drawEquationHud(fn, w, h, pal, isAutoSwitch, isRandomized, cycleSeconds);
      }
    }
  };
}
