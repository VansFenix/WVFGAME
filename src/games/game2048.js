import { DOM } from '../dom.js';
import { state } from '../state.js';
import { SFX } from '../sound.js';
import { createCanvas, makeDiv } from '../utils.js';
import { showOverlay } from '../ui.js';
import { addCoins } from '../wallet.js';
import { trackGamePlayed } from '../auth.js';

const SIZE = 400;
const TILES = 4;
const TILE_SIZE = SIZE / TILES;
const GAP = 6;

const TILE_COLORS = {
  2: { bg: '#eee4da', text: '#776e65' },
  4: { bg: '#ede0c8', text: '#776e65' },
  8: { bg: '#f2b179', text: '#f9f6f2' },
  16: { bg: '#f59563', text: '#f9f6f2' },
  32: { bg: '#f67c5f', text: '#f9f6f2' },
  64: { bg: '#f65e3b', text: '#f9f6f2' },
  128: { bg: '#edcf72', text: '#f9f6f2' },
  256: { bg: '#edcc61', text: '#f9f6f2' },
  512: { bg: '#edc850', text: '#f9f6f2' },
  1024: { bg: '#edc53f', text: '#f9f6f2' },
  2048: { bg: '#edc22e', text: '#f9f6f2' },
  super: { bg: '#3c3a32', text: '#f9f6f2' }
};

