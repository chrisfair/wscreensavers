// 5e Tabletop Dice & Battle Mat Screensaver (dnd5edice.js)
//
// Physically Based WebGL (Three.js) polyhedral RPG dice & battlemat simulation:
// 1. Exact Top-Face / Top-Apex Reading:
//    - d6, d8, d10, d12, d20: every face is numbered in a high-res engraved normal/bump
//      atlas, and when settled, the rolled face's outward normal aligns strictly with +Y (0,1,0)
//      while resting flat on its parallel opposite face.
//    - d4: authentic vertex/apex-numbered tetrahedron — each corner displays its vertex value
//      oriented upright toward that vertex, so when settled flat on its bottom face (-Y),
//      all three visible sides display the rolled number upright right at the top peak (+Y).
// 2. Forged Metal & Refractive Faceted Crystal Dice:
//    - Forged metals: high-contrast procedural envMap reflections, deep recessed ink wells,
//      raised chamfered bevel ridges, brushed metal micro-grain, and engraved inner scrollwork.
//    - Crystalline/gemstone glass: additive inner refraction core, specular edge facets,
//      deep jewel-toned body tint, and bright gold/silver engraved numerals.
// 3. Detailed Tabletop RPG Scene:
//    - Weathered dungeon flagstone / parchment / emerald tactician 1-inch battlemat
//    - Flat acrylic portrait creature & hero standee tokens with illustrated class/monster crests
//    - Carved walnut octagonal dice tray with recessed dice-staging trough & resting spare polyhedra
//    - Hand-stitched leather drawstring dice pouch spilling spare metal & gem dice onto the oak planks
//    - Open brass-bound spellbook with arcane geometric diagrams, parchment scroll, character sheet & pencil

import * as THREE from 'three';

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function formatSigned(n) {
  return n >= 0 ? `+${n}` : `${n}`;
}

function formatDiceFormula(diceList, flatMod, doubled = false) {
  const map = new Map();
  for (const d of diceList) {
    const cnt = d.count * (doubled ? 2 : 1);
    map.set(d.sides, (map.get(d.sides) || 0) + cnt);
  }
  const parts = [];
  for (const [sides, cnt] of map.entries()) {
    parts.push(`${cnt}d${sides}`);
  }
  if (flatMod > 0) parts.push(`+ ${flatMod}`);
  else if (flatMod < 0) parts.push(`- ${Math.abs(flatMod)}`);
  return parts.join(' ');
}

// ============================================================================
// HIGH-CONTRAST TAVERN / STUDIO EQUIRECTANGULAR ENVIRONMENT MAP
// (Crucial so metallic & crystal dice show realistic bright specular streaks & dark reflections!)
// ============================================================================

function createTavernEnvTexture() {
  const cvs = document.createElement('canvas');
  cvs.width = 512;
  cvs.height = 256;
  const ctx = cvs.getContext('2d');
  if (!ctx) return null;

  // Deep shadowy tavern ceiling -> warm horizon -> dark oak floor
  const bg = ctx.createLinearGradient(0, 0, 0, 256);
  bg.addColorStop(0.0, '#090d1a');
  bg.addColorStop(0.38, '#1e1b2e');
  bg.addColorStop(0.50, '#5c3a21');
  bg.addColorStop(0.62, '#2a180d');
  bg.addColorStop(1.0, '#0c0705');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 256);

  // Bright warm chandelier / lantern specular hotspots + cool moonlit window panel
  const lights = [
    { x: 110, y: 58, r: 54, c0: 'rgba(255, 244, 214, 1.0)', c1: 'rgba(251, 146, 60, 0.0)' },
    { x: 260, y: 44, r: 42, c0: 'rgba(255, 250, 235, 0.95)', c1: 'rgba(245, 158, 11, 0.0)' },
    { x: 405, y: 72, r: 62, c0: 'rgba(186, 230, 253, 0.92)', c1: 'rgba(56, 189, 248, 0.0)' },
    { x: 64, y: 118, r: 36, c0: 'rgba(253, 224, 71, 0.85)', c1: 'rgba(234, 88, 12, 0.0)' }
  ];
  for (const l of lights) {
    const g = ctx.createRadialGradient(l.x, l.y, 2, l.x, l.y, l.r);
    g.addColorStop(0, l.c0);
    g.addColorStop(1, l.c1);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(l.x, l.y, l.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Crisp bright window mullions for sharp crystal/metal specular glints
  ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
  ctx.fillRect(382, 48, 16, 44);
  ctx.fillRect(404, 48, 16, 44);
  ctx.fillStyle = 'rgba(255, 237, 200, 0.92)';
  ctx.fillRect(98, 42, 22, 28);

  const tex = new THREE.CanvasTexture(cvs);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.mapping = THREE.EquirectangularReflectionMapping;
  return tex;
}

// ============================================================================
// POLYHEDRAL GEOMETRY & EXACT TOP-FACE / TOP-APEX UV ATLAS
// ============================================================================

function buildAtlasPolyhedronGeometry(rawVerts, rawFaces, faceMeta, atlasCols, atlasRows, targetRadius, spherize = true) {
  const verts = rawVerts.map((v) =>
    spherize ? v.clone().normalize().multiplyScalar(targetRadius) : v.clone().multiplyScalar(targetRadius)
  );
  const positions = [];
  const normals = [];
  const uvs = [];
  const edgePositions = [];
  const faces = [];

  rawFaces.forEach((idxs, faceIdx) => {
    const centroid = new THREE.Vector3();
    for (const i of idxs) centroid.add(verts[i]);
    centroid.divideScalar(idxs.length);

    const e1 = new THREE.Vector3().subVectors(verts[idxs[1]], verts[idxs[0]]);
    const e2 = new THREE.Vector3().subVectors(verts[idxs[2]], verts[idxs[0]]);
    const normal = new THREE.Vector3().crossVectors(e1, e2).normalize();
    const ordered = idxs.slice();
    if (normal.dot(centroid) < 0) {
      ordered.reverse();
      normal.negate();
    }

    const planeDist = Math.abs(normal.dot(verts[ordered[0]]));

    const toV0 = new THREE.Vector3().subVectors(verts[ordered[0]], centroid);
    toV0.addScaledVector(normal, -toV0.dot(normal));
    const bitangent = toV0.normalize();
    const tangent = new THREE.Vector3().crossVectors(bitangent, normal).normalize();

    let maxR = 0;
    const local2D = ordered.map((vi) => {
      const rel = new THREE.Vector3().subVectors(verts[vi], centroid);
      const lx = rel.dot(tangent);
      const ly = rel.dot(bitangent);
      maxR = Math.max(maxR, Math.hypot(lx, ly));
      return { lx, ly };
    });

    const col = faceIdx % atlasCols;
    const row = Math.floor(faceIdx / atlasCols);
    const uCenter = (col + 0.5) / atlasCols;
    const vCenter = 1.0 - (row + 0.5) / atlasRows;
    const halfScaleU = (0.44 / atlasCols) / (maxR || 1);
    const halfScaleV = (0.44 / atlasRows) / (maxR || 1);

    const faceUVs = local2D.map(({ lx, ly }) => ({
      u: uCenter + lx * halfScaleU,
      v: vCenter + ly * halfScaleV,
      nx: lx / (maxR || 1),
      ny: ly / (maxR || 1)
    }));

    for (let k = 1; k < ordered.length - 1; k++) {
      for (const ti of [0, k, k + 1]) {
        const p = verts[ordered[ti]];
        positions.push(p.x, p.y, p.z);
        normals.push(normal.x, normal.y, normal.z);
        uvs.push(faceUVs[ti].u, faceUVs[ti].v);
      }
    }

    // Collect crisp 3D wireframe bevel edges slightly inflated (1.003x)
    for (let k = 0; k < ordered.length; k++) {
      const a = verts[ordered[k]];
      const b = verts[ordered[(k + 1) % ordered.length]];
      edgePositions.push(a.x * 1.003, a.y * 1.003, a.z * 1.003);
      edgePositions.push(b.x * 1.003, b.y * 1.003, b.z * 1.003);
    }

    faces.push({
      faceIdx,
      ordered,
      normal: normal.clone(),
      centroid: centroid.clone(),
      tangent: tangent.clone(),
      bitangent: bitangent.clone(),
      planeDist,
      localVertsNorm: faceUVs.map((f) => ({ x: f.nx, y: f.ny })),
      meta: faceMeta[faceIdx]
    });
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));

  const edgeGeometry = new THREE.BufferGeometry();
  edgeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(edgePositions, 3));

  return { geometry, edgeGeometry, verts, faces, atlasCols, atlasRows };
}

