import { DOM } from '../dom.js';
import { state } from '../state.js';
import { SFX } from '../sound.js';
import { makeDiv, loadHS } from '../utils.js';
import { showOverlay } from '../ui.js';
import { addCoins } from '../wallet.js';
import { trackGamePlayed } from '../auth.js';

export function initMemory() {
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

  DOM.gameContainer.appendChild(wrap);

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
            DOM.gameScore.textContent = `✅ ${moves} ходов`;
            saveBest(); SFX.win();
            const coins = Math.max(1, Math.floor(10 - moves / 6));
            addCoins(coins, 'Мемори');
            trackGamePlayed('memory', Math.max(0, 100 - moves * 2));
            setTimeout(() => {
              showOverlay('🎉 Победа!', `Ты справился за ${moves} ходов и ${timer} секунд!`, 'Ещё раз')
                .then(() => { DOM.gameContainer.innerHTML = ''; initMemory(); });
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

  state.currentCleanup = () => {
    clearInterval(timerInterval);
  };
}
