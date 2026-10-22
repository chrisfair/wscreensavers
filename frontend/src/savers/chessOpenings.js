// Chess Openings Screensaver — True 3D Master Chess Opening Visualizer
// Matches the visual aesthetics and 3D rendering of XScreenSaver's classic "endgame":
// - Full 3D Staunton pieces (Pawn, Rook, Knight, Bishop, Queen, King)
// - Specular-lit 3D checkered board with raised beveled wooden frame
// - Realistic contact shadows & phong/pbr lighting highlights
// - Parabolic 3D piece lift during move transitions
// - Smooth continuous 3D camera orbit with elevation wave (like endgame --rotate)
// - 16 legendary master openings with ECO codes, commentary, and move ticker HUD

import * as THREE from 'three';

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
    description: 'Dynamic structural conflict; Black pins White\'s c3 knight leading to sharp asymmetry.',
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
    description: 'Ultra-solid pawn structure; Black develops the light-squared bishop before sealing the chain.',
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
      { from: 'b8', to: 'd7', san: '7... Nd7' }
    ]
  },
  {
    id: 'grunfeld',
    name: 'Grünfeld Defense: Exchange Variation',
    eco: 'D85',
    description: 'Peter Svidler & Garry Kasparov\'s counter: allow White the center, then dismantle it from afar.',
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
    name: 'King\'s Gambit: Muzio Gambit',
    eco: 'C37',
    description: 'Romantic 19th-century audacity: sacrifice a knight on f3 for overwhelming king attack.',
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
    lightTile: 0xf0d9b5,
    darkTile: 0x8a5231,
    frame: 0x3d2012,
    rimTrim: 0x221008,
    whitePiece: 0xf5ede1,
    blackPiece: 0x181a1f,
    highlight: 0x22c55e,
    lastMove: 0xf59e0b,
    accent: '#f59e0b',
    hudText: '#f8fafc',
    coordColor: '#f0d9b5'
  },
  tournament: {
    lightTile: 0xeeeed2,
    darkTile: 0x5a7c42,
    frame: 0x23381a,
    rimTrim: 0x162410,
    whitePiece: 0xfbfbfb,
    blackPiece: 0x212529,
    highlight: 0xfacc15,
    lastMove: 0x84cc16,
    accent: '#84cc16',
    hudText: '#f8fafc',
    coordColor: '#eeeed2'
  },
  cyber: {
    lightTile: 0x1e293b,
    darkTile: 0x0a101d,
    frame: 0x0369a1,
    rimTrim: 0x0284c7,
    whitePiece: 0x38bdf8,
    blackPiece: 0x050811,
    highlight: 0x00f5d4,
    lastMove: 0x38bdf8,
    accent: '#38bdf8',
    hudText: '#e0f2fe',
    coordColor: '#38bdf8'
  },
  marble: {
    lightTile: 0xe2e8f0,
    darkTile: 0x475569,
    frame: 0x1e293b,
    rimTrim: 0x0f172a,
    whitePiece: 0xffffff,
    blackPiece: 0x131823,
    highlight: 0xf43f5e,
    lastMove: 0xfb7185,
    accent: '#f43f5e',
    hudText: '#f8fafc',
    coordColor: '#cbd5e1'
  }
};

function parseSquare(sq) {
  const f = sq.charCodeAt(0) - 97; // 'a' -> 0
  const r = parseInt(sq.charAt(1), 10) - 1; // '1' -> 0
  return { f, r };
}

function initBoardState() {
  const b = Array.from({ length: 8 }, () => Array(8).fill(null));
  const backRank = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];
  for (let f = 0; f < 8; f++) {
    b[f][0] = { color: 'w', type: backRank[f] };
    b[f][1] = { color: 'w', type: 'P' };
    b[f][6] = { color: 'b', type: 'P' };
    b[f][7] = { color: 'b', type: backRank[f] };
  }
  return b;
}

// Convert board coordinates (f=0..7, r=0..7) to 3D world positions (X, Z)
function sqToWorld(f, r) {
  return {
    x: (f - 3.5) * 1.0,
    z: (3.5 - r) * 1.0
  };
}

