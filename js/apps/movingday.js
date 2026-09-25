/* Moving Day: a store game (1995). A cozy unpacking game. The same kid moves four times (1985, 1990, 1995, 2000).
   Open the boxes, drag things anywhere they fit, and the room tidies itself: items snap onto surface lines,
   line up evenly, books and tapes form rows, plates and towels stack. There is no wrong place for anything.
   The room is drawn on a 200x150 pixel canvas and scaled up. */
(function () {
  'use strict';
  const VW = 200, VH = 150, WALL = 113, FLOOR = 146, BASE = 126;

  /* ---------- palette and pixel helpers ---------- */
  const P = {
    k: '#2b1d14', w: '#fbf6ea', g: '#bdb7ab', G: '#7a746a', d: '#4a4640', r: '#d0483a', R: '#8e2a22', o: '#ec9444',
    y: '#f4cf55', Y: '#c19a2e', b: '#a8703c', B: '#6a4222', t: '#e2b27a', e: '#62a84e', E: '#347038', u: '#4f7fd0',
    U: '#2c4888', c: '#9ad0ec', p: '#ee9fb8', P: '#8e5cb0', s: '#f3cda4', n: '#26262e', m: '#ddd1b4', M: '#ab9e80', a: '#5fb8a8'
  };
  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = n >> 8 & 255, b = n & 255;
    const m = f < 0 ? 0 : 255, t = Math.abs(f);
    r = Math.round(r + (m - r) * t); g = Math.round(g + (m - g) * t); b = Math.round(b + (m - b) * t);
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  }
  const R = (g, c, x, y, w, h) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const hash = (a, b) => { let h = Math.imul(a * 374761393 + b * 668265263, 1274126177); h ^= h >>> 13; return (h >>> 0) % 1000; };
  function mkc(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  // ASCII pixel art -> canvas. '.' is transparent; letters are palette keys (overrides first).
  function art(rows, over) {
    const h = rows.length, w = Math.max(...rows.map(r => r.length)), c = mkc(w, h), g = c.getContext('2d');
    rows.forEach((row, y) => { for (let x = 0; x < row.length; x++) { const ch = row[x]; if (ch === '.' || ch === ' ') continue; R(g, (over && over[ch]) || P[ch] || '#f0f', x, y, 1, 1); } });
    return c;
  }
  function pc(w, h, fn) { const c = mkc(w, h); fn(c.getContext('2d'), w, h); return c; }

  /* ---------- item art ---------- */
  const A = {
    teddy: ['.bb.....bb.', 'bBbb...bbBb', '.bbbbbbbbb.', '.bbkbbbkbb.', '.bbbtttbbb.', '..bbtktbb..', '...bbbbb...', '.bbbbbbbbb.', 'bbbbtttbbbb', 'bb.btttb.bb', '..bbbbbbb..', '.bbbb.bbbb.', '.BBB...BBB.'],
    robot: ['....r....', '....G....', '.GGGGGGG.', '.GcgggcG.', '.GgggggG.', '.GgrrrgG.', '.GGGGGGG.', 'GG.ggg.GG', 'Gg.gyg.gG', 'Gg.ggg.gG', '...ggg...', '..gg.gg..', '.GGG.GGG.'],
    lunch: ['....kkkk....', '....k..k....', 'kkkkkkkkkkkk', 'krrrrrrrrrrk', 'kryyyyyyyyrk', 'kryuuyyeeyrk', 'kryuuyyeeyrk', 'kryyyyyyyyrk', 'krrrrrrrrrrk', 'kkkkkkkkkkkk'],
    car: ['...uuuuu...', '..uccuccu..', 'uuuuuuuuuuy', 'uUuuuuuuuUu', '.kgk...kgk.', '..k.....k..'],
    blocks: ['...rrrrr...', '...rwrwr...', '...rrwrr...', '...rwrwr...', '...rrrrr...', 'uuuuu.eeeee', 'uwwwu.ewwwe', 'uwuuu.ewewe', 'uwwwu.ewwwe', 'uuuuu.eeeee'],
    piggy: ['..p....p...', '.ppppppppk.', 'pppppppppk.', 'ppkppppppk.', 'pppppppppppR', 'pppppppppppR', '.ppppppppp..', '..pp...pp...', '..RR...RR...'],
    ball: ['..rrrr..', '.rrwwrr.', 'rrwwwwrr', 'rrrrrrrr', 'uuuuuuuu', 'uuyyyyuu', '.uyyyyu.', '..uuuu..'],
    nlamp: ['..yyyy..', '.yyyyyy.', '.yywyyy.', 'yyyyyyyy', 'YYYYYYYY', '...BB...', '...BB...', '...BB...', '..BBBB..', '.BBBBBB.'],
    recorder: ['..kkkkkkkk..', 'kkkkkkkkkkkk', 'kGGGGGGGGGGk', 'kGkkkkkkkkGk', 'kGkwwkkwwkGk', 'kGkkkkkkkkGk', 'kGGGGGGGGGGk', 'kGrgygugggGk', 'kkkkkkkkkkkk'],
    crayons: ['.r.y.u.e.', '.r.y.u.e.', 'kkkkkkkkk', 'kyyyyyyyk', 'kyeeeeeyk', 'kyekkkeyk', 'kyeeeeeyk', 'kyyyyyyyk', 'kkkkkkkkk'],
    handheld: ['.PPPPPPPPPP.', 'PPPkkkkkkPPP', 'PkPkeeeekPyP', 'kkkkeeeekPPy', 'PkPkeeeekPyP', 'PPPkkkkkkPPP', '.PPPPPPPPPP.'],
    cart: ['kkkkkkk.', 'kGGGGGGk', 'kGwwwwGk', 'kGwrrwGk', 'kGwwwwGk', 'kGGGGGGk', 'kkkkkkkk'],
    boombox: ['....kkkkkkkkkkkk....', '....k..........k....', 'kkkkkkkkkkkkkkkkkkkk', 'kddddddddddddddddddk', 'kdGGGdggggggggdGGGdk', 'kGdddGgkkkkkkgGdddGk', 'kGdkdGgkwwwwkgGdkdGk', 'kGdddGgkkkkkkgGdddGk', 'kdGGGdggggggggdGGGdk', 'kddddddrdydudddddddk', 'kkkkkkkkkkkkkkkkkkkk'],
    trophy: ['.yyyyyyyy.', 'yyywyyyyyy', 'y.ywyyyy.y', 'y.yyyyyy.y', '.yyyyyyyy.', '..yyyyyy..', '...yyyy...', '....yy....', '....yy....', '..YYYYYY..', '..BBBBBB..', '.BBBBBBBB.'],
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
    plate: ['wwwwwwwwwwww', '.gggggggggg.'],
    bowl: ['uuuuuuuuu', '.uuwuuuu.', '..uuuuu..'],
    pot: ['.kkkkkkkkkkkk.', '.gggggggggggg.', 'kggggggggggggk', 'kgwggggggggggk', '.gggggggggggg.', '.gwggggggggGg.', '.gGGGGGGGGGGg.', '..gggggggggg..'],
    kettle: ['....kkk....', '...k...k...', '..k.....k..', '...rrrrr...', '..rrrrrrr..', '.rrwrrrrrrr', 'rrrwrrrrrrr', 'rrrrrrrrrr.', 'rrrrrrrrrr.', '.rrrrrrrr..'],
    toaster: ['..gggggggg..', '.gkkkggkkkg.', 'gggggggggggg', 'gggggggggggg', 'gwggggggggGg', 'gggggggggggk', 'gggggggggggk', 'GGGGGGGGGGGG'],
    glass: ['c...c', 'c...c', 'cc.cc', 'ccccc', 'ccwcc', 'ccccc', '.ccc.'],
    cereal: ['yyyyyyyy', 'yrrrrrry', 'yrwwwwry', 'yrrrrrry', 'yyyyyyyy', 'yyooooyy', 'yoowoooy', 'yoooooOy', 'yooooooy', 'yyooooyy', 'yyyyyyyy', 'YYYYYYYY'],
    brushcup: ['.u..r.', '.u..r.', '.w.rw.', '.u.r..', 'cuccrc', 'cccccc', 'cwcccc', 'cccccc', '.cccc.'],
    soap: ['.pppp.', 'pwpppp', 'pppppp'],
    shampoo: ['.kk.', '.gg.', 'eeee', 'eeee', 'ewwe', 'ewEe', 'ewwe', 'eeee', 'eeee', 'eeee', 'EEEE'],
    duck: ['..yyy...', '.yykyy..', '.yyyyyoo', '..yyy...', 'yyyyyyy.', 'yyyyyyyy', '.yyyyyy.'],
    dryer: ['..kkkkkkk..', '.kPPPPPPPk.', 'kPPPPPPPPPkk', 'kPwPPPPPPPkg', '.kPPPPPPPk..', '..kkPPkkk...', '....PPk.....', '....PPk.....', '....kk......'],
    plant: ['.....e.e....', '...e.eeE.e..', '..eEe.eEeE..', '.eeEeeEeeEe.', 'eEeEeEeEeEee', '.eEeeeEeEeE.', '..eeEeeEee..', '....eEeE....', '.....EE.....', '..rrrrrrrr..', '..RRRRRRRR..', '..rrrrrrrr..', '...rrrrrr...', '...rrrrrr...', '....rrrr....'],
    tv: ['.......k.k........', '........kk........', 'nnnnnnnnnnnnnnnnnn', 'ndddddddddddddnnnn', 'ndcccccccccccdnggn', 'ndcwccccccccednnnn', 'ndcccccccccccdngnn', 'ndcccccccccccdnnnn', 'ndcccccccccccdngnn', 'ndcccccccccccdnnnn', 'ndddddddddddddnrnn', 'nnnnnnnnnnnnnnnnnn', '.nn............nn.'],
    dvd: ['nnnnnnnnnnnnnnnnnn', 'ndddddddddgggggdnn', 'nnnnnnnnnnnnnnnnen', 'nnnnnnnnnnnnnnnnnn'],
    frame: ['BBBBBBBBBBB', 'BtttttttttB', 'BtccccccctB', 'BtcscscsctB', 'BtcrcucectB', 'BtcrcucectB', 'BtgggggggtB', 'BtttttttttB', 'BBBBBBBBBBB'],
    clock: ['..kkkkk..', '.kwwwwwk.', 'kwwwkwwwk', 'kwwwkwwwk', 'kwwwkkkwk', 'kwwwwwwwk', 'kwwwwwwwk', '.kwwwwwk.', '..kkkkk..'],
    mirror: ['..YYYYY..', '.YcccccY.', 'YccwccccY', 'YcwcccccY', 'YccccccwY', 'YcccccccY', '.YcccccY.', '..YYYYY..']
  };
  const artCache = {};
  const ART = (k, over) => { const key = k + (over ? JSON.stringify(over) : ''); return artCache[key] || (artCache[key] = art(A[k].map(r => r.padEnd(Math.max(...A[k].map(q => q.length)), '.')), over)); };
  const cache = {};
  const once = (key, fn) => () => cache[key] || (cache[key] = fn());

  // procedural pieces
  const spine = (col, w, h, band) => pc(w, h, g => { R(g, col, 0, 0, w, h); R(g, shade(col, -0.35), 0, 0, 1, h); R(g, shade(col, -0.35), 0, 0, w, 1); R(g, shade(col, -0.45), 0, h - 1, w, 1); R(g, band, 1, 2, w - 1, 1); R(g, band, 1, h - 3, w - 1, 1); });
  const layBook = (col, w, h) => pc(w, h, g => { R(g, col, 0, 0, w, h); R(g, '#f6efd8', 1, 1, w - 1, h - 2); R(g, shade(col, -0.35), 0, h - 1, w, 1); });
  const folded = (col, w, h, stripe) => pc(w, h, g => { R(g, col, 0, 0, w, h); R(g, shade(col, 0.25), 0, 0, w, 1); R(g, shade(col, -0.25), 0, h - 1, w, 1); R(g, shade(col, -0.18), w - 2, 1, 1, h - 2); if (stripe) R(g, stripe, 0, h >> 1, w, 1); });
  const thin = (col, w, h, top) => pc(w, h, g => { R(g, col, 0, 0, w, h); R(g, top || shade(col, 0.3), 0, 0, w, 1); R(g, shade(col, -0.3), 0, h - 1, w, 1); });
  const comicArt = (col, acc) => pc(9, 12, g => { R(g, col, 0, 0, 9, 12); R(g, '#fbf6ea', 0, 0, 9, 3); R(g, acc, 1, 1, 2, 1); R(g, acc, 4, 1, 4, 1); R(g, acc, 3, 5, 3, 3); R(g, '#f3cda4', 4, 4, 1, 1); R(g, acc, 2, 8, 1, 3); R(g, acc, 6, 8, 1, 3); R(g, shade(col, -0.4), 8, 0, 1, 12); R(g, shade(col, -0.4), 0, 11, 9, 1); });
  const cdArt = (col, acc) => pc(9, 9, g => { R(g, '#d8dde2', 0, 0, 9, 9); R(g, col, 1, 1, 8, 7); R(g, acc, 3, 2, 4, 4); R(g, shade(acc, 0.4), 4, 3, 1, 1); R(g, '#fbf6ea', 2, 7, 5, 1); R(g, '#8a929a', 0, 0, 1, 9); });
  const tapeArt = (col) => pc(9, 6, g => { R(g, col, 0, 0, 9, 6); R(g, '#fbf6ea', 1, 1, 7, 3); R(g, '#26262e', 2, 2, 1, 1); R(g, '#26262e', 6, 2, 1, 1); R(g, '#d0483a', 1, 1, 7, 1); R(g, shade(col, -0.3), 2, 5, 5, 1); });
  const vhsSpine = () => pc(4, 12, g => { R(g, '#26262e', 0, 0, 4, 12); R(g, '#fbf6ea', 1, 2, 2, 7); R(g, '#d0483a', 1, 3, 2, 1); });
  const vhsLay = () => pc(12, 4, g => { R(g, '#26262e', 0, 0, 12, 4); R(g, '#fbf6ea', 2, 1, 7, 2); R(g, '#d0483a', 3, 1, 1, 2); });
  function posterArt(kind) {
    return pc(14, 20, g => {
      const bgc = { rocket: '#1f2a5a', sport: '#3a8a3a', band: '#6a2c7a', movie: '#101830', modern: '#f0e0c0' }[kind];
      R(g, '#fbf6ea', 0, 0, 14, 20); R(g, bgc, 1, 1, 12, 18);
      if (kind === 'rocket') { [[2, 3], [10, 5], [4, 14], [11, 15], [7, 2]].forEach(([x, y]) => R(g, '#fbf6ea', x, y, 1, 1)); R(g, '#e8e4dc', 6, 5, 3, 8); R(g, '#d0483a', 7, 4, 1, 1); R(g, '#d0483a', 5, 11, 1, 3); R(g, '#d0483a', 9, 11, 1, 3); R(g, '#f4cf55', 6, 13, 3, 2); R(g, '#ec9444', 7, 15, 1, 2); R(g, '#4f7fd0', 7, 7, 1, 1); }
      if (kind === 'sport') { R(g, '#fbf6ea', 1, 12, 12, 1); R(g, '#fbf6ea', 5, 3, 4, 4); R(g, '#26262e', 6, 4, 2, 2); R(g, '#f4cf55', 2, 15, 10, 2); }
      if (kind === 'band') { R(g, '#ec9444', 3, 3, 8, 2); R(g, '#f4cf55', 2, 8, 10, 1); R(g, '#26262e', 5, 10, 4, 6); R(g, '#f3cda4', 6, 9, 2, 2); R(g, '#ee9fb8', 3, 16, 8, 1); }
      if (kind === 'movie') { R(g, '#ec9444', 3, 7, 8, 8); R(g, '#f4cf55', 4, 8, 3, 3); R(g, '#9ad0ec', 1, 12, 12, 1); R(g, '#fbf6ea', 3, 2, 8, 2); R(g, '#fbf6ea', 2, 16, 10, 1); }
      if (kind === 'modern') { R(g, '#d0483a', 2, 3, 6, 6); R(g, '#2c4888', 6, 8, 6, 7); R(g, '#f4cf55', 3, 12, 3, 3); R(g, '#26262e', 2, 17, 10, 1); }
    });
  }
  const drawingArt = () => pc(12, 10, g => { R(g, '#fbf6ea', 0, 0, 12, 10); R(g, '#f4cf55', 1, 1, 3, 3); R(g, '#62a84e', 0, 8, 12, 2); R(g, '#d0483a', 5, 4, 5, 4); R(g, '#8e2a22', 4, 3, 7, 1); R(g, '#4f7fd0', 7, 6, 1, 2); R(g, '#c9c0a8', 0, 0, 2, 1); R(g, '#c9c0a8', 10, 0, 2, 1); });
  const pennantArt = () => pc(18, 8, g => { R(g, '#6a4222', 0, 0, 1, 8); for (let x = 1; x < 18; x++) { const hh = Math.round(7 * (1 - (x - 1) / 17)); R(g, '#2c4888', x, 4 - (hh >> 1), 1, Math.max(1, hh)); } R(g, '#f4cf55', 3, 3, 7, 1); R(g, '#f4cf55', 3, 4, 1, 1); });
  const calendarArt = () => pc(10, 13, g => { R(g, '#fbf6ea', 0, 1, 10, 12); R(g, '#62a84e', 1, 2, 8, 4); R(g, '#9ad0ec', 1, 2, 8, 2); R(g, '#2b1d14', 4, 0, 2, 2); for (let y = 7; y < 12; y += 2) for (let x = 1; x < 9; x += 2) R(g, '#bdb7ab', x, y, 1, 1); R(g, '#d0483a', 5, 9, 1, 1); });
  const gradArt = () => pc(11, 9, g => { R(g, '#26262e', 0, 0, 11, 9); R(g, '#9ad0ec', 1, 1, 9, 7); R(g, '#f3cda4', 4, 3, 3, 2); R(g, '#26262e', 3, 2, 5, 1); R(g, '#26262e', 3, 5, 5, 3); R(g, '#f4cf55', 7, 2, 1, 2); });
  const friendsArt = () => pc(13, 9, g => { R(g, '#c19a2e', 0, 0, 13, 9); R(g, '#f4cf55', 1, 1, 11, 7); R(g, '#9ad0ec', 2, 2, 9, 5); [3, 6, 9].forEach((x, i) => { R(g, '#f3cda4', x, 3, 1, 1); R(g, ['#d0483a', '#62a84e', '#8e5cb0'][i], x - 1 + (i === 1 ? 1 : 0), 4, 2, 3); }); });
  const kclockArt = () => pc(9, 9, g => { g.fillStyle = '#d0483a'; g.beginPath(); g.arc(4.5, 4.5, 4.5, 0, 7); g.fill(); R(g, '#fbf6ea', 2, 2, 5, 5); R(g, '#fbf6ea', 1, 3, 7, 3); R(g, '#fbf6ea', 3, 1, 3, 7); R(g, '#26262e', 4, 2, 1, 3); R(g, '#26262e', 5, 4, 2, 1); });

  /* ---------- item catalogue ----------
     n name, mat material (sound), spr stand sprite, lay lying sprite (stacks / low spaces),
     row: items that line up side by side (rg = gap), stk: stack group, wall: hangs on walls only. */
  const it = (n, mat, spr, o) => Object.assign({ n, mat, spr }, o || {});
  const a = (k, over) => () => ART(k, over);
  const BOOKC = ['#d0483a', '#2c4888', '#347038', '#c19a2e', '#8e5cb0', '#ec9444', '#5fb8a8', '#8e2a22'];
  const book = (n, ci, h) => it(n, 'paper', once('bk' + ci + h, () => spine(BOOKC[ci], 4, h, '#f4cf55')), { lay: once('bkl' + ci + h, () => layBook(BOOKC[ci], h, 3)), row: 'book', rg: 0, stk: 'paper' });
  const comic = (ci, ai) => it('Comic book', 'paper', once('cm' + ci + ai, () => comicArt(BOOKC[ci], BOOKC[ai])), { lay: once('cml' + ci, () => thin(BOOKC[ci], 9, 2, '#fbf6ea')), row: 'comic', rg: 1, stk: 'paper' });
  const cd = (ci, ai) => it('CD', 'plastic', once('cd' + ci + ai, () => cdArt(BOOKC[ci], BOOKC[ai])), { lay: once('cdl' + ci, () => thin('#d8dde2', 9, 2, BOOKC[ci])), row: 'cd', rg: 1, stk: 'cd' });
  const tape = (col) => it('Cassette tape', 'plastic', once('tp' + col, () => tapeArt(col)), { lay: once('tpl' + col, () => thin(col, 9, 2)), row: 'tape', rg: 1, stk: 'tape' });
  const floppy = (col) => it('Floppy disk', 'plastic', a('floppy', { U: col }), { lay: once('fl' + col, () => thin(col, 8, 2)), row: 'floppy', rg: 1, stk: 'floppy' });
  const cart = (col) => it('Game cartridge', 'plastic', a('cart', { r: col }), { lay: once('ctl', () => thin('#7a746a', 8, 2)), row: 'cart', rg: 1, stk: 'cart' });
  const vhs = () => it('Video tape', 'plastic', once('vhs', vhsSpine), { lay: once('vhsl', vhsLay), row: 'vhs', rg: 0, stk: 'vhs' });
  const shirt = (col, stripe) => it('Folded shirt', 'cloth', once('sh' + col, () => folded(col, 10, 4, stripe)), { stk: 'cloth' });
  const towel = (col, stripe) => it('Towel', 'cloth', once('tw' + col, () => folded(col, 12, 4, stripe)), { stk: 'cloth' });
  const mug = (col) => it('Mug', 'glass', a('mug', { r: col }), { row: 'mug', rg: 1 });
  const W_ = (n, mat, spr) => it(n, mat, spr, { wall: 1 });
  const C = {
    teddy: () => it('Teddy bear', 'plush', a('teddy')),
    robot: () => it('Toy robot', 'plastic', a('robot')),
    lunch: () => it('Lunchbox', 'metal', a('lunch')),
    car: () => it('Toy car', 'plastic', a('car')),
    blocks: () => it('Letter blocks', 'wood', a('blocks')),
    piggy: () => it('Piggy bank', 'glass', a('piggy')),
    ball: () => it('Bouncy ball', 'plastic', a('ball')),
    nlamp: () => it('Night-light', 'plastic', a('nlamp')),
    recorder: () => it('Tape recorder', 'plastic', a('recorder')),
    crayons: () => it('Crayons', 'paper', a('crayons')),
    handheld: () => it('Handheld game', 'plastic', a('handheld')),
    boombox: () => it('Boombox', 'plastic', a('boombox')),
    trophy: () => it('Soccer trophy', 'metal', a('trophy')),
    soccer: () => it('Soccer ball', 'plastic', a('soccer')),
    dlamp: (col) => it('Desk lamp', 'metal', a('dlamp', col ? { r: col } : null)),
    dclock: () => it('Alarm clock', 'plastic', a('dclock')),
    pencils: () => it('Pencil cup', 'plastic', a('pencils')),
    globe: () => it('Globe', 'plastic', a('globe')),
    plane: () => it('Model airplane', 'plastic', a('plane')),
    sneaker: (col) => it('Sneakers', 'cloth', a('sneaker', col ? { r: col } : null)),
    cdplayer: () => it('CD player', 'plastic', a('cdplayer')),
    monitor: () => it('Computer monitor', 'plastic', a('monitor')),
    tower: () => it('Computer', 'plastic', a('tower')),
    keyboard: () => it('Keyboard', 'plastic', a('keyboard')),
    skate: () => it('Skateboard', 'wood', a('skate')),
    pager: () => it('Pager', 'plastic', a('pager')),
    phones: () => it('Headphones', 'plastic', a('phones')),
    radio: () => it('Clock radio', 'plastic', a('radio')),
    glitter: () => it('Glitter lamp', 'glass', a('glitter')),
    pack: () => it('Backpack', 'cloth', a('pack')),
    bball: () => it('Basketball', 'plastic', a('bball')),
    umbrella: () => it('Umbrella', 'cloth', a('umbrella')),
    laptop: () => it('Laptop', 'plastic', a('laptop')),
    mobile: () => it('Mobile phone', 'plastic', a('mobile')),
    plate: () => it('Plate', 'glass', a('plate'), { stk: 'plate' }),
    bowl: (col) => it('Bowl', 'glass', a('bowl', { u: col }), { stk: 'bowl' }),
    pot: () => it('Pot', 'metal', a('pot'), { stk: 'pot' }),
    kettle: () => it('Kettle', 'metal', a('kettle')),
    toaster: () => it('Toaster', 'metal', a('toaster')),
    glass: () => it('Glass', 'glass', a('glass'), { row: 'glass', rg: 1 }),
    cereal: () => it('Cereal', 'paper', a('cereal', { O: '#c86a20' })),
    brushcup: () => it('Toothbrushes', 'glass', a('brushcup')),
    soap: () => it('Soap', 'plastic', a('soap')),
    shampoo: (col) => it('Shampoo', 'plastic', a('shampoo', col ? { e: col, E: shade(col, -0.3) } : null)),
    duck: () => it('Rubber duck', 'plastic', a('duck')),
    dryer: () => it('Hair dryer', 'plastic', a('dryer')),
    plant: () => it('Houseplant', 'glass', a('plant')),
    tv: () => it('TV', 'plastic', a('tv')),
    dvd: () => it('DVD player', 'plastic', a('dvd')),
    photo: () => W_('Family photo', 'glass', a('frame')),
    clock: () => W_('Wall clock', 'glass', a('clock')),
    kclock: () => W_('Kitchen clock', 'glass', once('kclock', kclockArt)),
    mirror: () => W_('Round mirror', 'glass', a('mirror')),
    drawing: () => W_('My drawing', 'paper', once('drawing', drawingArt)),
    pennant: () => W_('Team pennant', 'paper', once('pennant', pennantArt)),
    calendar: () => W_('Calendar', 'paper', once('calendar', calendarArt)),
    grad: () => W_('Graduation photo', 'glass', once('grad', gradArt)),
    friends: () => W_('Photo of friends', 'glass', once('friends', friendsArt)),
    poster: (k, n) => W_(n, 'paper', once('po' + k, () => posterArt(k)))
  };

  /* ---------- furniture ----------
     Each piece draws itself and registers surfaces (lines things sit on), containers (drawers and doors
     that open) and wall zones. Surfaces: {x0, x1, y, clear}. */
  function build(room, list) {
    room.draw = []; room.surf = []; room.cont = []; room.zones = [];
    const line = (x0, x1, y, clear, extra) => { const s = Object.assign({ t: 'line', x0, x1, y, clear }, extra || {}); room.surf.push(s); return s; };
    const cont = (o) => { o.lines = o.lines.map(l => line(o.x + 1, o.x + o.w - 1, l[0], l[1], { cont: o })); room.cont.push(o); return o; };
    list.forEach(f => {
      const t = f.t, col = f.col || '#b5773f', dk = shade(col, -0.28), lt = shade(col, 0.18);
      if (t === 'window') {
        const { x, y, w, h } = f;
        line(x - 2, x + w + 2, y + h, f.clear || h - 4, { sill: 1 });
        room.draw.push({ z: 0, fn: g => drawWindow(g, room, f) });
      } else if (t === 'shelf') {
        line(f.x, f.x + f.w, f.y, f.clear || 18);
        room.draw.push({ z: 1, fn: g => { R(g, dk, f.x + 3, f.y + 2, 2, 3); R(g, dk, f.x + f.w - 5, f.y + 2, 2, 3); R(g, dk, f.x + 3, f.y + 2, 1, 5); R(g, dk, f.x + f.w - 4, f.y + 2, 1, 5); R(g, col, f.x, f.y, f.w, 2); R(g, lt, f.x, f.y, f.w, 1); R(g, 'rgba(0,0,0,.12)', f.x + 1, f.y + 2, f.w - 2, 1); } });
      } else if (t === 'bed') {
        const { x, w } = f, fl = !!f.flip, X = (dx, dw) => fl ? x + w - dx - dw : x + dx;
        line(X(18, w - 21), X(18, w - 21) + w - 21, 104, 40, { bed: 1 });
        room.draw.push({ z: 1, fn: g => {
          const bc = f.bc, bd = shade(bc, -0.25);
          R(g, dk, X(0, 4), 84, 4, 42); R(g, col, X(1, 2), 85, 2, 41); R(g, dk, X(w - 3, 3), 98, 3, 28);
          R(g, dk, X(3, 2), 122, 2, 4); R(g, dk, X(w - 6, 2), 122, 2, 4);
          R(g, col, X(3, w - 5), 115, w - 5, 7); R(g, dk, X(3, w - 5), 121, w - 5, 1);
          R(g, '#f1ece0', X(4, w - 7), 104, w - 7, 11);
          R(g, '#fbf6ea', X(5, 12), 99, 12, 6); R(g, '#e3dccb', X(5, 12), 104, 12, 1); R(g, '#fbf6ea', X(6, 10), 98, 10, 1);
          R(g, bc, X(17, w - 20), 104, w - 20, 13); R(g, shade(bc, 0.2), X(17, w - 20), 104, w - 20, 1);
          R(g, bd, X(17, 1), 104, 1, 13); R(g, bd, X(17, w - 20), 116, w - 20, 1);
          for (let i = 0; i < w - 22; i += 6) R(g, f.bp, X(19 + i, 3), 108 + ((i / 6) % 2) * 3, 3, 1);
          R(g, '#fbf6ea', X(14, 5), 104, 5, 2);
        } });
      } else if (t === 'bookcase') {
        const { x, w, top } = f;
        line(x, x + w, top, 30);
        let prev = top + 2;
        f.lines.forEach(y => { line(x + 2, x + w - 2, y, y - prev - 1); prev = y + 2; });
        room.draw.push({ z: 1, fn: g => {
          R(g, dk, x, top, w, BASE - top); R(g, shade(col, -0.45), x + 2, top + 2, w - 4, BASE - top - 2);
          R(g, col, x, top, w, 2); R(g, lt, x, top, w, 1); R(g, col, x, top, 2, BASE - top); R(g, col, x + w - 2, top, 2, BASE - top);
          f.lines.forEach(y => { R(g, col, x + 2, y, w - 4, 2); R(g, lt, x + 2, y, w - 4, 1); });
        } });
      } else if (t === 'desk' || t === 'table') {
        const { x, w, top } = f;
        line(x, x + w, top, 40);
        const dx = f.dside === 'l' ? x + 3 : f.dside === 'c' ? x + (w >> 1) - 10 : x + w - 23;
        const c = cont({ t: 'drawer', x: dx, y: top + 3, w: 20, h: 9, col, lines: [[top + 10, 9]] });
        room.draw.push({ z: 1, fn: g => {
          R(g, dk, x + 1, top + 3, 2, BASE - top - 3); R(g, dk, x + w - 3, top + 3, 2, BASE - top - 3);
          if (t === 'table') R(g, dk, x + 3, BASE - 8, w - 6, 2);
          R(g, dk, c.x - 1, top + 3, c.w + 2, c.h + 1);
          R(g, col, x, top, w, 3); R(g, lt, x, top, w, 1); R(g, dk, x, top + 3, w, 1);
        } });
      } else if (t === 'dresser') {
        const { x, w, top } = f, n = f.n || 2, dh = Math.floor((BASE - top - 4 - (n - 1)) / n);
        line(x, x + w, top, 40);
        const cs = [];
        for (let i = 0; i < n; i++) { const y = top + 3 + i * (dh + 1); cs.push(cont({ t: 'drawer', x: x + 2, y, w: w - 4, h: dh, col, lines: [[y + dh - 2, Math.min(dh, 11)]] })); }
        room.draw.push({ z: 1, fn: g => { R(g, dk, x, top, w, BASE - top); R(g, col, x - 1, top, w + 2, 3); R(g, lt, x - 1, top, w + 2, 1); R(g, dk, x + 1, BASE - 2, 2, 2); R(g, dk, x + w - 3, BASE - 2, 2, 2); } });
      } else if (t === 'cabinet') {
        // counter / vanity / tv stand / upper cabinet with doors and optional sink
        const { x, w, top } = f, bot = f.bot || BASE;
        if (f.counter) {
          if (f.sink) { line(x, f.sink[0], top, 40); line(f.sink[0] + f.sink[1], x + w, top, 40); } else line(x, x + w, top, f.clearTop || 40);
        }
        const ds = f.doors.map(([dx, dw]) => cont({ t: 'door', x: x + dx, y: top + 3, w: dw, h: bot - top - 5, col: f.door || col, hinge: dx < w / 2 ? 'l' : 'r', mirror: f.mirror, lines: f.lines }));
        void ds;
        room.draw.push({ z: 1, fn: g => {
          R(g, dk, x, top, w, bot - top);
          if (f.counter) { const tc = f.tc || col; R(g, tc, x - 1, top, w + 2, 3); R(g, shade(tc, 0.2), x - 1, top, w + 2, 1); R(g, shade(tc, -0.3), x - 1, top + 3, w + 2, 1); }
          else { R(g, col, x, top, w, 2); R(g, dk, x, bot - 1, w, 1); }
          if (f.sink) { R(g, '#8a929a', f.sink[0], top, f.sink[1], 2); R(g, '#c8ced4', f.sink[0] + 1, top, f.sink[1] - 2, 1); R(g, '#9aa2aa', f.sink[0] + (f.sink[1] >> 1) - 1, top - 7, 2, 7); R(g, '#9aa2aa', f.sink[0] + (f.sink[1] >> 1) - 1, top - 7, 5, 2); }
        } });
      } else if (t === 'stove') {
        const { x, w, top } = f;
        line(x, x + w, top, 40);
        room.draw.push({ z: 1, fn: g => {
          R(g, '#e8e4dc', x, top, w, BASE - top); R(g, '#26262e', x, top, w, 3); R(g, '#7a746a', x + 3, top, 6, 1); R(g, '#7a746a', x + w - 9, top, 6, 1);
          R(g, '#bdb7ab', x, top + 3, w, 1); [5, 10, 15, 20].forEach(k => k < w - 2 && R(g, '#4a4640', x + k, top + 5, 2, 1));
          R(g, '#4a4640', x + 3, top + 9, w - 6, 14); R(g, '#7a746a', x + 4, top + 10, w - 8, 12); R(g, '#bdb7ab', x + 3, top + 8, w - 6, 1);
        } });
      } else if (t === 'fridge') {
        const { x, w, top } = f;
        line(x, x + w, top, 36);
        room.draw.push({ z: 1, fn: g => { R(g, '#bdb7ab', x, top, w, BASE - top); R(g, '#f1ede4', x + 1, top + 1, w - 2, BASE - top - 1); R(g, '#bdb7ab', x + 1, top + 28, w - 2, 1); R(g, '#9aa2aa', x + w - 5, top + 8, 2, 14); R(g, '#9aa2aa', x + w - 5, top + 32, 2, 12); R(g, '#d0483a', x + 5, top + 12, 3, 3); R(g, '#f4cf55', x + 9, top + 16, 3, 2); } });
      } else if (t === 'tub') {
        const { x, w, top } = f;
        line(x + 2, x + w - 2, top, 30);
        room.draw.push({ z: 1, fn: g => { R(g, '#bdb7ab', x, top, w, BASE - top); R(g, '#fbf8f0', x + 1, top + 1, w - 2, BASE - top - 3); R(g, '#e3e0d6', x + 1, top + 1, w - 2, 1); R(g, '#9aa2aa', x + 4, top - 12, 2, 12); R(g, '#9aa2aa', x + 4, top - 12, 6, 2); R(g, '#bdb7ab', x + 3, BASE - 2, 3, 2); R(g, '#bdb7ab', x + w - 6, BASE - 2, 3, 2); } });
      } else if (t === 'toilet') {
        const { x } = f;
        line(x, x + 20, 96, 30);
        room.draw.push({ z: 1, fn: g => { R(g, '#bdb7ab', x, 96, 20, 12); R(g, '#fbf8f0', x + 1, 97, 18, 10); R(g, '#9aa2aa', x + 14, 99, 3, 1); R(g, '#bdb7ab', x - 2, 108, 24, 3); R(g, '#fbf8f0', x - 1, 108, 22, 2); R(g, '#bdb7ab', x - 1, 111, 22, 7); R(g, '#fbf8f0', x, 111, 20, 6); R(g, '#bdb7ab', x + 2, 118, 16, 2); R(g, '#fbf8f0', x + 3, 118, 14, 1); R(g, '#bdb7ab', x + 5, 120, 10, 6); R(g, '#f1ede4', x + 6, 120, 8, 5); } });
      } else if (t === 'door') {
        room.draw.push({ z: 0, fn: g => { const { x } = f; R(g, '#6a4222', x - 2, 44, 28, WALL - 44); R(g, '#c98b52', x, 46, 24, WALL - 46); R(g, '#b5773f', x + 3, 50, 18, 24); R(g, '#b5773f', x + 3, 78, 18, 30); R(g, '#d8a068', x + 4, 51, 16, 22); R(g, '#d8a068', x + 4, 79, 16, 28); R(g, '#f4cf55', x + 19, 78, 2, 2); } });
      } else if (t === 'bench') {
        const { x, w, top } = f;
        line(x, x + w, top, 36); line(x + 2, x + w - 2, 122, 8);
        room.draw.push({ z: 1, fn: g => { R(g, dk, x + 1, top, 2, BASE - top); R(g, dk, x + w - 3, top, 2, BASE - top); R(g, col, x, top, w, 3); R(g, lt, x, top, w, 1); R(g, col, x + 2, 122, w - 4, 2); } });
      } else if (t === 'rug') {
        room.draw.push({ z: 0.5, fn: g => { R(g, shade(f.col, -0.25), f.x - 1, 124, f.w + 2, 1); R(g, f.col, f.x, 122, f.w, 12); R(g, shade(f.col, 0.18), f.x + 3, 124, f.w - 6, 8); R(g, f.col, f.x + 5, 126, f.w - 10, 4); for (let i = 0; i < f.w; i += 3) R(g, '#f1e6cc', f.x + i, 134, 1, 2); } });
      }
    });
  }

  function drawWindow(g, room, f) {
    const { x, y, w, h } = f, th = room.theme;
    // sky
    const bands = ['#8cc2ea', '#9fcdee', '#b3d8f2', '#c6e2f5', '#d8ecf7'];
    for (let i = 0; i < h; i++) R(g, bands[Math.min(4, Math.floor(i / h * 5))], x, y + i, w, 1);
    R(g, '#fbf6ea', x + 4, y + 5, 7, 2); R(g, '#fbf6ea', x + 6, y + 4, 4, 1); R(g, '#fbf6ea', x + w - 12, y + 9, 6, 2);
    const hz = y + h - 8;
    if (th.out === 'tree') { R(g, '#7fb069', x, hz, w, 8); R(g, '#4f8a3f', x + w - 12, y + h - 20, 10, 12); R(g, '#6a4222', x + w - 8, hz, 2, 6); R(g, '#fbf6ea', x, hz + 3, w, 1); for (let i = 0; i < w; i += 3) R(g, '#fbf6ea', x + i, hz + 1, 1, 5); }
    else if (th.out === 'houses') { R(g, '#7fb069', x, hz + 2, w, 6); R(g, '#e6c48a', x + 3, hz - 6, 14, 10); R(g, '#a2463c', x + 2, hz - 10, 16, 4); R(g, '#8cc2ea', x + 6, hz - 3, 3, 3); R(g, '#d9d0bc', x + 20, hz - 4, 12, 8); R(g, '#4a5a7a', x + 19, hz - 8, 14, 4); }
    else if (th.out === 'trees') { R(g, '#7fb069', x, hz + 2, w, 6); [[2, 12], [12, 16], [22, 11]].forEach(([dx, hh]) => { R(g, '#3f7a3a', x + dx, hz + 2 - hh, 8, hh); R(g, '#4f8a3f', x + dx + 1, hz + 3 - hh, 5, hh - 3); }); }
    else if (th.out === 'city') { [[0, 14, '#9aa8b8'], [7, 20, '#8a98a8'], [15, 12, '#a8b4c2'], [22, 24, '#7c8a9c'], [29, 16, '#9aa8b8']].forEach(([dx, hh, c]) => { if (dx < w) { R(g, c, x + dx, y + h - hh, Math.min(8, w - dx), hh); for (let j = y + h - hh + 2; j < y + h - 1; j += 3) R(g, '#f4e4a0', x + dx + 2, j, 1, 1); } }); }
    // frame
    const fr = '#fbf6ea', fd = '#d8d0bc';
    R(g, fr, x - 2, y - 2, w + 4, 2); R(g, fr, x - 2, y, 2, h); R(g, fr, x + w, y, 2, h);
    R(g, fr, x + (w >> 1) - 1, y, 2, h); R(g, fr, x, y + (h >> 1) - 1, w, 2); R(g, fd, x, y + (h >> 1) + 1, w, 1);
    // sill
    R(g, fr, x - 3, y + h, w + 6, 3); R(g, fd, x - 3, y + h + 2, w + 6, 1); R(g, 'rgba(0,0,0,.1)', x - 2, y + h + 3, w + 4, 1);
    // curtains
    if (th.curtain) {
      const c = th.curtain, cd = shade(c, -0.22);
      R(g, '#6a4222', x - 9, y - 5, w + 18, 2);
      for (const cx of [x - 8, x + w + 2]) { R(g, c, cx, y - 3, 6, h + 5); for (let i = 1; i < 6; i += 2) R(g, cd, cx + i, y - 3, 1, h + 5); R(g, cd, cx, y + (h >> 1) + 2, 6, 1); }
    }
  }

  /* ---------- the four moves ---------- */
  function pile(room, x0, x1) { room.pile = { x0, x1 }; }
  function mkLevel(def) {
    const L = { id: def.id, year: def.year, age: def.age, title: def.title, sub: def.sub, cap: def.cap, rooms: [], surfs: [], conts: [], items: [], boxes: [] };
    def.rooms.forEach((rd, ri) => {
      const room = { name: rd.name, theme: rd.theme, ri };
      build(room, rd.furn);
      pile(room, rd.pile[0], rd.pile[1]);
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
      const nb = rd.boxes.length, perRow = Math.max(1, Math.floor((p.x1 - p.x0 + 2) / 25));
      rd.boxes.forEach((items, bi) => {
        const row = bi < perRow ? 0 : 1, col = row ? bi - perRow : bi;
        const bw = 24, bx = p.x0 + 1 + col * 25 + (row ? 4 : 0) + (nb === 1 ? Math.floor((p.x1 - p.x0 - 24) / 2) : 0);
        const b = { r: ri, x: bx, y: row ? FLOOR - 18 : FLOOR, w: bw, h: 18, under: row ? L.boxes.length - perRow : -1, items: [], tint: (hash(bi, ri + def.id) % 3) };
        items.forEach(e => { b.items.push(L.items.length); L.items.push(Object.assign({}, e, { box: L.boxes.length })); });
        L.boxes.push(b);
      });
      L.rooms.push(room);
    });
    return L;
  }
  const TH = {
    y85: { wall: '#f3e2b0', pat: 'dots', patc: '#e2c47e', trim: '#fff4dc', floor: '#b0764a', fpat: 'carpet', curtain: '#e07a5f', out: 'tree' },
    y90: { wall: '#c4e3d6', pat: 'stripe', patc: '#b0d6c6', trim: '#fbf6ea', floor: '#d6bd93', fpat: 'carpet', curtain: '#8a74c8', out: 'houses' },
    y95: { wall: '#c3cc9e', pat: 'plain', patc: '#b4be8e', trim: '#efe6cc', floor: '#b98652', fpat: 'plank', curtain: '#3d5a80', out: 'trees' },
    hall: { wall: '#efe3c8', pat: 'wainscot', patc: '#c9a878', trim: '#efe6cc', floor: '#b98652', fpat: 'plank', out: 'trees' },
    y00: { wall: '#f2e7d6', pat: 'plain', patc: '#e8dcc8', trim: '#fbf6ea', floor: '#d4a86a', fpat: 'plank', curtain: '#e8b04a', out: 'city' },
    kit: { wall: '#f4ecd8', pat: 'splash', patc: '#cfe2e4', trim: '#fbf6ea', floor: '#e6dccb', floor2: '#c9bba3', fpat: 'tile', curtain: '#d0483a', out: 'city' },
    bath: { wall: '#e2eff2', pat: 'tile', patc: '#bcd9e0', trim: '#fbf6ea', floor: '#e8e8e0', floor2: '#cfd4d0', fpat: 'tile', out: 'city' }
  };
  const LEVELS = [
    { id: 0, year: 1985, age: 7, title: 'A room of my own.', sub: 'Age 7', cap: 'My room, 1985',
      rooms: [{ name: 'Bedroom', theme: TH.y85, pile: [76, 126], zones: [[4, 6, 70, 44], [124, 6, 172, 48]],
        furn: [{ t: 'window', x: 84, y: 26, w: 32, h: 30 }, { t: 'shelf', x: 8, y: 64, w: 44, col: '#b5773f' }, { t: 'bed', x: 4, w: 64, col: '#b5773f', bc: '#5b8bd9', bp: '#f4d35e' },
          { t: 'dresser', x: 132, w: 38, top: 92, col: '#c98b52' }, { t: 'bookcase', x: 174, w: 22, top: 64, lines: [84, 104, 124], col: '#b5773f' }],
        boxes: [
          [C.teddy(), C.robot(), C.car(), C.blocks(), C.ball(), C.piggy(), C.nlamp()],
          [book('Picture book', 0, 12), book('Picture book', 1, 11), book('Picture book', 2, 12), book('Picture book', 3, 10), C.crayons(), C.recorder(), tape('#26262e'), tape('#d0483a'), tape('#4f7fd0')],
          [C.photo(), C.poster('rocket', 'Rocket poster'), C.drawing(), C.clock(), shirt('#ec9444', '#fbf6ea'), shirt('#62a84e'), C.lunch()]
        ] }] },
    { id: 1, year: 1990, age: 12, title: 'New house. New school.', sub: 'Age 12', cap: 'My room, 1990',
      rooms: [{ name: 'Bedroom', theme: TH.y90, pile: [58, 108], zones: [[4, 6, 58, 36], [104, 8, 132, 60], [134, 6, 196, 40]],
        furn: [{ t: 'window', x: 68, y: 26, w: 32, h: 32 }, { t: 'desk', x: 4, w: 52, top: 92, col: '#e3dccb', dside: 'r' }, { t: 'shelf', x: 8, y: 58, w: 44, col: '#e3dccb' },
          { t: 'dresser', x: 112, w: 18, top: 104, n: 1, col: '#c98b52' }, { t: 'bed', x: 134, w: 62, flip: 1, col: '#c98b52', bc: '#d64b4b', bp: '#fbf6ea' }, { t: 'shelf', x: 140, y: 62, w: 44, col: '#c98b52' }],
        boxes: [
          [C.teddy(), C.trophy(), C.soccer(), C.globe(), C.plane(), C.dlamp(), C.dclock()],
          [comic(0, 3), comic(1, 0), comic(4, 3), comic(2, 5), C.boombox(), C.pencils(), tape('#26262e'), tape('#d0483a')],
          [C.photo(), C.poster('sport', 'Soccer poster'), C.pennant(), C.calendar(), shirt('#2c4888', '#f4cf55'), shirt('#ee9fb8'), C.sneaker()],
          [C.handheld(), cart('#d0483a'), cart('#4f7fd0'), cart('#62a84e'), floppy('#2c4888'), floppy('#26262e'), floppy('#d0483a')]
        ] }] },
    { id: 2, year: 1995, age: 17, title: 'The big room at the end of the hall.', sub: 'Age 17', cap: 'My room, 1995',
      rooms: [
        { name: 'Bedroom', theme: TH.y95, pile: [76, 126], zones: [[4, 6, 74, 40], [122, 6, 196, 34]],
          furn: [{ t: 'rug', x: 72, w: 58, col: '#b8573e' }, { t: 'window', x: 84, y: 24, w: 32, h: 34 }, { t: 'shelf', x: 10, y: 60, w: 50, col: '#8a5a32' }, { t: 'bed', x: 4, w: 66, col: '#8a5a32', bc: '#3d5a80', bp: '#98c1d9' },
            { t: 'desk', x: 130, w: 64, top: 92, col: '#8a5a32', dside: 'l' }, { t: 'shelf', x: 134, y: 54, w: 56, col: '#8a5a32' }],
          boxes: [
            [C.teddy(), C.trophy(), C.bball(), C.sneaker('#4f7fd0'), C.pack(), C.skate()],
            [C.monitor(), C.tower(), C.keyboard(), floppy('#2c4888'), floppy('#26262e'), C.dlamp('#26262e'), C.radio()],
            [C.poster('band', 'Band poster'), C.poster('movie', 'Movie poster'), C.photo(), C.pager(), C.phones(), C.cdplayer()],
            [cd(4, 5), cd(1, 3), cd(7, 3), cd(2, 0), cd(5, 1), book('School book', 6, 13), book('School book', 1, 12), book('Dictionary', 7, 13)]
          ] },
        { name: 'Hallway', theme: TH.hall, pile: [34, 84], zones: [[34, 8, 86, 60], [90, 6, 140, 38], [144, 6, 196, 78]],
          furn: [{ t: 'door', x: 6 }, { t: 'table', x: 90, w: 48, top: 96, col: '#6a4222', dside: 'c' }, { t: 'shelf', x: 92, y: 60, w: 44, col: '#6a4222' }, { t: 'bench', x: 148, w: 46, top: 112, col: '#8a5a32' }],
          boxes: [[C.umbrella(), shirt('#26262e', '#d0483a'), shirt('#9ad0ec'), vhs(), vhs(), C.glitter(), C.mirror(), C.friends()]] }
      ] },
    { id: 3, year: 2000, age: 22, title: 'My first apartment.', sub: 'Age 22', cap: 'Home, 2000',
      rooms: [
        { name: 'Main room', theme: TH.y00, pile: [72, 122], zones: [[4, 6, 72, 50], [124, 6, 172, 40]],
          furn: [{ t: 'window', x: 80, y: 24, w: 34, h: 34 }, { t: 'bed', x: 4, w: 64, col: '#d4a86a', bc: '#6a994e', bp: '#f2e8cf' },
            { t: 'cabinet', x: 126, w: 46, top: 106, col: '#4a4640', door: '#6c6862', doors: [[2, 21], [23, 21]], lines: [[123, 13]], counter: 1 },
            { t: 'shelf', x: 128, y: 60, w: 42, col: '#4a4640' }, { t: 'bookcase', x: 176, w: 20, top: 60, lines: [80, 100, 124], col: '#d4a86a' }],
          boxes: [
            [C.teddy(), C.laptop(), C.mobile(), C.trophy(), C.plant()],
            [book('Novel', 1, 13), book('Novel', 4, 12), book('Novel', 2, 13), C.tv(), C.dvd(), shirt('#26262e')],
            [C.photo(), C.grad(), C.poster('modern', 'Art print'), cd(4, 5), cd(7, 3), cd(0, 6)]
          ] },
        { name: 'Kitchen', theme: TH.kit, pile: [128, 166], zones: [[98, 6, 126, 50], [128, 56, 166, 94]],
          furn: [{ t: 'cabinet', x: 6, w: 88, top: 18, bot: 54, col: '#e3dccb', doors: [[1, 43], [44, 43]], lines: [[36, 15], [51, 14]] },
            { t: 'cabinet', x: 4, w: 92, top: 94, col: '#e3dccb', tc: '#8a929a', counter: 1, sink: [44, 18], doors: [[2, 43], [47, 43]], lines: [[110, 11], [124, 12]] },
            { t: 'stove', x: 99, w: 26, top: 94 }, { t: 'window', x: 132, y: 20, w: 30, h: 28, clear: 20 }, { t: 'fridge', x: 168, w: 28, top: 38 }],
          boxes: [[mug('#d0483a'), mug('#4f7fd0'), mug('#f4cf55'), C.plate(), C.plate(), C.plate(), C.bowl('#62a84e'), C.bowl('#62a84e')],
            [C.pot(), C.pot(), C.kettle(), C.toaster(), C.glass(), C.kclock(), book('Cookbook', 5, 12)]] },
        { name: 'Bathroom', theme: TH.bath, pile: [76, 116], zones: [[4, 6, 72, 42], [74, 6, 118, 46], [162, 6, 196, 70]],
          furn: [{ t: 'tub', x: 4, w: 66, top: 104 }, { t: 'shelf', x: 10, y: 62, w: 48, col: '#f4fafc' }, { t: 'shelf', x: 76, y: 66, w: 40, col: '#fbf6ea' },
            { t: 'cabinet', x: 122, w: 38, top: 96, col: '#fbf6ea', door: '#f1ede4', counter: 1, sink: [134, 14], doors: [[1, 18], [19, 18]], lines: [[111, 10], [124, 11]] },
            { t: 'cabinet', x: 126, w: 30, top: 28, bot: 62, col: '#e8e4dc', mirror: 1, doors: [[1, 28]], lines: [[44, 12], [59, 13]] },
            { t: 'toilet', x: 170 }],
          boxes: [[towel('#4f7fd0', '#fbf6ea'), towel('#fbf6ea', '#4f7fd0'), towel('#62a84e'), C.brushcup(), C.soap(), C.shampoo(), C.duck(), C.dryer()]] }
      ] }
  ];
  const built = {};
  const LV = i => built[i] || (built[i] = mkLevel(LEVELS[i]));

  /* ---------- state ----------
     S = { b: [[state, pulled]] per box (0 closed, 1 open, 2 folded away), it: item locations, c: surface centers, done }
     item location: 0 in its box, 1 resting on its open box, -1 being held, [surface, slot, stackIndex] or [wallZone, x, y]. */
  const fresh = L => ({ b: L.boxes.map(() => [0, 0]), it: L.items.map(() => 0), c: L.surfs.map(() => null), done: 0 });
  function valid(L, S) { return S && S.b && S.it && S.c && S.b.length === L.boxes.length && S.it.length === L.items.length && S.c.length === L.surfs.length; }
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
  function formOf(L, i, lay, clear) {
    const d = L.items[i], st = cvOf(d.spr), ly = d.lay ? cvOf(d.lay) : null;
    if (ly && (lay || st.height > clear) && (lay || ly.height <= clear)) return { img: ly, lay: 1 };
    return { img: st, lay: 0 };
  }
  // Lay a line surface out: slots in order, evenly spaced, rows of books/tapes touching, centered on c.
  function layoutLine(L, s, slots, c) {
    const sl = slots.map(items => {
      const lay = items.length > 1;
      const forms = items.map(i => formOf(L, i, lay, s.clear));
      return { items, forms, w: Math.max(...forms.map(f => f.img.width)), h: forms.reduce((t, f) => t + f.img.height, 0), row: items.length === 1 && !forms[0].lay ? L.items[items[0]].row : null, rg: L.items[items[0]].rg || 0 };
    });
    const len = s.x1 - s.x0, n = sl.length;
    let sumW = 0, rowG = 0, nonRow = 0;
    sl.forEach((q, j) => { sumW += q.w; if (j) { if (q.row && q.row === sl[j - 1].row) { rowG += q.rg; q.rowJoin = 1; } else nonRow++; } });
    const G = clamp(Math.floor((len - sumW - rowG) / (n + 1)), 2, s.floor ? 8 : 6);
    const total = sumW + rowG + G * nonRow;
    const ok = total <= len && sl.every(q => q.h <= s.clear + 0.5);
    const cc = c == null ? (s.x0 + s.x1) / 2 : c;
    let x = total > len ? s.x0 : clamp(Math.round(cc - total / 2), s.x0, s.x1 - total);
    const rects = [], boxes = [];
    sl.forEach((q, j) => {
      if (j) x += q.rowJoin ? q.rg : G;
      let y = s.y;
      q.forms.forEach((f, k) => { const w = f.img.width, h = f.img.height; y -= h; rects.push({ i: q.items[k], x: x + Math.floor((q.w - w) / 2), y, w, h, img: f.img }); });
      boxes.push({ x, w: q.w, top: y, items: q.items, row: q.row });
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

  /* ---------- drawing ---------- */
  function drawWalls(g, room) {
    const th = room.theme;
    R(g, th.wall, 0, 0, VW, WALL);
    if (th.pat === 'dots') for (let y = 4, row = 0; y < WALL - 4; y += 8, row++) for (let x = row % 2 ? 6 : 2; x < VW; x += 8) { R(g, th.patc, x, y, 1, 1); R(g, th.patc, x - 1, y + 1, 3, 1); R(g, th.patc, x, y + 2, 1, 1); }
    if (th.pat === 'stripe') { for (let x = 2; x < VW; x += 8) R(g, th.patc, x, 0, 2, WALL); R(g, '#8a74c8', 0, 70, VW, 3); R(g, '#f4cf55', 0, 73, VW, 1); }
    if (th.pat === 'plain') { for (let y = 0; y < WALL; y += 3) for (let x = (y % 2) * 2; x < VW; x += 5) if (hash(x, y) < 90) R(g, th.patc, x, y, 1, 1); }
    if (th.pat === 'wainscot') { R(g, th.patc, 0, 72, VW, WALL - 72); for (let x = 4; x < VW; x += 12) R(g, shade(th.patc, -0.12), x, 76, 1, WALL - 78); R(g, shade(th.patc, 0.2), 0, 70, VW, 2); R(g, shade(th.patc, -0.2), 0, 72, VW, 1); }
    if (th.pat === 'splash') { for (let y = 58; y < 94; y += 6) for (let x = 0; x < 98; x += 6) { R(g, th.patc, x, y, 5, 5); } R(g, '#f4ecd8', 0, 94, 98, 1); }
    if (th.pat === 'tile') { R(g, th.patc, 0, 50, VW, WALL - 50); for (let y = 50; y < WALL; y += 6) R(g, shade(th.patc, 0.25), 0, y, VW, 1); for (let y = 50, row = 0; y < WALL; y += 6, row++) for (let x = row % 2 ? 3 : 0; x < VW; x += 6) R(g, shade(th.patc, 0.25), x, y, 1, 6); R(g, shade(th.patc, -0.15), 0, 49, VW, 1); }
    // floor
    const f1 = th.floor, f2 = th.floor2 || shade(f1, -0.12);
    R(g, f1, 0, WALL, VW, VH - WALL);
    if (th.fpat === 'carpet') { for (let y = WALL + 1; y < VH; y += 2) for (let x = (y % 4 ? 1 : 0); x < VW; x += 3) if (hash(x, y) < 300) R(g, f2, x, y, 1, 1); }
    if (th.fpat === 'plank') { let y = WALL + 3, hh = 4, row = 0; while (y < VH) { R(g, f2, 0, y, VW, 1); for (let x = (row * 23) % 40; x < VW; x += 40) R(g, f2, x, y - hh, 1, hh); y += hh + 1; hh += 1; row++; } }
    if (th.fpat === 'tile') { let y = WALL, hh = 5, row = 0; while (y < VH) { const tw = 12 + row * 2, n = Math.ceil(VW / 2 / tw) + 1; for (let k = -n; k < n; k++) R(g, (k + row + 64) % 2 ? f1 : f2, Math.round(VW / 2 + k * tw), y, tw, hh); y += hh; hh += 1; row++; } }
    R(g, 'rgba(0,0,0,.18)', 0, WALL, VW, 2);
    R(g, th.trim, 0, WALL - 4, VW, 4); R(g, shade(th.trim, -0.15), 0, WALL - 1, VW, 1);
  }
  function drawCont(g, c, open) {
    const dk = shade(c.col, -0.3), lt = shade(c.col, 0.15);
    if (!open) {
      R(g, c.col, c.x, c.y, c.w, c.h); R(g, lt, c.x, c.y, c.w, 1); R(g, dk, c.x, c.y + c.h - 1, c.w, 1);
      if (c.mirror) { R(g, '#bfe0ea', c.x + 2, c.y + 2, c.w - 4, c.h - 4); R(g, '#e6f4f8', c.x + 5, c.y + 4, 2, 6); R(g, '#e6f4f8', c.x + 8, c.y + 3, 1, 4); }
      else if (c.t === 'door') { R(g, dk, c.x + 2, c.y + 2, c.w - 4, 1); R(g, dk, c.x + 2, c.y + 2, 1, c.h - 4); R(g, lt, c.x + c.w - 3, c.y + 2, 1, c.h - 4); R(g, lt, c.x + 2, c.y + c.h - 3, c.w - 4, 1); }
      const kx = c.t === 'drawer' ? c.x + (c.w >> 1) - 1 : c.hinge === 'l' ? c.x + c.w - 4 : c.x + 2;
      const ky = c.t === 'drawer' ? c.y + (c.h >> 1) - 1 : c.y + (c.h >> 1) - 2;
      R(g, '#e8d8a8', kx, ky, 2, c.t === 'drawer' ? 2 : 4); R(g, '#8a6a2a', kx, ky + (c.t === 'drawer' ? 1 : 3), 2, 1);
    } else {
      R(g, '#3a2616', c.x, c.y, c.w, c.h); R(g, '#4e3420', c.x + 1, c.y + 1, c.w - 2, 2);
      if (c.t === 'door') c.lines.forEach(s => { R(g, shade(c.col, -0.1), c.x, s.y, c.w, 1); R(g, 'rgba(255,255,255,.25)', c.x, s.y, c.w, 1); });
    }
  }
  function drawContFront(g, c) {
    const dk = shade(c.col, -0.3), lt = shade(c.col, 0.15);
    if (c.t === 'drawer') {
      R(g, 'rgba(0,0,0,.25)', c.x - 1, c.y + c.h + 1, c.w + 2, 2);
      R(g, c.col, c.x - 1, c.y + c.h - 2, c.w + 2, 4); R(g, lt, c.x - 1, c.y + c.h - 2, c.w + 2, 1); R(g, dk, c.x - 1, c.y + c.h + 1, c.w + 2, 1);
      R(g, dk, c.x - 1, c.y, 1, c.h); R(g, dk, c.x + c.w, c.y, 1, c.h);
      R(g, '#e8d8a8', c.x + (c.w >> 1) - 1, c.y + c.h, 2, 1);
    } else {
      const px = c.hinge === 'l' ? c.x - 4 : c.x + c.w;
      R(g, c.mirror ? '#bfe0ea' : c.col, px, c.y - 1, 4, c.h + 2); R(g, dk, c.hinge === 'l' ? px : px + 3, c.y - 1, 1, c.h + 2);
      R(g, '#e8d8a8', c.hinge === 'l' ? px + 1 : px + 2, c.y + (c.h >> 1) - 2, 1, 3);
    }
  }
  function boxShape(g, b, st, prog, fold, hi) {
    const h = Math.max(2, Math.round(b.h * (1 - fold))), x = b.x, y = b.y - h, w = b.w;
    const body = ['#c8955a', '#c28c52', '#cc9a60'][b.tint], dk = shade(body, -0.25), lt = shade(body, 0.18);
    if (st === 1 && fold < 0.05) {
      // flaps
      const fh = Math.round(7 * prog);
      if (fh > 0) { for (let i = 0; i < fh; i++) { R(g, lt, x - 1 - (i >> 1), y - i - 1, 10, 1); R(g, lt, x + w - 9 + (i >> 1), y - i - 1, 10, 1); } R(g, dk, x - 1 - ((fh - 1) >> 1), y - fh, 10, 1); R(g, dk, x + w - 9 + ((fh - 1) >> 1), y - fh, 10, 1); }
    }
    R(g, body, x, y, w, h); R(g, dk, x, y + h - 1, w, 1); R(g, dk, x + w - 1, y, 1, h);
    if (h > 6) {
      if (st === 1) { R(g, '#5a3a1a', x + 1, y, w - 2, 3); R(g, '#6e4a26', x + 1, y + 2, w - 2, 1); }
      else { R(g, lt, x, y, w, 3); R(g, '#e8d8a8', x + (w >> 1) - 2, y, 4, 7); R(g, '#f4e8c0', x + (w >> 1) - 2, y, 1, 7); }
      R(g, dk, x + 4, y + 10, 7, 1); R(g, dk, x + 5, y + 12, 5, 1); R(g, dk, x + 15, y + 13, 5, 1);
    }
    if (hi) { g.strokeStyle = 'rgba(255,250,200,.9)'; g.lineWidth = 1; g.strokeRect(x - 0.5, y - 0.5, w + 1, h + 1); }
  }
  function drawRoom(g, L, S, r, o) {
    o = o || {};
    const room = L.rooms[r], open = o.open || new Set(), rects = o.rects || layoutRoom(L, S, r, open), byS = new Map();
    const disp = o.disp;
    rects.forEach(q => { const k = q.onBox ? 'box' : q.s.i; if (!byS.has(k)) byS.set(k, []); byS.get(k).push(q); });
    const drawItems = list => (list || []).forEach(q => {
      if (q.hidden || q.i === o.held) return;
      const d = disp && disp[q.i], x = d ? Math.round(d.x) : q.x, y = d ? Math.round(d.y) : q.y;
      if (!q.onBox) R(g, 'rgba(0,0,0,.16)', x + 1, y + q.h, q.w - 2, 1);
      g.drawImage(q.img, x, y);
    });
    drawWalls(g, room);
    // wall items first (behind furniture), then furniture in z order with items on their surfaces
    L.surfs.forEach(s => { if (s.r === r && s.t === 'wall') drawItems(byS.get(s.i)); });
    const conts = room.cont;
    room.draw.forEach(dw => dw.fn(g));
    room.surf.forEach(s => { if (s.t === 'line' && !s.floor && !s.cont) drawItems(byS.get(s.i)); });
    conts.forEach(c => { const op = open.has(c.i); drawCont(g, c, op); if (op) { c.lines.forEach(s => drawItems(byS.get(s.i))); drawContFront(g, c); } });
    if (o.hints) o.hints(g);
    room.surf.forEach(s => { if (s.floor) drawItems(byS.get(s.i)); });
    if (!o.noBoxes) {
      L.boxes.forEach((b, bi) => {
        if (b.r !== r) return; const st = S.b[bi][0], an = o.anim && o.anim[bi];
        const fold = an && an.fold != null ? an.fold : 0;
        if (st === 2 && !(an && an.fold != null && an.fold < 1)) return;
        boxShape(g, b, st === 2 ? 1 : st, an && an.open != null ? an.open : 1, fold, o.boxHi === bi);
      });
      drawItems(byS.get('box'));
    }
    // daylight
    const win = room.surf.find(s => s.sill);
    if (win) {
      g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(255,214,140,.07)';
      g.beginPath(); g.moveTo(win.x0 + 2, win.y); g.lineTo(win.x1 - 2, win.y); g.lineTo(win.x1 + 26, VH); g.lineTo(win.x0 + 14, VH); g.closePath(); g.fill();
      if (o.t != null) { g.fillStyle = 'rgba(255,240,200,.5)'; for (let k = 0; k < 7; k++) { const tt = o.t / 1000 * (0.12 + k * 0.02) + k * 0.37, fy = (tt % 1), mx = win.x0 + 6 + fy * 22 + ((k * 13) % (win.x1 - win.x0 - 8)), my = win.y + fy * (VH - win.y - 6) + Math.sin(tt * 6 + k) * 2; g.fillRect(Math.round(mx), Math.round(my), 1, 1); } }
      g.restore();
    }
    g.fillStyle = 'rgba(255,190,120,.05)'; g.fillRect(0, 0, VW, VH);
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
      place(mat) {
        if (mat === 'plush') { N(0.12, { ft: 'lowpass', f: 320, vol: 0.12, decay: 1 }); T(110, 0.1, { type: 'sine', to: 70, vol: 0.06, decay: 1 }); }
        else if (mat === 'glass') { T(2600, 0.35, { type: 'sine', vol: 0.045, decay: 1 }); T(3900, 0.22, { type: 'sine', vol: 0.03, decay: 1, at: 0.012 }); }
        else if (mat === 'paper') { N(0.14, { ft: 'highpass', f: 2800, vol: 0.07, attack: 0.03, release: 0.08 }); N(0.07, { at: 0.08, ft: 'bandpass', f: 4000, vol: 0.05, decay: 1 }); }
        else if (mat === 'metal') { T(1400, 0.25, { type: 'triangle', vol: 0.05, decay: 1 }); T(2110, 0.18, { type: 'sine', vol: 0.03, decay: 1 }); }
        else if (mat === 'wood') { T(330, 0.08, { type: 'triangle', vol: 0.08, decay: 1 }); N(0.03, { ft: 'bandpass', f: 900, q: 2, vol: 0.1, decay: 1 }); }
        else if (mat === 'cloth') { N(0.16, { ft: 'lowpass', f: 900, vol: 0.09, attack: 0.04, release: 0.1 }); }
        else { N(0.03, { ft: 'bandpass', f: 2400, q: 4, vol: 0.12, decay: 1 }); T(1200, 0.03, { type: 'square', vol: 0.02, decay: 1 }); }
      },
      jingle() { [72, 76, 79, 84, 81, 84, 88].forEach((n, i) => { T(api.midi(n), 0.9, { at: i * 0.14, type: 'triangle', vol: 0.06, decay: 1 }); T(api.midi(n - 12), 1.1, { at: i * 0.14, type: 'sine', vol: 0.035, decay: 1 }); }); }
    };
  }
  const SONG = { mel: [65, null, 69, 72, 70, null, 69, 65, 67, null, 65, 62, 64, null, null, null, 65, null, 69, 72, 74, null, 72, 69, 70, 69, 67, 64, 65, null, null, null], bass: [41, 38, 46, 48, 41, 38, 46, 41], step: 0.46, lead: 'triangle', leadVol: 0.03, bassVol: 0.045, bassType: 'sine', hold: 1.4, gain: 0.45 };

  /* ---------- the app ---------- */
  (window.RETRO_APPS = window.RETRO_APPS || []).push({
    id: 'movingday', label: 'Moving Day', kind: 'store', cat: 'game', year: 1995, price: 19.95, sizeKB: 6200,
    help: 'Unpack moving boxes and put things anywhere you like; the room keeps itself tidy. Each finished room earns money.',
    publisher: 'Cozy Corner Software', genre: 'Relaxing / Puzzle',
    tagline: 'Four moves. One life. Zero wrong answers.',
    blurb: 'Grow up one move at a time. Unpack a seven-year-old\'s first bedroom in 1985, a new house in 1990, the big room at the end of the hall in 1995 and a first apartment in 2000. Drag each keepsake anywhere it fits: shelves, drawers, windowsills, walls. The room tidies itself as you go, lining up books, stacking plates and hanging posters straight. No timers, no mistakes, just a warm afternoon of unpacking.',
    box: { bg: '#e9c48a', fg: '#4a2c14', accent: '#d9534f' },
    icon: '<svg viewBox="0 0 32 32" shape-rendering="crispEdges" aria-hidden="true"><rect x="3" y="14" width="26" height="15" fill="#c8955a" stroke="#6a4222"/><path d="M3 14l-2-5h11l2 5zM29 14l2-5H20l-2 5z" fill="#dcae74" stroke="#6a4222"/><rect x="4" y="15" width="24" height="3" fill="#5a3a1a"/><g fill="#a8703c"><rect x="11" y="5" width="10" height="10"/><rect x="10" y="3" width="3" height="3"/><rect x="19" y="3" width="3" height="3"/></g><rect x="13" y="8" width="1" height="1" fill="#2b1d14"/><rect x="18" y="8" width="1" height="1" fill="#2b1d14"/><rect x="14" y="10" width="4" height="3" fill="#e2b27a"/><rect x="15" y="10" width="2" height="1" fill="#2b1d14"/><rect x="7" y="21" width="8" height="1" fill="#6a4222"/><rect x="8" y="23" width="6" height="1" fill="#6a4222"/></svg>',
    window: { w: 760, h: 600 },
    css: `.mvd{display:flex;flex-direction:column;height:100%;background:#d4d0c8;font-family:var(--ui);user-select:none;-webkit-user-select:none}
      .mvd-top{display:flex;align-items:center;gap:4px;padding:3px 4px;flex-wrap:wrap;border-bottom:1px solid #808080}
      .mvd-top .btn{min-width:0;padding:3px 8px}
      .mvd-tabs{display:flex;gap:2px}
      .mvd-tab{padding:3px 8px;border:1px solid #808080;background:#c8c4bc;cursor:pointer;font:inherit;border-radius:3px 3px 0 0}
      .mvd-tab.on{background:#fffbe8;font-weight:bold}
      .mvd-tab.hot{background:#fff2a8;outline:2px solid #c19a2e}
      .mvd-info{margin-left:auto;font-size:12px;padding:0 4px;white-space:nowrap}
      .mvd-stage{position:relative;flex:1;min-height:0;background:#3a2a20;overflow:hidden;touch-action:none}
      .mvd-cv{position:absolute;left:0;top:0;image-rendering:pixelated;image-rendering:crisp-edges;touch-action:none;display:block;cursor:default}
      .mvd-tip{position:absolute;left:50%;bottom:8px;transform:translateX(-50%);background:rgba(255,251,232,.95);border:1px solid #6a4222;color:#2b1d14;padding:3px 10px;font:18px/1.1 var(--dos);pointer-events:none;opacity:0;transition:opacity .25s;white-space:nowrap;max-width:94%;overflow:hidden;text-overflow:ellipsis}
      .mvd-tip.on{opacity:1}
      .mvd-ov{position:absolute;inset:0;display:none;align-items:center;justify-content:center;flex-direction:column;overflow:auto;padding:10px;box-sizing:border-box}
      .mvd-ov.on{display:flex}
      .mvd-card{background:rgba(30,20,14,.88);color:#fbe6b8;text-align:center;cursor:pointer}
      .mvd-card .yr{font:400 76px/1 var(--dos);color:#ffd27a;text-shadow:3px 3px 0 #6a4222;animation:mvdIn .8s ease-out}
      .mvd-card .ln{font:28px/1.2 var(--dos);margin-top:6px;animation:mvdIn 1.2s ease-out}
      .mvd-card .ag{font:20px var(--dos);color:#c9a878;margin-top:6px}
      @keyframes mvdIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
      .mvd-sel{background:#e9dcc0;justify-content:flex-start;gap:8px}
      .mvd-logo{font:400 44px/1 var(--dos);color:#6a4222;text-shadow:2px 2px 0 #f4cf55;margin-top:4px}
      .mvd-sub{font:18px var(--dos);color:#6a4222;margin-bottom:4px;text-align:center}
      .mvd-grid{display:grid;grid-template-columns:repeat(2,minmax(0,220px));gap:10px;width:100%;justify-content:center}
      .mvd-grid.w4{grid-template-columns:repeat(4,minmax(0,200px))}
      .mvd-lv{background:#fffbe8;border:2px solid #6a4222;padding:6px;display:flex;flex-direction:column;gap:4px;cursor:pointer;text-align:left;font:inherit;color:#2b1d14;box-shadow:3px 3px 0 rgba(0,0,0,.25)}
      .mvd-lv canvas{width:100%;image-rendering:pixelated;display:block;border:1px solid #6a4222}
      .mvd-lv b{font:24px/1 var(--dos);color:#6a4222}
      .mvd-lv small{font-size:11px;color:#5a4a3a}
      .mvd-lv.lock{filter:grayscale(1);opacity:.55;cursor:default}
      .mvd-lv .st{font-size:11px;font-weight:bold;color:#347038}
      .mvd-row{display:flex;gap:6px;flex-wrap:wrap;justify-content:center}
      .mvd-photo{background:rgba(30,20,14,.9)}
      .mvd-pics{position:relative;width:min(92%,520px);display:flex;justify-content:center;align-items:center;flex-wrap:wrap;gap:0}
      .mvd-pol{background:#fbf8f0;padding:7px 7px 30px;box-shadow:4px 6px 14px rgba(0,0,0,.5);position:relative;animation:mvdDrop .7s ease-out both;margin:4px -6px}
      .mvd-pol canvas{display:block;image-rendering:pixelated;width:100%}
      .mvd-pol span{position:absolute;left:0;right:0;bottom:6px;text-align:center;font:16px "Comic Sans MS","Chalkboard SE",cursive;color:#2c3a7a}
      @keyframes mvdDrop{from{opacity:0;transform:translateY(-30px) rotate(-8deg) scale(1.1)}}
      .mvd-msg{color:#fbe6b8;font:22px/1.2 var(--dos);margin:12px 0 8px;text-align:center}
      .mvd-help{background:#fffbe8;border:2px solid #6a4222;padding:10px 12px;max-width:420px;font-size:13px;line-height:1.45;color:#2b1d14}
      .mvd-help h3{margin:0 0 6px;font:26px var(--dos);color:#6a4222}
      .mvd-help p{margin:0 0 6px}`,
    open(W, api) {
      const opt = Object.assign({ music: true, sound: true, hints: true }, api.load('opt', {}));
      const snd = mkSnd(api, opt);
      const prog = Object.assign({ un: 1, paid: [0, 0, 0, 0], done: [0, 0, 0, 0], cur: 0 }, api.load('prog', {}));
      W.body.innerHTML = `<div class="mvd"><div class="mvd-top"><button class="btn" data-a="levels">Moves</button><button class="btn" data-a="undo">Undo</button><button class="btn" data-a="zoom" style="display:none">Zoom</button><div class="mvd-tabs"></div><span class="mvd-info"></span></div>
        <div class="mvd-stage"><canvas class="mvd-cv" width="${VW}" height="${VH}"></canvas><div class="mvd-tip"></div>
        <div class="mvd-ov mvd-card"></div><div class="mvd-ov mvd-sel"></div><div class="mvd-ov mvd-photo"></div><div class="mvd-ov mvd-hlp" style="background:rgba(30,20,14,.7)"></div></div></div>`;
      const $ = s => W.body.querySelector(s);
      const cv = $('.mvd-cv'), g = cv.getContext('2d'), stage = $('.mvd-stage'), tipEl = $('.mvd-tip'), tabsEl = $('.mvd-tabs'), infoEl = $('.mvd-info');
      const ovCard = $('.mvd-card'), ovSel = $('.mvd-sel'), ovPhoto = $('.mvd-photo'), ovHelp = $('.mvd-hlp');
      g.imageSmoothingEnabled = false;
      let li = -1, L = null, S = null, room = 0, open = new Set(), undo = [], disp = {}, anim = {}, drag = null, pend = null, wig = {}, raf = 0, saveT = 0, tipT = 0, cache = null, alive = true, finishing = false;
      let hoverTab = -1, hoverTabT = 0, hoverCont = -1, hoverContT = 0, musicOn = false;
      let zoomPref = opt.zoom == null ? null : !!opt.zoom, pan = -1, cw = 0, ch = 0, stW = 0, stH = 0, panDrag = null;

      /* --- persistence --- */
      function saveNow() {
        if (!L || !S) return;
        const it = S.it.map((l, i) => l === -1 && drag && drag.i === i ? drag.from : l);
        api.save('lv' + li, { b: S.b, it, c: S.c.map(v => v == null ? null : Math.round(v)), done: S.done });
      }
      const save = () => { clearTimeout(saveT); saveT = setTimeout(saveNow, 250); };
      const saveProg = () => api.save('prog', prog);
      const loadLv = i => { const d = api.load('lv' + i, null); return valid(LV(i), d) ? d : null; };

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
      function ui() {
        if (!L) { tabsEl.innerHTML = ''; infoEl.textContent = ''; return; }
        tabsEl.innerHTML = L.rooms.length > 1 ? L.rooms.map((rm, i) => { const n = boxesLeft(i); return `<button class="mvd-tab${i === room ? ' on' : ''}" data-r="${i}">${api.esc(rm.name)}${n ? ' (' + n + ')' : ''}</button>`; }).join('') : '';
        const n = boxesLeft();
        infoEl.textContent = `${L.year}` + (n ? ` · ${n} box${n > 1 ? 'es' : ''} to go` : ' · all unpacked');
        $('[data-a="undo"]').disabled = !undo.length;
      }
      function setRoom(r) { if (r === room || r < 0 || r >= L.rooms.length) return; room = r; open = new Set(); inval(); disp = {}; api.sfx.click(); pan = -1; place(); ui(); }

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
        if (covered(bi)) { const top = L.boxes.findIndex(q => q.under === bi); wig['b' + top] = performance.now(); snd.nope(); tip('Unpack the box on top first.'); return; }
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
          const others = rectsAll().filter(q => q.s && q.s.t === 'wall' && q.i !== i);
          let sx = z.x0 + Math.round((x - z.x0) / 4) * 4, sy = z.y0 + Math.round((y - z.y0) / 4) * 4;
          others.forEach(q => { if (Math.abs(q.y - sy) <= 4) sy = q.y; else if (Math.abs(q.y + q.h / 2 - (sy + h / 2)) <= 3) sy = Math.round(q.y + q.h / 2 - h / 2); if (Math.abs(q.x + q.w / 2 - (sx + w / 2)) <= 3) sx = Math.round(q.x + q.w / 2 - w / 2); });
          const fit = (xx, yy) => { xx = clamp(xx, z.x0, z.x1 - w); yy = clamp(yy, z.y0, z.y1 - h); return others.some(q => xx < q.x + q.w + 2 && xx + w + 2 > q.x && yy < q.y + q.h + 2 && yy + h + 2 > q.y) ? null : [xx, yy]; };
          let pos = fit(sx, sy);
          for (let rad = 1; !pos && rad <= 4; rad++) for (let dy = -rad; dy <= rad && !pos; dy++) for (let dx = -rad; dx <= rad && !pos; dx++) if (Math.max(Math.abs(dx), Math.abs(dy)) === rad) pos = fit(sx + dx * 4, sy + dy * 4);
          if (!pos) return { valid: false, s: z, reason: 'No room there.' };
          return { valid: true, wall: 1, s: z, x: pos[0], y: pos[1], rect: { x: pos[0], y: pos[1], w, h, img } };
        }
        // line surfaces: the nearest line under (or just above) the item's bottom edge
        let best = null, bs = 1e9;
        list.forEach(s => {
          if (s.t !== 'line') return;
          if (bx < s.x0 - 3 || bx > s.x1 + 3) return;
          const up = s.y - by, reach = s.floor ? 40 : Math.min(s.clear, 36) + 4;
          if (up < -8 || up > reach) return;
          const sc = up >= 0 ? up : -up * 3;
          if (sc < bs) { bs = sc; best = s; }
        });
        if (!best) {
          const onWall = list.some(s => s.t === 'wall' && bx >= s.x0 && bx <= s.x1 && y + h / 2 >= s.y0 && y + h / 2 <= s.y1);
          return { valid: false, none: 1, reason: onWall ? 'Only pictures and posters go on the wall.' : 'Drop it on a surface.' };
        }
        const s = best, slots = getSlots(S, s.i), cur = layoutLine(L, s, slots, S.c[s.i]);
        const lay0 = formOf(L, i, 0, s.clear);
        if (lay0.img.height > s.clear + 0.5) return { valid: false, s, reason: 'Too tall to fit there.' };
        // stack on something?
        if (d.stk) {
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
        if (d.row && !lay0.lay) {
          let br = null, bd = 1e9;
          runs.filter(r => r.row === d.row).forEach(r => { const x0 = cur.boxes[r.s].x, x1 = cur.boxes[r.e].x + cur.boxes[r.e].w, dd = bx < x0 ? x0 - bx : bx > x1 ? bx - x1 : 0; if (dd < bd) { bd = dd; br = r; } });
          if (br) idx = clamp(idx, br.s, br.e + 1);
        } else {
          const r = runs.find(r => idx > r.s && idx <= r.e);
          if (r) { const mid = (cur.boxes[r.s].x + cur.boxes[r.e].x + cur.boxes[r.e].w) / 2; idx = bx < mid ? r.s : r.e + 1; }
        }
        const ns = slots.map(q => q.slice()); ns.splice(idx, 0, [i]);
        const c = clamp(bx, s.x0, s.x1), lay = layoutLine(L, s, ns, c);
        if (!lay.ok && d.stk && !lay.tall) {
          // no room beside: pile it on a matching stack under the pointer instead
          const j = cur.boxes.findIndex(b => bx >= b.x - 2 && bx <= b.x + b.w + 2 && b.items.every(k => L.items[k].stk === d.stk));
          if (j >= 0) { const st = slots.map(q => q.slice()); st[j].push(i); const l2 = layoutLine(L, s, st, S.c[s.i]); if (l2.ok && st[j].length <= 8) return { valid: true, s, slots: st, c: S.c[s.i], rect: l2.rects.find(q => q.i === i), stack: 1 }; }
        }
        if (!lay.ok) return { valid: false, s, reason: lay.tall ? 'Too tall to fit there.' : 'No room there. Try another spot.' };
        return { valid: true, s, slots: ns, c, rect: lay.rects.find(q => q.i === i) };
      }
      const rectsAll = () => rects();
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
        hoverTab = -1; hoverCont = -1; tabsEl.querySelectorAll('.hot').forEach(b => b.classList.remove('hot'));
        ui();
      }
      cv.addEventListener('pointerdown', e => {
        if (!L || finishing || e.button > 0) return;
        if (!musicOn && opt.music) music(true);
        const p = vpt(e);
        try { cv.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ }
        const q = hitItem(p);
        if (q) { pend = { q, p, sx: e.clientX, sy: e.clientY, id: e.pointerId, e }; return; }
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
        // hover a room tab to carry the item to another room
        const el = document.elementFromPoint(e.clientX, e.clientY), tb = el && el.closest && el.closest('.mvd-tab');
        const r = tb ? +tb.dataset.r : -1;
        if (r >= 0 && r !== room) { if (hoverTab !== r) { hoverTab = r; hoverTabT = now; tb.classList.add('hot'); } else if (now - hoverTabT > 450) { setRoom(r); hoverTab = -1; } }
        else if (hoverTab >= 0) { hoverTab = -1; tabsEl.querySelectorAll('.hot').forEach(b => b.classList.remove('hot')); }
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
        if (pend) {
          const q = pend.q; pend = null;
          if (q.onBox) { /* tapping the item on the box does nothing special */ }
          wig['h' + q.i] = performance.now(); snd.boing(); tip(L.items[q.i].n + ' (drag to move)', 1400);
        }
        if (drag) { drag.p = vpt(e); drag.pl = plan(drag.i, drag.p); endDrag(false); }
        cv.style.cursor = 'default';
      };
      cv.addEventListener('pointerup', up);
      cv.addEventListener('pointercancel', () => { pend = null; panDrag = null; endDrag(true); });
      cv.addEventListener('contextmenu', e => e.preventDefault());

      /* --- actions --- */
      function doUndo() {
        if (!undo.length || drag) return;
        const prev = JSON.parse(undo.pop());
        // boxes folded by the undone move come back
        S = prev; anim = {}; inval(); disp = {}; snd.slide(); save(); ui(); tip('Undone.', 900);
      }
      function nextBox() {
        const bi = L.boxes.findIndex((b, j) => b.r === room && S.b[j][0] !== 2 && !covered(j) && !b.items.some(i => S.it[i] === 1));
        if (bi >= 0) { tapBox(bi); ui(); } else tip('Move the things on the boxes first.');
      }

      /* --- frame loop --- */
      function frame(t) {
        raf = requestAnimationFrame(frame);
        if (!L) return;
        if (drag && drag.cx != null && cw > stW) {
          // carry the view along when an item is dragged to the edge of a zoomed room
          const r = stage.getBoundingClientRect(), e = 30; let dp = 0;
          if (drag.cx < r.left + e) dp = -5; else if (drag.cx > r.right - e) dp = 5;
          const np = clamp(pan + dp, 0, cw - stW);
          if (np !== pan) { pan = np; place(); drag.p = vpt({ clientX: drag.cx, clientY: drag.cy }); drag.pl = plan(drag.i, drag.p); }
        }
        const R_ = rects();
        // tween display positions toward targets
        R_.forEach(q => {
          let d = disp[q.i]; if (!d) { disp[q.i] = { x: q.x, y: q.y }; return; }
          d.x += (q.x - d.x) * 0.3; d.y += (q.y - d.y) * 0.3;
          if (Math.abs(q.x - d.x) < 0.4) d.x = q.x; if (Math.abs(q.y - d.y) < 0.4) d.y = q.y;
        });
        // wiggles
        const dispW = {};
        R_.forEach(q => {
          const d = disp[q.i]; let ox = 0, oy = 0;
          const w1 = wig[q.i]; if (w1 && t - w1 < 420) ox = Math.round(Math.sin((t - w1) / 30) * 2 * (1 - (t - w1) / 420));
          const w2 = wig['h' + q.i]; if (w2 && t - w2 < 300) oy = -Math.round(Math.sin((t - w2) / 300 * Math.PI) * 3);
          dispW[q.i] = { x: d.x + ox, y: d.y + oy };
        });
        // box animations
        const an = {};
        Object.keys(anim).forEach(k => { const a2 = anim[k], dt = t - a2.t0; if (a2.open != null) { an[k] = { open: Math.min(1, dt / 260) }; if (dt > 300) delete anim[k]; } else if (a2.fold != null) { an[k] = { fold: Math.min(1, dt / 550) }; if (dt > 600) { delete anim[k]; } } });
        let boxHi = -1;
        Object.keys(wig).forEach(k => { if (k[0] === 'b' && t - wig[k] < 420) boxHi = +k.slice(1); });
        g.imageSmoothingEnabled = false;
        drawRoom(g, L, S, room, { open, rects: R_, disp: dispW, anim: an, t, boxHi, held: drag ? drag.i : -2, hints: drag && opt.hints ? drawHints : null });
        if (drag) drawDrag(t);
      }
      function drawHints(gg) {
        const d = L.items[drag.i];
        L.surfs.forEach(s => {
          if (s.r !== room) return;
          if (s.t === 'wall') {
            if (!d.wall) return;
            gg.strokeStyle = 'rgba(255,245,190,.6)'; gg.setLineDash([2, 2]); gg.strokeRect(s.x0 + 0.5, s.y0 + 0.5, s.x1 - s.x0 - 1, s.y1 - s.y0 - 1); gg.setLineDash([]);
            return;
          }
          if (d.wall || formOf(L, drag.i, 0, s.clear).img.height > s.clear) return;
          if (!surfActive(L, S, s, open)) {
            if (s.cont && s === s.cont.lines[s.cont.lines.length - 1] && !open.has(s.cont.i)) { gg.fillStyle = 'rgba(255,240,150,.3)'; gg.fillRect(s.cont.x, s.cont.y, s.cont.w, s.cont.h); gg.strokeStyle = 'rgba(255,245,190,.8)'; gg.strokeRect(s.cont.x + 0.5, s.cont.y + 0.5, s.cont.w - 1, s.cont.h - 1); }
            return;
          }
          if (!layoutLine(L, s, getSlots(S, s.i).concat([[drag.i]]), S.c[s.i]).ok) return;
          gg.fillStyle = 'rgba(255,245,170,.6)'; gg.fillRect(s.x0, s.y - 1, s.x1 - s.x0, 1);
          gg.fillStyle = 'rgba(255,245,170,.16)'; gg.fillRect(s.x0, s.y - 4, s.x1 - s.x0, 3);
        });
      }
      function drawDrag(t) {
        const d = L.items[drag.i], img = cvOf(d.spr), pl = drag.pl;
        const x = Math.round(drag.p.x - drag.ox), y = Math.round(drag.p.y - drag.oy);
        if (pl && pl.rect) {
          g.save(); g.globalAlpha = 0.45 + 0.1 * Math.sin(t / 160);
          g.drawImage(pl.rect.img, pl.rect.x, pl.rect.y); g.globalAlpha = 1;
          g.strokeStyle = pl.valid ? 'rgba(255,255,230,.9)' : 'rgba(230,80,60,.9)'; g.lineWidth = 1;
          g.strokeRect(pl.rect.x - 0.5, pl.rect.y - 0.5, pl.rect.w + 1, pl.rect.h + 1); g.restore();
        } else if (pl && pl.s && !pl.valid && pl.s.t === 'line') {
          g.fillStyle = 'rgba(230,80,60,.7)'; g.fillRect(pl.s.x0, pl.s.y - 1, pl.s.x1 - pl.s.x0, 1);
        } else if (pl && pl.s && !pl.valid && pl.s.t === 'wall') {
          g.strokeStyle = 'rgba(230,80,60,.7)'; g.strokeRect(pl.s.x0 + 0.5, pl.s.y0 + 0.5, pl.s.x1 - pl.s.x0 - 1, pl.s.y1 - pl.s.y0 - 1);
        }
        g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(x + 2, y + img.height + 2, img.width - 2, 2);
        g.drawImage(img, x, y - 1);
      }

      /* --- screens --- */
      function hideOv() { [ovCard, ovSel, ovPhoto, ovHelp].forEach(o => o.classList.remove('on')); }
      function startLevel(i, restart) {
        if (drag) endDrag(true);
        saveNow();
        li = i; L = LV(i); prog.cur = i; saveProg();
        S = !restart && loadLv(i) || fresh(L);
        if (restart) { S = fresh(L); saveNow(); }
        room = 0; open = new Set(); undo = []; disp = {}; anim = {}; wig = {}; inval(); finishing = false; pan = -1; place();
        hideOv(); ui(); music(true);
        const started = S.b.some(b => b[0]) || S.done;
        ovCard.innerHTML = `<div class="yr">${L.year}</div><div class="ln">${api.esc(L.title)}</div><div class="ag">${api.esc(L.sub)}${started ? '' : ' · tap a box to begin'}</div>`;
        ovCard.classList.add('on');
        const t0 = setTimeout(() => ovCard.classList.remove('on'), started ? 1600 : 2800);
        ovCard.onclick = () => { clearTimeout(t0); ovCard.classList.remove('on'); };
      }
      function showLevels() {
        if (drag) endDrag(true);
        saveNow(); hideOv();
        const cards = LEVELS.map((d, i) => {
          const lock = i >= prog.un, st = lock ? 'Locked' : prog.done[i] ? 'Unpacked' : loadLv(i) ? 'In progress' : 'Not started';
          return `<button class="mvd-lv${lock ? ' lock' : ''}" data-l="${i}" ${lock ? 'disabled' : ''}><canvas width="${VW}" height="${VH}"></canvas><b>${d.year}</b><small>${api.esc(d.title)} Age ${d.age}.</small><span class="st">${st}</span></button>`;
        }).join('');
        ovSel.innerHTML = `<div class="mvd-logo">Moving Day</div><div class="mvd-sub">Four moves. One life. Pick a year.</div><div class="mvd-grid">${cards}</div><div class="mvd-row" style="margin:6px 0 4px"><button class="btn" data-a="how">How to play</button>${L ? '<button class="btn" data-a="back">Back to my room</button>' : ''}</div>`;
        ovSel.querySelectorAll('.mvd-lv').forEach(el => {
          const i = +el.dataset.l, c = el.querySelector('canvas'), gg = c.getContext('2d'), Lx = LV(i), Sx = loadLv(i) || fresh(Lx);
          gg.imageSmoothingEnabled = false;
          if (i < prog.un) drawRoom(gg, Lx, Sx, 0, {}); else { drawRoom(gg, Lx, fresh(Lx), 0, { noBoxes: 1 }); }
        });
        ovSel.classList.add('on'); fit();
        ui();
      }
      ovSel.addEventListener('click', e => {
        const b = e.target.closest('[data-l]'), a = e.target.closest('[data-a]');
        if (b && !b.disabled) { api.sfx.click(); startLevel(+b.dataset.l); }
        else if (a && a.dataset.a === 'how') howTo();
        else if (a && a.dataset.a === 'back') { hideOv(); }
      });
      function finish() {
        if (finishing || !L || !S.b.every(b => b[0] === 2)) return;
        finishing = true; S.done = 1; saveNow();
        const first = !prog.done[li];
        prog.done[li] = 1; if (prog.un < li + 2) prog.un = Math.min(4, li + 2);
        let paid = 0;
        if (!prog.paid[li]) { prog.paid[li] = 1; paid = 1; api.earn(4, 'unpacking your new room'); }
        saveProg(); snd.jingle();
        const pics = L.rooms.map((rm, r) => {
          const c = mkc(VW, VH), gg = c.getContext('2d'); gg.imageSmoothingEnabled = false;
          drawRoom(gg, L, S, r, { noBoxes: 1 });
          gg.fillStyle = 'rgba(255,200,120,.10)'; gg.fillRect(0, 0, VW, VH);
          const rad = gg.createRadialGradient(VW / 2, VH / 2, VH * 0.4, VW / 2, VH / 2, VW * 0.72); rad.addColorStop(0, 'rgba(0,0,0,0)'); rad.addColorStop(1, 'rgba(60,30,10,.35)'); gg.fillStyle = rad; gg.fillRect(0, 0, VW, VH);
          return c;
        });
        const n = pics.length, wpc = n === 1 ? 'min(88%,400px)' : n === 2 ? 'min(48%,260px)' : 'min(34%,210px)';
        ovPhoto.innerHTML = `<div class="mvd-pics"></div><div class="mvd-msg"></div><div class="mvd-row"></div>`;
        const box = ovPhoto.querySelector('.mvd-pics');
        pics.forEach((c, r) => { const d = document.createElement('div'); d.className = 'mvd-pol'; d.style.width = wpc; d.style.transform = `rotate(${[-3, 2.5, -1.5][r % 3]}deg)`; d.style.animationDelay = (r * 0.25) + 's'; d.appendChild(c); const sp = document.createElement('span'); sp.textContent = n > 1 ? `${L.rooms[r].name}, ${L.year}` : L.cap; d.appendChild(sp); box.appendChild(d); });
        ovPhoto.querySelector('.mvd-msg').textContent = (li === 3 ? 'All four moves done. Home at last.' : 'All unpacked!') + (paid ? ' You earned $4.' : '');
        const row = ovPhoto.querySelector('.mvd-row');
        const btn = (t, fn) => { const b = document.createElement('button'); b.className = 'btn'; b.textContent = t; b.onclick = () => { api.sfx.click(); fn(); }; row.appendChild(b); };
        btn('Keep decorating', () => { ovPhoto.classList.remove('on'); finishing = false; });
        if (li < 3) btn(`Next move: ${LEVELS[li + 1].year} >`, () => startLevel(li + 1));
        btn('All moves', showLevels);
        setTimeout(() => { if (alive) ovPhoto.classList.add('on'); }, first ? 200 : 100);
        ui();
      }
      function howTo() {
        ovHelp.innerHTML = `<div class="mvd-help"><h3>How to play</h3>
          <p><b>Tap a box</b> to open it, then tap it again to take out the next thing.</p>
          <p><b>Drag</b> it anywhere it fits: the bed, shelves, desk, windowsill, the floor, or inside a drawer or cupboard (tap one to open it, or hold an item over it). Posters, photos and clocks hang on the wall.</p>
          <p>The room tidies itself: things sit straight, spread out evenly, books and tapes line up, and plates, towels and CDs stack when you drop them on top of each other.</p>
          <p>There is no wrong place. Move anything again whenever you like. When every box is empty, you get a photo of your room and $4 the first time.</p>
          <p>Rooms with tabs: drag an item onto a tab to carry it to another room. On a small screen, Zoom makes everything bigger; drag the bare wall or floor to look around. Keys: Space opens the next box, Ctrl+Z undoes, arrows switch rooms.</p>
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
        else if (b && b.dataset.a === 'zoom') { zoomPref = !(cw > stW); opt.zoom = zoomPref; api.save('opt', opt); pan = -1; fit(); }
      });
      const toggle = k => { opt[k] = !opt[k]; api.save('opt', opt); if (k === 'music') music(opt.music); tip({ music: 'Music', sound: 'Sounds', hints: 'Hints' }[k] + (opt[k] ? ' on' : ' off'), 1000); };
      api.menubar([
        { label: 'Game', items: () => [
          { label: 'Unpack this move again...', fn: () => L && api.msgBox('Moving Day', `Put everything back in the boxes and start ${L.year} over?`, ['Yes', 'No'], 'warn').then(r => { if (r === 'Yes') startLevel(li, true); }), disabled: !L },
          { label: 'Choose a move...', fn: showLevels },
          '-', { label: 'Undo', fn: doUndo, disabled: !undo.length },
          '-', { label: 'How to play', fn: howTo },
          '-', { label: 'Exit', fn: () => api.close() }] },
        { label: 'Options', items: () => [
          { label: (opt.music ? '✓ ' : '   ') + 'Music', fn: () => toggle('music') },
          { label: (opt.sound ? '✓ ' : '   ') + 'Sounds', fn: () => toggle('sound') },
          { label: (opt.hints ? '✓ ' : '   ') + 'Show hints (glow where it fits)', fn: () => toggle('hints') }] },
        { label: 'Help', items: [{ label: 'How to play', fn: howTo }, { label: 'About Moving Day', fn: () => api.msgBox('About Moving Day', 'Moving Day\nCozy Corner Software, 1995\n\nFour moves, one life, and nothing is ever in the wrong place.', ['OK']) }] }
      ]);
      W.onKey = e => {
        const k = e.key;
        if (k === 'Escape') { if (drag) { endDrag(true); e.preventDefault(); } else if (ovHelp.classList.contains('on')) ovHelp.classList.remove('on'); else if (ovCard.classList.contains('on')) ovCard.classList.remove('on'); return; }
        if (ovSel.classList.contains('on') || ovPhoto.classList.contains('on') || !L) return;
        if ((k === 'z' || k === 'Z') && (e.ctrlKey || e.metaKey) || k === 'u' || k === 'U') { e.preventDefault(); doUndo(); }
        else if (k === 'ArrowLeft') { e.preventDefault(); setRoom(room - 1); }
        else if (k === 'ArrowRight') { e.preventDefault(); setRoom(room + 1); }
        else if (k === ' ' || k === 'Enter') { e.preventDefault(); ovCard.classList.remove('on'); nextBox(); }
      };
      // Fit the room in the stage. On tall, narrow screens (phones) the room can be zoomed to the
      // stage height and panned sideways, so things are bigger to grab.
      function fit() {
        const r = stage.getBoundingClientRect(); if (!r.width || !r.height) return;
        stW = r.width; stH = r.height;
        let s = Math.min(stW / VW, stH / VH); const si = Math.floor(s);
        const zoomable = stH / VH > s * 1.3;
        if (zoomable && (zoomPref == null ? stW < 560 : zoomPref)) s = Math.min(stH / VH, s * 1.7);
        else if (si >= 2 && si / s > 0.86) s = si;
        cw = Math.floor(VW * s); ch = Math.floor(VH * s);
        cv.style.width = cw + 'px'; cv.style.height = ch + 'px';
        const gr = ovSel.querySelector('.mvd-grid'); if (gr) gr.classList.toggle('w4', stW >= 640);
        const zb = $('[data-a="zoom"]'); zb.style.display = zoomable ? '' : 'none'; zb.textContent = cw > stW ? 'Zoom out' : 'Zoom in';
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
      fit(); requestAnimationFrame(fit);
      raf = requestAnimationFrame(frame);
      showLevels();
    }
  });
})();
