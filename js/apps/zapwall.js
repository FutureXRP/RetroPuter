/* Atom Trap: a store arcade-puzzle game (1995). Bouncing atoms fill a lab chamber. Click to fire a
   force wall that grows in two directions; finished walls seal off empty space. Capture 75% of the
   chamber to clear a level. An atom that touches a wall while it is still growing breaks it (and costs a life). */
(function () {
  'use strict';
  const WALL_SPEED = 13;        // cells per second, each half
  const GOAL = 75;              // percent to clear a level
  const R = 0.4;                // atom radius, in cells
  const STEP = 1 / 240;         // physics step

  function open(W, api) {
    W.body.innerHTML = `<div class="zw">
      <div class="zw-hud">
        <div class="zw-st sunken"><span>Level</span><b class="zw-lv">1</b></div>
        <div class="zw-st sunken"><span>Lives</span><b class="zw-li">3</b></div>
        <div class="zw-st sunken zw-wide"><span>Captured</span><div class="zw-meter"><i class="zw-fill"></i><em></em></div><b class="zw-pc">0%</b></div>
        <div class="zw-st sunken"><span>Bonus</span><b class="zw-tm">0</b></div>
        <div class="zw-st sunken"><span>Score</span><b class="zw-sc">0</b></div>
      </div>
      <div class="zw-stage"><canvas class="zw-cv" aria-label="Atom Trap chamber"></canvas><div class="zw-ov"></div></div>
      <div class="zw-bar"><button class="btn zw-dir" data-a="dir" title="Switch wall direction (right-click, R key, or swipe)"></button><span class="zw-tip"></span><button class="btn" data-a="pause">Pause</button></div>
    </div>`;
    const $ = s => W.body.querySelector(s);
    const cv = $('.zw-cv'), g = cv.getContext('2d'), stage = $('.zw-stage'), ov = $('.zw-ov'), tip = $('.zw-tip'), dirBtn = $('.zw-dir');
    const hud = { lv: $('.zw-lv'), li: $('.zw-li'), pc: $('.zw-pc'), tm: $('.zw-tm'), sc: $('.zw-sc'), fill: $('.zw-fill') };

    let opts = Object.assign({ relaxed: false, sound: true }, api.load('opts', {}));
    let hor = api.load('hor', false);
    let cols = 30, rows = 20, grid, fillT, filledN = 0;
    let atoms = [], wall = null, floats = [], sparks = [];
    let mode = 'title', paused = false, level = 1, lives = 3, score = 0, timeLeft = 0, clock = 0;
    let cs = 20, bx = 0, by = 0, dpr = 1, bw = 0, bh = 0;
    let raf = 0, last = 0, acc = 0, hover = null, kbd = null, down = null, earnedLevels = {};
    let tickCell = 0;
    const hi = () => api.load('hi', []);
    const snd = (fn) => { if (opts.sound) fn(); };

    /* ---------- geometry ---------- */
    function resize() {
      const r = stage.getBoundingClientRect();
      bw = Math.max(160, r.width); bh = Math.max(160, r.height);
      dpr = window.devicePixelRatio || 1;
      cv.width = Math.round(bw * dpr); cv.height = Math.round(bh * dpr);
      cv.style.width = bw + 'px'; cv.style.height = bh + 'px';
      if (mode === 'title' && grid) setupBoard(4); else layout();
    }
    function layout() {
      cs = Math.max(6, Math.floor(Math.min((bw - 12) / cols, (bh - 12) / rows)));
      bx = Math.floor((bw - cs * cols) / 2); by = Math.floor((bh - cs * rows) / 2);
      cv.dataset.board = [bx, by, cs, cols, rows].join(',');
    }
    W.onResize = () => setTimeout(resize, 0);
    const ro = window.ResizeObserver ? new ResizeObserver(() => resize()) : null;
    if (ro) ro.observe(stage);

    /* ---------- level setup ---------- */
    function pickShape() {
      const r = stage.getBoundingClientRect();
      const ar = r.height / Math.max(1, r.width);
      if (ar > 1.1) { cols = 20; rows = Math.max(24, Math.min(32, Math.round(20 * ar))); }
      else { rows = 20; cols = Math.max(24, Math.min(34, Math.round(20 / Math.max(0.1, ar)))); }
    }
    function atomSpeed() { return Math.min(6.5, 4.4 + level * 0.18) * (opts.relaxed ? 0.62 : 1); }
    function setupBoard(nAtoms) {
      pickShape(); layout();
      grid = new Uint8Array(cols * rows); fillT = new Float32Array(cols * rows); filledN = 0;
      atoms = []; wall = null; floats = []; sparks = [];
      const sp = atomSpeed();
      for (let i = 0; i < nAtoms; i++) {
        let x, y, ok, tries = 0;
        do {
          x = 1 + Math.random() * (cols - 2); y = 1 + Math.random() * (rows - 2);
          ok = atoms.every(a => Math.hypot(a.x - x, a.y - y) > 2.2);
        } while (!ok && ++tries < 200);
        atoms.push({ x, y, vx: sp * (Math.random() < 0.5 ? -1 : 1), vy: sp * (Math.random() < 0.5 ? -1 : 1), ph: Math.random() * 6.28, spin: 2 + Math.random() * 2 });
      }
    }
    function newGame() {
      level = 1; lives = 3; score = 0; earnedLevels = {};
      startLevel();
    }
    function startLevel() {
      setupBoard(level + 1);
      timeLeft = 40 + level * 15; mode = 'play'; paused = false; clock = 0;
      hideOv();
      setTip(`Level ${level}: ${level + 1} atoms. Seal off ${GOAL}% of the chamber.`);
      snd(() => { [392, 523, 659].forEach((f, i) => api.tone(f, 0.12, { type: 'square', vol: 0.05, at: i * 0.08 })); });
      updHud(true);
    }
    function setTip(t) { tip.textContent = t; }
    function setDir(h, quiet) {
      hor = h; api.save('hor', hor);
      dirBtn.innerHTML = hor ? '<span class="zw-arr">&#8596;</span> Across' : '<span class="zw-arr">&#8597;</span> Up/Down';
      cv.style.cursor = hor ? 'ew-resize' : 'ns-resize';
      if (!quiet) snd(() => api.tone(hor ? 880 : 660, 0.05, { type: 'square', vol: 0.04 }));
    }

    /* ---------- grid helpers ---------- */
    const solid = (cx, cy) => cx < 0 || cy < 0 || cx >= cols || cy >= rows || grid[cy * cols + cx] !== 0;
    function fillCell(i, delay) { if (grid[i]) return 0; grid[i] = 1; fillT[i] = clock + (delay || 0); filledN++; return 1; }
    const pct = () => Math.floor(filledN * 100 / (cols * rows));

    /* ---------- walls ---------- */
    function tryBuild(cx, cy) {
      if (mode !== 'play' || paused) return;
      if (wall) { setTip('Wait for the current wall to finish.'); snd(() => api.tone(150, 0.06, { type: 'square', vol: 0.04 })); return; }
      if (cx < 0 || cy < 0 || cx >= cols || cy >= rows || solid(cx, cy)) { snd(() => api.tone(150, 0.06, { type: 'square', vol: 0.04 })); return; }
      const o = hor ? cx : cy, line = hor ? cy : cx;
      wall = { hor, o, line, a: { head: o + 0.5, done: false, dead: false }, b: { head: o + 0.5, done: false, dead: false } };
      tickCell = 0;
      snd(() => { api.tone(220, 0.09, { type: 'square', vol: 0.05 }); api.noise(0.08, { ft: 'highpass', f: 3000, vol: 0.04 }); });
    }
    const at = (w, p) => w.hor ? solid(p, w.line) : solid(w.line, p);
    const idx = (w, p) => w.hor ? w.line * cols + p : p * cols + w.line;
    function limitA(w) { let c = w.o - 1; while (c >= 0 && !at(w, c)) c--; return c + 1; }
    function limitB(w) { const n = w.hor ? cols : rows; let c = w.o + 1; while (c < n && !at(w, c)) c++; return c; }
    function halfRect(w, h, which) {
      const lo = which === 'a' ? h.head : w.o + 0.5, hi2 = which === 'a' ? w.o + 0.5 : h.head;
      return w.hor ? { x0: lo, x1: hi2, y0: w.line, y1: w.line + 1 } : { x0: w.line, x1: w.line + 1, y0: lo, y1: hi2 };
    }
    function circleHits(a, r) {
      const nx = Math.max(r.x0, Math.min(a.x, r.x1)), ny = Math.max(r.y0, Math.min(a.y, r.y1));
      return (a.x - nx) ** 2 + (a.y - ny) ** 2 < R * R;
    }
    function completeHalf(which) {
      const w = wall, h = w[which];
      h.done = true;
      const lo = which === 'a' ? Math.round(h.head) : w.o, hi2 = which === 'a' ? w.o : Math.round(h.head) - 1;
      let n = 0;
      for (let p = lo; p <= hi2; p++) n += fillCell(idx(w, p), Math.abs(p - w.o) * 0.01);
      score += n * level;
      snd(() => { api.tone(660, 0.1, { type: 'triangle', vol: 0.08 }); api.tone(990, 0.14, { type: 'triangle', vol: 0.06, at: 0.06 }); });
      capture();
    }
    function breakHalf(which, atom) {
      const w = wall, h = w[which];
      h.dead = true;
      const r = halfRect(w, h, which);
      for (let k = 0; k < 26; k++) {
        const t = Math.random();
        sparks.push({ x: w.hor ? r.x0 + (r.x1 - r.x0) * t : w.line + 0.5, y: w.hor ? w.line + 0.5 : r.y0 + (r.y1 - r.y0) * t,
          vx: (Math.random() - 0.5) * 9, vy: (Math.random() - 0.5) * 9, l: 0.5 + Math.random() * 0.4 });
      }
      lives--;
      floats.push({ x: atom.x, y: atom.y, t: 1.2, text: 'ZAP!', c: '#ff6a5a' });
      snd(() => { api.noise(0.35, { ft: 'lowpass', f: 1100, vol: 0.12, decay: 1 }); api.tone(520, 0.45, { to: 70, type: 'sawtooth', vol: 0.06 }); });
      updHud(true);
      if (lives <= 0) { lives = 0; setTimeout(gameOver, 500); mode = 'dying'; }
      else setTip(lives === 1 ? 'Careful! Last life.' : `An atom broke your wall. ${lives} lives left.`);
    }
    function wallDone() {
      const w = wall;
      if ((w.a.done || w.a.dead) && (w.b.done || w.b.dead)) { wall = null; if (/^Wait/.test(tip.textContent)) setTip(`Level ${level}: capture ${GOAL}%.`); }
    }

    /* ---------- capture ---------- */
    function capture() {
      const n = cols * rows, lab = new Int32Array(n).fill(-1), hasAtom = new Uint8Array(n);
      atoms.forEach(a => {
        for (let yy = Math.floor(a.y - R); yy <= Math.floor(a.y + R); yy++)
          for (let xx = Math.floor(a.x - R); xx <= Math.floor(a.x + R); xx++)
            if (xx >= 0 && yy >= 0 && xx < cols && yy < rows) hasAtom[yy * cols + xx] = 1;
      });
      let got = 0; const stack = [];
      for (let s = 0; s < n; s++) {
        if (grid[s] || lab[s] >= 0) continue;
        const cells = []; let live = false;
        lab[s] = s; stack.push(s);
        while (stack.length) {
          const c = stack.pop(); cells.push(c); if (hasAtom[c]) live = true;
          const x = c % cols, y = (c / cols) | 0;
          const nb = [x > 0 ? c - 1 : -1, x < cols - 1 ? c + 1 : -1, y > 0 ? c - cols : -1, y < rows - 1 ? c + cols : -1];
          for (const d of nb) if (d >= 0 && !grid[d] && lab[d] < 0) { lab[d] = s; stack.push(d); }
        }
        if (!live) cells.forEach((c, i) => { got += fillCell(c, Math.min(0.35, i * 0.004)); });
      }
      if (got) {
        const pts = got * 2 * level;
        score += pts;
        const w = wall;
        const fx = w ? (w.hor ? w.o + 0.5 : w.line + 0.5) : cols / 2, fy = w ? (w.hor ? w.line + 0.5 : w.o + 0.5) : rows / 2;
        floats.push({ x: fx, y: fy, t: 1.4, text: '+' + pts, c: '#fff27a' });
        snd(() => {
          const notes = Math.min(7, 2 + Math.floor(got / 25));
          for (let i = 0; i < notes; i++) api.tone(392 * Math.pow(2, [0, 4, 7, 12, 16, 19, 24][i] / 12), 0.12, { type: 'square', vol: 0.045, at: i * 0.055 });
          api.noise(0.25, { ft: 'bandpass', f: 1800, q: 0.8, vol: 0.04 });
        });
      }
      updHud(true);
      if (pct() >= GOAL && mode === 'play') setTimeout(levelClear, 350);
    }

    /* ---------- simulation ---------- */
    function stepAtoms(dt) {
      for (const a of atoms) {
        // x axis
        let nx = a.x + a.vx * dt, ex = nx + Math.sign(a.vx) * R, hitX = false;
        for (const oy of [-R * 0.85, 0, R * 0.85]) if (solid(Math.floor(ex), Math.floor(a.y + oy))) { hitX = true; break; }
        if (hitX) a.vx = -a.vx; else a.x = nx;
        let ny = a.y + a.vy * dt, ey = ny + Math.sign(a.vy) * R, hitY = false;
        for (const ox of [-R * 0.85, 0, R * 0.85]) if (solid(Math.floor(a.x + ox), Math.floor(ey))) { hitY = true; break; }
        if (hitY) a.vy = -a.vy; else a.y = ny;
        if (!hitX && !hitY) {
          // corner check on the diagonal
          const cx = Math.floor(a.x + Math.sign(a.vx) * R * 0.8), cy = Math.floor(a.y + Math.sign(a.vy) * R * 0.8);
          if (solid(cx, cy) && !solid(Math.floor(a.x), Math.floor(a.y))) { a.vx = -a.vx; a.vy = -a.vy; }
        }
      }
      // atom-atom bounces: swap velocities when approaching
      for (let i = 0; i < atoms.length; i++) for (let j = i + 1; j < atoms.length; j++) {
        const p = atoms[i], q = atoms[j], dx = q.x - p.x, dy = q.y - p.y;
        if (dx * dx + dy * dy < 4 * R * R && (q.vx - p.vx) * dx + (q.vy - p.vy) * dy < 0) {
          const tx = p.vx, ty = p.vy; p.vx = q.vx; p.vy = q.vy; q.vx = tx; q.vy = ty;
        }
      }
    }
    function stepWall(dt) {
      const w = wall; if (!w) return;
      for (const which of ['a', 'b']) {
        const h = w[which]; if (h.done || h.dead) continue;
        if (which === 'a') { const lim = limitA(w); h.head = Math.max(lim, h.head - WALL_SPEED * dt); if (h.head <= lim + 1e-6) { h.head = lim; } }
        else { const lim = limitB(w); h.head = Math.min(lim, h.head + WALL_SPEED * dt); if (h.head >= lim - 1e-6) { h.head = lim; } }
        const r = halfRect(w, h, which);
        const hit = atoms.find(a => circleHits(a, r));
        if (hit) { breakHalf(which, hit); continue; }
        const ext = Math.abs(h.head - (w.o + 0.5));
        if (Math.floor(ext) > tickCell) { tickCell = Math.floor(ext); snd(() => api.tone(420 + tickCell * 28, 0.025, { type: 'square', vol: 0.02 })); }
        if (which === 'a' ? h.head <= limitA(w) + 1e-6 : h.head >= limitB(w) - 1e-6) completeHalf(which);
      }
      if (wall) wallDone();
    }
    function update(dt) {
      clock += dt;
      if (mode === 'title' || mode === 'play' || mode === 'dying') {
        if (!paused) {
          acc += dt;
          while (acc >= STEP) { acc -= STEP; stepAtoms(STEP); if (mode === 'play') stepWall(STEP); }
          if (mode === 'play') {
            const before = Math.ceil(timeLeft);
            timeLeft = Math.max(0, timeLeft - dt);
            if (Math.ceil(timeLeft) !== before) updHud();
          }
        }
      }
      floats.forEach(f => { f.t -= dt; f.y -= dt * 1.2; }); floats = floats.filter(f => f.t > 0);
      sparks.forEach(s => { s.l -= dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vx *= 0.96; s.vy *= 0.96; }); sparks = sparks.filter(s => s.l > 0);
    }

    /* ---------- drawing ---------- */
    function draw() {
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.fillStyle = '#39434e'; g.fillRect(0, 0, bw, bh);
      // chamber frame
      g.fillStyle = '#1a2027'; g.fillRect(bx - 5, by - 5, cs * cols + 10, cs * rows + 10);
      g.fillStyle = '#9aa6b2'; g.fillRect(bx - 4, by - 4, cs * cols + 8, 1); g.fillRect(bx - 4, by - 4, 1, cs * rows + 8);
      g.fillStyle = '#0a1a2c'; g.fillRect(bx, by, cs * cols, cs * rows);
      // grid lines
      g.fillStyle = '#12304d';
      for (let x = 1; x < cols; x++) g.fillRect(bx + x * cs, by, 1, cs * rows);
      for (let y = 1; y < rows; y++) g.fillRect(bx, by + y * cs, cs * cols, 1);
      // filled plates
      if (grid) for (let i = 0; i < grid.length; i++) {
        if (!grid[i]) continue;
        const age = clock - fillT[i]; if (age < 0) continue;
        const x = bx + (i % cols) * cs, y = by + ((i / cols) | 0) * cs;
        g.fillStyle = '#7d8a98'; g.fillRect(x, y, cs, cs);
        g.fillStyle = '#b9c4cf'; g.fillRect(x, y, cs, 1); g.fillRect(x, y, 1, cs);
        g.fillStyle = '#4c5763'; g.fillRect(x, y + cs - 1, cs, 1); g.fillRect(x + cs - 1, y, 1, cs);
        if (cs >= 12) { g.fillStyle = '#95a2af'; g.fillRect(x + 3, y + 3, 1, 1); g.fillRect(x + cs - 4, y + cs - 4, 1, 1); }
        if (age < 0.45) { g.fillStyle = `rgba(255,248,170,${(1 - age / 0.45) * 0.85})`; g.fillRect(x, y, cs, cs); }
      }
      // growing wall
      const w = wall;
      if (w) for (const which of ['a', 'b']) {
        const h = w[which]; if (h.done || h.dead) continue;
        const r = halfRect(w, h, which);
        const x0 = bx + r.x0 * cs, y0 = by + r.y0 * cs, ww = (r.x1 - r.x0) * cs, hh = (r.y1 - r.y0) * cs;
        g.fillStyle = which === 'a' ? '#f2b705' : '#26c6da'; g.fillRect(x0, y0 + (w.hor ? 1 : 0), ww - (w.hor ? 0 : 0), hh - (w.hor ? 2 : 0));
        if (!w.hor) { g.fillRect(x0 + 1, y0, ww - 2, hh); }
        // moving energy stripes
        g.save(); g.beginPath(); g.rect(x0, y0, ww, hh); g.clip();
        g.fillStyle = which === 'a' ? '#fff3a6' : '#c9fbff';
        const len = w.hor ? ww : hh, off = (clock * 40) % 8;
        for (let s = -8; s < len + 8; s += 8) {
          if (w.hor) g.fillRect(x0 + s + off, y0 + cs / 2 - 1, 3, 2); else g.fillRect(x0 + cs / 2 - 1, y0 + s + off, 2, 3);
        }
        g.restore();
        // head spark
        const hx = w.hor ? bx + h.head * cs : bx + (w.line + 0.5) * cs, hy = w.hor ? by + (w.line + 0.5) * cs : by + h.head * cs;
        g.fillStyle = '#fff'; g.beginPath(); g.arc(hx, hy, Math.max(2, cs * 0.22) + Math.sin(clock * 40) * 1, 0, 6.283); g.fill();
      }
      if (w) { // emitter
        const ex = bx + (w.hor ? w.o : w.line) * cs, ey = by + (w.hor ? w.line : w.o) * cs;
        g.fillStyle = '#20262d'; g.fillRect(ex + cs * 0.2, ey + cs * 0.2, cs * 0.6, cs * 0.6);
        g.fillStyle = '#ff5ad2'; g.fillRect(ex + cs * 0.35, ey + cs * 0.35, cs * 0.3, cs * 0.3);
      }
      // sparks
      sparks.forEach(s => { g.fillStyle = s.l > 0.3 ? '#fff6b0' : '#ff9a3a'; g.fillRect(bx + s.x * cs - 1, by + s.y * cs - 1, 2, 2); });
      // atoms
      atoms.forEach(a => drawAtom(bx + a.x * cs, by + a.y * cs, R * cs, a.ph + clock * a.spin));
      // preview / keyboard cursor
      const cur = mode === 'play' && !paused && !wall ? (kbd || hover) : null;
      if (cur && cur.x >= 0 && cur.y >= 0 && cur.x < cols && cur.y < rows && !solid(cur.x, cur.y)) {
        const x = bx + cur.x * cs, y = by + cur.y * cs;
        g.strokeStyle = kbd ? '#ffffff' : 'rgba(255,255,255,.55)'; g.lineWidth = 1;
        g.strokeRect(x + 0.5, y + 0.5, cs - 1, cs - 1);
        g.fillStyle = 'rgba(255,255,255,.7)';
        const m = cs / 2, k = Math.max(3, cs * 0.28);
        g.beginPath();
        if (hor) { g.moveTo(x - k * 0.6, y + m); g.lineTo(x + 1, y + m - k * 0.6); g.lineTo(x + 1, y + m + k * 0.6); g.moveTo(x + cs + k * 0.6, y + m); g.lineTo(x + cs - 1, y + m - k * 0.6); g.lineTo(x + cs - 1, y + m + k * 0.6); }
        else { g.moveTo(x + m, y - k * 0.6); g.lineTo(x + m - k * 0.6, y + 1); g.lineTo(x + m + k * 0.6, y + 1); g.moveTo(x + m, y + cs + k * 0.6); g.lineTo(x + m - k * 0.6, y + cs - 1); g.lineTo(x + m + k * 0.6, y + cs - 1); }
        g.fill();
      }
      // floating text
      g.textAlign = 'center'; g.textBaseline = 'middle';
      floats.forEach(f => {
        g.globalAlpha = Math.min(1, f.t * 2);
        g.font = `bold ${Math.max(12, cs * 0.8)}px Arial, sans-serif`;
        g.fillStyle = '#000'; g.fillText(f.text, bx + f.x * cs + 1, by + f.y * cs + 1);
        g.fillStyle = f.c; g.fillText(f.text, bx + f.x * cs, by + f.y * cs);
      });
      g.globalAlpha = 1;
    }
    function drawAtom(x, y, r, ph) {
      // orbits
      g.save(); g.translate(x, y);
      g.strokeStyle = 'rgba(120,230,255,.75)'; g.lineWidth = Math.max(1, r * 0.1);
      for (let k = 0; k < 3; k++) {
        g.save(); g.rotate(k * 2.094 + ph * 0.2);
        g.beginPath(); g.ellipse(0, 0, r * 1.05, r * 0.38, 0, 0, 6.283); g.stroke();
        const e = ph * (1 + k * 0.3) + k;
        g.fillStyle = '#e8ffff'; g.beginPath(); g.arc(Math.cos(e) * r * 1.05, Math.sin(e) * r * 0.38, Math.max(1.2, r * 0.13), 0, 6.283); g.fill();
        g.restore();
      }
      // nucleus
      const n = Math.max(1.5, r * 0.26);
      g.fillStyle = '#e02448'; g.beginPath(); g.arc(-n * 0.5, -n * 0.3, n, 0, 6.283); g.fill();
      g.fillStyle = '#3d6cf2'; g.beginPath(); g.arc(n * 0.55, -n * 0.2, n, 0, 6.283); g.fill();
      g.fillStyle = '#e02448'; g.beginPath(); g.arc(0.1 * n, n * 0.55, n, 0, 6.283); g.fill();
      g.fillStyle = 'rgba(255,255,255,.6)'; g.fillRect(-n * 0.8, -n * 0.8, Math.max(1, n * 0.5), Math.max(1, n * 0.5));
      g.restore();
    }

    /* ---------- HUD & overlays ---------- */
    let hudCache = '';
    function updHud(force) {
      const p = grid ? pct() : 0, t = Math.ceil(timeLeft);
      const key = [level, lives, p, t, score].join('|');
      if (!force && key === hudCache) return; hudCache = key;
      hud.lv.textContent = level; hud.li.textContent = lives; hud.pc.textContent = p + '%';
      hud.tm.textContent = t; hud.sc.textContent = score.toLocaleString();
      hud.fill.style.width = Math.min(100, p) + '%';
      hud.fill.classList.toggle('zw-ok', p >= GOAL);
    }
    function showOv(html) { ov.innerHTML = `<div class="zw-panel raised">${html}</div>`; ov.style.display = 'flex'; }
    function hideOv() { ov.style.display = 'none'; ov.innerHTML = ''; }
    function titleScreen() {
      mode = 'title'; paused = false; level = 1; setupBoard(4); timeLeft = 0; score = 0; lives = 3; updHud(true);
      const b = hi()[0];
      showOv(`<div class="zw-logo">ATOM<span>TRAP</span></div>
        <p>Seal the atoms into smaller and smaller spaces.<br>Capture ${GOAL}% of the chamber to clear each level.</p>
        <div class="zw-btns"><button class="btn" data-a="start">Start game</button><button class="btn" data-a="relaxed">${opts.relaxed ? 'Normal speed' : 'Relaxed speed'}</button></div>
        <div class="zw-btns"><button class="btn" data-a="howto">How to play</button><button class="btn" data-a="scores">High scores</button></div>
        <p class="zw-small">${opts.relaxed ? 'Relaxed speed is on: atoms move slower.' : 'Normal speed.'}${b ? ` Best: ${b.s.toLocaleString()} by ${api.esc(b.n)}` : ''}</p>`);
      setTip('Click or tap Start game.');
    }
    function levelClear() {
      if (mode !== 'play') return;
      mode = 'clear'; wall = null;
      const p = pct(), tb = Math.ceil(timeLeft) * 10 * level, ab = Math.max(0, p - GOAL) * 30 * level;
      score += tb + ab; lives = Math.min(9, lives + 1);
      snd(() => api.sfx.tada());
      let money = '';
      if (level % 2 === 0 && !earnedLevels[level]) {
        earnedLevels[level] = 1;
        const amt = Math.min(5, 1 + level / 2);
        api.earn(amt, `reaching Atom Trap level ${level + 1}`);
        money = `<p class="zw-money">Lab grant: $${amt}.00 for reaching level ${level + 1}!</p>`;
      }
      updHud(true);
      showOv(`<h3>Level ${level} cleared!</h3>
        <table class="zw-tbl"><tr><td>Captured</td><td>${p}%</td></tr><tr><td>Speed bonus</td><td>${tb.toLocaleString()}</td></tr><tr><td>Extra area bonus</td><td>${ab.toLocaleString()}</td></tr><tr><td>Bonus life</td><td>+1</td></tr><tr class="zw-tot"><td>Score</td><td>${score.toLocaleString()}</td></tr></table>
        ${money}<p class="zw-small">Next: ${level + 2} atoms.</p>
        <div class="zw-btns"><button class="btn" data-a="next">Next level</button></div>`);
      setTip('Level cleared!');
      setTimeout(() => { const nb = ov.querySelector('[data-a=next]'); nb && nb.focus(); }, 30);
    }
    function gameOver() {
      mode = 'over'; wall = null;
      snd(() => { [392, 330, 262, 196].forEach((f, i) => api.tone(f, 0.22, { type: 'triangle', vol: 0.08, at: i * 0.18 })); });
      const list = hi(); const entry = { s: score, l: level, n: api.user || 'Player', d: Date.now() };
      list.push(entry); list.sort((a, b) => b.s - a.s); const top = list.slice(0, 8); api.save('hi', top);
      const rank = top.indexOf(entry);
      showOv(`<h3>Game over</h3><p>You reached level ${level} with ${score.toLocaleString()} points.</p>
        ${rank >= 0 && score > 0 ? `<p class="zw-money">${rank === 0 ? 'A new lab record!' : `You placed #${rank + 1} on the high score list.`}</p>` : ''}
        ${scoreTable(top, entry)}
        <div class="zw-btns"><button class="btn" data-a="start">Play again</button><button class="btn" data-a="title">Title screen</button></div>`);
      setTip('Game over.');
    }
    function scoreTable(list, mark) {
      if (!list.length) return '<p>No scores yet. Go trap some atoms!</p>';
      return `<table class="zw-tbl zw-hs">${list.map((h, i) => `<tr${h === mark ? ' class="zw-me"' : ''}><td>${i + 1}.</td><td>${api.esc(h.n)}</td><td>Lv ${h.l}</td><td>${h.s.toLocaleString()}</td></tr>`).join('')}</table>`;
    }
    function showScores() {
      if (mode === 'play' && !paused) togglePause();
      api.msgBox('Atom Trap high scores', hi().length ? hi().map((h, i) => `${i + 1}. ${h.s.toLocaleString()}   level ${h.l}   ${h.n}`).join('\n') : 'No scores yet. Go trap some atoms!');
    }
    const HOWTO = 'Atoms bounce around the chamber. Your job is to fence them into smaller spaces.\n\n' +
      'Click or tap an empty square to fire a force wall. It grows out in both directions until each end reaches a wall.\n\n' +
      'Switch between up/down and across walls with the direction button, a right-click, the R key, or by swiping in the direction you want (the wall starts where your swipe began).\n\n' +
      'If an atom touches a wall while it is still growing, that half breaks and you lose a life. Finished walls are solid and atoms bounce off them.\n\n' +
      'Any space with no atoms in it is sealed off. Capture ' + GOAL + '% of the chamber to clear the level. Level 1 has 2 atoms, level 2 has 3, and so on.\n\n' +
      'Scoring: points for every square you capture, a speed bonus for the time left on the Bonus clock, and an extra-area bonus for every percent over ' + GOAL + '%. You get a bonus life for each level cleared.\n\n' +
      'Keyboard: arrow keys move the cursor, Space or Enter fires a wall, R switches direction, P pauses.';
    function howTo() { const was = mode === 'play' && !paused; if (was) togglePause(); api.msgBox('How to play Atom Trap', HOWTO); }
    function togglePause() {
      if (mode !== 'play') return;
      paused = !paused;
      if (paused) { showOv('<h3>Paused</h3><p>The atoms are waiting.</p><div class="zw-btns"><button class="btn" data-a="resume">Resume</button></div>'); setTip('Paused.'); }
      else { hideOv(); setTip(`Level ${level}: capture ${GOAL}%.`); }
      $('[data-a=pause]').textContent = paused ? 'Resume' : 'Pause';
      snd(() => api.sfx.click());
    }

    /* ---------- input ---------- */
    const cellAt = (px, py) => ({ x: Math.floor((px - bx) / cs), y: Math.floor((py - by) / cs) });
    const local = e => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    cv.addEventListener('contextmenu', e => e.preventDefault());
    cv.addEventListener('pointerdown', e => {
      e.preventDefault();
      if (e.button === 2) { setDir(!hor); return; }
      if (mode !== 'play' || paused) return;
      const p = local(e); down = { x: p.x, y: p.y, id: e.pointerId };
      try { cv.setPointerCapture(e.pointerId); } catch (_) {}
    });
    cv.addEventListener('pointermove', e => {
      const p = local(e);
      if (e.pointerType === 'mouse') { hover = cellAt(p.x, p.y); kbd = null; }
    });
    cv.addEventListener('pointerleave', () => { hover = null; });
    cv.addEventListener('pointerup', e => {
      if (!down || down.id !== e.pointerId) return;
      const p = local(e), dx = p.x - down.x, dy = p.y - down.y, d0 = down; down = null;
      if (Math.hypot(dx, dy) > Math.max(16, cs * 0.9)) setDir(Math.abs(dx) > Math.abs(dy), true);
      const c = cellAt(d0.x, d0.y); tryBuild(c.x, c.y);
    });
    cv.addEventListener('pointercancel', () => { down = null; });
    W.body.addEventListener('click', e => {
      const b = e.target.closest('[data-a]'); if (!b) return;
      const a = b.dataset.a;
      if (a === 'dir') setDir(!hor);
      else if (a === 'pause') { if (mode === 'play') togglePause(); }
      else if (a === 'resume') togglePause();
      else if (a === 'start') { snd(() => api.sfx.click()); newGame(); }
      else if (a === 'relaxed') { opts.relaxed = !opts.relaxed; api.save('opts', opts); titleScreen(); }
      else if (a === 'howto') howTo();
      else if (a === 'scores') showScores();
      else if (a === 'next') { level++; startLevel(); }
      else if (a === 'title') titleScreen();
    });
    W.onKey = e => {
      const k = e.key;
      if (k === 'p' || k === 'P') { e.preventDefault(); togglePause(); return; }
      if (k === 'r' || k === 'R' || k === 'Tab') { e.preventDefault(); setDir(!hor); return; }
      if (k === 'F2') { e.preventDefault(); newGame(); return; }
      if (mode !== 'play') { if ((k === 'Enter' || k === ' ') && !ov.contains(document.activeElement)) { const b = ov.querySelector('.btn'); if (b) { e.preventDefault(); b.click(); } } return; }
      if (paused) { if (k === ' ' || k === 'Enter') { e.preventDefault(); togglePause(); } return; }
      const mv = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[k];
      if (mv) { e.preventDefault(); if (!kbd) kbd = hover || { x: cols >> 1, y: rows >> 1 }; kbd = { x: Math.max(0, Math.min(cols - 1, kbd.x + mv[0])), y: Math.max(0, Math.min(rows - 1, kbd.y + mv[1])) }; return; }
      if (k === ' ' || k === 'Enter') { e.preventDefault(); const c = kbd || hover || { x: cols >> 1, y: rows >> 1 }; kbd = c; tryBuild(c.x, c.y); }
    };

    /* ---------- loop ---------- */
    function frame(t) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, last ? (t - last) / 1000 : 0); last = t;
      update(dt); draw();
    }

    api.menubar([
      { label: 'Game', items: () => [
        { label: 'New game', fn: () => newGame() },
        { label: paused ? 'Resume' : 'Pause', fn: togglePause, disabled: mode !== 'play' }, '-',
        { label: 'High scores', fn: showScores },
        { label: 'How to play', fn: howTo }, '-',
        { label: 'Exit', fn: () => api.close() }
      ] },
      { label: 'Options', items: () => [
        { label: (hor ? 'Wall: Across' : 'Wall: Up/Down') + ' (switch)', fn: () => setDir(!hor) },
        { label: (opts.relaxed ? '[x] ' : '[ ] ') + 'Relaxed speed (from next level)', fn: () => { opts.relaxed = !opts.relaxed; api.save('opts', opts); if (mode === 'title') titleScreen(); } },
        { label: (opts.sound ? '[x] ' : '[ ] ') + 'Sound', fn: () => { opts.sound = !opts.sound; api.save('opts', opts); } }
      ] }
    ]);
    W.onMin = () => { if (mode === 'play' && !paused) togglePause(); };
    W.onClose = () => { cancelAnimationFrame(raf); raf = 0; if (ro) ro.disconnect(); };
    setDir(hor, true);
    resize();
    titleScreen();
    raf = requestAnimationFrame(frame);
  }

  (window.RETRO_APPS = window.RETRO_APPS || []).push({
    id: 'zapwall', label: 'Atom Trap', kind: 'store', cat: 'game', year: 1995, price: 14.95, sizeKB: 1150,
    help: 'Build force walls to trap bouncing atoms in smaller and smaller spaces. Clear levels to earn money.',
    publisher: 'Quark Street Software', genre: 'Arcade puzzle',
    tagline: 'Fence in the atoms. Split the chamber.',
    blurb: 'Bouncing atoms are loose in the lab! Fire force walls that grow in two directions to seal them into smaller and smaller spaces. Capture three-quarters of the chamber to clear a level, but if an atom touches a wall before it is finished, the wall breaks. Every level adds another atom. Includes a relaxed speed for new lab assistants.',
    box: { bg: '#0a1a2c', fg: '#e8ffff', accent: '#f2b705' },
    icon: '<svg viewBox="0 0 32 32" shape-rendering="crispEdges" aria-hidden="true"><rect width="32" height="32" fill="#0a1a2c"/><rect x="0" y="0" width="12" height="32" fill="#7d8a98"/><rect x="11" y="0" width="1" height="32" fill="#4c5763"/><rect x="12" y="14" width="20" height="3" fill="#f2b705"/><rect x="22" y="14" width="10" height="3" fill="#26c6da"/><g fill="none" stroke="#78e6ff"><rect x="15" y="4" width="12" height="6"/><rect x="18" y="1" width="6" height="12"/><rect x="16" y="20" width="10" height="5"/><rect x="18" y="18" width="6" height="10"/></g><rect x="20" y="6" width="3" height="3" fill="#e02448"/><rect x="20" y="21" width="3" height="3" fill="#3d6cf2"/></svg>',
    window: { w: 660, h: 540 },
    css: `.zw{display:flex;flex-direction:column;height:100%;background:#c0c0c0;font-family:var(--ui)}
      .zw-hud{display:flex;flex-wrap:wrap;gap:3px;padding:4px}
      .zw-st{display:flex;align-items:center;justify-content:space-between;gap:5px;padding:2px 6px;background:#000;color:#6f6;font-size:12px;flex:1 1 auto}
      .zw-st span{color:#9c9;font-size:11px}
      .zw-st b{font-family:var(--dos),monospace;font-weight:normal;font-size:14px;color:#7f7;min-width:1.5em;text-align:right}
      .zw-wide{flex:100 1 200px;order:9}
      .zw-meter{position:relative;flex:1;height:10px;background:#123;border:1px solid #365;min-width:50px}
      .zw-fill{position:absolute;left:0;top:0;bottom:0;width:0;background:#3a9;transition:width .3s}
      .zw-fill.zw-ok{background:#fd3}
      .zw-meter em{position:absolute;left:75%;top:-2px;bottom:-2px;width:2px;background:#fff}
      .zw-stage{position:relative;flex:1;min-height:0;margin:0 4px}
      .zw-cv{position:absolute;left:0;top:0;display:block;touch-action:none}
      .zw-ov{position:absolute;inset:0;display:none;align-items:center;justify-content:center;padding:10px;background:rgba(10,26,44,.35)}
      .zw-panel{background:#c0c0c0;padding:12px 16px;max-width:340px;width:100%;text-align:center;font-size:13px;max-height:100%;overflow:auto;box-sizing:border-box}
      .zw-panel h3{margin:0 0 8px;font-size:17px;color:#000080}
      .zw-panel p{margin:6px 0}
      .zw-logo{font:bold 34px Arial Black,Arial,sans-serif;letter-spacing:2px;color:#f2b705;text-shadow:2px 2px 0 #000080,3px 3px 0 #000;margin:2px 0 6px}
      .zw-logo span{color:#26c6da;margin-left:10px}
      .zw-btns{display:flex;gap:6px;justify-content:center;flex-wrap:wrap;margin-top:8px}
      .zw-btns .btn{min-width:110px;padding:5px 10px}
      .zw-small{font-size:11px;color:#333}
      .zw-money{color:#060;font-weight:bold}
      .zw-tbl{margin:6px auto;border-collapse:collapse;font-size:12px}
      .zw-tbl td{padding:2px 8px;text-align:left}
      .zw-tbl td:last-child{text-align:right}
      .zw-tot td{border-top:1px solid #808080;font-weight:bold}
      .zw-hs .zw-me td{background:#000080;color:#fff}
      .zw-bar{display:flex;gap:6px;align-items:center;padding:4px}
      .zw-bar .btn{min-width:0;padding:4px 10px;white-space:nowrap}
      .zw-arr{font-weight:bold}
      .zw-tip{flex:1;min-width:0;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}`,
    open
  });
})();
