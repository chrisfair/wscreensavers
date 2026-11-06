// Ames Window Optical Illusion Screensaver (Adelbert Ames Jr., 1951 / The Curiosity Show)
//
// Models the classic trapezoidal 6-pane Ames Window suspended on a torsion thread,
// painted on both flat faces with perspective-foreshortened mullions and false 3D
// terracotta/red inner jamb reveals. Although the flat trapezoid rotates continuously
// in one direction (360°), human visual perception irresistibly interprets it as a
// rectangular window oscillating back and forth every 180°.
//
// Includes the classic Curiosity Show props—a blue ballpoint pen wedged perpendicular
// through the window panes (which appears to ghost straight through solid window bars
// or rotate opposite to the window), a suspended corner cube, dual counter-stacked
// windows, a live Top-Down Truth Radar, and an optional overhead camera reveal.

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

// Rotate a 3D point in local object space by yaw (around Y), then pitch (around X)
function transformPoint(p, yaw, pitch) {
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  // Rotate around vertical Y axis
  const x1 = p.x * cy + p.z * sy;
  const y1 = p.y;
  const z1 = -p.x * sy + p.z * cy;

  // Tilt camera/view by pitch around X axis
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const x2 = x1;
  const y2 = y1 * cp - z1 * sp;
  const z2 = y1 * sp + z1 * cp;

  return { x: x2, y: y2, z: z2 };
}

const COLOR_SCHEMES = {
  curiosity_classic: {
    name: 'Curiosity Show 1951 (Cream & Terracotta Red)',
    bgTop: '#161215',
    bgMid: '#241b1f',
    bgBot: '#120e10',
    studioGlow: { r: 239, g: 108, b: 77 },
    faceWhite: '#f3efe6',
    faceBorder: '#d6cfc2',
    jambVertical: '#c8432b',   // Warm terracotta red vertical reveals
    jambHorizontal: '#992e1b', // Darker brick red horizontal reveals
    outerLeftEdge: '#d94e34',  // Tall-end painted outer thickness strip
    penBodyBlue: '#1d63b8',
    penBodyLight: '#4da3ff',
    penBodyDark: '#0f3668',
    penBrass: '#e5b84b',
    penTip: '#cbd5e1',
    accentHex: '#f97316',
    accentRgb: { r: 249, g: 115, b: 22 }
  },
  studio_emerald: {
    name: 'Curiosity Studio Green Backdrop & Classic Window',
    bgTop: '#062617',
    bgMid: '#0d4228',
    bgBot: '#051a10',
    studioGlow: { r: 52, g: 211, b: 153 },
    faceWhite: '#f5f2eb',
    faceBorder: '#cbd5e1',
    jambVertical: '#cc4429',
    jambHorizontal: '#992d18',
    outerLeftEdge: '#df5236',
    penBodyBlue: '#1e6adc',
    penBodyLight: '#60a5fa',
    penBodyDark: '#123d82',
    penBrass: '#facc15',
    penTip: '#e2e8f0',
    accentHex: '#34d399',
    accentRgb: { r: 52, g: 211, b: 153 }
  },
  blueprint_cobalt: {
    name: 'Architectural Ivory & Cobalt Reveals',
    bgTop: '#070d19',
    bgMid: '#0f1b33',
    bgBot: '#060a14',
    studioGlow: { r: 56, g: 189, b: 248 },
    faceWhite: '#f1f5f9',
    faceBorder: '#cbd5e1',
    jambVertical: '#2563eb',
    jambHorizontal: '#1e40af',
    outerLeftEdge: '#3b82f6',
    penBodyBlue: '#dc2626',
    penBodyLight: '#f87171',
    penBodyDark: '#7f1d1d',
    penBrass: '#fbbf24',
    penTip: '#e2e8f0',
    accentHex: '#38bdf8',
    accentRgb: { r: 56, g: 189, b: 248 }
  },
  monochrome_lab: {
    name: '1951 Princeton Psych Lab (High-Contrast Charcoal)',
    bgTop: '#09090b',
    bgMid: '#18181b',
    bgBot: '#09090b',
    studioGlow: { r: 212, g: 212, b: 216 },
    faceWhite: '#f8fafc',
    faceBorder: '#cbd5e1',
    jambVertical: '#52525b',
    jambHorizontal: '#27272a',
    outerLeftEdge: '#71717a',
    penBodyBlue: '#eab308',
    penBodyLight: '#fde047',
    penBodyDark: '#854d0e',
    penBrass: '#f8fafc',
    penTip: '#d4d4d8',
    accentHex: '#e4e4e7',
    accentRgb: { r: 228, g: 228, b: 231 }
  }
};

