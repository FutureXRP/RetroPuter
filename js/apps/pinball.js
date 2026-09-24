/* Nebula Pinball: a built-in space-themed pinball table for Horizon 2000. Original table design. */
(function () {
  const WW = 400, WH = 740, R = 9, G = 1050, STEP = 1 / 600, MAXV = 2300;
  const FL = 60, PIV_R = 9, TIP_R = 5, PLUNGE_Y = 700;
  const LANES_X = [140.5, 185, 229.5], LANE_Y = 84, LANE_TXT = ['I', 'O', 'N'];
  const fmt = n => Math.round(n).toLocaleString('en-US');

  function seg(ax, ay, bx, by, o = {}) {
    const s = Object.assign({ ax, ay, bx, by, r: 2, e: 0.45, kind: 'wall' }, o);
    s.dx = bx - ax; s.dy = by - ay; s.l2 = s.dx * s.dx + s.dy * s.dy || 1;
    return s;
  }
  function poly(list, pts, o) { for (let i = 0; i < pts.length - 1; i++) list.push(seg(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], o)); }
  const mirror = pts => pts.map(([x, y]) => [370 - x, y]);

  function buildTable() {
    const segs = [], circles = [];
    // top arc: centre (200,200) radius 180, from the left wall over the top to the right wall
    const arc = [];
    for (let i = 0; i <= 28; i++) { const a = Math.PI + Math.PI * i / 28; arc.push([200 + 180 * Math.cos(a), 200 + 180 * Math.sin(a)]); }
    poly(segs, arc, { e: 0.3, draw: 1 });
    poly(segs, [[20, 200], [20, 440], [48, 480], [48, 585], [116, 628]], { draw: 1 }); // left wall, deflector, inlane guide
    poly(segs, [[380, 200], [380, 760]], { draw: 1 });                                 // right outer wall (plunger lane)
    poly(segs, [[350, 760], [350, 250]], { draw: 1 });                                 // plunger lane inner wall
    poly(segs, [[322, 480], [322, 585], [254, 628]], { draw: 1 });                     // right inlane guide
    // one-way gates: let the ball pass upward only
    const g1 = seg(350, 250, 380, 215, { kind: 'gate', draw: 2 }); g1.one = norm(-35, -30); segs.push(g1);
    const g2 = seg(20, 190, 56, 212, { kind: 'gate', draw: 2 }); g2.one = norm(22, -36); segs.push(g2);
    // left orbit inner wall
    poly(segs, [[56, 212], [56, 392]], { draw: 1, r: 3 });
    // top lane posts
    [118, 163, 207, 252].forEach(x => segs.push(seg(x, 62, x, 100, { r: 3.5, e: 0.5, kind: 'post', draw: 3 })));
    // slingshots
    const sl = [[74, 490], [74, 560], [106, 584]], sr = mirror(sl);
    [[sl, 0], [sr, 1]].forEach(([p, id]) => {
      segs.push(seg(p[0][0], p[0][1], p[1][0], p[1][1], { e: 0.6, r: 3 }));
      segs.push(seg(p[1][0], p[1][1], p[2][0], p[2][1], { e: 0.6, r: 3 }));
      segs.push(seg(p[0][0], p[0][1], p[2][0], p[2][1], { e: 0.6, r: 3, kind: 'sling', id }));
    });
    // centre drop-target bank with a backstop box
    poly(segs, [[146, 345], [146, 331], [224, 331], [224, 345]], { r: 3, e: 0.4, draw: 1 });
    const drops = [];
    [[149, 171], [174, 196], [199, 221]].forEach(([x0, x1], id) => { const s = seg(x0, 346, x1, 346, { r: 4, e: 0.35, kind: 'drop', id }); drops.push(s); segs.push(s); });
    // plunger floor (moves)
    const plunger = seg(350, PLUNGE_Y, 380, PLUNGE_Y, { kind: 'plunger', e: 0.1, r: 0 });
    segs.push(plunger);
    // pop bumpers and rubber posts
    [[135, 192], [235, 192], [185, 262]].forEach(([x, y], id) => circles.push({ x, y, r: 19, e: 0.5, kind: 'bump', id, flash: 0, cool: 0 }));
    circles.push({ x: 322, y: 480, r: 4, e: 0.6, kind: 'post' });
    return { segs, circles, drops, plunger, arc, sl, sr };
  }
  function norm(x, y) { const l = Math.hypot(x, y); return [x / l, y / l]; }

  (window.RETRO_APPS = window.RETRO_APPS || []).push({
    id: 'pinball', help: 'A space pinball table with flippers, bumpers and high scores.',
    label: 'Nebula Pinball',
    kind: 'builtin',
    eras: ['2000'],
    cat: 'game',
    icon: '<svg viewBox="0 0 32 32" shape-rendering="crispEdges" aria-hidden="true"><rect x="6" y="1" width="20" height="30" fill="#120833" stroke="#000"/><rect x="8" y="3" width="1" height="1" fill="#fff"/><rect x="21" y="6" width="1" height="1" fill="#fff"/><rect x="12" y="9" width="1" height="1" fill="#ff0"/><circle cx="12" cy="11" r="3" fill="#c040ff"/><circle cx="20" cy="11" r="3" fill="#20c0ff"/><circle cx="16" cy="16" r="3" fill="#ff8020"/><path d="M8 25l5 3M24 25l-5 3" stroke="#ff0" stroke-width="2"/><rect x="15" y="20" width="3" height="3" fill="#ddd"/><rect x="23" y="14" width="2" height="15" fill="#666"/></svg>',
    window: { w: 420, h: 690 },
    css: `
      .npb{height:100%;display:flex;flex-direction:column;gap:4px;padding:4px;background:#1a1a2a;user-select:none;-webkit-user-select:none}
      .npb-hud{flex:none;background:#000;color:#ffb000;font-family:var(--dos);display:grid;grid-template-columns:1fr auto;grid-template-areas:"sc inf" "msg msg";padding:2px 8px;align-items:center;text-shadow:0 0 6px rgba(255,160,0,.6);border:2px solid;border-color:#444 #888 #888 #444}
      .npb-sc{grid-area:sc;font-size:30px;line-height:1}
      .npb-inf{grid-area:inf;font-size:18px;line-height:1;text-align:right}
      .npb-msg{grid-area:msg;font-size:18px;line-height:1.1;min-height:1.1em;text-align:center;white-space:nowrap;overflow:hidden}
      .npb-wrap{flex:1;min-height:0;position:relative;background:#000;touch-action:none}
      .npb-wrap canvas{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none}
      .npb-ctl{flex:none;display:flex;gap:4px}
      .npb-ctl .btn{flex:1;min-width:0;padding:6px 2px;touch-action:none}
      .npb-ctl .npb-launch{flex:1.4;font-weight:700}
    `,
    open(W, api) {
      W.body.innerHTML = `<div class="npb">
        <div class="npb-hud" aria-live="polite"><div class="npb-sc">0</div><div class="npb-inf"></div><div class="npb-msg"></div></div>
        <div class="npb-wrap"><canvas aria-label="Pinball table. Z or left arrow and slash or right arrow flip, hold Space or Down to pull the plunger."></canvas></div>
        <div class="npb-ctl"><button class="btn" data-fl aria-label="Left flipper">&lt; Flip</button><button class="btn npb-launch" data-launch>Launch</button><button class="btn" data-nudge>Nudge</button><button class="btn" data-fr aria-label="Right flipper">Flip &gt;</button></div>
      </div>`;
      const $ = s => W.body.querySelector(s);
      const wrap = $('.npb-wrap'), cv = $('canvas'), ctx = cv.getContext('2d');
      const scEl = $('.npb-sc'), infEl = $('.npb-inf'), msgEl = $('.npb-msg');

      const T = buildTable();
      const { segs, circles, drops, plunger } = T;
      const flips = [
        { px: 116, py: 628, rest: 0.52, up: -0.42, th: 0.52, w: 0, on: false, side: 0 },
        { px: 254, py: 628, rest: Math.PI - 0.52, up: Math.PI + 0.42, th: Math.PI - 0.52, w: 0, on: false, side: 1 }
      ];
      const ball = { x: 365, y: PLUNGE_Y - R, vx: 0, vy: 0, live: false };
      const slingFlash = [0, 0];
      let hi = api.load('hi', []);
      let nudgeOn = api.load('nudge', true), soundOn = api.load('sound', true);

      // game state
      let state = 'attract', score = 0, ballNo = 1, balls = 3, mult = 1, bonus = 0, gt = 0;
      let lanes = [false, false, false], laneIn = [false, false, false], jackpot = false, saveUntil = 0, saveUsed = false;
      let tilt = 0, tilted = false, pull = 0, pulling = false, events = [], orbitT = -9, still = 0, skill = false, earnedMsg = '';
      let paused = false, pauseDrawn = false, raf = 0, lastT = 0, acc = 0, lastWallSnd = 0;
      let msg = '', msgUntil = 0, hudCache = '';

      const snd = (f) => { if (soundOn) f(); };
      const tone = (f, d, o) => snd(() => api.tone(f, d, Object.assign({ vol: 0.06 }, o, { vol: Math.min(0.12, (o && o.vol) || 0.06) })));
      const noise = (d, o) => snd(() => api.noise(d, Object.assign({}, o, { vol: Math.min(0.12, (o && o.vol) || 0.08) })));
      const later = (sec, fn) => events.push({ at: gt + sec, fn });
      function say(text, sec = 2) { msg = text; msgUntil = gt + sec; }
      function add(n) { if (!tilted) score += n; }

      /* ---------- controls ---------- */
      function flipper(side, on) {
        const f = flips[side];
        if (f.on === on) return;
        f.on = on;
        if (on && !tilted && state === 'play') {
          noise(0.05, { ft: 'lowpass', f: 380, vol: 0.12, decay: 1 });
          tone(110, 0.05, { type: 'square', vol: 0.03, decay: 1 });
          // lane change: rotate lit lanes
          if (side === 0) lanes.push(lanes.shift()); else lanes.unshift(lanes.pop());
        }
      }
      function plungeDown() {
        if (paused) { resume(); return; }
        if (state === 'attract' || state === 'over') { newGame(); return; }
        if (!pulling) { pulling = true; tone(160, 0.3, { type: 'sawtooth', vol: 0.02, to: 90 }); }
      }
      function plungeUp() {
        if (!pulling) return;
        pulling = false;
        const inLane = ball.live && ball.x > 350 && ball.y + R >= plunger.ay - 5;
        if (inLane) {
          ball.vy = -(430 + 1570 * pull); ball.vx = 0;
          ball.y = Math.min(ball.y, PLUNGE_Y - R - 0.5);
          if (!saveUsed && state === 'play') saveUntil = Math.max(saveUntil, gt + 10);
          noise(0.18, { ft: 'bandpass', f: 900, q: 0.8, vol: 0.12, decay: 1 });
          tone(220, 0.15, { to: 660, type: 'triangle', vol: 0.05, decay: 1 });
          skill = true;
        }
        pull = 0; setPlunger(PLUNGE_Y);
      }
      function nudge() {
        if (state !== 'play' || !ball.live || tilted) return;
        if (!nudgeOn) { say('NUDGING IS OFF', 1.2); return; }
        ball.vx += (Math.random() < 0.5 ? -1 : 1) * (70 + Math.random() * 60);
        ball.vy -= 60 + Math.random() * 60;
        tilt += 1;
        noise(0.08, { ft: 'lowpass', f: 200, vol: 0.12, decay: 1 });
        if (tilt >= 3) {
          tilted = true; say('TILT', 60); flips.forEach(f => { f.on = false; });
          tone(90, 0.8, { type: 'sawtooth', vol: 0.08 });
        } else if (tilt >= 2) { say('DANGER', 1.5); tone(440, 0.2, { vol: 0.06 }); tone(440, 0.2, { at: 0.3, vol: 0.06 }); }
      }
      const LEFT = ['z', 'Z', 'ArrowLeft', 'a', 'A'], RIGHT = ['/', '?', 'ArrowRight', 'l', 'L'], PLUNGE = [' ', 'ArrowDown', 'Enter'];
      const keys = new Set();
      W.onKey = e => {
        const k = e.key;
        if (LEFT.includes(k) || RIGHT.includes(k) || PLUNGE.includes(k) || k === 'ArrowUp') e.preventDefault();
        if (e.repeat) return;
        if (k === 'p' || k === 'P' || k === 'Escape') { if (paused) resume(); else if (state === 'play' || state === 'bonus') pause(); return; }
        if (paused && k !== 'Shift') { resume(); return; }
        keys.add(k);
        if (LEFT.includes(k)) flipper(0, true);
        else if (RIGHT.includes(k)) flipper(1, true);
        else if (PLUNGE.includes(k)) plungeDown();
        else if (k === 'n' || k === 'N' || k === 'ArrowUp') nudge();
      };
      const onKeyUp = e => {
        const k = e.key;
        [k, k.toLowerCase(), k.toUpperCase()].forEach(x => keys.delete(x));
        if (LEFT.includes(k) && !LEFT.some(x => keys.has(x)) && !touchSide(0)) flipper(0, false);
        if (RIGHT.includes(k) && !RIGHT.some(x => keys.has(x)) && !touchSide(1)) flipper(1, false);
        if (PLUNGE.includes(k)) plungeUp();
      };
      document.addEventListener('keyup', onKeyUp);
      const onBlur = () => releaseAll();
      window.addEventListener('blur', onBlur);
      function releaseAll() { keys.clear(); ptrs.clear(); flipper(0, false); flipper(1, false); if (pulling) { pulling = false; pull = 0; setPlunger(PLUNGE_Y); } }

      const ptrs = new Map(); // pointerId -> side
      const touchSide = s => [...ptrs.values()].includes(s);
      function toTable(e) { const r = cv.getBoundingClientRect(); return { x: ((e.clientX - r.left) - view.ox) / view.s, y: ((e.clientY - r.top) - view.oy) / view.s }; }
      cv.addEventListener('pointerdown', e => {
        e.preventDefault();
        if (paused) { resume(); return; }
        if (state === 'attract' || state === 'over') { newGame(); return; }
        const p = toTable(e);
        // tapping the plunger lane area pulls the plunger
        if (ball.live && ball.x > 350 && ball.y > 600 && p.x > 330 && p.y > 560) { ptrs.set(e.pointerId, 'p'); plungeDown(); try { cv.setPointerCapture(e.pointerId); } catch (x) { } return; }
        const side = p.x < 185 ? 0 : 1;
        ptrs.set(e.pointerId, side); flipper(side, true);
        try { cv.setPointerCapture(e.pointerId); } catch (x) { }
      });
      const ptrUp = e => {
        const s = ptrs.get(e.pointerId); if (s === undefined) return;
        ptrs.delete(e.pointerId);
        if (s === 'p') { plungeUp(); return; }
        const keyHeld = (s === 0 ? LEFT : RIGHT).some(x => keys.has(x));
        if (!touchSide(s) && !keyHeld) flipper(s, false);
      };
      cv.addEventListener('pointerup', ptrUp); cv.addEventListener('pointercancel', ptrUp);
      cv.addEventListener('contextmenu', e => e.preventDefault());
      function holdBtn(el, down, up) {
        el.addEventListener('pointerdown', e => { e.preventDefault(); try { el.setPointerCapture(e.pointerId); } catch (x) { } el.classList.add('down'); down(); });
        const u = () => { el.classList.remove('down'); up(); };
        el.addEventListener('pointerup', u); el.addEventListener('pointercancel', u);
      }
      holdBtn($('[data-fl]'), () => { if (paused) resume(); else flipper(0, true); }, () => flipper(0, false));
      holdBtn($('[data-fr]'), () => { if (paused) resume(); else flipper(1, true); }, () => flipper(1, false));
      holdBtn($('[data-launch]'), plungeDown, plungeUp);
      $('[data-nudge]').addEventListener('pointerdown', e => { e.preventDefault(); if (paused) resume(); else nudge(); });
      W.body.querySelectorAll('.npb-ctl .btn').forEach(b => b.addEventListener('click', e => e.preventDefault()));

      /* ---------- game flow ---------- */
      function newGame() {
        state = 'play'; score = 0; ballNo = 1; events = []; gt = 0; lanes = [false, false, false]; jackpot = false;
        drops.forEach(d => { d.down = false; }); earnedMsg = '';
        startBall(); say('BALL 1 - HOLD LAUNCH', 3);
        [60, 64, 67, 72].forEach((n, i) => tone(api.midi(n), 0.12, { at: i * 0.08, type: 'triangle', vol: 0.07 }));
      }
      function startBall() {
        mult = 1; bonus = 0; tilted = false; tilt = 0; saveUsed = false; saveUntil = 0; skill = false; still = 0;
        placeInLane();
      }
      function placeInLane() { ball.x = 365; ball.y = PLUNGE_Y - R - 1; ball.vx = 0; ball.vy = 0; ball.live = true; setPlunger(PLUNGE_Y); }
      function setPlunger(y) { plunger.ay = plunger.by = y; }
      function drain() {
        ball.live = false;
        if (gt < saveUntil && !tilted) {
          saveUsed = true; saveUntil = 0; say('BALL SAVED', 2.5);
          api.sfx.ding && snd(() => api.sfx.ding());
          later(1.2, () => placeInLane());
          return;
        }
        state = 'bonus';
        [70, 65, 60, 55].forEach((n, i) => tone(api.midi(n), 0.18, { at: i * 0.14, type: 'square', vol: 0.05 }));
        const total = tilted ? 0 : bonus * mult;
        say(tilted ? 'TILT - NO BONUS' : `BONUS ${fmt(bonus)} x ${mult}`, 2.2);
        later(1.1, () => {
          if (total) { score += total; say(`BONUS ${fmt(total)}`, 1.3); for (let i = 0; i < 6; i++) tone(700 + i * 90, 0.04, { at: i * 0.06, vol: 0.05 }); }
        });
        later(2.4, () => {
          tilted = false;
          if (ballNo >= balls) { gameOver(); return; }
          ballNo++; state = 'play'; startBall(); say(`BALL ${ballNo}`, 2);
        });
      }
      function gameOver() {
        state = 'over'; ball.live = false;
        hi.push({ n: api.user, s: score, d: new Date().toLocaleDateString('en-US') });
        hi.sort((a, b) => b.s - a.s); hi = hi.slice(0, 5);
        const place = hi.findIndex(h => h.s === score && h.n === api.user);
        api.save('hi', hi);
        const cash = Math.min(6, Math.floor(score / 25000));
        if (cash > 0) api.earn(cash, 'your Nebula Pinball score');
        earnedMsg = cash > 0 ? `You earned $${cash}.` : 'Score 25,000 or more to earn money.';
        say('GAME OVER', 999);
        snd(() => (place === 0 && score > 0 ? api.sfx.tada() : api.sfx.crash()));
        setTimeout(() => { if (!closed) api.msgBox('Nebula Pinball', `Game over! Final score: ${fmt(score)}\n${place >= 0 ? `That is #${place + 1} on the high score table!\n` : ''}${earnedMsg}`, ['Play again', 'OK']).then(r => { if (r === 'Play again' && !closed) newGame(); }); }, 900);
      }
      function pause() { if (paused) return; paused = true; pauseDrawn = false; releaseAll(); }
      function resume() { paused = false; lastT = 0; }

      /* ---------- scoring events ---------- */
      function hitBumper(c) {
        if (c.cool > gt) return;
        c.cool = gt + 0.05; c.flash = gt + 0.12;
        add(100); bonus += 100; skill = false;
        tone(150 + c.id * 40, 0.12, { to: 70, type: 'square', vol: 0.07, decay: 1 });
        noise(0.05, { ft: 'bandpass', f: 1800, vol: 0.1, decay: 1 });
      }
      function hitSling(s) {
        slingFlash[s.id] = gt + 0.1; add(10); skill = false;
        tone(480, 0.05, { type: 'square', vol: 0.05, decay: 1 });
      }
      function hitDrop(s) {
        if (s.down) return;
        s.down = true; add(750); bonus += 1000; skill = false;
        tone(300, 0.15, { to: 120, type: 'triangle', vol: 0.08, decay: 1 });
        if (drops.every(d => d.down)) {
          add(5000); jackpot = true; say('JACKPOT LIT - SHOOT THE ORBIT', 3);
          [67, 71, 74, 79].forEach((n, i) => tone(api.midi(n), 0.12, { at: 0.1 + i * 0.09, type: 'triangle', vol: 0.07 }));
          later(1.5, () => drops.forEach(d => { d.down = false; }));
        } else say('TARGET 750', 1);
      }
      function hitLane(i) {
        if (skill) { add(10000); say('SKILL SHOT 10,000', 2.5); api.sfx.tada && snd(() => api.sfx.tada()); }
        skill = false;
        add(500); bonus += 1000;
        tone(880 + i * 110, 0.08, { type: 'triangle', vol: 0.06 });
        if (!lanes[i]) {
          lanes[i] = true;
          if (lanes.every(Boolean)) {
            lanes = [false, false, false];
            add(2500);
            if (mult < 5) { mult++; say(`BONUS ${mult}X`, 2); } else say('ION LANES 2,500', 2);
            [72, 76, 79, 84].forEach((n, k) => tone(api.midi(n), 0.1, { at: 0.1 + k * 0.07, type: 'square', vol: 0.05 }));
          }
        }
      }
      function orbit() {
        add(5000); bonus += 2000;
        if (jackpot) { jackpot = false; add(25000); say('NEBULA JACKPOT 25,000', 3); [60, 67, 72, 76, 79, 84].forEach((n, i) => tone(api.midi(n), 0.15, { at: i * 0.08, type: 'triangle', vol: 0.08 })); }
        else { say('ORBIT 5,000', 1.6); [64, 69, 76].forEach((n, i) => tone(api.midi(n), 0.09, { at: i * 0.07, type: 'square', vol: 0.05 })); }
      }

      /* ---------- physics ---------- */
      function contact(nx, ny, e) {
        const vn = ball.vx * nx + ball.vy * ny;
        if (vn < 0) { ball.vx -= (1 + e) * vn * nx; ball.vy -= (1 + e) * vn * ny; }
        return -vn;
      }
      function collideSeg(s) {
        if (s.kind === 'drop' && s.down) return;
        const px = ball.x - s.ax, py = ball.y - s.ay;
        let t = (px * s.dx + py * s.dy) / s.l2; t = t < 0 ? 0 : t > 1 ? 1 : t;
        const cx = s.ax + s.dx * t, cy = s.ay + s.dy * t;
        let nx = ball.x - cx, ny = ball.y - cy;
        const rr = R + s.r, d2 = nx * nx + ny * ny;
        if (d2 >= rr * rr) return;
        if (s.one) {
          if (px * s.one[0] + py * s.one[1] <= 0) return;               // ball is on the pass-through side
          if (ball.vx * s.one[0] + ball.vy * s.one[1] > 0) return;      // moving away
        }
        const d = Math.sqrt(d2) || 1e-4; nx /= d; ny /= d;
        ball.x = cx + nx * rr; ball.y = cy + ny * rr;
        const imp = contact(nx, ny, s.e);
        if (s.kind === 'sling') {
          if (imp > 40) { ball.vx += nx * 480; ball.vy += ny * 480; hitSling(s); }
        } else if (s.kind === 'drop') { if (imp > 60) hitDrop(s); }
        else if (imp > 380 && gt - lastWallSnd > 0.06) { lastWallSnd = gt; noise(0.02, { ft: 'highpass', f: 2500, vol: Math.min(0.1, imp / 20000), decay: 1 }); }
      }
      function collideCircle(c) {
        let nx = ball.x - c.x, ny = ball.y - c.y;
        const rr = R + c.r, d2 = nx * nx + ny * ny;
        if (d2 >= rr * rr) return;
        const d = Math.sqrt(d2) || 1e-4; nx /= d; ny /= d;
        ball.x = c.x + nx * rr; ball.y = c.y + ny * rr;
        contact(nx, ny, c.e);
        if (c.kind === 'bump' && !tilted) {
          const vn = ball.vx * nx + ball.vy * ny;
          if (vn < 720) { ball.vx += nx * (720 - vn); ball.vy += ny * (720 - vn); }
          hitBumper(c);
        }
      }
      function collideFlipper(f) {
        const dx = Math.cos(f.th), dy = Math.sin(f.th);
        const px = ball.x - f.px, py = ball.y - f.py;
        let t = (px * dx + py * dy) / FL; t = t < 0 ? 0 : t > 1 ? 1 : t;
        const cx = f.px + dx * FL * t, cy = f.py + dy * FL * t;
        const rad = PIV_R + (TIP_R - PIV_R) * t, rr = R + rad;
        let nx = ball.x - cx, ny = ball.y - cy;
        const d2 = nx * nx + ny * ny;
        if (d2 >= rr * rr) return;
        const d = Math.sqrt(d2) || 1e-4; nx /= d; ny /= d;
        ball.x = cx + nx * rr; ball.y = cy + ny * rr;
        // velocity of the flipper surface at the contact point
        const rx = cx - f.px, ry = cy - f.py, vcx = -f.w * ry, vcy = f.w * rx;
        const rvx = ball.vx - vcx, rvy = ball.vy - vcy, vn = rvx * nx + rvy * ny;
        if (vn < 0) {
          const e = 0.28;
          ball.vx = rvx - (1 + e) * vn * nx + vcx;
          ball.vy = rvy - (1 + e) * vn * ny + vcy;
        }
      }
      function stepFlippers(dt) {
        flips.forEach(f => {
          const target = f.on && !tilted && state === 'play' ? f.up : f.rest;
          const sp = f.on && !tilted ? 26 : 15;
          const diff = target - f.th;
          if (Math.abs(diff) <= sp * dt) { f.th = target; f.w = 0; }
          else { f.w = Math.sign(diff) * sp; f.th += f.w * dt; }
        });
      }
      function step(dt) {
        gt += dt;
        if (events.length) {
          const due = events.filter(e => e.at <= gt);
          if (due.length) { events = events.filter(e => e.at > gt); due.forEach(e => e.fn()); }
        }
        stepFlippers(dt);
        if (pulling) { pull = Math.min(1, pull + dt / 1.1); setPlunger(PLUNGE_Y + 26 * pull); }
        if (tilt > 0 && !tilted) tilt = Math.max(0, tilt - dt / 3);
        if (!ball.live) return;
        ball.vy += G * dt;
        ball.x += ball.vx * dt; ball.y += ball.vy * dt;
        for (let i = 0; i < segs.length; i++) collideSeg(segs[i]);
        for (let i = 0; i < circles.length; i++) collideCircle(circles[i]);
        collideFlipper(flips[0]); collideFlipper(flips[1]);
        const sp = Math.hypot(ball.vx, ball.vy);
        if (sp > MAXV) { ball.vx *= MAXV / sp; ball.vy *= MAXV / sp; }
        // sensors
        for (let i = 0; i < 3; i++) {
          const dx = ball.x - LANES_X[i], dy = ball.y - LANE_Y, inside = dx * dx + dy * dy < 12 * 12;
          if (inside && !laneIn[i]) hitLane(i);
          laneIn[i] = inside;
        }
        if (ball.x < 56 && ball.y > 250 && ball.y < 340 && ball.vy < 0) orbitT = gt;
        if (ball.x > 300 && ball.y < 150 && gt - orbitT < 2.5) { orbitT = -9; orbit(); }
        const inLane = ball.x > 350 && ball.y > 250;
        if (sp < 15 && !inLane && !flips[0].on && !flips[1].on) { still += dt; if (still > 2.5) { still = 0; ball.vy = -350; ball.vx = (Math.random() - 0.5) * 300; say('BALL SEARCH', 1); } }
        else still = 0;
        if (ball.y > WH + 20) drain();
        else if (ball.x < 0 || ball.x > WW || ball.y < 0 || !isFinite(ball.x + ball.y)) placeInLane(); // safety net
      }

      /* ---------- drawing ---------- */
      const view = { s: 1, ox: 0, oy: 0, dpr: 1, w: 0, h: 0 };
      let bg = null;
      function resize() {
        const r = wrap.getBoundingClientRect();
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        view.w = Math.max(1, r.width); view.h = Math.max(1, r.height); view.dpr = dpr;
        cv.width = Math.round(view.w * dpr); cv.height = Math.round(view.h * dpr);
        view.s = Math.min(view.w / WW, view.h / WH);
        view.ox = (view.w - WW * view.s) / 2; view.oy = (view.h - WH * view.s) / 2;
        bg = document.createElement('canvas');
        bg.width = Math.max(1, Math.round(WW * view.s * dpr)); bg.height = Math.max(1, Math.round(WH * view.s * dpr));
        drawStatic(bg.getContext('2d'), view.s * dpr);
        pauseDrawn = false;
      }
      function rnd(seed) { let x = seed; return () => { x = (x * 16807) % 2147483647; return (x - 1) / 2147483646; }; }
      function drawStatic(g, k) {
        g.setTransform(k, 0, 0, k, 0, 0);
        const grd = g.createLinearGradient(0, 0, 0, WH); grd.addColorStop(0, '#0a0428'); grd.addColorStop(0.5, '#150a3a'); grd.addColorStop(1, '#05021a');
        g.fillStyle = grd; g.fillRect(0, 0, WW, WH);
        [[110, 300, 150, 'rgba(160,40,200,0.28)'], [290, 420, 170, 'rgba(20,140,200,0.22)'], [200, 560, 140, 'rgba(220,60,120,0.18)'], [240, 130, 120, 'rgba(60,80,220,0.25)']].forEach(([x, y, r, c]) => {
          const rg = g.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, c); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg; g.fillRect(x - r, y - r, r * 2, r * 2);
        });
        const rn = rnd(7);
        for (let i = 0; i < 140; i++) { const x = rn() * WW, y = rn() * WH, s = rn() < 0.1 ? 2 : 1; g.fillStyle = rn() < 0.2 ? '#ffe9a0' : '#cfd8ff'; g.globalAlpha = 0.4 + rn() * 0.6; g.fillRect(x, y, s, s); }
        g.globalAlpha = 1;
        // ringed planet decal
        g.save(); g.translate(185, 440);
        const pg = g.createRadialGradient(-12, -14, 4, 0, 0, 44); pg.addColorStop(0, '#ffd27a'); pg.addColorStop(0.6, '#c0602a'); pg.addColorStop(1, '#401030');
        g.globalAlpha = 0.55; g.fillStyle = pg; g.beginPath(); g.arc(0, 0, 40, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#ffe0a0'; g.lineWidth = 3; g.beginPath(); g.ellipse(0, 0, 70, 14, -0.25, 0, Math.PI * 2); g.stroke();
        g.restore(); g.globalAlpha = 1;
        g.font = 'bold 22px Tahoma, Verdana, sans-serif'; g.textAlign = 'center'; g.fillStyle = 'rgba(200,220,255,0.35)';
        g.fillText('N E B U L A', 185, 408);
        // plunger lane and apron shading
        g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(350, 250, 30, 510);
        g.fillStyle = '#111'; g.beginPath(); g.moveTo(0, 740); g.lineTo(0, 650); g.lineTo(116, 650); g.lineTo(150, 740); g.fill();
        g.beginPath(); g.moveTo(350, 740); g.lineTo(350, 650); g.lineTo(254, 650); g.lineTo(220, 740); g.fill();
        // walls
        g.lineCap = 'round'; g.lineJoin = 'round';
        segs.forEach(s => {
          if (!s.draw) return;
          g.strokeStyle = s.draw === 2 ? 'rgba(120,255,160,0.25)' : 'rgba(90,150,255,0.35)'; g.lineWidth = s.r * 2 + 6;
          g.beginPath(); g.moveTo(s.ax, s.ay); g.lineTo(s.bx, s.by); g.stroke();
          g.strokeStyle = s.draw === 2 ? '#7fe0a0' : s.draw === 3 ? '#e0e8ff' : '#a8c0f0'; g.lineWidth = Math.max(2.5, s.r * 2);
          g.beginPath(); g.moveTo(s.ax, s.ay); g.lineTo(s.bx, s.by); g.stroke();
        });
        g.fillStyle = '#e0e8ff'; g.beginPath(); g.arc(322, 480, 4, 0, Math.PI * 2); g.fill();
        // lane letters and arrows
        g.font = 'bold 13px Tahoma, Verdana, sans-serif';
        LANE_TXT.forEach((t, i) => { g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillText(t, LANES_X[i], 124); });
        g.fillStyle = 'rgba(255,255,255,0.45)'; g.font = '9px Tahoma, Verdana, sans-serif';
        g.fillText('ORBIT', 38, 404);
        g.fillText('BALL SAVE', 185, 640);
      }
      function lamp(g, x, y, r, on, col) {
        g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2);
        g.fillStyle = on ? col : 'rgba(80,80,110,0.55)'; g.fill();
        if (on) { g.strokeStyle = '#fff'; g.lineWidth = 1; g.stroke(); }
      }
      function draw() {
        const g = ctx, k = view.dpr;
        g.setTransform(k, 0, 0, k, 0, 0);
        g.fillStyle = '#000'; g.fillRect(0, 0, view.w, view.h);
        if (bg) g.drawImage(bg, view.ox, view.oy, WW * view.s, WH * view.s);
        g.setTransform(k * view.s, 0, 0, k * view.s, k * view.ox, k * view.oy);
        const blink = (gt * 3 | 0) % 2 === 0;
        // lane lamps
        LANES_X.forEach((x, i) => lamp(g, x, 108, 5, lanes[i], '#ffd040'));
        // multiplier lamps
        g.font = 'bold 10px Tahoma, Verdana, sans-serif'; g.textAlign = 'center';
        [2, 3, 4, 5].forEach((m, i) => { const x = 140 + i * 30, on = mult >= m; lamp(g, x, 525, 10, on, '#ff7040'); g.fillStyle = on ? '#000' : '#aab'; g.fillText(m + 'X', x, 529); });
        // ball save and jackpot lamps
        lamp(g, 185, 622, 6, state === 'play' && gt < saveUntil && (gt + 2 < saveUntil || blink), '#40ff80');
        g.beginPath(); g.moveTo(38, 360); g.lineTo(28, 380); g.lineTo(48, 380); g.closePath();
        g.fillStyle = jackpot ? (blink ? '#ff40ff' : '#801080') : 'rgba(80,80,110,0.55)'; g.fill();
        g.fillStyle = jackpot ? '#ff80ff' : 'rgba(255,255,255,0.35)'; g.font = '9px Tahoma, Verdana, sans-serif';
        if (jackpot) { g.save(); g.translate(38, 330); g.rotate(-Math.PI / 2); g.fillText('JACKPOT', 0, 3); g.restore(); }
        // slingshots
        [[T.sl, 0], [T.sr, 1]].forEach(([p, id]) => {
          g.beginPath(); g.moveTo(p[0][0], p[0][1]); g.lineTo(p[1][0], p[1][1]); g.lineTo(p[2][0], p[2][1]); g.closePath();
          g.fillStyle = slingFlash[id] > gt ? '#ffffa0' : '#3050a0'; g.fill();
          g.strokeStyle = '#f0f0f0'; g.lineWidth = 5; g.lineJoin = 'round'; g.stroke();
        });
        // drop targets
        drops.forEach(d => {
          if (d.down) { g.fillStyle = 'rgba(255,140,40,0.2)'; g.fillRect(d.ax, 343, d.bx - d.ax, 6); return; }
          g.fillStyle = '#ff9030'; g.fillRect(d.ax - 1, 341, d.bx - d.ax + 2, 10);
          g.fillStyle = '#ffe0a0'; g.fillRect(d.ax + 2, 343, d.bx - d.ax - 4, 2);
        });
        // bumpers
        const bumpCol = [['#e080ff', '#7020a0'], ['#80e0ff', '#1060a0'], ['#ffc070', '#a04010']];
        circles.forEach(c => {
          if (c.kind !== 'bump') return;
          const lit = c.flash > gt, cols = bumpCol[c.id];
          const rg = g.createRadialGradient(c.x - 6, c.y - 6, 2, c.x, c.y, c.r);
          rg.addColorStop(0, lit ? '#fff' : cols[0]); rg.addColorStop(1, lit ? cols[0] : cols[1]);
          g.fillStyle = rg; g.beginPath(); g.arc(c.x, c.y, c.r, 0, Math.PI * 2); g.fill();
          g.strokeStyle = lit ? '#fff' : 'rgba(255,255,255,0.6)'; g.lineWidth = 2; g.beginPath(); g.ellipse(c.x, c.y, c.r + 6, 5, -0.3, 0, Math.PI * 2); g.stroke();
        });
        // flippers
        flips.forEach(f => {
          const dx = Math.cos(f.th), dy = Math.sin(f.th), tx = f.px + dx * FL, ty = f.py + dy * FL, nx = -dy, ny = dx;
          g.beginPath();
          g.moveTo(f.px + nx * PIV_R, f.py + ny * PIV_R); g.lineTo(tx + nx * TIP_R, ty + ny * TIP_R);
          g.arc(tx, ty, TIP_R, Math.atan2(ny, nx), Math.atan2(-ny, -nx));
          g.lineTo(f.px - nx * PIV_R, f.py - ny * PIV_R);
          g.arc(f.px, f.py, PIV_R, Math.atan2(-ny, -nx), Math.atan2(ny, nx));
          g.closePath();
          g.fillStyle = tilted ? '#666' : '#e8e8f0'; g.fill(); g.strokeStyle = '#ff3060'; g.lineWidth = 2.5; g.stroke();
          g.fillStyle = '#ff3060'; g.beginPath(); g.arc(f.px, f.py, 3, 0, Math.PI * 2); g.fill();
        });
        // plunger
        const py = plunger.ay;
        g.strokeStyle = '#999'; g.lineWidth = 2; g.beginPath();
        for (let i = 0; i <= 8; i++) { const y = py + 4 + i * (740 - py - 4) / 8; g.lineTo(i % 2 ? 358 : 372, y); }
        g.stroke();
        g.fillStyle = '#d0d0d0'; g.fillRect(352, py, 26, 5);
        if (pulling || pull > 0) { g.fillStyle = '#300'; g.fillRect(384, 600, 10, 120); g.fillStyle = pull > 0.85 ? '#ff4040' : '#ffd040'; g.fillRect(384, 720 - 120 * pull, 10, 120 * pull); }
        // ball
        if (ball.live) {
          const rg = g.createRadialGradient(ball.x - 3, ball.y - 3, 1, ball.x, ball.y, R);
          rg.addColorStop(0, '#fff'); rg.addColorStop(0.5, '#c8c8d8'); rg.addColorStop(1, '#505068');
          g.fillStyle = rg; g.beginPath(); g.arc(ball.x, ball.y, R, 0, Math.PI * 2); g.fill();
        }
        // overlays
        if (state === 'attract' || state === 'over' || paused) {
          g.fillStyle = 'rgba(0,0,20,0.72)'; g.fillRect(40, 150, 290, 300);
          g.strokeStyle = '#6080ff'; g.lineWidth = 2; g.strokeRect(40, 150, 290, 300);
          g.textAlign = 'center'; g.fillStyle = '#ffd040'; g.font = 'bold 24px Tahoma, Verdana, sans-serif';
          g.fillText(paused ? 'PAUSED' : state === 'over' ? 'GAME OVER' : 'NEBULA PINBALL', 185, 190);
          g.font = '13px Tahoma, Verdana, sans-serif'; g.fillStyle = '#fff';
          if (paused) { g.fillText('Click the table or press any key', 185, 230); g.fillText('to continue.', 185, 250); }
          else {
            if (state === 'over') g.fillText('Final score ' + fmt(score), 185, 218);
            g.fillStyle = '#9fb0ff'; g.fillText('HIGH SCORES', 185, 250);
            g.fillStyle = '#fff'; g.font = '12px Tahoma, Verdana, sans-serif';
            if (!hi.length) g.fillText('No scores yet', 185, 275);
            hi.forEach((h, i) => { g.textAlign = 'left'; g.fillText(`${i + 1}. ${String(h.n).slice(0, 14)}`, 70, 275 + i * 20); g.textAlign = 'right'; g.fillText(fmt(h.s), 300, 275 + i * 20); });
            g.textAlign = 'center'; g.fillStyle = blink ? '#ffd040' : '#a08020'; g.font = 'bold 13px Tahoma, Verdana, sans-serif';
            g.fillText('Press Launch or Space to play', 185, 420);
          }
        }
        updateHud();
      }
      function updateHud() {
        const m = paused ? 'PAUSED - PRESS P' : gt < msgUntil ? msg : state === 'play' && ball.live && ball.x > 350 && ball.y > 600 ? 'HOLD LAUNCH, THEN RELEASE' : state === 'attract' ? 'INSERT COIN... JUST KIDDING. PRESS LAUNCH' : state === 'over' ? 'GAME OVER' : '';
        const inf = state === 'attract' ? 'FREE PLAY' : `BALL ${Math.min(ballNo, balls)}/${balls}  ${mult}X`;
        const key = score + '|' + m + '|' + inf;
        if (key === hudCache) return;
        hudCache = key;
        scEl.textContent = fmt(score); msgEl.textContent = m; infEl.textContent = inf;
      }
      function frame(t) {
        raf = requestAnimationFrame(frame);
        const active = W.el ? W.el.classList.contains('active') && !W.minimized : true;
        if (!active && !paused && (state === 'play' || state === 'bonus')) pause();
        if (paused) { if (!pauseDrawn) { draw(); pauseDrawn = true; } lastT = t; return; }
        let dt = lastT ? (t - lastT) / 1000 : 0; lastT = t;
        dt = Math.min(dt, 0.05);
        acc += dt;
        let n = 0;
        while (acc >= STEP && n < 60) { step(STEP); acc -= STEP; n++; }
        if (n >= 60) acc = 0;
        draw();
      }

      /* ---------- menus + lifecycle ---------- */
      const howTo = () => api.msgBox('How to play Nebula Pinball', 'Launch: hold Space or Down arrow (or hold the Launch button) to pull back the plunger, then let go. The longer you hold, the harder the shot.\n\nFlippers: Z, A or Left arrow for the left flipper; / , L or Right arrow for the right flipper. On a touch screen, press and hold the left or right half of the table, or use the Flip buttons.\n\nScoring:\n- Pop bumpers 100\n- Roll through all three I-O-N lanes to raise the bonus multiplier (up to 5X). Flippers move the lit lanes.\n- Knock down all three centre drop targets to light the JACKPOT, then shoot the left orbit to collect 25,000.\n- Every orbit shot is worth 5,000.\n- Hitting a top lane right after the launch is a SKILL SHOT worth 10,000.\n\nBall save protects you for the first 10 seconds of each ball. You get 3 balls.\n\nNudge: N key, Up arrow or the Nudge button. Nudge too much and you TILT (flippers go dead and you lose your bonus).\n\nP pauses. You earn $1 for every 25,000 points (up to $6) when the game ends.');
      const showHi = () => api.msgBox('Nebula Pinball high scores', hi.length ? hi.map((h, i) => `${i + 1}.  ${h.n}  ${fmt(h.s)}  (${h.d})`).join('\n') : 'No high scores yet. Go set one!');
      api.menubar([
        { label: 'Game', items: () => [{ label: 'New game', fn: newGame }, { label: paused ? 'Resume' : 'Pause', fn: () => (paused ? resume() : pause()), disabled: state !== 'play' && state !== 'bonus' && !paused }, '-', { label: 'High scores', fn: showHi }, { label: 'How to play', fn: howTo }, '-', { label: 'Exit', fn: () => api.close() }] },
        { label: 'Options', items: () => [{ label: (nudgeOn ? '* ' : '   ') + 'Allow nudging', fn: () => { nudgeOn = !nudgeOn; api.save('nudge', nudgeOn); } }, { label: (soundOn ? '* ' : '   ') + 'Sound effects', fn: () => { soundOn = !soundOn; api.save('sound', soundOn); } }, '-', { label: 'Clear high scores', fn: () => api.msgBox('Nebula Pinball', 'Clear the high score table?', ['Yes', 'No'], 'warn').then(r => { if (r === 'Yes') { hi = []; api.save('hi', hi); pauseDrawn = false; } }) }] }
      ]);
      let closed = false;
      W.onMin = () => pause();
      W.onResize = () => resize();
      const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => resize()) : null;
      if (ro) ro.observe(wrap);
      W.onClose = () => {
        closed = true; cancelAnimationFrame(raf);
        document.removeEventListener('keyup', onKeyUp); window.removeEventListener('blur', onBlur);
        if (ro) ro.disconnect();
      };
      resize();
      raf = requestAnimationFrame(frame);
    }
  });
})();
