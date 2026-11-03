// 3D Rotating Abacus Screensaver: Japanese Soroban, Roman Tabula Calculi (Stone Table), & Chinese Suanpan
// Performs the classic "Hyakumanben 123,456,789 × 9 = 1,111,111,101" addition & subtraction drill
// rod-by-rod (or groove-by-groove) with real ripple-carry propagation, 3D Phong lighting,
// carved Roman stone channels with spherical calculi pebbles & chiseled Roman numerals,
// mechanical reset bar sweep (Gohassan), and a live arithmetic ledger HUD.

const ROD_COUNT = 13;
const ADDEND = 123456789;
const ADDEND_DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9]; // From 10^8 down to 10^0
const ADDEND_RODS = [4, 5, 6, 7, 8, 9, 10, 11, 12]; // Indices in 13-rod array (rod 12 is 10^0 units)

// Roman column headers for powers 10^12 down to 10^0 (using vinculum overline notation for thousands/millions)
const ROMAN_COL_LABELS = [
  'M̿̄',
  'C̿̄',
  'X̿̄',
  'M̿',
  'C̿',
  'X̿',
  'M̄',
  'C̄',
  'X̄',
  'M',
  'C',
  'X',
  'I'
];

const ABACUS_STYLES = ['soroban_1_4', 'roman_calculi', 'suanpan_2_5'];

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function formatWithCommas(n) {
  const s = String(Math.max(0, Math.round(n)));
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Convert a large integer into compact Roman numerals with vinculum bars for display in Roman mode
function formatRomanRegister(num) {
  const n = Math.max(0, Math.floor(num));
  if (n === 0) return 'NULLA (0)';

  const digitMap = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];
  const tenMap = ['', 'X', 'XX', 'XXX', 'XL', 'L', 'LX', 'LXX', 'LXXX', 'XC'];
  const hunMap = ['', 'C', 'CC', 'CCC', 'CD', 'D', 'DC', 'DCC', 'DCCC', 'CM'];

  function tripletToRoman(val) {
    const h = Math.floor(val / 100) % 10;
    const t = Math.floor(val / 10) % 10;
    const u = val % 10;
    return hunMap[h] + tenMap[t] + digitMap[u];
  }

  const billions = Math.floor(n / 1000000000);
  const millions = Math.floor(n / 1000000) % 1000;
  const thousands = Math.floor(n / 1000) % 1000;
  const units = n % 1000;

  const parts = [];
  if (billions > 0) parts.push(`[${tripletToRoman(billions)}]̿`);
  if (millions > 0) parts.push(`(${tripletToRoman(millions)})̿`);
  if (thousands > 0) parts.push(`(${tripletToRoman(thousands)})̄`);
  if (units > 0) parts.push(tripletToRoman(units));
  return parts.join(' ');
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

function cross3(a, b) {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x
  };
}

