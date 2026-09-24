/* Cheese Chase: a store maze game (1985). You are a mouse nibbling cheese crumbs through eight pantry mazes
   while four cats patrol. Each cat has its own habit: Bruno chases, Slink cuts you off, Patches wanders and
   Mittens is shy. Eat a big wedge of cheese and the cats get scared: bump into one to send it back to its basket.
   Drawn as an 80-column (or 40-column on narrow screens) text-mode screen with a custom character set. It keeps
   the text-mode look in every year: green (or amber) phosphor in 1985, 16-color text mode after that. */
(function () {
  'use strict';
  const MW = 19, MH = 21;
  const CGA = ['#000000', '#0000aa', '#00aa00', '#00aaaa', '#aa0000', '#aa00aa', '#aa5500', '#aaaaaa', '#555555', '#5555ff', '#55ff55', '#55ffff', '#ff5555', '#ff55ff', '#ffff55', '#ffffff'];
  const MONO = [0, 0.7, 0.7, 0.7, 0.7, 0.7, 0.7, 0.75, 0.45, 1, 1, 1, 1, 1, 1, 1];
  const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // up right down left
  const OPP = [2, 3, 0, 1];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const coarse = () => !!(window.matchMedia && matchMedia('(pointer:coarse)').matches);

  /* Eight original mazes. # wall, . crumb, o big wedge of cheese, space open, - basket door, H basket, P mouse start. */
  const MAZES = [
    { name: 'The Pantry', rows: [
      '###################',
      '#.................#',
      '#.#.#.#.#.#.#.#.#.#',
      '#o....#.....#....o#',
      '#.###.#######.###.#',
      '#.#.............#.#',
      '#.#.#.#.###.#.#.#.#',
      '#.#.#.........#.#.#',
      '#.#.#.### ###.#.#.#',
      '#.#.#.###-###.#.#.#',
      '#.#.#.##HHH##.#.#.#',
      '#...#.#######.#...#',
      '###.#.#######.#.###',
      '#.................#',
      '#.#.###.###.###.#.#',
      '#.....#..P..#.....#',
      '#.#.#.#.#.#.#.#.#.#',
      '#o#.#.........#.#o#',
      '#.#.#.#.###.#.#.#.#',
      '#.....#.....#.....#',
      '###################'] },
    { name: 'Cellar Stairs', rows: [
      '###################',
      '#.................#',
      '#.#.#####.#####.#.#',
      '#o..#.........#..o#',
      '#.###.#.###.#.###.#',
      '#.....#.....#.....#',
      '###.###.#.#.###.###',
      '#.................#',
      '#.###.### ###.###.#',
      ' .....###-###..... ',
      '#####.##HHH##.#####',
      '#.....#######.....#',
      '#.###.#######.###.#',
      '#.................#',
      '#####.###.###.#####',
      '#...#....P....#...#',
      '#.#.#####.#####.#.#',
      '#o..#.........#..o#',
      '#.#.#.#.###.#.#.#.#',
      '#.....#.....#.....#',
      '###################'] },
    { name: 'Swiss Cheese', rows: [
      '###################',
      '#.................#',
      '#.###.#######.###.#',
      '#o...............o#',
      '#.###.#.#.#.#.###.#',
      '#.....#.....#.....#',
      '#.#.###.#.#.###.#.#',
      '#.#.............#.#',
      '#.#.#.### ###.#.#.#',
      '#...#.###-###.#...#',
      '#.#.#.##HHH##.#.#.#',
      ' .....#######..... ',
      '#.#.#.#######.#.#.#',
      '#...#.........#...#',
      '#.#.#####.#####.#.#',
      '#...#....P....#...#',
      '###.#.#.#.#.#.#.###',
      '#o...............o#',
      '#.###.#.###.#.###.#',
      '#.................#',
      '###################'] },
    { name: 'Mouse Hole', rows: [
      '###################',
      '#.................#',
      '#.#.#####.#####.#.#',
      '#o#...#.....#...#o#',
      '#.###.#.###.#.###.#',
      '#.................#',
      '#####.###.###.#####',
      '#.................#',
      '#.###.### ###.###.#',
      ' .....###-###..... ',
      '#.###.##HHH##.###.#',
      '#.....#######.....#',
      '#.#.#.#######.#.#.#',
      '#.#.#.........#.#.#',
      '#.#.###.#.#.###.#.#',
      '#.....#..P..#.....#',
      '#.#.#.###.###.#.#.#',
      '#o#.............#o#',
      '#.#.#.#######.#.#.#',
      '#.................#',
      '###################'] },
    { name: 'Kitchen Tiles', rows: [
      '###################',
      '#.................#',
      '#.#.#.#.#.#.#.#.#.#',
      '#o......#.#......o#',
      '###.###.#.#.###.###',
      '#.....#.....#.....#',
      '#.#.#.###.###.#.#.#',
      '#.#.............#.#',
      '#.###.### ###.###.#',
      '#.....###-###.....#',
      '#.###.##HHH##.###.#',
      '#.....#######.....#',
      '#.###.#######.###.#',
      '#...#.........#...#',
      '###.#.#.###.#.#.###',
      '#...#....P....#...#',
      '#.#.#.###.###.#.#.#',
      '#o..#.........#..o#',
      '#.#.#.#.###.#.#.#.#',
      '#.................#',
      '###################'] },
    { name: 'Clockwork', rows: [
      '###################',
      '#.....#.....#.....#',
      '#.###.#.#.#.#.###.#',
      '#o...............o#',
      '#####.#######.#####',
      '#.................#',
      '#.###.#######.###.#',
      '#...#.........#...#',
      '#.#.#.### ###.#.#.#',
      ' .....###-###..... ',
      '#.#.#.##HHH##.#.#.#',
      '#.#.#.#######.#.#.#',
      '#.#.#.#######.#.#.#',
      '#.................#',
      '#.#######.#######.#',
      '#........P........#',
      '#.#.###.###.###.#.#',
      '#o#...#.....#...#o#',
      '#.###.#.#.#.#.###.#',
      '#.....#.....#.....#',
      '###################'] },
    { name: 'Attic', rows: [
      '###################',
      '#.................#',
      '#.###.#.#.#.#.###.#',
      '#o..#.........#..o#',
      '#.#.#.#.#.#.#.#.#.#',
      '#.....#.#.#.#.....#',
      '###.#.#.#.#.#.#.###',
      '#.................#',
      '#.#.#.### ###.#.#.#',
      '#...#.###-###.#...#',
      '#.###.##HHH##.###.#',
      '#.....#######.....#',
      '#.#.#.#######.#.#.#',
      '#.................#',
      '###.###.#.#.###.###',
      '#.......#P#.......#',
      '#.###.###.###.###.#',
      '#o..#.........#..o#',
      '#.#.#####.#####.#.#',
      '#.................#',
      '###################'] },
    { name: 'Grand Larder', rows: [
      '###################',
      '#.................#',
      '#.###.#######.###.#',
      '#o....#.....#....o#',
      '#.#.#.#.#.#.#.#.#.#',
      '#.#.#.#.....#.#.#.#',
      '#.#.#.###.###.#.#.#',
      '#.................#',
      '#####.### ###.#####',
      ' .....###-###..... ',
      '#.#.#.##HHH##.#.#.#',
      '#.#.#.#######.#.#.#',
      '#.#.#.#######.#.#.#',
      '#.................#',
      '#.#.###.#.#.###.#.#',
      '#.......#P#.......#',
      '###.#.###.###.#.###',
      '#o..#.#.....#.#..o#',
      '#.#.#.#.#.#.#.#.#.#',
      '#...#.........#...#',
      '###################'] }
  ];
  const WALLCOL = [6, 7, 2, 5, 3, 4, 9, 13];

  /* Custom character set: 12x10 bitmaps that fill one maze square (two text columns). */
  const BM = {
    mouse: ['.......##...', '......#..#..', '......#..#..', '...#######..', '..#########.', '.#######.###', '#.#########.', '#..#######..', '.#..#...#...', '..##........'],
    mouse2: ['.......##...', '......#..#..', '......#..#..', '...#######..', '..#########.', '.#######.###', '#.#########.', '#..#######..', '..#...#.#...', '.#..........'],
    bruno: ['#..........#', '##........##', '############', '#.########.#', '##..####..##', '###..##..###', '#####..#####', '#.########.#', '.##########.', '..##....##..'],
    slink: ['#..........#', '##........##', '############', '############', '#....##....#', '############', '#####..#####', '#.########.#', '.####..####.', '..##....##..'],
    patches: ['#..........#', '##........##', '######....##', '######....##', '##..##.#..##', '##..##....##', '#####..#####', '#.########.#', '.##########.', '..##....##..'],
    mittens: ['#..........#', '##........##', '############', '#...####...#', '#.#.####.#.#', '#...####...#', '#####..#####', '#.########.#', '.##########.', '.#.#....#.#.'],
    scared: ['#..........#', '##........##', '############', '#.#.####.#.#', '##.######.##', '#.#.####.#.#', '############', '#.#.#.#.#.##', '.#.#.#.#.##.', '..##....##..'],
    wedge: ['............', '.........##.', '.......####.', '.....######.', '...###.####.', '.##########.', '.####.#####.', '.######.###.', '.##########.', '............'],
    teacup: ['...#...#....', '....#...#...', '............', '.#########..', '.#########.#', '.#########.#', '..#######.#.', '...#####....', '.#########..', '............'],
    button: ['...######...', '.##########.', '.##########.', '###.####.###', '############', '############', '###.####.###', '.##########.', '.##########.', '...######...'],
    thimble: ['....####....', '...#.#.##...', '...##.#.#...', '..#.#.#.##..', '..##.#.#.#..', '.#.#.#.#.##.', '.##.#.#.#.#.', '############', '############', '............'],
    spool: ['############', '.##########.', '...######...', '...#....#...', '...######...', '...#....#...', '...######...', '.##########.', '############', '............'],
    key: ['............', '.####.......', '#....#......', '#....########', '#....#..#.#.', '.####...#.#.', '............', '............', '............', '............'],
    acorn: ['.....##.....', '..########..', '.##########.', '############', '..########..', '..########..', '...######...', '....####....', '.....##.....', '............'],
    bell: ['.....##.....', '....####....', '...######...', '...######...', '..########..', '..########..', '.##########.', '############', '.....##.....', '............'],
    sock: ['....#####...', '....#####...', '....#####...', '....#####...', '....######..', '...#######..', '.#########..', '##########..', '.########...', '............']
  };
  const BONUS = [['teacup', 'TEACUP', 100, 11], ['button', 'BUTTON', 300, 12], ['thimble', 'THIMBLE', 500, 7], ['spool', 'SPOOL OF THREAD', 700, 13], ['key', 'SKELETON KEY', 1000, 14], ['acorn', 'ACORN', 2000, 6], ['bell', 'BELL', 3000, 14], ['sock', 'LOST SOCK', 5000, 12]];
  const CATS = [
    { id: 'bruno', name: 'BRUNO', how: 'CHASES YOU', col: 12, corner: [18, -2] },
    { id: 'slink', name: 'SLINK', how: 'CUTS YOU OFF', col: 10, corner: [0, -2] },
    { id: 'patches', name: 'PATCHES', how: 'WANDERS ABOUT', col: 13, corner: [18, 22] },
    { id: 'mittens', name: 'MITTENS', how: 'IS SHY', col: 11, corner: [0, 22] }
  ];
  const LOGO = {
    C: ['###', '#..', '#..', '#..', '###'], H: ['#.#', '#.#', '###', '#.#', '#.#'], E: ['###', '#..', '##.', '#..', '###'],
    S: ['###', '#..', '###', '..#', '###'], A: ['###', '#.#', '###', '#.#', '#.#']
  };
  const DEFAULT_HI = [['WHISKERS', 15000, 6], ['NIBBLES', 10000, 5], ['SQUEAK', 7500, 4], ['CHEDDAR', 5000, 3], ['BRIE', 3500, 3], ['GOUDA', 2000, 2], ['FETA', 1000, 1], ['EDAM', 500, 1]].map(([n, s, l]) => ({ n, s, l }));

  function open(W, api) {
    const mono = api.era.id === '1985';
    W.body.innerHTML = `<div class="chz${mono ? ' chz-mono' : ''}"><div class="chz-scr"><canvas class="chz-cv" aria-label="Cheese Chase screen"></canvas></div>
      <div class="chz-pad" hidden>
        <button data-d="0" aria-label="Up"><svg viewBox="0 0 16 16"><path d="M8 3l6 8H2z"/></svg></button>
        <button data-d="3" aria-label="Left"><svg viewBox="0 0 16 16"><path d="M3 8l8-6v12z"/></svg></button>
        <button data-d="2" aria-label="Down"><svg viewBox="0 0 16 16"><path d="M8 13L2 5h12z"/></svg></button>
        <button data-d="1" aria-label="Right"><svg viewBox="0 0 16 16"><path d="M13 8L5 2v12z"/></svg></button>
        <button data-d="p" class="chz-p" aria-label="Pause">PAUSE</button>
      </div></div>`;
    const host = W.body.querySelector('.chz-scr'), cv = W.body.querySelector('.chz-cv'), ctx = cv.getContext('2d'), pad = W.body.querySelector('.chz-pad'), padP = pad.querySelector('.chz-p');
    let cols = 80, rows = 25, cw = 8, chh = 16, dpr = 1, lastW = 0, lastH = 0, raf = 0, lastT = 0, T = 0;
    let buf = [];
    let opts = Object.assign({ sound: true, diff: 'normal' }, api.load('opts', {}));
    if (!['easy', 'normal', 'hard'].includes(opts.diff)) opts.diff = 'normal';
    let screen = 'title', paused = false;
    let maze, mazeIdx = 0, crumbsLeft = 0, eaten = 0, level = 1, score = 0, lives = 3, extraGiven = false;
    let mouse, cats = [], scaredT = 0, scaredMax = 0, catChain = 0, phaseI = 0, phaseT = 0, bonus = null, bonusGot = [], timerT = 0;
    const DEV = /[?&]dev\b/.test(location.search); let typed = '';
    let msg = '', msgT = 0, pops = [], swipe = null, lastHi = -1, earnedLv = 0;
    const hiList = () => api.load('hi', null) || DEFAULT_HI.map(h => Object.assign({}, h));
    let hiTop = hiList()[0].s;

    /* ---------- sound ---------- */
    const tone = (f, d, o = {}) => { if (opts.sound) api.tone(f, d, Object.assign({ vol: 0.04, type: 'square' }, o)); };
    const noteF = n => 440 * Math.pow(2, (n - 69) / 12);
    const tune = (notes, step, type = 'square', vol = 0.04) => notes.forEach((n, i) => { if (n) tone(noteF(n), step * 0.85, { at: i * step, type, vol }); });
    const JINGLE = [72, 76, 79, 76, 77, 81, 79, 0, 74, 77, 76, 72, 74, 0, 72, 0];
    let crumbFlip = false;

    /* ---------- text screen ---------- */
    function fit() {
      const Wd = host.clientWidth, Ht = host.clientHeight; if (!Wd || !Ht) return false;
      if (Wd === lastW && Ht === lastH) return true;
      lastW = Wd; lastH = Ht;
      cols = Wd >= 600 ? 80 : 40;
      let a = Wd / cols, b = Ht / rows;
      if (b > a * 2.3) b = a * 2.3;
      if (b < a * 1.45) a = b / 1.45;
      cw = a; chh = b; dpr = window.devicePixelRatio || 1;
      cv.width = Math.round(cols * cw * dpr); cv.height = Math.round(rows * chh * dpr);
      cv.style.width = cols * cw + 'px'; cv.style.height = rows * chh + 'px';
      return true;
    }
    function layout() {
      const narrow = !!(W.body.clientWidth < 600 || coarse());
      if (pad.hidden === narrow) { pad.hidden = !narrow; lastW = 0; }
      fit(); render();
    }
    W.onResize = () => setTimeout(layout, 0);
    const ro = window.ResizeObserver ? new ResizeObserver(() => layout()) : null;
    if (ro) ro.observe(W.body);
    const phos = () => (getComputedStyle(host).getPropertyValue('--phos') || '').trim() || '#33ff66';
    let PH = '#33ff66';
    const mixC = (hex, a) => { const m = /^#?([0-9a-f]{6})$/i.exec(hex); const n = m ? parseInt(m[1], 16) : 0x33ff66; return `rgb(${Math.round((n >> 16 & 255) * a)},${Math.round((n >> 8 & 255) * a)},${Math.round((n & 255) * a)})`; };
    const color = c => mono ? (c ? mixC(PH, MONO[c]) : '#000') : CGA[c];
    const clear = () => { buf = []; for (let i = 0; i < rows * cols; i++) buf.push({ c: ' ', f: 7, b: 0, k: null }); };
    const put = (x, y, str, f = 7, b = 0, k = null) => { str = String(str); if (y < 0 || y >= rows) return; for (let i = 0; i < str.length; i++) { const X = x + i; if (X < 0 || X >= cols) continue; const c = buf[y * cols + X]; c.c = str[i]; c.f = f; c.b = b; c.k = k; } };
    const center = (y, str, f, b, k) => put(Math.floor((cols - String(str).length) / 2), y, str, f, b, k);
    const bar = (y, f, b) => put(0, y, ' '.repeat(cols), f, b);
    const TB = mono ? [0, 15] : [15, 1]; // title / status bar colors [fg, bg]
    // Draw the text buffer (or just one rectangle of it, over whatever is there).
    function flush(rx = 0, ry = 0, rw = cols, rh = rows) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#000'; ctx.fillRect(rx * cw, ry * chh, rw * cw, rh * chh);
      ctx.font = `${Math.round(chh * 0.98)}px VT323,"Courier New",monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (let y = ry; y < ry + rh; y++) for (let x = rx; x < rx + rw; x++) {
        const c = buf[y * cols + x], px = x * cw, py = y * chh;
        if (c.b) { ctx.fillStyle = color(c.b); ctx.fillRect(Math.floor(px), Math.floor(py), Math.ceil(cw) + 1, Math.ceil(chh) + 1); }
        if (c.c === ' ') continue;
        ctx.fillStyle = mono && c.b ? '#000' : color(c.f);
        if (c.c === '█') ctx.fillRect(px, py, cw + 0.5, chh + 0.5);
        else if (c.c === '▀') ctx.fillRect(px, py, cw + 0.5, chh / 2);
        else if (c.c === '▄') ctx.fillRect(px, py + chh / 2, cw + 0.5, chh / 2 + 0.5);
        else ctx.fillText(c.c, px + cw / 2, py + chh * 0.54, cw * 1.02);
      }
    }
    // Draw a 12x10 custom character across two text columns.
    function glyph(name, col, row, c, flip, hollow) {
      const bm = BM[name]; if (!bm) return;
      const pw = (cw * 2) / 12, ph = chh / 10, x0 = col * cw, y0 = row * chh;
      ctx.fillStyle = typeof c === 'string' ? c : color(c);
      for (let j = 0; j < 10; j++) for (let i = 0; i < 12; i++) {
        const src = flip ? 11 - i : i;
        if (bm[j][src] !== '#') continue;
        if (hollow) { const on = (a, b) => a >= 0 && a < 12 && b >= 0 && b < 10 && bm[b][flip ? 11 - a : a] === '#'; if (on(i - 1, j) && on(i + 1, j) && on(i, j - 1) && on(i, j + 1)) continue; }
        ctx.fillRect(x0 + i * pw, y0 + j * ph, pw + 0.4, ph + 0.4);
      }
    }
    // Walls are drawn as double lines: the single-line wall network is drawn thick in the wall color, then
    // again thinner in black, which leaves two parallel lines with clean corners and joins.
    function drawWalls(net, c) {
      const g2 = Math.max(2, Math.min(cw * 0.36, chh * 0.2)), lw = Math.max(1, Math.round(cw / 6));
      const pass = (th, col) => {
        ctx.fillStyle = col;
        for (const [col0, row, n] of net) {
          const x = col0 * cw, y = row * chh, w = cw * 2, h = chh, cx = x + w / 2, cy = y + h / 2, t = th / 2;
          ctx.fillRect(cx - t, cy - t, th, th);
          if (n[0]) ctx.fillRect(cx - t, y - 0.5, th, cy - y + t);
          if (n[2]) ctx.fillRect(cx - t, cy - t, th, y + h - cy + t + 0.5);
          if (n[3]) ctx.fillRect(x - 0.5, cy - t, cx - x + t, th);
          if (n[1]) ctx.fillRect(cx - t, cy - t, x + w - cx + t + 0.5, th);
        }
      };
      pass(2 * g2 + lw, c); pass(Math.max(1, 2 * g2 - lw), '#000');
    }

    /* ---------- maze ---------- */
    const MX = () => cols === 80 ? 2 : 1, MY = () => 2;       // maze origin in text cells
    const isWall = (x, y) => y >= 0 && y < MH && x >= 0 && x < MW && maze[y][x] === '#';
    let wallNet = null;
    function loadMaze() {
      mazeIdx = (level - 1) % MAZES.length;
      const m = MAZES[mazeIdx];
      maze = m.rows.map(r => r.split(''));
      crumbsLeft = 0; eaten = 0;
      for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) if (maze[y][x] === '.' || maze[y][x] === 'o') crumbsLeft++;
      // Which neighbors each wall piece joins: only along edges that face a corridor, so thick walls draw as outlines.
      const open = (x, y) => !(y < 0 || y >= MH || x < 0 || x >= MW) && maze[y][x] !== '#';
      const openOrOut = (x, y) => (x < 0 || x >= MW) ? false : open(x, y);
      wallNet = [];
      for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
        if (maze[y][x] !== '#') continue;
        const face = (ax, ay, bx, by) => openOrOut(ax, ay) || openOrOut(bx, by);
        const n = [
          !isWall(x, y - 1) ? 0 : (face(x - 1, y, x - 1, y - 1) || face(x + 1, y, x + 1, y - 1)) ? 1 : 0,
          !isWall(x + 1, y) ? 0 : (face(x, y - 1, x + 1, y - 1) || face(x, y + 1, x + 1, y + 1)) ? 1 : 0,
          !isWall(x, y + 1) ? 0 : (face(x - 1, y, x - 1, y + 1) || face(x + 1, y, x + 1, y + 1)) ? 1 : 0,
          !isWall(x - 1, y) ? 0 : (face(x, y - 1, x - 1, y - 1) || face(x, y + 1, x - 1, y + 1)) ? 1 : 0
        ];
        let solid = true; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) if (openOrOut(x + i, y + j)) solid = false;
        if (!solid) wallNet.push([x, y, n]);
      }
    }
    const cellOpen = (x, y, who) => {
      if (y < 0 || y >= MH) return false;
      x = (x + MW) % MW;
      const c = maze[y][x];
      if (c === '#') return false;
      if (c === '-' || c === 'H') return who === 'cat-in';
      return true;
    };
    const canGo = (e, d, who) => { const [dx, dy] = DIRS[d]; return cellOpen(Math.round(e.x) + dx, Math.round(e.y) + dy, who); };

    /* ---------- game flow ---------- */
    function newGame() {
      level = 1; score = 0; lives = 3; extraGiven = false; bonusGot = []; earnedLv = 0; lastHi = -1;
      startLevel(true);
    }
    function startLevel(fresh) {
      loadMaze(); if (fresh !== false) bonus = null;
      resetActors();
      screen = 'ready'; timerT = 2.2; paused = false;
      setMsg(`LEVEL ${level}: ${MAZES[mazeIdx].name.toUpperCase()}`, 2.2);
      tune(JINGLE, 0.13);
      setEsc(false); kick();
    }
    /* Difficulty. Hard is the original arcade curve. Normal and Easy start gentler and blend back towards it:
       ease() is 1 on the first level(s) and falls to 0 by level 5 (Normal) or level 7 (Easy). */
    const DIFF = { easy: { slow: 0.2, patrol: 2.5, chase: 0.4, gap: 5, scared: 5, ramp: [1, 1, 0.75, 0.5, 0.3, 0.15] },
      normal: { slow: 0.11, patrol: 1.5, chase: 0.3, gap: 4, scared: 3, ramp: [1, 0.75, 0.45, 0.2] }, hard: null };
    const ease = () => { const d = DIFF[opts.diff]; return d ? (d.ramp[level - 1] || 0) : 0; };
    const dp = k => (DIFF[opts.diff] || {})[k] || 0;
    const speedMouse = () => Math.min(8.6, 6.6 + (level - 1) * 0.25);
    const speedCat = () => Math.min(8.8, 5.6 + (level - 1) * 0.4) * (1 - ease() * dp('slow'));
    function resetActors() {
      mouse = { x: 9, y: 15, dir: 3, want: 3, anim: 0, face: 3 };
      const P = MAZES[mazeIdx].rows.findIndex(r => r.includes('P')); if (P >= 0) mouse.y = P;
      const e = ease(), rel = [0, 1.5, 5, 9].map((t, i) => t * Math.pow(0.85, level - 1) * (1 - e) + e * i * dp('gap'));
      cats = CATS.map((c, i) => ({ ...c, i, x: i === 0 ? 9 : [9, 8, 10][i - 1], y: i === 0 ? 8 : 10, dir: 3, state: i === 0 ? 'active' : 'home', t: rel[i], bob: i }));
      cats[0].dir = 3; cats[0].y = 8; cats[0].x = 9; cats[0].dir = 0;
      scaredT = 0; phaseI = 0; phaseT = 0; catChain = 0;
    }
    const PHASES = [['patrol', 6], ['chase', 20], ['patrol', 6], ['chase', 20], ['patrol', 4], ['chase', 1e9]];
    const catMode = () => PHASES[Math.min(phaseI, PHASES.length - 1)][0];
    const phaseLen = ph => ph[1] * (ph[0] === 'patrol' ? 1 + ease() * dp('patrol') : 1 - ease() * dp('chase'));
    function setMsg(t, s = 2) { msg = t; msgT = s; }
    function die() {
      screen = 'dying'; timerT = 1.8;
      [880, 784, 698, 622, 554, 494, 440, 392, 349, 311].forEach((f, i) => tone(f, 0.1, { at: 0.3 + i * 0.1, type: 'square', vol: 0.05 }));
    }
    function afterDeath() {
      lives--;
      if (lives <= 0) return gameOver();
      resetActors(); screen = 'ready'; timerT = 1.6; setMsg('GET READY!', 1.6);
    }
    function gameOver() {
      screen = 'over'; setEsc(false);
      const list = hiList(), e = { n: String(api.user || 'PLAYER').toUpperCase().slice(0, 10), s: score, l: level };
      list.push(e); list.sort((a, b) => b.s - a.s); lastHi = list.indexOf(e); if (lastHi > 7) lastHi = -1;
      api.save('hi', list.slice(0, 8)); hiTop = list[0].s;
      tune([67, 0, 63, 0, 60, 0, 55, 55], 0.16, 'triangle', 0.05);
    }
    function levelDone() {
      screen = 'clear'; timerT = 2.4;
      tune([72, 76, 79, 84, 79, 84, 88], 0.09, 'square', 0.04);
      const pay = level >= 7 ? 5 : level >= 5 ? 4 : level >= 3 ? 3 : 2;
      if (earnedLv < level) { earnedLv = level; const got = api.earn(pay, `clearing Cheese Chase level ${level}`); if (got) setMsg(`LEVEL CLEAR! +$${got}`, 2.4); else setMsg('LEVEL CLEAR!', 2.4); }
    }
    function addScore(n, x, y) {
      score += n;
      if (x != null) pops.push({ x, y, t: 1.1, s: String(n) });
      if (!extraGiven && score >= 10000) { extraGiven = true; lives++; setMsg('EXTRA MOUSE!', 2); tune([84, 0, 84, 0, 88], 0.08); }
    }

    /* ---------- movement ---------- */
    function stepEntity(e, dist, choose, who) {
      let guard = 0;
      while (dist > 1e-6 && guard++ < 8) {
        const cx = Math.round(e.x), cy = Math.round(e.y);
        const off = Math.abs(e.x - cx) + Math.abs(e.y - cy);
        if (off < 1e-6) {
          e.x = cx; e.y = cy;
          if (e.onCell) e.onCell(e);
          const d = choose(e);
          if (d < 0) return;
          e.dir = d;
        }
        const [dx, dy] = DIRS[e.dir];
        const rem = off < 1e-6 ? 1 : (dx ? (dx > 0 ? Math.ceil(e.x) - e.x : e.x - Math.floor(e.x)) : (dy > 0 ? Math.ceil(e.y) - e.y : e.y - Math.floor(e.y))) || 1;
        const st = Math.min(dist, rem);
        e.x += dx * st; e.y += dy * st; dist -= st;
        if (e.x < -0.5) e.x += MW; else if (e.x > MW - 0.5) e.x -= MW;
      }
    }
    function mouseChoose(e) {
      if (e.want != null && canGo(e, e.want, 'mouse')) return e.want;
      if (canGo(e, e.dir, 'mouse')) return e.dir;
      return -1;
    }
    function eatAt(e) {
      const x = (Math.round(e.x) + MW) % MW, y = Math.round(e.y), c = maze[y] && maze[y][x];
      if (c === '.') { maze[y][x] = ' '; crumbsLeft--; eaten++; addScore(10); crumbFlip = !crumbFlip; tone(crumbFlip ? 660 : 520, 0.035, { vol: 0.025 }); }
      else if (c === 'o') {
        maze[y][x] = ' '; crumbsLeft--; eaten++; addScore(50);
        scaredMax = scaredT = Math.max(1.5, 7 - (level - 1) * 0.75) + ease() * dp('scared'); catChain = 0;
        cats.forEach(k => { if (k.state === 'active') { k.state = 'scared'; k.dir = OPP[k.dir]; } else if (k.state === 'scared') k.state = 'scared'; });
        tone(300, 0.3, { to: 1200, type: 'triangle', vol: 0.05 }); setMsg('THE CATS ARE SCARED!', 1.5);
      }
      if ((eaten === 60 || eaten === 140) && (!bonus || bonus.gone)) { const b = BONUS[(level - 1) % BONUS.length]; bonus = { name: b[0], label: b[1], pts: b[2], col: b[3], t: 9, x: 9, y: mouse0y() }; }
      if (bonus && !bonus.gone && Math.round(e.y) === bonus.y && x === bonus.x) {
        addScore(bonus.pts, bonus.x, bonus.y); bonusGot.push(bonus.name); bonusGot = bonusGot.slice(-8);
        setMsg(`${bonus.label}! +${bonus.pts}`, 1.8); tune([79, 84, 88, 91], 0.06, 'triangle', 0.05); bonus.gone = true;
      }
      if (crumbsLeft <= 0) levelDone();
    }
    const mouse0y = () => { const P = MAZES[mazeIdx].rows.findIndex(r => r.includes('P')); return P >= 0 ? P : 15; };
    function catTarget(k) {
      if (k.state === 'return') return [9, 8];
      if (catMode() === 'patrol') return k.corner;
      const mx = Math.round(mouse.x), my = Math.round(mouse.y);
      if (k.id === 'bruno') return [mx, my];
      if (k.id === 'slink') { const [dx, dy] = DIRS[mouse.dir]; return [mx + dx * 4, my + dy * 4]; }
      if (k.id === 'mittens') { const d = Math.hypot(k.x - mouse.x, k.y - mouse.y); return d > 7 ? [mx, my] : k.corner; }
      return null; // patches wanders
    }
    function catChoose(k) {
      const x = Math.round(k.x), y = Math.round(k.y);
      if (k.state === 'return' && x === 9 && y === 8) { k.state = 'enter'; return -1; }
      const opts = [0, 1, 2, 3].filter(d => d !== OPP[k.dir] && canGo(k, d, 'cat'));
      if (!opts.length) return canGo(k, OPP[k.dir], 'cat') ? OPP[k.dir] : -1;
      if (opts.length === 1) return opts[0];
      if (k.state === 'scared') return opts[Math.random() * opts.length | 0];
      let tgt = catTarget(k);
      if (!tgt || (k.id === 'patches' && Math.random() < 0.7)) {
        if (k.id === 'patches' && Math.random() < 0.3) tgt = [Math.round(mouse.x), Math.round(mouse.y)];
        else return opts[Math.random() * opts.length | 0];
      }
      let best = opts[0], bd = 1e9;
      for (const d of opts) { const [dx, dy] = DIRS[d]; const dd = (x + dx - tgt[0]) ** 2 + (y + dy - tgt[1]) ** 2; if (dd < bd) { bd = dd; best = d; } }
      return best;
    }
    function stepCat(k, dt) {
      const sp = speedCat();
      if (k.state === 'home') { k.bob += dt * 3; k.t -= dt; if (k.t <= 0) k.state = 'leave'; return; }
      if (k.state === 'leave' || k.state === 'enter') {
        // scripted moves in and out of the basket, through the door
        const tx = k.state === 'leave' ? 9 : [9, 8, 10][Math.max(0, k.i - 1)] || 9, s = sp * 0.6 * dt;
        if (k.state === 'leave') {
          if (Math.abs(k.x - 9) > 0.01) k.x += clamp(9 - k.x, -s, s);
          else { k.x = 9; k.y -= s; if (k.y <= 8) { k.y = 8; k.state = scaredT > 0 && false ? 'scared' : 'active'; k.dir = 0; } }
        } else {
          if (k.y < 10) { k.x = 9; k.y = Math.min(10, k.y + sp * 1.5 * dt); }
          else if (Math.abs(k.x - tx) > 0.01) k.x += clamp(tx - k.x, -s, s);
          else { k.state = 'home'; k.t = 1.5; }
        }
        return;
      }
      const v = k.state === 'scared' ? sp * 0.55 : k.state === 'return' ? 14 : sp;
      stepEntity(k, v * dt, catChoose, 'cat');
    }
    function update(dt) {
      T += dt;
      if (msgT > 0) msgT -= dt;
      pops.forEach(p => { p.t -= dt; }); pops = pops.filter(p => p.t > 0);
      if (screen === 'ready') { timerT -= dt; if (timerT <= 0) screen = 'play'; return; }
      if (screen === 'dying') { timerT -= dt; if (timerT <= 0) afterDeath(); return; }
      if (screen === 'clear') { timerT -= dt; if (timerT <= 0) { level++; startLevel(); } return; }
      if (screen !== 'play') return;
      // patrol / chase schedule (paused while cats are scared)
      if (scaredT > 0) { scaredT -= dt; if (scaredT <= 0) { scaredT = 0; cats.forEach(k => { if (k.state === 'scared') k.state = 'active'; }); } }
      else { phaseT += dt; const ph = PHASES[Math.min(phaseI, PHASES.length - 1)]; if (phaseT >= phaseLen(ph)) { phaseT = 0; phaseI++; cats.forEach(k => { if (k.state === 'active') k.dir = OPP[k.dir]; }); } }
      if (bonus && !bonus.gone) { bonus.t -= dt; if (bonus.t <= 0) bonus.gone = true; }
      // mouse
      mouse.onCell = eatAt;
      const before = mouse.x + mouse.y;
      if (mouse.want != null && mouse.want === OPP[mouse.dir]) mouse.dir = mouse.want;
      stepEntity(mouse, speedMouse() * dt, mouseChoose, 'mouse');
      if (screen !== 'play') return;
      if (mouse.x + mouse.y !== before) mouse.anim += dt;
      if (mouse.dir === 1 || mouse.dir === 3) mouse.face = mouse.dir;
      cats.forEach(k => stepCat(k, dt));
      // collisions
      for (const k of cats) {
        if (k.state === 'home' || k.state === 'leave' || k.state === 'enter' || k.state === 'return') continue;
        let dx = Math.abs(k.x - mouse.x); dx = Math.min(dx, MW - dx);
        if (dx + Math.abs(k.y - mouse.y) > 0.7) continue;
        if (k.state === 'scared') {
          catChain++; const pts = 100 * Math.pow(2, catChain);
          addScore(pts, Math.round(k.x), Math.round(k.y)); k.state = 'return';
          tone(200, 0.35, { to: 1600, type: 'triangle', vol: 0.05 }); setMsg(`${k.name} RUNS HOME! +${pts}`, 1.4);
        } else { die(); return; }
      }
    }

    /* ---------- rendering ---------- */
    function render() {
      if (!buf.length || buf.length !== rows * cols) clear();
      PH = phos();
      clear();
      if (screen === 'title') drawTitle();
      else if (screen === 'scores') drawScores();
      else drawGame();
      flush();
      const pl = ['title', 'over', 'scores'].includes(screen) ? 'START' : paused ? 'GO ON' : 'PAUSE';
      if (padP.textContent !== pl) padP.textContent = pl;
      if (screen !== 'title' && screen !== 'scores') drawGameGlyphs();
      else if (screen === 'title') drawTitleGlyphs();
    }
    function status(items) {
      bar(rows - 1, TB[0], TB[1]);
      let x = 1; items.forEach(([lab, k]) => { if (x + lab.length > cols) return; put(x, rows - 1, lab, TB[0], TB[1], k); x += lab.length + 2; });
    }
    function drawTitle() {
      bar(0, TB[0], TB[1]); put(1, 0, 'CHEESE CHASE', TB[0], TB[1]); const r = 'NIBBLEWARE 1985'; put(cols - r.length - 1, 0, r, TB[0], TB[1]);
      // block-letter logo
      const word = (w, y, col) => { const wdt = w.length * 4 - 1, x0 = Math.floor((cols - wdt) / 2); for (let j = 0; j < 5; j++) { let s = ''; for (const ch of w) s += LOGO[ch][j].replace(/#/g, '█').replace(/\./g, ' ') + ' '; put(x0, y + j, s, col); } };
      word('CHEESE', 2, 14); word('CHASE', 8, 14);
      const wide = cols === 80;
      center(14, 'EAT EVERY CRUMB. DODGE THE CATS.', 7);
      const list = CATS.map(c => `${c.name.padEnd(8)} ${c.how}`);
      const cx = Math.floor(cols / 2) - (wide ? 12 : 11);
      list.forEach((t, i) => put(cx + 3, 16 + i, t, CATS[i].col));
      const b = hiList()[0];
      center(21, `HIGH SCORE ${String(b.s).padStart(6, '0')}  ${b.n}`, 11);
      status([['ENTER Start', 'start'], ['H Help', 'help'], ['S Scores', 'scores'], ...(wide ? [['ESC Quit', 'esc']] : [])]);
      // big tappable start line
      const s = Math.floor(T * 2) % 2 ? '> PRESS ENTER OR TAP HERE TO PLAY <' : '  PRESS ENTER OR TAP HERE TO PLAY  ';
      center(22, cols === 40 ? s.replace('PRESS ENTER OR ', '').replace('HERE ', '') : s, 15, 0, 'start');
      center(23, `DIFFICULTY: ${opts.diff.toUpperCase()}` + (cols === 80 ? '  (CHANGE IT IN THE OPTIONS MENU)' : ''), 8);
    }
    function drawTitleGlyphs() {
      const cx = Math.floor(cols / 2) - (cols === 80 ? 12 : 11);
      CATS.forEach((c, i) => glyph(c.id, cx, 16 + i, c.col));
      glyph(Math.floor(T * 4) % 2 ? 'mouse' : 'mouse2', Math.floor(cols / 2) - 1, 13 - 0, 15, false);
      glyph('wedge', Math.floor(cols / 2) - 5, 13, 14);
      glyph('wedge', Math.floor(cols / 2) + 3, 13, 14);
    }
    function drawScores() {
      bar(0, TB[0], TB[1]); put(1, 0, 'CHEESE CHASE  HIGH SCORES', TB[0], TB[1]);
      const list = hiList(), x = Math.floor(cols / 2) - 16;
      put(x, 3, 'RANK  SCORE   LEVEL  NAME', 11);
      put(x, 4, '────  ──────  ─────  ──────────', 8);
      list.forEach((h, i) => put(x, 6 + i * 2, `${String(i + 1).padStart(3)}.  ${String(h.s).padStart(6, '0')}  ${String(h.l).padStart(5)}  ${h.n}`, i === lastHi ? 14 : 7));
      center(23, 'PRESS ANY KEY OR TAP', 15, 0, 'back');
      status([['ENTER Back', 'back']]);
    }
    function drawGame() {
      const wide = cols === 80, mx = MX(), my = MY();
      bar(0, TB[0], TB[1]);
      put(1, 0, 'CHEESE CHASE', TB[0], TB[1]);
      const lv = `LEVEL ${level}`; put(cols - lv.length - 1, 0, lv, TB[0], TB[1]);
      const sc = String(score).padStart(6, '0'), hi = String(Math.max(score, hiTop)).padStart(6, '0');
      if (!wide) { put(0, 1, `SCORE ${sc}`, 15); put(14, 1, `HI ${hi}`, 7); }
      // crumbs and wedges
      const blinkOn = Math.floor(T * 3) % 2 === 0;
      for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
        const c = maze[y][x];
        if (c === '-') put(mx + x * 2, my + y, '──', 8);
      }
      if (wide) {
        const px = 44;
        put(px, 2, 'SCORE', 11); put(px, 3, sc, 15);
        put(px + 14, 2, 'HIGH SCORE', 11); put(px + 14, 3, hi, 7);
        put(px, 5, `LEVEL ${level}`, 11); put(px + 9, 5, MAZES[mazeIdx].name.toUpperCase(), 14);
        put(px, 7, 'MICE LEFT', 11);
        put(px, 10, 'THE CATS', 11);
        CATS.forEach((c, i) => put(px + 3, 11 + i, `${c.name.padEnd(8)} ${c.how}`, c.col));
        put(px + 3, 16, 'BIG WEDGE SCARES THE CATS', 14);
        put(px, 18, 'FOUND', 11);
        put(px, 21, 'ARROWS MOVE   P PAUSE', 8);
      }
      // message line
      let m = '';
      if (screen === 'ready') m = msgT > 0 && msg ? msg : 'GET READY!';
      else if (screen === 'over') m = '';
      else if (msgT > 0) m = msg;
      if (paused) m = 'PAUSED. PRESS P OR TAP TO GO ON.';
      if (m) center(23, m.slice(0, cols), paused || screen === 'ready' ? 15 : 14, 0, paused ? 'pause' : null);
      if (screen === 'over') {
        const bx = mx + 3, bw = MW * 2 - 6, by = my + 6;
        for (let j = 0; j < 9; j++) put(bx, by + j, ' '.repeat(bw), 7, 0);
        const cc = (y, s, col, k) => put(bx + Math.floor((bw - s.length) / 2), y, s, col, 0, k);
        cc(by + 1, 'GAME OVER', 12); cc(by + 3, `SCORE ${score}`, 15); cc(by + 4, `LEVEL ${level}`, 7);
        cc(by + 5, lastHi >= 0 ? `NEW HIGH SCORE! #${lastHi + 1}` : 'THE CATS WIN THIS TIME', 14);
        cc(by + 7, 'ENTER: AGAIN', 11, 'start');
        center(23, 'TAP HERE OR PRESS ENTER TO PLAY AGAIN'.slice(0, cols), 15, 0, 'start');
      }
      status(paused ? [['P Resume', 'pause'], ['ESC Menu', 'esc']] : screen === 'over' ? [['ENTER Again', 'start'], ['S Scores', 'scores'], ['M Menu', 'menu']] : wide ? [['ARROWS Move', null], ['P Pause', 'pause'], ['ESC Menu', 'esc']] : [['P Pause', 'pause'], ['ESC Menu', 'esc']]);
    }
    function drawGameGlyphs() {
      const wide = cols === 80, mx = MX(), my = MY();
      const flashing = screen === 'clear' && Math.floor(T * 6) % 2;
      const wc = flashing ? 15 : WALLCOL[mazeIdx];
      const wcol = mono ? mixC(PH, flashing ? 1 : 0.55) : CGA[wc];
      drawWalls(wallNet.map(([x, y, n]) => [mx + x * 2, my + y, n]), wcol);
      // crumbs
      ctx.fillStyle = color(14);
      const cwid = Math.max(2, cw * 0.45), chgt = Math.max(2, chh * 0.2);
      for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) if (maze[y][x] === '.') ctx.fillRect(Math.round((mx + x * 2 + 1) * cw - cwid / 2), Math.round((my + y + 0.5) * chh - chgt / 2), Math.round(cwid), Math.round(chgt));
      // big wedges
      for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) if (maze[y][x] === 'o' && (Math.floor(T * 3) % 2 === 0 || paused)) glyph('wedge', mx + x * 2, my + y, 14);
      if (bonus && !bonus.gone) glyph(bonus.name, mx + bonus.x * 2, my + bonus.y, bonus.col);
      // lives + found items (panel)
      if (wide) {
        for (let i = 0; i < Math.min(lives - 1, 8); i++) glyph('mouse', 44 + i * 3, 8, 15);
        bonusGot.forEach((b, i) => glyph(b, 44 + i * 3, 19, BONUS.find(x => x[0] === b)[3]));
        CATS.forEach((c, i) => glyph(c.id, 44, 11 + i, c.col));
        glyph('wedge', 44, 16, 14);
      } else {
        for (let i = 0; i < Math.min(lives - 1, 5); i++) glyph('mouse', cols - 2 - i * 3, 1, 15);
      }
      // cats
      const blink = scaredT > 0 && scaredT < 2 && Math.floor(T * 6) % 2;
      for (const k of cats) {
        if (screen === 'dying' && timerT < 1.2) continue;
        let col = Math.round(k.x), row = Math.round(k.y + (k.state === 'home' ? Math.sin(k.bob) * 0.15 : 0));
        col = (col + MW) % MW;
        const X = mx + col * 2, Y = my + row;
        if (k.state === 'scared') glyph('scared', X, Y, blink ? (mono ? mixC(PH, 0.45) : 15) : (mono ? 15 : 7));
        else if (k.state === 'return' || k.state === 'enter') glyph(k.id, X, Y, mono ? mixC(PH, 0.45) : 8, false, true);
        else glyph(k.id, X, Y, k.col);
      }
      // mouse
      if (screen !== 'over') {
        const X = mx + ((Math.round(mouse.x) + MW) % MW) * 2, Y = my + Math.round(mouse.y);
        if (screen === 'dying') {
          const t = 1.8 - timerT, spin = Math.floor(t * 10) % 4;
          if (t < 1.3) glyph(spin % 2 ? 'mouse2' : 'mouse', X, Y, 15, spin > 1);
          else { ctx.fillStyle = color(15); ctx.font = `${Math.round(chh)}px VT323,monospace`; ctx.textAlign = 'center'; ctx.fillText('*', X * cw + cw, Y * chh + chh / 2); }
        } else glyph(Math.floor(mouse.anim * 10) % 2 ? 'mouse2' : 'mouse', X, Y, 15, mouse.face === 3);
      }
      if (screen === 'ready' && !paused) {
        ctx.fillStyle = '#000'; ctx.fillRect((mx + 7 * 2) * cw, (my + 10) * chh, 10 * cw, chh);
        ctx.fillStyle = color(14); ctx.font = `${Math.round(chh * 0.98)}px VT323,"Courier New",monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('READY!', (mx + 9 * 2 + 1) * cw, (my + 10.54) * chh);
      }
      if (screen === 'over') {
        // game over box on top of the maze: black panel, double border, then its text
        const bx = mx + 3, bw = MW * 2 - 6, by = my + 6;
        flush(bx, by, bw, 9);
        const lw = Math.max(1, Math.round(cw / 6)), gp = Math.max(3, cw * 0.3);
        ctx.strokeStyle = color(15); ctx.lineWidth = lw;
        [0.5, 0.5 + gp / cw].forEach(o => ctx.strokeRect((bx + o) * cw, (by + o * cw / chh) * chh + chh * 0.3, (bw - 2 * o) * cw, 9 * chh - 2 * o * cw - chh * 0.6));
      }
      // score pop-ups
      ctx.font = `${Math.round(chh * 0.9)}px VT323,"Courier New",monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      pops.forEach(p => { ctx.fillStyle = color(11); ctx.fillText(p.s, (mx + p.x * 2 + 1) * cw, (my + p.y - (1.1 - p.t) * 0.8) * chh + chh / 2); });
    }

    /* ---------- loop ---------- */
    function kick() { if (!raf) { lastT = performance.now(); raf = requestAnimationFrame(loop); } }
    function loop(now) {
      raf = 0;
      const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
      if (!paused) update(dt); else T += 0;
      render();
      if (!paused) raf = requestAnimationFrame(loop);
    }

    /* ---------- input ---------- */
    const setEsc = home => setTimeout(() => { W.keepEsc = !home; }, 0);
    function togglePause() {
      if (!['play', 'ready', 'dying', 'clear'].includes(screen)) return;
      paused = !paused; if (!paused) kick(); render();
    }
    function toTitle() { screen = 'title'; paused = false; setEsc(true); kick(); }
    function act(k) {
      if (k === 'start') { if (screen === 'title' || screen === 'over') { tone(880, 0.05); newGame(); } else if (paused) togglePause(); return; }
      if (k === 'help') return howTo();
      if (k === 'scores') { screen = 'scores'; setEsc(false); kick(); return; }
      if (k === 'back' || k === 'menu') return toTitle();
      if (k === 'pause') return togglePause();
      if (k === 'esc') { if (screen === 'title') return api.close(); if (paused || screen === 'over' || screen === 'scores') return toTitle(); return togglePause(); }
    }
    function steer(d) {
      if (paused && screen !== 'over') { togglePause(); }
      if (!mouse || !['play', 'ready'].includes(screen)) return;
      mouse.want = d;
    }
    const cellAt = e => { const r = cv.getBoundingClientRect(); const x = Math.floor((e.clientX - r.left) / (r.width / cols)), y = Math.floor((e.clientY - r.top) / (r.height / rows)); return buf[y * cols + x]; };
    cv.addEventListener('pointerdown', e => {
      e.preventDefault();
      swipe = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
      try { cv.setPointerCapture(e.pointerId); } catch (er) {}
    });
    cv.addEventListener('pointermove', e => {
      if (e.pointerType === 'mouse' && !swipe) { const c = cellAt(e); cv.style.cursor = c && c.k ? 'pointer' : 'default'; }
      if (!swipe || e.pointerId !== swipe.id) return;
      const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) > 18) {
        steer(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0));
        swipe.x = e.clientX; swipe.y = e.clientY; swipe.moved = true;
      }
    });
    cv.addEventListener('pointerup', e => {
      if (!swipe || e.pointerId !== swipe.id) return;
      const moved = swipe.moved; swipe = null;
      if (moved) return;
      const c = cellAt(e);
      if (c && c.k && c.k !== 'esc') { tone(990, 0.02); act(c.k); }
      else if (c && c.k === 'esc') act('esc');
      else if (screen === 'scores') toTitle();
      else if (paused) togglePause();
    });
    cv.addEventListener('pointercancel', () => { swipe = null; });
    pad.addEventListener('pointerdown', e => {
      const b = e.target.closest('button'); if (!b) return; e.preventDefault();
      const d = b.dataset.d;
      if (d === 'p') { if (screen === 'title' || screen === 'over') act('start'); else if (screen === 'scores') toTitle(); else togglePause(); return; }
      if (screen === 'title' || screen === 'over') { act('start'); return; }
      if (screen === 'scores') { toTitle(); return; }
      steer(+d);
    });
    W.onKey = e => {
      const k = e.key;
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      const dir = { ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3, w: 0, d: 1, s: 2, a: 3, W: 0, D: 1, S: 2, A: 3, '8': 0, '6': 1, '2': 2, '4': 3 }[k];
      if (screen === 'title') {
        if (k === 'Enter' || k === ' ') act('start'); else if (k === 'h' || k === 'H') act('help'); else if (k === 's' || k === 'S') act('scores'); else return;
        e.preventDefault(); return;
      }
      if (screen === 'scores') { if (k !== 'Escape') { e.preventDefault(); toTitle(); } else { e.preventDefault(); toTitle(); } return; }
      if (screen === 'over') {
        if (k === 'Enter' || k === ' ') act('start'); else if (k === 's' || k === 'S') act('scores'); else if (k === 'm' || k === 'M' || k === 'Escape') toTitle(); else return;
        e.preventDefault(); return;
      }
      if (k === 'p' || k === 'P') { e.preventDefault(); togglePause(); return; }
      // Tester shortcut (only with ?dev in the address): type CHEEZY to leave just the crumbs next to the start.
      if (DEV && k.length === 1) { typed = (typed + k.toUpperCase()).slice(-6); if (typed === 'CHEEZY') { const sy = mouse0y(); for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) if ((maze[y][x] === '.' || maze[y][x] === 'o') && !(y === sy && Math.abs(x - 9) <= 2)) { maze[y][x] = ' '; crumbsLeft--; } setMsg('CHEEZY!', 1); } }
      if (k === 'Escape') { e.preventDefault(); act('esc'); return; }
      if (dir != null) { e.preventDefault(); steer(dir); }
    };
    const HELP = 'You are a hungry mouse. Nibble every cheese crumb in the maze to clear the level.\n\n' +
      'Four cats patrol the pantry, and each has its own habit:\n  BRUNO chases you.\n  SLINK tries to cut you off.\n  PATCHES wanders about.\n  MITTENS is shy and backs off when close.\n\n' +
      'Every so often the cats go back to patrolling their corners, then they hunt again.\n\n' +
      'Eat a big wedge of cheese and the cats get scared for a few seconds. Bump into a scared cat to chase it back to its basket for bonus points.\n\n' +
      'Twice a level a lost treasure (a teacup, a button, a thimble...) appears below the basket. Grab it for extra points!\n\n' +
      'Difficulty (Options menu): Easy has slow cats all the way to level 7. Normal starts gentle and gets tougher by level 5. Hard is the full arcade challenge from the start.\n\n' +
      'You start with 3 mice and get one more at 10,000 points. Clearing a level earns money.\n\n' +
      'Keys: arrow keys (or W A S D) move, P pauses, Esc goes back. Touch: swipe on the maze or use the arrow pad.';
    function howTo() {
      const was = paused;
      if (['play', 'ready', 'dying', 'clear'].includes(screen) && !paused) togglePause();
      api.msgBox('How to play Cheese Chase', HELP).then(() => { if (!was && paused) togglePause(); });
    }
    api.menubar([
      { label: 'Game', items: () => [
        { label: 'New game', fn: () => { newGame(); } },
        { label: paused ? 'Resume' : 'Pause', fn: togglePause, disabled: !['play', 'ready', 'dying', 'clear'].includes(screen) },
        { label: 'High scores', fn: () => act('scores') },
        { label: 'Title screen', fn: toTitle }, '-',
        { label: 'Exit', fn: () => api.close() }
      ] },
      { label: 'Options', items: () => [
        ...[['easy', 'Easy (slow cats)'], ['normal', 'Normal'], ['hard', 'Hard (arcade)']].map(([d, l]) => ({ label: (opts.diff === d ? '(*) ' : '( ) ') + 'Difficulty: ' + l, fn: () => { opts.diff = d; api.save('opts', opts); setMsg('DIFFICULTY: ' + d.toUpperCase(), 1.5); render(); } })),
        '-', { label: (opts.sound ? '[x] ' : '[ ] ') + 'Sound', fn: () => { opts.sound = !opts.sound; api.save('opts', opts); } }] },
      { label: 'Help', items: [
        { label: 'How to play', fn: howTo },
        { label: 'About Cheese Chase', fn: () => api.msgBox('About Cheese Chase', 'CHEESE CHASE version 1.0\nCopyright 1985 Nibbleware\n\nEight mazes, four cats, one very brave mouse.') }
      ] }
    ]);
    W.onMin = () => { if (['play', 'ready', 'dying', 'clear'].includes(screen) && !paused) togglePause(); };
    W.onClose = () => { cancelAnimationFrame(raf); raf = 0; if (ro) ro.disconnect(); };
    setEsc(true);
    setTimeout(() => { layout(); kick(); }, 0);
    if (document.fonts && document.fonts.load) document.fonts.load('20px VT323').then(() => render(), () => {});
  }

  (window.RETRO_APPS = window.RETRO_APPS || []).push({
    id: 'mazemuncher', label: 'Cheese Chase', kind: 'store', cat: 'game', year: 1985, price: 9.95, sizeKB: 64, cmd: 'CHEESE',
    help: 'Guide a mouse through mazes to eat every cheese crumb while dodging four cats. Clearing a level earns money.',
    publisher: 'Nibbleware', genre: 'Arcade / Maze',
    tagline: 'Four cats. Eight mazes. One brave mouse.',
    blurb: 'Nibble every crumb in eight twisting pantry mazes while four cats prowl: Bruno chases, Slink cuts you off, Patches wanders and Mittens keeps her distance. Gobble a big wedge of cheese to turn the tables and send the cats scurrying back to their basket. Grab lost teacups, buttons and thimbles for bonus points!',
    box: { bg: '#000000', fg: '#ffff55', accent: '#55ff55' },
    icon: '<svg viewBox="0 0 32 32" shape-rendering="crispEdges" aria-hidden="true"><rect width="32" height="32" fill="#000"/><path d="M1 1h30v30H1z" fill="none" stroke="#aa5500" stroke-width="2"/><path d="M6 6h8v3H9v8H6z" fill="#aa5500"/><rect x="18" y="12" width="8" height="3" fill="#aa5500"/><g fill="#ffff55"><rect x="17" y="6" width="2" height="2"/><rect x="22" y="6" width="2" height="2"/><rect x="11" y="22" width="2" height="2"/><rect x="16" y="22" width="2" height="2"/><path d="M20 26l7-6v6z"/></g><g fill="#fff"><rect x="10" y="12" width="2" height="2"/><rect x="8" y="14" width="5" height="3"/><rect x="5" y="15" width="3" height="1"/><rect x="13" y="15" width="1" height="1"/></g><g fill="#ff5555"><rect x="20" y="18" width="1" height="1"/><rect x="24" y="18" width="1" height="1"/><rect x="20" y="19" width="5" height="3"/></g></svg>',
    window: { w: 720, h: 520 },
    css: `.chz{height:100%;display:flex;flex-direction:column;background:#000;color:#aaa;user-select:none;-webkit-user-select:none}
      .chz-scr{flex:1;min-height:0;display:flex;align-items:center;justify-content:center;overflow:hidden}
      .chz-cv{display:block;touch-action:none}
      .chz-mono .chz-cv{filter:drop-shadow(0 0 3px color-mix(in srgb,var(--phos,#33ff66) 50%,transparent))}
      .chz-pad{flex:none;display:grid;grid-template-columns:repeat(3,56px) 1fr;grid-template-rows:44px 44px;gap:4px;padding:4px 8px 6px;justify-content:center;background:#000;border-top:1px solid #555}
      .chz-pad[hidden]{display:none}
      .chz-pad button{background:#000;color:#55ffff;border:1px solid #55ffff;border-radius:0;padding:0;display:flex;align-items:center;justify-content:center;touch-action:none;font:18px var(--dos),monospace;cursor:pointer}
      .chz-pad button:active{background:#55ffff;color:#000}
      .chz-pad svg{width:22px;height:22px;fill:currentColor}
      .chz-pad [data-d="0"]{grid-column:2;grid-row:1}
      .chz-pad [data-d="3"]{grid-column:1;grid-row:2}
      .chz-pad [data-d="2"]{grid-column:2;grid-row:2}
      .chz-pad [data-d="1"]{grid-column:3;grid-row:2}
      .chz-pad .chz-p{grid-column:4;grid-row:1/3;justify-self:end;width:84px;margin-left:12px}
      .chz-mono .chz-pad{border-top-color:var(--phos,#33ff66)}
      .chz-mono .chz-pad button{color:var(--phos,#33ff66);border-color:var(--phos,#33ff66)}
      .chz-mono .chz-pad button:active{background:var(--phos,#33ff66);color:#000}`,
    open
  });
})();