function buildDiceGeometryCatalog() {
  // d4: Regular Tetrahedron (vertex-numbered 1..4 so top peak strictly shows rolled value upright!)
  const d4RawVerts = [
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(0, -1 / 3, (2 * Math.sqrt(2)) / 3),
    new THREE.Vector3(-Math.sqrt(6) / 3, -1 / 3, -Math.sqrt(2) / 3),
    new THREE.Vector3(Math.sqrt(6) / 3, -1 / 3, -Math.sqrt(2) / 3)
  ];
  const d4Vals = [1, 2, 3, 4];
  const d4FacesDef = [
    [0, 1, 3],
    [0, 3, 2],
    [0, 2, 1],
    [1, 2, 3]
  ];
  const d4 = buildAtlasPolyhedronGeometry(
    d4RawVerts,
    d4FacesDef,
    d4FacesDef.map((f) => ({ isD4: true, cornerValues: f.map((vi) => d4Vals[vi]) })),
    2,
    2,
    0.80,
    true
  );
  d4.isD4 = true;
  d4.apexVectors = d4RawVerts.map((v) => v.clone().normalize());
  d4.apexValues = d4Vals;
  d4.restHeight = 0.80 / 3;

  // d6: Cube (opposite faces sum to 7)
  const s = 1 / Math.sqrt(3);
  const d6Verts = [
    new THREE.Vector3(-s, -s, -s), new THREE.Vector3(s, -s, -s),
    new THREE.Vector3(s, s, -s), new THREE.Vector3(-s, s, -s),
    new THREE.Vector3(-s, -s, s), new THREE.Vector3(s, -s, s),
    new THREE.Vector3(s, s, s), new THREE.Vector3(-s, s, s)
  ];
  const d6Faces = [
    [7, 4, 5, 6],
    [2, 1, 0, 3],
    [6, 5, 1, 2],
    [3, 0, 4, 7],
    [2, 3, 7, 6],
    [5, 4, 0, 1]
  ];
  const d6 = buildAtlasPolyhedronGeometry(
    d6Verts,
    d6Faces,
    [6, 1, 3, 4, 2, 5].map((v) => ({ value: v })),
    3,
    2,
    0.72,
    true
  );
  d6.restHeight = d6.faces[0].planeDist;

  // d8: Octahedron (opposite faces sum to 9)
  const d8Verts = [
    new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0),
    new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -1, 0),
    new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1)
  ];
  const d8Faces = [
    [2, 4, 0], [3, 5, 1],
    [2, 1, 4], [3, 0, 5],
    [3, 4, 1], [2, 5, 0],
    [3, 0, 4], [2, 1, 5]
  ];
  const d8 = buildAtlasPolyhedronGeometry(
    d8Verts,
    d8Faces,
    [8, 1, 6, 3, 4, 5, 2, 7].map((v) => ({ value: v })),
    4,
    2,
    0.78,
    true
  );
  d8.restHeight = d8.faces[0].planeDist;

  // d10: Pentagonal Trapezohedron (10 exact coplanar kites, opposite faces parallel)
  const cos36 = Math.cos(Math.PI / 5);
  const Hpole = 1.0;
  const hRing = Hpole * ((1 - cos36) / (1 + cos36));
  const rRing = 0.94;
  const d10RawVerts = [
    new THREE.Vector3(0, Hpole, 0),
    new THREE.Vector3(0, -Hpole, 0)
  ];
  for (let k = 0; k < 5; k++) {
    const a = (k * 2 * Math.PI) / 5;
    d10RawVerts.push(new THREE.Vector3(Math.cos(a) * rRing, hRing, Math.sin(a) * rRing));
  }
  for (let k = 0; k < 5; k++) {
    const a = ((k + 0.5) * 2 * Math.PI) / 5;
    d10RawVerts.push(new THREE.Vector3(Math.cos(a) * rRing, -hRing, Math.sin(a) * rRing));
  }
  const d10FacesDef = [];
  for (let k = 0; k < 5; k++) {
    d10FacesDef.push([0, 2 + k, 7 + k, 2 + ((k + 1) % 5)]);
  }
  for (let k = 0; k < 5; k++) {
    d10FacesDef.push([1, 7 + ((k + 1) % 5), 2 + ((k + 1) % 5), 7 + k]);
  }
  const d10 = buildAtlasPolyhedronGeometry(
    d10RawVerts,
    d10FacesDef,
    [10, 2, 8, 4, 6, 1, 9, 3, 7, 5].map((v) => ({ value: v })),
    5,
    2,
    0.70,
    false
  );
  d10.restHeight = d10.faces[0].planeDist;

  // d20: Regular Icosahedron (opposite faces parallel & sum to 21)
  const phi = (1 + Math.sqrt(5)) / 2;
  const d20Verts = [
    new THREE.Vector3(-1, phi, 0), new THREE.Vector3(1, phi, 0),
    new THREE.Vector3(-1, -phi, 0), new THREE.Vector3(1, -phi, 0),
    new THREE.Vector3(0, -1, phi), new THREE.Vector3(0, 1, phi),
    new THREE.Vector3(0, -1, -phi), new THREE.Vector3(0, 1, -phi),
    new THREE.Vector3(phi, 0, -1), new THREE.Vector3(phi, 0, 1),
    new THREE.Vector3(-phi, 0, -1), new THREE.Vector3(-phi, 0, 1)
  ];
  const canonicalD20Faces = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
    [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
    [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]
  ];
  const d20 = buildAtlasPolyhedronGeometry(
    d20Verts,
    canonicalD20Faces,
    [20, 8, 14, 2, 16, 12, 6, 18, 4, 10, 7, 15, 3, 19, 11, 5, 13, 9, 17, 1].map((v) => ({ value: v })),
    5,
    4,
    0.84,
    true
  );
  d20.restHeight = d20.faces[0].planeDist;

  // d12: Regular Dodecahedron (dual of icosahedron)
  const d12Verts = d20.faces.map((f) => f.centroid.clone().normalize());
  const d12FacesDef = [];
  for (let vi = 0; vi < d20Verts.length; vi++) {
    const dir = d20Verts[vi].clone().normalize();
    const inc = [];
    canonicalD20Faces.forEach((f, fi) => {
      if (f.includes(vi)) inc.push(fi);
    });
    const ref = Math.abs(dir.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    const uAx = new THREE.Vector3().crossVectors(ref, dir).normalize();
    const vAx = new THREE.Vector3().crossVectors(dir, uAx).normalize();
    inc.sort((a, b) => {
      const angA = Math.atan2(d12Verts[a].dot(vAx), d12Verts[a].dot(uAx));
      const angB = Math.atan2(d12Verts[b].dot(vAx), d12Verts[b].dot(uAx));
      return angA - angB;
    });
    d12FacesDef.push(inc);
  }
  const d12 = buildAtlasPolyhedronGeometry(
    d12Verts,
    d12FacesDef,
    [12, 2, 11, 1, 8, 5, 10, 3, 9, 4, 7, 6].map((v) => ({ value: v })),
    4,
    3,
    0.80,
    true
  );
  d12.restHeight = d12.faces[0].planeDist;

  return { d4, d6, d8, d10, d12, d20 };
}

// ============================================================================
// ARTISAN HOLLOW-TRIM METAL & DEEP REFRACTIVE GEMSTONE DICE MATERIALS
// ============================================================================

const DICE_FINISHES = [
  // Forged Metals (dark recessed enamel face + bright raised metallic edge trim & engraved numerals)
  {
    id: 'gilded_obsidian',
    name: 'Gilded Obsidian & 24k Gold',
    kind: 'metal',
    recessHex: '#171923',
    trimHex: '#f5c451',
    edgeLineHex: 0xfde047,
    inkHex: '#fde047',
    metalness: 0.94,
    roughness: 0.20
  },
  {
    id: 'dwarven_bronze',
    name: 'Antique Dwarven Bronze',
    kind: 'metal',
    recessHex: '#2c1b10',
    trimHex: '#d99048',
    edgeLineHex: 0xfdba74,
    inkHex: '#ffedd5',
    metalness: 0.92,
    roughness: 0.24
  },
  {
    id: 'silver_steel',
    name: 'Runed Mithral & Cobalt Enamel',
    kind: 'metal',
    recessHex: '#0f2342',
    trimHex: '#e2e8f0',
    edgeLineHex: 0xf8fafc,
    inkHex: '#f8fafc',
    metalness: 0.95,
    roughness: 0.18
  },
  {
    id: 'blood_iron',
    name: 'Crimson Enamel & Forged Brass',
    kind: 'metal',
    recessHex: '#450a14',
    trimHex: '#eab308',
    edgeLineHex: 0xfef08a,
    inkHex: '#fef08a',
    metalness: 0.92,
    roughness: 0.22
  },
  // Deep Translucent Gemstones & Dichroic Crystal Glass (with glowing internal prism core!)
  {
    id: 'sapphire_crystal',
    name: 'Deep Glacial Sapphire Crystal',
    kind: 'crystal',
    recessHex: '#0369a1',
    trimHex: '#7dd3fc',
    coreHex: 0x38bdf8,
    edgeLineHex: 0xe0f2fe,
    inkHex: '#fef08a'
  },
  {
    id: 'amethyst_crystal',
    name: 'Cut Amethyst Quartz',
    kind: 'crystal',
    recessHex: '#6b21a8',
    trimHex: '#d8b4fe',
    coreHex: 0xe879f9,
    edgeLineHex: 0xf3e8ff,
    inkHex: '#fde047'
  },
  {
    id: 'emerald_crystal',
    name: 'Faceted Feywild Emerald',
    kind: 'crystal',
    recessHex: '#047857',
    trimHex: '#6ee7b7',
    coreHex: 0x34d399,
    edgeLineHex: 0xd1fae5,
    inkHex: '#fef3c7'
  },
  {
    id: 'ruby_crystal',
    name: 'Heartfire Ruby Glass',
    kind: 'crystal',
    recessHex: '#9f1239',
    trimHex: '#fda4af',
    coreHex: 0xfb7185,
    edgeLineHex: 0xffe4e6,
    inkHex: '#fde047'
  }
];

function createArtisanDieAtlas(polyData, finish) {
  const size = 1024;
  const colorCvs = document.createElement('canvas');
  colorCvs.width = size;
  colorCvs.height = size;
  const cctx = colorCvs.getContext('2d');

  const bumpCvs = document.createElement('canvas');
  bumpCvs.width = size;
  bumpCvs.height = size;
  const bctx = bumpCvs.getContext('2d');

  const roughCvs = document.createElement('canvas');
  roughCvs.width = size;
  roughCvs.height = size;
  const rctx = roughCvs.getContext('2d');

  if (!cctx || !bctx || !rctx) {
    return { map: null, bumpMap: null, roughnessMap: null };
  }

  // Outer frame metal/crystal trim color fills entire atlas first
  cctx.fillStyle = finish.trimHex;
  cctx.fillRect(0, 0, size, size);

  // Bump map: white = raised trim & raised bevels, dark = recessed inlay & engraved numerals
  bctx.fillStyle = '#ffffff';
  bctx.fillRect(0, 0, size, size);

  // Roughness map: dark (0.12) = mirror-polished bevels/crystal, mid (0.42) = recessed enamel/ink
  rctx.fillStyle = finish.kind === 'crystal' ? '#121212' : '#2a2a2a';
  rctx.fillRect(0, 0, size, size);

  const { atlasCols, atlasRows, faces } = polyData;
  const cellW = size / atlasCols;
  const cellH = size / atlasRows;

  faces.forEach((f, idx) => {
    const col = idx % atlasCols;
    const row = Math.floor(idx / atlasCols);
    const cx = (col + 0.5) * cellW;
    const cy = (row + 0.5) * cellH;
    const scaleX = 0.44 * cellW;
    const scaleY = 0.44 * cellH;

    if (f.localVertsNorm && f.localVertsNorm.length >= 3) {
      // Inset recessed polygon (80% of face radius) — creates genuine raised metallic frame border on every facet!
      const inset = finish.kind === 'metal' ? 0.80 : 0.88;

      const traceScaledPoly = (targetCtx, sc) => {
        targetCtx.beginPath();
        f.localVertsNorm.forEach((lv, vi) => {
          const px = cx + lv.x * scaleX * sc;
          const py = cy - lv.y * scaleY * sc;
          if (vi === 0) targetCtx.moveTo(px, py);
          else targetCtx.lineTo(px, py);
        });
        targetCtx.closePath();
      };

      // Recessed enamel / deep crystal interior facet
      traceScaledPoly(cctx, inset);
      const radGrad = cctx.createRadialGradient(
        cx - scaleX * 0.18,
        cy - scaleY * 0.18,
        4,
        cx,
        cy,
        Math.max(scaleX, scaleY) * inset
      );
      if (finish.kind === 'crystal') {
        radGrad.addColorStop(0, finish.trimHex);
        radGrad.addColorStop(0.45, finish.recessHex);
        radGrad.addColorStop(1, '#090d16');
      } else {
        radGrad.addColorStop(0, finish.recessHex);
        radGrad.addColorStop(1, '#08090d');
      }
      cctx.fillStyle = radGrad;
      cctx.fill();

      // Fine filigree inner hairline inside metal dice facets
      cctx.strokeStyle = finish.trimHex;
      cctx.lineWidth = Math.max(1.8, Math.min(cellW, cellH) * 0.014);
      cctx.stroke();

      // Recessed pocket in bump & slightly higher roughness in enamel pocket
      traceScaledPoly(bctx, inset);
      bctx.fillStyle = '#555555';
      bctx.fill();

      traceScaledPoly(rctx, inset);
      rctx.fillStyle = finish.kind === 'crystal' ? '#181818' : '#686868';
      rctx.fill();
    }

    // Crisp engraved serif numerals
    if (f.meta && f.meta.isD4) {
      const fontPx = Math.round(Math.min(cellW, cellH) * 0.195);
      f.localVertsNorm.forEach((lv, cornerIdx) => {
        const val = f.meta.cornerValues[cornerIdx];
        const vx = lv.x * scaleX * 0.50;
        const vy = -lv.y * scaleY * 0.50;
        const angle = Math.atan2(vx, -vy);

        cctx.save();
        cctx.translate(cx + vx, cy + vy);
        cctx.rotate(angle);
        cctx.font = `700 ${fontPx}px Georgia, "Times New Roman", serif`;
        cctx.textAlign = 'center';
        cctx.textBaseline = 'middle';
        cctx.lineWidth = Math.max(2, fontPx * 0.12);
        cctx.strokeStyle = 'rgba(0,0,0,0.75)';
        cctx.strokeText(String(val), 0, 0);
        cctx.fillStyle = finish.inkHex;
        cctx.fillText(String(val), 0, 0);
        cctx.restore();

        bctx.save();
        bctx.translate(cx + vx, cy + vy);
        bctx.rotate(angle);
        bctx.font = `700 ${fontPx}px Georgia, "Times New Roman", serif`;
        bctx.textAlign = 'center';
        bctx.textBaseline = 'middle';
        bctx.fillStyle = '#ffffff';
        bctx.fillText(String(val), 0, 0);
        bctx.restore();
      });
    } else if (f.meta && f.meta.value !== undefined) {
      const val = f.meta.value;
      const numFaces = faces.length;
      const fontRatio = numFaces >= 20 ? 0.27 : numFaces >= 12 ? 0.31 : 0.35;
      const fontPx = Math.round(Math.min(cellW, cellH) * fontRatio);
      const label = String(val);
      const needsDot = (val === 6 || val === 9) && numFaces >= 10;

      cctx.save();
      cctx.translate(cx, cy);
      cctx.font = `700 ${fontPx}px Georgia, "Times New Roman", serif`;
      cctx.textAlign = 'center';
      cctx.textBaseline = 'middle';
      cctx.lineWidth = Math.max(2.5, fontPx * 0.12);
      cctx.strokeStyle = 'rgba(0,0,0,0.80)';
      cctx.strokeText(label, 0, 0);
      cctx.fillStyle = finish.inkHex;
      cctx.fillText(label, 0, 0);
      if (needsDot) {
        const uw = fontPx * 0.44;
        cctx.fillRect(-uw * 0.5, fontPx * 0.44, uw, Math.max(2.5, fontPx * 0.08));
      }
      cctx.restore();

      bctx.save();
      bctx.translate(cx, cy);
      bctx.font = `700 ${fontPx}px Georgia, "Times New Roman", serif`;
      bctx.textAlign = 'center';
      bctx.textBaseline = 'middle';
      bctx.fillStyle = '#ffffff';
      bctx.fillText(label, 0, 0);
      bctx.restore();
    }
  });

  const map = new THREE.CanvasTexture(colorCvs);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;

  const bumpMap = new THREE.CanvasTexture(bumpCvs);
  bumpMap.anisotropy = 8;

  const roughnessMap = new THREE.CanvasTexture(roughCvs);
  roughnessMap.anisotropy = 8;

  return { map, bumpMap, roughnessMap };
}