// --- Staunton 3D Geometry Factory ---
function buildStauntonTemplates() {
  // Pawn
  const pawnPts = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0.34, 0),
    new THREE.Vector2(0.34, 0.06),
    new THREE.Vector2(0.30, 0.09),
    new THREE.Vector2(0.24, 0.12),
    new THREE.Vector2(0.16, 0.25),
    new THREE.Vector2(0.12, 0.45),
    new THREE.Vector2(0.18, 0.52),
    new THREE.Vector2(0.14, 0.56),
    new THREE.Vector2(0.20, 0.68),
    new THREE.Vector2(0.00, 0.82)
  ];
  const pawnGeo = new THREE.LatheGeometry(pawnPts, 24);

  // Rook
  const rookPts = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0.35, 0),
    new THREE.Vector2(0.35, 0.08),
    new THREE.Vector2(0.30, 0.12),
    new THREE.Vector2(0.24, 0.16),
    new THREE.Vector2(0.20, 0.65),
    new THREE.Vector2(0.26, 0.72),
    new THREE.Vector2(0.28, 0.92),
    new THREE.Vector2(0.20, 0.92),
    new THREE.Vector2(0.20, 0.84),
    new THREE.Vector2(0.00, 0.84)
  ];
  const rookGeo = new THREE.LatheGeometry(rookPts, 24);
  const rookCrenGeo = new THREE.BoxGeometry(0.10, 0.12, 0.10);

  // Bishop
  const bishopPts = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0.35, 0),
    new THREE.Vector2(0.35, 0.08),
    new THREE.Vector2(0.30, 0.12),
    new THREE.Vector2(0.22, 0.16),
    new THREE.Vector2(0.15, 0.55),
    new THREE.Vector2(0.22, 0.62),
    new THREE.Vector2(0.16, 0.66),
    new THREE.Vector2(0.23, 0.85),
    new THREE.Vector2(0.18, 1.02),
    new THREE.Vector2(0.06, 1.10),
    new THREE.Vector2(0.00, 1.14)
  ];
  const bishopGeo = new THREE.LatheGeometry(bishopPts, 24);
  const bishopBallGeo = new THREE.SphereGeometry(0.065, 16, 16);

  // Queen
  const queenPts = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0.38, 0),
    new THREE.Vector2(0.38, 0.08),
    new THREE.Vector2(0.32, 0.12),
    new THREE.Vector2(0.24, 0.18),
    new THREE.Vector2(0.16, 0.70),
    new THREE.Vector2(0.26, 0.82),
    new THREE.Vector2(0.22, 0.86),
    new THREE.Vector2(0.32, 1.18),
    new THREE.Vector2(0.28, 1.22),
    new THREE.Vector2(0.00, 1.16)
  ];
  const queenGeo = new THREE.LatheGeometry(queenPts, 24);
  const queenBallGeo = new THREE.SphereGeometry(0.085, 16, 16);

  // King
  const kingPts = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0.40, 0),
    new THREE.Vector2(0.40, 0.09),
    new THREE.Vector2(0.34, 0.13),
    new THREE.Vector2(0.26, 0.20),
    new THREE.Vector2(0.18, 0.75),
    new THREE.Vector2(0.28, 0.88),
    new THREE.Vector2(0.34, 1.22),
    new THREE.Vector2(0.30, 1.28),
    new THREE.Vector2(0.00, 1.28)
  ];
  const kingGeo = new THREE.LatheGeometry(kingPts, 24);
  const crossVGeo = new THREE.BoxGeometry(0.06, 0.22, 0.05);
  const crossHGeo = new THREE.BoxGeometry(0.16, 0.06, 0.05);

  // Knight
  const knightBasePts = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0.36, 0),
    new THREE.Vector2(0.36, 0.08),
    new THREE.Vector2(0.30, 0.12),
    new THREE.Vector2(0.24, 0.18),
    new THREE.Vector2(0.22, 0.28),
    new THREE.Vector2(0.00, 0.28)
  ];
  const knightBaseGeo = new THREE.LatheGeometry(knightBasePts, 24);

  const shape = new THREE.Shape();
  shape.moveTo(-0.16, 0.26);
  shape.lineTo(-0.18, 0.50);
  shape.lineTo(-0.12, 0.72);
  shape.lineTo(-0.06, 0.88);
  shape.lineTo(0.00, 0.98);
  shape.lineTo(0.05, 0.88);
  shape.lineTo(0.18, 0.72);
  shape.lineTo(0.25, 0.60);
  shape.lineTo(0.18, 0.53);
  shape.lineTo(0.08, 0.53);
  shape.lineTo(0.04, 0.26);
  shape.closePath();

  const knightHeadGeo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.18,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.03,
    bevelThickness: 0.03
  });
  knightHeadGeo.center();

  return {
    pawnGeo,
    rookGeo,
    rookCrenGeo,
    bishopGeo,
    bishopBallGeo,
    queenGeo,
    queenBallGeo,
    kingGeo,
    crossVGeo,
    crossHGeo,
    knightBaseGeo,
    knightHeadGeo
  };
}

