/* Photo Studio: a year-2000 digital camera simulator that ships with Horizon 2000.
   Aim a pretend "Horizon SnapShot 1300" (1.3 megapixel!) at six drawn places, focus, zoom and snap,
   then download the pictures over the camera cable, touch them up and keep them in an album.
   It never touches a real camera or webcam: every picture is drawn by this program. */
(function () {
  const WW = 1100, WH = 300;            // world (panorama) size for every place
  const LW = 320, LH = 240;             // LCD / capture render size
  const IW = 240, IH = 180;             // stored picture size
  const CARD_MAX = 16, INBOX_MAX = 24, ALBUM_MAX = 30;
  const ZMIN = 1, ZOPT = 3, ZMAX = 6;   // 3x optical, then digital zoom up to 6x
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ---------- drawing helpers ---------- */
  const R = (g, c, x, y, w, h) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  const E = (g, c, x, y, rx, ry, rot = 0) => { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, Math.abs(rx), Math.abs(ry), rot, 0, TAU); g.fill(); };
  const P = (g, c, p) => { g.fillStyle = c; g.beginPath(); g.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) g.lineTo(p[i], p[i + 1]); g.closePath(); g.fill(); };
  const L = (g, c, w, p) => { g.strokeStyle = c; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) g.lineTo(p[i], p[i + 1]); g.stroke(); };
  const T = (g, c, font, s, x, y, align = 'center') => { g.fillStyle = c; g.font = font; g.textAlign = align; g.textBaseline = 'middle'; g.fillText(s, x, y); };
  // Eyes go red when the flash fires (the famous red-eye). Positions are collected so the red-eye tool can fix them.
  let REDEYE = false, EYES = null;
  function eye(g, x, y, r = 1.6) {
    E(g, REDEYE ? '#ff1830' : '#111', x, y, r, r);
    if (!REDEYE) E(g, '#fff', x - r * 0.35, y - r * 0.4, r * 0.35, r * 0.35);
    if (EYES) { const m = g.getTransform(), p = m.transformPoint(new DOMPoint(x, y)); EYES.push([p.x, p.y, Math.max(1, r * Math.hypot(m.a, m.b))]); }
  }
  const ease = (t, a, b, sp, ph = 0) => { const k = t * sp + ph; return { x: a + (b - a) * (0.5 - 0.5 * Math.cos(k)), f: Math.sin(k) >= 0 ? 1 : -1, v: Math.abs(Math.sin(k)) }; };
  const wrap = (t, a, b, sp, ph = 0) => { const L2 = b - a; return a + (((t * sp + ph) % L2) + L2) % L2; };
  function sky(g, top, bot, h) { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, top); gr.addColorStop(1, bot); g.fillStyle = gr; g.fillRect(-50, -50, WW + 100, h + 50); }
  function cloud(g, x, y, s = 1) { E(g, '#fff', x, y, 22 * s, 9 * s); E(g, '#fff', x + 14 * s, y - 6 * s, 14 * s, 10 * s); E(g, '#fff', x - 14 * s, y - 3 * s, 12 * s, 8 * s); }
  function clouds(g, t, ys) { ys.forEach((y, i) => cloud(g, wrap(t, -80, WW + 80, 5 + i, i * 390), y, 0.8 + (i % 3) * 0.2)); }
  function tree(g, x, y, s = 1) { R(g, '#6b4423', x - 4 * s, y - 30 * s, 8 * s, 30 * s); E(g, '#2f7d32', x, y - 42 * s, 22 * s, 20 * s); E(g, '#3d9a40', x - 8 * s, y - 48 * s, 12 * s, 10 * s); }
  function legs(g, c, xs, y, h, w, t, v) { xs.forEach((x, i) => R(g, c, x + (i % 2 ? -1 : 1) * Math.sin(t * 9) * 2.5 * v, y, w, h)); }

  /* ---------- the six places ---------- */
  const PLACES = [];
  const place = p => PLACES.push(p);

  place({
    id: 'zoo', name: 'City Zoo', start: [180, 150],
    bg(g, t) {
      sky(g, '#5fb0ea', '#cdeefc', 210); clouds(g, t, [40, 70, 30, 60]);
      E(g, '#7cbf5a', 250, 215, 300, 50); E(g, '#86c860', 800, 215, 360, 55);
      R(g, '#6cb84a', -50, 200, WW + 100, 110);
      tree(g, 40, 205, 1.3); tree(g, 300, 200, 1.1); tree(g, 760, 200, 1.2); tree(g, 1060, 205, 1.3);
      // lion rock
      P(g, '#9a7b5a', [580, 232, 600, 196, 640, 186, 700, 190, 730, 232]); P(g, '#7d6247', [680, 232, 700, 190, 730, 232]);
      // penguin pool
      E(g, '#e8eef4', 870, 236, 82, 20); E(g, '#3a8fd8', 872, 240, 66, 13);
      L(g, '#8fd0ff', 1.5, [830 + Math.sin(t * 2) * 4, 240, 850 + Math.sin(t * 2) * 4, 240]);
      R(g, '#dcc48e', -50, 252, WW + 100, 26); R(g, '#6cb84a', -50, 278, WW + 100, 40);
      R(g, '#6b4423', 988, 150, 5, 70); R(g, '#1d5e2a', 950, 128, 80, 26); T(g, '#fff', 'bold 11px Arial', 'CITY ZOO', 990, 141);
    },
    // the fence goes in front of the animals (but behind the zookeeper); the penguins get a glass wall
    fg(g) {
      for (let x = 0; x < WW; x += 24) if (x < 780 || x > 960) R(g, '#8a6a3a', x, 226, 4, 24);
      R(g, '#8a6a3a', 0, 231, 782, 3); R(g, '#8a6a3a', 0, 242, 782, 3); R(g, '#8a6a3a', 962, 231, WW, 3); R(g, '#8a6a3a', 962, 242, WW, 3);
      g.globalAlpha = 0.28; R(g, '#bfe6ff', 782, 222, 180, 28); g.globalAlpha = 1; R(g, '#9ab', 782, 222, 180, 2); R(g, '#9ab', 782, 248, 180, 2);
    },
    subs: [
      { id: 'giraffe', name: 'Giraffe', z: 2, box(t) { const m = ease(t, 60, 240, 0.18); return { x: m.x, y: 82, w: 70, h: 150, f: m.f, v: m.v }; },
        draw(g, w, h, t, b) {
          const bob = Math.sin(t * 1.7) * 2, c = '#e8b64c', d = '#b5702a';
          legs(g, '#d9a441', [14, 22, 44, 52], 98, 50, 5, t, b.v);
          [14, 22, 44, 52].forEach(x => R(g, '#4a2e14', x, 146, 5, 4));
          L(g, '#8a5a20', 2, [8, 84, 3, 108]);
          E(g, c, 34, 90, 29, 14);
          P(g, c, [44, 84, 58, 86, 66 + bob * 0.3, 18 + bob, 56 + bob * 0.3, 14 + bob]);
          [[24, 86], [38, 92], [30, 97], [46, 88], [16, 92], [54, 70], [58, 52], [61, 34]].forEach(([x, y]) => E(g, d, x, y, 4, 3));
          const hx = 66 + bob * 0.3, hy = 12 + bob;
          L(g, '#8a5a20', 2, [hx - 4, hy - 4, hx - 5, hy - 12]); E(g, '#6b3f1a', hx - 5, hy - 13, 2, 2);
          L(g, '#8a5a20', 2, [hx, hy - 4, hx, hy - 12]); E(g, '#6b3f1a', hx, hy - 13, 2, 2);
          E(g, c, hx - 8, hy - 3, 5, 2, -0.4);
          E(g, c, hx + 2, hy, 11, 6, 0.25); E(g, '#d8a060', hx + 10, hy + 3, 4, 3);
          eye(g, hx + 1, hy - 2, 1.6);
        } },
      { id: 'elephant', name: 'Elephant', z: 2, box(t) { const m = ease(t, 330, 470, 0.12, 1); return { x: m.x, y: 146, w: 120, h: 88, f: m.f, v: m.v }; },
        draw(g, w, h, t, b) {
          const c = '#8d8d99', dk = '#6f6f7c', sw = Math.sin(t * 2);
          legs(g, dk, [18, 34, 64, 80], 50, 38, 14, t * 0.6, b.v); legs(g, c, [22, 38, 68, 84], 50, 38, 12, t * 0.6, b.v);
          L(g, dk, 2, [8, 30, 2, 52]);
          E(g, c, 55, 40, 46, 30);
          E(g, c, 98, 30, 20, 22);
          L(g, c, 9, [110, 38, 116 + sw * 3, 60, 112 + sw * 6, 80]);
          P(g, '#f5f1e0', [104, 46, 118, 54, 106, 50]);
          E(g, dk, 88, 32, 14, 19); E(g, '#b9a0a8', 88, 32, 9, 13);
          eye(g, 104, 24, 2);
        } },
      { id: 'lion', name: 'Lion', z: 3, box(t) { const m = ease(t, 594, 652, 0.35, 2); return { x: m.x, y: 142, w: 80, h: 50, f: m.f, v: m.v }; },
        draw(g, w, h, t, b) {
          const c = '#d99a3a';
          L(g, c, 3, [10, 22, 0, 12 + Math.sin(t * 3) * 4]); E(g, '#7a3f12', 0, 11 + Math.sin(t * 3) * 4, 3, 4);
          legs(g, '#c5862c', [14, 22, 46, 54], 30, 18, 6, t, b.v);
          E(g, c, 36, 26, 28, 13);
          E(g, '#8a4b1a', 64, 20, 16, 17); E(g, '#9d5a22', 62, 18, 13, 13);
          E(g, c, 68, 21, 10, 9); E(g, '#e5b870', 73, 25, 5, 4); E(g, '#3a2010', 76, 23, 2, 1.5);
          eye(g, 70, 18, 1.6);
        } },
      { id: 'penguin', name: 'Penguin', z: 4, box(t) { const m = ease(t, 808, 900, 0.5, 0.3); return { x: m.x, y: 196, w: 24, h: 34, f: m.f, v: m.v }; },
        draw(g, w, h, t, b) {
          g.translate(12, 34); g.rotate(Math.sin(t * 9) * 0.14 * b.v); g.translate(-12, -34);
          E(g, '#f59a1c', 8, 33, 5, 2); E(g, '#f59a1c', 16, 33, 5, 2);
          E(g, '#1c1c28', 12, 19, 10, 14); E(g, '#fff', 14, 21, 6, 10);
          E(g, '#1c1c28', 12, 7, 7, 7); P(g, '#f59a1c', [18, 7, 24, 9, 18, 10]);
          E(g, '#1c1c28', 4, 20, 3, 9, 0.3);
          eye(g, 15, 5, 1.3);
        } },
      { id: 'zookeeper', name: 'Zookeeper', z: 6, box(t) { const m = ease(t, 30, 1050, 0.045, 2); return { x: m.x, y: 212, w: 24, h: 58, f: m.f, v: m.v }; },
        draw(g, w, h, t, b) {
          const st = Math.sin(t * 7) * 4 * b.v;
          L(g, '#5a4a2a', 5, [10, 36, 10 + st, 54]); L(g, '#5a4a2a', 5, [14, 36, 14 - st, 54]);
          R(g, '#b59a5a', 5, 16, 14, 22); L(g, '#f0c090', 3, [18, 20, 23, 32]);
          R(g, '#888', 20, 32, 8, 8); R(g, '#ccc', 21, 33, 6, 2);
          L(g, '#b59a5a', 4, [7, 18, 5 - st * 0.4, 32]);
          E(g, '#f0c090', 12, 9, 6, 7); R(g, '#6a5a2a', 4, 1, 16, 4); R(g, '#6a5a2a', 7, -3, 10, 5);
          eye(g, 15, 8, 1.2);
        } }
    ]
  });

  place({
    id: 'beach', name: 'Sunny Beach', start: [520, 150],
    bg(g, t) {
      sky(g, '#3e9ee8', '#bfe6ff', 150); E(g, '#fff6a0', 120, 40, 20, 20); E(g, '#ffe24a', 120, 40, 15, 15); clouds(g, t, [50, 30, 70]);
      R(g, '#1f6fc2', -50, 148, WW + 100, 62);
      g.globalAlpha = 0.7; for (let y = 156; y < 206; y += 11) for (let x = -40; x < WW + 40; x += 60) L(g, '#9fd4ff', 1.5, [x + ((t * 12 + y * 3) % 60), y, x + 14 + ((t * 12 + y * 3) % 60), y]); g.globalAlpha = 1;
      R(g, '#f2d88c', -50, 206, WW + 100, 110);
      const fo = Math.sin(t * 1.3) * 4; P(g, '#fff', [-50, 204 + fo, WW + 50, 204 + fo, WW + 50, 210 + fo, -50, 210 + fo]);
      P(g, '#6e6a62', [900, 236, 930, 222, 1000, 216, 1060, 226, 1100, 240, 1100, 250, 900, 250]);
      E(g, '#e6c877', 300, 270, 30, 4); E(g, '#e6c877', 760, 262, 40, 5);
      R(g, '#e0453a', 700, 236, 50, 20); R(g, '#fff', 700, 246, 50, 4); L(g, '#555', 2, [760, 256, 760, 190]); P(g, '#e0453a', [730, 196, 790, 196, 760, 180]); P(g, '#ffe24a', [742, 196, 778, 196, 760, 186]);
    },
    subs: [
      { id: 'lighthouse', name: 'Lighthouse', z: 1, box() { return { x: 950, y: 40, w: 50, h: 190, f: 1 }; },
        draw(g, w, h, t) {
          P(g, '#fff', [8, 190, 42, 190, 36, 40, 14, 40]);
          for (let i = 0; i < 4; i++) { const y0 = 58 + i * 34, k0 = (y0 - 40) / 150, k1 = (y0 + 17 - 40) / 150; P(g, '#d8322a', [14 - 6 * k0, y0, 36 + 6 * k0, y0, 36 + 6 * k1, y0 + 17, 14 - 6 * k1, y0 + 17]); }
          R(g, '#333', 10, 34, 30, 6); R(g, '#ffe98a', 15, 16, 20, 18); R(g, '#333', 15, 16, 2, 18); R(g, '#333', 33, 16, 2, 18);
          P(g, '#d8322a', [10, 16, 25, 2, 40, 16]); R(g, '#333', 24, -2, 2, 5);
          const a = t * 1.6; g.globalAlpha = 0.25 + 0.2 * Math.max(0, Math.cos(a)); P(g, '#fff7b0', [25, 25, 25 + Math.cos(a) * 120, 10, 25 + Math.cos(a) * 120, 40]); g.globalAlpha = 1;
          R(g, '#224', 22, 120, 6, 12);
        } },
      { id: 'surfer', name: 'Surfer', z: 2, box(t) { const m = ease(t, 250, 700, 0.14); return { x: m.x, y: 128 + Math.sin(t * 1.6) * 5, w: 38, h: 46, f: m.f, v: m.v }; },
        draw(g, w, h, t) {
          P(g, '#e7f6ff', [-10, 44, 4, 30, 18, 36, 40, 34, 52, 46]);
          E(g, '#ff7a1a', 20, 39, 20, 3.5); R(g, '#fff', 8, 38, 24, 1.5);
          L(g, '#1d3fa0', 4, [14, 37, 18, 26]); L(g, '#1d3fa0', 4, [26, 37, 22, 26]);
          R(g, '#20a0a0', 15, 13, 11, 14);
          L(g, '#c98a58', 3, [16, 16, 4, 20]); L(g, '#c98a58', 3, [25, 16, 36, 12]);
          E(g, '#c98a58', 21, 7, 5.5, 6); P(g, '#f2d04a', [15, 5, 27, 5, 25, 0, 17, 0]);
          eye(g, 24, 6, 1.2);
        } },
      { id: 'sandcastle', name: 'Sandcastle', z: 3, box() { return { x: 520, y: 212, w: 60, h: 50, f: 1 }; },
        draw(g, w, h, t) {
          const s = '#d9b664', dk = '#bf9a48';
          R(g, s, 4, 28, 52, 22); R(g, s, 2, 14, 14, 36); R(g, s, 44, 14, 14, 36); R(g, s, 20, 6, 20, 44);
          for (let x = 2; x < 58; x += 6) if (x < 16 || x > 42 || (x > 19 && x < 40)) R(g, s, x, x > 18 && x < 41 ? 2 : 10, 4, 4);
          R(g, dk, 26, 36, 8, 14); E(g, dk, 30, 36, 4, 4); R(g, dk, 7, 22, 4, 5); R(g, dk, 49, 22, 4, 5);
          L(g, '#555', 1, [30, 6, 30, -8]); P(g, '#e0453a', [30, -8, 30 + 9 + Math.sin(t * 5) * 1.5, -5, 30, -2]);
        } },
      { id: 'crab', name: 'Crab', z: 5, box(t) { const m = ease(t, 120, 380, 0.4, 0.7); return { x: m.x, y: 252 + Math.abs(Math.sin(t * 12)) * -1.5, w: 28, h: 18, f: 1, v: m.v }; },
        draw(g, w, h, t, b) {
          const c = '#d8402a', k = Math.sin(t * 14) * 2 * b.v;
          for (let i = 0; i < 3; i++) { L(g, c, 1.5, [8, 12, 2, 16 + i * 1 + k]); L(g, c, 1.5, [20, 12, 26, 16 + i * 1 - k]); }
          E(g, c, 14, 11, 9, 5.5);
          L(g, c, 2, [7, 9, 3, 3]); E(g, c, 3, 2, 3.5, 3); L(g, c, 2, [21, 9, 25, 3]); E(g, c, 25, 2, 3.5, 3);
          L(g, c, 1.2, [11, 7, 10, 3]); L(g, c, 1.2, [17, 7, 18, 3]);
          eye(g, 10, 3, 1.3); eye(g, 18, 3, 1.3);
        } },
      { id: 'seagull', name: 'Seagull', z: 6, box(t) { return { x: wrap(t, -60, WW + 60, 38, 200), y: 40 + Math.sin(t * 0.9) * 18, w: 34, h: 18, f: 1 }; },
        draw(g, w, h, t) {
          const fl = Math.sin(t * 8) * 7;
          E(g, '#fff', 17, 11, 12, 4.5); P(g, '#c8ccd4', [12, 10, 22, 10, 8, 2 + fl]); P(g, '#a9aeb8', [14, 10, 24, 10, 28, 1 + fl * 0.8]);
          E(g, '#fff', 29, 9, 4.5, 4); P(g, '#f2b01e', [32, 9, 38, 10, 32, 11]); P(g, '#bbb', [5, 10, 0, 8, 1, 13]);
          eye(g, 30, 8, 1);
        } }
    ]
  });

  place({
    id: 'city', name: 'Downtown', start: [540, 150],
    bg(g, t) {
      sky(g, '#6aa6d8', '#e4eef6', 230); clouds(g, t, [35, 60]);
      const bl = [[0, 90, 70], [60, 120, 60], [120, 70, 80], [200, 140, 55], [270, 100, 90], [370, 130, 70], [640, 100, 80], [720, 150, 60], [790, 90, 70], [870, 120, 90], [960, 80, 60], [1030, 130, 80]];
      bl.forEach(([x, hh, ww], i) => { R(g, ['#8f97a8', '#a3a0b4', '#7f8898'][i % 3], x, 226 - hh, ww, hh); for (let y = 226 - hh + 8; y < 220; y += 12) for (let xx = x + 6; xx < x + ww - 6; xx += 12) R(g, (xx * 7 + y) % 5 ? '#c9d6e6' : '#ffe9a0', xx, y, 6, 6); });
      R(g, '#b8b8b8', -50, 226, WW + 100, 20); for (let x = 0; x < WW; x += 30) R(g, '#a0a0a0', x, 226, 1, 20);
      R(g, '#777', -50, 245, WW + 100, 3); R(g, '#454548', -50, 248, WW + 100, 60);
      for (let x = 0; x < WW; x += 50) R(g, '#f4d03f', x, 273, 26, 3);
      R(g, '#333', 180, 190, 3, 36); R(g, '#222', 176, 180, 11, 22); E(g, '#e33', 181.5, 185, 3, 3); E(g, '#fc3', 181.5, 191, 3, 3); E(g, '#3c3', 181.5, 197, 3, 3);
    },
    subs: [
      { id: 'skyscraper', name: 'Skyscraper', z: 1, box() { return { x: 470, y: 6, w: 110, h: 220, f: 1 }; },
        draw(g, w, h) {
          R(g, '#8a9cb4', 55, -10, 3, 20); R(g, '#6f86a8', 30, 10, 50, 14);
          R(g, '#4a6a94', 10, 24, 90, 196); R(g, '#5d7fae', 10, 24, 45, 196);
          for (let y = 30; y < 206; y += 10) for (let x = 16; x < 96; x += 10) R(g, (x * 3 + y) % 7 ? '#9cc4ea' : '#fff4b0', x, y, 6, 6);
          R(g, '#2e4466', 42, 198, 26, 22); R(g, '#9cc4ea', 45, 201, 9, 19); R(g, '#9cc4ea', 56, 201, 9, 19);
          E(g, '#f44', 56.5, -11, 2, 2);
        } },
      { id: 'hotdog', name: 'Hot dog stand', z: 2, box() { return { x: 800, y: 166, w: 72, h: 76, f: 1 }; },
        draw(g, w, h, t) {
          L(g, '#555', 2, [36, 12, 36, 40]);
          P(g, '#e0453a', [0, 14, 36, 0, 72, 14]); P(g, '#f4d03f', [18, 14, 36, 0, 54, 14]);
          R(g, '#ddd', 6, 40, 60, 28); R(g, '#e0453a', 6, 44, 60, 10); T(g, '#fff', 'bold 8px Arial', 'HOT DOGS', 36, 49.5);
          R(g, '#999', 4, 38, 64, 3);
          E(g, '#333', 16, 70, 6, 6); E(g, '#333', 56, 70, 6, 6); E(g, '#aaa', 16, 70, 2, 2); E(g, '#aaa', 56, 70, 2, 2);
          E(g, '#c8742a', 26, 36, 8, 2.5); E(g, '#f2c46a', 26, 37.5, 9, 2);
          g.globalAlpha = 0.5; for (let i = 0; i < 3; i++) { const k = (t * 0.8 + i / 3) % 1; E(g, '#fff', 44 + Math.sin(k * 8 + i) * 3, 36 - k * 16, 3 + k * 3, 2 + k * 2); } g.globalAlpha = 1;
        } },
      { id: 'pigeon', name: 'Pigeon', z: 3, box(t) { const m = ease(t, 190, 330, 0.3, 1.2); const hop = Math.abs(Math.sin(t * 6)) * 3 * m.v; return { x: m.x, y: 222 - hop, w: 18, h: 16, f: m.f, v: m.v }; },
        draw(g, w, h, t, b) {
          const peck = b.v < 0.3 ? Math.max(0, Math.sin(t * 7)) * 3 : 0;
          L(g, '#d56', 1.2, [8, 12, 7, 16]); L(g, '#d56', 1.2, [11, 12, 12, 16]);
          E(g, '#8a8f9e', 8, 9, 7, 4.5); P(g, '#6c7080', [0, 7, 4, 9, 0, 11]);
          E(g, '#5a8a80', 12, 6 + peck * 0.5, 3.5, 3); E(g, '#8a8f9e', 14, 3 + peck, 3, 3); P(g, '#555', [16.5, 3 + peck, 19, 4 + peck, 16.5, 5 + peck]);
          eye(g, 15, 2.5 + peck, 0.9);
        } },
      { id: 'bus', name: 'Bus', z: 4, box(t) { return { x: WW + 40 - wrap(t, 0, WW + 240, 34, 300), y: 208, w: 140, h: 56, f: -1 }; },
        draw(g, w, h) {
          R(g, '#2a62c9', 2, 6, 136, 42); R(g, '#fff', 2, 30, 136, 6); R(g, '#1c4798', 2, 2, 136, 6);
          for (let x = 10; x < 110; x += 20) R(g, '#bfe0ff', x, 12, 16, 14);
          R(g, '#bfe0ff', 116, 12, 20, 22); R(g, '#1c4798', 112, 12, 3, 34);
          T(g, '#fff', 'bold 7px Arial', 'CITY BUS', 50, 41);
          R(g, '#ffe9a0', 134, 38, 4, 5); R(g, '#e33', 2, 38, 3, 5);
          E(g, '#222', 30, 49, 8, 8); E(g, '#222', 110, 49, 8, 8); E(g, '#aaa', 30, 49, 3, 3); E(g, '#aaa', 110, 49, 3, 3);
        } },
      { id: 'taxi', name: 'Taxi', z: 5, box(t) { return { x: wrap(t, -120, WW + 120, 65, 100), y: 256, w: 72, h: 30, f: 1 }; },
        draw(g, w, h) {
          P(g, '#f4c20d', [2, 12, 18, 12, 26, 2, 50, 2, 60, 12, 70, 14, 70, 24, 2, 24]);
          P(g, '#bfe0ff', [22, 11, 28, 4, 36, 4, 36, 11]); P(g, '#bfe0ff', [40, 11, 40, 4, 48, 4, 55, 11]);
          for (let i = 0; i < 8; i++) R(g, i % 2 ? '#fff' : '#111', 6 + i * 7, 16, 7, 3);
          R(g, '#fff', 30, -3, 16, 5); T(g, '#111', 'bold 5px Arial', 'TAXI', 38, -0.5);
          R(g, '#ffe9a0', 66, 14, 4, 4); R(g, '#e33', 2, 14, 3, 4);
          E(g, '#222', 16, 25, 6, 6); E(g, '#222', 56, 25, 6, 6); E(g, '#aaa', 16, 25, 2, 2); E(g, '#aaa', 56, 25, 2, 2);
        } }
    ]
  });

  place({
    id: 'park', name: 'Maple Park', start: [360, 150],
    bg(g, t) {
      sky(g, '#58a8e8', '#d8f0ff', 195); clouds(g, t, [30, 55, 40]);
      E(g, '#6fb84e', 550, 200, 700, 40); R(g, '#5caa3e', -50, 192, WW + 100, 120);
      E(g, '#d9c48e', 600, 286, 700, 16);
      E(g, '#4d8f34', 372, 247, 100, 24); E(g, '#3d86d0', 372, 247, 94, 20); E(g, '#6fb0ee', 350, 243, 40, 6);
      g.fillStyle = '#6b4423'; g.fillRect(150, 90, 20, 150); E(g, '#2f7d32', 160, 80, 60, 48); E(g, '#3d9a40', 140, 64, 30, 24); E(g, '#3d9a40', 188, 72, 28, 22);
      tree(g, 20, 225, 1.4); tree(g, 1060, 222, 1.5); tree(g, 560, 196, 0.9);
      R(g, '#8a5a2a', 960, 244, 50, 5); R(g, '#8a5a2a', 960, 234, 50, 4); R(g, '#444', 964, 249, 3, 10); R(g, '#444', 1003, 249, 3, 10);
      for (let i = 0; i < 30; i++) { const x = (i * 97) % WW, y = 260 + (i * 53) % 40; E(g, ['#ff6', '#f8a', '#fff'][i % 3], x, y, 2, 2); }
    },
    subs: [
      { id: 'kite', name: 'Kite', z: 1, box(t) { return { x: 660 + Math.sin(t * 0.7) * 30, y: 26 + Math.sin(t * 1.3) * 10, w: 36, h: 46, f: 1 }; },
        draw(g, w, h, t) {
          g.strokeStyle = '#fff'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(18, 22); g.quadraticCurveTo(60, 120, 40 - Math.sin(t * 0.7) * 30, 224 - Math.sin(t * 1.3) * 10); g.stroke();
          g.save(); g.translate(18, 18); g.rotate(Math.sin(t * 2.2) * 0.15);
          P(g, '#e0453a', [0, -18, 14, 0, 0, 0]); P(g, '#f4d03f', [0, -18, -14, 0, 0, 0]); P(g, '#2a62c9', [-14, 0, 0, 22, 0, 0]); P(g, '#3aaa3a', [14, 0, 0, 22, 0, 0]);
          L(g, '#333', 0.8, [0, -18, 0, 22]); L(g, '#333', 0.8, [-14, 0, 14, 0]);
          g.restore();
          for (let i = 0; i < 5; i++) E(g, ['#e0453a', '#f4d03f'][i % 2], 18 + Math.sin(t * 3 + i) * 3, 42 + i * 4, 2, 1.4);
        } },
      { id: 'fountain', name: 'Fountain', z: 2, box() { return { x: 860, y: 156, w: 76, h: 84, f: 1 }; },
        draw(g, w, h, t) {
          E(g, '#9aa0a8', 38, 76, 38, 9); R(g, '#9aa0a8', 0, 66, 76, 10); E(g, '#b8bec6', 38, 66, 38, 8); E(g, '#6fb0ee', 38, 66, 33, 5.5);
          R(g, '#9aa0a8', 34, 30, 8, 36); E(g, '#b8bec6', 38, 30, 16, 4); E(g, '#6fb0ee', 38, 30, 13, 2.5);
          g.globalAlpha = 0.85;
          for (let i = 0; i < 14; i++) { const k = (t * 0.9 + i / 14) % 1, s = i % 2 ? 1 : -1, sx = 38 + s * k * 26, sy = 22 - Math.sin(k * Math.PI) * 18 + k * 40; E(g, '#cfe8ff', sx, sy, 2, 2); }
          for (let i = 0; i < 6; i++) { const k = (t * 1.2 + i / 6) % 1; E(g, '#e6f4ff', 38 + (i % 2 ? 1 : -1) * k * 6, 20 - Math.sin(k * Math.PI) * 18, 1.6, 2.4); }
          g.globalAlpha = 1;
        } },
      { id: 'squirrel', name: 'Squirrel', z: 3, box(t) { const m = ease(t, 110, 200, 0.4, 0.5); return { x: 150, y: m.x, w: 20, h: 24, f: 1, v: m.v, up: m.f < 0 }; },
        draw(g, w, h, t, b) {
          g.save(); if (!b.up) { g.translate(0, 24); g.scale(1, -1); }
          const c = '#a0582a';
          E(g, '#b86a34', 3, 12 + Math.sin(t * 5) * 1.5, 5, 10, 0.2);
          E(g, c, 10, 12, 5, 8); E(g, c, 10, 4, 4, 4); E(g, c, 7, 1, 1.5, 2); E(g, c, 13, 1, 1.5, 2);
          L(g, c, 2, [14, 8, 17, 6 + Math.sin(t * 10) * b.v * 2]); L(g, c, 2, [14, 16, 17, 18 - Math.sin(t * 10) * b.v * 2]);
          g.restore();
          eye(g, 12, b.up ? 3 : 21, 1);
        } },
      { id: 'duck', name: 'Duck', z: 4, box(t) { const m = ease(t, 300, 420, 0.25, 2.2); return { x: m.x, y: 228 + Math.sin(t * 2) * 1, w: 28, h: 22, f: m.f, v: m.v }; },
        draw(g, w, h, t) {
          E(g, '#f2f2e8', 12, 15, 12, 6); P(g, '#f2f2e8', [0, 14, 2, 8, 6, 12]); E(g, '#d8d8cc', 10, 13, 7, 3.5);
          E(g, '#2a7a3a', 21, 6, 5, 5); P(g, '#f59a1c', [25, 6, 30, 8, 25, 9]); R(g, '#fff', 17, 10, 7, 1.5);
          eye(g, 22, 4.5, 1);
          g.globalAlpha = 0.6; L(g, '#cfe8ff', 1, [-2 + Math.sin(t * 3) * 2, 21, 8, 21]); g.globalAlpha = 1;
        } },
      { id: 'dog', name: 'Dog', z: 5, box(t) { const m = ease(t, 520, 800, 0.35, 0.4); return { x: m.x, y: 228 - Math.abs(Math.sin(t * 9)) * 3 * m.v, w: 42, h: 30, f: m.f, v: m.v }; },
        draw(g, w, h, t, b) {
          const c = '#b0753a', v = b.v;
          L(g, c, 3, [6, 10, 0, 4 + Math.sin(t * 14) * 3]);
          [9, 14, 26, 31].forEach((x, i) => L(g, '#8a5a2a', 4, [x, 16, x + Math.sin(t * 12 + (i % 2) * Math.PI) * 4 * v, 29]));
          E(g, c, 20, 14, 15, 7.5); E(g, '#f0e0c0', 21, 17, 9, 4);
          R(g, '#d33', 31, 8, 4, 3);
          E(g, c, 35, 6, 7, 6); E(g, c, 41, 8, 4, 3); E(g, '#222', 44, 7, 1.6, 1.4);
          E(g, '#6a3f1a', 32, 6, 3, 6, 0.3);
          eye(g, 37, 4, 1.3);
        } }
    ]
  });

  place({
    id: 'farm', name: 'Green Acres Farm', start: [260, 150],
    bg(g, t) {
      sky(g, '#62b0ea', '#e2f4ff', 190); E(g, '#ffe24a', 1000, 36, 15, 15); clouds(g, t, [40, 70]);
      E(g, '#7fc25a', 300, 196, 420, 50); E(g, '#6bb34a', 850, 198, 400, 45);
      R(g, '#9a7040', -50, 186, WW + 100, 22); for (let y = 190; y < 208; y += 5) R(g, '#7d5a30', -50, y, WW + 100, 2);
      R(g, '#63ad44', -50, 206, WW + 100, 110);
      E(g, '#6a4a2a', 500, 250, 90, 14); E(g, '#7d5a36', 480, 246, 40, 5);
      for (let x = 0; x < WW; x += 36) R(g, '#f4f0e0', x, 212, 4, 26); R(g, '#f4f0e0', 0, 216, WW, 3); R(g, '#f4f0e0', 0, 228, WW, 3);
      tree(g, 60, 206, 1.2); tree(g, 780, 206, 1.1);
      R(g, '#aaa', 1050, 110, 26, 120); E(g, '#aaa', 1063, 110, 13, 8);
    },
    subs: [
      { id: 'tractor', name: 'Tractor', z: 1, box(t) { return { x: wrap(t, -140, WW + 140, 14, 500), y: 140, w: 90, h: 60, f: 1 }; },
        draw(g, w, h, t) {
          R(g, '#2f9a3a', 14, 26, 56, 20); R(g, '#2f9a3a', 40, 8, 28, 22); R(g, '#bfe0ff', 44, 12, 20, 12);
          R(g, '#444', 70, 18, 3, 12);
          for (let i = 0; i < 3; i++) { const k = (t * 1.5 + i / 3) % 1; g.globalAlpha = 0.5 * (1 - k); E(g, '#666', 72 - k * 10, 14 - k * 22, 3 + k * 5, 3 + k * 4); } g.globalAlpha = 1;
          E(g, '#222', 30, 44, 16, 16); E(g, '#f4c20d', 30, 44, 7, 7);
          E(g, '#222', 76, 50, 10, 10); E(g, '#f4c20d', 76, 50, 4, 4);
        } },
      { id: 'barn', name: 'Barn', z: 2, box() { return { x: 880, y: 100, w: 150, h: 130, f: 1 }; },
        draw(g, w, h) {
          P(g, '#b8322a', [0, 52, 30, 12, 120, 12, 150, 52, 150, 130, 0, 130]);
          P(g, '#6a6a70', [-6, 54, 28, 6, 122, 6, 156, 54, 150, 58, 120, 18, 30, 18, 0, 58]);
          R(g, '#fff', 50, 70, 50, 60); R(g, '#b8322a', 54, 74, 42, 56);
          L(g, '#fff', 3, [54, 74, 96, 130]); L(g, '#fff', 3, [96, 74, 54, 130]); R(g, '#fff', 74, 70, 2, 60);
          R(g, '#fff', 62, 30, 26, 22); R(g, '#3a2a1a', 65, 33, 20, 16); E(g, '#e8c860', 75, 45, 9, 4);
          R(g, '#fff', 14, 70, 20, 18); R(g, '#bfe0ff', 16, 72, 16, 14); R(g, '#fff', 116, 70, 20, 18); R(g, '#bfe0ff', 118, 72, 16, 14);
        } },
      { id: 'cow', name: 'Cow', z: 3, box(t) { const m = ease(t, 120, 330, 0.09, 0.8); return { x: m.x, y: 190, w: 82, h: 52, f: m.f, v: m.v }; },
        draw(g, w, h, t, b) {
          const graze = b.v < 0.35 ? 8 : 0;
          legs(g, '#eee', [16, 24, 52, 60], 30, 20, 6, t * 0.6, b.v); [16, 24, 52, 60].forEach(x => R(g, '#333', x, 48, 6, 3));
          L(g, '#eee', 2, [8, 18, 3, 36 + Math.sin(t * 2) * 3]); E(g, '#333', 3, 37 + Math.sin(t * 2) * 3, 2, 3);
          E(g, '#f8f8f4', 38, 22, 30, 15);
          E(g, '#222', 30, 16, 8, 6); E(g, '#222', 48, 28, 7, 5); E(g, '#222', 20, 26, 5, 4);
          E(g, '#f8b8c8', 54, 34, 5, 3);
          const hy = 14 + graze; E(g, '#f8f8f4', 70, hy, 10, 10); E(g, '#f0a0b0', 75, hy + 7, 6, 4);
          L(g, '#d8c070', 2, [64, hy - 7, 60, hy - 13]); L(g, '#d8c070', 2, [72, hy - 8, 74, hy - 14]);
          E(g, '#222', 62, hy - 4, 5, 2.5, 0.4); R(g, '#d8a020', 66, hy + 10, 5, 5);
          eye(g, 72, hy - 2, 1.5);
        } },
      { id: 'pig', name: 'Pig', z: 4, box(t) { const m = ease(t, 440, 530, 0.3, 1.9); return { x: m.x, y: 222, w: 52, h: 32, f: m.f, v: m.v }; },
        draw(g, w, h, t, b) {
          const c = '#f4a8b8';
          legs(g, '#e890a4', [12, 18, 32, 38], 20, 11, 5, t, b.v);
          g.strokeStyle = c; g.lineWidth = 1.8; g.beginPath(); g.arc(4, 12, 3, 0, Math.PI * 1.6); g.stroke();
          E(g, c, 24, 16, 18, 10); E(g, '#7a5a3a', 18, 22, 8, 3);
          E(g, c, 42, 12, 9, 8); E(g, '#e88aa0', 50, 14, 4, 3.5); E(g, '#b05a70', 49, 13, 0.8, 1); E(g, '#b05a70', 51, 13, 0.8, 1);
          P(g, '#e890a4', [38, 5, 40, -1, 44, 5]);
          eye(g, 45, 9, 1.2);
        } },
      { id: 'chicken', name: 'Chicken', z: 5, box(t) { const m = ease(t, 600, 740, 0.35, 2.7); return { x: m.x, y: 236 - Math.abs(Math.sin(t * 8)) * 2 * m.v, w: 20, h: 22, f: m.f, v: m.v }; },
        draw(g, w, h, t, b) {
          const peck = b.v < 0.3 ? Math.max(0, Math.sin(t * 8)) * 4 : 0;
          L(g, '#f2a01e', 1.4, [8, 16, 7, 22]); L(g, '#f2a01e', 1.4, [12, 16, 13, 22]);
          E(g, '#fbfbf2', 9, 12, 8, 6); P(g, '#fbfbf2', [1, 12, 0, 3, 5, 9]);
          E(g, '#fbfbf2', 15, 6 + peck, 4, 4); P(g, '#d8322a', [13, 2 + peck, 15, -1 + peck, 17, 2 + peck]); E(g, '#d8322a', 18, 9 + peck, 1.2, 2);
          P(g, '#f2a01e', [19, 5 + peck, 22, 6.5 + peck, 19, 7.5 + peck]);
          eye(g, 16, 5 + peck, 1);
        } }
    ]
  });

  place({
    id: 'space', name: 'Space Museum', dark: true, start: [300, 150],
    bg(g, t) {
      R(g, '#141a33', -50, -50, WW + 100, 290);
      for (let i = 0; i < 120; i++) { const x = (i * 131) % WW, y = (i * 71) % 200 + 4; const tw = 0.5 + 0.5 * Math.sin(t * 2 + i); R(g, `rgba(255,255,255,${0.35 + 0.5 * tw})`, x, y, 1.5, 1.5); }
      E(g, '#c9a060', 1020, 60, 26, 26); E(g, '#b08040', 1012, 54, 6, 4);
      R(g, '#2a2f48', 0, 230, WW, 4);
      for (let x = 0; x < WW; x += 40) for (let y = 234; y < 310; y += 20) R(g, ((x + y) / 20) % 2 ? '#3a3a50' : '#4a4a62', x, y, 40, 20);
      [120, 400, 600, 830].forEach(x => { g.globalAlpha = 0.12; P(g, '#fff7c0', [x + 30, -10, x + 50, -10, x + 100, 240, x - 20, 240]); g.globalAlpha = 1; });
      R(g, '#bbb', 560, 250, 3, 22); R(g, '#bbb', 740, 250, 3, 22); L(g, '#b8322a', 2.5, [562, 252, 650, 262, 742, 252]);
      R(g, '#1d2f5e', 440, 20, 180, 22); T(g, '#ffe98a', 'bold 11px Arial', 'HALL OF SPACE', 530, 31.5);
      // pedestals
      R(g, '#dcdcdc', 410, 240, 64, 12); R(g, '#bdbdbd', 598, 220, 64, 32); R(g, '#d8d8d8', 594, 214, 72, 8);
    },
    subs: [
      { id: 'rocket', name: 'Rocket', z: 1, box() { return { x: 150, y: 10, w: 72, h: 232, f: 1 }; },
        draw(g, w, h) {
          P(g, '#f4f4f4', [36, 0, 48, 24, 50, 60, 22, 60, 24, 24]); R(g, '#f4f4f4', 22, 60, 28, 150);
          R(g, '#222', 22, 90, 14, 20); R(g, '#222', 36, 110, 14, 20); R(g, '#222', 22, 150, 14, 12);
          R(g, '#b8322a', 22, 70, 28, 4); T(g, '#1d2f5e', 'bold 7px Arial', 'H-1', 36, 140);
          P(g, '#b8322a', [22, 170, 4, 214, 22, 206]); P(g, '#b8322a', [50, 170, 68, 214, 50, 206]); R(g, '#8a1f1a', 34, 180, 4, 32);
          P(g, '#555', [26, 210, 46, 210, 50, 226, 22, 226]); R(g, '#777', 10, 226, 52, 6);
          E(g, '#9cc4ea', 36, 46, 5, 5); E(g, '#555', 36, 46, 5, 5); E(g, '#9cc4ea', 36, 46, 3.5, 3.5);
        } },
      { id: 'astronaut', name: 'Astronaut suit', z: 2, box() { return { x: 420, y: 148, w: 44, h: 92, f: 1 }; },
        draw(g, w, h, t) {
          R(g, '#cfcfcf', 6, 22, 32, 36);
          R(g, '#f2f2f2', 8, 22, 28, 40); R(g, '#f2f2f2', 10, 60, 10, 30); R(g, '#f2f2f2', 24, 60, 10, 30); R(g, '#bbb', 9, 84, 12, 6); R(g, '#bbb', 23, 84, 12, 6);
          L(g, '#f2f2f2', 7, [9, 26, 3, 52]); L(g, '#f2f2f2', 7, [35, 26, 41, 52]); E(g, '#bbb', 3, 55, 4, 4); E(g, '#bbb', 41, 55, 4, 4);
          R(g, '#2a62c9', 14, 30, 6, 4); R(g, '#b8322a', 24, 30, 6, 4); R(g, '#ccc', 16, 40, 12, 8); R(g, '#e33', 18, 42, 3, 3); R(g, '#3c3', 23, 42, 3, 3);
          E(g, '#f2f2f2', 22, 13, 13, 13); E(g, '#c89a2a', 22, 14, 9, 8); E(g, '#e8c050', 20, 12, 5, 4);
          const gl = (t * 0.6) % 3; if (gl < 1) E(g, '#fff', 16 + gl * 10, 10 + gl * 4, 2, 2);
        } },
      { id: 'moonrock', name: 'Moon rock', z: 3, box() { return { x: 610, y: 176, w: 40, h: 38, f: 1 }; },
        draw(g, w, h, t) {
          g.globalAlpha = 0.25; R(g, '#cfe8ff', 0, 0, 40, 38); g.globalAlpha = 1;
          g.strokeStyle = '#dfefff'; g.lineWidth = 1; g.strokeRect(0.5, 0.5, 39, 37);
          P(g, '#8a8a8a', [8, 36, 6, 28, 12, 20, 22, 18, 32, 22, 34, 30, 32, 36]);
          E(g, '#6a6a6a', 16, 27, 3, 2); E(g, '#6a6a6a', 26, 24, 2, 1.5); E(g, '#a8a8a8', 20, 22, 4, 1.5);
          const s = (t % 2.5) / 2.5; if (s < 0.3) { g.globalAlpha = 1 - s / 0.3; L(g, '#fff', 1, [31, 5, 31, 13]); L(g, '#fff', 1, [27, 9, 35, 9]); g.globalAlpha = 1; }
        } },
      { id: 'planets', name: 'Planet model', z: 4, box() { return { x: 790, y: 60, w: 120, h: 110, f: 1 }; },
        draw(g, w, h, t) {
          L(g, '#888', 1, [60, -80, 60, 48]);
          g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 1;
          [[22, 8], [36, 13], [50, 18], [60, 24]].forEach(([rx, ry]) => { g.beginPath(); g.ellipse(60, 58, rx, ry, 0, 0, TAU); g.stroke(); });
          E(g, '#ffcc33', 60, 58, 11, 11); E(g, '#ffe98a', 57, 55, 5, 5);
          [[22, 8, 1.6, '#c0a080', 3], [36, 13, 1.0, '#3a7ae0', 5], [50, 18, 0.7, '#d0602a', 4], [60, 24, 0.4, '#d8b070', 8]].forEach(([rx, ry, sp, c, r], i) => {
            const a = t * sp + i * 1.7, x = 60 + Math.cos(a) * rx, y = 58 + Math.sin(a) * ry;
            L(g, '#888', 0.8, [60, 58, x, y]); E(g, c, x, y, r, r); if (i === 3) { g.strokeStyle = '#e8d8a8'; g.lineWidth = 1.2; g.beginPath(); g.ellipse(x, y, r + 5, 2, -0.3, 0, TAU); g.stroke(); }
          });
        } }
    ]
  });

  const PLACE = Object.fromEntries(PLACES.map(p => [p.id, p]));
  const SUBNAME = {}; PLACES.forEach(p => p.subs.forEach(s => { SUBNAME[s.id] = s.name; p.sorted = p.subs.slice().sort((a, b) => a.z - b.z); }));
  const nice = ids => ids.length ? ids.map(i => SUBNAME[i] || i).join(', ') : 'nothing in particular';
  const stars = q => { const n = clamp(Math.round(q * 5), 1, 5); return '★'.repeat(n) + '☆'.repeat(5 - n); };

  /* ---------- judging a picture ----------
     boxes: full subject boxes in picture pixels. A subject counts when most of it (60%) is in the
     picture, or when it fills at least half the picture (a skyscraper up close). */
  function judge(boxes, FW, FH, focus, expo) {
    const fa = FW * FH, half = Math.hypot(FW, FH) / 2, got = [];
    boxes.forEach(b => {
      const x0 = Math.max(0, b.x), y0 = Math.max(0, b.y), x1 = Math.min(FW, b.x + b.w), y1 = Math.min(FH, b.y + b.h);
      if (x1 <= x0 || y1 <= y0) return;
      const va = (x1 - x0) * (y1 - y0), frac = va / (b.w * b.h), fill = va / fa;
      if (frac < 0.6 && fill < 0.5) return;
      // centered? (1 = dead center) and big enough? (fills 8% of the picture or more; not cropped too tight)
      const cs = clamp(1 - Math.hypot((x0 + x1) / 2 - FW / 2, (y0 + y1) / 2 - FH / 2) / half * 1.6, 0, 1);
      const ss = (fill < 0.08 ? fill / 0.08 : fill > 0.9 ? 0.7 : 1) * Math.min(1, frac / 0.85 + 0.1);
      got.push({ id: b.id, score: cs * Math.sqrt(ss) });
    });
    got.sort((a, b) => b.score - a.score);
    const quality = Math.round(clamp(got.length ? (0.4 * focus + 0.6 * got[0].score) * expo : 0.25 * focus * expo, 0, 1) * 100) / 100;
    return { subjects: got.map(g => g.id), quality };
  }

  const ICON = '<svg viewBox="0 0 32 32" shape-rendering="crispEdges" aria-hidden="true"><rect x="3" y="9" width="26" height="17" fill="#c8ccd4" stroke="#000"/><rect x="7" y="6" width="7" height="3" fill="#8a8e96" stroke="#000"/><rect x="22" y="7" width="5" height="2" fill="#e33" stroke="#000"/><rect x="5" y="11" width="5" height="3" fill="#fff" stroke="#000"/><circle cx="18" cy="17" r="6" fill="#333" stroke="#000"/><circle cx="18" cy="17" r="3.5" fill="#3a5ea8"/><rect x="16" y="15" width="2" height="2" fill="#fff"/><rect x="4" y="23" width="24" height="2" fill="#9aa0aa"/></svg>';
  const IC = {
    flash: '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M9 1 3 9h4l-1 6 6-8H8z" fill="#f4c20d" stroke="#000" stroke-width="1"/></svg>',
    zin: '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" shape-rendering="crispEdges"><circle cx="6.5" cy="6.5" r="4.5" fill="#fff" stroke="#000"/><path d="M10 10l4 4" stroke="#000" stroke-width="2"/><path d="M4 6.5h5M6.5 4v5" stroke="#000"/></svg>',
    zout: '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" shape-rendering="crispEdges"><circle cx="6.5" cy="6.5" r="4.5" fill="#fff" stroke="#000"/><path d="M10 10l4 4" stroke="#000" stroke-width="2"/><path d="M4 6.5h5" stroke="#000"/></svg>',
    cam: '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" shape-rendering="crispEdges"><rect x="1" y="4" width="14" height="9" fill="#c8ccd4" stroke="#000"/><rect x="3" y="2" width="4" height="2" fill="#888"/><circle cx="9" cy="8.5" r="3" fill="#335" stroke="#000"/></svg>',
    pics: '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" shape-rendering="crispEdges"><rect x="1" y="3" width="14" height="11" fill="#fff" stroke="#000"/><rect x="2" y="4" width="12" height="6" fill="#8cf"/><path d="M2 10l4-4 3 3 2-2 3 3z" fill="#393"/><circle cx="11" cy="6" r="1.5" fill="#fd3"/></svg>',
    get: '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" shape-rendering="crispEdges"><rect x="1" y="2" width="7" height="5" fill="#c8ccd4" stroke="#000"/><rect x="8" y="9" width="7" height="5" fill="#fff" stroke="#000"/><path d="M5 7v4h3" fill="none" stroke="#000"/><path d="M7 9l2 2-2 2" fill="none" stroke="#000"/></svg>',
    show: '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" shape-rendering="crispEdges"><rect x="1" y="2" width="14" height="10" fill="#333" stroke="#000"/><path d="M6 5v4l4-2z" fill="#fff"/><path d="M8 12v3M5 15h6" stroke="#000"/></svg>'
  };

  (window.RETRO_APPS = window.RETRO_APPS || []).push({
    id: 'photo',
    label: 'Photo Studio',
    help: 'Take pretend pictures at the zoo, beach, city, park, farm and space museum with a brand-new digital camera, then touch them up and keep them in your album (it never uses a real camera or webcam).',
    kind: 'builtin',
    eras: ['2000'],
    cat: 'acc',
    icon: ICON,
    window: { w: 720, h: 540 },
    css: `
      .pho{display:flex;flex-direction:column;height:100%;min-height:300px;box-sizing:border-box;padding:3px;gap:3px;user-select:none;-webkit-user-select:none;position:relative}
      .pho button{font:inherit}
      .pho [hidden]{display:none!important}
      .pho .pho-b{min-width:0;padding:3px 8px;display:inline-flex;align-items:center;justify-content:center;gap:5px;white-space:nowrap}
      .pho .pho-b svg{flex:none}
      .pho .pho-b.on{border-style:inset;background:#e8e6de;padding:4px 7px 2px 9px}
      .pho-tabs{display:flex;gap:4px;flex:none;align-items:center;padding:2px 3px;background:linear-gradient(180deg,#f4f3ee,#d4d0c8);border:1px solid #fff;border-right-color:#808080;border-bottom-color:#808080}
      .pho-tabs .pho-b{height:28px}
      .pho-job{flex:1;min-width:0;font-size:11px;color:#0a246a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:right}
      .pho-pane{flex:1;min-height:0;display:flex;gap:6px}
      .pho-pane[hidden]{display:none}
      .pho-cam{align-items:stretch}
      .pho-body{flex:1;min-width:0;min-height:0;display:flex;flex-direction:column;gap:4px;padding:8px 10px 10px;border-radius:14px;background:linear-gradient(180deg,#eceef2 0%,#c3c7cf 55%,#a9adb6 100%);border:1px solid #6f737c;box-shadow:inset 1px 1px 0 #fff,inset -1px -1px 0 #8a8e96}
      .pho-brand{display:flex;align-items:center;justify-content:space-between;gap:6px;font:bold 11px Arial,sans-serif;color:#2a2e36;flex:none}
      .pho-brand b{font:italic 900 13px Arial,sans-serif;letter-spacing:1px;color:#1d2f5e}
      .pho-brand span{font-size:9px;background:#1d2f5e;color:#fff;padding:1px 5px;border-radius:2px}
      .pho-led{width:8px;height:8px;border-radius:50%;background:#3a3f3a;border:1px solid #444;display:inline-block;vertical-align:middle;margin-left:4px}
      .pho-led.on{background:#ff4030;box-shadow:0 0 5px #f40}
      .pho-lw{flex:1;min-height:0;display:flex;align-items:center;justify-content:center;background:#1b1d22;border-radius:6px;padding:6px;box-shadow:inset 2px 2px 4px #000}
      .pho-lcdbox{position:relative;line-height:0}
      .pho-lcd{display:block;width:100%;height:100%;touch-action:none;cursor:grab;background:#000;image-rendering:auto}
      .pho-lcd.grab{cursor:grabbing}
      .pho-lcdbox::after{content:"";position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,rgba(0,0,0,.13) 0 1px,transparent 1px 3px)}
      .pho-hint{flex:none;font-size:10px;color:#333;text-align:center}
      .pho-ctl{flex:none;width:170px;display:flex;flex-direction:column;gap:6px;min-height:0;overflow:auto}
      .pho-cap{background:linear-gradient(90deg,#0a246a,#a6caf0);color:#fff;font-weight:700;padding:2px 5px;font-size:11px}
      .pho-ctl select{font:inherit;width:100%;height:28px}
      .pho-row{display:flex;gap:4px}
      .pho-row>*{flex:1}
      .pho-ctl .pho-b{height:34px}
      .pho-shut{height:auto!important;aspect-ratio:1;max-width:96px;align-self:center;width:96px;border-radius:50%!important;background:radial-gradient(circle at 38% 32%,#ff9a8a,#d8322a 45%,#8a1410)!important;color:#fff;font-weight:700;border:3px solid #6a6e76!important;box-shadow:0 0 0 3px #d4d6dc,0 3px 6px rgba(0,0,0,.4)!important;touch-action:none;text-shadow:0 1px 1px #000}
      .pho-shut:active,.pho-shut.down{transform:translateY(2px);box-shadow:0 0 0 3px #d4d6dc,0 1px 2px rgba(0,0,0,.4)!important}
      .pho-stat{font-size:11px;line-height:1.5;padding:3px 5px;background:#fff}
      .pho-pc{flex-direction:column;gap:4px}
      .pho-tb{display:flex;flex-wrap:wrap;gap:4px;flex:none}
      .pho-tb .pho-b{height:30px}
      .pho-files{flex:1;min-height:0;overflow:auto;background:#fff;padding:4px 6px}
      .pho-sec{font-weight:700;margin:4px 0;padding-bottom:2px;border-bottom:1px solid #0a246a;color:#0a246a;display:flex;justify-content:space-between;gap:8px}
      .pho-sec small{font-weight:400;color:#555}
      .pho-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:6px;margin-bottom:8px}
      .pho-th{display:flex;flex-direction:column;align-items:center;gap:2px;padding:3px;border:1px dotted transparent;background:none;cursor:pointer;min-width:0;color:#000}
      .pho-th img{width:96px;height:72px;object-fit:contain;background:#222;border:1px solid #888;display:block}
      .pho-th span{font-size:11px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .pho-th.sel{background:#0a246a;color:#fff;border-color:#ff0}
      .pho-empty{color:#555;font-size:12px;padding:8px 2px 12px;line-height:1.5}
      .pho-ov{position:absolute;inset:0;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;z-index:5;padding:6px;box-sizing:border-box}
      .pho-ov[hidden]{display:none}
      .pho-dlg{background:#d4d0c8;max-width:480px;width:100%;max-height:100%;display:flex;flex-direction:column;box-sizing:border-box}
      .pho-dt{background:linear-gradient(90deg,#0a246a,#a6caf0);color:#fff;font-weight:700;padding:3px 6px;flex:none;display:flex;justify-content:space-between}
      .pho-dc{padding:8px;overflow:auto;display:flex;flex-direction:column;gap:6px;min-height:0}
      .pho-dc>*{flex:none}
      .pho-db{display:flex;justify-content:flex-end;gap:6px;flex-wrap:wrap;padding:0 8px 8px}
      .pho-db .pho-b{min-width:80px;height:30px}
      .pho-cable{display:flex;align-items:center;justify-content:center;gap:0;padding:4px 0}
      .pho-radio{display:flex;flex-direction:column;gap:4px}
      .pho-radio label{display:flex;gap:6px;align-items:center}
      .pho-prog{height:18px;background:#fff;padding:2px;display:flex;gap:2px;overflow:hidden}
      .pho-prog i{width:9px;flex:none;background:#0a246a}
      .pho-pv{display:flex;align-items:center;justify-content:center;background:#555;min-height:150px;padding:4px}
      .pho-pv canvas{max-width:100%;touch-action:none;display:block;background:#000}
      .pho-pv.crop canvas{cursor:crosshair}
      .pho-tools{display:flex;flex-wrap:wrap;gap:4px}
      .pho-tools .pho-b{height:30px}
      .pho-br{display:flex;align-items:center;gap:6px}
      .pho-br input{flex:1;min-width:0}
      .pho-dc input[type=text]{font:inherit;padding:3px;box-sizing:border-box;width:100%}
      .pho-info{font-size:11px;color:#333;line-height:1.45}
      .pho-ss{position:absolute;inset:0;background:#000;z-index:6;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:8px;box-sizing:border-box}
      .pho-ss[hidden]{display:none}
      .pho-ss img{flex:none;box-sizing:border-box;image-rendering:auto;transition:opacity .5s;border:6px solid #fff;box-shadow:0 0 0 1px #888;background:#fff}
      .pho-ss p{color:#fff;margin:0;font:italic 15px "Comic Sans MS","Chalkboard SE",cursive;text-align:center;min-height:20px}
      .pho-ss .pho-row{flex:none}
      .pho-ss .pho-b{height:34px;min-width:60px}
      .pho-helpc{line-height:1.45}
      .pho-helpc p{margin:0 0 6px}
      .pho.narrow .pho-cam{flex-direction:column}
      .pho.narrow .pho-body{flex:none;padding:6px;border-radius:10px}
      .pho.narrow .pho-lw{flex:none}
      .pho.narrow .pho-ctl{width:auto;flex:1;display:grid;grid-template-columns:1fr 1fr 1fr 96px;grid-auto-rows:min-content;gap:5px;align-content:start;overflow:visible}
      .pho.narrow .pho-ctl .pho-cap{display:none}
      .pho.narrow .pho-ctl select{grid-column:1/4;height:40px}
      .pho.narrow .pho-ctl .pho-b{height:44px;padding:2px 4px}
      .pho.narrow .pho-ctl .pho-row{display:contents}
      .pho.narrow .pho-shut{grid-column:4;grid-row:1/4;width:88px;height:88px!important;align-self:center}
      .pho.narrow .pho-stat{grid-column:1/5;grid-row:4}
      .pho.narrow .pho-get{grid-column:2/4;grid-row:3}
      .pho.narrow .pho-bat{grid-column:1/5;grid-row:5}
      .pho.narrow .pho-lbl{display:none}
      .pho.narrow .pho-tb .pho-b,.pho.narrow .pho-tabs .pho-b{height:40px}
      .pho.narrow .pho-grid{grid-template-columns:repeat(auto-fill,minmax(96px,1fr))}
      .pho.narrow .pho-th img{width:88px;height:66px}
    `,
    open(W, api) {
      const $ = s => W.body.querySelector(s);
      const say = t => { try { api.say && api.say(t); } catch (e) {} };
      let closed = false, raf = 0, ro = null;
      const timers = new Set();
      const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); if (!closed) fn(); }, ms); timers.add(id); return id; };
      const wait = ms => new Promise(res => later(res, ms));

      /* ---------- saved state ---------- */
      let card = api.load('card', []), inbox = api.load('inbox', []), album = api.load('album', []);
      if (!Array.isArray(card)) card = []; if (!Array.isArray(inbox)) inbox = []; if (!Array.isArray(album)) album = [];
      let flash = api.load('flash', false), battery = api.load('battery', 100), fileNo = api.load('fileNo', 0), cable = api.load('cable', 'serial');
      let placeId = api.load('place', 'zoo'); if (!PLACE[placeId]) placeId = 'zoo';
      function persist(key, val) {
        api.save(key, val);
        const back = api.load(key, null);
        if (JSON.stringify(back).length !== JSON.stringify(val).length) {
          api.msgBox('Photo Studio', 'The hard disk is full, so that could not be saved.\n\nDelete some pictures from your album and try again.', ['OK'], 'warn');
          return false;
        }
        return true;
      }

      /* ---------- camera state ---------- */
      let pl = PLACE[placeId], cx = pl.start[0], cy = pl.start[1], zoom = 1;
      let af = { st: 'none', t0: 0, lx: 0, ly: 0, lz: 1 };
      let flashUntil = 0, busy = false, frozen = null, writing = false, review = null, lcdMsg = null, zoomShown = 0, mode = 'cam';
      const now = () => performance.now() / 1000;
      const vw = () => 400 / zoom, vh = () => 300 / zoom;
      function clampView() { cx = clamp(cx, vw() / 2, WW - vw() / 2); cy = clamp(cy, vh() / 2, WH - vh() / 2); }

      W.body.innerHTML = `<div class="pho">
        <div class="pho-tabs">
          <button class="btn pho-b" data-a="cam">${IC.cam}<span>Camera</span></button>
          <button class="btn pho-b" data-a="pc">${IC.pics}<span>My Pictures</span></button>
          <span class="pho-job"></span>
        </div>
        <div class="pho-pane pho-cam">
          <div class="pho-body">
            <div class="pho-brand"><b>HORIZON</b><span>SnapShot 1300 &middot; 1.3 MEGAPIXEL</span><i class="pho-led" title="Memory card light"></i></div>
            <div class="pho-lw"><div class="pho-lcdbox"><canvas class="pho-lcd" width="${LW}" height="${LH}" aria-label="Camera viewfinder. Drag or use arrow keys to aim."></canvas></div></div>
            <div class="pho-hint">${window.matchMedia && matchMedia('(pointer: coarse)').matches ? 'Drag to aim &middot; pinch or W / T to zoom' : 'Drag to aim &middot; W / T or mouse wheel to zoom &middot; Space to snap'}</div>
          </div>
          <div class="pho-ctl">
            <div class="pho-cap">Go to</div>
            <select class="pho-place" aria-label="Place">${PLACES.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}</select>
            <div class="pho-cap">Zoom</div>
            <div class="pho-row"><button class="btn pho-b" data-a="zout" title="Zoom out (Wide)">${IC.zout}<span>W</span></button><button class="btn pho-b" data-a="zin" title="Zoom in (Telephoto)">${IC.zin}<span>T</span></button></div>
            <div class="pho-row"><button class="btn pho-b pho-fl" data-a="flash" title="Flash on/off">${IC.flash}<span class="pho-fls">Flash</span></button><button class="btn pho-b" data-a="focus" title="Focus (half-press)">Focus</button></div>
            <button class="btn pho-b pho-shut" data-a="shoot" aria-label="Take picture">SNAP</button>
            <div class="pho-stat sunken" role="status"></div>
            <button class="btn pho-b pho-bat" data-a="bat" hidden>Fresh batteries</button>
            <button class="btn pho-b pho-get" data-a="get">${IC.get}<span>To computer</span></button>
          </div>
        </div>
        <div class="pho-pane pho-pc" hidden>
          <div class="pho-tb">
            <button class="btn pho-b" data-a="get">${IC.get}<span>Get Pictures</span></button>
            <button class="btn pho-b" data-a="edit">Edit</button>
            <button class="btn pho-b" data-a="del">Delete</button>
            <button class="btn pho-b" data-a="show">${IC.show}<span>Slideshow</span></button>
          </div>
          <div class="pho-files sunken"></div>
        </div>
        <div class="pho-ov" hidden></div>
        <div class="pho-ss" hidden><img alt=""><p></p><div class="pho-row"><button class="btn pho-b" data-s="prev">&lt; Back</button><button class="btn pho-b" data-s="pause">Pause</button><button class="btn pho-b" data-s="next">Next &gt;</button><button class="btn pho-b" data-s="stop">Close</button></div></div>
      </div>`;
      const root = $('.pho'), lcd = $('.pho-lcd'), lg = lcd.getContext('2d'), led = $('.pho-led'), stat = $('.pho-stat'), ov = $('.pho-ov');
      $('.pho-place').value = placeId;

      /* ---------- rendering ---------- */
      const buf = document.createElement('canvas'), bg = buf.getContext('2d');
      function focusAmt(t) {
        if (af.st === 'hunting') return 0.4 + 0.4 * Math.abs(Math.sin((t - af.t0) * 12));
        if (af.st === 'locked') {
          const dev = Math.hypot(cx - af.lx, cy - af.ly) / vw() + Math.abs(zoom - af.lz) / af.lz;
          if (dev > 0.35) { af.st = 'none'; return 0.62; }
          return clamp(1 - Math.max(0, dev - 0.08) * 2, 0.5, 1);
        }
        return 0.62;
      }
      // Draw the current view into g (size w x h). Returns the scale used (for eye positions).
      function renderView(g, w, h, t, o = {}) {
        const sharpK = 0.3 + 0.7 * o.focus, digK = zoom > ZOPT ? ZOPT / zoom : 1, k = Math.min(1, sharpK, digK);
        let tg = g, tw = w, th = h;
        if (k < 0.98) { tw = Math.max(8, Math.round(w * k)); th = Math.max(6, Math.round(h * k)); buf.width = tw; buf.height = th; tg = bg; }
        const sx = tw / vw(), sy = th / vh(), x0 = cx - vw() / 2, y0 = cy - vh() / 2;
        tg.save(); tg.setTransform(sx, 0, 0, sy, -x0 * sx, -y0 * sy);
        pl.bg(tg, t);
        const boxes = [];
        REDEYE = !!o.flash; EYES = o.eyes ? [] : null;
        let fgDone = !pl.fg;
        for (const s of pl.sorted) {
          if (!fgDone && s.z >= 5) { pl.fg(tg, t); fgDone = true; }
          const b = s.box(t);
          if (b.x + b.w < x0 - 60 || b.x > x0 + vw() + 60) { if (o.boxes) boxes.push({ id: s.id, x: (b.x - x0) * sx, y: (b.y - y0) * sy, w: b.w * sx, h: b.h * sy }); continue; }
          tg.save(); tg.translate(b.x + (b.f < 0 ? b.w : 0), b.y); if (b.f < 0) tg.scale(-1, 1);
          s.draw(tg, b.w, b.h, t, b); tg.restore();
          if (o.boxes) boxes.push({ id: s.id, x: (b.x - x0) * sx, y: (b.y - y0) * sy, w: b.w * sx, h: b.h * sy });
        }
        if (!fgDone) pl.fg(tg, t);
        const eyes = EYES; REDEYE = false; EYES = null;
        tg.restore();
        if (pl.dark) {
          if (o.flash) { const gr = tg.createRadialGradient(tw / 2, th / 2, tw * 0.2, tw / 2, th / 2, tw * 0.75); gr.addColorStop(0, 'rgba(255,255,255,.08)'); gr.addColorStop(1, 'rgba(0,0,20,.45)'); tg.fillStyle = gr; tg.fillRect(0, 0, tw, th); }
          else { tg.fillStyle = 'rgba(4,4,22,.62)'; tg.fillRect(0, 0, tw, th); }
        }
        if (tg !== g) { g.save(); g.imageSmoothingEnabled = sharpK < digK; g.drawImage(buf, 0, 0, w, h); g.restore(); }
        const f = w / tw;
        return { boxes: boxes.map(b => ({ id: b.id, x: b.x * f, y: b.y * f, w: b.w * f, h: b.h * f })), eyes: (eyes || []).map(e => [e[0] * f, e[1] * f, e[2] * f]) };
      }
      function drawOverlay(g, t) {
        g.save();
        const blink = Math.floor(t * 2.5) % 2 === 0;
        g.font = 'bold 10px "Courier New",monospace'; g.textBaseline = 'top';
        const txt = (s, x, y, al = 'left', c = '#fff') => { g.textAlign = al; g.fillStyle = 'rgba(0,0,0,.6)'; g.fillText(s, x + 1, y + 1); g.fillStyle = c; g.fillText(s, x, y); };
        // flash icon
        g.fillStyle = flash ? '#ffd400' : '#999'; g.beginPath(); g.moveTo(14, 6); g.lineTo(8, 15); g.lineTo(12, 15); g.lineTo(10, 22); g.lineTo(17, 12); g.lineTo(13, 12); g.lineTo(15, 6); g.fill(); g.strokeStyle = '#000'; g.lineWidth = 1; g.stroke();
        if (!flash) { g.strokeStyle = '#f33'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(6, 21); g.lineTo(19, 7); g.stroke(); }
        // battery
        if (battery > 15 || blink) {
          g.strokeStyle = battery > 15 ? '#fff' : '#f33'; g.lineWidth = 1; g.strokeRect(LW - 30.5, 8.5, 20, 10); g.fillStyle = g.strokeStyle; g.fillRect(LW - 10, 11, 2, 5);
          const bars = Math.ceil(battery / 34); for (let i = 0; i < bars; i++) g.fillRect(LW - 28 + i * 6, 11, 4, 6);
        }
        txt('1280x960 FINE', LW - 6, LH - 16, 'right');
        txt(String(CARD_MAX - card.length), LW - 6, LH - 28, 'right', card.length >= CARD_MAX ? '#f55' : '#fff');
        txt(pl.name.toUpperCase(), 6, LH - 16);
        // zoom bar
        if (t < zoomShown) {
          const x0 = 90, x1 = 230, y = 12; g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(x0 - 16, y - 5, x1 - x0 + 32, 14);
          txt('W', x0 - 12, y - 3); txt('T', x1 + 5, y - 3);
          g.fillStyle = '#fff'; g.fillRect(x0, y + 1, x1 - x0, 2); g.fillStyle = '#f80'; g.fillRect(x0 + (x1 - x0) * (ZOPT - 1) / (ZMAX - 1), y, x1 - x0 - (x1 - x0) * (ZOPT - 1) / (ZMAX - 1), 4);
          const zx = x0 + (x1 - x0) * (zoom - 1) / (ZMAX - 1); g.fillStyle = '#ff0'; g.fillRect(zx - 2, y - 3, 4, 10);
          txt(zoom > ZOPT ? 'DIGITAL ' + zoom.toFixed(1) + 'x' : zoom.toFixed(1) + 'x', LW / 2, y + 10, 'center', zoom > ZOPT ? '#f80' : '#fff');
        }
        // AF brackets
        const c = af.st === 'locked' ? '#3f3' : af.st === 'hunting' ? (blink ? '#ff0' : '#fff') : 'rgba(255,255,255,.8)';
        g.strokeStyle = c; g.lineWidth = 2; const bx = LW / 2, by = LH / 2, s = 22, a = 7;
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([dx, dy]) => { g.beginPath(); g.moveTo(bx + dx * s, by + dy * (s - a)); g.lineTo(bx + dx * s, by + dy * s); g.lineTo(bx + dx * (s - a), by + dy * s); g.stroke(); });
        if (pl.dark && !flash && blink) txt('LOW LIGHT! USE FLASH', LW / 2, 28, 'center', '#ff0');
        if (af.st === 'locked') txt('AF OK', LW / 2, by + s + 4, 'center', '#3f3');
        if (lcdMsg && t < lcdMsg.until) { g.fillStyle = 'rgba(0,0,0,.7)'; g.fillRect(20, LH / 2 - 14, LW - 40, 28); g.font = 'bold 12px "Courier New",monospace'; txt(lcdMsg.text, LW / 2, LH / 2 - 6, 'center', '#ff5'); }
        g.restore();
      }
      function drawLcd() {
        const t = now();
        if (battery <= 0 && !busy) {
          lg.fillStyle = '#000'; lg.fillRect(0, 0, LW, LH);
          lg.font = 'bold 13px "Courier New",monospace'; lg.textAlign = 'center'; lg.fillStyle = Math.floor(t * 2) % 2 ? '#f33' : '#800';
          lg.fillText('BATTERY EXHAUSTED', LW / 2, LH / 2 - 8); lg.font = '10px "Courier New",monospace'; lg.fillStyle = '#aaa'; lg.fillText('Put in fresh AA batteries', LW / 2, LH / 2 + 12);
          return;
        }
        if (t < flashUntil) { lg.fillStyle = '#fff'; lg.fillRect(0, 0, LW, LH); return; }
        if (frozen) {
          lg.drawImage(frozen, 0, 0, LW, LH);
          if (writing) {
            lg.fillStyle = 'rgba(0,0,0,.55)'; lg.fillRect(0, LH - 26, LW, 26); lg.font = 'bold 11px "Courier New",monospace'; lg.textAlign = 'center'; lg.textBaseline = 'middle';
            lg.fillStyle = '#fff'; lg.fillText('WRITING TO CARD' + '.'.repeat(1 + Math.floor(t * 4) % 3), LW / 2, LH - 13);
          } else if (review) {
            lg.fillStyle = 'rgba(0,0,0,.6)'; lg.fillRect(0, LH - 34, LW, 34); lg.textAlign = 'center'; lg.textBaseline = 'middle';
            lg.font = 'bold 11px Arial'; lg.fillStyle = '#fff'; lg.fillText(review.rec.subjects.length ? 'Got: ' + nice(review.rec.subjects) : 'Got: scenery', LW / 2, LH - 24, LW - 10);
            lg.font = '12px Arial'; lg.fillStyle = '#ffd400'; lg.fillText(stars(review.rec.quality) + (review.rec.focus < 0.75 ? '  blurry' : ''), LW / 2, LH - 9);
          }
          return;
        }
        renderView(lg, LW, LH, t, { focus: focusAmt(t) });
        drawOverlay(lg, t);
      }
      function loop() {
        raf = requestAnimationFrame(loop);
        if (closed || W.minimized || mode !== 'cam' || document.hidden) return;
        if (review && now() > review.until && !busy) { review = null; frozen = null; }
        led.classList.toggle('on', writing && Math.floor(now() * 8) % 2 === 0);
        drawLcd();
      }

      /* ---------- status + menus ---------- */
      function photoJob() { try { return (api.jobs ? api.jobs() : []).find(j => j.app === 'photo' && !j.done); } catch (e) { return null; } }
      function updStatus() {
        const lvl = battery > 66 ? 'Full' : battery > 33 ? 'Half' : battery > 15 ? 'Low' : battery > 0 ? 'Very low!' : 'Empty';
        stat.innerHTML = `Pictures: <b>${card.length}</b> of ${CARD_MAX}<br>Batteries: <b>${lvl}</b><br>Flash: <b>${flash ? 'On' : 'Off'}</b>`;
        $('.pho-fl').classList.toggle('on', flash); $('.pho-fl').setAttribute('aria-pressed', String(flash));
        $('.pho-bat').hidden = battery > 15;
        const j = photoJob(); $('.pho-job').textContent = j ? 'Job: ' + (j.instructions || j.title) : '';
        $('.pho-job').title = $('.pho-job').textContent;
        $$('.pho-tabs .pho-b').forEach(b => b.classList.toggle('on', b.dataset.a === mode));
      }
      const $$ = s => [...W.body.querySelectorAll(s)];
      api.menubar([
        { label: 'File', items: () => [
          { label: 'Take Pictures', fn: () => setMode('cam') },
          { label: 'Album (My Pictures)', fn: () => setMode('pc') },
          { label: 'Get Pictures from Camera...', fn: getPictures },
          { label: 'Slideshow', fn: () => slideshow(0) },
          '-',
          { label: 'Exit', fn: () => api.close() }
        ] },
        { label: 'Camera', items: () => [
          { label: flash ? 'Flash: On (turn off)' : 'Flash: Off (turn on)', fn: toggleFlash },
          { label: 'Zoom In (T)', fn: () => zoomBy(1.25), disabled: zoom >= ZMAX },
          { label: 'Zoom Out (W)', fn: () => zoomBy(0.8), disabled: zoom <= ZMIN },
          { label: 'Focus (half-press)', fn: () => { setMode('cam'); doFocus(); } },
          '-',
          ...PLACES.map(p => ({ label: 'Go to ' + p.name, fn: () => { setMode('cam'); goPlace(p.id); } })),
          '-',
          { label: 'Put in Fresh Batteries', fn: freshBatteries },
          { label: 'Erase Memory Card...', fn: eraseCard, disabled: !card.length }
        ] },
        { label: 'Help', items: [{ label: 'How to Use Photo Studio', fn: showHelp }, { label: 'About Photo Studio', fn: () => api.msgBox('About Photo Studio', 'Photo Studio 1.0 for Horizon 2000\nwith the Horizon SnapShot 1300 digital camera\n1.3 megapixels, 3x optical zoom, 4 MB memory card (16 pictures).\n\nThis is a pretend camera: it never uses a real camera or webcam.') }] }
      ]);
      function showHelp() {
        dialog('How to Use Photo Studio', `<div class="pho-helpc">
          <p><b>Taking pictures.</b> Pick a place in <b>Go to</b>. Drag the little screen (or use the arrow keys) to aim the camera. Zoom with <b>W</b> and <b>T</b>, the mouse wheel, pinching, or the + and - keys. Past 3x the camera uses <b>digital zoom</b>, which looks blocky.</p>
          <p>Press <b>SNAP</b> (or Space). The camera focuses first (the brackets turn green), then takes the picture and writes it to the memory card. Press <b>Focus</b> (or F) to focus early. Moving a lot after focusing makes the picture blurry.</p>
          <p>Good pictures are sharp, with the animal or thing <b>in the middle</b> and <b>big enough</b>. The camera shows stars after each shot. Indoors, turn on the <b>flash</b> (or L). The flash can give animals red eyes!</p>
          <p><b>Getting pictures onto the computer.</b> The card holds 16 pictures. Press <b>To computer</b> or <b>Get Pictures</b> to copy them over the cable. Then in <b>My Pictures</b> pick one and press <b>Edit</b> to crop, rotate, brighten, fix red-eye and add a caption, then <b>Save to Album</b> (up to 30 pictures).</p>
          <p><b>Batteries</b> run down fast, like real cameras in 2000. Put in fresh ones from the Camera menu.</p>
          <p>This is a pretend camera. It never turns on a real camera or webcam, so no real pictures of you are ever taken.</p></div>`, [['OK', close => close()]]);
      }

      /* ---------- camera actions ---------- */
      function setMode(m) {
        mode = m; $('.pho-cam').hidden = m !== 'cam'; $('.pho-pc').hidden = m !== 'pc';
        if (m === 'pc') renderFiles(); layout(); updStatus();
      }
      function goPlace(id) {
        if (!PLACE[id] || busy) { $('.pho-place').value = placeId; return; }
        placeId = id; pl = PLACE[id]; api.save('place', id); $('.pho-place').value = id;
        cx = pl.start[0]; cy = pl.start[1]; zoom = 1; clampView(); af.st = 'none'; review = null; frozen = null;
        api.sfx.click(); lcdMsg = { text: pl.name.toUpperCase(), until: now() + 1.2 };
      }
      function zoomBy(f, fx, fy) {
        if (battery <= 0) return;
        const oz = zoom; zoom = clamp(Math.round(zoom * f * 100) / 100, ZMIN, ZMAX);
        if (Math.abs(zoom - 1) < 0.03) zoom = 1;
        if (zoom === oz) return;
        if (fx != null) { const wx = cx + (fx - 0.5) * 400 / oz, wy = cy + (fy - 0.5) * 300 / oz; cx = wx - (fx - 0.5) * vw(); cy = wy - (fy - 0.5) * vh(); }
        clampView(); zoomShown = now() + 1.5; clearReview();
        api.tone(zoom > oz ? 520 : 420, 0.05, { type: 'triangle', vol: 0.03 });
      }
      function pan(dx, dy) { cx += dx; cy += dy; clampView(); clearReview(); }
      function clearReview() { if (review && !busy) { review = null; frozen = null; } }
      function toggleFlash() { flash = !flash; api.save('flash', flash); api.sfx.click(); if (flash) api.tone(900, 0.5, { to: 3800, vol: 0.02, type: 'sine' }); updStatus(); }
      function freshBatteries() {
        battery = 100; api.save('battery', battery); updStatus(); api.sfx.click();
        api.msgBox('Fresh Batteries', 'You put 4 fresh AA batteries in the camera.\n\n(Digital cameras in 2000 gobbled batteries. Lots of families bought rechargeable ones!)');
      }
      async function eraseCard() {
        if (!card.length) return;
        const r = await api.msgBox('Erase Memory Card', `Erase all ${card.length} picture${card.length > 1 ? 's' : ''} on the memory card? Pictures you already copied to the computer are safe.`, ['Erase', 'Cancel'], 'warn');
        if (r !== 'Erase') return; card = []; persist('card', card); updStatus();
      }
      function doFocus() {
        if (battery <= 0) return Promise.resolve();
        if (af.st === 'locked' && focusAmt(now()) > 0.95) return Promise.resolve();
        if (af.st === 'hunting') return af.p;
        af.st = 'hunting'; af.t0 = now(); clearReview();
        af.p = new Promise(res => later(() => {
          af.st = 'locked'; af.lx = cx; af.ly = cy; af.lz = zoom;
          api.tone(2600, 0.04, { vol: 0.04 }); api.tone(2600, 0.04, { vol: 0.04, at: 0.08 }); res();
        }, 380 + Math.random() * 250));
        return af.p;
      }
      function beep(text) { lcdMsg = { text, until: now() + 2 }; api.sfx.beep(); }
      function shutterSound() {
        api.noise(0.03, { ft: 'highpass', f: 3000, vol: 0.12, decay: 1 });
        api.noise(0.05, { ft: 'bandpass', f: 1400, q: 2, vol: 0.12, decay: 1, at: 0.07 });
        api.tone(1900, 0.03, { type: 'square', vol: 0.02, at: 0.02 });
      }
      async function shoot() {
        if (busy || closed) return;
        if (mode !== 'cam') setMode('cam');
        if (battery <= 0) { api.sfx.beep(); return; }
        if (card.length >= CARD_MAX) { beep('CARD FULL - DOWNLOAD PICTURES'); return; }
        busy = true; review = null; frozen = null; $('.pho-shut').classList.add('down');
        try {
          if (af.st !== 'locked') { await doFocus(); if (closed) return; }
          await wait(120); if (closed) return;
          const t = now(), fo = focusAmt(t), useFlash = flash;
          const cv = document.createElement('canvas'); cv.width = LW; cv.height = LH;
          const cg = cv.getContext('2d');
          const r = renderView(cg, LW, LH, t, { focus: fo, flash: useFlash, eyes: useFlash, boxes: true });
          const expo = (pl.dark && !useFlash ? 0.45 : 1) * (zoom > ZOPT ? 0.9 : 1);
          const res = judge(r.boxes, LW, LH, fo, expo);
          const out = document.createElement('canvas'); out.width = IW; out.height = IH; const og = out.getContext('2d');
          og.drawImage(cv, 0, 0, IW, IH);
          const sc = IW / LW;
          fileNo++; api.save('fileNo', fileNo);
          const rec = {
            id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: 'DSC' + String(fileNo).padStart(4, '0') + '.JPG',
            scene: pl.id, subjects: res.subjects, quality: res.quality, focus: Math.round(fo * 100) / 100, expo, flash: useFlash, w: IW, h: IH, cap: '',
            boxes: r.boxes.map(b => ({ id: b.id, x: Math.round(b.x * sc), y: Math.round(b.y * sc), w: Math.round(b.w * sc), h: Math.round(b.h * sc) })),
            eyes: r.eyes.filter(e => e[0] >= 0 && e[1] >= 0 && e[0] < LW && e[1] < LH).map(e => [Math.round(e[0] * sc * 10) / 10, Math.round(e[1] * sc * 10) / 10, Math.round(e[2] * sc * 10) / 10]),
            img: out.toDataURL('image/jpeg', 0.72)
          };
          shutterSound();
          if (useFlash) flashUntil = now() + 0.09;
          frozen = cv; writing = true;
          api.task('photo-take', { scene: rec.scene, subjects: rec.subjects.slice(), quality: rec.quality });
          card.push(rec); persist('card', card);
          battery = Math.max(0, battery - (useFlash ? 6 : 3)); api.save('battery', battery);
          af.st = 'none'; updStatus();
          await wait(useFlash ? 1500 : 1000); if (closed) return;
          if (useFlash) api.tone(700, 0.7, { to: 3600, vol: 0.02, type: 'sine' });
          writing = false; review = { rec, until: now() + 1.6 };
          if (battery > 0 && battery <= 15) later(() => { lcdMsg = { text: 'BATTERY LOW', until: now() + 1.5 }; }, 1600);
        } finally { busy = false; const sb = $('.pho-shut'); sb && sb.classList.remove('down'); }
      }

      /* ---------- LCD input: drag to pan, wheel / pinch to zoom ---------- */
      const ptrs = new Map(); let pinch0 = null;
      lcd.addEventListener('pointerdown', e => { lcd.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); lcd.classList.add('grab'); if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = { d: Math.hypot(a.x - b.x, a.y - b.y), z: zoom }; } });
      lcd.addEventListener('pointermove', e => {
        const p = ptrs.get(e.pointerId); if (!p) return;
        const r = lcd.getBoundingClientRect();
        if (ptrs.size === 1) { pan(-(e.clientX - p.x) * vw() / r.width, -(e.clientY - p.y) * vh() / r.height); }
        p.x = e.clientX; p.y = e.clientY;
        if (ptrs.size === 2 && pinch0) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch0.d > 10) { const want = clamp(pinch0.z * d / pinch0.d, ZMIN, ZMAX); zoomBy(want / zoom); } }
      });
      const up = e => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch0 = null; if (!ptrs.size) lcd.classList.remove('grab'); };
      lcd.addEventListener('pointerup', up); lcd.addEventListener('pointercancel', up);
      lcd.addEventListener('wheel', e => { e.preventDefault(); const r = lcd.getBoundingClientRect(); zoomBy(e.deltaY < 0 ? 1.15 : 1 / 1.15, (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height); }, { passive: false });

      const shutBtn = $('.pho-shut');
      shutBtn.addEventListener('pointerdown', () => { if (!busy) doFocus(); });
      root.addEventListener('click', e => {
        const b = e.target.closest('[data-a]'); if (!b) return;
        const a = b.dataset.a;
        if (a === 'cam' || a === 'pc') { api.sfx.click(); setMode(a); }
        else if (a === 'zin') zoomBy(1.25); else if (a === 'zout') zoomBy(0.8);
        else if (a === 'flash') toggleFlash(); else if (a === 'focus') doFocus();
        else if (a === 'shoot') shoot(); else if (a === 'bat') freshBatteries();
        else if (a === 'get') getPictures();
        else if (a === 'edit') { if (sel) openEditor(sel.list, sel.i); else api.msgBox('Photo Studio', 'Click a picture first, then press Edit.'); }
        else if (a === 'del') delSelected();
        else if (a === 'show') slideshow(0);
      });
      $('.pho-place').addEventListener('change', e => goPlace(e.target.value));

      /* ---------- layout ---------- */
      function layout() {
        if (closed) return;
        const w = W.body.clientWidth;
        root.classList.toggle('narrow', w < 560);
        if (mode !== 'cam') return;
        const box = $('.pho-lcdbox'), lw = $('.pho-lw');
        const narrow = w < 560;
        let aw = lw.clientWidth - 12, ah = narrow ? Infinity : lw.clientHeight - 12;
        if (narrow) { const maxH = Math.max(150, W.body.clientHeight - 290); ah = maxH; }
        let bw = Math.min(aw, ah * 4 / 3); bw = Math.max(120, Math.floor(bw)); const bh = Math.floor(bw * 3 / 4);
        box.style.width = bw + 'px'; box.style.height = bh + 'px';
      }
      if (window.ResizeObserver) { ro = new ResizeObserver(() => layout()); ro.observe(W.body); }
      W.onResize = layout;

      /* ---------- My Pictures ---------- */
      let sel = null;
      const listOf = n => n === 'inbox' ? inbox : album;
      function thumbs(list, name) {
        return `<div class="pho-grid">${list.map((p, i) => `<button class="pho-th${sel && sel.list === name && sel.i === i ? ' sel' : ''}" data-l="${name}" data-i="${i}" title="${api.esc(p.cap || p.name)}"><img src="${p.img}" alt="${api.esc(nice(p.subjects))}"><span>${api.esc(p.cap || p.name)}</span></button>`).join('')}</div>`;
      }
      function renderFiles() {
        if (sel && !listOf(sel.list)[sel.i]) sel = null;
        const f = $('.pho-files');
        f.innerHTML = `<div class="pho-sec">New pictures from the camera <small>${inbox.length} of ${INBOX_MAX}</small></div>
          ${inbox.length ? thumbs(inbox, 'inbox') : `<div class="pho-empty">No new pictures. Take some with the camera, then press <b>Get Pictures</b> to copy them from the memory card.${card.length ? `<br><b>The camera has ${card.length} picture${card.length > 1 ? 's' : ''} waiting.</b>` : ''}</div>`}
          <div class="pho-sec">My Album <small>${album.length} of ${ALBUM_MAX}</small></div>
          ${album.length ? thumbs(album, 'album') : '<div class="pho-empty">Your album is empty. Pick a new picture, press <b>Edit</b>, then <b>Save to Album</b>.</div>'}`;
        updStatus();
      }
      $('.pho-files').addEventListener('click', e => {
        const b = e.target.closest('.pho-th'); if (!b) return;
        const s = { list: b.dataset.l, i: +b.dataset.i };
        if (sel && sel.list === s.list && sel.i === s.i && e.detail !== 2) { openEditor(s.list, s.i); return; }
        sel = s; api.sfx.click(); $$('.pho-th').forEach(x => x.classList.toggle('sel', x === b));
      });
      $('.pho-files').addEventListener('dblclick', e => { const b = e.target.closest('.pho-th'); if (b) openEditor(b.dataset.l, +b.dataset.i); });
      async function delSelected() {
        if (!sel) { api.msgBox('Photo Studio', 'Click a picture first, then press Delete.'); return; }
        const list = listOf(sel.list), p = list[sel.i]; if (!p) return;
        const r = await api.msgBox('Delete Picture', `Delete ${p.cap ? '"' + p.cap + '"' : p.name}? This can't be undone.`, ['Delete', 'Cancel'], 'warn');
        if (r !== 'Delete') return;
        list.splice(sel.i, 1); persist(sel.list, list); sel = null; api.sfx.click(); renderFiles();
      }

      /* ---------- dialogs ---------- */
      function dialog(title, html, buttons, onKey) {
        ov.hidden = false;
        ov.innerHTML = `<div class="pho-dlg raised" role="dialog" aria-label="${api.esc(title)}"><div class="pho-dt"><span>${api.esc(title)}</span></div><div class="pho-dc">${html}</div><div class="pho-db">${buttons.map((b, i) => `<button class="btn pho-b" data-d="${i}">${b[0]}</button>`).join('')}</div></div>`;
        const close = () => { ov.hidden = true; ov.innerHTML = ''; dlgKey = null; };
        ov.querySelectorAll('[data-d]').forEach(b => b.onclick = () => buttons[+b.dataset.d][1](close, b));
        dlgKey = onKey || (e => { if (e.key === 'Escape') close(); });
        return { el: ov.querySelector('.pho-dlg'), close };
      }
      let dlgKey = null;

      /* ---------- download over the cable ---------- */
      let xfer = null;
      function getPictures() {
        if (busy || xfer) return;
        if (!card.length) { api.msgBox('Get Pictures', 'The camera\'s memory card is empty.\n\nTake some pictures first!'); return; }
        const room = INBOX_MAX - inbox.length;
        if (room <= 0) { api.msgBox('Get Pictures', 'Your "New pictures" folder is full.\n\nSave some to your album or delete some first.', ['OK'], 'warn'); setMode('pc'); return; }
        const n = Math.min(room, card.length);
        const d = dialog('Get Pictures from Camera', `
          <div class="pho-cable"><svg width="220" height="60" viewBox="0 0 220 60" aria-hidden="true" shape-rendering="crispEdges"><rect x="4" y="18" width="48" height="30" fill="#c8ccd4" stroke="#000"/><rect x="10" y="12" width="14" height="6" fill="#888" stroke="#000"/><circle cx="32" cy="33" r="10" fill="#333" stroke="#000"/><circle cx="32" cy="33" r="5" fill="#3a5ea8"/><path d="M52 40 C90 58 120 58 160 40" fill="none" stroke="#222" stroke-width="3"/><rect x="160" y="8" width="54" height="38" fill="#e8e4d8" stroke="#000"/><rect x="165" y="12" width="44" height="28" fill="#0a6a6a" stroke="#000"/><rect x="176" y="46" width="22" height="8" fill="#d4d0c8" stroke="#000"/><circle class="pho-blink" cx="106" cy="54" r="3" fill="#888"/></svg></div>
          <div>Plug the camera cable into your computer, then choose how it is connected:</div>
          <div class="pho-radio"><label><input type="radio" name="pho-cab" value="serial"${cable === 'serial' ? ' checked' : ''}> Serial cable (COM1, 115,200 bps). Slow but works everywhere.</label>
          <label><input type="radio" name="pho-cab" value="usb"${cable === 'usb' ? ' checked' : ''}> USB cable. Much faster, if your computer has a USB port.</label></div>
          <div class="pho-xs">Ready to copy ${n} picture${n > 1 ? 's' : ''}${n < card.length ? ` (the folder only has room for ${n})` : ''}.</div>
          <div class="pho-prog sunken" aria-hidden="true"></div>`,
          [['Copy Pictures', (close, b) => startXfer(d, n, b)], ['Cancel', close => { if (xfer) xfer.cancel = true; else close(); }]]);
      }
      async function startXfer(d, n, btn) {
        if (xfer) return;
        const rad = d.el.querySelector('input[name=pho-cab]:checked'); cable = rad ? rad.value : 'serial'; api.save('cable', cable);
        d.el.querySelectorAll('input').forEach(i => i.disabled = true); btn.disabled = true;
        xfer = { cancel: false };
        const xs = d.el.querySelector('.pho-xs'), prog = d.el.querySelector('.pho-prog'), blink = d.el.querySelector('.pho-blink');
        const per = cable === 'usb' ? 280 : 1100, steps = 10, total = n * steps;
        const copied = [];
        xs.textContent = 'Connecting to camera...'; api.sfx.seek(3); await wait(cable === 'usb' ? 500 : 1100);
        for (let i = 0; i < n && !closed && !xfer.cancel; i++) {
          const p = card[i];
          for (let s = 0; s < steps && !closed && !xfer.cancel; s++) {
            const done = i * steps + s + 1, left = Math.ceil((total - done) * per / steps / 1000);
            xs.textContent = `Copying ${p.name} (picture ${i + 1} of ${n}). About ${left} second${left === 1 ? '' : 's'} left.`;
            const w = prog.clientWidth - 4, cells = Math.floor(w / 11), on = Math.round(cells * done / total);
            if (prog.children.length !== on) prog.innerHTML = '<i></i>'.repeat(on);
            blink.setAttribute('fill', s % 2 ? '#3f3' : '#888');
            if (s === 0) api.sfx.seek(2);
            await wait(per / steps);
          }
          if (!xfer.cancel && !closed) copied.push(p);
        }
        if (closed) return;
        const cancelled = xfer.cancel; xfer = null;
        copied.forEach(p => inbox.push(p)); persist('inbox', inbox);
        d.close(); api.sfx.ding();
        if (!copied.length) { api.msgBox('Get Pictures', 'Copying was cancelled.'); return; }
        setMode('pc');
        const r = await api.msgBox('Get Pictures', `${copied.length} picture${copied.length > 1 ? 's were' : ' was'} copied to your computer${cancelled ? ' before you cancelled' : ''}.\n\nErase ${copied.length > 1 ? 'them' : 'it'} from the camera's memory card to make room for more?`, ['Erase', 'Keep'], 'info');
        if (r === 'Erase') { const ids = new Set(copied.map(p => p.id)); card = card.filter(p => !ids.has(p.id)); persist('card', card); }
        renderFiles();
      }

      /* ---------- editor ---------- */
      let ed = null;
      const loadImg = src => new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
      async function openEditor(listName, i) {
        const rec = listOf(listName)[i]; if (!rec) return;
        const img = await loadImg(rec.img); if (!img || closed) return;
        ed = { list: listName, i, rec, img, crop: null, rot: 0, bright: 0, redeye: false, cropping: false, drag: null };
        const q = rec.quality;
        const d = dialog('Edit Picture - ' + rec.name, `
          <div class="pho-pv sunken"><canvas></canvas></div>
          <div class="pho-tools">
            <button class="btn pho-b" data-e="crop">Crop</button>
            <button class="btn pho-b" data-e="rl" title="Rotate left">&#8634; Left</button>
            <button class="btn pho-b" data-e="rr" title="Rotate right">Right &#8635;</button>
            <button class="btn pho-b" data-e="eye">Fix Red-Eye</button>
            <button class="btn pho-b" data-e="reset">Undo All</button>
          </div>
          <label class="pho-br">Brightness <input type="range" min="-60" max="60" step="5" value="0" class="pho-bri" aria-label="Brightness"></label>
          <label>Caption <input type="text" maxlength="60" class="pho-capt" placeholder="Type a caption, like: Our trip to the zoo"></label>
          <div class="pho-info">In this picture: <b>${api.esc(nice(rec.subjects))}</b> at the ${api.esc((PLACE[rec.scene] || {}).name || rec.scene)}. Sharpness and framing: <span style="color:#a07000">${stars(q)}</span><br>Taken: 01/01/2000 12:00 AM (nobody set the camera's clock!)${rec.flash ? ' &middot; Flash' : ''}</div>
          <div class="pho-ehint pho-info"></div>`,
          [[ed.list === 'album' ? 'Save Changes' : 'Save to Album', () => saveEdit()], ['Cancel', close => { ed = null; close(); }]],
          e => { if (e.key === 'Escape') { ed = null; d.close(); } });
        const cv = d.el.querySelector('canvas');
        ed.cv = cv; ed.d = d;
        d.el.querySelector('.pho-capt').value = rec.cap || '';
        d.el.querySelector('.pho-bri').oninput = e => { ed.bright = +e.target.value; paintEdit(); };
        d.el.querySelector('.pho-tools').onclick = e => {
          const b = e.target.closest('[data-e]'); if (!b || !ed) return; const a = b.dataset.e; api.sfx.click();
          if (a === 'crop') { ed.cropping = !ed.cropping; }
          else if (a === 'rl') ed.rot = (ed.rot + 3) % 4; else if (a === 'rr') ed.rot = (ed.rot + 1) % 4;
          else if (a === 'eye') {
            if (!rec.eyes || !rec.eyes.length) { api.msgBox('Fix Red-Eye', rec.flash ? 'No red eyes found in this picture. Looking good!' : 'No red eyes here! Red-eye only happens when you use the flash.'); return; }
            if (ed.redeye) { api.msgBox('Fix Red-Eye', 'Already fixed! Every eye is back to normal.'); return; }
            ed.redeye = true; api.sfx.tada && api.sfx.tada();
            d.el.querySelector('.pho-ehint').textContent = `Fixed ${rec.eyes.length} red eye${rec.eyes.length > 1 ? 's' : ''}.`;
          } else if (a === 'reset') { ed.crop = null; ed.rot = 0; ed.bright = 0; ed.redeye = false; ed.cropping = false; d.el.querySelector('.pho-bri').value = 0; d.el.querySelector('.pho-ehint').textContent = ''; }
          paintEdit();
        };
        // crop by dragging
        cv.addEventListener('pointerdown', e => {
          if (!ed || !ed.cropping) return; cv.setPointerCapture(e.pointerId);
          const p = cvPt(e); ed.drag = { x0: p.x, y0: p.y }; ed.crop = null; paintEdit();
        });
        cv.addEventListener('pointermove', e => {
          if (!ed || !ed.drag) return; const p = cvPt(e), d0 = ed.drag;
          ed.crop = { x: Math.min(d0.x0, p.x), y: Math.min(d0.y0, p.y), w: Math.abs(p.x - d0.x0), h: Math.abs(p.y - d0.y0) }; paintEdit();
        });
        const endDrag = () => { if (!ed || !ed.drag) return; ed.drag = null; if (!ed.crop || ed.crop.w < 12 || ed.crop.h < 9) ed.crop = null; else { ed.cropping = false; api.sfx.click(); } paintEdit(); };
        cv.addEventListener('pointerup', endDrag); cv.addEventListener('pointercancel', endDrag);
        paintEdit();
      }
      function cvPt(e) { const r = ed.cv.getBoundingClientRect(); return { x: clamp((e.clientX - r.left) / r.width * ed.rec.w, 0, ed.rec.w), y: clamp((e.clientY - r.top) / r.height * ed.rec.h, 0, ed.rec.h) }; }
      function editBase(o) {
        const { rec, img } = o, c = document.createElement('canvas'); c.width = rec.w; c.height = rec.h; const g = c.getContext('2d');
        g.drawImage(img, 0, 0, rec.w, rec.h);
        if (o.redeye) (rec.eyes || []).forEach(([x, y, r]) => { E(g, '#1a0c0c', x, y, r * 1.35 + 0.6, r * 1.35 + 0.6); E(g, '#fff', x - r * 0.35, y - r * 0.4, Math.max(0.5, r * 0.35), Math.max(0.5, r * 0.35)); });
        if (o.bright) { const d = g.getImageData(0, 0, c.width, c.height), a = d.data, k = o.bright * 2.2; for (let i = 0; i < a.length; i += 4) { a[i] += k; a[i + 1] += k; a[i + 2] += k; } g.putImageData(d, 0, 0); }
        return c;
      }
      function editFinal(o) {
        const base = editBase(o), cr = o.crop || { x: 0, y: 0, w: o.rec.w, h: o.rec.h };
        const rw = o.rot % 2 ? cr.h : cr.w, rh = o.rot % 2 ? cr.w : cr.h;
        const s = Math.min(IW / rw, IH / rh), fw = Math.max(1, Math.round(rw * s)), fh = Math.max(1, Math.round(rh * s));
        const c = document.createElement('canvas'); c.width = fw; c.height = fh; const g = c.getContext('2d');
        g.imageSmoothingEnabled = s < 1.6;
        g.translate(fw / 2, fh / 2); g.rotate(o.rot * Math.PI / 2); g.scale(s, s);
        g.drawImage(base, cr.x, cr.y, cr.w, cr.h, -cr.w / 2, -cr.h / 2, cr.w, cr.h);
        // where does a point of the original land?
        const map = (x, y) => { let px = x - cr.x, py = y - cr.y; [px, py] = o.rot === 1 ? [cr.h - py, px] : o.rot === 2 ? [cr.w - px, cr.h - py] : o.rot === 3 ? [py, cr.w - px] : [px, py]; return [px * s, py * s]; };
        return { c, s, map, fw, fh };
      }
      function paintEdit() {
        if (!ed) return;
        const cv = ed.cv, pv = cv.parentNode; pv.classList.toggle('crop', ed.cropping);
        ed.d.el.querySelector('[data-e=crop]').classList.toggle('on', ed.cropping);
        const hint = ed.d.el.querySelector('.pho-ehint');
        if (ed.cropping) {
          const base = editBase(ed); cv.width = ed.rec.w; cv.height = ed.rec.h; const g = cv.getContext('2d'); g.drawImage(base, 0, 0);
          if (ed.crop) { g.fillStyle = 'rgba(0,0,0,.55)'; const c = ed.crop; g.fillRect(0, 0, cv.width, c.y); g.fillRect(0, c.y + c.h, cv.width, cv.height); g.fillRect(0, c.y, c.x, c.h); g.fillRect(c.x + c.w, c.y, cv.width, c.h); g.setLineDash([3, 2]); g.strokeStyle = '#fff'; g.strokeRect(c.x + 0.5, c.y + 0.5, c.w, c.h); }
          hint.textContent = 'Drag across the picture to choose the part to keep.';
        } else {
          const f = editFinal(ed); cv.width = f.fw; cv.height = f.fh; cv.getContext('2d').drawImage(f.c, 0, 0);
          if (hint.textContent.startsWith('Drag')) hint.textContent = '';
        }
        const maxW = Math.min(340, W.body.clientWidth - 40), maxH = Math.max(110, W.body.clientHeight - 330);
        const big = Math.min(2, maxW / Math.max(cv.width, 1), maxH / Math.max(cv.height, 1)); cv.style.width = Math.round(cv.width * big) + 'px'; cv.style.height = Math.round(cv.height * big) + 'px';
      }
      function saveEdit() {
        if (!ed) return;
        const o = ed, rec = o.rec, capt = o.d.el.querySelector('.pho-capt').value.trim().slice(0, 60);
        if (o.list === 'inbox' && album.length >= ALBUM_MAX) { api.msgBox('Save to Album', `Your album is full (${ALBUM_MAX} pictures). Delete a picture from the album first.`, ['OK'], 'warn'); return; }
        const f = editFinal(o);
        const boxes = (rec.boxes || []).map(b => { const [x0, y0] = f.map(b.x, b.y), [x1, y1] = f.map(b.x + b.w, b.y + b.h); return { id: b.id, x: Math.round(Math.min(x0, x1)), y: Math.round(Math.min(y0, y1)), w: Math.round(Math.abs(x1 - x0)), h: Math.round(Math.abs(y1 - y0)) }; });
        const eyes = o.redeye ? [] : (rec.eyes || []).map(([x, y, r]) => { const [a, b] = f.map(x, y); return [Math.round(a * 10) / 10, Math.round(b * 10) / 10, Math.round(r * f.s * 10) / 10]; }).filter(([x, y]) => x >= 0 && y >= 0 && x < f.fw && y < f.fh);
        const edited = o.crop || o.rot;
        const res = edited ? judge(boxes, f.fw, f.fh, rec.focus ?? 1, rec.expo ?? 1) : { subjects: rec.subjects, quality: rec.quality };
        const out = Object.assign({}, rec, {
          img: f.c.toDataURL('image/jpeg', 0.7), w: f.fw, h: f.fh, boxes, eyes, cap: capt,
          subjects: res.subjects, quality: res.quality
        });
        // Brightening a dark indoor picture (taken without the flash) rescues it a little.
        if (o.bright > 0 && (rec.expo ?? 1) < 1) out.quality = Math.round(clamp(out.quality * (1 + o.bright / 100), 0, 1) * 100) / 100;
        if (o.list === 'album') album[o.i] = out; else album.push(out);
        if (!persist('album', album)) { if (o.list === 'album') album[o.i] = rec; else album.pop(); return; }
        if (o.list === 'inbox') { inbox.splice(o.i, 1); persist('inbox', inbox); }
        api.task('photo-save', { scene: out.scene, subjects: out.subjects.slice(), quality: out.quality });
        api.sfx.ding(); ed = null; o.d.close();
        sel = { list: 'album', i: o.list === 'album' ? o.i : album.length - 1 };
        renderFiles();
      }

      /* ---------- slideshow ---------- */
      const ss = $('.pho-ss'), ssImg = ss.querySelector('img'), ssCap = ss.querySelector('p');
      let ssList = [], ssI = 0, ssT = 0, ssPaused = false;
      function slideshow(start) {
        ssList = album.length ? album : inbox;
        if (!ssList.length) { api.msgBox('Slideshow', 'There are no pictures to show yet. Take some pictures, copy them to the computer and save them to your album.'); return; }
        ssI = clamp(start || 0, 0, ssList.length - 1); ssPaused = false; ss.hidden = false; ss.querySelector('[data-s=pause]').textContent = 'Pause'; showSlide();
      }
      function showSlide() {
        clearTimeout(ssT); timers.delete(ssT);
        const p = ssList[ssI]; if (!p) return stopShow();
        ssImg.style.opacity = 0;
        later(() => { const aw = ss.clientWidth - 16, ah = ss.clientHeight - 110, k = Math.min(aw / (p.w || IW), ah / (p.h || IH), 2.5); ssImg.style.width = Math.max(40, Math.round((p.w || IW) * k)) + 'px'; ssImg.style.height = Math.max(30, Math.round((p.h || IH) * k)) + 'px'; ssImg.src = p.img; ssImg.alt = p.cap || nice(p.subjects); ssCap.textContent = p.cap || (PLACE[p.scene] ? PLACE[p.scene].name + ': ' + nice(p.subjects) : ''); ssImg.style.opacity = 1; }, 250);
        if (!ssPaused) ssT = later(() => { ssI = (ssI + 1) % ssList.length; showSlide(); }, 3500);
      }
      function stopShow() { clearTimeout(ssT); ss.hidden = true; }
      ss.addEventListener('click', e => {
        const b = e.target.closest('[data-s]'); if (!b) return; const a = b.dataset.s; api.sfx.click();
        if (a === 'stop') stopShow();
        else if (a === 'pause') { ssPaused = !ssPaused; b.textContent = ssPaused ? 'Play' : 'Pause'; showSlide(); }
        else { ssI = (ssI + (a === 'next' ? 1 : ssList.length - 1)) % ssList.length; showSlide(); }
      });

      /* ---------- keyboard ---------- */
      W.onKey = e => {
        if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) && e.key !== 'Escape') return;
        if (!ss.hidden) {
          if (e.key === 'Escape') stopShow(); else if (e.key === 'ArrowRight') { ssI = (ssI + 1) % ssList.length; showSlide(); } else if (e.key === 'ArrowLeft') { ssI = (ssI + ssList.length - 1) % ssList.length; showSlide(); }
          e.preventDefault(); return;
        }
        if (!ov.hidden) { if (dlgKey) dlgKey(e); return; }
        if (mode === 'cam') {
          const st = 12 / zoom;
          const k = e.key;
          if (k === 'ArrowLeft') pan(-st, 0); else if (k === 'ArrowRight') pan(st, 0); else if (k === 'ArrowUp') pan(0, -st); else if (k === 'ArrowDown') pan(0, st);
          else if (k === '+' || k === '=' || k === 't' || k === 'T' || k === 'PageUp') zoomBy(1.25);
          else if (k === '-' || k === '_' || k === 'w' || k === 'W' || k === 'PageDown') zoomBy(0.8);
          else if (k === ' ' || k === 'Enter') shoot();
          else if (k === 'f' || k === 'F') doFocus();
          else if (k === 'l' || k === 'L') toggleFlash();
          else return;
          e.preventDefault();
        } else {
          if (e.key === 'Delete') { delSelected(); e.preventDefault(); }
          else if (e.key === 'Enter' && sel) { openEditor(sel.list, sel.i); e.preventDefault(); }
        }
      };
      W.onClose = () => { closed = true; cancelAnimationFrame(raf); timers.forEach(clearTimeout); timers.clear(); if (ro) ro.disconnect(); if (xfer) xfer.cancel = true; };
      W.onMin = () => { stopShow(); };

      clampView(); setMode('cam'); layout(); later(layout, 50);
      raf = requestAnimationFrame(loop);
      if (!api.load('seenHelp', false)) { api.save('seenHelp', true); later(() => { say('Aim the camera, then press snap to take a picture.'); showHelp(); }, 300); }
    }
  });
})();
