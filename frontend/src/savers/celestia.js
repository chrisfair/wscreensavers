// Celestia 3D Solar System Fly-Through Screensaver
// High-resolution procedural planetary & lunar textures, 3D ring systems with planetary shadow,
// atmospheric Rayleigh limb scattering, specular ocean glint, night-side city lights,
// Galilean & Cronian moon systems, warp starfield, and Celestia astronomical telemetry HUD.

const SOLAR_BODIES = [
  {
    id: 'sun',
    name: 'Sol (The Sun)',
    classification: 'G2V Main-Sequence Yellow Dwarf Star',
    orbitAU: 0.0,
    radiusKm: 696340,
    sceneRadius: 3.1,
    orbitalSpeed: 0.0,
    rotationSpeed: 0.18,
    axialTiltDeg: 7.25,
    dayHours: 609.12,
    gravityG: 27.9,
    tempK: 5778,
    accent: '#fbbf24',
    atmosphereColor: [255, 165, 45],
    atmosphereIntensity: 0.95,
    isEmissive: true,
    moons: []
  },
  {
    id: 'mercury',
    name: 'Mercury',
    classification: 'Terrestrial Planet · Caloris Basin & Rayed Craters',
    orbitAU: 0.39,
    radiusKm: 2439.7,
    sceneRadius: 0.95,
    orbitalSpeed: 0.42,
    rotationSpeed: 0.08,
    axialTiltDeg: 0.03,
    dayHours: 1407.6,
    gravityG: 0.38,
    tempK: 440,
    accent: '#a8a29e',
    atmosphereColor: [185, 175, 160],
    atmosphereIntensity: 0.12,
    moons: []
  },
  {
    id: 'venus',
    name: 'Venus',
    classification: 'Terrestrial Planet · Super-Rotating Sulfuric Cloud Deck',
    orbitAU: 0.72,
    radiusKm: 6051.8,
    sceneRadius: 1.32,
    orbitalSpeed: 0.31,
    rotationSpeed: -0.09,
    axialTiltDeg: 177.3,
    dayHours: 5832.5,
    gravityG: 0.9,
    tempK: 737,
    accent: '#f59e0b',
    atmosphereColor: [255, 200, 115],
    atmosphereIntensity: 0.72,
    moons: []
  },
  {
    id: 'earth',
    name: 'Earth & Luna',
    classification: 'Oceanic Terrestrial World · Nitrogen-Oxygen Biosphere',
    orbitAU: 1.0,
    radiusKm: 6371.0,
    sceneRadius: 1.48,
    orbitalSpeed: 0.25,
    rotationSpeed: 0.55,
    axialTiltDeg: 23.44,
    dayHours: 23.93,
    gravityG: 1.0,
    tempK: 288,
    accent: '#38bdf8',
    atmosphereColor: [80, 185, 255],
    atmosphereIntensity: 0.78,
    hasOceanGlint: true,
    hasCityLights: true,
    hasClouds: true,
    moons: [
      {
        id: 'moon',
        name: 'Luna (The Moon)',
        radius: 0.36,
        orbitDist: 3.35,
        orbitSpeed: 0.85,
        inclination: 0.09,
        color: [200, 198, 192]
      }
    ]
  },
  {
    id: 'mars',
    name: 'Mars',
    classification: 'Terrestrial World · Valles Marineris & Tharsis Montes',
    orbitAU: 1.52,
    radiusKm: 3389.5,
    sceneRadius: 1.18,
    orbitalSpeed: 0.2,
    rotationSpeed: 0.52,
    axialTiltDeg: 25.19,
    dayHours: 24.62,
    gravityG: 0.38,
    tempK: 210,
    accent: '#ef4444',
    atmosphereColor: [240, 130, 85],
    atmosphereIntensity: 0.42,
    moons: [
      {
        id: 'phobos',
        name: 'Phobos',
        radius: 0.15,
        orbitDist: 2.1,
        orbitSpeed: 1.65,
        inclination: 0.05,
        color: [165, 145, 132]
      },
      {
        id: 'deimos',
        name: 'Deimos',
        radius: 0.11,
        orbitDist: 2.85,
        orbitSpeed: 1.05,
        inclination: -0.07,
        color: [178, 162, 148]
      }
    ]
  },
  {
    id: 'jupiter',
    name: 'Jupiter & Galilean System',
    classification: 'Gas Giant · Great Red Spot & Zonal Jet Streams',
    orbitAU: 5.2,
    radiusKm: 69911,
    sceneRadius: 2.35,
    orbitalSpeed: 0.13,
    rotationSpeed: 0.92,
    axialTiltDeg: 3.13,
    dayHours: 9.93,
    gravityG: 2.53,
    tempK: 165,
    accent: '#fb923c',
    atmosphereColor: [245, 190, 135],
    atmosphereIntensity: 0.48,
    moons: [
      {
        id: 'io',
        name: 'Io',
        radius: 0.24,
        orbitDist: 3.55,
        orbitSpeed: 1.45,
        inclination: 0.02,
        color: [245, 210, 75]
      },
      {
        id: 'europa',
        name: 'Europa',
        radius: 0.21,
        orbitDist: 4.35,
        orbitSpeed: 1.05,
        inclination: -0.03,
        color: [220, 232, 245]
      },
      {
        id: 'ganymede',
        name: 'Ganymede',
        radius: 0.31,
        orbitDist: 5.35,
        orbitSpeed: 0.74,
        inclination: 0.04,
        color: [175, 165, 152]
      },
      {
        id: 'callisto',
        name: 'Callisto',
        radius: 0.28,
        orbitDist: 6.45,
        orbitSpeed: 0.52,
        inclination: -0.02,
        color: [135, 128, 122]
      }
    ]
  },
  {
    id: 'saturn',
    name: 'Saturn, Rings & Titan',
    classification: 'Ringed Gas Giant · Cassini & Encke Ring System',
    orbitAU: 9.58,
    radiusKm: 58232,
    sceneRadius: 2.05,
    orbitalSpeed: 0.09,
    rotationSpeed: 0.84,
    axialTiltDeg: 26.73,
    dayHours: 10.7,
    gravityG: 1.07,
    tempK: 134,
    accent: '#fde047',
    atmosphereColor: [245, 218, 155],
    atmosphereIntensity: 0.5,
    rings: {
      innerRadius: 2.55,
      outerRadius: 4.85,
      tiltX: 0.44,
      tiltZ: 0.16,
      style: 'saturn'
    },
    moons: [
      {
        id: 'enceladus',
        name: 'Enceladus',
        radius: 0.17,
        orbitDist: 5.35,
        orbitSpeed: 1.2,
        inclination: 0.04,
        color: [238, 246, 255]
      },
      {
        id: 'titan',
        name: 'Titan',
        radius: 0.34,
        orbitDist: 6.55,
        orbitSpeed: 0.65,
        inclination: 0.08,
        color: [235, 165, 78]
      }
    ]
  },
  {
    id: 'uranus',
    name: 'Uranus',
    classification: 'Ice Giant · 97.8° Axial Obliquity & Epsilon Rings',
    orbitAU: 19.22,
    radiusKm: 25362,
    sceneRadius: 1.68,
    orbitalSpeed: 0.06,
    rotationSpeed: -0.62,
    axialTiltDeg: 97.77,
    dayHours: 17.24,
    gravityG: 0.89,
    tempK: 76,
    accent: '#67e8f9',
    atmosphereColor: [115, 238, 252],
    atmosphereIntensity: 0.64,
    rings: {
      innerRadius: 2.15,
      outerRadius: 3.05,
      tiltX: 1.32,
      tiltZ: 0.25,
      style: 'uranus'
    },
    moons: [
      {
        id: 'titania',
        name: 'Titania',
        radius: 0.2,
        orbitDist: 3.75,
        orbitSpeed: 0.88,
        inclination: 0.35,
        color: [195, 208, 218]
      }
    ]
  },
  {
    id: 'neptune',
    name: 'Neptune & Triton',
    classification: 'Supersonic Ice Giant · Methane Clouds & Retrograde Triton',
    orbitAU: 30.05,
    radiusKm: 24622,
    sceneRadius: 1.65,
    orbitalSpeed: 0.045,
    rotationSpeed: 0.68,
    axialTiltDeg: 28.32,
    dayHours: 16.11,
    gravityG: 1.14,
    tempK: 72,
    accent: '#3b82f6',
    atmosphereColor: [65, 138, 255],
    atmosphereIntensity: 0.72,
    moons: [
      {
        id: 'triton',
        name: 'Triton',
        radius: 0.26,
        orbitDist: 3.85,
        orbitSpeed: -0.92,
        inclination: -0.28,
        color: [218, 205, 212]
      }
    ]
  }
];

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