function assemblePieceGroup(type, color, templates, mat) {
  const group = new THREE.Group();

  function makeMesh(geo) {
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }

  if (type === 'P') {
    group.add(makeMesh(templates.pawnGeo));
  } else if (type === 'R') {
    group.add(makeMesh(templates.rookGeo));
    const angles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
    for (const a of angles) {
      const cren = makeMesh(templates.rookCrenGeo);
      cren.position.set(Math.cos(a) * 0.23, 0.96, Math.sin(a) * 0.23);
      group.add(cren);
    }
  } else if (type === 'N') {
    group.add(makeMesh(templates.knightBaseGeo));
    const head = makeMesh(templates.knightHeadGeo);
    head.position.set(0, 0.62, 0);
    // Face opponent (White pieces look toward -Z, Black toward +Z)
    head.rotation.y = color === 'w' ? Math.PI / 2 : -Math.PI / 2;
    group.add(head);
  } else if (type === 'B') {
    group.add(makeMesh(templates.bishopGeo));
    const ball = makeMesh(templates.bishopBallGeo);
    ball.position.y = 1.18;
    group.add(ball);
  } else if (type === 'Q') {
    group.add(makeMesh(templates.queenGeo));
    const ball = makeMesh(templates.queenBallGeo);
    ball.position.y = 1.26;
    group.add(ball);
  } else if (type === 'K') {
    group.add(makeMesh(templates.kingGeo));
    const v = makeMesh(templates.crossVGeo);
    v.position.y = 1.38;
    group.add(v);
    const h = makeMesh(templates.crossHGeo);
    h.position.y = 1.42;
    group.add(h);
  }

  return group;
}

