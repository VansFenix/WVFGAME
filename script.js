// ─── Particles ───
const pCanvas = document.getElementById('particles');
const pCtx = pCanvas.getContext('2d');
let particles = [];
let pW, pH;

function resizeP() {
    pW = pCanvas.width = window.innerWidth;
    pH = pCanvas.height = Math.max(window.innerHeight, document.documentElement.scrollHeight);
}
window.addEventListener('resize', resizeP);
resizeP();

class Dot {
    constructor() { this.reset(); }
    reset() {
        this.x = Math.random() * pW;
        this.y = Math.random() * pH;
        this.s = Math.random() * 2 + 0.5;
        this.dx = (Math.random() - 0.5) * 0.4;
        this.dy = (Math.random() - 0.5) * 0.4;
        this.o = Math.random() * 0.4 + 0.1;
        this.cs = ['rgba(0,245,255,', 'rgba(255,0,228,', 'rgba(0,255,136,'][Math.floor(Math.random() * 3)];
    }
    update() {
        this.x += this.dx; this.y += this.dy;
        if (this.x < -10 || this.x > pW + 10 || this.y < -10 || this.y > pH + 10) this.reset();
    }
    draw() {
        pCtx.beginPath();
        pCtx.arc(this.x, this.y, this.s, 0, Math.PI * 2);
        pCtx.fillStyle = this.cs + this.o + ')';
        pCtx.fill();
    }
}

for (let i = 0; i < 100; i++) particles.push(new Dot());

function animParticles() {
    pCtx.clearRect(0, 0, pW, pH);
    for (const p of particles) { p.update(); p.draw(); }
    for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d < 140) {
                pCtx.beginPath();
                pCtx.moveTo(particles[i].x, particles[i].y);
                pCtx.lineTo(particles[j].x, particles[j].y);
                pCtx.strokeStyle = `rgba(255,255,255,${0.025 * (1 - d / 140)})`;
                pCtx.lineWidth = 0.5;
                pCtx.stroke();
            }
        }
    }
    requestAnimationFrame(animParticles);
}
animParticles();

// ─── Card Tilt Effect ───
document.querySelectorAll('.game-card').forEach(card => {
    card.addEventListener('mousemove', e => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `perspective(800px) rotateY(${x * 12}deg) rotateX(${-y * 12}deg) translateY(-6px) scale(1.02)`;
    });
    card.addEventListener('mouseleave', () => {
        card.style.transform = '';
    });
});

// ─── Navigation ───
const mainMenu = document.getElementById('main-menu');
const gameZone = document.getElementById('game-zone');
const gameTitle = document.getElementById('game-title');
const gameContainer = document.getElementById('game-container');
const gameScore = document.getElementById('game-score');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayText = document.getElementById('overlay-text');
const overlayBtn = document.getElementById('overlay-btn');
const toast = document.getElementById('toast');
let currentCleanup = null;

function showToast(msg, duration = 2000) {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), duration);
}

function showOverlay(title, text, btnText = 'ОК') {
    overlayTitle.textContent = title;
    overlayText.textContent = text;
    overlayBtn.textContent = btnText;
    overlay.classList.remove('hidden');
    overlayBtn.focus();
    return new Promise(resolve => {
        const handler = e => {
            e.stopPropagation();
            overlay.classList.add('hidden');
            overlayBtn.removeEventListener('click', handler);
            resolve();
        };
        overlayBtn.addEventListener('click', handler);
    });
}

const helpOverlay = document.getElementById('help-overlay');
const helpContent = document.getElementById('help-content');

function closeHelp() { helpOverlay.classList.add('hidden'); }

function showHelp() {
    const game = gameTitle.textContent.toLowerCase();
    const rules = {
        'snake': ['🐍 Змейка', ['Управляйте змейкой с помощью <kbd>←↑↓→</kbd> или <kbd>WASD</kbd>', 'Съедайте еду для роста и увеличения счёта', 'Не врезайтесь в стены и собственное тело', '<kbd>Space</kbd> — пауза', 'Скорость растёт с каждыми 50 очками']],
        'tictactoe': ['❌ Крестики-Нолики', ['Поле 3×3, игроки ставят X и O по очереди', 'Цель — собрать 3 в ряд', 'Включите ИИ тумблером для игры против бота', 'ИИ использует минимакс — непобедим']],
        'memory': ['🧠 Мемори', ['Открывайте карты парами, ища совпадения', 'Найдите все 8 пар за минимальное число ходов', 'Чем меньше ходов — тем больше 🪙']],
        'tetris': ['🧊 Тетрис', ['<kbd>←→</kbd> — движение, <kbd>↑</kbd> — поворот', '<kbd>↓</kbd> — ускорение, <kbd>Space</kbd> — сброс', '<kbd>C</kbd> — холд (отложить фигуру)', '<kbd>P</kbd> — пауза', 'Убирайте линии для перехода на новый уровень']],
        'checkers': ['🟦 Шашки', ['Бейте шашки соперника прыжком через них', 'Обязательно бить, если есть возможность', 'Дойдя до края — становится дамкой (★)', 'Дамка ходит и бьёт в любом направлении', 'Цель — побить или заблокировать все шашки ИИ']],
        'doom': ['🔥 DOOM', ['<kbd>WASD</kbd> — движение по арене', '🖱 Мышь — прицел, клик — стрельба', 'На телефоне: левая половина — движение, правая — стрельба', 'Убивайте врагов, переживайте волны', '<kbd>R</kbd> — рестарт']],
        'chess': ['♚ Шахматы', ['Классические шахматы с ИИ (чёрные)', 'Кликните по фигуре, затем по клетке для хода', 'Цель — поставить мат королю соперника', 'ИИ оценивает позицию на несколько ходов вперёд']],
        'sudoku': ['🔢 Судоку', ['Заполните сетку 9×9 цифрами от 1 до 9', 'В каждой строке, столбце и блоке 3×3 цифры не должны повторяться', 'Кликните по клетке, затем нажмите цифру в панели', '<kbd>✕</kbd> — стереть, 💡 — подсказка', 'Всего 3 ошибки — игра окончена']],
        'casino': ['🎰 Казино', ['Используйте 🪙, заработанные в других играх', 'Выберите игру: слоты, кости, орёл/решка, блэкджек', 'Настройте ставку и начните игру', 'Доступно только при наличии 🪙']]
    };

    const key = Object.keys(rules).find(k => game.includes(k));
    if (!key) {
        helpContent.innerHTML = `<h3>🎮 WVF Game</h3><ul>
            <li>Добро пожаловать на игровой портал <strong>WVFGAME</strong>!</li>
            <li>8 игр + казино с валютой 🪙</li>
            <li>Зарабатывай 🪙 в играх, трать в казино</li>
            <li>Авторизация сохраняет прогресс</li>
            <li>Ежедневная награда: <kbd>+5 🪙</kbd></li>
            <li>Для каждой игры есть свои правила — нажми <kbd>?</kbd> во время игры</li>
        </ul>`;
        helpOverlay.classList.remove('hidden');
        return;
    }
    const [title, items] = rules[key];
    helpContent.innerHTML = `<h3>${title}</h3><ul>${items.map(i => `<li>${i}</li>`).join('')}</ul>`;
    helpOverlay.classList.remove('hidden');
}

