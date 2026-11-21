// Zource: Git Self-Hosting History Screensaver (zourcegit.js)
//
// Faithful Wayland WebGL/Canvas port of `zource` v0.1.4 (File-Count-Driven Faceted
// Polyhedron Directory Shells + 2D Radial Tree) replaying authentic chronological commits
// from `git/git` — starting at Linus Torvalds's April 7, 2005 initial commit (e83c51633:
// 'Initial revision of "git", the information manager from hell') through 21+ years of
// Git developing Git (builtin/, Documentation/, t/, refs/, reftable/, scalar/, compat/, rust/).

import { GIT_AUTHORS, GIT_PATHS, GIT_COMMITS } from './zourceGitData.js';

const GOLDEN_ANGLE = 2.39996323;
const TAU = Math.PI * 2;
const POLY_MIN_VERTS = 4;
const POLY_MAX_VERTS = 42;

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function hashString(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function hslToRgb(hDeg, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = ((hDeg % 360) + 360) % 360 / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r1 = 0;
  let g1 = 0;
  let b1 = 0;
  if (hp < 1) {
    r1 = c; g1 = x;
  } else if (hp < 2) {
    r1 = x; g1 = c;
  } else if (hp < 3) {
    g1 = c; b1 = x;
  } else if (hp < 4) {
    g1 = x; b1 = c;
  } else if (hp < 5) {
    r1 = x; b1 = c;
  } else {
    r1 = c; b1 = x;
  }
  const m = l - c * 0.5;
  return [
    Math.round(clamp((r1 + m) * 255, 0, 255)),
    Math.round(clamp((g1 + m) * 255, 0, 255)),
    Math.round(clamp((b1 + m) * 255, 0, 255))
  ];
}

function rgbToHsl(rgb) {
  const r = rgb[0] / 255;
  const g = rgb[1] / 255;
  const b = rgb[2] / 255;
  const maxV = Math.max(r, g, b);
  const minV = Math.min(r, g, b);
  const l = (maxV + minV) * 0.5;
  const d = maxV - minV;
  if (d < 0.0001) return { h: 205, s: 0.25, l };
  const s = l > 0.5 ? d / (2 - maxV - minV) : d / (maxV + minV);
  let h = 0;
  if (maxV === r) {
    h = (g - b) / d + (g < b ? 6 : 0);
  } else if (maxV === g) {
    h = (b - r) / d + 2;
  } else {
    h = (r - g) / d + 4;
  }
  return { h: h * 60, s, l };
}

function facetColor(baseRgb, faceIdx, dirSeed) {
  const hsl = rgbToHsl(baseRgb);
  const seedF = (dirSeed % 997) * 0.001003;
  const u = (faceIdx * 0.6180339887 + seedF) % 1;
  const v = (faceIdx * 0.3819660113 + seedF * 1.7) % 1;
  const hueShift = (u * 2 - 1) * 32;
  const sat = clamp(hsl.s * (0.85 + v * 0.30), 0.28, 0.78);
  const light = clamp(hsl.l * (0.86 + (1 - v) * 0.24), 0.36, 0.74);
  return hslToRgb(hsl.h + hueShift, sat, light);
}

function createPolyMesh() {
  const verts = [];
  const faces = [];
  const edges = [];
  const edgeSet = new Set();

  function addVert(x, y, z) {
    const len = Math.hypot(x, y, z);
    const idx = verts.length;
    if (len > 1e-6) {
      verts.push({ x: x / len, y: y / len, z: z / len });
    } else {
      verts.push({ x: 0, y: 1, z: 0 });
    }
    return idx;
  }

  function addEdge(a, b) {
    const u = a < b ? a : b;
    const v = a < b ? b : a;
    const key = u * 64 + v;
    if (edgeSet.has(key)) return;
    edgeSet.add(key);
    edges.push([u, v]);
  }

  function addFace(a, b, c) {
    const va = verts[a];
    const vb = verts[b];
    const vc = verts[c];
    const e1x = vb.x - va.x;
    const e1y = vb.y - va.y;
    const e1z = vb.z - va.z;
    const e2x = vc.x - va.x;
    const e2y = vc.y - va.y;
    const e2z = vc.z - va.z;
    const cx = e1y * e2z - e1z * e2y;
    const cy = e1z * e2x - e1x * e2z;
    const cz = e1x * e2y - e1y * e2x;
    const dotOut = cx * (va.x + vb.x + vc.x) + cy * (va.y + vb.y + vc.y) + cz * (va.z + vb.z + vc.z);
    if (dotOut >= 0) {
      faces.push([a, b, c]);
    } else {
      faces.push([a, c, b]);
    }
    addEdge(a, b);
    addEdge(b, c);
    addEdge(c, a);
  }

  return { verts, faces, edges, addVert, addFace };
}

function buildTetrahedron() {
  const m = createPolyMesh();
  m.addVert(1, 1, 1);
  m.addVert(1, -1, -1);
  m.addVert(-1, 1, -1);
  m.addVert(-1, -1, 1);
  m.addFace(0, 1, 2);
  m.addFace(0, 2, 3);
  m.addFace(0, 3, 1);
  m.addFace(1, 3, 2);
  return m;
}

function buildSquareAntiprism() {
  const m = createPolyMesh();
  const yOff = 0.56;
  const rad = Math.sqrt(1 - yOff * yOff);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU;
    m.addVert(Math.cos(a) * rad, yOff, Math.sin(a) * rad);
  }
  for (let i = 0; i < 4; i++) {
    const a = ((i + 0.5) / 4) * TAU;
    m.addVert(Math.cos(a) * rad, -yOff, Math.sin(a) * rad);
  }
  m.addFace(0, 2, 1);
  m.addFace(0, 3, 2);
  for (let i = 0; i < 4; i++) {
    const next = (i + 1) % 4;
    m.addFace(i, next, 4 + i);
    m.addFace(next, 4 + next, 4 + i);
  }
  m.addFace(4, 5, 6);
  m.addFace(4, 6, 7);
  return m;
}

function buildIcosahedron() {
  const m = createPolyMesh();
  const phi = 1.618033988749895;
  const raw = [
    [-1, phi, 0], [1, phi, 0], [-1, -phi, 0], [1, -phi, 0],
    [0, -1, phi], [0, 1, phi], [0, -1, -phi], [0, 1, -phi],
    [phi, 0, -1], [phi, 0, 1], [-phi, 0, -1], [-phi, 0, 1]
  ];
  for (let i = 0; i < raw.length; i++) {
    m.addVert(raw[i][0], raw[i][1], raw[i][2]);
  }
  const tris = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
    [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
    [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]
  ];
  for (let i = 0; i < tris.length; i++) {
    m.addFace(tris[i][0], tris[i][1], tris[i][2]);
  }
  return m;
}

