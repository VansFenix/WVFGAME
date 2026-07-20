import { state } from './state.js';
import { DOM } from './dom.js';
import { showToast } from './ui.js';
import { SFX } from './sound.js';
import { loadWallet, saveWallet, updateWallet, addCoins } from './wallet.js';

// ─── Hashing ───

function simpleHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) { h = ((h << 5) - h) + str.charCodeAt(i); h |= 0; }
  return h + 'x';
}

async function sha256(str) {
  try {
    if (crypto.subtle) {
      const enc = new TextEncoder().encode(str);
      const buf = await crypto.subtle.digest('SHA-256', enc);
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    }
  } catch {}
  return simpleHash(str);
}

// Detect which hash was used
function isSimpleHash(h) { return /^-?\d+x$/.test(h); }

export async function hashPassword(password) {
  return await sha256(password);
}

// ─── User Storage ───

export function getUsers() { return JSON.parse(localStorage.getItem('wvf_users') || '{}'); }
export function saveUsers(u) { localStorage.setItem('wvf_users', JSON.stringify(u)); }

export function getCurrentUser() { return localStorage.getItem('wvf_current_user') || null; }
export function setCurrentUser(name) {
  if (name) localStorage.setItem('wvf_current_user', name);
  else localStorage.removeItem('wvf_current_user');
}

// ─── Login / Register ───

export async function login(username, password) {
  const users = getUsers();
  if (!users[username]) return 'Пользователь не найден';

  const stored = users[username].password;
  let ok = false;

  if (isSimpleHash(stored)) {
    ok = stored === simpleHash(password);
    // Upgrade to SHA-256 on successful login
    if (ok) {
      users[username].password = await sha256(password);
      saveUsers(users);
    }
  } else {
    ok = stored === await sha256(password);
  }

  if (!ok) return 'Неверный пароль';

  setCurrentUser(username);
  DOM.userName.textContent = username;
  DOM.userBar.classList.remove('hidden');
  DOM.authOverlay.classList.add('hidden');
  loadWallet();
  showToast(`👋 С возвращением, ${username}!`, 2500);
  return null;
}

export async function register(username, password) {
  const users = getUsers();
  if (!username || username.length < 2) return 'Имя должно быть от 2 символов';
  if (users[username]) return 'Пользователь уже существует';
  if (password.length < 3) return 'Пароль должен быть от 3 символов';

  users[username] = {
    password: await sha256(password),
    wallet: 0,
    stats: { gamesPlayed: 0, totalEarned: 0, totalSpent: 0, highScores: {} }
  };
  saveUsers(users);
  setCurrentUser(username);
  DOM.userName.textContent = username;
  DOM.userBar.classList.remove('hidden');
  DOM.authOverlay.classList.add('hidden');
  state.wallet = 0;
  saveWallet();
  updateWallet();
  showToast(`🎉 Добро пожаловать, ${username}! +10 🪙 за регистрацию`, 3000);
  addCoins(10, 'за регистрацию');
  return null;
}

export function logout() {
  closeProfile();
  saveWallet();
  setCurrentUser(null);
  DOM.userBar.classList.add('hidden');
  state.wallet = 0;
  updateWallet();
  DOM.authOverlay.classList.remove('hidden');
  document.getElementById('login-username').value = '';
  document.getElementById('login-password').value = '';
  showToast('👋 До встречи!', 2000);
}

export function checkDailyReward() {
  const today = new Date().toDateString();
  const last = localStorage.getItem('wvf_daily');
  if (last === today) return;
  localStorage.setItem('wvf_daily', today);
  addCoins(5, 'ежедневная награда 🎁');
  showToast('🎁 Ежедневная награда: +5 🪙!', 3000);
}

// ─── Levels / XP ───

export function getLevel(xp) {
  if (xp >= 10000) return 10; if (xp >= 7500) return 9;
  if (xp >= 5000) return 8; if (xp >= 3000) return 7;
  if (xp >= 1500) return 6; if (xp >= 750) return 5;
  if (xp >= 350) return 4; if (xp >= 150) return 3;
  if (xp >= 50) return 2; return 1;
}

export function getLevelProgress(xp) {
  const thresholds = [0, 50, 150, 350, 750, 1500, 3000, 5000, 7500, 10000, Infinity];
  const lvl = getLevel(xp);
  const lo = thresholds[lvl - 1], hi = thresholds[lvl];
  return { current: xp - lo, max: hi - lo, pct: Math.min(100, ((xp - lo) / (hi - lo)) * 100) };
}

// ─── Stats ───

export function saveStats() {
  const user = getCurrentUser();
  if (!user) return;
  const users = getUsers();
  if (!users[user]) return;
  if (!users[user].stats) users[user].stats = { gamesPlayed: 0, totalEarned: 0, totalSpent: 0, highScores: {} };
  saveUsers(users);
}

export function trackGamePlayed(game, score) {
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

// ─── Profile ───

export function showProfile() {
  const user = getCurrentUser();
  if (!user) return;
  const users = getUsers();
  const data = users[user];
  const stats = data.stats || { gamesPlayed: 0, totalEarned: 0, totalSpent: 0, highScores: {} };
  const totalXp = stats.totalEarned;
  const lvl = getLevel(totalXp);
  const prog = getLevelProgress(totalXp);
  const hs = stats.highScores;
  const gameNames = { snake: 'Змейка', tictactoe: 'Крестики-Нолики', memory: 'Мемори', tetris: 'Тетрис', checkers: 'Шашки', doom: 'Doom', chess: 'Шахматы', sudoku: 'Судоку', '2048': '2048', flappy: 'Flappy Bird' };
  const hsList = Object.keys(gameNames).filter(k => hs[k] !== undefined).map(k => `<span>${gameNames[k]}: <strong>${hs[k]}</strong></span>`).join('');
  const balance = data.wallet || 0;
  DOM.profileContent.innerHTML = `
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
  DOM.profileOverlay.classList.remove('hidden');
}

export function closeProfile() {
  DOM.profileOverlay.classList.add('hidden');
}

// ─── Init Auth Session ───

export function initAuthSession() {
  const user = getCurrentUser();
  if (user) {
    const users = getUsers();
    if (users[user]) {
      DOM.userName.textContent = user;
      DOM.userBar.classList.remove('hidden');
      DOM.authOverlay.classList.add('hidden');
      loadWallet();
      setTimeout(checkDailyReward, 500);
      return;
    }
  }
  DOM.authOverlay.classList.remove('hidden');
  loadWallet();
}