const profileOverlay = document.getElementById('profile-overlay');
const profileContent = document.getElementById('profile-content');

function showProfile() {
    const user = getCurrentUser();
    if (!user) return;
    const users = getUsers();
    const data = users[user];
    const stats = data.stats || { gamesPlayed: 0, totalEarned: 0, totalSpent: 0, highScores: {} };
    const totalXp = stats.totalEarned;
    const lvl = getLevel(totalXp);
    const prog = getLevelProgress(totalXp);
    const hs = stats.highScores;
    const gameNames = { snake: 'Змейка', tictactoe: 'Крестики-Нолики', memory: 'Мемори', tetris: 'Тетрис', checkers: 'Шашки', doom: 'Doom', chess: 'Шахматы', sudoku: 'Судоку' };
    const hsList = Object.keys(gameNames).filter(k => hs[k] !== undefined).map(k => `<span>${gameNames[k]}: <strong>${hs[k]}</strong></span>`).join('');
    const balance = data.wallet || 0;
    profileContent.innerHTML = `
        <div class="profile-header">
            <div class="profile-avatar">${user[0].toUpperCase()}</div>
            <div class="profile-name">${user}</div>
            <div class="profile-level-row">
                <span class="profile-level-badge">Ур. ${lvl}</span>
                <span class="profile-xp-text">${totalXp} XP</span>
            </div>
        </div>
        <div class="profile-xp-bar-wrap">
            <div class="profile-xp-bar" style="width:${prog.pct}%"></div>
        </div>
        <div class="profile-xp-label">${lvl >= 10 ? '⭐ Максимальный уровень!' : `${prog.current} / ${prog.max} XP до ур. ${lvl + 1}`}</div>
        <div class="profile-stats">
            <div class="profile-stat"><span class="pstat-icon">🎮</span><span>Сыграно</span><strong>${stats.gamesPlayed}</strong></div>
            <div class="profile-stat"><span class="pstat-icon">🪙</span><span>Заработано</span><strong>${stats.totalEarned}</strong></div>
            <div class="profile-stat"><span class="pstat-icon">💸</span><span>Потрачено</span><strong>${stats.totalSpent}</strong></div>
            <div class="profile-stat"><span class="pstat-icon">💰</span><span>Баланс</span><strong>${balance}</strong></div>
        </div>
        ${hsList ? `<div class="profile-hs"><h4>🏆 Рекорды</h4><div class="profile-hs-list">${hsList}</div></div>` : ''}
    `;
    profileOverlay.classList.remove('hidden');
}

function closeProfile() {
    profileOverlay.classList.add('hidden');
}

function startGame(type) {
    closeProfile();
    mainMenu.style.display = 'none';
    gameZone.classList.remove('hidden');
    gameContainer.innerHTML = '';
    gameScore.textContent = '';
    if (currentCleanup) { currentCleanup(); currentCleanup = null; }
    walletDisplay.classList.remove('hidden');
    switch (type) {
        case 'snake': gameTitle.textContent = '🐍 Змейка'; initSnake(); break;
        case 'tictactoe': gameTitle.textContent = '❌ Крестики-Нолики'; initTicTacToe(); break;
        case 'memory': gameTitle.textContent = '🧠 Мемори'; initMemory(); break;
        case 'tetris': gameTitle.textContent = '🧊 Тетрис'; initTetris(); break;
        case 'checkers': gameTitle.textContent = '🟦 Шашки'; initCheckers(); break;
        case 'doom': gameTitle.textContent = '🔥 DOOM'; initDoom(); break;
        case 'chess': gameTitle.textContent = '♚ Шахматы'; initChess(); break;
        case 'sudoku': gameTitle.textContent = '🔢 Судоку'; initSudoku(); break;
        case 'casino': gameTitle.textContent = '🎰 Казино'; initCasino(); break;
    }
}

function backToMenu() {
    if (currentCleanup) { currentCleanup(); currentCleanup = null; }
    saveWallet();
    gameZone.classList.add('hidden');
    mainMenu.style.display = '';
    if (wallet === 0) walletDisplay.classList.add('hidden');
}

// ─── Wallet / Currency ───
const walletEl = document.getElementById('wallet-amount');
const walletDisplay = document.getElementById('wallet-display');
let wallet = 0;
function updateWallet() {
    walletEl.textContent = wallet;
    if (wallet > 0 || !document.getElementById('game-zone').classList.contains('hidden')) walletDisplay.classList.remove('hidden');
    else walletDisplay.classList.add('hidden');
}

// ─── Auth ───
const authOverlay = document.getElementById('auth-overlay');
const authLogin = document.getElementById('auth-login');
const authRegister = document.getElementById('auth-register');
const userBar = document.getElementById('user-bar');
const userName = document.getElementById('user-name');

function simpleHash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) { h = ((h << 5) - h) + str.charCodeAt(i); h |= 0; }
    return h + 'x';
}

function getUsers() { return JSON.parse(localStorage.getItem('wvf_users') || '{}'); }
function saveUsers(u) { localStorage.setItem('wvf_users', JSON.stringify(u)); }

function getCurrentUser() { return localStorage.getItem('wvf_current_user') || null; }
function setCurrentUser(name) {
    if (name) localStorage.setItem('wvf_current_user', name);
    else localStorage.removeItem('wvf_current_user');
}

function loadWallet() {
    const user = getCurrentUser();
    if (!user) { wallet = 0; updateWallet(); return; }
    const users = getUsers();
    if (!users[user]) return;
    wallet = users[user].wallet || 0;
    if (!users[user].stats) users[user].stats = { gamesPlayed: 0, totalEarned: 0, totalSpent: 0, highScores: {} };
    updateWallet();
}

function saveWallet() {
    const user = getCurrentUser();
    if (!user) return;
    const users = getUsers();
    if (!users[user]) return;
    users[user].wallet = wallet;
    saveUsers(users);
}

// Override wallet save to also persist to user account
const origSetItem = localStorage.setItem.bind(localStorage);
localStorage.setItem = function(key, value) {
    origSetItem(key, value);
    if (key === 'wvf_wallet') saveWallet();
};

function login(username, password) {
    const users = getUsers();
    if (!users[username]) return 'Пользователь не найден';
    if (users[username].password !== simpleHash(password)) return 'Неверный пароль';
    setCurrentUser(username);
    userName.textContent = username;
    userBar.classList.remove('hidden');
    authOverlay.classList.add('hidden');
    loadWallet();
    showToast(`👋 С возвращением, ${username}!`, 2500);
    return null;
}