function buildPolarRingPolyhedron(vTotal) {
  const m = createPolyMesh();
  const rem = vTotal - 2;
  const ringCount = rem <= 5 ? 1 : rem <= 14 ? 2 : rem <= 26 ? 3 : 4;
  const ringSizes = new Array(ringCount).fill(0);
  const weights = new Array(ringCount).fill(0);
  let weightSum = 0;
  for (let r = 0; r < ringCount; r++) {
    const theta = Math.PI * ((r + 1) / (ringCount + 1));
    weights[r] = Math.sin(theta);
    weightSum += weights[r];
  }
  let assigned = 0;
  for (let r = 0; r < ringCount; r++) {
    ringSizes[r] = Math.max(3, Math.round(rem * (weights[r] / weightSum)));
    assigned += ringSizes[r];
  }
  while (assigned < rem) {
    let bestR = 0;
    let bestDef = -1e9;
    for (let r = 0; r < ringCount; r++) {
      const def = rem * (weights[r] / weightSum) - ringSizes[r];
      if (def > bestDef) {
        bestDef = def;
        bestR = r;
      }
    }
    ringSizes[bestR]++;
    assigned++;
  }
  while (assigned > rem) {
    let bestR = 0;
    let bestSur = -1e9;
    for (let r = 0; r < ringCount; r++) {
      if (ringSizes[r] <= 3) continue;
      const sur = ringSizes[r] - rem * (weights[r] / weightSum);
      if (sur > bestSur) {
        bestSur = sur;
        bestR = r;
      }
    }
    ringSizes[bestR]--;
    assigned--;
  }

  const northIdx = m.addVert(0, 1, 0);
  const ringStarts = new Array(ringCount).fill(0);
  for (let r = 0; r < ringCount; r++) {
    ringStarts[r] = m.verts.length;
    const theta = Math.PI * ((r + 1) / (ringCount + 1));
    const y = Math.cos(theta);
    const rad = Math.sin(theta);
    const k = ringSizes[r];
    const phase = (r & 1) === 1 ? Math.PI / k : 0;
    for (let j = 0; j < k; j++) {
      const ang = phase + (j / k) * TAU;
      m.addVert(Math.cos(ang) * rad, y, Math.sin(ang) * rad);
    }
  }
  const southIdx = m.addVert(0, -1, 0);

  const k0 = ringSizes[0];
  const s0 = ringStarts[0];
  for (let j = 0; j < k0; j++) {
    m.addFace(northIdx, s0 + ((j + 1) % k0), s0 + j);
  }
  for (let r = 0; r < ringCount - 1; r++) {
    const ka = ringSizes[r];
    const kb = ringSizes[r + 1];
    const sa = ringStarts[r];
    const sb = ringStarts[r + 1];
    let ia = 0;
    let ib = 0;
    while (ia < ka || ib < kb) {
      const progA = (ia + 0.5) / ka;
      const progB = (ib + 0.5) / kb;
      const a0 = sa + (ia % ka);
      const b0 = sb + (ib % kb);
      if (ia < ka && (ib === kb || progA <= progB)) {
        m.addFace(a0, sa + ((ia + 1) % ka), b0);
        ia++;
      } else {
        m.addFace(a0, sb + ((ib + 1) % kb), b0);
        ib++;
      }
    }
  }
  const kl = ringSizes[ringCount - 1];
  const sl = ringStarts[ringCount - 1];
  for (let j = 0; j < kl; j++) {
    m.addFace(southIdx, sl + j, sl + ((j + 1) % kl));
  }
  return m;
}

const POLY_MESH_CACHE = new Map();
function meshForFileCount(fileCount) {
  const v = clamp(Math.floor(fileCount || POLY_MIN_VERTS), POLY_MIN_VERTS, POLY_MAX_VERTS);
  let cached = POLY_MESH_CACHE.get(v);
  if (!cached) {
    if (v === 4) cached = buildTetrahedron();
    else if (v === 8) cached = buildSquareAntiprism();
    else if (v === 12) cached = buildIcosahedron();
    else cached = buildPolarRingPolyhedron(v);
    POLY_MESH_CACHE.set(v, cached);
  }
  return cached;
}

function colorForPath(path) {
  const slashIdx = path.lastIndexOf('/');
  const base = slashIdx >= 0 ? path.slice(slashIdx + 1) : path;
  const dotIdx = base.lastIndexOf('.');
  const ext = (dotIdx >= 0 ? base.slice(dotIdx + 1) : base).toLowerCase();

  if (ext === 'c' || ext === 'h') return [76, 194, 255];
  if (ext === 'sh' || base === 'Makefile' || ext === 'mak') return [251, 146, 160];
  if (ext === 'txt' || ext === 'md' || ext === 'adoc') return [192, 168, 250];
  if (ext === 'perl' || ext === 'pl' || ext === 'pm') return [245, 208, 51];
  if (ext === 'py') return [82, 152, 255];
  if (ext === 'rs') return [232, 104, 60];
  if (ext === 'zig') return [247, 164, 29];
  if (ext === 'tcl' || ext === 'po') return [66, 211, 146];
  if (ext === 'yml' || ext === 'yaml' || ext === 'json' || ext === 'toml') return [110, 231, 183];

  const h = hashString(ext);
  return hslToRgb(h % 360, 0.78, 0.62);
}

function colorForAuthor(name) {
  const h = Math.imul(hashString(name), 73) >>> 0;
  return hslToRgb(h % 360, 0.85, 0.68);
}

function fibonacciDirection(index, total, seed) {
  const n = Math.max(total, 1);
  const i = index + 0.5;
  const phase = (seed % 1024) * 0.0061359;
  const y = 1.0 - (2.0 * i) / n;
  const r = Math.sqrt(Math.max(0.0, 1.0 - y * y));
  const theta = GOLDEN_ANGLE * i + phase;
  return {
    x: Math.cos(theta) * r,
    y,
    z: Math.sin(theta) * r
  };
}

