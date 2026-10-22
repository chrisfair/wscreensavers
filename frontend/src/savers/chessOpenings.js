// Chess Openings Screensaver — Interactive master opening visualizer
// Features 16 legendary openings, smooth sliding animations with parabolic lift,
// board theme palettes, coordinate ranks & files, last move glow, captured pieces,
// ECO codes, and move notation ticker.

const OPENINGS = [
  {
    id: 'najdorf',
    name: 'Sicilian Defense: Najdorf Variation',
    eco: 'B90',
    description: 'Bobby Fischer & Garry Kasparov\'s ultimate weapon; sharp counter-play on the queenside.',
    moves: [
      { from: 'e2', to: 'e4', san: '1. e4' },
      { from: 'c7', to: 'c5', san: '1... c5' },
      { from: 'g1', to: 'f3', san: '2. Nf3' },
      { from: 'd7', to: 'd6', san: '2... d6' },
      { from: 'd2', to: 'd4', san: '3. d4' },
      { from: 'c5', to: 'd4', san: '3... cxd4' },
      { from: 'f3', to: 'd4', san: '4. Nxd4' },
      { from: 'g8', to: 'f6', san: '4... Nf6' },
      { from: 'b1', to: 'c3', san: '5. Nc3' },
      { from: 'a7', to: 'a6', san: '5... a6' },
      { from: 'c1', to: 'e3', san: '6. Be3' },
      { from: 'e7', to: 'e5', san: '6... e5' },
      { from: 'd4', to: 'b3', san: '7. Nb3' },
      { from: 'c8', to: 'e6', san: '7... Be6' }
    ]
  },
  {
    id: 'berlin',
    name: 'Ruy Lopez: Berlin Defense',
    eco: 'C65',
    description: 'The legendary "Berlin Wall" Kramnik used to dethrone Kasparov in 2000.',
    moves: [
      { from: 'e2', to: 'e4', san: '1. e4' },
      { from: 'e7', to: 'e5', san: '1... e5' },
      { from: 'g1', to: 'f3', san: '2. Nf3' },
      { from: 'b8', to: 'c6', san: '2... Nc6' },
      { from: 'f1', to: 'b5', san: '3. Bb5' },
      { from: 'g8', to: 'f6', san: '3... Nf6' },
      { from: 'e1', to: 'g1', san: '4. O-O', castle: { from: 'h1', to: 'f1' } },
      { from: 'f6', to: 'e4', san: '4... Nxe4' },
      { from: 'd2', to: 'd4', san: '5. d4' },
      { from: 'e4', to: 'd6', san: '5... Nd6' },
      { from: 'b5', to: 'c6', san: '6. Bxc6' },
      { from: 'd7', to: 'c6', san: '6... dxc6' },
      { from: 'd4', to: 'e5', san: '7. dxe5' },
      { from: 'd6', to: 'f5', san: '7... Nf5' },
      { from: 'd1', to: 'd8', san: '8. Qxd8+' },
      { from: 'e8', to: 'd8', san: '8... Kxd8' }
    ]
  },
  {
    id: 'queens_gambit',
    name: 'Queen\'s Gambit Declined: Tartakower',
    eco: 'D58',
    description: 'Solid World Championship defense establishing a harmonious light-squared fianchetto.',
    moves: [
      { from: 'd2', to: 'd4', san: '1. d4' },
      { from: 'd7', to: 'd5', san: '1... d5' },
      { from: 'c2', to: 'c4', san: '2. c4' },
      { from: 'e7', to: 'e6', san: '2... e6' },
      { from: 'b1', to: 'c3', san: '3. Nc3' },
      { from: 'g8', to: 'f6', san: '3... Nf6' },
      { from: 'c1', to: 'g5', san: '4. Bg5' },
      { from: 'f8', to: 'e7', san: '4... Be7' },
      { from: 'e2', to: 'e3', san: '5. e3' },
      { from: 'e8', to: 'g8', san: '5... O-O', castle: { from: 'h8', to: 'f8' } },
      { from: 'g1', to: 'f3', san: '6. Nf3' },
      { from: 'h7', to: 'h6', san: '6... h6' },
      { from: 'g5', to: 'h4', san: '7. Bh4' },
      { from: 'b7', to: 'b6', san: '7... b6' }
    ]
  },
  {
    id: 'giuoco_piano',
    name: 'Italian Game: Giuoco Piano',
    eco: 'C54',
    description: 'The classic 16th-century Italian opening aiming for rapid development and central control.',
    moves: [
      { from: 'e2', to: 'e4', san: '1. e4' },
      { from: 'e7', to: 'e5', san: '1... e5' },
      { from: 'g1', to: 'f3', san: '2. Nf3' },
      { from: 'b8', to: 'c6', san: '2... Nc6' },
      { from: 'f1', to: 'c4', san: '3. Bc4' },
      { from: 'f8', to: 'c5', san: '3... Bc5' },
      { from: 'c2', to: 'c3', san: '4. c3' },
      { from: 'g8', to: 'f6', san: '4... Nf6' },
      { from: 'd2', to: 'd4', san: '5. d4' },
      { from: 'e5', to: 'd4', san: '5... exd4' },
      { from: 'c3', to: 'd4', san: '6. cxd4' },
      { from: 'c5', to: 'b4', san: '6... Bb4+' },
      { from: 'c1', to: 'd2', san: '7. Bd2' },
      { from: 'b4', to: 'd2', san: '7... Bxd2+' },
      { from: 'b1', to: 'd2', san: '8. Nbxd2' },
      { from: 'd7', to: 'd5', san: '8... d5' }
    ]
  },
  {
    id: 'kings_indian',
    name: 'King\'s Indian Defense: Classical',
    eco: 'E97',
    description: 'Hypermodern counter-attacking masterpiece: White pushes queenside, Black storms kingside.',
    moves: [
      { from: 'd2', to: 'd4', san: '1. d4' },
      { from: 'g8', to: 'f6', san: '1... Nf6' },
      { from: 'c2', to: 'c4', san: '2. c4' },
      { from: 'g7', to: 'g6', san: '2... g6' },
      { from: 'b1', to: 'c3', san: '3. Nc3' },
      { from: 'f8', to: 'g7', san: '3... Bg7' },
      { from: 'e2', to: 'e4', san: '4. e4' },
      { from: 'd7', to: 'd6', san: '4... d6' },
      { from: 'g1', to: 'f3', san: '5. Nf3' },
      { from: 'e8', to: 'g8', san: '5... O-O', castle: { from: 'h8', to: 'f8' } },
      { from: 'f1', to: 'e2', san: '6. Be2' },
      { from: 'e7', to: 'e5', san: '6... e5' },
      { from: 'e1', to: 'g1', san: '7. O-O', castle: { from: 'h1', to: 'f1' } },
      { from: 'b8', to: 'c6', san: '7... Nc6' },
      { from: 'd4', to: 'd5', san: '8. d5' },
      { from: 'c6', to: 'e7', san: '8... Ne7' }
    ]
  },
  {
    id: 'french_winawer',
    name: 'French Defense: Winawer Variation',
    eco: 'C18',
    description: 'Sharp asymmetric warfare pinning White\'s c3 knight and disrupting White\'s pawn skeleton.',
    moves: [
      { from: 'e2', to: 'e4', san: '1. e4' },
      { from: 'e7', to: 'e6', san: '1... e6' },
      { from: 'd2', to: 'd4', san: '2. d4' },
      { from: 'd7', to: 'd5', san: '2... d5' },
      { from: 'b1', to: 'c3', san: '3. Nc3' },
      { from: 'f8', to: 'b4', san: '3... Bb4' },
      { from: 'e4', to: 'e5', san: '4. e5' },
      { from: 'c7', to: 'c5', san: '4... c5' },
      { from: 'a2', to: 'a3', san: '5. a3' },
      { from: 'b4', to: 'c3', san: '5... Bxc3+' },
      { from: 'b2', to: 'c3', san: '6. bxc3' },
      { from: 'g8', to: 'e7', san: '6... Ne7' },
      { from: 'd1', to: 'g4', san: '7. Qg4' },
      { from: 'e8', to: 'g8', san: '7... O-O', castle: { from: 'h8', to: 'f8' } }
    ]
  },
  {
    id: 'caro_kann',
    name: 'Caro-Kann Defense: Classical',
    eco: 'B18',
    description: 'Anatoly Karpov\'s unshakeable bulwark with clean pawn structures and sound piece placement.',
    moves: [
      { from: 'e2', to: 'e4', san: '1. e4' },
      { from: 'c7', to: 'c6', san: '1... c6' },
      { from: 'd2', to: 'd4', san: '2. d4' },
      { from: 'd7', to: 'd5', san: '2... d5' },
      { from: 'b1', to: 'c3', san: '3. Nc3' },
      { from: 'd5', to: 'e4', san: '3... dxe4' },
      { from: 'c3', to: 'e4', san: '4. Nxe4' },
      { from: 'c8', to: 'f5', san: '4... Bf5' },
      { from: 'e4', to: 'g3', san: '5. Ng3' },
      { from: 'f5', to: 'g6', san: '5... Bg6' },
      { from: 'h2', to: 'h4', san: '6. h4' },
      { from: 'h7', to: 'h6', san: '6... h6' },
      { from: 'g1', to: 'f3', san: '7. Nf3' },
      { from: 'b8', to: 'd7', san: '7... Nd7' },
      { from: 'h4', to: 'h5', san: '8. h5' },
      { from: 'g6', to: 'h7', san: '8... Bh7' }
    ]
  },
  {
    id: 'grunfeld',
    name: 'Grünfeld Defense: Exchange Variation',
    eco: 'D85',
    description: 'Allows White a towering pawn center only to immediately strike and undermine it from afar.',
    moves: [
      { from: 'd2', to: 'd4', san: '1. d4' },
      { from: 'g8', to: 'f6', san: '1... Nf6' },
      { from: 'c2', to: 'c4', san: '2. c4' },
      { from: 'g7', to: 'g6', san: '2... g6' },
      { from: 'b1', to: 'c3', san: '3. Nc3' },
      { from: 'd7', to: 'd5', san: '3... d5' },
      { from: 'c4', to: 'd5', san: '4. cxd5' },
      { from: 'f6', to: 'd5', san: '4... Nxd5' },
      { from: 'e2', to: 'e4', san: '5. e4' },
      { from: 'd5', to: 'c3', san: '5... Nxc3' },
      { from: 'b2', to: 'c3', san: '6. bxc3' },
      { from: 'f8', to: 'g7', san: '6... Bg7' },
      { from: 'g1', to: 'f3', san: '7. Nf3' },
      { from: 'c7', to: 'c5', san: '7... c5' }
    ]
  },
  {
    id: 'kings_gambit',
    name: 'King\'s Gambit Accepted',
    eco: 'C34',
    description: 'Romantic 19th-century swashbuckler sacrificing a flank pawn for blazing tactical lines.',
    moves: [
      { from: 'e2', to: 'e4', san: '1. e4' },
      { from: 'e7', to: 'e5', san: '1... e5' },
      { from: 'f2', to: 'f4', san: '2. f4' },
      { from: 'e5', to: 'f4', san: '2... exf4' },
      { from: 'g1', to: 'f3', san: '3. Nf3' },
      { from: 'g7', to: 'g5', san: '3... g5' },
      { from: 'f1', to: 'c4', san: '4. Bc4' },
      { from: 'g5', to: 'g4', san: '4... g4' },
      { from: 'e1', to: 'g1', san: '5. O-O', castle: { from: 'h1', to: 'f1' } },
      { from: 'g4', to: 'f3', san: '5... gxf3' },
      { from: 'd1', to: 'f3', san: '6. Qxf3' },
      { from: 'd8', to: 'f6', san: '6... Qf6' }
    ]
  },
  {
    id: 'nimzo_indian',
    name: 'Nimzo-Indian Defense: Rubinstein',
    eco: 'E40',
    description: 'Aron Nimzowitsch\'s revolutionary system neutralizing White\'s e4 break via the c3 pin.',
    moves: [
      { from: 'd2', to: 'd4', san: '1. d4' },
      { from: 'g8', to: 'f6', san: '1... Nf6' },
      { from: 'c2', to: 'c4', san: '2. c4' },
      { from: 'e7', to: 'e6', san: '2... e6' },
      { from: 'b1', to: 'c3', san: '3. Nc3' },
      { from: 'f8', to: 'b4', san: '3... Bb4' },
      { from: 'e2', to: 'e3', san: '4. e3' },
      { from: 'e8', to: 'g8', san: '4... O-O', castle: { from: 'h8', to: 'f8' } },
      { from: 'f1', to: 'd3', san: '5. Bd3' },
      { from: 'd7', to: 'd5', san: '5... d5' },
      { from: 'g1', to: 'f3', san: '6. Nf3' },
      { from: 'c7', to: 'c5', san: '6... c5' },
      { from: 'e1', to: 'g1', san: '7. O-O', castle: { from: 'h1', to: 'f1' } }
    ]
  },
  {
    id: 'english',
    name: 'English Opening: Symmetrical',
    eco: 'A34',
    description: 'Flank strategy controlling d5 without committing central pawns early.',
    moves: [
      { from: 'c2', to: 'c4', san: '1. c4' },
      { from: 'c7', to: 'c5', san: '1... c5' },
      { from: 'b1', to: 'c3', san: '2. Nc3' },
      { from: 'g8', to: 'f6', san: '2... Nf6' },
      { from: 'g2', to: 'g3', san: '3. g3' },
      { from: 'd7', to: 'd5', san: '3... d5' },
      { from: 'c4', to: 'd5', san: '4. cxd5' },
      { from: 'f6', to: 'd5', san: '4... Nxd5' },
      { from: 'f1', to: 'g2', san: '5. Bg2' },
      { from: 'd5', to: 'c7', san: '5... Nc7' },
      { from: 'g1', to: 'f3', san: '6. Nf3' },
      { from: 'b8', to: 'c6', san: '6... Nc6' },
      { from: 'e1', to: 'g1', san: '7. O-O', castle: { from: 'h1', to: 'f1' } },
      { from: 'e7', to: 'e5', san: '7... e5' }
    ]
  },
  {
    id: 'scotch',
    name: 'Scotch Game: Mieses Variation',
    eco: 'C45',
    description: 'Revived by Kasparov against Karpov to open central lanes for explosive initiative.',
    moves: [
      { from: 'e2', to: 'e4', san: '1. e4' },
      { from: 'e7', to: 'e5', san: '1... e5' },
      { from: 'g1', to: 'f3', san: '2. Nf3' },
      { from: 'b8', to: 'c6', san: '2... Nc6' },
      { from: 'd2', to: 'd4', san: '3. d4' },
      { from: 'e5', to: 'd4', san: '3... exd4' },
      { from: 'f3', to: 'd4', san: '4. Nxd4' },
      { from: 'g8', to: 'f6', san: '4... Nf6' },
      { from: 'd4', to: 'c6', san: '5. Nxc6' },
      { from: 'b7', to: 'c6', san: '5... bxc6' },
      { from: 'e4', to: 'e5', san: '6. e5' },
      { from: 'd8', to: 'e7', san: '6... Qe7' },
      { from: 'd1', to: 'e2', san: '7. Qe2' },
      { from: 'f6', to: 'd5', san: '7... Nd5' }
    ]
  }
];

