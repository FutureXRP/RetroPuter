/* Snowball Showdown: a turn-based snowball-lobbing game for two kids with snow forts. Store game, 1990. */
(function () {
  const VW = 320, VH = 200;          // world is a classic 320x200 VGA screen
  const GRAV = 120, VMAX = 230, WINDK = 3, SIMSPD = 1.35, STEP = 1 / 120;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const rint = (a, b) => Math.floor(rnd(a, b + 1));
  const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 0.5;
  const FONT = (n, b) => `${b ? 'bold ' : ''}${n}px "Courier New", Courier, monospace`;

  const KID = [
    '....ww....',
    '...hhhh...',
    '..hhhhhh..',
    '..HHHHHH..',
    '..ssssss..',
    '..sssese..',
    '..ssssss..',
    '..sssmms..',
    '.yyyyyyyy.',
    '.ccccccyc.',
    '.ccccccyc.',
    '.cccccccc.',
    '..pp..pp..',
    '..pp..pp..',
    '.bbb..bbb.'
  ];
  const TEAMS = [
    { h: '#ff5555', H: '#aa0000', c: '#dd2222', m: '#aa0000', y: '#ffff55', s: '#f4c09a', p: '#303060', b: '#553311', e: '#000', w: '#fff', ui: '#ff5555', name: 'RED' },
    { h: '#5555ff', H: '#0000aa', c: '#2244dd', m: '#0000aa', y: '#55ff55', s: '#a8703f', p: '#303030', b: '#222', e: '#000', w: '#fff', ui: '#77aaff', name: 'BLUE' }
  ];
  const PUPS = {
    giant: { name: 'GIANT SNOWBALL', short: 'GIANT', col: '#ffffff' },
    triple: { name: 'TRIPLE SHOT', short: 'TRIPLE', col: '#ffff55' },
    sock: { name: 'WIND SOCK', short: 'WIND SOCK', col: '#ff8800' }
  };
  const SKIES = [
    { name: 'day', bands: ['#1c3cac', '#2448bc', '#3058c8', '#3c68d4', '#4c7cdc', '#5c90e4', '#70a4ec', '#88b8f4'], hill: '#5468b8', cap: '#dce4ff', tree: '#105828', sun: '#ffff55' },
    { name: 'dusk', bands: ['#282060', '#3c2878', '#58308c', '#783c94', '#a04c90', '#c86080', '#e87c6c', '#fca060'], hill: '#503c78', cap: '#e8d0ec', tree: '#20304c', sun: '#ffcc44' },
    { name: 'night', bands: ['#000018', '#000424', '#040830', '#08103c', '#0c1848', '#102054', '#182c60', '#20386c'], hill: '#1c2850', cap: '#8c9cc8', tree: '#081c20', sun: '#f0f0d0' }
  ];

  function sprite(rows, pal) {
    const c = document.createElement('canvas'); c.width = rows[0].length; c.height = rows.length;
    const g = c.getContext('2d');
    rows.forEach((r, y) => [...r].forEach((ch, x) => { if (pal[ch]) { g.fillStyle = pal[ch]; g.fillRect(x, y, 1, 1); } }));
    return c;
  }
  function flip(src) {
    const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
    const g = c.getContext('2d'); g.translate(src.width, 0); g.scale(-1, 1); g.drawImage(src, 0, 0); return c;
  }
  const hex32 = h => { const n = parseInt(h.slice(1), 16); return (255 << 24 | (n & 255) << 16 | (n >> 8 & 255) << 8 | n >> 16) >>> 0; };
  const iconPix = (rows, pal, ox, oy) => rows.map((r, y) => [...r].map((ch, x) => pal[ch] ? `<rect x="${ox + x}" y="${oy + y}" width="1" height="1" fill="${pal[ch]}"/>` : '').join('')).join('');

  (window.RETRO_APPS = window.RETRO_APPS || []).push({
    id: 'lobber',
    label: 'Snowball Showdown',
    kind: 'store', cat: 'game', year: 1990, price: 12.95,
    publisher: 'Frostbyte Fun Co.',
    genre: 'Strategy / Artillery',
    tagline: 'Two forts. One hill. Lots of snow.',
    blurb: 'Pick your angle, pick your power and lob a snowball over the hill! Two kids dig in behind their snow forts on a brand-new snowy landscape every round. Watch the wind flag, chip away the snow, grab floating power-ups like the Giant Snowball, Triple Shot and Wind Sock, and send your rival tumbling into a drift with a big PLOP. Play a friend on the same computer or challenge the computer at three skill levels, best of 3 or 5.',
    help: 'Take turns lobbing snowballs over a snowy hill by choosing an angle and power. Beat the computer to earn money.',
    sizeKB: 420,
    box: { bg: '#1c3cac', fg: '#ffffff', accent: '#ff5555' },
    icon: `<svg viewBox="0 0 32 32" shape-rendering="crispEdges" aria-hidden="true"><rect x="0" y="0" width="32" height="32" fill="#3058c8"/><rect x="0" y="0" width="32" height="6" fill="#1c3cac"/><path d="M0 24h6v-2h6v-2h8v2h6v-3h6v13H0z" fill="#fff"/><rect x="0" y="27" width="32" height="5" fill="#aabbff"/><g fill="#fff"><rect x="14" y="6" width="4" height="4"/><rect x="13" y="7" width="6" height="2"/></g><g fill="#aabbff"><rect x="10" y="10" width="1" height="1"/><rect x="8" y="12" width="1" height="1"/><rect x="6" y="15" width="1" height="1"/></g><g transform="translate(1 7)">${iconPix(KID, TEAMS[0], 0, 0)}</g><rect x="23" y="4" width="1" height="10" fill="#888"/><rect x="24" y="4" width="5" height="3" fill="#ffff55"/></svg>`,
    window: { w: 660, h: 520 },
    css: `
      .snb{height:100%;display:flex;flex-direction:column;background:#000018;user-select:none;-webkit-user-select:none}
      .snb-wrap{flex:1;min-height:0;position:relative;display:flex;align-items:center;justify-content:center;overflow:hidden}
      .snb-wrap canvas{display:block;touch-action:none;image-rendering:pixelated;cursor:crosshair}
      .snb-ctl{display:flex;flex-wrap:wrap;gap:4px 10px;align-items:center;justify-content:center;padding:4px;background:#c0c0c0;border-top:2px solid #fff}
      .snb-who{font-weight:700;min-width:84px;text-align:center;padding:3px 6px;color:#fff;text-shadow:1px 1px #000;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;max-width:140px}
      .snb-f{display:flex;align-items:center;gap:3px}
      .snb-f label{font-weight:700}
      .snb-f input{width:38px;text-align:center;font:700 14px "Courier New",monospace;padding:3px 2px;border:2px solid;border-color:#808080 #fff #fff #808080;background:#fff}
      .snb-f input:disabled{background:#dcdcdc;color:#555}
      .snb-ctl .btn{min-width:0;padding:4px 9px;touch-action:manipulation}
      .snb-ctl .snb-go{padding:4px 14px;font-weight:700}
      .snb-msg{flex-basis:100%;text-align:center;font-size:11px;color:#000;min-height:14px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
      @media (pointer:coarse){.snb-ctl .btn{padding:8px 12px;min-height:40px}.snb-f input{width:44px;padding:8px 2px;font-size:16px}}
      .snb-ov{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,24,.55);padding:8px;overflow:auto}
      .snb-ov[hidden]{display:none}
      .snb-box{padding:10px 14px;display:flex;flex-direction:column;gap:7px;color:#000;max-width:340px;width:100%;text-align:center;margin:auto}
      .snb-box h2{margin:0;font:700 22px/1.05 "Arial Black",Impact,sans-serif;color:#1c3cac;text-shadow:2px 2px #aabbff;letter-spacing:1px}
      .snb-box h3{margin:0;font:700 17px/1.1 "Arial Black",Impact,sans-serif;color:#aa0000}
      .snb-box p{margin:0}
      .snb-sub{font-size:11px;color:#444}
      .snb-seg{display:flex;gap:3px;justify-content:center;flex-wrap:wrap}
      .snb-seg .btn{flex:1;min-width:0;padding:5px 4px;touch-action:manipulation}
      .snb-seg .btn.on{border-color:#000 #fff #fff #000;box-shadow:inset 1px 1px #808080;background:#d8d8d8;font-weight:700}
      .snb-lab{font-weight:700;text-align:left;font-size:11px;margin-bottom:-3px}
      .snb-row{display:flex;gap:6px;justify-content:center;flex-wrap:wrap}
      .snb-row .btn{min-width:96px;padding:6px 10px;touch-action:manipulation}
      .snb-rec{font-size:11px;color:#333}
      @media (pointer:coarse){.snb-seg .btn,.snb-row .btn{min-height:40px}}
    `,
    open(W, api) {
      W.body.innerHTML = `<div class="snb">
        <div class="snb-wrap"><canvas aria-label="Snowball Showdown playing field"></canvas><div class="snb-ov" hidden></div></div>
        <div class="snb-ctl">
          <span class="snb-who sunken">RED</span>
          <span class="snb-f"><label for="snb-a">Angle</label><button class="btn" data-d="a-" aria-label="Lower angle">-</button><input id="snb-a" data-i="a" inputmode="numeric" maxlength="2" autocomplete="off"><button class="btn" data-d="a+" aria-label="Raise angle">+</button></span>
          <span class="snb-f"><label for="snb-p">Power</label><button class="btn" data-d="p-" aria-label="Less power">-</button><input id="snb-p" data-i="p" inputmode="numeric" maxlength="3" autocomplete="off"><button class="btn" data-d="p+" aria-label="More power">+</button></span>
          <button class="btn snb-go" data-go>Throw!</button>
          <div class="snb-msg"></div>
        </div></div>`;
      const $ = s => W.body.querySelector(s);
      const wrap = $('.snb-wrap'), cv = $('canvas'), g = cv.getContext('2d'), ov = $('.snb-ov');
      const whoEl = $('.snb-who'), aIn = $('[data-i=a]'), pIn = $('[data-i=p]'), goB = $('[data-go]'), msgEl = $('.snb-msg');
      const buf = document.createElement('canvas'); buf.width = VW; buf.height = VH; const b = buf.getContext('2d');
      const terr = document.createElement('canvas'); terr.width = VW; terr.height = VH; const tg = terr.getContext('2d');
      const skyC = document.createElement('canvas'); skyC.width = VW; skyC.height = VH; const sg = skyC.getContext('2d');
      const SPR = TEAMS.map(t => { const s = sprite(KID, t); return [s, flip(s)]; });

      let opts = Object.assign({ sound: true, aimLine: true, snow: true, mode: 'cpu', diff: 'normal', bestOf: 3 }, api.load('opts', {}));
      let stats = Object.assign({ easy: { w: 0, l: 0 }, normal: { w: 0, l: 0 }, hard: { w: 0, l: 0 } }, api.load('stats', {}));
      let EX = 0;   // extra sky above the 320x200 field on tall screens (purely visual)
      let S = null, closed = false, raf = 0, last = 0, tt = 0, paused = false, scale = 1, terrDirty = true, skyIdx = 0;
      let balls = [], parts = [], flakes = [], clouds = [], banner = null, drag = null, aiStep = null, afterT = 0, plop = null, guide = null, hover = false;
      const snd = fn => { if (opts.sound) try { fn(); } catch (e) {} };
      const SND = {
        tick: () => snd(() => api.tone(1500, 0.02, { vol: 0.02 })),
        whoosh: big => snd(() => { api.noise(big ? 0.4 : 0.25, { ft: 'bandpass', f: big ? 600 : 1100, q: 0.8, vol: 0.07, decay: 1 }); api.tone(big ? 180 : 320, 0.2, { to: big ? 360 : 700, type: 'triangle', vol: 0.03 }); }),
        crunch: big => snd(() => { api.noise(big ? 0.45 : 0.2, { ft: 'lowpass', f: big ? 500 : 900, vol: big ? 0.12 : 0.09, decay: 1 }); }),
        plop: () => snd(() => { api.tone(260, 0.4, { to: 55, type: 'sine', vol: 0.12 }); api.noise(0.4, { ft: 'lowpass', f: 380, vol: 0.12, decay: 1, at: 0.03 }); }),
        whee: () => snd(() => api.tone(420, 0.35, { to: 1100, type: 'triangle', vol: 0.05 })),
        pop: () => snd(() => { api.noise(0.05, { ft: 'highpass', f: 2500, vol: 0.12, decay: 1 }); [0, 4, 7, 12].forEach((n, i) => api.tone(api.midi(76 + n), 0.07, { vol: 0.045, at: 0.05 + i * 0.06 })); }),
        ooh: () => snd(() => api.tone(520, 0.3, { to: 330, type: 'triangle', vol: 0.05 })),
        round: () => snd(() => [0, 4, 7, 12, 7, 12].forEach((n, i) => api.tone(api.midi(67 + n), 0.1, { type: 'square', vol: 0.04, at: i * 0.09 }))),
        win: () => snd(() => { [60, 64, 67, 72, 67, 72, 76, 79].forEach((n, i) => api.tone(api.midi(n + 7), 0.14, { type: 'square', vol: 0.045, at: i * 0.12 })); [48, 55, 60].forEach((n, i) => api.tone(api.midi(n + 7), 0.3, { type: 'triangle', vol: 0.05, at: i * 0.32 })); }),
        lose: () => snd(() => [67, 66, 65, 64].forEach((n, i) => api.tone(api.midi(n - 5), i === 3 ? 0.6 : 0.25, { type: 'triangle', vol: 0.06, at: i * 0.28 }))),
        wind: () => snd(() => api.noise(0.8, { ft: 'bandpass', f: 500, q: 3, vol: 0.03 }))
      };

      api.menubar([
        { label: 'Game', items: () => [
          { label: 'New match...', fn: () => { S = null; title(); } },
          { label: 'Rematch (same settings)', fn: () => startMatch(), disabled: !S },
          { label: 'Record vs computer', fn: showRecord },
          '-', { label: 'Exit', fn: () => api.close() }
        ] },
        { label: 'Options', items: () => [
          { label: (opts.sound ? '[x] ' : '[ ] ') + 'Sound effects', fn: () => { opts.sound = !opts.sound; saveOpts(); } },
          { label: (opts.aimLine ? '[x] ' : '[ ] ') + 'Show aiming arrow', fn: () => { opts.aimLine = !opts.aimLine; saveOpts(); } },
          { label: (opts.snow ? '[x] ' : '[ ] ') + 'Falling snow', fn: () => { opts.snow = !opts.snow; saveOpts(); } }
        ] },
        { label: 'Help', items: [
          { label: 'How to play', fn: howTo },
          { label: 'About Snowball Showdown', fn: () => api.msgBox('About Snowball Showdown', 'Snowball Showdown 1.0\nFrostbyte Fun Co., 1990\n\nNo snowmen were harmed in the making of this game.') }
        ] }
      ]);
      function howTo() {
        api.msgBox('How to play', 'Two kids, two snow forts, one snowy hill. Take turns throwing snowballs. Hit the other kid and they fall into the snow with a big PLOP. That wins the round.\n\n' +
          'AIMING\nType an Angle (0 to 90) and a Power (1 to 100) and press Enter or Throw!\nOr use the - and + buttons, or the arrow keys (Up/Down = angle, Left/Right = power, hold Shift for bigger steps).\nOr drag on the playing field: point from your kid toward where you want to throw. The further you drag, the harder you throw. Let go to throw.\n\n' +
          'WIND\nThe flag at the top shows the wind. It changes every turn and pushes your snowball sideways.\n\n' +
          'POWER-UPS\nHit a floating balloon to grab its prize for your next throw:\nGIANT SNOWBALL: a huge snowball that digs a big hole and hits anything close.\nTRIPLE SHOT: three snowballs at once.\nWIND SOCK: calm air for your next turn, plus a guide showing where your throw starts to go.\n\n' +
          'Snowballs chip away the snow, even your fort! Win the most rounds (best of 3 or 5) to win the match.\n\nBeat the computer to earn $3.');
      }
      function showRecord() {
        api.msgBox('Record vs computer', ['easy', 'normal', 'hard'].map(d => `${d[0].toUpperCase() + d.slice(1)}: ${stats[d].w} won, ${stats[d].l} lost`).join('\n'));
      }
      const saveOpts = () => api.save('opts', opts);
      const msg = t => { msgEl.textContent = t; };
      const names = () => (S ? S.mode : opts.mode) === 'cpu' ? [pName(), 'COMPUTER'] : ['PLAYER 1', 'PLAYER 2'];
      function pName() { const u = String(api.user || '').replace(/[^\w .-]/g, '').trim().toUpperCase().slice(0, 10); return u || 'PLAYER 1'; }
      const isCpu = i => S && S.mode === 'cpu' && i === 1;

      /* ---------- scenery ---------- */
      function makeSky() {
        const P = SKIES[skyIdx], TH = VH + EX;
        skyC.height = TH;
        const bh = Math.ceil(TH / P.bands.length);
        P.bands.forEach((c, i) => { sg.fillStyle = c; sg.fillRect(0, i * bh, VW, bh); });
        // dither the band edges for that 256-color look
        P.bands.forEach((c, i) => { if (!i) return; sg.fillStyle = c; for (let x = 0; x < VW; x += 2) { sg.fillRect(x + (i % 2), i * bh - 1, 1, 1); sg.fillRect(x + 1 - (i % 2), i * bh - 2, 1, 1); } });
        if (P.name === 'night') { sg.fillStyle = '#fff'; for (let i = 0; i < 70; i++) sg.fillRect(rint(0, VW), rint(0, 120 + EX), 1, 1); }
        // sun or moon
        const sx = rint(40, 280), sy = rint(22, 44) + Math.round(EX * 0.6);
        sg.fillStyle = P.sun; sg.beginPath(); sg.arc(sx, sy, P.name === 'night' ? 8 : 11, 0, 6.3); sg.fill();
        if (P.name === 'night') { sg.fillStyle = P.bands[1]; sg.beginPath(); sg.arc(sx + 4, sy - 3, 7, 0, 6.3); sg.fill(); }
        // far mountains with snowcaps
        const ph = rnd(0, 6), ph2 = rnd(0, 6);
        for (let x = 0; x < VW; x++) {
          const top = EX + Math.round(100 + Math.sin(x * 0.021 + ph) * 18 + Math.sin(x * 0.057 + ph2) * 8);
          sg.fillStyle = P.hill; sg.fillRect(x, top, 1, TH - top);
          sg.fillStyle = P.cap; sg.fillRect(x, top, 1, Math.max(1, Math.round(4 - (top - EX - 82) / 8)));
        }
        // a row of little pine trees on the far slope
        for (let i = 0; i < 16; i++) {
          const x = rint(0, VW), base = EX + rint(128, 150), hgt = rint(7, 13);
          sg.fillStyle = P.tree;
          for (let r = 0; r < hgt; r++) { const w = Math.floor(r / 2.2) + 1; sg.fillRect(x - w, base - hgt + r, w * 2 + 1, 1); }
          sg.fillStyle = P.cap; sg.fillRect(x, base - hgt, 1, 1);
        }
      }
      function makeClouds() {
        clouds = [];
        for (let i = 0; i < 4; i++) clouds.push({ x: rnd(0, VW), y: rnd(12 - EX * 0.8, 70), w: rint(18, 36), puffs: Array.from({ length: 5 }, () => [rnd(-1, 1), rnd(-3, 1), rnd(4, 8)]) });
        flakes = Array.from({ length: 45 }, () => ({ x: rnd(0, VW), y: rnd(-EX, VH), s: rnd(8, 20), p: rnd(0, 6), big: Math.random() < 0.25 }));
      }
      const SNOW = [hex32('#ffffff'), hex32('#f0f4ff'), hex32('#dce4ff'), hex32('#c4d0fc'), hex32('#a8b8f4'), hex32('#8c9cec')];
      const FORT = [hex32('#f4f8ff'), hex32('#a8b8e0'), hex32('#dfe8ff')];
      function drawTerrain() {
        const img = tg.createImageData(VW, VH), px = new Uint32Array(img.data.buffer);
        const h = S.h, fb = S.fb;
        for (let x = 0; x < VW; x++) {
          const top = Math.round(h[x]);
          const lit = x > 0 && h[x - 1] > h[x] + 0.5;       // light comes from the left
          const shade = x < VW - 1 && h[x + 1] < h[x] - 0.5;
          for (let y = Math.max(0, top); y < VH; y++) {
            const d = fb[x] && y >= fb[x] ? y - Math.max(top, fb[x] - 1) : y - top;
            let c;
            if (fb[x] && y < fb[x]) {
              const row = Math.floor((fb[x] - y) / 4);
              c = (fb[x] - y) % 4 === 0 || (x + (row % 2) * 3) % 6 === 0 ? FORT[1] : d === 0 ? FORT[0] : FORT[2];
            } else if (d === 0) c = SNOW[shade ? 2 : 0];
            else if (d < 3) c = SNOW[lit ? 0 : 1];
            else {
              let k = d < 10 ? 1 : d < 22 ? 2 : d < 40 ? 3 : d < 60 ? 4 : 5;
              if (((x + y) & 1) && [9, 21, 39, 59].some(v => d >= v && d < v + 3)) k = Math.max(1, k - 1);   // dithered band edges
              c = SNOW[k];
            }
            px[y * VW + x] = c;
          }
        }
        tg.putImageData(img, 0, 0);
        terrDirty = false;
      }

      /* ---------- match / round setup ---------- */
      function genRound(backdrop) {
        const h = new Array(VW), fb = new Array(VW).fill(0);
        const base = rnd(125, 160);
        const wv = [[rnd(0.012, 0.02), rnd(12, 26), rnd(0, 6.3)], [rnd(0.03, 0.05), rnd(4, 10), rnd(0, 6.3)], [rnd(0.09, 0.13), rnd(0.5, 2.5), rnd(0, 6.3)]];
        const hill = Math.random() < 0.85 ? rnd(25, 75) : rnd(-15, 5), hc = rnd(125, 195), hw = rnd(30, 65);
        for (let x = 0; x < VW; x++) {
          let y = base;
          wv.forEach(([f, a, p]) => { y += Math.sin(x * f + p) * a; });
          y -= hill * Math.exp(-Math.pow((x - hc) / hw, 2));
          h[x] = clamp(y, 48, 186);
        }
        const kids = [{ x: rint(20, 44) }, { x: rint(276, 300) }];
        kids.forEach((k, i) => {
          const dir = i ? -1 : 1;
          const gy = Math.round(clamp(h[k.x], 110, 176));
          for (let x = k.x - 18; x <= k.x + 18; x++) {
            if (x < 0 || x >= VW) continue;
            const dd = Math.abs(x - k.x);
            if (dd <= 7) h[x] = gy; else { const t = (dd - 7) / 11; h[x] = gy + (h[x] - gy) * t; }
          }
          for (let j = 0; j < 7; j++) {
            const x = k.x + dir * (6 + j);
            h[x] = gy - 8 - (j % 3 !== 2 ? 2 : 0) + (j === 6 ? 3 : 0);
            fb[x] = gy;
          }
          k.y = gy; k.ang = 45; k.pow = 60; k.item = null;
        });
        // floating power-up balloons in the middle of the field
        const pups = [], types = ['giant', 'triple', 'sock'];
        const n = rint(2, 3);
        for (let tries = 0; pups.length < n && tries < 60; tries++) {
          const x = rint(80, 240);
          if (pups.some(p => Math.abs(p.x - x) < 36)) continue;
          let top = VH; for (let xx = x - 5; xx <= x + 5; xx++) top = Math.min(top, h[xx]);
          if (top < 70 || (Math.abs(x - 160) < 20 && top < 90)) continue;
          const y = Math.round(clamp(top - rnd(22, 60), Math.abs(x - 160) < 20 ? 64 : 48, top - 18));
          pups.push({ x, y, type: types.splice(rint(0, types.length - 1), 1)[0] || 'giant', ph: rnd(0, 6) });
        }
        S.h = h; S.fb = fb; S.kids = kids; S.pups = pups;
        S.turn = S.starter; S.turns = 0; S.phase = 'aim';
        S.sky = rint(0, 2);
        if (backdrop) { S.phase = 'title'; S.wind = rint(-6, 6); return; }
        S.ai = { bias: 0, noise: AI[S.diff].noise };
        skyIdx = S.sky; makeSky(); makeClouds(); terrDirty = true;
        balls = []; parts = []; plop = null; guide = null; aiStep = null;
        newWind();
        startTurn();
      }
      const AI = {
        easy: { noise: 20, shrink: 0.85, floor: 5, learn: 0.4, know: 0, think: 1.1 },
        normal: { noise: 11, shrink: 0.7, floor: 1.6, learn: 0.75, know: 0.55, think: 0.9 },
        hard: { noise: 5.5, shrink: 0.55, floor: 0.6, learn: 1, know: 1, think: 0.7 }
      };
      function startMatch() {
        ov.hidden = true;
        S = { mode: opts.mode, diff: opts.diff, need: opts.bestOf === 5 ? 3 : 2, bestOf: opts.bestOf, score: [0, 0], round: 1, starter: 0 };
        genRound();
        banner = { text: 'ROUND 1', sub: 'FIRST TO ' + S.need + ' WINS', t: 2 };
        SND.round();
      }
      function newWind() {
        let w = Math.round(gauss() * 5);
        if (Math.random() < 0.12) w = 0;
        S.wind = clamp(w, -12, 12);
      }
      function startTurn() {
        const k = S.kids[S.turn];
        S.calm = false;
        if (k.item === 'sock') { S.calm = true; S.wind = 0; }
        S.phase = 'aim';
        guide = null;
        if (isCpu(S.turn)) { aiStep = { t: AI[S.diff].think, plan: null }; msg('The computer is thinking...'); }
        else { aiStep = null; msg(S.turns < 2 && S.round === 1 ? 'Set Angle and Power, then Throw! (or drag on the field)' : names()[S.turn] + ', your turn. ' + (k.item ? 'You have the ' + PUPS[k.item].name + '!' : k.last ? 'Last throw: ' + LAST[k.last] : '')); }
        if (S.calm && !isCpu(S.turn)) makeGuide();
        syncPanel();
        saveMatch();
      }
      function saveMatch() {
        if (!S || S.phase !== 'aim') return;
        api.save('match', { mode: S.mode, diff: S.diff, need: S.need, bestOf: S.bestOf, score: S.score, round: S.round, starter: S.starter, h: S.h.map(v => Math.round(v * 10) / 10), fb: S.fb, kids: S.kids, pups: S.pups, turn: S.turn, turns: S.turns, sky: S.sky, ai: S.ai, wind: S.wind, calm: S.calm });
      }
      function resumeMatch() {
        const m = api.load('match', null); if (!m) return;
        ov.hidden = true;
        S = Object.assign({}, m); S.phase = 'aim';
        opts.mode = S.mode; opts.diff = S.diff; opts.bestOf = S.bestOf;
        skyIdx = S.sky; makeSky(); makeClouds(); terrDirty = true;
        balls = []; parts = []; plop = null; guide = null;
        startTurn();
        if (S.calm) S.wind = 0;
        banner = { text: 'ROUND ' + S.round, sub: 'WELCOME BACK!', t: 1.5 };
      }

      /* ---------- panel ---------- */
      function syncPanel() {
        if (!S) { whoEl.textContent = '---'; whoEl.style.background = '#808080'; [aIn, pIn, goB].forEach(e => { e.disabled = true; }); aIn.value = ''; pIn.value = ''; W.body.querySelectorAll('[data-d]').forEach(e => { e.disabled = true; }); return; }
        const k = S.kids[S.turn], human = S.phase === 'aim' && !isCpu(S.turn);
        whoEl.textContent = names()[S.turn];
        whoEl.style.background = TEAMS[S.turn].H;
        if (document.activeElement !== aIn) aIn.value = Math.round(k.ang);
        if (document.activeElement !== pIn) pIn.value = Math.round(k.pow);
        [aIn, pIn, goB].forEach(e => { e.disabled = !human; });
        W.body.querySelectorAll('[data-d]').forEach(e => { e.disabled = !human; });
      }
      const humanAim = () => S && S.phase === 'aim' && !isCpu(S.turn) && !paused && ov.hidden;
      function readInputs() {
        const k = S.kids[S.turn];
        const a = parseInt(aIn.value, 10), p = parseInt(pIn.value, 10);
        if (!isNaN(a)) k.ang = clamp(a, 0, 90);
        if (!isNaN(p)) k.pow = clamp(p, 1, 100);
      }
      function nudge(which, d) {
        if (!humanAim()) return;
        readInputs();
        const k = S.kids[S.turn];
        if (which === 'a') k.ang = clamp(k.ang + d, 0, 90); else k.pow = clamp(k.pow + d, 1, 100);
        aIn.blur(); pIn.blur();
        syncPanel(); SND.tick();
        if (guide) makeGuide();
      }
      let rep = null;
      W.body.querySelectorAll('[data-d]').forEach(bt => {
        const w = bt.dataset.d[0], d = bt.dataset.d[1] === '+' ? 1 : -1;
        bt.addEventListener('pointerdown', e => {
          e.preventDefault(); nudge(w, d);
          clearInterval(rep); let n = 0;
          rep = setInterval(() => { n++; if (n > 4) nudge(w, d * (n > 16 ? 3 : 1)); }, 70);
        });
        ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => bt.addEventListener(ev, () => { clearInterval(rep); rep = null; }));
        bt.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); nudge(w, d); } });
      });
      [aIn, pIn].forEach(inp => {
        inp.addEventListener('input', () => { inp.value = inp.value.replace(/\D/g, ''); if (humanAim()) { readInputs(); if (guide) makeGuide(); } });
        inp.addEventListener('focus', () => inp.select());
        inp.addEventListener('blur', () => { if (S) { readInputs(); syncPanel(); } });
      });
      goB.addEventListener('click', () => { if (humanAim()) { readInputs(); throwNow(); } });

      /* ---------- physics ---------- */
      function handPos(i, ang) {
        const k = S.kids[i], dir = i ? -1 : 1, a = ang * Math.PI / 180;
        return { x: k.x + dir * 1 + Math.cos(a) * 6 * dir, y: k.y - 9 - Math.sin(a) * 6 };
      }
      const kidHit = (k, x, y, r) => x + r > k.x - 4 && x - r < k.x + 4 && y + r > k.y - 15 && y - r < k.y;
      const groundAt = x => { const xi = Math.round(x); return xi < 0 || xi >= VW ? VH + 50 : S.h[xi]; };
      function mkBall(i, ang, pow, r, wind) {
        const dir = i ? -1 : 1, a = ang * Math.PI / 180, v = pow / 100 * VMAX, p = handPos(i, ang);
        return { x: p.x, y: p.y, vx: Math.cos(a) * v * dir, vy: -Math.sin(a) * v, r, owner: i, t: 0, wind, trail: [], alive: true };
      }
      // Advance a ball one physics step. Returns null or an event {type, kid}.
      function stepBall(o) {
        o.vx += o.wind * WINDK * STEP; o.vy += GRAV * STEP;
        o.x += o.vx * STEP; o.y += o.vy * STEP; o.t += STEP;
        for (let i = 0; i < 2; i++) {
          const k = S.kids[i];
          if (k.down) continue;
          if (i === o.owner && o.t < 0.35) continue;
          if (kidHit(k, o.x, o.y, o.r)) return { type: 'kid', kid: i };
        }
        if (o.x < -12 || o.x > VW + 12 || o.y > VH + 10) return { type: 'out' };
        if (o.y + o.r * 0.4 >= groundAt(o.x)) return { type: 'ground' };
        return null;
      }
      function trace(i, ang, pow, wind, pts) {
        const o = mkBall(i, ang, pow, 2, wind);
        for (let n = 0; n < 2400; n++) {
          const ev = stepBall(o);
          if (pts && n % 6 === 0) pts.push([o.x, o.y]);
          if (ev) return { ev, x: o.x, y: o.y };
        }
        return { ev: { type: 'out' }, x: o.x, y: o.y };
      }
      function makeGuide() {
        const k = S.kids[S.turn], pts = [];
        trace(S.turn, k.ang, k.pow, S.wind, pts);
        guide = pts.slice(0, Math.max(4, Math.floor(pts.length * 0.4)));
      }
      // signed miss distance: positive = too far, negative = too short
      function missBy(i, res) {
        const foe = S.kids[1 - i], dir = i ? -1 : 1;
        if (res.ev.type === 'kid') return res.ev.kid === 1 - i ? 0 : -400;
        return (res.x - foe.x) * dir;
      }

      /* ---------- throwing ---------- */
      function throwNow() {
        if (!S || S.phase !== 'aim') return;
        const i = S.turn, k = S.kids[i], item = k.item;
        const big = item === 'giant', r = big ? 5 : 2;
        balls = [];
        if (item === 'triple') [-5, 0, 5].forEach(d => balls.push(mkBall(i, clamp(k.ang + d, 0, 90), k.pow, r, S.wind)));
        else balls.push(mkBall(i, k.ang, k.pow, r, S.wind));
        balls.forEach(o => { o.big = big; });
        k.item = null; S.calm = false; guide = null;
        k.throwT = 0.35;
        S.phase = 'fly'; S.turns++;
        S.lastMiss = null; S.hitBy = null;
        drag = null;
        aIn.blur(); pIn.blur();
        syncPanel();
        SND.whoosh(big);
        msg(names()[i] + ' throws: angle ' + Math.round(k.ang) + ', power ' + Math.round(k.pow) + (item ? ' (' + PUPS[item].short + ')' : ''));
      }
      function splash(x, y, n, sp, col) {
        for (let j = 0; j < n; j++) { const a = rnd(Math.PI * 1.05, Math.PI * 1.95), v = rnd(sp * 0.3, sp); parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rnd(0.4, 0.9), c: col || (Math.random() < 0.7 ? '#fff' : '#bcc8f8') }); }
      }
      function crater(cx, cy, R) {
        for (let x = Math.floor(cx - R); x <= Math.ceil(cx + R); x++) {
          if (x < 0 || x >= VW) continue;
          const d = Math.sqrt(Math.max(0, R * R - (x - cx) * (x - cx)));
          const bottom = Math.min(VH - 6, cy + d);
          if (S.h[x] < bottom && S.h[x] > cy - d - 3) S.h[x] = bottom;
          else if (S.h[x] <= cy - d - 3) S.h[x] = Math.min(VH - 6, S.h[x] + d * 0.5);   // buried: dent the top a bit
        }
        terrDirty = true;
      }
      function ballEvent(o, ev) {
        o.alive = false;
        if (ev.type === 'kid') {
          if (S.hitBy) return;
          S.hitBy = { kid: ev.kid, by: o.owner };
          splash(o.x, o.y, o.big ? 30 : 16, 70);
          return;
        }
        if (ev.type === 'ground') {
          const R = o.big ? 13 : 5;
          const gy = groundAt(o.x);
          crater(o.x, gy, R);
          splash(o.x, gy, o.big ? 28 : 12, o.big ? 80 : 55);
          SND.crunch(o.big);
          // a giant snowball's splash can still catch a kid standing close
          if (o.big && !S.hitBy) for (let i = 0; i < 2; i++) { const k = S.kids[i]; if (Math.abs(k.x - o.x) < R + 3 && Math.abs(k.y - gy) < R + 8) { S.hitBy = { kid: i, by: o.owner }; break; } }
        }
        if (o.owner !== undefined && S.lastMiss === null) {
          const foe = S.kids[1 - o.owner], dir = o.owner ? -1 : 1;
          S.lastMiss = ev.type === 'out' && o.y > VH ? -400 : (clamp(o.x, -60, VW + 60) - foe.x) * dir;
        }
      }
      function afterFlight() {
        if (S.hitBy) {
          const v = S.hitBy.kid;
          S.phase = 'plop';
          plop = { kid: v, t: 0, landed: false, self: S.hitBy.by === v };
          S.kids[v].down = true;
          SND.whee();
          msg(plop.self ? 'Oops! ' + names()[v] + ' got their own snowball!' : names()[S.hitBy.by] + ' scores a hit!');
          return;
        }
        // near miss feedback and computer learning
        const i = S.turn, m = S.lastMiss;
        if (m !== null && Math.abs(m) < 16) { SND.ooh(); banner = { text: 'SO CLOSE!', sub: '', t: 1 }; }
        if (isCpu(i) && m !== null) {
          const A = AI[S.diff], ai = S.ai;
          ai.bias = clamp(ai.bias - clamp(m, -120, 120) * 0.1 * A.learn, -25, 25);
          ai.noise = Math.max(A.floor, ai.noise * A.shrink);
        }
        S.kids[i].last = m === null ? null : m > 8 ? 'far' : m < -8 ? 'short' : 'close';
        if (!isCpu(i)) msg(LAST[S.kids[i].last] || '');
        S.phase = 'after'; afterT = 0.9;
      }
      const LAST = { far: 'Too far! Try a little less power.', short: 'Too short! Try a little more power.', close: 'Just missed!' };
      function nextTurn() {
        S.turn = 1 - S.turn;
        newWind();
        startTurn();
        if (Math.abs(S.wind) >= 9) SND.wind();
      }
      function roundOver() {
        const v = plop.kid, w = 1 - v;
        S.score[w]++; S.lastWinner = w;
        plop = null;
        if (S.score[w] >= S.need) return matchOver(w);
        S.phase = 'between'; afterT = 2.4;
        banner = { text: 'ROUND TO ' + names()[w] + '!', sub: `${names()[0]} ${S.score[0]}  -  ${S.score[1]} ${names()[1]}`, t: 2.4 };
        SND.round();
      }
      function matchOver(w) {
        S.phase = 'over';
        api.save('match', null);
        const nm = names();
        let extra = '';
        if (S.mode === 'cpu') {
          const st = stats[S.diff];
          if (w === 0) { st.w++; api.earn(3, 'beating the computer at Snowball Showdown'); extra = '<p><b>You beat the computer! +$3.00</b></p>'; SND.win(); }
          else { st.l++; extra = '<p>The computer wins this time. Try again!</p>'; SND.lose(); }
          api.save('stats', stats);
        } else SND.win();
        ov.innerHTML = `<div class="snb-box raised"><h3>${api.esc(nm[w])} WINS!</h3><p style="font:700 20px 'Courier New',monospace">${S.score[0]} - ${S.score[1]}</p>${extra}
          <p class="snb-sub">${S.mode === 'cpu' ? 'Computer: ' + S.diff + ', best of ' + S.bestOf : '2 players, best of ' + S.bestOf}</p>
          <div class="snb-row"><button class="btn" data-o="again"><b>Rematch</b></button><button class="btn" data-o="menu">Main menu</button></div></div>`;
        ov.hidden = false;
        ov.querySelector('[data-o=again]').onclick = () => { api.sfx.click(); startMatch(); };
        ov.querySelector('[data-o=menu]').onclick = () => { S = null; title(); };
        ov.querySelector('[data-o=again]').focus();
        msg('Match over.');
        syncPanel();
      }

      /* ---------- computer player ---------- */
      function aiPlan() {
        const i = S.turn, A = AI[S.diff], ai = S.ai;
        const wk = S.wind * A.know + (1 - A.know) * 0;
        let best = null;
        for (const ang of [45, 55, 62, 38, 70, 30, 78]) {
          let lo = 5, hi = 100, res = null, pow = 50;
          for (let n = 0; n < 16; n++) {
            pow = (lo + hi) / 2;
            res = trace(i, ang, pow, wk);
            const m = missBy(i, res);
            if (m === 0) break;
            if (m < 0) lo = pow; else hi = pow;
          }
          const m = Math.abs(missBy(i, res));
          if (!best || m < best.m) best = { ang, pow, m };
          if (m < 4) break;
        }
        const ang = clamp(Math.round(best.ang + gauss() * ai.noise * 0.25), 5, 88);
        const pow = clamp(Math.round(best.pow + ai.bias + gauss() * ai.noise), 5, 100);
        return { ang, pow };
      }
      function aiUpdate(dt) {
        const k = S.kids[S.turn];
        if (aiStep.t > 0) { aiStep.t -= dt; if (aiStep.t <= 0) { aiStep.plan = aiPlan(); aiStep.a0 = k.ang; aiStep.p0 = k.pow; aiStep.u = 0; } return; }
        aiStep.u = Math.min(1, aiStep.u + dt / 0.8);
        const e = 1 - Math.pow(1 - aiStep.u, 2);
        const na = Math.round(aiStep.a0 + (aiStep.plan.ang - aiStep.a0) * e), np = Math.round(aiStep.p0 + (aiStep.plan.pow - aiStep.p0) * e);
        if (na !== Math.round(k.ang) || np !== Math.round(k.pow)) { if ((tt * 30 | 0) % 2) SND.tick(); }
        k.ang = na; k.pow = np; syncPanel();
        if (aiStep.u >= 1) { aiStep.hold = (aiStep.hold || 0) + dt; if (aiStep.hold > 0.35) { aiStep = null; throwNow(); } }
      }

      /* ---------- update ---------- */
      function update(dt) {
        tt += dt;
        clouds.forEach(c => { c.x += (S ? S.wind : 3) * 1.6 * dt + 1 * dt; if (c.x > VW + 40) c.x = -40; if (c.x < -40) c.x = VW + 40; });
        flakes.forEach(f => { f.y += f.s * dt; f.x += ((S ? S.wind : 2) * 2.2 + Math.sin(tt * 1.5 + f.p) * 5) * dt; if (f.y > VH) { f.y = -EX - 2; f.x = rnd(0, VW); } if (f.x < 0) f.x += VW; if (f.x > VW) f.x -= VW; });
        parts.forEach(p => { p.vy += 160 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; });
        parts = parts.filter(p => p.life > 0);
        if (banner && (banner.t -= dt) <= 0) banner = null;
        if (!S) return;
        S.kids.forEach(k => {
          if (k.throwT > 0) k.throwT -= dt;
          if (k.down) return;
          let gy = VH; for (let x = k.x - 2; x <= k.x + 2; x++) gy = Math.min(gy, S.h[clamp(x, 0, VW - 1)]);
          if (k.y < gy) k.y = Math.min(gy, k.y + 70 * dt); else k.y = gy;
        });
        if (S.phase === 'aim' && aiStep) aiUpdate(dt);
        if (S.phase === 'fly') {
          const steps = Math.round(dt * SIMSPD / STEP);
          for (const o of balls) {
            if (!o.alive) continue;
            for (let n = 0; n < steps && o.alive; n++) {
              const ev = stepBall(o);
              if (n % 3 === 0) { o.trail.push([o.x, o.y]); if (o.trail.length > 14) o.trail.shift(); }
              S.pups.forEach(p => { if (!p.got && Math.hypot(p.x - o.x, p.y - 6 - o.y) < 9 + o.r) { p.got = true; S.kids[o.owner].item = p.type; banner = { text: PUPS[p.type].name + '!', sub: names()[o.owner] + ' GETS IT FOR NEXT TURN', t: 1.8 }; SND.pop(); splash(p.x, p.y, 10, 50, PUPS[p.type].col); } });
              if (ev) ballEvent(o, ev);
              if (S.hitBy) break;
            }
            if (S.hitBy) { balls.forEach(b2 => { b2.alive = false; }); break; }
          }
          S.pups = S.pups.filter(p => !p.got);
          if (!balls.some(o => o.alive)) afterFlight();
        } else if (S.phase === 'after') {
          if ((afterT -= dt) <= 0) nextTurn();
        } else if (S.phase === 'plop') {
          plop.t += dt;
          if (!plop.landed && plop.t >= 0.75) {
            plop.landed = true; SND.plop();
            const k = S.kids[plop.kid];
            splash(k.x, k.y, 26, 70);
          }
          if (plop.t > 2.6) roundOver();
        } else if (S.phase === 'between') {
          if ((afterT -= dt) <= 0) {
            S.round++; S.starter = 1 - S.starter;
            genRound();
            banner = { text: 'ROUND ' + S.round, sub: `${S.score[0]} - ${S.score[1]}`, t: 1.8 };
          }
        }
      }

      /* ---------- drawing ---------- */
      function drawKid(i) {
        const k = S.kids[i], dir = i ? -1 : 1, spr = SPR[i][i ? 1 : 0];
        if (k.down && plop && plop.kid === i) {
          const t = Math.min(1, plop.t / 0.75);
          if (!plop.landed) {
            // hop up and flip over into the snow
            const x = k.x + dir * -10 * t, y = k.y - 7.5 - Math.sin(t * Math.PI) * 18 + t * 12;
            b.save(); b.translate(Math.round(x), Math.round(y)); b.rotate(dir * -t * Math.PI); b.drawImage(spr, -5, -7.5); b.restore();
          } else drawStuck(i, k.x + dir * -10, k.y);
          return;
        }
        if (k.down) { drawStuck(i, k.x + dir * -10, k.y); return; }
        let by = 0;
        if (plop && plop.kid !== i && plop.landed) by = -Math.abs(Math.sin(plop.t * 9)) * 4;   // cheering hop
        if (S.phase === 'between' && S.lastWinner === i) by = -Math.abs(Math.sin(tt * 9)) * 3;
        const x = Math.round(k.x - 5), y = Math.round(k.y - 15 + by);
        b.drawImage(spr, x, y);
        // throwing arm follows the aim angle
        const T = TEAMS[i], a = (i === S.turn && (S.phase === 'aim' || k.throwT > 0) ? (k.throwT > 0 ? k.ang - 40 : k.ang) : -60) * Math.PI / 180;
        const sx = k.x + dir * 2, sy = k.y - 7 + by;
        for (let n = 1; n <= 4; n++) { b.fillStyle = T.c; b.fillRect(Math.round(sx + Math.cos(a) * n * dir), Math.round(sy - Math.sin(a) * n), 1, 1); }
        const hx = Math.round(sx + Math.cos(a) * 5 * dir), hy = Math.round(sy - Math.sin(a) * 5);
        b.fillStyle = T.m; b.fillRect(hx - 1, hy - 1, 2, 2);
        if (i === S.turn && S.phase === 'aim') { b.fillStyle = '#fff'; b.fillRect(hx - 1 + (dir > 0 ? 1 : -1), hy - 2, 2, 2); }
      }
      function drawStuck(i, x, gy) {
        const T = TEAMS[i];
        x = Math.round(x); gy = Math.round(gy);
        // legs and boots sticking out of a snow drift, hat lying nearby
        b.fillStyle = T.p; b.fillRect(x - 3, gy - 7, 2, 6); b.fillRect(x + 1, gy - 7, 2, 6);
        b.fillStyle = T.b; b.fillRect(x - 4, gy - 9, 3, 2); b.fillRect(x + 1, gy - 9, 3, 2);
        const wig = plop ? Math.round(Math.sin(plop.t * 14)) : Math.round(Math.sin(tt * 4));
        b.fillRect(x - 4 + wig, gy - 10, 2, 1);
        b.fillStyle = '#fff'; b.beginPath(); b.ellipse(x, gy - 1, 7, 3, 0, Math.PI, 0); b.fill();
        b.fillStyle = '#d8e0ff'; b.fillRect(x - 6, gy - 1, 12, 1);
        b.fillStyle = T.h; b.fillRect(x + 7, gy - 2, 4, 2); b.fillStyle = T.H; b.fillRect(x + 7, gy - 1, 5, 1); b.fillStyle = '#fff'; b.fillRect(x + 8, gy - 3, 2, 1);
      }
      function drawPup(p) {
        const y = Math.round(p.y + Math.sin(tt * 2 + p.ph) * 2), x = Math.round(p.x);
        // string and balloon
        b.fillStyle = '#ccc'; for (let n = 0; n < 7; n++) b.fillRect(x + (n % 2), y - 8 + n, 1, 1);
        const bc = p.type === 'giant' ? '#ff5555' : p.type === 'triple' ? '#55ff55' : '#ff55ff';
        b.fillStyle = bc; b.beginPath(); b.ellipse(x, y - 14, 5, 6, 0, 0, 6.3); b.fill();
        b.fillStyle = '#fff'; b.fillRect(x - 3, y - 17, 1, 2);
        // the prize hanging below
        if (p.type === 'giant') { b.fillStyle = '#fff'; b.beginPath(); b.arc(x, y + 3, 4, 0, 6.3); b.fill(); b.fillStyle = '#aabbff'; b.fillRect(x + 1, y + 4, 2, 2); }
        else if (p.type === 'triple') { b.fillStyle = '#fff'; [[-3, 3], [3, 3], [0, -1]].forEach(([dx, dy]) => b.fillRect(x + dx - 1, y + dy, 3, 3)); }
        else { b.fillStyle = '#888'; b.fillRect(x - 4, y - 1, 1, 8); for (let n = 0; n < 4; n++) { b.fillStyle = n % 2 ? '#fff' : '#ff8800'; b.fillRect(x - 3 + n * 2, y + Math.round(Math.sin(tt * 6 + n) * 0.8), 2, 3 - (n > 2 ? 1 : 0)); } }
        if ((tt * 3 + p.ph | 0) % 4 === 0) { b.fillStyle = '#ffff55'; b.fillRect(x + 6, y - 4, 1, 1); b.fillRect(x - 6, y + 2, 1, 1); }
      }
      function drawFlag() {
        const w = S ? S.wind : 0, x = 160, top = 6, n = Math.abs(w);
        b.fillStyle = '#555'; b.fillRect(x, top, 1, 22); b.fillStyle = '#ddd'; b.fillRect(x, top, 1, 1);
        if (n === 0) { b.fillStyle = '#ffff55'; b.fillRect(x + 1, top + 1, 2, 7); b.fillStyle = '#aa0000'; b.fillRect(x + 1, top + 4, 2, 1); return; }
        const len = 4 + n * 1.3, dir = Math.sign(w);
        for (let j = 0; j < len; j++) {
          const wave = Math.round(Math.sin(tt * (4 + n * 0.4) - j * 0.6) * Math.min(1.5, j / 6));
          const sag = Math.max(0, Math.round((12 - n) * j / len / 3));
          b.fillStyle = (j >> 2) % 2 ? '#aa0000' : '#ffff55';
          b.fillRect(x + dir * (j + 1), top + 1 + wave + sag, 1, 6 - Math.floor(j / len * 2));
        }
      }
      function drawAim() {
        if (!S || S.phase !== 'aim' || isCpu(S.turn)) return;
        const k = S.kids[S.turn], dir = S.turn ? -1 : 1, a = k.ang * Math.PI / 180, p = handPos(S.turn, k.ang);
        if (opts.aimLine || drag) {
          const L = 6 + k.pow * 0.32;
          for (let n = 4; n < L; n += 3) { b.fillStyle = n + 3 >= L ? '#ffff55' : (n / 3 | 0) % 2 ? '#ffffff' : '#ffff55'; b.fillRect(Math.round(p.x + Math.cos(a) * n * dir), Math.round(p.y - Math.sin(a) * n), 1, 1); }
        }
        if (guide) { b.fillStyle = '#ff8800'; guide.forEach((q, j) => { if (j % 2 === 0) b.fillRect(Math.round(q[0]), Math.round(q[1]), 1, 1); }); }
      }
      function drawScene() {
        b.drawImage(skyC, 0, 0);
        b.save(); b.translate(0, EX);
        clouds.forEach(c => { c.puffs.forEach(([dx, dy, r]) => { b.fillStyle = SKIES[skyIdx].name === 'night' ? '#3c4870' : '#f0f4ff'; b.beginPath(); b.arc(Math.round(c.x + dx * c.w / 2), Math.round(c.y + dy), r, 0, 6.3); b.fill(); }); });
        if (S) {
          if (terrDirty) drawTerrain();
          b.drawImage(terr, 0, 0);
          S.pups.forEach(drawPup);
          drawAim();
          for (let i = 0; i < 2; i++) drawKid(i);
          // turn marker
          if (S.phase === 'aim') { const k = S.kids[S.turn], y = Math.round(k.y - 26 + Math.sin(tt * 5) * 2); b.fillStyle = '#ffff55'; for (let r = 0; r < 4; r++) b.fillRect(k.x - 3 + r, y + r, 7 - r * 2, 1); }
          balls.forEach(o => {
            o.trail.forEach(([x, y], j) => { if (j % 2) return; b.fillStyle = 'rgba(255,255,255,.45)'; b.fillRect(Math.round(x), Math.round(y), 1, 1); });
            if (!o.alive) return;
            if (o.y < -EX - 2) { b.fillStyle = '#ffff55'; const x = Math.round(clamp(o.x, 2, VW - 3)); b.fillRect(x - 1, 1 - EX, 3, 1); b.fillRect(x, -EX, 1, 3); return; }
            b.fillStyle = '#fff'; b.beginPath(); b.arc(o.x, o.y, o.r, 0, 6.3); b.fill();
            b.fillStyle = '#aabbff'; b.fillRect(Math.round(o.x), Math.round(o.y), Math.max(1, o.r - 1), Math.max(1, o.r - 1));
          });
        }
        parts.forEach(p => { b.fillStyle = p.c; b.fillRect(Math.round(p.x), Math.round(p.y), 1, 1); });
        if (opts.snow) flakes.forEach(f => { b.fillStyle = '#fff'; b.fillRect(Math.round(f.x), Math.round(f.y), f.big ? 2 : 1, f.big ? 2 : 1); });
        b.restore();
        drawFlag();
      }
      function text(t, x, y, size, col, align = 'center', bold = true) {
        g.font = FONT(size, bold); g.textAlign = align; g.textBaseline = 'middle';
        g.fillStyle = '#000'; g.fillText(t, x + 0.7, y + 0.7);
        g.fillStyle = col; g.fillText(t, x, y);
      }
      function drawHud() {
        const nm = names();
        const fs = scale < 1.6 ? 9 : 8;
        text(nm[0], 4, 7, fs, TEAMS[0].ui, 'left');
        text(nm[1], VW - 4, 7, fs, TEAMS[1].ui, 'right');
        for (let i = 0; i < S.need; i++) {
          [0, 1].forEach(p => { const x = p ? VW - 8 - i * 9 : 8 + i * 9; g.fillStyle = '#000'; g.fillRect(x - 3, 13, 7, 7); g.fillStyle = i < S.score[p] ? TEAMS[p].ui : '#334'; g.fillRect(x - 2.5, 13.5, 6, 6); });
        }
        [0, 1].forEach(p => { const it = S.kids[p].item; if (it) text('NEXT: ' + PUPS[it].short, p ? VW - 4 : 4, 26, 7, '#ffff55', p ? 'right' : 'left'); });
        const w = S.wind;
        text(S.calm ? 'CALM (WIND SOCK)' : w === 0 ? 'NO WIND' : (w < 0 ? '<'.repeat(Math.min(3, Math.ceil(-w / 4))) + ' ' : '') + 'WIND ' + Math.abs(w) + (w > 0 ? ' ' + '>'.repeat(Math.min(3, Math.ceil(w / 4))) : ''), VW / 2, 34, 7, '#fff');
        if (banner) {
          const by = (VH + EX) * 0.4;
          text(banner.text, VW / 2, by, 14, '#ffff55');
          if (banner.sub) text(banner.sub, VW / 2, by + 14, 8, '#fff');
        }
        g.save(); g.translate(0, EX);
        text('ROUND ' + S.round, VW / 2, VH - 6, 7, '#dde');
        if (S.phase === 'aim') {
          const k = S.kids[S.turn];
          const lx = clamp(k.x, 30, VW - 30);
          text(`${Math.round(k.ang)}°  ${Math.round(k.pow)}%`, lx, k.y - 34, 7, '#fff');
        }
        if (plop && plop.landed) {
          const k = S.kids[plop.kid], x = clamp(k.x + (plop.kid ? 10 : -10), 34, VW - 34), y = k.y - 26 - Math.min(6, (plop.t - 0.75) * 20);
          const s = 1 + Math.max(0, 0.4 - (plop.t - 0.75)) * 1.5;
          g.save(); g.translate(x, y); g.scale(s, s);
          g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.lineWidth = 1;
          g.beginPath(); g.ellipse(0, 0, 22, 9, 0, 0, 6.3); g.fill(); g.stroke();
          g.beginPath(); g.moveTo(-4, 8); g.lineTo(0, 15); g.lineTo(4, 8); g.closePath(); g.fill();
          g.font = 'italic 900 12px Impact, "Arial Black", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
          g.fillStyle = '#aa0000'; g.fillText('PLOP!', 0, 0.5);
          g.restore();
        }
        g.restore();
        if (paused) { g.fillStyle = 'rgba(0,0,20,.6)'; g.fillRect(0, 0, VW, VH + EX); text('PAUSED', VW / 2, (VH + EX) * 0.45, 16, '#ffff55'); text('CLICK OR PRESS A KEY', VW / 2, (VH + EX) * 0.45 + 15, 8, '#fff'); }
      }
      function draw() {
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.imageSmoothingEnabled = false;
        if (!S && attract) { S = attract; try { drawScene(); } finally { S = null; } }   // title backdrop
        else drawScene();
        g.drawImage(buf, 0, 0, cv.width, cv.height);
        g.setTransform(cv.width / VW, 0, 0, cv.height / (VH + EX), 0, 0);
        if (S) drawHud();
      }
      function frame(now) {
        if (closed) return;
        raf = requestAnimationFrame(frame);
        const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
        if (!paused) update(dt);
        draw();
      }
      function fit() {
        const cw = Math.max(100, wrap.clientWidth), ch = Math.max(80, wrap.clientHeight);
        const ex = Math.round(clamp(VW * ch / cw - VH, 0, 220));
        if (ex !== EX) { EX = ex; buf.height = VH + EX; makeSky(); makeClouds(); }
        scale = Math.min(cw / VW, ch / (VH + EX));
        const dpr = window.devicePixelRatio || 1;
        cv.style.width = Math.floor(VW * scale) + 'px'; cv.style.height = Math.floor((VH + EX) * scale) + 'px';
        cv.width = Math.max(1, Math.round(VW * scale * dpr)); cv.height = Math.max(1, Math.round((VH + EX) * scale * dpr));
      }

      /* ---------- title / setup ---------- */
      function title() {
        balls = []; parts = []; banner = null; plop = null; aiStep = null;
        // a pretend field for the backdrop
        S = { mode: 'cpu', diff: 'normal', need: 2, score: [0, 0], round: 1, starter: 0 }; genRound(true); attract = S; S = null;
        skyIdx = attract.sky; makeSky(); makeClouds(); terrDirty = true;
        const saved = api.load('match', null);
        const seg = (key, vals) => `<div class="snb-seg" data-k="${key}">${vals.map(([v, l]) => `<button class="btn${String(opts[key]) === String(v) ? ' on' : ''}" data-v="${v}">${l}</button>`).join('')}</div>`;
        ov.innerHTML = `<div class="snb-box raised">
          <h2>SNOWBALL<br>SHOWDOWN</h2>
          <div class="snb-sub">Lob it over the hill!</div>
          <div class="snb-lab">Players</div>${seg('mode', [['cpu', '1 Player vs Computer'], ['two', '2 Players']])}
          <div class="snb-lab snb-dl">Computer skill</div>${seg('diff', [['easy', 'Easy'], ['normal', 'Normal'], ['hard', 'Hard']])}
          <div class="snb-lab">Match</div>${seg('bestOf', [[3, 'Best of 3'], [5, 'Best of 5']])}
          <div class="snb-row"><button class="btn" data-o="go"><b>Start!</b></button>${saved ? '<button class="btn" data-o="cont">Continue match</button>' : ''}<button class="btn" data-o="how">How to play</button></div>
          <div class="snb-rec">Your record vs computer: ${['easy', 'normal', 'hard'].map(d => `${d} ${stats[d].w}-${stats[d].l}`).join(', ')}</div>
        </div>`;
        ov.hidden = false;
        const upd = () => { ov.querySelectorAll('.snb-seg').forEach(sg2 => sg2.querySelectorAll('.btn').forEach(bt => bt.classList.toggle('on', String(opts[sg2.dataset.k]) === bt.dataset.v))); ov.querySelector('[data-k=diff]').style.opacity = opts.mode === 'cpu' ? '' : '.45'; };
        ov.querySelectorAll('.snb-seg').forEach(sg2 => sg2.addEventListener('click', e => {
          const bt = e.target.closest('[data-v]'); if (!bt) return;
          const k = sg2.dataset.k; opts[k] = k === 'bestOf' ? +bt.dataset.v : bt.dataset.v;
          if (k === 'diff') opts.mode = 'cpu';
          saveOpts(); upd(); api.sfx.click();
        }));
        ov.querySelector('[data-o=go]').onclick = () => { api.sfx.click(); startMatch(); };
        const cb = ov.querySelector('[data-o=cont]'); if (cb) cb.onclick = () => { api.sfx.click(); resumeMatch(); };
        ov.querySelector('[data-o=how]').onclick = howTo;
        upd();
        msg('Choose your game and press Start!');
        syncPanel();
      }
      let attract = null;

      /* ---------- input ---------- */
      const toW = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * VW, y: (e.clientY - r.top) / r.height * (VH + EX) - EX }; };
      function aimFrom(p) {
        const k = S.kids[S.turn], dir = S.turn ? -1 : 1;
        const dx = (p.x - k.x) * dir, dy = (k.y - 9) - p.y;
        const ang = clamp(Math.round(Math.atan2(Math.max(0, dy), dx) * 180 / Math.PI), 0, 90);
        const pow = clamp(Math.round(Math.hypot(dx, dy) / 150 * 100), 1, 100);
        k.ang = dx < 0 && dy <= 0 ? k.ang : ang; k.pow = pow;
        syncPanel();
        if (guide) makeGuide();
      }
      cv.addEventListener('pointerdown', e => {
        e.preventDefault();
        if (!humanAim()) return;
        aIn.blur(); pIn.blur();
        drag = { id: e.pointerId, moved: 0, x0: e.clientX, y0: e.clientY };
        try { cv.setPointerCapture(e.pointerId); } catch (err) {}
        aimFrom(toW(e));
      });
      cv.addEventListener('pointermove', e => {
        if (!drag || drag.id !== e.pointerId || !humanAim()) return;
        drag.moved = Math.max(drag.moved, Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0));
        aimFrom(toW(e));
      });
      const endDrag = e => {
        if (!drag || drag.id !== e.pointerId) return;
        const d = drag; drag = null;
        if (e.type === 'pointerup' && humanAim()) { aimFrom(toW(e)); if (d.moved > 6 || e.pointerType === 'mouse') throwNow(); }
      };
      cv.addEventListener('pointerup', endDrag); cv.addEventListener('pointercancel', endDrag);
      cv.addEventListener('lostpointercapture', () => { drag = null; });

      W.onKey = e => {
        if (paused) { paused = false; e.preventDefault(); return; }
        const inInput = e.target === aIn || e.target === pIn;
        if (!ov.hidden) { if (e.key === 'Enter' && e.target.tagName !== 'BUTTON' && !S) { e.preventDefault(); startMatch(); } return; }
        if (!humanAim()) return;
        const big = e.shiftKey ? 5 : 1;
        if (e.key === 'Enter' || (e.key === ' ' && !inInput)) { e.preventDefault(); readInputs(); throwNow(); return; }
        if (inInput && e.key === 'Tab') return;
        if (e.key === 'ArrowUp') { e.preventDefault(); nudge('a', big); }
        else if (e.key === 'ArrowDown') { e.preventDefault(); nudge('a', -big); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); nudge('p', big); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); nudge('p', -big); }
        else if (!inInput && /^\d$/.test(e.key)) { aIn.focus(); aIn.value = ''; }
      };
      W.onMin = () => { paused = true; clearInterval(rep); drag = null; };
      W.body.addEventListener('pointerdown', () => { paused = false; }, true);
      W.onResize = fit;
      W.onClose = () => { closed = true; cancelAnimationFrame(raf); clearInterval(rep); saveMatch(); };
      fit();
      title();
      requestAnimationFrame(t => { last = t; fit(); frame(t); });
    }
  });
})();
