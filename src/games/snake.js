import { DOM } from '../dom.js';
import { state } from '../state.js';
import { SFX } from '../sound.js';
import { createCanvas, makeDiv, loadHS } from '../utils.js';
import { showOverlay } from '../ui.js';
import { addCoins } from '../wallet.js';
import { trackGamePlayed } from '../auth.js';

export function initSnake() {
  const GRID = 20;
  const SIZE = 400;

  const wrap = makeDiv();
  wrap.style.textAlign = 'center';

  const c = createCanvas(SIZE, SIZE, 'snake-canvas');
  wrap.appendChild(c);

  const info = document.createElement('div');
  info.className = 'snake-info';
  info.innerHTML = `<span>🏆 Рекорд: <b id="hs-snake">${loadHS('snake')}</b></span>
    <span><kbd>←↑↓→</kbd> / <kbd>WASD</kbd></span>
    <span><kbd>Space</kbd> пауза</span>`;
  wrap.appendChild(info);
  DOM.gameContainer.appendChild(wrap);

  const cx = c.getContext('2d');

  let snake = [{x: 200, y: 200}, {x: 180, y: 200}, {x: 160, y: 200}];
  let dx = GRID, dy = 0;
  let food = randFood();
  let score = 0;
  let highScore = +loadHS('snake');
  let running = true;
  let paused = false;
  let speed = 100;
  let loop;
  let touchStart = null;

  function randFood() {
    let p;
    do {
      p = { x: Math.floor(Math.random() * (SIZE / GRID)) * GRID, y: Math.floor(Math.random() * (SIZE / GRID)) * GRID };
    } while (snake.some(s => s.x === p.x && s.y === p.y));
    return p;
  }

  function saveHS() {
    if (score > highScore) {
      highScore = score;
      localStorage.setItem('wvf_snake_hs', score);
      document.getElementById('hs-snake').textContent = score;
    }
  }

  function gameover() {
    running = false;
    saveHS();
    SFX.lose();
    const coins = Math.floor(score / 10);
    if (coins > 0) addCoins(coins, 'Змейка');
    trackGamePlayed('snake', score);
    draw();
    showOverlay('💀 Игра окончена', `Счёт: ${score}\nРекорд: ${highScore}`, 'Заново').then(() => { DOM.gameContainer.innerHTML = ''; initSnake(); });
  }

  const keyHandler = e => {
    const code = e.code;
    if (e.key === ' ' || e.key === 'Escape') {
      e.preventDefault();
      if (!running) return;
      paused = !paused;
      if (!paused) step();
      return;
    }
    if (paused || !running) return;
    const u = dy === -GRID, d = dy === GRID, l = dx === -GRID, r = dx === GRID;
    const isDir = ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW','KeyA','KeyS','KeyD'].includes(code);
    if (isDir) e.preventDefault();
    if ((code === 'ArrowUp' || code === 'KeyW') && !d) { dx = 0; dy = -GRID; }
    if ((code === 'ArrowDown' || code === 'KeyS') && !u) { dx = 0; dy = GRID; }
    if ((code === 'ArrowLeft' || code === 'KeyA') && !r) { dx = -GRID; dy = 0; }
    if ((code === 'ArrowRight' || code === 'KeyD') && !l) { dx = GRID; dy = 0; }
  };

  const tStart = e => { touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY }; };
  const tEnd = e => {
    if (!touchStart || !running || paused) return;
    const dxT = e.changedTouches[0].clientX - touchStart.x;
    const dyT = e.changedTouches[0].clientY - touchStart.y;
    touchStart = null;
    if (Math.abs(dxT) < 20 && Math.abs(dyT) < 20) return;
    const u = dy === -GRID, d = dy === GRID, l = dx === -GRID, r = dx === GRID;
    if (Math.abs(dxT) > Math.abs(dyT)) {
      if (dxT > 0 && !l) { dx = GRID; dy = 0; }
      else if (dxT < 0 && !r) { dx = -GRID; dy = 0; }
    } else {
      if (dyT > 0 && !u) { dx = 0; dy = GRID; }
      else if (dyT < 0 && !d) { dx = 0; dy = -GRID; }
    }
  };

  document.addEventListener('keydown', keyHandler);
  c.addEventListener('touchstart', tStart);
  c.addEventListener('touchend', tEnd);

  function step() {
    if (!running || paused) return;

    const head = { x: snake[0].x + dx, y: snake[0].y + dy };

    if (head.x < 0 || head.x >= SIZE || head.y < 0 || head.y >= SIZE) { gameover(); return; }
    for (const s of snake) { if (head.x === s.x && head.y === s.y) { gameover(); return; } }

    snake.unshift(head);

    if (head.x === food.x && head.y === food.y) {
      score += 10;
      DOM.gameScore.textContent = `🎯 ${score}`;
      speed = Math.max(50, 100 - Math.floor(score / 50) * 5);
      food = randFood();
    } else {
      snake.pop();
    }

    draw();
    loop = setTimeout(step, speed);
  }

  function draw() {
    cx.fillStyle = '#04040c';
    cx.fillRect(0, 0, SIZE, SIZE);

    cx.strokeStyle = 'rgba(255,255,255,0.015)';
    cx.lineWidth = 0.5;
    for (let i = 0; i <= SIZE; i += GRID) {
      cx.beginPath(); cx.moveTo(i, 0); cx.lineTo(i, SIZE); cx.stroke();
      cx.beginPath(); cx.moveTo(0, i); cx.lineTo(SIZE, i); cx.stroke();
    }

    const grd = cx.createRadialGradient(food.x + 10, food.y + 10, 2, food.x + 10, food.y + 10, 25);
    grd.addColorStop(0, 'rgba(255,51,102,0.3)');
    grd.addColorStop(1, 'rgba(255,51,102,0)');
    cx.fillStyle = grd;
    cx.beginPath(); cx.arc(food.x + 10, food.y + 10, 25, 0, Math.PI * 2); cx.fill();

    cx.shadowColor = '#ff3366';
    cx.shadowBlur = 20;
    cx.fillStyle = '#ff3366';
    cx.beginPath(); cx.arc(food.x + 10, food.y + 10, 7, 0, Math.PI * 2); cx.fill();
    cx.shadowBlur = 0;

    for (let i = 0; i < snake.length; i++) {
      const seg = snake[i];
      const t = 1 - i / snake.length;
      const isHead = i === 0;
      const pad = isHead ? 1 : 2;

      cx.shadowColor = isHead ? '#00f5ff' : '#00aa5e';
      cx.shadowBlur = isHead ? 18 : 6;
      cx.fillStyle = isHead ? '#00f5ff' : `rgb(0, ${Math.floor(150 + 105 * t)}, ${Math.floor(80 + 175 * t)})`;

      const r = 4;
      const x = seg.x + pad, y = seg.y + pad;
      const w = GRID - pad * 2, h = GRID - pad * 2;
      cx.beginPath();
      cx.moveTo(x + r, y);
      cx.lineTo(x + w - r, y);
      cx.quadraticCurveTo(x + w, y, x + w, y + r);
      cx.lineTo(x + w, y + h - r);
      cx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      cx.lineTo(x + r, y + h);
      cx.quadraticCurveTo(x, y + h, x, y + h - r);
      cx.lineTo(x, y + r);
      cx.quadraticCurveTo(x, y, x + r, y);
      cx.closePath();
      cx.fill();
    }
    cx.shadowBlur = 0;

    if (snake.length > 0) {
      const hx = snake[0].x, hy = snake[0].y;
      cx.fillStyle = '#fff';
      cx.beginPath(); cx.arc(hx + 6, hy + 6, 2.5, 0, Math.PI * 2); cx.fill();
      cx.beginPath(); cx.arc(hx + 14, hy + 6, 2.5, 0, Math.PI * 2); cx.fill();
      cx.fillStyle = '#04040c';
      const ex = dx > 0 ? 1 : dx < 0 ? -1 : 0;
      const ey = dy > 0 ? 1 : dy < 0 ? -1 : 0;
      cx.beginPath(); cx.arc(hx + 6 + ex, hy + 6 + ey, 1, 0, Math.PI * 2); cx.fill();
      cx.beginPath(); cx.arc(hx + 14 + ex, hy + 6 + ey, 1, 0, Math.PI * 2); cx.fill();
    }

    if (paused) {
      cx.fillStyle = 'rgba(0,0,0,0.6)';
      cx.fillRect(0, 0, SIZE, SIZE);
      cx.fillStyle = '#fff';
      cx.font = 'bold 40px Inter, sans-serif';
      cx.textAlign = 'center';
      cx.fillText('⏸ ПАУЗА', SIZE / 2, SIZE / 2);
    }
  }

  const dPad = document.createElement('div');
  dPad.className = 'snake-dpad';
  dPad.innerHTML = `
    <div></div><button class="s-btn" data-dir="up">▲</button><div></div>
    <button class="s-btn" data-dir="left">◀</button><button class="s-btn" data-dir="down">▼</button><button class="s-btn" data-dir="right">▶</button>
  `;
  wrap.appendChild(dPad);
  dPad.addEventListener('click', e => {
    const btn = e.target.closest('.s-btn');
    if (!btn || paused || !running) return;
    const u = dy === -GRID, d = dy === GRID, l = dx === -GRID, r = dx === GRID;
    switch (btn.dataset.dir) {
      case 'up': if (!d) { dx = 0; dy = -GRID; } break;
      case 'down': if (!u) { dx = 0; dy = GRID; } break;
      case 'left': if (!r) { dx = -GRID; dy = 0; } break;
      case 'right': if (!l) { dx = GRID; dy = 0; } break;
    }
  });

  DOM.gameScore.textContent = '🎯 0';
  step();

  state.currentCleanup = () => {
    clearTimeout(loop);
    document.removeEventListener('keydown', keyHandler);
    c.removeEventListener('touchstart', tStart);
    c.removeEventListener('touchend', tEnd);
  };
}
