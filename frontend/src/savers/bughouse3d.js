// Apex 3D Chess Screensaver — bughouse-online.com Spatial Chess Arena
// Recreates the breathtaking 8x8x5 3-dimensional chess game from bughouse-online.com:
// - 5 full 8x8 tiered boards (Levels A, B, C, D, E) comprising 320 coordinate cells
// - Realistic 3D Staunton pieces + Royal Princesses and Princes
// - Dimensional portal transit corridors & Red Wall demarcations
// - Autonomous real-time AI vs AI engine battles (Alpha-Beta minimax)
// - Cinematic smooth camera orbit with dynamic elevation drifting
// - Gorgeous glassmorphic HUD spotlighting bughouse-online.com

import * as THREE from 'three';
import {
  ThreeDGame,
  posToString,
  pieceNotationSymbol,
  isDimensionalGateRank,
  BOARD_SIZE,
  BOARD_LEVELS
} from './threedEngine.js';

const LEVEL_SPACING = 3.6;
const LEVELS = 5;

function getLevelY(z) {
  return (z - 2) * LEVEL_SPACING;
}

export function createBughouse3D(canvas, getParams, getTelemetry) {
  let w = canvas.clientWidth || window.innerWidth;
  let h = canvas.clientHeight || window.innerHeight;

  // Three.js Scene, Camera, Renderer
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050914);
  scene.fog = new THREE.FogExp2(0x050914, 0.016);

  const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
  camera.position.set(0, 8, 23);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance'
  });
  renderer.setSize(w, h, false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // 2D Glassmorphic HUD Overlay Canvas
  let hudCanvas = null;
  let hudCtx = null;
  const parent = canvas.parentElement;
  if (parent) {
    hudCanvas = document.createElement('canvas');
    hudCanvas.className = 'bughouse-hud-overlay';
    hudCanvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:5;';
    hudCanvas.width = w;
    hudCanvas.height = h;
    parent.appendChild(hudCanvas);
    hudCtx = hudCanvas.getContext('2d');
  }

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambientLight);

  const keyLight = new THREE.DirectionalLight(0xfff7ed, 1.4);
  keyLight.position.set(16, 26, 20);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 1024;
  keyLight.shadow.mapSize.height = 1024;
  keyLight.shadow.camera.near = 0.5;
  keyLight.shadow.camera.far = 80;
  keyLight.shadow.bias = -0.0005;
  scene.add(keyLight);

  const fillCyan = new THREE.DirectionalLight(0x38bdf8, 0.85);
  fillCyan.position.set(-18, -10, -15);
  scene.add(fillCyan);

  const rimAmber = new THREE.DirectionalLight(0xf59e0b, 0.45);
  rimAmber.position.set(12, -15, -10);
  scene.add(rimAmber);

  // Groups
  const arenaGroup = new THREE.Group();
  scene.add(arenaGroup);

  const boardsGroup = new THREE.Group();
  arenaGroup.add(boardsGroup);

  const piecesGroup = new THREE.Group();
  arenaGroup.add(piecesGroup);

  const fxGroup = new THREE.Group();
  arenaGroup.add(fxGroup);

  // Build the 8x8x5 multi-level boards
  buildBoards(boardsGroup);

  // Game Engine & AI State
  let game = new ThreeDGame();
  let pieceMeshes = [];
  let moveHistoryLog = [];
  let lastMoveDesc = 'Initial Setup';
  let activeMoveAnim = null;
  let nextMoveTimer = performance.now() + 800;
  let isGameOver = false;
  let gameOverResetTimer = 0;
  let moveCount = 0;

  // Populate pieces from starting position
  spawnPieces();

  // Camera State: The Spectator Stroll
  let strollTime = 0;
  let orbitAngle = 0.5;
  let currentCamRadius = 21.0;
  let currentCamHeight = 5.5;
  let currentLookAtY = 0.0;
  let activeBattleY = 0.0;

  function spawnPieces() {
    while (piecesGroup.children.length > 0) {
      const child = piecesGroup.children[0];
      piecesGroup.remove(child);
    }
    pieceMeshes = [];

    for (let z = 0; z < BOARD_LEVELS; z++) {
      const yPos = getLevelY(z);
      for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
          const piece = game.getPiece({ x, y, z });
          if (piece) {
            const mesh = createRealisticPieceGroup(piece);
            mesh.position.set(x - 3.5, yPos, y - 3.5);
            piecesGroup.add(mesh);
            pieceMeshes.push({ mesh, x, y, z, piece });
          }
        }
      }
    }
  }

  function triggerNextAIMove() {
    if (isGameOver || activeMoveAnim) return;

    if (game.result && game.result.isOver) {
      isGameOver = true;
      gameOverResetTimer = performance.now() + 4000;
      return;
    }

    // AI Best Move search (depth 1 with 16 candidates: blazing fast ~35ms, zero main-thread freeze!)
    const best = game.findBestMove(1, 16, 0.12);
    if (!best || !best.from || !best.to) {
      isGameOver = true;
      gameOverResetTimer = performance.now() + 3500;
      return;
    }

    const { from, to } = best;
    const movingPiece = game.getPiece(from);
    if (!movingPiece) return;

    const movingEntry = pieceMeshes.find(p => p.x === from.x && p.y === from.y && p.z === from.z);
    if (!movingEntry) return;

    const capturedEntry = pieceMeshes.find(p => p.x === to.x && p.y === to.y && p.z === to.z && p !== movingEntry);

    const executed = game.makeMove(from, to);
    if (!executed) return;

    moveCount++;
    const isWhite = movingPiece === movingPiece.toUpperCase();
    const sideName = isWhite ? 'White' : 'Black';
    const sym = pieceNotationSymbol(movingPiece);
    const fromStr = posToString(from);
    const toStr = posToString(to);

    const isTransit = from.z !== to.z;
    const transitNote = isTransit ? ` [${fromStr[0]} ➔ ${toStr[0]}]` : '';
    const capNote = executed.captured ? ' ×' : '';
    lastMoveDesc = `${sideName}: ${sym} ${fromStr.slice(1)}➔${toStr.slice(1)}${capNote}${transitNote}`;
    moveHistoryLog.unshift(lastMoveDesc);
    if (moveHistoryLog.length > 8) moveHistoryLog.pop();

    // Update active battle height for spectator focal tracking
    activeBattleY = getLevelY(to.z);

    // Portal visual rings if jumping vertically
    fxGroup.clear();
    if (isTransit) {
      const ringGeo = new THREE.RingGeometry(0.24, 0.55, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9
      });

      const ring1 = new THREE.Mesh(ringGeo, ringMat);
      ring1.rotation.x = Math.PI / 2;
      ring1.position.set(from.x - 3.5, getLevelY(from.z) + 0.05, from.y - 3.5);
      fxGroup.add(ring1);

      const ring2 = new THREE.Mesh(ringGeo, ringMat);
      ring2.rotation.x = Math.PI / 2;
      ring2.position.set(to.x - 3.5, getLevelY(to.z) + 0.05, to.y - 3.5);
      fxGroup.add(ring2);
    }

    const startPos = movingEntry.mesh.position.clone();
    const targetPos = new THREE.Vector3(to.x - 3.5, getLevelY(to.z), to.y - 3.5);
    const animDuration = isTransit ? 840 : 640;

    activeMoveAnim = {
      entry: movingEntry,
      captured: capturedEntry || null,
      startPos,
      targetPos,
      fromZ: from.z,
      toZ: to.z,
      isTransit,
      startTime: performance.now(),
      durationMs: animDuration,
      onComplete: () => {
        movingEntry.x = to.x;
        movingEntry.y = to.y;
        movingEntry.z = to.z;
        movingEntry.mesh.position.copy(targetPos);
        movingEntry.mesh.rotation.x = 0;
        movingEntry.mesh.rotation.z = 0;

        if (capturedEntry) {
          piecesGroup.remove(capturedEntry.mesh);
          pieceMeshes = pieceMeshes.filter(p => p !== capturedEntry);
        }

        activeMoveAnim = null;

        if (fxGroup.children.length > 0) {
          setTimeout(() => { fxGroup.clear(); }, 350);
        }

        // Seamless transition: start next move virtually immediately (45ms graceful breath)
        nextMoveTimer = performance.now() + 45;
      }
    };
  }

  function resetGame() {
    game = new ThreeDGame();
    isGameOver = false;
    gameOverResetTimer = 0;
    moveCount = 0;
    moveHistoryLog = [];
    lastMoveDesc = 'New Match Started';
    activeBattleY = 0;
    spawnPieces();
    nextMoveTimer = performance.now() + 800;
  }

  return {
    resize(newW, newH) {
      w = newW;
      h = newH;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH, false);
      if (hudCanvas) {
        hudCanvas.width = newW;
        hudCanvas.height = newH;
      }
    },

    destroy() {
      if (hudCanvas && hudCanvas.parentElement) {
        hudCanvas.parentElement.removeChild(hudCanvas);
        hudCanvas = null;
        hudCtx = null;
      }
      renderer.dispose();
    },

    render(dt) {
      const now = performance.now();
      const p = getParams ? getParams() : {};
      const orbitSpeed = p.orbitSpeed !== undefined ? Number(p.orbitSpeed) : 0.6;
      const showHud = p.showHud !== undefined ? Boolean(p.showHud) : true;

      // -------------------------------------------------------------
      // Calm "Spectator Stroll" Camera System
      // Gradually walks around the board, slowly zooming in and out,
      // looking at each level a while while keeping active play in primary focus.
      // -------------------------------------------------------------
      strollTime += dt * 0.12 * orbitSpeed;

      // 1. Stately, steady walking pace around the perimeter (~140 seconds per full revolution)
      orbitAngle += dt * 0.055 * orbitSpeed;

      // 2. Slow, gradual breathing zoom (cycles gently over ~75 seconds)
      // Gently glides between closer look (~17.5) and overview (~22.5)
      const targetRadius = 20.2 + Math.sin(strollTime * 0.35) * 2.8;
      currentCamRadius += (targetRadius - currentCamRadius) * Math.min(1.0, dt * 0.7);

      // 3. Gradually looking across each level a while (cycles gently over ~100 seconds)
      // Lingers and drifts across lower, middle, and upper tiers (height ~2.2 to ~8.8)
      const spectatorElevation = 5.4 + Math.sin(strollTime * 0.22) * 3.4;
      currentCamHeight += (spectatorElevation - currentCamHeight) * Math.min(1.0, dt * 0.7);

      camera.position.x = Math.sin(orbitAngle) * currentCamRadius;
      camera.position.z = Math.cos(orbitAngle) * currentCamRadius;
      camera.position.y = currentCamHeight;

      // 4. Keeping active play in primary focus:
      // Arena center (x=0, z=0) stays solidly framed.
      // Vertical look-at gently, slowly tracks the active battle plane without abrupt jumps.
      const targetLookAtY = activeBattleY * 0.45;
      currentLookAtY += (targetLookAtY - currentLookAtY) * Math.min(1.0, dt * 0.8);

      camera.lookAt(0, currentLookAtY, 0);
      camera.up.set(0, 1, 0);

      // AI Move Dispatch
      if (!activeMoveAnim && !isGameOver && now >= nextMoveTimer) {
        triggerNextAIMove();
      } else if (isGameOver && now >= gameOverResetTimer) {
        resetGame();
      }

      // Active Move Parabolic Flight & Graceful Easing
      if (activeMoveAnim) {
        const elapsed = now - activeMoveAnim.startTime;
        const t = Math.min(1.0, elapsed / activeMoveAnim.durationMs);

        // Sine easeInOut for natural, organic momentum
        const ease = 0.5 - 0.5 * Math.cos(t * Math.PI);
        const start = activeMoveAnim.startPos;
        const target = activeMoveAnim.targetPos;

        activeMoveAnim.entry.mesh.position.x = start.x + (target.x - start.x) * ease;
        activeMoveAnim.entry.mesh.position.z = start.z + (target.z - start.z) * ease;

        const isVertical = activeMoveAnim.isTransit;
        const arcPeak = isVertical ? 2.2 : 0.85;
        const arc = Math.sin(t * Math.PI) * arcPeak;
        activeMoveAnim.entry.mesh.position.y = start.y + (target.y - start.y) * ease + arc;

        // Graceful forward tilt / lean in direction of flight
        const dx = target.x - start.x;
        const dz = target.z - start.z;
        const tiltFactor = Math.sin(t * Math.PI);
        activeMoveAnim.entry.mesh.rotation.z = -dx * tiltFactor * 0.07;
        activeMoveAnim.entry.mesh.rotation.x = dz * tiltFactor * 0.07;

        // Gracefully shrink & dissolve captured piece
        if (activeMoveAnim.captured) {
          const fadeScale = Math.max(0.001, 1.0 - Math.pow(t, 1.6));
          activeMoveAnim.captured.mesh.scale.setScalar(fadeScale);
        }

        if (t >= 1.0) {
          activeMoveAnim.onComplete();
        }
      }

      // Render 3D Scene
      renderer.render(scene, camera);

      // Render 2D Glassmorphic HUD Overlay (spotlighting bughouse-online.com)
      if (hudCtx && showHud) {
        renderHUD(hudCtx, hudCanvas.width, hudCanvas.height, game, lastMoveDesc, moveCount, moveHistoryLog, isGameOver);
      } else if (hudCtx) {
        hudCtx.clearRect(0, 0, hudCanvas.width, hudCanvas.height);
      }
    }
  };
}