export function init2048() {
  const wrap = makeDiv();
  wrap.style.textAlign = 'center';

  const c = createCanvas(SIZE, SIZE, 'g2048-canvas');
  wrap.appendChild(c);

  const info = document.createElement('div');
  info.className = 'g2048-info';
  const hs = load2048HS();
  info.innerHTML = `<span>🏆 Рекорд: <b id="hs-2048">${hs}</b></span>
    <span>Счёт: <b id="score-2048">0</b></span>
    <span><kbd>←↑↓→</kbd></span>`;
  wrap.appendChild(info);

  DOM.gameContainer.appendChild(wrap);

  const cx = c.getContext('2d');

  let grid = Array.from({ length: TILES }, () => Array(TILES).fill(0));
  let score = 0;
  let highScore = +hs;
  let running = true;
  let won = false;
  let touchStart = null;

  function load2048HS() {
    return localStorage.getItem('wvf_2048_hs') || '0';
  }

  function save2048HS() {
    if (score > highScore) {
      highScore = score;
      localStorage.setItem('wvf_2048_hs', score);
      document.getElementById('hs-2048').textContent = score;
    }
  }

  function addRandomTile() {
    const empty = [];
    for (let r = 0; r < TILES; r++)
      for (let c = 0; c < TILES; c++)
        if (grid[r][c] === 0) empty.push({ r, c });
    if (empty.length === 0) return false;
    const { r, c } = empty[Math.floor(Math.random() * empty.length)];
    grid[r][c] = Math.random() < 0.9 ? 2 : 4;
    return true;
  }

  function slideRow(row) {
    const arr = row.filter(v => v !== 0);
    const result = [];
    const mergedVals = [];
    let i = 0;
    while (i < arr.length) {
      if (i + 1 < arr.length && arr[i] === arr[i + 1]) {
        const v = arr[i] * 2;
        result.push(v);
        mergedVals.push(v);
        i += 2;
      } else {
        result.push(arr[i]);
        i++;
      }
    }
    while (result.length < TILES) result.push(0);
    return { row: result, merged: mergedVals };
  }

  function gridEquals(a, b) {
    for (let r = 0; r < TILES; r++)
      for (let c = 0; c < TILES; c++)
        if (a[r][c] !== b[r][c]) return false;
    return true;
  }

  function cloneGrid() {
    return grid.map(r => [...r]);
  }

  function canMove() {
    for (let r = 0; r < TILES; r++)
      for (let c = 0; c < TILES; c++) {
        if (grid[r][c] === 0) return true;
        if (c + 1 < TILES && grid[r][c] === grid[r][c + 1]) return true;
        if (r + 1 < TILES && grid[r][c] === grid[r + 1][c]) return true;
      }
    return false;
  }

  function calcScore(merged) {
    return merged.reduce((s, v) => s + v, 0);
  }

  function handleMove(dir) {
    if (!running) return;
    SFX.move();

    const before = cloneGrid();
    const allMerged = [];

    if (dir === 'left') {
      for (let r = 0; r < TILES; r++) {
        const { row, merged } = slideRow(grid[r]);
        grid[r] = row;
        allMerged.push(...merged);
      }
    } else if (dir === 'right') {
      for (let r = 0; r < TILES; r++) {
        const { row, merged } = slideRow(grid[r].slice().reverse());
        grid[r] = row.reverse();
        allMerged.push(...merged);
      }
    } else if (dir === 'up') {
      for (let c = 0; c < TILES; c++) {
        const col = [];
        for (let r = 0; r < TILES; r++) col.push(grid[r][c]);
        const { row, merged } = slideRow(col);
        for (let r = 0; r < TILES; r++) grid[r][c] = row[r];
        allMerged.push(...merged);
      }
    } else if (dir === 'down') {
      for (let c = 0; c < TILES; c++) {
        const col = [];
        for (let r = TILES - 1; r >= 0; r--) col.push(grid[r][c]);
        const { row, merged } = slideRow(col);
        for (let r = 0; r < TILES; r++) grid[r][c] = row[TILES - 1 - r];
        allMerged.push(...merged);
      }
    }

    if (gridEquals(before, grid)) return;

    score += calcScore(allMerged);
    document.getElementById('score-2048').textContent = score;

    addRandomTile();
    draw();

    const maxTile = Math.max(...grid.flat());

    if (maxTile >= 2048 && !won) {
      won = true;
      SFX.win();
      showOverlay('🎉 Победа!', 'Вы собрали 2048! Продолжайте играть дальше.', 'Продолжить');
    }

    if (!canMove()) {
      running = false;
      save2048HS();
      SFX.lose();
      const coins = Math.floor(score / 100);
      if (coins > 0) addCoins(coins, '2048');
      trackGamePlayed('2048', score);
      showOverlay('💀 Игра окончена', `Счёт: ${score}\nРекорд: ${highScore}`, 'Заново').then(() => {
        DOM.gameContainer.innerHTML = '';
        init2048();
      });
    }
  }

  function draw() {
    cx.clearRect(0, 0, SIZE, SIZE);

    cx.fillStyle = '#bbada0';
    cx.fillRect(0, 0, SIZE, SIZE);

    for (let r = 0; r < TILES; r++) {
      for (let c = 0; c < TILES; c++) {
        const val = grid[r][c];
        const x = c * TILE_SIZE + GAP;
        const y = r * TILE_SIZE + GAP;
        const size = TILE_SIZE - GAP * 2;

        const colors = val === 0
          ? { bg: 'rgba(238,228,218,0.35)', text: '' }
          : TILE_COLORS[val] || TILE_COLORS.super;

        cx.fillStyle = colors.bg;
        cx.beginPath();
        const rad = 6;
        cx.moveTo(x + rad, y);
        cx.lineTo(x + size - rad, y);
        cx.quadraticCurveTo(x + size, y, x + size, y + rad);
        cx.lineTo(x + size, y + size - rad);
        cx.quadraticCurveTo(x + size, y + size, x + size - rad, y + size);
        cx.lineTo(x + rad, y + size);
        cx.quadraticCurveTo(x, y + size, x, y + size - rad);
        cx.lineTo(x, y + rad);
        cx.quadraticCurveTo(x, y, x + rad, y);
        cx.closePath();
        cx.fill();

        if (val !== 0) {
          cx.fillStyle = colors.text;
          cx.font = `bold ${val < 100 ? 32 : val < 1000 ? 26 : 20}px Inter, sans-serif`;
          cx.textAlign = 'center';
          cx.textBaseline = 'middle';
          cx.fillText(val, x + size / 2, y + size / 2);
        }
      }
    }
  }

  const keyHandler = e => {
    const map = {
      ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
      KeyA: 'left', KeyD: 'right', KeyW: 'up', KeyS: 'down'
    };
    const dir = map[e.code];
    if (dir) { e.preventDefault(); handleMove(dir); }
  };

  const tStart = e => { touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY }; };
  const tEnd = e => {
    if (!touchStart) return;
    const dx = e.changedTouches[0].clientX - touchStart.x;
    const dy = e.changedTouches[0].clientY - touchStart.y;
    touchStart = null;
    if (Math.abs(dx) < 30 && Math.abs(dy) < 30) return;
    if (Math.abs(dx) > Math.abs(dy)) {
      handleMove(dx > 0 ? 'right' : 'left');
    } else {
      handleMove(dy > 0 ? 'down' : 'up');
    }
  };

  document.addEventListener('keydown', keyHandler);
  c.addEventListener('touchstart', tStart);
  c.addEventListener('touchend', tEnd);

  addRandomTile();
  addRandomTile();
  draw();

  state.currentCleanup = () => {
    document.removeEventListener('keydown', keyHandler);
    c.removeEventListener('touchstart', tStart);
    c.removeEventListener('touchend', tEnd);
  };
}
