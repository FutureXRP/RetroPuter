/* Splatter Pad: a wacky paint program for young kids (store app, 1990).
   The picture is a 320x200 canvas (VGA-style), scaled up with crisp pixels. Every tool makes a
   silly synthesized sound. All tools, stamps, erasers and characters here are original. */
(function () {
  'use strict';
  const CW = 320, CH = 200, TAU = Math.PI * 2, MAXPICS = 12, UNDO = 10;

  /* ---------- colors and patterns ---------- */
  const COLORS = [
    ['#000000', 'Black'], ['#ffffff', 'White'], ['#9a9a9a', 'Gray'], ['#8b4513', 'Brown'],
    ['#ff2020', 'Red'], ['#ff8c00', 'Orange'], ['#ffe600', 'Yellow'], ['#40e040', 'Green'],
    ['#008a2e', 'Dark green'], ['#00d8d0', 'Turquoise'], ['#40b8ff', 'Sky blue'], ['#2040ff', 'Blue'],
    ['#8a2be2', 'Purple'], ['#ff40c0', 'Hot pink'], ['#ffa8d8', 'Pink'], ['#ffc890', 'Peach']
  ];
  const RAINBOW = ['#ff2020', '#ff8c00', '#ffe600', '#40e040', '#40b8ff', '#2040ff', '#8a2be2'];
  const PATS = [['solid', 'Plain'], ['check', 'Checkers'], ['stripe', 'Stripes'], ['diag', 'Slants'], ['dots', 'Polka dots'], ['brick', 'Bricks'], ['heart', 'Hearts'], ['rainbow', 'Rainbow stripes']];
  const HEART8 = ['........', '.rr.rr..', 'rrrrrrr.', 'rrrrrrr.', '.rrrrr..', '..rrr...', '...r....', '........'];
  function tileFor(pat, color) {
    const t = document.createElement('canvas'); t.width = t.height = 8;
    const g = t.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, 8, 8); g.fillStyle = color;
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      let on = false;
      if (pat === 'check') on = ((x >> 2) + (y >> 2)) % 2 === 0;
      else if (pat === 'stripe') on = (y & 3) < 2;
      else if (pat === 'diag') on = ((x + y) & 7) < 3;
      else if (pat === 'dots') { const ox = (y & 4) ? 4 : 0; on = ((x + ox) & 7) >= 1 && ((x + ox) & 7) <= 2 && (y & 3) >= 1 && (y & 3) <= 2; }
      else if (pat === 'brick') on = !((y & 3) === 3 || (x & 7) === ((y & 4) ? 4 : 0));
      else if (pat === 'heart') on = HEART8[y][x] === 'r';
      else if (pat === 'rainbow') { g.fillStyle = RAINBOW[y % 7]; on = true; }
      if (on) g.fillRect(x, y, 1, 1);
    }
    if (pat === 'rainbow') { t.height = 7; const g2 = t.getContext('2d'); RAINBOW.forEach((c, i) => { g2.fillStyle = c; g2.fillRect(0, i, 8, 1); }); }
    return t;
  }

  /* ---------- pixel-art stamps (57). m:1 means the rows are the left half, mirrored. ---------- */
  const PX = { k: '#101010', w: '#ffffff', r: '#e8202a', R: '#901018', o: '#ff8c1a', y: '#ffe020', Y: '#c89000', g: '#3cc83c', G: '#1a7a2a', b: '#2a5ce8', B: '#102a8a', c: '#40d8f0', l: '#a8e0ff', p: '#ff80c0', P: '#9040d0', n: '#a0602a', N: '#5a3010', e: '#a8a8a8', E: '#505050', s: '#ffc890', t: '#e8b870' };
  const FACE = ['...kkk', '.kkyyy', '.kyyyy', 'kyyyyy', 'kyyyyy', 'kyyyyy', 'kyyyyy', 'kyyyyy', 'kyyyyy', '.kyyyy', '.kkyyy', '...kkk'];
  const EYES = '3.3k 4.3k', SMILE = '7.2k 8.3k 8.4k 8.5k';
  const ST = [
    // animals
    { n: 'Cat', c: 'ani', s: 'meow', m: 1, a: ['k.....', 'kk....', 'kok...', 'kookkk', 'kooooo', 'kowkoo', 'kokkoo', 'koooop', 'kookoo', 'koookk', '.koooo', '..kkkk'] },
    { n: 'Dog', c: 'ani', s: 'woof', m: 1, a: ['kkk...', 'kNNkkk', 'kNkttt', 'kNktwk', 'kNktkk', 'kNkttt', 'kkttkk', '.ktttk', '.kttrr', '..kkkk'] },
    { n: 'Bunny', c: 'ani', s: 'boing', m: 1, a: ['..kk..', '.kwpk.', '.kwpk.', '.kwpk.', '.kwwkk', 'kwwwww', 'kwkwww', 'kwwwwp', 'kpwwkw', '.kwwww', '..kkkk'] },
    { n: 'Frog', c: 'ani', s: 'ribbit', m: 1, a: ['.kkk..', 'kwwwk.', 'kwkwkk', 'kggggg', 'kggggg', 'kgkkkk', 'kggggg', '.kgggg', '.kkkkk', 'kGGk..'] },
    { n: 'Fish', c: 'ani', s: 'blub', a: ['....kkkkkk..', 'k..kcccccck.', 'kk.kccccwkck', 'kckcccccccck', 'kcccbcbcbcck', 'kckcccccccrk', 'kk.kccccccck', 'k..kcccccck.', '....kkkkkk..'] },
    { n: 'Bird', c: 'ani', s: 'tweet', a: ['...kkkk.....', '..kbbbbk....', '.kbbbwkbk...', '.kbbbkkbkoo.', '.kbbbbbbkook', 'kbbllllbk...', 'kbllbbblbk..', 'kblllllbbk..', '.kbllllbbbkk', '..kkkkkkkkk.', '....o..o....', '...oo.oo....'] },
    { n: 'Ladybug', c: 'ani', s: 'buzz', m: 1, a: ['..k...', '...kkk', '..kkwk', '.krrrk', 'krkkrk', 'krkkrk', 'krrrrk', 'krrkrk', '.krrrk', '..kkkk'] },
    { n: 'Butterfly', c: 'ani', s: 'twinkle', m: 1, a: ['....k.', 'kk...k', 'kPPk.k', 'kPyPkk', 'kPPPkk', '.kPPkk', '.kpppk', 'kpypkk', 'kpppkk', '.kkk.k'] },
    { n: 'Snail', c: 'ani', s: 'slow', a: ['...kkkk.....', '..knnnnk..k.', '.knkkkknk.k.', '.knknnknk.k.', '.knknkknkkk.', '.knknnnnkttk', '..knnnnkkttk', '.kttttttttk.', '..kkkkkkkk..'] },
    { n: 'Duck', c: 'ani', s: 'quack', a: ['.....kkk....', '....kyyyk...', '....kykyk...', '....kyyyook.', '....kyyykk..', 'k..kyyyk....', 'kkkyyyyyk...', 'kyyyyyyyk...', 'kyyYYYyyk...', '.kyyyyyk....', '..kkkkk.....'] },
    { n: 'Pig', c: 'ani', s: 'oink', m: 1, a: ['kk....', 'kpk...', 'kppkkk', 'kppppp', 'kpkppp', 'kppkkk', 'kppkpk', 'kppkkk', '.kpppp', '..kkkk'] },
    { n: 'Bee', c: 'ani', s: 'buzz', a: ['....kk.kk...', '...kwwkwwk..', '...kwwkwwk..', '..kkkkkkkk..', '.kykkykkyyk.', 'kkykkykkykwk', '.kykkykkyyyk', '..kkkkkkkkk.'] },
    { n: 'Owl', c: 'ani', s: 'hoot', m: 1, a: ['k.....', 'kk....', 'knkkkk', 'knnnnn', 'kwwwwn', 'kwkkwn', 'kwwwwn', 'knnnno', 'kntttt', 'kntktt', '.knttt', '..kyky'] },
    { n: 'Turtle', c: 'ani', s: 'slow', a: ['...kkkkk....', '..kGgGgGk...', '.kgGgGgGgkk.', 'kGgGgGgGgkgk', 'kkkkkkkkkggk', '.kgk...kgkk.', '.kkk...kkk..'] },
    // vehicles
    { n: 'Car', c: 'veh', s: 'vroom', a: ['...kkkkkk...', '..kllkkllk..', '.kkkkkkkkkk.', 'krrrrrrrrrrk', 'krrrrrrrrryk', 'krkkkrrkkkrk', '.kkwkkkkwkk.', '..kkk..kkk..'] },
    { n: 'Truck', c: 'veh', s: 'honk', a: ['kkkkkkkk....', 'kbbbbbbk....', 'kbbbbbbkkkk.', 'kbbbbbbkllk.', 'kbbbbbbkyyyk', 'kbbbbbbkyyyk', 'kkkkkkkkkkkk', '.kwk...kwk..', '.kkk...kkk..'] },
    { n: 'Bus', c: 'veh', s: 'honk', a: ['.kkkkkkkkkk.', 'kyyyyyyyyyyk', 'kylylylylyyk', 'kylylylylyyk', 'kyyyyyyyyyok', 'kkkkkkkkkkkk', 'kyykkyyykkyk', '.kkwk..kwkk.', '..kk....kk..'] },
    { n: 'Train', c: 'veh', s: 'choo', a: ['.kkk...kkkkk', '..k....klllk', '.kkkkkkklllk', 'kgggggggkggk', 'kgggggggkggk', 'kkkkkkkkkkkk', '.kkk.kkk.kkk', '.kwk.kwk.kwk', '.kkk.kkk.kkk'] },
    { n: 'Airplane', c: 'veh', s: 'zoom', a: ['kk..........', 'krk.........', 'krrkkkkkkkk.', 'kwwlwlwlwllk', '.kwwwwwwwwk.', '....krrrk...', '....krrk....', '....kkk.....'] },
    { n: 'Sailboat', c: 'veh', s: 'splash', a: ['.....k......', '.....kk.....', '.....krk....', '.....krrk...', '.....krrrk..', '.....krrrrk.', '.....kkkkkkk', '.....k......', 'kkkkkkkkkkkk', '.knnnnnnnnk.', '..knnnnnnk..', 'blblblblblbl'] },
    { n: 'Helicopter', c: 'veh', s: 'chop', a: ['kkkkkkkkkkk.', '....k.......', '..kkkkk.....', '.kllooook..k', 'kllloooookok', 'koooooook..k', '.kkkkkkk....', '..k...k.....', 'kkkkkkkkk...'] },
    { n: 'Hot air balloon', c: 'veh', s: 'whoosh', m: 1, a: ['..kkkk', '.kryrb', 'krryrb', 'krryrb', 'krryrb', '.kryrb', '..kyrb', '...kkk', '....k.', '....nn', '....nn'] },
    // food
    { n: 'Apple', c: 'food', s: 'crunch', m: 1, a: ['.....N', '..kkkN', '.krrrk', 'krwrrr', 'krwrrr', 'krrrrr', 'krrrrr', '.krrrr', '..kkrr', '....kk'] },
    { n: 'Banana', c: 'food', s: 'yum', a: ['..........k.', '.........kyk', '........kyyk', '.......kyyYk', '......kyyyk.', 'k...kkyyyYk.', 'kkkkyyyyyk..', '.kyyyyyYk...', '..kkYYkk....', '....kk......'] },
    { n: 'Cherries', c: 'food', s: 'yum', a: ['.......GG...', '......G.G...', '.....G...G..', '....G....G..', '.kkkk..kkkk.', 'krwrrkkrwrrk', 'krrrrkkrrrrk', 'krrrrkkrrrrk', '.kkkk..kkkk.'] },
    { n: 'Pizza', c: 'food', s: 'yum', m: 1, a: ['knnnnn', 'knnnnn', 'kyyyyy', '.kyrry', '.kyrry', '..kyyy', '..kyyr', '...kyr', '...kyy', '....ky', '.....k'] },
    { n: 'Ice cream', c: 'food', s: 'yum', m: 1, a: ['....kk', '..kkpp', '.kpppp', '.kpwpp', 'kppppp', 'kttttt', '.ktNtN', '.kttNt', '..ktNt', '..kttN', '...ktt', '....kt', '.....k'] },
    { n: 'Birthday cake', c: 'food', s: 'la', m: 1, a: ['.....y', '.....r', '.....r', '.kkkkk', 'kwwwww', 'kpwpww', 'kppppp', 'kyyyyy', 'kppppp', 'kkkkkk', '.eeeee'] },
    { n: 'Cookie', c: 'food', s: 'crunch', m: 1, a: ['...kkk', '.kkttt', 'kttNtt', 'kttttt', 'kNtttN', 'ktttNt', 'kttttt', '.kNttt', '..kkkk'] },
    { n: 'Carrot', c: 'food', s: 'crunch', m: 1, a: ['..G.GG', '...GGG', '..kkkk', '.koooo', '.kNooo', '..kooo', '..koNo', '...koo', '...kNo', '....ko', '.....k'] },
    { n: 'Strawberry', c: 'food', s: 'yum', m: 1, a: ['...G.G', '..GGGG', '.krGGG', 'krrrrr', 'krryrr', 'kryrrr', '.krrry', '.kryrr', '..krrr', '...krr', '....kk'] },
    { n: 'Watermelon', c: 'food', s: 'yum', m: 1, a: ['kkkkkk', 'kgwrrr', 'kgwrkr', '.kgwrr', '.kgwrk', '..kgww', '...kgg', '....kk'] },
    { n: 'Cupcake', c: 'food', s: 'la', m: 1, a: ['.....r', '..kkkk', '.kpppp', 'kppwpp', 'kppppp', 'kkkkkk', '.kcbcb', '.kcbcb', '..kcbc', '..kkkk'] },
    // faces
    { n: 'Happy face', c: 'face', s: 'giggle', m: 1, a: FACE, e: EYES + ' ' + SMILE },
    { n: 'Sad face', c: 'face', s: 'aww', m: 1, a: FACE, e: EYES + ' 8.2k 7.3k 7.4k 7.5k 5.2b' },
    { n: 'Wow face', c: 'face', s: 'wow', m: 1, a: FACE, e: EYES + ' 7.5k 8.4k 8.5r 9.5k' },
    { n: 'Silly face', c: 'face', s: 'giggle', m: 1, a: FACE, e: '3.2k 4.3k ' + SMILE + ' 9.4r 9.5r' },
    { n: 'Cool face', c: 'face', s: 'la', m: 1, a: FACE, e: '3.1k 3.2k 3.3k 3.4k 3.5k 4.2k 4.3k 4.4k ' + SMILE },
    { n: 'Winking face', c: 'face', s: 'kiss', m: 1, a: FACE, e: '3.3k 4.3k ' + SMILE, f: '3.8y 4.7k 4.8k 4.9k' },
    { n: 'Sleepy face', c: 'face', s: 'snore', m: 1, a: FACE, e: '4.2k 4.3k 8.5k' },
    { n: 'Love face', c: 'face', s: 'kiss', m: 1, a: FACE, e: '3.2r 3.4r 4.2r 4.3r 4.4r 5.3r ' + SMILE },
    // space
    { n: 'Rocket', c: 'space', s: 'zap', m: 1, a: ['.....k', '....kr', '...krr', '...kww', '...kwl', '...kwl', '...kww', '..krww', '.krrww', '.kkkkk', '....oy', '.....o'] },
    { n: 'Planet', c: 'space', s: 'whoosh', m: 1, a: ['...kkk', '.kkPPP', '.kPPpP', 'kkPPPP', 'kyyyyy', 'ykkyyy', '.kPPPP', '.kkPPP', '...kkk'] },
    { n: 'Star', c: 'space', s: 'twinkle', m: 1, a: ['.....k', '....ky', '....ky', 'kkkkyy', '.kyyyy', '..kyyy', '..kyyy', '.kyyyk', '.kyk..', 'kk....'] },
    { n: 'Moon', c: 'space', s: 'twinkle', a: ['...kkkk.....', '.kkyyk......', 'kyyyk.......', 'kyyk........', 'kyyk........', 'kyyk........', 'kyyk........', 'kyyyk.......', '.kyyyyykkk..', '..kkkkkk....'] },
    { n: 'Sun', c: 'space', s: 'la', m: 1, a: ['.....y', '.y...y', '..ykkk', '..kyyy', '.kykyy', 'yykyyy', '.kykyy', '..kykk', '..ykkk', '.y...y', '.....y'] },
    { n: 'Alien', c: 'space', s: 'zap', m: 1, a: ['.k....', '..k...', '..kkkk', '.kgggg', 'kggggg', 'kgkkgg', 'kgkwgg', 'kggggg', '.kggkk', '..kggg', '...kkk'] },
    { n: 'Flying saucer', c: 'space', s: 'zap', m: 1, a: ['....kk', '...kll', '..klll', 'kkkkkk', 'keeeee', 'keyeye', '.keeee', '..kkkk', '..y...', '.y....'] },
    { n: 'Comet', c: 'space', s: 'whoosh', a: ['........kkk.', '.......kyyyk', '......kyywyk', '.....oyyyyyk', '....ooyyyyk.', '...ooyokkk..', '..o.oo......', '.o.o........', 'o...........'] },
    // fun
    { n: 'Heart', c: 'fun', s: 'kiss', m: 1, a: ['.kkk..', 'krrrk.', 'krwrrk', 'krrrrr', 'krrrrr', '.krrrr', '..krrr', '...krr', '....kr', '.....k'] },
    { n: 'Flower', c: 'fun', s: 'la', m: 1, a: ['....kk', '..kkpp', '.kppkk', '.kpkyy', '.kpkyy', '.kppkk', '..kkpp', '.....G', '.GG..G', '..GG.G', '.....G'] },
    { n: 'Tree', c: 'fun', s: 'whoosh', m: 1, a: ['...kkk', '.kkggg', 'kggggg', 'kgGggg', 'kggggG', 'kgGggg', '.kgggg', '..kkkN', '....kN', '....kN', 'GGGGGG'] },
    { n: 'House', c: 'fun', s: 'ding', m: 1, a: ['.....k', '....kr', '...krr', '..krrr', '.krrrr', 'kkkkkk', '.kyyyy', '.kllyy', '.kllyn', '.kyyyn', '.kkkkk'] },
    { n: 'Rainbow', c: 'fun', s: 'twinkle', m: 1, a: ['...rrr', '.rrooo', 'rooyyy', 'royygg', 'roygbb', 'roygb.', 'roygb.'] },
    { n: 'Cloud', c: 'fun', s: 'whoosh', m: 1, a: ['....kk', '..kkww', '.kwwww', 'kkwwww', 'kwwwww', 'kwwwww', '.kkkkk'] },
    { n: 'Balloon', c: 'fun', s: 'pop', m: 1, a: ['...kkk', '..krrr', '.krwrr', '.krwrr', '.krrrr', '.krrrr', '..krrr', '...krr', '....kk', '.....k', '....k.'] },
    { n: 'Music notes', c: 'fun', s: 'la', a: ['...PPPPPPPP.', '...PPPPPPPP.', '...P......P.', '...P......P.', '...P......P.', '...P......P.', 'PPPP...PPPP.', 'PPPP...PPPP.', '.PP.....PP..'] },
    { n: 'Crown', c: 'fun', s: 'ding', m: 1, a: ['k....k', 'kyk.ky', 'kyykyy', 'kyyyyy', 'kyyryy', 'kyyyyy', 'kkkkkk'] }
  ];
  const CATS = [['ani', 'Animals', 'Cat'], ['veh', 'Things that go', 'Car'], ['food', 'Yummy food', 'Apple'], ['face', 'Funny faces', 'Happy face'], ['space', 'Outer space', 'Rocket'], ['fun', 'Fun things', 'Heart']];
  function stampRows(st) {
    let rows = st.a.slice();
    if (st.m) {
      rows = rows.map(r => r.padEnd(6, '.').split(''));
      if (st.e) st.e.split(' ').forEach(t => { const m = t.match(/(\d+)\.(\d+)(\w)/); if (m) rows[+m[1]][+m[2]] = m[3]; });
      rows = rows.map(r => r.concat(r.slice().reverse()));
      if (st.f) st.f.split(' ').forEach(t => { const m = t.match(/(\d+)\.(\d+)(\w)/); if (m) rows[+m[1]][+m[2]] = m[3]; });
      rows = rows.map(r => r.join(''));
    }
    const w = Math.max(...rows.map(r => r.length));
    return rows.map(r => r.padEnd(w, '.'));
  }
  const SPR = new Map();
  function sprite(st) {
    if (SPR.has(st)) return SPR.get(st);
    const rows = stampRows(st), c = document.createElement('canvas');
    c.width = rows[0].length; c.height = rows.length;
    const g = c.getContext('2d');
    rows.forEach((r, y) => [...r].forEach((ch, x) => { if (PX[ch]) { g.fillStyle = PX[ch]; g.fillRect(x, y, 1, 1); } }));
    SPR.set(st, c); return c;
  }
  const bigURL = new Map();
  function spriteURL(st, s) {
    if (bigURL.has(st)) return bigURL.get(st);
    const sp = sprite(st), c = document.createElement('canvas'); s = s || 3;
    c.width = sp.width * s; c.height = sp.height * s;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(sp, 0, 0, c.width, c.height);
    const u = c.toDataURL(); bigURL.set(st, u); return u;
  }

  /* ---------- icons (24x24 SVG) ---------- */
  const sv = (s, a) => `<svg viewBox="0 0 24 24" aria-hidden="true" ${a || ''}>${s}</svg>`;
  const I = {
    pencil: '<path d="M3 21l1.5-5L15 5.5l3.5 3.5L8 19.5z" fill="#ffd23f" stroke="#000"/><path d="M3 21l1.5-5 3.5 3.5z" fill="#f4c89a" stroke="#000"/><path d="M2.6 21.4l.9-2.8 1.9 1.9z"/><path d="M15 5.5l2-2 3.5 3.5-2 2z" fill="#ff6b9a" stroke="#000"/>',
    marker: '<g transform="rotate(40 12 12)"><rect x="8" y="1" width="8" height="13" rx="1" fill="#2a5ce8" stroke="#000"/><rect x="8" y="14" width="8" height="3" fill="#ddd" stroke="#000"/><path d="M9 17h6l-1 5h-4z" fill="#e8202a" stroke="#000"/></g>',
    spray: '<rect x="4" y="8" width="9" height="14" rx="1" fill="#e8202a" stroke="#000"/><rect x="6" y="5" width="5" height="3" fill="#bbb" stroke="#000"/><rect x="7" y="3" width="3" height="2"/><rect x="5" y="12" width="7" height="4" fill="#ffd23f"/><g fill="#2a5ce8"><circle cx="15" cy="3" r="1"/><circle cx="18" cy="5" r="1"/><circle cx="16" cy="7" r="1"/><circle cx="21" cy="2" r="1"/><circle cx="21" cy="8" r="1"/><circle cx="19" cy="10" r="1"/></g>',
    wacky: '<path d="M2 21a10 10 0 0 1 20 0" fill="none" stroke="#e8202a" stroke-width="3"/><path d="M5.5 21a6.5 6.5 0 0 1 13 0" fill="none" stroke="#ffd23f" stroke-width="3"/><path d="M9 21a3 3 0 0 1 6 0" fill="none" stroke="#2a5ce8" stroke-width="3"/><path d="M20 1l1 2.5 2.5 1-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1z" fill="#ff80c0" stroke="#000" stroke-width=".6"/>',
    shape: '<rect x="2" y="12" width="9" height="9" fill="#2a5ce8" stroke="#000"/><circle cx="16.5" cy="15.5" r="5" fill="#ffd23f" stroke="#000"/><path d="M11 2l6 8H5z" fill="#e8202a" stroke="#000"/>',
    bucket: '<path d="M3 9l2 12h10l2-12z" fill="#b8b8b8" stroke="#000"/><path d="M3 9c0-7 14-7 14 0" fill="none" stroke="#000"/><ellipse cx="10" cy="9" rx="7" ry="2.2" fill="#3cc83c" stroke="#000"/><path d="M16 9c4 0 5 3 5 7" fill="none" stroke="#3cc83c" stroke-width="2.5"/><circle cx="21" cy="19" r="2" fill="#3cc83c"/>',
    stamp: '<rect x="3" y="14" width="18" height="5" fill="#a0602a" stroke="#000"/><rect x="4" y="19" width="16" height="3" fill="#e8202a" stroke="#000"/><path d="M9 14V9h6v5z" fill="#c88040" stroke="#000"/><circle cx="12" cy="6" r="4" fill="#e8202a" stroke="#000"/>',
    abc: '<text x="12" y="17" text-anchor="middle" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="10" stroke="#000" stroke-width=".5"><tspan fill="#e8202a">A</tspan><tspan fill="#2a5ce8">B</tspan><tspan fill="#1ab02a">C</tspan></text>',
    eraser: '<path d="M2 15l9-9 9 9-6 6H8z" fill="#ff9ec4" stroke="#000"/><path d="M2 15l6 6h6l-6-6z" fill="#fff" stroke="#000"/><path d="M3 23h18" stroke="#000"/>',
    oops: '<circle cx="12" cy="12" r="10" fill="#ffd23f" stroke="#000"/><circle cx="8.3" cy="9" r="1.6"/><circle cx="15.7" cy="9" r="1.6"/><ellipse cx="12" cy="16" rx="3" ry="3.6" fill="#901018" stroke="#000"/><path d="M5 5.5c1-1 2-1.6 3.4-2" fill="none" stroke="#fff" stroke-width="1.5"/>',
    save: '<path d="M3 3h15l3 3v15H3z" fill="#2a5ce8" stroke="#000"/><rect x="7" y="3" width="9" height="6" fill="#ddd" stroke="#000"/><rect x="13" y="4" width="2" height="4" fill="#2a5ce8"/><rect x="6" y="13" width="12" height="8" fill="#fff" stroke="#000"/><path d="M8 16h8M8 18.5h6" stroke="#e8202a"/>',
    gallery: '<rect x="2" y="3" width="20" height="18" fill="#a0602a" stroke="#000"/><rect x="5" y="6" width="14" height="12" fill="#a8e0ff" stroke="#000"/><circle cx="15" cy="9.5" r="2" fill="#ffe020"/><path d="M5.5 17.5l4.5-6 3 3 2-2 3.5 5z" fill="#3cc83c" stroke="#000" stroke-width=".6"/>',
    show: '<rect x="2" y="3" width="20" height="15" fill="#1a3a8a" stroke="#000"/><path d="M9.5 6.5v8l6.5-4z" fill="#fff" stroke="#000" stroke-width=".6"/><path d="M8 18l-2.5 4.5M16 18l2.5 4.5M12 18v4" stroke="#000" stroke-width="1.5"/>',
    newp: '<path d="M5 2h10l4 4v16H5z" fill="#fff" stroke="#000"/><path d="M15 2v4h4" fill="none" stroke="#000"/><path d="M11 10l1.3 2.7 2.7 1.3-2.7 1.3L11 18l-1.3-2.7L7 14l2.7-1.3z" fill="#ffd23f" stroke="#000" stroke-width=".6"/>',
    trash: '<rect x="6" y="7" width="12" height="15" fill="#b8b8b8" stroke="#000"/><rect x="4" y="4" width="16" height="3" fill="#888" stroke="#000"/><rect x="10" y="2" width="4" height="2" fill="#888" stroke="#000"/><path d="M9 10v9M12 10v9M15 10v9" stroke="#555"/>',
    back: '<path d="M11 3L2 12l9 9v-5h11V8H11z" fill="#3cc83c" stroke="#000"/>',
    next: '<path d="M13 3l9 9-9 9v-5H2V8h11z" fill="#3cc83c" stroke="#000"/>',
    prev: '<path d="M11 3L2 12l9 9v-5h11V8H11z" fill="#3cc83c" stroke="#000"/>',
    play: '<path d="M6 3v18l15-9z" fill="#ffd23f" stroke="#000"/>',
    pause: '<rect x="5" y="4" width="5" height="16" fill="#ffd23f" stroke="#000"/><rect x="14" y="4" width="5" height="16" fill="#ffd23f" stroke="#000"/>',
    close: '<path d="M4 7l3-3 5 5 5-5 3 3-5 5 5 5-3 3-5-5-5 5-3-3 5-5z" fill="#e8202a" stroke="#000"/>',
    swap: '<path d="M3 8h13V4l6 6-6 6v-4H3z" fill="#ffd23f" stroke="#000"/>',
    // wacky brushes
    rainbow: '<path d="M2 20a10 10 0 0 1 20 0" fill="none" stroke="#ff2020" stroke-width="2.5"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0" fill="none" stroke="#ffe600" stroke-width="2.5"/><path d="M7 20a5 5 0 0 1 10 0" fill="none" stroke="#40e040" stroke-width="2.5"/><path d="M9.5 20a2.5 2.5 0 0 1 5 0" fill="none" stroke="#2040ff" stroke-width="2.5"/>',
    bubbles: '<g fill="#c8f0ff" stroke="#2a5ce8" stroke-width="1.5"><circle cx="8" cy="15" r="5"/><circle cx="17" cy="8" r="4"/><circle cx="18" cy="18" r="2.5"/></g><g fill="#fff"><circle cx="6.5" cy="13" r="1.2"/><circle cx="15.8" cy="6.8" r="1"/></g>',
    feet: '<g fill="#8a2be2"><ellipse cx="7" cy="16" rx="3" ry="4.5"/><circle cx="4.5" cy="10" r="1.2"/><circle cx="7" cy="9.2" r="1.2"/><circle cx="9.5" cy="10" r="1.2"/><ellipse cx="16" cy="10" rx="3" ry="4.5"/><circle cx="13.5" cy="4" r="1.2"/><circle cx="16" cy="3.2" r="1.2"/><circle cx="18.5" cy="4" r="1.2"/></g>',
    zigzag: '<path d="M2 18l4-12 4 12 4-12 4 12 4-12" fill="none" stroke="#ff8c00" stroke-width="2.5" stroke-linejoin="miter"/>',
    drip: '<path d="M2 4h20v4c-2 0-2 3-2 6a1.8 1.8 0 0 1-3.6 0c0-3 0-5-2-5s-1 8-1 11a2 2 0 0 1-4 0c0-4 0-6-2-6s-1 2-1 3a1.7 1.7 0 0 1-3.4 0V4z" fill="#40e040" stroke="#000"/>',
    mirror: '<path d="M12 2v20" stroke="#000" stroke-dasharray="2 2"/><path d="M10 5C3 5 2 12 7 13s1 7-5 6" fill="none" stroke="#ff40c0" stroke-width="2.5"/><path d="M14 5c7 0 8 7 3 8s-1 7 5 6" fill="none" stroke="#ff40c0" stroke-width="2.5"/>',
    kaleido: '<g stroke-width="2.5"><path d="M12 2v20" stroke="#ff2020"/><path d="M2 12h20" stroke="#2040ff"/><path d="M5 5l14 14" stroke="#40e040"/><path d="M19 5L5 19" stroke="#ffe600"/></g><circle cx="12" cy="12" r="3" fill="#8a2be2" stroke="#000"/>',
    grow: '<path d="M12 22V11" stroke="#1a7a2a" stroke-width="2"/><path d="M12 17c-3 0-5-2-5-4 3 0 5 2 5 4z" fill="#3cc83c" stroke="#000" stroke-width=".6"/><g fill="#ff40c0" stroke="#000" stroke-width=".6"><circle cx="12" cy="4.5" r="2.6"/><circle cx="8" cy="8" r="2.6"/><circle cx="16" cy="8" r="2.6"/><circle cx="9.5" cy="12" r="2.6"/><circle cx="14.5" cy="12" r="2.6"/></g><circle cx="12" cy="8.6" r="2.4" fill="#ffe600" stroke="#000" stroke-width=".6"/>',
    // shapes
    s_line: '<path d="M3 20L21 4" stroke="#000" stroke-width="2.5"/>',
    s_box: '<rect x="3" y="5" width="18" height="14" fill="none" stroke="#000" stroke-width="2.5"/>',
    s_oval: '<ellipse cx="12" cy="12" rx="9" ry="7" fill="none" stroke="#000" stroke-width="2.5"/>',
    s_fbox: '<rect x="3" y="5" width="18" height="14" fill="#2a5ce8" stroke="#000"/>',
    s_foval: '<ellipse cx="12" cy="12" rx="9" ry="7" fill="#e8202a" stroke="#000"/>',
    s_star: '<path d="M12 2l2.9 6.5 7.1.7-5.3 4.7 1.6 7L12 17.3 5.7 21l1.6-7L2 9.2l7.1-.7z" fill="#ffe600" stroke="#000"/>',
    s_heart: '<path d="M12 21C5 15 2 12 2 8a5 5 0 0 1 10-1 5 5 0 0 1 10 1c0 4-3 7-10 13z" fill="#ff40c0" stroke="#000"/>',
    s_tri: '<path d="M12 3l10 18H2z" fill="#40e040" stroke="#000"/>',
    // erasers
    melt: '<path d="M2 3h20v7c-1.5 0-1.5 2-1.5 5a1.6 1.6 0 0 1-3.2 0c0-3-.3-4-1.8-4s-1.5 4-1.5 8a2 2 0 0 1-4 0c0-5 0-7-1.8-7S7 13 7 15a1.7 1.7 0 0 1-3.4 0c0-3 0-5-1.6-5z" fill="#ff8c00" stroke="#000"/>',
    sweep: '<path d="M20 2L10 13" stroke="#8b4513" stroke-width="2.5"/><path d="M11 10l4 4-4 8H3l-1-3z" fill="#ffe600" stroke="#000"/><path d="M5 20l5-6M8 21l4-5" stroke="#c89000"/><g fill="#aaa"><circle cx="18" cy="19" r="1.6"/><circle cx="21" cy="16" r="1.2"/><circle cx="20" cy="22" r="1"/></g>',
    stars: '<path d="M8 2l1.8 4.2 4.2 1.8-4.2 1.8L8 14l-1.8-4.2L2 8l4.2-1.8z" fill="#ffe600" stroke="#000" stroke-width=".6"/><path d="M17 10l1.3 3.2 3.2 1.3-3.2 1.3L17 19l-1.3-3.2-3.2-1.3 3.2-1.3z" fill="#40b8ff" stroke="#000" stroke-width=".6"/><path d="M7 17l.9 2.1 2.1.9-2.1.9L7 23l-.9-2.1L4 20l2.1-.9z" fill="#ff80c0" stroke="#000" stroke-width=".6"/>'
  };
  const dotIcon = (r, c) => `<circle cx="12" cy="12" r="${r}" fill="${c || '#000'}"/>`;
  const rubIcon = s => `<rect x="${12 - s}" y="${12 - s * 0.7}" width="${s * 2}" height="${s * 1.4}" fill="#ff9ec4" stroke="#000"/>`;

  /* ---------- tools ---------- */
  const TOOLS = [
    { id: 'pencil', n: 'Pencil', key: '1', opts: [{ v: 0, n: 'Thin pencil', i: dotIcon(1.5) }, { v: 1, n: 'Thick pencil', i: dotIcon(3) }] },
    { id: 'marker', n: 'Fat Marker', key: '2', opts: [{ v: 2, n: 'Small marker', i: dotIcon(3) }, { v: 4, n: 'Big marker', i: dotIcon(5.5) }, { v: 7, n: 'Giant marker', i: dotIcon(9) }] },
    { id: 'spray', n: 'Spray Can', key: '3', opts: [{ v: 6, n: 'Little spray' }, { v: 11, n: 'Big spray' }, { v: 18, n: 'Huge spray' }] },
    { id: 'wacky', n: 'Wacky Brushes', key: '4', opts: [
      { v: 'rainbow', n: 'Rainbow brush' }, { v: 'bubbles', n: 'Bubble brush' }, { v: 'feet', n: 'Footprints' }, { v: 'zigzag', n: 'Zig zag' },
      { v: 'drip', n: 'Drippy paint' }, { v: 'mirror', n: 'Mirror brush' }, { v: 'kaleido', n: 'Kaleidoscope' }, { v: 'grow', n: 'Flower garden' }] },
    { id: 'shape', n: 'Shapes', key: '5', opts: [
      { v: 'line', n: 'Line', i: I.s_line }, { v: 'box', n: 'Box', i: I.s_box }, { v: 'oval', n: 'Circle', i: I.s_oval }, { v: 'fbox', n: 'Filled box', i: I.s_fbox },
      { v: 'foval', n: 'Filled circle', i: I.s_foval }, { v: 'star', n: 'Star', i: I.s_star }, { v: 'heart', n: 'Heart', i: I.s_heart }, { v: 'tri', n: 'Triangle', i: I.s_tri }] },
    { id: 'bucket', n: 'Paint Bucket', key: '6' },
    { id: 'stamp', n: 'Rubber Stamps', key: '7' },
    { id: 'abc', n: 'Letter Stamps', key: '8' },
    { id: 'eraser', n: 'Erasers', key: '9', opts: [{ v: 3, n: 'Little eraser', i: rubIcon(4) }, { v: 6, n: 'Big eraser', i: rubIcon(6.5) }, { v: 11, n: 'Giant eraser', i: rubIcon(9) }] }
  ];
  TOOLS[2].opts.forEach((o, i) => { o.i = sprayIcon(i); });
  function sprayIcon(i) { const r = [4, 7, 10][i]; let s = ''; for (let k = 0; k < 7 + i * 6; k++) { const a = k * 2.4, d = r * Math.sqrt(((k * 37) % 11) / 11); s += `<rect x="${(12 + Math.cos(a) * d).toFixed(1)}" y="${(12 + Math.sin(a) * d).toFixed(1)}" width="1.6" height="1.6"/>`; } return s; }
  const WACKY_I = { rainbow: I.rainbow, bubbles: I.bubbles, feet: I.feet, zigzag: I.zigzag, drip: I.drip, mirror: I.mirror, kaleido: I.kaleido, grow: I.grow };
  TOOLS[3].opts.forEach(o => { o.i = WACKY_I[o.v]; });
  const ERASERS = [{ v: 'melt', n: 'Melt it!', i: I.melt }, { v: 'sweep', n: 'Sweep it away!', i: I.sweep }, { v: 'stars', n: 'Twinkle into stars!', i: I.stars }];
  const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('');
  const LSIZE = [{ v: 22, n: 'Small letters' }, { v: 36, n: 'Big letters' }, { v: 56, n: 'Giant letters' }];
  const SSIZE = [{ v: 2, n: 'Small stamps' }, { v: 3, n: 'Big stamps' }, { v: 5, n: 'Giant stamps' }];
  const TOOL = id => TOOLS.find(t => t.id === id);

  const CSS = `
    .spl{position:absolute;inset:0;display:grid;gap:4px;padding:4px;background:#c0c0c0;font-family:var(--ui);user-select:none;-webkit-user-select:none;overflow:hidden;
      grid-template-columns:auto 1fr;grid-template-rows:1fr auto auto auto;grid-template-areas:"tools stage" "tools opts" "tools pal" "cap cap"}
    .spl.spl-n{grid-template-columns:1fr;grid-template-rows:auto 1fr auto auto auto;grid-template-areas:"tools" "stage" "opts" "pal" "cap"}
    .spl-tools{grid-area:tools;display:grid;grid-template-columns:repeat(2,50px);grid-auto-rows:50px;gap:3px;align-content:start}
    .spl-n .spl-tools{grid-template-columns:repeat(7,1fr);grid-auto-rows:54px}
    .spl.spl-n .spl-orow .spl-ob{height:54px;min-width:54px}
    .spl-n .spl-orow{min-height:56px}
    .spl-sep{grid-column:1/-1;height:4px;border-top:1px solid #808080;border-bottom:1px solid #fff;align-self:center}
    .spl-n .spl-sep{display:none}
    .spl .spl-tb,.spl .spl-ob{min-width:0;padding:0;display:flex;align-items:center;justify-content:center;touch-action:manipulation}
    .spl .spl-tb:active,.spl .spl-ob:active{padding:2px 0 0 2px}
    .spl-tb svg{width:32px;height:32px}
    .spl .spl-on{border-color:#000 #fff #fff #000;box-shadow:inset 1px 1px #808080;background:#e0e0e0 repeating-conic-gradient(#c0c0c0 0 25%,#f4f4f4 0 50%) 0 0/2px 2px}
    .spl-tb.spl-oops svg{transition:transform .2s}
    .spl-oops.spl-go svg{animation:spl-spin .7s ease-in-out}
    @keyframes spl-spin{0%{transform:rotate(0)}30%{transform:rotate(-40deg) scale(1.3)}70%{transform:rotate(380deg) scale(1.2)}100%{transform:rotate(360deg)}}
    .spl-stage{grid-area:stage;position:relative;min-height:0;min-width:0;background:#808080}
    .spl-cv{position:absolute;box-shadow:2px 2px 0 #000}
    .spl-cv canvas{position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated;image-rendering:crisp-edges}
    .spl-cv .spl-ovc{touch-action:none;cursor:crosshair}
    .spl-cv.spl-wob{animation:spl-wob .5s}
    @keyframes spl-wob{0%,100%{transform:none}20%{transform:rotate(-2deg) scale(.97)}45%{transform:rotate(2deg) scale(1.02)}70%{transform:rotate(-1deg)}}
    .spl-cv.spl-flash::after{content:"";position:absolute;inset:0;background:#fff;animation:spl-fl .45s forwards;pointer-events:none}
    @keyframes spl-fl{from{opacity:.9}to{opacity:0}}
    .spl-opts{grid-area:opts;display:flex;flex-direction:column;gap:3px;padding:3px;background:#d8d8d8;min-width:0}
    .spl-orow{display:flex;gap:3px;overflow-x:auto;overflow-y:hidden;touch-action:pan-x;scrollbar-width:thin;min-height:48px}
    .spl .spl-ob{flex:0 0 auto;width:48px;height:46px}
    .spl-ob svg{width:30px;height:30px}
    .spl-ob img{width:36px;height:36px;object-fit:contain;image-rendering:pixelated}
    .spl-ob.spl-let{font:900 24px "Arial Black",Arial,sans-serif;color:#2040ff}
    .spl-ob.spl-big{width:64px}
    .spl-ob.spl-wide{width:auto;padding:0 8px;gap:4px;font-weight:bold}
    .spl-gap{flex:0 0 6px}
    .spl-hint{display:flex;align-items:center;gap:8px;padding:0 6px;font-weight:bold;min-height:46px}
    .spl-hint svg{width:36px;height:36px;flex:0 0 auto}
    .spl-pal{grid-area:pal;display:flex;gap:4px;align-items:stretch;min-width:0}
    .spl-well{flex:0 0 46px;height:46px;background:#fff;image-rendering:pixelated}
    .spl-sw{flex:1;display:grid;grid-template-columns:repeat(8,1fr);grid-auto-rows:21px;gap:2px;min-width:0}
    .spl-pt{flex:0 0 38%;display:grid;grid-template-columns:repeat(4,1fr);grid-auto-rows:21px;gap:2px;min-width:0}
    .spl-n .spl-sw,.spl-n .spl-pt{grid-auto-rows:36px}
    .spl-n .spl-well{flex-basis:44px;height:74px}
    .spl-c{border:2px solid;border-color:#808080 #fff #fff #808080;padding:0;min-width:0;cursor:pointer;image-rendering:pixelated;background-size:16px 16px;touch-action:manipulation}
    .spl-c.spl-on{outline:3px solid #000;outline-offset:-3px;box-shadow:inset 0 0 0 5px #fff}
    .spl-cap{grid-area:cap;font-weight:bold;min-height:18px;padding:1px 4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:flex;gap:6px;align-items:center}
    .spl-cap b{color:#000080}
    .spl-ov{position:absolute;inset:0;z-index:5;background:#c0c0c0;display:flex;flex-direction:column}
    .spl-ovh{display:flex;gap:6px;padding:6px;align-items:center;border-bottom:2px solid #808080;font-weight:bold}
    .spl-ovh .spl-ob{width:56px;height:48px}
    .spl-ovh .spl-t{flex:1;font-size:15px}
    .spl-gal{flex:1;overflow:auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;padding:10px;align-content:start;background:#a0a0a0}
    .spl-card{display:flex;flex-direction:column;gap:4px;align-items:stretch}
    .spl-card .spl-pic{padding:6px;background:#a0602a;border:3px solid;border-color:#d8a060 #502800 #502800 #d8a060;cursor:pointer;min-width:0}
    .spl-card .spl-pic img{display:block;width:100%;image-rendering:pixelated;background:#fff}
    .spl-card .spl-ob{width:100%;height:44px}
    .spl-card.spl-cur .spl-pic{outline:3px dashed #ffe600;outline-offset:1px}
    .spl-empty{grid-column:1/-1;display:flex;flex-direction:column;align-items:center;gap:8px;padding:24px;font-weight:bold;text-align:center}
    .spl-empty svg{width:64px;height:64px}
    .spl-dlgbg{position:absolute;inset:0;z-index:8;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;padding:8px}
    .spl-dlg{padding:12px;display:flex;flex-direction:column;gap:10px;max-width:420px;width:100%;align-items:center;animation:spl-pop .25s}
    @keyframes spl-pop{from{transform:scale(.6)}to{transform:none}}
    .spl-dlg .spl-q{font-weight:bold;font-size:15px;text-align:center}
    .spl-dlg .spl-thumb{width:120px;image-rendering:pixelated;border:2px solid #000;background:#fff}
    .spl-dlg .spl-ch{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}
    .spl-dlg .spl-ob{width:104px;height:80px;flex-direction:column;gap:3px;font-weight:bold}
    .spl-dlg .spl-ob svg{width:36px;height:36px}
    .spl-ss{position:absolute;inset:0;z-index:6;background:#000;display:flex;flex-direction:column}
    .spl-ssv{flex:1;position:relative;min-height:0;overflow:hidden}
    .spl-frame{position:absolute;left:50%;top:50%;padding:10px;background:#c89000;border:4px solid;border-color:#ffe070 #6a4800 #6a4800 #ffe070;box-shadow:0 0 0 3px #000}
    .spl-frame img{display:block;width:100%;height:100%;image-rendering:pixelated;background:#fff}
    .spl-fx0{animation:spl-fx0 .8s both}.spl-fx1{animation:spl-fx1 .8s both}.spl-fx2{animation:spl-fx2 .9s both}.spl-fx3{animation:spl-fx3 .8s both}
    @keyframes spl-fx0{from{opacity:0;transform:translate(-50%,-50%) scale(.2)}to{opacity:1;transform:translate(-50%,-50%)}}
    @keyframes spl-fx1{from{transform:translate(120%,-50%)}to{transform:translate(-50%,-50%)}}
    @keyframes spl-fx2{from{opacity:0;transform:translate(-50%,-50%) rotate(-200deg) scale(.1)}to{opacity:1;transform:translate(-50%,-50%)}}
    @keyframes spl-fx3{from{transform:translate(-50%,-160%)}60%{transform:translate(-50%,-44%)}to{transform:translate(-50%,-50%)}}
    .spl-ssb{display:flex;gap:8px;justify-content:center;padding:6px;background:#c0c0c0}
    .spl-ssb .spl-ob{width:60px;height:50px}
    .spl-ssn{position:absolute;left:8px;top:6px;color:#ffe600;font:bold 16px var(--ui);text-shadow:2px 2px #000}
    .spl-fly{position:absolute;z-index:9;pointer-events:none;border:2px solid #000;background:#fff;image-rendering:pixelated;transition:all .6s cubic-bezier(.5,-.3,.7,1)}
  `;

  function openSplat(W, api) {
    const root = document.createElement('div'); root.className = 'spl';
    W.body.appendChild(root);
    const opt = Object.assign({ talk: true, snd: true }, api.load('opt', {}));
    const today = () => new Date().toDateString();
    let dead = false, raf = 0, lastT = 0, busy = false;
    const timers = new Set();
    const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); if (!dead) fn(); }, ms); timers.add(t); return t; };

    /* ----- sound ----- */
    const tone = (f, d, o) => { if (opt.snd) api.tone(f, d, Object.assign({ vol: 0.06 }, o)); };
    const noise = (d, o) => { if (opt.snd) api.noise(d, Object.assign({ vol: 0.06 }, o)); };
    const rnd = (a, b) => a + Math.random() * (b - a);
    const PENTA = [523, 587, 659, 784, 880, 1047, 1175, 1319];
    let noteI = 0;
    const SND = {
      scratch() { noise(0.035, { ft: 'highpass', f: rnd(2500, 4500), vol: 0.05, decay: 1 }); },
      squeak() { tone(rnd(650, 900), 0.07, { type: 'triangle', to: rnd(950, 1300), vol: 0.045 }); },
      hiss() { noise(0.09, { ft: 'highpass', f: 5000, vol: 0.07 }); },
      rainbow() { tone(PENTA[noteI++ % 8], 0.09, { type: 'sine', vol: 0.06, decay: 1 }); },
      pop() { tone(rnd(700, 1300), 0.05, { type: 'sine', to: 2000, vol: 0.08, decay: 1 }); },
      step() { tone(140, 0.07, { type: 'square', to: 60, vol: 0.05, decay: 1 }); tone(420, 0.12, { type: 'sine', to: 900, vol: 0.05, at: 0.03 }); },
      buzz() { tone(rnd(140, 180), 0.08, { type: 'sawtooth', to: 260, vol: 0.04 }); },
      plop() { tone(700, 0.12, { type: 'sine', to: 140, vol: 0.09, decay: 1 }); },
      warble() { const f = rnd(380, 520); tone(f, 0.12, { type: 'sine', to: f * 1.5, vol: 0.05 }); tone(f * 1.5, 0.1, { type: 'sine', to: f, vol: 0.04, at: 0.1 }); },
      sprout() { tone(260, 0.22, { type: 'sine', to: 1100, vol: 0.06 }); tone(1320, 0.08, { type: 'triangle', vol: 0.04, at: 0.22, decay: 1 }); },
      stretch(n) { tone(160 + Math.min(900, n * 5), 0.05, { type: 'triangle', vol: 0.04 }); },
      thunk() { tone(110, 0.14, { type: 'square', to: 50, vol: 0.07, decay: 1 }); tone(660, 0.08, { type: 'sine', vol: 0.04, at: 0.05 }); },
      gloop() { tone(160, 0.28, { type: 'sine', to: 720, vol: 0.1 }); noise(0.22, { ft: 'lowpass', f: 900, vol: 0.08, at: 0.05, decay: 1 }); tone(900, 0.06, { type: 'sine', to: 1400, vol: 0.05, at: 0.3 }); },
      rub() { tone(rnd(1100, 1400), 0.05, { type: 'triangle', to: rnd(1500, 1800), vol: 0.035 }); },
      boop() { tone(300, 0.12, { type: 'triangle', to: 200, vol: 0.06 }); },
      click() { if (opt.snd) api.sfx.click(); },
      pick() { tone(880, 0.05, { type: 'square', vol: 0.035, decay: 1 }); tone(1320, 0.06, { type: 'square', vol: 0.03, at: 0.05, decay: 1 }); },
      oops() { tone(900, 0.25, { type: 'sine', to: 220, vol: 0.08 }); tone(220, 0.25, { type: 'sine', to: 700, vol: 0.07, at: 0.25 }); },
      saved() { [0, 4, 7, 12, 16].forEach((n, i) => tone(523 * Math.pow(2, n / 12), 0.12, { type: 'square', vol: 0.04, at: i * 0.08, decay: 1 })); },
      melt() { for (let i = 0; i < 6; i++) tone(700 - i * 90, 0.3, { type: 'sine', to: 500 - i * 70, vol: 0.05, at: i * 0.22 }); for (let i = 0; i < 5; i++) tone(900, 0.1, { type: 'sine', to: 160, vol: 0.06, at: 0.3 + i * 0.25, decay: 1 }); },
      sweep() { for (let i = 0; i < 5; i++) noise(0.22, { ft: 'bandpass', f: 1400 + i * 300, q: 0.8, vol: 0.09, at: i * 0.26 }); },
      stars() { for (let i = 0; i < 14; i++) tone(PENTA[(Math.random() * 8) | 0] * 2, 0.12, { type: 'sine', vol: 0.045, at: i * 0.1, decay: 1 }); },
      // stamp voices
      meow() { tone(520, 0.2, { type: 'sawtooth', to: 820, vol: 0.04 }); tone(820, 0.3, { type: 'sawtooth', to: 460, vol: 0.04, at: 0.18 }); },
      woof() { [0, 0.18].forEach(a => { tone(300, 0.09, { type: 'square', to: 130, vol: 0.06, at: a, decay: 1 }); noise(0.06, { f: 700, vol: 0.06, at: a, decay: 1 }); }); },
      boing() { tone(140, 0.35, { type: 'triangle', to: 700, vol: 0.08 }); },
      ribbit() { for (let i = 0; i < 4; i++) tone(170, 0.04, { type: 'square', vol: 0.05, at: i * 0.05, decay: 1 }); for (let i = 0; i < 3; i++) tone(210, 0.04, { type: 'square', vol: 0.05, at: 0.3 + i * 0.05, decay: 1 }); },
      blub() { for (let i = 0; i < 3; i++) tone(300 + i * 120, 0.07, { type: 'sine', to: 700 + i * 150, vol: 0.07, at: i * 0.1, decay: 1 }); },
      tweet() { for (let i = 0; i < 3; i++) tone(2200, 0.06, { type: 'sine', to: 3100, vol: 0.05, at: i * 0.09 }); },
      quack() { [0, 0.22].forEach(a => { tone(460, 0.15, { type: 'sawtooth', to: 330, vol: 0.05, at: a }); noise(0.12, { f: 1300, q: 3, vol: 0.05, at: a }); }); },
      oink() { tone(210, 0.22, { type: 'sawtooth', to: 150, vol: 0.05 }); noise(0.2, { f: 450, q: 5, vol: 0.1 }); },
      hoot() { tone(420, 0.25, { type: 'sine', to: 380, vol: 0.08 }); tone(420, 0.35, { type: 'sine', to: 360, vol: 0.08, at: 0.35 }); },
      slow() { tone(330, 0.6, { type: 'sine', to: 160, vol: 0.06 }); },
      vroom() { tone(70, 0.5, { type: 'sawtooth', to: 220, vol: 0.05 }); },
      honk() { tone(340, 0.18, { type: 'square', vol: 0.04 }); tone(430, 0.18, { type: 'square', vol: 0.035 }); tone(340, 0.25, { type: 'square', vol: 0.04, at: 0.24 }); tone(430, 0.25, { type: 'square', vol: 0.035, at: 0.24 }); },
      choo() { noise(0.14, { f: 1500, vol: 0.08 }); noise(0.14, { f: 1500, vol: 0.08, at: 0.2 }); tone(620, 0.35, { type: 'square', vol: 0.03, at: 0.4 }); tone(740, 0.35, { type: 'square', vol: 0.03, at: 0.4 }); },
      zoom() { tone(180, 0.6, { type: 'sawtooth', to: 900, vol: 0.04 }); noise(0.6, { f: 600, q: 0.7, vol: 0.05 }); },
      splash() { noise(0.35, { ft: 'lowpass', f: 1600, vol: 0.12 }); },
      chop() { for (let i = 0; i < 7; i++) noise(0.04, { ft: 'lowpass', f: 500, vol: 0.12, at: i * 0.07, decay: 1 }); },
      whoosh() { noise(0.45, { ft: 'bandpass', f: 800, q: 0.7, vol: 0.09 }); },
      crunch() { for (let i = 0; i < 3; i++) noise(0.05, { f: 2600, q: 1.5, vol: 0.12, at: i * 0.08, decay: 1 }); },
      yum() { tone(300, 0.15, { type: 'sine', to: 520, vol: 0.08 }); tone(520, 0.22, { type: 'sine', to: 340, vol: 0.08, at: 0.15 }); },
      giggle() { for (let i = 0; i < 5; i++) tone(900 - i * 60, 0.06, { type: 'sine', to: 1100 - i * 60, vol: 0.06, at: i * 0.08 }); },
      aww() { tone(520, 0.45, { type: 'triangle', to: 300, vol: 0.07 }); },
      wow() { tone(260, 0.4, { type: 'triangle', to: 620, vol: 0.07 }); },
      kiss() { tone(1200, 0.06, { type: 'sine', to: 2200, vol: 0.07 }); noise(0.03, { f: 3000, vol: 0.06, at: 0.05, decay: 1 }); },
      snore() { noise(0.5, { ft: 'lowpass', f: 300, vol: 0.12 }); tone(900, 0.3, { type: 'sine', to: 1300, vol: 0.03, at: 0.55 }); },
      zap() { tone(1600, 0.22, { type: 'square', to: 120, vol: 0.04 }); },
      twinkle() { [0, 4, 7, 12].forEach((n, i) => tone(1047 * Math.pow(2, n / 12), 0.1, { type: 'sine', vol: 0.05, at: i * 0.07, decay: 1 })); },
      la() { [0, 4, 7].forEach((n, i) => tone(523 * Math.pow(2, n / 12), 0.14, { type: 'triangle', vol: 0.07, at: i * 0.1 })); },
      ding() { tone(1568, 0.5, { type: 'sine', vol: 0.07, decay: 1 }); tone(2093, 0.4, { type: 'sine', vol: 0.03, decay: 1 }); },
      letter() { tone(PENTA[noteI++ % 8], 0.12, { type: 'square', vol: 0.035, decay: 1 }); }
    };

    /* ----- speech + caption ----- */
    const said = new Set();
    function tell(text, speak) { cap.innerHTML = ''; const b = document.createElement('b'); b.textContent = text; cap.appendChild(b); if (speak !== false && opt.talk) api.say(text, { rate: 0.95, pitch: 1.25 }); }
    function sayOnce(key, text) { tell(text, !said.has(key)); said.add(key); }

    /* ----- DOM ----- */
    const btn = (cls, inner, title) => `<button class="btn ${cls}" title="${title}" aria-label="${title}">${inner}</button>`;
    root.innerHTML = `
      <div class="spl-tools raised" role="toolbar" aria-label="Tools">
        ${TOOLS.map(t => btn('spl-tb', sv(I[t.id]), t.n).replace('<button ', `<button data-tool="${t.id}" `)).join('')}
        <div class="spl-sep"></div>
        ${btn('spl-tb spl-oops', sv(I.oops), 'Oops! Undo')}
        ${btn('spl-tb spl-save', sv(I.save), 'Save picture')}
        ${btn('spl-tb spl-galb', sv(I.gallery), 'My pictures')}
        ${btn('spl-tb spl-showb', sv(I.show), 'Slideshow')}
        ${btn('spl-tb spl-newb', sv(I.newp), 'New picture')}
      </div>
      <div class="spl-stage sunken"><div class="spl-cv"><canvas class="spl-main" width="${CW}" height="${CH}"></canvas><canvas class="spl-ovc" width="${CW}" height="${CH}"></canvas></div></div>
      <div class="spl-opts sunken"></div>
      <div class="spl-pal"><canvas class="spl-well sunken" width="8" height="8" title="Your paint"></canvas><div class="spl-sw" role="listbox" aria-label="Colors"></div><div class="spl-pt" role="listbox" aria-label="Patterns"></div></div>
      <div class="spl-cap" role="status"></div>`;
    const $ = s => root.querySelector(s);
    const cvWrap = $('.spl-cv'), cv = $('.spl-main'), ov = $('.spl-ovc'), stage = $('.spl-stage'), optsEl = $('.spl-opts'), cap = $('.spl-cap'), well = $('.spl-well');
    const ctx = cv.getContext('2d', { willReadFrequently: true }), octx = ov.getContext('2d');
    ctx.imageSmoothingEnabled = false; octx.imageSmoothingEnabled = false;
    const scr = document.createElement('canvas'); scr.width = CW; scr.height = CH; const sctx = scr.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, CW, CH);

    /* ----- state ----- */
    const st = { tool: 'marker', color: 4, pat: 0, sub: { pencil: 0, marker: 1, spray: 1, wacky: 'rainbow', shape: 'foval', stamp: 0, abc: 'A', eraser: 1 }, cat: 'ani', ssize: 1, lsize: 1 };
    let undo = [], dirty = false, curKey = null, down = null, hover = null, lastSnd = 0;
    const live = []; // drips, flowers: {step(dt) => done}

    /* ----- paint ----- */
    let styleCache = null, dataCache = null;
    const paintKey = () => st.color + ':' + st.pat;
    function paintStyle() {
      if (styleCache && styleCache.k === paintKey()) return styleCache.s;
      const col = COLORS[st.color][0], pat = PATS[st.pat][0];
      const s = pat === 'solid' ? col : ctx.createPattern(tileFor(pat, col), 'repeat');
      styleCache = { k: paintKey(), s }; return s;
    }
    function paintData(style) {
      const k = typeof style === 'string' ? style : paintKey();
      if (dataCache && dataCache.k === k) return dataCache.d;
      sctx.clearRect(0, 0, CW, CH); sctx.fillStyle = style; sctx.fillRect(0, 0, CW, CH);
      dataCache = { k, d: sctx.getImageData(0, 0, CW, CH).data }; return dataCache.d;
    }
    function disc(x, y, r, style) {
      ctx.fillStyle = style;
      x = Math.round(x); y = Math.round(y);
      if (r < 0.75) { ctx.fillRect(x, y, 1, 1); return; }
      const rr = Math.round(r);
      for (let dy = -rr; dy <= rr; dy++) { const dx = Math.floor(Math.sqrt(r * r + r - dy * dy)); if (dx >= 0) ctx.fillRect(x - dx, y + dy, dx * 2 + 1, 1); }
    }
    function lineOf(x0, y0, x1, y1, r, fn) {
      const d = Math.hypot(x1 - x0, y1 - y0), step = Math.max(0.7, r * 0.45), n = Math.max(1, Math.ceil(d / step));
      for (let i = 1; i <= n; i++) fn(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n);
    }
    // Draw any path crisply: render to scratch, keep pixels over half-covered, fill them with the style.
    function commitMask(draw, style) {
      sctx.clearRect(0, 0, CW, CH); sctx.save(); sctx.fillStyle = sctx.strokeStyle = '#000'; sctx.lineJoin = 'round'; sctx.lineCap = 'round'; draw(sctx); sctx.restore();
      const m = sctx.getImageData(0, 0, CW, CH).data, src = paintData(style || paintStyle());
      const img = ctx.getImageData(0, 0, CW, CH), d = img.data;
      for (let i = 3; i < m.length; i += 4) if (m[i] >= 110) { d[i - 3] = src[i - 3]; d[i - 2] = src[i - 2]; d[i - 1] = src[i - 1]; d[i] = 255; }
      ctx.putImageData(img, 0, 0);
    }
    function floodFill(x, y) {
      x = Math.floor(x); y = Math.floor(y);
      if (x < 0 || y < 0 || x >= CW || y >= CH) return false;
      const img = ctx.getImageData(0, 0, CW, CH), d = img.data, src = paintData(paintStyle());
      const i0 = (y * CW + x) * 4, tr = d[i0], tg = d[i0 + 1], tb = d[i0 + 2];
      const same = i => Math.abs(d[i] - tr) + Math.abs(d[i + 1] - tg) + Math.abs(d[i + 2] - tb) < 40;
      const seen = new Uint8Array(CW * CH), stack = [x, y];
      let n = 0;
      while (stack.length) {
        const py = stack.pop(), px0 = stack.pop();
        let px = px0; while (px > 0 && !seen[py * CW + px - 1] && same((py * CW + px - 1) * 4)) px--;
        let upOpen = false, dnOpen = false;
        for (; px < CW; px++) {
          const p = py * CW + px; if (seen[p] || !same(p * 4)) break;
          seen[p] = 1; n++;
          if (py > 0) { const q = p - CW; const ok = !seen[q] && same(q * 4); if (ok && !upOpen) { stack.push(px, py - 1); upOpen = true; } else if (!ok) upOpen = false; }
          if (py < CH - 1) { const q = p + CW; const ok = !seen[q] && same(q * 4); if (ok && !dnOpen) { stack.push(px, py + 1); dnOpen = true; } else if (!ok) dnOpen = false; }
        }
      }
      let change = false;
      for (let p = 0; p < seen.length; p++) if (seen[p]) { const i = p * 4; if (d[i] !== src[i] || d[i + 1] !== src[i + 1] || d[i + 2] !== src[i + 2]) change = true; d[i] = src[i]; d[i + 1] = src[i + 1]; d[i + 2] = src[i + 2]; d[i + 3] = 255; }
      if (change) ctx.putImageData(img, 0, 0);
      return change;
    }
    function isBlank() {
      const d = new Uint32Array(ctx.getImageData(0, 0, CW, CH).data.buffer);
      for (let i = 0; i < d.length; i++) if (d[i] !== 0xffffffff) return false;
      return true;
    }

    /* ----- undo ----- */
    function pushUndo() {
      undo.push({ img: ctx.getImageData(0, 0, CW, CH), key: curKey, dirty });
      if (undo.length > UNDO) undo.shift();
      updButtons();
    }
    function oops() {
      if (busy) return;
      const ob = $('.spl-oops'); ob.classList.remove('spl-go'); void ob.offsetWidth; ob.classList.add('spl-go');
      if (!undo.length) { SND.boop(); tell('Nothing to undo yet. Go ahead and draw!'); return; }
      const u = undo.pop(); live.length = 0; down = null; octx.clearRect(0, 0, CW, CH);
      ctx.putImageData(u.img, 0, 0); curKey = u.key; dirty = true;
      cvWrap.classList.remove('spl-wob'); void cvWrap.offsetWidth; cvWrap.classList.add('spl-wob');
      SND.oops(); tell(api.pick(['Oops! All better.', 'Oopsie! Back it goes.', 'Oops! Whoosh, it\'s gone.']));
      changed(); updButtons();
    }
    function updButtons() { $('.spl-oops').disabled = false; }

    /* ----- autosave the picture in progress ----- */
    let wipT = 0;
    function saveWip() { clearTimeout(wipT); wipT = 0; try { api.save('wip', isBlank() ? { img: null } : { img: cv.toDataURL('image/png'), dirty, key: curKey }); } catch (e) {} }
    function changed() { if (!isBlank()) dirty = true; clearTimeout(wipT); wipT = setTimeout(() => { if (!dead) saveWip(); }, 400); }
    const flush = () => { if (!dead && wipT) saveWip(); };
    window.addEventListener('pagehide', flush);

    /* ----- layout ----- */
    function layout() {
      const w = W.body.clientWidth;
      root.classList.toggle('spl-n', w < 560);
      const r = stage.getBoundingClientRect(), aw = r.width - 8, ah = r.height - 8;
      if (aw <= 0 || ah <= 0) return;
      const s = Math.min(aw / CW, ah / CH), cw = Math.floor(CW * s), ch = Math.floor(CH * s);
      Object.assign(cvWrap.style, { width: cw + 'px', height: ch + 'px', left: Math.floor((r.width - 4 - cw) / 2) + 'px', top: Math.floor((r.height - 4 - ch) / 2) + 'px' });
    }
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => layout()) : null;
    if (ro) ro.observe(stage);

    /* ----- palette ----- */
    const swEl = $('.spl-sw'), ptEl = $('.spl-pt');
    function renderPal() {
      swEl.innerHTML = COLORS.map((c, i) => `<button class="spl-c${i === st.color ? ' spl-on' : ''}" data-c="${i}" style="background:${c[0]}" title="${c[1]}" aria-label="${c[1]}" role="option" aria-selected="${i === st.color}"></button>`).join('');
      ptEl.innerHTML = PATS.map((p, i) => {
        const t = tileFor(p[0], COLORS[st.color][0]);
        const bg = p[0] === 'solid' ? COLORS[st.color][0] : `url(${t.toDataURL()})`;
        return `<button class="spl-c${i === st.pat ? ' spl-on' : ''}" data-p="${i}" style="background:${bg};background-size:16px ${p[0] === 'rainbow' ? 14 : 16}px" title="${p[1]}" aria-label="${p[1]}" role="option" aria-selected="${i === st.pat}"></button>`;
      }).join('');
      const g = well.getContext('2d'); well.width = 16; well.height = 16; g.fillStyle = paintStyle(); g.fillRect(0, 0, 16, 16);
    }
    swEl.addEventListener('click', e => { const b = e.target.closest('[data-c]'); if (!b) return; st.color = +b.dataset.c; SND.pick(); renderPal(); tell(COLORS[st.color][1] + '!'); ghost(); });
    ptEl.addEventListener('click', e => { const b = e.target.closest('[data-p]'); if (!b) return; st.pat = +b.dataset.p; SND.pick(); renderPal(); tell(PATS[st.pat][1] + '!'); ghost(); });

    /* ----- options row ----- */
    const ob = (attrs, inner, title, cls) => `<button class="btn spl-ob ${cls || ''}" ${attrs} title="${api.esc(title)}" aria-label="${api.esc(title)}">${inner}</button>`;
    function renderOpts() {
      const t = TOOL(st.tool), sub = st.sub[st.tool];
      let rows = [];
      if (t.opts) {
        let r = t.opts.map((o, i) => ob(`data-o="${i}"`, sv(o.i), o.n, (st.tool === 'shape' || st.tool === 'wacky' ? o.v === sub : i === sub) ? 'spl-on' : '')).join('');
        if (st.tool === 'eraser') r += '<span class="spl-gap"></span>' + ERASERS.map(e => ob(`data-er="${e.v}"`, sv(e.i), e.n, 'spl-big')).join('');
        rows.push(r);
      } else if (st.tool === 'bucket') {
        rows.push(`<div class="spl-hint">${sv(I.bucket)}<span>Tap inside a shape to fill it with paint!</span></div>`);
      } else if (st.tool === 'stamp') {
        rows.push(CATS.map(c => ob(`data-cat="${c[0]}"`, `<img alt="" src="${spriteURL(ST.find(s => s.n === c[2]))}">`, c[1], c[0] === st.cat ? 'spl-on' : '')).join('') + '<span class="spl-gap"></span>' +
          SSIZE.map((s, i) => ob(`data-ss="${i}"`, sv(dotIcon(3 + i * 3, '#ff40c0')), s.n, i === st.ssize ? 'spl-on' : '')).join(''));
        rows.push(ST.map((s, i) => s.c === st.cat ? ob(`data-st="${i}"`, `<img alt="" src="${spriteURL(s)}">`, s.n, i === sub ? 'spl-on' : '') : '').join(''));
      } else if (st.tool === 'abc') {
        rows.push(LSIZE.map((s, i) => ob(`data-ls="${i}"`, `<span style="font:900 ${12 + i * 7}px Arial Black,Arial,sans-serif;color:#ff40c0">A</span>`, s.n, i === st.lsize ? 'spl-on' : '')).join('') + '<span class="spl-gap"></span>' +
          LETTERS.map(L => ob(`data-l="${L}"`, L, 'Letter ' + L, 'spl-let' + (L === sub ? ' spl-on' : ''))).join(''));
      }
      optsEl.innerHTML = rows.map(r => `<div class="spl-orow">${r}</div>`).join('');
      const on = optsEl.querySelectorAll('.spl-on'); on.forEach(b => { const row = b.parentElement; if (row.scrollWidth > row.clientWidth) row.scrollLeft = Math.max(0, b.offsetLeft - row.offsetLeft - row.clientWidth / 2 + 24); });
      layout();
    }
    optsEl.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      const d = b.dataset, t = TOOL(st.tool);
      if (d.o != null) {
        const o = t.opts[+d.o];
        st.sub[st.tool] = st.tool === 'shape' || st.tool === 'wacky' ? o.v : +d.o;
        SND.pick(); sayOnce(st.tool + ':' + o.v, o.n + '!');
      } else if (d.er) { funErase(d.er); return; }
      else if (d.cat) { st.cat = d.cat; const first = ST.findIndex(s => s.c === st.cat); st.sub.stamp = first; SND.pick(); tell(CATS.find(c => c[0] === d.cat)[1] + '!'); }
      else if (d.ss) { st.ssize = +d.ss; SND.pick(); sayOnce('ss' + d.ss, SSIZE[st.ssize].n + '!'); }
      else if (d.st) { st.sub.stamp = +d.st; const s = ST[+d.st]; tell(s.n + '!'); (SND[s.s] || SND.pick)(); }
      else if (d.ls) { st.lsize = +d.ls; SND.pick(); sayOnce('ls' + d.ls, LSIZE[st.lsize].n + '!'); }
      else if (d.l) { st.sub.abc = d.l; SND.letter(); tell(d.l, false); if (opt.talk) api.say(d.l, { rate: 0.9, pitch: 1.3 }); }
      renderOpts(); ghost();
    });

    /* ----- tool buttons ----- */
    const toolsEl = $('.spl-tools');
    function pickTool(id, quiet) {
      st.tool = id;
      toolsEl.querySelectorAll('[data-tool]').forEach(b => b.classList.toggle('spl-on', b.dataset.tool === id));
      if (!quiet) { SND.pick(); sayOnce('tool:' + id, TOOL(id).n + '!'); }
      renderOpts(); ghost();
    }
    toolsEl.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b || busy) return;
      if (b.dataset.tool) pickTool(b.dataset.tool);
      else if (b.classList.contains('spl-oops')) oops();
      else if (b.classList.contains('spl-save')) savePic();
      else if (b.classList.contains('spl-galb')) gallery('view');
      else if (b.classList.contains('spl-showb')) slideshow();
      else if (b.classList.contains('spl-newb')) newPic();
    });

    /* ----- drawing ----- */
    const pos = e => { const r = ov.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * CW, y: (e.clientY - r.top) / r.height * CH }; };
    const sfxEvery = (ms, fn) => { const now = performance.now(); if (now - lastSnd > ms) { lastSnd = now; fn(); } };
    const stampOf = () => ST[st.sub.stamp] || ST[0];
    function placeStamp(x, y) {
      const sp = sprite(stampOf()), s = SSIZE[st.ssize].v, w = sp.width * s, h = sp.height * s;
      ctx.drawImage(sp, Math.round(x - w / 2), Math.round(y - h / 2), w, h);
    }
    function placeLetter(x, y) {
      const L = st.sub.abc, size = LSIZE[st.lsize].v;
      const draw = (g, stroke) => { g.font = `900 ${size}px "Arial Black", Arial, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; if (stroke) { g.lineWidth = Math.max(3, size / 9); g.strokeText(L, x, y); } else g.fillText(L, x, y); };
      commitMask(g => draw(g, true), '#101010');
      commitMask(g => draw(g, false));
    }
    function sprayAt(x, y, n) {
      const R = TOOL('spray').opts[st.sub.spray].v, s = paintStyle(); ctx.fillStyle = s;
      for (let i = 0; i < n; i++) { const a = Math.random() * TAU, d = R * Math.sqrt(Math.random()); ctx.fillRect(Math.round(x + Math.cos(a) * d), Math.round(y + Math.sin(a) * d), 1, 1); }
    }
    function foot(x, y, ang, left) {
      commitMask(g => {
        g.translate(x, y); g.rotate(ang + Math.PI / 2); g.scale(left ? -1.5 : 1.5, 1.5);
        g.beginPath(); g.ellipse(0, 1.5, 3, 5, 0.15, 0, TAU); g.fill();
        [[-2.6, -5.2, 1.3], [-0.6, -6.4, 1.2], [1.3, -6.2, 1.1], [2.9, -5.2, 1], [3.9, -3.7, 0.9]].forEach(t => { g.beginPath(); g.arc(t[0], t[1], t[2], 0, TAU); g.fill(); });
      });
    }
    function bubble(x, y) {
      const r = rnd(2.5, 8);
      commitMask(g => { g.lineWidth = 1.4; g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke(); });
      ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(x - r * 0.45), Math.round(y - r * 0.5), 2, 2);
      if (r > 5) { ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(x - r * 0.1), Math.round(y - r * 0.65), 1, 1); }
    }
    function kaleidoAt(x, y, c) {
      const cx = CW / 2, cy = CH / 2, dx = x - cx, dy = y - cy;
      [[dx, dy], [-dx, dy], [dx, -dy], [-dx, -dy], [dy, dx], [-dy, dx], [dy, -dx], [-dy, -dx]].forEach(p => disc(cx + p[0], cy + p[1], 2, c));
    }
    function spawnDrip(x, y, style) { const len = rnd(8, 34), r = rnd(0.8, 1.8); let d = 0; live.push({ step(dt) { const nd = Math.min(len, d + 38 * dt); lineOf(x, y + d, x, y + nd, r, (px, py) => disc(px, py, r, style)); d = nd; if (d >= len) { disc(x, y + d + 1, r + 1, style); return true; } return false; } }); }
    function spawnFlower(x, y) {
      const h = rnd(10, 22), pc = api.pick(['#ff2020', '#ff40c0', '#8a2be2', '#ff8c00', '#40b8ff', '#ffe600']), cc = pc === '#ffe600' ? '#ff8c00' : '#ffe600';
      const side = Math.random() < 0.5 ? -1 : 1; let t = 0, stemY = y;
      live.push({ step(dt) {
        t += dt;
        const p = Math.min(1, t / 0.35), ty = y - h * p;
        ctx.fillStyle = '#1a7a2a'; for (let yy = Math.floor(ty); yy <= stemY; yy++) ctx.fillRect(Math.round(x), yy, 2, 1);
        stemY = Math.max(ty, y - h);
        if (t > 0.2) { const ly = Math.round(y - h * 0.4); disc(x + side * 3 + 1, ly, 1.6, '#3cc83c'); }
        if (t > 0.35) {
          const q = Math.min(1, (t - 0.35) / 0.3), pr = 1 + q * 2.4, top = y - h, d = pr * 1.1;
          for (let k = 0; k < 5; k++) { const a = k / 5 * TAU - Math.PI / 2; disc(x + 1 + Math.cos(a) * d, top + Math.sin(a) * d, pr, pc); }
          disc(x + 1, top, Math.max(1, pr * 0.7), cc);
        }
        return t > 0.7;
      } });
    }
    let hueI = 0;
    function brushSeg(x0, y0, x1, y1, first) {
      const tool = st.tool, P = paintStyle();
      if (tool === 'pencil') { const r = st.sub.pencil ? 1 : 0; lineOf(x0, y0, x1, y1, r || 0.7, (x, y) => disc(x, y, r, P)); sfxEvery(70, SND.scratch); }
      else if (tool === 'marker') { const r = TOOL('marker').opts[st.sub.marker].v; lineOf(x0, y0, x1, y1, r, (x, y) => disc(x, y, r, P)); sfxEvery(110, SND.squeak); }
      else if (tool === 'eraser') { const r = TOOL('eraser').opts[st.sub.eraser].v; lineOf(x0, y0, x1, y1, r, (x, y) => { ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(x - r), Math.round(y - r), r * 2 + 1, r * 2 + 1); }); sfxEvery(90, SND.rub); }
      else if (tool === 'spray') { sprayAt(x1, y1, 14); sfxEvery(85, SND.hiss); }
      else if (tool === 'wacky') {
        const w = st.sub.wacky, seg = Math.hypot(x1 - x0, y1 - y0);
        down.acc += seg; down.dist += seg;
        if (w === 'rainbow') { lineOf(x0, y0, x1, y1, 4, (x, y) => { hueI += 0.12; disc(x, y, 4, RAINBOW[Math.floor(hueI) % 7]); }); sfxEvery(120, SND.rainbow); }
        else if (w === 'bubbles') { if (first || down.acc > 9) { down.acc = 0; bubble(x1 + rnd(-5, 5), y1 + rnd(-5, 5)); sfxEvery(60, SND.pop); } }
        else if (w === 'feet') { if (first || down.acc > 19) { down.acc = 0; const a = Math.atan2(y1 - down.fy, x1 - down.fx) || -Math.PI / 2; down.side = !down.side; const px = Math.cos(a + Math.PI / 2) * 5 * (down.side ? 1 : -1), py = Math.sin(a + Math.PI / 2) * 5 * (down.side ? 1 : -1); foot(x1 + px, y1 + py, a, down.side); down.fx = x1; down.fy = y1; SND.step(); } }
        else if (w === 'zigzag') { if (first) { down.zx = x1; down.zy = y1; } else if (down.acc > 6) { const a = Math.atan2(y1 - y0, x1 - x0); down.zs = -(down.zs || 1); const nx = x1 + Math.cos(a + Math.PI / 2) * 6 * down.zs, ny = y1 + Math.sin(a + Math.PI / 2) * 6 * down.zs; lineOf(down.zx, down.zy, nx, ny, 1, (x, y) => disc(x, y, 1, P)); down.zx = nx; down.zy = ny; down.acc = 0; sfxEvery(70, SND.buzz); } }
        else if (w === 'drip') { lineOf(x0, y0, x1, y1, 3, (x, y) => disc(x, y, 3, P)); if (first || down.acc > 12) { down.acc = 0; spawnDrip(x1 + rnd(-2, 2), y1 + 2, P); sfxEvery(140, SND.plop); } }
        else if (w === 'mirror') { lineOf(x0, y0, x1, y1, 3, (x, y) => { disc(x, y, 3, P); disc(CW - 1 - x, y, 3, P); }); sfxEvery(160, SND.warble); }
        else if (w === 'kaleido') { lineOf(x0, y0, x1, y1, 2, (x, y) => { hueI += 0.06; kaleidoAt(x, y, RAINBOW[Math.floor(hueI) % 7]); }); sfxEvery(160, SND.warble); }
        else if (w === 'grow') { if (first || down.acc > 20) { down.acc = 0; spawnFlower(x1, y1); SND.sprout(); } }
      }
    }
    function shapePath(g, k, x0, y0, x1, y1) {
      const l = Math.min(x0, x1), t = Math.min(y0, y1), w = Math.abs(x1 - x0), h = Math.abs(y1 - y0), cx = l + w / 2, cy = t + h / 2;
      g.beginPath();
      if (k === 'line') { g.moveTo(x0, y0); g.lineTo(x1, y1); }
      else if (k === 'box' || k === 'fbox') g.rect(l, t, w, h);
      else if (k === 'oval' || k === 'foval') g.ellipse(cx, cy, Math.max(0.5, w / 2), Math.max(0.5, h / 2), 0, 0, TAU);
      else if (k === 'tri') { g.moveTo(cx, t); g.lineTo(l + w, t + h); g.lineTo(l, t + h); g.closePath(); }
      else if (k === 'star') { for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 0.4 : 1; g.lineTo(cx + Math.cos(a) * w / 2 * r, cy + 0.08 * h + Math.sin(a) * h / 2 * r); } g.closePath(); }
      else if (k === 'heart') { g.moveTo(cx, t + h); g.bezierCurveTo(l - w * 0.1, t + h * 0.55, l, t - h * 0.1, cx, t + h * 0.28); g.bezierCurveTo(l + w, t - h * 0.1, l + w * 1.1, t + h * 0.55, cx, t + h); g.closePath(); }
    }
    const filledShape = k => k !== 'line' && k !== 'box' && k !== 'oval';
    function drawShape(g, k, x0, y0, x1, y1, preview) {
      shapePath(g, k, x0, y0, x1, y1);
      if (filledShape(k)) g.fill(); else { g.lineWidth = 2.2; g.stroke(); }
      if (preview) { g.setLineDash([3, 2]); g.lineWidth = 1; g.strokeStyle = '#000'; shapePath(g, k, x0, y0, x1, y1); g.stroke(); g.setLineDash([]); }
    }

    function ghost() {
      octx.clearRect(0, 0, CW, CH);
      if (!hover || busy || down) return;
      octx.globalAlpha = 0.55;
      if (st.tool === 'stamp') { const sp = sprite(stampOf()), s = SSIZE[st.ssize].v, w = sp.width * s, h = sp.height * s; octx.drawImage(sp, Math.round(hover.x - w / 2), Math.round(hover.y - h / 2), w, h); }
      else if (st.tool === 'abc') { const size = LSIZE[st.lsize].v; octx.font = `900 ${size}px "Arial Black", Arial, sans-serif`; octx.textAlign = 'center'; octx.textBaseline = 'middle'; octx.fillStyle = COLORS[st.color][0]; octx.fillText(st.sub.abc, hover.x, hover.y); }
      else if (st.tool === 'eraser') { const r = TOOL('eraser').opts[st.sub.eraser].v; octx.globalAlpha = 1; octx.strokeStyle = '#000'; octx.lineWidth = 1; octx.strokeRect(Math.round(hover.x - r) + 0.5, Math.round(hover.y - r) + 0.5, r * 2, r * 2); }
      octx.globalAlpha = 1;
    }

    ov.addEventListener('pointerdown', e => {
      if (busy || dead || e.button > 0 || down) return;
      e.preventDefault();
      try { ov.setPointerCapture(e.pointerId); } catch (x) {}
      const p = pos(e); hover = e.pointerType === 'mouse' ? p : null;
      down = { id: e.pointerId, x: p.x, y: p.y, sx: p.x, sy: p.y, acc: 0, dist: 0, fx: p.x, fy: p.y + 1, side: false, zs: 1 };
      octx.clearRect(0, 0, CW, CH);
      const t = st.tool;
      if (t === 'shape') return;
      pushUndo();
      if (t === 'bucket') { if (floodFill(p.x, p.y)) { SND.gloop(); changed(); } else { SND.boop(); undo.pop(); } down = null; return; }
      if (t === 'stamp') { placeStamp(p.x, p.y); const s = stampOf(); (SND[s.s] || SND.thunk)(); return; }
      if (t === 'abc') { placeLetter(p.x, p.y); SND.letter(); if (opt.talk) api.say(st.sub.abc, { rate: 0.9, pitch: 1.3 }); return; }
      brushSeg(p.x, p.y, p.x, p.y, true);
    });
    ov.addEventListener('pointermove', e => {
      const p = pos(e);
      if (!down || e.pointerId !== down.id) { if (e.pointerType === 'mouse') { hover = p; ghost(); } return; }
      e.preventDefault();
      const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
      const pts = evs.length ? evs.map(pos) : [p];
      pts.forEach(q => moveTo(q));
    });
    function moveTo(p) {
      const t = st.tool;
      if (t === 'shape') {
        octx.clearRect(0, 0, CW, CH); octx.fillStyle = octx.strokeStyle = paintStyle();
        drawShape(octx, st.sub.shape, down.sx, down.sy, p.x, p.y, true);
        sfxEvery(60, () => SND.stretch(Math.hypot(p.x - down.sx, p.y - down.sy)));
      } else if (t === 'stamp') {
        down.acc += Math.hypot(p.x - down.x, p.y - down.y);
        const sp = sprite(stampOf()), gap = Math.max(sp.width, sp.height) * SSIZE[st.ssize].v * 1.05;
        if (down.acc > gap) { down.acc = 0; placeStamp(p.x, p.y); sfxEvery(250, SND[stampOf().s] || SND.thunk); }
      } else if (t !== 'abc' && t !== 'bucket') brushSeg(down.x, down.y, p.x, p.y, false);
      down.x = p.x; down.y = p.y;
    }
    function endStroke(e) {
      if (!down || (e && e.pointerId !== down.id)) return;
      const p = e ? pos(e) : { x: down.x, y: down.y };
      if (st.tool === 'shape') {
        octx.clearRect(0, 0, CW, CH);
        if (Math.hypot(p.x - down.sx, p.y - down.sy) >= 2) {
          pushUndo(); const k = st.sub.shape, a = down;
          commitMask(g => drawShape(g, k, a.sx, a.sy, p.x, p.y, false));
          SND.thunk();
        }
      }
      down = null; changed();
      if (e && e.pointerType === 'mouse') ghost();
    }
    ov.addEventListener('pointerup', endStroke);
    ov.addEventListener('pointercancel', endStroke);
    ov.addEventListener('pointerleave', e => { if (!down && e.pointerType === 'mouse') { hover = null; ghost(); } });

    /* ----- main loop: spray while holding, drips and flowers ----- */
    function frame(ts) {
      if (dead) return;
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, lastT ? (ts - lastT) / 1000 : 0.016); lastT = ts;
      if (down && st.tool === 'spray' && !busy) { sprayAt(down.x, down.y, 6); sfxEvery(110, SND.hiss); }
      for (let i = live.length - 1; i >= 0; i--) if (live[i].step(dt)) live.splice(i, 1);
    }
    raf = requestAnimationFrame(frame);

    /* ----- kid-friendly dialog (icons + spoken question) ----- */
    let dlgRes = null;
    function ask(q, choices, thumb) {
      return new Promise(res => {
        const bg = document.createElement('div'); bg.className = 'spl-dlgbg';
        bg.innerHTML = `<div class="spl-dlg raised"><div class="spl-q"></div>${thumb ? `<img class="spl-thumb" alt="" src="${thumb}">` : ''}<div class="spl-ch">${choices.map((c, i) => ob(`data-i="${i}"`, sv(c.i) + `<span>${api.esc(c.t)}</span>`, c.t)).join('')}</div></div>`;
        bg.querySelector('.spl-q').textContent = q;
        root.appendChild(bg);
        if (opt.talk) api.say(q, { rate: 0.95, pitch: 1.25 });
        tone(660, 0.08, { type: 'square', vol: 0.04 }); tone(880, 0.1, { type: 'square', vol: 0.04, at: 0.08 });
        const done = v => { bg.remove(); dlgRes = null; res(v); };
        dlgRes = v => done(v == null ? choices[choices.length - 1].v : v);
        bg.addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (b) { SND.click(); done(choices[+b.dataset.i].v); } });
        setTimeout(() => { const b = bg.querySelector('button'); if (b) b.focus(); }, 30);
      });
    }
    async function confirmLeave() {
      if (!dirty || isBlank()) return true;
      const v = await ask('Do you want to save your picture first?', [{ v: 'save', i: I.save, t: 'Save it' }, { v: 'toss', i: I.trash, t: 'No thanks' }, { v: 'keep', i: I.back, t: 'Keep drawing' }], cv.toDataURL());
      if (v === 'save') return await savePic();
      return v === 'toss';
    }

    /* ----- full-screen erasers ----- */
    function anim(dur, fn) {
      return new Promise(res => {
        const t0 = performance.now();
        const step = now => { if (dead) return res(); const p = Math.min(1, (now - t0) / dur); fn(p); if (p < 1) requestAnimationFrame(step); else res(); };
        requestAnimationFrame(step);
      });
    }
    async function funErase(kind) {
      if (busy) return;
      if (isBlank()) { SND.boop(); tell('The page is already empty. Draw something!'); return; }
      if (!(await confirmLeave())) return;
      busy = true; live.length = 0; down = null; hover = null;
      pushUndo();
      const snap = document.createElement('canvas'); snap.width = CW; snap.height = CH; snap.getContext('2d').drawImage(cv, 0, 0);
      tell(ERASERS.find(e => e.v === kind).n, true);
      if (kind === 'melt') {
        SND.melt();
        const cols = []; for (let x = 0; x < CW; x += 2) cols.push({ d: Math.random() * 0.35 + Math.sin(x / 23) * 0.06, a: rnd(0.9, 1.4) });
        await anim(1900, p => {
          ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, CW, CH);
          cols.forEach((c, i) => { const q = Math.max(0, p - c.d); const off = Math.round(q * q * CH * 2.4 * c.a); if (off < CH) ctx.drawImage(snap, i * 2, 0, 2, CH - off, i * 2, off, 2, CH - off); });
        });
      } else if (kind === 'sweep') {
        SND.sweep();
        const dust = [], sd = snap.getContext('2d').getImageData(0, 0, CW, CH).data;
        let last = 0;
        await anim(1600, p => {
          const bx = Math.round(-20 + p * (CW + 70));
          ctx.fillStyle = '#fff'; if (bx > 0) ctx.fillRect(0, 0, Math.min(CW, bx), CH);
          for (let x = Math.max(0, last); x < Math.min(CW, bx); x += 3) for (let y = 0; y < CH; y += 5) { const i = (y * CW + x) * 4; if (sd[i] + sd[i + 1] + sd[i + 2] < 740 && Math.random() < 0.5) dust.push({ x, y, c: `rgb(${sd[i]},${sd[i + 1]},${sd[i + 2]})`, vx: rnd(10, 40), vy: rnd(-12, 12) }); }
          last = bx;
          octx.clearRect(0, 0, CW, CH);
          dust.forEach(d => { d.x = Math.max(d.x + d.vx * 0.016, bx + rnd(1, 10)); d.y += d.vy * 0.016; octx.fillStyle = d.c; octx.fillRect(Math.round(d.x), Math.round(d.y), 2, 2); });
          if (Math.random() < 0.4) for (let k = 0; k < 4; k++) { octx.fillStyle = 'rgba(160,160,160,.6)'; octx.beginPath(); octx.arc(bx + rnd(4, 18), rnd(0, CH), rnd(2, 6), 0, TAU); octx.fill(); }
          // the broom
          octx.save(); octx.translate(bx, 0);
          octx.strokeStyle = '#000'; octx.lineWidth = 7; octx.beginPath(); octx.moveTo(0, CH / 2); octx.lineTo(-70, -10); octx.stroke();
          octx.strokeStyle = '#a0602a'; octx.lineWidth = 5; octx.stroke();
          octx.fillStyle = '#8b4513'; octx.fillRect(-4, 0, 4, CH);
          octx.fillStyle = '#ffe600'; octx.fillRect(0, 0, 10, CH);
          octx.fillStyle = '#c89000'; for (let y = 2; y < CH; y += 4) octx.fillRect(2, y, 8, 1);
          octx.fillStyle = '#e8202a'; octx.fillRect(-1, 0, 3, CH);
          octx.restore();
        });
        octx.clearRect(0, 0, CW, CH);
      } else {
        SND.stars();
        const B = 8, blocks = [], sparks = [];
        for (let y = 0; y < CH; y += B) for (let x = 0; x < CW; x += B) blocks.push([x, y]);
        for (let i = blocks.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [blocks[i], blocks[j]] = [blocks[j], blocks[i]]; }
        const sd = snap.getContext('2d').getImageData(0, 0, CW, CH).data;
        let done = 0, prev = performance.now();
        await anim(2000, p => {
          const now = performance.now(), dt = (now - prev) / 1000; prev = now;
          const upto = Math.floor(Math.min(1, p / 0.8) * blocks.length);
          ctx.fillStyle = '#fff';
          for (; done < upto; done++) {
            const [x, y] = blocks[done]; ctx.fillRect(x, y, B, B);
            const i = ((y + 4) * CW + x + 4) * 4;
            if ((sd[i] + sd[i + 1] + sd[i + 2] < 740 && Math.random() < 0.7) || Math.random() < 0.06) sparks.push({ x: x + 4, y: y + 4, t: 0, c: api.pick(['#ffe600', '#ffffff', '#40b8ff', '#ff80c0', '#ffe600']) });
          }
          octx.clearRect(0, 0, CW, CH);
          for (let i = sparks.length - 1; i >= 0; i--) {
            const s = sparks[i]; s.t += dt; s.y -= dt * 14; if (s.t > 0.7) { sparks.splice(i, 1); continue; }
            const r = Math.round(1 + Math.sin(s.t / 0.7 * Math.PI) * 3), x = Math.round(s.x), y = Math.round(s.y);
            octx.fillStyle = '#000'; octx.fillRect(x - r - 1, y - 1, r * 2 + 3, 3); octx.fillRect(x - 1, y - r - 1, 3, r * 2 + 3);
            octx.fillStyle = s.c; octx.fillRect(x - r, y, r * 2 + 1, 1); octx.fillRect(x, y - r, 1, r * 2 + 1);
          }
        });
        octx.clearRect(0, 0, CW, CH);
      }
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, CW, CH);
      busy = false; curKey = null; dirty = false; saveWip();
      tell('A fresh new page! What will you make next?');
    }
    async function newPic() { if (busy) return; if (isBlank()) { tell('Your page is ready. Start drawing!'); return; } funErase('stars'); }

    /* ----- saving + gallery ----- */
    const picsList = () => api.load('pics', []).filter(p => p && p.k);
    async function savePic() {
      if (busy) return false;
      if (isBlank()) { SND.boop(); tell('Draw something first, then save it!'); return false; }
      const url = cv.toDataURL('image/png');
      let pics = picsList(), key = curKey && pics.some(p => p.k === curKey) ? curKey : null;
      if (!key) {
        if (pics.length >= MAXPICS) {
          const k = await gallery('replace');
          if (!k) return false;
          key = k; pics = picsList();
        } else { key = 'p' + Date.now().toString(36); pics.push({ k: key, t: Date.now() }); }
      }
      api.save('img:' + key, url);
      if (api.load('img:' + key, null) !== url) {
        pics = picsList(); api.save('pics', pics);
        SND.boop(); api.msgBox('Splatter Pad', 'The disk is full, so the picture could not be saved. Throw away an old picture in My Pictures and try again.', ['OK'], 'warn');
        return false;
      }
      pics = pics.map(p => p.k === key ? { k: key, t: Date.now() } : p);
      api.save('pics', pics); curKey = key; dirty = false; saveWip();
      SND.saved();
      cvWrap.classList.remove('spl-flash'); void cvWrap.offsetWidth; cvWrap.classList.add('spl-flash');
      flyTo(url, $('.spl-galb'));
      tell(api.pick(['Saved! What a great picture!', 'Saved! You are a real artist!', 'Saved! That one goes on the wall!']));
      if (api.load('earnDay', '') !== today()) { api.save('earnDay', today()); later(() => api.earn(2, 'making art'), 700); }
      return true;
    }
    function flyTo(url, target) {
      const r0 = cvWrap.getBoundingClientRect(), r1 = target.getBoundingClientRect(), rr = root.getBoundingClientRect();
      const im = document.createElement('img'); im.className = 'spl-fly'; im.src = url; im.alt = '';
      Object.assign(im.style, { left: r0.left - rr.left + 'px', top: r0.top - rr.top + 'px', width: r0.width + 'px', height: r0.height + 'px' });
      root.appendChild(im);
      requestAnimationFrame(() => requestAnimationFrame(() => Object.assign(im.style, { left: r1.left - rr.left + 'px', top: r1.top - rr.top + 'px', width: r1.width + 'px', height: r1.height * 0.625 + 'px', opacity: 0.3 })));
      later(() => im.remove(), 750);
    }
    function loadImg(url) { return new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = url; }); }
    async function openPicture(key) {
      const url = api.load('img:' + key, null); if (!url) return;
      const im = await loadImg(url); if (!im || dead) return;
      pushUndo(); live.length = 0;
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, CW, CH); ctx.drawImage(im, 0, 0, CW, CH);
      curKey = key; dirty = false; saveWip();
      SND.la(); tell('Here is your picture. Keep painting!');
    }
    let galEl = null, galRes = null;
    function gallery(mode) {
      if (busy && mode !== 'replace') return Promise.resolve(null);
      closeGallery(null);
      return new Promise(res => {
        galRes = res;
        const g = document.createElement('div'); g.className = 'spl-ov'; galEl = g;
        const replace = mode === 'replace';
        root.appendChild(g);
        const draw = () => {
          const pics = picsList();
          g.innerHTML = `<div class="spl-ovh">${ob('data-a="back"', sv(I.back), 'Go back')}<span class="spl-t"></span>${!replace ? ob('data-a="show"', sv(I.show), 'Slideshow') : ''}</div>
            <div class="spl-gal">${pics.length ? pics.map(p => `<div class="spl-card${p.k === curKey ? ' spl-cur' : ''}"><button class="spl-pic" data-k="${p.k}" aria-label="${replace ? 'Swap out this picture' : 'Open this picture'}"><img alt="" src="${api.load('img:' + p.k, '')}"></button>${replace ? ob(`data-k="${p.k}"`, sv(I.swap), 'Swap') : ob(`data-del="${p.k}"`, sv(I.trash), 'Throw away')}</div>`).join('')
              : `<div class="spl-empty">${sv(I.gallery)}<span>No pictures yet! Draw something, then press the Save button.</span></div>`}</div>`;
          g.querySelector('.spl-t').textContent = replace ? 'Your picture wall is full! Tap a picture to swap it for your new one.' : `My Pictures (${pics.length} of ${MAXPICS})`;
        };
        draw();
        if (replace) tell('Your picture wall is full! Tap a picture to swap it for your new one.');
        else sayOnce('gallery', picsList().length ? 'Here are your pictures! Tap one to open it.' : 'No pictures yet! Draw something, then press the Save button.');
        g.addEventListener('click', async e => {
          const b = e.target.closest('button'); if (!b) return;
          SND.click();
          if (b.dataset.a === 'back') { closeGallery(null); return; }
          if (b.dataset.a === 'show') { closeGallery(null); slideshow(); return; }
          if (b.dataset.del) {
            const k = b.dataset.del;
            const v = await ask('Throw this picture away?', [{ v: 'yes', i: I.trash, t: 'Throw away' }, { v: 'no', i: I.back, t: 'Keep it' }], api.load('img:' + k, ''));
            if (v === 'yes') {
              api.save('pics', picsList().filter(p => p.k !== k)); api.save('img:' + k, null);
              if (curKey === k) { curKey = null; if (!isBlank()) dirty = true; }
              noise(0.3, { ft: 'lowpass', f: 700, vol: 0.1 }); draw(); tell('Into the trash can!', true);
            }
            return;
          }
          if (b.dataset.k) {
            const k = b.dataset.k;
            if (replace) { closeGallery(k); return; }
            if (k === curKey && !dirty) { closeGallery(null); return; }
            g.style.visibility = 'hidden';
            const ok = await confirmLeave();
            g.style.visibility = '';
            if (!ok) return;
            closeGallery(null); openPicture(k);
          }
        });
      });
    }
    function closeGallery(v) { if (galEl) { galEl.remove(); galEl = null; } const r = galRes; galRes = null; if (r) r(v); }

    /* ----- slideshow ----- */
    let ss = null;
    async function slideshow() {
      if (busy) return;
      const pics = picsList();
      if (!pics.length) { SND.boop(); tell('Save a picture first, then watch your slideshow!'); return; }
      closeSlideshow();
      const el = document.createElement('div'); el.className = 'spl-ss';
      el.innerHTML = `<div class="spl-ssv"><div class="spl-ssn"></div></div><div class="spl-ssb">${ob('data-a="prev"', sv(I.prev), 'Back')}${ob('data-a="pause"', sv(I.pause), 'Pause')}${ob('data-a="next"', sv(I.next), 'Next')}${ob('data-a="close"', sv(I.close), 'Stop the slideshow')}</div>`;
      root.appendChild(el);
      ss = { el, i: -1, n: pics.length, pics, playing: true, t: 0 };
      tell('Slideshow! Sit back and enjoy your art.');
      el.addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b) { ssGo(1); return; }
        SND.click();
        const a = b.dataset.a;
        if (a === 'close') closeSlideshow();
        else if (a === 'next') ssGo(1);
        else if (a === 'prev') ssGo(-1);
        else if (a === 'pause') ssToggle();
      });
      ssGo(1);
    }
    function ssToggle() {
      if (!ss) return; ss.playing = !ss.playing;
      const b = ss.el.querySelector('[data-a="pause"]'); b.innerHTML = sv(ss.playing ? I.pause : I.play); b.title = ss.playing ? 'Pause' : 'Play';
      clearTimeout(ss.t); if (ss.playing) ss.t = later(() => ssGo(1), 3500);
    }
    function ssGo(d) {
      if (!ss) return;
      clearTimeout(ss.t);
      ss.i = (ss.i + d + ss.n) % ss.n;
      const v = ss.el.querySelector('.spl-ssv'), r = v.getBoundingClientRect();
      const s = Math.min((r.width - 40) / CW, (r.height - 40) / CH);
      v.querySelectorAll('.spl-frame').forEach(f => f.remove());
      const f = document.createElement('div'); f.className = 'spl-frame spl-fx' + (ss.i % 4);
      Object.assign(f.style, { width: Math.max(80, Math.floor(CW * s)) + 'px', height: Math.max(50, Math.floor(CH * s)) + 'px', transform: 'translate(-50%,-50%)' });
      f.innerHTML = `<img alt="Picture ${ss.i + 1}" src="${api.load('img:' + ss.pics[ss.i].k, '')}">`;
      v.appendChild(f);
      v.querySelector('.spl-ssn').textContent = `${ss.i + 1} / ${ss.n}`;
      const base = [0, 2, 4, 5][ss.i % 4];
      [0, 4, 7, 12].forEach((n, k) => tone(392 * Math.pow(2, (n + base) / 12), 0.16, { type: 'triangle', vol: 0.05, at: k * 0.12 }));
      if (ss.playing) ss.t = later(() => ssGo(1), 3500);
    }
    function closeSlideshow() { if (!ss) return; clearTimeout(ss.t); ss.el.remove(); ss = null; }

    /* ----- menus, help, keys ----- */
    function howTo() {
      const t = 'Pick a tool on the left, pick a color at the bottom, then draw on the white page with your mouse or finger.\n\n' +
        'Tools: Pencil, Fat Marker, Spray Can, Wacky Brushes, Shapes, Paint Bucket, Rubber Stamps, Letter Stamps and Erasers. Each tool has more choices in the row under the picture.\n\n' +
        'Oops (the yellow face) takes back your last 10 steps. The Erasers have three silly ways to clear the whole page.\n\n' +
        'Save (the floppy disk) keeps up to 12 pictures. My Pictures shows them, and Slideshow plays them like a movie. Save a picture to earn a little money, once a day.\n\n' +
        'Keys: 1 to 9 pick tools, Ctrl+Z is Oops, Ctrl+S saves. With Letter Stamps, type a letter to pick it.';
      if (opt.talk) api.say('Pick a tool, pick a color, and draw! Press the yellow Oops face to take something back. Press the floppy disk to save your picture.', { rate: 0.95, pitch: 1.25 });
      api.msgBox('How to use Splatter Pad', t);
    }
    api.menubar([
      { label: 'Picture', items: [{ label: 'New Picture', fn: newPic }, { label: 'Save Picture', fn: savePic }, { label: 'My Pictures...', fn: () => gallery('view') }, { label: 'Slideshow', fn: slideshow }] },
      { label: 'Edit', items: [{ label: 'Oops! (Undo)', fn: oops }] },
      { label: 'Options', items: () => [
        { label: (opt.talk ? '✓ ' : '    ') + 'Talking', fn: () => { opt.talk = !opt.talk; api.save('opt', opt); if (!opt.talk && window.speechSynthesis) speechSynthesis.cancel(); tell(opt.talk ? 'Talking is on!' : 'Talking is off.'); } },
        { label: (opt.snd ? '✓ ' : '    ') + 'Sound Effects', fn: () => { opt.snd = !opt.snd; api.save('opt', opt); tell(opt.snd ? 'Sound effects are on!' : 'Sound effects are off.', false); } }] },
      { label: 'Help', items: [{ label: 'How to Use', fn: howTo }] }
    ]);
    W.onKey = e => {
      if (dlgRes) { if (e.key === 'Escape') { e.preventDefault(); dlgRes(null); } return; }
      if (ss) { e.preventDefault(); if (e.key === 'Escape') closeSlideshow(); else if (e.key === 'ArrowRight') ssGo(1); else if (e.key === 'ArrowLeft') ssGo(-1); else if (e.key === ' ') ssToggle(); return; }
      if (galEl) { if (e.key === 'Escape') { e.preventDefault(); closeGallery(null); } return; }
      const k = e.key;
      if ((e.ctrlKey || e.metaKey) && k.toLowerCase() === 'z') { e.preventDefault(); oops(); return; }
      if ((e.ctrlKey || e.metaKey) && k.toLowerCase() === 's') { e.preventDefault(); savePic(); return; }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (st.tool === 'abc' && /^[a-z0-9]$/i.test(k)) { e.preventDefault(); st.sub.abc = k.toUpperCase(); SND.letter(); tell(st.sub.abc, false); if (opt.talk) api.say(st.sub.abc, { rate: 0.9, pitch: 1.3 }); renderOpts(); ghost(); return; }
      const t = TOOLS.find(x => x.key === k); if (t) { e.preventDefault(); pickTool(t.id); return; }
      if (k === 'Backspace') { e.preventDefault(); oops(); }
    };
    W.onResize = () => { layout(); if (ss) ssGo(0); };
    W.onMin = () => { if (ss && ss.playing) ssToggle(); down = null; };
    W.onClose = () => {
      if (!dead && wipT) saveWip();
      window.removeEventListener('pagehide', flush);
      dead = true; cancelAnimationFrame(raf); timers.forEach(clearTimeout); timers.clear(); clearTimeout(wipT);
      if (ro) ro.disconnect();
      if (window.speechSynthesis && opt.talk) try { speechSynthesis.cancel(); } catch (x) {}
    };

    /* ----- start ----- */
    pickTool('marker', true); renderPal(); layout(); setTimeout(layout, 0);
    const wip = api.load('wip', null);
    if (wip && wip.img) loadImg(wip.img).then(im => { if (!im || dead) return; ctx.drawImage(im, 0, 0, CW, CH); dirty = !!wip.dirty; curKey = wip.key || null; });
    tell('Welcome to Splatter Pad! Pick a tool and a color, then draw!');
  }

  const ICON = '<svg viewBox="0 0 32 32" shape-rendering="crispEdges" aria-hidden="true"><path d="M4 6h18l4 4v18H4z" fill="#fff" stroke="#000"/><path d="M6 10h4v2h2v4H8v-2H6z" fill="#ff2020"/><path d="M13 18h5v2h2v4h-4v-2h-3z" fill="#2040ff"/><path d="M16 9h4v4h-4z" fill="#ffe600"/><path d="M7 20h3v3H7z" fill="#40e040"/><path d="M21 4l7-3 2 2-3 7-3 2-2-2z" fill="#a0602a" stroke="#000"/><path d="M19 13l3-3 2 2-3 3-3 1z" fill="#ff40c0" stroke="#000"/></svg>';
  (window.RETRO_APPS = window.RETRO_APPS || []).push({
    id: 'kidart', label: 'Splatter Pad', kind: 'store', cat: 'game', year: 1990, price: 14.95,
    help: 'A silly talking paint program for young artists, with wacky brushes, stamps and erasers. Save a picture to earn money.',
    publisher: 'Jellybean Jr. Software', genre: 'Kids / Art', sizeKB: 1150,
    tagline: 'Splat it! Stamp it! Melt it! The art program that talks back.',
    blurb: 'Splatter Pad turns your computer into the silliest art box in town. Paint with rainbows, bubbles, footprints and drippy paint, grow a garden of flowers, stamp more than 50 animals, trucks, snacks and space aliens, and fill shapes with polka dots and bricks. Every tool makes a funny noise and says its own name, so even artists who can\'t read yet can dive right in. Made a mistake? Press Oops! Want a fresh page? Melt the picture, sweep it away, or turn it into twinkling stars. Save 12 masterpieces and show them off in a slideshow. For artists ages 3 to 8.',
    box: { bg: '#ffe600', fg: '#2040ff', accent: '#ff40c0' },
    icon: ICON,
    window: { w: 720, h: 560 },
    css: CSS,
    open: openSplat
  });
})();
