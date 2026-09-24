/* The Information Superhighway Trail: a store game (1995).
   An original, gentle journey game: lead the Byte family from 1990 to the year 2000
   along the Information Superhighway. Nobody gets hurt; tired travelers just log off and go outside. */
(function () {
  'use strict';

  /* ---------- data ---------- */
  const TOTAL = 2000; // megabytes from 1990 to 2000
  const LM = [
    { name: 'Dial-Up Depot', short: 'DIAL-UP DEPOT', mb: 0, year: 1990, shop: "Floppy's General Store", price: 1, map: [18, 120], scene: 'depot',
      desc: 'Every trip starts here, with a squeal, a hiss and a KSSHHHH. The phone lines hum, and Floppy\'s General Store is open for business.' },
    { name: 'BBS Junction', short: 'BBS JUNCTION', mb: 300, year: 1991.4, shop: 'The Junction Swap Shop', price: 1.25, trade: true, map: [68, 92], scene: 'bbs',
      desc: 'A busy crossroads of bulletin boards. Green text scrolls on every screen, and somebody is always asking for the newest shareware.' },
    { name: 'The Web Frontier', short: 'WEB FRONTIER', mb: 700, year: 1993.7, shop: 'Frontier Supply Co.', price: 1.5, trade: true, map: [122, 118], scene: 'web',
      desc: 'Brand-new pages are going up everywhere. Half the town is "Under Construction", and every house has a hit counter on the porch.' },
    { name: 'Chat Room Canyon', short: 'CHAT CANYON', mb: 1050, year: 1995.6, trade: true, map: [172, 80], scene: 'chat',
      desc: 'Voices bounce off the canyon walls: "Hi!" "Hi!" "Hi!" It is very friendly here, and a little bit noisy.' },
    { name: 'Dot-Com Boomtown', short: 'BOOMTOWN', mb: 1450, year: 1997.8, shop: 'Boomtown Mega-Mart', price: 2, trade: true, map: [226, 110], scene: 'dotcom',
      desc: 'Shiny towers, big ideas and free t-shirts on every corner. Everybody has a business plan written on a napkin. Prices are sky high.' },
    { name: 'The Y2K River', short: 'Y2K RIVER', mb: 1800, year: 1999.3, river: true, map: [266, 74], scene: 'river',
      desc: 'The last big obstacle. Nobody is quite sure how deep the Y2K bugs go.' },
    { name: 'The Year 2000', short: 'YEAR 2000', mb: 2000, year: 2000, map: [302, 40], scene: 'end', desc: '' }
  ];
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const PACES = [
    { name: 'Browsing', mb: 20, drain: 0.4, ill: 0, desc: 'a slow, relaxing 20 MB a day' },
    { name: 'Surfing', mb: 30, drain: 1.0, ill: 0.008, desc: 'a steady 30 MB a day' },
    { name: 'Speeding', mb: 42, drain: 2.8, ill: 0.035, desc: 'a zippy 42 MB a day, but tempers get short' }
  ];
  const RATIONS = [
    { name: 'Nibbles', eat: 1, eff: -1.4, ill: 0.02, desc: '1 snack pack per person a day' },
    { name: 'Regular', eat: 2, eff: 0.3, ill: 0, desc: '2 snack packs per person a day' },
    { name: 'Feast', eat: 3, eff: 1.2, ill: -0.006, desc: '3 snack packs per person a day' }
  ];
  const JOBS = [
    { name: 'Paperboy', money: 400, mult: 3, desc: 'You deliver the morning paper on your bike. Not much money, but the trip is worth triple points.' },
    { name: 'Teacher', money: 800, mult: 2, desc: 'You teach fourth grade and run the school computer lab. A fair budget, and double points.' },
    { name: 'Computer Store Clerk', money: 1600, mult: 1, desc: 'You sell computers at the mall and get a discount on everything. Lots of money, regular points.' }
  ];
  const ITEMS = [
    { k: 'snacks', name: 'Snack packs', unit: 'bag of 10', per: 10, price: 1.5, max: 2000 },
    { k: 'modems', name: 'Spare modems', unit: 'each', per: 1, price: 40, max: 5 },
    { k: 'lines', name: 'Spare phone lines', unit: 'each', per: 1, price: 20, max: 5 },
    { k: 'disks', name: 'Floppy disks', unit: 'box of 10', per: 1, price: 10, max: 20 },
    { k: 'pep', name: 'Pep talks', unit: 'each', per: 1, price: 15, max: 10 },
    { k: 'scan', name: 'Virus checkers', unit: 'each', per: 1, price: 30, max: 5 }
  ];
  const ITEM = Object.fromEntries(ITEMS.map(i => [i.k, i]));
  const ILLS = ['Screen Squint', 'Modem Rage', 'Mouse Wrist', 'Popup Fatigue', 'Keyboard Elbow', 'Dial-Tone Ear'];
  const NAMES = ['Pat', 'Kim', 'Max', 'Gigi', 'Sam', 'Jo', 'Lee', 'Ricky', 'Dot', 'Chip', 'Penny', 'Rex', 'Ada', 'Hal', 'Lulu', 'Ziggy', 'Nora', 'Otto', 'Bea', 'Gus'];
  const NOTES = [
    'Gone to smell some real flowers. Back for dinner.',
    'Went outside. The graphics are amazing out here.',
    'Off to ride my bike. It has no loading time.',
    'Learning to skip stones. No password needed.',
    'Building a treehouse. Zero pop-ups up there.',
    'Playing catch with the neighbors. Totally lag-free!',
    'Went to the library. They have books made of paper!',
    'At the park. The sky is running in full color.'
  ];
  const DEFAULT_TOP = [
    ['Ada Lovebyte', 7200], ['Captain Kbps', 5900], ['The Modemaires', 4700], ['Webby W.', 3800], ['Grandpa Baud', 3000],
    ['Sally Sysop', 2400], ['Hank Hyperlink', 1800], ['Dotty Dotcom', 1200], ['Pixel Pete', 700], ['Newbie Ned', 300]
  ].map(([name, score]) => ({ name, score }));
  const rankOf = s => s >= 7000 ? 'Superhighway Legend' : s >= 4500 ? 'Web Master' : s >= 2500 ? 'Net Surfer' : s >= 1200 ? 'Road Warrior' : 'Newbie';
  const TALK = [
    ['Floppy says: "Pack plenty of snacks. A family of four eats a LOT of snacks on a long download."',
      'A kid by the phone booth says: "A virus checker is way cheaper than a week of cleaning up after a virus."',
      'An old-timer says: "Browsing is slow but relaxing. Speeding gets you there sooner, and crankier."'],
    ['The sysop says: "Please type in lowercase. CAPITAL LETTERS MEAN YOU ARE SHOUTING."',
      'A kid at the junction says: "Packet Catch gets faster the longer you play. Watch out for the red bugs!"',
      'A man with a very long beard says: "Back in my day we had 300 baud, and we liked it!"'],
    ['A settler says: "When somebody gets sick, stop and rest. It works much faster than pushing on."',
      'A web designer proudly shows you her spinning, flashing "Under Construction" sign. She made it herself.',
      'A trader says: "I hear the Y2K River gets shallower if you wait for a patch. Waiting costs snacks, though."'],
    ['Somebody in the canyon shouts "HELLO?" and two hundred voices shout back "HI!"',
      'A friendly moderator reminds you: "Be kind online. There is a real person on the other side of every screen."',
      'A traveler says: "Dot-Com Boomtown prices are sky high. Stock up on snacks before you get there."'],
    ['A man in a shiny suit is selling doorknobs online. He says it is going to be huge.',
      'A woman at the Mega-Mart says: "Keep a little money for the ferry at the Y2K River. It is the safest way across."',
      'Everyone here gives you a free t-shirt. You now have eleven free t-shirts.'],
    ['A ferry worker says: "Deeper than three bugs, I would not drive across. Just my opinion."'],
    ['']
  ];

  /* ---------- palette + pixel font ---------- */
  const PAL = { k: '#000000', w: '#ffffff', r: '#aa0000', R: '#ff5555', y: '#ffff55', o: '#ff9922', g: '#00aa00', G: '#55ff55', b: '#0000aa', B: '#5555ff',
    c: '#00aaaa', C: '#55ffff', n: '#aa5500', N: '#6b3a12', l: '#aaaaaa', d: '#555555', m: '#aa00aa', p: '#ff55ff', f: '#f0b890', e: '#e8dcb0', t: '#c8a060' };
  const FONT = {
    A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111', F: '111100110100100',
    G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111',
    M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100', Q: '010101101110011', R: '110101110101101',
    S: '011100010001110', T: '111010010010010', U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101',
    Y: '101101010010010', Z: '111001010100111', 0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110',
    4: '101101111001001', 5: '111100110001110', 6: '011100111101111', 7: '111001010010010', 8: '111101111101111', 9: '111101111001110',
    '.': '000000000000010', '-': '000000111000000', '!': '010010010000010', '?': '110001010000010', "'": '010010000000000', ':': '000010000010000',
    '/': '001001010100100', '$': '011110010011110', ',': '000000000010100', ')': '010001001001010', '(': '010100100100010', '>': '100010001010100', '<': '001010100010001'
  };
  const SPR = {
    phone: ['............', '..kkkkkkkk..', '.krrrrrrrrk.', 'krrk....krrk', 'kkk.kkkk.kkk', '...krrrrk...', '..krrwwrrk..', '..krwkkwrk..', '..krrwwrrk..', '..kkkkkkkk..'],
    bug: ['..k......k..', '...k....k...', '....kkkk....', 'k..kRRRRk..k', '.kkRkRRkRkk.', '...RRRRRR...', 'kkkRrRRrRkkk', '...RRRRRR...', '.kk.RRRR.kk.', 'k....kk....k'],
    mail: ['kkkkkkkkkkkk', 'kwwwwwwwwwwk', 'kkwwwwwwwwkk', 'kwkwwwwwwkwk', 'kwwkwwwwkwwk', 'kwwwkkkkwwwk', 'kwwwwwwwwwwk', 'kwwwwwwwwwwk', 'kkkkkkkkkkkk'],
    bolt: ['......yyyy.', '.....yyyy..', '....yyyy...', '...yyyy....', '..yyyyyyyy.', '.....yyyy..', '....yyyy...', '...yyy.....', '..yyy......', '.yy........', 'y..........'],
    modem: ['..............', '.kkkkkkkkkkkk.', 'keeeeeeeeeeeek', 'keGeReyeGeeeek', 'keeeeeeeeeeeek', 'kddddddddddddk', '.kkkkkkkkkkkk.'],
    sysop: ['...kkkkkk...', '..kddddddk..', '.kdffffffdk.', 'kCkfkffkfkCk', 'kCkffffffkCk', '.k.fnnnnf.k.', '...nnnnnn...', '....nnnn....', '..BBBBBBBB..', '.BBBBBBBBBB.'],
    granny: ['....llll....', '...llllll...', '..llllllll..', '..lffffffl..', '..kkfkkfkk..', '..fffffff...', '...fpRRpf...', '....ffff....', '..mmmmmmmm..', '.mmmmmmmmmm.'],
    cat: ['k...k.......', 'kk.kk.......', 'kkkkk.......', 'kykyk......k', 'kkkkk.....k.', '.kkkkkkkkk..', '.kkkkkkkkk..', '.k.k...k.k..'],
    dog: ['.nn.........', 'nNNn........', 'nNkNn.......', 'NNNNNk......', '.NNNNNNNNNN.', '..NNNNNNNNN.', '..N.N...N.N.', '..N.N...N.N.'],
    floppy: ['bbbbbbbbb.', 'bbllllbbbb', 'bblldlbbbb', 'bbllllbbbb', 'bbbbbbbbbb', 'bwwwwwwwwb', 'bwkkkkkkwb', 'bwwwwwwwwb', 'bwkkkkkwwb', 'bbbbbbbbbb'],
    arrow: ['....GG......', '....GGG.....', 'GGGGGGGG....', 'GGGGGGGGG...', 'GGGGGGGG....', '....GGG.....', '....GG......'],
    smile: ['..yyyyyy..', '.yyyyyyyy.', 'yykyyyykyy', 'yyyyyyyyyy', 'ykyyyyyyky', 'yykkkkkkyy', '.yyyyyyyy.', '..yyyyyy..'],
    bag: ['...kkkk...', '..kyyyyk..', '.kooooook.', 'koooooooook'.slice(0, 10), 'kooRRRRook', 'kooRyyRook', 'kooRRRRook', 'koooooooook'.slice(0, 10), '.kooooook.', '..kkkkkk..'],
    mouse: ['...k....', '..lll...', '.llllll.', '.lkllll.', '.llllll.', '.llllll.', '..llll..']
  };
  const HAIR = ['n', 'k', 'y', 'o'];

  const ICON = '<svg viewBox="0 0 32 32" shape-rendering="crispEdges" aria-hidden="true"><rect x="0" y="24" width="32" height="6" fill="#555"/><rect x="1" y="26" width="5" height="1" fill="#ff5"/><rect x="12" y="26" width="5" height="1" fill="#ff5"/><rect x="23" y="26" width="5" height="1" fill="#ff5"/><rect x="8" y="3" width="1" height="7" fill="#000"/><rect x="7" y="1" width="3" height="3" fill="#f55"/><rect x="3" y="10" width="23" height="12" fill="#e8dcb0" stroke="#000"/><rect x="26" y="14" width="4" height="8" fill="#e8dcb0" stroke="#000"/><rect x="5" y="12" width="5" height="4" fill="#5ff" stroke="#000"/><rect x="12" y="12" width="5" height="4" fill="#5ff" stroke="#000"/><rect x="19" y="12" width="5" height="4" fill="#5ff" stroke="#000"/><rect x="6" y="18" width="2" height="2" fill="#0a0"/><rect x="10" y="18" width="2" height="2" fill="#a00"/><rect x="14" y="18" width="2" height="2" fill="#fc0"/><rect x="5" y="21" width="5" height="5" fill="#000"/><rect x="20" y="21" width="5" height="5" fill="#000"/><rect x="7" y="23" width="1" height="1" fill="#aaa"/><rect x="22" y="23" width="1" height="1" fill="#aaa"/></svg>';

  (window.RETRO_APPS = window.RETRO_APPS || []).push({
    id: 'trail',
    label: 'The Information Superhighway Trail',
    kind: 'store',
    cat: 'game',
    year: 1995,
    price: 29.95,
    publisher: 'Byteway Learning Co.',
    genre: 'Adventure / Strategy',
    tagline: 'From 1990 to the year 2000. Pack snacks.',
    blurb: 'Lead the Byte family down the Information Superhighway, one megabyte at a time. Stock up at Floppy\'s General Store, survive busy signals, chain letters and computer viruses, play Packet Catch for byte-size snacks, and ford the dreaded Y2K River. Can your family reach the year 2000 with their patience intact?',
    sizeKB: 3400,
    box: { bg: '#0b3d2e', fg: '#ffffff', accent: '#ffd400' },
    icon: ICON,
    window: { w: 680, h: 580 },
    css: `
      .trl{position:absolute;inset:0;display:flex;flex-direction:column;background:#000;color:#fff;font:20px/1.1 var(--dos);user-select:none;-webkit-user-select:none}
      .trl.trl-sm{font-size:18px}
      .trl-scn{flex:none;display:flex;justify-content:center;background:#000;border-bottom:3px solid #0000aa;padding:4px 0}
      .trl-scn canvas{display:block;image-rendering:pixelated;image-rendering:crisp-edges;touch-action:none;cursor:default}
      .trl-txt{flex:1;min-height:0;overflow:auto;padding:6px 12px 10px}
      .trl-h{color:#ffff55;margin:2px 0 6px}
      .trl-p{margin:0 0 8px;white-space:normal}
      .trl-p p{margin:0 0 6px}
      .trl-hi{color:#55ffff}
      .trl-y{color:#ffff55}
      .trl-g{color:#55ff55}
      .trl-r{color:#ff5555}
      .trl-dim{color:#aaaaaa}
      .trl-st{display:grid;grid-template-columns:auto 1fr auto 1fr;gap:0 12px;margin:0 0 8px;padding:4px 8px;border:2px solid #5555ff;background:#0000aa}
      .trl-st span{color:#55ffff}
      .trl-st b{font-weight:400;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .trl-chs{margin-top:4px}
      .trl-ch{display:block;width:100%;text-align:left;background:none;border:0;color:#fff;font:inherit;padding:2px 6px;margin:0;cursor:pointer;border-radius:0}
      .trl-ch b{color:#ffff55;font-weight:400}
      .trl-ch:hover,.trl-ch:focus-visible{background:#0000aa;outline:none}
      .trl-ch:active{background:#5555ff}
      .trl-ch.trl-on{color:#55ff55}
      .trl-cont{margin-top:6px;color:#55ffff;animation:trl-blink 1.2s steps(2) infinite}
      @keyframes trl-blink{50%{color:#00aaaa}}
      .trl-in{display:grid;grid-template-columns:auto 1fr;gap:6px 10px;align-items:center;margin:6px 0 8px;max-width:420px}
      .trl-in input{font:inherit;background:#000;color:#ffff55;border:2px solid #5555ff;padding:1px 6px;min-width:0;width:100%;box-sizing:border-box;border-radius:0}
      .trl-in input:focus{outline:none;border-color:#55ffff}
      .trl-bar{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
      .trl-bar .btn{font:14px var(--ui);color:#000}
      .trl-shop{border:2px solid #aa5500;padding:4px 6px;margin-bottom:6px}
      .trl-row{display:grid;grid-template-columns:1fr auto auto auto auto;gap:6px;align-items:center;padding:2px 4px}
      .trl-row.trl-sel{background:#0000aa}
      .trl-row .btn{min-width:0;padding:0 10px;font:700 16px var(--ui);color:#000;line-height:22px;height:26px}
      .trl-row .btn:active{padding:1px 9px 0 11px}
      .trl-q{min-width:44px;text-align:right;color:#ffff55}
      .trl-have{color:#aaaaaa;font-size:.85em}
      .trl-cost{min-width:62px;text-align:right;color:#55ff55}
      .trl-tt{display:flex;justify-content:space-between;flex-wrap:wrap;gap:0 12px;border-top:1px dashed #aa5500;margin-top:4px;padding-top:4px}
      .trl-top{width:100%;border-collapse:collapse}
      .trl-top td{padding:0 6px}
      .trl-top td:first-child{color:#aaaaaa;width:2em;text-align:right}
      .trl-top td:nth-child(3){text-align:right;color:#ffff55}
      .trl-top td:last-child{color:#55ffff}
      .trl-top tr.trl-me td{background:#aa00aa;color:#fff}
      .trl-sm .trl-st{grid-template-columns:auto 1fr}
      .trl-sm .trl-row{grid-template-columns:1fr auto auto auto;}
      .trl-sm .trl-row .trl-cost{display:none}
    `,
    open(W, api) {
      const esc = api.esc;
      let S = api.load('trip', null);
      if (S && (!S.fam || !S.sup)) S = null;
      let sound = api.load('sound', true);
      let top = api.load('top', null);
      if (!Array.isArray(top) || !top.length) top = DEFAULT_TOP.slice();
      let LW = 320, LH = 150, big = false;
      let cur = { name: 'title', opt: {} };
      let curChoices = [], curCont = null, anyKey = null, extraKey = null;
      let raf = 0, travelTimer = 0, dead = false, G = null;
      let seed = 1, lastTrip = null;

      W.body.innerHTML = '<div class="trl"><div class="trl-scn"><canvas width="320" height="150"></canvas></div><div class="trl-txt" aria-live="polite"></div></div>';
      const root = W.body.firstChild, cv = root.querySelector('canvas'), ctx = cv.getContext('2d'), txtEl = root.querySelector('.trl-txt'), scn = root.querySelector('.trl-scn');

      /* ---------- sound ---------- */
      const tone = (f, d = 0.08, o = {}) => { if (sound) api.tone(f, d, Object.assign({ type: 'square', vol: 0.05 }, o)); };
      const sfx = n => { if (sound && api.sfx[n]) api.sfx[n](); };
      const jingle = (notes, type = 'square') => { if (sound) notes.forEach(([n, at, d]) => api.tone(api.midi(n), d || 0.14, { type, vol: 0.05, at })); };
      const J_GOOD = [[72, 0], [76, 0.1], [79, 0.2], [84, 0.3, 0.3]];
      const J_BAD = [[67, 0], [63, 0.14], [60, 0.28, 0.35]];
      const J_WIN = [[60, 0], [64, 0.15], [67, 0.3], [72, 0.45], [67, 0.6], [72, 0.75], [76, 0.9], [79, 1.05, 0.6]];

      /* ---------- helpers ---------- */
      const rnd = (a, b) => a + Math.random() * (b - a);
      const irnd = (a, b) => Math.floor(rnd(a, b + 1));
      const chance = p => Math.random() < p;
      const pick = a => a[Math.floor(Math.random() * a.length)];
      const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
      const money = v => '$' + v.toFixed(2);
      const here = () => S.fam.filter(m => !m.gone);
      const nm = m => '<span class="trl-hi">' + esc(m.name) + '</span>';
      const patWord = p => p >= 70 ? 'Good' : p >= 45 ? 'Fair' : p >= 20 ? 'Poor' : 'Very poor';
      const patCls = p => p >= 70 ? 'trl-g' : p >= 45 ? 'trl-y' : 'trl-r';
      const avgPat = () => { const h = here(); return h.length ? h.reduce((a, m) => a + m.p, 0) / h.length : 0; };
      function yearAt(mb) {
        for (let i = 1; i < LM.length; i++) if (mb <= LM[i].mb) { const a = LM[i - 1], b = LM[i]; return a.year + (b.year - a.year) * (mb - a.mb) / (b.mb - a.mb); }
        return 2000;
      }
      function dateStr(mb = S.mb) {
        const y = yearAt(mb); if (y >= 2000) return 'January 1, 2000';
        const Y = Math.floor(y), M = Math.min(11, Math.floor((y - Y) * 12));
        return MONTHS[M] + ' ' + Y;
      }
      const save = () => { if (S) api.save('trip', S); };

      /* ---------- canvas drawing ---------- */
      function R(x, y, w, h, c) { ctx.fillStyle = PAL[c] || c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
      function spr(rows, x, y, s = 1) {
        for (let j = 0; j < rows.length; j++) for (let i = 0; i < rows[j].length; i++) { const ch = rows[j][i]; if (ch !== '.') R(x + i * s, y + j * s, s, s, ch); }
      }
      const tw = (str, s = 1) => str.length * 4 * s - s;
      function txt(str, x, y, c, s = 1, center, shadow) {
        str = String(str).toUpperCase();
        if (center) x = Math.round(x - tw(str, s) / 2);
        if (shadow) txt(str, x + s, y + s, shadow, s);
        for (let k = 0; k < str.length; k++) {
          const g = FONT[str[k]];
          if (g) for (let b = 0; b < 15; b++) if (g[b] === '1') R(x + k * 4 * s + (b % 3) * s, y + Math.floor(b / 3) * s, s, s, c);
        }
      }
      function srand(n) { seed = n; }
      function sr() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
      function bands(cols, y0, y1) { const h = (y1 - y0) / cols.length; cols.forEach((c, i) => R(0, y0 + i * h, LW, h + 1, c)); }
      function stars(t, n = 40, maxY = 80) {
        srand(7);
        for (let i = 0; i < n; i++) { const x = sr() * LW, y = sr() * maxY, tw2 = Math.sin(t / 400 + i) > 0.6; R(x, y, 1, 1, tw2 ? 'w' : 'l'); }
      }
      function person(x, y, shirt, hair, t = 0, wave) {
        R(x + 1, y, 4, 1, hair); R(x + 1, y + 1, 4, 3, 'f'); R(x + 2, y + 2, 1, 1, 'k'); R(x + 4, y + 2, 1, 1, 'k');
        R(x, y + 4, 6, 6, shirt); R(x + 1, y + 10, 1, 4, 'b'); R(x + 4, y + 10, 1, 4, 'b');
        if (wave) { const up = Math.floor(t / 250) % 2; R(x + 6, y + (up ? 1 : 4), 1, 4, 'f'); }
      }
      function van(x, y, t, moving) {
        const bob = moving ? Math.floor(t / 110) % 2 : 0; y += bob;
        // antenna
        R(x + 10, y - 9, 1, 13, 'd'); R(x + 9, y - 11, 3, 3, Math.floor(t / 300) % 2 ? 'R' : 'r');
        R(x + 2, y + 3, 56, 2, 'e'); R(x, y + 5, 60, 20, 'e'); R(x + 60, y + 11, 8, 14, 'e');
        R(x + 60, y + 8, 5, 3, 'e'); R(x + 61, y + 9, 5, 5, 'C'); R(x + 65, y + 12, 3, 2, 'C');
        R(x, y + 24, 68, 1, 'd'); R(x - 1, y + 5, 1, 20, 'k'); R(x + 68, y + 11, 1, 14, 'k'); R(x + 2, y + 2, 56, 1, 'k');
        // windows with family
        for (let i = 0; i < 4; i++) {
          const wx = x + 4 + i * 14; R(wx, y + 8, 11, 8, 'C'); R(wx, y + 8, 11, 1, 'k');
          const F = S || lastTrip, m = F && F.fam && F.fam[i];
          if (m && !m.gone) { R(wx + 3, y + 10, 5, 1, HAIR[i]); R(wx + 3, y + 11, 5, 4, 'f'); R(wx + 4, y + 12, 1, 1, 'k'); R(wx + 6, y + 12, 1, 1, 'k'); if (m.ill) R(wx + 4, y + 14, 3, 1, 'g'); }
        }
        R(x, y + 18, 60, 1, 'd');
        txt('MODEM-MOBILE', x + 6, y + 19, 'b');
        const ledOn = Math.floor(t / 180);
        ['G', 'R', 'y', 'G'].forEach((c, i) => R(x + 54 + (i % 2) * 3, y + 6 + Math.floor(i / 2) * 3, 2, 2, (ledOn + i) % 3 ? c : 'd'));
        // wheels
        [x + 8, x + 48].forEach(wx => {
          R(wx, y + 22, 10, 10, 'k'); R(wx + 1, y + 21, 8, 12, 'k'); R(wx + 3, y + 25, 4, 4, 'l');
          const a = moving ? Math.floor(t / 70) % 4 : 0; const sp = [[4, 22], [8, 26], [5, 30], [1, 26]][a]; R(wx + sp[0], y + sp[1], 1, 1, 'd');
        });
      }
      function sign(x, y, w, label, bg = 'g', fg = 'w') {
        R(x + Math.floor(w / 2) - 1, y + 9, 2, 16, 'N'); R(x, y, w, 10, 'k'); R(x + 1, y + 1, w - 2, 8, bg); txt(label, x + w / 2, y + 3, fg, 1, true);
      }
      function road(off, y0 = 112) {
        R(0, y0, LW, 26, 'd'); R(0, y0, LW, 1, 'l'); R(0, y0 + 25, LW, 1, 'l');
        for (let x = -((off) % 22); x < LW; x += 22) R(x, y0 + 12, 12, 2, 'y');
      }
      function hills(off, base, amp, col, f1, f2) {
        for (let x = 0; x < LW; x += 2) { const h = base - amp * (Math.sin((x + off) / f1) * 0.6 + Math.sin((x + off) / f2) * 0.4); R(x, h, 2, 112 - h, col); }
      }
      function skyFor(p) {
        if (p < 0.2) return ['#3050c8', '#4068e0', '#5580f0', '#70a0ff'];
        if (p < 0.45) return ['#2848b0', '#4870e0', '#78a8ff', '#b0d0ff'];
        if (p < 0.65) return ['#b05020', '#e07830', '#ffa040', '#ffd080'];
        if (p < 0.85) return ['#2070c0', '#3c90e0', '#60b0ff', '#c0e8ff'];
        return ['#201848', '#382870', '#58409a', '#8060c0'];
      }
      function travelScene(t, o) {
        const p = S ? S.mb / TOTAL : 0;
        const off = o.moving ? t * 0.06 : (S ? S.mb * 3 : 0);
        bands(skyFor(p), 0, 96);
        if (p >= 0.85) stars(t, 30, 60); else { R(262, 14, 14, 14, 'y'); R(264, 12, 10, 18, 'y'); R(260, 16, 18, 10, 'y'); }
        // clouds
        for (let i = 0; i < 4; i++) { const cx = ((i * 97 - off * 0.1) % 400 + 400) % 400 - 40; R(cx, 18 + i * 9 % 25, 26, 5, 'w'); R(cx + 5, 15 + i * 9 % 25, 14, 3, 'w'); }
        hills(off * 0.2, 80, 12, '#2a7a3a', 31, 13);
        // skyline grows as the years go by
        if (p > 0.45) { srand(3); for (let i = 0; i < 12; i++) { const bx = ((i * 31 - off * 0.3) % 380 + 380) % 380 - 30, bh = 8 + sr() * 26 * Math.min(1, (p - 0.4) * 2); R(bx, 94 - bh, 12, bh, '#5a6a8a'); R(bx + 3, 96 - bh, 2, 2, 'y'); } }
        hills(off * 0.45, 98, 6, '#1f9a3f', 19, 7);
        R(0, 96, LW, 54, '#189038');
        // circuit traces in the grass
        for (let i = 0; i < 18; i++) { const cx = ((i * 41 - off * 0.8) % 740 + 740) % 740 - 20; R(cx, 102 + (i % 3) * 3, 16, 1, 'G'); R(cx + 16, 102 + (i % 3) * 3, 2, 2, 'y'); }
        road(off);
        for (let i = 0; i < 6; i++) { const cx = ((i * 38 - off) % 228 + 228) % 228 - 10; R(cx, 142 + (i % 2) * 4, 18, 1, 'G'); R(cx + 18, 141 + (i % 2) * 4, 3, 3, 'G'); }
        // telephone poles and wires
        const poles = [];
        for (let i = 0; i < 5; i++) { const px = ((i * 90 - off * 0.9) % 450 + 450) % 450 - 30; poles.push(px); R(px, 70, 3, 42, 'N'); R(px - 6, 73, 15, 2, 'N'); R(px - 6, 72, 2, 1, 'l'); R(px + 7, 72, 2, 1, 'l'); }
        poles.sort((a, b) => a - b);
        for (let i = 0; i < poles.length - 1; i++) { const a = poles[i], b = poles[i + 1]; if (b - a > 120) continue; for (let x = a; x < b; x += 2) { const s = Math.sin(Math.PI * (x - a) / (b - a)) * 5; R(x - 5, 72 + s, 2, 1, 'k'); R(x + 8, 72 + s, 2, 1, 'k'); } }
        // mile marker
        if (S) { const mx = ((500 - off * 1) % 600 + 600) % 600 - 50; sign(mx, 88, 30, Math.floor(S.mb / 100) * 100 + 'MB', 'g'); }
        van(112, 96, t, o.moving);
        if (o.moving) for (let i = 0; i < 3; i++) R(104 - i * 7 - (Math.floor(t / 80) + i) % 4, 124 + i, 4, 1, 'l');
        if (o.storm || (S && S.signal === 'Static' && o.moving)) {
          ctx.fillStyle = 'rgba(0,0,40,.35)'; ctx.fillRect(0, 0, LW, LH);
          for (let i = 0; i < 60; i++) { const rx = (i * 53 + t * 0.35) % LW, ry = (i * 29 + t * 0.5) % LH; R(rx, ry, 1, 4, 'B'); }
          if (o.storm && Math.floor(t / 90) % 23 === 0) { ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(0, 0, LW, LH); }
        }
      }
      function eventScene(t, o) {
        travelScene(t, { storm: o.spr === 'bolt' });
        const sp = SPR[o.spr] || SPR.smile, s = 4, w = sp[0].length * s, h = sp.length * s;
        const bx = Math.round(LW / 2 - w / 2 - 8), by = Math.round(58 - h / 2 - 8) - 6;
        R(bx - 2, by - 2, w + 20, h + 20, 'k'); R(bx, by, w + 16, h + 16, 'w'); R(bx + 2, by + 2, w + 12, h + 12, o.bg || 'b');
        const jig = o.spr === 'phone' || o.spr === 'bug' ? (Math.floor(t / 90) % 2) : 0;
        spr(sp, bx + 8 + jig, by + 8, s);
        if (o.word) txt(o.word, LW / 2, by + h + 22, 'y', 2, true, 'k');
      }
      function depotScene(t) {
        bands(['#3050c8', '#4068e0', '#5580f0', '#70a0ff'], 0, 96);
        R(262, 14, 14, 14, 'y');
        hills(0, 82, 10, '#2a7a3a', 31, 13);
        R(0, 96, LW, 54, '#189038'); road(0);
        // depot building
        R(30, 44, 120, 58, 't'); R(26, 40, 128, 6, 'N'); R(40, 50, 100, 12, 'b'); txt('DIAL-UP DEPOT', 90, 54, 'y', 1, true);
        R(50, 70, 20, 32, 'N'); R(58, 84, 2, 2, 'y'); R(84, 70, 44, 18, 'C'); R(84, 70, 44, 1, 'k'); R(105, 70, 1, 18, 'k');
        // phone booth
        R(170, 58, 22, 46, 'b'); R(173, 62, 16, 30, 'C'); txt('TEL', 181, 52, 'w', 1, true); R(178, 72, 6, 10, 'k');
        // store
        R(210, 50, 96, 52, 'n'); R(206, 46, 104, 6, 'N'); R(214, 56, 88, 10, 'y'); txt("FLOPPY'S", 258, 59, 'r', 1, true);
        R(218, 72, 28, 20, 'C'); R(268, 72, 22, 30, 'N'); spr(SPR.floppy, 225, 76, 1);
        van(112, 96, t, false);
      }
      function storeScene(t, o) {
        R(0, 0, LW, 150, 'N'); R(0, 118, LW, 32, 'n');
        for (let x = 0; x < LW; x += 16) for (let y = 118; y < 150; y += 8) if (((x / 16) + (y / 8)) % 2 === 0) R(x, y, 16, 8, 't');
        R(70, 4, 180, 16, 'k'); R(72, 6, 176, 12, 'b'); txt(o.name || 'STORE', 160, 9, 'y', 1, true);
        srand(11);
        const boxC = ['R', 'B', 'y', 'G', 'p', 'C', 'o', 'w'];
        [[8, 26], [8, 52], [8, 78], [214, 26], [214, 52], [214, 78]].forEach(([sx, sy]) => {
          R(sx, sy + 18, 98, 3, 't');
          for (let x = sx + 2; x < sx + 94;) { const w = 6 + Math.floor(sr() * 8), h = 10 + Math.floor(sr() * 8); R(x, sy + 18 - h, w, h, boxC[Math.floor(sr() * 8)]); R(x, sy + 18 - h, w, 1, 'k'); x += w + 1; }
        });
        // shopkeeper Floppy
        const blink = Math.floor(t / 1800) % 6 === 0;
        const kx = 150; R(kx, 52, 20, 5, 'd'); R(kx - 1, 55, 22, 3, 'd'); R(kx + 1, 56, 18, 18, 'f');
        R(kx + 4, 62, 5, 3, 'k'); R(kx + 11, 62, 5, 3, 'k'); R(kx + 8, 63, 3, 1, 'k'); if (!blink) { R(kx + 5, 63, 3, 1, 'C'); R(kx + 12, 63, 3, 1, 'C'); }
        R(kx + 7, 69, 6, 1, 'r'); R(kx + 6, 68, 1, 1, 'r'); R(kx + 13, 68, 1, 1, 'r');
        R(kx - 6, 74, 32, 22, 'r'); R(kx + 2, 76, 16, 20, 'w'); spr(SPR.floppy, kx + 5, 80, 1);
        const wave = Math.floor(t / 300) % 2; R(kx + 26, wave ? 62 : 66, 4, 12, 'f');
        R(40, 96, 240, 24, 't'); R(40, 96, 240, 3, 'e'); R(40, 119, 240, 1, 'k');
        // register and computer
        R(60, 80, 30, 16, 'l'); R(64, 83, 22, 5, 'g'); txt('$' + (S ? Math.floor(S.money) : 0), 75, 83, 'G', 1, true);
        R(226, 70, 34, 26, 'e'); R(230, 74, 26, 17, 'b'); for (let i = 0; i < 3; i++) R(233, 77 + i * 4, 8 + ((Math.floor(t / 400) + i) % 3) * 5, 2, 'C'); R(236, 96, 14, 2, 'e');
      }
      function bbsScene(t) {
        bands(['#281860', '#482878', '#784898', '#b870a0'], 0, 96);
        stars(t, 20, 40);
        R(0, 96, LW, 54, '#207040');
        R(0, 112, LW, 26, 'd'); R(140, 96, 40, 16, 'd'); R(150, 96, 20, 16, 'd');
        for (let x = 0; x < LW; x += 22) R(x, 124, 12, 2, 'y');
        // giant monitor building
        R(80, 16, 160, 84, 'e'); R(76, 12, 168, 4, 'l'); R(90, 24, 140, 62, 'k');
        const lines = ['WELCOME TO BBS JUNCTION', 'SYSOP IS IN. PAGE? Y/N', 'NEW FILES: 42', 'MESSAGES: 1,337', '>'];
        const n = Math.floor(t / 700) % (lines.length + 3);
        lines.forEach((l, i) => { if (i < n) txt(l, 96, 30 + i * 9, 'G'); });
        if (Math.floor(t / 400) % 2) R(96 + (n >= 5 ? 6 : 0), 30 + Math.min(n, 4) * 9 + (n >= 5 ? 0 : 0), 3, 5, 'G');
        R(150, 88, 20, 12, 'l'); R(120, 100, 80, 4, 'l');
        R(214, 90, 3, 2, (Math.floor(t / 250) % 2) ? 'G' : 'g');
        sign(16, 80, 54, 'BBS JCT', 'g'); sign(256, 80, 56, 'WEB ->', 'b');
        van(20, 100, t, false);
      }
      function webScene(t) {
        bands(['#3c78d8', '#5a96f0', '#80b8ff', '#b8dcff'], 0, 96);
        // giant web
        const cx = 160, cy = 8;
        for (let a = 0; a < 9; a++) { const ang = Math.PI * (a / 8); for (let r = 4; r < 70; r += 2) R(cx + Math.cos(ang) * r * 2, cy + Math.sin(ang) * r, 1, 1, 'w'); }
        for (let r = 12; r < 70; r += 12) for (let a = 0; a <= 64; a++) { const ang = Math.PI * a / 64; R(cx + Math.cos(ang) * r * 2, cy + Math.sin(ang) * r, 1, 1, 'l'); }
        R(0, 96, LW, 54, '#b89050'); R(0, 112, LW, 26, '#9a7040');
        const fronts = [[14, 'HOME PAGE', 'r'], [96, 'LINKS', 'b'], [180, 'GUESTBOOK', 'g']];
        fronts.forEach(([x, label, c]) => { R(x, 50, 70, 50, 'n'); R(x + 4, 42, 62, 12, 'N'); txt(label, x + 35, 46, 'y', 1, true); R(x + 8, 62, 18, 14, 'C'); R(x + 42, 62, 18, 14, 'C'); R(x + 28, 72, 14, 28, 'N'); R(x, 98, 70, 2, c); });
        // under construction sign
        R(262, 58, 50, 24, 'k'); for (let i = 0; i < 12; i++) R(264 + i * 4, 60, 2, 4, 'y');
        R(264, 64, 46, 16, 'y'); txt('UNDER', 287, 66, 'k', 1, true); txt('CONSTRUCTION', 287, 73, 'k', 1, true);
        if (Math.floor(t / 300) % 2) R(262, 54, 50, 3, 'o');
        R(270, 82, 2, 22, 'N'); R(302, 82, 2, 22, 'N');
        // hit counter
        R(100, 20, 44, 12, 'k'); txt(String(10000 + Math.floor(t / 200) % 90000).slice(1), 122, 24, 'G', 1, true);
        van(118, 102, t, false);
      }
      function chatScene(t) {
        bands(['#d86020', '#f08030', '#ffa850', '#ffd090'], 0, 96);
        R(0, 96, LW, 54, '#c07038');
        srand(21);
        for (let y = 0; y < 150; y += 3) { const l = 70 + Math.sin(y / 11) * 12 + sr() * 6, r = 250 - Math.sin(y / 13) * 12 - sr() * 6; R(0, y, l, 3, y > 100 ? '#8a4020' : '#a85028'); R(r, y, LW - r, 3, y > 100 ? '#8a4020' : '#a85028'); }
        R(96, 118, 128, 32, '#d09050');
        const words = ['HI!', 'HELLO?', 'LOL', 'BRB', ':)', 'HI!', 'ANYONE?', 'HI!'];
        words.forEach((wd, i) => {
          const period = 5000, ph = ((t + i * 700) % period) / period, x = 80 + (i * 37) % 150, y = 110 - ph * 110;
          const w = tw(wd) + 6; R(x, y, w, 9, 'w'); R(x + 2, y + 9, 2, 2, 'w'); txt(wd, x + 3, y + 2, 'k');
        });
        van(126, 104, t, false);
      }
      function dotcomScene(t) {
        bands(['#ffb020', '#ffc848', '#ffe070', '#fff0b0'], 0, 96);
        srand(5);
        for (let i = 0; i < 11; i++) {
          const bx = i * 30 - 4, bh = 30 + sr() * 60, c = pick2(['#4050a0', '#506070', '#304878', '#6a4a8a'], i);
          R(bx, 96 - bh, 26, bh, c);
          for (let y = 100 - bh; y < 92; y += 6) for (let x = bx + 3; x < bx + 23; x += 6) R(x, y, 3, 3, (Math.floor(t / 900) + x + y) % 7 ? 'y' : 'd');
          if (i % 2 === 0) { R(bx + 1, 88 - bh, 24, 8, 'k'); txt('.COM', bx + 13, 89 - bh, 'y', 1, true); }
        }
        R(0, 96, LW, 54, 'l'); R(0, 112, LW, 26, 'd'); for (let x = 0; x < LW; x += 22) R(x, 124, 12, 2, 'y');
        for (let i = 0; i < 6; i++) { const bx = 20 + i * 52, by = 100 - ((t / 30 + i * 40) % 140); R(bx, by, 7, 9, ['R', 'B', 'G', 'p', 'y', 'C'][i]); R(bx + 3, by + 9, 1, 6, 'k'); }
        for (let i = 0; i < 30; i++) R((i * 47 + t / 20) % LW, (i * 23 + t / 12) % 110, 2, 2, ['R', 'G', 'B', 'y'][i % 4]);
        van(126, 102, t, false);
      }
      function pick2(a, i) { return a[i % a.length]; }
      function riverScene(t, o) {
        bands(['#6878a0', '#8090b8', '#98a8d0', '#b8c8e8'], 0, 60);
        R(0, 40, LW, 22, '#2a7a3a');
        // clock tower on far bank
        R(230, 8, 24, 40, 'l'); R(226, 4, 32, 5, 'd'); R(234, 12, 16, 16, 'w'); R(241, 14, 2, 7, 'k'); R(241, 19, 6, 2, 'k');
        txt('11:59', 242, 32, 'r', 1, true);
        R(0, 62, LW, 54, '#2050c0');
        for (let i = 0; i < 40; i++) { const wx = ((i * 37 + t * 0.03 * (1 + i % 3)) % (LW + 20)) - 10, wy = 64 + (i * 13) % 48; R(wx, wy, 8, 1, 'C'); }
        for (let i = 0; i < 6; i++) { const dx = ((i * 61 + t * 0.02) % (LW + 30)) - 15, dy = 70 + (i * 17) % 36; txt('00', dx, dy, 'y'); }
        // ferry
        const fx = 30 + (Math.sin(t / 2200) * 0.5 + 0.5) * 160;
        R(fx, 84, 44, 6, 'n'); R(fx, 90, 44, 2, 'N'); R(fx + 20, 70, 2, 14, 'N'); R(fx + 22, 70, 10, 6, 'R');
        R(0, 116, LW, 34, '#d8c070');
        sign(6, 118, 50, 'Y2K RIVER', 'b');
        if (o && o.depth != null) { const dl = 'DEPTH: ' + o.depth.toFixed(1) + ' BUGS'; txt(dl, LW - 6 - tw(dl), 140, 'k'); }
        van(170, 112, t, false);
      }
      function endScene(t) {
        bands(['#000020', '#000030', '#080840', '#101860'], 0, 150);
        stars(t, 50, 110);
        for (let b = 0; b < 5; b++) {
          const per = 2200, ph = ((t + b * 470) % per) / per, bx = 30 + ((b * 67) % 260), by = 20 + ((b * 29) % 40);
          const col = ['R', 'y', 'G', 'C', 'p'][b];
          if (ph < 0.25) R(bx, 150 - ph / 0.25 * (130 - by), 1, 3, 'y');
          else { const r = (ph - 0.25) * 60; for (let a = 0; a < 16; a++) { const an = a * Math.PI / 8; R(bx + Math.cos(an) * r, by + Math.sin(an) * r + (ph - 0.25) * 10, 2, 2, ph > 0.85 ? 'd' : col); } }
        }
        txt('2000', 162, 46, 'r', 9, true); txt('2000', 160, 44, 'y', 9, true);
        txt('HAPPY NEW YEAR!', 160, 98, 'w', 2, true, 'b');
        R(0, 140, LW, 10, 'd');
        van(126, 110, t, false);
      }
      function parkScene(t, o) {
        bands(['#50a0ff', '#70b8ff', '#90d0ff', '#b0e0ff'], 0, 90);
        R(270, 12, 16, 16, 'y'); R(268, 14, 20, 12, 'y'); R(272, 10, 12, 20, 'y');
        R(0, 90, LW, 60, '#30b040');
        for (let i = 0; i < 40; i++) R((i * 71) % LW, 95 + (i * 37) % 50, 1, 2, '#208030');
        // tree
        R(40, 50, 8, 50, 'N'); for (let y = -22; y <= 22; y++) { const hw = Math.round(Math.sqrt(484 - y * y) * 1.1); R(44 - hw, 38 + y, hw * 2, 1, y % 5 === 0 ? '#1a8a2a' : '#24a034'); } R(30, 30, 4, 4, 'R'); R(52, 40, 4, 4, 'R'); R(38, 48, 4, 4, 'R');
        // flowers
        for (let i = 0; i < 12; i++) { const fx = 80 + (i * 53) % 230, fy = 120 + (i * 17) % 25; R(fx, fy, 3, 3, ['R', 'y', 'p', 'w'][i % 4]); R(fx + 1, fy + 3, 1, 3, 'g'); }
        // kite
        const kx = 210 + Math.sin(t / 700) * 14, ky = 26 + Math.cos(t / 900) * 6;
        R(kx, ky, 8, 8, 'R'); R(kx + 2, ky + 2, 4, 4, 'y');
        for (let i = 0; i < 24; i++) R(kx + 4 - i * (kx - 180) / 24 * 0.9, ky + 8 + i * 3, 1, 1, 'w');
        if (o && o.all) { [[100, 'R', 'n'], [140, 'G', 'k'], [180, 'B', 'y'], [220, 'p', 'o']].forEach(([x, s, h], i) => person(x, 104 + (i % 2) * 6, s, h, t + i * 90, true)); const fr = (t / 12) % 140; R(100 + fr, 96 - Math.sin(fr / 140 * Math.PI) * 18, 6, 2, 'w'); }
        else { person(176, 108, o && o.shirt || 'R', o && o.hair || 'n', t, true); }
        R(84, 94, 60, 14, 'k'); R(86, 96, 56, 10, 'n'); txt('GONE OUTSIDE', 114, 99, 'y', 1, true); R(112, 108, 3, 14, 'N');
      }
      function restScene(t) {
        bands(['#000018', '#000828', '#081038', '#101a48'], 0, 96);
        stars(t, 45, 90);
        R(40, 14, 14, 14, 'w'); R(46, 12, 12, 14, '#000818');
        R(0, 96, LW, 54, '#0c3818'); R(0, 112, LW, 26, '#303030');
        van(126, 96, 0, false);
        ctx.fillStyle = 'rgba(0,0,40,.4)'; ctx.fillRect(126, 90, 70, 40);
        for (let i = 0; i < 3; i++) { const ph = ((t / 1400) + i / 3) % 1; txt('Z', 150 + i * 6 + ph * 10, 88 - ph * 40, ph > 0.8 ? 'd' : 'w', 1 + (i % 2)); }
        // campfire lamp
        R(222, 124, 12, 3, 'N'); const fl = Math.floor(t / 120) % 3; R(225, 116 - fl, 6, 8 + fl, 'o'); R(227, 118, 2, 5, 'y');
      }
      function mapScene(t) {
        R(0, 0, LW, LH, 'b');
        for (let x = 0; x < LW; x += 16) R(x, 0, 1, LH, '#1818c0');
        for (let y = 0; y < LH; y += 16) R(0, y, LW, 1, '#1818c0');
        txt('MAP OF THE INFORMATION SUPERHIGHWAY', 160, 4, 'y', 1, true);
        const pts = LM.map(l => l.map);
        const posAt = mb => { for (let i = 1; i < LM.length; i++) if (mb <= LM[i].mb) { const f = (mb - LM[i - 1].mb) / (LM[i].mb - LM[i - 1].mb); return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f]; } return pts[pts.length - 1]; };
        for (let mb = 0; mb <= TOTAL; mb += 8) { const [x, y] = posAt(mb); R(x, y, 2, 2, S && mb <= S.mb ? 'y' : 'l'); }
        LM.forEach((l, i) => {
          const [x, y] = l.map; R(x - 3, y - 3, 7, 7, 'k'); R(x - 2, y - 2, 5, 5, S && S.mb >= l.mb ? 'G' : 'w');
          const above = i % 2 === 1; txt(l.short, clamp(x, tw(l.short) / 2 + 2, LW - tw(l.short) / 2 - 2), above ? y - 12 : y + 7, 'C', 1, true);
          txt(String(Math.floor(l.year)), clamp(x, 10, LW - 10), above ? y - 19 : y + 14, 'l', 1, true);
        });
        if (S && Math.floor(t / 300) % 2) { const [x, y] = posAt(S.mb); R(x - 4, y - 3, 9, 6, 'e'); R(x - 4, y + 2, 2, 2, 'k'); R(x + 3, y + 2, 2, 2, 'k'); R(x - 2, y - 2, 5, 2, 'C'); }
        txt('YOU ARE HERE: ' + (S ? S.mb : 0) + ' OF ' + TOTAL + ' MB', 160, 140, 'w', 1, true);
      }
      function titleScene(t) {
        R(0, 0, LW, LH, 'k'); stars(t, 60, 70);
        const hy = 76;
        R(0, hy, LW, LH - hy, '#100020');
        for (let i = 0; i < 9; i++) { const z = ((i + (t / 600) % 1) / 9); const y = hy + Math.pow(z, 2.2) * (LH - hy); R(0, y, LW, 1, 'm'); }
        for (let i = -10; i <= 10; i++) { for (let y = hy; y < LH; y += 2) { const f = (y - hy) / (LH - hy); R(160 + i * 6 + i * f * 40, y, 1, 1, 'p'); } }
        for (let y = hy; y < LH; y++) { const f = (y - hy) / (LH - hy); const hw = 6 + f * 70; R(160 - hw, y, 1, 1, 'C'); R(160 + hw, y, 1, 1, 'C'); }
        for (let i = 0; i < 6; i++) { const z = ((i / 6 + (t / 900)) % 1), y = hy + Math.pow(z, 2) * (LH - hy), h = 1 + z * 4; R(158, y, 3, h, 'y'); }
        R(136, hy - 14, 48, 14, '#200040'); for (let i = 0; i < 4; i++) R(138, hy - 12 + i * 3, 44, 2, i % 2 ? 'p' : 'o');
        txt('THE INFORMATION', 160, 8, 'C', 2, true, 'b');
        txt('SUPERHIGHWAY', 160, 24, 'y', 3, true, 'r');
        txt('TRAIL', 160, 44, 'y', 3, true, 'r');
        txt('1990 - 2000', 160, 55, 'w', 1, true);
        van(126, 108, t, true);
      }
      function catchScene(t) {
        const g = G; if (!g) return;
        bands(['#000030', '#000048', '#081060', '#102080'], 0, LH);
        for (let i = 0; i < 24; i++) { const x = (i * 37) % LW, y = (i * 53 + t / 20) % LH; txt(i % 2 ? '1' : '0', x, y, '#1c2c90'); }
        g.items.forEach(it => {
          if (it.kind === 'virus') spr(SPR.bug, it.x - 6, it.y - 5, 1);
          else { const c = it.kind === 'gold' ? 'y' : 'G'; R(it.x - 4, it.y - 4, 9, 9, 'k'); R(it.x - 3, it.y - 3, 7, 7, c); R(it.x - 1, it.y - 1, 1, 3, 'k'); R(it.x + 1, it.y - 1, 1, 3, 'k'); R(it.x + 2, it.y - 1, 1, 1, 'k'); }
        });
        g.pops.forEach(p => txt(p.s, p.x, p.y, p.c, 1, true));
        const bx = Math.round(g.x), by = LH - 20;
        const bc = g.sick > 0 ? 'R' : 'l';
        R(bx - 15, by, 30, 3, 'w'); R(bx - 14, by + 3, 28, 10, bc); R(bx - 12, by + 13, 24, 3, bc); R(bx - 14, by + 6, 28, 1, 'd');
        txt('CACHE', bx, by + 8, 'b', 1, true);
        R(0, 0, LW, 11, 'k'); txt('PACKETS ' + g.caught, 4, 3, 'G'); txt('TIME ' + Math.max(0, Math.ceil(g.left)), LW - 4 - tw('TIME ' + Math.max(0, Math.ceil(g.left))), 3, 'y');
        if (g.flash > 0) { ctx.fillStyle = 'rgba(255,0,0,' + (g.flash * 0.5) + ')'; ctx.fillRect(0, 0, LW, LH); }
        if (!g.running && !g.done) { R(20, 60, LW - 40, 44, 'k'); R(22, 62, LW - 44, 40, 'b'); txt('PACKET CATCH', LW / 2, 68, 'y', 2, true); txt(g.paused ? 'PAUSED: TAP TO GO ON' : 'TAP OR PRESS SPACE', LW / 2, 86, 'w', 1, true); }
      }
      const SCENES = { title: titleScene, travel: travelScene, event: eventScene, depot: depotScene, store: storeScene, bbs: bbsScene, web: webScene, chat: chatScene, dotcom: dotcomScene, river: riverScene, end: endScene, park: parkScene, rest: restScene, map: mapScene, catch: catchScene };

      let lastTs = 0;
      function loop(ts) {
        raf = requestAnimationFrame(loop);
        if (W.el && W.el.classList.contains('min')) { lastTs = ts; return; }
        const dt = Math.min(0.05, (ts - (lastTs || ts)) / 1000); lastTs = ts;
        if (cur.name === 'catch') updateCatch(dt);
        try { (SCENES[cur.name] || travelScene)(ts, cur.opt || {}); } catch (e) { console.error(e); cancelAnimationFrame(raf); }
      }
      function setCanvas(w, h) { if (LW !== w || LH !== h) { LW = w; LH = h; cv.width = w; cv.height = h; } fit(); }
      function fit() {
        const bw = W.body.clientWidth, bh = W.body.clientHeight;
        if (!bw || !bh) return;
        root.classList.toggle('trl-sm', bw < 440);
        const maxH = bh * (big ? 0.7 : bw < 440 ? 0.33 : 0.36), aspect = LW / LH;
        let w = Math.min(bw - 8, maxH * aspect);
        const k = w / LW; if (k >= 2) w = Math.floor(k) * LW; // crisp integer scale when there is room
        cv.style.width = Math.floor(w) + 'px'; cv.style.height = Math.floor(w / aspect) + 'px';
      }
      W.onResize = fit;

      /* ---------- screens ---------- */
      function show(o) {
        anyKey = null; extraKey = null;
        big = !!o.big;
        if (o.art === 'catch') setCanvas(240, 180); else setCanvas(320, 150);
        cur = { name: o.art || 'travel', opt: o.opt || {} };
        curChoices = o.choices || []; curCont = o.cont || null;
        let h = '';
        if (o.title) h += '<div class="trl-h">' + o.title + '</div>';
        if (o.html) h += '<div class="trl-p">' + o.html + '</div>';
        if (curChoices.length) {
          h += '<div class="trl-chs">' + curChoices.map((c, i) => '<button class="trl-ch' + (c.on ? ' trl-on' : '') + '" data-i="' + i + '"><b>' + keyName(c.key || keyFor(i)) + '.</b> ' + c.label + '</button>').join('') + '</div>';
        }
        if (curCont) h += '<button class="trl-ch trl-cont" data-c="1">' + (o.contLabel || (coarse ? 'Tap here to continue' : 'Press ENTER to continue')) + '</button>';
        txtEl.innerHTML = h; txtEl.scrollTop = 0;
        if (o.after) o.after(txtEl);
      }
      const coarse = !!(window.matchMedia && matchMedia('(pointer:coarse)').matches);
      const keyName = k => k === ' ' ? 'SPACE' : k === 'Escape' ? 'ESC' : k.length > 1 ? k.toUpperCase() : k;
      const keyFor = i => i === 9 ? '0' : String(i + 1);
      txtEl.addEventListener('click', e => {
        const b = e.target.closest('[data-i],[data-c]'); if (!b || !txtEl.contains(b)) return;
        sfx('click');
        if (b.dataset.c) { const f = curCont; if (f) f(); }
        else { const c = curChoices[+b.dataset.i]; if (c && !c.disabled) c.fn(); }
      });
      W.onKey = e => {
        if (dead) return;
        const tag = e.target && e.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        if (anyKey) { e.preventDefault(); anyKey(); return; }
        if (extraKey && extraKey(e)) { e.preventDefault(); return; }
        const k = e.key;
        const idx = curChoices.findIndex((c, i) => (c.key || keyFor(i)).toLowerCase() === k.toLowerCase());
        if (idx >= 0 && !curChoices[idx].disabled) { e.preventDefault(); sfx('key'); curChoices[idx].fn(); return; }
        if ((k === 'Enter' || k === ' ') && curCont) { e.preventDefault(); sfx('key'); curCont(); }
      };
      cv.addEventListener('pointerdown', e => {
        if (cur.name === 'catch') { catchPointer(e); return; }
        if (anyKey) { anyKey(); return; }
        if (curCont) curCont();
      });
      cv.addEventListener('pointermove', e => { if (cur.name === 'catch' && G && (e.buttons || e.pointerType === 'mouse')) catchMove(e); });

      function statusHtml() {
        const nx = LM[S.next];
        const rows = [['Date', dateStr()], ['Signal', S.signal || 'Clear'], ['Patience', '<span class="' + patCls(avgPat()) + '">' + patWord(avgPat()) + '</span>'], ['Snacks', S.sup.snacks + ' packs'],
          ['Next stop', nx && nx.mb > S.mb ? esc(nx.name) : '-'], ['To go', nx && nx.mb > S.mb ? (nx.mb - S.mb) + ' MB' : '-'], ['Traveled', S.mb + ' MB'], ['Money', money(S.money)]];
        return '<div class="trl-st">' + rows.map(r => '<span>' + r[0] + ':</span><b>' + r[1] + '</b>').join('') + '</div>';
      }

      // A list of screens to show one after another, then call `after`.
      function runList(list, after) {
        const step = () => {
          save();
          if (!list.length) { if (S && !here().length) return gameOver(); return after(); }
          const s = list.shift();
          if (s.sound) s.sound();
          if (s.choices) { s.choices = s.choices.map(c => Object.assign({}, c, { fn: () => c.fn(step) })); show(s); }
          else show(Object.assign({}, s, { cont: step }));
        };
        step();
      }

      /* ---------- title + help ---------- */
      function title() {
        stopTravel();
        const ch = [];
        if (S) ch.push({ label: 'Resume your trip <span class="trl-dim">(' + esc(S.fam[0].name) + ' Byte, ' + dateStr() + ')</span>', fn: resume });
        ch.push({ label: 'Travel the Superhighway (new trip)', fn: () => S ? api.msgBox('New trip', 'Start a new trip? Your trip in progress will be lost.', ['Yes', 'No'], 'warn').then(r => { if (r === 'Yes') newTrip(); }) : newTrip() });
        ch.push({ label: 'Learn about the Superhighway', fn: () => help(title) });
        ch.push({ label: 'See the Top Ten', fn: () => topTen(title) });
        ch.push({ label: 'Turn sound ' + (sound ? 'off' : 'on'), fn: () => { sound = !sound; api.save('sound', sound); title(); } });
        show({ art: 'title', html: '<p>It is 1990. Everybody says there is an <span class="trl-y">Information Superhighway</span> coming, and it leads all the way to the year 2000. The Byte family is ready to hit the road.</p><p class="trl-dim">You may:</p>', choices: ch });
        jingle([[60, 0], [67, 0.12], [72, 0.24, 0.3]], 'triangle');
      }
      function help(back) {
        const pages = [
          ['The trip', 'You lead the Byte family, four brave home-computer users, from <span class="trl-y">1990 to the year 2000</span>. The Information Superhighway is 2,000 megabytes long. Every day on the road you travel some megabytes, and the calendar rolls forward.'],
          ['Supplies', 'Buy supplies at Floppy\'s General Store before you go. <span class="trl-hi">Snack packs</span> keep everybody happy. <span class="trl-hi">Spare modems</span> and <span class="trl-hi">phone lines</span> replace broken ones. <span class="trl-hi">Floppy disks</span> fix lost files. <span class="trl-hi">Pep talks</span> cheer up the whole family. <span class="trl-hi">Virus checkers</span> stop computer viruses.'],
          ['Patience', 'Each family member has <span class="trl-y">patience</span>. Fast pace, skimpy snacks and ailments like Screen Squint or Modem Rage wear it down. Resting, good snacks and pep talks bring it back. When somebody runs out of patience, they log off and go outside to play. If everybody logs off, the trip is over.'],
          ['Packet Catch', 'Running low on snacks? Play <span class="trl-y">Packet Catch</span>. Move your cache bucket to catch falling data packets (green, gold ones are worth more) and dodge the red viruses. Each packet turns into two byte-size snack packs. It takes one day.'],
          ['Keys and scoring', 'Press the number next to a choice, or click or tap it. Press ENTER or tap to continue. While traveling, press any key to stop and size up the situation.<br><br>Your score counts the family members who make it, their patience, and leftover supplies. Paperboys earn triple points, Teachers double. Your trip is saved every day, so you can close the window and come back.']
        ];
        let i = 0;
        const page = () => show({ art: i === 3 ? 'title' : 'map', title: pages[i][0] + ' <span class="trl-dim">(' + (i + 1) + ' of ' + pages.length + ')</span>', html: pages[i][1], cont: () => { i++; if (i < pages.length) page(); else back(); } });
        page();
      }
      function topTen(back, me) {
        const rows = top.map((r, i) => '<tr' + (me && r === me ? ' class="trl-me"' : '') + '><td>' + (i + 1) + '.</td><td>' + esc(r.name) + '</td><td>' + r.score + '</td><td>' + rankOf(r.score) + '</td></tr>').join('');
        show({ art: 'end', title: 'The Top Ten Superhighway Travelers', html: '<table class="trl-top">' + rows + '</table>', cont: back });
      }

      /* ---------- new trip ---------- */
      function newTrip() {
        stopTravel();
        api.save('trip', null); S = null;
        const pickJob = () => show({ art: 'depot', title: 'Many kinds of people rode the Information Superhighway. You may:', choices: JOBS.map((j, i) => ({ label: 'Be a ' + j.name, fn: () => names(i) })).concat([{ label: 'Find out the differences between these choices', fn: jobHelp }]) });
        const jobHelp = () => show({ art: 'depot', title: 'Choosing a job', html: JOBS.map(j => '<p><span class="trl-y">' + j.name + '</span>: start with ' + money(j.money) + '. ' + j.desc + '</p>').join(''), cont: pickJob });
        pickJob();
      }
      function names(job) {
        const deflt = [];
        const fill = () => { const pool = NAMES.slice(); for (let i = 0; i < 4; i++) deflt[i] = pool.splice(Math.floor(Math.random() * pool.length), 1)[0]; };
        fill();
        const labels = ['Family leader', 'Member 2', 'Member 3', 'Member 4'];
        let ins = [];
        show({
          art: 'depot', title: 'Name the Byte family',
          html: 'Type a first name for each member of the Byte family (or leave a box empty for a surprise).<div class="trl-in">' + labels.map((l, i) => '<label for="trl-n' + i + '">' + l + ':</label><input id="trl-n' + i + '" maxlength="10" autocomplete="off" spellcheck="false" placeholder="' + deflt[i] + '">').join('') + '</div>',
          choices: [{ label: 'These names are fine', fn: () => done() }, { label: 'Pick new surprise names', fn: () => { fill(); ins.forEach((x, i) => { x.placeholder = deflt[i]; }); } }],
          after: el => { ins = [...el.querySelectorAll('input')]; ins.forEach((x, i) => x.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); if (i < 3) ins[i + 1].focus(); else done(); } })); setTimeout(() => { if (matchMedia('(pointer:fine)').matches) ins[0].focus(); }, 30); }
        });
        const done = () => {
          const nms = ins.map((x, i) => (x.value.trim().replace(/\s+/g, ' ') || deflt[i]).slice(0, 10));
          const J = JOBS[job];
          S = { job, money: J.money, mb: 0, day: 0, pace: 1, rations: 1, next: 1, at: 0, signal: 'Clear', slow: 0, crossed: false, depth: null, hungry: false, visitTalk: [0, 0, 0, 0, 0, 0, 0],
            fam: nms.map(n => ({ name: n, p: 100, ill: null, gone: false, cranky: false })),
            sup: { snacks: 0, modems: 0, lines: 0, disks: 0, pep: 0, scan: 0 } };
          save(); sfx('ding');
          show({ art: 'store', opt: { name: "FLOPPY'S GENERAL STORE" }, title: "Floppy's General Store", html: '<p>"Well hello there, ' + nm(S.fam[0]) + '! Off to the year 2000, are you? You have ' + money(S.money) + ' to spend."</p><p>"My advice for a family of four: at least <span class="trl-y">700 snack packs</span>, a couple of <span class="trl-y">spare modems</span> and <span class="trl-y">phone lines</span>, a few boxes of <span class="trl-y">floppy disks</span>, some <span class="trl-y">pep talks</span>, and a <span class="trl-y">virus checker</span> or two. Things get pricier the farther you go!"</p>', cont: () => shop(true, () => { S.at = 0; arriveScreen(0, true); }) });
        };
      }

      /* ---------- store ---------- */
      function shop(first, done) {
        const lm = LM[S.at], mult = lm.price || 1;
        const cart = Object.fromEntries(ITEMS.map(i => [i.k, 0]));
        let sel = 0;
        const cost = it => Math.round(it.price * mult * 100) / 100;
        const bill = () => ITEMS.reduce((a, it) => a + cart[it.k] * cost(it), 0);
        const adj = (i, d) => {
          const it = ITEMS[i]; sel = i;
          if (d > 0) {
            if (bill() + cost(it) > S.money + 1e-6) { tone(160, 0.12); flashMsg('You can\'t afford any more of that.'); return render(); }
            if (S.sup[it.k] + (cart[it.k] + 1) * it.per > it.max) { tone(160, 0.12); flashMsg('The Modem-Mobile can\'t carry any more of those.'); return render(); }
            cart[it.k]++; tone(880, 0.03);
          } else if (cart[it.k] > 0) { cart[it.k]--; tone(440, 0.03); }
          render();
        };
        let note = '';
        const flashMsg = s => { note = s; };
        const leave = () => {
          const b = bill();
          ITEMS.forEach(it => { S.sup[it.k] += cart[it.k] * it.per; });
          if (first && S.sup.snacks === 0) { ITEMS.forEach(it => { S.sup[it.k] -= cart[it.k] * it.per; }); note = 'Floppy says: "You can\'t leave without any snacks, hon!"'; tone(160, 0.12); return render(); }
          S.money = Math.round((S.money - b) * 100) / 100;
          if (b > 0) sfx('ding');
          save(); done();
        };
        const render = () => {
          const b = bill();
          const rows = ITEMS.map((it, i) => '<div class="trl-row' + (i === sel ? ' trl-sel' : '') + '" data-r="' + i + '"><span><b class="trl-y" style="font-weight:400">' + (i + 1) + '.</b> ' + it.name + ' <span class="trl-have">(' + it.unit + ', have ' + S.sup[it.k] + ')</span></span><button class="btn" data-d="-1" aria-label="Less">-</button><span class="trl-q">' + cart[it.k] * it.per + '</span><button class="btn" data-d="1" aria-label="More">+</button><span class="trl-cost">' + money(cart[it.k] * cost(it)) + '</span></div>').join('');
          show({
            art: 'store', opt: { name: lm.shop.toUpperCase() },
            title: esc(lm.shop) + ' <span class="trl-dim">' + dateStr() + '</span>',
            html: '<div class="trl-shop">' + rows + '<div class="trl-tt"><span>Total bill: <span class="trl-y">' + money(b) + '</span></span><span>Money left: <span class="trl-g">' + money(S.money - b) + '</span></span></div></div>' +
              '<div class="trl-dim">Prices: ' + ITEMS.map(it => it.name.split(' ')[0].replace('Spare', it.k === 'modems' ? 'Modems' : 'Lines') + ' ' + money(cost(it))).join(', ') + '. Press 1-6 to pick an item, then + or - (or tap the buttons).</div>' +
              (note ? '<div class="trl-r">' + note + '</div>' : ''),
            choices: [{ label: 'Pay and leave the store', key: 'Enter', fn: leave }],
            after: el => {
              el.querySelectorAll('[data-d]').forEach(bt => bt.addEventListener('click', e => { e.stopPropagation(); adj(+bt.closest('[data-r]').dataset.r, +bt.dataset.d); }));
              el.querySelectorAll('[data-r]').forEach(r => r.addEventListener('click', () => { sel = +r.dataset.r; render(); }));
              const s = el.querySelector('.trl-sel'); if (s && s.scrollIntoView && sel > 2) s.scrollIntoView({ block: 'nearest' });
            }
          });
          note = '';
          extraKey = e => {
            if (/^[1-6]$/.test(e.key)) { sel = +e.key - 1; render(); return true; }
            if (e.key === '+' || e.key === '=' || e.key === 'ArrowRight') { adj(sel, 1); return true; }
            if (e.key === '-' || e.key === '_' || e.key === 'ArrowLeft') { adj(sel, -1); return true; }
            if (e.key === 'ArrowDown') { sel = (sel + 1) % ITEMS.length; render(); return true; }
            if (e.key === 'ArrowUp') { sel = (sel + ITEMS.length - 1) % ITEMS.length; render(); return true; }
            return false;
          };
        };
        render();
      }

      /* ---------- simulation ---------- */
      function snackNeed() { return here().length * RATIONS[S.rations].eat; }
      function eatDays(n) { S.sup.snacks = Math.max(0, S.sup.snacks - snackNeed() * n); }
      function loseDays(n) { S.day += n; eatDays(n); here().forEach(m => { m.p = clamp(m.p - n, 0, 100); }); }
      function simDay(kind) {
        const lines = [], specs = []; let arrived = false;
        S.day++;
        const sig = Math.random(); S.signal = sig < 0.62 ? 'Clear' : sig < 0.88 ? 'Fuzzy' : 'Static';
        const need = snackNeed(); let hungry = false;
        if (S.sup.snacks >= need) S.sup.snacks -= need; else { S.sup.snacks = 0; hungry = true; }
        if (hungry && !S.hungry) { S.hungry = true; specs.push({ art: 'event', opt: { spr: 'bag', word: 'SNACKS: 0' }, title: 'Out of snacks!', html: 'The snack bag is empty, and tummies are rumbling. Patience will drop fast. Play <span class="trl-y">Packet Catch</span>, trade, or buy snacks at the next store.', sound: () => jingle(J_BAD) }); }
        if (!hungry) S.hungry = false;
        if (kind === 'travel') {
          let d = PACES[S.pace].mb + irnd(-4, 4);
          if (S.signal === 'Fuzzy') d *= 0.9; else if (S.signal === 'Static') d *= 0.75;
          if (S.slow > 0) { d *= 0.5; S.slow--; }
          d = Math.max(1, Math.round(d));
          const nx = LM[S.next].mb; S.mb = Math.min(nx, S.mb + d); if (S.mb >= nx) arrived = true;
        }
        const P = PACES[S.pace], Rt = RATIONS[S.rations];
        here().forEach(m => {
          let dp = kind === 'rest' ? 6.5 : kind === 'travel' ? -P.drain : -0.6;
          dp += Rt.eff; if (m.ill) dp -= 2; if (hungry) dp -= 9;
          m.p = clamp(m.p + dp + rnd(-0.4, 0.4), 0, 100);
          const ic = 0.008 + (kind === 'travel' ? P.ill : 0) + Rt.ill + (m.p < 40 ? 0.025 : 0) + (hungry ? 0.03 : 0) - (kind === 'rest' ? 0.01 : 0);
          if (!m.ill && Math.random() < ic) { m.ill = pick(ILLS); lines.push(nm(m) + ' has come down with a case of <span class="trl-r">' + m.ill + '</span>.'); }
          else if (m.ill && Math.random() < (kind === 'rest' ? 0.5 : 0.14)) { lines.push(nm(m) + ' is all better. No more ' + m.ill + '!'); m.ill = null; }
          if (m.p < 20 && !m.cranky && m.p > 0) { m.cranky = true; lines.push(nm(m) + ' is getting <span class="trl-r">really</span> cranky. Better rest or give a pep talk.'); }
          if (m.p >= 30) m.cranky = false;
        });
        specs.push(...checkLogoffs());
        if (kind === 'travel' && !arrived && Math.random() < 0.24) { const ev = randomEvent(); if (ev) specs.unshift(ev); }
        if (lines.length) specs.unshift({ art: 'event', opt: { spr: 'smile', bg: 'c' }, title: dateStr(), html: lines.join('<br>'), sound: () => tone(520, 0.1) });
        return { specs, arrived };
      }
      function checkLogoffs() {
        const out = [];
        here().forEach((m, _) => {
          if (m.p <= 0) {
            m.gone = true; m.p = 0;
            const i = S.fam.indexOf(m);
            out.push({ art: 'park', opt: { shirt: ['R', 'G', 'B', 'p'][i], hair: HAIR[i] }, title: esc(m.name) + ' has logged off and gone outside', html: '<p>' + nm(m) + ' ran out of patience, switched off the monitor, and went outside to play. See you at home!</p><p>' + nm(m) + ' left a note on the fridge:</p><p class="trl-y">"' + pick(NOTES) + '"</p>', sound: () => jingle([[72, 0], [67, 0.15], [69, 0.3], [72, 0.45, 0.4]], 'triangle') });
          }
        });
        return out;
      }
      function randomMember(pred = () => true) { const h = here().filter(pred); return h.length ? pick(h) : null; }
      function randomEvent() {
        const E = [];
        const add = (w, f) => E.push([w, f]);
        add(10, () => { loseDays(1); return { art: 'event', opt: { spr: 'phone', word: 'BZZT BZZT' }, title: 'Busy signal!', html: 'Every line on this stretch of the Superhighway is busy. You wait a whole day to get through.', sound: () => { tone(480, 0.3, { vol: 0.04 }); tone(620, 0.3, { vol: 0.04, at: 0.5 }); } }; });
        add(8, () => { loseDays(1); S.sup.snacks += 20; return { art: 'event', opt: { spr: 'granny', bg: 'm' }, title: 'Grandma picked up the phone!', html: 'Grandma picked up the phone to call her bridge club and knocked everybody offline. You lose a day. She feels just awful about it and mails you a tin of homemade cookies: <span class="trl-g">+20 snack packs</span>.', sound: () => jingle([[76, 0], [72, 0.12]], 'triangle') }; });
        add(9, () => {
          if (S.sup.scan > 0) { S.sup.scan--; return { art: 'event', opt: { spr: 'bug', bg: 'g', word: 'GOTCHA!' }, title: 'Computer virus!', html: 'A computer virus tried to sneak into your files. Your trusty <span class="trl-y">virus checker</span> caught it just in time. (1 virus checker used.)', sound: () => jingle(J_GOOD) }; }
          loseDays(2); const lost = Math.min(S.sup.disks, 1); S.sup.disks -= lost;
          const m = randomMember(x => !x.ill); if (m) m.ill = 'Popup Fatigue';
          return { art: 'event', opt: { spr: 'bug', bg: 'r', word: 'OH NO!' }, title: 'Computer virus!', html: 'A computer virus got into your files! It plays a silly tune and turns all the text upside down. Cleaning up takes 2 days' + (lost ? ' and a box of floppy disks' : '') + '.' + (m ? ' ' + nm(m) + ' has <span class="trl-r">Popup Fatigue</span> now.' : ''), sound: () => jingle(J_BAD) };
        });
        add(7, () => {
          if (S.sup.modems > 0) { S.sup.modems--; return { art: 'event', opt: { spr: 'bolt', bg: 'k', word: 'ZAP!' }, title: 'Power surge!', html: 'A power surge zapped your modem. Good thing you packed a spare! (1 spare modem used.)', sound: () => sfx('crash') }; }
          loseDays(3); here().forEach(m => { m.p = clamp(m.p - 5, 0, 100); });
          return { art: 'event', opt: { spr: 'bolt', bg: 'k', word: 'ZAP!' }, title: 'Power surge!', html: 'A power surge zapped your modem, and you have no spare. ' + nm(S.fam[0]) + ' fixes it with a paper clip, some tape and a lot of patience. You lose 3 days.', sound: () => sfx('crash') };
        });
        add(8, () => {
          if (chance(0.5)) {
            if (S.sup.lines > 0) { S.sup.lines--; return { art: 'event', opt: { spr: 'bolt', bg: 'b', word: 'KA-BOOM' }, title: 'Thunderstorm!', html: 'A thunderstorm rolls over the Superhighway, and lightning frazzles your phone line. You plug in a spare. (1 spare phone line used.)', sound: () => sfx('boom') }; }
            loseDays(2); return { art: 'event', opt: { spr: 'bolt', bg: 'b', word: 'KA-BOOM' }, title: 'Thunderstorm!', html: 'A thunderstorm rolls over the Superhighway, and lightning frazzles your phone line. You have no spare, so you wait for the phone company. You lose 2 days.', sound: () => sfx('boom') };
          }
          loseDays(1); return { art: 'event', opt: { spr: 'bolt', bg: 'b', word: 'RUMBLE' }, title: 'Thunderstorm!', html: 'A big thunderstorm rolls in. You unplug everything and wait it out, playing board games by flashlight. You lose a day.', sound: () => sfx('boom') };
        });
        add(6, () => ({ art: 'event', opt: { spr: 'mail', word: 'FWD: FWD: FWD:' }, title: 'A chain-letter email arrives!', html: '"Forward this to ten friends in the next ten minutes, or your mouse will get lonely!"', sound: () => sfx('msg'),
          choices: [
            { label: 'Delete it', fn: next => { here().forEach(m => { m.p = clamp(m.p + 4, 0, 100); }); show({ art: 'event', opt: { spr: 'mouse', bg: 'g' }, title: 'Deleted!', html: 'You delete it. Your mouse seems perfectly happy. Everybody feels a little proud. <span class="trl-g">(+4 patience)</span>', cont: next }); } },
            { label: 'Forward it to everyone you know', fn: next => { here().forEach(m => { m.p = clamp(m.p - 5, 0, 100); }); show({ art: 'event', opt: { spr: 'mail', bg: 'r' }, title: 'Forwarded...', html: 'Thirty-eight relatives reply "Please stop." You spend all afternoon saying sorry. <span class="trl-r">(-5 patience)</span>', cont: next }); } }
          ] }));
        add(6, () => ({ art: 'event', opt: { spr: 'floppy', bg: 'm', word: 'FREE HOURS!' }, title: 'A free trial CD in the mailbox!', html: 'A shiny free trial CD showed up in the mailbox, promising "500 FREE HOURS!" What will you do with it?', sound: () => sfx('msg'),
          choices: [
            { label: 'Install it', fn: next => { loseDays(1); show({ art: 'event', opt: { spr: 'floppy', bg: 'r' }, title: 'Installing...', html: 'It installs, then asks you to restart. Nine times. You lose a day. On the bright side, the disc makes a great mirror.', cont: next }); } },
            { label: 'Use it as a drink coaster', fn: next => { here().forEach(m => { m.p = clamp(m.p + 3, 0, 100); }); show({ art: 'event', opt: { spr: 'smile', bg: 'g' }, title: 'Very practical', html: 'Excellent choice. No more rings on the dashboard. <span class="trl-g">(+3 patience)</span>', cont: next }); } },
            { label: 'Hang it from the mirror so it sparkles', fn: next => { here().forEach(m => { m.p = clamp(m.p + 5, 0, 100); }); show({ art: 'event', opt: { spr: 'smile', bg: 'c' }, title: 'So stylish', html: 'It throws little rainbows all over the Modem-Mobile. Everybody loves it. <span class="trl-g">(+5 patience)</span>', cont: next }); } }
          ] }));
        add(7, () => {
          const base = { art: 'event', opt: { spr: 'modem', word: 'KSSHH-ACHOO!' }, title: 'Your modem caught a cold!', sound: () => { if (sound) api.noise(0.5, { ft: 'bandpass', f: 1800, q: 1, vol: 0.06 }); } };
          if (S.sup.modems > 0) return Object.assign(base, { html: 'The modem is making a hoarse KSSHHH-kkk-ACHOO sound. It is running at half speed.', choices: [
            { label: 'Swap in a spare modem', fn: next => { S.sup.modems--; show({ art: 'event', opt: { spr: 'modem', bg: 'g' }, title: 'Good as new', html: 'You swap in a spare modem and tuck the sick one into bed with a warm cloth. (1 spare modem used.)', cont: next }); } },
            { label: 'Let it get better on its own', fn: next => { S.slow = 4; show({ art: 'event', opt: { spr: 'modem', bg: 'c' }, title: 'Get well soon', html: 'You go half speed for a few days while the modem recovers.', cont: next }); } }
          ] });
          S.slow = 4; return Object.assign(base, { html: 'The modem is making a hoarse KSSHHH-kkk-ACHOO sound. With no spare, you go half speed for a few days while it recovers.' });
        });
        add(6, () => {
          const who = pick(['Rosa', 'Big Walt', 'Captain Baud', 'Marguerite', 'Old Eddie']);
          const gifts = [['snacks', 40, '40 snack packs'], ['scan', 1, 'a virus checker'], ['lines', 1, 'a spare phone line'], ['disks', 2, '2 boxes of floppy disks'], ['pep', 1, 'a pep talk (she writes it on a card)']];
          const g = pick(gifts); S.sup[g[0]] += g[1];
          return { art: 'event', opt: { spr: 'sysop', bg: 'c', word: 'HELLO THERE' }, title: 'A helpful sysop!', html: 'You meet a friendly BBS sysop named ' + who + '. The sysop shares some supplies with you: <span class="trl-g">' + g[2] + '</span>.', sound: () => jingle(J_GOOD) };
        });
        add(5, () => {
          const gain = Math.min(40, LM[S.next].mb - S.mb - 1); if (gain < 5) return null;
          S.mb += gain; return { art: 'event', opt: { spr: 'arrow', bg: 'g', word: 'SHORTCUT!' }, title: 'You found a shortcut!', html: 'A quiet back-alley network takes you around the traffic. You gain <span class="trl-g">' + gain + ' MB</span>.', sound: () => jingle(J_GOOD) };
        });
        add(5, () => { loseDays(1); return { art: 'event', opt: { spr: 'cat', bg: 'y', word: 'JJJJJJJJJJ' }, title: 'The cat sat on the keyboard', html: 'The family cat curled up on the keyboard for a nap and typed four thousand letter J\'s. You lose a day tidying up. The cat is not sorry.' }; });
        add(4, () => { const n = Math.min(S.sup.snacks, 15); if (!n) return null; S.sup.snacks -= n; return { art: 'event', opt: { spr: 'dog', bg: 'g', word: 'CRUNCH' }, title: 'The dog found the snack bag', html: 'The family dog found the snack bag. ' + n + ' snack packs are gone. The dog is very, very happy.' }; });
        add(4, () => { S.sup.disks += 2; return { art: 'event', opt: { spr: 'floppy', bg: 'c', word: '5 CENTS!' }, title: 'Yard sale!', html: 'You find a box of floppy disks at a yard sale for a nickel. Two boxes, actually! <span class="trl-g">+2 boxes of floppy disks</span>.', sound: () => jingle(J_GOOD) }; });
        add(4, () => { const back = Math.min(25, S.mb - LM[S.next - 1].mb); if (back < 5) return null; S.mb -= back; return { art: 'event', opt: { spr: 'arrow', bg: 'r', word: 'DEAD END' }, title: 'Wrong turn!', html: 'You took a wrong turn onto a very slow dead-end network and have to back up <span class="trl-r">' + back + ' MB</span>.' }; });
        add(4, () => { here().forEach(m => { m.p = clamp(m.p + 8, 0, 100); }); return { art: 'event', opt: { spr: 'smile', bg: 'm', word: 'HA HA HA' }, title: 'A funny joke page', html: 'Somebody finds a page full of terrible puns. Everybody groans, then everybody laughs. <span class="trl-g">(+8 patience)</span>', sound: () => jingle(J_GOOD) }; });
        add(4, () => {
          if (S.sup.disks > 0) { S.sup.disks--; return { art: 'event', opt: { spr: 'floppy', bg: 'b', word: 'SAVED!' }, title: 'Lost files!', html: 'The family photo album file got scrambled. Luckily, you had a backup on floppy disk. (1 box of floppy disks used.)' }; }
          loseDays(1); return { art: 'event', opt: { spr: 'floppy', bg: 'r', word: 'OOPS' }, title: 'Lost files!', html: 'The family photo album file got scrambled, and you have no floppy disks for a backup. You spend a day re-scanning photos.' };
        });
        add(4, () => { const m = randomMember(x => !x.ill); if (!m) return null; m.ill = 'Mouse Wrist'; return { art: 'event', opt: { spr: 'mouse', bg: 'r', word: 'CLICK CLICK' }, title: 'Gunky mouse ball', html: 'The mouse ball is full of lint and crumbs. ' + nm(m) + ' pushes it around so hard they get <span class="trl-r">Mouse Wrist</span>.' }; });
        let tot = E.reduce((a, e) => a + e[0], 0), r = Math.random() * tot;
        for (const [w, f] of E) { if ((r -= w) < 0) return f(); }
        return null;
      }

      /* ---------- traveling ---------- */
      function stopTravel() { clearInterval(travelTimer); travelTimer = 0; anyKey = null; }
      function travel() {
        stopTravel();
        if (S.at === LM.length - 1) return finish();
        S.at = -1; save();
        const draw = () => show({ art: 'travel', opt: { moving: true }, html: statusHtml(), choices: [{ label: 'Stop and size up the situation', key: 'Enter', fn: halt }] });
        const halt = () => { stopTravel(); sfx('click'); menu(); };
        draw(); anyKey = halt;
        travelTimer = setInterval(() => {
          if (W.el && W.el.classList.contains('min')) return;
          const res = simDay('travel');
          tone(200 + (S.day % 2) * 60, 0.04, { vol: 0.03 });
          save();
          if (res.specs.length || res.arrived) {
            stopTravel();
            runList(res.specs, () => res.arrived ? arrive() : travel());
            return;
          }
          draw(); anyKey = halt;
        }, 1100);
      }
      function arrive() {
        S.at = S.next; S.next = Math.min(S.next + 1, LM.length - 1); save();
        if (S.at === LM.length - 1) return finish();
        arriveScreen(S.at);
      }
      function arriveScreen(i, start) {
        const l = LM[i];
        sfx('tada');
        show({ art: l.scene, title: (start ? 'You are ready to leave from ' : 'You have arrived at ') + l.name + '!', html: '<p>' + l.desc + '</p><p class="trl-dim">It is ' + dateStr() + '.</p>', cont: () => l.river ? river() : menu() });
      }
      function menu() {
        stopTravel(); save();
        const atL = S.at >= 0 ? LM[S.at] : null;
        const ch = [
          { label: atL ? 'Continue on the Superhighway' : 'Continue on the Superhighway', fn: () => { sfx('click'); if (atL && atL.river && !S.crossed) return river(); travel(); } },
          { label: 'Check supplies', fn: supplies },
          { label: 'Look at the map', fn: () => show({ art: 'map', title: 'The Superhighway', html: statusHtml(), cont: menu }) },
          { label: 'Change pace and snack rations', fn: paceScreen },
          { label: 'Stop to rest', fn: restScreen },
          { label: 'Play Packet Catch <span class="trl-dim">(1 day)</span>', fn: startCatch },
          { label: 'Give a pep talk <span class="trl-dim">(' + S.sup.pep + ' left)</span>', fn: pepTalk }
        ];
        if (atL) {
          ch.push({ label: 'Talk to people', fn: talk });
          if (atL.shop) ch.push({ label: 'Visit ' + esc(atL.shop), fn: () => shop(false, menu) });
          if (atL.trade) ch.push({ label: 'Try to trade <span class="trl-dim">(1 day)</span>', fn: trade });
        }
        show({ art: atL ? atL.scene : 'travel', opt: {}, title: atL ? esc(atL.name) : 'On the Information Superhighway', html: statusHtml() + '<div class="trl-dim">You may:</div>', choices: ch });
      }
      function supplies() {
        const fam = S.fam.map(m => '<div>' + nm(m) + ': ' + (m.gone ? '<span class="trl-dim">logged off, playing outside</span>' : '<span class="' + patCls(m.p) + '">' + patWord(m.p) + ' patience</span>' + (m.ill ? ', has <span class="trl-r">' + m.ill + '</span>' : '')) + '</div>').join('');
        show({ art: 'travel', title: 'Your supplies <span class="trl-dim">(' + JOBS[S.job].name + ', day ' + S.day + ')</span>',
          html: '<div class="trl-st">' + ITEMS.map(it => '<span>' + it.name + ':</span><b style="font-weight:400">' + S.sup[it.k] + (it.k === 'disks' ? ' boxes' : '') + '</b>').join('') + '<span>Money:</span><b style="font-weight:400">' + money(S.money) + '</b></div>' + fam + '<div class="trl-dim" style="margin-top:6px">Pace: ' + PACES[S.pace].name + '. Rations: ' + RATIONS[S.rations].name + '.</div>', cont: menu });
      }
      function paceScreen() {
        show({ art: 'travel', title: 'Pace and snack rations',
          html: '<div class="trl-dim">Pace: ' + PACES.map(p => p.name + ' is ' + p.desc).join('; ') + '.<br>Rations: ' + RATIONS.map(r => r.name + ' is ' + r.desc).join('; ') + '.</div>',
          choices: PACES.map((p, i) => ({ label: 'Pace: ' + p.name + (S.pace === i ? ' (current)' : ''), on: S.pace === i, fn: () => { S.pace = i; save(); paceScreen(); } }))
            .concat(RATIONS.map((r, i) => ({ label: 'Rations: ' + r.name + (S.rations === i ? ' (current)' : ''), on: S.rations === i, fn: () => { S.rations = i; save(); paceScreen(); } })))
            .concat([{ label: 'Done', key: '7', fn: menu }]) });
      }
      function restScreen() {
        const rest = n => {
          const specs = [], msgs = [];
          let i = 0;
          for (; i < n; i++) { const r = simDay('rest'); r.specs.forEach(s => { if (s.art === 'event') msgs.push(s.html); else specs.push(s); }); if (!here().length) break; }
          show({ art: 'rest', title: 'You rest for ' + n + ' day' + (n > 1 ? 's' : '') + '.', html: '<p>Everybody puts their feet up and stretches their eyes. Patience goes up.</p>' + (msgs.length ? '<p>' + msgs.join('<br>') + '</p>' : '') + statusHtml(), cont: () => runList(specs, menu) });
          sfx('ding');
        };
        show({ art: 'rest', title: 'Stop to rest', html: 'How long would you like to rest? Resting helps patience and cures ailments, but everybody still eats snacks.', choices: [{ label: 'Rest 1 day', fn: () => rest(1) }, { label: 'Rest 3 days', fn: () => rest(3) }, { label: 'Rest 5 days', fn: () => rest(5) }, { label: 'Never mind', fn: menu }] });
      }
      function pepTalk() {
        if (S.sup.pep <= 0) { show({ art: 'travel', title: 'No pep talks left', html: 'You are all out of pep talks. You can buy more at a store.', cont: menu }); return; }
        S.sup.pep--; here().forEach(m => { m.p = clamp(m.p + 15, 0, 100); m.cranky = false; });
        const L = here()[0] || S.fam[0];
        save(); jingle(J_GOOD);
        show({ art: 'event', opt: { spr: 'smile', bg: 'm', word: 'YOU CAN DO IT!' }, title: 'Pep talk!', html: nm(L) + ' gives a rousing pep talk about how amazing the year 2000 is going to be: flying cars, talking toasters, maybe even faster modems! <span class="trl-g">Everybody\'s patience goes up.</span>', cont: menu });
      }
      function talk() {
        const i = S.at, arr = TALK[i] || [''], k = (S.visitTalk[i] || 0) % arr.length;
        S.visitTalk[i] = k + 1; save();
        show({ art: LM[i].scene, title: 'Talking to people at ' + esc(LM[i].name), html: esc(arr[k]), cont: menu });
      }
      function trade() {
        const r = simDay('trade');
        const who = pick(['a sysop', 'a web designer', 'a retired phone repairman', 'a kid on a skateboard', 'a traveling salesman', 'a friendly librarian']);
        const opts = [];
        const wants = [['snacks', 50], ['snacks', 80], ['disks', 2], ['modems', 1], ['lines', 1], ['pep', 1], ['scan', 1]];
        const gives = [['modems', 1], ['lines', 1], ['scan', 1], ['pep', 2], ['snacks', 60], ['disks', 3]];
        for (const w of wants) for (const g of gives) if (w[0] !== g[0] && S.sup[w[0]] >= w[1]) opts.push([w, g]);
        const label = (k, n) => n + ' ' + (k === 'snacks' ? 'snack packs' : k === 'disks' ? 'box' + (n > 1 ? 'es' : '') + ' of floppy disks' : k === 'modems' ? 'spare modem' + (n > 1 ? 's' : '') : k === 'lines' ? 'spare phone line' + (n > 1 ? 's' : '') : k === 'pep' ? 'pep talk' + (n > 1 ? 's' : '') : 'virus checker' + (n > 1 ? 's' : ''));
        const after = () => runList(r.specs, menu);
        if (!opts.length || chance(0.15)) { show({ art: LM[S.at].scene, title: 'Trading', html: 'You spend the day looking for someone to trade with, but nobody wants to trade today.', cont: after }); return; }
        const [w, g] = pick(opts);
        show({ art: LM[S.at].scene, title: 'Trading', html: 'You meet ' + who + ' who would like <span class="trl-r">' + label(w[0], w[1]) + '</span>. In return you would get <span class="trl-g">' + label(g[0], g[1]) + '</span>.<br><span class="trl-dim">You have ' + label(w[0], S.sup[w[0]]) + '.</span>',
          choices: [{ label: 'Make the trade', fn: () => { S.sup[w[0]] -= w[1]; S.sup[g[0]] += g[1]; save(); sfx('ding'); show({ art: LM[S.at].scene, title: 'It\'s a deal!', html: 'You shake hands. Pleasure doing business!', cont: after }); } }, { label: 'No thanks', fn: after }] });
      }

      /* ---------- the Y2K River ---------- */
      function river() {
        if (S.depth == null) S.depth = Math.round(rnd(1.8, 5.5) * 10) / 10;
        const fare = 40;
        const info = () => show({ art: 'river', opt: { depth: S.depth }, title: 'About the Y2K River', html: '<p>The river is measured in <span class="trl-y">bugs</span>. Anything under 2.5 bugs deep is easy to drive across. Deeper than that, the Modem-Mobile may get soggy and lose supplies. Deeper than 4, it may float away for a bit!</p><p>Programmers upstream are writing patches every day, so waiting makes the river shallower, but you still eat snacks. The ferry costs ' + money(fare) + ' (or 3 boxes of floppy disks) and is almost always safe.</p>', cont: river });
        show({ art: 'river', opt: { depth: S.depth }, title: 'The Y2K River <span class="trl-dim">' + dateStr() + '</span>',
          html: '<p>You must cross the Y2K River. Today it is <span class="trl-y">' + Math.round(300 + S.depth * 110) + ' lines of code wide</span> and <span class="' + (S.depth < 2.5 ? 'trl-g' : S.depth < 4 ? 'trl-y' : 'trl-r') + '">' + S.depth.toFixed(1) + ' bugs deep</span>.</p><div class="trl-dim">You may:</div>',
          choices: [
            { label: 'Ford the river (drive straight across)', fn: ford },
            { label: 'Wait a day for a patch', fn: () => { const r = simDay('wait'); S.depth = Math.max(0.8, Math.round((S.depth - rnd(0.3, 1.1)) * 10) / 10); save(); runList(r.specs, () => show({ art: 'river', opt: { depth: S.depth }, title: 'You wait a day', html: 'A new patch came out. The river is now ' + S.depth.toFixed(1) + ' bugs deep.', cont: river })); } },
            { label: 'Take the ferry <span class="trl-dim">(' + money(fare) + ' or 3 boxes of disks)</span>', fn: () => ferry(fare) },
            { label: 'Get more information', fn: info },
            { label: 'Check supplies and more', fn: menu }
          ] });
      }
      function crossed(html, spr, bg) {
        S.crossed = true; S.depth = null; S.at = -1; save();
        show({ art: 'event', opt: { spr, bg }, title: 'You crossed the Y2K River!', html, cont: menu });
      }
      function ford() {
        const d = S.depth;
        if (d < 2.5 || (d < 3.2 && chance(0.5))) { jingle(J_GOOD); return crossed('Splash, splash! The Modem-Mobile rolls right across the shallow bugs. Not a single file lost.', 'smile', 'g'); }
        if (d < 4.2) {
          const sn = Math.min(S.sup.snacks, irnd(20, 60)), dk = Math.min(S.sup.disks, irnd(1, 2)); S.sup.snacks -= sn; S.sup.disks -= dk; loseDays(1);
          jingle(J_BAD);
          return crossed('The water sloshes into the Modem-Mobile. You make it across, but ' + sn + ' snack packs got soggy' + (dk ? ' and ' + dk + ' box' + (dk > 1 ? 'es' : '') + ' of floppy disks got wet' : '') + '. You spend a day drying out socks.', 'bug', 'c');
        }
        const sn = Math.floor(S.sup.snacks * 0.3), dk = Math.min(S.sup.disks, 3), md = Math.min(S.sup.modems, 1);
        S.sup.snacks -= sn; S.sup.disks -= dk; S.sup.modems -= md; loseDays(2); here().forEach(m => { m.p = clamp(m.p - 12, 0, 100); });
        sfx('crash');
        const lg = checkLogoffs();
        S.crossed = true; S.depth = null; S.at = -1; save();
        show({ art: 'event', opt: { spr: 'bug', bg: 'r', word: 'GLUB GLUB' }, title: 'The Modem-Mobile floated away!', html: 'Whoa! The bugs were too deep. The Modem-Mobile bobbed downstream like a rubber duck until it bumped into the far bank. Everybody is fine, just damp and grumpy. You lost ' + sn + ' snack packs' + (dk ? ', ' + dk + ' boxes of disks' : '') + (md ? ' and a spare modem' : '') + ', plus 2 days drying out.', cont: () => runList(lg, menu) });
      }
      function ferry(fare) {
        if (S.money < fare && S.sup.disks < 3) { show({ art: 'river', opt: { depth: S.depth }, title: 'The ferry', html: 'The ferry operator says: "Sorry, it\'s ' + money(fare) + ' or 3 boxes of floppy disks." You don\'t have enough.', cont: river }); return; }
        const pay = S.money >= fare ? () => { S.money -= fare; return money(fare); } : () => { S.sup.disks -= 3; return '3 boxes of floppy disks'; };
        const paid = pay();
        if (chance(0.1)) { loseDays(1); jingle(J_BAD); return crossed('You pay ' + paid + '. Halfway across, the ferry\'s engine needs a patch of its own, so you drift for a day. But you make it safe and sound.', 'modem', 'c'); }
        jingle(J_GOOD);
        crossed('You pay ' + paid + ' and the ferry chugs you across. The ferry operator waves goodbye. Smooth sailing!', 'smile', 'g');
      }

      /* ---------- Packet Catch ---------- */
      function startCatch() {
        const r = simDay('hunt'); save();
        G = { x: 120, items: [], pops: [], caught: 0, left: 30, running: false, done: false, paused: false, flash: 0, sick: 0, spawn: 0.5, t: 0, specs: r.specs };
        show({ art: 'catch', big: true, title: 'Packet Catch', html: 'Drag or tap to move your cache bucket (or use the arrow keys). Catch <span class="trl-g">green packets</span> and <span class="trl-y">gold jumbo packets</span>. Dodge the <span class="trl-r">red viruses</span>! 30 seconds.', choices: [{ label: 'Start!', key: ' ', fn: beginCatch }, { label: 'Never mind (you still used a day)', key: 'Escape', fn: () => { G = null; runList(r.specs, menu); } }] });
        extraKey = catchKey;
      }
      function beginCatch() {
        if (!G || G.running || G.done) return;
        if (G.paused) { G.paused = false; G.running = true; return; }
        G.running = true; tone(660, 0.08); tone(990, 0.1, { at: 0.1 });
        show({ art: 'catch', big: true, html: '<span class="trl-dim">Arrow keys or drag to move. Esc to stop early.</span>', choices: [{ label: 'Stop early', key: 'Escape', fn: endCatch }] });
        extraKey = catchKey;
      }
      function catchKey(e) {
        if (!G) return false;
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { G.x = clamp(G.x - 12, 15, LW - 15); return true; }
        if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { G.x = clamp(G.x + 12, 15, LW - 15); return true; }
        if ((e.key === ' ' || e.key === 'Enter') && (!G.running || G.paused) && !G.done) { beginCatch(); return true; }
        return false;
      }
      function catchMove(e) { const r = cv.getBoundingClientRect(); G.x = clamp((e.clientX - r.left) / r.width * LW, 15, LW - 15); }
      function catchPointer(e) {
        if (!G) return;
        catchMove(e);
        if ((!G.running || G.paused) && !G.done) beginCatch();
      }
      function updateCatch(dt) {
        const g = G; if (!g || !g.running || g.paused) return;
        g.t += dt; g.left -= dt; g.flash = Math.max(0, g.flash - dt * 2); g.sick = Math.max(0, g.sick - dt);
        g.spawn -= dt;
        if (g.spawn <= 0) {
          g.spawn = Math.max(0.22, 0.6 - g.t * 0.012) * rnd(0.7, 1.3);
          const r = Math.random();
          g.items.push({ x: rnd(10, LW - 10), y: 8, v: 50 + g.t * 2.4 + rnd(0, 30), kind: r < 0.24 + g.t * 0.004 ? 'virus' : r < 0.32 + g.t * 0.004 ? 'gold' : 'pkt' });
        }
        const by = LH - 20;
        g.items = g.items.filter(it => {
          it.y += it.v * dt;
          if (it.y >= by - 2 && it.y <= by + 8 && Math.abs(it.x - g.x) < 17) {
            if (it.kind === 'virus') { const lost = Math.min(g.caught, 3); g.caught -= lost; g.flash = 1; g.sick = 0.6; g.pops.push({ x: it.x, y: by - 10, s: '-' + lost, c: 'R', t: 0.8 }); if (sound) api.noise(0.2, { f: 400, q: 1, vol: 0.08 }); }
            else { const v = it.kind === 'gold' ? 5 : 1; g.caught += v; g.pops.push({ x: it.x, y: by - 10, s: '+' + v, c: it.kind === 'gold' ? 'y' : 'G', t: 0.6 }); tone(it.kind === 'gold' ? 1320 : 880 + (g.caught % 5) * 60, 0.05, { vol: 0.04 }); }
            return false;
          }
          return it.y < LH + 10;
        });
        g.pops = g.pops.filter(p => { p.t -= dt; p.y -= dt * 20; return p.t > 0; });
        if (g.left <= 0) endCatch();
      }
      function endCatch() {
        const g = G; if (!g || g.done) return;
        g.running = false; g.done = true;
        const snacks = Math.min(100, g.caught * 2);
        S.sup.snacks += snacks; save();
        if (g.caught > 0) jingle(J_GOOD); else jingle(J_BAD);
        const specs = g.specs;
        show({ art: 'catch', big: true, title: 'Packet Catch results', html: 'You caught <span class="trl-y">' + g.caught + ' packet' + (g.caught === 1 ? '' : 's') + '</span>.' + (g.caught * 2 > 100 ? ' That makes ' + g.caught * 2 + ' byte-size snack packs, but the Modem-Mobile can only fit <span class="trl-g">100</span> of them.' : ' That makes <span class="trl-g">' + snacks + ' byte-size snack packs</span>.'), cont: () => { G = null; runList(specs, menu); } });
      }
      W.onMin = () => { if (G && G.running) { G.paused = true; G.running = false; } };

      /* ---------- the end ---------- */
      function score() {
        const pts = { Good: 500, Fair: 400, Poor: 300, 'Very poor': 200 };
        const rows = [];
        const h = here();
        const fam = h.reduce((a, m) => a + pts[patWord(m.p)], 0);
        rows.push([h.length + ' family member' + (h.length === 1 ? '' : 's') + ' made it', fam]);
        const add = (lbl, n, each) => { if (n > 0) rows.push([n + ' ' + (n === 1 ? (/^boxes/.test(lbl) ? lbl.replace(/^boxes/, 'box') : lbl.replace(/s$/, '')) : lbl), Math.floor(n * each)]); };
        add('spare modems', S.sup.modems, 50); add('spare phone lines', S.sup.lines, 40); add('boxes of floppy disks', S.sup.disks, 4);
        add('pep talks', S.sup.pep, 10); add('virus checkers', S.sup.scan, 25);
        if (S.sup.snacks >= 25) rows.push([S.sup.snacks + ' snack packs', Math.floor(S.sup.snacks / 25)]);
        if (S.money >= 5) rows.push([money(S.money) + ' cash', Math.floor(S.money / 5)]);
        const sub = rows.reduce((a, r) => a + r[1], 0), mult = JOBS[S.job].mult;
        return { rows, sub, mult, total: sub * mult };
      }
      function finish() {
        stopTravel();
        S.at = LM.length - 1; S.mb = TOTAL;
        const sc = score();
        api.save('trip', null);
        const trip = S; lastTrip = S; S = null;
        jingle(J_WIN);
        const fireworks = () => { if (sound) for (let i = 0; i < 6; i++) api.noise(0.35, { at: 0.3 + i * 0.45, f: 700 + i * 150, q: 0.8, vol: 0.05 }); };
        fireworks();
        show({ art: 'end', title: 'You made it to the year 2000!', html: '<p>Ten... nine... eight... The Byte family rolls into the new millennium as the clocks strike midnight. The lights stay on, the computers keep working, and everybody cheers. Happy New Year!</p><p class="trl-dim">It took ' + trip.day + ' days on the road.</p>', cont: () => {
          const earned = Math.min(12, 8 + Math.floor(sc.total / 1000));
          const tbl = '<table class="trl-top">' + sc.rows.map(r => '<tr><td></td><td>' + r[0] + '</td><td>' + r[1] + '</td><td></td></tr>').join('') + '<tr><td></td><td>Subtotal</td><td>' + sc.sub + '</td><td></td></tr><tr><td></td><td>Bonus for being a ' + JOBS[trip.job].name + '</td><td>x' + sc.mult + '</td><td></td></tr><tr class="trl-me"><td></td><td>Total score</td><td>' + sc.total + '</td><td>' + rankOf(sc.total) + '</td></tr></table>';
          api.earn(earned, 'reaching the year 2000');
          show({ art: 'end', title: 'Final score', html: tbl + '<p class="trl-g">You earned ' + money(earned) + ' for reaching the year 2000!</p>', cont: () => {
            const me = { name: trip.fam[0].name + ' Byte', score: sc.total };
            top.push(me); top.sort((a, b) => b.score - a.score); top = top.slice(0, 10); api.save('top', top);
            topTen(() => show({ art: 'end', title: 'What next?', choices: [{ label: 'Start a new trip', fn: newTrip }, { label: 'Back to the title screen', fn: title }] }), top.includes(me) ? me : null);
          } });
        } });
      }
      function gameOver() {
        stopTravel();
        const trip = S; lastTrip = S; api.save('trip', null); S = null;
        jingle([[67, 0], [65, 0.2], [64, 0.4], [60, 0.6, 0.5]], 'triangle');
        show({ art: 'park', opt: { all: true }, title: 'Everybody has logged off!', html: '<p>The whole Byte family ran out of patience and went outside. The Superhighway will still be there tomorrow, and honestly, they are having a wonderful time playing frisbee in the park.</p><p class="trl-dim">You made it ' + trip.mb + ' MB, all the way to ' + dateStr(trip.mb) + '. Try a slower pace, more snacks, or more rest next time.</p>',
          choices: [{ label: 'Start a new trip', fn: newTrip }, { label: 'Back to the title screen', fn: title }] });
      }
      function resume() {
        if (!S) return title();
        sfx('ding');
        if (S.at === LM.length - 1) return finish();
        if (S.at >= 0 && LM[S.at].river && !S.crossed) return river();
        if (!here().length) return gameOver();
        menu();
      }

      api.menubar([
        { label: 'Game', items: () => [
          { label: 'New trip', fn: () => S ? api.msgBox('New trip', 'Start a new trip? Your trip in progress will be lost.', ['Yes', 'No'], 'warn').then(r => { if (r === 'Yes') newTrip(); }) : newTrip() },
          { label: 'Resume trip', fn: resume, disabled: !S },
          { label: 'Title screen', fn: title }, '-',
          { label: 'Top Ten', fn: () => { stopTravel(); topTen(S ? resume : title); } },
          { label: 'How to play', fn: () => { stopTravel(); help(S ? resume : title); } }, '-',
          { label: 'Exit', fn: () => api.close() }
        ] },
        { label: 'Options', items: () => [{ label: sound ? 'Sound off' : 'Sound on', fn: () => { sound = !sound; api.save('sound', sound); } }] }
      ]);

      W.onClose = () => { dead = true; stopTravel(); cancelAnimationFrame(raf); save(); };
      fit();
      title();
      raf = requestAnimationFrame(loop);
      setTimeout(fit, 0);
    }
  });
})();
