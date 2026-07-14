import { DOM } from '../dom.js';
import { state } from '../state.js';
import { SFX } from '../sound.js';
import { createCanvas, makeDiv, shuffleArray, addTouchClick } from '../utils.js';
import { showOverlay } from '../ui.js';
import { addCoins } from '../wallet.js';
import { trackGamePlayed } from '../auth.js';

export function initSudoku() {
  const S = 58, PAD = 4, SUD = 9;
  const SIZE = SUD * S + PAD * 2;
  const BOX = 3;

  const wrap = makeDiv('sudoku-wrap');
  const c = createCanvas(SIZE, SIZE);
  c.id = 'sudoku-canvas';
  wrap.appendChild(c);

  const hud = document.createElement('div');
  hud.className = 'sudoku-hud';
  hud.innerHTML = `
    <div>⏱ <span class="timer" id="sud-timer">0</span></div>
    <div>❌ Ошибки: <span class="mistakes" id="sud-mistakes">0</span>/3</div>
    <div>📌 <span id="sud-progress">0</span>/81</div>
  `;
  wrap.appendChild(hud);

  const numpad = document.createElement('div');
  numpad.className = 'sudoku-numpad';
  for (let i = 1; i <= 9; i++) {
    const btn = document.createElement('button');
    btn.textContent = i;
    btn.dataset.n = i;
    numpad.appendChild(btn);
  }
  const erase = document.createElement('button');
  erase.textContent = '✕';
  erase.className = 'erase';
  erase.dataset.n = '0';
  numpad.appendChild(erase);
  wrap.appendChild(numpad);

  const controls = document.createElement('div');
  controls.className = 'sudoku-controls';
  controls.innerHTML = '<button id="sud-hint">💡 Подсказка</button><button id="sud-restart">🔄 Новая</button>';
  wrap.appendChild(controls);

  DOM.gameContainer.appendChild(wrap);

  const ctx = c.getContext('2d');
  let board = [], solution = [], selected = null;
  let mistakes = 0, timer = 0, timerInterval, started = false;
  let gameOver = false, hintsLeft = 3;
  let fixed = [];

  // ─── Proper Sudoku Generator ───

  function isValid(grid, row, col, num) {
    for (let i = 0; i < 9; i++) {
      if (grid[row][i] === num) return false;
      if (grid[i][col] === num) return false;
    }
    const br = Math.floor(row / 3) * 3, bc = Math.floor(col / 3) * 3;
    for (let r = br; r < br + 3; r++)
      for (let c = bc; c < bc + 3; c++)
        if (grid[r][c] === num) return false;
    return true;
  }

  function solveGrid(grid) {
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++) {
        if (grid[r][c] === 0) {
          const nums = shuffleArray([1,2,3,4,5,6,7,8,9]);
          for (const num of nums) {
            if (isValid(grid, r, c, num)) {
              grid[r][c] = num;
              if (solveGrid(grid)) return true;
              grid[r][c] = 0;
            }
          }
          return false;
        }
      }
    return true;
  }

  function countSolutions(grid, limit) {
    let count = 0;
    function solve(g) {
      if (count > limit) return;
      for (let r = 0; r < 9; r++)
        for (let c = 0; c < 9; c++) {
          if (g[r][c] === 0) {
            for (let n = 1; n <= 9; n++) {
              if (isValid(g, r, c, n)) {
                g[r][c] = n;
                solve(g);
                g[r][c] = 0;
              }
            }
            return;
          }
        }
      count++;
    }
    solve(grid);
    return count;
  }

  function generatePuzzle() {
    // Generate a full solved grid
    const full = Array.from({length: 9}, () => Array(9).fill(0));
    solveGrid(full);

    // Copy solution
    const sol = full.map(r => [...r]);

    // Remove clues while ensuring unique solution
    const puzzle = full.map(r => [...r]);
    const cells = shuffleArray([...Array(81).keys()]);
    let removed = 0;

    for (const idx of cells) {
      const r = Math.floor(idx / 9), c = idx % 9;
      const saved = puzzle[r][c];
      puzzle[r][c] = 0;

      const test = puzzle.map(row => [...row]);
      const solutions = countSolutions(test, 2);
      if (solutions === 1) {
        removed++;
        if (removed >= 40 && Math.random() < 0.3) break;
      } else {
        puzzle[r][c] = saved;
      }
    }

    return { puzzle, solution: sol };
  }

  function loadPuzzle() {
    const data = generatePuzzle();
    solution = data.solution;
    const puzzle = data.puzzle;
    board = [];
    fixed = [];
    for (let r = 0; r < 9; r++) {
      board[r] = [];
      fixed[r] = [];
      for (let c = 0; c < 9; c++) {
        const v = puzzle[r][c];
        board[r][c] = v;
        fixed[r][c] = v !== 0;
      }
    }
    selected = null; mistakes = 0; timer = 0; gameOver = false; hintsLeft = 3;
    started = false;
    clearInterval(timerInterval);
    document.getElementById('sud-timer').textContent = '0';
    document.getElementById('sud-mistakes').textContent = '0';
    updateProgress();
  }

  function updateProgress() {
    let filled = 0;
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++)
        if (board[r][c] !== 0) filled++;
    document.getElementById('sud-progress').textContent = filled;
    if (filled === 81) {
      gameOver = true;
      clearInterval(timerInterval);
      const coins = Math.max(3, 10 - mistakes * 2);
      SFX.win();
      addCoins(coins, 'Судоку');
      trackGamePlayed('sudoku', Math.max(0, 10 - mistakes));
      setTimeout(() => showOverlay('🎉 Победа!', `Решено за ${timer} секунд с ${mistakes} ошибками!`, 'Ещё').then(() => { DOM.gameContainer.innerHTML = ''; initSudoku(); }), 300);
    }
  }

  function startTimer() {
    if (started) return;
    started = true;
    timerInterval = setInterval(() => { timer++; document.getElementById('sud-timer').textContent = timer; }, 1000);
  }

  function handleClick(e) {
    if (gameOver) return;
    const r = c.getBoundingClientRect();
    const col = Math.floor(((e.clientX - r.left) * (c.width / r.width) - PAD) / S);
    const row = Math.floor(((e.clientY - r.top) * (c.height / r.height) - PAD) / S);
    if (col < 0 || col >= 9 || row < 0 || row >= 9) return;
    if (fixed[row][col]) { selected = { r: row, c: col }; draw(); return; }
    selected = { r: row, c: col };
    draw();
  }

  function placeNumber(num) {
    if (!selected || gameOver) return;
    const { r, c } = selected;
    if (fixed[r][c]) return;
    startTimer();
    if (num === 0) { board[r][c] = 0; draw(); updateProgress(); return; }
    if (solution[r][c] === num) {
      board[r][c] = num;
      fixed[r][c] = true;
      draw();
      updateProgress();
      for (let i = r * 9 + c + 1; i < 81; i++) {
        const nr = Math.floor(i / 9), nc = i % 9;
        if (!fixed[nr][nc]) { selected = { r: nr, c: nc }; draw(); return; }
      }
      selected = null; draw();
    } else {
      mistakes++;
      document.getElementById('sud-mistakes').textContent = mistakes;
      const x = PAD + c * S, y = PAD + r * S;
      ctx.fillStyle = 'rgba(255,0,0,0.3)';
      ctx.fillRect(x, y, S, S);
      setTimeout(draw, 300);
      if (mistakes >= 3) {
        gameOver = true;
        clearInterval(timerInterval);
        setTimeout(() => showOverlay('💀 Поражение', '3 ошибки — игра окончена!', 'Заново').then(() => { DOM.gameContainer.innerHTML = ''; initSudoku(); }), 500);
      }
    }
  }

  function giveHint() {
    if (gameOver || hintsLeft <= 0) return;
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++) {
        if (!fixed[r][c] && board[r][c] === 0) {
          board[r][c] = solution[r][c];
          fixed[r][c] = true;
          hintsLeft--;
          draw();
          updateProgress();
          return;
        }
      }
  }

  function draw() {
    ctx.clearRect(0, 0, SIZE, SIZE);

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, SIZE, SIZE);

    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++) {
        const x = PAD + c * S, y = PAD + r * S;
        ctx.fillStyle = (r + c) % 2 === 0 ? '#1e1e34' : '#16162a';
        ctx.fillRect(x, y, S, S);
      }

    if (selected) {
      ctx.fillStyle = 'rgba(80,200,255,0.12)';
      ctx.fillRect(PAD + selected.c * S, PAD + selected.r * S, S, S);
      ctx.strokeStyle = 'rgba(80,200,255,0.5)';
      ctx.lineWidth = 2;
      ctx.strokeRect(PAD + selected.c * S + 1, PAD + selected.r * S + 1, S - 2, S - 2);
    }

    ctx.font = `bold ${S * 0.55}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++) {
        const v = board[r][c];
        if (v === 0) continue;
        ctx.fillStyle = fixed[r][c] ? '#e8e0d0' : '#50c8ff';
        ctx.fillText(v, PAD + c * S + S / 2, PAD + r * S + S / 2);
      }

    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 9; i++) {
      ctx.beginPath();
      ctx.moveTo(PAD + i * S, PAD);
      ctx.lineTo(PAD + i * S, PAD + 9 * S);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(PAD, PAD + i * S);
      ctx.lineTo(PAD + 9 * S, PAD + i * S);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 2.5;
    for (let i = 0; i <= 3; i++) {
      const pos = PAD + i * 3 * S;
      ctx.beginPath(); ctx.moveTo(pos, PAD); ctx.lineTo(pos, PAD + 9 * S); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(PAD, pos); ctx.lineTo(PAD + 9 * S, pos); ctx.stroke();
    }
  }

  c.addEventListener('click', handleClick);
  addTouchClick(c);

  numpad.addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (btn) placeNumber(+btn.dataset.n);
  });

  document.getElementById('sud-hint').addEventListener('click', giveHint);
  document.getElementById('sud-restart').addEventListener('click', () => { clearInterval(timerInterval); DOM.gameContainer.innerHTML = ''; initSudoku(); });

  loadPuzzle();
  draw();
  state.currentCleanup = () => { clearInterval(timerInterval); };
}