const THEMES = {
  walnut: {
    dark: '#b58863',
    light: '#f0d9b5',
    border: '#5c3a21',
    borderOuter: '#3d2514',
    highlight: 'rgba(234, 179, 8, 0.45)',
    lastMove: 'rgba(245, 158, 11, 0.4)',
    accent: '#f59e0b',
    coordColor: '#e2d4c0'
  },
  tournament: {
    dark: '#769656',
    light: '#eeeed2',
    border: '#3f5926',
    borderOuter: '#2b3d19',
    highlight: 'rgba(250, 204, 21, 0.45)',
    lastMove: 'rgba(234, 179, 8, 0.4)',
    accent: '#84cc16',
    coordColor: '#e8eed5'
  },
  cyber: {
    dark: '#0f172a',
    light: '#1e293b',
    border: '#0284c7',
    borderOuter: '#0369a1',
    highlight: 'rgba(56, 189, 248, 0.45)',
    lastMove: 'rgba(14, 165, 233, 0.4)',
    accent: '#38bdf8',
    coordColor: '#94a3b8'
  },
  marble: {
    dark: '#475569',
    light: '#cbd5e1',
    border: '#1e293b',
    borderOuter: '#0f172a',
    highlight: 'rgba(244, 63, 94, 0.45)',
    lastMove: 'rgba(225, 29, 72, 0.4)',
    accent: '#f43f5e',
    coordColor: '#f1f5f9'
  }
};

