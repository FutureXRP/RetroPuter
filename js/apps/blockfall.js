/* Crystal Cascade: a store puzzle game (1990). A column of three crystals falls into a six-wide well.
   Slide it, shuffle the order of its crystals and drop it. Three or more of a color in a row (across, up and down
   or on a slant) vanish, and the crystals above tumble down to make chains. Modes: Classic, Timed (3 minutes)
   and Puzzle (20 handmade wells to clear with a fixed set of crystals). */
(function () {
  'use strict';
  const COLS = 6, ROWS = 13, CELL = 32, MAGIC = 6;
  const LW = 340, LH = 462, WX = 10, WY = 36;          // logical canvas size and well origin
  const PX = WX + COLS * CELL + 14;                      // side panel x
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const FONT = (n) => `${n}px VT323, "Courier New", monospace`;
  // EGA-style gem colors: [light, base, dark, deep outline]
  const GEMS = [
    ['Ruby', '#ffaaaa', '#ff5555', '#aa0000', '#400000'],
    ['Topaz', '#ffffaa', '#ffff55', '#aa5500', '#402000'],
    ['Emerald', '#aaffaa', '#55ff55', '#00aa00', '#003000'],
    ['Sapphire', '#aaaaff', '#5555ff', '#0000aa', '#000040'],
    ['Amethyst', '#ffaaff', '#ff55ff', '#aa00aa', '#400040'],
    ['Aquamarine', '#aaffff', '#55ffff', '#00aaaa', '#003838']
  ];
  const LETTER = 'RYGBPC';
  // Each color has its own cut, so the game works for color-blind players too. 14x14 pixel masks.
  const MASKS = [
    (dx, dy) => dx * dx + dy * dy <= 46,                                            // round brilliant
    (dx, dy) => Math.abs(dx) + Math.abs(dy) <= 7.1,                                  // diamond
    (dx, dy) => Math.abs(dx) <= 6.6 && Math.abs(dy) <= 6.6 && Math.abs(dx) + Math.abs(dy) <= 9.6, // emerald cut
    (dx, dy) => dy >= -6.6 && Math.abs(dx) <= (dy + 6.9) * 0.52,                     // trillion (triangle)
    (dx, dy) => Math.abs(dy) <= 5.9 && Math.abs(dx) <= 7 - Math.abs(dy) * 0.55,      // hexagon
    (dx, dy) => { const ax = Math.abs(dx), ay = Math.abs(dy); if (ax > 6.6 || ay > 6.6) return false; return ax < 3.6 || ay < 3.6 || (ax - 3.6) ** 2 + (ay - 3.6) ** 2 <= 9.5; }, // cushion
    (dx, dy) => { const ax = Math.abs(dx), ay = Math.abs(dy); return ax * ax + ay * ay <= 49 && (ax <= 1.6 || ay <= 1.6 || ax + ay <= 5.2); } // magic star
  ];
  let SPR = null;
  function makeSprite(mask, tones, white) {
    const c = document.createElement('canvas'); c.width = 14; c.height = 14;
    const g = c.getContext('2d');
    const inside = (x, y) => x >= 0 && y >= 0 && x < 14 && y < 14 && mask(x - 6.5, y - 6.5);
    const table = (x, y) => mask((x - 6.5) / 0.5, (y - 6.5) / 0.5 + 0.8);
    for (let y = 0; y < 14; y++) for (let x = 0; x < 14; x++) {
      if (!inside(x, y)) continue;
      const dx = x - 6.5, dy = y - 6.5;
      let col;
      if (!inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1)) col = tones[3];
      else if (table(x, y)) col = dy < -0.5 ? tones[0] : tones[1];
      else col = dx + dy < -1 ? tones[0] : dx + dy > 1.5 ? tones[2] : tones[1];
      g.fillStyle = white ? '#ffffff' : col; g.fillRect(x, y, 1, 1);
    }
    if (!white) { g.fillStyle = '#ffffff'; [[4, 4], [5, 4], [4, 5], [9, 9]].forEach(([x, y]) => { if (inside(x, y) && inside(x - 1, y) && inside(x, y - 1)) g.fillRect(x, y, 1, 1); }); }
    return c;
  }
  function sprites() {
    if (SPR) return SPR;
    SPR = { gem: GEMS.map((t, i) => makeSprite(MASKS[i], t.slice(1))), flash: GEMS.map((t, i) => makeSprite(MASKS[i], t.slice(1), true)) };
    SPR.magic = GEMS.map(t => makeSprite(MASKS[6], t.slice(1)));
    SPR.flash[MAGIC] = makeSprite(MASKS[6], GEMS[0].slice(1), true);
    return SPR;
  }

  /* 20 handmade puzzle wells. Rows are listed top to bottom and sit on the floor. Pieces are listed top to bottom.
     Every puzzle was checked with a solver: all the starting crystals can be cleared using every listed piece. */
  const PUZZLES = [
    { name: 'First Sparkle', board: ['RR.BB.'], pieces: ['GBR'] },
    { name: 'Two Towers', board: ['GY..YG', 'YG..GY', 'RR..RR'], pieces: ['RGY', 'RGY'] },
    { name: 'Slant', board: ['..Y...', '.YG...', 'YGB.B.'], pieces: ['RGB'] },
    { name: 'Hidden Row', board: ['.C....', 'PCP...', 'CPC...'], pieces: ['PCP', 'PPC'] },
    { name: 'Cross Roads', board: ['..R...', '..G...', 'GGBGG.', 'RRBRR.'], pieces: ['GBB', 'RBB'] },
    { name: 'Chain Letter', board: ['B.....', 'Y.....', 'RYB...', 'RBY...'], pieces: ['YBR', 'RBB'] },
    { name: 'Magic Moment', board: ['PGPGPG', 'GPGPGP', 'PGPGPG'], pieces: ['MMM', 'PPP', 'GPG'] },
    { name: 'Pillars', board: ['R.B.Y.', 'Y.R.B.', 'B.Y.R.'], pieces: ['RYB', 'BRY', 'YBR'] },
    { name: 'Stairway', board: ['.....C', '....CG', '...CGP', 'GGCPPY'], pieces: ['CGP', 'YGC', 'GGY'] },
    { name: 'Both Sides', board: ['RB..BR', 'BR..RB', 'YY..YY'], pieces: ['YRB', 'RBY'] },
    { name: 'Deep Well', board: ['Y.....', 'B.....', 'R.....', 'GBR...', 'RGB...'], pieces: ['RGG', 'YRB', 'RYG'] },
    { name: 'Checkerboard', board: ['RGRGRG', 'GRGRGR', 'RGRGRG'], pieces: ['GRG', 'RGR'] },
    { name: 'Three Colors', board: ['P....P', 'C....C', 'YY..YY'], pieces: ['CPP', 'PCC', 'PCY', 'PCY'] },
    { name: 'Keystone', board: ['..BB..', '.YRRY.', 'GYRRYG'], pieces: ['RRG', 'GYG', 'RBG', 'GYB'] },
    { name: 'Gemstone Arch', board: ['PG..GP', 'CG..GC', 'CP..PC'], pieces: ['PPC', 'PPG', 'CCP', 'CGC'] },
    { name: 'Leaning Tower', board: ['Y.....', 'B.....', 'R.....', 'GR....', 'YB....', 'BYG...'], pieces: ['GGB', 'BYR', 'YYB', 'GYB'] },
    { name: 'Diamond Mine', board: ['..R...', '.RBR..', 'RBYBR.', 'BYGYB.'], pieces: ['RRY', 'GGB', 'BYR'] },
    { name: 'Slippery Slope', board: ['...P..', '..PY..', '.PYC.C', 'PYCYCY'], pieces: ['PCP', 'YPC', 'YYP'] },
    { name: 'Crystal Cave', board: ['B..R..', 'GB.YR.', 'YGBPYR', 'PYGRPY'], pieces: ['RPG', 'MMM', 'BYP', 'GRB'] },
    { name: 'Grand Cascade', board: ['R.....', 'GR....', 'BGR...', 'YBGR..', 'PYBGR.', 'CPYBG.'], pieces: ['RPB', 'BCY', 'YGR', 'RCB'] }
  ];

  const DEFAULT_HI = [['Gem Hunter', 12000], ['Rocky', 9000], ['Opal', 6500], ['Jasper', 4500], ['Beryl', 3000], ['Garnet', 1800], ['Flint', 900], ['Pebble', 400]].map(([n, s]) => ({ n, s, l: 1 }));
  const PAY = [[30000, 6], [18000, 5], [10000, 4], [5000, 3], [2000, 2]];

  function open(W, api) {
    const S = sprites();
    const eraBg = { 1990: ['#000030', '#00003c'], 1995: ['#1a0026', '#22002f'], 2000: ['#00202a', '#002833'] }[api.era.id] || ['#000030', '#00003c'];
    W.body.innerHTML = `<div class="ccx">
      <div class="ccx-stage"><canvas class="ccx-cv" aria-label="Crystal Cascade well"></canvas><div class="ccx-ov" hidden></div></div>
      <div class="ccx-ctl">
        <button class="btn" data-k="left" aria-label="Move left"><svg viewBox="0 0 16 16"><path d="M11 2L4 8l7 6z"/></svg></button>
        <button class="btn" data-k="right" aria-label="Move right"><svg viewBox="0 0 16 16"><path d="M5 2l7 6-7 6z"/></svg></button>
        <button class="btn ccx-wide" data-k="cycle" aria-label="Shuffle crystals"><svg viewBox="0 0 16 16"><path d="M8 2a6 6 0 1 0 6 6h-2a4 4 0 1 1-4-4v2l3.5-3L8 0z"/></svg><span>Shuffle</span></button>
        <button class="btn" data-k="down" aria-label="Move down"><svg viewBox="0 0 16 16"><path d="M2 5l6 7 6-7z"/></svg></button>
        <button class="btn ccx-wide" data-k="drop" aria-label="Drop"><svg viewBox="0 0 16 16"><path d="M3 2l5 6 5-6zM3 8l5 6 5-6z"/></svg><span>Drop</span></button>
        <button class="btn" data-k="pause" aria-label="Pause"><svg viewBox="0 0 16 16"><path d="M4 3h3v10H4zM9 3h3v10H9z"/></svg></button>
      </div></div>`;
    const stage = W.body.querySelector('.ccx-stage'), cv = W.body.querySelector('.ccx-cv'), g = cv.getContext('2d'), ov = W.body.querySelector('.ccx-ov');
    let scale = 1, ox = 0, oy = 0, dpr = 1, raf = 0, lastT = 0, T = 0;
    let opts = Object.assign({ music: true, sound: true }, api.load('opts', {}));
    let mode = 'title', kind = 'classic', paused = false;
    let grid, piece = null, nextPc = null, phase = 'fall', fallT = 0, lockT = 0, timer = 0;
    let score = 0, level = 1, cleared = 0, chain = 0, bestChain = 0, timeLeft = 0, pieceCount = 0, lastMagic = 0, magicDue = false;
    let flashSet = null, parts = [], toasts = [], puz = null, puzIdx = 0, queue = [], earnedGame = false;
    let attract = [];
    const hiKey = k => 'hi_' + k;
    const hiList = k => api.load(hiKey(k), null) || DEFAULT_HI.map(h => Object.assign({}, h, { s: k === 'timed' ? Math.round(h.s * 0.8) : h.s }));
    const puzDone = () => api.load('puzDone', []);

    /* ---------- sound ---------- */
    const snd = (fn) => { if (opts.sound) fn(); };
    const blip = (f, d = 0.06, v = 0.05, type = 'square', at = 0) => snd(() => api.tone(f, d, { vol: v, type, at }));
    const SONG = { step: 0.16, lead: 'square', leadVol: 0.022, bassVol: 0.06, hold: 0.7,
      mel: [69, 0, 72, 76, 74, 0, 72, 69, 71, 0, 72, 74, 76, 0, 72, 0, 69, 0, 72, 76, 79, 0, 77, 76, 74, 72, 71, 72, 69, 0, 0, 0],
      bass: [45, 45, 43, 43, 41, 41, 40, 44] };
    function music(on) { if (on && opts.music && mode === 'play' && !paused) api.playMusic(SONG); else api.stopMusic(); }

    /* ---------- sizing ---------- */
    function resize() {
      const bw = Math.max(200, stage.clientWidth), bh = Math.max(200, stage.clientHeight);
      dpr = window.devicePixelRatio || 1;
      scale = Math.min(bw / LW, bh / LH);
      cv.style.width = bw + 'px'; cv.style.height = bh + 'px';
      cv.width = Math.round(bw * dpr); cv.height = Math.round(bh * dpr);
      ox = (bw - LW * scale) / 2; oy = (bh - LH * scale) / 2;
      draw();
    }
    W.onResize = () => setTimeout(resize, 0);
    const ro = window.ResizeObserver ? new ResizeObserver(() => resize()) : null;
    if (ro) ro.observe(stage);

    /* ---------- core rules ---------- */
    const emptyGrid = () => Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    const cell = (x, y) => (x < 0 || x >= COLS || y >= ROWS) ? { wall: 1 } : y < 0 ? null : grid[y][x];
    const fits = (x, y) => [0, 1, 2].every(i => !cell(x, y - 2 + i));
    const nColors = () => kind === 'puzzle' ? 6 : level < 4 ? 5 : 6;
    const randPiece = () => {
      pieceCount++;
      if (kind !== 'puzzle' && (magicDue || (level >= 2 && pieceCount - lastMagic > 25 && Math.random() < 0.04))) { magicDue = false; lastMagic = pieceCount; return [MAGIC, MAGIC, MAGIC]; }
      const n = nColors(); return [0, 1, 2].map(() => Math.random() * n | 0);
    };
    function gravity() {
      let moved = false;
      for (let x = 0; x < COLS; x++) {
        let w = ROWS - 1;
        for (let y = ROWS - 1; y >= 0; y--) if (grid[y][x]) { const c = grid[y][x]; if (w !== y) { grid[y][x] = null; c.dy = (c.dy || 0) + (w - y) * CELL; grid[w][x] = c; moved = true; } w--; }
      }
      return moved;
    }
    function findMatches() {
      const hit = new Set();
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
        const c = grid[y][x]; if (!c || c.c === MAGIC) continue;
        for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [-1, 1]]) {
          const p = cell(x - dx, y - dy); if (p && !p.wall && p.c === c.c) continue;
          let n = 0, cx = x, cy = y;
          while (cx >= 0 && cx < COLS && cy < ROWS && grid[cy][cx] && grid[cy][cx].c === c.c) { n++; cx += dx; cy += dy; }
          if (n >= 3) for (let i = 0; i < n; i++) hit.add((y + dy * i) * COLS + x + dx * i);
        }
      }
      return hit;
    }

    /* ---------- game flow ---------- */
    function startGame(k, pi) {
      kind = k; mode = 'play'; paused = false; grid = emptyGrid(); parts = []; toasts = [];
      score = 0; level = 1; cleared = 0; chain = 0; bestChain = 0; pieceCount = 0; lastMagic = 0; magicDue = false; earnedGame = false;
      timeLeft = k === 'timed' ? 180 : 0;
      if (k === 'puzzle') {
        puzIdx = pi; puz = PUZZLES[pi];
        const off = ROWS - puz.board.length;
        puz.board.forEach((r, j) => [...r].forEach((ch, x) => { if (ch !== '.') grid[off + j][x] = { c: ch === 'M' ? MAGIC : LETTER.indexOf(ch), t: true }; }));
        queue = puz.pieces.map(s => [...s].map(ch => ch === 'M' ? MAGIC : LETTER.indexOf(ch)));
        nextPc = null;
        toast(`${pi + 1}. ${puz.name}`, 2.4);
      } else { puz = null; nextPc = randPiece(); toast(k === 'timed' ? '3 minutes. Go!' : 'Level 1', 1.6); }
      hideOv(); spawn(); music(true); snd(() => api.sfx.tada()); kick();
    }
    function spawn() {
      let c;
      if (kind === 'puzzle') { if (!queue.length) { puzzleEnd(false, 'Out of crystals!'); return; } c = queue.shift(); }
      else { c = nextPc; nextPc = randPiece(); }
      piece = { x: 2, y: 2, c };
      phase = 'fall'; fallT = 0; lockT = 0;
      if (!fits(2, 2)) { piece = null; if (kind === 'puzzle') puzzleEnd(false, 'The well overflowed!'); else gameOver('The well is full!'); }
    }
    const interval = () => Math.max(0.07, 0.85 * Math.pow(0.85, level - 1));
    function move(dx) {
      if (!canAct()) return;
      if (fits(piece.x + dx, piece.y)) { piece.x += dx; lockT = 0; blip(dx < 0 ? 330 : 350, 0.03, 0.03); }
      else blip(110, 0.04, 0.03);
      kick();
    }
    function cycle(dir = 1) {
      if (!canAct()) return;
      const c = piece.c; piece.c = dir > 0 ? [c[2], c[0], c[1]] : [c[1], c[2], c[0]];
      blip(dir > 0 ? 660 : 620, 0.04, 0.035, 'triangle'); kick();
    }
    function softDrop() {
      if (!canAct()) return;
      if (fits(piece.x, piece.y + 1)) { piece.y++; fallT = 0; if (kind !== 'puzzle') score += 1; }
      else lock();
      kick();
    }
    function hardDrop() {
      if (!canAct()) return;
      let n = 0; while (fits(piece.x, piece.y + 1)) { piece.y++; n++; }
      if (kind !== 'puzzle') score += n * 2;
      snd(() => api.noise(0.08, { ft: 'lowpass', f: 600, vol: 0.1, decay: 1 }));
      lock(); kick();
    }
    const canAct = () => mode === 'play' && !paused && piece && phase === 'fall';
    function lock() {
      const p = piece; piece = null;
      if (p.y - 2 < 0) {
        if (kind === 'puzzle') return puzzleEnd(false, 'The well overflowed!');
        return gameOver('The well is full!');
      }
      for (let i = 0; i < 3; i++) grid[p.y - 2 + i][p.x] = { c: p.c[i], t: false };
      snd(() => api.tone(180, 0.05, { type: 'square', vol: 0.05, to: 90 }));
      chain = 0;
      if (p.c[2] === MAGIC) {
        const below = cell(p.x, p.y + 1);
        for (let i = 0; i < 3; i++) grid[p.y - 2 + i][p.x] = null;
        if (below && !below.wall && below.c !== MAGIC) {
          const col = below.c; flashSet = new Set();
          for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (grid[y][x] && grid[y][x].c === col) flashSet.add(y * COLS + x);
          toast('MAGIC! Every ' + GEMS[col][0] + ' shatters', 1.8);
          for (let k = 0; k < 8; k++) blip(523 * Math.pow(2, k / 4), 0.09, 0.04, 'triangle', k * 0.05);
          phase = 'clear'; timer = 0.5; chain = 0; return;
        }
        toast('The magic crystal fizzles on the floor', 1.4); score += 50 * level;
        blip(300, 0.2, 0.04, 'sawtooth');
      }
      settle();
    }
    // Look for matches; if none, the turn is over.
    function settle() {
      const m = findMatches();
      if (m.size) { flashSet = m; phase = 'clear'; timer = 0.36; chain++; return; }
      flashSet = null;
      if (chain >= 2) { bestChain = Math.max(bestChain, chain); }
      if (kind === 'puzzle') {
        const left = grid.some(r => r.some(c => c && c.t));
        if (!left) return puzzleEnd(true);
        if (!queue.length) return puzzleEnd(false, 'Out of crystals!');
      }
      spawn();
    }
    function doClear() {
      const n = flashSet.size;
      const magicClear = chain === 0;
      if (magicClear) chain = 1;
      flashSet.forEach(k => {
        const y = k / COLS | 0, x = k % COLS, c = grid[y][x];
        const tone = GEMS[c.c] || GEMS[0];
        for (let i = 0; i < 6; i++) parts.push({ x: WX + x * CELL + 16, y: WY + y * CELL + 16, vx: (Math.random() - 0.5) * 180, vy: -60 - Math.random() * 160, l: 0.7 + Math.random() * 0.4, c: tone[1 + (i % 3)] });
        grid[y][x] = null;
      });
      const pts = n * 10 * level * chain + Math.max(0, n - 3) * 20 * level + (magicClear ? 0 : 0);
      if (kind !== 'puzzle') score += pts;
      cleared += n;
      // rising combo sounds
      const base = 60 + Math.min(chain, 8) * 2;
      [0, 4, 7, 12].forEach((iv, i) => blip(api.midi ? 440 * Math.pow(2, (base + iv - 69) / 12) : 440, 0.1, 0.045, 'square', i * 0.045));
      snd(() => api.noise(0.18, { ft: 'highpass', f: 3000 + chain * 400, vol: 0.05, decay: 1 }));
      if (chain >= 2) toast(`CHAIN x${chain}!` + (kind !== 'puzzle' ? `  +${pts}` : ''), 1.2);
      else if (n >= 5) toast(`${n} crystals!` + (kind !== 'puzzle' ? `  +${pts}` : ''), 1.2);
      if (kind !== 'puzzle') {
        const nl = 1 + Math.floor(cleared / 25);
        if (nl > level) { level = nl; magicDue = true; toast(`LEVEL ${level}! A magic crystal is coming`, 2); snd(() => [0, 4, 7, 12, 16].forEach((iv, i) => api.tone(440 * Math.pow(2, (72 + iv - 69) / 12), 0.12, { vol: 0.04, type: 'triangle', at: 0.25 + i * 0.08 }))); }
      }
      flashSet = null;
      gravity(); phase = 'settle';
    }
    function gameOver(why) {
      mode = 'over'; piece = null; api.stopMusic();
      snd(() => { [0, -3, -6, -12].forEach((iv, i) => api.tone(440 * Math.pow(2, (64 + iv - 69) / 12), 0.22, { vol: 0.05, type: 'square', at: i * 0.2 })); });
      const list = hiList(kind), entry = { n: api.user || 'Player', s: score, l: level };
      list.push(entry); list.sort((a, b) => b.s - a.s); const rank = list.indexOf(entry); const top = list.slice(0, 8); api.save(hiKey(kind), top);
      let pay = 0; const tier = PAY.find(([s]) => score >= s);
      if (tier && !earnedGame) { earnedGame = true; pay = api.earn(tier[1], `a Crystal Cascade score of ${score.toLocaleString()}`) || 0; }
      const hs = rank < 8 ? `<p class="ccx-gold">New high score! You placed #${rank + 1}.</p>` : '';
      showOv(`<h2>${why}</h2><p>Score <b>${score.toLocaleString()}</b> &middot; Level ${level}${bestChain > 1 ? ` &middot; Best chain x${bestChain}` : ''}</p>${hs}
        ${tier ? `<p>${pay ? `You earned $${pay}.` : 'Great score! (You have earned all the money you can today.)'}</p>` : `<p class="ccx-dim">Score ${PAY[PAY.length - 1][0].toLocaleString()} or more to earn money.</p>`}
        ${hiTable(kind, rank < 8 ? rank : -1)}
        <div class="ccx-row"><button class="btn" data-go="again">Play again</button><button class="btn" data-go="menu">Main menu</button></div>`);
    }
    function puzzleEnd(ok, why) {
      mode = 'over'; piece = null; api.stopMusic();
      if (ok) {
        const done = puzDone(), first = !done.includes(puzIdx);
        if (first) { done.push(puzIdx); api.save('puzDone', done); }
        let pay = 0; if (first) pay = api.earn(puzIdx < 10 ? 2 : 3, `clearing Crystal Cascade puzzle ${puzIdx + 1}`) || 0;
        snd(() => api.sfx.tada());
        const all = puzDone().length >= PUZZLES.length;
        showOv(`<h2>Puzzle ${puzIdx + 1} cleared!</h2><p>${esc(puz.name)}</p>${first && pay ? `<p class="ccx-gold">You earned $${pay}.</p>` : first ? '' : '<p class="ccx-dim">(Money is paid the first time you clear each puzzle.)</p>'}
          ${all ? '<p class="ccx-gold">You have cleared all 20 puzzles. Master gem cutter!</p>' : ''}
          <div class="ccx-row">${puzIdx + 1 < PUZZLES.length ? '<button class="btn" data-go="nextpuz">Next puzzle</button>' : ''}<button class="btn" data-go="puzzles">Puzzle list</button></div>`);
        for (let i = 0; i < 40; i++) parts.push({ x: WX + Math.random() * COLS * CELL, y: WY + ROWS * CELL, vx: (Math.random() - 0.5) * 120, vy: -200 - Math.random() * 250, l: 1.2 + Math.random(), c: GEMS[i % 6][2] });
      } else {
        snd(() => api.tone(220, 0.4, { vol: 0.05, type: 'sawtooth', to: 110 }));
        showOv(`<h2>${why}</h2><p>Puzzle ${puzIdx + 1}: ${esc(puz.name)}</p><p class="ccx-dim">Every starred crystal must vanish before your pieces run out.</p>
          <div class="ccx-row"><button class="btn" data-go="retry">Try again</button><button class="btn" data-go="puzzles">Puzzle list</button></div>`);
      }
      kick();
    }
    const esc = s => api.esc ? api.esc(s) : String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    function toast(text, t = 1.2) { toasts.push({ text, t, max: t }); if (toasts.length > 3) toasts.shift(); }

    /* ---------- overlay screens (title, puzzle list, game over) ---------- */
    function showOv(html) { ov.innerHTML = `<div class="ccx-box">${html}</div>`; ov.hidden = false; const b = ov.querySelector('.btn'); if (b) setTimeout(() => b.focus(), 30); }
    function hideOv() { ov.hidden = true; ov.innerHTML = ''; }
    function hiTable(k, mark = -1) {
      return `<table class="ccx-hi"><caption>${k === 'timed' ? 'Timed' : 'Classic'} high scores</caption>${hiList(k).map((h, i) => `<tr${i === mark ? ' class="ccx-me"' : ''}><td>${i + 1}.</td><td>${esc(h.n)}</td><td>${h.s.toLocaleString()}</td></tr>`).join('')}</table>`;
    }
    function titleScreen() {
      mode = 'title'; piece = null; paused = false; api.stopMusic(); setPauseBtn();
      const done = puzDone().length, b1 = hiList('classic')[0], b2 = hiList('timed')[0];
      showOv(`<div class="ccx-logo"><span>CRYSTAL</span><span>CASCADE</span></div>
        <p class="ccx-dim">Line up 3 or more crystals of a color.</p>
        <div class="ccx-menu">
          <button class="btn" data-go="classic"><b>1</b> Classic <small>Best ${b1.s.toLocaleString()}</small></button>
          <button class="btn" data-go="timed"><b>2</b> Timed: 3 minutes <small>Best ${b2.s.toLocaleString()}</small></button>
          <button class="btn" data-go="puzzles"><b>3</b> Puzzle wells <small>${done} of ${PUZZLES.length} cleared</small></button>
          <button class="btn" data-go="help"><b>H</b> How to play</button>
        </div>
        <p class="ccx-fine">&copy; 1990 Lodestone Software</p>`);
      kick();
    }
    function puzzleList() {
      mode = 'title'; piece = null; api.stopMusic();
      const done = puzDone(); const open = Math.max(3, done.length + 3);
      showOv(`<h2>Puzzle wells</h2><p class="ccx-dim">Clear every starred crystal using only the pieces you are given.</p>
        <div class="ccx-pz">${PUZZLES.map((p, i) => { const locked = i >= open && !done.includes(i); return `<button class="btn${done.includes(i) ? ' ccx-done' : ''}" data-pz="${i}"${locked ? ' disabled' : ''} title="${esc(p.name)}">${i + 1}${done.includes(i) ? '<i>*</i>' : ''}</button>`; }).join('')}</div>
        <p class="ccx-dim">Cleared puzzles are marked *. Clearing a puzzle unlocks more.</p>
        <div class="ccx-row"><button class="btn" data-go="menu">Main menu</button></div>`);
    }
    const HELP = 'A column of three crystals falls into the well.\n\n' +
      'Slide it left and right, and Shuffle to change the order of its three crystals. Drop it when it is where you want it.\n\n' +
      'Three or more crystals of the same color in a line (across, up and down, or on a slant) vanish. Crystals above fall into the gaps and can make chains for big points, with a higher note for every link.\n\n' +
      'The rainbow MAGIC crystal wipes out every crystal of the color it lands on. You get one each time you reach a new level.\n\n' +
      'Classic: play until the well fills up. Every 25 crystals is a new level, and pieces fall faster.\nTimed: score as much as you can in 3 minutes.\nPuzzle: 20 handmade wells. Clear every starred crystal with the pieces you are given (shown at the right).\n\n' +
      'Keyboard: Left/Right slide, Up or X shuffles (Z the other way), Down moves down, Space drops, P pauses.\n' +
      'Touch: swipe left/right to slide, tap to shuffle, swipe down to drop, or use the buttons.\n\n' +
      'Score 2,000 or more in Classic or Timed to earn money. Each puzzle pays the first time you clear it.';
    function howTo() { const was = paused; if (mode === 'play' && !paused) togglePause(); api.msgBox('How to play Crystal Cascade', HELP).then(() => { if (!was && paused && mode === 'play') togglePause(); }); }
    ov.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      snd(() => api.sfx.click());
      if (b.dataset.pz != null) return startGame('puzzle', +b.dataset.pz);
      const go = b.dataset.go;
      if (go === 'classic' || go === 'timed') startGame(go);
      else if (go === 'puzzles') puzzleList();
      else if (go === 'help') howTo();
      else if (go === 'menu') titleScreen();
      else if (go === 'again') startGame(kind);
      else if (go === 'retry') startGame('puzzle', puzIdx);
      else if (go === 'nextpuz') startGame('puzzle', puzIdx + 1);
      else if (go === 'resume') togglePause();
    });

    /* ---------- pause ---------- */
    function setPauseBtn() { const b = W.body.querySelector('[data-k=pause]'); b.innerHTML = paused ? '<svg viewBox="0 0 16 16"><path d="M4 2l9 6-9 6z"/></svg>' : '<svg viewBox="0 0 16 16"><path d="M4 3h3v10H4zM9 3h3v10H9z"/></svg>'; b.setAttribute('aria-label', paused ? 'Resume' : 'Pause'); }
    function togglePause() {
      if (mode !== 'play') return;
      paused = !paused; setPauseBtn();
      if (paused) showOv('<h2>Paused</h2><p class="ccx-dim">The crystals are waiting.</p><div class="ccx-row"><button class="btn" data-go="resume">Resume</button><button class="btn" data-go="menu">Quit to menu</button></div>');
      else hideOv();
      music(!paused); lastT = performance.now(); kick();
    }

    /* ---------- input ---------- */
    const act = { left: () => move(-1), right: () => move(1), cycle: () => cycle(1), down: softDrop, drop: hardDrop, pause: togglePause };
    W.body.querySelectorAll('.ccx-ctl .btn').forEach(b => {
      let rep = 0, rep2 = 0;
      const stop = () => { clearTimeout(rep); clearInterval(rep2); rep = rep2 = 0; };
      b.addEventListener('pointerdown', e => {
        e.preventDefault(); const k = b.dataset.k;
        if (mode === 'title' && k !== 'pause') return;
        act[k]();
        if (k === 'left' || k === 'right' || k === 'down') rep = setTimeout(() => { rep2 = setInterval(act[k], k === 'down' ? 50 : 90); }, 230);
      });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => b.addEventListener(t, stop));
      b.addEventListener('click', e => e.preventDefault());
      b._stop = stop;
    });
    let sw = null;
    cv.addEventListener('pointerdown', e => {
      e.preventDefault();
      if (mode !== 'play' || paused) return;
      sw = { id: e.pointerId, x0: e.clientX, y0: e.clientY, lx: e.clientX, ly: e.clientY, t: performance.now(), moved: false };
      try { cv.setPointerCapture(e.pointerId); } catch (er) {}
    });
    cv.addEventListener('pointermove', e => {
      if (!sw || e.pointerId !== sw.id) return;
      const step = CELL * scale * 0.9;
      while (e.clientX - sw.lx > step) { move(1); sw.lx += step; sw.moved = true; }
      while (sw.lx - e.clientX > step) { move(-1); sw.lx -= step; sw.moved = true; }
      if (kind === 'puzzle' || performance.now() - sw.t > 250) while (e.clientY - sw.ly > step) { softDrop(); sw.ly += step; sw.moved = true; }
    });
    const endSwipe = e => {
      if (!sw || e.pointerId !== sw.id) return;
      const dx = e.clientX - sw.x0, dy = e.clientY - sw.y0, dt = performance.now() - sw.t;
      if (dy > 50 && dy > Math.abs(dx) * 1.5 && dt < 350) hardDrop();
      else if (!sw.moved && Math.abs(dx) < 12 && Math.abs(dy) < 12) cycle(e.button === 2 ? -1 : 1);
      sw = null;
    };
    cv.addEventListener('pointerup', endSwipe);
    cv.addEventListener('pointercancel', () => { sw = null; });
    cv.addEventListener('contextmenu', e => e.preventDefault());
    W.onKey = e => {
      const k = e.key;
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (mode === 'title' && ov.querySelector('.ccx-logo')) {
        if (k === '1') startGame('classic'); else if (k === '2') startGame('timed'); else if (k === '3') puzzleList(); else if (k === 'h' || k === 'H') howTo(); else return;
        e.preventDefault(); return;
      }
      if (k === 'p' || k === 'P') { e.preventDefault(); togglePause(); return; }
      if (mode !== 'play' || paused) return;
      const map = { ArrowLeft: act.left, a: act.left, A: act.left, ArrowRight: act.right, d: act.right, D: act.right, ArrowUp: act.cycle, x: act.cycle, X: act.cycle, w: act.cycle, W: act.cycle, z: () => cycle(-1), Z: () => cycle(-1), ArrowDown: act.down, s: act.down, S: act.down, ' ': act.drop };
      if (map[k]) { e.preventDefault(); map[k](); }
    };

    /* ---------- loop ---------- */
    function kick() { if (!raf) { lastT = performance.now(); raf = requestAnimationFrame(loop); } }
    function loop(now) {
      raf = 0;
      const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
      if (!paused) step(dt);
      draw();
      if (!paused && (mode === 'play' || mode === 'title' || parts.length || toasts.length)) raf = requestAnimationFrame(loop);
    }
    function step(dt) {
      T += dt;
      for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 420 * dt; p.l -= dt; if (p.l <= 0) parts.splice(i, 1); }
      for (let i = toasts.length - 1; i >= 0; i--) { toasts[i].t -= dt; if (toasts[i].t <= 0) toasts.splice(i, 1); }
      if (mode === 'title') { stepAttract(dt); return; }
      if (mode !== 'play') return;
      if (kind === 'timed') {
        const before = Math.ceil(timeLeft);
        timeLeft = Math.max(0, timeLeft - dt);
        if (Math.ceil(timeLeft) !== before && timeLeft <= 10 && timeLeft > 0) blip(880, 0.05, 0.04);
        if (timeLeft <= 0 && phase === 'fall') { piece = null; return gameOver("Time's up!"); }
      }
      if (phase === 'fall' && piece && kind !== 'puzzle') {
        fallT += dt;
        if (fits(piece.x, piece.y + 1)) { lockT = 0; if (fallT >= interval()) { fallT = 0; piece.y++; } }
        else { lockT += dt; if (lockT >= Math.max(0.35, interval())) lock(); }
      } else if (phase === 'clear') {
        timer -= dt; if (timer <= 0) doClear();
      } else if (phase === 'settle') {
        let moving = false;
        for (const row of grid) for (const c of row) if (c && c.dy > 0) { c.dy = Math.max(0, c.dy - dt * 700); moving = true; }
        if (!moving) settle();
      }
    }
    function stepAttract(dt) {
      if (Math.random() < dt * 2.5) attract.push({ x: Math.random() * LW, y: -20, v: 40 + Math.random() * 80, c: Math.random() * 6 | 0, s: 1 + Math.random() * 1.5 });
      for (let i = attract.length - 1; i >= 0; i--) { const a = attract[i]; a.y += a.v * dt; if (a.y > LH + 20) attract.splice(i, 1); }
    }

    /* ---------- drawing ---------- */
    function gem(c, x, y, size, flash) {
      const spr = c === MAGIC ? (flash ? S.flash[MAGIC] : S.magic[Math.floor(T * 8) % 6]) : (flash ? S.flash[c] : S.gem[c]);
      g.drawImage(spr, Math.round(x), Math.round(y), size, size);
    }
    function draw() {
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.imageSmoothingEnabled = false;
      g.fillStyle = '#000'; g.fillRect(0, 0, cv.width, cv.height);
      g.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * ox, dpr * oy); g.imageSmoothingEnabled = false;
      // backdrop: cave wall pattern, filling the whole canvas (including any letterbox margins)
      const bx0 = Math.floor(-ox / scale / 32) * 32, by0 = Math.floor(-oy / scale / 32) * 32, bx1 = LW + ox / scale, by1 = LH + oy / scale;
      g.fillStyle = eraBg[0]; g.fillRect(bx0, by0, bx1 - bx0, by1 - by0);
      g.fillStyle = eraBg[1];
      for (let y = by0; y < by1; y += 16) for (let x = bx0 + (Math.abs(y / 16) % 2) * 16; x < bx1; x += 32) g.fillRect(x, y, 16, 16);
      if (mode === 'title' && !grid) {
        attract.forEach(a => { g.globalAlpha = 0.55; gem(a.c, a.x, a.y, 14 * a.s * 1.4); }); g.globalAlpha = 1;
        return;
      }
      if (mode === 'title') { attract.forEach(a => { g.globalAlpha = 0.55; gem(a.c, a.x, a.y, 14 * a.s * 1.4); }); g.globalAlpha = 1; return; }
      drawWell();
      drawPanel();
      // HUD strip
      g.fillStyle = '#000'; g.fillRect(0, 0, LW, 28);
      g.fillStyle = '#aaaaaa'; g.fillRect(0, 28, LW, 2);
      g.font = FONT(22); g.textBaseline = 'middle'; g.textAlign = 'left';
      g.fillStyle = '#55ffff'; g.fillText(kind === 'puzzle' ? `PUZZLE ${puzIdx + 1}` : `SCORE ${score.toLocaleString()}`, 8, 15);
      g.textAlign = 'right';
      if (kind === 'timed') { const s = Math.ceil(timeLeft); g.fillStyle = s <= 10 && Math.floor(T * 4) % 2 ? '#ff5555' : '#ffff55'; g.fillText(`TIME ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`, LW - 8, 15); }
      else if (kind === 'puzzle') { g.fillStyle = '#ffff55'; g.fillText(puz.name.toUpperCase(), LW - 8, 15); }
      else { g.fillStyle = '#ffff55'; g.fillText(`LEVEL ${level}`, LW - 8, 15); }
      g.textAlign = 'left';
      parts.forEach(p => { g.globalAlpha = clamp(p.l * 2, 0, 1); g.fillStyle = p.c; g.fillRect(Math.round(p.x), Math.round(p.y), 3, 3); }); g.globalAlpha = 1;
      toasts.forEach((t, i) => {
        const a = clamp(t.t / 0.3, 0, 1), y = WY + 150 - i * 26 - (1 - t.t / t.max) * 16;
        g.globalAlpha = a; g.font = FONT(24); g.textAlign = 'center';
        const mw = LW - 16, w = Math.min(mw, g.measureText(t.text).width) + 16, cx = LW / 2;
        g.fillStyle = 'rgba(0,0,0,.75)'; g.fillRect(cx - w / 2, y - 13, w, 26);
        g.fillStyle = '#000'; g.fillText(t.text, cx + 2, y + 2, mw); g.fillStyle = '#ffff55'; g.fillText(t.text, cx, y, mw);
        g.textAlign = 'left'; g.globalAlpha = 1;
      });
    }
    function drawWell() {
      // bevelled stone frame
      g.fillStyle = '#555555'; g.fillRect(WX - 6, WY - 4, COLS * CELL + 12, ROWS * CELL + 10);
      g.fillStyle = '#aaaaaa'; g.fillRect(WX - 6, WY - 4, COLS * CELL + 12, 2); g.fillRect(WX - 6, WY - 4, 2, ROWS * CELL + 10);
      g.fillStyle = '#222222'; g.fillRect(WX - 6, WY + ROWS * CELL + 4, COLS * CELL + 12, 2); g.fillRect(WX + COLS * CELL + 4, WY - 4, 2, ROWS * CELL + 10);
      g.fillStyle = '#000010'; g.fillRect(WX - 2, WY, COLS * CELL + 4, ROWS * CELL + 2);
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { g.fillStyle = (x + y) % 2 ? '#05051a' : '#08082a'; g.fillRect(WX + x * CELL, WY + y * CELL, CELL, CELL); }
      if (!grid || paused) { if (paused) { g.fillStyle = '#55ffff'; g.font = FONT(26); g.textAlign = 'center'; g.fillText('PAUSED', WX + COLS * CELL / 2, WY + 160); g.textAlign = 'left'; } return; }
      // landing guide
      if (piece && phase === 'fall' && mode === 'play') {
        let gy = piece.y; while (fits(piece.x, gy + 1)) gy++;
        g.fillStyle = 'rgba(255,255,255,.07)'; g.fillRect(WX + piece.x * CELL, WY, CELL, (gy + 1) * CELL);
        g.strokeStyle = 'rgba(255,255,255,.35)'; g.setLineDash([3, 3]); g.lineWidth = 1;
        g.strokeRect(WX + piece.x * CELL + 1.5, WY + (gy - 2) * CELL + 1.5, CELL - 3, CELL * 3 - 3); g.setLineDash([]);
      }
      g.save(); g.beginPath(); g.rect(WX, WY, COLS * CELL, ROWS * CELL); g.clip();
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
        const c = grid[y][x]; if (!c) continue;
        const fl = flashSet && flashSet.has(y * COLS + x) && Math.floor(T * 16) % 2 === 0;
        const px = WX + x * CELL + 2, py = WY + y * CELL + 2 - (c.dy || 0);
        gem(c.c, px, py, CELL - 4, fl);
        if (c.t && kind === 'puzzle') drawStar(px + CELL - 11, py + 1);
      }
      if (piece) for (let i = 0; i < 3; i++) gem(piece.c[i], WX + piece.x * CELL + 2, WY + (piece.y - 2 + i) * CELL + 2, CELL - 4, false);
      g.restore();
    }
    function drawStar(x, y) {
      g.fillStyle = '#000'; g.fillRect(x + 2, y - 1, 3, 9); g.fillRect(x - 1, y + 2, 9, 3);
      g.fillStyle = Math.floor(T * 3) % 2 ? '#ffffff' : '#ffff55'; g.fillRect(x + 3, y, 1, 7); g.fillRect(x, y + 3, 7, 1); g.fillRect(x + 2, y + 2, 3, 3);
    }
    function panelBox(y, h, label) {
      g.fillStyle = '#000'; g.fillRect(PX, y, LW - PX - 8, h);
      g.strokeStyle = '#aaaaaa'; g.lineWidth = 2; g.strokeRect(PX + 1, y + 1, LW - PX - 10, h - 2);
      g.fillStyle = '#aaaaaa'; g.font = FONT(18); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(label, PX + (LW - PX - 8) / 2, y + 12); g.textAlign = 'left';
    }
    function drawPanel() {
      const pw = LW - PX - 8, cx = PX + pw / 2;
      if (kind === 'puzzle') {
        const n = queue.length + (piece ? 1 : 0);
        panelBox(WY - 4, ROWS * CELL + 10, `PIECES ${n}`);
        const list = (piece ? [piece.c] : []).concat(queue), sz = 20, colsN = Math.max(1, Math.floor((pw - 8) / (sz + 6)));
        list.forEach((pc, i) => {
          const col = i % colsN, row = Math.floor(i / colsN), x = PX + 6 + col * (sz + 6), y = WY + 22 + row * (sz * 3 + 12);
          if (i === 0 && piece) { g.fillStyle = '#55ffff'; g.fillRect(x - 2, y - 2, sz + 4, sz * 3 + 4); g.fillStyle = '#000'; g.fillRect(x - 1, y - 1, sz + 2, sz * 3 + 2); }
          pc.forEach((c, j) => gem(c, x, y + j * sz, sz));
        });
        g.fillStyle = '#aaaaaa'; g.font = FONT(17); g.textAlign = 'center';
        const lines = ['Clear every', 'starred gem', 'to win.'];
        lines.forEach((l, i) => g.fillText(l, cx, WY + ROWS * CELL - 56 + i * 17));
        drawStar(cx - 3, WY + ROWS * CELL - 84);
        g.textAlign = 'left';
        return;
      }
      panelBox(WY - 4, 128, 'NEXT');
      if (nextPc) nextPc.forEach((c, i) => gem(c, cx - 14, WY + 22 + i * 30, 28));
      const stats = [['LEVEL', level], ['CRYSTALS', cleared], ['CHAIN', bestChain > 1 ? 'x' + bestChain : '-']];
      if (kind === 'classic') stats.push(['TO NEXT', 25 - cleared % 25]);
      g.fillStyle = '#000'; g.fillRect(PX, WY + 132, pw, stats.length * 44 + 8);
      g.strokeStyle = '#aaaaaa'; g.lineWidth = 2; g.strokeRect(PX + 1, WY + 133, pw - 2, stats.length * 44 + 6);
      g.textAlign = 'center'; g.textBaseline = 'middle';
      stats.forEach(([l, v], i) => { g.fillStyle = '#aaaaaa'; g.font = FONT(16); g.fillText(l, cx, WY + 146 + i * 44); g.fillStyle = '#ffffff'; g.font = FONT(24); g.fillText(String(v), cx, WY + 165 + i * 44); });
      const hi = hiList(kind)[0];
      g.fillStyle = '#aaaaaa'; g.font = FONT(16); g.fillText('BEST', cx, WY + ROWS * CELL - 26); g.fillStyle = '#55ff55'; g.font = FONT(22); g.fillText(Math.max(hi.s, score).toLocaleString(), cx, WY + ROWS * CELL - 6);
      g.textAlign = 'left';
    }

    /* ---------- menus ---------- */
    api.menubar([
      { label: 'Game', items: () => [
        { label: 'New Classic game', fn: () => startGame('classic') },
        { label: 'New Timed game (3 minutes)', fn: () => startGame('timed') },
        { label: 'Puzzle wells...', fn: puzzleList },
        ...(kind === 'puzzle' && mode !== 'title' ? [{ label: 'Restart this puzzle', fn: () => startGame('puzzle', puzIdx) }] : []),
        { label: paused ? 'Resume' : 'Pause', fn: togglePause, disabled: mode !== 'play' }, '-',
        { label: 'High scores', fn: () => { const f = k => hiList(k).map((h, i) => `${i + 1}. ${h.s.toLocaleString().padStart(7)}  ${h.n}`).join('\n'); api.msgBox('Crystal Cascade high scores', `CLASSIC\n${f('classic')}\n\nTIMED\n${f('timed')}`); } },
        { label: 'Main menu', fn: titleScreen }, '-',
        { label: 'Exit', fn: () => api.close() }
      ] },
      { label: 'Options', items: () => [
        { label: (opts.music ? 'Turn music off' : 'Turn music on'), fn: () => { opts.music = !opts.music; api.save('opts', opts); music(true); } },
        { label: (opts.sound ? 'Turn sound effects off' : 'Turn sound effects on'), fn: () => { opts.sound = !opts.sound; api.save('opts', opts); } }
      ] },
      { label: 'Help', items: [
        { label: 'How to play', fn: howTo },
        { label: 'About Crystal Cascade', fn: () => api.msgBox('About Crystal Cascade', 'Crystal Cascade version 1.0\nCopyright 1990 Lodestone Software\n\nSix colors, six cuts, one very deep well.') }
      ] }
    ]);
    W.onMin = () => { if (mode === 'play' && !paused) togglePause(); };
    W.onClose = () => { cancelAnimationFrame(raf); raf = 0; if (ro) ro.disconnect(); api.stopMusic(); W.body.querySelectorAll('.ccx-ctl .btn').forEach(b => b._stop && b._stop()); };
    titleScreen();
    setTimeout(resize, 0);
    if (document.fonts && document.fonts.load) document.fonts.load('20px VT323').then(() => draw(), () => {});
  }

  (window.RETRO_APPS = window.RETRO_APPS || []).push({
    id: 'blockfall', label: 'Crystal Cascade', kind: 'store', cat: 'game', year: 1990, price: 14.95, sizeKB: 420,
    help: 'Drop stacks of three crystals and line up three of a color to make them vanish. Good scores and solved puzzles earn money.',
    publisher: 'Lodestone Software', genre: 'Puzzle',
    tagline: 'Six colors. Six cuts. One very deep well.',
    blurb: 'Stacks of three glittering crystals tumble into the well. Slide them, shuffle their order and line up three or more of a color across, down or on a slant. Crystals above fall into the gaps for dazzling chain reactions. Grab the rainbow magic crystal to shatter a whole color at once. Includes Classic, a frantic 3-minute Timed mode, and 20 handmade Puzzle wells.',
    box: { bg: '#10104a', fg: '#ffffff', accent: '#ff55ff' },
    icon: '<svg viewBox="0 0 32 32" shape-rendering="crispEdges" aria-hidden="true"><rect width="32" height="32" fill="#10104a"/><rect x="8" y="2" width="16" height="29" fill="#555"/><rect x="10" y="2" width="12" height="27" fill="#000018"/><path d="M16 4l5 4-5 4-5-4z" fill="#ffff55"/><path d="M16 4l5 4h-10z" fill="#ffffaa"/><rect x="11" y="13" width="10" height="7" fill="#55ff55"/><rect x="11" y="13" width="10" height="2" fill="#aaffaa"/><rect x="11" y="18" width="10" height="2" fill="#00aa00"/><path d="M16 21l5 7h-10z" fill="#ff55ff"/><path d="M16 21l2 3h-4z" fill="#ffaaff"/><rect x="3" y="4" width="1" height="1" fill="#fff"/><rect x="27" y="9" width="1" height="1" fill="#fff"/><rect x="26" y="22" width="2" height="2" fill="#55ffff"/><rect x="4" y="18" width="2" height="2" fill="#ff5555"/></svg>',
    window: { w: 420, h: 620 },
    css: `.ccx{display:flex;flex-direction:column;height:100%;background:#000;user-select:none;-webkit-user-select:none}
      .ccx-stage{flex:1;min-height:0;position:relative;overflow:hidden}
      .ccx-cv{display:block;touch-action:none;cursor:pointer;image-rendering:pixelated}
      .ccx-ctl{display:flex;gap:4px;padding:4px;background:#c0c0c0;justify-content:center}
      .ccx-ctl .btn{flex:1;min-width:0;max-width:86px;min-height:44px;padding:2px 4px;display:flex;align-items:center;justify-content:center;gap:4px;touch-action:none}
      .ccx-ctl .btn.ccx-wide{max-width:110px;flex:1.5}
      .ccx-ctl svg{width:18px;height:18px;fill:currentColor;flex:none}
      .ccx-ctl span{font-size:12px}
      @media (max-width:380px){.ccx-ctl span{display:none}}
      .ccx-ov{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,40,.55);padding:8px;overflow:auto}
      .ccx-ov[hidden]{display:none}
      .ccx-box{background:#c0c0c0;color:#000;border:2px solid;border-color:#fff #404040 #404040 #fff;box-shadow:2px 2px 0 #000;padding:10px 14px;max-width:320px;width:100%;text-align:center;font-size:13px;margin:auto}
      .ccx-box h2{margin:2px 0 8px;font:400 26px/1 var(--dos),monospace;color:#000080}
      .ccx-box p{margin:6px 0}
      .ccx-dim{color:#404040;font-size:12px}
      .ccx-gold{color:#800080;font-weight:bold}
      .ccx-fine{font-size:11px;color:#404040;margin-top:8px}
      .ccx-logo{display:flex;flex-direction:column;font:400 42px/.9 var(--dos),monospace;margin:4px 0 6px;letter-spacing:2px}
      .ccx-logo span:first-child{color:#aa00aa;text-shadow:2px 2px 0 #ff55ff,4px 4px 0 #000}
      .ccx-logo span:last-child{color:#0000aa;text-shadow:2px 2px 0 #55ffff,4px 4px 0 #000}
      .ccx-menu{display:flex;flex-direction:column;gap:6px;margin:8px 0}
      .ccx-menu .btn{display:flex;align-items:center;gap:8px;text-align:left;min-height:40px;padding:4px 10px}
      .ccx-menu .btn b{font:400 20px var(--dos),monospace;color:#000080;width:14px}
      .ccx-menu .btn small{margin-left:auto;color:#404040;font-size:11px}
      .ccx-row{display:flex;gap:8px;justify-content:center;margin-top:10px;flex-wrap:wrap}
      .ccx-row .btn{min-height:36px;padding:4px 14px}
      .ccx-pz{display:grid;grid-template-columns:repeat(5,1fr);gap:5px;margin:8px 0}
      .ccx-pz .btn{min-width:0;min-height:40px;padding:0;font:400 20px var(--dos),monospace;position:relative}
      .ccx-pz .btn i{position:absolute;top:1px;right:4px;font-style:normal;color:#800080}
      .ccx-pz .btn.ccx-done{background:#b8d8b8}
      .ccx-pz .btn:disabled{color:#808080}
      .ccx-hi{margin:8px auto 0;border-collapse:collapse;font:400 17px/1.1 var(--dos),monospace;background:#000;color:#55ffff;width:100%}
      .ccx-hi caption{font:bold 12px var(--ui);color:#000;padding-bottom:3px}
      .ccx-hi td{padding:1px 6px;text-align:left}
      .ccx-hi td:last-child{text-align:right}
      .ccx-hi tr.ccx-me{background:#aa00aa;color:#fff}`,
    open
  });
})();
