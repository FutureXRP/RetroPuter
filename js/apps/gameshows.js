/* Game shows: "Spin & Solve" (word-puzzle wheel game) and "Answer Me This!" (quiz-board game).
   Two original TV-game-show spin-offs sold in the Software Store (1990). */
(function () {
  'use strict';

  /* ================= shared helpers ================= */
  const rnd = (a, b) => a + Math.random() * (b - a);
  const shuffle = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const money = v => (v < 0 ? '-$' : '$') + Math.abs(Math.round(v)).toLocaleString('en-US');
  const escH = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function lev(a, b) {
    if (a === b) return 0;
    const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
    let prev = Array.from({ length: n + 1 }, (_, i) => i), cur = new Array(n + 1);
    for (let i = 1; i <= m; i++) {
      cur[0] = i;
      for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      [prev, cur] = [cur, prev];
    }
    return prev[n];
  }

  /* Sound kit built on api.tone / api.noise. Every call checks the app's sound switch. */
  function soundKit(api, isOn) {
    const T = (f, d, o) => { if (isOn()) api.tone(f, d, o); };
    const N = (d, o) => { if (isOn()) api.noise(d, o); };
    const M = n => 440 * Math.pow(2, (n - 69) / 12);
    return {
      tick() { N(0.012, { ft: 'highpass', f: 3200, vol: 0.09, decay: 1 }); T(2200, 0.012, { type: 'square', vol: 0.02, decay: 1 }); },
      applause(dur = 1.8, big = 1) {
        const n = Math.round(70 * dur * big);
        for (let i = 0; i < n; i++) N(0.03, { at: Math.random() * dur, ft: 'bandpass', f: rnd(1200, 4200), q: 1.4, vol: rnd(0.03, 0.08), decay: 1 });
        N(dur + 0.4, { ft: 'bandpass', f: 2400, q: 0.6, vol: 0.035 * big, attack: 0.15, release: 0.7 });
      },
      buzzer() { T(98, 0.7, { type: 'sawtooth', vol: 0.07 }); T(104, 0.7, { type: 'square', vol: 0.04 }); },
      ding(i = 0) { T(M(84 + (i % 3) * 2), 0.5, { type: 'triangle', vol: 0.1, decay: 1 }); T(M(96), 0.25, { type: 'sine', vol: 0.03, decay: 1 }); },
      bust() { T(420, 0.9, { to: 60, type: 'sawtooth', vol: 0.07 }); N(0.5, { at: 0.3, ft: 'lowpass', f: 400, vol: 0.12, decay: 1 }); },
      flop() { [0, 0.18].forEach((at, i) => T(i ? 196 : 262, 0.22, { at, type: 'square', vol: 0.05 })); },
      fanfare() { [60, 64, 67, 72, 67, 72].forEach((n, i) => T(M(n + 7), i === 5 ? 0.7 : 0.14, { at: i * 0.13, type: 'square', vol: 0.05, decay: i === 5 ? 1 : 0 })); [48, 55].forEach(n => T(M(n + 7), 1.3, { at: 0.65, type: 'triangle', vol: 0.06, decay: 1 })); },
      sting() { [72, 76, 79, 84, 88].forEach((n, i) => T(M(n), 0.25, { at: i * 0.06, type: 'triangle', vol: 0.07, decay: 1 })); },
      whoosh() { N(0.6, { ft: 'bandpass', f: 900, q: 0.8, vol: 0.1, attack: 0.3, release: 0.3 }); T(200, 0.6, { to: 1400, type: 'sine', vol: 0.03 }); },
      buzzIn() { T(M(81), 0.16, { type: 'square', vol: 0.06 }); T(M(88), 0.2, { at: 0.08, type: 'square', vol: 0.05, decay: 1 }); },
      timeUp() { [0, 0.22, 0.44].forEach(at => T(M(55), 0.16, { at, type: 'square', vol: 0.06 })); },
      tock() { T(M(76), 0.04, { type: 'square', vol: 0.03, decay: 1 }); },
      pick() { T(M(79), 0.06, { type: 'square', vol: 0.04, decay: 1 }); },
      jingle() { [67, 72, 76, 79, 76, 79, 84].forEach((n, i) => T(M(n), 0.16, { at: i * 0.11, type: 'triangle', vol: 0.07, decay: 1 })); T(M(48), 0.9, { at: 0.66, type: 'triangle', vol: 0.06, decay: 1 }); },
      M
    };
  }

  /* Common stage styling: marquee lights. Each app prefixes with its own class. */
  const lights = (cls, n) => `<div class="${cls}">${Array.from({ length: n }, (_, i) => `<i style="animation-delay:${(i % 4) * -0.25}s"></i>`).join('')}</div>`;
  /* ================= SPIN & SOLVE: puzzles ================= */
  const SS_PUZZLES = {
    'Phrase': [
      'A PIECE OF CAKE', 'BETTER LATE THAN NEVER', 'EASY AS PIE', 'BREAK THE ICE', 'ONCE IN A BLUE MOON',
      'THE EARLY BIRD CATCHES THE WORM', 'HIT THE NAIL ON THE HEAD', 'SLOW AND STEADY WINS THE RACE',
      'ACTIONS SPEAK LOUDER THAN WORDS', 'WHEN PIGS FLY', 'BURNING THE MIDNIGHT OIL', 'TWO HEADS ARE BETTER THAN ONE',
      'A PENNY SAVED IS A PENNY EARNED', "DON'T COUNT YOUR CHICKENS", 'EVERY CLOUD HAS A SILVER LINING',
      'PRACTICE MAKES PERFECT', 'NO NEWS IS GOOD NEWS', 'THE MORE THE MERRIER', 'UNDER THE WEATHER',
      'BACK TO SQUARE ONE', 'LET THE CAT OUT OF THE BAG', 'MAKE A LONG STORY SHORT', 'ON CLOUD NINE',
      'COSTS AN ARM AND A LEG', 'SPILL THE BEANS', 'THE BALL IS IN YOUR COURT'
    ],
    'Thing': [
      'A BALL OF YARN', 'A PAIR OF SCISSORS', 'ROLLER SKATES', 'GRANDFATHER CLOCK', 'HOT AIR BALLOON',
      'PAPER AIRPLANE', 'WEATHER VANE', 'A MESSAGE IN A BOTTLE', 'TREASURE CHEST', 'JIGSAW PUZZLE',
      'RUBBER BAND', 'ELECTRIC GUITAR', 'CUCKOO CLOCK', 'PIGGY BANK', 'BIRTHDAY CANDLES', 'MAGNIFYING GLASS'
    ],
    'Place': [
      'THE GRAND CANYON', 'NIAGARA FALLS', 'THE NORTH POLE', 'AN AMUSEMENT PARK', 'THE PUBLIC LIBRARY',
      'A LIGHTHOUSE ON THE COAST', 'THE ROCKY MOUNTAINS', 'BOWLING ALLEY', 'TRAIN STATION', 'COUNTY FAIR',
      'THE SAHARA DESERT', 'THE MISSISSIPPI RIVER', 'ROLLER RINK', 'CITY HALL', 'THE TOWN SQUARE'
    ],
    'Food & Drink': [
      'PEANUT BUTTER AND JELLY', 'CHOCOLATE CHIP COOKIES', 'HOT FUDGE SUNDAE', 'SCRAMBLED EGGS AND TOAST',
      'PINK LEMONADE', 'SPAGHETTI AND MEATBALLS', 'BLUEBERRY PANCAKES', 'CHICKEN NOODLE SOUP', 'APPLE PIE A LA MODE',
      'GRILLED CHEESE SANDWICH', 'BUTTERED POPCORN', 'ICED TEA WITH LEMON', 'STRAWBERRY SHORTCAKE', 'CORN ON THE COB',
      'FRENCH TOAST'
    ],
    'Before & After': [
      'APPLE PIE CHART', 'BIRTHDAY CAKE WALK', 'HOT DOG HOUSE', 'FIRE TRUCK STOP', 'BASKETBALL COURT JESTER',
      'ROCKING CHAIR LIFT', 'PAPER CLIP ART', 'SPACE SHUTTLE BUS', 'SCHOOL BUS STOP', 'POP QUIZ SHOW',
      'FRENCH HORN OF PLENTY', 'PIGGY BANK ACCOUNT', 'FLOWER POT ROAST', 'ICE CREAM CHEESE', 'FAMILY TREE HOUSE',
      'LIBRARY CARD TRICK', 'GREEN THUMB WAR'
    ],
    'Around the House': [
      'LAUNDRY BASKET', 'THE KITCHEN SINK', 'WELCOME MAT', 'CEILING FAN', 'TOASTER OVEN', 'VACUUM CLEANER',
      'SPICE RACK', 'BACK PORCH SWING', 'COAT CLOSET', 'BUNK BEDS', 'THROW PILLOWS', 'MEDICINE CABINET',
      'SMOKE DETECTOR', 'GARDEN HOSE', 'EASY CHAIR'
    ]
  };

  const SS_COLS = 12, SS_ROWS = 4;
  const SS_VOWELS = 'AEIOU';
  const SS_AI = [
    { name: 'Dottie', bio: 'Retired school librarian from Dayton. Never met a vowel she didn\'t like.', skill: 0.75, solveAt: 0.62, vowelLove: 0.55, greed: 0.1, power: 0.9,
      lines: { spin: ['Here goes nothing!', 'Be kind to me, wheel.', 'Gently now...'], bust: ['Oh, fiddlesticks!', 'Well, bless my socks.'], good: ['Wonderful!', 'I had a feeling!'], bad: ['Drat.', 'Oh dear, not that one.'], solve: ['I believe I have it, dear!', 'I\'d like to solve, please.'] } },
    { name: 'Hank', bio: 'Long-haul trucker. Spins hard and likes to press his luck.', skill: 0.55, solveAt: 0.72, vowelLove: 0.15, greed: 0.55, power: 1.2,
      lines: { spin: ['Come on, big money!', 'Hold onto your hats!', 'Daddy needs a new truck!'], bust: ['Aw, shucks!', 'You gotta be kidding me.'], good: ['Now we\'re rolling!', 'Yee-haw!'], bad: ['Dang it.', 'Figures.'], solve: ['I\'ll take a crack at it!', 'Let me solve this thing.'] } },
    { name: 'Priya', bio: 'Graduate student and crossword whiz. Solves early and often.', skill: 0.95, solveAt: 0.55, vowelLove: 0.3, greed: 0.2, power: 1.0,
      lines: { spin: ['Statistically, this should work.', 'Okay, let\'s go.'], bust: ['That was not in my model.', 'Ugh, seriously?'], good: ['As predicted.', 'Nice!'], bad: ['Hmm. Unexpected.', 'Okay, noted.'], solve: ['I\'m ready to solve.', 'I think I see it!'] } },
    { name: 'Gus', bio: 'Short-order cook who has watched every episode twice.', skill: 0.7, solveAt: 0.66, vowelLove: 0.35, greed: 0.35, power: 1.1,
      lines: { spin: ['Order up!', 'Let\'s cook!', 'Spin it to win it!'], bust: ['Burnt the toast!', 'Well, that\'s a flop.'], good: ['Sizzlin\'!', 'Hot off the grill!'], bad: ['Eh, cold plate.', 'Nuts.'], solve: ['I got this one, folks!', 'Solve, please!'] } },
    { name: 'Roxanne', bio: 'Owns a hair salon and has a lucky rabbit\'s foot.', skill: 0.65, solveAt: 0.64, vowelLove: 0.45, greed: 0.3, power: 1.0,
      lines: { spin: ['Lucky rabbit, don\'t fail me now!', 'Big money, honey!'], bust: ['Oh, my stars!', 'That wheel has it in for me.'], good: ['Fabulous!', 'Oh, I love it!'], bad: ['Shoot.', 'Well, phooey.'], solve: ['Honey, I know this one!', 'Let me solve it!'] } }
  ];
  const SS_BASE = ['BANKRUPT', 600, 400, 300, 800, 350, 500, 450, 700, 300, 'TOP', 350, 550, 'LOSE', 500, 300, 900, 400, 650, 350, 500, 800, 300, 450];
  const SS_PAL = ['#d02828', '#e8b000', '#1c9c9c', '#b83cb8', '#2ca02c', '#e86a00', '#2d5fd8', '#d84c8c'];
  const SS_TOP = [2000, 2500, 3000];
  const ssWheel = r => SS_BASE.map((v, i) => r === 2 && i === 12 ? 'BANKRUPT' : v === 'TOP' ? SS_TOP[r] : typeof v === 'number' ? v + r * 100 : v);
  const ssLetters = s => s.replace(/[^A-Z]/g, '');
  function ssLayout(text) {
    const rows = []; let line = '';
    text.split(' ').forEach(w => { if (!line) line = w; else if ((line + ' ' + w).length <= SS_COLS) line += ' ' + w; else { rows.push(line); line = w; } });
    if (line) rows.push(line);
    return rows;
  }

  const SS_CSS = `
    .ss{position:absolute;inset:0;display:flex;flex-direction:column;background:#140028;background-image:radial-gradient(ellipse at 50% 0,#4a1a7a 0,#140028 70%);color:#fff;font:12px var(--ui);overflow:hidden;user-select:none;-webkit-user-select:none}
    .ss .btn{color:#000}.ss .btn:disabled{color:#808080;text-shadow:1px 1px #fff}
    .ss-lt{display:flex;justify-content:space-between;padding:3px 6px;flex:none;background:#2a0a3a;border-bottom:2px solid #000}
    .ss-lt i{width:6px;height:6px;border-radius:50%;background:#ffd23f;animation:ss-blink 1s steps(1) infinite}
    .ss.party .ss-lt i{animation-duration:.3s}
    @keyframes ss-blink{0%{opacity:1;box-shadow:0 0 5px #ffd23f}50%{opacity:.25;box-shadow:none}}
    .ss-top{flex:none;padding:4px 6px 0}
    .ss-board{container-type:inline-size;margin:0 auto;width:min(100%,470px);display:grid;grid-template-columns:repeat(12,1fr);gap:2px;padding:5px;background:#082a18;border:3px solid;border-color:#ffe27a #a0781e #a0781e #ffe27a;box-shadow:0 0 12px rgba(255,210,63,.35)}
    .ss-t{aspect-ratio:4/5;background:#0f5e3a;background-image:linear-gradient(135deg,#137a4a 0,#0f5e3a 60%);border:1px solid #062a18;display:flex;align-items:center;justify-content:center;perspective:200px}
    .ss-t.on{background:#f4f4f4;border-color:#888 #444 #444 #888}
    .ss-t.on.show{background:#fff}
    .ss-t span{font:bold 5.6cqw/1 Arial,Helvetica,sans-serif;color:transparent}
    .ss-t.show span{color:#000}
    .ss-t.lit{background:#7ff;box-shadow:0 0 8px #7ff,inset 0 0 6px #fff}
    .ss-t.flip{animation:ss-flip .44s ease-in-out}
    @keyframes ss-flip{0%{transform:rotateY(0)}50%{transform:rotateY(90deg)}100%{transform:rotateY(0)}}
    .ss-cat{margin:3px auto 0;width:min(100%,470px);text-align:center;background:#000;color:#ffd23f;font:18px/1.1 var(--dos);letter-spacing:2px;padding:2px 0;border:1px solid #6a4a8a}
    .ss-mid{flex:1;min-height:0;display:flex;gap:6px;padding:4px 6px}
    .ss-wb{flex:1 1 48%;min-width:0;min-height:0;position:relative;display:flex;align-items:center;justify-content:center}
    .ss-wb canvas{touch-action:none;cursor:grab;display:block}
    .ss-side{flex:1 1 52%;min-width:0;display:flex;flex-direction:column;gap:4px;min-height:0}
    .ss-pods{display:flex;gap:4px}
    .ss-pod{flex:1;min-width:0;text-align:center;background:linear-gradient(#6a3a2a,#2a1410);border:2px solid #9a6a4a;padding:2px 2px 3px;transition:box-shadow .2s}
    .ss-pod.cur{border-color:#ffe23f;box-shadow:0 0 10px #ffe23f}
    .ss-pod b{display:block;font:bold 11px var(--ui);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#ffe9c0}
    .ss-pod .ss-led{display:block;background:#000;color:#ff3b30;font:22px/1 var(--dos);padding:1px 0;margin:2px 0;border:1px inset #555;text-shadow:0 0 4px #f00}
    .ss-pod small{font-size:10px;color:#ddd}
    .ss-msg{background:#000;color:#8f8;font:17px/1.05 var(--dos);min-height:3.3em;padding:3px 6px;flex:1 1 auto;overflow:hidden}
    .ss-acts{display:flex;gap:4px;flex:none}
    .ss-acts .btn,.ss-sv .btn{min-width:0;flex:1;padding:5px 2px;font-weight:bold}
    .ss-sv{display:none;gap:4px;flex:none;align-items:center}
    .ss-sv input{flex:1;min-width:0;font:16px var(--dos);padding:3px 4px;text-transform:uppercase}
    .ss.solving .ss-acts{display:none}.ss.solving .ss-sv{display:flex}
    .ss-keys{flex:none;display:grid;grid-template-columns:repeat(13,1fr);gap:2px;padding:2px 6px 6px}
    .ss-keys .btn{min-width:0;padding:4px 0;font:bold 13px var(--ui)}
    .ss .ss-keys .btn.v{color:#00008a}
    .ss .ss-keys .btn:disabled{color:#707070;text-shadow:1px 1px #fff}
    .ss .ss-keys .btn.used{background:#606060;color:#999;text-shadow:none}
    .ss-keys .btn.hit{background:#c8e8c8}
    .ss.nar .ss-keys{grid-template-columns:repeat(9,1fr)}
    .ss.nar .ss-pods{flex-direction:column;gap:2px}
    .ss.nar .ss-pod{display:flex;align-items:center;gap:4px;padding:1px 4px;text-align:left}
    .ss.nar .ss-pod b{flex:1}
    .ss.nar .ss-pod .ss-led{font-size:18px;width:62px;text-align:center;margin:0}
    .ss.nar .ss-pod small{width:58px;text-align:right}
    .ss.nar .ss-msg{font-size:15px;min-height:2.2em}
    .ss.nar .ss-mid{flex-direction:column}
    .ss.nar .ss-wb{flex:1 1 0}
    .ss.nar .ss-side{flex:none}
    .ss-ov{position:absolute;inset:0;background:rgba(12,0,28,.9);display:none;align-items:center;justify-content:center;z-index:5;padding:10px;overflow:auto}
    .ss-ov.open{display:flex}
    .ss-pan{background:var(--gray,#c0c0c0);color:#000;max-width:440px;width:100%;padding:12px;max-height:100%;overflow:auto}
    .ss-pan h2{margin:0 0 8px;font:bold 16px var(--ui)}
    .ss-pan p,.ss-pan li{margin:0 0 6px;line-height:1.35}
    .ss-pan ul{padding-left:18px;margin:0 0 6px}
    .ss-pan .ss-bt{display:flex;gap:6px;justify-content:center;flex-wrap:wrap;margin-top:10px}
    .ss-pan table{border-collapse:collapse;width:100%;margin:6px 0}
    .ss-pan td{padding:2px 4px;border-bottom:1px solid #999}.ss-pan td+td{text-align:right}
    .ss-logo{text-align:center;color:#ffd23f;font:clamp(34px,11vw,58px)/.9 var(--dos);text-shadow:3px 3px 0 #b0142c,6px 6px 0 #000;letter-spacing:2px;margin:6px 0 4px}
    .ss-logo em{display:block;font-style:normal;font-size:.42em;color:#7ff;text-shadow:2px 2px 0 #000;letter-spacing:4px}
    .ss-mini{width:92px;height:92px;margin:0 auto 6px;border-radius:50%;border:4px solid #ffd23f;background:conic-gradient(#d02828 0 45deg,#e8b000 0 90deg,#1c9c9c 0 135deg,#b83cb8 0 180deg,#2ca02c 0 225deg,#e86a00 0 270deg,#2d5fd8 0 315deg,#d84c8c 0);animation:ss-rot 6s linear infinite;box-shadow:0 0 16px #b83cb8}
    @keyframes ss-rot{to{transform:rotate(360deg)}}
    .ss-title{text-align:center;max-width:420px;width:100%}
    .ss-title .ss-pan{margin-top:8px}
    .ss-diff{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}
    .ss-big{font:32px/1 var(--dos);color:#ffd23f;text-align:center;text-shadow:2px 2px #000}
    .ss-bonus{flex:none;display:none;gap:6px;align-items:center;padding:0 6px}
    .ss.bon .ss-bonus{display:flex}
    .ss-clock{flex:1;height:14px;background:#000;border:1px solid #888;position:relative;overflow:hidden}
    .ss-clock div{position:absolute;inset:0;background:linear-gradient(90deg,#f33,#fd3,#3f6);transform-origin:left;transition:transform .25s linear}
    .ss-prize{font:20px var(--dos);color:#ffd23f;min-width:88px;text-align:right}
    .ss-flash{animation:ss-fl .5s 3}
    @keyframes ss-fl{50%{background:#ffd23f;color:#000}}
  `;

  function openSpin(W, api) {
    let sound = api.load('sound', true), diff = api.load('diff', 'normal');
    const snd = soundKit(api, () => sound);
    const DIFF = { easy: { skill: 0.6, solve: 0.14, speed: 1.1 }, normal: { skill: 1, solve: 0, speed: 1 }, hard: { skill: 1.35, solve: -0.1, speed: 0.85 } };
    let alive = true, gen = 0, raf = 0;
    const timers = new Set();
    const later = (fn, ms) => { const g = gen; const t = setTimeout(() => { timers.delete(t); if (alive && g === gen) fn(); }, ms); timers.add(t); return t; };
    const clearTimers = () => { timers.forEach(clearTimeout); timers.clear(); };

    W.body.innerHTML = `<div class="ss">
      ${lights('ss-lt', 30)}
      <div class="ss-top"><div class="ss-board"></div><div class="ss-cat">SPIN &amp; SOLVE</div></div>
      <div class="ss-bonus"><div class="ss-clock"><div></div></div><div class="ss-prize"></div></div>
      <div class="ss-mid">
        <div class="ss-wb"><canvas aria-label="Prize wheel"></canvas></div>
        <div class="ss-side">
          <div class="ss-pods"></div>
          <div class="ss-msg sunken" role="status"></div>
          <div class="ss-acts"><button class="btn" data-a="spin">Spin</button><button class="btn" data-a="buy">Buy Vowel</button><button class="btn" data-a="solve">Solve</button></div>
          <div class="ss-sv"><input type="text" maxlength="60" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="Type the answer"><button class="btn" data-a="go">OK</button><button class="btn" data-a="cancel">Cancel</button></div>
        </div>
      </div>
      <div class="ss-keys"></div>
      <div class="ss-ov"></div>
    </div>`;
    const $ = s => W.body.querySelector(s);
    const root = $('.ss'), boardEl = $('.ss-board'), catEl = $('.ss-cat'), podsEl = $('.ss-pods'), msgEl = $('.ss-msg'), keysEl = $('.ss-keys'), ov = $('.ss-ov');
    const cvs = $('canvas'), ctx = cvs.getContext('2d'), wb = $('.ss-wb'), input = $('.ss-sv input');
    const clockBar = $('.ss-clock div'), prizeEl = $('.ss-prize');

    /* ---------- letter keys ---------- */
    const keyBtn = {};
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(L => {
      const b = document.createElement('button'); b.className = 'btn' + (SS_VOWELS.includes(L) ? ' v' : ''); b.textContent = L; b.dataset.l = L;
      keysEl.appendChild(b); keyBtn[L] = b;
    });
    keysEl.addEventListener('click', e => { const b = e.target.closest('[data-l]'); if (b && !b.disabled) pickLetter(b.dataset.l); });

    /* ---------- state ---------- */
    const S = { phase: 'title', players: [], cur: 0, round: 0, puzzle: '', cat: '', tiles: [], used: new Set(), val: 0, wheel: ssWheel(0),
      ang: 0, omega: 0, spinning: false, flap: 0, dragging: false, bonus: null, busy: false, usedPuzzles: [] };
    const human = () => S.players[S.cur] && S.players[S.cur].human;
    const P = () => S.players[S.cur];
    const stats = () => Object.assign({ played: 0, firsts: 0, best: 0, bonusWins: 0, bestRound: 0, totalWon: 0 }, api.load('stats', {}));

    function say(text, who) { msgEl.innerHTML = who ? `<span style="color:#ffd23f">${escH(who)}:</span> ${escH(text)}` : escH(text); }
    const line = (p, k) => api.pick(p.pers.lines[k]);

    /* ---------- podiums ---------- */
    function renderPods() {
      podsEl.innerHTML = S.players.map((p, i) => `<div class="ss-pod${i === S.cur && S.phase !== 'title' && !S.bonus ? ' cur' : ''}"><b title="${escH(p.pers ? p.pers.bio : 'That\'s you!')}">${escH(p.name)}</b><span class="ss-led">${money(p.round)}</span><small>Bank ${money(p.total)}</small></div>`).join('');
    }

    /* ---------- puzzle board ---------- */
    function buildBoard(text) {
      boardEl.innerHTML = '';
      S.tiles = [];
      const rows = ssLayout(text), top = Math.floor((SS_ROWS - rows.length) / 2);
      const grid = Array.from({ length: SS_ROWS }, () => Array(SS_COLS).fill(' '));
      rows.forEach((r, ri) => { const off = Math.floor((SS_COLS - r.length) / 2); r.split('').forEach((ch, ci) => { grid[top + ri][off + ci] = ch; }); });
      grid.forEach(row => row.forEach(ch => {
        const d = document.createElement('div'); d.className = 'ss-t';
        const t = { ch, el: d, shown: false, letter: /[A-Z]/.test(ch) };
        if (ch !== ' ') { d.classList.add('on'); d.innerHTML = `<span>${escH(ch)}</span>`; if (!t.letter) { d.classList.add('show'); t.shown = true; } }
        boardEl.appendChild(d); S.tiles.push(t);
      }));
    }
    const hiddenTiles = () => S.tiles.filter(t => t.letter && !t.shown);
    const letterTiles = () => S.tiles.filter(t => t.letter);
    const frac = () => { const all = letterTiles().length; return all ? 1 - hiddenTiles().length / all : 1; };
    const inPuzzle = L => S.puzzle.includes(L);
    const consLeft = () => hiddenTiles().some(t => !SS_VOWELS.includes(t.ch));
    const vowelsLeft = () => hiddenTiles().some(t => SS_VOWELS.includes(t.ch));
    function flipTile(t, delay) {
      t.shown = true;
      setTimeout(() => {
        if (!alive) return;
        t.el.classList.remove('lit'); t.el.classList.add('flip');
        setTimeout(() => t.el.classList.add('show'), 220);
        setTimeout(() => t.el.classList.remove('flip'), 460);
      }, delay);
    }
    // Light up every tile holding L, one by one with a chime, then flip them over.
    function revealLetter(L, done) {
      const ts = S.tiles.filter(t => t.ch === L && !t.shown);
      ts.forEach(t => { t.shown = true; });
      ts.forEach((t, i) => later(() => { t.el.classList.add('lit'); snd.ding(i); }, i * 330));
      later(() => { ts.forEach((t, i) => { t.shown = false; flipTile(t, i * 110); }); later(done, ts.length * 110 + 480); }, ts.length * 330 + 350);
    }
    function revealAll(stagger = 45) { hiddenTiles().forEach((t, i) => flipTile(t, i * stagger)); }

    /* ---------- wheel drawing ---------- */
    const SEG = Math.PI * 2 / 24;
    let wheelImg = null, size = 0, dpr = 1;
    function buildWheelImg() {
      const R = size * dpr / 2;
      const c = document.createElement('canvas'); c.width = c.height = Math.ceil(R * 2);
      const g = c.getContext('2d'); g.translate(R, R);
      const r = R * 0.94;
      S.wheel.forEach((v, i) => {
        const a0 = -Math.PI / 2 + i * SEG, a1 = a0 + SEG;
        g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, r, a0, a1); g.closePath();
        g.fillStyle = v === 'BANKRUPT' ? '#141414' : v === 'LOSE' ? '#e8e8e8' : v >= 2000 ? '#ffd700' : SS_PAL[i % SS_PAL.length];
        g.fill(); g.strokeStyle = '#000'; g.lineWidth = Math.max(1, R * 0.008); g.stroke();
        if (v >= 2000) { g.save(); g.clip(); g.strokeStyle = '#fff6a0'; g.lineWidth = R * 0.02; g.beginPath(); g.arc(0, 0, r * 0.86, a0, a1); g.stroke(); g.restore(); }
        g.save(); g.rotate(a0 + SEG / 2);
        const txt = v === 'BANKRUPT' ? 'BANKRUPT' : v === 'LOSE' ? 'LOSE A TURN' : '$' + v;
        const fs = R * (txt.length > 8 ? 0.078 : txt.length > 5 ? 0.092 : 0.11);
        g.font = `bold ${fs}px Arial,Helvetica,sans-serif`; g.textAlign = 'right'; g.textBaseline = 'middle';
        g.fillStyle = v === 'BANKRUPT' ? '#ff4040' : v === 'LOSE' ? '#000' : v >= 2000 ? '#8a0000' : '#fff';
        if (v !== 'LOSE' && v < 2000) { g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = fs * 0.14; g.strokeText(txt, r * 0.93, 0); }
        g.fillText(txt, r * 0.93, 0);
        g.restore();
      });
      // rim and pegs
      g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.lineWidth = R * 0.05; g.strokeStyle = '#c9a227'; g.stroke();
      g.lineWidth = R * 0.012; g.strokeStyle = '#6a4a00'; g.beginPath(); g.arc(0, 0, r + R * 0.025, 0, Math.PI * 2); g.stroke();
      for (let i = 0; i < 24; i++) {
        const a = -Math.PI / 2 + i * SEG;
        g.beginPath(); g.arc(Math.cos(a) * r * 0.975, Math.sin(a) * r * 0.975, R * 0.02, 0, Math.PI * 2); g.fillStyle = '#fff'; g.fill(); g.strokeStyle = '#444'; g.lineWidth = 1; g.stroke();
      }
      // hub
      const hg = g.createRadialGradient(-R * 0.05, -R * 0.05, R * 0.02, 0, 0, R * 0.22);
      hg.addColorStop(0, '#fff7c0'); hg.addColorStop(1, '#b08000');
      g.beginPath(); g.arc(0, 0, R * 0.21, 0, Math.PI * 2); g.fillStyle = hg; g.fill(); g.lineWidth = R * 0.015; g.strokeStyle = '#5a3a00'; g.stroke();
      g.fillStyle = '#6a0010'; g.font = `bold ${R * 0.085}px Arial,sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('SPIN', 0, -R * 0.045); g.fillText('SOLVE', 0, R * 0.06);
      wheelImg = c;
    }
    // Draw function done properly: wheel scaled to fit leaving room for the pointer.
    function render() {
      if (!size || !wheelImg) return;
      const s = cvs.width, c = s / 2, sc = 0.9;
      ctx.clearRect(0, 0, s, s);
      ctx.save(); ctx.translate(c, c + s * 0.04); ctx.rotate(S.ang); ctx.scale(sc, sc);
      ctx.drawImage(wheelImg, -wheelImg.width / 2, -wheelImg.height / 2);
      ctx.restore();
      // pointer (flapper) at the top
      const px = c, py = c + s * 0.04 - s / 2 * sc * 0.92;
      ctx.save(); ctx.translate(px, py - s * 0.035); ctx.rotate(-S.flap * 0.45 * (S.omega >= 0 ? 1 : -1));
      ctx.beginPath(); ctx.moveTo(-s * 0.035, 0); ctx.lineTo(s * 0.035, 0); ctx.lineTo(0, s * 0.085); ctx.closePath();
      ctx.fillStyle = '#ff2a2a'; ctx.fill(); ctx.lineWidth = Math.max(1, s * 0.006); ctx.strokeStyle = '#fff'; ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, s * 0.018, 0, Math.PI * 2); ctx.fillStyle = '#ffd23f'; ctx.fill();
      ctx.restore();
    }
    function resize() {
      if (!alive) return;
      root.classList.toggle('nar', W.body.clientWidth < 520);
      const w = wb.clientWidth, h = wb.clientHeight;
      const ns = Math.max(90, Math.floor(Math.min(w, h)));
      if (ns === size && wheelImg) return;
      size = ns; dpr = Math.min(2, window.devicePixelRatio || 1);
      cvs.style.width = cvs.style.height = size + 'px';
      cvs.width = cvs.height = Math.round(size * dpr);
      buildWheelImg(); render();
    }
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => resize()) : null;
    if (ro) { ro.observe(W.body); ro.observe(wb); }
    W.onResize = resize;

    /* ---------- wheel physics ---------- */
    const wedgeAt = ang => { const a = ((-ang) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2); return Math.floor(a / SEG) % 24; };
    let lastT = 0, pegIdx = 0, onStop = null;
    function loop(t) {
      raf = 0;
      if (!alive) return;
      const dt = Math.min(0.05, (t - lastT) / 1000 || 0.016); lastT = t;
      if (S.spinning) {
        const sgn = Math.sign(S.omega);
        S.omega -= sgn * (1.5 + 0.24 * Math.abs(S.omega)) * dt;
        if (Math.sign(S.omega) !== sgn || Math.abs(S.omega) < 0.08) {
          S.omega = 0; S.spinning = false;
        }
        S.ang += S.omega * dt;
      }
      const pi = Math.floor(S.ang / SEG);
      if (pi !== pegIdx) { pegIdx = pi; S.flap = 1; snd.tick(); if (S.spinning) S.omega *= 0.992; }
      S.flap = Math.max(0, S.flap - dt * 9);
      render();
      if (S.spinning || S.flap > 0) raf = requestAnimationFrame(loop);
      else if (onStop) { const f = onStop; onStop = null; f(wedgeAt(S.ang)); }
    }
    function kick() { if (!raf) { lastT = performance.now(); raf = requestAnimationFrame(loop); } }
    function spinWheel(omega, cb) {
      S.omega = omega; S.spinning = true; onStop = cb; pegIdx = Math.floor(S.ang / SEG); kick();
    }

    // drag / flick to spin
    let drag = null;
    const angOf = e => { const r = cvs.getBoundingClientRect(); return Math.atan2(e.clientY - (r.top + r.height * 0.54), e.clientX - (r.left + r.width / 2)); };
    cvs.addEventListener('pointerdown', e => {
      if (!canSpin()) { if (S.phase === 'turn' && human()) say(consLeft() ? 'You can\'t spin right now.' : 'No consonants remain. Buy a vowel or solve!'); return; }
      e.preventDefault(); cvs.setPointerCapture(e.pointerId); cvs.style.cursor = 'grabbing';
      drag = { a: angOf(e), samples: [{ t: performance.now(), ang: S.ang }] };
    });
    cvs.addEventListener('pointermove', e => {
      if (!drag) return;
      const a = angOf(e); let d = a - drag.a; if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2;
      drag.a = a; S.ang += d;
      const now = performance.now(); drag.samples.push({ t: now, ang: S.ang });
      while (drag.samples.length > 2 && now - drag.samples[0].t > 120) drag.samples.shift();
      const pi = Math.floor(S.ang / SEG); if (pi !== pegIdx) { pegIdx = pi; S.flap = 1; snd.tick(); }
      kick();
    });
    const endDrag = e => {
      if (!drag) return;
      cvs.style.cursor = '';
      const now = performance.now(), s0 = drag.samples[0];
      const dt = (now - s0.t) / 1000;
      let w = dt > 0.005 ? (S.ang - s0.ang) / dt : 0;
      if (now - drag.samples[drag.samples.length - 1].t > 150) w = 0;
      drag = null;
      if (e.type === 'pointercancel') return;
      if (Math.abs(w) < 4) { say('Give it a real spin! Flick the wheel harder, or press Spin.'); return; }
      w = Math.sign(w) * Math.min(15, Math.abs(w)) * rnd(0.92, 1.08);
      startHumanSpin(w);
    };
    cvs.addEventListener('pointerup', endDrag);
    cvs.addEventListener('pointercancel', endDrag);

    /* ---------- buttons ---------- */
    const actBtn = a => W.body.querySelector(`[data-a="${a}"]`);
    function canSpin() { return S.phase === 'turn' && human() && !S.spinning && consLeft(); }
    function canBuy() { return S.phase === 'turn' && human() && P().round >= 250 && vowelsLeft(); }
    function refreshUI() {
      actBtn('spin').disabled = !canSpin();
      actBtn('buy').disabled = !canBuy();
      actBtn('solve').disabled = !(S.phase === 'turn' && human());
      for (const L in keyBtn) {
        const b = keyBtn[L], isV = SS_VOWELS.includes(L);
        let en = false;
        if (S.phase === 'consonant' && human()) en = !isV && !S.used.has(L);
        else if (S.phase === 'vowel' && human()) en = isV && !S.used.has(L);
        else if (S.phase === 'bonusPick') en = !S.used.has(L) && (isV ? S.bonus.v < 1 : S.bonus.c < 3);
        b.disabled = !en;
        b.classList.toggle('used', S.used.has(L));
        b.classList.toggle('hit', S.used.has(L) && inPuzzle(L));
      }
      renderPods();
    }
    W.body.querySelector('.ss-acts').addEventListener('click', e => {
      const b = e.target.closest('[data-a]'); if (!b || b.disabled) return;
      if (b.dataset.a === 'spin') startHumanSpin(rnd(8, 12.5));
      else if (b.dataset.a === 'buy') buyVowel();
      else if (b.dataset.a === 'solve') openSolve();
    });
    W.body.querySelector('.ss-sv').addEventListener('click', e => {
      const b = e.target.closest('[data-a]'); if (!b) return;
      if (b.dataset.a === 'go') submitSolve(); else if (b.dataset.a === 'cancel') cancelSolve();
    });
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); submitSolve(); } });

    /* ---------- overlays ---------- */
    function overlay(html, btns) {
      ov.innerHTML = html; ov.classList.add('open');
      const bt = ov.querySelector('.ss-bt');
      (btns || []).forEach(([lab, fn], i) => {
        const b = document.createElement('button'); b.className = 'btn'; b.textContent = lab; if (i === 0) b.dataset.primary = '1';
        b.onclick = () => { snd.pick(); fn(); }; bt.appendChild(b);
      });
      const f = ov.querySelector('[data-primary]'); if (f) setTimeout(() => f.focus(), 30);
    }
    const closeOv = () => { ov.classList.remove('open'); ov.innerHTML = ''; };
    function flash(html, ms, then) {
      ov.innerHTML = `<div class="ss-big">${html}</div>`; ov.classList.add('open');
      later(() => { closeOv(); then && then(); }, ms);
    }

    function titleScreen() {
      gen++; clearTimers(); S.phase = 'title'; S.bonus = null; root.classList.remove('solving', 'bon', 'party');
      const st = stats();
      overlay(`<div class="ss-title"><div class="ss-mini"></div><div class="ss-logo">SPIN &amp; SOLVE<em>THE WORD WHEEL GAME</em></div>
        <div class="ss-pan raised">
          <p style="text-align:center">Spin the wheel, call letters, and solve the puzzle before the other contestants do!</p>
          <div class="ss-diff">${['easy', 'normal', 'hard'].map(d => `<label><input type="radio" name="ssd" value="${d}"${d === diff ? ' checked' : ''}> ${d[0].toUpperCase() + d.slice(1)}</label>`).join('')}</div>
          <p style="text-align:center;margin-top:6px">Best total: <b>${money(st.best)}</b> &nbsp; First-place finishes: <b>${st.firsts}</b></p>
          <div class="ss-bt"></div></div></div>`,
      [['Play!', newGame], ['How to Play', () => howTo(titleScreen)], ['Statistics', () => showStats(titleScreen)]]);
      ov.querySelectorAll('input[name=ssd]').forEach(r => r.onchange = () => { diff = r.value; api.save('diff', diff); });
      say('Welcome to SPIN & SOLVE!');
    }
    function howTo(back) {
      overlay(`<div class="ss-pan raised"><h2>How to Play Spin &amp; Solve</h2><ul>
        <li>You play against two computer contestants over <b>3 rounds</b>. Each round has a hidden word puzzle and a category.</li>
        <li>On your turn: <b>Spin</b> the wheel (press Spin, press Space, or grab and flick the wheel). Land on cash, then call a <b>consonant</b>. You win the wedge value for every time that letter appears.</li>
        <li><b>Buy a vowel</b> (A E I O U) for $250 from your round money. Press B.</li>
        <li><b>Solve</b> by typing the whole answer (press Enter). Spaces, case and punctuation don't matter.</li>
        <li>A wrong letter, a letter already called, or a wrong solve passes the turn. <b>BANKRUPT</b> wipes out your round money. <b>LOSE A TURN</b> passes the turn.</li>
        <li>Only the round winner banks their round money (house minimum $1,000). Round 3 has a second BANKRUPT.</li>
        <li><b>Bonus Round - Beat the Board:</b> finish in first place and pick 3 consonants and 1 vowel. Then the clock starts at $25,000 and the board flips a new tile every 3 seconds, and every flip lowers the prize by $2,500. Solve early for the big money!</li>
        <li>Win the game to earn play money: $1 for every $2,000 you bank, up to $10.</li></ul>
        <div class="ss-bt"></div></div>`, [['OK', back]]);
    }
    function showStats(back) {
      const s = stats();
      overlay(`<div class="ss-pan raised"><h2>Statistics</h2><table>
        <tr><td>Games played</td><td>${s.played}</td></tr><tr><td>First-place finishes</td><td>${s.firsts}</td></tr>
        <tr><td>Bonus rounds won</td><td>${s.bonusWins}</td></tr><tr><td>Best game total</td><td>${money(s.best)}</td></tr>
        <tr><td>Best single round</td><td>${money(s.bestRound)}</td></tr><tr><td>Lifetime winnings</td><td>${money(s.totalWon)}</td></tr></table>
        <div class="ss-bt"></div></div>`, [['OK', back], ['Reset', async () => { const r = await api.msgBox('Spin & Solve', 'Reset all statistics?', ['Yes', 'No'], 'warn'); if (r === 'Yes') api.save('stats', {}); showStats(back); }]]);
    }

    /* ---------- game flow ---------- */
    function pickPuzzle(minLetters = 0) {
      const recent = api.load('recent', []);
      const all = [];
      Object.keys(SS_PUZZLES).forEach(cat => SS_PUZZLES[cat].forEach(p => all.push({ cat, p })));
      let pool = all.filter(x => !recent.includes(x.p) && !S.usedPuzzles.includes(x.p) && ssLetters(x.p).length >= minLetters);
      if (!pool.length) pool = all.filter(x => !S.usedPuzzles.includes(x.p) && ssLetters(x.p).length >= minLetters);
      const cats = [...new Set(pool.map(x => x.cat))].filter(c => !S.usedPuzzles.some(p => SS_PUZZLES[c].includes(p)));
      const catPool = cats.length ? pool.filter(x => cats.includes(x.cat)) : pool;
      const pick = api.pick(catPool);
      S.usedPuzzles.push(pick.p);
      recent.push(pick.p); while (recent.length > 60) recent.shift(); api.save('recent', recent);
      return pick;
    }
    function newGame() {
      gen++; clearTimers(); closeOv(); root.classList.remove('solving', 'bon', 'party');
      S.bonus = null; S.usedPuzzles = [];
      const ai = shuffle(SS_AI).slice(0, 2);
      const me = String(api.user || 'You').slice(0, 12) || 'You';
      S.players = [{ name: me, human: true, round: 0, total: 0 }].concat(ai.map(p => ({ name: p.name, pers: p, human: false, round: 0, total: 0 })));
      S.bestRound = 0;
      overlay(`<div class="ss-pan raised"><h2>Meet today's contestants</h2>
        <p><b>${escH(me)}</b> - that's you!</p>${ai.map(p => `<p><b>${escH(p.name)}</b> - ${escH(p.bio)}</p>`).join('')}
        <div class="ss-bt"></div></div>`, [['Let\'s play!', () => { closeOv(); snd.applause(1.5); startRound(0); }]]);
      snd.jingle();
    }
    function startRound(r) {
      S.round = r; S.wheel = ssWheel(r); S.used = new Set(); buildWheelImg(); render();
      const { cat, p } = pickPuzzle();
      S.puzzle = p; S.cat = cat; buildBoard(p); catEl.textContent = cat.toUpperCase();
      S.players.forEach(pl => { pl.round = 0; });
      S.cur = r % 3; S.phase = 'intro'; refreshUI();
      say(`Round ${r + 1}! The category is ${cat}.`);
      flash(`ROUND ${r + 1}<br><span style="font-size:.6em;color:#7ff">${escH(cat.toUpperCase())}</span>${r === 2 ? '<br><span style="font-size:.45em;color:#f66">WATCH OUT: TWO BANKRUPTS!</span>' : ''}`, 1800, beginTurn);
      snd.sting();
    }
    function beginTurn() {
      S.phase = 'turn'; closeSolveUI();
      const p = P();
      if (!hiddenTiles().length) { winRound(S.cur); return; }
      if (p.human) {
        const opts = [consLeft() ? 'Spin (Space)' : null, P().round >= 250 && vowelsLeft() ? 'buy a vowel (B)' : null, 'solve (Enter)'].filter(Boolean);
        say(`Your turn, ${p.name}! ${!consLeft() ? 'No more consonants! ' : ''}${opts.join(', ')}.`);
      } else say(`${p.name}'s turn...`);
      refreshUI();
      if (!p.human) later(aiTurn, (900 + Math.random() * 700) * DIFF[diff].speed);
    }
    function nextPlayer(ms = 1300) {
      S.phase = 'wait'; refreshUI();
      later(() => { S.cur = (S.cur + 1) % 3; beginTurn(); }, ms);
    }
    function startHumanSpin(w) {
      if (!canSpin()) return;
      S.phase = 'spinning'; refreshUI(); say('Round and round she goes...');
      spinWheel(w, landed);
    }
    function landed(i) {
      const v = S.wheel[i], p = P();
      if (v === 'BANKRUPT') {
        snd.bust(); p.round = 0; refreshUI();
        say(p.human ? 'BANKRUPT! Ouch. Your round money is gone.' : line(p, 'bust'), p.human ? '' : p.name);
        nextPlayer(1800); return;
      }
      if (v === 'LOSE') { snd.flop(); say(p.human ? 'LOSE A TURN. Better luck next spin.' : `${p.name} loses a turn.`); nextPlayer(1600); return; }
      S.val = v; S.phase = 'consonant'; snd.pick();
      if (p.human) say(`${money(v)}! Pick a consonant.`);
      else { say(`${money(v)}! ${p.name} is thinking...`); later(() => pickLetter(aiConsonant(p)), 1000 * DIFF[diff].speed); }
      refreshUI();
    }
    function buyVowel() {
      if (S.phase !== 'turn' || P().round < 250 || !vowelsLeft()) return;
      P().round -= 250; S.phase = 'vowel'; snd.pick();
      if (human()) say('Vowels cost $250. Pick a vowel.');
      else { say(`${P().name} buys a vowel...`); later(() => pickLetter(aiVowel(P())), 900 * DIFF[diff].speed); }
      refreshUI();
    }
    function pickLetter(L) {
      if (S.phase === 'bonusPick') { bonusPick(L); return; }
      const isV = SS_VOWELS.includes(L), p = P();
      if (S.phase === 'consonant' ? isV : S.phase === 'vowel' ? !isV : true) return;
      if (S.used.has(L)) { if (p.human) say(`${L} has already been called. Pick another.`); return; }
      const cash = S.phase === 'consonant';
      S.used.add(L); S.phase = 'reveal';
      const n = S.tiles.filter(t => t.ch === L).length;
      const who = p.human ? '' : p.name;
      if (!p.human) say(`"${L}", please.`, p.name);
      refreshUI();
      if (!n) {
        later(() => { snd.buzzer(); say(p.human ? `Sorry, there is no ${L}.` : `No ${L}. ${line(p, 'bad')}`, who); nextPlayer(1500); }, p.human ? 150 : 700);
        return;
      }
      later(() => {
        if (cash) p.round += S.val * n;
        say(`There ${n === 1 ? 'is one' : 'are ' + n} ${L}${n === 1 ? '' : "'s"}!${cash ? ' +' + money(S.val * n) : ''}${p.human ? '' : ' ' + line(p, 'good')}`, who);
        refreshUI();
        revealLetter(L, () => { if (!hiddenTiles().length) { say(`${p.human ? 'You' : p.name} revealed the last letter!`); later(() => winRound(S.cur), 700); } else beginTurn(); });
      }, p.human ? 150 : 700);
    }

    /* ---------- solving ---------- */
    const clean = s => s.toUpperCase().replace(/[^A-Z]/g, '');
    function closeSolveUI() { root.classList.remove('solving'); input.blur(); }
    function openSolve() {
      if (S.phase !== 'turn' || !human()) return;
      S.phase = 'solving'; root.classList.add('solving'); input.value = ''; refreshUI();
      say('Type your answer and press Enter.');
      setTimeout(() => input.focus(), 20);
    }
    function cancelSolve() { if (S.phase !== 'solving') return; closeSolveUI(); beginTurn(); }
    function isRight(guess) {
      const a = clean(S.puzzle), g = clean(guess);
      return g === a || (a.length >= 14 && lev(a, g) <= 1);
    }
    function submitSolve() {
      if (S.phase === 'bonusClock') { bonusGuess(); return; }
      if (S.phase !== 'solving') return;
      const g = input.value.trim(); if (!clean(g)) { input.focus(); return; }
      closeSolveUI();
      if (isRight(g)) { winRound(S.cur); return; }
      S.phase = 'wait'; snd.buzzer(); say(`"${g.toUpperCase()}" - sorry, that's not it.`); nextPlayer(1600);
    }
    function winRound(i) {
      S.phase = 'won'; closeSolveUI(); S.cur = i; refreshUI();
      const p = S.players[i];
      revealAll();
      const amt = Math.max(p.round, 1000);
      snd.applause(2.4); snd.fanfare(); root.classList.add('party');
      say(`${p.human ? 'You solved it' : p.name + ' solves it'}: ${S.puzzle}! ${money(amt)} banked.`);
      later(() => {
        p.total += amt; if (p.human) S.bestRound = Math.max(S.bestRound, amt);
        S.players.forEach(pl => { pl.round = 0; }); refreshUI(); root.classList.remove('party');
        if (S.round < 2) later(() => startRound(S.round + 1), 1400);
        else later(endMain, 1400);
      }, 2600);
    }

    /* ---------- computer contestants ---------- */
    function aiConsonant(p) {
      const avail = 'TNSRHLDCMGPBFYWKVXZJQ'.split('').filter(c => !S.used.has(c));
      const smart = p.pers.skill * DIFF[diff].skill * (0.25 + 0.6 * frac());
      const good = avail.filter(inPuzzle);
      if (good.length && Math.random() < smart) return api.pick(good);
      const top = avail.slice(0, 6), wts = [6, 5, 4, 3, 2, 1].slice(0, top.length);
      let r = Math.random() * wts.reduce((a, b) => a + b, 0);
      for (let k = 0; k < top.length; k++) { r -= wts[k]; if (r <= 0) return top[k]; }
      return top[0];
    }
    function aiVowel(p) {
      const avail = 'EAOIU'.split('').filter(c => !S.used.has(c));
      const good = avail.filter(inPuzzle);
      if (good.length && Math.random() < p.pers.skill * DIFF[diff].skill * 0.6) return good[0];
      return Math.random() < 0.75 ? avail[0] : api.pick(avail);
    }
    function aiKnows(p) {
      const hd = new Set(hiddenTiles().map(t => t.ch)).size, f = frac();
      if (hd === 0) return true;
      const need = p.pers.solveAt + DIFF[diff].solve + rnd(-0.08, 0.08);
      return (f >= need && f > 0.35) || (hd <= 1 && f > 0.4) || (hd <= 2 && f > 0.55);
    }
    function aiTurn() {
      const p = P(); if (p.human || S.phase !== 'turn') return;
      const know = aiKnows(p), cons = consLeft(), vows = vowelsLeft();
      const greedy = know && cons && p.round < 1500 && Math.random() < p.pers.greed && new Set(hiddenTiles().map(t => t.ch)).size > 2;
      if ((know && !greedy) || (!cons && (!vows || p.round < 250))) { aiSolve(p, know); return; }
      if (vows && p.round >= 250 && (!cons || Math.random() < p.pers.vowelLove * (0.5 + frac()))) { buyVowel(); return; }
      S.phase = 'spinning'; refreshUI();
      say(line(p, 'spin'), p.name);
      later(() => spinWheel(rnd(7, 11) * p.pers.power * (Math.random() < 0.1 ? -1 : 1), landed), 500);
    }
    function aiSolve(p, know) {
      S.phase = 'wait'; refreshUI();
      say(line(p, 'solve'), p.name);
      const f = frac(), ok = know || Math.random() < f * f * 0.8;
      later(() => {
        if (ok) { say(`"${S.puzzle}"`, p.name); later(() => winRound(S.cur), 900); return; }
        const nonSp = S.tiles.filter(t => t.ch !== ' ');
        let g = '', guard = 0;
        do {
          g = ''; let k = 0;
          for (const ch of S.puzzle) {
            if (ch === ' ') { g += ' '; continue; }
            const t = nonSp[k++];
            g += t && t.letter && !t.shown ? api.pick('ETAOINSRHLDCMPB'.split('')) : ch;
          }
        } while (g === S.puzzle && ++guard < 10);
        say(`"${g}"?`, p.name);
        later(() => { snd.buzzer(); say(`Sorry, ${p.name}, that's not it.`); nextPlayer(1400); }, 1100);
      }, 1100);
    }

    /* ---------- end of main game / bonus ---------- */
    function standings() { return S.players.map((p, i) => ({ p, i })).sort((a, b) => b.p.total - a.p.total); }
    function endMain() {
      S.phase = 'over'; refreshUI();
      const st = standings(), me = S.players[0], top = st[0].p.total;
      const first = me.total >= top;
      const tbl = `<table>${st.map(x => `<tr><td>${escH(x.p.name)}${x.p.human ? ' (you)' : ''}</td><td>${money(x.p.total)}</td></tr>`).join('')}</table>`;
      if (first) {
        snd.applause(2.5, 1.3);
        overlay(`<div class="ss-pan raised"><h2>You're in first place!</h2>${tbl}<p>Time for the <b>BONUS ROUND: Beat the Board</b>. Pick 3 consonants and 1 vowel. Then the clock starts at <b>$25,000</b> and a tile flips every 3 seconds, lowering the prize by $2,500. Type your answer as fast as you can!</p><div class="ss-bt"></div></div>`,
          [['Start Bonus Round', startBonus]]);
      } else {
        snd.flop();
        finishGame(false, `${escH(st[0].p.name)} wins today's game with ${money(top)}.`, tbl);
      }
    }
    function startBonus() {
      closeOv();
      const { cat, p } = pickPuzzle(9);
      S.puzzle = p; S.cat = cat; buildBoard(p); catEl.textContent = 'BONUS: ' + cat.toUpperCase();
      S.used = new Set(); S.bonus = { c: 0, v: 0, prize: 25000, left: 24 }; S.cur = 0; S.phase = 'bonusPick';
      root.classList.add('bon'); prizeEl.textContent = money(25000); clockBar.style.transform = 'scaleX(1)';
      say('Pick 3 consonants and 1 vowel.'); snd.sting(); refreshUI();
    }
    function bonusPick(L) {
      const B = S.bonus, isV = SS_VOWELS.includes(L);
      if (S.used.has(L) || (isV ? B.v >= 1 : B.c >= 3)) return;
      S.used.add(L); if (isV) B.v++; else B.c++; snd.pick();
      const need = [3 - B.c ? `${3 - B.c} consonant${3 - B.c > 1 ? 's' : ''}` : '', 1 - B.v ? '1 vowel' : ''].filter(Boolean).join(' and ');
      say(need ? `${[...S.used].join(' ')} ... pick ${need}.` : `Your letters: ${[...S.used].join(' ')}. Let's see them!`);
      refreshUI();
      if (B.c === 3 && B.v === 1) {
        S.phase = 'bonusReveal'; refreshUI();
        const ts = S.tiles.filter(t => t.letter && S.used.has(t.ch));
        later(() => {
          ts.forEach((t, i) => later(() => { t.el.classList.add('lit'); snd.ding(i); }, i * 180));
          later(() => { ts.forEach((t, i) => flipTile(t, i * 80)); later(bonusClock, ts.length * 80 + 900); }, ts.length * 180 + 400);
        }, 600);
      }
    }
    let bonusIv = 0;
    function bonusClock() {
      S.phase = 'bonusClock'; root.classList.add('solving'); input.value = ''; refreshUI();
      say('The clock is running! Type the answer and press Enter.');
      setTimeout(() => input.focus(), 20);
      const B = S.bonus; B.left = 24; B.paused = false; let tenth = 0;
      clearInterval(bonusIv);
      bonusIv = setInterval(() => {
        if (!alive || S.phase !== 'bonusClock') { clearInterval(bonusIv); return; }
        if (B.paused) return;
        tenth++;
        if (tenth % 10) return;
        B.left--; clockBar.style.transform = `scaleX(${B.left / 24})`; snd.tock();
        if (B.left > 0 && B.left % 3 === 0) {
          const hid = hiddenTiles();
          if (hid.length > 2) { flipTile(api.pick(hid), 0); B.prize = Math.max(5000, B.prize - 2500); prizeEl.textContent = money(B.prize); prizeEl.classList.remove('ss-flash'); void prizeEl.offsetWidth; prizeEl.classList.add('ss-flash'); }
        }
        if (B.left <= 0) { clearInterval(bonusIv); bonusEnd(false); }
      }, 100);
    }
    function bonusGuess() {
      const g = input.value.trim(); if (!clean(g)) return;
      if (isRight(g)) { clearInterval(bonusIv); bonusEnd(true); }
      else { snd.buzzer(); say(`"${g.toUpperCase()}" is not it. Keep trying!`); input.value = ''; input.focus(); }
    }
    function bonusEnd(won) {
      S.phase = 'bonusDone'; closeSolveUI(); revealAll(60); refreshUI();
      const me = S.players[0];
      if (won) { me.total += S.bonus.prize; snd.applause(3, 1.4); snd.fanfare(); root.classList.add('party'); say(`YES! ${S.puzzle}! You win ${money(S.bonus.prize)}!`); }
      else { snd.timeUp(); say(`Time's up! The answer was ${S.puzzle}.`); }
      refreshUI();
      later(() => {
        const st = standings();
        const tbl = `<table>${st.map(x => `<tr><td>${escH(x.p.name)}${x.p.human ? ' (you)' : ''}</td><td>${money(x.p.total)}</td></tr>`).join('')}</table>`;
        finishGame(true, won ? `You beat the board and won ${money(S.bonus.prize)}!` : `The bonus puzzle was: ${escH(S.puzzle)}.`, tbl, won);
      }, 2800);
    }
    function finishGame(first, headline, tbl, bonusWon) {
      S.phase = 'over'; root.classList.remove('bon', 'solving'); refreshUI();
      const me = S.players[0], s = stats();
      s.played++; if (first) s.firsts++; if (bonusWon) s.bonusWins++;
      s.best = Math.max(s.best, me.total); s.bestRound = Math.max(s.bestRound, S.bestRound || 0); s.totalWon += me.total;
      api.save('stats', s);
      let earned = 0;
      if (first) { const amt = Math.min(10, Math.floor(me.total / 2000)); if (amt > 0) earned = api.earn(amt, 'winning Spin & Solve') || 0; }
      overlay(`<div class="ss-pan raised"><h2>${first ? 'Congratulations, champion!' : 'Game over'}</h2><p>${headline}</p>${tbl}
        <p>Your total: <b>${money(me.total)}</b>${me.total >= s.best && me.total > 0 ? ' - a new personal best!' : ''}</p>
        ${first ? `<p>${earned ? `You earned <b>$${earned}</b> in play money.` : me.total < 2000 ? 'Bank at least $2,000 to earn play money.' : 'You have reached today\'s play-money limit.'}</p>` : '<p>Finish in first place to play the Bonus Round and earn play money.</p>'}
        <div class="ss-bt"></div></div>`, [['Play Again', newGame], ['Title Screen', titleScreen]]);
      say(first ? 'Thanks for playing, champ!' : 'Thanks for playing! Try again?');
    }

    /* ---------- keyboard, menu, lifecycle ---------- */
    W.onKey = e => {
      if (e.target && e.target.tagName === 'INPUT' && e.target.type === 'text') { if (e.key === 'Escape') cancelSolve(); return; }
      if (ov.classList.contains('open')) {
        if (e.key === 'Enter') { const b = ov.querySelector('[data-primary]'); if (b && document.activeElement !== b) { e.preventDefault(); b.click(); } }
        return;
      }
      const k = e.key.length === 1 ? e.key.toUpperCase() : e.key;
      if (e.key === ' ') { e.preventDefault(); if (canSpin()) startHumanSpin(rnd(8, 12.5)); return; }
      if (S.phase === 'turn' && human()) {
        if (k === 'B') { e.preventDefault(); if (canBuy()) buyVowel(); }
        else if (e.key === 'Enter') { e.preventDefault(); openSolve(); }
        return;
      }
      if (/^[A-Z]$/.test(k) && (S.phase === 'bonusPick' || ((S.phase === 'consonant' || S.phase === 'vowel') && human()))) {
        e.preventDefault(); const b = keyBtn[k]; if (!b.disabled) pickLetter(k);
      }
    };
    api.menubar([
      { label: 'Game', items: () => [{ label: 'New Game', fn: newGame }, { label: 'Title Screen', fn: titleScreen }, '-', { label: 'How to Play', fn: () => { const ph = S.phase; if (ph === 'title') howTo(titleScreen); else { if (S.bonus) S.bonus.paused = true; howTo(() => { closeOv(); if (S.bonus) S.bonus.paused = false; }); } } }, { label: 'Statistics', fn: () => { if (S.phase === 'title') showStats(titleScreen); else { if (S.bonus) S.bonus.paused = true; showStats(() => { closeOv(); if (S.bonus) S.bonus.paused = false; }); } } }, '-', { label: 'Exit', fn: () => api.close() }] },
      { label: 'Options', items: () => [
        ...['easy', 'normal', 'hard'].map(d => ({ label: (d === diff ? '• ' : '   ') + d[0].toUpperCase() + d.slice(1) + ' opponents', fn: () => { diff = d; api.save('diff', d); } })), '-',
        { label: (sound ? '• ' : '   ') + 'Sound', fn: () => { sound = !sound; api.save('sound', sound); } }] }
    ]);
    W.onMin = () => { if (S.bonus) S.bonus.paused = true; };
    W.onClose = () => { alive = false; gen++; clearTimers(); clearInterval(bonusIv); if (raf) cancelAnimationFrame(raf); if (ro) ro.disconnect(); };
    // resume the bonus clock when the window is used again
    W.body.addEventListener('pointerdown', () => { if (S.bonus && S.bonus.paused && !ov.classList.contains('open')) S.bonus.paused = false; });

    S.players = [{ name: String(api.user || 'You').slice(0, 12), human: true, round: 0, total: 0 }, { name: '???', round: 0, total: 0 }, { name: '???', round: 0, total: 0 }];
    buildBoard('SPIN AND SOLVE');
    S.tiles.forEach(t => { if (t.letter) { t.shown = true; t.el.classList.add('show'); } });
    resize(); setTimeout(resize, 30);
    titleScreen();
  }
  /* ================= ANSWER ME THIS!: clues =================
     Each category: n = name, t = tag, e = earliest era id (optional), c = 5 clues from easiest to hardest.
     A clue is [clue text, 'Answer|accepted alternate|another alternate']. */
  const AM_CATS = [
    { n: 'Science Class', t: 'science', c: [
      ['Water freezes at this many degrees Celsius.', '0|zero|0 degrees|zero degrees'],
      ['H2O is the chemical formula for this everyday substance.', 'Water'],
      ['This force keeps your feet on the ground and makes apples fall from trees.', 'Gravity'],
      ['Plants take in this gas from the air and give off oxygen.', 'Carbon dioxide|CO2'],
      ['It is the process plants use to turn sunlight, water and air into food.', 'Photosynthesis']] },
    { n: 'The Human Body', t: 'science', c: [
      ['This organ pumps blood all through your body.', 'The heart|heart'],
      ['This is the largest organ of the human body, and it covers you from head to toe.', 'Skin'],
      ['The femur, the longest bone in your body, is in this part of your leg.', 'The thigh|thigh|upper leg|leg'],
      ['A full set of adult teeth, including the wisdom teeth, numbers this many.', '32|thirty two|thirty-two'],
      ['These tiny air sacs in the lungs are where oxygen passes into the blood.', 'Alveoli|alveolus|alveolar sacs|air sacs']] },
    { n: 'Chemistry Set', t: 'science', c: [
      ['The letter O on the periodic table stands for this element we breathe.', 'Oxygen'],
      ['Au is the chemical symbol for this precious yellow metal.', 'Gold'],
      ['This metal with the symbol Fe turns to rust when it meets water and air.', 'Iron'],
      ['It is the lightest element, number 1 on the periodic table.', 'Hydrogen'],
      ['Na is the symbol for this element, which joins with chlorine to make table salt.', 'Sodium']] },
    { n: 'Weather Watch', t: 'science', c: [
      ['It is a violently spinning funnel of wind that reaches down from a storm cloud to the ground.', 'Tornado|twister'],
      ['This instrument measures how hot or cold it is.', 'Thermometer'],
      ['This instrument measures air pressure, and a falling reading can mean a storm is coming.', 'Barometer'],
      ['In the Atlantic, a tropical storm gets this name once its winds reach 74 miles per hour.', 'Hurricane'],
      ['These puffy, heaped-up fair-weather clouds take their name from the Latin word for "heap."', 'Cumulus|cumulus clouds']] },
    { n: 'World Capitals', t: 'geo', c: [
      ['The Eiffel Tower stands in this capital city.', 'Paris'],
      ['It is the capital city of Japan.', 'Tokyo'],
      ['The Colosseum is in this capital of Italy.', 'Rome'],
      ['This capital of Egypt sits on the Nile River.', 'Cairo'],
      ['It is the capital of Australia, and it is not Sydney.', 'Canberra']] },
    { n: 'U.S. States', t: 'geo', c: [
      ['This is the largest U.S. state by area.', 'Alaska'],
      ['This state is made up of a chain of islands in the Pacific Ocean.', 'Hawaii'],
      ['This state is nicknamed the Sunshine State.', 'Florida'],
      ['Sacramento is the capital of this state.', 'California'],
      ['This is the smallest U.S. state by area.', 'Rhode Island']] },
    { n: 'Rivers & Oceans', t: 'geo', c: [
      ['It is the largest and deepest ocean on Earth.', 'The Pacific Ocean|pacific|pacific ocean'],
      ['This long river flows north through Egypt to the Mediterranean Sea.', 'The Nile|nile|nile river'],
      ['This South American river carries more water than any other river in the world.', 'The Amazon|amazon|amazon river'],
      ['London is built on the banks of this river.', 'The Thames|thames|river thames|thames river'],
      ['This river forms much of the border between Texas and Mexico.', 'The Rio Grande|rio grande']] },
    { n: 'Mountains & Deserts', t: 'geo', c: [
      ['It is the tallest mountain on Earth above sea level.', 'Mount Everest|everest|mt everest'],
      ['This huge desert covers much of northern Africa.', 'The Sahara|sahara|sahara desert'],
      ['This mountain range runs through the western United States and Canada, including Colorado.', 'The Rocky Mountains|rockies|rocky mountains|rocky'],
      ['The Andes mountains run down the western side of this continent.', 'South America'],
      ['The Gobi Desert stretches across Mongolia and this large neighboring country.', 'China']] },
    { n: 'U.S. History', t: 'ushist', c: [
      ['This document, adopted on July 4, 1776, announced that the colonies were breaking away from Britain.', 'The Declaration of Independence|declaration of independence|declaration'],
      ['He was the first President of the United States.', 'George Washington|washington'],
      ['This president issued the Emancipation Proclamation during the Civil War.', 'Abraham Lincoln|lincoln|abe lincoln'],
      ['In 1803 the United States bought this huge piece of land from France.', 'The Louisiana Purchase|louisiana purchase|louisiana|louisiana territory'],
      ['In 1848, the discovery of this at Sutter\'s Mill set off a famous rush to California.', 'Gold']] },
    { n: 'Presidents', t: 'ushist', c: [
      ['This president\'s face appears on the U.S. penny.', 'Abraham Lincoln|lincoln|abe lincoln'],
      ['The teddy bear was named after this outdoors-loving president.', 'Theodore Roosevelt|teddy roosevelt|roosevelt|teddy'],
      ['This third president was the main author of the Declaration of Independence.', 'Thomas Jefferson|jefferson'],
      ['This president was elected four times, more than any other.', 'Franklin D. Roosevelt|franklin roosevelt|franklin delano roosevelt|fdr|roosevelt'],
      ['Before he became president, this general led the Allied invasion of Normandy on D-Day.', 'Dwight D. Eisenhower|eisenhower|dwight eisenhower|ike']] },
    { n: 'American Landmarks', t: 'ushist', c: [
      ['This statue in New York Harbor was a gift from the people of France.', 'The Statue of Liberty|statue of liberty|lady liberty'],
      ['The faces of four presidents are carved into this mountain in South Dakota.', 'Mount Rushmore|rushmore|mt rushmore'],
      ['This orange-red suspension bridge spans the entrance to San Francisco Bay.', 'The Golden Gate Bridge|golden gate bridge|golden gate'],
      ['This cracked bell in Philadelphia is a symbol of American independence.', 'The Liberty Bell|liberty bell'],
      ['This tall stone obelisk in Washington, D.C., honors the first president.', 'The Washington Monument|washington monument']] },
    { n: 'Ancient Worlds', t: 'worldhist', c: [
      ['The ancient Egyptians built these giant stone tombs at Giza.', 'The Pyramids|pyramids|pyramid|great pyramids'],
      ['Legend says this city was founded by the twins Romulus and Remus.', 'Rome'],
      ['The ancient Olympic Games began in this country.', 'Greece|ancient greece'],
      ['This enormous wall was built to protect ancient China\'s northern border.', 'The Great Wall of China|great wall|great wall of china'],
      ['The ancient Egyptians wrote with these picture symbols.', 'Hieroglyphics|hieroglyphs|hieroglyph']] },
    { n: 'Explorers', t: 'worldhist', c: [
      ['In 1492 this explorer sailed west across the Atlantic for Spain.', 'Christopher Columbus|columbus'],
      ['From 1804 to 1806 this pair led the Corps of Discovery across the American West.', 'Lewis and Clark|lewis clark|meriwether lewis and william clark'],
      ['In 1969 he became the first person to walk on the Moon.', 'Neil Armstrong|armstrong'],
      ['This Portuguese sailor began the first voyage all the way around the world, but died along the way.', 'Ferdinand Magellan|magellan'],
      ['In 1911 this Norwegian explorer led the first team to reach the South Pole.', 'Roald Amundsen|amundsen']] },
    { n: 'World History', t: 'worldhist', c: [
      ['This great ocean liner sank in 1912 after hitting an iceberg on its first voyage.', 'The Titanic|titanic|rms titanic'],
      ['This French emperor was defeated at the Battle of Waterloo.', 'Napoleon|napoleon bonaparte|bonaparte'],
      ['This wall that divided a German city was opened in 1989.', 'The Berlin Wall|berlin wall'],
      ['King John agreed to the Magna Carta in 1215 in this country.', 'England|britain|great britain'],
      ['This name, meaning "rebirth," is given to the great flowering of art and learning that began in Italy.', 'The Renaissance|renaissance']] },
    { n: 'Animal Kingdom', t: 'animals', c: [
      ['It is the largest animal that has ever lived, and it lives in the ocean.', 'The blue whale|blue whale'],
      ['This is the tallest animal on Earth, thanks to its very long neck.', 'The giraffe|giraffe'],
      ['This spotted big cat is the fastest land animal.', 'The cheetah|cheetah'],
      ['A mother kangaroo carries her baby in this.', 'A pouch|pouch'],
      ['Animals like owls and bats that are active at night are described by this word.', 'Nocturnal']] },
    { n: 'Baby Animals', t: 'animals', c: [
      ['A baby dog.', 'Puppy|pup'],
      ['A baby cat.', 'Kitten|kitty'],
      ['A baby cow.', 'Calf'],
      ['A baby kangaroo.', 'Joey'],
      ['A baby swan.', 'Cygnet']] },
    { n: 'For the Birds', t: 'animals', c: [
      ['This bird has been a national symbol of the United States since 1782.', 'The bald eagle|bald eagle|eagle'],
      ['These black-and-white birds cannot fly, but they are excellent swimmers.', 'Penguins|penguin'],
      ['This African bird is the largest bird in the world.', 'The ostrich|ostrich'],
      ['This tiny bird can hover in place and even fly backward.', 'The hummingbird|hummingbird|hummingbirds'],
      ['A flightless bird that is a symbol of New Zealand shares its name with a fuzzy fruit.', 'The kiwi|kiwi']] },
    { n: 'Under the Sea', t: 'animals', c: [
      ['This eight-armed sea creature can squirt ink to escape.', 'The octopus|octopus'],
      ['Fish use these organs to breathe underwater.', 'Gills'],
      ['Despite its name, this star-shaped sea animal is not a fish.', 'The starfish|starfish|sea star'],
      ['It is the largest fish in the sea, even though it eats tiny plankton.', 'The whale shark|whale shark'],
      ['This coral reef off the coast of Australia is the largest in the world.', 'The Great Barrier Reef|great barrier reef']] },
    { n: 'Food & Drink', t: 'food', c: [
      ['Guacamole is made mostly from this green fruit.', 'Avocado|avocados'],
      ['This Italian dish is a round, flat bread baked with tomato sauce and cheese on top.', 'Pizza'],
      ['Sushi is a famous dish from this country.', 'Japan'],
      ['Chocolate is made from the beans of this tropical tree.', 'Cacao|cocoa|cacao tree|cocoa tree'],
      ['This golden-yellow spice gives many curries their color.', 'Turmeric']] },
    { n: 'Fruits & Vegetables', t: 'food', c: [
      ['Monkeys are famous for loving this long yellow fruit.', 'Banana|bananas'],
      ['This orange root vegetable is a favorite snack of rabbits in cartoons.', 'Carrot|carrots'],
      ['Most pickles are made from these.', 'Cucumbers|cucumber'],
      ['Raisins are dried versions of this fruit.', 'Grapes|grape'],
      ['Prunes are dried versions of this fruit.', 'Plums|plum']] },
    { n: 'World Kitchen', t: 'food', c: [
      ['Tacos and tamales are traditional foods of this country.', 'Mexico'],
      ['Spaghetti, lasagna and gelato come from this country.', 'Italy'],
      ['Paella, a rice dish often made with seafood, comes from this country.', 'Spain'],
      ['Haggis is a traditional dish of this country in the United Kingdom.', 'Scotland'],
      ['Kimchi, a spicy fermented cabbage dish, is a staple food of this country.', 'Korea|south korea']] },
    { n: 'Words & Spelling', t: 'words', c: [
      ['It is the opposite of hot.', 'Cold'],
      ['It is the only vowel in the word "strength."', 'E|the letter e'],
      ['A word that reads the same forward and backward, like "racecar," is called this.', 'Palindrome|a palindrome'],
      ['Words that sound alike but have different meanings, like "pair" and "pear," are called these.', 'Homophones|homophone|homonyms|homonym'],
      ['"Scuba" and "radar" are examples of this kind of word, made from the first letters of other words.', 'Acronym|acronyms']] },
    { n: 'Rhyme Time', t: 'words', c: [
      ['A chubby kitty.', 'Fat cat'],
      ['A large hog.', 'Big pig'],
      ['An unhappy father.', 'Sad dad'],
      ['A home for a small rodent.', 'Mouse house'],
      ['A timid insect that buzzes around your kitchen.', 'Shy fly']] },
    { n: 'Opposites', t: 'words', c: [
      ['The opposite of up.', 'Down'],
      ['The opposite of shallow.', 'Deep'],
      ['The opposite of ancient.', 'Modern|new'],
      ['The opposite of victory.', 'Defeat|loss'],
      ['The opposite of synonym.', 'Antonym']] },
    { n: 'Space', t: 'space', c: [
      ['It is the star at the center of our solar system.', 'The Sun|sun'],
      ['This planet is known as the Red Planet.', 'Mars'],
      ['This planet is famous for its bright, wide rings.', 'Saturn'],
      ['It is the largest planet in our solar system.', 'Jupiter'],
      ['Our home galaxy is named for the pale band of light it makes across the night sky.', 'The Milky Way|milky way']] },
    { n: 'The Planets', t: 'space', c: [
      ['We live on this planet, third from the Sun.', 'Earth'],
      ['This is the planet closest to the Sun.', 'Mercury'],
      ['This second planet from the Sun is the hottest planet, wrapped in thick clouds.', 'Venus'],
      ['This planet is tipped so far over that it spins on its side.', 'Uranus'],
      ['In 1989 the Voyager 2 spacecraft flew past this blue planet, eighth from the Sun.', 'Neptune']] },
    { n: 'Sports Rules', t: 'sports', c: [
      ['In baseball, a batter is out after this many strikes.', '3|three'],
      ['In bowling, knocking down all ten pins with your first ball is called this.', 'A strike|strike'],
      ['A soccer team has this many players on the field, including the goalkeeper.', '11|eleven'],
      ['In golf, scoring one stroke under par on a hole is called this.', 'A birdie|birdie'],
      ['In tennis, this word means a score of zero.', 'Love']] },
    { n: 'Ball Games', t: 'sports', c: [
      ['In this sport, players score touchdowns and field goals.', 'Football|american football'],
      ['You need clubs, tees and a lot of patience to play this sport.', 'Golf'],
      ['James Naismith invented this sport in 1891 using peach baskets as goals.', 'Basketball'],
      ['Players hit a feathered shuttlecock over a net in this racket sport.', 'Badminton'],
      ['In cricket, the bowler aims at this set of three stumps topped with two bails.', 'The wicket|wicket|stumps']] },
    { n: 'Inventions', t: 'invent', c: [
      ['Alexander Graham Bell received a patent for this talking device in 1876.', 'The telephone|telephone|phone'],
      ['Thomas Edison is famous for creating a practical, long-lasting version of this glowing invention.', 'The light bulb|light bulb|lightbulb|electric light'],
      ['The Wright brothers first flew their airplane in 1903 near this North Carolina town.', 'Kitty Hawk|kill devil hills'],
      ['Johannes Gutenberg\'s version of this machine, built in the 1400s, changed how books were made.', 'The printing press|printing press|press'],
      ['Samuel Morse helped develop this machine that sent messages over wires in dots and dashes.', 'The telegraph|telegraph']] },
    { n: 'Inventors', t: 'invent', c: [
      ['Orville and Wilbur Wright built the first successful powered one of these.', 'Airplane|plane|aeroplane|aircraft'],
      ['Benjamin Franklin famously flew one of these in a storm to study lightning.', 'A kite|kite'],
      ['Henry Ford\'s Model T was a famous one of these.', 'Car|automobile|motor car'],
      ['Louis Braille invented a way of reading with raised dots for people who are this.', 'Blind|visually impaired'],
      ['This Scottish scientist discovered penicillin in 1928.', 'Alexander Fleming|fleming']] },
    { n: 'Computers', t: 'computers', c: [
      ['You roll this small handheld device around your desk and click its buttons.', 'The mouse|mouse'],
      ['In CPU, the P stands for this word.', 'Processing'],
      ['In RAM, the M stands for this word.', 'Memory'],
      ['This number system that computers use has only two digits, 0 and 1.', 'Binary'],
      ['Eight bits make up one of these.', 'Byte']] },
    { n: 'Computer Words', t: 'computers', c: [
      ['A mistake in a computer program is named after this kind of creepy-crawly.', 'A bug|bug|insect'],
      ['A computer program that copies itself and spreads to other computers is named after this kind of germ.', 'A virus|virus'],
      ['A high-density 3.5-inch one of these holds 1.44 megabytes.', 'Floppy disk|floppy|diskette|disk|floppy disc'],
      ['This device lets computers talk over telephone lines, and it screeches when it connects.', 'Modem'],
      ['Traditionally a kilobyte is this many bytes, which is 2 to the 10th power.', '1024|1,024|one thousand twenty four|one thousand and twenty four']] },
    { n: 'Music Class', t: 'arts', c: [
      ['A standard one of these instruments has 88 black and white keys.', 'Piano'],
      ['A violinist plays by drawing this across the strings.', 'A bow|bow'],
      ['This brass instrument changes its notes with a long sliding tube.', 'Trombone'],
      ['A musical staff is made of this many lines.', '5|five'],
      ['A group of four musicians playing together is called this.', 'A quartet|quartet']] },
    { n: 'Myths & Legends', t: 'arts', c: [
      ['In Greek myths, this king of the gods hurled thunderbolts.', 'Zeus'],
      ['This legendary British king pulled a sword from a stone.', 'King Arthur|arthur'],
      ['In Greek myths, this winged horse flew through the sky.', 'Pegasus'],
      ['In Norse myths, this god of thunder carries a mighty hammer.', 'Thor'],
      ['In Greek myths, anyone who looked at this snake-haired woman was turned to stone.', 'Medusa']] },
    { n: 'Colors', t: 'arts', c: [
      ['Mix blue and yellow paint to get this color.', 'Green'],
      ['Mix red and white paint to get this color.', 'Pink'],
      ['Mix red and blue paint to get this color.', 'Purple|violet'],
      ['In the rainbow reminder ROY G. BIV, the I stands for this color.', 'Indigo'],
      ['This pale purple color shares its name with a sweet-smelling herb.', 'Lavender']] },
    { n: 'Storybooks', t: 'arts', c: [
      ['In the fairy tale, this girl visits the house of the Three Bears.', 'Goldilocks'],
      ['This wooden puppet\'s nose grows longer whenever he tells a lie.', 'Pinocchio'],
      ['In a Mark Twain novel, this boy tricks his friends into whitewashing a fence.', 'Tom Sawyer|tom|sawyer'],
      ['In a Lewis Carroll story, Alice follows this animal down a hole.', 'The White Rabbit|white rabbit|rabbit'],
      ['Robert Louis Stevenson wrote this pirate adventure featuring Long John Silver.', 'Treasure Island']] },
    { n: 'Numbers Game', t: 'math', c: [
      ['A hexagon has this many sides.', '6|six'],
      ['The Roman numeral X stands for this number.', '10|ten'],
      ['A leap year has this many days.', '366|three hundred sixty six|three hundred and sixty six'],
      ['The Roman numeral C stands for this number.', '100|one hundred|hundred'],
      ['A dozen dozen, or 12 times 12, is this number.', '144|one hundred forty four|gross|a gross']] },
    { n: 'Shapes & Measures', t: 'math', c: [
      ['A triangle has this many sides.', '3|three'],
      ['There are this many inches in one foot.', '12|twelve'],
      ['A stop sign has this eight-sided shape.', 'Octagon|an octagon'],
      ['The distance all the way around a circle is called this.', 'Circumference|the circumference'],
      ['There are this many feet in one mile.', '5280|5,280|five thousand two hundred eighty']] },
    { n: 'Art Class', t: 'arts', c: [
      ['Leonardo da Vinci painted this famous portrait of a softly smiling woman.', 'The Mona Lisa|mona lisa'],
      ['A painter mixes colors on this flat board.', 'A palette|palette'],
      ['Michelangelo painted the ceiling of this chapel in Vatican City.', 'The Sistine Chapel|sistine chapel|sistine'],
      ['Vincent van Gogh painted this swirling picture of a nighttime sky.', 'The Starry Night|starry night'],
      ['A painting of fruit, flowers or objects arranged on a table is called this.', 'A still life|still life']] },
    { n: 'Tools of the Trade', t: 'science', c: [
      ['A carpenter drives nails with this tool.', 'A hammer|hammer'],
      ['A hiker finds north using this tool with a magnetic needle.', 'A compass|compass'],
      ['A scientist looks at tiny cells with this instrument.', 'A microscope|microscope'],
      ['A doctor listens to your heartbeat with this instrument.', 'A stethoscope|stethoscope'],
      ['A builder uses this tool, which has a bubble in a tube, to check if a shelf is flat.', 'A level|level|spirit level|bubble level']] },
    /* ---- year-gated categories ---- */
    { n: 'Information Highway', t: 'computers', e: '1995', c: [
      ['In WWW, the last W stands for this word.', 'Web'],
      ['In HTML, the HT stands for this word.', 'Hypertext|hyper text'],
      ['In an e-mail address, the @ symbol is read as this little word.', 'At'],
      ['The World Wide Web was invented at this European physics laboratory near Geneva.', 'CERN'],
      ['In a web address, the P in "http" stands for this word.', 'Protocol']] },
    { n: 'Y2K', t: 'computers', e: '2000', c: [
      ['In Y2K, the Y stands for this word.', 'Year'],
      ['In Y2K, the K stands for this metric prefix meaning one thousand.', 'Kilo|thousand'],
      ['The "Y2K bug" worried people because old computers might read the year 2000 as this year.', '1900|nineteen hundred'],
      ['In 1999, many European countries launched this shared currency.', 'The euro|euro'],
      ['A web address ending in ".com" is usually this kind of site, which is what "com" is short for.', 'Commercial|commerce|company']] }
  ];

  /* Last Call clues: [category, clue, answers] */
  const AM_FINALS = [
    ['Geography', 'It is the only continent that is also a single country.', 'Australia'],
    ['Science', 'It is the hardest natural substance on Earth.', 'Diamond|diamonds'],
    ['U.S. History', 'The first ten amendments to the U.S. Constitution are known by this name.', 'The Bill of Rights|bill of rights'],
    ['Space', 'In 1961, Yuri Gagarin of this country became the first person to travel into space.', 'The Soviet Union|soviet union|ussr|russia|the ussr'],
    ['Animals', 'It is the only mammal that can truly fly.', 'The bat|bat|bats'],
    ['World History', 'This queen of ancient Egypt was an ally of both Julius Caesar and Mark Antony.', 'Cleopatra'],
    ['Words', 'It is the letter used most often in written English.', 'E|the letter e'],
    ['Science', 'Isaac Newton described three famous laws of this.', 'Motion|laws of motion'],
    ['Geography', 'The Strait of Gibraltar separates Spain from this African country.', 'Morocco'],
    ['Food', 'It comes from the dried threads of a crocus flower and is the most expensive spice by weight.', 'Saffron']
  ];

  function amNorm(s) {
    s = String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    s = s.replace(/&/g, ' and ').replace(/(\d),(\d)/g, '$1$2').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
    s = s.replace(/^(what|who|where|when|which) (s|is|are|was|were) /, '').replace(/^(whats|whos|wheres|whatre) /, '');
    s = s.replace(/^(what|who|where) /, '');
    s = s.replace(/^(a|an|the) /, '');
    s = s.replace(/\bmt\b/g, 'mount').replace(/\bst\b/g, 'saint');
    return s.trim();
  }
  function amMatch(input, ans) {
    const n = amNorm(input); if (!n) return false;
    const n0 = n.replace(/ /g, '');
    return ans.split('|').some(a => {
      const t = amNorm(a); if (!t) return false;
      const t0 = t.replace(/ /g, '');
      if (n0 === t0 || (t0.length >= 5 && (n0 === t0 + 's' || n0 + 's' === t0 || n0 === t0 + 'es'))) return true;
      if (/\d/.test(t0) || /\d/.test(n0)) return false;
      const tol = t0.length < 5 ? 0 : t0.length < 12 ? 1 : t0.length < 18 ? 2 : 3;
      return tol > 0 && n0[0] === t0[0] && lev(n0, t0) <= tol;
    });
  }
  const amShow = ans => ans.split('|')[0];

  const AM_AI = [
    { name: 'Walt', bio: 'Retired mail carrier. Has delivered to every town in the atlas.', base: 0.7, favs: ['geo', 'ushist'], speed: 0.95, lines: { right: ['Special delivery!', 'Signed, sealed, delivered.'], wrong: ['Return to sender, I guess.', 'Oh, darn.'] } },
    { name: 'June', bio: 'Three-time county crossword champion.', base: 0.72, favs: ['words', 'arts'], speed: 0.85, lines: { right: ['Seven letters, easy!', 'Lovely.'], wrong: ['Oh, fiddle.', 'That\'s embarrassing.'] } },
    { name: 'Rico', bio: 'High school science teacher who never misses the science fair.', base: 0.68, favs: ['science', 'space', 'computers'], speed: 0.78, lines: { right: ['Science!', 'Tell my students!'], wrong: ['My hypothesis was wrong.', 'Back to the lab.'] } },
    { name: 'Bev', bio: 'Captain of the trivia team at the bowling alley.', base: 0.66, favs: ['food', 'sports', 'animals'], speed: 0.72, lines: { right: ['Strike!', 'That\'s how we do it at league night!'], wrong: ['Gutter ball.', 'Shoot!'] } },
    { name: 'Otis', bio: 'Museum tour guide with a story for every exhibit.', base: 0.7, favs: ['worldhist', 'arts', 'invent'], speed: 0.9, lines: { right: ['As any museum-goer knows!', 'Marvelous.'], wrong: ['Hmm, that exhibit must be closed.', 'Oh my.'] } }
  ];

  const AM_CSS = `
    .am{position:absolute;inset:0;display:flex;flex-direction:column;background:#12061e;background-image:radial-gradient(ellipse at 50% 110%,#3a1a10 0,#12061e 65%);color:#fff;font:12px var(--ui);overflow:hidden;user-select:none;-webkit-user-select:none}
    .am .btn{color:#000}.am .btn:disabled{color:#808080;text-shadow:1px 1px #fff}
    .am-lt{display:flex;justify-content:space-between;padding:3px 6px;flex:none;background:#2a0812;border-bottom:2px solid #000}
    .am-lt i{width:6px;height:6px;background:#ff9a2a;animation:am-blink 1s steps(1) infinite}
    .am.party .am-lt i{animation-duration:.25s}
    @keyframes am-blink{0%{opacity:1;box-shadow:0 0 5px #ff9a2a}50%{opacity:.2;box-shadow:none}}
    .am-stage{flex:1;min-height:0;position:relative;margin:5px 6px 0;border:3px solid;border-color:#e0b050 #7a5010 #7a5010 #e0b050;background:#000}
    .am-board{position:absolute;inset:0;display:grid;grid-template-columns:repeat(6,1fr);grid-template-rows:minmax(30px,auto) repeat(5,1fr);gap:2px;padding:2px;background:#000}
    .am-h{background:#3a0616;color:#fff;font:bold 10px/1.1 var(--ui);text-transform:uppercase;display:flex;align-items:center;justify-content:center;text-align:center;padding:2px;border-bottom:2px solid #ffb830;overflow:hidden;word-break:break-word}
    .am-c{background:#700c2a;background-image:linear-gradient(#8a1436,#5a0820);border:1px solid;border-color:#b0305a #300010 #300010 #b0305a;color:#ffc93a;font:clamp(16px,4.2vw,26px)/1 var(--dos);display:flex;align-items:center;justify-content:center;cursor:pointer;text-shadow:2px 2px #000;min-width:0;padding:0}
    .am-c.used{background:#1e0410;border-color:#1e0410;cursor:default;color:transparent;text-shadow:none}
    .am-c.sel{outline:2px solid #fff;outline-offset:-3px}
    .am-c.hot{animation:am-hot .15s 6 alternate}
    @keyframes am-hot{to{background:#ffc93a;color:#700c2a}}
    .am-card{position:absolute;inset:0;display:none;flex-direction:column;background:#5a0820;background-image:radial-gradient(ellipse at 50% 40%,#8a1a3a 0,#4a0618 80%);border:3px solid #2a0010;transform-origin:0 0;z-index:2;padding:8px 10px}
    .am-card.open{display:flex}
    .am-card.live{border-color:#fff;box-shadow:inset 0 0 0 3px #fff,inset 0 0 20px #fff}
    .am-ch{font:bold 11px var(--ui);color:#ffc93a;text-transform:uppercase;text-align:center;letter-spacing:1px}
    .am-q{flex:1;display:flex;align-items:center;justify-content:center;text-align:center;font:bold clamp(15px,3.6vw,24px)/1.25 Arial,Helvetica,sans-serif;color:#fff;text-shadow:2px 2px 0 #000;text-transform:uppercase;overflow:auto;padding:4px}
    .am-q.big{font:clamp(30px,9vw,54px)/1 var(--dos);color:#ffc93a;text-shadow:3px 3px #000,0 0 18px #f80}
    .am-tb{height:8px;background:#200;border:1px solid #000;flex:none;margin-top:4px;overflow:hidden}
    .am-tb div{height:100%;background:linear-gradient(90deg,#f33,#fd3 40%,#3f6);transform-origin:left;transform:scaleX(0)}
    .am-ans{min-height:1.3em;text-align:center;font:bold 15px/1.2 var(--ui);color:#ffc93a;margin-top:4px}
    .am-ans .ok{color:#6f6}.am-ans .no{color:#f77}
    .am-in{display:none;gap:4px;margin-top:4px}
    .am-in.on{display:flex}
    .am-in input{flex:1;min-width:0;font:16px var(--dos);padding:3px 4px}
    .am-in .btn{min-width:0;padding:4px 10px}
    .am-pods{flex:none;display:flex;gap:6px;padding:6px 6px 0}
    .am-pod{flex:1;min-width:0;background:linear-gradient(#5a4a6a,#231a2c);border:2px solid #8a7a9a;text-align:center;padding:2px 3px 3px;position:relative}
    .am-pod .am-lamp{height:5px;margin:0 -3px 2px;background:#333}
    .am-pod.buzz .am-lamp{background:#fff;box-shadow:0 0 10px #fff}
    .am-pod.ctl{border-color:#ffc93a}
    .am-pod.out{opacity:.55}
    .am-pod b{display:block;font:bold 11px var(--ui);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#f0e0ff}
    .am-pod .am-sc{display:block;background:#000;color:#6cf;font:21px/1 var(--dos);padding:1px 0;border:1px inset #555;text-shadow:0 0 4px #39f}
    .am-pod .am-sc.neg{color:#f55;text-shadow:0 0 4px #f00}
    .am-ctl{flex:none;display:flex;gap:6px;padding:5px 6px 6px;align-items:stretch}
    .am-msg{flex:1;min-width:0;background:#000;color:#fc6;font:16px/1.05 var(--dos);padding:3px 6px;min-height:2.3em;overflow:hidden}
    .am .am-buzz{min-width:92px;font:bold 15px var(--ui);color:#900}
    .am .am-buzz.go{color:#060;background:#cfe8cf}
    .am-ov{position:absolute;inset:0;background:rgba(18,4,20,.9);display:none;align-items:center;justify-content:center;z-index:6;padding:10px;overflow:auto}
    .am-ov.open{display:flex}
    .am-pan{background:var(--gray,#c0c0c0);color:#000;max-width:450px;width:100%;padding:12px;max-height:100%;overflow:auto}
    .am-pan h2{margin:0 0 8px;font:bold 16px var(--ui)}
    .am-pan p,.am-pan li{margin:0 0 6px;line-height:1.35}
    .am-pan ul{padding-left:18px;margin:0 0 6px}
    .am-pan .am-bt{display:flex;gap:6px;justify-content:center;flex-wrap:wrap;margin-top:10px}
    .am-pan table{border-collapse:collapse;width:100%;margin:6px 0}
    .am-pan td{padding:2px 4px;border-bottom:1px solid #999}.am-pan td+td{text-align:right}
    .am-pan input[type=text]{font:16px var(--dos);width:100%;box-sizing:border-box;padding:3px 4px;margin:4px 0}
    .am-title{text-align:center;max-width:430px;width:100%}
    .am-logo{color:#ffc93a;font:clamp(36px,11vw,62px)/.9 var(--dos);text-shadow:3px 3px 0 #a0102a,6px 6px 0 #000;margin:4px 0}
    .am-logo em{display:block;font-style:normal;font-size:.36em;color:#fff;letter-spacing:3px;text-shadow:2px 2px #000}
    .am-qm{display:flex;justify-content:center;gap:14px;font:34px var(--dos);color:#fff}
    .am-qm span{animation:am-bob 1.2s ease-in-out infinite alternate;text-shadow:0 0 8px #f80}
    .am-qm span:nth-child(2){animation-delay:.3s;color:#ffc93a}.am-qm span:nth-child(3){animation-delay:.6s}
    @keyframes am-bob{to{transform:translateY(-8px)}}
    .am-opt{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}
    .am.nar .am-h{font-size:8px;letter-spacing:0}
    .am.nar .am-pod .am-sc{font-size:18px}
    .am.nar .am-msg{font-size:14px}
    .am.nar .am-buzz{min-width:76px}
  `;

  function openAnswer(W, api) {
    let sound = api.load('sound', true), diff = api.load('diff', 'normal'), quick = api.load('quick', false);
    const snd = soundKit(api, () => sound);
    const DIFF = { easy: { know: -0.18, speed: 1.35 }, normal: { know: 0, speed: 1 }, hard: { know: 0.08, speed: 0.78 } };
    let alive = true, gen = 0;
    const timers = new Set();
    const later = (fn, ms) => { const g = gen; const t = setTimeout(() => { timers.delete(t); if (alive && g === gen) fn(); }, ms); timers.add(t); return t; };
    const cancel = t => { clearTimeout(t); timers.delete(t); };
    const clearTimers = () => { timers.forEach(clearTimeout); timers.clear(); };

    W.body.innerHTML = `<div class="am">
      ${lights('am-lt', 32)}
      <div class="am-stage"><div class="am-board"></div>
        <div class="am-card"><div class="am-ch"></div><div class="am-q"></div><div class="am-ans"></div>
          <div class="am-in"><input type="text" maxlength="60" autocomplete="off" spellcheck="false" placeholder="Type your answer"><button class="btn" data-a="ok">OK</button></div>
          <div class="am-tb"><div></div></div></div></div>
      <div class="am-pods"></div>
      <div class="am-ctl"><div class="am-msg sunken" role="status"></div><button class="btn am-buzz" data-a="buzz">BUZZ!</button></div>
      <div class="am-ov"></div></div>`;
    const $ = s => W.body.querySelector(s);
    const root = $('.am'), boardEl = $('.am-board'), card = $('.am-card'), chEl = $('.am-ch'), qEl = $('.am-q'), ansEl = $('.am-ans'), inWrap = $('.am-in'), input = $('.am-in input');
    const tbar = $('.am-tb div'), podsEl = $('.am-pods'), msgEl = $('.am-msg'), buzzBtn = $('.am-buzz'), ov = $('.am-ov'), stage = $('.am-stage');

    let answerCb = null;
    const S = { phase: 'title', players: [], round: 0, board: [], control: 0, clue: null, attempted: new Set(), lockUntil: 0, sel: [0, 0], aiT: [], winT: 0, final: null, cats: [] };
    const stats = () => Object.assign({ played: 0, wins: 0, best: 0, right: 0, tried: 0, lastRight: 0, lastTried: 0 }, api.load('stats', {}));
    const say = (t, who) => { msgEl.innerHTML = who ? `<span style="color:#fff">${escH(who)}:</span> ${escH(t)}` : escH(t); };

    function renderPods() {
      podsEl.innerHTML = S.players.map((p, i) => `<div class="am-pod${S.buzzer === i ? ' buzz' : ''}${S.control === i && S.phase !== 'title' && S.phase !== 'final' ? ' ctl' : ''}${S.attempted.has(i) ? ' out' : ''}"><div class="am-lamp"></div><b title="${escH(p.pers ? p.pers.bio : 'That\'s you!')}">${escH(p.name)}</b><span class="am-sc${p.score < 0 ? ' neg' : ''}">${money(p.score)}</span></div>`).join('');
    }
    function timer(ms) {
      tbar.style.transition = 'none'; tbar.style.transform = 'scaleX(1)'; void tbar.offsetWidth;
      tbar.style.transition = `transform ${ms}ms linear`; tbar.style.transform = 'scaleX(0)';
    }
    const stopTimer = () => { tbar.style.transition = 'none'; tbar.style.transform = 'scaleX(0)'; };

    /* ---------- building a game ---------- */
    function buildGame() {
      const year = api.era.year || 1990;
      const pool = AM_CATS.filter(c => !c.e || +c.e <= year);
      const recent = api.load('recentCats', []);
      const fresh = shuffle(pool.filter(c => !recent.includes(c.n))), stale = shuffle(pool.filter(c => recent.includes(c.n)));
      // era categories get a boost so they show up in their years
      const eraCats = fresh.filter(c => c.e);
      const order = eraCats.concat(fresh.filter(c => !c.e), stale);
      const picked = order.slice(0, 12);
      // avoid two categories with the same tag on one board where possible
      const r1 = [], r2 = [];
      shuffle(picked).forEach(c => { const tgt = (r1.length < 6 && !r1.some(x => x.t === c.t)) || r2.length >= 6 ? r1 : r2; if (tgt.length < 6) tgt.push(c); else (tgt === r1 ? r2 : r1).push(c); });
      S.cats = [r1, r2];
      const upd = recent.concat(picked.map(c => c.n)); while (upd.length > 26) upd.shift(); api.save('recentCats', upd);
      const rf = api.load('recentFinal', []);
      let fp = AM_FINALS.filter(f => !rf.includes(f[1])); if (!fp.length) fp = AM_FINALS;
      S.final = api.pick(fp); rf.push(S.final[1]); while (rf.length > 6) rf.shift(); api.save('recentFinal', rf);
    }
    function setupBoard(r) {
      const cats = S.cats[r], mul = r + 1;
      S.board = cats.map(c => ({ name: c.n, tag: c.t, clues: c.c.map((cl, k) => ({ q: cl[0], a: cl[1], value: (k + 1) * 200 * mul, tier: k, used: false, wager: false })) }));
      const nW = r === 0 ? 1 : 2, cols = shuffle([0, 1, 2, 3, 4, 5]).slice(0, nW);
      cols.forEach(ci => { const row = api.pick([1, 2, 2, 3, 3, 3, 4, 4]); S.board[ci].clues[row].wager = true; });
      renderBoard();
    }
    function renderBoard() {
      boardEl.innerHTML = S.board.map(c => `<div class="am-h">${escH(c.name)}</div>`).join('') +
        [0, 1, 2, 3, 4].map(ri => S.board.map((c, ci) => { const cl = c.clues[ri]; const sel = S.phase === 'pick' && S.control === 0 && S.sel[0] === ci && S.sel[1] === ri;
          return `<button class="am-c${cl.used ? ' used' : ''}${sel ? ' sel' : ''}" data-c="${ci}" data-r="${ri}"${cl.used ? ' disabled' : ''}>$${cl.value}</button>`; }).join('')).join('');
    }
    boardEl.addEventListener('click', e => {
      const b = e.target.closest('[data-c]'); if (!b || b.disabled) return;
      if (S.phase !== 'pick' || S.control !== 0) { if (S.phase === 'pick') say(`It's ${S.players[S.control].name}'s pick.`); return; }
      choose(+b.dataset.c, +b.dataset.r);
    });
    const remaining = () => S.board.reduce((n, c) => n + c.clues.filter(x => !x.used).length, 0);

    /* ---------- overlays ---------- */
    function overlay(html, btns) {
      ov.innerHTML = html; ov.classList.add('open');
      const bt = ov.querySelector('.am-bt');
      (btns || []).forEach(([lab, fn], i) => { const b = document.createElement('button'); b.className = 'btn'; b.textContent = lab; if (i === 0) b.dataset.primary = '1'; b.onclick = () => { snd.pick(); fn(); }; bt.appendChild(b); });
      const f = ov.querySelector('input[type=text]') || ov.querySelector('[data-primary]'); if (f) setTimeout(() => f.focus(), 30);
    }
    const closeOv = () => { ov.classList.remove('open'); ov.innerHTML = ''; };

    function titleScreen() {
      gen++; clearTimers(); closeCard(true); S.phase = 'title'; S.buzzer = -1; S.attempted = new Set(); root.classList.remove('party');
      const st = stats();
      overlay(`<div class="am-title"><div class="am-qm"><span>?</span><span>?</span><span>?</span></div><div class="am-logo">ANSWER<br>ME THIS!<em>THE QUIZ BOARD SHOW</em></div>
        <div class="am-pan raised"><p style="text-align:center">Pick a clue, beat the others to the buzzer, and answer right to win the cash!</p>
        <div class="am-opt">${['easy', 'normal', 'hard'].map(d => `<label><input type="radio" name="amd" value="${d}"${d === diff ? ' checked' : ''}> ${d[0].toUpperCase() + d.slice(1)}</label>`).join('')}</div>
        <div class="am-opt" style="margin-top:4px"><label><input type="checkbox" class="am-quick"${quick ? ' checked' : ''}> Quick game (one round + Last Call)</label></div>
        <p style="text-align:center;margin-top:6px">Best total: <b>${money(st.best)}</b> &nbsp; Wins: <b>${st.wins}</b> of ${st.played}</p><div class="am-bt"></div></div></div>`,
      [['Play!', newGame], ['How to Play', () => howTo(titleScreen)], ['Statistics', () => showStats(titleScreen)]]);
      ov.querySelectorAll('input[name=amd]').forEach(r => r.onchange = () => { diff = r.value; api.save('diff', diff); });
      ov.querySelector('.am-quick').onchange = e => { quick = e.target.checked; api.save('quick', quick); };
      say('Welcome to ANSWER ME THIS!');
    }
    function howTo(back) {
      overlay(`<div class="am-pan raised"><h2>How to Play Answer Me This!</h2><ul>
        <li>The board has <b>6 categories</b> with 5 clues each. Bigger values are harder. Round Two doubles the values.</li>
        <li>Whoever has control picks a clue. After the clue is read, the buzzers light up: be first to <b>BUZZ</b> (press Space, click the Buzz button or tap the clue). Buzz too early and you are locked out for a moment!</li>
        <li>Type your answer and press Enter. Just the answer is fine: "Paris" or "What is Paris?" both work. Small spelling slips are forgiven.</li>
        <li>A right answer adds the value and gives you control of the board. A wrong answer <b>subtracts</b> the value, and the others get a chance.</li>
        <li><b>Wager Squares</b> are hidden on the board (one in Round One, two in Round Two). Find one and you alone answer, for a wager of your choice.</li>
        <li><b>Last Call:</b> everyone with money bets any part of it on a single final clue. Highest total wins!</li>
        <li>Win the game to earn play money: $1 for every $2,000, up to $10.</li>
        <li>Keyboard: arrow keys and Enter pick clues, Space buzzes.</li></ul><div class="am-bt"></div></div>`, [['OK', back]]);
    }
    function showStats(back) {
      const s = stats();
      overlay(`<div class="am-pan raised"><h2>Statistics</h2><table>
        <tr><td>Games played</td><td>${s.played}</td></tr><tr><td>Games won</td><td>${s.wins}</td></tr>
        <tr><td>Best final total</td><td>${money(s.best)}</td></tr>
        <tr><td>Correct answers</td><td>${s.right} of ${s.tried}${s.tried ? ' (' + Math.round(100 * s.right / s.tried) + '%)' : ''}</td></tr>
        <tr><td>Last Call correct</td><td>${s.lastRight} of ${s.lastTried}</td></tr></table><div class="am-bt"></div></div>`,
      [['OK', back], ['Reset', async () => { const r = await api.msgBox('Answer Me This!', 'Reset all statistics?', ['Yes', 'No'], 'warn'); if (r === 'Yes') api.save('stats', {}); showStats(back); }]]);
    }
    function bumpStat(k, n = 1) { const s = stats(); s[k] += n; api.save('stats', s); }

    /* ---------- game flow ---------- */
    function newGame() {
      gen++; clearTimers(); closeOv(); closeCard(true); root.classList.remove('party');
      const ai = shuffle(AM_AI).slice(0, 2), me = String(api.user || 'You').slice(0, 12) || 'You';
      S.players = [{ name: me, human: true, score: 0 }].concat(ai.map(p => ({ name: p.name, pers: p, human: false, score: 0 })));
      S.attempted = new Set(); S.buzzer = -1; S.control = 0;
      buildGame();
      overlay(`<div class="am-pan raised"><h2>Tonight's contestants</h2><p><b>${escH(me)}</b> - that's you!</p>${ai.map(p => `<p><b>${escH(p.name)}</b> - ${escH(p.bio)}</p>`).join('')}<div class="am-bt"></div></div>`,
        [['Let\'s play!', () => { closeOv(); snd.applause(1.5); startRound(0); }]]);
      snd.jingle(); renderPods();
    }
    function startRound(r) {
      S.round = r; setupBoard(r);
      if (r === 1) { let lo = 0; S.players.forEach((p, i) => { if (p.score < S.players[lo].score) lo = i; }); S.control = lo; }
      S.phase = 'intro'; renderPods();
      overlay(`<div class="am-pan raised" style="text-align:center"><h2>${r ? 'ROUND TWO: Double Values!' : 'ROUND ONE'}</h2><p>${S.board.map(c => escH(c.name)).join(' &bull; ')}</p><div class="am-bt"></div></div>`, [['Start', () => { closeOv(); nextPick(); }]]);
      snd.sting(); say(r ? 'Round Two! Values are doubled and there are TWO Wager Squares.' : 'Round One! Categories are on the board.');
    }
    function nextPick() {
      closeCard(); S.attempted = new Set(); S.buzzer = -1; S.clue = null;
      if (!remaining()) { endRound(); return; }
      S.phase = 'pick'; renderPods();
      const c = S.players[S.control];
      if (c.human) {
        if (S.board[S.sel[0]].clues[S.sel[1]].used) { const f = firstFree(); if (f) S.sel = f; }
        say(`${c.name}, you have control. Pick a clue!`); renderBoard();
      } else {
        renderBoard(); say(`${c.name} is choosing...`);
        later(aiPick, 1300 * DIFF[diff].speed);
      }
    }
    function firstFree() { for (let r = 0; r < 5; r++) for (let c = 0; c < 6; c++) if (!S.board[c].clues[r].used) return [c, r]; return null; }
    function aiPick() {
      const open = S.board.map((c, ci) => ({ ci, rows: c.clues.map((x, ri) => x.used ? -1 : ri).filter(ri => ri >= 0) })).filter(x => x.rows.length);
      const col = api.pick(open), ri = Math.random() < 0.65 ? col.rows[0] : api.pick(col.rows);
      say(`"${S.board[col.ci].name} for $${S.board[col.ci].clues[ri].value}."`, S.players[S.control].name);
      later(() => choose(col.ci, ri), 900);
    }
    function cellEl(ci, ri) { return boardEl.querySelector(`[data-c="${ci}"][data-r="${ri}"]`); }
    function choose(ci, ri) {
      if (S.phase !== 'pick') return;
      const cl = S.board[ci].clues[ri]; if (cl.used) return;
      S.phase = 'zoom'; cl.used = true; S.clue = { ...cl, cat: S.board[ci].name, tag: S.board[ci].tag, ci, ri }; S.sel = [ci, ri];
      snd.pick();
      const el = cellEl(ci, ri); el.classList.add('hot');
      later(() => { openCard(el); if (cl.wager) wagerSquare(); else readClue(); renderBoard(); }, 600);
    }
    function openCard(fromEl) {
      const sr = stage.getBoundingClientRect(), r = fromEl.getBoundingClientRect();
      chEl.textContent = `${S.clue.cat} - $${S.clue.value}`; qEl.textContent = ''; qEl.classList.remove('big'); ansEl.innerHTML = ''; inWrap.classList.remove('on'); stopTimer();
      card.classList.remove('live'); card.classList.add('open');
      const sx = r.width / sr.width, sy = r.height / sr.height, x = r.left - sr.left, y = r.top - sr.top;
      card.style.transition = 'none'; card.style.transform = `translate(${x}px,${y}px) scale(${sx},${sy})`; void card.offsetWidth;
      card.style.transition = 'transform .45s ease-out'; card.style.transform = 'none';
      snd.whoosh();
    }
    function closeCard() { answerCb = null; card.classList.remove('open', 'live'); card.style.transform = ''; inWrap.classList.remove('on'); input.blur(); stopTimer(); buzzBtn.classList.remove('go'); }

    /* ---------- regular clue: read, buzz, answer ---------- */
    function knowP(p, cl) {
      const pers = p.pers; let k = pers.base - cl.tier * 0.07 - (S.round ? 0.04 : 0) + DIFF[diff].know;
      if (pers.favs.includes(cl.tag)) k += 0.15;
      return Math.max(0.08, Math.min(0.95, k));
    }
    function readClue() {
      S.phase = 'reading'; qEl.textContent = S.clue.q; S.buzzer = -1; S.earlyLock = 0; renderPods();
      S.clue.know = S.players.map(p => !p.human && Math.random() < knowP(p, S.clue));
      const ms = Math.min(6500, 1100 + S.clue.q.length * 42);
      say('Listen to the clue... wait for the lights!'); buzzBtn.classList.remove('go');
      later(() => openBuzz(5000, true), ms + 450);
    }
    function openBuzz(ms, first) {
      S.phase = 'open'; card.classList.add('live'); buzzBtn.classList.add('go'); timer(ms);
      say(first ? 'Buzzers are live!' : 'Anyone else? Buzzers are live!');
      snd.tock();
      S.aiT.forEach(cancel); S.aiT = [];
      S.players.forEach((p, i) => {
        if (p.human || S.attempted.has(i)) return;
        const bluff = first && !S.clue.know[i] && Math.random() < 0.07;
        if (!S.clue.know[i] && !bluff) return;
        const d = p.pers.speed * DIFF[diff].speed * rnd(0.35, 1.35) * 1000 + (first ? 0 : 250);
        if (d < ms - 100) S.aiT.push(later(() => buzzIn(i), d));
      });
      cancel(S.winT); S.winT = later(noAnswer, ms);
    }
    function humanBuzz() {
      if (!S.players[0] || S.attempted.has(0)) return;
      const now = performance.now();
      if (S.phase === 'reading') {
        if (now < S.earlyLock) return;
        S.earlyLock = now + 700; snd.flop(); say('Too early! You are locked out for a moment.'); return;
      }
      if (S.phase !== 'open') return;
      if (now < S.earlyLock) { say('Still locked out...'); return; }
      buzzIn(0);
    }
    function buzzIn(i) {
      if (S.phase !== 'open' || S.attempted.has(i)) return;
      S.phase = 'answering'; S.aiT.forEach(cancel); S.aiT = []; cancel(S.winT);
      S.buzzer = i; card.classList.remove('live'); buzzBtn.classList.remove('go'); snd.buzzIn(); renderPods();
      const p = S.players[i];
      if (p.human) askHuman(9000, 'Your answer?', t => judge(0, t, S.clue.value));
      else aiAnswer(i, S.clue.know[i], t => judge(i, t, S.clue.value));
    }

    function askHuman(ms, prompt, cb) {
      say(prompt); inWrap.classList.add('on'); input.value = ''; timer(ms);
      answerCb = cb; setTimeout(() => input.focus(), 20);
      S.ansT = later(() => submitHuman(true), ms);
    }
    function submitHuman(timeout) {
      if (!answerCb) return;
      const cb = answerCb; answerCb = null; cancel(S.ansT);
      inWrap.classList.remove('on'); input.blur(); stopTimer();
      cb(timeout && !input.value.trim() ? '' : input.value);
    }
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); submitHuman(false); } });
    card.querySelector('[data-a="ok"]').addEventListener('click', () => submitHuman(false));
    function wrongFor(cl) {
      const cat = S.board.find(c => c.name === cl.cat);
      const others = cat ? cat.clues.filter(x => x.a !== cl.a).map(x => amShow(x.a)) : [];
      return others.length ? api.pick(others) : 'I\'m not sure';
    }
    function typeOut(text, done) {
      ansEl.innerHTML = ''; let k = 0;
      const step = () => { ansEl.textContent = '"' + text.slice(0, ++k) + (k < text.length ? '' : '"'); if (k < text.length) later(step, 45); else later(done, 500); };
      step();
    }
    function aiAnswer(i, knows, cb) {
      const p = S.players[i]; say(`${p.name} buzzes in!`);
      later(() => {
        const txt = knows ? amShow(S.clue.a) : wrongFor(S.clue);
        typeOut(txt, () => cb(knows ? amShow(S.clue.a) : txt));
      }, rnd(700, 1400));
    }
    function judge(i, text, value) {
      const p = S.players[i], ok = amMatch(text, S.clue.a);
      if (p.human) { bumpStat('tried'); if (ok) bumpStat('right'); }
      S.attempted.add(i);
      if (ok) {
        p.score += value; S.control = i; S.buzzer = -1; S.attempted = new Set(); renderPods();
        ansEl.innerHTML = `<span class="ok">CORRECT!</span> ${escH(amShow(S.clue.a))}`;
        snd.ding(); snd.applause(1.1, 0.7);
        say(p.human ? `Right! +${money(value)}` : `${api.pick(p.pers.lines.right)} (+${money(value)})`, p.human ? '' : p.name);
        later(nextPick, 2000); return;
      }
      p.score -= value; S.buzzer = -1; renderPods(); snd.buzzer();
      ansEl.innerHTML = `<span class="no">${text.trim() ? '"' + escH(text.trim()) + '" is wrong.' : 'No answer.'}</span>`;
      say(p.human ? `Sorry, no. -${money(value)}` : `${api.pick(p.pers.lines.wrong)} (-${money(value)})`, p.human ? '' : p.name);
      if (S.clue.wagerSq) { later(() => revealAnswer(), 1200); return; }
      const left = S.players.some((q, k) => !S.attempted.has(k));
      if (left) later(() => { ansEl.innerHTML = ''; openBuzz(4500, false); }, 1300);
      else later(revealAnswer, 1200);
    }
    function noAnswer() {
      if (S.phase !== 'open') return;
      S.phase = 'reveal'; S.aiT.forEach(cancel); S.aiT = []; card.classList.remove('live'); buzzBtn.classList.remove('go');
      snd.timeUp(); say('Time\'s up!'); revealAnswer();
    }
    function revealAnswer() {
      S.phase = 'reveal'; stopTimer();
      ansEl.innerHTML = `The answer: ${escH(amShow(S.clue.a))}`;
      later(nextPick, 2400);
    }

    /* ---------- wager square ---------- */
    function aiWager(p, max) {
      const others = S.players.filter(q => q !== p).map(q => q.score), lead = p.score - Math.max(...others);
      let w = p.score <= 0 ? max * rnd(0.3, 0.6) : lead > 3000 ? p.score * rnd(0.15, 0.3) : p.score * rnd(0.4, 0.9);
      if (Math.random() < 0.12) w = max; // the occasional "true wager"
      return Math.max(5, Math.min(max, Math.round(w / 100) * 100 || 5));
    }
    function wagerSquare() {
      S.phase = 'wager'; S.clue.wagerSq = true;
      qEl.classList.add('big'); qEl.innerHTML = 'WAGER<br>SQUARE!';
      snd.sting(); later(() => snd.applause(1.2, 0.6), 400);
      const p = S.players[S.control], max = Math.max(p.score, S.round ? 2000 : 1000);
      S.buzzer = S.control; renderPods();
      later(() => {
        if (p.human) {
          say(`Wager from $5 to ${money(max)}.`);
          askHuman(20000, `Enter your wager ($5 to ${money(max)}):`, t => {
            let w = parseInt(String(t).replace(/[^0-9]/g, ''), 10);
            if (!Number.isFinite(w)) w = 5;
            w = Math.max(5, Math.min(max, w));
            wagerClue(w);
          });
          input.placeholder = 'Wager amount';
        } else {
          const w = aiWager(p, max); say(`"I'll wager ${money(w)}."`, p.name); later(() => wagerClue(w), 1300);
        }
      }, 1500);
    }
    function wagerClue(w) {
      input.placeholder = 'Type your answer';
      S.clue.wagerAmt = w; S.phase = 'wagerRead';
      qEl.classList.remove('big'); qEl.textContent = S.clue.q; chEl.textContent = `${S.clue.cat} - Wager ${money(w)}`;
      const i = S.control, p = S.players[i];
      S.attempted = new Set(S.players.map((_, k) => k).filter(k => k !== i)); renderPods();
      const knows = !p.human && Math.random() < knowP(p, S.clue) + 0.05;
      later(() => {
        S.phase = 'answering';
        if (p.human) askHuman(12000, 'Your answer?', t => { S.attempted.delete(0); judge(0, t, w); });
        else aiAnswer(i, knows, t => { S.attempted.delete(i); judge(i, t, w); });
      }, Math.min(5000, 900 + S.clue.q.length * 38));
    }

    /* ---------- round end, Last Call ---------- */
    function endRound() {
      S.phase = 'between'; renderPods();
      if (S.round === 0 && !quick) { snd.applause(1.4); later(() => startRound(1), 900); return; }
      later(lastCall, 800);
    }
    function lastCall() {
      S.phase = 'final'; S.buzzer = -1; S.attempted = new Set(); renderPods(); closeCard();
      const [cat] = S.final;
      const elig = S.players.map((p, i) => i).filter(i => S.players[i].score > 0);
      S.fin = { cat, elig, wagers: {}, answers: {} };
      snd.sting();
      if (!elig.length) { finishGame(); return; }
      elig.forEach(i => { if (!S.players[i].human) S.fin.wagers[i] = aiFinalWager(i); });
      const me = S.players[0];
      if (elig.includes(0)) {
        overlay(`<div class="am-pan raised"><h2>LAST CALL</h2><p>The category is: <b>${escH(cat)}</b></p><p>You have ${money(me.score)}. How much will you wager? ($0 to ${money(me.score)})</p>
          <input type="text" inputmode="numeric" class="am-w" value="0"><div class="am-bt"></div></div>`,
        [['Lock it in', () => { const v = parseInt((ov.querySelector('.am-w').value || '0').replace(/[^0-9]/g, ''), 10) || 0; S.fin.wagers[0] = Math.max(0, Math.min(me.score, v)); closeOv(); finalClue(); }]]);
        const w = ov.querySelector('.am-w'); w.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); ov.querySelector('[data-primary]').click(); } }); setTimeout(() => w.select(), 40);
        say('Last Call! Make your wager.');
      } else {
        overlay(`<div class="am-pan raised"><h2>LAST CALL</h2><p>The category is: <b>${escH(cat)}</b></p><p>You finished with ${money(me.score)}, so you can't play Last Call. Let's watch!</p><div class="am-bt"></div></div>`, [['Watch', () => { closeOv(); finalClue(); }]]);
      }
    }
    function aiFinalWager(i) {
      const p = S.players[i], others = S.players.filter((q, k) => k !== i).map(q => q.score), second = Math.max(...others);
      if (p.score > second) return Math.max(0, Math.min(p.score, 2 * second - p.score + 100));
      if (p.score * 2 > second) return Math.min(p.score, second - p.score + 100 + Math.round(rnd(0, 5)) * 100);
      return p.score;
    }
    function finalClue() {
      const [cat, q, a] = S.final;
      S.clue = { q, a, cat, tag: '', value: 0, tier: 4 };
      chEl.textContent = 'LAST CALL - ' + cat; qEl.classList.remove('big'); qEl.textContent = q; ansEl.innerHTML = ''; card.classList.add('open'); card.style.transform = 'none'; snd.whoosh();
      const ms = 30000;
      S.fin.elig.forEach(i => { const p = S.players[i]; if (!p.human) { const k = Math.random() < Math.min(0.9, knowP(p, S.clue) + 0.1); S.fin.answers[i] = k ? amShow(a) : wrongFinal(); } });
      if (S.fin.elig.includes(0)) askHuman(ms, 'You have 30 seconds. Type your answer and press Enter.', t => { S.fin.answers[0] = t; finalReveal(); });
      else { timer(12000); say('The contestants are writing their answers...'); later(finalReveal, 12000); }
      if (sound) for (let k = 0; k < 30; k++) later(() => snd.tock(), k * 1000);
    }
    function wrongFinal() {
      const all = AM_FINALS.filter(f => f !== S.final).map(f => amShow(f[2]));
      return api.pick(all);
    }
    function finalReveal() {
      clearTimers(); stopTimer(); S.phase = 'finalReveal';
      const order = S.fin.elig.slice().sort((x, y) => S.players[x].score - S.players[y].score);
      let k = 0;
      const step = () => {
        if (k >= order.length) { later(() => { ansEl.innerHTML = `The answer: ${escH(amShow(S.final[2]))}`; later(finishGame, 2200); }, 400); return; }
        const i = order[k++], p = S.players[i], txt = S.fin.answers[i] || '', ok = amMatch(txt, S.final[2]), w = S.fin.wagers[i] || 0;
        S.buzzer = i; renderPods();
        say(`${p.name} wrote...`);
        later(() => {
          ansEl.innerHTML = `${escH(p.name)}: "${escH(txt.trim() || '(nothing)')}" ${ok ? '<span class="ok">RIGHT!</span>' : '<span class="no">WRONG</span>'}`;
          if (ok) snd.ding(); else snd.buzzer();
          later(() => {
            p.score += ok ? w : -w; renderPods();
            say(`${p.name} wagered ${money(w)}. New total: ${money(p.score)}.`);
            if (p.human) { bumpStat('lastTried'); if (ok) bumpStat('lastRight'); }
            later(step, 2000);
          }, 1300);
        }, 1200);
      };
      step();
    }
    function finishGame() {
      S.phase = 'over'; S.buzzer = -1; closeCard(); renderPods();
      const me = S.players[0], top = Math.max(...S.players.map(p => p.score));
      const win = me.score > 0 && me.score >= top;
      const s = stats(); s.played++; if (win) s.wins++; s.best = Math.max(s.best, me.score); api.save('stats', s);
      let earned = 0;
      if (win) { const amt = Math.min(10, Math.floor(me.score / 2000)); if (amt > 0) earned = api.earn(amt, 'winning Answer Me This!') || 0; snd.fanfare(); snd.applause(3, 1.4); root.classList.add('party'); }
      else snd.flop();
      const ranked = S.players.slice().sort((a, b) => b.score - a.score);
      const winners = ranked.filter(p => p.score === top && p.score > 0);
      overlay(`<div class="am-pan raised"><h2>${win ? 'You are the champion!' : 'Game over'}</h2>
        <p>${winners.length ? (win ? 'Congratulations!' : `${escH(winners.map(p => p.name).join(' and '))} ${winners.length > 1 ? 'tie' : 'wins'} with ${money(top)}.`) : 'Nobody finished with money tonight!'}</p>
        <table>${ranked.map(p => `<tr><td>${escH(p.name)}${p.human ? ' (you)' : ''}</td><td>${money(p.score)}</td></tr>`).join('')}</table>
        <p>Last Call answer: <b>${escH(amShow(S.final[2]))}</b></p>
        ${win ? `<p>${earned ? `You earned <b>$${earned}</b> in play money.` : me.score < 2000 ? 'Finish with $2,000 or more to earn play money.' : 'You have reached today\'s play-money limit.'}</p>` : '<p>Win the game to earn play money.</p>'}
        <div class="am-bt"></div></div>`, [['Play Again', newGame], ['Title Screen', titleScreen]]);
      say(win ? 'What a game!' : 'Better luck next time!');
    }

    /* ---------- input: buzz, keyboard, menu ---------- */
    buzzBtn.addEventListener('click', () => humanBuzz());
    card.addEventListener('pointerdown', e => { if (e.target.closest('.am-in')) return; if (S.phase === 'open' || S.phase === 'reading') humanBuzz(); });
    W.onKey = e => {
      if (e.target && e.target.tagName === 'INPUT' && e.target.type === 'text') return;
      if (ov.classList.contains('open')) {
        if (e.key === 'Enter') { const b = ov.querySelector('[data-primary]'); if (b && document.activeElement !== b && !(document.activeElement && document.activeElement.tagName === 'BUTTON')) { e.preventDefault(); b.click(); } }
        return;
      }
      if (e.key === ' ') { e.preventDefault(); humanBuzz(); return; }
      if (S.phase === 'pick' && S.control === 0) {
        const mv = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
        if (mv) { e.preventDefault(); S.sel = [(S.sel[0] + mv[0] + 6) % 6, (S.sel[1] + mv[1] + 5) % 5]; renderBoard(); snd.tock(); }
        else if (e.key === 'Enter') { e.preventDefault(); choose(S.sel[0], S.sel[1]); }
      }
    };
    api.menubar([
      { label: 'Game', items: () => [{ label: 'New Game', fn: newGame }, { label: 'Title Screen', fn: titleScreen }, '-',
        { label: 'How to Play', fn: () => { if (S.phase === 'title') howTo(titleScreen); else if (!ov.classList.contains('open')) howTo(closeOv); } },
        { label: 'Statistics', fn: () => { if (S.phase === 'title') showStats(titleScreen); else if (!ov.classList.contains('open')) showStats(closeOv); } }, '-', { label: 'Exit', fn: () => api.close() }] },
      { label: 'Options', items: () => [
        ...['easy', 'normal', 'hard'].map(d => ({ label: (d === diff ? '• ' : '   ') + d[0].toUpperCase() + d.slice(1) + ' opponents', fn: () => { diff = d; api.save('diff', d); } })), '-',
        { label: (quick ? '• ' : '   ') + 'Quick game (next game)', fn: () => { quick = !quick; api.save('quick', quick); } },
        { label: (sound ? '• ' : '   ') + 'Sound', fn: () => { sound = !sound; api.save('sound', sound); } }] }
    ]);
    function resize() { if (alive) root.classList.toggle('nar', W.body.clientWidth < 520); }
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    if (ro) ro.observe(W.body);
    W.onResize = resize;
    W.onClose = () => { alive = false; gen++; clearTimers(); if (ro) ro.disconnect(); };

    // demo board behind the title screen
    S.players = [{ name: String(api.user || 'You').slice(0, 12), human: true, score: 0 }, { name: '???', score: 0 }, { name: '???', score: 0 }];
    S.cats = [AM_CATS.slice(0, 6)]; setupBoard(0); renderPods(); resize();
    titleScreen();
  }

  /* ================= registration ================= */
  const icon = inner => `<svg viewBox="0 0 32 32" shape-rendering="crispEdges" aria-hidden="true">${inner}</svg>`;
  (window.RETRO_APPS = window.RETRO_APPS || []).push({
    id: 'spinsolve', label: 'Spin & Solve', kind: 'store', cat: 'game', year: 1990, price: 24.95,
    publisher: 'Marquee Lights Software', genre: 'TV Game Show', sizeKB: 2200,
    tagline: 'Spin the wheel. Call a letter. Solve the puzzle!',
    blurb: 'Step onto the brightest stage in home computing! Spin a giant prize wheel, call consonants for cash, buy vowels and race two lively computer contestants to solve over 100 word puzzles. Watch out for BANKRUPT! Win the game and try to Beat the Board in the bonus round for up to $25,000.',
    box: { bg: '#4a1a7a', fg: '#ffd23f', accent: '#d02828' },
    icon: icon('<circle cx="16" cy="17" r="13" fill="#000"/><path d="M16 17V4h3l3 1 3 3z" fill="#d02828"/><path d="M16 17l9-9 2 3 1 3z" fill="#e8b000"/><path d="M16 17l12-3v4l-1 3z" fill="#1c9c9c"/><path d="M16 17l11 4-2 4-2 2z" fill="#b83cb8"/><path d="M16 17l7 10-3 2h-4z" fill="#2ca02c"/><path d="M16 17v13h-4l-3-2z" fill="#e86a00"/><path d="M16 17l-7 11-3-3-2-3z" fill="#2d5fd8"/><path d="M16 17L4 22l-1-4v-3z" fill="#d84c8c"/><path d="M16 17L3 15l1-4 2-3z" fill="#d02828"/><path d="M16 17L6 8l3-2 3-2z" fill="#e8b000"/><path d="M16 17L12 4h4z" fill="#141414"/><rect x="13" y="14" width="6" height="6" fill="#ffd23f" stroke="#6a3a00"/><path d="M14 0h4l-2 5z" fill="#fff" stroke="#000"/>'),
    window: { w: 720, h: 600 },
    css: SS_CSS,
    open: openSpin
  }, {
    id: 'answerme', label: 'Answer Me This!', kind: 'store', cat: 'game', year: 1990, price: 24.95,
    publisher: 'Buzzword Interactive', genre: 'TV Quiz Show', sizeKB: 2600,
    tagline: 'Six categories. Thirty clues. One buzzer.',
    blurb: 'The quiz-board show comes home! Pick a clue, beat two quick-thinking computer contestants to the buzzer and type your answer. Find the hidden Wager Squares, double your values in Round Two, then bet it all on the Last Call. Over 200 clues in science, geography, history, animals, food, words, space, sports, inventions and computers.',
    box: { bg: '#5a0820', fg: '#ffc93a', accent: '#ffffff' },
    icon: icon('<rect x="2" y="4" width="28" height="20" fill="#000"/><g fill="#8a1436"><rect x="3" y="5" width="8" height="5"/><rect x="12" y="5" width="8" height="5"/><rect x="21" y="5" width="8" height="5"/><rect x="3" y="11" width="8" height="5"/><rect x="12" y="11" width="8" height="5"/><rect x="21" y="11" width="8" height="5"/><rect x="3" y="17" width="8" height="6"/><rect x="21" y="17" width="8" height="6"/></g><rect x="12" y="17" width="8" height="6" fill="#ffc93a"/><g fill="#ffc93a"><rect x="6" y="7" width="3" height="1"/><rect x="15" y="7" width="3" height="1"/><rect x="24" y="7" width="3" height="1"/><rect x="6" y="13" width="3" height="1"/><rect x="15" y="13" width="3" height="1"/><rect x="24" y="13" width="3" height="1"/></g><rect x="15" y="18" width="2" height="1" fill="#700c2a"/><rect x="17" y="19" width="1" height="1" fill="#700c2a"/><rect x="16" y="20" width="1" height="1" fill="#700c2a"/><rect x="16" y="22" width="1" height="1" fill="#700c2a"/><rect x="12" y="25" width="8" height="2" fill="#888"/><rect x="9" y="27" width="14" height="3" fill="#c0c0c0" stroke="#000"/><rect x="14" y="26" width="4" height="2" fill="#f00"/>'),
    window: { w: 720, h: 600 },
    css: AM_CSS,
    open: openAnswer
  });
})();
