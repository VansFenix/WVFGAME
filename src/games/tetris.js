import { DOM } from '../dom.js';
import { state } from '../state.js';
import { SFX } from '../sound.js';
import { createCanvas, makeDiv } from '../utils.js';
import { addCoins } from '../wallet.js';
import { trackGamePlayed } from '../auth.js';

export function initTetris() {
  const COLS = 10, ROWS = 20, BS = 25;

  const wrap = makeDiv('tetris-wrapper');
  const boardWrap = makeDiv('tetris-board-wrap');

  const c = createCanvas(COLS * BS, ROWS * BS, 'tetris-canvas');
  c.id = 'tetris-canvas';
  boardWrap.appendChild(c);
  wrap.appendChild(boardWrap);

  const side = document.createElement('div');
  side.className = 'tetris-side';
  side.innerHTML = `
    <div class="tetris-panel">
      <h4>Счёт</h4>
      <div style="font-size:1.6rem;font-weight:900;color:var(--amber)" id="t-score">0</div>
      <div class="tetris-stat">Уровень <span id="t-level">1</span></div>
      <div class="tetris-stat">Линии <span id="t-lines">0</span></div>
    </div>
    <div class="tetris-panel">
      <h4>Следующая</h4>
      <canvas id="next-canvas" width="100" height="100"></canvas>
    </div>
    <div class="tetris-panel">
      <h4>Холд</h4>
      <canvas id="hold-canvas" width="100" height="100"></canvas>
      <button class="tetris-hold-btn" id="hold-btn">🔄 Холд (C)</button>
    </div>
    <div class="tetris-panel">
      <h4>Управление</h4>
      <div class="tetris-keys">
        <kbd>←</kbd><kbd>↑</kbd><kbd>→</kbd>
        <kbd>↓</kbd><kbd>␣</kbd><kbd>C</kbd>
        <kbd class="wide">P — пауза</kbd>
      </div>
    </div>
  `;
  wrap.appendChild(side);
  DOM.gameContainer.appendChild(wrap);

  const cx = c.getContext('2d');
  const nextCanvas = document.getElementById('next-canvas');
  const nx = nextCanvas.getContext('2d');
  const holdCanvas = document.getElementById('hold-canvas');
  const hx = holdCanvas.getContext('2d');

  const PIECES = [
    { s: [[1,1,1,1]], c: '#00f5ff' },
    { s: [[1,1],[1,1]], c: '#ffc800' },
    { s: [[0,1,0],[1,1,1]], c: '#ff00e4' },
    { s: [[1,0,0],[1,1,1]], c: '#00ff88' },
    { s: [[0,0,1],[1,1,1]], c: '#ff6600' },
    { s: [[1,1,0],[0,1,1]], c: '#3366ff' },
    { s: [[0,1,1],[1,1,0]], c: '#00ffcc' }
  ];

  let board = Array.from({length: ROWS}, () => Array(COLS).fill(0));
  let score = 0, lines = 0, level = 1;
  let current = null, next = null, hold = null;
  let canHold = true;
  let over = false;
  let paused = false;
  let dropInterval;

  function randPiece() { return PIECES[Math.floor(Math.random() * PIECES.length)]; }

  function spawnPiece(resetHold = true) {
    if (!next) next = randPiece();
    current = { piece: next, x: Math.floor((COLS - next.s[0].length) / 2), y: 0 };
    next = randPiece();
    if (collision(current.x, current.y, current.piece.s)) {
      over = true; clearInterval(dropInterval); SFX.lose();
      const coins = Math.floor(score / 100);
      if (coins > 0) addCoins(coins, 'Тетрис');
      trackGamePlayed('tetris', score);
    }
    if (resetHold) canHold = true;
  }

  function collision(x, y, shape) {
    for (let r = 0; r < shape.length; r++)
      for (let c = 0; c < shape[r].length; c++)
        if (shape[r][c]) {
          const nx = x + c, ny = y + r;
          if (nx < 0 || nx >= COLS || ny >= ROWS || (ny >= 0 && board[ny][nx])) return true;
        }
    return false;
  }

  function merge() {
    for (let r = 0; r < current.piece.s.length; r++)
      for (let c = 0; c < current.piece.s[r].length; c++)
        if (current.piece.s[r][c] && current.y + r >= 0)
          board[current.y + r][current.x + c] = current.piece.c;
    clearLines();
    spawnPiece();
  }

  function clearLines() {
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r].every(v => v !== 0)) {
        board.splice(r, 1);
        board.unshift(Array(COLS).fill(0));
        cleared++;
        r++;
      }
    }
    if (cleared) {
      lines += cleared;
      const pts = [0, 100, 300, 500, 800];
      score += pts[cleared] * level;
      level = Math.floor(lines / 10) + 1;
      document.getElementById('t-score').textContent = score;
      document.getElementById('t-level').textContent = level;
      document.getElementById('t-lines').textContent = lines;
      DOM.gameScore.textContent = `🏆 ${score}`;
      clearInterval(dropInterval);
      dropInterval = setInterval(dropTick, Math.max(50, 500 - (level - 1) * 35));
    }
  }

  function rotate(shape) { return shape[0].map((_, i) => shape.map(r => r[i]).reverse()); }

  function tryRotate() {
    const newShape = rotate(current.piece.s);
    const kicks = [[0,0], [-1,0], [1,0], [0,-1], [-1,-1], [1,-1], [-2,0], [2,0]];
    for (const [ox, oy] of kicks) {
      if (!collision(current.x + ox, current.y + oy, newShape)) {
        current.x += ox; current.y += oy;
        current.piece.s = newShape;
        return;
      }
    }
  }

  function move(dx, dy, doRotate = false) {
    if (over || paused) return;
    if (doRotate) { tryRotate(); } else {
      if (!collision(current.x + dx, current.y + dy, current.piece.s)) {
        current.x += dx; current.y += dy;
      } else if (dy === 1) merge();
    }
    draw();
  }

  function hardDrop() {
    if (over || paused) return;
    while (!collision(current.x, current.y + 1, current.piece.s)) current.y++;
    merge();
    draw();
  }

  function holdPiece() {
    if (!canHold || over || paused) return;
    canHold = false;
    if (hold) {
      const tmp = hold;
      hold = current.piece;
      current.piece = tmp;
      current.x = Math.floor((COLS - current.piece.s[0].length) / 2);
      current.y = 0;
    } else {
      hold = current.piece;
      spawnPiece(false);
    }
    draw();
  }

  function dropTick() { if (!over && !paused) { if (!collision(current.x, current.y + 1, current.piece.s)) current.y++; else merge(); draw(); } }

  const keyHandler = e => {
    const code = e.code;
    if (code === 'KeyP') { paused = !paused; draw(); return; }
    if (code === 'Enter' && over) { clearInterval(dropInterval); initTetris(); return; }
    if (over) return;
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','KeyW','KeyA','KeyS','KeyD','KeyC'].includes(code)) e.preventDefault();
    switch (code) {
      case 'ArrowLeft': case 'KeyA': move(-1, 0); break;
      case 'ArrowRight': case 'KeyD': move(1, 0); break;
      case 'ArrowDown': case 'KeyS': move(0, 1); break;
      case 'ArrowUp': case 'KeyW': move(0, 0, true); break;
      case 'Space': hardDrop(); break;
      case 'KeyC': holdPiece(); break;
    }
  };
  document.addEventListener('keydown', keyHandler);
  document.getElementById('hold-btn').addEventListener('click', holdPiece);

  const tetrisTouch = document.createElement('div');
  tetrisTouch.className = 'tetris-touch';
  tetrisTouch.innerHTML = `
    <button class="tetris-touch-btn" data-action="left">◀</button>
    <button class="tetris-touch-btn" data-action="rotate">▲</button>
    <button class="tetris-touch-btn" data-action="right">▶</button>
    <button class="tetris-touch-btn" data-action="down">▼</button>
    <button class="tetris-touch-btn wide" data-action="drop">␣</button>
    <button class="tetris-touch-btn" data-action="hold">C</button>
  `;
  boardWrap.parentNode.insertBefore(tetrisTouch, boardWrap.nextSibling);

  tetrisTouch.addEventListener('click', e => {
    const btn = e.target.closest('.tetris-touch-btn');
    if (!btn) return;
    switch (btn.dataset.action) {
      case 'left': move(-1, 0); break;
      case 'right': move(1, 0); break;
      case 'down': move(0, 1); break;
      case 'rotate': move(0, 0, true); break;
      case 'drop': hardDrop(); break;
      case 'hold': holdPiece(); break;
    }
  });

  function draw() {
    cx.clearRect(0, 0, c.width, c.height);

    for (let r = 0; r < ROWS; r++)
      for (let co = 0; co < COLS; co++) {
        const color = board[r][co];
        if (color) {
          cx.shadowColor = color;
          cx.shadowBlur = 8;
          cx.fillStyle = color;
          cx.fillRect(co * BS, r * BS, BS - 1, BS - 1);
          cx.shadowBlur = 0;
          cx.fillStyle = 'rgba(255,255,255,0.1)';
          cx.fillRect(co * BS + 2, r * BS + 2, BS - 5, BS - 5);
        } else {
          cx.fillStyle = 'rgba(255,255,255,0.02)';
          cx.fillRect(co * BS, r * BS, BS - 1, BS - 1);
        }
      }

    if (current && !over) {
      let gy = current.y;
      while (!collision(current.x, gy + 1, current.piece.s)) gy++;
      const shape = current.piece.s;
      cx.fillStyle = 'rgba(255,255,255,0.06)';
      cx.strokeStyle = 'rgba(255,255,255,0.1)';
      cx.lineWidth = 0.5;
      for (let r = 0; r < shape.length; r++)
        for (let co = 0; co < shape[r].length; co++)
          if (shape[r][co]) {
            const x = (current.x + co) * BS, y = (gy + r) * BS;
            cx.strokeRect(x + 1, y + 1, BS - 2, BS - 2);
          }

      cx.fillStyle = current.piece.c;
      cx.shadowColor = current.piece.c;
      cx.shadowBlur = 15;
      for (let r = 0; r < shape.length; r++)
        for (let co = 0; co < shape[r].length; co++)
          if (shape[r][co]) {
            const x = (current.x + co) * BS, y = (current.y + r) * BS;
            cx.fillRect(x, y, BS - 1, BS - 1);
          }
      cx.shadowBlur = 0;
    }

    if (over) {
      cx.fillStyle = 'rgba(0,0,0,0.75)';
      cx.fillRect(0, 0, c.width, c.height);
      cx.fillStyle = '#ff00e4';
      cx.font = 'bold 32px Inter, sans-serif';
      cx.textAlign = 'center';
      cx.fillText('GAME OVER', c.width / 2, c.height / 2 - 12);
      cx.fillStyle = '#eeeef5';
      cx.font = '20px Inter, sans-serif';
      cx.fillText(`Счёт: ${score}`, c.width / 2, c.height / 2 + 28);
      cx.fillStyle = '#6a6a7e';
      cx.font = '13px Inter, sans-serif';
      cx.fillText('Enter — рестарт', c.width / 2, c.height / 2 + 58);
    }

    if (paused && !over) {
      cx.fillStyle = 'rgba(0,0,0,0.6)';
      cx.fillRect(0, 0, c.width, c.height);
      cx.fillStyle = '#fff';
      cx.font = 'bold 36px Inter, sans-serif';
      cx.textAlign = 'center';
      cx.fillText('ПАУЗА', c.width / 2, c.height / 2);
    }

    drawMini(nx, next);
    drawMini(hx, hold);
  }

  function drawMini(ctx, piece) {
    ctx.clearRect(0, 0, 100, 100);
    if (!piece) return;
    const shape = piece.s;
    const bw = 20;
    const ox = (100 - shape[0].length * bw) / 2;
    const oy = (100 - shape.length * bw) / 2;
    ctx.fillStyle = piece.c;
    ctx.shadowColor = piece.c;
    ctx.shadowBlur = 6;
    for (let r = 0; r < shape.length; r++)
      for (let c = 0; c < shape[r].length; c++)
        if (shape[r][c]) ctx.fillRect(ox + c * bw, oy + r * bw, bw - 1, bw - 1);
    ctx.shadowBlur = 0;
  }

  spawnPiece();
  draw();
  dropInterval = setInterval(dropTick, 500);

  state.currentCleanup = () => {
    clearInterval(dropInterval);
    document.removeEventListener('keydown', keyHandler);
  };
}
