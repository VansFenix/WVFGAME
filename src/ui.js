import { state } from './state.js';
import { DOM } from './dom.js';
import { SFX } from './sound.js';
import { loadHS } from './utils.js';
import { saveWallet, updateWallet } from './wallet.js';
import { closeProfile, getCurrentUser, getUsers, getLevel, getLevelProgress } from './auth.js';

import { initSnake } from './games/snake.js';
import { initTicTacToe } from './games/tictactoe.js';
import { initMemory } from './games/memory.js';
import { initTetris } from './games/tetris.js';
import { initCheckers } from './games/checkers.js';
import { initDoom } from './games/doom.js';
import { initChess } from './games/chess.js';
import { initSudoku } from './games/sudoku.js';
import { initCasino } from './games/casino.js';

// ─── Toast ───

export function showToast(msg, duration = 2000) {
  DOM.toast.textContent = msg;
  DOM.toast.classList.add('show');
  setTimeout(() => DOM.toast.classList.remove('show'), duration);
}

// ─── Overlay ───

export function showOverlay(title, text, btnText = 'ОК') {
  DOM.overlayTitle.textContent = title;
  DOM.overlayText.textContent = text;
  DOM.overlayBtn.textContent = btnText;
  DOM.overlay.classList.remove('hidden');
  DOM.overlayBtn.focus();
  return new Promise(resolve => {
    const handler = e => {
      e.stopPropagation();
      DOM.overlay.classList.add('hidden');
      DOM.overlayBtn.removeEventListener('click', handler);
      resolve();
    };
    DOM.overlayBtn.addEventListener('click', handler);
  });
}

// ─── Help ───

export function closeHelp() { DOM.helpOverlay.classList.add('hidden'); }

export function showHelp() {
  const game = DOM.gameTitle.textContent.toLowerCase();
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
    DOM.helpContent.innerHTML = `<h3>🎮 WVF Game</h3><ul>
      <li>Добро пожаловать на игровой портал <strong>WVFGAME</strong>!</li>
      <li>8 игр + казино с валютой 🪙</li>
      <li>Зарабатывай 🪙 в играх, трать в казино</li>
      <li>Авторизация сохраняет прогресс</li>
      <li>Ежедневная награда: <kbd>+5 🪙</kbd></li>
      <li>Для каждой игры есть свои правила — нажми <kbd>?</kbd> во время игры</li>
    </ul>`;
    DOM.helpOverlay.classList.remove('hidden');
    return;
  }
  const [title, items] = rules[key];
  DOM.helpContent.innerHTML = `<h3>${title}</h3><ul>${items.map(i => `<li>${i}</li>`).join('')}</ul>`;
  DOM.helpOverlay.classList.remove('hidden');
}

// ─── Navigation ───

export function startGame(type) {
  closeProfile();
  DOM.mainMenu.style.display = 'none';
  DOM.gameZone.classList.remove('hidden');
  DOM.gameContainer.innerHTML = '';
  DOM.gameScore.textContent = '';
  if (state.currentCleanup) { state.currentCleanup(); state.currentCleanup = null; }
  DOM.walletDisplay.classList.remove('hidden');
  switch (type) {
    case 'snake': DOM.gameTitle.textContent = '🐍 Змейка'; initSnake(); break;
    case 'tictactoe': DOM.gameTitle.textContent = '❌ Крестики-Нолики'; initTicTacToe(); break;
    case 'memory': DOM.gameTitle.textContent = '🧠 Мемори'; initMemory(); break;
    case 'tetris': DOM.gameTitle.textContent = '🧊 Тетрис'; initTetris(); break;
    case 'checkers': DOM.gameTitle.textContent = '🟦 Шашки'; initCheckers(); break;
    case 'doom': DOM.gameTitle.textContent = '🔥 DOOM'; initDoom(); break;
    case 'chess': DOM.gameTitle.textContent = '♚ Шахматы'; initChess(); break;
    case 'sudoku': DOM.gameTitle.textContent = '🔢 Судоку'; initSudoku(); break;
    case 'casino': DOM.gameTitle.textContent = '🎰 Казино'; initCasino(); break;
  }
}

export function backToMenu() {
  if (state.currentCleanup) { state.currentCleanup(); state.currentCleanup = null; }
  saveWallet();
  DOM.gameZone.classList.add('hidden');
  DOM.mainMenu.style.display = '';
  if (state.wallet === 0) DOM.walletDisplay.classList.add('hidden');
}
