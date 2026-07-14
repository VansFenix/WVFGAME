import { DOM } from '../dom.js';
import { state } from '../state.js';
import { SFX } from '../sound.js';
import { createCanvas, makeDiv } from '../utils.js';
import { showOverlay } from '../ui.js';
import { addCoins } from '../wallet.js';
import { trackGamePlayed } from '../auth.js';

export function initDoom() {
  const W = 600, H = 400;

  const wrap = makeDiv('doom-wrap');

  const c = createCanvas(W, H, 'doom-canvas');
  c.id = 'doom-canvas';
  wrap.appendChild(c);

  const hud = document.createElement('div');
  hud.className = 'doom-hud';
  hud.innerHTML = `
    <div>❤️ <span class="hp" id="d-hp">100</span></div>
    <div><div class="health-bar"><div class="health-fill" id="d-hp-bar" style="width:100%"></div></div></div>
    <div>💀 <span class="kills-span" id="d-kills">0</span></div>
    <div>🏆 <span class="kills-span" id="d-wave">1</span></div>
  `;
  wrap.appendChild(hud);

  const info = document.createElement('div');
  info.className = 'doom-info';
  info.innerHTML = '<kbd>WASD</kbd> движение · <kbd>🖱</kbd> стрельба · <kbd>R</kbd> рестарт · <span class="doom-touch-hint">👆 левая половинка движение, правая стрельба</span>';
  wrap.appendChild(info);

  DOM.gameContainer.appendChild(wrap);

  const ctx = c.getContext('2d');

  const player = { x: W / 2, y: H / 2, r: 10, speed: 2.5, hp: 100, maxHp: 100, hitTimer: 0 };
  let keys = {};
  let mx = W / 2, my = H / 2;
  let enemies = [];
  let bullets = [];
  let doomParticles = [];
  let kills = 0;
  let wave = 1;
  let spawnCount = 0;
  let spawnTimer = 0;
  let gameOver = false;
  let animId;
  let waveDelay = 0;

  const keyD = e => {
    const code = e.code;
    keys[code] = true;
    if (code === 'KeyR') { cleanup(); initDoom(); return; }
    if (['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(code)) e.preventDefault();
  };
  const keyU = e => { keys[e.code] = false; };

  document.addEventListener('keydown', keyD);
  document.addEventListener('keyup', keyU);

  c.addEventListener('mousemove', e => {
    const r = c.getBoundingClientRect();
    mx = (e.clientX - r.left) * (W / r.width);
    my = (e.clientY - r.top) * (H / r.height);
  });
  c.addEventListener('click', shoot);

  let touchId = null, shootTouchId = null;
  c.addEventListener('touchstart', e => {
    e.preventDefault();
    for (const t of e.changedTouches) {
      const r = c.getBoundingClientRect();
      const tx = (t.clientX - r.left) * (W / r.width);
      const ty = (t.clientY - r.top) * (H / r.height);
      if (tx < W / 2 && touchId === null) {
        touchId = t.identifier;
      } else if (tx >= W / 2 && shootTouchId === null) {
        shootTouchId = t.identifier;
        mx = tx; my = ty;
        shoot();
      }
    }
  });
  c.addEventListener('touchmove', e => {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (t.identifier === touchId) {
        const r = c.getBoundingClientRect();
        const tx = (t.clientX - r.left) * (W / r.width);
        const ty = (t.clientY - r.top) * (H / r.height);
        const dx = tx - player.x, dy = ty - player.y;
        const d = Math.hypot(dx, dy) || 1;
        if (d > 20) {
          keys['KeyW'] = dy < 0; keys['KeyS'] = dy > 0;
          keys['KeyA'] = dx < 0; keys['KeyD'] = dx > 0;
        } else {
          keys['KeyW'] = keys['KeyS'] = keys['KeyA'] = keys['KeyD'] = false;
        }
      }
      if (t.identifier === shootTouchId) {
        const r = c.getBoundingClientRect();
        mx = (t.clientX - r.left) * (W / r.width);
        my = (t.clientY - r.top) * (H / r.height);
      }
    }
  });
  c.addEventListener('touchend', e => {
    for (const t of e.changedTouches) {
      if (t.identifier === touchId) { touchId = null; keys['KeyW'] = keys['KeyS'] = keys['KeyA'] = keys['KeyD'] = false; }
      if (t.identifier === shootTouchId) shootTouchId = null;
    }
  });
  c.addEventListener('touchcancel', e => {
    touchId = null; shootTouchId = null; keys['KeyW'] = keys['KeyS'] = keys['KeyA'] = keys['KeyD'] = false;
  });

  function shoot() {
    if (gameOver) return;
    SFX.click();
    const dx = mx - player.x, dy = my - player.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    const speed = 7;
    bullets.push({ x: player.x, y: player.y, vx: dx / d * speed, vy: dy / d * speed, life: 50 });
    for (let i = 0; i < 5; i++) {
      doomParticles.push({
        x: player.x, y: player.y, vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3,
        life: 10, color: '#ffcc44', r: 3
      });
    }
  }

  function spawnWave() {
    const count = 3 + wave * 2;
    spawnCount = count;
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        if (gameOver) return;
        const side = Math.floor(Math.random() * 4);
        let x, y;
        if (side === 0) { x = Math.random() * W; y = -20; }
        else if (side === 1) { x = W + 20; y = Math.random() * H; }
        else if (side === 2) { x = Math.random() * W; y = H + 20; }
        else { x = -20; y = Math.random() * H; }
        const hp = 30 + wave * 5;
        const spd = 0.8 + wave * 0.08;
        enemies.push({ x, y, r: 10, hp, maxHp: hp, speed: Math.min(spd, 2.5), hitTimer: 0 });
      }, i * 300);
    }
  }

  function spawnParticles(x, y, color, count, speed) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const sp = Math.random() * (speed || 2) + 1;
      doomParticles.push({
        x, y, vx: Math.cos(angle) * sp, vy: Math.sin(angle) * sp,
        life: 20 + Math.random() * 20, color, r: 2 + Math.random() * 3
      });
    }
  }

  function update() {
    if (gameOver) { draw(); return; }

    let dx = 0, dy = 0;
    if (keys['KeyW'] || keys['ArrowUp']) dy = -1;
    if (keys['KeyS'] || keys['ArrowDown']) dy = 1;
    if (keys['KeyA'] || keys['ArrowLeft']) dx = -1;
    if (keys['KeyD'] || keys['ArrowRight']) dx = 1;
    if (dx && dy) { dx *= 0.707; dy *= 0.707; }
    player.x += dx * player.speed;
    player.y += dy * player.speed;
    player.x = Math.max(player.r, Math.min(W - player.r, player.x));
    player.y = Math.max(player.r, Math.min(H - player.r, player.y));
    if (player.hitTimer > 0) player.hitTimer--;

    if (enemies.length === 0 && spawnCount === 0 && !gameOver) {
      waveDelay++;
      if (waveDelay > 60) {
        wave++;
        document.getElementById('d-wave').textContent = wave;
        spawnWave();
        waveDelay = 0;
      }
    }

    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x += b.vx; b.y += b.vy; b.life--;
      if (b.life <= 0 || b.x < -10 || b.x > W + 10 || b.y < -10 || b.y > H + 10) {
        bullets.splice(i, 1); continue;
      }
      let hit = false;
      for (let j = enemies.length - 1; j >= 0; j--) {
        const e = enemies[j];
        if (Math.hypot(b.x - e.x, b.y - e.y) < e.r + 5) {
          e.hp -= 35;
          spawnParticles(b.x, b.y, '#ff6644', 5, 2);
          if (e.hp <= 0) {
            kills++;
            document.getElementById('d-kills').textContent = kills;
            spawnParticles(e.x, e.y, '#ff4444', 15, 3);
            spawnParticles(e.x, e.y, '#ffaa00', 8, 2);
            enemies.splice(j, 1);
            spawnCount = Math.max(0, spawnCount - 1);
          }
          hit = true; break;
        }
      }
      if (hit) { bullets.splice(i, 1); continue; }
    }

    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      const dx = player.x - e.x, dy = player.y - e.y;
      const d = Math.hypot(dx, dy) || 1;
      e.x += (dx / d) * e.speed;
      e.y += (dy / d) * e.speed;
      if (e.hitTimer > 0) e.hitTimer--;

      if (d < player.r + e.r) {
        if (player.hitTimer === 0) {
          player.hp -= 10;
          player.hitTimer = 30;
          document.getElementById('d-hp').textContent = player.hp;
          document.getElementById('d-hp-bar').style.width = (player.hp / player.maxHp * 100) + '%';
          spawnParticles(player.x, player.y, '#ff2222', 8, 3);
          if (player.hp <= 0) {
            player.hp = 0;
            gameOver = true;
            document.getElementById('d-hp').textContent = '0';
            document.getElementById('d-hp-bar').style.width = '0%';
            SFX.lose();
            addCoins(kills, 'DOOM');
            trackGamePlayed('doom', kills);
            showOverlay('💀 Погиб', `Убито: ${kills} | Волна: ${wave}`, 'Заново').then(() => { DOM.gameContainer.innerHTML = ''; initDoom(); });
          }
        }
      }
    }

    for (let i = doomParticles.length - 1; i >= 0; i--) {
      const p = doomParticles[i];
      p.x += p.vx; p.y += p.vy; p.life--;
      p.vx *= 0.95; p.vy *= 0.95;
      if (p.life <= 0) doomParticles.splice(i, 1);
    }

    draw();
    animId = requestAnimationFrame(update);
  }

  function draw() {
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#111';
    ctx.fillRect(0, H * 0.75, W, H * 0.25);
    ctx.fillStyle = '#151515';
    ctx.fillRect(0, H * 0.75, W, 2);

    ctx.strokeStyle = 'rgba(255,255,255,0.02)';
    ctx.lineWidth = 1;
    for (let i = 0; i < W; i += 40) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, H); ctx.stroke(); }
    for (let i = 0; i < H; i += 40) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(W, i); ctx.stroke(); }

    for (const b of bullets) {
      ctx.fillStyle = '#ffcc44';
      ctx.shadowColor = '#ffcc44';
      ctx.shadowBlur = 15;
      ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    }

    for (const e of enemies) {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.ellipse(e.x + 3, e.y + 5, e.r, e.r * 0.5, 0, 0, Math.PI * 2); ctx.fill();

      const grad = ctx.createRadialGradient(e.x - 3, e.y - 3, 2, e.x, e.y, e.r);
      if (e.hitTimer > 0) {
        grad.addColorStop(0, '#fff');
        grad.addColorStop(1, '#ff4444');
      } else {
        grad.addColorStop(0, '#663333');
        grad.addColorStop(1, '#331111');
      }
      ctx.fillStyle = grad;
      ctx.shadowColor = '#ff4444';
      ctx.shadowBlur = e.hitTimer > 0 ? 20 : 5;
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ff4444';
      const angle = Math.atan2(player.y - e.y, player.x - e.x);
      ctx.beginPath(); ctx.arc(e.x + Math.cos(angle - 0.3) * 4, e.y + Math.sin(angle - 0.3) * 4, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(e.x + Math.cos(angle + 0.3) * 4, e.y + Math.sin(angle + 0.3) * 4, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.arc(e.x + Math.cos(angle - 0.3) * 5, e.y + Math.sin(angle - 0.3) * 5, 1, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(e.x + Math.cos(angle + 0.3) * 5, e.y + Math.sin(angle + 0.3) * 5, 1, 0, Math.PI * 2); ctx.fill();
    }

    const flashPlayer = player.hitTimer > 0 && player.hitTimer % 4 < 2;
    if (!flashPlayer) {
      ctx.shadowColor = '#4488ff';
      ctx.shadowBlur = 20;
      const pg = ctx.createRadialGradient(player.x - 2, player.y - 2, 2, player.x, player.y, player.r);
      pg.addColorStop(0, '#6688ff');
      pg.addColorStop(1, '#2244aa');
      ctx.fillStyle = pg;
      ctx.beginPath(); ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;

      const ga = Math.atan2(my - player.y, mx - player.x);
      ctx.strokeStyle = '#888';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(player.x + Math.cos(ga) * 8, player.y + Math.sin(ga) * 8);
      ctx.lineTo(player.x + Math.cos(ga) * 22, player.y + Math.sin(ga) * 22);
      ctx.stroke();
      ctx.strokeStyle = '#666';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(player.x + Math.cos(ga) * 22, player.y + Math.sin(ga) * 22);
      ctx.lineTo(player.x + Math.cos(ga) * 28, player.y + Math.sin(ga) * 28);
      ctx.stroke();

      const ch = 8;
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(mx - ch, my); ctx.lineTo(mx + ch, my);
      ctx.moveTo(mx, my - ch); ctx.lineTo(mx, my + ch);
      ctx.stroke();
    }

    for (const p of doomParticles) {
      ctx.globalAlpha = p.life / 30;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (p.life / 30), 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.7);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.4)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(mx, my, 12, 0, Math.PI * 2);
    ctx.stroke();
  }

  function cleanup() {
    cancelAnimationFrame(animId);
    document.removeEventListener('keydown', keyD);
    document.removeEventListener('keyup', keyU);
  }

  spawnWave();
  update();

  state.currentCleanup = cleanup;
}
