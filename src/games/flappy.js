import { DOM } from '../dom.js';
import { state } from '../state.js';
import { SFX } from '../sound.js';
import { createCanvas, makeDiv } from '../utils.js';
import { showOverlay } from '../ui.js';
import { addCoins } from '../wallet.js';
import { trackGamePlayed } from '../auth.js';

const W = 400;
const H = 500;
const GRAVITY = 0.4;
const FLAP = -7;
const PIPE_W = 50;
const PIPE_GAP = 140;
const PIPE_SPEED = 2.5;
const BIRD_R = 14;
const GROUND_H = 60;

export function initFlappy() {
  const wrap = makeDiv();
  wrap.style.textAlign = 'center';

  const c = createCanvas(W, H, 'flappy-canvas');
  wrap.appendChild(c);

  const info = document.createElement('div');
  info.className = 'flappy-info';
  const hs = loadFlappyHS();
  info.innerHTML = `<span>🏆 Рекорд: <b id="hs-flappy">${hs}</b></span>
    <span>Счёт: <b id="score-flappy">0</b></span>
    <span><kbd>Space</kbd> / клик / тап</span>`;
  wrap.appendChild(info);

  DOM.gameContainer.appendChild(wrap);

  const cx = c.getContext('2d');

  let bird, pipes, score, highScore, running, started, frameId;

  function loadFlappyHS() {
    return localStorage.getItem('wvf_flappy_hs') || '0';
  }

  function saveFlappyHS() {
    if (score > highScore) {
      highScore = score;
      localStorage.setItem('wvf_flappy_hs', score);
      document.getElementById('hs-flappy').textContent = score;
    }
  }

  function reset() {
    bird = { x: 80, y: H / 2, vy: 0 };
    pipes = [];
    score = 0;
    highScore = +loadFlappyHS();
    running = true;
    started = false;
    document.getElementById('score-flappy').textContent = '0';
  }

  function addPipe() {
    const minY = 50;
    const maxY = H - GROUND_H - PIPE_GAP - 50;
    const topH = Math.floor(Math.random() * (maxY - minY + 1)) + minY;
    pipes.push({ x: W, topH, bottomY: topH + PIPE_GAP, scored: false });
  }

  function flap() {
    if (!running) return;
    if (!started) {
      started = true;
      loop();
    }
    bird.vy = FLAP;
    SFX.flip();
  }

  function gameover() {
    running = false;
    cancelAnimationFrame(frameId);
    saveFlappyHS();
    SFX.lose();
    const coins = Math.floor(score / 5);
    if (coins > 0) addCoins(coins, 'Flappy Bird');
    trackGamePlayed('flappy', score);
    showOverlay('💀 Game Over', `Счёт: ${score}\nРекорд: ${highScore}`, 'Заново').then(() => {
      DOM.gameContainer.innerHTML = '';
      initFlappy();
    });
  }

  function update() {
    bird.vy += GRAVITY;
    bird.y += bird.vy;

    if (bird.y + BIRD_R > H - GROUND_H || bird.y - BIRD_R < 0) {
      gameover();
      return;
    }

    if (pipes.length === 0 || pipes[pipes.length - 1].x < W - 200) {
      addPipe();
    }

    for (let i = pipes.length - 1; i >= 0; i--) {
      pipes[i].x -= PIPE_SPEED;

      if (!pipes[i].scored && pipes[i].x + PIPE_W < bird.x) {
        pipes[i].scored = true;
        score++;
        document.getElementById('score-flappy').textContent = score;
        SFX.coin();
      }

      if (pipes[i].x + PIPE_W < 0) {
        pipes.splice(i, 1);
        continue;
      }

      if (bird.x + BIRD_R > pipes[i].x && bird.x - BIRD_R < pipes[i].x + PIPE_W) {
        if (bird.y - BIRD_R < pipes[i].topH || bird.y + BIRD_R > pipes[i].bottomY) {
          gameover();
          return;
        }
      }
    }
  }

  function draw() {
    cx.clearRect(0, 0, W, H);

    const skyGrad = cx.createLinearGradient(0, 0, 0, H);
    skyGrad.addColorStop(0, '#4dc9f6');
    skyGrad.addColorStop(1, '#87ceeb');
    cx.fillStyle = skyGrad;
    cx.fillRect(0, 0, W, H - GROUND_H);

    for (let p of pipes) {
      cx.fillStyle = '#73bf2e';
      cx.shadowColor = 'rgba(0,0,0,0.2)';
      cx.shadowBlur = 8;

      cx.fillRect(p.x, 0, PIPE_W, p.topH);

      cx.fillStyle = '#5fa825';
      cx.fillRect(p.x - 4, p.topH - 20, PIPE_W + 8, 20);

      cx.fillStyle = '#73bf2e';
      cx.fillRect(p.x, p.bottomY, PIPE_W, H - p.bottomY - GROUND_H);

      cx.fillStyle = '#5fa825';
      cx.fillRect(p.x - 4, p.bottomY, PIPE_W + 8, 20);

      cx.shadowBlur = 0;
    }

    cx.fillStyle = '#8B5E3C';
    cx.fillRect(0, H - GROUND_H, W, GROUND_H);

    cx.fillStyle = '#6B3E1C';
    cx.fillRect(0, H - GROUND_H, W, 4);

    for (let i = 0; i < W; i += 30) {
      cx.fillStyle = '#7a4e2a';
      cx.fillRect(i, H - GROUND_H + 8, 20, 2);
    }

    cx.shadowColor = 'rgba(0,0,0,0.15)';
    cx.shadowBlur = 6;

    cx.fillStyle = '#ffe02e';
    cx.beginPath();
    cx.arc(bird.x, bird.y, BIRD_R, 0, Math.PI * 2);
    cx.fill();

    cx.fillStyle = '#f5a623';
    cx.beginPath();
    cx.arc(bird.x + 4, bird.y - 4, BIRD_R - 4, 0, Math.PI * 2);
    cx.fill();

    cx.fillStyle = '#333';
    cx.beginPath();
    cx.arc(bird.x + 8, bird.y - 6, 3, 0, Math.PI * 2);
    cx.fill();

    cx.fillStyle = '#fff';
    cx.beginPath();
    cx.arc(bird.x + 9, bird.y - 8, 1.5, 0, Math.PI * 2);
    cx.fill();

    cx.fillStyle = '#ff6b35';
    cx.beginPath();
    cx.moveTo(bird.x + 12, bird.y);
    cx.lineTo(bird.x + 20, bird.y - 4);
    cx.lineTo(bird.x + 20, bird.y + 4);
    cx.closePath();
    cx.fill();

    cx.shadowBlur = 0;

    if (!started) {
      cx.fillStyle = 'rgba(0,0,0,0.4)';
      cx.fillRect(0, 0, W, H);
      cx.fillStyle = '#fff';
      cx.font = 'bold 22px Inter, sans-serif';
      cx.textAlign = 'center';
      cx.textBaseline = 'middle';
      cx.fillText('Нажмите Space или кликните', W / 2, H / 2 - 20);
      cx.font = '16px Inter, sans-serif';
      cx.fillText('чтобы начать игру', W / 2, H / 2 + 20);
    }
  }

  function loop() {
    if (!running) return;
    update();
    draw();
    frameId = requestAnimationFrame(loop);
  }

  const keyHandler = e => {
    if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      flap();
    }
  };

  const clickHandler = () => flap();

  const tStart = e => {
    e.preventDefault();
    flap();
  };

  document.addEventListener('keydown', keyHandler);
  c.addEventListener('click', clickHandler);
  c.addEventListener('touchstart', tStart, { passive: false });

  reset();
  draw();

  state.currentCleanup = () => {
    cancelAnimationFrame(frameId);
    document.removeEventListener('keydown', keyHandler);
    c.removeEventListener('click', clickHandler);
    c.removeEventListener('touchstart', tStart);
  };
}