// Fast deterministic 3D value noise & FBM for planetary surface generation
function hash3(ix, iy, iz) {
  let n = ix * 15731 + iy * 789221 + iz * 1376312589;
  n = (n << 13) ^ n;
  return 1.0 - ((n * (n * n * 15731 + 789221) + 1376312589) & 0x7fffffff) / 1073741824.0;
}

function noise3(x, y, z) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fy = y - iy;
  const fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const uz = fz * fz * (3 - 2 * fz);

  const n000 = hash3(ix, iy, iz);
  const n100 = hash3(ix + 1, iy, iz);
  const n010 = hash3(ix, iy + 1, iz);
  const n110 = hash3(ix + 1, iy + 1, iz);
  const n001 = hash3(ix, iy, iz + 1);
  const n101 = hash3(ix + 1, iy, iz + 1);
  const n011 = hash3(ix, iy + 1, iz + 1);
  const n111 = hash3(ix + 1, iy + 1, iz + 1);

  const nx00 = n000 + (n100 - n000) * ux;
  const nx10 = n010 + (n110 - n010) * ux;
  const nx01 = n001 + (n101 - n001) * ux;
  const nx11 = n011 + (n111 - n011) * ux;

  const nxy0 = nx00 + (nx10 - nx00) * uy;
  const nxy1 = nx01 + (nx11 - nx01) * uy;

  return nxy0 + (nxy1 - nxy0) * uz;
}

function fbm3(x, y, z, octaves = 4) {
  let sum = 0;
  let amp = 0.5;
  let freq = 1.0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * noise3(x * freq, y * freq, z * freq);
    freq *= 2.07;
    amp *= 0.5;
  }
  return sum;
}