function createArtisanDieMaterialBundle(polyData, finish) {
  const { map, bumpMap, roughnessMap } = createArtisanDieAtlas(polyData, finish);
  const edgeMat = new THREE.LineBasicMaterial({
    color: finish.edgeLineHex,
    transparent: true,
    opacity: finish.kind === 'crystal' ? 0.68 : 0.45
  });

  if (finish.kind === 'crystal') {
    const outerMat = new THREE.MeshPhysicalMaterial({
      map,
      bumpMap,
      bumpScale: 0.035,
      roughnessMap,
      metalness: 0.08,
      roughness: 0.08,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      envMapIntensity: 2.4,
      transparent: true,
      opacity: 0.78,
      depthWrite: true
    });
    // Internal refractive glowing gemstone heart
    const innerCoreMat = new THREE.MeshBasicMaterial({
      color: finish.coreHex,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    return { outerMat, edgeMat, innerCoreMat };
  }

  const outerMat = new THREE.MeshStandardMaterial({
    map,
    bumpMap,
    bumpScale: 0.055,
    roughnessMap,
    metalness: finish.metalness,
    roughness: 1.0,
    envMapIntensity: 2.1
  });
  return { outerMat, edgeMat, innerCoreMat: null };
}

// ============================================================================
// BATTLEMAT, WOOD PLANKS & ILLUSTRATED STANDEE TOKEN TEXTURES
// ============================================================================

const TABLE_THEMES = {
  parchment_tavern: {
    woodBase: '#382011',
    woodDark: '#1d0f07',
    matTop: '#cbb894',
    matBot: '#ab946c',
    stonePatch: 'rgba(87, 68, 44, 0.14)',
    gridMinor: 'rgba(58, 40, 22, 0.36)',
    gridMajor: 'rgba(38, 24, 10, 0.58)',
    trayWood: 0x3b180c,
    trayFelt: 0x5c111a
  },
  dungeon_slate: {
    woodBase: '#221c20',
    woodDark: '#110d10',
    matTop: '#3b4454',
    matBot: '#262d38',
    stonePatch: 'rgba(15, 23, 42, 0.28)',
    gridMinor: 'rgba(148, 163, 184, 0.25)',
    gridMajor: 'rgba(226, 232, 240, 0.45)',
    trayWood: 0x1e293b,
    trayFelt: 0x172554
  },
  emerald_velvet: {
    woodBase: '#3d1610',
    woodDark: '#1e0906',
    matTop: '#15523c',
    matBot: '#0b3324',
    stonePatch: 'rgba(4, 24, 16, 0.25)',
    gridMinor: 'rgba(167, 243, 208, 0.22)',
    gridMajor: 'rgba(251, 191, 36, 0.42)',
    trayWood: 0x451a11,
    trayFelt: 0x064e3b
  }
};

function createBattlematTexture(theme) {
  const cvs = document.createElement('canvas');
  cvs.width = 1024;
  cvs.height = 768;
  const ctx = cvs.getContext('2d');
  if (!ctx) return null;

  const grad = ctx.createRadialGradient(512, 384, 50, 512, 384, 650);
  grad.addColorStop(0, theme.matTop);
  grad.addColorStop(1, theme.matBot);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 768);

  const cols = 16;
  const rows = 12;
  const sqW = 1024 / cols;
  const sqH = 768 / rows;

  // Hand-drawn stone flagstone bevels & dungeon chamber walls on the tactical battlemat
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if ((c * 7 + r * 13) % 5 === 0) {
        ctx.fillStyle = theme.stonePatch;
        ctx.fillRect(c * sqW + 2, r * sqH + 2, sqW - 4, sqH - 4);
      }
    }
  }

  // Sketched dungeon chamber perimeter (rows 1..10, cols 1..14) with doorway gaps
  ctx.strokeStyle = theme.gridMajor;
  ctx.lineWidth = 6;
  ctx.strokeRect(sqW * 1, sqH * 1, sqW * 14, sqH * 10);

  // Corner stone pillars on the map
  for (const [px, py] of [
    [sqW * 3, sqH * 3],
    [sqW * 13, sqH * 3],
    [sqW * 3, sqH * 9],
    [sqW * 13, sqH * 9]
  ]) {
    ctx.fillStyle = 'rgba(30, 25, 20, 0.28)';
    ctx.beginPath();
    ctx.arc(px, py, sqW * 0.36, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = theme.gridMajor;
    ctx.stroke();
  }

  // Crisp 1-inch square grid lines
  for (let c = 0; c <= cols; c++) {
    ctx.strokeStyle = c % 4 === 0 ? theme.gridMajor : theme.gridMinor;
    ctx.lineWidth = c % 4 === 0 ? 2.0 : 1.1;
    ctx.beginPath();
    ctx.moveTo(c * sqW, 0);
    ctx.lineTo(c * sqW, 768);
    ctx.stroke();
  }
  for (let r = 0; r <= rows; r++) {
    ctx.strokeStyle = r % 4 === 0 ? theme.gridMajor : theme.gridMinor;
    ctx.lineWidth = r % 4 === 0 ? 2.0 : 1.1;
    ctx.beginPath();
    ctx.moveTo(0, r * sqH);
    ctx.lineTo(1024, r * sqH);
    ctx.stroke();
  }

  // Stitched leather binding around edge of battlemat
  ctx.strokeStyle = '#1c130d';
  ctx.lineWidth = 20;
  ctx.strokeRect(10, 10, 1004, 748);
  ctx.setLineDash([10, 8]);
  ctx.strokeStyle = 'rgba(217, 169, 96, 0.62)';
  ctx.lineWidth = 2.2;
  ctx.strokeRect(17, 17, 990, 734);
  ctx.setLineDash([]);

  const tex = new THREE.CanvasTexture(cvs);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createWoodTableTexture(theme) {
  const cvs = document.createElement('canvas');
  cvs.width = 512;
  cvs.height = 512;
  const ctx = cvs.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = theme.woodBase;
  ctx.fillRect(0, 0, 512, 512);

  const plankCount = 6;
  const plankH = 512 / plankCount;
  for (let p = 0; p < plankCount; p++) {
    const y0 = p * plankH;
    ctx.fillStyle = p % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.07)';
    ctx.fillRect(0, y0, 512, plankH);
    ctx.fillStyle = theme.woodDark;
    ctx.fillRect(0, y0, 512, 3);

    for (let g = 0; g < 28; g++) {
      const gy = y0 + 4 + ((g * 17) % (plankH - 6));
      ctx.strokeStyle = g % 3 === 0 ? 'rgba(0,0,0,0.16)' : 'rgba(255,220,180,0.04)';
      ctx.lineWidth = 1 + (g % 2);
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.bezierCurveTo(170, gy + ((g % 5) - 2) * 2.5, 340, gy - ((g % 4) - 1.5) * 2.5, 512, gy);
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(cvs);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  return tex;
}

// Build flat tabletop RPG brass-rimmed portrait pog/coin tokens (authentic tabletop tokens, zero weird blobs!)
function createTokenCrestTexture(unit) {
  const cvs = document.createElement('canvas');
  cvs.width = 256;
  cvs.height = 256;
  const ctx = cvs.getContext('2d');
  if (!ctx) return null;

  const grad = ctx.createRadialGradient(128, 108, 16, 128, 128, 124);
  grad.addColorStop(0, unit.tokenColor);
  grad.addColorStop(0.65, '#1e293b');
  grad.addColorStop(1, '#090d16');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(128, 128, 124, 0, Math.PI * 2);
  ctx.fill();

  // Ornate inner metallic ring
  ctx.strokeStyle = '#fde68a';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(128, 128, 110, 0, Math.PI * 2);
  ctx.stroke();

  // Class / Monster emblem glyph + short label
  ctx.fillStyle = '#fffbeb';
  ctx.font = 'bold 84px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(unit.emblem || unit.name.charAt(0), 128, 114);

  ctx.fillStyle = '#fde68a';
  ctx.font = 'bold 22px sans-serif';
  const shortName = unit.name.split(' ')[0].toUpperCase();
  ctx.fillText(shortName.slice(0, 9), 128, 186);

  const tex = new THREE.CanvasTexture(cvs);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function buildTabletopToken(unit, isLarge = false) {
  const group = new THREE.Group();
  const r = isLarge ? 0.68 : 0.46;

  // Heavy milled brass/pewter coin bezel + recessed illustrated portrait face
  const bezelMat = new THREE.MeshStandardMaterial({
    color: unit.side === 'party' ? 0xd4a024 : 0x991b1b,
    metalness: 0.88,
    roughness: 0.24
  });
  const crestTex = createTokenCrestTexture(unit);
  const topMat = new THREE.MeshStandardMaterial({
    map: crestTex,
    roughness: 0.35,
    metalness: 0.15
  });

  const discGeo = new THREE.CylinderGeometry(r, r * 1.04, 0.14, 36);
  const disc = new THREE.Mesh(discGeo, bezelMat);
  disc.position.y = 0.07;
  disc.castShadow = true;
  disc.receiveShadow = true;
  group.add(disc);

  const capGeo = new THREE.CircleGeometry(r * 0.96, 36);
  const cap = new THREE.Mesh(capGeo, topMat);
  cap.rotation.x = -Math.PI / 2;
  cap.position.y = 0.142;
  group.add(cap);

  // Subtle glowing tactical target/attacker ring on battlemat
  const activeRingGeo = new THREE.RingGeometry(r * 1.12, r * 1.28, 40);
  const activeRingMat = new THREE.MeshBasicMaterial({
    color: 0xfacc15,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.0
  });
  const activeRing = new THREE.Mesh(activeRingGeo, activeRingMat);
  activeRing.rotation.x = -Math.PI / 2;
  activeRing.position.y = 0.02;
  group.add(activeRing);

  return { group, activeRingMat, crestTex };
}

function createOpenGrimoirePageTexture(isRightPage) {
  const cvs = document.createElement('canvas');
  cvs.width = 512;
  cvs.height = 640;
  const ctx = cvs.getContext('2d');
  if (!ctx) return null;

  // Aged vellum page with gutter shadow
  const g = ctx.createLinearGradient(isRightPage ? 0 : 512, 0, isRightPage ? 120 : 392, 0);
  g.addColorStop(0, '#bfa984');
  g.addColorStop(0.35, '#eadbc0');
  g.addColorStop(1, '#f3e7cf');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 640);

  ctx.strokeStyle = 'rgba(102, 68, 34, 0.45)';
  ctx.lineWidth = 4;
  ctx.strokeRect(28, 28, 456, 584);

  ctx.fillStyle = '#451a03';
  ctx.font = 'bold 24px Georgia, serif';
  ctx.fillText(isRightPage ? 'EVOCATION  •  5E SRD' : 'COMBAT  &  ACTIONS', 52, 74);

  if (isRightPage) {
    // Arcane geometric spell diagram on right page
    ctx.save();
    ctx.translate(256, 245);
    ctx.strokeStyle = '#7c2d12';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 96, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 78, 0, Math.PI * 2);
    ctx.stroke();
    for (let k = 0; k < 6; k++) {
      const a0 = (k * Math.PI) / 3;
      const a1 = ((k + 2) * Math.PI) / 3;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a0) * 78, Math.sin(a0) * 78);
      ctx.lineTo(Math.cos(a1) * 78, Math.sin(a1) * 78);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Calligraphic text lines
  ctx.strokeStyle = 'rgba(69, 26, 3, 0.42)';
  ctx.lineWidth = 2;
  const startY = isRightPage ? 380 : 118;
  for (let y = startY; y < 576; y += 24) {
    if (y % 96 === 0) continue;
    ctx.beginPath();
    ctx.moveTo(52, y);
    ctx.lineTo(448 - ((y * 13) % 70), y);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(cvs);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createCharacterSheetTexture() {
  const cvs = document.createElement('canvas');
  cvs.width = 512;
  cvs.height = 660;
  const ctx = cvs.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#f2e8d5';
  ctx.fillRect(0, 0, 512, 660);

  ctx.strokeStyle = '#3e3224';
  ctx.lineWidth = 4;
  ctx.strokeRect(22, 22, 468, 70);
  ctx.fillStyle = '#3e3224';
  ctx.font = 'bold 20px Georgia, serif';
  ctx.fillText('5E CHARACTER SHEET', 38, 52);
  ctx.font = '13px monospace';
  ctx.fillText('Ser Rowan  •  Lv.7 Paladin  •  AC 19', 38, 76);

  const stats = [
    ['STR', '+4'], ['DEX', '+1'], ['CON', '+3'],
    ['INT', '+0'], ['WIS', '+2'], ['CHA', '+4']
  ];
  stats.forEach(([st, mod], i) => {
    const by = 112 + i * 84;
    ctx.strokeRect(26, by, 76, 68);
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(st, 64, by + 20);
    ctx.font = 'bold 22px Georgia, serif';
    ctx.fillText(mod, 64, by + 50);
  });

  ctx.textAlign = 'left';
  ctx.strokeRect(122, 112, 364, 180);
  ctx.font = 'bold 14px Georgia, serif';
  ctx.fillText('WEAPONS & SPELL ATTACKS', 138, 138);
  ctx.font = '13px monospace';
  ctx.fillText('Radiant Longsword   +8   2d8+5', 138, 174);
  ctx.fillText('Divine Smite        --   +3d8 Rad', 138, 208);
  ctx.fillText('Heavy Javelin       +7   1d6+4', 138, 242);

  ctx.strokeRect(122, 312, 364, 300);
  for (let y = 350; y < 590; y += 26) {
    ctx.beginPath();
    ctx.moveTo(138, y);
    ctx.lineTo(468, y);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(cvs);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Build clean, grounded tabletop RPG paraphernalia around the perimeter of the battlemat
function buildTabletopPerimeterProps(propsGroup, theme, polyCatalog, getDieMaterialFn) {
  propsGroup.clear();

  const walnutMat = new THREE.MeshStandardMaterial({ color: theme.trayWood, roughness: 0.42, metalness: 0.06 });
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xd4a024, roughness: 0.22, metalness: 0.90 });
  const feltMat = new THREE.MeshStandardMaterial({ color: theme.trayFelt, roughness: 0.88, metalness: 0.02 });

  // 1. Octagonal Walnut & Crimson Velvet Dice Tray (upper-left corner, holding resting spare polyhedra!)
  const trayGrp = new THREE.Group();
  trayGrp.position.set(-7.35, 0, -4.45);
  trayGrp.rotation.y = 0.22;

  const bed = new THREE.Mesh(new THREE.CylinderGeometry(1.82, 1.88, 0.08, 8), feltMat);
  bed.position.y = 0.04;
  bed.receiveShadow = true;
  trayGrp.add(bed);

  const wallR = 1.80;
  const sideL = 2 * wallR * Math.tan(Math.PI / 8) + 0.15;
  for (let i = 0; i < 8; i++) {
    const ang = (i * Math.PI) / 4 + Math.PI / 8;
    const wall = new THREE.Mesh(new THREE.BoxGeometry(sideL, 0.36, 0.20), walnutMat);
    wall.position.set(Math.sin(ang) * wallR, 0.18, Math.cos(ang) * wallR);
    wall.rotation.y = ang;
    wall.castShadow = true;
    wall.receiveShadow = true;
    trayGrp.add(wall);
  }

  // Place 3 spare resting polyhedral dice neatly inside the velvet dice tray!
  const trayDiceSpecs = [
    { sides: 20, finish: DICE_FINISHES[0], x: -0.55, z: -0.35, yaw: 0.4 },
    { sides: 12, finish: DICE_FINISHES[4], x: 0.48, z: -0.20, yaw: 1.1 },
    { sides: 8, finish: DICE_FINISHES[1], x: -0.05, z: 0.55, yaw: -0.6 }
  ];
  for (const td of trayDiceSpecs) {
    const poly = polyCatalog[`d${td.sides}`];
    const bundle = getDieMaterialFn(td.sides, td.finish);
    const m = new THREE.Mesh(poly.geometry, bundle.outerMat);
    m.scale.setScalar(0.72);
    m.position.set(td.x, 0.08 + poly.restHeight * 0.72, td.z);
    m.rotation.y = td.yaw;
    m.castShadow = true;
    trayGrp.add(m);
  }
  propsGroup.add(trayGrp);

  // 2. Open Brass-Bound Spellbook / Rules Grimoire (upper-right behind battlemat)
  const bookGrp = new THREE.Group();
  bookGrp.position.set(3.8, 0.02, -5.65);
  bookGrp.rotation.y = -0.18;

  const leatherMat = new THREE.MeshStandardMaterial({ color: 0x3b1212, roughness: 0.58, metalness: 0.08 });
  const coverL = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.08, 2.65), leatherMat);
  coverL.position.set(-0.98, 0.04, 0);
  coverL.rotation.z = 0.04;
  coverL.castShadow = true;
  bookGrp.add(coverL);

  const coverR = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.08, 2.65), leatherMat);
  coverR.position.set(0.98, 0.04, 0);
  coverR.rotation.z = -0.04;
  coverR.castShadow = true;
  bookGrp.add(coverR);

  const pageMatL = new THREE.MeshStandardMaterial({ map: createOpenGrimoirePageTexture(false), roughness: 0.82 });
  const pageMatR = new THREE.MeshStandardMaterial({ map: createOpenGrimoirePageTexture(true), roughness: 0.82 });
  const pageBlockMat = new THREE.MeshStandardMaterial({ color: 0xe6d5b8, roughness: 0.85 });

  const pageL = new THREE.Mesh(
    new THREE.BoxGeometry(1.82, 0.18, 2.48),
    [pageBlockMat, pageBlockMat, pageMatL, pageBlockMat, pageBlockMat, pageBlockMat]
  );
  pageL.position.set(-0.93, 0.15, 0);
  pageL.rotation.z = 0.05;
  pageL.castShadow = true;
  pageL.receiveShadow = true;
  bookGrp.add(pageL);

  const pageR = new THREE.Mesh(
    new THREE.BoxGeometry(1.82, 0.18, 2.48),
    [pageBlockMat, pageBlockMat, pageMatR, pageBlockMat, pageBlockMat, pageBlockMat]
  );
  pageR.position.set(0.93, 0.15, 0);
  pageR.rotation.z = -0.05;
  pageR.castShadow = true;
  pageR.receiveShadow = true;
  bookGrp.add(pageR);

  // Crimson silk ribbon bookmark draping down center spine
  const ribbon = new THREE.Mesh(
    new THREE.BoxGeometry(0.10, 0.02, 2.85),
    new THREE.MeshStandardMaterial({ color: 0xbe123c, roughness: 0.65 })
  );
  ribbon.position.set(0.02, 0.25, 0.12);
  bookGrp.add(ribbon);
  propsGroup.add(bookGrp);

  // 3. Character Sheet & Sharpened Cedar #2 Pencil (left edge of battlemat)
  const sheet = new THREE.Mesh(
    new THREE.PlaneGeometry(3.3, 4.25),
    new THREE.MeshStandardMaterial({ map: createCharacterSheetTexture(), roughness: 0.86 })
  );
  sheet.rotation.x = -Math.PI / 2;
  sheet.rotation.z = 0.10;
  sheet.position.set(-8.35, 0.012, 0.85);
  sheet.receiveShadow = true;
  propsGroup.add(sheet);

  const pencilGrp = new THREE.Group();
  pencilGrp.position.set(-7.35, 0.075, 1.85);
  pencilGrp.rotation.y = -0.48;
  pencilGrp.rotation.x = Math.PI / 2;

  const pShaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, 2.4, 6),
    new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.42 })
  );
  pShaft.castShadow = true;
  pencilGrp.add(pShaft);

  const pCone = new THREE.Mesh(
    new THREE.ConeGeometry(0.06, 0.22, 12),
    new THREE.MeshStandardMaterial({ color: 0xfde68a, roughness: 0.7 })
  );
  pCone.position.y = 1.31;
  pencilGrp.add(pCone);

  const pLead = new THREE.Mesh(
    new THREE.ConeGeometry(0.022, 0.08, 12),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3 })
  );
  pLead.position.y = 1.39;
  pencilGrp.add(pLead);

  const pFerrule = new THREE.Mesh(new THREE.CylinderGeometry(0.063, 0.063, 0.15, 16), brassMat);
  pFerrule.position.y = -1.27;
  pencilGrp.add(pFerrule);

  const pEraser = new THREE.Mesh(
    new THREE.CylinderGeometry(0.059, 0.059, 0.15, 16),
    new THREE.MeshStandardMaterial({ color: 0xe17086, roughness: 0.75 })
  );
  pEraser.position.y = -1.41;
  pencilGrp.add(pEraser);
  propsGroup.add(pencilGrp);

  // 4. Wax-Sealed Rolled Dungeon Map Scroll + Minted Gold Dragon Coins (bottom-left corner)
  const scrollGrp = new THREE.Group();
  scrollGrp.position.set(-7.1, 0.20, 4.35);
  scrollGrp.rotation.y = 0.42;
  scrollGrp.rotation.z = Math.PI / 2;

  const vellumMat = new THREE.MeshStandardMaterial({ color: 0xe7d6b5, roughness: 0.78 });
  const scrollTube = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, 2.35, 24), vellumMat);
  scrollTube.castShadow = true;
  scrollTube.receiveShadow = true;
  scrollGrp.add(scrollTube);

  const waxBand = new THREE.Mesh(
    new THREE.CylinderGeometry(0.215, 0.215, 0.22, 24),
    new THREE.MeshStandardMaterial({ color: 0x9f1239, roughness: 0.42 })
  );
  scrollGrp.add(waxBand);

  const waxSeal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.18, 0.07, 20),
    new THREE.MeshStandardMaterial({ color: 0xbe123c, roughness: 0.35 })
  );
  waxSeal.position.set(0.20, 0, 0);
  waxSeal.rotation.z = Math.PI / 2;
  scrollGrp.add(waxSeal);
  propsGroup.add(scrollGrp);

  // Minted Gold & Silver Coins beside scroll
  const goldCoinMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.95, roughness: 0.18 });
  const silverCoinMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.94, roughness: 0.20 });
  const coinGeo = new THREE.CylinderGeometry(0.23, 0.23, 0.045, 24);
  for (const st of [
    { x: -5.4, z: 4.55, n: 4, gold: true },
    { x: -4.85, z: 4.72, n: 2, gold: true },
    { x: -5.15, z: 5.02, n: 3, gold: false }
  ]) {
    for (let c = 0; c < st.n; c++) {
      const cn = new THREE.Mesh(coinGeo, st.gold ? goldCoinMat : silverCoinMat);
      cn.position.set(st.x + (c % 2) * 0.02, 0.023 + c * 0.046, st.z - (c % 3) * 0.015);
      cn.castShadow = true;
      cn.receiveShadow = true;
      propsGroup.add(cn);
    }
  }
}

