#!/usr/bin/env python3
"""Generate and mathematically verify 100 classic chess checkmates for WScreenSavers."""

import json
import os
import chess

OUT_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "frontend",
    "src",
    "savers",
    "classicMatesData.js",
)

# Exact 1910 Réti vs Tartakower (Caro-Kann) setup FEN:
_reti = chess.Board()
for _mv in [
    "e2e4", "c7c6", "d2d4", "d7d5", "b1c3", "d5e4", "c3e4", "g8f6",
    "d1d3", "e7e5", "d4e5", "d8a5", "c1d2", "a5e5", "e1c1", "f6e4",
]:
    _reti.push_uci(_mv)
RETI_1910_FEN = _reti.fen()

# 50 curated base checkmate studies covering 25+ classic named motifs in both
# "Simplest Form" and "In-Situ" game variations. Each base entry is verified with
# python-chess and paired with its exact color-mirrored counterpart (White <-> Black),
# yielding 100 mathematically verified checkmates (50 White mates, 50 Black mates).
CLEAN_50 = [
    # 1-2: Fool's Mate
    ("Fool's Mate", "Classic 2-Move Trap", "Simplest Form",
     chess.STARTING_FEN, ["f2f3", "e7e5", "g2g4", "d8h4"],
     "The fastest possible checkmate in chess: f3 and g4 open the fatal e1–h4 diagonal."),
    ("Fool's Mate", "Bird's Opening Slip", "In-Situ",
     chess.STARTING_FEN, ["f2f4", "e7e5", "g2g3", "e5f4", "g3f4", "d8h4"],
     "In-situ Fool's Mate arising when White weakens the kingside diagonal with f4 and g3."),

    # 3-4: Scholar's Mate
    ("Scholar's Mate", "Classic 4-Move Attack", "Simplest Form",
     chess.STARTING_FEN, ["e2e4", "e7e5", "f1c4", "b8c6", "d1h5", "g8f6", "h5f7"],
     "Queen and bishop converge on the undefended f7 square on move 4."),
    ("Scholar's Mate", "Qf3 Battery Line", "In-Situ",
     chess.STARTING_FEN, ["e2e4", "e7e5", "d1f3", "d7d6", "f1c4", "b8c6", "f3f7"],
     "The Qf3 + Bc4 battery strikes f7 when Black neglects kingside defense."),

    # 5-6: Ladder Mate
    ("Ladder Mate", "Two-Rook Lawnmower", "Simplest Form",
     "4k3/8/R7/1R6/8/8/8/4K3 w - - 0 1", ["b5b7", "e8d8", "a6a8"],
     "Alternating rook checks herd the lone king straight to the back rank."),
    ("Ladder Mate", "Queen & Rook Endgame", "In-Situ",
     "4k3/8/2Q5/R7/8/6P1/5P1P/6K1 w - - 0 1", ["a5a7", "e8f8", "c6c8"],
     "Queen and rook coordinate in an endgame to complete the ladder."),

    # 7-8: Back-Rank Mate
    ("Back-Rank Mate", "Classic Pawn Prison", "Simplest Form",
     "6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1", ["d1d8"],
     "Without an escape square ('luft'), the king is trapped behind its own pawns."),
    ("Back-Rank Mate", "Queen Deflection Sacrifice", "In-Situ",
     "r2r2k1/5ppp/1p6/8/8/8/3Q1PPP/3R2K1 w - - 0 1", ["d2d8", "a8d8", "d1d8"],
     "Qxd8+! deflects the back-rank defender so Rxd8# finishes the game."),

    # 9-10: Anastasia's Mate
    ("Anastasia's Mate", "Knight & Rook h-File", "Simplest Form",
     "8/4N1pk/8/8/8/8/8/2K1R3 w - - 0 1", ["e1h1"],
     "The knight on e7 seals g8 and g6 while the rook delivers Anastasia's Mate down the h-file."),
    ("Anastasia's Mate", "Queen Sac Qxh7+", "In-Situ",
     "5rk1/4Nppp/8/7Q/8/4R3/5PPP/6K1 w - - 0 1", ["h5h7", "g8h7", "e3h3"],
     "Qxh7+! drags the king onto the h-file for the textbook Anastasia rook mate."),

    # 11-12: Smothered Mate
    ("Smothered Mate", "Corner Knight Finish", "Simplest Form",
     "6rk/6pp/8/6N1/8/8/8/6K1 w - - 0 1", ["g5f7"],
     "Completely hemmed in by its own pieces, the king falls to a single knight."),
    ("Smothered Mate", "Philidor's Legacy", "In-Situ",
     "r4r1k/6pp/7N/8/2Q5/8/5PPP/6K1 w - - 0 1", ["c4g8", "f8g8", "h6f7"],
     "The iconic queen sacrifice Qg8+! forces Rxg8, sealing the king for Nf7#."),

    # 13-14: Arabian Mate
    ("Arabian Mate", "Rook & Knight Corner", "Simplest Form",
     "7k/8/5N2/8/8/8/7R/6K1 w - - 0 1", ["h2h7"],
     "One of the oldest documented mates: knight on f6 guards g8 and supports Rh7#."),
    ("Arabian Mate", "In-Situ h7 Corner Trap", "In-Situ",
     "5r1k/2p5/5N2/8/8/7R/5PPP/6K1 w - - 0 1", ["h3h7"],
     "With the knight anchored on f6, the rook crashes into h7 for Arabian Mate."),

    # 15-16: Boden's Mate
    ("Boden's Mate", "Crisscrossing Bishops", "Simplest Form",
     "2kr4/3p4/8/8/5B2/8/8/5B1K w - - 0 1", ["f1a6"],
     "Two bishops carve intersecting diagonals across the queenside castled king."),
    ("Boden's Mate", "Queen Sac Qxc6+", "In-Situ",
     "2kr3r/pp1p1ppp/2n5/8/5B2/2Q5/PPP2PPP/5BK1 w - - 0 1", ["c3c6", "b7c6", "f1a6"],
     "Qxc6+! rips open the a6–c8 diagonal so the two bishops crisscross for Boden's Mate."),

    # 17-18: Opera Mate
    ("Opera Mate", "Bishop-Supported Back Rank", "Simplest Form",
     "4k3/5p2/8/6B1/8/8/8/3R2K1 w - - 0 1", ["d1d8"],
     "A rook delivers back-rank mate protected by a bishop while a pawn blocks f7."),
    ("Opera Mate", "Morphy's Opera Game (1858)", "In-Situ",
     "4kb1r/p2n1ppp/4q3/4p1B1/4P3/1Q6/PPP2PPP/2KR4 w k - 0 16", ["b3b8", "d7b8", "d1d8"],
     "Paul Morphy's immortal 1858 Paris Opera finish: 16.Qb8+! Nxb8 17.Rd8#."),

    # 19-20: Hook Mate
    ("Hook Mate", "Rook, Knight & Pawn", "Simplest Form",
     "8/5p2/5pk1/5N2/6P1/8/8/4R1K1 w - - 0 1", ["e1e7", "g6g5", "e7g7"],
     "Wait -> replace with exact Hook Mate geometry below"),
    ("Hook Mate", "In-Situ Hook Trap", "In-Situ",
     "r7/5p2/5pk1/5N2/6P1/8/5P1P/4R1K1 w - - 0 1", ["e1e7", "g6g5", "e7g7"],
     "Wait -> replace below"),

    # 21-22: Epaulette Mate
    ("Epaulette Mate", "King Flanked by Rooks", "Simplest Form",
     "3rkr2/8/8/8/8/8/4Q3/4K3 w - - 0 1", ["e2e6"],
     "The king's own rooks sit on both shoulders like military epaulettes."),
    ("Epaulette Mate", "In-Situ Central Epaulette", "In-Situ",
     "3rkr2/pp4pp/8/8/8/2B5/PPP1QPPP/6K1 w - - 0 1", ["e2e6"],
     "Queen drops into e6, trapping the king between its own two rooks."),

    # 23-24: Dovetail Mate
    ("Dovetail Mate", "Diagonal Queen Kiss", "Simplest Form",
     "8/8/5r2/4kp2/8/4Q3/3P4/6K1 w - - 0 1", ["e3d4"],
     "Wait -> ensure e4 is guarded (pawn on d3/f3)"),
    ("Dovetail Mate", "In-Situ Cozio Finish", "In-Situ",
     "r4r2/ppp3pp/5n2/4kp2/8/2PQ4/PP1P1PPP/6K1 w - - 0 1", ["d3d4"],
     "Wait -> ensure e4 is guarded"),

    # 25-26: Swallow's Tail Mate
    ("Swallow's Tail Mate", "Diagonal Escape Blocked", "Simplest Form",
     "3r1r2/4k3/8/3P4/8/8/4Q3/6K1 w - - 0 1", ["e2e6"],
     "Two friendly pieces occupy the rear diagonals like a swallow's tail."),
    ("Swallow's Tail Mate", "In-Situ Queen Strike", "In-Situ",
     "3r1r2/pp2k1pp/8/3P1P2/8/8/PP2Q1PP/6K1 w - - 0 1", ["e2e6"],
     "Protected by d5 and f5, Qe6# completes the classic Swallow's Tail."),

    # 27-28: Damiano's Mate
    ("Damiano's Mate", "Pawn & Queen Corner", "Simplest Form",
     "6k1/6p1/5P2/8/8/8/7Q/6K1 w - - 0 1", ["h2h7", "g8f8", "h7h8"],
     "Wait -> put pawn on g6 and block f7 (or f6 pawn + Qg7#)"),
    ("Damiano's Mate", "Classic Rook Sac on h8", "In-Situ",
     "5rk1/5pp1/6P1/8/8/6Q1/5PP1/6KR w - - 0 1", ["h1h8", "g8h8", "g3h3", "h8g8", "h3h7"],
     "Rh8+! clears the corner so the queen swings to h3 and delivers Damiano's Mate on h7!"),

    # 29-30: Lolli's Mate
    ("Lolli's Mate", "f6 Pawn & Queen on g7", "Simplest Form",
     "6k1/5p1p/5Pp1/7Q/8/8/8/6K1 w - - 0 1", ["h5h6", "g8h8", "h6g7"],
     "The wedge pawn on f6 paralyzes the kingside so Qh6–Qg7# is unstoppable."),
    ("Lolli's Mate", "In-Situ Wedge Invasion", "In-Situ",
     "r4rk1/pp3p1p/2p2Pp1/7Q/8/8/PPP3PP/5R1K w - - 0 1", ["h5h6", "f8e8", "h6g7"],
     "With the f6 pawn slicing the kingside in half, Qh6 followed by Qg7# ends it."),

    # 31-32: Greco's Mate
    ("Greco's Mate", "Bishop & Queen on h-File", "Simplest Form",
     "7k/6p1/8/8/2B5/8/5Q2/6K1 w - - 0 1", ["f2h4"],
     "Bishop on c4 seals g8 while the queen delivers Greco's Mate along the h-file."),
    ("Greco's Mate", "In-Situ Castled King Crush", "In-Situ",
     "r4r1k/ppp3p1/8/8/2B5/8/PPP2QP1/5R1K w - - 0 1", ["f2h4"],
     "Black's own g7 pawn blocks escape while Bc4 seals g8 for Qh4#."),

    # 33-34: Morphy's Mate
    ("Morphy's Mate", "Open g-File & Diagonal Bishop", "Simplest Form",
     "7k/7p/8/8/8/2B5/6R1/6K1 w - - 0 1", ["c3f6"],
     "Rook holds the open g-file while the bishop delivers mate along the a1–h8 diagonal."),
    ("Morphy's Mate", "In-Situ Rook-Bishop Battery", "In-Situ",
     "r3r2k/ppp4p/8/8/8/2B5/PPP4P/6RK w - - 0 1", ["c3f6"],
     "Rook locks the g-file while Bf6# delivers Morphy's Mate along the long diagonal."),

    # 35-36: Pillsbury's Mate
    ("Pillsbury's Mate", "Rook on g-File & f6 Bishop", "Simplest Form",
     "5r1k/5p1p/8/8/8/2B5/6R1/6K1 w - - 0 1", ["c3f6"],
     "Rook pins the king to the h-file and the dark-squared bishop delivers Bf6#."),
    ("Pillsbury's Mate", "In-Situ Rook-Bishop Pinch", "In-Situ",
     "r4r1k/pp3p1p/2p5/8/8/2B5/PPP3PP/6RK w - - 0 1", ["g1g8", "f8g8", "c3f6"],
     "Wait -> replace with exact Pillsbury Rg7# / Bf6# below"),

    # 37-38: Blackburne's Mate
    ("Blackburne's Mate", "Bishop Pair & Knight", "Simplest Form",
     "5rk1/7p/8/6N1/8/8/1BB5/6K1 w - - 0 1", ["c2h7"],
     "Knight on g5 and bishop on b2 lock the corner while Bxh7# delivers Blackburne's Mate."),
    ("Blackburne's Mate", "In-Situ Minor-Piece Crush", "In-Situ",
     "r4rk1/pp5p/2p5/6N1/8/8/PBB2PPP/5RK1 w - - 0 1", ["c2h7"],
     "All three minor pieces converge on the castled king for Blackburne's Mate."),

    # 39-40: Réti's Mate
    ("Réti's Mate", "Bishop & Rook Diagonal", "Simplest Form",
     "2kr4/1pp5/8/6B1/8/8/8/3R2K1 w - - 0 1", ["d1d8"],
     "A bishop protects the rook invading on d8 while the king's own pawns seal b7 and c7."),
    ("Réti's Mate", "Réti vs. Tartakower (1910)", "In-Situ",
     RETI_1910_FEN, ["d3d8", "e8d8", "d2g5", "d8e8", "d1d8"],
     "Richard Réti's famous 1910 Vienna miniature: 9.Qd8+!! Kxd8 10.Bg5+ Ke8 11.Rd8#."),

    # 41-42: Légal's Mate
    ("Légal's Mate", "Classic 1750 Knight Trap", "Simplest Form",
     "r2qkbnr/ppp2ppp/2np4/4p3/2B1P1b1/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 0 5",
     ["f3e5", "g4d1", "c4f7", "e8e7", "c3d5"],
     "Sire de Légal's immortal 1750 trap: sacrificing the queen for a three-minor-piece checkmate!"),
    ("Légal's Mate", "In-Situ Philidor Trap", "In-Situ",
     "r2qkbnr/ppp2ppp/2np4/4p3/2B1P1b1/2NP1N2/PPP2PPP/R1BQK2R w KQkq - 0 6",
     ["f3e5", "g4d1", "c4f7", "e8e7", "c3d5"],
     "Even with d3 played, Nxe5! still springs the full Légal's Mate if Black takes the queen."),

    # 43-44: Blind Swine Mate
    ("Blind Swine Mate", "Two Rooks on the 7th", "Simplest Form",
     "5rk1/1R4R1/8/8/8/8/8/6K1 w - - 0 1", ["g7h7", "f8f7", "b7b8"],
     "Wait -> replace with exact 2-move Blind Swine below"),
    ("Blind Swine Mate", "In-Situ 7th-Rank Stampede", "In-Situ",
     "6k1/1R4R1/5p1p/8/8/8/5PPP/6K1 w - - 0 1", ["g7h7", "g8f8", "b7b8"],
     "Two rooks on the 7th rank roll right over the back rank in the endgame."),

    # 45-46: Vuković & Suffocation Mates
    ("Vuković Mate", "Rook, Knight & King", "Simplest Form",
     "5k2/8/4NK2/8/8/8/8/3R4 w - - 0 1", ["d1d8"],
     "King and knight trap the enemy king on the back rank so the rook mates from afar."),
    ("Suffocation Mate", "Knight & Long-Diagonal Bishop", "Simplest Form",
     "5rk1/5p1p/8/5N2/8/8/1B6/6K1 w - - 0 1", ["f5e7"],
     "Bishop slices the long diagonal while the knight delivers Suffocation Mate on e7."),

    # 47-48: Elementary Queen+King & Rook+King Mates
    ("Queen & King Mate", "Classic Kiss of Death", "Simplest Form",
     "4k3/8/4K3/8/8/8/3Q4/8 w - - 0 1", ["d2d7", "e8f8", "d7f7"],
     "The king supports the queen right in front of the enemy king for the Kiss of Death."),
    ("Rook & King Mate", "Opposition Back-Rank Mate", "Simplest Form",
     "4k3/R7/4K3/8/8/8/8/8 w - - 0 1", ["a7a8"],
     "Direct king opposition covers d7, e7, and f7 while the rook sweeps the 8th rank."),

    # 49-50: Two Bishops Mate & Underpromotion Mate
    ("Two Bishops Mate", "Corner Diagonal Squeeze", "Simplest Form",
     "6k1/8/6K1/8/3B4/3B4/8/8 w - - 0 1", ["d3c4", "g8f8", "d4c5", "f8e8", "c4b5", "e8d8", "c5b6", "d8c8", "b5a6"],
     "Wait -> exact 2-move Two Bishops mate below"),
    ("Underpromotion Mate", "Only Knight Promotion Mates!", "Simplest Form",
     "8/6Pp/5Kpk/R7/8/8/8/8 w - - 0 1", ["g7g8n"],
     "Promoting to a queen isn't even check—only underpromoting to a knight (g8=N#) delivers checkmate!"),
]

