// 3D Rotating Abacus Screensaver:
// 1. Japanese Soroban (1:4 smooth lathe-turned bicone hishi-dama beads)
// 2. Roman Tabula Abaci (carved Carrara marble stone tablet with deep recessed sulci grooves,
//    natural river/agate calculi pebbles, Θ unciae 1/12 groove, and classic 1/3rd Triens/Duella fractional space)
// 3. Chinese Suanpan (2:5 smooth polished oblate Heaven/Earth beads)
// 4. Classical Russian Schoty (Счёты — arched 3D horizontal wires with 10 biconvex wooden beads per wire,
//    contrasting middle 5th/6th beads, and bottom 1/3rd fractional wire)
//
// All arithmetic proceeds RIGHT-TO-LEFT (from fractional 1/3rd & units 10^0 column leftward to 10^8+),
// matching authentic human abacus technique.

const ROD_COUNT = 13; // Integer columns: index 0 = 10^12 ... index 12 = 10^0 (units)
const ADDEND = 123456789;

// Right-to-left digit order: units (10^0 = 9) first, moving leftward up to 10^8 = 1
const RTL_ADDEND_STEPS = [
  { rod: 12, digit: 9 }, // 10^0 (I)
  { rod: 11, digit: 8 }, // 10^1 (X)
  { rod: 10, digit: 7 }, // 10^2 (C)
  { rod: 9, digit: 6 },  // 10^3 (M)
  { rod: 8, digit: 5 },  // 10^4 (X̄)
  { rod: 7, digit: 4 },  // 10^5 (C̄)
  { rod: 6, digit: 3 },  // 10^6 (M̄)
  { rod: 5, digit: 2 },  // 10^7 (X̿)
  { rod: 4, digit: 1 }   // 10^8 (C̿)
];

const RTL_COMPLEMENT_STEPS = [
  { rod: 12, digit: 1 }, // 10^0
  { rod: 11, digit: 2 }, // 10^1
  { rod: 10, digit: 3 }, // 10^2
  { rod: 9, digit: 4 },  // 10^3
  { rod: 8, digit: 5 },  // 10^4
  { rod: 7, digit: 6 },  // 10^5
  { rod: 6, digit: 7 },  // 10^6
  { rod: 5, digit: 8 },  // 10^7
  { rod: 4, digit: 9 }   // 10^8
];

// Roman column headers for powers 10^12 down to 10^0, plus fractional Θ (1/12 Uncia) and ⅓ (Triens/Duella)
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

const ABACUS_STYLES = ['soroban_1_4', 'roman_calculi', 'suanpan_2_5', 'russian_schoty'];

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function formatWithCommas(n, thirds = 0) {
  const s = String(Math.max(0, Math.round(n)));
  const base = s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const t = ((thirds % 3) + 3) % 3;
  if (t === 1) return `${base} ⅓`;
  if (t === 2) return `${base} ⅔`;
  return base;
}