export function createChessOpenings(canvas, getParams) {
  const w = canvas.width;
  const h = canvas.height;

  // Initialize Three.js WebGL Scene
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

  // 2D HUD Overlay Canvas
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

  // Lighting (Matches OpenGL endgame specular look)
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
  scene.add(ambientLight);

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

  const fillLight = new THREE.DirectionalLight(0xa5c4ff, 0.45);
  fillLight.position.set(-8.0, 9.0, -8.0);
  scene.add(fillLight);

  const templates = buildStauntonTemplates();

  // Materials Cache
  let currentThemeName = 'walnut';
  let theme = THEMES.walnut;

  let matWhite = new THREE.MeshStandardMaterial({
    color: theme.whitePiece,
    roughness: 0.22,
    metalness: 0.05
  });
  let matBlack = new THREE.MeshStandardMaterial({
    color: theme.blackPiece,
    roughness: 0.20,
    metalness: 0.12
  });

  let matLightTile = new THREE.MeshStandardMaterial({
    color: theme.lightTile,
    roughness: 0.26,
    metalness: 0.04
  });
  let matDarkTile = new THREE.MeshStandardMaterial({
    color: theme.darkTile,
    roughness: 0.28,
    metalness: 0.04
  });
  let matFrame = new THREE.MeshStandardMaterial({
    color: theme.frame,
    roughness: 0.35,
    metalness: 0.06
  });
  let matTrim = new THREE.MeshStandardMaterial({
    color: theme.rimTrim,
    roughness: 0.40,
    metalness: 0.08
  });

  let matLastMove = new THREE.MeshStandardMaterial({
    color: theme.lastMove,
    emissive: theme.lastMove,
    emissiveIntensity: 0.45,
    roughness: 0.3
  });
  let matHighlight = new THREE.MeshStandardMaterial({
    color: theme.highlight,
    emissive: theme.highlight,
    emissiveIntensity: 0.55,
    roughness: 0.3
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

  // Build 3D Board
  const boardGroup = new THREE.Group();
  scene.add(boardGroup);

  // Wooden Base Plinth
  const baseBox = new THREE.Mesh(new THREE.BoxGeometry(9.8, 0.45, 9.8), matFrame);
  baseBox.position.y = -0.225;
  baseBox.receiveShadow = true;
  boardGroup.add(baseBox);

  // Outer Beveled Trim Rims
  const trimNorth = new THREE.Mesh(new THREE.BoxGeometry(9.8, 0.12, 0.9), matTrim);
  trimNorth.position.set(0, 0.06, -4.45);
  boardGroup.add(trimNorth);

  const trimSouth = new THREE.Mesh(new THREE.BoxGeometry(9.8, 0.12, 0.9), matTrim);
  trimSouth.position.set(0, 0.06, 4.45);
  boardGroup.add(trimSouth);

  const trimEast = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, 8.0), matTrim);
  trimEast.position.set(4.45, 0.06, 0);
  boardGroup.add(trimEast);

  const trimWest = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, 8.0), matTrim);
  trimWest.position.set(-4.45, 0.06, 0);
  boardGroup.add(trimWest);

  // 64 Chess Square Meshes
  const tileMeshes = Array.from({ length: 8 }, () => Array(8).fill(null));
  const tileGeo = new THREE.BoxGeometry(0.99, 0.08, 0.99);

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

  // Piece Meshes Grid [f][r]
  const pieceMeshes = Array.from({ length: 8 }, () => Array(8).fill(null));

  // Game state
  let currentOpeningIndex = 0;
  let moveIndex = 0;
  let moveProgress = 1.0;
  let pauseTimer = 0.8;
  let isPausedBetweenOpenings = false;
  let boardState = initBoardState();
  let lastMove = null;
  let currentMovingPiece = null;
  let currentCastlePiece = null;
  let capturedPieces = { w: [], b: [] };
  let movesPlayed = [];
  let orbitAngle = 0.45;

  function clearPieceMeshes() {
    for (let f = 0; f < 8; f++) {
      for (let r = 0; r < 8; r++) {
        if (pieceMeshes[f][r]) {
          scene.remove(pieceMeshes[f][r]);
          pieceMeshes[f][r] = null;
        }
      }
    }
  }

  function spawnBoardPieces() {
    clearPieceMeshes();
    for (let f = 0; f < 8; f++) {
      for (let r = 0; r < 8; r++) {
        const item = boardState[f][r];
        if (item) {
          const mat = item.color === 'w' ? matWhite : matBlack;
          const pieceObj = assemblePieceGroup(item.type, item.color, templates, mat);
          const pos = sqToWorld(f, r);
          pieceObj.position.set(pos.x, 0.08, pos.z);
          scene.add(pieceObj);
          pieceMeshes[f][r] = pieceObj;
        }
      }
    }
  }

  function loadOpening(idx) {
    currentOpeningIndex = idx % OPENINGS.length;
    moveIndex = 0;
    moveProgress = 1.0;
    pauseTimer = 0.8;
    isPausedBetweenOpenings = false;
    boardState = initBoardState();
    lastMove = null;
    currentMovingPiece = null;
    currentCastlePiece = null;
    capturedPieces = { w: [], b: [] };
    movesPlayed = [];
    spawnBoardPieces();
    resetTileMaterials();
  }

  function resetTileMaterials() {
    for (let f = 0; f < 8; f++) {
      for (let r = 0; r < 8; r++) {
        const isLight = (f + r) % 2 === 1;
        tileMeshes[f][r].material = isLight ? matLightTile : matDarkTile;
      }
    }
  }

  function highlightSquares() {
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
  }

  loadOpening(0);

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

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
      const moveDuration = Math.max(0.35, 1.2 / Math.max(0.2, speed));
      const themeName = p.theme || 'walnut';
      updateMaterials(themeName);

      const perspective = p.perspective || '3d';
      const shouldRotate = perspective !== 'fixed' && perspective !== '2d' && p.rotate !== false;
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
          const m = activeOpening.moves[moveIndex];
          const toSq = parseSquare(m.to);
          const toPos = sqToWorld(toSq.f, toSq.r);

          // Place moving mesh onto target square
          currentMovingPiece.mesh.position.set(toPos.x, 0.08, toPos.z);
          currentMovingPiece.mesh.rotation.x = 0;
          currentMovingPiece.mesh.rotation.z = 0;

          // Remove captured mesh if any
          if (pieceMeshes[toSq.f][toSq.r]) {
            scene.remove(pieceMeshes[toSq.f][toSq.r]);
          }
          pieceMeshes[toSq.f][toSq.r] = currentMovingPiece.mesh;
          boardState[toSq.f][toSq.r] = currentMovingPiece.piece;

          // Commit Castling Rook
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

          highlightSquares();

          if (moveIndex >= activeOpening.moves.length) {
            pauseTimer = 4.5;
            isPausedBetweenOpenings = true;
          } else {
            pauseTimer = 0.45 / speed;
          }
        } else {
          // Animate 3D parabolic lift and flight
          const ease = easeInOutCubic(moveProgress);
          const startPos = sqToWorld(currentMovingPiece.from.f, currentMovingPiece.from.r);
          const targetPos = sqToWorld(currentMovingPiece.to.f, currentMovingPiece.to.r);

          const curX = startPos.x + (targetPos.x - startPos.x) * ease;
          const curZ = startPos.z + (targetPos.z - startPos.z) * ease;
          const lift = Math.sin(moveProgress * Math.PI) * 1.35; // 3D Y elevation

          currentMovingPiece.mesh.position.set(curX, 0.08 + lift, curZ);

          // Subtle natural flight tilt
          const dx = targetPos.x - startPos.x;
          const dz = targetPos.z - startPos.z;
          currentMovingPiece.mesh.rotation.z = -Math.sin(moveProgress * Math.PI) * 0.12 * Math.sign(dx);
          currentMovingPiece.mesh.rotation.x = Math.sin(moveProgress * Math.PI) * 0.12 * Math.sign(dz);

          // Castling Rook simultaneous animation
          if (currentCastlePiece) {
            const cStart = sqToWorld(currentCastlePiece.from.f, currentCastlePiece.from.r);
            const cTarget = sqToWorld(currentCastlePiece.to.f, currentCastlePiece.to.r);
            const cX = cStart.x + (cTarget.x - cStart.x) * ease;
            const cZ = cStart.z + (cTarget.z - cStart.z) * ease;
            const cLift = Math.sin(moveProgress * Math.PI) * 0.85;
            currentCastlePiece.mesh.position.set(cX, 0.08 + cLift, cZ);
          }
        }
      } else if (moveIndex < activeOpening.moves.length) {
        // Start next move
        const m = activeOpening.moves[moveIndex];
        const fromSq = parseSquare(m.from);
        const toSq = parseSquare(m.to);
        const piece = boardState[fromSq.f][fromSq.r];
        const mesh = pieceMeshes[fromSq.f][fromSq.r];

        boardState[fromSq.f][fromSq.r] = null;
        pieceMeshes[fromSq.f][fromSq.r] = null;
        currentMovingPiece = { piece, mesh, from: fromSq, to: toSq };
        moveProgress = 0.0;

        if (m.castle) {
          const cFrom = parseSquare(m.castle.from);
          const cTo = parseSquare(m.castle.to);
          const cPiece = boardState[cFrom.f][cFrom.r];
          const cMesh = pieceMeshes[cFrom.f][cFrom.r];
          boardState[cFrom.f][cFrom.r] = null;
          pieceMeshes[cFrom.f][cFrom.r] = null;
          currentCastlePiece = { piece: cPiece, mesh: cMesh, from: cFrom, to: cTo };
        }

        highlightSquares();
      }

      // Camera Orbit Animation (like endgame --rotate)
      if (perspective === '2d') {
        camera.position.set(0, 13.0, 0.001);
        camera.lookAt(0, 0, 0);
      } else if (shouldRotate) {
        orbitAngle += dt * 0.12 * speed;
        const camDist = 12.8;
        const camHeight = 8.8 + Math.sin(orbitAngle * 0.4) * 1.2;
        camera.position.set(
          Math.sin(orbitAngle) * camDist,
          camHeight,
          Math.cos(orbitAngle) * camDist
        );
        camera.lookAt(0, 0.4, 0);
      } else {
        // Fixed 3D View from White perspective
        camera.position.set(4.0, 8.8, 11.5);
        camera.lookAt(0, 0.4, 0);
      }

      // Render 3D WebGL scene
      renderer.render(scene, camera);

      // Render 2D HUD Overlay (ECO badge, title, commentary, notation ribbon, and 3D anchored coordinates)
      if (hudCtx) {
        const curW = hudCanvas.width;
        const curH = hudCanvas.height;
        hudCtx.clearRect(0, 0, curW, curH);

        // 3D Perspective Coordinates along board rims
        if (showCoords) {
          hudCtx.save();
          hudCtx.font = '700 13px "JetBrains Mono", monospace';
          hudCtx.textAlign = 'center';
          hudCtx.textBaseline = 'middle';
          hudCtx.fillStyle = theme.coordColor;

          const projV = new THREE.Vector3();

          // File letters (a-h) along South and North rims
          for (let f = 0; f < 8; f++) {
            const letter = String.fromCharCode(97 + f);
            const worldPos = sqToWorld(f, 0);

            // South rim coordinate
            projV.set(worldPos.x, 0.14, 4.45);
            projV.project(camera);
            if (projV.z < 1) {
              const sx = (projV.x * 0.5 + 0.5) * curW;
              const sy = (-projV.y * 0.5 + 0.5) * curH;
              hudCtx.fillText(letter, sx, sy);
            }

            // North rim coordinate
            projV.set(worldPos.x, 0.14, -4.45);
            projV.project(camera);
            if (projV.z < 1) {
              const sx = (projV.x * 0.5 + 0.5) * curW;
              const sy = (-projV.y * 0.5 + 0.5) * curH;
              hudCtx.fillText(letter, sx, sy);
            }
          }

          // Rank numbers (1-8) along West and East rims
          for (let r = 0; r < 8; r++) {
            const num = String(r + 1);
            const worldPos = sqToWorld(0, r);

            // West rim coordinate
            projV.set(-4.45, 0.14, worldPos.z);
            projV.project(camera);
            if (projV.z < 1) {
              const sx = (projV.x * 0.5 + 0.5) * curW;
              const sy = (-projV.y * 0.5 + 0.5) * curH;
              hudCtx.fillText(num, sx, sy);
            }

            // East rim coordinate
            projV.set(4.45, 0.14, worldPos.z);
            projV.project(camera);
            if (projV.z < 1) {
              const sx = (projV.x * 0.5 + 0.5) * curW;
              const sy = (-projV.y * 0.5 + 0.5) * curH;
              hudCtx.fillText(num, sx, sy);
            }
          }
          hudCtx.restore();
        }

        // Top Header Banner
        hudCtx.save();
        const padX = 36;
        const ecoY = 36;
        hudCtx.textAlign = 'left';

        // ECO Badge
        hudCtx.font = '700 13px "JetBrains Mono", monospace';
        const ecoW = hudCtx.measureText(activeOpening.eco).width + 16;
        hudCtx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        hudCtx.strokeStyle = theme.accent;
        hudCtx.lineWidth = 1.5;
        hudCtx.beginPath();
        roundRect(hudCtx, padX, ecoY - 14, ecoW, 26, 6);
        hudCtx.fill();
        hudCtx.stroke();

        hudCtx.fillStyle = theme.accent;
        hudCtx.fillText(activeOpening.eco, padX + 8, ecoY + 4);

        // Opening Title
        hudCtx.fillStyle = '#f8fafc';
        hudCtx.font = '800 22px system-ui, -apple-system, sans-serif';
        hudCtx.fillText(activeOpening.name, padX + ecoW + 14, ecoY + 4);

        // Strategy Subtitle
        hudCtx.fillStyle = '#94a3b8';
        hudCtx.font = '500 13px system-ui, -apple-system, sans-serif';
        hudCtx.fillText(activeOpening.description, padX, ecoY + 28);

        // Active Player Turn Indicator
        hudCtx.textAlign = 'right';
        const moveCount = movesPlayed.length;
        const isWhiteTurn = moveCount % 2 === 0;
        hudCtx.fillStyle = isWhiteTurn ? '#f8fafc' : '#94a3b8';
        hudCtx.font = '700 13px system-ui, sans-serif';
        hudCtx.fillText(isWhiteTurn ? '⚪ White to move' : '⚫ Black to move', curW - padX, ecoY + 4);

        // Bottom Move Notation Ribbon (PGN: 1. e4 c5  2. Nf3 ...)
        const bottomY = curH - 34;
        hudCtx.textAlign = 'left';
        hudCtx.font = '600 13px "JetBrains Mono", monospace';
        const historyStr = movesPlayed.join('  ');
        if (historyStr) {
          hudCtx.fillStyle = theme.accent;
          hudCtx.fillText('PGN: ', padX, bottomY);
          const pgnW = hudCtx.measureText('PGN: ').width;
          hudCtx.fillStyle = '#cbd5e1';
          hudCtx.fillText(historyStr, padX + pgnW, bottomY);
        }

        hudCtx.restore();
      }
    }
  };
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