function register(username, password) {
    const users = getUsers();
    if (!username || username.length < 2) return 'Имя должно быть от 2 символов';
    if (users[username]) return 'Пользователь уже существует';
    if (password.length < 3) return 'Пароль должен быть от 3 символов';
    users[username] = { password: simpleHash(password), wallet: 0, stats: { gamesPlayed: 0, totalEarned: 0, totalSpent: 0, highScores: {} } };
    saveUsers(users);
    setCurrentUser(username);
    userName.textContent = username;
    userBar.classList.remove('hidden');
    authOverlay.classList.add('hidden');
    wallet = 0;
    saveWallet();
    updateWallet();
    showToast(`🎉 Добро пожаловать, ${username}! +10 🪙 за регистрацию`, 3000);
    addCoins(10, 'за регистрацию');
    return null;
}

function logout() {
    closeProfile();
    saveWallet();
    setCurrentUser(null);
    userBar.classList.add('hidden');
    wallet = 0;
    updateWallet();
    authOverlay.classList.remove('hidden');
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
    showToast('👋 До встречи!', 2000);
}

function checkDailyReward() {
    const today = new Date().toDateString();
    const last = localStorage.getItem('wvf_daily');
    if (last === today) return;
    localStorage.setItem('wvf_daily', today);
    addCoins(5, 'ежедневная награда 🎁');
    showToast('🎁 Ежедневная награда: +5 🪙!', 3000);
}

// Check session on load
(function initAuth() {
    const user = getCurrentUser();
    if (user) {
        const users = getUsers();
        if (users[user]) {
            userName.textContent = user;
            userBar.classList.remove('hidden');
            authOverlay.classList.add('hidden');
            loadWallet();
            setTimeout(checkDailyReward, 500);
            return;
        }
    }
    authOverlay.classList.remove('hidden');
    loadWallet();
})();

// Auth event listeners
document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        document.querySelectorAll('.auth-form').forEach(f => f.classList.add('hidden'));
        document.getElementById(`auth-${tab.dataset.tab}`).classList.remove('hidden');
        document.getElementById('login-error').textContent = '';
        document.getElementById('register-error').textContent = '';
    });
});

document.getElementById('login-btn').addEventListener('click', () => {
    const u = document.getElementById('login-username').value.trim();
    const p = document.getElementById('login-password').value;
    const err = login(u, p);
    if (err) document.getElementById('login-error').textContent = err;
});

document.getElementById('register-btn').addEventListener('click', () => {
    const u = document.getElementById('register-username').value.trim();
    const p = document.getElementById('register-password').value;
    const c = document.getElementById('register-confirm').value;
    if (p !== c) { document.getElementById('register-error').textContent = 'Пароли не совпадают'; return; }
    const err = register(u, p);
    if (err) document.getElementById('register-error').textContent = err;
});

document.getElementById('logout-btn').addEventListener('click', logout);

// Enter key on inputs
document.querySelectorAll('.auth-input').forEach(inp => {
    inp.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            const form = inp.closest('.auth-form');
            if (form.id === 'auth-login') document.getElementById('login-btn').click();
            else if (form.id === 'auth-register') document.getElementById('register-btn').click();
        }
    });
});

// ─── Stats / Profile ───
function saveStats() {
    const user = getCurrentUser();
    if (!user) return;
    const users = getUsers();
    if (!users[user]) return;
    if (!users[user].stats) users[user].stats = { gamesPlayed: 0, totalEarned: 0, totalSpent: 0, highScores: {} };
    saveUsers(users);
}

function getLevel(xp) {
    if (xp >= 10000) return 10; if (xp >= 7500) return 9;
    if (xp >= 5000) return 8; if (xp >= 3000) return 7;
    if (xp >= 1500) return 6; if (xp >= 750) return 5;
    if (xp >= 350) return 4; if (xp >= 150) return 3;
    if (xp >= 50) return 2; return 1;
}

function getLevelProgress(xp) {
    const thresholds = [0, 50, 150, 350, 750, 1500, 3000, 5000, 7500, 10000, Infinity];
    const lvl = getLevel(xp);
    const lo = thresholds[lvl - 1], hi = thresholds[lvl];
    return { current: xp - lo, max: hi - lo, pct: Math.min(100, ((xp - lo) / (hi - lo)) * 100) };
}

function addCoins(amount, reason) {
    wallet += amount;
    localStorage.setItem('wvf_wallet', wallet);
    updateWallet();
    if (amount > 0) {
        const users = getUsers(); const user = getCurrentUser();
        if (user && users[user]) {
            if (!users[user].stats) users[user].stats = { gamesPlayed: 0, totalEarned: 0, totalSpent: 0, highScores: {} };
            users[user].stats.totalEarned += amount;
            saveUsers(users);
        }
        showToast(`+${amount} 🪙 ${reason}`, 2000); SFX.coin();
    }
}

function spendCoins(amount) {
    if (wallet < amount) return false;
    wallet -= amount;
    localStorage.setItem('wvf_wallet', wallet);
    updateWallet();
    const users = getUsers(); const user = getCurrentUser();
    if (user && users[user]) {
        if (!users[user].stats) users[user].stats = { gamesPlayed: 0, totalEarned: 0, totalSpent: 0, highScores: {} };
        users[user].stats.totalSpent += amount;
        saveUsers(users);
    }
    return true;
}

function trackGamePlayed(game, score) {
    const user = getCurrentUser(); if (!user) return;
    const users = getUsers(); if (!users[user]) return;
    if (!users[user].stats) users[user].stats = { gamesPlayed: 0, totalEarned: 0, totalSpent: 0, highScores: {} };
    users[user].stats.gamesPlayed++;
    if (score !== undefined && score !== null) {
        const key = game;
        if (!users[user].stats.highScores[key] || score > users[user].stats.highScores[key])
            users[user].stats.highScores[key] = Math.round(score);
    }
    saveUsers(users);
}

// ─── Sound (Web Audio) ───
let audioCtx = null;
function ensureAudio() { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }

