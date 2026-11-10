// 5e Tabletop Dice & Battle Mat Screensaver (dnd5edice.js)
//
// Models a tabletop RPG encounter on a 1-inch gridded battlemat surrounded by
// generic tabletop RPG paraphernalia (wooden dice tray, GM screen, character
// sheet, #2 pencil, pewter & painted resin miniatures, wax-sealed health potion,
// brass lantern/candle, gold/silver coins, rulebooks).
//
// Rolls rules-accurate 5th Edition SRD 5.1 attacks and saving-throw spells:
// - Forged metallic dice (burnished bronze, brushed steel, arcane gold, blackened iron)
//   and translucent crystalline/gemstone dice (amethyst, sapphire, ruby, emerald, prism glass)
//   with internal facet refraction and specular highlights.
// - Polyhedral geometries: d4, d6, d8, d10, d12, d20 with exact face normals,
//   settled top-face orientation so the true rolled value faces upward, and
//   rigid-body bounce + spin damping onto the battlemat.
// - Full 5e SRD combat math:
//   * Attack Rolls: 1d20 (Normal, Advantage 2d20kh1, or Disadvantage 2d20kl1) + Attack Bonus vs Target AC
//     - Natural 1 = Automatic Miss
//     - Natural 20 = Critical Hit (doubles all damage dice, adds flat modifier once)
//     - Hit = rolls exact weapon/spell damage dice + ability/magic modifier
//   * Saving Throw Spells (e.g. Fireball, Sacred Flame, Cone of Cold):
//     - Defender rolls 1d20 + Save Bonus vs Caster Spell Save DC
//     - Failed Save = full rolled damage (or all-or-nothing cantrip); Successful Save = half damage (rounded down)
//   * Persistent HP tracking across rounds, knockouts, healing surges, and new encounter waves.

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

// 3D vector helpers
function vec3(x, y, z) {
  return { x, y, z };
}

