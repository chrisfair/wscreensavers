// Classical Sculptures Gallery (sculptures3d.js)
//
// Three.js WebGL2 museum gallery showcasing 8 public-domain ancient and Renaissance
// sculptures with continuous 360-degree orbital camera views and museum location plaques:
//   1. David (Michelangelo, 1501-1504) — Galleria dell'Accademia, Florence, Italy
//   2. Pietà (Michelangelo, 1498-1499) — St. Peter's Basilica, Vatican City
//   3. Venus de Milo (Alexandros of Antioch, c. 150-125 BCE) — Musée du Louvre, Paris, France
//   4. Winged Victory of Samothrace (c. 190 BCE) — Musée du Louvre, Paris, France
//   5. The Thinker (Auguste Rodin, 1880/1904) — Musée Rodin, Paris, France
//   6. Discobolus (Myron, c. 450 BCE) — Museo Nazionale Romano, Rome, Italy
//   7. Bust of Nefertiti (Thutmose, c. 1345 BCE) — Neues Museum, Berlin, Germany
//   8. Moai — Hoa Hakananai'a (c. 1000-1200 CE) — Rapa Nui, Chile / British Museum, London, UK

import * as THREE from 'three';

const TAU = Math.PI * 2;

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

const SCULPTURE_CATALOG = [
  {
    id: 'david',
    title: 'David',
    artist: 'Michelangelo Buonarroti',
    date: '1501–1504',
    medium: 'Carrara marble · 5.17 m (17 ft)',
    location: "Galleria dell'Accademia · Florence, Italy",
    era: 'High Renaissance · Public Domain',
    focusY: 2.35,
    camDist: 6.2,
    materialKind: 'carrara'
  },
  {
    id: 'pieta',
    title: 'Pietà',
    artist: 'Michelangelo Buonarroti',
    date: '1498–1499',
    medium: 'Carrara marble · 1.74 m × 1.95 m',
    location: "St. Peter's Basilica · Vatican City",
    era: 'High Renaissance · Public Domain',
    focusY: 1.85,
    camDist: 5.5,
    materialKind: 'carrara'
  },
  {
    id: 'venus_de_milo',
    title: 'Venus de Milo (Aphrodite of Melos)',
    artist: 'Alexandros of Antioch',
    date: 'c. 150–125 BCE',
    medium: 'Parian marble · 2.04 m',
    location: 'Musée du Louvre · Paris, France',
    era: 'Hellenistic Greece · Public Domain',
    focusY: 2.2,
    camDist: 5.8,
    materialKind: 'parian'
  },
  {
    id: 'winged_victory',
    title: 'Winged Victory of Samothrace (Nike)',
    artist: 'Hellenistic Greek Master',
    date: 'c. 190 BCE',
    medium: 'Parian marble & Lartos stone prow · 5.57 m',
    location: 'Musée du Louvre · Paris, France',
    era: 'Hellenistic Greece · Public Domain',
    focusY: 2.55,
    camDist: 6.8,
    materialKind: 'parian'
  },
  {
    id: 'the_thinker',
    title: 'The Thinker (Le Penseur)',
    artist: 'Auguste Rodin',
    date: '1880 (cast 1904)',
    medium: 'Patinated bronze · 1.86 m',
    location: 'Musée Rodin · Paris, France',
    era: 'Modern Classical · Public Domain',
    focusY: 1.95,
    camDist: 5.4,
    materialKind: 'bronze'
  },
  {
    id: 'discobolus',
    title: 'Discobolus (The Discus Thrower)',
    artist: 'Myron of Eleutherae (Roman copy)',
    date: 'c. 450 BCE',
    medium: 'Pentelic marble · 1.55 m',
    location: 'Museo Nazionale Romano · Rome, Italy',
    era: 'Classical Greece · Public Domain',
    focusY: 2.0,
    camDist: 5.9,
    materialKind: 'carrara'
  },
  {
    id: 'nefertiti',
    title: 'Bust of Nefertiti',
    artist: 'Thutmose (Royal Sculptor)',
    date: 'c. 1345 BCE',
    medium: 'Painted limestone & stucco · 48 cm',
    location: 'Neues Museum · Berlin, Germany',
    era: 'Amarna Period, Ancient Egypt · Public Domain',
    focusY: 2.15,
    camDist: 4.8,
    materialKind: 'limestone'
  },
  {
    id: 'moai',
    title: "Moai (Hoa Hakananai'a)",
    artist: 'Rapa Nui Master Carvers',
    date: 'c. 1000–1200 CE',
    medium: 'Carved volcanic basalt · 2.42 m',
    location: 'Rapa Nui, Chile · British Museum, London, UK',
    era: 'Polynesian Antiquity · Public Domain',
    focusY: 2.25,
    camDist: 5.8,
    materialKind: 'basalt'
  }
];

function createGalleryEnvTexture() {
  const cvs = document.createElement('canvas');
  cvs.width = 512;
  cvs.height = 256;
  const ctx = cvs.getContext('2d');
  if (!ctx) return null;

  const bg = ctx.createLinearGradient(0, 0, 0, 256);
  bg.addColorStop(0.0, '#10141e');
  bg.addColorStop(0.42, '#242938');
  bg.addColorStop(0.54, '#3a342c');
  bg.addColorStop(1.0, '#0c0d11');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 256);

  const spots = [
    { x: 120, y: 46, r: 62, c: 'rgba(255, 245, 224, 0.92)' },
    { x: 375, y: 54, r: 54, c: 'rgba(204, 224, 255, 0.78)' },
    { x: 256, y: 34, r: 44, c: 'rgba(255, 236, 198, 0.85)' }
  ];
  for (const s of spots) {
    const g = ctx.createRadialGradient(s.x, s.y, 2, s.x, s.y, s.r);
    g.addColorStop(0, s.c);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, TAU);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(cvs);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.needsUpdate = true;
  return tex;
}