// Evaluates surface albedo RGB + specular + emissive for a point on unit sphere (nx, ny, nz)
function sampleBodySurface(bodyId, nx, ny, nz, lon, lat, time) {
  switch (bodyId) {
    case 'sun': {
      const gran = fbm3(nx * 5.5 + time * 0.12, ny * 5.5 - time * 0.08, nz * 5.5, 4);
      const spot = fbm3(nx * 2.4, ny * 3.8, nz * 2.4, 3);
      const hot = clamp(0.68 + gran * 0.48 - Math.max(0, spot - 0.32) * 1.1, 0.15, 1.3);
      return {
        r: clamp(Math.round(255 * Math.min(1.0, hot * 1.15)), 180, 255),
        g: clamp(Math.round(185 * hot + 35 * hot * hot), 70, 250),
        b: clamp(Math.round(55 * hot * hot * hot), 10, 195),
        spec: 0.0,
        nightEmit: 1.0
      };
    }

    case 'mercury': {
      const base = fbm3(nx * 3.6, ny * 3.6, nz * 3.6, 4);
      const craters = Math.abs(noise3(nx * 9.5, ny * 9.5, nz * 9.5));
      const rays = Math.pow(clamp(1.0 - craters * 1.6, 0, 1), 2.5) * 0.28;
      const v = clamp(0.48 + base * 0.25 + rays - craters * 0.14, 0.2, 0.88);
      return {
        r: Math.round(v * 205),
        g: Math.round(v * 196),
        b: Math.round(v * 186),
        spec: 0.06,
        nightEmit: 0
      };
    }

    case 'venus': {
      const swirl = fbm3(nx * 2.2 + time * 0.05, ny * 4.5, nz * 2.2, 4);
      const chevrons = Math.sin(lat * 7.5 + swirl * 3.8 + lon * 1.5) * 0.5 + 0.5;
      const band = clamp(0.62 + swirl * 0.22 + chevrons * 0.16, 0.35, 1.0);
      return {
        r: Math.round(244 * band),
        g: Math.round(196 * band * 0.96),
        b: Math.round(118 * band * 0.85),
        spec: 0.18,
        nightEmit: 0
      };
    }

    case 'earth': {
      const cont = fbm3(nx * 2.35 + 1.4, ny * 2.35 - 0.7, nz * 2.35 + 0.9, 5);
      const detail = noise3(nx * 8.5, ny * 8.5, nz * 8.5) * 0.08;
      const elevation = cont + detail - Math.abs(lat) * 0.08;
      const polarIce = smoothstep(1.12, 1.36, Math.abs(lat) + cont * 0.18);
      const clouds = smoothstep(
        0.08,
        0.52,
        fbm3(nx * 3.4 - time * 0.06, ny * 3.8, nz * 3.4 + time * 0.04, 4)
      );

      let r, g, b;
      let spec = 0.05;
      let city = 0.0;

      if (polarIce > 0.65) {
        r = 236;
        g = 244;
        b = 252;
        spec = 0.25;
      } else if (elevation < 0.02) {
        // Deep & shallow ocean
        const shelf = smoothstep(-0.22, 0.02, elevation);
        r = Math.round(lerp(10, 28, shelf));
        g = Math.round(lerp(46, 118, shelf));
        b = Math.round(lerp(118, 188, shelf));
        spec = 0.85 * (1.0 - clouds * 0.8);
      } else {
        // Land biomes: tropical/temperate forest -> savannah/desert -> mountain rock
        const humid = fbm3(nx * 4.0 - 2.1, ny * 4.0, nz * 4.0, 3);
        const desert = smoothstep(0.05, 0.38, Math.abs(Math.abs(lat) - 0.42) < 0.28 ? humid + 0.22 : humid - 0.15);
        const mtn = smoothstep(0.28, 0.52, elevation);
        r = Math.round(lerp(lerp(34, 194, desert), 148, mtn));
        g = Math.round(lerp(lerp(116, 162, desert), 142, mtn));
        b = Math.round(lerp(lerp(48, 96, desert), 136, mtn));

        // Night-side urban clusters near coasts & mid-latitudes
        const urbanNoise = noise3(nx * 18.0, ny * 18.0, nz * 18.0);
        if (elevation < 0.24 && Math.abs(lat) < 1.0 && urbanNoise > 0.32) {
          city = clamp((urbanNoise - 0.32) * 2.2 * (1.0 - clouds * 0.7), 0, 1);
        }
      }

      // Blend dynamic cloud deck
      r = Math.round(lerp(r, 248, clouds * 0.82));
      g = Math.round(lerp(g, 250, clouds * 0.82));
      b = Math.round(lerp(b, 255, clouds * 0.84));

      return { r, g, b, spec, nightEmit: city };
    }

    case 'mars': {
      const albedo = fbm3(nx * 2.8 - 0.5, ny * 2.8 + 1.1, nz * 2.8, 4);
      const canyon = Math.exp(-Math.pow((lat + 0.12) * 9.0, 2)) * smoothstep(0.1, 0.5, Math.sin(lon * 2.0));
      const polarCap = smoothstep(1.24, 1.42, Math.abs(lat) + albedo * 0.12);
      if (polarCap > 0.5) {
        return { r: 238, g: 232, b: 226, spec: 0.15, nightEmit: 0 };
      }
      const darkBasin = smoothstep(-0.35, 0.25, albedo) - canyon * 0.35;
      return {
        r: Math.round(lerp(122, 218, clamp(darkBasin + 0.35, 0, 1))),
        g: Math.round(lerp(58, 108, clamp(darkBasin + 0.35, 0, 1))),
        b: Math.round(lerp(38, 68, clamp(darkBasin + 0.35, 0, 1))),
        spec: 0.05,
        nightEmit: 0
      };
    }

    case 'jupiter': {
      const turb = fbm3(nx * 3.5 + time * 0.04, ny * 9.0, nz * 3.5, 4) * 0.22;
      const latBand = Math.sin((lat + turb) * 18.0);
      const fineZone = Math.cos((lat - turb * 0.6) * 38.0) * 0.5 + 0.5;

      // Great Red Spot at southern tropical latitude
      const dLon = Math.atan2(Math.sin(lon - (0.6 + time * 0.05)), Math.cos(lon - (0.6 + time * 0.05)));
      const dLat = lat + 0.38;
      const grsDist = Math.sqrt((dLon * dLon) / 0.11 + (dLat * dLat) / 0.032);
      const grs = smoothstep(1.15, 0.25, grsDist);

      const zoneMix = clamp(latBand * 0.5 + 0.5, 0, 1);
      let r = lerp(168, 238, zoneMix) - fineZone * 18;
      let g = lerp(112, 206, zoneMix) - fineZone * 22;
      let b = lerp(74, 166, zoneMix) - fineZone * 16;

      if (grs > 0.01) {
        const swirlRing = Math.sin(grsDist * 9.0) * 0.12;
        r = lerp(r, 224 + swirlRing * 40, grs);
        g = lerp(g, 92 + swirlRing * 30, grs);
        b = lerp(b, 62 + swirlRing * 20, grs);
      }

      return {
        r: clamp(Math.round(r), 40, 255),
        g: clamp(Math.round(g), 30, 245),
        b: clamp(Math.round(b), 25, 225),
        spec: 0.12,
        nightEmit: 0
      };
    }

    case 'saturn': {
      const turb = fbm3(nx * 2.5, ny * 8.0, nz * 2.5, 3) * 0.08;
      const band = Math.sin((lat + turb) * 22.0) * 0.5 + 0.5;
      const polarHex = smoothstep(1.15, 1.45, Math.abs(lat));
      const r = lerp(lerp(198, 242, band), 148, polarHex * 0.55);
      const g = lerp(lerp(168, 214, band), 156, polarHex * 0.55);
      const b = lerp(lerp(116, 158, band), 168, polarHex * 0.55);
      return {
        r: Math.round(r),
        g: Math.round(g),
        b: Math.round(b),
        spec: 0.14,
        nightEmit: 0
      };
    }

    case 'uranus': {
      const band = Math.cos(lat * 8.0) * 0.08;
      const haze = smoothstep(0.9, 1.45, Math.abs(lat)) * 0.12;
      return {
        r: clamp(Math.round((0.52 + band + haze) * 255), 90, 215),
        g: clamp(Math.round((0.86 + band * 0.6 + haze * 0.5) * 255), 175, 248),
        b: clamp(Math.round((0.92 + band * 0.4 + haze * 0.3) * 255), 195, 255),
        spec: 0.2,
        nightEmit: 0
      };
    }

    case 'neptune': {
      const stream = fbm3(nx * 3.0 + time * 0.08, ny * 9.5, nz * 3.0, 4);
      const band = Math.sin(lat * 16.0 + stream * 1.8) * 0.14;
      const scooter = smoothstep(0.24, 0.02, Math.abs(lat + 0.45) + Math.abs(Math.sin(lon * 2.0 + time * 0.2)) * 0.35);
      const dLon = Math.atan2(Math.sin(lon + 0.5), Math.cos(lon + 0.5));
      const darkSpot = smoothstep(0.32, 0.06, Math.sqrt(dLon * dLon * 0.6 + (lat + 0.35) * (lat + 0.35) * 2.5));

      let r = 42 + band * 65 - darkSpot * 22 + scooter * 165;
      let g = 98 + band * 85 - darkSpot * 38 + scooter * 135;
      let b = 228 + band * 45 - darkSpot * 32 + scooter * 25;
      return {
        r: clamp(Math.round(r), 18, 250),
        g: clamp(Math.round(g), 45, 252),
        b: clamp(Math.round(b), 120, 255),
        spec: 0.24,
        nightEmit: 0
      };
    }

    default:
      return { r: 180, g: 190, b: 210, spec: 0.1, nightEmit: 0 };
  }
}

// Evaluates Saturn / Uranus ring radial profile: returns { r, g, b, alpha }
function sampleRingProfile(style, normR) {
  if (normR < 0 || normR > 1) return { r: 0, g: 0, b: 0, alpha: 0 };
  if (style === 'uranus') {
    // Narrow high-contrast epsilon & inner dust rings
    const r1 = Math.exp(-Math.pow((normR - 0.22) * 35, 2)) * 0.35;
    const r2 = Math.exp(-Math.pow((normR - 0.54) * 42, 2)) * 0.42;
    const epsilon = Math.exp(-Math.pow((normR - 0.88) * 26, 2)) * 0.68;
    const a = clamp(r1 + r2 + epsilon, 0, 0.72);
    return { r: 165, g: 222, b: 238, alpha: a };
  }

  // Saturn C, B, Cassini Division, A, Encke Gap, F ring
  if (normR < 0.2) {
    // Translucent inner C ring
    const ripple = 0.5 + 0.5 * Math.sin(normR * 190);
    return { r: 168, g: 154, b: 132, alpha: (0.12 + 0.12 * ripple) * smoothstep(0.0, 0.06, normR) };
  }
  if (normR < 0.58) {
    // Dense, luminous B ring with fine ringlets
    const ringlets = 0.78 + 0.22 * Math.sin(normR * 280) * Math.cos(normR * 95);
    return {
      r: Math.round(236 * ringlets),
      g: Math.round(214 * ringlets),
      b: Math.round(172 * ringlets),
      alpha: clamp(0.84 * ringlets, 0.45, 0.92)
    };
  }
  if (normR < 0.65) {
    // Cassini Division (dark gap)
    return { r: 90, g: 82, b: 70, alpha: 0.04 };
  }
  if (normR < 0.94) {
    // Outer A ring with Encke Gap at 0.86
    const encke = Math.abs(normR - 0.86) < 0.014 ? 0.06 : 1.0;
    const wave = 0.84 + 0.16 * Math.cos(normR * 210);
    return {
      r: Math.round(216 * wave),
      g: Math.round(198 * wave),
      b: Math.round(164 * wave),
      alpha: 0.62 * wave * encke
    };
  }
  // Narrow braided F ring near outer edge
  const fRing = Math.exp(-Math.pow((normR - 0.975) * 65, 2));
  return { r: 235, g: 220, b: 185, alpha: fRing * 0.55 };
}

function getBodyWorldPos(body, index, simTime) {
  if (body.id === 'sun') {
    return { x: 0, y: 0, z: 0 };
  }
  const orbitSceneDist = 14 + index * 14.5;
  const angle = index * 1.15 + simTime * body.orbitalSpeed * 0.08;
  return {
    x: Math.cos(angle) * orbitSceneDist,
    y: Math.sin(angle * 2.0 + index) * 0.85,
    z: Math.sin(angle) * orbitSceneDist
  };
}

