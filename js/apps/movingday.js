/* Moving Day: a store game (1995). A cozy unpacking game. The same kid moves four times (1985, 1990, 1995, 2000),
   and every move has three or four rooms. Open the boxes (each is labeled with its room), drag things anywhere
   they fit, and the room tidies itself: items snap onto surface lines, line up evenly, books and tapes form rows,
   plates and towels stack, coats hang on hooks. There is no wrong place for anything.
   Rooms are laid out on a 200x150 grid and painted at twice that (400x300), then scaled up with crisp pixels.
   Item sprites are drawn small and "polished" on the way up: smoothed 2x, with a dark outline and light edges. */
(function () {
  'use strict';
  const VW = 200, VH = 150, WALL = 113, FLOOR = 146, BASE = 126, K = 2;

  /* ---------- palette and pixel helpers ---------- */
  const P = {
    k: '#2b1d14', w: '#fbf6ea', W: '#ddd5c2', g: '#bdb7ab', G: '#7a746a', d: '#4a4640', n: '#26262e', K: '#3e3e4a',
    x: '#e4e6e8', X: '#9aa2aa', r: '#d0483a', R: '#8e2a22', o: '#ec9444', O: '#b8622a', y: '#f4cf55', Y: '#c19a2e',
    Z: '#fff0a0', b: '#a8703c', B: '#6a4222', t: '#e2b27a', T: '#b8864e', e: '#62a84e', E: '#347038', f: '#a8d878',
    u: '#4f7fd0', U: '#2c4888', N: '#1c2448', c: '#9ad0ec', C: '#5a9ac0', j: '#6a88b8', J: '#3e5680', p: '#ee9fb8',
    i: '#fbd0dc', P: '#8e5cb0', v: '#b894dc', s: '#f3cda4', S: '#d8a47a', m: '#ddd1b4', M: '#ab9e80', a: '#5fb8a8',
    A: '#2f7a70', l: '#c8d4dc', L: '#8a9cac', h: '#ffffff', q: '#f4e4c4', Q: '#c8aa7a', z: '#5a2e1a'
  };
  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = n >> 8 & 255, b = n & 255;
    const m = f < 0 ? 0 : 255, t = Math.abs(f);
    r = Math.round(r + (m - r) * t); g = Math.round(g + (m - g) * t); b = Math.round(b + (m - b) * t);
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  }
  function mix(a, b, t) {
    const p = parseInt(a.slice(1), 16), q = parseInt(b.slice(1), 16), f = (s, k) => Math.round((s >> k & 255) * (1 - t) + (q >> k & 255) * t);
    return '#' + ((1 << 24) | (f(p, 16) << 16) | (f(p, 8) << 8) | f(p, 0)).toString(16).slice(1);
  }
  // a four-step ramp: outline, shadow, base, light, highlight
  const ramp = c => [shade(c, -0.58), shade(c, -0.24), c, shade(c, 0.2), shade(c, 0.42)];
  const R = (g, c, x, y, w, h) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const hash = (a, b) => { let h = Math.imul((a | 0) * 374761393 + (b | 0) * 668265263, 1274126177); h ^= h >>> 13; return (h >>> 0) % 1000; };
  function mkc(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function ctx2(c) { const g = c.getContext('2d'); g.imageSmoothingEnabled = false; return g; }
  // ASCII pixel art -> canvas. '.' is transparent; letters are palette keys (overrides first).
  function art(rows, over) {
    const h = rows.length, w = Math.max(...rows.map(r => r.length)), c = mkc(w, h), g = c.getContext('2d');
    rows.forEach((row, y) => { for (let x = 0; x < row.length; x++) { const ch = row[x]; if (ch === '.' || ch === ' ') continue; R(g, (over && over[ch]) || P[ch] || '#f0f', x, y, 1, 1); } });
    return c;
  }
  function pc(w, h, fn) { const c = mkc(w, h); fn(c.getContext('2d'), w, h); return c; }
  // dither: fill every other pixel (checkerboard) of a rectangle, on whole grid pixels
  function dith(g, c, x, y, w, h, ph) { g.fillStyle = c; for (let yy = 0; yy < h; yy++) for (let xx = (yy + (ph || 0)) & 1; xx < w; xx += 2) g.fillRect(x + xx, y + yy, 1, 1); }
  // fine dither on the half-pixel (hi-res) grid
  function dith2(g, c, x, y, w, h, ph) { g.fillStyle = c; for (let yy = 0; yy < h * 2; yy++) for (let xx = (yy + (ph || 0)) & 1; xx < w * 2; xx += 2) g.fillRect(x + xx / 2, y + yy / 2, 0.5, 0.5); }

  /* Sprite polish: 2x EPX smoothing, then a darker 1px outline and light/shade edges (light from the top left). */
  const hiCache = new WeakMap();
  function hiOf(c) { let h = hiCache.get(c); if (!h) { h = polish(c); hiCache.set(c, h); } return h; }
  function polish(src) {
    const w = src.width, h = src.height, id = src.getContext('2d').getImageData(0, 0, w, h), s = new Uint32Array(id.data.buffer);
    for (let k = 0; k < s.length; k++) s[k] = (s[k] >>> 24) < 128 ? 0 : (s[k] | 0xff000000) >>> 0;
    const W2 = w * 2, H2 = h * 2, out = mkc(W2, H2), og = out.getContext('2d'), od = og.createImageData(W2, H2), o = new Uint32Array(od.data.buffer);
    const at = (x, y) => x < 0 || y < 0 || x >= w || y >= h ? 0 : s[y * w + x];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const p = at(x, y), A = at(x, y - 1), B = at(x + 1, y), C = at(x - 1, y), D = at(x, y + 1);
      let p1 = p, p2 = p, p3 = p, p4 = p;
      if (C === A && C !== D && A !== B) p1 = A;
      if (A === B && A !== C && B !== D) p2 = B;
      if (D === C && D !== B && C !== A) p3 = C;
      if (B === D && B !== A && D !== C) p4 = D;
      const i = y * 2 * W2 + x * 2; o[i] = p1; o[i + 1] = p2; o[i + W2] = p3; o[i + W2 + 1] = p4;
    }
    const T = o.slice(), op = (x, y) => x < 0 || y < 0 || x >= W2 || y >= H2 ? 0 : T[y * W2 + x];
    const mul = (c, f) => (0xff000000 | (Math.round((c >> 16 & 255) * f) << 16) | (Math.round((c >> 8 & 255) * f) << 8) | Math.round((c & 255) * f)) >>> 0;
    const lift = (c, f) => { const l = v => Math.round(v + (255 - v) * f); return (0xff000000 | (l(c >> 16 & 255) << 16) | (l(c >> 8 & 255) << 8) | l(c & 255)) >>> 0; };
    for (let y = 0; y < H2; y++) for (let x = 0; x < W2; x++) {
      const c = T[y * W2 + x]; if (!c) continue;
      if (!op(x - 1, y) || !op(x + 1, y) || !op(x, y - 1) || !op(x, y + 1)) o[y * W2 + x] = mul(c, 0.52);
      else if (!op(x, y - 2) || !op(x - 2, y)) o[y * W2 + x] = lift(c, 0.2);
      else if (!op(x, y + 2) || !op(x + 2, y)) o[y * W2 + x] = mul(c, 0.84);
    }
    og.putImageData(od, 0, 0);
    return out;
  }

  /* A tiny 3x5 marker font for the room names written on the boxes. */
  const FONT = { A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111', F: '111100110100100', G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100', Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010', U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010', Z: '111001010100111', ' ': '000000000000000' };
  const labelCache = {};
  function labelArt(text) {
    if (labelCache[text]) return labelCache[text];
    const c = mkc(text.length * 4 + 1, 7), g = c.getContext('2d');
    [...text].forEach((ch, k) => { const f = FONT[ch] || FONT[' ']; for (let p = 0; p < 15; p++) if (f[p] === '1') { R(g, '#2e1e12', 1 + k * 4 + p % 3, 1 + (p / 3 | 0), 1, 1); } });
    return (labelCache[text] = c);
  }

  /* ---------- item art (ASCII, drawn small; polish() adds outlines and shading) ---------- */
  const A = {
    teddy: ['.bb.....bb.', 'bBbb...bbBb', '.bbbbbbbbb.', '.bbkbbbkbb.', '.bbbtttbbb.', '..bbtktbb..', '...bbbbb...', '.bbbbrbbbb.', 'bbbbtttbbbb', 'bb.btttb.bb', '..bbbbbbb..', '.bbbb.bbbb.', '.BBB...BBB.'],
    robot: ['....r....', '....G....', '.GGGGGGG.', '.GcgggcG.', '.GgggggG.', '.GgrrrgG.', '.GGGGGGG.', 'GG.ggg.GG', 'Gg.gyg.gG', 'Gg.ggg.gG', '...ggg...', '..gg.gg..', '.GGG.GGG.'],
    lunch: ['....kkkk....', '....k..k....', 'kkkkkkkkkkkk', 'krrrrrrrrrrk', 'kryyyyyyyyrk', 'kryuuyyeeyrk', 'kryuuyyeeyrk', 'kryyyyyyyyrk', 'krrrrrrrrrrk', 'kkkkkkkkkkkk'],
    car: ['...uuuuu...', '..uccuccu..', 'uuuuuuuuuuy', 'uUuuuuuuuUu', '.kgk...kgk.', '..k.....k..'],
    blocks: ['...rrrrr...', '...rwrwr...', '...rrwrr...', '...rwrwr...', '...rrrrr...', 'uuuuu.eeeee', 'uwwwu.ewwwe', 'uwuuu.ewewe', 'uwwwu.ewwwe', 'uuuuu.eeeee'],
    piggy: ['..p....p...', '.ppppppppk.', 'pppppppppk.', 'ppkppppppk.', 'pppppppppppR', 'pppppppppppR', '.ppppppppp..', '..pp...pp...', '..RR...RR...'],
    ball: ['..rrrr..', '.rrwwrr.', 'rrwwwwrr', 'rrrrrrrr', 'uuuuuuuu', 'uuyyyyuu', '.uyyyyu.', '..uuuu..'],
    nlamp: ['..yyyy..', '.yyZZyy.', '.yZhZyy.', 'yyyyyyyy', 'YYYYYYYY', '...BB...', '...BB...', '...BB...', '..BBBB..', '.BBBBBB.'],
    recorder: ['..kkkkkkkk..', 'kkkkkkkkkkkk', 'kGGGGGGGGGGk', 'kGkkkkkkkkGk', 'kGkwwkkwwkGk', 'kGkkkkkkkkGk', 'kGGGGGGGGGGk', 'kGrgygugggGk', 'kkkkkkkkkkkk'],
    crayons: ['.r.y.u.e.', '.r.y.u.e.', 'kkkkkkkkk', 'kyyyyyyyk', 'kyeeeeeyk', 'kyekkkeyk', 'kyeeeeeyk', 'kyyyyyyyk', 'kkkkkkkkk'],
    handheld: ['.PPPPPPPPPP.', 'PPPkkkkkkPPP', 'PkPkeeeekPyP', 'kkkkeeeekPPy', 'PkPkeeeekPyP', 'PPPkkkkkkPPP', '.PPPPPPPPPP.'],
    cart: ['kkkkkkk.', 'kGGGGGGk', 'kGwwwwGk', 'kGwrrwGk', 'kGwwwwGk', 'kGGGGGGk', 'kkkkkkkk'],
    boombox: ['....kkkkkkkkkkkk....', '....k..........k....', 'kkkkkkkkkkkkkkkkkkkk', 'kddddddddddddddddddk', 'kdGGGdggggggggdGGGdk', 'kGdddGgkkkkkkgGdddGk', 'kGdkdGgkwwwwkgGdkdGk', 'kGdddGgkkkkkkgGdddGk', 'kdGGGdggggggggdGGGdk', 'kddddddrdydudddddddk', 'kkkkkkkkkkkkkkkkkkkk'],
    trophy: ['.yyyyyyyy.', 'yyZhyyyyyy', 'y.yZyyyy.y', 'y.yyyyyy.y', '.yyyyyyyy.', '..yyyyyy..', '...yyyy...', '....yy....', '....yy....', '..YYYYYY..', '..BBBBBB..', '.BBBBBBBB.'],
    floppy: ['UUgggUUU', 'UUgGgUUU', 'UUgggUUU', 'UUUUUUUU', 'UwwwwwwU', 'UwkkkkwU', 'UwwwwwwU', 'UUUUUUUU'],
    soccer: ['..kkkk..', '.kwwwwk.', 'kwwkkwwk', 'kwkkkkwk', 'kwwkkwwk', 'kkwwwwkk', '.kwkkwk.', '..kkkk..'],
    dlamp: ['.......rrrr.', '......rrrrrr', '.....rrrrrrr', '.....k...yy.', '....k.......', '...k........', '..k.........', '..k.........', '..k.........', '..k.........', '.rrrr.......', 'rrrrrr......'],
    dclock: ['kkkkkkkkkk', 'knnnnnnnnk', 'knrrnrnrrk', 'knrrnrnrrk', 'knnnnnnnnk', 'kkkkkkkkkk', '.k......k.'],
    pencils: ['.y.r.e', '.y.r.e', '.yurue', 'uuuuuu', 'ucuuuu', 'uuuuuu', 'uuuuuu', '.uuuu.'],
    globe: ['..kkkkk...', '.kuueuuk..', 'kuueeeuuk.', 'kueeuuuukB', 'kuuuueeukB', 'kueuueeukB', '.kuuuuuk.B', '..kkkkk.B.', '....BBBB..', '...BBBBB..', '..BBBBBBB.'],
    plane: ['......g.......', '.....ggg.....r', 'gggggggggggggr', '.cGGGGGGGGGgg.', '......ggg.....', '.....ggggg....', '.......B......', '.......B......', '.....BBBBB....'],
    sneaker: ['.....wwk....', '..wwwwwwk...', '.wwrwwwwwwk.', 'wwwwrrwwwwww', 'kgkgkgkgkgkk'],
    cdplayer: ['...ggggg...', '.ggggggggg.', '.ggGGGGGgg.', 'ggGgggggGgg', 'ggGggkggGgg', 'ggGgkwkgGgg', 'ggGggkggGgg', 'ggGgggggGgg', '.ggGGGGGgg.', '.ggggugrgg.', '...ggggg...'],
    monitor: ['mmmmmmmmmmmmmmmmmmmm', 'mMMMMMMMMMMMMMMMMMMm', 'mMnnnnnnnnnnnnnnnnMm', 'mMnaaaaaaaaaaaaaanMm', 'mMnawwaaaaaaaaaaanMm', 'mMnawwaaaaaaaaaaanMm', 'mMnaaaaaaaaaaaaaanMm', 'mMnaaaaaaaaaaaaaanMm', 'mMnaaaaaaaaaaaaaanMm', 'mMnggggggggggggggnMm', 'mMnnnnnnnnnnnnnnnnMm', 'mmmmmmmmmmmmmmmmmmmm', 'mmmmmmmmmmmmmmmmmemm', '..mmmmmmmmmmmmmmmm..', '......mmmmmmmm......', '....MMMMMMMMMMMM....'],
    tower: ['mmmmmmmmm', 'mMMMMMMMm', 'mMkkkkkMm', 'mMMMMMMMm', 'mMkkkkkMm', 'mMMMMMMMm', 'mmmmmmmmm', 'mMMMMMmmm', 'mMkkkMmmm', 'mMMMMMmmm', 'mmmmmmmmm', 'mmmmmmmem', 'mmmmmmmmm', 'mmmmmmmrm', 'mmmmmmmmm', 'mMMMMMMMm', 'mmmmmmmmm', 'MMMMMMMMM'],
    keyboard: ['mmmmmmmmmmmmmmmmmmmm', 'mwMwMwMwMwMwMwMwMwMm', 'MMMMMMMMMMMMMMMMMMMM'],
    skate: ['k..................k', 'kkPPPPPPPPPPPPPPPPkk', '.kkkkkkkkkkkkkkkkkk.', '...gg..........gg...', '..yyyy........yyyy..', '..yyyy........yyyy..'],
    pager: ['nnnnnnn', 'necccen', 'necccen', 'nnnnnnn', 'ngnnngn'],
    phones: ['...kkkkk...', '.kk.....kk.', 'k.........k', 'k.........k', 'k.........k', 'kk.......kk', 'GGG.....GGG', 'GrG.....GrG', 'GGG.....GGG', '.G.......G.'],
    radio: ['kkkkkkkkkkkkkk', 'kGGGGGGGGGGGGk', 'kGdGdGkkkkkkGk', 'kGGGGGkrrnrrGk', 'kGdGdGkkkkkkGk', 'kGGGGGGGGGGGGk', 'kkkkkkkkkkkkkk'],
    glitter: ['..GG..', '.GGGG.', '.pppp.', '.pyPp.', 'pppppp', 'pPpypp', 'pppPpp', 'ppyppP', 'pppppp', '.pPpp.', '.GGGG.', 'GGGGGG', 'GGGGGG', '.GGGG.'],
    pack: ['...kkkkk...', '..k.....k..', '.uuuuuuuuu.', 'uuuuuuuuuuu', 'uUuuuuuuuUu', 'uUuuuuuuuUu', 'uUrrrrrrrUu', 'uUrkkkkkrUu', 'uUrrrrrrrUu', 'uUrrrrrrrUu', 'uUuuuuuuuUu', 'uuuuuuuuuuu', '.uuuuuuuuu.'],
    bball: ['..kooo..', '.ooookoo', 'oooookoo', 'kkkkkkkk', 'ooookooo', 'oooookoo', '.oookoo.', '..ook...'],
    umbrella: ['..k..', '.nnn.', '.nnn.', 'nnnnn', 'nnnnn', 'nnnnn', 'nnnnn', 'nnnnn', 'nnnnn', '.nnn.', '.nnn.', '..n..', '..n..', '..n..', '..k..', '..k..', '..k..', '..k..', '..k..', '..k..', '.kk..', 'kk...'],
    laptop: ['.nnnnnnnnnnnnnn.', '.nccccccccccccn.', '.ncuuuccccccccn.', '.ncuuucccwwwccn.', '.ncccccccccccnn.', '.nccccccccccccn.', '.nnnnnnnnnnnnnn.', 'GGGGGGGGGGGGGGGG', 'gggggggggggggggg'],
    mobile: ['.nn..', '.nnn.', 'nnnnn', 'ncccn', 'ncccn', 'nnnnn', 'ngngn', 'nnnnn', 'ngngn', 'nnnnn', '.nnn.'],
    mug: ['rrrrrr..', 'rrrrrrrr', 'rrrrrr.r', 'rrrrrr.r', 'rrrrrrrr', 'rrrrrr..', '.rrrr...'],
    plate: ['wwwwwwwwwwww', '.WWWWWWWWWW.'],
    bowl: ['uuuuuuuuu', '.uuwuuuu.', '..uuuuu..'],
    pot: ['.kkkkkkkkkkkk.', '.gggggggggggg.', 'kggggggggggggk', 'kgwggggggggggk', '.gggggggggggg.', '.gwggggggggGg.', '.gGGGGGGGGGGg.', '..gggggggggg..'],
    kettle: ['....kkk....', '...k...k...', '..k.....k..', '...rrrrr...', '..rrrrrrr..', '.rrwrrrrrrr', 'rrrwrrrrrrr', 'rrrrrrrrrr.', 'rrrrrrrrrr.', '.rrrrrrrr..'],
    toaster: ['..gggggggg..', '.gkkkggkkkg.', 'gggggggggggg', 'gggggggggggg', 'gwggggggggGg', 'gggggggggggk', 'gggggggggggk', 'GGGGGGGGGGGG'],
    glass: ['c...c', 'c...c', 'cc.cc', 'ccccc', 'ccwcc', 'ccccc', '.ccc.'],
    cereal: ['yyyyyyyy', 'yrrrrrry', 'yrwwwwry', 'yrrrrrry', 'yyyyyyyy', 'yyooooyy', 'yoowoooy', 'yoooooOy', 'yooooooy', 'yyooooyy', 'yyyyyyyy', 'YYYYYYYY'],
    brushcup: ['.u..r.', '.u..r.', '.w.rw.', '.u.r..', 'cuccrc', 'cccccc', 'cwcccc', 'cccccc', '.cccc.'],
    soap: ['.pppp.', 'piiipp', 'pppppp'],
    shampoo: ['.kk.', '.gg.', 'eeee', 'eeee', 'ewwe', 'ewEe', 'ewwe', 'eeee', 'eeee', 'eeee', 'EEEE'],
    duck: ['..yyy...', '.yykyy..', '.yyyyyoo', '..yyy...', 'yyyyyyy.', 'yyyyyyyy', '.yyyyyy.'],
    dryer: ['..kkkkkkk..', '.kPPPPPPPk.', 'kPPPPPPPPPkk', 'kPwPPPPPPPkg', '.kPPPPPPPk..', '..kkPPkkk...', '....PPk.....', '....PPk.....', '....kk......'],
    plant: ['.....e.e....', '...e.eeE.e..', '..eEe.eEeE..', '.eeEeeEeeEe.', 'eEeEeEeEeEee', '.eEeeeEeEeE.', '..eeEeeEee..', '....eEeE....', '.....EE.....', '..rrrrrrrr..', '..RRRRRRRR..', '..rrrrrrrr..', '...rrrrrr...', '...rrrrrr...', '....rrrr....'],
    tv: ['.......k.k........', '........kk........', 'nnnnnnnnnnnnnnnnnn', 'ndddddddddddddnnnn', 'ndcccccccccccdnggn', 'ndcwccccccccednnnn', 'ndcccccccccccdngnn', 'ndcccccccccccdnnnn', 'ndcccccccccccdngnn', 'ndcccccccccccdnnnn', 'ndddddddddddddnrnn', 'nnnnnnnnnnnnnnnnnn', '.nn............nn.'],
    dvd: ['nnnnnnnnnnnnnnnnnn', 'ndddddddddgggggdnn', 'nnnnnnnnnnnnnnnnen', 'nnnnnnnnnnnnnnnnnn'],
    vcr: ['KKKKKKKKKKKKKKKKKK', 'KnnnnnnnnnKKaaaKKK', 'KKKKKKKKKKKKKKKKrK', 'KKKKKKKKKKKKKKKKKK'],
    frame: ['BBBBBBBBBBB', 'BtttttttttB', 'BtccccccctB', 'BtcscscsctB', 'BtcrcucectB', 'BtcrcucectB', 'BtgggggggtB', 'BtttttttttB', 'BBBBBBBBBBB'],
    clock: ['..kkkkk..', '.kwwwwwk.', 'kwwwkwwwk', 'kwwwkwwwk', 'kwwwkkkwk', 'kwwwwwwwk', 'kwwwwwwwk', '.kwwwwwk.', '..kkkkk..'],
    mirror: ['..YYYYY..', '.YcccccY.', 'YccwccccY', 'YcwcccccY', 'YccccccwY', 'YcccccccY', '.YcccccY.', '..YYYYY..'],
    // new things
    bunny: ['.w.....w.', '.wi...iw.', '.wi...iw.', '.ww...ww.', '..wwwww..', '.wwkwkww.', '.wwwpwww.', '..wwwww..', '.wwwwwww.', 'wwwiiiwww', 'ww.iii.ww', '.wwwwwww.', '.ww...ww.'],
    elephant: ['...lllllll..', '..lllllllll.', '.lklliilllll', '.llliillllll', 'llLllllllll.', 'l.lllllllll.', 'l.lllllllll.', '..ll.ll.ll..', '..LL.LL.LL..'],
    pup: ['.BB...BB.', 'BtB...BtB', '.tttttttB', '.tktttktt.', '.tttkttt.', '..tttrt..', '.tttttttt', 'tttttttttt', 'tt.tttt.tt', '.ttt..ttt.', '.TT....TT.'],
    dino: ['........ee..', '.......eeke.', '.......eeee.', '..f.f.eee...', '.eeeeeeee...', 'eeeeeeeee...', 'e.efeefe....', '..ee..ee....', '..EE..EE....'],
    jack: ['...rr...', '..rrrr..', '..ssss..', '..sksk..', '..srrs..', '...yy...', 'uuuuuuuu', 'uyyuuyyu', 'uuuuuuuu', 'uyyuuyyu', 'uuuuuuuu'],
    snowglobe: ['..cccc..', '.chcwcc.', 'cwcccwcc', 'ccceecwc', 'cceeeecc', '.cwwwwc.', '..cccc..', '.rrrrrr.', 'rRRRRRRr'],
    yoyo: ['.rrrr.', 'rrRRrr', 'rRwwRr', 'rRwwRr', 'rrRRrr', '.rrrr.'],
    spintop: ['...k....', '..yyyy..', '.rrrrrr.', 'yyyyyyyy', 'rrrrrrrr', '.yyyyyy.', '..rrrr..', '...yy...'],
    xylo: ['rr..........', 'rroo........', 'rrooyy......', 'rrooyyee....', 'rrooyyeeuu..', 'rrooyyeeuuPP', 'BBBBBBBBBBBB', '.B........B.'],
    doll: ['..YYY..', '.YyyyY.', '.ysksy.', '.yssss.', '..sss..', '.ppppp.', 'sppwpps', 's.ppp.s', '.ppppp.', 'ppppppp', 'ppppppp', '..s.s..', '..r.r..'],
    train: ['.dd.........', '.dd..rrrrr..', 'rrrrrrrcccr.', 'rrrrrrrrrrrr', 'ryyrrrrrryyr', 'rrrrrrrrrrrr', '.kk.kk..kk..'],
    tlamp: ['..qqqqq..', '.qqqqqqq.', '.qqqqqqq.', 'qqqqqqqqq', 'QQQQQQQQQ', '....B....', '....B....', '...ooo...', '..oOooo..', '.oOoooOo.', '.oOoooOo.', '..ooooo..', '...ooo...', '..BBBBB..'],
    vase: ['.r...p.', 'rrr.ppp', '.rey.p.', '..eyye.', '..e.e..', '..uuu..', '.uuwuu.', '.uwuuu.', '.uuuuu.', '..uuu..'],
    sframe: ['YYYYYYY', 'YcccccY', 'YcsccsY', 'YcrccuY', 'YcrrcuY', 'YeeeeeY', 'YYYYYYY', '....Y..'],
    candle: ['.o.', '.y.', '.k.', 'www', 'wWw', 'www', 'www', 'www'],
    cactus: ['..e.e.', 'e.eee.', 'eeeee.', '.eee..', '.eee..', 'OOOOOO', '.oooo.', '.oooo.'],
    jewel: ['.PPPPPPP.', 'PvvvvvvvP', 'PPPPPPPPP', 'PvvvyvvvP', 'PvvvvvvvP', 'PPPPPPPPP'],
    perfume: ['..P..', '.PPP.', '.ccc.', 'chccc', 'ccccc', 'ccccc', '.ccc.'],
    cookiejar: ['...kk...', '.gggggg.', 'cccccccc', 'chcccccc', 'ccbbccbc', 'cccccccc', 'ccbcccbc', 'cccccccc', '.cccccc.'],
    fruit: ['....e......', '..rr.yyyy..', '.rrrryyyyo.', '.rrrroooooo', 'uuuuuuuuuuu', '.uuwuuuuuu.', '..uuuuuuu..'],
    crock: ['.g..B..', '.gx.B.X', '.gx.BXX', '.gxBBX.', 'ttttttt', 'tqqqqqt', 'tqrqrqt', 'tqqqqqt', '.ttttt.'],
    popcorn: ['..w.y.w...', '.wywwywyw.', 'wwwwywwwyw', 'rwrwrwrwrw', '.rwrwrwrw.', '..rwrwrw..'],
    boat: ['....w.....', '....ww....', '....www...', '....wwww..', '....k.....', 'rrrrrrrrrr', '.rrrrrrrr.'],
    cap: ['..uuuu....', '.uuuuuu...', 'uuuwuuuu..', 'UUUUUUUUUU'],
    beanie: ['...ww...', '..wwww..', '.rrrrrr.', 'rrrrrrrr', 'rwrwrwrw', 'rrrrrrrr', 'wwwwwwww'],
    glove: ['.T.T.T...', '.TbTbTb..', 'TbbbbbbbT', 'TbbtbbbbT', 'Tbbttbbb.', '.Tbbbbbb.', '..TTTTT..'],
    baseball: ['.ww.', 'wrww', 'wwrw', '.ww.'],
    skates: ['.ww.......', '.ww.......', '.wwwwww...', '.wwwwwwww.', '.rrrrrrrr.', '..k....k..', '.kgk..kgk.'],
    helmet: ['...uuuuu...', '.uuuwwuuuu.', 'uuuuuuuuuuu', 'uuwwuuuwwuu', 'uuuuuuuuuuu', 'u.........u'],
    dumbbell: ['KK......KK', 'KKXXXXXXKK', 'KK......KK'],
    cube: ['rrryyy', 'rrryyy', 'uuueee', 'uuueee', 'ooowww', 'ooowww'],
    binoc: ['.nn..nn.', 'nnnnnnnn', 'nXnnnnXn', 'nnn..nnn', 'nnn..nnn', '.n....n.'],
    dartboard: ['...kkkkk...', '..kerrrek..', '.krwwewwrk.', 'kerwrrrwrek', 'krwrewerwrk', 'krererrerek', 'krwrewerwrk', 'kerwrrrwrek', '.krwwewwrk.', '..kerrrek..', '...kkkkk...'],
    toolbox: ['....kkkk....', '....k..k....', 'rrrrrrrrrrrr', 'rrrrrrrrrrrr', 'RRRRRRRRRRRR', 'rrrrrggrrrrr', 'rrrrrrrrrrrr', 'RRRRRRRRRRRR'],
    watercan: ['.e.........', 'eee....eeee', '.e....eeeee', '..e.eeeeeee', '...eeeeeeee', '....eeeeeee', '....eEeeeee', '....EEEEEEE'],
    nails: ['.GGGG.', 'cccccc', 'cXcXcc', 'cXXcXc', 'ccXXcc', 'cXcXXc', 'cccccc'],
    lotion: ['.X..', 'XX..', '.w..', 'wwww', 'wppw', 'wpww', 'wwww', 'wwww', 'WWWW'],
    tissues: ['...ww.....', '..wwww....', 'aaaaaaaaaa', 'aeaaeaaeaa', 'aaaaaaaaaa', 'aaeaaeaaea', 'AAAAAAAAAA'],
    saltjar: ['.kkkk.', 'cccccc', 'cwpwpc', 'cpwpwc', 'cwpwpc', 'cpwpwc', 'cccccc', '.cccc.'],
    basket: ['T..............T', 'TTTTTTTTTTTTTTTT', 'TbTbTbTbTbTbTbTb', 'bTbTbTbTbTbTbTbT', 'TbTbTbTbTbTbTbTb', 'bTbTbTbTbTbTbTbT', 'TbTbTbTbTbTbTbTb', 'bTbTbTbTbTbTbTbT', 'TbTbTbTbTbTbTbTb', '.TTTTTTTTTTTTTT.'],
    coffee: ['nnnnnnnnn', 'nKKKKKKKn', 'nnnnnnnKn', '.......Kn', '.ccccc.Kn', '.cwKKc.Kn', '.cKKKcnKn', '.ccccc.Kn', 'nnnnnnnnn', 'nKKKKKrKn', 'nnnnnnnnn'],
    stapler: ['..nnnnnnn', '.nnnnnnnn', 'X.......n', 'KKKKKKKKK'],
    scissors: ['.XX....', '..XX...', '...XXX.', '..X..rr', '.X..r.r', 'X...rr.'],
    glue: ['.o.', '.w.', 'www', 'wow', 'woo', 'www', 'www'],
    calc: ['KKKKKK', 'KaaaaK', 'KKKKKK', 'KwKwKK', 'KKKKKK', 'KwKwKK', 'KKKKKK', 'KwKwrK', 'KKKKKK'],
    flash: ['.YYYY.', 'YZZZZY', 'Yyyyy.', '.uuuu.', '.uuuu.', '.uUuu.', '.uuuu.', '.uuuu.', '.uuuu.', '.UUUU.'],
    bulbs: ['.yyyy.', 'yyZZyy', 'yZhZyy', 'yyyyyy', 'rrrrrr', 'rwwwwr', 'rwrrwr', 'rwwwwr', 'rrrrrr'],
    cards: ['rrrrr', 'rwwwr', 'rwrwr', 'rwwwr', 'rrrrr'],
    soda: ['XxX', 'rrr', 'rwr', 'rwr', 'rrr', 'XXX'],
    mitten: ['..rr..rr', '.rrr.rrr', 'rrrrrrrr', 'rrrrrrrr', 'wwwwwwww', 'wwwwwwww'],
    boots: ['.BBB...BBB.', '.BBB...BBB.', '.BBB...BBB.', '.BBBB..BBBB', '.BBBBBBBBBBB', 'kkkkkkkkkkkk'],
    slippers: ['...ww.....ww', '.pppppp.pppp', 'pppppppppppp', 'iiiiiiiiiiii'],
    racket: ['.kkkkk.', 'kwkwkwk', 'kkwkwkk', 'kwkwkwk', 'kkwkwkk', 'kwkwkwk', '.kkkkk.', '..kkk..', '...k...', '...r...', '...r...', '...r...', '...r...', '...R...'],
    sponge: ['yyyyyyy', 'yyZyyyy', 'yyyyyZy', 'eeeeeee'],
    comb: ['nnnnnnnnnn', 'n.n.n.n.n.'],
    brush: ['.......BB', 'bbbbbb.BB', 'bnnnnnbBB', 'bkkkkkbB.'],
    remote: ['KKK', 'KrK', 'KKK', 'KwK', 'KKK', 'KwK', 'KKK', 'KwK', 'KKK'],
    pillow: ['.PPPPPPPP.', 'PvvvvvvvvP', 'PvvPvvPvvP', 'PvvvvvvvvP', 'PvPvvPvvvP', 'PvvvvvvvvP', '.PPPPPPPP.'],
    pumpbottle: ['.XX.', '..X.', '.XX.', 'aaaa', 'awwa', 'aAwa', 'awwa', 'aaaa', 'AAAA']
  };
  const artCache = {};
  const ART = (k, over) => { const key = k + (over ? JSON.stringify(over) : ''); return artCache[key] || (artCache[key] = art(A[k].map(r => r.padEnd(Math.max(...A[k].map(q => q.length)), '.')), over)); };
  const cache = {};
  const once = (key, fn) => () => cache[key] || (cache[key] = fn());

  // procedural pieces
  const spine = (col, w, h, band) => pc(w, h, g => { R(g, col, 0, 0, w, h); R(g, shade(col, 0.2), 0, 0, 1, h); R(g, shade(col, -0.3), w - 1, 0, 1, h); R(g, band, 0, 2, w, 1); R(g, band, 0, h - 3, w, 1); if (h > 10) R(g, shade(col, 0.35), 1, 5, w - 2, 2); });
  const layBook = (col, w, h) => pc(w, h, g => { R(g, col, 0, 0, w, h); R(g, '#f6efd8', 1, 1, w - 1, h - 2); R(g, '#e0d6bc', 1, h - 2, w - 1, 1); R(g, shade(col, -0.35), 0, h - 1, w, 1); });
  const folded = (col, w, h, stripe) => pc(w, h, g => { R(g, col, 0, 0, w, h); R(g, shade(col, 0.25), 1, 0, w - 2, 1); R(g, shade(col, -0.25), 0, h - 1, w, 1); R(g, shade(col, -0.18), w - 2, 1, 1, h - 2); R(g, shade(col, -0.12), 2, 1, 1, h - 2); if (stripe) R(g, stripe, 0, h >> 1, w, 1); });
  const thin = (col, w, h, top) => pc(w, h, g => { R(g, col, 0, 0, w, h); R(g, top || shade(col, 0.3), 0, 0, w, 1); R(g, shade(col, -0.3), 0, h - 1, w, 1); });
  const comicArt = (col, acc) => pc(9, 12, g => { R(g, col, 0, 0, 9, 12); R(g, '#fbf6ea', 0, 0, 9, 3); R(g, acc, 1, 1, 2, 1); R(g, acc, 4, 1, 4, 1); R(g, acc, 3, 5, 3, 3); R(g, '#f3cda4', 4, 4, 1, 1); R(g, acc, 2, 8, 1, 3); R(g, acc, 6, 8, 1, 3); R(g, shade(col, -0.4), 8, 0, 1, 12); R(g, shade(col, -0.4), 0, 11, 9, 1); });
  const cdArt = (col, acc) => pc(9, 9, g => { R(g, '#d8dde2', 0, 0, 9, 9); R(g, col, 1, 1, 8, 7); R(g, acc, 3, 2, 4, 4); R(g, shade(acc, 0.4), 4, 3, 1, 1); R(g, '#fbf6ea', 2, 7, 5, 1); R(g, '#8a929a', 0, 0, 1, 9); });
  const tapeArt = (col) => pc(9, 6, g => { R(g, col, 0, 0, 9, 6); R(g, '#fbf6ea', 1, 1, 7, 3); R(g, '#26262e', 2, 2, 1, 1); R(g, '#26262e', 6, 2, 1, 1); R(g, '#d0483a', 1, 1, 7, 1); R(g, shade(col, -0.3), 2, 5, 5, 1); });
  const vhsSpine = () => pc(4, 12, g => { R(g, '#26262e', 0, 0, 4, 12); R(g, '#fbf6ea', 1, 2, 2, 7); R(g, '#d0483a', 1, 3, 2, 1); });
  const vhsLay = () => pc(12, 4, g => { R(g, '#26262e', 0, 0, 12, 4); R(g, '#fbf6ea', 2, 1, 7, 2); R(g, '#d0483a', 3, 1, 1, 2); });
  const dvdSpine = (col) => pc(3, 13, g => { R(g, '#26262e', 0, 0, 3, 13); R(g, col, 1, 1, 1, 11); R(g, '#fbf6ea', 1, 3, 1, 2); });
  const gameBox = (col, acc, w) => pc(w || 16, 4, g => { const W = w || 16; R(g, col, 0, 0, W, 4); R(g, shade(col, 0.3), 0, 0, W, 1); R(g, acc, 3, 1, W - 6, 2); R(g, '#fbf6ea', 4, 1, 3, 1); R(g, shade(col, -0.3), 0, 3, W, 1); });
  const canArt = (col) => pc(8, 8, g => { R(g, '#9aa2aa', 0, 0, 8, 8); R(g, '#c8ced4', 0, 0, 8, 1); R(g, col, 0, 2, 8, 5); R(g, shade(col, 0.3), 1, 3, 2, 3); R(g, '#fbf6ea', 3, 3, 3, 2); R(g, '#6a7278', 0, 7, 8, 1); R(g, '#4a4640', 3, 0, 2, 1); });
  const jarArt = (col, lid) => pc(3, 6, g => { R(g, lid, 0, 0, 3, 1); R(g, '#e8e0cc', 0, 1, 3, 5); R(g, col, 0, 2, 3, 3); R(g, '#fbf6ea', 0, 3, 3, 1); });
  const canister = (col, w, h) => pc(w, h, g => { R(g, col, 0, 1, w, h - 1); R(g, shade(col, -0.3), 0, 0, w, 1); R(g, shade(col, -0.2), 1, 0, w - 2, 2); R(g, '#fbf6ea', 1, 4, w - 2, 3); R(g, shade(col, -0.3), 2, 5, w - 4, 1); R(g, shade(col, 0.25), 1, 2, 1, h - 3); });
  const tpArt = () => pc(6, 6, g => { R(g, '#fbf8f0', 0, 0, 6, 6); R(g, '#e2ddd0', 0, 5, 6, 1); R(g, '#e8e4d8', 4, 0, 2, 6); R(g, '#cfc8b4', 2, 0, 2, 1); });
  const tpLay = () => pc(8, 5, g => { R(g, '#fbf8f0', 0, 0, 8, 5); R(g, '#e2ddd0', 0, 4, 8, 1); R(g, '#cfc8b4', 0, 1, 1, 3); R(g, '#b8b0a0', 0, 2, 1, 1); });
  const hangCloth = (col, w, h, stripe, pat) => pc(w, h, g => {
    R(g, col, 1, 1, w - 2, h - 1); R(g, shade(col, 0.25), 1, 1, 1, h - 2); R(g, shade(col, -0.22), w - 2, 1, 1, h - 1); R(g, '#4a4640', (w >> 1), 0, 1, 2);
    for (let yy = 3; yy < h - 1; yy += 3) R(g, shade(col, -0.1), 2 + (yy % 2), yy, w - 5, 1);
    if (stripe) { R(g, stripe, 1, h - 4, w - 2, 1); R(g, stripe, 1, h - 3, w - 2, 1); }
    if (pat === 'check') for (let yy = 2; yy < h - 1; yy += 2) for (let xx = 1 + (yy >> 1) % 2; xx < w - 1; xx += 2) R(g, '#fbf6ea', xx, yy, 1, 1);
  });
  const coatArt = (col, acc) => pc(13, 22, g => {
    R(g, '#4a4640', 6, 0, 1, 2); R(g, col, 2, 2, 9, 20); R(g, col, 0, 4, 2, 15); R(g, col, 11, 4, 2, 15);
    R(g, shade(col, 0.22), 1, 4, 1, 14); R(g, shade(col, -0.25), 11, 4, 1, 15); R(g, shade(col, -0.3), 6, 4, 1, 18);
    R(g, acc, 4, 2, 5, 2); R(g, acc, 0, 18, 2, 2); R(g, acc, 11, 18, 2, 2); [7, 11, 15].forEach(yy => R(g, '#e8d8a8', 7, yy, 1, 1)); R(g, shade(col, -0.2), 3, 13, 3, 1); R(g, shade(col, -0.2), 7, 13, 3, 1);
  });
  const coatFold = (col, acc) => pc(14, 5, g => { R(g, col, 0, 0, 14, 5); R(g, shade(col, 0.25), 1, 0, 12, 1); R(g, shade(col, -0.25), 0, 4, 14, 1); R(g, acc, 0, 2, 14, 1); R(g, '#e8d8a8', 6, 1, 1, 1); });
  const scarfArt = (col, st) => pc(4, 20, g => { R(g, col, 0, 0, 4, 20); for (let y = 2; y < 17; y += 4) R(g, st, 0, y, 4, 2); R(g, shade(col, -0.25), 3, 0, 1, 20); for (let x = 0; x < 4; x += 2) R(g, col, x, 20, 1, 0); });
  const robeArt = (col) => pc(12, 20, g => { R(g, '#4a4640', 6, 0, 1, 2); R(g, col, 1, 2, 10, 18); R(g, shade(col, 0.2), 2, 2, 2, 17); R(g, shade(col, -0.2), 9, 3, 2, 17); R(g, shade(col, -0.3), 5, 3, 2, 10); R(g, '#fbf6ea', 1, 9, 10, 2); R(g, shade(col, -0.15), 3, 16, 6, 1); });
  const ropeArt = () => pc(9, 16, g => { R(g, '#d0483a', 0, 0, 2, 5); R(g, '#d0483a', 7, 0, 2, 5); const y0 = 5; for (let k = 0; k < 10; k++) { R(g, '#f4cf55', 1 + Math.round(k * 0.2), y0 + k, 1, 1); R(g, '#f4cf55', 7 - Math.round(k * 0.2), y0 + k, 1, 1); } R(g, '#f4cf55', 3, 15, 3, 1); });
  const towelHang = (col, stripe) => pc(12, 16, g => { R(g, col, 0, 0, 12, 16); R(g, shade(col, 0.2), 0, 0, 12, 2); R(g, shade(col, -0.18), 0, 2, 12, 1); for (let x = 2; x < 12; x += 3) R(g, shade(col, -0.08), x, 3, 1, 12); if (stripe) { R(g, stripe, 0, 11, 12, 2); } R(g, shade(col, -0.3), 0, 15, 12, 1); for (let x = 0; x < 12; x += 2) R(g, shade(col, 0.3), x, 15, 1, 1); });
  const mittArt = (col) => pc(6, 10, g => { R(g, '#4a4640', 3, 0, 1, 1); R(g, col, 1, 1, 4, 8); R(g, col, 0, 3, 1, 3); R(g, col, 5, 2, 1, 4); R(g, '#fbf6ea', 1, 7, 4, 2); R(g, shade(col, 0.25), 2, 2, 1, 4); R(g, shade(col, -0.25), 4, 2, 1, 5); });
  const toolHang = (kind) => pc(kind === 'hammer' ? 7 : 4, 13, g => {
    if (kind === 'hammer') { R(g, '#b5773f', 3, 3, 1, 10); R(g, '#8a5a32', 3, 10, 1, 3); R(g, '#7a746a', 0, 0, 7, 3); R(g, '#bdb7ab', 1, 0, 5, 1); R(g, '#4a4640', 5, 2, 2, 1); }
    else { R(g, '#9aa2aa', 1, 3, 2, 8); R(g, '#bdb7ab', 1, 3, 1, 8); R(g, '#9aa2aa', 0, 0, 4, 3); R(g, '#3a3a40', 1, 0, 2, 2); R(g, '#9aa2aa', 0, 11, 4, 2); R(g, '#3a3a40', 1, 12, 2, 1); }
  });
  const toolLay = (kind) => pc(13, kind === 'hammer' ? 5 : 4, g => {
    if (kind === 'hammer') { R(g, '#b5773f', 0, 2, 10, 2); R(g, '#8a5a32', 0, 2, 3, 2); R(g, '#7a746a', 10, 0, 3, 5); R(g, '#bdb7ab', 10, 0, 1, 5); }
    else { R(g, '#9aa2aa', 3, 1, 7, 2); R(g, '#9aa2aa', 0, 0, 3, 4); R(g, '#3a3a40', 0, 1, 2, 2); R(g, '#9aa2aa', 10, 0, 3, 4); R(g, '#3a3a40', 11, 1, 2, 2); }
  });
  const cordArt = () => pc(9, 10, g => { R(g, '#4a4640', 4, 0, 1, 2); g.strokeStyle = '#e8702a'; g.lineWidth = 1; for (let k = 0; k < 3; k++) { g.beginPath(); g.ellipse(4.5, 5.5 + k * 0.6, 3.6 - k * 0.5, 3.4 - k * 0.4, 0, 0, 7); g.stroke(); } R(g, '#26262e', 6, 8, 2, 2); });
  const batArt = () => pc(3, 24, g => { R(g, '#d8a868', 1, 0, 2, 16); R(g, '#e8c088', 1, 0, 1, 14); R(g, '#d8a868', 1, 16, 1, 7); R(g, '#26262e', 0, 21, 3, 3); R(g, '#b8864e', 0, 0, 1, 12); });
  const batLay = () => pc(24, 3, g => { R(g, '#d8a868', 8, 0, 16, 2); R(g, '#e8c088', 10, 0, 14, 1); R(g, '#d8a868', 1, 1, 7, 1); R(g, '#26262e', 0, 0, 3, 3); });
  const guitarArt = () => pc(11, 32, g => {
    R(g, '#3a2616', 4, 0, 3, 4); R(g, '#e8e0cc', 3, 1, 1, 1); R(g, '#e8e0cc', 7, 1, 1, 1); R(g, '#e8e0cc', 3, 3, 1, 1); R(g, '#e8e0cc', 7, 3, 1, 1);
    R(g, '#5a3a1a', 4, 4, 3, 13); R(g, '#8a6a3a', 5, 4, 1, 13); for (let y = 6; y < 17; y += 3) R(g, '#c8c0a8', 4, y, 3, 1);
    g.fillStyle = '#d08a3a'; g.beginPath(); g.ellipse(5.5, 20.5, 4, 3.6, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(5.5, 27, 5.4, 4.8, 0, 0, 7); g.fill();
    R(g, '#e8a850', 2, 25, 2, 4); R(g, '#3a2616', 4, 21, 3, 3); R(g, '#5a3a1a', 3, 28, 5, 1);
  });
  const fLampArt = () => pc(11, 44, g => { R(g, '#f4e4c4', 1, 0, 9, 1); R(g, '#f4e4c4', 0, 1, 11, 9); R(g, '#e0c898', 0, 8, 11, 2); R(g, '#fff4d8', 3, 2, 2, 5); R(g, '#4a4640', 5, 10, 1, 31); R(g, '#7a746a', 5, 10, 1, 2); R(g, '#4a4640', 2, 41, 7, 3); R(g, '#7a746a', 3, 41, 5, 1); });
  const racketArt = () => ART('racket');
  const paintSet = () => pc(14, 4, g => { R(g, '#26262e', 0, 0, 14, 4); R(g, '#fbf6ea', 1, 1, 12, 2); ['#d0483a', '#ec9444', '#f4cf55', '#62a84e', '#4f7fd0', '#8e5cb0'].forEach((c, k) => R(g, c, 1 + k * 2, 1, 2, 2)); });
  const pencase = (col) => pc(12, 4, g => { R(g, col, 0, 0, 12, 4); R(g, shade(col, 0.3), 1, 0, 10, 1); R(g, '#e4e6e8', 0, 1, 12, 1); R(g, '#9aa2aa', 9, 1, 1, 2); R(g, shade(col, -0.3), 0, 3, 12, 1); });
  const ruler = () => pc(16, 2, g => { R(g, '#f4d878', 0, 0, 16, 2); for (let x = 1; x < 16; x += 2) R(g, '#6a4222', x, 0, 1, x % 4 === 1 ? 1 : 1); });
  const boardArt = () => pc(13, 2, g => { R(g, '#d8a868', 0, 0, 13, 2); R(g, '#e8c088', 0, 0, 13, 1); R(g, '#b8864e', 11, 0, 1, 2); });
  const panLay = () => pc(15, 3, g => { R(g, '#3e3e4a', 0, 0, 10, 3); R(g, '#5a5a66', 1, 0, 8, 1); R(g, '#26262e', 10, 1, 5, 1); R(g, '#8a5a32', 12, 1, 3, 1); });
  const magArt = (col, acc) => pc(11, 2, g => { R(g, col, 0, 0, 11, 2); R(g, acc, 1, 0, 5, 1); R(g, shade(col, -0.3), 0, 1, 11, 1); });
  const albumArt = (col) => spine(col, 5, 13, '#e8d8a8');
  const photoArt = (bg, a1, a2) => pc(11, 9, g => { R(g, '#6a4222', 0, 0, 11, 9); R(g, '#c98b52', 0, 0, 11, 1); R(g, bg, 1, 1, 9, 7); R(g, '#62a84e', 1, 6, 9, 2); R(g, a1, 3, 3, 2, 4); R(g, '#f3cda4', 3, 2, 2, 1); R(g, a2, 6, 4, 2, 3); R(g, '#f3cda4', 6, 3, 2, 1); });
  const blanket = (col, st) => folded(col, 14, 4, st);
  const shoes = (col) => pc(12, 4, g => { R(g, col, 1, 1, 4, 2); R(g, col, 0, 2, 5, 1); R(g, col, 7, 1, 4, 2); R(g, col, 6, 2, 6, 1); R(g, shade(col, 0.35), 2, 1, 2, 1); R(g, shade(col, 0.35), 8, 1, 2, 1); R(g, '#26262e', 0, 3, 5, 1); R(g, '#26262e', 6, 3, 6, 1); });
  const binderArt = (col) => pc(4, 13, g => { R(g, col, 0, 0, 4, 13); R(g, shade(col, 0.25), 0, 0, 1, 13); R(g, '#fbf6ea', 1, 3, 2, 4); R(g, '#9aa2aa', 1, 9, 2, 1); R(g, shade(col, -0.3), 3, 0, 1, 13); });
  function posterArt(kind) {
    return pc(14, 20, g => {
      const bgc = { rocket: '#1f2a5a', sport: '#3a8a3a', band: '#6a2c7a', movie: '#101830', modern: '#f0e0c0', unicorn: '#9ad0ec', surf: '#ec9444' }[kind];
      R(g, '#fbf6ea', 0, 0, 14, 20); R(g, bgc, 1, 1, 12, 18);
      if (kind === 'rocket') { [[2, 3], [10, 5], [4, 14], [11, 15], [7, 2]].forEach(([x, y]) => R(g, '#fbf6ea', x, y, 1, 1)); R(g, '#e8e4dc', 6, 5, 3, 8); R(g, '#d0483a', 7, 4, 1, 1); R(g, '#d0483a', 5, 11, 1, 3); R(g, '#d0483a', 9, 11, 1, 3); R(g, '#f4cf55', 6, 13, 3, 2); R(g, '#ec9444', 7, 15, 1, 2); R(g, '#4f7fd0', 7, 7, 1, 1); }
      if (kind === 'sport') { R(g, '#fbf6ea', 1, 12, 12, 1); R(g, '#fbf6ea', 5, 3, 4, 4); R(g, '#26262e', 6, 4, 2, 2); R(g, '#f4cf55', 2, 15, 10, 2); }
      if (kind === 'band') { R(g, '#ec9444', 3, 3, 8, 2); R(g, '#f4cf55', 2, 8, 10, 1); R(g, '#26262e', 5, 10, 4, 6); R(g, '#f3cda4', 6, 9, 2, 2); R(g, '#ee9fb8', 3, 16, 8, 1); }
      if (kind === 'movie') { R(g, '#ec9444', 3, 7, 8, 8); R(g, '#f4cf55', 4, 8, 3, 3); R(g, '#9ad0ec', 1, 12, 12, 1); R(g, '#fbf6ea', 3, 2, 8, 2); R(g, '#fbf6ea', 2, 16, 10, 1); }
      if (kind === 'modern') { R(g, '#d0483a', 2, 3, 6, 6); R(g, '#2c4888', 6, 8, 6, 7); R(g, '#f4cf55', 3, 12, 3, 3); R(g, '#26262e', 2, 17, 10, 1); }
      if (kind === 'unicorn') { R(g, '#fbf6ea', 1, 14, 12, 4); R(g, '#fbf6ea', 4, 7, 6, 5); R(g, '#fbf6ea', 8, 5, 3, 3); R(g, '#f4cf55', 10, 3, 1, 2); R(g, '#ee9fb8', 5, 6, 3, 1); R(g, '#8e5cb0', 4, 7, 1, 3); R(g, '#fbf6ea', 4, 12, 1, 2); R(g, '#fbf6ea', 8, 12, 1, 2); [['#d0483a', 2], ['#f4cf55', 3], ['#62a84e', 4]].forEach(([c, y]) => R(g, c, 1, y, 5, 1)); }
      if (kind === 'surf') { R(g, '#f4cf55', 4, 3, 6, 6); R(g, '#4f7fd0', 1, 11, 12, 8); R(g, '#9ad0ec', 1, 11, 12, 1); R(g, '#d0483a', 6, 8, 2, 9); R(g, '#fbf6ea', 2, 14, 3, 1); }
    });
  }
  const drawingArt = () => pc(12, 10, g => { R(g, '#fbf6ea', 0, 0, 12, 10); R(g, '#f4cf55', 1, 1, 3, 3); R(g, '#62a84e', 0, 8, 12, 2); R(g, '#d0483a', 5, 4, 5, 4); R(g, '#8e2a22', 4, 3, 7, 1); R(g, '#4f7fd0', 7, 6, 1, 2); R(g, '#c9c0a8', 0, 0, 2, 1); R(g, '#c9c0a8', 10, 0, 2, 1); });
  const pennantArt = () => pc(18, 8, g => { R(g, '#6a4222', 0, 0, 1, 8); for (let x = 1; x < 18; x++) { const hh = Math.round(7 * (1 - (x - 1) / 17)); R(g, '#2c4888', x, 4 - (hh >> 1), 1, Math.max(1, hh)); } R(g, '#f4cf55', 3, 3, 7, 1); R(g, '#f4cf55', 3, 4, 1, 1); });
  const calendarArt = (top) => pc(10, 13, g => { R(g, '#fbf6ea', 0, 1, 10, 12); R(g, top || '#62a84e', 1, 2, 8, 4); R(g, '#9ad0ec', 1, 2, 8, 2); R(g, '#2b1d14', 4, 0, 2, 2); for (let y = 7; y < 12; y += 2) for (let x = 1; x < 9; x += 2) R(g, '#bdb7ab', x, y, 1, 1); R(g, '#d0483a', 5, 9, 1, 1); });
  const gradArt = () => pc(11, 9, g => { R(g, '#26262e', 0, 0, 11, 9); R(g, '#9ad0ec', 1, 1, 9, 7); R(g, '#f3cda4', 4, 3, 3, 2); R(g, '#26262e', 3, 2, 5, 1); R(g, '#26262e', 3, 5, 5, 3); R(g, '#f4cf55', 7, 2, 1, 2); });
  const friendsArt = () => pc(13, 9, g => { R(g, '#c19a2e', 0, 0, 13, 9); R(g, '#f4cf55', 1, 1, 11, 7); R(g, '#9ad0ec', 2, 2, 9, 5); [3, 6, 9].forEach((x, i) => { R(g, '#f3cda4', x, 3, 1, 1); R(g, ['#d0483a', '#62a84e', '#8e5cb0'][i], x - 1 + (i === 1 ? 1 : 0), 4, 2, 3); }); });
  const kclockArt = () => pc(9, 9, g => { g.fillStyle = '#d0483a'; g.beginPath(); g.arc(4.5, 4.5, 4.5, 0, 7); g.fill(); R(g, '#fbf6ea', 2, 2, 5, 5); R(g, '#fbf6ea', 1, 3, 7, 3); R(g, '#fbf6ea', 3, 1, 3, 7); R(g, '#26262e', 4, 2, 1, 3); R(g, '#26262e', 5, 4, 2, 1); });
  const certArt = () => pc(12, 9, g => { R(g, '#6a4222', 0, 0, 12, 9); R(g, '#fbf6ea', 1, 1, 10, 7); R(g, '#c19a2e', 2, 2, 8, 1); R(g, '#bdb7ab', 2, 4, 8, 1); R(g, '#bdb7ab', 3, 5, 6, 1); R(g, '#d0483a', 8, 6, 2, 1); });
  const mapArt = () => pc(16, 11, g => { R(g, '#fbf6ea', 0, 0, 16, 11); R(g, '#9ad0ec', 1, 1, 14, 9); R(g, '#62a84e', 2, 2, 4, 3); R(g, '#62a84e', 3, 5, 2, 3); R(g, '#62a84e', 7, 2, 3, 2); R(g, '#62a84e', 8, 4, 2, 4); R(g, '#62a84e', 11, 2, 3, 3); R(g, '#62a84e', 13, 7, 2, 2); R(g, '#d0483a', 0, 0, 1, 1); R(g, '#d0483a', 15, 0, 1, 1); });
  const keysArt = () => pc(8, 12, g => { R(g, '#6a4222', 0, 0, 8, 2); R(g, '#c98b52', 0, 0, 8, 1); [1, 4, 6].forEach((x, k) => { R(g, '#4a4640', x, 2, 1, 2); R(g, ['#c19a2e', '#9aa2aa', '#c19a2e'][k], x, 4, 1, 5 - k); R(g, ['#c19a2e', '#9aa2aa', '#c19a2e'][k], x - (k === 1 ? 0 : 0), 4, 2, 2); }); });

  /* ---------- item catalogue ----------
     n name, mat material (sound), spr stand sprite, lay lying sprite (stacks / low spaces),
     row: items that line up side by side (rg = gap), stk: stack group, wall: hangs on walls only,
     hang: can hang from hooks and towel bars (a sprite for how it hangs, or 1 to use spr). */
  const it = (n, mat, spr, o) => Object.assign({ n, mat, spr }, o || {});
  const a = (k, over) => () => ART(k, over);
  const BOOKC = ['#d0483a', '#2c4888', '#347038', '#c19a2e', '#8e5cb0', '#ec9444', '#5fb8a8', '#8e2a22'];
  const book = (n, ci, h) => it(n, 'paper', once('bk' + ci + h, () => spine(BOOKC[ci], 4, h, '#f4cf55')), { lay: once('bkl' + ci + h, () => layBook(BOOKC[ci], h, 3)), row: 'book', rg: 0, stk: 'paper' });
  const binder = (n, ci) => it(n, 'paper', once('bd' + ci, () => binderArt(BOOKC[ci])), { lay: once('bdl' + ci, () => layBook(BOOKC[ci], 13, 4)), row: 'book', rg: 0, stk: 'paper' });
  const album = (n, ci) => it(n, 'paper', once('al' + ci, () => albumArt(BOOKC[ci])), { lay: once('all' + ci, () => layBook(BOOKC[ci], 13, 4)), row: 'book', rg: 0, stk: 'paper' });
  const comic = (ci, ai) => it('Comic book', 'paper', once('cm' + ci + ai, () => comicArt(BOOKC[ci], BOOKC[ai])), { lay: once('cml' + ci, () => thin(BOOKC[ci], 9, 2, '#fbf6ea')), row: 'comic', rg: 1, stk: 'paper' });
  const mag = (n, ci, ai) => it(n, 'paper', once('mg' + ci + ai, () => magArt(BOOKC[ci], BOOKC[ai])), { stk: 'paper' });
  const cd = (ci, ai) => it('CD', 'plastic', once('cd' + ci + ai, () => cdArt(BOOKC[ci], BOOKC[ai])), { lay: once('cdl' + ci, () => thin('#d8dde2', 9, 2, BOOKC[ci])), row: 'cd', rg: 1, stk: 'cd' });
  const tape = (col) => it('Cassette tape', 'plastic', once('tp' + col, () => tapeArt(col)), { lay: once('tpl' + col, () => thin(col, 9, 2)), row: 'tape', rg: 1, stk: 'tape' });
  const floppy = (col) => it('Floppy disk', 'plastic', a('floppy', { U: col }), { lay: once('fl' + col, () => thin(col, 8, 2)), row: 'floppy', rg: 1, stk: 'floppy' });
  const cart = (col) => it('Game cartridge', 'plastic', a('cart', { r: col }), { lay: once('ctl', () => thin('#7a746a', 8, 2)), row: 'cart', rg: 1, stk: 'cart' });
  const vhs = () => it('Video tape', 'plastic', once('vhs', vhsSpine), { lay: once('vhsl', vhsLay), row: 'vhs', rg: 0, stk: 'vhs' });
  const dvd = (col, n) => it(n || 'DVD', 'plastic', once('dv' + col, () => dvdSpine(col)), { lay: once('dvl' + col, () => thin('#26262e', 11, 2, col)), row: 'vhs', rg: 0, stk: 'vhs' });
  const shirt = (col, stripe) => it('Folded shirt', 'cloth', once('sh' + col + stripe, () => folded(col, 10, 4, stripe)), { stk: 'cloth' });
  const cloth = (n, col, w, h, stripe) => it(n, 'cloth', once('cl' + n + col, () => folded(col, w, h, stripe)), { stk: 'cloth' });
  const towel = (col, stripe) => it('Towel', 'cloth', once('tw' + col, () => folded(col, 12, 4, stripe)), { stk: 'cloth', hang: once('twh' + col, () => towelHang(col, stripe)) });
  const mug = (col) => it('Mug', 'glass', a('mug', { r: col }), { row: 'mug', rg: 1 });
  const game = (n, col, acc) => it(n, 'paper', once('gm' + col + acc, () => gameBox(col, acc)), { stk: 'game' });
  const spice = (n, col, lid) => it(n, 'glass', once('sp' + col, () => jarArt(col, lid || '#d0483a')), { row: 'jar', rg: 0 });
  const tin = (n, col, w, h) => it(n, 'metal', once('ti' + n, () => canister(col, w || 7, h || 9)), { row: 'tin', rg: 1 });
  const soda = (col) => it('Soda can', 'metal', a('soda', { r: col }), { row: 'can', rg: 0 });
  const bottle = (n, col) => it(n, 'plastic', a('shampoo', { e: col, E: shade(col, -0.3) }), { row: 'bottle', rg: 1 });
  const paint = (col) => it('Paint can', 'metal', once('pc' + col, () => canArt(col)), { stk: 'can' });
  const W_ = (n, mat, spr) => it(n, mat, spr, { wall: 1 });
  const C = {
    teddy: () => it('Teddy bear', 'plush', a('teddy')),
    bunny: () => it('Stuffed bunny', 'plush', a('bunny')),
    elephant: () => it('Stuffed elephant', 'plush', a('elephant')),
    pup: () => it('Stuffed puppy', 'plush', a('pup')),
    dino: () => it('Toy dinosaur', 'plastic', a('dino')),
    doll: () => it('Doll', 'cloth', a('doll')),
    robot: () => it('Toy robot', 'plastic', a('robot')),
    lunch: () => it('Lunchbox', 'metal', a('lunch')),
    car: () => it('Toy car', 'plastic', a('car')),
    train: () => it('Toy train', 'metal', a('train')),
    blocks: () => it('Letter blocks', 'wood', a('blocks')),
    piggy: () => it('Piggy bank', 'glass', a('piggy')),
    ball: () => it('Bouncy ball', 'ball', a('ball')),
    jack: () => it('Jack-in-the-box', 'metal', a('jack')),
    snowglobe: () => it('Snow globe', 'glass', a('snowglobe')),
    yoyo: () => it('Yo-yo', 'wood', a('yoyo')),
    spintop: () => it('Spinning top', 'metal', a('spintop')),
    xylo: () => it('Toy xylophone', 'bell', a('xylo')),
    nlamp: () => it('Night-light', 'plastic', a('nlamp')),
    recorder: () => it('Tape recorder', 'plastic', a('recorder')),
    crayons: () => it('Crayons', 'paper', a('crayons')),
    handheld: () => it('Handheld game', 'plastic', a('handheld')),
    boombox: () => it('Boombox', 'plastic', a('boombox')),
    trophy: (n) => it(n || 'Soccer trophy', 'metal', a('trophy')),
    soccer: () => it('Soccer ball', 'ball', a('soccer')),
    dlamp: (col) => it('Desk lamp', 'metal', a('dlamp', col ? { r: col } : null)),
    tlamp: (col) => it('Table lamp', 'glass', a('tlamp', col ? { o: col, O: shade(col, -0.3) } : null)),
    flamp: () => it('Floor lamp', 'metal', once('flamp', fLampArt)),
    dclock: () => it('Alarm clock', 'plastic', a('dclock')),
    pencils: () => it('Pencil cup', 'plastic', a('pencils')),
    markers: () => it('Marker cup', 'plastic', a('pencils', { y: '#ee9fb8', r: '#8e5cb0', e: '#5fb8a8', u: '#d0483a', U: '#8e2a22' })),
    globe: () => it('Globe', 'plastic', a('globe')),
    plane: () => it('Model airplane', 'plastic', a('plane')),
    sneaker: (col) => it('Sneakers', 'cloth', a('sneaker', col ? { r: col } : null), { row: 'shoe', rg: 2 }),
    shoes: (col) => it('Shoes', 'cloth', once('shoes' + col, () => shoes(col)), { row: 'shoe', rg: 2 }),
    boots: () => it('Boots', 'cloth', a('boots'), { row: 'shoe', rg: 2 }),
    rainboots: () => it('Rain boots', 'plastic', a('boots', { B: '#f4cf55' }), { row: 'shoe', rg: 2 }),
    slippers: () => it('Slippers', 'cloth', a('slippers'), { row: 'shoe', rg: 2 }),
    cdplayer: () => it('CD player', 'plastic', a('cdplayer')),
    monitor: () => it('Computer monitor', 'plastic', a('monitor')),
    tower: () => it('Computer', 'plastic', a('tower')),
    keyboard: () => it('Keyboard', 'plastic', a('keyboard')),
    skate: () => it('Skateboard', 'wood', a('skate')),
    skates: () => it('Roller skates', 'plastic', a('skates')),
    pager: () => it('Pager', 'plastic', a('pager')),
    phones: () => it('Headphones', 'plastic', a('phones')),
    radio: () => it('Clock radio', 'plastic', a('radio')),
    glitter: () => it('Glitter lamp', 'glass', a('glitter')),
    pack: (col) => it('Backpack', 'cloth', a('pack', col ? { u: col, U: shade(col, -0.3) } : null), { hang: 1 }),
    bball: () => it('Basketball', 'ball', a('bball')),
    baseball: () => it('Baseball', 'ball', a('baseball')),
    glove: () => it('Baseball glove', 'cloth', a('glove')),
    bat: () => it('Baseball bat', 'wood', once('bat', batArt), { lay: once('batl', batLay), hang: once('bat', batArt) }),
    helmet: () => it('Bike helmet', 'plastic', a('helmet'), { hang: 1 }),
    racket: () => it('Tennis racket', 'wood', once('racket', racketArt), { hang: 1 }),
    dumbbell: () => it('Dumbbell', 'metal', a('dumbbell'), { stk: 'weight' }),
    rope: () => it('Jump rope', 'cloth', once('ropef', () => folded('#d0483a', 7, 3, '#f4cf55')), { hang: once('rope', ropeArt) }),
    cap: (col) => it('Baseball cap', 'cloth', a('cap', col ? { u: col, U: shade(col, -0.3) } : null), { hang: 1 }),
    beanie: () => it('Winter hat', 'cloth', a('beanie'), { hang: 1 }),
    scarf: (col, st) => it('Scarf', 'cloth', once('scf' + col, () => folded(col, 10, 3, st)), { stk: 'cloth', hang: once('sch' + col, () => scarfArt(col, st)) }),
    coat: (n, col, acc) => it(n, 'cloth', once('ctf' + col, () => coatFold(col, acc)), { stk: 'cloth', hang: once('cth' + col, () => coatArt(col, acc)) }),
    robe: (col) => it('Bathrobe', 'cloth', once('rbf' + col, () => folded(col, 13, 5, '#fbf6ea')), { stk: 'cloth', hang: once('rbh' + col, () => robeArt(col)) }),
    mittens: () => it('Mittens', 'cloth', a('mitten')),
    guitar: () => it('Guitar', 'wood', once('guitar', guitarArt)),
    cube: () => it('Puzzle cube', 'plastic', a('cube')),
    binoc: () => it('Binoculars', 'metal', a('binoc')),
    umbrella: () => it('Umbrella', 'cloth', a('umbrella'), { hang: 1 }),
    laptop: () => it('Laptop', 'plastic', a('laptop')),
    mobile: () => it('Mobile phone', 'plastic', a('mobile')),
    remote: () => it('Remote control', 'plastic', a('remote'), { lay: once('rml', () => thin('#3e3e4a', 9, 2, '#d0483a')) }),
    calc: () => it('Calculator', 'plastic', a('calc')),
    stapler: () => it('Stapler', 'metal', a('stapler')),
    scissors: () => it('Scissors', 'metal', a('scissors')),
    glue: () => it('Glue', 'plastic', a('glue'), { row: 'bottle', rg: 1 }),
    ruler: () => it('Ruler', 'wood', once('ruler', ruler), { stk: 'paper' }),
    pencase: (col) => it('Pencil case', 'cloth', once('pcs' + col, () => pencase(col)), { stk: 'paper' }),
    paintset: () => it('Paint set', 'plastic', once('paintset', paintSet), { stk: 'paper' }),
    plate: () => it('Plate', 'glass', a('plate'), { stk: 'plate' }),
    bowl: (col) => it('Bowl', 'glass', a('bowl', { u: col }), { stk: 'bowl' }),
    pot: () => it('Pot', 'metal', a('pot'), { stk: 'pot' }),
    pan: () => it('Frying pan', 'metal', once('pan', panLay), { stk: 'pot', hang: once('panh', () => pc(3, 15, g => { R(g, '#8a5a32', 1, 0, 1, 4); R(g, '#26262e', 1, 4, 1, 2); R(g, '#3e3e4a', 0, 6, 3, 9); R(g, '#5a5a66', 0, 6, 1, 9); })) }),
    kettle: () => it('Kettle', 'metal', a('kettle')),
    toaster: () => it('Toaster', 'metal', a('toaster')),
    coffee: () => it('Coffee maker', 'plastic', a('coffee')),
    glass: () => it('Glass', 'glass', a('glass'), { row: 'glass', rg: 1 }),
    cereal: () => it('Cereal', 'paper', a('cereal', { O: '#c86a20' })),
    cookiejar: () => it('Cookie jar', 'glass', a('cookiejar')),
    fruit: () => it('Fruit bowl', 'glass', a('fruit')),
    crock: () => it('Spoon crock', 'glass', a('crock')),
    board: () => it('Cutting board', 'wood', once('board', boardArt), { stk: 'board' }),
    mitt: (col) => it('Oven mitt', 'cloth', once('mtf' + col, () => folded(col, 7, 3)), { hang: once('mt' + col, () => mittArt(col)) }),
    dishtowel: (col) => it('Dish towel', 'cloth', once('dtf' + col, () => folded(col, 9, 3)), { stk: 'cloth', hang: once('dth' + col, () => hangCloth(col, 7, 11, null, 'check')) }),
    popcorn: () => it('Popcorn bowl', 'paper', a('popcorn')),
    brushcup: () => it('Toothbrushes', 'glass', a('brushcup')),
    soap: (col) => it('Soap', 'plastic', a('soap', col ? { p: col, i: shade(col, 0.4) } : null), { stk: 'soap' }),
    shampoo: (col) => bottle('Shampoo', col || '#62a84e'),
    lotion: () => it('Lotion', 'plastic', a('lotion'), { row: 'bottle', rg: 1 }),
    pump: (col) => it('Hand soap', 'plastic', a('pumpbottle', col ? { a: col, A: shade(col, -0.3) } : null), { row: 'bottle', rg: 1 }),
    duck: () => it('Rubber duck', 'rubber', a('duck')),
    boat: () => it('Toy boat', 'rubber', a('boat')),
    sponge: () => it('Sponge', 'rubber', a('sponge')),
    comb: () => it('Comb', 'plastic', a('comb')),
    brush: () => it('Hairbrush', 'plastic', a('brush')),
    tissues: () => it('Tissues', 'paper', a('tissues')),
    tp: () => it('Toilet paper', 'paper', once('tp', tpArt), { lay: once('tpl', tpLay), stk: 'tp' }),
    saltjar: () => it('Bath salts', 'glass', a('saltjar')),
    basket: () => it('Laundry basket', 'wood', a('basket')),
    perfume: () => it('Perfume', 'glass', a('perfume')),
    dryer: () => it('Hair dryer', 'plastic', a('dryer')),
    plant: () => it('Houseplant', 'glass', a('plant')),
    cactus: () => it('Little cactus', 'glass', a('cactus')),
    vase: () => it('Flower vase', 'glass', a('vase')),
    candle: () => it('Candle', 'glass', a('candle'), { row: 'candle', rg: 1 }),
    sframe: () => it('Photo frame', 'glass', a('sframe')),
    jewel: () => it('Jewelry box', 'wood', a('jewel')),
    pillow: (col) => it('Throw pillow', 'plush', a('pillow', col ? { v: col, P: shade(col, -0.3) } : null)),
    cards: () => it('Deck of cards', 'paper', a('cards')),
    tv: () => it('TV', 'plastic', a('tv')),
    dvd: () => it('DVD player', 'plastic', a('dvd')),
    vcr: () => it('VCR', 'plastic', a('vcr')),
    toolbox: () => it('Toolbox', 'metal', a('toolbox')),
    hammer: () => it('Hammer', 'metal', once('hml', () => toolLay('hammer')), { hang: once('hmh', () => toolHang('hammer')) }),
    wrench: () => it('Wrench', 'metal', once('wrl', () => toolLay('wrench')), { hang: once('wrh', () => toolHang('wrench')) }),
    cord: () => it('Extension cord', 'plastic', once('cord', cordArt), { hang: 1 }),
    flash: () => it('Flashlight', 'metal', a('flash')),
    nails: () => it('Jar of nails', 'metal', a('nails')),
    watercan: () => it('Watering can', 'metal', a('watercan')),
    bulbs: () => it('Light bulbs', 'paper', a('bulbs')),
    photo: () => W_('Family photo', 'glass', a('frame')),
    clock: () => W_('Wall clock', 'glass', a('clock')),
    kclock: () => W_('Kitchen clock', 'glass', once('kclock', kclockArt)),
    mirror: () => W_('Round mirror', 'glass', a('mirror')),
    drawing: () => W_('My drawing', 'paper', once('drawing', drawingArt)),
    pennant: () => W_('Team pennant', 'paper', once('pennant', pennantArt)),
    calendar: (col) => W_('Calendar', 'paper', once('calendar' + col, () => calendarArt(col))),
    grad: () => W_('Graduation photo', 'glass', once('grad', gradArt)),
    friends: () => W_('Photo of friends', 'glass', once('friends', friendsArt)),
    cert: () => W_('Certificate', 'glass', once('cert', certArt)),
    worldmap: () => W_('World map', 'paper', once('wmap', mapArt)),
    dartboard: () => W_('Dartboard', 'wood', a('dartboard')),
    wphoto: (n, bg, a1, a2) => W_(n, 'glass', once('ph' + n, () => photoArt(bg, a1, a2))),
    poster: (k, n) => W_(n, 'paper', once('po' + k, () => posterArt(k)))
  };

  /* ---------- furniture ----------
     Each piece draws itself and registers surfaces (lines things sit on, or hang from), containers (drawers
     and doors that open) and wall zones. Surfaces: {x0, x1, y, clear}. Drawing is in grid units with
     half-pixel detail (the canvas is painted at 2x). */
  const SH = 'rgba(40,22,10,', sh = a2 => SH + a2 + ')';
  function grain(g, x, y, w, h, col, vert) {
    const c1 = shade(col, -0.13), c2 = shade(col, 0.08);
    if (vert) { for (let xx = x + 1; xx < x + w - 0.5; xx += 1.5) for (let yy = y + 0.5; yy < y + h - 1; ) { const len = 3 + hash(xx * 7, yy * 3) % 10; if (hash(xx * 3, yy * 11) % 3) R(g, hash(xx, yy) % 4 ? c1 : c2, xx, yy, 0.5, Math.min(len, y + h - 0.5 - yy)); yy += len + 1; } return; }
    for (let yy = y + 1; yy < y + h - 0.5; yy += 1.5) for (let xx = x + 0.5; xx < x + w - 1; ) { const len = 3 + hash(xx * 7, yy * 13) % 11; if (hash(xx * 5, yy * 3) % 3) R(g, hash(xx, yy) % 4 ? c1 : c2, xx, yy, Math.min(len, x + w - 0.5 - xx), 0.5); xx += len + 1; }
  }
  // a wooden (or painted) block with a dark outline, lit top edge and shaded bottom
  function block(g, x, y, w, h, col, o) {
    o = o || {}; const r = ramp(col);
    R(g, r[0], x, y, w, h); R(g, col, x + 0.5, y + 0.5, w - 1, h - 1);
    if (o.grain) grain(g, x + 0.5, y + 0.5, w - 1, h - 1, col, o.vert);
    R(g, r[3], x + 0.5, y + 0.5, w - 1, 0.5); if (!o.flat) R(g, r[3], x + 0.5, y + 0.5, 0.5, h - 1);
    R(g, r[1], x + 0.5, y + h - 1, w - 1, 0.5); if (!o.flat) R(g, r[1], x + w - 1, y + 1, 0.5, h - 1.5);
  }
  // a recessed or raised panel inside a door or drawer front
  function panel(g, x, y, w, h, col, raised) {
    const lt = shade(col, 0.22), dk = shade(col, -0.25);
    R(g, raised ? lt : dk, x, y, w, 0.5); R(g, raised ? lt : dk, x, y, 0.5, h);
    R(g, raised ? dk : lt, x, y + h - 0.5, w, 0.5); R(g, raised ? dk : lt, x + w - 0.5, y, 0.5, h);
  }
  function knob(g, x, y, big) { R(g, '#6a4a1a', x - 0.5, y - 0.5, big ? 2.5 : 2, big ? 2.5 : 2); R(g, '#e8c870', x, y, big ? 1.5 : 1, big ? 1.5 : 1); R(g, '#fff4c0', x, y, 0.5, 0.5); }
  function floorShadow(g, x, w) { R(g, sh(0.28), x - 0.5, BASE - 1, w + 1, 1.5); R(g, sh(0.14), x - 1.5, BASE + 0.5, w + 3, 1); R(g, sh(0.07), x - 2, BASE + 1.5, w + 4, 1); }
  function wallShadow(g, x, top, w) { R(g, sh(0.09), x + w, top + 2, 2, BASE - top - 2); R(g, sh(0.05), x + w + 2, top + 3, 1.5, BASE - top - 3); }

  function build(room, list) {
    room.draw = []; room.surf = []; room.cont = []; room.zones = [];
    const line = (x0, x1, y, clear, extra) => { const s = Object.assign({ t: 'line', x0, x1, y, clear }, extra || {}); room.surf.push(s); return s; };
    const cont = (o) => { o.lines = o.lines.map(l => line(o.x + 1, o.x + o.w - 1, l[0], l[1], { cont: o })); room.cont.push(o); return o; };
    const D = (z, fn) => room.draw.push({ z, fn });
    list.forEach(f => {
      const t = f.t, col = f.col || '#b5773f', r = ramp(col);
      if (t === 'window') {
        const { x, y, w, h } = f;
        line(x - 2, x + w + 2, y + h, f.clear || h - 4, { sill: 1 });
        D(0.2, g => drawWindow(g, room, f));
      } else if (t === 'shelf') {
        const { x, y, w } = f, glass = f.style === 'glass';
        line(x, x + w, y, f.clear || 18);
        D(1, g => {
          R(g, sh(0.14), x + 1, y + 2.5, w - 1, 1.5); R(g, sh(0.07), x + 1.5, y + 4, w - 2, 1);
          const bc = glass ? '#b8c4cc' : r[1];
          [x + 4, x + w - 6].forEach(bx => { R(g, shade(bc, -0.3), bx, y + 2, 2, 1); R(g, bc, bx, y + 2, 1.5, 5); R(g, bc, bx + 0.5, y + 2.5, 0.5, 5); for (let k = 0; k < 8; k++) R(g, bc, bx + 1.5, y + 2.5 + k * 0.5, Math.max(0.5, 3 - k * 0.5), 0.5); R(g, shade(bc, -0.4), bx, y + 7, 1.5, 0.5); });
          if (glass) { R(g, '#8fb4c4', x, y, w, 2); R(g, '#d8f0f8', x + 0.5, y, w - 1, 0.5); R(g, '#b4d8e4', x + 0.5, y + 0.5, w - 1, 1); R(g, '#6a8a98', x, y + 1.5, w, 0.5); }
          else { block(g, x, y, w, 2.5, col, { grain: 1, flat: 1 }); R(g, r[4], x + 0.5, y + 0.5, w - 1, 0.5); }
        });
      } else if (t === 'bed') {
        const { x, w } = f, fl = !!f.flip, X = (dx, dw) => fl ? x + w - dx - dw : x + dx;
        line(X(18, w - 21), X(18, w - 21) + w - 21, 104, 40, { bed: 1 });
        D(0.6, g => floorShadow(g, x, w));
        D(1, g => {
          const bc = f.bc, br = ramp(bc);
          // headboard + footboard
          const hx = X(0, 5), fx = X(w - 4, 4);
          block(g, hx, 82, 5, BASE - 82, col, { grain: 1, vert: 1 }); R(g, r[0], hx - 0.5, 80.5, 6, 2); R(g, r[3], hx, 81, 5, 0.5); R(g, r[4], hx + 1, 83, 0.5, 30);
          block(g, fx, 97, 4, BASE - 97, col, { grain: 1, vert: 1 }); R(g, r[0], fx - 0.5, 96, 5, 1.5); R(g, r[3], fx, 96.5, 4, 0.5);
          block(g, X(4, w - 8), 114, w - 8, 7, col, { grain: 1 });
          R(g, r[0], X(4, 2), 121, 2, BASE - 121); R(g, r[0], X(w - 7, 2), 121, 2, BASE - 121);
          // mattress and sheet
          R(g, '#cfc6b0', X(4, w - 8), 103.5, w - 8, 11); R(g, '#f1ece0', X(4.5, w - 9), 104, w - 9, 10); R(g, '#e0d8c4', X(4.5, w - 9), 112, w - 9, 2); dith2(g, '#e6dfcc', X(4.5, w - 9), 110.5, w - 9, 1.5);
          // pillow
          const px = X(5, 13); R(g, '#b8b09c', px, 97.5, 13, 8); R(g, '#fbf8f0', px + 0.5, 98, 12, 7); R(g, '#ffffff', px + 1.5, 98.5, 7, 1.5); R(g, '#e3dccb', px + 0.5, 103.5, 12, 1.5); R(g, '#d8d0bc', px + (fl ? 9 : 3), 100.5, 1, 2);
          // quilt
          const qx = X(17, w - 20), qw = w - 20;
          R(g, br[0], qx - 0.5, 103, qw + 1, 15.5); R(g, bc, qx, 103.5, qw, 14.5); R(g, br[3], qx, 103.5, qw, 1); R(g, br[4], qx, 103.5, qw, 0.5);
          R(g, br[1], qx, 115.5, qw, 2.5); dith2(g, br[1], qx, 114, qw, 1.5);
          for (let i = 0; i < qw - 2; i += 6) R(g, br[1], qx + 2 + i + (hash(i, w) % 3), 106 + (hash(w, i) % 6), 0.5, 3);
          const pat = f.pat || 'dots';
          if (pat === 'dots') for (let i = 0; i < qw - 4; i += 6) R(g, f.bp, qx + 3 + i, 107.5 + ((i / 6) % 2) * 3, 2, 1);
          if (pat === 'stars') for (let i = 0; i < qw - 5; i += 7) { const sy = 107 + ((i / 7) % 2) * 3.5, sx = qx + 3 + i; R(g, f.bp, sx + 0.5, sy - 0.5, 0.5, 2); R(g, f.bp, sx, sy, 1.5, 0.5); R(g, shade(f.bp, 0.5), sx + 0.5, sy, 0.5, 0.5); }
          if (pat === 'check') for (let yy = 105; yy < 115; yy += 3) for (let i = ((yy - 105) / 3 % 2) * 3; i < qw - 2; i += 6) { R(g, f.bp, qx + 1 + i, yy, 3, 3); }
          if (pat === 'stripe') for (let i = 2; i < qw - 1; i += 5) R(g, f.bp, qx + i, 104.5, 1.5, 13);
          if (pat === 'patch') for (let yy = 105; yy < 114; yy += 4.5) for (let i = 0; i < qw - 3; i += 6) R(g, [f.bp, shade(bc, 0.25), shade(f.bp, -0.2)][hash(i, yy) % 3], qx + 1 + i, yy, 5, 4);
          R(g, '#fbf6ea', X(14, 4), 103.5, 4, 3); R(g, '#e3dccb', X(14, 4), 106, 4, 0.5);
        });
      } else if (t === 'bookcase') {
        const { x, w, top } = f, metal = f.style === 'metal';
        line(x, x + w, top, f.topClear || 30);
        let prev = top + 2;
        f.lines.forEach(y => { line(x + 2, x + w - 2, y, y - prev - 1); prev = y + 2; });
        D(0.6, g => { floorShadow(g, x, w); if (!metal) wallShadow(g, x, top, w); });
        D(1, g => {
          if (metal) {
            const mc = col, mr = ramp(mc);
            [x, x + w - 2].forEach(px => { R(g, mr[0], px, top, 2, BASE - top); R(g, mc, px + 0.5, top, 1, BASE - top); R(g, mr[3], px + 0.5, top, 0.5, BASE - top); for (let yy = top + 3; yy < BASE; yy += 3) R(g, mr[0], px + 0.75, yy, 0.5, 0.5); });
            [top].concat(f.lines).forEach(y => { R(g, sh(0.12), x + 2, y + 2, w - 4, 1.5); R(g, mr[0], x, y, w, 2); R(g, mc, x + 0.5, y + 0.5, w - 1, 1); R(g, mr[4], x + 0.5, y + 0.5, w - 1, 0.5); });
            return;
          }
          const back = shade(col, -0.5);
          R(g, r[0], x, top, w, BASE - top); R(g, back, x + 2, top + 2, w - 4, BASE - top - 2);
          for (let xx = x + 6; xx < x + w - 3; xx += 6) R(g, shade(back, -0.2), xx, top + 2, 0.5, BASE - top - 2);
          let py = top + 2; f.lines.forEach(y => { R(g, sh(0.35), x + 2, py, w - 4, 1.5); R(g, sh(0.18), x + 2, py + 1.5, w - 4, 1.5); dith2(g, 'rgba(0,0,0,.12)', x + 2, py + 3, w - 4, 1); py = y + 2; });
          block(g, x, top, 2, BASE - top, col, { grain: 1, vert: 1 }); block(g, x + w - 2, top, 2, BASE - top, col, { grain: 1, vert: 1 });
          block(g, x - 0.5, top - 0.5, w + 1, 2.5, col, { grain: 1 }); R(g, r[4], x, top, w, 0.5);
          f.lines.forEach(y => { block(g, x + 1.5, y, w - 3, 2, col, { flat: 1 }); R(g, r[4], x + 2, y + 0.5, w - 4, 0.5); });
          R(g, r[1], x + 0.5, BASE - 1.5, w - 1, 1.5);
        });
      } else if (t === 'desk' || t === 'table') {
        const { x, w, top } = f, low = BASE - top < 20;
        line(x, x + w, top, f.clear || 40);
        let c = null;
        if (!f.nodrawer) { const dx = f.dside === 'l' ? x + 3 : f.dside === 'c' ? x + (w >> 1) - 10 : x + w - 23; c = cont({ t: 'drawer', x: dx, y: top + 3, w: 20, h: 9, col, lines: [[top + 10, 9]] }); }
        if (f.shelf) line(x + 3, x + w - 3, f.shelf, f.shelf - top - 6);
        D(0.6, g => floorShadow(g, x, w));
        D(1, g => {
          const lw = low ? 2 : 2.5;
          block(g, x + 1, top + 2, lw, BASE - top - 2, col, { grain: 1, vert: 1 }); block(g, x + w - 1 - lw, top + 2, lw, BASE - top - 2, col, { grain: 1, vert: 1 });
          if (f.shelf) { block(g, x + 2, f.shelf, w - 4, 2, col, { flat: 1 }); R(g, r[4], x + 2.5, f.shelf + 0.5, w - 5, 0.5); }
          else if (t === 'table') block(g, x + 3, BASE - 8, w - 6, 1.5, col, { flat: 1 });
          block(g, x + 1, top + 2.5, w - 2, 2, shade(col, -0.12), { flat: 1 });
          if (c) { R(g, r[0], c.x - 1, top + 3, c.w + 2, c.h + 1); }
          block(g, x - 0.5, top, w + 1, 3, col, { grain: 1 }); R(g, r[4], x, top + 0.5, w, 0.5);
        });
      } else if (t === 'nightstand') {
        const { x, w, top } = f;
        line(x, x + w, top, 40);
        cont({ t: 'drawer', x: x + 2, y: top + 3, w: w - 4, h: 7, col, lines: [[top + 9, 6]] });
        const cy = BASE - 3; line(x + 2, x + w - 2, cy, cy - top - 12);
        D(0.6, g => floorShadow(g, x, w));
        D(1, g => {
          block(g, x, top, w, BASE - top, col, { grain: 1, vert: 1 });
          R(g, r[0], x + 1.5, top + 11, w - 3, cy - top - 10.5); R(g, shade(col, -0.5), x + 2, top + 11.5, w - 4, cy - top - 11.5); R(g, sh(0.3), x + 2, top + 11.5, w - 4, 1.5);
          block(g, x + 1.5, cy, w - 3, 1.5, col, { flat: 1 });
          block(g, x - 0.5, top, w + 1, 2.5, col, { grain: 1 }); R(g, r[4], x, top + 0.5, w, 0.5);
          R(g, r[0], x + 1, BASE - 1, 2, 1); R(g, r[0], x + w - 3, BASE - 1, 2, 1);
        });
      } else if (t === 'dresser') {
        const { x, w, top } = f, n = f.n || 2, dh = Math.floor((BASE - top - 4 - (n - 1)) / n);
        line(x, x + w, top, 40);
        for (let i = 0; i < n; i++) { const y = top + 3 + i * (dh + 1); cont({ t: 'drawer', x: x + 2, y, w: w - 4, h: dh, col, lines: [[y + dh - 2, Math.min(dh, 11)]] }); }
        D(0.6, g => { floorShadow(g, x, w); wallShadow(g, x, top, w); });
        D(1, g => { block(g, x, top, w, BASE - top, shade(col, -0.18), { grain: 1, vert: 1 }); block(g, x - 1, top, w + 2, 3, col, { grain: 1 }); R(g, r[4], x - 0.5, top + 0.5, w + 1, 0.5); R(g, r[0], x + 1, BASE - 2, 2, 2); R(g, r[0], x + w - 3, BASE - 2, 2, 2); });
      } else if (t === 'cabinet') {
        // counter / vanity / tv stand / toy chest / closet / upper cabinet with doors and optional sink
        const { x, w, top } = f, bot = f.bot || BASE;
        if (f.counter) { if (f.sink) { line(x, f.sink[0], top, 40); line(f.sink[0] + f.sink[1], x + w, top, 40); } else line(x, x + w, top, f.clearTop || 40); }
        f.doors.forEach(([dx, dw]) => cont({ t: 'door', x: x + dx, y: top + 3, w: dw, h: bot - top - 5, col: f.door || col, hinge: dx < w / 2 ? 'l' : 'r', mirror: f.mirror, lit: f.lit, painted: f.painted, lines: f.lines }));
        if (bot === BASE) D(0.6, g => { floorShadow(g, x, w); if (top < 80) wallShadow(g, x, top, w); });
        else D(0.6, g => { R(g, sh(0.12), x + 1, bot, w, 2); R(g, sh(0.06), x + 1.5, bot + 2, w - 1, 1.5); });
        D(1, g => {
          block(g, x, top, w, bot - top, shade(col, -0.1), { grain: !f.painted, vert: 1 });
          if (f.counter) { const tc = f.tc || col, tr = ramp(tc); R(g, tr[0], x - 1, top - 0.5, w + 2, 4); R(g, tc, x - 0.5, top, w + 1, 3); R(g, tr[3], x - 0.5, top, w + 1, 0.5); R(g, tr[1], x - 0.5, top + 2.5, w + 1, 0.5); if (f.speck) for (let k = 0; k < w; k += 2) R(g, tr[hash(k, top) % 2 ? 1 : 3], x + k + (hash(top, k) % 2) * 0.5, top + 1 + (hash(k, 3) % 2) * 0.5, 0.5, 0.5); }
          else { R(g, r[3], x, top, w, 0.5); R(g, r[1], x, bot - 1, w, 1); }
          if (bot === BASE) { R(g, shade(col, -0.45), x + 1, BASE - 2.5, w - 2, 2.5); }
          if (f.deco === 'chest') { const dy = bot - 5; R(g, shade(col, -0.3), x + 1, dy, w - 2, 0.5); ['#d0483a', '#f4cf55', '#4f7fd0', '#62a84e'].forEach((c2, k) => { if (x + 3 + k * 7 < x + w - 5) { R(g, c2, x + 3 + k * 7, top + 0.5, 5, 1.5); } }); }
          if (f.sink) { const sx = f.sink[0], sw = f.sink[1]; R(g, '#6a7278', sx, top, sw, 2.5); R(g, '#c8ced4', sx + 0.5, top + 0.5, sw - 1, 1.5); R(g, '#9aa2aa', sx + 1, top + 1, sw - 2, 1); const fx = sx + (sw >> 1) - 1; R(g, '#5a6268', fx - 0.5, top - 7.5, 3, 7.5); R(g, '#c8ced4', fx, top - 7, 2, 7); R(g, '#f0f4f8', fx, top - 7, 0.5, 7); R(g, '#5a6268', fx, top - 8, 5.5, 2.5); R(g, '#c8ced4', fx + 0.5, top - 7.5, 4.5, 1); R(g, '#f0f4f8', fx + 0.5, top - 7.5, 4, 0.5); R(g, '#5a6268', fx - 3, top - 3, 2, 3); R(g, '#e0e6ea', fx - 2.5, top - 2.5, 1, 1); }
        });
      } else if (t === 'stove') {
        const { x, w, top } = f;
        line(x, x + w, top, 40);
        D(0.6, g => floorShadow(g, x, w));
        D(1, g => {
          block(g, x, top, w, BASE - top, '#ece8e0'); R(g, '#9a968e', x, top - 8, w, 8.5); R(g, '#d8d4cc', x + 0.5, top - 7.5, w - 1, 7); R(g, '#bdb7ab', x + 0.5, top - 2, w - 1, 1.5);
          [4, 9, w - 9, w - 4].forEach(k => { R(g, '#4a4640', x + k - 1, top - 5.5, 2.5, 2.5); R(g, '#9a968e', x + k - 0.5, top - 5, 1, 1); });
          R(g, '#26262e', x, top, w, 3); R(g, '#4a4640', x + 0.5, top + 0.5, w - 1, 0.5); R(g, '#7a746a', x + 3, top + 0.5, 6, 1); R(g, '#7a746a', x + w - 9, top + 0.5, 6, 1);
          R(g, '#4a4640', x + 3, top + 7, w - 6, 16); R(g, '#2a2a30', x + 4, top + 8, w - 8, 14); R(g, '#3e3e4a', x + 5, top + 9, w - 10, 2); R(g, 'rgba(255,255,255,.18)', x + 5, top + 9, 3, 12); R(g, '#bdb7ab', x + 3, top + 5.5, w - 6, 1); R(g, '#f0ece4', x + 3, top + 5.5, w - 6, 0.5);
          R(g, '#4a4640', x + 1, BASE - 2.5, w - 2, 2.5);
        });
      } else if (t === 'fridge') {
        const { x, w, top } = f, split = top + 24;
        line(x, x + w, top, f.clear || 36);
        cont({ t: 'door', x: x + 1, y: split + 2, w: w - 2, h: BASE - split - 5, col: '#f4f0e8', hinge: 'r', lit: 1, fridge: 1, lines: [[split + 18, 14], [split + 34, 14], [BASE - 5, 13]] });
        D(0.6, g => { floorShadow(g, x, w); wallShadow(g, x, top, w); });
        D(1, g => {
          R(g, '#8a867e', x, top, w, BASE - top); R(g, '#f4f0e8', x + 0.5, top + 0.5, w - 1, BASE - top - 1); R(g, '#ffffff', x + 1, top + 1, w - 2, 0.5); R(g, '#d8d4cc', x + w - 2, top + 1, 1.5, BASE - top - 2);
          R(g, '#b8b4ac', x + 0.5, split, w - 1, 1.5); R(g, '#9aa2aa', x + 2, top + 6, 1.5, 14); R(g, '#e0e6ea', x + 2, top + 6, 0.5, 14);
          R(g, '#d0483a', x + 6, top + 8, 3, 3); R(g, '#f4cf55', x + 11, top + 12, 3, 2); R(g, '#fbf6ea', x + 16, top + 7, 5, 6); R(g, '#4f7fd0', x + 17, top + 8, 3, 1); R(g, '#bdb7ab', x + 17, top + 10, 3, 0.5);
          R(g, '#4a4640', x + 1, BASE - 2, w - 2, 2);
        });
      } else if (t === 'tub') {
        const { x, w, top } = f;
        line(x + 2, x + w - 2, top, 30);
        D(0.6, g => floorShadow(g, x, w));
        D(1, g => {
          if (f.curtain) { const cc = f.curtain; R(g, '#9aa2aa', x - 1, 30, w + 2, 1); R(g, '#e0e6ea', x - 1, 30, w + 2, 0.5); for (let k = 0; k < 12; k += 1.5) R(g, k % 3 ? cc : shade(cc, -0.2), x + w - 14 + k, 31, 1.5, top - 33); R(g, shade(cc, -0.35), x + w - 14, 31, 0.5, top - 33); for (let k = 0; k < 12; k += 3) R(g, '#fbf6ea', x + w - 13 + k, 36, 1, top - 42); }
          R(g, '#9a968e', x, top, w, BASE - top); R(g, '#fbf8f0', x + 0.5, top + 0.5, w - 1, BASE - top - 2); R(g, '#ffffff', x + 1, top + 0.5, w - 2, 1); R(g, '#e3e0d6', x + 1, top + 2, w - 2, 1);
          dith2(g, '#e8e4da', x + 1, BASE - 8, w - 2, 3); R(g, '#e3e0d6', x + 1, BASE - 5, w - 2, 3);
          R(g, '#5a6268', x + 4, top - 12.5, 2.5, 12.5); R(g, '#c8ced4', x + 4.5, top - 12, 1.5, 12); R(g, '#5a6268', x + 4, top - 13, 7, 2.5); R(g, '#c8ced4', x + 4.5, top - 12.5, 6, 1.5); R(g, '#f0f4f8', x + 4.5, top - 12.5, 6, 0.5);
          R(g, '#9a968e', x + 3, BASE - 2, 3, 2); R(g, '#9a968e', x + w - 6, BASE - 2, 3, 2);
        });
      } else if (t === 'toilet') {
        const { x } = f;
        line(x, x + 20, 96, 30);
        D(0.6, g => floorShadow(g, x + 4, 12));
        D(1, g => {
          const p = '#fbf8f0', o = '#9a968e', s2 = '#e3e0d6';
          R(g, o, x, 96, 20, 12); R(g, p, x + 0.5, 96.5, 19, 11); R(g, '#ffffff', x + 1, 96.5, 18, 1); R(g, s2, x + 0.5, 105, 19, 2.5); R(g, '#c8ced4', x + 14, 99, 3, 1); R(g, '#9aa2aa', x + 14, 100, 3, 0.5);
          R(g, o, x - 2, 108, 24, 3); R(g, p, x - 1.5, 108.5, 23, 2); R(g, '#ffffff', x - 1, 108.5, 22, 0.5);
          R(g, o, x - 1, 111, 22, 7); R(g, p, x - 0.5, 111, 21, 6.5); R(g, s2, x - 0.5, 115.5, 21, 2);
          R(g, o, x + 2, 118, 16, 2); R(g, p, x + 2.5, 118, 15, 1.5);
          R(g, o, x + 5, 120, 10, 6); R(g, '#f1ede4', x + 5.5, 120, 9, 5.5); R(g, s2, x + 12, 120, 2.5, 5.5);
        });
      } else if (t === 'door') {
        D(0.3, g => {
          const { x } = f, dc = f.col || '#c98b52', dr = ramp(dc);
          R(g, sh(0.2), x - 3, 43, 30, WALL - 43);
          block(g, x - 2.5, 43.5, 29, WALL - 43.5, f.casing || '#fbf6ea', { flat: 1 });
          R(g, dr[0], x - 0.5, 45.5, 25, WALL - 45.5); block(g, x, 46, 24, WALL - 46, dc, { grain: 1, vert: 1 });
          [[3, 50, 18, 24], [3, 78, 18, 30]].forEach(([dx, y, w, h]) => { R(g, dr[1], x + dx, y, w, h); R(g, dc, x + dx + 1, y + 1, w - 2, h - 2); grain(g, x + dx + 1, y + 1, w - 2, h - 2, dc, 1); panel(g, x + dx, y, w, h, dc, 0); panel(g, x + dx + 1, y + 1, w - 2, h - 2, dc, 1); });
          R(g, '#8a6a2a', x + 18.5, 77, 3, 3); R(g, '#f4cf55', x + 19, 77.5, 2, 2); R(g, '#fff4c0', x + 19, 77.5, 0.5, 0.5);
        });
      } else if (t === 'bench') {
        const { x, w, top } = f;
        line(x, x + w, top, f.clear || 36); line(x + 2, x + w - 2, 122, 8);
        D(0.6, g => floorShadow(g, x, w));
        D(1, g => { block(g, x + 1, top, 2, BASE - top, col, { vert: 1, grain: 1 }); block(g, x + w - 3, top, 2, BASE - top, col, { vert: 1, grain: 1 }); block(g, x + 2, 122, w - 4, 2, col, { flat: 1 }); block(g, x - 0.5, top, w + 1, 3, col, { grain: 1 }); R(g, r[4], x, top + 0.5, w, 0.5); });
      } else if (t === 'hooks') {
        const { x, y, w } = f;
        line(x + 2, x + w - 2, y + 2, f.clear || 30, { hang: 1 });
        D(1, g => { R(g, sh(0.14), x + 1, y + 3, w, 1.5); block(g, x, y - 1, w, 3.5, col, { grain: 1, flat: 1 }); for (let hx = x + 4; hx < x + w - 2; hx += 7) { R(g, '#4a4640', hx - 0.5, y + 0.5, 2, 2.5); R(g, '#c8a868', hx, y + 0.5, 1, 2); R(g, '#f4e4a0', hx, y + 0.5, 0.5, 1); } });
      } else if (t === 'bar') {
        const { x, y, w } = f;
        line(x + 2, x + w - 2, y + 0.5, f.clear || 30, { hang: 1 });
        D(1, g => { R(g, sh(0.12), x + 1, y + 1.5, w, 1); R(g, '#5a6268', x, y - 1, 2, 3); R(g, '#5a6268', x + w - 2, y - 1, 2, 3); R(g, '#6a7278', x + 1, y - 0.5, w - 2, 1.5); R(g, '#d8dee2', x + 1, y - 0.5, w - 2, 0.5); R(g, '#f8fafc', x + 3, y - 0.5, 4, 0.5); });
      } else if (t === 'peg') {
        const { x, y, w, h } = f;
        f.rails.forEach(ry => line(x + 3, x + w - 3, ry, f.clear || 22, { hang: 1 }));
        D(0.5, g => { R(g, sh(0.18), x + 1, y + 1, w, h); block(g, x, y, w, h, '#c8a878', { flat: 1 }); for (let yy = y + 2; yy < y + h - 1; yy += 3) for (let xx = x + 2; xx < x + w - 1; xx += 3) R(g, '#8a6a48', xx, yy, 0.5, 0.5); f.rails.forEach(ry => { for (let hx = x + 5; hx < x + w - 3; hx += 8) { R(g, '#5a6268', hx, ry - 1, 0.5, 2); R(g, '#c8ced4', hx + 0.5, ry, 1, 0.5); } }); });
      } else if (t === 'sofa') {
        const { x, w } = f, sc = col, sr = ramp(sc), seat = 106;
        line(x + 7, x + w - 7, seat, f.clear || 34, { sofa: 1 });
        D(0.6, g => floorShadow(g, x, w));
        D(1, g => {
          // back
          R(g, sr[0], x + 4.5, 83.5, w - 9, 23); R(g, sc, x + 5, 84, w - 10, 22); R(g, sr[3], x + 5, 84, w - 10, 1.5); R(g, sr[4], x + 6, 84, w - 12, 0.5);
          const nb = Math.max(2, Math.round((w - 14) / 26)), bw = (w - 14) / nb;
          for (let k = 1; k < nb; k++) R(g, sr[1], x + 7 + k * bw, 85, 0.5, 20);
          dith2(g, sr[1], x + 5, 103, w - 10, 1.5);
          // seat cushions
          for (let k = 0; k < nb; k++) { const cx = x + 7 + k * bw; R(g, sr[0], cx, seat - 0.5, bw, 7); R(g, sc, cx + 0.5, seat, bw - 1, 6); R(g, sr[3], cx + 0.5, seat, bw - 1, 1); R(g, sr[1], cx + 0.5, seat + 4.5, bw - 1, 1.5); }
          // skirt
          R(g, sr[0], x + 3, seat + 6, w - 6, 13); R(g, sr[1], x + 3.5, seat + 6.5, w - 7, 12); dith2(g, shade(sc, -0.35), x + 3.5, seat + 16, w - 7, 1.5);
          // arms
          [x, x + w - 7].forEach(ax => { R(g, sr[0], ax, 95.5, 7, BASE - 95.5 - 2); R(g, sc, ax + 0.5, 96, 6, BASE - 96 - 2.5); R(g, sr[3], ax + 1, 96, 5, 1.5); R(g, sr[4], ax + 1.5, 96, 3, 0.5); R(g, sr[1], ax + (ax === x ? 5 : 0.5), 97, 1, BASE - 100); });
          if (f.pat === 'plaid') { for (let yy = 86; yy < BASE - 3; yy += 4) R(g, shade(sc, -0.15), x + 1, yy, w - 2, 0.5); for (let xx = x + 3; xx < x + w - 2; xx += 4) R(g, 'rgba(255,240,200,.18)', xx, 84, 0.5, BASE - 87); }
          R(g, sr[0], x + 2, BASE - 2, 2, 2); R(g, sr[0], x + w - 4, BASE - 2, 2, 2);
        });
      } else if (t === 'chair') {
        const { x } = f, cw = f.w || 14, seat = f.seat || 108;
        line(x + 1, x + cw - 1, seat, 24);
        D(0.6, g => floorShadow(g, x + 1, cw - 2));
        D(1, g => { block(g, x + 1, seat - 22, 2, 22, col, { vert: 1 }); block(g, x + cw - 3, seat - 22, 2, 22, col, { vert: 1 }); block(g, x + 1, seat - 22, cw - 2, 3, col, { grain: 1 }); block(g, x + 3, seat - 15, cw - 6, 1.5, col, { flat: 1 }); block(g, x + 1, seat + 2, 2, BASE - seat - 2, col, { vert: 1 }); block(g, x + cw - 3, seat + 2, 2, BASE - seat - 2, col, { vert: 1 }); block(g, x, seat, cw, 2.5, col, { grain: 1 }); R(g, r[4], x + 0.5, seat + 0.5, cw - 1, 0.5); });
      } else if (t === 'console') {
        // a big wooden console TV (1985 family room)
        const { x, w, top } = f;
        line(x, x + w, top, 30);
        D(0.6, g => { floorShadow(g, x, w); wallShadow(g, x, top, w); });
        D(1, g => {
          block(g, x, top, w, BASE - top - 3, col, { grain: 1 }); block(g, x - 1, top - 0.5, w + 2, 2.5, col, { grain: 1 }); R(g, r[4], x - 0.5, top, w + 1, 0.5);
          const sx = x + 3, sy = top + 4, sw = w - 14, sh2 = BASE - top - 14;
          R(g, '#1a1a20', sx - 0.5, sy - 0.5, sw + 1, sh2 + 1); R(g, '#3a4a44', sx + 0.5, sy + 0.5, sw - 1, sh2 - 1); R(g, '#4a5a54', sx + 1.5, sy + 1.5, sw - 3, sh2 - 3); R(g, 'rgba(255,255,255,.2)', sx + 2, sy + 2, 3, sh2 - 6); R(g, 'rgba(255,255,255,.12)', sx + 5.5, sy + 2, 1.5, sh2 - 7);
          const gx = x + w - 9; R(g, r[0], gx, sy, 7, sh2); R(g, '#8a6a48', gx + 0.5, sy + 0.5, 6, sh2 - 1); for (let yy = sy + 1; yy < sy + sh2 - 1; yy += 1) R(g, '#6a4a30', gx + 0.5 + (yy % 2) * 0.5, yy, 6, 0.5);
          knob(g, gx + 2, sy + sh2 + 1.5, 1); knob(g, gx + 5, sy + sh2 + 1.5, 1);
          R(g, r[0], x + 1, BASE - 3, 2, 3); R(g, r[0], x + w - 3, BASE - 3, 2, 3);
        });
      } else if (t === 'rug') {
        D(0.4, g => {
          const rc = f.col, rr = ramp(rc), x = f.x, w = f.w, y = f.y || 122, h = f.h || 12;
          R(g, sh(0.18), x, y + h, w, 1); R(g, rr[1], x - 0.5, y - 0.5, w + 1, h + 1); R(g, rc, x, y, w, h);
          R(g, f.acc || rr[3], x + 2, y + 1.5, w - 4, h - 3); R(g, rc, x + 3, y + 2.5, w - 6, h - 5); dith2(g, rr[3], x + 3, y + 2.5, w - 6, h - 5);
          R(g, f.acc || rr[4], x + w / 2 - 5, y + h / 2 - 1, 10, 2); R(g, f.acc || rr[4], x + w / 2 - 2, y + h / 2 - 2.5, 4, 5);
          for (let i = 0; i < w; i += 1.5) { R(g, '#f1e6cc', x + i, y + h, 0.5, 1.5); R(g, '#f1e6cc', x + i, y - 1.5, 0.5, 1); }
        });
      }
    });
  }

  function drawWindow(g, room, f) {
    const { x, y, w, h } = f, th = room.theme;
    // sky with dithered bands
    const bands = th.night ? ['#1c2448', '#243058', '#2c3a68', '#364478', '#404e84'] : ['#7fb6e4', '#8fc2ea', '#a2cdef', '#b8daf3', '#cfe7f6'];
    for (let i = 0; i < h; i++) { const b = i / h * 5, k = Math.min(4, Math.floor(b)); R(g, bands[k], x, y + i, w, 1); if (k < 4 && b - k > 0.6) dith(g, bands[k + 1], x, y + i, w, 1, i); }
    const cl = (cx, cy, s) => { R(g, '#e8eef4', cx, cy + 1, 7 * s, 2); R(g, '#ffffff', cx + 1, cy, 5 * s, 2); R(g, '#ffffff', cx + 2 * s, cy - 1, 3 * s, 1); R(g, '#d4dee8', cx + 1, cy + 2.5, 6 * s, 0.5); };
    cl(x + 3, y + 5, 1); cl(x + w - 13, y + 9, 1.1);
    const hz = y + h - 8;
    if (th.out === 'tree') {
      R(g, '#7fb069', x, hz, w, 8); dith(g, '#6aa058', x, hz + 4, w, 4);
      R(g, '#5a3a1a', x + w - 8, hz - 2, 2, 8); g.fillStyle = '#3f7a3a'; g.beginPath(); g.ellipse(x + w - 7, y + h - 18, 8, 7, 0, 0, 7); g.fill(); g.fillStyle = '#4f8a3f'; g.beginPath(); g.ellipse(x + w - 8, y + h - 20, 5.5, 4.5, 0, 0, 7); g.fill(); dith2(g, '#6aa058', x + w - 12, y + h - 23, 6, 3);
      R(g, '#fbf6ea', x, hz + 3, w, 1); for (let i = 0; i < w; i += 3) R(g, '#fbf6ea', x + i, hz + 1, 1, 5);
    } else if (th.out === 'houses') {
      R(g, '#7fb069', x, hz + 2, w, 6); dith(g, '#6aa058', x, hz + 5, w, 3);
      [[3, '#e6c48a', '#a2463c'], [20, '#d9d0bc', '#4a5a7a']].forEach(([dx, wc, rc]) => { block(g, x + dx, hz - 6, 13, 10, wc, { flat: 1 }); for (let k = 0; k < 4; k++) R(g, rc, x + dx - 1 + k, hz - 10 + k, 15 - k * 2, 1); R(g, '#8cc2ea', x + dx + 3, hz - 3, 3, 3); R(g, '#fbf6ea', x + dx + 3, hz - 3, 3, 0.5); R(g, '#6a4222', x + dx + 8, hz - 2, 2, 6); });
    } else if (th.out === 'trees') {
      R(g, '#7fb069', x, hz + 2, w, 6); dith(g, '#6aa058', x, hz + 5, w, 3);
      [[2, 12], [12, 16], [22, 11]].forEach(([dx, hh]) => { g.fillStyle = '#2f6a2e'; g.beginPath(); g.ellipse(x + dx + 4, hz + 2 - hh / 2, 5, hh / 2 + 1, 0, 0, 7); g.fill(); g.fillStyle = '#4f8a3f'; g.beginPath(); g.ellipse(x + dx + 3, hz + 1 - hh / 2 - 1, 3, hh / 2 - 1, 0, 0, 7); g.fill(); R(g, '#5a3a1a', x + dx + 3.5, hz + 1, 1, 2); });
    } else if (th.out === 'city') {
      [[0, 14, '#9aa8b8'], [7, 20, '#8a98a8'], [15, 12, '#a8b4c2'], [22, 24, '#7c8a9c'], [29, 16, '#9aa8b8']].forEach(([dx, hh, c]) => { if (dx < w) { const bw = Math.min(8, w - dx); block(g, x + dx, y + h - hh, bw, hh, c, { flat: 1 }); for (let j = y + h - hh + 2; j < y + h - 1; j += 3) for (let q = 2; q < bw - 1; q += 3) R(g, hash(dx + q, j) % 3 ? '#c8d4e0' : '#f4e4a0', x + dx + q, j, 1, 1); } });
    } else if (th.out === 'yard') {
      R(g, '#7fb069', x, hz - 2, w, 10); dith(g, '#6aa058', x, hz + 3, w, 5);
      R(g, '#d8c8a0', x, hz + 1, w, 1); for (let i = 1; i < w; i += 4) R(g, '#e8dcc0', x + i, hz - 3, 1.5, 5);
      R(g, '#d0483a', x + 5, hz - 7, 6, 5); R(g, '#9aa2aa', x + 7, hz - 2, 1, 3);
    } else if (th.out === 'ground') {
      R(g, '#6aa058', x, y + h - 10, w, 10); for (let i = 0; i < w; i += 2) R(g, '#4f8a3f', x + i, y + h - 12 + (hash(i, 7) % 3), 1, 3); R(g, '#8a6a48', x, y + h - 3, w, 3);
    }
    // glass reflections
    g.fillStyle = 'rgba(255,255,255,.22)'; g.beginPath(); g.moveTo(x + 2, y + h); g.lineTo(x + 8, y); g.lineTo(x + 11, y); g.lineTo(x + 5, y + h); g.fill();
    g.fillStyle = 'rgba(255,255,255,.14)'; g.beginPath(); g.moveTo(x + w / 2 + 2, y + h); g.lineTo(x + w / 2 + 7, y); g.lineTo(x + w / 2 + 8.5, y); g.lineTo(x + w / 2 + 3.5, y + h); g.fill();
    // frame with bevel
    const fr = th.frame || '#fbf6ea', fo = shade(fr, -0.45), fd = shade(fr, -0.14);
    R(g, fo, x - 2.5, y - 2.5, w + 5, 2.5); R(g, fo, x - 2.5, y, 2.5, h); R(g, fo, x + w, y, 2.5, h);
    R(g, fr, x - 2, y - 2, w + 4, 2); R(g, fr, x - 2, y, 2, h); R(g, fr, x + w, y, 2, h); R(g, fd, x - 0.5, y - 0.5, w + 1, 0.5); R(g, fd, x - 0.5, y, 0.5, h);
    R(g, fo, x + (w >> 1) - 1.5, y, 3, h); R(g, fr, x + (w >> 1) - 1, y, 2, h); R(g, fd, x + (w >> 1) + 0.5, y, 0.5, h);
    R(g, fo, x, y + (h >> 1) - 1.5, w, 3); R(g, fr, x, y + (h >> 1) - 1, w, 2); R(g, fd, x, y + (h >> 1) + 0.5, w, 0.5);
    if (th.blinds) { for (let yy = y; yy < y + h * 0.35; yy += 1.5) { R(g, '#e8e0cc', x, yy, w, 1); R(g, '#c8bca0', x, yy + 1, w, 0.5); } R(g, '#9a8c70', x + 4, y, 0.5, h * 0.35 + 2); }
    // sill
    R(g, fo, x - 3.5, y + h - 0.5, w + 7, 4); R(g, fr, x - 3, y + h, w + 6, 3); R(g, '#ffffff', x - 3, y + h, w + 6, 0.5); R(g, fd, x - 3, y + h + 2, w + 6, 1);
    R(g, sh(0.16), x - 2, y + h + 3.5, w + 4, 1); R(g, sh(0.08), x - 1, y + h + 4.5, w + 2, 1);
    // curtains
    if (th.curtain) {
      const c = th.curtain, cr = ramp(c);
      R(g, '#3a2616', x - 10, y - 5.5, w + 20, 2.5); R(g, '#8a5a32', x - 10, y - 5, w + 20, 1); R(g, '#4a3020', x - 11.5, y - 6, 2.5, 3.5); R(g, '#4a3020', x + w + 9, y - 6, 2.5, 3.5);
      for (const cx of [x - 9, x + w + 2]) {
        R(g, cr[0], cx - 0.5, y - 3, 8, h + 7); R(g, c, cx, y - 3, 7, h + 6.5);
        for (let i = 0; i < 7; i += 2.5) { R(g, cr[1], cx + i + 1.5, y - 3, 1, h + 6.5); R(g, cr[3], cx + i + 0.5, y - 3, 0.5, h + 6.5); }
        if (th.cpat) for (let yy = y; yy < y + h; yy += 4) R(g, th.cpat, cx + 1 + (yy % 8 ? 3 : 0), yy, 1.5, 1.5);
        R(g, cr[1], cx, y + (h * 0.62), 7, 1.5); R(g, shade(c, -0.4), cx, y + (h * 0.62) + 1.5, 7, 0.5);
        for (let i = 0; i < 7; i += 1.5) R(g, cr[3], cx + i, y + h + 3, 0.5, 0.5);
      }
    }
  }

  /* ---------- the four moves ---------- */
  function mkLevel(def) {
    const L = { id: def.id, year: def.year, age: def.age, title: def.title, sub: def.sub, cap: def.cap, rooms: [], surfs: [], conts: [], items: [], boxes: [] };
    def.rooms.forEach((rd, ri) => {
      const room = { name: rd.name, short: rd.short || rd.name, label: rd.label || rd.name.toUpperCase(), theme: rd.theme, ri };
      build(room, rd.furn);
      room.pile = { x0: rd.pile[0], x1: rd.pile[1] };
      // floor: left, under the box pile (usable once the boxes are gone), right
      const p = room.pile;
      room.surf.push({ t: 'line', x0: 3, x1: p.x0 - 1, y: FLOOR, clear: 100, floor: 1 });
      room.surf.push({ t: 'line', x0: p.x0, x1: p.x1, y: FLOOR, clear: 100, floor: 1, under: 1 });
      room.surf.push({ t: 'line', x0: p.x1 + 1, x1: VW - 3, y: FLOOR, clear: 100, floor: 1 });
      rd.zones.forEach(([x0, y0, x1, y1]) => room.surf.push({ t: 'wall', x0, y0, x1, y1 }));
      room.surf.forEach(s => { s.r = ri; s.i = L.surfs.length; L.surfs.push(s); });
      room.cont.forEach(c => { c.r = ri; c.i = L.conts.length; L.conts.push(c); });
      room.draw.sort((q, w) => q.z - w.z);
      // boxes: first row on the floor, then stacked on top
      const nb = rd.boxes.length, perRow = Math.max(1, Math.round((p.x1 - p.x0) / 25)), first = L.boxes.length;
      rd.boxes.forEach((items, bi) => {
        const lvl = Math.floor(bi / perRow), col = bi % perRow, inRow = Math.min(perRow, nb - lvl * perRow), under = lvl ? first + (lvl - 1) * perRow + col : -1;
        const bx = lvl ? L.boxes[under].x + 2 : Math.round((p.x0 + p.x1 - (inRow * 25 - 1)) / 2) + col * 25;
        const b = { r: ri, x: bx, y: FLOOR - 18 * lvl, w: 24, h: 18, under, items: [], tint: (hash(bi, ri + def.id * 7) % 3), label: room.label };
        items.forEach(e => { b.items.push(L.items.length); L.items.push(Object.assign({}, e, { box: L.boxes.length })); });
        L.boxes.push(b);
      });
      L.rooms.push(room);
    });
    return L;
  }
  const TH = {
    bed85: { wall: '#f3e2b0', pat: 'flowers', patc: '#e2b86e', acc: '#e07a5f', trim: '#fff4dc', floor: '#b0764a', fpat: 'shag', curtain: '#e07a5f', cpat: '#f4cf55', out: 'tree' },
    bath85: { wall: '#f8e4e4', pat: 'tile', patc: '#eab8c0', tileTop: 56, trim: '#fbf6ea', floor: '#efe6d8', floor2: '#d8c0b8', fpat: 'tile', out: 'tree' },
    play85: { wall: '#9a6a42', pat: 'panel', patc: '#7a4e2e', trim: '#6a4222', floor: '#c8923a', fpat: 'shag', curtain: '#c8a040', out: 'yard' },
    bed90: { wall: '#c4e3d6', pat: 'stripe', patc: '#b0d6c6', border: '#8a74c8', trim: '#fbf6ea', floor: '#d6bd93', fpat: 'carpet', curtain: '#8a74c8', out: 'houses' },
    bath90: { wall: '#e4eef8', pat: 'tile', patc: '#b0c8e4', tileTop: 50, trim: '#fbf6ea', floor: '#f0f0ea', floor2: '#a8bcd4', fpat: 'check', out: 'houses' },
    kit90: { wall: '#f6e8b8', pat: 'gingham', patc: '#eed89a', splash: '#e8dcc4', splashX: 114, trim: '#fbf6ea', floor: '#efe6d0', floor2: '#b85a4a', fpat: 'check', curtain: '#d0483a', cpat: '#fbf6ea', out: 'houses' },
    gar90: { wall: '#bcb8b0', pat: 'block', patc: '#a8a49c', trim: '#8a867e', floor: '#a4a09a', fpat: 'concrete', out: 'yard', frame: '#d8d4cc' },
    bed95: { wall: '#c3cc9e', pat: 'sponge', patc: '#b2bd8c', border: '#3d5a80', trim: '#efe6cc', floor: '#b98652', fpat: 'plank', curtain: '#3d5a80', out: 'trees' },
    bath95: { wall: '#e4f2ee', pat: 'tile', patc: '#8ccabc', tileTop: 54, trim: '#fbf6ea', floor: '#e8e8e0', floor2: '#9cc8bc', fpat: 'tile', out: 'trees' },
    rec95: { wall: '#a87448', pat: 'panel', patc: '#8a5a36', trim: '#5a3a1a', floor: '#6e7c8c', fpat: 'carpet', out: 'ground', frame: '#e8e0cc' },
    hall95: { wall: '#efe3c8', pat: 'wainscot', patc: '#c9a878', trim: '#efe6cc', floor: '#b98652', fpat: 'plank', out: 'trees' },
    liv00: { wall: '#f2e7d6', pat: 'plain', patc: '#e8dcc8', trim: '#fbf6ea', floor: '#d4a86a', fpat: 'plank', curtain: '#e8b04a', out: 'city' },
    bed00: { wall: '#dde3ee', pat: 'plain', patc: '#d0d8e6', trim: '#fbf6ea', floor: '#c8bca8', fpat: 'carpet', curtain: '#6a8ab0', blinds: 1, out: 'city' },
    kit00: { wall: '#f4ecd8', pat: 'splash', patc: '#cfe2e4', splashX: 126, trim: '#fbf6ea', floor: '#e6dccb', floor2: '#c9bba3', fpat: 'tile', curtain: '#d0483a', out: 'city' },
    bath00: { wall: '#e2eff2', pat: 'tile', patc: '#bcd9e0', tileTop: 50, trim: '#fbf6ea', floor: '#e8e8e0', floor2: '#cfd4d0', fpat: 'tile', out: 'city' }
  };
  const bathroom85 = () => ({ name: 'Bathroom', short: 'Bath', theme: TH.bath85, pile: [72, 118], zones: [[4, 4, 46, 36], [68, 4, 118, 42], [160, 4, 196, 38]],
    furn: [{ t: 'shelf', x: 10, y: 56, w: 34, style: 'glass' }, { t: 'tub', x: 4, w: 60, top: 104, curtain: '#ee9fb8' }, { t: 'bar', x: 72, y: 60, w: 44 },
      { t: 'cabinet', x: 118, w: 38, top: 96, col: '#fbf6ea', door: '#f4eee4', tc: '#e8b0bc', painted: 1, counter: 1, sink: [130, 14], doors: [[1, 18], [19, 18]], lines: [[111, 10], [124, 11]] },
      { t: 'cabinet', x: 122, w: 30, top: 28, bot: 62, col: '#e8e4dc', painted: 1, mirror: 1, doors: [[1, 28]], lines: [[44, 12], [59, 13]] },
      { t: 'shelf', x: 164, y: 58, w: 30, col: '#fbf6ea' }, { t: 'toilet', x: 172 }],
    boxes: [[towel('#ee9fb8', '#fbf6ea'), towel('#fbf6ea', '#ee9fb8'), towel('#f4cf55'), bottle('Bubble bath', '#ee9fb8'), C.shampoo('#62a84e'), C.soap(), C.brushcup()],
      [C.duck(), C.boat(), C.comb(), C.tp(), C.tp(), C.sponge()]] });
  const LEVELS = [
    { id: 0, year: 1985, age: 7, title: 'A room of my own.', sub: 'Age 7', cap: 'My room, 1985',
      rooms: [
        { name: 'Bedroom', short: 'Bed', theme: TH.bed85, pile: [76, 126], zones: [[4, 4, 72, 40], [120, 4, 156, 54], [160, 2, 196, 24]],
          furn: [{ t: 'rug', x: 74, w: 56, col: '#5b8bd9', acc: '#f4cf55' }, { t: 'window', x: 84, y: 24, w: 32, h: 32 }, { t: 'shelf', x: 8, y: 60, w: 46, col: '#b5773f' },
            { t: 'bed', x: 4, w: 62, col: '#b5773f', bc: '#5b8bd9', bp: '#f4d35e', pat: 'stars' }, { t: 'nightstand', x: 67, w: 14, top: 100, col: '#c98b52' },
            { t: 'hooks', x: 124, y: 62, w: 30, col: '#c98b52' },
            { t: 'cabinet', x: 124, w: 30, top: 104, col: '#d86a4a', door: '#e8845a', tc: '#b8503a', painted: 1, deco: 'chest', counter: 1, doors: [[2, 26]], lines: [[121, 14]] },
            { t: 'bookcase', x: 158, w: 38, top: 56, lines: [76, 100, 124], col: '#b5773f' }],
          boxes: [
            [C.teddy(), C.robot(), C.car(), C.blocks(), C.piggy(), C.nlamp(), C.jack(), C.bunny()],
            [book('Picture book', 0, 12), book('Picture book', 1, 11), book('Picture book', 2, 12), C.recorder(), tape('#26262e'), tape('#d0483a'), C.snowglobe(), C.yoyo()],
            [C.poster('rocket', 'Rocket poster'), C.photo(), shirt('#ec9444', '#fbf6ea'), shirt('#62a84e'), C.sneaker(), C.slippers(), C.cap('#d0483a'), C.rope(), C.dclock()]
          ] },
        bathroom85(),
        { name: 'Playroom', short: 'Play', theme: TH.play85, pile: [82, 128], zones: [[4, 4, 60, 42], [126, 2, 196, 36], [164, 40, 196, 66], [80, 4, 88, 20]],
          furn: [{ t: 'window', x: 92, y: 28, w: 28, h: 30 }, { t: 'shelf', x: 10, y: 62, w: 44, col: '#c98b52' }, { t: 'sofa', x: 4, w: 58, col: '#b86a3a', pat: 'plaid' },
            { t: 'nightstand', x: 63, w: 15, top: 100, col: '#6a4222' }, { t: 'bookcase', x: 130, w: 32, top: 84, lines: [104, 124], col: '#d8b078', topClear: 26 },
            { t: 'shelf', x: 132, y: 56, w: 28, col: '#d8b078' }, { t: 'table', x: 166, w: 30, top: 108, col: '#e8c040', nodrawer: 1 }],
          boxes: [
            [game('Board game', '#d0483a', '#f4cf55'), game('Board game', '#2c4888', '#fbf6ea'), game('Checkers', '#26262e', '#d0483a'), game('Jigsaw puzzle', '#62a84e', '#9ad0ec'), C.crayons(), book('Coloring book', 5, 11), C.drawing()],
            [C.elephant(), C.doll(), C.train(), C.xylo(), C.spintop(), C.tlamp(), C.calendar('#62a84e'), C.ball()]
          ] }
      ] },
    { id: 1, year: 1990, age: 12, title: 'New house. New school.', sub: 'Age 12', cap: 'My room, 1990',
      rooms: [
        { name: 'Bedroom', short: 'Bed', theme: TH.bed90, pile: [58, 104], zones: [[4, 4, 60, 38], [132, 4, 196, 42]],
          furn: [{ t: 'window', x: 66, y: 26, w: 32, h: 32 }, { t: 'desk', x: 4, w: 52, top: 92, col: '#e3dccb', dside: 'r' }, { t: 'shelf', x: 8, y: 58, w: 44, col: '#e3dccb' },
            { t: 'bookcase', x: 106, w: 22, top: 52, lines: [72, 92, 108, 124], col: '#c98b52' },
            { t: 'bed', x: 130, w: 66, flip: 1, col: '#c98b52', bc: '#d64b4b', bp: '#fbf6ea', pat: 'check' }, { t: 'shelf', x: 140, y: 62, w: 44, col: '#c98b52' }],
          boxes: [
            [C.teddy(), C.trophy(), C.soccer(), C.globe(), C.plane(), C.dlamp(), C.dclock(), C.pup()],
            [comic(0, 3), comic(1, 0), comic(4, 3), C.boombox(), C.pencils(), tape('#26262e'), tape('#d0483a'), C.binoc()],
            [C.poster('sport', 'Soccer poster'), C.pennant(), shirt('#2c4888', '#f4cf55'), shirt('#ee9fb8'), C.sneaker(), C.pack(), C.glove(), C.baseball(), C.handheld(), cart('#d0483a')]
          ] },
        { name: 'Bathroom', short: 'Bath', theme: TH.bath90, pile: [78, 120], zones: [[2, 4, 34, 38], [76, 4, 124, 44], [130, 2, 196, 26]],
          furn: [{ t: 'shelf', x: 6, y: 58, w: 26, col: '#fbf6ea' }, { t: 'toilet', x: 8 },
            { t: 'cabinet', x: 36, w: 38, top: 96, col: '#b8c8d8', door: '#c8d8e8', tc: '#f4f0e8', painted: 1, counter: 1, sink: [48, 14], doors: [[1, 18], [19, 18]], lines: [[111, 10], [124, 11]] },
            { t: 'cabinet', x: 40, w: 30, top: 28, bot: 62, col: '#e8e4dc', painted: 1, mirror: 1, doors: [[1, 28]], lines: [[44, 12], [59, 13]] },
            { t: 'bar', x: 80, y: 60, w: 40 }, { t: 'tub', x: 128, w: 68, top: 104, curtain: '#9ad0ec' }],
          boxes: [[towel('#4f7fd0', '#fbf6ea'), towel('#fbf6ea', '#4f7fd0'), C.robe('#8e5cb0'), C.brushcup(), C.soap('#9ad0ec'), C.pump()],
            [C.shampoo('#d0483a'), C.brush(), C.sponge(), C.tissues(), C.tp(), C.tp()]] },
        { name: 'Kitchen', theme: TH.kit90, pile: [118, 164], zones: [[84, 4, 118, 66]],
          furn: [{ t: 'cabinet', x: 6, w: 72, top: 18, bot: 54, col: '#c98b52', doors: [[1, 35], [36, 35]], lines: [[36, 15], [51, 14]] },
            { t: 'cabinet', x: 4, w: 78, top: 94, col: '#c98b52', tc: '#f0e6c8', speck: 1, counter: 1, sink: [40, 18], doors: [[2, 37], [41, 35]], lines: [[110, 11], [124, 12]] },
            { t: 'stove', x: 84, w: 26, top: 94 }, { t: 'window', x: 126, y: 20, w: 30, h: 28, clear: 20 }, { t: 'hooks', x: 118, y: 62, w: 44, col: '#c98b52', clear: 26 },
            { t: 'fridge', x: 166, w: 30, top: 38 }],
          boxes: [[C.plate(), C.plate(), C.plate(), C.bowl('#62a84e'), mug('#d0483a'), mug('#f4cf55'), C.cereal()],
            [C.pot(), C.pan(), C.kettle(), C.toaster(), C.cookiejar()],
            [spice('Spice jar', '#d0483a'), spice('Spice jar', '#62a84e', '#f4cf55'), spice('Spice jar', '#ec9444'), C.mitt('#d0483a'), C.dishtowel('#4f7fd0'), C.kclock(), book('Cookbook', 5, 12)]] },
        { name: 'Garage', theme: TH.gar90, pile: [78, 128], zones: [[120, 4, 146, 84], [78, 54, 118, 94]],
          furn: [{ t: 'peg', x: 6, y: 36, w: 62, h: 46, rails: [46, 66] }, { t: 'bench', x: 4, w: 68, top: 90, col: '#8a6a48', clear: 24 },
            { t: 'window', x: 88, y: 24, w: 24, h: 20, clear: 16 }, { t: 'bookcase', x: 150, w: 44, top: 40, lines: [62, 84, 106, 124], col: '#8a929a', style: 'metal' }],
          boxes: [[C.toolbox(), C.hammer(), C.wrench(), C.cord(), C.flash(), C.nails(), paint('#4f7fd0'), paint('#fbf6ea')],
            [C.helmet(), C.skates(), C.bat(), C.watercan(), C.bulbs()]] }
      ] },
    { id: 2, year: 1995, age: 17, title: 'The big room at the end of the hall.', sub: 'Age 17', cap: 'My room, 1995',
      rooms: [
        { name: 'Bedroom', short: 'Bed', theme: TH.bed95, pile: [88, 130], zones: [[4, 4, 62, 40], [134, 4, 196, 34]],
          furn: [{ t: 'rug', x: 86, w: 46, col: '#b8573e', acc: '#e8c878' }, { t: 'window', x: 96, y: 24, w: 28, h: 34 }, { t: 'shelf', x: 8, y: 60, w: 48, col: '#8a5a32' },
            { t: 'bed', x: 4, w: 58, col: '#8a5a32', bc: '#3d5a80', bp: '#98c1d9', pat: 'stripe' }, { t: 'bookcase', x: 63, w: 22, top: 52, lines: [72, 92, 108, 124], col: '#8a5a32' },
            { t: 'desk', x: 134, w: 62, top: 92, col: '#8a5a32', dside: 'l' }, { t: 'shelf', x: 138, y: 54, w: 54, col: '#8a5a32' }],
          boxes: [
            [C.teddy(), C.trophy('Basketball trophy'), C.bball(), C.sneaker('#4f7fd0'), C.pack('#62a84e'), C.skate(), C.guitar(), C.cap('#26262e')],
            [C.monitor(), C.tower(), C.keyboard(), floppy('#2c4888'), C.dlamp('#26262e'), C.radio(), C.calc()],
            [C.poster('band', 'Band poster'), C.poster('movie', 'Movie poster'), C.photo(), C.pager(), C.phones(), C.cdplayer(), cd(4, 5), cd(1, 3)],
            [book('School book', 6, 13), book('School book', 1, 12), book('Dictionary', 7, 13), C.cactus(), C.dumbbell()]
          ] },
        { name: 'Bathroom', short: 'Bath', theme: TH.bath95, pile: [76, 116], zones: [[4, 4, 72, 42], [74, 4, 118, 44], [162, 4, 196, 70]],
          furn: [{ t: 'tub', x: 4, w: 66, top: 104 }, { t: 'shelf', x: 10, y: 62, w: 48, style: 'glass' }, { t: 'bar', x: 76, y: 60, w: 40 },
            { t: 'cabinet', x: 122, w: 38, top: 96, col: '#fbf6ea', door: '#f1ede4', tc: '#8ccabc', painted: 1, counter: 1, sink: [134, 14], doors: [[1, 18], [19, 18]], lines: [[111, 10], [124, 11]] },
            { t: 'cabinet', x: 126, w: 30, top: 28, bot: 62, col: '#e8e4dc', painted: 1, mirror: 1, doors: [[1, 28]], lines: [[44, 12], [59, 13]] },
            { t: 'toilet', x: 170 }],
          boxes: [[towel('#2f7a70', '#fbf6ea'), towel('#fbf6ea', '#2f7a70'), C.dryer(), C.shampoo('#8e5cb0'), bottle('Conditioner', '#ee9fb8'), C.soap('#f4cf55')],
            [C.brushcup(), bottle('Hair gel', '#4f7fd0'), C.comb(), C.tissues(), C.tp(), C.duck()]] },
        { name: 'Rec room', short: 'Rec', label: 'REC ROOM', theme: TH.rec95, pile: [80, 124], zones: [[4, 8, 72, 72], [80, 36, 124, 92], [126, 2, 168, 38]],
          furn: [{ t: 'window', x: 88, y: 12, w: 32, h: 14, clear: 12 }, { t: 'sofa', x: 4, w: 68, col: '#6a7a4a' },
            { t: 'cabinet', x: 128, w: 40, top: 100, col: '#4a4640', door: '#5a5650', tc: '#3e3a36', painted: 1, counter: 1, doors: [[2, 18], [20, 18]], lines: [[122, 14]] },
            { t: 'shelf', x: 128, y: 58, w: 40, col: '#c8a068' }, { t: 'bookcase', x: 172, w: 24, top: 50, lines: [72, 98, 124], col: '#c8a068' }],
          boxes: [[C.tv(), C.vcr(), vhs(), game('Board game', '#8e5cb0', '#f4cf55'), game('Board game', '#ec9444', '#2c4888'), C.cards(), C.popcorn()],
            [soda('#d0483a'), soda('#4f7fd0'), soda('#62a84e'), C.tlamp('#62a84e'), C.dartboard(), C.glitter(), game('Jigsaw puzzle', '#5fb8a8', '#fbf6ea'), C.pillow('#e8c878')]] },
        { name: 'Hall closet', short: 'Closet', label: 'CLOSET', theme: TH.hall95, pile: [36, 80], zones: [[34, 4, 82, 64], [130, 2, 196, 14]],
          furn: [{ t: 'door', x: 6 }, { t: 'cabinet', x: 84, w: 44, top: 34, col: '#efe6cc', door: '#f4ecd8', painted: 1, doors: [[1, 21], [22, 21]], lines: [[58, 20], [84, 22], [108, 20], [123, 12]] },
            { t: 'shelf', x: 134, y: 34, w: 58, col: '#8a5a32' }, { t: 'hooks', x: 132, y: 58, w: 62, col: '#8a5a32' }, { t: 'bench', x: 136, w: 56, top: 110, col: '#8a5a32' }],
          boxes: [[C.umbrella(), C.coat('Winter coat', '#2c4888', '#d0483a'), C.coat('Rain jacket', '#f4cf55', '#26262e'), C.scarf('#d0483a', '#fbf6ea'), C.beanie(), C.mittens(), C.boots(), C.rainboots()],
            [C.flash(), album('Photo album', 7), C.bulbs(), game('Board game', '#2c4888', '#d0483a'), C.mirror(), C.friends()]] }
      ] },
    { id: 3, year: 2000, age: 22, title: 'My first apartment.', sub: 'Age 22', cap: 'Home, 2000',
      rooms: [
        { name: 'Living room', short: 'Living', label: 'LIVING RM', theme: TH.liv00, pile: [80, 126], zones: [[4, 8, 76, 72], [124, 4, 168, 44]],
          furn: [{ t: 'rug', x: 78, w: 50, col: '#c86a3a', acc: '#f2e8cf' }, { t: 'window', x: 86, y: 24, w: 34, h: 34 }, { t: 'sofa', x: 4, w: 72, col: '#4a6a8a' },
            { t: 'cabinet', x: 126, w: 42, top: 104, col: '#4a4640', door: '#6c6862', tc: '#3e3a36', painted: 1, counter: 1, doors: [[2, 19], [21, 19]], lines: [[123, 13]] },
            { t: 'shelf', x: 128, y: 62, w: 38, col: '#4a4640' }, { t: 'bookcase', x: 171, w: 26, top: 50, lines: [72, 98, 124], col: '#d4a86a' }],
          boxes: [
            [C.tv(), C.dvd(), dvd('#d0483a'), C.remote(), book('Novel', 1, 13), book('Novel', 4, 12), book('Novel', 2, 13)],
            [C.poster('modern', 'Art print'), C.grad(), C.plant(), C.vase(), C.candle(), C.candle(), C.pillow(), C.pillow('#e8b04a')],
            [mag('Magazine', 0, 3), C.flamp(), cloth('Blanket', '#8a3a3a', 14, 4, '#f2e8cf'), C.sframe(), C.worldmap()]
          ] },
        { name: 'Bedroom', short: 'Bed', theme: TH.bed00, pile: [76, 120], zones: [[4, 10, 64, 76], [124, 4, 170, 40], [172, 4, 196, 46]],
          furn: [{ t: 'window', x: 84, y: 26, w: 30, h: 32 }, { t: 'bed', x: 4, w: 62, col: '#d4a86a', bc: '#6a994e', bp: '#f2e8cf', pat: 'patch' }, { t: 'nightstand', x: 66, w: 14, top: 100, col: '#d4a86a' },
            { t: 'dresser', x: 128, w: 40, top: 94, n: 2, col: '#8a5a32' }, { t: 'shelf', x: 130, y: 58, w: 36, col: '#8a5a32' }, { t: 'hooks', x: 172, y: 50, w: 24, col: '#d4a86a' }],
          boxes: [
            [C.teddy(), C.laptop(), C.mobile(), C.dclock(), C.tlamp('#6a8ab0'), cd(0, 6), cd(7, 3), C.jewel()],
            [shirt('#26262e'), shirt('#fbf6ea', '#4f7fd0'), cloth('Jeans', '#4a6a9a', 12, 4), C.shoes('#6a4222'), C.cap('#62a84e')],
            [C.friends(), C.mirror(), C.perfume(), C.piggy(), C.snowglobe()]
          ] },
        { name: 'Kitchen', theme: TH.kit00, pile: [124, 166], zones: [[98, 4, 128, 74]],
          furn: [{ t: 'cabinet', x: 6, w: 88, top: 18, bot: 54, col: '#e3dccb', painted: 1, doors: [[1, 43], [44, 43]], lines: [[36, 15], [51, 14]] },
            { t: 'cabinet', x: 4, w: 92, top: 94, col: '#e3dccb', tc: '#8a929a', painted: 1, speck: 1, counter: 1, sink: [44, 18], doors: [[2, 43], [47, 43]], lines: [[110, 11], [124, 12]] },
            { t: 'stove', x: 99, w: 26, top: 94 }, { t: 'window', x: 132, y: 20, w: 30, h: 28, clear: 20 }, { t: 'bar', x: 130, y: 64, w: 34, clear: 24 }, { t: 'fridge', x: 168, w: 28, top: 38 }],
          boxes: [[mug('#d0483a'), mug('#4f7fd0'), mug('#f4cf55'), C.plate(), C.plate(), C.plate(), C.bowl('#62a84e')],
            [C.pot(), C.pot(), C.kettle(), C.toaster(), C.coffee(), C.board(), C.glass()],
            [C.kclock(), book('Cookbook', 5, 12), tin('Flour', '#fbf6ea'), tin('Sugar', '#9ad0ec'), C.cereal(), C.mitt('#62a84e'), C.dishtowel('#d0483a')]] },
        { name: 'Bathroom', short: 'Bath', theme: TH.bath00, pile: [76, 116], zones: [[4, 4, 72, 42], [74, 4, 118, 44], [162, 4, 196, 38]],
          furn: [{ t: 'tub', x: 4, w: 66, top: 104 }, { t: 'shelf', x: 10, y: 62, w: 48, col: '#f4fafc' }, { t: 'bar', x: 78, y: 62, w: 36 },
            { t: 'cabinet', x: 122, w: 38, top: 96, col: '#fbf6ea', door: '#f1ede4', painted: 1, counter: 1, sink: [134, 14], doors: [[1, 18], [19, 18]], lines: [[111, 10], [124, 11]] },
            { t: 'cabinet', x: 126, w: 30, top: 28, bot: 62, col: '#e8e4dc', painted: 1, mirror: 1, doors: [[1, 28]], lines: [[44, 12], [59, 13]] },
            { t: 'shelf', x: 164, y: 60, w: 30, col: '#fbf6ea' }, { t: 'toilet', x: 170 }],
          boxes: [[towel('#4f7fd0', '#fbf6ea'), towel('#fbf6ea', '#4f7fd0'), C.brushcup(), C.soap(), C.shampoo(), C.duck()],
            [C.dryer(), C.lotion(), C.saltjar(), C.plant(), C.candle()]] }
      ] }
  ];
  const built = {};
  const LV = i => built[i] || (built[i] = mkLevel(LEVELS[i]));

  /* ---------- state ----------
     S = { b: [[state, pulled]] per box (0 closed, 1 open, 2 folded away), it: item locations, c: surface centers, done }
     item location: 0 in its box, 1 resting on its open box, -1 being held, [surface, slot, stackIndex] or [wallZone, x, y]. */
  const fresh = L => ({ b: L.boxes.map(() => [0, 0]), it: L.items.map(() => 0), c: L.surfs.map(() => null), done: 0 });
  function valid(L, S) {
    if (!(S && S.b && S.it && S.c && S.b.length === L.boxes.length && S.it.length === L.items.length && S.c.length === L.surfs.length)) return false;
    return S.it.every(l => l === 0 || l === 1 || (Array.isArray(l) && l[0] >= 0 && l[0] < L.surfs.length));
  }
  const roomClear = (L, S, r) => L.boxes.every((b, i) => b.r !== r || S.b[i][0] === 2);
  function surfActive(L, S, s, open) {
    if (s.under && !roomClear(L, S, s.r)) return false;
    if (s.cont && !(open && open.has(s.cont.i))) return false;
    return true;
  }
  function getSlots(S, si) {
    const m = new Map();
    S.it.forEach((loc, i) => { if (Array.isArray(loc) && loc[0] === si) { if (!m.has(loc[1])) m.set(loc[1], []); m.get(loc[1]).push(i); } });
    return [...m.keys()].sort((p, q) => p - q).map(k => m.get(k).sort((p, q) => S.it[p][2] - S.it[q][2]));
  }
  const cvOf = f => typeof f === 'function' ? f() : f;
  const hangImg = d => d.hang === 1 || d.hang === true ? cvOf(d.spr) : cvOf(d.hang);
  function formOf(L, i, lay, clear, s) {
    const d = L.items[i];
    if (s && s.hang) return { img: hangImg(d), lay: 0 };
    const st = cvOf(d.spr), ly = d.lay ? cvOf(d.lay) : null;
    if (ly && (lay || st.height > clear) && (lay || ly.height <= clear)) return { img: ly, lay: 1 };
    return { img: st, lay: 0 };
  }
  // Lay a line surface out: slots in order, evenly spaced, rows of books/tapes touching, centered on c.
  function layoutLine(L, s, slots, c) {
    const sl = slots.map(items => {
      const lay = items.length > 1;
      const forms = items.map(i => formOf(L, i, lay, s.clear, s));
      return { items, forms, w: Math.max(...forms.map(f => f.img.width)), h: forms.reduce((t, f) => t + f.img.height, 0), row: items.length === 1 && !forms[0].lay && !s.hang ? L.items[items[0]].row : null, rg: L.items[items[0]].rg || 0 };
    });
    const len = s.x1 - s.x0, n = sl.length;
    let sumW = 0, rowG = 0, nonRow = 0;
    sl.forEach((q, j) => { sumW += q.w; if (j) { if (q.row && q.row === sl[j - 1].row) { rowG += q.rg; q.rowJoin = 1; } else nonRow++; } });
    const G = clamp(Math.floor((len - sumW - rowG) / (n + 1)), s.hang ? 1 : 2, s.floor ? 8 : 6);
    const total = sumW + rowG + G * nonRow;
    const ok = total <= len && sl.every(q => q.h <= s.clear + 0.5);
    const cc = c == null ? (s.x0 + s.x1) / 2 : c;
    let x = total > len ? s.x0 : clamp(Math.round(cc - total / 2), s.x0, s.x1 - total);
    const rects = [], boxes = [];
    sl.forEach((q, j) => {
      if (j) x += q.rowJoin ? q.rg : G;
      let y = s.y;
      if (s.hang) { const f = q.forms[0]; rects.push({ i: q.items[0], x: x + Math.floor((q.w - f.img.width) / 2), y: s.y, w: f.img.width, h: f.img.height, img: f.img, hang: 1 }); boxes.push({ x, w: q.w, top: s.y + q.h, items: q.items, row: null }); }
      else {
        q.forms.forEach((f, k) => { const w = f.img.width, h = f.img.height; y -= h; rects.push({ i: q.items[k], x: x + Math.floor((q.w - w) / 2), y, w, h, img: f.img }); });
        boxes.push({ x, w: q.w, top: y, items: q.items, row: q.row });
      }
      x += q.w;
    });
    return { ok, total, rects, boxes, tall: sl.some(q => q.h > s.clear + 0.5) };
  }
  // All item rectangles in a room (target positions).
  function layoutRoom(L, S, r, open) {
    const out = [];
    L.surfs.forEach(s => {
      if (s.r !== r) return;
      const hidden = s.cont && !(open && open.has(s.cont.i));
      if (s.t === 'line') { const lay = layoutLine(L, s, getSlots(S, s.i), S.c[s.i]); lay.rects.forEach(q => { q.hidden = hidden; q.s = s; out.push(q); }); }
      else S.it.forEach((loc, i) => { if (Array.isArray(loc) && loc[0] === s.i) { const img = cvOf(L.items[i].spr); out.push({ i, x: loc[1], y: loc[2], w: img.width, h: img.height, img, s }); } });
    });
    S.it.forEach((loc, i) => {
      if (loc !== 1) return; const b = L.boxes[L.items[i].box]; if (b.r !== r) return;
      const img = cvOf(L.items[i].spr); out.push({ i, x: b.x + ((b.w - img.width) >> 1), y: boxTop(b) - img.height, w: img.width, h: img.height, img, onBox: 1 });
    });
    return out;
  }
  const boxTop = b => b.y - b.h;

  /* Put every item somewhere sensible (used to unpack finished moves from older saves, and to check that
     everything has a home). Big things first, then rows and stacks join their kind. */
  function wallSpot(L, S, s, img, taken) {
    let best = null, bs = -1e9;
    const my = (s.y0 + s.y1) / 2, mx = (s.x0 + s.x1) / 2;
    for (let y = s.y0; y + img.height <= s.y1; y += 2) for (let x = s.x0; x + img.width <= s.x1; x += 2) {
      let gap = 30;
      for (const q of taken) { const dx = Math.max(q.x - (x + img.width), x - (q.x + q.w)), dy = Math.max(q.y - (y + img.height), y - (q.y + q.h)); gap = Math.min(gap, Math.max(dx, dy)); }
      if (gap < 3) continue;
      const sc = Math.min(gap, 16) - Math.abs(y + img.height / 2 - my) * 0.35 - Math.abs(x + img.width / 2 - mx) * 0.08;
      if (sc > bs) { bs = sc; best = [x, y]; }
    }
    return best ? { p: best, sc: bs } : null;
  }
  function placeItem(L, S, i, rooms, opt) {
    const d = L.items[i];
    for (const r of rooms) {
      if (d.wall) {
        const zones = L.surfs.filter(s => s.r === r && s.t === 'wall');
        const img = cvOf(d.spr), taken = []; let pick = null;
        S.it.forEach((l, k) => { if (Array.isArray(l) && L.surfs[l[0]].t === 'wall' && L.surfs[l[0]].r === r) { const im = cvOf(L.items[k].spr); taken.push({ x: l[1], y: l[2], w: im.width, h: im.height }); } });
        for (const s of zones) { const w = wallSpot(L, S, s, img, taken); if (w && (!pick || w.sc > pick.sc)) pick = { s, p: w.p, sc: w.sc }; }
        if (pick) return [pick.s.i, pick.p[0], pick.p[1]];
        continue;
      }
      const cands = L.surfs.filter(s => s.r === r && s.t === 'line' && (!s.hang || d.hang) && !(opt && opt.noCont && s.cont) && !(opt && opt.act && !opt.act(s)));
      const score = s => {
        const used = getSlots(S, s.i).reduce((t, q) => t + Math.max(...q.map(k => formOf(L, k, q.length > 1, s.clear, s).img.width)), 0);
        const room = (s.x1 - s.x0 - used) / (s.x1 - s.x0);
        const soft = d.mat === 'plush' || d.mat === 'cloth', tall = cvOf(d.spr).height;
        return (s.hang && d.hang ? 3 : 0) + (s.floor ? (tall > 22 ? 2 : -1.2) : 0) + (s.cont ? -0.6 : 0) + ((s.bed || s.sofa) ? (soft ? 2 : -2) : 0) + (tall > 13 && !s.floor && s.y < 80 ? -1.5 : 0) + (s.sill && tall > 10 ? -0.8 : 0) + room + (hash(i, s.i) % 100) / 400;
      };
      cands.sort((p, q) => score(q) - score(p));
      for (const s of cands) {
        const slots = getSlots(S, s.i);
        if (d.stk && !s.hang) {
          const j = slots.findIndex(q => q.length < 5 && q.every(k => L.items[k].stk === d.stk));
          if (j >= 0) { const ns = slots.map(q => q.slice()); ns[j].push(i); if (layoutLine(L, s, ns, null).ok) return { s, ns }; }
        }
        let at = slots.length;
        if (d.row) { let last = -1; slots.forEach((q, j) => { if (q.length === 1 && L.items[q[0]].row === d.row) last = j; }); if (last >= 0) at = last + 1; }
        const ns = slots.map(q => q.slice()); ns.splice(at, 0, [i]);
        if (layoutLine(L, s, ns, null).ok) return { s, ns };
      }
    }
    return null;
  }
  function autoArrange(L) {
    const S = fresh(L); S.b = L.boxes.map(b => [2, b.items.length]); S.done = 1; S.it = L.items.map(() => 0);
    const area = i => { const im = cvOf(L.items[i].spr); return im.width * im.height; };
    const order = L.items.map((d, i) => i).sort((p, q) => (L.items[q].wall ? 1 : 0) - (L.items[p].wall ? 1 : 0) || area(q) - area(p));
    const miss = [];
    order.forEach(i => {
      const home = L.boxes[L.items[i].box].r, rooms = [home].concat(L.rooms.map((q, r) => r).filter(r => r !== home));
      const got = placeItem(L, S, i, rooms, { noCont: 1 }) || placeItem(L, S, i, rooms);
      if (!got) { miss.push(i); return; }
      if (Array.isArray(got)) S.it[i] = got;
      else got.ns.forEach((q, j) => q.forEach((k, n) => { S.it[k] = [got.s.i, j, n]; }));
      if (!Array.isArray(got) && L.surfs[got.s.i].r !== home) miss.push(-1 - i);
    });
    S.miss = miss;
    return S;
  }

  /* ---------- drawing ---------- */
  function drawWalls(g, room) {
    const th = room.theme, wc = th.wall, pc2 = th.patc;
    R(g, wc, 0, 0, VW, WALL);
    const pat = th.pat;
    if (pat === 'flowers') {
      for (let x = 0; x < VW; x += 12) R(g, shade(wc, -0.035), x + 6, 0, 0.5, WALL);
      for (let y = 5, row = 0; y < WALL - 6; y += 10, row++) for (let x = row % 2 ? 8 : 2; x < VW; x += 12) {
        R(g, pc2, x, y - 1, 1, 1); R(g, pc2, x - 1, y, 3, 1); R(g, pc2, x, y + 1, 1, 1); R(g, th.acc, x, y, 1, 1); R(g, shade(pc2, 0.3), x - 0.5, y - 0.5, 0.5, 0.5);
        R(g, '#9ab070', x + 1, y + 1.5, 1.5, 0.5); R(g, '#9ab070', x + 2, y + 2, 0.5, 1);
      }
    } else if (pat === 'stripe') {
      for (let x = 2; x < VW; x += 8) { R(g, pc2, x, 0, 2, WALL); R(g, shade(pc2, 0.25), x, 0, 0.5, WALL); }
      const b = th.border; R(g, shade(b, -0.4), 0, 69.5, VW, 5); R(g, b, 0, 70, VW, 4); R(g, shade(b, 0.3), 0, 70, VW, 0.5); R(g, '#f4cf55', 0, 72, VW, 0.5);
      for (let x = 2; x < VW; x += 6) { R(g, '#fbf6ea', x, 71, 1, 0.5); R(g, '#fbf6ea', x + 0.5, 70.5, 0.5, 1.5); }
    } else if (pat === 'sponge') {
      for (let y = 0; y < WALL; y += 0.5) for (let x = (y * 2 % 2) * 0.5; x < VW; x += 1) { const hv = hash(x * 2, y * 2); if (hv < 60) R(g, pc2, x, y, 0.5, 0.5); else if (hv > 960) R(g, shade(wc, 0.1), x, y, 0.5, 0.5); }
      const b = th.border; R(g, shade(b, -0.4), 0, 4.5, VW, 7); R(g, b, 0, 5, VW, 6); R(g, shade(b, 0.25), 0, 5, VW, 0.5);
      for (let x = 0; x < VW; x += 8) { R(g, '#e8c878', x + 2, 7, 3, 2); R(g, '#e8c878', x + 3, 6.5, 1, 3); R(g, '#98c1d9', x + 6, 7.5, 1, 1); }
    } else if (pat === 'tile') {
      const top = th.tileTop || 50, tr = ramp(pc2);
      for (let y = 0; y < top; y += 3) for (let x = (y % 2) * 2; x < VW; x += 5) if (hash(x, y) < 90) R(g, shade(wc, -0.03), x, y, 0.5, 0.5);
      R(g, pc2, 0, top, VW, WALL - top);
      for (let y = top + 2, row = 0; y < WALL; y += 6, row++) for (let x = 0; x < VW; x += 6) { R(g, tr[3], x + 0.5, y + 0.5, 5, 0.5); R(g, tr[3], x + 0.5, y + 0.5, 0.5, 5); R(g, tr[1], x + 0.5, y + 5, 5.5, 0.5); R(g, tr[1], x + 5.5, y + 0.5, 0.5, 5); R(g, '#ffffff', x + 1, y + 1, 1, 0.5); R(g, shade(pc2, 0.5), x, y, 6, 0.5); R(g, shade(pc2, 0.5), x, y, 0.5, 6); }
      R(g, tr[0], 0, top - 0.5, VW, 3); R(g, tr[2], 0, top, VW, 2); R(g, tr[4], 0, top, VW, 0.5); R(g, tr[1], 0, top + 1.5, VW, 0.5);
    } else if (pat === 'panel') {
      for (let x = 0; x < VW; x += 8) { const pcx = shade(wc, (hash(x, 3) % 7 - 3) / 60); R(g, pcx, x, 0, 8, WALL); grain(g, x, 0, 8, WALL, pcx, 1); R(g, pc2, x, 0, 0.5, WALL); R(g, shade(wc, 0.16), x + 0.5, 0, 0.5, WALL); }
      R(g, shade(wc, -0.3), 0, 0, VW, 2); R(g, shade(wc, 0.1), 0, 2, VW, 0.5);
    } else if (pat === 'splash' || pat === 'gingham') {
      if (pat === 'gingham') for (let y = 0; y < 56; y += 4) for (let x = 0; x < VW; x += 4) { if ((x / 4 + y / 4) % 2 < 1) R(g, pc2, x, y, 2, 4); if (y / 4 % 2 < 1) R(g, shade(pc2, 0.1), x, y, 4, 2); }
      else for (let y = 0; y < WALL; y += 3) for (let x = (y % 2) * 2; x < VW; x += 5) if (hash(x, y) < 80) R(g, shade(wc, -0.03), x, y, 0.5, 0.5);
      const sx1 = th.splashX || 128, sp = th.splash || pc2, sr = ramp(sp);
      R(g, sp, 0, 56, sx1, 38);
      for (let y = 56; y < 94; y += 6) for (let x = 0; x < sx1; x += 6) { R(g, sr[3], x + 0.5, y + 0.5, 5, 0.5); R(g, sr[1], x + 0.5, y + 5, 5.5, 0.5); R(g, sr[1], x + 5.5, y + 0.5, 0.5, 5); R(g, '#ffffff', x + 1, y + 1, 1, 0.5); R(g, shade(sp, 0.5), x, y, 6, 0.5); R(g, shade(sp, 0.5), x, y, 0.5, 6); }
      R(g, sr[0], 0, 55.5, sx1 + 0.5, 0.5); R(g, sr[0], sx1, 55.5, 0.5, 38.5);
    } else if (pat === 'block') {
      for (let y = 0, row = 0; y < WALL; y += 8, row++) for (let x = row % 2 ? -8 : 0; x < VW; x += 16) {
        const bc = shade(wc, (hash(x, y) % 9 - 4) / 70); R(g, bc, x + 0.5, y + 0.5, 15, 7); R(g, shade(bc, 0.14), x + 0.5, y + 0.5, 15, 0.5); R(g, shade(bc, -0.14), x + 0.5, y + 7, 15, 0.5);
        for (let k = 0; k < 10; k++) R(g, shade(bc, hash(k, x + y) % 2 ? -0.12 : 0.1), x + 1 + hash(k * 3, x * y + 1) % 14, y + 1 + hash(x + k, y) % 6, 0.5, 0.5);
        R(g, pc2, x, y, 16, 0.5); R(g, pc2, x, y, 0.5, 8);
      }
    } else if (pat === 'wainscot') {
      for (let y = 0; y < 70; y += 3) for (let x = (y % 2) * 2; x < VW; x += 5) if (hash(x, y) < 70) R(g, shade(wc, -0.03), x, y, 0.5, 0.5);
      const pr = ramp(pc2); R(g, pc2, 0, 72, VW, WALL - 72);
      for (let x = 3; x < VW - 6; x += 14) { R(g, pr[1], x, 77, 11, 0.5); R(g, pr[1], x, 77, 0.5, WALL - 82); R(g, pr[3], x, WALL - 5, 11, 0.5); R(g, pr[3], x + 10.5, 77, 0.5, WALL - 82); R(g, shade(pc2, 0.06), x + 1.5, 78.5, 8, WALL - 85); }
      R(g, pr[0], 0, 69.5, VW, 3.5); R(g, pr[3], 0, 70, VW, 1); R(g, pr[4], 0, 70, VW, 0.5); R(g, pr[1], 0, 72, VW, 0.5);
    } else {
      for (let y = 0; y < WALL; y += 2) for (let x = (y % 4) / 2; x < VW; x += 3) { const hv = hash(x, y); if (hv < 70) R(g, pc2, x, y, 0.5, 0.5); else if (hv > 975) R(g, shade(wc, 0.12), x, y, 0.5, 0.5); }
    }
    // ceiling shadow and corner shading (dithered)
    R(g, sh(0.1), 0, 0, VW, 2); dith2(g, sh(0.08), 0, 2, VW, 2); dith2(g, sh(0.05), 0, 4, VW, 2, 1);
    R(g, sh(0.06), 0, 0, 3, WALL); dith2(g, sh(0.06), 3, 0, 2, WALL); R(g, sh(0.06), VW - 3, 0, 3, WALL); dith2(g, sh(0.06), VW - 5, 0, 2, WALL);
    // floor
    const f1 = th.floor, f2 = th.floor2 || shade(f1, -0.12), fr = ramp(f1), fp = th.fpat;
    R(g, f1, 0, WALL, VW, VH - WALL);
    if (fp === 'carpet' || fp === 'shag') {
      const n = fp === 'shag' ? 520 : 300;
      for (let y = WALL; y < VH; y += 0.5) for (let x = ((y * 2) % 2) * 0.5; x < VW; x += 1) { const hv = hash(x * 2, y * 2 + 7); if (hv < n * 0.5) R(g, fr[1], x, y, 0.5, fp === 'shag' ? 1 : 0.5); else if (hv > 1000 - n * 0.35) R(g, fr[3], x, y, 0.5, 0.5); }
    } else if (fp === 'plank') {
      let y = WALL + 3, hh = 4, row = 0;
      while (y < VH + 6) {
        const y0 = y - hh;
        for (let x = -((row * 23) % 40); x < VW; x += 40) { const pcx = shade(f1, (hash(x, row) % 9 - 4) / 55); R(g, pcx, x + 0.5, y0, 39.5, hh); grain(g, x + 1, y0, 38, hh, pcx); R(g, fr[1], x, y0, 0.5, hh); R(g, fr[3], x + 0.5, y0, 0.5, hh); }
        R(g, fr[0], 0, y, VW, 0.5); R(g, fr[3], 0, y + 0.5, VW, 0.5);
        y += hh + 1; hh += 1; row++;
      }
    } else if (fp === 'tile' || fp === 'check') {
      let y = WALL, hh = 5, row = 0;
      while (y < VH) {
        const tw = 12 + row * 2, n = Math.ceil(VW / 2 / tw) + 1;
        for (let k = -n; k < n; k++) { const x = Math.round(VW / 2 + k * tw), c = (k + row + 64) % 2 ? f1 : f2; R(g, c, x, y, tw, hh); R(g, shade(c, 0.18), x, y, tw, 0.5); R(g, shade(c, 0.12), x, y, 0.5, hh); if (fp === 'check') dith2(g, shade(c, -0.04), x + 1, y + 1, 2, 1); }
        R(g, shade(f2, -0.15), 0, y + hh - 0.5, VW, 0.5);
        y += hh; hh += 1; row++;
      }
    } else if (fp === 'concrete') {
      for (let y = WALL; y < VH; y += 0.5) for (let x = 0; x < VW; x += 1) { const hv = hash(x * 3, y * 2); if (hv < 70) R(g, fr[1], x + (y * 2 % 2) * 0.5, y, 0.5, 0.5); else if (hv > 950) R(g, fr[3], x, y, 0.5, 0.5); }
      g.fillStyle = sh(0.07); g.beginPath(); g.ellipse(150, 138, 16, 4, 0, 0, 7); g.fill(); R(g, fr[1], 0, 131, VW, 0.5); R(g, fr[3], 0, 131.5, VW, 0.5);
    }
    // depth: darker near the wall
    R(g, sh(0.22), 0, WALL, VW, 1.5); dith2(g, sh(0.14), 0, WALL + 1.5, VW, 2); dith2(g, sh(0.07), 0, WALL + 3.5, VW, 2, 1);
    // baseboard
    const tr = ramp(th.trim);
    R(g, tr[0], 0, WALL - 5, VW, 5); R(g, th.trim, 0, WALL - 4.5, VW, 4); R(g, tr[4], 0, WALL - 4.5, VW, 0.5); R(g, tr[1], 0, WALL - 1.5, VW, 1); R(g, tr[3], 0, WALL - 3.5, VW, 0.5);
  }
  function drawCont(g, c, open) {
    const r = ramp(c.col), dk = r[1], lt = r[3];
    if (!open) {
      R(g, r[0], c.x, c.y, c.w, c.h); R(g, c.col, c.x + 0.5, c.y + 0.5, c.w - 1, c.h - 1); R(g, lt, c.x + 0.5, c.y + 0.5, c.w - 1, 0.5); R(g, lt, c.x + 0.5, c.y + 0.5, 0.5, c.h - 1); R(g, dk, c.x + 0.5, c.y + c.h - 1, c.w - 1, 0.5);
      if (c.mirror) {
        R(g, '#a8ccd8', c.x + 2, c.y + 2, c.w - 4, c.h - 4); R(g, '#bfe0ea', c.x + 2.5, c.y + 2.5, c.w - 5, c.h - 5);
        g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.moveTo(c.x + 4, c.y + c.h - 3); g.lineTo(c.x + 12, c.y + 3); g.lineTo(c.x + 15, c.y + 3); g.lineTo(c.x + 7, c.y + c.h - 3); g.fill();
        g.fillStyle = 'rgba(255,255,255,.3)'; g.beginPath(); g.moveTo(c.x + 10, c.y + c.h - 3); g.lineTo(c.x + 17, c.y + 3); g.lineTo(c.x + 18, c.y + 3); g.lineTo(c.x + 11, c.y + c.h - 3); g.fill();
        R(g, shade('#a8ccd8', -0.3), c.x + 2, c.y + 2, c.w - 4, 0.5);
      } else if (c.t === 'door') { panel(g, c.x + 2, c.y + 2, c.w - 4, c.h - 4, c.col, 0); panel(g, c.x + 3, c.y + 3, c.w - 6, c.h - 6, c.col, 1); if (c.fridge) R(g, '#d8d4cc', c.x + 0.5, c.y + 0.5, c.w - 1, 0.5); }
      else if (c.h > 5) panel(g, c.x + 1.5, c.y + 1.5, c.w - 3, c.h - 3, c.col, 1);
      if (c.fridge) { R(g, '#6a7278', c.x + 1.5, c.y + 3, 1.5, 14); R(g, '#e0e6ea', c.x + 1.5, c.y + 3, 0.5, 14); return; }
      if (c.t === 'drawer') { const kx = c.x + c.w / 2 - 2, ky = c.y + c.h / 2 - 0.75; R(g, '#5a3a1a', kx - 0.5, ky - 0.5, 5, 2); R(g, '#e8c870', kx, ky, 4, 1); R(g, '#fff4c0', kx, ky, 3, 0.5); }
      else knob(g, c.hinge === 'l' ? c.x + c.w - 4 : c.x + 2.5, c.y + (c.h >> 1) - 1);
    } else {
      const inr = c.lit ? '#eef2f4' : c.painted ? shade(c.col, -0.42) : '#3a2616', inD = shade(inr, -0.3);
      R(g, r[0], c.x, c.y, c.w, c.h); R(g, inr, c.x + 0.5, c.y + 0.5, c.w - 1, c.h - 1);
      if (c.lit) { R(g, '#d8e0e4', c.x + 0.5, c.y + 0.5, c.w - 1, 2); R(g, '#fffbe0', c.x + c.w / 2 - 2, c.y + 1, 4, 1); }
      else { R(g, inD, c.x + 0.5, c.y + 0.5, c.w - 1, 2); dith2(g, inD, c.x + 0.5, c.y + 2.5, c.w - 1, 1.5); R(g, shade(inr, 0.12), c.x + 0.5, c.y + c.h - 2.5, c.w - 1, 2); }
      if (c.t === 'door') c.lines.forEach(s => { R(g, c.lit ? '#b8c4ca' : shade(c.col, -0.2), c.x + 0.5, s.y, c.w - 1, 1.5); R(g, c.lit ? '#ffffff' : 'rgba(255,255,255,.25)', c.x + 0.5, s.y, c.w - 1, 0.5); });
    }
  }
  function drawContFront(g, c) {
    const r = ramp(c.col), dk = r[1], lt = r[3];
    if (c.t === 'drawer') {
      R(g, sh(0.3), c.x - 1, c.y + c.h + 1.5, c.w + 2, 2);
      R(g, dk, c.x - 1, c.y, 1, c.h + 2); R(g, dk, c.x + c.w, c.y, 1, c.h + 2);
      R(g, r[0], c.x - 1.5, c.y + c.h - 2.5, c.w + 3, 5); R(g, c.col, c.x - 1, c.y + c.h - 2, c.w + 2, 4); R(g, lt, c.x - 1, c.y + c.h - 2, c.w + 2, 0.5); R(g, dk, c.x - 1, c.y + c.h + 1.5, c.w + 2, 0.5);
      R(g, '#e8c870', c.x + (c.w >> 1) - 2, c.y + c.h, 4, 1); R(g, '#fff4c0', c.x + (c.w >> 1) - 2, c.y + c.h, 3, 0.5);
    } else {
      const px = c.hinge === 'l' ? c.x - 4 : c.x + c.w, fc = c.mirror ? '#bfe0ea' : c.col;
      R(g, r[0], px - 0.5, c.y - 1.5, 5, c.h + 3); R(g, fc, px, c.y - 1, 4, c.h + 2); R(g, shade(fc, 0.2), c.hinge === 'l' ? px : px + 3, c.y - 1, 1, c.h + 2); R(g, dk, c.hinge === 'l' ? px + 3.5 : px, c.y - 1, 0.5, c.h + 2);
      if (!c.fridge) knob(g, c.hinge === 'l' ? px + 1 : px + 2, c.y + (c.h >> 1) - 2);
    }
  }
  function boxShape(g, b, st, prog, fold, hi) {
    const h = Math.max(2, Math.round(b.h * (1 - fold))), x = b.x, y = b.y - h, w = b.w;
    const body = ['#c8955a', '#c28c52', '#cc9a60'][b.tint], br = ramp(body);
    if (st === 1 && fold < 0.05) {
      const fh = Math.round(7 * prog);
      if (fh > 0) { for (let i = 0; i < fh; i++) { R(g, br[3], x - 1 - (i >> 1), y - i - 1, 10, 1); R(g, br[3], x + w - 9 + (i >> 1), y - i - 1, 10, 1); } R(g, br[1], x - 1 - ((fh - 1) >> 1), y - fh, 10, 1); R(g, br[1], x + w - 9 + ((fh - 1) >> 1), y - fh, 10, 1); R(g, br[4], x - 1, y - 1, 10, 0.5); R(g, br[4], x + w - 9, y - 1, 10, 0.5); }
    }
    R(g, br[0], x - 0.5, y - 0.5, w + 1, h + 0.5); R(g, body, x, y, w, h); R(g, br[1], x, y + h - 1, w, 1); R(g, br[1], x + w - 1.5, y, 1.5, h);
    R(g, br[3], x, y, 0.5, h);
    for (let k = 3; k < w - 2; k += 4) R(g, shade(body, -0.06), x + k, y + 1, 0.5, h - 2);
    if (h > 6) {
      if (st === 1) { R(g, '#4a2e14', x + 1, y, w - 2, 3); R(g, '#6e4a26', x + 1, y + 2, w - 2, 1); }
      else { R(g, br[3], x, y, w, 3); R(g, br[1], x, y + 3, w, 0.5); R(g, '#d8c898', x + (w >> 1) - 2, y, 4, 8); R(g, '#f4e8c0', x + (w >> 1) - 2, y, 1, 8); R(g, '#b8a878', x + (w >> 1) + 1.5, y, 0.5, 8); }
      if (h > 12 && b.label) { const la = labelArt(b.label), lw = la.width / 2, sc = lw > w - 2 ? (w - 2) / lw : 1; g.drawImage(la, x + (w - lw * sc) / 2, y + 9.5, lw * sc, la.height / 2); }
    }
    if (hi) { g.strokeStyle = 'rgba(255,250,200,.9)'; g.lineWidth = 1; g.strokeRect(x - 0.5, y - 0.5, w + 1, h + 1); }
  }
  // cached painted layers per room: back (walls, floor, windows) and furniture
  function layers(room) {
    if (room.bgc) return room;
    const mk = zs => { const c = mkc(VW * K, VH * K), gg = ctx2(c); gg.setTransform(K, 0, 0, K, 0, 0); if (zs === 0) drawWalls(gg, room); room.draw.forEach(d => { if ((d.z < 1) === (zs === 0)) d.fn(gg); }); return c; };
    room.bgc = mk(0); room.fgc = mk(1);
    return room;
  }
  const shadowCache = new WeakMap();
  function silhouette(hi) {
    let s = shadowCache.get(hi); if (s) return s;
    s = mkc(hi.width, hi.height); const gg = s.getContext('2d'); gg.drawImage(hi, 0, 0); gg.globalCompositeOperation = 'source-in'; gg.fillStyle = 'rgba(40,20,8,.28)'; gg.fillRect(0, 0, s.width, s.height);
    shadowCache.set(hi, s); return s;
  }
  function drawSprite(g, img, x, y) { g.drawImage(hiOf(img), x, y, img.width, img.height); }
  function drawRoom(g, L, S, r, o) {
    o = o || {};
    g.setTransform(K, 0, 0, K, 0, 0); g.imageSmoothingEnabled = false;
    const room = layers(L.rooms[r]), open = o.open || new Set(), rects = o.rects || layoutRoom(L, S, r, open), byS = new Map();
    const disp = o.disp;
    rects.forEach(q => { const k = q.onBox ? 'box' : q.s.i; if (!byS.has(k)) byS.set(k, []); byS.get(k).push(q); });
    const drawItems = (list, flat) => (list || []).forEach(q => {
      if (q.hidden || q.i === o.held) return;
      const d = disp && disp[q.i], x = d ? Math.round(d.x * 2) / 2 : q.x, y = d ? Math.round(d.y * 2) / 2 : q.y;
      if (flat) g.drawImage(silhouette(hiOf(q.img)), x + 0.5, y + 1, q.w, q.h);
      else if (!q.onBox) { R(g, sh(0.26), x + 1, y + q.h - 0.5, q.w - 2, 1); R(g, sh(0.1), x, y + q.h, q.w, 1); }
      drawSprite(g, q.img, x, y);
    });
    g.drawImage(room.bgc, 0, 0, VW, VH);
    // wall items first (behind furniture), then furniture with items on its surfaces
    L.surfs.forEach(s => { if (s.r === r && s.t === 'wall') drawItems(byS.get(s.i), 1); });
    g.drawImage(room.fgc, 0, 0, VW, VH);
    room.surf.forEach(s => { if (s.t === 'line' && !s.floor && !s.cont) drawItems(byS.get(s.i), s.hang); });
    room.cont.forEach(c => { const op = open.has(c.i); drawCont(g, c, op); if (op) { c.lines.forEach(s => drawItems(byS.get(s.i))); drawContFront(g, c); } });
    if (o.hints) o.hints(g);
    room.surf.forEach(s => { if (s.floor) drawItems(byS.get(s.i)); });
    if (!o.noBoxes) {
      L.boxes.forEach((b, bi) => {
        if (b.r !== r) return; const st = S.b[bi][0], an = o.anim && o.anim[bi];
        const fold = an && an.fold != null ? an.fold : 0;
        if (st === 2 && !(an && an.fold != null && an.fold < 1)) return;
        R(g, sh(0.25), b.x - 1, b.y - 0.5, b.w + 3, 1.5);
        boxShape(g, b, st === 2 ? 1 : st, an && an.open != null ? an.open : 1, fold, o.boxHi === bi);
      });
      drawItems(byS.get('box'));
    }
    // daylight through the window
    const win = room.surf.find(s => s.sill);
    if (win) {
      g.save(); g.globalCompositeOperation = 'lighter';
      const sw = win.x1 - win.x0, dx = sw * 0.5;
      g.fillStyle = 'rgba(255,214,140,.05)'; g.beginPath(); g.moveTo(win.x0 + 2, win.y - (win.clear > 14 ? 30 : 12)); g.lineTo(win.x1 - 2, win.y - (win.clear > 14 ? 30 : 12)); g.lineTo(win.x1 + dx, VH); g.lineTo(win.x0 + dx * 0.5, VH); g.closePath(); g.fill();
      g.fillStyle = 'rgba(255,220,150,.05)'; g.beginPath(); g.moveTo(win.x0 + 4, win.y); g.lineTo(win.x1 - 4, win.y); g.lineTo(win.x1 + dx - 6, VH); g.lineTo(win.x0 + dx * 0.5 + 6, VH); g.closePath(); g.fill();
      if (o.t != null) { g.fillStyle = 'rgba(255,240,200,.5)'; for (let k = 0; k < 7; k++) { const tt = o.t / 1000 * (0.12 + k * 0.02) + k * 0.37, fy = (tt % 1), mx = win.x0 + 6 + fy * 22 + ((k * 13) % (win.x1 - win.x0 - 8)), my = win.y + fy * (VH - win.y - 6) + Math.sin(tt * 6 + k) * 2; g.fillRect(Math.round(mx * 2) / 2, Math.round(my * 2) / 2, 0.5, 0.5); } }
      g.restore();
    }
    g.fillStyle = 'rgba(255,190,120,.045)'; g.fillRect(0, 0, VW, VH);
  }

  /* ---------- sounds ---------- */
  function mkSnd(api, opt) {
    const on = () => opt.sound;
    const T = (f, d, o) => on() && api.tone(f, d, o), N = (d, o) => on() && api.noise(d, o);
    return {
      tape() { for (let i = 0; i < 10; i++) N(0.03, { at: i * 0.022, ft: 'bandpass', f: 2200 + Math.random() * 2600, q: 2, vol: 0.09, decay: 1 }); N(0.1, { at: 0.26, ft: 'lowpass', f: 420, vol: 0.12, decay: 1 }); N(0.1, { at: 0.36, ft: 'lowpass', f: 380, vol: 0.1, decay: 1 }); },
      pop() { T(480, 0.09, { type: 'sine', to: 900, vol: 0.06 }); },
      pick() { T(620, 0.05, { type: 'sine', to: 820, vol: 0.035 }); },
      nope() { T(330, 0.1, { type: 'sine', vol: 0.06 }); T(262, 0.16, { type: 'sine', vol: 0.06, at: 0.1 }); },
      slide() { N(0.14, { ft: 'bandpass', f: 600, q: 1, vol: 0.08, attack: 0.03, release: 0.07 }); T(180, 0.05, { type: 'triangle', vol: 0.05, at: 0.12, decay: 1 }); },
      fold() { N(0.18, { ft: 'lowpass', f: 700, vol: 0.1, decay: 1 }); N(0.12, { at: 0.16, ft: 'lowpass', f: 500, vol: 0.09, decay: 1 }); },
      boing() { T(300, 0.12, { type: 'sine', to: 520, vol: 0.05 }); },
      step() { N(0.06, { ft: 'lowpass', f: 300, vol: 0.08, decay: 1 }); N(0.06, { at: 0.16, ft: 'lowpass', f: 260, vol: 0.07, decay: 1 }); },
      place(mat) {
        if (mat === 'plush') { N(0.12, { ft: 'lowpass', f: 320, vol: 0.12, decay: 1 }); T(110, 0.1, { type: 'sine', to: 70, vol: 0.06, decay: 1 }); }
        else if (mat === 'glass') { T(2600, 0.35, { type: 'sine', vol: 0.045, decay: 1 }); T(3900, 0.22, { type: 'sine', vol: 0.03, decay: 1, at: 0.012 }); }
        else if (mat === 'paper') { N(0.14, { ft: 'highpass', f: 2800, vol: 0.07, attack: 0.03, release: 0.08 }); N(0.07, { at: 0.08, ft: 'bandpass', f: 4000, vol: 0.05, decay: 1 }); }
        else if (mat === 'metal') { T(1400, 0.25, { type: 'triangle', vol: 0.05, decay: 1 }); T(2110, 0.18, { type: 'sine', vol: 0.03, decay: 1 }); }
        else if (mat === 'wood') { T(330, 0.08, { type: 'triangle', vol: 0.08, decay: 1 }); N(0.03, { ft: 'bandpass', f: 900, q: 2, vol: 0.1, decay: 1 }); }
        else if (mat === 'cloth') { N(0.16, { ft: 'lowpass', f: 900, vol: 0.09, attack: 0.04, release: 0.1 }); }
        else if (mat === 'rubber') { T(900, 0.08, { type: 'square', to: 1300, vol: 0.025 }); T(1300, 0.1, { type: 'square', to: 800, vol: 0.02, at: 0.08 }); }
        else if (mat === 'ball') { T(150, 0.09, { type: 'sine', to: 90, vol: 0.09, decay: 1 }); T(140, 0.07, { type: 'sine', to: 90, vol: 0.05, decay: 1, at: 0.16 }); T(130, 0.05, { type: 'sine', to: 90, vol: 0.03, decay: 1, at: 0.26 }); }
        else if (mat === 'bell') { [72, 76, 79].forEach((n, k) => T(api.midi(n), 0.3, { type: 'triangle', vol: 0.04, decay: 1, at: k * 0.07 })); }
        else { N(0.03, { ft: 'bandpass', f: 2400, q: 4, vol: 0.12, decay: 1 }); T(1200, 0.03, { type: 'square', vol: 0.02, decay: 1 }); }
      },
      jingle() { [72, 76, 79, 84, 81, 84, 88].forEach((n, i) => { T(api.midi(n), 0.9, { at: i * 0.14, type: 'triangle', vol: 0.06, decay: 1 }); T(api.midi(n - 12), 1.1, { at: i * 0.14, type: 'sine', vol: 0.035, decay: 1 }); }); }
    };
  }
  const SONG = { mel: [65, null, 69, 72, 70, null, 69, 65, 67, null, 65, 62, 64, null, null, null, 65, null, 69, 72, 74, null, 72, 69, 70, 69, 67, 64, 65, null, null, null], bass: [41, 38, 46, 48, 41, 38, 46, 41], step: 0.46, lead: 'triangle', leadVol: 0.03, bassVol: 0.045, bassType: 'sine', hold: 1.4, gain: 0.45 };

  /* ---------- the app ---------- */
  (window.RETRO_APPS = window.RETRO_APPS || []).push({
    id: 'movingday', label: 'Moving Day', kind: 'store', cat: 'game', year: 1995, price: 19.95, sizeKB: 6200,
    help: 'Unpack moving boxes room by room and put things anywhere you like; the rooms keep themselves tidy, and My Places keeps every home you have finished.',
    publisher: 'Cozy Corner Software', genre: 'Relaxing / Puzzle',
    tagline: 'Four moves. One life. Zero wrong answers.',
    blurb: 'Grow up one move at a time. Unpack a seven-year-old\'s bedroom, bathroom and playroom in 1985, a new house with a kitchen and garage in 1990, a teenager\'s room, rec room and hall closet in 1995 and a first apartment in 2000. Every box is labeled with its room, and everything goes anywhere it fits: shelves, drawers, cupboards, hooks, windowsills, walls. The rooms tidy themselves as you go, and My Places keeps every home you have made. No timers, no mistakes, just a warm afternoon of unpacking.',
    box: { bg: '#e9c48a', fg: '#4a2c14', accent: '#d9534f' },
    icon: '<svg viewBox="0 0 32 32" shape-rendering="crispEdges" aria-hidden="true"><rect x="3" y="14" width="26" height="15" fill="#c8955a" stroke="#6a4222"/><path d="M3 14l-2-5h11l2 5zM29 14l2-5H20l-2 5z" fill="#dcae74" stroke="#6a4222"/><rect x="4" y="15" width="24" height="3" fill="#5a3a1a"/><g fill="#a8703c"><rect x="11" y="5" width="10" height="10"/><rect x="10" y="3" width="3" height="3"/><rect x="19" y="3" width="3" height="3"/></g><rect x="13" y="8" width="1" height="1" fill="#2b1d14"/><rect x="18" y="8" width="1" height="1" fill="#2b1d14"/><rect x="14" y="10" width="4" height="3" fill="#e2b27a"/><rect x="15" y="10" width="2" height="1" fill="#2b1d14"/><rect x="7" y="21" width="8" height="1" fill="#6a4222"/><rect x="8" y="23" width="6" height="1" fill="#6a4222"/></svg>',
    window: { w: 760, h: 600 },
    css: `.mvd{display:flex;flex-direction:column;height:100%;background:#d4d0c8;font-family:var(--ui);user-select:none;-webkit-user-select:none}
      .mvd-top{display:flex;align-items:center;gap:4px;padding:3px 4px;flex-wrap:wrap;border-bottom:1px solid #808080}
      .mvd-top .btn{min-width:0;padding:3px 8px}
      .mvd-tabs{display:flex;gap:2px;flex-wrap:wrap}
      .mvd-tab{padding:3px 7px;border:1px solid #808080;background:#c8c4bc;cursor:pointer;font:inherit;border-radius:3px 3px 0 0;white-space:nowrap}
      .mvd-tab.on{background:#fffbe8;font-weight:bold}
      .mvd-tab.done{color:#347038}
      .mvd-tab.hot,.mvd-dr.hot{background:#fff2a8;outline:2px solid #c19a2e}
      .mvd-info{margin-left:auto;font-size:12px;padding:0 4px;white-space:nowrap}
      .mvd.narrow .mvd-tabs{order:5;width:100%}
      .mvd.narrow .mvd-tab{flex:1;padding:6px 2px;font-size:12px;text-align:center}
      .mvd-stage{position:relative;flex:1;min-height:0;background:#3a2a20;overflow:hidden;touch-action:none}
      .mvd-cv{position:absolute;left:0;top:0;image-rendering:pixelated;image-rendering:crisp-edges;touch-action:none;display:block;cursor:default}
      .mvd-dr{position:absolute;top:50%;transform:translateY(-50%);z-index:2;width:30px;height:60px;border:1px solid #6a4222;background:rgba(255,251,232,.82);color:#6a4222;font:bold 22px/1 var(--ui);cursor:pointer;padding:0;display:none;align-items:center;justify-content:center;box-shadow:2px 2px 0 rgba(0,0,0,.3)}
      .mvd-dr.l{left:2px;border-radius:0 8px 8px 0}.mvd-dr.r{right:2px;border-radius:8px 0 0 8px}
      .mvd-dr.on{display:flex}
      .mvd-dr small{position:absolute;top:100%;margin-top:3px;font:bold 10px var(--ui);background:rgba(255,251,232,.9);padding:1px 3px;white-space:nowrap;border:1px solid #6a4222}
      .mvd-dr.l small{left:0}.mvd-dr.r small{right:0}
      .mvd-visit{position:absolute;left:50%;top:6px;transform:translateX(-50%);z-index:2;background:rgba(255,251,232,.92);border:1px solid #6a4222;color:#2b1d14;padding:2px 4px 2px 10px;font-size:12px;display:none;align-items:center;gap:6px;white-space:nowrap;box-shadow:2px 2px 0 rgba(0,0,0,.3)}
      .mvd-visit.on{display:flex}
      .mvd-visit .btn{min-width:0;padding:2px 8px}
      .mvd-tip{position:absolute;left:50%;bottom:8px;transform:translateX(-50%);background:rgba(255,251,232,.95);border:1px solid #6a4222;color:#2b1d14;padding:3px 10px;font:18px/1.1 var(--dos);pointer-events:none;opacity:0;transition:opacity .25s;white-space:nowrap;max-width:94%;overflow:hidden;text-overflow:ellipsis;z-index:3}
      .mvd-tip.on{opacity:1}
      .mvd-ov{position:absolute;inset:0;display:none;align-items:center;justify-content:center;flex-direction:column;overflow:auto;padding:10px;box-sizing:border-box;z-index:4}
      .mvd-card,.mvd-photo,.mvd-hlp{justify-content:flex-start}
      .mvd-ov.on{display:flex}
      .mvd-card>:first-child,.mvd-photo>:first-child,.mvd-hlp>:first-child{margin-top:auto}.mvd-card>:last-child,.mvd-photo>:last-child,.mvd-hlp>:last-child{margin-bottom:auto}
      .mvd-card{background:rgba(30,20,14,.88);color:#fbe6b8;text-align:center;cursor:pointer}
      .mvd-card .yr{font:400 76px/1 var(--dos);color:#ffd27a;text-shadow:3px 3px 0 #6a4222;animation:mvdIn .8s ease-out}
      .mvd-card .ln{font:28px/1.2 var(--dos);margin-top:6px;animation:mvdIn 1.2s ease-out}
      .mvd-card .ag{font:20px var(--dos);color:#c9a878;margin-top:6px}
      .mvd-card .rm{font:17px var(--dos);color:#e9dcc0;margin-top:10px;animation:mvdIn 1.6s ease-out}
      @keyframes mvdIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
      .mvd-sel,.mvd-plc{background:#e9dcc0;justify-content:flex-start;gap:8px}
      .mvd-plc{background:#c9a878 repeating-linear-gradient(0deg,rgba(255,255,255,.05) 0 2px,rgba(0,0,0,.03) 2px 4px)}
      .mvd-logo{font:400 44px/1 var(--dos);color:#6a4222;text-shadow:2px 2px 0 #f4cf55;margin-top:4px;text-align:center}
      .mvd-sub{font:18px var(--dos);color:#6a4222;margin-bottom:4px;text-align:center}
      .mvd-note{background:#fffbe8;border:2px solid #c19a2e;padding:6px 10px;max-width:520px;font-size:12px;line-height:1.4;color:#2b1d14}
      .mvd-grid{display:grid;grid-template-columns:repeat(2,minmax(0,220px));gap:10px;width:100%;justify-content:center}
      .mvd-grid.w4{grid-template-columns:repeat(4,minmax(0,200px))}
      .mvd-lv{background:#fffbe8;border:2px solid #6a4222;padding:6px;display:flex;flex-direction:column;gap:4px;cursor:pointer;text-align:left;font:inherit;color:#2b1d14;box-shadow:3px 3px 0 rgba(0,0,0,.25)}
      .mvd-lv canvas{width:100%;image-rendering:pixelated;display:block;border:1px solid #6a4222}
      .mvd-lv b{font:24px/1 var(--dos);color:#6a4222}
      .mvd-lv small{font-size:11px;color:#5a4a3a}
      .mvd-lv.lock{filter:grayscale(1);opacity:.55;cursor:default}
      .mvd-lv .st{font-size:11px;font-weight:bold;color:#347038}
      .mvd-row{display:flex;gap:6px;flex-wrap:wrap;justify-content:center}
      .mvd-yrs{display:flex;gap:4px;flex-wrap:wrap;justify-content:center}
      .mvd-yrs .btn{min-width:64px;font:20px var(--dos);padding:2px 10px}
      .mvd-yrs .btn.on{background:#fffbe8;box-shadow:inset 1px 1px 0 #808080;font-weight:bold}
      .mvd-book{display:grid;grid-template-columns:repeat(2,minmax(0,250px));gap:14px 10px;justify-content:center;width:100%;padding:6px 0 10px}
      .mvd-book .mvd-pol{margin:0;cursor:pointer;animation:none}
      .mvd-book .mvd-pol:hover{outline:3px solid #f4cf55}
      .mvd-empty{font:20px/1.3 var(--dos);color:#4a2c14;text-align:center;max-width:380px;padding:30px 10px}
      .mvd-photo{background:rgba(30,20,14,.9)}
      .mvd-pics{position:relative;width:min(96%,560px);display:flex;justify-content:center;align-items:center;flex-wrap:wrap;gap:0}
      .mvd-pol{background:#fbf8f0;padding:7px 7px 30px;box-shadow:4px 6px 14px rgba(0,0,0,.5);position:relative;animation:mvdDrop .7s ease-out both;margin:4px -6px;box-sizing:border-box}
      .mvd-pol canvas{display:block;image-rendering:pixelated;width:100%}
      .mvd-pol span{position:absolute;left:0;right:0;bottom:6px;text-align:center;font:16px "Comic Sans MS","Chalkboard SE",cursive;color:#2c3a7a;white-space:nowrap;overflow:hidden}
      .mvd-pol i{position:absolute;top:-7px;left:50%;width:40px;height:14px;margin-left:-20px;background:rgba(255,250,220,.6);transform:rotate(-4deg);box-shadow:0 1px 2px rgba(0,0,0,.15)}
      @keyframes mvdDrop{from{opacity:0;transform:translateY(-30px) rotate(-8deg) scale(1.1)}}
      .mvd-msg{color:#fbe6b8;font:22px/1.2 var(--dos);margin:12px 0 8px;text-align:center}
      .mvd-help{background:#fffbe8;border:2px solid #6a4222;padding:10px 12px;max-width:440px;font-size:13px;line-height:1.45;color:#2b1d14}
      .mvd-help h3{margin:0 0 6px;font:26px var(--dos);color:#6a4222}
      .mvd-help p{margin:0 0 6px}`,
    open(W, api) {
      const opt = Object.assign({ music: true, sound: true, hints: true }, api.load('opt', {}));
      const snd = mkSnd(api, opt);
      const prog = Object.assign({ un: 1, paid: [0, 0, 0, 0], done: [0, 0, 0, 0], cur: 0 }, api.load('prog', {}));
      W.body.innerHTML = `<div class="mvd"><div class="mvd-top"><button class="btn" data-a="levels">Moves</button><button class="btn" data-a="places">My Places</button><button class="btn" data-a="undo">Undo</button><button class="btn" data-a="zoom" style="display:none">Zoom</button><div class="mvd-tabs"></div><span class="mvd-info"></span></div>
        <div class="mvd-stage"><canvas class="mvd-cv" width="${VW * K}" height="${VH * K}"></canvas>
        <button class="mvd-dr l" aria-label="Previous room"></button><button class="mvd-dr r" aria-label="Next room"></button>
        <div class="mvd-visit"><span></span><button class="btn" data-v="edit">Rearrange</button><button class="btn" data-v="book">Scrapbook</button></div><div class="mvd-tip"></div>
        <div class="mvd-ov mvd-card"></div><div class="mvd-ov mvd-sel"></div><div class="mvd-ov mvd-plc"></div><div class="mvd-ov mvd-photo"></div><div class="mvd-ov mvd-hlp" style="background:rgba(30,20,14,.7)"></div></div></div>`;
      const $ = s => W.body.querySelector(s);
      const root = $('.mvd'), cv = $('.mvd-cv'), g = ctx2(cv), stage = $('.mvd-stage'), tipEl = $('.mvd-tip'), tabsEl = $('.mvd-tabs'), infoEl = $('.mvd-info');
      const ovCard = $('.mvd-card'), ovSel = $('.mvd-sel'), ovPlc = $('.mvd-plc'), ovPhoto = $('.mvd-photo'), ovHelp = $('.mvd-hlp'), visitEl = $('.mvd-visit');
      const drL = $('.mvd-dr.l'), drR = $('.mvd-dr.r');
      let li = -1, L = null, S = null, room = 0, open = new Set(), undo = [], disp = {}, anim = {}, drag = null, pend = null, wig = {}, raf = 0, saveT = 0, tipT = 0, cache = null, alive = true, finishing = false;
      let hoverTab = -1, hoverTabT = 0, hoverCont = -1, hoverContT = 0, musicOn = false, visit = null, plcYear = -1, migNote = '';
      let canZoom = false, zoomPref = opt.zoom == null ? null : !!opt.zoom, pan = -1, cw = 0, ch = 0, stW = 0, stH = 0, panDrag = null;

      /* --- persistence (v2: rooms). Old saves kept per-level layouts under 'lv0'..'lv3' with one or two rooms. --- */
      const KEY = i => 'house' + i;
      function saveNow() {
        if (!L || !S) return;
        const it = S.it.map((l, i) => l === -1 && drag && drag.i === i ? drag.from : l);
        api.save(KEY(li), { v: 2, b: S.b, it, c: S.c.map(v => v == null ? null : Math.round(v)), done: S.done });
      }
      const save = () => { clearTimeout(saveT); saveT = setTimeout(saveNow, 250); };
      const saveProg = () => api.save('prog', prog);
      const loadLv = i => { const d = api.load(KEY(i), null); return valid(LV(i), d) ? d : null; };
      (function migrate() {
        if (prog.v === 2) return;
        let old = false, partial = false;
        for (let i = 0; i < 4; i++) {
          const o = api.load('lv' + i, null);
          if (o != null) { old = true; if (!o.done && !prog.done[i] && Array.isArray(o.b) && o.b.some(q => q && q[0])) partial = true; api.save('lv' + i, null); }
          if (prog.done[i] && !loadLv(i)) { old = true; const Sx = autoArrange(LV(i)); delete Sx.miss; api.save(KEY(i), Object.assign({ v: 2 }, Sx)); }
        }
        if (old || prog.done.some(Boolean)) migNote = 'Moving Day got bigger! Every move now has three or four rooms, with more shelves and lots more to unpack.' + (prog.done.some(Boolean) ? ' Moves you already finished have been unpacked for you: visit them in My Places and rearrange anything you like.' : '') + (partial ? ' The move you were partway through starts fresh with its new rooms.' : '');
        prog.v = 2; saveProg();
      })();

      /* --- music --- */
      function music(onoff) {
        if (onoff && opt.music) { if (!musicOn) { api.playMusic(SONG); musicOn = true; } }
        else if (musicOn) { api.stopMusic(); musicOn = false; }
      }

      /* --- layout + helpers --- */
      const inval = () => { cache = null; };
      const rects = () => cache || (cache = layoutRoom(L, S, room, open));
      function tip(t, ms) { tipEl.textContent = t; tipEl.classList.add('on'); clearTimeout(tipT); tipT = setTimeout(() => tipEl.classList.remove('on'), ms || 1800); }
      const boxesLeft = r => L.boxes.filter((b, i) => (r == null || b.r === r) && S.b[i][0] !== 2).length;
      const narrow = () => root.classList.contains('narrow');
      function ui() {
        const anyDone = prog.done.some(Boolean);
        $('[data-a="places"]').style.display = anyDone ? '' : 'none';
        $('[data-a="undo"]').disabled = !L || !undo.length; $('[data-a="zoom"]').style.display = canZoom && L ? '' : 'none';
        if (!L) { tabsEl.innerHTML = ''; infoEl.textContent = ''; drL.classList.remove('on'); drR.classList.remove('on'); visitEl.classList.remove('on'); return; }
        tabsEl.innerHTML = L.rooms.map((rm, i) => { const n = boxesLeft(i); return `<button class="mvd-tab${i === room ? ' on' : ''}${n ? '' : ' done'}" data-r="${i}" title="${api.esc(rm.name)}">${api.esc(narrow() ? rm.short : rm.name)}${n ? ' (' + n + ')' : ''}</button>`; }).join('');
        const n = boxesLeft();
        infoEl.textContent = visit ? `My Places · ${L.year}` : `${L.year}` + (n ? ` · ${n} box${n > 1 ? 'es' : ''} to go` : ' · all unpacked');
        $('[data-a="undo"]').disabled = !undo.length;
        const nr = L.rooms.length, prev = (room + nr - 1) % nr, next = (room + 1) % nr;
        drL.dataset.r = prev; drR.dataset.r = next;
        drL.innerHTML = `&lsaquo;<small>${api.esc(L.rooms[prev].short)}</small>`; drR.innerHTML = `&rsaquo;<small>${api.esc(L.rooms[next].short)}</small>`;
        drL.title = 'Go to the ' + L.rooms[prev].name.toLowerCase(); drR.title = 'Go to the ' + L.rooms[next].name.toLowerCase();
        drL.classList.toggle('on', nr > 1); drR.classList.toggle('on', nr > 1);
        visitEl.classList.toggle('on', !!visit);
        if (visit) { visitEl.querySelector('span').textContent = visit.edit ? 'Rearranging. Changes are saved.' : `${L.rooms[room].name}, ${L.year}`; visitEl.querySelector('[data-v="edit"]').textContent = visit.edit ? 'Done' : 'Rearrange'; }
      }
      function setRoom(r) { if (!L || r === room || r < 0 || r >= L.rooms.length) return; room = r; open = new Set(); inval(); disp = {}; snd.step(); pan = -1; place(); ui(); if (!drag) tip(visit ? `${L.rooms[r].name}, ${L.year}` : L.rooms[r].name + (boxesLeft(r) ? '' : ' (all unpacked)'), 1200); }

      /* --- geometry --- */
      function vpt(e) { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * VW / r.width, y: (e.clientY - r.top) * VH / r.height }; }
      function hitItem(p) {
        let best = null, bd = 1e9;
        rects().forEach(q => {
          if (q.hidden) return;
          const cx = q.x + q.w / 2, cy = q.y + q.h / 2, hw = Math.max(q.w, 15) / 2 + 1, hh = Math.max(q.h, 15) / 2 + 1;
          if (Math.abs(p.x - cx) <= hw && Math.abs(p.y - cy) <= hh) {
            const inside = p.x >= q.x && p.x < q.x + q.w && p.y >= q.y && p.y < q.y + q.h;
            const d = (inside ? 0 : 1000) + Math.hypot(p.x - cx, p.y - cy) + (q.onBox ? -500 : 0);
            if (d < bd) { bd = d; best = q; }
          }
        });
        return best;
      }
      function hitBox(p) {
        for (let bi = L.boxes.length - 1; bi >= 0; bi--) { const b = L.boxes[bi]; if (b.r !== room || S.b[bi][0] === 2) continue; if (p.x >= b.x - 1 && p.x < b.x + b.w + 1 && p.y >= boxTop(b) - 3 && p.y < b.y + 1) return bi; }
        return -1;
      }
      function hitCont(p) {
        const cs = L.rooms[room].cont;
        for (const c of cs) { const op = open.has(c.i); const x0 = c.x - (op && c.t === 'door' && c.hinge === 'l' ? 4 : 0), x1 = c.x + c.w + (op && c.t === 'door' && c.hinge === 'r' ? 4 : 0); if (p.x >= x0 - 1 && p.x < x1 + 1 && p.y >= c.y - 1 && p.y < c.y + c.h + 3) return c; }
        return null;
      }
      const covered = bi => L.boxes.some((b, j) => b.under === bi && S.b[j][0] !== 2);

      /* --- boxes --- */
      function tapBox(bi) {
        const b = L.boxes[bi], st = S.b[bi];
        if (covered(bi)) { const top = L.boxes.findIndex(q => q.under === bi && S.b[L.boxes.indexOf(q)][0] !== 2); wig['b' + top] = performance.now(); snd.nope(); tip('Unpack the box on top first.'); return; }
        if (st[0] === 0) { st[0] = 1; anim[bi] = { open: 0, t0: performance.now() }; snd.tape(); tip('Tap the box again to take something out.'); save(); return; }
        const out = b.items.find(i => S.it[i] === 1);
        if (out != null) { wig[out] = performance.now(); snd.nope(); tip(`Put the ${L.items[out].n.toLowerCase()} somewhere first.`); return; }
        if (st[1] < b.items.length) {
          const i = b.items[st[1]++]; S.it[i] = 1; inval();
          const q = rects().find(r => r.i === i); if (q) disp[i] = { x: q.x, y: q.y + 8 };
          snd.pop(); tip(L.items[i].n); save();
        }
      }
      function checkFold(bi) {
        const b = L.boxes[bi], st = S.b[bi];
        if (st[0] === 1 && st[1] >= b.items.length && !b.items.some(i => S.it[i] === 1 || S.it[i] === -1)) {
          st[0] = 2; anim[bi] = { fold: 0, t0: performance.now() }; snd.fold(); inval(); ui();
          if (L.boxes.every((q, j) => S.b[j][0] === 2)) setTimeout(() => alive && finish(), 900);
          else if (boxesLeft(b.r) === 0) { const nx = L.rooms.findIndex((q, r) => boxesLeft(r) > 0); setTimeout(() => alive && tip(`${L.rooms[b.r].name} done! Next: the ${L.rooms[nx].name.toLowerCase()}.`, 2600), 700); }
        }
      }

      /* --- planning a drop --- */
      function plan(i, p) {
        const d = L.items[i], img = cvOf(d.spr), w = img.width, h = img.height;
        const x = p.x - drag.ox, y = p.y - drag.oy, bx = x + w / 2, by = y + h;
        const list = L.surfs.filter(s => s.r === room && surfActive(L, S, s, open));
        if (d.wall) {
          const cx = x + w / 2, cy = y + h / 2;
          let z = list.find(s => s.t === 'wall' && cx >= s.x0 && cx <= s.x1 && cy >= s.y0 && cy <= s.y1);
          if (!z) { let bd = 12; list.forEach(s => { if (s.t !== 'wall') return; const dx = Math.max(s.x0 - cx, 0, cx - s.x1), dy = Math.max(s.y0 - cy, 0, cy - s.y1), dd = Math.hypot(dx, dy); if (dd < bd) { bd = dd; z = s; } }); }
          if (!z) return { valid: false, none: 1, reason: 'Hang that on a bare bit of wall.' };
          if (w > z.x1 - z.x0 || h > z.y1 - z.y0) return { valid: false, s: z, reason: 'Too big for that bit of wall.' };
          const others = rects().filter(q => q.s && q.s.t === 'wall' && q.i !== i);
          let sx = z.x0 + Math.round((x - z.x0) / 4) * 4, sy = z.y0 + Math.round((y - z.y0) / 4) * 4;
          others.forEach(q => { if (Math.abs(q.y - sy) <= 4) sy = q.y; else if (Math.abs(q.y + q.h / 2 - (sy + h / 2)) <= 3) sy = Math.round(q.y + q.h / 2 - h / 2); if (Math.abs(q.x + q.w / 2 - (sx + w / 2)) <= 3) sx = Math.round(q.x + q.w / 2 - w / 2); });
          const fit = (xx, yy) => { xx = clamp(xx, z.x0, z.x1 - w); yy = clamp(yy, z.y0, z.y1 - h); return others.some(q => xx < q.x + q.w + 2 && xx + w + 2 > q.x && yy < q.y + q.h + 2 && yy + h + 2 > q.y) ? null : [xx, yy]; };
          let pos = fit(sx, sy);
          for (let rad = 1; !pos && rad <= 4; rad++) for (let dy = -rad; dy <= rad && !pos; dy++) for (let dx = -rad; dx <= rad && !pos; dx++) if (Math.max(Math.abs(dx), Math.abs(dy)) === rad) pos = fit(sx + dx * 4, sy + dy * 4);
          if (!pos) return { valid: false, s: z, reason: 'No room there.' };
          return { valid: true, wall: 1, s: z, x: pos[0], y: pos[1], rect: { x: pos[0], y: pos[1], w, h, img } };
        }
        // line surfaces: the nearest line under (or just above) the item's bottom edge; hooks and bars near its top
        let best = null, bs = 1e9;
        list.forEach(s => {
          if (s.t !== 'line' || (s.hang && !d.hang)) return;
          if (bx < s.x0 - 3 || bx > s.x1 + 3) return;
          let sc;
          if (s.hang) { const up = y - s.y; if (up < -10 || up > 12) return; sc = Math.abs(up) - 4; }
          else { const up = s.y - by, reach = s.floor ? 40 : Math.min(s.clear, 36) + 4; if (up < -8 || up > reach) return; sc = up >= 0 ? up : -up * 3; }
          if (sc < bs) { bs = sc; best = s; }
        });
        if (!best) {
          const onWall = list.some(s => s.t === 'wall' && bx >= s.x0 && bx <= s.x1 && y + h / 2 >= s.y0 && y + h / 2 <= s.y1);
          return { valid: false, none: 1, reason: onWall ? 'Only pictures and posters go on the wall.' : 'Drop it on a surface.' };
        }
        const s = best, slots = getSlots(S, s.i), cur = layoutLine(L, s, slots, S.c[s.i]);
        const lay0 = formOf(L, i, 0, s.clear, s);
        if (lay0.img.height > s.clear + 0.5) return { valid: false, s, reason: s.hang ? 'Too long to hang there.' : 'Too tall to fit there.' };
        // stack on something?
        if (d.stk && !s.hang) {
          const j = cur.boxes.findIndex(b => bx >= b.x - 1 && bx <= b.x + b.w + 1 && by <= b.top + Math.max(3, (s.y - b.top) / 2) && b.items.every(k => L.items[k].stk === d.stk));
          if (j >= 0) {
            const ns = slots.map(q => q.slice()); ns[j].push(i);
            const lay = layoutLine(L, s, ns, S.c[s.i]);
            if (!lay.ok || ns[j].length > 8) return { valid: false, s, reason: lay.tall || ns[j].length > 8 ? 'That pile is as high as it goes.' : 'No room to lay it flat there.' };
            return { valid: true, s, slots: ns, c: S.c[s.i], rect: lay.rects.find(q => q.i === i), stack: 1 };
          }
        }
        let idx = cur.boxes.filter(b => b.x + b.w / 2 < bx).length;
        const runs = []; cur.boxes.forEach((b, j) => { if (b.row && j && cur.boxes[j - 1].row === b.row) runs[runs.length - 1].e = j; else if (b.row) runs.push({ row: b.row, s: j, e: j }); });
        if (d.row && !lay0.lay && !s.hang) {
          let br = null, bd = 1e9;
          runs.filter(r => r.row === d.row).forEach(r => { const x0 = cur.boxes[r.s].x, x1 = cur.boxes[r.e].x + cur.boxes[r.e].w, dd = bx < x0 ? x0 - bx : bx > x1 ? bx - x1 : 0; if (dd < bd) { bd = dd; br = r; } });
          if (br) idx = clamp(idx, br.s, br.e + 1);
        } else {
          const r = runs.find(r => idx > r.s && idx <= r.e);
          if (r) { const mid = (cur.boxes[r.s].x + cur.boxes[r.e].x + cur.boxes[r.e].w) / 2; idx = bx < mid ? r.s : r.e + 1; }
        }
        const ns = slots.map(q => q.slice()); ns.splice(idx, 0, [i]);
        const c = clamp(bx, s.x0, s.x1), lay = layoutLine(L, s, ns, c);
        if (!lay.ok && d.stk && !lay.tall && !s.hang) {
          // no room beside: pile it on a matching stack under the pointer instead
          const j = cur.boxes.findIndex(b => bx >= b.x - 2 && bx <= b.x + b.w + 2 && b.items.every(k => L.items[k].stk === d.stk));
          if (j >= 0) { const st = slots.map(q => q.slice()); st[j].push(i); const l2 = layoutLine(L, s, st, S.c[s.i]); if (l2.ok && st[j].length <= 8) return { valid: true, s, slots: st, c: S.c[s.i], rect: l2.rects.find(q => q.i === i), stack: 1 }; }
        }
        if (!lay.ok) return { valid: false, s, reason: lay.tall ? 'Too tall to fit there.' : s.hang ? 'No free hook there.' : 'No room there. Try another spot.' };
        return { valid: true, s, slots: ns, c, rect: lay.rects.find(q => q.i === i) };
      }
      function commit(i, pl) {
        if (pl.wall) S.it[i] = [pl.s.i, pl.x, pl.y];
        else { pl.slots.forEach((q, j) => q.forEach((k, n) => { S.it[k] = [pl.s.i, j, n]; })); S.c[pl.s.i] = pl.c; }
        inval();
      }

      /* --- pointer --- */
      function startDrag(q, p, e) {
        const i = q.i, touch = e.pointerType !== 'mouse';
        undo.push(JSON.stringify(S)); if (undo.length > 60) undo.shift();
        drag = { i, from: S.it[i], ox: touch ? q.w / 2 : p.x - q.x, oy: touch ? q.h + 7 : p.y - q.y, p, touch, pl: null, fromBox: S.it[i] === 1 ? L.items[i].box : -1 };
        // a hanging coat is taller than its folded form: keep the grab point inside the sprite that is carried
        const img = cvOf(L.items[i].spr); if (!touch) { drag.ox = clamp(drag.ox, 0, img.width); drag.oy = clamp(drag.oy, 0, img.height); }
        S.it[i] = -1; inval(); snd.pick(); tip(L.items[i].n, 1400);
        drag.pl = plan(i, p);
      }
      function endDrag(cancel) {
        const d = drag; if (!d) return; drag = null;
        const i = d.i, pl = cancel ? null : d.pl, x = d.p.x - d.ox, y = d.p.y - d.oy;
        if (pl && pl.valid) {
          commit(i, pl); disp[i] = { x, y };
          snd.place(L.items[i].mat);
          if (d.fromBox >= 0) checkFold(d.fromBox);
          save();
          if (JSON.stringify(S) === undo[undo.length - 1]) undo.pop();
        } else {
          S.it[i] = d.from; undo.pop(); inval(); disp[i] = { x, y };
          if (!cancel) { wig[i] = performance.now(); snd.nope(); if (pl && pl.reason) tip(pl.reason, 2200); }
        }
        hoverTab = -1; hoverCont = -1; W.body.querySelectorAll('.hot').forEach(b => b.classList.remove('hot'));
        ui();
      }
      const busy = () => [ovSel, ovPlc, ovPhoto, ovHelp].some(o => o.classList.contains('on'));
      cv.addEventListener('pointerdown', e => {
        if (!L || finishing || e.button > 0 || busy()) return;
        if (!musicOn && opt.music) music(true);
        const p = vpt(e);
        try { cv.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ }
        const q = hitItem(p);
        if (q) { if (visit && !visit.edit) { wig['h' + q.i] = performance.now(); snd.boing(); tip(L.items[q.i].n + ' (tap Rearrange to move things)', 1600); return; } pend = { q, p, sx: e.clientX, sy: e.clientY, id: e.pointerId, e }; return; }
        const bi = hitBox(p); if (bi >= 0) { tapBox(bi); ui(); return; }
        const c = hitCont(p); if (c) { if (open.has(c.i)) open.delete(c.i); else open.add(c.i); snd.slide(); inval(); return; }
        if (cw > stW) panDrag = { x: e.clientX, p0: pan };
      });
      cv.addEventListener('pointermove', e => {
        if (panDrag) { pan = clamp(panDrag.p0 - (e.clientX - panDrag.x), 0, cw - stW); place(); return; }
        const p = vpt(e);
        if (pend && Math.hypot(e.clientX - pend.sx, e.clientY - pend.sy) > 4) { startDrag(pend.q, pend.p, pend.e); pend = null; }
        if (!drag) { if (e.pointerType === 'mouse' && L) cv.style.cursor = hitItem(p) || hitBox(p) >= 0 || hitCont(p) ? 'pointer' : 'default'; return; }
        drag.p = p; drag.cx = e.clientX; drag.cy = e.clientY; cv.style.cursor = 'grabbing';
        const now = performance.now();
        // hover a room tab or doorway arrow to carry the item to another room
        const el = document.elementFromPoint(e.clientX, e.clientY), tb = el && el.closest && el.closest('.mvd-tab,.mvd-dr');
        const r = tb && W.body.contains(tb) ? +tb.dataset.r : -1;
        if (r >= 0 && r !== room) { if (hoverTab !== r) { hoverTab = r; hoverTabT = now; W.body.querySelectorAll('.hot').forEach(b => b.classList.remove('hot')); tb.classList.add('hot'); } else if (now - hoverTabT > 450) { setRoom(r); hoverTab = -1; } }
        else if (hoverTab >= 0) { hoverTab = -1; W.body.querySelectorAll('.hot').forEach(b => b.classList.remove('hot')); }
        // hover a closed drawer or door to open it
        const c = hitCont(p);
        if (c && !open.has(c.i)) { if (hoverCont !== c.i) { hoverCont = c.i; hoverContT = now; } else if (now - hoverContT > 380) { open.add(c.i); snd.slide(); inval(); } }
        else hoverCont = -1;
        drag.pl = plan(drag.i, p);
        const why = drag.pl && !drag.pl.valid && drag.pl.s ? drag.pl.reason : '';
        if (why !== drag.why) { drag.why = why; if (why) tip(why, 1600); }
      });
      const up = e => {
        panDrag = null;
        if (pend) { const q = pend.q; pend = null; wig['h' + q.i] = performance.now(); snd.boing(); tip(L.items[q.i].n + ' (drag to move)', 1400); }
        if (drag) { drag.p = vpt(e); drag.pl = plan(drag.i, drag.p); endDrag(false); }
        cv.style.cursor = 'default';
      };
      cv.addEventListener('pointerup', up);
      cv.addEventListener('pointercancel', () => { pend = null; panDrag = null; endDrag(true); });
      cv.addEventListener('contextmenu', e => e.preventDefault());
      [drL, drR].forEach(b => b.addEventListener('click', () => { if (!drag) setRoom(+b.dataset.r); }));

      /* --- actions --- */
      function doUndo() {
        if (!undo.length || drag) return;
        S = JSON.parse(undo.pop()); anim = {}; inval(); disp = {}; snd.slide(); save(); ui(); tip('Undone.', 900);
      }
      function nextBox() {
        const bi = L.boxes.findIndex((b, j) => b.r === room && S.b[j][0] !== 2 && !covered(j) && !b.items.some(i => S.it[i] === 1));
        if (bi >= 0) { tapBox(bi); ui(); } else if (boxesLeft(room)) tip('Move the things on the boxes first.'); else if (boxesLeft()) tip('This room is done. Try another room.');
      }

      /* --- frame loop --- */
      function frame(t) {
        raf = requestAnimationFrame(frame);
        if (!L || busy()) return;
        if (drag && drag.cx != null && cw > stW) {
          // carry the view along when an item is dragged to the edge of a zoomed room
          const r = stage.getBoundingClientRect(), e = 30; let dp = 0;
          if (drag.cx < r.left + e) dp = -5; else if (drag.cx > r.right - e) dp = 5;
          const np = clamp(pan + dp, 0, cw - stW);
          if (np !== pan) { pan = np; place(); drag.p = vpt({ clientX: drag.cx, clientY: drag.cy }); drag.pl = plan(drag.i, drag.p); }
        }
        const R_ = rects();
        R_.forEach(q => {
          let d = disp[q.i]; if (!d) { disp[q.i] = { x: q.x, y: q.y }; return; }
          d.x += (q.x - d.x) * 0.3; d.y += (q.y - d.y) * 0.3;
          if (Math.abs(q.x - d.x) < 0.3) d.x = q.x; if (Math.abs(q.y - d.y) < 0.3) d.y = q.y;
        });
        const dispW = {};
        R_.forEach(q => {
          const d = disp[q.i]; let ox = 0, oy = 0;
          const w1 = wig[q.i]; if (w1 && t - w1 < 420) ox = Math.round(Math.sin((t - w1) / 30) * 2 * (1 - (t - w1) / 420));
          const w2 = wig['h' + q.i]; if (w2 && t - w2 < 300) oy = -Math.round(Math.sin((t - w2) / 300 * Math.PI) * 3);
          dispW[q.i] = { x: d.x + ox, y: d.y + oy };
        });
        const an = {};
        Object.keys(anim).forEach(k => { const a2 = anim[k], dt = t - a2.t0; if (a2.open != null) { an[k] = { open: Math.min(1, dt / 260) }; if (dt > 300) delete anim[k]; } else if (a2.fold != null) { an[k] = { fold: Math.min(1, dt / 550) }; if (dt > 600) { delete anim[k]; } } });
        let boxHi = -1;
        Object.keys(wig).forEach(k => { if (k[0] === 'b' && t - wig[k] < 420) boxHi = +k.slice(1); });
        drawRoom(g, L, S, room, { open, rects: R_, disp: dispW, anim: an, t, boxHi, held: drag ? drag.i : -2, hints: drag && opt.hints ? drawHints : null });
        if (drag) drawDrag(t);
      }
      function drawHints(gg) {
        const d = L.items[drag.i];
        L.surfs.forEach(s => {
          if (s.r !== room) return;
          if (s.t === 'wall') {
            if (!d.wall) return;
            gg.strokeStyle = 'rgba(255,245,190,.6)'; gg.lineWidth = 0.5; gg.setLineDash([1.5, 1.5]); gg.strokeRect(s.x0 + 0.25, s.y0 + 0.25, s.x1 - s.x0 - 0.5, s.y1 - s.y0 - 0.5); gg.setLineDash([]);
            return;
          }
          if (d.wall || (s.hang && !d.hang) || formOf(L, drag.i, 0, s.clear, s).img.height > s.clear) return;
          if (!surfActive(L, S, s, open)) {
            if (s.cont && s === s.cont.lines[s.cont.lines.length - 1] && !open.has(s.cont.i)) { gg.fillStyle = 'rgba(255,240,150,.3)'; gg.fillRect(s.cont.x, s.cont.y, s.cont.w, s.cont.h); gg.strokeStyle = 'rgba(255,245,190,.8)'; gg.lineWidth = 0.5; gg.strokeRect(s.cont.x + 0.25, s.cont.y + 0.25, s.cont.w - 0.5, s.cont.h - 0.5); }
            return;
          }
          if (!layoutLine(L, s, getSlots(S, s.i).concat([[drag.i]]), S.c[s.i]).ok) return;
          if (s.hang) { gg.fillStyle = 'rgba(255,245,170,.7)'; gg.fillRect(s.x0, s.y - 0.5, s.x1 - s.x0, 1); gg.fillStyle = 'rgba(255,245,170,.14)'; gg.fillRect(s.x0, s.y + 0.5, s.x1 - s.x0, 4); return; }
          gg.fillStyle = 'rgba(255,245,170,.6)'; gg.fillRect(s.x0, s.y - 1, s.x1 - s.x0, 1);
          gg.fillStyle = 'rgba(255,245,170,.16)'; gg.fillRect(s.x0, s.y - 4, s.x1 - s.x0, 3);
        });
      }
      function drawDrag(t) {
        const d = L.items[drag.i], img = cvOf(d.spr), pl = drag.pl;
        const x = Math.round((drag.p.x - drag.ox) * 2) / 2, y = Math.round((drag.p.y - drag.oy) * 2) / 2;
        if (pl && pl.rect) {
          g.save(); g.globalAlpha = 0.45 + 0.1 * Math.sin(t / 160);
          drawSprite(g, pl.rect.img, pl.rect.x, pl.rect.y); g.globalAlpha = 1;
          g.strokeStyle = pl.valid ? 'rgba(255,255,230,.9)' : 'rgba(230,80,60,.9)'; g.lineWidth = 0.5;
          g.strokeRect(pl.rect.x - 0.25, pl.rect.y - 0.25, pl.rect.w + 0.5, pl.rect.h + 0.5); g.restore();
        } else if (pl && pl.s && !pl.valid && pl.s.t === 'line') {
          g.fillStyle = 'rgba(230,80,60,.7)'; g.fillRect(pl.s.x0, pl.s.y - 1, pl.s.x1 - pl.s.x0, 1);
        } else if (pl && pl.s && !pl.valid && pl.s.t === 'wall') {
          g.strokeStyle = 'rgba(230,80,60,.7)'; g.lineWidth = 0.5; g.strokeRect(pl.s.x0 + 0.25, pl.s.y0 + 0.25, pl.s.x1 - pl.s.x0 - 0.5, pl.s.y1 - pl.s.y0 - 0.5);
        }
        g.drawImage(silhouette(hiOf(img)), x + 2, y + 3, img.width, img.height);
        drawSprite(g, img, x, y - 1);
      }

      /* --- screens --- */
      function hideOv() { [ovCard, ovSel, ovPlc, ovPhoto, ovHelp].forEach(o => o.classList.remove('on')); }
      function startLevel(i, restart, vis) {
        if (drag) endDrag(true);
        saveNow();
        li = i; L = LV(i); if (!vis) { prog.cur = i; saveProg(); }
        S = !restart && loadLv(i) || fresh(L);
        if (restart) { S = fresh(L); saveNow(); }
        visit = vis || null;
        room = vis && vis.room || 0; open = new Set(); undo = []; disp = {}; anim = {}; wig = {}; inval(); finishing = false; pan = -1; place();
        hideOv(); ui(); music(true);
        if (vis) { tip(`${L.rooms[room].name}, ${L.year}. Use the arrows to walk around.`, 2400); return; }
        const started = S.b.some(b => b[0]) || S.done;
        ovCard.innerHTML = `<div class="yr">${L.year}</div><div class="ln">${api.esc(L.title)}</div><div class="ag">${api.esc(L.sub)}${started ? '' : ' · tap a box to begin'}</div><div class="rm">${L.rooms.map(r => api.esc(r.name)).join(' · ')}</div>`;
        ovCard.classList.add('on');
        const t0 = setTimeout(() => ovCard.classList.remove('on'), started ? 1800 : 3200);
        ovCard.onclick = () => { clearTimeout(t0); ovCard.classList.remove('on'); };
      }
      function thumb(Lx, Sx, r, o) { const c = mkc(VW * K, VH * K); drawRoom(ctx2(c), Lx, Sx, r, o || {}); return c; }
      function showLevels() {
        if (drag) endDrag(true);
        saveNow(); hideOv();
        const cards = LEVELS.map((d, i) => {
          const lock = i >= prog.un, st = lock ? 'Locked' : prog.done[i] ? 'Unpacked' : loadLv(i) ? 'In progress' : 'Not started';
          return `<button class="mvd-lv${lock ? ' lock' : ''}" data-l="${i}" ${lock ? 'disabled' : ''}><span class="th"></span><b>${d.year}</b><small>${api.esc(d.title)} Age ${d.age}. ${d.rooms.length} rooms.</small><span class="st">${st}</span></button>`;
        }).join('');
        const anyDone = prog.done.some(Boolean);
        ovSel.innerHTML = `<div class="mvd-logo">Moving Day</div><div class="mvd-sub">Four moves. One life. Pick a year.</div>${migNote ? `<div class="mvd-note">${api.esc(migNote)}</div>` : ''}<div class="mvd-grid">${cards}</div><div class="mvd-row" style="margin:6px 0 4px">${anyDone ? '<button class="btn" data-a="places">My Places</button>' : ''}<button class="btn" data-a="how">How to play</button>${L ? '<button class="btn" data-a="back">Back to my room</button>' : ''}</div>`;
        ovSel.querySelectorAll('.mvd-lv').forEach(el => {
          const i = +el.dataset.l, Lx = LV(i), Sx = loadLv(i) || fresh(Lx);
          el.querySelector('.th').replaceWith(i < prog.un ? thumb(Lx, Sx, 0) : thumb(Lx, fresh(Lx), 0, { noBoxes: 1 }));
        });
        ovSel.classList.add('on'); fit();
        ui();
      }
      ovSel.addEventListener('click', e => {
        const b = e.target.closest('[data-l]'), a = e.target.closest('[data-a]');
        if (b && !b.disabled) { api.sfx.click(); migNote = ''; startLevel(+b.dataset.l); }
        else if (a && a.dataset.a === 'how') howTo();
        else if (a && a.dataset.a === 'places') { api.sfx.click(); migNote = ''; showPlaces(); }
        else if (a && a.dataset.a === 'back') { hideOv(); }
      });
      function polaroid(c, text, k) {
        const d = document.createElement('div'); d.className = 'mvd-pol'; d.style.transform = `rotate(${[-2.5, 2, -1.2, 2.8][k % 4]}deg)`;
        d.appendChild(c); const sp = document.createElement('span'); sp.textContent = text; d.appendChild(sp); d.appendChild(document.createElement('i'));
        return d;
      }
      function photoOf(Lx, Sx, r) {
        const c = thumb(Lx, Sx, r, { noBoxes: 1 }), gg = ctx2(c); gg.setTransform(K, 0, 0, K, 0, 0);
        gg.fillStyle = 'rgba(255,200,120,.10)'; gg.fillRect(0, 0, VW, VH);
        const rad = gg.createRadialGradient(VW / 2, VH / 2, VH * 0.4, VW / 2, VH / 2, VW * 0.72); rad.addColorStop(0, 'rgba(0,0,0,0)'); rad.addColorStop(1, 'rgba(60,30,10,.35)'); gg.fillStyle = rad; gg.fillRect(0, 0, VW, VH);
        return c;
      }
      // My Places: a scrapbook of every finished move, room by room, exactly as it was left
      function showPlaces(yr) {
        if (drag) endDrag(true);
        saveNow(); hideOv();
        const done = LEVELS.map((d, i) => i).filter(i => prog.done[i] && loadLv(i));
        if (yr == null) yr = done.includes(plcYear) ? plcYear : done.includes(li) ? li : done[done.length - 1];
        plcYear = yr == null ? -1 : yr;
        const years = LEVELS.map((d, i) => `<button class="btn${i === yr ? ' on' : ''}" data-y="${i}" ${done.includes(i) ? '' : 'disabled'}>${d.year}</button>`).join('');
        ovPlc.innerHTML = `<div class="mvd-logo">My Places</div><div class="mvd-sub">Every home you have unpacked.</div><div class="mvd-yrs">${years}</div>`
          + (yr == null ? '<div class="mvd-empty">Finish unpacking a move and its rooms will be kept here, just the way you left them.</div>'
            : `<div class="mvd-sub" style="margin:4px 0 0">${api.esc(LEVELS[yr].title)} Age ${LEVELS[yr].age}.</div><div class="mvd-book" data-n="${LEVELS[yr].rooms.length}"></div>`)
          + `<div class="mvd-row" style="margin:2px 0 6px">${yr == null ? '' : '<button class="btn" data-p="walk">Walk through</button>'}<button class="btn" data-p="moves">All moves</button>${L ? '<button class="btn" data-p="back">Close</button>' : ''}</div>`;
        if (yr != null) {
          const Lx = LV(yr), Sx = loadLv(yr), book = ovPlc.querySelector('.mvd-book');
          Lx.rooms.forEach((rm, r) => { const p = polaroid(photoOf(Lx, Sx, r), `${rm.name}, ${Lx.year}`, r); p.dataset.room = r; p.title = 'Visit the ' + rm.name.toLowerCase(); book.appendChild(p); });
        }
        ovPlc.classList.add('on'); fit(); ui();
      }
      function visitPlace(i, r) { startLevel(i, false, { room: r || 0, edit: false }); }
      ovPlc.addEventListener('click', e => {
        const y = e.target.closest('[data-y]'), p = e.target.closest('[data-p]'), pol = e.target.closest('.mvd-pol');
        if (y && !y.disabled) { api.sfx.click(); showPlaces(+y.dataset.y); }
        else if (pol) { api.sfx.click(); visitPlace(plcYear, +pol.dataset.room); }
        else if (p && p.dataset.p === 'walk') { api.sfx.click(); visitPlace(plcYear, 0); }
        else if (p && p.dataset.p === 'moves') showLevels();
        else if (p && p.dataset.p === 'back') hideOv();
      });
      visitEl.addEventListener('click', e => {
        const b = e.target.closest('[data-v]'); if (!b || !visit) return; api.sfx.click();
        if (b.dataset.v === 'edit') { visit.edit = !visit.edit; if (!visit.edit) { saveNow(); tip('Saved.', 900); } else tip('Drag anything to move it. Changes are saved.', 2000); ui(); }
        else { saveNow(); showPlaces(li); }
      });
      function finish() {
        if (finishing || !L || !S.b.every(b => b[0] === 2)) return;
        finishing = true; S.done = 1; saveNow();
        const first = !prog.done[li];
        prog.done[li] = 1; if (prog.un < li + 2) prog.un = Math.min(4, li + 2);
        let paid = 0;
        if (!prog.paid[li]) { prog.paid[li] = 1; paid = 1; api.earn(4, 'unpacking your new home'); }
        saveProg(); snd.jingle();
        const n = L.rooms.length, wpc = n <= 2 ? 'min(46%,250px)' : n === 3 ? 'min(32%,200px)' : 'min(46%,220px)';
        ovPhoto.innerHTML = `<div class="mvd-pics"></div><div class="mvd-msg"></div><div class="mvd-row"></div>`;
        const box = ovPhoto.querySelector('.mvd-pics');
        L.rooms.forEach((rm, r) => { const d = polaroid(photoOf(L, S, r), `${rm.name}, ${L.year}`, r); d.style.width = wpc; d.style.animationDelay = (r * 0.25) + 's'; box.appendChild(d); });
        ovPhoto.querySelector('.mvd-msg').textContent = (li === 3 ? 'All four moves done. Home at last.' : 'All unpacked!') + (paid ? ' You earned $4.' : '') + ' These photos are kept in My Places.';
        const row = ovPhoto.querySelector('.mvd-row');
        const btn = (t, fn) => { const b = document.createElement('button'); b.className = 'btn'; b.textContent = t; b.onclick = () => { api.sfx.click(); fn(); }; row.appendChild(b); };
        btn('Keep decorating', () => { ovPhoto.classList.remove('on'); finishing = false; });
        if (li < 3) btn(`Next move: ${LEVELS[li + 1].year} >`, () => startLevel(li + 1));
        btn('My Places', () => { finishing = false; showPlaces(li); });
        btn('All moves', () => { finishing = false; showLevels(); });
        setTimeout(() => { if (alive) ovPhoto.classList.add('on'); }, first ? 200 : 100);
        ui();
      }
      function howTo() {
        ovHelp.innerHTML = `<div class="mvd-help"><h3>How to play</h3>
          <p><b>Tap a box</b> to open it, then tap it again to take out the next thing. Each box says which room it belongs to.</p>
          <p><b>Drag</b> it anywhere it fits: beds, shelves, bookcases, nightstands, counters, windowsills, the floor, or inside a drawer or cupboard (tap one to open it, or hold an item over it). Coats, towels, bags and tools hang on hooks and bars. Posters, photos and clocks hang on the wall.</p>
          <p>The room tidies itself: things sit straight, spread out evenly, books and tapes line up, and plates, towels and games stack when you drop them on each other.</p>
          <p><b>Rooms:</b> use the tabs or the arrows at the sides to walk from room to room, and drag an item onto a tab or arrow to carry it along. When every box in every room is empty, you get photos of your new home and $4 the first time.</p>
          <p><b>My Places</b> keeps every move you have finished. Walk through the rooms again and rearrange anything; changes are saved.</p>
          <p>On a small screen, Zoom makes everything bigger; drag the bare wall or floor to look around. Keys: Space opens the next box, Ctrl+Z undoes, arrow keys switch rooms.</p>
          <div class="mvd-row"><button class="btn" data-a="ok">OK</button></div></div>`;
        ovHelp.classList.add('on');
        ovHelp.querySelector('[data-a="ok"]').onclick = () => { api.sfx.click(); ovHelp.classList.remove('on'); };
      }
      ovHelp.addEventListener('pointerdown', e => { if (e.target === ovHelp) ovHelp.classList.remove('on'); });

      /* --- chrome --- */
      W.body.querySelector('.mvd-top').addEventListener('click', e => {
        const b = e.target.closest('[data-a]'), t = e.target.closest('[data-r]');
        if (t) setRoom(+t.dataset.r);
        else if (b && b.dataset.a === 'undo') doUndo();
        else if (b && b.dataset.a === 'levels') showLevels();
        else if (b && b.dataset.a === 'places') showPlaces();
        else if (b && b.dataset.a === 'zoom') { zoomPref = !(cw > stW); opt.zoom = zoomPref; api.save('opt', opt); pan = -1; fit(); }
      });
      const toggle = k => { opt[k] = !opt[k]; api.save('opt', opt); if (k === 'music') music(opt.music); tip({ music: 'Music', sound: 'Sounds', hints: 'Hints' }[k] + (opt[k] ? ' on' : ' off'), 1000); };
      api.menubar([
        { label: 'Game', items: () => [
          { label: 'Unpack this move again...', fn: () => L && api.msgBox('Moving Day', `Put everything back in the boxes and start ${L.year} over?`, ['Yes', 'No'], 'warn').then(r => { if (r === 'Yes') startLevel(li, true); }), disabled: !L || !!visit },
          { label: 'Choose a move...', fn: showLevels },
          { label: 'My Places...', fn: () => showPlaces(), disabled: !prog.done.some(Boolean) },
          '-', { label: 'Undo', fn: doUndo, disabled: !undo.length },
          '-', { label: 'How to play', fn: howTo },
          '-', { label: 'Exit', fn: () => api.close() }] },
        { label: 'Options', items: () => [
          { label: (opt.music ? '✓ ' : '   ') + 'Music', fn: () => toggle('music') },
          { label: (opt.sound ? '✓ ' : '   ') + 'Sounds', fn: () => toggle('sound') },
          { label: (opt.hints ? '✓ ' : '   ') + 'Show hints (glow where it fits)', fn: () => toggle('hints') }] },
        { label: 'Help', items: [{ label: 'How to play', fn: howTo }, { label: 'About Moving Day', fn: () => api.msgBox('About Moving Day', 'Moving Day\nCozy Corner Software, 1995\n\nFour moves, fourteen rooms, one life, and nothing is ever in the wrong place.', ['OK']) }] }
      ]);
      W.onKey = e => {
        const k = e.key;
        if (k === 'Escape') { if (drag) { endDrag(true); e.preventDefault(); } else if (ovHelp.classList.contains('on')) ovHelp.classList.remove('on'); else if (ovCard.classList.contains('on')) ovCard.classList.remove('on'); return; }
        if (busy() || !L) return;
        if ((k === 'z' || k === 'Z') && (e.ctrlKey || e.metaKey) || k === 'u' || k === 'U') { e.preventDefault(); doUndo(); }
        else if (k === 'ArrowLeft') { e.preventDefault(); setRoom((room + L.rooms.length - 1) % L.rooms.length); }
        else if (k === 'ArrowRight') { e.preventDefault(); setRoom((room + 1) % L.rooms.length); }
        else if ((k === ' ' || k === 'Enter') && !visit) { e.preventDefault(); ovCard.classList.remove('on'); nextBox(); }
      };
      // Fit the room in the stage. On tall, narrow screens (phones) the room can be zoomed to the
      // stage height and panned sideways, so things are bigger to grab.
      function fit() {
        const r = stage.getBoundingClientRect(); if (!r.width || !r.height) return;
        stW = r.width; stH = r.height;
        const wasNarrow = narrow(); root.classList.toggle('narrow', stW < 560); if (wasNarrow !== narrow()) ui();
        let s = Math.min(stW / VW, stH / VH); const si = Math.floor(s);
        const zoomable = stH / VH > s * 1.3;
        if (zoomable && (zoomPref == null ? stW < 560 : zoomPref)) s = Math.min(stH / VH, s * 1.7);
        else if (si >= 2 && si / s > 0.86) s = si;
        cw = Math.floor(VW * s); ch = Math.floor(VH * s);
        cv.style.width = cw + 'px'; cv.style.height = ch + 'px';
        const gr = ovSel.querySelector('.mvd-grid'); if (gr) gr.classList.toggle('w4', stW >= 640);
        const bk = ovPlc.querySelector('.mvd-book'); if (bk) bk.style.gridTemplateColumns = stW >= 640 ? `repeat(${bk.dataset.n},minmax(0,${bk.dataset.n > 3 ? 175 : 210}px))` : '';
        const zb = $('[data-a="zoom"]'); canZoom = zoomable; zb.style.display = zoomable && L ? '' : 'none'; zb.textContent = cw > stW ? 'Zoom out' : 'Zoom in';
        place();
      }
      function place() {
        if (!cw) return;
        if (pan < 0) pan = Math.max(0, (cw - stW) / 2);
        pan = clamp(pan, 0, Math.max(0, cw - stW));
        cv.style.left = Math.round(cw <= stW ? (stW - cw) / 2 : -pan) + 'px'; cv.style.top = Math.round((stH - ch) / 2) + 'px';
      }
      W.onResize = () => setTimeout(fit, 0);
      W.onMin = () => { music(false); };
      const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null; if (ro) ro.observe(stage);
      W.onClose = () => { alive = false; cancelAnimationFrame(raf); clearTimeout(tipT); if (drag) endDrag(true); clearTimeout(saveT); saveNow(); if (ro) ro.disconnect(); api.stopMusic(); };
      // test hook (only with ?dev): lets automated tests find where things are, without a global
      if (/[?&]dev\b/.test(location.search)) stage.mvdDev = {
        get li() { return li; }, get room() { return room; }, get S() { return S; }, get L() { return L; }, open,
        rects: () => rects().map(q => ({ i: q.i, x: q.x, y: q.y, w: q.w, h: q.h, onBox: !!q.onBox, hidden: !!q.hidden })),
        miss: i => autoArrange(LV(i)).miss,
        stats: () => LEVELS.map((d, i) => LV(i).rooms.map((rm, r) => { const its = LV(i).items.filter(q => LV(i).boxes[q.box].r === r); return { room: rm.name, items: its.length, media: its.filter(q => /tape|disk|cartridge|CD$|DVD$|Video/.test(q.n)).length, kinds: [...new Set(its.map(q => q.n))].length, surfaces: rm.surf.filter(s => s.t === 'line' && !s.floor).length, boxes: LV(i).boxes.filter(b => b.r === r).length }; })),
        picture(i, r, mode, sc) {
          const Lx = LV(i), Sx = mode === 'full' ? autoArrange(Lx) : mode === 'saved' ? loadLv(i) : fresh(Lx), c = thumb(Lx, Sx, r, mode === 'open' ? { open: new Set(Lx.rooms[r].cont.map(q => q.i)), rects: layoutRoom(Lx, autoArrange(Lx), r, new Set(Lx.rooms[r].cont.map(q => q.i))) } : {});
          const z = mkc(c.width * (sc || 2), c.height * (sc || 2)), zg = ctx2(z); zg.drawImage(c, 0, 0, z.width, z.height); return z.toDataURL();
        },
        // where to drop item i (held at its center) so it lands on a sensible surface in the current room
        suggest(i) {
          const Sx = JSON.parse(JSON.stringify(S)); Sx.it[i] = 0;
          const act = s => !s.under || roomClear(L, S, s.r), got = placeItem(L, Sx, i, [room], { noCont: 1, act }) || placeItem(L, Sx, i, [room], { act }); if (!got) return null;
          const d = L.items[i], img = cvOf(d.spr);
          if (Array.isArray(got)) return { x: got[1] + img.width / 2, y: got[2] + img.height / 2 };
          const s = got.s, lay = layoutLine(L, s, got.ns, S.c[s.i]), q = lay.rects.find(r => r.i === i);
          const cont = s.cont ? { x: s.cont.x + s.cont.w / 2, y: s.cont.y + s.cont.h / 2, i: s.cont.i } : null;
          return { x: q.x + q.w / 2, y: s.hang ? s.y + img.height / 2 + 1 : (q.y + q.h) - img.height / 2 - (got.ns.find(z => z.includes(i)).length > 1 ? 1 : 0), cont, hang: !!s.hang, si: s.i };
        }
      };
      fit(); requestAnimationFrame(fit);
      raf = requestAnimationFrame(frame);
      showLevels();
    }
  });
})();
