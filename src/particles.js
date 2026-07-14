import { DOM } from './dom.js';

const ctx = DOM.particles.getContext('2d');
let particles = [];
let pW, pH;

function resize() {
  pW = DOM.particles.width = window.innerWidth;
  pH = DOM.particles.height = Math.max(window.innerHeight, document.documentElement.scrollHeight);
}
window.addEventListener('resize', resize);
resize();

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
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.s, 0, Math.PI * 2);
    ctx.fillStyle = this.cs + this.o + ')';
    ctx.fill();
  }
}

for (let i = 0; i < 100; i++) particles.push(new Dot());

export function startParticles() {
  function anim() {
    ctx.clearRect(0, 0, pW, pH);
    for (const p of particles) { p.update(); p.draw(); }
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 140) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(255,255,255,${0.025 * (1 - d / 140)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(anim);
  }
  anim();
}
