const BOARD_SIZE = 8;
const BOARD_LEVELS = 5;
const MIN_COORD = 0;
const MAX_COORD = 7;
const MIN_LEVEL = 0;
const MAX_LEVEL = 4;
const LEVEL_A = 0;
const LEVEL_B = 1;
const LEVEL_C = 2;
const LEVEL_D = 3;
const LEVEL_E = 4;
const GATE_RANK_MIN = 2;
const GATE_RANK_MAX = 5;
const RED_WALL_WHITE_MAX = 1;
const RED_WALL_BLACK_MIN = 6;
const POINTS_WIN = 2;
const POINTS_DRAW = 1;
const POINTS_LOSS = 0;
function posToString(p) {
  const levelChar = String.fromCharCode("A".charCodeAt(0) + p.z);
  const fileChar = String.fromCharCode("a".charCodeAt(0) + p.x);
  const rankChar = String.fromCharCode("1".charCodeAt(0) + p.y);
  return `${levelChar}${fileChar}${rankChar}`;
}
function pieceNotationSymbol(piece) {
  const upper = piece.toUpperCase();
  if (upper === "G") return "Pr";
  if (upper === "C") return "Ps";
  return upper;
}
function parsePos(s) {
  if (!s || s.length !== 3) return null;
  const z = s.toUpperCase().charCodeAt(0) - "A".charCodeAt(0);
  const x = s.toLowerCase().charCodeAt(1) - "a".charCodeAt(0);
  const y = s.charCodeAt(2) - "1".charCodeAt(0);
  if (x < MIN_COORD || x > MAX_COORD || y < MIN_COORD || y > MAX_COORD || z < MIN_LEVEL || z > MAX_LEVEL) return null;
  return { x, y, z };
}
function isValidPos(p) {
  return p.x >= MIN_COORD && p.x <= MAX_COORD && p.y >= MIN_COORD && p.y <= MAX_COORD && p.z >= MIN_LEVEL && p.z <= MAX_LEVEL;
}
function isDimensionalGateRank(y) {
  return y >= GATE_RANK_MIN && y <= GATE_RANK_MAX;
}
function isRedWallRank(y) {
  return y <= RED_WALL_WHITE_MAX || y >= RED_WALL_BLACK_MIN;
}
function getSkillConfig(level) {
  const lvl = Math.max(1, Math.min(10, Math.round(level)));
  switch (lvl) {
    case 1:
      return { depth: 1, maxCandidates: 4, randomness: 0.75 };
    case 2:
      return { depth: 1, maxCandidates: 6, randomness: 0.5 };
    case 3:
      return { depth: 1, maxCandidates: 8, randomness: 0.35 };
    case 4:
      return { depth: 1, maxCandidates: 12, randomness: 0.2 };
    case 5:
      return { depth: 1, maxCandidates: 18, randomness: 0 };
    case 6:
      return { depth: 2, maxCandidates: 8, randomness: 0.15 };
    case 7:
      return { depth: 2, maxCandidates: 12, randomness: 0.08 };
    case 8:
      return { depth: 2, maxCandidates: 16, randomness: 0 };
    case 9:
      return { depth: 2, maxCandidates: 28, randomness: 0 };
    case 10:
      return { depth: 3, maxCandidates: 36, randomness: 0 };
    default:
      return { depth: 2, maxCandidates: 12, randomness: 0 };
  }
}
class ThreeDGame {
  loadFEN3D(fen) {
    const parts = fen.split(" ");
    if (parts.length < 2) return;
    const boardStr = parts[0];
    this.turn = parts[1];
    const levels = boardStr.split(":");
    for (let z = 0; z < BOARD_LEVELS; z++) {
      if (!levels[z]) continue;
      const ranks = levels[z].split("/");
      for (let r = 0; r < BOARD_SIZE; r++) {
        if (!ranks[r]) continue;
        const y = MAX_COORD - r;
        let x = 0;
        for (let i = 0; i < ranks[r].length; i++) {
          const char = ranks[r][i];
          if (char >= "1" && char <= "8") {
            const emptyCount = parseInt(char, 10);
            for (let e = 0; e < emptyCount; e++) {
              this.setPiece({ x, y, z }, null);
              x++;
            }
          } else {
            this.setPiece({ x, y, z }, char);
            x++;
          }
        }
      }
    }
  }
  generateFEN3D() {
    const levels = [];
    for (let z = 0; z < BOARD_LEVELS; z++) {
      const ranks = [];
      for (let r = 0; r < BOARD_SIZE; r++) {
        const y = MAX_COORD - r;
        let rankStr = "";
        let emptyCount = 0;
        for (let x = 0; x < BOARD_SIZE; x++) {
          const piece = this.getPiece({ x, y, z });
          if (piece) {
            if (emptyCount > 0) {
              rankStr += emptyCount.toString();
              emptyCount = 0;
            }
            rankStr += piece;
          } else {
            emptyCount++;
          }
        }
        if (emptyCount > 0) rankStr += emptyCount.toString();
        ranks.push(rankStr);
      }
      levels.push(ranks.join("/"));
    }
    return `${levels.join(":")} ${this.turn}`;
  }
  // board[z][y][x]: 5 levels, 8 ranks, 8 files
  board;
  turn = "w";
  moveHistory = [];
  positionCounts = /* @__PURE__ */ new Map();
  halfmoveClock = 0;
  capturedWhite = [];
  capturedBlack = [];
  isCheck = false;
  isCheckmate = false;
  result = {
    isOver: false,
    reason: "active",
    whitePoints: 0,
    blackPoints: 0
  };
  constructor(skipSetup = false) {
    this.board = Array.from(
      { length: BOARD_LEVELS },
      () => Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null))
    );
    if (!skipSetup) {
      this.setupBoards();
      const initialKey = this.getPositionKey();
      this.positionCounts.set(initialKey, 1);
    }
  }
  getPositionKey() {
    let s = this.turn + ":";
    for (let z = 0; z < BOARD_LEVELS; z++) {
      for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
          s += this.board[z][y][x] || ".";
        }
      }
    }
    return s;
  }
  setupBoards() {
    const wBack = ["R", "N", "B", "Q", "K", "B", "N", "R"];
    for (let x = 0; x < BOARD_SIZE; x++) {
      this.setPiece({ x, y: 0, z: LEVEL_A }, wBack[x] ?? null);
      this.setPiece({ x, y: 1, z: LEVEL_A }, "P");
    }
    for (let x = 0; x < BOARD_SIZE; x++) {
      this.setPiece({ x, y: 1, z: LEVEL_B }, "P");
    }
    const wBoard2Back = ["R", "N", "B", "C", "G", "B", "N", "R"];
    for (let x = 0; x < BOARD_SIZE; x++) {
      this.setPiece({ x, y: 0, z: LEVEL_B }, wBoard2Back[x] ?? null);
    }
    const bBack = ["r", "n", "b", "q", "k", "b", "n", "r"];
    for (let x = 0; x < BOARD_SIZE; x++) {
      this.setPiece({ x, y: MAX_COORD, z: LEVEL_E }, bBack[x] ?? null);
      this.setPiece({ x, y: MAX_COORD - 1, z: LEVEL_E }, "p");
    }
    for (let x = 0; x < BOARD_SIZE; x++) {
      this.setPiece({ x, y: MAX_COORD - 1, z: LEVEL_D }, "p");
    }
    const bBoard2Back = ["r", "n", "b", "c", "g", "b", "n", "r"];
    for (let x = 0; x < BOARD_SIZE; x++) {
      this.setPiece({ x, y: MAX_COORD, z: LEVEL_D }, bBoard2Back[x] ?? null);
    }
  }
  getPiece(p) {
    if (!isValidPos(p)) return null;
    const level = this.board[p.z];
    if (!level) return null;
    const rank = level[p.y];
    if (!rank) return null;
    return rank[p.x] ?? null;
  }
  setPiece(p, piece) {
    if (isValidPos(p)) {
      const level = this.board[p.z];
      if (level) {
        const rank = level[p.y];
        if (rank) {
          rank[p.x] = piece;
        }
      }
    }
  }
  isPieceWhite(p) {
    return p === p.toUpperCase();
  }
  hasPawnForceField(target, exceptPos) {
    if (!isValidPos(target)) return false;
    if (target.z > MIN_LEVEL) {
      if (!exceptPos || !(exceptPos.x === target.x && exceptPos.y === target.y && exceptPos.z === target.z - 1)) {
        const pBelow = this.getPiece({ x: target.x, y: target.y, z: target.z - 1 });
        if (pBelow && pBelow.toUpperCase() === "P") return true;
      }
    }
    if (target.z < MAX_LEVEL) {
      if (!exceptPos || !(exceptPos.x === target.x && exceptPos.y === target.y && exceptPos.z === target.z + 1)) {
        const pAbove = this.getPiece({ x: target.x, y: target.y, z: target.z + 1 });
        if (pAbove && pAbove.toUpperCase() === "P") return true;
      }
    }
    return false;
  }
  getLegalMovesAt(pos) {
    const piece = this.getPiece(pos);
    if (!piece) return [];
    const isWhite = this.isPieceWhite(piece);
    if (isWhite && this.turn !== "w" || !isWhite && this.turn !== "b") {
      return [];
    }
    const pseudoMoves = this.generatePieceMoves(pos, piece);
    return pseudoMoves.filter((to) => !this.leavesKingInCheck(pos, to, this.turn));
  }
  getAllLegalMoves() {
    const allMoves = [];
    for (let z = 0; z < BOARD_LEVELS; z++) {
      for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
          const from = { x, y, z };
          const piece = this.getPiece(from);
          if (piece && (this.isPieceWhite(piece) ? "w" : "b") === this.turn) {
            const targets = this.getLegalMovesAt(from);
            for (const to of targets) {
              allMoves.push({ from, to });
            }
          }
        }
      }
    }
    return allMoves;
  }
  makeMove(from, to) {
    const validTargets = this.getLegalMovesAt(from);
    const isValid = validTargets.some((p) => p.x === to.x && p.y === to.y && p.z === to.z);
    if (!isValid) return null;
    const piece = this.getPiece(from);
    const captured = this.getPiece(to) || void 0;
    if (captured) {
      if (this.isPieceWhite(captured)) {
        this.capturedWhite.push(captured);
      } else {
        this.capturedBlack.push(captured);
      }
    }
    let finalPiece = piece;
    let promotion = void 0;
    if (piece.toUpperCase() === "P") {
      const reachedOpponentHome = this.isPieceWhite(piece) && to.y === MAX_COORD || !this.isPieceWhite(piece) && to.y === MIN_COORD;
      if (reachedOpponentHome) {
        promotion = this.isPieceWhite(piece) ? "Q" : "q";
        finalPiece = promotion;
      }
    }
    this.setPiece(to, finalPiece);
    this.setPiece(from, null);
    const move = { from, to, piece, captured, promotion };
    this.moveHistory.push(move);
    if (captured || piece.toUpperCase() === "P") {
      this.halfmoveClock = 0;
    } else {
      this.halfmoveClock++;
    }
    this.turn = this.turn === "w" ? "b" : "w";
    const positionKey = this.getPositionKey();
    const count = (this.positionCounts.get(positionKey) || 0) + 1;
    this.positionCounts.set(positionKey, count);
    if (count >= 3) {
      this.result = {
        isOver: true,
        reason: "draw",
        drawDetail: "repetition",
        whitePoints: POINTS_DRAW,
        blackPoints: POINTS_DRAW
      };
      return move;
    }
    if (this.halfmoveClock >= 150) {
      this.result = {
        isOver: true,
        reason: "draw",
        drawDetail: "no_capture",
        whitePoints: POINTS_DRAW,
        blackPoints: POINTS_DRAW
      };
      return move;
    }
    if (this.moveHistory.length >= 400) {
      this.result = {
        isOver: true,
        reason: "draw",
        drawDetail: "move_limit",
        whitePoints: POINTS_DRAW,
        blackPoints: POINTS_DRAW
      };
      return move;
    }
    this.isCheck = this.isKingInCheck(this.turn);
    const remainingMoves = this.getAllLegalMoves();
    if (remainingMoves.length === 0) {
      if (this.isCheck) {
        this.isCheckmate = true;
        const winner = this.turn === "w" ? "b" : "w";
        this.result = {
          isOver: true,
          winner,
          reason: "checkmate",
          whitePoints: winner === "w" ? POINTS_WIN : POINTS_LOSS,
          blackPoints: winner === "b" ? POINTS_WIN : POINTS_LOSS
        };
      } else {
        this.result = {
          isOver: true,
          reason: "draw",
          drawDetail: "stalemate",
          whitePoints: POINTS_DRAW,
          blackPoints: POINTS_DRAW
        };
      }
    }
    return move;
  }
  generatePieceMoves(from, piece) {
    const isWhite = this.isPieceWhite(piece);
    const type = piece.toUpperCase();
    const results = [];
    const isRoyal = type === "K" || type === "G" || type === "C";
    const canMoveVertically = isDimensionalGateRank(from.y) || isRoyal;
    const addIfValid = (target, captureAllowed = true) => {
      if (!isValidPos(target)) return false;
      if (target.z !== from.z) {
        if (!isRoyal) {
          if (!isDimensionalGateRank(from.y) || !isDimensionalGateRank(target.y)) {
            return false;
          }
        }
      }
      if (target.z !== from.z && this.hasPawnForceField(target)) {
        return false;
      }
      const targetPiece = this.getPiece(target);
      if (!targetPiece) {
        results.push(target);
        return true;
      }
      if (captureAllowed && this.isPieceWhite(targetPiece) !== isWhite) {
        if (targetPiece.toUpperCase() === "P" && target.z !== from.z) {
          return false;
        }
        results.push(target);
      }
      return false;
    };
    const addRayMoves = (directions, maxSteps = 7, captureAllowed = true) => {
      for (const [dx, dy, dz] of directions) {
        if (dz !== 0 && !canMoveVertically) continue;
        let step = 1;
        while (step <= maxSteps) {
          const target = { x: from.x + dx * step, y: from.y + dy * step, z: from.z + dz * step };
          if (dz !== 0 && this.hasPawnForceField(target)) break;
          if (!addIfValid(target, captureAllowed)) break;
          step++;
        }
      }
    };
    switch (type) {
      case "R": {
        const horizontalDirs = [
          [1, 0, 0],
          [-1, 0, 0],
          [0, 1, 0],
          [0, -1, 0]
        ];
        addRayMoves(horizontalDirs, 7, true);
        if (canMoveVertically) {
          addRayMoves([[0, 0, 1], [0, 0, -1]], 1, false);
        }
        break;
      }
      case "B": {
        const horizontalDiagonals = [
          [1, 1, 0],
          [1, -1, 0],
          [-1, 1, 0],
          [-1, -1, 0]
        ];
        addRayMoves(horizontalDiagonals, 7, true);
        if (canMoveVertically) {
          const vertDiagonals = [
            [1, 0, 1],
            [1, 0, -1],
            [-1, 0, 1],
            [-1, 0, -1],
            [0, 1, 1],
            [0, 1, -1],
            [0, -1, 1],
            [0, -1, -1],
            [1, 1, 1],
            [1, 1, -1],
            [1, -1, 1],
            [1, -1, -1],
            [-1, 1, 1],
            [-1, 1, -1],
            [-1, -1, 1],
            [-1, -1, -1]
          ];
          addRayMoves(vertDiagonals, 1, false);
        }
        break;
      }
      case "Q": {
        const planarDirs = [
          [1, 0, 0],
          [-1, 0, 0],
          [0, 1, 0],
          [0, -1, 0],
          [1, 1, 0],
          [1, -1, 0],
          [-1, 1, 0],
          [-1, -1, 0]
        ];
        addRayMoves(planarDirs, 7, true);
        if (canMoveVertically) {
          addRayMoves([[0, 0, 1], [0, 0, -1]], 1, false);
        }
        break;
      }
      case "K": {
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            addIfValid({ x: from.x + dx, y: from.y + dy, z: from.z }, true);
          }
        }
        if (canMoveVertically) {
          for (const dz of [-1, 1]) {
            addIfValid({ x: from.x, y: from.y, z: from.z + dz }, false);
          }
        }
        break;
      }
      case "G": {
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            for (let dz = -1; dz <= 1; dz++) {
              if (dx === 0 && dy === 0 && dz === 0) continue;
              addIfValid({ x: from.x + dx, y: from.y + dy, z: from.z + dz }, true);
            }
          }
        }
        break;
      }
      case "N": {
        const knight2D = [
          [2, 1],
          [2, -1],
          [-2, 1],
          [-2, -1],
          [1, 2],
          [1, -2],
          [-1, 2],
          [-1, -2]
        ];
        for (const [dx, dy] of knight2D) {
          addIfValid({ x: from.x + dx, y: from.y + dy, z: from.z }, true);
        }
        if (canMoveVertically) {
          const knight3D = [
            [2, 0, 1],
            [2, 0, -1],
            [-2, 0, 1],
            [-2, 0, -1],
            [0, 2, 1],
            [0, 2, -1],
            [0, -2, 1],
            [0, -2, -1]
          ];
          for (const [dx, dy, dz] of knight3D) {
            addIfValid({ x: from.x + dx, y: from.y + dy, z: from.z + dz }, false);
          }
        }
        break;
      }
      case "C": {
        const princessStartRank = isWhite ? 0 : 7;
        const princessStartLevel = isWhite ? 1 : 3;
        if (from.y === princessStartRank && from.z === princessStartLevel) {
          const fwdStepY = isWhite ? 2 : -2;
          const vertStepZ = isWhite ? 1 : -1;
          const specialTarget = {
            x: from.x,
            y: from.y + fwdStepY,
            z: from.z + vertStepZ
          };
          if (isValidPos(specialTarget) && !this.getPiece(specialTarget) && !this.hasPawnForceField(specialTarget)) {
            results.push(specialTarget);
          }
        }
        const princessOrthogonalDirs = [
          [1, 0, 0],
          [-1, 0, 0],
          [0, 1, 0],
          [0, -1, 0]
        ];
        const princessDiagonalDirs = [
          [1, 1, 0],
          [1, -1, 0],
          [-1, 1, 0],
          [-1, -1, 0]
        ];
        for (const [dx, dy, dz] of princessOrthogonalDirs) {
          for (let step = 1; step <= 2; step++) {
            const target = { x: from.x + dx * step, y: from.y + dy * step, z: from.z + dz * step };
            if (!addIfValid(target, false)) break;
          }
        }
        for (const [dx, dy, dz] of princessDiagonalDirs) {
          for (let step = 1; step <= 2; step++) {
            const target = { x: from.x + dx * step, y: from.y + dy * step, z: from.z + dz * step };
            if (!addIfValid(target, true)) break;
          }
        }
        for (const dz of [1, -1]) {
          const target = { x: from.x, y: from.y, z: from.z + dz };
          if (!this.hasPawnForceField(target)) {
            addIfValid(target, false);
          }
        }
        const vertDiagonalDirs = [
          [1, 0, 1],
          [1, 0, -1],
          [-1, 0, 1],
          [-1, 0, -1],
          [0, 1, 1],
          [0, 1, -1],
          [0, -1, 1],
          [0, -1, -1],
          [1, 1, 1],
          [1, 1, -1],
          [1, -1, 1],
          [1, -1, -1],
          [-1, 1, 1],
          [-1, 1, -1],
          [-1, -1, 1],
          [-1, -1, -1]
        ];
        for (const [dx, dy, dz] of vertDiagonalDirs) {
          const target = { x: from.x + dx, y: from.y + dy, z: from.z + dz };
          if (!this.hasPawnForceField(target)) {
            addIfValid(target, false);
          }
        }
        const knight3D = [
          [2, 0, 1],
          [2, 0, -1],
          [-2, 0, 1],
          [-2, 0, -1],
          [0, 2, 1],
          [0, 2, -1],
          [0, -2, 1],
          [0, -2, -1]
        ];
        for (const [dx, dy, dz] of knight3D) {
          const target = { x: from.x + dx, y: from.y + dy, z: from.z + dz };
          if (!this.hasPawnForceField(target)) {
            addIfValid(target, false);
          }
        }
        break;
      }
      case "P": {
        const stepY = isWhite ? 1 : -1;
        const stepZ = isWhite ? 1 : -1;
        const enemyBaseZ = isWhite ? 4 : 0;
        const canPawnEnter = (target) => {
          if (!isValidPos(target)) return false;
          if (this.hasPawnForceField(target, from)) return false;
          if (isRedWallRank(target.y) && target.z !== enemyBaseZ) {
            return false;
          }
          return true;
        };
        const isSecondLevelStartPawn = isWhite && from.z === 1 && from.y === 1 || !isWhite && from.z === 3 && from.y === 6;
        if (isSecondLevelStartPawn) {
          const fwdHome = { x: from.x, y: from.y + stepY, z: from.z };
          if (canPawnEnter(fwdHome) && !this.getPiece(fwdHome)) {
            results.push(fwdHome);
          }
          const leapTarget = {
            x: from.x,
            y: from.y + 2 * stepY,
            z: from.z + stepZ
          };
          if (canPawnEnter(leapTarget) && !this.getPiece(leapTarget)) {
            results.push(leapTarget);
          }
        } else {
          const isFirstLevelStartPawn = isWhite && from.z === 0 && from.y === 1 || !isWhite && from.z === 4 && from.y === 6;
          const isCorridorBlocked = (targetY, targetZ) => {
            const inFrontSameLevel = { x: from.x, y: targetY, z: from.z };
            const inFrontTargetLevel = { x: from.x, y: from.y, z: targetZ };
            const pieceInFront = this.getPiece(inFrontSameLevel);
            const pieceAboveBelow = this.getPiece(inFrontTargetLevel);
            const isOpposingPawn = (p) => p && p.toUpperCase() === "P" && this.isPieceWhite(p) !== isWhite;
            return isOpposingPawn(pieceInFront) || isOpposingPawn(pieceAboveBelow);
          };
          const target1 = {
            x: from.x,
            y: from.y + stepY,
            z: from.z + stepZ
          };
          if (canPawnEnter(target1) && !this.getPiece(target1) && !isCorridorBlocked(target1.y, target1.z)) {
            results.push(target1);
          }
          if (isFirstLevelStartPawn) {
            const intermediateFlat = { x: from.x, y: from.y + stepY, z: from.z };
            const target2 = { x: from.x, y: from.y + 2 * stepY, z: from.z };
            if (canPawnEnter(target2) && !this.getPiece(intermediateFlat) && !this.getPiece(target2)) {
              results.push(target2);
            }
          }
          if (from.z === enemyBaseZ || !isFirstLevelStartPawn && !isSecondLevelStartPawn) {
            const fwdFlat = { x: from.x, y: from.y + stepY, z: from.z };
            if (canPawnEnter(fwdFlat) && !this.getPiece(fwdFlat)) {
              results.push(fwdFlat);
            }
          }
        }
        if (from.z !== enemyBaseZ) {
          const upTarget = { x: from.x, y: from.y, z: from.z + stepZ };
          if (canPawnEnter(upTarget) && !this.getPiece(upTarget)) {
            results.push(upTarget);
          }
        }
        const diagonalVectors = [
          [1, stepY, 0],
          [-1, stepY, 0],
          [0, stepY, stepZ],
          [1, stepY, stepZ],
          [-1, stepY, stepZ]
        ];
        for (const [dx, dy, dz] of diagonalVectors) {
          const capTarget = {
            x: from.x + dx,
            y: from.y + dy,
            z: from.z + dz
          };
          if (canPawnEnter(capTarget)) {
            const dest = this.getPiece(capTarget);
            if (dest && this.isPieceWhite(dest) !== isWhite) {
              results.push(capTarget);
            }
          }
        }
        break;
      }
    }
    return results;
  }
  leavesKingInCheck(from, to, color) {
    const origFrom = this.getPiece(from);
    const origTo = this.getPiece(to);
    this.setPiece(from, null);
    this.setPiece(to, origFrom);
    const inCheck = this.isKingInCheck(color);
    this.setPiece(from, origFrom);
    this.setPiece(to, origTo);
    return inCheck;
  }
  isKingInCheck(color) {
    const targetKing = color === "w" ? "K" : "k";
    let kingPos = null;
    for (let z = 0; z < 5; z++) {
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
          if (this.getPiece({ x, y, z }) === targetKing) {
            kingPos = { x, y, z };
            break;
          }
        }
        if (kingPos) break;
      }
      if (kingPos) break;
    }
    if (!kingPos) return false;
    const oppColor = color === "w" ? "b" : "w";
    for (let z = 0; z < 5; z++) {
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
          const p = this.getPiece({ x, y, z });
          if (p && (this.isPieceWhite(p) ? "w" : "b") === oppColor) {
            const moves = this.generatePieceMoves({ x, y, z }, p);
            if (moves.some((m) => m.x === kingPos.x && m.y === kingPos.y && m.z === kingPos.z)) {
              return true;
            }
          }
        }
      }
    }
    return false;
  }
  evaluate() {
    if (this.result.isOver) {
      if (this.result.winner === "w") return 1e6;
      if (this.result.winner === "b") return -1e6;
      return 0;
    }
    const values = {
      P: 100,
      p: -100,
      N: 320,
      n: -320,
      B: 330,
      b: -330,
      G: 380,
      g: -380,
      R: 500,
      r: -500,
      C: 500,
      c: -500,
      Q: 900,
      q: -900,
      K: 1e5,
      k: -1e5
    };
    let score = 0;
    let totalMaterial = 0;
    let whiteKingPos = { x: 4, y: 0, z: 0 };
    let blackKingPos = { x: 4, y: 7, z: 4 };
    for (let z = 0; z < 5; z++) {
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
          const piece = this.getPiece({ x, y, z });
          if (!piece) continue;
          if (piece === "K") whiteKingPos = { x, y, z };
          if (piece === "k") blackKingPos = { x, y, z };
          if (piece.toUpperCase() !== "K") totalMaterial += Math.abs(values[piece] || 0);
        }
      }
    }
    const isEndgame = totalMaterial < 3e3;
    for (let z = 0; z < 5; z++) {
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
          const piece = this.getPiece({ x, y, z });
          if (!piece) continue;
          const isWhite = this.isPieceWhite(piece);
          const type = piece.toUpperCase();
          score += values[piece] || 0;
          if (z === 2 && y >= 2 && y <= 5 && x >= 2 && x <= 5) {
            score += isWhite ? 30 : -30;
          }
          const rankAdvancement = isWhite ? y : 7 - y;
          if (type === "P") {
            const pawnBonus = rankAdvancement * 6;
            const zClimbBonus = (isWhite ? z : 4 - z) * 8;
            score += isWhite ? pawnBonus + zClimbBonus : -(pawnBonus + zClimbBonus);
          } else if (type === "N" || type === "B" || type === "C" || type === "G") {
            const centerDist = Math.abs(3.5 - x);
            const devBonus = rankAdvancement * 3 + (3.5 - centerDist) * 3;
            const levelBonus = (isWhite ? z : 4 - z) * 4;
            score += isWhite ? devBonus + levelBonus : -(devBonus + levelBonus);
          } else if (type === "R" || type === "Q") {
            const majorBonus = rankAdvancement * 2;
            score += isWhite ? majorBonus : -majorBonus;
          }
          if (isEndgame) {
            const targetKing = isWhite ? blackKingPos : whiteKingPos;
            const distToEnemyKing = Math.abs(targetKing.x - x) + Math.abs(targetKing.y - y) + Math.abs(targetKing.z - z);
            const proximityBonus = (18 - distToEnemyKing) * 5;
            score += isWhite ? proximityBonus : -proximityBonus;
          }
        }
      }
    }
    return score;
  }
  clone() {
    const copy = new ThreeDGame(true);
    copy.turn = this.turn;
    copy.isCheck = this.isCheck;
    copy.isCheckmate = this.isCheckmate;
    copy.result = { ...this.result };
    copy.capturedWhite = [...this.capturedWhite];
    copy.capturedBlack = [...this.capturedBlack];
    copy.moveHistory = [...this.moveHistory];
    copy.positionCounts = new Map(this.positionCounts);
    for (let z = 0; z < 5; z++) {
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
          copy.board[z][y][x] = this.board[z][y][x] ?? null;
        }
      }
    }
    return copy;
  }
  findBestMoveLevel(level) {
    const config = getSkillConfig(level);
    return this.findBestMove(config.depth, config.maxCandidates, config.randomness);
  }
  findBestMove(depth = 2, maxCandidates, randomness = 0) {
    const legalMoves = this.getAllLegalMoves();
    if (legalMoves.length === 0) return null;
    const isMaximizing = this.turn === "w";
    let bestScore = isMaximizing ? -Infinity : Infinity;
    const candidates = [];
    const historyLen = this.moveHistory.length;
    const myLastMove = historyLen >= 2 ? this.moveHistory[historyLen - 2] : null;
    const myTwoMovesAgo = historyLen >= 4 ? this.moveHistory[historyLen - 4] : null;
    legalMoves.sort((a, b) => {
      const pieceA = this.getPiece(a.to);
      const pieceB = this.getPiece(b.to);
      const capA = pieceA ? 100 : 0;
      const capB = pieceB ? 100 : 0;
      const dyA = isMaximizing ? a.to.y - a.from.y : a.from.y - a.to.y;
      const dyB = isMaximizing ? b.to.y - b.from.y : b.from.y - b.to.y;
      return capB + dyB * 2 - (capA + dyA * 2);
    });
    const movesToEvaluate = maxCandidates && maxCandidates > 0 && legalMoves.length > maxCandidates ? legalMoves.slice(0, maxCandidates) : legalMoves;
    for (const m of movesToEvaluate) {
      const sim = this.clone();
      const executed = sim.makeMove(m.from, m.to);
      let score = sim.alphaBeta(depth - 1, -Infinity, Infinity, !isMaximizing);
      if (myLastMove && !executed?.captured) {
        const isReversal = m.from.x === myLastMove.to.x && m.from.y === myLastMove.to.y && m.from.z === myLastMove.to.z && m.to.x === myLastMove.from.x && m.to.y === myLastMove.from.y && m.to.z === myLastMove.from.z;
        if (isReversal) {
          score += isMaximizing ? -80 : 80;
        }
      }
      if (myTwoMovesAgo && !executed?.captured) {
        const isSameMove = m.from.x === myTwoMovesAgo.from.x && m.from.y === myTwoMovesAgo.from.y && m.from.z === myTwoMovesAgo.from.z && m.to.x === myTwoMovesAgo.to.x && m.to.y === myTwoMovesAgo.to.y && m.to.z === myTwoMovesAgo.to.z;
        if (isSameMove) {
          score += isMaximizing ? -50 : 50;
        }
      }
      if (executed?.captured) {
        score += isMaximizing ? 20 : -20;
      }
      const dy = isMaximizing ? m.to.y - m.from.y : m.from.y - m.to.y;
      score += isMaximizing ? dy * 3 : -(dy * 3);
      if (isMaximizing) {
        if (score > bestScore) {
          bestScore = score;
          candidates.length = 0;
          candidates.push({ move: m, score });
        } else if (Math.abs(score - bestScore) < 1e-3) {
          candidates.push({ move: m, score });
        }
      } else {
        if (score < bestScore) {
          bestScore = score;
          candidates.length = 0;
          candidates.push({ move: m, score });
        } else if (Math.abs(score - bestScore) < 1e-3) {
          candidates.push({ move: m, score });
        }
      }
    }
    if (candidates.length === 0) return null;
    if (randomness > 0 && Math.random() < randomness && movesToEvaluate.length > 1) {
      const randMove = movesToEvaluate[Math.floor(Math.random() * movesToEvaluate.length)];
      return { ...randMove, score: bestScore };
    }
    const chosen = candidates[Math.floor(Math.random() * candidates.length)];
    return { ...chosen.move, score: chosen.score };
  }
  alphaBeta(depth, alpha, beta, isMaximizing) {
    if (depth <= 0 || this.result.isOver) {
      return this.evaluate();
    }
    const legalMoves = this.getAllLegalMoves();
    if (legalMoves.length === 0) {
      return this.evaluate();
    }
    legalMoves.sort((a, b) => {
      const capA = this.getPiece(a.to) ? 100 : 0;
      const capB = this.getPiece(b.to) ? 100 : 0;
      return capB - capA;
    });
    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const m of legalMoves) {
        const sim = this.clone();
        sim.makeMove(m.from, m.to);
        const ev = sim.alphaBeta(depth - 1, alpha, beta, false);
        maxEval = Math.max(maxEval, ev);
        alpha = Math.max(alpha, ev);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const m of legalMoves) {
        const sim = this.clone();
        sim.makeMove(m.from, m.to);
        const ev = sim.alphaBeta(depth - 1, alpha, beta, true);
        minEval = Math.min(minEval, ev);
        beta = Math.min(beta, ev);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  }
}
export {
  BOARD_LEVELS,
  BOARD_SIZE,
  GATE_RANK_MAX,
  GATE_RANK_MIN,
  LEVEL_A,
  LEVEL_B,
  LEVEL_C,
  LEVEL_D,
  LEVEL_E,
  MAX_COORD,
  MAX_LEVEL,
  MIN_COORD,
  MIN_LEVEL,
  POINTS_DRAW,
  POINTS_LOSS,
  POINTS_WIN,
  RED_WALL_BLACK_MIN,
  RED_WALL_WHITE_MAX,
  ThreeDGame,
  getSkillConfig,
  isDimensionalGateRank,
  isRedWallRank,
  isValidPos,
  parsePos,
  pieceNotationSymbol,
  posToString
};
