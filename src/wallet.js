import { state } from './state.js';
import { DOM } from './dom.js';
import { SFX } from './sound.js';
import { getCurrentUser, getUsers, saveUsers } from './auth.js';
import { showToast } from './ui.js';

export function updateWallet() {
  DOM.walletEl.textContent = state.wallet;
  const inGame = !DOM.gameZone.classList.contains('hidden');
  if (state.wallet > 0 || inGame) DOM.walletDisplay.classList.remove('hidden');
  else DOM.walletDisplay.classList.add('hidden');
}

export function loadWallet() {
  const user = getCurrentUser();
  if (!user) { state.wallet = 0; updateWallet(); return; }
  const users = getUsers();
  if (users[user]) {
    state.wallet = users[user].wallet || 0;
    if (!users[user].stats) users[user].stats = { gamesPlayed: 0, totalEarned: 0, totalSpent: 0, highScores: {} };
  }
  updateWallet();
}

export function saveWallet() {
  const user = getCurrentUser();
  if (!user) return;
  const users = getUsers();
  if (!users[user]) return;
  users[user].wallet = state.wallet;
  saveUsers(users);
}

export function addCoins(amount, reason) {
  state.wallet += amount;
  saveWallet();
  updateWallet();
  if (amount > 0) {
    const user = getCurrentUser();
    const users = getUsers();
    if (user && users[user]) {
      if (!users[user].stats) users[user].stats = { gamesPlayed: 0, totalEarned: 0, totalSpent: 0, highScores: {} };
      users[user].stats.totalEarned += amount;
      saveUsers(users);
    }
    showToast(`+${amount} 🪙 ${reason}`, 2000);
    SFX.coin();
  }
}

export function spendCoins(amount) {
  if (state.wallet < amount) return false;
  state.wallet -= amount;
  saveWallet();
  updateWallet();
  const user = getCurrentUser();
  const users = getUsers();
  if (user && users[user]) {
    if (!users[user].stats) users[user].stats = { gamesPlayed: 0, totalEarned: 0, totalSpent: 0, highScores: {} };
    users[user].stats.totalSpent += amount;
    saveUsers(users);
  }
  return true;
}
