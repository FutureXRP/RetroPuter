/* Home Page Builder ("CyberBurbs Page Wizard"): a built-in accessory in 1995 and 2000.
   Build a personal home page from blocks, publish it to the fake Web at
   http://www.cyberburbs.com/<username>/, or share it as a link (#1995&page=<code>) that
   opens the page in anyone's RetroPuter. Everything lives inside this closure. */
(function () {
  'use strict';

  const ID = 'pagebuilder';
  const HOST = 'http://www.cyberburbs.com/';
  const SHARE_URL = HOST + 'shared/';
  const RESERVED = ['shared', 'siliconhills', 'hollywood', 'sunsetstrip', 'petsburgh', 'heartland', 'area51', 'help', 'members', 'www'];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- compact URL-safe compressor (an LZ-string style LZW coder, 6 bits per character) ---------- */
  const KEY = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  const KEYI = {}; for (let i = 0; i < 64; i++) KEYI[KEY[i]] = i;
  function lzc(s) {
    const dict = new Map(), fresh = new Set(), data = [];
    let w = '', enlargeIn = 2, dictSize = 3, numBits = 2, val = 0, pos = 0;
    const out = (bits, v) => { for (let j = 0; j < bits; j++) { val = (val << 1) | (v & 1); if (pos === 5) { pos = 0; data.push(KEY[val]); val = 0; } else pos++; v >>= 1; } };
    const grow = () => { if (--enlargeIn === 0) { enlargeIn = 2 ** numBits; numBits++; } };
    const emit = w => {
      if (fresh.has(w)) {
        const code = w.charCodeAt(0);
        if (code < 256) { out(numBits, 0); out(8, code); } else { out(numBits, 1); out(16, code); }
        grow(); fresh.delete(w);
      } else out(numBits, dict.get(w));
      grow();
    };
    for (const c of s.split('')) {
      if (!dict.has(c)) { dict.set(c, dictSize++); fresh.add(c); }
      const wc = w + c;
      if (dict.has(wc)) w = wc;
      else { emit(w); dict.set(wc, dictSize++); w = c; }
    }
    if (w !== '') emit(w);
    out(numBits, 2);
    for (;;) { val <<= 1; if (pos === 5) { data.push(KEY[val]); break; } pos++; }
    return data.join('');
  }
  function lzd(str) {
    if (typeof str !== 'string' || !str || str.length > 20000 || !/^[A-Za-z0-9_-]+$/.test(str)) return null;
    const len = str.length, dict = [0, 1, 2];
    let enlargeIn = 4, dictSize = 4, numBits = 3, w, c, entry, total = 0;
    const d = { val: KEYI[str[0]], pos: 32, index: 1 };
    const read = n => {
      let bits = 0, power = 1; const max = 2 ** n;
      while (power !== max) {
        const b = d.val & d.pos; d.pos >>= 1;
        if (d.pos === 0) { d.pos = 32; d.val = d.index < len ? KEYI[str[d.index]] : 0; d.index++; }
        if (b) bits |= power; power *= 2;
      }
      return bits;
    };
    const result = [];
    switch (read(2)) { case 0: c = String.fromCharCode(read(8)); break; case 1: c = String.fromCharCode(read(16)); break; default: return ''; }
    dict[3] = c; w = c; result.push(c); total = 1;
    for (;;) {
      if (d.index > len) return null;
      c = read(numBits);
      if (c === 0 || c === 1) { dict[dictSize++] = String.fromCharCode(read(c ? 16 : 8)); c = dictSize - 1; if (--enlargeIn === 0) { enlargeIn = 2 ** numBits; numBits++; } }
      else if (c === 2) return result.join('');
      if (dict[c] !== undefined && typeof dict[c] === 'string') entry = dict[c];
      else if (c === dictSize) entry = w + w.charAt(0);
      else return null;
      result.push(entry); total += entry.length;
      if (total > 40000) return null;
      dict[dictSize++] = w + entry.charAt(0);
      w = entry;
      if (--enlargeIn === 0) { enlargeIn = 2 ** numBits; numBits++; }
    }
  }

  /* ---------- clip art: pixel grids drawn as SVG ---------- */
  const PAL = { k: '#000', w: '#fff', r: '#e00000', R: '#800000', o: '#ff8000', y: '#ffe000', Y: '#c09000', g: '#10c010', G: '#006000', b: '#1050ff', B: '#000080', c: '#00e0ff', l: '#a0c8ff', p: '#ff80c0', m: '#e000e0', v: '#8000c0', n: '#8b4513', N: '#5a2d0c', t: '#f0c890', s: '#c0c0c0', S: '#808080', d: '#404040' };
  const up = rows => rows.slice(1).concat(['.'.repeat(rows[0].length)]);
  const nudge = rows => rows.map(r => '.' + r.slice(0, -1));
  const mirror = rows => rows.map(r => r.split('').reverse().join(''));
  const swap = (rows, a, b) => rows.map(r => r.split(a).join(b));
  const setRows = (rows, o) => rows.map((r, i) => o[i] !== undefined ? o[i] : r);

  const ENV = ['kkkkkkkkkkkkkkkk', 'kkwwwwwwwwwwwwkk', 'kwkwwwwwwwwwwkwk', 'kwwkwwwwwwwwkwwk', 'kwwwkwwwwwwkwwwk', 'kwwwwkwwwwkwwwwk', 'kwwwwwkkkkwwwwwk', 'kwwwwwwwwwwwwwwk', 'kwwwwwwwwwwwwwwk', 'kkkkkkkkkkkkkkkk'];
  const BAR = ['.oo..........oo.', '.oo..........oo.', 'kkkkkkkkkkkkkkkk', 'kyykkyykkyykkyyk', 'kkyykkyykkyykkyk', 'kykkyykkyykkyykk', 'kkkkkkkkkkkkkkkk', '.kk..........kk.', '.kk..........kk.', 'kkkk........kkkk'];
  const GMASK = ['....xxxx....', '..xxxxxxxx..', '.xxxxxxxxxx.', '.xxxxxxxxxx.', 'xxxxxxxxxxxx', 'xxxxxxxxxxxx', 'xxxxxxxxxxxx', 'xxxxxxxxxxxx', '.xxxxxxxxxx.', '.xxxxxxxxxx.', '..xxxxxxxx..', '....xxxx....'];
  const GLAND = ['...gg.........gggg......', '..gggg.......ggggg......', '.ggggg.......gggg....g..', '..gggg........gg....ggg.', '...ggg........ggg...gggg', '....gg.........gg....gg.', '....g.........ggg.......', '.....gg.......gg........', '......g........g.....gg.', '.....................ggg', '........................', '........................'];
  const globe = off => GMASK.map((r, y) => r.split('').map((ch, x) => ch === '.' ? '.' : GLAND[y][(x + off) % 24] === 'g' ? 'g' : 'b').join(''));
  const FLAME = ['..r.....r....r..', '.rr..r..rr..rr.r', '.ro.rr.rro.rro.r', 'roorro.roorrooro', 'royoroorroyrroyo', 'ryyyooyoryyooyyo', 'yyyyyyyyyyyyyyyy', 'yyyyyyyyyyyyyyyy'];
  const CAT = ['.k........k.', '.kk......kk.', '.kSk....kSk.', '.kSSkkkkSSk.', '.kSSSSSSSSk.', 'kSSgkSSgkSSk', 'kSSSSSSSSSSk', 'kSSSSppSSSSk', '.kSSSkkSSSk.', '..kSSSSSSk..', '...kkkkkk...'];
  const DOG = ['...tttttt...', '.nttttttttn.', 'nnttttttttnn', 'nntkttttktnn', 'nnttttttttnn', 'nnttkkkkttnn', '.nttkkkkttn.', '..tttttttt..', '...ttrrtt...', '....trrt....'];
  const HAM = ['..o......o..', '.oop....poo.', '.oooooooooo.', 'oookoooookoo', 'oooooppooooo', 'wwwoowwoowww', 'wwwwwwwwwwww', '.wwwwwwwwww.', '..tt....tt..'];
  const STAR = ['.....y.....', '.....y.....', '....yyy....', 'yyyyyyyyyyy', '.yyyyyyyyy.', '..yyyyyyy..', '..yyyyyyy..', '.yyyy.yyyy.', '.yyy...yyy.', 'yy.......yy'];
  const SMILE = ['....kkkk....', '..kkyyyykk..', '.kyyyyyyyyk.', '.kyyyyyyyyk.', 'kyyykyykyyyk', 'kyyykyykyyyk', 'kyyyyyyyyyyk', 'kyykyyyykyyk', '.kyykkkkyyk.', '.kyyyyyyyyk.', '..kkyyyykk..', '....kkkk....'];
  const PC = ['.ssssssssss.', '.sbbbbbbbbs.', '.sbwbbbbbbs.', '.sbbbbbbbbs.', '.sbbbbbbbbs.', '.ssssssssss.', '.ssssssgsss.', '....ssss....', '..ssssssss..', '.dddddddddd.', 'dswswswswswd', '.dddddddddd.'];
  const FLY = ['mm........mm', 'mmm.k..k.mmm', 'mymm.kk.mmym', 'mmmmmkkmmmmm', '.mmmmkkmmmm.', '..mmmkkmmm..', '.mymmkkmmym.', '.mmm.kk.mmm.', '..m..kk..m..'];
  const DINO = ['.......gggggg.', '......ggkggggg', '......gggggggg', '......gggg....', 'g....ggggggg..', 'gg..ggggg.....', 'gggggggggg....', '.ggggggggg....', '..gggggggg....', '...ggg.gg.....', '...gg...g.....', '...ggg..gg....'];
  const GEM = ['..lllllll..', '.lwlllllll.', 'ccccccccccc', '.ccccccccc.', '..cccbccc..', '...cccbc...', '....cbc....', '.....c.....'];
  const CAKE = ['...y..y..y..', '...r..b..g..', '...r..b..g..', 'pppppppppppp', 'wpwwpwwpwwpw', 'tttttttttttt', 'ttrtttbtttgt', 'tttttttttttt', 'pppppppppppp', 'tttttttttttt'];
  const MBOX = ['...bbbbbb...', '..bbbbbbbbr.', '.bbbbbbbbbrr', '.bbbbbbbbbr.', '.bbbbbbbbbr.', '.bbbbbbbbbb.', '.bbbbbbbbbb.', '.....nn.....', '.....nn.....', '.....nn.....', '...gggggg...'];
  const PHONE = ['.rrrrrrrrrr.', 'rrrrrrrrrrrr', 'rr..rrrr..rr', '....rrrr....', '...rrrrrr...', '..rrwkwkrr..', '..rrkwkwrr..', '..rrwkwkrr..', '.rrrrrrrrrr.'];
  const ROCKET = ['....rr....', '...rrrr...', '...wwww...', '...wbbw...', '...wbbw...', '...wwww...', '...wwww...', '..rwwwwr..', '.rrwwwwrr.', '.r.wwww.r.', '....oo....', '...oyyo...', '....yy....'];
  const CAR = ['....rrrrr.....', '...rlllllr....', '..rllrllllr...', 'rrrrrrrrrrrrrr', 'rrrrrrrrrrrrrr', 'rrrrrrrrrrrrrr', '.kkk.....kkk..', '.kwk.....kwk..'];
  const ARROW = ['......r.....', '......rr....', '......rrr...', 'rrrrrrrrrr..', 'rrrrrrrrrrr.', 'rrrrrrrrrr..', '......rrr...', '......rr....', '......r.....'];
  const GHOST = ['....wwww....', '..wwwwwwww..', '.wwwwwwwwww.', '.wwkkwwkkww.', '.wwkkwwkkww.', '.wwwwwwwwww.', '.wwwwkkwwww.', '.wwwwwwwwww.', '.wwwwwwwwww.', '.w.ww.ww.ww.'];
  const TWINK = ['...c...', '...c...', '..ccc..', 'cccwccc', '..ccc..', '...c...', '...c...'];

  // [id, label, frames, options]  options: t = seconds per cycle, cls = extra animation class
  const CLIPS = [
    ['mail', 'Animated email', [ENV, setRows(ENV, { 1: 'kkyyyyyyyyyyyykk', 2: 'kykyyyyyyyyyykyk', 3: 'kyykyyyyyyyykyyk', 4: 'kyyykyyyyyykyyyk', 5: 'kyyyykyyyykyyyyk' })], { t: 0.9 }],
    ['construct', 'Under construction', [BAR, swap(BAR.slice(0, 2), 'o', 'y').concat(BAR.slice(2))], { t: 0.7 }],
    ['globe', 'Spinning globe', [globe(0), globe(6), globe(12), globe(18)], { t: 1.6 }],
    ['flames', 'Flames', [FLAME, mirror(FLAME)], { t: 0.4 }],
    ['cat', 'Cat', [CAT, setRows(CAT, { 5: 'kSSkkSSkkSSk' })], { t: 2.4 }],
    ['dog', 'Dog', [DOG, setRows(DOG, { 8: '...tttttt...', 9: '............' })], { t: 0.8 }],
    ['hamster', 'Dancing hamster', [HAM, up(HAM)], { t: 0.5 }],
    ['fish', 'Goldfish', [['....oooo.....', '..oooooooo..o', '.owkooooooooo', 'oooooooooooo.', '.oooooooooooo', '..oooooooo..o', '....oooo.....']], {}],
    ['bird', 'Bluebird', [['....bbb.....', '...bbwkb....', '...bbbbboo..', '.bbbbbbb....', 'bbbbbbbbb...', '.lllbbbbb...', '..lllbbbb...', '....bbbb....', '.....o.o....']], { cls: 'hop' }],
    ['flower', 'Flower', [['...pp..pp...', '..pppppppp..', '..ppyyyypp..', '...pyyyyp...', '..ppyyyypp..', '..pppppppp..', '...pp..pp...', '.....gg.....', '..ggg.g.....', '...gggg.ggg.', '.....ggggg..', '.....gg.....']], {}],
    ['sun', 'Sunshine', [['.....y.....', '.y...y...y.', '..y.ooo.y..', '...ooooo...', '..ooyyyoo..', 'yyoyyyyyoyy', '..ooyyyoo..', '...ooooo...', '..y.ooo.y..', '.y...y...y.', '.....y.....']], { cls: 'pulse' }],
    ['moon', 'Moon', [['...yyyy...', '.yyyy.....', '.yyy......', 'yyy.......', 'yyy.......', 'yyy.......', 'yyyy......', '.yyyy....y', '..yyyyyyy.', '....yyy...']], {}],
    ['star', 'Twinkling star', [STAR, STAR.map((r, i) => i >= 2 && i <= 6 ? r.slice(0, 5) + 'w' + r.slice(6) : r)], { t: 0.6 }],
    ['sparkle', 'Sparkle', [TWINK, ['.......', '...c...', '..cwc..', '.cwwwc.', '..cwc..', '...c...', '.......']], { t: 0.5 }],
    ['heart', 'Heart', [['.rrr...rrr.', 'rrrrr.rrrrr', 'rrwrrrrrrrr', 'rrrrrrrrrrr', '.rrrrrrrrr.', '..rrrrrrr..', '...rrrrr...', '....rrr....', '.....r.....']], { cls: 'pulse' }],
    ['smiley', 'Smiley face', [SMILE, setRows(SMILE, { 4: 'kyyykyyyyyyk', 5: 'kyyykyykkkyk' })], { t: 1.8 }],
    ['computer', 'Computer', [PC, setRows(PC, { 2: '.sbbbbbbbbs.' })], { t: 0.8 }],
    ['floppy', 'Floppy disk', [['BBBBBBBBBBB.', 'BBBssssBsBBB', 'BBBssssBsBBB', 'BBBssssssBBB', 'BBBBBBBBBBBB', 'BBwwwwwwwwBB', 'BBwkkkkkkwBB', 'BBwwwwwwwwBB', 'BBwkkkkkwwBB', 'BBwwwwwwwwBB', 'BBwwwwwwwwBB', 'BBBBBBBBBBBB']], {}],
    ['book', 'Book', [['..RRRRRRRRR.', '.RRRRRRRRRR.', '.RRyyyyyyRR.', '.RRRRRRRRRR.', '.RRRRRRRRRR.', '.RRRRRRRRRR.', '.RRRRRRRRRR.', '.Rwwwwwwwww.', '..RRRRRRRRR.']], {}],
    ['pencil', 'Pencil', [['.yyyyyyyyytt..', 'pyyyyyyyyyttt.', 'pYYYYYYYYYtttk', 'pyyyyyyyyyttt.', '.yyyyyyyyytt..']], {}],
    ['pizza', 'Pizza slice', [['nnnnnnnnnnnn', 'nyyyyyyyyyyn', '.yyryyyyryy.', '.yyyyyyyyyy.', '..yyyryyyy..', '..yyyyyyyy..', '...yyyyry...', '...yyyyyy...', '....yyyy....', '....yryy....', '.....yy.....']], {}],
    ['icecream', 'Ice cream', [['..pppp..', '.pppppp.', 'pppwpppp', 'pppppppp', 'yyyyyyyy', 'tntntntn', '.ntntnt.', '.tntntn.', '..ntnt..', '..tntn..', '...nt...', '...tn...']], {}],
    ['cake', 'Birthday cake', [CAKE, setRows(CAKE, { 0: '...o..o..o..' })], { t: 0.4 }],
    ['balloon', 'Balloon', [['..rrrr..', '.rrrrrr.', 'rrwrrrrr', 'rwrrrrrr', 'rrrrrrrr', 'rrrrrrrr', '.rrrrrr.', '..rrrr..', '...rr...', '...k....', '....k...', '...k....', '....k...']], { cls: 'float' }],
    ['ball', 'Soccer ball', [['....kkkk....', '..kkwwwwkk..', '.kwwwkkwwwk.', '.kwwkkkkwwk.', 'kwwwwkkwwwwk', 'kkwwwwwwwwkk', 'kkkwwwwwwkkk', 'kkwwwkkwwwkk', '.kwwkkkkwwk.', '.kwwwkkwwwk.', '..kkwwwwkk..', '....kkkk....']], { cls: 'hop' }],
    ['trophy', 'Trophy', [['..yyyyyyyy..', 'yyyyyyyyyyyy', 'y.yyyyyyyy.y', 'y.yyywyyyy.y', '.yyyyyyyyyy.', '...yyyyyy...', '....yyyy....', '.....yy.....', '.....yy.....', '...YYYYYY...', '..nnnnnnnn..', '..nnnnnnnn..']], {}],
    ['crown', 'Crown', [['y....y....y', 'yy..yyy..yy', 'yyy.yyy.yyy', 'yyyyyyyyyyy', 'yryyybyyyry', 'yyyyyyyyyyy', 'YYYYYYYYYYY']], {}],
    ['gem', 'Sparkly gem', [GEM, setRows(GEM, { 1: '.llllllwll.' })], { t: 0.7 }],
    ['tree', 'Tree', [['.....gg.....', '....gggg....', '...ggGggg...', '..gggggGgg..', '.ggGggggggg.', 'gggggggGgggg', '.gggGgggggg.', '..gggggggg..', '.....nn.....', '.....nn.....', '....nnnn....']], {}],
    ['house', 'House', [['.....rr.....', '....rrrr....', '...rrrrrr...', '..rrrrrrrr..', '.rrrrrrrrrr.', 'rrrrrrrrrrrr', '.tttttttttt.', '.tllttttllt.', '.tllttttllt.', '.ttttnntttt.', '.ttttnntttt.', '.ttttnntttt.']], {}],
    ['car', 'Race car', [CAR, setRows(CAR, { 6: '.kwk.....kwk..', 7: '.kkk.....kkk..' })], { t: 0.3 }],
    ['rocket', 'Rocket', [ROCKET, setRows(ROCKET, { 10: '...oyyo...', 11: '....oo....', 12: '...y..y...' })], { t: 0.3 }],
    ['butterfly', 'Butterfly', [FLY, FLY.map(r => '..' + r.slice(2, 10) + '..')], { t: 0.5 }],
    ['bee', 'Bumblebee', [['..ll..ll....', '.llll.lll...', '..llllll....', '.yykyykyy...', 'kyykyykyyy..', 'yyykyykyyyk.', 'kyykyykyyy..', '.yykyykyy...']], { cls: 'hop' }],
    ['turtle', 'Turtle', [['....GGGGG.....', '...GgGgGgG....', '..GgGgGgGgG...', '.GGGGGGGGGGGgg', '..gg....gg.gkg', '..gg....gg....']], {}],
    ['alien', 'Friendly alien', [['..k......k..', '...k....k...', '..gggggggg..', '.gggggggggg.', 'gggkkggkkggg', 'gggkwggkwggg', 'gggggggggggg', '.ggggkkgggg.', '..gggggggg..', '...g.gg.g...', '..gg....gg..']], { cls: 'hop' }],
    ['dino', 'Dinosaur', [DINO, setRows(DINO, { 10: '...g....gg....', 11: '..gg.....gg...' })], { t: 0.6 }],
    ['ghost', 'Friendly ghost', [GHOST, setRows(GHOST, { 9: '..ww.ww.ww.w' })], { t: 0.6, cls: 'float' }],
    ['guitar', 'Guitar', [['...kk...', '...kk...', '...nn...', '...nn...', '...nn...', '...nn...', '..rrrr..', '.rrrrrr.', '.rrkkrr.', 'rrrkkrrr', 'rrrrrrrr', 'rrrnnrrr', '.rrrrrr.', '..rrrr..']], {}],
    ['note', 'Music note', [['...mmmmmmm', '...mmmmmmm', '...m.....m', '...m.....m', '...m.....m', '...m.....m', '...m.....m', '.mmm...mmm', 'mmmm..mmmm', 'mmmm..mmmm', '.mm....mm.']], { cls: 'hop' }],
    ['phone', 'Ringing phone', [PHONE, PHONE.map(r => r.slice(1) + '.')], { t: 0.15 }],
    ['mailbox', 'Mailbox', [MBOX, setRows(MBOX, { 1: '..bbbbbbbb..', 2: '.bbbbbbbbb..', 3: '.bbbbbbbbbrr', 4: '.bbbbbbbbbr.' })], { t: 1.4 }],
    ['rainbow', 'Rainbow', [['....rrrrrrrr....', '..rroooooooorr..', '.rooyyyyyyyyoor.', 'royyggggggggyyor', 'roygbbbbbbbbgyor', 'roygb......bgyor', 'roygb......bgyor']], {}],
    ['arrow', 'Click here arrow', [ARROW, nudge(ARROW)], { t: 0.5 }],
    ['new', 'NEW! badge', 'NEW!', { bg: '#f00', fg: '#ff0', blink: true }],
    ['hot', 'HOT! badge', 'HOT!', { bg: '#ff8000', fg: '#fff', blink: true }],
    ['cool', 'COOL badge', 'COOL', { bg: '#00c0ff', fg: '#000080' }],
    ['wow', 'WOW! badge', 'WOW!', { bg: '#e000e0', fg: '#fff', blink: true }],
    ['welcome', 'Welcome sign', 'WELCOME', { bg: '#006000', fg: '#fff' }],
    ['email', 'Email me! sign', 'EMAIL ME', { bg: '#000080', fg: '#ffe000', blink: true }]
  ];
  const CLIP = {}; CLIPS.forEach(c => { CLIP[c[0]] = c; });

  function drawFrame(rows) {
    let s = '';
    rows.forEach((r, y) => {
      let x = 0;
      while (x < r.length) {
        const ch = r[x]; let e = x + 1;
        while (e < r.length && r[e] === ch) e++;
        if (PAL[ch]) s += `<rect x="${x}" y="${y}" width="${e - x}" height="1" fill="${PAL[ch]}"/>`;
        x = e;
      }
    });
    return s;
  }
  const clipCache = {};
  function clipSVG(id, px = 3) {
    const c = CLIP[id]; if (!c) return '';
    const key = id + ':' + px; if (clipCache[key]) return clipCache[key];
    const [, label, art, o] = c;
    let svg;
    if (typeof art === 'string') {
      const w = art.length * 7 + 10;
      svg = `<svg class="pgb-clip${o.blink ? ' pgb-blink' : ''}" width="${w * px / 3 * 1.2 | 0}" height="${16 * px / 3 * 1.2 | 0}" viewBox="0 0 ${w} 16" role="img" aria-label="${esc(label)}"><rect width="${w}" height="16" fill="${o.bg}" stroke="#000"/><rect x="1.5" y="1.5" width="${w - 3}" height="13" fill="none" stroke="${o.fg}" stroke-width=".6"/><text x="${w / 2}" y="12" text-anchor="middle" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="10" fill="${o.fg}">${esc(art)}</text></svg>`;
    } else {
      const H = Math.max(...art.map(f => f.length)), Wd = Math.max(...art.map(f => Math.max(...f.map(r => r.length))));
      const n = art.length;
      const body = n === 1 ? drawFrame(art[0]) : art.map((f, k) => `<g class="pgb-f${n}-${k}">${drawFrame(f)}</g>`).join('');
      svg = `<svg class="pgb-clip${n > 1 ? ' pgb-anim' : ''}${o.cls ? ' pgb-' + o.cls : ''}" width="${Wd * px}" height="${H * px}" viewBox="0 0 ${Wd} ${H}" shape-rendering="crispEdges" style="--pgbT:${o.t || 0.8}s" role="img" aria-label="${esc(label)}">${body}</svg>`;
    }
    return (clipCache[key] = svg);
  }

  /* ---------- page vocabulary ---------- */
  const BGS = [
    ['stars', 'Starry night', 1], ['space', 'Outer space', 1], ['clouds', 'Clouds', 0], ['hearts', 'Hearts', 0], ['bricks', 'Bricks', 1],
    ['checker', 'Checkerboard', 0], ['stripes', 'Candy stripes', 0], ['paper', 'Notebook paper', 0], ['flowers', 'Flower garden', 1], ['sunset', 'Sunset', 1],
    ['white', 'White', 0], ['black', 'Black', 1], ['navy', 'Navy blue', 1], ['teal', 'Teal', 1], ['pink', 'Bubblegum', 0], ['lemon', 'Lemon', 0], ['silver', 'Silver', 0], ['maroon', 'Maroon', 1]
  ];
  const BGI = {}; BGS.forEach(b => { BGI[b[0]] = b; });
  const COLORS = [['white', '#fff'], ['black', '#000'], ['yellow', '#ff0'], ['lime', '#0f0'], ['cyan', '#0ff'], ['red', '#f00'], ['navy', '#000080'], ['magenta', '#f0f'], ['orange', '#ff8c00'], ['purple', '#800080']];
  const COLI = {}; COLORS.forEach(c => { COLI[c[0]] = c; });
  const FONTS = [['comic', 'Comic', '"Comic Sans MS","Comic Neue","Chalkboard SE",cursive'], ['times', 'Times', '"Times New Roman",Times,serif'], ['arial', 'Arial', 'Arial,Helvetica,sans-serif'], ['courier', 'Typewriter', '"Courier New",Courier,monospace'], ['black', 'Big & Bold', '"Arial Black",Impact,sans-serif']];
  const FONTI = {}; FONTS.forEach(f => { FONTI[f[0]] = f; });
  const WA = [['rainbow', 'Rainbow'], ['chrome', 'Chrome'], ['fire', 'Fire'], ['shadow', 'Shadow'], ['outline', 'Outline'], ['neon', 'Neon'], ['wave', 'Wavy'], ['block3d', '3-D']];
  const MQS = [['yellow', 'Yellow'], ['black', 'Scoreboard'], ['rainbow', 'Rainbow'], ['blue', 'Blue']];
  const HRS = [['rainbow', 'Rainbow'], ['flames', 'Flames'], ['sparkle', 'Sparkles'], ['checker', 'Checkers'], ['dots', 'Dots'], ['plain', 'Plain line']];
  const HCS = [['odo', 'Odometer'], ['led', 'Green LED'], ['retro', 'Flip clock']];
  const BULLETS = [['star', 'Stars'], ['dot', 'Dots'], ['arrow', 'Arrows'], ['check', 'Check marks'], ['num', 'Numbers']];
  const SONGS = [
    ['hop', 'Hopscotch Hop', { mel: [72, 76, 79, 76, 72, 76, 79, 84, 81, 79, 77, 76, 74, 76, 72, 0], bass: [48, 53, 55, 48], step: 0.16, lead: 'square', leadVol: 0.03 }],
    ['modem', 'Midnight Modem', { mel: [69, 0, 72, 69, 76, 0, 74, 72, 71, 0, 74, 71, 77, 76, 74, 71], bass: [45, 41, 43, 40], step: 0.18, lead: 'triangle', leadVol: 0.06 }],
    ['polka', 'Robot Polka', { mel: [67, 72, 76, 72, 67, 72, 76, 72, 69, 74, 77, 74, 71, 74, 79, 74], bass: [48, 43, 50, 43], step: 0.13, lead: 'square', leadVol: 0.025, drums: 'four' }],
    ['waltz', 'Sparkle Waltz', { mel: [79, 0, 0, 76, 77, 79, 84, 0, 0, 83, 81, 79, 77, 0, 0, 74, 76, 77, 79, 0, 0, 0, 0, 0], bass: [48, 43, 53, 43, 48, 55], step: 0.19, lead: 'triangle', leadVol: 0.06, harm: 12 }],
    ['cadet', 'Space Cadet', { mel: [60, 67, 72, 74, 75, 74, 72, 67, 63, 70, 75, 77, 79, 77, 75, 70], bass: [36, 39, 41, 43], step: 0.15, lead: 'sawtooth', leadVol: 0.02 }]
  ];
  const SONGI = {}; SONGS.forEach(s => { SONGI[s[0]] = s; });
  const KINDS = [
    ['ti', 'Title banner'], ['tx', 'Paragraph'], ['li', 'Bulleted list'], ['ab', 'About me'], ['im', 'Pictures'], ['hr', 'Divider line'],
    ['mq', 'Scrolling marquee'], ['hc', 'Hit counter'], ['gb', 'Guestbook'], ['lk', "Friends' pages"]
  ];
  const KINDI = {}; KINDS.forEach(k => { KINDI[k[0]] = k[1]; });

  /* ---------- validation: every page (saved, published or shared) passes through here ---------- */
  const S = (v, n) => typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000b-\u001f\u007f\u2028\u2029]/g, '').slice(0, n) : '';
  const one = (v, list, d) => list.some(x => x[0] === v) ? v : d;
  function cleanUrl(u) {
    u = S(u, 120).trim().toLowerCase();
    if (!u) return '';
    if (!/^https?:\/\//.test(u)) u = 'http://' + u;
    u = u.replace(/^https:/, 'http:');
    if (!/\/$/.test(u) && !/\.[a-z]+$/.test(u.split('/').pop()) && u.split('/').length <= 3) u += '/';
    return /^http:\/\/[a-z0-9-]+(\.[a-z0-9-]+)+(\/[a-z0-9._~-]*)*$/.test(u) ? u : '';
  }
  function cleanBlock(b) {
    if (!b || typeof b !== 'object' || !KINDI[b.k]) return null;
    switch (b.k) {
      case 'ti': return { k: 'ti', x: S(b.x, 60), s: one(b.s, WA, 'rainbow') };
      case 'tx': return { k: 'tx', x: S(b.x, 1000), a: ['l', 'c', 'r'].includes(b.a) ? b.a : 'l', z: ['s', 'm', 'l'].includes(b.z) ? b.z : 'm' };
      case 'li': return { k: 'li', h: S(b.h, 50), x: (Array.isArray(b.x) ? b.x : []).slice(0, 15).map(v => S(v, 80)), s: one(b.s, BULLETS, 'star') };
      case 'ab': return { k: 'ab', n: S(b.n, 30), a: S(b.a, 12), w: S(b.w, 40), l: S(b.l, 150), x: S(b.x, 150) };
      case 'im': return { k: 'im', i: (Array.isArray(b.i) ? b.i : []).filter(id => typeof id === 'string' && CLIP[id]).slice(0, 8), z: [1, 2, 3].includes(b.z) ? b.z : 2, a: ['l', 'c', 'r'].includes(b.a) ? b.a : 'c' };
      case 'hr': return { k: 'hr', s: one(b.s, HRS, 'rainbow') };
      case 'mq': return { k: 'mq', x: S(b.x, 120), s: one(b.s, MQS, 'yellow') };
      case 'hc': return { k: 'hc', s: one(b.s, HCS, 'odo') };
      case 'gb': return { k: 'gb', x: S(b.x, 60) };
      case 'lk': return { k: 'lk', h: S(b.h, 50), x: (Array.isArray(b.x) ? b.x : []).slice(0, 10).filter(l => l && typeof l === 'object').map(l => ({ t: S(l.t, 40), u: cleanUrl(l.u) })) };
    }
    return null;
  }
  function clean(p) {
    if (!p || typeof p !== 'object' || !Array.isArray(p.b)) return null;
    return {
      v: 1, t: S(p.t, 60) || 'My Home Page', bg: one(p.bg, BGS, 'stars'), c: one(p.c, COLORS, 'white'), f: one(p.f, FONTS, 'comic'),
      m: SONGI[p.m] ? p.m : '', b: p.b.slice(0, 30).map(cleanBlock).filter(Boolean)
    };
  }
  const encode = p => lzc(JSON.stringify(clean(p)));
  function decode(code) {
    try { const s = lzd(code); return s ? clean(JSON.parse(s)) : null; } catch (e) { return null; }
  }
  const starter = () => ({ v: 1, t: 'My Home Page', bg: 'stars', c: 'white', f: 'comic', m: '', b: [
    { k: 'ti', x: 'Welcome to My Home Page!', s: 'rainbow' },
    { k: 'mq', x: '*** Thanks for visiting! Sign my guestbook! ***', s: 'yellow' },
    { k: 'im', i: ['construct', 'globe', 'mail'], z: 2, a: 'c' },
    { k: 'tx', x: 'Hi! This is my very own home page. I made it all by myself with the CyberBurbs Page Wizard. More cool stuff is coming soon!', a: 'c', z: 'm' },
    { k: 'hr', s: 'rainbow' },
    { k: 'li', h: 'My Favorite Things', x: ['Computers', 'Pizza', 'My pet'], s: 'star' },
    { k: 'hc', s: 'odo' },
    { k: 'gb', x: 'Sign My Guestbook!' }
  ]});
  const slugOf = user => { let s = String(user || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20) || 'kidsurfer'; if (RESERVED.includes(s)) s += '1'; return s; };

  /* ---------- rendering (shared by the editor preview and the fake Web) ---------- */
  const rootClass = p => `pgb-page pgb-bg-${p.bg} pgb-c-${p.c} pgb-f-${p.f}${BGI[p.bg][2] ? ' pgb-dark' : ''}`;
  const txt = s => esc(s).replace(/\n/g, '<br>');
  function renderBlock(b, ctx) {
    switch (b.k) {
      case 'ti': {
        const t = b.x || 'My Home Page';
        const inner = b.s === 'wave' ? Array.from(t).map((ch, i) => `<span style="animation-delay:${(-i * 0.09).toFixed(2)}s">${ch === ' ' ? '&nbsp;' : esc(ch)}</span>`).join('') : esc(t);
        return `<h1 class="pgb-ti pgb-wa-${b.s}" data-text="${esc(t)}">${inner}</h1>`;
      }
      case 'tx': return b.x ? `<p class="pgb-tx pgb-al-${b.a} pgb-z-${b.z}">${txt(b.x)}</p>` : ctx.edit ? `<p class="pgb-tx pgb-empty">(Type your paragraph in the box on the left.)</p>` : '';
      case 'li': {
        const items = b.x.filter(Boolean);
        const tag = b.s === 'num' ? 'ol' : 'ul';
        return `<div class="pgb-li">${b.h ? `<h2>${esc(b.h)}</h2>` : ''}${items.length ? `<${tag} class="pgb-bul-${b.s}">${items.map(i => `<li>${esc(i)}</li>`).join('')}</${tag}>` : ctx.edit ? '<p class="pgb-empty">(Add list items on the left.)</p>' : ''}</div>`;
      }
      case 'ab': {
        const rows = [['My name', b.n], ['Age', b.a], ['Where I live', b.w], ['Things I like', b.l], ['Something about me', b.x]].filter(r => r[1]);
        return `<div class="pgb-ab"><h2>About Me</h2>${rows.length ? `<table>${rows.map(([k, v]) => `<tr><th>${k}:</th><td>${esc(v)}</td></tr>`).join('')}</table>` : ctx.edit ? '<p class="pgb-empty">(Fill in the About Me boxes on the left.)</p>' : ''}</div>`;
      }
      case 'im': return `<div class="pgb-im pgb-al-${b.a}">${b.i.length ? b.i.map(id => clipSVG(id, [0, 2, 3, 5][b.z])).join(' ') : ctx.edit ? '<p class="pgb-empty">(Pick pictures from the gallery on the left.)</p>' : ''}</div>`;
      case 'hr': return b.s === 'flames' ? `<div class="pgb-hr pgb-hr-flames">${clipSVG('flames', 2).repeat(14)}</div>` : `<div class="pgb-hr pgb-hr-${b.s}" role="separator"></div>`;
      case 'mq': return `<div class="pgb-mq pgb-mq-${b.s}"><span>${esc(b.x || 'Welcome to my page!')}</span></div>`;
      case 'hc': {
        const n = String(ctx.hits || 0).padStart(6, '0');
        return `<p class="pgb-hcw">You are visitor number<br><span class="pgb-hc pgb-hc-${b.s}">${n.split('').map(d => `<i>${d}</i>`).join('')}</span></p>`;
      }
      case 'gb': {
        const head = `<h2>${esc(b.x || 'Sign My Guestbook!')}</h2>`;
        if (ctx.mode === 'web') return `<div class="pgb-gb">${head}<div>${ctx.gbHtml}</div>${ctx.gbForm}</div>`;
        if (ctx.mode === 'shared') return `<div class="pgb-gb">${head}<p class="pgb-note">This guestbook lives on the page owner's own computer, so you can't sign it from a shared link. Say hi to them in person!</p></div>`;
        return `<div class="pgb-gb">${head}<div class="gb-entry" style="color:#000"><b>A visitor</b> from Somewhere wrote:<br>Cool page!! (Real guestbook messages will show up here after you publish.)</div></div>`;
      }
      case 'lk': {
        const items = b.x.filter(l => l.t || l.u);
        const link = l => l.u && ctx.A ? ctx.A(l.u, esc(l.t || l.u)) : `<u>${esc(l.t || l.u)}</u>`;
        return `<div class="pgb-lk"><h2>${esc(b.h || "My Friends' Pages")}</h2>${items.length ? `<ul>${items.map(l => `<li>${link(l)}</li>`).join('')}</ul>` : ctx.edit ? '<p class="pgb-empty">(Add your friends\' pages on the left.)</p>' : ''}</div>`;
      }
    }
    return '';
  }

  /* ---------- the fake Web: member directory, published pages, shared pages ---------- */
  const barHTML = (h, extra = '') => `<div class="pgb-host">CyberBurbs <small>free home pages for everyone</small> ${h.A(HOST, 'Member directory')} · ${h.APP(ID, 'Build your own page')}${extra}</div>`;
  function webPage(p, h, mode, key) {
    const ctx = { mode, A: h.A, edit: false, hits: 0, gbHtml: '', gbForm: '' };
    const kev = h.era().id === '2000' ? 'KevRocks22' : 'Kevin';
    let gbList = [];
    if (mode === 'web') {
      const hk = 'pgbhits:' + key; const hits = h.store.get(hk, 17) + 1; h.store.set(hk, hits); ctx.hits = hits;
      gbList = h.store.get('pgbgb:' + key, [{ n: kev, w: 'CyberBurbs', m: 'Cool page!! Welcome to the Web. Sign mine too!' }]);
      ctx.gbHtml = h.gb.html(gbList); ctx.gbForm = h.gb.form();
    } else {
      let x = 7; for (const ch of key) x = (x * 31 + ch.charCodeAt(0)) % 90000; ctx.hits = 100 + x;
    }
    const blocks = p.b.map(b => renderBlock(b, ctx)).filter(Boolean);
    const pre = mode === 'shared'
      ? `<div class="pgb-banner">A home page someone shared with you. Build your own in ${h.APP(ID, 'Home Page Builder')}!</div>`
      : barHTML(h);
    const tail = `${p.m ? '<p class="pgb-mute"><button class="btn" data-pgbmute>Stop the music</button></p>' : ''}<p class="pgb-foot">Made with the CyberBurbs Page Wizard${mode === 'shared' ? '' : ' · ' + h.A(HOST, 'Visit more CyberBurbs members')}</p>`;
    return {
      title: p.t, cls: rootClass(p), music: p.m ? SONGI[p.m][2] : null,
      blocks: [pre].concat(blocks, [tail]),
      after(root, nv) {
        const mb = root.querySelector('[data-pgbmute]');
        if (mb) mb.onclick = () => { h.stopMusic('web'); mb.disabled = true; mb.textContent = 'Music stopped'; };
        const f = mode === 'web' && root.querySelector('[data-sign]');
        if (f) f.onsubmit = e => {
          e.preventDefault();
          const list = h.store.get('pgbgb:' + key, gbList);
          list.push({ n: S(f.n.value.trim(), 30), w: S(f.w.value.trim(), 30) || 'The Internet', m: S(f.m.value.trim(), 200) });
          h.store.set('pgbgb:' + key, list.slice(-40));
          nv.nav(HOST + key + '/', 'reload');
        };
      }
    };
  }
  const memberRe = /^http:\/\/www\.cyberburbs\.com\/([a-z0-9]+)\/$/;
  (window.RETRO_SITES = window.RETRO_SITES || []).push(
    { eras: ['1990'], url: SHARE_URL, page: (url, h) => ({ title: 'CyberBurbs', cls: '', blocks: [`<h1>Not Yet!</h1><p>Someone shared a home page with you, but home pages like that need Horizon 95 or newer. Use the Time Machine (the hourglass on the taskbar) to jump ahead to 1995, then open the link again.</p><p>${h.A('http://www.prairienet.com/', 'Back to PrairieNet')}</p>`] }) },
    { eras: ['1995', '2000'], url: SHARE_URL, page(url, h) {
      const p = decode(h.param('page') || '');
      if (!p) return { title: 'CyberBurbs: Broken Link', cls: 'w95', blocks: [barHTML(h), `<h1>Hmm, this shared page is scrambled</h1><p>The link you opened doesn't contain a whole home page. It may have been cut off when it was copied. Ask your friend to copy the whole link again.</p><p>Or build your own page in ${h.APP(ID, 'Home Page Builder')}!</p>`] };
      return webPage(p, h, 'shared', h.param('page'));
    } },
    { eras: ['1995', '2000'], match: url => { const m = memberRe.exec(url); return !!m && !RESERVED.includes(m[1]); }, page(url, h) {
      const slug = memberRe.exec(url)[1];
      const pub = h.appLoad(ID, 'pub', null);
      const p = pub && pub.slug === slug ? clean(pub.p) : null;
      if (!p) return { title: 'CyberBurbs: Member Not Found', cls: 'w95', blocks: [barHTML(h), `<h1>Nobody lives here yet</h1><p>There's no CyberBurbs member page at <tt>${esc(url)}</tt>.</p><p>${slug === slugOf(h.user) ? `This is <b>your</b> address! Make a page in ${h.APP(ID, 'Home Page Builder')} and press <b>Publish to the Web</b>, and it will show up right here.` : `Maybe they moved. Want a page of your own? Try ${h.APP(ID, 'Home Page Builder')}.`}</p><p>${h.A(HOST, 'Back to the CyberBurbs member directory')}</p>`] };
      return webPage(p, h, 'web', slug);
    } },
    { eras: ['1995', '2000'], url: HOST, page(url, h) {
      const y = h.era().id, pub = h.appLoad(ID, 'pub', null), mine = pub && clean(pub.p);
      const A = h.A;
      const hoods = y === '1995' ? [
        ['Silicon Hills', 'computers and technology', [[HOST + 'siliconhills/4077/', "Kevin's Kool Kyber Korner"]]],
        ['Hollywood', 'movies and TV', [[HOST + 'hollywood/2112/', "Dana's Unexplained Files Fan Page"]]],
        ['Sunset Strip', 'music and bands', [[HOST + 'sunsetstrip/1234/', 'Static Cling (a very loud band)'], [HOST + 'sunsetstrip/5678/', 'The Floppy Disks'], [HOST + 'sunsetstrip/9012/', "Mom's Minivan"]]],
        ['Petsburgh', 'pets and animals', [[HOST + 'petsburgh/3301/', "Nibbles the Hamster's Home Page"], [HOST + 'petsburgh/2222/', 'The Gerbil Jamboree'], [HOST + 'petsburgh/5150/', 'Adopt-a-Pixel Pet Pound']]],
        ['Heartland', 'family and hometown pages', [[HOST + 'heartland/7070/', "The World's Biggest Guestbook"]]]
      ] : [
        ['Heartland', 'family and hometown pages', [[HOST + 'heartland/4455/', "Grandma Jo's Home Page (NEW!)"]]],
        ['Silicon Hills', 'computers and technology', [[HOST + 'siliconhills/4077/', "Kevin's Kool Kyber Korner (last updated 1996)"]]],
        ['Area 51', 'science fiction and mysteries', [['http://www.y2kready-now.com/', 'Y2K Survival Headquarters (a little late)']]]
      ];
      return { title: 'CyberBurbs: Free Home Pages!', cls: 'w95', blocks: [
        `<div class="hdr">CyberBurbs<small>Free home pages for everyone. ${y === '1995' ? '2 MB of space!' : 'Now 15 MB of space!'} Pick a neighborhood and move in.</small></div>`,
        `<div class="pgb-dir-you"><h2>Your Home Page</h2>${mine ? `<p>You live at <b>${A(HOST + pub.slug + '/', HOST + esc(pub.slug) + '/')}</b>: "${esc(mine.t)}". ${A(HOST + pub.slug + '/', 'Visit your page')}</p><p>To change it, open ${h.APP(ID, 'Home Page Builder')}, edit, and press Publish again.</p>` : `<p>You don't have a page yet! Open ${h.APP(ID, 'Home Page Builder')} (in the Start menu under Accessories), build a page, and press <b>Publish to the Web</b>. It will appear at <b>${HOST}${esc(slugOf(h.user))}/</b></p>`}</div>`,
        `<h2>Neighborhoods</h2>${hoods.map(([n, d, list]) => `<p><b>${n}</b> <small>(${d})</small></p><ul>${list.map(([u, t]) => `<li>${A(u, t)}</li>`).join('')}</ul>`).join('')}`,
        `<h2>Home Page Tips</h2><ul><li>Never put your last name, address, phone number or school on the Web.</li><li>A guestbook is the best way to find out who visited.</li><li>One spinning globe is cool. Forty spinning globes is also cool, but slower.</li></ul><p>${A('http://www.prairienet.com/', 'Back to PrairieNet')}</p>`
      ] };
    }, search: [
      { title: 'CyberBurbs: Free Home Pages', url: HOST, desc: 'Get your own free home page! Browse member pages by neighborhood.', keywords: 'cyberburbs home page homepage free members directory build my page personal pages' }
    ] }
  );

  /* ---------- the program ---------- */
  const ICON = '<svg viewBox="0 0 32 32" shape-rendering="crispEdges" aria-hidden="true"><rect x="3" y="3" width="24" height="26" fill="#fff" stroke="#000"/><rect x="4" y="4" width="22" height="5" fill="#000080"/><rect x="6" y="5" width="12" height="3" fill="#ff0"/><rect x="6" y="12" width="9" height="9" fill="#1050ff"/><rect x="8" y="13" width="3" height="3" fill="#10c010"/><rect x="11" y="17" width="3" height="3" fill="#10c010"/><rect x="17" y="12" width="7" height="2" fill="#e00"/><rect x="17" y="16" width="7" height="2" fill="#888"/><rect x="6" y="23" width="18" height="2" fill="#888"/><polygon points="22,30 30,20 31,23 24,31" fill="#ffe000" stroke="#000"/></svg>';

  const T2 = [0, 0.5], T3 = [0, 2 / 3, 1 / 3], T4 = [0, 0.75, 0.5, 0.25];
  const frameCSS = [[2, T2], [3, T3], [4, T4]].map(([n, ds]) => `@keyframes pgb-q${n}{0%{opacity:1}${(100 / n).toFixed(3)}%{opacity:0}100%{opacity:0}}` + ds.map((d, k) => `.pgb-f${n}-${k}{animation:pgb-q${n} var(--pgbT,.8s) step-end infinite;animation-delay:calc(var(--pgbT,.8s) * -${d.toFixed(4)})}`).join('')).join('');
  const bgSvg = s => `url("data:image/svg+xml,${encodeURIComponent(s)}")`;

  (window.RETRO_APPS = window.RETRO_APPS || []).push({
    id: ID,
    label: 'Home Page Builder',
    kind: 'builtin',
    eras: ['1995', '2000'],
    cat: 'acc',
    icon: ICON,
    window: { w: 800, h: 560 },
    css: `
      ${frameCSS}
      @keyframes pgb-hop{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
      @keyframes pgb-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
      @keyframes pgb-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.12)}}
      @keyframes pgb-blinkk{50%{opacity:0}}
      @keyframes pgb-wave{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
      @keyframes pgb-mq{to{transform:translateX(-100%)}}
      @keyframes pgb-neon{0%,100%{opacity:1}92%{opacity:1}94%{opacity:.4}96%{opacity:1}}
      .pgb-clip{vertical-align:middle;display:inline-block;margin:2px}
      .pgb-hop{animation:pgb-hop .6s steps(2) infinite}.pgb-float{animation:pgb-float 2s ease-in-out infinite}
      .pgb-pulse{animation:pgb-pulse 1s steps(2) infinite;transform-origin:center}.pgb-blink{animation:pgb-blinkk 1s steps(1) infinite}
      .pgb-page{position:relative;overflow-wrap:anywhere}
      .pgb-page h2{font-size:1.35em}
      .pgb-f-comic{font-family:"Comic Sans MS","Comic Neue","Chalkboard SE",cursive}.pgb-f-times{font-family:"Times New Roman",Times,serif}
      .pgb-f-arial{font-family:Arial,Helvetica,sans-serif}.pgb-f-courier{font-family:"Courier New",Courier,monospace}.pgb-f-black{font-family:"Arial Black",Impact,sans-serif}
      ${COLORS.map(([id, c]) => `.pgb-c-${id}{color:${c}}`).join('')}
      .web.pgb-page a{color:#0000ee}.web.pgb-page a.v{color:#551a8b}
      .web.pgb-dark a{color:#0ff}.web.pgb-dark a.v{color:#f9f}
      .pgb-bg-stars{background:radial-gradient(#fff 1px,transparent 1.5px) 0 0/37px 41px,radial-gradient(#ff8 1px,transparent 1.5px) 17px 23px/53px 47px,#000}
      .pgb-bg-space{background:radial-gradient(circle at 85% 12%,#f90 0 26px,#c50 27px 30px,transparent 31px),radial-gradient(#fff 1px,transparent 1.5px) 0 0/29px 31px,radial-gradient(#9cf 1px,transparent 1.5px) 11px 17px/43px 37px,#000033}
      .pgb-bg-clouds{background:${bgSvg("<svg xmlns='http://www.w3.org/2000/svg' width='160' height='110'><g fill='#fff'><ellipse cx='36' cy='34' rx='26' ry='11'/><ellipse cx='50' cy='27' rx='16' ry='11'/><ellipse cx='118' cy='82' rx='22' ry='9'/><ellipse cx='128' cy='76' rx='13' ry='9'/></g></svg>")},linear-gradient(#5aa8f0,#c4e4ff)}
      .pgb-bg-hearts{background:${bgSvg("<svg xmlns='http://www.w3.org/2000/svg' width='36' height='36'><path d='M18 28 L8 18 A5 5 0 0 1 18 11 A5 5 0 0 1 28 18 Z' fill='#ff9ccf'/></svg>")} 0 0/36px 36px,#ffe6f2}
      .pgb-bg-bricks{background:${bgSvg("<svg xmlns='http://www.w3.org/2000/svg' width='40' height='20'><rect width='40' height='20' fill='#a33a2a'/><path d='M0 .5H40M0 10.5H40M20.5 0V10M.5 10V20' stroke='#d9c7b0' stroke-width='1.2'/></svg>")} 0 0/40px 20px}
      .pgb-bg-checker{background:repeating-conic-gradient(#e6c8ff 0 25%,#fff0fa 0 50%) 0 0/40px 40px}
      .pgb-bg-stripes{background:repeating-linear-gradient(45deg,#fffbe0 0 14px,#d8f6d8 14px 28px,#dcecff 28px 42px)}
      .pgb-bg-paper{background:linear-gradient(90deg,transparent 30px,#f88 30px 32px,transparent 32px),repeating-linear-gradient(#fffff4 0 23px,#9cc4ee 23px 24px)}
      .pgb-bg-flowers{background:${bgSvg("<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48'><g fill='#fff'><circle cx='12' cy='8' r='3'/><circle cx='12' cy='16' r='3'/><circle cx='8' cy='12' r='3'/><circle cx='16' cy='12' r='3'/></g><circle cx='12' cy='12' r='2.4' fill='#fd0'/><g fill='#ffb3e0'><circle cx='36' cy='32' r='3'/><circle cx='36' cy='40' r='3'/><circle cx='32' cy='36' r='3'/><circle cx='40' cy='36' r='3'/></g><circle cx='36' cy='36' r='2.4' fill='#fd0'/></svg>")} 0 0/48px 48px,#2f8a3a}
      .pgb-bg-sunset{background:linear-gradient(#2b1055 0%,#7a2a7a 45%,#e0582b 80%,#f9b233 100%)}
      .pgb-bg-white{background:#fff}.pgb-bg-black{background:#000}.pgb-bg-navy{background:#000080}.pgb-bg-teal{background:#008080}
      .pgb-bg-pink{background:#ffc6e4}.pgb-bg-lemon{background:#ffffb8}.pgb-bg-silver{background:#c0c0c0}.pgb-bg-maroon{background:#800000}
      .pgb-ti{text-align:center;font-size:2.3em;line-height:1.15;margin:.3em 0;font-weight:900}
      .pgb-wa-rainbow{background:linear-gradient(90deg,red,orange,yellow,lime,cyan,#66f,magenta);-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-stroke:1px rgba(0,0,0,.35)}
      .pgb-wa-chrome{background:linear-gradient(#fff 0,#9aa 45%,#334 50%,#ccd 75%,#fff 100%);-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-stroke:1px #223;font-style:italic}
      .pgb-wa-fire{background:linear-gradient(#ff0,#f80 45%,#d00);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 0 4px #f60)}
      .pgb-wa-shadow{color:#ff0;text-shadow:3px 3px 0 #f0f,6px 6px 0 #00f}
      .pgb-wa-outline{color:transparent;-webkit-text-stroke:2px #f0f;letter-spacing:2px}
      .pgb-dark .pgb-wa-outline{-webkit-text-stroke-color:#0ff}
      .pgb-wa-neon{color:#fff;text-shadow:0 0 4px #f0f,0 0 10px #f0f,0 0 18px #0ff;animation:pgb-neon 4s infinite}
      .pgb-wa-wave span{display:inline-block;animation:pgb-wave 1.2s ease-in-out infinite;color:#ff0;text-shadow:2px 2px 0 #c00}
      .pgb-wa-block3d{color:#0cf;text-shadow:1px 1px 0 #069,2px 2px 0 #069,3px 3px 0 #069,4px 4px 0 #036,5px 5px 0 #036;letter-spacing:1px}
      .pgb-al-l{text-align:left}.pgb-al-c{text-align:center}.pgb-al-r{text-align:right}
      .pgb-z-s{font-size:.85em}.pgb-z-m{font-size:1em}.pgb-z-l{font-size:1.35em;font-weight:700}
      .pgb-li ul{list-style:none;padding-left:1.4em}.pgb-li li{margin:.15em 0}
      .pgb-bul-star li::before{content:"\\2605";color:#fc0;margin:0 .45em 0 -1.25em}
      .pgb-bul-dot li::before{content:"\\25CF";color:#f3c;margin:0 .45em 0 -1.25em}
      .pgb-bul-arrow li::before{content:"\\00BB";color:#f60;font-weight:900;margin:0 .45em 0 -1.25em}
      .pgb-bul-check li::before{content:"\\2714";color:#0c0;margin:0 .45em 0 -1.25em}
      .pgb-ab{border:4px ridge #c0c0c0;padding:4px 12px 10px;margin:12px auto;max-width:34em;background:rgba(128,128,128,.12)}
      .pgb-ab h2{margin:.3em 0}.pgb-ab th{text-align:right;padding:2px 8px 2px 0;vertical-align:top;white-space:nowrap}.pgb-ab td{padding:2px 0}
      .pgb-im{margin:8px 0}
      .pgb-hr{height:8px;margin:14px auto;max-width:100%}
      .pgb-hr-rainbow{background:linear-gradient(90deg,red,orange,yellow,lime,cyan,blue,violet,red);height:6px}
      .pgb-hr-sparkle{background:radial-gradient(circle,#ff0 0 2px,transparent 2.5px) 0 50%/16px 8px,radial-gradient(circle,#0ff 0 1.5px,transparent 2px) 8px 50%/16px 8px;height:10px}
      .pgb-hr-checker{background:repeating-conic-gradient(#000 0 25%,#fff 0 50%) 0 0/12px 12px;height:6px;border:1px solid #000}
      .pgb-hr-dots{background:radial-gradient(circle,#f0f 0 3px,transparent 3.5px) 0 0/14px 10px;height:10px}
      .pgb-hr-plain{height:0;border-top:3px groove #fff;border-bottom:0}
      .pgb-hr-flames{height:auto;text-align:center;white-space:nowrap;overflow:hidden;line-height:0}
      .pgb-hr-flames .pgb-clip{margin:0}
      .pgb-mq{overflow:hidden;white-space:nowrap;border:2px solid #000;margin:8px 0;font-weight:700}
      .pgb-mq span{display:inline-block;padding-left:100%;animation:pgb-mq 12s linear infinite}
      .pgb-mq-yellow{background:#ff0;color:#000}.pgb-mq-black{background:#000;color:#f80;font-family:"Courier New",monospace;border-color:#555}
      .pgb-mq-rainbow{background:linear-gradient(90deg,#f99,#ff9,#9f9,#9ff,#99f,#f9f);color:#000}.pgb-mq-blue{background:#000080;color:#fff}
      .pgb-hcw{text-align:center}
      .pgb-hc{display:inline-flex;gap:2px;padding:3px;border:2px inset #888;background:#222;margin-top:4px}
      .pgb-hc i{font-style:normal;display:inline-block;min-width:.8em;text-align:center;font:700 20px "Courier New",monospace;padding:0 3px}
      .pgb-hc-odo i{background:linear-gradient(#fff,#ccc 45%,#999 50%,#ddd);color:#000}
      .pgb-hc-led{background:#000}.pgb-hc-led i{color:#0f0;text-shadow:0 0 4px #0f0;background:#020}
      .pgb-hc-retro i{background:#333;color:#ff0;border-top:1px solid #666}
      .pgb-gb,.pgb-lk{margin:12px 0}
      .pgb-gb .gb-form{margin-top:8px}
      .pgb-note{font-size:.9em;font-style:italic}
      .pgb-empty{opacity:.7;font-style:italic;font-size:.85em}
      .pgb-host{margin:-10px -14px 10px;padding:4px 10px;background:#ffc;color:#000;border-bottom:2px solid #c90;font:12px Arial,sans-serif}
      .pgb-host small{color:#666;margin-right:8px}.web .pgb-host a{color:#00e}
      .pgb-banner{margin:-10px -14px 10px;padding:8px 12px;background:#ff0;color:#000;border-bottom:3px double #000;font:700 14px Arial,sans-serif;text-align:center}
      .web .pgb-banner a{color:#00e}
      .pgb-mute{text-align:center}.pgb-foot{text-align:center;font-size:11px;opacity:.8;margin-top:18px}
      .pgb-dir-you{border:2px solid #000066;background:#eef;padding:4px 12px;margin:10px 0}
      @media (prefers-reduced-motion: reduce){
        .pgb-anim g[class^="pgb-f"]{animation:none;opacity:0}.pgb-anim g[class$="-0"]{opacity:1}
        .pgb-hop,.pgb-float,.pgb-pulse,.pgb-blink,.pgb-wa-wave span,.pgb-wa-neon{animation:none}
        .pgb-mq span{animation:none;padding-left:0}
      }

      .pgb{display:flex;flex-direction:column;height:100%;font:12px var(--ui);position:relative}
      .pgb-head{display:flex;align-items:center;gap:8px;padding:4px 8px;background:linear-gradient(90deg,#000080,#1084d0);color:#fff;font:700 14px Arial,sans-serif}
      .pgb-head small{font:11px var(--ui);opacity:.9;margin-left:auto;text-align:right}
      .pgb-tabs{display:none;gap:4px;padding:4px 6px 0}
      .pgb-tabs .btn{flex:1;min-height:32px}.pgb-tabs .btn.on{font-weight:700;border-style:inset}
      .pgb-main{flex:1;display:flex;gap:6px;padding:6px;min-height:0}
      .pgb-left{width:330px;flex:none;overflow-y:auto;overflow-x:hidden;display:flex;flex-direction:column;gap:6px;padding-right:2px}
      .pgb-right{flex:1;overflow:auto;background:#fff;min-width:0;position:relative}
      .pgb-right .web{min-height:100%}
      .pgb-right [data-bi]{cursor:pointer;outline-offset:2px}
      .pgb-right [data-bi].pgb-sel{outline:2px dashed #f0f}
      .pgb fieldset{border:2px groove #fff;padding:4px 6px 6px;margin:0;display:flex;flex-direction:column;gap:5px;min-width:0}
      .pgb legend{font-weight:700;padding:0 3px}
      .pgb label.pgb-f{display:flex;flex-direction:column;gap:2px}
      .pgb input[type=text],.pgb textarea,.pgb select{font:12px var(--ui);width:100%;box-sizing:border-box}
      .pgb textarea{resize:vertical}
      .pgb-row{display:flex;gap:4px;flex-wrap:wrap;align-items:center}
      .pgb-sws{display:grid;grid-template-columns:repeat(9,1fr);gap:3px}
      .pgb-sw{height:26px;min-width:0;border:2px outset #fff;cursor:pointer;padding:0}
      .pgb-sw.on{outline:2px solid #000;outline-offset:1px;border-style:inset}
      .pgb-cols{display:grid;grid-template-columns:repeat(10,1fr);gap:3px}
      .pgb-opt{min-width:0;padding:2px 4px;min-height:28px}
      .pgb-opt.on{border-style:inset;background:#fff;font-weight:700}
      .pgb-wa-sample{font:900 15px Arial,sans-serif;display:inline-block}
      .pgb-add{display:grid;grid-template-columns:repeat(2,1fr);gap:3px}
      .pgb-add .btn{min-width:0;padding:4px 2px;min-height:28px}
      .pgb-blocks{list-style:none;margin:0;padding:2px;background:#fff;min-height:40px}
      .pgb-blocks li{display:flex;align-items:center;gap:4px;padding:2px;border:1px solid transparent;touch-action:pan-y}
      .pgb-blocks li.on{background:#000080;color:#fff}
      .pgb-blocks li.pgb-drag{opacity:.5}
      .pgb-blocks li.pgb-ovt{border-top:2px solid #f00}.pgb-blocks li.pgb-ovb{border-bottom:2px solid #f00}
      .pgb-hdl{cursor:grab;touch-action:none;padding:4px 5px;font:700 14px monospace;user-select:none;border:1px dotted #888;background:#ddd;color:#000}
      .pgb-bl{flex:1;min-width:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;cursor:pointer;padding:4px 2px}
      .pgb-blocks .btn{min-width:0;padding:0 5px;height:24px;font-size:11px}
      .pgb-gal{display:grid;grid-template-columns:repeat(auto-fill,minmax(44px,1fr));gap:3px;max-height:200px;overflow:auto;background:#fff;padding:3px}
      .pgb-gal button{height:44px;min-width:0;padding:0;display:grid;place-items:center;background:#fff;border:2px outset #ddd;cursor:pointer;overflow:hidden}
      .pgb-gal button.on{border:2px solid #f0f;background:#fdf}
      .pgb-gal svg{max-width:40px;max-height:36px}
      .pgb-picked{min-height:28px;display:flex;flex-wrap:wrap;gap:3px;align-items:center}
      .pgb-foot2{display:flex;gap:4px;flex-wrap:wrap;padding:0 6px 6px;align-items:center}
      .pgb-foot2 .btn{min-height:30px}
      .pgb-status{margin-left:auto;font-size:11px;color:#333}
      .pgb-hint{font-size:11px;color:#444;margin:0}
      .pgb-warn{font-size:11px;background:#ffc;border:1px solid #c90;padding:3px 5px;margin:0}
      .pgb-ov{position:absolute;inset:0;background:rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;z-index:5;padding:10px}
      .pgb-dlg{background:var(--gray,#c0c0c0);padding:10px;max-width:460px;width:100%;display:flex;flex-direction:column;gap:6px;box-shadow:3px 3px 0 rgba(0,0,0,.4)}
      .pgb-dlg h3{margin:0;font:700 14px Arial,sans-serif}
      .pgb-dlg textarea{height:90px;font:11px "Courier New",monospace;word-break:break-all}
      .pgb-prog{height:16px;background:#fff;border:2px inset #fff}.pgb-prog i{display:block;height:100%;width:0;background:#000080}
      .pgb.pgb-narrow .pgb-tabs{display:flex}
      .pgb.pgb-narrow .pgb-left{width:auto;flex:1}
      .pgb.pgb-narrow .pgb-right{display:none}
      .pgb.pgb-narrow.pgb-showprev .pgb-left{display:none}
      .pgb.pgb-narrow.pgb-showprev .pgb-right{display:block}
      .pgb.pgb-narrow .pgb-status{flex-basis:100%;margin:0}
      .pgb.pgb-narrow .pgb-blocks .btn{height:34px;min-width:34px}.pgb.pgb-narrow .pgb-hdl{padding:9px 8px}
    `,
    open(W, api) {
      const $ = s => W.body.querySelector(s);
      let pages = api.load('pages', [null, null, null]);
      if (!Array.isArray(pages)) pages = [null, null, null];
      while (pages.length < 3) pages.push(null);
      let slot = api.load('slot', 0); if (![0, 1, 2].includes(slot)) slot = 0;
      let P = clean(pages[slot]) || starter();
      let sel = 0, saveT = 0, prevT = 0, playing = false;

      W.body.innerHTML = `<div class="pgb">
        <div class="pgb-head">${ICON.replace('<svg', '<svg width="22" height="22"')} CyberBurbs Page Wizard <small data-slotname></small></div>
        <div class="pgb-tabs"><button class="btn on" data-tab="edit">Edit</button><button class="btn" data-tab="prev">Preview</button></div>
        <div class="pgb-main">
          <div class="pgb-left">
            <fieldset><legend>1. Your page</legend>
              <label class="pgb-f">Page name (shows in the title bar)<input type="text" data-p="t" maxlength="60"></label>
              <div>Background</div><div class="pgb-sws" data-bgs></div>
              <div>Text color</div><div class="pgb-cols" data-cols></div>
              <div class="pgb-row"><label>Letters <select data-p="f">${FONTS.map(f => `<option value="${f[0]}">${f[1]}</option>`).join('')}</select></label>
                <label>Music <select data-p="m"><option value="">(none)</option>${SONGS.map(s => `<option value="${s[0]}">${s[1]}</option>`).join('')}</select></label>
                <button class="btn" data-play>Listen</button></div>
            </fieldset>
            <fieldset><legend>2. Add things</legend><div class="pgb-add">${KINDS.map(k => `<button class="btn" data-add="${k[0]}">+ ${k[1]}</button>`).join('')}</div></fieldset>
            <fieldset><legend>3. Arrange (drag the ≡ handle)</legend><ul class="pgb-blocks" data-list></ul></fieldset>
            <fieldset data-edbox><legend data-edtitle>4. Edit</legend><div data-ed></div></fieldset>
          </div>
          <div class="pgb-right sunken" data-prevbox></div>
        </div>
        <div class="pgb-foot2">
          <button class="btn" data-act="publish"><b>Publish to the Web</b></button>
          <button class="btn" data-act="view">View on the Web</button>
          <button class="btn" data-act="share">Share link</button>
          <button class="btn" data-act="pages">My pages</button>
          <span class="pgb-status" data-status role="status"></span>
        </div>
      </div>`;
      const root = $('.pgb'), list = $('[data-list]'), ed = $('[data-ed]'), prevBox = $('[data-prevbox]'), status = $('[data-status]');
      let statusT = 0;
      const say = t => { status.textContent = t; clearTimeout(statusT); statusT = setTimeout(() => { status.textContent = 'Saved as Page ' + (slot + 1); }, 4000); };

      /* page settings */
      $('[data-bgs]').innerHTML = BGS.map(b => `<button class="pgb-sw pgb-bg-${b[0]}" data-bg="${b[0]}" title="${b[1]}" aria-label="${b[1]} background"></button>`).join('');
      $('[data-cols]').innerHTML = COLORS.map(c => `<button class="pgb-sw" style="background:${c[1]}" data-col="${c[0]}" title="${c[0]}" aria-label="${c[0]} text"></button>`).join('');
      function syncSettings() {
        $('[data-p=t]').value = P.t; $('[data-p=f]').value = P.f; $('[data-p=m]').value = P.m;
        W.body.querySelectorAll('[data-bg]').forEach(b => b.classList.toggle('on', b.dataset.bg === P.bg));
        W.body.querySelectorAll('[data-col]').forEach(b => b.classList.toggle('on', b.dataset.col === P.c));
        $('[data-slotname]').textContent = `Page ${slot + 1} of 3: ${P.t}`;
      }
      $('[data-p=t]').addEventListener('input', e => { P.t = S(e.target.value, 60); changed(); $('[data-slotname]').textContent = `Page ${slot + 1} of 3: ${P.t}`; });
      $('[data-p=f]').addEventListener('change', e => { P.f = one(e.target.value, FONTS, 'comic'); changed(); });
      $('[data-p=m]').addEventListener('change', e => { P.m = SONGI[e.target.value] ? e.target.value : ''; changed(); if (playing) play(true); });
      $('[data-bgs]').addEventListener('click', e => {
        const b = e.target.closest('[data-bg]'); if (!b) return; api.sfx.click();
        P.bg = b.dataset.bg;
        const dark = BGI[P.bg][2], cur = P.c;
        if (dark && ['black', 'navy', 'purple'].includes(cur)) P.c = 'white';
        if (!dark && ['white', 'yellow', 'lime', 'cyan'].includes(cur)) P.c = 'black';
        syncSettings(); changed();
      });
      $('[data-cols]').addEventListener('click', e => { const b = e.target.closest('[data-col]'); if (!b) return; api.sfx.click(); P.c = b.dataset.col; syncSettings(); changed(); });
      const playBtn = $('[data-play]');
      function play(on) {
        if (on && P.m) { api.playMusic(SONGI[P.m][2]); playing = true; playBtn.textContent = 'Stop'; }
        else { api.stopMusic(); playing = false; playBtn.textContent = 'Listen'; if (on && !P.m) say('Pick a song from the Music list first.'); }
      }
      playBtn.onclick = () => play(!playing);

      /* block list */
      const summary = b => {
        const s = b.k === 'ti' || b.k === 'tx' || b.k === 'mq' || b.k === 'gb' ? b.x : b.k === 'li' ? (b.h || b.x.join(', ')) : b.k === 'ab' ? b.n : b.k === 'im' ? b.i.map(i => CLIP[i][1]).join(', ') : b.k === 'hr' ? HRS.find(h => h[0] === b.s)[1] : b.k === 'hc' ? HCS.find(h => h[0] === b.s)[1] : b.k === 'lk' ? (b.h || '') : '';
        return KINDI[b.k] + (s ? ': ' + s : '');
      };
      function renderList() {
        list.innerHTML = P.b.map((b, i) => `<li data-i="${i}" class="${i === sel ? 'on' : ''}"><span class="pgb-hdl" title="Drag to move" aria-hidden="true">≡</span><span class="pgb-bl" data-pick>${esc(summary(b))}</span><button class="btn" data-mv="-1" aria-label="Move up" ${i === 0 ? 'disabled' : ''}>▲</button><button class="btn" data-mv="1" aria-label="Move down" ${i === P.b.length - 1 ? 'disabled' : ''}>▼</button><button class="btn" data-del aria-label="Delete">✕</button></li>`).join('') || '<li><span class="pgb-bl">(Empty page. Add something above!)</span></li>';
      }
      function move(from, to) {
        if (to < 0 || to >= P.b.length || from === to) return;
        const [b] = P.b.splice(from, 1); P.b.splice(to, 0, b);
        sel = to; api.sfx.click(); renderList(); changed();
      }
      list.addEventListener('click', e => {
        const li = e.target.closest('li[data-i]'); if (!li) return;
        const i = +li.dataset.i;
        const mv = e.target.closest('[data-mv]');
        if (mv) { move(i, i + +mv.dataset.mv); return; }
        if (e.target.closest('[data-del]')) {
          api.msgBox('Home Page Builder', `Remove the ${KINDI[P.b[i].k]} from your page?`, ['Remove', 'Cancel'], 'warn').then(r => {
            if (r !== 'Remove') return;
            P.b.splice(i, 1); sel = Math.min(sel, P.b.length - 1); renderList(); renderEd(); changed();
          });
          return;
        }
        select(i);
      });
      // drag to reorder (mouse, pen and touch) by the handle
      list.addEventListener('pointerdown', e => {
        const hd = e.target.closest('.pgb-hdl'); if (!hd) return;
        const li = hd.closest('li[data-i]'); if (!li) return;
        e.preventDefault();
        const from = +li.dataset.i; let to = from;
        li.classList.add('pgb-drag');
        try { hd.setPointerCapture(e.pointerId); } catch (err) {}
        const items = () => [...list.querySelectorAll('li[data-i]')];
        const clear = () => items().forEach(x => x.classList.remove('pgb-ovt', 'pgb-ovb'));
        const onMove = ev => {
          const its = items(); clear();
          to = its.length - 1;
          for (let k = 0; k < its.length; k++) { const r = its[k].getBoundingClientRect(); if (ev.clientY < r.top + r.height / 2) { to = k; break; } }
          const target = its[to];
          if (to > from) { const r = target.getBoundingClientRect(); if (ev.clientY < r.top + r.height / 2) to--; }
          const t = its[to]; if (t && to !== from) t.classList.add(to < from ? 'pgb-ovt' : 'pgb-ovb');
        };
        const onUp = () => {
          hd.removeEventListener('pointermove', onMove); hd.removeEventListener('pointerup', onUp); hd.removeEventListener('pointercancel', onUp);
          clear(); li.classList.remove('pgb-drag');
          if (to !== from) move(from, to); else select(from);
        };
        hd.addEventListener('pointermove', onMove); hd.addEventListener('pointerup', onUp); hd.addEventListener('pointercancel', onUp);
      });
      function select(i) {
        sel = i; list.querySelectorAll('li[data-i]').forEach(li => li.classList.toggle('on', +li.dataset.i === i));
        renderEd(); markSel();
      }

      /* block editor */
      const opts = (field, arr, cur, sample) => `<div class="pgb-row">${arr.map(([v, l]) => `<button class="btn pgb-opt${v === cur ? ' on' : ''}" data-set="${field}" data-v="${v}">${sample ? sample(v, l) : l}</button>`).join('')}</div>`;
      const inp = (f, v, n, label, ph = '') => `<label class="pgb-f">${label}<input type="text" data-f="${f}" maxlength="${n}" value="${esc(v)}" placeholder="${esc(ph)}"></label>`;
      const area = (f, v, n, label, rows = 4, kind = '') => `<label class="pgb-f">${label}<textarea data-f="${f}" ${kind ? `data-kind="${kind}"` : ''} maxlength="${n}" rows="${rows}">${esc(v)}</textarea></label>`;
      const ALIGN = [['l', 'Left'], ['c', 'Center'], ['r', 'Right']];
      function renderEd() {
        const b = P.b[sel];
        $('[data-edtitle]').textContent = b ? '4. Edit: ' + KINDI[b.k] : '4. Edit';
        if (!b) { ed.innerHTML = '<p class="pgb-hint">Click something in the list (or on the preview) to change it.</p>'; return; }
        let h = '';
        switch (b.k) {
          case 'ti': h = inp('x', b.x, 60, 'Title words') + '<div>Style</div>' + opts('s', WA, b.s, (v, l) => `<span class="pgb-wa-sample pgb-wa-${v === 'wave' ? 'shadow' : v}">${l}</span>`); break;
          case 'tx': h = area('x', b.x, 1000, 'What do you want to say?', 5) + '<div>Line up</div>' + opts('a', ALIGN, b.a) + '<div>Size</div>' + opts('z', [['s', 'Small'], ['m', 'Medium'], ['l', 'BIG']], b.z); break;
          case 'li': h = inp('h', b.h, 50, 'Heading (optional)') + area('x', b.x.join('\n'), 1300, 'One thing per line', 5, 'lines') + '<div>Bullets</div>' + opts('s', BULLETS, b.s); break;
          case 'ab': h = '<p class="pgb-warn">Stay safe: use a nickname. Never put your last name, address, phone number or school on the Web.</p>' + inp('n', b.n, 30, 'Nickname', 'like SkaterKid or Jo') + inp('a', b.a, 12, 'Age (optional)') + inp('w', b.w, 40, 'Where I live (just a state or country)', 'like Kansas') + inp('l', b.l, 150, 'Things I like') + inp('x', b.x, 150, 'Something about me'); break;
          case 'im': h = `<div>Your pictures (up to 8, click to remove)</div><div class="pgb-picked" data-picked>${b.i.map((id, k) => `<button class="btn" data-unpick="${k}" title="Remove ${esc(CLIP[id][1])}">${clipSVG(id, 2)}</button>`).join('') || '<span class="pgb-hint">(none yet)</span>'}</div><div>Clip-art gallery: click to add</div><div class="pgb-gal">${CLIPS.map(c => `<button data-clip="${c[0]}" title="${esc(c[1])}" aria-label="${esc(c[1])}">${clipSVG(c[0], 2)}</button>`).join('')}</div><div>Size</div>` + opts('z', [[1, 'Small'], [2, 'Medium'], [3, 'Large']], b.z) + '<div>Line up</div>' + opts('a', ALIGN, b.a); break;
          case 'hr': h = '<div>Divider style</div>' + opts('s', HRS, b.s); break;
          case 'mq': h = inp('x', b.x, 120, 'Scrolling words') + '<div>Colors</div>' + opts('s', MQS, b.s); break;
          case 'hc': h = '<p class="pgb-hint">Counts every visit to your published page. (Reloading your own page 50 times counts too. Everybody did it.)</p><div>Counter style</div>' + opts('s', HCS, b.s); break;
          case 'gb': h = inp('x', b.x, 60, 'Guestbook heading') + '<p class="pgb-hint">Visitors to your published page can leave you a message here.</p>'; break;
          case 'lk': h = inp('h', b.h, 50, 'Heading') + area('x', b.x.map(l => l.t + (l.u ? ' | ' + l.u : '')).join('\n'), 1700, 'One friend per line: Name | address', 5, 'links') + `<p class="pgb-hint">Example: Kevin | ${HOST}siliconhills/4077/</p>`; break;
        }
        ed.innerHTML = h;
      }
      ed.addEventListener('input', e => {
        const t = e.target, f = t.dataset.f, b = P.b[sel]; if (!f || !b) return;
        if (t.dataset.kind === 'lines') b[f] = t.value.split('\n').slice(0, 15).map(v => S(v, 80));
        else if (t.dataset.kind === 'links') b[f] = t.value.split('\n').slice(0, 10).map(line => { const [a, ...rest] = line.split('|'); return { t: S(a.trim(), 40), u: S(rest.join('|').trim(), 120) }; });
        else b[f] = S(t.value, +t.maxLength > 0 ? +t.maxLength : 200);
        const li = list.querySelector(`li[data-i="${sel}"] .pgb-bl`); if (li) li.textContent = summary(cleanBlock(b));
        changed();
      });
      ed.addEventListener('click', e => {
        const b = P.b[sel]; if (!b) return;
        const s = e.target.closest('[data-set]');
        if (s) { const v = s.dataset.v; b[s.dataset.set] = /^\d+$/.test(v) ? +v : v; api.sfx.click(); renderEd(); renderList(); changed(); return; }
        const c = e.target.closest('[data-clip]');
        if (c) { if (b.i.length >= 8) { say('That\'s 8 pictures. Remove one first!'); api.sfx.beep(); return; } b.i.push(c.dataset.clip); api.sfx.blip(880); const sc = ed.querySelector('.pgb-gal').scrollTop; renderEd(); ed.querySelector('.pgb-gal').scrollTop = sc; renderList(); changed(); return; }
        const u = e.target.closest('[data-unpick]');
        if (u) { b.i.splice(+u.dataset.unpick, 1); api.sfx.click(); const sc = ed.querySelector('.pgb-gal').scrollTop; renderEd(); ed.querySelector('.pgb-gal').scrollTop = sc; renderList(); changed(); }
      });
      $('.pgb-add').addEventListener('click', e => {
        const a = e.target.closest('[data-add]'); if (!a) return;
        addBlock(a.dataset.add);
      });
      function addBlock(k) {
        if (P.b.length >= 30) { api.msgBox('Home Page Builder', 'Your page already has 30 things on it! Remove something first.', ['OK'], 'warn'); return; }
        const nb = cleanBlock({ k, x: k === 'ti' ? 'My Awesome Page' : k === 'mq' ? 'Welcome to my page!' : k === 'gb' ? 'Sign My Guestbook!' : k === 'li' ? [] : k === 'lk' ? [{ t: 'Kevin', u: HOST + 'siliconhills/4077/' }] : '', i: k === 'im' ? ['star'] : [], h: k === 'li' ? 'My Favorite Things' : '' });
        const at = sel >= 0 && sel < P.b.length ? sel + 1 : P.b.length;
        P.b.splice(at, 0, nb); sel = at;
        api.sfx.ding(); renderList(); renderEd(); changed();
        const li = list.querySelector(`li[data-i="${at}"]`); if (li) li.scrollIntoView({ block: 'nearest' });
        if (root.classList.contains('pgb-narrow')) ed.scrollIntoView({ block: 'nearest' });
      }

      /* live preview */
      function renderPreview() {
        const p = clean(P);
        const ctx = { mode: 'edit', edit: true, hits: 42 };
        prevBox.innerHTML = `<div class="web ${rootClass(p)}">${p.b.map((b, i) => `<div data-bi="${i}">${renderBlock(b, ctx) || '&nbsp;'}</div>`).join('')}<p class="pgb-foot">Made with the CyberBurbs Page Wizard</p></div>`;
        markSel();
      }
      function markSel() { prevBox.querySelectorAll('[data-bi]').forEach(d => d.classList.toggle('pgb-sel', +d.dataset.bi === sel)); }
      prevBox.addEventListener('click', e => {
        const d = e.target.closest('[data-bi]'); if (!d) return;
        select(+d.dataset.bi);
        const li = list.querySelector(`li[data-i="${sel}"]`); if (li) li.scrollIntoView({ block: 'nearest' });
      });

      /* saving */
      function saveNow() { clearTimeout(saveT); pages[slot] = clean(P); api.save('pages', pages); api.save('slot', slot); }
      function changed() {
        clearTimeout(prevT); prevT = setTimeout(renderPreview, 120);
        clearTimeout(saveT); saveT = setTimeout(() => { saveNow(); say('Saved as Page ' + (slot + 1)); }, 600);
      }
      function load(i, fresh) {
        saveNow();
        slot = i; P = fresh ? starter() : clean(pages[i]) || starter(); sel = 0;
        saveNow(); syncSettings(); renderList(); renderEd(); renderPreview(); say(fresh ? `Started a new Page ${i + 1}` : `Opened Page ${i + 1}`);
      }
      async function pagesMenu() {
        const names = pages.map((p, i) => `Page ${i + 1}: ${p ? p.t : '(empty)'}${i === slot ? '  <- open now' : ''}`).join('\n');
        const r = await api.msgBox('My Pages', `You can keep up to 3 pages.\n\n${names}\n\nWhich page do you want to open?`, ['Page 1', 'Page 2', 'Page 3', 'Cancel']);
        if (!r || r === 'Cancel') return;
        const i = +r.slice(-1) - 1; if (i === slot) return;
        load(i, !pages[i]);
      }
      async function newPage() {
        const r = await api.msgBox('New Page', `Start over with a fresh page in Page ${slot + 1}? The page that's there now ("${P.t}") will be replaced.\n\n(To keep it, use My Pages and pick an empty slot.)`, ['Start over', 'Cancel'], 'warn');
        if (r === 'Start over') load(slot, true);
      }

      /* publish, view, share */
      const slug = () => slugOf(api.user);
      const myUrl = () => HOST + slug() + '/';
      let busy = false;
      function overlay(html) {
        const ov = document.createElement('div'); ov.className = 'pgb-ov'; ov.innerHTML = `<div class="pgb-dlg raised">${html}</div>`;
        root.appendChild(ov); return ov;
      }
      async function publish() {
        if (busy) return;
        if (!P.b.length) { api.msgBox('Publish', 'Your page is empty! Add a title or some pictures first.', ['OK'], 'warn'); return; }
        if (!api.online()) {
          const r = await api.msgBox('Publish to the Web', 'To upload your page you need to be connected to the Internet.\n\nOpen the Dial-Up Connection, connect, then press Publish again.', ['Connect', 'Cancel'], 'warn');
          if (r === 'Connect') api.openApp('dial');
          return;
        }
        busy = true; saveNow();
        const kb = Math.max(2, Math.round(JSON.stringify(P).length / 1024 * 3 + 2));
        const ov = overlay(`<h3>Uploading to CyberBurbs...</h3><p data-ul>Connecting to ftp.cyberburbs.com...</p><div class="pgb-prog"><i></i></div>`);
        const bar = ov.querySelector('i'), ul = ov.querySelector('[data-ul]');
        const secs = Math.min(4, Math.max(1.2, kb / Math.max(api.kbps(), 0.5)));
        api.sfx.seek && api.sfx.seek(6);
        await api.sleep(700);
        ul.textContent = `Uploading index.html (${kb} KB)...`;
        const t0 = performance.now();
        while (performance.now() - t0 < secs * 1000) {
          if (!root.isConnected) return;
          bar.style.width = ((performance.now() - t0) / (secs * 1000) * 100) + '%'; await api.sleep(60);
        }
        bar.style.width = '100%';
        api.save('pub', { slug: slug(), p: clean(P) });
        ov.remove(); busy = false;
        api.sfx.tada();
        const r = await api.msgBox('You\'re on the Web!', `Your page is published! Anyone on the Web can visit it at:\n\n${myUrl()}\n\nPress Open NetVoyager to go there now, or find it in the CyberBurbs member directory at ${HOST}`, ['Open NetVoyager', 'OK']);
        if (r === 'Open NetVoyager') { if (api.openUrl) api.openUrl(myUrl()); else api.openApp('nv'); }
      }
      async function view() {
        const pub = api.load('pub', null);
        if (!pub || pub.slug !== slug()) {
          const r = await api.msgBox('View on the Web', 'Your page isn\'t on the Web yet. Press "Publish to the Web" first!', ['Publish now', 'Cancel']);
          if (r === 'Publish now') publish();
          return;
        }
        const same = JSON.stringify(clean(pub.p)) === JSON.stringify(clean(P));
        const r = await api.msgBox('View on the Web', `Your page lives at:\n\n${myUrl()}\n\nPress Open NetVoyager to go there now. It's also listed in the CyberBurbs member directory (${HOST}).${same ? '' : '\n\nYou\'ve changed things since you last published. Press Publish again to update it.'}`, ['Open NetVoyager', 'OK']);
        if (r === 'Open NetVoyager') { if (api.openUrl) api.openUrl(myUrl()); else api.openApp('nv'); }
      }
      function shareLink() {
        const code = encode(P);
        const year = api.era.id === '2000' ? '2000' : '1995';
        return location.href.split('#')[0] + '#' + year + '&page=' + code;
      }
      function share() {
        if (!P.b.length) { api.msgBox('Share', 'Your page is empty! Add something first.', ['OK'], 'warn'); return; }
        saveNow();
        const link = shareLink();
        const ov = overlay(`<h3>Share your page</h3>
          <p style="margin:0">Your whole page is packed inside this link. Anyone who opens it will see your page in their own RetroPuter. Nothing gets uploaded.</p>
          <textarea readonly data-link aria-label="Share link">${esc(link)}</textarea>
          <p style="margin:0" data-len>Link length: <b>${link.length.toLocaleString()}</b> characters${link.length > 3000 ? ' (a long one! Fewer words and pictures make it shorter.)' : ''}</p>
          <p class="pgb-warn">Only share with people you know. The link includes everything you typed on your page.</p>
          <div class="pgb-row"><button class="btn" data-copy><b>Copy link</b></button><button class="btn" data-close>Close</button><span data-cs></span></div>`);
        const ta = ov.querySelector('[data-link]'), cs = ov.querySelector('[data-cs]');
        ta.onfocus = () => ta.select();
        const fallback = () => { ta.focus(); ta.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (e) {} cs.textContent = ok ? 'Copied!' : 'Press Ctrl+C to copy.'; };
        ov.querySelector('[data-copy]').onclick = () => {
          api.sfx.click();
          if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(link).then(() => { cs.textContent = 'Copied!'; }, fallback);
          else fallback();
        };
        ov.querySelector('[data-close]').onclick = () => ov.remove();
      }
      W.body.querySelector('.pgb-foot2').addEventListener('click', e => {
        const a = e.target.closest('[data-act]'); if (!a) return;
        ({ publish, view, share, pages: pagesMenu })[a.dataset.act]();
      });

      /* narrow windows: Edit / Preview tabs */
      $('.pgb-tabs').addEventListener('click', e => {
        const t = e.target.closest('[data-tab]'); if (!t) return;
        root.classList.toggle('pgb-showprev', t.dataset.tab === 'prev');
        W.body.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('on', b === t));
      });
      const fit = () => root.classList.toggle('pgb-narrow', W.body.clientWidth < 640);
      W.onResize = fit;

      api.menubar([
        { label: 'File', items: [
          { label: 'New page', fn: newPage }, { label: 'My pages...', fn: pagesMenu }, { label: 'Save', fn: () => { saveNow(); say('Saved as Page ' + (slot + 1)); } }, '-',
          { label: 'Publish to the Web', fn: publish }, { label: 'View on the Web', fn: view }, { label: 'Share link...', fn: share }, '-',
          { label: 'Exit', fn: () => api.close() }
        ] },
        { label: 'Insert', items: KINDS.map(k => ({ label: k[1], fn: () => addBlock(k[0]) })) },
        { label: 'Help', items: [
          { label: 'How to build a page', fn: () => api.msgBox('How to build a page', '1. Pick a background, text color and music for your page.\n2. Press the + buttons to add things: a title, pictures, lists, a guestbook...\n3. Drag the ≡ handles (or use ▲ ▼) to change the order.\n4. Click anything in the list or on the preview to change it.\n5. Press Publish to the Web to put it online at ' + myUrl() + '\n6. Press Share link to send your page to a friend.\n\nYour pages save by themselves. You can keep 3 different pages under My Pages.\n\nKeyboard: Alt+Up and Alt+Down move the selected thing.') },
          { label: 'Staying safe online', fn: () => api.msgBox('Staying safe online', 'Use a nickname, not your real name.\nNever put your address, phone number, school or photos of yourself on your page.\nOnly share your page link with people you know.\nIf anything online makes you feel weird, tell a grown-up.', ['OK'], 'warn') },
          { label: 'About Page Wizard', fn: () => api.msgBox('About CyberBurbs Page Wizard', 'CyberBurbs Page Wizard 1.0\nHome Page Builder for Horizon\n\nNo HTML required! (It writes the HTML for you. The HTML is terrible. That is traditional.)') }
        ] }
      ]);
      W.onKey = e => {
        if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
        if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) { e.preventDefault(); move(sel, sel + (e.key === 'ArrowUp' ? -1 : 1)); }
        else if (e.key === 'ArrowUp' && sel > 0) { e.preventDefault(); select(sel - 1); }
        else if (e.key === 'ArrowDown' && sel < P.b.length - 1) { e.preventDefault(); select(sel + 1); }
        else if (e.key === 'Delete' && P.b[sel]) list.querySelector(`li[data-i="${sel}"] [data-del]`).click();
      };
      W.onMin = () => play(false);
      W.onClose = () => { clearTimeout(prevT); clearTimeout(statusT); if (saveT) saveNow(); };

      syncSettings(); renderList(); renderEd(); renderPreview(); fit();
      setTimeout(fit, 50);
      status.textContent = 'Saved as Page ' + (slot + 1);
    }
  });

})();
