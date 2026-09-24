/* SkyBlast: a vertical-scrolling space shooter. The full version of the shareware SKYBLAST.ZIP on the 1990 web. */
(function () {
  const VW = 200;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pickA = a => a[Math.floor(Math.random() * a.length)];
  function sprite(rows, pal, solid) {
    const h = rows.length, w = Math.max(...rows.map(r => r.length));
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d');
    rows.forEach((r, y) => [...r].forEach((ch, x) => { if (pal[ch]) { g.fillStyle = solid || pal[ch]; g.fillRect(x, y, 1, 1); } }));
    return c;
  }
  const SHIP = ['.......w.......', '......wcw......', '......wcw......', '.....wcCcw.....', '.....wCbCw.....', '....wwCbCww....', 'r...wwCCCww...r', 'r..wwwwwwwww..r', 'w.wwgwwwwwgww.w', 'wwwggwwwwwggwww', 'wwgggww.wwgggww', '.w.ggw...wgg.w.', '...oo.....oo...'];
  const SHIP_PAL = { w: '#d0d8e8', c: '#4080ff', C: '#2050c0', b: '#a0e8ff', g: '#707888', r: '#ff4040', o: '#ff8000' };
  const EN = {
    saucer: { rows: ['....mmmm....', '...mwwwwm...', '..mmmmmmmm..', '.cccccccccc.', 'cCyCCyCCyCCc', '.cccccccccc.', '..c......c..'], pal: { m: '#9090ff', w: '#e0e0ff', c: '#00a0a8', C: '#40f0f0', y: '#ffff40' }, hp: 1, pts: 100, col: '#40f0f0' },
    dart: { rows: ['r..........r', 'rr........rr', '.rrR....Rrr.', '.rRRRrrRRRr.', '..rRRyyRRr..', '...rRyyRr...', '....rRRr....', '.....rr.....'], pal: { r: '#a01010', R: '#ff4030', y: '#ffd000' }, hp: 1, pts: 150, col: '#ff6040' },
    orb: { rows: ['...pppppp...', '..pPPPPPPp..', '.pPPwwwwPPp.', 'pPPwwkkwwPPp', 'pPPwkkkkwPPp', 'pPPwkkkkwPPp', 'pPPwwkkwwPPp', '.pPPwwwwPPp.', '..pPPPPPPp..', '...pppppp...'], pal: { p: '#600080', P: '#c040ff', w: '#ffe0ff', k: '#ff2060' }, hp: 2, pts: 200, col: '#d060ff' }
  };
  const PUPS = { S: { name: 'SPREAD SHOT', col: '#ffe040', w: 3 }, R: { name: 'RAPID FIRE', col: '#ff8020', w: 3 }, H: { name: 'SHIELD', col: '#40f0ff', w: 2 }, B: { name: 'SMART BOMB', col: '#ff40ff', w: 1 } };
  const DEFAULT_HI = [['ACE', 30000], ['ZAP', 25000], ['NOV', 20000], ['JET', 15000], ['SKY', 10000], ['ROX', 7500], ['KID', 5000], ['BIT', 2500]].map(([i, s]) => ({ i, s, w: 0 }));
  const FONT = (n, b) => `${b ? 'bold ' : ''}${n}px "Courier New", Courier, monospace`;
  let SPR = null;
  function sprites() {
    if (SPR) return SPR;
    SPR = { ship: sprite(SHIP, SHIP_PAL), shipW: sprite(SHIP, SHIP_PAL, '#fff') };
    Object.entries(EN).forEach(([k, d]) => { SPR[k] = sprite(d.rows, d.pal); SPR[k + 'W'] = sprite(d.rows, d.pal, '#fff'); });
    SPR.boss = ['#ff3040', '#40ff80', '#ffd020'].map(t => bossSprite(t));
    SPR.bossW = bossSprite('#fff', '#fff');
    return SPR;
  }
  function bossSprite(tint, all) {
    const c = document.createElement('canvas'); c.width = 56; c.height = 30;
    const g = c.getContext('2d');
    const R = (x, y, w, h, col) => { g.fillStyle = all || col; g.fillRect(x, y, w, h); };
    R(0, 12, 56, 5, '#4a5060'); R(4, 9, 48, 10, '#707888'); R(10, 5, 36, 16, '#8a92a4'); R(18, 1, 20, 6, '#a0a8b8');
    R(20, 20, 16, 6, '#4a5060'); R(5, 16, 4, 11, '#303038'); R(47, 16, 4, 11, '#303038'); R(26, 24, 4, 6, '#303038');
    R(2, 13, 12, 2, tint); R(42, 13, 12, 2, tint); R(22, 9, 12, 8, '#202028'); R(24, 10, 8, 6, tint); R(26, 11, 4, 2, all || '#fff');
    for (let i = 0; i < 5; i++) { R(12 + i * 8, 7, 2, 2, '#ffff60'); }
    R(18, 1, 20, 1, '#c8d0e0'); R(10, 5, 36, 1, '#b0b8c8');
    return c;
  }

  (window.RETRO_APPS = window.RETRO_APPS || []).push({
    id: 'skyblast',
    label: 'SkyBlast',
    kind: 'store', cat: 'game', year: 1990, price: 14.95,
    publisher: 'Nebula Softworks',
    genre: 'Arcade / Shooter',
    tagline: 'The full version of the shareware hit!',
    blurb: 'You played the shareware. Now blast through endless waves of alien saucers, darts and orbs that swoop down in formation. Grab spread shot, rapid fire and shield power-ups, save your smart bombs for emergencies, and face a giant mothership every fifth wave. Registered version with all levels and a saved high-score table.',
    sizeKB: 1200,
    box: { bg: '#050520', fg: '#55ffff', accent: '#ff3060' },
    icon: `<svg viewBox="0 0 32 32" shape-rendering="crispEdges" aria-hidden="true"><rect x="1" y="1" width="30" height="30" fill="#050520" stroke="#000"/><g fill="#fff"><rect x="4" y="5" width="1" height="1"/><rect x="25" y="3" width="1" height="1"/><rect x="20" y="9" width="1" height="1"/><rect x="7" y="14" width="1" height="1"/><rect x="27" y="17" width="1" height="1"/></g><rect x="15" y="4" width="2" height="6" fill="#ffe040"/><rect x="9" y="3" width="1" height="4" fill="#ffe040"/><rect x="22" y="3" width="1" height="4" fill="#ffe040"/><g transform="translate(5 11) scale(1.5)">${SHIP.map((r, y) => [...r].map((ch, x) => SHIP_PAL[ch] ? `<rect x="${x}" y="${y}" width="1" height="1" fill="${SHIP_PAL[ch]}"/>` : '').join('')).join('')}</g></svg>`,
    window: { w: 420, h: 580 },
    css: `
      .skb{height:100%;display:flex;flex-direction:column;background:#000;user-select:none;-webkit-user-select:none}
      .skb-wrap{flex:1;min-height:0;position:relative;display:flex;align-items:center;justify-content:center;overflow:hidden}
      .skb-wrap canvas{display:block;touch-action:none;cursor:crosshair;image-rendering:pixelated}
      .skb-bar{display:flex;gap:6px;align-items:center;padding:3px;background:#c0c0c0}
      .skb-bar .btn{min-width:0;padding:4px 12px;touch-action:manipulation}
      .skb-msg{flex:1;text-align:center;font-size:11px;color:#000;min-width:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
      .skb-ini{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.55)}
      .skb-ini[hidden]{display:none}
      .skb-ibox{padding:10px 16px;text-align:center;display:flex;flex-direction:column;gap:8px;color:#000}
      .skb-ibox h3{margin:0;font:400 28px/1 var(--dos);color:#800000}
      .skb-slots{display:flex;gap:8px;justify-content:center}
      .skb-slot{display:flex;flex-direction:column;gap:3px;align-items:center}
      .skb-slot b{font:400 36px/1 var(--dos);background:#000;color:#0ff;width:40px;padding:3px 0;cursor:pointer}
      .skb-slot b.on{color:#ff0;outline:2px solid #ff0}
      .skb-slot .btn{min-width:40px;padding:3px 0;touch-action:manipulation}
    `,
    open(W, api) {
      const SP = sprites();
      W.body.innerHTML = `<div class="skb"><div class="skb-wrap"><canvas aria-label="SkyBlast game screen"></canvas><div class="skb-ini" hidden></div></div><div class="skb-bar"><button class="btn" data-a="pause">Pause</button><span class="skb-msg"></span><button class="btn" data-a="bomb">Bomb</button></div></div>`;
      const wrap = W.body.querySelector('.skb-wrap'), cv = W.body.querySelector('canvas'), g = cv.getContext('2d');
      const iniEl = W.body.querySelector('.skb-ini'), msgEl = W.body.querySelector('.skb-msg'), pauseB = W.body.querySelector('[data-a=pause]');
      let opts = Object.assign({ sound: true }, api.load('opts', {}));
      let hi = api.load('hi', null) || DEFAULT_HI.slice();
      let closed = false, VH = 360, ppx = 1, mode = 'title', paused = false, S = null, raf = 0, last = 0, drag = null, overT = 0, lastRank = -1, iniKey = null, tt = 0;
      const keys = {};
      const snd = fn => { if (opts.sound) try { fn(); } catch (e) {} };
      const SND = {
        shot: () => snd(() => api.tone(1400, 0.05, { to: 500, vol: 0.02, decay: 1 })),
        hit: () => snd(() => api.noise(0.04, { f: 3000, q: 2, vol: 0.06, decay: 1 })),
        boom: () => snd(() => { api.noise(0.25, { ft: 'lowpass', f: 900, vol: 0.12, decay: 1 }); api.tone(160, 0.2, { to: 50, vol: 0.05, decay: 1 }); }),
        big: () => snd(() => { api.noise(0.8, { ft: 'lowpass', f: 600, vol: 0.12, decay: 1 }); api.tone(120, 0.7, { to: 30, type: 'sawtooth', vol: 0.06, decay: 1 }); }),
        pup: () => snd(() => [0, 4, 7, 12].forEach((n, i) => api.tone(api.midi(72 + n), 0.07, { vol: 0.05, at: i * 0.06 }))),
        dive: () => snd(() => api.tone(1200, 0.5, { to: 300, type: 'triangle', vol: 0.025 })),
        bomb: () => snd(() => { api.noise(1.2, { ft: 'lowpass', f: 1200, vol: 0.12, decay: 1 }); api.tone(80, 1, { to: 1600, type: 'sawtooth', vol: 0.03, decay: 1 }); }),
        shield: () => snd(() => api.tone(600, 0.3, { to: 1800, type: 'sine', vol: 0.06 })),
        life: () => snd(() => [0, 7, 12, 16, 19, 24].forEach((n, i) => api.tone(api.midi(67 + n), 0.09, { vol: 0.05, at: i * 0.07 }))),
        warn: () => snd(() => { for (let i = 0; i < 4; i++) api.tone(i % 2 ? 440 : 330, 0.25, { type: 'square', vol: 0.04, at: i * 0.3 }); })
      };

      api.menubar([
        { label: 'Game', items: () => [
          { label: 'New game', fn: newGame },
          { label: paused ? 'Resume' : 'Pause', fn: togglePause, disabled: mode !== 'play' },
          { label: 'High scores', fn: () => { if (mode === 'play') api.msgBox('SkyBlast', 'High scores:\n' + hi.map((h, i) => `${i + 1}. ${h.i}   ${h.s}`).join('\n')); else toTitle(); } },
          '-', { label: 'Exit', fn: () => api.close() }
        ] },
        { label: 'Options', items: () => [
          { label: (opts.sound ? '[x] ' : '[ ] ') + 'Sound effects', fn: () => { opts.sound = !opts.sound; api.save('opts', opts); } },
          { label: 'Reset high scores', fn: () => api.msgBox('SkyBlast', 'Reset the high-score table?', ['Yes', 'No'], 'warn').then(b => { if (b === 'Yes') { hi = DEFAULT_HI.slice(); api.save('hi', hi); lastRank = -1; } }) }
        ] },
        { label: 'Help', items: [
          { label: 'How to play', fn: () => api.msgBox('How to play', 'Keyboard: arrow keys or W A S D to fly, hold Space (or Z) to fire, B or X for a smart bomb, P to pause.\n\nMouse or touch: press on the screen and drag. Your ship follows your finger (it stays a little above it so you can see) and fires automatically while you hold on.\n\nPower-ups: S spread shot, R rapid fire, H shield, B extra smart bomb.\nA smart bomb destroys every enemy on screen and hurts the mothership.\nA mothership attacks every fifth wave. Extra ship every 50,000 points.\n\nAt game over you earn $1 for every 20,000 points (up to $6).') },
          { label: 'About SkyBlast', fn: () => api.msgBox('About SkyBlast', 'SkyBlast 1.0 Registered Version\nNebula Softworks, 1990\n\nThank you for registering!') }
        ] }
      ]);

      /* ---- sizing ---- */
      let stars = [];
      function makeStars() { stars = [[], [], []]; [28, 22, 14].forEach((n, l) => { for (let i = 0; i < n; i++) stars[l].push({ x: Math.random() * VW, y: Math.random() * 480 }); }); }
      makeStars();
      function fit() {
        const cw = Math.max(120, wrap.clientWidth), ch = Math.max(120, wrap.clientHeight);
        VH = Math.round(clamp(VW * ch / cw, 240, 400));
        const sc = Math.min(cw / VW, ch / VH), dpr = window.devicePixelRatio || 1;
        cv.style.width = Math.floor(VW * sc) + 'px'; cv.style.height = Math.floor(VH * sc) + 'px';
        cv.width = Math.max(1, Math.round(VW * sc * dpr)); cv.height = Math.max(1, Math.round(VH * sc * dpr));
        ppx = cv.width / VW;
        if (S) S.y = Math.min(S.y, VH - 12);
      }

      /* ---- game ---- */
      function newGame() {
        iniEl.hidden = true; iniKey = null;
        S = { score: 0, lives: 3, bombs: 2, wave: 0, x: VW / 2, y: VH - 30, tx: null, ty: null, inv: 1.5, spread: 0, rapid: 0, shield: 0, fireT: 0, pb: [], eb: [], en: [], parts: [], pups: [], boss: null, bossDie: null, t: 0, waveT: null, banner: null, dead: 0, flash: 0, shake: 0, nextLife: 50000, diveT: 3, touch: false, minionT: 4 };
        mode = 'play'; paused = false; lastRank = -1;
        msg(matchMedia('(pointer:coarse)').matches ? 'Drag to fly. Hold to fire.' : 'Arrows move, Space fires, B bombs.');
      }
      const msg = t => { msgEl.textContent = t; };
      function toTitle() { mode = 'title'; S = null; paused = false; iniEl.hidden = true; iniKey = null; msg('Press Space or tap to start'); }
      function togglePause() {
        if (mode !== 'play') return;
        paused = !paused; clearKeys();
        pauseB.textContent = paused ? 'Resume' : 'Pause';
      }
      function banner(text, sub, t = 2) { S.banner = { text, sub, t }; }
      function startWave() {
        S.wave++;
        if (S.wave % 5 === 0) spawnBoss(); else { spawnFormation(); banner('WAVE ' + S.wave, S.wave === 1 ? 'GET READY!' : ''); }
      }
      function spawnFormation() {
        const w = S.wave;
        const rows = Math.min(2 + Math.floor((w - 1) / 2), 4), cols = Math.min(5 + Math.floor(w / 2), 8);
        const sp = 22, x0 = (VW - (cols - 1) * sp) / 2;
        const types = w < 3 ? ['dart', 'saucer', 'saucer', 'saucer'] : ['orb', 'dart', 'saucer', w >= 7 ? 'dart' : 'saucer'];
        for (let r = 0; r < rows; r++) {
          const side = r % 2 ? 1 : -1;
          for (let c = 0; c < cols; c++) {
            const type = types[r];
            S.en.push({ type, hp: EN[type].hp + (w >= 9 ? 1 : 0), sx: x0 + c * sp, sy: 36 + r * 20, state: 'wait', delay: r * 1.0 + c * 0.13, dur: 1.6, t: 0, x: -99, y: -99, hit: 0, anim: Math.random() * 6,
              p0: [side < 0 ? -16 : VW + 16, rnd(20, 70)], p1: [VW / 2 - side * 30, VH * 0.7], p2: [VW / 2 + side * 70, VH * 0.35] });
          }
        }
        S.diveT = 3;
      }
      function spawnBoss() {
        const n = S.wave / 5;
        S.boss = { n, x: VW / 2, y: -34, hp: 80 + n * 50, max: 80 + n * 50, t: 0, atk: 1.2, pat: 0, hit: 0, enter: true, spr: SP.boss[(n - 1) % 3] };
        banner('WARNING!', 'MOTHERSHIP APPROACHING', 2.5);
        SND.warn();
        S.minionT = 5;
      }
      const bez = (a, b, c, d, t) => { const u = 1 - t; return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d; };
      function shootAt(x, y, spd, spread = 0.18) {
        if (S.eb.length > 60) return;
        const a = Math.atan2(S.y - y, S.x - x) + rnd(-spread, spread);
        S.eb.push({ x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd });
      }
      const ebSpeed = () => Math.min(140, 80 + S.wave * 4);
      function explode(x, y, col, n = 12, sp = 60) {
        for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, v = rnd(10, sp); S.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rnd(0.3, 0.8), c: Math.random() < 0.3 ? '#fff' : col }); }
        S.parts.push({ ring: 1, x, y, r: 2, life: 0.25 });
      }
      function addScore(n) {
        S.score += n;
        if (S.score >= S.nextLife) { S.nextLife += 50000; if (S.lives < 6) { S.lives++; banner('EXTRA SHIP!', '', 1.5); SND.life(); } }
      }
      function kill(e, byBomb) {
        const d = EN[e.type];
        addScore(d.pts * (e.state === 'dive' ? 2 : 1));
        explode(e.x, e.y, d.col);
        S.en.splice(S.en.indexOf(e), 1);
        if (Math.random() < (byBomb ? 0.03 : 0.08)) dropPup(e.x, e.y);
        if (!byBomb) SND.boom();
        if (!S.en.length && !S.boss && S.wave % 5 !== 0) addScore(250 * S.wave);
      }
      function dropPup(x, y, type) {
        if (!type) { const bag = []; Object.entries(PUPS).forEach(([k, p]) => { for (let i = 0; i < p.w; i++) bag.push(k); }); type = pickA(bag); }
        S.pups.push({ x, y, type, t: 0 });
      }
      function fire() {
        const y = S.y - 8;
        if (S.spread > 0) [-70, 0, 70].forEach(vx => S.pb.push({ x: S.x, y, vx, vy: -260 }));
        else S.pb.push({ x: S.x, y, vx: 0, vy: -270 });
        if (S.rapid <= 0 || (S.t * 10 | 0) % 2) SND.shot();
      }
      function bomb() {
        if (mode !== 'play' || paused || !S || S.dead > 0 || S.bombs <= 0) return;
        S.bombs--; S.flash = 0.4; S.shake = 0.35; S.eb = [];
        S.en.filter(e => e.state !== 'wait').forEach(e => kill(e, true));
        if (S.boss && !S.boss.enter) { S.boss.hp -= Math.ceil(S.boss.max * 0.08); S.boss.hit = 0.2; }
        SND.bomb();
      }
      function playerHit() {
        if (S.dead > 0 || S.inv > 0) return;
        if (S.shield > 0) { S.shield = 0; S.inv = 1.2; SND.shield(); S.parts.push({ ring: 1, x: S.x, y: S.y, r: 6, life: 0.3 }); return; }
        explode(S.x, S.y, '#ffa040', 30, 90); explode(S.x, S.y, '#fff', 10, 40);
        SND.big();
        S.dead = 2; S.lives--; S.spread = 0; S.rapid = 0; S.shake = 0.5; S.eb = []; S.tx = null;
      }
      function update(dt) {
        S.t += dt;
        const playing = mode === 'play';
        // player
        if (S.dead > 0) {
          S.dead -= dt;
          if (S.dead <= 0 && playing) {
            if (S.lives <= 0) { gameOver(); }
            else { S.x = VW / 2; S.y = VH - 30; S.inv = 2.5; S.tx = null; if (drag) { drag = null; S.touch = false; } }
          }
        } else if (playing) {
          const mx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0), my = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
          if (mx || my) { S.x += mx * 140 * dt; S.y += my * 140 * dt; }
          if (S.tx != null) {
            const dx = S.tx - S.x, dy = S.ty - S.y, d = Math.hypot(dx, dy), m = 420 * dt;
            if (d <= m) { S.x = S.tx; S.y = S.ty; } else { S.x += dx / d * m; S.y += dy / d * m; }
          }
          S.x = clamp(S.x, 8, VW - 8); S.y = clamp(S.y, 30, VH - 10);
          S.fireT -= dt;
          if ((keys.fire || S.touch) && S.fireT <= 0) { fire(); S.fireT = S.rapid > 0 ? 0.09 : 0.2; }
        }
        ['inv', 'spread', 'rapid', 'shield', 'flash', 'shake'].forEach(k => { if (S[k] > 0) S[k] = Math.max(0, S[k] - dt); });
        if (S.banner && (S.banner.t -= dt) <= 0) S.banner = null;
        // bullets
        S.pb.forEach(b => { b.x += b.vx * dt; b.y += b.vy * dt; });
        S.pb = S.pb.filter(b => b.y > -8 && b.x > -8 && b.x < VW + 8 && !b.dead);
        S.eb.forEach(b => { b.x += b.vx * dt; b.y += b.vy * dt; });
        S.eb = S.eb.filter(b => b.y < VH + 8 && b.y > -12 && b.x > -8 && b.x < VW + 8);
        // enemies
        const fx = Math.sin(S.t * 0.9) * 16, alive = S.dead <= 0 && playing;
        const fireRate = 0.02 + S.wave * 0.006;
        for (const e of S.en.slice()) {
          e.anim += dt; if (e.hit > 0) e.hit -= dt;
          if (e.state === 'wait') { e.delay -= dt; if (e.delay <= 0) { e.state = 'enter'; e.t = 0; } continue; }
          if (e.state === 'enter') {
            e.t = Math.min(1, e.t + dt / e.dur);
            const tx = e.sx + fx, ty = e.sy;
            e.x = bez(e.p0[0], e.p1[0], e.p2[0], tx, e.t); e.y = bez(e.p0[1], e.p1[1], e.p2[1], ty, e.t);
            if (e.t >= 1) e.state = 'form';
          } else if (e.state === 'form') {
            e.x = e.sx + fx; e.y = e.sy + Math.sin(S.t * 2 + e.sx * 0.1) * 2;
            if (alive && Math.random() < dt * fireRate * (e.type === 'orb' ? 2.5 : 1)) shootAt(e.x, e.y + 4, ebSpeed());
          } else if (e.state === 'dive') {
            e.t += dt; e.y += e.vy * dt;
            e.x = e.x0 + (e.tx - e.x0) * Math.min(1, e.t * 0.8) + Math.sin(e.t * 4) * e.amp;
            if (alive && e.shots > 0 && e.y > e.shotY && e.y < VH * 0.7) { shootAt(e.x, e.y + 4, ebSpeed() + 10); e.shots--; e.shotY += 40; }
            if (e.y > VH + 12) {
              if (e.minion) { S.en.splice(S.en.indexOf(e), 1); continue; }
              e.state = 'return'; e.y = -12; e.x = e.sx + fx;
            }
          } else if (e.state === 'return') {
            const tx = e.sx + fx, ty = e.sy, dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy), m = 110 * dt;
            if (d <= m + 1) e.state = 'form'; else { e.x += dx / d * m; e.y += dy / d * m; }
          }
        }
        // dive attacks
        if (!S.boss && playing) {
          S.diveT -= dt;
          if (S.diveT <= 0) {
            S.diveT = Math.max(0.6, 2.4 - S.wave * 0.15) * rnd(0.7, 1.3);
            const divers = S.en.filter(e => e.state === 'dive').length, form = S.en.filter(e => e.state === 'form');
            if (form.length && divers < Math.min(5, 1 + Math.floor(S.wave / 2))) {
              const e = pickA(form);
              Object.assign(e, { state: 'dive', t: 0, x0: e.x, tx: S.x, vy: Math.min(170, 90 + S.wave * 6), amp: rnd(10, 30) * (Math.random() < 0.5 ? -1 : 1), shots: S.wave >= 3 ? 2 : 1, shotY: e.y + 30 });
              SND.dive();
            }
          }
        }
        // boss
        const B = S.boss;
        if (B) {
          B.t += dt; if (B.hit > 0) B.hit -= dt;
          if (B.enter) { B.y += 32 * dt; if (B.y >= 54) B.enter = false; }
          else {
            B.x = VW / 2 + Math.sin(B.t * 0.6) * (VW / 2 - 34); B.y = 54 + Math.sin(B.t * 1.3) * 8;
            B.atk -= dt;
            if (B.atk <= 0 && alive) {
              const p = B.pat++ % 3, spd = 70 + B.n * 6;
              if (p === 0) { const n = Math.min(11, 5 + B.n * 2); for (let i = 0; i < n; i++) { const a = Math.PI / 2 + (i - (n - 1) / 2) * (1.8 / (n - 1)); S.eb.push({ x: B.x, y: B.y + 12, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd }); } }
              else if (p === 1) { [-21, 21].forEach(o => { for (let i = 0; i < 2 + Math.min(2, B.n); i++) shootAt(B.x + o, B.y + 14, 110 + i * 14, 0.05); }); }
              else { const n = 12, off = Math.random(); for (let i = 0; i < n; i++) { const a = (i + off) / n * Math.PI * 2; S.eb.push({ x: B.x, y: B.y, vx: Math.cos(a) * spd * 0.8, vy: Math.sin(a) * spd * 0.8 + 20 }); } }
              B.atk = Math.max(0.7, 1.6 - B.n * 0.15);
              snd(() => api.tone(220, 0.12, { to: 110, type: 'sawtooth', vol: 0.03 }));
            }
            S.minionT -= dt;
            if (S.minionT <= 0 && alive) {
              S.minionT = Math.max(2.5, 6 - B.n);
              [-1, 1].forEach(s => { const x = clamp(S.x + s * 40, 10, VW - 10); S.en.push({ type: 'dart', hp: 1, minion: true, sx: x, sy: -12, x, y: -12, state: 'dive', t: 0, x0: x, tx: S.x, vy: 120, amp: 14 * s, shots: 1, shotY: 20, hit: 0, anim: 0 }); });
            }
          }
          if (B.hp <= 0) {
            addScore(5000 * B.n);
            S.bossDie = { x: B.x, y: B.y, t: 1.6, n: 0 };
            S.boss = null; S.eb = [];
            SND.big(); S.shake = 0.8;
            dropPup(B.x - 12, B.y, 'S'); dropPup(B.x + 12, B.y);
            banner('MOTHERSHIP DESTROYED!', '+' + (5000 * B.n) + ' POINTS', 2.5);
          }
        }
        if (S.bossDie) {
          const d = S.bossDie; d.t -= dt; d.n += dt;
          if (d.n > 0.1) { d.n = 0; explode(d.x + rnd(-24, 24), d.y + rnd(-12, 12), pickA(['#ff8040', '#ffe040', '#fff']), 10, 70); SND.boom(); }
          if (d.t <= 0) S.bossDie = null;
        }
        // collisions: player bullets
        for (const b of S.pb) {
          if (B && !B.enter && S.boss && Math.abs(b.x - B.x) < 26 && Math.abs(b.y - B.y) < 13) { b.dead = true; B.hp--; B.hit = 0.05; if (Math.random() < 0.3) SND.hit(); continue; }
          for (const e of S.en) {
            if (e.state === 'wait') continue;
            if (Math.abs(b.x - e.x) < 7 && Math.abs(b.y - e.y) < 6) {
              b.dead = true; e.hp--; e.hit = 0.08;
              if (e.hp <= 0) kill(e); else SND.hit();
              break;
            }
          }
        }
        S.pb = S.pb.filter(b => !b.dead);
        if (alive) {
          for (const b of S.eb) if (Math.abs(b.x - S.x) < 4 && Math.abs(b.y - S.y) < 5) { b.y = VH + 99; playerHit(); break; }
          for (const e of S.en.slice()) if (e.state !== 'wait' && Math.abs(e.x - S.x) < 10 && Math.abs(e.y - S.y) < 8) { if (S.inv <= 0) { playerHit(); kill(e); } break; }
          if (S.boss && !S.boss.enter && Math.abs(S.boss.x - S.x) < 30 && Math.abs(S.boss.y - S.y) < 16) playerHit();
        }
        // power-ups
        for (const p of S.pups) {
          p.t += dt; p.y += 35 * dt; p.x += Math.sin(p.t * 3) * 12 * dt;
          if (alive && Math.abs(p.x - S.x) < 12 && Math.abs(p.y - S.y) < 12) {
            p.got = true; addScore(500); SND.pup();
            if (p.type === 'S') S.spread = 15; else if (p.type === 'R') S.rapid = 15; else if (p.type === 'H') S.shield = 12; else S.bombs = Math.min(5, S.bombs + 1);
            banner(PUPS[p.type].name, '', 1.2);
          }
        }
        S.pups = S.pups.filter(p => !p.got && p.y < VH + 10);
        // particles
        S.parts.forEach(p => { p.life -= dt; if (p.ring) p.r += 90 * dt; else { p.x += p.vx * dt; p.y += p.vy * dt; } });
        S.parts = S.parts.filter(p => p.life > 0);
        // next wave
        if (playing && !S.boss && !S.bossDie && !S.en.length) {
          if (S.waveT === null) S.waveT = S.wave ? 2 : 0.8;
          S.waveT -= dt;
          if (S.waveT <= 0) { S.waveT = null; startWave(); }
        }
        if (mode === 'over') {
          overT -= dt;
          if (overT <= 0) afterGameOver();
        }
      }
      function gameOver() {
        mode = 'over'; overT = 3; drag = null; S.touch = false;
        const d = Math.min(6, Math.floor(S.score / 20000));
        if (d > 0) api.earn(d, 'your SkyBlast score');
        msg('Final score: ' + S.score);
        snd(() => [392, 330, 262, 196, 131].forEach((f, i) => api.tone(f, 0.28, { type: 'triangle', vol: 0.07, at: i * 0.22 })));
      }
      function afterGameOver() {
        const score = S.score, wave = S.wave;
        if (score > 0 && (hi.length < 8 || score > hi[hi.length - 1].s)) askInitials(score, wave);
        else toTitle();
      }
      function askInitials(score, wave) {
        mode = 'ini';
        const ini = (api.user || '').toUpperCase().replace(/[^A-Z]/g, '').padEnd(3, 'A').slice(0, 3).split('');
        let slot = 0;
        const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        iniEl.innerHTML = `<div class="skb-ibox raised"><h3>NEW HIGH SCORE!</h3><div><b>${score}</b> points, wave ${wave}</div><div>Enter your initials:</div><div class="skb-slots">${[0, 1, 2].map(i => `<div class="skb-slot"><button class="btn" data-u="${i}" aria-label="Next letter">&#9650;</button><b data-s="${i}"></b><button class="btn" data-d="${i}" aria-label="Previous letter">&#9660;</button></div>`).join('')}</div><button class="btn" data-ok><b>OK</b></button></div>`;
        iniEl.hidden = false;
        const draw = () => iniEl.querySelectorAll('[data-s]').forEach((b, i) => { b.textContent = ini[i]; b.classList.toggle('on', i === slot); });
        const bump = (i, d) => { ini[i] = A[(A.indexOf(ini[i]) + d + 26) % 26]; slot = i; draw(); snd(() => api.tone(880, 0.03, { vol: 0.03 })); };
        const done = () => {
          const e = { i: ini.join(''), s: score, w: wave };
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

      /* ---- drawing ---- */
      function text(t, x, y, size, col, align = 'center', bold) {
        g.font = FONT(size, bold); g.textAlign = align; g.textBaseline = 'middle';
        g.fillStyle = '#000'; g.fillText(t, x + 1, y + 1);
        g.fillStyle = col; g.fillText(t, x, y);
      }
      const pad = n => String(n).padStart(6, '0');
      function drawStars(dt) {
        const sp = [14, 34, 70], cols = ['#334', '#88a', '#fff'];
        stars.forEach((layer, l) => {
          g.fillStyle = cols[l];
          layer.forEach(s => {
            s.y += sp[l] * dt * (S && S.boss ? 1.4 : 1);
            if (s.y > VH) { s.y -= VH + 2; s.x = Math.random() * VW; }
            g.fillRect(Math.round(s.x), Math.round(s.y), l === 2 ? 1 : 1, l === 2 ? 3 : 1);
          });
        });
      }
      function blit(img, x, y) { g.drawImage(img, Math.round(x - img.width / 2), Math.round(y - img.height / 2)); }
      function drawWorld() {
        // power-ups
        S.pups.forEach(p => {
          const c = PUPS[p.type].col, x = Math.round(p.x), y = Math.round(p.y);
          g.fillStyle = '#000'; g.fillRect(x - 6, y - 6, 12, 12);
          g.fillStyle = (p.t * 6 | 0) % 2 ? c : '#fff'; g.fillRect(x - 6, y - 6, 12, 1); g.fillRect(x - 6, y + 5, 12, 1); g.fillRect(x - 6, y - 6, 1, 12); g.fillRect(x + 5, y - 6, 1, 12);
          text(p.type, x, y + 1, 9, c, 'center', true);
        });
        // enemies
        S.en.forEach(e => { if (e.state === 'wait') return; blit(e.hit > 0 ? SP[e.type + 'W'] : SP[e.type], e.x, e.y + (e.type === 'saucer' ? Math.sin(e.anim * 5) : 0)); });
        // boss
        if (S.boss) {
          const B = S.boss;
          blit(B.hit > 0 ? SP.bossW : B.spr, B.x, B.y);
          const glow = (S.t * 8 | 0) % 2;
          g.fillStyle = glow ? '#ff8000' : '#ffe040';
          g.fillRect(Math.round(B.x - 22), Math.round(B.y + 12), 2, 2 + glow); g.fillRect(Math.round(B.x + 20), Math.round(B.y + 12), 2, 2 + glow);
        }
        // bullets
        g.fillStyle = '#ffff80';
        S.pb.forEach(b => g.fillRect(Math.round(b.x) - 1, Math.round(b.y) - 3, 2, 6));
        S.eb.forEach(b => { g.fillStyle = '#ff3060'; g.fillRect(Math.round(b.x) - 2, Math.round(b.y) - 2, 4, 4); g.fillStyle = '#ffd0e0'; g.fillRect(Math.round(b.x) - 1, Math.round(b.y) - 1, 2, 2); });
        // player
        if (S.dead <= 0 && mode === 'play' && !(S.inv > 0 && (S.t * 10 | 0) % 2)) {
          const fl = 2 + (Math.random() * 3 | 0);
          g.fillStyle = '#ffe040'; g.fillRect(Math.round(S.x) - 4, Math.round(S.y) + 6, 2, fl); g.fillRect(Math.round(S.x) + 3, Math.round(S.y) + 6, 2, fl);
          blit(SP.ship, S.x, S.y);
          if (S.shield > 0) {
            g.strokeStyle = S.shield < 2 && (S.t * 8 | 0) % 2 ? 'rgba(64,240,255,.3)' : 'rgba(64,240,255,.85)'; g.lineWidth = 1;
            g.beginPath(); g.arc(S.x, S.y, 12 + Math.sin(S.t * 8), 0, 6.283); g.stroke();
          }
        }
        // particles
        S.parts.forEach(p => {
          if (p.ring) { g.strokeStyle = `rgba(255,255,200,${p.life * 3})`; g.lineWidth = 1.5; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 6.283); g.stroke(); }
          else { g.fillStyle = p.c; g.fillRect(Math.round(p.x), Math.round(p.y), 2, 2); }
        });
      }
      function drawHud() {
        text('SCORE ' + pad(S.score), 4, 7, 9, '#fff', 'left', true);
        text('HI ' + pad(Math.max(S.score, hi[0] ? hi[0].s : 0)), VW - 4, 7, 9, '#ff8', 'right', true);
        if (S.wave) text('WAVE ' + S.wave, VW / 2, 18, 8, '#8cf');
        for (let i = 0; i < Math.min(6, S.lives); i++) g.drawImage(SP.ship, 3 + i * 11, VH - 11, 10, 9);
        for (let i = 0; i < S.bombs; i++) { const x = VW - 8 - i * 10, y = VH - 7; g.fillStyle = '#ff40ff'; g.fillRect(x - 3, y - 3, 7, 7); text('B', x + 0.5, y + 1, 7, '#fff', 'center', true); }
        let bx = VW / 2 - 30;
        [['spread', 15, '#ffe040'], ['rapid', 15, '#ff8020'], ['shield', 12, '#40f0ff']].forEach(([k, mx, c]) => { if (S[k] > 0) { g.fillStyle = '#333'; g.fillRect(bx, VH - 6, 18, 3); g.fillStyle = c; g.fillRect(bx, VH - 6, Math.ceil(18 * S[k] / mx), 3); bx += 21; } });
        if (S.boss) {
          const B = S.boss, w = 130, x = (VW - w) / 2;
          g.fillStyle = '#000'; g.fillRect(x - 1, 23, w + 2, 6); g.fillStyle = '#400'; g.fillRect(x, 24, w, 4);
          g.fillStyle = B.hp / B.max < 0.3 ? '#ff2020' : '#ff9020'; g.fillRect(x, 24, Math.max(0, w * B.hp / B.max), 4);
          text('MOTHERSHIP', VW / 2, 34, 7, '#fcc');
        }
        if (S.banner) {
          const b = S.banner, blink = b.text === 'WARNING!' && (S.t * 4 | 0) % 2;
          if (!blink) text(b.text, VW / 2, VH * 0.45, 16, b.text === 'WARNING!' ? '#ff4040' : '#ffe040', 'center', true);
          if (b.sub) text(b.sub, VW / 2, VH * 0.45 + 16, 9, '#fff', 'center', true);
        }
      }
      function drawTitle() {
        const y0 = Math.max(46, VH * 0.16);
        g.save(); g.font = 'italic 900 38px Impact, "Arial Black", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        const gr = g.createLinearGradient(0, y0 - 18, 0, y0 + 18); gr.addColorStop(0, '#fff8a0'); gr.addColorStop(0.5, '#ffb020'); gr.addColorStop(1, '#ff3060');
        g.lineWidth = 4; g.strokeStyle = '#200040'; g.strokeText('SKYBLAST', VW / 2, y0); g.fillStyle = gr; g.fillText('SKYBLAST', VW / 2, y0); g.restore();
        text('REGISTERED VERSION', VW / 2, y0 + 24, 8, '#8cf', 'center', true);
        blit(SP.ship, VW / 2, y0 + 44 + Math.sin(tt * 3) * 2);
        const hy = y0 + 66;
        text('- HIGH SCORES -', VW / 2, hy, 10, '#ff8', 'center', true);
        hi.forEach((h, i) => text(`${i + 1}. ${h.i}  ${pad(h.s)}`, VW / 2, hy + 14 + i * 12, 10, i === lastRank && (tt * 4 | 0) % 2 ? '#ff4' : i === lastRank ? '#fff' : '#9ab', 'center', true));
        const by = Math.min(VH - 36, hy + 14 + hi.length * 12 + 12);
        if ((tt * 2 | 0) % 2 === 0) text('PRESS SPACE OR TAP TO START', VW / 2, by, 9, '#fff', 'center', true);
        text('ARROWS/WASD MOVE  SPACE FIRE  B BOMB', VW / 2, VH - 18, 7, '#789');
        text('(C) 1990 NEBULA SOFTWORKS', VW / 2, VH - 8, 7, '#567');
      }
      function draw(dt) {
        g.setTransform(ppx, 0, 0, ppx, 0, 0);
        g.imageSmoothingEnabled = false;
        g.fillStyle = '#02020c'; g.fillRect(0, 0, VW, VH);
        if (S && S.shake > 0) g.translate(rnd(-2, 2) * S.shake * 2, rnd(-2, 2) * S.shake * 2);
        drawStars(dt);
        if (mode === 'title') drawTitle();
        else if (S) {
          drawWorld(); drawHud();
          if (S.flash > 0) { g.fillStyle = `rgba(255,255,255,${S.flash * 2})`; g.fillRect(0, 0, VW, VH); }
          if (mode === 'over' || mode === 'ini') { text('GAME OVER', VW / 2, VH * 0.4, 20, '#ff4060', 'center', true); text('FINAL SCORE ' + S.score, VW / 2, VH * 0.4 + 20, 10, '#fff', 'center', true); }
          if (paused) { g.fillStyle = 'rgba(0,0,20,.6)'; g.fillRect(0, 0, VW, VH); text('PAUSED', VW / 2, VH * 0.42, 20, '#ffe040', 'center', true); text('PRESS P OR TAP TO RESUME', VW / 2, VH * 0.42 + 20, 9, '#fff', 'center', true); }
        }
      }
      function frame(now) {
        if (closed) return;
        raf = requestAnimationFrame(frame);
        let dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
        if (mode === 'play' && !paused && !W.el.classList.contains('active')) { paused = true; clearKeys(); pauseB.textContent = 'Resume'; }
        if (mode === 'play' && paused) dt = 0;
        tt += dt;
        if (S && (mode === 'play' || mode === 'over') && dt > 0) update(dt);
        draw(dt);
      }

      /* ---- input ---- */
      const KMAP = { arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right', arrowup: 'up', w: 'up', arrowdown: 'down', s: 'down', ' ': 'fire', z: 'fire' };
      function clearKeys() { Object.keys(keys).forEach(k => { keys[k] = false; }); }
      W.onKey = e => {
        const k = e.key, lk = k.length === 1 ? k.toLowerCase() : k.toLowerCase();
        if (mode === 'ini') { if (iniKey) iniKey(e); return; }
        if (KMAP[lk]) e.preventDefault();
        if (lk === 'p') { togglePause(); return; }
        if (mode === 'title') { if (k === ' ' || k === 'Enter') newGame(); return; }
        if (mode !== 'play') return;
        if (paused) { if (k === 'Enter') togglePause(); return; }
        if (KMAP[lk]) keys[KMAP[lk]] = true;
        if (lk === 'b' || lk === 'x') bomb();
      };
      const onUp = e => { const lk = e.key.toLowerCase(); if (KMAP[lk]) keys[KMAP[lk]] = false; };
      window.addEventListener('keyup', onUp);
      window.addEventListener('blur', clearKeys);
      const toL = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * VW, y: (e.clientY - r.top) / r.height * VH }; };
      cv.addEventListener('pointerdown', e => {
        e.preventDefault();
        if (mode === 'title') { newGame(); }
        if (mode !== 'play') return;
        if (paused) { togglePause(); return; }
        if (S.dead > 0) return;
        const p = toL(e);
        // Keep the ship a little above the finger so it stays visible.
        const touchLike = e.pointerType !== 'mouse';
        drag = { id: e.pointerId, ox: touchLike ? 0 : S.x - p.x, oy: touchLike ? -28 : S.y - p.y };
        if (touchLike) { S.tx = p.x; S.ty = p.y - 28; }
        try { cv.setPointerCapture(e.pointerId); } catch (err) {}
        S.touch = true;
      });
      cv.addEventListener('pointermove', e => {
        if (!drag || drag.id !== e.pointerId || !S || mode !== 'play') return;
        const p = toL(e); S.tx = p.x + drag.ox; S.ty = p.y + drag.oy;
      });
      const endDrag = e => { if (drag && drag.id === e.pointerId) { drag = null; if (S) { S.touch = false; S.tx = null; } } };
      cv.addEventListener('pointerup', endDrag); cv.addEventListener('pointercancel', endDrag);
      W.body.querySelector('[data-a=bomb]').addEventListener('pointerdown', e => { e.preventDefault(); bomb(); });
      pauseB.addEventListener('pointerdown', e => { e.preventDefault(); if (mode === 'play') togglePause(); else if (mode === 'title') newGame(); });

      W.onMin = () => { if (mode === 'play' && !paused) togglePause(); };
      W.onResize = fit;
      W.onClose = () => { closed = true; cancelAnimationFrame(raf); raf = 0; window.removeEventListener('keyup', onUp); window.removeEventListener('blur', clearKeys); };
      fit();
      toTitle();
      requestAnimationFrame(t => { last = t; fit(); frame(t); });
    }
  });
})();
