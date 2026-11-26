// Auto-generated & mathematically verified by scripts/generate_classic_mates.py (python-chess)
// Total: 100 verified classic checkmates (50 White to mate, 50 Black to mate)

export const CLASSIC_MATES = [
  {
    "id": "mate_01_a",
    "motif": "Fool's Mate",
    "variant": "Classic 2-Move Trap",
    "form": "Simplest Form",
    "winner": "Black",
    "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    "matedKing": "e1",
    "moves": [
      {
        "from": "f2",
        "to": "f3",
        "san": "f3"
      },
      {
        "from": "e7",
        "to": "e5",
        "san": "e5"
      },
      {
        "from": "g2",
        "to": "g4",
        "san": "g4"
      },
      {
        "from": "d8",
        "to": "h4",
        "san": "Qh4#"
      }
    ],
    "note": "The fastest possible checkmate in chess: f3 and g4 open the fatal e1\u2013h4 diagonal."
  },
  {
    "id": "mate_01_b",
    "motif": "Fool's Mate",
    "variant": "Classic 2-Move Trap (Reversed Colors)",
    "form": "Simplest Form",
    "winner": "White",
    "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1",
    "matedKing": "e8",
    "moves": [
      {
        "from": "f7",
        "to": "f6",
        "san": "f6"
      },
      {
        "from": "e2",
        "to": "e4",
        "san": "e4"
      },
      {
        "from": "g7",
        "to": "g5",
        "san": "g5"
      },
      {
        "from": "d1",
        "to": "h5",
        "san": "Qh5#"
      }
    ],
    "note": "The fastest possible checkmate in chess: f3 and g4 open the fatal e1\u2013h4 diagonal."
  },
  {
    "id": "mate_02_a",
    "motif": "Fool's Mate",
    "variant": "Bird's Opening Slip",
    "form": "In-Situ",
    "winner": "Black",
    "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    "matedKing": "e1",
    "moves": [
      {
        "from": "f2",
        "to": "f4",
        "san": "f4"
      },
      {
        "from": "e7",
        "to": "e5",
        "san": "e5"
      },
      {
        "from": "g2",
        "to": "g3",
        "san": "g3"
      },
      {
        "from": "e5",
        "to": "f4",
        "san": "exf4"
      },
      {
        "from": "g3",
        "to": "f4",
        "san": "gxf4"
      },
      {
        "from": "d8",
        "to": "h4",
        "san": "Qh4#"
      }
    ],
    "note": "In-situ Fool's Mate arising when White weakens the kingside diagonal with f4 and g3."
  },
  {
    "id": "mate_02_b",
    "motif": "Fool's Mate",
    "variant": "Bird's Opening Slip (Reversed Colors)",
    "form": "In-Situ",
    "winner": "White",
    "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1",
    "matedKing": "e8",
    "moves": [
      {
        "from": "f7",
        "to": "f5",
        "san": "f5"
      },
      {
        "from": "e2",
        "to": "e4",
        "san": "e4"
      },
      {
        "from": "g7",
        "to": "g6",
        "san": "g6"
      },
      {
        "from": "e4",
        "to": "f5",
        "san": "exf5"
      },
      {
        "from": "g6",
        "to": "f5",
        "san": "gxf5"
      },
      {
        "from": "d1",
        "to": "h5",
        "san": "Qh5#"
      }
    ],
    "note": "In-situ Fool's Mate arising when White weakens the kingside diagonal with f4 and g3."
  },
  {
    "id": "mate_03_a",
    "motif": "Scholar's Mate",
    "variant": "Classic 4-Move Attack",
    "form": "Simplest Form",
    "winner": "White",
    "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    "matedKing": "e8",
    "moves": [
      {
        "from": "e2",
        "to": "e4",
        "san": "e4"
      },
      {
        "from": "e7",
        "to": "e5",
        "san": "e5"
      },
      {
        "from": "f1",
        "to": "c4",
        "san": "Bc4"
      },
      {
        "from": "b8",
        "to": "c6",
        "san": "Nc6"
      },
      {
        "from": "d1",
        "to": "h5",
        "san": "Qh5"
      },
      {
        "from": "g8",
        "to": "f6",
        "san": "Nf6"
      },
      {
        "from": "h5",
        "to": "f7",
        "san": "Qxf7#"
      }
    ],
    "note": "Queen and bishop converge on the undefended f7 square on move 4."
  },
  {
    "id": "mate_03_b",
    "motif": "Scholar's Mate",
    "variant": "Classic 4-Move Attack (Reversed Colors)",
    "form": "Simplest Form",
    "winner": "Black",
    "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1",
    "matedKing": "e1",
    "moves": [
      {
        "from": "e7",
        "to": "e5",
        "san": "e5"
      },
      {
        "from": "e2",
        "to": "e4",
        "san": "e4"
      },
      {
        "from": "f8",
        "to": "c5",
        "san": "Bc5"
      },
      {
        "from": "b1",
        "to": "c3",
        "san": "Nc3"
      },
      {
        "from": "d8",
        "to": "h4",
        "san": "Qh4"
      },
      {
        "from": "g1",
        "to": "f3",
        "san": "Nf3"
      },
      {
        "from": "h4",
        "to": "f2",
        "san": "Qxf2#"
      }
    ],
    "note": "Queen and bishop converge on the undefended f7 square on move 4."
  },
  {
    "id": "mate_04_a",
    "motif": "Scholar's Mate",
    "variant": "Qf3 Battery Line",
    "form": "In-Situ",
    "winner": "White",
    "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    "matedKing": "e8",
    "moves": [
      {
        "from": "e2",
        "to": "e4",
        "san": "e4"
      },
      {
        "from": "e7",
        "to": "e5",
        "san": "e5"
      },
      {
        "from": "d1",
        "to": "f3",
        "san": "Qf3"
      },
      {
        "from": "d7",
        "to": "d6",
        "san": "d6"
      },
      {
        "from": "f1",
        "to": "c4",
        "san": "Bc4"
      },
      {
        "from": "b8",
        "to": "c6",
        "san": "Nc6"
      },
      {
        "from": "f3",
        "to": "f7",
        "san": "Qxf7#"
      }
    ],
    "note": "The Qf3 + Bc4 battery strikes f7 when Black neglects kingside defense."
  },
  {
    "id": "mate_04_b",
    "motif": "Scholar's Mate",
    "variant": "Qf3 Battery Line (Reversed Colors)",
    "form": "In-Situ",
    "winner": "Black",
    "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1",
    "matedKing": "e1",
    "moves": [
      {
        "from": "e7",
        "to": "e5",
        "san": "e5"
      },
      {
        "from": "e2",
        "to": "e4",
        "san": "e4"
      },
      {
        "from": "d8",
        "to": "f6",
        "san": "Qf6"
      },
      {
        "from": "d2",
        "to": "d3",
        "san": "d3"
      },
      {
        "from": "f8",
        "to": "c5",
        "san": "Bc5"
      },
      {
        "from": "b1",
        "to": "c3",
        "san": "Nc3"
      },
      {
        "from": "f6",
        "to": "f2",
        "san": "Qxf2#"
      }
    ],
    "note": "The Qf3 + Bc4 battery strikes f7 when Black neglects kingside defense."
  },
  {
    "id": "mate_05_a",
    "motif": "Ladder Mate",
    "variant": "Two-Rook Lawnmower",
    "form": "Simplest Form",
    "winner": "White",
    "fen": "4k3/8/R7/1R6/8/8/8/4K3 w - - 0 1",
    "matedKing": "d8",
    "moves": [
      {
        "from": "b5",
        "to": "b7",
        "san": "Rb7"
      },
      {
        "from": "e8",
        "to": "d8",
        "san": "Kd8"
      },
      {
        "from": "a6",
        "to": "a8",
        "san": "Ra8#"
      }
    ],
    "note": "Alternating rook checks herd the lone king straight to the back rank."
  },
  {
    "id": "mate_05_b",
    "motif": "Ladder Mate",
    "variant": "Two-Rook Lawnmower (Reversed Colors)",
    "form": "Simplest Form",
    "winner": "Black",
    "fen": "4k3/8/8/8/1r6/r7/8/4K3 b - - 0 1",
    "matedKing": "d1",
    "moves": [
      {
        "from": "b4",
        "to": "b2",
        "san": "Rb2"
      },
      {
        "from": "e1",
        "to": "d1",
        "san": "Kd1"
      },
      {
        "from": "a3",
        "to": "a1",
        "san": "Ra1#"
      }
    ],
    "note": "Alternating rook checks herd the lone king straight to the back rank."
  },
  {
    "id": "mate_06_a",
    "motif": "Ladder Mate",
    "variant": "Queen & Rook Endgame",
    "form": "In-Situ",
    "winner": "White",
    "fen": "4k3/8/2Q5/R7/8/6P1/5P1P/6K1 w - - 0 1",
    "matedKing": "f8",
    "moves": [
      {
        "from": "a5",
        "to": "a7",
        "san": "Ra7+"
      },
      {
        "from": "e8",
        "to": "f8",
        "san": "Kf8"
      },
      {
        "from": "c6",
        "to": "c8",
        "san": "Qc8#"
      }
    ],
    "note": "Queen and rook coordinate in an endgame to complete the ladder."
  },
  {
    "id": "mate_06_b",
    "motif": "Ladder Mate",
    "variant": "Queen & Rook Endgame (Reversed Colors)",
    "form": "In-Situ",
    "winner": "Black",
    "fen": "6k1/5p1p/6p1/8/r7/2q5/8/4K3 b - - 0 1",
    "matedKing": "f1",
    "moves": [
      {
        "from": "a4",
        "to": "a2",
        "san": "Ra2+"
      },
      {
        "from": "e1",
        "to": "f1",
        "san": "Kf1"
      },
      {
        "from": "c3",
        "to": "c1",
        "san": "Qc1#"
      }
    ],
    "note": "Queen and rook coordinate in an endgame to complete the ladder."
  },
  {
    "id": "mate_07_a",
    "motif": "Back-Rank Mate",
    "variant": "Classic Pawn Prison",
    "form": "Simplest Form",
    "winner": "White",
    "fen": "6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1",
    "matedKing": "g8",
    "moves": [
      {
        "from": "d1",
        "to": "d8",
        "san": "Rd8#"
      }
    ],
    "note": "Without an escape square ('luft'), the king is trapped behind its own pawns."
  },
  {
    "id": "mate_07_b",
    "motif": "Back-Rank Mate",
    "variant": "Classic Pawn Prison (Reversed Colors)",
    "form": "Simplest Form",
    "winner": "Black",
    "fen": "3r2k1/5ppp/8/8/8/8/5PPP/6K1 b - - 0 1",
    "matedKing": "g1",
    "moves": [
      {
        "from": "d8",
        "to": "d1",
        "san": "Rd1#"
      }
    ],
    "note": "Without an escape square ('luft'), the king is trapped behind its own pawns."
  },
  {
    "id": "mate_08_a",
    "motif": "Back-Rank Mate",
    "variant": "Queen Deflection Sacrifice",
    "form": "In-Situ",
    "winner": "White",
    "fen": "r2r2k1/5ppp/1p6/8/8/8/3Q1PPP/3R2K1 w - - 0 1",
    "matedKing": "g8",
    "moves": [
      {
        "from": "d2",
        "to": "d8",
        "san": "Qxd8+"
      },
      {
        "from": "a8",
        "to": "d8",
        "san": "Rxd8"
      },
      {
        "from": "d1",
        "to": "d8",
        "san": "Rxd8#"
      }
    ],
    "note": "Qxd8+! deflects the back-rank defender so Rxd8# finishes the game."
  },
  {
    "id": "mate_08_b",
    "motif": "Back-Rank Mate",
    "variant": "Queen Deflection Sacrifice (Reversed Colors)",
    "form": "In-Situ",
    "winner": "Black",
    "fen": "3r2k1/3q1ppp/8/8/8/1P6/5PPP/R2R2K1 b - - 0 1",
    "matedKing": "g1",
    "moves": [
      {
        "from": "d7",
        "to": "d1",
        "san": "Qxd1+"
      },
      {
        "from": "a1",
        "to": "d1",
        "san": "Rxd1"
      },
      {
        "from": "d8",
        "to": "d1",
        "san": "Rxd1#"
      }
    ],
    "note": "Qxd8+! deflects the back-rank defender so Rxd8# finishes the game."
  },
  {
    "id": "mate_09_a",
    "motif": "Anastasia's Mate",
    "variant": "Knight & Rook h-File",
    "form": "Simplest Form",
    "winner": "White",
    "fen": "8/4N1pk/8/8/8/8/8/2K1R3 w - - 0 1",
    "matedKing": "h7",
    "moves": [
      {
        "from": "e1",
        "to": "h1",
        "san": "Rh1#"
      }
    ],
    "note": "The knight on e7 seals g8 and g6 while the rook delivers Anastasia's Mate down the h-file."
  },
  {
    "id": "mate_09_b",
    "motif": "Anastasia's Mate",
    "variant": "Knight & Rook h-File (Reversed Colors)",
    "form": "Simplest Form",
    "winner": "Black",
    "fen": "2k1r3/8/8/8/8/8/4n1PK/8 b - - 0 1",
    "matedKing": "h2",
    "moves": [
      {
        "from": "e8",
        "to": "h8",
        "san": "Rh8#"
      }
    ],
    "note": "The knight on e7 seals g8 and g6 while the rook delivers Anastasia's Mate down the h-file."
  },
  {
    "id": "mate_10_a",
    "motif": "Anastasia's Mate",
    "variant": "Queen Sac Qxh7+",
    "form": "In-Situ",
    "winner": "White",
    "fen": "5rk1/4Nppp/8/7Q/8/4R3/5PPP/6K1 w - - 0 1",
    "matedKing": "h7",
    "moves": [
      {
        "from": "h5",
        "to": "h7",
        "san": "Qxh7+"
      },
      {
        "from": "g8",
        "to": "h7",
        "san": "Kxh7"
      },
      {
        "from": "e3",
        "to": "h3",
        "san": "Rh3#"
      }
    ],
    "note": "Qxh7+! drags the king onto the h-file for the textbook Anastasia rook mate."
  },
  {
    "id": "mate_10_b",
    "motif": "Anastasia's Mate",
    "variant": "Queen Sac Qxh7+ (Reversed Colors)",
    "form": "In-Situ",
    "winner": "Black",
    "fen": "6k1/5ppp/4r3/8/7q/8/4nPPP/5RK1 b - - 0 1",
    "matedKing": "h2",
    "moves": [
      {
        "from": "h4",
        "to": "h2",
        "san": "Qxh2+"
      },
      {
        "from": "g1",
        "to": "h2",
        "san": "Kxh2"
      },
      {
        "from": "e6",
        "to": "h6",
        "san": "Rh6#"
      }
    ],
    "note": "Qxh7+! drags the king onto the h-file for the textbook Anastasia rook mate."
  },
  {
    "id": "mate_11_a",
    "motif": "Smothered Mate",
    "variant": "Corner Knight Finish",
    "form": "Simplest Form",
    "winner": "White",
    "fen": "6rk/6pp/8/6N1/8/8/8/6K1 w - - 0 1",
    "matedKing": "h8",
    "moves": [
      {
        "from": "g5",
        "to": "f7",
        "san": "Nf7#"
      }
    ],
    "note": "Completely hemmed in by its own pieces, the king falls to a single knight."
  },
  {
    "id": "mate_11_b",
    "motif": "Smothered Mate",
    "variant": "Corner Knight Finish (Reversed Colors)",
    "form": "Simplest Form",
    "winner": "Black",
    "fen": "6k1/8/8/8/6n1/8/6PP/6RK b - - 0 1",
    "matedKing": "h1",
    "moves": [
      {
        "from": "g4",
        "to": "f2",
        "san": "Nf2#"
      }
    ],
    "note": "Completely hemmed in by its own pieces, the king falls to a single knight."
  },
  {
    "id": "mate_12_a",
    "motif": "Smothered Mate",
    "variant": "Philidor's Legacy",
    "form": "In-Situ",
    "winner": "White",
    "fen": "r4r1k/6pp/7N/8/2Q5/8/5PPP/6K1 w - - 0 1",
    "matedKing": "h8",
    "moves": [
      {
        "from": "c4",
        "to": "g8",
        "san": "Qg8+"
      },
      {
        "from": "f8",
        "to": "g8",
        "san": "Rxg8"
      },
      {
        "from": "h6",
        "to": "f7",
        "san": "Nf7#"
      }
    ],
    "note": "The iconic queen sacrifice Qg8+! forces Rxg8, sealing the king for Nf7#."
  },
  {
    "id": "mate_12_b",
    "motif": "Smothered Mate",
    "variant": "Philidor's Legacy (Reversed Colors)",
    "form": "In-Situ",
    "winner": "Black",
    "fen": "6k1/5ppp/8/2q5/8/7n/6PP/R4R1K b - - 0 1",
    "matedKing": "h1",
    "moves": [
      {
        "from": "c5",
        "to": "g1",
        "san": "Qg1+"
      },
      {
        "from": "f1",
        "to": "g1",
        "san": "Rxg1"
      },
      {
        "from": "h3",
        "to": "f2",
        "san": "Nf2#"
      }
    ],
    "note": "The iconic queen sacrifice Qg8+! forces Rxg8, sealing the king for Nf7#."
  },
  {
    "id": "mate_13_a",
    "motif": "Arabian Mate",
    "variant": "Rook & Knight Corner",
    "form": "Simplest Form",
    "winner": "White",
    "fen": "7k/8/5N2/8/8/8/7R/6K1 w - - 0 1",
    "matedKing": "h8",
    "moves": [
      {
        "from": "h2",
        "to": "h7",
        "san": "Rh7#"
      }
    ],
    "note": "One of the oldest documented mates: knight on f6 guards g8 and supports Rh7#."
  },
  {
    "id": "mate_13_b",
    "motif": "Arabian Mate",
    "variant": "Rook & Knight Corner (Reversed Colors)",
    "form": "Simplest Form",
    "winner": "Black",
    "fen": "6k1/7r/8/8/8/5n2/8/7K b - - 0 1",
    "matedKing": "h1",
    "moves": [
      {
        "from": "h7",
        "to": "h2",
        "san": "Rh2#"
      }
    ],
    "note": "One of the oldest documented mates: knight on f6 guards g8 and supports Rh7#."
  },
  {
    "id": "mate_14_a",
    "motif": "Arabian Mate",
    "variant": "In-Situ h7 Corner Trap",
    "form": "In-Situ",
    "winner": "White",
    "fen": "5r1k/2p5/5N2/8/8/7R/5PPP/6K1 w - - 0 1",
    "matedKing": "h8",
    "moves": [
      {
        "from": "h3",
        "to": "h7",
        "san": "Rh7#"
      }
    ],
    "note": "With the knight anchored on f6, the rook crashes into h7 for Arabian Mate."
  },
  {
    "id": "mate_14_b",
    "motif": "Arabian Mate",
    "variant": "In-Situ h7 Corner Trap (Reversed Colors)",
    "form": "In-Situ",
    "winner": "Black",
    "fen": "6k1/5ppp/7r/8/8/5n2/2P5/5R1K b - - 0 1",
    "matedKing": "h1",
    "moves": [
      {
        "from": "h6",
        "to": "h2",
        "san": "Rh2#"
      }
    ],
    "note": "With the knight anchored on f6, the rook crashes into h7 for Arabian Mate."
  },
  {
    "id": "mate_15_a",
    "motif": "Boden's Mate",
    "variant": "Crisscrossing Bishops",
    "form": "Simplest Form",
    "winner": "White",
    "fen": "2kr4/3p4/8/8/5B2/8/8/5B1K w - - 0 1",
    "matedKing": "c8",
    "moves": [
      {
        "from": "f1",
        "to": "a6",
        "san": "Ba6#"
      }
    ],
    "note": "Two bishops carve intersecting diagonals across the queenside castled king."
  },
  {
    "id": "mate_15_b",
    "motif": "Boden's Mate",
    "variant": "Crisscrossing Bishops (Reversed Colors)",
    "form": "Simplest Form",
    "winner": "Black",
    "fen": "5b1k/8/8/5b2/8/8/3P4/2KR4 b - - 0 1",
    "matedKing": "c1",
    "moves": [
      {
        "from": "f8",
        "to": "a3",
        "san": "Ba3#"
      }
    ],
    "note": "Two bishops carve intersecting diagonals across the queenside castled king."
  },
  {
    "id": "mate_16_a",
    "motif": "Boden's Mate",
    "variant": "Queen Sac Qxc6+",
    "form": "In-Situ",
    "winner": "White",
    "fen": "2kr3r/pp1p1ppp/2n5/8/5B2/2Q5/PPP2PPP/5BK1 w - - 0 1",
    "matedKing": "c8",
    "moves": [
      {
        "from": "c3",
        "to": "c6",
        "san": "Qxc6+"
      },
      {
        "from": "b7",
        "to": "c6",
        "san": "bxc6"
      },
      {
        "from": "f1",
        "to": "a6",
        "san": "Ba6#"
      }
    ],
    "note": "Qxc6+! rips open the a6\u2013c8 diagonal so the two bishops crisscross for Boden's Mate."
  },
  {
    "id": "mate_16_b",
    "motif": "Boden's Mate",
    "variant": "Queen Sac Qxc6+ (Reversed Colors)",
    "form": "In-Situ",
    "winner": "Black",
    "fen": "5bk1/ppp2ppp/2q5/5b2/8/2N5/PP1P1PPP/2KR3R b - - 0 1",
    "matedKing": "c1",
    "moves": [
      {
        "from": "c6",
        "to": "c3",
        "san": "Qxc3+"
      },
      {
        "from": "b2",
        "to": "c3",
        "san": "bxc3"
      },
      {
        "from": "f8",
        "to": "a3",
        "san": "Ba3#"
      }
    ],
    "note": "Qxc6+! rips open the a6\u2013c8 diagonal so the two bishops crisscross for Boden's Mate."
  },
  {
    "id": "mate_17_a",
    "motif": "Opera Mate",
    "variant": "Bishop-Supported Back Rank",
    "form": "Simplest Form",
    "winner": "White",
    "fen": "4k3/5p2/8/6B1/8/8/8/3R2K1 w - - 0 1",
    "matedKing": "e8",
    "moves": [
      {
        "from": "d1",
        "to": "d8",
        "san": "Rd8#"
      }
    ],
    "note": "A rook delivers back-rank mate protected by a bishop while a pawn blocks f7."
  },
  {
    "id": "mate_17_b",
    "motif": "Opera Mate",
    "variant": "Bishop-Supported Back Rank (Reversed Colors)",
    "form": "Simplest Form",
    "winner": "Black",
    "fen": "3r2k1/8/8/8/6b1/8/5P2/4K3 b - - 0 1",
    "matedKing": "e1",
    "moves": [
      {
        "from": "d8",
        "to": "d1",
        "san": "Rd1#"
      }
    ],
    "note": "A rook delivers back-rank mate protected by a bishop while a pawn blocks f7."
  },
  {
    "id": "mate_18_a",
    "motif": "Opera Mate",
    "variant": "Morphy's Opera Game (1858)",
    "form": "In-Situ",
    "winner": "White",
    "fen": "4kb1r/p2n1ppp/4q3/4p1B1/4P3/1Q6/PPP2PPP/2KR4 w k - 0 16",
    "matedKing": "e8",
    "moves": [
      {
        "from": "b3",
        "to": "b8",
        "san": "Qb8+"
      },
      {
        "from": "d7",
        "to": "b8",
        "san": "Nxb8"
      },
      {
        "from": "d1",
        "to": "d8",
        "san": "Rd8#"
      }
    ],
    "note": "Paul Morphy's immortal 1858 Paris Opera finish: 16.Qb8+! Nxb8 17.Rd8#."
  },
  {
    "id": "mate_18_b",
    "motif": "Opera Mate",
    "variant": "Morphy's Opera Game (1858) (Reversed Colors)",
    "form": "In-Situ",
    "winner": "Black",
    "fen": "2kr4/ppp2ppp/1q6/4p3/4P1b1/4Q3/P2N1PPP/4KB1R b K - 0 16",
    "matedKing": "e1",
    "moves": [
      {
        "from": "b6",
        "to": "b1",
        "san": "Qb1+"
      },
      {
        "from": "d2",
        "to": "b1",
        "san": "Nxb1"
      },
      {
        "from": "d8",
        "to": "d1",
        "san": "Rd1#"
      }
    ],
    "note": "Paul Morphy's immortal 1858 Paris Opera finish: 16.Qb8+! Nxb8 17.Rd8#."
  },
  {
    "id": "mate_19_a",
    "motif": "Hook Mate",
    "variant": "Rook, Knight & Pawn",
    "form": "Simplest Form",
    "winner": "White",
    "fen": "8/R7/4pk2/4N1p1/3P4/8/8/6K1 w - - 0 1",
    "matedKing": "f6",
    "moves": [
      {
        "from": "a7",
        "to": "f7",
        "san": "Rf7#"
      }
    ],
    "note": "Rook, knight, and pawn form the classic Hook Mate around the central king."
  },
  {
    "id": "mate_19_b",
    "motif": "Hook Mate",
    "variant": "Rook, Knight & Pawn (Reversed Colors)",
    "form": "Simplest Form",
    "winner": "Black",
    "fen": "6k1/8/8/3p4/4n1P1/4PK2/r7/8 b - - 0 1",
    "matedKing": "f3",
    "moves": [
      {
        "from": "a2",
        "to": "f2",
        "san": "Rf2#"
      }
    ],
    "note": "Rook, knight, and pawn form the classic Hook Mate around the central king."
  },
  {
    "id": "mate_20_a",
    "motif": "Hook Mate",
    "variant": "In-Situ Hook Trap",
    "form": "In-Situ",
    "winner": "White",
    "fen": "r7/R6p/4pk2/4N1p1/3P4/8/PPP3PP/6K1 w - - 0 1",
    "matedKing": "f6",
    "moves": [
      {
        "from": "a7",
        "to": "f7",
        "san": "Rf7#"
      }
    ],
    "note": "Supported by the d4 pawn and e5 knight, Rf7# snaps the Hook Mate shut."
  },
  {
    "id": "mate_20_b",
    "motif": "Hook Mate",
    "variant": "In-Situ Hook Trap (Reversed Colors)",
    "form": "In-Situ",
    "winner": "Black",
    "fen": "6k1/ppp3pp/8/3p4/4n1P1/4PK2/r6P/R7 b - - 0 1",
    "matedKing": "f3",
    "moves": [
      {
        "from": "a2",
        "to": "f2",
        "san": "Rf2#"
      }
    ],
    "note": "Supported by the d4 pawn and e5 knight, Rf7# snaps the Hook Mate shut."
  },
  {
    "id": "mate_21_a",
    "motif": "Epaulette Mate",
    "variant": "King Flanked by Rooks",
    "form": "Simplest Form",
    "winner": "White",
    "fen": "3rkr2/8/8/8/8/8/4Q3/4K3 w - - 0 1",
    "matedKing": "e8",
    "moves": [
      {
        "from": "e2",
        "to": "e6",
        "san": "Qe6#"
      }
    ],
    "note": "The king's own rooks sit on both shoulders like military epaulettes."
  },
  {
    "id": "mate_21_b",
    "motif": "Epaulette Mate",
    "variant": "King Flanked by Rooks (Reversed Colors)",
    "form": "Simplest Form",
    "winner": "Black",
    "fen": "4k3/4q3/8/8/8/8/8/3RKR2 b - - 0 1",
    "matedKing": "e1",
    "moves": [
      {
        "from": "e7",
        "to": "e3",
        "san": "Qe3#"
      }
    ],
    "note": "The king's own rooks sit on both shoulders like military epaulettes."
  },
  {
    "id": "mate_22_a",
    "motif": "Epaulette Mate",
    "variant": "In-Situ Central Epaulette",
    "form": "In-Situ",
    "winner": "White",
    "fen": "3rkr2/pp4pp/8/8/8/2B5/PPP1QPPP/6K1 w - - 0 1",
    "matedKing": "e8",
    "moves": [
      {
        "from": "e2",
        "to": "e6",
        "san": "Qe6#"
      }
    ],
    "note": "Queen drops into e6, trapping the king between its own two rooks."
  },
  {
    "id": "mate_22_b",
    "motif": "Epaulette Mate",
    "variant": "In-Situ Central Epaulette (Reversed Colors)",
    "form": "In-Situ",
    "winner": "Black",
    "fen": "6k1/ppp1qppp/2b5/8/8/8/PP4PP/3RKR2 b - - 0 1",
    "matedKing": "e1",
    "moves": [
      {
        "from": "e7",
        "to": "e3",
        "san": "Qe3#"
      }
    ],
    "note": "Queen drops into e6, trapping the king between its own two rooks."
  },
  {
    "id": "mate_23_a",
    "motif": "Dovetail Mate",
    "variant": "Diagonal Queen Kiss",
    "form": "Simplest Form",
    "winner": "White",
    "fen": "8/8/4r3/4kp2/8/3QP3/8/6K1 w - - 0 1",
    "matedKing": "e5",
    "moves": [
      {
        "from": "d3",
        "to": "d4",
        "san": "Qd4#"
      }
    ],
    "note": "Two friendly pieces sit behind the king like a dovetail while the queen mates diagonally."
  },
  {
    "id": "mate_23_b",
    "motif": "Dovetail Mate",
    "variant": "Diagonal Queen Kiss (Reversed Colors)",
    "form": "Simplest Form",
    "winner": "Black",
    "fen": "6k1/8/3qp3/8/4KP2/4R3/8/8 b - - 0 1",
    "matedKing": "e4",
    "moves": [
      {
        "from": "d6",
        "to": "d5",
        "san": "Qd5#"
      }
    ],
    "note": "Two friendly pieces sit behind the king like a dovetail while the queen mates diagonally."
  },
  {
    "id": "mate_24_a",
    "motif": "Dovetail Mate",
    "variant": "In-Situ Cozio Finish",
    "form": "In-Situ",
    "winner": "White",
    "fen": "r4r2/ppp3pp/4r3/4kp2/8/3QP3/PPP2PPP/6K1 w - - 0 1",
    "matedKing": "e5",
    "moves": [
      {
        "from": "d3",
        "to": "d4",
        "san": "Qd4#"
      }
    ],
    "note": "Protected by the e3 pawn, Qd4# seals the textbook Dovetail Mate."
  },
  {
    "id": "mate_24_b",
    "motif": "Dovetail Mate",
    "variant": "In-Situ Cozio Finish (Reversed Colors)",
    "form": "In-Situ",
    "winner": "Black",
    "fen": "6k1/ppp2ppp/3qp3/8/4KP2/4R3/PPP3PP/R4R2 b - - 0 1",
    "matedKing": "e4",
    "moves": [
      {
        "from": "d6",
        "to": "d5",
        "san": "Qd5#"
      }
    ],
    "note": "Protected by the e3 pawn, Qd4# seals the textbook Dovetail Mate."
  },
  {
    "id": "mate_25_a",
    "motif": "Swallow's Tail Mate",
    "variant": "Diagonal Escape Blocked",
    "form": "Simplest Form",
    "winner": "White",
    "fen": "3r1r2/4k3/8/3P4/8/8/4Q3/6K1 w - - 0 1",
    "matedKing": "e7",
    "moves": [
      {
        "from": "e2",
        "to": "e6",
        "san": "Qe6#"
      }
    ],
    "note": "Two friendly pieces occupy the rear diagonals like a swallow's tail."
  },
  {
    "id": "mate_25_b",
    "motif": "Swallow's Tail Mate",
    "variant": "Diagonal Escape Blocked (Reversed Colors)",
    "form": "Simplest Form",
    "winner": "Black",
    "fen": "6k1/4q3/8/8/3p4/8/4K3/3R1R2 b - - 0 1",
    "matedKing": "e2",
    "moves": [
      {
        "from": "e7",
        "to": "e3",
        "san": "Qe3#"
      }
    ],
    "note": "Two friendly pieces occupy the rear diagonals like a swallow's tail."
  },
  {
    "id": "mate_26_a",
    "motif": "Swallow's Tail Mate",
    "variant": "In-Situ Queen Strike",
    "form": "In-Situ",
    "winner": "White",
    "fen": "3r1r2/pp2k1pp/8/3P1P2/8/8/PP2Q1PP/6K1 w - - 0 1",
    "matedKing": "e7",
    "moves": [
      {
        "from": "e2",
        "to": "e6",
        "san": "Qe6#"
      }
    ],
    "note": "Protected by d5 and f5, Qe6# completes the classic Swallow's Tail."
  },
  {
    "id": "mate_26_b",
    "motif": "Swallow's Tail Mate",
    "variant": "In-Situ Queen Strike (Reversed Colors)",
    "form": "In-Situ",
    "winner": "Black",
    "fen": "6k1/pp2q1pp/8/8/3p1p2/8/PP2K1PP/3R1R2 b - - 0 1",
    "matedKing": "e2",
    "moves": [
      {
        "from": "e7",
        "to": "e3",
        "san": "Qe3#"
      }
    ],
    "note": "Protected by d5 and f5, Qe6# completes the classic Swallow's Tail."
  },
  {
    "id": "mate_27_a",
    "motif": "Damiano's Mate",
    "variant": "Pawn & Queen Corner",
    "form": "Simplest Form",
    "winner": "White",
    "fen": "5rk1/5pp1/6P1/8/8/8/7Q/6K1 w - - 0 1",
    "matedKing": "g8",
    "moves": [
      {
        "from": "h2",
        "to": "h7",
        "san": "Qh7#"
      }
    ],
    "note": "A pawn on g6 supports the queen crashing into h7 for Damiano's Mate."
  },
  {
    "id": "mate_27_b",
    "motif": "Damiano's Mate",
    "variant": "Pawn & Queen Corner (Reversed Colors)",
    "form": "Simplest Form",
    "winner": "Black",
    "fen": "6k1/7q/8/8/8/6p1/5PP1/5RK1 b - - 0 1",
    "matedKing": "g1",
    "moves": [
      {
        "from": "h7",
        "to": "h2",
        "san": "Qh2#"
      }
    ],
    "note": "A pawn on g6 supports the queen crashing into h7 for Damiano's Mate."
  },
  {
    "id": "mate_28_a",
    "motif": "Damiano's Mate",
    "variant": "Classic Rook Sac on h8",
    "form": "In-Situ",
    "winner": "White",
    "fen": "5rk1/5pp1/6P1/8/8/6Q1/5PP1/6KR w - - 0 1",
    "matedKing": "g8",
    "moves": [
      {
        "from": "h1",
        "to": "h8",
        "san": "Rh8+"
      },
      {
        "from": "g8",
        "to": "h8",
        "san": "Kxh8"
      },
      {
        "from": "g3",
        "to": "h3",
        "san": "Qh3+"
      },
      {
        "from": "h8",
        "to": "g8",
        "san": "Kg8"
      },
      {
        "from": "h3",
        "to": "h7",
        "san": "Qh7#"
      }
    ],
    "note": "Rh8+! clears the corner so the queen swings to h3 and delivers Damiano's Mate on h7!"
  },
  {
    "id": "mate_28_b",
    "motif": "Damiano's Mate",
    "variant": "Classic Rook Sac on h8 (Reversed Colors)",
    "form": "In-Situ",
    "winner": "Black",
    "fen": "6kr/5pp1/6q1/8/8/6p1/5PP1/5RK1 b - - 0 1",
    "matedKing": "g1",
    "moves": [
      {
        "from": "h8",
        "to": "h1",
        "san": "Rh1+"
      },
      {
        "from": "g1",
        "to": "h1",
        "san": "Kxh1"
      },
      {
        "from": "g6",
        "to": "h6",
        "san": "Qh6+"
      },
      {
        "from": "h1",
        "to": "g1",
        "san": "Kg1"
      },
      {
        "from": "h6",
        "to": "h2",
        "san": "Qh2#"
      }
    ],
    "note": "Rh8+! clears the corner so the queen swings to h3 and delivers Damiano's Mate on h7!"
  },
  {
    "id": "mate_29_a",
    "motif": "Lolli's Mate",
    "variant": "f6 Pawn & Queen on g7",
    "form": "Simplest Form",
    "winner": "White",
    "fen": "6k1/5p1p/5Pp1/7Q/8/8/8/6K1 w - - 0 1",
    "matedKing": "h8",
    "moves": [
      {
        "from": "h5",
        "to": "h6",
        "san": "Qh6"
      },
      {
        "from": "g8",
        "to": "h8",
        "san": "Kh8"
      },
      {
        "from": "h6",
        "to": "g7",
        "san": "Qg7#"
      }
    ],
    "note": "The wedge pawn on f6 paralyzes the kingside so Qh6\u2013Qg7# is unstoppable."
  },
  {
    "id": "mate_29_b",
    "motif": "Lolli's Mate",
    "variant": "f6 Pawn & Queen on g7 (Reversed Colors)",
    "form": "Simplest Form",
    "winner": "Black",
    "fen": "6k1/8/8/8/7q/5pP1/5P1P/6K1 b - - 0 1",
    "matedKing": "h1",
    "moves": [
      {
        "from": "h4",
        "to": "h3",
        "san": "Qh3"
      },
      {
        "from": "g1",
        "to": "h1",
        "san": "Kh1"
      },
      {
        "from": "h3",
        "to": "g2",
        "san": "Qg2#"
      }
    ],
    "note": "The wedge pawn on f6 paralyzes the kingside so Qh6\u2013Qg7# is unstoppable."
  },
  {
    "id": "mate_30_a",
    "motif": "Lolli's Mate",
    "variant": "In-Situ Wedge Invasion",
    "form": "In-Situ",
    "winner": "White",
    "fen": "r4rk1/pp3p1p/2p2Pp1/7Q/8/8/PPP3PP/5R1K w - - 0 1",
    "matedKing": "g8",
    "moves": [
      {
        "from": "h5",
        "to": "h6",
        "san": "Qh6"
      },
      {
        "from": "f8",
        "to": "e8",
        "san": "Rfe8"
      },
      {
        "from": "h6",
        "to": "g7",
        "san": "Qg7#"
      }
    ],
    "note": "With the f6 pawn slicing the kingside in half, Qh6 followed by Qg7# ends it."
  },
  {
    "id": "mate_30_b",
    "motif": "Lolli's Mate",
    "variant": "In-Situ Wedge Invasion (Reversed Colors)",
    "form": "In-Situ",
    "winner": "Black",
    "fen": "5r1k/ppp3pp/8/8/7q/2P2pP1/PP3P1P/R4RK1 b - - 0 1",
    "matedKing": "g1",
    "moves": [
      {
        "from": "h4",
        "to": "h3",
        "san": "Qh3"
      },
      {
        "from": "f1",
        "to": "e1",
        "san": "Rfe1"
      },
      {
        "from": "h3",
        "to": "g2",
        "san": "Qg2#"
      }
    ],
    "note": "With the f6 pawn slicing the kingside in half, Qh6 followed by Qg7# ends it."
  },
  {
    "id": "mate_31_a",
    "motif": "Greco's Mate",
    "variant": "Bishop & Queen on h-File",
    "form": "Simplest Form",
    "winner": "White",
    "fen": "7k/6p1/8/8/2B5/8/5Q2/6K1 w - - 0 1",
    "matedKing": "h8",
    "moves": [
      {
        "from": "f2",
        "to": "h4",
        "san": "Qh4#"
      }
    ],
    "note": "Bishop on c4 seals g8 while the queen delivers Greco's Mate along the h-file."
  },
  {
    "id": "mate_31_b",
    "motif": "Greco's Mate",
    "variant": "Bishop & Queen on h-File (Reversed Colors)",
    "form": "Simplest Form",
    "winner": "Black",
    "fen": "6k1/5q2/8/2b5/8/8/6P1/7K b - - 0 1",
    "matedKing": "h1",
    "moves": [
      {
        "from": "f7",
        "to": "h5",
        "san": "Qh5#"
      }
    ],
    "note": "Bishop on c4 seals g8 while the queen delivers Greco's Mate along the h-file."
  },
  {
    "id": "mate_32_a",
    "motif": "Greco's Mate",
    "variant": "In-Situ Castled King Crush",
    "form": "In-Situ",
    "winner": "White",
    "fen": "r4r1k/ppp3p1/8/8/2B5/8/PPP2QP1/5R1K w - - 0 1",
    "matedKing": "h8",
    "moves": [
      {
        "from": "f2",
        "to": "h4",
        "san": "Qh4#"
      }
    ],
    "note": "Black's own g7 pawn blocks escape while Bc4 seals g8 for Qh4#."
  },
  {
    "id": "mate_32_b",
    "motif": "Greco's Mate",
    "variant": "In-Situ Castled King Crush (Reversed Colors)",
    "form": "In-Situ",
    "winner": "Black",
    "fen": "5r1k/ppp2qp1/8/2b5/8/8/PPP3P1/R4R1K b - - 0 1",
    "matedKing": "h1",
    "moves": [
      {
        "from": "f7",
        "to": "h5",
        "san": "Qh5#"
      }
    ],
    "note": "Black's own g7 pawn blocks escape while Bc4 seals g8 for Qh4#."
  },
  {
    "id": "mate_33_a",
    "motif": "Morphy's Mate",
    "variant": "Open g-File & Diagonal Bishop",
    "form": "Simplest Form",
    "winner": "White",
    "fen": "7k/7p/8/8/8/2B5/6R1/6K1 w - - 0 1",
    "matedKing": "h8",
    "moves": [
      {
        "from": "c3",
        "to": "f6",
        "san": "Bf6#"
      }
    ],
    "note": "Rook holds the open g-file while the bishop delivers mate along the a1\u2013h8 diagonal."
  },
  {
    "id": "mate_33_b",
    "motif": "Morphy's Mate",
    "variant": "Open g-File & Diagonal Bishop (Reversed Colors)",
    "form": "Simplest Form",
    "winner": "Black",
    "fen": "6k1/6r1/2b5/8/8/8/7P/7K b - - 0 1",
    "matedKing": "h1",
    "moves": [
      {
        "from": "c6",
        "to": "f3",
        "san": "Bf3#"
      }
    ],
    "note": "Rook holds the open g-file while the bishop delivers mate along the a1\u2013h8 diagonal."
  },
  {
    "id": "mate_34_a",
    "motif": "Morphy's Mate",
    "variant": "In-Situ Rook-Bishop Battery",
    "form": "In-Situ",
    "winner": "White",
    "fen": "r3r2k/ppp4p/8/8/8/2B5/PPP4P/6RK w - - 0 1",
    "matedKing": "h8",
    "moves": [
      {
        "from": "c3",
        "to": "f6",
        "san": "Bf6#"
      }
    ],
    "note": "Rook locks the g-file while Bf6# delivers Morphy's Mate along the long diagonal."
  },
  {
    "id": "mate_34_b",
    "motif": "Morphy's Mate",
    "variant": "In-Situ Rook-Bishop Battery (Reversed Colors)",
    "form": "In-Situ",
    "winner": "Black",
    "fen": "6rk/ppp4p/2b5/8/8/8/PPP4P/R3R2K b - - 0 1",
    "matedKing": "h1",
    "moves": [
      {
        "from": "c6",
        "to": "f3",
        "san": "Bf3#"
      }
    ],
    "note": "Rook locks the g-file while Bf6# delivers Morphy's Mate along the long diagonal."
  },
  {
    "id": "mate_35_a",
    "motif": "Pillsbury's Mate",
    "variant": "Rook on g-File & f6 Bishop",
    "form": "Simplest Form",
    "winner": "White",
    "fen": "5r1k/5p1p/8/8/8/2B5/6R1/6K1 w - - 0 1",
    "matedKing": "h8",
    "moves": [
      {
        "from": "c3",
        "to": "f6",
        "san": "Bf6#"
      }
    ],
    "note": "Rook pins the king to the h-file and the dark-squared bishop delivers Bf6#."
  },
  {
    "id": "mate_35_b",
    "motif": "Pillsbury's Mate",
    "variant": "Rook on g-File & f6 Bishop (Reversed Colors)",
    "form": "Simplest Form",
    "winner": "Black",
    "fen": "6k1/6r1/2b5/8/8/8/5P1P/5R1K b - - 0 1",
    "matedKing": "h1",
    "moves": [
      {
        "from": "c6",
        "to": "f3",
        "san": "Bf3#"
      }
    ],
    "note": "Rook pins the king to the h-file and the dark-squared bishop delivers Bf6#."
  },
  {
    "id": "mate_36_a",
    "motif": "Pillsbury's Mate",
    "variant": "In-Situ Rook-Bishop Pinch",
    "form": "In-Situ",
    "winner": "White",
    "fen": "r3r2k/pp3p1p/2p5/8/8/2B5/PPP4P/6RK w - - 0 1",
    "matedKing": "h8",
    "moves": [
      {
        "from": "c3",
        "to": "f6",
        "san": "Bf6#"
      }
    ],
    "note": "The g1 rook pins the king to the h-file so Bf6# delivers Pillsbury's Mate."
  },
  {
    "id": "mate_36_b",
    "motif": "Pillsbury's Mate",
    "variant": "In-Situ Rook-Bishop Pinch (Reversed Colors)",
    "form": "In-Situ",
    "winner": "Black",
    "fen": "6rk/ppp4p/2b5/8/8/2P5/PP3P1P/R3R2K b - - 0 1",
    "matedKing": "h1",
    "moves": [
      {
        "from": "c6",
        "to": "f3",
        "san": "Bf3#"
      }
    ],
    "note": "The g1 rook pins the king to the h-file so Bf6# delivers Pillsbury's Mate."
  },
  {
    "id": "mate_37_a",
    "motif": "Blackburne's Mate",
    "variant": "Bishop Pair & Knight",
    "form": "Simplest Form",
    "winner": "White",
    "fen": "5rk1/7p/8/6N1/8/8/1BB5/6K1 w - - 0 1",
    "matedKing": "g8",
    "moves": [
      {
        "from": "c2",
        "to": "h7",
        "san": "Bxh7#"
      }
    ],
    "note": "Knight on g5 and bishop on b2 lock the corner while Bxh7# delivers Blackburne's Mate."
  },
  {
    "id": "mate_37_b",
    "motif": "Blackburne's Mate",
    "variant": "Bishop Pair & Knight (Reversed Colors)",
    "form": "Simplest Form",
    "winner": "Black",
    "fen": "6k1/1bb5/8/8/6n1/8/7P/5RK1 b - - 0 1",
    "matedKing": "g1",
    "moves": [
      {
        "from": "c7",
        "to": "h2",
        "san": "Bxh2#"
      }
    ],
    "note": "Knight on g5 and bishop on b2 lock the corner while Bxh7# delivers Blackburne's Mate."
  },
  {
    "id": "mate_38_a",
    "motif": "Blackburne's Mate",
    "variant": "In-Situ Minor-Piece Crush",
    "form": "In-Situ",
    "winner": "White",
    "fen": "r4rk1/pp5p/2p5/6N1/8/8/PBB2PPP/5RK1 w - - 0 1",
    "matedKing": "g8",
    "moves": [
      {
        "from": "c2",
        "to": "h7",
        "san": "Bxh7#"
      }
    ],
    "note": "All three minor pieces converge on the castled king for Blackburne's Mate."
  },
  {
    "id": "mate_38_b",
    "motif": "Blackburne's Mate",
    "variant": "In-Situ Minor-Piece Crush (Reversed Colors)",
    "form": "In-Situ",
    "winner": "Black",
    "fen": "5rk1/pbb2ppp/8/8/6n1/2P5/PP5P/R4RK1 b - - 0 1",
    "matedKing": "g1",
    "moves": [
      {
        "from": "c7",
        "to": "h2",
        "san": "Bxh2#"
      }
    ],
    "note": "All three minor pieces converge on the castled king for Blackburne's Mate."
  },
  {
    "id": "mate_39_a",
    "motif": "R\u00e9ti's Mate",
    "variant": "Bishop & Rook Diagonal",
    "form": "Simplest Form",
    "winner": "White",
    "fen": "2kr4/1pp5/8/6B1/8/8/8/3R2K1 w - - 0 1",
    "matedKing": "c8",
    "moves": [
      {
        "from": "d1",
        "to": "d8",
        "san": "Rxd8#"
      }
    ],
    "note": "A bishop protects the rook invading on d8 while the king's own pawns seal b7 and c7."
  },
  {
    "id": "mate_39_b",
    "motif": "R\u00e9ti's Mate",
    "variant": "Bishop & Rook Diagonal (Reversed Colors)",
    "form": "Simplest Form",
    "winner": "Black",
    "fen": "3r2k1/8/8/8/6b1/8/1PP5/2KR4 b - - 0 1",
    "matedKing": "c1",
    "moves": [
      {
        "from": "d8",
        "to": "d1",
        "san": "Rxd1#"
      }
    ],
    "note": "A bishop protects the rook invading on d8 while the king's own pawns seal b7 and c7."
  },
  {
    "id": "mate_40_a",
    "motif": "R\u00e9ti's Mate",
    "variant": "R\u00e9ti vs. Tartakower (1910)",
    "form": "In-Situ",
    "winner": "White",
    "fen": "rnb1kb1r/pp3ppp/2p5/4q3/4n3/3Q4/PPPB1PPP/2KR1BNR w kq - 0 9",
    "matedKing": "e8",
    "moves": [
      {
        "from": "d3",
        "to": "d8",
        "san": "Qd8+"
      },
      {
        "from": "e8",
        "to": "d8",
        "san": "Kxd8"
      },
      {
        "from": "d2",
        "to": "g5",
        "san": "Bg5+"
      },
      {
        "from": "d8",
        "to": "e8",
        "san": "Ke8"
      },
      {
        "from": "d1",
        "to": "d8",
        "san": "Rd8#"
      }
    ],
    "note": "Richard R\u00e9ti's famous 1910 Vienna miniature: 9.Qd8+!! Kxd8 10.Bg5+ Ke8 11.Rd8#."
  },
  {
    "id": "mate_40_b",
    "motif": "R\u00e9ti's Mate",
    "variant": "R\u00e9ti vs. Tartakower (1910) (Reversed Colors)",
    "form": "In-Situ",
    "winner": "Black",
    "fen": "2kr1bnr/pppb1ppp/3q4/4N3/4Q3/2P5/PP3PPP/RNB1KB1R b KQ - 0 9",
    "matedKing": "e1",
    "moves": [
      {
        "from": "d6",
        "to": "d1",
        "san": "Qd1+"
      },
      {
        "from": "e1",
        "to": "d1",
        "san": "Kxd1"
      },
      {
        "from": "d7",
        "to": "g4",
        "san": "Bg4+"
      },
      {
        "from": "d1",
        "to": "e1",
        "san": "Ke1"
      },
      {
        "from": "d8",
        "to": "d1",
        "san": "Rd1#"
      }
    ],
    "note": "Richard R\u00e9ti's famous 1910 Vienna miniature: 9.Qd8+!! Kxd8 10.Bg5+ Ke8 11.Rd8#."
  },
  {
    "id": "mate_41_a",
    "motif": "L\u00e9gal's Mate",
    "variant": "Classic 1750 Knight Trap",
    "form": "Simplest Form",
    "winner": "White",
    "fen": "r2qkbnr/ppp2ppp/2np4/4p3/2B1P1b1/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 0 5",
    "matedKing": "e7",
    "moves": [
      {
        "from": "f3",
        "to": "e5",
        "san": "Nxe5"
      },
      {
        "from": "g4",
        "to": "d1",
        "san": "Bxd1"
      },
      {
        "from": "c4",
        "to": "f7",
        "san": "Bxf7+"
      },
      {
        "from": "e8",
        "to": "e7",
        "san": "Ke7"
      },
      {
        "from": "c3",
        "to": "d5",
        "san": "Nd5#"
      }
    ],
    "note": "Sire de L\u00e9gal's immortal 1750 trap: sacrificing the queen for a three-minor-piece checkmate!"
  },
  {
    "id": "mate_41_b",
    "motif": "L\u00e9gal's Mate",
    "variant": "Classic 1750 Knight Trap (Reversed Colors)",
    "form": "Simplest Form",
    "winner": "Black",
    "fen": "r1bqk2r/pppp1ppp/2n2n2/2b1p1B1/4P3/2NP4/PPP2PPP/R2QKBNR b KQkq - 0 5",
    "matedKing": "e2",
    "moves": [
      {
        "from": "f6",
        "to": "e4",
        "san": "Nxe4"
      },
      {
        "from": "g5",
        "to": "d8",
        "san": "Bxd8"
      },
      {
        "from": "c5",
        "to": "f2",
        "san": "Bxf2+"
      },
      {
        "from": "e1",
        "to": "e2",
        "san": "Ke2"
      },
      {
        "from": "c6",
        "to": "d4",
        "san": "Nd4#"
      }
    ],
    "note": "Sire de L\u00e9gal's immortal 1750 trap: sacrificing the queen for a three-minor-piece checkmate!"
  },
  {
    "id": "mate_42_a",
    "motif": "L\u00e9gal's Mate",
    "variant": "In-Situ Philidor Trap",
    "form": "In-Situ",
    "winner": "White",
    "fen": "r2qkbnr/ppp2ppp/2np4/4p3/2B1P1b1/2NP1N2/PPP2PPP/R1BQK2R w KQkq - 0 6",
    "matedKing": "e7",
    "moves": [
      {
        "from": "f3",
        "to": "e5",
        "san": "Nxe5"
      },
      {
        "from": "g4",
        "to": "d1",
        "san": "Bxd1"
      },
      {
        "from": "c4",
        "to": "f7",
        "san": "Bxf7+"
      },
      {
        "from": "e8",
        "to": "e7",
        "san": "Ke7"
      },
      {
        "from": "c3",
        "to": "d5",
        "san": "Nd5#"
      }
    ],
    "note": "Even with d3 played, Nxe5! still springs the full L\u00e9gal's Mate if Black takes the queen."
  },
  {
    "id": "mate_42_b",
    "motif": "L\u00e9gal's Mate",
    "variant": "In-Situ Philidor Trap (Reversed Colors)",
    "form": "In-Situ",
    "winner": "Black",
    "fen": "r1bqk2r/ppp2ppp/2np1n2/2b1p1B1/4P3/2NP4/PPP2PPP/R2QKBNR b KQkq - 0 6",
    "matedKing": "e2",
    "moves": [
      {
        "from": "f6",
        "to": "e4",
        "san": "Nxe4"
      },
      {
        "from": "g5",
        "to": "d8",
        "san": "Bxd8"
      },
      {
        "from": "c5",
        "to": "f2",
        "san": "Bxf2+"
      },
      {
        "from": "e1",
        "to": "e2",
        "san": "Ke2"
      },
      {
        "from": "c6",
        "to": "d4",
        "san": "Nd4#"
      }
    ],
    "note": "Even with d3 played, Nxe5! still springs the full L\u00e9gal's Mate if Black takes the queen."
  },
  {
    "id": "mate_43_a",
    "motif": "Blind Swine Mate",
    "variant": "Two Rooks on the 7th",
    "form": "Simplest Form",
    "winner": "White",
    "fen": "6k1/1R4R1/8/8/8/8/8/6K1 w - - 0 1",
    "matedKing": "f8",
    "moves": [
      {
        "from": "g7",
        "to": "h7",
        "san": "Rh7"
      },
      {
        "from": "g8",
        "to": "f8",
        "san": "Kf8"
      },
      {
        "from": "b7",
        "to": "b8",
        "san": "Rb8#"
      }
    ],
    "note": "Two rooks on the 7th rank sweep the back rank cleanly\u2014coined by Dawid Janowski."
  },
  {
    "id": "mate_43_b",
    "motif": "Blind Swine Mate",
    "variant": "Two Rooks on the 7th (Reversed Colors)",
    "form": "Simplest Form",
    "winner": "Black",
    "fen": "6k1/8/8/8/8/8/1r4r1/6K1 b - - 0 1",
    "matedKing": "f1",
    "moves": [
      {
        "from": "g2",
        "to": "h2",
        "san": "Rh2"
      },
      {
        "from": "g1",
        "to": "f1",
        "san": "Kf1"
      },
      {
        "from": "b2",
        "to": "b1",
        "san": "Rb1#"
      }
    ],
    "note": "Two rooks on the 7th rank sweep the back rank cleanly\u2014coined by Dawid Janowski."
  },
  {
    "id": "mate_44_a",
    "motif": "Blind Swine Mate",
    "variant": "In-Situ 7th-Rank Stampede",
    "form": "In-Situ",
    "winner": "White",
    "fen": "6k1/1R4R1/5p1p/8/8/8/5PPP/6K1 w - - 0 1",
    "matedKing": "f8",
    "moves": [
      {
        "from": "g7",
        "to": "h7",
        "san": "Rh7"
      },
      {
        "from": "g8",
        "to": "f8",
        "san": "Kf8"
      },
      {
        "from": "b7",
        "to": "b8",
        "san": "Rb8#"
      }
    ],
    "note": "Two rooks on the 7th rank roll right over the back rank in the endgame."
  },
  {
    "id": "mate_44_b",
    "motif": "Blind Swine Mate",
    "variant": "In-Situ 7th-Rank Stampede (Reversed Colors)",
    "form": "In-Situ",
    "winner": "Black",
    "fen": "6k1/5ppp/8/8/8/5P1P/1r4r1/6K1 b - - 0 1",
    "matedKing": "f1",
    "moves": [
      {
        "from": "g2",
        "to": "h2",
        "san": "Rh2"
      },
      {
        "from": "g1",
        "to": "f1",
        "san": "Kf1"
      },
      {
        "from": "b2",
        "to": "b1",
        "san": "Rb1#"
      }
    ],
    "note": "Two rooks on the 7th rank roll right over the back rank in the endgame."
  },
  {
    "id": "mate_45_a",
    "motif": "Vukovi\u0107 Mate",
    "variant": "Rook, Knight & King",
    "form": "Simplest Form",
    "winner": "White",
    "fen": "5k2/8/4NK2/8/8/8/8/3R4 w - - 0 1",
    "matedKing": "f8",
    "moves": [
      {
        "from": "d1",
        "to": "d8",
        "san": "Rd8#"
      }
    ],
    "note": "King and knight trap the enemy king on the back rank so the rook mates from afar."
  },
  {
    "id": "mate_45_b",
    "motif": "Vukovi\u0107 Mate",
    "variant": "Rook, Knight & King (Reversed Colors)",
    "form": "Simplest Form",
    "winner": "Black",
    "fen": "3r4/8/8/8/8/4nk2/8/5K2 b - - 0 1",
    "matedKing": "f1",
    "moves": [
      {
        "from": "d8",
        "to": "d1",
        "san": "Rd1#"
      }
    ],
    "note": "King and knight trap the enemy king on the back rank so the rook mates from afar."
  },
  {
    "id": "mate_46_a",
    "motif": "Suffocation Mate",
    "variant": "Knight & Long-Diagonal Bishop",
    "form": "Simplest Form",
    "winner": "White",
    "fen": "5rk1/5p1p/8/5N2/8/8/1B6/6K1 w - - 0 1",
    "matedKing": "g8",
    "moves": [
      {
        "from": "f5",
        "to": "e7",
        "san": "Ne7#"
      }
    ],
    "note": "Bishop slices the long diagonal while the knight delivers Suffocation Mate on e7."
  },
  {
    "id": "mate_46_b",
    "motif": "Suffocation Mate",
    "variant": "Knight & Long-Diagonal Bishop (Reversed Colors)",
    "form": "Simplest Form",
    "winner": "Black",
    "fen": "6k1/1b6/8/8/5n2/8/5P1P/5RK1 b - - 0 1",
    "matedKing": "g1",
    "moves": [
      {
        "from": "f4",
        "to": "e2",
        "san": "Ne2#"
      }
    ],
    "note": "Bishop slices the long diagonal while the knight delivers Suffocation Mate on e7."
  },
  {
    "id": "mate_47_a",
    "motif": "Queen & King Mate",
    "variant": "Classic Kiss of Death",
    "form": "Simplest Form",
    "winner": "White",
    "fen": "4k3/8/4K3/8/8/8/3Q4/8 w - - 0 1",
    "matedKing": "f8",
    "moves": [
      {
        "from": "d2",
        "to": "d7",
        "san": "Qd7+"
      },
      {
        "from": "e8",
        "to": "f8",
        "san": "Kf8"
      },
      {
        "from": "d7",
        "to": "f7",
        "san": "Qf7#"
      }
    ],
    "note": "The king supports the queen right in front of the enemy king for the Kiss of Death."
  },
  {
    "id": "mate_47_b",
    "motif": "Queen & King Mate",
    "variant": "Classic Kiss of Death (Reversed Colors)",
    "form": "Simplest Form",
    "winner": "Black",
    "fen": "8/3q4/8/8/8/4k3/8/4K3 b - - 0 1",
    "matedKing": "f1",
    "moves": [
      {
        "from": "d7",
        "to": "d2",
        "san": "Qd2+"
      },
      {
        "from": "e1",
        "to": "f1",
        "san": "Kf1"
      },
      {
        "from": "d2",
        "to": "f2",
        "san": "Qf2#"
      }
    ],
    "note": "The king supports the queen right in front of the enemy king for the Kiss of Death."
  },
  {
    "id": "mate_48_a",
    "motif": "Rook & King Mate",
    "variant": "Opposition Back-Rank Mate",
    "form": "Simplest Form",
    "winner": "White",
    "fen": "4k3/R7/4K3/8/8/8/8/8 w - - 0 1",
    "matedKing": "e8",
    "moves": [
      {
        "from": "a7",
        "to": "a8",
        "san": "Ra8#"
      }
    ],
    "note": "Direct king opposition covers d7, e7, and f7 while the rook sweeps the 8th rank."
  },
  {
    "id": "mate_48_b",
    "motif": "Rook & King Mate",
    "variant": "Opposition Back-Rank Mate (Reversed Colors)",
    "form": "Simplest Form",
    "winner": "Black",
    "fen": "8/8/8/8/8/4k3/r7/4K3 b - - 0 1",
    "matedKing": "e1",
    "moves": [
      {
        "from": "a2",
        "to": "a1",
        "san": "Ra1#"
      }
    ],
    "note": "Direct king opposition covers d7, e7, and f7 while the rook sweeps the 8th rank."
  },
  {
    "id": "mate_49_a",
    "motif": "Two Bishops Mate",
    "variant": "Corner Diagonal Squeeze",
    "form": "Simplest Form",
    "winner": "White",
    "fen": "7k/8/6K1/8/2B5/2B5/8/8 w - - 0 1",
    "matedKing": "h8",
    "moves": [
      {
        "from": "c3",
        "to": "f6",
        "san": "Bf6#"
      }
    ],
    "note": "The king boxes the corner while the two bishops slice parallel diagonals for Bf6#."
  },
  {
    "id": "mate_49_b",
    "motif": "Two Bishops Mate",
    "variant": "Corner Diagonal Squeeze (Reversed Colors)",
    "form": "Simplest Form",
    "winner": "Black",
    "fen": "8/8/2b5/2b5/8/6k1/8/7K b - - 0 1",
    "matedKing": "h1",
    "moves": [
      {
        "from": "c6",
        "to": "f3",
        "san": "Bf3#"
      }
    ],
    "note": "The king boxes the corner while the two bishops slice parallel diagonals for Bf6#."
  },
  {
    "id": "mate_50_a",
    "motif": "Underpromotion Mate",
    "variant": "Only Knight Promotion Mates!",
    "form": "Simplest Form",
    "winner": "White",
    "fen": "8/6Pp/5Kpk/R7/8/8/8/8 w - - 0 1",
    "matedKing": "h6",
    "moves": [
      {
        "from": "g7",
        "to": "g8",
        "san": "g8=N#",
        "promo": "n"
      }
    ],
    "note": "Promoting to a queen isn't even check\u2014only underpromoting to a knight (g8=N#) delivers checkmate!"
  },
  {
    "id": "mate_50_b",
    "motif": "Underpromotion Mate",
    "variant": "Only Knight Promotion Mates! (Reversed Colors)",
    "form": "Simplest Form",
    "winner": "Black",
    "fen": "8/8/8/8/r7/5kPK/6pP/8 b - - 0 1",
    "matedKing": "h3",
    "moves": [
      {
        "from": "g2",
        "to": "g1",
        "san": "g1=N#",
        "promo": "n"
      }
    ],
    "note": "Promoting to a queen isn't even check\u2014only underpromoting to a knight (g8=N#) delivers checkmate!"
  }
];
