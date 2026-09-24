/* Banner Maker: a built-in 1985 print program. Make a long sideways banner, a one-page sign or a greeting card
   from chunky bitmap fonts, pixel clip art and borders, preview it on the monochrome screen, then watch it come
   out of a dot-matrix printer (tractor-feed paper, buzzing printhead). Printouts can be saved to disk (last 10). */
(function () {
  'use strict';

  /* ================= bitmaps ================= */
  const Bmp = (w, h) => ({ w, h, d: new Uint8Array(w * h) });
  const bget = (b, x, y) => (x >= 0 && y >= 0 && x < b.w && y < b.h) ? b.d[y * b.w + x] : 0;
  const bset = (b, x, y, v) => { if (x >= 0 && y >= 0 && x < b.w && y < b.h) b.d[y * b.w + x] = v; };
  const frect = (b, x, y, w, h, v = 1) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) bset(b, x + i, y + j, v); };
  // '#' = ink, '+' = half-tone gray, anything else = paper
  function parse(src) {
    const rows = src.split('/'), h = rows.length, w = Math.max(...rows.map(r => r.length)), b = Bmp(w, h);
    rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) b.d[y * w + x] = r[x] === '#' ? 1 : r[x] === '+' ? 2 : 0; });
    return b;
  }
  function trimX(b) {
    let a = b.w, z = -1;
    for (let x = 0; x < b.w; x++) for (let y = 0; y < b.h; y++) if (b.d[y * b.w + x]) { a = Math.min(a, x); z = Math.max(z, x); }
    if (z < 0) return b;
    const o = Bmp(z - a + 1, b.h);
    for (let y = 0; y < b.h; y++) for (let x = a; x <= z; x++) o.d[y * o.w + x - a] = b.d[y * b.w + x];
    return o;
  }
  function up(b, sx, sy) { const o = Bmp(b.w * sx, b.h * sy); for (let y = 0; y < o.h; y++) for (let x = 0; x < o.w; x++) o.d[y * o.w + x] = b.d[Math.floor(y / sy) * b.w + Math.floor(x / sx)]; return o; }
  function padV(b, t, bt) { const o = Bmp(b.w, b.h + t + bt); o.d.set(b.d, t * b.w); return o; }
  // Copy src into dst at (x0,y0) scaled by s (integer when >= 1, nearest-neighbor when smaller). Paper stays transparent.
  function blit(dst, src, x0, y0, s) {
    const tw = Math.max(1, Math.round(src.w * s)), th = Math.max(1, Math.round(src.h * s));
    for (let ty = 0; ty < th; ty++) {
      const sy = Math.min(src.h - 1, Math.floor(ty / s));
      for (let tx = 0; tx < tw; tx++) { const v = src.d[sy * src.w + Math.min(src.w - 1, Math.floor(tx / s))]; if (v) bset(dst, x0 + tx, y0 + ty, v); }
    }
  }
  const fitScale = (w, h, bw, bh) => { const s = Math.min(bw / w, bh / h); return s >= 1 ? Math.floor(s) : s; };

  /* ================= fonts ================= */
  // 5x7 base alphabet ('@' prints a little heart)
  const F57 = {
    A: '.###./#...#/#...#/#####/#...#/#...#/#...#', B: '####./#...#/#...#/####./#...#/#...#/####.', C: '.###./#...#/#..../#..../#..../#...#/.###.',
    D: '####./#...#/#...#/#...#/#...#/#...#/####.', E: '#####/#..../#..../####./#..../#..../#####', F: '#####/#..../#..../####./#..../#..../#....',
    G: '.###./#...#/#..../#.###/#...#/#...#/.####', H: '#...#/#...#/#...#/#####/#...#/#...#/#...#', I: '.###./..#../..#../..#../..#../..#../.###.',
    J: '..###/...#./...#./...#./...#./#..#./.##..', K: '#...#/#..#./#.#../##.../#.#../#..#./#...#', L: '#..../#..../#..../#..../#..../#..../#####',
    M: '#...#/##.##/#.#.#/#.#.#/#...#/#...#/#...#', N: '#...#/#...#/##..#/#.#.#/#..##/#...#/#...#', O: '.###./#...#/#...#/#...#/#...#/#...#/.###.',
    P: '####./#...#/#...#/####./#..../#..../#....', Q: '.###./#...#/#...#/#...#/#.#.#/#..#./.##.#', R: '####./#...#/#...#/####./#.#../#..#./#...#',
    S: '.####/#..../#..../.###./....#/....#/####.', T: '#####/..#../..#../..#../..#../..#../..#..', U: '#...#/#...#/#...#/#...#/#...#/#...#/.###.',
    V: '#...#/#...#/#...#/#...#/#...#/.#.#./..#..', W: '#...#/#...#/#...#/#.#.#/#.#.#/#.#.#/.#.#.', X: '#...#/#...#/.#.#./..#../.#.#./#...#/#...#',
    Y: '#...#/#...#/.#.#./..#../..#../..#../..#..', Z: '#####/....#/...#./..#../.#.../#..../#####',
    0: '.###./#...#/#..##/#.#.#/##..#/#...#/.###.', 1: '..#../.##../..#../..#../..#../..#../.###.', 2: '.###./#...#/....#/...#./..#../.#.../#####',
    3: '#####/...#./..#../...#./....#/#...#/.###.', 4: '...#./..##./.#.#./#..#./#####/...#./...#.', 5: '#####/#..../####./....#/....#/#...#/.###.',
    6: '..##./.#.../#..../####./#...#/#...#/.###.', 7: '#####/....#/...#./..#../.#.../.#.../.#...', 8: '.###./#...#/#...#/.###./#...#/#...#/.###.',
    9: '.###./#...#/#...#/.####/....#/...#./.##..',
    '!': '..#../..#../..#../..#../..#../...../..#..', '?': '.###./#...#/....#/...#./..#../...../..#..', '.': '...../...../...../...../...../.##../.##..',
    ',': '...../...../...../...../.##../..#../.#...', "'": '..#../..#../.#.../...../...../...../.....', '"': '.#.#./.#.#./...../...../...../...../.....',
    '-': '...../...../...../.###./...../...../.....', '+': '...../..#../..#../#####/..#../..#../.....', ':': '...../.##../.##../...../.##../.##../.....',
    '&': '.##../#..#./#.#../.#.../#.#.#/#..#./.##.#', '/': '....#/...#./...#./..#../.#.../.#.../#....', '(': '...#./..#../.#.../.#.../.#.../..#../...#.',
    ')': '.#.../..#../...#./...#./...#./..#../.#...', '#': '.#.#./.#.#./#####/.#.#./#####/.#.#./.#.#.', '*': '...../#.#.#/.###./#####/.###./#.#.#/.....',
    '$': '..#../.####/#.#../.###./..#.#/####./..#..', '=': '...../...../#####/...../#####/...../.....', '@': '...../.#.#./#####/#####/.###./..#../.....'
  };
  // 7x9 serif letters and 5x9 figures; punctuation borrows the base shapes
  const F79 = {
    A: '...#.../..#.#../..#.#../.#...#./.#...#./.#####./#.....#/#.....#/##...##', B: '######./.#....#/.#....#/.#....#/.#####./.#....#/.#....#/.#....#/######.',
    C: '..###.#/.#...##/#.....#/#....../#....../#....../#.....#/.#...#./..###..', D: '#####../.#...#./.#....#/.#....#/.#....#/.#....#/.#....#/.#...#./#####..',
    E: '#######/.#....#/.#...../.#..#../.####../.#..#../.#...../.#....#/#######', F: '#######/.#....#/.#...../.#..#../.####../.#..#../.#...../.#...../###....',
    G: '..###.#/.#...##/#.....#/#....../#....../#..####/#.....#/.#...##/..###.#', H: '###.###/.#...#./.#...#./.#...#./.#####./.#...#./.#...#./.#...#./###.###',
    I: '#####/..#../..#../..#../..#../..#../..#../..#../#####', J: '...####/.....#./.....#./.....#./.....#./.....#./#....#./#....#./.####..',
    K: '###.###/.#...#./.#..#../.#.#.../.##..../.#.#.../.#..#../.#...#./###.###', L: '###..../.#...../.#...../.#...../.#...../.#...../.#...../.#....#/#######',
    M: '##...##/.##.##./.#.#.#./.#.#.#./.#...#./.#...#./.#...#./.#...#./###.###', N: '##..###/.##..#./.##..#./.#.#.#./.#.#.#./.#.#.#./.#..##./.#..##./###..#.',
    O: '..###../.#...#./#.....#/#.....#/#.....#/#.....#/#.....#/.#...#./..###..', P: '######./.#....#/.#....#/.#....#/.#####./.#...../.#...../.#...../###....',
    Q: '..###../.#...#./#.....#/#.....#/#.....#/#..#..#/#...#.#/.#...#./..###.#', R: '######./.#....#/.#....#/.#....#/.#####./.#..#../.#...#./.#....#/###..##',
    S: '.####.#/#....##/#....../.#...../..###../.....#./......#/##....#/#.####.', T: '#######/#..#..#/...#.../...#.../...#.../...#.../...#.../...#.../..###..',
    U: '###.###/.#...#./.#...#./.#...#./.#...#./.#...#./.#...#./.#...#./..###..', V: '###.###/.#...#./.#...#./.#...#./..#.#../..#.#../..#.#../...#.../...#...',
    W: '###.###/.#...#./.#...#./.#...#./.#.#.#./.#.#.#./.#.#.#./..#.#../..#.#..', X: '###.###/.#...#./..#.#../..#.#../...#.../..#.#../..#.#../.#...#./###.###',
    Y: '###.###/.#...#./..#.#../..#.#../...#.../...#.../...#.../...#.../..###..', Z: '#######/#....#./....#../...#.../...#.../..#..../.#...../#.....#/#######',
    0: '.###./#...#/#...#/#...#/#...#/#...#/#...#/#...#/.###.', 1: '..#../.##../#.#../..#../..#../..#../..#../..#../#####', 2: '.###./#...#/....#/....#/...#./..#../.#.../#...#/#####',
    3: '.###./#...#/....#/....#/..##./....#/....#/#...#/.###.', 4: '...#./..##./.#.#./#..#./#..#./#####/...#./...#./..###', 5: '#####/#..../#..../####./....#/....#/....#/#...#/.###.',
    6: '..##./.#.../#..../####./#...#/#...#/#...#/#...#/.###.', 7: '#####/#...#/....#/...#./...#./..#../..#../..#../..#..', 8: '.###./#...#/#...#/#...#/.###./#...#/#...#/#...#/.###.',
    9: '.###./#...#/#...#/#...#/.####/....#/....#/...#./.##..'
  };
  const FONTS = [
    { id: 'block', name: 'BLOCK', note: 'Big, bold, easy to read' },
    { id: 'roman', name: 'ROMAN', note: 'Fancy letters with serifs' },
    { id: 'outline', name: 'OUTLINE', note: 'Hollow letters' },
    { id: 'shadow', name: 'SHADOW', note: '3-D letters with a shadow' },
    { id: 'tall', name: 'TALL', note: 'Tall and thin' },
    { id: 'bubble', name: 'BUBBLE', note: 'Round, puffy letters' }
  ];
  const FH = { block: 7, roman: 9, outline: 16, shadow: 16, tall: 14, bubble: 16 };
  const FSP = { block: 1, roman: 1, outline: 0, shadow: 1, tall: 1, bubble: 0 };
  const gcache = {};
  function baseG(ch) { return ch === ' ' ? Bmp(3, 7) : F57[ch] ? trimX(parse(F57[ch])) : null; }
  function glyph(font, ch) {
    const key = font + ch; if (key in gcache) return gcache[key];
    let g = null;
    const b = baseG(ch);
    if (font === 'block') g = b;
    else if (font === 'roman') g = ch === ' ' ? Bmp(4, 9) : F79[ch] ? trimX(parse(F79[ch])) : b && padV(b, 1, 1);
    else if (font === 'tall') g = b && up(b, 1, 2);
    else if (b) {
      const g2 = up(b, 2, 2), o = Bmp(g2.w + 2, g2.h + 2), at = (x, y) => bget(g2, x - 1, y - 1);
      for (let y = 0; y < o.h; y++) for (let x = 0; x < o.w; x++) {
        if (ch === ' ') break;
        let v = 0;
        if (font === 'outline') {
          let dil = 0; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) if (at(x + i, y + j)) dil = 1;
          v = dil && !at(x, y) ? 1 : 0;
        } else if (font === 'shadow') {
          v = bget(g2, x, y) ? 1 : bget(g2, x - 2, y - 2) ? 2 : 0;
        } else if (font === 'bubble') {
          v = at(x, y) || at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1) ? 1 : 0;
        }
        o.d[y * o.w + x] = v;
      }
      g = o;
    }
    return (gcache[key] = g);
  }
  function lineBmp(font, str) {
    const gs = [...String(str)].map(c => glyph(font, c)).filter(Boolean), sp = FSP[font], h = FH[font];
    if (!gs.length) return null;
    const w = gs.reduce((a, g) => a + g.w, 0) + sp * (gs.length - 1), o = Bmp(w, h);
    let x = 0; gs.forEach(g => { blit(o, g, x, 0, 1); x += g.w + sp; });
    return o;
  }
  const ALLOWED = /[A-Z0-9 .,!?'"\-+:&/()#*$=@]/;
  const clean = (s, max) => [...String(s).toUpperCase()].filter(c => ALLOWED.test(c)).join('').slice(0, max);

  /* ================= clip art (16 x 16) ================= */
  const GR = [
    ['heart', 'HEART', '................/..####....####../.######..######./################/################/#####.##########/####.###########/.##############./..############../...##########.../....########..../.....######...../......####....../.......##......./................/................'],
    ['star', 'STAR', '.......##......./.......##......./......####....../......####....../.....######...../################/.##############./..############../...##########.../....########..../....########..../...####..####.../...###....###.../..###......###../..##........##../.#............#.'],
    ['balloon', 'BALLOON', '.....######...../...##########.../..###..#######../.###..#########./.##..##########./.##############./.##############./.##############./..############../...##########.../....########..../......####....../.......##......./......#..#....../.......#......../........#.......'],
    ['cake', 'CAKE', '..++...++...++../..##...##...##../................/..##...##...##../..##...##...##../.##############./.#............#./.#.##.##.##.##.#/.##############./.#++++++++++++#./.#++++++++++++#./.##############./.#............#./.#.#.#.#.#.#.#.#/################/................'],
    ['rocket', 'ROCKET', '.......##......./......####....../.....######...../.....######...../....###..###..../....##....##..../....###..###..../....########..../....########..../....########..../...##########.../..###.####.###../..##..####..##../......++++....../.....+.++.+...../......+..+......'],
    ['cat', 'CAT', '.#............#./.##..........##./.###........###./.##############./.##############./.###..####..###./.###..####..###./.##############./.######..######./#.############.#/.####.#..#.####./..############../...##########.../....########..../................/................'],
    ['dog', 'DOG', '....########..../++.##########.++/+++##########+++/+++###.##.###+++/+++###.##.###+++/+++##########+++/++.##########.++/++.##......##.++/...#..####..#.../...#...##...#.../...#..#..#..#.../....#......#..../.....######...../......++++....../................/................'],
    ['sun', 'SUN', '.......##......./..#....##....#../...#........#.../......####....../....########..../....########..../...##########.../##.##########.##/##.##########.##/...##########.../....########..../....########..../......####....../...#........#.../..#....##....#../.......##.......'],
    ['tree', 'TREE', '.......##......./......####....../.....######...../....########..../......####....../.....######...../....########..../...##########.../.....######...../....########..../...##########.../..############../.##############./......++++....../......++++....../....########....'],
    ['trophy', 'TROPHY', '..############../##.##########.##/#..####.#####..#/#..###...####..#/.#.##########.#./..#.########.#../....########..../.....######...../......####....../.......##......./.......##......./......####....../....########..../....#++++++#..../....########..../................'],
    ['note', 'MUSIC NOTE', '................/......#########./......#########./......#.......#./......#.......#./......#.......#./......#.......#./......#.......#./......#.......#./......#.......#./......#.......#./..#####...#####./.######..######./.######..######./..####....####../................'],
    ['flower', 'FLOWER', '......####....../..##.######.##../.#####.##.#####./.######..######./..####++++####../...##++++++##.../..####++++####../.######..######./.#####.##.#####./..##.######.##../......####....../.......##......./.###...##...###./..###..##..###../....##.##.##..../......####......'],
    ['house', 'HOUSE', '.......##......./......####..##../.....######.##../....##########../...##########.../..############../.##############./################/..#..........#../..#.+++..###.#../..#.+++..#.#.#../..#.+++..#.#.#../..#......#.#.#../..############../................/................'],
    ['smile', 'SMILEY', '.....######...../...##......##.../..#..........#../.#............#./.#...##..##...#./#....##..##....#/#....##..##....#/#..............#/#..............#/#..#........#..#/.#..#......#..#./.#...######...#./..#..........#../...##......##.../.....######...../................'],
    ['gift', 'GIFT', '...###....###.../..#...#..#...#../...###.##.###.../.......##......./################/#######..#######/################/.######..######./.######..######./.######..######./.######..######./.######..######./.######..######./.######..######./.######..######./.##############.']
  ].map(([id, name, src]) => ({ id, name, b: parse(src) }));
  const grById = id => GR.find(g => g.id === id);

  /* ================= borders ================= */
  const TILES = {
    hearts: parse('.##..##./########/########/########/.######./..####../...##.../........'),
    stars: parse('...##.../...##.../########/.######./..####../.##..##./.#....#./........'),
    diamonds: parse('...##.../..####../.######./########/.######./..####../...##.../........'),
    dots: parse('......../..####../.######./.######./.######./.######./..####../........')
  };
  const BORDERS = [
    { id: 'none', name: 'NO BORDER' }, { id: 'line', name: 'THIN LINE' }, { id: 'double', name: 'DOUBLE LINE' }, { id: 'dots', name: 'DOTS' },
    { id: 'hearts', name: 'HEARTS' }, { id: 'stars', name: 'STARS' }, { id: 'diamonds', name: 'DIAMONDS' }, { id: 'checker', name: 'CHECKERBOARD' }
  ];
  const BAND = 10;
  function tileRun(b, t, x, y, len, horiz) {
    const n = Math.max(1, Math.round(len / 12)), step = len / n;
    for (let i = 0; i < n; i++) { const p = Math.round(i * step + (step - 8) / 2); if (horiz) blit(b, t, x + p, y, 1); else blit(b, t, x, y + p, 1); }
  }
  // A border band BAND dots thick just inside the rectangle. sides=false draws only top and bottom (banners).
  function drawBorder(b, x, y, w, h, kind, sides = true) {
    const hl = (yy, t) => frect(b, x, yy, w, t), vl = (xx, t) => frect(b, xx, y, t, h);
    if (kind === 'line') { hl(y + 3, 2); hl(y + h - 5, 2); if (sides) { vl(x + 3, 2); vl(x + w - 5, 2); } }
    else if (kind === 'double') {
      hl(y + 1, 3); hl(y + h - 4, 3); hl(y + 7, 1); hl(y + h - 8, 1);
      if (sides) { vl(x + 1, 3); vl(x + w - 4, 3); frect(b, x + 7, y + 7, 1, h - 14); frect(b, x + w - 8, y + 7, 1, h - 14); frect(b, x + 7, y + h - 8, w - 14, 1); frect(b, x + 7, y + 7, w - 14, 1); frect(b, x, y + 7, 7, 1, 0); frect(b, x + w - 7, y + 7, 7, 1, 0); frect(b, x, y + h - 8, 7, 1, 0); frect(b, x + w - 7, y + h - 8, 7, 1, 0); }
    }
    else if (kind === 'checker') {
      const put = (xx, yy, ww, hh) => { for (let j = 0; j < hh; j++) for (let i = 0; i < ww; i++) if ((Math.floor((xx + i) / 4) + Math.floor((yy + j) / 4)) % 2 === 0) bset(b, xx + i, yy + j, 1); };
      put(x + 1, y + 1, w - 2, 8); put(x + 1, y + h - 9, w - 2, 8);
      if (sides) { put(x + 1, y + 9, 8, h - 18); put(x + w - 9, y + 9, 8, h - 18); }
    }
    else if (TILES[kind]) {
      const t = TILES[kind];
      tileRun(b, t, x, y + 1, w, true); tileRun(b, t, x, y + h - 9, w, true);
      if (sides && h > 2 * BAND + 8) { tileRun(b, t, x + 1, y + BAND, h - 2 * BAND, false); tileRun(b, t, x + w - 9, y + BAND, h - 2 * BAND, false); }
    }
  }

  /* ================= page layout ================= */
  const LAYOUTS = {
    banner: ['PICTURE AT BOTH ENDS', 'PICTURE AT THE START', 'PICTURE AT THE END'],
    page: ['BIG PICTURE ON TOP', 'PICTURES IN CORNERS', 'ROWS OF PICTURES']
  };
  const TYPES = {
    banner: { name: 'BANNER', lines: 1, max: 24, prompt: 'Type your banner message (up to 24 letters).' },
    sign: { name: 'SIGN', lines: 3, max: 12, prompt: 'Type up to 3 lines for your sign (12 letters each).' },
    card: { name: 'GREETING CARD', lines: 2, max: 12, prompt: 'Type the words for the front of the card (2 lines, 12 letters each).' }
  };
  const INSIDE = { lines: 4, max: 18 };
  const PAGE_W = 192, PAGE_H = 248, BAN_H = 176;

  // Fit text lines into a box. Returns the scale used (0 when there was nothing to draw).
  function measure(font, lines, bw, bh) {
    const bs = lines.map(l => lineBmp(font, l)).filter(Boolean);
    if (!bs.length) return { bs, s: 0 };
    const gh = FH[font], gap = Math.ceil(gh * 0.4), n = bs.length;
    const tw = Math.max(...bs.map(b => b.w)), th = n * gh + (n - 1) * gap;
    return { bs, s: fitScale(tw, th, bw, bh), gh, gap, th };
  }
  function textBlock(b, font, lines, box) {
    const m = measure(font, lines, box.w, box.h); if (!m.s) return 0;
    const hh = m.th * m.s; let y = box.y + Math.round((box.h - hh) / 2);
    m.bs.forEach(lb => { blit(b, lb, box.x + Math.round((box.w - lb.w * m.s) / 2), Math.round(y), m.s); y += (m.gh + m.gap) * m.s; });
    return m.s;
  }
  function pic(b, gid, box) {
    const g = grById(gid); if (!g) return;
    const s = fitScale(16, 16, box.w, box.h), sz = Math.round(16 * s);
    blit(b, g.b, box.x + Math.round((box.w - sz) / 2), box.y + Math.round((box.h - sz) / 2), s);
  }
  const hasText = lines => lines.some(l => l.trim());
  function front(b, p, box, small) {
    const lines = p.lines.filter(l => l.trim()), g = p.graphic !== 'none';
    if (!g) { textBlock(b, p.font, lines, box); return; }
    if (!lines.length) { pic(b, p.graphic, box); return; }
    if (p.layout === 0) {
      const gs = Math.min(box.w, Math.round(box.h * 0.46));
      pic(b, p.graphic, { x: box.x, y: box.y, w: box.w, h: gs });
      textBlock(b, p.font, lines, { x: box.x, y: box.y + gs + 4, w: box.w, h: box.h - gs - 4 });
    } else if (p.layout === 1) {
      const c = small ? 24 : 36;
      [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(([i, j]) => pic(b, p.graphic, { x: box.x + i * (box.w - c), y: box.y + j * (box.h - c), w: c, h: c }));
      // text between the top and bottom pairs, or between the left and right pairs: whichever gives bigger letters
      const A = { x: box.x, y: box.y + c + 3, w: box.w, h: box.h - 2 * c - 6 }, B = { x: box.x + c + 3, y: box.y, w: box.w - 2 * c - 6, h: box.h };
      const sa = measure(p.font, lines, A.w, A.h).s, sb = measure(p.font, lines, B.w, B.h).s;
      textBlock(b, p.font, lines, sa >= sb ? A : B);
    } else {
      const rs = small ? 22 : 34;
      for (let i = 0; i < 3; i++) {
        const x = box.x + Math.round((i + 0.5) * box.w / 3 - rs / 2);
        pic(b, p.graphic, { x, y: box.y, w: rs, h: rs }); pic(b, p.graphic, { x, y: box.y + box.h - rs, w: rs, h: rs });
      }
      textBlock(b, p.font, lines, { x: box.x, y: box.y + rs + 3, w: box.w, h: box.h - 2 * rs - 6 });
    }
  }
  function panel(b, p, y, h) {
    if (p.border === 'none') return { x: 8, y: y + 8, w: PAGE_W - 16, h: h - 16 };
    drawBorder(b, 4, y + 4, PAGE_W - 8, h - 8, p.border);
    return { x: 18, y: y + 18, w: PAGE_W - 36, h: h - 36 };
  }
  function compose(p) {
    if (p.type === 'banner') {
      const bord = p.border !== 'none', iy = bord ? 18 : 8, ih = BAN_H - 2 * iy;
      const txt = p.lines[0] || '', lb = lineBmp(p.font, txt), gh = FH[p.font];
      const s = Math.max(1, Math.floor(ih / gh)), tw = lb ? lb.w * s : 0;
      const g = p.graphic !== 'none', gs = ih, gStart = g && (p.layout !== 2 || !lb), gEnd = g && p.layout !== 1 && !!lb;
      let L = 16 + (gStart ? gs + (lb ? 16 : 0) : 0) + tw + (gEnd ? 16 + gs : 0) + 16;
      L = Math.max(L, BAN_H);
      const b = Bmp(L, BAN_H);
      if (bord) { drawBorder(b, 0, 2, L, BAN_H - 4, p.border, false); }
      let x = Math.round((L - ((gStart ? gs + (lb ? 16 : 0) : 0) + tw + (gEnd ? 16 + gs : 0))) / 2);
      if (gStart) { pic(b, p.graphic, { x, y: iy, w: gs, h: gs }); x += gs + (lb ? 16 : 0); }
      if (lb) { blit(b, lb, x, iy + Math.round((ih - gh * s) / 2), s); x += tw + 16; }
      if (gEnd) pic(b, p.graphic, { x, y: iy, w: gs, h: gs });
      return b;
    }
    const b = Bmp(PAGE_W, PAGE_H);
    if (p.type === 'sign') { front(b, p, panel(b, p, 0, PAGE_H), false); return b; }
    const half = PAGE_H / 2;
    front(b, p, panel(b, p, 0, half), true);
    const box = panel(b, p, half, half), ins = p.inside.filter(l => l.trim());
    let tb = box;
    if (p.graphic !== 'none') { const gs = ins.length ? 20 : box.h; pic(b, p.graphic, { x: box.x, y: box.y + box.h - gs, w: box.w, h: gs }); tb = { x: box.x, y: box.y, w: box.w, h: box.h - gs - 3 }; }
    if (ins.length) { const m = measure(p.font, ins, tb.w, tb.h); textBlock(b, m.s >= 1 ? p.font : 'block', ins, tb); }
    for (let x = 0; x < PAGE_W; x += 6) { bset(b, x, half, 1); bset(b, x + 1, half, 1); }
    return b;
  }

  /* ================= paper (tractor feed) ================= */
  const STRIP = 14, LEAD = 16, PAGE_LEN = 280, PAPER_W = STRIP * 2 + PAGE_W;
  // Content in paper orientation: a banner is printed sideways, its start coming out of the printer first.
  function toPaper(p, bmp) {
    let c = bmp;
    if (p.type === 'banner') {
      c = Bmp(PAGE_W, bmp.w); const ox = (PAGE_W - bmp.h) / 2;
      for (let r = 0; r < bmp.w; r++) for (let j = 0; j < bmp.h; j++) c.d[r * PAGE_W + ox + j] = bmp.d[(bmp.h - 1 - j) * bmp.w + r];
    }
    const rows = c.h + LEAD * 2;
    return { c, rows, pages: Math.max(1, Math.ceil(rows / PAGE_LEN)) };
  }
  const INK = '#1c1d30', PAPER = '#f3f0e4';
  function dotSprite(K) {
    const s = Math.max(2, Math.ceil(K * 1.3)), cv = document.createElement('canvas'); cv.width = cv.height = s;
    const g = cv.getContext('2d'), gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    gr.addColorStop(0, 'rgba(20,20,40,0.95)'); gr.addColorStop(0.6, 'rgba(24,24,44,0.85)'); gr.addColorStop(1, 'rgba(24,24,44,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(s / 2, s / 2, s / 2, 0, 7); g.fill();
    return cv;
  }
  // Offscreen sheet at K device pixels per dot: paper, holes, perforations. Ink is added with inkRows().
  function Sheet(paper, K) {
    const cv = document.createElement('canvas'); cv.width = Math.ceil(PAPER_W * K); cv.height = Math.ceil(paper.rows * K);
    const g = cv.getContext('2d');
    g.fillStyle = PAPER; g.fillRect(0, 0, cv.width, cv.height);
    g.fillStyle = 'rgba(0,0,0,0.035)'; g.fillRect(0, 0, STRIP * K, cv.height); g.fillRect((PAPER_W - STRIP) * K, 0, STRIP * K, cv.height);
    g.fillStyle = '#b9b4a2';
    for (let y = 0; y < paper.rows; y += 3) { g.fillRect(STRIP * K, y * K, Math.max(1, K * 0.35), K * 1.5); g.fillRect((PAPER_W - STRIP) * K, y * K, Math.max(1, K * 0.35), K * 1.5); }
    for (let y = PAGE_LEN; y < paper.rows; y += PAGE_LEN) for (let x = 0; x < PAPER_W; x += 3) g.fillRect(x * K, y * K, K * 1.5, Math.max(1, K * 0.35));
    g.fillStyle = '#111';
    for (let y = 6; y < paper.rows; y += 12) [STRIP / 2, PAPER_W - STRIP / 2].forEach(x => { g.beginPath(); g.arc(x * K, y * K, K * 2.6, 0, 7); g.fill(); });
    const spr = K >= 1.8 ? dotSprite(K) : null, so = spr ? (spr.width - K) / 2 : 0;
    g.fillStyle = INK;
    const S = { cv, K };
    S.ink = (r0, r1, c0, c1) => {
      const c = paper.c;
      for (let r = Math.max(r0, LEAD); r < Math.min(r1, LEAD + c.h); r++) {
        const cr = r - LEAD, row = cr * c.w;
        for (let x = c0; x < c1; x++) {
          const v = c.d[row + x]; if (!v || (v === 2 && (x + cr) % 2)) continue;
          const px = (STRIP + x) * K, py = r * K;
          if (spr) g.drawImage(spr, px - so + ((x * 7 + cr * 3) % 5 - 2) * K * 0.03, py - so); else g.fillRect(px, py, K + 0.3, K + 0.3);
        }
      }
    };
    return S;
  }
  const inkDensity = (paper, r0, r1) => {
    let n = 0, t = 0; const c = paper.c;
    for (let r = Math.max(r0, LEAD); r < Math.min(r1, LEAD + c.h); r++) for (let x = 0; x < c.w; x++) { t++; if (c.d[(r - LEAD) * c.w + x]) n++; }
    return t ? n / t : 0;
  };

  /* ================= misc ================= */
  const ICON = '<svg viewBox="0 0 32 32" shape-rendering="crispEdges" aria-hidden="true"><rect x="7" y="1" width="18" height="14" fill="#fff" stroke="#000"/><g fill="#999"><rect x="8" y="3" width="1" height="1"/><rect x="8" y="7" width="1" height="1"/><rect x="8" y="11" width="1" height="1"/><rect x="23" y="3" width="1" height="1"/><rect x="23" y="7" width="1" height="1"/><rect x="23" y="11" width="1" height="1"/></g><g fill="#c00"><rect x="11" y="4" width="3" height="3"/><rect x="15" y="4" width="3" height="3"/><rect x="12" y="7" width="5" height="2"/><rect x="13" y="9" width="3" height="1"/></g><rect x="11" y="11" width="10" height="2" fill="#000"/><rect x="2" y="15" width="28" height="11" fill="#d8cfb0" stroke="#000"/><rect x="5" y="17" width="22" height="2" fill="#333"/><rect x="5" y="22" width="9" height="2" fill="#8a826a"/><rect x="24" y="22" width="3" height="2" fill="#0c0"/><rect x="4" y="26" width="24" height="3" fill="#a8a088" stroke="#000"/></svg>';

  const CSS = `
    .bm{height:100%;display:flex;flex-direction:column;background:#000;color:var(--phos,#33ff66);font:18px/1.25 var(--dos);overflow:hidden;--bmd:color-mix(in srgb,var(--phos,#33ff66) 45%,#000)}
    .bm button{font:inherit;color:inherit;background:transparent;border:0;padding:0;cursor:pointer;text-align:left}
    .bm-head{flex:none;display:flex;justify-content:space-between;gap:12px;background:var(--phos,#33ff66);color:#000;padding:1px 8px;white-space:nowrap;overflow:hidden}
    .bm-head span:last-child{overflow:hidden;text-overflow:ellipsis}
    .bm-main{flex:1;min-height:0;position:relative;padding:8px 10px;overflow:auto}
    .bm-foot{flex:none;display:flex;flex-wrap:wrap;gap:4px;padding:4px 6px;border-top:1px solid var(--bmd)}
    .bm-foot button{background:var(--phos,#33ff66);color:#000;padding:4px 10px;min-height:36px}
    .bm-foot button:focus-visible,.bm-it:focus-visible,.bm-act:focus-visible{outline:2px dashed var(--phos,#33ff66);outline-offset:2px}
    .bm h2{font:inherit;margin:0 0 6px;letter-spacing:1px}
    .bm p{margin:0 0 8px}
    .bm-dim{opacity:.7}
    .bm-note{font-style:normal;font-size:15px;opacity:.75}
    .bm-home{display:flex;flex-direction:column;align-items:center;gap:8px;min-height:100%}
    .bm-logo{display:block;max-width:100%}
    .bm-menu{display:flex;flex-direction:column;gap:2px;width:min(420px,100%)}
    .bm-it{display:flex;align-items:center;gap:10px;width:100%;padding:6px 10px;min-height:40px;border:1px solid transparent}
    .bm-it b{font-weight:400;min-width:2.2em}
    .bm-it small{margin-left:auto;font-size:15px;opacity:.75;text-align:right}
    .bm-it.on{background:var(--phos,#33ff66);color:#000}
    .bm-it canvas{flex:none;background:#000;display:block}
    .bm-split{display:flex;gap:12px;height:100%}
    .bm-list{flex:0 0 min(330px,45%);overflow:auto;display:flex;flex-direction:column;gap:2px;padding:2px}
    .bm-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(88px,1fr));gap:4px;align-content:start}
    .bm-grid .bm-it{flex-direction:column;justify-content:center;gap:4px;padding:6px 2px;text-align:center;font-size:15px}
    .bm-pv{flex:1;min-width:0;min-height:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;border:1px solid var(--bmd);padding:6px;position:relative}
    .bm-pv .bm-cv{flex:1;min-height:0;width:100%;display:flex;align-items:center;justify-content:center;overflow:hidden}
    .bm-pv canvas{display:block}
    .bm-cap{font-size:15px;opacity:.8;text-align:center}
    .bm-narrow .bm-split{flex-direction:column}
    .bm-narrow .bm-list{flex:1 1 auto}
    .bm-narrow .bm-pv{flex:0 0 38%}
    .bm-narrow.bm-wide .bm-pv{flex:0 0 120px}
    .bm-narrow .bm-pvbig .bm-pv{flex:1 1 auto}
    .bm-narrow .bm-acts h2,.bm-narrow .bm-acts .bm-msg{grid-column:1/-1}
    .bm-narrow .bm-foot button{padding:3px 7px;font-size:16px;min-height:34px}
    .bm-nopic{width:44px;height:44px;border:1px dashed currentColor;display:flex;align-items:center;justify-content:center}
    .bm-form{display:flex;flex-direction:column;gap:6px;flex:0 0 min(360px,48%);overflow:auto}
    .bm-narrow .bm-form{flex:1 1 auto}
    .bm-form label{display:flex;gap:8px;align-items:center}
    .bm-form input{flex:1;min-width:0;background:#000;color:var(--phos,#33ff66);border:1px solid var(--phos,#33ff66);font:20px var(--dos);padding:6px 8px;text-transform:uppercase;min-height:40px;box-sizing:border-box}
    .bm-form input:focus{outline:none;background:color-mix(in srgb,var(--phos,#33ff66) 18%,#000)}
    .bm-acts{flex:0 0 220px;display:flex;flex-direction:column;gap:2px;overflow:auto}
    .bm-narrow .bm-acts{flex:none;display:grid;grid-template-columns:1fr 1fr}
    .bm-act{display:flex;gap:8px;align-items:center;padding:5px 8px;min-height:38px;border:1px solid var(--bmd)}
    .bm-act.on{background:var(--phos,#33ff66);color:#000}
    .bm-act b{font-weight:400}
    .bm-prn{position:absolute;inset:0;background:#141210}
    .bm-prn canvas{display:block}
    .bm-paper{flex:1;min-width:0;min-height:0;display:flex;align-items:center;justify-content:center;background:#141210;overflow:hidden;position:relative}
    .bm-paper.scroll{overflow-x:auto;overflow-y:hidden;justify-content:flex-start;align-items:center}
    .bm-paper canvas{display:block;flex:none}
    .bm-help{max-width:760px}
    .bm-help p{margin:0 0 10px}
    .bm-gl{flex:0 0 min(420px,55%)}
    .bm-empty{padding:20px;text-align:center}
    .bm-msg{min-height:1.3em}
  `;

  function open(W, api) {
    const E = api.esc;
    const YY = String(api.era.year).slice(2);
    W.body.innerHTML = `<div class="bm"><div class="bm-head"><span></span><span></span></div><div class="bm-main"></div><div class="bm-foot"></div></div>`;
    const root = W.body.firstChild, head = root.querySelector('.bm-head'), main = root.querySelector('.bm-main'), foot = root.querySelector('.bm-foot');
    let scr = 'home', sel = 0, proj = null, ret = null, helpBack = 'home', galSel = 0, res = null, resBack = 'preview', note = '';
    let PR = null, raf = 0, closed = false, iframe = null;
    const timers = new Set();
    const later = (f, ms) => { const t = setTimeout(() => { timers.delete(t); if (!closed) f(); }, ms); timers.add(t); };
    const phos = () => (getComputedStyle(root).getPropertyValue('--phos') || '').trim() || '#33ff66';
    const blip = () => { try { api.tone(1320, 0.018, { vol: 0.03 }); } catch (e) {} };
    const buzz = () => { try { api.tone(140, 0.18, { type: 'square', vol: 0.05 }); } catch (e) {} };
    const saved = () => api.load('prints', []);

    api.menubar([
      { label: 'File', items: () => [
        { label: 'New', fn: () => go('home') },
        { label: 'Open saved', fn: () => { galSel = 0; go('gallery'); } },
        '-', { label: 'Exit', fn: () => api.close() }
      ] },
      { label: 'Help', items: [
        { label: 'How to use', fn: () => showHelp() },
        { label: 'About', fn: () => api.msgBox('Banner Maker', 'Banner Maker  Version 1.0\n\nMake banners, signs and greeting cards and print them on your dot-matrix printer.\n\n6 fonts, 15 pictures, 7 borders.') }
      ] }
    ]);

    /* ---------- project ---------- */
    function fresh(type) {
      if (type === 'banner') return { type, font: 'block', lines: ['HAPPY BIRTHDAY!'], graphic: 'balloon', layout: 0, border: 'none', inside: [] };
      if (type === 'sign') return { type, font: 'block', lines: ['GARAGE', 'SALE', 'TODAY'], graphic: 'star', layout: 2, border: 'double', inside: [] };
      return { type, font: 'roman', lines: ['HAPPY', 'BIRTHDAY!'], graphic: 'cake', layout: 0, border: 'hearts', inside: ['HAVE A', 'WONDERFUL DAY!', '', ''] };
    }
    const steps = p => ['font', 'text', 'graphic'].concat(p.graphic !== 'none' ? ['layout'] : [], ['border'], p.type === 'card' ? ['inside'] : []);
    const typeName = p => TYPES[p.type].name;
    const pagesOf = (p, b) => Math.max(1, Math.ceil(((p.type === 'banner' ? b.w : b.h) + LEAD * 2) / PAGE_LEN));
    const describe = p => [typeName(p), FONTS.find(f => f.id === p.font).name, p.graphic === 'none' ? 'NO PICTURE' : grById(p.graphic).name, BORDERS.find(b => b.id === p.border).name].join(' / ');
    const titleOf = p => p.lines.map(l => l.trim()).filter(Boolean).join(' ') || (p.graphic !== 'none' ? grById(p.graphic).name : 'UNTITLED');

    /* ---------- canvases ---------- */
    // Draw a design on the monochrome screen, fitted in (bw x bh) CSS pixels.
    function drawPhos(cv, bmp, bw, bh, frame = true) {
      const k = Math.max(0.05, Math.min(bw / bmp.w, bh / bmp.h)), dpr = window.devicePixelRatio || 1;
      const cw = Math.max(1, Math.floor(bmp.w * k)), ch = Math.max(1, Math.floor(bmp.h * k));
      cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr); cv.style.width = cw + 'px'; cv.style.height = ch + 'px';
      const g = cv.getContext('2d'), K = k * dpr, col = phos(), dot = K >= 3 ? K * 0.8 : K + 0.25;
      g.fillStyle = '#000'; g.fillRect(0, 0, cv.width, cv.height);
      g.fillStyle = col;
      for (let y = 0; y < bmp.h; y++) for (let x = 0; x < bmp.w; x++) {
        const v = bmp.d[y * bmp.w + x]; if (!v || (v === 2 && (x + y) % 2)) continue;
        g.fillRect(x * K, y * K, dot, dot);
      }
      if (frame) { g.globalAlpha = 0.45; g.strokeStyle = col; g.lineWidth = Math.max(1, dpr); g.strokeRect(0.5, 0.5, cv.width - 1, cv.height - 1); g.globalAlpha = 1; }
    }
    function drawPreview() {
      const box = main.querySelector('.bm-pv .bm-cv'), cv = box && box.querySelector('canvas'); if (!cv || !proj) return;
      const b = compose(proj);
      drawPhos(cv, b, box.clientWidth - 2, box.clientHeight - 2);
      const cap = main.querySelector('.bm-cap');
      if (cap) { const n = pagesOf(proj, b); cap.textContent = proj.type === 'banner' ? `BANNER: ${n} PAGE${n > 1 ? 'S' : ''} LONG` : proj.type === 'sign' ? 'SIGN: 1 PAGE' : 'CARD: FRONT (TOP), INSIDE (BOTTOM)'; }
    }
    const narrow = () => { root.classList.toggle('bm-narrow', root.clientWidth < 620); root.classList.toggle('bm-wide', !!proj && proj.type === 'banner'); };

    /* ---------- screens ---------- */
    function setHead(l, r = '') { head.children[0].textContent = l; head.children[1].textContent = r; }
    function setFoot(items) { foot.innerHTML = items.map(([lab, a]) => `<button data-a="${a}">${E(lab)}</button>`).join(''); }
    const listItem = (i, inner, extra = '') => `<button class="bm-it${i === sel ? ' on' : ''}" data-i="${i}" ${extra}>${inner}</button>`;

    const HOME = [
      ['B', 'BANNER', 'Long letters across many pages', () => start('banner')],
      ['S', 'SIGN', 'One big page', () => start('sign')],
      ['C', 'GREETING CARD', 'A front and an inside', () => start('card')],
      ['O', 'OPEN SAVED WORK', '', () => { galSel = 0; go('gallery'); }],
      ['H', 'HOW TO USE', '', () => showHelp()],
      ['Q', 'QUIT', '', () => api.close()]
    ];
    function start(type) { proj = fresh(type); ret = null; api.sfx.click(); go('font'); }
    function showHelp() { if (scr !== 'help') helpBack = scr === 'print' ? 'home' : scr; go('help'); }

    function go(s, keepSel) {
      if (scr === 'print' && s !== 'print') stopPrint();
      if ((s !== 'home' && s !== 'help' && s !== 'gallery') && !proj) s = 'home';
      scr = s; if (!keepSel) sel = 0; note = '';
      render();
    }
    function render() {
      narrow();
      main.scrollTop = 0; main.style.overflow = '';
      const f = SCREENS[scr] || SCREENS.home; f();
      setTimeout(() => { if (!closed) W.keepEsc = scr !== 'home'; }, 0);
    }
    function stepHead(id) {
      const st = steps(proj), i = st.indexOf(id);
      setHead(`BANNER MAKER - ${typeName(proj)}`, ret ? 'CHANGE' : `STEP ${i + 1} OF ${st.length + 1}`);
    }
    function nextStep(id) {
      if (ret) { go(ret); return; }
      const st = steps(proj), i = st.indexOf(id);
      go(i < st.length - 1 ? st[i + 1] : 'preview');
    }
    function prevStep(id) {
      if (ret) { go(ret); return; }
      const st = steps(proj), i = st.indexOf(id);
      go(i > 0 ? st[i - 1] : 'home');
    }

    // Generic chooser: list (or grid) on the left, live preview on the right.
    const PICK = {
      font: { q: 'CHOOSE A FONT', n: () => FONTS.length, get: () => FONTS.findIndex(f => f.id === proj.font), set: i => { proj.font = FONTS[i].id; },
        item: i => `<b>${i + 1}.</b><canvas data-font="${FONTS[i].id}"></canvas><span>${FONTS[i].name}<br><i class="bm-note">${E(FONTS[i].note)}</i></span>` },
      graphic: { q: 'CHOOSE A PICTURE', grid: true, n: () => GR.length + 1, get: () => proj.graphic === 'none' ? GR.length : GR.findIndex(g => g.id === proj.graphic),
        set: i => { proj.graphic = i < GR.length ? GR[i].id : 'none'; }, item: i => i < GR.length ? `<canvas data-gr="${GR[i].id}"></canvas><span>${GR[i].name}</span>` : `<span class="bm-nopic">X</span><span>NO PICTURE</span>` },
      layout: { q: 'WHERE SHOULD THE PICTURE GO?', n: () => 3, get: () => proj.layout, set: i => { proj.layout = i; },
        item: i => `<b>${i + 1}.</b><span>${(proj.type === 'banner' ? LAYOUTS.banner : LAYOUTS.page)[i]}</span>` },
      border: { q: 'CHOOSE A BORDER', n: () => BORDERS.length, get: () => BORDERS.findIndex(b => b.id === proj.border), set: i => { proj.border = BORDERS[i].id; },
        item: i => `<b>${i + 1}.</b><canvas data-bd="${BORDERS[i].id}"></canvas><span>${BORDERS[i].name}</span>` }
    };
    function drawThumbs() {
      main.querySelectorAll('canvas[data-font]').forEach(cv => drawPhos(cv, lineBmp(cv.dataset.font, 'ABC'), 96, 30, false));
      main.querySelectorAll('canvas[data-gr]').forEach(cv => drawPhos(cv, grById(cv.dataset.gr).b, 48, 48, false));
      main.querySelectorAll('canvas[data-bd]').forEach(cv => { const b = Bmp(64, 40); drawBorder(b, 0, 0, 64, 40, cv.dataset.bd); drawPhos(cv, b, 64, 40, false); });
    }
    function pickScreen(id) {
      const P = PICK[id]; sel = Math.max(0, P.get());
      stepHead(id);
      const items = Array.from({ length: P.n() }, (_, i) => listItem(i, P.item(i))).join('');
      main.style.overflow = 'hidden';
      main.innerHTML = `<div class="bm-split"><div class="bm-list"><h2>${P.q}</h2><div class="${P.grid ? 'bm-grid' : 'bm-menu'}" style="width:100%">${items}</div></div><div class="bm-pv"><div class="bm-cv"><canvas></canvas></div><div class="bm-cap"></div></div></div>`;
      setFoot([['[Enter] OK', 'ok'], ['[Esc] Back', 'back']]);
      drawThumbs(); drawPreview(); scrollSel();
    }
    function scrollSel() { const el = main.querySelector('.bm-it.on'); if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' }); }
    function moveSel(i) {
      const P = PICK[scr]; if (!P) return;
      i = Math.max(0, Math.min(P.n() - 1, i)); if (i === sel) return;
      sel = i; P.set(i); blip();
      main.querySelectorAll('.bm-it').forEach(el => el.classList.toggle('on', +el.dataset.i === sel));
      drawPreview(); scrollSel();
    }
    function gridCols() {
      const its = [...main.querySelectorAll('.bm-grid .bm-it')]; if (its.length < 2) return 1;
      const t = its[0].offsetTop; let n = 0; for (const el of its) { if (el.offsetTop !== t) break; n++; } return Math.max(1, n);
    }

    function textScreen(inside) {
      const T = inside ? INSIDE : TYPES[proj.type], arr = inside ? proj.inside : proj.lines;
      while (arr.length < T.lines) arr.push('');
      stepHead(inside ? 'inside' : 'text');
      main.style.overflow = 'hidden';
      const q = inside ? 'Type the message for the inside of the card (4 lines, 18 letters each).' : TYPES[proj.type].prompt;
      main.innerHTML = `<div class="bm-split"><div class="bm-form"><h2>${inside ? 'INSIDE MESSAGE' : 'YOUR MESSAGE'}</h2><p>${E(q)}</p>${arr.slice(0, T.lines).map((v, i) => `<label>${T.lines > 1 ? `<span>${i + 1}.</span>` : ''}<input type="text" data-l="${i}" maxlength="${T.max}" value="${E(v)}" autocomplete="off" autocorrect="off" autocapitalize="characters" spellcheck="false" enterkeyhint="${i < T.lines - 1 ? 'next' : 'done'}" aria-label="Line ${i + 1}"></label>`).join('')}<p class="bm-dim">You can use letters, numbers and . , ! ? ' - + : &amp; / ( ) # * $ =<br>Type @ for a little heart.</p><p class="bm-msg"></p></div><div class="bm-pv"><div class="bm-cv"><canvas></canvas></div><div class="bm-cap"></div></div></div>`;
      setFoot([['[Enter] OK', 'ok'], ['[Esc] Back', 'back']]);
      main.querySelectorAll('input').forEach(inp => {
        inp.addEventListener('input', () => {
          const c = clean(inp.value, T.max);
          if (c !== inp.value) { const pos = Math.min(c.length, inp.selectionStart || c.length); inp.value = c; try { inp.setSelectionRange(pos, pos); } catch (e) {} }
          arr[+inp.dataset.l] = c; drawPreview();
        });
        inp.addEventListener('focus', () => { try { inp.select(); } catch (e) {} });
      });
      drawPreview();
      const first = main.querySelector('input'); if (first) setTimeout(() => { if (!closed && scr === (inside ? 'inside' : 'text')) first.focus(); }, 30);
    }
    function textOk(inside) {
      if (!inside && proj.type === 'banner' && !hasText(proj.lines)) { const m = main.querySelector('.bm-msg'); if (m) m.textContent = 'A banner needs a message. Type something first!'; buzz(); return; }
      if (!inside && !hasText(proj.lines) && proj.graphic === 'none' && proj.type !== 'banner') { /* allowed: a picture can be chosen next */ }
      nextStep(inside ? 'inside' : 'text');
    }

    /* ---------- preview ---------- */
    function previewActs() {
      const a = [['P', 'PRINT', 'print'], ['F', 'FONT', 'e:font'], ['M', 'MESSAGE', 'e:text'], ['G', 'PICTURE', 'e:graphic']];
      if (proj.graphic !== 'none') a.push(['L', 'PICTURE PLACE', 'e:layout']);
      a.push(['B', 'BORDER', 'e:border']);
      if (proj.type === 'card') a.push(['I', 'INSIDE', 'e:inside']);
      a.push(['S', 'SAVE TO DISK', 'save']);
      if (res && res.p === proj) a.push(['V', 'VIEW PRINTOUT', 'view']);
      a.push(['Q', 'MAIN MENU', 'home']);
      return a;
    }
    const actList = acts => acts.map(([k, lab, a], i) => `<button class="bm-act${i === sel ? ' on' : ''}" data-i="${i}" data-a="${a}"><b>[${k}]</b><span>${lab}</span></button>`).join('');
    function moveAct(i) {
      const els = [...main.querySelectorAll('.bm-act')]; if (!els.length) return;
      sel = (i + els.length) % els.length; blip();
      els.forEach((el, j) => el.classList.toggle('on', j === sel));
    }

    /* ---------- printing ---------- */
    function startPrint() {
      const paper = toPaper(proj, compose(proj));
      let rpp = 8; while (paper.rows / rpp > 150) rpp += 8;
      const passes = [];
      for (let r = 0; r < paper.rows; r += rpp) { const r1 = Math.min(paper.rows, r + rpp), dens = inkDensity(paper, r, r1); passes.push({ r0: r, r1, dens }); }
      const inkN = passes.filter(p => p.dens > 0).length;
      const ms = Math.max(30, Math.min(150, 7000 / Math.max(1, inkN + passes.length * 0.3)));
      PR = { paper, p: proj, passes, rpp, ms, i: -1, t0: 0, col: 0, sheet: null, done: false, k: 0 };
      scr = 'print'; sel = 0;
      setHead(`PRINTING ${typeName(proj)}...`, `PAGE 1 OF ${paper.pages}`);
      main.style.overflow = 'hidden';
      main.innerHTML = `<div class="bm-prn"><canvas></canvas></div>`;
      setFoot([['[Space] Skip to the end', 'skip'], ['[Esc] Skip', 'skip']]);
      setTimeout(() => { if (!closed) W.keepEsc = true; }, 0);
      sizePrint();
      // paper-load whirr
      try { api.tone(95, 0.35, { type: 'sawtooth', vol: 0.04 }); for (let i = 0; i < 6; i++) api.noise(0.02, { at: i * 0.05, ft: 'bandpass', f: 700, q: 2, vol: 0.08, decay: 1 }); } catch (e) {}
      PR.t0 = performance.now() + 380;
      raf = requestAnimationFrame(tick);
    }
    function sizePrint() {
      if (!PR) return;
      const host = main.querySelector('.bm-prn'), cv = host && host.querySelector('canvas'); if (!cv) return;
      const w = Math.max(100, host.clientWidth), h = Math.max(100, host.clientHeight), dpr = window.devicePixelRatio || 1;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); cv.style.width = w + 'px'; cv.style.height = h + 'px';
      const k = Math.max(0.8, Math.min(2.4, (w - 90) / PAPER_W, (h - 90) / 150));
      if (!PR.sheet || Math.abs(k - PR.k) > 0.01) {
        PR.k = k; let K = k * dpr; K = Math.min(K, 15000 / PR.paper.rows, 4);
        PR.sheet = Sheet(PR.paper, K);
        const done = PR.i < 0 ? 0 : PR.passes[Math.min(PR.i, PR.passes.length - 1)].r0;
        PR.sheet.ink(0, done, 0, PAGE_W);
        if (PR.i >= 0 && PR.i < PR.passes.length) { const ps = PR.passes[PR.i]; PR.sheet.ink(ps.r0, ps.r1, 0, PR.col); }
      }
      PR.w = w; PR.h = h; PR.dpr = dpr;
    }
    function passSound(ps, d) {
      try {
        const x = Math.min(1, ps.dens * 3);
        if (ps.dens > 0) {
          api.noise(d * 0.7, { ft: 'bandpass', f: 2300 + x * 1500, q: 3, vol: 0.05 + x * 0.06 });
          api.tone(1180 + Math.random() * 60, d * 0.7, { type: 'square', vol: 0.012 + x * 0.018 });
          api.tone(170, d * 0.7, { type: 'sawtooth', vol: 0.03 });
        } else api.tone(120, d * 0.5, { type: 'sawtooth', vol: 0.02 });
        // carriage return: head slams back to the left, then the paper steps up
        if (PR.ms >= 55 || PR.i % 3 === 0) {
          api.noise(0.045, { at: d * 0.82, ft: 'lowpass', f: 380, q: 1, vol: 0.11, decay: 1 });
          api.tone(72, 0.06, { at: d * 0.82, type: 'square', vol: 0.05, decay: 1 });
        }
        api.noise(0.02, { at: d * 0.9, ft: 'bandpass', f: 900, q: 2, vol: 0.05, decay: 1 });
      } catch (e) {}
    }
    const passDur = ps => ps.dens > 0 ? PR.ms : PR.ms * 0.35;
    function tick(now) {
      raf = 0; if (closed || !PR || PR.done) return;
      if (now < PR.t0) { drawPrinter(0, -1); raf = requestAnimationFrame(tick); return; }
      if (PR.i < 0) { PR.i = 0; PR.col = 0; passSound(PR.passes[0], passDur(PR.passes[0]) / 1000); }
      let ps = PR.passes[PR.i], dur = passDur(ps), el = now - PR.t0;
      while (el >= dur) {
        PR.sheet.ink(ps.r0, ps.r1, PR.col, PAGE_W);
        PR.i++; PR.t0 += dur; el -= dur; PR.col = 0;
        if (PR.i >= PR.passes.length) { finishPrint(false); return; }
        ps = PR.passes[PR.i]; dur = passDur(ps);
        passSound(ps, dur / 1000);
        const pg = Math.min(PR.paper.pages, Math.floor(ps.r0 / PAGE_LEN) + 1);
        head.children[1].textContent = `PAGE ${pg} OF ${PR.paper.pages}`;
      }
      const ph = el / dur, sweep = Math.min(1, ph / 0.72), col = Math.floor(sweep * PAGE_W);
      if (col > PR.col) { PR.sheet.ink(ps.r0, ps.r1, PR.col, col); PR.col = col; }
      drawPrinter(ph, sweep);
      raf = requestAnimationFrame(tick);
    }
    // ph: 0..1 through the pass (sweep right, return, feed); sweep: head position
    function drawPrinter(ph, sweep) {
      const host = main.querySelector('.bm-prn'), cv = host && host.querySelector('canvas'); if (!cv || !PR) return;
      const g = cv.getContext('2d'), { w, h, k, dpr } = PR, S = PR.sheet;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.fillStyle = '#141210'; g.fillRect(0, 0, w, h);
      const pw = PAPER_W * k, px = Math.round((w - pw) / 2), bodyH = 74, bodyTop = h - bodyH;
      const ps = PR.i < 0 ? PR.passes[0] : PR.passes[Math.min(PR.i, PR.passes.length - 1)];
      const feed = PR.done ? 0 : ph > 0.86 ? (ph - 0.86) / 0.14 : 0;
      const fedRow = PR.done ? PR.paper.rows : ps.r1 + feed * (ps.r1 - ps.r0);
      const top = bodyTop - fedRow * k;
      // paper above the printer
      const sy0 = Math.max(0, -top / k), sy1 = Math.min(PR.paper.rows, (bodyTop - top) / k);
      if (sy1 > sy0) g.drawImage(S.cv, 0, sy0 * S.K, S.cv.width, (sy1 - sy0) * S.K, px, top + sy0 * k, pw, (sy1 - sy0) * k);
      // shadow where paper meets the printer
      g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(px, bodyTop - 6, pw, 6);
      // print head riding on its rail
      if (!PR.done && sweep >= 0) {
        const hx = ph <= 0.72 ? sweep : ph <= 0.86 ? 1 - (ph - 0.72) / 0.14 : 0;
        const hw = 26, x = px + STRIP * k + hx * PAGE_W * k - hw / 2, bandH = Math.max(10, (ps.r1 - ps.r0) * k);
        g.fillStyle = '#2b2b2b'; g.fillRect(px - 20, bodyTop - 3, pw + 40, 3);
        g.fillStyle = '#4a4a4a'; g.fillRect(x, bodyTop - bandH - 6, hw, bandH + 8);
        g.fillStyle = '#777'; g.fillRect(x + 3, bodyTop - bandH - 4, hw - 6, 4);
        g.fillStyle = '#1a1a1a'; g.fillRect(x + hw / 2 - 2, bodyTop - bandH, 4, bandH);
      }
      // printer body
      const bx = px - 36, bw = pw + 72;
      g.fillStyle = '#cfc6a8'; g.fillRect(bx, bodyTop, bw, bodyH);
      g.fillStyle = '#e6dfc6'; g.fillRect(bx, bodyTop, bw, 4);
      g.fillStyle = '#8f876d'; g.fillRect(bx, h - 8, bw, 8);
      g.fillStyle = '#2a2720'; g.fillRect(px - 4, bodyTop + 6, pw + 8, 7);
      g.fillStyle = '#6f6852'; g.font = '14px VT323, "Courier New", monospace'; g.textBaseline = 'middle';
      g.fillText('HORIZON DP-80  DOT MATRIX', bx + 12, bodyTop + 34);
      const led = PR.done ? '#3c3' : (Math.floor(performance.now() / 250) % 2 ? '#3f3' : '#2a2');
      g.fillStyle = led; g.fillRect(bx + bw - 60, bodyTop + 30, 8, 6);
      g.fillStyle = '#6f6852'; g.fillText('ON LINE', bx + bw - 48, bodyTop + 34);
      // platen knob turns as paper feeds
      const kx = bx + bw + 10, ky = bodyTop + 22;
      if (kx + 10 < w) {
        g.fillStyle = '#3a3a3a'; g.beginPath(); g.arc(kx, ky, 10, 0, 7); g.fill();
        const a = fedRow * 0.12; g.strokeStyle = '#999'; g.lineWidth = 2; g.beginPath(); g.moveTo(kx, ky); g.lineTo(kx + Math.cos(a) * 8, ky + Math.sin(a) * 8); g.stroke();
      }
    }
    function finishPrint(skipped) {
      if (!PR) return;
      if (raf) cancelAnimationFrame(raf); raf = 0;
      if (PR.i < 0) PR.i = 0;
      if (PR.i < PR.passes.length) { const ps = PR.passes[PR.i]; PR.sheet.ink(ps.r0, ps.r1, PR.col, PAGE_W); PR.sheet.ink(ps.r1, PR.paper.rows, 0, PAGE_W); }
      PR.done = true;
      try {
        api.noise(0.08, { ft: 'lowpass', f: 300, q: 1, vol: 0.12, decay: 1 }); api.tone(68, 0.1, { type: 'square', vol: 0.06, decay: 1 });
        api.tone(110, 0.45, { at: 0.12, type: 'sawtooth', vol: 0.035 });
        for (let i = 0; i < 5; i++) api.noise(0.02, { at: 0.14 + i * 0.08, ft: 'bandpass', f: 800, q: 2, vol: 0.06, decay: 1 });
      } catch (e) {}
      api.stamp('banner-print');
      res = { p: PR.p, paper: PR.paper, sheet: PR.sheet, fresh: true };
      PR = null; resBack = 'preview';
      go('result');
      note = skipped ? 'Printing finished.' : 'All done! Tear off your printout.';
      const m = main.querySelector('.bm-msg'); if (m) m.textContent = note;
    }
    function stopPrint() { if (raf) cancelAnimationFrame(raf); raf = 0; PR = null; }

    /* ---------- printout view ---------- */
    function buildResult(p) {
      const paper = toPaper(p, compose(p));
      return { p, paper, sheet: null };
    }
    function drawResult() {
      if (!res) return;
      const box = main.querySelector('.bm-paper'), cv = box && box.querySelector('canvas'); if (!cv) return;
      const dpr = window.devicePixelRatio || 1, bw = Math.max(80, box.clientWidth - 16), bh = Math.max(80, box.clientHeight - 16);
      const rows = res.paper.rows, banner = res.p.type === 'banner';
      // banner shows unrolled, left to right; pages show whole
      const k = banner ? Math.min(1.5, bh / PAPER_W) : Math.min(3, bw / PAPER_W, bh / rows);
      const needK = Math.min(k * dpr, 15000 / rows, 4);
      if (!res.sheet || res.sheet.K + 0.01 < needK * 0.9 || res.sheet.K > needK * 2.2) { res.sheet = Sheet(res.paper, needK); res.sheet.ink(0, rows, 0, PAGE_W); }
      const S = res.sheet;
      const cw = banner ? rows * k : PAPER_W * k, ch = banner ? PAPER_W * k : rows * k;
      cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr); cv.style.width = Math.round(cw) + 'px'; cv.style.height = Math.round(ch) + 'px';
      const g = cv.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0);
      if (banner) { g.translate(0, cv.height); g.rotate(-Math.PI / 2); g.drawImage(S.cv, 0, 0, cv.height, cv.width); }
      else g.drawImage(S.cv, 0, 0, cv.width, cv.height);
    }
    function resultActs() {
      return [['S', 'SAVE TO DISK', 'save'], ['R', 'PRINT FOR REAL', 'real'], ['P', 'PRINT AGAIN', 'print'], ['E', 'EDIT DESIGN', 'edit'], ['N', 'NEW PROJECT', 'home'], ['O', 'OPEN SAVED', 'gallery']];
    }

    /* ---------- disk ---------- */
    function saveToDisk(p) {
      const list = saved();
      if (!p.sid) p.sid = Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
      const rec = { sid: p.sid, when: Date.now(), p: JSON.parse(JSON.stringify(p)) };
      const out = [rec].concat(list.filter(r => r.sid !== p.sid)).slice(0, 10);
      api.save('prints', out);
      try { api.sfx.seek(4); } catch (e) {}
      const m = main.querySelector('.bm-msg');
      if (m) { m.textContent = 'SAVING TO DISK...'; later(() => { const mm = main.querySelector('.bm-msg'); if (mm) mm.textContent = `SAVED "${titleOf(p)}" (${out.length} of 10 on disk)`; }, 500); }
    }
    const dateStr = t => { const d = new Date(t); return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}-${YY}`; };
    function openSaved(i) {
      const list = saved(), r = list[i]; if (!r) return;
      proj = JSON.parse(JSON.stringify(r.p));
      proj.inside = proj.inside || [];
      api.sfx.click();
      res = buildResult(proj); resBack = 'gallery'; ret = null;
      go('result');
    }
    async function delSaved(i) {
      const list = saved(), r = list[i]; if (!r) return;
      const a = await api.msgBox('Banner Maker', `Erase "${titleOf(r.p)}" from the disk?`, ['Erase', 'Cancel'], 'warn');
      if (closed || a !== 'Erase') return;
      api.save('prints', saved().filter(x => x.sid !== r.sid));
      galSel = Math.max(0, Math.min(galSel, saved().length - 1));
      if (scr === 'gallery') go('gallery');
    }

    /* ---------- print for real ---------- */
    function realPrint(p) {
      const paper = toPaper(p, compose(p)), c = paper.c, K = 4;
      const cv = document.createElement('canvas'); cv.width = c.w * K; cv.height = c.h * K;
      const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height); g.fillStyle = '#000';
      for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) { const v = c.d[y * c.w + x]; if (!v || (v === 2 && (x + y) % 2)) continue; g.beginPath(); g.arc(x * K + K / 2, y * K + K / 2, K * 0.62, 0, 7); g.fill(); }
      const url = cv.toDataURL('image/png');
      if (iframe) iframe.remove();
      iframe = document.createElement('iframe');
      iframe.setAttribute('aria-hidden', 'true'); iframe.tabIndex = -1;
      iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:10px;height:10px;border:0;visibility:hidden';
      const fit = p.type === 'banner' ? 'width:100%' : 'max-width:100%;max-height:96vh';
      iframe.srcdoc = `<!doctype html><title>${E(titleOf(p))}</title><style>@page{margin:12mm}html,body{margin:0;background:#fff}img{display:block;margin:0 auto;${fit}}</style><img src="${url}" alt="">`;
      iframe.onload = () => { try { iframe.contentWindow.focus(); iframe.contentWindow.print(); } catch (e) { api.msgBox('Banner Maker', 'Your browser would not open the print window.', ['OK'], 'warn'); } };
      document.body.appendChild(iframe);
      const m = main.querySelector('.bm-msg'); if (m) m.textContent = p.type === 'banner' ? 'Sent to your real printer. Tape the pages end to end!' : 'Sent to your real printer.';
    }

    const SCREENS = {
      home() {
        setHead('BANNER MAKER', 'VERSION 1.0');
        main.innerHTML = `<div class="bm-home"><canvas class="bm-logo"></canvas><p class="bm-dim">Banners, signs and cards for your dot-matrix printer</p><h2>WHAT WOULD YOU LIKE TO MAKE?</h2><div class="bm-menu">${HOME.map(([k, lab, sub], i) => listItem(i, `<b>${i + 1}.</b><span>${lab}</span><small>${sub}</small>`)).join('')}</div></div>`;
        setFoot([['[Enter] Choose', 'ok'], ['[F1] Help', 'help'], ['[Esc] Quit', 'quit']]);
        const cv = main.querySelector('.bm-logo'), lb = lineBmp('shadow', 'BANNER MAKER'), b = Bmp(lb.w + 44, lb.h + 8);
        blit(b, lb, 22, 4, 1); pic(b, 'star', { x: 2, y: 4, w: 16, h: 16 }); pic(b, 'star', { x: b.w - 18, y: 4, w: 16, h: 16 });
        drawPhos(cv, b, Math.min(main.clientWidth - 24, 620), 110, false);
      },
      font() { pickScreen('font'); }, graphic() { pickScreen('graphic'); }, layout() { pickScreen('layout'); }, border() { pickScreen('border'); },
      text() { textScreen(false); }, inside() { textScreen(true); },
      preview() {
        setHead(`BANNER MAKER - ${typeName(proj)}`, 'PREVIEW');
        main.style.overflow = 'hidden';
        main.innerHTML = `<div class="bm-split bm-pvbig"><div class="bm-pv"><div class="bm-cv"><canvas></canvas></div><div class="bm-cap"></div></div><div class="bm-acts"><h2>READY TO PRINT</h2>${actList(previewActs())}<p class="bm-msg bm-dim"></p></div></div>`;
        setFoot([['[P] Print', 'print'], ['[S] Save', 'save'], ['[Esc] Main menu', 'home']]);
        drawPreview();
      },
      print() { startPrint(); },
      result() {
        if (!res) { go('home'); return; }
        proj = res.p;
        const n = res.paper.pages, banner = res.p.type === 'banner';
        setHead(`PRINTOUT - ${typeName(res.p)}`, `${n} PAGE${n > 1 ? 'S' : ''}`);
        main.style.overflow = 'hidden';
        main.innerHTML = `<div class="bm-split"><div class="bm-paper${banner ? ' scroll' : ''}" tabindex="-1"><canvas></canvas></div><div class="bm-acts"><h2>"${E(titleOf(res.p))}"</h2>${actList(resultActs())}<p class="bm-msg bm-dim">${banner ? 'Scroll to see the whole banner (Left/Right keys).' : res.p.type === 'card' ? 'Cut or fold on the dotted line.' : ''}</p></div></div>`;
        setFoot([['[S] Save', 'save'], ['[R] Print for real', 'real'], ['[Esc] Back', 'back']]);
        drawResult();
      },
      gallery() {
        const list = saved();
        setHead('BANNER MAKER - OPEN SAVED WORK', `${list.length} OF 10 ON DISK`);
        if (!list.length) {
          main.innerHTML = `<div class="bm-empty"><h2>THE DISK IS EMPTY</h2><p>Nothing saved yet. Make something, then choose SAVE TO DISK.</p></div>`;
          setFoot([['[Esc] Back', 'back']]); return;
        }
        sel = Math.min(galSel, list.length - 1);
        main.style.overflow = 'hidden';
        main.innerHTML = `<div class="bm-split"><div class="bm-list bm-gl"><h2>SAVED WORK (NEWEST FIRST)</h2><div class="bm-menu" style="width:100%">${list.map((r, i) => listItem(i, `<b>${i + 1}.</b><span>${E(titleOf(r.p).slice(0, 22))}</span><small>${TYPES[r.p.type].name}<br>${dateStr(r.when)}</small>`)).join('')}</div></div><div class="bm-pv"><div class="bm-cv"><canvas></canvas></div><div class="bm-cap"></div></div></div>`;
        setFoot([['[Enter] Open', 'ok'], ['[D] Erase', 'del'], ['[Esc] Back', 'back']]);
        galPreview(); scrollSel();
      },
      help() {
        setHead('BANNER MAKER - HOW TO USE', '');
        main.innerHTML = `<div class="bm-help">
          <h2>HOW TO USE BANNER MAKER</h2>
          <p>1. Pick what to make: a BANNER (big letters sideways across many pages of continuous paper), a SIGN (one page) or a GREETING CARD (a front and an inside message).</p>
          <p>2. Follow the steps: choose a FONT, type your MESSAGE, pick a PICTURE, where the picture goes, and a BORDER. Cards also get an INSIDE message. The picture on the screen shows what it will look like.</p>
          <p>3. At the PREVIEW, press P to PRINT. Watch the dot-matrix printer do its work. Press Space or Esc to skip to the end.</p>
          <p>4. Your printout stays on the screen. Press S to SAVE it TO DISK (the last 10 are kept) and open it later with File, Open saved. Press R to print it for real on the printer next to your computer.</p>
          <p>KEYS: Up/Down (and Left/Right in the picture list) move the bar. Enter says OK. Esc goes back one step. You can also click or tap anything: tap once to try it, tap again to pick it.</p>
          <p>TIP: Type @ for a little heart. A banner prints about one page for every one or two letters, so tape the pages together end to end!</p></div>`;
        setFoot([['[Enter] OK', 'back'], ['[Esc] Back', 'back']]);
      }
    };
    function galPreview() {
      const r = saved()[sel], box = main.querySelector('.bm-pv .bm-cv'), cv = box && box.querySelector('canvas'); if (!r || !cv) return;
      const p = Object.assign({ inside: [] }, r.p);
      drawPhos(cv, compose(p), box.clientWidth - 2, box.clientHeight - 2);
      const cap = main.querySelector('.bm-cap'); if (cap) cap.textContent = describe(p);
    }

    /* ---------- actions ---------- */
    function act(a) {
      if (!a || a === 'noop') return;
      if (a.startsWith('e:')) { ret = 'preview'; api.sfx.click(); go(a.slice(2)); return; }
      switch (a) {
        case 'ok': return enter();
        case 'back': return back();
        case 'help': return showHelp();
        case 'quit': return api.close();
        case 'home': ret = null; return go('home');
        case 'print': ret = null; api.sfx.click(); scr = 'print'; return render();
        case 'skip': if (PR && !PR.done) finishPrint(true); return;
        case 'save': return saveToDisk(scr === 'result' && res ? res.p : proj);
        case 'real': return realPrint(res ? res.p : proj);
        case 'edit': ret = null; return go('preview');
        case 'view': resBack = 'preview'; return go('result');
        case 'gallery': galSel = 0; return go('gallery');
        case 'del': return delSaved(sel);
      }
    }
    function enter() {
      if (scr === 'home') { const h = HOME[sel]; blip(); h && h[3](); }
      else if (PICK[scr]) { api.sfx.click(); nextStep(scr); }
      else if (scr === 'text' || scr === 'inside') textOk(scr === 'inside');
      else if (scr === 'preview' || scr === 'result') { const el = main.querySelector('.bm-act.on'); if (el) act(el.dataset.a); }
      else if (scr === 'gallery') openSaved(sel);
      else if (scr === 'help') back();
    }
    function back() {
      if (scr === 'print') { act('skip'); return; }
      if (PICK[scr] || scr === 'text' || scr === 'inside') { prevStep(scr); return; }
      if (scr === 'help') { go(helpBack === 'help' ? 'home' : helpBack, true); return; }
      if (scr === 'result') { go(resBack === 'gallery' ? 'gallery' : 'preview'); return; }
      go('home');
    }

    main.addEventListener('click', e => {
      const ab = e.target.closest('[data-a]');
      if (ab && ab.classList.contains('bm-act')) { sel = +ab.dataset.i; act(ab.dataset.a); return; }
      const it = e.target.closest('.bm-it'); if (!it) return;
      const i = +it.dataset.i;
      if (scr === 'home') { sel = i; enter(); return; }
      if (PICK[scr]) { if (i === sel) enter(); else moveSel(i); return; }
      if (scr === 'gallery') {
        if (i === sel) { openSaved(i); return; }
        sel = galSel = i; blip();
        main.querySelectorAll('.bm-it').forEach(el => el.classList.toggle('on', +el.dataset.i === sel)); galPreview();
      }
    });
    foot.addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (b) act(b.dataset.a); });

    W.onKey = e => {
      if (closed) return;
      const k = e.key, inInput = e.target && e.target.tagName === 'INPUT';
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (document.querySelector('.menu')) return;
      if (k === 'F1') { e.preventDefault(); showHelp(); return; }
      if (scr === 'print') { if (k === 'Escape' || k === ' ' || k === 'Enter') { e.preventDefault(); act('skip'); } return; }
      if (k === 'Escape') { e.preventDefault(); if (scr !== 'home') back(); return; }
      if (scr === 'text' || scr === 'inside') {
        const ins = [...main.querySelectorAll('input')], cur = ins.indexOf(document.activeElement);
        if (k === 'Enter') { e.preventDefault(); if (cur >= 0 && cur < ins.length - 1) ins[cur + 1].focus(); else textOk(scr === 'inside'); }
        else if (k === 'ArrowDown' || k === 'ArrowUp') { e.preventDefault(); const n = Math.max(0, Math.min(ins.length - 1, (cur < 0 ? 0 : cur) + (k === 'ArrowDown' ? 1 : -1))); ins[n].focus(); }
        else if (!inInput && ins[0] && k.length === 1) { ins[0].focus(); }
        return;
      }
      if (inInput) return;
      const up = k === 'ArrowUp', dn = k === 'ArrowDown', lf = k === 'ArrowLeft', rt = k === 'ArrowRight';
      if (k === 'Enter' || (k === ' ' && scr !== 'result')) { e.preventDefault(); enter(); return; }
      if (scr === 'home') {
        if (up || dn) { e.preventDefault(); sel = (sel + (dn ? 1 : -1) + HOME.length) % HOME.length; blip(); main.querySelectorAll('.bm-it').forEach(el => el.classList.toggle('on', +el.dataset.i === sel)); return; }
        const i = HOME.findIndex(h => h[0] === k.toUpperCase()), d = +k;
        if (i >= 0) { sel = i; enter(); } else if (d >= 1 && d <= HOME.length) { sel = d - 1; enter(); }
        return;
      }
      if (PICK[scr]) {
        const cols = PICK[scr].grid ? gridCols() : 1;
        if (up || dn || lf || rt) { e.preventDefault(); moveSel(sel + (dn ? cols : up ? -cols : rt ? 1 : -1)); return; }
        const d = +k; if (d >= 1 && d <= 9 && !PICK[scr].grid) moveSel(d - 1);
        return;
      }
      if (scr === 'preview' || scr === 'result') {
        if (scr === 'result' && (lf || rt)) { e.preventDefault(); const pb = main.querySelector('.bm-paper'); if (pb) pb.scrollLeft += rt ? 160 : -160; return; }
        if (up || dn || lf || rt) { e.preventDefault(); moveAct(sel + (dn || rt ? 1 : -1)); return; }
        const acts = scr === 'preview' ? previewActs() : resultActs(), i = acts.findIndex(x => x[0] === k.toUpperCase());
        if (i >= 0) { e.preventDefault(); sel = i; moveAct(i); act(acts[i][2]); }
        return;
      }
      if (scr === 'gallery') {
        const n = saved().length;
        if ((up || dn) && n) { e.preventDefault(); sel = galSel = (sel + (dn ? 1 : -1) + n) % n; blip(); main.querySelectorAll('.bm-it').forEach(el => el.classList.toggle('on', +el.dataset.i === sel)); galPreview(); scrollSel(); return; }
        if ((k === 'd' || k === 'D' || k === 'Delete') && n) { e.preventDefault(); delSaved(sel); }
        return;
      }
      if (scr === 'help' && (up || dn)) { e.preventDefault(); main.scrollTop += dn ? 60 : -60; }
    };

    // Redraw canvases when the window changes size.
    let rsT = 0;
    const relayout = () => {
      if (closed) return;
      narrow();
      if (scr === 'print') { sizePrint(); if (PR) drawPrinter(0, -1); }
      else if (scr === 'result') drawResult();
      else if (scr === 'gallery') galPreview();
      else if (scr === 'home') render();
      else drawPreview();
    };
    const ro = window.ResizeObserver ? new ResizeObserver(() => { clearTimeout(rsT); rsT = setTimeout(relayout, 60); }) : null;
    if (ro) ro.observe(main);
    W.onResize = () => { clearTimeout(rsT); rsT = setTimeout(relayout, 60); };
    W.onMin = () => { if (PR && !PR.done) finishPrint(true); };
    W.onClose = () => {
      closed = true; if (raf) cancelAnimationFrame(raf); raf = 0; PR = null;
      timers.forEach(clearTimeout); timers.clear(); clearTimeout(rsT);
      if (ro) ro.disconnect();
      if (iframe) { iframe.remove(); iframe = null; }
    };
    render();
  }

  (window.RETRO_APPS = window.RETRO_APPS || []).push({
    id: 'banner',
    label: 'Banner Maker',
    help: 'Make banners, signs and greeting cards with big letters, pictures and borders, then print them on the dot-matrix printer.',
    kind: 'builtin',
    eras: ['1985'],
    cat: 'acc',
    cmd: 'BANNER',
    icon: ICON,
    window: { w: 760, h: 560 },
    css: CSS,
    open
  });
})();
