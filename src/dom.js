export const DOM = {
  particles: document.getElementById('particles'),
  mainMenu: document.getElementById('main-menu'),
  gameZone: document.getElementById('game-zone'),
  gameTitle: document.getElementById('game-title'),
  gameContainer: document.getElementById('game-container'),
  gameScore: document.getElementById('game-score'),
  overlay: document.getElementById('overlay'),
  overlayTitle: document.getElementById('overlay-title'),
  overlayText: document.getElementById('overlay-text'),
  overlayBtn: document.getElementById('overlay-btn'),
  toast: document.getElementById('toast'),
  helpOverlay: document.getElementById('help-overlay'),
  helpContent: document.getElementById('help-content'),
  profileOverlay: document.getElementById('profile-overlay'),
  profileContent: document.getElementById('profile-content'),
  walletEl: document.getElementById('wallet-amount'),
  walletDisplay: document.getElementById('wallet-display'),
  authOverlay: document.getElementById('auth-overlay'),
  userBar: document.getElementById('user-bar'),
  userName: document.getElementById('user-name'),
};

export let currentCleanup = null;
export function setCleanup(fn) { currentCleanup = fn; }