# Exact fixes for the 7 remaining studies:
# #19-20: Hook Mate (Rook protected by Knight, Knight protected by Pawn, enemy pawn blocks escape!)
# Classic Hook Mate: Black K on g6, Black P on g7 & f6; White N on f5, White P on e4, White R on h1 -> Rh6#? No, g7/f6 -> K on h6?
# Exact Hook Mate: Black K on g8, Black P on f7; White N on f6 (protected by White P on g5? No, P on e5!), White R on e8 -> Re8# is Arabian; Hook Mate has King on edge next to own pawn, e.g.:
# Black K on g7, Black P on f7, White N on f6 (protected by P on e5), White R on h8 -> Rh7#! Wait: Kh7? No, N on f6 protects h7! Escape squares of Kg7: f8 (R on h8? no, R moved to h7!), g8 (covered by N on f6!), h8 (covered by N on f6!), h6 (covered by R? no, g6 covered by N? no).
# True textbook Hook Mate: Black K on f6, Black P on e6, White N on e5 (protected by P on d4), White R on f8 -> Rf7#? Wait: from e5 N guards g6, g4, f7, d7, c6, c4, d3, f3. If White R goes to f7, Kf6 escape squares: e7 (covered by Rf7), g7 (covered by Rf7), g6 (covered by Ne5!), g5 (need White P on f4 or Black P on g5!), e5 (protected by d4!).
CLEAN_50[18] = (
    "Hook Mate", "Rook, Knight & Pawn", "Simplest Form",
    "8/R7/4pk2/4N1p1/3P4/8/8/6K1 w - - 0 1", ["a7f7"],
    "Rook, knight, and pawn form the classic Hook Mate around the central king."
)
CLEAN_50[19] = (
    "Hook Mate", "In-Situ Hook Trap", "In-Situ",
    "r7/R6p/4pk2/4N1p1/3P4/8/PPP3PP/6K1 w - - 0 1", ["a7f7"],
    "Supported by the d4 pawn and e5 knight, Rf7# snaps the Hook Mate shut."
)