// ============================================================================
// 5E SRD COMBAT ROSTER
// ============================================================================

const PARTY_ROSTER = [
  {
    name: 'Ser Rowan',
    emblem: '⚔',
    cls: 'Lv.7 Human Paladin',
    ac: 19,
    maxHp: 64,
    saves: { STR: 6, DEX: 1, CON: 4, WIS: 5, CHA: 7 },
    spellDc: 15,
    tokenColor: '#b45309',
    actions: [
      { name: 'Radiant Longsword', kind: 'attack', atkBonus: 8, dice: [{ sides: 8, count: 2 }], flatMod: 5, dmgType: 'Radiant' },
      { name: 'Divine Smite Strike', kind: 'attack', atkBonus: 8, dice: [{ sides: 8, count: 4 }], flatMod: 5, dmgType: 'Radiant' }
    ]
  },
  {
    name: 'Lyra Shadowstep',
    emblem: '🗡',
    cls: 'Lv.7 Elf Rogue',
    ac: 16,
    maxHp: 48,
    saves: { STR: 0, DEX: 8, CON: 2, INT: 5, WIS: 2 },
    spellDc: 14,
    tokenColor: '#0369a1',
    actions: [
      { name: 'Sneak Attack Rapier', kind: 'attack', atkBonus: 8, rollMode: 'advantage', dice: [{ sides: 8, count: 1 }, { sides: 6, count: 4 }], flatMod: 5, dmgType: 'Piercing' },
      { name: 'Twin Dagger Flurry', kind: 'attack', atkBonus: 8, dice: [{ sides: 4, count: 2 }, { sides: 6, count: 2 }], flatMod: 5, dmgType: 'Piercing' }
    ]
  },
  {
    name: 'Thrain Ironbrow',
    emblem: '🪓',
    cls: 'Lv.7 Dwarf Barbarian',
    ac: 16,
    maxHp: 82,
    saves: { STR: 8, DEX: 2, CON: 7, WIS: 1, CHA: 0 },
    spellDc: 13,
    tokenColor: '#9a3412',
    actions: [
      { name: 'Reckless Greataxe', kind: 'attack', atkBonus: 8, rollMode: 'advantage', dice: [{ sides: 12, count: 2 }], flatMod: 7, dmgType: 'Slashing' },
      { name: 'Heavy Maul Slam', kind: 'attack', atkBonus: 8, dice: [{ sides: 6, count: 3 }], flatMod: 7, dmgType: 'Bludgeoning' }
    ]
  },
  {
    name: 'Caelum Starweaver',
    emblem: '✦',
    cls: 'Lv.7 Evocation Wizard',
    ac: 15,
    maxHp: 42,
    saves: { STR: -1, DEX: 3, CON: 3, INT: 8, WIS: 5 },
    spellDc: 16,
    tokenColor: '#6b21a8',
    actions: [
      { name: 'Fireball (3rd-Lv)', kind: 'save', saveStat: 'DEX', halfOnSave: true, dice: [{ sides: 6, count: 6 }], flatMod: 0, dmgType: 'Fire' },
      { name: 'Fire Bolt Cantrip', kind: 'attack', atkBonus: 8, dice: [{ sides: 10, count: 2 }], flatMod: 0, dmgType: 'Fire' },
      { name: 'Magic Missile Volley', kind: 'attack', atkBonus: 12, dice: [{ sides: 4, count: 4 }], flatMod: 4, dmgType: 'Force' }
    ]
  }
];

