// Classic Checkmates Screensaver — 100 Verified Fundamental Checkmate Patterns in 3D
// Displays all classic named checkmates (Fool's, Scholar's, Ladder, Back-Rank, Anastasia's,
// Smothered, Arabian, Boden's, Opera, Hook, Epaulette, Dovetail, Swallow's Tail, Damiano's,
// Lolli's, Greco's, Morphy's, Pillsbury's, Blackburne's, Réti's, Légal's, Blind Swine,
// Vuković, Suffocation, Two Bishops, Knight Underpromotion, and elementary mates) in both
// Simplest Form and In-Situ game variations, for both White-to-mate and Black-to-mate.

import * as THREE from 'three';
import {
  THEMES,
  parseSquare,
  sqToWorld,
  buildStauntonTemplates,
  assemblePieceGroup
} from './chessOpenings.js';
import { CLASSIC_MATES } from './classicMatesData.js';

function parseFENBoard(fen) {
  const b = Array.from({ length: 8 }, () => Array(8).fill(null));
  const placement = (fen || '').split(' ')[0] || '';
  const rows = placement.split('/');
  for (let rIdx = 0; rIdx < 8 && rIdx < rows.length; rIdx++) {
    const rank = 7 - rIdx;
    let file = 0;
    for (const ch of rows[rIdx]) {
      if (ch >= '1' && ch <= '8') {
        file += parseInt(ch, 10);
      } else if (file < 8) {
        const isUpper = ch === ch.toUpperCase();
        b[file][rank] = {
          color: isUpper ? 'w' : 'b',
          type: ch.toUpperCase()
        };
        file++;
      }
    }
  }
  return b;
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

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function buildDeck(filter, order) {
  let pool = CLASSIC_MATES;
  if (filter === 'simplest') {
    pool = CLASSIC_MATES.filter(m => m.form === 'Simplest Form');
  } else if (filter === 'insitu') {
    pool = CLASSIC_MATES.filter(m => m.form === 'In-Situ');
  } else if (filter === 'white') {
    pool = CLASSIC_MATES.filter(m => m.winner === 'White');
  } else if (filter === 'black') {
    pool = CLASSIC_MATES.filter(m => m.winner === 'Black');
  }
  if (pool.length === 0) pool = CLASSIC_MATES;

  const list = pool.slice();
  if (order !== 'sequential') {
    // Fisher-Yates shuffle
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
  }
  return list;
}

export function createClassicMates(canvas, getParams) {
  const w = canvas.width;
  const h = canvas.height;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x070a12);

  const camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 100);
  camera.position.set(5.5, 9.5, 11.5);
  camera.lookAt(0, 0.4, 0);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance'
  });
  renderer.setSize(w, h, false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  // 2D HUD Overlay
  let hudCanvas = null;
  let hudCtx = null;
  const parent = canvas.parentElement;
  if (parent) {
    hudCanvas = document.createElement('canvas');
    hudCanvas.className = 'chess-hud-overlay';
    hudCanvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:5;';
    hudCanvas.width = w;
    hudCanvas.height = h;
    parent.appendChild(hudCanvas);
    hudCtx = hudCanvas.getContext('2d');
  }

  // Lighting
  scene.add(new THREE.AmbientLight(0xffffff, 0.68));
  const dirLight = new THREE.DirectionalLight(0xfff6ea, 1.5);
  dirLight.position.set(7.5, 15.0, 9.0);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  dirLight.shadow.camera.near = 1;
  dirLight.shadow.camera.far = 30;
  dirLight.shadow.camera.left = -6;
  dirLight.shadow.camera.right = 6;
  dirLight.shadow.camera.top = 6;
  dirLight.shadow.camera.bottom = -6;
  dirLight.shadow.bias = -0.0008;
  scene.add(dirLight);

  const fillLight = new THREE.DirectionalLight(0xa5c4ff, 0.48);
  fillLight.position.set(-8.0, 9.0, -8.0);
  scene.add(fillLight);

  const templates = buildStauntonTemplates();

  let currentThemeName = 'walnut';
  let theme = THEMES.walnut;

  const matWhite = new THREE.MeshStandardMaterial({ color: theme.whitePiece, roughness: 0.22, metalness: 0.05 });
  const matBlack = new THREE.MeshStandardMaterial({ color: theme.blackPiece, roughness: 0.20, metalness: 0.12 });
  const matLightTile = new THREE.MeshStandardMaterial({ color: theme.lightTile, roughness: 0.26, metalness: 0.04 });
  const matDarkTile = new THREE.MeshStandardMaterial({ color: theme.darkTile, roughness: 0.28, metalness: 0.04 });
  const matFrame = new THREE.MeshStandardMaterial({ color: theme.frame, roughness: 0.35, metalness: 0.06 });
  const matTrim = new THREE.MeshStandardMaterial({ color: theme.rimTrim, roughness: 0.40, metalness: 0.08 });
  const matLastMove = new THREE.MeshStandardMaterial({
    color: theme.lastMove,
    emissive: theme.lastMove,
    emissiveIntensity: 0.45,
    roughness: 0.3
  });
  const matHighlight = new THREE.MeshStandardMaterial({
    color: theme.highlight,
    emissive: theme.highlight,
    emissiveIntensity: 0.55,
    roughness: 0.3
  });
  const matCheckmate = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xdc2626,
    emissiveIntensity: 0.85,
    roughness: 0.25
  });

  function updateMaterials(themeName) {
    if (themeName === currentThemeName) return;
    currentThemeName = themeName;
    theme = THEMES[themeName] || THEMES.walnut;
    matWhite.color.setHex(theme.whitePiece);
    matBlack.color.setHex(theme.blackPiece);
    matLightTile.color.setHex(theme.lightTile);
    matDarkTile.color.setHex(theme.darkTile);
    matFrame.color.setHex(theme.frame);
    matTrim.color.setHex(theme.rimTrim);
    matLastMove.color.setHex(theme.lastMove);
    matLastMove.emissive.setHex(theme.lastMove);
    matHighlight.color.setHex(theme.highlight);
    matHighlight.emissive.setHex(theme.highlight);
  }

  // 3D Board Geometry
  const boardGroup = new THREE.Group();
  scene.add(boardGroup);

  const frameMesh = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.35, 9.2), matFrame);
  frameMesh.position.y = -0.18;
  frameMesh.receiveShadow = true;
  boardGroup.add(frameMesh);

  const trimMesh = new THREE.Mesh(new THREE.BoxGeometry(8.22, 0.09, 8.22), matTrim);
  trimMesh.position.y = 0.01;
  trimMesh.receiveShadow = true;
  boardGroup.add(trimMesh);

  const tileGeo = new THREE.BoxGeometry(0.995, 0.08, 0.995);
  const tileMeshes = Array.from({ length: 8 }, () => Array(8).fill(null));
  for (let f = 0; f < 8; f++) {
    for (let r = 0; r < 8; r++) {
      const isLight = (f + r) % 2 === 1;
      const tile = new THREE.Mesh(tileGeo, isLight ? matLightTile : matDarkTile);
      const pos = sqToWorld(f, r);
      tile.position.set(pos.x, 0.04, pos.z);
      tile.receiveShadow = true;
      boardGroup.add(tile);
      tileMeshes[f][r] = tile;
    }
  }

  // Playback state
  let activeFilter = 'all';
  let activeOrder = 'shuffle';
  let deck = buildDeck(activeFilter, activeOrder);
  let deckIndex = 0;

  let boardState = null;
  let pieceMeshes = Array.from({ length: 8 }, () => Array(8).fill(null));
  let moveIndex = 0;
  let moveProgress = 1.0;
  let pauseTimer = 1.1;
  let isCheckmateHold = false;
  let checkmateElapsed = 0.0;
  let matedKingMesh = null;

  let currentMovingPiece = null;
  let currentCastlePiece = null;
  let lastMove = null;
  let movesPlayed = [];
  let orbitAngle = 0.0;

  function clearPieceMeshes() {
    for (let f = 0; f < 8; f++) {
      for (let r = 0; r < 8; r++) {
        if (pieceMeshes[f][r]) {
          scene.remove(pieceMeshes[f][r]);
          pieceMeshes[f][r] = null;
        }
      }
    }
    if (currentMovingPiece && currentMovingPiece.mesh) {
      scene.remove(currentMovingPiece.mesh);
    }
    if (currentCastlePiece && currentCastlePiece.mesh) {
      scene.remove(currentCastlePiece.mesh);
    }
  }

  function resetTileMaterials() {
    for (let f = 0; f < 8; f++) {
      for (let r = 0; r < 8; r++) {
        const isLight = (f + r) % 2 === 1;
        tileMeshes[f][r].material = isLight ? matLightTile : matDarkTile;
      }
    }
  }

  function highlightSquares(activeMate) {
    resetTileMaterials();
    if (lastMove) {
      const fromSq = parseSquare(lastMove.from);
      const toSq = parseSquare(lastMove.to);
      tileMeshes[fromSq.f][fromSq.r].material = matLastMove;
      tileMeshes[toSq.f][toSq.r].material = matLastMove;
    }
    if (currentMovingPiece) {
      tileMeshes[currentMovingPiece.to.f][currentMovingPiece.to.r].material = matHighlight;
    }
    if (isCheckmateHold && activeMate && activeMate.matedKing) {
      const kSq = parseSquare(activeMate.matedKing);
      tileMeshes[kSq.f][kSq.r].material = matCheckmate;
    }
  }

  function spawnBoardPieces() {
    clearPieceMeshes();
    for (let f = 0; f < 8; f++) {
      for (let r = 0; r < 8; r++) {
        const p = boardState[f][r];
        if (p) {
          const mat = p.color === 'w' ? matWhite : matBlack;
          const mesh = assemblePieceGroup(p.type, p.color, templates, mat);
          const pos = sqToWorld(f, r);
          mesh.position.set(pos.x, 0.08, pos.z);
          scene.add(mesh);
          pieceMeshes[f][r] = mesh;
        }
      }
    }
  }

  function loadMate(idx) {
    if (deck.length === 0) deck = buildDeck(activeFilter, activeOrder);
    deckIndex = ((idx % deck.length) + deck.length) % deck.length;
    const mate = deck[deckIndex];

    moveIndex = 0;
    moveProgress = 1.0;
    pauseTimer = 1.1;
    isCheckmateHold = false;
    checkmateElapsed = 0.0;
    matedKingMesh = null;
    currentMovingPiece = null;
    currentCastlePiece = null;
    lastMove = null;
    movesPlayed = [];

    // Orient starting camera toward the mating side (White from south, Black from north)
    orbitAngle = mate.winner === 'Black' ? Math.PI + 0.32 : 0.32;

    boardState = parseFENBoard(mate.fen);
    spawnBoardPieces();
    resetTileMaterials();
  }

  loadMate(0);

  return {
    resize(newW, newH) {
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
      clearPieceMeshes();
      renderer.dispose();
    },

    render(dt) {
      const p = getParams();
      const speed = Number(p.speed ?? 1.0);
      const moveDuration = Math.max(0.35, 1.15 / Math.max(0.25, speed));
      const themeName = p.theme || 'walnut';
      updateMaterials(themeName);

      const reqFilter = p.filter || 'all';
      const reqOrder = p.order || 'shuffle';
      if (reqFilter !== activeFilter || reqOrder !== activeOrder) {
        activeFilter = reqFilter;
        activeOrder = reqOrder;
        deck = buildDeck(activeFilter, activeOrder);
        loadMate(0);
      }

      const activeMate = deck[deckIndex] || CLASSIC_MATES[0];
      const perspective = p.perspective || '3d';
      const shouldRotate = perspective !== 'fixed' && perspective !== '2d' && p.rotate !== false;
      const showCoords = p.showCoordinates !== false;

      // Animate checkmate king topple & crimson pulse during hold
      if (isCheckmateHold) {
        checkmateElapsed += dt;
        matCheckmate.emissiveIntensity = 0.65 + Math.sin(checkmateElapsed * 6.5) * 0.35;
        if (matedKingMesh) {
          const tipT = Math.min(1.0, checkmateElapsed / 0.55);
          matedKingMesh.rotation.z = easeInOutCubic(tipT) * 1.18;
        }
      }

      if (pauseTimer > 0) {
        pauseTimer -= dt;
        if (pauseTimer <= 0 && isCheckmateHold) {
          loadMate(deckIndex + 1);
        }
      } else if (currentMovingPiece) {
        moveProgress += dt / moveDuration;
        if (moveProgress >= 1.0) {
          moveProgress = 1.0;
          const m = activeMate.moves[moveIndex];
          const toSq = parseSquare(m.to);
          const toPos = sqToWorld(toSq.f, toSq.r);

          // Remove captured piece if present
          if (pieceMeshes[toSq.f][toSq.r]) {
            scene.remove(pieceMeshes[toSq.f][toSq.r]);
          }

          // Handle promotion (e.g., g7g8n -> replace pawn mesh with knight!)
          let finalMesh = currentMovingPiece.mesh;
          let finalPiece = currentMovingPiece.piece;
          if (m.promo) {
            scene.remove(finalMesh);
            finalPiece = { color: currentMovingPiece.piece.color, type: m.promo.toUpperCase() };
            const mat = finalPiece.color === 'w' ? matWhite : matBlack;
            finalMesh = assemblePieceGroup(finalPiece.type, finalPiece.color, templates, mat);
            scene.add(finalMesh);
          }

          finalMesh.position.set(toPos.x, 0.08, toPos.z);
          finalMesh.rotation.x = 0;
          finalMesh.rotation.z = 0;

          pieceMeshes[toSq.f][toSq.r] = finalMesh;
          boardState[toSq.f][toSq.r] = finalPiece;

          if (m.castle && currentCastlePiece) {
            const cTo = parseSquare(m.castle.to);
            const cPos = sqToWorld(cTo.f, cTo.r);
            currentCastlePiece.mesh.position.set(cPos.x, 0.08, cPos.z);
            currentCastlePiece.mesh.rotation.x = 0;
            currentCastlePiece.mesh.rotation.z = 0;
            pieceMeshes[cTo.f][cTo.r] = currentCastlePiece.mesh;
            boardState[cTo.f][cTo.r] = currentCastlePiece.piece;
          }

          lastMove = m;
          movesPlayed.push(m.san);
          currentMovingPiece = null;
          currentCastlePiece = null;
          moveIndex++;

          if (moveIndex >= activeMate.moves.length) {
            isCheckmateHold = true;
            checkmateElapsed = 0.0;
            pauseTimer = Math.max(2.6, 4.6 / Math.max(0.4, speed));
            if (activeMate.matedKing) {
              const kSq = parseSquare(activeMate.matedKing);
              matedKingMesh = pieceMeshes[kSq.f][kSq.r];
            }
          } else {
            pauseTimer = 0.5 / Math.max(0.3, speed);
          }

          highlightSquares(activeMate);
        } else {
          const ease = easeInOutCubic(moveProgress);
          const startPos = sqToWorld(currentMovingPiece.from.f, currentMovingPiece.from.r);
          const targetPos = sqToWorld(currentMovingPiece.to.f, currentMovingPiece.to.r);
          const curX = startPos.x + (targetPos.x - startPos.x) * ease;
          const curZ = startPos.z + (targetPos.z - startPos.z) * ease;
          const lift = Math.sin(moveProgress * Math.PI) * 1.45;

          currentMovingPiece.mesh.position.set(curX, 0.08 + lift, curZ);
          const dx = targetPos.x - startPos.x;
          const dz = targetPos.z - startPos.z;
          currentMovingPiece.mesh.rotation.z = -Math.sin(moveProgress * Math.PI) * 0.14 * Math.sign(dx);
          currentMovingPiece.mesh.rotation.x = Math.sin(moveProgress * Math.PI) * 0.14 * Math.sign(dz);

          if (currentCastlePiece) {
            const cStart = sqToWorld(currentCastlePiece.from.f, currentCastlePiece.from.r);
            const cTarget = sqToWorld(currentCastlePiece.to.f, currentCastlePiece.to.r);
            const cX = cStart.x + (cTarget.x - cStart.x) * ease;
            const cZ = cStart.z + (cTarget.z - cStart.z) * ease;
            const cLift = Math.sin(moveProgress * Math.PI) * 0.85;
            currentCastlePiece.mesh.position.set(cX, 0.08 + cLift, cZ);
          }
        }
      } else if (moveIndex < activeMate.moves.length) {
        const m = activeMate.moves[moveIndex];
        const fromSq = parseSquare(m.from);
        const toSq = parseSquare(m.to);
        const piece = boardState[fromSq.f][fromSq.r];
        const mesh = pieceMeshes[fromSq.f][fromSq.r];

        if (piece && mesh) {
          boardState[fromSq.f][fromSq.r] = null;
          pieceMeshes[fromSq.f][fromSq.r] = null;
          currentMovingPiece = { piece, mesh, from: fromSq, to: toSq };
          moveProgress = 0.0;

          if (m.castle) {
            const cFrom = parseSquare(m.castle.from);
            const cTo = parseSquare(m.castle.to);
            const cPiece = boardState[cFrom.f][cFrom.r];
            const cMesh = pieceMeshes[cFrom.f][cFrom.r];
            if (cPiece && cMesh) {
              boardState[cFrom.f][cFrom.r] = null;
              pieceMeshes[cFrom.f][cFrom.r] = null;
              currentCastlePiece = { piece: cPiece, mesh: cMesh, from: cFrom, to: cTo };
            }
          }
          highlightSquares(activeMate);
        } else {
          // Safety skip if malformed
          moveIndex = activeMate.moves.length;
          isCheckmateHold = true;
          pauseTimer = 1.0;
        }
      }

      // Camera positioning
      if (perspective === '2d') {
        const zSign = activeMate.winner === 'Black' ? -0.001 : 0.001;
        camera.position.set(0, 13.0, zSign);
        camera.lookAt(0, 0, 0);
      } else if (shouldRotate) {
        orbitAngle += dt * 0.11 * speed;
        const camDist = 12.6;
        const camHeight = 8.9 + Math.sin(orbitAngle * 0.4) * 1.1;
        camera.position.set(Math.sin(orbitAngle) * camDist, camHeight, Math.cos(orbitAngle) * camDist);
        camera.lookAt(0, 0.4, 0);
      } else {
        const sideSign = activeMate.winner === 'Black' ? -1 : 1;
        camera.position.set(3.8 * sideSign, 8.8, 11.4 * sideSign);
        camera.lookAt(0, 0.4, 0);
      }

      renderer.render(scene, camera);

      // 2D HUD Overlay
      if (hudCtx) {
        const curW = hudCanvas.width;
        const curH = hudCanvas.height;
        hudCtx.clearRect(0, 0, curW, curH);

        if (showCoords) {
          hudCtx.save();
          hudCtx.font = '700 13px "JetBrains Mono", monospace';
          hudCtx.textAlign = 'center';
          hudCtx.textBaseline = 'middle';
          hudCtx.fillStyle = theme.coordColor;
          const projV = new THREE.Vector3();

          for (let f = 0; f < 8; f++) {
            const letter = String.fromCharCode(97 + f);
            const wp = sqToWorld(f, 0);
            for (const rimZ of [4.45, -4.45]) {
              projV.set(wp.x, 0.14, rimZ).project(camera);
              if (projV.z < 1) {
                hudCtx.fillText(letter, (projV.x * 0.5 + 0.5) * curW, (-projV.y * 0.5 + 0.5) * curH);
              }
            }
          }
          for (let r = 0; r < 8; r++) {
            const num = String(r + 1);
            const wp = sqToWorld(0, r);
            for (const rimX of [-4.45, 4.45]) {
              projV.set(rimX, 0.14, wp.z).project(camera);
              if (projV.z < 1) {
                hudCtx.fillText(num, (projV.x * 0.5 + 0.5) * curW, (-projV.y * 0.5 + 0.5) * curH);
              }
            }
          }
          hudCtx.restore();
        }

        // Top-Left Motif & Variant Header
        hudCtx.save();
        const padX = 36;
        const topY = 36;
        hudCtx.textAlign = 'left';

        // Motif Pill
        const motifTag = activeMate.motif.toUpperCase();
        hudCtx.font = '800 13px "JetBrains Mono", monospace';
        const motifW = hudCtx.measureText(motifTag).width + 18;
        hudCtx.fillStyle = 'rgba(15, 23, 42, 0.88)';
        hudCtx.strokeStyle = isCheckmateHold ? '#ef4444' : theme.accent;
        hudCtx.lineWidth = 1.6;
        roundRect(hudCtx, padX, topY - 15, motifW, 27, 6);
        hudCtx.fill();
        hudCtx.stroke();
        hudCtx.fillStyle = isCheckmateHold ? '#fca5a5' : theme.accent;
        hudCtx.fillText(motifTag, padX + 9, topY + 3);

        // Form Pill (Simplest Form vs In-Situ)
        const formTag = activeMate.form.toUpperCase();
        hudCtx.font = '700 11px "JetBrains Mono", monospace';
        const formW = hudCtx.measureText(formTag).width + 14;
        const formX = padX + motifW + 10;
        hudCtx.fillStyle = activeMate.form === 'In-Situ' ? 'rgba(6, 78, 59, 0.85)' : 'rgba(30, 41, 59, 0.88)';
        hudCtx.strokeStyle = activeMate.form === 'In-Situ' ? '#10b981' : '#64748b';
        hudCtx.lineWidth = 1.2;
        roundRect(hudCtx, formX, topY - 13, formW, 23, 5);
        hudCtx.fill();
        hudCtx.stroke();
        hudCtx.fillStyle = activeMate.form === 'In-Situ' ? '#6ee7b7' : '#cbd5e1';
        hudCtx.fillText(formTag, formX + 7, topY + 2);

        // Variant Title
        hudCtx.fillStyle = '#f8fafc';
        hudCtx.font = '800 21px system-ui, -apple-system, sans-serif';
        hudCtx.fillText(activeMate.variant, formX + formW + 14, topY + 4);

        // Commentary Note
        hudCtx.fillStyle = '#94a3b8';
        hudCtx.font = '500 13px system-ui, -apple-system, sans-serif';
        hudCtx.fillText(activeMate.note, padX, topY + 30);

        // Top-Right Side & Study Counter + Checkmate Banner
        hudCtx.textAlign = 'right';
        const sideLabel = activeMate.winner === 'White' ? '♔ White to Mate' : '♚ Black to Mate';
        const counterLabel = `#${deckIndex + 1} / ${deck.length}`;
        hudCtx.font = '700 13px "JetBrains Mono", monospace';
        hudCtx.fillStyle = activeMate.winner === 'White' ? '#f8fafc' : '#cbd5e1';
        hudCtx.fillText(`${sideLabel}  ·  ${counterLabel}`, curW - padX, topY + 3);

        if (isCheckmateHold) {
          const cmText = `CHECKMATE · ${activeMate.winner.toUpperCase()} WINS`;
          hudCtx.font = '800 15px "JetBrains Mono", monospace';
          const cmW = hudCtx.measureText(cmText).width + 24;
          hudCtx.fillStyle = 'rgba(153, 27, 27, 0.92)';
          hudCtx.strokeStyle = '#f87171';
          hudCtx.lineWidth = 1.8;
          roundRect(hudCtx, curW - padX - cmW, topY + 14, cmW, 28, 6);
          hudCtx.fill();
          hudCtx.stroke();
          hudCtx.fillStyle = '#ffffff';
          hudCtx.fillText(cmText, curW - padX - 12, topY + 33);
        }

        // Bottom Move Sequence Ribbon
        const bottomY = curH - 34;
        hudCtx.textAlign = 'left';
        hudCtx.font = '600 13px "JetBrains Mono", monospace';
        const seqStr = movesPlayed.join('   ');
        if (seqStr) {
          hudCtx.fillStyle = isCheckmateHold ? '#f87171' : theme.accent;
          hudCtx.fillText('LINE: ', padX, bottomY);
          const prefixW = hudCtx.measureText('LINE: ').width;
          hudCtx.fillStyle = '#e2e8f0';
          hudCtx.fillText(seqStr, padX + prefixW, bottomY);
        }

        hudCtx.restore();
      }
    }
  };
}
