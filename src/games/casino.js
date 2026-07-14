import { DOM } from '../dom.js';
import { state } from '../state.js';
import { SFX } from '../sound.js';
import { makeDiv, shuffleArray } from '../utils.js';
import { showToast } from '../ui.js';
import { addCoins, spendCoins, updateWallet } from '../wallet.js';

export function initCasino() {
  let activeGame = null, betAmount = 10;

  const wrap = document.createElement('div');
  wrap.className = 'casino-wrap';

  const top = document.createElement('div');
  top.className = 'casino-top';
  top.innerHTML = `
    <div class="casino-balance"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#ffd700" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v2m0 6v2m-3-5h6"/></svg> <span id="casino-bal">${state.wallet}</span></div>
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

  DOM.gameContainer.appendChild(wrap);

  function updateBal() {
    document.getElementById('casino-bal').textContent = state.wallet;
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

  // ─── Blackjack (fixed suits) ───

  const SUITS = ['♠','♥','♦','♣'];
  let bjDeck = [], bjPlayer = [], bjDealer = [], bjBet = 0, bjDone = false;

  function makeCard(val, suit) {
    return { val, suit, toString: `${val}${suit}` };
  }

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

  const DECK_VALS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];

  function bjVal(hand) {
    let total = 0, aces = 0;
    for (const c of hand) {
      if (c.val === 'A') { aces++; total += 11; }
      else if (['K','Q','J'].includes(c.val)) total += 10;
      else total += +c.val;
    }
    while (total > 21 && aces > 0) { total -= 10; aces--; }
    return total;
  }

  function bjCardHTML(c) {
    const red = c.suit === '♥' || c.suit === '♦';
    return `<span class="bj-card ${red ? 'red' : ''}">${c.val}${c.suit}</span>`;
  }

  function bjDraw() { return bjDeck.pop(); }

  function dealBlackjack() {
    if (!spendCoins(betAmount)) { showToast('Недостаточно 🪙!', 2000); return; }
    updateBal();
    bjBet = betAmount;
    bjDeck = [];
    for (const v of DECK_VALS)
      for (const s of SUITS)
        bjDeck.push(makeCard(v, s));
    shuffleArray(bjDeck);
    bjPlayer = [bjDraw(), bjDraw()];
    bjDealer = [bjDraw(), bjDraw()];
    bjDone = false;
    renderBJ();
    document.getElementById('bj-hit').disabled = false;
    document.getElementById('bj-stand').disabled = false;
    document.getElementById('bj-double').disabled = state.wallet >= bjBet;
    document.getElementById('bj-deal').disabled = true;
    if (bjVal(bjPlayer) === 21) bjStand();
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
      state.wallet += bjBet;
      addCoins(0, '');
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
    DOM.gameScore.textContent = '';
    switch (btn.dataset.game) {
      case 'slots': initSlots(); break;
      case 'dice': initDice(); break;
      case 'coinflip': initCoinflip(); break;
      case 'blackjack': initBlackjack(); break;
    }
  });

  gamesRow.querySelector('.casino-game-btn').classList.add('active');
  initSlots();
  state.currentCleanup = () => {};
}