function playTone(freq, duration, type = 'square', volume = 0.08) {
    try {
        ensureAudio();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(volume, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    } catch (e) {}
}

const SFX = {
    click: () => playTone(800, 0.06, 'square', 0.04),
    win: () => { playTone(523, 0.12, 'square', 0.06); setTimeout(() => playTone(659, 0.12, 'square', 0.06), 130); setTimeout(() => playTone(784, 0.2, 'square', 0.06), 260); },
    lose: () => { playTone(300, 0.15, 'sawtooth', 0.05); setTimeout(() => playTone(200, 0.25, 'sawtooth', 0.05), 160); },
    coin: () => { playTone(1200, 0.05, 'sine', 0.05); setTimeout(() => playTone(1600, 0.08, 'sine', 0.05), 60); },
    move: () => playTone(600, 0.04, 'square', 0.03),
    flip: () => playTone(400, 0.05, 'triangle', 0.04),
    boost: () => { playTone(500, 0.08, 'sine', 0.05); setTimeout(() => playTone(700, 0.08, 'sine', 0.05), 80); },
    alarm: () => { for (let i = 0; i < 3; i++) setTimeout(() => playTone(440, 0.08, 'square', 0.04), i * 120); }
};

// Unlock audio on first user interaction
function unlockAudio() {
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    document.removeEventListener('click', unlockAudio);
    document.removeEventListener('touchstart', unlockAudio);
}
document.addEventListener('click', unlockAudio);
document.addEventListener('touchstart', unlockAudio);

// ─── SNAKE ───
function initSnake() {
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
    gameContainer.appendChild(wrap);

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
        showOverlay('💀 Игра окончена', `Счёт: ${score}\nРекорд: ${highScore}`, 'Заново').then(() => { gameContainer.innerHTML = ''; initSnake(); });
    }

    const keyHandler = e => {
        const c = e.code;
        if (e.key === ' ' || e.key === 'Escape') {
            e.preventDefault();
            if (!running) return;
            paused = !paused;
            if (!paused) step();
            return;
        }
        if (paused || !running) return;
        const u = dy === -GRID, d = dy === GRID, l = dx === -GRID, r = dx === GRID;
        const isDir = ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW','KeyA','KeyS','KeyD'].includes(c);
        if (isDir) e.preventDefault();
        if ((c === 'ArrowUp' || c === 'KeyW') && !d) { dx = 0; dy = -GRID; }
        if ((c === 'ArrowDown' || c === 'KeyS') && !u) { dx = 0; dy = GRID; }
        if ((c === 'ArrowLeft' || c === 'KeyA') && !r) { dx = -GRID; dy = 0; }
        if ((c === 'ArrowRight' || c === 'KeyD') && !l) { dx = GRID; dy = 0; }
    };

    // Touch/swipe
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
            gameScore.textContent = `🎯 ${score}`;
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

        // grid
        cx.strokeStyle = 'rgba(255,255,255,0.015)';
        cx.lineWidth = 0.5;
        for (let i = 0; i <= SIZE; i += GRID) {
            cx.beginPath(); cx.moveTo(i, 0); cx.lineTo(i, SIZE); cx.stroke();
            cx.beginPath(); cx.moveTo(0, i); cx.lineTo(SIZE, i); cx.stroke();
        }

        // food glow
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

        // snake
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

        // eyes
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

    // Snake mobile D-pad
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

    gameScore.textContent = '🎯 0';
    step();

    currentCleanup = () => {
        clearTimeout(loop);
        document.removeEventListener('keydown', keyHandler);
        c.removeEventListener('touchstart', tStart);
        c.removeEventListener('touchend', tEnd);
    };
}

// ─── TIC-TAC-TOE ───
function initTicTacToe() {
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
    restartBtn.addEventListener('click', () => { gameContainer.innerHTML = ''; initTicTacToe(); });
    wrap.appendChild(restartBtn);

    gameContainer.appendChild(wrap);

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

    currentCleanup = () => {};
}

// ─── MEMORY ───
function initMemory() {
    const emojis = ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼'];
    const deck = [...emojis, ...emojis];
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    const wrap = makeDiv('memory-wrapper');

    const stats = document.createElement('div');
    stats.className = 'memory-stats';
    stats.innerHTML = `
        <div>🕐 <span id="mem-time">0</span>с</div>
        <div>👆 Ходы: <span id="mem-moves">0</span></div>
        <div>✅ Найдено: <span id="mem-pairs">0</span>/${emojis.length}</div>
    `;
    wrap.appendChild(stats);

    const grid = document.createElement('div');
    grid.className = 'memory-grid';
    wrap.appendChild(grid);

    const bestWrap = document.createElement('div');
    bestWrap.className = 'memory-best';
    const bestVal = loadHS('memory');
    bestWrap.innerHTML = `🏆 Лучший результат: <span>${bestVal || '—'}</span>`;
    wrap.appendChild(bestWrap);

    gameContainer.appendChild(wrap);

    let flipped = [];
    let matched = 0;
    let moves = 0;
    let locked = false;
    let timer = 0;
    let timerInterval;
    let started = false;

    function startTimer() {
        if (started) return;
        started = true;
        timerInterval = setInterval(() => {
            timer++;
            document.getElementById('mem-time').textContent = timer;
        }, 1000);
    }

    function createCard(emoji, idx) {
        const card = document.createElement('button');
        card.className = 'memory-card';
        card.dataset.idx = idx;
        card.innerHTML = `
            <div class="memory-card-face memory-card-back">?</div>
            <div class="memory-card-face memory-card-front">${emoji}</div>
        `;
        card.addEventListener('click', () => flipCard(card, idx));
        return card;
    }

    function saveBest() {
        const prev = +loadHS('memory');
        if (!prev || moves < prev) {
            localStorage.setItem('wvf_memory_hs', moves);
            bestWrap.innerHTML = `🏆 Лучший результат: <span>${moves}</span>`;
        }
    }

    function flipCard(card, idx) {
        if (locked || card.classList.contains('flipped') || card.classList.contains('matched')) return;
        if (flipped.length >= 2) return;
        startTimer();

        card.classList.add('flipped');
        SFX.flip();
        flipped.push(idx);

        if (flipped.length === 2) {
            moves++;
            document.getElementById('mem-moves').textContent = moves;
            locked = true;

            if (deck[flipped[0]] === deck[flipped[1]]) {
                setTimeout(() => {
                    document.querySelectorAll('.memory-card')[flipped[0]].classList.add('matched');
                    document.querySelectorAll('.memory-card')[flipped[1]].classList.add('matched');
                    matched++; SFX.boost();
                    document.getElementById('mem-pairs').textContent = matched;
                    flipped = [];
                    locked = false;
                    if (matched === emojis.length) {
                        clearInterval(timerInterval);
                        gameScore.textContent = `✅ ${moves} ходов`;
                        saveBest(); SFX.win();
                        const coins = Math.max(1, Math.floor(10 - moves / 6));
                        addCoins(coins, 'Мемори');
                        trackGamePlayed('memory', Math.max(0, 100 - moves * 2));
                        setTimeout(() => {
                            showOverlay('🎉 Победа!', `Ты справился за ${moves} ходов и ${timer} секунд!`, 'Ещё раз')
                                .then(() => { gameContainer.innerHTML = ''; initMemory(); });
                        }, 400);
                    }
                }, 350);
            } else {
                setTimeout(() => {
                    document.querySelectorAll('.memory-card')[flipped[0]].classList.remove('flipped');
                    document.querySelectorAll('.memory-card')[flipped[1]].classList.remove('flipped');
                    flipped = [];
                    locked = false;
                }, 700);
            }
        }
    }

    deck.forEach((emoji, i) => grid.appendChild(createCard(emoji, i)));

    currentCleanup = () => {
        clearInterval(timerInterval);
    };
}