# #23-24: Dovetail Mate (Black K on e5, Black pieces on e6 and f5; White Qd4# protected by e3!)
CLEAN_50[22] = (
    "Dovetail Mate", "Diagonal Queen Kiss", "Simplest Form",
    "8/8/4r3/4kp2/8/3QP3/8/6K1 w - - 0 1", ["d3d4"],
    "Two friendly pieces sit behind the king like a dovetail while the queen mates diagonally."
)
CLEAN_50[23] = (
    "Dovetail Mate", "In-Situ Cozio Finish", "In-Situ",
    "r4r2/ppp3pp/4r3/4kp2/8/3QP3/PPP2PPP/6K1 w - - 0 1", ["d3d4"],
    "Protected by the e3 pawn, Qd4# seals the textbook Dovetail Mate."
)

# #27: Damiano's Mate
CLEAN_50[26] = (
    "Damiano's Mate", "Pawn & Queen Corner", "Simplest Form",
    "5rk1/5pp1/6P1/8/8/8/7Q/6K1 w - - 0 1", ["h2h7"],
    "A pawn on g6 supports the queen crashing into h7 for Damiano's Mate."
)

# #36: Pillsbury's Mate In-Situ
CLEAN_50[35] = (
    "Pillsbury's Mate", "In-Situ Rook-Bishop Pinch", "In-Situ",
    "r3r2k/pp3p1p/2p5/8/8/2B5/PPP4P/6RK w - - 0 1", ["c3f6"],
    "The g1 rook pins the king to the h-file so Bf6# delivers Pillsbury's Mate."
)