const MONSTER_WAVES = [
  [
    {
      name: 'Young Red Dragon',
      emblem: '🐉',
      cls: 'CR 10 Large Dragon',
      ac: 18,
      maxHp: 136,
      saves: { STR: 6, DEX: 4, CON: 9, WIS: 4, CHA: 8 },
      spellDc: 17,
      tokenColor: '#991b1b',
      actions: [
        { name: 'Draconic Bite', kind: 'attack', atkBonus: 10, dice: [{ sides: 10, count: 2 }, { sides: 6, count: 1 }], flatMod: 6, dmgType: 'Piercing + Fire' },
        { name: 'Fire Breath', kind: 'save', saveStat: 'DEX', halfOnSave: true, dice: [{ sides: 6, count: 6 }], flatMod: 0, dmgType: 'Fire' }
      ]
    },
    {
      name: 'Scale-Sorcerer',
      emblem: '🔥',
      cls: 'CR 2 Dragonkin Mage',
      ac: 15,
      maxHp: 38,
      saves: { STR: -2, DEX: 2, CON: 1, WIS: 0, CHA: 4 },
      spellDc: 13,
      tokenColor: '#be123c',
      actions: [
        { name: 'Scorching Ray', kind: 'attack', atkBonus: 5, dice: [{ sides: 6, count: 3 }], flatMod: 0, dmgType: 'Fire' }
      ]
    }
  ],
  [
    {
      name: 'Frost Giant Jarl',
      emblem: '❄',
      cls: 'CR 8 Huge Giant',
      ac: 15,
      maxHp: 126,
      saves: { STR: 9, DEX: -1, CON: 8, WIS: 3, CHA: 4 },
      spellDc: 15,
      tokenColor: '#1d4ed8',
      actions: [
        { name: 'Runed Greataxe', kind: 'attack', atkBonus: 9, dice: [{ sides: 12, count: 3 }], flatMod: 6, dmgType: 'Slashing' },
        { name: 'Glacial Boulder', kind: 'attack', atkBonus: 9, dice: [{ sides: 10, count: 3 }], flatMod: 6, dmgType: 'Bludgeoning' }
      ]
    },
    {
      name: 'Winter Wolf',
      emblem: '🐺',
      cls: 'CR 3 Large Beast',
      ac: 13,
      maxHp: 64,
      saves: { STR: 4, DEX: 1, CON: 2, WIS: 1, CHA: -1 },
      spellDc: 12,
      tokenColor: '#0284c7',
      actions: [
        { name: 'Pack Tactics Bite', kind: 'attack', atkBonus: 6, rollMode: 'advantage', dice: [{ sides: 6, count: 2 }], flatMod: 4, dmgType: 'Piercing' },
        { name: 'Cold Breath', kind: 'save', saveStat: 'DEX', halfOnSave: true, dice: [{ sides: 8, count: 4 }], flatMod: 0, dmgType: 'Cold' }
      ]
    }
  ],
  [
    {
      name: 'Dread Wight Lord',
      emblem: '💀',
      cls: 'CR 6 Undead Warlord',
      ac: 17,
      maxHp: 96,
      saves: { STR: 6, DEX: 3, CON: 6, WIS: 4, CHA: 5 },
      spellDc: 15,
      tokenColor: '#047857',
      actions: [
        { name: 'Necrotic Greatsword', kind: 'attack', atkBonus: 7, dice: [{ sides: 6, count: 2 }, { sides: 8, count: 2 }], flatMod: 4, dmgType: 'Necrotic' }
      ]
    },
    {
      name: 'Skeletal Archmage',
      emblem: '☠',
      cls: 'CR 5 Undead Lichling',
      ac: 15,
      maxHp: 58,
      saves: { STR: -1, DEX: 2, CON: 3, INT: 7, WIS: 4 },
      spellDc: 15,
      tokenColor: '#6d28d9',
      actions: [
        { name: 'Blight Wave', kind: 'save', saveStat: 'CON', halfOnSave: true, dice: [{ sides: 8, count: 5 }], flatMod: 0, dmgType: 'Necrotic' }
      ]
    }
  ]
];

// ============================================================================
// MAIN SCREENSAVER FACTORY
// ============================================================================