// -------------------------------------------------------------
// 3D Boards & Environment Construction
// -------------------------------------------------------------
function buildBoards(parentGroup) {
  const squareGeo = new THREE.BoxGeometry(0.96, 0.08, 0.96);
  const borderGeo = new THREE.BoxGeometry(8.5, 0.12, 8.5);

  const lightSquareMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    transparent: true,
    opacity: 0.65,
    roughness: 0.2,
    metalness: 0.25
  });

  const darkSquareMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    transparent: true,
    opacity: 0.65,
    roughness: 0.2,
    metalness: 0.25
  });

  // Glowing Cyan Gate Squares for Dimensional Transit (Ranks 3-6)
  const lightGateMat = new THREE.MeshStandardMaterial({
    color: 0xa5f3fc,
    transparent: true,
    opacity: 0.8,
    roughness: 0.15,
    metalness: 0.35
  });

  const darkGateMat = new THREE.MeshStandardMaterial({
    color: 0x0e7490,
    transparent: true,
    opacity: 0.8,
    roughness: 0.15,
    metalness: 0.35
  });

  for (let z = 0; z < LEVELS; z++) {
    const yPos = getLevelY(z);

    // Translucent Acrylic Border
    const borderMat = new THREE.MeshStandardMaterial({
      color: z === 2 ? 0x38bdf8 : (z === 0 || z === 4 ? 0x0284c7 : 0x0369a1),
      transparent: true,
      opacity: 0.28,
      roughness: 0.1,
      metalness: 0.85
    });
    const border = new THREE.Mesh(borderGeo, borderMat);
    border.position.set(0, yPos - 0.06, 0);
    parentGroup.add(border);

    // 8x8 Board Squares
    for (let y = 0; y < 8; y++) {
      const inGate = isDimensionalGateRank(y);
      for (let x = 0; x < 8; x++) {
        const isLight = (x + y + z) % 2 === 0;
        let mat = inGate
          ? (isLight ? lightGateMat : darkGateMat)
          : (isLight ? lightSquareMat : darkSquareMat);

        const sq = new THREE.Mesh(squareGeo, mat);
        sq.position.set(x - 3.5, yPos, y - 3.5);
        sq.receiveShadow = true;
        parentGroup.add(sq);
      }
    }

    // Demarcation Red Wall lines at Ranks 1-2 & Ranks 7-8
    const barrierMat = new THREE.LineBasicMaterial({
      color: 0xf43f5e,
      transparent: true,
      opacity: 0.85
    });

    const addWallLine = (zCenter) => {
      const pts = [
        new THREE.Vector3(-4.02, yPos + 0.05, zCenter - 1.02),
        new THREE.Vector3(4.02, yPos + 0.05, zCenter - 1.02),
        new THREE.Vector3(4.02, yPos + 0.05, zCenter + 1.02),
        new THREE.Vector3(-4.02, yPos + 0.05, zCenter + 1.02),
        new THREE.Vector3(-4.02, yPos + 0.05, zCenter - 1.02)
      ];
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      parentGroup.add(new THREE.Line(geo, barrierMat));
    };

    addWallLine(-3.0); // White home ranks 1-2
    addWallLine(3.0);  // Black home ranks 7-8
  }

  // 4 Corner Structural Pillars
  const pillarH = (LEVELS - 1) * LEVEL_SPACING + 1.6;
  const pillarGeo = new THREE.CylinderGeometry(0.09, 0.09, pillarH, 20);
  const pillarMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.15,
    metalness: 0.85
  });

  [[-4.2, -4.2], [4.2, -4.2], [-4.2, 4.2], [4.2, 4.2]].forEach(([cx, cz]) => {
    const pillar = new THREE.Mesh(pillarGeo, pillarMat);
    pillar.position.set(cx, 0, cz);
    parentGroup.add(pillar);
  });
}