// Construct the exact 2D planar polygons (in the z=0 plane) that make up a painted Ames Window.
// The window spans x in [-halfW, +halfW], with the tall edge at x = -halfW and short edge at x = +halfW.
// Uses true projective division u -> x(u) so the 3 columns of panes and mullions foreshorten
// identically to a rectangular window viewed at an oblique angle.
function buildAmesWindowPolygons(scale = 1.0) {
  const halfW = 3.25 * scale;
  const hTall = 2.28 * scale;  // Half-height at left (tall) edge x = -halfW
  const hShort = 0.96 * scale; // Half-height at right (short) edge x = +halfW

  // Projective mapping from normalized rectangular coordinate u in [0, 1]
  // (0 = tall/near end, 1 = short/far end) to physical trapezoid x in [-halfW, +halfW].
  // Because h(x) is linear in projective screen space, u maps via:
  // s(u) = (u * hTall) / lerp(hTall, hShort, u) in [0, 1]
  function uToX(u) {
    const denom = lerp(hTall, hShort, u);
    const s = (u * hTall) / (denom || 1);
    return lerp(-halfW, halfW, s);
  }

  // Outer vertical half-height at any x
  function outerHalfH(x) {
    const t = (x + halfW) / (2 * halfW);
    return lerp(hTall, hShort, t);
  }

  // Point on the window at horizontal parameter u in [0, 1] and normalized vertical v in [-1, 1]
  function winPt(u, v) {
    const x = uToX(u);
    const h = outerHalfH(x);
    return { x, y: v * h, z: 0 };
  }

  const polys = [];

  // 1. Painted Outer Tall-End Thickness Reveal (leftmost strip u in [0.0, 0.038])
  const uOuterJamb = 0.038;
  polys.push({
    role: 'outer_edge',
    verts: [winPt(0, 1), winPt(uOuterJamb, 0.975), winPt(uOuterJamb, -0.975), winPt(0, -1)]
  });

  // Define the 3 columns of window panes in normalized rectangular space u in [uOuterJamb, 1.0]:
  // Stile 0: [0.038, 0.115]
  // Pane Col 0: [0.115, 0.365]
  // Mullion 1: [0.365, 0.425]
  // Pane Col 1: [0.425, 0.655]
  // Mullion 2: [0.655, 0.710]
  // Pane Col 2: [0.710, 0.925]
  // Stile 3 (right edge): [0.925, 1.000]
  const uStops = [uOuterJamb, 0.115, 0.365, 0.425, 0.655, 0.710, 0.925, 1.0];

  // Normalized vertical stops v in [-1, 1]:
  // Top rail: [0.82, 1.0]
  // Upper pane row: [0.08, 0.82]
  // Center transom bar: [-0.08, 0.08]
  // Lower pane row: [-0.82, -0.08]
  // Bottom rail: [-1.0, -0.82]
  const vTopOuter = 1.0;
  const vTopInner = 0.82;
  const vMidTop = 0.08;
  const vMidBot = -0.08;
  const vBotInner = -0.82;
  const vBotOuter = -1.0;

  // 2. White Frame Rails (Top rail, Center horizontal muntin bar, Bottom rail)
  polys.push({
    role: 'face_white',
    verts: [winPt(uOuterJamb, vTopOuter), winPt(1.0, vTopOuter), winPt(1.0, vTopInner), winPt(uOuterJamb, vTopInner)]
  });
  polys.push({
    role: 'face_white',
    verts: [winPt(uOuterJamb, vMidTop), winPt(1.0, vMidTop), winPt(1.0, vMidBot), winPt(uOuterJamb, vMidBot)]
  });
  polys.push({
    role: 'face_white',
    verts: [winPt(uOuterJamb, vBotInner), winPt(1.0, vBotInner), winPt(1.0, vBotOuter), winPt(uOuterJamb, vBotOuter)]
  });

  // 3. White Vertical Stiles & Mullions (indices 0, 2, 4, 6 in uStops)
  const stileIndices = [0, 2, 4, 6];
  for (let i = 0; i < stileIndices.length; i++) {
    const idx = stileIndices[i];
    const u0 = uStops[idx];
    const u1 = uStops[idx + 1];
    // Upper segment between top rail and center bar
    polys.push({
      role: 'face_white',
      verts: [winPt(u0, vTopInner), winPt(u1, vTopInner), winPt(u1, vMidTop), winPt(u0, vMidTop)]
    });
    // Lower segment between center bar and bottom rail
    polys.push({
      role: 'face_white',
      verts: [winPt(u0, vMidBot), winPt(u1, vMidBot), winPt(u1, vBotInner), winPt(u0, vBotInner)]
    });
  }

  // 4. Painted False 3D Perspective Jambs (Reveals) inside each of the 6 Pane Cutouts!
  // In the physical Ames Window (see Curiosity Show f1.jpg), inside each pane opening [uL, uR] x [vB, vT],
  // there is a painted vertical jamb along the left/tall-side inner edge [uL, uL + duJamb] and
  // horizontal sill/header reveals along the top/bottom of the opening, leaving the rest of the pane
  // completely open (transparent cutout) so objects/rods can pass through it!
  const paneColIndices = [1, 3, 5];
  const paneRows = [
    { vB: vMidTop, vT: vTopInner, isUpper: true },
    { vB: vBotInner, vT: vMidBot, isUpper: false }
  ];

  for (let c = 0; c < paneColIndices.length; c++) {
    const uL = uStops[paneColIndices[c]];
    const uR = uStops[paneColIndices[c] + 1];
    const duJamb = (uR - uL) * 0.19; // Painted vertical reveal thickness
    const uJ = uL + duJamb;

    for (let r = 0; r < paneRows.length; r++) {
      const { vB, vT, isUpper } = paneRows[r];
      const dvSill = (vT - vB) * 0.13;

      // Vertical inner jamb reveal (warm terracotta red) on the tall side of the pane cutout
      polys.push({
        role: 'jamb_vertical',
        verts: [
          winPt(uL, vT),
          winPt(uJ, vT - (isUpper ? dvSill : 0)),
          winPt(uJ, vB + (isUpper ? 0 : dvSill)),
          winPt(uL, vB)
        ]
      });

      // Horizontal inner header/sill reveal (darker brick red)
      if (isUpper) {
        polys.push({
          role: 'jamb_horizontal',
          verts: [winPt(uL, vT), winPt(uR, vT), winPt(uR, vT - dvSill), winPt(uJ, vT - dvSill)]
        });
      } else {
        polys.push({
          role: 'jamb_horizontal',
          verts: [winPt(uJ, vB + dvSill), winPt(uR, vB + dvSill), winPt(uR, vB), winPt(uL, vB)]
        });
      }
    }
  }

  // Return polygon list + key attachment landmarks (center pane middle, short corner, top suspension point)
  const centerPaneU = (uStops[3] + uStops[4]) * 0.5;
  const centerPanePt = winPt(centerPaneU, 0.38); // Passes through middle upper pane!
  const shortCornerPt = winPt(1.0, 1.0);
  const tallTopPt = winPt(0.0, 1.0);

  return {
    polys,
    centerPanePt,
    shortCornerPt,
    tallTopPt,
    halfW,
    hTall,
    hShort
  };
}