// ─── TETRIS ───
function initTetris() {
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
    gameContainer.appendChild(wrap);

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
        if (collision(current.x, current.y, current.piece.s)) { over = true; clearInterval(dropInterval); SFX.lose(); const coins = Math.floor(score / 100); if (coins > 0) addCoins(coins, 'Тетрис'); trackGamePlayed('tetris', score); }
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
            gameScore.textContent = `🏆 ${score}`;
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
        const c = e.code;
        if (c === 'KeyP') { paused = !paused; draw(); return; }
        if (c === 'Enter' && over) { clearInterval(dropInterval); initTetris(); return; }
        if (over) return;
        if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','KeyW','KeyA','KeyS','KeyD','KeyC'].includes(c)) e.preventDefault();
        switch (c) {
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

    // Tetris touch controls
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
            // ghost
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

        // Draw next
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

    currentCleanup = () => {
        clearInterval(dropInterval);
        document.removeEventListener('keydown', keyHandler);
        tetrisTouch.removeEventListener('click');
    };
}

// ─── CHECKERS ───
function initCheckers() {
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

    gameContainer.appendChild(wrap);

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
        gameScore.textContent = '';
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
    bottom.querySelector('.checkers-restart').addEventListener('click', () => { gameContainer.innerHTML = ''; initCheckers(); });
    initBoard();
    draw();
    currentCleanup = () => {};
}

// ─── DOOM ───
function initDoom() {
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

    gameContainer.appendChild(wrap);

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
        const c = e.code;
        keys[c] = true;
        if (c === 'KeyR') { cleanup(); initDoom(); return; }
        if (['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(c)) e.preventDefault();
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

    // Touch controls
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
        // muzzle flash
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

        // Move player
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

        // Wave spawner
        if (enemies.length === 0 && spawnCount === 0 && !gameOver) {
            waveDelay++;
            if (waveDelay > 60) {
                wave++;
                document.getElementById('d-wave').textContent = wave;
                spawnWave();
                waveDelay = 0;
            }
        }

        // Update bullets
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

        // Update enemies
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
                        showOverlay('💀 Погиб', `Убито: ${kills} | Волна: ${wave}`, 'Заново').then(() => { gameContainer.innerHTML = ''; initDoom(); });
                    }
                }
            }
        }

        // Update particles
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

        // Floor
        ctx.fillStyle = '#111';
        ctx.fillRect(0, H * 0.75, W, H * 0.25);
        ctx.fillStyle = '#151515';
        ctx.fillRect(0, H * 0.75, W, 2);

        // Grid lines (retro feel)
        ctx.strokeStyle = 'rgba(255,255,255,0.02)';
        ctx.lineWidth = 1;
        for (let i = 0; i < W; i += 40) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, H); ctx.stroke(); }
        for (let i = 0; i < H; i += 40) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(W, i); ctx.stroke(); }

        // Bullets
        for (const b of bullets) {
            ctx.fillStyle = '#ffcc44';
            ctx.shadowColor = '#ffcc44';
            ctx.shadowBlur = 15;
            ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
        }

        // Enemies
        for (const e of enemies) {
            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.beginPath(); ctx.ellipse(e.x + 3, e.y + 5, e.r, e.r * 0.5, 0, 0, Math.PI * 2); ctx.fill();

            // Body
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

            // Eyes
            ctx.fillStyle = '#ff4444';
            const angle = Math.atan2(player.y - e.y, player.x - e.x);
            ctx.beginPath(); ctx.arc(e.x + Math.cos(angle - 0.3) * 4, e.y + Math.sin(angle - 0.3) * 4, 2.5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(e.x + Math.cos(angle + 0.3) * 4, e.y + Math.sin(angle + 0.3) * 4, 2.5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#000';
            ctx.beginPath(); ctx.arc(e.x + Math.cos(angle - 0.3) * 5, e.y + Math.sin(angle - 0.3) * 5, 1, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(e.x + Math.cos(angle + 0.3) * 5, e.y + Math.sin(angle + 0.3) * 5, 1, 0, Math.PI * 2); ctx.fill();
        }

        // Player
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

            // Gun
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

            // Crosshair
            const ch = 8;
            ctx.strokeStyle = 'rgba(255,255,255,0.5)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(mx - ch, my); ctx.lineTo(mx + ch, my);
            ctx.moveTo(mx, my - ch); ctx.lineTo(mx, my + ch);
            ctx.stroke();
        }

        // Particles
        for (const p of doomParticles) {
            ctx.globalAlpha = p.life / 30;
            ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (p.life / 30), 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Vignette
        const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.7);
        vig.addColorStop(0, 'rgba(0,0,0,0)');
        vig.addColorStop(1, 'rgba(0,0,0,0.4)');
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, W, H);

        // Crosshair
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

    currentCleanup = cleanup;
}

