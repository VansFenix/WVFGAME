import { startParticles } from './particles.js';
import { startGame, backToMenu, showHelp, closeHelp, showToast } from './ui.js';
import { showProfile, closeProfile, logout, initAuthSession, login, register } from './auth.js';
import { updateWallet } from './wallet.js';
import { toggleMute, isMuted } from './sound.js';
import { DOM } from './dom.js';

// ─── Expose to window for inline onclick handlers ───
window.startGame = startGame;
window.backToMenu = backToMenu;
window.showHelp = showHelp;
window.closeHelp = closeHelp;
window.showProfile = showProfile;
window.closeProfile = closeProfile;
window.toggleMute = () => {
  const muted = toggleMute();
  DOM.muteIcon.innerHTML = muted
    ? '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>'
    : '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/>';
  DOM.muteBtn.title = muted ? 'Звук выкл' : 'Звук вкл';
};

// ─── Init mute icon ───
if (isMuted()) window.toggleMute();

// ─── Start background particles ───
startParticles();

// ─── Card tilt effect ───
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

// ─── Auth session ───
initAuthSession();

// ─── Auth event listeners ───
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

document.getElementById('login-btn').addEventListener('click', async () => {
  const u = document.getElementById('login-username').value.trim();
  const p = document.getElementById('login-password').value;
  const err = await login(u, p);
  if (err) document.getElementById('login-error').textContent = err;
});

document.getElementById('register-btn').addEventListener('click', async () => {
  const u = document.getElementById('register-username').value.trim();
  const p = document.getElementById('register-password').value;
  const c = document.getElementById('register-confirm').value;
  if (p !== c) { document.getElementById('register-error').textContent = 'Пароли не совпадают'; return; }
  const err = await register(u, p);
  if (err) document.getElementById('register-error').textContent = err;
});

document.getElementById('logout-btn').addEventListener('click', logout);

document.querySelectorAll('.auth-input').forEach(inp => {
  inp.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const form = inp.closest('.auth-form');
      if (form.id === 'auth-login') document.getElementById('login-btn').click();
      else if (form.id === 'auth-register') document.getElementById('register-btn').click();
    }
  });
});

// ─── PWA ───
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