export function createAmesWindow(canvas, getParams) {
  const ctx = canvas.getContext('2d');
  let width = canvas.width || 1280;
  let height = canvas.height || 720;

  let simTime = 0;
  let angleRad = 0.35; // Continuous rotation angle (increases monotonically!)

  // Prebuild standard Ames window geometry
  const mainWindowGeom = buildAmesWindowPolygons(1.0);
  const dualTopGeom = buildAmesWindowPolygons(0.68);
  const dualBotGeom = buildAmesWindowPolygons(0.68);

  // Ambient studio dust motes
  const motes = [];
  for (let i = 0; i < 36; i++) {
    motes.push({
      x: Math.sin(i * 19.7) * 7.5,
      y: Math.cos(i * 31.3) * 4.5,
      z: Math.sin(i * 47.1) * 4.0,
      r: 0.9 + (i % 3) * 0.45
    });
  }

  function project3D(pWorld, camDist, fovScale, yOffsetPx = 0) {
    const zCam = camDist - pWorld.z;
    if (zCam <= 0.5) return null;
    const persp = fovScale / zCam;
    return {
      x: width * 0.5 + pWorld.x * persp,
      y: height * 0.5 - pWorld.y * persp + yOffsetPx,
      z: pWorld.z,
      zCam,
      persp
    };
  }

  function drawStudioBackground(scheme, pitchRad) {
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, scheme.bgTop);
    grad.addColorStop(0.52, scheme.bgMid);
    grad.addColorStop(1, scheme.bgBot);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Subtle out-of-focus studio window silhouette in background (like the Curiosity Show set)
    const { r, g, b } = scheme.studioGlow;
    const radial = ctx.createRadialGradient(
      width * 0.5,
      height * 0.48,
      10,
      width * 0.5,
      height * 0.48,
      Math.max(width, height) * 0.58
    );
    radial.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.14)`);
    radial.addColorStop(0.55, `rgba(${r}, ${g}, ${b}, 0.04)`);
    radial.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, width, height);

    // If camera is tilted up in overhead "Truth Reveal" mode, draw a 3D circular rotation grid on the floor plane
    if (pitchRad > 0.12) {
      const revealAlpha = clamp((pitchRad - 0.12) / 0.65, 0, 0.75);
      const camDist = 24.0;
      const fovScale = Math.min(width, height) * 2.45;
      ctx.save();
      ctx.strokeStyle = `rgba(${scheme.accentRgb.r}, ${scheme.accentRgb.g}, ${scheme.accentRgb.b}, ${(revealAlpha * 0.48).toFixed(3)})`;
      ctx.lineWidth = 1.4;

      const radii = [1.8, 3.25, 4.2];
      for (let rIdx = 0; rIdx < radii.length; rIdx++) {
        const rad = radii[rIdx];
        ctx.beginPath();
        let started = false;
        for (let s = 0; s <= 64; s++) {
          const a = (s / 64) * Math.PI * 2;
          const p = transformPoint({ x: Math.cos(a) * rad, y: -2.55, z: Math.sin(a) * rad }, 0, pitchRad);
          const pp = project3D(p, camDist, fovScale);
          if (!pp) continue;
          if (!started) {
            ctx.moveTo(pp.x, pp.y);
            started = true;
          } else {
            ctx.lineTo(pp.x, pp.y);
          }
        }
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  // Draw a 3D cylinder segment between local points p0 and p1 with given radius and color stops
  function drawCylinderSegment3D(p0Local, p1Local, radiusWorld, colors, yaw, pitch, camDist, fovScale, yOffsetPx = 0) {
    const w0 = transformPoint(p0Local, yaw, pitch);
    const w1 = transformPoint(p1Local, yaw, pitch);
    const s0 = project3D(w0, camDist, fovScale, yOffsetPx);
    const s1 = project3D(w1, camDist, fovScale, yOffsetPx);
    if (!s0 || !s1) return;

    const dx = s1.x - s0.x;
    const dy = s1.y - s0.y;
    const len = Math.hypot(dx, dy);
    const r0 = Math.max(2.0, radiusWorld * s0.persp);
    const r1 = Math.max(2.0, radiusWorld * s1.persp);

    if (len < 0.5) {
      ctx.fillStyle = colors.mid;
      ctx.beginPath();
      ctx.arc(s0.x, s0.y, r0, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    const nx = -dy / len;
    const ny = dx / len;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(s0.x + nx * r0, s0.y + ny * r0);
    ctx.lineTo(s1.x + nx * r1, s1.y + ny * r1);
    ctx.arc(s1.x, s1.y, r1, Math.atan2(ny, nx), Math.atan2(-ny, -nx), false);
    ctx.lineTo(s0.x - nx * r0, s0.y - ny * r0);
    ctx.arc(s0.x, s0.y, r0, Math.atan2(-ny, -nx), Math.atan2(ny, nx), false);
    ctx.closePath();

    const midX = (s0.x + s1.x) * 0.5;
    const midY = (s0.y + s1.y) * 0.5;
    const rAvg = (r0 + r1) * 0.5;
    const grad = ctx.createLinearGradient(
      midX + nx * rAvg,
      midY + ny * rAvg,
      midX - nx * rAvg,
      midY - ny * rAvg
    );
    grad.addColorStop(0, colors.light);
    grad.addColorStop(0.42, colors.mid);
    grad.addColorStop(1, colors.dark);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();
  }

  // Draw one half of the Curiosity Show Blue Ballpoint Pen (either z >= 0 half or z <= 0 half)
  // This exact BSP split at the window plane z = 0 guarantees that the back half of the pen is
  // occluded by the solid window frame bars while visible through the open pane cutouts, and the
  // front half of the pen cleanly occludes the front of the window!
  function drawPenHalf(anchorPt, signZ, yaw, pitch, camDist, fovScale, scheme, scale = 1.0, yOffsetPx = 0) {
    const px = anchorPt.x;
    const py = anchorPt.y;
    const penLen = 2.65 * scale;
    const penR = 0.088 * scale;

    const blueColors = {
      light: scheme.penBodyLight,
      mid: scheme.penBodyBlue,
      dark: scheme.penBodyDark
    };
    const brassColors = {
      light: '#fef08a',
      mid: scheme.penBrass,
      dark: '#854d0e'
    };
    const tipColors = {
      light: '#f8fafc',
      mid: scheme.penTip,
      dark: '#64748b'
    };

    if (signZ > 0) {
      // +Z side of the window: Brass center collar -> Blue barrel -> Tapered silver/blue writing tip
      const z0 = 0.0;
      const zCollar = 0.24 * scale;
      const zBarrel = penLen * 0.82;
      const zTip = penLen;

      // Draw from farthest to nearest along +Z depending on whether +Z faces camera
      const checkZ0 = transformPoint({ x: px, y: py, z: z0 }, yaw, pitch).z;
      const checkZ1 = transformPoint({ x: px, y: py, z: zTip }, yaw, pitch).z;
      const segments = [
        { a: { x: px, y: py, z: z0 }, b: { x: px, y: py, z: zCollar }, r: penR * 1.06, col: brassColors },
        { a: { x: px, y: py, z: zCollar }, b: { x: px, y: py, z: zBarrel }, r: penR, col: blueColors },
        { a: { x: px, y: py, z: zBarrel }, b: { x: px, y: py, z: zTip }, r: penR * 0.45, col: tipColors }
      ];
      if (checkZ1 < checkZ0) segments.reverse();
      for (let i = 0; i < segments.length; i++) {
        const s = segments[i];
        drawCylinderSegment3D(s.a, s.b, s.r, s.col, yaw, pitch, camDist, fovScale, yOffsetPx);
      }
    } else {
      // -Z side of the window: Brass ring -> Blue rear barrel -> Cap & Pocket Clip
      const z0 = 0.0;
      const zRing = -0.18 * scale;
      const zCapStart = -penLen * 0.58;
      const zEnd = -penLen;

      const checkZ0 = transformPoint({ x: px, y: py, z: z0 }, yaw, pitch).z;
      const checkZ1 = transformPoint({ x: px, y: py, z: zEnd }, yaw, pitch).z;
      const segments = [
        { a: { x: px, y: py, z: z0 }, b: { x: px, y: py, z: zRing }, r: penR * 1.05, col: brassColors },
        { a: { x: px, y: py, z: zRing }, b: { x: px, y: py, z: zCapStart }, r: penR, col: blueColors },
        { a: { x: px, y: py, z: zCapStart }, b: { x: px, y: py, z: zEnd }, r: penR * 1.14, col: blueColors }
      ];
      if (checkZ1 < checkZ0) segments.reverse();
      for (let i = 0; i < segments.length; i++) {
        const s = segments[i];
        drawCylinderSegment3D(s.a, s.b, s.r, s.col, yaw, pitch, camDist, fovScale, yOffsetPx);
      }
    }
  }

  // Draw a 3D cube suspended from the short corner of the Ames Window (classic Curiosity Show prop #2)
  function drawCornerCube(cornerPt, signZ, yaw, pitch, camDist, fovScale, scheme, scale = 1.0, yOffsetPx = 0) {
    // Cube hangs slightly in front/below the short corner
    const cx = cornerPt.x + 0.18 * scale;
    const cy = cornerPt.y - 0.42 * scale;
    const cz = 0.55 * scale * signZ;
    const r = 0.22 * scale;

    // Suspension wire from short corner to cube
    drawCylinderSegment3D(
      { x: cornerPt.x, y: cornerPt.y, z: 0 },
      { x: cx, y: cy, z: cz },
      0.022 * scale,
      { light: '#fef08a', mid: scheme.penBrass, dark: '#713f12' },
      yaw,
      pitch,
      camDist,
      fovScale,
      yOffsetPx
    );

    const v = [
      { x: cx - r, y: cy - r, z: cz - r },
      { x: cx + r, y: cy - r, z: cz - r },
      { x: cx + r, y: cy + r, z: cz - r },
      { x: cx - r, y: cy + r, z: cz - r },
      { x: cx - r, y: cy - r, z: cz + r },
      { x: cx + r, y: cy - r, z: cz + r },
      { x: cx + r, y: cy + r, z: cz + r },
      { x: cx - r, y: cy + r, z: cz + r }
    ];
    const faces = [
      { idx: [4, 5, 6, 7], col: '#f97316' },
      { idx: [1, 0, 3, 2], col: '#ea580c' },
      { idx: [3, 7, 6, 2], col: '#fde047' },
      { idx: [0, 1, 5, 4], col: '#ca8a04' },
      { idx: [0, 4, 7, 3], col: '#38bdf8' },
      { idx: [5, 1, 2, 6], col: '#0284c7' }
    ];

    const projFaces = [];
    for (let f = 0; f < faces.length; f++) {
      const pts = [];
      let zSum = 0;
      let ok = true;
      for (let k = 0; k < 4; k++) {
        const w = transformPoint(v[faces[f].idx[k]], yaw, pitch);
        const p = project3D(w, camDist, fovScale, yOffsetPx);
        if (!p) {
          ok = false;
          break;
        }
        pts.push(p);
        zSum += p.z;
      }
      if (ok) {
        projFaces.push({ pts, zSort: zSum * 0.25, col: faces[f].col });
      }
    }
    projFaces.sort((a, b) => a.zSort - b.zSort);

    ctx.save();
    for (let f = 0; f < projFaces.length; f++) {
      const pf = projFaces[f];
      ctx.beginPath();
      ctx.moveTo(pf.pts[0].x, pf.pts[0].y);
      for (let k = 1; k < pf.pts.length; k++) ctx.lineTo(pf.pts[k].x, pf.pts[k].y);
      ctx.closePath();
      ctx.fillStyle = pf.col;
      ctx.fill();
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.55)';
      ctx.lineWidth = 0.9;
      ctx.stroke();
    }
    ctx.restore();
  }

  // Render a complete Ames Window assembly (with BSP-sorted penetrating pen/cube props)
  function renderWindowAssembly(geom, yaw, pitch, camDist, fovScale, scheme, propMode, scale = 1.0, yOffsetPx = 0) {
    // 1. Suspension torsion thread at x = 0 from top of screen down to the top rail of the window
    const topMountWorld = transformPoint({ x: 0, y: 4.5 * scale, z: 0 }, yaw, pitch);
    const windowHookWorld = transformPoint({ x: 0, y: 1.62 * scale, z: 0 }, yaw, pitch);
    const pMount = project3D(topMountWorld, camDist, fovScale, yOffsetPx);
    const pHook = project3D(windowHookWorld, camDist, fovScale, yOffsetPx);
    if (pMount && pHook) {
      ctx.save();
      ctx.strokeStyle = 'rgba(226, 232, 240, 0.55)';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(pMount.x, pMount.y);
      ctx.lineTo(pHook.x, pHook.y);
      ctx.stroke();
      ctx.restore();
    }

    // Determine which side of the z_local = 0 window plane faces the camera:
    // Local normal n = (0, 0, 1) transformed by (yaw, pitch) has z_world = cos(yaw) * cos(pitch).
    const normalZ = Math.cos(yaw) * Math.cos(pitch);
    const frontSign = normalZ >= 0 ? 1 : -1;
    const backSign = -frontSign;

    const hasPen = propMode === 'pen_through' || propMode === 'pen_and_cube' || propMode === 'double_counter';
    const hasCube = propMode === 'pen_and_cube';

    // 2. BSP Step A: Render the BACK half of props (on the away-facing side of the window plane)
    if (hasPen) {
      drawPenHalf(geom.centerPanePt, backSign, yaw, pitch, camDist, fovScale, scheme, scale, yOffsetPx);
    }
    if (hasCube && backSign > 0) {
      drawCornerCube(geom.shortCornerPt, 1, yaw, pitch, camDist, fovScale, scheme, scale, yOffsetPx);
    }

    // 3. BSP Step B: Render the flat painted Ames Window polygons in the z_local = 0 plane
    // Note: Diffuse studio lighting is deliberately kept nearly uniform across rotation angles
    // so directional shading does not break the monocular Ames perspective illusion!
    ctx.save();
    for (let i = 0; i < geom.polys.length; i++) {
      const poly = geom.polys[i];
      const screenPts = [];
      let valid = true;
      for (let k = 0; k < poly.verts.length; k++) {
        const w = transformPoint(poly.verts[k], yaw, pitch);
        const sp = project3D(w, camDist, fovScale, yOffsetPx);
        if (!sp) {
          valid = false;
          break;
        }
        screenPts.push(sp);
      }
      if (!valid) continue;

      ctx.beginPath();
      ctx.moveTo(screenPts[0].x, screenPts[0].y);
      for (let k = 1; k < screenPts.length; k++) {
        ctx.lineTo(screenPts[k].x, screenPts[k].y);
      }
      ctx.closePath();

      if (poly.role === 'face_white') {
        ctx.fillStyle = scheme.faceWhite;
        ctx.strokeStyle = scheme.faceWhite;
      } else if (poly.role === 'jamb_vertical') {
        ctx.fillStyle = scheme.jambVertical;
        ctx.strokeStyle = scheme.jambVertical;
      } else if (poly.role === 'jamb_horizontal') {
        ctx.fillStyle = scheme.jambHorizontal;
        ctx.strokeStyle = scheme.jambHorizontal;
      } else {
        ctx.fillStyle = scheme.outerLeftEdge;
        ctx.strokeStyle = scheme.outerLeftEdge;
      }
      ctx.fill();
      ctx.lineWidth = 0.65;
      ctx.stroke();
    }

    // Crisp painted border lines between the white frame and the painted red reveals
    // (gives the sharp screen-printed look of the physical 1951 Ames Window)
    for (let i = 0; i < geom.polys.length; i++) {
      const poly = geom.polys[i];
      if (poly.role === 'face_white') continue;
      const screenPts = [];
      let valid = true;
      for (let k = 0; k < poly.verts.length; k++) {
        const w = transformPoint(poly.verts[k], yaw, pitch);
        const sp = project3D(w, camDist, fovScale, yOffsetPx);
        if (!sp) {
          valid = false;
          break;
        }
        screenPts.push(sp);
      }
      if (!valid) continue;
      ctx.beginPath();
      ctx.moveTo(screenPts[0].x, screenPts[0].y);
      for (let k = 1; k < screenPts.length; k++) ctx.lineTo(screenPts[k].x, screenPts[k].y);
      ctx.closePath();
      ctx.strokeStyle = 'rgba(24, 18, 16, 0.38)';
      ctx.lineWidth = 0.85;
      ctx.stroke();
    }
    ctx.restore();

    // 4. BSP Step C: Render the FRONT half of props (on the camera-facing side of the window plane)
    if (hasPen) {
      drawPenHalf(geom.centerPanePt, frontSign, yaw, pitch, camDist, fovScale, scheme, scale, yOffsetPx);
    }
    if (hasCube && frontSign > 0) {
      drawCornerCube(geom.shortCornerPt, 1, yaw, pitch, camDist, fovScale, scheme, scale, yOffsetPx);
    }
  }

  function drawHud(scheme, propMode, pitchRad, dirSign) {
    ctx.save();

    const padX = 22;
    const padY = 20;
    const boxW = Math.min(540, width - 44);
    const boxH = 128;

    const { r, g, b } = scheme.accentRgb;
    ctx.fillStyle = 'rgba(10, 12, 18, 0.78)';
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

    ctx.fillStyle = scheme.accentHex;
    ctx.font = '700 13.5px "Inter", "Segoe UI", sans-serif';
    ctx.fillText('AMES WINDOW OPTICAL ILLUSION — ADELBERT AMES JR. (1951)', padX + 14, padY + 24);

    const trueDeg = (((angleRad * 180) / Math.PI) % 360 + 360) % 360;
    // Perceived oscillation angle: brain perceives the tall end as always facing forward, oscillating ±68°
    const perceivedOscDeg = Math.sin(angleRad) * 68;
    const isFalseDepthPhase = Math.cos(angleRad) < 0; // True short end is closer, but tall end looks closer!

    ctx.fillStyle = 'rgba(241, 245, 249, 0.95)';
    ctx.font = '700 15px "JetBrains Mono", "Fira Code", monospace';
    ctx.fillText(
      `TRUE 360° SPIN: ${trueDeg.toFixed(0).padStart(3, '0')}° (${dirSign > 0 ? 'CCW' : 'CW'} Continuous)  |  PERCEIVED: ${perceivedOscDeg >= 0 ? '+' : ''}${perceivedOscDeg.toFixed(0)}° Swing`,
      padX + 14,
      padY + 52
    );

    const statusLine =
      pitchRad > 0.25
        ? 'CAMERA: Overhead Bird’s-Eye Truth Reveal (Showing actual 360° circular rotation)'
        : isFalseDepthPhase
        ? 'ILLUSION ACTIVE: Short edge is physically closer, yet tall edge appears closer (Reversal Phase!)'
        : 'TRUE DEPTH PHASE: Tall edge is physically closer — matches brain’s rectangular window model';

    ctx.fillStyle = isFalseDepthPhase && pitchRad <= 0.25 ? '#fde047' : 'rgba(186, 230, 253, 0.92)';
    ctx.font = '600 11.5px "JetBrains Mono", "Fira Code", monospace';
    ctx.fillText(statusLine, padX + 14, padY + 78);

    const propLabels = {
      pen_through: 'Prop: Blue Ballpoint Pen through central pane (rotates 360° while window appears to reverse!)',
      pen_and_cube: 'Props: Penetrating Blue Pen + Suspended Corner Cube (conflicting 360° vs 180° motion cues)',
      double_counter: 'Apparatus: Dual 90°-Phased Ames Windows on a single torsion wire',
      pure_window: 'Apparatus: Unadorned 1951 Trapezoidal 6-Pane Ames Window (2.38:1 Tall-to-Short Ratio)'
    };
    ctx.fillStyle = 'rgba(148, 163, 184, 0.9)';
    ctx.font = '500 11px "JetBrains Mono", "Fira Code", monospace';
    ctx.fillText(propLabels[propMode] || propLabels.pen_through, padX + 14, padY + 102);

    // Top-Right Mini Top-Down Plan View Radar (proving the window and pen spin 360° continuously!)
    if (width >= 760) {
      const radarSize = 128;
      const rx = width - radarSize - 22;
      const ry = 20;
      const cx = rx + radarSize * 0.5;
      const cy = ry + radarSize * 0.56;
      const rad = 38;

      ctx.fillStyle = 'rgba(10, 12, 18, 0.78)';
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.38)`;
      if (typeof ctx.roundRect === 'function') {
        ctx.beginPath();
        ctx.roundRect(rx, ry, radarSize, radarSize, 10);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillRect(rx, ry, radarSize, radarSize);
        ctx.strokeRect(rx, ry, radarSize, radarSize);
      }

      ctx.fillStyle = scheme.accentHex;
      ctx.font = '700 10.5px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('TOP-DOWN TRUTH VIEW', cx, ry + 16);

      // Orbit circle
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.32)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.stroke();

      // Rotating window line in top-down plan view
      const wx = Math.cos(angleRad) * rad;
      const wz = -Math.sin(angleRad) * rad;

      // Pen line (perpendicular to window in top-down view)
      if (propMode !== 'pure_window') {
        const px = -Math.sin(angleRad) * (rad * 0.72);
        const pz = -Math.cos(angleRad) * (rad * 0.72);
        ctx.strokeStyle = scheme.penBodyLight;
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.moveTo(cx - px, cy - pz);
        ctx.lineTo(cx + px, cy + pz);
        ctx.stroke();
      }

      // Window plane bar in top-down view (tall end marked with terracotta red dot)
      ctx.strokeStyle = scheme.faceWhite;
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(cx - wx, cy - wz);
      ctx.lineTo(cx + wx, cy + wz);
      ctx.stroke();

      ctx.fillStyle = scheme.jambVertical;
      ctx.beginPath();
      ctx.arc(cx - wx, cy - wz, 4.2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  function resize(w, h) {
    width = w || canvas.width || 1280;
    height = h || canvas.height || 720;
  }

  function render(dt = 0.016) {
    const p = (typeof getParams === 'function' ? getParams() : {}) || {};
    const rawPropMode = String(p.propMode || 'pen_through');
    const cameraMode = String(p.cameraMode || 'eye_level');
    const schemeKey = String(p.colorScheme || 'curiosity_classic');
    const scheme = COLOR_SCHEMES[schemeKey] || COLOR_SCHEMES.curiosity_classic;

    const rotSpeed = clamp(Number(p.rotSpeed ?? 1.0), 0.2, 2.5);
    const spinDirection = String(p.spinDirection || 'ccw') === 'cw' ? -1 : 1;
    const showHud = p.showHud !== false;

    const safeDt = clamp(dt, 0.001, 0.1);
    simTime += safeDt;

    // Constant angular velocity (~11 RPM at 1.0x speed, matching the Curiosity Show motor/thread)
    angleRad += safeDt * rotSpeed * 1.15 * spinDirection;

    // Resolve active prop mode if set to auto_cycle
    const propModesList = ['pen_through', 'pen_and_cube', 'pure_window', 'double_counter'];
    const propMode =
      rawPropMode === 'auto_cycle'
        ? propModesList[Math.floor(simTime / 18) % propModesList.length]
        : rawPropMode;

    // Resolve camera pitch angle:
    // - 'eye_level': classic 0° eye-level view where the Ames Window illusion is unbreakable
    // - 'periodic_reveal': stays at 0° eye-level for 18s, then smoothly tilts up to 50° overhead for 6s
    // - 'overhead_truth': high 48° angle showing the true circular rotation
    let pitchRad = 0.02;
    if (cameraMode === 'overhead_truth') {
      pitchRad = 0.82;
    } else if (cameraMode === 'periodic_reveal') {
      const cyclePos = simTime % 24;
      if (cyclePos > 17 && cyclePos < 23.5) {
        const rise = smoothstep(17, 19, cyclePos);
        const fall = 1 - smoothstep(21.5, 23.5, cyclePos);
        pitchRad = 0.02 + rise * fall * 0.82;
      }
    }

    // Long focal length (camDist = 24.0) keeps true perspective depth ratio subtle so the
    // built-in 2.38:1 trapezoidal foreshortening of the Ames Window dominates perception.
    const camDist = 24.0;
    const fovScale = Math.min(width, height) * 2.45;

    // 1. Studio Backdrop
    drawStudioBackground(scheme, pitchRad);

    // 2. Ambient studio dust motes
    for (let i = 0; i < motes.length; i++) {
      const m = motes[i];
      const mp = project3D(
        transformPoint(m, simTime * 0.08, pitchRad * 0.4),
        camDist,
        fovScale
      );
      if (!mp || mp.x < 0 || mp.x > width || mp.y < 0 || mp.y > height) continue;
      ctx.fillStyle = `rgba(${scheme.accentRgb.r}, ${scheme.accentRgb.g}, ${scheme.accentRgb.b}, 0.18)`;
      ctx.beginPath();
      ctx.arc(mp.x, mp.y, m.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Render Ames Window Assembly (Single or Dual 90°-Phased Counter-Stack)
    if (propMode === 'double_counter') {
      const offsetPx = Math.min(width, height) * 0.21;
      renderWindowAssembly(
        dualTopGeom,
        angleRad,
        pitchRad,
        camDist,
        fovScale,
        scheme,
        'pen_through',
        0.68,
        -offsetPx
      );
      renderWindowAssembly(
        dualBotGeom,
        angleRad + Math.PI * 0.5,
        pitchRad,
        camDist,
        fovScale,
        scheme,
        'pen_through',
        0.68,
        offsetPx
      );
    } else {
      renderWindowAssembly(
        mainWindowGeom,
        angleRad,
        pitchRad,
        camDist,
        fovScale,
        scheme,
        propMode,
        1.0,
        0
      );
    }

    // 4. HUD & Top-Down Truth Radar
    if (showHud) {
      drawHud(scheme, propMode, pitchRad, spinDirection);
    }
  }

  function destroy() {}

  return { render, resize, destroy };
}
