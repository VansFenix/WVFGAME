import { DOM } from '../dom.js';
import { state } from '../state.js';
import { SFX } from '../sound.js';
import { createCanvas, makeDiv, addTouchClick } from '../utils.js';
import { addCoins } from '../wallet.js';
import { trackGamePlayed } from '../auth.js';

const PIECE_VALUES = { p: 1, n: 3, b: 3.2, r: 5, q: 9, k: 0 };

// Piece-square tables (white's perspective, flip for black)
const PST = {
  p: [
    [ 0, 0, 0, 0, 0, 0, 0, 0],
    [50,50,50,50,50,50,50,50],
    [10,10,20,30,30,20,10,10],
    [ 5, 5,10,25,25,10, 5, 5],
    [ 0, 0, 0,20,20, 0, 0, 0],
    [ 5,-5,-10, 0, 0,-10,-5, 5],
    [ 5,10,10,-20,-20,10,10, 5],
    [ 0, 0, 0, 0, 0, 0, 0, 0]
  ],
  n: [
    [-50,-40,-30,-30,-30,-30,-40,-50],
    [-40,-20, 0, 0, 0, 0,-20,-40],
    [-30, 0, 10,15,15,10, 0,-30],
    [-30, 5,15,20,20,15, 5,-30],
    [-30, 0,15,20,20,15, 0,-30],
    [-30, 5,10,15,15,10, 5,-30],
    [-40,-20, 0, 5, 5, 0,-20,-40],
    [-50,-40,-30,-30,-30,-30,-40,-50]
  ],
  b: [
    [-20,-10,-10,-10,-10,-10,-10,-20],
    [-10, 0, 0, 0, 0, 0, 0,-10],
    [-10, 0, 5,10,10, 5, 0,-10],
    [-10, 5, 5,10,10, 5, 5,-10],
    [-10, 0,10,10,10,10, 0,-10],
    [-10,10,10,10,10,10,10,-10],
    [-10, 5, 0, 0, 0, 0, 5,-10],
    [-20,-10,-10,-10,-10,-10,-10,-20]
  ],
  r: [
    [ 0, 0, 0, 0, 0, 0, 0, 0],
    [ 5,10,10,10,10,10,10, 5],
    [-5, 0, 0, 0, 0, 0, 0,-5],
    [-5, 0, 0, 0, 0, 0, 0,-5],
    [-5, 0, 0, 0, 0, 0, 0,-5],
    [-5, 0, 0, 0, 0, 0, 0,-5],
    [-5, 0, 0, 0, 0, 0, 0,-5],
    [ 0, 0, 0, 5, 5, 0, 0, 0]
  ],
  q: [
    [-20,-10,-10, -5, -5,-10,-10,-20],
    [-10, 0, 0, 0, 0, 0, 0,-10],
    [-10, 0, 5, 5, 5, 5, 0,-10],
    [ -5, 0, 5, 5, 5, 5, 0, -5],
    [ 0, 0, 5, 5, 5, 5, 0, -5],
    [-10, 5, 5, 5, 5, 5, 0,-10],
    [-10, 0, 5, 0, 0, 0, 0,-10],
    [-20,-10,-10, -5, -5,-10,-10,-20]
  ],
  k: [
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-20,-30,-30,-40,-40,-30,-30,-20],
    [-10,-20,-20,-20,-20,-20,-20,-10],
    [ 20, 20, 0, 0, 0, 0, 20, 20],
    [ 20, 30, 10, 0, 0, 10, 30, 20]
  ]
};

