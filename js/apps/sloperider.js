/* Slope Rider: a top-down downhill skiing game (1990, 1995). An original game: dodge trees and dogs, hit the ramps,
   race the gates, and keep ahead of Old Bramble, the grumpy giant snow moose who wakes up past the 2000 m mark. */
(function () {
  /* 16-color EGA/VGA palette */
  const P = { k: '#000000', B: '#0000aa', g: '#00aa00', c: '#00aaaa', r: '#aa0000', m: '#aa00aa', n: '#aa5500', l: '#aaaaaa', d: '#555555', b: '#5555ff', G: '#55ff55', C: '#55ffff', R: '#ff5555', M: '#ff55ff', y: '#ffff55', w: '#ffffff' };
  const M = 8;               // world pixels per metre
  const CH = 160;            // world chunk size
  const GRAV = 320;
  const FREE_GOAL = 2000;    // metres
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const DEG = Math.PI / 180;
  function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const hash = (a, b, c) => (Math.imul(a, 73856093) ^ Math.imul(b, 19349663) ^ Math.imul(c, 83492791)) >>> 0;

  function mk(w, h, fn) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d');
    fn((x, y, ww, hh, col) => { g.fillStyle = P[col] || col; g.fillRect(x, y, ww, hh); }, g);
    return c;
  }
  function spr(rows, map, flip) {
    const w = Math.max(...rows.map(r => r.length));
    return mk(w, rows.length, R => rows.forEach((r, y) => [...r].forEach((ch, x) => { const col = (map && map[ch]) || P[ch]; if (ch !== '.' && col) R(flip ? w - 1 - x : x, y, 1, 1, col); })));
  }

  /* ---- skier bodies (H hat, V goggles, J jacket, T trousers) ---- */
  const BODY = {
    front: ['..HHH..', '.HHHHH.', '.kVVVk.', '..JJJ..', '.JJJJJ.', 'J.JJJ.J', 'J.JJJ.J', '..TTT..', '..T.T..', '..T.T..'],
    diag: ['..HHH..', '.HHHHH.', '.kVVV..', '..JJJ..', '.JJJJJ.', 'J.JJJJ.', '..JJJ.J', '..TTT..', '..T.TT.', '..T..T.'],
    side: ['..HHH..', '.HHHH..', '..HVV..', '..JJJ..', '.JJJJ..', '.JJJJJ.', '..JJ.J.', '..TTT..', '..TTTT.', '..T..T.'],
    back: ['..HHH..', '.HHHHH.', '.HHHHH.', '..JJJ..', '.JJJJJ.', 'J.JJJ.J', 'J.JJJ.J', '..TTT..', '..T.T..', '..T.T..'],
    ball: ['..HHH...', '.HHHHJ..', '.VVJJJJ.', '.JJJJJJ.', 'JJJTTJJ.', '.JTTTT..', '..TT.TT.', '...k..k.'],
    sit: ['...HHH...', '..HHHHH..', '..kVVVk..', '...JJJ...', '.JJJJJJJ.', '..JJJJJ..', '.TTTTTTT.', 'TT.....TT']
  };
  const OUTFITS = {
    p90: { H: P.y, V: P.C, J: P.R, T: P.B, ski: P.y },
    p95: { H: P.C, V: P.y, J: P.M, T: P.B, ski: P.y },
    n1: { H: P.r, V: P.C, J: P.g, T: P.d, ski: P.k },
    n2: { H: P.w, V: P.k, J: P.b, T: P.k, ski: P.r },
    n3: { H: P.G, V: P.C, J: P.y, T: P.c, ski: P.k },
    b1: { H: P.k, V: P.y, J: P.c, T: P.d, ski: P.m },
    b2: { H: P.R, V: P.C, J: P.n, T: P.B, ski: P.G }
  };
  const cache = {};
  function body(pose, outfit, flip) {
    const k = pose + outfit + (flip ? 'f' : '');
    return cache[k] || (cache[k] = spr(BODY[pose], OUTFITS[outfit], flip));
  }

  /* ---- scenery sprites ---- */
  function pine(W, H) {
    return mk(W, H, R => {
      const cx = Math.floor(W / 2), trunk = 3, top = H - trunk;
      R(cx - 1, H - trunk, 2, trunk, 'n'); R(cx, H - trunk, 1, trunk, 'k');
      const tiers = 3, th = top / tiers;
      for (let y = 0; y < top; y++) {
        const t = Math.min(tiers - 1, Math.floor(y / th)), loc = (y - t * th) / th;
        const half = Math.max(1, Math.round(Math.min(W / 2, 1 + loc * (W / 2) * (0.5 + 0.25 * t))));
        for (let x = cx - half; x < cx + half; x++) {
          let col = 'g';
          if (x >= cx + half * 0.3 && (x + y) % 2) col = 'k';
          if (loc > 0.8 && (x + y) % 2) col = 'k';
          if (loc < 0.3 && x < cx + 1) col = 'w';
          if (x === cx - half && loc > 0.4) col = 'w';
          R(x, y, 1, 1, col);
        }
      }
    });
  }
  let SC = null;
  function scenery() {
    if (SC) return SC;
    SC = {
      tree: pine(16, 28), tree2: pine(11, 18),
      dead: spr(['n...n...n', '.n..n..n.', '..n.n.n..', 'n..nnn..n', '.n.nnk.n.', '..nnnnk..', '...nnk...', '...nnk...', '...nnk...', '...nnk...', '..nnnkk..']),
      rock: spr(['...wwww...', '..dwwwwdd.', '.dllwllldd', 'dllllllldd', 'dlldlldddk', '.ddddddkk.']),
      stump: spr(['.wwwww.', 'nyyyyyn', 'nynnnyn', 'nyyyyyn', 'knnnnnk', '.knnnk.']),
      mogul: mk(18, 7, R => { for (let y = 0; y < 7; y++) for (let x = 0; x < 18; x++) { const dx = (x - 8.5) / 9, dy = (y - 3.5) / 3.5; const q = dx * dx + dy * dy; if (q > 1) continue; if (dy > 0.2 && dx > -0.6) R(x, y, 1, 1, (x + y) % 2 ? 'l' : 'C'); else if (dy > -0.1 && (x + y) % 2 && dx > 0) R(x, y, 1, 1, 'C'); } }),
      ramp: spr(['..llllllllllllll..', '..lwwwwwwwwwwwwl..', '.lwwwCwwwwwwCwwwl.', '.lwwwwwwwwwwwwwwl.', 'lwwwwwCwwwwCwwwwwl', 'lwwwwwwwwwwwwwwwwl', 'nnnnnnnnnnnnnnnnnn', 'RyRyRyRyRyRyRyRyRy', 'nnnnnnnnnnnnnnnnnn', '.k..............k.']),
      post: spr(['yy', 'RR', 'RR', 'yy', 'RR', 'RR', 'k.', 'k.', 'k.']),
      flagR: spr(['kRRRR', 'kRRR.', 'kRR..', 'kR...', 'k....', 'k....', 'k....', 'k....', 'k....', 'k....', 'k....', 'k....', 'd....']),
      flagB: spr(['kbbbb', 'kbbB.', 'kbB..', 'kB...', 'k....', 'k....', 'k....', 'k....', 'k....', 'k....', 'k....', 'k....', 'd....']),
      sign: spr(['nnnnnnnnnnn', 'nyyyyyyyyyn', 'nykkykykkyn', 'nyyyyyyyyyn', 'nnnnnnnnnnn', '....nk.....', '....nk.....', '....nk.....', '....nk.....']),
      dog: [spr(['.......nn.', 'n......nkn', '.nnnnnnrnk', '.nnnnnnn..', '.n.n..n.n.', '.n.n..n.n.']), spr(['.......nn.', 'n......nkn', '.nnnnnnrnk', '.nnnnnnn..', 'n..n.n...n', '..........'])],
      dogL: [spr(['.......nn.', 'n......nkn', '.nnnnnnrnk', '.nnnnnnn..', '.n.n..n.n.', '.n.n..n.n.'], null, true), spr(['.......nn.', 'n......nkn', '.nnnnnnrnk', '.nnnnnnn..', 'n..n.n...n', '..........'], null, true)],
      moose: [0, 1, 2].map(f => mooseSprite(f))
    };
    return SC;
  }
  /* Old Bramble, the grumpy giant snow moose, charging downhill (toward you). */
  function mooseSprite(f) {
    return mk(42, 42, R => {
      const X = 1, Y = 2;
      const sym = (x, y, w, h, c) => { R(X + x, Y + y, w, h, c); R(X + 40 - x - w, Y + y, w, h, c); };
      // antlers
      sym(1, 0, 2, 6, 'l'); sym(5, 1, 2, 5, 'l'); sym(9, 2, 2, 4, 'l'); sym(1, 5, 13, 4, 'l'); sym(11, 8, 4, 3, 'l');
      sym(1, 5, 12, 1, 'w'); sym(1, 0, 2, 1, 'w'); sym(5, 1, 2, 1, 'w'); sym(9, 2, 2, 1, 'w');
      sym(2, 9, 1, 3, 'C'); sym(6, 9, 1, 2, 'C'); sym(9, 9, 1, 4, 'C'); sym(1, 8, 12, 1, 'd');
      // body and hump behind the head
      R(X + 7, Y + 15, 26, 16, 'k'); R(X + 8, Y + 15, 24, 15, 'n'); R(X + 11, Y + 13, 18, 3, 'n'); R(X + 11, Y + 13, 18, 1, 'w');
      R(X + 8, Y + 15, 4, 1, 'w'); R(X + 28, Y + 15, 4, 1, 'w');
      for (let y = 22; y < 30; y++) for (let x = 8; x < 32; x++) if ((x + y) % 2 && (x < 13 || x > 27)) R(X + x, Y + y, 1, 1, 'k');
      // legs
      const up = [f === 1 ? 2 : 0, f === 2 ? 2 : 0];
      [[9, 0], [14, 1], [24, 0], [29, 1]].forEach(([lx, s]) => { const u = up[s]; R(X + lx, Y + 30 - u, 3, 7, 'n'); R(X + lx + 2, Y + 30 - u, 1, 7, 'k'); R(X + lx, Y + 37 - u, 3, 2, 'k'); });
      if (f) { R(X + (f === 1 ? 6 : 31), Y + 37, 3, 1, 'l'); R(X + (f === 1 ? 4 : 34), Y + 36, 2, 1, 'C'); }
      // ears and head
      sym(12, 8, 4, 2, 'n'); sym(12, 10, 2, 1, 'k');
      R(X + 14, Y + 7, 12, 16, 'k'); R(X + 15, Y + 7, 10, 15, 'n'); R(X + 15, Y + 7, 10, 1, 'w');
      R(X + 16, Y + 18, 8, 7, 'n'); R(X + 15, Y + 18, 1, 7, 'k'); R(X + 24, Y + 18, 1, 7, 'k'); R(X + 16, Y + 25, 8, 1, 'k');
      R(X + 17, Y + 22, 2, 1, 'k'); R(X + 21, Y + 22, 2, 1, 'k');
      R(X + 19, Y + 26, 2, 4, 'k');
      // grumpy eyes
      R(X + 16, Y + 12, 2, 2, 'y'); R(X + 22, Y + 12, 2, 2, 'y'); R(X + 17, Y + 13, 1, 1, 'k'); R(X + 22, Y + 13, 1, 1, 'k');
      R(X + 15, Y + 10, 2, 1, 'k'); R(X + 17, Y + 11, 2, 1, 'k'); R(X + 23, Y + 10, 2, 1, 'k'); R(X + 21, Y + 11, 2, 1, 'k');
      // breath puffs
      if (f === 2) { R(X + 14, Y + 26, 2, 1, 'l'); R(X + 24, Y + 26, 2, 1, 'l'); }
    });
  }

  const OB = {
    tree: { hw: 3, hh: 3, z: 27 }, tree2: { hw: 2, hh: 3, z: 17 }, dead: { hw: 2, hh: 2, z: 13 },
    rock: { hw: 4, hh: 3, z: 6 }, stump: { hw: 3, hh: 3, z: 6 }, mogul: { hw: 7, hh: 4, z: 0, soft: 1 }, ramp: { hw: 8, hh: 8, z: 0, soft: 1 },
    post: { hw: 1, hh: 2, z: 9 }, flagR: { hw: 1, hh: 2, z: 13 }, flagB: { hw: 1, hh: 2, z: 13 }, sign: { hw: 1, hh: 2, z: 9 }, sp: null
  };
  const TRICKS = { spin: { name: '360', dur: 0.45, pts: 150 }, flip: { name: 'BACK FLIP', dur: 0.55, pts: 250 }, grab: { name: 'DAFFY', dur: 0.38, pts: 100 } };
  const MODES = {
    free: { name: 'Free Ski', desc: 'Endless. How far can you go?' },
    slalom: { name: 'Slalom', desc: 'Race the flags. +5 s per missed gate.', len: 600, gap: 170 },
    trees: { name: 'Tree Slalom', desc: 'Gates through the forest.', len: 650, gap: 190 },
    air: { name: 'Big Air', desc: 'Ramps and tricks for points.', len: 800 }
  };
  const DIFF = { easy: { name: 'Easy', dens: 0.7, gate: 60, moose: 160, macc: 3, npc: 0.6 }, normal: { name: 'Normal', dens: 1, gate: 48, moose: 180, macc: 4, npc: 1 }, hard: { name: 'Hard', dens: 1.35, gate: 40, moose: 200, macc: 6, npc: 1.5 } };
  const CW = 360; // course width

  (window.RETRO_APPS = window.RETRO_APPS || []).push({
    id: 'sloperider',
    label: 'Slope Rider',
    help: 'Ski downhill past trees, dogs and ramps, race the slalom flags, and finish a run to earn money.',
    kind: 'builtin',
    eras: ['1990', '1995'],
    cat: 'game',
    icon: '<svg viewBox="0 0 32 32" shape-rendering="crispEdges" aria-hidden="true"><rect x="1" y="1" width="30" height="30" fill="#fff" stroke="#000"/><g fill="#00aa00"><rect x="5" y="4" width="2" height="2"/><rect x="4" y="6" width="4" height="2"/><rect x="3" y="8" width="6" height="2"/><rect x="23" y="16" width="2" height="2"/><rect x="22" y="18" width="4" height="2"/><rect x="21" y="20" width="6" height="2"/></g><rect x="5" y="10" width="2" height="2" fill="#aa5500"/><rect x="23" y="22" width="2" height="2" fill="#aa5500"/><rect x="14" y="7" width="4" height="2" fill="#ffff55"/><rect x="14" y="9" width="4" height="2" fill="#55ffff"/><rect x="13" y="11" width="6" height="5" fill="#ff5555"/><rect x="14" y="16" width="4" height="4" fill="#0000aa"/><g fill="#000"><rect x="11" y="18" width="1" height="1"/><rect x="12" y="19" width="1" height="1"/><rect x="13" y="20" width="1" height="1"/><rect x="14" y="21" width="1" height="1"/><rect x="15" y="22" width="1" height="1"/><rect x="16" y="23" width="1" height="1"/><rect x="17" y="24" width="1" height="1"/><rect x="18" y="25" width="1" height="1"/><rect x="13" y="18" width="1" height="1"/><rect x="14" y="19" width="1" height="1"/><rect x="16" y="21" width="1" height="1"/><rect x="17" y="22" width="1" height="1"/><rect x="18" y="23" width="1" height="1"/><rect x="19" y="24" width="1" height="1"/><rect x="20" y="25" width="1" height="1"/></g><g fill="#aaaaaa"><rect x="6" y="26" width="3" height="1"/><rect x="9" y="27" width="3" height="1"/><rect x="12" y="28" width="3" height="1"/></g></svg>',
    window: { w: 580, h: 500 },
    css: `
      .slr{height:100%;display:flex;flex-direction:column;background:#c0c0c0;user-select:none;-webkit-user-select:none}
      .slr-stat{display:flex;gap:3px;padding:3px}
      .slr-cell{flex:1;min-width:0;background:#000;padding:1px 4px;display:flex;flex-direction:column;align-items:flex-start;overflow:hidden}
      .slr-cell i{font:normal 10px/1.1 var(--ui);color:#aaa}
      .slr-cell b{font:400 17px/1 var(--dos);color:#5f5;white-space:nowrap}
      .slr-cell.slr-hid{display:none}
      @media (max-width:440px){.slr-cell b{font-size:14px}.slr-cell{padding:1px 2px}}
      .slr-wrap{flex:1;min-height:0;position:relative;overflow:hidden;background:#fff;margin:0 3px}
      .slr-wrap canvas{position:absolute;left:0;top:0;display:block;touch-action:none;image-rendering:pixelated}
      .slr-bar{display:flex;gap:4px;align-items:center;padding:3px}
      .slr-bar .btn{min-width:0;padding:4px 12px;min-height:32px;touch-action:manipulation}
      .slr-msg{flex:1;min-width:0;font-size:11px;text-align:center;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
      .slr-ov{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:8px;overflow:auto}
      .slr-ov[hidden]{display:none}
      .slr-box{padding:10px 12px;max-width:360px;width:100%;display:flex;flex-direction:column;gap:8px;color:#000;margin:auto}
      .slr-logo{font:400 34px/1 var(--dos);color:#0000aa;text-align:center;text-shadow:2px 2px #55ffff;letter-spacing:1px}
      .slr-logo.slr-small{font-size:28px}
      .slr-tag{text-align:center;font-size:11px;color:#555}
      .slr-modes{display:grid;grid-template-columns:1fr 1fr;gap:6px}
      .slr-mode{display:flex;flex-direction:column;align-items:flex-start;text-align:left;padding:6px 8px;min-width:0;min-height:44px}
      .slr-mode b{font-size:13px}
      .slr-mode small{font-size:10px;color:#444}
      .slr-mode.slr-sel{outline:1px dotted #000;outline-offset:-5px}
      .slr-diff{display:flex;gap:4px;align-items:center;justify-content:center;flex-wrap:wrap;font-size:12px}
      .slr-diff .btn{min-width:0;padding:4px 10px;min-height:32px}
      .slr-diff .btn.down{font-weight:bold}
      .slr-res{background:#fff;padding:6px 8px;font:400 18px/1.2 var(--dos);white-space:pre-wrap}
      .slr-row{display:flex;gap:6px;justify-content:center;flex-wrap:wrap}
      .slr-row .btn{min-height:34px}
    `,
    open(W, api) {
      const SCN = scenery();
      const era = api.era.id;
      const me = era === '1995' ? 'p95' : 'p90';
      const version = era === '1995' ? 'Slope Rider 95' : 'Slope Rider 1.0';
      W.body.innerHTML = `<div class="slr">
        <div class="slr-stat">
          <div class="slr-cell sunken"><i>Time</i><b data-s="time">0:00.0</b></div>
          <div class="slr-cell sunken"><i>Distance</i><b data-s="dist">0 m</b></div>
          <div class="slr-cell sunken"><i>Speed</i><b data-s="speed">0 km/h</b></div>
          <div class="slr-cell sunken"><i>Style</i><b data-s="style">0</b></div>
          <div class="slr-cell sunken slr-hid" data-c="gates"><i>Gates</i><b data-s="gates">0/0</b></div>
        </div>
        <div class="slr-wrap sunken"><canvas aria-label="Slope Rider ski slope"></canvas><div class="slr-ov" hidden></div></div>
        <div class="slr-bar"><button class="btn" data-a="pause">Pause</button><span class="slr-msg"></span><button class="btn" data-a="jump">Jump</button></div>
      </div>`;
      const $ = s => W.body.querySelector(s);
      const wrap = $('.slr-wrap'), cv = $('canvas'), g = cv.getContext('2d'), ov = $('.slr-ov'), msgEl = $('.slr-msg'), pauseB = $('[data-a=pause]');
      const stat = {}; ['time', 'dist', 'speed', 'style', 'gates'].forEach(k => { stat[k] = $(`[data-s=${k}]`); });
      const gatesCell = $('[data-c=gates]'), gatesLbl = gatesCell.querySelector('i');
      const DOS = (getComputedStyle(document.documentElement).getPropertyValue('--dos') || 'monospace').trim();
      const font = n => `${n}px ${DOS}`;

      let opts = Object.assign({ diff: 'normal', sound: true, mode: 'free' }, api.load('opts', {}));
      if (!DIFF[opts.diff]) opts.diff = 'normal';
      if (!MODES[opts.mode]) opts.mode = 'free';
      let best = api.load('best', {});
      let VW = 240, VH = 300, sc = 2, dpr = 1;
      let G = null, screen = 'menu', paused = false, raf = 0, last = 0, closed = false, statT = 0;
      const keys = {};
      let ptr = null;          // active touch / pressed pointer {id, x, y, t0, sx, sy, dir0, type}
      let hover = null;        // mouse position (logical) for mouse steering
      let steer = 'key';

      const snd = fn => { if (opts.sound) try { fn(); } catch (e) {} };
      const S = {
        swish: () => snd(() => api.noise(0.12, { ft: 'highpass', f: 3000, vol: 0.035, decay: 1 })),
        jump: () => snd(() => api.tone(300, 0.18, { to: 700, type: 'triangle', vol: 0.05 })),
        land: () => snd(() => api.noise(0.12, { ft: 'lowpass', f: 700, vol: 0.09, decay: 1 })),
        crash: () => snd(() => { api.noise(0.35, { ft: 'lowpass', f: 1400, vol: 0.12, decay: 1 }); api.tone(420, 0.35, { to: 90, type: 'square', vol: 0.04 }); }),
        gate: () => snd(() => api.tone(1320, 0.07, { type: 'square', vol: 0.03 })),
        miss: () => snd(() => api.tone(140, 0.25, { type: 'sawtooth', vol: 0.05 })),
        trick: () => snd(() => [0, 4, 7].forEach((n, i) => api.tone(api.midi(76 + n), 0.06, { type: 'square', vol: 0.03, at: i * 0.05 }))),
        combo: () => snd(() => [0, 4, 7, 12, 16].forEach((n, i) => api.tone(api.midi(72 + n), 0.08, { type: 'square', vol: 0.035, at: i * 0.06 }))),
        yip: () => snd(() => { api.tone(1100, 0.06, { to: 1500, type: 'square', vol: 0.03 }); api.tone(1200, 0.06, { to: 1600, type: 'square', vol: 0.03, at: 0.1 }); }),
        oof: () => snd(() => api.tone(260, 0.2, { to: 160, type: 'triangle', vol: 0.05 })),
        moose: () => snd(() => { api.tone(95, 0.9, { to: 60, type: 'sawtooth', vol: 0.07 }); api.tone(143, 0.9, { to: 88, type: 'square', vol: 0.025 }); }),
        mogul: () => snd(() => api.tone(500, 0.08, { to: 800, type: 'triangle', vol: 0.03 })),
        goal: () => snd(() => api.sfx.tada()),
        tick: () => snd(() => api.tone(880, 0.05, { type: 'square', vol: 0.025 }))
      };

      /* ---------- menus ---------- */
      const bestKey = (m, d) => `${m}:${d}`;
      const fmtT = t => { const m = Math.floor(t / 60), s = t - m * 60; return `${m}:${s < 10 ? '0' : ''}${s.toFixed(1)}`; };
      const fmtN = n => Math.round(n).toLocaleString('en-US');
      function bestText(m, d = opts.diff) {
        const b = best[bestKey(m, d)];
        if (b == null) return 'No record yet';
        return m === 'free' ? `Best: ${fmtN(b)} m` : m === 'air' ? `Best: ${fmtN(b)} pts` : `Best: ${fmtT(b)}`;
      }
      function startMode(m) { opts.mode = m; api.save('opts', opts); newGame(m); }
      function setDiff(d) { opts.diff = d; api.save('opts', opts); if (screen === 'menu') showMenu(); }
      api.menubar([
        { label: 'Game', items: () => [
          { label: 'New game', fn: () => newGame(opts.mode) },
          '-',
          ...Object.keys(MODES).map(m => ({ label: (opts.mode === m ? '> ' : '   ') + MODES[m].name, fn: () => startMode(m) })),
          '-',
          { label: paused ? 'Resume' : 'Pause', fn: togglePause, disabled: screen !== 'play' },
          { label: 'Best runs', fn: showBest },
          { label: 'Main menu', fn: showMenu },
          '-', { label: 'Exit', fn: () => api.close() }
        ] },
        { label: 'Options', items: () => [
          ...Object.keys(DIFF).map(d => ({ label: (opts.diff === d ? '> ' : '   ') + DIFF[d].name, fn: () => { setDiff(d); if (screen === 'play') msg(`${DIFF[d].name} starts with your next run.`); } })),
          '-',
          { label: (opts.sound ? '[x] ' : '[ ] ') + 'Sound effects', fn: () => { opts.sound = !opts.sound; api.save('opts', opts); } },
          { label: 'Clear best runs', fn: () => api.msgBox('Slope Rider', 'Clear all your best runs?', ['Yes', 'No'], 'warn').then(b => { if (b === 'Yes') { best = {}; api.save('best', best); if (screen === 'menu') showMenu(); } }) }
        ] },
        { label: 'Help', items: [
          { label: 'How to play', fn: howTo },
          { label: 'About Slope Rider', fn: () => api.msgBox('About', `${version}\nFreeware downhill skiing.\n\nWatch out for Old Bramble, the grumpy giant snow moose who sleeps below the 2000 m mark.`) }
        ] }
      ]);
      function howTo() {
        const was = paused; if (screen === 'play' && !paused) togglePause();
        api.msgBox('How to play', 'KEYBOARD: Left and Right turn your skis one step at a time. Turn all the way sideways to stop; press again to side-step. Down points you straight downhill; hold it to tuck and go faster. Up or Space jumps. P pauses.\n\nMOUSE: point where you want to ski, click to jump.\nTOUCH: drag your finger around the skier to steer (far below = tuck), tap to jump.\n\nTRICKS: in the air, Left/Right = 360 spin, Down = Daffy, Up/Space (or a tap) = Back Flip. Finish each trick before you land! Several tricks in one jump multiply the score.\n\nFREE SKI: go as far as you can. SLALOM and TREE SLALOM: pass between each pair of flags, +5 s for each gate you miss. BIG AIR: score points off the ramps.\n\nReach the bottom of a course, or 2000 m in Free Ski, to finish a run and earn $3 (once per game). Past 2000 m, Old Bramble the snow moose wakes up...').then(() => { if (!was && screen === 'play' && paused) togglePause(); });
      }
      function showBest() {
        api.msgBox('Best runs', Object.keys(DIFF).map(d => `${DIFF[d].name}:\n` + Object.keys(MODES).map(m => `  ${MODES[m].name}: ${bestText(m, d).replace('Best: ', '')}`).join('\n')).join('\n\n'));
      }
      function showMenu() {
        screen = 'menu'; paused = false; pauseB.textContent = 'Pause';
        if (!G || !G.demo) G = makeGame('free', true);
        ov.hidden = false;
        ov.innerHTML = `<div class="slr-box raised"><div class="slr-logo">SLOPE RIDER</div><div class="slr-tag">${version} &middot; pick a run</div>
          <div class="slr-modes">${Object.keys(MODES).map((m, i) => `<button class="btn slr-mode${opts.mode === m ? ' slr-sel' : ''}" data-m="${m}"><b>${i + 1}. ${MODES[m].name}</b><small>${MODES[m].desc}</small><small>${bestText(m)}</small></button>`).join('')}</div>
          <div class="slr-diff">Difficulty: ${Object.keys(DIFF).map(d => `<button class="btn${opts.diff === d ? ' down' : ''}" data-d="${d}">${DIFF[d].name}</button>`).join('')}</div>
          <div class="slr-row"><button class="btn" data-a="how">How to play</button></div></div>`;
        msg('Pick a run to start skiing.');
        const f = ov.querySelector('.slr-sel'); f && f.focus();
      }
      ov.addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b) return;
        api.sfx.click();
        if (b.dataset.m) startMode(b.dataset.m);
        else if (b.dataset.d) setDiff(b.dataset.d);
        else if (b.dataset.a === 'how') howTo();
        else if (b.dataset.a === 'again') newGame(G ? G.kind : opts.mode);
        else if (b.dataset.a === 'menu') showMenu();
      });
      const msg = t => { msgEl.textContent = t; };
      const runY = () => (G.moose && G.moose.at != null ? G.moose.at : G.p.y);

      /* ---------- world ---------- */
      function makeGame(kind, demo) {
        const D = DIFF[opts.diff];
        const G = { kind, demo, D, diff: opts.diff, seed: (Math.random() * 1e9) | 0, t: 0, chunks: new Map(), fixed: new Map(), npcs: [], parts: [], texts: [], tracks: [], gates: [], gi: 0, missed: 0, style: 0,
          finishY: MODES[kind].len ? MODES[kind].len * M : 0, done: false, earned: false, goalHit: false, moose: null, wake: FREE_GOAL + 25, banner: null, npcT: 2, camX: 0, camY: -VH * 0.32, endT: 0,
          p: { x: 0, y: 0, z: 0, vz: 0, d: 0, speed: 0, vx: 0, vy: 0, state: 'ski', t: 0, trick: null, jt: [], air0: 0, turnT: 0, tuck: false, trackD: 0, anim: 0 } };
        if (kind !== 'free') buildCourse(G);
        return G;
      }
      function place(G, o) {
        const k = Math.floor(o.x / CH) + ',' + Math.floor(o.y / CH);
        (G.fixed.get(k) || G.fixed.set(k, []).get(k)).push(o);
      }
      function buildCourse(G) {
        const m = MODES[G.kind], D = G.D, R = rng(G.seed), half = CW / 2;
        const r = (a, b) => a + R() * (b - a);
        for (let y = 40; y < G.finishY + 60; y += 44) { place(G, { t: 'post', x: -half, y }); place(G, { t: 'post', x: half, y }); }
        if (G.kind === 'slalom' || G.kind === 'trees') {
          let i = 0;
          for (let y = 260; y < G.finishY - 120; y += m.gap, i++) {
            const side = i % 2 ? 1 : -1, cx = side * r(20, 75), w = D.gate;
            const col = i % 2 ? 'flagB' : 'flagR';
            const gate = { y, x1: cx - w / 2, x2: cx + w / 2, cx, col };
            G.gates.push(gate);
            place(G, { t: col, x: gate.x1, y }); place(G, { t: col, x: gate.x2, y });
          }
          if (G.kind === 'trees') {
            const pts = [{ y: 0, cx: 0 }].concat(G.gates).concat([{ y: G.finishY, cx: 0 }]);
            const n = Math.round(G.finishY / 13 * D.dens);
            for (let k = 0; k < n; k++) {
              const x = r(-half + 10, half - 10), y = r(180, G.finishY - 40);
              let j = 1; while (j < pts.length - 1 && pts[j].y < y) j++;
              const a = pts[j - 1], b = pts[j], lx = a.cx + (b.cx - a.cx) * (y - a.y) / (b.y - a.y);
              if (Math.abs(x - lx) < 34) continue;
              if (G.gates.some(gt => Math.abs(gt.y - y) < 18 && x > gt.x1 - 14 && x < gt.x2 + 14)) continue;
              place(G, { t: R() < 0.7 ? 'tree' : R() < 0.6 ? 'tree2' : 'rock', x, y });
            }
          } else {
            for (let k = 0; k < G.finishY / 160 * D.dens; k++) {
              const x = r(-half + 16, half - 16), y = r(200, G.finishY - 60);
              if (G.gates.some(gt => Math.abs(gt.y - y) < 40)) continue;
              place(G, { t: 'mogul', x, y });
            }
          }
        } else if (G.kind === 'air') {
          const ramps = [];
          for (let y = 260; y < G.finishY - 200; y += r(230, 300)) { const x = r(-110, 110); ramps.push({ x, y }); place(G, { t: 'ramp', x, y }); }
          const n = Math.round(G.finishY / 55 * D.dens);
          for (let k = 0; k < n; k++) {
            const x = r(-half + 10, half - 10), y = r(160, G.finishY - 40);
            if (ramps.some(rp => Math.abs(x - rp.x) < 50 && y > rp.y - 80 && y < rp.y + 260)) continue;
            const q = R();
            if (q < 0.35) { for (let a = 0; a < 3; a++) for (let b = 0; b < 2; b++) place(G, { t: 'mogul', x: x + a * 20 + b * 10, y: y + b * 12 }); }
            else place(G, { t: q < 0.65 ? 'tree' : q < 0.8 ? 'rock' : q < 0.9 ? 'stump' : 'tree2', x, y });
          }
        }
        place(G, { t: 'sign', x: -half - 20, y: G.finishY + 30 });
      }
      function genChunk(G, cx, cy) {
        const R = rng(hash(G.seed, cx, cy)), out = (G.fixed.get(cx + ',' + cy) || []).slice();
        const x0 = cx * CH, y0 = cy * CH;
        for (let i = 0; i < 6; i++) out.push({ t: 'sp', x: x0 + R() * CH, y: y0 + R() * CH, v: R() < 0.5 ? 1 : 0 });
        if (G.kind === 'free') {
          if (cy < -2) return out;
          const depth = clamp(y0 / (FREE_GOAL * M), 0, 1.5);
          const n = Math.round((3 + depth * 2.5) * G.D.dens + R() * 2);
          for (let i = 0; i < n; i++) {
            const x = x0 + R() * CH, y = y0 + R() * CH;
            if (y < 140 && Math.abs(x) < 70) continue;
            const q = R();
            if (q < 0.1) { const k = 4 + (R() * 4 | 0); for (let j = 0; j < k; j++) out.push({ t: 'mogul', x: x + (j % 3) * 20 + (j / 3 | 0) * 10, y: y + (j / 3 | 0) * 13 }); }
            else if (q < 0.18) { for (let j = 0; j < 4; j++) out.push({ t: R() < 0.6 ? 'tree' : 'tree2', x: x + R() * 40 - 20, y: y + R() * 40 - 20 }); }
            else if (q < 0.23) out.push({ t: 'ramp', x, y });
            else out.push({ t: q < 0.52 ? 'tree' : q < 0.62 ? 'tree2' : q < 0.72 ? 'rock' : q < 0.82 ? 'stump' : q < 0.9 ? 'dead' : 'mogul', x, y });
          }
          if (cy === 0 && cx === -1) out.push({ t: 'sign', x: -50, y: 40 });
        } else {
          // dense forest outside the course fences
          const half = CW / 2 + 14;
          for (let i = 0; i < 9; i++) {
            const x = x0 + R() * CH, y = y0 + R() * CH;
            if (Math.abs(x) < half || y < -120) continue;
            out.push({ t: R() < 0.75 ? 'tree' : 'tree2', x, y });
          }
        }
        return out;
      }
      function chunk(G, cx, cy) {
        const k = cx + ',' + cy;
        let c = G.chunks.get(k); if (!c) { c = genChunk(G, cx, cy); G.chunks.set(k, c); }
        return c;
      }
      function objsIn(G, x0, y0, x1, y1) {
        const out = [];
        for (let cy = Math.floor(y0 / CH); cy <= Math.floor(y1 / CH); cy++)
          for (let cx = Math.floor(x0 / CH); cx <= Math.floor(x1 / CH); cx++) chunk(G, cx, cy).forEach(o => { if (o.x >= x0 && o.x <= x1 && o.y >= y0 && o.y <= y1) out.push(o); });
        return out;
      }
      function prune(G) {
        const cyMin = Math.floor((G.camY - 200) / CH), cxP = Math.floor(G.camX / CH);
        G.chunks.forEach((v, k) => { const [cx, cy] = k.split(',').map(Number); if (cy < cyMin || Math.abs(cx - cxP) > 6) G.chunks.delete(k); });
      }

      /* ---------- game flow ---------- */
      function newGame(kind) {
        G = makeGame(kind, false);
        screen = 'play'; paused = false; pauseB.textContent = 'Pause'; ov.hidden = true; ov.innerHTML = '';
        clearKeys(); ptr = null;
        gatesCell.classList.toggle('slr-hid', !G.gates.length);
        G.banner = { text: MODES[kind].name.toUpperCase(), sub: kind === 'free' ? 'Ski as far as you can!' : kind === 'air' ? 'Hit the ramps, do tricks!' : 'Pass between the flags!', t: 2.2 };
        msg(matchMedia('(pointer:coarse)').matches ? 'Drag to steer, tap to jump.' : 'Arrows steer, Down tucks, Space jumps.');
        api.setTitle(`Slope Rider - ${MODES[kind].name}`);
        updStat(true);
      }
      function togglePause() {
        if (screen !== 'play') return;
        paused = !paused; clearKeys(); ptr = null;
        pauseB.textContent = paused ? 'Resume' : 'Pause';
        msg(paused ? 'Paused. Press P or tap to go on.' : '');
      }
      function finishRun(why) {
        if (G.demo || G.earned) return;
        G.earned = true;
        api.stamp('ski-run');
        api.earn(3, 'finishing a ski run');
        msg(`${why} You earned $3!`);
      }
      function endGame(title, lines) {
        if (screen !== 'play') return;
        screen = 'over';
        const kind = G.kind, bk = bestKey(kind, G.diff);
        let score, better;
        if (kind === 'free') { score = Math.floor(Math.max(0, runY()) / M); better = best[bk] == null || score > best[bk]; }
        else if (kind === 'air') { score = G.style; better = best[bk] == null || score > best[bk]; }
        else { score = G.t + G.missed * 5; better = best[bk] == null || score < best[bk]; }
        if (better) { best[bk] = kind === 'free' || kind === 'air' ? score : Math.round(score * 10) / 10; api.save('best', best); }
        ov.hidden = false;
        ov.innerHTML = `<div class="slr-box raised"><div class="slr-logo slr-small">${title}</div><div class="slr-res sunken">${api.esc(lines.join('\n'))}${better ? '\n\nNEW BEST RUN!' : '\n\n' + bestText(kind, G.diff)}</div>
          ${G.earned ? '<div class="slr-tag">You finished a run and earned $3.</div>' : ''}
          <div class="slr-row"><button class="btn" data-a="again">Ski again</button><button class="btn" data-a="menu">Change run</button></div></div>`;
        const b = ov.querySelector('[data-a=again]'); b && b.focus();
      }
      function courseDone() {
        const tot = G.t + G.missed * 5;
        if (G.kind === 'air') endGame('RUN COMPLETE!', [`Trick score: ${fmtN(G.style)}`, `Time: ${fmtT(G.t)}`]);
        else endGame('RUN COMPLETE!', [`Time: ${fmtT(G.t)}`, `Missed gates: ${G.missed} (+${G.missed * 5} s)`, `Total: ${fmtT(tot)}`]);
      }

      /* ---------- player ---------- */
      const P0 = () => G.p;
      const maxSpeed = () => 190;
      function turn(dir) {
        const p = P0();
        if (p.state !== 'ski') return;
        if (Math.abs(p.d) === 4 && Math.sign(p.d) === dir) { p.walk = 0.18; p.walkDir = dir; return; }
        const nd = clamp(p.d + dir, -4, 4);
        if (nd !== p.d) { p.d = nd; if (p.speed > 80) { S.swish(); spray(p, 3); } }
      }
      function action() {
        if (screen !== 'play' || paused || G.demo) return;
        const p = P0();
        if (p.state === 'ski') { if (p.speed > 10 || Math.abs(p.d) < 4) launch(85, false); }
        else if (p.state === 'air') startTrick('flip', 1);
      }
      function launch(vz, ramp) {
        const p = P0();
        p.vx = p.speed * Math.sin(p.d * 22.5 * DEG); p.vy = p.speed * Math.cos(p.d * 22.5 * DEG);
        p.state = 'air'; p.vz = vz; p.z = Math.max(p.z, 0.5); p.jt = []; p.trick = null; p.air0 = G.t; p.ramp = ramp;
        S.jump();
      }
      function startTrick(type, dir) {
        const p = P0();
        if (p.state !== 'air' || p.trick || (p.z < 4 && p.vz < 0)) return;
        p.trick = { type, t: 0, dir: dir || 1 };
        S.swish();
      }
      function crash(why, o) {
        const p = P0();
        if (p.state === 'crash' || p.state === 'caught') return;
        p.state = 'crash'; p.t = 0; p.speed = 0; p.z = 0; p.vz = 0; p.trick = null; p.jt = []; p.tuck = false;
        if (o) o.ign = G.t + 2;
        G.style = Math.max(0, G.style - 50);
        S.crash(); spray(p, 14, true);
        say(p.x, p.y - 20, why, P.r);
      }
      function spray(p, n, big) {
        for (let i = 0; i < n; i++) { const a = rnd(0, 6.28), v = rnd(10, big ? 70 : 35); G.parts.push({ x: p.x + rnd(-3, 3), y: p.y, vx: Math.cos(a) * v - (p.vx || 0) * 0.1, vy: Math.sin(a) * v * 0.6, z: rnd(0, 4), vz: rnd(20, 70), life: rnd(0.3, 0.7), c: Math.random() < 0.5 ? P.l : P.C }); }
      }
      function say(x, y, text, col, t = 1.3) { G.texts.push({ x, y, text, col: col || P.B, t, t0: t }); }

      function steerTarget(pt) {
        // pt: logical screen coords; compare to the skier on screen
        const p = P0(), sx = p.x - G.camX + VW / 2, sy = p.y - G.camY - 6;
        const dx = pt.x - sx, dy = pt.y - sy;
        if (Math.hypot(dx, dy) < 10) return null;
        if (dy < -8) return { d: Math.sign(dx) * 4 || p.d, walk: Math.abs(dx) > 12 ? Math.sign(dx) : 0, tuck: false, dx, dy };
        const a = Math.atan2(dx, Math.max(0, dy)) / DEG;
        const d = clamp(Math.round(a / 22.5), -4, 4);
        return { d, walk: 0, tuck: d === 0 && dy > Math.min(80, VH * 0.4), dx, dy };
      }
      function updatePlayer(dt) {
        const p = P0(), D = G.D;
        p.anim += dt;
        if (p.state === 'crash') {
          p.t += dt;
          if (p.t > 1.3) { p.state = 'ski'; p.d = 0; p.speed = 0; }
          return;
        }
        if (p.state === 'caught' || p.state === 'gone') return;
        let target = null, walk = 0;
        if (steer === 'ptr' && ptr && ptr.steer) target = steerTarget(ptr);
        else if (steer === 'mouse' && hover && !G.done) target = steerTarget(hover);
        if (p.state === 'ski') {
          if (G.done) { p.d = p.d === 0 ? 0 : p.d; p.speed = Math.max(0, p.speed - 120 * dt); p.tuck = false; }
          else {
            // keyboard: stepwise turning with our own auto-repeat
            const kd = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
            if (kd) { p.turnT -= dt; if (p.turnT <= 0) { turn(kd); p.turnT = 0.13; } }
            else p.turnT = 0;
            if (keys.down) p.d = 0;
            p.tuck = !!keys.down && p.d === 0;
            if (target) {
              p.steerT = (p.steerT || 0) - dt;
              if (p.steerT <= 0 && target.d !== p.d) { const nd = p.d + Math.sign(target.d - p.d); p.d = nd; p.steerT = 0.05; if (p.speed > 80 && Math.random() < 0.3) S.swish(); }
              p.tuck = target.tuck && p.d === 0;
              if (Math.abs(p.d) === 4 && target.walk === Math.sign(p.d)) walk = target.walk;
            }
            if (p.walk > 0) { p.walk -= dt; walk = p.walkDir; }
            if (kd && Math.abs(p.d) === 4 && Math.sign(p.d) === kd) walk = kd;
          }
          const a = p.d * 22.5 * DEG, ca = Math.cos(a);
          const top = maxSpeed() * ca * (p.tuck ? 1.32 : 1);
          if (p.speed < top) p.speed = Math.min(top, p.speed + (95 + 40 * (p.tuck ? 1 : 0)) * Math.max(0.25, ca) * dt);
          else p.speed = Math.max(top, p.speed - 260 * dt);
          p.vx = p.speed * Math.sin(a) + walk * 32; p.vy = p.speed * ca;
          if (Math.abs(p.d) >= 3 && p.speed > 60 && Math.random() < dt * 20) spray(p, 1);
        } else if (p.state === 'air') {
          p.vz -= GRAV * dt; p.z += p.vz * dt;
          // tricks
          if (!p.trick) {
            let side = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
            let grab = keys.down;
            if (steer === 'ptr' && ptr && ptr.steer && ptr.held > 0.12) { const tg = steerTarget(ptr); if (tg) { if (Math.abs(tg.dx) > Math.abs(tg.dy) * 0.9 && Math.abs(tg.dx) > 16) side = Math.sign(tg.dx); else if (tg.dy > 30 && Math.abs(tg.dx) < tg.dy * 0.6) grab = true; } }
            if (side) startTrick('spin', side); else if (grab) startTrick('grab', 1);
          }
          if (p.trick) {
            p.trick.t += dt;
            const T = TRICKS[p.trick.type];
            if (p.trick.t >= T.dur) { p.jt.push(p.trick.type); S.trick(); say(p.x, p.y - p.z - 22, T.name, P.m, 0.8); p.trick = null; }
          }
          if (p.z <= 0) {
            p.z = 0;
            if (p.trick && p.trick.t / TRICKS[p.trick.type].dur < 0.8) { crash(p.trick.type === 'flip' ? 'FACE PLANT!' : 'WIPEOUT!'); return; }
            if (p.trick) p.jt.push(p.trick.type);
            p.trick = null; p.state = 'ski'; S.land();
            const air = G.t - p.air0;
            if (p.jt.length) {
              let pts = 0, prev = null;
              p.jt.forEach(t => { pts += TRICKS[t].pts * (t === prev ? 0.5 : 1); prev = t; });
              pts = Math.round(pts * p.jt.length + air * 60);
              G.style += pts;
              say(p.x, p.y - 26, (p.jt.length > 1 ? `${p.jt.length}X COMBO ` : '') + '+' + pts, p.jt.length > 1 ? P.r : P.B, 1.4);
              p.jt.length > 1 ? S.combo() : S.trick();
            } else if (p.ramp && air > 0.6) { const pts = Math.round(air * 40); G.style += pts; say(p.x, p.y - 26, 'AIR +' + pts, P.B); }
            p.jt = [];
          }
        }
        // move in small steps so fast skiers can't tunnel through obstacles
        const dist = Math.hypot(p.vx, p.vy) * dt, steps = Math.max(1, Math.ceil(dist / 3));
        for (let i = 0; i < steps; i++) {
          p.x += p.vx * dt / steps; p.y += p.vy * dt / steps;
          if (p.y < -30) p.y = -30;
          if (collide()) break;
        }
        if (p.state === 'ski' && p.speed > 5) {
          p.trackD += dist;
          if (p.trackD > 3) { p.trackD = 0; G.tracks.push({ x: p.x, y: p.y, a: p.d * 22.5 * DEG }); if (G.tracks.length > 700) G.tracks.shift(); }
        }
      }
      function hitTest(o, x, y, pad = 2) { const d = OB[o.t]; return d && Math.abs(x - o.x) < d.hw + pad && y > o.y - d.hh - 1 && y < o.y + 2; }
      function collide() {
        const p = P0();
        if (p.state !== 'ski' && p.state !== 'air') return false;
        const near = objsIn(G, p.x - 20, p.y - 12, p.x + 20, p.y + 6);
        for (const o of near) {
          const d = OB[o.t]; if (!d || (o.ign && o.ign > G.t) || !hitTest(o, p.x, p.y)) continue;
          if (o.t === 'ramp') {
            if (p.state === 'ski' && p.vy > 20) { o.ign = G.t + 0.6; launch(80 + Math.max(90, p.speed) * 0.55, true); say(p.x, p.y - 30, 'AIR!', P.B, 0.7); }
            continue;
          }
          if (o.t === 'mogul') {
            if (p.state === 'ski') { o.ign = G.t + 0.5; if (p.speed > 110) { launch(40 + p.speed * 0.2, false); S.mogul(); } else p.speed *= 0.7; }
            continue;
          }
          if (p.z > d.z) continue;
          crash(o.t === 'tree' || o.t === 'tree2' ? 'TIMBER!' : o.t === 'rock' ? 'CLONK!' : o.t.startsWith('flag') ? 'FLAGGED!' : 'OOF!', o);
          return true;
        }
        for (const n of G.npcs) {
          if (n.down > 0 || n.ign > G.t) continue;
          if (Math.abs(n.x - p.x) < (n.type === 'dog' ? 6 : 5) && Math.abs(n.y - p.y) < 5 && p.z < (n.type === 'dog' ? 7 : 12)) {
            n.ign = G.t + 2;
            if (n.type === 'dog') { S.yip(); n.vx = (n.x >= p.x ? 1 : -1) * 130; n.scared = 1.5; crash('WOOF!'); }
            else { n.down = 1.6; S.oof(); crash('WHOOPS!'); }
            return true;
          }
        }
        return false;
      }

      /* ---------- other skiers, dogs, and the moose ---------- */
      function updateNpcs(dt) {
        const p = P0();
        if ((G.kind === 'free' || G.kind === 'air') && !G.demo) {
          G.npcT -= dt;
          if (G.npcT <= 0) {
            G.npcT = rnd(2.5, 5) / G.D.npc;
            const q = Math.random(), y = G.camY + VH + 30, x = p.x + rnd(-VW * 0.6, VW * 0.6);
            if (q < 0.45) G.npcs.push({ type: 'skier', x, y, vy: rnd(45, 80), d: 2, zig: rnd(0.6, 1.4), zt: 0, of: ['n1', 'n2', 'n3'][Math.random() * 3 | 0], down: 0, ign: 0 });
            else if (q < 0.75) G.npcs.push({ type: 'board', x, y, vy: rnd(85, 115), ph: rnd(0, 6), of: Math.random() < 0.5 ? 'b1' : 'b2', down: 0, ign: 0 });
            else { const dir = Math.random() < 0.5 ? 1 : -1; G.npcs.push({ type: 'dog', x: p.x - dir * VW * 0.55, y: y - rnd(0, 40), vx: dir * rnd(35, 60), vy: 0, down: 0, ign: 0, a: 0, scared: 0 }); }
          }
        }
        G.npcs.forEach(n => {
          n.a = (n.a || 0) + dt;
          if (n.down > 0) { n.down -= dt; return; }
          if (n.type === 'skier') {
            n.zt += dt; if (n.zt > n.zig) { n.zt = 0; n.d = -n.d; }
            const a = n.d * 22.5 * DEG; n.x += Math.sin(a) * n.vy * dt; n.y += Math.cos(a) * n.vy * dt;
          } else if (n.type === 'board') {
            n.ph += dt * 1.3; n.vx = Math.sin(n.ph) * 70; n.x += n.vx * dt; n.y += n.vy * dt;
          } else {
            n.scared = Math.max(0, n.scared - dt);
            if (Math.random() < dt * 0.4 && !n.scared) n.vx = -n.vx;
            n.x += n.vx * dt; n.y += (n.scared ? 20 : 0) * dt;
          }
          // NPCs bump into things and fall over too
          if (n.type !== 'dog' && Math.random() < 0.5) { const o = objsIn(G, n.x - 8, n.y - 6, n.x + 8, n.y + 4).find(o => OB[o.t] && !OB[o.t].soft && hitTest(o, n.x, n.y, 1)); if (o) { n.down = 1.2; n.x += 6; } }
        });
        G.npcs = G.npcs.filter(n => n.y > G.camY - 80 && n.y < G.camY + VH + 400 && Math.abs(n.x - p.x) < VW * 1.6);
      }
      function updateMoose(dt) {
        const p = P0();
        if (G.kind !== 'free' || G.demo) return;
        const dist = p.y / M;
        if (!G.moose && dist >= G.wake && p.state !== 'caught') {
          G.moose = { x: p.x + rnd(-50, 50), y: G.camY - 50, speed: G.D.moose, st: 'chase', a: 0, off: 0, roar: 4 };
          G.banner = { text: 'OLD BRAMBLE IS AWAKE!', sub: 'The snow moose is right behind you. Tuck and GO!', t: 2.6, col: P.r };
          S.moose(); msg('Run! Hold Down (or drag far below) to tuck.');
        }
        const m = G.moose; if (!m) return;
        m.a += dt;
        if (m.st === 'chase') {
          m.speed += G.D.macc * dt;
          const tx = p.x, ty = p.y, dx = tx - m.x, dy = ty - m.y, dd = Math.hypot(dx, dy) || 1;
          m.x += dx / dd * m.speed * dt; m.y += dy / dd * m.speed * dt;
          m.roar -= dt; if (m.roar <= 0) { m.roar = rnd(4, 7); S.moose(); }
          if (dd < 9 && p.z < 30) {
            m.st = 'carry'; m.t = 0; m.at = p.y; p.state = 'caught'; p.trick = null;
            S.moose(); say(p.x, p.y - 44, 'GOTCHA!', P.r, 1.5);
          }
          if (m.y < G.camY - 150) { m.off += dt; if (m.off > 5) { m.st = 'leave'; G.style += 300; say(p.x, p.y - 30, 'ESCAPED! +300', P.g, 2); G.banner = { text: 'OLD BRAMBLE GAVE UP', sub: '...for now.', t: 2.2 }; G.wake = dist + 1000; } }
          else m.off = 0;
        } else if (m.st === 'carry') {
          m.t += dt; m.x += 150 * dt; m.y += 60 * dt; p.x = m.x; p.y = m.y; p.z = 34;
          if (m.t > 2.4) {
            endGame('CAUGHT!', [`Old Bramble scooped you up`, `and carried you home to`, `the lodge for hot cocoa.`, ``, `Distance: ${fmtN(Math.floor(m.at / M))} m`, `Style: ${fmtN(G.style)}`, `Time: ${fmtT(G.t)}`]);
          }
        } else if (m.st === 'leave') { m.y -= 60 * dt; if (m.y < G.camY - 400) G.moose = null; }
      }

      /* ---------- main update ---------- */
      function update(dt) {
        if (G.demo) { G.camY += 45 * dt; G.camX = Math.sin(G.camY / 600) * 60; prune(G); return; }
        const p = P0();
        if (!G.done && p.state !== 'caught') G.t += dt;
        if (ptr) ptr.held += dt;
        updatePlayer(dt);
        updateNpcs(dt);
        updateMoose(dt);
        // gates
        while (G.gi < G.gates.length && p.y >= G.gates[G.gi].y) {
          const gt = G.gates[G.gi++];
          if (p.x > gt.x1 && p.x < gt.x2) { gt.ok = 1; S.gate(); G.style += 25; }
          else { gt.ok = -1; G.missed++; S.miss(); say(gt.cx, gt.y - 20, 'MISSED +5s', P.r); }
        }
        if (G.kind === 'free') {
          if (!G.goalHit && p.y >= FREE_GOAL * M) {
            G.goalHit = true; S.goal();
            G.banner = { text: '2000 METRES!', sub: 'Run complete! +$3', t: 2.4, col: P.g };
            finishRun('Free Ski run complete!');
          }
        } else if (!G.done && p.y >= G.finishY) {
          G.done = true; G.endT = 0; S.goal();
          G.banner = { text: 'FINISH!', sub: G.kind === 'air' ? `${fmtN(G.style)} points` : `${fmtT(G.t)}${G.missed ? ` + ${G.missed * 5} s` : ''}`, t: 3, col: P.g };
          finishRun(`${MODES[G.kind].name} run complete!`);
        }
        if (G.done) { G.endT += dt; if (G.endT > 2.2) courseDone(); }
        // camera
        if (p.state !== 'caught') {
          let tx = G.kind === 'free' ? p.x : p.x * 0.55;
          tx = clamp(tx, p.x - VW / 2 + 24, p.x + VW / 2 - 24);
          G.camX += (tx - G.camX) * Math.min(1, dt * 4); G.camY = p.y - VH * 0.32; }
        else { G.camX += (p.x - G.camX) * Math.min(1, dt * 2); G.camY += (p.y - VH * 0.45 - G.camY) * Math.min(1, dt * 2); }
        G.parts.forEach(q => { q.x += q.vx * dt; q.y += q.vy * dt; q.vz -= 200 * dt; q.z = Math.max(0, q.z + q.vz * dt); q.life -= dt; });
        G.parts = G.parts.filter(q => q.life > 0);
        G.texts.forEach(t => { t.t -= dt; t.y -= 14 * dt; });
        G.texts = G.texts.filter(t => t.t > 0);
        if (G.banner) { G.banner.t -= dt; if (G.banner.t <= 0) G.banner = null; }
        prune(G);
      }

      /* ---------- drawing ---------- */
      function line(x0, y0, x1, y1, col) {
        x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
        const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
        let e = dx + dy; g.fillStyle = col;
        for (let i = 0; i < 64; i++) { g.fillRect(x0, y0, 1, 1); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
      }
      function skis(x, y, a, col, split) {
        const sa = Math.sin(a), ca = Math.cos(a);
        [-1, 1].forEach(s => {
          const aa = split ? a + s * 0.7 : a, ss = Math.sin(aa), cc = Math.cos(aa);
          const ox = ca * 1.2 * s, oy = -sa * 0.8 * s;
          line(x + ox - ss * 5, y + oy - cc * 4, x + ox + ss * 6, y + oy + cc * 5, col);
        });
      }
      function poseFor(a) {
        let n = Math.atan2(Math.sin(a), Math.cos(a)) / DEG;
        const f = n < 0; n = Math.abs(n);
        return [n < 12 ? 'front' : n < 57 ? 'diag' : n < 124 ? 'side' : 'back', f];
      }
      /* draws a skier with feet at (x, y) and height z */
      function drawSkier(x, y, z, o) {
        const of = OUTFITS[o.of];
        x = Math.round(x); const fy = Math.round(y - z);
        if (z > 0.5) { g.fillStyle = P.l; const w = Math.max(3, 9 - z / 8); g.fillRect(Math.round(x - w / 2), Math.round(y), Math.round(w), 2); }
        if (o.state === 'crash' && o.t < 0.8) {
          const k = Math.floor(o.t / 0.09) % 4, im = body('ball', o.of);
          g.save(); g.translate(x, fy - 4); g.rotate(k * Math.PI / 2); g.drawImage(im, -4, -4); g.restore();
          line(x - 9 + k, fy - 2, x - 3 + k, fy + 3, of.ski); line(x + 3, fy - 7 + k, x + 9, fy - 4 + k, of.ski);
          return;
        }
        if (o.state === 'crash' || o.state === 'down') {
          line(x - 6, fy + 1, x + 6, fy - 1, of.ski); line(x - 5, fy - 2, x + 6, fy + 2, of.ski);
          g.drawImage(body('sit', o.of), x - 4, fy - 8);
          return;
        }
        if (o.state === 'caught') { g.save(); g.translate(x, fy - 4); g.rotate(Math.sin(o.anim * 8) * 0.4); g.drawImage(body('ball', o.of), -4, -4); g.restore(); return; }
        let a = o.d * 22.5 * DEG, split = false, sy = 1;
        if (o.trick) {
          const T = TRICKS[o.trick.type], ph = clamp(o.trick.t / T.dur, 0, 1);
          if (o.trick.type === 'spin') a += o.trick.dir * ph * Math.PI * 2;
          else if (o.trick.type === 'grab') split = true;
          else sy = Math.cos(ph * Math.PI * 2);
        }
        const [pose, flip] = poseFor(a);
        g.save();
        if (sy !== 1) { g.translate(0, fy - 6); g.scale(1, Math.abs(sy) < 0.15 ? 0.15 * Math.sign(sy || 1) : sy); g.translate(0, -(fy - 6)); }
        if (o.board) {
          const ss = Math.sin(a), cc = Math.cos(a);
          line(x - ss * 6, fy - cc * 4, x + ss * 6, fy + cc * 5, of.ski); line(x - ss * 6 + 1, fy - cc * 4, x + ss * 6 + 1, fy + cc * 5, of.ski);
          g.drawImage(body('side', o.of, o.vx < 0), x - 3, fy - 10);
        } else {
          const back = pose === 'back';
          if (!back) skis(x, fy, a, of.ski, split);
          const cr = o.tuck ? 2 : 0;
          g.drawImage(body(pose, o.of, flip), x - 3, fy - 10 + cr);
          if (back) skis(x, fy, a, of.ski, split);
          // poles
          if (!split) { g.fillStyle = P.d; const pd = o.tuck ? 0 : 1; line(x - 3, fy - 4 + cr, x - 4 - Math.sin(a) * 2, fy + pd, P.d); line(x + 3, fy - 4 + cr, x + 4 - Math.sin(a) * 2, fy + pd, P.d); }
        }
        g.restore();
      }
      function drawObj(o, sx, sy) {
        if (o.t === 'sp') { g.fillStyle = era === '1995' && o.v ? P.C : P.l; g.fillRect(sx, sy, 1, 1); if (o.v) g.fillRect(sx + 2, sy + 1, 1, 1); return; }
        const im = SCN[o.t]; if (!im) return;
        let dx = sx - Math.floor(im.width / 2), dy = sy - im.height + 1;
        if (o.t.startsWith('flag')) dx = sx;
        if (o.t === 'mogul' || o.t === 'ramp') dy = sy - im.height + 3;
        g.drawImage(im, dx, dy);
      }
      function text(t, x, y, size, col, align = 'center') {
        g.font = font(size); g.textAlign = align; g.textBaseline = 'middle';
        const w = g.measureText(t).width;
        if (w > VW - 8) { size = Math.max(6, size * (VW - 8) / w); g.font = font(size); }
        g.fillStyle = '#000'; g.fillText(t, x + 1, y + 1);
        g.fillStyle = col; g.fillText(t, x, y);
      }
      function banner(t, x, y, w) {
        g.fillStyle = P.B; g.fillRect(Math.round(x - w / 2), y - 7, w, 11);
        g.fillStyle = P.y; g.fillRect(Math.round(x - w / 2), y - 7, w, 1); g.fillRect(Math.round(x - w / 2), y + 3, w, 1);
        g.font = font(10); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = P.w; g.fillText(t, x, y - 1);
      }
      function render() {
        g.setTransform(sc * dpr, 0, 0, sc * dpr, 0, 0);
        g.imageSmoothingEnabled = false;
        g.fillStyle = P.w; g.fillRect(0, 0, VW, VH);
        if (!G) return;
        const ox = Math.round(VW / 2 - G.camX), oy = Math.round(-G.camY);
        const X = x => Math.round(x + ox), Y = y => Math.round(y + oy);
        const x0 = G.camX - VW / 2 - 24, x1 = G.camX + VW / 2 + 24, y0 = G.camY - 10, y1 = G.camY + VH + 40;
        // ski tracks
        g.fillStyle = era === '1995' ? P.l : P.l;
        G.tracks.forEach(t => { if (t.y < y0 || t.y > y1) return; const c = Math.cos(t.a), s = Math.sin(t.a); g.fillRect(X(t.x + c * 1.5), Y(t.y - s), 1, 1); g.fillRect(X(t.x - c * 1.5), Y(t.y + s), 1, 1); });
        // start line, finish line, 2000 m line
        const hl = (wy, col1, col2, label, fx0, fx1) => {
          if (wy < y0 - 20 || wy > y1) return;
          for (let x = Math.floor(fx0 / 4) * 4; x < fx1; x += 4) { g.fillStyle = ((x / 4) & 1) ? col1 : col2; g.fillRect(X(x), Y(wy), 4, 2); g.fillStyle = ((x / 4) & 1) ? col2 : col1; g.fillRect(X(x), Y(wy) + 2, 4, 2); }
          if (label) banner(label, X((fx0 + fx1) / 2 < x0 ? G.camX : Math.max(fx0 + 40, Math.min(fx1 - 40, G.camX))), Y(wy) - 16, 60);
        };
        if (G.kind === 'free') { hl(18, P.R, P.w, 'START', -40, 40); hl(FREE_GOAL * M, P.r, P.y, '2000 m', x0, x1); }
        else { hl(18, P.R, P.w, 'START', -CW / 2, CW / 2); hl(G.finishY, P.k, P.w, 'FINISH', -CW / 2, CW / 2); }
        // collect sprites
        const list = objsIn(G, x0, y0, x1, y1).map(o => ({ y: o.t === 'sp' || o.t === 'mogul' ? o.y - 1000 : o.y, o }));
        G.npcs.forEach(n => { if (n.y > y0 - 10 && n.y < y1) list.push({ y: n.y, n }); });
        const p = G.p;
        if (!G.demo && p.state !== 'caught') list.push({ y: p.y + 0.5, pl: 1 });
        if (G.moose) list.push({ y: G.moose.y, moose: 1 });
        list.sort((a, b) => a.y - b.y);
        list.forEach(it => {
          if (it.o) drawObj(it.o, X(it.o.x), Y(it.o.y));
          else if (it.n) {
            const n = it.n;
            if (n.type === 'dog') { const im = (n.vx < 0 ? SCN.dogL : SCN.dog)[Math.floor(n.a * (n.scared ? 14 : 8)) % 2]; g.drawImage(im, X(n.x) - 5, Y(n.y) - 5); }
            else drawSkier(X(n.x), Y(n.y), 0, { of: n.of, d: n.type === 'board' ? clamp(Math.round(n.vx / 30), -3, 3) : n.d, state: n.down > 0 ? 'down' : 'ski', board: n.type === 'board', vx: n.vx });
          } else if (it.pl) drawSkier(X(p.x), Y(p.y), p.z, { of: me, d: p.d, state: p.state, t: p.t, trick: p.trick, tuck: p.tuck && p.state === 'ski', anim: p.anim });
          else if (it.moose) {
            const m = G.moose, im = SCN.moose[m.st === 'chase' || m.st === 'carry' ? 1 + Math.floor(m.a * 7) % 2 : 0];
            g.drawImage(im, X(m.x) - 21, Y(m.y) - 40);
            if (m.st === 'carry') drawSkier(X(m.x), Y(m.y) - 34, 0, { of: me, state: 'caught', anim: p.anim });
          }
        });
        // particles and floating text
        G.parts.forEach(q => { g.fillStyle = q.c; g.fillRect(X(q.x), Y(q.y - q.z), 1, 1); });
        G.texts.forEach(t => text(t.text, X(t.x), Y(t.y), 10, t.col));
        // moose warning arrow when it's off screen
        if (G.moose && G.moose.st === 'chase' && G.moose.y < G.camY) {
          const ax = clamp(X(G.moose.x), 10, VW - 10);
          if (Math.floor(G.t * 4) % 2) { g.fillStyle = P.r; for (let i = 0; i < 5; i++) g.fillRect(ax - i, 2 + i, i * 2 + 1, 1); }
          text('MOOSE!', ax, 13, 9, P.R);
        }
        if (G.banner && !paused) {
          const b = G.banner;
          text(b.text, VW / 2, VH * 0.62, VW < 260 ? 15 : 18, b.col || P.B);
          if (b.sub) text(b.sub, VW / 2, VH * 0.62 + 15, 10, P.k === b.col ? P.w : P.d);
        }
        if (G.demo) return;
        if (paused) {
          g.fillStyle = 'rgba(0,0,170,0.35)'; g.fillRect(0, 0, VW, VH);
          text('PAUSED', VW / 2, VH / 2 - 8, 22, P.y); text('Press P or tap to continue', VW / 2, VH / 2 + 12, 10, P.w);
        }
      }
      function updStat(force) {
        if (!G || G.demo) return;
        const p = G.p;
        const set = (k, v) => { if (stat[k].textContent !== v) stat[k].textContent = v; };
        set('time', fmtT(G.t));
        set('dist', fmtN(Math.max(0, Math.floor(runY() / M))) + ' m');
        const v = p.state === 'air' ? Math.hypot(p.vx, p.vy) : p.state === 'ski' ? p.speed : 0;
        set('speed', Math.round(v / M * 3.6) + ' km/h');
        set('style', fmtN(G.style));
        if (G.gates.length) { set('gates', `${G.gi - G.missed}/${G.gates.length}`); const l = G.missed ? `Gates +${G.missed * 5}s` : 'Gates'; if (gatesLbl.textContent !== l) gatesLbl.textContent = l; }
      }

      /* ---------- loop ---------- */
      function frame(ts) {
        if (closed) return;
        const dt = Math.min(0.05, Math.max(0, (ts - last) / 1000)); last = ts;
        if (G && !paused && (screen === 'play' || (G.demo && screen === 'menu'))) update(dt);
        else if (G && screen === 'over') { G.parts.forEach(q => { q.life -= dt; }); }
        render();
        statT -= dt; if (statT <= 0) { statT = 0.08; updStat(); }
        raf = requestAnimationFrame(frame);
      }
      function fit() {
        const cw = Math.max(100, wrap.clientWidth), ch = Math.max(100, wrap.clientHeight);
        dpr = window.devicePixelRatio || 1;
        sc = Math.max(2, Math.round(cw / 220 * 2) / 2);
        VW = cw / sc; VH = ch / sc;
        cv.style.width = cw + 'px'; cv.style.height = ch + 'px';
        cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
        if (G && G.demo) G.camY = Math.max(G.camY, -VH * 0.3);
      }

      /* ---------- input ---------- */
      const KMAP = { arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right', arrowdown: 'down', s: 'down' };
      function clearKeys() { Object.keys(keys).forEach(k => { keys[k] = false; }); }
      W.onKey = e => {
        const lk = e.key.toLowerCase();
        if (screen === 'menu') {
          const i = '1234'.indexOf(e.key);
          if (i >= 0) { e.preventDefault(); startMode(Object.keys(MODES)[i]); }
          return;
        }
        if (screen === 'over') { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); newGame(G.kind); } else if (e.key === 'Escape') showMenu(); return; }
        if (lk === 'p' || e.key === 'Escape') { e.preventDefault(); togglePause(); return; }
        if (paused) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); togglePause(); } return; }
        const k = KMAP[lk];
        if (k || lk === ' ' || lk === 'arrowup' || lk === 'w') e.preventDefault();
        if (e.repeat) return;
        steer = 'key';
        if (k) {
          keys[k] = true;
          const p = G.p;
          if (p.state === 'ski' && (k === 'left' || k === 'right')) { turn(k === 'left' ? -1 : 1); p.turnT = 0.22; }
          if (p.state === 'ski' && k === 'down') p.d = 0;
          if (p.state === 'air') { if (k === 'down') startTrick('grab', 1); else if (k !== 'down') startTrick('spin', k === 'left' ? -1 : 1); }
        }
        if (lk === ' ' || lk === 'arrowup' || lk === 'w') action();
      };
      const onUp = e => { const k = KMAP[e.key.toLowerCase()]; if (k) keys[k] = false; };
      window.addEventListener('keyup', onUp);
      window.addEventListener('blur', clearKeys);
      const toL = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / sc, y: (e.clientY - r.top) / sc }; };
      cv.addEventListener('pointerdown', e => {
        e.preventDefault();
        if (screen !== 'play') return;
        if (paused) { togglePause(); return; }
        const q = toL(e);
        try { cv.setPointerCapture(e.pointerId); } catch (err) {}
        ptr = { id: e.pointerId, x: q.x, y: q.y, sx: e.clientX, sy: e.clientY, t0: performance.now(), dir0: G.p.d, held: 0, steer: e.pointerType !== 'mouse', type: e.pointerType };
        if (e.pointerType !== 'mouse') steer = 'ptr';
        else { hover = q; steer = 'mouse'; }
      });
      cv.addEventListener('pointermove', e => {
        const q = toL(e);
        if (e.pointerType === 'mouse' && screen === 'play' && !paused) {
          if (!hover || Math.abs(hover.x - q.x) + Math.abs(hover.y - q.y) > 0.5) { hover = q; steer = 'mouse'; }
        }
        if (ptr && ptr.id === e.pointerId) { ptr.x = q.x; ptr.y = q.y; }
      });
      const endPtr = e => {
        if (!ptr || ptr.id !== e.pointerId) return;
        const tap = performance.now() - ptr.t0 < 260 && Math.hypot(e.clientX - ptr.sx, e.clientY - ptr.sy) < 14;
        if (tap && e.type === 'pointerup' && G && screen === 'play' && !paused) {
          if (ptr.type !== 'mouse' && G.p.state === 'ski') G.p.d = ptr.dir0;
          action();
        }
        ptr = null;
      };
      cv.addEventListener('pointerup', endPtr); cv.addEventListener('pointercancel', endPtr);
      cv.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') hover = null; });
      $('[data-a=jump]').addEventListener('pointerdown', e => { e.preventDefault(); if (screen === 'play' && paused) togglePause(); else action(); });
      pauseB.addEventListener('pointerdown', e => { e.preventDefault(); if (screen === 'play') togglePause(); else if (screen === 'over') showMenu(); });

      W.onMin = () => { if (screen === 'play' && !paused) togglePause(); };
      W.onResize = fit;
      W.onClose = () => { closed = true; cancelAnimationFrame(raf); raf = 0; window.removeEventListener('keyup', onUp); window.removeEventListener('blur', clearKeys); };
      fit();
      showMenu();
      raf = requestAnimationFrame(t => { last = t; fit(); frame(t); });
    }
  });
})();
