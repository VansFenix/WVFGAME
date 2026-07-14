import { DOM } from '../dom.js';
import { state } from '../state.js';
import { SFX } from '../sound.js';
import { makeDiv } from '../utils.js';
import { addCoins } from '../wallet.js';
import { trackGamePlayed } from '../auth.js';

export function initTicTacToe() {
  const wrap = makeDiv('ttt-wrapper');

  const mode = document.createElement('div');
  mode.className = 'ttt-mode';
  mode.innerHTML = `
    <span>🤝 Друг</span>
    <input type="checkbox" class="toggle" id="ai-toggle">
    <span>🤖 ИИ</span>
  `;
  wrap.appendChild(mode);

  const board = document.createElement('div');
  board.className = 'ttt-board';
  wrap.appendChild(board);

  const status = document.createElement('div');
  status.className = 'ttt-status';
  status.textContent = 'Ход: X';
  wrap.appendChild(status);

  const restartBtn = document.createElement('button');
  restartBtn.className = 'ttt-restart';
  restartBtn.textContent = '🔄 Новая игра';
  restartBtn.addEventListener('click', () => { DOM.gameContainer.innerHTML = ''; initTicTacToe(); });
  wrap.appendChild(restartBtn);

  DOM.gameContainer.appendChild(wrap);

  let cells = Array(9).fill('');
  let current = 'X';
  let over = false;
  let vsAI = false;

  document.getElementById('ai-toggle').addEventListener('change', function () {
    vsAI = this.checked;
    resetGame();
  });

  function resetGame() {
    cells.fill('');
    current = 'X';
    over = false;
    status.textContent = 'Ход: X';
    document.querySelectorAll('.ttt-cell').forEach(cell => {
      cell.textContent = '';
      cell.className = 'ttt-cell';
    });
  }

  function checkWinner(b) {
    const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for (const [a, bb, cc] of wins) {
      if (b[a] && b[a] === b[bb] && b[bb] === b[cc]) return { winner: b[a], line: [a, bb, cc] };
    }
    return b.includes('') ? null : { winner: 'draw', line: null };
  }

  function getEmpty(b) { return b.map((v, i) => v === '' ? i : null).filter(v => v !== null); }

  function minimax(board, depth, isMax) {
    const res = checkWinner(board);
    if (res) {
      if (res.winner === 'O') return 10 - depth;
      if (res.winner === 'X') return depth - 10;
      return 0;
    }
    const empty = getEmpty(board);
    if (!empty.length) return 0;

    if (isMax) {
      let best = -Infinity;
      for (const i of empty) {
        board[i] = 'O';
        best = Math.max(best, minimax(board, depth + 1, false));
        board[i] = '';
      }
      return best;
    } else {
      let best = Infinity;
      for (const i of empty) {
        board[i] = 'X';
        best = Math.min(best, minimax(board, depth + 1, true));
        board[i] = '';
      }
      return best;
    }
  }

  function aiMove() {
    if (over) return;
    const empty = getEmpty(cells);
    if (!empty.length) return;

    let bestScore = -Infinity;
    let bestMove = empty[0];

    for (const i of empty) {
      cells[i] = 'O';
      const score = minimax(cells, 0, false);
      cells[i] = '';
      if (score > bestScore) { bestScore = score; bestMove = i; }
    }

    makeMove(bestMove, 'O');
  }

  function makeMove(idx, player) {
    if (cells[idx] || over) return false;
    cells[idx] = player;
    const el = document.querySelectorAll('.ttt-cell')[idx];
    el.textContent = player;
    el.className = `ttt-cell ${player === 'X' ? 'x-move' : 'o-move'}`;

    const res = checkWinner(cells);
    if (res) {
      over = true;
      if (res.winner === 'draw') {
        status.textContent = '🤝 Ничья!';
      } else {
        status.textContent = `🎉 ${res.winner} победил!`;
        res.line.forEach(i => document.querySelectorAll('.ttt-cell')[i].classList.add('win-cell'));
        if (res.winner === 'X') { addCoins(5, 'Крестики-Нолики'); SFX.win(); }
        trackGamePlayed('tictactoe');
      }
      return true;
    }
    current = current === 'X' ? 'O' : 'X';
    status.textContent = `Ход: ${current}`;
    return true;
  }

  for (let i = 0; i < 9; i++) {
    const cell = document.createElement('button');
    cell.className = 'ttt-cell';
    cell.addEventListener('click', () => {
      if (over || (vsAI && current === 'O')) return;
      if (makeMove(i, current) && vsAI && !over && current === 'O') {
        setTimeout(aiMove, 250);
      }
    });
    board.appendChild(cell);
  }

  state.currentCleanup = () => {};
}