function sub3(a, b) {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function dot3(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

const THEMES = {
  ebony_gold: {
    name: 'Kokutan Ebony & Boxwood Gold',
    bgTop: '#070a12',
    bgBot: '#121826',
    frameMain: { r: 44, g: 29, b: 22 },
    frameRim: { r: 92, g: 62, b: 42 },
    slabMain: { r: 196, g: 184, b: 162 },
    grooveColor: { r: 48, g: 41, b: 34 },
    beamColor: { r: 58, g: 38, b: 28 },
    brassColor: { r: 218, g: 175, b: 82 },
    rodColor: 'rgba(205, 178, 128, 0.85)',
    beadIdleUpper: { r: 194, g: 138, b: 68 },
    beadIdleLower: { r: 182, g: 128, b: 62 },
    beadActiveUpper: { r: 245, g: 188, b: 58 },
    beadActiveLower: { r: 235, g: 168, b: 64 },
    beadCarryGlow: { r: 255, g: 215, b: 90 },
    accentHex: '#f59e0b',
    accentRgb: { r: 245, g: 158, b: 11 }
  },
  carrara_marble: {
    name: 'Roman Carrara Marble & Agate Calculi',
    bgTop: '#090c12',
    bgBot: '#171d29',
    frameMain: { r: 168, g: 160, b: 146 },
    frameRim: { r: 216, g: 208, b: 194 },
    slabMain: { r: 214, g: 207, b: 194 },
    grooveColor: { r: 58, g: 52, b: 45 },
    beamColor: { r: 188, g: 178, b: 162 },
    brassColor: { r: 198, g: 154, b: 78 },
    rodColor: 'rgba(92, 82, 70, 0.9)',
    beadIdleUpper: { r: 64, g: 72, b: 84 },
    beadIdleLower: { r: 78, g: 86, b: 98 },
    beadActiveUpper: { r: 212, g: 102, b: 58 },
    beadActiveLower: { r: 218, g: 165, b: 72 },
    beadCarryGlow: { r: 253, g: 224, b: 71 },
    accentHex: '#f59e0b',
    accentRgb: { r: 245, g: 158, b: 11 }
  },
  jade_lacquer: {
    name: 'Imperial Vermilion & Nephrite Jade',
    bgTop: '#06110e',
    bgBot: '#0d211b',
    frameMain: { r: 108, g: 22, b: 24 },
    frameRim: { r: 158, g: 38, b: 36 },
    slabMain: { r: 142, g: 168, b: 152 },
    grooveColor: { r: 28, g: 48, b: 40 },
    beamColor: { r: 126, g: 28, b: 28 },
    brassColor: { r: 232, g: 192, b: 92 },
    rodColor: 'rgba(226, 198, 115, 0.85)',
    beadIdleUpper: { r: 46, g: 138, b: 106 },
    beadIdleLower: { r: 42, g: 126, b: 96 },
    beadActiveUpper: { r: 82, g: 232, b: 172 },
    beadActiveLower: { r: 64, g: 208, b: 152 },
    beadCarryGlow: { r: 167, g: 243, b: 208 },
    accentHex: '#10b981',
    accentRgb: { r: 16, g: 185, b: 129 }
  },
  cyber_obsidian: {
    name: 'Cyber Obsidian & Neon Cyan',
    bgTop: '#040711',
    bgBot: '#091326',
    frameMain: { r: 22, g: 34, b: 56 },
    frameRim: { r: 56, g: 189, b: 248 },
    slabMain: { r: 26, g: 38, b: 62 },
    grooveColor: { r: 10, g: 16, b: 30 },
    beamColor: { r: 30, g: 48, b: 78 },
    brassColor: { r: 56, g: 189, b: 248 },
    rodColor: 'rgba(56, 189, 248, 0.72)',
    beadIdleUpper: { r: 52, g: 78, b: 120 },
    beadIdleLower: { r: 44, g: 68, b: 108 },
    beadActiveUpper: { r: 232, g: 121, b: 249 },
    beadActiveLower: { r: 56, g: 189, b: 248 },
    beadCarryGlow: { r: 244, g: 114, b: 182 },
    accentHex: '#38bdf8',
    accentRgb: { r: 56, g: 189, b: 248 }
  },
  rosewood_ivory: {
    name: 'Vintage Rosewood & Carved Ivory',
    bgTop: '#0c0908',
    bgBot: '#1c1412',
    frameMain: { r: 74, g: 32, b: 28 },
    frameRim: { r: 122, g: 58, b: 48 },
    slabMain: { r: 182, g: 162, b: 138 },
    grooveColor: { r: 52, g: 32, b: 26 },
    beamColor: { r: 92, g: 42, b: 36 },
    brassColor: { r: 204, g: 148, b: 96 },
    rodColor: 'rgba(188, 142, 104, 0.85)',
    beadIdleUpper: { r: 202, g: 188, b: 164 },
    beadIdleLower: { r: 192, g: 178, b: 154 },
    beadActiveUpper: { r: 248, g: 240, b: 220 },
    beadActiveLower: { r: 240, g: 228, b: 204 },
    beadCarryGlow: { r: 253, g: 224, b: 71 },
    accentHex: '#fbbf24',
    accentRgb: { r: 251, g: 191, b: 36 }
  }
};

// Build a 3D box mesh (8 vertices, 6 quad faces) from min/max coordinates
function createBoxFaces(x0, y0, z0, x1, y1, z1, color, tag = 'frame') {
  const v = [
    { x: x0, y: y0, z: z0 }, // 0
    { x: x1, y: y0, z: z0 }, // 1
    { x: x1, y: y1, z: z0 }, // 2
    { x: x0, y: y1, z: z0 }, // 3
    { x: x0, y: y0, z: z1 }, // 4
    { x: x1, y: y0, z: z1 }, // 5
    { x: x1, y: y1, z: z1 }, // 6
    { x: x0, y: y1, z: z1 }  // 7
  ];
  const quads = [
    [4, 5, 6, 7], // front (+z)
    [1, 0, 3, 2], // back (-z)
    [3, 7, 6, 2], // top (+y)
    [0, 1, 5, 4], // bottom (-y)
    [0, 4, 7, 3], // left (-x)
    [5, 1, 2, 6]  // right (+x)
  ];
  return quads.map((q) => ({
    verts: q.map((idx) => v[idx]),
    color,
    tag
  }));
}

// Create a 3D bead or Roman spherical calculus pebble mesh
function createBeadFaces(cx, cy, cz, radius, halfHeight, style, color, glowAmount = 0) {
  const segs = 10;
  const faces = [];

  if (style === 'roman_calculi') {
    // Smooth rounded river-pebble / polished stone sphere sitting in the carved stone groove
    const rings = [
      { yOff: -halfHeight * 0.95, rScale: 0.32, zOff: -radius * 0.15 },
      { yOff: -halfHeight * 0.52, rScale: 0.84, zOff: 0.02 },
      { yOff: 0, rScale: 1.0, zOff: 0.08 },
      { yOff: halfHeight * 0.52, rScale: 0.84, zOff: 0.02 },
      { yOff: halfHeight * 0.95, rScale: 0.32, zOff: -radius * 0.15 }
    ];
    for (let r = 0; r < rings.length - 1; r++) {
      const r0 = rings[r];
      const r1 = rings[r + 1];
      for (let i = 0; i < segs; i++) {
        const a0 = (i / segs) * Math.PI * 2;
        const a1 = ((i + 1) / segs) * Math.PI * 2;
        const c0 = Math.cos(a0);
        const s0 = Math.sin(a0);
        const c1 = Math.cos(a1);
        const s1 = Math.sin(a1);
        faces.push({
          verts: [
            { x: cx + radius * r0.rScale * c0, y: cy + r0.yOff, z: cz + r0.zOff + radius * 0.72 * r0.rScale * s0 },
            { x: cx + radius * r0.rScale * c1, y: cy + r0.yOff, z: cz + r0.zOff + radius * 0.72 * r0.rScale * s1 },
            { x: cx + radius * r1.rScale * c1, y: cy + r1.yOff, z: cz + r1.zOff + radius * 0.72 * r1.rScale * s1 },
            { x: cx + radius * r1.rScale * c0, y: cy + r1.yOff, z: cz + r1.zOff + radius * 0.72 * r1.rScale * s0 }
          ],
          color,
          glowAmount,
          tag: 'bead'
        });
      }
    }
    return faces;
  }

  if (style === 'suanpan_2_5') {
    // 3-ring rounded oblate bead
    const rings = [
      { yOff: -halfHeight * 0.92, rScale: 0.42 },
      { yOff: -halfHeight * 0.42, rScale: 0.92 },
      { yOff: 0, rScale: 1.0 },
      { yOff: halfHeight * 0.42, rScale: 0.92 },
      { yOff: halfHeight * 0.92, rScale: 0.42 }
    ];
    for (let r = 0; r < rings.length - 1; r++) {
      const r0 = rings[r];
      const r1 = rings[r + 1];
      for (let i = 0; i < segs; i++) {
        const a0 = (i / segs) * Math.PI * 2;
        const a1 = ((i + 1) / segs) * Math.PI * 2;
        const c0 = Math.cos(a0);
        const s0 = Math.sin(a0);
        const c1 = Math.cos(a1);
        const s1 = Math.sin(a1);
        faces.push({
          verts: [
            { x: cx + radius * r0.rScale * c0, y: cy + r0.yOff, z: cz + radius * r0.rScale * s0 },
            { x: cx + radius * r0.rScale * c1, y: cy + r0.yOff, z: cz + radius * r0.rScale * s1 },
            { x: cx + radius * r1.rScale * c1, y: cy + r1.yOff, z: cz + radius * r1.rScale * s1 },
            { x: cx + radius * r1.rScale * c0, y: cy + r1.yOff, z: cz + radius * r1.rScale * s0 }
          ],
          color,
          glowAmount,
          tag: 'bead'
        });
      }
    }
    return faces;
  }

  // Sharp Japanese Soroban double-cone (hishi-dama) with narrow top/bottom collar
  const topY = cy + halfHeight;
  const midY = cy;
  const botY = cy - halfHeight;
  const neckR = radius * 0.28;

  for (let i = 0; i < segs; i++) {
    const a0 = (i / segs) * Math.PI * 2;
    const a1 = ((i + 1) / segs) * Math.PI * 2;
    const c0 = Math.cos(a0);
    const s0 = Math.sin(a0);
    const c1 = Math.cos(a1);
    const s1 = Math.sin(a1);

    faces.push({
      verts: [
        { x: cx + radius * c0, y: midY, z: cz + radius * s0 },
        { x: cx + radius * c1, y: midY, z: cz + radius * s1 },
        { x: cx + neckR * c1, y: topY, z: cz + neckR * s1 },
        { x: cx + neckR * c0, y: topY, z: cz + neckR * s0 }
      ],
      color,
      glowAmount,
      tag: 'bead'
    });

    faces.push({
      verts: [
        { x: cx + neckR * c0, y: botY, z: cz + neckR * s0 },
        { x: cx + neckR * c1, y: botY, z: cz + neckR * s1 },
        { x: cx + radius * c1, y: midY, z: cz + radius * s1 },
        { x: cx + radius * c0, y: midY, z: cz + radius * s0 }
      ],
      color,
      glowAmount,
      tag: 'bead'
    });
  }

  return faces;
}

export function createSoroban3D(canvas, getParams) {
  const ctx = canvas.getContext('2d');
  let width = canvas.width || 1280;
  let height = canvas.height || 720;

  let simTime = 0;

  // Logical digit value (0..9) on each of the 13 rods/grooves (index 0 = 10^12, index 12 = 10^0)
  const rodDigits = new Array(ROD_COUNT).fill(0);
  const rodGlow = new Array(ROD_COUNT).fill(0);
  const carryRipples = [];

  // Smoothly interpolated bead/stone positions per rod/groove:
  // upperBeadPos[rod][b] in [0 (away/up), 1 (pushed down toward divider)]
  // lowerBeadPos[rod][b] in [0 (away/down), 1 (pushed up toward divider)]
  const upperBeadPos = Array.from({ length: ROD_COUNT }, () => [0, 0]);
  const lowerBeadPos = Array.from({ length: ROD_COUNT }, () => [0, 0, 0, 0, 0]);

  // Drill state machine
  let lastDrillMode = '';
  let cycleStyleIdx = 0;
  let passIndex = 1; // 1..9
  let direction = 1; // +1 = adding 123,456,789; -1 = subtracting 123,456,789
  let rodCursor = 0; // 0..8 index into ADDEND_DIGITS
  let stepTimer = 0;
  let phase = 'adding_rods'; // 'adding_rods' | 'milestone_pause' | 'sweeping_reset'
  let sweepProgress = 0;
  let currentTotal = 0;
  let lastActionDesc = 'Initializing 123,456,789 × 9 drill...';

  // Fibonacci drill state
  let fibA = 1;
  let fibB = 1;
  let fibDigitsQueue = [];

  // Ambient dust particles
  const motes = [];
  for (let i = 0; i < 42; i++) {
    motes.push({
      x: Math.sin(i * 17.3) * 8.5,
      y: Math.cos(i * 29.1) * 4.8,
      z: Math.sin(i * 43.7) * 3.5,
      r: 1.0 + (i % 3) * 0.55
    });
  }

  function setNumberOnRods(val) {
    let rem = Math.max(0, Math.floor(val));
    for (let i = ROD_COUNT - 1; i >= 0; i--) {
      rodDigits[i] = rem % 10;
      rem = Math.floor(rem / 10);
    }
    currentTotal = Math.max(0, Math.floor(val));
  }

  function syncTotalFromRods() {
    let total = 0;
    for (let i = 0; i < ROD_COUNT; i++) {
      total = total * 10 + (rodDigits[i] || 0);
    }
    currentTotal = total;
  }

  function spawnCarryRipple(rodIdx, isCarry) {
    carryRipples.push({
      rodIdx,
      age: 0,
      maxAge: isCarry ? 0.85 : 0.45,
      isCarry
    });
    if (carryRipples.length > 24) {
      carryRipples.shift();
    }
  }

  // Apply +delta or -delta to a specific rod/groove index with authentic ripple carries/borrows
  function addDeltaToRod(rodIdx, delta) {
    if (rodIdx < 0 || rodIdx >= ROD_COUNT || delta === 0) return 0;

    let carriesCount = 0;
    if (delta > 0) {
      let idx = rodIdx;
      let carry = delta;
      while (idx >= 0 && carry > 0) {
        const prev = rodDigits[idx];
        const sum = prev + carry;
        rodDigits[idx] = sum % 10;
        rodGlow[idx] = 1.0;
        carry = Math.floor(sum / 10);
        if (carry > 0) {
          carriesCount++;
          spawnCarryRipple(idx, true);
        } else {
          spawnCarryRipple(idx, false);
        }
        idx--;
      }
    } else {
      let idx = rodIdx;
      let borrow = -delta;
      while (idx >= 0 && borrow > 0) {
        const prev = rodDigits[idx];
        if (prev >= borrow) {
          rodDigits[idx] = prev - borrow;
          rodGlow[idx] = 1.0;
          spawnCarryRipple(idx, false);
          borrow = 0;
        } else {
          rodDigits[idx] = prev + 10 - borrow;
          rodGlow[idx] = 1.0;
          carriesCount++;
          spawnCarryRipple(idx, true);
          borrow = 1;
        }
        idx--;
      }
    }
    syncTotalFromRods();
    return carriesCount;
  }

  function resetDrill(mode) {
    rodDigits.fill(0);
    rodGlow.fill(0);
    carryRipples.length = 0;
    passIndex = 1;
    direction = 1;
    rodCursor = 0;
    stepTimer = 0;
    phase = 'adding_rods';
    sweepProgress = 0;
    currentTotal = 0;
    fibA = 1;
    fibB = 1;
    fibDigitsQueue = [];
    lastActionDesc =
      mode === 'complement_987654321'
        ? 'Repunit Complement Drill: +123,456,789 + 987,654,321 = 1,111,111,110'
        : mode === 'fibonacci_cascade'
        ? 'Fibonacci Golden Ratio Abacus Cascade initialized'
        : 'Pass 1 / 9: Adding +123,456,789 column-by-column...';
  }

  function stepDrillLogic(drillMode, isAutoCycleStyle) {
    if (phase === 'milestone_pause') {
      if (drillMode === 'hyakumanben_add_sub') {
        if (direction === 1) {
          direction = -1;
          passIndex = 1;
          rodCursor = 0;
          phase = 'adding_rods';
          lastActionDesc = 'Milestone 1,111,111,101 reached! Reversing: −123,456,789 × 9 back to 0...';
        } else {
          phase = 'sweeping_reset';
          sweepProgress = 0;
          lastActionDesc = 'Zero verified! Sweeping board clean...';
        }
      } else {
        phase = 'sweeping_reset';
        sweepProgress = 0;
        lastActionDesc = 'Sweeping clear bar across columns...';
      }
      return;
    }

    if (phase === 'sweeping_reset') {
      if (isAutoCycleStyle) {
        cycleStyleIdx = (cycleStyleIdx + 1) % ABACUS_STYLES.length;
      }
      resetDrill(drillMode);
      return;
    }

    if (drillMode === 'fibonacci_cascade') {
      if (fibDigitsQueue.length === 0) {
        const nextFib = fibA + fibB;
        if (nextFib > 999999999999) {
          phase = 'milestone_pause';
          lastActionDesc = `Fibonacci overflow limit (${formatWithCommas(currentTotal)}) — pausing before reset`;
          return;
        }
        setNumberOnRods(fibB);
        const s = String(fibA);
        fibDigitsQueue = [];
        for (let i = 0; i < s.length; i++) {
          const d = Number(s[i]);
          const rIdx = ROD_COUNT - s.length + i;
          if (d > 0) fibDigitsQueue.push({ rIdx, d, nextFib });
        }
        fibA = fibB;
        fibB = nextFib;
        if (fibDigitsQueue.length === 0) return;
      }
      const item = fibDigitsQueue.shift();
      const carries = addDeltaToRod(item.rIdx, item.d);
      const power = ROD_COUNT - 1 - item.rIdx;
      lastActionDesc = `Fibonacci F_n: Col 10^${power} +${item.d}${carries > 0 ? ` (${carries} carry ripple)` : ''} → ${formatWithCommas(currentTotal)}`;
      return;
    }

    const activeVector =
      drillMode === 'complement_987654321' && passIndex % 2 === 0
        ? [9, 8, 7, 6, 5, 4, 3, 2, 1]
        : ADDEND_DIGITS;

    const digit = activeVector[rodCursor];
    const targetRod = ADDEND_RODS[rodCursor];
    const signedDelta = direction * digit;
    const carries = addDeltaToRod(targetRod, signedDelta);
    const power = ROD_COUNT - 1 - targetRod;

    const opSym = direction > 0 ? '+' : '−';
    const carryNote =
      carries > 0
        ? direction > 0
          ? ` [Carry ×${carries}!]`
          : ` [Borrow ×${carries}!]`
        : '';

    lastActionDesc = `Pass ${passIndex}/${drillMode === 'complement_987654321' ? 2 : 9} • Col 10^${power} (${ROMAN_COL_LABELS[targetRod]}): ${opSym}${digit}${carryNote}  ⇒  ${formatWithCommas(currentTotal)}`;

    rodCursor++;
    if (rodCursor >= ADDEND_DIGITS.length) {
      rodCursor = 0;
      const maxPasses = drillMode === 'complement_987654321' ? 2 : 9;
      if (passIndex >= maxPasses) {
        phase = 'milestone_pause';
        if (drillMode === 'complement_987654321') {
          lastActionDesc = `Repunit Complete: 123,456,789 + 987,654,321 = ${formatWithCommas(currentTotal)}!`;
        } else if (direction > 0) {
          lastActionDesc = `★ 123,456,789 × 9 = ${formatWithCommas(currentTotal)} (All 1s + 01 Milestone Reached!) ★`;
        } else {
          lastActionDesc = `★ 1,111,111,101 − (123,456,789 × 9) = ${formatWithCommas(currentTotal)} (Exact Zero Return!) ★`;
        }
      } else {
        passIndex++;
      }
    }
  }

  function updateBeadPhysics(dt) {
    const smooth = clamp(dt * 14.0, 0.08, 0.65);

    for (let r = 0; r < ROD_COUNT; r++) {
      rodGlow[r] = Math.max(0, rodGlow[r] - dt * 1.65);

      const d = rodDigits[r] || 0;
      const targetUpper0 = d >= 5 ? 1 : 0;
      const targetUpper1 = 0;
      const activeLowerCount = d % 5;

      upperBeadPos[r][0] = lerp(upperBeadPos[r][0], targetUpper0, smooth);
      upperBeadPos[r][1] = lerp(upperBeadPos[r][1], targetUpper1, smooth);

      for (let b = 0; b < 5; b++) {
        const targetL = b < activeLowerCount ? 1 : 0;
        lowerBeadPos[r][b] = lerp(lowerBeadPos[r][b], targetL, smooth);
      }
    }

    for (let i = carryRipples.length - 1; i >= 0; i--) {
      carryRipples[i].age += dt;
      if (carryRipples[i].age >= carryRipples[i].maxAge) {
        carryRipples.splice(i, 1);
      }
    }
  }

  function projectPoint(p3, yaw, pitch, roll, camDist, fovScale) {
    const r = rotate3D(p3, yaw, pitch, roll);
    const zCam = camDist - r.z;
    if (zCam <= 0.4) return null;
    const persp = fovScale / zCam;
    return {
      x: width * 0.5 + r.x * persp,
      y: height * 0.47 - r.y * persp,
      z: r.z,
      zCam,
      persp,
      r3: r
    };
  }

  function drawBackground(theme) {
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, theme.bgTop);
    grad.addColorStop(1, theme.bgBot);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    const radial = ctx.createRadialGradient(
      width * 0.5,
      height * 0.46,
      10,
      width * 0.5,
      height * 0.46,
      Math.max(width, height) * 0.62
    );
    const { r, g, b } = theme.accentRgb;
    radial.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.12)`);
    radial.addColorStop(0.55, `rgba(${r}, ${g}, ${b}, 0.03)`);
    radial.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, width, height);
  }

  function renderAbacus3D(abacusStyle, theme, yaw, pitch, roll, fovScale) {
    const camDist = 13.8;
    const lightDir = normalize3({ x: -0.38, y: 0.68, z: 0.62 });
    const viewDir = { x: 0, y: 0, z: 1 };

    const isSuanpan = abacusStyle === 'suanpan_2_5';
    const isRoman = abacusStyle === 'roman_calculi';

    const rodSpacing = 0.76;
    const halfSpanX = ((ROD_COUNT - 1) * rodSpacing) / 2;
    const innerHalfW = halfSpanX + 0.68;
    const outerHalfW = innerHalfW + 0.38;

    const topInnerY = isSuanpan ? 2.55 : isRoman ? 2.35 : 2.22;
    const botInnerY = isSuanpan ? -2.95 : isRoman ? -2.72 : -2.62;
    const outerTopY = topInnerY + 0.36;
    const outerBotY = botInnerY - 0.36;
    const beamY = isRoman ? 0.62 : 0.72;
    const beamHalfH = isRoman ? 0.28 : 0.14;
    const frameHalfZ = 0.36;

    const beadRadius = isRoman ? 0.25 : 0.31;
    const beadHalfH = isSuanpan ? 0.19 : isRoman ? 0.21 : 0.21;

    const drawList = [];
    const frameBoxes = [];

    if (isRoman) {
      // ROMAN ABACUS (Tabula Calculi): Carved Stone/Marble Counting Table with Recessed Sulci Grooves
      // Solid carved stone tablet body + beveled outer border rails
      frameBoxes.push(
        // Main stone tablet slab
        ...createBoxFaces(
          -outerHalfW,
          outerBotY,
          -frameHalfZ,
          outerHalfW,
          outerTopY,
          frameHalfZ * 0.45,
          theme.slabMain,
          'slab'
        ),
        // Raised outer stone border molding
        ...createBoxFaces(-outerHalfW, topInnerY, frameHalfZ * 0.45, outerHalfW, outerTopY, frameHalfZ * 0.85, theme.frameMain, 'frame'),
        ...createBoxFaces(-outerHalfW, outerBotY, frameHalfZ * 0.45, outerHalfW, botInnerY, frameHalfZ * 0.85, theme.frameMain, 'frame'),
        ...createBoxFaces(-outerHalfW, outerBotY, frameHalfZ * 0.45, -innerHalfW, outerTopY, frameHalfZ * 0.85, theme.frameMain, 'frame'),
        ...createBoxFaces(innerHalfW, outerBotY, frameHalfZ * 0.45, outerHalfW, outerTopY, frameHalfZ * 0.85, theme.frameMain, 'frame'),
        // Central Roman numeral inscription bridge separating upper (5-value) and lower (1-value) grooves
        ...createBoxFaces(
          -innerHalfW,
          beamY - beamHalfH,
          frameHalfZ * 0.45,
          innerHalfW,
          beamY + beamHalfH,
          frameHalfZ * 0.76,
          theme.beamColor,
          'beam'
        ),
        // Corner bronze/brass medallions
        ...createBoxFaces(-outerHalfW - 0.02, outerTopY - 0.45, -frameHalfZ - 0.01, -innerHalfW + 0.22, outerTopY + 0.02, frameHalfZ * 0.9, theme.brassColor, 'brass'),
        ...createBoxFaces(innerHalfW - 0.22, outerTopY - 0.45, -frameHalfZ - 0.01, outerHalfW + 0.02, outerTopY + 0.02, frameHalfZ * 0.9, theme.brassColor, 'brass'),
        ...createBoxFaces(-outerHalfW - 0.02, outerBotY - 0.02, -frameHalfZ - 0.01, -innerHalfW + 0.22, outerBotY + 0.45, frameHalfZ * 0.9, theme.brassColor, 'brass'),
        ...createBoxFaces(innerHalfW - 0.22, outerBotY - 0.02, -frameHalfZ - 0.01, outerHalfW + 0.02, outerBotY + 0.45, frameHalfZ * 0.9, theme.brassColor, 'brass')
      );
    } else {
      // SOROBAN / SUANPAN: Open Wooden Mortise-and-Tenon Frame + Reckoning Beam (Hari)
      frameBoxes.push(
        ...createBoxFaces(-outerHalfW, topInnerY, -frameHalfZ, outerHalfW, outerTopY, frameHalfZ, theme.frameMain, 'frame'),
        ...createBoxFaces(-outerHalfW, outerBotY, -frameHalfZ, outerHalfW, botInnerY, frameHalfZ, theme.frameMain, 'frame'),
        ...createBoxFaces(-outerHalfW, outerBotY, -frameHalfZ, -innerHalfW, outerTopY, frameHalfZ, theme.frameMain, 'frame'),
        ...createBoxFaces(innerHalfW, outerBotY, -frameHalfZ, outerHalfW, outerTopY, frameHalfZ, theme.frameMain, 'frame'),
        ...createBoxFaces(
          -innerHalfW,
          beamY - beamHalfH,
          -frameHalfZ * 0.88,
          innerHalfW,
          beamY + beamHalfH,
          frameHalfZ * 0.88,
          theme.beamColor,
          'beam'
        ),
        ...createBoxFaces(-outerHalfW - 0.02, outerTopY - 0.55, -frameHalfZ - 0.02, -innerHalfW + 0.32, outerTopY + 0.02, frameHalfZ + 0.02, theme.brassColor, 'brass'),
        ...createBoxFaces(innerHalfW - 0.32, outerTopY - 0.55, -frameHalfZ - 0.02, outerHalfW + 0.02, outerTopY + 0.02, frameHalfZ + 0.02, theme.brassColor, 'brass'),
        ...createBoxFaces(-outerHalfW - 0.02, outerBotY - 0.02, -frameHalfZ - 0.02, -innerHalfW + 0.32, outerBotY + 0.55, frameHalfZ + 0.02, theme.brassColor, 'brass'),
        ...createBoxFaces(innerHalfW - 0.32, outerBotY - 0.02, -frameHalfZ - 0.02, outerHalfW + 0.02, outerBotY + 0.55, frameHalfZ + 0.02, theme.brassColor, 'brass')
      );
    }

    // If sweeping mechanical reset bar (Gohassan), render the moving brass sweep bar
    if (phase === 'sweeping_reset') {
      const sweepX = lerp(-innerHalfW + 0.15, innerHalfW - 0.15, sweepProgress);
      frameBoxes.push(
        ...createBoxFaces(
          sweepX - 0.12,
          botInnerY,
          -frameHalfZ * 0.95,
          sweepX + 0.12,
          topInnerY,
          frameHalfZ * 0.95,
          theme.brassColor,
          'brass'
        )
      );
    }

    // 2. Beads / Calculi Stones on all 13 columns
    const upperCount = isSuanpan ? 2 : 1;
    const lowerCount = isSuanpan ? 5 : 4;
    const beadZ = isRoman ? frameHalfZ * 0.58 : 0;

    for (let r = 0; r < ROD_COUNT; r++) {
      const rx = -halfSpanX + r * rodSpacing;
      const digit = rodDigits[r] || 0;
      const glow = rodGlow[r] || 0;

      // Upper deck beads / calculi stones (value 5)
      for (let b = 0; b < upperCount; b++) {
        const restY = topInnerY - beadHalfH * 1.2 - (upperCount - 1 - b) * (beadHalfH * 2.12);
        const activeY = beamY + beamHalfH + beadHalfH * 1.15 + b * (beadHalfH * 2.12);
        const t = upperBeadPos[r][b] || 0;
        const by = lerp(restY, activeY, t);
        const isActive = t > 0.45;
        const baseCol = isActive ? theme.beadActiveUpper : theme.beadIdleUpper;
        const col = {
          r: Math.round(lerp(baseCol.r, theme.beadCarryGlow.r, glow * 0.65)),
          g: Math.round(lerp(baseCol.g, theme.beadCarryGlow.g, glow * 0.65)),
          b: Math.round(lerp(baseCol.b, theme.beadCarryGlow.b, glow * 0.65))
        };
        const beadMesh = createBeadFaces(rx, by, beadZ, beadRadius, beadHalfH, abacusStyle, col, glow);
        for (let f = 0; f < beadMesh.length; f++) {
          frameBoxes.push(beadMesh[f]);
        }
      }

      // Lower deck beads / calculi stones (value 1)
      for (let b = 0; b < lowerCount; b++) {
        const activeY = beamY - beamHalfH - beadHalfH * 1.15 - b * (beadHalfH * 2.12);
        const restY = botInnerY + beadHalfH * 1.2 + (lowerCount - 1 - b) * (beadHalfH * 2.12);
        const t = lowerBeadPos[r][b] || 0;
        const by = lerp(restY, activeY, t);
        const isActive = t > 0.45;
        const baseCol = isActive ? theme.beadActiveLower : theme.beadIdleLower;
        const col = {
          r: Math.round(lerp(baseCol.r, theme.beadCarryGlow.r, glow * 0.65)),
          g: Math.round(lerp(baseCol.g, theme.beadCarryGlow.g, glow * 0.65)),
          b: Math.round(lerp(baseCol.b, theme.beadCarryGlow.b, glow * 0.65))
        };
        const beadMesh = createBeadFaces(rx, by, beadZ, beadRadius, beadHalfH, abacusStyle, col, glow);
        for (let f = 0; f < beadMesh.length; f++) {
          frameBoxes.push(beadMesh[f]);
        }
      }

      if (isRoman) {
        // Recessed upper groove (sulcus) and lower groove carved into the stone table
        const uTop = projectPoint({ x: rx, y: topInnerY - 0.16, z: frameHalfZ * 0.48 }, yaw, pitch, roll, camDist, fovScale);
        const uBot = projectPoint({ x: rx, y: beamY + beamHalfH + 0.16, z: frameHalfZ * 0.48 }, yaw, pitch, roll, camDist, fovScale);
        const lTop = projectPoint({ x: rx, y: beamY - beamHalfH - 0.16, z: frameHalfZ * 0.48 }, yaw, pitch, roll, camDist, fovScale);
        const lBot = projectPoint({ x: rx, y: botInnerY + 0.16, z: frameHalfZ * 0.48 }, yaw, pitch, roll, camDist, fovScale);
        if (uTop && uBot && lTop && lBot) {
          drawList.push({
            kind: 'roman_groove',
            zSort: (uTop.z + lBot.z) * 0.5 - 0.04,
            uTop,
            uBot,
            lTop,
            lBot,
            glow
          });
        }
      } else {
        const pTop = projectPoint({ x: rx, y: topInnerY, z: 0 }, yaw, pitch, roll, camDist, fovScale);
        const pBot = projectPoint({ x: rx, y: botInnerY, z: 0 }, yaw, pitch, roll, camDist, fovScale);
        if (pTop && pBot) {
          drawList.push({
            kind: 'rod',
            zSort: (pTop.z + pBot.z) * 0.5 - 0.08,
            pTop,
            pBot,
            rodIdx: r,
            digit,
            glow
          });
        }
      }
    }

    // Project all 3D faces and compute lighting
    for (let i = 0; i < frameBoxes.length; i++) {
      const face = frameBoxes[i];
      const projVerts = [];
      let zSum = 0;
      let valid = true;

      for (let k = 0; k < face.verts.length; k++) {
        const pp = projectPoint(face.verts[k], yaw, pitch, roll, camDist, fovScale);
        if (!pp) {
          valid = false;
          break;
        }
        projVerts.push(pp);
        zSum += pp.z;
      }
      if (!valid) continue;

      const e1 = sub3(projVerts[1].r3, projVerts[0].r3);
      const e2 = sub3(projVerts[2].r3, projVerts[0].r3);
      let normal = normalize3(cross3(e1, e2));
      if (normal.z < 0) {
        normal = { x: -normal.x, y: -normal.y, z: -normal.z };
      }

      const diff = Math.max(0, dot3(normal, lightDir));
      const halfVec = normalize3({
        x: lightDir.x + viewDir.x,
        y: lightDir.y + viewDir.y,
        z: lightDir.z + viewDir.z
      });
      const spec = Math.pow(Math.max(0, dot3(normal, halfVec)), face.tag === 'brass' ? 28 : 18);

      const ambient = face.tag === 'frame' || face.tag === 'slab' ? 0.44 : 0.48;
      const lit = ambient + diff * 0.56;
      const specAdd = (face.tag === 'bead' ? 52 : face.tag === 'brass' ? 68 : 18) * spec;

      const r = clamp(Math.round(face.color.r * lit + specAdd), 0, 255);
      const g = clamp(Math.round(face.color.g * lit + specAdd), 0, 255);
      const b = clamp(Math.round(face.color.b * lit + specAdd), 0, 255);

      // Push slab slightly back in painter sort so recessed grooves & stones always render in front of the stone table face
      const zBias = face.tag === 'slab' ? -0.18 : 0;

      drawList.push({
        kind: 'face',
        zSort: zSum / projVerts.length + zBias,
        projVerts,
        fill: `rgb(${r}, ${g}, ${b})`,
        stroke:
          face.tag === 'bead'
            ? `rgba(15, 23, 42, 0.34)`
            : `rgba(${theme.frameRim.r}, ${theme.frameRim.g}, ${theme.frameRim.b}, 0.28)`
      });
    }

    // Painter's algorithm sort (back to front)
    drawList.sort((a, b) => a.zSort - b.zSort);

    for (let i = 0; i < drawList.length; i++) {
      const item = drawList[i];
      if (item.kind === 'rod') {
        ctx.save();
        ctx.strokeStyle = item.glow > 0.15 ? theme.accentHex : theme.rodColor;
        ctx.lineWidth = Math.max(1.6, item.pTop.persp * 0.055);
        ctx.beginPath();
        ctx.moveTo(item.pTop.x, item.pTop.y);
        ctx.lineTo(item.pBot.x, item.pBot.y);
        ctx.stroke();
        ctx.restore();
      } else if (item.kind === 'roman_groove') {
        ctx.save();
        ctx.lineCap = 'round';
        const grooveW = Math.max(4.0, item.uTop.persp * 0.19);
        const { r, g, b } = theme.grooveColor;
        // Outer carved bevel highlight
        ctx.strokeStyle = item.glow > 0.18 ? theme.accentHex : 'rgba(255, 255, 255, 0.22)';
        ctx.lineWidth = grooveW + 2.2;
        ctx.beginPath();
        ctx.moveTo(item.uTop.x, item.uTop.y);
        ctx.lineTo(item.uBot.x, item.uBot.y);
        ctx.moveTo(item.lTop.x, item.lTop.y);
        ctx.lineTo(item.lBot.x, item.lBot.y);
        ctx.stroke();

        // Deep carved stone groove interior
        ctx.strokeStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.lineWidth = grooveW;
        ctx.beginPath();
        ctx.moveTo(item.uTop.x, item.uTop.y);
        ctx.lineTo(item.uBot.x, item.uBot.y);
        ctx.moveTo(item.lTop.x, item.lTop.y);
        ctx.lineTo(item.lBot.x, item.lBot.y);
        ctx.stroke();
        ctx.restore();
      } else {
        const pv = item.projVerts;
        ctx.beginPath();
        ctx.moveTo(pv[0].x, pv[0].y);
        for (let k = 1; k < pv.length; k++) {
          ctx.lineTo(pv[k].x, pv[k].y);
        }
        ctx.closePath();
        ctx.fillStyle = item.fill;
        ctx.fill();
        ctx.strokeStyle = item.stroke;
        ctx.lineWidth = 0.65;
        ctx.stroke();
      }
    }

    // 3. Draw Teii-ten dots OR Chiseled Roman Numeral Column Headers on the Divider Bridge,
    // plus floating 3D per-column digit readouts below the bottom rail
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const activeTargetRod = phase === 'adding_rods' ? ADDEND_RODS[rodCursor] : -1;

    for (let r = 0; r < ROD_COUNT; r++) {
      const rx = -halfSpanX + r * rodSpacing;
      const power = ROD_COUNT - 1 - r;

      if (isRoman) {
        // Chiseled Roman numeral symbol on the stone divider bridge
        const romPt = projectPoint(
          { x: rx, y: beamY, z: frameHalfZ * 0.82 },
          yaw,
          pitch,
          roll,
          camDist,
          fovScale
        );
        if (romPt) {
          const romPx = Math.round(clamp(romPt.persp * 0.19, 9, 16));
          ctx.font = `700 ${romPx}px "Cinzel", "Times New Roman", serif`;
          ctx.fillStyle = r === activeTargetRod ? theme.accentHex : 'rgba(28, 25, 23, 0.92)';
          ctx.fillText(ROMAN_COL_LABELS[r], romPt.x, romPt.y);
        }
      } else if (power % 3 === 0) {
        // Unit marker dot on the front of the reckoning beam every 3 decimal places
        const dotPt = projectPoint(
          { x: rx, y: beamY, z: frameHalfZ * 0.92 },
          yaw,
          pitch,
          roll,
          camDist,
          fovScale
        );
        if (dotPt) {
          ctx.fillStyle = '#f8fafc';
          ctx.beginPath();
          ctx.arc(dotPt.x, dotPt.y, Math.max(2.2, dotPt.persp * 0.045), 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Floating 3D digit readout beneath each column
      const labelPt = projectPoint(
        { x: rx, y: outerBotY - 0.44, z: 0 },
        yaw,
        pitch,
        roll,
        camDist,
        fovScale
      );
      if (labelPt) {
        const d = rodDigits[r] || 0;
        const isCurrentTarget = r === activeTargetRod;
        const glow = rodGlow[r] || 0;
        const fontPx = Math.round(clamp(labelPt.persp * 0.28, 12, 24));
        ctx.font = `700 ${fontPx}px "JetBrains Mono", "Fira Code", monospace`;

        if (isCurrentTarget || glow > 0.2) {
          ctx.fillStyle = theme.accentHex;
        } else if (d > 0 || r >= 3) {
          ctx.fillStyle = 'rgba(248, 250, 252, 0.92)';
        } else {
          ctx.fillStyle = 'rgba(148, 163, 184, 0.38)';
        }
        ctx.fillText(String(d), labelPt.x, labelPt.y);
      }
    }

    // 4. Draw Carry / Addition Ripple Rings on the Reckoning Beam / Stone Bridge
    for (let i = 0; i < carryRipples.length; i++) {
      const rp = carryRipples[i];
      const rx = -halfSpanX + rp.rodIdx * rodSpacing;
      const pt = projectPoint(
        { x: rx, y: beamY, z: frameHalfZ * 0.95 },
        yaw,
        pitch,
        roll,
        camDist,
        fovScale
      );
      if (!pt) continue;
      const progress = clamp(rp.age / rp.maxAge, 0, 1);
      const alpha = (1 - progress) * (rp.isCarry ? 0.85 : 0.45);
      const rad = (0.15 + progress * (rp.isCarry ? 0.65 : 0.35)) * pt.persp;
      const { r, g, b } = theme.beadCarryGlow;
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`;
      ctx.lineWidth = rp.isCarry ? 2.2 : 1.3;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, rad, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawHud(drillMode, abacusStyle, theme) {
    ctx.save();

    const padX = 22;
    const padY = 20;
    const boxW = Math.min(565, width - 44);
    const boxH = abacusStyle === 'roman_calculi' ? 142 : 122;

    const { r, g, b } = theme.accentRgb;
    ctx.fillStyle = 'rgba(7, 11, 21, 0.78)';
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

    const styleTitle =
      abacusStyle === 'roman_calculi'
        ? 'ROMAN TABULA ABACI (STONE GROOVES & CALCULI PEBBLES)'
        : abacusStyle === 'suanpan_2_5'
        ? 'CHINESE SUANPAN (2:5 HEAVEN/EARTH BEADS)'
        : 'JAPANESE SOROBAN (1:4 HISHI-DAMA BEADS)';

    ctx.fillStyle = theme.accentHex;
    ctx.font = '700 14px "Inter", "Segoe UI", sans-serif';
    ctx.fillText(`3D ABACUS ARITHMETIC — ${styleTitle}`, padX + 14, padY + 24);

    ctx.fillStyle = 'rgba(226, 232, 240, 0.95)';
    ctx.font = '700 20px "JetBrains Mono", "Fira Code", monospace';
    const paddedRegister = formatWithCommas(currentTotal).padStart(13, ' ');
    ctx.fillText(`REGISTER: ${paddedRegister}`, padX + 14, padY + 52);

    let nextY = padY + 78;
    if (abacusStyle === 'roman_calculi') {
      ctx.fillStyle = 'rgba(253, 224, 71, 0.92)';
      ctx.font = '600 11.5px "JetBrains Mono", "Fira Code", monospace';
      ctx.fillText(`ROMAN CALCULI: ${formatRomanRegister(currentTotal)}`, padX + 14, nextY);
      nextY += 22;
    }

    ctx.fillStyle = 'rgba(186, 230, 253, 0.92)';
    ctx.font = '600 11.5px "JetBrains Mono", "Fira Code", monospace';
    ctx.fillText(lastActionDesc, padX + 14, nextY);

    const targetFormula =
      drillMode === 'complement_987654321'
        ? 'Identity: 123,456,789 + 987,654,321 = 1,111,111,110 (Repunit Complement)'
        : drillMode === 'fibonacci_cascade'
        ? 'Sequence: F_n = F_{n-1} + F_{n-2}  (Golden Ratio lim F_{n+1}/F_n = φ ≈ 1.6180339)'
        : 'Classic 123456789 Drill: ∑(k=1..9) 123,456,789 = 1,111,111,101';

    ctx.fillStyle = 'rgba(148, 163, 184, 0.9)';
    ctx.font = '500 11px "JetBrains Mono", "Fira Code", monospace';
    ctx.fillText(targetFormula, padX + 14, nextY + 22);

    // Right-side 9-Step Multiplication/Addition Ledger
    if (drillMode !== 'fibonacci_cascade' && width >= 820) {
      const ledgerW = 285;
      const ledgerH = 228;
      const lx = width - ledgerW - 22;
      const ly = 20;

      ctx.fillStyle = 'rgba(7, 11, 21, 0.74)';
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.34)`;
      if (typeof ctx.roundRect === 'function') {
        ctx.beginPath();
        ctx.roundRect(lx, ly, ledgerW, ledgerH, 10);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillRect(lx, ly, ledgerW, ledgerH);
        ctx.strokeRect(lx, ly, ledgerW, ledgerH);
      }

      ctx.fillStyle = theme.accentHex;
      ctx.font = '700 12px "JetBrains Mono", "Fira Code", monospace';
      ctx.fillText('123,456,789 × 9 DRILL LEDGER', lx + 14, ly + 22);

      ctx.font = '500 11px "JetBrains Mono", "Fira Code", monospace';
      for (let step = 1; step <= 9; step++) {
        const expectedVal = ADDEND * step;
        const isCurrentPass = step === passIndex;
        const isCompleted =
          direction > 0 ? step < passIndex || phase === 'milestone_pause' : step > passIndex;

        if (isCurrentPass) {
          ctx.fillStyle = theme.accentHex;
        } else if (isCompleted) {
          ctx.fillStyle = 'rgba(241, 245, 249, 0.92)';
        } else {
          ctx.fillStyle = 'rgba(148, 163, 184, 0.48)';
        }

        const marker = isCurrentPass ? '▶' : isCompleted ? '✓' : '·';
        const rowY = ly + 44 + (step - 1) * 20;
        ctx.fillText(
          `${marker} ×${step}: ${formatWithCommas(expectedVal).padStart(13, ' ')}`,
          lx + 14,
          rowY
        );
      }
    }

    ctx.restore();
  }

  function resize(w, h) {
    width = w || canvas.width || 1280;
    height = h || canvas.height || 720;
  }

  function render(dt = 0.016) {
    const p = (typeof getParams === 'function' ? getParams() : {}) || {};
    const drillMode = String(p.drillMode || 'hyakumanben_add_sub');
    const rawStyle = String(p.abacusStyle || 'auto_cycle');
    const isAutoCycleStyle = rawStyle === 'auto_cycle';
    const abacusStyle = isAutoCycleStyle
      ? ABACUS_STYLES[cycleStyleIdx % ABACUS_STYLES.length]
      : rawStyle;

    // Default to Carrara Marble when viewing the Roman Abacus if user kept default theme
    const rawTheme = String(p.materialTheme || 'ebony_gold');
    const effectiveThemeKey =
      abacusStyle === 'roman_calculi' && rawTheme === 'ebony_gold'
        ? 'carrara_marble'
        : rawTheme;
    const theme = THEMES[effectiveThemeKey] || THEMES.ebony_gold;

    const calcSpeed = clamp(Number(p.calcSpeed ?? 1.0), 0.25, 3.0);
    const rotSpeed = clamp(Number(p.rotSpeed ?? 1.0), 0.0, 2.5);
    const tiltAngleDeg = clamp(Number(p.tiltAngle ?? 24), 5, 55);
    const showHud = p.showHud !== false;

    if (drillMode !== lastDrillMode) {
      lastDrillMode = drillMode;
      resetDrill(drillMode);
    }

    const safeDt = clamp(dt, 0.001, 0.1);
    simTime += safeDt * rotSpeed;

    if (phase === 'sweeping_reset') {
      sweepProgress += safeDt * calcSpeed * 1.35;
      const clearedRodLimit = Math.floor(sweepProgress * ROD_COUNT);
      for (let r = 0; r <= Math.min(ROD_COUNT - 1, clearedRodLimit); r++) {
        rodDigits[r] = 0;
      }
      syncTotalFromRods();
      if (sweepProgress >= 1.05) {
        stepDrillLogic(drillMode, isAutoCycleStyle);
      }
    } else {
      stepTimer += safeDt * calcSpeed;
      const interval = phase === 'milestone_pause' ? 2.2 : 0.26;
      if (stepTimer >= interval) {
        stepTimer = 0;
        stepDrillLogic(drillMode, isAutoCycleStyle);
      }
    }

    updateBeadPhysics(safeDt);

    // 1. Background
    drawBackground(theme);

    // 2. Smooth 3D orbital & pendulum rotation
    const yaw = Math.sin(simTime * 0.55) * 0.62 + Math.cos(simTime * 0.23) * 0.18;
    const basePitch = (tiltAngleDeg * Math.PI) / 180;
    const pitch = basePitch + Math.sin(simTime * 0.41) * 0.16;
    const roll = Math.sin(simTime * 0.33) * 0.09;

    const fovScale = Math.min(width, height) * 1.12;
    const camDist = 13.8;

    // 3. Ambient floating dust motes in 3D space
    for (let i = 0; i < motes.length; i++) {
      const m = motes[i];
      const mp = projectPoint(m, yaw * 0.7, pitch * 0.7, roll, camDist, fovScale);
      if (!mp || mp.x < 0 || mp.x > width || mp.y < 0 || mp.y > height) continue;
      ctx.fillStyle = `rgba(${theme.accentRgb.r}, ${theme.accentRgb.g}, ${theme.accentRgb.b}, 0.22)`;
      ctx.beginPath();
      ctx.arc(mp.x, mp.y, m.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4. Render 3D Abacus Frame / Stone Table, Rods / Grooves, and Animated Beads / Calculi Stones
    renderAbacus3D(abacusStyle, theme, yaw, pitch, roll, fovScale);

    // 5. Render Arithmetic Ledger & Telemetry HUD
    if (showHud) {
      drawHud(drillMode, abacusStyle, theme);
    }
  }

  function destroy() {}

  return { render, resize, destroy };
}