function createStoneTexture(kind) {
  const cvs = document.createElement('canvas');
  cvs.width = 256;
  cvs.height = 256;
  const ctx = cvs.getContext('2d');
  if (!ctx) return null;

  if (kind === 'carrara' || kind === 'parian') {
    ctx.fillStyle = kind === 'carrara' ? '#ecebe7' : '#e6dfd1';
    ctx.fillRect(0, 0, 256, 256);
    const veinColor = kind === 'carrara' ? 'rgba(130,136,148,0.16)' : 'rgba(148,132,108,0.16)';
    ctx.strokeStyle = veinColor;
    for (let i = 0; i < 24; i++) {
      ctx.lineWidth = 0.8 + (i % 3) * 0.9;
      ctx.beginPath();
      let x = (i * 29) % 256;
      let y = 0;
      ctx.moveTo(x, y);
      for (let step = 1; step <= 10; step++) {
        x += Math.sin(step * 0.8 + i * 1.7) * 14;
        y = step * 26;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  } else if (kind === 'bronze') {
    ctx.fillStyle = '#332d26';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 160; i++) {
      const x = (i * 73) % 256;
      const y = (i * 41) % 256;
      const r = 4 + (i % 14);
      ctx.fillStyle = i % 3 === 0 ? 'rgba(66, 98, 84, 0.14)' : 'rgba(128, 96, 56, 0.12)';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fill();
    }
  } else if (kind === 'basalt') {
    ctx.fillStyle = '#474542';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 420; i++) {
      const x = (i * 53 + (i % 7) * 11) % 256;
      const y = (i * 89 + (i % 5) * 17) % 256;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(28,27,25,0.34)' : 'rgba(110,106,99,0.22)';
      ctx.fillRect(x, y, 2 + (i % 3), 2 + (i % 2));
    }
  } else {
    // Painted limestone / sandstone base
    ctx.fillStyle = '#d3b28e';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 180; i++) {
      const x = (i * 61) % 256;
      const y = (i * 37) % 256;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(166,128,90,0.12)' : 'rgba(235,212,182,0.12)';
      ctx.fillRect(x, y, 3, 2);
    }
  }

  const tex = new THREE.CanvasTexture(cvs);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

