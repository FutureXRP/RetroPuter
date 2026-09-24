/* Card games for RetroPuter: a shared card toolkit (drawn faces, backs, drag and drop,
   tap-to-select, double-click auto-move, undo, dialogs, win animation) plus four built-in
   games: Solitaire (Klondike), FreeCell, Hearts and Spider Solitaire. */
(function () {
  'use strict';

  /* ================= shared card toolkit ================= */
  const RK = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const RN = ['', 'ace', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king'];
  const SN = ['spades', 'hearts', 'diamonds', 'clubs'];
  const red = s => s === 1 || s === 2;
  const ink = s => (red(s) ? '#c41e1e' : '#111');
  const cname = c => RN[c.r] + ' of ' + SN[c.s];
  const FELT = { '1990': '#0a7a2a', '1995': '#00804a', '2000': '#1c6e3d' };
  const BACKS = {
    blue: ['Blue lattice', '#1d3f9a', '#7d9cf0'], red: ['Red lattice', '#a3161b', '#f08070'],
    green: ['Green lattice', '#0c6a52', '#6fd1b0'], purple: ['Purple lattice', '#5a2a86', '#c49af0'],
    gold: ['Sunset', '#b55a00', '#ffd27a']
  };
  const ERA_BACK = { '1990': 'blue', '1995': 'red', '2000': 'green' };
  const CHECK = '✓ ', NOCHECK = '  ';
  const fmt = s => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');

  function rngFrom(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shuffle(a, rnd = Math.random) {
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function fullDeck() {
    const d = [];
    for (let s = 0; s < 4; s++) for (let r = 1; r <= 13; r++) d.push({ id: s * 13 + r - 1, s, r, up: false });
    return d;
  }

  /* suit shapes drawn in a 10x10 box */
  function suitG(s, x, y, size, flip) {
    const t = `translate(${x} ${y}) scale(${size / 10})${flip ? ' rotate(180 5 5)' : ''}`;
    let d;
    if (s === 0) d = '<path d="M5 0C4 1.6 0 4 0 6.4 0 7.9 1.1 8.9 2.4 8.9 3.3 8.9 3.9 8.5 4.3 8 4.2 9 3.8 9.5 3 10H7C6.2 9.5 5.8 9 5.7 8 6.1 8.5 6.7 8.9 7.6 8.9 8.9 8.9 10 7.9 10 6.4 10 4 6 1.6 5 0Z"/>';
    else if (s === 1) d = '<path d="M5 9.7C3.6 8.3 0 5.7 0 2.9 0 1.3 1.2 0 2.7 0 3.8 0 4.6.7 5 1.7 5.4.7 6.2 0 7.3 0 8.8 0 10 1.3 10 2.9 10 5.7 6.4 8.3 5 9.7Z"/>';
    else if (s === 2) d = '<path d="M5 0 8.7 5 5 10 1.3 5Z"/>';
    else d = '<circle cx="5" cy="2.6" r="2.35"/><circle cx="2.5" cy="6.1" r="2.35"/><circle cx="7.5" cy="6.1" r="2.35"/><path d="M4.4 5.6 3.4 10H6.6L5.6 5.6Z"/>';
    return `<g transform="${t}" fill="${ink(s)}">${d}</g>`;
  }
  const SANS = 'font-family="Arial,Helvetica,sans-serif" font-weight="700"';
  const SERIF = 'font-family="Georgia,\'Times New Roman\',serif" font-weight="700"';
  function rankT(c, x, y, size) {
    const fit = c.r === 10 ? ` textLength="${(size * 1.08).toFixed(1)}" lengthAdjust="spacingAndGlyphs"` : '';
    return `<text x="${x}" y="${y}" font-size="${size}" fill="${ink(c.s)}" ${SANS}${fit}>${RK[c.r]}</text>`;
  }
  /* small original motifs for the court cards */
  function emblem(c) {
    const k = ink(c.s), acc = red(c.s) ? '#1d3f9a' : '#c41e1e';
    if (c.r === 13) return `<path d="M33 52V32l8.5 9 8.5-13 8.5 13 8.5-9v20Z" fill="#e8b923" stroke="${k}" stroke-width="1.6"/><rect x="33" y="47" width="34" height="5" fill="${acc}"/>`;
    if (c.r === 12) return `<path d="M35 52q15-26 30 0Z" fill="#e8b923" stroke="${k}" stroke-width="1.6"/><circle cx="50" cy="34" r="4" fill="${acc}"/><circle cx="41" cy="44" r="2.4" fill="${acc}"/><circle cx="59" cy="44" r="2.4" fill="${acc}"/>`;
    return `<path d="M35 52q1-18 15-18t15 18Z" fill="${acc}" stroke="${k}" stroke-width="1.6"/><path d="M58 38q11-9 9-17-7 5-13 15" fill="#e8b923" stroke="${k}" stroke-width="1.3"/>`;
  }
  const PIPS = {
    2: [[50, 0], [50, 1]], 3: [[50, 0], [50, .5], [50, 1]],
    4: [[32, 0], [68, 0], [32, 1], [68, 1]], 5: [[32, 0], [68, 0], [50, .5], [32, 1], [68, 1]],
    6: [[32, 0], [68, 0], [32, .5], [68, .5], [32, 1], [68, 1]],
    7: [[32, 0], [68, 0], [50, .25], [32, .5], [68, .5], [32, 1], [68, 1]],
    8: [[32, 0], [68, 0], [50, .25], [32, .5], [68, .5], [50, .75], [32, 1], [68, 1]],
    9: [[32, 0], [68, 0], [32, 1 / 3], [68, 1 / 3], [50, .5], [32, 2 / 3], [68, 2 / 3], [32, 1], [68, 1]],
    10: [[32, 0], [68, 0], [50, 1 / 6], [32, 1 / 3], [68, 1 / 3], [32, 2 / 3], [68, 2 / 3], [50, 5 / 6], [32, 1], [68, 1]]
  };
  const faceCache = {};
  function faceInner(c, mode) {
    const key = c.s + ':' + c.r + ':' + mode;
    if (faceCache[key]) return faceCache[key];
    const s = c.s, r = c.r, k = ink(s), court = r > 10;
    let o = '';
    if (mode === 'tiny') {
      o += rankT(c, 5, 37, 38) + suitG(s, 66, 7, 27);
      if (court) o += `<rect x="14" y="50" width="72" height="82" rx="5" fill="#fbeeb8" stroke="${k}" stroke-width="2.5"/>`;
      o += suitG(s, 25, 62, 50);
    } else if (mode === 'small') {
      const corner = rankT(c, 7, 29, 29) + suitG(s, 7, 34, 18);
      o += corner + `<g transform="rotate(180 50 70)">${corner}</g>` + suitG(s, 74, 7, 18);
      if (court) o += `<rect x="26" y="44" width="48" height="60" rx="3" fill="#fbeeb8" stroke="${k}" stroke-width="2"/><text x="50" y="87" font-size="36" text-anchor="middle" fill="${k}" ${SERIF}>${RK[r]}</text>`;
      else o += suitG(s, 29, 50, 42);
    } else {
      const corner = rankT(c, 5, 24, 23) + suitG(s, 6, 29, 14);
      o += corner + `<g transform="rotate(180 50 70)">${corner}</g>`;
      if (court) o += `<rect x="21" y="14" width="58" height="112" rx="3" fill="#fbeeb8" stroke="${k}" stroke-width="1.6"/><rect x="24" y="17" width="52" height="106" rx="2" fill="none" stroke="${k}" stroke-width=".6"/>` + emblem(c) + `<text x="50" y="94" font-size="40" text-anchor="middle" fill="${k}" ${SERIF}>${RK[r]}</text>` + suitG(s, 42, 101, 16);
      else if (r === 1) o += s === 0 ? suitG(s, 22, 42, 56) + '<circle cx="50" cy="72" r="4" fill="#fff"/>' : suitG(s, 27, 47, 46);
      else PIPS[r].forEach(([cx, t]) => { const y = 22 + t * 96; o += suitG(s, cx - 8, y - 8, 16, t > .5); });
    }
    return (faceCache[key] = o);
  }
  function fullSVG(c, mode, w, h) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 100 140" preserveAspectRatio="none"><rect x=".8" y=".8" width="98.4" height="138.4" rx="7" fill="#fff" stroke="#000" stroke-width="1.6"/>${faceInner(c, mode)}</svg>`;
  }

  /* The table: piles of cards laid out on felt, with pointer, tap and keyboard handling.
     g (game hooks): layout(w,h), canPick(p,i), canMove(from,i,to), move(from,i,to),
     tap(p,i) -> true if handled, auto(p,i) -> true if moved, prerender(), wake(), keyPiles() */
  function Table(W, api, g) {
    const T = { piles: [], pm: {}, byId: {}, cards: [], cw: 60, ch: 84, w: 300, h: 300, mode: '', sel: null, kf: null, busy: false, hist: [], modal: null, timers: new Set(), raf: 0, dead: false };
    const root = document.createElement('div');
    root.className = 'cdk cdk-p' + String(api.era.id).slice(2);
    root.innerHTML = '<div class="cdk-tbl"></div><div class="cdk-st"><span class="cdk-s1" role="status"></span><span class="cdk-s2"></span></div>';
    W.body.innerHTML = ''; W.body.appendChild(root);
    const tbl = root.firstChild, s1 = root.querySelector('.cdk-s1'), s2 = root.querySelector('.cdk-s2');
    T.root = root; T.tbl = tbl;
    root.style.setProperty('--cdk-felt', FELT[api.era.id] || FELT['1995']);

    T.later = (fn, ms) => { const id = setTimeout(() => { T.timers.delete(id); if (!T.dead) fn(); }, ms); T.timers.add(id); return id; };
    T.wait = ms => new Promise(r => T.later(r, ms));
    T.status = (a, b) => { s1.textContent = a; s2.textContent = b || ''; };
    T.setBack = name => {
      const b = BACKS[name] || BACKS[ERA_BACK[api.era.id]] || BACKS.blue;
      root.style.setProperty('--cb1', b[1]); root.style.setProperty('--cb2', b[2]);
    };
    T.place = () => api.noise(0.03, { ft: 'bandpass', f: 1800, q: 0.8, vol: 0.09, decay: 1 });
    T.addPile = o => {
      const p = Object.assign({ cards: [], fan: 'none', x: 0, y: 0 }, o);
      p.el = document.createElement('div'); p.el.className = 'cdk-slot'; p.el.dataset.p = p.id;
      if (o.label) p.el.innerHTML = '<span>' + o.label + '</span>';
      if (o.noSlot) p.el.style.display = 'none';
      tbl.appendChild(p.el); T.piles.push(p); T.pm[p.id] = p;
      return p;
    };
    T.setCards = (list, org) => {
      T.cards.forEach(c => c.el && c.el.remove());
      T.cards = list.slice(); T.byId = {}; T.sel = null; T.hist = [];
      T.piles.forEach(p => { p.cards = []; });
      list.forEach(c => {
        const e = document.createElement('div'); e.className = 'cdk-c'; e.dataset.c = c.id;
        e.style.transition = 'none';
        if (org) { e.style.left = org.x + 'px'; e.style.top = org.y + 'px'; }
        tbl.appendChild(e);
        c.el = e; c._up = null; c._p = null; c.lift = false; c.dim = false; c.zb = 0;
        T.byId[c.id] = c;
      });
      void tbl.offsetWidth;
      list.forEach(c => { c.el.style.transition = ''; });
    };
    T.size = cw => {
      cw = Math.max(24, Math.floor(cw)); T.cw = cw; T.ch = Math.round(cw * 1.4);
      root.style.setProperty('--cw', cw + 'px'); root.style.setProperty('--ch', T.ch + 'px');
      T.mode = cw < 44 ? 'tiny' : cw < 68 ? 'small' : 'large';
    };
    function face(c) {
      c._up = c.up; c._m = T.mode;
      c.el.classList.toggle('cdk-dn', !c.up);
      c.el.innerHTML = c.up ? `<svg viewBox="0 0 100 140" preserveAspectRatio="none" aria-hidden="true">${faceInner(c, T.mode)}</svg>` : '';
      c.el.setAttribute('aria-label', c.up ? cname(c) : 'face-down card');
    }
    function pos(p) {
      const n = p.cards.length, out = [], { cw, ch } = T;
      if (p.fan === 'down') {
        let u = p.upOff != null ? p.upOff : ch * 0.3, d = p.dnOff != null ? p.dnOff : ch * 0.12, tu = 0, td = 0;
        for (let i = 0; i < n - 1; i++) { if (p.cards[i].up) tu++; else td++; }
        const avail = Math.max(0, (p.maxY != null ? p.maxY : T.h) - p.y - ch);
        if (tu * u + td * d > avail) {
          d = Math.min(d, ch * 0.07);
          if (tu * u + td * d > avail) { const k = avail / (tu * u + td * d); u *= k; d *= k; }
        }
        let y = p.y;
        for (let i = 0; i < n; i++) { out.push({ x: p.x, y }); y += p.cards[i].up ? u : d; }
      } else if (p.fan === 'right') {
        const vis = p.showN ? Math.min(p.showN, n) : n, st = p.step != null ? p.step : cw * 0.3;
        for (let i = 0; i < n; i++) out.push({ x: p.x + Math.max(0, i - (n - vis)) * st, y: p.y });
      } else if (p.fan === 'group') {
        for (let i = 0; i < n; i++) out.push({ x: p.x + Math.floor(i / p.group) * p.gstep, y: p.y });
      } else for (let i = 0; i < n; i++) out.push({ x: p.x, y: p.y });
      return out;
    }
    T.pos = pos;
    T.render = (o = {}) => {
      if (T.dead) return;
      g.prerender && g.prerender();
      const now = Date.now(); let order = 0;
      for (const p of T.piles) {
        const ps = pos(p);
        p.el.style.left = p.x + 'px'; p.el.style.top = p.y + 'px';
        p.el.classList.toggle('cdk-kf', !!(T.kf && T.kf.p === p && T.kf.i < 0));
        p.cards.forEach((c, i) => {
          if (c._up !== c.up || c._m !== T.mode) face(c);
          const e = c.el, st = e.style, x = ps[i].x, y = ps[i].y - (c.lift ? T.ch * 0.16 : 0);
          const z = 10 + i + (c.zb || 0);
          c._z = z;
          if (c._p && c._p !== p) {
            st.zIndex = 1000 + z; c._zu = now + 300; e.classList.add('cdk-mv');
            T.later(() => { if (Date.now() >= c._zu - 5) { st.zIndex = c._z; e.classList.remove('cdk-mv'); } }, 310);
          } else if (!(c._zu > now)) st.zIndex = z;
          c._p = p;
          if (o.stagger && (c._lx !== x || c._ly !== y)) st.transitionDelay = (order++ * 22) + 'ms';
          else if (st.transitionDelay) st.transitionDelay = '';
          c._lx = x; c._ly = y;
          st.left = x + 'px'; st.top = y + 'px';
          const cl = e.classList;
          cl.toggle('cdk-sel', !!(T.sel && T.sel.p === p && i >= T.sel.i));
          cl.toggle('cdk-kf', !!(T.kf && T.kf.p === p && T.kf.i === i));
          cl.toggle('cdk-dim', !!c.dim);
          cl.toggle('cdk-gone', !!p.hidden);
        });
      }
      if (o.stagger) T.later(() => T.cards.forEach(c => { c.el.style.transitionDelay = ''; }), order * 22 + 400);
    };
    T.layout = () => {
      const w = tbl.clientWidth, h = tbl.clientHeight;
      if (!w || !h || T.dead) return;
      T.w = w; T.h = h;
      if (down && down.drag) down = null;
      g.layout(w, h);
      tbl.classList.add('cdk-noanim'); T.render(); void tbl.offsetWidth; tbl.classList.remove('cdk-noanim');
    };

    /* undo snapshots */
    T.snap = extra => {
      T.hist.push({ piles: T.piles.map(p => p.cards.map(c => [c.id, c.up])), x: JSON.parse(JSON.stringify(extra || null)) });
      if (T.hist.length > 500) T.hist.shift();
    };
    T.undo = () => {
      const h = T.hist.pop(); if (!h) return undefined;
      T.piles.forEach((p, k) => { p.cards = h.piles[k].map(([id, up]) => { const c = T.byId[id]; c.up = up; return c; }); });
      T.sel = null;
      return h.x;
    };

    /* pointer: drag and drop, or tap to select then tap a destination */
    let down = null, lastTap = null;
    const rel = e => { const R = tbl.getBoundingClientRect(); return { x: e.clientX - R.left, y: e.clientY - R.top }; };
    tbl.addEventListener('pointerdown', e => {
      if (T.busy || T.modal || T.dead || (e.button && e.button !== 0)) return;
      g.wake && g.wake();
      const ce = e.target.closest('.cdk-c'), se = e.target.closest('.cdk-slot');
      let p = null, i = -1;
      if (ce) { const c = T.byId[ce.dataset.c]; p = c && c._p; i = p ? p.cards.indexOf(c) : -1; if (i < 0) p = null; }
      else if (se) p = T.pm[se.dataset.p];
      if (T.kf) { T.kf = null; T.render(); }
      if (!p) { if (T.sel) { T.sel = null; T.render(); } return; }
      e.preventDefault();
      try { tbl.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
      const r = rel(e);
      down = { p, i, x: r.x, y: r.y, id: e.pointerId, drag: false, dx: 0, dy: 0 };
    });
    tbl.addEventListener('pointermove', e => {
      if (!down || e.pointerId !== down.id) return;
      const r = rel(e), dx = r.x - down.x, dy = r.y - down.y;
      if (!down.drag) {
        if (Math.abs(dx) + Math.abs(dy) < 8 || down.i < 0 || T.busy || !g.canPick(down.p, down.i)) return;
        down.drag = true; T.sel = null;
        down.cards = down.p.cards.slice(down.i);
        down.org = down.cards.map(c => [c._lx, c._ly]);
        down.cards.forEach((c, k) => { c.el.classList.add('cdk-drag'); c.el.classList.remove('cdk-sel'); c.el.style.zIndex = 3000 + k; });
      }
      down.dx = dx; down.dy = dy;
      down.cards.forEach((c, k) => { c.el.style.left = (down.org[k][0] + dx) + 'px'; c.el.style.top = (down.org[k][1] + dy) + 'px'; });
    });
    function target(from, i, x, y) {
      let best = null, bestA = 0; const { cw, ch } = T;
      for (const p of T.piles) {
        if (p === from || p.noSlot || !g.canMove(from, i, p)) continue;
        const ps = pos(p), n = p.cards.length;
        const x2 = (n ? ps[n - 1].x : p.x) + cw, y2 = (n ? ps[n - 1].y : p.y) + ch + (p.fan === 'down' ? ch * 0.3 : 0);
        const ox = Math.min(x + cw, x2) - Math.max(x, p.x), oy = Math.min(y + ch, y2) - Math.max(y, p.y);
        if (ox > 0 && oy > 0 && ox * oy > bestA) { bestA = ox * oy; best = p; }
      }
      return best;
    }
    const up = e => {
      if (!down || e.pointerId !== down.id) return;
      const d = down; down = null;
      if (d.drag) {
        const now = Date.now();
        d.cards.forEach(c => { c.el.classList.remove('cdk-drag'); c._zu = now + 300; T.later(() => { if (Date.now() >= c._zu - 5) c.el.style.zIndex = c._z; }, 310); });
        const to = e.type === 'pointerup' && !T.busy ? target(d.p, d.i, d.org[0][0] + d.dx, d.org[0][1] + d.dy) : null;
        lastTap = null;
        if (to) T.doMove(d.p, d.i, to); else T.render();
      } else if (e.type === 'pointerup') T.tap(d.p, d.i);
    };
    tbl.addEventListener('pointerup', up);
    tbl.addEventListener('pointercancel', up);

    T.tap = (p, i, kb) => {
      if (T.busy) return;
      const now = Date.now();
      const dbl = !kb && lastTap && lastTap.p === p && lastTap.i === i && now - lastTap.t < 450;
      lastTap = dbl ? null : { p, i, t: now };
      if (dbl && i >= 0 && g.auto && g.auto(p, i)) { T.sel = null; T.render(); return; }
      const s = T.sel;
      if (s) {
        T.sel = null;
        if (s.p === p) { if (i !== s.i && i >= 0 && g.canPick(p, i)) T.sel = { p, i }; T.render(); return; }
        if (g.canMove(s.p, s.i, p)) { T.doMove(s.p, s.i, p); return; }
      }
      if (g.tap && g.tap(p, i)) return;
      if (i >= 0 && g.canPick(p, i)) T.sel = { p, i };
      T.render();
    };
    T.doMove = (from, i, to) => { T.sel = null; g.move(from, i, to); };

    /* keyboard: arrows move a focus box, Space picks up / puts down, Enter auto-moves */
    T.key = e => {
      if (T.modal) { T.modal(e); return true; }
      if (T.busy) return false;
      const k = e.key;
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Enter', 'Escape'].includes(k)) return false;
      e.preventDefault();
      const P = (g.keyPiles ? g.keyPiles() : T.piles).filter(p => !p.noSlot);
      const top = p => p.cards.length - 1;
      let f = T.kf && P.includes(T.kf.p) ? { p: T.kf.p, i: Math.min(T.kf.i, top(T.kf.p)) } : null;
      if (!f) { f = { p: P[0], i: top(P[0]) }; if (k !== 'Escape') { T.kf = f; T.render(); return true; } }
      let pi = P.indexOf(f.p);
      if (k === 'ArrowLeft' || k === 'ArrowRight') { pi = (pi + (k === 'ArrowLeft' ? P.length - 1 : 1)) % P.length; f = { p: P[pi], i: top(P[pi]) }; }
      else if (k === 'ArrowUp') { if (f.i > 0 && f.p.cards[f.i - 1].up && g.canPick(f.p, f.i - 1)) f.i--; }
      else if (k === 'ArrowDown') { if (f.i < top(f.p)) f.i++; }
      else if (k === 'Escape') T.sel = null;
      else if (k === 'Enter') { if (!(f.i >= 0 && g.auto && g.auto(f.p, f.i))) T.tap(f.p, f.i, true); }
      else T.tap(f.p, f.i, true);
      f.i = Math.min(f.i, top(f.p));
      T.kf = f; T.render();
      return true;
    };

    /* a dialog drawn inside the window */
    T.dialog = (title, html, buttons = ['OK']) => new Promise(res => {
      const ov = document.createElement('div'); ov.className = 'cdk-ov';
      ov.innerHTML = `<div class="cdk-dlg raised" role="dialog"><div class="cdk-dt"></div><div class="cdk-db">${html}</div><div class="cdk-dbt">${buttons.map((b, i) => `<button class="btn" data-i="${i}">${api.esc(b)}</button>`).join('')}</div></div>`;
      ov.querySelector('.cdk-dt').textContent = title;
      root.appendChild(ov);
      let done = false;
      const fin = i => { if (done) return; done = true; ov.remove(); T.modal = null; res({ btn: buttons[i], el: ov }); };
      ov.querySelectorAll('[data-i]').forEach(b => { b.onclick = () => fin(+b.dataset.i); });
      T.modal = e => { if (e.key === 'Enter') { e.preventDefault(); fin(0); } else if (e.key === 'Escape') fin(buttons.length - 1); };
      const inp = ov.querySelector('input');
      setTimeout(() => { if (inp) { inp.focus(); inp.select(); } else { const b = ov.querySelector('.btn'); b && b.focus(); } }, 0);
    });

    /* classic bouncing-cards win animation, drawn with trails on a canvas */
    T.bounce = cards => new Promise(res => {
      const cv = document.createElement('canvas'); cv.className = 'cdk-cv';
      cv.width = T.w; cv.height = T.h; tbl.appendChild(cv);
      const ctx = cv.getContext('2d'), mode = T.mode;
      const imgs = cards.map(c => { const im = new Image(); im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(fullSVG(c, mode, T.cw, T.ch)); return im; });
      let k = -1, cur = null, stop = false;
      const finish = () => {
        if (stop) return; stop = true; cancelAnimationFrame(T.raf); cv.remove(); T.modal = null;
        T.cards.forEach(c => { c.el.style.visibility = ''; });
        res();
      };
      cv.addEventListener('pointerdown', e => { e.stopPropagation(); finish(); });
      T.modal = () => finish();
      const next = () => {
        k++; if (k >= cards.length) { finish(); return; }
        const c = cards[k], s = T.cw / 70;
        c.el.style.visibility = 'hidden';
        cur = { x: c._lx, y: c._ly, vx: (2.2 + Math.random() * 4) * (Math.random() < 0.5 ? -1 : 1) * s, vy: -Math.random() * 7 * s, g: 0.42 * s, im: imgs[k] };
      };
      next();
      const step = () => {
        if (stop || T.dead) return;
        for (let n = 0; n < 2 && !stop; n++) {
          cur.x += cur.vx; cur.y += cur.vy; cur.vy += cur.g;
          if (cur.y + T.ch > T.h) { cur.y = T.h - T.ch; cur.vy = -cur.vy * (0.72 + Math.random() * 0.12); }
          if (cur.im.complete && cur.im.naturalWidth) ctx.drawImage(cur.im, Math.round(cur.x), Math.round(cur.y), T.cw, T.ch);
          if (cur.x < -T.cw || cur.x > T.w) next();
        }
        if (!stop) T.raf = requestAnimationFrame(step);
      };
      T.raf = requestAnimationFrame(step);
    });

    T.destroy = () => {
      T.dead = true;
      T.timers.forEach(clearTimeout); T.timers.clear();
      cancelAnimationFrame(T.raf);
      if (ro) ro.disconnect();
    };
    const ro = window.ResizeObserver ? new ResizeObserver(() => T.layout()) : null;
    if (ro) ro.observe(tbl);
    return T;
  }

  /* shared menu/option/statistics helpers */
  function backItems(opt, T, persist) {
    const names = ['era'].concat(Object.keys(BACKS));
    return names.map(n => ({
      label: (opt.back === n ? CHECK : NOCHECK) + 'Card back: ' + (n === 'era' ? 'Standard' : BACKS[n][0]),
      fn: () => { opt.back = n; T.setBack(n); persist(); }
    }));
  }
  function statsBox(api, title, stats, extra) {
    const pct = stats.played ? Math.round(100 * stats.won / stats.played) : 0;
    const text = `Games played: ${stats.played}\nGames won: ${stats.won}\nWin rate: ${pct}%` + (extra ? '\n' + extra : '');
    return api.msgBox(title + ' Statistics', text, ['OK', 'Reset']).then(b => {
      if (b !== 'Reset') return;
      Object.keys(stats).forEach(k => { stats[k] = 0; });
      api.save('stats', stats);
    });
  }
  function isUndoKey(e) { return ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') || e.key === 'Backspace'; }

  const RECYCLE = '<svg viewBox="0 0 20 20" width="60%" height="60%" aria-hidden="true"><circle cx="10" cy="10" r="6.5" fill="none" stroke="currentColor" stroke-width="2.6"/></svg>';

  /* ================= Solitaire (Klondike) ================= */
  function openSolitaire(W, api) {
    const opt = Object.assign({ draw: 1, timed: true, back: 'era' }, api.load('opt', {}));
    const stats = Object.assign({ played: 0, won: 0, best: 0 }, api.load('stats', {}));
    const saveOpt = () => api.save('opt', opt), saveStats = () => api.save('stats', stats);
    let S = null, paused = false;
    const G = {};
    const T = Table(W, api, G);
    T.setBack(opt.back);
    const stock = T.addPile({ id: 'stock', kind: 'stock', label: RECYCLE });
    const waste = T.addPile({ id: 'waste', kind: 'waste', fan: 'right', showN: 1 });
    const F = [0, 1, 2, 3].map(k => T.addPile({ id: 'f' + k, kind: 'found', label: 'A' }));
    const TB = [0, 1, 2, 3, 4, 5, 6].map(k => T.addPile({ id: 't' + k, kind: 'tab', fan: 'down' }));

    G.layout = (w, h) => {
      const gap = Math.max(3, Math.min(10, Math.round(w / 90)));
      T.size(Math.min(88, (w - gap * 8) / 7, (h - gap * 3) / 1.4 / 2.6));
      const { cw, ch } = T, x0 = Math.round((w - (7 * cw + 6 * gap)) / 2), X = k => x0 + k * (cw + gap);
      stock.x = X(0); stock.y = gap; waste.x = X(1); waste.y = gap; waste.step = Math.round(cw * 0.3);
      F.forEach((p, k) => { p.x = X(3 + k); p.y = gap; });
      TB.forEach((p, k) => { p.x = X(k); p.y = gap * 2 + ch; p.maxY = h - gap; p.upOff = ch * 0.3; p.dnOff = ch * 0.12; });
    };
    const top = p => p.cards[p.cards.length - 1];
    const fitsF = (c, p) => { const t = top(p); return t ? t.s === c.s && t.r === c.r - 1 : c.r === 1; };
    const fitsT = (c, p) => { const t = top(p); return t ? t.up && red(t.s) !== red(c.s) && t.r === c.r + 1 : c.r === 13; };
    G.canPick = (p, i) => {
      const c = p.cards[i]; if (!c || !c.up) return false;
      if (p.kind === 'tab') return true;
      return (p.kind === 'waste' || p.kind === 'found') && i === p.cards.length - 1;
    };
    G.canMove = (from, i, to) => {
      if (S.won || from === to || !G.canPick(from, i)) return false;
      const c = from.cards[i], n = from.cards.length - i;
      if (to.kind === 'found') return n === 1 && fitsF(c, to);
      if (to.kind === 'tab') return fitsT(c, to);
      return false;
    };
    const snap = () => T.snap({ S, showN: waste.showN });
    function started() { if (!S.started) { S.started = true; stats.played++; saveStats(); } }
    function status() {
      T.status(`Score: ${S.score}`, (opt.timed ? 'Time: ' + fmt(S.time) + '   ' : '') + (S.draw === 3 ? 'Draw Three' : 'Draw One'));
    }
    G.move = (from, i, to) => {
      snap(); started();
      to.cards.push(...from.cards.splice(i));
      let d = 0;
      if (from.kind === 'waste') { d += to.kind === 'found' ? 10 : 5; waste.showN = Math.max(1, waste.showN - 1); }
      else if (from.kind === 'tab' && to.kind === 'found') d += 10;
      else if (from.kind === 'found') d -= 15;
      const t = top(from);
      if (from.kind === 'tab' && t && !t.up) { t.up = true; d += 5; }
      S.score = Math.max(0, S.score + d);
      if (to.kind === 'found') api.tone(700 + top(to).r * 30, 0.05, { vol: 0.05 }); else T.place();
      T.render(); status(); after();
    };
    G.tap = p => {
      if (p !== stock || S.won) return false;
      if (stock.cards.length) {
        snap(); started();
        const n = Math.min(S.draw, stock.cards.length);
        for (let k = 0; k < n; k++) { const c = stock.cards.pop(); c.up = true; waste.cards.push(c); }
        waste.showN = S.draw === 3 ? n : 1;
        T.place();
      } else if (waste.cards.length) {
        snap(); started();
        stock.cards = waste.cards.reverse(); stock.cards.forEach(c => { c.up = false; });
        waste.cards = []; S.passes++;
        if (S.draw === 1) S.score = Math.max(0, S.score - 100);
        else if (S.passes > 3) S.score = Math.max(0, S.score - 20);
        api.noise(0.12, { ft: 'bandpass', f: 1200, vol: 0.08 });
      }
      T.render(); status();
      return true;
    };
    G.auto = (p, i) => {
      if (S.won || p.kind === 'found' || i !== p.cards.length - 1 || !G.canPick(p, i)) return false;
      const f = F.find(f => fitsF(p.cards[i], f));
      if (!f) return false;
      G.move(p, i, f); return true;
    };
    G.wake = () => { paused = false; };

    function after() {
      if (F.every(f => f.cards.length === 13)) { win(); return; }
      if (!stock.cards.length && !waste.cards.length && TB.every(p => p.cards.every(c => c.up))) autoFinish();
    }
    async function autoFinish() {
      T.busy = true; T.status('Finishing up...', '');
      while (!T.dead) {
        let best = null;
        TB.forEach(p => { const c = top(p); if (c) { const f = F.find(f => fitsF(c, f)); if (f && (!best || c.r < best.c.r)) best = { p, c, f }; } });
        if (!best) break;
        best.p.cards.pop(); best.f.cards.push(best.c); S.score += 10;
        api.tone(600 + best.c.r * 40, 0.04, { vol: 0.05 });
        T.render();
        await T.wait(70);
      }
      T.busy = false;
      if (!T.dead) { status(); if (F.every(f => f.cards.length === 13)) win(); }
    }
    async function win() {
      if (S.won) return;
      S.won = true; T.busy = true; T.sel = null;
      const bonus = opt.timed && S.time >= 30 ? Math.round(700000 / S.time) : 0;
      S.score += bonus;
      stats.won++; stats.best = Math.max(stats.best, S.score); saveStats();
      status(); api.sfx.tada(); api.earn(5, 'winning Solitaire');
      await T.wait(600);
      const order = [];
      for (let r = 13; r >= 1; r--) F.forEach(f => { const c = f.cards[r - 1]; if (c) order.push(c); });
      await T.bounce(order);
      T.busy = false;
      if (T.dead) return;
      const r = await T.dialog('You won!', `<p>Congratulations, every card is home.</p><p>Score: <b>${S.score}</b>${bonus ? ` (includes a time bonus of ${bonus})` : ''}<br>Time: ${fmt(S.time)}</p><p>Deal again?</p>`, ['Deal', 'Not now']);
      if (r.btn === 'Deal') deal();
    }
    function deal() {
      if (T.busy) return;
      S = { score: 0, time: 0, started: false, won: false, passes: 0, draw: opt.draw };
      const deck = shuffle(fullDeck());
      T.setCards(deck, { x: stock.x, y: stock.y });
      TB.forEach((p, k) => { for (let j = 0; j <= k; j++) { const c = deck.pop(); c.up = j === k; p.cards.push(c); } });
      deck.forEach(c => { c.up = false; }); stock.cards = deck.slice();
      waste.showN = 1;
      T.render({ stagger: true }); status();
    }
    function undo() {
      if (T.busy || !S || S.won) return;
      const x = T.undo(); if (x === undefined) { api.sfx.beep(); return; }
      const t = S.time; S = x.S; S.time = t; S.started = true; waste.showN = x.showN;
      T.render(); status();
    }
    const tick = setInterval(() => {
      if (T.dead || paused || !S || !S.started || S.won) return;
      S.time++;
      if (opt.timed && S.time % 10 === 0) S.score = Math.max(0, S.score - 2);
      status();
    }, 1000);
    function help() {
      api.msgBox('How to Play Solitaire',
        'Goal: move all 52 cards to the four foundations at the top right, building each suit up from Ace to King.\n\n' +
        'In the seven columns, build down in alternating colors (red 6 on a black 7). You can move a whole face-up run. Only a King can go into an empty column.\n\n' +
        'Click the deck to turn over cards (one or three at a time, see Options). When the deck runs out, click the empty spot to turn the pile over again.\n\n' +
        'Drag cards with the mouse or your finger, or tap a card and then tap where it should go. Double-click (or double-tap) a card to send it to a foundation. Keyboard: arrow keys, Space to pick up and put down, Enter to send to a foundation, Ctrl+Z to undo, F2 to deal.\n\n' +
        'Scoring: +10 for each card to a foundation, +5 from the deck to a column, +5 for turning over a column card, -15 for taking a card back off a foundation. Timed games lose 2 points every 10 seconds but earn a speed bonus when you win.\n\nWin a game to earn $5.');
    }
    api.menubar([
      { label: 'Game', items: () => [
        { label: 'Deal (F2)', fn: deal },
        { label: 'Undo (Ctrl+Z)', fn: undo, disabled: !T.hist.length || !S || S.won },
        '-',
        { label: 'Statistics...', fn: () => statsBox(api, 'Solitaire', stats, 'High score: ' + stats.best) },
        '-',
        { label: 'Exit', fn: () => api.close() }
      ] },
      { label: 'Options', items: () => [
        { label: (opt.draw === 1 ? CHECK : NOCHECK) + 'Draw One (new deal)', fn: () => { opt.draw = 1; saveOpt(); deal(); } },
        { label: (opt.draw === 3 ? CHECK : NOCHECK) + 'Draw Three (new deal)', fn: () => { opt.draw = 3; saveOpt(); deal(); } },
        '-',
        { label: (opt.timed ? CHECK : NOCHECK) + 'Timed game', fn: () => { opt.timed = !opt.timed; saveOpt(); status(); } },
        '-'
      ].concat(backItems(opt, T, saveOpt)) },
      { label: 'Help', items: [{ label: 'How to Play', fn: help }] }
    ]);
    W.onKey = e => {
      paused = false;
      if (T.modal) { T.key(e); return; }
      if (e.key === 'F2') { e.preventDefault(); deal(); return; }
      if (isUndoKey(e)) { e.preventDefault(); undo(); return; }
      T.key(e);
    };
    W.onMin = () => { paused = true; };
    W.onResize = () => T.layout();
    W.onClose = () => { clearInterval(tick); T.destroy(); };
    T.layout();
    deal();
  }

  /* ================= FreeCell ================= */
  function openFreeCell(W, api) {
    const opt = Object.assign({ back: 'era' }, api.load('opt', {}));
    const stats = Object.assign({ played: 0, won: 0, streak: 0, best: 0 }, api.load('stats', {}));
    const saveOpt = () => api.save('opt', opt), saveStats = () => api.save('stats', stats);
    let S = null, paused = false;
    const G = {};
    const T = Table(W, api, G);
    T.setBack(opt.back);
    const C = [0, 1, 2, 3].map(k => T.addPile({ id: 'c' + k, kind: 'cell' }));
    const F = [0, 1, 2, 3].map(k => T.addPile({ id: 'f' + k, kind: 'found', label: 'A' }));
    const TB = [0, 1, 2, 3, 4, 5, 6, 7].map(k => T.addPile({ id: 't' + k, kind: 'col', fan: 'down' }));
    G.layout = (w, h) => {
      const gap = Math.max(2, Math.min(9, Math.round(w / 95)));
      T.size(Math.min(84, (w - gap * 9) / 8, (h - gap * 4) / 1.4 / 3));
      const { cw, ch } = T, x0 = Math.round((w - (8 * cw + 7 * gap)) / 2), X = k => x0 + k * (cw + gap);
      C.forEach((p, k) => { p.x = X(k); p.y = gap; });
      F.forEach((p, k) => { p.x = X(4 + k); p.y = gap; });
      TB.forEach((p, k) => { p.x = X(k); p.y = gap * 3 + ch; p.maxY = h - gap; p.upOff = ch * 0.28; });
    };
    const top = p => p.cards[p.cards.length - 1];
    const fitsF = (c, p) => { const t = top(p); return t ? t.s === c.s && t.r === c.r - 1 : c.r === 1; };
    const fitsCol = (c, p) => { const t = top(p); return !t || (red(t.s) !== red(c.s) && t.r === c.r + 1); };
    function isRun(p, i) {
      for (let k = i; k < p.cards.length - 1; k++) { const a = p.cards[k], b = p.cards[k + 1]; if (red(a.s) === red(b.s) || a.r !== b.r + 1) return false; }
      return true;
    }
    const maxMove = to => (C.filter(p => !p.cards.length).length + 1) * Math.pow(2, TB.filter(p => !p.cards.length && p !== to).length);
    G.canPick = (p, i) => {
      if (!S || S.won || !p.cards[i]) return false;
      if (p.kind === 'cell') return i === p.cards.length - 1;
      return p.kind === 'col' && isRun(p, i);
    };
    G.canMove = (from, i, to) => {
      if (from === to || !G.canPick(from, i)) return false;
      const c = from.cards[i], n = from.cards.length - i;
      if (to.kind === 'cell') return n === 1 && !to.cards.length;
      if (to.kind === 'found') return n === 1 && fitsF(c, to);
      return to.kind === 'col' && fitsCol(c, to) && n <= maxMove(to);
    };
    function started() { if (!S.started) { S.started = true; stats.played++; saveStats(); } }
    function status() {
      const home = F.reduce((a, p) => a + p.cards.length, 0);
      T.status(`Game #${S.num}   Moves: ${S.moves}`, `Cards left: ${52 - home}   ${fmt(S.time)}`);
    }
    G.move = (from, i, to) => {
      T.snap(S); started();
      to.cards.push(...from.cards.splice(i));
      S.moves++;
      if (to.kind === 'found') api.tone(700 + top(to).r * 30, 0.05, { vol: 0.05 }); else T.place();
      T.render(); status();
      autoPlay();
    };
    G.auto = (p, i) => {
      if (!G.canPick(p, i) || i !== p.cards.length - 1) return false;
      const c = p.cards[i];
      const f = F.find(f => fitsF(c, f));
      if (f) { G.move(p, i, f); return true; }
      if (p.kind === 'col') { const cell = C.find(q => !q.cards.length); if (cell) { G.move(p, i, cell); return true; } }
      return false;
    };
    G.wake = () => { paused = false; };
    const frank = s => { const f = F.find(p => p.cards.length && p.cards[0].s === s); return f ? f.cards.length : 0; };
    const safe = c => c.r <= 2 || (red(c.s) ? Math.min(frank(0), frank(3)) >= c.r - 1 : Math.min(frank(1), frank(2)) >= c.r - 1);
    async function autoPlay() {
      T.busy = true;
      while (!T.dead) {
        let hit = null;
        for (const p of C.concat(TB)) {
          const c = top(p); if (!c || !safe(c)) continue;
          const f = F.find(f => fitsF(c, f)); if (f) { hit = { p, f }; break; }
        }
        if (!hit) break;
        await T.wait(130);
        if (T.dead) return;
        hit.f.cards.push(hit.p.cards.pop());
        api.tone(700 + top(hit.f).r * 30, 0.04, { vol: 0.05 });
        T.render(); status();
      }
      T.busy = false;
      if (!T.dead) checkEnd();
    }
    function anyMove() {
      for (const src of C.concat(TB)) {
        const n = src.cards.length; if (!n) continue;
        for (const dst of T.piles) if (G.canMove(src, n - 1, dst)) return true;
      }
      return false;
    }
    async function checkEnd() {
      if (F.every(f => f.cards.length === 13)) { win(); return; }
      if (anyMove()) return;
      api.sfx.beep();
      const r = await T.dialog('No more moves', `<p>There are no more legal moves in Game #${S.num}.</p>`, ['Undo', 'Restart', 'New Game']);
      if (r.btn === 'Undo') undo(); else if (r.btn === 'Restart') deal(S.num, true); else deal();
    }
    async function win() {
      if (S.won) return;
      S.won = true; T.busy = true;
      stats.won++; stats.streak++; stats.best = Math.max(stats.best, stats.streak); saveStats();
      api.sfx.tada(); api.earn(5, 'winning FreeCell');
      await T.wait(500);
      const order = [];
      for (let r = 13; r >= 1; r--) F.forEach(f => { const c = f.cards[r - 1]; if (c) order.push(c); });
      await T.bounce(order);
      T.busy = false;
      if (T.dead) return;
      const r = await T.dialog('You won!', `<p>You solved Game #${S.num} in ${S.moves} moves (${fmt(S.time)}).</p><p>Winning streak: ${stats.streak}</p><p>Play another game?</p>`, ['New Game', 'Not now']);
      if (r.btn === 'New Game') deal();
    }
    function deal(num, restart) {
      if (T.busy) return;
      if (S && S.started && !S.won && !restart) { stats.streak = 0; saveStats(); }
      num = num || 1 + Math.floor(Math.random() * 32000);
      const deck = shuffle(fullDeck(), rngFrom(num * 7919 + 17));
      T.setCards(deck, { x: T.w / 2 - T.cw / 2, y: -T.ch });
      deck.forEach((c, k) => { c.up = true; TB[k % 8].cards.push(c); });
      S = { num, moves: 0, time: 0, started: !!(restart && S && S.started), won: false };
      api.setTitle('FreeCell - Game #' + num);
      T.render({ stagger: true }); status();
    }
    function undo() {
      if (T.busy || !S || S.won) return;
      const x = T.undo(); if (x === undefined) { api.sfx.beep(); return; }
      const t = S.time; S = x; S.time = t; S.started = true;
      T.render(); status();
    }
    async function selectGame() {
      if (T.busy || T.modal) return;
      const r = await T.dialog('Select Game', `<label class="cdk-lbl">Choose a game number from 1 to 32000:<br><input class="cdk-in" type="number" min="1" max="32000" value="${1 + Math.floor(Math.random() * 32000)}"></label>`, ['OK', 'Cancel']);
      if (r.btn !== 'OK') return;
      const n = Math.floor(+r.el.querySelector('input').value);
      if (n >= 1 && n <= 32000) deal(n);
      else api.msgBox('Select Game', 'Please enter a number from 1 to 32000.', ['OK'], 'warn');
    }
    const tick = setInterval(() => { if (!T.dead && !paused && S && S.started && !S.won) { S.time++; status(); } }, 1000);
    function help() {
      api.msgBox('How to Play FreeCell',
        'Goal: move all the cards to the four foundations at the top right, building each suit up from Ace to King.\n\n' +
        'All cards are dealt face up, so almost every game can be won with careful planning. In the columns, build down in alternating colors.\n\n' +
        'The four free cells at the top left each hold one card. You can move a run of cards at once if there is room to do it one card at a time: the limit grows with empty free cells and empty columns.\n\n' +
        'Drag cards, or tap a card and then tap its destination. Double-click a card to send it to a foundation (or to a free cell). Cards that are no longer needed are sent home automatically.\n\n' +
        'Every deal has a number, so you can replay a game or challenge a friend with Select Game. Keyboard: arrows, Space, Enter, Ctrl+Z to undo, F2 new game, F3 select game.\n\nWin a game to earn $5.');
    }
    api.menubar([
      { label: 'Game', items: () => [
        { label: 'New Game (F2)', fn: () => deal() },
        { label: 'Select Game... (F3)', fn: selectGame },
        { label: 'Restart This Game', fn: () => deal(S.num, true) },
        '-',
        { label: 'Undo (Ctrl+Z)', fn: undo, disabled: !T.hist.length || !S || S.won },
        '-',
        { label: 'Statistics...', fn: () => statsBox(api, 'FreeCell', stats, `Current streak: ${stats.streak}\nBest streak: ${stats.best}`) },
        '-',
        { label: 'Exit', fn: () => api.close() }
      ] },
      { label: 'Options', items: () => backItems(opt, T, saveOpt) },
      { label: 'Help', items: [{ label: 'How to Play', fn: help }] }
    ]);
    W.onKey = e => {
      paused = false;
      if (T.modal) { T.key(e); return; }
      if (e.key === 'F2') { e.preventDefault(); deal(); return; }
      if (e.key === 'F3') { e.preventDefault(); selectGame(); return; }
      if (isUndoKey(e)) { e.preventDefault(); undo(); return; }
      T.key(e);
    };
    W.onMin = () => { paused = true; };
    W.onResize = () => T.layout();
    W.onClose = () => { clearInterval(tick); T.destroy(); };
    T.layout();
    deal();
  }

  /* ================= Spider Solitaire ================= */
  function openSpider(W, api) {
    const opt = Object.assign({ suits: 1, back: 'era' }, api.load('opt', {}));
    const stats = Object.assign({ played: 0, won: 0, best: 0 }, api.load('stats', {}));
    const saveOpt = () => api.save('opt', opt), saveStats = () => api.save('stats', stats);
    let S = null, paused = false;
    const G = {};
    const T = Table(W, api, G);
    T.setBack(opt.back);
    const TB = [...Array(10)].map((_, k) => T.addPile({ id: 't' + k, kind: 'col', fan: 'down' }));
    const stock = T.addPile({ id: 'stock', kind: 'stock', fan: 'group', group: 10 });
    const done = T.addPile({ id: 'done', kind: 'done', fan: 'group', group: 13 });
    G.layout = (w, h) => {
      const gap = Math.max(2, Math.min(8, Math.round(w / 110)));
      T.size(Math.min(78, (w - gap * 11) / 10, (h - gap * 4) / 1.4 / 3.2));
      const { cw, ch } = T, x0 = Math.round((w - (10 * cw + 9 * gap)) / 2), X = k => x0 + k * (cw + gap);
      TB.forEach((p, k) => { p.x = X(k); p.y = gap; p.maxY = h - ch - gap * 3; p.upOff = ch * 0.27; p.dnOff = ch * 0.1; });
      stock.x = X(9); stock.y = h - ch - gap; stock.gstep = -Math.round(cw * 0.25);
      done.x = X(0); done.y = h - ch - gap; done.gstep = Math.round(cw * 0.3);
    };
    const top = p => p.cards[p.cards.length - 1];
    function isRun(p, i) {
      if (!p.cards[i] || !p.cards[i].up) return false;
      for (let k = i; k < p.cards.length - 1; k++) { const a = p.cards[k], b = p.cards[k + 1]; if (a.s !== b.s || a.r !== b.r + 1) return false; }
      return true;
    }
    G.canPick = (p, i) => !!S && !S.won && p.kind === 'col' && isRun(p, i);
    G.canMove = (from, i, to) => {
      if (to.kind !== 'col' || to === from || !G.canPick(from, i)) return false;
      const t = top(to); return !t || t.r === from.cards[i].r + 1;
    };
    function started() { if (!S.started) { S.started = true; stats.played++; saveStats(); } }
    function status() {
      T.status(`Score: ${S.score}   Moves: ${S.moves}`, `Deals left: ${stock.cards.length / 10}   ${fmt(S.time)}`);
    }
    function flip(p) { const t = top(p); if (t && !t.up) t.up = true; }
    function checkRun(p) {
      const n = p.cards.length;
      if (n < 13) return false;
      const run = p.cards.slice(n - 13);
      if (!run.every((c, k) => c.up && c.s === run[0].s && c.r === 13 - k)) return false;
      p.cards.splice(n - 13);
      done.cards.push(...run.reverse());
      S.score += 100; flip(p);
      [523, 659, 784, 1047].forEach((f, k) => api.tone(f, 0.08, { vol: 0.05, at: k * 0.07 }));
      return true;
    }
    let lastMv = null;
    G.move = (from, i, to) => {
      T.snap(S); started();
      lastMv = { id: from.cards[i].id, from };
      to.cards.push(...from.cards.splice(i));
      S.score--; S.moves++;
      flip(from); T.place();
      T.render(); status();
      T.later(() => { if (checkRun(to)) { T.render(); status(); } checkEnd(); }, 220);
    };
    G.tap = p => {
      if (p === done) return true;
      if (p !== stock || S.won) return false;
      if (!stock.cards.length) return true;
      if (TB.some(q => !q.cards.length)) { api.msgBox('Spider Solitaire', 'Every column needs at least one card before you can deal a new row.', ['OK'], 'warn'); return true; }
      T.snap(S); started();
      TB.forEach(q => { const c = stock.cards.pop(); c.up = true; q.cards.push(c); });
      S.moves++;
      api.noise(0.18, { ft: 'bandpass', f: 1600, vol: 0.08 });
      T.render({ stagger: true }); status();
      T.later(() => { let any = false; TB.forEach(q => { if (checkRun(q)) any = true; }); if (any) { T.render(); status(); } checkEnd(); }, 500);
      return true;
    };
    function bestTarget(p, i) {
      const c = p.cards[i];
      const ok = TB.filter(t => G.canMove(p, i, t));
      return ok.find(t => top(t) && top(t).s === c.s) || ok.find(t => top(t)) || (i > 0 ? ok.find(t => !top(t)) : null);
    }
    G.auto = (p, i) => {
      if (!G.canPick(p, i)) return false;
      const t = bestTarget(p, i);
      if (!t) return false;
      G.move(p, i, t); return true;
    };
    G.wake = () => { paused = false; };
    function findHint() {
      let best = null, bestScore = -1;
      TB.forEach(p => {
        for (let i = 0; i < p.cards.length; i++) {
          if (!G.canPick(p, i)) continue;
          const below = p.cards[i - 1];
          TB.forEach(t => {
            if (!G.canMove(p, i, t) || !top(t) || (lastMv && lastMv.id === p.cards[i].id && lastMv.from === t)) return;
            if (below && below.up && below.r === p.cards[i].r + 1 && (below.s === p.cards[i].s || top(t).s !== p.cards[i].s)) return;
            const sc = (top(t).s === p.cards[i].s ? 10 : 0) + (below && !below.up ? 5 : 0) + (i === 0 ? 3 : 0) + p.cards.length - i;
            if (sc > bestScore) { bestScore = sc; best = { p, i, t }; }
          });
          break;
        }
      });
      const empty = TB.find(t => !t.cards.length);
      if (!best && empty) {
        TB.forEach(p => {
          if (best || !p.cards.length) return;
          const i = p.cards.findIndex((c, k) => G.canPick(p, k));
          if (i > 0) best = { p, i, t: empty };
        });
      }
      return best;
    }
    function hint() {
      if (T.busy || !S || S.won) return;
      const h = findHint();
      if (!h) { T.status(stock.cards.length ? 'No useful moves here. Try dealing a new row.' : 'No useful moves left.', ''); T.later(status, 2500); return; }
      S.score--; status();
      T.sel = { p: h.p, i: h.i }; T.render(); api.sfx.blip(880);
      T.later(() => { if (T.sel && T.sel.p === h.p) { T.sel = null; T.render(); } }, 900);
    }
    function anyMove() {
      for (const p of TB) for (let i = 0; i < p.cards.length; i++) if (G.canPick(p, i)) { for (const t of TB) if (G.canMove(p, i, t)) return true; }
      return false;
    }
    async function checkEnd() {
      if (T.dead || S.won) return;
      if (done.cards.length === 104) { win(); return; }
      if (stock.cards.length || anyMove()) return;
      api.sfx.beep();
      const r = await T.dialog('No more moves', '<p>There are no more moves and no cards left to deal.</p>', ['Undo', 'New Game']);
      if (r.btn === 'Undo') undo(); else deal();
    }
    async function win() {
      S.won = true; T.busy = true;
      stats.won++; stats.best = Math.max(stats.best, S.score); saveStats();
      api.sfx.tada(); api.earn(8, 'winning Spider Solitaire');
      await T.wait(500);
      const kings = []; for (let g = 7; g >= 0; g--) kings.push(done.cards[g * 13 + 12]);
      await T.bounce(kings);
      T.busy = false;
      if (T.dead) return;
      const r = await T.dialog('You won!', `<p>All eight runs are complete.</p><p>Score: <b>${S.score}</b><br>Moves: ${S.moves}<br>Time: ${fmt(S.time)}</p><p>Play again?</p>`, ['New Game', 'Not now']);
      if (r.btn === 'New Game') deal();
    }
    function deal() {
      if (T.busy) return;
      const cards = [];
      for (let d = 0; d < 8; d++) {
        const s = opt.suits === 1 ? 0 : opt.suits === 2 ? (d % 2 ? 1 : 0) : d % 4;
        for (let r = 1; r <= 13; r++) cards.push({ id: d * 13 + r - 1, s, r, up: false });
      }
      shuffle(cards);
      T.setCards(cards, { x: stock.x, y: stock.y });
      for (let k = 0; k < 54; k++) TB[k % 10].cards.push(cards[k]);
      TB.forEach(p => { top(p).up = true; });
      stock.cards = cards.slice(54);
      S = { score: 500, moves: 0, time: 0, started: false, won: false };
      T.render({ stagger: true }); status();
    }
    function undo() {
      if (T.busy || !S || S.won) return;
      const x = T.undo(); if (x === undefined) { api.sfx.beep(); return; }
      const t = S.time; S = x; S.time = t; S.started = true; S.score--; S.moves++;
      T.render(); status();
    }
    const tick = setInterval(() => { if (!T.dead && !paused && S && S.started && !S.won) { S.time++; status(); } }, 1000);
    function setSuits(n) { opt.suits = n; saveOpt(); deal(); }
    function help() {
      api.msgBox('How to Play Spider Solitaire',
        'Goal: build eight complete runs from King down to Ace in a single suit. A finished run leaves the table on its own.\n\n' +
        'You can place any card on a card one rank higher, whatever its suit, but you can only move a group of cards together when they are all the same suit and in order. Any card or group can go into an empty column.\n\n' +
        'Click the deck at the bottom right to deal one new card onto every column (all columns must have cards).\n\n' +
        'Drag cards, or tap a card and then tap its destination. Double-click a card to move it to the best spot. Press H (or Game, Hint) for a hint.\n\n' +
        'Difficulty: 1 suit is relaxing, 2 suits takes thought, 4 suits is a real challenge.\n\n' +
        'You start with 500 points, lose 1 for every move (and every undo or hint) and gain 100 for every finished run.\n\nWin a game to earn $8.');
    }
    api.menubar([
      { label: 'Game', items: () => [
        { label: 'New Game (F2)', fn: deal },
        { label: 'Deal Next Row (D)', fn: () => G.tap(stock), disabled: !S || !stock.cards.length || S.won },
        { label: 'Hint (H)', fn: hint },
        { label: 'Undo (Ctrl+Z)', fn: undo, disabled: !T.hist.length || !S || S.won },
        '-',
        { label: 'Statistics...', fn: () => statsBox(api, 'Spider Solitaire', stats, 'High score: ' + stats.best) },
        '-',
        { label: 'Exit', fn: () => api.close() }
      ] },
      { label: 'Options', items: () => [
        { label: (opt.suits === 1 ? CHECK : NOCHECK) + 'Beginner: 1 suit', fn: () => setSuits(1) },
        { label: (opt.suits === 2 ? CHECK : NOCHECK) + 'Intermediate: 2 suits', fn: () => setSuits(2) },
        { label: (opt.suits === 4 ? CHECK : NOCHECK) + 'Advanced: 4 suits', fn: () => setSuits(4) },
        '-'
      ].concat(backItems(opt, T, saveOpt)) },
      { label: 'Help', items: [{ label: 'How to Play', fn: help }] }
    ]);
    G.keyPiles = () => TB.concat([stock]);
    W.onKey = e => {
      paused = false;
      if (T.modal) { T.key(e); return; }
      if (e.key === 'F2') { e.preventDefault(); deal(); return; }
      if (isUndoKey(e)) { e.preventDefault(); undo(); return; }
      if (e.key === 'h' || e.key === 'H') { hint(); return; }
      if ((e.key === 'd' || e.key === 'D') && !T.busy) { G.tap(stock); return; }
      T.key(e);
    };
    W.onMin = () => { paused = true; };
    W.onResize = () => T.layout();
    W.onClose = () => { clearInterval(tick); T.destroy(); };
    T.layout();
    deal();
  }

  /* ================= Hearts ================= */
  function openHearts(W, api) {
    const opt = Object.assign({ back: 'era' }, api.load('opt', {}));
    const stats = Object.assign({ played: 0, won: 0 }, api.load('stats', {}));
    const saveOpt = () => api.save('opt', opt), saveStats = () => api.save('stats', stats);
    const NAMES = [String(api.user || 'You').slice(0, 12), 'Penny', 'Oscar', 'Maple'];
    const DIRS = ['left', 'right', 'across', 'none'];
    const hv = c => (c.r === 1 ? 14 : c.r);
    const isQS = c => c.s === 0 && c.r === 12;
    const pts = c => (c.s === 1 ? 1 : isQS(c) ? 13 : 0);
    const SORT = [2, 3, 1, 0]; // display order: clubs, diamonds, spades, hearts
    const sortHand = a => a.sort((x, y) => SORT[x.s] - SORT[y.s] || hv(x) - hv(y));
    let S = null, L = { w: 300, h: 300, gap: 4 };
    const G = { canPick: () => false, canMove: () => false, move() {} };
    const T = Table(W, api, G);
    T.setBack(opt.back);
    const H = [0, 1, 2, 3].map(p => T.addPile({ id: 'h' + p, kind: 'hand', fan: p % 2 ? 'down' : 'right', noSlot: true }));
    const P = [0, 1, 2, 3].map(p => T.addPile({ id: 'p' + p, kind: 'play', noSlot: true }));
    const TK = [0, 1, 2, 3].map(p => T.addPile({ id: 'k' + p, kind: 'taken', noSlot: true, hidden: true }));
    const labels = [0, 1, 2, 3].map(() => { const d = document.createElement('div'); d.className = 'cdk-hn'; T.tbl.appendChild(d); return d; });
    const btn = document.createElement('button'); btn.className = 'btn cdk-hbtn'; btn.hidden = true; T.tbl.appendChild(btn);
    btn.addEventListener('pointerdown', e => e.stopPropagation());
    btn.onclick = () => { if (S.phase === 'pass') doPass(); else if (S.phase === 'recv') beginPlay(); };

    G.layout = (w, h) => {
      L = { w, h, gap: Math.max(3, Math.round(w / 120)) };
      T.size(Math.max(40, Math.min(76, w / 7.3, h / 6.2)));
    };
    G.prerender = () => {
      const { cw, ch } = T, { w, h, gap } = L, lab = 17;
      const n0 = H[0].cards.length, st0 = n0 > 1 ? Math.min(cw * 0.62, (w - 2 * gap - cw) / (n0 - 1)) : 0;
      H[0].step = st0; H[0].x = Math.round((w - (cw + st0 * Math.max(0, n0 - 1))) / 2); H[0].y = h - ch - lab - gap;
      const n2 = H[2].cards.length, st2 = Math.min(cw * 0.25, n2 > 1 ? (w - 2 * cw - 6 * gap) / (n2 - 1) : 0);
      H[2].step = st2; H[2].x = Math.round((w - (cw + st2 * Math.max(0, n2 - 1))) / 2); H[2].y = gap + lab;
      const topY = gap + lab, maxY = H[0].y - ch * 0.2 - gap;
      [1, 3].forEach(p => { H[p].x = p === 1 ? gap : w - cw - gap; H[p].y = topY; H[p].maxY = maxY; H[p].dnOff = ch * 0.2; H[p].upOff = ch * 0.2; });
      const cx = w / 2 - cw / 2, cy = (H[2].y + ch + H[0].y - ch * 0.16) / 2 - ch / 2, dx = cw * 0.78, dy = ch * 0.38;
      P[0].x = cx; P[0].y = cy + dy; P[2].x = cx; P[2].y = cy - dy; P[1].x = cx - dx; P[1].y = cy; P[3].x = cx + dx; P[3].y = cy;
      TK[0].x = cx; TK[0].y = h; TK[2].x = cx; TK[2].y = -ch; TK[1].x = -cw; TK[1].y = cy; TK[3].x = w; TK[3].y = cy;
      const pos = [[w / 2, h - lab + 1, 'c'], [gap, gap, 'l'], [w / 2, gap, 'c'], [w - gap, gap, 'r']];
      labels.forEach((d, p) => {
        const [x, y, a] = pos[p];
        d.style.top = y + 'px';
        d.style.left = a === 'l' ? x + 'px' : a === 'c' ? (x - d.offsetWidth / 2) + 'px' : (x - d.offsetWidth) + 'px';
      });
      btn.style.left = (w / 2) + 'px'; btn.style.top = (cy + ch / 2) + 'px';
    };
    function setLabels() {
      labels.forEach((d, p) => {
        d.textContent = `${NAMES[p]}: ${S.scores[p]}` + (S.taken && S.taken[p] ? ` (+${S.taken[p]})` : '');
        d.classList.toggle('cdk-turn', S.phase === 'play' && S.turn === p);
      });
    }
    const msg = (a, b) => T.status(a, b != null ? b : `Hand ${S.hand + 1}, pass ${DIRS[S.hand % 4]}`);

    function newGame() {
      S = { scores: [0, 0, 0, 0], hist: [], hand: 0, phase: 'deal', taken: [0, 0, 0, 0] };
      startHand();
    }
    function startHand() {
      const deck = shuffle(fullDeck());
      T.setCards(deck, { x: L.w / 2 - T.cw / 2, y: L.h / 2 - T.ch / 2 });
      deck.forEach((c, k) => { c.up = k % 4 === 0; H[k % 4].cards.push(c); });
      H.forEach(p => sortHand(p.cards));
      Object.assign(S, { taken: [0, 0, 0, 0], trick: [], broken: false, trickNo: 0, qsGone: false, moon: [false, false, false, false], threat: -1, turn: -1 });
      T.kf = null;
      if (S.hand % 4 === 3) { beginPlay(); T.render({ stagger: true }); return; }
      S.phase = 'pass';
      btn.textContent = 'Pass ' + DIRS[S.hand % 4].replace(/^./, m => m.toUpperCase());
      btn.disabled = true; btn.hidden = false;
      msg(`Choose 3 cards to pass ${DIRS[S.hand % 4]} to ${NAMES[[1, 3, 2][S.hand % 4]]}.`);
      setLabels(); T.render({ stagger: true });
    }
    function aiPass(p) {
      const hand = H[p].cards, cnt = s => hand.filter(c => c.s === s).length;
      const lowSp = hand.filter(c => c.s === 0 && hv(c) < 12).length;
      const score = c => {
        const v = hv(c);
        if (c.s === 0) return v >= 12 ? (lowSp >= 4 ? v : 100 + v) : v * 0.5;
        let sc = v * 2 + (c.s === 1 ? 6 : 0);
        if (c.s !== 1 && cnt(c.s) <= 2) sc += 12;
        return sc;
      };
      return hand.slice().sort((a, b) => score(b) - score(a)).slice(0, 3);
    }
    function doPass() {
      const mine = H[0].cards.filter(c => c.lift);
      if (mine.length !== 3 || S.phase !== 'pass') return;
      const give = [mine, aiPass(1), aiPass(2), aiPass(3)], off = [1, 3, 2][S.hand % 4];
      give.forEach((g, p) => g.forEach(c => { H[p].cards.splice(H[p].cards.indexOf(c), 1); c.lift = false; }));
      give.forEach((g, p) => { const q = (p + off) % 4; g.forEach(c => { c.up = q === 0; c.lift = q === 0; H[q].cards.push(c); }); });
      H.forEach(p => sortHand(p.cards));
      S.phase = 'recv'; btn.textContent = 'OK'; btn.disabled = false;
      msg(`${NAMES[(4 - off) % 4]} passed you the raised cards. Press OK to start.`);
      api.noise(0.2, { ft: 'bandpass', f: 1500, vol: 0.07 });
      T.render();
    }
    function beginPlay() {
      H[0].cards.forEach(c => { c.lift = false; });
      btn.hidden = true; S.phase = 'play';
      for (let p = 1; p < 4; p++) {
        const h = H[p].cards, hearts = h.filter(c => c.s === 1), high = h.filter(c => hv(c) >= 12).length;
        S.moon[p] = hearts.length >= 6 && hearts.filter(c => hv(c) >= 11).length >= 3 && high >= 6;
      }
      S.turn = H.findIndex(p => p.cards.some(c => c.s === 3 && c.r === 2));
      T.render(); next();
    }
    function legal(p) {
      const hand = H[p].cards, tr = S.trick;
      if (!tr.length) {
        if (S.trickNo === 0) return hand.filter(c => c.s === 3 && c.r === 2);
        if (!S.broken) { const nh = hand.filter(c => c.s !== 1); if (nh.length) return nh; }
        return hand.slice();
      }
      const f = hand.filter(c => c.s === tr[0].c.s);
      if (f.length) return f;
      if (S.trickNo === 0) { const np = hand.filter(c => !pts(c)); if (np.length) return np; }
      return hand.slice();
    }
    function why(c) {
      const tr = S.trick;
      if (!tr.length && S.trickNo === 0) return 'The 2 of clubs must lead the first trick.';
      if (!tr.length) return 'Hearts have not been broken yet, so you cannot lead a heart.';
      if (c.s !== tr[0].c.s && H[0].cards.some(x => x.s === tr[0].c.s)) return `You must follow suit and play ${SN[tr[0].c.s]}.`;
      return 'You cannot play points on the first trick.';
    }
    function next() {
      if (T.dead || S.phase !== 'play') return;
      setLabels();
      if (S.trick.length === 4) { T.later(endTrick, 800); return; }
      const p = S.turn;
      if (p === 0) {
        const ok = legal(0);
        H[0].cards.forEach(c => { c.dim = !ok.includes(c); });
        if (!T.kf || T.kf.p !== H[0]) T.kf = null;
        msg(S.trick.length ? 'Your turn. Play a card.' : S.trickNo === 0 ? 'Your turn. Lead the 2 of clubs.' : 'Your turn. Lead any card.');
        T.render();
      } else {
        msg(`${NAMES[p]} is thinking...`);
        T.later(() => play(p, aiChoose(p)), 380 + Math.random() * 300);
      }
    }
    function play(p, c) {
      if (S.phase !== 'play' || S.turn !== p) return;
      H[p].cards.splice(H[p].cards.indexOf(c), 1);
      c.up = true; c.lift = false; c.zb = S.trick.length * 3;
      H[0].cards.forEach(x => { x.dim = false; });
      P[p].cards.push(c); S.trick.push({ p, c });
      if (c.s === 1 && !S.broken) { S.broken = true; }
      if (isQS(c)) { S.qsGone = true; api.tone(196, 0.25, { type: 'square', vol: 0.05 }); } else T.place();
      S.turn = (p + 1) % 4;
      T.render(); next();
    }
    function endTrick() {
      const led = S.trick[0].c.s; let win = S.trick[0];
      S.trick.forEach(t => { if (t.c.s === led && hv(t.c) > hv(win.c)) win = t; });
      const pt = S.trick.reduce((a, t) => a + pts(t.c), 0);
      S.taken[win.p] += pt; S.trickNo++;
      S.trick.forEach(t => { P[t.p].cards = []; t.c.zb = 0; TK[win.p].cards.push(t.c); });
      S.trick = []; S.turn = win.p;
      for (let p = 1; p < 4; p++) if (S.moon[p] && S.taken.some((v, q) => q !== p && v > 0)) S.moon[p] = false;
      const withPts = S.taken.map((v, q) => (v ? q : -1)).filter(q => q >= 0);
      S.threat = withPts.length === 1 && S.taken[withPts[0]] >= 10 && S.trickNo >= 5 ? withPts[0] : -1;
      if (pt) { msg(`${win.p === 0 ? 'You take' : NAMES[win.p] + ' takes'} ${pt} point${pt > 1 ? 's' : ''}.`); if (win.p === 0) api.tone(300, 0.12, { vol: 0.05 }); }
      setLabels(); T.render();
      if (S.trickNo === 13) T.later(endHand, 800); else T.later(next, 450);
    }
    function sheet(note) {
      const rows = S.hist.map((r, k) => `<tr><td>${k + 1}</td>${r.map(v => `<td>${v}</td>`).join('')}</tr>`).join('');
      return `${note ? `<p><b>${api.esc(note)}</b></p>` : ''}<div class="cdk-sheet sunken"><table><tr><th>Hand</th>${NAMES.map(n => `<th>${api.esc(n)}</th>`).join('')}</tr>${rows}<tr class="cdk-tot"><td>Total</td>${S.scores.map(v => `<td>${v}</td>`).join('')}</tr></table></div>`;
    }
    async function endHand() {
      S.phase = 'score';
      let add = S.taken.slice(), note = '';
      const sh = add.indexOf(26);
      if (sh >= 0) { add = add.map((v, p) => (p === sh ? 0 : 26)); note = sh === 0 ? 'You shot the moon! Everyone else gets 26 points.' : `${NAMES[sh]} shot the moon! Everyone else gets 26 points.`; api.sfx.ding(); }
      S.scores = S.scores.map((v, p) => v + add[p]); S.hist.push(add); S.taken = [0, 0, 0, 0];
      setLabels();
      if (Math.max(...S.scores) >= 100) {
        const low = Math.min(...S.scores), winners = NAMES.filter((n, p) => S.scores[p] === low);
        const youWin = S.scores[0] === low;
        stats.played++; if (youWin) stats.won++; saveStats();
        if (youWin) { api.sfx.tada(); api.earn(5, 'winning Hearts'); } else api.tone(220, 0.4, { type: 'triangle', vol: 0.06, to: 150 });
        S.phase = 'over';
        msg(youWin ? 'You won the game!' : `${winners.join(' and ')} won the game.`, 'Game over');
        const r = await T.dialog('Game Over', `<p>${youWin ? (winners.length > 1 ? 'You tied for the lowest score. That counts as a win!' : 'You have the lowest score. You win!') : `${api.esc(winners.join(' and '))} ${winners.length > 1 ? 'share' : 'has'} the lowest score.`}</p>` + sheet(note), ['New Game', 'Close']);
        if (r.btn === 'New Game') newGame();
        return;
      }
      await T.dialog('Score Sheet', sheet(note), ['Next Hand']);
      if (T.dead) return;
      S.hand++; startHand();
    }
    function aiChoose(p) {
      const ok = legal(p); if (ok.length === 1) return ok[0];
      const hand = H[p].cards, tr = S.trick, byV = (a, b) => hv(a) - hv(b);
      const hi = a => a.slice().sort(byV).pop(), lo = a => a.slice().sort(byV)[0];
      const cnt = s => hand.filter(c => c.s === s).length;
      const holdsQS = hand.some(isQS), moon = S.moon[p];
      const nq = a => { const r = a.filter(c => !isQS(c)); return r.length ? r : a; };
      if (!tr.length) {
        if (moon) return hi(ok);
        const sp = ok.filter(c => c.s === 0 && hv(c) < 12);
        if (!holdsQS && !S.qsGone && sp.length && !hand.some(c => c.s === 0 && hv(c) > 12)) return hi(sp);
        let pool = ok.filter(c => c.s !== 1 && !(holdsQS && c.s === 0));
        if (!pool.length) pool = nq(ok);
        return lo(pool);
      }
      const led = tr[0].c.s; let wv = 0, wp = -1;
      tr.forEach(t => { if (t.c.s === led && hv(t.c) > wv) { wv = hv(t.c); wp = t.p; } });
      const ptsIn = tr.reduce((a, t) => a + pts(t.c), 0), last = tr.length === 3;
      const stop = S.threat >= 0 && S.threat !== p;
      if (ok[0].s === led) {
        const under = ok.filter(c => hv(c) < wv), over = ok.filter(c => hv(c) > wv);
        if (moon || (stop && ptsIn && wp === S.threat)) return over.length ? hi(nq(over)) : lo(ok);
        if (led === 0) {
          const qs = ok.find(isQS);
          if (qs && wv > 12) return qs;
          if (!qs && !S.qsGone && !last) { const low = ok.filter(c => hv(c) < 12); if (low.length) return hi(low); }
        }
        if (under.length) return hi(nq(under));
        return last ? hi(nq(ok)) : lo(nq(ok));
      }
      if (moon) { const keep = ok.filter(c => c.s !== 1 && !isQS(c)); return lo(keep.length ? keep : ok); }
      const qs = ok.find(isQS);
      if (qs && !(stop && wp === S.threat)) return qs;
      if (!S.qsGone) { const big = ok.filter(c => c.s === 0 && hv(c) > 12); if (big.length) return hi(big); }
      const hs = ok.filter(c => c.s === 1);
      if (hs.length && !(stop && wp === S.threat)) return hi(hs);
      const others = ok.filter(c => c.s !== 1), pool = others.length ? others : ok;
      return pool.slice().sort((a, b) => (hv(b) + (cnt(b.s) <= 2 ? 4 : 0)) - (hv(a) + (cnt(a.s) <= 2 ? 4 : 0)))[0];
    }
    G.tap = (pile, i) => {
      if (!S || pile !== H[0] || i < 0) return true;
      const c = pile.cards[i];
      if (S.phase === 'pass') {
        const n = pile.cards.filter(x => x.lift).length;
        if (c.lift) c.lift = false; else if (n < 3) c.lift = true; else api.sfx.beep();
        btn.disabled = pile.cards.filter(x => x.lift).length !== 3;
        T.render();
      } else if (S.phase === 'recv') beginPlay();
      else if (S.phase === 'play' && S.turn === 0) {
        if (legal(0).includes(c)) play(0, c);
        else { api.sfx.beep(); msg(why(c)); }
      }
      return true;
    };
    function help() {
      api.msgBox('How to Play Hearts',
        `You play against ${NAMES[1]}, ${NAMES[2]} and ${NAMES[3]}. The goal is to take as FEW points as possible.\n\n` +
        'Each heart you take is worth 1 point and the queen of spades is worth 13. The game ends when someone reaches 100 points, and the lowest score wins.\n\n' +
        'Before each hand you pass 3 cards: to the left, then right, then across, then no passing, and around again.\n\n' +
        'The player with the 2 of clubs leads the first trick. You must follow the suit that was led if you can; otherwise you may play anything (but no points on the first trick). The highest card of the suit led wins the trick and leads next. You cannot lead hearts until a heart has been played.\n\n' +
        'Shooting the moon: take ALL 13 hearts and the queen of spades in one hand, and everyone else gets 26 points instead of you.\n\n' +
        'Click or tap a card to choose or play it. Keyboard: Left and Right to pick a card, Space to choose or play it, Enter to press the button, F2 for a new game.\n\nWin a game to earn $5.');
    }
    api.menubar([
      { label: 'Game', items: () => [
        { label: 'New Game (F2)', fn: confirmNew },
        { label: 'Score Sheet...', fn: () => { if (!T.modal) T.dialog('Score Sheet', S.hist.length ? sheet('') : '<p>No hands have been played yet.</p>', ['OK']); } },
        { label: 'Statistics...', fn: () => statsBox(api, 'Hearts', stats) },
        '-',
        { label: 'Exit', fn: () => api.close() }
      ] },
      { label: 'Options', items: () => backItems(opt, T, saveOpt) },
      { label: 'Help', items: [{ label: 'How to Play', fn: help }] }
    ]);
    async function confirmNew() {
      if (T.modal) return;
      if (S && S.hist.length && S.phase !== 'over') {
        const b = await api.msgBox('Hearts', 'Start a new game? The current game will be lost.', ['Yes', 'No'], 'warn');
        if (b !== 'Yes' || T.dead) return;
      }
      T.timers.forEach(clearTimeout); T.timers.clear();
      newGame();
    }
    W.onKey = e => {
      if (T.modal) { T.key(e); return; }
      if (e.key === 'F2') { e.preventDefault(); confirmNew(); return; }
      const hand = H[0], n = hand.cards.length;
      if (e.key === 'Enter' && !btn.hidden && !btn.disabled) { e.preventDefault(); btn.click(); return; }
      if (!n || !['ArrowLeft', 'ArrowRight', ' ', 'Enter'].includes(e.key)) return;
      e.preventDefault();
      let i = T.kf && T.kf.p === hand ? Math.min(T.kf.i, n - 1) : -1;
      if (e.key === 'ArrowLeft') i = i < 0 ? n - 1 : (i + n - 1) % n;
      else if (e.key === 'ArrowRight') i = i < 0 ? 0 : (i + 1) % n;
      else if (i >= 0) { G.tap(hand, i); i = Math.min(i, hand.cards.length - 1); }
      else i = 0;
      T.kf = i >= 0 ? { p: hand, i } : null;
      T.render();
    };
    W.onResize = () => T.layout();
    W.onClose = () => { T.destroy(); };
    T.layout();
    newGame();
  }

  /* ================= styles and registration ================= */
  const CSS = `
    .cdk{position:absolute;inset:0;display:flex;flex-direction:column;user-select:none;-webkit-user-select:none;--cw:60px;--ch:84px}
    .cdk-tbl{position:relative;flex:1;min-height:0;overflow:hidden;touch-action:none;background:var(--cdk-felt)}
    .cdk-p00 .cdk-tbl{background:radial-gradient(ellipse at 50% 40%,#2c8a50,var(--cdk-felt) 75%)}
    .cdk-st{flex:none;display:flex;justify-content:space-between;gap:10px;padding:2px 6px;font-size:12px;white-space:nowrap;overflow:hidden;border-top:1px solid var(--dk);box-shadow:inset 0 1px #fff;min-height:16px}
    .cdk-st span{overflow:hidden;text-overflow:ellipsis}
    .cdk-c{position:absolute;left:0;top:0;width:var(--cw);height:var(--ch);box-sizing:border-box;border:1px solid #000;border-radius:calc(var(--cw) * .08);background:#fff;overflow:hidden;cursor:pointer;transition:left .22s ease-out,top .22s ease-out,opacity .3s}
    .cdk-c svg{display:block;width:100%;height:100%;pointer-events:none}
    .cdk-c.cdk-dn{background-color:var(--cb1);background-image:repeating-linear-gradient(45deg,var(--cb2) 0 1px,transparent 1px 6px),repeating-linear-gradient(-45deg,var(--cb2) 0 1px,transparent 1px 6px);box-shadow:inset 0 0 0 2px #fff,inset 0 0 0 3px var(--cb1),inset 0 0 0 4px var(--cb2)}
    .cdk-p95 .cdk-c.cdk-dn{background-image:repeating-linear-gradient(90deg,var(--cb2) 0 1px,transparent 1px 5px),repeating-linear-gradient(0deg,var(--cb2) 0 1px,transparent 1px 5px),linear-gradient(135deg,transparent 45%,rgba(255,255,255,.25) 50%,transparent 55%)}
    .cdk-p00 .cdk-c.cdk-dn{background-image:radial-gradient(circle,var(--cb2) 1.3px,transparent 1.8px),radial-gradient(circle,var(--cb2) 1.3px,transparent 1.8px),linear-gradient(160deg,rgba(255,255,255,.22),rgba(0,0,0,.2));background-size:7px 7px,7px 7px,100% 100%;background-position:0 0,3.5px 3.5px,0 0}
    .cdk-noanim .cdk-c{transition:none!important}
    .cdk-c.cdk-drag{transition:none!important;box-shadow:2px 3px 0 rgba(0,0,0,.35)}
    .cdk-c.cdk-dn.cdk-drag{box-shadow:inset 0 0 0 2px #fff,inset 0 0 0 3px var(--cb1),2px 3px 0 rgba(0,0,0,.35)}
    .cdk-c.cdk-sel::after{content:'';position:absolute;inset:0;background:rgba(0,0,140,.42)}
    .cdk-c.cdk-dim::after{content:'';position:absolute;inset:0;background:rgba(0,0,0,.28)}
    .cdk-c.cdk-kf,.cdk-slot.cdk-kf{outline:2px dashed #ff0;outline-offset:1px}
    .cdk-c.cdk-gone{opacity:0;pointer-events:none}
    .cdk-c.cdk-mv{pointer-events:none}
    .cdk-slot{position:absolute;width:var(--cw);height:var(--ch);box-sizing:border-box;border:1px solid rgba(0,0,0,.5);border-radius:calc(var(--cw) * .08);background:rgba(0,0,0,.12);box-shadow:inset 1px 1px rgba(255,255,255,.2);cursor:pointer}
    .cdk-slot span{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.4);font:700 calc(var(--cw) * .42)/1 Arial,Helvetica,sans-serif}
    .cdk-cv{position:absolute;left:0;top:0;z-index:4000;touch-action:none;cursor:pointer}
    .cdk-ov{position:absolute;inset:0;z-index:5000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.2)}
    .cdk-dlg{max-width:calc(100% - 16px);max-height:calc(100% - 16px);min-width:200px;display:flex;flex-direction:column;padding:3px;box-sizing:border-box}
    .cdk-dt{background:var(--navy);color:#fff;font-weight:700;padding:2px 6px;flex:none}
    .cdk-db{padding:8px 12px;overflow:auto;min-height:0}
    .cdk-db p{margin:0 0 8px}
    .cdk-dbt{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;padding:4px 8px 8px;flex:none}
    .cdk-dbt .btn{min-width:72px}
    .cdk-lbl{display:block;line-height:1.8}
    .cdk-in{width:110px;font:inherit;padding:2px 4px}
    .cdk-sheet{background:#fff;overflow:auto;max-height:260px}
    .cdk-sheet table{border-collapse:collapse;width:100%;font-size:12px}
    .cdk-sheet th,.cdk-sheet td{border:1px solid #c0c0c0;padding:2px 6px;text-align:right;white-space:nowrap}
    .cdk-sheet th{background:#e8e8e8;text-align:center;max-width:70px;overflow:hidden;text-overflow:ellipsis}
    .cdk-sheet .cdk-tot td{font-weight:700;border-top:2px solid #000}
    .cdk-hn{position:absolute;z-index:900;color:#fff;font:700 12px/1.3 var(--ui);text-shadow:1px 1px 0 #000;white-space:nowrap;pointer-events:none}
    .cdk-hn.cdk-turn{color:#ff0}
    .cdk-hbtn{position:absolute;z-index:2500;transform:translate(-50%,-50%);font-weight:700}
  `;

  /* pixel-art icons */
  const svg = b => `<svg viewBox="0 0 32 32" shape-rendering="crispEdges" aria-hidden="true">${b}</svg>`;
  const ICON_SOL = svg('<rect x="3" y="7" width="15" height="21" fill="#1d3f9a" stroke="#000"/><rect x="5" y="9" width="11" height="17" fill="none" stroke="#7d9cf0"/><rect x="13" y="3" width="15" height="21" fill="#fff" stroke="#000"/><rect x="15" y="5" width="2" height="3" fill="#c41e1e"/><path d="M20 9h2v1h1v1h1v2h-1v1h-1v1h-2v-1h-1v-1h-1v-2h1v-1h1z" fill="#c41e1e"/>');
  const ICON_FC = svg('<rect x="1" y="4" width="30" height="24" fill="#0a7a2a" stroke="#000"/><g fill="none" stroke="#9fd89f"><rect x="3" y="6" width="5" height="7"/><rect x="9" y="6" width="5" height="7"/></g><rect x="18" y="6" width="5" height="7" fill="#fff" stroke="#000"/><rect x="24" y="6" width="5" height="7" fill="#fff" stroke="#000"/><rect x="9" y="15" width="10" height="12" fill="#fff" stroke="#000"/><rect x="13" y="18" width="2" height="6" fill="#111"/><rect x="11" y="20" width="6" height="2" fill="#111"/>');
  const ICON_HEARTS = svg('<rect x="6" y="3" width="20" height="26" fill="#fff" stroke="#000"/><path d="M10 10h4v1h1v1h2v-1h1v-1h4v1h1v5h-1v2h-1v1h-1v1h-1v1h-1v1h-1v1h-2v-1h-1v-1h-1v-1h-1v-1h-1v-1h-1v-2h-1v-5h1z" fill="#c41e1e"/><rect x="11" y="11" width="2" height="2" fill="#f88"/>');
  const ICON_SPIDER = svg('<rect x="6" y="3" width="20" height="26" fill="#fff" stroke="#000"/><g fill="#111"><rect x="14" y="10" width="4" height="4"/><rect x="13" y="14" width="6" height="7"/><rect x="9" y="11" width="4" height="1"/><rect x="8" y="12" width="1" height="3"/><rect x="19" y="11" width="4" height="1"/><rect x="23" y="12" width="1" height="3"/><rect x="9" y="16" width="4" height="1"/><rect x="8" y="17" width="1" height="3"/><rect x="19" y="16" width="4" height="1"/><rect x="23" y="17" width="1" height="3"/><rect x="10" y="20" width="3" height="1"/><rect x="9" y="21" width="1" height="3"/><rect x="19" y="20" width="3" height="1"/><rect x="22" y="21" width="1" height="3"/></g><rect x="15" y="11" width="1" height="1" fill="#c41e1e"/><rect x="16" y="11" width="1" height="1" fill="#c41e1e"/>');

  (window.RETRO_APPS = window.RETRO_APPS || []).push(
    { id: 'solitaire', help: 'The classic one-player card game. Win to earn money.', label: 'Solitaire', kind: 'builtin', cat: 'game', eras: ['1990', '1995', '2000'], icon: ICON_SOL, window: { w: 620, h: 500 }, css: CSS, open: openSolitaire },
    { id: 'freecell', help: 'A card puzzle you can almost always solve. Win to earn money.', label: 'FreeCell', kind: 'builtin', cat: 'game', eras: ['1995', '2000'], icon: ICON_FC, window: { w: 620, h: 500 }, open: openFreeCell },
    { id: 'hearts', help: 'A card game against three computer players. Avoid the hearts!', label: 'Hearts', kind: 'builtin', cat: 'game', eras: ['1995', '2000'], icon: ICON_HEARTS, window: { w: 620, h: 520 }, open: openHearts },
    { id: 'spider', help: 'Solitaire with two decks. Pick 1, 2 or 4 suits. Win to earn money.', label: 'Spider Solitaire', kind: 'builtin', cat: 'game', eras: ['2000'], icon: ICON_SPIDER, window: { w: 720, h: 540 }, open: openSpider }
  );
})();
