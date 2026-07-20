export function loadHS(game) {
  const keys = { snake: 'wvf_snake_hs', memory: 'wvf_memory_hs', '2048': 'wvf_2048_hs', flappy: 'wvf_flappy_hs' };
  return localStorage.getItem(keys[game]) || '0';
}

export function createCanvas(w, h, cls) {
  const c = document.createElement('canvas');
  if (cls) c.className = cls;
  c.width = w; c.height = h;
  return c;
}

export function addTouchClick(canvas) {
  canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    const t = e.changedTouches[0];
    if (t) canvas.dispatchEvent(new MouseEvent('click', { clientX: t.clientX, clientY: t.clientY }));
  }, { passive: false });
}

export function makeButton(text, cls, onClick) {
  const b = document.createElement('button');
  b.textContent = text;
  if (cls) b.className = cls;
  if (onClick) b.addEventListener('click', onClick);
  return b;
}

export function makeDiv(cls) {
  const d = document.createElement('div');
  if (cls) d.className = cls;
  return d;
}

export function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