// ─── CHESS ───
function initChess() {
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

    gameContainer.appendChild(wrap);

    const ctx = c.getContext('2d');
    let board = [], selected = null, turn = 'white', over = false;
    let moves = []; // legal moves for selected piece

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
        gameScore.textContent = '';
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
            // pawn promotion
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

    function evalBoard(b) {
        const vals = { p: 1, n: 3, b: 3.2, r: 5, q: 9, k: 0 };
        let score = 0;
        for (let r = 0; r < 8; r++)
            for (let c = 0; c < 8; c++) {
                const p = b[r][c];
                if (!p) continue;
                const v = vals[p.toLowerCase()] || 0;
                score += isWhite(p) ? v : -v;
            }
        return score;
    }

    function aiMove() {
        const all = getAllLegal(board, 'black');
        if (!all.length) return null;
        let best = -Infinity, bestMove = null;
        for (const m of all) {
            const nb = cloneBoard(board);
            nb[m.dr][m.dc] = nb[m.sr][m.sc];
            nb[m.sr][m.sc] = 0;
            const pp = nb[m.dr][m.dc].toLowerCase();
            if (pp === 'p' && (m.dr === 0 || m.dr === 7)) nb[m.dr][m.dc] = 'q';
            const score = -evalBoard(nb) + (Math.random() - 0.5) * 0.5;
            if (score > best) { best = score; bestMove = m; }
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
                const nb = cloneBoard(board);
                nb[row][col] = nb[selected.r][selected.c];
                nb[selected.r][selected.c] = 0;
                const pp = nb[row][col].toLowerCase();
                if (pp === 'p' && (row === 0 || row === 7)) nb[row][col] = 'Q';
                board = nb;
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
        board[m.dr][m.dc] = board[m.sr][m.sc];
        board[m.sr][m.sc] = 0;
        const pp = board[m.dr][m.dc].toLowerCase();
        if (pp === 'p' && (m.dr === 0 || m.dr === 7)) board[m.dr][m.dc] = 'q';

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

    document.getElementById('chess-restart').addEventListener('click', () => { gameContainer.innerHTML = ''; initChess(); });
    initBoard();
    draw();
    currentCleanup = () => {};
}

// ─── SUDOKU ───
function initSudoku() {
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

    gameContainer.appendChild(wrap);

    const ctx = c.getContext('2d');
    let board = [], solution = [], selected = null;
    let mistakes = 0, timer = 0, timerInterval, started = false;
    let gameOver = false, hintsLeft = 3;
    let fixed = [];

    const PRESETS = [
        { p: '530070000600195000098000060800060003400803001700020006060000280000419005000080079', s: '534678912672195348198342567859761423426853791713924856961537284287419635345286179' }
    ];

    function generatePuzzle() {
        const base = PRESETS[0];
        // Generate a permutation that maps digits 1-9
        const perm = shuffleArray([1,2,3,4,5,6,7,8,9]);
        const inv = [0]; for (let i = 1; i <= 9; i++) inv[perm[i-1]] = i;
        const pArr = base.p.split('').map(Number);
        const sArr = base.s.split('').map(Number);
        const puzzle = [], sol = [];
        for (let i = 0; i < 81; i++) {
            puzzle[i] = pArr[i] === 0 ? 0 : perm[pArr[i] - 1];
            sol[i] = perm[sArr[i] - 1];
        }
        // Remove extra digits for variety (turn some clues into holes)
        const holes = shuffleArray([...Array(81).keys()]).filter(i => puzzle[i] !== 0);
        let toRemove = Math.floor(Math.random() * 6) + 3;
        for (let i = 0; i < toRemove && i < holes.length; i++) puzzle[holes[i]] = 0;
        return { p: puzzle.join(''), s: sol.join('') };
    }

    function loadPuzzle() {
        const data = generatePuzzle();
        solution = data.s.split('').map(Number);
        const puzzle = data.p.split('').map(Number);
        board = [];
        fixed = [];
        for (let r = 0; r < 9; r++) {
            board[r] = [];
            fixed[r] = [];
            for (let c = 0; c < 9; c++) {
                const v = puzzle[r * 9 + c];
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
            setTimeout(() => showOverlay('🎉 Победа!', `Решено за ${timer} секунд с ${mistakes} ошибками!`, 'Ещё').then(() => { gameContainer.innerHTML = ''; initSudoku(); }), 300);
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
        if (solution[r * 9 + c] === num) {
            board[r][c] = num;
            fixed[r][c] = true;
            draw();
            updateProgress();
            // find next empty
            for (let i = r * 9 + c + 1; i < 81; i++) {
                const nr = Math.floor(i / 9), nc = i % 9;
                if (!fixed[nr][nc]) { selected = { r: nr, c: nc }; draw(); return; }
            }
            selected = null; draw();
        } else {
            mistakes++;
            document.getElementById('sud-mistakes').textContent = mistakes;
            // flash red
            const x = PAD + c * S, y = PAD + r * S;
            ctx.fillStyle = 'rgba(255,0,0,0.3)';
            ctx.fillRect(x, y, S, S);
            setTimeout(draw, 300);
            if (mistakes >= 3) {
                gameOver = true;
                clearInterval(timerInterval);
                setTimeout(() => showOverlay('💀 Поражение', '3 ошибки — игра окончена!', 'Заново').then(() => { gameContainer.innerHTML = ''; initSudoku(); }), 500);
            }
        }
    }

    function giveHint() {
        if (gameOver || hintsLeft <= 0) return;
        for (let r = 0; r < 9; r++)
            for (let c = 0; c < 9; c++) {
                if (!fixed[r][c] && board[r][c] === 0) {
                    board[r][c] = solution[r * 9 + c];
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

        // Background
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, SIZE, SIZE);

        // Cells
        for (let r = 0; r < 9; r++)
            for (let c = 0; c < 9; c++) {
                const x = PAD + c * S, y = PAD + r * S;
                ctx.fillStyle = (r + c) % 2 === 0 ? '#1e1e34' : '#16162a';
                ctx.fillRect(x, y, S, S);
            }

        // Selected
        if (selected) {
            ctx.fillStyle = 'rgba(80,200,255,0.12)';
            ctx.fillRect(PAD + selected.c * S, PAD + selected.r * S, S, S);
            ctx.strokeStyle = 'rgba(80,200,255,0.5)';
            ctx.lineWidth = 2;
            ctx.strokeRect(PAD + selected.c * S + 1, PAD + selected.r * S + 1, S - 2, S - 2);
        }

        // Numbers
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

        // Box lines
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

        // Thick box borders
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
    document.getElementById('sud-restart').addEventListener('click', () => { clearInterval(timerInterval); gameContainer.innerHTML = ''; initSudoku(); });

    loadPuzzle();
    draw();
    currentCleanup = () => { clearInterval(timerInterval); };
}

// ─── CASINO ───
function initCasino() {
    let activeGame = null, betAmount = 10;

    const wrap = document.createElement('div');
    wrap.className = 'casino-wrap';

    const top = document.createElement('div');
    top.className = 'casino-top';
    top.innerHTML = `
        <div class="casino-balance"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#ffd700" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v2m0 6v2m-3-5h6"/></svg> <span id="casino-bal">${wallet}</span></div>
        <div class="casino-bet">
            <span>Ставка:</span>
            <button class="casino-bet-btn" data-bet="5">5</button>
            <button class="casino-bet-btn active" data-bet="10">10</button>
            <button class="casino-bet-btn" data-bet="25">25</button>
            <button class="casino-bet-btn" data-bet="50">50</button>
            <button class="casino-bet-btn" data-bet="100">100</button>
        </div>
    `;
    wrap.appendChild(top);

    const gamesRow = document.createElement('div');
    gamesRow.className = 'casino-games';
    gamesRow.innerHTML = `
        <button class="casino-game-btn" data-game="slots">🎰 Слоты</button>
        <button class="casino-game-btn" data-game="dice">🎲 Кости</button>
        <button class="casino-game-btn" data-game="coinflip">🪙 Орёл/Решка</button>
        <button class="casino-game-btn" data-game="blackjack">🃏 Блэкджек</button>
    `;
    wrap.appendChild(gamesRow);

    const area = document.createElement('div');
    area.className = 'casino-area';
    area.id = 'casino-area';
    area.innerHTML = '<div class="casino-placeholder">Выбери игру</div>';
    wrap.appendChild(area);

    const result = document.createElement('div');
    result.className = 'casino-result';
    result.id = 'casino-result';
    wrap.appendChild(result);

    gameContainer.appendChild(wrap);

    function updateBal() {
        document.getElementById('casino-bal').textContent = wallet;
        updateWallet();
    }

    function updateBetButtons() {
        document.querySelectorAll('.casino-action-btn').forEach(b => {
            if (b.id !== 'bj-deal' && b.id !== 'bj-hit' && b.id !== 'bj-stand' && b.id !== 'bj-double') {
                const txt = b.textContent.replace(/\d+🪙/, betAmount + '🪙');
                if (!txt.includes('🪙')) return;
                b.textContent = txt;
            }
        });
    }

    top.addEventListener('click', e => {
        const btn = e.target.closest('.casino-bet-btn');
        if (btn) {
            top.querySelectorAll('.casino-bet-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            betAmount = +btn.dataset.bet;
            updateBetButtons();
        }
    });

    // ─── Slots ───
    function initSlots() {
        activeGame = 'slots';
        area.innerHTML = `
            <div class="slots-wrap">
                <div class="slots-reels">
                    <div class="slot-reel" id="slot-r0">🍒</div>
                    <div class="slot-reel" id="slot-r1">🍒</div>
                    <div class="slot-reel" id="slot-r2">🍒</div>
                </div>
                <div class="slots-pay">
                    <span>🍒🍒🍒 x3</span> <span>🍋🍋🍋 x5</span> <span>💎💎💎 x15</span> <span>7️⃣7️⃣7️⃣ x25</span>
                </div>
                <button class="casino-action-btn" id="slots-spin">🎰 Крутить (${betAmount}🪙)</button>
            </div>
        `;
        document.getElementById('slots-spin').addEventListener('click', spinSlots);
    }

    const SLOT_SYMBOLS = ['🍒', '🍋', '🍊', '🍇', '💎', '7️⃣'];
    const SLOT_PAY = { '🍒🍒🍒': 3, '🍋🍋🍋': 5, '🍊🍊🍊': 8, '🍇🍇🍇': 10, '💎💎💎': 15, '7️⃣7️⃣7️⃣': 25 };

    function spinSlots() {
        if (!spendCoins(betAmount)) { showToast('Недостаточно 🪙!', 2000); return; }
        updateBal();
        const reels = [0, 1, 2].map(() => SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)]);
        const els = [0, 1, 2].map(i => document.getElementById(`slot-r${i}`));
        // Animate
        let ticks = 0;
        const anim = setInterval(() => {
            for (let i = 0; i < 3; i++) {
                const idx = Math.floor(Math.random() * SLOT_SYMBOLS.length);
                els[i].textContent = SLOT_SYMBOLS[idx];
            }
            ticks++;
            if (ticks > 10) {
                clearInterval(anim);
                els.forEach((el, i) => el.textContent = reels[i]);
                const combo = reels.join('');
                const mult = SLOT_PAY[combo] || 0;
                if (mult > 0) {
                    const win = betAmount * mult;
                    addCoins(win, 'Слоты');
                    updateBal();
                    document.getElementById('casino-result').innerHTML = `<span class="casino-win">🎉 Выигрыш: ${win}🪙 (x${mult})</span>`;
                } else {
                    document.getElementById('casino-result').innerHTML = `<span class="casino-lose">😔 Повезёт в следующий раз</span>`; SFX.lose();
                }
            }
        }, 80);
    }

    // ─── Dice ───
    function initDice() {
        activeGame = 'dice';
        area.innerHTML = `
            <div class="dice-wrap">
                <div class="dice-preview" id="dice-preview">🎲</div>
                <div class="dice-choices">
                    <button class="dice-choice" data-pred="over">Больше 50 (x1.9)</button>
                    <button class="dice-choice" data-pred="under">Меньше 50 (x1.9)</button>
                    <button class="dice-choice" data-pred="exact">Ровно 50 (x10)</button>
                </div>
                <button class="casino-action-btn" id="dice-roll">🎲 Бросить (${betAmount}🪙)</button>
            </div>
        `;
        document.getElementById('dice-roll').addEventListener('click', rollDice);
        area.querySelectorAll('.dice-choice').forEach(b => {
            b.addEventListener('click', () => {
                area.querySelectorAll('.dice-choice').forEach(x => x.classList.remove('active'));
                b.classList.add('active');
            });
        });
        area.querySelector('.dice-choice').classList.add('active');
    }

    function rollDice() {
        const pred = area.querySelector('.dice-choice.active');
        if (!pred) return;
        if (!spendCoins(betAmount)) { showToast('Недостаточно 🪙!', 2000); return; }
        updateBal();
        const value = Math.floor(Math.random() * 99) + 1;
        const el = document.getElementById('dice-preview');
        let ticks = 0;
        const anim = setInterval(() => { el.textContent = ['⚀','⚁','⚂','⚃','⚄','⚅'][Math.floor(Math.random() * 6)]; ticks++; if (ticks > 8) { clearInterval(anim); el.textContent = `🎲 ${value}`; resolveDice(value, pred.dataset.pred); } }, 80);
    }

    function resolveDice(value, pred) {
        let win = 0;
        if (pred === 'over' && value > 50) win = Math.floor(betAmount * 1.9);
        else if (pred === 'under' && value < 50) win = Math.floor(betAmount * 1.9);
        else if (pred === 'exact' && value === 50) win = betAmount * 10;

        if (win > 0) {
            addCoins(win, 'Кости');
            updateBal();
            document.getElementById('casino-result').innerHTML = `<span class="casino-win">🎉 Выпало ${value}! Выигрыш: ${win}🪙</span>`;
        } else {
            document.getElementById('casino-result').innerHTML = `<span class="casino-lose">😔 Выпало ${value} — мимо</span>`; SFX.lose();
        }
    }

    // ─── Coinflip ───
    function initCoinflip() {
        activeGame = 'coinflip';
        area.innerHTML = `
            <div class="coinflip-wrap">
                <div class="coin" id="coin">👑</div>
                <div class="coinflip-choices">
                    <button class="coinflip-choice" data-side="heads">Орёл (x2)</button>
                    <button class="coinflip-choice" data-side="tails">Решка (x2)</button>
                </div>
                <button class="casino-action-btn" id="coinflip-flip">🪙 Подбросить (${betAmount}🪙)</button>
            </div>
        `;
        document.getElementById('coinflip-flip').addEventListener('click', flipCoin);
        area.querySelectorAll('.coinflip-choice').forEach(b => {
            b.addEventListener('click', () => {
                area.querySelectorAll('.coinflip-choice').forEach(x => x.classList.remove('active'));
                b.classList.add('active');
            });
        });
        area.querySelector('.coinflip-choice').classList.add('active');
    }

    function flipCoin() {
        const side = area.querySelector('.coinflip-choice.active');
        if (!side) return;
        if (!spendCoins(betAmount)) { showToast('Недостаточно 🪙!', 2000); return; }
        updateBal();
        const result = Math.random() < 0.5 ? 'heads' : 'tails';
        const el = document.getElementById('coin');
        let ticks = 0;
        const anim = setInterval(() => { el.textContent = ticks % 2 === 0 ? '👑' : '🦅'; el.style.transform = `rotateY(${ticks * 180}deg)`; ticks++; if (ticks > 6) { clearInterval(anim); el.style.transform = ''; resolveCoin(result, side.dataset.side); } }, 100);
    }

    function resolveCoin(result, pick) {
        if (result === pick) {
            const win = betAmount * 2;
            addCoins(win, 'Орёл/Решка');
            updateBal();
            document.getElementById('coin').textContent = result === 'heads' ? '👑' : '🦅';
            document.getElementById('casino-result').innerHTML = `<span class="casino-win">🎉 ${result === 'heads' ? 'Орёл' : 'Решка'}! Выигрыш: ${win}🪙</span>`;
        } else {
            document.getElementById('coin').textContent = result === 'heads' ? '👑' : '🦅';
            document.getElementById('casino-result').innerHTML = `<span class="casino-lose">😔 ${result === 'heads' ? 'Орёл' : 'Решка'} — не угадал</span>`; SFX.lose();
        }
    }

    // ─── Blackjack ───
    function initBlackjack() {
        activeGame = 'blackjack';
        area.innerHTML = `
            <div class="bj-wrap">
                <div class="bj-hand">
                    <div class="bj-label">Дилер: <span id="bj-dealer-label">?</span></div>
                    <div class="bj-cards" id="bj-dealer"></div>
                </div>
                <div class="bj-hand">
                    <div class="bj-label">Ты: <span id="bj-player-label">0</span></div>
                    <div class="bj-cards" id="bj-player"></div>
                </div>
                <div class="bj-actions">
                    <button class="casino-action-btn" id="bj-hit">➕ Ещё</button>
                    <button class="casino-action-btn" id="bj-stand">✋ Хватит</button>
                    <button class="casino-action-btn" id="bj-double">📈 Удвоить</button>
                </div>
                <button class="casino-action-btn" id="bj-deal">🃏 Раздать (${betAmount}🪙)</button>
            </div>
        `;
        document.getElementById('bj-deal').addEventListener('click', dealBlackjack);
        document.getElementById('bj-hit').addEventListener('click', bjHit);
        document.getElementById('bj-stand').addEventListener('click', bjStand);
        document.getElementById('bj-double').addEventListener('click', bjDouble);
        document.getElementById('bj-hit').disabled = true;
        document.getElementById('bj-stand').disabled = true;
        document.getElementById('bj-double').disabled = true;
    }

    const DECK = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
    let bjDeck = [], bjPlayer = [], bjDealer = [], bjBet = 0, bjDone = false;

    function bjVal(hand) {
        let total = 0, aces = 0;
        for (const c of hand) {
            if (c === 'A') { aces++; total += 11; }
            else if (['K','Q','J'].includes(c)) total += 10;
            else total += +c;
        }
        while (total > 21 && aces > 0) { total -= 10; aces--; }
        return total;
    }

    function bjCardHTML(c) {
        const suit = ['♠','♥','♦','♣'][Math.floor(Math.random() * 4)];
        return `<span class="bj-card ${suit === '♥' || suit === '♦' ? 'red' : ''}">${c}${suit}</span>`;
    }

    function bjDraw() { return bjDeck.pop(); }

    function dealBlackjack() {
        if (!spendCoins(betAmount)) { showToast('Недостаточно 🪙!', 2000); return; }
        updateBal();
        bjBet = betAmount;
        bjDeck = [...DECK, ...DECK, ...DECK, ...DECK];
        for (let i = bjDeck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [bjDeck[i], bjDeck[j]] = [bjDeck[j], bjDeck[i]]; }
        bjPlayer = [bjDraw(), bjDraw()];
        bjDealer = [bjDraw(), bjDraw()];
        bjDone = false;
        renderBJ();
        document.getElementById('bj-hit').disabled = false;
        document.getElementById('bj-stand').disabled = false;
        document.getElementById('bj-double').disabled = wallet >= bjBet;
        document.getElementById('bj-deal').disabled = true;
        if (bjVal(bjPlayer) === 21) bjStand(); // natural blackjack
    }

    function renderBJ() {
        document.getElementById('bj-player').innerHTML = bjPlayer.map(bjCardHTML).join('');
        document.getElementById('bj-dealer').innerHTML = bjDone ? bjDealer.map(bjCardHTML).join('') : bjCardHTML(bjDealer[0]) + '<span class="bj-card back">?</span>';
        document.getElementById('bj-player-label').textContent = bjVal(bjPlayer);
        document.getElementById('bj-dealer-label').textContent = bjDone ? bjVal(bjDealer) : '?';
    }

    function bjHit() {
        if (bjDone) return;
        bjPlayer.push(bjDraw());
        renderBJ();
        if (bjVal(bjPlayer) > 21) { bjDone = true; bjEnd(false); return; }
        if (bjVal(bjPlayer) === 21) bjStand();
    }

    function bjDouble() {
        if (bjDone || !spendCoins(bjBet)) return;
        bjBet *= 2;
        updateBal();
        bjPlayer.push(bjDraw());
        renderBJ();
        bjDone = true;
        if (bjVal(bjPlayer) > 21) { bjEnd(false); return; }
        bjStand();
    }

    function bjStand() {
        if (bjDone) return;
        bjDone = true;
        while (bjVal(bjDealer) < 17) bjDealer.push(bjDraw());
        renderBJ();
        const p = bjVal(bjPlayer), d = bjVal(bjDealer);
        if (d > 21 || p > d) bjEnd(true);
        else if (p === d) bjEnd('push');
        else bjEnd(false);
    }

    function bjEnd(won) {
        document.getElementById('bj-hit').disabled = true;
        document.getElementById('bj-stand').disabled = true;
        document.getElementById('bj-double').disabled = true;
        document.getElementById('bj-deal').disabled = false;
        if (won === 'push') {
            wallet += bjBet;
            localStorage.setItem('wvf_wallet', wallet);
            updateBal();
            document.getElementById('casino-result').innerHTML = `<span class="casino-lose">🤝 Ничья — возврат ${bjBet}🪙</span>`;
        } else if (won) {
            const win = bjBet * 2;
            addCoins(win, 'Блэкджек');
            updateBal();
            document.getElementById('casino-result').innerHTML = `<span class="casino-win">🎉 Победа! Выигрыш: ${win}🪙</span>`;
        } else {
            document.getElementById('casino-result').innerHTML = `<span class="casino-lose">😔 Дилер победил — ${bjBet}🪙 проиграно</span>`; SFX.lose();
        }
    }

    // ─── Game switching ───
    gamesRow.addEventListener('click', e => {
        const btn = e.target.closest('.casino-game-btn');
        if (!btn) return;
        gamesRow.querySelectorAll('.casino-game-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('casino-result').innerHTML = '';
        gameScore.textContent = '';
        switch (btn.dataset.game) {
            case 'slots': initSlots(); break;
            case 'dice': initDice(); break;
            case 'coinflip': initCoinflip(); break;
            case 'blackjack': initBlackjack(); break;
        }
    });

    gamesRow.querySelector('.casino-game-btn').classList.add('active');
    initSlots();
    currentCleanup = () => {};
}

// ─── PWA / SW ───
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(() => {});
    });
}

// ─── Helpers ───
function loadHS(game) {
    const keys = { snake: 'wvf_snake_hs', memory: 'wvf_memory_hs' };
    return localStorage.getItem(keys[game]) || '0';
}

function createCanvas(w, h, cls) {
    const c = document.createElement('canvas');
    if (cls) c.className = cls;
    c.width = w; c.height = h;
    return c;
}

function addTouchClick(canvas) {
    canvas.addEventListener('touchstart', e => {
        e.preventDefault();
        const t = e.changedTouches[0];
        if (t) canvas.dispatchEvent(new MouseEvent('click', { clientX: t.clientX, clientY: t.clientY }));
    }, { passive: false });
}

function makeButton(text, cls, onClick) {
    const b = document.createElement('button');
    b.textContent = text;
    if (cls) b.className = cls;
    if (onClick) b.addEventListener('click', onClick);
    return b;
}

function makeDiv(cls) {
    const d = document.createElement('div');
    if (cls) d.className = cls;
    return d;
}

function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}
