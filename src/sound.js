let audioCtx = null;
let _muted = localStorage.getItem('wvf_muted') === '1';

function ensureAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

function playTone(freq, duration, type = 'square', volume = 0.08) {
  if (_muted) return;
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

export function isMuted() { return _muted; }

export function toggleMute() {
  _muted = !_muted;
  localStorage.setItem('wvf_muted', _muted ? '1' : '0');
  return _muted;
}

export const SFX = {
  click: () => playTone(800, 0.06, 'square', 0.04),
  win: () => { playTone(523, 0.12, 'square', 0.06); setTimeout(() => playTone(659, 0.12, 'square', 0.06), 130); setTimeout(() => playTone(784, 0.2, 'square', 0.06), 260); },
  lose: () => { playTone(300, 0.15, 'sawtooth', 0.05); setTimeout(() => playTone(200, 0.25, 'sawtooth', 0.05), 160); },
  coin: () => { playTone(1200, 0.05, 'sine', 0.05); setTimeout(() => playTone(1600, 0.08, 'sine', 0.05), 60); },
  move: () => playTone(600, 0.04, 'square', 0.03),
  flip: () => playTone(400, 0.05, 'triangle', 0.04),
  boost: () => { playTone(500, 0.08, 'sine', 0.05); setTimeout(() => playTone(700, 0.08, 'sine', 0.05), 80); },
  alarm: () => { for (let i = 0; i < 3; i++) setTimeout(() => playTone(440, 0.08, 'square', 0.04), i * 120); }
};

function unlockAudio() {
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  document.removeEventListener('click', unlockAudio);
  document.removeEventListener('touchstart', unlockAudio);
}
document.addEventListener('click', unlockAudio);
document.addEventListener('touchstart', unlockAudio);