function formatUtcDate(epochSec) {
  const d = new Date(Math.max(0, epochSec) * 1000);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function rgbaStr(rgb, a) {
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${clamp(a, 0, 1).toFixed(3)})`;
}

function selectCommitSlice(eraMode) {
  if (!GIT_COMMITS || GIT_COMMITS.length === 0) return [];
  if (eraMode === 'genesis_2005') {
    // First ~160 commits covering 2005 birth & early self-hosting of Git
    return GIT_COMMITS.slice(0, Math.min(165, GIT_COMMITS.length));
  }
  if (eraMode === 'modern_subsystems') {
    // Seed initial core structure, then jump into 2018-2026 subsystems (commit-graph, reftable, scalar, rust)
    const startIdx = Math.max(0, Math.floor(GIT_COMMITS.length * 0.62));
    return GIT_COMMITS.slice(startIdx);
  }
  return GIT_COMMITS;
}

export function createZourceGit(canvas, getParams) {
  const ctx = canvas.getContext('2d');

  let width = canvas.width || 1280;
  let height = canvas.height || 720;

  // Simulation graph state (mirrors zource/src/sim.zig)
  let dirs = [];
  let dirLookup = new Map();
  let files = [];
  let fileLookup = new Map();
  let authors = [];
  let authorLookup = new Map();
  let beams = [];
  let particles = [];

  let activeEra = '';
  let commitSlice = [];
  let commitCursor = 0;
  let simTime = 0;
  let startTime = 0;
  let endTime = 1;
  let activeFileCount = 0;
  let totalCommitsApplied = 0;

  let lastCommitHash = 'e83c51633';
  let lastCommitMsg = 'Initial revision of "git", the information manager from hell';
  let lastAuthorName = 'Linus Torvalds';

  let phaseClock = 0;
  let morphClock = 0;
  let morphTarget3D = 1.0;
  let blend3D = 1.0;
  let camYaw = 0.45;
  let camPitch = 0.30;
  let camZoom = 1.0;
  let postFinishHold = 0;

  function resetSimulation(eraMode) {
    activeEra = eraMode || 'full_chronicle';
    commitSlice = selectCommitSlice(activeEra);

    dirs = [
      {
        parent: -1,
        name: 'git',
        fullPath: '',
        depth: 0,
        childDirs: [],
        files: [],
        aliveFiles: 0,
        subtreeFiles: 0,
        angleHint: 0,
        orbitUnit: { x: 0, y: 1, z: 0 },
        pos2x: 0,
        pos2y: 0,
        vel2x: 0,
        vel2y: 0,
        pos3x: 0,
        pos3y: 0,
        pos3z: 0,
        vel3x: 0,
        vel3y: 0,
        vel3z: 0,
        bubbleRadius: 28.0,
        heat: 0.6,
        seed: 7,
        tint: [90, 155, 235]
      }
    ];
    dirLookup = new Map([['', 0]]);
    files = [];
    fileLookup = new Map();
    authors = [];
    authorLookup = new Map();
    beams = [];
    particles = [];
    activeFileCount = 0;
    totalCommitsApplied = 0;
    commitCursor = 0;
    postFinishHold = 0;

    if (commitSlice.length > 0) {
      startTime = commitSlice[0][0];
      endTime = commitSlice[commitSlice.length - 1][0];
      simTime = startTime;

      // In modern_subsystems mode, pre-seed the initial 35 genesis commits without FX so core tree exists
      if (activeEra === 'modern_subsystems' && GIT_COMMITS.length > 40) {
        for (let i = 0; i < 35; i++) {
          applyCommitRecord(GIT_COMMITS[i], false);
        }
      }
      // Immediately apply commit #0 so screen starts populated on frame 1
      applyCommitRecord(commitSlice[0], true);
      commitCursor = 1;
    } else {
      startTime = 1112911993;
      endTime = 1794840000;
      simTime = startTime;
    }
  }

  function ensureDirChain(dirPath) {
    if (!dirPath || dirPath === '.') return 0;
    const existing = dirLookup.get(dirPath);
    if (existing !== undefined) return existing;

    const slash = dirPath.lastIndexOf('/');
    const parentPath = slash >= 0 ? dirPath.slice(0, slash) : '';
    const baseName = slash >= 0 ? dirPath.slice(slash + 1) : dirPath;
    const parentIdx = ensureDirChain(parentPath);

    const parent = dirs[parentIdx];
    const newIdx = dirs.length;
    const siblingSlot = parent.childDirs.length;
    const seed = hashString(dirPath);
    const angle = (seed % 6283) * 0.001 + siblingSlot * GOLDEN_ANGLE;
    const unit3 = fibonacciDirection(siblingSlot, siblingSlot + 6, seed);
    const spawnDist = parentIdx === 0 ? 92.0 : 62.0;

    dirs.push({
      parent: parentIdx,
      name: baseName,
      fullPath: dirPath,
      depth: parent.depth + 1,
      childDirs: [],
      files: [],
      aliveFiles: 0,
      subtreeFiles: 0,
      angleHint: angle,
      orbitUnit: unit3,
      pos2x: parent.pos2x + Math.cos(angle) * spawnDist,
      pos2y: parent.pos2y + Math.sin(angle) * spawnDist,
      vel2x: 0,
      vel2y: 0,
      pos3x: parent.pos3x + unit3.x * spawnDist,
      pos3y: parent.pos3y + unit3.y * spawnDist,
      pos3z: parent.pos3z + unit3.z * spawnDist,
      vel3x: 0,
      vel3y: 0,
      vel3z: 0,
      bubbleRadius: 18.0,
      heat: 1.0,
      seed,
      tint: [90, 155, 235]
    });
    parent.childDirs.push(newIdx);
    dirLookup.set(dirPath, newIdx);

    const sibs = parent.childDirs;
    const denom = Math.max(sibs.length, 3);
    for (let k = 0; k < sibs.length; k++) {
      const sib = dirs[sibs[k]];
      const sibSeed = hashString(sib.fullPath);
      sib.orbitUnit = fibonacciDirection(k, sibs.length, sibSeed);
      sib.angleHint = parent.angleHint + (k - sibs.length * 0.5) * (TAU / denom);
    }

    return newIdx;
  }

  function ensureAuthor(name) {
    const existing = authorLookup.get(name);
    if (existing !== undefined) return existing;
    const idx = authors.length;
    const seed = hashString(name);
    const ang = (seed % 6283) * 0.001;
    const unit = fibonacciDirection(idx, idx + 8, seed);

    authors.push({
      name,
      color: colorForAuthor(name),
      pos2x: Math.cos(ang) * 165,
      pos2y: Math.sin(ang) * 165,
      pos3x: unit.x * 190,
      pos3y: unit.y * 190,
      pos3z: unit.z * 190,
      target2x: Math.cos(ang) * 125,
      target2y: Math.sin(ang) * 125,
      target3x: unit.x * 150,
      target3y: unit.y * 150,
      target3z: unit.z * 150,
      energy: 1.0,
      touches: 0
    });
    authorLookup.set(name, idx);
    return idx;
  }

  function adjustSubtreeCounts(startDir, delta) {
    let curIdx = startDir;
    while (curIdx >= 0) {
      const d = dirs[curIdx];
      d.subtreeFiles = Math.max(0, d.subtreeFiles + delta);
      curIdx = d.parent;
    }
  }

  function spawnParticles(file, count, seedBase) {
    if (particles.length > 420) return;
    for (let i = 0; i < count; i++) {
      const h = (seedBase + Math.imul(i + 1, 2654435761)) >>> 0;
      const ang = (h % 6283) * 0.001;
      const spd = 20.0 + ((h >>> 8) % 42);
      const dir3 = fibonacciDirection(i, count, h);
      particles.push({
        pos2x: file.pos2x,
        pos2y: file.pos2y,
        vel2x: Math.cos(ang) * spd,
        vel2y: Math.sin(ang) * spd,
        pos3x: file.pos3x,
        pos3y: file.pos3y,
        pos3z: file.pos3z,
        vel3x: dir3.x * spd,
        vel3y: dir3.y * spd,
        vel3z: dir3.z * spd,
        color: file.color,
        ttl: 0.72,
        maxTtl: 0.72
      });
    }
  }

  function applyFileEvent(authorIdx, actionCode, pathStr, spawnFx) {
    const slash = pathStr.lastIndexOf('/');
    const dirSlice = slash >= 0 ? pathStr.slice(0, slash) : '';
    const baseName = slash >= 0 ? pathStr.slice(slash + 1) : pathStr;
    const dirIdx = ensureDirChain(dirSlice);
    const dir = dirs[dirIdx];

    let fileIdx = fileLookup.get(pathStr);
    if (fileIdx === undefined) {
      fileIdx = files.length;
      const seed = hashString(pathStr);
      files.push({
        dirIdx,
        name: baseName,
        fullPath: pathStr,
        color: colorForPath(pathStr),
        alive: false,
        alpha: 0,
        heat: 0,
        seed,
        pos2x: dir.pos2x,
        pos2y: dir.pos2y,
        pos3x: dir.pos3x,
        pos3y: dir.pos3y,
        pos3z: dir.pos3z,
        radius: 4.2
      });
      dir.files.push(fileIdx);
      fileLookup.set(pathStr, fileIdx);
    }

    const file = files[fileIdx];
    if (actionCode === 2) {
      if (file.alive) {
        file.alive = false;
        if (!spawnFx) file.alpha = 0;
        activeFileCount = Math.max(0, activeFileCount - 1);
        dir.aliveFiles = Math.max(0, dir.aliveFiles - 1);
        adjustSubtreeCounts(dirIdx, -1);
      }
      file.heat = 0.85;
    } else {
      if (!file.alive) {
        file.alive = true;
        if (!spawnFx) file.alpha = 1.0;
        activeFileCount++;
        dir.aliveFiles++;
        adjustSubtreeCounts(dirIdx, 1);
      }
      file.heat = 1.0;
    }

    dir.heat = 1.0;
    dir.tint = [
      (dir.tint[0] * 3 + file.color[0]) >> 2,
      (dir.tint[1] * 3 + file.color[1]) >> 2,
      (dir.tint[2] * 3 + file.color[2]) >> 2
    ];

    const author = authors[authorIdx];
    const offsetAng = authorIdx * 1.7;
    author.target2x = dir.pos2x + Math.cos(offsetAng) * (dir.bubbleRadius + 26.0);
    author.target2y = dir.pos2y + Math.sin(offsetAng) * (dir.bubbleRadius + 26.0);

    let dx = author.pos3x - dir.pos3x;
    let dy = author.pos3y - dir.pos3y;
    let dz = author.pos3z - dir.pos3z;
    const dl = Math.hypot(dx, dy, dz) || 1;
    dx /= dl; dy /= dl; dz /= dl;
    const dist3 = dir.bubbleRadius + 34.0;
    author.target3x = dir.pos3x + dx * dist3;
    author.target3y = dir.pos3y + dy * dist3;
    author.target3z = dir.pos3z + dz * dist3;
    author.energy = 1.0;
    author.touches++;

    if (spawnFx) {
      if (beams.length < 72) {
        const beamColor = actionCode === 0
          ? [80, 245, 155]
          : actionCode === 2
            ? [255, 92, 92]
            : file.color;
        beams.push({
          authorIdx,
          fileIdx,
          color: beamColor,
          ttl: 0.58,
          maxTtl: 0.58
        });
      }
      spawnParticles(file, actionCode === 2 ? 5 : 3, file.seed + author.touches);
    }
  }

  function applyCommitRecord(rec, spawnFx) {
    const [ts, authorId, hash, msg, evList] = rec;
    const authorName = GIT_AUTHORS[authorId] || 'Linus Torvalds';
    const aIdx = ensureAuthor(authorName);
    lastCommitHash = hash;
    lastCommitMsg = msg;
    lastAuthorName = authorName;
    totalCommitsApplied++;
    simTime = Math.max(simTime, ts);

    for (let i = 0; i < evList.length; i++) {
      const [actCode, pathId] = evList[i];
      const p = GIT_PATHS[pathId];
      if (p) {
        applyFileEvent(aIdx, actCode, p, spawnFx && i < 8);
      }
    }
  }

  function stepPhysics(dt) {
    const dirCount = dirs.length;
    for (let idx = 0; idx < dirCount; idx++) {
      const d = dirs[idx];
      const targetR = idx === 0
        ? 26.0 + Math.sqrt(d.aliveFiles) * 4.2
        : 14.0 + Math.sqrt(d.aliveFiles) * 4.8 + Math.sqrt(d.subtreeFiles) * 1.35;
      d.bubbleRadius += (targetR - d.bubbleRadius) * Math.min(1.0, dt * 6.0);
      d.heat = Math.max(0.0, d.heat - dt * 1.3);
    }

    if (dirCount > 0) {
      dirs[0].pos2x = 0;
      dirs[0].pos2y = 0;
      dirs[0].pos3x = 0;
      dirs[0].pos3y = 0;
      dirs[0].pos3z = 0;
    }

    for (let i = 1; i < dirCount; i++) {
      const d = dirs[i];
      const parent = dirs[d.parent >= 0 ? d.parent : 0];
      const sibCount = Math.max(parent.childDirs.length, 1);
      const restDist2 = parent.bubbleRadius + d.bubbleRadius + 44.0 + Math.min(sibCount, 12) * 3.5;
      const restDist3 = parent.bubbleRadius + d.bubbleRadius + 40.0 + Math.sqrt(sibCount) * 13.5;

      const des2x = parent.pos2x + Math.cos(d.angleHint) * restDist2;
      const des2y = parent.pos2y + Math.sin(d.angleHint) * restDist2;
      const des3x = parent.pos3x + d.orbitUnit.x * restDist3;
      const des3y = parent.pos3y + d.orbitUnit.y * restDist3;
      const des3z = parent.pos3z + d.orbitUnit.z * restDist3;

      let f2x = (des2x - d.pos2x) * 6.5;
      let f2y = (des2y - d.pos2y) * 6.5;
      let f3x = (des3x - d.pos3x) * 6.5;
      let f3y = (des3y - d.pos3y) * 6.5;
      let f3z = (des3z - d.pos3z) * 6.5;

      const winStart = i > 36 ? i - 36 : 1;
      const winEnd = Math.min(dirCount, i + 36);
      for (let j = winStart; j < winEnd; j++) {
        if (i === j) continue;
        const other = dirs[j];

        const dx2 = d.pos2x - other.pos2x;
        const dy2 = d.pos2y - other.pos2y;
        const minSep2 = d.bubbleRadius + other.bubbleRadius + 22.0;
        const d2Sq = dx2 * dx2 + dy2 * dy2 + 1.0;
        if (d2Sq < minSep2 * minSep2) {
          const dist2 = Math.sqrt(d2Sq);
          const push2 = ((minSep2 - dist2) * 13.5) / dist2;
          f2x += dx2 * push2;
          f2y += dy2 * push2;
        }

        const dx3 = d.pos3x - other.pos3x;
        const dy3 = d.pos3y - other.pos3y;
        const dz3 = d.pos3z - other.pos3z;
        const minSep3 = d.bubbleRadius + other.bubbleRadius + 20.0;
        const d3Sq = dx3 * dx3 + dy3 * dy3 + dz3 * dz3 + 1.0;
        if (d3Sq < minSep3 * minSep3) {
          const dist3 = Math.sqrt(d3Sq);
          const push3 = ((minSep3 - dist3) * 14.5) / dist3;
          f3x += dx3 * push3;
          f3y += dy3 * push3;
          f3z += dz3 * push3;
        }
      }

      const damp = Math.exp(-4.5 * dt);
      d.vel2x = (d.vel2x + f2x * dt) * damp;
      d.vel2y = (d.vel2y + f2y * dt) * damp;
      d.pos2x += d.vel2x * dt;
      d.pos2y += d.vel2y * dt;

      d.vel3x = (d.vel3x + f3x * dt) * damp;
      d.vel3y = (d.vel3y + f3y * dt) * damp;
      d.vel3z = (d.vel3z + f3z * dt) * damp;
      d.pos3x += d.vel3x * dt;
      d.pos3y += d.vel3y * dt;
      d.pos3z += d.vel3z * dt;
    }

    const follow = Math.min(1.0, dt * 9.0);
    for (let di = 0; di < dirCount; di++) {
      const d = dirs[di];
      let aliveRank = 0;
      const totalAlive = Math.max(d.aliveFiles, 1);
      const shellR = Math.max(6.0, d.bubbleRadius * 0.72);

      for (let k = 0; k < d.files.length; k++) {
        const f = files[d.files[k]];
        if (f.alive) {
          f.alpha = Math.min(1.0, f.alpha + dt * 3.8);
        } else {
          f.alpha = Math.max(0.0, f.alpha - dt * 2.2);
        }
        f.heat = Math.max(0.0, f.heat - dt * 1.1);
        if (f.alpha <= 0.002) continue;

        const rank = aliveRank;
        if (f.alive) aliveRank++;

        const r2 = 7.5 + 5.4 * Math.sqrt(rank + 0.5);
        const a2 = rank * GOLDEN_ANGLE + d.angleHint;
        const t2x = d.pos2x + Math.cos(a2) * r2;
        const t2y = d.pos2y + Math.sin(a2) * r2;

        const spin = phaseClock * 0.32 + (f.seed % 100) * 0.03;
        const u = fibonacciDirection(rank, totalAlive + 2, f.seed);
        const cs = Math.cos(spin);
        const sn = Math.sin(spin);
        const sx = u.x * cs + u.z * sn;
        const sz = -u.x * sn + u.z * cs;

        f.pos2x += (t2x - f.pos2x) * follow;
        f.pos2y += (t2y - f.pos2y) * follow;
        f.pos3x += (d.pos3x + sx * shellR - f.pos3x) * follow;
        f.pos3y += (d.pos3y + u.y * shellR - f.pos3y) * follow;
        f.pos3z += (d.pos3z + sz * shellR - f.pos3z) * follow;
        f.radius = 4.0 + f.heat * 2.4;
      }
    }

    // Gently auto-frame zoom as repository expands from 11 files in 2005 to hundreds of dirs
    const desiredZoom = clamp(1.12 - Math.sqrt(Math.max(0, dirCount - 4)) * 0.042, 0.52, 1.12);
    camZoom += (desiredZoom - camZoom) * Math.min(1.0, dt * 1.5);

    const glide = Math.min(1.0, dt * 5.5);
    for (let ai = 0; ai < authors.length; ai++) {
      const a = authors[ai];
      a.energy = Math.max(0.0, a.energy - dt * 0.28);
      a.pos2x += (a.target2x - a.pos2x) * glide;
      a.pos2y += (a.target2y - a.pos2y) * glide;
      a.pos3x += (a.target3x - a.pos3x) * glide;
      a.pos3y += (a.target3y - a.pos3y) * glide;
      a.pos3z += (a.target3z - a.pos3z) * glide;
    }

    for (let bi = beams.length - 1; bi >= 0; bi--) {
      beams[bi].ttl -= dt;
      if (beams[bi].ttl <= 0) {
        beams.splice(bi, 1);
      }
    }

    for (let pi = particles.length - 1; pi >= 0; pi--) {
      const p = particles[pi];
      p.ttl -= dt;
      if (p.ttl <= 0) {
        particles.splice(pi, 1);
      } else {
        p.pos2x += p.vel2x * dt;
        p.pos2y += p.vel2y * dt;
        p.pos3x += p.vel3x * dt;
        p.pos3y += p.vel3y * dt;
        p.pos3z += p.vel3z * dt;
      }
    }
  }

  function projectNode(x2, y2, x3, y3, z3) {
    const cy = Math.cos(camYaw);
    const sy = Math.sin(camYaw);
    const cp = Math.cos(camPitch);
    const sp = Math.sin(camPitch);

    const rx = x3 * cy + z3 * sy;
    const rz0 = -x3 * sy + z3 * cy;
    const ry = y3 * cp - rz0 * sp;
    const rz = y3 * sp + rz0 * cp;

    const camDist = 520.0 / Math.max(0.2, camZoom);
    const zCam = rz + camDist;
    const minDim = Math.min(width, height);
    const fov = minDim * 0.92;
    const persp3 = zCam > 24.0 ? fov / zCam : 0;

    const sx3 = width * 0.5 + rx * persp3;
    const sy3 = height * 0.5 - ry * persp3;

    const scale2 = camZoom * (minDim / 680.0);
    const sx2 = width * 0.5 + x2 * scale2;
    const sy2 = height * 0.5 + y2 * scale2;

    return {
      x: lerp(sx2, sx3, blend3D),
      y: lerp(sy2, sy3, blend3D),
      scale: lerp(scale2, persp3, blend3D),
      depth: lerp(520.0, zCam, blend3D),
      visible: zCam > 24.0 || blend3D < 0.99
    };
  }

  function drawPolyhedronShell(sx, sy, radius, rgb, heat, alphaScale, fileCount, dirSeed) {
    if (radius < 2.5 || alphaScale <= 0.01) return;
    const mesh = meshForFileCount(fileCount);
    const vCount = mesh.verts.length;
    const effRadius = radius * (1.0 + 0.26 / Math.sqrt(Math.max(1.0, vCount - 3.0)));

    const phase = (dirSeed % 360) * (Math.PI / 180);
    const tilt = (((dirSeed / 7) % 100) / 100 - 0.5) * 0.55;
    const localYaw = phase + phaseClock * 0.14;
    const cl = Math.cos(localYaw);
    const sl = Math.sin(localYaw);
    const ct = Math.cos(tilt);
    const st = Math.sin(tilt);

    const cyCam = Math.cos(camYaw);
    const syCam = Math.sin(camYaw);
    const cpCam = Math.cos(camPitch);
    const spCam = Math.sin(camPitch);

    const camV = new Array(vCount);
    const scrV = new Array(vCount);
    for (let i = 0; i < vCount; i++) {
      const p = mesh.verts[i];
      const lx = p.x * cl + p.z * sl;
      const lz0 = -p.x * sl + p.z * cl;
      const ly = p.y * ct - lz0 * st;
      const lz = p.y * st + lz0 * ct;

      const rx = lx * cyCam + lz * syCam;
      const rz0 = -lx * syCam + lz * cyCam;
      const ry = ly * cpCam - rz0 * spCam;
      const rz = ly * spCam + rz0 * cpCam;

      camV[i] = { x: rx, y: ry, z: rz };
      scrV[i] = [sx + rx * effRadius, sy - ry * effRadius];
    }

    const vertFront = new Uint8Array(vCount);
    const lxDir = -0.45;
    const lyDir = 0.55;
    const lzDir = -0.70;
    const projFaces = [];

    for (let fi = 0; fi < mesh.faces.length; fi++) {
      const f = mesh.faces[fi];
      const v0 = camV[f[0]];
      const v1 = camV[f[1]];
      const v2 = camV[f[2]];
      const e1x = v1.x - v0.x;
      const e1y = v1.y - v0.y;
      const e1z = v1.z - v0.z;
      const e2x = v2.x - v0.x;
      const e2y = v2.y - v0.y;
      const e2z = v2.z - v0.z;
      let nx = e1y * e2z - e1z * e2y;
      let ny = e1z * e2x - e1x * e2z;
      let nz = e1x * e2y - e1y * e2x;
      const nLen = Math.hypot(nx, ny, nz);
      if (nLen > 1e-6) {
        nx /= nLen; ny /= nLen; nz /= nLen;
      } else {
        nx = 0; ny = 0; nz = -1;
      }

      const front = nz < 0;
      if (front) {
        vertFront[f[0]] = 1;
        vertFront[f[1]] = 1;
        vertFront[f[2]] = 1;
      }

      const fc = facetColor(rgb, fi, dirSeed);
      const omz = 1.0 - Math.abs(nz);
      const fresnel = omz * omz;
      const lDot = Math.max(0, nx * lxDir + ny * lyDir + nz * lzDir);
      const l2 = lDot * lDot;
      const l4 = l2 * l2;
      const spec = front ? l4 * l4 * 0.42 : 0;

      const shade = front ? (0.60 + lDot * 0.44 + heat * 0.18) : (0.36 + heat * 0.10);
      const baseAlpha = front
        ? (0.11 + fresnel * (0.24 + heat * 0.14) + spec * 0.30)
        : (0.05 + fresnel * 0.055);

      const fr = Math.min(255, Math.round(fc[0] * shade + spec * 225));
      const fg = Math.min(255, Math.round(fc[1] * shade + spec * 235));
      const fb = Math.min(255, Math.round(fc[2] * shade + spec * 250));

      projFaces.push({
        p0: scrV[f[0]],
        p1: scrV[f[1]],
        p2: scrV[f[2]],
        depth: (v0.z + v1.z + v2.z) / 3,
        rgb: [fr, fg, fb],
        alpha: clamp(baseAlpha * alphaScale, 0, 0.72)
      });
    }

    projFaces.sort((a, b) => b.depth - a.depth);
    for (let i = 0; i < projFaces.length; i++) {
      const pf = projFaces[i];
      ctx.fillStyle = rgbaStr(pf.rgb, pf.alpha);
      ctx.beginPath();
      ctx.moveTo(pf.p0[0], pf.p0[1]);
      ctx.lineTo(pf.p1[0], pf.p1[1]);
      ctx.lineTo(pf.p2[0], pf.p2[1]);
      ctx.closePath();
      ctx.fill();
    }

    const edgeRgb = [
      Math.min(255, rgb[0] + 56),
      Math.min(255, rgb[1] + 56),
      Math.min(255, rgb[2] + 56)
    ];
    ctx.lineWidth = Math.max(0.9, Math.min(1.6, radius * 0.028));
    for (let ei = 0; ei < mesh.edges.length; ei++) {
      const e = mesh.edges[ei];
      const front = vertFront[e[0]] && vertFront[e[1]];
      const ea = clamp((front ? (0.24 + heat * 0.22) : 0.075) * alphaScale, 0, 0.65);
      ctx.strokeStyle = rgbaStr(edgeRgb, ea);
      ctx.beginPath();
      ctx.moveTo(scrV[e[0]][0], scrV[e[0]][1]);
      ctx.lineTo(scrV[e[1]][0], scrV[e[1]][1]);
      ctx.stroke();
    }
  }

  function drawLitOrb(sx, sy, radius, rgb, alpha, heat, enableBloom) {
    if (radius < 0.8 || alpha <= 0.01) return;

    if (enableBloom && heat > 0.04) {
      const haloR = radius * (1.75 + heat * 1.25);
      const hGrad = ctx.createRadialGradient(sx, sy, radius * 0.4, sx, sy, haloR);
      hGrad.addColorStop(0.0, rgbaStr(rgb, 0.38 * heat * alpha));
      hGrad.addColorStop(1.0, rgbaStr(rgb, 0.0));
      ctx.fillStyle = hGrad;
      ctx.beginPath();
      ctx.arc(sx, sy, haloR, 0, TAU);
      ctx.fill();
    }

    const oGrad = ctx.createRadialGradient(
      sx - radius * 0.32,
      sy - radius * 0.35,
      radius * 0.08,
      sx,
      sy,
      radius
    );
    const bright = [
      Math.min(255, rgb[0] + 95),
      Math.min(255, rgb[1] + 95),
      Math.min(255, rgb[2] + 95)
    ];
    const shadow = [
      Math.round(rgb[0] * 0.38),
      Math.round(rgb[1] * 0.38),
      Math.round(rgb[2] * 0.44)
    ];
    oGrad.addColorStop(0.0, rgbaStr(bright, alpha));
    oGrad.addColorStop(0.55, rgbaStr(rgb, alpha));
    oGrad.addColorStop(1.0, rgbaStr(shadow, alpha));

    ctx.fillStyle = oGrad;
    ctx.beginPath();
    ctx.arc(sx, sy, radius, 0, TAU);
    ctx.fill();
  }

  function drawHud(viewModeParam) {
    const pad = 22;
    const dateStr = formatUtcDate(simTime);
    const progress = clamp((simTime - startTime) / Math.max(1, endTime - startTime), 0, 1);
    const modeBadge = blend3D > 0.65 ? '3D POLYHEDRA' : blend3D < 0.35 ? '2D TREE' : 'MORPHING';
    const eraLabel = activeEra === 'genesis_2005'
      ? '2005 Genesis'
      : activeEra === 'modern_subsystems'
        ? 'Modern Era'
        : '2005 → 2026';

    ctx.save();
    // Top-left zource status card
    const cardW = Math.min(410, width - pad * 2);
    const cardH = 74;
    ctx.fillStyle = 'rgba(7, 11, 21, 0.76)';
    ctx.strokeStyle = 'rgba(76, 194, 255, 0.28)';
    ctx.lineWidth = 1;
    ctx.fillRect(pad, pad, cardW, cardH);
    ctx.strokeRect(pad, pad, cardW, cardH);

    ctx.fillStyle = '#f97316';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(`ZOURCE · git/git [${eraLabel}]`, pad + 12, pad + 20);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 11px monospace';
    ctx.fillText(modeBadge, pad + cardW - 92, pad + 20);

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 16px monospace';
    ctx.fillText(dateStr, pad + 12, pad + 43);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px monospace';
    ctx.fillText(
      `${activeFileCount} files · ${dirs.length} dirs · ${authors.length} authors · ${totalCommitsApplied} commits`,
      pad + 12,
      pad + 62
    );

    // Bottom commit stream & timeline progress bar
    const barH = 44;
    const barY = height - barH - pad;
    const barW = Math.min(760, width - pad * 2);
    ctx.fillStyle = 'rgba(7, 11, 21, 0.78)';
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.22)';
    ctx.fillRect(pad, barY, barW, barH);
    ctx.strokeRect(pad, barY, barW, barH);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 12px monospace';
    const headerStr = `${lastCommitHash}  ${lastAuthorName}`;
    ctx.fillText(headerStr, pad + 12, barY + 17);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '12px monospace';
    const maxChars = Math.max(24, Math.floor((barW - 24) / 7.2));
    const trimmedMsg = lastCommitMsg.length > maxChars
      ? `${lastCommitMsg.slice(0, maxChars - 1)}…`
      : lastCommitMsg;
    ctx.fillText(trimmedMsg, pad + 12, barY + 34);

    // Progress line along bottom edge of ticker
    ctx.fillStyle = 'rgba(56, 189, 248, 0.22)';
    ctx.fillRect(pad + 1, barY + barH - 3, barW - 2, 2);
    ctx.fillStyle = viewModeParam === 'auto_morph' ? '#f97316' : '#38bdf8';
    ctx.fillRect(pad + 1, barY + barH - 3, Math.max(2, (barW - 2) * progress), 2);
    ctx.restore();
  }

  resetSimulation('full_chronicle');

  return {
    resize(w, h) {
      width = Math.max(64, w);
      height = Math.max(64, h);
    },

    render(rawDt) {
      if (!ctx) return;
      width = canvas.width || width;
      height = canvas.height || height;

      const params = (typeof getParams === 'function' ? getParams() : null) || {};
      const viewMode = params.viewMode || 'bubbles_3d';
      const eraMode = params.eraMode || 'full_chronicle';
      const simSpeed = clamp(Number(params.simSpeed ?? 1.0), 0.25, 3.0);
      const autoOrbit = params.autoOrbit !== false;
      const showLabels = params.showLabels !== false;
      const enableBloom = params.enableBloom !== false;
      const showHud = params.showHud !== false;

      if (eraMode !== activeEra) {
        resetSimulation(eraMode);
      }

      const dt = clamp(rawDt || 0.016, 0.001, 0.08);
      phaseClock += dt;

      if (viewMode === 'auto_morph') {
        morphClock += dt;
        if (morphClock >= 26.0) {
          morphClock = 0;
          morphTarget3D = morphTarget3D > 0.5 ? 0.0 : 1.0;
        }
      } else {
        morphTarget3D = viewMode === 'tree_2d' ? 0.0 : 1.0;
      }
      blend3D += (morphTarget3D - blend3D) * Math.min(1.0, dt * 3.5);

      if (autoOrbit && blend3D > 0.05) {
        camYaw = (camYaw + 0.24 * simSpeed * dt) % TAU;
        camPitch = 0.28 + Math.sin(phaseClock * 0.17) * 0.11;
      }

      // Advance repository timeline with automatic idle-gap compression (matching zource/src/sim.zig)
      if (commitSlice.length > 0) {
        if (commitCursor < commitSlice.length) {
          const daysPerSec = (activeEra === 'genesis_2005' ? 2.4 : 42.0) * simSpeed;
          const advanceSec = dt * 86400.0 * daysPerSec;
          const nextTs = commitSlice[commitCursor][0];
          if (nextTs - simTime > advanceSec * 18.0) {
            simTime = nextTs - advanceSec * 0.5;
          } else {
            simTime += advanceSec;
          }

          let applied = 0;
          while (commitCursor < commitSlice.length && commitSlice[commitCursor][0] <= simTime && applied < 8) {
            applyCommitRecord(commitSlice[commitCursor], applied < 3);
            commitCursor++;
            applied++;
          }
        } else {
          postFinishHold += dt;
          if (postFinishHold >= 6.0) {
            resetSimulation(eraMode);
          }
        }
      }

      stepPhysics(dt);

      // 1. Deep space radial vignette backdrop (matching zource/src/wayland.zig bg_fs_src)
      const bgGrad = ctx.createRadialGradient(
        width * 0.5,
        height * 0.5,
        10,
        width * 0.5,
        height * 0.5,
        Math.hypot(width, height) * 0.55
      );
      bgGrad.addColorStop(0.0, '#0e1629');
      bgGrad.addColorStop(0.65, '#080d19');
      bgGrad.addColorStop(1.0, '#05080f');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Project directories, files, authors, and particles
      const dirProj = new Array(dirs.length);
      for (let i = 0; i < dirs.length; i++) {
        const d = dirs[i];
        dirProj[i] = projectNode(d.pos2x, d.pos2y, d.pos3x, d.pos3y, d.pos3z);
      }

      // Draw parent -> child structural tree links
      ctx.lineWidth = 1.2;
      for (let i = 1; i < dirs.length; i++) {
        const d = dirs[i];
        const pProj = dirProj[d.parent];
        const cProj = dirProj[i];
        if (!pProj.visible || !cProj.visible) continue;
        const linkAlpha = clamp(0.16 + d.heat * 0.28, 0.08, 0.55);
        ctx.strokeStyle = rgbaStr(d.tint, linkAlpha);
        ctx.beginPath();
        ctx.moveTo(pProj.x, pProj.y);
        ctx.lineTo(cProj.x, cProj.y);
        ctx.stroke();
      }

      // Collect depth-sorted render items (back-to-front painter's algorithm)
      const renderItems = [];
      for (let i = 0; i < dirs.length; i++) {
        const d = dirs[i];
        const pr = dirProj[i];
        if (!pr.visible) continue;
        renderItems.push({
          kind: 0, // dir polyhedron shell
          idx: i,
          x: pr.x,
          y: pr.y,
          r: Math.max(3.0, d.bubbleRadius * pr.scale),
          depth: pr.depth + 4.0,
          rgb: d.tint,
          alpha: 0.42 + blend3D * 0.58,
          heat: d.heat,
          fileCount: Math.max(d.aliveFiles, d.files.length, 4),
          dirSeed: d.seed || (i * 97 + 13)
        });
      }

      const fileProj = new Map();
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        if (f.alpha <= 0.01) continue;
        const pr = projectNode(f.pos2x, f.pos2y, f.pos3x, f.pos3y, f.pos3z);
        if (!pr.visible) continue;
        fileProj.set(i, pr);
        renderItems.push({
          kind: 1, // file orb
          idx: i,
          x: pr.x,
          y: pr.y,
          r: clamp(f.radius * pr.scale, 1.3, 14.0),
          depth: pr.depth,
          rgb: f.color,
          alpha: f.alpha,
          heat: f.heat
        });
      }

      const authorProj = new Array(authors.length);
      for (let i = 0; i < authors.length; i++) {
        const a = authors[i];
        if (a.energy <= 0.02) continue;
        const pr = projectNode(a.pos2x, a.pos2y, a.pos3x, a.pos3y, a.pos3z);
        authorProj[i] = pr;
        if (!pr.visible) continue;
        renderItems.push({
          kind: 2, // author orb
          idx: i,
          x: pr.x,
          y: pr.y,
          r: clamp((6.5 + a.energy * 3.0) * pr.scale, 2.5, 16.0),
          depth: pr.depth - 2.0,
          rgb: a.color,
          alpha: clamp(0.35 + a.energy * 0.65, 0, 1),
          heat: a.energy
        });
      }

      renderItems.sort((a, b) => b.depth - a.depth);

      for (let i = 0; i < renderItems.length; i++) {
        const it = renderItems[i];
        if (it.kind === 0) {
          drawPolyhedronShell(it.x, it.y, it.r, it.rgb, it.heat, it.alpha, it.fileCount, it.dirSeed);
        } else {
          drawLitOrb(it.x, it.y, it.r, it.rgb, it.alpha, it.heat, enableBloom);
        }
      }

      // 3. Draw active contributor -> file commit laser beams
      for (let i = 0; i < beams.length; i++) {
        const b = beams[i];
        const ap = authorProj[b.authorIdx];
        const fp = fileProj.get(b.fileIdx);
        if (!ap || !ap.visible || !fp) continue;
        const life = clamp(b.ttl / b.maxTtl, 0, 1);
        if (enableBloom) {
          ctx.strokeStyle = rgbaStr(b.color, life * 0.28);
          ctx.lineWidth = 4.5;
          ctx.beginPath();
          ctx.moveTo(ap.x, ap.y);
          ctx.lineTo(fp.x, fp.y);
          ctx.stroke();
        }
        ctx.strokeStyle = rgbaStr(b.color, life * 0.9);
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(ap.x, ap.y);
        ctx.lineTo(fp.x, fp.y);
        ctx.stroke();
      }

      // 4. Draw commit burst sparks
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const pr = projectNode(p.pos2x, p.pos2y, p.pos3x, p.pos3y, p.pos3z);
        if (!pr.visible) continue;
        const life = clamp(p.ttl / p.maxTtl, 0, 1);
        ctx.fillStyle = rgbaStr(p.color, life * 0.85);
        const r = Math.max(1.1, 2.2 * pr.scale * life);
        ctx.beginPath();
        ctx.arc(pr.x, pr.y, r, 0, TAU);
        ctx.fill();
      }

      // 5. Directory & active contributor labels
      if (showLabels) {
        ctx.save();
        ctx.font = '11px monospace';
        let dirLabelsDrawn = 0;
        for (let i = 0; i < dirs.length && dirLabelsDrawn < 18; i++) {
          const d = dirs[i];
          const pr = dirProj[i];
          if (!pr.visible) continue;
          const screenR = d.bubbleRadius * pr.scale;
          if (i !== 0 && screenR < 15 && d.heat < 0.25) continue;
          const alpha = i === 0 ? 0.92 : clamp(0.42 + d.heat * 0.55, 0.35, 0.95);
          ctx.fillStyle = `rgba(226,232,240,${alpha.toFixed(2)})`;
          ctx.fillText(i === 0 ? 'git/' : `${d.name}/`, pr.x + screenR * 0.55 + 4, pr.y - screenR * 0.35);
          dirLabelsDrawn++;
        }

        ctx.font = 'bold 11px monospace';
        let authLabelsDrawn = 0;
        for (let i = authors.length - 1; i >= 0 && authLabelsDrawn < 8; i--) {
          const a = authors[i];
          if (a.energy < 0.42) continue;
          const pr = authorProj[i];
          if (!pr || !pr.visible) continue;
          ctx.fillStyle = rgbaStr(a.color, clamp(a.energy, 0.4, 0.98));
          ctx.fillText(a.name, pr.x + 9, pr.y + 4);
          authLabelsDrawn++;
        }
        ctx.restore();
      }

      // 6. Zource commit & repository HUD
      if (showHud) {
        drawHud(viewMode);
      }
    },

    destroy() {
      dirs = [];
      files = [];
      authors = [];
      beams = [];
      particles = [];
    }
  };
}