export function createCelestia(canvas, getParams) {
  const ctx = canvas.getContext('2d');
  let width = canvas.width || 800;
  let height = canvas.height || 600;

  // Generate 900 deep-space stars with realistic spectral classes + Milky Way concentration
  const stars = [];
  const spectralPalette = [
    [155, 185, 255], // O/B blue-white
    [195, 215, 255], // A white-blue
    [248, 247, 255], // F pure white
    [255, 242, 205], // G yellow-white
    [255, 210, 155], // K orange
    [255, 175, 125]  // M red-orange
  ];
  for (let i = 0; i < 850; i++) {
    const s1 = Math.sin(i * 12.9898 + 1.23) * 43758.5453;
    const s2 = Math.sin(i * 78.233 + 4.56) * 28461.1357;
    const s3 = Math.sin(i * 39.425 + 7.89) * 91827.3645;
    const u = s1 - Math.floor(s1);
    const v = s2 - Math.floor(s2);
    const w = s3 - Math.floor(s3);

    const theta = u * Math.PI * 2;
    // Concentrate 45% of stars along an inclined galactic plane
    const inBand = i % 10 < 5;
    const phi = inBand
      ? (v - 0.5) * 0.42 + 0.35 * Math.sin(theta)
      : Math.acos(2 * v - 1) - Math.PI * 0.5;

    const r = 400;
    const col = spectralPalette[Math.floor(w * spectralPalette.length)];
    stars.push({
      x: r * Math.cos(phi) * Math.cos(theta),
      y: r * Math.sin(phi),
      z: r * Math.cos(phi) * Math.sin(theta),
      size: 0.7 + (i % 7 === 0 ? 1.55 : w * 1.15),
      alpha: 0.35 + w * 0.65,
      twinklePhase: u * Math.PI * 2,
      color: col
    });
  }

  let simTime = 12.0;
  let stageElapsed = 0;
  let currentBodyIndex = 3; // Start at Earth & Luna
  let prevBodyIndex = 0;    // Incoming warp from the Sun
  let lastTourMode = 'auto';

  function pickNextBodyIndex(tourMode, currentIdx) {
    if (tourMode && tourMode !== 'auto' && tourMode !== 'inner' && tourMode !== 'giants') {
      const idx = SOLAR_BODIES.findIndex((b) => b.id === tourMode);
      if (idx !== -1) return idx;
    }
    if (tourMode === 'inner') {
      const pool = [0, 1, 2, 3, 4];
      const pos = pool.indexOf(currentIdx);
      return pool[(pos + 1) % pool.length];
    }
    if (tourMode === 'giants') {
      const pool = [5, 6, 7, 8];
      const pos = pool.indexOf(currentIdx);
      return pool[(pos + 1) % pool.length];
    }
    // Full Solar System tour order: Earth -> Mars -> Jupiter -> Saturn -> Uranus -> Neptune -> Sun -> Mercury -> Venus
    const tourOrder = [3, 4, 5, 6, 7, 8, 0, 1, 2];
    const pos = tourOrder.indexOf(currentIdx);
    return tourOrder[(pos + 1) % tourOrder.length];
  }

  function resize(w, h) {
    width = Math.max(300, Math.floor(w || canvas.width || 800));
    height = Math.max(200, Math.floor(h || canvas.height || 600));
  }

  function projectPoint(px, py, pz, camPos, camRight, camUp, camFwd, fovScale) {
    const dx = px - camPos.x;
    const dy = py - camPos.y;
    const dz = pz - camPos.z;
    const cz = dx * camFwd.x + dy * camFwd.y + dz * camFwd.z;
    if (cz <= 0.08) return null;
    const cx = dx * camRight.x + dy * camRight.y + dz * camRight.z;
    const cy = dx * camUp.x + dy * camUp.y + dz * camUp.z;
    return {
      x: width * 0.5 + (cx / cz) * fovScale,
      y: height * 0.5 - (cy / cz) * fovScale,
      z: cz,
      scale: fovScale / cz
    };
  }

  function drawStarfieldAndMilkyWay(camPos, camRight, camUp, camFwd, fovScale, warpFactor) {
    // Deep cosmic background gradient
    const bgGrad = ctx.createRadialGradient(
      width * 0.5,
      height * 0.45,
      Math.min(width, height) * 0.05,
      width * 0.5,
      height * 0.5,
      Math.max(width, height) * 0.85
    );
    bgGrad.addColorStop(0, '#070e1d');
    bgGrad.addColorStop(0.55, '#030711');
    bgGrad.addColorStop(1, '#010308');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Subtle Milky Way nebula glow along the galactic plane
    for (let k = 0; k < 5; k++) {
      const ang = k * 1.25 + 0.4;
      const gx = camPos.x + 350 * Math.cos(ang);
      const gy = camPos.y + 95 * Math.sin(ang);
      const gz = camPos.z + 350 * Math.sin(ang);
      const p = projectPoint(gx, gy, gz, camPos, camRight, camUp, camFwd, fovScale);
      if (p) {
        const rad = Math.max(width, height) * 0.36;
        const neb = ctx.createRadialGradient(p.x, p.y, 10, p.x, p.y, rad);
        neb.addColorStop(0, k % 2 === 0 ? 'rgba(56, 118, 210, 0.07)' : 'rgba(135, 92, 215, 0.055)');
        neb.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = neb;
        ctx.fillRect(p.x - rad, p.y - rad, rad * 2, rad * 2);
      }
    }

    // Project stars (with Celestia hyper-velocity warp streaks during interplanetary transit)
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      const wx = camPos.x + s.x;
      const wy = camPos.y + s.y;
      const wz = camPos.z + s.z;
      const p = projectPoint(wx, wy, wz, camPos, camRight, camUp, camFwd, fovScale);
      if (!p || p.x < -40 || p.x > width + 40 || p.y < -40 || p.y > height + 40) continue;

      const twinkle = 0.78 + 0.22 * Math.sin(simTime * 2.4 + s.twinklePhase);
      const alpha = clamp(s.alpha * twinkle, 0.15, 1.0);
      const [r, g, b] = s.color;

      if (warpFactor > 0.04) {
        const dx = p.x - width * 0.5;
        const dy = p.y - height * 0.5;
        const streak = 1.0 + warpFactor * 0.14;
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${(alpha * 0.85).toFixed(3)})`;
        ctx.lineWidth = s.size;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(width * 0.5 + dx * streak, height * 0.5 + dy * streak);
        ctx.stroke();
      } else {
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, s.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawOrbitalPaths(camPos, camRight, camUp, camFwd, fovScale) {
    ctx.save();
    ctx.lineWidth = 1.0;
    for (let bIdx = 1; bIdx < SOLAR_BODIES.length; bIdx++) {
      const body = SOLAR_BODIES[bIdx];
      const orbitDist = 14 + bIdx * 14.5;
      ctx.strokeStyle = bIdx === currentBodyIndex ? 'rgba(56, 189, 248, 0.34)' : 'rgba(148, 163, 184, 0.13)';
      ctx.beginPath();
      let penDown = false;
      const steps = 64;
      for (let s = 0; s <= steps; s++) {
        const a = (s / steps) * Math.PI * 2;
        const px = Math.cos(a) * orbitDist;
        const py = Math.sin(a * 2.0 + bIdx) * 0.85;
        const pz = Math.sin(a) * orbitDist;
        const proj = projectPoint(px, py, pz, camPos, camRight, camUp, camFwd, fovScale);
        if (proj && proj.x > -200 && proj.x < width + 200 && proj.y > -200 && proj.y < height + 200) {
          if (!penDown) {
            ctx.moveTo(proj.x, proj.y);
            penDown = true;
          } else {
            ctx.lineTo(proj.x, proj.y);
          }
        } else {
          penDown = false;
        }
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  // Renders half of a planetary ring system ('back' = behind planet, 'front' = in front of planet)
  function drawRingHalf(body, bodyPos, sunDir, camPos, camRight, camUp, camFwd, fovScale, pass) {
    if (!body.rings) return;
    const rings = body.rings;
    const cX = Math.cos(rings.tiltX);
    const sX = Math.sin(rings.tiltX);
    const cZ = Math.cos(rings.tiltZ);
    const sZ = Math.sin(rings.tiltZ);

    function ringLocalToWorld(lx, lz) {
      // Rotate ring plane (lx, 0, lz) by tiltX then tiltZ
      const y1 = -lz * sX;
      const z1 = lz * cX;
      const x2 = lx * cZ - y1 * sZ;
      const y2 = lx * sZ + y1 * cZ;
      return { x: bodyPos.x + x2, y: bodyPos.y + y2, z: bodyPos.z + z1 };
    }

    const planetCenterProj = projectPoint(
      bodyPos.x,
      bodyPos.y,
      bodyPos.z,
      camPos,
      camRight,
      camUp,
      camFwd,
      fovScale
    );
    if (!planetCenterProj) return;

    const radialBands = 18;
    const thetaSegs = 68;

    for (let rIdx = 0; rIdx < radialBands; rIdx++) {
      const r0 = lerp(rings.innerRadius, rings.outerRadius, rIdx / radialBands);
      const r1 = lerp(rings.innerRadius, rings.outerRadius, (rIdx + 1) / radialBands);
      const normR = (rIdx + 0.5) / radialBands;
      const sample = sampleRingProfile(rings.style, normR);
      if (sample.alpha < 0.02) continue;

      for (let tIdx = 0; tIdx < thetaSegs; tIdx++) {
        const a0 = (tIdx / thetaSegs) * Math.PI * 2;
        const a1 = ((tIdx + 1) / thetaSegs) * Math.PI * 2;
        const aMid = (a0 + a1) * 0.5;
        const rMid = (r0 + r1) * 0.5;

        const wMid = ringLocalToWorld(Math.cos(aMid) * rMid, Math.sin(aMid) * rMid);
        const pMid = projectPoint(wMid.x, wMid.y, wMid.z, camPos, camRight, camUp, camFwd, fovScale);
        if (!pMid) continue;

        const isBehind = pMid.z >= planetCenterProj.z;
        if ((pass === 'back' && !isBehind) || (pass === 'front' && isBehind)) {
          continue;
        }

        // Check if planet casts a shadow onto this ring segment
        const relX = wMid.x - bodyPos.x;
        const relY = wMid.y - bodyPos.y;
        const relZ = wMid.z - bodyPos.z;
        const sunProj = relX * sunDir.x + relY * sunDir.y + relZ * sunDir.z;
        let shadowMult = 1.0;
        if (sunProj < 0) {
          const perpSq =
            relX * relX + relY * relY + relZ * relZ - sunProj * sunProj;
          const planetR2 = body.sceneRadius * body.sceneRadius;
          if (perpSq < planetR2 * 1.04) {
            shadowMult = smoothstep(planetR2 * 0.82, planetR2 * 1.06, perpSq) * 0.85 + 0.12;
          }
        }

        const w00 = ringLocalToWorld(Math.cos(a0) * r0, Math.sin(a0) * r0);
        const w10 = ringLocalToWorld(Math.cos(a1) * r0, Math.sin(a1) * r0);
        const w11 = ringLocalToWorld(Math.cos(a1) * r1, Math.sin(a1) * r1);
        const w01 = ringLocalToWorld(Math.cos(a0) * r1, Math.sin(a0) * r1);

        const p00 = projectPoint(w00.x, w00.y, w00.z, camPos, camRight, camUp, camFwd, fovScale);
        const p10 = projectPoint(w10.x, w10.y, w10.z, camPos, camRight, camUp, camFwd, fovScale);
        const p11 = projectPoint(w11.x, w11.y, w11.z, camPos, camRight, camUp, camFwd, fovScale);
        const p01 = projectPoint(w01.x, w01.y, w01.z, camPos, camRight, camUp, camFwd, fovScale);
        if (!p00 || !p10 || !p11 || !p01) continue;

        const rr = Math.round(sample.r * shadowMult);
        const gg = Math.round(sample.g * shadowMult);
        const bb = Math.round(sample.b * shadowMult);

        ctx.fillStyle = `rgba(${rr}, ${gg}, ${bb}, ${sample.alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(p00.x, p00.y);
        ctx.lineTo(p10.x, p10.y);
        ctx.lineTo(p11.x, p11.y);
        ctx.lineTo(p01.x, p01.y);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  // High-resolution spherical renderer with axial tilt, spin, terminator lighting, specular glint & night glow
  function drawSphericalBody(body, bodyPos, camPos, camRight, camUp, camFwd, fovScale, detailScale) {
    const centerProj = projectPoint(
      bodyPos.x,
      bodyPos.y,
      bodyPos.z,
      camPos,
      camRight,
      camUp,
      camFwd,
      fovScale
    );
    if (!centerProj) return;

    const screenRadius = body.sceneRadius * centerProj.scale;
    if (screenRadius < 0.8) return;

    // Direction from body to Sun (at origin)
    let sunDir = { x: -bodyPos.x, y: -bodyPos.y, z: -bodyPos.z };
    const sunLen = Math.hypot(sunDir.x, sunDir.y, sunDir.z) || 1;
    sunDir.x /= sunLen;
    sunDir.y /= sunLen;
    sunDir.z /= sunLen;

    // Distant planet dot / beacon when far away
    if (screenRadius < 7.5) {
      const [ar, ag, ab] = body.atmosphereColor || [200, 220, 255];
      const glow = ctx.createRadialGradient(
        centerProj.x,
        centerProj.y,
        0.5,
        centerProj.x,
        centerProj.y,
        Math.max(6, screenRadius * 3.2)
      );
      glow.addColorStop(0, `rgba(255, 255, 255, 0.95)`);
      glow.addColorStop(0.4, `rgba(${ar}, ${ag}, ${ab}, 0.65)`);
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(centerProj.x, centerProj.y, Math.max(6, screenRadius * 3.2), 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    // Back half of planetary rings (occluded by the planet sphere)
    if (body.rings) {
      drawRingHalf(body, bodyPos, sunDir, camPos, camRight, camUp, camFwd, fovScale, 'back');
    }

    // Outer corona / atmospheric Rayleigh scattering halo
    const [ar, ag, ab] = body.atmosphereColor || [120, 185, 255];
    const haloScale = body.isEmissive ? 2.45 : 1.19;
    const haloGrad = ctx.createRadialGradient(
      centerProj.x,
      centerProj.y,
      screenRadius * (body.isEmissive ? 0.85 : 0.94),
      centerProj.x,
      centerProj.y,
      screenRadius * haloScale
    );
    if (body.isEmissive) {
      haloGrad.addColorStop(0, 'rgba(255, 230, 130, 0.85)');
      haloGrad.addColorStop(0.32, 'rgba(255, 150, 35, 0.42)');
      haloGrad.addColorStop(0.7, 'rgba(220, 75, 15, 0.12)');
      haloGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    } else {
      const limbAlpha = (body.atmosphereIntensity || 0.4) * 0.65;
      haloGrad.addColorStop(0, `rgba(${ar}, ${ag}, ${ab}, ${limbAlpha.toFixed(3)})`);
      haloGrad.addColorStop(0.55, `rgba(${ar}, ${ag}, ${ab}, ${(limbAlpha * 0.32).toFixed(3)})`);
      haloGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    }
    ctx.fillStyle = haloGrad;
    ctx.beginPath();
    ctx.arc(centerProj.x, centerProj.y, screenRadius * haloScale, 0, Math.PI * 2);
    ctx.fill();

    // High-resolution 3D tessellated front-hemisphere mesh
    const latBands = clamp(Math.round(clamp(screenRadius * 0.28, 16, 40) * detailScale), 14, 48);
    const lonSegs = clamp(Math.round(latBands * 1.9), 28, 88);

    const tiltRad = ((body.axialTiltDeg || 0) * Math.PI) / 180;
    const cosTilt = Math.cos(tiltRad);
    const sinTilt = Math.sin(tiltRad);
    const spinAngle = simTime * (body.rotationSpeed || 0.3);
    const cosSpin = Math.cos(spinAngle);
    const sinSpin = Math.sin(spinAngle);

    function bodyNormalToWorld(nx, ny, nz) {
      // Spin around body Y axis, then axial tilt around Z axis
      const sx = nx * cosSpin - nz * sinSpin;
      const sz = nx * sinSpin + nz * cosSpin;
      const tx = sx * cosTilt - ny * sinTilt;
      const ty = sx * sinTilt + ny * cosTilt;
      return { x: tx, y: ty, z: sz };
    }

    for (let i = 0; i < latBands; i++) {
      const lat0 = ((i / latBands) - 0.5) * Math.PI;
      const lat1 = (((i + 1) / latBands) - 0.5) * Math.PI;
      const latMid = (lat0 + lat1) * 0.5;
      const cosLat0 = Math.cos(lat0);
      const sinLat0 = Math.sin(lat0);
      const cosLat1 = Math.cos(lat1);
      const sinLat1 = Math.sin(lat1);
      const cosLatMid = Math.cos(latMid);
      const sinLatMid = Math.sin(latMid);

      for (let j = 0; j < lonSegs; j++) {
        const lon0 = (j / lonSegs) * Math.PI * 2;
        const lon1 = ((j + 1) / lonSegs) * Math.PI * 2;
        const lonMid = (lon0 + lon1) * 0.5;

        const lnx = cosLatMid * Math.cos(lonMid);
        const lny = sinLatMid;
        const lnz = cosLatMid * Math.sin(lonMid);
        const wn = bodyNormalToWorld(lnx, lny, lnz);

        // Vector from surface point to camera for backface culling & Fresnel limb angle
        const surfX = bodyPos.x + wn.x * body.sceneRadius;
        const surfY = bodyPos.y + wn.y * body.sceneRadius;
        const surfZ = bodyPos.z + wn.z * body.sceneRadius;
        let vx = camPos.x - surfX;
        let vy = camPos.y - surfY;
        let vz = camPos.z - surfZ;
        const vLen = Math.hypot(vx, vy, vz) || 1;
        vx /= vLen;
        vy /= vLen;
        vz /= vLen;

        const nDotV = wn.x * vx + wn.y * vy + wn.z * vz;
        if (nDotV <= -0.04) continue; // Back-facing facet

        // Sample high-resolution procedural planetary map
        const surf = sampleBodySurface(body.id, lnx, lny, lnz, lonMid, latMid, simTime);

        let r, g, b;
        if (body.isEmissive) {
          const limbDark = Math.pow(clamp(nDotV, 0.05, 1.0), 0.38);
          r = Math.round(surf.r * (0.78 + 0.22 * limbDark));
          g = Math.round(surf.g * limbDark);
          b = Math.round(surf.b * limbDark * limbDark);
        } else {
          // Lambertian + soft terminator wrap + Blinn-Phong ocean/ice specular + Rayleigh limb glow
          const nDotL = wn.x * sunDir.x + wn.y * sunDir.y + wn.z * sunDir.z;
          const diff = clamp((nDotL + 0.1) / 1.1, 0.0, 1.0);
          const twilight = Math.exp(-Math.pow(nDotL * 5.5, 2)) * (body.atmosphereIntensity || 0.25);

          // Half-vector specular reflection (bright sunglint over Earth's oceans & icy moons)
          let hx = sunDir.x + vx;
          let hy = sunDir.y + vy;
          let hz = sunDir.z + vz;
          const hLen = Math.hypot(hx, hy, hz) || 1;
          hx /= hLen;
          hy /= hLen;
          hz /= hLen;
          const nDotH = Math.max(0, wn.x * hx + wn.y * hy + wn.z * hz);
          const specTerm = nDotL > 0 ? Math.pow(nDotH, 28) * surf.spec * 185 : 0;

          // Rayleigh atmospheric scattering at the grazing horizon limb
          const fresnel = Math.pow(1.0 - clamp(nDotV, 0, 1), 2.8) * clamp(nDotL + 0.35, 0.08, 1.0);
          const atmo = fresnel * (body.atmosphereIntensity || 0.25);

          // Night-side city lights on dark hemisphere
          const nightMask = smoothstep(0.08, -0.25, nDotL) * (surf.nightEmit || 0);

          const ambient = 0.055;
          const lightVal = ambient + diff * 0.96;

          r = surf.r * lightVal + specTerm + ar * atmo + 255 * twilight * 0.32 + nightMask * 255;
          g = surf.g * lightVal + specTerm * 0.95 + ag * atmo + 125 * twilight * 0.22 + nightMask * 195;
          b = surf.b * lightVal + specTerm * 0.85 + ab * atmo + 65 * twilight * 0.12 + nightMask * 95;
        }

        const n00 = bodyNormalToWorld(cosLat0 * Math.cos(lon0), sinLat0, cosLat0 * Math.sin(lon0));
        const n10 = bodyNormalToWorld(cosLat0 * Math.cos(lon1), sinLat0, cosLat0 * Math.sin(lon1));
        const n11 = bodyNormalToWorld(cosLat1 * Math.cos(lon1), sinLat1, cosLat1 * Math.sin(lon1));
        const n01 = bodyNormalToWorld(cosLat1 * Math.cos(lon0), sinLat1, cosLat1 * Math.sin(lon0));

        const p00 = projectPoint(
          bodyPos.x + n00.x * body.sceneRadius,
          bodyPos.y + n00.y * body.sceneRadius,
          bodyPos.z + n00.z * body.sceneRadius,
          camPos,
          camRight,
          camUp,
          camFwd,
          fovScale
        );
        const p10 = projectPoint(
          bodyPos.x + n10.x * body.sceneRadius,
          bodyPos.y + n10.y * body.sceneRadius,
          bodyPos.z + n10.z * body.sceneRadius,
          camPos,
          camRight,
          camUp,
          camFwd,
          fovScale
        );
        const p11 = projectPoint(
          bodyPos.x + n11.x * body.sceneRadius,
          bodyPos.y + n11.y * body.sceneRadius,
          bodyPos.z + n11.z * body.sceneRadius,
          camPos,
          camRight,
          camUp,
          camFwd,
          fovScale
        );
        const p01 = projectPoint(
          bodyPos.x + n01.x * body.sceneRadius,
          bodyPos.y + n01.y * body.sceneRadius,
          bodyPos.z + n01.z * body.sceneRadius,
          camPos,
          camRight,
          camUp,
          camFwd,
          fovScale
        );
        if (!p00 || !p10 || !p11 || !p01) continue;

        const colorStr = `rgb(${clamp(Math.round(r), 0, 255)}, ${clamp(Math.round(g), 0, 255)}, ${clamp(Math.round(b), 0, 255)})`;
        ctx.fillStyle = colorStr;
        ctx.strokeStyle = colorStr;
        ctx.lineWidth = 0.85;
        ctx.beginPath();
        ctx.moveTo(p00.x, p00.y);
        ctx.lineTo(p10.x, p10.y);
        ctx.lineTo(p11.x, p11.y);
        ctx.lineTo(p01.x, p01.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }

    // Front half of planetary rings (passes in front of the planet sphere)
    if (body.rings) {
      drawRingHalf(body, bodyPos, sunDir, camPos, camRight, camUp, camFwd, fovScale, 'front');
    }

    // Render natural satellites (moons) orbiting this planet
    if (body.moons && body.moons.length > 0) {
      for (let mIdx = 0; mIdx < body.moons.length; mIdx++) {
        const moon = body.moons[mIdx];
        const mAngle = simTime * moon.orbitSpeed + mIdx * 2.1;
        const mx = bodyPos.x + Math.cos(mAngle) * moon.orbitDist;
        const my = bodyPos.y + Math.sin(mAngle) * moon.orbitDist * moon.inclination;
        const mz = bodyPos.z + Math.sin(mAngle) * moon.orbitDist;
        const mProj = projectPoint(mx, my, mz, camPos, camRight, camUp, camFwd, fovScale);
        if (!mProj) continue;

        const mScreenR = Math.max(2.2, moon.radius * mProj.scale);
        const [mr, mg, mb] = moon.color;

        // Shading direction on moon relative to Sun
        const sunScreenX = sunDir.x * camRight.x + sunDir.y * camRight.y + sunDir.z * camRight.z;
        const sunScreenY = -(sunDir.x * camUp.x + sunDir.y * camUp.y + sunDir.z * camUp.z);
        const mGrad = ctx.createRadialGradient(
          mProj.x + sunScreenX * mScreenR * 0.45,
          mProj.y + sunScreenY * mScreenR * 0.45,
          mScreenR * 0.1,
          mProj.x,
          mProj.y,
          mScreenR
        );
        mGrad.addColorStop(0, `rgb(${Math.min(255, mr + 35)}, ${Math.min(255, mg + 35)}, ${Math.min(255, mb + 35)})`);
        mGrad.addColorStop(0.68, `rgb(${mr}, ${mg}, ${mb})`);
        mGrad.addColorStop(1, `rgb(${Math.round(mr * 0.15)}, ${Math.round(mg * 0.15)}, ${Math.round(mb * 0.18)})`);

        ctx.fillStyle = mGrad;
        ctx.beginPath();
        ctx.arc(mProj.x, mProj.y, mScreenR, 0, Math.PI * 2);
        ctx.fill();

        if (mScreenR > 4.5 && screenRadius > 28) {
          ctx.fillStyle = 'rgba(226, 232, 240, 0.78)';
          ctx.font = '600 10px "JetBrains Mono", "Fira Code", monospace';
          ctx.fillText(moon.name, mProj.x + mScreenR + 5, mProj.y + 3);
        }
      }
    }
  }

  function drawCelestiaHud(body, distSceneUnits, flightPhaseLabel, velocityLabel, progressRatio) {
    ctx.save();
    const padX = 22;
    const padY = 20;

    // Convert scene distance above surface into realistic astronomical units (km or AU)
    const altitudeRatios = Math.max(0.08, (distSceneUnits - body.sceneRadius) / body.sceneRadius);
    const altitudeKm = altitudeRatios * body.radiusKm;
    const distFormatted =
      altitudeKm > 1500000
        ? `${(altitudeKm / 149597870.7).toFixed(3)} AU`
        : `${Math.round(altitudeKm).toLocaleString()} km`;

    const apparentDeg = clamp(
      (2 * Math.atan(body.sceneRadius / Math.max(body.sceneRadius * 1.02, distSceneUnits)) * 180) / Math.PI,
      0.1,
      145.0
    );

    // Top-left Celestia Target Telemetry Panel
    const boxW = Math.min(390, width - 40);
    const boxH = 122;
    ctx.fillStyle = 'rgba(6, 12, 24, 0.74)';
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.34)';
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

    ctx.fillStyle = body.accent || '#38bdf8';
    ctx.font = '700 16px "Inter", "Segoe UI", sans-serif';
    ctx.fillText(`CELESTIA // ${body.name.toUpperCase()}`, padX + 14, padY + 25);

    ctx.fillStyle = 'rgba(186, 230, 253, 0.88)';
    ctx.font = '500 11px "JetBrains Mono", "Fira Code", monospace';
    ctx.fillText(body.classification, padX + 14, padY + 44);

    ctx.fillStyle = 'rgba(226, 232, 240, 0.92)';
    ctx.font = '500 11.5px "JetBrains Mono", "Fira Code", monospace';
    ctx.fillText(
      `Distance: ${distFormatted}   Apparent Ø: ${apparentDeg.toFixed(1)}°`,
      padX + 14,
      padY + 66
    );
    ctx.fillText(
      `Radius: ${body.radiusKm.toLocaleString()} km   Heliocentric: ${body.orbitAU.toFixed(2)} AU`,
      padX + 14,
      padY + 86
    );
    ctx.fillText(
      `Obliquity: ${body.axialTiltDeg}°   Gravity: ${body.gravityG}g   Temp: ${body.tempK} K`,
      padX + 14,
      padY + 106
    );

    // Bottom-left Navigation & Flight Mode Bar
    const navY = height - 64;
    const navW = Math.min(390, width - 40);
    ctx.fillStyle = 'rgba(6, 12, 24, 0.72)';
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.28)';
    if (typeof ctx.roundRect === 'function') {
      ctx.beginPath();
      ctx.roundRect(padX, navY, navW, 44, 8);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillRect(padX, navY, navW, 44);
      ctx.strokeRect(padX, navY, navW, 44);
    }

    ctx.fillStyle = '#38bdf8';
    ctx.font = '600 11px "JetBrains Mono", "Fira Code", monospace';
    ctx.fillText(`MODE: ${flightPhaseLabel}`, padX + 14, navY + 18);

    ctx.fillStyle = '#e2e8f0';
    ctx.fillText(`VEL: ${velocityLabel}`, padX + 225, navY + 18);

    // Progress bar for current world visit
    const barX = padX + 14;
    const barY = navY + 28;
    const barW = navW - 28;
    ctx.fillStyle = 'rgba(51, 65, 85, 0.65)';
    ctx.fillRect(barX, barY, barW, 5);
    ctx.fillStyle = body.accent || '#38bdf8';
    ctx.fillRect(barX, barY, barW * clamp(progressRatio, 0, 1), 5);

    ctx.restore();
  }

  function render(dt = 0.016) {
    const p = (typeof getParams === 'function' ? getParams() : {}) || {};
    const flightSpeed = Number(p.flightSpeed ?? 1.0);
    const dwellSeconds = Math.max(5, Number(p.dwellSeconds ?? 14));
    const tourMode = String(p.tourMode || 'auto');
    const detailScale = Number(p.textureDetail ?? 1.0);
    const showOrbits = p.showOrbits !== false;
    const showHud = p.showHud !== false;

    const scaledDt = dt * clamp(flightSpeed, 0.25, 3.0);
    simTime += scaledDt;
    stageElapsed += scaledDt;

    if (tourMode !== lastTourMode) {
      lastTourMode = tourMode;
      if (tourMode !== 'auto' && tourMode !== 'inner' && tourMode !== 'giants') {
        const targetIdx = SOLAR_BODIES.findIndex((b) => b.id === tourMode);
        if (targetIdx !== -1 && targetIdx !== currentBodyIndex) {
          prevBodyIndex = currentBodyIndex;
          currentBodyIndex = targetIdx;
          stageElapsed = 0;
        }
      }
    }

    const warpDuration = 3.2;
    const totalCycle = warpDuration + dwellSeconds;
    if (stageElapsed >= totalCycle) {
      const nextIdx = pickNextBodyIndex(tourMode, currentBodyIndex);
      if (nextIdx !== currentBodyIndex) {
        prevBodyIndex = currentBodyIndex;
        currentBodyIndex = nextIdx;
      }
      stageElapsed = 0;
    }

    // Compute world positions for all solar bodies
    const bodyPositions = SOLAR_BODIES.map((b, idx) => getBodyWorldPos(b, idx, simTime));
    const targetBody = SOLAR_BODIES[currentBodyIndex];
    const targetPos = bodyPositions[currentBodyIndex];
    const fromBody = SOLAR_BODIES[prevBodyIndex];
    const fromPos = bodyPositions[prevBodyIndex];

    // Camera flight choreography:
    // Phase 1 (0 -> warpDuration): Interplanetary hyper-warp from previous world to arrival approach
    // Phase 2 (warpDuration -> totalCycle): Low-altitude orbital flyby with high-res zoom near terminator & rings
    let camPos;
    let lookAt;
    let warpFactor = 0.0;
    let flightPhaseLabel = 'ORBITAL RECONNAISSANCE';
    let velocityLabel = '28.4 km/s';

    const orbitAngle = stageElapsed * 0.44 + currentBodyIndex * 0.9;
    // Zoom in very close during mid-flyby, then pull back slightly before next warp
    const flybyProgress = clamp((stageElapsed - warpDuration) / dwellSeconds, 0, 1);
    const zoomCurve = Math.sin(flybyProgress * Math.PI); // 0 -> 1 (closest zoom) -> 0
    const closestStandOff = targetBody.sceneRadius * (targetBody.rings ? 2.45 : 1.92);
    const outerStandOff = targetBody.sceneRadius * (targetBody.rings ? 4.35 : 3.45);
    const orbitDist = lerp(outerStandOff, closestStandOff, zoomCurve);
    const orbitElev =
      Math.sin(flybyProgress * Math.PI * 2.0) * targetBody.sceneRadius * (targetBody.rings ? 1.15 : 0.62);

    const arrivalPos = {
      x: targetPos.x + Math.cos(orbitAngle) * orbitDist,
      y: targetPos.y + orbitElev,
      z: targetPos.z + Math.sin(orbitAngle) * orbitDist
    };

    if (stageElapsed < warpDuration && prevBodyIndex !== currentBodyIndex) {
      const u = clamp(stageElapsed / warpDuration, 0, 1);
      // Quintic smoothstep for silk-smooth Celestia acceleration & deceleration
      const ease = u * u * u * (u * (u * 6 - 15) + 10);
      warpFactor = Math.sin(u * Math.PI);

      const departOffset = fromBody.sceneRadius * 3.5;
      const startX = fromPos.x + departOffset;
      const startY = fromPos.y + departOffset * 0.4;
      const startZ = fromPos.z + departOffset;

      // Arc slightly above the ecliptic during warp
      const arcLift = Math.sin(u * Math.PI) * 6.5;
      camPos = {
        x: lerp(startX, arrivalPos.x, ease),
        y: lerp(startY, arrivalPos.y, ease) + arcLift,
        z: lerp(startZ, arrivalPos.z, ease)
      };
      lookAt = {
        x: lerp(fromPos.x, targetPos.x, smoothstep(0.0, 0.55, u)),
        y: lerp(fromPos.y, targetPos.y, smoothstep(0.0, 0.55, u)),
        z: lerp(fromPos.z, targetPos.z, smoothstep(0.0, 0.55, u))
      };
      flightPhaseLabel = 'INTERPLANETARY WARP';
      velocityLabel = `${(0.15 + warpFactor * 4.8).toFixed(2)} AU/s`;
    } else {
      camPos = arrivalPos;
      // Pan slightly across the planet horizon / ring plane during close zoom
      const horizonShift = Math.cos(flybyProgress * Math.PI * 2) * targetBody.sceneRadius * 0.26;
      lookAt = {
        x: targetPos.x - Math.sin(orbitAngle) * horizonShift,
        y: targetPos.y + Math.sin(flybyProgress * Math.PI) * targetBody.sceneRadius * 0.12,
        z: targetPos.z + Math.cos(orbitAngle) * horizonShift
      };
      if (targetBody.rings && Math.abs(orbitElev) < targetBody.sceneRadius * 0.35) {
        flightPhaseLabel = 'RING PLANE CROSSING';
      } else if (zoomCurve > 0.68) {
        flightPhaseLabel = 'HIGH-RES TERMINATOR ZOOM';
      } else {
        flightPhaseLabel = 'ORBITAL FLYBY';
      }
      const orbitalVel = Math.sqrt(targetBody.gravityG * 9.81 * (targetBody.radiusKm * 0.45)) * (1 + zoomCurve * 0.35);
      velocityLabel = `${orbitalVel.toFixed(1)} km/s`;
    }

    // Build orthonormal camera basis
    let fwd = {
      x: lookAt.x - camPos.x,
      y: lookAt.y - camPos.y,
      z: lookAt.z - camPos.z
    };
    const fwdLen = Math.hypot(fwd.x, fwd.y, fwd.z) || 1;
    fwd.x /= fwdLen;
    fwd.y /= fwdLen;
    fwd.z /= fwdLen;

    const worldUp = { x: 0, y: 1, z: 0 };
    let right = {
      x: fwd.y * worldUp.z - fwd.z * worldUp.y,
      y: fwd.z * worldUp.x - fwd.x * worldUp.z,
      z: fwd.x * worldUp.y - fwd.y * worldUp.x
    };
    const rLen = Math.hypot(right.x, right.y, right.z) || 1;
    right.x /= rLen;
    right.y /= rLen;
    right.z /= rLen;

    const up = {
      x: right.y * fwd.z - right.z * fwd.y,
      y: right.z * fwd.x - right.x * fwd.z,
      z: right.x * fwd.y - right.y * fwd.x
    };

    const fovScale = Math.min(width, height) * 0.92;

    // 1. Starfield & Milky Way background
    drawStarfieldAndMilkyWay(camPos, right, up, fwd, fovScale, warpFactor);

    // 2. Optional 3D heliocentric orbital paths
    if (showOrbits) {
      drawOrbitalPaths(camPos, right, up, fwd, fovScale);
    }

    // 3. Painter's algorithm depth sort of all Solar System bodies from farthest to nearest
    const drawOrder = SOLAR_BODIES.map((body, idx) => {
      const pos = bodyPositions[idx];
      const d = Math.hypot(pos.x - camPos.x, pos.y - camPos.y, pos.z - camPos.z);
      return { body, pos, dist: d };
    }).sort((a, b) => b.dist - a.dist);

    for (let i = 0; i < drawOrder.length; i++) {
      const item = drawOrder[i];
      drawSphericalBody(item.body, item.pos, camPos, right, up, fwd, fovScale, detailScale);
    }

    // 4. Celestia Astronomical Telemetry HUD
    if (showHud) {
      const distToTarget = Math.hypot(
        targetPos.x - camPos.x,
        targetPos.y - camPos.y,
        targetPos.z - camPos.z
      );
      drawCelestiaHud(
        targetBody,
        distToTarget,
        flightPhaseLabel,
        velocityLabel,
        stageElapsed / totalCycle
      );
    }
  }

  function destroy() {}

  return { render, resize, destroy };
}
