/* Duckling Dash: guide ducklings across a busy road and a rushing river to their nests. Store game, 1990. */
(function () {
  const T = 16, COLS = 13, VW = COLS * T, ROWS = 15, VH = ROWS * T;
  const R_NEST = 1, R_BANK = 7, R_START = 13;
  const NESTS = [24, 64, 104, 144, 184];   // nest centers (px)
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const FONT = (n, b) => `${b ? 'bold ' : ''}${n}px "Courier New", Courier, monospace`;
  const DEFAULT_HI = [['QAK', 12000], ['MOM', 9000], ['PIP', 7000], ['DUK', 5500], ['FLP', 4000], ['WDL', 2500], ['BIL', 1500], ['EGG', 800]].map(([i, s]) => ({ i, s, l: 1 }));

  const DUCK = [
    '.....oo.....',
    '....yooy....',
    '...yyyyyy...',
    '...ykyyky...',
    '...yyyyyy...',
    '....yyyy....',
    '..YyyyyyyY..',
    '.YYyyyyyyYY.',
    '.YYyyyyyyYY.',
    '..YyyyyyyY..',
    '...yyyyyy...',
    '....o..o....'
  ];
  const MAMA = [
    '......oo......',
    '.....oooo.....',
    '....bbbbbb....',
    '....wkwwkw....',
    '....wwwwww....',
    '.....wwww.....',
    '...wwwwwwww...',
    '..WwwwwwwwwW..',
    '.WWwwwwwwwwWW.',
    '.WWwwwwwwwwWW.',
    '.WWwwwwwwwwWW.',
    '..WwwwwwwwwW..',
    '...wwwwwwww...',
    '....wwwwww....',
    '....oo..oo....'
  ];
  const PAL_DUCK = { y: '#ffff55', Y: '#ffcc00', o: '#ff8800', k: '#000' };
  const PAL_LOST = { y: '#d8c8a0', Y: '#a89870', o: '#ff8800', k: '#000' };
  const PAL_MAMA = { w: '#ffffff', W: '#c0c0d8', o: '#ff8800', k: '#000', b: '#5555ff' };

  function sprite(rows, pal) {
    const c = document.createElement('canvas'); c.width = rows[0].length; c.height = rows.length;
    const g = c.getContext('2d');
    rows.forEach((r, y) => [...r].forEach((ch, x) => { if (pal[ch]) { g.fillStyle = pal[ch]; g.fillRect(x, y, 1, 1); } }));
    return c;
  }
  function rot(src, q) {   // rotate by q quarter turns clockwise
    const c = document.createElement('canvas'); c.width = q % 2 ? src.height : src.width; c.height = q % 2 ? src.width : src.height;
    const g = c.getContext('2d'); g.translate(c.width / 2, c.height / 2); g.rotate(q * Math.PI / 2); g.drawImage(src, -src.width / 2, -src.height / 2); return c;
  }
  const iconPix = (rows, pal, ox, oy) => rows.map((r, y) => [...r].map((ch, x) => pal[ch] ? `<rect x="${ox + x}" y="${oy + y}" width="1" height="1" fill="${pal[ch]}"/>` : '').join('')).join('');

  // Lane layouts per level. Each pattern item: [type, widthTiles, gapTiles, flag]. Every lane loops over 16 tiles.
  function laneSpecs(L) {
    const sp = Math.min(2.3, 1 + (L - 1) * 0.12), rs = Math.min(1.9, 1 + (L - 1) * 0.08);
    return [
      { row: 2, kind: 'river', dir: -1, speed: 20 * rs, pat: L >= 5 ? [['gator', 3, 2], ['log', 3, 3], ['log', 3, 2]] : [['log', 4, 2], ['log', 3, 3], ['log', 2, 2]] },
      { row: 3, kind: 'river', dir: 1, speed: 27 * rs, pat: L >= 4 ? [['boat', 3, 2], ['log', 3, 3], ['log', 2, 3]] : [['boat', 3, 3], ['log', 4, 6]] },
      { row: 4, kind: 'river', dir: -1, speed: 22 * rs, pat: [['lily', 2, 2, L >= 3], ['lily', 3, 2, true], ['lily', 2, 5]] },
      { row: 5, kind: 'river', dir: 1, speed: 16 * rs, pat: [['log', 3, 2], [L >= 3 ? 'gator' : 'log', 3, 2], ['log', 4, 2]] },
      { row: 6, kind: 'river', dir: -1, speed: 19 * rs, pat: [['turtle', 3, 2, L >= 4], ['turtle', 2, 2, L >= 2], ['turtle', 3, 4]] },
      { row: 8, kind: 'road', dir: -1, speed: 26 * sp, pat: L >= 3 ? [['truck', 3, 3], ['truck', 2, 3], ['car', 1, 4]] : [['truck', 2, 5], ['truck', 3, 6]] },
      { row: 9, kind: 'road', dir: 1, speed: 30 * sp, pat: L >= 5 ? [['car', 1, 2], ['car', 1, 3], ['car', 1, 2], ['car', 1, 4]] : [['car', 1, 3], ['car', 1, 3], ['car', 1, 7]] },
      { row: 10, kind: 'road', dir: -1, speed: 15 * sp, pat: L >= 2 ? [['sweeper', 2, 5], ['sweeper', 2, 7]] : [['sweeper', 2, 6], ['car', 1, 7]] },
      { row: 11, kind: 'road', dir: 1, speed: 40 * sp, pat: L >= 4 ? [['bike', 1, 4], ['bike', 1, 4], ['bike', 1, 5]] : [['bike', 1, 7], ['bike', 1, 7]] },
      { row: 12, kind: 'road', dir: -1, speed: 22 * sp, pat: L >= 3 ? [['car', 1, 3], ['car', 1, 3], ['car', 1, 3], ['car', 1, 3]] : [['car', 1, 4], ['car', 1, 4], ['car', 1, 5]] }
    ];
  }
  const LOOP = 16 * T, OFF = 24;   // lane loop length and where the loop starts off-screen
  const CAR_COLS = ['#ff5555', '#5555ff', '#55ffff', '#ff55ff', '#ffffff', '#55ff55'];

  (window.RETRO_APPS = window.RETRO_APPS || []).push({
    id: 'crossing',
    label: 'Duckling Dash',
    kind: 'store', cat: 'game', year: 1990, price: 9.95,
    publisher: 'Puddlejump Software',
    genre: 'Arcade / Action',
    tagline: 'Hop, waddle and paddle home to the pond!',
    blurb: 'Mama Duck needs your help! Guide her ducklings one at a time across a busy street full of cars, trucks, bikes and a noisy street sweeper, then hop over the rushing river on logs, lily pads, diving turtles and the friendly paddle boat. Fill all five nests before the timer runs out, snack on bonus bugs and rescue the lost duckling for extra points. Every level is faster, and watch out for the sleepy alligator!',
    help: 'Hop ducklings across a busy road and a rushing river to their nests. Clear a level to earn money.',
    sizeKB: 360,
    box: { bg: '#006600', fg: '#ffff55', accent: '#55aaff' },
    icon: `<svg viewBox="0 0 32 32" shape-rendering="crispEdges" aria-hidden="true"><rect width="32" height="32" fill="#55aa55"/><rect y="4" width="32" height="10" fill="#0044aa"/><rect x="2" y="6" width="12" height="5" fill="#aa5500"/><rect x="2" y="7" width="12" height="1" fill="#6b3a10"/><rect x="18" y="9" width="10" height="4" fill="#aa5500"/><rect y="18" width="32" height="10" fill="#3c3c3c"/><rect x="3" y="22" width="4" height="1" fill="#fff"/><rect x="13" y="22" width="4" height="1" fill="#fff"/><rect x="23" y="22" width="4" height="1" fill="#fff"/><rect x="20" y="19" width="10" height="7" fill="#ff5555"/><rect x="26" y="20" width="2" height="5" fill="#aaffff"/><g transform="translate(9 13)">${iconPix(DUCK, PAL_DUCK, 0, 0)}</g><rect y="0" width="32" height="4" fill="#00aa00"/><rect x="0" y="28" width="32" height="4" fill="#aaaaaa"/></svg>`,
    window: { w: 470, h: 620 },
    css: `
      .dkd{height:100%;display:flex;flex-direction:column;background:#000;user-select:none;-webkit-user-select:none}
      .dkd-wrap{flex:1;min-height:0;position:relative;display:flex;align-items:center;justify-content:center;overflow:hidden}
      .dkd-wrap canvas{display:block;touch-action:none;image-rendering:pixelated}
      .dkd-bar{display:flex;gap:6px;align-items:center;justify-content:space-between;padding:4px;background:#c0c0c0;border-top:2px solid #fff}
      .dkd-bar .btn{min-width:0;touch-action:manipulation}
      .dkd-side{display:flex;flex-direction:column;gap:4px;align-items:flex-start;min-width:0;flex:1}
      .dkd-side .btn{padding:4px 10px}
      .dkd-msg{font-size:11px;color:#000;min-width:0;overflow:hidden;text-overflow:ellipsis}
      .dkd-pad{display:grid;grid-template-columns:repeat(3,44px);grid-template-rows:repeat(2,40px);gap:3px;flex:none}
      .dkd-pad .btn{padding:0;font-size:16px;line-height:1}
      .dkd-pad [data-m=up]{grid-column:2;grid-row:1}.dkd-pad [data-m=left]{grid-column:1;grid-row:2}.dkd-pad [data-m=down]{grid-column:2;grid-row:2}.dkd-pad [data-m=right]{grid-column:3;grid-row:2}
      @media (pointer:coarse){.dkd-pad{grid-template-columns:repeat(3,58px);grid-template-rows:repeat(2,50px)}.dkd-side .btn{padding:10px 14px}}
      .dkd-ini{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.55)}
      .dkd-ini[hidden]{display:none}
      .dkd-ibox{padding:10px 16px;text-align:center;display:flex;flex-direction:column;gap:8px;color:#000}
      .dkd-ibox h3{margin:0;font:700 20px/1 "Arial Black",Impact,sans-serif;color:#006600}
      .dkd-slots{display:flex;gap:8px;justify-content:center}
      .dkd-slot{display:flex;flex-direction:column;gap:3px;align-items:center}
      .dkd-slot b{font:700 30px/1 "Courier New",monospace;background:#000;color:#ff5;width:40px;padding:4px 0;cursor:pointer}
      .dkd-slot b.on{outline:2px solid #5f5}
      .dkd-slot .btn{min-width:40px;padding:5px 0;touch-action:manipulation}
    `,
    open(W, api) {
      W.body.innerHTML = `<div class="dkd"><div class="dkd-wrap"><canvas aria-label="Duckling Dash game screen"></canvas><div class="dkd-ini" hidden></div></div>
        <div class="dkd-bar"><div class="dkd-side"><button class="btn" data-a="pause">Pause</button><span class="dkd-msg"></span></div>
        <div class="dkd-pad">${[['up', '&#9650;', 'Hop up'], ['left', '&#9664;', 'Hop left'], ['down', '&#9660;', 'Hop down'], ['right', '&#9654;', 'Hop right']].map(([m, t, l]) => `<button class="btn" data-m="${m}" aria-label="${l}">${t}</button>`).join('')}</div></div></div>`;
      const $ = s => W.body.querySelector(s);
      const wrap = $('.dkd-wrap'), cv = $('canvas'), g = cv.getContext('2d'), iniEl = $('.dkd-ini'), msgEl = $('.dkd-msg'), pauseB = $('[data-a=pause]');
      const buf = document.createElement('canvas'); buf.width = VW; buf.height = VH; const b = buf.getContext('2d');
      const SPR = { duck: [0, 1, 2, 3].map(q => rot(sprite(DUCK, PAL_DUCK), q)), lost: [0, 1, 2, 3].map(q => rot(sprite(DUCK, PAL_LOST), q)), mama: sprite(MAMA, PAL_MAMA), mamaR: rot(sprite(MAMA, PAL_MAMA), 1) };
      const DIRQ = { up: 0, right: 1, down: 2, left: 3 };

      let opts = Object.assign({ sound: true }, api.load('opts', {}));
      let hi = api.load('hi', null) || DEFAULT_HI.slice();
      let closed = false, raf = 0, last = 0, tt = 0, mode = 'title', paused = false, S = null, lastRank = -1, iniKey = null, overT = 0, ppx = 1;
      const snd = fn => { if (opts.sound) try { fn(); } catch (e) {} };
      const SND = {
        hop: () => snd(() => api.tone(880, 0.05, { to: 1320, type: 'square', vol: 0.025 })),
        quack: (p = 1) => snd(() => { [0, 0.13].forEach(at => { api.tone(420 * p, 0.09, { to: 300 * p, type: 'sawtooth', vol: 0.04, at }); api.noise(0.08, { ft: 'bandpass', f: 900 * p, q: 3, vol: 0.05, at }); }); }),
        bonk: () => snd(() => { api.tone(520, 0.08, { type: 'square', vol: 0.05 }); api.tone(420, 0.1, { type: 'square', vol: 0.05, at: 0.1 }); api.tone(900, 0.6, { to: 300, type: 'triangle', vol: 0.05, at: 0.2 }); }),
        splash: () => snd(() => { api.noise(0.5, { ft: 'lowpass', f: 1400, vol: 0.12, decay: 1 }); api.tone(600, 0.3, { to: 200, type: 'sine', vol: 0.05 }); }),
        wall: () => snd(() => api.tone(180, 0.07, { type: 'square', vol: 0.04 })),
        nest: () => snd(() => [0, 4, 7, 12].forEach((n, i) => api.tone(api.midi(72 + n), 0.09, { type: 'square', vol: 0.04, at: i * 0.08 }))),
        bug: () => snd(() => { [0, 0.07, 0.14].forEach(at => api.noise(0.04, { ft: 'highpass', f: 3000, vol: 0.08, decay: 1, at })); api.tone(1400, 0.1, { to: 2000, vol: 0.03, at: 0.2 }); }),
        rescue: () => snd(() => [0, 7, 12, 16, 19, 24].forEach((n, i) => api.tone(api.midi(67 + n), 0.08, { type: 'triangle', vol: 0.06, at: i * 0.07 }))),
        tick: () => snd(() => api.tone(1800, 0.03, { vol: 0.03 })),
        level: () => snd(() => [60, 64, 67, 72, 67, 72, 76].forEach((n, i) => api.tone(api.midi(n + 5), i === 6 ? 0.4 : 0.12, { type: 'square', vol: 0.045, at: i * 0.12 }))),
        start: () => snd(() => [67, 72, 76, 72, 79].forEach((n, i) => api.tone(api.midi(n), 0.1, { type: 'square', vol: 0.035, at: i * 0.1 }))),
        over: () => snd(() => [72, 67, 64, 60].forEach((n, i) => api.tone(api.midi(n), 0.28, { type: 'triangle', vol: 0.07, at: i * 0.25 }))),
        toot: () => snd(() => { api.tone(330, 0.25, { type: 'sine', vol: 0.05 }); api.tone(247, 0.35, { type: 'sine', vol: 0.05, at: 0.28 }); }),
        life: () => snd(() => [0, 4, 7, 12, 16].forEach((n, i) => api.tone(api.midi(76 + n), 0.07, { vol: 0.05, at: i * 0.06 })))
      };

      api.menubar([
        { label: 'Game', items: () => [
          { label: 'New game', fn: newGame },
          { label: paused ? 'Resume' : 'Pause', fn: togglePause, disabled: mode !== 'play' },
          { label: 'High scores', fn: () => api.msgBox('Duckling Dash', 'High scores:\n' + hi.map((h, i) => `${i + 1}. ${h.i}   ${h.s}   (level ${h.l || 1})`).join('\n')) },
          '-', { label: 'Exit', fn: () => api.close() }
        ] },
        { label: 'Options', items: () => [
          { label: (opts.sound ? '[x] ' : '[ ] ') + 'Sound effects', fn: () => { opts.sound = !opts.sound; api.save('opts', opts); } },
          { label: 'Reset high scores', fn: () => api.msgBox('Duckling Dash', 'Reset the high-score table?', ['Yes', 'No'], 'warn').then(bt => { if (bt === 'Yes') { hi = DEFAULT_HI.slice(); api.save('hi', hi); lastRank = -1; } }) }
        ] },
        { label: 'Help', items: [
          { label: 'How to play', fn: howTo },
          { label: 'About Duckling Dash', fn: () => api.msgBox('About Duckling Dash', 'Duckling Dash 1.0\nPuddlejump Software, 1990\n\nNo ducklings were harmed. They just needed naps.') }
        ] }
      ]);
      function howTo() {
        const was = mode === 'play' && !paused; if (was) togglePause();
        api.msgBox('How to play', 'Help Mama Duck get her ducklings home! Hop each duckling across the road and the river into one of the five nests at the top. Fill all five nests to clear the level.\n\n' +
          'CONTROLS\nArrow keys or W A S D to hop. P to pause.\nTouch: swipe on the screen, tap to hop forward, or use the arrow buttons.\n\n' +
          'THE ROAD\nDodge the cars, trucks, bikes and the street sweeper. A bump makes your duckling too dizzy to go on.\n\n' +
          'THE RIVER\nThe current is too strong for little ducklings, so hop on logs, lily pads, turtles and the friendly paddle boat. Watch out: some lily pads sink and some turtles dive! Later on a sleepy alligator floats by. You can ride on his back, but do not stand on his nose while he is awake.\n\n' +
          'BONUS\nEat bugs (+200). Find the lost gray duckling on the river and bring it to a nest (+500). Hurry: time left on the bar is bonus points too. Extra duckling every 10,000 points.\n\n' +
          'Each level you clear earns you $2 to $4.');
      }
      const msg = t => { msgEl.textContent = t; };

      /* ---------- setup ---------- */
      function buildLanes(L) {
        return laneSpecs(L).map(sp => {
          const lane = { row: sp.row, kind: sp.kind, dir: sp.dir, speed: sp.speed, items: [] };
          let pos = rnd(0, 3) * T | 0;
          sp.pat.forEach(([type, w, gap, flag], gi) => {
            const it = { type, w: w * T, pos, flag: !!flag, ph: rnd(0, 6), col: CAR_COLS[(sp.row * 3 + gi) % CAR_COLS.length], g: gi };
            lane.items.push(it);
            pos += (w + gap) * T;
          });
          return lane;
        });
      }
      function newGame() {
        iniEl.hidden = true; iniKey = null; paused = false; pauseB.textContent = 'Pause';
        S = { score: 0, lives: 5, level: 0, nextLife: 10000, pops: [], parts: [], nests: [], banner: null, bugT: 6, nestBug: null };
        mode = 'play'; lastRank = -1;
        nextLevel();
        msg(matchMedia('(pointer:coarse)').matches ? 'Swipe or use the arrows to hop.' : 'Arrow keys to hop. P pauses.');
      }
      function nextLevel() {
        S.level++;
        S.lanes = buildLanes(S.level);
        S.nests = [false, false, false, false, false];
        S.nestBug = null; S.bugT = rnd(5, 9); S.ladyT = rnd(4, 8);
        // a lost duckling waits on one of the logs
        const logs = [];
        S.lanes.forEach(l => l.items.forEach(it => { if (it.type === 'log' && it.w >= 3 * T) logs.push(it); }));
        if (logs.length && (S.level > 1 || Math.random() < 0.7)) { const it = logs[Math.floor(Math.random() * logs.length)]; it.lost = 8; }
        const news = { 2: 'Some turtles dive now!', 3: 'Watch out for the sleepy alligator!', 4: 'More traffic, and more divers!', 5: 'Two alligators snoozing!' }[S.level];
        S.banner = { text: 'LEVEL ' + S.level, sub: news || 'FILL ALL FIVE NESTS', t: 2.2 };
        spawnDuck(true);
      }
      function spawnDuck(first) {
        S.duck = { x: 6 * T, row: R_START, dir: 'up', state: 'ready', t: first ? 1.2 : 0.5, time: timeLimit(), best: R_START, hop: null, queue: null, follow: false, dead: null };
        SND.quack();
      }
      const timeLimit = () => Math.max(20, 32 - S.level * 2);

      /* ---------- helpers ---------- */
      const itemX = (lane, it) => { let x = ((it.pos % LOOP) + LOOP) % LOOP - OFF; return x; };
      function forEachDrawn(lane, fn) { lane.items.forEach(it => { const x = itemX(lane, it); fn(it, x); if (x + it.w > LOOP - OFF) fn(it, x - LOOP); }); }
      const laneAt = row => S.lanes.find(l => l.row === row);
      function phaseOf(it) {   // sinking lily pads, diving turtles and the dozing alligator run on little clocks
        if (it.type === 'gator') { const p = (tt * 0.9 + it.ph * 2) % 7; return p < 4.5 ? 'sleep' : p < 5.5 ? 'stir' : 'awake'; }
        if (!it.flag) return 'up';
        const p = (tt + it.ph) % 6.5;
        return p < 3.8 ? 'up' : p < 4.9 ? 'warn' : p < 6.1 ? 'under' : 'rise';
      }
      function support(cx) {   // what the duckling is standing on in the river, or null
        const lane = laneAt(S.duck.row);
        let hit = null;
        forEachDrawn(lane, (it, x) => {
          if (hit) return;
          if (cx < x + 3 || cx > x + it.w - 3) return;
          const ph = phaseOf(it);
          if ((it.type === 'lily' || it.type === 'turtle') && ph === 'under') return;
          hit = { it, x, ph };
        });
        return hit;
      }
      function pop(x, y, text, col = '#ffff55') { S.pops.push({ x, y, text, col, t: 1.2 }); }
      function addScore(n) {
        S.score += n;
        if (S.score >= S.nextLife) { S.nextLife += 10000; if (S.lives < 7) { S.lives++; SND.life(); pop(VW / 2, VH / 2, 'EXTRA DUCKLING!', '#55ff55'); } }
      }
      function burst(x, y, n, cols, sp = 50) { for (let i = 0; i < n; i++) { const a = rnd(0, 6.28), v = rnd(10, sp); S.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rnd(0.3, 0.8), c: cols[i % cols.length] }); } }

      /* ---------- moves ---------- */
      function move(dir) {
        if (mode === 'title') { newGame(); return; }
        if (mode !== 'play' || paused || !S.duck) return;
        const d = S.duck;
        if (d.state === 'hop') { d.queue = dir; return; }
        if (d.state !== 'idle' && d.state !== 'ready') return;
        d.dir = dir;
        let tx = d.x, tr = d.row;
        if (dir === 'left') tx -= T; else if (dir === 'right') tx += T; else if (dir === 'up') tr--; else tr++;
        if (tr > R_START) { SND.wall(); return; }
        if (tx < -2 || tx > VW - T + 2) { SND.wall(); return; }
        tx = clamp(tx, 0, VW - T);
        if (tr === R_NEST) {
          const cx = d.x + 8, ni = NESTS.findIndex(n => Math.abs(n - cx) <= 10);
          if (ni < 0 || S.nests[ni]) { SND.wall(); pop(cx, d.row * T - 2, ni < 0 ? 'REEDS!' : 'TAKEN!', '#ffffff'); return; }
          tx = NESTS[ni] - 8;
        }
        d.state = 'hop'; d.hop = { fx: d.x, fr: d.row, tx, tr, t: 0 };
        SND.hop();
      }
      function landed() {
        const d = S.duck, h = d.hop;
        d.x = h.tx; d.row = h.tr; d.hop = null; d.state = 'idle';
        const lane = laneAt(d.row);
        if (d.row === R_NEST) return reachNest();
        if (!lane || lane.kind === 'road') d.x = clamp(Math.round(d.x / T) * T, 0, VW - T);
        if (d.row < d.best) { d.best = d.row; addScore(10); }
        if (lane && lane.kind === 'river') {
          const s = support(d.x + 8);
          if (!s) return lose('water', 'Splash! The current is too strong for a duckling.');
          if (s.it.type === 'gator' && s.ph === 'awake' && onHead(s)) return lose('water', 'Oops! The alligator yawned and the duckling hopped off in a hurry.');
        }
        if (d.queue) { const q = d.queue; d.queue = null; move(q); }
      }
      function onHead(s) {
        const cx = S.duck.x + 8, lane = laneAt(S.duck.row);
        return lane.dir > 0 ? cx > s.x + s.it.w - T : cx < s.x + T;
      }
      function reachNest() {
        const d = S.duck, cx = d.x + 8, ni = NESTS.findIndex(n => Math.abs(n - cx) <= 10);
        S.nests[ni] = true;
        const tb = Math.floor(d.time) * 10;
        addScore(50 + tb);
        pop(cx, T * 2.3, '+' + (50 + tb));
        if (S.nestBug && S.nestBug.i === ni) { addScore(200); pop(cx, T * 3.2, 'YUM! +200', '#55ff55'); SND.bug(); S.nestBug = null; }
        if (d.follow) { addScore(500); pop(cx, T * 4, 'RESCUED! +500', '#55ffff'); SND.rescue(); }
        else SND.nest();
        burst(cx, T * 1.5, 14, ['#ffff55', '#ffffff', '#ffcc00']);
        d.state = 'home'; d.t = 0.6;
        if (S.nests.every(Boolean)) levelClear();
      }
      function levelClear() {
        addScore(1000);
        const dollars = Math.min(4, 1 + S.level);
        api.earn(dollars, 'clearing level ' + S.level + ' of Duckling Dash');
        S.banner = { text: 'LEVEL ' + S.level + ' CLEAR!', sub: '+1000 BONUS   +$' + dollars, t: 2.8 };
        S.clearT = 2.8;
        SND.level();
        msg('Level ' + S.level + ' cleared! You earned $' + dollars + '.');
      }
      function lose(reason, text) {
        const d = S.duck;
        if (d.state === 'dead') return;
        d.state = 'dead'; d.dead = { reason, t: 0 }; d.hop = null; d.queue = null;
        if (d.follow) { d.follow = false; restoreLost(); }
        if (reason === 'water') { SND.splash(); burst(d.x + 8, d.row * T + 8, 16, ['#ffffff', '#aaddff', '#55aaff'], 40); }
        else if (reason === 'bonk') SND.bonk();
        else SND.over();
        msg(text);
      }
      function restoreLost() {
        const logs = []; S.lanes.forEach(l => l.items.forEach(it => { if (it.type === 'log' && it.w >= 3 * T) logs.push(it); }));
        if (logs.length) logs[Math.floor(Math.random() * logs.length)].lost = 8;
      }
      function afterDeath() {
        S.lives--;
        if (S.lives <= 0) return gameOver();
        spawnDuck(false);
      }

      /* ---------- update ---------- */
      function update(dt) {
        S.lanes.forEach(l => l.items.forEach(it => { it.pos += l.dir * l.speed * dt; }));
        S.pops.forEach(p => { p.t -= dt; p.y -= 12 * dt; }); S.pops = S.pops.filter(p => p.t > 0);
        S.parts.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }); S.parts = S.parts.filter(p => p.life > 0);
        if (S.banner && (S.banner.t -= dt) <= 0) S.banner = null;
        if (mode !== 'play') return;
        // boat toots now and then
        if (Math.random() < dt * 0.06) SND.toot();
        // bonus bug in an empty nest
        if (S.nestBug) { if ((S.nestBug.t -= dt) <= 0) { S.nestBug = null; S.bugT = rnd(6, 11); } }
        else if ((S.bugT -= dt) <= 0) { const free = S.nests.map((f, i) => f ? -1 : i).filter(i => i >= 0 && !(S.duck && S.duck.row === R_NEST)); if (free.length) S.nestBug = { i: free[Math.floor(Math.random() * free.length)], t: 5 }; S.bugT = rnd(6, 11); }
        // ladybug riding a log
        if ((S.ladyT -= dt) <= 0) {
          S.ladyT = rnd(9, 14);
          const logs = []; S.lanes.forEach(l => l.items.forEach(it => { if (it.type === 'log' && !it.bug) logs.push(it); }));
          if (logs.length) logs[Math.floor(Math.random() * logs.length)].bug = { off: rnd(4, 20), t: 9 };
        }
        S.lanes.forEach(l => l.items.forEach(it => { if (it.bug && (it.bug.t -= dt) <= 0) it.bug = null; }));
        if (S.clearT > 0) { S.clearT -= dt; if (S.clearT <= 0) nextLevel(); return; }
        const d = S.duck;
        if (!d) return;
        if (d.state === 'ready') { d.t -= dt; if (d.t <= 0) d.state = 'idle'; }
        if (d.state === 'dead') { d.dead.t += dt; if (d.dead.reason === 'water') d.x += (laneAt(d.row) ? laneAt(d.row).dir * laneAt(d.row).speed : 0) * dt * 0.6; if (d.dead.t > 1.5) afterDeath(); return; }
        if (d.state === 'home') { d.t -= dt; if (d.t <= 0 && !(S.clearT > 0)) spawnDuck(false); return; }
        // timer
        const before = d.time;
        d.time -= dt;
        if (d.time < 5 && Math.floor(before) !== Math.floor(d.time)) SND.tick();
        if (d.time <= 0) { d.time = 0; return lose('time', 'Too slow! That duckling needs a nap.'); }
        if (d.state === 'hop') {
          d.hop.t += dt / 0.11;
          const lane = laneAt(d.hop.fr);
          if (lane && lane.kind === 'river' && d.hop.fr === d.hop.tr) d.hop.tx += lane.dir * lane.speed * dt;
          if (d.hop.t >= 1) landed();
        } else if (d.state === 'idle') {
          const lane = laneAt(d.row);
          if (lane && lane.kind === 'river') {
            const s = support(d.x + 8);
            if (!s) return lose('water', s === null ? 'Splash! Swept into the rapids.' : '');
            d.x += lane.dir * lane.speed * dt;
            if (d.x + 8 < 0 || d.x + 8 > VW) return lose('water', 'Whoosh! Carried off down the river.');
            if (s.it.type === 'gator' && s.ph === 'awake' && onHead(s)) return lose('water', 'The alligator woke up with a big yawn, and the duckling jumped in fright.');
            if ((s.it.type === 'lily' || s.it.type === 'turtle') && s.ph === 'under') return lose('water', 'Splash! It went under.');
            if (s.it.lost !== undefined && s.it.lost !== null && !d.follow && Math.abs(d.x + 8 - (s.x + s.it.lost + 6)) < 14) { d.follow = true; s.it.lost = null; SND.quack(1.4); pop(d.x + 8, d.row * T, 'FOUND ME!', '#55ffff'); msg('You found the lost duckling! Bring it to a nest.'); }
            if (s.it.bug && Math.abs(d.x + 8 - (s.x + s.it.bug.off + 4)) < 10) { s.it.bug = null; addScore(200); SND.bug(); pop(d.x + 8, d.row * T, '+200', '#55ff55'); }
          }
        }
        // traffic
        const r = d.hop ? (d.hop.t < 0.5 ? d.hop.fr : d.hop.tr) : d.row;
        const lane = laneAt(r);
        if (lane && lane.kind === 'road') {
          const dx = d.hop ? d.hop.fx + (d.hop.tx - d.hop.fx) * Math.min(1, d.hop.t) : d.x;
          forEachDrawn(lane, (it, x) => { if (d.state !== 'dead' && dx + 13 > x + 2 && dx + 3 < x + it.w - 2) lose('bonk', 'Bonk! ' + ({ car: 'A car', truck: 'A truck', bike: 'A bike', sweeper: 'The street sweeper' })[it.type] + ' bumped the duckling. Time for a nap.'); });
        }
      }
      function gameOver() {
        mode = 'over'; overT = 3.2; S.duck = null;
        SND.over();
        S.banner = { text: 'GAME OVER', sub: 'SCORE ' + S.score, t: 3.2 };
        msg('All the ducklings are napping. Final score: ' + S.score);
      }
      function afterGameOver() {
        if (S.score > 0 && (hi.length < 8 || S.score > hi[hi.length - 1].s)) askInitials(S.score, S.level);
        else toTitle();
      }
      function toTitle() { mode = 'title'; iniEl.hidden = true; iniKey = null; paused = false; pauseB.textContent = 'Pause'; msg('Press Space or tap to start.'); }
      function togglePause() {
        if (mode !== 'play') return;
        paused = !paused; pauseB.textContent = paused ? 'Resume' : 'Pause';
      }
      function askInitials(score, level) {
        mode = 'ini';
        const ini = (api.user || '').toUpperCase().replace(/[^A-Z]/g, '').padEnd(3, 'A').slice(0, 3).split('');
        let slot = 0;
        const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        iniEl.innerHTML = `<div class="dkd-ibox raised"><h3>NEW HIGH SCORE!</h3><div><b>${score}</b> points, level ${level}</div><div>Enter your initials:</div><div class="dkd-slots">${[0, 1, 2].map(i => `<div class="dkd-slot"><button class="btn" data-u="${i}" aria-label="Next letter">&#9650;</button><b data-s="${i}"></b><button class="btn" data-d="${i}" aria-label="Previous letter">&#9660;</button></div>`).join('')}</div><button class="btn" data-ok><b>OK</b></button></div>`;
        iniEl.hidden = false;
        const draw = () => iniEl.querySelectorAll('[data-s]').forEach((el, i) => { el.textContent = ini[i]; el.classList.toggle('on', i === slot); });
        const bump = (i, dd) => { ini[i] = A[(A.indexOf(ini[i]) + dd + 26) % 26]; slot = i; draw(); snd(() => api.tone(880, 0.03, { vol: 0.03 })); };
        const done = () => {
          const e = { i: ini.join(''), s: score, l: level };
          hi.push(e); hi.sort((a, c) => c.s - a.s); hi = hi.slice(0, 8); api.save('hi', hi);
          lastRank = hi.indexOf(e);
          SND.life();
          toTitle();
        };
        iniEl.querySelectorAll('[data-u]').forEach(el => el.onclick = () => bump(+el.dataset.u, 1));
        iniEl.querySelectorAll('[data-d]').forEach(el => el.onclick = () => bump(+el.dataset.d, -1));
        iniEl.querySelectorAll('[data-s]').forEach(el => el.onclick = () => { slot = +el.dataset.s; draw(); });
        iniEl.querySelector('[data-ok]').onclick = done;
        iniKey = e => {
          const k = e.key;
          if (/^[a-z]$/i.test(k)) { ini[slot] = k.toUpperCase(); slot = Math.min(2, slot + 1); draw(); }
          else if (k === 'ArrowUp') bump(slot, 1);
          else if (k === 'ArrowDown') bump(slot, -1);
          else if (k === 'ArrowLeft' || k === 'Backspace') { slot = Math.max(0, slot - 1); draw(); }
          else if (k === 'ArrowRight') { slot = Math.min(2, slot + 1); draw(); }
          else if (k === 'Enter') done();
          else return;
          e.preventDefault();
        };
        draw();
        msg('Enter your initials');
      }

      /* ---------- drawing ---------- */
      const R = (x, y, w, h, c) => { b.fillStyle = c; b.fillRect(Math.round(x), Math.round(y), w, h); };
      function drawBackground() {
        // top reeds and pond with nests
        R(0, 0, VW, T, '#000');
        R(0, T, VW, T, '#00aa00');
        for (let x = 0; x < VW; x += 4) { R(x + 1, T + 2 + (x % 8 ? 2 : 0), 1, 10, '#005500'); if (x % 12 === 0) R(x + 1, T + 1, 2, 4, '#aa5500'); }
        NESTS.forEach((n, i) => {
          R(n - 11, T + 1, 22, 14, '#00aaaa');
          R(n - 9, T + 3, 18, 10, '#8b5a2b'); R(n - 7, T + 5, 14, 6, '#5c3a1a');
          R(n - 9, T + 3, 18, 1, '#c08850'); R(n - 9, T + 12, 18, 1, '#c08850');
          if (S.nests[i]) b.drawImage(SPR.duck[0], n - 6, T + 2);
          if (S.nestBug && S.nestBug.i === i) drawBug(n - 3, T + 6, '#55ffff');
        });
        // river
        R(0, 2 * T, VW, 5 * T, '#0044aa');
        for (let r = 2; r <= 6; r++) {
          const lane = laneAt(r), off = ((tt * lane.speed * lane.dir * 0.6) % 32 + 32) % 32;
          for (let x = -32; x < VW + 32; x += 32) { R(x + off + (r % 2) * 13, r * T + 4 + (r % 3), 6, 1, '#3c78d8'); R(x + off + 18, r * T + 11, 4, 1, '#5590ee'); }
        }
        // middle bank
        R(0, R_BANK * T, VW, T, '#55aa55');
        for (let x = 0; x < VW; x += 8) { R(x + 2, R_BANK * T + 3 + (x % 16 ? 6 : 0), 1, 2, '#338833'); if (x % 40 === 8) { R(x, R_BANK * T + 5, 2, 2, '#ffff55'); } if (x % 40 === 24) R(x, R_BANK * T + 10, 2, 2, '#ff55ff'); }
        R(0, R_BANK * T, VW, 1, '#88dd88'); R(0, R_BANK * T + T - 1, VW, 1, '#aaaaaa');
        // road
        R(0, 8 * T, VW, 5 * T, '#3c3c3c');
        for (let r = 9; r <= 12; r++) for (let x = 2; x < VW; x += 16) R(x, r * T, 8, 1, '#ffffff');
        R(0, 8 * T, VW, 1, '#707070');
        // start sidewalk
        R(0, R_START * T, VW, T, '#aaaaaa');
        for (let x = 0; x < VW; x += 16) R(x, R_START * T, 1, T, '#8a8a8a');
        R(0, R_START * T, VW, 1, '#dddddd');
        R(0, 14 * T, VW, T, '#000');
      }
      function drawBug(x, y, wing) {
        const f = (tt * 12 | 0) % 2;
        R(x + 2, y, 3, 5, '#202020'); R(x + 3, y - 1, 1, 1, '#202020');
        R(x - (f ? 1 : 0), y + 1, 2, 2, wing); R(x + 5 + (f ? 1 : 0), y + 1, 2, 2, wing);
      }
      function drawItem(lane, it, x) {
        const y = lane.row * T, dir = lane.dir, w = it.w, ph = phaseOf(it);
        const F = (xx, yy, ww, hh, c) => R(dir > 0 ? x + xx : x + w - xx - ww, y + yy, ww, hh, c);   // draw facing travel direction
        switch (it.type) {
          case 'car': {
            F(2, 1, 3, 2, '#111'); F(10, 1, 3, 2, '#111'); F(2, 13, 3, 2, '#111'); F(10, 13, 3, 2, '#111');
            F(1, 3, 14, 10, it.col); F(5, 4, 6, 8, '#000000'); F(6, 5, 4, 6, it.col); F(11, 4, 2, 8, '#aaffff'); F(3, 4, 1, 8, '#aaffff');
            F(15, 4, 1, 2, '#ffff55'); F(15, 10, 1, 2, '#ffff55'); break;
          }
          case 'truck': {
            for (let i = 4; i < w - 4; i += 10) { F(i, 1, 4, 2, '#111'); F(i, 13, 4, 2, '#111'); }
            F(0, 2, w - 12, 12, '#dddddd'); F(1, 3, w - 14, 10, '#f0f0f0'); F(3, 7, w - 18, 2, it.col);
            F(w - 11, 3, 10, 10, it.col); F(w - 4, 4, 2, 8, '#aaffff'); F(w - 1, 4, 1, 2, '#ffff55'); F(w - 1, 10, 1, 2, '#ffff55'); break;
          }
          case 'bike': {
            F(1, 7, 4, 2, '#111'); F(11, 7, 4, 2, '#111'); F(3, 8, 10, 1, '#aaaaaa');
            F(6, 4, 4, 8, it.col); F(8, 5, 4, 6, '#ffcc88'); F(8, 6, 3, 4, '#ffff55'); F(12, 5, 1, 1, '#aaaaaa'); F(12, 10, 1, 1, '#aaaaaa'); break;
          }
          case 'sweeper': {
            F(2, 2, w - 10, 12, '#ff8800'); F(4, 3, 8, 10, '#ffaa33'); F(w - 14, 4, 5, 8, '#aaffff'); F(2, 7, w - 10, 1, '#aa5500');
            F(5, 5, 2, 2, '#ffff55');
            // spinning brushes at the front
            const a = tt * 14 * dir;
            [4, 12].forEach(cy => { const cx = dir > 0 ? x + w - 4 : x + 4; R(cx - 3, y + cy - 3, 7, 7, '#886644'); for (let k = 0; k < 2; k++) { const aa = a + k * Math.PI / 2; R(cx + Math.round(Math.cos(aa) * 3), y + cy + Math.round(Math.sin(aa) * 3), 1, 1, '#ffee99'); R(cx - Math.round(Math.cos(aa) * 3), y + cy - Math.round(Math.sin(aa) * 3), 1, 1, '#ffee99'); } });
            if ((tt * 8 | 0) % 2) { R(dir > 0 ? x + w + 1 : x - 2, y + 2, 1, 1, '#aaddff'); R(dir > 0 ? x + w + 2 : x - 3, y + 13, 1, 1, '#aaddff'); }
            break;
          }
          case 'log': {
            R(x + 1, y + 2, w - 2, 12, '#aa5500'); R(x + 1, y + 2, w - 2, 1, '#cc7722'); R(x + 1, y + 13, w - 2, 1, '#6b3a10');
            for (let i = 6; i < w - 6; i += 11) R(x + i, y + 6 + (i % 3), 5, 1, '#6b3a10');
            R(x, y + 3, 3, 10, '#d09050'); R(x + 1, y + 6, 1, 4, '#aa6a30'); R(x + w - 3, y + 3, 3, 10, '#d09050'); R(x + w - 2, y + 6, 1, 4, '#aa6a30');
            if (it.bug) { const bx = x + it.bug.off; R(bx, y + 5, 5, 4, '#ff2020'); R(bx + 2, y + 5, 1, 4, '#000'); R(bx + (dir > 0 ? 5 : -1), y + 6, 1, 2, '#000'); R(bx + 1, y + 6, 1, 1, '#000'); R(bx + 3, y + 7, 1, 1, '#000'); }
            if (it.lost !== undefined && it.lost !== null) { const bob = Math.round(Math.sin(tt * 4)); b.drawImage(SPR.lost[dir > 0 ? 1 : 3], x + it.lost, y + 2 + bob); if ((tt * 2 | 0) % 2) text8('?', x + it.lost + 6, y - 1); }
            break;
          }
          case 'lily': {
            for (let i = 0; i < w; i += T) {
              const cx = x + i + 8, cy = y + 8;
              if (ph === 'under') { if ((tt * 4 | 0) % 2) { b.strokeStyle = '#5590ee'; b.strokeRect(cx - 4.5, cy - 2.5, 9, 5); } continue; }
              const col = ph === 'warn' && (tt * 8 | 0) % 2 ? '#88ee88' : ph === 'rise' ? '#227722' : '#22aa22';
              b.fillStyle = col; b.beginPath(); b.arc(cx, cy, ph === 'rise' ? 4 : 7, 0, 6.28); b.fill();
              if (ph !== 'rise') { R(cx, cy - 7, 1, 7, '#0044aa'); R(cx + 1, cy - 6, 1, 5, '#0044aa'); }
              if (i === 0 && ph === 'up') { R(cx - 3, cy + 1, 3, 3, '#ff88cc'); R(cx - 2, cy + 2, 1, 1, '#ffff55'); }
            }
            break;
          }
          case 'turtle': {
            for (let i = 0; i < w; i += T) {
              const cx = x + i + 8, cy = y + 8;
              if (ph === 'under') { if ((tt * 5 + i | 0) % 3 === 0) R(cx, cy - 2, 2, 2, '#aaddff'); continue; }
              const sunk = ph === 'warn' || ph === 'rise';
              const pad = Math.round(Math.sin(tt * 8 + i) * 1);
              R(cx + (dir > 0 ? 6 : -9), cy - 2, 3, 4, sunk ? '#447744' : '#88cc44');
              [-5, 3].forEach(lx => { R(cx + lx, cy - 7 + pad, 2, 2, sunk ? '#447744' : '#88cc44'); R(cx + lx, cy + 5 - pad, 2, 2, sunk ? '#447744' : '#88cc44'); });
              b.fillStyle = sunk ? '#1a5a3a' : '#008800'; b.beginPath(); b.ellipse(cx, cy, 6, 5, 0, 0, 6.28); b.fill();
              if (!sunk) { R(cx - 2, cy - 2, 4, 4, '#55ff55'); R(cx - 4, cy - 1, 1, 2, '#55cc55'); R(cx + 3, cy - 1, 1, 2, '#55cc55'); }
            }
            break;
          }
          case 'boat': {
            F(1, 2, w - 8, 12, '#ffffff'); F(w - 7, 3, 3, 10, '#ffffff'); F(w - 4, 5, 2, 6, '#ffffff'); F(w - 2, 7, 1, 2, '#ffffff');
            F(1, 12, w - 6, 2, '#ff5555'); F(1, 2, w - 6, 1, '#ff5555');
            F(6, 4, 18, 7, '#5555ff'); F(8, 6, 3, 3, '#aaffff'); F(13, 6, 3, 3, '#aaffff'); F(18, 6, 3, 3, '#aaffff');
            F(28, 5, 4, 5, '#ffff55'); F(29, 4, 2, 1, '#000');
            // paddle wheel at the back
            const pw = (tt * 10 | 0) % 2; F(0, 3 + pw, 1, 10 - pw * 2, '#aa5500');
            if ((tt * 1.5 | 0) % 3 === 0) { const sx = dir > 0 ? x + 29 : x + w - 32; R(sx - (tt * 6 % 6) * dir, y - 2, 3, 2, '#dddddd'); }
            break;
          }
          case 'gator': {
            const breathe = Math.round(Math.sin(tt * 2) * 0.6);
            F(0, 6, 6, 4, '#2c7c2c'); F(5, 3 - breathe, w - 18, 10 + breathe * 2, '#3c9c3c');
            for (let i = 8; i < w - 16; i += 6) F(i, 4 - breathe, 3, 2, '#2c6c2c');
            F(8, 12, 4, 3, '#2c7c2c'); F(w - 22, 12, 4, 3, '#2c7c2c'); F(8, 1, 4, 3, '#2c7c2c'); F(w - 22, 1, 4, 3, '#2c7c2c');
            // head and friendly round snout
            F(w - 14, 3, 8, 10, '#3c9c3c'); F(w - 7, 4, 6, 8, '#4cac4c'); F(w - 2, 5, 1, 6, '#4cac4c'); F(w - 2, 6, 1, 1, '#1c4c1c'); F(w - 2, 9, 1, 1, '#1c4c1c');
            if (ph === 'awake') { F(w - 6, 6, 5, 4, '#ff99aa'); F(w - 6, 7, 3, 2, '#ff6688'); }
            [4, 10].forEach(ey => {
              if (ph === 'sleep' || (ph === 'stir' && ey === 10)) F(w - 12, ey, 3, 1, '#1c4c1c');
              else { F(w - 12, ey - 1, 3, 3, '#ffffff'); F(w - 11, ey, 1, 1, '#000'); }
            });
            if (ph === 'sleep') { const zt = (tt * 0.8 + it.ph) % 1; text8('z', (dir > 0 ? x + w - 10 : x + 10) + zt * 4, y - 1 - zt * 6, zt < 0.8 ? '#ffffff' : '#aaaaaa'); }
            break;
          }
        }
      }
      // tiny text drawn later on the high-res layer
      let smalls = [];
      function text8(t, x, y, col = '#ffffff') { smalls.push([t, x, y, col]); }
      function drawDuck() {
        const d = S.duck; if (!d) return;
        let x = d.x, y = d.row * T, sc = 1;
        if (d.hop) { const k = Math.min(1, d.hop.t); x = d.hop.fx + (d.hop.tx - d.hop.fx) * k; y = (d.hop.fr + (d.hop.tr - d.hop.fr) * k) * T; sc = 1 + Math.sin(k * Math.PI) * 0.25; }
        if (d.state === 'home') return;
        const spr = SPR.duck[DIRQ[d.dir]];
        if (d.state === 'dead') {
          const t = d.dead.t;
          if (d.dead.reason === 'water') {
            if (t < 0.9) { const s = 1 - t; b.save(); b.translate(x + 8, y + 8); b.rotate(t * 9); b.scale(s, s); b.drawImage(spr, -6, -6); b.restore(); }
            b.strokeStyle = '#aaddff'; b.beginPath(); b.ellipse(x + 8, y + 8, 3 + t * 8, 2 + t * 4, 0, 0, 6.28); b.stroke();
          } else if (d.dead.reason === 'bonk') {
            b.save(); b.translate(x + 8, y + 8); b.rotate(Math.sin(t * 20) * 0.5); b.drawImage(spr, -6, -6); b.restore();
            for (let i = 0; i < 3; i++) { const a = t * 6 + i * 2.1; R(x + 8 + Math.cos(a) * 8, y + 2 + Math.sin(a) * 3, 2, 2, '#ffff55'); }
          } else {
            b.drawImage(spr, x + 2, y + 2);
            text8('z', x + 13 + t * 3, y - t * 5); if (t > 0.5) text8('Z', x + 16 + t * 3, y - 4 - t * 5);
          }
          return;
        }
        if (d.follow) b.drawImage(SPR.lost[DIRQ[d.dir]], Math.round(x + 2 - (d.dir === 'right' ? 7 : d.dir === 'left' ? -7 : 0)), Math.round(y + 2 + (d.dir === 'up' ? 7 : d.dir === 'down' ? -7 : 0)));
        if (sc > 1) { R(x + 5, y + 12, 6, 2, 'rgba(0,0,0,.35)'); }
        const s = 12 * sc;
        if (d.state === 'ready' && (tt * 10 | 0) % 2) return;
        b.drawImage(spr, Math.round(x + 8 - s / 2), Math.round(y + 8 - s / 2 - (sc - 1) * 10), Math.round(s), Math.round(s));
      }
      function drawMama() {
        const y = R_START * T, bob = S && S.duck && S.duck.state === 'ready' ? Math.round(Math.sin(tt * 18)) : 0;
        b.drawImage(SPR.mamaR, 0, y + 1 + bob);
        const spare = S ? Math.max(0, S.lives - 1) : 3;
        for (let i = 0; i < Math.min(5, spare); i++) b.drawImage(SPR.duck[1], 17 + i * 10, y + 3 + ((tt * 3 + i) % 2 < 1 ? 0 : 1), 10, 10);
      }
      function text(t, x, y, size, col, align = 'center', bold = true) {
        g.font = FONT(size, bold); g.textAlign = align; g.textBaseline = 'middle';
        g.fillStyle = '#000'; g.fillText(t, x + 0.8, y + 0.8);
        g.fillStyle = col; g.fillText(t, x, y);
      }
      const pad6 = n => String(n).padStart(6, '0');
      function drawHud() {
        text('SCORE ' + pad6(S.score), 3, 8, 9, '#ffffff', 'left');
        text('HI ' + pad6(Math.max(S.score, hi[0] ? hi[0].s : 0)), VW - 3, 8, 9, '#ffff55', 'right');
        const y = 14 * T + 8;
        text('LEVEL ' + S.level, 3, y, 9, '#55ffff', 'left');
        text('TIME', 92, y, 8, '#ffffff', 'right');
        const d = S.duck, frac = d ? clamp(d.time / timeLimit(), 0, 1) : 0;
        g.fillStyle = '#333'; g.fillRect(96, y - 3, VW - 100, 6);
        g.fillStyle = frac < 0.25 ? ((tt * 6 | 0) % 2 ? '#ff5555' : '#aa0000') : frac < 0.5 ? '#ffff55' : '#55ff55';
        g.fillRect(96, y - 3, (VW - 100) * frac, 6);
      }
      function drawTitle() {
        b.fillStyle = '#000'; b.fillRect(0, 0, VW, VH);
        // soft pond scene
        R(0, 150, VW, 90, '#0044aa'); R(0, 146, VW, 4, '#55aa55');
        for (let i = 0; i < 10; i++) R((i * 37 + tt * 8) % (VW + 20) - 10, 160 + (i % 4) * 18, 8, 1, '#3c78d8');
        // parade: mama and ducklings waddling across
        const px = ((tt * 22) % (VW + 90)) - 70;
        b.drawImage(SPR.mamaR, Math.round(px + 50), 128 + Math.round(Math.abs(Math.sin(tt * 6)) * -2));
        for (let i = 0; i < 4; i++) b.drawImage(SPR.duck[1], Math.round(px + 36 - i * 12), 132 + Math.round(Math.abs(Math.sin(tt * 8 + i)) * -2));
      }
      function drawTitleText() {
        g.save(); g.font = 'italic 900 28px Impact, "Arial Black", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        const gr = g.createLinearGradient(0, 14, 0, 58); gr.addColorStop(0, '#ffffaa'); gr.addColorStop(0.5, '#ffdd00'); gr.addColorStop(1, '#ff8800');
        g.lineWidth = 3; g.strokeStyle = '#003300';
        g.strokeText('DUCKLING', VW / 2, 24); g.fillStyle = gr; g.fillText('DUCKLING', VW / 2, 24);
        g.strokeText('DASH', VW / 2, 52); g.fillText('DASH', VW / 2, 52);
        g.restore();
        text('- HIGH SCORES -', VW / 2, 76, 8, '#55ff55');
        hi.slice(0, 5).forEach((h, i) => text(`${i + 1}. ${h.i}  ${pad6(h.s)}`, VW / 2, 88 + i * 9, 8, i === lastRank ? ((tt * 4 | 0) % 2 ? '#ffff55' : '#ffffff') : '#aabbcc'));
        if ((tt * 2 | 0) % 2 === 0) text('PRESS SPACE OR TAP TO START', VW / 2, 178, 8, '#ffffff');
        text('ARROW KEYS OR SWIPE TO HOP', VW / 2, 196, 7, '#88aacc');
        text('(C) 1990 PUDDLEJUMP SOFTWARE', VW / 2, 228, 7, '#6688aa');
      }
      function draw() {
        g.setTransform(1, 0, 0, 1, 0, 0);
        b.imageSmoothingEnabled = false; g.imageSmoothingEnabled = false;
        smalls = [];
        if (mode === 'title' || !S) drawTitle();
        else {
          drawBackground();
          S.lanes.forEach(l => forEachDrawn(l, (it, x) => { if (x < VW && x + it.w > 0) drawItem(l, it, x); }));
          drawMama();
          drawDuck();
          S.parts.forEach(p => R(p.x, p.y, 1, 1, p.c));
        }
        g.drawImage(buf, 0, 0, cv.width, cv.height);
        g.setTransform(cv.width / VW, 0, 0, cv.height / VH, 0, 0);
        if (mode === 'title' || !S) { drawTitleText(); return; }
        smalls.forEach(([t, x, y, c]) => text(t, x, y, 7, c));
        drawHud();
        S.pops.forEach(p => text(p.text, clamp(p.x, 30, VW - 30), p.y, 8, p.col));
        if (S.banner) { text(S.banner.text, VW / 2, VH * 0.46, 16, S.banner.text === 'GAME OVER' ? '#ff5555' : '#ffff55'); if (S.banner.sub) text(S.banner.sub, VW / 2, VH * 0.46 + 15, 8, '#ffffff'); }
        if (paused) { g.fillStyle = 'rgba(0,0,20,.6)'; g.fillRect(0, 0, VW, VH); text('PAUSED', VW / 2, VH * 0.45, 18, '#ffff55'); text('PRESS P OR TAP TO RESUME', VW / 2, VH * 0.45 + 17, 8, '#ffffff'); }
      }
      function frame(now) {
        if (closed) return;
        raf = requestAnimationFrame(frame);
        let dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
        if (mode === 'play' && !paused && !W.el.classList.contains('active')) togglePause();
        if (mode === 'play' && paused) dt = 0;
        tt += dt;
        if (S && (mode === 'play' || mode === 'over') && dt > 0) {
          update(dt);
          if (mode === 'over' && (overT -= dt) <= 0) afterGameOver();
        }
        draw();
      }
      function fit() {
        const cw = Math.max(100, wrap.clientWidth), ch = Math.max(100, wrap.clientHeight);
        const sc = Math.min(cw / VW, ch / VH), dpr = window.devicePixelRatio || 1;
        cv.style.width = Math.floor(VW * sc) + 'px'; cv.style.height = Math.floor(VH * sc) + 'px';
        cv.width = Math.max(1, Math.round(VW * sc * dpr)); cv.height = Math.max(1, Math.round(VH * sc * dpr));
        ppx = cv.width / VW;
      }

      /* ---------- input ---------- */
      const KEYS = { arrowup: 'up', w: 'up', arrowdown: 'down', s: 'down', arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right' };
      W.onKey = e => {
        if (mode === 'ini') { if (iniKey) iniKey(e); return; }
        const k = e.key.toLowerCase();
        if (k === 'p') { e.preventDefault(); togglePause(); return; }
        if (mode === 'title') { if (k === ' ' || k === 'enter') { e.preventDefault(); newGame(); } return; }
        if (paused) { if (k === 'enter' || k === ' ') { e.preventDefault(); togglePause(); } return; }
        if (KEYS[k]) { e.preventDefault(); if (!e.repeat || (S && S.duck && S.duck.state === 'idle')) move(KEYS[k]); }
      };
      let sw = null;
      cv.addEventListener('pointerdown', e => {
        e.preventDefault();
        if (mode === 'title') { newGame(); return; }
        if (mode !== 'play') return;
        if (paused) { togglePause(); return; }
        sw = { id: e.pointerId, x: e.clientX, y: e.clientY, done: false };
        try { cv.setPointerCapture(e.pointerId); } catch (err) {}
      });
      cv.addEventListener('pointermove', e => {
        if (!sw || sw.id !== e.pointerId || sw.done) return;
        const dx = e.clientX - sw.x, dy = e.clientY - sw.y;
        if (Math.max(Math.abs(dx), Math.abs(dy)) > 22) { sw.done = true; move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up')); }
      });
      cv.addEventListener('pointerup', e => { if (sw && sw.id === e.pointerId && !sw.done) move('up'); sw = null; });
      cv.addEventListener('pointercancel', () => { sw = null; });
      let hold = null;
      W.body.querySelectorAll('[data-m]').forEach(bt => {
        bt.addEventListener('pointerdown', e => {
          e.preventDefault(); move(bt.dataset.m);
          clearInterval(hold); let n = 0;
          hold = setInterval(() => { if (++n > 2) move(bt.dataset.m); }, 90);
        });
        ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => bt.addEventListener(ev, () => { clearInterval(hold); hold = null; }));
        bt.addEventListener('click', e => { if (e.detail === 0) move(bt.dataset.m); });   // keyboard activation
      });
      pauseB.addEventListener('click', () => { if (mode === 'play') togglePause(); else if (mode === 'title') newGame(); });

      W.onMin = () => { if (mode === 'play' && !paused) togglePause(); clearInterval(hold); };
      W.onResize = fit;
      W.onClose = () => { closed = true; cancelAnimationFrame(raf); raf = 0; clearInterval(hold); };
      fit();
      toTitle();
      requestAnimationFrame(t => { last = t; fit(); frame(t); });
    }
  });
})();