function makeTubeLimb(points, radiusTop, radiusBot, mat, tubularSegs = 18, radialSegs = 12) {
  const vecs = points.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
  const curve = new THREE.CatmullRomCurve3(vecs);
  const geo = new THREE.TubeGeometry(curve, tubularSegs, 1.0, radialSegs, false);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  const c = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    const ringIdx = Math.floor(i / (radialSegs + 1));
    const t = clamp(ringIdx / tubularSegs, 0, 1);
    curve.getPointAt(t, c);
    v.fromBufferAttribute(pos, i).sub(c);
    const rad = radiusTop + (radiusBot - radiusTop) * t;
    v.multiplyScalar(rad).add(c);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function makeSculptedPart(geo, mat, pos, rot, scale) {
  const m = new THREE.Mesh(geo, mat);
  if (pos) m.position.set(pos[0], pos[1], pos[2]);
  if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
  if (scale) m.scale.set(scale[0], scale[1], scale[2]);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function addClassicalHead(group, mat, x, y, z, yaw = 0, pitch = 0, scale = 1.0, curlyHair = true) {
  const headGroup = new THREE.Group();
  headGroup.position.set(x, y, z);
  headGroup.rotation.set(pitch, yaw, 0);
  headGroup.scale.setScalar(scale);

  // Cranium & jaw
  headGroup.add(makeSculptedPart(new THREE.SphereGeometry(0.24, 22, 18), mat, [0, 0.04, 0], null, [0.88, 1.08, 0.96]));
  headGroup.add(makeSculptedPart(new THREE.SphereGeometry(0.16, 16, 14), mat, [0, -0.10, 0.06], null, [0.85, 0.85, 0.82]));
  // Nose bridge & brow ridge
  headGroup.add(makeSculptedPart(new THREE.BoxGeometry(0.055, 0.13, 0.08), mat, [0, 0.01, 0.21], [0.15, 0, 0]));
  headGroup.add(makeSculptedPart(new THREE.BoxGeometry(0.24, 0.045, 0.07), mat, [0, 0.09, 0.18]));

  if (curlyHair) {
    const curls = [
      [-0.14, 0.18, 0.08, 0.11], [0.0, 0.22, 0.06, 0.12], [0.14, 0.18, 0.08, 0.11],
      [-0.19, 0.10, -0.02, 0.11], [0.19, 0.10, -0.02, 0.11], [-0.15, 0.12, -0.14, 0.12],
      [0.0, 0.14, -0.18, 0.13], [0.15, 0.12, -0.14, 0.12], [-0.13, -0.02, -0.17, 0.10],
      [0.0, -0.03, -0.19, 0.11], [0.13, -0.02, -0.17, 0.10]
    ];
    for (const c of curls) {
      headGroup.add(makeSculptedPart(new THREE.DodecahedronGeometry(c[3], 1), mat, [c[0], c[1], c[2]]));
    }
  }

  group.add(headGroup);
  return headGroup;
}

function buildDavid(mat) {
  const g = new THREE.Group();
  // Carved marble plinth & tree stump support behind right leg
  g.add(makeSculptedPart(new THREE.CylinderGeometry(0.68, 0.72, 0.18, 28), mat, [0, 0.09, 0]));
  g.add(makeSculptedPart(new THREE.CylinderGeometry(0.11, 0.16, 1.35, 12), mat, [-0.28, 0.80, -0.18], [0.08, 0, -0.06]));

  // Right load-bearing leg (straight) + left contrapposto relaxed leg (bent knee)
  g.add(makeTubeLimb([[-0.18, 1.98, 0.0], [-0.19, 1.15, -0.03], [-0.21, 0.22, -0.04]], 0.18, 0.10, mat));
  g.add(makeTubeLimb([[0.18, 1.92, 0.02], [0.27, 1.12, 0.18], [0.29, 0.22, 0.05]], 0.17, 0.095, mat));
  g.add(makeSculptedPart(new THREE.BoxGeometry(0.18, 0.11, 0.34), mat, [-0.21, 0.20, 0.05]));
  g.add(makeSculptedPart(new THREE.BoxGeometry(0.17, 0.10, 0.34), mat, [0.30, 0.20, 0.12], [0, 0.22, 0]));

  // Pelvis & sculpted contrapposto torso (slightly shifted hip)
  g.add(makeSculptedPart(new THREE.SphereGeometry(0.32, 22, 16), mat, [-0.03, 2.08, 0.0], [0, 0, -0.08], [1.14, 0.82, 0.78]));
  const torsoPts = [
    new THREE.Vector2(0.28, 0.0),
    new THREE.Vector2(0.26, 0.28),
    new THREE.Vector2(0.35, 0.68),
    new THREE.Vector2(0.41, 1.02),
    new THREE.Vector2(0.24, 1.18)
  ];
  g.add(makeSculptedPart(new THREE.LatheGeometry(torsoPts, 24), mat, [0.0, 2.12, 0.0], [0, 0, 0.04], [1.08, 1.0, 0.66]));
  // Pectoral & shoulder definition
  g.add(makeSculptedPart(new THREE.SphereGeometry(0.18, 16, 14), mat, [-0.17, 2.98, 0.13], null, [1.05, 0.72, 0.62]));
  g.add(makeSculptedPart(new THREE.SphereGeometry(0.18, 16, 14), mat, [0.17, 2.96, 0.13], null, [1.05, 0.72, 0.62]));
  g.add(makeSculptedPart(new THREE.SphereGeometry(0.16, 16, 14), mat, [-0.46, 3.08, 0.0], null, [1.0, 0.92, 0.9]));
  g.add(makeSculptedPart(new THREE.SphereGeometry(0.16, 16, 14), mat, [0.45, 3.04, 0.0], null, [1.0, 0.92, 0.9]));

  // Neck + resolute head turned left (towards Goliath)
  g.add(makeSculptedPart(new THREE.CylinderGeometry(0.11, 0.13, 0.30, 16), mat, [0.0, 3.30, 0.02]));
  addClassicalHead(g, mat, 0.01, 3.60, 0.04, 0.42, -0.05, 1.04, true);

  // Right arm lowered along thigh holding stone
  g.add(makeTubeLimb([[-0.46, 3.06, 0.0], [-0.54, 2.48, -0.02], [-0.46, 1.94, 0.06]], 0.12, 0.085, mat));
  g.add(makeSculptedPart(new THREE.SphereGeometry(0.11, 14, 12), mat, [-0.44, 1.88, 0.08], null, [0.88, 1.15, 0.8]));
  // Left arm bent upward holding sling over shoulder
  g.add(makeTubeLimb([[0.45, 3.02, 0.0], [0.56, 2.52, 0.06], [0.36, 2.96, 0.18]], 0.12, 0.085, mat));
  g.add(makeSculptedPart(new THREE.SphereGeometry(0.095, 12, 10), mat, [0.32, 3.02, 0.18]));
  // Sculpted sling strap across back from left shoulder to right hand
  g.add(makeTubeLimb([[0.30, 3.05, 0.14], [0.22, 3.16, -0.18], [-0.14, 2.52, -0.25], [-0.42, 1.92, 0.04]], 0.032, 0.028, mat));

  return g;
}

function buildPieta(mat) {
  const g = new THREE.Group();
  // Rocky Golgotha oval mound base
  g.add(makeSculptedPart(new THREE.CylinderGeometry(1.18, 1.28, 0.34, 28), mat, [0, 0.17, 0], null, [1.12, 1.0, 0.85]));
  g.add(makeSculptedPart(new THREE.DodecahedronGeometry(0.65, 1), mat, [0.0, 0.62, -0.12], null, [1.65, 0.72, 1.15]));

  // Pyramidal cascading drapery of the Virgin Mary (layered sculpted folds)
  const drapePts = [
    new THREE.Vector2(1.16, 0.0),
    new THREE.Vector2(1.04, 0.35),
    new THREE.Vector2(0.88, 0.85),
    new THREE.Vector2(0.62, 1.38),
    new THREE.Vector2(0.38, 1.82)
  ];
  g.add(makeSculptedPart(new THREE.LatheGeometry(drapePts, 28), mat, [0.0, 0.30, -0.06], null, [1.08, 1.0, 0.84]));
  // Deep diagonal cloth folds across lap
  for (let i = -3; i <= 3; i++) {
    const xOff = i * 0.24;
    g.add(makeTubeLimb(
      [[xOff * 0.7, 1.48, 0.28], [xOff * 0.95, 0.92, 0.56 - Math.abs(i) * 0.05], [xOff * 1.1, 0.36, 0.72 - Math.abs(i) * 0.08]],
      0.11, 0.16, mat, 14, 10
    ));
  }

  // Mary's upper torso, diagonal inscribed sash, veiled head bowed gently
  g.add(makeSculptedPart(new THREE.SphereGeometry(0.36, 20, 16), mat, [0.0, 2.25, -0.14], null, [1.05, 1.18, 0.78]));
  g.add(makeTubeLimb([[-0.28, 2.52, 0.06], [0.0, 2.26, 0.15], [0.28, 1.98, 0.08]], 0.05, 0.05, mat));
  // Veil draped around head & shoulders
  g.add(makeSculptedPart(new THREE.SphereGeometry(0.30, 20, 16), mat, [0.0, 2.78, -0.14], [0.18, 0, 0], [1.02, 1.14, 1.08]));
  addClassicalHead(g, mat, 0.0, 2.75, -0.05, 0.05, 0.32, 0.88, false);

  // Mary's left arm extended slightly in serene open gesture, right arm supporting Christ
  g.add(makeTubeLimb([[0.32, 2.42, -0.08], [0.56, 2.02, 0.10], [0.76, 1.82, 0.34]], 0.10, 0.075, mat));
  g.add(makeTubeLimb([[-0.32, 2.42, -0.08], [-0.46, 1.96, 0.14], [-0.34, 1.66, 0.38]], 0.10, 0.08, mat));

  // Reclining figure of Christ draped horizontally across Mary's lap
  g.add(makeTubeLimb([[-0.66, 1.62, 0.36], [-0.12, 1.46, 0.44], [0.46, 1.38, 0.36]], 0.18, 0.16, mat));
  addClassicalHead(g, mat, -0.82, 1.60, 0.32, -0.25, -0.35, 0.82, true);
  // Christ's right arm hanging gracefully down over Mary's knee
  g.add(makeTubeLimb([[-0.42, 1.56, 0.46], [-0.44, 1.12, 0.56], [-0.40, 0.74, 0.62]], 0.085, 0.06, mat));
  // Christ's legs angled down to the right over the drapery
  g.add(makeTubeLimb([[0.42, 1.38, 0.36], [0.78, 1.02, 0.46], [0.88, 0.50, 0.40]], 0.13, 0.08, mat));
  g.add(makeTubeLimb([[0.38, 1.34, 0.28], [0.68, 0.96, 0.34], [0.72, 0.48, 0.26]], 0.125, 0.078, mat));

  return g;
}

function buildVenusDeMilo(mat) {
  const g = new THREE.Group();
  g.add(makeSculptedPart(new THREE.CylinderGeometry(0.62, 0.66, 0.16, 28), mat, [0, 0.08, 0]));

  // Wrapped lower-body marble drapery (characteristic deep diagonal folds)
  const skirtPts = [
    new THREE.Vector2(0.50, 0.0),
    new THREE.Vector2(0.45, 0.52),
    new THREE.Vector2(0.40, 1.08),
    new THREE.Vector2(0.38, 1.62),
    new THREE.Vector2(0.33, 1.88)
  ];
  g.add(makeSculptedPart(new THREE.LatheGeometry(skirtPts, 28), mat, [0.02, 0.16, 0.0], [0, 0, -0.03], [1.06, 1.0, 0.86]));
  // Rolled hip waist-band of drapery
  g.add(makeSculptedPart(new THREE.TorusGeometry(0.36, 0.085, 14, 28), mat, [0.02, 1.94, 0.02], [1.46, 0.16, 0.12]));
  for (let i = -2; i <= 2; i++) {
    const ang = i * 0.45;
    g.add(makeTubeLimb(
      [[Math.sin(ang) * 0.35, 1.88, Math.cos(ang) * 0.31], [Math.sin(ang + 0.15) * 0.42, 1.05, Math.cos(ang + 0.15) * 0.36], [Math.sin(ang + 0.22) * 0.47, 0.22, Math.cos(ang + 0.22) * 0.40]],
      0.075, 0.10, mat, 14, 10
    ));
  }

  // Graceful S-curve classical torso
  const torsoPts = [
    new THREE.Vector2(0.30, 0.0),
    new THREE.Vector2(0.24, 0.28),
    new THREE.Vector2(0.31, 0.66),
    new THREE.Vector2(0.35, 0.96),
    new THREE.Vector2(0.18, 1.12)
  ];
  g.add(makeSculptedPart(new THREE.LatheGeometry(torsoPts, 24), mat, [-0.03, 1.98, 0.0], [0.03, 0.12, 0.06], [1.04, 1.0, 0.72]));
  // Iconic truncated ancient upper arms
  g.add(makeTubeLimb([[-0.37, 2.94, 0.0], [-0.46, 2.66, 0.06]], 0.105, 0.088, mat, 10, 10));
  g.add(makeTubeLimb([[0.34, 2.90, 0.0], [0.43, 2.74, -0.02]], 0.10, 0.09, mat, 8, 10));

  // Neck + serene classical head with chignon hair bun
  g.add(makeSculptedPart(new THREE.CylinderGeometry(0.095, 0.115, 0.28, 16), mat, [-0.04, 3.20, 0.02]));
  const head = addClassicalHead(g, mat, -0.04, 3.48, 0.03, -0.22, 0.04, 0.96, false);
  // Classical Greek wavy headband + chignon bun at back
  head.add(makeSculptedPart(new THREE.TorusGeometry(0.22, 0.055, 12, 20), mat, [0, 0.08, -0.03], [1.2, 0, 0]));
  head.add(makeSculptedPart(new THREE.SphereGeometry(0.12, 14, 12), mat, [0, 0.04, -0.25]));

  return g;
}

function buildWingedVictory(mat) {
  const g = new THREE.Group();
  // Carved Lartos stone Hellenistic warship prow pedestal
  const prowShape = new THREE.Shape();
  prowShape.moveTo(0, 1.25);
  prowShape.lineTo(0.68, 0.35);
  prowShape.lineTo(0.58, -1.05);
  prowShape.lineTo(-0.58, -1.05);
  prowShape.lineTo(-0.68, 0.35);
  prowShape.closePath();
  const prowGeo = new THREE.ExtrudeGeometry(prowShape, {
    depth: 0.78,
    bevelEnabled: true,
    bevelThickness: 0.06,
    bevelSize: 0.05,
    bevelSegments: 3
  });
  prowGeo.rotateX(Math.PI / 2);
  g.add(makeSculptedPart(prowGeo, mat, [0, 0.84, 0.05]));

  // Forward-striding windswept figure alighting on the prow
  g.add(makeTubeLimb([[0.18, 2.08, 0.12], [0.22, 1.46, 0.36], [0.20, 0.88, 0.42]], 0.16, 0.10, mat));
  g.add(makeTubeLimb([[-0.18, 2.04, -0.02], [-0.22, 1.46, -0.22], [-0.22, 0.88, -0.42]], 0.16, 0.095, mat));

  // Clinging wind-whipped chiton & trailing drapery billowing backward
  const chitonPts = [
    new THREE.Vector2(0.46, 0.0),
    new THREE.Vector2(0.40, 0.55),
    new THREE.Vector2(0.34, 1.15),
    new THREE.Vector2(0.38, 1.75),
    new THREE.Vector2(0.24, 2.15)
  ];
  g.add(makeSculptedPart(new THREE.LatheGeometry(chitonPts, 24), mat, [0.0, 0.92, 0.04], [0.16, 0, 0], [1.02, 1.0, 0.88]));
  // Trailing wind drapery plumes streaming behind legs
  for (let i = -2; i <= 2; i++) {
    g.add(makeTubeLimb(
      [[i * 0.14, 2.15, -0.10], [i * 0.20, 1.52, -0.45 - Math.abs(i) * 0.06], [i * 0.24, 0.98, -0.78]],
      0.11, 0.075, mat, 14, 10
    ));
  }

  // Headless upper torso & clavicles thrust boldly forward into the sea wind
  g.add(makeSculptedPart(new THREE.SphereGeometry(0.32, 20, 16), mat, [0.0, 2.95, 0.20], [0.24, 0, 0], [1.14, 1.08, 0.78]));
  g.add(makeSculptedPart(new THREE.CylinderGeometry(0.11, 0.13, 0.16, 14), mat, [0.0, 3.26, 0.26], [0.20, 0, 0]));

  // Dramatic sweeping multi-feathered wings arched high behind Nike's shoulders
  for (const side of [-1, 1]) {
    const wingGroup = new THREE.Group();
    wingGroup.position.set(side * 0.24, 2.98, 0.02);
    // Primary leading edge spar
    wingGroup.add(makeTubeLimb(
      [[0, 0, 0], [side * 0.48, 0.56, -0.32], [side * 0.98, 1.32, -0.88], [side * 1.26, 1.88, -1.35]],
      0.13, 0.045, mat, 20, 10
    ));
    // Sculpted layered primary & secondary feather plumes
    for (let f = 0; f < 9; f++) {
      const frac = f / 8;
      const sx = side * (0.14 + frac * 1.02);
      const sy = 0.10 + frac * 1.58;
      const sz = -0.10 - frac * 1.12;
      const len = 0.65 + (1.0 - Math.abs(frac - 0.55)) * 0.62;
      wingGroup.add(makeTubeLimb(
        [[sx, sy, sz], [sx + side * 0.14, sy - len * 0.45, sz - len * 0.55], [sx + side * 0.20, sy - len * 0.92, sz - len * 0.96]],
        0.075 - frac * 0.025, 0.022, mat, 10, 8
      ));
    }
    g.add(wingGroup);
  }

  return g;
}

function buildTheThinker(mat) {
  const g = new THREE.Group();
  // Rough-hewn bronze rocky seat mass
  g.add(makeSculptedPart(new THREE.DodecahedronGeometry(0.88, 1), mat, [0.0, 0.68, -0.10], [0.1, 0.4, 0], [1.05, 0.92, 0.98]));
  g.add(makeSculptedPart(new THREE.DodecahedronGeometry(0.62, 1), mat, [-0.32, 0.45, 0.22], [0.2, 1.1, 0], [0.95, 0.72, 0.9]));
  g.add(makeSculptedPart(new THREE.DodecahedronGeometry(0.58, 1), mat, [0.34, 0.44, 0.18], [-0.1, 0.8, 0], [0.92, 0.70, 0.85]));

  // Seated muscular pelvis & deeply arched brooding back
  g.add(makeSculptedPart(new THREE.SphereGeometry(0.36, 18, 16), mat, [0.0, 1.38, -0.08], null, [1.14, 0.86, 0.95]));
  g.add(makeTubeLimb(
    [[0.0, 1.44, -0.10], [0.0, 1.98, -0.02], [0.0, 2.38, 0.28]],
    0.34, 0.30, mat, 18, 14
  ));
  // Broad muscular shoulders
  g.add(makeSculptedPart(new THREE.SphereGeometry(0.24, 16, 14), mat, [-0.34, 2.32, 0.22], null, [1.05, 0.92, 0.95]));
  g.add(makeSculptedPart(new THREE.SphereGeometry(0.24, 16, 14), mat, [0.34, 2.30, 0.24], null, [1.05, 0.92, 0.95]));

  // Bowed head resting heavily on right hand
  addClassicalHead(g, mat, 0.02, 2.58, 0.50, 0.08, 0.58, 1.02, true);

  // Muscular crouched legs planted firmly on rock ledges
  g.add(makeTubeLimb([[-0.24, 1.36, 0.06], [-0.30, 1.54, 0.68], [-0.26, 0.58, 0.54]], 0.19, 0.11, mat));
  g.add(makeTubeLimb([[0.24, 1.36, 0.06], [0.30, 1.58, 0.70], [0.28, 0.62, 0.52]], 0.19, 0.11, mat));
  g.add(makeSculptedPart(new THREE.BoxGeometry(0.18, 0.11, 0.32), mat, [-0.26, 0.52, 0.64]));
  g.add(makeSculptedPart(new THREE.BoxGeometry(0.18, 0.11, 0.32), mat, [0.28, 0.56, 0.62]));

  // Iconic right arm crossed across body: right elbow braced on left knee, right hand under chin
  g.add(makeTubeLimb([[-0.38, 2.28, 0.24], [0.16, 1.72, 0.72], [0.04, 2.34, 0.58]], 0.135, 0.095, mat));
  g.add(makeSculptedPart(new THREE.SphereGeometry(0.10, 12, 10), mat, [0.04, 2.38, 0.58]));
  // Left forearm resting across left knee
  g.add(makeTubeLimb([[0.38, 2.26, 0.24], [0.46, 1.78, 0.52], [0.34, 1.56, 0.78]], 0.13, 0.09, mat));

  return g;
}

function buildDiscobolus(mat) {
  const g = new THREE.Group();
  // Oval Roman plinth & tree-trunk support strut
  g.add(makeSculptedPart(new THREE.CylinderGeometry(0.86, 0.90, 0.18, 28), mat, [0, 0.09, 0], null, [1.22, 1.0, 0.82]));
  g.add(makeSculptedPart(new THREE.CylinderGeometry(0.10, 0.14, 1.38, 12), mat, [-0.12, 0.80, -0.14], [0.06, 0, -0.05]));

  // Coiled bent athletic legs (right foot planted forward, left trailing toes)
  g.add(makeTubeLimb([[0.06, 1.66, 0.05], [0.26, 1.04, 0.28], [0.14, 0.22, 0.04]], 0.18, 0.10, mat));
  g.add(makeTubeLimb([[-0.18, 1.60, -0.06], [-0.26, 1.02, 0.10], [-0.52, 0.24, -0.22]], 0.175, 0.095, mat));
  g.add(makeSculptedPart(new THREE.BoxGeometry(0.17, 0.10, 0.34), mat, [0.15, 0.20, 0.12]));
  g.add(makeSculptedPart(new THREE.BoxGeometry(0.16, 0.10, 0.30), mat, [-0.54, 0.22, -0.20], [0.45, 0.2, 0]));

  // Coiled S-torsion torso twisted toward the backswing
  g.add(makeTubeLimb(
    [[-0.04, 1.64, 0.0], [0.10, 2.15, 0.18], [0.18, 2.56, 0.34]],
    0.30, 0.34, mat, 16, 14
  ));
  addClassicalHead(g, mat, 0.20, 2.86, 0.44, -0.78, 0.32, 0.95, true);

  // Right arm swept far back & upward holding the marble discus
  g.add(makeTubeLimb([[-0.10, 2.54, 0.26], [-0.62, 2.74, -0.04], [-1.18, 2.84, -0.28]], 0.125, 0.085, mat));
  g.add(makeSculptedPart(new THREE.CylinderGeometry(0.32, 0.32, 0.065, 28), mat, [-1.32, 2.86, -0.34], [0.3, 0.35, 1.38]));

  // Left arm swept across chest toward right knee for counterbalance
  g.add(makeTubeLimb([[0.42, 2.48, 0.36], [0.46, 1.94, 0.46], [0.28, 1.34, 0.38]], 0.12, 0.082, mat));

  return g;
}

function buildNefertiti(materials) {
  const g = new THREE.Group();
  const skinMat = materials.limestone;
  const crownMat = materials.lapisBlue;
  const goldMat = materials.goldBand;
  const redMat = materials.carnelianRed;
  const tealMat = materials.turquoise;

  // Bust shoulders & painted Egyptian usekh broad collar
  const bustPts = [
    new THREE.Vector2(0.86, 0.0),
    new THREE.Vector2(0.80, 0.36),
    new THREE.Vector2(0.68, 0.72),
    new THREE.Vector2(0.36, 0.98),
    new THREE.Vector2(0.24, 1.15)
  ];
  g.add(makeSculptedPart(new THREE.LatheGeometry(bustPts, 32), skinMat, [0, 0.12, 0], null, [1.08, 1.0, 0.64]));

  // Multi-row polychrome usekh collar rings
  const collarRings = [
    { y: 0.92, r: 0.43, m: goldMat },
    { y: 0.78, r: 0.56, m: tealMat },
    { y: 0.63, r: 0.68, m: redMat },
    { y: 0.48, r: 0.76, m: crownMat }
  ];
  for (const cr of collarRings) {
    g.add(makeSculptedPart(new THREE.TorusGeometry(cr.r, 0.055, 10, 32), cr.m, [0, cr.y, 0.04], [Math.PI / 2, 0, 0], [1.06, 0.68, 1.0]));
  }

  // Long graceful Amarna neck & sculpted serene face
  g.add(makeSculptedPart(new THREE.CylinderGeometry(0.18, 0.24, 0.68, 22), skinMat, [0, 1.48, 0.03], [0.08, 0, 0]));
  g.add(makeSculptedPart(new THREE.SphereGeometry(0.34, 24, 20), skinMat, [0, 2.02, 0.08], [0.06, 0, 0], [0.84, 1.08, 0.94]));
  g.add(makeSculptedPart(new THREE.SphereGeometry(0.20, 18, 14), skinMat, [0, 1.78, 0.20], null, [0.76, 0.82, 0.85]));
  // Aquiline nose & lips
  g.add(makeSculptedPart(new THREE.BoxGeometry(0.065, 0.19, 0.11), skinMat, [0, 1.98, 0.37], [0.22, 0, 0]));
  g.add(makeSculptedPart(new THREE.SphereGeometry(0.075, 12, 10), redMat, [0, 1.80, 0.36], null, [1.35, 0.48, 0.55]));
  // Kohl-lined brows & inlaid right eye
  g.add(makeSculptedPart(new THREE.BoxGeometry(0.13, 0.025, 0.04), materials.bronze, [-0.12, 2.11, 0.34], [0, 0, 0.10]));
  g.add(makeSculptedPart(new THREE.BoxGeometry(0.13, 0.025, 0.04), materials.bronze, [0.12, 2.11, 0.34], [0, 0, -0.10]));
  g.add(makeSculptedPart(new THREE.SphereGeometry(0.032, 10, 10), materials.bronze, [-0.11, 2.05, 0.34]));

  // Iconic tall flat-topped royal blue crown (modius/khepresh) sweeping backward
  const crownPts = [
    new THREE.Vector2(0.29, 0.0),
    new THREE.Vector2(0.33, 0.28),
    new THREE.Vector2(0.41, 0.72),
    new THREE.Vector2(0.47, 1.15),
    new THREE.Vector2(0.46, 1.24),
    new THREE.Vector2(0.01, 1.26)
  ];
  g.add(makeSculptedPart(new THREE.LatheGeometry(crownPts, 28), crownMat, [0, 2.22, -0.02], [-0.30, 0, 0], [0.92, 1.0, 1.04]));
  // Horizontal gold & jewel diadem ribbon + central uraeus cobra emblem
  g.add(makeSculptedPart(new THREE.CylinderGeometry(0.41, 0.39, 0.13, 28), goldMat, [0, 2.74, -0.18], [-0.30, 0, 0], [0.93, 1.0, 1.05]));
  g.add(makeSculptedPart(new THREE.CylinderGeometry(0.42, 0.41, 0.05, 28), redMat, [0, 2.74, -0.18], [-0.30, 0, 0], [0.94, 1.0, 1.06]));
  g.add(makeSculptedPart(new THREE.CylinderGeometry(0.04, 0.055, 0.22, 12), goldMat, [0, 2.34, 0.33], [-0.20, 0, 0]));

  return g;
}

function buildMoai(mat) {
  const g = new THREE.Group();
  // Ceremonial Ahu stone platform slab
  g.add(makeSculptedPart(new THREE.BoxGeometry(1.75, 0.26, 1.32), mat, [0, 0.13, 0]));

  // Monolithic tapered basalt torso
  g.add(makeSculptedPart(new THREE.BoxGeometry(1.16, 1.56, 0.78), mat, [0, 1.04, 0], [0.03, 0, 0]));
  // Low-relief sculpted arms along flanks & hands meeting across belly
  g.add(makeSculptedPart(new THREE.BoxGeometry(0.18, 1.10, 0.24), mat, [-0.62, 0.96, 0.08]));
  g.add(makeSculptedPart(new THREE.BoxGeometry(0.18, 1.10, 0.24), mat, [0.62, 0.96, 0.08]));
  g.add(makeSculptedPart(new THREE.BoxGeometry(0.44, 0.16, 0.18), mat, [-0.34, 0.56, 0.38]));
  g.add(makeSculptedPart(new THREE.BoxGeometry(0.44, 0.16, 0.18), mat, [0.34, 0.56, 0.38]));

  // Monumental elongated Moai head with heavy overhanging brow ridge
  g.add(makeSculptedPart(new THREE.BoxGeometry(0.86, 1.88, 0.76), mat, [0, 2.68, 0.04], [-0.05, 0, 0]));
  // Heavy angular brow shelf casting deep shadow over eye sockets
  g.add(makeSculptedPart(new THREE.BoxGeometry(0.94, 0.24, 0.38), mat, [0, 3.24, 0.34], [0.12, 0, 0]));
  // Deeply carved recessed eye sockets
  const darkRecess = new THREE.MeshStandardMaterial({ color: 0x1a1918, roughness: 0.95 });
  g.add(makeSculptedPart(new THREE.BoxGeometry(0.26, 0.18, 0.14), darkRecess, [-0.22, 3.04, 0.38]));
  g.add(makeSculptedPart(new THREE.BoxGeometry(0.26, 0.18, 0.14), darkRecess, [0.22, 3.04, 0.38]));
  // Long prominent concave Rapa Nui nose + wide flared nostrils
  g.add(makeSculptedPart(new THREE.BoxGeometry(0.18, 0.86, 0.34), mat, [0, 2.74, 0.44], [-0.22, 0, 0]));
  g.add(makeSculptedPart(new THREE.BoxGeometry(0.40, 0.18, 0.26), mat, [0, 2.34, 0.50]));
  // Pursed protruding lips & sharp jawline chin
  g.add(makeSculptedPart(new THREE.BoxGeometry(0.38, 0.10, 0.18), mat, [0, 2.08, 0.44]));
  g.add(makeSculptedPart(new THREE.BoxGeometry(0.68, 0.22, 0.34), mat, [0, 1.82, 0.32]));
  // Elongated carved vertical ears
  g.add(makeSculptedPart(new THREE.BoxGeometry(0.14, 0.92, 0.20), mat, [-0.48, 2.74, 0.02]));
  g.add(makeSculptedPart(new THREE.BoxGeometry(0.14, 0.92, 0.20), mat, [0.48, 2.74, 0.02]));

  return g;
}

function buildSculptureMesh(id, materials) {
  switch (id) {
    case 'david':
      return buildDavid(materials.carrara);
    case 'pieta':
      return buildPieta(materials.carrara);
    case 'venus_de_milo':
      return buildVenusDeMilo(materials.parian);
    case 'winged_victory':
      return buildWingedVictory(materials.parian);
    case 'the_thinker':
      return buildTheThinker(materials.bronze);
    case 'discobolus':
      return buildDiscobolus(materials.carrara);
    case 'nefertiti':
      return buildNefertiti(materials);
    case 'moai':
      return buildMoai(materials.basalt);
    default:
      return buildDavid(materials.carrara);
  }
}

export function createSculptures3D(canvas, getParams) {
  let width = canvas.width || 1280;
  let height = canvas.height || 720;

  let renderer = null;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = true;
  } catch (_) {
    renderer = null;
  }

  // Optional 2D HUD overlay canvas mounted alongside the WebGL canvas
  let hudCanvas = null;
  let hudCtx = null;
  if (canvas.parentElement) {
    hudCanvas = document.createElement('canvas');
    hudCanvas.width = width;
    hudCanvas.height = height;
    hudCanvas.style.position = 'absolute';
    hudCanvas.style.inset = '0';
    hudCanvas.style.width = '100%';
    hudCanvas.style.height = '100%';
    hudCanvas.style.pointerEvents = 'none';
    hudCanvas.style.zIndex = '5';
    canvas.parentElement.appendChild(hudCanvas);
    hudCtx = hudCanvas.getContext('2d');
  }

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0d12);
  scene.fog = new THREE.FogExp2(0x0b0d12, 0.042);

  const envTex = createGalleryEnvTexture();
  if (envTex) scene.environment = envTex;

  const camera = new THREE.PerspectiveCamera(40, width / Math.max(1, height), 0.1, 60);

  // Procedural sculpture materials
  const carraraTex = createStoneTexture('carrara');
  const parianTex = createStoneTexture('parian');
  const bronzeTex = createStoneTexture('bronze');
  const basaltTex = createStoneTexture('basalt');
  const limestoneTex = createStoneTexture('limestone');

  const materials = {
    carrara: new THREE.MeshStandardMaterial({
      color: 0xf4f3ef,
      map: carraraTex,
      bumpMap: carraraTex,
      bumpScale: 0.015,
      roughness: 0.42,
      metalness: 0.04
    }),
    parian: new THREE.MeshStandardMaterial({
      color: 0xeee5d5,
      map: parianTex,
      bumpMap: parianTex,
      bumpScale: 0.02,
      roughness: 0.48,
      metalness: 0.04
    }),
    bronze: new THREE.MeshStandardMaterial({
      color: 0x5c4f3d,
      map: bronzeTex,
      bumpMap: bronzeTex,
      bumpScale: 0.028,
      roughness: 0.34,
      metalness: 0.82
    }),
    basalt: new THREE.MeshStandardMaterial({
      color: 0x5e5b56,
      map: basaltTex,
      bumpMap: basaltTex,
      bumpScale: 0.045,
      roughness: 0.86,
      metalness: 0.06
    }),
    limestone: new THREE.MeshStandardMaterial({
      color: 0xd9b894,
      map: limestoneTex,
      bumpMap: limestoneTex,
      bumpScale: 0.018,
      roughness: 0.62,
      metalness: 0.03
    }),
    lapisBlue: new THREE.MeshStandardMaterial({ color: 0x1e3f78, roughness: 0.56, metalness: 0.08 }),
    goldBand: new THREE.MeshStandardMaterial({ color: 0xd4a946, roughness: 0.32, metalness: 0.78 }),
    carnelianRed: new THREE.MeshStandardMaterial({ color: 0xa63a2a, roughness: 0.52, metalness: 0.05 }),
    turquoise: new THREE.MeshStandardMaterial({ color: 0x2b8a82, roughness: 0.48, metalness: 0.06 })
  };

  // Museum Gallery Rotunda Floor, Columns & Central Pedestal
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x171a22, roughness: 0.38, metalness: 0.14 });
  const floorMesh = new THREE.Mesh(new THREE.CircleGeometry(18, 48), floorMat);
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.position.y = -0.92;
  floorMesh.receiveShadow = true;
  scene.add(floorMesh);

  // Subtle classical rotunda columns encircling the gallery perimeter
  const colMat = new THREE.MeshStandardMaterial({ color: 0x232733, roughness: 0.72, metalness: 0.08 });
  const colGeo = new THREE.CylinderGeometry(0.36, 0.40, 10.5, 16);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    const col = new THREE.Mesh(colGeo, colMat);
    col.position.set(Math.cos(a) * 11.5, 4.3, Math.sin(a) * 11.5);
    scene.add(col);
  }

  // Carved museum pedestal & brass trim ring
  const pedMat = new THREE.MeshStandardMaterial({ color: 0x242220, roughness: 0.46, metalness: 0.16 });
  const pedBase = makeSculptedPart(new THREE.CylinderGeometry(1.52, 1.66, 0.22, 36), pedMat, [0, -0.81, 0]);
  const pedShaft = makeSculptedPart(new THREE.CylinderGeometry(1.32, 1.38, 0.62, 36), pedMat, [0, -0.39, 0]);
  const pedCap = makeSculptedPart(new THREE.CylinderGeometry(1.42, 1.36, 0.12, 36), pedMat, [0, -0.05, 0]);
  const brassTrim = makeSculptedPart(new THREE.TorusGeometry(1.37, 0.018, 10, 48), materials.goldBand, [0, -0.06, 0], [Math.PI / 2, 0, 0]);
  scene.add(pedBase, pedShaft, pedCap, brassTrim);

  // 3-Point Museum Gallery Lighting
  const hemiLight = new THREE.HemisphereLight(0xdce8ff, 0x26201a, 0.58);
  scene.add(hemiLight);

  const keyLight = new THREE.DirectionalLight(0xfff1dc, 2.25);
  keyLight.position.set(4.5, 8.2, 5.2);
  keyLight.castShadow = true;
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0x9ec5ff, 0.85);
  fillLight.position.set(-5.5, 4.0, -3.5);
  scene.add(fillLight);

  const rimLight = new THREE.PointLight(0xffd9a3, 2.4, 16);
  rimLight.position.set(0, 5.5, -4.5);
  scene.add(rimLight);

  const upLight = new THREE.PointLight(0xfff0d4, 0.9, 8);
  upLight.position.set(1.6, 0.2, 1.8);
  scene.add(upLight);

  // Build all 8 sculptures once and toggle visibility cleanly
  const sculptureGroups = new Map();
  for (const meta of SCULPTURE_CATALOG) {
    const grp = buildSculptureMesh(meta.id, materials);
    grp.visible = false;
    scene.add(grp);
    sculptureGroups.set(meta.id, grp);
  }

  let activeIndex = 0;
  let activeMeta = SCULPTURE_CATALOG[0];
  let dwellClock = 0;
  let orbitAngle = 0.25;
  let lastTheme = '';

  function selectSculptureByIndex(idx) {
    activeIndex = ((idx % SCULPTURE_CATALOG.length) + SCULPTURE_CATALOG.length) % SCULPTURE_CATALOG.length;
    activeMeta = SCULPTURE_CATALOG[activeIndex];
    for (const [id, grp] of sculptureGroups.entries()) {
      grp.visible = id === activeMeta.id;
    }
    dwellClock = 0;
  }

  function applyLightingTheme(theme) {
    if (theme === lastTheme) return;
    lastTheme = theme;
    if (theme === 'marble_rotunda') {
      scene.background.setHex(0x161b24);
      scene.fog.color.setHex(0x161b24);
      hemiLight.intensity = 0.92;
      keyLight.color.setHex(0xffffff);
      keyLight.intensity = 2.0;
      fillLight.color.setHex(0xc8deff);
      fillLight.intensity = 1.05;
      rimLight.intensity = 1.7;
    } else if (theme === 'chiaroscuro') {
      scene.background.setHex(0x050609);
      scene.fog.color.setHex(0x050609);
      hemiLight.intensity = 0.28;
      keyLight.color.setHex(0xffe1b5);
      keyLight.intensity = 2.75;
      fillLight.color.setHex(0x6d90c8);
      fillLight.intensity = 0.42;
      rimLight.intensity = 3.1;
    } else {
      // louvre_warm (default)
      scene.background.setHex(0x0b0d12);
      scene.fog.color.setHex(0x0b0d12);
      hemiLight.intensity = 0.58;
      keyLight.color.setHex(0xfff1dc);
      keyLight.intensity = 2.25;
      fillLight.color.setHex(0x9ec5ff);
      fillLight.intensity = 0.85;
      rimLight.intensity = 2.4;
    }
  }

  function renderPlaqueHud(showPlaque, dwellSeconds) {
    if (!hudCtx || !hudCanvas) return;
    hudCtx.clearRect(0, 0, width, height);
    if (!showPlaque) return;

    const pad = 26;
    const cardW = Math.min(480, width - pad * 2);
    const cardH = 118;
    const x = pad;
    const y = height - cardH - pad;

    hudCtx.save();
    hudCtx.fillStyle = 'rgba(11, 13, 18, 0.80)';
    hudCtx.strokeStyle = 'rgba(212, 169, 70, 0.48)';
    hudCtx.lineWidth = 1.25;
    hudCtx.fillRect(x, y, cardW, cardH);
    hudCtx.strokeRect(x, y, cardW, cardH);

    // Subtle brass accent bar along left edge
    hudCtx.fillStyle = '#d4a946';
    hudCtx.fillRect(x, y, 4, cardH);

    hudCtx.fillStyle = '#f8fafc';
    hudCtx.font = 'bold 18px Georgia, serif';
    hudCtx.fillText(activeMeta.title, x + 16, y + 28);

    hudCtx.fillStyle = '#e2c275';
    hudCtx.font = '600 12px monospace';
    hudCtx.fillText(`${activeMeta.artist} · ${activeMeta.date}`, x + 16, y + 48);

    hudCtx.fillStyle = '#cbd5e1';
    hudCtx.font = '12px sans-serif';
    hudCtx.fillText(`Location: ${activeMeta.location}`, x + 16, y + 70);

    hudCtx.fillStyle = '#94a3b8';
    hudCtx.font = '11px monospace';
    const deg = Math.round((((orbitAngle % TAU) + TAU) % TAU) * (180 / Math.PI));
    hudCtx.fillText(`${activeMeta.medium}  ·  ${deg}°`, x + 16, y + 91);

    hudCtx.fillStyle = '#64748b';
    hudCtx.font = '10px monospace';
    hudCtx.fillText(`${activeMeta.era}  (${activeIndex + 1}/${SCULPTURE_CATALOG.length})`, x + 16, y + 107);

    // Subtle progress bar along bottom
    const prog = clamp(dwellClock / Math.max(4, dwellSeconds), 0, 1);
    hudCtx.fillStyle = 'rgba(212, 169, 70, 0.20)';
    hudCtx.fillRect(x + 4, y + cardH - 3, cardW - 4, 3);
    hudCtx.fillStyle = '#d4a946';
    hudCtx.fillRect(x + 4, y + cardH - 3, (cardW - 4) * prog, 3);
    hudCtx.restore();
  }

  selectSculptureByIndex(0);

  return {
    resize(w, h) {
      width = Math.max(64, w);
      height = Math.max(64, h);
      camera.aspect = width / Math.max(1, height);
      camera.updateProjectionMatrix();
      if (renderer) {
        renderer.setSize(width, height, false);
      }
      if (hudCanvas) {
        hudCanvas.width = width;
        hudCanvas.height = height;
      }
    },

    render(rawDt) {
      const dt = clamp(rawDt || 0.016, 0.001, 0.1);
      const params = (typeof getParams === 'function' ? getParams() : null) || {};
      const preset = params.sculpturePreset || 'cycle';
      const orbitSpeed = clamp(Number(params.orbitSpeed ?? 1.0), 0.2, 3.0);
      const dwellSeconds = clamp(Number(params.dwellSeconds ?? 24), 8, 90);
      const lightingTheme = params.lightingTheme || 'louvre_warm';
      const cameraSweep = params.cameraSweep || 'full_orbit';
      const showPlaque = params.showPlaque !== false;

      applyLightingTheme(lightingTheme);

      if (preset !== 'cycle' && preset !== 'random') {
        const wantedIdx = SCULPTURE_CATALOG.findIndex((s) => s.id === preset);
        if (wantedIdx >= 0 && wantedIdx !== activeIndex) {
          selectSculptureByIndex(wantedIdx);
        }
      } else {
        dwellClock += dt;
        if (dwellClock >= dwellSeconds) {
          if (preset === 'random') {
            let nextIdx = Math.floor(Math.random() * SCULPTURE_CATALOG.length);
            if (nextIdx === activeIndex) {
              nextIdx = (activeIndex + 1) % SCULPTURE_CATALOG.length;
            }
            selectSculptureByIndex(nextIdx);
          } else {
            selectSculptureByIndex(activeIndex + 1);
          }
        }
      }

      // Full 360-degree continuous orbital tour around the sculpture
      const angularRate = (TAU / Math.max(10, dwellSeconds)) * orbitSpeed;
      orbitAngle = (orbitAngle + angularRate * dt) % TAU;

      let camDist = activeMeta.camDist;
      let camY = activeMeta.focusY + 0.35;
      if (cameraSweep === 'full_orbit') {
        camY = activeMeta.focusY + 0.35 + Math.sin(orbitAngle * 1.5) * 0.85;
        camDist = activeMeta.camDist + Math.cos(orbitAngle) * 0.45;
      } else if (cameraSweep === 'close_study') {
        camY = activeMeta.focusY + 0.55 + Math.sin(orbitAngle * 2.0) * 0.55;
        camDist = activeMeta.camDist * 0.78;
      }

      camera.position.set(
        Math.sin(orbitAngle) * camDist,
        camY,
        Math.cos(orbitAngle) * camDist
      );
      camera.lookAt(0, activeMeta.focusY, 0);

      // Keep rim light opposite camera so silhouette contours always gleam
      rimLight.position.set(-Math.sin(orbitAngle) * 4.5, 5.2, -Math.cos(orbitAngle) * 4.5);

      if (renderer) {
        renderer.render(scene, camera);
      }
      renderPlaqueHud(showPlaque, dwellSeconds);
    },

    destroy() {
      if (hudCanvas && hudCanvas.parentElement) {
        hudCanvas.parentElement.removeChild(hudCanvas);
        hudCanvas = null;
        hudCtx = null;
      }
      scene.traverse((obj) => {
        if (obj.isMesh && obj.geometry) {
          obj.geometry.dispose();
        }
      });
      for (const m of Object.values(materials)) {
        m.dispose();
      }
      for (const t of [envTex, carraraTex, parianTex, bronzeTex, basaltTex, limestoneTex]) {
        if (t) t.dispose();
      }
      floorMat.dispose();
      colMat.dispose();
      pedMat.dispose();
      if (renderer) {
        renderer.dispose();
      }
    }
  };
}