// -------------------------------------------------------------
// Procedural Staunton & Royal Piece Meshes
// -------------------------------------------------------------
function createRealisticPieceGroup(char) {
  const group = new THREE.Group();
  const isWhite = char === char.toUpperCase();
  const pieceColor = isWhite ? 0xf8fafc : 0x182030;

  // Rich Staunton polished lacquer
  const mat = new THREE.MeshStandardMaterial({
    color: pieceColor,
    roughness: isWhite ? 0.22 : 0.28,
    metalness: isWhite ? 0.08 : 0.35
  });

  // Polished gold trim for White, burnished copper for Black
  const trimMat = new THREE.MeshStandardMaterial({
    color: isWhite ? 0xfbbf24 : 0x94a3b8,
    roughness: 0.2,
    metalness: 0.8
  });

  const p = char.toLowerCase();

  // Pedestal Base (two-tiered chamfered pedestal)
  const baseBottom = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.40, 0.12, 24), mat);
  baseBottom.position.y = 0.06;
  baseBottom.castShadow = true;
  group.add(baseBottom);

  const baseCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.36, 0.08, 24), mat);
  baseCollar.position.y = 0.15;
  baseCollar.castShadow = true;
  group.add(baseCollar);

  switch (p) {
    case 'p': { // PAWN
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.26, 0.38, 20), mat);
      stem.position.y = 0.36;
      stem.castShadow = true;
      group.add(stem);

      const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.20, 0.06, 20), mat);
      collar.position.y = 0.56;
      group.add(collar);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.20, 20, 20), mat);
      head.position.y = 0.74;
      head.castShadow = true;
      group.add(head);
      break;
    }
    case 'r': { // ROOK
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.31, 0.58, 24), mat);
      tower.position.y = 0.46;
      tower.castShadow = true;
      group.add(tower);

      const parapet = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.27, 0.18, 24), mat);
      parapet.position.y = 0.82;
      parapet.castShadow = true;
      group.add(parapet);

      for (let i = 0; i < 4; i++) {
        const angle = (i * Math.PI) / 2;
        const battlement = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), mat);
        battlement.position.set(Math.cos(angle) * 0.24, 0.94, Math.sin(angle) * 0.24);
        battlement.castShadow = true;
        group.add(battlement);
      }
      break;
    }
    case 'n': { // KNIGHT
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.29, 0.44, 16), mat);
      neck.position.set(0, 0.38, -0.04);
      neck.rotation.x = 0.18;
      neck.castShadow = true;
      group.add(neck);

      const head = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.34, 0.42), mat);
      head.position.set(0, 0.68, 0.06);
      head.rotation.x = -0.32;
      head.castShadow = true;
      group.add(head);

      const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.26, 12), mat);
      muzzle.position.set(0, 0.58, 0.26);
      muzzle.rotation.x = Math.PI / 2.3;
      muzzle.castShadow = true;
      group.add(muzzle);

      const earGeo = new THREE.ConeGeometry(0.06, 0.16, 8);
      const ear1 = new THREE.Mesh(earGeo, mat);
      ear1.position.set(-0.08, 0.88, -0.06);
      group.add(ear1);
      const ear2 = new THREE.Mesh(earGeo, mat);
      ear2.position.set(0.08, 0.88, -0.06);
      group.add(ear2);

      if (!isWhite) group.rotation.y = Math.PI;
      break;
    }
    case 'b': { // BISHOP
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 0.52, 20), mat);
      stem.position.y = 0.44;
      stem.castShadow = true;
      group.add(stem);

      const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.22, 0.08, 20), mat);
      collar.position.y = 0.72;
      group.add(collar);

      const mitreGeo = new THREE.SphereGeometry(0.24, 20, 20);
      mitreGeo.scale(1, 1.35, 1);
      const mitre = new THREE.Mesh(mitreGeo, mat);
      mitre.position.y = 0.98;
      mitre.castShadow = true;
      group.add(mitre);

      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 16), trimMat);
      ball.position.y = 1.34;
      group.add(ball);
      break;
    }
    case 'q': { // QUEEN
      const waist = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.32, 0.68, 24), mat);
      waist.position.y = 0.52;
      waist.castShadow = true;
      group.add(waist);

      const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.24, 0.08, 24), mat);
      ring.position.y = 0.88;
      group.add(ring);

      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.24, 0.32, 24), mat);
      crown.position.y = 1.06;
      crown.castShadow = true;
      group.add(crown);

      const pearl = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 16), trimMat);
      pearl.position.y = 1.26;
      group.add(pearl);
      break;
    }
    case 'k': { // KING
      const waist = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 0.78, 24), mat);
      waist.position.y = 0.58;
      waist.castShadow = true;
      group.add(waist);

      const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.26, 0.10, 24), mat);
      collar.position.y = 1.00;
      group.add(collar);

      const domeGeo = new THREE.SphereGeometry(0.30, 20, 20);
      domeGeo.scale(1, 0.75, 1);
      const dome = new THREE.Mesh(domeGeo, mat);
      dome.position.y = 1.18;
      dome.castShadow = true;
      group.add(dome);

      const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.26, 0.06), trimMat);
      crossV.position.y = 1.44;
      group.add(crossV);

      const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.06, 0.06), trimMat);
      crossH.position.y = 1.48;
      group.add(crossH);
      break;
    }
    case 'c': { // PRINCESS (Royal tiara with 5 points & center gem)
      const gown = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.28, 0.70, 24), mat);
      gown.position.y = 0.53;
      gown.castShadow = true;
      group.add(gown);

      const bodice = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.18, 0.08, 24), mat);
      bodice.position.y = 0.90;
      group.add(bodice);

      const tiaraBand = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.21, 0.12, 24), trimMat);
      tiaraBand.position.y = 1.00;
      tiaraBand.castShadow = true;
      group.add(tiaraBand);

      for (let i = 0; i < 5; i++) {
        const angle = (i * Math.PI * 2) / 5;
        const radius = 0.22;
        const peakH = i === 0 ? 0.22 : 0.15;
        const peak = new THREE.Mesh(new THREE.ConeGeometry(0.045, peakH, 12), trimMat);
        peak.position.set(Math.cos(angle) * radius, 1.06 + peakH / 2, Math.sin(angle) * radius);
        peak.castShadow = true;
        group.add(peak);
      }

      const gem = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 16), trimMat);
      gem.position.y = 1.20;
      group.add(gem);
      break;
    }
    case 'g': { // PRINCE (Ducal spiked crown + polished cabochon)
      const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.32, 0.70, 22), mat);
      torso.position.y = 0.53;
      torso.castShadow = true;
      group.add(torso);

      const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.23, 0.09, 22), mat);
      collar.position.y = 0.92;
      group.add(collar);

      const coronetBase = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.22, 0.16, 22), trimMat);
      coronetBase.position.y = 1.04;
      coronetBase.castShadow = true;
      group.add(coronetBase);

      const spikes = new THREE.Mesh(new THREE.ConeGeometry(0.27, 0.22, 4), trimMat);
      spikes.position.y = 1.18;
      spikes.rotation.y = Math.PI / 4;
      spikes.castShadow = true;
      group.add(spikes);

      const cabochon = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 16), trimMat);
      cabochon.position.y = 1.33;
      group.add(cabochon);
      break;
    }
    default: {
      const fallback = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.6, 0.35), mat);
      fallback.position.y = 0.45;
      group.add(fallback);
      break;
    }
  }

  return group;
}