# #43: Blind Swine Mate Simplest Form (Black K on g8, Black R on f8; White R on b7, R on g7 -> Rxg7? No, 2 rooks on 7th: 6k1/1R4R1/8/8/8/8/8/6K1 -> Rg7h7 Kf8 Rb8#!)
CLEAN_50[42] = (
    "Blind Swine Mate", "Two Rooks on the 7th", "Simplest Form",
    "6k1/1R4R1/8/8/8/8/8/6K1 w - - 0 1", ["g7h7", "g8f8", "b7b8"],
    "Two rooks on the 7th rank sweep the back rank cleanly—coined by Dawid Janowski."
)

# #49: Two Bishops Mate Simplest Form (Black K on h8, White K on f7, White B on e4, White B on d4 -> Be5#? No: K on f6, B on e4, B on c4 -> Bd5#? Put Black K on h8, White K on g6, White B on d3 (light) & B on c3 (dark) -> Bc4 (wait g8!) -> Bf6#! Let's check: 7k/8/6K1/8/2B5/2B5/8/8 -> White K on g6 covers f7, g7, h7; Bc4 covers g8; Bc3->Bf6#!)
CLEAN_50[48] = (
    "Two Bishops Mate", "Corner Diagonal Squeeze", "Simplest Form",
    "7k/8/6K1/8/2B5/2B5/8/8 w - - 0 1", ["c3f6"],
    "The king boxes the corner while the two bishops slice parallel diagonals for Bf6#."
)


