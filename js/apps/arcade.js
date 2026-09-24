/* Arcade: two store games. Captain Comet (a 1990 side-scrolling platformer) and Brick Buster (a brick-breaker). Original designs. */
(function () {
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const approach = (v, t, d) => v < t ? Math.min(t, v + d) : Math.max(t, v - d);
  const hash = n => { n = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b); n ^= n >>> 13; n = Math.imul(n, 0xc2b2ae35); n ^= n >>> 16; return (n >>> 0) / 4294967296; };
  const pad6 = n => String(Math.max(0, n | 0)).padStart(6, '0');
  const FONT = (n, b) => `${b ? 'bold ' : ''}${n}px "Courier New", Courier, monospace`;
  function sprite(rows, pal) {
    const h = rows.length, w = Math.max(...rows.map(r => r.length));
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d');
    rows.forEach((r, y) => [...r].forEach((ch, x) => { if (pal[ch]) { g.fillStyle = pal[ch]; g.fillRect(x, y, 1, 1); } }));
    return c;
  }
  function flipped(src) {
    const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
    const g = c.getContext('2d'); g.translate(src.width, 0); g.scale(-1, 1); g.drawImage(src, 0, 0);
    return c;
  }
  function txt(g, t, x, y, size, col, align = 'center', bold = true, sh = '#000') {
    g.font = FONT(size, bold); g.textAlign = align; g.textBaseline = 'middle';
    if (sh) { g.fillStyle = sh; g.fillText(t, x + 1, y + 1); }
    g.fillStyle = col; g.fillText(t, x, y);
  }
  function wrapLines(g, t, maxW, size) {
    g.font = FONT(size, true);
    const out = [];
    t.split('\n').forEach(par => {
      let line = '';
      par.split(' ').forEach(w => { const test = line ? line + ' ' + w : w; if (g.measureText(test).width > maxW && line) { out.push(line); line = w; } else line = test; });
      out.push(line);
    });
    return out;
  }
  function pixEllipse(g, cx, cy, rx, ry, col) {
    g.fillStyle = col;
    for (let y = -ry; y < ry; y++) { const f = (y + 0.5) / ry, w = Math.round(rx * Math.sqrt(Math.max(0, 1 - f * f))); if (w > 0) g.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2, 1); }
  }
  const coarse = () => !!(window.matchMedia && matchMedia('(pointer:coarse)').matches);
  const arrowSvg = d => `<svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true" shape-rendering="crispEdges"><polygon points="${d < 0 ? '11,2 11,14 3,8' : '5,2 5,14 13,8'}" fill="#000"/></svg>`;

  /* ======================================================================
     CAPTAIN COMET
     ====================================================================== */
  const T = 16;
  let CW = 320; // view width in game pixels: 320, or 256 in tall (portrait) windows
  const THEMES = {
    yard: { sky: '#5555ff', sky2: '#55ffff', far: '#0000aa', ground: '#aa5500', dots: '#553300', top: '#00aa00', top2: '#55ff55', block: '#aa0000', blockL: '#ff5555', blockD: '#550000', plat: '#aa5500', platL: '#ffaa55', goo: '#55ff55', gooL: '#ccffcc', bg: 'yard' },
    moon: { sky: '#000000', sky2: '#101030', far: '#262636', ground: '#555555', dots: '#383838', top: '#aaaaaa', top2: '#ffffff', block: '#555555', blockL: '#aaaaaa', blockD: '#222222', plat: '#aaaaaa', platL: '#ffffff', goo: '#55ff55', gooL: '#ccffcc', bg: 'moon' },
    swamp: { sky: '#002818', sky2: '#006040', far: '#004028', ground: '#553300', dots: '#2a1800', top: '#00aa00', top2: '#55ff55', block: '#555555', blockL: '#aaaaaa', blockD: '#222222', plat: '#aa5500', platL: '#ffaa55', goo: '#55ff55', gooL: '#eeffaa', bg: 'swamp' },
    base: { sky: '#000000', sky2: '#000044', far: '#151d33', ground: '#555555', dots: '#333333', top: '#aaaaaa', top2: '#ffffff', block: '#555555', blockL: '#aaaaaa', blockD: '#1a1a1a', plat: '#aaaaaa', platL: '#ffffff', goo: '#55ff55', gooL: '#ccffcc', bg: 'base', rivet: '#aaaaaa' },
    crystal: { sky: '#000033', sky2: '#0000aa', far: '#141470', ground: '#0000aa', dots: '#000066', top: '#55ffff', top2: '#ffffff', block: '#5555ff', blockL: '#aaffff', blockD: '#000066', plat: '#55ffff', platL: '#ffffff', goo: '#55ffff', gooL: '#ffffff', bg: 'crystal' },
    fort: { sky: '#120012', sky2: '#3a003a', far: '#2c0a2c', ground: '#550055', dots: '#330033', top: '#aa00aa', top2: '#ff55ff', block: '#aa00aa', blockL: '#ff55ff', blockD: '#440044', plat: '#aaaaaa', platL: '#ffffff', goo: '#ff5555', gooL: '#ffff55', bg: 'fort', rivet: '#ff55ff' }
  };
  // Levels are built from 16-column chunks placed side by side (one chunk per block of lines).
  // . empty  # ground  X block  = one-way ledge  ^ spikes  ~ goo  S spring  | raft turn marker  M raft
  // * star  k cookie  z pizza  d soda  u cupcake  L extra life  r y b keycards  R Y B doors
  // C checkpoint  E exit rocket  ? hint sign  P start  w Gloobling  h Sproinger  f Buzzbot  t Spitpod  G Emperor Gloop
  const LEVELS = [
    { name: 'Backyard Blastoff', theme: 'yard', hints: [
      'Use LEFT and RIGHT to walk. Press JUMP (Space or Ctrl) to jump. Hold it to jump higher, and keep holding while you fall to puff your cardboard jetpack!',
      'Press ZAP (Alt or X) to fire your Zapper. Zapped critters get dizzy for a while, so you can walk right past them.',
      'Press POGO (Down or S) to hop on your pogo stick. Hold JUMP as you land for a super bounce!'
    ], map: `
................
................
................
................
................
................
................
................
.......***......
................
................
.P..?...........
################
################

................
................
................
................
................
................
................
..........k.....
.........===....
................
....##..........
.?.###.....w....
################
################

................
................
................
................
................
................
................
................
.....*.*.*......
................
................
................
#####^^^########
################

................
................
................
................
................
................
.........*.*.*..
..........######
..........######
..........######
..........######
...?......######
################
################

................
................
................
................
................
................
..C.............
#######.........
#######.........
#######.........
#######.........
#######....w..z.
################
################

................
................
................
................
................
................
................
..........kk....
................
.....===..===...
................
................
###............#
###............#

................
................
................
................
................
................
................
........u.......
.......###......
......#####.....
.....#######....
..w.#########.w.
################
################

................
................
................
................
................
................
................
................
................
................
....*.*.*.......
............E...
################
################` },
    { name: 'Moon Crater Caves', theme: 'moon', grav: 0.8, hints: [
      'Welcome to the Moon! Gravity is low here, so you jump extra high. Sproingers hop after you. Zap them, then pogo onto a dizzy critter to pop it for 200 points!',
      'Red doors only open for a red keycard. Look up high in the caves!'
    ], map: `
################
#...............
#...............
#...............
#...............
#...............
#...............
#.........*.*...
#...............
#........====...
#...............
#.P..?..........
################
################

################
................
................
................
................
................
...........u....
..........===...
................
......====......
................
..h.........h...
################
################

################
................
................
................
................
................
................
....*..*..*.....
................
................
................
................
##^^^^##^^^^####
################

################
................
.........r......
........###.....
................
................
.....===........
................
................
..===...........
................
................
################
################

################
................
................
................
........########
........########
........########
........########
........########
........########
........R.......
..C..?..R.......
################
################

################
................
................
................
########........
########........
########........
########........
########...k....
########..===...
...k.....h......
................
################
################

################
................
................
................
.........*.*....
................
........====....
................
....====........
................
.h..........L...
................
################
################

################
................
................
................
................
................
................
................
................
................
..*.*.*.........
.........E......
################
################` },
    { name: 'Gloop Swamp', theme: 'swamp', hints: [
      'Gloop Swamp! The green goo is yucky, so do not touch it. Ride the floating rafts across. Buzzbots fly around up high.'
    ], map: `
................
................
................
................
................
................
................
................
........*.*.....
................
................
.P..?.......w...
################
################

................
................
................
................
................
................
................
................
................
................
.....k....k.....
.|M.........|...
##~~~~~~~~~~~~##
################

................
................
................
................
................
................
.........f......
...*....*....*..
................
................
...##....##....#
...##....##....#
~~~##~~~~##~~~~#
################

................
................
................
................
................
................
................
...........k....
................
................
...............t
.|M.......|..###
#~~~~~~~~~~~~###
################

................
................
................
................
................
................
................
................
.......===......
................
................
.C....w.....w...
################
################

................
................
................
................
................
.......f........
................
.....*....*.....
....===..===....
................
.===.........===
................
~~~~~~~~~~~~~~~~
################

................
................
................
................
................
................
................
........u.......
.......===......
................
................
.......w....h...
################
################

................
................
................
................
................
................
................
................
................
................
...*.*.*........
..........E.....
################
################` },
    { name: 'Asteroid Base', theme: 'base', hints: [
      'Asteroid Base! Jump onto a spring to fly sky high. Spitpods spit gloop balls: zap the balls, or zap the pod. The yellow keycard is way up high.'
    ], map: `
X...............
X...............
X...............
X...............
X...............
X...............
X...............
X...............
X.......*.*.*...
X.......XXXX....
X...............
X.P.?.........S.
XXXXXXXXXXXXXXXX
XXXXXXXXXXXXXXXX

................
................
.....y..........
...XXXXXX.......
................
................
................
.........t......
.......XXXXX....
................
................
....w.......w...
XXXXXXXXXXXXXXXX
XXXXXXXXXXXXXXXX

................
................
................
................
................
................
................
..........r.....
.........XXX....
.....XXX........
................
t.............t.
XXXXXXXXXXXXXXXX
XXXXXXXXXXXXXXXX

................
................
................
.......XXXXXXXXX
.......XXXXXXXXX
.......XXXXXXXXX
.......XXXXXXXXX
.......XXXXXXXXX
.......XXXXXXXXX
.......XXXXXXXXX
..C....R........
.......R........
XXXXXXXXXXXXXXXX
XXXXXXXXXXXXXXXX

................
................
................
XXXXXXXXXXXXX...
XXXXXXXXXXXXX...
XXXXXXXXXXXXX...
XXXXXXXXXXXXX...
XXXXXXXXXXXXX...
XXXXXXXXXXXXX...
XXXXXXXXXXXXX...
.....w.......Y..
.............Y..
XXXXXXXXXXXXXXXX
XXXXXXXXXXXXXXXX

................
................
.....*.*.*.*....
....XXXXXXXXXX..
................
................
.........f......
................
................
................
................
S..............S
XXXXXXXXXXXXXXXX
XXXXXXXXXXXXXXXX

................
................
................
................
................
................
................
.........d......
........XXX.....
................
..........t.....
...w..XXXXXXX...
XXXXXXXXXXXXXXXX
XXXXXXXXXXXXXXXX

................
................
................
................
................
................
................
................
................
................
..*.*.*.........
..........E.....
XXXXXXXXXXXXXXXX
XXXXXXXXXXXXXXXX` },
    { name: 'Crystal Comet Tail', theme: 'crystal', ice: true, hints: [
      'Crystal Comet Tail! The ice is slippery, so start slowing down early. A blue door is ahead: find the blue keycard.'
    ], map: `
................
................
................
................
................
................
................
................
.......*.*.*....
................
................
.P..?.........w.
################
################

................
................
................
................
................
................
................
.........u......
........===.....
................
....===.....==..
................
##^^^^^^^^^^^^##
################

................
................
................
................
................
.....k......k...
................
....XX......XX..
....XX......XX..
....XX..h...XX..
................
................
################
################

................
................
................
................
................
................
.........f......
................
................
................
.C..............
............b...
#########...####
#########...####

#############...
#############...
#############...
#############...
#############...
#############...
#############...
#############...
#############...
..........B.....
..........B.....
...w......B..t..
################
################

................
................
................
................
................
................
................
....*...*...*...
................
................
..===...===...==
................
~~~~~~~~~~~~~~~~
################

................
................
................
................
................
................
................
........z.......
.......###......
......#####.....
.....#######....
..h..#######.w..
################
################

................
................
................
................
................
................
................
................
................
................
..*.L.*.........
..........E.....
################
################` },
    { name: 'Gloop\'s Fortress', theme: 'fort', hints: [
      'Gloop\'s Fortress! The red lava is VERY hot. Every door needs its own keycard: red first, then yellow, then blue.'
    ], map: `
XXXXXXXXXXXXXXXX
X...............
X...............
X...............
X...............
X...............
X...............
X...............
X.......*.*.*...
X...............
X...............
XP..?......w....
XXXXXXXXXXXXXXXX
XXXXXXXXXXXXXXXX

XXXXXXXXXXXXXXXX
................
................
................
................
................
..........f.....
................
................
................
................
|M.........|....
~~~~~~~~~~~~XXXX
XXXXXXXXXXXXXXXX

XXXXXXXXXXXXXXXX
................
.....r..........
....XXX.........
................
................
................
.........===....
................
.............===
................
...t...........S
XXXXXXXXXXXXXXXX
XXXXXXXXXXXXXXXX

XXXXXXXXXXXXXXXX
...X............
...X............
...X............
...X............
...X............
...X.....y......
...X....XXX.....
...X............
...X.h..........
...R............
...R.......h....
XXXXXXXXXXXXXXXX
XXXXXXXXXXXXXXXX

XXXXXXXXXXXXXXXX
.......X........
.......X........
.......X........
.......X........
.......X........
.......X........
.......X........
.......X........
.......X........
..C....Y........
.......Y........
XXXXXXXXXXXXXXX~
XXXXXXXXXXXXXXXX

XXXXXXXXXXXXXXXX
................
................
................
................
...........f....
................
.......b........
......===.......
................
................
|M........|.....
~~~~~~~~~~~~~XXX
XXXXXXXXXXXXXXXX

XXXXXXXXXXXXXXXX
.....X..........
.....X..........
.....X..........
.....X..........
.....X..........
.....X..........
.....X..........
.....X..........
.....X..........
.....B.....t....
..w..B.....X....
XXXXXXXXXXXXXXXX
XXXXXXXXXXXXXXXX

XXXXXXXXXXXXXXXX
................
................
................
................
................
................
................
.........*.*....
................
....w...........
..........E.....
XXXXXXXXXXXXXXXX
XXXXXXXXXXXXXXXX` },
    { name: 'Throne of Gloop', theme: 'fort', boss: true, hints: [], map: `
XXXXXXXXXXXXXXXXXXXX
X..................X
X..................X
X..................X
X..................X
X..................X
X..................X
XXXX............XXXX
X..................X
X..................X
X==..............==X
X.P.......G........X
XXXXXXXXXXXXXXXXXXXX
XXXXXXXXXXXXXXXXXXXX` }
  ];
  function buildRows(def) {
    const chunks = def.map.trim().split(/\n\s*\n/).map(c => c.trim().split('\n').map(s => s.trim()));
    const H = chunks[0].length, rows = [];
    for (let r = 0; r < H; r++) rows.push(chunks.map(c => (c[r] || '').padEnd(c[0].length, '.')).join(''));
    return rows;
  }
  const ITEMS = { '*': 50, k: 100, z: 200, d: 500, u: 1000 };
  const SOLID = '#XSRYB';
  const isSolid = ch => SOLID.includes(ch);
  const NODES = [[34, 0.8], [80, 0.46], [126, 0.8], [172, 0.5], [218, 0.82], [262, 0.52], [288, 0.14]];

  let CSPR = null;
  function cometSprites() {
    if (CSPR) return CSPR;
    const GP = { g: '#00aa00', G: '#55ff55', L: '#ccffcc', w: '#ffffff', k: '#000000', m: '#005500' };
    const glob = ['....gggggg....', '..ggGGGGGGgg..', '.gGGLLGGGGGGg.', '.gGLLGGGGGGGg.', 'gGGwwwGGGwwwGg', 'gGGwwkGGGwwkGg', 'gGGwwkGGGwwkGg', 'gGGGGGGGGGGGGg', 'gGGGGmmmmGGGGg', 'gGGGGGGGGGGGGg', '.gGGGGGGGGGGg.', 'gg.gg.gg.gg.gg'];
    const globB = glob.slice(0, 11).concat(['.gg.gg..gg.gg.']);
    const globD = glob.slice(); globD[5] = 'gGGkwkGGGkwkGg'; globD[6] = 'gGGwkwGGGwkwGg'; globD[8] = 'gGGGmGmGmGGGGg';
    const HP = { p: '#aa00aa', P: '#ff55ff', w: '#ffffff', k: '#000000', s: '#aaaaaa', d: '#555555' };
    const hop = ['...pppppp...', '..pPPPPPPp..', '.pPPwwwwPPp.', '.pPwwwwwwPp.', 'pPPwwwkkwPPp', 'pPPwwwkkwPPp', '.pPPwwwwPPp.', '.pPPPPPPPPp.', '..pppppppp..', '...s....s...', '..s....s....', '...s....s...', '..s....s....', '..ddd..ddd..'];
    const hopD = hop.slice(); hopD[4] = 'pPPwwkwkwPPp'; hopD[5] = 'pPPwwwkwwPPp';
    const BP = { s: '#aaaaaa', L: '#ffffff', d: '#555555', R: '#aa0000', y: '#ffff55', r: '#ff5555' };
    const bot = ['dddddd........', '......dd......', '....ssssss....', '..ssLLssssss..', '.ssssssssssss.', 'sRRRRRRRRRRRRs', 'sRRyyRRRRRRRRs', '.dssssssssssd.', '..dddddddddd..', '....d....d....'];
    const botB = bot.slice(); botB[0] = '........dddddd';
    const botD = bot.slice(); botD[5] = 'sddddddddddddd'.slice(0, 13) + 's'; botD[6] = 'sdddddddddddds';
    const PP = { R: '#aa0000', r: '#ff5555', k: '#000000', y: '#ffff55', g: '#00aa00', G: '#55ff55', b: '#aa5500', B: '#553300' };
    const podTop = ['....RRRRRR......', '..RRrrrrrrRR....', '.RrrrrrrrrrrR...', '.RrryrrrrrrrrR..'];
    const podBot = ['.RrrrrrrrrrrR...', '..RRRRRRRRRR....', '......gg........', '..GGg.gg.gGG....', '...GGggggGG.....', '....bbbbbbbb....', '....BbbbbbbB....', '.....bbbbbb.....', '.....BBBBBB.....'];
    const pod = podTop.concat(['RrrrrrrrrrrrrR..', 'RrrrrrrrrrrrrR..', 'RrrrrrrrrrrrrR..'], podBot);
    const podO = podTop.concat(['Rrrrrrrrrrkkkk..', 'Rrrrrrrrrrkkkk..', 'RrrrrrrrrrrrrR..'], podBot);
    const podD = pod.slice(); podD[3] = '.RrrkrrrrrrrrR..';
    const S = {};
    const both = (name, rows, pal) => { S[name] = sprite(rows, pal); S[name + 'L'] = flipped(S[name]); };
    both('glob', glob, GP); both('globB', globB, GP); both('globD', globD, GP);
    both('hop', hop, HP); both('hopD', hopD, HP);
    both('bot', bot, BP); both('botB', botB, BP); both('botD', botD, BP);
    both('pod', pod, PP); both('podO', podO, PP); both('podD', podD, PP);
    S['*'] = sprite(['...yy...', '...yy...', 'yyyyyyyy', '.yyyyyy.', '..yyyy..', '.yyyyyy.', '.yy..yy.', 'yy....yy'], { y: '#ffff55' });
    S.k = sprite(['..bbbb..', '.blbbBb.', 'bbbBbbbb', 'bBbbblbb', 'bbblbbBb', 'bbBbbbbb', '.bbbbBb.', '..bbbb..'], { b: '#aa5500', B: '#331800', l: '#ffaa55' });
    S.z = sprite(['bbbbbbbb', 'yyyyyyyy', '.yryyry.', '.yyyyyy.', '..yryy..', '..yyyy..', '...yy...', '...y....'], { y: '#ffff55', r: '#ff5555', b: '#aa5500' });
    S.d = sprite(['..ssss..', '.rrrrrr.', '.rwwwwr.', '.rrrrrr.', '.rrwrrr.', '.rrrrrr.', '.RRRRRR.', '..ssss..'], { r: '#ff5555', R: '#aa0000', w: '#ffffff', s: '#aaaaaa' });
    S.u = sprite(['...rr...', '..pppp..', '.pwpppp.', 'pppppPpp', 'PPPPPPPP', '.bBbBbB.', '.bBbBbB.', '..bBbB..'], { p: '#ff55ff', P: '#aa00aa', w: '#ffffff', r: '#ff5555', b: '#aa5500', B: '#553300' });
    S.L = sprite(['..ssss..', '.swssds.', 'ssdssdss', 'dddddddd', '.ffffff.', '.fkffkf.', '.ffffff.', '..ffff..'], { s: '#aaaaaa', w: '#ffffff', d: '#555555', f: '#ffcc99', k: '#000000' });
    const mc = document.createElement('canvas'); mc.width = 24; mc.height = 24; const mg = mc.getContext('2d'); mg.fillStyle = '#ffff55';
    for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) { const a = (x - 11.5) ** 2 + (y - 11.5) ** 2, b = (x - 15.5) ** 2 + (y - 8.5) ** 2; if (a < 132 && b > 100) mg.fillRect(x, y, 1, 1); }
    S.moon = mc;
    CSPR = S;
    return S;
  }
  // Captain Comet himself: rectangles on a 16x24 grid, facing right.
  const HC = { k: '#000000', s: '#aaaaaa', l: '#ffffff', d: '#555555', f: '#ffcc99', h: '#aa5500', g: '#00aa00', G: '#55ff55', y: '#ffff55', w: '#ffffff', b: '#5555ff', p: '#aa5500', P: '#553300', r: '#ff5555', R: '#aa0000' };
  const HERO_TOP = [[1, 10, 4, 9, 'P'], [2, 11, 2, 7, 'p'], [1, 13, 4, 1, 's'], [1, 19, 2, 2, 'd'], [3, 19, 2, 2, 'd'],
    [6, 0, 5, 1, 's'], [5, 1, 7, 4, 's'], [6, 1, 2, 1, 'l'], [6, 3, 1, 1, 'd'], [8, 2, 1, 1, 'd'], [8, 4, 1, 1, 'd'], [10, 3, 1, 1, 'd'], [4, 5, 10, 1, 'd'], [3, 4, 1, 2, 's'], [14, 4, 1, 2, 's'],
    [5, 6, 2, 3, 'h'], [7, 6, 6, 5, 'f'], [10, 7, 1, 2, 'k'], [10, 9, 2, 1, 'R'],
    [5, 11, 7, 6, 'g'], [6, 11, 1, 5, 'G'], [8, 12, 2, 2, 'y'], [5, 16, 7, 1, 's']];
  const HERO_GUN = [[8, 13, 3, 2, 'G'], [11, 13, 2, 1, 'f'], [11, 11, 4, 2, 'r'], [15, 11, 1, 2, 'y']];
  const HERO_LEGS = {
    stand: [[6, 17, 2, 5, 'g'], [9, 17, 2, 5, 'g'], [5, 22, 4, 1, 'w'], [9, 22, 4, 1, 'w'], [5, 23, 4, 1, 'd'], [9, 23, 4, 1, 'd'], [7, 22, 1, 1, 'b'], [11, 22, 1, 1, 'b']],
    walk1: [[5, 17, 2, 4, 'g'], [10, 17, 2, 4, 'g'], [3, 21, 4, 1, 'w'], [10, 21, 4, 1, 'w'], [3, 22, 4, 1, 'd'], [10, 22, 4, 1, 'd'], [12, 21, 1, 1, 'b']],
    walk2: [[7, 17, 3, 5, 'g'], [6, 22, 5, 1, 'w'], [6, 23, 5, 1, 'd'], [9, 22, 1, 1, 'b']],
    jump: [[6, 17, 2, 3, 'g'], [9, 17, 2, 2, 'g'], [5, 20, 4, 1, 'w'], [10, 19, 4, 1, 'w'], [5, 21, 4, 1, 'd'], [10, 20, 4, 1, 'd']],
    pogo: [[8, 11, 1, 13, 'd'], [5, 12, 7, 1, 'R'], [6, 12, 4, 2, 'G'], [6, 17, 2, 3, 'g'], [9, 17, 2, 3, 'g'], [5, 20, 3, 1, 'w'], [9, 20, 3, 1, 'w'], [5, 21, 7, 1, 's'], [7, 22, 3, 1, 's'], [8, 23, 1, 1, 'k']]
  };
  function drawHero(g, x, y, face, pose, opt = {}) {
    g.save();
    g.translate(Math.round(x) + (face < 0 ? 16 : 0), Math.round(y));
    if (face < 0) g.scale(-1, 1);
    if (opt.rot) { g.translate(8, 12); g.rotate(opt.rot); g.translate(-8, -12); }
    const R = list => list.forEach(([a, b, w, h, c]) => { g.fillStyle = opt.white ? '#fff' : HC[c]; g.fillRect(a, b, w, h); });
    const sq = pose === 'pogo' && opt.squash ? 2 : 0;
    if (pose === 'pogo') {
      g.fillStyle = HC.d; g.fillRect(8, 11, 1, 13);
      g.save(); g.translate(0, sq);
      R(HERO_TOP); R(HERO_LEGS.pogo.slice(1, 7));
      g.restore();
      R(HERO_LEGS.pogo.slice(7));
    } else {
      R(HERO_TOP); R(HERO_LEGS[pose] || HERO_LEGS.stand); R(HERO_GUN);
      if (opt.flash) { g.fillStyle = '#ffffff'; g.fillRect(15, 10, 1, 4); g.fillStyle = '#55ffff'; g.fillRect(14, 11, 2, 2); }
    }
    g.restore();
  }
  function drawHamster(g, cx, by, roll, t, happy) {
    const cy = by - 7;
    g.fillStyle = 'rgba(170,255,255,.18)'; g.beginPath(); g.arc(cx, cy, 7, 0, 6.283); g.fill();
    const hop = happy ? Math.abs(Math.sin(t * 8)) * 2 : 0;
    const X = Math.round(cx), Y = Math.round(cy - hop);
    g.fillStyle = '#ffaa55'; g.fillRect(X - 4, Y - 2, 8, 6); g.fillRect(X - 3, Y - 3, 6, 1);
    g.fillStyle = '#ffffff'; g.fillRect(X - 1, Y + 1, 4, 3);
    g.fillStyle = '#ff55ff'; g.fillRect(X - 3, Y - 4, 2, 1); g.fillRect(X + 1, Y - 4, 2, 1);
    g.fillStyle = '#000'; g.fillRect(X + 2, Y - 1, 1, 1); g.fillRect(X - 1, Y - 1, 1, 1);
    g.fillStyle = '#ff5555'; g.fillRect(X, Y + 1, 1, 1);
    g.strokeStyle = 'rgba(200,255,255,.85)'; g.lineWidth = 1; g.beginPath(); g.arc(cx, cy, 7, 0, 6.283); g.stroke();
    g.fillStyle = '#ffffff'; g.fillRect(Math.round(cx + Math.cos(roll) * 5), Math.round(cy + Math.sin(roll) * 5), 1, 1);
    g.fillRect(Math.round(cx - 4), Math.round(cy - 4), 2, 1);
  }

  function openComet(W, api) {
    const SP = cometSprites();
    W.body.innerHTML = `<div class="ccm"><div class="ccm-wrap"><canvas aria-label="Captain Comet game screen"></canvas></div>
      <div class="ccm-pad">
        <div class="ccm-grp"><button class="btn ccm-b" data-k="left" aria-label="Walk left">${arrowSvg(-1)}</button><button class="btn ccm-b" data-k="right" aria-label="Walk right">${arrowSvg(1)}</button></div>
        <button class="btn ccm-b ccm-sm" data-k="pause" aria-label="Pause">II</button>
        <div class="ccm-grp"><button class="btn ccm-b" data-k="pogo">POGO</button><button class="btn ccm-b" data-k="fire">ZAP</button><button class="btn ccm-b ccm-j" data-k="jump">JUMP</button></div>
      </div></div>`;
    const root = W.body.firstChild, wrap = root.querySelector('.ccm-wrap'), cv = root.querySelector('canvas'), g = cv.getContext('2d'), padEl = root.querySelector('.ccm-pad');
    let opts = Object.assign({ sound: true, music: true, pad: true }, api.load('opts', {}));
    let best = api.load('best', 0);
    let S = api.load('game', null);
    let mode = 'title', VH = 200, ppx = 1, closed = false, raf = 0, last = 0, accum = 0, tt = 0, paused = false, modeT = 0;
    let L = null, P = null, cam = { x: 0, y: 0 }, shake = 0;
    let mapX = 0, mapY = 0, cheat = '', god = false, musicOn = false;
    const K = {}, PR = {};
    const vga = api.era.id !== '1990';
    padEl.hidden = !opts.pad;

    const snd = fn => { if (opts.sound) try { fn(); } catch (e) {} };
    const tone = (f, d, o) => api.tone(f, d, o);
    const SND = {
      jump: () => snd(() => tone(330, 0.12, { to: 700, type: 'square', vol: 0.03 })),
      boing: hi => snd(() => tone(160, hi ? 0.24 : 0.14, { to: hi ? 950 : 520, type: 'triangle', vol: 0.08 })),
      zap: () => snd(() => tone(1600, 0.12, { to: 260, type: 'sawtooth', vol: 0.025 })),
      daze: () => snd(() => { tone(900, 0.3, { to: 180, type: 'square', vol: 0.025 }); tone(1200, 0.1, { at: 0.05, vol: 0.02 }); }),
      pop: () => snd(() => { api.noise(0.12, { ft: 'bandpass', f: 1500, q: 1, vol: 0.08, decay: 1 }); tone(500, 0.12, { to: 1500, vol: 0.04 }); }),
      item: (n = 0) => snd(() => { tone(988 + n * 60, 0.05, { type: 'square', vol: 0.03 }); tone(1319 + n * 80, 0.08, { type: 'square', vol: 0.03, at: 0.05 }); }),
      key: () => snd(() => [0, 4, 7, 12].forEach((n, i) => tone(api.midi(76 + n), 0.07, { type: 'square', vol: 0.03, at: i * 0.06 }))),
      door: () => snd(() => { tone(200, 0.3, { to: 90, type: 'sawtooth', vol: 0.04 }); api.noise(0.3, { ft: 'lowpass', f: 700, vol: 0.06, decay: 1 }); }),
      spring: () => snd(() => tone(120, 0.35, { to: 1300, type: 'triangle', vol: 0.08 })),
      bonk: () => snd(() => tone(140, 0.06, { type: 'square', vol: 0.03 })),
      cp: () => snd(() => [0, 7, 12].forEach((n, i) => tone(api.midi(72 + n), 0.09, { type: 'triangle', vol: 0.06, at: i * 0.08 }))),
      life: () => snd(() => [0, 4, 7, 12, 16, 19, 24].forEach((n, i) => tone(api.midi(67 + n), 0.08, { type: 'square', vol: 0.03, at: i * 0.06 }))),
      die: () => snd(() => [72, 67, 64, 60, 55].forEach((n, i) => tone(api.midi(n), 0.14, { type: 'square', vol: 0.035, at: i * 0.12 }))),
      clear: () => snd(() => [60, 64, 67, 72, 67, 72, 76, 79].forEach((n, i) => tone(api.midi(n), 0.12, { type: 'square', vol: 0.035, at: i * 0.1 }))),
      spit: () => snd(() => tone(300, 0.1, { to: 120, type: 'square', vol: 0.025 })),
      splat: () => snd(() => api.noise(0.1, { ft: 'lowpass', f: 800, vol: 0.06, decay: 1 })),
      hop: () => snd(() => tone(250, 0.1, { to: 500, type: 'triangle', vol: 0.03 })),
      hit: () => snd(() => { api.noise(0.08, { ft: 'bandpass', f: 2500, q: 2, vol: 0.07, decay: 1 }); tone(200, 0.1, { to: 80, type: 'square', vol: 0.03 }); }),
      boom: () => snd(() => { api.noise(0.5, { ft: 'lowpass', f: 700, vol: 0.12, decay: 1 }); tone(120, 0.4, { to: 40, type: 'sawtooth', vol: 0.05 }); }),
      launch: () => snd(() => { api.noise(1.4, { ft: 'lowpass', f: 1200, vol: 0.08, decay: 1 }); tone(80, 1.4, { to: 600, type: 'sawtooth', vol: 0.03 }); }),
      win: () => snd(() => [60, 64, 67, 72, 0, 67, 72, 76, 79, 84].forEach((n, i) => n && tone(api.midi(n), 0.16, { type: 'square', vol: 0.035, at: i * 0.12 }))),
      warn: () => snd(() => { for (let i = 0; i < 4; i++) tone(i % 2 ? 330 : 247, 0.22, { type: 'square', vol: 0.035, at: i * 0.26 }); })
    };
    const SONG = { mel: [72, 0, 76, 79, 76, 0, 72, 0, 74, 0, 77, 81, 79, 0, 77, 0, 76, 0, 79, 84, 83, 0, 79, 0, 81, 79, 77, 76, 74, 0, 72, 0], bass: [48, 53, 55, 48, 48, 53, 55, 43], step: 0.14, lead: 'square', leadVol: 0.022, bassVol: 0.06 };
    function music(on) {
      on = on && opts.music && opts.sound;
      if (on && !musicOn) { try { api.playMusic(SONG); musicOn = true; } catch (e) {} }
      else if (!on && musicOn) { api.stopMusic(); musicOn = false; }
    }

    /* ---- session & saving ---- */
    const freshSession = () => ({ cleared: [false, false, false, false, false, false, false], score: 0, lives: 3, node: 0, all: false, next: 20000 });
    const saveGame = () => { if (S) api.save('game', { cleared: S.cleared, score: S.score, lives: S.lives, node: S.node, all: S.all, next: S.next }); };
    const noteBest = () => { if (S && S.score > best) { best = S.score; api.save('best', best); } };
    const unlocked = i => i === 0 || S.all || S.cleared[i - 1] || S.cleared[i];

    function menus() {
      api.menubar([
        { label: 'Game', items: () => [
          { label: 'New game', fn: askNew },
          { label: S ? 'Star map' : 'Start', fn: () => { if (!S) { newGame(); return; } if (mode === 'play') confirmQuit(); else toMap(); } },
          { label: paused ? 'Resume' : 'Pause', fn: togglePause, disabled: mode !== 'play' },
          '-', { label: 'Exit', fn: () => api.close() }
        ] },
        { label: 'Options', items: () => [
          { label: (opts.sound ? '[x] ' : '[ ] ') + 'Sound', fn: () => { opts.sound = !opts.sound; saveOpts(); music(mode === 'map' || mode === 'title'); } },
          { label: (opts.music ? '[x] ' : '[ ] ') + 'Music on the map', fn: () => { opts.music = !opts.music; saveOpts(); music(mode === 'map' || mode === 'title'); } },
          { label: (opts.pad ? '[x] ' : '[ ] ') + 'On-screen buttons', fn: () => { opts.pad = !opts.pad; padEl.hidden = !opts.pad; saveOpts(); setTimeout(fit, 0); } }
        ] },
        { label: 'Help', items: [
          { label: 'How to play', fn: help },
          { label: 'The story', fn: () => api.msgBox('The story', STORY) },
          { label: 'About Captain Comet', fn: () => api.msgBox('About Captain Comet', 'Captain Comet in The Great Gloop Invasion\nVersion 1.0\nBackyard Rocket Software, 1990\n\nStarring Captain Comet and Nibbles the space hamster.') }
        ] }
      ]);
    }
    const saveOpts = () => api.save('opts', opts);
    const STORY = 'Every night after homework, Casey Starr puts on a colander helmet, straps on a cardboard jetpack and becomes CAPTAIN COMET, defender of the backyard!\n\nTonight a slimy saucer landed behind the garage. It is Emperor Gloop of planet Gunkulon, and he wants to turn the Moon into one giant wobbly jelly.\n\nGrab your pogo stick and your trusty Zapper. Nibbles the space hamster is rolling right behind you. Blast off!';
    function help() {
      const was = paused; if (mode === 'play' && !paused) togglePause();
      api.msgBox('How to play', 'Keyboard: LEFT/RIGHT (or A/D) walk. JUMP is Space or Ctrl: hold it for higher jumps, and hold it while falling to puff your jetpack and float. ZAP is Alt or X (hold UP or W to zap upward). POGO is Down, S or C: it turns your pogo stick on and off. Hold JUMP as you land on the pogo stick for a super bounce. P pauses.\n\nTouch: use the on-screen buttons.\n\nZapped critters get dizzy for a while and cannot hurt you. Pogo onto a dizzy critter to pop it for 200 points. Pogo onto a wide-awake critter to make it dizzy.\n\nGrab keycards to open doors of the same color. Touch a flag to set a checkpoint. Reach the cardboard rocket to finish a level. Extra life every 20,000 points.\n\nYou earn $2 the first time you clear each level and $5 for beating Emperor Gloop.').then(() => { if (!was && paused && mode === 'play') togglePause(); });
    }
    function askNew() {
      const go = () => { newGame(); };
      if (S && S.cleared.some(Boolean)) api.msgBox('Captain Comet', 'Start a new game? Your saved star map progress will be erased.', ['Yes', 'No'], 'warn').then(b => { if (b === 'Yes') go(); });
      else go();
    }
    function confirmQuit() {
      if (!paused) togglePause();
      api.msgBox('Captain Comet', 'Leave this level and go back to the star map?', ['Yes', 'No']).then(b => { if (b === 'Yes') { paused = false; toMap(); } });
    }
    function newGame() { S = freshSession(); saveGame(); mode = 'story'; modeT = 0; paused = false; god = false; music(true); }
    function toTitle() { mode = 'title'; modeT = 0; L = null; music(true); }
    function toMap() {
      mode = 'map'; modeT = 0; L = null; paused = false;
      if (S.lives <= 0) { noteBest(); S.lives = 3; S.score = 0; S.next = 20000; }
      [mapX, mapY] = nodeXY(S.node);
      saveGame(); music(true);
    }
    function togglePause() { if (mode !== 'play') return; paused = !paused; clearKeys(); }

    /* ---- level ---- */
    function startLevel(i) {
      const def = LEVELS[i], rows = buildRows(def);
      L = { i, def, th: THEMES[def.theme], H: rows.length, W: rows[0].length, g: rows.map(r => [...r]), spawns: [], ents: [], plats: [], hints: {}, popped: new Set(), cp: null, springs: {}, grav: def.grav || 1, ice: !!def.ice, shots: [], balls: [], parts: [], floats: [], boss: null, phase: 'run', t: 0, clearT: 0, banner: { a: 'LEVEL ' + (i + 1), b: def.name.toUpperCase(), t: 2.4 }, rocket: null, hint: null, hist: [], got: 0 };
      let hn = 0, start = { c: 1, r: 1 };
      for (let r = 0; r < L.H; r++) for (let c = 0; c < L.W; c++) {
        const ch = L.g[r][c];
        if (ch === 'P') { start = { c, r }; L.g[r][c] = '.'; }
        else if ('whft'.includes(ch)) { L.spawns.push({ type: ch, c, r, idx: L.spawns.length }); L.g[r][c] = '.'; }
        else if (ch === 'M') { L.plats.push({ x: c * T, y: r * T, w: 48, h: 6, vx: 36, dx: 0 }); L.g[r][c] = '.'; }
        else if (ch === 'G') { L.bossAt = { c, r }; L.g[r][c] = '.'; }
        else if (ch === '?') L.hints[c + ',' + r] = def.hints[hn++] || '';
        else if (ch === 'E') L.exit = { c, r };
      }
      L.start = start;
      P = { x: start.c * T + 3, y: (start.r + 1) * T - 22, w: 10, h: 22, vx: 0, vy: 0, face: 1, ground: false, pogo: false, jbuf: 0, coy: 0, jumping: false, puff: 0.8, puffing: false, cd: 0, shootT: 0, inv: 0, dead: false, deadT: 0, anim: 0, squash: 0, keys: { r: false, y: false, b: false }, prevB: 0, onPlat: null, springy: false, rot: 0 };
      spawnEnemies();
      if (L.bossAt) L.boss = { x: L.bossAt.c * T - 16, y: -70, w: 48, h: 36, hp: 30, max: 30, st: 'intro', t: 0, vx: 55, bombT: 1.6, inv: 0, flash: 0, charges: 0 };
      mode = 'play'; paused = false; modeT = 0;
      cam = { x: 0, y: 0 }; camUpdate(0, true);
      music(false);
      if (L.boss) SND.warn();
    }
    function spawnEnemies() {
      L.ents = L.spawns.filter(s => !L.popped.has(s.idx)).map(makeEnemy);
    }
    function makeEnemy(s) {
      const x = s.c * T, y = s.r * T, b = { type: s.type, idx: s.idx, daze: 0, t: Math.random() * 3, face: -1, vx: 0, vy: 0, ground: false, open: 0 };
      if (s.type === 'w') return Object.assign(b, { x: x + 1, y: y + 4, w: 14, h: 12 });
      if (s.type === 'h') return Object.assign(b, { x: x + 2, y: y + 2, w: 12, h: 14, wait: rnd(0.5, 1.5) });
      if (s.type === 'f') return Object.assign(b, { x: x + 1, y: y + 3, w: 14, h: 10, hx: x + 1, hy: y + 3, vx: -34, back: false });
      return Object.assign(b, { x, y, w: 16, h: 16, cd: rnd(1, 2) });
    }
    const tAt = (c, r) => (r < 0 || r >= L.H) ? '.' : (c < 0 || c >= L.W) ? 'X' : L.g[r][c];

    // Move a body through the tile map. Returns what it bumped into.
    function moveBody(b, dt, oneWay = true) {
      const res = { hx: false, land: false, ceil: false, spring: null };
      b.x += b.vx * dt;
      const top = Math.floor(b.y / T), bot = Math.floor((b.y + b.h - 0.01) / T);
      if (b.vx > 0) {
        const c = Math.floor((b.x + b.w - 0.01) / T);
        for (let r = top; r <= bot; r++) if (isSolid(tAt(c, r))) { b.x = c * T - b.w; res.hx = true; break; }
      } else if (b.vx < 0) {
        const c = Math.floor(b.x / T);
        for (let r = top; r <= bot; r++) if (isSolid(tAt(c, r))) { b.x = (c + 1) * T; res.hx = true; break; }
      }
      const prevB = b.y + b.h;
      b.y += b.vy * dt;
      const c0 = Math.floor(b.x / T), c1 = Math.floor((b.x + b.w - 0.01) / T);
      if (b.vy > 0) {
        const r = Math.floor((b.y + b.h - 0.01) / T);
        for (let c = c0; c <= c1; c++) {
          const ch = tAt(c, r);
          if (isSolid(ch) || (oneWay && ch === '=' && prevB <= r * T + 0.5)) { b.y = r * T - b.h; res.land = true; if (ch === 'S') res.spring = { c, r }; }
        }
      } else if (b.vy < 0) {
        const r = Math.floor(b.y / T);
        for (let c = c0; c <= c1; c++) if (isSolid(tAt(c, r))) { b.y = (r + 1) * T; res.ceil = true; break; }
      }
      return res;
    }
    const overlap = (a, b, s = 0) => a.x + s < b.x + b.w && a.x + a.w - s > b.x && a.y + s < b.y + b.h && a.y + a.h - s > b.y;

    function addScore(n, x, y) {
      S.score += n;
      if (x != null && L) L.floats.push({ x, y, t: 0.9, s: '' + n });
      if (S.score >= S.next) { S.next += 20000; S.lives = Math.min(9, S.lives + 1); SND.life(); if (L) L.floats.push({ x: P.x, y: P.y - 8, t: 1.4, s: '1UP!' }); }
    }
    function burst(x, y, cols, n = 10, sp = 70, grav = 200) {
      for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, v = rnd(15, sp); L.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 20, g: grav, life: rnd(0.3, 0.8), c: cols[i % cols.length] }); }
    }
    function daze(e) {
      if (e.daze <= 0) addScore(50, e.x, e.y - 4);
      e.daze = 6; e.vx = e.type === 'f' ? 0 : e.vx; SND.daze();
      burst(e.x + e.w / 2, e.y + e.h / 2, ['#ffff55', '#ffffff'], 6, 50, 0);
    }
    function pop(e) {
      if (e.idx >= 0) L.popped.add(e.idx);
      L.ents.splice(L.ents.indexOf(e), 1);
      addScore(200, e.x, e.y - 4);
      burst(e.x + e.w / 2, e.y + e.h / 2, e.type === 'w' ? ['#55ff55', '#00aa00', '#ccffcc'] : e.type === 'h' ? ['#ff55ff', '#aa00aa'] : e.type === 'f' ? ['#aaaaaa', '#ff5555'] : ['#ff5555', '#aa0000'], 16, 90);
      SND.pop();
    }
    function die() {
      if (P.dead || P.inv > 0 || god || L.phase !== 'run') return;
      P.dead = true; P.deadT = 1.8; P.vy = -300; P.vx = 0; P.pogo = false;
      S.lives--; SND.die(); shake = 0.3;
    }
    function afterDeath() {
      if (S.lives <= 0) { noteBest(); mode = 'over'; modeT = 0; return; }
      const sp = L.cp || L.start;
      P.x = sp.c * T + 3; P.y = (sp.r + 1) * T - 22; P.vx = 0; P.vy = 0; P.dead = false; P.inv = 1.6; P.pogo = false; P.puff = 0.8; P.onPlat = null; P.rot = 0;
      L.shots = []; L.balls = []; L.hist = []; L.ham = null;
      if (L.boss) { L.ents = []; const B = L.boss; if (B.st !== 'dying') { B.st = 'rise'; B.t = 0; } }
      else spawnEnemies();
      camUpdate(0, true);
    }
    function openDoor(c, r, ch) {
      const q = [[c, r]];
      while (q.length) {
        const [x, y] = q.pop();
        if (tAt(x, y) !== ch || x < 0 || x >= L.W) continue;
        L.g[y][x] = '.';
        burst(x * T + 8, y * T + 8, ['#ffffff', ch === 'R' ? '#ff5555' : ch === 'Y' ? '#ffff55' : '#5555ff'], 6, 50);
        q.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
      }
      SND.door();
    }

    /* ---- update ---- */
    const STEP = 1 / 120;
    function update(dt) {
      L.t += dt; tt += dt;
      if (L.banner && (L.banner.t -= dt) <= 0) L.banner = null;
      if (shake > 0) shake = Math.max(0, shake - dt);
      // rafts
      for (const p of L.plats) {
        const ox = p.x; p.x += p.vx * dt;
        const row = Math.floor((p.y + 1) / T);
        const lead = p.vx > 0 ? Math.floor((p.x + p.w - 0.01) / T) : Math.floor(p.x / T);
        const ch = tAt(lead, row);
        if (isSolid(ch) || ch === '|') { p.x = p.vx > 0 ? lead * T - p.w : (lead + 1) * T; p.vx = -p.vx; }
        p.dx = p.x - ox;
      }
      updPlayer(dt);
      updEnemies(dt);
      if (L.boss) updBoss(dt);
      if (!L || mode !== 'play') return;
      // shots
      for (const s of L.shots) {
        s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
        const cx = s.x + s.w / 2, cy = s.y + s.h / 2;
        if (isSolid(tAt(Math.floor(cx / T), Math.floor(cy / T)))) { s.life = 0; burst(cx, cy, ['#55ffff', '#ffffff'], 4, 40, 0); }
        if (s.life <= 0) continue;
        for (const e of L.ents) if (overlap(s, e)) { s.life = 0; daze(e); break; }
        if (s.life > 0) for (const b of L.balls) if (b.life > 0 && Math.abs(b.x - cx) < 6 && Math.abs(b.y - cy) < 6) { b.life = 0; s.life = 0; addScore(10, b.x, b.y); burst(b.x, b.y, ['#ff55ff', '#ffffff'], 5, 40); break; }
        const B = L.boss;
        if (s.life > 0 && B && ['hover', 'dive', 'charge', 'rise'].includes(B.st) && overlap(s, B)) { s.life = 0; hurtBoss(1); }
      }
      L.shots = L.shots.filter(s => s.life > 0);
      // gloop balls & bombs
      for (const b of L.balls) {
        if (b.bomb) b.vy += 420 * dt;
        b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
        const ch = tAt(Math.floor(b.x / T), Math.floor((b.y + (b.bomb ? 4 : 0)) / T));
        if (isSolid(ch) || ch === '=') {
          b.life = 0; burst(b.x, b.y, ['#ff55ff', '#aa00aa'], 8, 60); SND.splat();
          if (b.bomb && L.boss && L.boss.hp < 22 && L.ents.length < 2 && Math.random() < 0.45) {
            const e = makeEnemy({ type: 'w', c: Math.floor(b.x / T), r: Math.floor(b.y / T) - 1, idx: -1 }); e.face = P.x < b.x ? -1 : 1; L.ents.push(e);
          }
        }
        if (b.life > 0 && !P.dead && Math.abs(b.x - (P.x + 5)) < 7 && Math.abs(b.y - (P.y + 11)) < 13) { b.life = 0; die(); }
      }
      L.balls = L.balls.filter(b => b.life > 0);
      // particles & floaters
      for (const p of L.parts) { p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
      L.parts = L.parts.filter(p => p.life > 0);
      for (const f of L.floats) { f.y -= 22 * dt; f.t -= dt; }
      L.floats = L.floats.filter(f => f.t > 0);
      for (const k in L.springs) if ((L.springs[k] -= dt) <= 0) delete L.springs[k];
      // level clear rocket
      if (L.phase === 'clear') {
        L.clearT += dt;
        const R = L.rocket;
        if (L.clearT > 0.5) { R.v += 260 * dt; R.y -= R.v * dt; if (Math.random() < 0.8) L.parts.push({ x: R.x + rnd(-4, 4), y: R.by - R.y + 2, vx: rnd(-20, 20), vy: rnd(30, 70), g: 0, life: rnd(0.3, 0.7), c: Math.random() < 0.5 ? '#ffff55' : Math.random() < 0.5 ? '#ff5555' : '#aaaaaa' }); }
        if (L.clearT > 3) levelDone();
      }
      camUpdate(dt);
    }
    function updPlayer(dt) {
      const p = P;
      if (L.phase !== 'run') return;
      if (p.dead) {
        p.deadT -= dt; p.vy += 700 * dt; p.y += p.vy * dt; p.rot += dt * 8;
        if (p.deadT <= 0) afterDeath();
        return;
      }
      if (p.inv > 0) p.inv -= dt;
      if (p.squash > 0) p.squash -= dt;
      const grav = 900 * L.grav;
      const dir = (K.right ? 1 : 0) - (K.left ? 1 : 0);
      if (dir) p.face = dir;
      const ice = L.ice && p.ground && !p.pogo;
      if (dir) p.vx = approach(p.vx, dir * 105, (p.ground ? (ice ? 240 : 1100) : 650) * dt);
      else p.vx = approach(p.vx, 0, (p.ground ? (ice ? 110 : 1300) : 260) * dt);
      if (PR.pogo) {
        PR.pogo = false; p.pogo = !p.pogo;
        snd(() => tone(p.pogo ? 500 : 300, 0.06, { type: 'square', vol: 0.03 }));
        if (p.pogo && p.ground) { p.vy = -250; p.ground = false; p.onPlat = null; SND.boing(false); }
      }
      if (PR.jump) { PR.jump = false; p.jbuf = 0.12; }
      p.jbuf -= dt;
      p.coy = p.ground ? 0.09 : p.coy - dt;
      if (!p.pogo && p.jbuf > 0 && p.coy > 0) { p.vy = -320; p.jbuf = 0; p.coy = 0; p.ground = false; p.onPlat = null; p.jumping = true; SND.jump(); }
      if (p.jumping && !K.jump && p.vy < -130) { p.vy = -130; p.jumping = false; }
      if (p.vy >= 0) { p.jumping = false; p.springy = false; }
      p.vy += grav * dt;
      p.puffing = false;
      if (!p.pogo && !p.ground && p.vy > 30 && K.jump && p.puff > 0) {
        p.vy = Math.min(p.vy, 45); p.puff -= dt; p.puffing = true;
        if (Math.random() < 0.5) L.parts.push({ x: p.x + (p.face > 0 ? 0 : 10), y: p.y + 20, vx: rnd(-10, 10), vy: rnd(20, 50), g: 0, life: 0.35, c: Math.random() < 0.5 ? '#ffff55' : '#aaaaaa' });
      }
      p.vy = Math.min(p.vy, 420);
      // fire
      p.cd -= dt; if (p.shootT > 0) p.shootT -= dt;
      if ((PR.fire || (K.fire && p.cd < -0.1)) && p.cd <= 0 && L.shots.length < 3) {
        PR.fire = false; p.cd = 0.3; p.shootT = 0.15;
        if (K.up) L.shots.push({ x: p.x + p.w / 2 - 1, y: p.y - 6, w: 3, h: 8, vx: 0, vy: -300, life: 0.6 });
        else L.shots.push({ x: p.face > 0 ? p.x + p.w + 2 : p.x - 10, y: p.y + 9, w: 8, h: 3, vx: p.face * 300, vy: 0, life: 0.7 });
        SND.zap();
      }
      PR.fire = false;
      // ride rafts
      if (p.onPlat) { p.x += p.onPlat.dx; }
      p.prevB = p.y + p.h;
      p.ground = false;
      const was = p.onPlat; p.onPlat = null;
      const r = moveBody(p, dt);
      if (r.ceil) { if (p.vy < 0) SND.bonk(); p.vy = 0; p.jumping = false; }
      let landed = r.land, plat = null;
      if (!landed && p.vy >= 0) for (const pl of L.plats) {
        if (p.x + p.w > pl.x && p.x < pl.x + pl.w && p.prevB <= pl.y + 1 + (was === pl ? 2 : 0) && p.y + p.h >= pl.y) { p.y = pl.y - p.h; landed = true; plat = pl; break; }
      }
      if (landed && p.vy >= 0) {
        if (r.spring) {
          p.vy = -520 * Math.sqrt(L.grav); p.springy = true; L.springs[r.spring.c + ',' + r.spring.r] = 0.25; SND.spring();
        } else if (p.pogo) {
          const hi = K.jump; p.vy = (hi ? -440 : -270); p.squash = 0.1; SND.boing(hi);
        } else { p.vy = 0; p.ground = true; p.puff = 0.8; p.onPlat = plat; }
      }
      if (p.y > L.H * T + 40) { if (god) { const sp = L.cp || L.start; p.x = sp.c * T + 3; p.y = (sp.r + 1) * T - 22; p.vy = 0; camUpdate(0, true); return; } die(); if (P.dead) P.deadT = 0.9; return; }
      p.anim += Math.abs(p.vx) * dt;
      // hamster trail
      L.hist.push({ x: p.x, y: p.y, f: p.face }); if (L.hist.length > 40) L.hist.shift();
      {
        const h = L.hist[0], hx = h.x + 5 - h.f * 12, hc = Math.floor(hx / T);
        let target = h.y + 22;
        for (let rr = Math.floor((h.y + 20) / T); rr < Math.min(L.H, Math.floor((h.y + 22) / T) + 12); rr++) { const ch = tAt(hc, rr); if (ch === '~' || ch === '^') break; if (isSolid(ch) || ch === '=') { target = rr * T; break; } }
        if (!L.ham) L.ham = { x: hx, y: target, vy: 0 };
        const H2 = L.ham; H2.x = hx;
        if (target > H2.y + 0.5) { H2.vy = Math.min(H2.vy + 900 * dt, 400); H2.y = Math.min(target, H2.y + H2.vy * dt); }
        else { H2.y = target; H2.vy = 0; }
      }
      // tiles the hero touches
      const c0 = Math.floor(p.x / T), c1 = Math.floor((p.x + p.w - 0.01) / T), r0 = Math.floor(p.y / T), r1 = Math.floor((p.y + p.h - 0.01) / T);
      let hint = null;
      for (let rr = r0; rr <= r1; rr++) for (let cc = c0; cc <= c1; cc++) {
        const ch = tAt(cc, rr), tx = cc * T, ty = rr * T;
        if (ITEMS[ch]) { L.g[rr][cc] = '.'; addScore(ITEMS[ch], tx, ty); SND.item(ch === '*' ? 0 : 3); burst(tx + 8, ty + 8, ['#ffff55', '#ffffff'], 5, 40, 0); }
        else if (ch === 'L') { L.g[rr][cc] = '.'; S.lives = Math.min(9, S.lives + 1); SND.life(); L.floats.push({ x: tx, y: ty, t: 1.4, s: '1UP!' }); }
        else if (ch === 'r' || ch === 'y' || ch === 'b') { L.g[rr][cc] = '.'; p.keys[ch] = true; SND.key(); L.floats.push({ x: tx - 10, y: ty, t: 1.4, s: (ch === 'r' ? 'RED' : ch === 'y' ? 'YELLOW' : 'BLUE') + ' KEY' }); }
        else if (ch === '?') hint = L.hints[cc + ',' + rr];
        else if (ch === 'C') { if (!L.cp || L.cp.c !== cc || L.cp.r !== rr) { L.cp = { c: cc, r: rr }; SND.cp(); L.floats.push({ x: tx - 20, y: ty - 6, t: 1.4, s: 'CHECKPOINT' }); saveGame(); } }
        else if (ch === 'E' && !p.dead) { finishRun(cc, rr); return; }
        else if (ch === '^' && overlap(p, { x: tx + 2, y: ty + 8, w: 12, h: 8 }, 1)) die();
        else if (ch === '~' && overlap(p, { x: tx, y: ty + 5, w: 16, h: 11 }, 1)) die();
      }
      L.hint = hint;
      // doors
      for (let rr = r0; rr <= r1; rr++) for (const cc of [Math.floor((p.x - 2) / T), Math.floor((p.x + p.w + 1) / T)]) {
        const ch = tAt(cc, rr), k = ch === 'R' ? 'r' : ch === 'Y' ? 'y' : ch === 'B' ? 'b' : null;
        if (k && cc >= 0 && cc < L.W && p.keys[k]) openDoor(cc, rr, ch);
      }
    }
    function finishRun(c, r) {
      L.phase = 'clear'; L.clearT = 0;
      L.rocket = { x: c * T + 8, by: (r + 1) * T, y: 0, v: 0 };
      SND.clear(); setTimeout(() => { if (!closed && L && L.phase === 'clear') SND.launch(); }, 500);
      addScore(1000);
      L.banner = { a: 'LEVEL CLEAR!', b: 'BONUS 1000', t: 3 };
    }
    function levelDone() {
      const i = L.i, first = !S.cleared[i];
      S.cleared[i] = true;
      noteBest();
      if (i === LEVELS.length - 1) {
        if (first) api.earn(5, 'defeating Emperor Gloop');
        S.node = i; saveGame(); mode = 'end'; modeT = 0; L = null; SND.win(); music(true);
        return;
      }
      if (first) api.earn(2, 'clearing ' + LEVELS[i].name);
      S.node = Math.min(LEVELS.length - 1, i + 1);
      toMap();
    }
    function updEnemies(dt) {
      const grav = 900 * L.grav, sp = 1 + L.i * 0.07, px = P.x + P.w / 2, py = P.y + P.h / 2;
      for (const e of L.ents.slice()) {
        e.t += dt;
        if (Math.abs(e.x - P.x) > CW * 1.2 && !L.boss) continue;
        if (e.daze > 0) { e.daze -= dt; if (e.daze <= 0) { e.daze = 0; if (e.type === 'f') e.back = true; } }
        if (e.type === 'w') {
          e.vx = e.daze ? 0 : e.face * 30 * sp;
          e.vy = Math.min(e.vy + grav * dt, 400); e.ground = false;
          const r = moveBody(e, dt);
          if (r.land) { e.vy = 0; e.ground = true; }
          if (r.hx) e.face = -e.face;
          if (e.ground && !e.daze) {
            const fx = e.face > 0 ? e.x + e.w + 1 : e.x - 1, ch = tAt(Math.floor(fx / T), Math.floor((e.y + e.h + 2) / T));
            if (!isSolid(ch) && ch !== '=') e.face = -e.face;
          }
          if (e.y > L.H * T + 20) L.ents.splice(L.ents.indexOf(e), 1);
        } else if (e.type === 'h') {
          if (e.ground) {
            e.vx = 0;
            if (!e.daze) { e.wait -= dt; e.face = px > e.x + 6 ? 1 : -1; if (e.wait <= 0 && Math.abs(px - e.x) < 170 && Math.abs(py - e.y) < 90) { e.vx = e.face * 62 * sp; e.vy = -300 * Math.sqrt(L.grav); e.ground = false; e.wait = rnd(0.6, 1.3); if (Math.abs(px - e.x) < 120) SND.hop(); } }
          }
          e.vy = Math.min(e.vy + grav * dt, 400);
          const was = e.ground; e.ground = false;
          const r = moveBody(e, dt);
          if (r.land) { e.vy = 0; e.ground = true; if (!was) e.vx = 0; }
          if (r.hx) e.vx = -e.vx * 0.5;
          if (r.ceil) e.vy = 0;
          if (e.y > L.H * T + 20) L.ents.splice(L.ents.indexOf(e), 1);
        } else if (e.type === 'f') {
          if (e.daze) { e.vx = 0; e.vy = Math.min(e.vy + grav * dt, 300); const r = moveBody(e, dt); if (r.land) e.vy = 0; }
          else if (e.back) { e.vx = 0; e.vy = -45; const r = moveBody(e, dt, false); if (e.y <= e.hy || r.ceil) { e.back = false; e.hy = e.y; } }
          else {
            if (!e.vx) e.vx = (px < e.x ? -34 : 34);
            const ty = e.hy + Math.sin(e.t * 3) * 10; e.vy = (ty - e.y) * 6;
            const r = moveBody(e, dt, false);
            if (r.hx || (e.x > e.hx + 80 && e.vx > 0) || (e.x < e.hx - 80 && e.vx < 0)) e.vx = -e.vx;
            e.face = e.vx > 0 ? 1 : -1;
          }
        } else if (e.type === 't') {
          if (!e.daze) {
            e.face = px > e.x + 8 ? 1 : -1;
            e.cd -= dt; e.open = e.cd < 0.35 ? 1 : 0;
            if (e.cd <= 0) {
              e.cd = Math.max(1.4, 2.4 - L.i * 0.12);
              if (Math.abs(px - (e.x + 8)) < 200 && Math.abs(py - (e.y + 8)) < 52 && !P.dead) { L.balls.push({ x: e.x + (e.face > 0 ? 15 : 1), y: e.y + 5, vx: e.face * 95, vy: 0, life: 3 }); SND.spit(); }
            }
          }
        }
        if (e.type === 'w' || e.type === 'h') {
          if (tAt(Math.floor((e.x + e.w / 2) / T), Math.floor((e.y + e.h - 2) / T)) === '~') { burst(e.x + e.w / 2, e.y + e.h, [L.th.goo, L.th.gooL], 8, 50); SND.splat(); L.ents.splice(L.ents.indexOf(e), 1); continue; }
        }
        // touch the hero
        if (!P.dead && L.phase === 'run' && overlap(P, e, 2)) {
          const stomp = P.vy > 0 && P.prevB <= e.y + 6;
          if (e.daze > 0) { if (stomp && P.pogo) { pop(e); P.vy = K.jump ? -440 : -300; SND.boing(K.jump); } continue; }
          if (stomp) {
            if (P.pogo) { daze(e); P.vy = K.jump ? -440 : -300; SND.boing(K.jump); }
            else { P.vy = -230; SND.bonk(); }
            continue;
          }
          die();
        }
      }
    }
    function hurtBoss(n) {
      const B = L.boss;
      B.hp -= n; B.flash = 0.1; SND.hit(); addScore(100 * n, B.x + 16, B.y - 4);
      if (B.hp <= 0) {
        B.hp = 0; B.st = 'dying'; B.t = 0; L.balls = []; SND.boom(); shake = 1;
        L.ents.slice().forEach(e => pop(e));
      }
    }
    function updBoss(dt) {
      const B = L.boss, px = P.x + P.w / 2;
      B.t += dt; if (B.flash > 0) B.flash -= dt; if (B.inv > 0) B.inv -= dt;
      const rage = 1 + (B.max - B.hp) / B.max * 0.9, HY = 68, GY = 12 * T - B.h, XMIN = 72, XMAX = 200;
      if (B.st === 'intro') {
        B.y += 45 * dt;
        if (B.y >= HY) { B.y = HY; B.st = 'hover'; B.t = 0; }
        if (B.t < 0.1) L.banner = { a: 'EMPEROR GLOOP!', b: 'ZAP HIM AND POGO ON HIS HEAD', t: 3 };
      } else if (B.st === 'hover') {
        B.x += B.vx * rage * dt;
        if (B.x < XMIN) { B.x = XMIN; B.vx = Math.abs(B.vx); } if (B.x > XMAX) { B.x = XMAX; B.vx = -Math.abs(B.vx); }
        B.y = HY + Math.sin(B.t * 2.2) * 4;
        B.bombT -= dt;
        if (B.bombT <= 0 && !P.dead) {
          B.bombT = Math.max(0.7, 1.7 - (rage - 1) * 1.1);
          L.balls.push({ x: B.x + 24, y: B.y + B.h, vx: clamp((px - B.x - 24) * 0.4, -60, 60), vy: 20, bomb: true, life: 5 }); SND.spit();
        }
        if (B.t > Math.max(3.5, 7 - (rage - 1) * 3)) { B.st = 'dive'; B.t = 0; }
      } else if (B.st === 'dive') {
        B.y += 160 * dt;
        if (B.y >= GY) { B.y = GY; B.st = 'charge'; B.t = 0; B.cvx = (px < B.x + 24 ? -1 : 1) * (100 + (rage - 1) * 80); shake = 0.25; SND.boom(); B.charges = 0; }
      } else if (B.st === 'charge') {
        if (B.t < 0.5) { B.x += Math.sin(B.t * 60) * 0.6; }
        else {
          B.x += B.cvx * dt;
          if (B.x < T) { B.x = T; B.cvx = Math.abs(B.cvx); B.charges++; shake = 0.2; SND.bonk(); }
          if (B.x + B.w > (L.W - 1) * T) { B.x = (L.W - 1) * T - B.w; B.cvx = -Math.abs(B.cvx); B.charges++; shake = 0.2; SND.bonk(); }
          if (B.charges >= (rage > 1.5 ? 2 : 1)) { B.st = 'rise'; B.t = 0; }
        }
      } else if (B.st === 'rise') {
        B.y -= 70 * dt; B.x += clamp(136 - B.x, -60 * dt, 60 * dt);
        if (B.y <= HY) { B.y = HY; B.st = 'hover'; B.t = 0; }
      } else if (B.st === 'dying') {
        if (Math.random() < dt * 14) { burst(B.x + rnd(0, 48), B.y + rnd(0, 36), ['#ff55ff', '#ffff55', '#ffffff', '#aa00aa'], 10, 80); if (Math.random() < 0.3) SND.boom(); }
        B.y += 10 * dt;
        if (B.t > 2.8) { B.st = 'gone'; B.t = 0; L.floats.push({ x: B.x + 10, y: B.y, t: 2, s: 'BYE-BYE!' }); }
      } else if (B.st === 'gone') {
        if (B.t > 2.2 && L.phase === 'run') { L.phase = 'won'; levelDone(); }
        return;
      }
      if (!P.dead && L.phase === 'run' && ['hover', 'dive', 'charge', 'rise'].includes(B.st) && overlap(P, B, 3)) {
        const stomp = P.vy > 0 && P.prevB <= B.y + 8;
        if (stomp) { P.vy = -440; SND.boing(true); if (P.pogo && B.inv <= 0) { B.inv = 0.6; hurtBoss(3); } else if (!P.pogo) P.vy = -300; }
        else die();
      }
    }
    function camUpdate(dt, snap) {
      if (!L) return;
      const lw = L.W * T, lh = L.H * T;
      const tx = clamp(P.x + P.w / 2 - CW / 2 + P.face * 20, 0, Math.max(0, lw - CW));
      const ty = lh <= VH ? lh - VH : clamp(P.y + P.h / 2 - VH * 0.55, 0, lh - VH);
      if (snap) { cam.x = tx; cam.y = ty; }
      else { cam.x += (tx - cam.x) * Math.min(1, dt * 7); cam.y += (ty - cam.y) * Math.min(1, dt * 5); }
    }

    /* ---- drawing ---- */
    function drawBg(cx, cy) {
      const th = L.th;
      if (vga && th.sky2) { const gr = g.createLinearGradient(0, 0, 0, VH); gr.addColorStop(0, th.sky); gr.addColorStop(1, th.sky2); g.fillStyle = gr; }
      else g.fillStyle = th.sky;
      g.fillRect(0, 0, CW, VH);
      const bg = th.bg, par = cx * 0.3, base = VH - (L.H * T - cy - 12 * T) * 0.3 - 10;
      if (bg !== 'yard' && bg !== 'swamp') { for (let i = 0; i < 40; i++) { const x = ((hash(i) * 600 - cx * 0.1) % 600 + 600) % 600, y = hash(i + 99) * VH * 0.8; if (x < CW) { g.fillStyle = hash(i + 7) < 0.3 ? '#ffffff' : '#aaaaaa'; g.fillRect(x | 0, y | 0, 1, 1); } } }
      if (bg === 'yard') {
        for (let i = 0; i < 16; i++) { const x = ((hash(i + 3) * 700 - cx * 0.08) % 700 + 700) % 700; if (x < CW) { g.fillStyle = '#ffffff'; g.fillRect(x | 0, (hash(i) * 50) | 0, 1, 1); } }
        g.drawImage(SP.moon, Math.round(CW - 72 - cx * 0.02 % 40), 18);
        for (let i = Math.floor(par / 48) - 1; i < Math.floor(par / 48) + 9; i++) {
          const x = i * 48 - par, h = 26 + hash(i) * 30, y = base - h;
          g.fillStyle = th.far; g.fillRect(Math.round(x), Math.round(y), 40, h + 80);
          for (let k = 0; k < 14; k++) g.fillRect(Math.round(x + 20 - 20 + k), Math.round(y - k * 0.8), 40 - k * 2, 1);
          if (hash(i + 50) < 0.6) { g.fillStyle = '#ffff55'; g.fillRect(Math.round(x + 8), Math.round(y + 10), 5, 5); g.fillRect(Math.round(x + 26), Math.round(y + 10), 5, 5); }
        }
      } else if (bg === 'moon') {
        pixEllipse(g, CW - 70 - (cx * 0.03) % 30, 34, 14, 14, '#0000aa'); g.fillStyle = '#00aa00'; g.fillRect(Math.round(CW - 78 - (cx * 0.03) % 30), 28, 6, 5); g.fillRect(Math.round(CW - 68 - (cx * 0.03) % 30), 37, 5, 4);
        for (let i = Math.floor(par / 40) - 1; i < Math.floor(par / 40) + 10; i++) { const x = i * 40 - par, h = 10 + hash(i) * 22; pixEllipse(g, x + 20, base, 30, h, th.far); }
      } else if (bg === 'swamp') {
        for (let i = Math.floor(par / 36) - 1; i < Math.floor(par / 36) + 11; i++) { const x = i * 36 - par, h = 40 + hash(i) * 40; g.fillStyle = th.far; g.fillRect(Math.round(x + 14), Math.round(base - h), 5, h + 60); pixEllipse(g, x + 16, base - h, 14 + hash(i + 5) * 6, 9, th.far); }
      } else if (bg === 'base') {
        for (let i = Math.floor(par / 64) - 1; i < Math.floor(par / 64) + 7; i++) { const x = i * 64 - par, h = 40 + hash(i) * 50; g.fillStyle = th.far; g.fillRect(Math.round(x), Math.round(base - h), 50, h + 60); g.fillStyle = '#223355'; for (let k = 0; k < 4; k++) g.fillRect(Math.round(x + 6 + k * 11), Math.round(base - h + 8), 6, 3); }
      } else if (bg === 'crystal') {
        for (let i = Math.floor(par / 30) - 1; i < Math.floor(par / 30) + 12; i++) { const x = i * 30 - par, h = 30 + hash(i) * 60; g.fillStyle = th.far; for (let k = 0; k < h; k++) { const w = Math.max(1, Math.round(12 * k / h)); g.fillRect(Math.round(x + 15 - w), Math.round(base - h + k), w * 2, 1); } g.fillRect(Math.round(x + 3), Math.round(base), 24, 60); }
      } else if (bg === 'fort') {
        for (let i = Math.floor(par / 56) - 1; i < Math.floor(par / 56) + 8; i++) { const x = i * 56 - par, h = 50 + hash(i) * 50; g.fillStyle = th.far; g.fillRect(Math.round(x + 8), Math.round(base - h), 30, h + 60); for (let k = 0; k < 4; k++) g.fillRect(Math.round(x + 8 + k * 8), Math.round(base - h - 5), 5, 5); g.fillStyle = '#aa5500'; if (hash(i + 3) < 0.7) g.fillRect(Math.round(x + 20), Math.round(base - h + 14), 4, 6); }
      }
    }
    function drawTile(ch, x, y, c, r) {
      const th = L.th;
      if (ch === '#') {
        g.fillStyle = th.ground; g.fillRect(x, y, T, T);
        g.fillStyle = th.dots; const hs = hash(c * 131 + r * 71); g.fillRect(x + ((hs * 13) | 0), y + ((hs * 97 % 1 * 12) | 0) + 3, 2, 2); g.fillRect(x + ((hs * 7 % 1 * 12) | 0) + 2, y + ((hs * 31 % 1 * 12) | 0) + 1, 1, 1);
        const up = tAt(c, r - 1);
        if (up !== '#') { g.fillStyle = th.top; g.fillRect(x, y, T, 4); g.fillStyle = th.top2; g.fillRect(x, y, T, 1); if (th.bg === 'yard' || th.bg === 'swamp') { g.fillStyle = th.top; g.fillRect(x + (c * 5 % 11), y - 2, 1, 2); g.fillRect(x + (c * 7 % 13) + 2, y - 1, 1, 1); } g.fillStyle = th.top; g.fillRect(x + 3, y + 4, 2, 1); g.fillRect(x + 10, y + 4, 3, 1); }
      } else if (ch === 'X') {
        g.fillStyle = th.block; g.fillRect(x, y, T, T);
        g.fillStyle = th.blockL; g.fillRect(x, y, T, 1); g.fillRect(x, y, 1, T);
        g.fillStyle = th.blockD; g.fillRect(x, y + T - 1, T, 1); g.fillRect(x + T - 1, y, 1, T);
        if (th.rivet) { g.fillStyle = th.rivet; g.fillRect(x + 3, y + 3, 1, 1); g.fillRect(x + 12, y + 3, 1, 1); g.fillRect(x + 3, y + 12, 1, 1); g.fillRect(x + 12, y + 12, 1, 1); }
        else { g.fillStyle = th.blockD; g.fillRect(x, y + 7, T, 1); g.fillRect(x + (r % 2 ? 4 : 11), y, 1, 7); g.fillRect(x + (r % 2 ? 11 : 4), y + 8, 1, 8); }
      } else if (ch === '=') {
        g.fillStyle = th.plat; g.fillRect(x, y, T, 5); g.fillStyle = th.platL; g.fillRect(x, y, T, 1);
        g.fillStyle = '#000'; g.fillRect(x, y + 5, T, 1); g.fillStyle = th.plat; g.fillRect(x + 3, y + 5, 2, 3); g.fillRect(x + 11, y + 5, 2, 3);
      } else if (ch === '^') {
        for (let k = 0; k < 2; k++) for (let i = 0; i < 8; i++) { const w = Math.max(1, i); g.fillStyle = i < 2 ? '#ffffff' : '#aaaaaa'; g.fillRect(x + k * 8 + 4 - w / 2, y + 8 + i, w, 1); g.fillStyle = '#555555'; g.fillRect(x + k * 8 + 4 + w / 2 - 1, y + 8 + i, 1, 1); }
      } else if (ch === '~') {
        const ph = L.t * 3 + c;
        g.fillStyle = th.goo; g.fillRect(x, y + 6, T, T - 6);
        g.fillStyle = th.gooL; for (let i = 0; i < T; i += 2) g.fillRect(x + i, y + 5 + Math.round(Math.sin(ph + i * 0.4)), 2, 1);
        if (hash(c * 7 + ((L.t * 2) | 0)) < 0.15) { g.fillRect(x + 6, y + 9, 2, 2); }
      } else if (ch === 'S') {
        const sq = L.springs[c + ',' + r] ? 5 : 0;
        g.fillStyle = '#555555'; g.fillRect(x + 1, y + 13, 14, 3);
        g.fillStyle = '#aaaaaa'; for (let i = 0; i < 4; i++) g.fillRect(x + (i % 2 ? 5 : 3), y + 5 + sq + i * (8 - sq) / 4, 8, 1);
        g.fillStyle = '#ff5555'; g.fillRect(x + 1, y + 2 + sq, 14, 3); g.fillStyle = '#ffffff'; g.fillRect(x + 2, y + 2 + sq, 12, 1);
      } else if (ch === 'R' || ch === 'Y' || ch === 'B') {
        const col = ch === 'R' ? ['#aa0000', '#ff5555'] : ch === 'Y' ? ['#aa5500', '#ffff55'] : ['#0000aa', '#5555ff'];
        g.fillStyle = col[0]; g.fillRect(x, y, T, T); g.fillStyle = col[1]; g.fillRect(x + 2, y, 2, T); g.fillRect(x + 12, y, 2, T);
        g.fillStyle = '#000'; g.fillRect(x + 6, y + 5, 4, 5); g.fillStyle = col[1]; g.fillRect(x + 7, y + 6, 2, 2);
      } else if (ch === 'r' || ch === 'y' || ch === 'b') {
        const col = ch === 'r' ? ['#aa0000', '#ff5555'] : ch === 'y' ? ['#aa5500', '#ffff55'] : ['#0000aa', '#5555ff'];
        const by = y + 4 + Math.round(Math.sin(L.t * 3 + c) * 1.5);
        g.fillStyle = col[0]; g.fillRect(x + 3, by, 10, 7); g.fillStyle = col[1]; g.fillRect(x + 4, by + 1, 8, 5);
        g.fillStyle = '#fff'; g.fillRect(x + 5, by + 2, 4, 1); g.fillStyle = '#000'; g.fillRect(x + 4, by + 4, 8, 1);
      } else if (ITEMS[ch] || ch === 'L') {
        g.drawImage(SP[ch], x + 4, y + 4 + Math.round(Math.sin(L.t * 3 + c * 0.7) * 1.5));
      } else if (ch === 'C') {
        const on = L.cp && L.cp.c === c && L.cp.r === r;
        g.fillStyle = '#aaaaaa'; g.fillRect(x + 3, y - 6, 2, 22); g.fillStyle = '#555555'; g.fillRect(x + 1, y + 14, 6, 2);
        g.fillStyle = on ? '#55ff55' : '#aa0000'; const wv = Math.round(Math.sin(L.t * 6) * (on ? 1 : 0));
        g.fillRect(x + 5, y - 6 + (on ? 0 : 8), 9, 3); g.fillRect(x + 5, y - 3 + (on ? 0 : 8) + wv, 7, 2); g.fillRect(x + 5, y - 1 + (on ? 0 : 8), 4, 1);
      } else if (ch === '?') {
        g.fillStyle = '#553300'; g.fillRect(x + 7, y + 8, 2, 8);
        g.fillStyle = '#aa5500'; g.fillRect(x + 1, y, 14, 10); g.fillStyle = '#ffaa55'; g.fillRect(x + 1, y, 14, 1);
        txt(g, '?', x + 8, y + 5, 9, '#ffff55', 'center', true, null);
      } else if (ch === 'E') drawRocket(x + 8, y + T, 0, false);
    }
    function drawRocket(cx, by, lift, flame) {
      const x = Math.round(cx - 8), y = Math.round(by - 40 - lift);
      if (flame) { g.fillStyle = (L.t * 20 | 0) % 2 ? '#ffff55' : '#ff5555'; g.fillRect(x + 4, y + 40, 8, 4 + (L.t * 30 % 5 | 0)); g.fillStyle = '#ffffff'; g.fillRect(x + 6, y + 40, 4, 3); }
      g.fillStyle = '#aa0000'; g.fillRect(x - 3, y + 30, 4, 10); g.fillRect(x + 15, y + 30, 4, 10);
      g.fillStyle = '#aa5500'; g.fillRect(x, y + 10, 16, 30);
      for (let i = 0; i < 10; i++) { const w = Math.round(8 * (i + 1) / 10); g.fillRect(x + 8 - w, y + i, w * 2, 1); }
      g.fillStyle = '#ffaa55'; g.fillRect(x + 1, y + 10, 2, 30);
      g.fillStyle = '#aaaaaa'; g.fillRect(x, y + 12, 16, 2); g.fillRect(x, y + 34, 16, 2);
      g.fillStyle = '#000'; g.fillRect(x + 4, y + 17, 8, 8); g.fillStyle = '#55ffff'; g.fillRect(x + 5, y + 18, 6, 6); g.fillStyle = '#fff'; g.fillRect(x + 6, y + 19, 2, 2);
      g.fillStyle = '#553300'; g.fillRect(x + 5, y + 28, 6, 1);
    }
    function drawEnemy(e) {
      const x = Math.round(e.x), y = Math.round(e.y), L2 = e.face < 0 ? 'L' : '';
      let img;
      if (e.type === 'w') img = SP[(e.daze ? 'globD' : (e.t * 4 | 0) % 2 ? 'globB' : 'glob') + L2];
      else if (e.type === 'h') img = SP[(e.daze ? 'hopD' : 'hop') + L2];
      else if (e.type === 'f') img = SP[(e.daze ? 'botD' : (e.t * 12 | 0) % 2 ? 'botB' : 'bot') + L2];
      else img = SP[(e.daze ? 'podD' : e.open ? 'podO' : 'pod') + (e.face > 0 ? '' : 'L')];
      if (e.daze > 0 && e.daze < 1.5 && (e.t * 10 | 0) % 2) g.globalAlpha = 0.5;
      g.drawImage(img, x, y);
      g.globalAlpha = 1;
      if (e.daze > 0) for (let i = 0; i < 3; i++) { const a = e.t * 5 + i * 2.1; g.fillStyle = i % 2 ? '#ffffff' : '#ffff55'; g.fillRect(Math.round(x + e.w / 2 + Math.cos(a) * 7), Math.round(y - 3 + Math.sin(a) * 2), 2, 2); }
    }
    function drawBoss(B) {
      if (B.st === 'gone') {
        const x = B.x + 24 + B.t * 60, y = B.y - B.t * 60;
        pixEllipse(g, x, y, 5, 4, '#ff55ff'); g.fillStyle = '#ffff55'; g.fillRect(Math.round(x - 3), Math.round(y - 6), 6, 2);
        return;
      }
      const x = Math.round(B.x), y = Math.round(B.y) + (B.st === 'dying' ? Math.round(rnd(-1, 1)) : 0), wh = B.flash > 0 || (B.inv > 0 && (L.t * 20 | 0) % 2);
      const wob = Math.round(Math.sin(L.t * 5) * 1.5);
      pixEllipse(g, x + 24, y + 16, 19 + wob, 15 - wob, wh ? '#ffffff' : '#aa00aa');
      pixEllipse(g, x + 24, y + 16, 16 + wob, 12 - wob, wh ? '#ffffff' : '#ff55ff');
      g.fillStyle = wh ? '#fff' : '#ffccff'; g.fillRect(x + 12, y + 8, 4, 3); g.fillRect(x + 11, y + 11, 2, 2);
      // eyes and mouth
      const look = clamp((P.x - x - 24) / 40, -1, 1) * 2 | 0;
      g.fillStyle = '#fff'; g.fillRect(x + 15, y + 10, 7, 6); g.fillRect(x + 27, y + 10, 7, 6);
      g.fillStyle = '#000'; g.fillRect(x + 18 + look, y + 12, 2, 3); g.fillRect(x + 30 + look, y + 12, 2, 3);
      g.fillStyle = '#550055'; g.fillRect(x + 14, y + 8, 8, 2); g.fillRect(x + 28, y + 8, 8, 2);
      g.fillStyle = '#330033'; g.fillRect(x + 18, y + 20, 13, 3); g.fillStyle = '#fff'; g.fillRect(x + 19, y + 20, 2, 1); g.fillRect(x + 28, y + 20, 2, 1);
      // crown
      g.fillStyle = '#ffff55'; g.fillRect(x + 16, y - 3, 17, 4); g.fillRect(x + 16, y - 7, 3, 4); g.fillRect(x + 23, y - 8, 3, 5); g.fillRect(x + 30, y - 7, 3, 4);
      g.fillStyle = '#ff5555'; g.fillRect(x + 24, y - 2, 2, 2); g.fillStyle = '#55ffff'; g.fillRect(x + 19, y - 2, 1, 1); g.fillRect(x + 29, y - 2, 1, 1);
      // saucer cup
      pixEllipse(g, x + 24, y + 30, 25, 7, '#555555'); pixEllipse(g, x + 24, y + 29, 23, 5, '#aaaaaa');
      g.fillStyle = '#ffffff'; g.fillRect(x + 8, y + 26, 30, 1);
      for (let i = 0; i < 5; i++) { g.fillStyle = ((L.t * 6 | 0) + i) % 2 ? '#ffff55' : '#ff5555'; g.fillRect(x + 6 + i * 9, y + 31, 3, 2); }
      if (B.st === 'charge' || B.st === 'dive') { g.fillStyle = '#55ffff'; g.fillRect(x + 18, y + 35, 12, 1); }
    }
    function drawHud() {
      g.fillStyle = 'rgba(0,0,0,.65)'; g.fillRect(0, 0, CW, 12);
      txt(g, 'SCORE ' + pad6(S.score), 3, 6.5, 9, '#ffffff', 'left');
      const lx = Math.round(CW * 0.37), kx = Math.round(CW * 0.5);
      g.drawImage(SP.L, lx, 2); txt(g, 'x' + S.lives, lx + 10, 6.5, 9, '#ffff55', 'left');
      [['r', '#ff5555'], ['y', '#ffff55'], ['b', '#5555ff']].forEach(([k, c], i) => { g.fillStyle = P.keys[k] ? c : '#333333'; g.fillRect(kx + i * 11, 3, 8, 6); if (P.keys[k]) { g.fillStyle = '#000'; g.fillRect(kx + 1 + i * 11, 6, 6, 1); } });
      txt(g, (god ? 'GOD  ' : '') + 'LEVEL ' + (L.i + 1), CW - 3, 6.5, 9, god ? '#ff55ff' : '#55ffff', 'right');
      if (L.boss && L.boss.st !== 'gone') {
        const B = L.boss, w = 120, x = (CW - w) / 2;
        g.fillStyle = '#000'; g.fillRect(x - 1, 15, w + 2, 6); g.fillStyle = '#550055'; g.fillRect(x, 16, w, 4);
        g.fillStyle = '#ff55ff'; g.fillRect(x, 16, Math.ceil(w * B.hp / B.max), 4);
        txt(g, 'EMPEROR GLOOP', CW / 2, 26, 8, '#ffccff');
      }
    }
    function drawHintBox(text) {
      const lines = wrapLines(g, text, CW - 28, 8), h = lines.length * 9 + 8, y = 16;
      g.fillStyle = '#0000aa'; g.fillRect(8, y, CW - 16, h); g.strokeStyle = '#55ffff'; g.lineWidth = 1; g.strokeRect(9.5, y + 1.5, CW - 19, h - 3);
      lines.forEach((l, i) => txt(g, l, 14, y + 8 + i * 9, 8, '#ffffff', 'left', true, null));
    }
    function drawPlay() {
      const cx = Math.round(cam.x), cy = Math.round(cam.y);
      g.save();
      if (shake > 0) g.translate(Math.round(rnd(-2, 2) * shake * 3), Math.round(rnd(-2, 2) * shake * 3));
      drawBg(cx, cy);
      g.translate(-cx, -cy);
      const c0 = Math.floor(cx / T) - 1, c1 = Math.floor((cx + CW) / T) + 1, r0 = Math.max(0, Math.floor(cy / T) - 1), r1 = Math.min(L.H - 1, Math.floor((cy + VH) / T) + 1);
      for (let r = r0; r <= r1; r++) for (let c = Math.max(0, c0); c <= Math.min(L.W - 1, c1); c++) {
        const ch = L.g[r][c];
        if (ch !== '.' && ch !== '|' && ch !== 'E') drawTile(ch, c * T, r * T, c, r);
      }
      if (L.exit) { if (L.phase === 'clear') drawRocket(L.rocket.x, L.rocket.by, L.rocket.y, L.clearT > 0.5); else drawRocket(L.exit.c * T + 8, (L.exit.r + 1) * T, 0, false); }
      for (const p of L.plats) {
        const x = Math.round(p.x), y = Math.round(p.y);
        g.fillStyle = '#553300'; g.fillRect(x, y, p.w, 6); g.fillStyle = L.th.platL; g.fillRect(x, y, p.w, 1);
        g.fillStyle = '#aa5500'; for (let i = 0; i < p.w; i += 8) g.fillRect(x + i + 1, y + 1, 6, 4);
        g.fillStyle = '#ffff55'; g.fillRect(x + 4, y + 6, 2, 1 + ((L.t * 12 | 0) % 2)); g.fillRect(x + p.w - 6, y + 6, 2, 1 + ((L.t * 12 | 0) % 2));
      }
      L.ents.forEach(drawEnemy);
      if (L.boss) drawBoss(L.boss);
      for (const b of L.balls) { const x = Math.round(b.x), y = Math.round(b.y); pixEllipse(g, x, y, b.bomb ? 4 : 3, b.bomb ? 4 : 3, '#aa00aa'); g.fillStyle = '#ff55ff'; g.fillRect(x - 1, y - 2, 2, 2); }
      for (const s of L.shots) { g.fillStyle = (L.t * 30 | 0) % 2 ? '#55ffff' : '#ffffff'; g.fillRect(Math.round(s.x), Math.round(s.y), s.w, s.h); g.fillStyle = '#ffffff'; if (s.vx) g.fillRect(Math.round(s.x) + (s.vx > 0 ? s.w - 3 : 0), Math.round(s.y) + 1, 3, 1); }
      // hamster sidekick
      if (L.phase !== 'clear' || L.clearT < 0.5) {
        const H2 = L.ham || { x: P.x + 5 - P.face * 12, y: P.y + 22 };
        drawHamster(g, H2.x, H2.y, H2.x / 5, L.t, L.phase !== 'run');
      }
      // hero
      if (L.phase === 'run' || L.phase === 'won') {
        if (!(P.inv > 0 && (L.t * 12 | 0) % 2)) {
          let pose = 'stand';
          if (P.dead) pose = 'jump';
          else if (P.pogo) pose = 'pogo';
          else if (!P.ground) pose = 'jump';
          else if (Math.abs(P.vx) > 8) pose = (P.anim / 10 | 0) % 2 ? 'walk1' : 'walk2';
          drawHero(g, P.x - 3, P.y - 2, P.face, pose, { rot: P.dead ? P.rot : 0, flash: P.shootT > 0.08, squash: P.squash > 0 });
          if (P.puffing) { g.fillStyle = (L.t * 30 | 0) % 2 ? '#ffff55' : '#ff5555'; g.fillRect(Math.round(P.x + (P.face > 0 ? -2 : 10)), Math.round(P.y + 20), 3, 3); }
        }
      }
      for (const p of L.parts) { g.fillStyle = p.c; g.fillRect(Math.round(p.x), Math.round(p.y), 2, 2); }
      for (const f of L.floats) txt(g, f.s, Math.round(f.x + 8), Math.round(f.y), 8, f.s.length > 5 ? '#ffff55' : '#ffffff');
      g.restore();
      drawHud();
      if (L.hint && L.phase === 'run') drawHintBox(L.hint);
      if (L.banner) { txt(g, L.banner.a, CW / 2, VH * 0.36, 16, '#ffff55'); if (L.banner.b) txt(g, L.banner.b, CW / 2, VH * 0.36 + 16, 9, '#ffffff'); }
      if (paused) { g.fillStyle = 'rgba(0,0,40,.6)'; g.fillRect(0, 0, CW, VH); txt(g, 'PAUSED', CW / 2, VH * 0.42, 18, '#ffff55'); txt(g, 'PRESS P OR THE II BUTTON', CW / 2, VH * 0.42 + 18, 9, '#ffffff'); }
    }
    function starfield(speed = 0) {
      g.fillStyle = vga ? '#000018' : '#000000'; g.fillRect(0, 0, CW, VH);
      for (let i = 0; i < 70; i++) { const x = ((hash(i) * CW - tt * speed * (1 + hash(i + 3) * 2)) % CW + CW) % CW; g.fillStyle = hash(i + 11) < 0.25 ? '#ffffff' : hash(i + 11) < 0.6 ? '#aaaaaa' : '#555555'; g.fillRect(x | 0, (hash(i + 5) * VH) | 0, 1, 1); }
    }
    function logo(y) {
      g.save(); g.font = 'italic 900 ' + Math.round(30 * CW / 320) + 'px Impact, "Arial Black", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.lineWidth = 4; g.strokeStyle = '#0000aa'; g.strokeText('CAPTAIN COMET', CW / 2, y);
      const gr = g.createLinearGradient(0, y - 14, 0, y + 14);
      if (vga) { gr.addColorStop(0, '#ffffaa'); gr.addColorStop(0.5, '#ffaa00'); gr.addColorStop(1, '#ff3300'); } else { gr.addColorStop(0, '#ffff55'); gr.addColorStop(0.49, '#ffff55'); gr.addColorStop(0.5, '#ff5555'); gr.addColorStop(1, '#ff5555'); }
      g.fillStyle = gr; g.fillText('CAPTAIN COMET', CW / 2, y); g.restore();
    }
    function drawTitle() {
      starfield(6);
      const y0 = Math.max(30, VH * 0.17);
      logo(y0);
      txt(g, 'in THE GREAT GLOOP INVASION', CW / 2, y0 + 20, 9, '#55ffff');
      // rooftop scene
      const gy = y0 + 76;
      g.fillStyle = '#aa0000'; for (let i = 0; i < 18; i++) g.fillRect(CW / 2 - 70 + i * 2, gy + i * 0.6, 140 - i * 4, 1);
      g.fillStyle = '#550000'; g.fillRect(CW / 2 - 70, gy + 11, 140, 2);
      drawHero(g, CW / 2 - 12, gy - 24 - Math.abs(Math.sin(tt * 3)) * 3, 1, 'stand', {});
      drawHamster(g, CW / 2 + 14, gy, tt * 2, tt, true);
      pixEllipse(g, CW / 2 + 80, y0 + 44, 10, 10, '#aaaaaa'); pixEllipse(g, CW / 2 + 77, y0 + 41, 3, 3, '#555555'); pixEllipse(g, CW / 2 + 84, y0 + 47, 2, 2, '#555555');
      if ((tt * 2 | 0) % 2 === 0) txt(g, S ? 'PRESS SPACE OR TAP TO CONTINUE' : 'PRESS SPACE OR TAP TO START', CW / 2, gy + 30, 9, '#ffffff');
      txt(g, 'BEST ' + pad6(best), CW / 2, gy + 44, 9, '#ffff55');
      txt(g, '(C) 1990 BACKYARD ROCKET SOFTWARE', CW / 2, VH - 8, 7, '#5555ff', 'center', false);
    }
    function drawTextScreen(title, body, foot, col = '#ffff55') {
      starfield(10);
      txt(g, title, CW / 2, 16, 13, col);
      const lines = wrapLines(g, body, CW - 30, 8);
      lines.forEach((l, i) => txt(g, l, 15, 32 + i * 10, 8, '#ffffff', 'left', true, null));
      if ((tt * 2 | 0) % 2 === 0) txt(g, foot, CW / 2, VH - 10, 8, '#55ffff');
    }
    function nodeXY(i) { return [Math.round(NODES[i][0] * CW / 320), 26 + NODES[i][1] * (VH - 74)]; }
    function drawMap() {
      starfield(2);
      txt(g, 'STAR MAP', CW / 2, 8, 10, '#ffff55');
      txt(g, 'SCORE ' + pad6(S.score), 4, 8, 8, '#ffffff', 'left');
      txt(g, 'LIVES ' + S.lives, CW - 4, 8, 8, '#ffffff', 'right');
      // path
      for (let i = 0; i < NODES.length - 1; i++) {
        const [ax, ay] = nodeXY(i), [bx, by] = nodeXY(i + 1), n = Math.hypot(bx - ax, by - ay) / 5;
        for (let k = 1; k < n; k++) { g.fillStyle = S.cleared[i] || S.all ? '#ffff55' : '#555555'; g.fillRect(Math.round(ax + (bx - ax) * k / n), Math.round(ay + (by - ay) * k / n), 2, 2); }
      }
      const cols = [['#55ff55', '#00aa00'], ['#aaaaaa', '#555555'], ['#55ff55', '#005530'], ['#aa5500', '#553300'], ['#55ffff', '#0000aa'], ['#ff55ff', '#550055'], ['#ffff55', '#aa00aa']];
      NODES.forEach((_, i) => {
        const [x, y] = nodeXY(i), un = unlocked(i), c = cols[i];
        pixEllipse(g, x, y, 11, 11, un ? c[1] : '#222222');
        pixEllipse(g, x - 1, y - 1, 9, 9, un ? c[0] : '#444444');
        if (un) {
          if (i === 0) { g.fillStyle = '#aa0000'; g.fillRect(x - 5, y - 3, 10, 2); g.fillStyle = '#ffffff'; g.fillRect(x - 4, y - 1, 8, 6); g.fillStyle = '#0000aa'; g.fillRect(x - 1, y + 1, 2, 4); }
          else if (i === 1) { pixEllipse(g, x - 3, y - 2, 2, 2, '#555555'); pixEllipse(g, x + 3, y + 3, 3, 2, '#555555'); }
          else if (i === 3) { g.fillStyle = '#aaaaaa'; g.fillRect(x - 4, y - 5, 8, 4); g.fillStyle = '#55ffff'; g.fillRect(x - 2, y - 4, 4, 2); }
          else if (i === 4) { g.fillStyle = '#ffffff'; g.fillRect(x - 1, y - 7, 2, 8); g.fillRect(x - 4, y - 3, 8, 2); }
          else if (i === 5) { g.fillStyle = '#aa00aa'; g.fillRect(x - 5, y - 4, 10, 8); g.fillStyle = '#ff55ff'; g.fillRect(x - 5, y - 7, 2, 3); g.fillRect(x - 1, y - 7, 2, 3); g.fillRect(x + 3, y - 7, 2, 3); g.fillStyle = '#000'; g.fillRect(x - 1, y, 2, 4); }
          else if (i === 6) { g.fillStyle = '#ffff55'; g.fillRect(x - 5, y - 1, 10, 4); g.fillRect(x - 5, y - 5, 2, 4); g.fillRect(x - 1, y - 6, 2, 5); g.fillRect(x + 3, y - 5, 2, 4); }
          txt(g, '' + (i + 1), x + 11, y + 10, 8, '#ffffff');
          if (S.cleared[i]) { g.fillStyle = '#55ff55'; g.fillRect(x + 6, y - 12, 1, 8); g.fillRect(x + 7, y - 12, 5, 3); }
        } else { g.fillStyle = '#aaaaaa'; g.fillRect(x - 3, y - 1, 6, 5); g.fillRect(x - 2, y - 4, 1, 3); g.fillRect(x + 1, y - 4, 1, 3); g.fillRect(x - 2, y - 4, 4, 1); }
      });
      // hero marker
      const bob = Math.abs(Math.sin(tt * 4)) * 2;
      drawHero(g, mapX - 8, mapY - 34 - bob, 1, 'stand', {});
      drawHamster(g, mapX + 12, mapY - 10, tt * 3, tt, true);
      // footer
      const i = S.node, def = LEVELS[i];
      g.fillStyle = '#0000aa'; g.fillRect(0, VH - 30, CW, 30); g.fillStyle = '#55ffff'; g.fillRect(0, VH - 30, CW, 1);
      txt(g, 'LEVEL ' + (i + 1) + ': ' + def.name.toUpperCase() + (S.cleared[i] ? '  (CLEARED)' : ''), CW / 2, VH - 21, 9, '#ffff55');
      txt(g, coarse() ? 'ARROWS PICK A LEVEL - JUMP OR TAP IT TO PLAY' : 'ARROWS PICK A LEVEL - SPACE OR ENTER TO PLAY', CW / 2, VH - 9, 7, '#ffffff', 'center', false);
      if (S.all) txt(g, 'ALL LEVELS OPEN', 4, VH - 38, 7, '#ff55ff', 'left', false);
    }
    function drawOver() {
      starfield(4);
      txt(g, 'GAME OVER', CW / 2, VH * 0.35, 20, '#ff5555');
      txt(g, 'FINAL SCORE ' + pad6(S.score), CW / 2, VH * 0.35 + 22, 9, '#ffffff');
      txt(g, 'Nibbles believes in you. Try again!', CW / 2, VH * 0.35 + 38, 8, '#55ffff', 'center', false);
      drawHamster(g, CW / 2, VH * 0.35 + 70, tt * 2, tt, true);
      if (modeT > 1.5 && (tt * 2 | 0) % 2 === 0) txt(g, 'PRESS SPACE OR TAP', CW / 2, VH - 12, 8, '#ffff55');
    }
    function draw() {
      g.setTransform(ppx, 0, 0, ppx, 0, 0);
      g.imageSmoothingEnabled = false;
      if (mode === 'title') drawTitle();
      else if (mode === 'story') drawTextScreen('THE STORY SO FAR', STORY, 'PRESS SPACE OR TAP TO BLAST OFF');
      else if (mode === 'map') drawMap();
      else if (mode === 'play' && L) drawPlay();
      else if (mode === 'over') drawOver();
      else if (mode === 'end') {
        drawTextScreen('YOU SAVED THE MOON!', 'Emperor Gloop shrinks down to a tiny wobbly jelly and zooms home to planet Gunkulon, crown and all.\n\nThe Moon is safe, the backyard is quiet, and Nibbles gets an extra sunflower seed.\n\nFinal score: ' + pad6(S.score) + '\nThanks for playing Captain Comet!', 'PRESS SPACE OR TAP FOR THE STAR MAP', '#55ff55');
        drawHero(g, CW - 50, VH - 56 - Math.abs(Math.sin(tt * 5)) * 6, -1, 'jump', {});
        drawHamster(g, CW - 64, VH - 24, tt * 4, tt, true);
      }
    }

    /* ---- loop ---- */
    function frame(now) {
      if (closed) return;
      raf = requestAnimationFrame(frame);
      let dt = Math.min(0.1, Math.max(0, (now - last) / 1000)); last = now;
      if (mode === 'play' && !paused && !W.el.classList.contains('active')) { paused = true; clearKeys(); }
      modeT += dt;
      if (mode === 'play' && L && !paused) {
        accum += dt; let n = 0;
        while (accum >= STEP && n < 12) { update(STEP); accum -= STEP; n++; if (mode !== 'play' || !L) break; }
        if (n >= 12) accum = 0;
      } else { tt += dt; accum = 0; }
      if (mode === 'map') {
        const [tx, ty] = nodeXY(S.node);
        mapX += clamp(tx - mapX, -160 * dt, 160 * dt); mapY += clamp(ty - mapY, -160 * dt, 160 * dt);
      }
      if (mode === 'over' && modeT > 4) afterOver();
      draw();
    }
    function afterOver() { S.score = 0; S.lives = 3; S.next = 20000; saveGame(); toMap(); }

    /* ---- input ---- */
    const KM = { arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right', arrowup: 'up', w: 'up', arrowdown: 'pogo', s: 'pogo', c: 'pogo', shift: 'pogo', ' ': 'jump', control: 'jump', alt: 'fire', x: 'fire' };
    function clearKeys() { Object.keys(K).forEach(k => { K[k] = false; }); Object.keys(PR).forEach(k => { PR[k] = false; }); padEl.querySelectorAll('.down').forEach(b => b.classList.remove('down')); }
    function mapMove(d) {
      let n = S.node + d;
      if (n < 0 || n >= NODES.length || !unlocked(n)) { SND.bonk(); return; }
      S.node = n; snd(() => tone(660, 0.05, { type: 'square', vol: 0.03 }));
    }
    function action() {
      if (mode === 'title') { if (S) toMap(); else newGame(); }
      else if (mode === 'story') toMap();
      else if (mode === 'map') { const [tx, ty] = nodeXY(S.node); if (Math.hypot(tx - mapX, ty - mapY) < 4) startLevel(S.node); }
      else if (mode === 'over') { if (modeT > 1.5) afterOver(); }
      else if (mode === 'end') toMap();
    }
    function typeCheat(ch) {
      cheat = (cheat + ch).slice(-10);
      if (mode === 'map' && cheat.endsWith('nibbles')) { S.all = true; saveGame(); SND.life(); cheat = ''; }
      if (mode === 'play' && cheat.endsWith('colander')) { god = !god; SND.life(); cheat = ''; if (L) L.banner = { a: god ? 'CHEAT: GOD MODE' : 'GOD MODE OFF', b: '', t: 1.5 }; }
    }
    W.onKey = e => {
      const k = e.key, lk = k.toLowerCase(), m = KM[lk];
      if (m || k === 'Enter') e.preventDefault();
      if (lk.length === 1 && /[a-z]/.test(lk)) typeCheat(lk);
      if (lk === 'p' && mode === 'play') { togglePause(); return; }
      if (mode !== 'play') {
        if (mode === 'map' && (m === 'left' || m === 'up')) mapMove(-1);
        else if (mode === 'map' && (m === 'right' || m === 'pogo')) mapMove(1);
        else if (m === 'jump' || m === 'fire' || k === 'Enter') action();
        return;
      }
      if (paused) { if (k === 'Enter') togglePause(); return; }
      if (!m) return;
      if (m === 'pogo') { if (!e.repeat) PR.pogo = true; return; }
      if (!K[m] && !e.repeat && (m === 'jump' || m === 'fire')) PR[m] = true;
      K[m] = true;
    };
    const onUp = e => { const m = KM[e.key.toLowerCase()]; if (m) { K[m] = false; if (m === 'fire' && W.el.classList.contains('active')) e.preventDefault(); } };
    window.addEventListener('keyup', onUp);
    window.addEventListener('blur', clearKeys);
    padEl.querySelectorAll('[data-k]').forEach(b => {
      const k = b.dataset.k;
      const down = e => {
        e.preventDefault(); b.classList.add('down');
        try { b.setPointerCapture(e.pointerId); } catch (err) {}
        if (k === 'pause') { if (mode === 'play') togglePause(); else action(); return; }
        if (mode !== 'play') { if (mode === 'map' && k === 'left') mapMove(-1); else if (mode === 'map' && k === 'right') mapMove(1); else if (k !== 'left' && k !== 'right') action(); return; }
        if (paused) { togglePause(); return; }
        if (k === 'pogo') { PR.pogo = true; return; }
        if (!K[k] && (k === 'jump' || k === 'fire')) PR[k] = true;
        K[k] = true;
      };
      const up = e => { b.classList.remove('down'); if (k !== 'pause' && k !== 'pogo') K[k] = false; };
      b.addEventListener('pointerdown', down);
      b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
      b.addEventListener('contextmenu', e => e.preventDefault());
    });
    cv.addEventListener('pointerdown', e => {
      e.preventDefault();
      if (mode === 'play') { if (paused) togglePause(); return; }
      if (mode === 'map') {
        const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * CW, y = (e.clientY - r.top) / r.height * VH;
        for (let i = 0; i < NODES.length; i++) {
          const [nx, ny] = nodeXY(i);
          if (Math.hypot(nx - x, ny - y) < 18) {
            if (!unlocked(i)) { SND.bonk(); return; }
            if (i === S.node) action(); else { S.node = i; snd(() => tone(660, 0.05, { type: 'square', vol: 0.03 })); }
            return;
          }
        }
        if (y > VH - 32) action();
        return;
      }
      action();
    });
    function fit() {
      const cw = Math.max(100, wrap.clientWidth), ch = Math.max(100, wrap.clientHeight);
      CW = ch > cw * 0.95 ? 256 : 320;
      VH = Math.round(clamp(CW * ch / cw, 176, 224));
      const sc = Math.min(cw / CW, ch / VH), dpr = window.devicePixelRatio || 1;
      cv.style.width = Math.floor(CW * sc) + 'px'; cv.style.height = Math.floor(VH * sc) + 'px';
      cv.width = Math.max(1, Math.round(CW * sc * dpr)); cv.height = Math.max(1, Math.round(VH * sc * dpr));
      ppx = cv.width / CW;
      if (L) camUpdate(0, true);
    }
    W.onMin = () => { if (mode === 'play' && !paused) togglePause(); };
    W.onResize = fit;
    W.onClose = () => { closed = true; cancelAnimationFrame(raf); raf = 0; window.removeEventListener('keyup', onUp); window.removeEventListener('blur', clearKeys); if (musicOn) api.stopMusic(); };
    menus();
    fit();
    toTitle();
    requestAnimationFrame(t => { last = t; fit(); frame(t); });
  }

  const COMET_ICON = '<svg viewBox="0 0 32 32" shape-rendering="crispEdges" aria-hidden="true"><rect x="1" y="1" width="30" height="30" fill="#0000aa" stroke="#000"/><g fill="#fff"><rect x="4" y="4" width="1" height="1"/><rect x="26" y="6" width="1" height="1"/><rect x="22" y="3" width="1" height="1"/></g><rect x="3" y="25" width="26" height="5" fill="#00aa00"/><rect x="3" y="25" width="26" height="1" fill="#55ff55"/><rect x="11" y="4" width="10" height="5" fill="#aaaaaa"/><rect x="12" y="3" width="8" height="1" fill="#aaaaaa"/><rect x="13" y="5" width="1" height="1" fill="#555"/><rect x="16" y="6" width="1" height="1" fill="#555"/><rect x="18" y="5" width="1" height="1" fill="#555"/><rect x="10" y="9" width="12" height="1" fill="#555"/><rect x="12" y="10" width="8" height="5" fill="#ffcc99"/><rect x="17" y="11" width="1" height="2" fill="#000"/><rect x="7" y="14" width="4" height="8" fill="#aa5500"/><rect x="11" y="15" width="9" height="7" fill="#00aa00"/><rect x="14" y="16" width="2" height="2" fill="#ffff55"/><rect x="19" y="15" width="5" height="2" fill="#ff5555"/><rect x="12" y="22" width="3" height="3" fill="#00aa00"/><rect x="17" y="22" width="3" height="3" fill="#00aa00"/><rect x="24" y="19" width="6" height="6" fill="#ffaa55"/><rect x="25" y="18" width="1" height="1" fill="#ff55ff"/><rect x="28" y="18" width="1" height="1" fill="#ff55ff"/><rect x="28" y="20" width="1" height="1" fill="#000"/></svg>';
  const COMET_CSS = `
    .ccm{height:100%;display:flex;flex-direction:column;background:#000;user-select:none;-webkit-user-select:none}
    .ccm-wrap{flex:1;min-height:0;display:flex;align-items:center;justify-content:center;overflow:hidden}
    .ccm-wrap canvas{display:block;touch-action:none;image-rendering:pixelated}
    .ccm-pad{display:flex;align-items:center;justify-content:space-between;gap:6px;padding:4px;background:#c0c0c0;border-top:1px solid #fff;touch-action:none}
    .ccm-pad[hidden]{display:none}
    .ccm-grp{display:flex;gap:4px}
    .ccm-pad .ccm-b{min-width:48px;height:44px;padding:0 8px;font:bold 12px var(--ui);display:flex;align-items:center;justify-content:center;touch-action:none;color:#000}
    .ccm-pad .ccm-b.down{border-color:#000 #fff #fff #000;box-shadow:inset 1px 1px #808080}
    .ccm-pad .ccm-sm{min-width:36px;padding:0 6px}
    .ccm-pad .ccm-j{min-width:64px}
    @media (max-width:420px){.ccm-pad .ccm-b{min-width:44px;padding:0 4px;font-size:11px}.ccm-pad .ccm-j{min-width:52px}.ccm-pad .ccm-sm{min-width:32px}}
  `;

  /* ======================================================================
     BRICK BUSTER
     ====================================================================== */
  const BW = 224, WALL = 8, HUDH = 14, BTOP = 40, BCW = 16, BCH = 8;
  // 13 columns per row, rows split by '/'. a-h colored bricks, m = 2 hits, n = 3 hits, x = unbreakable.
  const BLEVELS = [
    'aaaaaaaaaaaaa/bbbbbbbbbbbbb/ccccccccccccc/ddddddddddddd/eeeeeeeeeeeee',
    '......a....../.....aba...../....abcba..../...abcdcba.../..abcdedcba../.abcdefedcba./abcdefgfedcba',
    'a.b.c.d.e.f.g/.b.c.d.e.f.g./a.b.c.d.e.f.g/.b.c.d.e.f.g./a.b.c.d.e.f.g/.b.c.d.e.f.g.',
    'mmmmmmmmmmmmm/aaaaaaaaaaaaa/b.b.b.b.b.b.b/ccccccccccccc/d.d.d.d.d.d.d',
    '..aa.....aa../.aaaa...aaaa./aaaaaa.aaaaaa/aaaaaaaaaaaaa/.aaaaaaaaaaa./..aaahhhaaa../...aaaaaaa.../....aaaaa..../.....aaa...../......a......',
    'eeeeeeeeeeeee/e.x.x.x.x.x.e/eeeeeeeeeeeee/............./fffffffffffff/fmfmfmfmfmfmf',
    '......g....../.....gfg...../....gfefg..../...gfedefg.../..gfedcdefg../...gfedefg.../....gfefg..../.....gfg...../......g......',
    'xxxxx...xxxxx/xaaax...xaaax/xabax...xabax/xaaax...xaaax/xx.xx...xx.xx/............./mmmmmmmmmmmmm',
    'a....b....c../.a....b....c./..a....b....c/d..a....b..../.d..a....b.../..d..a....b..',
    '...d.....d.../....d...d..../...ddddddd.../..dd.ddd.dd../.ddddddddddd./.d.ddddddd.d./.d.d.....d.d./....dd.dd....',
    'nnnnnnnnnnnnn/............./cmcmcmcmcmcmc/............./aaaaaaaaaaaaa/bbbbbbbbbbbbb',
    '....ccccc..../..ccccccccc../.cccxcccxccc./.ccccccccccc./.ccccccccccc./.ccxcccccxcc./..ccxxxxxcc../....ccccc....',
    'xxxxxx.xxxxxx/a...........a/a.xxxxxxxxx.a/a.bbbbbbbbb.a/a.ccccccccc.a/a...........a/aaaaaaaaaaaaa',
    'mm.........mm/mm.........mm/nn..eeeee..nn/nn..eeeee..nn/mm..fffff..mm/mm..fffff..mm/aa.........aa',
    '....aaaaa..../..aabbbbbaa../.abbcccccbba./.bccdddddccb./abcdd...ddcba/bcdd.....ddcb/cdd.......ddc',
    'bxbxbxbxbxbxb/bbbbbbbbbbbbb/cxcxcxcxcxcxc/ccccccccccccc/dxdxdxdxdxdxd/ddddddddddddd',
    '......e....../.....eee...../....eeeee..../...eeeeeee.../..eeeeeeeee../.....mmm...../.....mmm...../.....mmm...../.....nnn.....',
    'aaaaaaaaaaaaa/bbbbbbbbbbbbb/xxxx.xxx.xxxx/ccccccccccccc/ddddddddddddd/xx.xxxxxxx.xx/eeeeeeeeeeeee',
    'amamamamamama/mamamamamamam/amamamamamama/mamamamamamam/fffffffffffff',
    '.....ggg...../.....gng...../.....gng...../ggggggngggggg/gnnnnnnnnnnng/ggggggngggggg/.....gng...../.....gng...../.....ggg.....',
    'ccccccccccccc/x.x.x.x.x.x.x/ddddddddddddd/.x.x.x.x.x.x./eeeeeeeeeeeee/x.x.x.x.x.x.x/fffffffffffff',
    'nnnnnnnnnnnnn/mmmmmmmmmmmmm/aaaaaaaaaaaaa/bbbbbbbbbbbbb/ccccccccccccc/ddddddddddddd/eeeeeeeeeeeee',
    'xxxxxxxxxxxx./a...........x/a.xxxxxxxxx.x/a.x.hhhhh.x.x/a.x.hgggh.x.x/a.x.hhhhh.x.x/a.x.......x.x/a.xxxx...xx.x/a...........x/aaaaaaaaaaaa.',
    'x.....x.....x/nx...nnn...xn/nnx.nnnnn.xnn/nnnnnnnnnnnnn/mmmmmmmmmmmmm/agbgcgdgegfga/aaaaaaaaaaaaa'
  ];
  const BPTS = { a: 90, b: 80, c: 70, d: 60, e: 50, f: 50, g: 100, h: 120, m: 150, n: 250 };
  const BCOL = {
    vga: { a: '#e04040', b: '#f08830', c: '#e8d838', d: '#38b838', e: '#38c0d8', f: '#4868e8', g: '#a848d8', h: '#e8e8e8', m: '#a0a8b8', n: '#788090', x: '#806040' },
    neon: { a: '#ff3070', b: '#ff9020', c: '#ffee30', d: '#40ff60', e: '#30f0ff', f: '#4080ff', g: '#c060ff', h: '#ffffff', m: '#c0d0e0', n: '#8898b0', x: '#ff6a00' }
  };
  const CAPS = {
    wide: { col: '#b060ff', name: 'WIDE PADDLE', w: 3 },
    multi: { col: '#ffd020', name: 'TRIPLE BALL', w: 3 },
    laser: { col: '#50e050', name: 'LASER CANNONS', w: 2 },
    slow: { col: '#80a0ff', name: 'SLOW BALL', w: 2 },
    sticky: { col: '#c08040', name: 'STICKY PADDLE', w: 2 },
    life: { col: '#ff3050', name: 'EXTRA LIFE', w: 0.6 }
  };
  const BDEF_HI = [['ACE', 40000], ['BOP', 30000], ['ZIP', 22000], ['RAD', 16000], ['JOY', 11000], ['MAX', 7000], ['KIT', 4000], ['DOT', 2000]].map(([i, s]) => ({ i, s, r: 0 }));

  function openBricks(W, api) {
    W.body.innerHTML = `<div class="bbk"><div class="bbk-wrap"><canvas aria-label="Brick Buster game screen"></canvas><div class="bbk-ini" hidden></div></div><div class="bbk-bar"><button class="btn" data-a="pause">Pause</button><span class="bbk-msg"></span><button class="btn" data-a="go">Launch</button></div></div>`;
    const wrap = W.body.querySelector('.bbk-wrap'), cv = W.body.querySelector('canvas'), g = cv.getContext('2d');
    const iniEl = W.body.querySelector('.bbk-ini'), msgEl = W.body.querySelector('.bbk-msg'), pauseB = W.body.querySelector('[data-a=pause]'), goB = W.body.querySelector('[data-a=go]');
    const neon = api.era.id === '2000', PAL = neon ? BCOL.neon : BCOL.vga;
    let opts = Object.assign({ sound: true }, api.load('opts', {}));
    let hi = api.load('hi', null) || BDEF_HI.slice();
    let prog = api.load('prog', null);
    let VH = 320, ppx = 1, closed = false, raf = 0, last = 0, mode = 'title', paused = false, S = null, tt = 0, lastRank = -1, iniKey = null, overT = 0;
    let target = null, drag = null, dirty = true;
    const keys = {};
    const layer = document.createElement('canvas'), lg = layer.getContext('2d');
    const snd = fn => { if (opts.sound) try { fn(); } catch (e) {} };
    const SND = {
      pad: () => snd(() => api.tone(440, 0.05, { type: 'square', vol: 0.035 })),
      wall: () => snd(() => api.tone(300, 0.03, { type: 'square', vol: 0.02 })),
      brick: n => snd(() => api.tone(600 + n * 40, 0.05, { type: 'square', vol: 0.03 })),
      metal: () => snd(() => { api.tone(1400, 0.08, { type: 'triangle', vol: 0.04 }); api.tone(2100, 0.06, { type: 'sine', vol: 0.02 }); }),
      crack: () => snd(() => api.noise(0.05, { ft: 'highpass', f: 2000, vol: 0.05, decay: 1 })),
      cap: () => snd(() => [0, 4, 7, 12].forEach((n, i) => api.tone(api.midi(72 + n), 0.07, { type: 'square', vol: 0.03, at: i * 0.05 }))),
      laser: () => snd(() => api.tone(1800, 0.06, { to: 600, type: 'sawtooth', vol: 0.02 })),
      lose: () => snd(() => [440, 370, 311, 262].forEach((f, i) => api.tone(f, 0.15, { type: 'triangle', vol: 0.07, at: i * 0.13 }))),
      clear: () => snd(() => [60, 64, 67, 72, 76, 79, 84].forEach((n, i) => api.tone(api.midi(n), 0.1, { type: 'square', vol: 0.03, at: i * 0.07 }))),
      over: () => snd(() => [392, 330, 262, 196, 131].forEach((f, i) => api.tone(f, 0.26, { type: 'triangle', vol: 0.07, at: i * 0.2 }))),
      life: () => snd(() => [0, 7, 12, 16, 19, 24].forEach((n, i) => api.tone(api.midi(67 + n), 0.08, { vol: 0.05, at: i * 0.06 })))
    };

    api.menubar([
      { label: 'Game', items: () => [
        { label: 'New game', fn: () => newGame(0) },
        { label: prog ? 'Continue round ' + (prog.lvl + 1) : 'Continue', fn: () => continueGame(), disabled: !prog },
        { label: paused ? 'Resume' : 'Pause', fn: togglePause, disabled: mode !== 'play' },
        { label: 'High scores', fn: () => { if (mode === 'play') api.msgBox('Brick Buster', 'High scores:\n' + hi.map((h, i) => `${i + 1}. ${h.i}   ${h.s}   round ${h.r || 1}`).join('\n')); else toTitle(); } },
        '-', { label: 'Exit', fn: () => api.close() }
      ] },
      { label: 'Options', items: () => [
        { label: (opts.sound ? '[x] ' : '[ ] ') + 'Sound effects', fn: () => { opts.sound = !opts.sound; api.save('opts', opts); } },
        { label: 'Reset high scores', fn: () => api.msgBox('Brick Buster', 'Reset the high-score table?', ['Yes', 'No'], 'warn').then(b => { if (b === 'Yes') { hi = BDEF_HI.slice(); api.save('hi', hi); lastRank = -1; } }) }
      ] },
      { label: 'Help', items: [
        { label: 'How to play', fn: () => api.msgBox('How to play', 'Bounce the ball off your paddle to bust every brick. Where the ball hits the paddle sets its angle: the ends send it off sideways, the middle sends it straight up.\n\nMouse: move the mouse, click to launch. Touch: drag anywhere on the playfield, let go to launch. Keyboard: LEFT and RIGHT (or A and D) move, SPACE launches and fires lasers, P pauses.\n\nSilver bricks take 2 hits, dark steel takes 3, and bronze bricks never break. The ball speeds up as you play.\n\nCatch falling capsules:\n  Purple arrows - wide paddle\n  Gold dots - triple ball\n  Green bars - laser cannons (SPACE, click or hold to fire)\n  Blue wave - slow ball\n  Brown drop - sticky paddle\n  Red heart - extra life\n\nAt game over you earn $1 for every 3 rounds cleared (up to $6).') },
        { label: 'About Brick Buster', fn: () => api.msgBox('About Brick Buster', 'Brick Buster 1.0\nPixelworks Arcade, 1990\n\n24 rounds of brick-busting action.') }
      ] }
    ]);

    function fit() {
      const cw = Math.max(120, wrap.clientWidth), ch = Math.max(120, wrap.clientHeight);
      VH = Math.round(clamp(BW * ch / cw, 290, 350));
      const sc = Math.min(cw / BW, ch / VH), dpr = window.devicePixelRatio || 1;
      cv.style.width = Math.floor(BW * sc) + 'px'; cv.style.height = Math.floor(VH * sc) + 'px';
      cv.width = Math.max(1, Math.round(BW * sc * dpr)); cv.height = Math.max(1, Math.round(VH * sc * dpr));
      layer.width = cv.width; layer.height = cv.height;
      ppx = cv.width / BW; dirty = true;
    }
    const padY = () => VH - 26;
    const msg = t => { msgEl.textContent = t; };

    /* ---- game flow ---- */
    function newGame(lvl, keep) {
      iniEl.hidden = true; iniKey = null;
      S = Object.assign({ score: 0, lives: 3, cleared: 0 }, keep || {}, { lvl, balls: [], caps: [], bolts: [], parts: [], floats: [], pad: { x: BW / 2, w: 32, tw: 32 }, wide: 0, laser: 0, slow: 0, sticky: 0, fireT: 0, t: 0, banner: null, flash: 0, next: 25000 });
      if (keep && keep.score) S.next = (Math.floor(keep.score / 25000) + 1) * 25000;
      mode = 'play'; paused = false; lastRank = -1; pauseB.textContent = 'Pause';
      loadRound(lvl);
    }
    function continueGame() { if (!prog) return; newGame(prog.lvl, { score: prog.score, lives: prog.lives, cleared: prog.cleared }); }
    function loadRound(lvl) {
      S.lvl = lvl;
      const rows = BLEVELS[lvl].split('/');
      S.grid = rows.map(r => [...r].map(ch => ch === '.' ? null : { t: ch, hp: ch === 'm' ? 2 : ch === 'n' ? 3 : 1, fl: 0 }));
      S.left = 0; S.grid.forEach(r => r.forEach(b => { if (b && b.t !== 'x') S.left++; }));
      S.base = Math.min(215, 150 + lvl * 3.5); S.speed = S.base; S.max = S.base + 95;
      S.caps = []; S.bolts = []; S.wide = 0; S.laser = 0; S.slow = 0; S.sticky = 0; S.pad.tw = 32; S.lastBreak = S.t;
      serve();
      S.banner = { a: 'ROUND ' + (lvl + 1), b: 'GET READY!', t: 2 };
      prog = { lvl, score: S.score, lives: S.lives, cleared: S.cleared }; api.save('prog', prog);
      dirty = true;
      msg(coarse() ? 'Drag to move. Let go to launch.' : 'Move the mouse or use the arrow keys. Click or Space launches.');
    }
    function serve() {
      S.balls = [{ x: S.pad.x, y: padY() - 3, vx: 0, vy: 0, stuck: true, off: rnd(-6, 6), st: 0, serve: true, tr: [] }];
    }
    function toTitle() { mode = 'title'; S = null; paused = false; iniEl.hidden = true; iniKey = null; pauseB.textContent = 'Pause'; msg(prog ? 'Space: new game.  C: continue round ' + (prog.lvl + 1) + '.' : 'Press Space or tap to start.'); }
    function togglePause() { if (mode !== 'play') return; paused = !paused; pauseB.textContent = paused ? 'Resume' : 'Pause'; Object.keys(keys).forEach(k => { keys[k] = false; }); }
    function addScore(n) {
      S.score += n;
      if (S.score >= S.next) { S.next += 25000; if (S.lives < 9) { S.lives++; SND.life(); S.floats.push({ x: S.pad.x, y: padY() - 14, t: 1.2, s: 'EXTRA LIFE' }); } }
    }
    const curSpeed = () => S.slow > 0 ? Math.max(120, S.speed * 0.65) : S.speed;
    function launch() {
      let any = false;
      S.balls.forEach(b => {
        if (!b.stuck) return;
        any = true;
        const rel = clamp(b.off / (S.pad.w / 2), -1, 1);
        let a = rel * 0.9; if (Math.abs(a) < 0.18) a = (a < 0 || (a === 0 && Math.random() < 0.5) ? -1 : 1) * rnd(0.2, 0.45);
        const sp = curSpeed(); b.vx = Math.sin(a) * sp; b.vy = -Math.cos(a) * sp; b.stuck = false; b.serve = false;
      });
      if (any) SND.pad();
      return any;
    }
    function fireLaser() {
      if (S.laser <= 0 || S.fireT > 0) return;
      S.fireT = 0.22;
      const y = padY() - 2;
      S.bolts.push({ x: S.pad.x - S.pad.w / 2 + 3, y }, { x: S.pad.x + S.pad.w / 2 - 3, y });
      SND.laser();
    }
    function primary() { if (mode !== 'play' || paused || !S) return; if (!launch()) fireLaser(); }
    function hitBrick(r, c) {
      const b = S.grid[r] && S.grid[r][c];
      if (!b) return;
      b.fl = 0.12;
      if (b.t === 'x') { SND.metal(); return; }
      b.hp--;
      if (b.hp > 0) { addScore(20); SND.crack(); dirty = true; return; }
      S.grid[r][c] = null; S.left--; dirty = true; S.lastBreak = S.t;
      addScore(BPTS[b.t] || 50);
      SND.brick(r % 8);
      const x = WALL + c * BCW + BCW / 2, y = BTOP + r * BCH + BCH / 2;
      for (let i = 0; i < 8; i++) { const a = Math.random() * 6.283, v = rnd(20, 70); S.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rnd(0.3, 0.6), c: PAL[b.t] }); }
      if (Math.random() < 0.13 && S.caps.length < 3) {
        const bag = []; Object.entries(CAPS).forEach(([k, d]) => { for (let i = 0; i < d.w * 10; i++) bag.push(k); });
        S.caps.push({ x, y, type: bag[Math.floor(Math.random() * bag.length)], t: 0 });
      }
      if (S.left <= 0) roundClear();
    }
    function roundClear() {
      mode = 'clear'; overT = 2.4;
      S.cleared++;
      const bonus = 1000 + S.lvl * 100;
      addScore(bonus);
      S.banner = { a: 'ROUND ' + (S.lvl + 1) + ' CLEAR!', b: 'BONUS ' + bonus, t: 2.4 };
      S.caps = []; S.bolts = [];
      SND.clear();
    }
    function afterClear() {
      if (S.lvl + 1 >= BLEVELS.length) { addScore(10000); gameOver(true); return; }
      mode = 'play';
      loadRound(S.lvl + 1);
    }
    function loseBall() {
      S.lives--; SND.lose(); S.flash = 0.3;
      if (S.lives <= 0) { gameOver(false); return; }
      S.wide = 0; S.laser = 0; S.slow = 0; S.sticky = 0; S.pad.tw = 32; S.caps = []; S.bolts = [];
      S.speed = S.base;
      serve();
      prog = { lvl: S.lvl, score: S.score, lives: S.lives, cleared: S.cleared }; api.save('prog', prog);
      S.banner = { a: S.lives === 1 ? 'LAST BALL!' : 'BALLS LEFT: ' + S.lives, b: '', t: 1.5 };
    }
    function gameOver(won) {
      mode = 'over'; overT = won ? 5 : 3; drag = null; target = null;
      prog = null; api.save('prog', null);
      const d = Math.min(6, Math.floor(S.cleared / 3));
      if (d > 0) api.earn(d, 'busting ' + S.cleared + ' rounds of Brick Buster');
      S.won = won;
      msg((won ? 'You busted every round! ' : '') + 'Final score: ' + S.score);
      if (won) SND.life(); else SND.over();
    }
    function afterOver() {
      const score = S.score;
      if (score > 0 && (hi.length < 8 || score > hi[hi.length - 1].s)) askInitials(score, S.lvl + 1);
      else toTitle();
    }
    function askInitials(score, round) {
      mode = 'ini';
      const ini = (api.user || '').toUpperCase().replace(/[^A-Z]/g, '').padEnd(3, 'A').slice(0, 3).split('');
      let slot = 0;
      const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      iniEl.innerHTML = `<div class="bbk-ibox raised"><h3>NEW HIGH SCORE!</h3><div><b>${score}</b> points, round ${round}</div><div>Enter your initials:</div><div class="bbk-slots">${[0, 1, 2].map(i => `<div class="bbk-slot"><button class="btn" data-u="${i}" aria-label="Next letter">&#9650;</button><b data-s="${i}"></b><button class="btn" data-d="${i}" aria-label="Previous letter">&#9660;</button></div>`).join('')}</div><button class="btn" data-ok><b>OK</b></button></div>`;
      iniEl.hidden = false;
      const draw = () => iniEl.querySelectorAll('[data-s]').forEach((b, i) => { b.textContent = ini[i]; b.classList.toggle('on', i === slot); });
      const bump = (i, d) => { ini[i] = A[(A.indexOf(ini[i]) + d + 26) % 26]; slot = i; draw(); snd(() => api.tone(880, 0.03, { vol: 0.03 })); };
      const done = () => {
        const e = { i: ini.join(''), s: score, r: round };
        hi.push(e); hi.sort((a, b) => b.s - a.s); hi = hi.slice(0, 8); api.save('hi', hi);
        lastRank = hi.indexOf(e);
        SND.life();
        toTitle();
      };
      iniEl.querySelectorAll('[data-u]').forEach(b => b.onclick = () => bump(+b.dataset.u, 1));
      iniEl.querySelectorAll('[data-d]').forEach(b => b.onclick = () => bump(+b.dataset.d, -1));
      iniEl.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { slot = +b.dataset.s; draw(); });
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
    function applyCap(type) {
      addScore(250); SND.cap();
      S.floats.push({ x: S.pad.x, y: padY() - 12, t: 1.2, s: CAPS[type].name });
      if (type === 'wide') { S.wide = 20; S.pad.tw = 48; }
      else if (type === 'laser') S.laser = 15;
      else if (type === 'slow') S.slow = 10;
      else if (type === 'sticky') S.sticky = 20;
      else if (type === 'life') { S.lives = Math.min(9, S.lives + 1); }
      else if (type === 'multi') {
        const free = S.balls.filter(b => !b.stuck);
        if (!free.length) { launch(); }
        const src = S.balls.filter(b => !b.stuck);
        src.forEach(b => {
          [-0.45, 0.45].forEach(da => {
            if (S.balls.length >= 9) return;
            const a = Math.atan2(b.vx, -b.vy) + da, sp = Math.hypot(b.vx, b.vy) || curSpeed();
            S.balls.push({ x: b.x, y: b.y, vx: Math.sin(a) * sp, vy: -Math.abs(Math.cos(a) * sp), stuck: false, off: 0, st: 0, tr: [] });
          });
        });
      }
    }

    /* ---- physics ---- */
    function cellAt(x, y) {
      const c = Math.floor((x - WALL) / BCW), r = Math.floor((y - BTOP) / BCH);
      if (r < 0 || c < 0 || c >= 13 || !S.grid[r] || !S.grid[r][c]) return null;
      return [r, c];
    }
    function brickHitBox(x, y, R) {
      // check the four corners of the ball's box
      const pts = [[x - R, y - R], [x + R, y - R], [x - R, y + R], [x + R, y + R]];
      for (const [px, py] of pts) { const h = cellAt(px, py); if (h) return h; }
      return null;
    }
    function stepBall(b, dt) {
      const R = 2.5, sp = curSpeed();
      const m = Math.hypot(b.vx, b.vy) || 1;
      b.vx = b.vx / m * sp; b.vy = b.vy / m * sp;
      if (Math.abs(b.vy) < sp * 0.28) { b.vy = (b.vy < 0 ? -1 : 1) * sp * 0.28; const m2 = Math.hypot(b.vx, b.vy); b.vx = b.vx / m2 * sp; b.vy = b.vy / m2 * sp; }
      const n = Math.max(1, Math.ceil(sp * dt / 2)), h = dt / n, py0 = padY();
      for (let i = 0; i < n; i++) {
        // x axis
        b.x += b.vx * h;
        if (b.x - R < WALL) { b.x = WALL + R; b.vx = Math.abs(b.vx); SND.wall(); }
        else if (b.x + R > BW - WALL) { b.x = BW - WALL - R; b.vx = -Math.abs(b.vx); SND.wall(); }
        let hit = brickHitBox(b.x, b.y, R);
        if (hit) { b.x -= b.vx * h; b.vx = -b.vx; hitBrick(hit[0], hit[1]); if (mode !== 'play') return; }
        // y axis
        const prevY = b.y;
        b.y += b.vy * h;
        if (b.y - R < HUDH + WALL) { b.y = HUDH + WALL + R; b.vy = Math.abs(b.vy); SND.wall(); }
        hit = brickHitBox(b.x, b.y, R);
        if (hit) { b.y -= b.vy * h; b.vy = -b.vy; hitBrick(hit[0], hit[1]); if (mode !== 'play') return; }
        // paddle
        const P = S.pad;
        if (b.vy > 0 && b.y + R >= py0 && prevY + R <= py0 + 2 && b.x >= P.x - P.w / 2 - R && b.x <= P.x + P.w / 2 + R) {
          b.y = py0 - R;
          const rel = clamp((b.x - P.x) / (P.w / 2), -1, 1), a = clamp(rel * 1.05 + rnd(-0.04, 0.04) + (S.t - S.lastBreak > 15 ? rnd(-0.35, 0.35) : 0), -1.1, 1.1);
          S.speed = Math.min(S.max, S.speed + 2.5);
          const s2 = curSpeed();
          b.vx = Math.sin(a) * s2; b.vy = -Math.cos(a) * s2;
          if (S.sticky > 0) { b.stuck = true; b.off = b.x - P.x; b.st = 0; }
          SND.pad();
          addScore(0);
        }
      }
    }
    function update(dt) {
      S.t += dt;
      if (S.banner && (S.banner.t -= dt) <= 0) S.banner = null;
      if (S.flash > 0) S.flash -= dt;
      ['wide', 'laser', 'slow', 'sticky'].forEach(k => { if (S[k] > 0) { S[k] = Math.max(0, S[k] - dt); if (k === 'wide' && !S[k]) S.pad.tw = 32; } });
      if (S.sticky <= 0) S.balls.forEach(b => { if (b.stuck && !b.serve) { launchOne(b); } });
      S.fireT = Math.max(0, S.fireT - dt);
      const P = S.pad;
      P.w += clamp(P.tw - P.w, -60 * dt, 60 * dt);
      if (mode === 'play' || mode === 'clear') {
        const dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
        if (dir) { target = null; P.x += dir * 270 * dt; }
        else if (target != null) P.x += clamp(target - P.x, -900 * dt, 900 * dt);
        P.x = clamp(P.x, WALL + P.w / 2, BW - WALL - P.w / 2);
      }
      if (mode === 'play') {
        S.speed = Math.min(S.max, S.speed + dt * 1.1);
        if ((keys.fire || (drag && drag.touch)) && S.laser > 0) fireLaser();
        for (const b of S.balls.slice()) {
          if (b.stuck) {
            b.x = P.x + clamp(b.off, -P.w / 2 + 2, P.w / 2 - 2); b.y = padY() - 3; b.st += dt;
            if (b.st > (b.serve ? 6 : 3)) launchOne(b);
            continue;
          }
          b.tr.push([b.x, b.y]); if (b.tr.length > 6) b.tr.shift();
          stepBall(b, dt);
          if (mode !== 'play') break;
          if (b.y > VH + 6) S.balls.splice(S.balls.indexOf(b), 1);
        }
        if (mode === 'play' && !S.balls.length) loseBall();
        // capsules
        for (const c of S.caps) {
          c.t += dt; c.y += 55 * dt;
          if (c.y + 4 >= padY() && c.y - 4 <= padY() + 6 && Math.abs(c.x - P.x) < P.w / 2 + 7) { c.got = true; applyCap(c.type); }
        }
        S.caps = S.caps.filter(c => !c.got && c.y < VH + 8);
        // lasers
        for (const L of S.bolts) {
          L.y -= 330 * dt;
          if (L.y < HUDH + WALL) L.dead = true;
          const h = cellAt(L.x, L.y);
          if (h && !L.dead) { L.dead = true; hitBrick(h[0], h[1]); if (mode !== 'play') break; }
        }
        S.bolts = S.bolts.filter(L => !L.dead);
      }
      S.grid && S.grid.forEach(r => r.forEach(b => { if (b && b.fl > 0) b.fl -= dt; }));
      for (const p of S.parts) { p.vy += 150 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
      S.parts = S.parts.filter(p => p.life > 0);
      for (const f of S.floats) { f.y -= 18 * dt; f.t -= dt; }
      S.floats = S.floats.filter(f => f.t > 0);
      if (mode === 'clear' && (overT -= dt) <= 0) afterClear();
      else if (mode === 'over' && (overT -= dt) <= 0) afterOver();
    }
    function launchOne(b) {
      const rel = clamp(b.off / (S.pad.w / 2), -1, 1);
      let a = rel * 0.9; if (Math.abs(a) < 0.18) a = (Math.random() < 0.5 ? -1 : 1) * rnd(0.2, 0.45);
      const sp = curSpeed(); b.vx = Math.sin(a) * sp; b.vy = -Math.cos(a) * sp; b.stuck = false; b.serve = false;
    }

    /* ---- drawing ---- */
    function brickRect(gc, b, x, y) {
      const col = PAL[b.t];
      if (neon) {
        gc.shadowColor = col; gc.shadowBlur = 6;
        gc.fillStyle = 'rgba(0,0,0,.6)'; gc.fillRect(x + 1, y + 1, BCW - 2, BCH - 2);
        gc.strokeStyle = col; gc.lineWidth = 1; gc.strokeRect(x + 1.5, y + 1.5, BCW - 3, BCH - 3);
        gc.shadowBlur = 0;
        gc.fillStyle = col; gc.globalAlpha = b.t === 'x' ? 0.55 : 0.28; gc.fillRect(x + 2, y + 2, BCW - 4, BCH - 4); gc.globalAlpha = 1;
        if (b.t === 'm' || b.t === 'n') { gc.fillStyle = col; for (let i = 0; i < b.hp; i++) gc.fillRect(x + 4 + i * 3, y + 3, 2, 2); }
        if (b.t === 'x') { gc.fillStyle = '#fff'; gc.fillRect(x + 7, y + 3, 2, 2); }
      } else {
        gc.fillStyle = '#000'; gc.fillRect(x, y, BCW, BCH);
        gc.fillStyle = col; gc.fillRect(x, y, BCW - 1, BCH - 1);
        gc.fillStyle = 'rgba(255,255,255,.55)'; gc.fillRect(x, y, BCW - 1, 1); gc.fillRect(x, y, 1, BCH - 1);
        gc.fillStyle = 'rgba(0,0,0,.35)'; gc.fillRect(x, y + BCH - 2, BCW - 1, 1); gc.fillRect(x + BCW - 2, y, 1, BCH - 1);
        if (b.t === 'x') { gc.fillStyle = '#b08850'; for (let i = 0; i < 4; i++) gc.fillRect(x + 2 + i * 3, y + 2 + (i % 2) * 2, 2, 1); gc.fillStyle = '#402810'; gc.fillRect(x + 1, y + 5, BCW - 3, 1); }
        if (b.t === 'm' || b.t === 'n') {
          gc.fillStyle = '#e0e8f0'; gc.fillRect(x + 2, y + 2, 1, 1); gc.fillRect(x + BCW - 4, y + 2, 1, 1); gc.fillRect(x + 2, y + BCH - 4, 1, 1); gc.fillRect(x + BCW - 4, y + BCH - 4, 1, 1);
          const max = b.t === 'm' ? 2 : 3;
          if (b.hp < max) { gc.fillStyle = '#303038'; gc.fillRect(x + 5, y + 2, 1, 2); gc.fillRect(x + 6, y + 4, 1, 1); gc.fillRect(x + 7, y + 5, 2, 1); if (b.hp < max - 1) { gc.fillRect(x + 10, y + 1, 1, 3); gc.fillRect(x + 9, y + 4, 1, 1); } }
        }
      }
    }
    function drawLayer() {
      lg.setTransform(1, 0, 0, 1, 0, 0); lg.clearRect(0, 0, layer.width, layer.height);
      lg.setTransform(ppx, 0, 0, ppx, 0, 0); lg.imageSmoothingEnabled = false;
      S.grid.forEach((row, r) => row.forEach((b, c) => { if (b) brickRect(lg, b, WALL + c * BCW, BTOP + r * BCH); }));
      dirty = false;
    }
    function drawBack() {
      if (neon) {
        g.fillStyle = '#06000f'; g.fillRect(0, 0, BW, VH);
        g.strokeStyle = 'rgba(255,0,200,.18)'; g.lineWidth = 1;
        for (let x = WALL; x <= BW - WALL; x += 16) { g.beginPath(); g.moveTo(x + 0.5, HUDH + WALL); g.lineTo(x + 0.5, VH); g.stroke(); }
        const off = (tt * 8) % 16;
        for (let y = HUDH + WALL + off; y < VH; y += 16) { g.beginPath(); g.moveTo(WALL, y + 0.5); g.lineTo(BW - WALL, y + 0.5); g.stroke(); }
      } else {
        const bgs = [['#101050', '#18186a'], ['#401040', '#541a54'], ['#0c3a2c', '#124a3a'], ['#3a2a0c', '#4a3812']], bc = bgs[(S ? S.lvl : 0) % 4];
        g.fillStyle = bc[0]; g.fillRect(0, 0, BW, VH);
        g.fillStyle = bc[1];
        for (let y = HUDH + WALL; y < VH; y += 12) for (let x = WALL + ((y / 12) % 2) * 6; x < BW - WALL; x += 12) { g.fillRect(x + 2, y + 2, 4, 1); g.fillRect(x + 1, y + 3, 6, 1); g.fillRect(x + 2, y + 4, 4, 1); }
      }
      // walls
      if (neon) {
        g.shadowColor = '#30f0ff'; g.shadowBlur = 8; g.strokeStyle = '#30f0ff'; g.lineWidth = 2;
        g.strokeRect(WALL - 1, HUDH + WALL - 1, BW - WALL * 2 + 2, VH + 10); g.shadowBlur = 0;
      } else {
        const bev = (x, y, w, h) => { g.fillStyle = '#909098'; g.fillRect(x, y, w, h); g.fillStyle = '#d0d0d8'; g.fillRect(x, y, w, 1); g.fillRect(x, y, 1, h); g.fillStyle = '#505058'; g.fillRect(x, y + h - 1, w, 1); g.fillRect(x + w - 1, y, 1, h); };
        bev(0, HUDH, BW, WALL); bev(0, HUDH, WALL, VH - HUDH); bev(BW - WALL, HUDH, WALL, VH - HUDH);
        g.fillStyle = '#e04040'; for (let y = HUDH + 30; y < VH; y += 60) { g.fillRect(2, y, 4, 6); g.fillRect(BW - 6, y, 4, 6); }
      }
      g.fillStyle = '#000'; g.fillRect(0, 0, BW, HUDH);
    }
    function drawPaddle() {
      const P = S.pad, x = Math.round(P.x - P.w / 2), y = padY(), w = Math.round(P.w);
      if (neon) {
        g.shadowColor = S.sticky > 0 ? '#ffb040' : '#30f0ff'; g.shadowBlur = 10;
        g.fillStyle = S.sticky > 0 ? '#ffb040' : '#30f0ff'; g.fillRect(x, y, w, 6);
        g.shadowBlur = 0; g.fillStyle = '#ffffff'; g.fillRect(x + 2, y + 1, w - 4, 1);
        if (S.laser > 0) { g.fillStyle = '#50ff50'; g.fillRect(x + 1, y - 3, 3, 3); g.fillRect(x + w - 4, y - 3, 3, 3); }
      } else {
        g.fillStyle = '#000'; g.fillRect(x - 1, y - 1, w + 2, 8);
        g.fillStyle = '#b0b0b8'; g.fillRect(x + 4, y, w - 8, 6); g.fillStyle = '#f0f0f8'; g.fillRect(x + 4, y + 1, w - 8, 1); g.fillStyle = '#606068'; g.fillRect(x + 4, y + 5, w - 8, 1);
        g.fillStyle = '#d02020'; g.fillRect(x, y, 5, 6); g.fillRect(x + w - 5, y, 5, 6); g.fillStyle = '#ff8080'; g.fillRect(x + 1, y + 1, 3, 1); g.fillRect(x + w - 4, y + 1, 3, 1);
        if (S.sticky > 0) { g.fillStyle = '#c08040'; g.fillRect(x + 6, y - 1, w - 12, 1); }
        if (S.laser > 0) { g.fillStyle = '#40a040'; g.fillRect(x + 1, y - 4, 3, 4); g.fillRect(x + w - 4, y - 4, 3, 4); g.fillStyle = '#a0ffa0'; g.fillRect(x + 2, y - 4, 1, 1); g.fillRect(x + w - 3, y - 4, 1, 1); }
      }
    }
    function drawCap(c) {
      const d = CAPS[c.type], x = Math.round(c.x - 7), y = Math.round(c.y - 4);
      if (neon) { g.shadowColor = d.col; g.shadowBlur = 6; }
      g.fillStyle = '#000'; g.fillRect(x - 1, y - 1, 16, 10);
      g.fillStyle = d.col; g.fillRect(x, y, 14, 8); g.fillRect(x - 1, y + 1, 16, 6);
      g.shadowBlur = 0;
      g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(x + 1, y + 1, 12, 1);
      const ic = '#101010', R = (a, b, w, h) => g.fillRect(x + a, y + b, w, h);
      g.fillStyle = ic;
      const ph = (c.t * 6 | 0) % 2;
      if (c.type === 'wide') { R(3, 4, 8, 1); R(3, 3, 1, 3); R(2, 4, 1, 1); R(10, 3, 1, 3); R(11, 4, 1, 1); }
      else if (c.type === 'multi') { R(3, 3, 2, 2); R(6, 3 + ph, 2, 2); R(9, 3, 2, 2); }
      else if (c.type === 'laser') { R(4, 2, 2, 5); R(8, 2, 2, 5); }
      else if (c.type === 'slow') { R(2, 4, 2, 1); R(4, 3, 2, 1); R(6, 4, 2, 1); R(8, 5, 2, 1); R(10, 4, 2, 1); }
      else if (c.type === 'sticky') { R(6, 2, 2, 1); R(5, 3, 4, 2); R(4, 5, 6, 1); R(5, 6, 4, 1); }
      else if (c.type === 'life') { g.fillStyle = '#ffffff'; R(4, 2, 2, 1); R(8, 2, 2, 1); R(3, 3, 8, 2); R(4, 5, 6, 1); R(5, 6, 4, 1); }
    }
    function drawBall(b) {
      const x = b.x, y = b.y;
      if (neon) {
        b.tr.forEach(([tx, ty], i) => { g.fillStyle = `rgba(48,240,255,${(i + 1) / 16})`; g.fillRect(Math.round(tx) - 1, Math.round(ty) - 1, 3, 3); });
        g.shadowColor = '#ffffff'; g.shadowBlur = 8; g.fillStyle = '#ffffff';
        g.beginPath(); g.arc(x, y, 2.6, 0, 6.283); g.fill(); g.shadowBlur = 0;
      } else {
        const X = Math.round(x - 2.5), Y = Math.round(y - 2.5);
        g.fillStyle = '#000'; g.fillRect(X, Y + 1, 5, 3); g.fillRect(X + 1, Y, 3, 5);
        g.fillStyle = '#f0f0f0'; g.fillRect(X + 1, Y + 1, 3, 3); g.fillStyle = '#ffffff'; g.fillRect(X + 1, Y + 1, 1, 1); g.fillStyle = '#a0a0a8'; g.fillRect(X + 3, Y + 3, 1, 1);
      }
    }
    function drawHud() {
      txt(g, 'SCORE ' + pad6(S.score), 3, 7.5, 9, '#ffffff', 'left');
      txt(g, 'R' + (S.lvl + 1), BW / 2 + 12, 7.5, 9, neon ? '#ff40c0' : '#ffe040');
      txt(g, 'HI ' + pad6(Math.max(S.score, hi[0] ? hi[0].s : 0)), BW - 3, 7.5, 9, '#a0c8ff', 'right');
      for (let i = 0; i < Math.min(8, S.lives - 1); i++) { g.fillStyle = neon ? '#30f0ff' : '#d02020'; g.fillRect(WALL + 2 + i * 12, VH - 8, 10, 3); }
      let bx = BW - WALL - 4;
      [['wide', 20], ['laser', 15], ['slow', 10], ['sticky', 20]].forEach(([k, mx]) => { if (S[k] > 0) { bx -= 20; g.fillStyle = '#333'; g.fillRect(bx, VH - 8, 18, 3); g.fillStyle = CAPS[k === 'wide' ? 'wide' : k].col; g.fillRect(bx, VH - 8, Math.ceil(18 * S[k] / mx), 3); } });
    }
    function drawTitle() {
      drawBack();
      const y0 = Math.max(46, VH * 0.15);
      g.save(); g.font = 'italic 900 34px Impact, "Arial Black", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      if (neon) {
        g.shadowColor = '#ff30c0'; g.shadowBlur = 12; g.lineWidth = 2; g.strokeStyle = '#ff60d0'; g.strokeText('BRICK', BW / 2, y0 - 16); g.shadowColor = '#30f0ff'; g.strokeStyle = '#60f8ff'; g.strokeText('BUSTER', BW / 2, y0 + 16); g.shadowBlur = 0;
      } else {
        const gr = g.createLinearGradient(0, y0 - 32, 0, y0 + 32); gr.addColorStop(0, '#ffe040'); gr.addColorStop(0.5, '#f08830'); gr.addColorStop(1, '#e04040');
        g.lineWidth = 4; g.strokeStyle = '#200030'; g.strokeText('BRICK', BW / 2, y0 - 16); g.strokeText('BUSTER', BW / 2, y0 + 16); g.fillStyle = gr; g.fillText('BRICK', BW / 2, y0 - 16); g.fillText('BUSTER', BW / 2, y0 + 16);
      }
      g.restore();
      // a little row of bricks
      const bx0 = BW / 2 - 52;
      ['a', 'b', 'c', 'd', 'e', 'f', 'g'].forEach((t, i) => brickRect(g, { t, hp: 1 }, bx0 + i * 15, y0 + 38 + Math.round(Math.sin(tt * 3 + i) * 2)));
      const hy = y0 + 62;
      txt(g, '- HIGH SCORES -', BW / 2, hy, 10, neon ? '#ff60d0' : '#ffe040');
      hi.forEach((h, i) => txt(g, `${i + 1}. ${h.i}  ${pad6(h.s)}`, BW / 2, hy + 14 + i * 12, 10, i === lastRank && (tt * 4 | 0) % 2 ? '#ffff40' : i === lastRank ? '#ffffff' : '#a0b0c8'));
      const by = Math.min(VH - 40, hy + 14 + hi.length * 12 + 10);
      if ((tt * 2 | 0) % 2 === 0) txt(g, 'PRESS SPACE OR TAP TO START', BW / 2, by, 9, '#ffffff');
      if (prog) txt(g, 'C = CONTINUE ROUND ' + (prog.lvl + 1), BW / 2, by + 13, 8, '#80ff80');
      txt(g, '(C) 1990 PIXELWORKS ARCADE', BW / 2, VH - 8, 7, '#607090', 'center', false);
    }
    function draw() {
      g.setTransform(ppx, 0, 0, ppx, 0, 0);
      g.imageSmoothingEnabled = false;
      if (mode === 'title' || !S) { drawTitle(); return; }
      drawBack();
      if (dirty) drawLayer();
      g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(layer, 0, 0); g.setTransform(ppx, 0, 0, ppx, 0, 0);
      S.grid.forEach((row, r) => row.forEach((b, c) => { if (b && b.fl > 0) { g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(WALL + c * BCW, BTOP + r * BCH, BCW - 1, BCH - 1); } }));
      S.caps.forEach(drawCap);
      g.fillStyle = neon ? '#80ff80' : '#ffff80';
      S.bolts.forEach(L => g.fillRect(Math.round(L.x) - 1, Math.round(L.y) - 4, 2, 6));
      drawPaddle();
      S.balls.forEach(drawBall);
      S.parts.forEach(p => { g.fillStyle = p.c; g.fillRect(Math.round(p.x), Math.round(p.y), 2, 2); });
      S.floats.forEach(f => txt(g, f.s, BW / 2 + clamp(f.x - BW / 2, -60, 60), Math.round(f.y), 8, '#ffffff'));
      drawHud();
      if (S.flash > 0) { g.fillStyle = `rgba(255,0,0,${S.flash})`; g.fillRect(0, 0, BW, VH); }
      if (S.banner) { txt(g, S.banner.a, BW / 2, VH * 0.6, 14, neon ? '#ff60d0' : '#ffe040'); if (S.banner.b) txt(g, S.banner.b, BW / 2, VH * 0.6 + 15, 9, '#ffffff'); }
      if (mode === 'play' && S.balls.some(b => b.stuck && b.serve) && !S.banner && (tt * 2 | 0) % 2 === 0) txt(g, coarse() ? 'LET GO TO LAUNCH' : 'CLICK OR SPACE TO LAUNCH', BW / 2, VH * 0.66, 8, '#ffffff');
      if (mode === 'over' || mode === 'ini') { txt(g, S.won ? 'YOU WIN!' : 'GAME OVER', BW / 2, VH * 0.55, 20, S.won ? '#80ff80' : '#ff4060'); txt(g, 'FINAL SCORE ' + S.score, BW / 2, VH * 0.55 + 20, 10, '#ffffff'); }
      if (paused) { g.fillStyle = 'rgba(0,0,20,.6)'; g.fillRect(0, 0, BW, VH); txt(g, 'PAUSED', BW / 2, VH * 0.45, 20, '#ffe040'); txt(g, 'PRESS P OR TAP TO RESUME', BW / 2, VH * 0.45 + 20, 9, '#ffffff'); }
    }
    function frame(now) {
      if (closed) return;
      raf = requestAnimationFrame(frame);
      let dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
      if (mode === 'play' && !paused && !W.el.classList.contains('active')) togglePause();
      tt += dt;
      if (S && !paused && (mode === 'play' || mode === 'clear' || mode === 'over')) update(dt);
      draw();
    }

    /* ---- input ---- */
    const KMAP = { arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right', ' ': 'fire', arrowup: 'fire', w: 'fire', enter: 'fire' };
    W.onKey = e => {
      const k = e.key, lk = k.toLowerCase();
      if (mode === 'ini') { if (iniKey) iniKey(e); return; }
      if (KMAP[lk]) e.preventDefault();
      if (lk === 'p') { togglePause(); return; }
      if (mode === 'title') { if (k === ' ' || k === 'Enter') newGame(0); else if (lk === 'c' && prog) continueGame(); return; }
      if (mode !== 'play' && mode !== 'clear') return;
      if (paused) { if (k === 'Enter' || k === ' ') togglePause(); return; }
      if (KMAP[lk]) { if (KMAP[lk] === 'fire' && !keys.fire) primary(); keys[KMAP[lk]] = true; }
    };
    const onUp = e => { const m = KMAP[e.key.toLowerCase()]; if (m) keys[m] = false; };
    window.addEventListener('keyup', onUp);
    const onBlur = () => Object.keys(keys).forEach(k => { keys[k] = false; });
    window.addEventListener('blur', onBlur);
    const toX = e => { const r = cv.getBoundingClientRect(); return (e.clientX - r.left) / r.width * BW; };
    cv.addEventListener('pointerdown', e => {
      e.preventDefault();
      if (mode === 'title') { newGame(0); return; }
      if (mode !== 'play' && mode !== 'clear') return;
      if (paused) { togglePause(); return; }
      const touch = e.pointerType !== 'mouse';
      drag = { id: e.pointerId, touch };
      target = toX(e);
      try { cv.setPointerCapture(e.pointerId); } catch (err) {}
      if (!touch) primary();
      else if (S.laser > 0 && !S.balls.some(b => b.stuck)) fireLaser();
    });
    cv.addEventListener('pointermove', e => {
      if (!S || (mode !== 'play' && mode !== 'clear') || paused) return;
      if (e.pointerType === 'mouse' || (drag && drag.id === e.pointerId)) target = toX(e);
    });
    const endDrag = e => {
      if (!drag || drag.id !== e.pointerId) return;
      const wasTouch = drag.touch; drag = null;
      if (wasTouch && S && mode === 'play' && !paused) launch();
    };
    cv.addEventListener('pointerup', endDrag); cv.addEventListener('pointercancel', e => { drag = null; });
    pauseB.addEventListener('click', () => { if (mode === 'play') togglePause(); else if (mode === 'title') newGame(0); });
    goB.addEventListener('pointerdown', e => { e.preventDefault(); if (mode === 'title') newGame(0); else if (paused) togglePause(); else primary(); });

    W.onMin = () => { if (mode === 'play' && !paused) togglePause(); };
    W.onResize = fit;
    W.onClose = () => { closed = true; cancelAnimationFrame(raf); raf = 0; window.removeEventListener('keyup', onUp); window.removeEventListener('blur', onBlur); };
    fit();
    toTitle();
    requestAnimationFrame(t => { last = t; fit(); frame(t); });
  }

  const BRICK_ICON = '<svg viewBox="0 0 32 32" shape-rendering="crispEdges" aria-hidden="true"><rect x="1" y="1" width="30" height="30" fill="#101050" stroke="#000"/><rect x="1" y="1" width="30" height="2" fill="#909098"/><rect x="3" y="5" width="8" height="4" fill="#e04040"/><rect x="12" y="5" width="8" height="4" fill="#e04040"/><rect x="21" y="5" width="8" height="4" fill="#e04040"/><rect x="3" y="10" width="8" height="4" fill="#f08830"/><rect x="21" y="10" width="8" height="4" fill="#f08830"/><rect x="3" y="15" width="8" height="4" fill="#e8d838"/><rect x="12" y="15" width="8" height="4" fill="#38b838"/><g fill="#fff" opacity=".5"><rect x="3" y="5" width="8" height="1"/><rect x="12" y="5" width="8" height="1"/><rect x="21" y="5" width="8" height="1"/><rect x="3" y="10" width="8" height="1"/><rect x="21" y="10" width="8" height="1"/></g><rect x="15" y="20" width="3" height="3" fill="#fff"/><rect x="10" y="26" width="12" height="3" fill="#b0b0b8"/><rect x="10" y="26" width="3" height="3" fill="#d02020"/><rect x="19" y="26" width="3" height="3" fill="#d02020"/></svg>';
  const BRICK_CSS = `
    .bbk{height:100%;display:flex;flex-direction:column;background:#000;user-select:none;-webkit-user-select:none}
    .bbk-wrap{flex:1;min-height:0;position:relative;display:flex;align-items:center;justify-content:center;overflow:hidden;background:#000}
    .bbk-wrap canvas{display:block;touch-action:none;cursor:none;image-rendering:pixelated}
    .bbk-bar{display:flex;gap:6px;align-items:center;padding:3px;background:#c0c0c0}
    .bbk-bar .btn{min-width:0;padding:4px 12px;min-height:32px;touch-action:manipulation}
    .bbk-msg{flex:1;text-align:center;font-size:11px;color:#000;min-width:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
    .bbk-ini{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.55)}
    .bbk-ini[hidden]{display:none}
    .bbk-ibox{padding:10px 16px;text-align:center;display:flex;flex-direction:column;gap:8px;color:#000}
    .bbk-ibox h3{margin:0;font:400 28px/1 var(--dos);color:#800000}
    .bbk-slots{display:flex;gap:8px;justify-content:center}
    .bbk-slot{display:flex;flex-direction:column;gap:3px;align-items:center}
    .bbk-slot b{font:400 36px/1 var(--dos);background:#000;color:#ff60d0;width:40px;padding:3px 0;cursor:pointer}
    .bbk-slot b.on{color:#ff0;outline:2px solid #ff0}
    .bbk-slot .btn{min-width:44px;min-height:32px;padding:3px 0;touch-action:manipulation}
  `;

  (window.RETRO_APPS = window.RETRO_APPS || []).push({
    id: 'comet',
    label: 'Captain Comet',
    kind: 'store', cat: 'game', year: 1990, price: 19.95,
    publisher: 'Backyard Rocket Software',
    genre: 'Platformer',
    tagline: 'Colander on. Pogo stick ready. Blast off!',
    blurb: 'Casey Starr is CAPTAIN COMET, defender of the backyard, with a cardboard jetpack, a trusty Zapper and Nibbles the space hamster rolling along behind. Pogo, zap and puff your way across six smooth-scrolling worlds, from the backyard to the Moon to the Crystal Comet Tail, grab keycards, dodge gloop and face Emperor Gloop himself in his throne room. Checkpoints, a star map that saves your progress, and 16-color graphics.',
    sizeKB: 1400,
    box: { bg: '#0000aa', fg: '#ffff55', accent: '#55ff55' },
    icon: COMET_ICON,
    window: { w: 660, h: 500 },
    css: COMET_CSS,
    open: openComet
  }, {
    id: 'bricks',
    label: 'Brick Buster',
    kind: 'store', cat: 'game', year: 1990, price: 9.95,
    publisher: 'Pixelworks Arcade',
    genre: 'Arcade',
    tagline: 'One paddle. One ball. A whole lot of bricks.',
    blurb: 'Smash your way through 24 rounds of colorful brick walls. Aim with the edges of your paddle, crack the tough steel bricks, bounce around the unbreakable bronze ones, and catch capsules for a wide paddle, triple ball, laser cannons, slow ball, sticky paddle and extra lives. The ball keeps speeding up, so stay sharp! Mouse, keyboard or touch, with a saved high-score table.',
    sizeKB: 400,
    box: { bg: '#101050', fg: '#ffe040', accent: '#e04040' },
    icon: BRICK_ICON,
    window: { w: 440, h: 600 },
    css: BRICK_CSS,
    open: openBricks
  });
})();