// -------------------------------------------------------------
// 2D Glassmorphic HUD & bughouse-online.com Spotlighting
// -------------------------------------------------------------
function renderHUD(ctx, width, height, game, lastMoveDesc, moveCount, history, isGameOver) {
  ctx.clearRect(0, 0, width, height);

  const pad = 24;

  // 1. Top-Left: Apex 3D Chess & bughouse-online.com Showcase Card
  ctx.save();
  const cardW = Math.min(380, width - 48);
  const cardH = 105;

  ctx.fillStyle = 'rgba(7, 13, 24, 0.82)';
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, pad, pad, cardW, cardH, 14);
  ctx.fill();
  ctx.stroke();

  // Cyan glowing accent bar
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(pad + 14, pad + 14, 4, 32);

  // Title
  ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#f8fafc';
  ctx.fillText('⚔️ APEX 3D CHESS™', pad + 26, pad + 27);

  // Brand spotlight
  ctx.font = 'bold 14px "JetBrains Mono", Menlo, monospace';
  ctx.fillStyle = '#34d399';
  ctx.fillText('bughouse-online.com', pad + 26, pad + 44);

  // Subtitle
  ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('5-Tier Spatial Chess Arena • 320 Coordinate Cells • AI Battle', pad + 14, pad + 72);

  // Live status pill
  ctx.fillStyle = game.turn === 'w' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(15, 23, 42, 0.85)';
  ctx.strokeStyle = game.turn === 'w' ? '#f8fafc' : '#64748b';
  roundRect(ctx, pad + 14, pad + 80, 110, 16, 8);
  ctx.fill();
  ctx.stroke();

  ctx.font = 'bold 9px sans-serif';
  ctx.fillStyle = game.turn === 'w' ? '#f8fafc' : '#cbd5e1';
  ctx.fillText(`TURN: ${game.turn === 'w' ? 'WHITE' : 'BLACK'}`, pad + 24, pad + 92);

  ctx.restore();

  // 2. Top-Right: Move Ticker & Match Info Card
  if (width > 600) {
    ctx.save();
    const tickerW = 280;
    const tickerX = width - tickerW - pad;
    const tickerH = 105;

    ctx.fillStyle = 'rgba(7, 13, 24, 0.82)';
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
    ctx.lineWidth = 1.2;
    roundRect(ctx, tickerX, pad, tickerW, tickerH, 14);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 11px sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`MOVE #${moveCount}`, tickerX + 14, pad + 24);

    ctx.font = 'bold 13px "JetBrains Mono", monospace';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(lastMoveDesc, tickerX + 14, pad + 44);

    // Recent move trail
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillStyle = '#64748b';
    if (history[1]) ctx.fillText(`• ${history[1]}`, tickerX + 14, pad + 66);
    if (history[2]) ctx.fillText(`• ${history[2]}`, tickerX + 14, pad + 82);

    ctx.restore();
  }

  // 3. Center Bottom Banner Watermark
  ctx.save();
  const bannerW = Math.min(460, width - 40);
  const bannerH = 28;
  const bannerX = (width - bannerW) / 2;
  const bannerY = height - bannerH - 18;

  ctx.fillStyle = 'rgba(2, 6, 23, 0.75)';
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
  ctx.lineWidth = 1;
  roundRect(ctx, bannerX, bannerY, bannerW, bannerH, 14);
  ctx.fill();
  ctx.stroke();

  ctx.font = '500 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.textAlign = 'center';
  ctx.fillText('Play Apex 3D Chess & Bughouse Online free at ', bannerX + bannerW / 2 - 50, bannerY + 18);

  ctx.font = 'bold 11px "JetBrains Mono", monospace';
  ctx.fillStyle = '#34d399';
  ctx.fillText('bughouse-online.com', bannerX + bannerW / 2 + 105, bannerY + 18);

  ctx.restore();

  // 4. Game Over Victory Overlay
  if (isGameOver) {
    ctx.save();
    const ovW = Math.min(420, width - 40);
    const ovH = 110;
    const ovX = (width - ovW) / 2;
    const ovY = (height - ovH) / 2;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 2;
    roundRect(ctx, ovX, ovY, ovW, ovH, 16);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillStyle = '#f8fafc';
    ctx.textAlign = 'center';
    ctx.fillText('👑 Checkmate in 3D Space!', ovX + ovW / 2, ovY + 42);

    ctx.font = '13px sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('Resetting new 8x8x5 Vantage Arena match...', ovX + ovW / 2, ovY + 76);

    ctx.restore();
  }
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}