def mirror_uci(uci_str: str) -> str:
    mv = chess.Move.from_uci(uci_str)
    from_sq = chess.square_mirror(mv.from_square)
    to_sq = chess.square_mirror(mv.to_square)
    return chess.Move(from_sq, to_sq, promotion=mv.promotion).uci()


def verify_and_build(entry_id: str, motif: str, variant: str, form: str, fen: str, uci_list: list[str], note: str):
    board = chess.Board(fen)
    moves_out = []
    for uci in uci_list:
        mv = chess.Move.from_uci(uci)
        if mv not in board.legal_moves:
            raise ValueError(f"ILLEGAL MOVE {uci} in {entry_id} ({motif} - {variant}) at FEN {board.fen()}")
        san = board.san(mv)
        item = {
            "from": chess.square_name(mv.from_square),
            "to": chess.square_name(mv.to_square),
            "san": san,
        }
        if mv.promotion:
            item["promo"] = chess.piece_symbol(mv.promotion).lower()
        if board.is_castling(mv):
            rank = "1" if board.turn == chess.WHITE else "8"
            if chess.square_file(mv.to_square) == 6:
                item["castle"] = {"from": f"h{rank}", "to": f"f{rank}"}
            else:
                item["castle"] = {"from": f"a{rank}", "to": f"d{rank}"}
        board.push(mv)
        moves_out.append(item)

    if not board.is_checkmate():
        raise ValueError(f"NOT CHECKMATE at end of {entry_id} ({motif} - {variant})! Final FEN: {board.fen()}")

    winner = "White" if board.turn == chess.BLACK else "Black"
    mated_king_sq = chess.square_name(board.king(board.turn))

    return {
        "id": entry_id,
        "motif": motif,
        "variant": variant,
        "form": form,
        "winner": winner,
        "fen": fen,
        "matedKing": mated_king_sq,
        "moves": moves_out,
        "note": note,
    }


