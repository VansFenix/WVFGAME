import { DOM } from '../dom.js';
import { state } from '../state.js';
import { SFX } from '../sound.js';
import { createCanvas, makeDiv, addTouchClick } from '../utils.js';
import { addCoins } from '../wallet.js';
import { trackGamePlayed } from '../auth.js';

export function initCheckers() {
  const S = 60, PAD = 10, BOARD = 8;
  const SIZE = BOARD * S + PAD * 2;

  const wrap = makeDiv('checkers-wrap');

  const c = createCanvas(SIZE, SIZE, 'checkers-canvas');
  c.id = 'checkers-canvas';
  wrap.appendChild(c);

  const status = document.createElement('div');
  status.className = 'checkers-turn';
  status.id = 'chk-status';
  status.innerHTML = 'Твой ход <span class="highlight">(белые)</span>';
  wrap.appendChild(status);

  const bottom = document.createElement('div');
  bottom.className = 'checkers-info';
  bottom.innerHTML = '<button class="checkers-restart">🔄 Заново</button>';
  wrap.appendChild(bottom);

  DOM.gameContainer.appendChild(wrap);

  const ctx = c.getContext('2d');
  let board = [], selected = null, turn = 'white', over = false, mustJump = false;

  function initBoard() {
    board = Array.from({length: BOARD}, () => Array(BOARD).fill(null));
    for (let r = 0; r < BOARD; r++)
      for (let cc = 0; cc < BOARD; cc++)
        if ((r + cc) % 2 === 1) {
          if (r < 3) board[r][cc] = { color: 'black', king: false };
          else if (r > 4) board[r][cc] = { color: 'white', king: false };
        }
    selected = null; turn = 'white'; over = false; mustJump = false;
    status.innerHTML = 'Твой ход <span class="highlight">(белые)</span>';
    DOM.gameScore.textContent = '';
  }

  function pieceMoves(sr, sc, jumpOnly) {
    const p = board[sr][sc];
    if (!p) return [];
    const moves = [];
    const dirs = p.king ? [-1, 1] : (p.color === 'white' ? [-1] : [1]);
    for (const dr of dirs)
      for (const dc of [-1, 1]) {
        const nr = sr + dr, nc = sc + dc;
        if (nr < 0 || nr >= BOARD || nc < 0 || nc >= BOARD) continue;
        const t = board[nr][nc];
        if (!t) { if (!jumpOnly) moves.push({ dr: nr, dc: nc, jump: false }); }
        else if (t.color !== p.color) {
          const jr = sr + dr * 2, jc = sc + dc * 2;
          if (jr >= 0 && jr < BOARD && jc >= 0 && jc < BOARD && !board[jr][jc])
            moves.push({ dr: jr, dc: jc, jump: true, overR: nr, overC: nc });
        }
      }
    return moves;
  }

  function allMoves(color, jumpOnly) {
    const all = [];
    for (let sr = 0; sr < BOARD; sr++)
      for (let sc = 0; sc < BOARD; sc++) {
        if (!board[sr][sc] || board[sr][sc].color !== color) continue;
        for (const m of pieceMoves(sr, sc, jumpOnly))
          all.push({ sr, sc, dr: m.dr, dc: m.dc, jump: m.jump, overR: m.overR, overC: m.overC });
      }
    return all;
  }

  function doMove(sr, sc, dr, dc, jump, overR, overC) {
    const piece = board[sr][sc];
    board[sr][sc] = null;
    board[dr][dc] = piece;
    if (jump) board[overR][overC] = null;
    if ((dr === 0 && piece.color === 'white') || (dr === 7 && piece.color === 'black')) piece.king = true;
  }

  function evalBoard(b) {
    let score = 0;
    for (let r = 0; r < BOARD; r++)
      for (let cc = 0; cc < BOARD; cc++) {
        const p = b[r][cc];
        if (!p) continue;
        const v = p.king ? 3 : 1;
        score += (p.color === 'black' ? 1 : -1) * v;
        if (!p.king) score += (p.color === 'black' ? (7 - r) : -r) * 0.05;
      }
    return score;
  }

  function cloneBoard(b) { return b.map(r => r.map(p => p ? { ...p } : null)); }

  function negamax(b, depth, alpha, beta, color) {
    const moves = allMoves(color, false);
    if (!moves.length || depth === 0) return evalBoard(b) * (color === 'black' ? 1 : -1);
    let best = -Infinity;
    for (const m of moves) {
      const snap = cloneBoard(b);
      doMove(m.sr, m.sc, m.dr, m.dc, m.jump, m.overR, m.overC);
      const score = -negamax(b, depth - 1, -beta, -alpha, color === 'black' ? 'white' : 'black');
      b = snap;
      best = Math.max(best, score);
      alpha = Math.max(alpha, score);
      if (alpha >= beta) break;
    }
    return best;
  }

  function bestAIMove() {
    const moves = allMoves('black', false);
    if (!moves.length) return null;
    let bestScore = -Infinity, bestMove = null;
    for (const m of moves) {
      const snap = cloneBoard(board);
      doMove(m.sr, m.sc, m.dr, m.dc, m.jump, m.overR, m.overC);
      const score = -negamax(board, 3, -Infinity, Infinity, 'white');
      board = snap;
      if (score > bestScore) { bestScore = score; bestMove = m; }
    }
    return bestMove;
  }

  function handleClick(e) {
    if (over || turn !== 'white') return;
    const r = c.getBoundingClientRect();
    const col = Math.floor(((e.clientX - r.left) * (c.width / r.width) - PAD) / S);
    const row = Math.floor(((e.clientY - r.top) * (c.height / r.height) - PAD) / S);
    if (col < 0 || col >= BOARD || row < 0 || row >= BOARD) return;

    if (selected) {
      const match = pieceMoves(selected.sr, selected.sc, mustJump).find(m => m.dr === row && m.dc === col);
      if (match) {
        doMove(selected.sr, selected.sc, row, col, match.jump, match.overR, match.overC);
        selected = null; mustJump = false; turn = 'black';
        draw();
        status.innerHTML = 'Думает ИИ <span class="highlight">(чёрные)</span>';
        setTimeout(aiTurn, 300);
        return;
      }
      selected = null; draw();
    }

    const p = board[row][col];
    if (!p || p.color !== 'white') return;

    const jumps = allMoves('white', true);
    if (jumps.length) {
      if (!jumps.some(m => m.sr === row && m.sc === col)) return;
      const m = pieceMoves(row, col, true);
      if (m.length) { selected = { sr: row, sc: col }; mustJump = true; draw(); }
      return;
    }
    const m = pieceMoves(row, col, false);
    if (m.length) { selected = { sr: row, sc: col }; mustJump = false; draw(); }
  }

  function aiTurn() {
    if (over) return;
    const jumps = allMoves('black', true);
    let aiMove;

    if (jumps.length) {
      let best = -Infinity;
      for (const m of jumps) {
        const snap = cloneBoard(board);
        doMove(m.sr, m.sc, m.dr, m.dc, m.jump, m.overR, m.overC);
        const score = -negamax(board, 2, -Infinity, Infinity, 'white');
        board = snap;
        if (score > best) { best = score; aiMove = m; }
      }
    } else {
      aiMove = bestAIMove();
    }

    if (!aiMove) { over = true; status.innerHTML = '🎉 Ты победил!'; SFX.win(); addCoins(10, 'Шашки'); trackGamePlayed('checkers'); draw(); return; }

    doMove(aiMove.sr, aiMove.sc, aiMove.dr, aiMove.dc, aiMove.jump, aiMove.overR, aiMove.overC);
    draw();

    if (!allMoves('white', false).length) { over = true; status.innerHTML = '💀 ИИ победил!'; return; }

    turn = 'white'; mustJump = false; selected = null;
    const pj = allMoves('white', true);
    status.innerHTML = pj.length ? 'Обязательно бить! <span class="highlight">(белые)</span>' : 'Твой ход <span class="highlight">(белые)</span>';
    if (pj.length) mustJump = true;
  }

  function draw() {
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, SIZE, SIZE);

    for (let r = 0; r < BOARD; r++)
      for (let cc = 0; cc < BOARD; cc++) {
        const x = PAD + cc * S, y = PAD + r * S;
        ctx.fillStyle = (r + cc) % 2 === 0 ? '#2a2a44' : '#1a1a2e';
        ctx.fillRect(x, y, S, S);
      }

    if (selected) {
      ctx.fillStyle = 'rgba(0,212,230,0.15)';
      ctx.fillRect(PAD + selected.sc * S, PAD + selected.sr * S, S, S);
      ctx.strokeStyle = 'rgba(0,212,230,0.4)';
      ctx.lineWidth = 2;
      ctx.strokeRect(PAD + selected.sc * S + 1, PAD + selected.sr * S + 1, S - 2, S - 2);
      for (const m of pieceMoves(selected.sr, selected.sc, mustJump)) {
        ctx.fillStyle = m.jump ? 'rgba(255,50,50,0.25)' : 'rgba(0,212,230,0.12)';
        ctx.beginPath();
        ctx.arc(PAD + m.dc * S + S / 2, PAD + m.dr * S + S / 2, 10, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    for (let r = 0; r < BOARD; r++)
      for (let cc = 0; cc < BOARD; cc++) {
        const p = board[r][cc];
        if (!p) continue;
        const x = PAD + cc * S + S / 2, y = PAD + r * S + S / 2;
        const g = ctx.createRadialGradient(x - 4, y - 4, 2, x, y, S / 2 - 4);
        g.addColorStop(0, p.color === 'white' ? '#f0f0f0' : '#555');
        g.addColorStop(1, p.color === 'white' ? '#c0c0c0' : '#1a1a1a');
        ctx.fillStyle = g;
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(x, y, S / 2 - 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        if (p.king) {
          ctx.fillStyle = p.color === 'white' ? '#ffc800' : '#ff4444';
          ctx.font = '20px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('★', x, y);
        }
      }
  }

  c.addEventListener('click', handleClick);
  addTouchClick(c);
  bottom.querySelector('.checkers-restart').addEventListener('click', () => { DOM.gameContainer.innerHTML = ''; initCheckers(); });
  initBoard();
  draw();
  state.currentCleanup = () => {};
}