export function createDnD5eDice(canvas, getParams) {
  let w = canvas.clientWidth || canvas.width || 1280;
  let h = canvas.clientHeight || canvas.height || 720;

  let renderer = null;
  let fallbackCtx = null;

  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    renderer.setSize(w, h, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
  } catch (_err) {
    fallbackCtx = canvas.getContext('2d');
  }

  let hudCanvas = null;
  let hudCtx = null;
  const parent = canvas.parentElement;
  if (parent) {
    hudCanvas = document.createElement('canvas');
    hudCanvas.className = 'dnd5e-hud-overlay';
    hudCanvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:5;';
    hudCanvas.width = w;
    hudCanvas.height = h;
    parent.appendChild(hudCanvas);
    hudCtx = hudCanvas.getContext('2d');
  } else if (fallbackCtx) {
    hudCtx = fallbackCtx;
  }

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x110b07);
  scene.fog = new THREE.FogExp2(0x110b07, 0.020);

  const envTex = createTavernEnvTexture();
  if (envTex) {
    scene.environment = envTex;
  }

  const camera = new THREE.PerspectiveCamera(34, w / Math.max(1, h), 0.1, 120);

  // Warm Tavern + Crisp Overhead Rim Lighting
  const hemiLight = new THREE.HemisphereLight(0xfffbeb, 0x24150e, 0.72);
  scene.add(hemiLight);

  const keyLight = new THREE.DirectionalLight(0xfff4e0, 2.35);
  keyLight.position.set(-5.0, 14.5, 7.2);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 2048;
  keyLight.shadow.mapSize.height = 2048;
  keyLight.shadow.camera.near = 2;
  keyLight.shadow.camera.far = 32;
  keyLight.shadow.camera.left = -11;
  keyLight.shadow.camera.right = 11;
  keyLight.shadow.camera.top = 9;
  keyLight.shadow.camera.bottom = -9;
  keyLight.shadow.bias = -0.0004;
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0xbae6fd, 1.05);
  rimLight.position.set(8.5, 8.0, -8.0);
  scene.add(rimLight);

  const warmPoint = new THREE.PointLight(0xfb923c, 2.6, 18, 1.5);
  warmPoint.position.set(-4.8, 3.2, -4.5);
  scene.add(warmPoint);

  // Table & Battlemat
  const tableGeo = new THREE.PlaneGeometry(42, 32);
  const tableMat = new THREE.MeshStandardMaterial({ roughness: 0.58, metalness: 0.05 });
  const tableMesh = new THREE.Mesh(tableGeo, tableMat);
  tableMesh.rotation.x = -Math.PI / 2;
  tableMesh.position.y = -0.02;
  tableMesh.receiveShadow = true;
  scene.add(tableMesh);

  const matGeo = new THREE.BoxGeometry(13.0, 0.05, 9.75);
  const matSideMat = new THREE.MeshStandardMaterial({ color: 0x1c130d, roughness: 0.85 });
  const matTopMat = new THREE.MeshStandardMaterial({ roughness: 0.74, metalness: 0.03 });
  const battlematMesh = new THREE.Mesh(matGeo, [
    matSideMat, matSideMat, matTopMat, matSideMat, matSideMat, matSideMat
  ]);
  battlematMesh.position.set(-0.6, 0.005, 0.15);
  battlematMesh.receiveShadow = true;
  scene.add(battlematMesh);

  const propsGroup = new THREE.Group();
  scene.add(propsGroup);

  const tokensGroup = new THREE.Group();
  scene.add(tokensGroup);

  const diceGroup = new THREE.Group();
  scene.add(diceGroup);

  const POLY = buildDiceGeometryCatalog();
  const materialCache = new Map();

  function getDieMaterialBundle(sides, finish) {
    const key = `d${sides}_${finish.id}`;
    if (!materialCache.has(key)) {
      materialCache.set(key, createArtisanDieMaterialBundle(POLY[`d${sides}`], finish));
    }
    return materialCache.get(key);
  }

  let currentThemeKey = '';
  function applyTableTheme(themeKey) {
    const key = TABLE_THEMES[themeKey] ? themeKey : 'parchment_tavern';
    if (key === currentThemeKey) return;
    currentThemeKey = key;
    const theme = TABLE_THEMES[key];

    if (tableMat.map) tableMat.map.dispose();
    tableMat.map = createWoodTableTexture(theme);
    tableMat.needsUpdate = true;

    if (matTopMat.map) matTopMat.map.dispose();
    matTopMat.map = createBattlematTexture(theme);
    matTopMat.needsUpdate = true;

    buildTabletopPerimeterProps(propsGroup, theme, POLY, getDieMaterialBundle);
  }

  applyTableTheme('parchment_tavern');

  function pickFinish(filterMode, salt = 0) {
    let pool = DICE_FINISHES;
    if (filterMode === 'metals_only') {
      pool = DICE_FINISHES.filter((f) => f.kind === 'metal');
    } else if (filterMode === 'crystals_only') {
      pool = DICE_FINISHES.filter((f) => f.kind === 'crystal');
    }
    const idx = (Math.floor(Math.random() * pool.length) + salt) % pool.length;
    return pool[idx];
  }

  function randRange(lo, hi) {
    return lo + Math.random() * (hi - lo);
  }

  function randInt(lo, hi) {
    return Math.floor(Math.random() * (hi - lo + 1)) + lo;
  }

  // Compute settled quaternion so the rolled `targetValue` points strictly straight UP (+Y)
  // AND its face bitangent ("top of numeral") faces upright toward -Z (away from camera) so numbers aren't upside-down!
  function computeExactTopQuaternion(sides, targetValue, smallJitterYaw = 0) {
    const poly = POLY[`d${sides}`] || POLY.d20;
    const up = new THREE.Vector3(0, 1, 0);
    const alignQ = new THREE.Quaternion();

    if (poly.isD4) {
      const vIdx = poly.apexValues.indexOf(targetValue);
      const apexDir = poly.apexVectors[vIdx >= 0 ? vIdx : 0];
      alignQ.setFromUnitVectors(apexDir, up);
      const yawQ = new THREE.Quaternion().setFromAxisAngle(up, smallJitterYaw);
      return yawQ.multiply(alignQ).normalize();
    }

    const face = poly.faces.find((f) => f.meta && f.meta.value === targetValue) || poly.faces[0];
    alignQ.setFromUnitVectors(face.normal, up);

    // Rotate around +Y so the numeral's +bitangent ("up" direction of the digit) points toward -Z (upright to viewer!)
    const rotatedBitangent = face.bitangent.clone().applyQuaternion(alignQ);
    // Desired numeral up on horizontal mat is (0, 0, -1)
    const curAngle = Math.atan2(rotatedBitangent.x, -rotatedBitangent.z);
    const uprightYaw = -curAngle + smallJitterYaw;
    const yawQ = new THREE.Quaternion().setFromAxisAngle(up, uprightYaw);
    return yawQ.multiply(alignQ).normalize();
  }

  // Encounter State
  let waveIndex = 0;
  let roundNumber = 1;
  let turnIndex = 0;
  let party = [];
  let monsters = [];
  let turnOrder = [];
  let tokenEntries = [];
  let combatLog = [];
  let currentTurn = null;
  let activeDice = [];
  let phase = 'attack_roll';
  let phaseTimer = 0;
  let animClock = 0;

  function rebuildTokens() {
    for (const te of tokenEntries) {
      if (te.crestTex) te.crestTex.dispose();
    }
    tokensGroup.clear();
    tokenEntries = [];

    const partyCoords = [
      new THREE.Vector3(-4.8, 0.03, -2.1),
      new THREE.Vector3(-5.2, 0.03, -0.4),
      new THREE.Vector3(-4.7, 0.03, 1.3),
      new THREE.Vector3(-5.3, 0.03, 2.9)
    ];
    const monsterCoords = [
      new THREE.Vector3(3.1, 0.03, -0.7),
      new THREE.Vector3(3.6, 0.03, 2.0)
    ];

    party.forEach((p, idx) => {
      const t = buildTabletopToken(p, false);
      t.group.position.copy(partyCoords[idx % partyCoords.length]);
      tokensGroup.add(t.group);
      tokenEntries.push({ unit: p, ...t });
    });

    monsters.forEach((mon, idx) => {
      const t = buildTabletopToken(mon, idx === 0);
      t.group.position.copy(monsterCoords[idx % monsterCoords.length]);
      tokensGroup.add(t.group);
      tokenEntries.push({ unit: mon, ...t });
    });
  }

  function startNewEncounter(nextWaveIdx) {
    waveIndex = nextWaveIdx % MONSTER_WAVES.length;
    roundNumber = 1;
    party = PARTY_ROSTER.map((p, i) => ({
      ...p,
      side: 'party',
      hp: p.maxHp,
      slotIdx: i,
      initiative: randInt(1, 20) + (p.saves.DEX || 0)
    }));
    monsters = MONSTER_WAVES[waveIndex].map((m, i) => ({
      ...m,
      side: 'monster',
      hp: m.maxHp,
      slotIdx: i,
      initiative: randInt(1, 20) + (m.saves.DEX || 0)
    }));
    turnOrder = [...party, ...monsters].sort((a, b) => b.initiative - a.initiative);
    turnIndex = 0;
    rebuildTokens();

    combatLog.unshift({
      round: 1,
      title: `Wave ${waveIndex + 1}: ${monsters.map((m) => m.name).join(' & ')}`,
      detail: 'Initiative rolled — encounter begins on the tactical mat.',
      badge: 'INITIATIVE',
      badgeColor: '#38bdf8'
    });
    if (combatLog.length > 6) combatLog.length = 6;
  }

  function chooseLandingPositions(count) {
    const spots = [];
    const minDist = 1.68;
    for (let i = 0; i < count; i++) {
      let chosen = null;
      for (let attempt = 0; attempt < 45; attempt++) {
        const cx = randRange(-2.6, 1.3);
        const cz = randRange(-2.2, 2.4);
        let ok = true;
        for (const prev of spots) {
          if (Math.hypot(cx - prev.x, cz - prev.z) < minDist) {
            ok = false;
            break;
          }
        }
        if (ok) {
          chosen = { x: cx, z: cz };
          break;
        }
      }
      if (!chosen) {
        const ang = (i / Math.max(1, count)) * Math.PI * 2;
        chosen = { x: -0.65 + Math.cos(ang) * 2.15, z: 0.15 + Math.sin(ang) * 1.75 };
      }
      spots.push(chosen);
    }
    return spots;
  }

  function spawnDieNode(poly, bundle) {
    const grp = new THREE.Group();

    if (bundle.innerCoreMat) {
      const coreMesh = new THREE.Mesh(poly.geometry, bundle.innerCoreMat);
      coreMesh.scale.setScalar(0.68);
      grp.add(coreMesh);
    }

    const bodyMesh = new THREE.Mesh(poly.geometry, bundle.outerMat);
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    grp.add(bodyMesh);

    const edges = new THREE.LineSegments(poly.edgeGeometry, bundle.edgeMat);
    grp.add(edges);

    return grp;
  }

  function spawnRollBatch(diceSpecs, materialFilter) {
    diceGroup.clear();
    activeDice = [];
    const spots = chooseLandingPositions(diceSpecs.length);
    const fromLeft = !currentTurn || currentTurn.attacker.side === 'party';

    diceSpecs.forEach((spec, i) => {
      const poly = POLY[`d${spec.sides}`] || POLY.d20;
      const finish = pickFinish(materialFilter, i * 3 + spec.sides);
      const bundle = getDieMaterialBundle(spec.sides, finish);
      const node = spawnDieNode(poly, bundle);
      diceGroup.add(node);

      const restY = 0.03 + poly.restHeight;
      const startPos = new THREE.Vector3(
        (fromLeft ? -6.8 : 5.2) + randRange(-0.8, 0.8),
        randRange(3.6, 5.0),
        randRange(-2.2, 2.2)
      );
      const endPos = new THREE.Vector3(spots[i].x, restY, spots[i].z);

      // Upright readable numeral orientation with natural slight yaw (-22° .. +22°)
      const finalQuat = computeExactTopQuaternion(spec.sides, spec.value, randRange(-0.38, 0.38));
      const spinAxis = new THREE.Vector3(randRange(-1, 1), randRange(-0.6, 0.6), randRange(-1, 1)).normalize();

      node.position.copy(startPos);
      activeDice.push({
        sides: spec.sides,
        value: spec.value,
        discarded: Boolean(spec.discarded),
        finish,
        node,
        startPos,
        endPos,
        restY,
        finalQuat,
        spinAxis,
        spinAngleTotal: randInt(3, 5) * Math.PI * 2,
        t: 0,
        duration: randRange(1.08, 1.38) + i * 0.06,
        settled: false
      });
    });
  }

  function stepDieAnimation(die, dt) {
    die.t = Math.min(die.duration, die.t + dt);
    const u = clamp(die.t / die.duration, 0, 1);
    const easeOut = 1 - Math.pow(1 - u, 2.4);

    const x = lerp(die.startPos.x, die.endPos.x, easeOut);
    const z = lerp(die.startPos.z, die.endPos.z, easeOut);

    let y = die.restY;
    if (u < 0.50) {
      const k = u / 0.50;
      y = lerp(die.startPos.y, die.restY, k * k);
    } else if (u < 0.75) {
      const k = (u - 0.50) / 0.25;
      y = die.restY + Math.sin(k * Math.PI) * 1.30;
    } else if (u < 0.90) {
      const k = (u - 0.75) / 0.15;
      y = die.restY + Math.sin(k * Math.PI) * 0.42;
    } else if (u < 1.0) {
      const k = (u - 0.90) / 0.10;
      y = die.restY + Math.sin(k * Math.PI) * 0.09;
    }

    die.node.position.set(x, y, z);

    if (u >= 0.999) {
      die.node.quaternion.copy(die.finalQuat);
      die.settled = true;
    } else {
      const remAngle = Math.pow(1 - u, 2.25) * die.spinAngleTotal;
      const spinQ = new THREE.Quaternion().setFromAxisAngle(die.spinAxis, remAngle);
      die.node.quaternion.multiplyQuaternions(spinQ, die.finalQuat);
      die.settled = false;
    }
  }

  function updateTokenHighlights() {
    for (const entry of tokenEntries) {
      const dead = entry.unit.hp <= 0;
      entry.group.visible = !dead;
      if (dead) continue;
      const isAtk = currentTurn && currentTurn.attacker === entry.unit;
      const isDef = currentTurn && currentTurn.defender === entry.unit;
      if (isAtk) {
        entry.activeRingMat.color.setHex(0xfacc15);
        entry.activeRingMat.opacity = 0.88;
      } else if (isDef) {
        entry.activeRingMat.color.setHex(0xf87171);
        entry.activeRingMat.opacity = 0.82;
      } else {
        entry.activeRingMat.opacity = 0.0;
      }
    }
  }

  function beginNextCombatTurn(materialFilter) {
    const aliveParty = party.filter((c) => c.hp > 0);
    const aliveMonsters = monsters.filter((c) => c.hp > 0);
    if (aliveParty.length === 0 || aliveMonsters.length === 0) {
      startNewEncounter(waveIndex + 1);
      beginNextCombatTurn(materialFilter);
      return;
    }

    for (let guard = 0; guard < turnOrder.length + 2; guard++) {
      if (turnIndex >= turnOrder.length) {
        turnIndex = 0;
        roundNumber += 1;
      }
      const actor = turnOrder[turnIndex++];
      if (!actor || actor.hp <= 0) continue;

      const foes = actor.side === 'party' ? aliveMonsters : aliveParty;
      const defender = foes[Math.floor(Math.random() * foes.length)];
      const action = actor.actions[Math.floor(Math.random() * actor.actions.length)];

      if (action.kind === 'attack') {
        const mode = action.rollMode || (Math.random() < 0.18 ? 'advantage' : Math.random() < 0.08 ? 'disadvantage' : 'normal');
        const r1 = randInt(1, 20);
        const r2 = randInt(1, 20);
        let chosen = r1;
        if (mode === 'advantage') chosen = Math.max(r1, r2);
        else if (mode === 'disadvantage') chosen = Math.min(r1, r2);

        const isCrit = chosen === 20;
        const isFumble = chosen === 1;
        const totalAttack = chosen + action.atkBonus;
        const isHit = isCrit || (!isFumble && totalAttack >= defender.ac);

        if (mode === 'normal') {
          spawnRollBatch([{ sides: 20, value: r1 }], materialFilter);
        } else {
          const dropFirst = mode === 'advantage' ? r1 < r2 : r1 > r2;
          spawnRollBatch(
            [
              { sides: 20, value: r1, discarded: dropFirst },
              { sides: 20, value: r2, discarded: !dropFirst }
            ],
            materialFilter
          );
        }

        currentTurn = {
          kind: 'attack',
          attacker: actor,
          defender,
          action,
          rollMode: mode,
          rawRolls: mode === 'normal' ? [r1] : [r1, r2],
          chosenRaw: chosen,
          totalAttack,
          isCrit,
          isFumble,
          isHit,
          damageRolls: [],
          totalDamage: 0,
          resolved: false
        };
      } else {
        const saveStat = action.saveStat || 'DEX';
        const saveMod = defender.saves[saveStat] || 0;
        const dc = actor.spellDc || 15;
        const rawSave = randInt(1, 20);
        const totalSave = rawSave + saveMod;
        const saveSucceeded = totalSave >= dc;

        spawnRollBatch([{ sides: 20, value: rawSave }], materialFilter);

        currentTurn = {
          kind: 'save',
          attacker: actor,
          defender,
          action,
          saveStat,
          saveMod,
          dc,
          rawRolls: [rawSave],
          chosenRaw: rawSave,
          totalSave,
          saveSucceeded,
          isCrit: false,
          isFumble: false,
          isHit: !saveSucceeded || Boolean(action.halfOnSave),
          damageRolls: [],
          totalDamage: 0,
          resolved: false
        };
      }

      updateTokenHighlights();
      phase = 'attack_roll';
      phaseTimer = 0;
      return;
    }
  }

  function launchDamageVolley(materialFilter) {
    if (!currentTurn) return;
    const { action, isCrit } = currentTurn;
    const specs = [];
    for (const d of action.dice) {
      const count = Math.min(8, d.count * (isCrit ? 2 : 1));
      for (let i = 0; i < count; i++) {
        specs.push({ sides: d.sides, value: randInt(1, d.sides) });
      }
    }
    spawnRollBatch(specs, materialFilter);

    const sum = specs.reduce((acc, s) => acc + s.value, 0);
    let total = Math.max(1, sum + (action.flatMod || 0));
    if (currentTurn.kind === 'save' && currentTurn.saveSucceeded) {
      total = action.halfOnSave ? Math.floor(total / 2) : 0;
    }
    currentTurn.damageRolls = specs;
    currentTurn.totalDamage = total;
  }

  function finalizeTurnOutcome() {
    if (!currentTurn || currentTurn.resolved) return;
    currentTurn.resolved = true;
    const t = currentTurn;
    let badge = 'MISS';
    let badgeColor = '#94a3b8';
    let detail = '';

    if (t.kind === 'attack') {
      const mTag = t.rollMode === 'advantage' ? ' Adv' : t.rollMode === 'disadvantage' ? ' Dis' : '';
      if (t.isHit) {
        t.defender.hp = Math.max(0, t.defender.hp - t.totalDamage);
        badge = t.isCrit ? 'CRIT 20!' : 'HIT';
        badgeColor = t.isCrit ? '#facc15' : '#34d399';
        const ko = t.defender.hp === 0 ? ' • SLAIN' : '';
        detail = `d20${mTag} (${t.chosenRaw})${formatSigned(t.action.atkBonus)} = ${t.totalAttack} vs AC ${t.defender.ac} → ${t.totalDamage} ${t.action.dmgType}${ko}`;
      } else {
        badge = t.isFumble ? 'NAT 1' : 'MISS';
        badgeColor = t.isFumble ? '#f87171' : '#94a3b8';
        detail = `d20${mTag} (${t.chosenRaw})${formatSigned(t.action.atkBonus)} = ${t.totalAttack} vs AC ${t.defender.ac}`;
      }
    } else {
      if (t.totalDamage > 0) {
        t.defender.hp = Math.max(0, t.defender.hp - t.totalDamage);
      }
      const ko = t.defender.hp === 0 ? ' • SLAIN' : '';
      badge = !t.saveSucceeded ? 'FAIL SAVE' : 'SAVED (½)';
      badgeColor = !t.saveSucceeded ? '#fb923c' : '#38bdf8';
      detail = `${t.saveStat} Save (${t.chosenRaw})${formatSigned(t.saveMod)} = ${t.totalSave} vs DC ${t.dc} → ${t.totalDamage} ${t.action.dmgType}${ko}`;
    }

    updateTokenHighlights();
    combatLog.unshift({
      round: roundNumber,
      title: `${t.attacker.name} → ${t.defender.name}`,
      detail,
      badge,
      badgeColor
    });
    if (combatLog.length > 6) combatLog.length = 6;
  }

  startNewEncounter(0);
  beginNextCombatTurn('mixed');

  // ============================================================================
  // 2D ENCOUNTER & ROLL WINDOW OVERLAY
  // ============================================================================

  function drawHudRoundRect(ctx2, x, y, rw, rh, rad) {
    const r = Math.min(rad, rw * 0.5, rh * 0.5);
    ctx2.beginPath();
    ctx2.moveTo(x + r, y);
    ctx2.lineTo(x + rw - r, y);
    ctx2.quadraticCurveTo(x + rw, y, x + rw, y + r);
    ctx2.lineTo(x + rw, y + rh - r);
    ctx2.quadraticCurveTo(x + rw, y + rh, x + rw - r, y + rh);
    ctx2.lineTo(x + r, y + rh);
    ctx2.quadraticCurveTo(x, y + rh, x, y + rh - r);
    ctx2.lineTo(x, y + r);
    ctx2.quadraticCurveTo(x, y, x + r, y);
    ctx2.closePath();
  }

  function renderHudOverlay(showHud) {
    if (!hudCtx) return;
    if (hudCanvas) {
      hudCtx.clearRect(0, 0, w, h);
    } else if (fallbackCtx) {
      hudCtx.fillStyle = '#140e0a';
      hudCtx.fillRect(0, 0, w, h);
    }
    if (!showHud || !currentTurn) return;

    const panelW = clamp(Math.round(w * 0.29), 310, 410);
    const px = w - panelW - 20;
    const py = 20;
    const ph = Math.min(h - 40, 560);

    hudCtx.save();
    drawHudRoundRect(hudCtx, px, py, panelW, ph, 14);
    hudCtx.fillStyle = 'rgba(10, 14, 23, 0.84)';
    hudCtx.fill();
    hudCtx.strokeStyle = 'rgba(217, 169, 78, 0.52)';
    hudCtx.lineWidth = 1.5;
    hudCtx.stroke();

    const padX = px + 16;
    const innerW = panelW - 32;
    let cy = py + 24;

    hudCtx.fillStyle = '#fbbf24';
    hudCtx.font = 'bold 11px monospace';
    hudCtx.textAlign = 'left';
    hudCtx.fillText(`5E SRD COMBAT  •  WAVE ${waveIndex + 1}  •  ROUND ${roundNumber}`, padX, cy);
    cy += 16;

    drawHudRoundRect(hudCtx, padX, cy, innerW, 92, 10);
    hudCtx.fillStyle = 'rgba(23, 32, 48, 0.78)';
    hudCtx.fill();
    hudCtx.strokeStyle = 'rgba(148, 163, 184, 0.22)';
    hudCtx.lineWidth = 1;
    hudCtx.stroke();

    const atk = currentTurn.attacker;
    const def = currentTurn.defender;

    hudCtx.fillStyle = '#fde68a';
    hudCtx.font = 'bold 13px sans-serif';
    hudCtx.fillText(`${atk.emblem} ${atk.name}`, padX + 12, cy + 21);
    hudCtx.fillStyle = '#94a3b8';
    hudCtx.font = '11px sans-serif';
    hudCtx.fillText(`${atk.cls}  •  HP ${atk.hp}/${atk.maxHp}`, padX + 12, cy + 37);

    hudCtx.fillStyle = '#f87171';
    hudCtx.font = 'bold 13px sans-serif';
    hudCtx.fillText(`🛡 ${def.name}`, padX + 12, cy + 61);
    hudCtx.fillStyle = '#cbd5e1';
    hudCtx.font = '11px sans-serif';
    hudCtx.fillText(`AC ${def.ac}  •  HP ${def.hp}/${def.maxHp}`, padX + 12, cy + 77);

    const hpW = 88;
    const hpX = padX + innerW - hpW - 12;
    hudCtx.fillStyle = 'rgba(15, 23, 42, 0.95)';
    hudCtx.fillRect(hpX, cy + 69, hpW, 6);
    const ratio = clamp(def.hp / def.maxHp, 0, 1);
    hudCtx.fillStyle = ratio > 0.5 ? '#22c55e' : ratio > 0.25 ? '#eab308' : '#ef4444';
    hudCtx.fillRect(hpX + 1, cy + 70, (hpW - 2) * ratio, 4);

    cy += 104;

    drawHudRoundRect(hudCtx, padX, cy, innerW, 132, 10);
    hudCtx.fillStyle = 'rgba(15, 23, 42, 0.90)';
    hudCtx.fill();
    hudCtx.strokeStyle = 'rgba(251, 191, 36, 0.32)';
    hudCtx.stroke();

    hudCtx.fillStyle = '#fde68a';
    hudCtx.font = 'bold 13px sans-serif';
    hudCtx.fillText(currentTurn.action.name, padX + 12, cy + 22);

    const attackSettled = phase !== 'attack_roll';
    const inDmg = phase === 'damage_roll' || phase === 'resolve_pause';
    const dmgSettled = phase === 'resolve_pause';

    if (currentTurn.kind === 'attack') {
      const mLabel = currentTurn.rollMode === 'advantage'
        ? '2d20kh1'
        : currentTurn.rollMode === 'disadvantage'
          ? '2d20kl1'
          : '1d20';
      hudCtx.fillStyle = '#cbd5e1';
      hudCtx.font = '12px monospace';
      if (!attackSettled) {
        hudCtx.fillText(`Rolling ${mLabel} ${formatSigned(currentTurn.action.atkBonus)} vs AC ${def.ac}...`, padX + 12, cy + 45);
      } else {
        const rawTxt = currentTurn.rawRolls.length > 1
          ? `[${currentTurn.rawRolls.join(', ')}] → ${currentTurn.chosenRaw}`
          : `${currentTurn.chosenRaw}`;
        hudCtx.fillText(`d20: ${rawTxt} ${formatSigned(currentTurn.action.atkBonus)} = ${currentTurn.totalAttack} vs AC ${def.ac}`, padX + 12, cy + 45);
        hudCtx.fillStyle = currentTurn.isCrit ? '#facc15' : currentTurn.isHit ? '#34d399' : '#f87171';
        hudCtx.font = 'bold 12px monospace';
        hudCtx.fillText(
          currentTurn.isCrit
            ? 'NATURAL 20 — CRITICAL HIT (2× DICE)'
            : currentTurn.isFumble
              ? 'NATURAL 1 — AUTOMATIC MISS'
              : currentTurn.isHit
                ? 'HIT CONFIRMED — ROLLING DAMAGE'
                : 'ATTACK DEFLECTED',
          padX + 12,
          cy + 66
        );
      }
    } else {
      hudCtx.fillStyle = '#cbd5e1';
      hudCtx.font = '12px monospace';
      if (!attackSettled) {
        hudCtx.fillText(`Rolling ${currentTurn.saveStat} Save vs Spell DC ${currentTurn.dc}...`, padX + 12, cy + 45);
      } else {
        hudCtx.fillText(`${currentTurn.saveStat} Save: ${currentTurn.chosenRaw} ${formatSigned(currentTurn.saveMod)} = ${currentTurn.totalSave} vs DC ${currentTurn.dc}`, padX + 12, cy + 45);
        hudCtx.fillStyle = !currentTurn.saveSucceeded ? '#fb923c' : '#38bdf8';
        hudCtx.font = 'bold 12px monospace';
        hudCtx.fillText(
          !currentTurn.saveSucceeded ? 'SAVE FAILED — FULL DAMAGE' : 'SAVE PASSED — HALF DAMAGE',
          padX + 12,
          cy + 66
        );
      }
    }

    if (inDmg && currentTurn.damageRolls.length > 0) {
      const formula = formatDiceFormula(currentTurn.action.dice, currentTurn.action.flatMod, currentTurn.isCrit);
      hudCtx.fillStyle = '#e2e8f0';
      hudCtx.font = '12px monospace';
      if (!dmgSettled) {
        hudCtx.fillText(`Rolling ${formula} ${currentTurn.action.dmgType}...`, padX + 12, cy + 92);
      } else {
        const vals = currentTurn.damageRolls.map((r) => r.value).join(' + ');
        const modStr = currentTurn.action.flatMod ? ` ${formatSigned(currentTurn.action.flatMod)}` : '';
        hudCtx.fillText(`Dice (${formula}): [${vals}]${modStr}`, padX + 12, cy + 92);
        hudCtx.fillStyle = '#fde047';
        hudCtx.font = 'bold 14px monospace';
        hudCtx.fillText(`Damage: ${currentTurn.totalDamage} ${currentTurn.action.dmgType}`, padX + 12, cy + 116);
      }
    } else if (attackSettled && !currentTurn.isHit) {
      hudCtx.fillStyle = '#94a3b8';
      hudCtx.font = '12px monospace';
      hudCtx.fillText('0 Damage dealt.', padX + 12, cy + 92);
    }

    cy += 144;

    if (activeDice.length > 0) {
      const sample = activeDice
        .slice(0, 2)
        .map((d) => `d${d.sides}: ${d.finish.name}`)
        .join('  •  ');
      hudCtx.fillStyle = '#94a3b8';
      hudCtx.font = '10px sans-serif';
      hudCtx.fillText(sample.slice(0, 54), padX, cy);
      cy += 16;
    }

    hudCtx.fillStyle = '#fbbf24';
    hudCtx.font = 'bold 10px monospace';
    hudCtx.fillText('COMBAT LOG', padX, cy);
    cy += 8;

    const rowH = 46;
    const maxRows = Math.max(1, Math.floor((py + ph - cy - 10) / rowH));
    for (let i = 0; i < Math.min(combatLog.length, maxRows); i++) {
      const entry = combatLog[i];
      const ry = cy + i * rowH;
      drawHudRoundRect(hudCtx, padX, ry, innerW, rowH - 5, 7);
      hudCtx.fillStyle = i === 0 ? 'rgba(30, 41, 59, 0.78)' : 'rgba(15, 23, 42, 0.52)';
      hudCtx.fill();

      hudCtx.fillStyle = entry.badgeColor;
      hudCtx.font = 'bold 10px monospace';
      const badgeStr = `[R${entry.round} ${entry.badge}]`;
      hudCtx.fillText(badgeStr, padX + 8, ry + 15);
      const badgeW = hudCtx.measureText(badgeStr).width;

      hudCtx.fillStyle = '#f8fafc';
      hudCtx.font = '600 11px sans-serif';
      const ttl = entry.title.length > 26 ? `${entry.title.slice(0, 25)}…` : entry.title;
      hudCtx.fillText(ttl, padX + 16 + badgeW, ry + 15);

      hudCtx.fillStyle = '#cbd5e1';
      hudCtx.font = '10px monospace';
      const det = entry.detail.length > 48 ? `${entry.detail.slice(0, 47)}…` : entry.detail;
      hudCtx.fillText(det, padX + 8, ry + 32);
    }

    hudCtx.restore();
  }

  return {
    resize(newW, newH) {
      w = Math.max(1, Math.floor(newW || canvas.clientWidth || 1280));
      h = Math.max(1, Math.floor(newH || canvas.clientHeight || 720));
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      if (renderer) {
        renderer.setSize(w, h, false);
      }
      if (hudCanvas) {
        hudCanvas.width = w;
        hudCanvas.height = h;
      }
    },

    render(dtInput) {
      const rawDt = typeof dtInput === 'number' && Number.isFinite(dtInput) ? dtInput : 0.016;
      const params = (typeof getParams === 'function' ? getParams() : null) || {};

      const rollSpeed = clamp(Number(params.rollSpeed) || 1.0, 0.4, 2.5);
      const materialFilter = params.diceMaterial || 'mixed';
      const themeKey = params.tableTheme || 'parchment_tavern';
      const camMode = params.cameraMode || 'gentle_sway';
      const showHud = params.showHud !== false;

      applyTableTheme(themeKey);

      const dt = clamp(rawDt, 0.001, 0.25) * rollSpeed;
      animClock += dt;

      let swayAngle = 0;
      let camHeight = 13.6;
      let camDist = 6.2;
      if (camMode === 'orbit') {
        swayAngle = Math.sin(animClock * 0.20) * 0.36;
        camHeight = 13.3 + Math.cos(animClock * 0.15) * 0.45;
      } else if (camMode === 'gentle_sway') {
        swayAngle = Math.sin(animClock * 0.15) * 0.12;
        camHeight = 13.6 + Math.cos(animClock * 0.18) * 0.22;
      }

      camera.position.set(
        0.9 + Math.sin(swayAngle) * camDist,
        camHeight,
        0.2 + Math.cos(swayAngle) * camDist
      );
      camera.lookAt(0.9, 0.08, 0.05);

      let allSettled = true;
      for (const die of activeDice) {
        stepDieAnimation(die, dt);
        if (!die.settled) allSettled = false;
        die.node.scale.setScalar(die.discarded && die.settled ? 0.84 : 1.0);
      }

      if (phase === 'attack_roll') {
        if (allSettled) {
          phase = 'attack_pause';
          phaseTimer = 0;
        }
      } else if (phase === 'attack_pause') {
        phaseTimer += dt;
        if (phaseTimer >= 1.25) {
          if (currentTurn && currentTurn.isHit) {
            launchDamageVolley(materialFilter);
            phase = 'damage_roll';
            phaseTimer = 0;
          } else {
            finalizeTurnOutcome();
            phase = 'resolve_pause';
            phaseTimer = 0;
          }
        }
      } else if (phase === 'damage_roll') {
        if (allSettled) {
          finalizeTurnOutcome();
          phase = 'resolve_pause';
          phaseTimer = 0;
        }
      } else if (phase === 'resolve_pause') {
        phaseTimer += dt;
        if (phaseTimer >= 2.2) {
          beginNextCombatTurn(materialFilter);
        }
      }

      if (renderer) {
        renderer.render(scene, camera);
      }
      renderHudOverlay(showHud);
    },

    destroy() {
      if (hudCanvas && hudCanvas.parentElement) {
        hudCanvas.parentElement.removeChild(hudCanvas);
        hudCanvas = null;
        hudCtx = null;
      }
      for (const te of tokenEntries) {
        if (te.crestTex) te.crestTex.dispose();
      }
      for (const bundle of materialCache.values()) {
        if (bundle.outerMat.map) bundle.outerMat.map.dispose();
        if (bundle.outerMat.bumpMap) bundle.outerMat.bumpMap.dispose();
        if (bundle.outerMat.roughnessMap) bundle.outerMat.roughnessMap.dispose();
        bundle.outerMat.dispose();
        bundle.edgeMat.dispose();
        if (bundle.innerCoreMat) bundle.innerCoreMat.dispose();
      }
      materialCache.clear();
      for (const key of Object.keys(POLY)) {
        POLY[key].geometry.dispose();
        POLY[key].edgeGeometry.dispose();
      }
      if (envTex) envTex.dispose();
      if (tableMat.map) tableMat.map.dispose();
      tableMat.dispose();
      tableGeo.dispose();
      if (matTopMat.map) matTopMat.map.dispose();
      matTopMat.dispose();
      matSideMat.dispose();
      matGeo.dispose();
      if (renderer) {
        renderer.dispose();
      }
    }
  };
}