function add3(a, b) {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function sub3(a, b) {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function scale3(a, s) {
  return { x: a.x * s, y: a.y * s, z: a.z * s };
}

function dot3(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function cross3(a, b) {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x
  };
}

function norm3(a) {
  const len = Math.hypot(a.x, a.y, a.z) || 1;
  return { x: a.x / len, y: a.y / len, z: a.z / len };
}

// Quaternion helpers [x, y, z, w]
function quatIdentity() {
  return { x: 0, y: 0, z: 0, w: 1 };
}

function quatFromAxisAngle(axis, angle) {
  const half = angle * 0.5;
  const s = Math.sin(half);
  const n = norm3(axis);
  return { x: n.x * s, y: n.y * s, z: n.z * s, w: Math.cos(half) };
}

function quatMul(a, b) {
  return {
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
    x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w
  };
}

function quatNorm(q) {
  const len = Math.hypot(q.x, q.y, q.z, q.w) || 1;
  return { x: q.x / len, y: q.y / len, z: q.z / len, w: q.w / len };
}

function quatSlerp(a, b, t) {
  let bx = b.x, by = b.y, bz = b.z, bw = b.w;
  let cosHalf = a.x * bx + a.y * by + a.z * bz + a.w * bw;
  if (cosHalf < 0) {
    cosHalf = -cosHalf;
    bx = -bx; by = -by; bz = -bz; bw = -bw;
  }
  if (cosHalf > 0.9995) {
    return quatNorm({
      x: lerp(a.x, bx, t),
      y: lerp(a.y, by, t),
      z: lerp(a.z, bz, t),
      w: lerp(a.w, bw, t)
    });
  }
  const halfAngle = Math.acos(clamp(cosHalf, -1, 1));
  const sinHalf = Math.sqrt(1 - cosHalf * cosHalf) || 1;
  const ra = Math.sin((1 - t) * halfAngle) / sinHalf;
  const rb = Math.sin(t * halfAngle) / sinHalf;
  return {
    x: a.x * ra + bx * rb,
    y: a.y * ra + by * rb,
    z: a.z * ra + bz * rb,
    w: a.w * ra + bw * rb
  };
}

// Quaternion rotating unit vector `from` onto unit vector `to`
function quatFromUnitVectors(from, to) {
  const r = dot3(from, to) + 1;
  if (r < 1e-6) {
    const ortho = Math.abs(from.x) > Math.abs(from.z)
      ? vec3(-from.y, from.x, 0)
      : vec3(0, -from.z, from.y);
    const n = norm3(ortho);
    return { x: n.x, y: n.y, z: n.z, w: 0 };
  }
  const c = cross3(from, to);
  return quatNorm({ x: c.x, y: c.y, z: c.z, w: r });
}

function rotateByQuat(v, q) {
  const uv = cross3(q, v);
  const uuv = cross3(q, uv);
  return {
    x: v.x + 2 * (q.w * uv.x + uuv.x),
    y: v.y + 2 * (q.w * uv.y + uuv.y),
    z: v.z + 2 * (q.w * uv.z + uuv.z)
  };
}

// Build convex polyhedral dice meshes with outward face normals, centroids, tangent bases, and face numbers
function finalizePolyhedron(vertices, rawFaces, numbers, scale = 1.0) {
  const verts = vertices.map((v) => {
    const n = norm3(v);
    return scale3(n, scale);
  });

  const faces = rawFaces.map((idxs, i) => {
    let cx = 0, cy = 0, cz = 0;
    for (const idx of idxs) {
      cx += verts[idx].x;
      cy += verts[idx].y;
      cz += verts[idx].z;
    }
    const centroid = vec3(cx / idxs.length, cy / idxs.length, cz / idxs.length);
    const e1 = sub3(verts[idxs[1]], verts[idxs[0]]);
    const e2 = sub3(verts[idxs[2]], verts[idxs[0]]);
    let normal = norm3(cross3(e1, e2));
    let indices = idxs.slice();
    if (dot3(normal, centroid) < 0) {
      indices.reverse();
      normal = scale3(normal, -1);
    }
    // Local 2D basis on face for rendering engraved numerals
    const upRef = sub3(verts[indices[0]], centroid);
    const bitangent = norm3(sub3(upRef, scale3(normal, dot3(upRef, normal))));
    const tangent = norm3(cross3(bitangent, normal));
    return {
      indices,
      normal,
      centroid,
      tangent,
      bitangent,
      value: numbers[i]
    };
  });

  return { verts, faces };
}

function buildPolyhedraLibrary() {
  // d4: Regular Tetrahedron (4 triangular faces)
  const d4Verts = [
    vec3(1, 1, 1),
    vec3(1, -1, -1),
    vec3(-1, 1, -1),
    vec3(-1, -1, 1)
  ];
  const d4Faces = [
    [0, 1, 2],
    [0, 3, 1],
    [0, 2, 3],
    [1, 3, 2]
  ];
  const d4 = finalizePolyhedron(d4Verts, d4Faces, [1, 2, 3, 4], 0.96);

  // d6: Regular Hexahedron / Cube (6 quad faces, opposite faces sum to 7)
  const c = 1 / Math.sqrt(3);
  const d6Verts = [
    vec3(-c, -c, -c), vec3(c, -c, -c), vec3(c, c, -c), vec3(-c, c, -c),
    vec3(-c, -c, c), vec3(c, -c, c), vec3(c, c, c), vec3(-c, c, c)
  ];
  const d6Faces = [
    [4, 5, 6, 7], // +Z -> 6
    [1, 0, 3, 2], // -Z -> 1
    [5, 1, 2, 6], // +X -> 3
    [0, 4, 7, 3], // -X -> 4
    [3, 7, 6, 2], // +Y -> 2
    [0, 1, 5, 4]  // -Y -> 5
  ];
  const d6 = finalizePolyhedron(d6Verts, d6Faces, [6, 1, 3, 4, 2, 5], 0.92);

  // d8: Regular Octahedron (8 triangular faces, opposite faces sum to 9)
  const d8Verts = [
    vec3(1, 0, 0), vec3(-1, 0, 0),
    vec3(0, 1, 0), vec3(0, -1, 0),
    vec3(0, 0, 1), vec3(0, 0, -1)
  ];
  const d8Faces = [
    [0, 2, 4], [1, 3, 5],
    [2, 1, 4], [3, 0, 5],
    [1, 3, 4], [0, 2, 5],
    [3, 0, 4], [2, 1, 5]
  ];
  const d8 = finalizePolyhedron(d8Verts, d8Faces, [8, 1, 6, 3, 4, 5, 2, 7], 0.98);

  // d10: Pentagonal Trapezohedron (10 kite faces, numbered 1..10)
  // Construct 2 polar apices + 2 staggered 5-gon rings so all 10 kites are planar
  const hPole = 1.05;
  const hRing = 0.115;
  const rRing = 0.96;
  const d10RawVerts = [
    vec3(0, hPole, 0),  // 0: North pole
    vec3(0, -hPole, 0)  // 1: South pole
  ];
  for (let k = 0; k < 5; k++) {
    const a = (k * 2 * Math.PI) / 5;
    d10RawVerts.push(vec3(Math.cos(a) * rRing, hRing, Math.sin(a) * rRing)); // 2..6 upper ring
  }
  for (let k = 0; k < 5; k++) {
    const a = ((k + 0.5) * 2 * Math.PI) / 5;
    d10RawVerts.push(vec3(Math.cos(a) * rRing, -hRing, Math.sin(a) * rRing)); // 7..11 lower ring
  }
  const d10Faces = [];
  for (let k = 0; k < 5; k++) {
    const u0 = 2 + k;
    const u1 = 2 + ((k + 1) % 5);
    const l0 = 7 + k;
    d10Faces.push([0, u0, l0, u1]);
  }
  for (let k = 0; k < 5; k++) {
    const l0 = 7 + k;
    const l1 = 7 + ((k + 1) % 5);
    const u1 = 2 + ((k + 1) % 5);
    d10Faces.push([1, l1, u1, l0]);
  }
  // Normalize gently without collapsing kite planarity
  const d10Verts = d10RawVerts.map((v) => scale3(v, 0.92));
  const d10Nums = [10, 2, 8, 4, 6, 1, 9, 3, 7, 5];
  const d10 = {
    verts: d10Verts,
    faces: d10Faces.map((idxs, i) => {
      let cx = 0, cy = 0, cz = 0;
      for (const idx of idxs) {
        cx += d10Verts[idx].x;
        cy += d10Verts[idx].y;
        cz += d10Verts[idx].z;
      }
      const centroid = vec3(cx / 4, cy / 4, cz / 4);
      const e1 = sub3(d10Verts[idxs[1]], d10Verts[idxs[0]]);
      const e2 = sub3(d10Verts[idxs[2]], d10Verts[idxs[0]]);
      let normal = norm3(cross3(e1, e2));
      let indices = idxs.slice();
      if (dot3(normal, centroid) < 0) {
        indices.reverse();
        normal = scale3(normal, -1);
      }
      const upRef = sub3(d10Verts[indices[0]], centroid);
      const bitangent = norm3(sub3(upRef, scale3(normal, dot3(upRef, normal))));
      const tangent = norm3(cross3(bitangent, normal));
      return { indices, normal, centroid, tangent, bitangent, value: d10Nums[i] };
    })
  };

  // d20: Regular Icosahedron (20 triangular faces, opposite faces sum to 21)
  const phi = (1 + Math.sqrt(5)) / 2;
  const d20Verts = [
    vec3(-1, phi, 0), vec3(1, phi, 0), vec3(-1, -phi, 0), vec3(1, -phi, 0),
    vec3(0, -1, phi), vec3(0, 1, phi), vec3(0, -1, -phi), vec3(0, 1, -phi),
    vec3(phi, 0, -1), vec3(phi, 0, 1), vec3(-phi, 0, -1), vec3(-phi, 0, 1)
  ];
  const d20Faces = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
    [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
    [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]
  ];
  const d20Nums = [20, 2, 18, 4, 14, 8, 12, 6, 16, 10, 1, 19, 3, 17, 7, 13, 9, 15, 5, 11];
  const d20 = finalizePolyhedron(d20Verts, d20Faces, d20Nums, 1.06);

  // d12: Regular Dodecahedron (dual of icosahedron — 20 vertices = icosahedron face centroids, 12 pentagonal faces)
  const d12Verts = d20.faces.map((f) => norm3(f.centroid));
  const d12Faces = [];
  for (let vi = 0; vi < d20Verts.length; vi++) {
    const vPos = norm3(d20Verts[vi]);
    const incident = [];
    d20.faces.forEach((f, fi) => {
      if (f.indices.includes(vi)) incident.push(fi);
    });
    // Sort the 5 dual vertices cyclically around vPos
    const refVec = Math.abs(vPos.y) < 0.9 ? vec3(0, 1, 0) : vec3(1, 0, 0);
    const uAxis = norm3(cross3(refVec, vPos));
    const vAxis = cross3(vPos, uAxis);
    incident.sort((a, b) => {
      const pa = sub3(d12Verts[a], vPos);
      const pb = sub3(d12Verts[b], vPos);
      const angA = Math.atan2(dot3(pa, vAxis), dot3(pa, uAxis));
      const angB = Math.atan2(dot3(pb, vAxis), dot3(pb, uAxis));
      return angA - angB;
    });
    d12Faces.push(incident);
  }
  const d12Nums = [12, 2, 10, 4, 8, 6, 7, 5, 9, 3, 11, 1];
  const d12 = finalizePolyhedron(d12Verts, d12Faces, d12Nums, 1.02);

  return { d4, d6, d8, d10, d12, d20 };
}

const POLYHEDRA = buildPolyhedraLibrary();

// Multi-colored Forged Metallic & Translucent Crystalline/Glass Dice Materials
const DICE_MATERIALS = [
  // Forged Metals
  {
    id: 'forged_bronze',
    name: 'Forged Dwarven Bronze',
    kind: 'metal',
    base: [188, 124, 58],
    edge: [252, 211, 132],
    deep: [78, 44, 16],
    ink: '#fffbeb',
    critInk: '#fde047',
    specPower: 28,
    specBoost: 1.25
  },
  {
    id: 'arcane_gold',
    name: 'Gilded Solar Gold',
    kind: 'metal',
    base: [224, 174, 48],
    edge: [255, 244, 179],
    deep: [108, 72, 12],
    ink: '#1e1b4b',
    critInk: '#dc2626',
    specPower: 34,
    specBoost: 1.4
  },
  {
    id: 'brushed_mithral',
    name: 'Brushed Silver Steel',
    kind: 'metal',
    base: [168, 182, 198],
    edge: [248, 250, 252],
    deep: [62, 74, 90],
    ink: '#0f172a',
    critInk: '#0284c7',
    specPower: 38,
    specBoost: 1.45
  },
  {
    id: 'blackened_iron',
    name: 'Blackened Damascus & Copper',
    kind: 'metal',
    base: [64, 68, 78],
    edge: [217, 119, 69],
    deep: [22, 24, 30],
    ink: '#fb923c',
    critInk: '#fde047',
    specPower: 26,
    specBoost: 1.2
  },
  {
    id: 'rose_electrum',
    name: 'Burnished Rose Copper',
    kind: 'metal',
    base: [204, 108, 98],
    edge: [254, 205, 211],
    deep: [88, 34, 32],
    ink: '#fff1f2',
    critInk: '#fef08a',
    specPower: 30,
    specBoost: 1.3
  },
  // Translucent Crystalline / Gemstone / Dichroic Glass
  {
    id: 'amethyst_crystal',
    name: 'Amethyst Quartz Crystal',
    kind: 'crystal',
    base: [147, 51, 234],
    coreGlow: [232, 121, 249],
    edge: [243, 232, 255],
    deep: [59, 7, 100],
    ink: '#faf5ff',
    critInk: '#fde047',
    alpha: 0.74,
    specPower: 52,
    specBoost: 1.65
  },
  {
    id: 'sapphire_glass',
    name: 'Glacial Sapphire Glass',
    kind: 'crystal',
    base: [14, 132, 224],
    coreGlow: [56, 224, 255],
    edge: [224, 242, 254],
    deep: [12, 42, 92],
    ink: '#f0f9ff',
    critInk: '#fef08a',
    alpha: 0.72,
    specPower: 56,
    specBoost: 1.7
  },
  {
    id: 'ruby_garnet',
    name: 'Crimson Ruby Crystal',
    kind: 'crystal',
    base: [220, 38, 62],
    coreGlow: [255, 112, 92],
    edge: [255, 228, 230],
    deep: [88, 10, 24],
    ink: '#fef08a',
    critInk: '#ffffff',
    alpha: 0.75,
    specPower: 50,
    specBoost: 1.6
  },
  {
    id: 'emerald_jade',
    name: 'Feywild Emerald Crystal',
    kind: 'crystal',
    base: [16, 185, 112],
    coreGlow: [110, 255, 190],
    edge: [209, 250, 229],
    deep: [6, 68, 42],
    ink: '#ecfdf5',
    critInk: '#fde047',
    alpha: 0.73,
    specPower: 50,
    specBoost: 1.6
  },
  {
    id: 'prism_opal',
    name: 'Dichroic Prism Glass',
    kind: 'crystal',
    base: [99, 179, 237],
    coreGlow: [244, 114, 182],
    edge: [255, 255, 255],
    deep: [49, 46, 129],
    ink: '#ffffff',
    critInk: '#fde047',
    alpha: 0.68,
    specPower: 64,
    specBoost: 1.85
  }
];

// Generic 5e SRD-compliant Party Adventurers & Monsters (strictly generic SRD archetypes, zero proprietary IP)
const PARTY_ROSTER = [
  {
    name: 'Ser Rowan',
    cls: 'Lv.7 Human Paladin',
    ac: 19,
    maxHp: 64,
    saves: { STR: 6, DEX: 1, CON: 4, WIS: 5, CHA: 7 },
    spellDc: 15,
    tokenColor: '#eab308',
    actions: [
      { name: ' Radiant Longsword', kind: 'attack', atkBonus: 8, dice: [{ sides: 8, count: 1 }, { sides: 8, count: 1 }], flatMod: 5, dmgType: 'Slashing + Radiant' },
      { name: 'Divine Smite Strike', kind: 'attack', atkBonus: 8, dice: [{ sides: 8, count: 1 }, { sides: 8, count: 3 }], flatMod: 5, dmgType: 'Radiant' }
    ]
  },
  {
    name: 'Lyra Shadowstep',
    cls: 'Lv.7 Elf Rogue',
    ac: 16,
    maxHp: 48,
    saves: { STR: 0, DEX: 8, CON: 2, INT: 5, WIS: 2 },
    spellDc: 14,
    tokenColor: '#38bdf8',
    actions: [
      { name: 'Sneak Attack Rapier', kind: 'attack', atkBonus: 8, rollMode: 'advantage', dice: [{ sides: 8, count: 1 }, { sides: 6, count: 4 }], flatMod: 5, dmgType: 'Piercing' },
      { name: 'Twin Shortbow Shot', kind: 'attack', atkBonus: 8, dice: [{ sides: 6, count: 2 }], flatMod: 5, dmgType: 'Piercing' }
    ]
  },
  {
    name: 'Thrain Ironbrow',
    cls: 'Lv.7 Dwarf Barbarian',
    ac: 16,
    maxHp: 82,
    saves: { STR: 8, DEX: 2, CON: 7, WIS: 1, CHA: 0 },
    spellDc: 13,
    tokenColor: '#f97316',
    actions: [
      { name: 'Reckless Greataxe', kind: 'attack', atkBonus: 8, rollMode: 'advantage', dice: [{ sides: 12, count: 1 }], flatMod: 7, dmgType: 'Slashing' },
      { name: 'Heavy Maul Slam', kind: 'attack', atkBonus: 8, dice: [{ sides: 6, count: 2 }], flatMod: 7, dmgType: 'Bludgeoning' }
    ]
  },
  {
    name: 'Caelum Starweaver',
    cls: 'Lv.7 Evocation Wizard',
    ac: 15,
    maxHp: 42,
    saves: { STR: -1, DEX: 3, CON: 3, INT: 8, WIS: 5 },
    spellDc: 16,
    tokenColor: '#a855f7',
    actions: [
      { name: 'Fireball (3rd-Lv)', kind: 'save', saveStat: 'DEX', halfOnSave: true, dice: [{ sides: 6, count: 8 }], flatMod: 0, dmgType: 'Fire' },
      { name: 'Chromatic Orb (3rd-Lv)', kind: 'attack', atkBonus: 8, dice: [{ sides: 8, count: 5 }], flatMod: 0, dmgType: 'Lightning' },
      { name: 'Fire Bolt Cantrip', kind: 'attack', atkBonus: 8, dice: [{ sides: 10, count: 2 }], flatMod: 0, dmgType: 'Fire' }
    ]
  },
  {
    name: 'Sister Miriel',
    cls: 'Lv.7 Life Cleric',
    ac: 18,
    maxHp: 55,
    saves: { STR: 2, DEX: 0, CON: 3, WIS: 8, CHA: 5 },
    spellDc: 16,
    tokenColor: '#34d399',
    actions: [
      { name: 'Guiding Bolt (2nd-Lv)', kind: 'attack', atkBonus: 8, dice: [{ sides: 6, count: 5 }], flatMod: 0, dmgType: 'Radiant' },
      { name: 'Sacred Flame', kind: 'save', saveStat: 'DEX', halfOnSave: false, dice: [{ sides: 8, count: 2 }], flatMod: 0, dmgType: 'Radiant' },
      { name: 'Spiritual Mace', kind: 'attack', atkBonus: 8, dice: [{ sides: 8, count: 1 }], flatMod: 4, dmgType: 'Force' }
    ]
  }
];

const MONSTER_WAVES = [
  [
    {
      name: 'Young Red Dragon',
      cls: 'CR 10 Large Dragon',
      ac: 18,
      maxHp: 136,
      saves: { STR: 6, DEX: 4, CON: 9, WIS: 4, CHA: 8 },
      spellDc: 17,
      tokenColor: '#ef4444',
      actions: [
        { name: 'Draconic Bite', kind: 'attack', atkBonus: 10, dice: [{ sides: 10, count: 2 }, { sides: 6, count: 1 }], flatMod: 6, dmgType: 'Piercing + Fire' },
        { name: 'Fire Breath (Recharge 6)', kind: 'save', saveStat: 'DEX', halfOnSave: true, dice: [{ sides: 6, count: 10 }], flatMod: 0, dmgType: 'Fire' },
        { name: 'Rending Claw', kind: 'attack', atkBonus: 10, dice: [{ sides: 6, count: 2 }], flatMod: 6, dmgType: 'Slashing' }
      ]
    },
    {
      name: 'kobold Scale-Sorcerer',
      cls: 'CR 2 Dragonkin Mage',
      ac: 15,
      maxHp: 36,
      saves: { STR: -2, DEX: 2, CON: 1, WIS: 0, CHA: 4 },
      spellDc: 13,
      tokenColor: '#f43f5e',
      actions: [
        { name: 'Scorching Ray', kind: 'attack', atkBonus: 5, dice: [{ sides: 6, count: 2 }], flatMod: 0, dmgType: 'Fire' }
      ]
    }
  ],
  [
    {
      name: 'Frost Giant Jarl',
      cls: 'CR 8 Huge Giant',
      ac: 15,
      maxHp: 126,
      saves: { STR: 9, DEX: -1, CON: 8, WIS: 3, CHA: 4 },
      spellDc: 15,
      tokenColor: '#60a5fa',
      actions: [
        { name: 'Runed Greataxe', kind: 'attack', atkBonus: 9, dice: [{ sides: 12, count: 3 }], flatMod: 6, dmgType: 'Slashing' },
        { name: 'Glacial Boulder Toss', kind: 'attack', atkBonus: 9, dice: [{ sides: 10, count: 4 }], flatMod: 6, dmgType: 'Bludgeoning' }
      ]
    },
    {
      name: 'Winter Wolf',
      cls: 'CR 3 Large Monstrosity',
      ac: 13,
      maxHp: 68,
      saves: { STR: 4, DEX: 1, CON: 2, WIS: 1, CHA: -1 },
      spellDc: 12,
      tokenColor: '#93c5fd',
      actions: [
        { name: 'Pack Tactics Bite', kind: 'attack', atkBonus: 6, rollMode: 'advantage', dice: [{ sides: 6, count: 2 }], flatMod: 4, dmgType: 'Piercing' },
        { name: 'Cold Breath', kind: 'save', saveStat: 'DEX', halfOnSave: true, dice: [{ sides: 8, count: 4 }], flatMod: 0, dmgType: 'Cold' }
      ]
    }
  ],
  [
    {
      name: 'Dread Wight Commander',
      cls: 'CR 6 Undead Warlord',
      ac: 17,
      maxHp: 92,
      saves: { STR: 6, DEX: 3, CON: 6, WIS: 4, CHA: 5 },
      spellDc: 15,
      tokenColor: '#10b981',
      actions: [
        { name: 'Necrotic Greatsword', kind: 'attack', atkBonus: 7, dice: [{ sides: 6, count: 2 }, { sides: 8, count: 2 }], flatMod: 4, dmgType: 'Slashing + Necrotic' },
        { name: 'Life Drain Grasp', kind: 'attack', atkBonus: 7, dice: [{ sides: 6, count: 3 }], flatMod: 3, dmgType: 'Necrotic' }
      ]
    },
    {
      name: 'Skeletal Archmage',
      cls: 'CR 5 Undead Lichling',
      ac: 15,
      maxHp: 58,
      saves: { STR: -1, DEX: 2, CON: 3, INT: 7, WIS: 4 },
      spellDc: 15,
      tokenColor: '#c084fc',
      actions: [
        { name: 'Blight Wave', kind: 'save', saveStat: 'CON', halfOnSave: true, dice: [{ sides: 8, count: 6 }], flatMod: 0, dmgType: 'Necrotic' },
        { name: 'Necrotic Bolt', kind: 'attack', atkBonus: 7, dice: [{ sides: 10, count: 2 }], flatMod: 0, dmgType: 'Necrotic' }
      ]
    }
  ]
];

const TABLE_THEMES = {
  parchment_tavern: {
    name: 'Parchment Battlemat & Tavern Oak',
    woodDark: '#26150b',
    woodMid: '#3f2312',
    woodGrain: 'rgba(18, 9, 4, 0.35)',
    matFillTop: '#dfd2b5',
    matFillBot: '#c7b592',
    matStain: 'rgba(138, 108, 68, 0.14)',
    gridLine: 'rgba(72, 54, 34, 0.28)',
    gridMajor: 'rgba(58, 40, 22, 0.44)',
    matBorder: '#4a3520',
    accent: '#f59e0b'
  },
  dungeon_slate: {
    name: 'Carved Dungeon Flagstone Mat & Walnut',
    woodDark: '#171316',
    woodMid: '#2a2024',
    woodGrain: 'rgba(8, 6, 8, 0.45)',
    matFillTop: '#333b48',
    matFillBot: '#232934',
    matStain: 'rgba(15, 23, 42, 0.28)',
    gridLine: 'rgba(148, 163, 184, 0.20)',
    gridMajor: 'rgba(203, 213, 225, 0.34)',
    matBorder: '#0f172a',
    accent: '#38bdf8'
  },
  emerald_velvet: {
    name: 'Emerald Felt Tactician Mat & Mahogany',
    woodDark: '#290f0d',
    woodMid: '#471b16',
    woodGrain: 'rgba(20, 5, 4, 0.38)',
    matFillTop: '#164e39',
    matFillBot: '#0d3627',
    matStain: 'rgba(4, 28, 18, 0.28)',
    gridLine: 'rgba(167, 243, 208, 0.16)',
    gridMajor: 'rgba(251, 191, 36, 0.30)',
    matBorder: '#78350f',
    accent: '#34d399'
  }
};

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

export function createDnD5eDice(canvas, getParams) {
  const ctx = canvas.getContext('2d');
  let w = canvas.width || canvas.clientWidth || 1280;
  let h = canvas.height || canvas.clientHeight || 720;

  // Deterministic/seeded or Math.random helper
  function randRange(lo, hi) {
    return lo + Math.random() * (hi - lo);
  }

  function randInt(lo, hi) {
    return Math.floor(Math.random() * (hi - lo + 1)) + lo;
  }

  function pickMaterial(materialFilter, indexHint = 0) {
    let pool = DICE_MATERIALS;
    if (materialFilter === 'metals_only') {
      pool = DICE_MATERIALS.filter((m) => m.kind === 'metal');
    } else if (materialFilter === 'crystals_only') {
      pool = DICE_MATERIALS.filter((m) => m.kind === 'crystal');
    }
    const idx = (Math.floor(Math.random() * pool.length) + indexHint) % pool.length;
    return pool[idx];
  }

  // Camera setup looking down at 54° onto the tabletop battlemat (world units: inches, mat ~ 22 x 14 in)
  const camPitch = 0.96; // ~55° downward tilt
  let camOrbit = 0;

  function worldToCamera(p, yaw) {
    const cy = Math.cos(yaw);
    const sy = Math.sin(yaw);
    const x1 = p.x * cy + p.z * sy;
    const y1 = p.y;
    const z1 = -p.x * sy + p.z * cy;

    // Camera positioned above and in front looking at (0, 0, 0)
    const cp = Math.cos(camPitch);
    const sp = Math.sin(camPitch);
    // Rotate world so Y-up tilts toward screen up and Z-depth goes away
    const rx = x1;
    const ry = y1 * cp - z1 * sp;
    const rz = y1 * sp + z1 * cp + 22.5;
    return { x: rx, y: ry, z: rz };
  }

  function projectPoint(p, yaw) {
    const c = worldToCamera(p, yaw);
    const fovScale = Math.min(w, h) * 1.18;
    const depth = Math.max(2.0, c.z);
    return {
      sx: w * 0.44 + (c.x / depth) * fovScale,
      sy: h * 0.54 - (c.y / depth) * fovScale,
      depth,
      cam: c
    };
  }

  // Persistent Encounter State
  let waveIndex = 0;
  let roundNumber = 1;
  let turnIndex = 0;
  let party = [];
  let monsters = [];
  let turnOrder = [];
  let combatLog = [];
  let currentTurn = null;
  let activeDice = [];
  let phase = 'idle'; // 'attack_roll' | 'attack_pause' | 'damage_roll' | 'resolve_pause'
  let phaseTimer = 0;
  let animClock = 0;

  function cloneCombatant(template, side, slotIdx) {
    return {
      ...template,
      name: template.name.charAt(0).toUpperCase() + template.name.slice(1),
      side,
      hp: template.maxHp,
      slotIdx,
      initiative: randInt(1, 20) + (template.saves.DEX || 0)
    };
  }

  function startNewEncounter(nextWaveIdx) {
    waveIndex = nextWaveIdx % MONSTER_WAVES.length;
    roundNumber = 1;
    party = PARTY_ROSTER.slice(0, 4).map((p, i) => cloneCombatant(p, 'party', i));
    monsters = MONSTER_WAVES[waveIndex].map((m, i) => cloneCombatant(m, 'monster', i));
    rebuildTurnOrder();
    combatLog.unshift({
      round: 1,
      title: `Encounter Wave ${waveIndex + 1} Begins!`,
      detail: `Initiative rolled — ${monsters.map((m) => m.name).join(' & ')} engage the party.`,
      badge: 'INITIATIVE',
      badgeColor: '#38bdf8'
    });
    if (combatLog.length > 7) combatLog.length = 7;
  }

  function rebuildTurnOrder() {
    turnOrder = [...party, ...monsters]
      .filter((c) => c.hp > 0)
      .sort((a, b) => b.initiative - a.initiative);
    turnIndex = 0;
  }

  // Create a physical 3D polyhedral die that tumbles onto the battlemat and lands with `targetValue` facing +Y
  function spawnDie(sides, targetValue, index, totalCount, materialFilter, roleLabel = '') {
    const key = `d${sides}`;
    const poly = POLYHEDRA[key] || POLYHEDRA.d20;
    const faceIdx = poly.faces.findIndex((f) => f.value === targetValue);
    const chosenFace = poly.faces[faceIdx >= 0 ? faceIdx : 0];

    // Settled orientation: rotate chosenFace.normal onto world +Y (0, 1, 0), then random yaw around Y
    const alignUp = quatFromUnitVectors(chosenFace.normal, vec3(0, 1, 0));
    const randomYaw = quatFromAxisAngle(vec3(0, 1, 0), randRange(0, Math.PI * 2));
    const finalQuat = quatNorm(quatMul(randomYaw, alignUp));

    // Spread landing spots cleanly across central battlemat without overlapping
    const angle = (index / Math.max(1, totalCount)) * Math.PI * 2 + randRange(-0.28, 0.28);
    const ringRadius = totalCount === 1 ? randRange(0.2, 1.1) : clamp(1.35 + totalCount * 0.26, 1.5, 4.3) * randRange(0.65, 1.05);
    const endX = Math.cos(angle) * ringRadius - 0.6;
    const endZ = Math.sin(angle) * (ringRadius * 0.72) + 0.3;

    // Throw from left (party) or right (monster) edge of the table
    const fromLeft = currentTurn && currentTurn.attacker.side === 'party';
    const startX = (fromLeft ? -9.5 : 8.2) + randRange(-1.2, 1.2);
    const startZ = randRange(-4.2, 3.8);
    const startY = randRange(4.4, 6.4);

    // Radius from origin to resting bottom plane (for d4, resting face is opposite to top vertex/face; use inscribed height)
    const restRadius = sides === 4 ? 0.55 : sides === 6 ? 0.56 : 0.68;

    return {
      sides,
      poly,
      value: chosenFace.value,
      roleLabel,
      material: pickMaterial(materialFilter, index),
      startPos: vec3(startX, startY, startZ),
      endPos: vec3(endX, restRadius, endZ),
      pos: vec3(startX, startY, startZ),
      restRadius,
      finalQuat,
      spinAxis: norm3(vec3(randRange(-1, 1), randRange(-0.8, 0.8), randRange(-1, 1))),
      spinTurns: randInt(3, 5) * Math.PI * 2,
      quat: quatIdentity(),
      t: 0,
      duration: randRange(1.05, 1.38) + index * 0.06,
      settled: false,
      discarded: false
    };
  }

  function updateDiePhysics(die, dt) {
    die.t = Math.min(die.duration, die.t + dt);
    const u = clamp(die.t / die.duration, 0, 1);
    const horiz = 1 - Math.pow(1 - u, 2.35);

    const x = lerp(die.startPos.x, die.endPos.x, horiz);
    const z = lerp(die.startPos.z, die.endPos.z, horiz);

    // 3-bounce decaying ballistic curve onto the battlemat
    let y = die.endPos.y;
    if (u < 0.52) {
      const k = u / 0.52;
      y = lerp(die.startPos.y, die.endPos.y, k * k);
    } else if (u < 0.76) {
      const k = (u - 0.52) / 0.24;
      y = die.endPos.y + Math.sin(k * Math.PI) * 1.65;
    } else if (u < 0.91) {
      const k = (u - 0.76) / 0.15;
      y = die.endPos.y + Math.sin(k * Math.PI) * 0.58;
    } else if (u < 1.0) {
      const k = (u - 0.91) / 0.09;
      y = die.endPos.y + Math.sin(k * Math.PI) * 0.16;
    }

    die.pos.x = x;
    die.pos.y = y;
    die.pos.z = z;

    // Decaying angular velocity converging smoothly onto exact `finalQuat` so top face reads `die.value`
    const remAngle = Math.pow(1 - u, 2.1) * die.spinTurns;
    const tumbleQuat = quatFromAxisAngle(die.spinAxis, remAngle);
    die.quat = quatNorm(quatMul(die.finalQuat, tumbleQuat));
    if (u >= 0.92) {
      const snapT = smoothstep(0.92, 1.0, u);
      die.quat = quatSlerp(die.quat, die.finalQuat, snapT);
    }
    die.settled = u >= 1.0;
  }

  function beginNextCombatTurn(materialFilter) {
    const aliveParty = party.filter((c) => c.hp > 0);
    const aliveMonsters = monsters.filter((c) => c.hp > 0);
    if (aliveParty.length === 0 || aliveMonsters.length === 0) {
      startNewEncounter(waveIndex + 1);
      return;
    }

    // Advance turn pointer to next living combatant
    let guard = 0;
    while (guard < turnOrder.length + 2) {
      if (turnIndex >= turnOrder.length) {
        turnIndex = 0;
        roundNumber += 1;
      }
      const cand = turnOrder[turnIndex];
      turnIndex += 1;
      if (cand && cand.hp > 0) {
        const targets = cand.side === 'party' ? aliveMonsters : aliveParty;
        const defender = targets[Math.floor(Math.random() * targets.length)];
        const action = cand.actions[Math.floor(Math.random() * cand.actions.length)];

        // Roll 5e Attack or Saving Throw
        activeDice = [];
        if (action.kind === 'attack') {
          const mode = action.rollMode || (Math.random() < 0.16 ? 'advantage' : Math.random() < 0.08 ? 'disadvantage' : 'normal');
          const d20a = randInt(1, 20);
          const d20b = randInt(1, 20);
          let chosenRaw = d20a;
          if (mode === 'advantage') chosenRaw = Math.max(d20a, d20b);
          else if (mode === 'disadvantage') chosenRaw = Math.min(d20a, d20b);

          const isCrit = chosenRaw === 20;
          const isFumble = chosenRaw === 1;
          const totalAttack = chosenRaw + action.atkBonus;
          const isHit = isCrit || (!isFumble && totalAttack >= defender.ac);

          if (mode === 'normal') {
            activeDice.push(spawnDie(20, d20a, 0, 1, materialFilter, 'ATK d20'));
          } else {
            const d1 = spawnDie(20, d20a, 0, 2, materialFilter, mode === 'advantage' ? 'ADV 1' : 'DIS 1');
            const d2 = spawnDie(20, d20b, 1, 2, materialFilter, mode === 'advantage' ? 'ADV 2' : 'DIS 2');
            if (mode === 'advantage') {
              if (d20a >= d20b) d2.discarded = true;
              else d1.discarded = true;
            } else {
              if (d20a <= d20b) d2.discarded = true;
              else d1.discarded = true;
            }
            activeDice.push(d1, d2);
          }

          currentTurn = {
            kind: 'attack',
            attacker: cand,
            defender,
            action,
            rollMode: mode,
            rawRolls: mode === 'normal' ? [d20a] : [d20a, d20b],
            chosenRaw,
            totalAttack,
            isCrit,
            isFumble,
            isHit,
            damageRolls: [],
            totalDamage: 0,
            damageResolved: false
          };
        } else {
          // 5e Saving Throw Spell
          const saveStat = action.saveStat || 'DEX';
          const saveMod = defender.saves[saveStat] || 0;
          const dc = cand.spellDc || 15;
          const rawSave = randInt(1, 20);
          const totalSave = rawSave + saveMod;
          const saveSucceeded = totalSave >= dc;
          activeDice.push(spawnDie(20, rawSave, 0, 1, materialFilter, `${saveStat} SAVE`));

          currentTurn = {
            kind: 'save',
            attacker: cand,
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
            damageResolved: false
          };
        }

        phase = 'attack_roll';
        phaseTimer = 0;
        return;
      }
      guard += 1;
    }
  }

  function spawnDamageRoll(materialFilter) {
    if (!currentTurn) return;
    const { action, isCrit } = currentTurn;
    const expanded = [];
    for (const spec of action.dice) {
      const cnt = spec.count * (isCrit ? 2 : 1);
      for (let i = 0; i < cnt; i++) {
        expanded.push(spec.sides);
      }
    }

    // Keep existing d20(s) tucked near top-left of the mat or replace with fresh damage volley
    activeDice = [];
    const rolls = [];
    expanded.forEach((sides, idx) => {
      const v = randInt(1, sides);
      rolls.push({ sides, value: v });
      activeDice.push(spawnDie(sides, v, idx, expanded.length, materialFilter, `d${sides}`));
    });

    const sumDice = rolls.reduce((acc, r) => acc + r.value, 0);
    let total = Math.max(1, sumDice + (action.flatMod || 0));
    if (currentTurn.kind === 'save' && currentTurn.saveSucceeded) {
      total = action.halfOnSave ? Math.floor(total / 2) : 0;
    }
    currentTurn.damageRolls = rolls;
    currentTurn.rawDamageSum = sumDice;
    currentTurn.totalDamage = total;
  }

  function commitTurnResolution() {
    if (!currentTurn || currentTurn.damageResolved) return;
    currentTurn.damageResolved = true;
    const t = currentTurn;
    let badge = 'MISS';
    let badgeColor = '#94a3b8';
    let detail = '';

    if (t.kind === 'attack') {
      const modeTag = t.rollMode === 'advantage' ? ' (Adv)' : t.rollMode === 'disadvantage' ? ' (Dis)' : '';
      if (t.isHit) {
        t.defender.hp = Math.max(0, t.defender.hp - t.totalDamage);
        badge = t.isCrit ? 'CRITICAL HIT!' : 'HIT';
        badgeColor = t.isCrit ? '#facc15' : '#34d399';
        const ko = t.defender.hp === 0 ? ' [DEFEATED!]' : '';
        detail = `d20${modeTag}: ${t.chosenRaw} ${formatSigned(t.action.atkBonus)} = ${t.totalAttack} vs AC ${t.defender.ac} → ${t.totalDamage} ${t.action.dmgType}${ko}`;
      } else {
        badge = t.isFumble ? 'NAT 1 MISS' : 'MISS';
        badgeColor = t.isFumble ? '#f87171' : '#94a3b8';
        detail = `d20${modeTag}: ${t.chosenRaw} ${formatSigned(t.action.atkBonus)} = ${t.totalAttack} vs AC ${t.defender.ac} — Attack deflected`;
      }
    } else {
      if (t.totalDamage > 0) {
        t.defender.hp = Math.max(0, t.defender.hp - t.totalDamage);
      }
      const ko = t.defender.hp === 0 ? ' [DEFEATED!]' : '';
      if (!t.saveSucceeded) {
        badge = 'SAVE FAILED';
        badgeColor = '#fb923c';
        detail = `${t.defender.name} ${t.saveStat} Save: ${t.chosenRaw} ${formatSigned(t.saveMod)} = ${t.totalSave} vs DC ${t.dc} → ${t.totalDamage} ${t.action.dmgType}${ko}`;
      } else if (t.action.halfOnSave) {
        badge = 'SAVED (HALF)';
        badgeColor = '#38bdf8';
        detail = `${t.defender.name} ${t.saveStat} Save: ${t.chosenRaw} ${formatSigned(t.saveMod)} = ${t.totalSave} vs DC ${t.dc} → ${t.totalDamage} ${t.action.dmgType} (½)${ko}`;
      } else {
        badge = 'SAVED (0 DMG)';
        badgeColor = '#94a3b8';
        detail = `${t.defender.name} ${t.saveStat} Save: ${t.chosenRaw} ${formatSigned(t.saveMod)} = ${t.totalSave} vs DC ${t.dc} — Evaded`;
      }
    }

    combatLog.unshift({
      round: roundNumber,
      title: `${t.attacker.name} → ${t.defender.name} (${t.action.name.trim()})`,
      detail,
      badge,
      badgeColor
    });
    if (combatLog.length > 7) combatLog.length = 7;
  }

  // Initialize first encounter
  startNewEncounter(0);
  beginNextCombatTurn('mixed');

  // --- Rendering Helpers for Table, Battlemat, Paraphernalia, 3D Dice, and Encounter Window ---

  function drawRoundedRect(rx, ry, rw, rh, rad) {
    const r = Math.min(rad, rw * 0.5, rh * 0.5);
    ctx.beginPath();
    ctx.moveTo(rx + r, ry);
    ctx.lineTo(rx + rw - r, ry);
    ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + r);
    ctx.lineTo(rx + rw, ry + rh - r);
    ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - r, ry + rh);
    ctx.lineTo(rx + r, ry + rh);
    ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - r);
    ctx.lineTo(rx, ry + r);
    ctx.quadraticCurveTo(rx, ry, rx + r, ry);
    ctx.closePath();
  }

  function drawTableAndBattlemat(theme, yaw) {
    // Oak/Walnut/Mahogany tabletop background
    const bgGrad = ctx.createRadialGradient(w * 0.42, h * 0.48, w * 0.05, w * 0.45, h * 0.5, w * 0.85);
    bgGrad.addColorStop(0, theme.woodMid);
    bgGrad.addColorStop(1, theme.woodDark);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Subtle wood plank seams on tabletop
    ctx.strokeStyle = theme.woodGrain;
    ctx.lineWidth = 2;
    for (let i = -3; i <= 4; i++) {
      const p1 = projectPoint(vec3(-18, -0.05, i * 3.1), yaw);
      const p2 = projectPoint(vec3(18, -0.05, i * 3.1), yaw);
      ctx.beginPath();
      ctx.moveTo(p1.sx, p1.sy);
      ctx.lineTo(p2.sx, p2.sy);
      ctx.stroke();
    }

    // 1-inch gridded vinyl/parchment battlemat (-9.5..8.5 in X, -6.5..6.5 in Z)
    const matX0 = -9.5, matX1 = 7.5;
    const matZ0 = -6.5, matZ1 = 6.5;

    // Mat drop shadow
    const s0 = projectPoint(vec3(matX0 - 0.18, -0.02, matZ0 - 0.18), yaw);
    const s1 = projectPoint(vec3(matX1 + 0.25, -0.02, matZ0 - 0.18), yaw);
    const s2 = projectPoint(vec3(matX1 + 0.25, -0.02, matZ1 + 0.28), yaw);
    const s3 = projectPoint(vec3(matX0 - 0.18, -0.02, matZ1 + 0.28), yaw);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.48)';
    ctx.beginPath();
    ctx.moveTo(s0.sx, s0.sy);
    ctx.lineTo(s1.sx, s1.sy);
    ctx.lineTo(s2.sx, s2.sy);
    ctx.lineTo(s3.sx, s3.sy);
    ctx.closePath();
    ctx.fill();

    // Mat surface quad
    const c0 = projectPoint(vec3(matX0, 0, matZ0), yaw);
    const c1 = projectPoint(vec3(matX1, 0, matZ0), yaw);
    const c2 = projectPoint(vec3(matX1, 0, matZ1), yaw);
    const c3 = projectPoint(vec3(matX0, 0, matZ1), yaw);

    const matGrad = ctx.createLinearGradient(c0.sx, c0.sy, c2.sx, c2.sy);
    matGrad.addColorStop(0, theme.matFillTop);
    matGrad.addColorStop(1, theme.matFillBot);
    ctx.fillStyle = matGrad;
    ctx.beginPath();
    ctx.moveTo(c0.sx, c0.sy);
    ctx.lineTo(c1.sx, c1.sy);
    ctx.lineTo(c2.sx, c2.sy);
    ctx.lineTo(c3.sx, c3.sy);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = theme.matBorder;
    ctx.lineWidth = 4;
    ctx.stroke();

    // Hand-sketched dungeon room walls & compass rose on the battlemat
    const r0 = projectPoint(vec3(-6.5, 0.005, -4.5), yaw);
    const r1 = projectPoint(vec3(4.5, 0.005, -4.5), yaw);
    const r2 = projectPoint(vec3(4.5, 0.005, 4.5), yaw);
    const r3 = projectPoint(vec3(-6.5, 0.005, 4.5), yaw);
    ctx.fillStyle = theme.matStain;
    ctx.beginPath();
    ctx.moveTo(r0.sx, r0.sy);
    ctx.lineTo(r1.sx, r1.sy);
    ctx.lineTo(r2.sx, r2.sy);
    ctx.lineTo(r3.sx, r3.sy);
    ctx.closePath();
    ctx.fill();

    // 1-inch square tactical grid lines (1 square = 5 ft)
    for (let gx = matX0; gx <= matX1 + 0.01; gx += 1.0) {
      const pA = projectPoint(vec3(gx, 0.008, matZ0), yaw);
      const pB = projectPoint(vec3(gx, 0.008, matZ1), yaw);
      const isMajor = Math.round(gx - matX0) % 5 === 0;
      ctx.strokeStyle = isMajor ? theme.gridMajor : theme.gridLine;
      ctx.lineWidth = isMajor ? 1.5 : 1;
      ctx.beginPath();
      ctx.moveTo(pA.sx, pA.sy);
      ctx.lineTo(pB.sx, pB.sy);
      ctx.stroke();
    }
    for (let gz = matZ0; gz <= matZ1 + 0.01; gz += 1.0) {
      const pA = projectPoint(vec3(matX0, 0.008, gz), yaw);
      const pB = projectPoint(vec3(matX1, 0.008, gz), yaw);
      const isMajor = Math.round(gz - matZ0) % 5 === 0;
      ctx.strokeStyle = isMajor ? theme.gridMajor : theme.gridLine;
      ctx.lineWidth = isMajor ? 1.5 : 1;
      ctx.beginPath();
      ctx.moveTo(pA.sx, pA.sy);
      ctx.lineTo(pB.sx, pB.sy);
      ctx.stroke();
    }

    // Sketched stone pillars on mat corners + "1 SQ = 5 FT" legend
    const pillars = [vec3(-5.5, 0.01, -3.5), vec3(3.5, 0.01, -3.5), vec3(-5.5, 0.01, 3.5), vec3(3.5, 0.01, 3.5)];
    for (const pl of pillars) {
      const pp = projectPoint(pl, yaw);
      const rad = Math.max(5, (0.34 / pp.depth) * Math.min(w, h) * 1.15);
      ctx.fillStyle = 'rgba(71, 85, 105, 0.35)';
      ctx.beginPath();
      ctx.arc(pp.sx, pp.sy, rad, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = theme.gridMajor;
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }

    const scalePos = projectPoint(vec3(-8.6, 0.01, 5.85), yaw);
    ctx.fillStyle = theme.gridMajor;
    ctx.font = '600 11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('1 SQ = 5 FT (SRD 5.1 TACTICAL GRID)', scalePos.sx, scalePos.sy);
  }

  // Draw generic tabletop RPG paraphernalia around the battlemat
  function drawTabletopParaphernalia(yaw) {
    // 1. Character Sheet & #2 Wooden Pencil (left side of battlemat)
    const sh0 = projectPoint(vec3(-14.2, 0.03, -2.6), yaw);
    const sh1 = projectPoint(vec3(-10.1, 0.03, -3.0), yaw);
    const sh2 = projectPoint(vec3(-9.8, 0.03, 3.6), yaw);
    const sh3 = projectPoint(vec3(-13.9, 0.03, 4.0), yaw);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.36)';
    ctx.beginPath();
    ctx.moveTo(sh0.sx + 4, sh0.sy + 5);
    ctx.lineTo(sh1.sx + 4, sh1.sy + 5);
    ctx.lineTo(sh2.sx + 4, sh2.sy + 5);
    ctx.lineTo(sh3.sx + 4, sh3.sy + 5);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#f5efe0';
    ctx.beginPath();
    ctx.moveTo(sh0.sx, sh0.sy);
    ctx.lineTo(sh1.sx, sh1.sy);
    ctx.lineTo(sh2.sx, sh2.sy);
    ctx.lineTo(sh3.sx, sh3.sy);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#a89f8d';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Character sheet stat boxes (STR/DEX/CON/INT/WIS/CHA) & ruled lines
    for (let i = 0; i < 6; i++) {
      const t = (i + 0.8) / 7.2;
      const bx = lerp(sh0.sx, sh3.sx, t) * 0.86 + lerp(sh1.sx, sh2.sx, t) * 0.14;
      const by = lerp(sh0.sy, sh3.sy, t) * 0.86 + lerp(sh1.sy, sh2.sy, t) * 0.14;
      ctx.strokeStyle = 'rgba(71, 60, 46, 0.55)';
      ctx.lineWidth = 1.1;
      ctx.strokeRect(bx - 7, by - 6, 14, 12);
    }
    for (let ln = 1; ln <= 7; ln++) {
      const t = ln / 8.5;
      const lx0 = lerp(sh0.sx, sh3.sx, t) * 0.55 + lerp(sh1.sx, sh2.sx, t) * 0.45;
      const ly0 = lerp(sh0.sy, sh3.sy, t) * 0.55 + lerp(sh1.sy, sh2.sy, t) * 0.45;
      const lx1 = lerp(sh0.sx, sh3.sx, t) * 0.12 + lerp(sh1.sx, sh2.sx, t) * 0.88;
      const ly1 = lerp(sh0.sy, sh3.sy, t) * 0.12 + lerp(sh1.sy, sh2.sy, t) * 0.88;
      ctx.strokeStyle = 'rgba(92, 79, 62, 0.38)';
      ctx.beginPath();
      ctx.moveTo(lx0, ly0);
      ctx.lineTo(lx1, ly1);
      ctx.stroke();
    }

    // #2 Yellow Hexagonal Pencil + Pink Eraser lying across the character sheet
    const penA = projectPoint(vec3(-12.9, 0.12, 2.5), yaw);
    const penB = projectPoint(vec3(-9.9, 0.12, 0.2), yaw);
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(penA.sx + 2, penA.sy + 3);
    ctx.lineTo(penB.sx + 2, penB.sy + 3);
    ctx.stroke();

    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(penA.sx, penA.sy);
    ctx.lineTo(penB.sx, penB.sy);
    ctx.stroke();

    // Eraser ferrule + tip
    ctx.fillStyle = '#f472b6';
    ctx.beginPath();
    ctx.arc(penA.sx, penA.sy, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(penB.sx, penB.sy, 2.2, 0, Math.PI * 2);
    ctx.fill();

    // 2. Folded 3-Panel Wooden GM Screen along top edge of battlemat
    const gmPts = [
      vec3(-8.4, 0, -7.4),
      vec3(-3.2, 0, -8.3),
      vec3(2.4, 0, -8.3),
      vec3(7.4, 0, -7.3)
    ];
    for (let i = 0; i < 3; i++) {
      const b0 = projectPoint(gmPts[i], yaw);
      const b1 = projectPoint(gmPts[i + 1], yaw);
      const t1 = projectPoint(add3(gmPts[i + 1], vec3(0, 2.7, 0)), yaw);
      const t0 = projectPoint(add3(gmPts[i], vec3(0, 2.7, 0)), yaw);

      const panelGrad = ctx.createLinearGradient(b0.sx, t0.sy, b1.sx, b1.sy);
      panelGrad.addColorStop(0, i === 1 ? '#581c1c' : '#451a14');
      panelGrad.addColorStop(1, '#27100c');
      ctx.fillStyle = panelGrad;
      ctx.beginPath();
      ctx.moveTo(b0.sx, b0.sy);
      ctx.lineTo(b1.sx, b1.sy);
      ctx.lineTo(t1.sx, t1.sy);
      ctx.lineTo(t0.sx, t0.sy);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      // Brass emblem on center GM panel
      if (i === 1) {
        const mid = projectPoint(vec3(-0.4, 1.35, -8.28), yaw);
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.7)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(mid.sx, mid.sy, 12, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // 3. Hardcover Rulebook Tome & Octagonal Felt-Lined Dice Tray (bottom-left / top-left)
    const bk0 = projectPoint(vec3(-13.8, 0.35, -6.9), yaw);
    const bk1 = projectPoint(vec3(-9.7, 0.35, -7.2), yaw);
    const bk2 = projectPoint(vec3(-9.5, 0.35, -4.1), yaw);
    const bk3 = projectPoint(vec3(-13.6, 0.35, -3.8), yaw);
    ctx.fillStyle = '#1e3a5f';
    ctx.beginPath();
    ctx.moveTo(bk0.sx, bk0.sy);
    ctx.lineTo(bk1.sx, bk1.sy);
    ctx.lineTo(bk2.sx, bk2.sy);
    ctx.lineTo(bk3.sx, bk3.sy);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.stroke();

    const tomeCenter = projectPoint(vec3(-11.65, 0.38, -5.5), yaw);
    ctx.fillStyle = 'rgba(251, 191, 36, 0.85)';
    ctx.font = 'bold 10px serif';
    ctx.textAlign = 'center';
    ctx.fillText('5E SRD RULES', tomeCenter.sx, tomeCenter.sy);

    // 4. Corked Glass Healing Potion Flask + Scattered Gold & Silver Coins + Warm Candle
    const potionPos = projectPoint(vec3(-10.6, 0.55, 5.1), yaw);
    const pRad = Math.max(10, (0.58 / potionPos.depth) * Math.min(w, h) * 1.15);
    const potGrad = ctx.createRadialGradient(
      potionPos.sx - pRad * 0.3,
      potionPos.sy - pRad * 0.3,
      pRad * 0.1,
      potionPos.sx,
      potionPos.sy,
      pRad
    );
    potGrad.addColorStop(0, '#fda4af');
    potGrad.addColorStop(0.45, '#e11d48');
    potGrad.addColorStop(1, '#4c0519');
    ctx.fillStyle = potGrad;
    ctx.beginPath();
    ctx.arc(potionPos.sx, potionPos.sy, pRad, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    // Cork stopper
    ctx.fillStyle = '#b45309';
    ctx.fillRect(potionPos.sx - pRad * 0.28, potionPos.sy - pRad * 1.25, pRad * 0.56, pRad * 0.42);

    // Gold & Silver Coins beside the mat
    const coins = [
      { pos: vec3(-8.8, 0.05, 5.9), gold: true },
      { pos: vec3(-8.2, 0.05, 6.2), gold: true },
      { pos: vec3(-9.1, 0.05, 6.35), gold: false },
      { pos: vec3(6.8, 0.05, 5.9), gold: true },
      { pos: vec3(7.3, 0.05, 5.5), gold: false }
    ];
    for (const cn of coins) {
      const cp = projectPoint(cn.pos, yaw);
      ctx.fillStyle = cn.gold ? '#facc15' : '#cbd5e1';
      ctx.beginPath();
      ctx.ellipse(cp.sx, cp.sy, 6.5, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = cn.gold ? '#a16207' : '#475569';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }

    // Brass Candle Holder with flickering warm flame (top-right of mat)
    const candleBase = projectPoint(vec3(8.5, 0.2, -5.8), yaw);
    const flicker = Math.sin(animClock * 9.5) * 1.5 + Math.cos(animClock * 14.2) * 1.0;
    const glow = ctx.createRadialGradient(
      candleBase.sx,
      candleBase.sy - 18,
      2,
      candleBase.sx,
      candleBase.sy - 18,
      68 + flicker * 4
    );
    glow.addColorStop(0, 'rgba(254, 240, 138, 0.85)');
    glow.addColorStop(0.35, 'rgba(251, 146, 60, 0.32)');
    glow.addColorStop(1, 'rgba(251, 146, 60, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(candleBase.sx, candleBase.sy - 18, 72, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#b45309';
    ctx.beginPath();
    ctx.ellipse(candleBase.sx, candleBase.sy, 14, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fef3c7';
    ctx.fillRect(candleBase.sx - 5, candleBase.sy - 18, 10, 18);
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.ellipse(candleBase.sx + flicker * 0.4, candleBase.sy - 24, 4, 8, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw pewter & painted RPG miniatures on the battlemat for living combatants
  function drawMiniatures(yaw) {
    const partySlots = [
      vec3(-5.5, 0, -2.2),
      vec3(-6.2, 0, -0.3),
      vec3(-5.2, 0, 1.6),
      vec3(-6.6, 0, 3.1)
    ];
    const monsterSlots = [
      vec3(3.6, 0, -0.8),
      vec3(4.5, 0, 2.2)
    ];

    const allMinis = [
      ...party.map((p, i) => ({ unit: p, pos: partySlots[i % partySlots.length], scale: 1.0 })),
      ...monsters.map((m, i) => ({ unit: m, pos: monsterSlots[i % monsterSlots.length], scale: i === 0 ? 1.38 : 1.0 }))
    ];

    allMinis.sort((a, b) => {
      const ca = worldToCamera(a.pos, yaw);
      const cb = worldToCamera(b.pos, yaw);
      return cb.z - ca.z;
    });

    for (const item of allMinis) {
      const { unit, pos, scale } = item;
      const baseP = projectPoint(pos, yaw);
      const topP = projectPoint(add3(pos, vec3(0, 1.25 * scale, 0)), yaw);
      const rBase = Math.max(9, (0.48 * scale / baseP.depth) * Math.min(w, h) * 1.15);
      const isAttacker = currentTurn && currentTurn.attacker === unit;
      const isDefender = currentTurn && currentTurn.defender === unit;
      const defeated = unit.hp <= 0;

      ctx.save();
      if (defeated) ctx.globalAlpha = 0.32;

      // Active target / attacker tactical ring on battlemat
      if ((isAttacker || isDefender) && !defeated) {
        ctx.strokeStyle = isAttacker ? '#facc15' : '#f87171';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.ellipse(baseP.sx, baseP.sy, rBase * 1.38, rBase * 0.92, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Black beveled miniature base
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(baseP.sx, baseP.sy, rBase, rBase * 0.66, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = unit.tokenColor;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Sculpted pewter/painted silhouette pedestal + head
      const bodyGrad = ctx.createLinearGradient(baseP.sx - rBase * 0.4, topP.sy, baseP.sx + rBase * 0.4, baseP.sy);
      bodyGrad.addColorStop(0, unit.tokenColor);
      bodyGrad.addColorStop(1, '#1e293b');
      ctx.fillStyle = bodyGrad;
      ctx.beginPath();
      ctx.moveTo(baseP.sx - rBase * 0.46, baseP.sy - 2);
      ctx.lineTo(topP.sx - rBase * 0.22, topP.sy + rBase * 0.35);
      ctx.lineTo(topP.sx + rBase * 0.22, topP.sy + rBase * 0.35);
      ctx.lineTo(baseP.sx + rBase * 0.46, baseP.sy - 2);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.arc(topP.sx, topP.sy + rBase * 0.18, rBase * 0.28, 0, Math.PI * 2);
      ctx.fill();

      // Floating HP bar above miniature
      if (!defeated) {
        const hpFrac = clamp(unit.hp / unit.maxHp, 0, 1);
        const bw = Math.max(28, rBase * 2.0);
        const bx = topP.sx - bw * 0.5;
        const by = topP.sy - 10;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
        ctx.fillRect(bx, by, bw, 5);
        ctx.fillStyle = hpFrac > 0.5 ? '#22c55e' : hpFrac > 0.25 ? '#eab308' : '#ef4444';
        ctx.fillRect(bx + 1, by + 1, (bw - 2) * hpFrac, 3);
      }
      ctx.restore();
    }
  }

  // Render a single 3D metallic or crystalline polyhedral die with back-to-front internal crystal refraction & engraved numbers
  function drawPolyhedralDie(die, yaw) {
    const { poly, material, pos, quat } = die;
    const lightDir = norm3(vec3(-0.38, 0.82, 0.42));
    const rimLightDir = norm3(vec3(0.62, 0.45, -0.64));

    // Soft shadow on the battlemat directly below the die
    const shadowPos = projectPoint(vec3(pos.x + 0.18, 0.02, pos.z + 0.18), yaw);
    const heightFactor = clamp(1 - (pos.y - die.restRadius) * 0.12, 0.45, 1.0);
    const shadowRad = Math.max(10, (0.78 / shadowPos.depth) * Math.min(w, h) * 1.15) * heightFactor;

    ctx.save();
    if (die.discarded) ctx.globalAlpha = 0.42;

    const shGrad = ctx.createRadialGradient(shadowPos.sx, shadowPos.sy, 1, shadowPos.sx, shadowPos.sy, shadowRad * 1.35);
    shGrad.addColorStop(0, material.kind === 'crystal' ? `rgba(${material.coreGlow[0]}, ${material.coreGlow[1]}, ${material.coreGlow[2]}, 0.36)` : 'rgba(0, 0, 0, 0.52)');
    shGrad.addColorStop(0.55, 'rgba(0, 0, 0, 0.32)');
    shGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = shGrad;
    ctx.beginPath();
    ctx.ellipse(shadowPos.sx, shadowPos.sy, shadowRad * 1.35, shadowRad * 0.92, 0, 0, Math.PI * 2);
    ctx.fill();

    // Transform vertices to world and screen space
    const worldVerts = poly.verts.map((v) => add3(pos, rotateByQuat(v, quat)));
    const projVerts = worldVerts.map((wv) => projectPoint(wv, yaw));

    // Prepare faces with camera-space depth and view vector
    const faceItems = poly.faces.map((f) => {
      const wn = rotateByQuat(f.normal, quat);
      const wc = add3(pos, rotateByQuat(f.centroid, quat));
      const camC = worldToCamera(wc, yaw);
      const camN = rotateByQuat(f.normal, quat); // world normal
      // View vector from face toward camera in world space
      const cy = Math.cos(yaw);
      const sy = Math.sin(yaw);
      const camWorldDir = norm3(vec3(
        -Math.sin(yaw) * Math.cos(camPitch),
        Math.sin(camPitch),
        Math.cos(yaw) * Math.cos(camPitch)
      ));
      const facing = dot3(wn, camWorldDir);
      void cy; void sy; void camN;
      return {
        face: f,
        wn,
        wc,
        facing,
        depth: camC.z
      };
    });

    // Sort back-to-front
    faceItems.sort((a, b) => b.depth - a.depth);

    const isCrit20 = die.settled && die.sides === 20 && die.value === 20 && !die.discarded;
    const isNat1 = die.settled && die.sides === 20 && die.value === 1 && !die.discarded;

    for (const item of faceItems) {
      const { face, wn, facing } = item;
      const isFront = facing > -0.02;
      if (material.kind === 'metal' && !isFront) continue;

      const pts = face.indices.map((idx) => projVerts[idx]);
      ctx.beginPath();
      ctx.moveTo(pts[0].sx, pts[0].sy);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].sx, pts[i].sy);
      }
      ctx.closePath();

      const ndotl = Math.max(0, dot3(wn, lightDir));
      const rim = Math.max(0, dot3(wn, rimLightDir));
      const halfVec = norm3(add3(lightDir, vec3(0, 0.84, 0.54)));
      const spec = Math.pow(Math.max(0, dot3(wn, halfVec)), material.specPower) * material.specBoost;

      if (material.kind === 'crystal') {
        if (!isFront) {
          // Internal refracted back-facets visible through translucent crystal/glass
          const r = Math.round(lerp(material.deep[0], material.coreGlow[0], 0.38 + rim * 0.35));
          const g = Math.round(lerp(material.deep[1], material.coreGlow[1], 0.38 + rim * 0.35));
          const b = Math.round(lerp(material.deep[2], material.coreGlow[2], 0.38 + rim * 0.35));
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.42)`;
          ctx.fill();
          ctx.strokeStyle = `rgba(${material.edge[0]}, ${material.edge[1]}, ${material.edge[2]}, 0.22)`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
          continue;
        }
        const fresnel = Math.pow(1 - clamp(facing, 0, 1), 2.2);
        const r = clamp(Math.round(lerp(material.deep[0], material.base[0], 0.35 + ndotl * 0.65) + material.coreGlow[0] * fresnel * 0.35 + spec * 210), 0, 255);
        const g = clamp(Math.round(lerp(material.deep[1], material.base[1], 0.35 + ndotl * 0.65) + material.coreGlow[1] * fresnel * 0.35 + spec * 210), 0, 255);
        const b = clamp(Math.round(lerp(material.deep[2], material.base[2], 0.35 + ndotl * 0.65) + material.coreGlow[2] * fresnel * 0.35 + spec * 210), 0, 255);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${material.alpha})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(${material.edge[0]}, ${material.edge[1]}, ${material.edge[2]}, 0.78)`;
        ctx.lineWidth = 1.35;
        ctx.stroke();
      } else {
        // Forged metallic facet with burnished bevel edges
        const shade = 0.25 + ndotl * 0.72 + rim * 0.18;
        const r = clamp(Math.round(lerp(material.deep[0], material.base[0], clamp(shade, 0, 1)) + spec * 185), 0, 255);
        const g = clamp(Math.round(lerp(material.deep[1], material.base[1], clamp(shade, 0, 1)) + spec * 175), 0, 255);
        const b = clamp(Math.round(lerp(material.deep[2], material.base[2], clamp(shade, 0, 1)) + spec * 155), 0, 255);
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(${material.edge[0]}, ${material.edge[1]}, ${material.edge[2]}, 0.75)`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Engraved numeral projected onto the 3D facet plane using its rotated tangent/bitangent basis
      if (facing > 0.14) {
        const wt = rotateByQuat(face.tangent, quat);
        const wb = rotateByQuat(face.bitangent, quat);
        const pCenter = projectPoint(item.wc, yaw);
        const pRight = projectPoint(add3(item.wc, scale3(wt, 0.28)), yaw);
        const pUp = projectPoint(add3(item.wc, scale3(wb, 0.28)), yaw);

        const ux = (pRight.sx - pCenter.sx) / 10;
        const uy = (pRight.sy - pCenter.sy) / 10;
        const vx = (pCenter.sx - pUp.sx) / 10;
        const vy = (pCenter.sy - pUp.sy) / 10;

        ctx.save();
        ctx.transform(ux, uy, vx, vy, pCenter.sx, pCenter.sy);
        ctx.font = die.sides >= 12 ? 'bold 11px Georgia, serif' : 'bold 13px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const isTopSettled = die.settled && face.value === die.value && wn.y > 0.72;
        ctx.fillStyle = isTopSettled ? material.critInk : material.ink;
        const label = (face.value === 6 || face.value === 9) && die.sides >= 10 ? `${face.value}.` : String(face.value);
        ctx.fillText(label, 0, 0);
        ctx.restore();
      }
    }

    // Settled top-value callout badge floating cleanly above each die so every roll is crystal-clear at a glance
    if (die.settled) {
      const badgeAnchor = projectPoint(add3(pos, vec3(0, 1.18, 0)), yaw);
      const pillText = `${die.value}`;
      ctx.font = 'bold 13px monospace';
      const tw = Math.max(26, ctx.measureText(pillText).width + 14);
      const bx = badgeAnchor.sx - tw * 0.5;
      const by = badgeAnchor.sy - 12;

      drawRoundedRect(bx, by, tw, 22, 6);
      ctx.fillStyle = isCrit20
        ? 'rgba(234, 179, 8, 0.95)'
        : isNat1
          ? 'rgba(220, 38, 38, 0.92)'
          : 'rgba(15, 23, 42, 0.88)';
      ctx.fill();
      ctx.strokeStyle = isCrit20 ? '#fef08a' : isNat1 ? '#fca5a5' : 'rgba(226, 232, 240, 0.45)';
      ctx.lineWidth = 1.4;
      ctx.stroke();

      ctx.fillStyle = isCrit20 ? '#0f172a' : '#f8fafc';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pillText, badgeAnchor.sx, by + 11);

      ctx.font = '600 9px sans-serif';
      ctx.fillStyle = 'rgba(226, 232, 240, 0.88)';
      ctx.fillText(`d${die.sides}${die.discarded ? ' (drop)' : ''}`, badgeAnchor.sx, by - 7);
    }

    ctx.restore();
  }

  // Render the 5th Edition Encounter & Roll Breakdown Window on the right side of the screen
  function drawEncounterWindow() {
    if (!currentTurn) return;
    const panelW = clamp(Math.round(w * 0.31), 320, 440);
    const panelX = w - panelW - 22;
    const panelY = 20;
    const panelH = h - 40;

    ctx.save();
    drawRoundedRect(panelX, panelY, panelW, panelH, 14);
    ctx.fillStyle = 'rgba(12, 16, 26, 0.86)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(217, 165, 76, 0.55)';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    let cy = panelY + 26;
    const padX = panelX + 18;
    const innerW = panelW - 36;

    // Header
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`5E SRD ENCOUNTER • WAVE ${waveIndex + 1} • ROUND ${roundNumber}`, padX, cy);
    cy += 22;

    // Attacker vs Defender Card
    const cardH = 98;
    drawRoundedRect(padX, cy, innerW, cardH, 10);
    ctx.fillStyle = 'rgba(30, 41, 59, 0.72)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
    ctx.lineWidth = 1;
    ctx.stroke();

    const atk = currentTurn.attacker;
    const def = currentTurn.defender;

    ctx.fillStyle = atk.tokenColor;
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(`⚔ ${atk.name}`, padX + 12, cy + 22);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px sans-serif';
    ctx.fillText(`${atk.cls} • HP ${atk.hp}/${atk.maxHp}`, padX + 12, cy + 38);

    ctx.fillStyle = '#f87171';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(`🛡 ${def.name}`, padX + 12, cy + 64);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '11px sans-serif';
    ctx.fillText(`${def.cls} • AC ${def.ac} • HP ${def.hp}/${def.maxHp}`, padX + 12, cy + 80);

    // Defender HP bar inside card
    const barW = 92;
    const barX = padX + innerW - barW - 12;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(barX, cy + 72, barW, 7);
    const defRatio = clamp(def.hp / def.maxHp, 0, 1);
    ctx.fillStyle = defRatio > 0.5 ? '#22c55e' : defRatio > 0.25 ? '#eab308' : '#ef4444';
    ctx.fillRect(barX + 1, cy + 73, (barW - 2) * defRatio, 5);

    cy += cardH + 14;

    // Active Action & Live Roll Resolution Box
    const rollBoxH = 144;
    drawRoundedRect(padX, cy, innerW, rollBoxH, 10);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.35)';
    ctx.stroke();

    ctx.fillStyle = '#fde68a';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(`Action: ${currentTurn.action.name.trim()}`, padX + 12, cy + 22);

    const allAttackSettled = phase !== 'attack_roll';
    const inDamage = phase === 'damage_roll' || phase === 'resolve_pause';
    const allDamageSettled = phase === 'resolve_pause';

    if (currentTurn.kind === 'attack') {
      const modeLabel = currentTurn.rollMode === 'advantage'
        ? '2d20kh1 (Advantage)'
        : currentTurn.rollMode === 'disadvantage'
          ? '2d20kl1 (Disadvantage)'
          : '1d20';
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '12px monospace';
      if (!allAttackSettled) {
        ctx.fillText(`Rolling Attack (${modeLabel}) ${formatSigned(currentTurn.action.atkBonus)} vs AC ${def.ac}...`, padX + 12, cy + 46);
      } else {
        const rawStr = currentTurn.rawRolls.length > 1 ? `[${currentTurn.rawRolls.join(', ')}] → ${currentTurn.chosenRaw}` : `${currentTurn.chosenRaw}`;
        ctx.fillText(`Attack: ${rawStr} ${formatSigned(currentTurn.action.atkBonus)} = ${currentTurn.totalAttack} vs AC ${def.ac}`, padX + 12, cy + 46);

        // Outcome banner
        const bannerText = currentTurn.isCrit
          ? 'NATURAL 20 — CRITICAL HIT! (2× DICE)'
          : currentTurn.isFumble
            ? 'NATURAL 1 — AUTOMATIC MISS'
            : currentTurn.isHit
              ? 'ATTACK HITS!'
              : 'ATTACK MISSES';
        ctx.fillStyle = currentTurn.isCrit ? '#facc15' : currentTurn.isHit ? '#34d399' : '#f87171';
        ctx.font = 'bold 13px monospace';
        ctx.fillText(bannerText, padX + 12, cy + 68);
      }
    } else {
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '12px monospace';
      if (!allAttackSettled) {
        ctx.fillText(`Target rolling ${currentTurn.saveStat} Save vs Spell DC ${currentTurn.dc}...`, padX + 12, cy + 46);
      } else {
        ctx.fillText(`${currentTurn.saveStat} Save: ${currentTurn.chosenRaw} ${formatSigned(currentTurn.saveMod)} = ${currentTurn.totalSave} vs DC ${currentTurn.dc}`, padX + 12, cy + 46);
        ctx.fillStyle = !currentTurn.saveSucceeded ? '#fb923c' : '#38bdf8';
        ctx.font = 'bold 13px monospace';
        ctx.fillText(
          !currentTurn.saveSucceeded
            ? 'SAVING THROW FAILED — FULL DAMAGE'
            : currentTurn.action.halfOnSave
              ? 'SAVING THROW PASSED — HALF DAMAGE'
              : 'SAVING THROW PASSED — EVADED (0 DMG)',
          padX + 12,
          cy + 68
        );
      }
    }

    // Damage Breakdown Line
    if (inDamage && currentTurn.damageRolls.length > 0) {
      const formula = formatDiceFormula(currentTurn.action.dice, currentTurn.action.flatMod, currentTurn.isCrit);
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '12px monospace';
      if (!allDamageSettled) {
        ctx.fillText(`Rolling Damage (${formula}) ${currentTurn.action.dmgType}...`, padX + 12, cy + 96);
      } else {
        const vals = currentTurn.damageRolls.map((r) => r.value).join('+');
        const modPart = currentTurn.action.flatMod ? ` ${formatSigned(currentTurn.action.flatMod)}` : '';
        ctx.fillText(`Dice (${formula}): [${vals}]${modPart}`, padX + 12, cy + 96);
        ctx.fillStyle = '#fde047';
        ctx.font = 'bold 15px monospace';
        ctx.fillText(`Total: ${currentTurn.totalDamage} ${currentTurn.action.dmgType} Damage`, padX + 12, cy + 122);
      }
    } else if (allAttackSettled && !currentTurn.isHit) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px monospace';
      ctx.fillText('No damage rolled.', padX + 12, cy + 96);
    }

    cy += rollBoxH + 16;

    // Active Dice Material Legend
    if (activeDice.length > 0) {
      const matSummary = activeDice
        .slice(0, 3)
        .map((d) => `d${d.sides}: ${d.material.name}`)
        .join(' • ');
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px sans-serif';
      ctx.fillText(matSummary.slice(0, 58), padX, cy);
      cy += 18;
    }

    // Recent Combat Log Feed
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 11px monospace';
    ctx.fillText('ENCOUNTER COMBAT LOG', padX, cy);
    cy += 10;

    const availH = panelY + panelH - cy - 12;
    const rowH = 52;
    const maxRows = Math.max(1, Math.floor(availH / rowH));

    for (let i = 0; i < Math.min(combatLog.length, maxRows); i++) {
      const entry = combatLog[i];
      const ry = cy + i * rowH;
      drawRoundedRect(padX, ry, innerW, rowH - 6, 7);
      ctx.fillStyle = i === 0 ? 'rgba(30, 41, 59, 0.82)' : 'rgba(15, 23, 42, 0.55)';
      ctx.fill();

      ctx.fillStyle = entry.badgeColor;
      ctx.font = 'bold 10px monospace';
      ctx.fillText(`[R${entry.round} ${entry.badge}]`, padX + 8, ry + 16);

      ctx.fillStyle = '#f1f5f9';
      ctx.font = '600 11px sans-serif';
      const titleClip = entry.title.length > 34 ? `${entry.title.slice(0, 33)}…` : entry.title;
      ctx.fillText(titleClip, padX + 108, ry + 16);

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '10px monospace';
      const detClip = entry.detail.length > 52 ? `${entry.detail.slice(0, 51)}…` : entry.detail;
      ctx.fillText(detClip, padX + 8, ry + 34);
    }

    ctx.restore();
  }

  function resize(newW, newH) {
    w = Math.max(1, Math.floor(newW || canvas.clientWidth || 1280));
    h = Math.max(1, Math.floor(newH || canvas.clientHeight || 720));
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
  }

  function render(dtInput) {
    const rawDt = typeof dtInput === 'number' && Number.isFinite(dtInput) ? dtInput : 0.016;
    const params = (typeof getParams === 'function' ? getParams() : null) || {};

    const rollSpeed = clamp(Number(params.rollSpeed) || 1.0, 0.4, 2.5);
    const materialFilter = params.diceMaterial || 'mixed';
    const tableThemeKey = TABLE_THEMES[params.tableTheme] ? params.tableTheme : 'parchment_tavern';
    const cameraSway = params.cameraMode || 'gentle_sway';
    const showHud = params.showHud !== false;

    const dt = clamp(rawDt, 0.001, 0.25) * rollSpeed;
    animClock += dt;

    // Gentle tabletop camera sway or slow orbit
    if (cameraSway === 'orbit') {
      camOrbit = Math.sin(animClock * 0.22) * 0.34;
    } else if (cameraSway === 'locked') {
      camOrbit = 0;
    } else {
      camOrbit = Math.sin(animClock * 0.16) * 0.12;
    }

    // Advance active dice physics
    let allSettled = true;
    for (const d of activeDice) {
      updateDiePhysics(d, dt);
      if (!d.settled) allSettled = false;
    }

    // Advance 5e turn state machine
    if (phase === 'attack_roll') {
      if (allSettled) {
        phase = 'attack_pause';
        phaseTimer = 0;
      }
    } else if (phase === 'attack_pause') {
      phaseTimer += dt;
      if (phaseTimer >= 1.15) {
        if (currentTurn && currentTurn.isHit) {
          spawnDamageRoll(materialFilter);
          phase = 'damage_roll';
          phaseTimer = 0;
        } else {
          commitTurnResolution();
          phase = 'resolve_pause';
          phaseTimer = 0;
        }
      }
    } else if (phase === 'damage_roll') {
      if (allSettled) {
        commitTurnResolution();
        phase = 'resolve_pause';
        phaseTimer = 0;
      }
    } else if (phase === 'resolve_pause') {
      phaseTimer += dt;
      if (phaseTimer >= 2.15) {
        beginNextCombatTurn(materialFilter);
      }
    }

    // Draw scene layers back-to-front
    const theme = TABLE_THEMES[tableThemeKey];
    drawTableAndBattlemat(theme, camOrbit);
    drawTabletopParaphernalia(camOrbit);
    drawMiniatures(camOrbit);

    // Depth-sort active dice so nearer dice occlude farther dice cleanly
    const sortedDice = activeDice.slice().sort((a, b) => {
      const ca = worldToCamera(a.pos, camOrbit);
      const cb = worldToCamera(b.pos, camOrbit);
      return cb.z - ca.z;
    });
    for (const die of sortedDice) {
      drawPolyhedralDie(die, camOrbit);
    }

    if (showHud) {
      drawEncounterWindow();
    }
  }

  function destroy() {
    activeDice = [];
  }

  return { resize, render, destroy };
}