def main():
    all_mates = []
    for idx, (motif, variant, form, fen, ucis, note) in enumerate(CLEAN_50, start=1):
        m1 = verify_and_build(f"mate_{idx:02d}_a", motif, variant, form, fen, ucis, note)
        all_mates.append(m1)

        b_mir = chess.Board(fen).mirror()
        mir_ucis = [mirror_uci(u) for u in ucis]
        mir_variant = f"{variant} (Reversed Colors)"
        m2 = verify_and_build(f"mate_{idx:02d}_b", motif, mir_variant, form, b_mir.fen(), mir_ucis, note)
        all_mates.append(m2)

    white_cnt = sum(1 for m in all_mates if m["winner"] == "White")
    black_cnt = sum(1 for m in all_mates if m["winner"] == "Black")
    assert len(all_mates) == 100, f"Expected 100 mates, got {len(all_mates)}"
    assert white_cnt == 50 and black_cnt == 50, f"Expected 50W/50B, got {white_cnt}W/{black_cnt}B"

    js = "// Auto-generated & mathematically verified by scripts/generate_classic_mates.py (python-chess)\n"
    js += f"// Total: {len(all_mates)} verified classic checkmates ({white_cnt} White to mate, {black_cnt} Black to mate)\n\n"
    js += "export const CLASSIC_MATES = " + json.dumps(all_mates, indent=2) + ";\n"

    with open(OUT_PATH, "w", encoding="utf-8") as fp:
        fp.write(js)
    print(f"SUCCESS: Verified and wrote {len(all_mates)} classic checkmates ({white_cnt} White, {black_cnt} Black) to {OUT_PATH}")


if __name__ == "__main__":
    main()
