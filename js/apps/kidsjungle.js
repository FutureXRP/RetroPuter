/* Kids store games: Pip's Jungle Trek (1995 preschool explorer adventure) and Letter Garden (1990 phonics).
   All characters and places are original. Pictures are drawn with a tiny pixel rasterizer into inline SVG. */
(function () {
  'use strict';
  const STOP = { stop: true };
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pickA = a => a[Math.floor(Math.random() * a.length)];
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------- tiny pixel rasterizer: shapes are tested at pixel centers, output is run-length <rect>s ---------- */
  function rast(w, h, draw) {
    const G = [];
    for (let y = 0; y < h; y++) G.push(new Array(w).fill(0));
    const F = (t, c) => { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (t(x + 0.5, y + 0.5)) G[y][x] = c; };
    const d = {
      F,
      R: (x, y, ww, hh, c) => F((a, b) => a >= x && a < x + ww && b >= y && b < y + hh, c),
      C: (cx, cy, r, c) => F((a, b) => (a - cx) ** 2 + (b - cy) ** 2 <= r * r, c),
      E: (cx, cy, rx, ry, c) => F((a, b) => ((a - cx) / rx) ** 2 + ((b - cy) / ry) ** 2 <= 1, c),
      T: (x1, y1, x2, y2, x3, y3, c) => F((a, b) => {
        const s1 = (x2 - x1) * (b - y1) - (y2 - y1) * (a - x1), s2 = (x3 - x2) * (b - y2) - (y3 - y2) * (a - x2), s3 = (x1 - x3) * (b - y3) - (y1 - y3) * (a - x3);
        return (s1 >= 0 && s2 >= 0 && s3 >= 0) || (s1 <= 0 && s2 <= 0 && s3 <= 0);
      }, c),
      L: (x1, y1, x2, y2, c, t = 0.6) => F((a, b) => {
        const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy || 1;
        let u = ((a - x1) * dx + (b - y1) * dy) / l2; u = u < 0 ? 0 : u > 1 ? 1 : u;
        return Math.hypot(a - x1 - u * dx, b - y1 - u * dy) <= t;
      }, c),
      P: (x, y, c) => { if (G[y] && x >= 0 && x < w) G[y][x] = c; }
    };
    draw(d);
    let s = '';
    for (let y = 0; y < h; y++) for (let x = 0; x < w;) {
      const c = G[y][x]; if (!c) { x++; continue; }
      let e = x + 1; while (e < w && G[y][e] === c) e++;
      s += `<rect x="${x}" y="${y}" width="${e - x}" height="1" fill="${c}"/>`; x = e;
    }
    return s;
  }
  const svgBox = (w, h, inner, cls) => `<svg${cls ? ` class="${cls}"` : ''} viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges" aria-hidden="true">${inner}</svg>`;
  const K = '#141010';

  /* ---------- shared async "script" helper: speech + cancellable waits ---------- */
  function mkFlow(api, sayEl) {
    const F = { gen: 0, alive: true, voice: true, last: '', timers: new Set() };
    F.sleep = ms => new Promise(r => { const t = setTimeout(() => { F.timers.delete(t); r(); }, ms); F.timers.add(t); });
    F.guard = (g, p) => Promise.resolve(p).then(v => { if (g !== F.gen || !F.alive) throw STOP; return v; });
    F.run = fn => { const g = ++F.gen; fn(g).catch(e => { if (e !== STOP) console.error(e); }); };
    F.talk = (text, spoken, o) => {
      sayEl.textContent = text; F.last = spoken || text; F.lastO = o;
      return F.voice ? api.say(F.last, Object.assign({ rate: 0.92 }, o || {})) !== false : false;
    };
    F.again = () => { if (F.last && F.voice) api.say(F.last, Object.assign({ rate: 0.85 }, F.lastO || {})); };
    F.talkWait = async (g, text, spoken, o) => {
      const ok = F.talk(text, spoken, o), t0 = Date.now(), est = Math.min(5200, 800 + text.length * 48);
      await F.guard(g, F.sleep(400));
      if (ok && window.speechSynthesis) {
        while (Date.now() - t0 < 14000 && (speechSynthesis.speaking || speechSynthesis.pending)) await F.guard(g, F.sleep(150));
      }
      const left = (ok ? 700 : est) - (Date.now() - t0);
      if (left > 0) await F.guard(g, F.sleep(left));
    };
    F.tap = (g, els) => {
      if (F.scope) F.scope.querySelectorAll('[data-n]').forEach(e => { delete e.dataset.n; });
      return F.guard(g, new Promise(res => els.forEach((el, i) => { el.dataset.n = i + 1; el.onclick = () => res(i); })));
    };
    F.stop = () => {
      F.alive = false; F.gen++;
      F.timers.forEach(clearTimeout); F.timers.clear();
      try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) { /* ignore */ }
    };
    return F;
  }
  const jingle = (api, notes, step = 0.11, type = 'square') => notes.forEach((n, i) => { if (n) api.tone(api.midi(n), step * 1.4, { type, vol: 0.06, at: i * step }); });

  /* =====================================================================================
     PIP'S JUNGLE TREK
     ===================================================================================== */
  const PIPC = { straw: '#f4c838', straw2: '#c8961c', band: '#d8302a', skin: '#c98a5a', hair: '#4a2a14', shirt: '#e8742a', vest: '#b8a870', vest2: '#8a7c4a', shorts: '#2d5bb8', boot: '#6a3a18', pink: '#f08a8a' };
  const ART = {
    pip: [24, 32, d => {
      const c = PIPC;
      d.R(9, 26, 2, 4, c.skin); d.R(13, 26, 2, 4, c.skin);
      d.R(7, 29, 4, 3, c.boot); d.R(13, 29, 4, 3, c.boot);
      d.R(8, 23, 8, 4, c.shorts);
      d.R(5, 17, 2, 6, c.shirt); d.R(17, 17, 2, 6, c.shirt);
      d.C(6, 24, 1.6, c.skin); d.C(18, 24, 1.6, c.skin);
      d.R(7, 17, 10, 7, c.shirt);
      d.R(7, 17, 3, 7, c.vest); d.R(14, 17, 3, 7, c.vest); d.R(7, 20, 2, 2, c.vest2); d.R(15, 20, 2, 2, c.vest2);
      d.R(10, 16, 4, 1, c.skin); d.T(9, 16.5, 15, 16.5, 12, 20, c.band);
      d.C(12, 12.5, 4.8, c.skin);
      d.R(7, 9, 2, 5, c.hair); d.R(15, 9, 2, 5, c.hair);
      d.R(9, 12, 1, 2, K); d.R(14, 12, 1, 2, K);
      d.P(8, 14, c.pink); d.P(15, 14, c.pink);
      d.P(10, 15, K); d.R(11, 16, 2, 1, K); d.P(13, 15, K);
      d.E(12, 5, 5, 4, c.straw); d.R(8, 6, 8, 2, c.band);
      d.E(12, 9, 11.8, 2.2, c.straw); d.R(3, 10, 18, 1, c.straw2);
      d.P(10, 3, c.straw2); d.P(14, 4, c.straw2); d.P(12, 2, c.straw2); d.P(4, 9, c.straw2); d.P(19, 9, c.straw2);
    }],
    hop: [14, 10, d => {
      const g = '#3cb83c';
      d.E(1.8, 9, 1.8, 1, '#f08020'); d.E(12.2, 9, 1.8, 1, '#f08020');
      d.E(7, 6.5, 6, 3.3, g); d.C(3.5, 3, 2.3, g); d.C(10.5, 3, 2.3, g);
      d.C(3.5, 3, 1.4, '#e82020'); d.C(10.5, 3, 1.4, '#e82020'); d.P(3, 2, K); d.P(10, 2, K);
      d.E(7, 7.6, 3.6, 1.6, '#b8f070'); d.R(5, 6, 4, 1, '#1a6a1a');
    }],
    needle: [18, 20, d => {
      d.C(9, 2.2, 1.9, '#c8961c'); d.P(8, 2, '#6a4a10');
      d.C(9, 11, 8, '#a87a14'); d.C(9, 11, 7, '#e8c050'); d.C(9, 11, 5.8, '#fff4d0');
      d.P(8, 5, '#a08050'); d.P(3, 10, '#a08050'); d.P(14, 10, '#a08050');
      d.T(9, 5, 7.8, 10.5, 10.2, 10.5, '#e02828'); d.T(9, 14, 7.8, 10.5, 10.2, 10.5, '#2a50c8');
      d.C(9, 10.5, 0.9, K);
      d.R(5, 8, 1, 2, K); d.R(12, 8, 1, 2, K);
      d.P(4, 11, '#f08a8a'); d.P(13, 11, '#f08a8a');
      d.P(6, 14, K); d.R(7, 15, 4, 1, K); d.P(11, 14, K);
    }],
    glimmer: [24, 18, d => {
      d.L(15, 11, 23, 5.5, K, 1.4); d.L(15, 12, 23, 8.5, '#3050b8', 1);
      d.L(10.5, 14, 9.5, 17.5, '#505050', 0.5); d.L(13.5, 14, 13.5, 17.5, '#505050', 0.5);
      d.E(12, 11, 6.5, 4.4, K); d.E(10, 12.5, 4.3, 2.8, '#ffffff');
      d.E(14.5, 10, 4.8, 2.6, '#3050b8'); d.L(11, 9.5, 18, 10.5, '#7aa0ff', 0.45);
      d.C(6.5, 6.5, 4, K); d.C(5.5, 5.5, 1.3, '#ffffff'); d.P(5, 5, K);
      d.T(0, 7.5, 3.5, 5.5, 3.5, 8.5, '#808080'); d.P(7, 8, '#f07a9a');
    }],
    peep: [16, 14, d => { bird(d, '#ffd83a', '#e8b010'); }],
    mama: [16, 14, d => { bird(d, '#5a8af0', '#2a58c0'); }],
    tort: [24, 16, d => {
      const sk = '#9ab85a';
      d.R(4, 11, 3, 4, sk); d.R(14, 11, 3, 4, sk);
      d.R(16, 7, 3, 4, sk); d.C(20, 7, 3.4, sk);
      d.F((a, b) => ((a - 10.5) / 8.4) ** 2 + ((b - 10) / 8) ** 2 <= 1 && b < 11.5, '#3a8a3a');
      d.C(7, 7, 1.6, '#2a6a2a'); d.C(11, 5, 1.6, '#2a6a2a'); d.C(14.5, 8, 1.6, '#2a6a2a'); d.C(10, 9.5, 1.4, '#2a6a2a');
      d.R(2, 11, 17, 2, '#c8a860');
      d.R(19, 5, 4, 3, '#505060'); d.R(20, 6, 2, 1, '#d8f0ff'); d.P(21, 6, K);
      d.R(20, 9, 2, 1, '#5a3a1a');
      d.C(19, 3.5, 1.3, '#ff70b0'); d.P(19, 3, '#ffe040');
    }],
    toucan: [20, 22, d => {
      d.R(6, 18, 4, 4, K); d.L(8, 19, 7, 21.5, '#f08020', 0.5); d.L(10, 19, 11, 21.5, '#f08020', 0.5);
      d.E(8, 12.5, 4.8, 7, K); d.E(9.5, 13, 2.8, 5, '#303038');
      d.E(7.2, 9.2, 3, 2.6, '#ffe040'); d.R(7, 18, 3, 1, '#e02020');
      d.C(8, 6, 4, K); d.C(8.5, 5.5, 1.5, '#58b0ff'); d.P(8, 5, K);
      d.E(15, 7, 5.5, 2.4, '#ff9020'); d.E(15, 6, 5, 1, '#ffd040'); d.C(19.6, 7.6, 1.2, K);
    }],
    bo: [22, 18, d => {
      const g = '#9aa0b0';
      d.L(5, 10, 3.5, 13, g, 0.5);
      d.R(7, 13, 3, 5, g); d.R(14, 13, 3, 5, g);
      d.E(11.5, 11, 7, 4.6, g); d.C(17, 7.5, 4.8, g);
      d.L(21, 8, 21.3, 14, g, 1.1); d.L(21.3, 14, 19.6, 15.6, g, 0.9);
      d.E(13.5, 8, 3.5, 4.3, '#848aa0'); d.E(13.5, 8, 2.1, 2.9, '#e8a0b0');
      d.P(18, 6, K); d.P(19, 8, '#f08a9a');
      d.R(7, 17, 3, 1, '#e8e8e8'); d.R(14, 17, 3, 1, '#e8e8e8');
      d.L(16.5, 3, 17.5, 1.5, '#606070', 0.4);
    }],
    luma: [18, 16, d => {
      d.E(4.5, 6, 4, 3, '#c8ecff'); d.E(13.5, 6, 4, 3, '#c8ecff');
      d.L(8, 2, 6, 0, K, 0.5); d.L(10, 2, 12, 0, K, 0.5);
      d.E(9, 9.5, 3, 4.5, '#404050');
      d.C(9, 12.6, 3, '#fff060'); d.C(9, 12.6, 1.8, '#ffffc8');
      d.C(9, 4.5, 2.7, '#e04040'); d.P(8, 4, '#ffffff'); d.P(10, 4, '#ffffff'); d.P(8, 5, K); d.P(10, 5, K);
    }],
    sloth: [16, 16, d => {
      d.L(3, 10, 1, 3, '#8a6a4a', 1.2); d.L(13, 10, 15, 3, '#8a6a4a', 1.2);
      d.C(8, 9.5, 6, '#8a6a4a'); d.E(8, 8.5, 4.6, 3.6, '#e8d8b0');
      d.E(5.5, 8, 1.9, 1.1, '#4a3a2a'); d.E(10.5, 8, 1.9, 1.1, '#4a3a2a');
      d.P(5, 8, '#ffffff'); d.P(10, 8, '#ffffff');
      d.C(8, 10, 0.9, '#3a2a1a'); d.R(7, 11, 2, 1, '#8a4a3a');
    }],
    lizard: [20, 10, d => {
      const g = '#40b040';
      d.L(1, 8, 6, 6, g, 1); d.L(7, 7.5, 6, 9.6, g, 0.6); d.L(13, 7.5, 14, 9.6, g, 0.6);
      d.E(10, 6, 5.5, 2.5, g); d.E(10, 5, 4, 1, '#80e060');
      d.E(16, 5, 3.2, 2.2, g); d.P(17, 4, K); d.P(9, 6, '#f0d040'); d.P(12, 6, '#f0d040');
    }],
    pail: [16, 16, d => {
      d.F((a, b) => { const r = Math.hypot(a - 8, b - 6); return r >= 5 && r <= 6.1 && b < 6; }, '#707080');
      d.C(5, 4.5, 1.8, '#d02040'); d.C(8, 3.8, 1.8, '#a01060'); d.C(11, 4.5, 1.8, '#d02040'); d.P(8, 3, '#ff80a0');
      d.F((a, b) => b >= 6 && b <= 15 && a >= 3 + (b - 6) * 0.2 && a <= 13 - (b - 6) * 0.2, '#a8a8b8');
      d.R(2, 5, 12, 2, '#d0d0e0'); d.R(5, 8, 1, 6, '#d0d0e0');
    }],
    bell: [16, 16, d => {
      d.C(8, 2, 1.3, '#b08010');
      d.F((a, b) => ((a - 8) / 5) ** 2 + ((b - 8) / 5.6) ** 2 <= 1 && b <= 12, '#f0c020');
      d.R(2, 11, 12, 2, '#f0c020'); d.R(2, 12, 12, 1, '#c89010');
      d.C(8, 14, 1.6, '#b07010'); d.L(6, 5, 5, 9.5, '#fff0a0', 0.5);
    }],
    bucket: [16, 16, d => {
      d.F((a, b) => { const r = Math.hypot(a - 8, b - 5); return r >= 5.5 && r <= 6.5 && b < 5; }, '#606070');
      d.F((a, b) => b >= 4 && b <= 15 && a >= 2 + (b - 4) * 0.25 && a <= 14 - (b - 4) * 0.25, '#b8c0d0');
      d.E(8, 4.5, 6, 1.5, '#4a90f0'); d.R(4, 7, 1, 7, '#e8f0ff'); d.R(2, 9, 12, 1, '#8890a0');
    }],
    lantern: [16, 16, d => {
      d.F((a, b) => { const r = Math.hypot(a - 8, b - 3); return r >= 3 && r <= 3.8 && b < 3; }, '#6a4a20');
      d.R(3, 3, 10, 2, '#8a5a2a'); d.R(4, 5, 8, 10, '#bfeaff');
      d.C(8, 10, 3.2, '#fff060'); d.C(8, 10, 1.8, '#ffffd0'); d.R(5, 6, 1, 7, '#ffffff');
    }],
    stone: [16, 12, d => { d.E(8, 7, 7.5, 4.5, '#5a5a66'); d.E(8, 6, 7, 4, '#9a9aa8'); d.E(6, 4.5, 3, 1.2, '#c8c8d4'); }],
    berry: [16, 16, d => {
      d.E(11, 3, 3, 1.4, '#2a9a2a'); d.L(8, 5, 10, 2, '#2a6a2a', 0.5);
      d.C(5.5, 9, 3.2, '#c01838'); d.C(10.5, 9, 3.2, '#d82040'); d.C(8, 12.5, 3.2, '#b01030');
      d.P(4, 8, '#ff90a0'); d.P(9, 8, '#ff90a0'); d.P(7, 11, '#ff90a0');
    }],
    banana: [16, 16, d => {
      d.F((a, b) => { const r = Math.hypot(a - 13, b - 3); return r >= 7.5 && r <= 11 && a < 13 && b > 3; }, '#f8d820');
      d.F((a, b) => { const r = Math.hypot(a - 13, b - 3); return r >= 7.5 && r <= 8.5 && a < 12 && b > 4; }, '#c8a010');
      d.R(12, 2, 2, 3, '#6a4a10'); d.C(3, 6, 0.9, '#4a3a10');
    }],
    pad: [16, 12, d => {
      d.F((a, b) => ((a - 8) / 7.5) ** 2 + ((b - 6.5) / 4.8) ** 2 <= 1 && !(a > 8 && Math.abs(b - 6.5) < (a - 8) * 0.35), '#3aa03a');
      d.F((a, b) => ((a - 8) / 5.5) ** 2 + ((b - 6.5) / 3.2) ** 2 <= 1 && !(a > 8 && Math.abs(b - 6.5) < (a - 8) * 0.5), '#58c050');
      d.C(4, 5, 1.2, '#ffb0d0');
    }],
    drop: [16, 16, d => { d.C(8, 10, 5, '#3a8ae0'); d.T(8, 1, 3.8, 8, 12.2, 8, '#3a8ae0'); d.E(6, 10, 1.2, 2, '#bfe4ff'); }],
    leaf: [16, 16, d => {
      d.F((a, b) => { const u = (a - 8) * 0.707 + (b - 8) * 0.707, v = -(a - 8) * 0.707 + (b - 8) * 0.707; return (u / 7) ** 2 + (v / 3.6) ** 2 <= 1; }, '#30b030');
      d.L(3, 13, 12.5, 3.5, '#1a7a1a', 0.5); d.L(2, 14, 4, 12, '#1a7a1a', 0.6);
    }],
    moon: [16, 16, d => { d.C(8, 8, 7, '#fff4b0'); d.C(5, 6, 1.4, '#e8d890'); d.C(10, 10, 1.8, '#e8d890'); d.C(11, 5, 1, '#e8d890'); }],
    redblob: [16, 16, d => { d.C(8, 8, 6.5, '#e02828'); d.C(6, 6, 1.6, '#ff8a8a'); }],
    yellowblob: [16, 16, d => { d.C(8, 8, 6.5, '#f8d820'); d.C(6, 6, 1.6, '#fff8a8'); }],
    bridgepic: [16, 16, d => {
      d.R(1, 5, 1, 7, '#6a4a20'); d.R(14, 5, 1, 7, '#6a4a20');
      d.F((a, b) => { const y = 7 + 3 * Math.sin(Math.PI * (a - 1) / 14); return a > 1 && a < 15 && Math.abs(b - y) < 0.6; }, '#8a6a30');
      for (let i = 0; i < 7; i++) { const x = 2 + i * 2, y = Math.round(10 + 3 * Math.sin(Math.PI * (x - 1) / 14)); d.R(x, y, 1, 2, '#c08840'); }
      d.R(0, 14, 16, 2, '#3a8ae0');
    }],
    balloons: [16, 16, d => {
      d.L(4, 8, 8, 15, '#606060', 0.4); d.L(8, 7, 8, 15, '#606060', 0.4); d.L(12, 8, 8, 15, '#606060', 0.4);
      d.E(4, 5, 3, 3.6, '#e02828'); d.E(12, 5, 3, 3.6, '#2a58e0'); d.E(8, 4, 3, 3.6, '#f8d820'); d.P(3, 3, '#ffffff'); d.P(7, 2, '#ffffff'); d.P(11, 3, '#ffffff');
    }],
    heartpic: [16, 16, d => { d.C(5, 6, 3.6, '#e83a6a'); d.C(11, 6, 3.6, '#e83a6a'); d.T(1.6, 7.4, 14.4, 7.4, 8, 14.5, '#e83a6a'); d.P(4, 5, '#ffb0c8'); }],
    starpic: [16, 16, d => {
      const pts = []; for (let i = 0; i < 10; i++) { const r = i % 2 ? 3 : 7.5, a = -Math.PI / 2 + i * Math.PI / 5; pts.push([8 + r * Math.cos(a), 8.5 + r * Math.sin(a)]); }
      for (let i = 0; i < 10; i += 2) d.T(8, 8.5, pts[i][0], pts[i][1], pts[(i + 1) % 10][0], pts[(i + 1) % 10][1], '#f8d820'), d.T(8, 8.5, pts[i][0], pts[i][1], pts[(i + 9) % 10][0], pts[(i + 9) % 10][1], '#f8d820');
    }],
    flowerpic: [16, 16, d => {
      d.L(8, 9, 8, 15.5, '#2a8a2a', 0.6); d.E(10.5, 13, 2.2, 1, '#3aaa3a');
      for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; d.C(8 + 3.3 * Math.cos(a), 6 + 3.3 * Math.sin(a), 2.2, '#ff70b0'); }
      d.C(8, 6, 2, '#ffe040');
    }]
  };
  function bird(d, body, wing) {
    d.L(7, 12.5, 7, 14, '#f08020', 0.5); d.L(10, 12.5, 10, 14, '#f08020', 0.5);
    d.L(8.5, 3, 10, 1, body, 0.6); d.C(8.5, 8, 5.5, body); d.E(10.8, 9, 3, 2, wing);
    d.P(6, 6, K); d.P(5, 8, '#f8a0a0'); d.T(1, 8, 3.8, 6.8, 3.8, 9.2, '#f08020');
  }
  const artCache = {};
  const A = (k, cls) => {
    if (!artCache[k]) { const [w, h, f] = ART[k]; artCache[k] = [w, h, rast(w, h, f)]; }
    const [w, h, s] = artCache[k]; return svgBox(w, h, s, cls);
  };

  /* ---------- vector shapes, objects and scenes ---------- */
  const SHAPES = {
    circle: c => `<circle cx="10" cy="10" r="8.5" fill="${c}"/>`,
    square: c => `<rect x="2" y="2" width="16" height="16" fill="${c}"/>`,
    triangle: c => `<path d="M10 1.5L18.5 18H1.5Z" fill="${c}"/>`,
    star: c => `<path d="M10 1l2.6 5.9 6.4.6-4.8 4.3 1.4 6.3L10 14.8l-5.6 3.3 1.4-6.3L1 7.5l6.4-.6z" fill="${c}"/>`,
    heart: c => `<path d="M10 18.5L2.6 10.6A4.5 4.5 0 0 1 10 4.6a4.5 4.5 0 0 1 7.4 6z" fill="${c}"/>`
  };
  const shapeSVG = (k, c, stroke) => `<svg viewBox="-1 -1 22 22" aria-hidden="true"><g stroke="${stroke || '#000'}" stroke-width="1.2" stroke-linejoin="round">${SHAPES[k](c)}</g></svg>`;
  const COLORS = { red: '#e02828', blue: '#2a58e0', yellow: '#f8d820', green: '#30b030', orange: '#f08020', purple: '#9040c0' };
  const doorSVG = c => `<svg viewBox="0 0 24 32" aria-hidden="true"><path d="M2 32V11a10 10 0 0 1 20 0v21z" fill="${c}" stroke="#3a2410" stroke-width="1.5"/><path d="M8 30V13M16 30V13" stroke="rgba(0,0,0,.25)" stroke-width="1.2"/><circle cx="18" cy="20" r="1.6" fill="#ffe070" stroke="#000" stroke-width=".5"/></svg>`;
  const flowerSVG = c => `<svg viewBox="0 0 24 32" aria-hidden="true"><path d="M12 14V31" stroke="#2a8a2a" stroke-width="2.4"/><ellipse cx="16" cy="24" rx="4" ry="1.8" fill="#3aaa3a"/><g fill="${c}" stroke="rgba(0,0,0,.35)" stroke-width=".6">${[0, 1, 2, 3, 4, 5].map(i => `<circle cx="${(12 + 5 * Math.cos(i * Math.PI / 3)).toFixed(1)}" cy="${(10 + 5 * Math.sin(i * Math.PI / 3)).toFixed(1)}" r="3.6"/>`).join('')}</g><circle cx="12" cy="10" r="3" fill="${c === COLORS.yellow ? '#a0522d' : '#ffe040'}"/></svg>`;
  const SPOTS = {
    bush: `<svg viewBox="0 0 40 30" aria-hidden="true"><circle cx="12" cy="18" r="11" fill="#1f7a2a"/><circle cx="28" cy="18" r="11" fill="#1f7a2a"/><circle cx="20" cy="11" r="11" fill="#2f9a3a"/><rect x="2" y="24" width="36" height="6" fill="#1a6a24"/><circle cx="16" cy="9" r="3" fill="#4ab84a"/></svg>`,
    log: `<svg viewBox="0 0 40 30" aria-hidden="true"><rect x="3" y="12" width="32" height="16" rx="3" fill="#8a5a2a"/><path d="M6 17H30M8 23H28" stroke="#6a4020" stroke-width="1.5"/><ellipse cx="35" cy="20" rx="4.5" ry="8" fill="#d8a860"/><ellipse cx="35" cy="20" rx="2" ry="4" fill="#a87a3a"/><ellipse cx="14" cy="12" rx="5" ry="2" fill="#4a9a3a"/></svg>`,
    rock: `<svg viewBox="0 0 40 30" aria-hidden="true"><path d="M3 29L8 12L18 5L31 8L38 29Z" fill="#8a8a96"/><path d="M18 5L31 8L26 16L14 14Z" fill="#aaaab6"/><path d="M8 12L14 14L10 29" fill="#6a6a76"/></svg>`,
    stump: `<svg viewBox="0 0 40 30" aria-hidden="true"><path d="M9 29V10h22v19z" fill="#7a4a24"/><ellipse cx="20" cy="10" rx="11" ry="4" fill="#d8a860"/><ellipse cx="20" cy="10" rx="6" ry="2" fill="#b0803a"/><path d="M14 14V27M24 15V28" stroke="#5a3418" stroke-width="1.5"/><path d="M5 29q4-6 6 0zM29 29q4-6 6 0z" fill="#7a4a24"/></svg>`
  };
  const SPOTNAME = { bush: 'bush', log: 'log', rock: 'rock', stump: 'tree stump' };
  const PADCOL = ['#e02828', '#f8d820', '#2a58e0'], PADNOTE = [60, 64, 67];
  function padSVG(kind, c) {
    if (kind === 'drum') return `<svg viewBox="0 0 30 30" aria-hidden="true"><rect x="4" y="9" width="22" height="16" fill="${c}" stroke="#000" stroke-width="1.2"/><path d="M4 11L10 23L16 11L22 23L26 13" fill="none" stroke="#fff" stroke-width="1.4"/><ellipse cx="15" cy="9" rx="11" ry="4" fill="#f4ecd0" stroke="#000" stroke-width="1.2"/><ellipse cx="15" cy="25" rx="11" ry="3" fill="${c}" stroke="#000" stroke-width="1.2"/></svg>`;
    if (kind === 'splash') return `<svg viewBox="0 0 30 30" aria-hidden="true"><ellipse cx="15" cy="21" rx="13" ry="6" fill="#7a4a24"/><ellipse cx="15" cy="20" rx="10" ry="4" fill="${c}"/><path d="M8 14q2-7 4-1M15 12q0-8 3-1M21 14q3-6 3 0" fill="none" stroke="${c}" stroke-width="2"/></svg>`;
    return `<svg viewBox="0 0 30 30" aria-hidden="true"><ellipse cx="15" cy="20" rx="13" ry="7" fill="#4a4a56"/><ellipse cx="15" cy="18" rx="12.5" ry="6.5" fill="${c}"/><ellipse cx="11" cy="15.5" rx="4" ry="1.5" fill="rgba(255,255,255,.5)"/></svg>`;
  }
  const HOUSE = `<svg viewBox="0 0 20 20" width="30" height="30" shape-rendering="crispEdges" aria-hidden="true"><path d="M10 2L1 10h3v8h12v-8h3z" fill="#e8c050" stroke="#000"/><rect x="8" y="12" width="4" height="6" fill="#8a4a1a" stroke="#000"/></svg>`;
  const BOOK = `<svg viewBox="0 0 24 20" aria-hidden="true"><path d="M1 3q5-3 11 0v16q-6-3-11 0z" fill="#e05050" stroke="#000"/><path d="M23 3q-5-3-11 0v16q6-3 11 0z" fill="#f08080" stroke="#000"/><circle cx="17.5" cy="9" r="3" fill="#ffe040" stroke="#000" stroke-width=".6"/><circle cx="6.5" cy="9" r="3" fill="#60c060" stroke="#000" stroke-width=".6"/></svg>`;
  const ARROW = `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 7h8V2l7 8-7 8v-5H3z" fill="#fff" stroke="#0a3a0a" stroke-width="1.2" stroke-linejoin="round"/></svg>`;
  const SPEAK = `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M2 7h4l5-4v14l-5-4H2z" fill="#333"/><path d="M13.5 6.5q2.5 3.5 0 7M16 4q4.5 6 0 12" fill="none" stroke="#333" stroke-width="1.6"/></svg>`;
  const MOUTH = `<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="9" fill="#ffd060" stroke="#000"/><circle cx="7" cy="7.5" r="1.2"/><circle cx="13" cy="7.5" r="1.2"/><ellipse cx="10" cy="13.2" rx="3.4" ry="2.8" fill="#8a1a1a"/><ellipse cx="10" cy="14.6" rx="2" ry="1.1" fill="#f07070"/></svg>`;

  function tree(x, y, s, c1, c2) {
    return `<rect x="${x - 3 * s}" y="${y - 32 * s}" width="${6 * s}" height="${32 * s}" fill="#6a4020"/><circle cx="${x}" cy="${y - 36 * s}" r="${16 * s}" fill="${c1}"/><circle cx="${x - 11 * s}" cy="${y - 29 * s}" r="${11 * s}" fill="${c2}"/><circle cx="${x + 11 * s}" cy="${y - 31 * s}" r="${11 * s}" fill="${c2}"/>`;
  }
  function palm(x, y, s) {
    let f = `<path d="M${x} ${y}Q${x + 8 * s} ${y - 40 * s} ${x - 2 * s} ${y - 72 * s}" stroke="#8a6a3a" stroke-width="${7 * s}" fill="none"/><g transform="translate(${x - 2 * s} ${y - 72 * s})">`;
    [-160, -120, -60, -20, 20, 160].forEach(a => { f += `<ellipse cx="${20 * s}" cy="0" rx="${22 * s}" ry="${6 * s}" transform="rotate(${a})" fill="${a % 40 ? '#2a8a2a' : '#1f7020'}"/>`; });
    return f + `<circle r="${4 * s}" fill="#6a4a1a"/></g>`;
  }
  function scene(kind) {
    const night = kind === 'lake' || kind === 'firehill', dry = kind === 'canyon';
    const sk = night ? ['#141450', '#24246c', '#34308a'] : dry ? ['#f0a060', '#f8c080', '#ffdca8'] : ['#58b0f0', '#7cc8f8', '#a8e0ff'];
    const gr = night ? '#265626' : dry ? '#e0b070' : '#5cb040', dark = night ? '#123a1c' : '#1a6a2a';
    let s = `<svg viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="320" height="200" fill="${sk[2]}"/><rect width="320" height="72" fill="${sk[1]}"/><rect width="320" height="38" fill="${sk[0]}"/>`;
    if (night) {
      for (let i = 0; i < 26; i++) s += `<rect x="${(i * 97) % 320}" y="${(i * 43) % 90}" width="2" height="2" fill="#fff8d0"/>`;
      if (kind === 'lake') s += '<circle cx="160" cy="44" r="18" fill="#fff4b0"/><circle cx="153" cy="40" r="3" fill="#e8d890"/><circle cx="166" cy="50" r="4" fill="#e8d890"/>';
      else s += '<circle cx="262" cy="36" r="13" fill="#fff4b0"/>';
    } else s += '<circle cx="272" cy="32" r="15" fill="#fff060"/><ellipse cx="80" cy="30" rx="26" ry="9" fill="#fff"/><ellipse cx="96" cy="24" rx="16" ry="9" fill="#fff"/><ellipse cx="200" cy="50" rx="22" ry="7" fill="#fff"/>';
    s += `<path d="M0 118Q50 88 100 112T200 104T320 110V140H0Z" fill="${night ? '#1e4a3a' : dry ? '#d89060' : '#3a8a4a'}"/><rect y="128" width="320" height="72" fill="${gr}"/>`;
    for (let i = 0; i < 14; i++) s += `<rect x="${(i * 71) % 316}" y="${140 + (i * 29) % 56}" width="4" height="2" fill="${night ? '#1a4a1a' : dry ? '#c89a5a' : '#4a9a34'}"/>`;
    switch (kind) {
      case 'path':
        s += '<path d="M130 200Q150 165 168 146T178 128H190Q182 150 196 170T214 200Z" fill="#d8b070"/>' + tree(40, 134, 1.3, '#1f7a2a', '#2f9a3a') + tree(282, 134, 1.2, '#1f7a2a', '#2f9a3a') + tree(110, 124, 0.7, '#2a8a34', '#3aa044');
        break;
      case 'bridge': {
        s += '<path d="M112 128L104 200H216L208 128Z" fill="#2a5a3a"/><rect x="104" y="186" width="112" height="14" fill="#3a8ae0"/><path d="M0 128H112L104 200H0ZM320 128H208L216 200H320Z" fill="#8a5a30"/><path d="M0 128H112M208 128H320" stroke="' + gr + '" stroke-width="8"/>';
        s += '<rect x="106" y="108" width="5" height="22" fill="#6a4020"/><rect x="209" y="108" width="5" height="22" fill="#6a4020"/><path d="M108 110Q160 142 212 110" stroke="#6a4a20" stroke-width="2" fill="none"/>';
        for (let i = 0; i < 10; i++) { if (i === 4 || i === 5) continue; const x = 113 + i * 9.6, y = 126 + 14 * Math.sin(Math.PI * (i + 0.5) / 10); s += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="8" height="5" fill="#c08840" stroke="#5a3a18"/>`; }
        s += tree(40, 132, 1, '#1f7a2a', '#2f9a3a') + tree(284, 132, 1.1, '#1f7a2a', '#2f9a3a');
        break;
      }
      case 'cave':
        s += '<path d="M40 130L100 48L150 30L210 44L270 130Z" fill="#7a7a8a"/><path d="M100 48L150 30L130 72Z" fill="#9a9aaa"/><path d="M120 130V104a36 34 0 0 1 72 0V130Z" fill="#1a1a24"/>';
        s += '<rect x="226" y="36" width="24" height="104" fill="#8ad0ff"/><rect x="230" y="36" width="3" height="104" fill="#fff"/><rect x="240" y="36" width="3" height="104" fill="#e0f4ff"/><ellipse cx="238" cy="142" rx="32" ry="7" fill="#3a8ae0"/><ellipse cx="238" cy="139" rx="16" ry="3" fill="#fff"/>';
        break;
      case 'tree':
        s += '<path d="M140 140L146 20H174L180 140Z" fill="#6a4020"/><path d="M152 40V120M166 30V130" stroke="#4a2a14" stroke-width="2"/><path d="M170 62L224 44" stroke="#6a4020" stroke-width="7"/>';
        s += '<circle cx="160" cy="4" r="52" fill="#1f7a2a"/><circle cx="96" cy="24" r="34" fill="#2f9a3a"/><circle cx="230" cy="18" r="36" fill="#2f9a3a"/><circle cx="130" cy="30" r="20" fill="#3aaa44"/>';
        s += '<ellipse cx="226" cy="44" rx="17" ry="7" fill="#9a6a30"/><path d="M212 42h28M214 46h24" stroke="#6a4a1a" stroke-width="1.5"/>';
        break;
      case 'grove':
        s += '<circle cx="70" cy="128" r="36" fill="#1f7a2a"/><circle cx="60" cy="116" r="18" fill="#2f9a3a"/><circle cx="170" cy="126" r="42" fill="#1f7a2a"/><circle cx="182" cy="110" r="20" fill="#2f9a3a"/><circle cx="268" cy="130" r="32" fill="#1f7a2a"/><circle cx="258" cy="118" r="15" fill="#2f9a3a"/>';
        break;
      case 'palms':
        s += palm(60, 150, 1.1) + palm(260, 148, 1.1) + palm(160, 132, 0.8);
        break;
      case 'creek':
        s += '<path d="M0 142Q80 132 160 144T320 140V176Q240 186 160 174T0 180Z" fill="#3a8ae0"/><path d="M30 156h20M120 164h26M220 158h22M270 170h16" stroke="#bfe4ff" stroke-width="2"/>';
        s += '<path d="M20 142v-16M24 142v-20M28 142v-14M296 140v-18M300 140v-22" stroke="#2a7a2a" stroke-width="2"/>' + tree(40, 128, 0.8, '#1f7a2a', '#2f9a3a');
        break;
      case 'hill':
        s += '<path d="M40 162Q160 26 280 162Z" fill="#4a9a3a"/><path d="M80 150Q160 60 240 150" fill="none" stroke="#6ab84a" stroke-width="4"/>';
        for (let i = 0; i < 9; i++) s += `<circle cx="${60 + i * 26}" cy="${150 + (i % 3) * 6}" r="2.5" fill="${['#ff70b0', '#ffe040', '#fff'][i % 3]}"/>`;
        break;
      case 'flowers':
        for (let i = 0; i < 46; i++) { const x = (i * 53) % 312 + 4, y = 134 + (i * 37) % 62; s += `<circle cx="${x}" cy="${y}" r="3.2" fill="${['#ff5a8a', '#ffe040', '#b070ff', '#ffffff', '#ff8a30'][i % 5]}"/><circle cx="${x}" cy="${y}" r="1" fill="#a0522d"/>`; }
        s += tree(30, 130, 0.8, '#1f7a2a', '#2f9a3a');
        break;
      case 'canyon':
        s += '<path d="M0 26L58 40L92 132L80 200H0Z" fill="#c8602a"/><path d="M0 60L70 70M0 100L84 106M0 140L88 146" stroke="#a84a1a" stroke-width="5"/><path d="M320 20L262 36L228 132L240 200H320Z" fill="#c8602a"/><path d="M320 56L250 68M320 96L236 104M320 138L232 146" stroke="#a84a1a" stroke-width="5"/>';
        break;
      case 'rock':
        s += '<path d="M86 142Q96 58 160 54Q230 58 238 142Z" fill="#8a8a96"/><path d="M110 80Q140 60 170 64" stroke="#aaaab6" stroke-width="6" fill="none"/><path d="M30 36Q160 70 290 36" stroke="#6a4a20" stroke-width="1.5" fill="none"/>';
        for (let i = 0; i < 12; i++) { const t = (i + 0.5) / 12, x = 30 + 260 * t, y = 36 + 34 * 4 * t * (1 - t) * 0.5 * 2 / 2; s += `<path d="M${x - 7} ${y}h14l-7 12z" fill="${['#e02828', '#f8d820', '#2a58e0', '#30b030'][i % 4]}"/>`; }
        break;
      case 'grass':
        s += tree(60, 128, 1, '#1f7a2a', '#2f9a3a') + tree(250, 126, 0.9, '#1f7a2a', '#2f9a3a');
        for (let i = 0; i < 44; i++) { const x = i * 7.4 - 4, h = 30 + (i * 17) % 34; s += `<path d="M${x} 200L${x + 5} ${200 - h}L${x + 10} 200Z" fill="${i % 2 ? '#3a9a2a' : '#4ab83a'}"/>`; }
        break;
      case 'pool':
        s += tree(40, 132, 1, '#1f7a2a', '#2f9a3a') + tree(288, 132, 1, '#1f7a2a', '#2f9a3a') + '<ellipse cx="170" cy="160" rx="110" ry="26" fill="#6a4020"/><ellipse cx="170" cy="158" rx="92" ry="18" fill="#9a6232"/><circle cx="130" cy="156" r="3" fill="#b07a44"/><circle cx="200" cy="162" r="4" fill="#b07a44"/>';
        break;
      case 'vines':
        s += tree(40, 136, 1.2, '#1f7a2a', '#2f9a3a') + tree(284, 136, 1.2, '#1f7a2a', '#2f9a3a');
        [60, 110, 150, 205, 255].forEach((x, i) => { const h = 70 + (i * 23) % 50; s += `<path d="M${x} 0Q${x + 12} ${h / 2} ${x} ${h}" stroke="#2a7a2a" stroke-width="3" fill="none"/>`; for (let k = 16; k < h; k += 18) s += `<ellipse cx="${x + (k % 36 ? 5 : -5)}" cy="${k}" rx="5" ry="2.5" fill="#3aaa3a"/>`; });
        break;
      case 'lake':
        s += '<ellipse cx="160" cy="160" rx="140" ry="28" fill="#2a4aa0"/><ellipse cx="160" cy="156" rx="14" ry="3" fill="#fff4b0" opacity=".6"/><path d="M60 170h24M220 166h30" stroke="#6a8ae0" stroke-width="2"/>';
        break;
      case 'firehill':
        s += '<path d="M20 170Q160 50 300 170Z" fill="#2e6a34"/>';
        for (let i = 0; i < 16; i++) s += `<circle cx="${(i * 67) % 300 + 10}" cy="${60 + (i * 31) % 90}" r="1.8" fill="#fff060"/>`;
        break;
    }
    if (!dry) {
      s += `<path d="M0 0H78Q64 18 42 22Q32 42 12 34Q6 50 0 52Z" fill="${dark}"/><g transform="translate(320 0) scale(-1 1)"><path d="M0 0H78Q64 18 42 22Q32 42 12 34Q6 50 0 52Z" fill="${dark}"/></g>`;
      s += `<path d="M0 200Q8 164 30 172Q18 182 44 200Z" fill="${dark}"/><path d="M320 200Q312 164 290 172Q302 182 276 200Z" fill="${dark}"/>`;
    }
    return s + '</svg>';
  }
  function mapSVG() {
    let s = '<svg viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="320" height="200" fill="#8a5a2a"/><rect x="5" y="5" width="310" height="190" fill="#ecdca4"/>';
    s += '<path d="M-10 60Q60 90 120 70T220 110T330 90" stroke="#6ab0e8" stroke-width="12" fill="none"/>';
    const blobs = [[30, 30], [90, 20], [170, 30], [270, 60], [40, 150], [120, 120], [210, 170], [290, 160], [180, 80], [250, 20]];
    blobs.forEach(([x, y], i) => { s += `<circle cx="${x}" cy="${y}" r="${10 + (i % 3) * 4}" fill="#8ac070"/><circle cx="${x + 6}" cy="${y - 4}" r="${6 + (i % 2) * 3}" fill="#6aa850"/>`; });
    s += '<path d="M150 150l12-20 12 20zM166 152l10-16 10 16z" fill="#b89a6a" stroke="#6a4a20"/><path d="M290 22v12M284 28h12" stroke="#a03020" stroke-width="2"/><text x="287" y="20" font-size="8" fill="#a03020" font-family="serif">N</text>';
    return s + '</svg>';
  }

  /* ---------- episode data ---------- */
  const NUMW = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
  const PRAISE = ['Great job!', 'Wonderful!', 'You are a super explorer!', 'Fantastic!', 'Way to go!', 'Hooray for you!', 'Awesome!'];
  const EPS = [
    {
      id: 'peep', title: 'Peep Goes Home', friend: 'peep', fname: 'Peep', carry: 'peep', steal: 'needle', stealName: 'Needle', col: '#9ad8ff',
      ask: ["Cheep, cheep! I'm Peep. I fell out of my nest!", 'Can you help me get home to Tall Tree?'],
      stops: [
        { lab: 'Wobbly Bridge', nm: 'the Wobbly Bridge', bg: 'bridge', ch: { t: 'shape', target: 'triangle', say: 'Oh no! The Wobbly Bridge has a hole.' }, w: { es: 'puente', en: 'bridge', snd: 'pwen-tay', pic: 'bridgepic' } },
        { lab: 'Waterfall Cave', nm: 'the Waterfall Cave', bg: 'cave', ch: { t: 'count', n: 4, thing: 'stone', name: 'stepping stones' }, w: { es: 'agua', en: 'water', snd: 'ah-gwah', pic: 'drop' } },
        { lab: 'Tall Tree', nm: 'Tall Tree', bg: 'tree', ch: { t: 'hidden', animal: 'mama', aname: "Peep's mama", say: "Peep's mama is hiding in the leaves. Can you find her? Look for the eyes!" }, w: { es: 'pájaro', en: 'bird', snd: 'pah-hah-roh', pic: 'mama' } }
      ],
      give: 'Peep, you are home!', thanks: 'Cheep, cheep! Thank you for bringing me home!', cheer: 'Hip, hip, hooray! Peep is home to stay!'
    },
    {
      id: 'tort', title: 'Berries for Grandma', friend: 'tort', fname: 'Grandma Tortoise', carry: 'pail', steal: 'pail', stealName: 'the berry pail', col: '#a0e080',
      ask: ["Hello, dear! I'm Grandma Tortoise. I'm too slow to go berry picking.", 'Could you bring me some berries, please?'],
      stops: [
        { lab: 'Berry Bushes', nm: 'the Berry Bushes', bg: 'grove', ch: { t: 'count', n: 5, thing: 'berry', name: 'berries' }, w: { es: 'rojo', en: 'red', snd: 'roh-hoh', pic: 'redblob' } },
        { lab: 'Stepping Stone Creek', nm: 'Stepping Stone Creek', bg: 'creek', ch: { t: 'pattern', len: 3, pad: 'stone', say: 'Hop knows the way across the creek! Watch the stones light up.' }, w: { es: 'rana', en: 'frog', snd: 'rah-nah', pic: 'hop' } },
        { lab: 'Tortoise Hill', nm: 'Tortoise Hill', bg: 'hill', ch: { t: 'color', target: 'blue', obj: 'door', say: 'Grandma Tortoise lives behind the blue door. Which door is blue?' }, w: { es: 'tortuga', en: 'tortoise', snd: 'tor-too-gah', pic: 'tort' } }
      ],
      give: 'Here are your berries, Grandma Tortoise!', thanks: 'Mmm, yummy berries! Thank you, my dears!', cheer: 'Hip, hip, hooray! Berries for Grandma today!'
    },
    {
      id: 'toucan', title: "Tula's Party", friend: 'toucan', fname: 'Tula Toucan', carry: 'bell', steal: 'bell', stealName: 'the party bell', col: '#ffb070',
      ask: ["Hi! I'm Tula Toucan. Today is my party!", 'Can you bring the golden party bell to Party Rock?'],
      stops: [
        { lab: 'Flower Field', nm: 'the Flower Field', bg: 'flowers', ch: { t: 'color', target: 'yellow', obj: 'flower', say: 'Let\'s pick a flower for Tula. Tula loves yellow! Which flower is yellow?' }, w: { es: 'flor', en: 'flower', snd: 'flor', pic: 'flowerpic' } },
        { lab: 'Echo Canyon', nm: 'Echo Canyon', bg: 'canyon', ch: { t: 'pattern', len: 3, pad: 'drum', say: 'Echo Canyon loves music! Listen to the drums.' }, w: { es: 'hola', en: 'hello', snd: 'oh-lah', pic: 'pip' } },
        { lab: 'Party Rock', nm: 'Party Rock', bg: 'rock', ch: { t: 'shape', target: 'star', say: 'The party sign is missing a piece!' }, w: { es: 'fiesta', en: 'party', snd: 'fee-ess-tah', pic: 'balloons' } }
      ],
      give: 'Here is your golden bell, Tula!', thanks: 'Ring-a-ling! Now my party can start! Thank you!', cheer: 'Ring the bell and shout hooray! Tula\'s party starts today!'
    },
    {
      id: 'bo', title: "Bo's Mud Bath", friend: 'bo', fname: 'Bo', carry: 'bucket', steal: 'bucket', stealName: 'the shiny bucket', col: '#c0c8e0',
      ask: ["Hi! I'm Bo, a little elephant. Elephants love mud baths!", 'Can you bring my bucket to the Mud Pool?'],
      stops: [
        { lab: 'Banana Grove', nm: 'the Banana Grove', bg: 'palms', ch: { t: 'count', n: 6, thing: 'banana', name: 'bananas' }, w: { es: 'amarillo', en: 'yellow', snd: 'ah-mah-ree-yoh', pic: 'yellowblob' } },
        { lab: 'Tall Grass', nm: 'the Tall Grass', bg: 'grass', ch: { t: 'hidden', animal: 'lizard', aname: 'a little lizard', say: 'Someone is hiding in the tall grass. Look for the eyes!' }, w: { es: 'grande', en: 'big', snd: 'grahn-day', pic: 'bo' } },
        { lab: 'Mud Pool', nm: 'the Mud Pool', bg: 'pool', ch: { t: 'pattern', len: 4, pad: 'splash', say: 'Bo wants to splash! Watch the splashes.' }, w: { es: 'gracias', en: 'thank you', snd: 'grah-see-ahs', pic: 'heartpic' } }
      ],
      give: 'Here is your bucket, Bo!', thanks: 'Splish, splash! Thank you for my bucket!', cheer: 'Splish, splash, hooray! It is Bo\'s mud bath day!'
    },
    {
      id: 'luma', title: "Luma's Lantern", friend: 'luma', fname: 'Luma', carry: 'lantern', steal: 'lantern', stealName: 'the lantern', col: '#fff080',
      ask: ["Hello! I'm Luma the firefly. My light is very little.", 'Can you bring my lantern to Firefly Hill, so everyone can see me glow?'],
      stops: [
        { lab: 'Vine Swing', nm: 'the Vine Swing', bg: 'vines', ch: { t: 'hidden', animal: 'sloth', aname: 'a sleepy sloth', say: 'A sleepy sloth is hiding in the vines. Can you find the sloth? Look for the eyes!' }, w: { es: 'verde', en: 'green', snd: 'behr-day', pic: 'leaf' } },
        { lab: 'Sleepy Lake', nm: 'Sleepy Lake', bg: 'lake', ch: { t: 'count', n: 7, thing: 'pad', name: 'lily pads' }, w: { es: 'luna', en: 'moon', snd: 'loo-nah', pic: 'moon' } },
        { lab: 'Firefly Hill', nm: 'Firefly Hill', bg: 'firehill', ch: { t: 'shape', target: 'heart', say: 'The lantern lid has a hole in it.' }, w: { es: 'estrella', en: 'star', snd: 'ess-tray-yah', pic: 'starpic' } }
      ],
      give: 'Here is your lantern, Luma!', thanks: 'Look at me glow! Thank you, explorers!', cheer: 'Glow, glow, hooray! Luma lights the way!'
    }
  ];
  const NODES = [[12, 80], [36, 30], [60, 72], [86, 30]];
  const LOWPOS = [[34, 72], [50, 69], [66, 72], [82, 69], [42, 86], [58, 85], [74, 87]];
  const COUNTPOS = [[36, 56], [54, 50], [72, 56], [89, 50], [42, 76], [62, 72], [82, 77]];

  (window.RETRO_APPS = window.RETRO_APPS || []).push({
    id: 'piptrek',
    label: "Pip's Jungle Trek",
    kind: 'store', cat: 'game', year: 1995, price: 24.95,
    publisher: 'Treetop Kids Interactive',
    genre: 'Kids adventure (ages 3-7)',
    tagline: 'Grab your sun hat. The jungle needs a helper!',
    blurb: 'Join Pip, a curious young explorer in a great big sun hat, with Needle the talking pocket compass and Hop the tree frog. Help jungle friends in five adventures: count stepping stones, fix wobbly bridges, spot hidden animals, copy drum patterns and learn a new Spanish word at every stop. Watch out for Glimmer the giggly Magpie, who hides anything shiny! Everything is spoken aloud, so no reading is needed. Collect a sticker for every friend you help.',
    sizeKB: 30000,
    box: { bg: '#1f7a3a', fg: '#ffe45c', accent: '#f07a2a' },
    icon: `<svg viewBox="0 0 32 32" shape-rendering="crispEdges" aria-hidden="true"><rect x="1" y="1" width="30" height="30" fill="#58b0f0" stroke="#000"/><rect x="2" y="22" width="28" height="8" fill="#5cb040"/><g transform="translate(4 1)">${rast(24, 32, ART.pip[2])}</g></svg>`,
    window: { w: 640, h: 500 },
    css: `
      .pjt{height:100%;display:flex;flex-direction:column;background:#205020;user-select:none;-webkit-user-select:none;touch-action:manipulation}
      .pjt svg{display:block}
      .pjt-stage{flex:1;position:relative;overflow:hidden;min-height:180px;container-type:size;background:#6ec0f0}
      .pjt-bg,.pjt-bg>svg{position:absolute;inset:0;width:100%;height:100%}
      .pjt-lay{position:absolute;inset:0}
      .pjt-talk{display:flex;align-items:center;gap:6px;padding:5px;background:var(--gray,#c0c0c0);border-top:2px solid #fff;flex:none}
      .pjt-ndl{width:54px;height:58px;flex:none;background:none;border:0;padding:0;cursor:pointer;transition:opacity .3s}
      .pjt-ndl svg{width:100%;height:100%}
      .pjt-lost .pjt-ndl{opacity:.15}
      .pjt-say{flex:1;font:700 16px/1.25 "Comic Sans MS","Chalkboard SE",var(--ui);background:#fffbe8;padding:5px 9px;min-height:48px;display:flex;align-items:center;color:#000}
      .pjt-hb{min-width:0!important;width:54px;height:54px;padding:0!important;display:grid;place-items:center;flex:none}
      .pjt-o{position:absolute;translate:-50% -50%}
      .pjt-t{background:none;border:0;padding:0;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
      .pjt-t svg{width:100%;height:100%;filter:drop-shadow(2px 3px 0 rgba(0,0,0,.35))}
      .pjt-t:focus-visible{outline:3px dashed #fff;outline-offset:2px}
      .pjt-hero{position:absolute;left:3%;bottom:2%;width:21cqmin;height:28cqmin;transition:left 1s,bottom 1s}
      .pjt-hero>svg{width:100%;height:100%}
      .pjt-hop{position:absolute;width:40%;left:5%;top:-3%}
      .pjt-hop svg{width:100%;height:auto}
      .pjt-carry{position:absolute;width:44%;right:-30%;bottom:20%;transition:opacity .3s}
      .pjt-carry svg{width:100%;height:auto}
      .pjt-friend{position:absolute;right:4%;bottom:3%;width:25cqmin;animation:pjt-pop .5s}
      .pjt-friend svg{width:100%;height:auto}
      .pjt-sz{width:clamp(50px,17cqmin,118px);height:clamp(50px,17cqmin,118px)}
      .pjt-spot{width:clamp(64px,23cqmin,150px);height:clamp(52px,18cqmin,116px)}
      .pjt-cnt{width:clamp(46px,14cqmin,96px);height:clamp(46px,14cqmin,96px);position:absolute}
      .pjt-cnt em{position:absolute;right:-4px;top:-6px;background:#fff;border:2px solid #000;border-radius:50%;width:26px;height:26px;display:grid;place-items:center;font:700 16px/1 var(--ui);color:#000;font-style:normal;animation:pjt-pop .3s}
      .pjt-cnt.on svg{filter:drop-shadow(0 0 5px #fff) drop-shadow(0 0 3px #ffe040)}
      .pjt-hi{animation:pjt-jump .5s}
      .pjt-num{background:#fff;border:3px solid #000;border-radius:12px;font:700 clamp(26px,9cqmin,44px)/1 var(--ui);color:#000;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;box-shadow:3px 3px 0 rgba(0,0,0,.4)}
      .pjt-num i{display:flex;flex-wrap:wrap;justify-content:center;gap:2px;max-width:80%}
      .pjt-num i b{width:6px;height:6px;border-radius:50%;background:#e02828}
      .pjt-glow{animation:pjt-pulse .9s infinite}
      .pjt-no{animation:pjt-shake .45s}
      .pjt-dim{opacity:.35}
      .pjt-board{width:clamp(90px,34cqmin,200px)}
      .pjt-board svg{width:100%;height:auto;filter:drop-shadow(2px 3px 0 rgba(0,0,0,.35))}
      .pjt-piece{transition:left .7s,top .7s,scale .7s}
      .pjt-eyes{position:absolute;left:50%;top:22%;translate:-50% 0;display:flex;gap:10%;width:46%;pointer-events:none}
      .pjt-eyes b{flex:1;aspect-ratio:1;background:#fff;border-radius:50%;border:2px solid #000;position:relative;animation:pjt-blink 3s infinite}
      .pjt-eyes b::after{content:"";position:absolute;width:45%;height:45%;background:#000;border-radius:50%;left:30%;top:30%}
      .pjt-found{position:absolute;left:50%;bottom:55%;width:70%;translate:-50% 0;animation:pjt-rise .6s both;pointer-events:none}
      .pjt-found svg{width:100%;height:auto}
      .pjt-spark{position:absolute;right:14%;top:8%;width:24%;aspect-ratio:1;pointer-events:none;animation:pjt-twinkle 1.6s infinite}
      .pjt-spark.big{width:40%;animation-duration:.9s}
      .pjt-glim{position:absolute;width:clamp(60px,22cqmin,130px);translate:-50% -50%;transition:left 1s ease-in-out,top 1s ease-in-out;z-index:5;pointer-events:none}
      .pjt-glim svg{width:100%;height:auto;animation:pjt-flap .35s infinite alternate}
      .pjt-glim.away{transition-duration:1.6s}
      .pjt-flip svg{transform:scaleX(-1)}
      .pjt-item{position:absolute;width:clamp(36px,11cqmin,70px);translate:-50% -50%;transition:left .9s,top .9s,opacity .4s;z-index:4;pointer-events:none}
      .pjt-item svg{width:100%;height:auto}
      .pjt-go{position:absolute;right:3%;bottom:4%;width:clamp(58px,15cqmin,84px);height:clamp(58px,15cqmin,84px);border-radius:50%;background:#2ea82e;border:3px solid #0a3a0a;box-shadow:inset -3px -3px 0 #1a7a1a,inset 3px 3px 0 #8ae08a,3px 3px 0 rgba(0,0,0,.4);cursor:pointer;padding:0;display:grid;place-items:center;animation:pjt-pulse 1.2s infinite;z-index:6}
      .pjt-go svg{width:70%;height:70%}
      .pjt-card{position:absolute;left:50%;top:46%;translate:-50% -50%;width:min(92%,420px);background:#fffbe8;border:4px solid #f08020;border-radius:14px;padding:10px;display:flex;flex-direction:column;align-items:center;gap:4px;box-shadow:5px 5px 0 rgba(0,0,0,.35);animation:pjt-pop .4s;color:#000;z-index:7}
      .pjt-card .pjt-pic{width:clamp(56px,22cqmin,110px)}
      .pjt-card .pjt-pic svg{width:100%;height:auto}
      .pjt-word{font:700 clamp(30px,11cqmin,52px)/1 "Comic Sans MS","Chalkboard SE",var(--ui);color:#c83a10}
      .pjt-pron{font:700 15px/1.2 var(--ui);color:#555}
      .pjt-mean{font:700 18px/1.2 var(--ui)}
      .pjt-crow{display:flex;gap:10px;margin-top:4px}
      .pjt-cb{display:flex;align-items:center;gap:6px;min-height:56px;font:700 16px/1 var(--ui)!important;padding:4px 12px!important}
      .pjt-cb svg{width:34px;height:34px}
      .pjt-home{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:clamp(6px,3cqh,18px);padding:8px}
      .pjt-logo{display:flex;align-items:center;gap:8px;background:rgba(255,251,232,.92);border:3px solid #6a3a18;border-radius:14px;padding:4px 14px 4px 6px;box-shadow:4px 4px 0 rgba(0,0,0,.3)}
      .pjt-logo svg{width:clamp(40px,12cqmin,70px);height:auto}
      .pjt-logo b{display:block;font:700 clamp(22px,7cqmin,40px)/1 "Comic Sans MS","Chalkboard SE",var(--ui);color:#e8742a;text-shadow:2px 2px 0 #6a3a18}
      .pjt-logo span{display:block;font:700 clamp(14px,4cqmin,22px)/1.1 "Comic Sans MS","Chalkboard SE",var(--ui);color:#1f7a3a}
      .pjt-eps{display:flex;flex-wrap:wrap;justify-content:center;gap:10px}
      .pjt-ep{position:relative;width:clamp(58px,19cqmin,104px);height:clamp(58px,19cqmin,104px);border-radius:50%;background:var(--c);border:4px solid #fff;box-shadow:0 0 0 3px #6a3a18,3px 5px 0 3px rgba(0,0,0,.3);cursor:pointer;padding:0;display:grid;place-items:center}
      .pjt-ep>svg{width:70%;height:70%}
      .pjt-ep i{position:absolute;right:-6px;top:-6px;width:40%}
      .pjt-hrow{display:flex;gap:12px}
      .pjt-big{min-width:0!important;height:60px;display:flex;align-items:center;gap:8px;font:700 16px/1 var(--ui)!important;padding:4px 14px!important}
      .pjt-big svg{width:40px;height:34px}
      .pjt-route{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
      .pjt-nw{position:absolute;translate:-50% -50%;display:flex;flex-direction:column;align-items:center}
      .pjt-node{width:clamp(56px,19cqmin,104px);height:clamp(56px,19cqmin,104px);border-radius:50%;overflow:hidden;border:4px solid #fff;box-shadow:0 0 0 3px #6a3a18,2px 4px 0 3px rgba(0,0,0,.3);padding:0;cursor:pointer;background:#fff;position:relative}
      .pjt-node>svg{position:absolute;inset:0;width:100%;height:100%}
      .pjt-node.home{background:var(--c)}
      .pjt-node.home>svg{inset:15%;width:70%;height:70%}
      .pjt-node.done::after{content:"";position:absolute;inset:0;background:rgba(255,255,255,.35)}
      .pjt-nl{margin-top:5px;background:#fffbe8;border:2px solid #6a3a18;padding:1px 6px;font:700 12px/1.2 var(--ui);color:#000;white-space:nowrap;border-radius:6px}
      .pjt-mark{position:absolute;width:clamp(34px,11cqmin,60px);translate:-50% -95%;transition:left 1.4s ease-in-out,top 1.4s ease-in-out;z-index:4;pointer-events:none}
      .pjt-mark svg{width:100%;height:auto;animation:pjt-bob .5s infinite alternate}
      .pjt-dance{animation:pjt-dance .45s infinite alternate}
      .pjt-dance2{animation:pjt-dance .45s .22s infinite alternate-reverse}
      .pjt-conf{position:absolute;top:-5%;width:10px;height:14px;animation:pjt-fall 2.8s linear forwards;z-index:8;pointer-events:none}
      .pjt-star{position:absolute;width:30px;translate:-50% -50%;animation:pjt-burst .8s forwards;pointer-events:none;z-index:8}
      .pjt-sticker{width:clamp(90px,34cqmin,170px);aspect-ratio:1;border-radius:50%;background:var(--c);border:6px solid #fff;box-shadow:0 0 0 3px #6a3a18,4px 6px 0 3px rgba(0,0,0,.3);display:grid;place-items:center;rotate:-6deg;animation:pjt-pop .6s}
      .pjt-sticker svg{width:70%;height:70%}
      .pjt-book{position:absolute;inset:4%;background:#fffbe8;border:5px solid #c04040;border-radius:12px;display:flex;flex-direction:column;align-items:center;padding:8px;gap:8px;overflow:auto;box-shadow:5px 5px 0 rgba(0,0,0,.35);color:#000}
      .pjt-book h3{margin:0;font:700 22px/1 "Comic Sans MS","Chalkboard SE",var(--ui);color:#c04040}
      .pjt-slots{display:flex;flex-wrap:wrap;justify-content:center;gap:12px;flex:1;align-content:center}
      .pjt-slot{width:clamp(70px,22cqmin,112px);height:clamp(70px,22cqmin,112px);border-radius:50%;border:3px dashed #b0a080;display:grid;place-items:center;padding:0;background:none;cursor:pointer}
      .pjt-slot svg{width:70%;height:70%}
      .pjt-slot.got{border:5px solid #fff;background:var(--c);box-shadow:0 0 0 3px #6a3a18;rotate:var(--r)}
      .pjt-slot:not(.got) svg{filter:brightness(0) opacity(.15)}
      @keyframes pjt-pop{0%{transform:scale(0)}70%{transform:scale(1.15)}100%{transform:scale(1)}}
      @keyframes pjt-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.1)}}
      @keyframes pjt-shake{0%,100%{transform:rotate(0)}25%{transform:rotate(-10deg)}75%{transform:rotate(10deg)}}
      @keyframes pjt-jump{0%,100%{transform:translateY(0)}50%{transform:translateY(-22%)}}
      @keyframes pjt-bob{from{transform:translateY(0)}to{transform:translateY(-8%)}}
      @keyframes pjt-blink{0%,92%,100%{transform:scaleY(1)}96%{transform:scaleY(.1)}}
      @keyframes pjt-rise{from{transform:translateY(40%) scale(.3);opacity:0}to{transform:none;opacity:1}}
      @keyframes pjt-twinkle{0%,100%{opacity:0;transform:scale(.4) rotate(0)}50%{opacity:1;transform:scale(1) rotate(45deg)}}
      @keyframes pjt-flap{from{transform:translateY(0)}to{transform:translateY(-6%)}}
      @keyframes pjt-dance{from{transform:translateY(0) rotate(-6deg)}to{transform:translateY(-14%) rotate(6deg)}}
      @keyframes pjt-fall{to{transform:translateY(115cqh) rotate(720deg)}}
      @keyframes pjt-burst{0%{transform:scale(.2);opacity:1}100%{transform:scale(1.4) translateY(-30px);opacity:0}}
    `,
    open(W, api) {
      const era = api.era.id;
      W.body.innerHTML = `<div class="pjt pjt-e${era}"><div class="pjt-stage"><div class="pjt-bg"></div><div class="pjt-lay"></div></div><div class="pjt-talk"><button class="pjt-ndl" title="Hear it again" aria-label="Hear it again">${A('needle')}</button><div class="pjt-say sunken" aria-live="polite"></div><button class="btn pjt-hb" title="Home" aria-label="Home">${HOUSE}</button></div></div>`;
      const root = W.body.firstChild, $ = s => root.querySelector(s);
      const bg = $('.pjt-bg'), lay = $('.pjt-lay'), sayEl = $('.pjt-say');
      const F = mkFlow(api, sayEl);
      F.scope = lay;
      let S;
      function loadState() {
        let d = null; try { d = api.load('state', null); } catch (e) { /* ignore */ }
        S = { done: (d && d.done) || {}, cur: d && d.cur && EPS[d.cur.ep] ? d.cur : null, voice: !(d && d.voice === false) };
        F.voice = S.voice;
      }
      const persist = () => { try { api.save('state', S); } catch (e) { /* ignore */ } };
      loadState();

      const mk = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
      const place = (el, x, y) => { el.style.left = x + '%'; el.style.top = y + '%'; return el; };
      const add = (tag, cls, html, x, y) => { const e = mk(tag, cls, html); if (x != null) { e.classList.add('pjt-o'); place(e, x, y); } lay.appendChild(e); return e; };
      const btn = (cls, html, x, y, label) => { const b = add('button', 'pjt-t ' + cls, html, x, y); if (label) b.setAttribute('aria-label', label); return b; };
      const setBg = k => { bg.innerHTML = k === 'map' ? mapSVG() : scene(k); };
      const clear = () => { lay.innerHTML = ''; api.stopMusic(); };
      const blip = f => api.tone(f, 0.12, { type: 'square', vol: 0.05 });
      const good = () => jingle(api, [72, 76, 79, 84], 0.09);
      const bad = () => api.tone(220, 0.18, { type: 'triangle', vol: 0.06, to: 180 });
      function hero(carry) {
        const h = add('div', 'pjt-hero', A('pip') + `<div class="pjt-hop">${A('hop')}</div>` + (carry ? `<div class="pjt-carry">${A(carry)}</div>` : ''));
        return h;
      }
      function nextBtn(g) {
        const b = add('button', 'pjt-go', ARROW); b.setAttribute('aria-label', 'Next'); b.title = 'Next';
        return F.guard(g, new Promise(r => { b.onclick = () => { api.sfx.click(); b.remove(); r(); }; }));
      }
      function stars(el, n = 6) {
        const r = el.getBoundingClientRect(), L = lay.getBoundingClientRect();
        const cx = (r.left + r.width / 2 - L.left) / L.width * 100, cy = (r.top + r.height / 2 - L.top) / L.height * 100;
        for (let i = 0; i < n; i++) {
          const s = add('div', 'pjt-star', shapeSVG('star', pickA(['#ffe040', '#fff', '#ff90c0', '#80e0ff']), '#a07000'));
          place(s, cx + Math.cos(i / n * 6.28) * 9, cy + Math.sin(i / n * 6.28) * 12);
          F.sleep(900).then(() => s.remove());
        }
      }
      async function praise(g, text, el) {
        good(); if (el) stars(el);
        const hop = lay.querySelector('.pjt-hop'); if (hop) { hop.classList.remove('pjt-hi'); void hop.offsetWidth; hop.classList.add('pjt-hi'); }
        await F.talkWait(g, text + ' ' + pickA(PRAISE));
      }
      const wrong = el => { bad(); el.classList.remove('pjt-no'); void el.offsetWidth; el.classList.add('pjt-no'); };

      /* ----- screens ----- */
      function home() {
        F.run(async g => {
          clear(); setBg('path'); root.classList.remove('pjt-lost');
          const box = add('div', 'pjt-home');
          box.innerHTML = `<div class="pjt-logo">${A('pip')}<div><b>Pip's</b><span>Jungle Trek</span></div>${A('hop')}</div><div class="pjt-eps"></div><div class="pjt-hrow"></div>`;
          const eps = EPS.map((E, i) => {
            const b = mk('button', 'pjt-ep', A(E.friend) + (S.done[E.id] ? `<i>${shapeSVG('star', '#ffe040', '#a07000')}</i>` : ''));
            b.style.setProperty('--c', E.col); b.setAttribute('aria-label', E.title); b.title = E.title;
            box.querySelector('.pjt-eps').appendChild(b); return b;
          });
          const row = box.querySelector('.pjt-hrow');
          const book = mk('button', 'btn pjt-big', BOOK + 'Stickers'); row.appendChild(book);
          let cont = null;
          if (S.cur) { cont = mk('button', 'btn pjt-big pjt-cont', A(EPS[S.cur.ep].friend) + 'Keep going ' + ARROW.replace('#fff', '#2ea82e')); row.appendChild(cont); }
          eps.forEach((b, i) => { b.dataset.n = i + 1; b.onclick = () => { api.sfx.click(); startEp(i, -1); }; });
          book.onclick = () => { api.sfx.click(); stickerBook(); };
          if (cont) cont.onclick = () => { api.sfx.click(); startEp(S.cur.ep, S.cur.step); };
          const n = Object.keys(S.done).length;
          await F.talkWait(g, S.cur ? "Welcome back! Tap Keep going to finish your adventure, or tap a friend to start a new one."
            : n ? `Welcome back, explorer! You have helped ${NUMW[n]} ${n === 1 ? 'friend' : 'friends'}. Tap a friend to go on an adventure!`
              : "Hi! I'm Needle, Pip's talking compass. Pip and Hop the frog are ready to explore! Tap a friend to start an adventure.");
        });
      }
      function startEp(i, step) { F.run(g => episode(g, i, step)); }

      async function episode(g, ei, step) {
        const E = EPS[ei], w = p => F.guard(g, p);
        S.cur = { ep: ei, step }; persist();
        if (step < 0) {
          clear(); setBg('path'); hero();
          const fr = add('div', 'pjt-friend', A(E.friend));
          fr.classList.add('pjt-dance');
          await F.talkWait(g, E.ask[0], null, { pitch: 1.5 });
          await F.talkWait(g, E.ask[1], null, { pitch: 1.5 });
          fr.classList.remove('pjt-dance');
          F.talk("Let's help! Tap the green arrow to go.");
          await nextBtn(g);
          step = 0;
        }
        for (; step <= 4; step++) {
          S.cur.step = step; persist();
          if (step === 2) await magpie(g, E);
          else if (step === 4) await finale(g, E);
          else { const si = step === 3 ? 2 : step; await mapTo(g, E, si); await stop(g, E, si); }
        }
        await w(Promise.resolve());
      }

      async function mapTo(g, E, si) {
        clear(); setBg('map');
        const pts = NODES.map(p => p.join(',')).join(' ');
        lay.innerHTML = `<svg class="pjt-route" viewBox="0 0 100 100" preserveAspectRatio="none"><polyline points="${pts}" fill="none" stroke="#fff" stroke-width="9" vector-effect="non-scaling-stroke" stroke-linejoin="round"/><polyline points="${pts}" fill="none" stroke="#a0522d" stroke-width="5" stroke-dasharray="10 7" vector-effect="non-scaling-stroke"/></svg>`;
        const nodes = NODES.map((p, i) => {
          const wr = add('div', 'pjt-nw'); place(wr, p[0], p[1]);
          const b = mk('button', 'pjt-node' + (i === 0 ? ' home' : '') + (i && i - 1 < si ? ' done' : ''), i === 0 ? A(E.friend) : scene(E.stops[i - 1].bg));
          if (i === 0) b.style.setProperty('--c', E.col);
          b.setAttribute('aria-label', i === 0 ? E.fname : E.stops[i - 1].lab);
          wr.appendChild(b); if (i) wr.appendChild(mk('div', 'pjt-nl', esc(E.stops[i - 1].lab)));
          return b;
        });
        const mark = add('div', 'pjt-mark', A('pip')); place(mark, NODES[si][0], NODES[si][1]);
        if (si === 0) {
          await F.talkWait(g, `I'm Needle, and I know the way to ${E.stops[2].nm}!`);
          for (let i = 0; i < 3; i++) {
            nodes[i + 1].classList.add('pjt-glow');
            await F.talkWait(g, `${['First', 'Next', 'Last'][i]}, ${E.stops[i].nm}.`);
            nodes[i + 1].classList.remove('pjt-glow');
          }
          await F.talkWait(g, `Say it with me! ${E.stops.map(s => s.lab).join(', ')}!`);
        }
        const tgt = nodes[si + 1], nm = E.stops[si].nm;
        tgt.classList.add('pjt-glow');
        F.talk(si ? `Where do we go next? ${cap(nm)}! Tap ${nm} to go.` : `Tap ${nm} to go!`);
        const go = add('button', 'pjt-go', ARROW); go.setAttribute('aria-label', 'Go'); go.title = 'Go';
        for (;;) {
          const k = await F.tap(g, [...nodes, go]);
          if (k === si + 1 || k === nodes.length) break;
          wrong(nodes[k]);
          F.talk(k === 0 ? `That's where ${E.fname} is waiting. We need to go to ${nm}. Look for the one that wiggles!` : `That's ${E.stops[k - 1].nm}. We need to go to ${nm}. Look for the one that wiggles!`);
        }
        tgt.classList.remove('pjt-glow'); go.remove(); api.sfx.click();
        for (let i = 0; i < 4; i++) api.tone(330 + i * 60, 0.06, { type: 'square', vol: 0.04, at: i * 0.3 });
        place(mark, NODES[si + 1][0], NODES[si + 1][1]);
        await F.guard(g, F.sleep(1500));
      }

      async function stop(g, E, si) {
        const st = E.stops[si], c = st.ch;
        clear(); setBg(st.bg); hero(E.carry);
        await F.talkWait(g, `We made it to ${st.nm}!`);
        await CH[c.t](g, c);
        await F.guard(g, F.sleep(400));
        await wordCard(g, st.w);
        clear(); setBg(st.bg); hero(E.carry);
        F.talk(si < 2 ? 'Tap the green arrow to keep going!' : `Let's find ${E.fname}!`);
        await nextBtn(g);
      }

      const CH = {
        async count(g, c) {
          const n = c.n, items = [];
          for (let i = 0; i < n; i++) { const P = c.thing === 'pad' ? LOWPOS : COUNTPOS, b = btn('pjt-cnt', A(c.thing), P[i][0], P[i][1], c.name); items.push(b); }
          F.talk(`Let's count the ${c.name}! Tap each one.`);
          let cnt = 0;
          await F.guard(g, new Promise(res => items.forEach((b, i) => {
            b.dataset.n = i + 1;
            b.onclick = () => {
              if (b.classList.contains('on')) { if (F.voice) api.say(NUMW[+b.dataset.c]); return; }
              cnt++; b.classList.add('on'); b.dataset.c = cnt; b.insertAdjacentHTML('beforeend', `<em>${cnt}</em>`);
              blip(392 + cnt * 60); F.talk(cap(NUMW[cnt]) + '!');
              if (cnt === n) res();
            };
          })));
          items.forEach(b => { b.onclick = null; delete b.dataset.n; });
          await F.guard(g, F.sleep(900));
          const opts = shuffle([n, n + 1, n > 2 ? n - 1 : n + 2]);
          const ob = opts.map((v, i) => btn('pjt-num pjt-sz', `${v}<i>${'<b></b>'.repeat(v)}</i>`, 50 + i * 18, 22, String(v)));
          F.talk(`How many ${c.name} did you count?`);
          let k;
          for (;;) {
            k = await F.tap(g, ob);
            if (opts[k] === n) break;
            wrong(ob[k]); ob[k].classList.add('pjt-dim');
            await F.talkWait(g, `Hmm, that's ${NUMW[opts[k]]}. Let's count them together!`);
            for (let i = 0; i < n; i++) { items[i].classList.remove('pjt-hi'); void items[i].offsetWidth; items[i].classList.add('pjt-hi'); blip(392 + i * 60); F.talk(cap(NUMW[i + 1]) + '!'); await F.guard(g, F.sleep(800)); }
            ob[opts.indexOf(n)].classList.add('pjt-glow');
            F.talk(`${cap(NUMW[n])} ${c.name}! Tap the ${n}.`);
          }
          ob.forEach(b => b !== ob[k] && b.classList.add('pjt-dim')); ob[k].classList.remove('pjt-glow');
          await praise(g, `Yes! ${cap(NUMW[n])} ${c.name}!`, ob[k]);
        },
        async shape(g, c) {
          const others = shuffle(Object.keys(SHAPES).filter(k => k !== c.target)).slice(0, 2);
          const opts = shuffle([c.target, ...others]), cols = shuffle(['#e02828', '#2a58e0', '#f8d820', '#30b030', '#9040c0']);
          const board = add('div', 'pjt-board', `<svg viewBox="0 0 60 40" aria-hidden="true"><rect x="1" y="1" width="58" height="38" rx="3" fill="#c08840" stroke="#5a3a18" stroke-width="2"/><path d="M3 13H57M3 26H57" stroke="#8a5a2a" stroke-width="1.5"/><g transform="translate(19 9) scale(1.1)">${SHAPES[c.target]('#1a1208')}</g></svg>`, 56, 22);
          const ob = opts.map((k, i) => btn('pjt-sz pjt-piece', shapeSVG(k, cols[i]), 40 + i * 22, 66, k));
          F.talk(`${c.say} Which piece fits? Find the ${c.target}!`);
          let k, miss = 0;
          for (;;) {
            k = await F.tap(g, ob);
            if (opts[k] === c.target) break;
            wrong(ob[k]); miss++;
            F.talk(`That's a ${opts[k]}. We need the ${c.target}. Try again!`);
            if (miss >= 2) ob[opts.indexOf(c.target)].classList.add('pjt-glow');
          }
          const b = ob[k]; b.classList.remove('pjt-glow'); b.style.zIndex = 3; ob.forEach(o => o !== b && o.classList.add('pjt-dim'));
          place(b, 56, 22); b.style.scale = '0.62';
          good();
          await F.guard(g, F.sleep(800));
          stars(board);
          await praise(g, `It fits! The ${c.target} fixed it!`);
        },
        async color(g, c) {
          const others = shuffle(Object.keys(COLORS).filter(k => k !== c.target)).slice(0, 2);
          const opts = shuffle([c.target, ...others]);
          const ob = opts.map((k, i) => btn('pjt-sz', c.obj === 'door' ? doorSVG(COLORS[k]) : flowerSVG(COLORS[k]), 40 + i * 22, 60, k));
          F.talk(c.say);
          let k;
          for (;;) {
            k = await F.tap(g, ob);
            if (opts[k] === c.target) break;
            wrong(ob[k]); F.talk(`That one is ${opts[k]}. Can you find ${c.target}?`);
          }
          await praise(g, `Yes! That ${c.obj} is ${c.target}!`, ob[k]);
        },
        async hidden(g, c) {
          const pos = [[38, 52], [66, 46], [52, 74], [84, 70]], ans = Math.floor(Math.random() * 4);
          const ob = pos.map((p, i) => { const b = btn('pjt-sz pjt-spot', SPOTS.bush, p[0], p[1], 'leaves'); if (i === ans) b.insertAdjacentHTML('beforeend', '<div class="pjt-eyes"><b></b><b></b></div>'); return b; });
          F.talk(c.say);
          let k;
          for (;;) {
            k = await F.tap(g, ob);
            if (k === ans) break;
            wrong(ob[k]); api.noise(0.25, { ft: 'highpass', f: 2500, vol: 0.05, decay: 1 });
            F.talk('Just leaves! Look for the eyes.');
          }
          const e = ob[k].querySelector('.pjt-eyes'); if (e) e.remove();
          ob[k].insertAdjacentHTML('beforeend', `<div class="pjt-found">${A(c.animal)}</div>`);
          await praise(g, `Peek-a-boo! You found ${c.aname}!`, ob[k]);
        },
        async pattern(g, c) {
          const pos = [[40, 64], [62, 52], [84, 64]];
          const ob = pos.map((p, i) => btn('pjt-sz', padSVG(c.pad, PADCOL[i]), p[0], p[1], ['red', 'yellow', 'blue'][i]));
          const seq = []; for (let i = 0; i < c.len; i++) seq.push(Math.floor(Math.random() * 3));
          const hit = i => { const b = ob[i]; b.classList.remove('pjt-hi'); void b.offsetWidth; b.classList.add('pjt-hi'); api.tone(api.midi(PADNOTE[i]), 0.3, { type: c.pad === 'drum' ? 'triangle' : 'square', vol: 0.08 }); if (c.pad === 'drum') api.noise(0.08, { ft: 'lowpass', f: 400, vol: 0.1, decay: 1 }); };
          await F.talkWait(g, c.say);
          let miss = 0;
          for (;;) {
            F.talk('Watch and listen!');
            await F.guard(g, F.sleep(900));
            for (const s of seq) { hit(s); await F.guard(g, F.sleep(750)); }
            F.talk('Your turn! Tap them in the same order.');
            let i = 0;
            while (i < seq.length) {
              ob.forEach(b => b.classList.remove('pjt-glow'));
              if (miss >= 2) ob[seq[i]].classList.add('pjt-glow');
              const k = await F.tap(g, ob);
              hit(k);
              if (k === seq[i]) i++;
              else { miss++; wrong(ob[k]); ob.forEach(b => b.classList.remove('pjt-glow')); await F.talkWait(g, miss >= 2 ? "Oops! Let's watch again. Follow the one that wiggles!" : "Oops! Let's watch again."); break; }
            }
            if (i === seq.length) break;
          }
          ob.forEach(b => b.classList.remove('pjt-glow'));
          await F.guard(g, F.sleep(300));
          await praise(g, 'You copied the whole pattern!', ob[1]);
        }
      };

      async function wordCard(g, w) {
        const spoken = `Say ${w.snd}! ${cap(w.snd)} means ${w.en}.`;
        const card = add('div', 'pjt-card', `<div class="pjt-pic">${A(w.pic)}</div><div class="pjt-word">${esc(w.es)}</div><div class="pjt-pron">(${esc(w.snd.toUpperCase())})</div><div class="pjt-mean">${esc(cap(w.es))} = ${esc(w.en)}</div><div class="pjt-crow"></div>`);
        const row = card.querySelector('.pjt-crow');
        const hear = mk('button', 'btn pjt-cb', SPEAK + 'Hear it'), said = mk('button', 'btn pjt-cb', MOUTH + 'I said it!');
        row.append(hear, said); hear.setAttribute('aria-label', 'Hear it'); said.setAttribute('aria-label', 'I said it');
        F.talk(`Say "${w.es}"! ${cap(w.es)} means ${w.en}.`, spoken);
        for (;;) {
          const k = await F.tap(g, [hear, said]);
          if (k === 1) break;
          api.sfx.click(); if (F.voice) api.say(`${w.snd}. ${w.snd}.`, { rate: 0.75 });
        }
        good(); stars(said, 8);
        await F.talkWait(g, pickA([`Muy bien! That means very good! ${cap(w.es)} means ${w.en}.`, `Great talking! ${cap(w.es)} means ${w.en}.`]),
          pickA([`Mwee byen! That means very good! ${cap(w.snd)} means ${w.en}.`, `Great talking! ${cap(w.snd)} means ${w.en}.`]));
      }

      async function magpie(g, E) {
        const last = E.stops[2];
        clear(); setBg('path'); const h = hero(E.steal === 'needle' ? E.carry : null);
        const item = add('div', 'pjt-item', A(E.steal)); place(item, 24, 66);
        await F.talkWait(g, `On the way to ${last.nm}...`);
        const gl = add('div', 'pjt-glim', A('glimmer')); place(gl, 112, 14);
        api.tone(900, 0.4, { type: 'sine', vol: 0.05, to: 1400 });
        await F.guard(g, F.sleep(80)); place(gl, 30, 56);
        await F.guard(g, F.sleep(1000));
        item.style.opacity = '0';
        if (E.steal === 'needle') root.classList.add('pjt-lost');
        api.sfx.blip(1200);
        const spotKinds = shuffle(Object.keys(SPOTS)).slice(0, 3), pos = [[44, 64], [66, 50], [86, 68]], ans = Math.floor(Math.random() * 3);
        const ob = spotKinds.map((k, i) => btn('pjt-sz pjt-spot', SPOTS[k], pos[i][0], pos[i][1], SPOTNAME[k]));
        place(gl, 60, 18);
        await F.talkWait(g, 'Tee-hee! Ooh, shiny, shiny! I love shiny things! I will hide it!', null, { pitch: 1.8, rate: 1.1 });
        place(gl, pos[ans][0], pos[ans][1] - 8);
        await F.guard(g, F.sleep(1100));
        ob[ans].insertAdjacentHTML('beforeend', `<div class="pjt-spark">${shapeSVG('star', '#fff8a0', '#ffe040')}</div>`);
        gl.classList.add('pjt-flip'); place(gl, 82, 12);
        await F.guard(g, F.sleep(900));
        if (E.steal === 'needle') await F.talkWait(g, "Oh no! Glimmer the Magpie took Needle! Needle says: I'm over here! Look for the sparkle!");
        else await F.talkWait(g, `Oh no! Glimmer the Magpie hid ${E.stealName}! Where is it? Look for the sparkle!`);
        let k, miss = 0;
        for (;;) {
          k = await F.tap(g, ob);
          if (k === ans) break;
          wrong(ob[k]); miss++;
          F.talk(`Not in the ${SPOTNAME[spotKinds[k]]}. Look for the sparkle!`);
          if (miss >= 2) ob[ans].querySelector('.pjt-spark').classList.add('big');
        }
        const sp = ob[k].querySelector('.pjt-spark'); if (sp) sp.remove();
        place(item, pos[k][0], pos[k][1]); item.style.opacity = '1';
        stars(ob[k], 8); good();
        await F.guard(g, F.sleep(900));
        place(item, 24, 66);
        root.classList.remove('pjt-lost');
        await F.talkWait(g, 'You found it! Tee-hee! You are a super spotter. Bye-bye!', null, { pitch: 1.8, rate: 1.1 });
        gl.classList.add('away'); place(gl, 118, -10);
        await praise(g, E.steal === 'needle' ? 'Thank you for finding me!' : `We got ${E.stealName} back!`);
        F.talk('Tap the green arrow to keep going!');
        await nextBtn(g);
        h.remove();
      }

      async function finale(g, E) {
        const last = E.stops[2];
        clear(); setBg(last.bg); const h = hero(E.carry === 'peep' ? null : E.carry);
        const fr = add('div', 'pjt-friend', A(E.id === 'peep' ? 'mama' : E.friend));
        if (E.id === 'peep') { const p = add('div', 'pjt-item', A('peep')); place(p, 24, 66); await F.guard(g, F.sleep(600)); place(p, 80, 70); }
        await F.talkWait(g, E.give);
        const c = h.querySelector('.pjt-carry'); if (c) c.style.opacity = '0';
        if (E.id !== 'peep') { const it = add('div', 'pjt-item', A(E.carry)); place(it, 24, 66); await F.guard(g, F.sleep(80)); place(it, 72, 76); }
        await F.talkWait(g, E.thanks, null, { pitch: 1.5 });
        h.classList.add('pjt-dance'); fr.classList.add('pjt-dance2');
        lay.querySelectorAll('.pjt-item').forEach(e => e.classList.add('pjt-dance2'));
        for (let i = 0; i < 36; i++) {
          const cf = add('div', 'pjt-conf'); cf.style.left = Math.random() * 100 + '%';
          cf.style.background = pickA(['#e02828', '#ffe040', '#2a58e0', '#30b030', '#ff70b0', '#fff']);
          cf.style.animationDelay = (Math.random() * 1.6) + 's';
        }
        api.playMusic({ mel: [72, 76, 79, 76, 77, 81, 84, 0, 79, 77, 76, 74, 72, 0, 72, 0], bass: [48, 53, 55, 48], step: 0.16, lead: 'square', leadVol: 0.035 });
        await F.talkWait(g, E.cheer);
        await F.guard(g, F.sleep(2600));
        api.stopMusic();
        const first = !S.done[E.id];
        S.done[E.id] = true; S.cur = null; persist();
        if (first) api.earn(4, `helping ${E.fname} in Pip's Jungle Trek`);
        clear(); setBg(last.bg);
        const card = add('div', 'pjt-card', `<div class="pjt-sticker" style="--c:${E.col}">${A(E.friend)}</div><div class="pjt-crow"></div>`);
        const bk = mk('button', 'btn pjt-cb', BOOK + 'Stickers'), hm = mk('button', 'btn pjt-cb', HOUSE + 'Home');
        card.querySelector('.pjt-crow').append(bk, hm);
        api.sfx.tada();
        const all = EPS.every(e => S.done[e.id]);
        F.talk((first ? `You earned the ${E.fname} sticker!` : `You helped ${E.fname} again! Great exploring!`) + (all ? ' You helped all of your jungle friends! You are a super explorer!' : ''));
        const k = await F.tap(g, [bk, hm]);
        api.sfx.click();
        if (k === 0) stickerBook(); else home();
      }

      function stickerBook() {
        F.run(async g => {
          clear(); setBg('path');
          const b = add('div', 'pjt-book', '<h3>Sticker Book</h3><div class="pjt-slots"></div>');
          const slots = EPS.map((E, i) => {
            const got = !!S.done[E.id], s = mk('button', 'pjt-slot' + (got ? ' got' : ''), A(E.friend));
            s.style.setProperty('--c', E.col); s.style.setProperty('--r', ((i * 7) % 13 - 6) + 'deg');
            s.setAttribute('aria-label', got ? E.fname : 'Empty sticker spot');
            b.querySelector('.pjt-slots').appendChild(s); return s;
          });
          const hm = mk('button', 'btn pjt-big', HOUSE + 'Home'); b.appendChild(hm);
          hm.onclick = () => { api.sfx.click(); home(); };
          const n = Object.keys(S.done).length;
          F.talk(n ? `Your sticker book! You have ${NUMW[n]} ${n === 1 ? 'sticker' : 'stickers'}. Tap one!` : 'Your sticker book is empty. Help a jungle friend to earn a sticker!');
          for (;;) {
            const k = await F.tap(g, slots), E = EPS[k];
            if (S.done[E.id]) { good(); stars(slots[k], 5); F.talk(`${E.fname}! ${E.title}.`); }
            else { blip(300); F.talk(`Help ${E.fname} to get this sticker!`); }
          }
        });
      }

      /* ----- menus, keys, lifecycle ----- */
      const howTo = () => api.msgBox("How to play Pip's Jungle Trek", "Pip, Hop the frog and Needle the talking compass help their jungle friends.\n\nNeedle talks to your child and shows everything on screen, so no reading is needed. Tap (or click) the big pictures. Tap the green arrow to go on. Tap Needle at the bottom to hear something again.\n\nEvery adventure has three stops with a game and a Spanish word, plus a surprise from Glimmer the Magpie, who hides shiny things. There is no way to lose, and your place is saved after every stop.\n\nKeyboard: number keys pick things, Enter taps the green arrow, R repeats.\n\nEach friend you help adds a sticker to your Sticker Book (and $4 the first time).");
      api.menubar([
        { label: 'Game', items: () => [
          { label: 'Home', fn: home },
          { label: 'Sticker Book', fn: stickerBook },
          '-',
          { label: 'Start Over...', fn: async () => { const r = await api.msgBox('Start Over', 'Remove all stickers and start again from the beginning?', ['Yes', 'No'], 'warn'); if (r === 'Yes') { S.done = {}; S.cur = null; persist(); home(); } } },
          '-',
          { label: 'How to Play', fn: howTo }
        ] },
        { label: 'Options', items: () => [
          { label: (F.voice ? '✓ ' : '   ') + 'Needle Talks Out Loud', fn: () => { F.voice = S.voice = !F.voice; persist(); if (!F.voice) { try { speechSynthesis.cancel(); } catch (e) { /* ignore */ } } } }
        ] }
      ]);
      $('.pjt-ndl').onclick = () => F.again();
      $('.pjt-hb').onclick = () => { api.sfx.click(); home(); };
      W.onKey = e => {
        const k = e.key;
        if (/^[0-9]$/.test(k)) { const b = lay.querySelector(`[data-n="${k}"]`); if (b) { e.preventDefault(); b.click(); } return; }
        if (k === 'Enter' || k === ' ') {
          const ae = document.activeElement;
          if (ae && ae.tagName === 'BUTTON' && root.contains(ae)) return;
          const b = lay.querySelector('.pjt-go') || lay.querySelector('.pjt-cont'); if (b) { e.preventDefault(); b.click(); }
          return;
        }
        if (k === 'r' || k === 'R') { e.preventDefault(); F.again(); }
      };
      W.onMin = () => { try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) { /* ignore */ } };
      W.onClose = () => { F.stop(); api.stopMusic(); };
      home();
    }
  });

  /* =====================================================================================
     LETTER GARDEN
     ===================================================================================== */
  const V = { k: '#000000', b: '#0000aa', g: '#00aa00', c: '#00aaaa', r: '#aa0000', m: '#aa00aa', o: '#aa5500', l: '#aaaaaa', n: '#555555', B: '#5555ff', G: '#55ff55', C: '#55ffff', R: '#ff5555', M: '#ff55ff', y: '#ffff55', w: '#ffffff', O: '#ff9900', s: '#f0b080', t: '#d8a060' };
  const PICS = {
    apple: d => { d.C(8, 9.5, 6, V.R); d.C(8, 9.5, 5.2, V.r); d.C(8, 9.5, 5.4, V.R); d.E(6, 8, 1.2, 2, V.w); d.R(8, 1, 1, 4, V.o); d.E(11, 3, 2.2, 1.1, V.g); },
    ball: d => { d.C(8, 8, 7, V.B); d.E(8, 8, 2.6, 7, V.y); d.F((a, b) => Math.hypot(a - 8, b - 8) <= 7 && Math.abs(b - 8) < 1.6, V.R); d.C(5, 5, 1.2, V.w); },
    cat: d => { d.T(2, 7, 3.5, 1, 7, 4, V.O); d.T(14, 7, 12.5, 1, 9, 4, V.O); d.C(8, 9.5, 6, V.O); d.R(5, 8, 2, 2, V.G); d.R(10, 8, 2, 2, V.G); d.P(6, 9, V.k); d.P(10, 9, V.k); d.R(7, 11, 2, 1, V.M); d.L(0.5, 11, 5, 12, V.k, 0.4); d.L(15.5, 11, 11, 12, V.k, 0.4); d.R(7, 13, 2, 1, V.r); },
    dog: d => { d.E(8, 9, 5.5, 6, V.t); d.E(2.5, 8, 2, 4.5, V.o); d.E(13.5, 8, 2, 4.5, V.o); d.R(5, 7, 1, 2, V.k); d.R(10, 7, 1, 2, V.k); d.E(8, 11, 1.8, 1.2, V.k); d.R(7, 13, 2, 2, V.R); },
    egg: d => { d.E(8, 9, 5.6, 7, V.n); d.E(8, 9, 4.8, 6.2, V.w); d.E(6, 6, 1, 1.8, '#e8e8f8'); },
    fish: d => { d.T(11, 8, 15.5, 3, 15.5, 13, V.O); d.E(7, 8, 6, 4, V.O); d.E(6, 9, 4, 1.6, V.y); d.R(4, 6, 2, 2, V.w); d.P(4, 7, V.k); d.L(9, 5, 9, 11, '#c86000', 0.4); },
    grapes: d => { d.L(8, 1, 9, 4, V.o, 0.6); d.E(11, 2.5, 2, 1, V.g); [[5, 6], [8, 6], [11, 6], [6.5, 9], [9.5, 9], [8, 12], [5, 11.5], [11, 11.5]].forEach(([x, y]) => d.C(x, y, 1.9, V.m)); d.P(4, 5, V.M); d.P(7, 5, V.M); d.P(10, 5, V.M); },
    hat: d => { d.E(8, 12, 7.5, 2, V.k); d.R(4, 4, 8, 8, V.k); d.R(4, 9, 8, 2, V.r); d.R(5, 5, 1, 3, V.n); },
    igloo: d => { d.F((a, b) => Math.hypot(a - 8, b - 14) <= 7.5 && b < 14, V.w); for (let y = 8; y < 14; y += 2.5) d.F((a, b) => Math.hypot(a - 8, b - 14) <= 7.5 && Math.abs(b - y) < 0.4, V.C); d.L(8, 7, 8, 14, V.C, 0.4); d.F((a, b) => Math.hypot(a - 8, b - 14) <= 2.8 && b < 14, V.b); d.R(0, 14, 16, 2, V.C); },
    jam: d => { d.R(4, 2, 8, 2, V.l); d.R(3, 4, 10, 11, V.w); d.R(4, 6, 8, 8, V.r); d.R(5, 8, 6, 3, V.w); d.R(6, 9, 4, 1, V.r); d.R(4, 6, 1, 7, V.R); },
    kite: d => { d.T(9, 1, 3, 7, 9, 7, V.R); d.T(9, 1, 15, 7, 9, 7, V.y); d.T(3, 7, 9, 7, 9, 12, V.B); d.T(15, 7, 9, 7, 9, 12, V.G); d.L(9, 12, 5, 16, V.k, 0.4); d.C(7, 14, 0.9, V.R); },
    leaf: d => { d.F((a, b) => { const u = (a - 8) * 0.707 + (b - 8) * 0.707, v = -(a - 8) * 0.707 + (b - 8) * 0.707; return (u / 7) ** 2 + (v / 3.6) ** 2 <= 1; }, V.g); d.L(3, 13, 12.5, 3.5, V.G, 0.4); d.L(1.5, 14.5, 4, 12, V.o, 0.6); },
    moon: d => { d.R(0, 0, 16, 16, V.b); d.F((a, b) => Math.hypot(a - 8, b - 8) <= 6.8 && Math.hypot(a - 11.5, b - 6) > 5.4, V.y); d.P(13, 11, V.w); d.P(12, 2, V.w); d.P(2, 2, V.w); d.P(14, 14, V.y); },
    nest: d => { d.C(5.5, 7.5, 2.2, V.C); d.C(10.5, 7.5, 2.2, V.C); d.C(8, 6.5, 2.2, '#80ffff'); d.F((a, b) => ((a - 8) / 7.5) ** 2 + ((b - 10) / 4.5) ** 2 <= 1 && b > 8.5, V.o); d.L(1.5, 10, 14.5, 11, '#7a3a00', 0.4); d.L(2.5, 12.5, 13.5, 12, '#7a3a00', 0.4); },
    octopus: d => { [2.5, 5, 7.5, 10, 12.5].forEach((x, i) => d.L(x + 0.5, 9, x + (i % 2 ? 1 : -1), 15, V.m, 0.8)); d.E(8, 6, 5.5, 5, V.M); d.R(5, 5, 2, 2, V.w); d.R(9, 5, 2, 2, V.w); d.P(6, 6, V.k); d.P(10, 6, V.k); d.R(7, 9, 2, 1, V.m); },
    pig: d => { d.T(2, 6, 3, 1, 7, 4, V.M); d.T(14, 6, 13, 1, 9, 4, V.M); d.C(8, 9, 6, '#ffaacc'); d.E(8, 11, 2.6, 1.8, V.M); d.P(7, 11, V.m); d.P(9, 11, V.m); d.P(5, 7, V.k); d.P(10, 7, V.k); },
    quilt: d => { const cs = [V.R, V.y, V.B, V.G, V.M, V.C, V.O, V.w, V.R]; for (let i = 0; i < 9; i++) d.R(1 + (i % 3) * 5, 1 + Math.floor(i / 3) * 5, 5, 5, cs[i]); for (let i = 1; i < 3; i++) { d.R(1 + i * 5, 1, 1, 15, V.k); d.R(1, 1 + i * 5, 15, 1, V.k); } d.P(3, 3, V.w); d.P(13, 8, V.k); },
    rain: d => { d.C(5, 5, 3, V.l); d.C(9, 4, 3.6, V.l); d.C(12, 6, 2.6, V.l); d.R(3, 6, 11, 3, V.l); [[4, 11], [8, 12], [12, 11], [6, 14.5], [10, 15]].forEach(([x, y]) => d.L(x, y - 1.6, x - 0.6, y, V.B, 0.5)); },
    sun: d => { for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; d.L(8 + 5 * Math.cos(a), 8 + 5 * Math.sin(a), 8 + 7.5 * Math.cos(a), 8 + 7.5 * Math.sin(a), V.O, 0.7); } d.C(8, 8, 4.5, V.y); d.P(6, 7, V.k); d.P(9, 7, V.k); d.R(6, 9, 4, 1, V.O); },
    tent: d => { d.T(8, 2, 1, 14, 15, 14, V.O); d.T(8, 5, 5, 14, 11, 14, V.o); d.L(8, 0.5, 8, 3, V.k, 0.4); d.R(0, 14, 16, 2, V.g); },
    umbrella: d => { d.F((a, b) => Math.hypot(a - 8, b - 8) <= 7.2 && b < 8, V.R); d.F((a, b) => Math.hypot(a - 8, b - 8) <= 7.2 && b < 8 && Math.abs(a - 8) < 1.8, V.w); d.L(8.5, 8, 8.5, 14, V.k, 0.5); d.L(8.5, 14, 6.5, 14.5, V.k, 0.5); d.P(6, 13, V.k); },
    van: d => { d.R(1, 5, 14, 7, V.B); d.R(10, 3, 5, 3, V.B); d.R(11, 4, 3, 2, V.C); d.R(3, 7, 3, 2, V.C); d.R(7, 7, 3, 2, V.C); d.C(4.5, 12.5, 2, V.k); d.C(11.5, 12.5, 2, V.k); d.P(4, 12, V.l); d.P(11, 12, V.l); },
    web: d => { for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; d.L(8, 8, 8 + 7.5 * Math.cos(a), 8 + 7.5 * Math.sin(a), V.l, 0.4); } [2.5, 5, 7].forEach(r => d.F((a, b) => Math.abs(Math.max(Math.abs(a - 8), Math.abs(b - 8)) * 0.6 + Math.hypot(a - 8, b - 8) * 0.45 - r) < 0.4, V.l)); d.C(11, 5, 1.3, V.k); },
    box: d => { d.R(2, 5, 12, 10, V.O); d.R(2, 5, 12, 2, '#cc7700'); d.T(2, 5, 0, 1, 6, 5, '#ffbb44'); d.T(14, 5, 16, 1, 10, 5, '#ffbb44'); d.R(7, 5, 2, 10, '#ffe0a0'); },
    yoyo: d => { d.L(8, 0, 8, 5, V.k, 0.4); d.C(8, 10, 5.5, V.R); d.R(3, 9, 11, 2, V.r); d.C(8, 10, 1.2, V.w); d.P(5, 7, '#ffaaaa'); },
    zebra: d => { d.T(3, 1, 5, 6, 7, 3, V.w); d.T(13, 1, 11, 6, 9, 3, V.w); d.E(8, 8, 4.5, 6.5, V.w); d.F((a, b) => ((a - 8) / 4.5) ** 2 + ((b - 8) / 6.5) ** 2 <= 1 && Math.floor(b) % 3 === 0 && b < 11, V.k); d.E(8, 12.5, 3.2, 2.5, V.n); d.P(7, 12, V.k); d.P(9, 12, V.k); d.R(5, 7, 2, 1, V.k); d.R(9, 7, 2, 1, V.k); d.R(7, 0, 2, 3, V.k); },
    bug: d => { d.C(8, 3.5, 2.3, V.k); d.L(7, 2, 5, 0, V.k, 0.4); d.L(9, 2, 11, 0, V.k, 0.4); d.C(8, 9.5, 6, V.R); d.L(8, 4, 8, 15.5, V.k, 0.5); [[5, 8], [11, 8], [5, 12], [11, 12], [8, 10.5]].forEach(([x, y], i) => i < 4 && d.C(x, y, 1.2, V.k)); },
    cup: d => { d.F((a, b) => { const r = Math.hypot(a - 13, b - 8.5); return r <= 3.5 && r >= 2 && a > 12; }, V.B); d.R(3, 4, 10, 10, V.B); d.R(2, 3, 12, 2, V.C); d.R(5, 6, 1, 6, '#8888ff'); d.E(8, 14.5, 6, 1, V.n); },
    hen: d => { d.L(6, 12, 6, 15, V.O, 0.5); d.L(9, 12, 9, 15, V.O, 0.5); d.E(8.5, 9.5, 5.5, 4, V.w); d.C(5, 5, 3, V.w); d.C(12.5, 8, 2.5, V.l); d.R(4, 1, 3, 2, V.R); d.T(1, 5, 2.8, 4, 2.8, 6, V.O); d.P(4, 4, V.k); d.R(3, 7, 1, 2, V.R); },
    fox: d => { d.T(1.5, 1, 3, 8, 7, 5, V.O); d.T(14.5, 1, 13, 8, 9, 5, V.O); d.T(1.5, 5, 14.5, 5, 8, 15, V.O); d.T(2, 8, 7, 9, 8, 15, V.w); d.T(14, 8, 9, 9, 8, 15, V.w); d.P(5, 7, V.k); d.P(10, 7, V.k); d.R(7, 13, 2, 2, V.k); },
    net: d => { d.L(1, 15, 7, 9, V.o, 0.7); d.F((a, b) => { const r = Math.hypot(a - 10.5, b - 5.5); return r <= 5.2; }, '#d0d0d0'); d.F((a, b) => { const r = Math.hypot(a - 10.5, b - 5.5); return r <= 5.2 && ((Math.floor(a) + Math.floor(b)) % 3 === 0 || Math.abs(a - b + 4) < 0.4); }, V.l); d.F((a, b) => { const r = Math.hypot(a - 10.5, b - 5.5); return r <= 5.8 && r > 5; }, V.n); },
    mop: d => { d.L(12, 1, 7, 10, V.o, 0.7); d.R(4, 9, 7, 2, V.n); for (let x = 3; x < 12; x += 2) d.L(x + 0.5, 11, x + 0.2, 15, V.l, 0.6); },
    bed: d => { d.R(1, 4, 2, 11, V.o); d.R(13, 8, 2, 7, V.o); d.R(3, 9, 10, 3, V.w); d.R(3, 7, 4, 2, V.C); d.R(6, 8, 7, 4, V.R); d.R(1, 12, 14, 1, V.o); }
  };
  const picCache = {};
  const PIC = k => picCache[k] || (picCache[k] = svgBox(16, 16, rast(16, 16, PICS[k])));
  const LET = {
    a: ['ah', 'apple', 'short a, like the start of apple: open your mouth wide'], b: ['buh', 'ball', 'press your lips together, then pop them open'],
    c: ['kuh', 'cat', 'a quick click at the back of your mouth, like k'], d: ['duh', 'dog', 'tap your tongue behind your top teeth'],
    e: ['eh', 'egg', 'short e, like the start of egg'], f: ['fff', 'fish', 'top teeth on your bottom lip, then blow: fff'],
    g: ['guh', 'grapes', 'hard g, a gulp at the back of your mouth'], h: ['huh', 'hat', 'a little puff of breath, like fogging a window'],
    i: ['ih', 'igloo', 'short i, like the start of igloo'], j: ['juh', 'jam', 'lips forward, like the start of jam'],
    k: ['kuh', 'kite', 'a quick click at the back of your mouth, the same sound as c in cat'], l: ['lll', 'leaf', 'tongue up behind your top teeth: lll'],
    m: ['mmm', 'moon', 'lips together and hum: mmm'], n: ['nnn', 'nest', 'tongue up, hum through your nose: nnn'],
    o: ['ah', 'octopus', 'short o, like the start of octopus: mouth round and open'], p: ['puh', 'pig', 'lips pop with a puff of air'],
    q: ['kwuh', 'quilt', 'q and u team up to say kw, like the start of quilt'], r: ['rrr', 'rain', 'growl like a puppy: rrr'],
    s: ['sss', 'sun', 'hiss like a snake: sss'], t: ['tuh', 'tent', 'tap your tongue, quick and quiet'],
    u: ['uh', 'umbrella', 'short u, like the start of umbrella'], v: ['vvv', 'van', 'top teeth on your lip and buzz: vvv'],
    w: ['wuh', 'web', 'round your lips like a kiss, then open them'], x: ['ks', 'box', 'x says ks, like the end of box'],
    y: ['yuh', 'yoyo', 'like the start of yo-yo'], z: ['zzz', 'zebra', 'buzz like a bee: zzz']
  };
  const SAYS = { a: 'ah', b: 'buh', c: 'kuh', d: 'duh', e: 'eh', f: 'fuh', g: 'guh', h: 'huh', i: 'ih', j: 'juh', k: 'kuh', l: 'luh', m: 'muh', n: 'nuh', o: 'ah', p: 'puh', q: 'kwuh', r: 'ruh', s: 'suh', t: 'tuh', u: 'uh', v: 'vuh', w: 'wuh', x: 'ks', y: 'yuh', z: 'zuh' };
  const PICNAME = { yoyo: 'yo-yo' };
  const pn = k => PICNAME[k] || k;
  const ABC = 'abcdefghijklmnopqrstuvwxyz'.split('');
  const WORDS = ['cat', 'bug', 'cup', 'dog', 'hen', 'fox', 'pig', 'hat', 'jam', 'net', 'mop', 'box', 'sun', 'van', 'web', 'bed'];
  const SENTS = [
    ['The cat sat on a mat.', 'cat'], ['A big dog can run.', 'dog'], ['The hen is in the pen.', 'hen'], ['I see a red bug.', 'bug'],
    ['The pig is in the mud.', 'pig'], ['The sun is hot.', 'sun'], ['Mom has a hat.', 'hat'], ['The fox is red.', 'fox'],
    ['Dad got in the van.', 'van'], ['I can sit on the bed.', 'bed'], ['Get the jam!', 'jam'], ['The web is wet.', 'web'],
    ['The box is big.', 'box'], ['Sam can mop.', 'mop'], ['The fish can swim.', 'fish'], ['The egg is in the nest.', 'egg'],
    ['I like my kite.', 'kite'], ['The moon is up.', 'moon'], ['Pam has a cup.', 'cup'], ['Get the net.', 'net']
  ];
  const SOUNDGRP = { c: 'ck', k: 'ck', q: 'ck' };
  const LEVELS = [
    { name: 'Seedling', ages: '4-5', steps: ['sound', 'case', 'picture'] },
    { name: 'Sprout', ages: '5-6', steps: ['sound', 'picture', 'word'] },
    { name: 'Blossom', ages: '6-7', steps: ['picture', 'word', 'sentence'] }
  ];
  const FLCOL = ['#ff5555', '#ff55ff', '#ffff55', '#5555ff', '#ff9900', '#55ffff', '#ffffff', '#aa00aa'];
  function flowerArt(stage, idx) {
    return svgBox(16, 24, rast(16, 24, d => {
      const col = FLCOL[idx % FLCOL.length], type = idx % 3;
      d.E(8, 23, 7, 2.2, '#7a3a00'); d.E(8, 22.6, 6, 1.4, V.o);
      if (stage === 1) { d.E(8, 21, 1.5, 1, '#4a2a00'); d.L(8, 20.5, 8, 18.5, V.G, 0.5); return; }
      if (stage === 2) { d.L(8, 21.5, 8, 15, V.g, 0.6); d.E(6, 16, 2, 1, V.G); d.E(10, 15, 2, 1, V.G); return; }
      if (stage >= 3) { d.L(8, 21.5, 8, 8, V.g, 0.6); d.E(5.3, 17, 2.6, 1.2, V.G); d.E(10.7, 14, 2.6, 1.2, V.G); }
      if (stage === 3) { d.E(8, 7, 2, 3, col); d.T(6.2, 8.5, 9.8, 8.5, 8, 11, V.g); return; }
      if (type === 0) { for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; d.C(8 + 3.6 * Math.cos(a), 6.5 + 3.6 * Math.sin(a), 1.9, col); } d.C(8, 6.5, 2, col === V.y ? V.o : V.y); }
      else if (type === 1) { d.E(8, 6.5, 3.8, 3.6, col); d.T(4.2, 6, 6, 1.5, 7, 5, col); d.T(11.8, 6, 10, 1.5, 9, 5, col); d.T(6.5, 4, 8, 1, 9.5, 4, col); d.L(8, 4, 8, 9.5, 'rgba(0,0,0,.25)', 0.3); }
      else { for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; d.T(8 + 2.5 * Math.cos(a - 0.4), 6.5 + 2.5 * Math.sin(a - 0.4), 8 + 2.5 * Math.cos(a + 0.4), 6.5 + 2.5 * Math.sin(a + 0.4), 8 + 6 * Math.cos(a), 6.5 + 6 * Math.sin(a), col); } d.C(8, 6.5, 2.8, V.o); d.P(7, 6, '#7a3a00'); d.P(9, 7, '#7a3a00'); }
    }));
  }
  const DOT = svgBox(16, 14, rast(16, 14, d => {
    d.L(4, 3, 2, 0.5, V.k, 0.5); d.L(6, 2.5, 6.5, 0, V.k, 0.5);
    d.C(10, 8, 5.4, V.R); d.C(4.5, 6, 2.8, V.k); d.P(3, 5, V.w); d.P(5, 5, V.w);
    d.L(5.5, 8, 15, 8, V.k, 0.45); d.C(9, 5.5, 1.1, V.k); d.C(12.5, 6, 1.1, V.k); d.C(9.5, 11, 1.1, V.k); d.C(13, 10.5, 1, V.k);
    d.L(7, 12.5, 6, 14, V.k, 0.4); d.L(11, 13, 11, 14, V.k, 0.4);
  }));

  (window.RETRO_APPS = window.RETRO_APPS || []).push({
    id: 'lettergarden',
    label: 'Letter Garden',
    kind: 'store', cat: 'game', year: 1990, price: 19.95,
    publisher: 'Bramblewood Software',
    genre: 'Early reading (ages 4-7)',
    tagline: 'Plant a letter. Grow a reader.',
    blurb: 'Dot the Ladybug helps young readers plant a flower for every letter from A to Z. Hear each letter\'s sound, match big and little letters, find pictures that start with a letter, build words like C-A-T by dragging letter tiles, and read your first short sentences. Three skill levels grow with your child, and the garden keeps blooming every time you come back. Talks out loud on computers with speech.',
    sizeKB: 1800,
    box: { bg: '#0000aa', fg: '#ffff55', accent: '#55ff55' },
    icon: `<svg viewBox="0 0 32 32" shape-rendering="crispEdges" aria-hidden="true"><rect x="1" y="1" width="30" height="30" fill="#55ffff" stroke="#000"/><rect x="2" y="24" width="28" height="6" fill="#aa5500"/><g transform="translate(14 2) scale(1)">${rast(16, 24, dd => { dd.L(8, 21.5, 8, 8, V.g, 0.6); dd.E(5.3, 17, 2.6, 1.2, V.G); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; dd.C(8 + 3.6 * Math.cos(a), 6.5 + 3.6 * Math.sin(a), 1.9, V.M); } dd.C(8, 6.5, 2, V.y); })}</g><text x="3" y="21" font-family="Arial,sans-serif" font-weight="bold" font-size="16" fill="#0000aa">A</text></svg>`,
    window: { w: 620, h: 500 },
    css: `
      .lgd{height:100%;display:flex;flex-direction:column;background:#000;color:#fff;user-select:none;-webkit-user-select:none;font:18px/1.2 var(--dos);container-type:size;touch-action:manipulation}
      .lgd svg{display:block}
      .lgd-top{display:flex;justify-content:space-between;align-items:center;gap:8px;background:#0000aa;padding:3px 8px;border-bottom:2px solid #55ffff;flex:none;flex-wrap:wrap}
      .lgd-top b{font:400 26px/1 var(--dos);color:#ffff55;text-shadow:2px 2px #aa00aa;letter-spacing:2px}
      .lgd-stat{color:#55ffff;font-size:18px}
      .lgd-main{flex:1;min-height:0;position:relative;overflow:auto;background:#55ffff}
      .lgd-bot{display:flex;align-items:center;gap:6px;background:#0000aa;padding:5px;border-top:2px solid #55ffff;flex:none}
      .lgd-dot{width:52px;height:48px;background:#000;border:2px solid #ffff55;padding:4px;cursor:pointer;flex:none}
      .lgd-dot svg{width:100%;height:100%}
      .lgd-say{flex:1;min-height:48px;background:#000;color:#fff;border:2px solid #aaaaaa;padding:4px 8px;display:flex;align-items:center;font-size:19px;line-height:1.1}
      .lgd-act{min-width:0!important;min-height:48px;font:400 20px/1 var(--dos)!important;color:#000;padding:4px 10px!important;flex:none;max-width:40%}
      .lgd-yard{min-height:100%;display:flex;flex-direction:column;background:linear-gradient(#55ffff 0 60px,#00aa00 60px)}
      .lgd-sky{height:60px;position:relative;flex:none}
      .lgd-sky i{position:absolute;display:block}
      .lgd-beds{flex:1;display:grid;grid-template-columns:repeat(auto-fill,minmax(60px,1fr));gap:6px;padding:8px;align-content:start}
      .lgd-plot{height:86px;background:#aa5500;border:2px solid #000;box-shadow:inset 0 -12px #7a3a00;position:relative;cursor:pointer;padding:0;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;color:#fff}
      .lgd-plot svg{width:36px;height:54px;margin-bottom:12px}
      .lgd-plot span{position:absolute;left:2px;top:2px;background:#fff;color:#000;border:1px solid #000;font:400 17px/1 var(--dos);padding:0 3px}
      .lgd-plot.lock span{background:#aaaaaa;color:#555555}
      .lgd-plot.cur{outline:3px solid #ffff55;animation:lgd-pulse 1s infinite}
      .lgd-plot.sel{outline:3px solid #ff55ff}
      .lgd-plot.new svg{animation:lgd-grow .8s}
      .lgd-plot .lgd-pk{width:30px;height:34px;margin-bottom:16px;background:#ffff55;border:2px solid #000;display:grid;place-items:center;font:400 22px/1 var(--dos);color:#aa0000}
      .lgd-les{min-height:100%;display:flex;gap:8px;padding:8px;background:#0000aa;align-items:stretch}
      .lgd-side{display:flex;flex-direction:column;align-items:center;gap:6px;width:150px;flex:none}
      .lgd-big{width:100%;background:#fff;color:#000;border:3px solid #ffff55;box-shadow:4px 4px #000;font:400 64px/1 var(--dos);padding:6px 0 2px;cursor:pointer}
      .lgd-pot{width:100%;flex:1;min-height:100px;background:#55ffff;border:3px solid #000;display:flex;align-items:flex-end;justify-content:center;position:relative;cursor:pointer;padding:0}
      .lgd-pot svg{height:94%;width:auto;max-width:100%}
      .lgd-pot.pop svg{animation:lgd-grow .6s}
      .lgd-pot.help{animation:lgd-pulse .9s infinite;outline:3px solid #ffff55}
      .lgd-bar{display:flex;gap:3px}
      .lgd-bar i{width:18px;height:12px;border:2px solid #000;background:#555555}
      .lgd-bar i.on{background:#55ff55}
      .lgd-task{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;background:#000;border:3px solid #55ffff;padding:8px;min-width:0}
      .lgd-q{font:400 26px/1.1 var(--dos);color:#ffff55;text-align:center}
      .lgd-hint{font-size:17px;color:#aaaaaa;text-align:center}
      .lgd-ch{display:flex;gap:10px;flex-wrap:wrap;justify-content:center}
      .lgd-c{min-width:84px;height:84px;background:#fff;color:#000;border:3px solid #fff;box-shadow:inset -3px -3px #aaaaaa,4px 4px #555555;font:400 52px/1 var(--dos);cursor:pointer;padding:6px;display:grid;place-items:center}
      .lgd-c svg{width:64px;height:64px}
      .lgd-c:focus-visible{outline:3px dashed #ffff55}
      .lgd-c.no{background:#555555;border-color:#555555;box-shadow:none;animation:lgd-shake .4s}
      .lgd-c.yes{background:#55ff55;border-color:#ffff55}
      .lgd-c.help{animation:lgd-pulse .8s infinite}
      .lgd-sm{min-width:0!important;min-height:44px;font:400 20px/1 var(--dos)!important;color:#000;padding:4px 12px!important}
      .lgd-wpic{width:72px;height:72px;background:#fff;border:3px solid #ffff55;padding:6px}
      .lgd-wpic svg{width:100%;height:100%}
      .lgd-slots{display:flex;gap:8px}
      .lgd-slot{width:62px;height:66px;border:3px dashed #ffff55;background:#000055;display:grid;place-items:center}
      .lgd-slot.ok{border-style:solid;border-color:#55ff55}
      .lgd-tray{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;min-height:66px}
      .lgd-tile{width:56px;height:60px;background:#ffff55;color:#000;border:3px solid #fff;box-shadow:inset -3px -3px #aa5500,3px 3px #555555;font:400 44px/1 var(--dos);cursor:grab;touch-action:none;padding:0}
      .lgd-tile.drag{position:fixed;z-index:9999;pointer-events:none;box-shadow:6px 6px rgba(0,0,0,.5)}
      .lgd-tile.bad{background:#ff5555}
      .lgd-sent{font:400 30px/1.3 var(--dos);color:#fff;text-align:center;background:#000055;border:2px solid #5555ff;padding:4px 10px}
      .lgd-sent span{cursor:pointer;padding:0 2px}
      .lgd-sent span.hl{background:#ffff55;color:#000}
      .lgd-win{position:absolute;inset:0;background:rgba(0,0,85,.9);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;z-index:3}
      .lgd-win svg{width:110px;height:165px;animation:lgd-grow 1s}
      .lgd-win b{font:400 34px/1 var(--dos);color:#ffff55;text-align:center}
      .lgd-e1995 .lgd-say,.lgd-e2000 .lgd-say,.lgd-e1995 .lgd-q,.lgd-e2000 .lgd-q,.lgd-e1995 .lgd-sent,.lgd-e2000 .lgd-sent{font-family:"Comic Sans MS","Chalkboard SE",var(--ui);font-weight:700}
      .lgd-e1995 .lgd-say,.lgd-e2000 .lgd-say{font-size:16px}
      .lgd-e1995 .lgd-q,.lgd-e2000 .lgd-q{font-size:21px}
      .lgd-e1995 .lgd-sent,.lgd-e2000 .lgd-sent{font-size:23px}
      .lgd-e1995 .lgd-big,.lgd-e2000 .lgd-big,.lgd-e1995 .lgd-c,.lgd-e2000 .lgd-c,.lgd-e1995 .lgd-tile,.lgd-e2000 .lgd-tile{font-family:"Comic Sans MS","Chalkboard SE",Arial,sans-serif;font-weight:700}
      .lgd-e1995 .lgd-big,.lgd-e2000 .lgd-big{font-size:52px}
      .lgd-e1995 .lgd-c,.lgd-e2000 .lgd-c{font-size:40px;border-radius:10px}
      .lgd-e1995 .lgd-tile,.lgd-e2000 .lgd-tile{font-size:34px;border-radius:8px}
      .lgd-e2000 .lgd-yard{background:linear-gradient(#55b8ff,#aee8ff 60px,#3cb043 60px,#2a8a30)}
      .lgd-e2000 .lgd-les{background:linear-gradient(#2a3ad0,#0a1a80)}
      .lgd-e2000 .lgd-plot{border-radius:8px}
      @container (max-width:520px){
        .lgd-les{flex-direction:column}
        .lgd-side{width:100%;flex-direction:row;height:120px}
        .lgd-big{width:110px;font-size:48px;height:100%;padding:0}
        .lgd-pot{height:100%;min-height:0}
        .lgd-bar{flex-direction:column}
        .lgd-c{min-width:72px;height:72px;font-size:42px}
        .lgd-c svg{width:54px;height:54px}
        .lgd-sent{font-size:24px}
        .lgd-top b{font-size:22px}
        .lgd-slot{width:56px;height:60px}
        .lgd-tile{width:50px;height:54px;font-size:38px}
      }
      @keyframes lgd-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.07)}}
      @keyframes lgd-shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}
      @keyframes lgd-grow{0%{transform:scaleY(.2);transform-origin:50% 100%}70%{transform:scaleY(1.1);transform-origin:50% 100%}100%{transform:scaleY(1);transform-origin:50% 100%}}
    `,
    open(W, api) {
      const era = api.era.id;
      W.body.innerHTML = `<div class="lgd lgd-e${era}"><div class="lgd-top"><b>LETTER GARDEN</b><span class="lgd-stat"></span></div><div class="lgd-main"></div><div class="lgd-bot"><button class="lgd-dot" title="Hear it again" aria-label="Hear it again">${DOT}</button><div class="lgd-say" aria-live="polite"></div><button class="btn lgd-act"></button></div></div>`;
      const root = W.body.firstChild, $ = s => root.querySelector(s);
      const main = $('.lgd-main'), sayEl = $('.lgd-say'), act = $('.lgd-act'), stat = $('.lgd-stat');
      const F = mkFlow(api, sayEl);
      F.scope = main;
      let G;
      try { G = api.load('garden', null); } catch (e) { G = null; }
      if (!G || !Array.isArray(G.grown)) G = { grown: [], level: 0, voice: true };
      G.grown = G.grown.filter(l => ABC.includes(l));
      if (!(G.level >= 0 && G.level <= 2)) G.level = 0;
      F.voice = G.voice !== false;
      const persist = () => { try { api.save('garden', G); } catch (e) { /* ignore */ } };
      const nextLetter = () => ABC.find(l => !G.grown.includes(l));
      const U = l => l.toUpperCase();
      const soundLine = l => `${U(l)} says /${l === 'x' ? 'ks' : l === 'q' ? 'kw' : l}/, ${LET[l][2]}.`;
      const soundSpoken = l => l === 'x' ? `X says ${SAYS.x}, like the end of box.` : `${U(l)} says ${SAYS[l]}, as in ${pn(LET[l][1])}.`;
      const mk = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
      const good = () => jingle(api, [60, 64, 67, 72], 0.08);
      const bad = () => api.tone(180, 0.2, { type: 'square', vol: 0.05 });
      let sel = null, lesson = null;
      const hud = () => { stat.textContent = `Flowers ${G.grown.length}/26  Level: ${LEVELS[G.level].name}`; };

      /* ----- garden ----- */
      function garden(newL) {
        lesson = null;
        F.run(async g => {
          hud();
          const cur = nextLetter();
          if (!sel || !G.grown.includes(sel)) sel = null;
          main.innerHTML = `<div class="lgd-yard"><div class="lgd-sky"><i style="left:12px;top:8px;width:40px;height:40px;background:#ffff55;border:2px solid #ff9900"></i><i style="left:30%;top:12px;width:60px;height:14px;background:#fff"></i><i style="left:34%;top:4px;width:30px;height:12px;background:#fff"></i><i style="right:12%;top:20px;width:70px;height:14px;background:#fff"></i><i style="left:0;right:0;bottom:0;height:10px;background:repeating-linear-gradient(90deg,#fff 0 6px,transparent 6px 14px)"></i></div><div class="lgd-beds"></div></div>`;
          const beds = main.querySelector('.lgd-beds');
          const plots = ABC.map((l, i) => {
            const grown = G.grown.includes(l), isCur = l === cur;
            const b = mk('button', 'lgd-plot' + (grown ? '' : isCur ? ' cur' : ' lock') + (l === newL ? ' new' : '') + (l === sel ? ' sel' : ''), (grown ? flowerArt(4, i) : isCur ? `<div class="lgd-pk">${U(l)}</div>` : '') + `<span>${U(l)}${l}</span>`);
            b.setAttribute('aria-label', grown ? `${U(l)} flower` : isCur ? `Plant ${U(l)}` : `${U(l)}, not planted yet`);
            b.onclick = () => {
              if (grown) {
                sel = l; plots.forEach(p => p.classList.remove('sel')); b.classList.add('sel');
                const sv = b.querySelector('svg'); if (sv) { sv.style.animation = 'none'; void sv.offsetWidth; sv.style.animation = 'lgd-grow .6s'; }
                api.tone(api.midi(60 + i % 12), 0.15, { type: 'square', vol: 0.05 });
                F.talk(`${soundLine(l)} ${U(l)} is for ${pn(LET[l][1])}.`, `${soundSpoken(l)}`);
                setAct();
              } else if (isCur) { api.sfx.click(); startLesson(l, true); }
              else { api.tone(150, 0.1, { type: 'square', vol: 0.04 }); F.talk(`First grow the ${U(cur)} flower. Then you can plant ${U(l)}!`); }
            };
            beds.appendChild(b); return b;
          });
          const setAct = () => {
            if (sel) { act.textContent = `Practice ${U(sel)}`; act.onclick = () => { api.sfx.click(); startLesson(sel, false); }; }
            else if (cur) { act.textContent = `Plant ${U(cur)}`; act.onclick = () => { api.sfx.click(); startLesson(cur, true); }; }
            else { act.textContent = 'Practice'; act.onclick = () => F.talk('Tap any flower, then tap Practice.'); }
          };
          setAct();
          if (newL) { const p = plots[ABC.indexOf(newL)]; p.scrollIntoView({ block: 'nearest' }); }
          if (!cur && newL) {
            api.sfx.tada();
            await F.talkWait(g, 'Wow! You grew a flower for every letter from A to Z! Your Letter Garden is full! Tap any flower to practice.');
          } else if (newL) await F.talkWait(g, `Look at your ${U(newL)} flower! Next, let's plant ${U(cur)}. Tap the ${U(cur)} seed packet!`);
          else if (!G.grown.length) await F.talkWait(g, `Hello! I'm Dot the Ladybug. Let's grow a Letter Garden! Tap the ${U(cur)} seed packet to plant it.`);
          else if (cur) await F.talkWait(g, `Welcome back to your garden! You have ${G.grown.length} ${G.grown.length === 1 ? 'flower' : 'flowers'}. Tap the ${U(cur)} seed packet to plant it!`);
          else await F.talkWait(g, 'Your garden is full of flowers! Tap any flower to hear it, or practice it again.');
        });
      }

      /* ----- lesson ----- */
      function startLesson(l, isNew) {
        F.run(async g => {
          const idx = ABC.indexOf(l), steps = LEVELS[G.level].steps;
          let stage = 0;
          lesson = { l };
          hud();
          main.scrollTop = 0;
          main.innerHTML = `<div class="lgd-les"><div class="lgd-side"><button class="lgd-big" aria-label="Hear the letter">${U(l)}${l}</button><button class="lgd-pot" aria-label="Flower pot">${flowerArt(0, idx)}</button><div class="lgd-bar">${'<i></i>'.repeat(4)}</div></div><div class="lgd-task"></div></div>`;
          const task = main.querySelector('.lgd-task'), pot = main.querySelector('.lgd-pot'), bar = main.querySelectorAll('.lgd-bar i');
          main.querySelector('.lgd-big').onclick = () => { api.sfx.click(); if (F.voice) api.say(soundSpoken(l), { rate: 0.85 }); };
          act.textContent = 'Garden'; act.onclick = () => { api.sfx.click(); garden(); };
          const grow = () => {
            stage++; pot.innerHTML = flowerArt(stage, idx); pot.classList.remove('pop'); void pot.offsetWidth; pot.classList.add('pop');
            bar.forEach((b, i) => b.classList.toggle('on', i < stage));
            for (let i = 0; i < 3; i++) api.tone(api.midi(60 + stage * 4 + i * 3), 0.1, { type: 'triangle', vol: 0.07, at: i * 0.07 });
          };
          // 1: plant the seed
          task.innerHTML = `<div class="lgd-q">This is ${U(l)}.</div><div class="lgd-ch"><button class="lgd-c">${PIC(LET[l][1])}</button></div><div class="lgd-hint">${esc(soundLine(l))}</div><button class="btn lgd-sm">Plant the seed!</button>`;
          const plantB = task.querySelector('.lgd-sm'), picB = task.querySelector('.lgd-c');
          picB.setAttribute('aria-label', pn(LET[l][1]));
          picB.onclick = () => { if (F.voice) api.say(`${pn(LET[l][1])}. ${soundSpoken(l)}`); };
          pot.classList.add('help');
          const planted = F.tap(g, [pot, plantB]);
          F.talk(`This is ${U(l)}. ${soundLine(l)} ${U(l)} is for ${pn(LET[l][1])}. Tap the pot to plant the ${U(l)} seed!`,
            `This is ${U(l)}. ${soundSpoken(l)} Tap the pot to plant the ${U(l)} seed!`);
          await planted;
          pot.classList.remove('help'); pot.onclick = null; delete pot.dataset.n;
          api.noise(0.25, { ft: 'lowpass', f: 600, vol: 0.08, decay: 1 });
          grow();
          await F.guard(g, F.sleep(500));
          for (const s of steps) {
            await TASK[s](g, l, task);
            grow();
            await F.guard(g, F.sleep(700));
          }
          // flower grown!
          const fresh = isNew && !G.grown.includes(l);
          if (fresh) { G.grown.push(l); persist(); }
          api.sfx.tada();
          const win = mk('div', 'lgd-win', `${flowerArt(4, idx)}<b>You grew the ${U(l)} flower!</b><button class="btn lgd-sm">Back to the garden</button>`);
          main.appendChild(win);
          if (fresh) payFlower(l);
          F.talk(`Hooray! You grew the ${U(l)} flower! ${U(l)} is for ${pn(LET[l][1])}.`);
          await F.tap(g, [win.querySelector('button')]);
          api.sfx.click();
          sel = null;
          garden(fresh ? l : null);
        });
      }
      function payFlower(l) {
        const day = new Date().toDateString();
        let e = null; try { e = api.load('earn', null); } catch (x) { /* ignore */ }
        if (!e || e.day !== day) e = { day, n: 0 };
        if (e.n >= 5) return;
        e.n++; try { api.save('earn', e); } catch (x) { /* ignore */ }
        api.earn(1, `growing the ${U(l)} flower in Letter Garden`);
      }
      // A multiple-choice round: renders buttons, waits until the right one is tapped.
      async function choose(g, task, q, hint, items, right, onWrong, spoken, top) {
        task.innerHTML = `<div class="lgd-q">${esc(q)}</div>${top ? `<div class="lgd-c yes" style="cursor:default">${esc(top)}</div>` : ''}<div class="lgd-ch"></div>${hint ? `<div class="lgd-hint">${esc(hint)}</div>` : ''}<button class="btn lgd-sm">Hear it again</button>`;
        const ch = task.querySelector('.lgd-ch');
        const bs = items.map(it => { const b = mk('button', 'lgd-c', it.html); b.setAttribute('aria-label', it.label); ch.appendChild(b); return b; });
        task.querySelector('.lgd-sm').onclick = () => { api.sfx.click(); F.again(); };
        F.talk(q + (hint && !spoken ? ' ' + hint : ''), spoken);
        let miss = 0;
        for (;;) {
          const k = await F.tap(g, bs);
          if (k === right) { bs[k].classList.add('yes'); good(); return; }
          if (bs[k].classList.contains('no')) continue;
          bad(); bs[k].classList.add('no'); miss++;
          F.talk(onWrong(k));
          if (miss >= 2) bs[right].classList.add('help');
        }
      }
      const others = (l, n, ok) => shuffle(ABC.filter(x => x !== l && (!SOUNDGRP[l] || SOUNDGRP[l] !== SOUNDGRP[x]) && (!ok || ok(x)))).slice(0, n);
      const CONFUSE = { b: 'dpq', d: 'bpq', p: 'qbd', q: 'pdb', m: 'nw', n: 'mu', u: 'nv', w: 'mv', i: 'lj', l: 'it', h: 'nk' };
      const TASK = {
        async sound(g, l, task) {
          const opts = shuffle([l, ...others(l, 2)]);
          await choose(g, task, `Which letter says /${l === 'x' ? 'ks' : l === 'q' ? 'kw' : l}/?`, `Listen: ${LET[l][2]}.`,
            opts.map(x => ({ html: `${U(x)}${x}`, label: U(x) })), opts.indexOf(l),
            k => `That's ${U(opts[k])}. ${U(opts[k])} says ${SAYS[opts[k]]}. Listen again: ${SAYS[l]}.`,
            `Listen. ${SAYS[l]}. ${SAYS[l]}. Which letter says ${SAYS[l]}?`);
          await F.talkWait(g, `Yes! ${soundLine(l)}`, `Yes! ${soundSpoken(l)}`);
        },
        async case(g, l, task) {
          const up = Math.random() < 0.5;
          const conf = (CONFUSE[l] || '').split('').filter(Boolean);
          const pool = shuffle(conf).slice(0, 1).concat(others(l, 3).filter(x => !conf.includes(x)));
          const opts = shuffle([l, ...pool.slice(0, 2)]);
          const show = up ? U(l) : l;
          await choose(g, task, up ? `Find little ${l} for big ${U(l)}.` : `Find big ${U(l)} for little ${l}.`, null,
            opts.map(x => ({ html: up ? x : U(x), label: up ? `little ${x}` : `big ${U(x)}` })), opts.indexOf(l),
            k => `That's ${up ? 'little' : 'big'} ${U(opts[k])}. Look again for ${up ? 'little' : 'big'} ${U(l)}!`,
            up ? `Here is big ${U(l)}. Can you find little ${U(l)}?` : `Here is little ${U(l)}. Can you find big ${U(l)}?`, show);
          await F.talkWait(g, `Yes! Big ${U(l)} and little ${U(l)} go together!`, `Yes! Big ${U(l)} and little ${U(l)} go together!`);
        },
        async picture(g, l, task) {
          const ans = LET[l][1], end = l === 'x';
          const all = Array.from(new Set(ABC.map(x => LET[x][1]).concat(WORDS))).filter(p => PICS[p]);
          const bad2 = shuffle(all.filter(p => p !== ans && (end ? !p.includes('x') : (p[0] !== l && !(SOUNDGRP[l] && SOUNDGRP[l] === SOUNDGRP[p[0]]))))).slice(0, 2);
          const opts = shuffle([ans, ...bad2]);
          const q = end ? 'Which picture ends with X?' : `Which picture starts with ${U(l)}?`;
          await choose(g, task, q, null, opts.map(p => ({ html: PIC(p), label: pn(p) })), opts.indexOf(ans),
            k => end ? `That's a ${pn(opts[k])}. Listen for ks at the end!` : `That's ${/^[aeiou]/.test(opts[k]) ? 'an' : 'a'} ${pn(opts[k])}. ${cap(pn(opts[k]))} starts with ${U(opts[k][0])}. Try again!`,
            end ? 'Which picture ends with X? X says ks.' : `Which picture starts with ${U(l)}? ${U(l)} says ${SAYS[l]}.`);
          await F.talkWait(g, end ? 'Yes! Box ends with X!' : `Yes! ${cap(pn(ans))} starts with ${U(l)}!`);
        },
        async word(g, l, task) {
          const cands = WORDS.filter(w => w.includes(l));
          const word = pickA(cands.length ? cands : WORDS), letters = word.split('');
          const extra = shuffle(ABC.filter(x => !letters.includes(x))).slice(0, 2);
          const tiles = shuffle(letters.concat(extra));
          task.innerHTML = `<div class="lgd-q">Build the word!</div><div class="lgd-wpic">${PIC(word)}</div><div class="lgd-slots">${'<div class="lgd-slot"></div>'.repeat(3)}</div><div class="lgd-tray"></div><button class="btn lgd-sm">Hear it again</button>`;
          const slots = [...task.querySelectorAll('.lgd-slot')], tray = task.querySelector('.lgd-tray');
          const tb = tiles.map(ch => { const b = mk('button', 'lgd-tile', ch); b.dataset.ch = ch; b.setAttribute('aria-label', `letter ${ch}`); tray.appendChild(b); return b; });
          const spell = () => { if (F.voice) api.say(`${word}. ${letters.map(x => SAYS[x]).join('. ')}. ${word}.`, { rate: 0.8 }); };
          task.querySelector('.lgd-sm').onclick = () => { api.sfx.click(); spell(); };
          lesson.keys = null;
          F.talk(`This is a ${word}. Build the word ${word}! Drag the letters into the boxes.`, `This is a ${word}. Build the word, ${word}! Drag the letters into the boxes.`);
          await F.guard(g, new Promise(done => {
            let miss = 0;
            const inSlot = t => slots.find(s => s.firstChild === t);
            const check = () => {
              if (slots.some(s => !s.firstChild)) return;
              const got = slots.map(s => s.firstChild.dataset.ch).join('');
              if (got === word) { slots.forEach(s => { s.classList.add('ok'); s.firstChild.disabled = true; }); good(); done(); return; }
              miss++; bad();
              slots.forEach((s, i) => { const t = s.firstChild; if (t.dataset.ch !== letters[i]) t.classList.add('bad'); else { s.classList.add('ok'); t.dataset.lock = '1'; } });
              F.talk(miss >= 2 ? `Almost! Listen: ${letters.join(' - ')}. ${word}.` : `Almost! Listen to the sounds in ${word}.`, `Almost! Listen: ${letters.map(x => SAYS[x]).join(', ')}. ${word}.`);
              F.sleep(900).then(() => slots.forEach(s => { const t = s.firstChild; if (t && t.classList.contains('bad')) { t.classList.remove('bad'); tray.appendChild(t); } }));
            };
            const placeIn = (t, s) => { if (!s || s.firstChild || t.dataset.lock) return false; s.appendChild(t); api.tone(api.midi(67), 0.06, { type: 'square', vol: 0.04 }); if (F.voice) api.say(SAYS[t.dataset.ch], { rate: 0.9 }); check(); return true; };
            const tapTile = t => {
              if (t.dataset.lock || t.disabled) return;
              if (inSlot(t)) { tray.appendChild(t); api.sfx.click(); return; }
              placeIn(t, slots.find(s => !s.firstChild));
            };
            tb.forEach(t => {
              let st = null;
              t.addEventListener('pointerdown', e => {
                if (t.dataset.lock || t.disabled) return;
                e.preventDefault(); try { t.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ }
                const r = t.getBoundingClientRect(); st = { x: e.clientX, y: e.clientY, dx: e.clientX - r.left, dy: e.clientY - r.top, drag: false };
              });
              t.addEventListener('pointermove', e => {
                if (!st) return;
                if (!st.drag && Math.hypot(e.clientX - st.x, e.clientY - st.y) > 8) { st.drag = true; t.classList.add('drag'); }
                if (st.drag) { t.style.left = (e.clientX - st.dx) + 'px'; t.style.top = (e.clientY - st.dy) + 'px'; }
              });
              const up = e => {
                if (!st) return;
                const was = st; st = null;
                if (!was.drag) { if (e.type === 'pointerup') tapTile(t); return; }
                t.classList.remove('drag'); t.style.left = t.style.top = '';
                const hit = document.elementsFromPoint(e.clientX, e.clientY).map(el => el.closest && el.closest('.lgd-slot')).find(Boolean);
                if (hit && slots.includes(hit)) { if (hit.firstChild && hit.firstChild !== t) return; if (inSlot(t) === hit) return; if (inSlot(t)) tray.appendChild(t); placeIn(t, hit); }
                else if (inSlot(t)) tray.appendChild(t);
              };
              t.addEventListener('pointerup', up); t.addEventListener('pointercancel', up);
              t.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); tapTile(t); } });
            });
            lesson.keys = e => {
              const k = e.key.toLowerCase();
              if (k === 'backspace') { const s = slots.slice().reverse().find(x => x.firstChild && !x.firstChild.dataset.lock && !x.firstChild.disabled); if (s) tray.appendChild(s.firstChild); return true; }
              if (/^[a-z]$/.test(k)) { const t = tb.find(x => x.dataset.ch === k && !inSlot(x)); if (t) tapTile(t); return true; }
              return false;
            };
          }));
          lesson.keys = null;
          await F.talkWait(g, `Yes! ${letters.map(U).join('-')}. ${cap(word)}!`, `Yes! ${letters.map(x => SAYS[x]).join(', ')}. ${word}!`);
        },
        async sentence(g, l, task) {
          const pool = SENTS.filter(s => s[0].toLowerCase().includes(l));
          const [sent, key] = pickA(pool.length ? pool : SENTS);
          const words = sent.toLowerCase().replace(/[^a-z ]/g, '').split(' ');
          const all = Array.from(new Set(ABC.map(x => LET[x][1]).concat(WORDS))).filter(p => PICS[p] && p !== key && !words.includes(p));
          const opts = shuffle([key, ...shuffle(all).slice(0, 2)]);
          const html = sent.split(' ').map(w => `<span>${esc(w)}</span>`).join(' ');
          const readIt = async () => {
            const sp = [...task.querySelectorAll('.lgd-sent span')];
            if (F.voice) api.say(sent, { rate: 0.8 });
            for (const s of sp) { s.classList.add('hl'); await F.sleep(420); s.classList.remove('hl'); }
          };
          task.innerHTML = `<div class="lgd-q">Read it! Which picture goes with it?</div><div class="lgd-sent">${html}</div><div class="lgd-ch"></div><button class="btn lgd-sm">Read it to me</button>`;
          task.querySelectorAll('.lgd-sent span').forEach(s => { s.onclick = () => { api.sfx.click(); if (F.voice) api.say(s.textContent.replace(/[^A-Za-z]/g, ''), { rate: 0.8 }); }; });
          task.querySelector('.lgd-sm').onclick = () => { api.sfx.click(); readIt(); };
          const ch = task.querySelector('.lgd-ch');
          const bs = opts.map(p => { const b = mk('button', 'lgd-c', PIC(p)); b.setAttribute('aria-label', pn(p)); ch.appendChild(b); return b; });
          F.talk('Read the sentence. Then tap the picture that goes with it. Tap a word to hear it.');
          let miss = 0;
          for (;;) {
            const k = await F.tap(g, bs);
            if (opts[k] === key) { bs[k].classList.add('yes'); good(); break; }
            if (bs[k].classList.contains('no')) continue;
            bad(); bs[k].classList.add('no'); miss++;
            F.talk(`That's ${/^[aeiou]/.test(opts[k]) ? 'an' : 'a'} ${pn(opts[k])}. Read it again!`);
            if (miss >= 2) { readIt(); bs[opts.indexOf(key)].classList.add('help'); }
          }
          await F.talkWait(g, `Yes! You read it: ${sent}`, `Yes! You read it! ${sent}`);
        }
      };

      /* ----- menus, keys, lifecycle ----- */
      const howTo = () => api.msgBox('How to play Letter Garden', 'Grow a flower for every letter from A to Z!\n\nTap the seed packet in the garden to plant the next letter. Dot the Ladybug says what to do (and shows it at the bottom). Each right answer makes the flower grow. There is no losing: just try again.\n\nSeedling (ages 4-5): letter sounds, big and little letters, and pictures.\nSprout (ages 5-6): sounds, pictures and building words.\nBlossom (ages 6-7): pictures, building words and reading sentences.\n\nBuilding words: drag the letter tiles into the boxes, or tap a tile, or type the letters.\n\nTap a flower you have grown to hear its letter, or practice it again. Tap Dot to hear anything again. Keyboard: number keys pick an answer.\n\nEach new flower earns $1 (up to $5 a day).');
      api.menubar([
        { label: 'Game', items: () => [
          { label: 'Garden', fn: () => garden() },
          { label: 'New Garden...', fn: async () => { const r = await api.msgBox('New Garden', 'Clear all the flowers and start a new garden from A?', ['Yes', 'No'], 'warn'); if (r === 'Yes') { G.grown = []; persist(); sel = null; garden(); } } },
          '-',
          { label: 'How to Play', fn: howTo }
        ] },
        { label: 'Level', items: () => LEVELS.map((L, i) => ({ label: (G.level === i ? '✓ ' : '   ') + `${L.name} (ages ${L.ages})`, fn: () => { G.level = i; persist(); hud(); F.talk(`Level: ${L.name}.`); if (lesson) garden(); } })) },
        { label: 'Options', items: () => [
          { label: (F.voice ? '✓ ' : '   ') + 'Dot Talks Out Loud', fn: () => { F.voice = !F.voice; G.voice = F.voice; persist(); if (!F.voice) { try { speechSynthesis.cancel(); } catch (e) { /* ignore */ } } } }
        ] }
      ]);
      $('.lgd-dot').onclick = () => F.again();
      W.onKey = e => {
        if (lesson && lesson.keys && !e.ctrlKey && !e.metaKey && !e.altKey && lesson.keys(e)) { e.preventDefault(); return; }
        if (/^[1-9]$/.test(e.key)) { const b = main.querySelector(`[data-n="${e.key}"]`); if (b) { e.preventDefault(); b.click(); } }
      };
      W.onMin = () => { try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) { /* ignore */ } };
      W.onClose = () => F.stop();
      garden();
    }
  });
})();