// Convert integer + thirds (0, 1, 2) into Roman numeral + duodecimal uncia/triens notation
function formatRomanRegister(num, thirds = 0) {
  const n = Math.max(0, Math.floor(num));
  const t = ((thirds % 3) + 3) % 3;
  if (n === 0 && t === 0) return 'NULLA (0)';

  const digitMap = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];
  const tenMap = ['', 'X', 'XX', 'XXX', 'XL', 'L', 'LX', 'LXX', 'LXXX', 'XC'];
  const hunMap = ['', 'C', 'CC', 'CCC', 'CD', 'D', 'DC', 'DCC', 'DCCC', 'CM'];

  function tripletToRoman(val) {
    const h = Math.floor(val / 100) % 10;
    const t10 = Math.floor(val / 10) % 10;
    const u = val % 10;
    return hunMap[h] + tenMap[t10] + digitMap[u];
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
  if (t === 1) parts.push('•••• (Triens ⅓)');
  if (t === 2) parts.push('S•• (Bes ⅔)');
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
    frameMain: { r: 48, g: 31, b: 22 },
    frameRim: { r: 102, g: 68, b: 46 },
    slabMain: { r: 212, g: 204, b: 190 },
    slabRecess: { r: 194, g: 185, b: 170 },
    grooveColor: { r: 34, g: 29, b: 24 },
    beamColor: { r: 62, g: 40, b: 28 },
    brassColor: { r: 218, g: 175, b: 82 },
    rodColor: 'rgba(205, 178, 128, 0.9)',
    beadIdleUpper: { r: 194, g: 138, b: 68 },
    beadIdleLower: { r: 182, g: 128, b: 62 },
    beadActiveUpper: { r: 245, g: 188, b: 58 },
    beadActiveLower: { r: 235, g: 168, b: 64 },
    schotyDarkBead: { r: 52, g: 32, b: 22 },
    beadCarryGlow: { r: 255, g: 215, b: 90 },
    accentHex: '#f59e0b',
    accentRgb: { r: 245, g: 158, b: 11 }
  },
  carrara_marble: {
    name: 'Roman Carrara Marble & River Calculi',
    bgTop: '#090c12',
    bgBot: '#171d29',
    frameMain: { r: 164, g: 156, b: 142 },
    frameRim: { r: 218, g: 210, b: 196 },
    slabMain: { r: 220, g: 214, b: 202 },
    slabRecess: { r: 198, g: 191, b: 178 },
    grooveColor: { r: 32, g: 28, b: 24 },
    beamColor: { r: 188, g: 180, b: 166 },
    brassColor: { r: 192, g: 148, b: 74 },
    rodColor: 'rgba(92, 82, 70, 0.9)',
    beadIdleUpper: { r: 78, g: 84, b: 92 },
    beadIdleLower: { r: 94, g: 98, b: 104 },
    beadActiveUpper: { r: 198, g: 88, b: 52 },
    beadActiveLower: { r: 208, g: 152, b: 68 },
    schotyDarkBead: { r: 44, g: 48, b: 56 },
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
    slabMain: { r: 162, g: 184, b: 170 },
    slabRecess: { r: 142, g: 166, b: 152 },
    grooveColor: { r: 22, g: 38, b: 32 },
    beamColor: { r: 126, g: 28, b: 28 },
    brassColor: { r: 232, g: 192, b: 92 },
    rodColor: 'rgba(226, 198, 115, 0.88)',
    beadIdleUpper: { r: 46, g: 138, b: 106 },
    beadIdleLower: { r: 42, g: 126, b: 96 },
    beadActiveUpper: { r: 82, g: 232, b: 172 },
    beadActiveLower: { r: 64, g: 208, b: 152 },
    schotyDarkBead: { r: 24, g: 64, b: 48 },
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
    slabMain: { r: 30, g: 44, b: 68 },
    slabRecess: { r: 22, g: 32, b: 52 },
    grooveColor: { r: 8, g: 12, b: 24 },
    beamColor: { r: 30, g: 48, b: 78 },
    brassColor: { r: 56, g: 189, b: 248 },
    rodColor: 'rgba(56, 189, 248, 0.78)',
    beadIdleUpper: { r: 52, g: 78, b: 120 },
    beadIdleLower: { r: 44, g: 68, b: 108 },
    beadActiveUpper: { r: 232, g: 121, b: 249 },
    beadActiveLower: { r: 56, g: 189, b: 248 },
    schotyDarkBead: { r: 18, g: 28, b: 48 },
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
    slabMain: { r: 196, g: 180, b: 158 },
    slabRecess: { r: 178, g: 160, b: 138 },
    grooveColor: { r: 38, g: 24, b: 20 },
    beamColor: { r: 92, g: 42, b: 36 },
    brassColor: { r: 204, g: 148, b: 96 },
    rodColor: 'rgba(188, 142, 104, 0.88)',
    beadIdleUpper: { r: 202, g: 188, b: 164 },
    beadIdleLower: { r: 192, g: 178, b: 154 },
    beadActiveUpper: { r: 248, g: 240, b: 220 },
    beadActiveLower: { r: 240, g: 228, b: 204 },
    schotyDarkBead: { r: 68, g: 34, b: 24 },
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

export function createSoroban3D(canvas, getParams) {
  const ctx = canvas.getContext('2d');
  let width = canvas.width || 1280;
  let height = canvas.height || 720;

  let simTime = 0;

  // Logical digit value (0..9) on each of the 13 integer columns (index 0 = 10^12, index 12 = 10^0)
  const rodDigits = new Array(ROD_COUNT).fill(0);
  const rodGlow = new Array(ROD_COUNT + 2).fill(0); // +2 for Roman Θ (idx 13) & 1/3rd (idx 14)
  const carryRipples = [];

  // Fractional 1/3rd register state (0, 1, or 2 thirds; 3 thirds carries +1 into rodDigits[12])
  let fracThirds = 0;

  // Smoothly interpolated bead/stone positions for Soroban / Suanpan / Roman integer columns:
  // upperBeadPos[rod][b] in [0 (away/up), 1 (pushed down toward divider)]
  // lowerBeadPos[rod][b] in [0 (away/down), 1 (pushed up toward divider)]
  const upperBeadPos = Array.from({ length: ROD_COUNT }, () => [0, 0]);
  const lowerBeadPos = Array.from({ length: ROD_COUNT }, () => [0, 0, 0, 0, 0]);

  // Smoothly interpolated positions for Roman fractional columns:
  // Col 13 (Θ Unciae 1/12): 1 upper stone (semis = 6/12 = 1/2) + 5 lower stones (1/12 each)
  let romanUnciaUpperPos = 0;
  const romanUnciaLowerPos = [0, 0, 0, 0, 0];
  // Col 14 (Classic 1/3rd Triens/Duella slot): 2 stones (each = 1/3)
  const romanThirdsPos = [0, 0];

  // Smoothly interpolated positions for Russian Schoty (Счёты):
  // 13 integer wires (r = 0..12, each with 10 beads sliding right-to-left: 0 = right idle, 1 = left counted)
  // plus 1 fractional 1/3rd wire (3 beads)
  const schotyBeadPos = Array.from({ length: ROD_COUNT }, () => new Array(10).fill(0));
  const schotyFracPos = [0, 0, 0];

  // Drill state machine
  let lastDrillMode = '';
  let cycleStyleIdx = 0;
  let passIndex = 1; // 1..9
  let direction = 1; // +1 = adding; -1 = subtracting
  let stepQueue = [];
  let activeFocusCol = 12;
  let stepTimer = 0;
  let phase = 'adding_rods'; // 'adding_rods' | 'milestone_pause' | 'sweeping_reset'
  let sweepProgress = 0;
  let currentTotal = 0;
  let lastActionDesc = 'Initializing Right-to-Left 123,456,789 × 9 drill...';

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

  function setNumberOnRods(val, thirdsVal = 0) {
    let rem = Math.max(0, Math.floor(val));
    for (let i = ROD_COUNT - 1; i >= 0; i--) {
      rodDigits[i] = rem % 10;
      rem = Math.floor(rem / 10);
    }
    fracThirds = ((thirdsVal % 3) + 3) % 3;
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

  // Apply +deltaThirds or -deltaThirds to the 1/3rd fractional space, carrying into rod 12 (units)
  function addDeltaThirds(deltaThirds) {
    if (deltaThirds === 0) return 0;
    rodGlow[13] = 1.0;
    rodGlow[14] = 1.0;
    const totalThirds = fracThirds + deltaThirds;
    if (totalThirds >= 3) {
      const unitCarry = Math.floor(totalThirds / 3);
      fracThirds = totalThirds % 3;
      spawnCarryRipple(14, true);
      spawnCarryRipple(13, true);
      const intCarries = addDeltaToRod(12, unitCarry);
      return 1 + intCarries;
    }
    if (totalThirds < 0) {
      const unitBorrow = Math.ceil(-totalThirds / 3);
      fracThirds = ((totalThirds % 3) + 3) % 3;
      spawnCarryRipple(14, true);
      spawnCarryRipple(13, true);
      const intBorrows = addDeltaToRod(12, -unitBorrow);
      return 1 + intBorrows;
    }
    fracThirds = totalThirds;
    spawnCarryRipple(14, false);
    return 0;
  }

  // Apply +delta or -delta to a specific rod/groove index with authentic right-to-left ripple carries/borrows
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

  // Build the right-to-left step queue for a single pass
  function buildPassSteps(drillMode, pass, dir) {
    const steps = [];
    if (drillMode === 'thirds_calculus') {
      // Classical 1/3rd Fractional Calculus:
      // Adds 123,456,789 ⅓ right-to-left: first +1/3rd in the fractional groove, then 9..1 from 10^0 leftward to 10^8
      steps.push({ kind: 'thirds', delta: dir * 1, label: `${dir > 0 ? '+' : '−'}⅓ (Triens / 4 Unciae)` });
      for (let i = 0; i < RTL_ADDEND_STEPS.length; i++) {
        const s = RTL_ADDEND_STEPS[i];
        steps.push({ kind: 'rod', rod: s.rod, delta: dir * s.digit });
      }
      return steps;
    }

    if (drillMode === 'complement_987654321' && pass % 2 === 0) {
      for (let i = 0; i < RTL_COMPLEMENT_STEPS.length; i++) {
        const s = RTL_COMPLEMENT_STEPS[i];
        steps.push({ kind: 'rod', rod: s.rod, delta: dir * s.digit });
      }
      return steps;
    }

    // Standard 123,456,789 pass (Right-to-Left: units 10^0 first, moving leftward to 10^8):
    // Decompose the units +9 into +⅓ + ⅔ (= +1 carry from the 1/3rd fractional groove) + 8 on units!
    steps.push({ kind: 'thirds', delta: dir * 1, label: `${dir > 0 ? '+' : '−'}⅓ (Triens Fractional Groove)` });
    steps.push({ kind: 'thirds', delta: dir * 2, label: `${dir > 0 ? '+' : '−'}⅔ (Completes 3/3 → Carry ${dir > 0 ? '+1' : '−1'} to I)` });
    steps.push({ kind: 'rod', rod: 12, delta: dir * 8 }); // +1 carry + 8 = +9 on units (10^0)
    for (let i = 1; i < RTL_ADDEND_STEPS.length; i++) {
      const s = RTL_ADDEND_STEPS[i];
      steps.push({ kind: 'rod', rod: s.rod, delta: dir * s.digit });
    }
    return steps;
  }

  function resetDrill(mode) {
    rodDigits.fill(0);
    rodGlow.fill(0);
    fracThirds = 0;
    carryRipples.length = 0;
    passIndex = 1;
    direction = 1;
    stepTimer = 0;
    phase = 'adding_rods';
    sweepProgress = 0;
    currentTotal = 0;
    activeFocusCol = 14;
    fibA = 1;
    fibB = 1;
    fibDigitsQueue = [];
    stepQueue = buildPassSteps(mode, 1, 1);
    lastActionDesc =
      mode === 'complement_987654321'
        ? 'Right-to-Left Repunit Complement: +123,456,789 + 987,654,321 = 1,111,111,110'
        : mode === 'thirds_calculus'
        ? 'Roman ⅓ Calculus (Right-to-Left): +123,456,789⅓ × 9 = 1,111,111,104'
        : mode === 'fibonacci_cascade'
        ? 'Right-to-Left Fibonacci Golden Ratio Abacus Cascade initialized'
        : 'Pass 1 / 9 (Right-to-Left): Starting at ⅓ & Units (10^0) leftward to 10^8...';
  }

  function stepDrillLogic(drillMode, isAutoCycleStyle) {
    if (phase === 'milestone_pause') {
      if (drillMode === 'hyakumanben_add_sub' || drillMode === 'thirds_calculus') {
        if (direction === 1) {
          direction = -1;
          passIndex = 1;
          stepQueue = buildPassSteps(drillMode, 1, -1);
          phase = 'adding_rods';
          lastActionDesc =
            drillMode === 'thirds_calculus'
              ? 'Milestone 1,111,111,104 reached! Reversing right-to-left: −123,456,789⅓ × 9...'
              : 'Milestone 1,111,111,101 reached! Reversing right-to-left: −123,456,789 × 9...';
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
          lastActionDesc = `Fibonacci limit (${formatWithCommas(currentTotal)}) — pausing before reset`;
          return;
        }
        setNumberOnRods(fibB, 0);
        const s = String(fibA);
        fibDigitsQueue = [];
        // Right-to-left: start at units (s.length - 1) and move leftward to most significant digit (0)
        for (let i = s.length - 1; i >= 0; i--) {
          const d = Number(s[i]);
          const rIdx = ROD_COUNT - s.length + i;
          if (d > 0) fibDigitsQueue.push({ rIdx, d, nextFib });
        }
        fibA = fibB;
        fibB = nextFib;
        if (fibDigitsQueue.length === 0) return;
      }
      const item = fibDigitsQueue.shift();
      activeFocusCol = item.rIdx;
      const carries = addDeltaToRod(item.rIdx, item.d);
      const power = ROD_COUNT - 1 - item.rIdx;
      lastActionDesc = `Fibonacci (R→L): Col 10^${power} +${item.d}${carries > 0 ? ` (${carries} carry)` : ''} → ${formatWithCommas(currentTotal)}`;
      return;
    }

    if (stepQueue.length === 0) {
      stepQueue = buildPassSteps(drillMode, passIndex, direction);
    }

    const step = stepQueue.shift();
    const maxPasses = drillMode === 'complement_987654321' ? 2 : 9;

    if (step.kind === 'thirds') {
      activeFocusCol = 14;
      const carries = addDeltaThirds(step.delta);
      const carryNote = carries > 0 ? ` [⅓×3 Carry → Col I!]` : '';
      lastActionDesc = `Pass ${passIndex}/${maxPasses} (R→L) • Col ⅓ & Θ: ${step.label}${carryNote} ⇒ ${formatWithCommas(currentTotal, fracThirds)}`;
    } else {
      const targetRod = step.rod;
      activeFocusCol = targetRod;
      const carries = addDeltaToRod(targetRod, step.delta);
      const power = ROD_COUNT - 1 - targetRod;
      const opSym = step.delta > 0 ? '+' : '−';
      const carryNote =
        carries > 0
          ? step.delta > 0
            ? ` [Carry ×${carries} ←]`
            : ` [Borrow ×${carries} ←]`
          : '';
      lastActionDesc = `Pass ${passIndex}/${maxPasses} (R→L) • Col 10^${power} (${ROMAN_COL_LABELS[targetRod]}): ${opSym}${Math.abs(step.delta)}${carryNote} ⇒ ${formatWithCommas(currentTotal, fracThirds)}`;
    }

    if (stepQueue.length === 0) {
      if (passIndex >= maxPasses) {
        phase = 'milestone_pause';
        if (drillMode === 'complement_987654321') {
          lastActionDesc = `Repunit Complete: 123,456,789 + 987,654,321 = ${formatWithCommas(currentTotal, fracThirds)}!`;
        } else if (drillMode === 'thirds_calculus') {
          if (direction > 0) {
            lastActionDesc = `★ 123,456,789⅓ × 9 = ${formatWithCommas(currentTotal, fracThirds)} (Roman ⅓ Calculus Complete!) ★`;
          } else {
            lastActionDesc = `★ 1,111,111,104 − (123,456,789⅓ × 9) = ${formatWithCommas(currentTotal, fracThirds)} (Zero!) ★`;
          }
        } else if (direction > 0) {
          lastActionDesc = `★ 123,456,789 × 9 = ${formatWithCommas(currentTotal, fracThirds)} (All 1s + 01 Milestone Reached!) ★`;
        } else {
          lastActionDesc = `★ 1,111,111,101 − (123,456,789 × 9) = ${formatWithCommas(currentTotal, fracThirds)} (Exact Zero Return!) ★`;
        }
      } else {
        passIndex++;
        stepQueue = buildPassSteps(drillMode, passIndex, direction);
      }
    }
  }

  function updateBeadPhysics(dt) {
    const smooth = clamp(dt * 14.0, 0.08, 0.65);

    for (let r = 0; r < ROD_COUNT + 2; r++) {
      rodGlow[r] = Math.max(0, rodGlow[r] - dt * 1.65);
    }

    for (let r = 0; r < ROD_COUNT; r++) {
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

      // Russian Schoty: d beads (0..9) pushed from right (0) to left (1)
      for (let b = 0; b < 10; b++) {
        const targetS = b < d ? 1 : 0;
        schotyBeadPos[r][b] = lerp(schotyBeadPos[r][b], targetS, smooth);
      }
    }

    // Fractional 1/3rd physics:
    // In Roman unciae (twelfths): 1/3 = 4/12 (0 upper, 4 lower), 2/3 = 8/12 (1 upper semis = 6/12 + 2 lower = 2/12)
    const unciaTwelfths = fracThirds * 4; // 0, 4, or 8 twelfths
    const targetUnciaUpper = unciaTwelfths >= 6 ? 1 : 0;
    const targetUnciaLower = unciaTwelfths % 6; // 0, 4, or 2
    romanUnciaUpperPos = lerp(romanUnciaUpperPos, targetUnciaUpper, smooth);
    for (let b = 0; b < 5; b++) {
      romanUnciaLowerPos[b] = lerp(romanUnciaLowerPos[b], b < targetUnciaLower ? 1 : 0, smooth);
    }

    // Classic Roman 1/3rd Triens/Duella groove (2 stones, each 1/3)
    for (let b = 0; b < 2; b++) {
      romanThirdsPos[b] = lerp(romanThirdsPos[b], b < fracThirds ? 1 : 0, smooth);
    }

    // Russian Schoty fractional 1/3rd wire (3 beads)
    for (let b = 0; b < 3; b++) {
      schotyFracPos[b] = lerp(schotyFracPos[b], b < fracThirds ? 1 : 0, smooth);
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
      y: height * 0.48 - r.y * persp,
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

  // Smooth, triangle-free 3D bead & stone renderer
  function drawSmoothBead(item, theme) {
    const { pt, topPt, botPt, leftPt, rightPt, rxPx, ryPx, style, col, glow, seed } = item;
    const r = col.r;
    const g = col.g;
    const b = col.b;

    ctx.save();

    // Rotate canvas locally to align with the projected rod/wire axis
    const dx = topPt.x - botPt.x;
    const dy = topPt.y - botPt.y;
    const rodAngle = Math.atan2(dy, dx) + Math.PI * 0.5;

    ctx.translate(pt.x, pt.y);

    if (style === 'roman_calculi') {
      // Natural river/agate pebble (calculus rock) sitting inside the recessed stone groove
      const wobbleAngle = ((seed * 37) % 100) * 0.006 - 0.3;
      const rx = rxPx * (0.94 + ((seed * 13) % 15) * 0.008);
      const ry = ryPx * (0.86 + ((seed * 29) % 17) * 0.009);
      ctx.rotate(rodAngle + wobbleAngle);

      // 1. Deep pocket contact shadow inside the carved stone sulcus groove
      ctx.fillStyle = 'rgba(8, 6, 4, 0.62)';
      ctx.beginPath();
      if (typeof ctx.ellipse === 'function') {
        ctx.ellipse(rx * 0.12, ry * 0.18, rx * 1.06, ry * 1.04, 0, 0, Math.PI * 2);
      } else {
        ctx.arc(rx * 0.12, ry * 0.18, rx, 0, Math.PI * 2);
      }
      ctx.fill();

      // 2. Smooth organic stone pebble silhouette (8-control-point smooth closed rock curve)
      ctx.beginPath();
      const nPts = 12;
      for (let i = 0; i <= nPts; i++) {
        const a = (i / nPts) * Math.PI * 2;
        const asym = 1 + 0.055 * Math.sin(a * 2 + seed) + 0.035 * Math.cos(a * 3 - seed * 1.7);
        const px = Math.cos(a) * rx * asym;
        const py = Math.sin(a) * ry * asym;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();

      // 3. 3D spherical mineral stone shading gradient
      const grad = ctx.createRadialGradient(-rx * 0.32, -ry * 0.32, rx * 0.08, 0, 0, Math.max(rx, ry) * 1.15);
      grad.addColorStop(0, `rgb(${clamp(r + 68, 0, 255)}, ${clamp(g + 64, 0, 255)}, ${clamp(b + 58, 0, 255)})`);
      grad.addColorStop(0.42, `rgb(${r}, ${g}, ${b})`);
      grad.addColorStop(0.82, `rgb(${ Math.round(r * 0.62) }, ${ Math.round(g * 0.62) }, ${ Math.round(b * 0.62) })`);
      grad.addColorStop(1, `rgb(${ Math.round(r * 0.36) }, ${ Math.round(g * 0.36) }, ${ Math.round(b * 0.36) })`);
      ctx.fillStyle = grad;
      ctx.fill();

      // Subtle agate mineral band, mottled rock grain & polished pebble specular highlight
      ctx.fillStyle = 'rgba(18, 14, 12, 0.22)';
      ctx.beginPath();
      ctx.arc(rx * 0.22, ry * 0.14, rx * 0.16, 0, Math.PI * 2);
      ctx.arc(-rx * 0.14, ry * 0.28, rx * 0.11, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = `rgba(255, 250, 240, ${0.18 + glow * 0.25})`;
      ctx.lineWidth = Math.max(0.8, rx * 0.07);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.34)';
      ctx.beginPath();
      if (typeof ctx.ellipse === 'function') {
        ctx.ellipse(-rx * 0.28, -ry * 0.28, rx * 0.26, ry * 0.15, -0.35, 0, Math.PI * 2);
      } else {
        ctx.arc(-rx * 0.28, -ry * 0.28, rx * 0.22, 0, Math.PI * 2);
      }
      ctx.fill();

      ctx.restore();
      return;
    }

    if (style === 'russian_schoty') {
      // Russian Schoty bead: smooth biconvex ellipsoidal wooden bead threaded horizontally on wire
      const wireDx = rightPt.x - leftPt.x;
      const wireDy = rightPt.y - leftPt.y;
      const wireAngle = Math.atan2(wireDy, wireDx);
      ctx.rotate(wireAngle);

      const bw = Math.max(3.5, rxPx * 0.72); // thickness along horizontal wire
      const bh = Math.max(6.0, ryPx * 1.18); // vertical radius of wooden disk bead

      // Drop shadow
      ctx.fillStyle = 'rgba(5, 8, 15, 0.45)';
      ctx.beginPath();
      ctx.moveTo(0, -bh + 1.5);
      ctx.quadraticCurveTo(bw * 1.15, 1.5, 0, bh + 1.5);
      ctx.quadraticCurveTo(-bw * 1.15, 1.5, 0, -bh + 1.5);
      ctx.fill();

      // Smooth biconvex lathe-turned wooden bead contour
      ctx.beginPath();
      ctx.moveTo(0, -bh);
      ctx.bezierCurveTo(bw * 0.95, -bh * 0.75, bw * 0.95, bh * 0.75, 0, bh);
      ctx.bezierCurveTo(-bw * 0.95, bh * 0.75, -bw * 0.95, -bh * 0.75, 0, -bh);
      ctx.closePath();

      const grad = ctx.createLinearGradient(-bw * 0.6, -bh * 0.85, bw * 0.6, bh * 0.85);
      grad.addColorStop(0, `rgb(${clamp(r + 65, 0, 255)}, ${clamp(g + 58, 0, 255)}, ${clamp(b + 48, 0, 255)})`);
      grad.addColorStop(0.28, `rgb(${clamp(r + 28, 0, 255)}, ${clamp(g + 24, 0, 255)}, ${clamp(b + 18, 0, 255)})`);
      grad.addColorStop(0.62, `rgb(${r}, ${g}, ${b})`);
      grad.addColorStop(1, `rgb(${Math.round(r * 0.42)}, ${Math.round(g * 0.4)}, ${Math.round(b * 0.38)})`);
      ctx.fillStyle = grad;
      ctx.fill();

      // Specular wood polish highlight
      ctx.fillStyle = 'rgba(255, 250, 240, 0.34)';
      ctx.beginPath();
      if (typeof ctx.ellipse === 'function') {
        ctx.ellipse(-bw * 0.15, -bh * 0.38, bw * 0.28, bh * 0.2, 0.2, 0, Math.PI * 2);
      } else {
        ctx.arc(-bw * 0.15, -bh * 0.38, bw * 0.22, 0, Math.PI * 2);
      }
      ctx.fill();

      ctx.restore();
      return;
    }

    ctx.rotate(rodAngle);

    if (style === 'suanpan_2_5') {
      // Smooth rounded oblate spheroid / donut bead (Chinese Suanpan)
      const rx = rxPx * 1.04;
      const ry = ryPx * 0.92;

      // Soft ambient shadow
      ctx.fillStyle = 'rgba(4, 8, 16, 0.42)';
      ctx.beginPath();
      if (typeof ctx.ellipse === 'function') {
        ctx.ellipse(rx * 0.08, ry * 0.16, rx * 1.02, ry * 0.98, 0, 0, Math.PI * 2);
      } else {
        ctx.arc(rx * 0.08, ry * 0.16, rx, 0, Math.PI * 2);
      }
      ctx.fill();

      // Smooth rounded torus-like oblate body
      ctx.beginPath();
      ctx.moveTo(-rx * 0.48, -ry);
      ctx.bezierCurveTo(rx * 0.48, -ry, rx * 1.08, -ry * 0.55, rx, 0);
      ctx.bezierCurveTo(rx * 1.08, ry * 0.55, rx * 0.48, ry, -rx * 0.48, ry);
      ctx.bezierCurveTo(-rx * 1.08, ry * 0.55, -rx, 0, -rx, 0);
      ctx.bezierCurveTo(-rx * 1.08, -ry * 0.55, -rx * 0.48, -ry, -rx * 0.48, -ry);
      ctx.closePath();

      const grad = ctx.createRadialGradient(-rx * 0.3, -ry * 0.35, rx * 0.08, 0, 0, rx * 1.15);
      grad.addColorStop(0, `rgb(${clamp(r + 74, 0, 255)}, ${clamp(g + 68, 0, 255)}, ${clamp(b + 58, 0, 255)})`);
      grad.addColorStop(0.38, `rgb(${r}, ${g}, ${b})`);
      grad.addColorStop(0.82, `rgb(${Math.round(r * 0.58)}, ${Math.round(g * 0.56)}, ${Math.round(b * 0.54)})`);
      grad.addColorStop(1, `rgb(${Math.round(r * 0.34)}, ${Math.round(g * 0.32)}, ${Math.round(b * 0.3)})`);
      ctx.fillStyle = grad;
      ctx.fill();

      // Specular sheen
      ctx.fillStyle = 'rgba(255, 255, 255, 0.36)';
      ctx.beginPath();
      if (typeof ctx.ellipse === 'function') {
        ctx.ellipse(-rx * 0.3, -ry * 0.32, rx * 0.3, ry * 0.18, -0.25, 0, Math.PI * 2);
      } else {
        ctx.arc(-rx * 0.3, -ry * 0.32, rx * 0.2, 0, Math.PI * 2);
      }
      ctx.fill();

      ctx.restore();
      return;
    }

    // Japanese Soroban (soroban_1_4): Smooth lathe-turned bicone (hishi-dama) without polygon triangles
    const rx = rxPx * 1.06;
    const ry = ryPx * 1.05;
    const neckW = rx * 0.32;
    const eqTilt = ry * 0.24; // 3D elliptical curvature of the sharp equatorial ridge

    // Upper cone (lit from top-left)
    ctx.beginPath();
    ctx.moveTo(-neckW, -ry);
    ctx.quadraticCurveTo(0, -ry * 1.08, neckW, -ry);
    ctx.lineTo(rx, 0);
    ctx.quadraticCurveTo(0, eqTilt, -rx, 0);
    ctx.closePath();

    const upGrad = ctx.createLinearGradient(-rx, -ry * 0.5, rx, 0);
    upGrad.addColorStop(0, `rgb(${clamp(r + 68, 0, 255)}, ${clamp(g + 58, 0, 255)}, ${clamp(b + 44, 0, 255)})`);
    upGrad.addColorStop(0.45, `rgb(${clamp(r + 24, 0, 255)}, ${clamp(g + 20, 0, 255)}, ${clamp(b + 14, 0, 255)})`);
    upGrad.addColorStop(1, `rgb(${Math.round(r * 0.72)}, ${Math.round(g * 0.68)}, ${Math.round(b * 0.64)})`);
    ctx.fillStyle = upGrad;
    ctx.fill();

    // Lower cone (shaded underside)
    ctx.beginPath();
    ctx.moveTo(-rx, 0);
    ctx.quadraticCurveTo(0, eqTilt, rx, 0);
    ctx.lineTo(neckW, ry);
    ctx.quadraticCurveTo(0, ry * 1.08, -neckW, ry);
    ctx.closePath();

    const loGrad = ctx.createLinearGradient(-rx, 0, rx, ry * 0.6);
    loGrad.addColorStop(0, `rgb(${Math.round(r * 0.86)}, ${Math.round(g * 0.82)}, ${Math.round(b * 0.76)})`);
    loGrad.addColorStop(0.5, `rgb(${Math.round(r * 0.62)}, ${Math.round(g * 0.58)}, ${Math.round(b * 0.54)})`);
    loGrad.addColorStop(1, `rgb(${Math.round(r * 0.36)}, ${Math.round(g * 0.34)}, ${Math.round(b * 0.3)})`);
    ctx.fillStyle = loGrad;
    ctx.fill();

    // Crisp specular highlight along the curved hishi-dama equatorial ridge
    ctx.strokeStyle = `rgba(255, 248, 225, ${0.46 + glow * 0.35})`;
    ctx.lineWidth = Math.max(1.0, ry * 0.09);
    ctx.beginPath();
    ctx.moveTo(-rx * 0.92, 0);
    ctx.quadraticCurveTo(0, eqTilt * 0.95, rx * 0.92, 0);
    ctx.stroke();

    // Top brass/ivory collar bore ring
    ctx.fillStyle = 'rgba(28, 22, 16, 0.72)';
    ctx.beginPath();
    if (typeof ctx.ellipse === 'function') {
      ctx.ellipse(0, -ry * 0.96, neckW * 0.75, ry * 0.11, 0, 0, Math.PI * 2);
    } else {
      ctx.arc(0, -ry * 0.96, neckW * 0.5, 0, Math.PI * 2);
    }
    ctx.fill();

    ctx.restore();
  }

  function renderRussianSchoty3D(theme, yaw, pitch, roll, fovScale) {
    const camDist = 13.8;
    const lightDir = normalize3({ x: -0.38, y: 0.68, z: 0.62 });
    const viewDir = { x: 0, y: 0, z: 1 };

    // Russian Schoty has 14 horizontal arched wires stacked vertically:
    // Wire 0 (bottom) = 1/3rd fractional wire (3 beads), separated by a divider bar from
    // Wires 1..13 (bottom-to-top = 10^0 units up to 10^12)
    const innerHalfW = 4.65;
    const outerHalfW = innerHalfW + 0.46;
    const topInnerY = 2.85;
    const botInnerY = -2.85;
    const outerTopY = topInnerY + 0.42;
    const outerBotY = botInnerY - 0.42;
    const frameHalfZ = 0.38;
    const dividerY = -2.28;

    const drawList = [];
    const frameBoxes = [
      // Top, bottom, left, right wooden frame rails
      ...createBoxFaces(-outerHalfW, topInnerY, -frameHalfZ, outerHalfW, outerTopY, frameHalfZ, theme.frameMain, 'frame'),
      ...createBoxFaces(-outerHalfW, outerBotY, -frameHalfZ, outerHalfW, botInnerY, frameHalfZ, theme.frameMain, 'frame'),
      ...createBoxFaces(-outerHalfW, outerBotY, -frameHalfZ, -innerHalfW, outerTopY, frameHalfZ, theme.frameMain, 'frame'),
      ...createBoxFaces(innerHalfW, outerBotY, -frameHalfZ, outerHalfW, outerTopY, frameHalfZ, theme.frameMain, 'frame'),
      // Divider bar between bottom 1/3rd fractional wire and integer wires
      ...createBoxFaces(-innerHalfW, dividerY - 0.08, -frameHalfZ * 0.75, innerHalfW, dividerY + 0.08, frameHalfZ * 0.75, theme.beamColor, 'beam'),
      // Brass corner brackets
      ...createBoxFaces(-outerHalfW - 0.02, outerTopY - 0.55, -frameHalfZ - 0.02, -innerHalfW + 0.32, outerTopY + 0.02, frameHalfZ + 0.02, theme.brassColor, 'brass'),
      ...createBoxFaces(innerHalfW - 0.32, outerTopY - 0.55, -frameHalfZ - 0.02, outerHalfW + 0.02, outerTopY + 0.02, frameHalfZ + 0.02, theme.brassColor, 'brass'),
      ...createBoxFaces(-outerHalfW - 0.02, outerBotY - 0.02, -frameHalfZ - 0.02, -innerHalfW + 0.32, outerBotY + 0.55, frameHalfZ + 0.02, theme.brassColor, 'brass'),
      ...createBoxFaces(innerHalfW - 0.32, outerBotY - 0.02, -frameHalfZ - 0.02, outerHalfW + 0.02, outerBotY + 0.55, frameHalfZ + 0.02, theme.brassColor, 'brass')
    ];

    // Helper for 3D bowed Schoty wire: arches upward in +Z toward the operator in the center
    function wirePoint3D(wx, wy) {
      const normX = clamp(wx / innerHalfW, -1, 1);
      const archZ = (1 - normX * normX) * 0.34;
      return { x: wx, y: wy, z: archZ };
    }

    const beadSpacingX = 0.29;
    const beadRadius = 0.19;

    // 1. Bottom Fractional 1/3rd Wire (3 beads)
    const fracWireY = -2.58;
    const fracGlow = Math.max(rodGlow[13] || 0, rodGlow[14] || 0);
    {
      const wirePts = [];
      for (let s = 0; s <= 12; s++) {
        const wx = lerp(-innerHalfW, innerHalfW, s / 12);
        const pp = projectPoint(wirePoint3D(wx, fracWireY), yaw, pitch, roll, camDist, fovScale);
        if (pp) wirePts.push(pp);
      }
      if (wirePts.length > 1) {
        drawList.push({
          kind: 'curved_wire',
          zSort: wirePts[6].z - 0.06,
          wirePts,
          glow: fracGlow
        });
      }

      for (let b = 0; b < 3; b++) {
        const leftX = -innerHalfW + 0.42 + b * (beadSpacingX * 1.25);
        const rightX = innerHalfW - 0.42 - (2 - b) * (beadSpacingX * 1.25);
        const t = schotyFracPos[b] || 0;
        const bx = lerp(rightX, leftX, t);
        const p3 = wirePoint3D(bx, fracWireY);
        const pt = projectPoint(p3, yaw, pitch, roll, camDist, fovScale);
        const topPt = projectPoint({ x: bx, y: fracWireY + beadRadius, z: p3.z }, yaw, pitch, roll, camDist, fovScale);
        const botPt = projectPoint({ x: bx, y: fracWireY - beadRadius, z: p3.z }, yaw, pitch, roll, camDist, fovScale);
        const leftPt = projectPoint(wirePoint3D(bx - 0.15, fracWireY), yaw, pitch, roll, camDist, fovScale);
        const rightPt = projectPoint(wirePoint3D(bx + 0.15, fracWireY), yaw, pitch, roll, camDist, fovScale);
        if (!pt || !topPt || !botPt || !leftPt || !rightPt) continue;

        const isMiddle = b === 1;
        const baseCol = isMiddle ? theme.schotyDarkBead : t > 0.45 ? theme.beadActiveUpper : theme.beadIdleLower;
        const col = {
          r: Math.round(lerp(baseCol.r, theme.beadCarryGlow.r, fracGlow * 0.65)),
          g: Math.round(lerp(baseCol.g, theme.beadCarryGlow.g, fracGlow * 0.65)),
          b: Math.round(lerp(baseCol.b, theme.beadCarryGlow.b, fracGlow * 0.65))
        };
        drawList.push({
          kind: 'smooth_bead',
          zSort: pt.z,
          pt,
          topPt,
          botPt,
          leftPt,
          rightPt,
          rxPx: Math.max(4, pt.persp * 0.15),
          ryPx: Math.max(5, pt.persp * 0.18),
          style: 'russian_schoty',
          col,
          glow: fracGlow,
          seed: 900 + b
        });
      }
    }

    // 2. 13 Integer Wires: rod r=12 (10^0 units) at the bottom just above dividerY, up to r=0 (10^12) at top
    for (let r = 0; r < ROD_COUNT; r++) {
      const power = ROD_COUNT - 1 - r; // 0 (bottom wire) .. 12 (top wire)
      const wy = lerp(dividerY + 0.34, topInnerY - 0.28, power / (ROD_COUNT - 1));
      const glow = rodGlow[r] || 0;

      const wirePts = [];
      for (let s = 0; s <= 12; s++) {
        const wx = lerp(-innerHalfW, innerHalfW, s / 12);
        const pp = projectPoint(wirePoint3D(wx, wy), yaw, pitch, roll, camDist, fovScale);
        if (pp) wirePts.push(pp);
      }
      if (wirePts.length > 1) {
        drawList.push({
          kind: 'curved_wire',
          zSort: wirePts[6].z - 0.06,
          wirePts,
          glow
        });
      }

      // 10 beads per wire: middle beads (b === 4 || b === 5) are contrasting dark wood
      for (let b = 0; b < 10; b++) {
        const leftX = -innerHalfW + 0.36 + b * beadSpacingX;
        const rightX = innerHalfW - 0.36 - (9 - b) * beadSpacingX;
        const t = schotyBeadPos[r][b] || 0;
        const bx = lerp(rightX, leftX, t);
        const p3 = wirePoint3D(bx, wy);
        const pt = projectPoint(p3, yaw, pitch, roll, camDist, fovScale);
        const topPt = projectPoint({ x: bx, y: wy + beadRadius, z: p3.z }, yaw, pitch, roll, camDist, fovScale);
        const botPt = projectPoint({ x: bx, y: wy - beadRadius, z: p3.z }, yaw, pitch, roll, camDist, fovScale);
        const leftPt = projectPoint(wirePoint3D(bx - 0.15, wy), yaw, pitch, roll, camDist, fovScale);
        const rightPt = projectPoint(wirePoint3D(bx + 0.15, wy), yaw, pitch, roll, camDist, fovScale);
        if (!pt || !topPt || !botPt || !leftPt || !rightPt) continue;

        const isMiddleContrast = b === 4 || b === 5;
        const baseCol = isMiddleContrast
          ? theme.schotyDarkBead
          : t > 0.45
          ? theme.beadActiveLower
          : theme.beadIdleLower;
        const col = {
          r: Math.round(lerp(baseCol.r, theme.beadCarryGlow.r, glow * 0.65)),
          g: Math.round(lerp(baseCol.g, theme.beadCarryGlow.g, glow * 0.65)),
          b: Math.round(lerp(baseCol.b, theme.beadCarryGlow.b, glow * 0.65))
        };
        drawList.push({
          kind: 'smooth_bead',
          zSort: pt.z,
          pt,
          topPt,
          botPt,
          leftPt,
          rightPt,
          rxPx: Math.max(3.5, pt.persp * 0.14),
          ryPx: Math.max(5.0, pt.persp * 0.17),
          style: 'russian_schoty',
          col,
          glow,
          seed: r * 19 + b
        });
      }
    }

    // Project frame faces
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
      if (normal.z < 0) normal = { x: -normal.x, y: -normal.y, z: -normal.z };

      const diff = Math.max(0, dot3(normal, lightDir));
      const halfVec = normalize3({
        x: lightDir.x + viewDir.x,
        y: lightDir.y + viewDir.y,
        z: lightDir.z + viewDir.z
      });
      const spec = Math.pow(Math.max(0, dot3(normal, halfVec)), face.tag === 'brass' ? 28 : 18);
      const lit = 0.45 + diff * 0.55;
      const specAdd = (face.tag === 'brass' ? 68 : 20) * spec;

      const r = clamp(Math.round(face.color.r * lit + specAdd), 0, 255);
      const g = clamp(Math.round(face.color.g * lit + specAdd), 0, 255);
      const b = clamp(Math.round(face.color.b * lit + specAdd), 0, 255);

      drawList.push({
        kind: 'face',
        zSort: zSum / projVerts.length,
        projVerts,
        fill: `rgb(${r}, ${g}, ${b})`
      });
    }

    drawList.sort((a, b) => a.zSort - b.zSort);

    for (let i = 0; i < drawList.length; i++) {
      const item = drawList[i];
      if (item.kind === 'curved_wire') {
        ctx.save();
        ctx.strokeStyle = item.glow > 0.15 ? theme.accentHex : theme.rodColor;
        ctx.lineWidth = Math.max(1.5, item.wirePts[0].persp * 0.045);
        ctx.beginPath();
        ctx.moveTo(item.wirePts[0].x, item.wirePts[0].y);
        for (let k = 1; k < item.wirePts.length; k++) {
          ctx.lineTo(item.wirePts[k].x, item.wirePts[k].y);
        }
        ctx.stroke();
        ctx.restore();
      } else if (item.kind === 'smooth_bead') {
        drawSmoothBead(item, theme);
      } else {
        const pv = item.projVerts;
        ctx.beginPath();
        ctx.moveTo(pv[0].x, pv[0].y);
        for (let k = 1; k < pv.length; k++) ctx.lineTo(pv[k].x, pv[k].y);
        ctx.closePath();
        ctx.fillStyle = item.fill;
        ctx.fill();
        ctx.strokeStyle = item.fill;
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }
    }

    // Wire labels along the right rail of the Schoty
    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const fracLabelPt = projectPoint({ x: outerHalfW + 0.25, y: fracWireY, z: 0 }, yaw, pitch, roll, camDist, fovScale);
    if (fracLabelPt) {
      ctx.font = `700 ${Math.round(clamp(fracLabelPt.persp * 0.2, 10, 16))}px "JetBrains Mono", monospace`;
      ctx.fillStyle = fracThirds > 0 ? theme.accentHex : 'rgba(226, 232, 240, 0.78)';
      ctx.fillText(`⅓: ${fracThirds}/3`, fracLabelPt.x, fracLabelPt.y);
    }
    for (let r = 4; r < ROD_COUNT; r++) {
      const power = ROD_COUNT - 1 - r;
      const wy = lerp(dividerY + 0.34, topInnerY - 0.28, power / (ROD_COUNT - 1));
      const lPt = projectPoint({ x: outerHalfW + 0.25, y: wy, z: 0 }, yaw, pitch, roll, camDist, fovScale);
      if (lPt) {
        const d = rodDigits[r] || 0;
        ctx.font = `700 ${Math.round(clamp(lPt.persp * 0.2, 10, 16))}px "JetBrains Mono", monospace`;
        ctx.fillStyle = r === activeFocusCol || rodGlow[r] > 0.2 ? theme.accentHex : d > 0 ? '#f8fafc' : 'rgba(148, 163, 184, 0.45)';
        ctx.fillText(`10^${power}: ${d}`, lPt.x, lPt.y);
      }
    }
    ctx.restore();
  }

  function renderAbacus3D(abacusStyle, theme, yaw, pitch, roll, fovScale) {
    if (abacusStyle === 'russian_schoty') {
      renderRussianSchoty3D(theme, yaw, pitch, roll, fovScale);
      return;
    }

    const camDist = 13.8;
    const lightDir = normalize3({ x: -0.38, y: 0.68, z: 0.62 });
    const viewDir = { x: 0, y: 0, z: 1 };

    const isSuanpan = abacusStyle === 'suanpan_2_5';
    const isRoman = abacusStyle === 'roman_calculi';

    // Roman Tabula Abaci has 13 integer grooves + 2 right-hand fractional columns:
    // Col 13 = Θ (Unciae 1/12, with 1 upper semis stone + 5 lower uncia stones)
    // Col 14 = Classic 1/3rd fractional space (Triens / Duella slot on the far right edge)
    const totalCols = isRoman ? ROD_COUNT + 2 : ROD_COUNT;
    const rodSpacing = isRoman ? 0.69 : 0.76;
    const halfSpanX = ((totalCols - 1) * rodSpacing) / 2;
    const innerHalfW = halfSpanX + (isRoman ? 0.72 : 0.68);
    const outerHalfW = innerHalfW + (isRoman ? 0.46 : 0.38);

    const topInnerY = isSuanpan ? 2.55 : isRoman ? 2.42 : 2.22;
    const botInnerY = isSuanpan ? -2.95 : isRoman ? -2.78 : -2.62;
    const outerTopY = topInnerY + (isRoman ? 0.44 : 0.36);
    const outerBotY = botInnerY - (isRoman ? 0.44 : 0.36);
    const beamY = isRoman ? 0.62 : 0.72;
    const beamHalfH = isRoman ? 0.32 : 0.14;
    const frameHalfZ = isRoman ? 0.44 : 0.36;

    const beadRadius = isRoman ? 0.22 : 0.31;
    const beadHalfH = isSuanpan ? 0.19 : isRoman ? 0.185 : 0.21;

    function getColX(colIdx) {
      const base = -halfSpanX + colIdx * rodSpacing;
      // Add extra chiseled separation gap before the Roman fractional columns (Θ and 1/3rd)
      if (isRoman && colIdx >= ROD_COUNT) {
        return base + 0.24;
      }
      if (isRoman) {
        return base - 0.08;
      }
      return base;
    }

    const drawList = [];
    const frameBoxes = [];

    if (isRoman) {
      // ROMAN TABULA ABACI: Heavy Chiseled Stone Tablet with Sunken Inner Field, Recessed Grooves & Rocks
      frameBoxes.push(
        // Heavy stone slab body
        ...createBoxFaces(
          -outerHalfW,
          outerBotY,
          -frameHalfZ,
          outerHalfW,
          outerTopY,
          frameHalfZ * 0.48,
          theme.slabMain,
          'slab'
        ),
        // Raised outer stone cornice molding around the perimeter of the tablet
        ...createBoxFaces(-outerHalfW, topInnerY, frameHalfZ * 0.48, outerHalfW, outerTopY, frameHalfZ * 0.86, theme.frameMain, 'frame'),
        ...createBoxFaces(-outerHalfW, outerBotY, frameHalfZ * 0.48, outerHalfW, botInnerY, frameHalfZ * 0.86, theme.frameMain, 'frame'),
        ...createBoxFaces(-outerHalfW, outerBotY, frameHalfZ * 0.48, -innerHalfW, outerTopY, frameHalfZ * 0.86, theme.frameMain, 'frame'),
        ...createBoxFaces(innerHalfW, outerBotY, frameHalfZ * 0.48, outerHalfW, outerTopY, frameHalfZ * 0.86, theme.frameMain, 'frame')
      );
    } else {
      // SOROBAN / SUANPAN: Smooth Wooden Frame + Reckoning Beam (Hari)
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

    // Sweeping mechanical reset bar (Gohassan)
    if (phase === 'sweeping_reset') {
      const sweepX = lerp(innerHalfW - 0.15, -innerHalfW + 0.15, sweepProgress);
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

    // Helper to enqueue a smooth 3D bead/stone into drawList
    const beadZ = isRoman ? frameHalfZ * 0.56 : 0;
    function pushBeadToDrawList(rx, by, style, col, glow, seed) {
      const pt = projectPoint({ x: rx, y: by, z: beadZ }, yaw, pitch, roll, camDist, fovScale);
      const topPt = projectPoint({ x: rx, y: by + beadHalfH, z: beadZ }, yaw, pitch, roll, camDist, fovScale);
      const botPt = projectPoint({ x: rx, y: by - beadHalfH, z: beadZ }, yaw, pitch, roll, camDist, fovScale);
      const leftPt = projectPoint({ x: rx - beadRadius, y: by, z: beadZ }, yaw, pitch, roll, camDist, fovScale);
      const rightPt = projectPoint({ x: rx + beadRadius, y: by, z: beadZ }, yaw, pitch, roll, camDist, fovScale);
      if (!pt || !topPt || !botPt || !leftPt || !rightPt) return;

      const rxPx = Math.max(4, Math.hypot(rightPt.x - leftPt.x, rightPt.y - leftPt.y) * 0.5);
      const ryPx = Math.max(4, Math.hypot(topPt.x - botPt.x, topPt.y - botPt.y) * 0.5);

      drawList.push({
        kind: 'smooth_bead',
        zSort: pt.z + 0.08,
        pt,
        topPt,
        botPt,
        leftPt,
        rightPt,
        rxPx,
        ryPx,
        style,
        col,
        glow,
        seed
      });
    }

    // 2. Integer Columns (0..12)
    const upperCount = isSuanpan ? 2 : 1;
    const lowerCount = isSuanpan ? 5 : 4;

    for (let r = 0; r < ROD_COUNT; r++) {
      const rx = getColX(r);
      const digit = rodDigits[r] || 0;
      const glow = rodGlow[r] || 0;

      // Upper deck beads / calculi stones (value 5)
      for (let b = 0; b < upperCount; b++) {
        const restY = topInnerY - beadHalfH * 1.35 - (upperCount - 1 - b) * (beadHalfH * 2.15);
        const activeY = beamY + beamHalfH + beadHalfH * 1.25 + b * (beadHalfH * 2.15);
        const t = upperBeadPos[r][b] || 0;
        const by = lerp(restY, activeY, t);
        const isActive = t > 0.45;
        const baseCol = isActive ? theme.beadActiveUpper : theme.beadIdleUpper;
        const col = {
          r: Math.round(lerp(baseCol.r, theme.beadCarryGlow.r, glow * 0.65)),
          g: Math.round(lerp(baseCol.g, theme.beadCarryGlow.g, glow * 0.65)),
          b: Math.round(lerp(baseCol.b, theme.beadCarryGlow.b, glow * 0.65))
        };
        pushBeadToDrawList(rx, by, abacusStyle, col, glow, r * 17 + b);
      }

      // Lower deck beads / calculi stones (value 1)
      for (let b = 0; b < lowerCount; b++) {
        const activeY = beamY - beamHalfH - beadHalfH * 1.25 - b * (beadHalfH * 2.1);
        const restY = botInnerY + beadHalfH * 1.35 + (lowerCount - 1 - b) * (beadHalfH * 2.1);
        const t = lowerBeadPos[r][b] || 0;
        const by = lerp(restY, activeY, t);
        const isActive = t > 0.45;
        const baseCol = isActive ? theme.beadActiveLower : theme.beadIdleLower;
        const col = {
          r: Math.round(lerp(baseCol.r, theme.beadCarryGlow.r, glow * 0.65)),
          g: Math.round(lerp(baseCol.g, theme.beadCarryGlow.g, glow * 0.65)),
          b: Math.round(lerp(baseCol.b, theme.beadCarryGlow.b, glow * 0.65))
        };
        pushBeadToDrawList(rx, by, abacusStyle, col, glow, r * 31 + b + 50);
      }

      if (isRoman) {
        const uTop = projectPoint({ x: rx, y: topInnerY - 0.22, z: frameHalfZ * 0.5 }, yaw, pitch, roll, camDist, fovScale);
        const uBot = projectPoint({ x: rx, y: beamY + beamHalfH + 0.2, z: frameHalfZ * 0.5 }, yaw, pitch, roll, camDist, fovScale);
        const lTop = projectPoint({ x: rx, y: beamY - beamHalfH - 0.2, z: frameHalfZ * 0.5 }, yaw, pitch, roll, camDist, fovScale);
        const lBot = projectPoint({ x: rx, y: botInnerY + 0.22, z: frameHalfZ * 0.5 }, yaw, pitch, roll, camDist, fovScale);
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

    // 3. Roman Right-Hand Fractional Columns:
    //    Col 13 = Θ (Unciae 1/12: 1 upper stone = 6/12 semis, 5 lower stones = 1/12 each)
    //    Col 14 = Classic Roman 1/3rd Fractional Space (Triens / Duella groove with 2 stones = 1/3 each)
    if (isRoman) {
      const rxUncia = getColX(13);
      const rxThirds = getColX(14);
      const fracGlow = Math.max(rodGlow[13] || 0, rodGlow[14] || 0);

      // Col 13 (Θ Unciae) grooves
      const uTop13 = projectPoint({ x: rxUncia, y: topInnerY - 0.22, z: frameHalfZ * 0.5 }, yaw, pitch, roll, camDist, fovScale);
      const uBot13 = projectPoint({ x: rxUncia, y: beamY + beamHalfH + 0.2, z: frameHalfZ * 0.5 }, yaw, pitch, roll, camDist, fovScale);
      const lTop13 = projectPoint({ x: rxUncia, y: beamY - beamHalfH - 0.2, z: frameHalfZ * 0.5 }, yaw, pitch, roll, camDist, fovScale);
      const lBot13 = projectPoint({ x: rxUncia, y: botInnerY + 0.22, z: frameHalfZ * 0.5 }, yaw, pitch, roll, camDist, fovScale);
      if (uTop13 && uBot13 && lTop13 && lBot13) {
        drawList.push({
          kind: 'roman_groove',
          zSort: (uTop13.z + lBot13.z) * 0.5 - 0.04,
          uTop: uTop13,
          uBot: uBot13,
          lTop: lTop13,
          lBot: lBot13,
          glow: fracGlow
        });
      }

      // Upper Semis (1/2 = 6/12) stone in Col 13
      {
        const restY = topInnerY - beadHalfH * 1.35;
        const activeY = beamY + beamHalfH + beadHalfH * 1.25;
        const by = lerp(restY, activeY, romanUnciaUpperPos);
        const baseCol = romanUnciaUpperPos > 0.45 ? theme.beadActiveUpper : theme.beadIdleUpper;
        const col = {
          r: Math.round(lerp(baseCol.r, theme.beadCarryGlow.r, fracGlow * 0.65)),
          g: Math.round(lerp(baseCol.g, theme.beadCarryGlow.g, fracGlow * 0.65)),
          b: Math.round(lerp(baseCol.b, theme.beadCarryGlow.b, fracGlow * 0.65))
        };
        pushBeadToDrawList(rxUncia, by, abacusStyle, col, fracGlow, 701);
      }

      // 5 Lower Uncia (1/12) stones in Col 13 (4 stones = 4/12 = 1/3rd!)
      for (let b = 0; b < 5; b++) {
        const activeY = beamY - beamHalfH - beadHalfH * 1.15 - b * (beadHalfH * 1.72);
        const restY = botInnerY + beadHalfH * 1.2 + (4 - b) * (beadHalfH * 1.72);
        const t = romanUnciaLowerPos[b] || 0;
        const by = lerp(restY, activeY, t);
        const baseCol = t > 0.45 ? theme.beadActiveLower : theme.beadIdleLower;
        const col = {
          r: Math.round(lerp(baseCol.r, theme.beadCarryGlow.r, fracGlow * 0.65)),
          g: Math.round(lerp(baseCol.g, theme.beadCarryGlow.g, fracGlow * 0.65)),
          b: Math.round(lerp(baseCol.b, theme.beadCarryGlow.b, fracGlow * 0.65))
        };
        pushBeadToDrawList(rxUncia, by, abacusStyle, col, fracGlow, 710 + b);
      }

      // Col 14: The Classic Roman 1/3rd Fractional Space (Rightmost Marginal Slot)
      // Upper inscription pocket + dedicated 1/3rd Triens/Duella groove with 2 calculi stones
      const tTop14 = projectPoint({ x: rxThirds, y: beamY - beamHalfH - 0.2, z: frameHalfZ * 0.5 }, yaw, pitch, roll, camDist, fovScale);
      const tBot14 = projectPoint({ x: rxThirds, y: botInnerY + 0.35, z: frameHalfZ * 0.5 }, yaw, pitch, roll, camDist, fovScale);
      const uTop14 = projectPoint({ x: rxThirds, y: topInnerY - 0.35, z: frameHalfZ * 0.5 }, yaw, pitch, roll, camDist, fovScale);
      const uBot14 = projectPoint({ x: rxThirds, y: beamY + beamHalfH + 0.2, z: frameHalfZ * 0.5 }, yaw, pitch, roll, camDist, fovScale);
      if (tTop14 && tBot14 && uTop14 && uBot14) {
        drawList.push({
          kind: 'roman_groove',
          zSort: (uTop14.z + tBot14.z) * 0.5 - 0.04,
          uTop: uTop14,
          uBot: uBot14,
          lTop: tTop14,
          lBot: tBot14,
          glow: fracGlow
        });
      }

      // 2 Calculi rocks in the 1/3rd groove (each = 1/3 unit)
      for (let b = 0; b < 2; b++) {
        const activeY = beamY - beamHalfH - beadHalfH * 1.35 - b * (beadHalfH * 2.25);
        const restY = botInnerY + beadHalfH * 1.55 + (1 - b) * (beadHalfH * 2.25);
        const t = romanThirdsPos[b] || 0;
        const by = lerp(restY, activeY, t);
        const baseCol = t > 0.45 ? theme.beadActiveUpper : theme.beadIdleLower;
        const col = {
          r: Math.round(lerp(baseCol.r, theme.beadCarryGlow.r, fracGlow * 0.75)),
          g: Math.round(lerp(baseCol.g, theme.beadCarryGlow.g, fracGlow * 0.75)),
          b: Math.round(lerp(baseCol.b, theme.beadCarryGlow.b, fracGlow * 0.75))
        };
        pushBeadToDrawList(rxThirds, by, abacusStyle, col, fracGlow, 820 + b);
      }
    }

    // Project all 3D frame/tablet faces
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

      const ambient = face.tag === 'frame' || face.tag === 'slab' ? 0.48 : 0.5;
      const lit = ambient + diff * 0.52;
      const specAdd = (face.tag === 'brass' ? 68 : 16) * spec;

      const r = clamp(Math.round(face.color.r * lit + specAdd), 0, 255);
      const g = clamp(Math.round(face.color.g * lit + specAdd), 0, 255);
      const b = clamp(Math.round(face.color.b * lit + specAdd), 0, 255);

      const zBias = face.tag === 'slab' ? -0.24 : 0;

      drawList.push({
        kind: 'face',
        tag: face.tag,
        zSort: zSum / projVerts.length + zBias,
        projVerts,
        fill: `rgb(${r}, ${g}, ${b})`
      });
    }

    // Painter's algorithm sort (back to front)
    drawList.sort((a, b) => a.zSort - b.zSort);

    for (let i = 0; i < drawList.length; i++) {
      const item = drawList[i];
      if (item.kind === 'rod') {
        ctx.save();
        ctx.strokeStyle = item.glow > 0.15 ? theme.accentHex : theme.rodColor;
        ctx.lineWidth = Math.max(1.8, item.pTop.persp * 0.055);
        ctx.beginPath();
        ctx.moveTo(item.pTop.x, item.pTop.y);
        ctx.lineTo(item.pBot.x, item.pBot.y);
        ctx.stroke();
        ctx.restore();
      } else if (item.kind === 'roman_groove') {
        ctx.save();
        ctx.lineCap = 'round';
        const grooveW = Math.max(5.5, item.uTop.persp * 0.22);
        const { r, g, b } = theme.grooveColor;

        // 1. Chiseled stone rim catch-light (right/bottom edge of carved slot)
        ctx.strokeStyle = item.glow > 0.18 ? theme.accentHex : 'rgba(255, 252, 244, 0.45)';
        ctx.lineWidth = grooveW + 3.0;
        ctx.beginPath();
        ctx.moveTo(item.uTop.x + 1.0, item.uTop.y + 0.8);
        ctx.lineTo(item.uBot.x + 1.0, item.uBot.y + 0.8);
        ctx.moveTo(item.lTop.x + 1.0, item.lTop.y + 0.8);
        ctx.lineTo(item.lBot.x + 1.0, item.lBot.y + 0.8);
        ctx.stroke();

        // 2. Dark recessed stone shadow wall (left/top inner wall of carved slot)
        ctx.strokeStyle = 'rgba(12, 10, 8, 0.88)';
        ctx.lineWidth = grooveW + 1.4;
        ctx.beginPath();
        ctx.moveTo(item.uTop.x - 0.8, item.uTop.y - 0.6);
        ctx.lineTo(item.uBot.x - 0.8, item.uBot.y - 0.6);
        ctx.moveTo(item.lTop.x - 0.8, item.lTop.y - 0.6);
        ctx.lineTo(item.lBot.x - 0.8, item.lBot.y - 0.6);
        ctx.stroke();

        // 3. Deep carved sulcus channel floor
        ctx.strokeStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.lineWidth = grooveW * 0.78;
        ctx.beginPath();
        ctx.moveTo(item.uTop.x, item.uTop.y);
        ctx.lineTo(item.uBot.x, item.uBot.y);
        ctx.moveTo(item.lTop.x, item.lTop.y);
        ctx.lineTo(item.lBot.x, item.lBot.y);
        ctx.stroke();
        ctx.restore();
      } else if (item.kind === 'smooth_bead') {
        drawSmoothBead(item, theme);
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
        ctx.strokeStyle = item.fill;
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }
    }

    // 4. Chiseled Roman Tablet Details (Separator Groove, Marble Veins, Column Numerals, Θ & ⅓ Labels)
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (isRoman) {
      // Subtle 3D marble veining across the stone tablet face
      const veins = [
        [
          { x: -innerHalfW * 0.92, y: topInnerY * 0.85 },
          { x: -innerHalfW * 0.45, y: beamY + 0.4 },
          { x: innerHalfW * 0.12, y: -0.6 },
          { x: innerHalfW * 0.65, y: botInnerY * 0.88 }
        ],
        [
          { x: -innerHalfW * 0.75, y: botInnerY * 0.72 },
          { x: -innerHalfW * 0.18, y: -0.25 },
          { x: innerHalfW * 0.38, y: beamY + 0.55 },
          { x: innerHalfW * 0.88, y: topInnerY * 0.78 }
        ]
      ];
      ctx.strokeStyle = 'rgba(120, 113, 108, 0.24)';
      ctx.lineWidth = 1.3;
      for (let vIdx = 0; vIdx < veins.length; vIdx++) {
        const vPts = veins[vIdx];
        ctx.beginPath();
        let started = false;
        for (let k = 0; k < vPts.length; k++) {
          const vp = projectPoint({ x: vPts[k].x, y: vPts[k].y, z: frameHalfZ * 0.5 }, yaw, pitch, roll, camDist, fovScale);
          if (!vp) continue;
          if (!started) {
            ctx.moveTo(vp.x, vp.y);
            started = true;
          } else {
            ctx.lineTo(vp.x, vp.y);
          }
        }
        if (started) ctx.stroke();
      }

      // Chiseled vertical separator groove and recessed border around the right-hand Fractional (Θ & ⅓) Space
      const sepX = (getColX(12) + getColX(13)) * 0.5;
      const fracRightX = innerHalfW - 0.14;
      const sepTop = projectPoint({ x: sepX, y: topInnerY - 0.08, z: frameHalfZ * 0.52 }, yaw, pitch, roll, camDist, fovScale);
      const sepBot = projectPoint({ x: sepX, y: botInnerY + 0.08, z: frameHalfZ * 0.52 }, yaw, pitch, roll, camDist, fovScale);
      const frTop = projectPoint({ x: fracRightX, y: topInnerY - 0.08, z: frameHalfZ * 0.52 }, yaw, pitch, roll, camDist, fovScale);
      const frBot = projectPoint({ x: fracRightX, y: botInnerY + 0.08, z: frameHalfZ * 0.52 }, yaw, pitch, roll, camDist, fovScale);
      if (sepTop && sepBot && frTop && frBot) {
        ctx.strokeStyle = 'rgba(28, 24, 20, 0.75)';
        ctx.lineWidth = Math.max(2.0, sepTop.persp * 0.055);
        ctx.beginPath();
        ctx.moveTo(sepTop.x, sepTop.y);
        ctx.lineTo(sepBot.x, sepBot.y);
        ctx.lineTo(frBot.x, frBot.y);
        ctx.lineTo(frTop.x, frTop.y);
        ctx.closePath();
        ctx.stroke();
      }

      // Chiseled horizontal Roman inscription groove across the center bridge
      const brL = projectPoint({ x: -innerHalfW + 0.15, y: beamY + beamHalfH * 0.85, z: frameHalfZ * 0.52 }, yaw, pitch, roll, camDist, fovScale);
      const brR = projectPoint({ x: innerHalfW - 0.15, y: beamY + beamHalfH * 0.85, z: frameHalfZ * 0.52 }, yaw, pitch, roll, camDist, fovScale);
      const brL2 = projectPoint({ x: -innerHalfW + 0.15, y: beamY - beamHalfH * 0.85, z: frameHalfZ * 0.52 }, yaw, pitch, roll, camDist, fovScale);
      const brR2 = projectPoint({ x: innerHalfW - 0.15, y: beamY - beamHalfH * 0.85, z: frameHalfZ * 0.52 }, yaw, pitch, roll, camDist, fovScale);
      if (brL && brR && brL2 && brR2) {
        ctx.strokeStyle = 'rgba(42, 36, 30, 0.55)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(brL.x, brL.y);
        ctx.lineTo(brR.x, brR.y);
        ctx.moveTo(brL2.x, brL2.y);
        ctx.lineTo(brR2.x, brR2.y);
        ctx.stroke();
      }

      // Chiseled labels for Col 13 (Θ Uncia 1/12) and Col 14 (⅓ Triens / Duella Fractional Space)
      const fracCols = [
        { idx: 13, sym: 'Θ', sub: `${fracThirds * 4}/12` },
        { idx: 14, sym: '⅓', sub: `${fracThirds}/3` }
      ];
      for (let f = 0; f < fracCols.length; f++) {
        const fc = fracCols[f];
        const fx = getColX(fc.idx);
        const romPt = projectPoint({ x: fx, y: beamY, z: frameHalfZ * 0.56 }, yaw, pitch, roll, camDist, fovScale);
        if (romPt) {
          const romPx = Math.round(clamp(romPt.persp * 0.21, 10, 18));
          ctx.font = `700 ${romPx}px "Cinzel", "Times New Roman", serif`;
          ctx.fillStyle = activeFocusCol >= 13 || fracThirds > 0 ? theme.accentHex : 'rgba(28, 25, 23, 0.95)';
          ctx.fillText(fc.sym, romPt.x, romPt.y);
        }
        const botPt = projectPoint({ x: fx, y: outerBotY - 0.44, z: 0 }, yaw, pitch, roll, camDist, fovScale);
        if (botPt) {
          const fontPx = Math.round(clamp(botPt.persp * 0.24, 11, 20));
          ctx.font = `700 ${fontPx}px "JetBrains Mono", "Fira Code", monospace`;
          ctx.fillStyle = fracThirds > 0 || activeFocusCol >= 13 ? theme.accentHex : 'rgba(226, 232, 240, 0.72)';
          ctx.fillText(fc.sub, botPt.x, botPt.y);
        }
      }
    }

    for (let r = 0; r < ROD_COUNT; r++) {
      const rx = getColX(r);
      const power = ROD_COUNT - 1 - r;

      if (isRoman) {
        const romPt = projectPoint(
          { x: rx, y: beamY, z: frameHalfZ * 0.56 },
          yaw,
          pitch,
          roll,
          camDist,
          fovScale
        );
        if (romPt) {
          const romPx = Math.round(clamp(romPt.persp * 0.19, 9, 16));
          ctx.font = `700 ${romPx}px "Cinzel", "Times New Roman", serif`;
          ctx.fillStyle = r === activeFocusCol ? theme.accentHex : 'rgba(28, 25, 23, 0.92)';
          ctx.fillText(ROMAN_COL_LABELS[r], romPt.x, romPt.y);
        }
      } else if (power % 3 === 0) {
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

      // Floating 3D digit readout beneath each integer column
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
        const isCurrentTarget = r === activeFocusCol;
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
        const suffix = !isRoman && r === 12 && fracThirds > 0 ? (fracThirds === 1 ? '⅓' : '⅔') : '';
        ctx.fillText(`${d}${suffix}`, labelPt.x, labelPt.y);
      }
    }

    // 5. Carry / Addition Ripple Rings
    for (let i = 0; i < carryRipples.length; i++) {
      const rp = carryRipples[i];
      if (!isRoman && rp.rodIdx >= ROD_COUNT) continue;
      const rx = getColX(Math.min(rp.rodIdx, totalCols - 1));
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
    const boxW = Math.min(610, width - 44);
    const boxH = abacusStyle === 'roman_calculi' ? 144 : 124;

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
        ? 'ROMAN TABULA ABACI (STONE SULCI, CALCULI & ⅓ SPACE)'
        : abacusStyle === 'suanpan_2_5'
        ? 'CHINESE SUANPAN (2:5 SMOOTH OBLATE BEADS)'
        : abacusStyle === 'russian_schoty'
        ? 'RUSSIAN SCHOTY (СЧЁТЫ — 10-BEAD ARCHED WIRES & ⅓ ROW)'
        : 'JAPANESE SOROBAN (1:4 SMOOTH HISHI-DAMA BEADS)';

    ctx.fillStyle = theme.accentHex;
    ctx.font = '700 13.5px "Inter", "Segoe UI", sans-serif';
    ctx.fillText(`3D ABACUS (RIGHT-TO-LEFT) — ${styleTitle}`, padX + 14, padY + 24);

    ctx.fillStyle = 'rgba(226, 232, 240, 0.95)';
    ctx.font = '700 20px "JetBrains Mono", "Fira Code", monospace';
    const paddedRegister = formatWithCommas(currentTotal, fracThirds).padStart(15, ' ');
    ctx.fillText(`REGISTER: ${paddedRegister}`, padX + 14, padY + 52);

    let nextY = padY + 78;
    if (abacusStyle === 'roman_calculi') {
      ctx.fillStyle = 'rgba(253, 224, 71, 0.92)';
      ctx.font = '600 11.5px "JetBrains Mono", "Fira Code", monospace';
      ctx.fillText(`ROMAN CALCULI: ${formatRomanRegister(currentTotal, fracThirds)}`, padX + 14, nextY);
      nextY += 22;
    }

    ctx.fillStyle = 'rgba(186, 230, 253, 0.92)';
    ctx.font = '600 11.5px "JetBrains Mono", "Fira Code", monospace';
    ctx.fillText(lastActionDesc, padX + 14, nextY);

    const targetFormula =
      drillMode === 'complement_987654321'
        ? 'Right-to-Left Identity: 123,456,789 + 987,654,321 = 1,111,111,110'
        : drillMode === 'thirds_calculus'
        ? 'Roman ⅓ Fractional Calculus: ∑(k=1..9) 123,456,789⅓ = 1,111,111,104'
        : drillMode === 'fibonacci_cascade'
        ? 'Right-to-Left Fibonacci: F_n = F_{n-1} + F_{n-2} (lim F_{n+1}/F_n = φ ≈ 1.6180339)'
        : 'Right-to-Left 123456789 Drill (with ⅓ + ⅔ = 1 Carry): ∑(k=1..9) 123,456,789 = 1,111,111,101';

    ctx.fillStyle = 'rgba(148, 163, 184, 0.9)';
    ctx.font = '500 11px "JetBrains Mono", "Fira Code", monospace';
    ctx.fillText(targetFormula, padX + 14, nextY + 22);

    // Right-side 9-Step Multiplication/Addition Ledger
    if (drillMode !== 'fibonacci_cascade' && width >= 820) {
      const ledgerW = 298;
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
      ctx.fillText(
        drillMode === 'thirds_calculus' ? '123,456,789⅓ × 9 DRILL LEDGER' : '123,456,789 × 9 DRILL LEDGER',
        lx + 14,
        ly + 22
      );

      ctx.font = '500 11px "JetBrains Mono", "Fira Code", monospace';
      for (let step = 1; step <= 9; step++) {
        const expectedInt = ADDEND * step + (drillMode === 'thirds_calculus' ? Math.floor(step / 3) : 0);
        const expectedThirds = drillMode === 'thirds_calculus' ? step % 3 : 0;
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
          `${marker} ×${step}: ${formatWithCommas(expectedInt, expectedThirds).padStart(15, ' ')}`,
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
      const clearedCount = Math.floor(sweepProgress * (ROD_COUNT + 1));
      if (clearedCount >= 1) fracThirds = 0;
      for (let c = 0; c < Math.min(ROD_COUNT, clearedCount); c++) {
        rodDigits[ROD_COUNT - 1 - c] = 0;
      }
      syncTotalFromRods();
      if (sweepProgress >= 1.05) {
        stepDrillLogic(drillMode, isAutoCycleStyle);
      }
    } else {
      stepTimer += safeDt * calcSpeed;
      const interval = phase === 'milestone_pause' ? 2.2 : 0.24;
      if (stepTimer >= interval) {
        stepTimer = 0;
        stepDrillLogic(drillMode, isAutoCycleStyle);
      }
    }

    updateBeadPhysics(safeDt);

    // 1. Background
    drawBackground(theme);

    // 2. Smooth 3D orbital & pendulum rotation
    const yaw = Math.sin(simTime * 0.55) * 0.58 + Math.cos(simTime * 0.23) * 0.16;
    const basePitch = (tiltAngleDeg * Math.PI) / 180;
    const pitch = basePitch + Math.sin(simTime * 0.41) * 0.15;
    const roll = Math.sin(simTime * 0.33) * 0.08;

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

    // 4. Render 3D Abacus Frame / Stone Table / Russian Schoty & Smooth Beads / Calculi Rocks
    renderAbacus3D(abacusStyle, theme, yaw, pitch, roll, fovScale);

    // 5. Render Arithmetic Ledger & Telemetry HUD
    if (showHud) {
      drawHud(drillMode, abacusStyle, theme);
    }
  }

  function destroy() {}

  return { render, resize, destroy };
}