export function initChess() {
  const S = 65, PAD = 6, BOARD = 8;
  const SIZE = BOARD * S + PAD * 2;

  const wrap = makeDiv('chess-wrap');
  const c = createCanvas(SIZE, SIZE);
  c.id = 'chess-canvas';
  wrap.appendChild(c);

  const status = document.createElement('div');
  status.className = 'chess-status';
  status.id = 'chess-status';
  status.innerHTML = 'Твой ход <span class="highlight">(белые)</span>';
  wrap.appendChild(status);

  const info = document.createElement('div');
  info.className = 'chess-info';
  info.innerHTML = '<button id="chess-restart">🔄 Заново</button>';
  wrap.appendChild(info);

  DOM.gameContainer.appendChild(wrap);

  const ctx = c.getContext('2d');
  let board = [], selected = null, turn = 'white', over = false;
  let moves = [];

  const PIECES = {
    'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
    'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'
  };

  function initBoard() {
    board = [
      ['r','n','b','q','k','b','n','r'],
      ['p','p','p','p','p','p','p','p'],
      [0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0],
      ['P','P','P','P','P','P','P','P'],
      ['R','N','B','Q','K','B','N','R']
    ];
    selected = null; turn = 'white'; over = false; moves = [];
    status.innerHTML = 'Твой ход <span class="highlight">(белые)</span>';
    DOM.gameScore.textContent = '';
  }

  function isWhite(p) { return p && p === p.toUpperCase(); }
  function isBlack(p) { return p && p === p.toLowerCase(); }
  function sameColor(a, b) { return (isWhite(a) && isWhite(b)) || (isBlack(a) && isBlack(b)); }
  function inBounds(r, c) { return r >= 0 && r < 8 && c >= 0 && c < 8; }

  function cloneBoard(b) { return b.map(r => [...r]); }

  function findKing(b, color) {
    const k = color === 'white' ? 'K' : 'k';
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++)
        if (b[r][c] === k) return { r, c };
    return null;
  }

  function isUnderAttack(b, r, c, byColor) {
    for (let rr = 0; rr < 8; rr++)
      for (let cc = 0; cc < 8; cc++) {
        const p = b[rr][cc];
        if (!p) continue;
        if (byColor === 'white' && isBlack(p)) continue;
        if (byColor === 'black' && isWhite(p)) continue;
        const targets = pseudoMoves(b, rr, cc);
        if (targets.some(t => t.r === r && t.c === c)) return true;
      }
    return false;
  }

  function inCheck(b, color) {
    const king = findKing(b, color);
    if (!king) return false;
    return isUnderAttack(b, king.r, king.c, color === 'white' ? 'black' : 'white');
  }

  function pseudoMoves(b, r, c) {
    const p = b[r][c];
    if (!p) return [];
    const moves = [];
    const white = isWhite(p);
    const piece = p.toLowerCase();

    const addIf = (nr, nc) => { if (inBounds(nr, nc) && (!b[nr][nc] || !sameColor(p, b[nr][nc]))) moves.push({ r: nr, c: nc }); };
    const addSlide = (dirs) => { for (const [dr, dc] of dirs) { for (let i = 1; i < 8; i++) { const nr = r + dr * i, nc = c + dc * i; if (!inBounds(nr, nc)) break; if (b[nr][nc]) { if (!sameColor(p, b[nr][nc])) moves.push({ r: nr, c: nc }); break; } moves.push({ r: nr, c: nc }); } } };

    switch (piece) {
      case 'p': {
        const dir = white ? -1 : 1;
        const start = white ? 6 : 1;
        if (inBounds(r + dir, c) && !b[r + dir][c]) {
          moves.push({ r: r + dir, c });
          if (r === start && !b[r + dir * 2][c]) moves.push({ r: r + dir * 2, c });
        }
        for (const dc of [-1, 1]) {
          const nr = r + dir, nc = c + dc;
          if (inBounds(nr, nc) && b[nr][nc] && !sameColor(p, b[nr][nc])) moves.push({ r: nr, c: nc });
        }
        break;
      }
      case 'n': { const jumps = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]; for (const [dr, dc] of jumps) addIf(r + dr, c + dc); break; }
      case 'b': addSlide([[-1,-1],[-1,1],[1,-1],[1,1]]); break;
      case 'r': addSlide([[-1,0],[1,0],[0,-1],[0,1]]); break;
      case 'q': addSlide([[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]]); break;
      case 'k': { for (const [dr, dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) addIf(r + dr, c + dc); break; }
    }
    return moves;
  }

  function legalMoves(b, r, c) {
    const p = b[r][c];
    if (!p) return [];
    const raw = pseudoMoves(b, r, c);
    const legal = [];
    for (const m of raw) {
      const nb = cloneBoard(b);
      nb[m.r][m.c] = nb[r][c];
      nb[r][c] = 0;
      const pp = nb[m.r][m.c].toLowerCase();
      if (pp === 'p' && (m.r === 0 || m.r === 7)) nb[m.r][m.c] = isWhite(p) ? 'Q' : 'q';
      if (!inCheck(nb, isWhite(p) ? 'white' : 'black')) legal.push(m);
    }
    return legal;
  }

  function getAllLegal(b, color) {
    const all = [];
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++) {
        const p = b[r][c];
        if (!p) continue;
        if ((color === 'white' && isWhite(p)) || (color === 'black' && isBlack(p)))
          for (const m of legalMoves(b, r, c)) all.push({ sr: r, sc: c, dr: m.r, dc: m.c });
      }
    return all;
  }

  function pstVal(piece, r, c, white) {
    const p = piece.toLowerCase();
    const tbl = PST[p];
    if (!tbl) return 0;
    return white ? tbl[r][c] : tbl[7 - r][7 - c];
  }

  function evalBoard(b) {
    let score = 0;
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++) {
        const p = b[r][c];
        if (!p) continue;
        const v = PIECE_VALUES[p.toLowerCase()] || 0;
        const w = isWhite(p);
        const bonus = pstVal(p, r, c, w);
        score += w ? (v * 100 + bonus) : -(v * 100 + bonus);
      }
    return score;
  }

  function makeMoveOnBoard(b, m) {
    const nb = cloneBoard(b);
    nb[m.dr][m.dc] = nb[m.sr][m.sc];
    nb[m.sr][m.sc] = 0;
    const pp = nb[m.dr][m.dc].toLowerCase();
    if (pp === 'p' && (m.dr === 0 || m.dr === 7)) nb[m.dr][m.dc] = isWhite(nb[m.dr][m.dc]) ? 'Q' : 'q';
    return nb;
  }

  // Minimax with alpha-beta at depth 2
  function minimax(b, depth, alpha, beta, isMax) {
    const color = isMax ? 'black' : 'white';
    const moves = getAllLegal(b, color);

    if (depth === 0 || moves.length === 0) {
      if (moves.length === 0) {
        if (inCheck(b, color)) return isMax ? -100000 + (3 - depth) * 1000 : 100000 - (3 - depth) * 1000;
        return 0;
      }
      return evalBoard(b);
    }

    if (isMax) {
      let best = -Infinity;
      moves.sort((a, bb) => {
        const capture = b[bb.dr][bb.dc];
        const capA = b[a.dr][a.dc];
        return (PIECE_VALUES[(capA||'').toLowerCase()]||0) - (PIECE_VALUES[(capture||'').toLowerCase()]||0);
      });
      for (const m of moves) {
        const nb = makeMoveOnBoard(b, m);
        const score = minimax(nb, depth - 1, alpha, beta, false);
        best = Math.max(best, score);
        alpha = Math.max(alpha, score);
        if (alpha >= beta) break;
      }
      return best;
    } else {
      let best = Infinity;
      moves.sort((a, bb) => {
        const capture = b[bb.dr][bb.dc];
        const capA = b[a.dr][a.dc];
        return (PIECE_VALUES[(capture||'').toLowerCase()]||0) - (PIECE_VALUES[(capA||'').toLowerCase()]||0);
      });
      for (const m of moves) {
        const nb = makeMoveOnBoard(b, m);
        const score = minimax(nb, depth - 1, alpha, beta, true);
        best = Math.min(best, score);
        beta = Math.min(beta, score);
        if (alpha >= beta) break;
      }
      return best;
    }
  }

  function aiMove() {
    const all = getAllLegal(board, 'black');
    if (!all.length) return null;

    // Sort captures first for better pruning
    all.sort((a, bb) => {
      const cap = board[bb.dr][bb.dc];
      const capA = board[a.dr][a.dc];
      return (PIECE_VALUES[(capA||'').toLowerCase()]||0) - (PIECE_VALUES[(cap||'').toLowerCase()]||0);
    });

    let bestScore = -Infinity;
    let bestMove = all[0];

    for (const m of all) {
      const nb = makeMoveOnBoard(board, m);
      const score = minimax(nb, 2, -Infinity, Infinity, false);
      if (score > bestScore) { bestScore = score; bestMove = m; }
    }
    return bestMove;
  }

  function handleClick(e) {
    if (over || turn !== 'white') return;
    const r = c.getBoundingClientRect();
    const col = Math.floor(((e.clientX - r.left) * (c.width / r.width) - PAD) / S);
    const row = Math.floor(((e.clientY - r.top) * (c.height / r.height) - PAD) / S);
    if (col < 0 || col >= 8 || row < 0 || row >= 8) return;

    if (selected) {
      const hit = moves.find(m => m.r === row && m.c === col);
      if (hit) {
        board = makeMoveOnBoard(board, { sr: selected.r, sc: selected.c, dr: row, dc: col });
        selected = null; moves = [];
        turn = 'black';
        draw();
        status.innerHTML = 'Думает ИИ <span class="highlight">(чёрные)</span>';
        setTimeout(aiTurn, 200);
        return;
      }
      selected = null; moves = []; draw();
    }

    const p = board[row][col];
    if (!p || !isWhite(p)) return;
    const leg = legalMoves(board, row, col);
    if (leg.length) { selected = { r: row, c: col }; moves = leg; draw(); }
  }

  function aiTurn() {
    if (over) return;
    if (inCheck(board, 'black')) status.innerHTML = 'Шах! <span class="highlight">(чёрные)</span> ⏳';
    const all = getAllLegal(board, 'black');
    if (!all.length) {
      over = true;
      if (inCheck(board, 'black')) { status.innerHTML = '🎉 Мат! Ты победил!'; SFX.win(); addCoins(15, 'Шахматы'); trackGamePlayed('chess'); }
      else status.innerHTML = '🤝 Пат!';
      draw(); return;
    }
    const m = aiMove();
    if (!m) { over = true; status.innerHTML = '🎉 Ты победил!'; SFX.win(); addCoins(15, 'Шахматы'); trackGamePlayed('chess'); draw(); return; }
    board = makeMoveOnBoard(board, m);

    draw();

    if (inCheck(board, 'white')) status.innerHTML = 'Шах! <span class="check">(тебе)</span>';
    else status.innerHTML = 'Твой ход <span class="highlight">(белые)</span>';

    const whiteMoves = getAllLegal(board, 'white');
    if (!whiteMoves.length) {
      over = true;
      status.innerHTML = inCheck(board, 'white') ? '💀 Мат! ИИ победил!' : '🤝 Пат!';
      return;
    }
    turn = 'white';
  }

  function draw() {
    ctx.clearRect(0, 0, SIZE, SIZE);
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++) {
        ctx.fillStyle = (r + c) % 2 === 0 ? '#f0d9b5' : '#b58863';
        ctx.fillRect(PAD + c * S, PAD + r * S, S, S);
      }

    if (selected) {
      ctx.fillStyle = 'rgba(255,255,0,0.3)';
      ctx.fillRect(PAD + selected.c * S, PAD + selected.r * S, S, S);
      for (const m of moves) {
        ctx.fillStyle = board[m.r][m.c] ? 'rgba(255,0,0,0.3)' : 'rgba(0,0,0,0.15)';
        ctx.beginPath();
        ctx.arc(PAD + m.c * S + S / 2, PAD + m.r * S + S / 2, board[m.r][m.c] ? S / 2 : 8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.font = `${S * 0.72}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p) {
          ctx.fillStyle = isWhite(p) ? '#fff' : '#1a1a1a';
          ctx.shadowColor = 'rgba(0,0,0,0.2)';
          ctx.shadowBlur = 4;
          ctx.fillText(PIECES[p], PAD + c * S + S / 2, PAD + r * S + S / 2 + 2);
          ctx.shadowBlur = 0;
        }
      }
  }

  c.addEventListener('click', handleClick);
  addTouchClick(c);

  document.getElementById('chess-restart').addEventListener('click', () => { DOM.gameContainer.innerHTML = ''; initChess(); });
  initBoard();
  draw();
  state.currentCleanup = () => {};
}
