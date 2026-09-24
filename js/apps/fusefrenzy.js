/* Fuse Frenzy: a store puzzle game (2000). Rotate fuse tiles to connect the lit matches on the left
   to the fireworks rockets on the right. Connected fuses burn away, rockets launch, new tiles drop in. */
(function () {
  'use strict';
  const DN = 1, DE = 2, DS = 4, DW = 8; // tile ends, as bits
  const DIRS = [[DN, 0, -1, DS], [DE, 1, 0, DW], [DS, 0, 1, DN], [DW, -1, 0, DE]];
  const COLS = 7, ROWS = 8, CELL = 50;
  const LW = 480, LH = 640;                         // logical canvas size
  const GX = 65, GY = 180, SKY = 170;               // grid origin; sky above it
  const rot = m => ((m << 1) | (m >> 3)) & 15;      // clockwise
  const rotCCW = m => ((m >> 1) | ((m & 1) << 3)) & 15;
  const bits = m => (m & 1) + (m >> 1 & 1) + (m >> 2 & 1) + (m >> 3 & 1);
  const ROCKET_COLORS = ['#e8433a', '#3a7be8', '#f0c020', '#34b85a', '#b04ae8', '#f07a20'];

  function randTile(rng, level) {
    const r = rng(), cross = Math.max(0.04, 0.09 - level * 0.006), tee = 0.22;
    let m = r < cross ? 15 : r < cross + tee ? 7 : r < cross + tee + 0.36 ? 3 : 5; // cross, T, corner, straight
    for (let k = rng() * 4 | 0; k > 0; k--) m = rot(m);
    return m;
  }

  function open(W, api) {
    W.body.innerHTML = `<div class="ff"><canvas class="ff-cv" aria-label="Fuse Frenzy board"></canvas>
      <div class="ff-bar"><button class="btn" data-a="pause">Pause</button><span class="ff-tip">Tap a tile to turn it. Connect a match to a rocket!</span><button class="btn" data-a="new">New fuses</button></div></div>`;
    const cv = W.body.querySelector('.ff-cv'), g = cv.getContext('2d'), tip = W.body.querySelector('.ff-tip');
    let scale = 1, ox = 0, oy = 0, dpr = 1;
    let mode = 'title', kind = 'classic', grid, lvl, score, goal, launched, timeLeft, timeMax, paused = false;
    let cursor = { x: 3, y: 4 }, lit = new Set(), anim = null, rockets = [], sparks = [], stars = [], combo = 0, lastT = 0, raf = 0, dirty = true;
    let slotFill = new Array(ROWS).fill(0), matchFlick = 0, bestLevel = 0, earnedRun = 0;
    const hi = () => api.load('hi', []);
    let best = hi()[0];
    const rng = Math.random;
    for (let i = 0; i < 70; i++) stars.push({ x: Math.random() * LW, y: Math.random() * SKY, b: Math.random() });

    /* ---------- sizing ---------- */
    function resize() {
      const box = cv.parentNode.getBoundingClientRect(), bw = Math.max(200, box.width), bh = Math.max(200, box.height - W.body.querySelector('.ff-bar').offsetHeight - 4);
      dpr = window.devicePixelRatio || 1;
      scale = Math.min(bw / LW, bh / LH);
      cv.style.width = bw + 'px'; cv.style.height = bh + 'px';
      cv.width = Math.round(bw * dpr); cv.height = Math.round(bh * dpr);
      ox = (bw - LW * scale) / 2; oy = (bh - LH * scale) / 2;
      dirty = true; draw();
    }
    W.onResize = () => setTimeout(resize, 0);
    const ro = window.ResizeObserver ? new ResizeObserver(() => resize()) : null;
    if (ro) ro.observe(W.body);

    /* ---------- game state ---------- */
    function newGrid() { grid = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => ({ m: randTile(rng, lvl), a: 0, dy: 0, burn: -1 }))); }
    function startGame(k) {
      kind = k; lvl = 1; score = 0; combo = 0; earnedRun = 0; mode = 'play'; paused = false; rockets = []; sparks = [];
      startLevel();
      api.sfx.tada();
    }
    function startLevel() {
      goal = kind === 'relaxed' ? Infinity : 8 + (lvl - 1) * 3;
      timeMax = kind === 'relaxed' ? Infinity : Math.max(60, 120 - (lvl - 1) * 6);
      timeLeft = timeMax; launched = 0; newGrid(); findLit(); slotFill.fill(1); mode = 'play';
      tip.textContent = kind === 'relaxed' ? 'No clock. Launch as many rockets as you like!' : `Level ${lvl}: launch ${goal} rockets before the match burns down.`;
      kick();
    }

    /* ---------- connectivity ---------- */
    function findLit() {
      // Flood from every match (left edge) through matching fuse ends.
      lit = new Set(); const dist = {}, comp = {}, q = [];
      for (let y = 0; y < ROWS; y++) if (grid[y][0].m & DW) { const k = y * COLS; if (!lit.has(k)) { lit.add(k); dist[k] = 0; comp[k] = y; q.push([0, y]); } }
      while (q.length) {
        const [x, y] = q.shift(), k = y * COLS + x, m = grid[y][x].m;
        for (const [b, dx, dy, opp] of DIRS) {
          if (!(m & b)) continue;
          const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
          const nk = ny * COLS + nx; if (lit.has(nk) || !(grid[ny][nx].m & opp)) continue;
          lit.add(nk); dist[nk] = dist[k] + 1; comp[nk] = comp[k]; q.push([nx, ny]);
        }
      }
      // Components (by first match row) that touch the right edge with an open east end fire rockets.
      const hitRows = [], liveComps = new Set();
      for (let y = 0; y < ROWS; y++) { const k = y * COLS + COLS - 1; if (lit.has(k) && (grid[y][COLS - 1].m & DE)) { hitRows.push(y); liveComps.add(comp[k]); } }
      return { hitRows, liveComps, dist, comp };
    }
    function checkBurn() {
      const r = findLit();
      if (!r.hitRows.length) { combo = 0; dirty = true; return false; }
      // Everything in a firing network burns, in order of distance from the match.
      const burnSet = [...lit].filter(k => r.liveComps.has(r.comp[k]));
      let maxD = 0; burnSet.forEach(k => { const y = k / COLS | 0, x = k % COLS; grid[y][x].burn = r.dist[k]; maxD = Math.max(maxD, r.dist[k]); });
      anim = { type: 'burn', t: 0, maxD, cells: burnSet, rows: r.hitRows };
      api.noise(0.25 + maxD * 0.06, { ft: 'highpass', f: 3500, vol: 0.06, attack: 0.02, release: 0.1 });
      return true;
    }
    function afterBurn() {
      const rows = anim.rows, n = rows.length;
      combo++;
      const pts = n * 100 * n * combo;
      score += pts; launched += n;
      rows.forEach((y, i) => launchRocket(y, i));
      const words = n >= 5 ? 'FIREWORKS FINALE!' : n >= 3 ? 'Triple launch!' : n === 2 ? 'Double launch!' : '';
      if (words || combo > 1) toast((words || 'Nice!') + (combo > 1 ? ` Chain x${combo}` : '') + `  +${pts}`);
      if (kind === 'classic') timeLeft = Math.min(timeMax, timeLeft + n * 1.5);
      // Burned tiles vanish; tiles above fall; new ones drop in from the top.
      anim.cells.forEach(k => { const y = k / COLS | 0, x = k % COLS; grid[y][x] = null; });
      for (let x = 0; x < COLS; x++) {
        let write = ROWS - 1;
        for (let y = ROWS - 1; y >= 0; y--) if (grid[y][x]) { const c = grid[y][x]; if (write !== y) { c.dy = (write - y) * CELL; grid[write][x] = c; grid[y][x] = null; } c.burn = -1; write--; }
        for (let y = write, n2 = 1; y >= 0; y--, n2++) grid[y][x] = { m: randTile(rng, lvl), a: 0, dy: (write + 1) * CELL + n2 * 8, burn: -1 };
      }
      rows.forEach(y => { slotFill[y] = 0; });
      anim = { type: 'fall', t: 0 };
    }
    function launchRocket(y, i) {
      const col = ROCKET_COLORS[(y + launched + i) % ROCKET_COLORS.length];
      rockets.push({ x: GX + COLS * CELL + 22, y: GY + y * CELL + CELL / 2, vx: -0.6 - Math.random() * 1.4, vy: -6 - Math.random() * 2.5, col, fuse: 26 + Math.random() * 30, trail: [] });
      const t0 = i * 0.08;
      api.tone(300, 0.6, { to: 1400, type: 'sawtooth', vol: 0.03, at: t0 });
      api.noise(0.5, { ft: 'bandpass', f: 2000, q: 0.7, vol: 0.06, at: t0 });
    }
    function burst(r) {
      const n = 50 + (Math.random() * 30 | 0), hue = r.col;
      for (let k = 0; k < n; k++) { const a = Math.random() * 6.283, sp = 0.8 + Math.random() * 2.8; sparks.push({ x: r.x, y: r.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, l: 50 + Math.random() * 30, c: Math.random() < 0.3 ? '#fff6c0' : hue }); }
      api.noise(0.35, { ft: 'lowpass', f: 700, vol: 0.14, decay: 1 });
      for (let k = 0; k < 5; k++) api.noise(0.03, { ft: 'highpass', f: 5000, vol: 0.05, decay: 1, at: 0.15 + k * 0.07 });
    }
    let toastT = 0, toastMsg = '';
    function toast(m) { toastMsg = m; toastT = 1.8; }

    /* ---------- input ---------- */
    function turn(x, y, ccw) {
      if (mode !== 'play' || paused || anim) return;
      const c = grid[y][x];
      c.m = ccw ? rotCCW(c.m) : rot(c.m); c.a = ccw ? 90 : -90; cursor = { x, y };
      api.sfx.click();
      if (!checkBurn()) kick(); else kick();
    }
    const toLogical = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left - ox) / scale, y: (e.clientY - r.top - oy) / scale }; };
    cv.addEventListener('pointerdown', e => {
      e.preventDefault();
      const p = toLogical(e);
      if (mode === 'title') { if (p.y > 410 && p.y < 470) startGame('classic'); else if (p.y > 480 && p.y < 540) startGame('relaxed'); return; }
      if (mode === 'over') { mode = 'title'; kick(); return; }
      if (mode === 'levelup') { lvl++; startLevel(); return; }
      if (paused) { paused = false; kick(); return; }
      const x = Math.floor((p.x - GX) / CELL), y = Math.floor((p.y - GY) / CELL);
      if (x >= 0 && y >= 0 && x < COLS && y < ROWS) turn(x, y, e.button === 2 || e.shiftKey);
    });
    cv.addEventListener('contextmenu', e => e.preventDefault());
    W.onKey = e => {
      const k = e.key;
      if (mode === 'title') { if (k === '1' || k === 'Enter' || k === ' ') startGame('classic'); else if (k === '2') startGame('relaxed'); else return; e.preventDefault(); return; }
      if (mode === 'over' && (k === 'Enter' || k === ' ')) { e.preventDefault(); mode = 'title'; kick(); return; }
      if (mode === 'levelup' && (k === 'Enter' || k === ' ')) { e.preventDefault(); lvl++; startLevel(); return; }
      if (k === 'p' || k === 'P') { e.preventDefault(); togglePause(); return; }
      const mv = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[k];
      if (mv) { e.preventDefault(); cursor.x = (cursor.x + mv[0] + COLS) % COLS; cursor.y = (cursor.y + mv[1] + ROWS) % ROWS; dirty = true; kick(); return; }
      if (k === ' ' || k === 'Enter' || k === 'x' || k === 'X') { e.preventDefault(); turn(cursor.x, cursor.y, false); }
      else if (k === 'z' || k === 'Z') { e.preventDefault(); turn(cursor.x, cursor.y, true); }
    };
    function togglePause() { if (mode !== 'play') return; paused = !paused; W.body.querySelector('[data-a=pause]').textContent = paused ? 'Resume' : 'Pause'; kick(); }
    W.body.querySelector('[data-a=pause]').onclick = togglePause;
    W.body.querySelector('[data-a=new]').onclick = () => {
      if (mode !== 'play' || anim) return;
      newGrid(); findLit(); if (kind === 'classic') timeLeft = Math.max(1, timeLeft - 10);
      tip.textContent = kind === 'classic' ? 'Fresh fuses! That cost 10 seconds of match.' : 'Fresh fuses!'; api.sfx.seek(4); kick();
    };

    /* ---------- loop ---------- */
    function kick() { dirty = true; if (!raf) { lastT = performance.now(); raf = requestAnimationFrame(loop); } }
    function loop(now) {
      raf = 0;
      const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
      let busy = false;
      if (!paused) busy = step(dt);
      draw();
      if (busy || mode === 'play' || mode === 'title' || rockets.length || sparks.length) raf = requestAnimationFrame(loop);
    }
    function step(dt) {
      let busy = false;
      matchFlick += dt * 12;
      if (grid) for (const row of grid) for (const c of row) {
        if (c && c.a) { c.a = Math.abs(c.a) < 6 ? 0 : c.a * Math.pow(0.0005, dt); busy = true; }
      }
      if (anim && anim.type === 'burn') { anim.t += dt / 0.07; busy = true; if (anim.t > anim.maxD + 3) afterBurn(); }
      else if (anim && anim.type === 'fall') {
        let moving = false;
        for (const row of grid) for (const c of row) if (c.dy > 0) { c.dy = Math.max(0, c.dy - dt * 900); moving = true; }
        busy = true;
        if (!moving) { anim = null; findLit(); if (!checkBurn()) { combo = 0; checkLevel(); } }
      }
      slotFill = slotFill.map(v => Math.min(1, v + dt * 2));
      if (mode === 'play' && !anim && kind === 'classic') {
        timeLeft -= dt;
        if (timeLeft <= 0) { timeLeft = 0; gameOver(); }
      }
      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i]; r.trail.push([r.x, r.y]); if (r.trail.length > 14) r.trail.shift();
        r.x += r.vx; r.y += r.vy; r.vy += 0.07; r.fuse -= 1;
        if (r.fuse <= 0 || r.vy > -1) { burst(r); rockets.splice(i, 1); }
      }
      for (let i = sparks.length - 1; i >= 0; i--) { const p = sparks[i]; p.x += p.vx; p.y += p.vy; p.vy += 0.035; p.vx *= 0.985; p.l--; if (p.l <= 0) sparks.splice(i, 1); }
      if (toastT > 0) toastT -= dt;
      return busy || rockets.length > 0 || sparks.length > 0;
    }
    function checkLevel() {
      if (kind === 'classic' && launched >= goal && mode === 'play') {
        const bonus = Math.round(timeLeft) * 20; score += bonus; mode = 'levelup';
        bestLevel = Math.max(bestLevel, lvl);
        tip.textContent = `Level ${lvl} cleared! Time bonus +${bonus}. Tap to continue.`;
        api.sfx.tada();
        if (earnedRun < 6) { earnedRun++; api.earn(1, 'clearing a Fuse Frenzy level'); }
      }
    }
    function gameOver() {
      mode = 'over'; api.sfx.crash();
      const list = hi(); list.push({ s: score, l: lvl, n: api.user }); list.sort((a, b) => b.s - a.s); api.save('hi', list.slice(0, 8)); best = list[0];
      tip.textContent = `The match burned out! Final score ${score.toLocaleString()}. Tap to play again.`;
    }

    /* ---------- drawing ---------- */
    function draw() {
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.fillStyle = '#05070f'; g.fillRect(0, 0, cv.width, cv.height);
      g.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * ox, dpr * oy);
      // night sky, backyard fence and house
      const sky = g.createLinearGradient(0, 0, 0, LH); sky.addColorStop(0, '#0a1030'); sky.addColorStop(0.3, '#1a1f4a'); sky.addColorStop(1, '#10121c');
      g.fillStyle = sky; g.fillRect(0, 0, LW, LH);
      stars.forEach(s => { g.fillStyle = `rgba(255,255,255,${0.3 + 0.5 * Math.abs(Math.sin(matchFlick / 8 + s.b * 9))})`; g.fillRect(s.x, s.y, 1.5, 1.5); });
      g.fillStyle = '#f4efd6'; g.beginPath(); g.arc(410, 48, 18, 0, 6.3); g.fill(); g.fillStyle = '#1a1f4a'; g.beginPath(); g.arc(402, 44, 16, 0, 6.3); g.fill();
      g.fillStyle = '#141626'; g.fillRect(0, SKY - 40, 120, 40); g.beginPath(); g.moveTo(-5, SKY - 40); g.lineTo(60, SKY - 72); g.lineTo(125, SKY - 40); g.fill();
      g.fillStyle = '#e8c860'; g.fillRect(30, SKY - 30, 14, 12); g.fillRect(70, SKY - 30, 14, 12);
      g.fillStyle = '#2a2016'; for (let x = 120; x < LW; x += 14) g.fillRect(x, SKY - 22, 11, 22);
      // sparks and rockets (behind the HUD, over the sky)
      rockets.forEach(r => { g.strokeStyle = 'rgba(255,200,120,.6)'; g.lineWidth = 2; g.beginPath(); r.trail.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke(); drawRocket(r.x, r.y, r.col, Math.atan2(r.vy, r.vx) + Math.PI / 2, 0.8); });
      sparks.forEach(p => { g.globalAlpha = Math.min(1, p.l / 30); g.fillStyle = p.c; g.fillRect(p.x, p.y, 2.2, 2.2); }); g.globalAlpha = 1;
      if (mode === 'title') return drawTitle();
      if (!grid) return;
      // board frame
      g.fillStyle = '#3b2a18'; roundRect(GX - 8, GY - 8, COLS * CELL + 16, ROWS * CELL + 16, 8); g.fill();
      g.fillStyle = '#1c140c'; g.fillRect(GX, GY, COLS * CELL, ROWS * CELL);
      // matches (left): the stick burns down with the clock
      const frac = kind === 'classic' ? timeLeft / timeMax : 1;
      for (let y = 0; y < ROWS; y++) {
        const cy = GY + y * CELL + CELL / 2, len = 40 * frac + 6;
        g.fillStyle = '#e9d3a0'; g.fillRect(GX - len - 4, cy - 2.5, len, 5);
        g.fillStyle = '#b31d1d'; g.beginPath(); g.ellipse(GX - len - 6, cy, 6, 4.5, 0, 0, 6.3); g.fill();
        const fl = 1 + Math.sin(matchFlick + y) * 0.2;
        g.fillStyle = 'rgba(255,160,40,.85)'; g.beginPath(); g.ellipse(GX - len - 12, cy - 3, 5 * fl, 8 * fl, -0.5, 0, 6.3); g.fill();
        g.fillStyle = 'rgba(255,240,150,.9)'; g.beginPath(); g.ellipse(GX - len - 11, cy - 2, 2.5 * fl, 4.5 * fl, -0.5, 0, 6.3); g.fill();
      }
      // rockets waiting on the right
      for (let y = 0; y < ROWS; y++) {
        const f = slotFill[y]; if (f <= 0) continue;
        g.globalAlpha = f; drawRocket(GX + COLS * CELL + 22, GY + y * CELL + CELL / 2 + (1 - f) * 20, ROCKET_COLORS[y % ROCKET_COLORS.length], 0.35, 1); g.globalAlpha = 1;
      }
      // tiles (clipped to the board so new ones slide in from under the top edge)
      g.save(); g.beginPath(); g.rect(GX, GY, COLS * CELL, ROWS * CELL); g.clip();
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
        const c = grid[y][x]; if (!c) continue;
        const px = GX + x * CELL, py = GY + y * CELL - c.dy, k = y * COLS + x;
        if (py < GY - CELL) continue;
        const burning = anim && anim.type === 'burn' && c.burn >= 0 && c.burn <= anim.t;
        drawTile(px, py, c, lit.has(k), burning, c.burn >= 0 && anim && anim.type === 'burn' && anim.t - c.burn > 2);
      }
      g.restore();
      if (mode === 'play' && !paused) { g.strokeStyle = '#fff'; g.lineWidth = 2; g.setLineDash([5, 4]); g.strokeRect(GX + cursor.x * CELL + 2, GY + cursor.y * CELL + 2, CELL - 4, CELL - 4); g.setLineDash([]); }
      // HUD
      g.fillStyle = '#fff'; g.font = '700 18px Tahoma, Verdana, sans-serif'; g.textAlign = 'left'; g.fillText(`Score ${score.toLocaleString()}`, 12, 26);
      g.textAlign = 'right'; g.fillText(kind === 'classic' ? `Level ${lvl}` : 'Relaxed', LW - 12, 26);
      if (kind === 'classic') {
        g.textAlign = 'center'; g.font = '14px Tahoma, Verdana, sans-serif'; g.fillText(`Rockets ${Math.min(launched, goal)} / ${goal}`, LW / 2, 26);
        const bw = LW - 24, bf = Math.max(0, timeLeft / timeMax);
        g.fillStyle = '#333'; g.fillRect(12, GY + ROWS * CELL + 18, bw, 12);
        g.fillStyle = bf < 0.2 ? '#f33' : bf < 0.45 ? '#fa3' : '#fd6'; g.fillRect(12, GY + ROWS * CELL + 18, bw * bf, 12);
        g.fillStyle = '#ccc'; g.font = '11px Tahoma, Verdana, sans-serif'; g.fillText('MATCH', LW / 2, GY + ROWS * CELL + 44);
      } else { g.textAlign = 'center'; g.font = '14px Tahoma, Verdana, sans-serif'; g.fillText(`Rockets launched ${launched}`, LW / 2, 26); }
      g.textAlign = 'left';
      if (toastT > 0) { g.globalAlpha = Math.min(1, toastT * 2); g.fillStyle = '#fff6a8'; g.font = '700 22px Tahoma, Verdana, sans-serif'; g.textAlign = 'center'; g.fillText(toastMsg, LW / 2, GY - 24); g.textAlign = 'left'; g.globalAlpha = 1; }
      if (paused) overlay('Paused', 'Tap or press P to keep going');
      if (mode === 'levelup') overlay(`Level ${lvl} cleared!`, `Score ${score.toLocaleString()} · tap for level ${lvl + 1}`);
      if (mode === 'over') overlay('The match burned out!', `Final score ${score.toLocaleString()} · tap to play again`);
    }
    function overlay(a, b) {
      g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(GX - 8, GY + 120, COLS * CELL + 16, 130);
      g.textAlign = 'center'; g.fillStyle = '#fd6'; g.font = '700 30px Tahoma, Verdana, sans-serif'; g.fillText(a, LW / 2, GY + 178);
      g.fillStyle = '#fff'; g.font = '15px Tahoma, Verdana, sans-serif'; g.fillText(b, LW / 2, GY + 212); g.textAlign = 'left';
    }
    function drawTitle() {
      g.textAlign = 'center';
      g.fillStyle = '#ffcf40'; g.font = '900 54px "Arial Black", Arial, sans-serif'; g.fillText('FUSE', LW / 2, 250);
      g.fillStyle = '#ff5a3a'; g.fillText('FRENZY', LW / 2, 306);
      g.fillStyle = '#dfe6ff'; g.font = '15px Tahoma, Verdana, sans-serif';
      ['Turn the fuse tiles to connect a lit match', 'on the left to a rocket on the right.', 'Big networks launch lots of rockets at once!'].forEach((t, i) => g.fillText(t, LW / 2, 350 + i * 22));
      btn(LW / 2, 440, 'Classic  (beat the match)');
      btn(LW / 2, 510, 'Relaxed  (no clock)');
      const h = best; g.fillStyle = '#9aa'; g.font = '13px Tahoma, Verdana, sans-serif'; g.fillText(h ? `Best: ${h.s.toLocaleString()} (level ${h.l})` : 'Press 1 for Classic, 2 for Relaxed', LW / 2, 580);
      g.textAlign = 'left';
      if (Math.random() < 0.03) launchTitle();
    }
    function launchTitle() { rockets.push({ x: 60 + Math.random() * (LW - 120), y: LH, vx: (Math.random() - 0.5) * 1.5, vy: -7 - Math.random() * 3, col: ROCKET_COLORS[Math.random() * 6 | 0], fuse: 45 + Math.random() * 25, trail: [] }); }
    function btn(cx, cy, label) {
      g.fillStyle = '#c0c0c0'; g.fillRect(cx - 150, cy - 24, 300, 46); g.fillStyle = '#fff'; g.fillRect(cx - 150, cy - 24, 300, 2); g.fillRect(cx - 150, cy - 24, 2, 46);
      g.fillStyle = '#555'; g.fillRect(cx - 150, cy + 20, 300, 2); g.fillRect(cx + 148, cy - 24, 2, 46);
      g.fillStyle = '#000'; g.font = '700 17px Tahoma, Verdana, sans-serif'; g.fillText(label, cx, cy + 5);
    }
    function drawTile(px, py, c, isLit, burning, burnt) {
      g.fillStyle = burnt ? '#0f0a06' : '#2e2215'; g.fillRect(px + 1, py + 1, CELL - 2, CELL - 2);
      g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(px + 1, py + 1, CELL - 2, 3);
      if (burnt) return;
      g.save(); g.translate(px + CELL / 2, py + CELL / 2); g.rotate(c.a * Math.PI / 180);
      const col = burning ? '#fff2a0' : isLit ? '#ffab2e' : '#c9a063';
      if (isLit || burning) { g.shadowColor = burning ? '#ffee88' : '#ff8a00'; g.shadowBlur = burning ? 16 : 8; }
      g.strokeStyle = col; g.lineWidth = 8; g.lineCap = 'butt';
      DIRS.forEach(([b, dx, dy]) => { if (c.m & b) { g.beginPath(); g.moveTo(0, 0); g.lineTo(dx * CELL / 2, dy * CELL / 2); g.stroke(); } });
      g.shadowBlur = 0;
      if (!isLit && !burning) { g.strokeStyle = '#8a6a3c'; g.lineWidth = 2; g.setLineDash([3, 5]); DIRS.forEach(([b, dx, dy]) => { if (c.m & b) { g.beginPath(); g.moveTo(0, 0); g.lineTo(dx * CELL / 2, dy * CELL / 2); g.stroke(); } }); g.setLineDash([]); }
      g.fillStyle = col; g.beginPath(); g.arc(0, 0, bits(c.m) > 2 ? 6 : 4, 0, 6.3); g.fill();
      if (burning) { g.fillStyle = '#fff'; g.beginPath(); g.arc((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10, 3, 0, 6.3); g.fill(); }
      g.restore();
    }
    function drawRocket(x, y, col, ang, s) {
      g.save(); g.translate(x, y); g.rotate(ang); g.scale(s, s);
      g.fillStyle = col; g.fillRect(-6, -14, 12, 26);
      g.fillStyle = '#fff'; g.fillRect(-6, -4, 12, 4);
      g.fillStyle = '#ffe28a'; g.beginPath(); g.moveTo(-6, -14); g.lineTo(0, -24); g.lineTo(6, -14); g.fill();
      g.fillStyle = '#7a1'; g.fillStyle = '#333'; g.beginPath(); g.moveTo(-6, 6); g.lineTo(-11, 14); g.lineTo(-6, 12); g.fill(); g.beginPath(); g.moveTo(6, 6); g.lineTo(11, 14); g.lineTo(6, 12); g.fill();
      g.strokeStyle = '#c9a063'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 12); g.lineTo(0, 18); g.stroke();
      g.restore();
    }
    function roundRect(x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

    api.menubar([
      { label: 'Game', items: () => [
        { label: 'New Classic game', fn: () => startGame('classic') },
        { label: 'New Relaxed game (no clock)', fn: () => startGame('relaxed') },
        { label: paused ? 'Resume' : 'Pause', fn: togglePause, disabled: mode !== 'play' }, '-',
        { label: 'High scores', fn: () => { const l = hi(); api.msgBox('Fuse Frenzy high scores', l.length ? l.map((h, i) => `${i + 1}. ${h.s.toLocaleString()}  level ${h.l}  ${h.n}`).join('\n') : 'No scores yet. Go light some fuses!'); } },
        { label: 'How to play', fn: () => api.msgBox('How to play Fuse Frenzy', 'Every row has a lit match on the left and a rocket on the right.\n\nTap a tile to turn it (right-click or Z turns it the other way). When an unbroken fuse runs from a match all the way to a rocket, it burns and the rocket launches!\n\nBurned tiles disappear and new ones drop in. Branching tiles can light several rockets at once for big bonuses, and new connections made by falling tiles chain for even more.\n\nClassic: launch enough rockets before the match burns down. Each launch adds a little time. Relaxed: no clock at all.\n\nKeyboard: arrow keys move, Space turns, P pauses.') },
        '-', { label: 'Exit', fn: () => api.close() }
      ] }
    ]);
    W.onMin = () => { if (mode === 'play' && !paused) togglePause(); };
    W.onClose = () => { cancelAnimationFrame(raf); raf = 0; if (ro) ro.disconnect(); };
    setTimeout(resize, 0); kick();
  }

  (window.RETRO_APPS = window.RETRO_APPS || []).push({
    id: 'fusefrenzy', label: 'Fuse Frenzy', kind: 'store', cat: 'game', year: 2000, price: 19.95, sizeKB: 6200,
    publisher: 'Sparkler Street Games', genre: 'Puzzle',
    tagline: 'Connect the fuse. Light the sky.',
    blurb: 'Turn fuse tiles to connect lit matches to backyard rockets. Link big networks to launch whole fireworks finales, and chain new connections as fresh tiles fall. Classic mode races the burning match; Relaxed mode has no clock at all.',
    box: { bg: '#141a3e', fg: '#fff', accent: '#ffb52e' },
    icon: '<svg viewBox="0 0 32 32" shape-rendering="crispEdges" aria-hidden="true"><rect width="32" height="32" fill="#141a3e"/><g fill="#fff"><rect x="3" y="4" width="1" height="1"/><rect x="27" y="7" width="1" height="1"/><rect x="12" y="2" width="1" height="1"/></g><path d="M2 24h9v-8h9" fill="none" stroke="#ffab2e" stroke-width="3"/><rect x="20" y="10" width="6" height="12" fill="#e8433a"/><path d="M20 10l3-5 3 5z" fill="#ffe28a"/><rect x="20" y="15" width="6" height="2" fill="#fff"/><g fill="#ffd84d"><rect x="14" y="4" width="2" height="2"/><rect x="17" y="6" width="2" height="2"/><rect x="11" y="7" width="2" height="2"/></g></svg>',
    window: { w: 500, h: 720 },
    css: `.ff{display:flex;flex-direction:column;height:100%;background:#05070f}
      .ff-cv{flex:1;min-height:0;display:block;touch-action:none;cursor:pointer}
      .ff-bar{display:flex;gap:6px;align-items:center;padding:4px;background:#c0c0c0}
      .ff-bar .btn{min-width:0;padding:3px 10px}
      .ff-tip{flex:1;min-width:0;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}`,
    open
  });
})();