function parseSquare(sq) {
  const f = sq.charCodeAt(0) - 97; // 'a' -> 0
  const r = parseInt(sq.charAt(1), 10) - 1; // '1' -> 0
  return { f, r };
}

function initBoard() {
  const b = Array.from({ length: 8 }, () => Array(8).fill(null));
  // White pieces (rank 1 -> r=0, rank 2 -> r=1)
  const backRank = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];
  for (let f = 0; f < 8; f++) {
    b[f][0] = { color: 'w', type: backRank[f] };
    b[f][1] = { color: 'w', type: 'P' };
    b[f][6] = { color: 'b', type: 'P' };
    b[f][7] = { color: 'b', type: backRank[f] };
  }
  return b;
}

export function createChessOpenings(canvas, getParams) {
  const ctx = canvas.getContext('2d');
  let currentOpeningIndex = 0;
  let moveIndex = 0;
  let moveProgress = 1.0; // 0 to 1 during move animation
  let pauseTimer = 0;
  let isPausedBetweenOpenings = false;
  let board = initBoard();
  let lastMove = null;
  let currentMovingPiece = null;
  let currentCastlePiece = null;
  let capturedPieces = { w: [], b: [] };
  let movesPlayed = [];

  function loadOpening(idx) {
    currentOpeningIndex = idx % OPENINGS.length;
    moveIndex = 0;
    moveProgress = 1.0;
    pauseTimer = 0.8;
    isPausedBetweenOpenings = false;
    board = initBoard();
    lastMove = null;
    currentMovingPiece = null;
    currentCastlePiece = null;
    capturedPieces = { w: [], b: [] };
    movesPlayed = [];
  }

  loadOpening(0);

  return {
    render(dt) {
      const p = getParams();
      const speed = Number(p.speed ?? 1.0);
      const moveDuration = Math.max(0.35, 1.2 / Math.max(0.2, speed));
      const themeName = p.theme || 'walnut';
      const theme = THEMES[themeName] || THEMES.walnut;
      const is3D = p.perspective !== '2d';
      const showCoords = p.showCoordinates !== false;
      const explicitOpening = p.opening;

      if (explicitOpening && explicitOpening !== 'cycle' && explicitOpening !== 'random') {
        const found = OPENINGS.findIndex(o => o.id === explicitOpening);
        if (found !== -1 && found !== currentOpeningIndex && !currentMovingPiece) {
          loadOpening(found);
        }
      }

      const activeOpening = OPENINGS[currentOpeningIndex];

      // Logic update
      if (pauseTimer > 0) {
        pauseTimer -= dt;
        if (pauseTimer <= 0) {
          if (isPausedBetweenOpenings) {
            // Pick next opening
            if (p.opening === 'random') {
              loadOpening(Math.floor(Math.random() * OPENINGS.length));
            } else {
              loadOpening(currentOpeningIndex + 1);
            }
          }
        }
      } else if (currentMovingPiece) {
        moveProgress += dt / moveDuration;
        if (moveProgress >= 1.0) {
          moveProgress = 1.0;
          // Commit move to board
          const m = activeOpening.moves[moveIndex];
          const toSq = parseSquare(m.to);
          const captured = board[toSq.f][toSq.r];
          if (captured) {
            capturedPieces[captured.color].push(captured.type);
          }
          board[toSq.f][toSq.r] = currentMovingPiece.piece;

          if (m.castle) {
            const cTo = parseSquare(m.castle.to);
            board[cTo.f][cTo.r] = currentCastlePiece.piece;
          }

          lastMove = m;
          movesPlayed.push(m.san);
          currentMovingPiece = null;
          currentCastlePiece = null;
          moveIndex++;

          if (moveIndex >= activeOpening.moves.length) {
            // Opening finished! Pause to display result
            pauseTimer = 4.5;
            isPausedBetweenOpenings = true;
          } else {
            // Brief pause before next move
            pauseTimer = 0.45 / speed;
          }
        }
      } else if (moveIndex < activeOpening.moves.length) {
        // Start next move
        const m = activeOpening.moves[moveIndex];
        const fromSq = parseSquare(m.from);
        const toSq = parseSquare(m.to);
        const piece = board[fromSq.f][fromSq.r];
        board[fromSq.f][fromSq.r] = null;
        currentMovingPiece = { piece, from: fromSq, to: toSq };
        moveProgress = 0.0;

        if (m.castle) {
          const cFrom = parseSquare(m.castle.from);
          const cTo = parseSquare(m.castle.to);
          const cPiece = board[cFrom.f][cFrom.r];
          board[cFrom.f][cFrom.r] = null;
          currentCastlePiece = { piece: cPiece, from: cFrom, to: cTo };
        }
      }

      // Render Stage
      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = '#080b12';
      ctx.fillRect(0, 0, w, h);

      // Radial background ambiance
      const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 50, w / 2, h / 2, Math.max(w, h) * 0.7);
      bgGrad.addColorStop(0, '#131b2e');
      bgGrad.addColorStop(0.65, '#090d16');
      bgGrad.addColorStop(1, '#030508');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      const boardMargin = Math.min(w, h) * 0.12;
      const boardSize = Math.min(w - boardMargin * 2, h - boardMargin * 2 - 80);
      const sqSize = boardSize / 8;
      const boardX = (w - boardSize) / 2;
      const boardY = (h - boardSize) / 2 + 30;

      ctx.save();
      if (is3D) {
        // Tilt isometric board view with subtle perspective
        ctx.translate(w / 2, h / 2 + 40);
        ctx.transform(1, 0, -0.06, 0.88, 0, 0);
        ctx.translate(-w / 2, -(h / 2 + 40));
      }

      // Board border with shadow
      ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
      ctx.shadowBlur = 35;
      ctx.shadowOffsetY = 18;
      const borderThick = 24;

      // Outer wood rim
      ctx.fillStyle = theme.borderOuter;
      ctx.beginPath();
      roundRect(ctx, boardX - borderThick - 4, boardY - borderThick - 4, boardSize + (borderThick + 4) * 2, boardSize + (borderThick + 4) * 2, 14);
      ctx.fill();

      // Inner wood frame
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = theme.border;
      ctx.beginPath();
      roundRect(ctx, boardX - borderThick, boardY - borderThick, boardSize + borderThick * 2, boardSize + borderThick * 2, 8);
      ctx.fill();

      // 64 Chess Squares
      for (let f = 0; f < 8; f++) {
        for (let r = 0; r < 8; r++) {
          const isLight = (f + r) % 2 === 1;
          const x = boardX + f * sqSize;
          const y = boardY + (7 - r) * sqSize; // rank 1 at bottom

          ctx.fillStyle = isLight ? theme.light : theme.dark;
          ctx.fillRect(x, y, sqSize, sqSize);

          // Highlight last move squares
          if (lastMove) {
            const fromSq = parseSquare(lastMove.from);
            const toSq = parseSquare(lastMove.to);
            if ((f === fromSq.f && r === fromSq.r) || (f === toSq.f && r === toSq.r)) {
              ctx.fillStyle = theme.lastMove;
              ctx.fillRect(x, y, sqSize, sqSize);
            }
          }

          // Active moving piece target highlight
          if (currentMovingPiece) {
            if (f === currentMovingPiece.to.f && r === currentMovingPiece.to.r) {
              ctx.fillStyle = theme.highlight;
              ctx.fillRect(x, y, sqSize, sqSize);
            }
          }
        }
      }

      // Coordinate Labels (ranks 1-8, files a-h)
      if (showCoords) {
        ctx.fillStyle = theme.coordColor;
        ctx.font = '600 12px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (let f = 0; f < 8; f++) {
          const letter = String.fromCharCode(97 + f);
          const x = boardX + f * sqSize + sqSize / 2;
          ctx.fillText(letter, x, boardY + boardSize + 12);
          ctx.fillText(letter, x, boardY - 12);
        }
        for (let r = 0; r < 8; r++) {
          const num = String(r + 1);
          const y = boardY + (7 - r) * sqSize + sqSize / 2;
          ctx.fillText(num, boardX - 12, y);
          ctx.fillText(num, boardX + boardSize + 12, y);
        }
      }

      // Draw stationary pieces
      for (let f = 0; f < 8; f++) {
        for (let r = 0; r < 8; r++) {
          const piece = board[f][r];
          if (piece) {
            const x = boardX + f * sqSize + sqSize / 2;
            const y = boardY + (7 - r) * sqSize + sqSize / 2;
            drawPiece(ctx, piece.color, piece.type, x, y, sqSize * 0.78);
          }
        }
      }

      // Draw active sliding pieces with smooth parabolic elevation arc
      function easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      }

      if (currentMovingPiece) {
        const ease = easeInOutCubic(moveProgress);
        const startX = boardX + currentMovingPiece.from.f * sqSize + sqSize / 2;
        const startY = boardY + (7 - currentMovingPiece.from.r) * sqSize + sqSize / 2;
        const targetX = boardX + currentMovingPiece.to.f * sqSize + sqSize / 2;
        const targetY = boardY + (7 - currentMovingPiece.to.r) * sqSize + sqSize / 2;

        const curX = startX + (targetX - startX) * ease;
        const curY = startY + (targetY - startY) * ease;
        const lift = Math.sin(moveProgress * Math.PI) * (sqSize * 0.35);

        // Piece shadow on board
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.ellipse(curX, curY + sqSize * 0.22, (sqSize * 0.28) * (1 + lift * 0.02), (sqSize * 0.12) * (1 + lift * 0.02), 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Lifted piece
        drawPiece(ctx, currentMovingPiece.piece.color, currentMovingPiece.piece.type, curX, curY - lift, sqSize * 0.88);
      }

      if (currentCastlePiece) {
        const ease = easeInOutCubic(moveProgress);
        const startX = boardX + currentCastlePiece.from.f * sqSize + sqSize / 2;
        const startY = boardY + (7 - currentCastlePiece.from.r) * sqSize + sqSize / 2;
        const targetX = boardX + currentCastlePiece.to.f * sqSize + sqSize / 2;
        const targetY = boardY + (7 - currentCastlePiece.to.r) * sqSize + sqSize / 2;

        const curX = startX + (targetX - startX) * ease;
        const curY = startY + (targetY - startY) * ease;
        drawPiece(ctx, currentCastlePiece.piece.color, currentCastlePiece.piece.type, curX, curY, sqSize * 0.78);
      }

      ctx.restore();

      // Top HUD Header Banner
      ctx.save();
      const padX = Math.max(24, (w - boardSize) / 2);
      ctx.textAlign = 'left';

      // ECO Badge
      const ecoX = padX;
      const ecoY = 32;
      ctx.fillStyle = theme.accent;
      ctx.font = '700 13px "JetBrains Mono", monospace';
      const ecoW = ctx.measureText(activeOpening.eco).width + 16;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.strokeStyle = theme.accent;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      roundRect(ctx, ecoX, ecoY - 14, ecoW, 26, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = theme.accent;
      ctx.fillText(activeOpening.eco, ecoX + 8, ecoY + 4);

      // Opening Name
      ctx.fillStyle = '#f8fafc';
      ctx.font = '800 22px system-ui, -apple-system, sans-serif';
      ctx.fillText(activeOpening.name, ecoX + ecoW + 14, ecoY + 4);

      // Strategy Subtitle
      ctx.fillStyle = '#94a3b8';
      ctx.font = '500 13px system-ui, -apple-system, sans-serif';
      ctx.fillText(activeOpening.description, padX, ecoY + 28);

      // Turn indicator & moves played ribbon
      ctx.textAlign = 'right';
      const moveCount = movesPlayed.length;
      const isWhiteTurn = moveCount % 2 === 0;
      ctx.fillStyle = isWhiteTurn ? '#f8fafc' : '#94a3b8';
      ctx.font = '700 13px system-ui, sans-serif';
      ctx.fillText(isWhiteTurn ? '⚪ White to move' : '⚫ Black to move', w - padX, ecoY + 4);

      // Bottom Moves Ribbon (1. e4 c5  2. Nf3 ...)
      const bottomY = h - 34;
      ctx.textAlign = 'left';
      ctx.font = '600 13px "JetBrains Mono", monospace';
      const historyStr = movesPlayed.join('  ');
      if (historyStr) {
        ctx.fillStyle = '#38bdf8';
        ctx.fillText('PGN: ', padX, bottomY);
        const pgnW = ctx.measureText('PGN: ').width;
        ctx.fillStyle = '#cbd5e1';
        ctx.fillText(historyStr, padX + pgnW, bottomY);
      }

      ctx.restore();
    }
  };
}

function drawPiece(ctx, color, type, cx, cy, size) {
  const isWhite = color === 'w';
  const fillColor = isWhite ? '#ffffff' : '#1e293b';
  const strokeColor = isWhite ? '#334155' : '#0f172a';
  const glyphMap = {
    K: isWhite ? '\u2654' : '\u265A',
    Q: isWhite ? '\u2655' : '\u265B',
    R: isWhite ? '\u2656' : '\u265C',
    B: isWhite ? '\u2657' : '\u265D',
    N: isWhite ? '\u2658' : '\u265E',
    P: isWhite ? '\u2659' : '\u265F'
  };

  ctx.save();
  ctx.translate(cx, cy);

  // Soft ambient piece drop shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 4;

  ctx.font = `${Math.floor(size * 0.95)}px "DejaVu Sans", "Noto Sans Symbols", "Segoe UI Symbol", "Apple Color Emoji", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Crisp outline for contrast against both light and dark squares
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = size * 0.06;
  ctx.strokeText(glyphMap[type] || '', 0, 2);

  ctx.fillStyle = fillColor;
  ctx.fillText(glyphMap[type] || '', 0, 2);

  ctx.restore();
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
