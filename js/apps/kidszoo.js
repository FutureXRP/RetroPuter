/* Beep Goes to the Zoo: a point-and-click cartoon adventure for ages 4 to 8 (store game, 1995).
   Scenes are drawn on a 320x200 canvas and scaled up (letterboxed). Speech bubbles, buttons and
   overlays are DOM. Everything here is original: Beep, Pebble Park Zoo and all its animals. */
(function () {
  'use strict';
  const LW = 320, LH = 200, GY = 190, TAU = Math.PI * 2;
  let g = null, T = 0;

  /* ---------- drawing helpers (draw into the current context g) ---------- */
  const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  const C = (x, y, r, c, o) => { g.fillStyle = c; g.beginPath(); g.arc(x, y, Math.max(0.1, r), 0, TAU); g.fill(); if (o) { g.strokeStyle = o; g.lineWidth = 1; g.stroke(); } };
  const E = (x, y, rx, ry, c, rot, o) => { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, TAU); g.fill(); if (o) { g.strokeStyle = o; g.lineWidth = 1; g.stroke(); } };
  const P = (p, c, o) => { g.fillStyle = c; g.beginPath(); g.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) g.lineTo(p[i], p[i + 1]); g.closePath(); g.fill(); if (o) { g.strokeStyle = o; g.lineWidth = 1; g.stroke(); } };
  const L = (x1, y1, x2, y2, c, w) => { g.strokeStyle = c; g.lineWidth = w || 1; g.lineCap = 'round'; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); };
  const Q = (x1, y1, cx, cy, x2, y2, c, w) => { g.strokeStyle = c; g.lineWidth = w || 1; g.lineCap = 'round'; g.beginPath(); g.moveTo(x1, y1); g.quadraticCurveTo(cx, cy, x2, y2); g.stroke(); };
  const RR = (x, y, w, h, r, c, o) => {
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
    g.fillStyle = c; g.fill(); if (o) { g.strokeStyle = o; g.lineWidth = 1; g.stroke(); }
  };
  const TX = (s, x, y, size, c, o) => { g.font = `bold ${size}px Arial, Helvetica, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; if (o) { g.strokeStyle = o; g.lineWidth = 2.5; g.lineJoin = 'round'; g.strokeText(s, x, y); } g.fillStyle = c; g.fillText(s, x, y); };
  const spr = (fn, x, y, s, dir, ...a) => { g.save(); g.translate(x, y); g.scale((s || 1) * (dir || 1), s || 1); fn(...a); g.restore(); };
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const mix = (a, b, k) => { const A = hex(a), B = hex(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * k)).join(',')})`; };
  const OL = '#2a1a10';

  function sky(c1, c2, h) { const n = 8; for (let i = 0; i < n; i++) R(0, i * h / n, LW, h / n + 1, mix(c1, c2, i / (n - 1))); }
  function cloud(x, y, s) { C(x, y, 6 * s, '#fff'); C(x + 7 * s, y - 4 * s, 8 * s, '#fff'); C(x + 16 * s, y, 6 * s, '#fff'); R(x, y - 1, 16 * s, 6 * s, '#fff'); }
  function clouds(t, y) { for (let i = 0; i < 3; i++) { const x = ((t * (4 + i * 2) + i * 130) % 400) - 40; cloud(x, (y || 22) + i * 12, 1 - i * 0.15); } }
  function sunS(x, y, t, j) {
    g.save(); g.translate(x, y); g.rotate(t * 0.3 + j * 6);
    for (let i = 0; i < 8; i++) { g.rotate(TAU / 8); P([-3, -13, 3, -13, 0, -19], '#ffd23f'); }
    g.restore();
    C(x, y, 11, '#ffd23f', '#e8a000'); C(x - 4, y - 2, 1.4, '#6a3a00'); C(x + 4, y - 2, 1.4, '#6a3a00');
    g.strokeStyle = '#6a3a00'; g.lineWidth = 1; g.beginPath(); g.arc(x, y + 1, 5, 0.3, Math.PI - 0.3); g.stroke();
  }
  function road(c) {
    R(0, 169, LW, 31, c || '#d8b376'); R(0, 169, LW, 2, '#a8844a');
    for (let i = 0; i < 22; i++) { const x = (i * 53) % LW, y = 175 + (i * 7) % 22; R(x, y, 3, 2, '#b8935a'); }
  }
  function tufts(y, c) { for (let x = 4; x < LW; x += 19) { const yy = y + ((x * 7) % 36); P([x, yy, x + 2, yy - 5, x + 4, yy], c); } }
  function flowers(y) { const cs = ['#ff5a8a', '#ffd23f', '#fff', '#b04ae0']; for (let i = 0; i < 9; i++) { const x = 10 + i * 36 + (i % 2) * 9, yy = y + (i % 3) * 3; L(x, yy, x, yy + 5, '#2e8b3e'); C(x, yy, 2, cs[i % 4]); C(x, yy, 0.8, '#e88'); } }
  function wheel(x, y, rot) { C(x, y, 5.5, '#222'); C(x, y, 2.6, '#c8c8c8'); L(x, y, x + Math.cos(rot) * 4.6, y + Math.sin(rot) * 4.6, '#777', 1.2); }

  /* ---------- sprites: origin is the middle of the feet ---------- */
  function beepS(t, o) {
    o = o || {};
    const talk = o.talk ? Math.abs(Math.sin(t * 14)) : 0, bob = o.moving ? Math.sin(t * 22) * 0.7 : Math.sin(t * 2.4) * 0.5;
    E(0, 0, 21, 3, 'rgba(0,0,0,.25)');
    g.save(); g.translate(0, bob - (o.hop || 0));
    P([-21, -6, -21, -15, -16, -21, 13, -21, 21, -14, 21, -6], '#ffb52e', '#6a3a00');
    R(-20, -12, 40, 3, '#ff7a1a'); R(-14, -19, 10, 3, '#fff1b8');
    C(18.5, -16, 2.3, '#fffbd0', '#6a3a00'); R(-22, -10, 2, 3, '#e8352e'); R(19, -8, 4, 3, '#c8c8c8'); R(-23, -8, 4, 3, '#c8c8c8');
    wheel(-12, -5, o.rot || 0); wheel(12, -5, o.rot || 0);
    R(-2, -24, 4, 4, '#555');
    RR(-12, -38, 24, 15, 4, '#2fc4bd', '#12524f');
    RR(-9, -35, 18, 10, 2, '#10262c');
    if (o.happy || (t % 3.7) > 0.14) { R(-6, -33, 4, 4, '#8ff'); R(2, -33, 4, 4, '#8ff'); R(-5, -33, 1, 1, '#fff'); R(3, -33, 1, 1, '#fff'); }
    else { R(-6, -31, 4, 1, '#8ff'); R(2, -31, 4, 1, '#8ff'); }
    if (o.happy) { R(-4, -28, 8, 1, '#8ff'); R(-5, -29, 1, 1, '#8ff'); R(4, -29, 1, 1, '#8ff'); }
    else R(-3, -28, 6, 1 + Math.round(talk * 2), '#8ff');
    L(5, -38, 7, -45, '#333', 1); C(7, -46, 2, Math.sin(t * 4) > 0 ? '#ff3b3b' : '#b01818');
    if (o.hat) { P([-8, -38, -1, -53, 6, -38], '#b04ae0', '#401060'); R(-6, -43, 10, 2, '#ffd23f'); C(-1, -53, 2.2, '#ffd23f'); }
    g.restore();
  }
  function opalS(t, o) {
    o = o || {};
    const sk = '#9a5f3a', uni = '#5b9a45', st = o.walk ? Math.sin(t * 9) * 2 : 0;
    R(-5, -17, 4, 15, '#7a6440'); R(1, -17, 4, 15, '#7a6440');
    R(-6 + st, -3, 6, 3, '#3a2616'); R(1 - st, -3, 6, 3, '#3a2616');
    RR(-7, -35, 14, 19, 3, uni, '#3f6f30'); R(-7, -19, 14, 2, '#6b4a2a'); R(2, -31, 3, 3, '#ffd23f');
    R(-10, -33, 3, 13, uni); C(-8.5, -19, 2, sk);
    if (o.wave) { const a = Math.sin(t * 9) * 2; R(7, -45, 3, 12, uni); C(8.5 + a, -46, 2.3, sk); }
    else { R(7, -33, 3, 13, uni); C(8.5, -19, 2, sk); }
    if (o.map) { R(9, -30, 10, 8, '#f3e2b0'); L(11, -27, 17, -25, '#c33', 1); }
    E(-6, -39, 2.5, 5, '#2a1a10');
    C(0, -41, 6.5, sk, '#5a3520');
    R(-3, -43, 1.5, 2, '#111'); R(2, -43, 1.5, 2, '#111');
    g.strokeStyle = '#5a2010'; g.lineWidth = 1; g.beginPath(); g.arc(0, -40, 2.5, 0.3, Math.PI - 0.3); g.stroke();
    E(0, -46, 11, 2.5, '#d9c27e', 0, '#8a7040'); RR(-6, -53, 12, 7, 2, '#d9c27e', '#8a7040'); R(-6, -49, 12, 1.5, '#6b4a2a');
  }
  function rosieS(t) {
    const sk = '#f1c7a0';
    RR(-9, -18, 18, 18, 3, '#3b7dd8', '#1d4a8a'); R(-5, -16, 10, 16, '#fff'); R(-2, -12, 4, 3, '#ff5a8a');
    const a = Math.sin(t * 3) * 1.5; R(-12, -16, 3, 10, '#3b7dd8'); R(9, -16 + a, 3, 10, '#3b7dd8'); C(-10.5, -6, 2, sk); C(10.5, -6 + a, 2, sk);
    C(0, -32, 4.5, '#c0392b'); C(0, -24, 7, sk, '#8a5a3a'); E(0, -29, 7, 3, '#c0392b');
    R(-3, -25, 1.5, 2, '#111'); R(2, -25, 1.5, 2, '#111'); C(-4.5, -22, 1.4, '#ff9aa8'); C(4.5, -22, 1.4, '#ff9aa8');
    g.strokeStyle = '#6a2010'; g.lineWidth = 1; g.beginPath(); g.arc(0, -22, 2.5, 0.3, Math.PI - 0.3); g.stroke();
  }
  function penguinS(t, o) {
    o = o || {};
    g.save(); if (o.walk) g.rotate(Math.sin(t * 8) * 0.12);
    E(-2.5, 0, 3, 1.3, '#ff9f1a'); E(2.5, 0, 3, 1.3, '#ff9f1a');
    E(0, -10, 7, 10, '#1a1a2a'); E(1, -9, 5, 8, '#fff');
    const fl = o.flap ? Math.sin(t * 20) * 0.6 : 0;
    E(-6, -11, 2, 6, '#1a1a2a', 0.3 + fl); E(6, -11, 2, 6, '#1a1a2a', -0.3 - fl);
    C(0, -20, 6, '#1a1a2a'); C(2, -21, 1.6, '#fff'); C(2.5, -21, 0.9, '#000');
    P([4, -20.5, 9, -19, 4, -17.5], '#ff9f1a');
    if (o.tie) { P([-3, -14, 0, -12.5, -3, -11], '#e8352e'); P([3, -14, 0, -12.5, 3, -11], '#e8352e'); }
    if (o.sweat) C(-5, -24 + (t * 6 % 4), 1.2, '#6cc4f4');
    g.restore();
  }
  function sealS(t, o) {
    o = o || {};
    const b = o.ball || o.scarf ? Math.abs(Math.sin(t * 3)) * 2 : 0;
    P([-16, -6, -27, -13, -25, -1], '#5d6f81');
    E(0, -7, 18, 8, '#6f8193'); E(12, -16, 6, 10, '#6f8193', -0.4);
    C(16, -25, 7, '#7d8fa1'); E(22, -23, 3.8, 2.6, '#9aabb9'); C(24.5, -24, 1.3, '#111');
    C(15, -27, 1.4, '#111'); C(15.4, -27.4, 0.5, '#fff');
    L(22, -22, 27, -21, '#333', 0.5); L(22, -22, 27, -23, '#333', 0.5);
    E(8, -3, 6, 2.2, '#5d6f81', 0.4);
    if (o.clap) { E(14, -12 - Math.abs(Math.sin(t * 16)) * 3, 2.5, 5, '#5d6f81', -0.6); }
    if (o.ball) { C(20, -37 - b, 5.5, o.ball, OL); C(18, -39 - b, 1.5, 'rgba(255,255,255,.7)'); }
    if (o.scarf) { for (let i = 0; i < 6; i++) R(8 + i * 4, -35 - b - Math.sin(i + t * 2) * 1.5, 4, 4, i % 2 ? '#3fae4a' : '#9b3fd0'); }
  }
  function giraffeS(t, o) {
    o = o || {};
    const sad = !!o.sad, r = o.reach || 0;
    const hx0 = sad ? 42 : 30, hy0 = sad ? -98 : -128;
    const hx = hx0 + ((o.rx || 60) - hx0) * r, hy = hy0 + ((o.ry || -140) - hy0) * r + (o.chew ? Math.sin(t * 8) : 0);
    const leg = '#e9b949', st = o.walk ? Math.sin(t * 6) * 3 : 0;
    [[-17, st], [-9, -st], [9, -st], [17, st]].forEach(([x, s]) => { R(x + s * 0.3, -58, 4, 56, leg); R(x + s * 0.3, -3, 4, 3, '#6b4a2a'); });
    Q(-23, -68, -28, -60, -26, -48, '#c99a3a', 1.5); E(-26, -47, 1.5, 3, '#6b4a2a');
    E(0, -66, 25, 13, '#f2c14e', 0, OL);
    [[-12, -68, 5, 4], [-2, -62, 6, 4], [9, -68, 5, 4], [-15, -60, 4, 3], [3, -72, 4, 3], [15, -61, 4, 3]].forEach(p => E(p[0], p[1], p[2], p[3], '#b5722c'));
    P([12, -70, 22, -76, hx + 3, hy + 6, hx - 5, hy + 2], '#f2c14e');
    for (let k = 1; k < 5; k++) { const x = 17 + (hx - 17) * k / 5, y = -73 + (hy + 4 + 73) * k / 5; E(x, y, 2.5, 2, '#b5722c'); }
    Q(12, -70, (12 + hx) / 2 - 6, (hy - 70) / 2, hx - 5, hy + 1, '#a0602a', 2);
    if (o.scarf) { for (let i = 0; i < 5; i++) { const x = 15 + i * 1.4, y = -78 - i * 3; R(x - 5, y, 12, 3, i % 2 ? '#3fae4a' : '#9b3fd0'); } R(17, -78, 4, 14, '#9b3fd0'); R(17, -68, 4, 3, '#3fae4a'); }
    g.save(); g.translate(hx, hy); g.rotate(sad ? 0.55 : 0.15);
    R(-3, -12, 2, 7, '#8a5a2a'); R(2, -12, 2, 7, '#8a5a2a'); C(-2, -12, 1.8, '#6b4a2a'); C(3, -12, 1.8, '#6b4a2a');
    E(-5, -6, 4, 1.8, '#e0a93a', -0.4);
    E(4, 0, 10, 6, '#f2c14e', 0, OL); E(11, 2, 4.5, 4.5, '#e6b04a'); C(13, 1, 0.8, '#6b4a2a');
    C(3, -2, 1.7, '#111'); if (sad) L(1, -5, 6, -4, '#6b4a2a', 1); else C(3.5, -2.5, 0.6, '#fff');
    if (!sad) { g.strokeStyle = '#6b4a2a'; g.lineWidth = 0.8; g.beginPath(); g.arc(10, 3, 3, 0.2, 1.6); g.stroke(); }
    g.restore();
  }
  function monkeyS(t, o) {
    o = o || {};
    const br = '#8b5a2b', fc = '#e8bb8a', j = o.cheer ? Math.abs(Math.sin(t * 10)) * 4 : 0;
    g.save(); g.translate(0, -j);
    Q(-5, -5, -16, -4, -14, -16, br, 2); C(-13, -17, 2, br);
    E(-4, -1, 3, 2, br); E(4, -1, 3, 2, br);
    E(0, -10, 7, 9, br); E(0, -9, 4, 6, fc);
    if (o.hang) { R(-8, -36, 3, 20, br); R(5, -36, 3, 20, br); }
    else if (o.cheer) { R(-9, -30, 3, 14, br); R(6, -30, 3, 14, br); }
    else if (o.drum) { const a = Math.sin(t * 12) * 3; R(-11, -16 + a, 8, 3, br); R(3, -16 - a, 8, 3, br); }
    else { E(-7, -10, 2.2, 5, br, 0.3); E(7, -10, 2.2, 5, br, -0.3); }
    if (o.banana) { g.strokeStyle = '#ffd23f'; g.lineWidth = 2.5; g.beginPath(); g.arc(9, -14, 5, 0.4, 2.2); g.stroke(); }
    C(-7, -24, 2.6, fc); C(7, -24, 2.6, fc);
    C(0, -24, 7, br); E(0, -22, 5, 4.5, fc);
    C(-2, -24, 1.1, '#111'); C(2, -24, 1.1, '#111');
    g.strokeStyle = '#5a3010'; g.lineWidth = 0.9; g.beginPath(); g.arc(0, -21.5, 2, 0.2, Math.PI - 0.2); g.stroke();
    g.restore();
  }
  function tortoiseS(t, o) {
    o = o || {};
    const w = o.walk ? Math.sin(t * 5) * 1.5 : 0;
    E(-10 + w, -2, 3.5, 3, '#7a8b4a'); E(10 - w, -2, 3.5, 3, '#7a8b4a');
    const hx = 20 + (o.munch ? Math.sin(t * 8) * 1 : 0);
    C(hx, -8, 5, '#8a9b5a', '#4a5a2a'); C(hx + 2, -10, 1, '#111');
    if (o.munch) { E(hx + 5, -6, 3, 2, '#7ad04a'); }
    g.fillStyle = '#4f7a3a'; g.beginPath(); g.ellipse(0, -5, 17, 13, 0, Math.PI, 0); g.fill(); g.strokeStyle = '#2f4a22'; g.lineWidth = 1; g.stroke();
    R(-18, -6, 36, 3, '#3d5f2c');
    C(0, -12, 4, '#6b9a4a'); C(-9, -9, 3, '#6b9a4a'); C(9, -9, 3, '#6b9a4a'); C(-4, -16, 2, '#6b9a4a'); C(5, -15, 2, '#6b9a4a');
  }
  function elephantS(t, o) {
    o = o || {};
    const st = o.walk ? Math.sin(t * 5) * 2 : 0, gy = '#9aa1ad', dk = '#838a97';
    [[-22, st], [-9, -st], [6, -st], [16, st]].forEach(([x, s]) => { R(x + s, -22, 9, 22, dk); R(x + s, -3, 9, 3, '#c8ccd2'); });
    Q(-27, -36, -33, -30, -31, -22, dk, 1.5);
    E(0, -32, 28, 19, gy, 0, '#555');
    if (o.drum) { R(-10, -38, 22, 16, '#d0312d'); R(-10, -38, 22, 2, '#ffd23f'); R(-10, -24, 22, 2, '#ffd23f'); for (let i = 0; i < 5; i++) L(-9 + i * 5, -36, -6 + i * 5, -25, '#ffd23f', 0.8); E(12, -30, 3, 8, '#f5e6c8'); }
    if (o.hat) { g.fillStyle = '#d0312d'; }
    E(15, -44, 10, 14, dk);
    C(25, -44, 14, gy, '#555');
    C(29, -49, 1.7, '#111'); C(29.5, -49.5, 0.6, '#fff');
    const up = o.toot ? 1 : 0;
    g.strokeStyle = gy; g.lineWidth = 7; g.lineCap = 'round'; g.beginPath(); g.moveTo(35, -40);
    if (up) g.quadraticCurveTo(48, -40, 46, -62); else g.quadraticCurveTo(44, -30, 40, -14);
    g.stroke();
    P([33, -37, 38, -35, 35, -33], '#fffbe8');
    if (o.hat) { RR(16, -68, 16, 10, 2, '#d0312d', '#6a1010'); R(13, -59, 22, 3, '#222'); C(24, -63, 2.4, '#ffd23f'); P([22, -68, 26, -68, 28, -80, 20, -78], '#fff'); }
  }
  function flamingoS(t, o) {
    o = o || {};
    L(0, 0, 0, -24, '#e0607e', 1.5); L(0, -15, -6, -19, '#e0607e', 1.5); L(-6, -19, -1, -22, '#e0607e', 1.5);
    E(0, -28, 10, 6, '#ff8fb1', 0, '#c0406a'); E(-3, -28, 6, 4, '#f06d97');
    const nod = o.nod ? Math.sin(t * 6) * 3 : 0;
    g.strokeStyle = '#ff8fb1'; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(7, -30); g.bezierCurveTo(14, -38, 0, -44, 5 + nod * 0.3, -52 + Math.abs(nod)); g.stroke();
    const hy = -53 + Math.abs(nod);
    C(5, hy, 3.4, '#ff8fb1'); C(6, hy - 1, 0.9, '#111');
    P([7, hy - 1, 12, hy + 1, 9, hy + 4], '#fff'); P([10, hy + 0.5, 12, hy + 1, 10, hy + 4], '#222');
  }
  function parrotS(t, o) {
    o = o || {};
    const b = o.talk ? Math.sin(t * 14) * 1 : 0;
    P([-2, -3, 2, -3, 1, 10, -3, 10], '#2e6fe2'); P([-1, -3, 1, -3, 0, 7], '#ffd23f');
    E(0, -10, 5, 9, '#e23b2e'); E(-2, -9, 3, 7, '#2e6fe2'); R(-4, -5, 4, 2, '#ffd23f');
    C(1, -20 + b * 0.3, 5, '#e23b2e'); C(2.5, -20, 2.6, '#fff'); C(3, -20.5, 1, '#111');
    P([5, -22, 9, -20, 6, -16 + b], '#333'); L(-2, 0, -2, 2, '#555', 1); L(2, 0, 2, 2, '#555', 1);
  }
  function snakeS(t, o) {
    o = o || {};
    E(0, -4, 15, 4.5, '#3caa4a', 0, '#1f6a2a'); E(-1, -9, 11, 4, '#46bb54', 0, '#1f6a2a'); E(-1, -13, 7, 3.5, '#3caa4a', 0, '#1f6a2a');
    for (let i = 0; i < 6; i++) C(-11 + i * 4.5, -4, 1, '#ffd23f');
    const sw = Math.sin(t * 2) * 2 + (o.hiss ? Math.sin(t * 20) * 1.5 : 0);
    Q(2, -14, 6, -20, 5 + sw, -22, '#46bb54', 4);
    E(7 + sw, -24, 5, 3.4, '#3caa4a', 0, '#1f6a2a'); C(8 + sw, -25.5, 1, '#111'); C(8.3 + sw, -25.8, 0.4, '#fff');
    if (o.hiss || Math.sin(t * 5) > 0.6) { L(12 + sw, -24, 16 + sw, -24, '#e8352e', 0.8); L(16 + sw, -24, 18 + sw, -26, '#e8352e', 0.6); L(16 + sw, -24, 18 + sw, -22, '#e8352e', 0.6); }
  }
  function chamS(t, o) {
    o = o || {};
    const c = o.c || '#5cc84a', d = mix(c, '#000000', 0.3);
    g.strokeStyle = c; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(-9, -5); g.quadraticCurveTo(-16, -2, -15, 3); g.stroke();
    g.lineWidth = 2; g.beginPath(); g.arc(-12, 3, 3, 0, 5); g.stroke();
    L(-5, -2, -6, 1, d, 2); L(4, -2, 5, 1, d, 2);
    E(0, -6, 10, 6, c, 0, d); P([-6, -11, 0, -13, 6, -11], d);
    P([7, -10, 15, -7, 7, -2], c); P([7, -10, 10, -14, 11, -8], d);
    const r = o.roll ? t * 4 : 0;
    C(10, -7, 3.4, mix(c, '#ffffff', 0.4), d); C(10 + Math.cos(r) * 1.3, -7 + Math.sin(r) * 1.3, 1.1, '#111');
    L(14, -5, 11, -4, d, 0.8);
  }
  function fishS(c) { E(0, 0, 9, 5, c, 0, OL); P([-7, 0, -14, -5, -14, 5], c, OL); C(5, -1, 1.3, '#fff'); C(5.4, -1, 0.7, '#111'); L(1, -3, 1, 3, 'rgba(0,0,0,.25)', 1); }
  const ANIMALSPR = {
    flamingo: () => spr(flamingoS, 30, 47, 0.78, 1, T, {}),
    parrot: () => { L(12, 42, 52, 42, '#6b4a2a', 3); spr(parrotS, 32, 41, 1.4, 1, T, {}); },
    snake: () => spr(snakeS, 30, 45, 1.3, 1, T, {}),
    chameleon: () => { L(2, 38, 62, 34, '#6b4a2a', 3); spr(chamS, 32, 36, 1.8, 1, T, {}); },
    tortoise: () => spr(tortoiseS, 28, 43, 1.3, 1, T, {}),
    penguin: () => spr(penguinS, 32, 45, 1.55, 1, T, {}),
    seal: () => spr(sealS, 27, 46, 0.95, 1, T, { ball: '#e8352e' }),
    giraffe: () => spr(giraffeS, 14, 84, 0.52, 1, T, { scarf: true }),
    monkey: () => spr(monkeyS, 32, 46, 1.3, 1, T, {}),
    elephant: () => spr(elephantS, 24, 47, 0.62, 1, T, { hat: true })
  };
  function portrait(cv, id, known, bg) {
    g = cv.getContext('2d'); g.clearRect(0, 0, 64, 48);
    ANIMALSPR[id]();
    if (!known) { g.globalCompositeOperation = 'source-atop'; R(0, 0, 64, 48, '#4a5260'); g.globalCompositeOperation = 'source-over'; TX('?', 50, 12, 14, '#fff', '#000'); }
    g.globalCompositeOperation = 'destination-over'; R(0, 0, 64, 48, known ? bg : '#b8c0cc'); g.globalCompositeOperation = 'source-over';
  }

  /* ---------- items ---------- */
  const ITEMS = {
    banana: { n: 'bananas', d() { for (let i = 0; i < 3; i++) { g.strokeStyle = i === 1 ? '#ffe04a' : '#f5c518'; g.lineWidth = 4; g.beginPath(); g.arc(16 + (i - 1) * 4, 10, 12, 0.5 + i * 0.1, 2.3 + i * 0.1); g.stroke(); } R(20, 4, 4, 4, '#6b4a2a'); } },
    lettuce: { n: 'lettuce', d() { C(16, 18, 11, '#3fae4a', '#1f6a2a'); C(11, 15, 6, '#7ad04a'); C(20, 14, 6, '#7ad04a'); C(16, 20, 6, '#a8e86a'); L(16, 12, 16, 26, '#e8ffd0', 1); } },
    crank: { n: 'crank handle', d() { L(8, 24, 22, 10, '#9aa0a8', 4); L(22, 10, 26, 16, '#9aa0a8', 4); C(26, 18, 3.5, '#e8352e', OL); C(7, 25, 3, '#666'); } },
    fish: { n: 'bucket of fish', d() { spr(fishS, 12, 8, 0.8, 1, '#f5a020'); spr(fishS, 21, 9, 0.8, -1, '#6cc4f4'); P([5, 12, 27, 12, 24, 29, 8, 29], '#3b7dd8', OL); R(5, 12, 22, 3, '#6aa0f0'); } },
    scarf: { n: 'stripy scarf', d() { for (let i = 0; i < 6; i++) R(4 + i * 4, 10, 4, 7, i % 2 ? '#3fae4a' : '#9b3fd0'); R(20, 16, 6, 12, '#9b3fd0'); R(20, 22, 6, 3, '#3fae4a'); } },
    map: { n: 'zoo map', d() { P([4, 7, 13, 5, 20, 7, 28, 5, 28, 25, 20, 27, 13, 25, 4, 27], '#f3e2b0', OL); L(13, 5, 13, 25, '#c8b080'); L(20, 7, 20, 27, '#c8b080'); g.setLineDash([2, 2]); L(7, 22, 16, 13, '#3b7dd8', 1.2); L(16, 13, 23, 16, '#3b7dd8', 1.2); g.setLineDash([]); L(22, 13, 26, 17, '#e8352e', 1.8); L(26, 13, 22, 17, '#e8352e', 1.8); } },
    drum: { n: 'big drum', d() { R(6, 12, 20, 13, '#d0312d'); E(16, 12, 10, 3.5, '#f5e6c8', 0, OL); R(6, 23, 20, 2, '#ffd23f'); for (let i = 0; i < 4; i++) L(8 + i * 5, 15, 11 + i * 5, 23, '#ffd23f', 1); L(18, 2, 24, 10, '#8a5a2a', 2); C(18, 2, 2, '#fff'); } }
  };

  /* ---------- photo album (facts checked: simple and true) ---------- */
  const ANIMALS = [
    { id: 'flamingo', n: 'Flamingo', bg: '#bfefff', fact: 'Flamingos get their pink color from the food they eat, like tiny shrimp and algae.' },
    { id: 'parrot', n: 'Parrot', bg: '#fff0c8', fact: 'Some parrots can copy sounds they hear, even words!' },
    { id: 'snake', n: 'Snake', bg: '#9fd8c8', fact: 'Snakes smell with their tongues. They flick them in and out to pick up smells from the air.' },
    { id: 'chameleon', n: 'Chameleon', bg: '#cfeebb', fact: 'A chameleon can move each eye on its own, so it can look in two directions at once!' },
    { id: 'tortoise', n: 'Tortoise', bg: '#f0dca8', fact: 'Tortoises carry their shell everywhere they go. Some giant tortoises live for more than 100 years!' },
    { id: 'penguin', n: 'Penguin', bg: '#dff4ff', fact: 'Penguins are birds, but they cannot fly. They use their wings like flippers to swim.' },
    { id: 'seal', n: 'Seal', bg: '#bfe0ff', fact: 'Seals have a thick layer of fat called blubber. It keeps them warm in cold water.' },
    { id: 'giraffe', n: 'Giraffe', bg: '#ffe7a8', fact: 'Giraffes are the tallest animals on land. A newborn baby giraffe is about as tall as a grown-up person!' },
    { id: 'monkey', n: 'Monkey', bg: '#d8f5c8', fact: 'Some monkeys can hold on to branches with their tails, like an extra hand!' },
    { id: 'elephant', n: 'Elephant', bg: '#e8e8f4', fact: 'An elephant\'s trunk is its nose and upper lip together. It has no bones, just lots of muscles!' }
  ];
  const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven'];

  const ARROW = d => `<svg viewBox="0 0 16 16" width="22" height="22" aria-hidden="true"><path d="${d < 0 ? 'M11 1L3 8l8 7z' : 'M5 1l8 7-8 7z'}" fill="#fff" stroke="#000"/></svg>`;
  const HONK = '<svg viewBox="0 0 32 32" width="36" height="36" aria-hidden="true"><circle cx="9" cy="16" r="7" fill="#e8352e" stroke="#000"/><circle cx="7" cy="13" r="2" fill="#ff9a8a"/><path d="M15 13h4l11-8v22l-11-8h-4z" fill="#f2c040" stroke="#000"/><path d="M26 9v14" stroke="#b08010"/></svg>';
  const ALBUM = '<svg viewBox="0 0 32 32" width="36" height="36" aria-hidden="true"><rect x="3" y="4" width="26" height="24" rx="2" fill="#3b7dd8" stroke="#000"/><rect x="8" y="8" width="17" height="14" fill="#fff" stroke="#000"/><rect x="10" y="10" width="13" height="8" fill="#8fd3ff"/><circle cx="20" cy="12" r="2" fill="#ffd23f"/><path d="M10 18l4-4 3 3 2-2 4 3z" fill="#3fae4a"/><rect x="5" y="4" width="2" height="24" fill="#1d4a8a"/></svg>';

  const CSS = `
    .bz{position:relative;display:flex;flex-direction:column;height:100%;background:#0c0c14;user-select:none;-webkit-user-select:none;font:13px var(--ui)}
    .bz [hidden]{display:none !important}
    .bz-stage{background:radial-gradient(circle at 50% 50%,#1d3d63,#0c0c14 75%);position:relative;flex:1;min-height:0;display:flex;align-items:center;justify-content:center;overflow:hidden}
    .bz-wrap{position:relative;flex:none;overflow:hidden;font-size:14px}
    .bz-wrap canvas{display:block;width:100%;height:100%;image-rendering:pixelated;image-rendering:crisp-edges;touch-action:none;cursor:pointer}
    .bz-bar{flex:none;display:flex;align-items:center;gap:6px;padding:5px 6px}
    .bz .bz-big.btn{min-width:0;width:54px;height:54px;padding:0;display:flex;align-items:center;justify-content:center;flex:none;position:relative}
    .bz .bz-big.bz-pulse{animation:bz-pl .5s 3 alternate}
    @keyframes bz-pl{to{background:#ffe680}}
    .bz-glove{flex:1;min-width:0;height:54px;display:flex;align-items:center;gap:4px;padding:0 4px;overflow-x:auto;overflow-y:hidden;background:#4a3424;box-sizing:border-box}
    .bz-glab{color:#d8c0a0;font:bold 10px var(--ui);letter-spacing:1px;writing-mode:vertical-rl;transform:rotate(180deg);flex:none;opacity:.8}
    .bz-items{display:flex;gap:4px;align-items:center}
    .bz-empty{color:#b89c80;font-size:12px;padding-left:4px;white-space:nowrap}
    .bz .bz-it.btn{min-width:0;width:46px;height:46px;padding:0;flex:none;display:flex;align-items:center;justify-content:center;touch-action:none}
    .bz .bz-it.btn canvas{width:38px;height:38px;image-rendering:pixelated;pointer-events:none}
    .bz .bz-it.btn.bz-on{background:#ffe680;outline:3px solid #e8352e;outline-offset:-3px}
    .bz-ghost{position:fixed;z-index:99999;width:48px;height:48px;pointer-events:none;margin:-24px 0 0 -24px;image-rendering:pixelated;filter:drop-shadow(2px 3px 0 rgba(0,0,0,.4))}
    .bz-bub{position:absolute;z-index:6;background:#fffef0;border:2px solid #222;border-radius:12px;padding:.3em .6em .4em;font-weight:bold;line-height:1.25;color:#111;max-width:72%;box-shadow:2px 3px 0 rgba(0,0,0,.35);pointer-events:none}
    .bz-bub b{display:block;font-size:.78em;letter-spacing:.5px}
    .bz-bub i{position:absolute;bottom:-10px;width:0;height:0;margin-left:-8px;border:8px solid transparent;border-top-color:#222;border-bottom:0}
    .bz-bub.bz-dn i{bottom:auto;top:-10px;border:8px solid transparent;border-bottom-color:#222;border-top:0}
    .bz-tip{position:absolute;z-index:5;top:5px;left:50%;transform:translateX(-50%);width:max-content;max-width:calc(100% - 110px);}
    .bz-mg .bz-tip{left:6px;transform:none;max-width:calc(100% - 90px);}
    .bz-tip{background:#1d4a8a;color:#fff;border:2px solid #fff;border-radius:8px;padding:.25em .6em;font-weight:bold;text-align:center;line-height:1.25;box-shadow:2px 2px 0 rgba(0,0,0,.4);pointer-events:none}
    .bz-scn{position:absolute;left:5px;bottom:5px;z-index:3;background:rgba(0,0,0,.55);color:#fff;font-weight:bold;font-size:.8em;padding:1px 6px;border-radius:6px;pointer-events:none}
    .bz-nav{position:absolute;top:36%;z-index:4;min-width:48px;min-height:52px;max-width:92px;border:2px solid #4a2a10;border-radius:8px;background:#c98a4a;box-shadow:inset 1px 1px #f0c080,2px 2px 0 rgba(0,0,0,.4);color:#fff;font:bold .72em var(--ui);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;padding:3px 4px;cursor:pointer;text-shadow:1px 1px 0 #000;line-height:1.1}
    .bz-nav:active{transform:translateY(1px)}
    .bz-nav.bz-l{left:4px}.bz-nav.bz-r{right:4px}
    .bz-nav[hidden]{display:none}
    .bz-photo{position:absolute;z-index:5;right:6px;bottom:6px;background:#fff;color:#111;border:2px solid #222;padding:2px 8px;font-weight:bold;font-size:.85em;transform:rotate(-3deg);box-shadow:2px 2px 0 rgba(0,0,0,.4);pointer-events:none}
    .bz .bz-x.btn{position:absolute;z-index:7;top:4px;right:4px;min-width:64px;min-height:44px;font-weight:bold}
    .bz-nums{position:absolute;z-index:5;left:0;right:0;bottom:4px;display:flex;justify-content:center;gap:4px;padding:0 4px}
    .bz .bz-nums .btn{min-width:0;flex:1;max-width:64px;height:48px;padding:0;font:bold 22px var(--ui);display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1}
    .bz .bz-nums .btn small{font-size:9px;letter-spacing:1px;color:#8a1a1a}
    .bz .bz-nums .btn.bz-hint{animation:bz-pl .4s infinite alternate}
    .bz-ov{position:absolute;inset:0;z-index:10;display:flex;flex-direction:column;align-items:center;overflow:auto;padding:8px;box-sizing:border-box}
    .bz-ov[hidden]{display:none}
    .bz-ttl{justify-content:space-between;pointer-events:none}
    .bz-ttl>*{pointer-events:auto}
    .bz-logo{text-align:center;font:900 44px/1 Arial Black,Arial,Helvetica,sans-serif;background:rgba(0,40,90,.45);border-radius:14px;padding:4px 18px 8px;color:#ffd23f;-webkit-text-stroke:2px #6a1a00;text-shadow:3px 4px 0 #6a1a00;transform:rotate(-2deg);margin-top:4px}
    .bz-logo span{display:inline-block;animation:bz-bob 1.6s ease-in-out infinite}
    .bz-logo span.bz-z{color:#3fd0ff}
    .bz-logo small{display:block;font:bold 18px/1.3 var(--ui);color:#fff;-webkit-text-stroke:0;text-shadow:2px 2px 0 #000;margin:2px 0}
    @keyframes bz-bob{50%{transform:translateY(-4px)}}
    .bz-tb{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-bottom:6px}
    .bz .bz-tb .btn{min-height:48px;min-width:120px;font:bold 16px var(--ui)}
    .bz .bz-tb .btn.bz-go{font-size:20px;min-width:160px}
    .bz-pub{color:#fff;font-size:11px;text-shadow:1px 1px 0 #000;margin-bottom:4px}
    .bz-panel{background:#fff8e0;border:3px solid #6a3a00;border-radius:10px;box-shadow:3px 4px 0 rgba(0,0,0,.4);padding:8px 10px;max-width:640px;width:100%;box-sizing:border-box;color:#222;margin:auto}
    .bz-panel h2{margin:0 0 6px;font:bold 18px var(--ui);color:#6a1a00;text-align:center}
    .bz-ph{display:flex;align-items:center;gap:8px;margin-bottom:6px}
    .bz-ph h2{flex:1;margin:0}
    .bz .bz-ph .btn{min-height:44px;min-width:64px;font-weight:bold}
    .bz-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(92px,1fr));gap:6px}
    .bz .bz-pc.btn{min-width:0;padding:4px 2px 2px;display:flex;flex-direction:column;align-items:center;gap:2px;font-weight:bold;font-size:12px}
    .bz .bz-pc canvas{width:100%;max-width:96px;aspect-ratio:4/3;image-rendering:pixelated;border:2px solid #fff;outline:1px solid #888;background:#ccc}
    .bz-fact{margin-top:8px;min-height:2.6em;background:#fff;border:2px dashed #c98a4a;border-radius:6px;padding:6px 8px;font-weight:bold;line-height:1.3}
    .bz-mpanel{max-width:var(--bzmw,640px)}
    .bz-mgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
    .bz .bz-card.btn{min-width:0;padding:3px;aspect-ratio:4/3;display:flex;align-items:center;justify-content:center;position:relative}
    .bz .bz-card.btn canvas{width:100%;height:100%;image-rendering:pixelated;pointer-events:none}
    .bz-back{width:100%;height:100%;border-radius:4px;background:repeating-linear-gradient(45deg,var(--bzk1) 0 6px,var(--bzk2) 6px 12px);box-shadow:inset 0 0 0 3px #fff}
    .bz .bz-card.bz-got{opacity:.85;outline:3px solid #3fae4a;outline-offset:-3px}
    .bz-end{justify-content:center}
    .bz-end p{margin:4px 0 10px;text-align:center;font-weight:bold;line-height:1.35}
    .bz-tall .bz-wrap{overflow:visible}
    .bz-tall .bz-bub{max-width:94%}
    .bz-tall .bz-nav{top:calc(100% + 8px);flex-direction:row;max-width:48%;min-height:48px;font-size:13px;gap:4px;padding:3px 8px}
    .bz-tall .bz-tip{top:calc(100% + 64px);max-width:calc(100% - 12px)}
    .bz-tall.bz-mg .bz-tip{top:auto;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%);max-width:calc(100% - 12px)}
    .bz-tall .bz .bz-x.btn,.bz-tall .bz-x.btn{top:calc(100% + 8px);right:6px}
    .bz-tall .bz-nums{bottom:auto;top:calc(100% + 8px);right:80px}
    .bz-tall .bz-photo{bottom:auto;top:calc(100% + 64px)}
    @media (max-width:430px){
      .bz-logo{font-size:34px}
      .bz-mpanel{max-width:var(--bzmw,640px)}
    .bz-mgrid{grid-template-columns:repeat(3,1fr)}
      .bz-grid{grid-template-columns:repeat(3,1fr)}
      .bz .bz-tb .btn{min-width:100px}
    }
  `;

  function openZoo(W, api) {
    const esc = api.esc;
    let dead = false, raf = 0;
    const timers = new Set();
    const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); if (!dead) fn(); }, ms); timers.add(id); return id; };
    const sleep = ms => new Promise(r => later(r, ms));
    const rnd = n => Math.floor(Math.random() * n);
    const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

    /* ---------- saved state ---------- */
    const RING = ['gate', 'snack', 'reptile', 'penguin', 'seal', 'giraffe', 'monkey', 'parade'];
    const fresh = () => ({ v: 1, scene: 'gate', inv: [], f: {}, hat: false, done: false });
    let S = Object.assign(fresh(), api.load('state', null) || {});
    if (!S.f || typeof S.f !== 'object') S.f = {};
    S.inv = Array.isArray(S.inv) ? S.inv.filter(i => ITEMS[i]) : [];
    if (!RING.includes(S.scene)) S.scene = 'gate';
    let album = (api.load('album', []) || []).filter(id => ANIMALS.some(a => a.id === id));
    const opt = Object.assign({ music: true, talk: true }, api.load('opt', {}) || {});
    const save = () => { api.save('state', S); api.save('album', album); };
    const F = () => S.f;
    const has = i => S.inv.includes(i);
    const addItem = i => { if (!has(i)) S.inv.push(i); selItem = null; renderInv(); save(); snd.pop(); };
    const takeItem = i => { S.inv = S.inv.filter(x => x !== i); if (selItem === i) selItem = null; renderInv(); save(); };
    let sessionEarn = 0;
    const earnMini = () => { if (sessionEarn < 3) { sessionEarn++; api.earn(1, 'a Beep zoo game'); } };

    /* ---------- sound ---------- */
    const tn = (f, d, o) => api.tone(f, d, o);
    const snd = {
      honk() { tn(392, 0.13, { type: 'square', vol: 0.06 }); tn(330, 0.22, { type: 'square', vol: 0.06, at: 0.16 }); },
      boop() { tn(320, 0.18, { type: 'sine', vol: 0.09, to: 200 }); },
      yay() { [72, 76, 79, 84].forEach((n, i) => tn(api.midi(n), 0.2, { type: 'triangle', vol: 0.08, at: i * 0.09, decay: 1 })); },
      pop() { tn(500, 0.07, { type: 'sine', vol: 0.09, to: 1200 }); },
      snap() { api.noise(0.04, { ft: 'highpass', f: 3000, vol: 0.14, decay: 1 }); api.noise(0.07, { at: 0.07, ft: 'highpass', f: 1800, vol: 0.1, decay: 1 }); },
      splash() { api.noise(0.5, { ft: 'lowpass', f: 1400, vol: 0.12, decay: 1 }); },
      boom() { tn(110, 0.3, { type: 'sine', vol: 0.12, to: 50, decay: 1 }); api.noise(0.1, { ft: 'lowpass', f: 400, vol: 0.12, decay: 1 }); },
      toot() { tn(233, 0.45, { type: 'sawtooth', vol: 0.045, to: 262 }); tn(349, 0.5, { type: 'sawtooth', vol: 0.04, at: 0.4 }); },
      vroom() { tn(80, 0.5, { type: 'sawtooth', vol: 0.035, to: 170 }); },
      slide() { tn(1000, 0.5, { type: 'sine', vol: 0.06, to: 300 }); },
      squawk() { tn(1300, 0.1, { type: 'square', vol: 0.035, to: 800 }); tn(1200, 0.12, { type: 'square', vol: 0.035, to: 700, at: 0.13 }); },
      hiss() { api.noise(0.6, { ft: 'highpass', f: 4000, vol: 0.06 }); },
      arf() { tn(420, 0.09, { type: 'square', vol: 0.05, to: 300 }); tn(420, 0.09, { type: 'square', vol: 0.05, to: 300, at: 0.15 }); },
      crank() { for (let i = 0; i < 8; i++) api.noise(0.04, { at: i * 0.12, f: 900, q: 3, vol: 0.2, decay: 1 }); },
      munch() { for (let i = 0; i < 5; i++) api.noise(0.05, { at: i * 0.17, f: 1500, vol: 0.12, decay: 1 }); },
      note(n, at) { tn(api.midi(n), 0.35, { type: 'triangle', vol: 0.07, at: at || 0, decay: 1 }); },
      tick() { tn(880, 0.06, { type: 'triangle', vol: 0.07, decay: 1 }); },
      whee() { tn(400, 0.4, { type: 'triangle', vol: 0.06, to: 900 }); }
    };
    const TUNE = { mel: [72, 0, 76, 0, 79, 0, 76, 0, 77, 0, 74, 0, 71, 0, 74, 0, 72, 0, 76, 0, 79, 0, 84, 0, 83, 81, 79, 77, 76, 0, 0, 0], bass: [48, 48, 43, 43, 48, 48, 43, 48], step: 0.26, lead: 'triangle', leadVol: 0.022, bassVol: 0.035, gain: 0.45, hold: 0.7 };
    const MARCH = { mel: [67, 0, 72, 72, 76, 0, 72, 0, 74, 0, 71, 71, 67, 0, 0, 0, 67, 0, 72, 72, 76, 0, 79, 0, 77, 76, 74, 72, 72, 0, 0, 0], bass: [48, 55, 43, 55, 48, 55, 43, 48], step: 0.17, lead: 'square', leadVol: 0.02, bassVol: 0.04, gain: 0.45, hold: 0.6 };
    let curTune = null;
    const music = tune => { curTune = tune; if (opt.music && tune) api.playMusic(tune); else api.stopMusic(); };

    /* ---------- DOM ---------- */
    W.body.innerHTML = `<div class="bz">
      <div class="bz-stage">
        <div class="bz-wrap"><canvas width="${LW}" height="${LH}" aria-label="Zoo scene. Click things to explore."></canvas>
          <div class="bz-tip" hidden></div><div class="bz-bub" hidden></div>
          <button class="bz-nav bz-l">${ARROW(-1)}<span></span></button><button class="bz-nav bz-r">${ARROW(1)}<span></span></button>
          <div class="bz-scn"></div><div class="bz-photo" hidden></div>
          <button class="btn bz-x" hidden>Done</button><div class="bz-nums" hidden></div>
        </div>
        <div class="bz-ov" hidden></div>
      </div>
      <div class="bz-bar raised">
        <button class="btn bz-big bz-honk" title="Honk for a hint" aria-label="Honk the horn for a hint">${HONK}</button>
        <div class="bz-glove sunken" aria-label="Glovebox"><div class="bz-items"></div></div>
        <button class="btn bz-big bz-albtn" title="Photo Album" aria-label="Photo Album">${ALBUM}</button>
      </div></div>`;
    const q = s => W.body.querySelector(s);
    const root = q('.bz');
    const stage = q('.bz-stage'), wrap = q('.bz-wrap'), cv = q('canvas'), ctx = cv.getContext('2d');
    const tipEl = q('.bz-tip'), bub = q('.bz-bub'), navL = q('.bz-l'), navR = q('.bz-r'), scn = q('.bz-scn'), photo = q('.bz-photo');
    const xBtn = q('.bz-x'), nums = q('.bz-nums'), ov = q('.bz-ov'), itemsEl = q('.bz-items'), albBtn = q('.bz-albtn'), honkBtn = q('.bz-honk');
    let sc = 2;
    function layout() {
      const w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return;
      let sw = w, sh = w * LH / LW; if (sh > h) { sh = h; sw = h * LW / LH; }
      sw = Math.floor(sw); sh = Math.floor(sh);
      wrap.style.width = sw + 'px'; wrap.style.height = sh + 'px'; sc = sw / LW;
      const tall = h - sh >= 150;
      root.classList.toggle('bz-tall', tall);
      wrap.style.fontSize = (tall ? 14 : clamp(sw / 36, 11, 17)) + 'px';
      const cols = w < 430 ? 3 : 4, rows = 12 / cols, cw = Math.max(60, Math.min((w - 50) / cols, (h - 150) / rows * 4 / 3));
      stage.style.setProperty('--bzmw', Math.round(cols * (cw + 6) + 30) + 'px');
    }
    let ro = null;
    if (window.ResizeObserver) { ro = new ResizeObserver(layout); ro.observe(stage); }
    layout();

    /* ---------- speech ---------- */
    const WHO = {
      beep: { n: 'Beep', c: '#c05a00', p: 1.7, r: 1.1, at: () => [beep.x, 146] },
      opal: { n: 'Zookeeper Opal', c: '#2f6a20', p: 1.1, r: 1, at: () => S.scene === 'parade' ? [250, 112] : [A.opalX, 112] },
      rosie: { n: 'Rosie', c: '#b0281e', p: 1.3, r: 1.05, at: () => [160, 76] },
      moss: { n: 'Old Moss', c: '#3d5f2c', p: 0.5, r: 0.8, at: () => [A.mossX + 10, 138] },
      pip: { n: 'Pip the penguin', c: '#1a1a6a', p: 1.9, r: 1.15, at: () => [150, 112] },
      sandy: { n: 'Sandy the seal', c: '#3b5a7a', p: 1.4, r: 1.05, at: () => [170, 110] },
      tall: { n: 'Tallulah', c: '#9a5a10', p: 1.3, r: 0.95, at: () => [205, S.f.scarf ? 40 : 66] },
      mango: { n: 'Mango the monkey', c: '#7a3a10', p: 1.8, r: 1.2, at: () => [220, 130] },
      trumpet: { n: 'Captain Trumpet', c: '#a01818', p: 0.6, r: 0.95, at: () => [195, 100] },
      sid: { n: 'Sid the snake', c: '#1f6a2a', p: 0.9, r: 0.9, at: () => [60, 70] },
      kiki: { n: 'Kiki the chameleon', c: '#2f7a20', p: 1.6, r: 1.1, at: () => [148, 76] },
      pepper: { n: 'Pepper the parrot', c: '#b0281e', p: 2, r: 1.2, at: () => [292, 104] },
      flora: { n: 'Flora the flamingo', c: '#c0406a', p: 1.5, r: 1, at: () => [42, 96] }
    };
    const parX = {};
    const anchor = k => (mode === 'parade' && parX[k]) ? parX[k] : WHO[k].at();
    let talking = null, skipFn = null, settling = false;
    const speak = (text, k) => { if (!opt.talk) return; const w = WHO[k] || WHO.beep; api.say(text, { pitch: w.p, rate: w.r }); };
    function hush() { try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) { /* ignore */ } }
    function placeBubble(k) {
      if (bub.hidden) return;
      const [ax, ay] = anchor(k), px = ax * sc, py = ay * sc, bw = bub.offsetWidth, bh = bub.offsetHeight, ww = wrap.clientWidth, wh = wrap.clientHeight;
      const left = clamp(px - bw / 2, 4, Math.max(4, ww - bw - 4));
      let top = py - bh - 12, dn = false;
      if (root.classList.contains('bz-tall')) top = Math.max(-wrap.offsetTop + 2, -bh - 12);
      else {
        if (top < 4) { top = py + 12; dn = true; }
        top = clamp(top, 2, Math.max(2, wh - bh - 2));
      }
      bub.style.left = left + 'px'; bub.style.top = top + 'px'; bub.classList.toggle('bz-dn', dn);
      bub.lastChild.style.left = clamp(px - left, 14, bw - 14) + 'px';
    }
    function line(k, text) {
      return new Promise(res => {
        if (dead || settling) { res(); return; }
        const w = WHO[k] || WHO.beep;
        bub.innerHTML = `<b style="color:${w.c}">${esc(w.n)}</b>${esc(text)}<i></i>`;
        bub.hidden = false; talking = k; placeBubble(k); speak(text, k);
        let done = false;
        const fin = skip => { if (done) return; done = true; clearTimeout(tm); timers.delete(tm); skipFn = null; talking = null; bub.hidden = true; if (skip) hush(); res(); };
        const tm = later(() => fin(false), Math.max(1800, 650 + text.length * 64));
        skipFn = () => fin(true);
      });
    }
    function tip(text, quiet) {
      tipEl.hidden = !text; tipEl.textContent = text || '';
      if (text && !quiet) speak(text, 'beep');
    }

    /* ---------- animation state ---------- */
    let mode = 'title', busy = 0, selItem = null, kbd = -1, fade = 0;
    const beep = { x: 60, tx: 60, dir: 1, rot: 0, res: null, hop: 0 };
    const A = { opalX: 252, mossX: 250, reach: 0, map: null, bal: null, lamp: 0, cham: 0, crank: 0 };
    const pk = {}; const poke = id => { pk[id] = T; }; const jig = id => Math.max(0, 1 - (T - (pk[id] || -9)) / 0.9);
    const cnt = {}; const cyc = (id, arr) => { cnt[id] = cnt[id] || 0; return arr[cnt[id]++ % arr.length]; };
    const fxs = [], conf = [];
    const fx = (dur, draw) => new Promise(res => fxs.push({ t0: T, dur, draw, res }));
    const tween = (o, k, to, dur) => { const fr = o[k]; return fx(dur, p => { o[k] = fr + (to - fr) * (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2); }).then(() => { o[k] = to; }); };
    function burst(x, y, n) { const cs = ['#e8352e', '#ffd23f', '#3fae4a', '#2e6fe2', '#b04ae0', '#ff8fb1']; for (let i = 0; i < n; i++) conf.push({ x, y, vx: (Math.random() - 0.5) * 120, vy: -40 - Math.random() * 90, c: cs[i % cs.length], life: 1.4 + Math.random() }); }
    function driveTo(x) {
      return new Promise(res => {
        x = Math.round(x);
        if (dead || Math.abs(beep.x - x) < 1) { beep.x = x; beep.tx = x; res(); return; }
        if (beep.res) beep.res();
        beep.tx = x; beep.dir = x > beep.x ? 1 : -1; beep.res = res;
      });
    }
    async function snap(id) {
      if (album.includes(id)) return;
      album.push(id); save(); snd.snap();
      fx(0.35, p => { g.fillStyle = `rgba(255,255,255,${0.9 * (1 - p)})`; g.fillRect(0, 0, LW, LH); });
      const a = ANIMALS.find(x => x.id === id);
      photo.textContent = 'New photo: ' + a.n + '!'; photo.hidden = false;
      albBtn.classList.remove('bz-pulse'); void albBtn.offsetWidth; albBtn.classList.add('bz-pulse');
      later(() => { photo.hidden = true; }, 2600);
    }
    function run(fn) {
      if (busy || dead) return;
      busy++; updNav();
      Promise.resolve().then(fn).catch(e => console.error(e)).then(() => { busy = Math.max(0, busy - 1); updNav(); if (!dead) save(); });
    }

    /* ---------- scenes ---------- */
    const SC = {};
    // FRONT GATE
    SC.gate = {
      name: 'Front Gate',
      bg(t) {
        sky('#4fb6ff', '#c8f0ff', 120); sunS(28, 24, t, jig('sun')); clouds(t, 20);
        for (let i = 0; i < 12; i++) C(i * 30 + 8, 112, 16, i % 2 ? '#2e8b3e' : '#35a046');
        R(0, 112, LW, 58, '#5cc84a'); tufts(120, '#3fae4a'); flowers(160);
        E(44, 152, 40, 11, '#3aa0e0'); E(44, 150, 33, 7, '#6cc4f4'); E(44 + Math.sin(t) * 10, 151, 6, 1.2, '#bfe8ff');
        const j = jig('sign');
        R(117, 62, 20, 108, '#b86b3c'); R(213, 62, 20, 108, '#b86b3c');
        for (let y = 70; y < 168; y += 9) { L(117, y, 137, y, '#8a4a20'); L(213, y, 233, y, '#8a4a20'); }
        R(114, 58, 26, 6, '#8a4a20'); R(210, 58, 26, 6, '#8a4a20');
        g.strokeStyle = '#e8402a'; g.lineWidth = 12; g.lineCap = 'butt'; g.beginPath(); g.arc(175, 90, 50, Math.PI * 1.08, Math.PI * 1.92); g.stroke();
        g.save(); g.translate(175, 40); g.rotate(Math.sin(t * 25) * 0.06 * j);
        RR(-40, -12, 80, 24, 5, '#ffd23f', '#6a3a00'); TX('ZOO', 0, 1, 18, '#e8402a', '#6a1a00');
        spr(penguinS, -30, 8, 0.7, 1, t, {}); spr(monkeyS, 31, 9, 0.6, 1, t, {});
        g.restore();
        R(274, 112, 42, 57, '#e8402a'); P([270, 112, 295, 94, 320, 112], '#ffd23f', '#6a3a00');
        R(280, 122, 30, 18, '#bfefff'); R(280, 122, 30, 2, '#fff'); R(274, 146, 42, 4, '#8a1a1a');
        const b = A.bal;
        [['#e8352e', 282, 70], ['#2e6fe2', 292, 64], ['#ffd23f', 302, 72], ['#b04ae0', 312, 66]].forEach(([c, x, y], i) => {
          let yy = y + Math.sin(t * 2 + i) * 2; if (b && b.i === i) yy -= b.p * 90;
          L(296, 96, x, yy + 7, '#555', 0.6); E(x, yy, 5, 6.5, c, 0, OL); C(x - 1.5, yy - 2.5, 1.3, 'rgba(255,255,255,.6)');
        });
        const lid = jig('trash') * 6;
        R(95, 148, 14, 21, '#3a7d44'); L(99, 151, 99, 166, '#2a5d34'); L(105, 151, 105, 166, '#2a5d34');
        R(93, 145 - lid, 18, 3, '#2a5d34'); R(100, 143 - lid, 4, 2, '#2a5d34');
        road();
      },
      fg(t) {
        spr(flamingoS, 30, 152, 1, 1, t, { nod: jig('flam') > 0 }); spr(flamingoS, 58, 150, 0.9, -1, t + 1, {});
        if (!F().opal) spr(opalS, A.opalX, 168 - bounce('opal'), 1, A.opalX > 262 ? 1 : -1, t, { wave: talking === 'opal', walk: A.opalX > 253 });
      },
      spots() {
        const s = [
          { id: 'sun', x: 10, y: 6, w: 40, h: 40, act: async () => { poke('sun'); snd.whee(); await line('beep', cyc('sun', ['The sun is smiling! It\'s a perfect day for a parade.', 'Hello, Mister Sun! Thanks for the sunshine!'])); } },
          { id: 'flam', x: 10, y: 96, w: 68, h: 58, who: 'flora', act: async () => { snap('flamingo'); poke('flam'); snd.note(79); snd.note(84, 0.15);
            await line('flora', cyc('flam', ['Hello, Beep! I\'m Flora the flamingo.', 'Why do flamingos stand on one leg? Because if we lifted both legs, we would fall down!', 'I practice my parade dance every morning. Step, step, wiggle!'])); } },
          { id: 'sign', x: 135, y: 26, w: 80, h: 28, act: async () => { poke('sign'); snd.note(72); snd.note(76, 0.12); snd.note(79, 0.24); await line('beep', 'Z, O, O. Zoo! Welcome to Pebble Park Zoo!'); } },
          { id: 'booth', x: 272, y: 108, w: 46, h: 60, act: async () => { api.sfx.ding(); await line('beep', cyc('booth', ['Ding! Today everybody gets into the zoo for free, because it\'s parade day!', 'The ticket booth has a little bell. Ding ding!'])); } },
          { id: 'bal', x: 274, y: 54, w: 44, h: 36, act: async () => { if (A.bal) return; const i = rnd(4); A.bal = { i, p: 0 }; snd.whee(); fx(2.4, p => { A.bal.p = Math.sin(p * Math.PI); }).then(() => { A.bal = null; }); await line('beep', cyc('bal', ['Whoa! A balloon is floating away! Oh, good, it came back.', 'Up, up, up... and back down again!'])); } },
          { id: 'trash', x: 88, y: 138, w: 26, h: 32, act: async () => { poke('trash'); snd.munch(); await line('beep', cyc('trash', ['Munch munch! The trash can says: thank you for keeping the zoo clean!', 'Remember: wrappers go in the trash can, not on the ground.'])); } }
        ];
        if (!F().opal) s.push({ id: 'opal', x: A.opalX - 14, y: 104, w: 28, h: 66, who: 'opal', act: talkOpal, use: { map: giveMap } });
        return s;
      }
    };
    async function intro() {
      beep.x = -30; beep.tx = -30; snd.vroom();
      await driveTo(170);
      await line('beep', 'Beep beep! Hello, zoo! I\'m Beep, and I love visiting my animal friends!');
      await line('opal', 'Beep! Thank goodness you\'re here! Today is the big Animal Parade, but everything is going wrong!');
      await line('opal', 'The wind blew my zoo map away. The parade drum is missing. The penguins\' ice machine is broken.');
      await line('opal', 'And poor Tallulah the giraffe lost her favorite scarf! Can you help us, Beep?');
      await line('beep', 'Don\'t worry, Opal! I\'ll help! Click on anything to explore the zoo with me.');
      await line('beep', 'If you need help, click my horn and I\'ll honk a hint!');
      F().intro = true; save();
    }
    async function talkOpal() {
      if (has('map')) { await line('opal', 'Is that my map in your glovebox? Please give it to me, Beep!'); return; }
      await line('opal', cyc('opal', ['The wind blew my map away. I think it flew toward the Giraffe Yard!', 'Remember, we need the drum, ice for the penguins, Tallulah\'s scarf, and my map. You can do it, Beep!', 'Use the signs on the sides to drive around the zoo.']));
    }
    async function giveMap() {
      takeItem('map'); snd.yay();
      await line('opal', 'My map! Thank you, Beep! Now I know the parade route.');
      await line('opal', 'I\'ll go get the Parade Ground ready. See you there!');
      await tween(A, 'opalX', 350, 2.2);
      F().opal = true; A.opalX = 252; save();
      await line('beep', 'Wheely wonderful! Opal has her map back!');
    }

    // SNACK SHACK
    SC.snack = {
      name: 'Snack Shack',
      bg(t) {
        sky('#6ec6ff', '#fff0c8', 120); clouds(t, 18);
        for (let i = 0; i < 12; i++) C(i * 30 + 16, 114, 14, i % 2 ? '#2e8b3e' : '#35a046');
        R(0, 114, LW, 56, '#6fd05a'); tufts(122, '#4fb03a');
        R(92, 56, 4, 58, '#8a5a2a'); R(224, 56, 4, 58, '#8a5a2a');
        R(96, 64, 128, 46, '#ffe9a8');
        R(176, 72, 40, 26, '#333'); R(178, 74, 36, 22, '#2a4a3a');
        spr(ITEMS.banana.d, 180, 76, 0.5); spr(ITEMS.lettuce.d, 196, 76, 0.5);
        for (let i = 0; i < 10; i++) {
          const x = 90 + i * 14;
          P([x, 50, x + 14, 50, x + 14, 62, x, 62], i % 2 ? '#fff' : '#e8402a');
          g.fillStyle = i % 2 ? '#fff' : '#e8402a'; g.beginPath(); g.arc(x + 7, 62, 7, 0, Math.PI); g.fill();
        }
        RR(118, 32, 84, 17, 3, '#2e6fe2', '#10306a'); TX('SNACKS', 160, 41, 11, '#fff', '#10306a');
        // popcorn machine
        R(102, 84, 24, 24, '#e8352e'); R(105, 87, 18, 17, '#fff8e0');
        for (let i = 0; i < 12; i++) C(107 + (i * 5) % 15, 101 - Math.floor(i / 3) * 3, 1.6, '#fff5c0');
        R(100, 81, 28, 4, '#b0281e');
        // cards table
        R(6, 150, 36, 4, '#8a5a2a'); R(9, 154, 3, 15, '#6b4a2a'); R(36, 154, 3, 15, '#6b4a2a');
        [[10, '#2e6fe2', -0.2], [19, '#e8352e', 0.1], [28, '#2e6fe2', 0.25]].forEach(([x, c, r]) => { g.save(); g.translate(x + 3, 147); g.rotate(r + jig('cards') * Math.sin(t * 30) * 0.3); R(-4, -5, 8, 10, c); R(-3, -4, 6, 8, 'rgba(255,255,255,.3)'); g.restore(); });
        // perch
        R(299, 130, 2, 39, '#6b4a2a'); R(288, 129, 24, 3, '#6b4a2a'); R(293, 166, 14, 3, '#6b4a2a');
        road();
      },
      fg(t) {
        spr(rosieS, 160, 108 - bounce('rosie'), 1, 1, t);
        R(88, 106, 144, 6, '#8a5a2a'); R(92, 112, 136, 57, '#e8402a');
        for (let x = 98; x < 228; x += 14) R(x, 112, 6, 57, '#fff');
        // popcorn bits
        R(46, 152, 38, 17, '#b8804a'); L(46, 158, 84, 158, '#8a5a2a'); L(46, 164, 84, 164, '#8a5a2a');
        for (let i = 0; i < 4; i++) { g.strokeStyle = '#f5c518'; g.lineWidth = 4; g.beginPath(); g.arc(54 + i * 8, 144, 8, 0.5, 2.2); g.stroke(); }
        R(238, 152, 40, 17, '#b8804a'); L(238, 158, 278, 158, '#8a5a2a'); L(238, 164, 278, 164, '#8a5a2a');
        for (let i = 0; i < 4; i++) { C(245 + i * 9, 150, 6, '#3fae4a', '#1f6a2a'); C(245 + i * 9, 148, 3, '#a8e86a'); }
        spr(parrotS, 300, 129 - bounce('pepper'), 1, -1, t, { talk: talking === 'pepper' });
      },
      spots() {
        return [
          { id: 'sign', x: 118, y: 30, w: 84, h: 20, act: async () => { snd.note(76); await line('beep', 'S, N, A, C, K, S. Snacks! Yum!'); } },
          { id: 'rosie', x: 136, y: 72, w: 40, h: 36, who: 'rosie', act: talkRosie },
          { id: 'pop', x: 98, y: 78, w: 32, h: 32, act: async () => {
            for (let k = 0; k < 3; k++) later(() => { snd.pop(); const ps = [...Array(6)].map(() => ({ vx: (Math.random() - 0.5) * 60, vy: -50 - Math.random() * 40 })); fx(1, p => ps.forEach(o => C(114 + o.vx * p, 86 + o.vy * p + 90 * p * p, 1.8, '#fff5c0', '#c8a040'))); }, k * 250);
            await line('beep', cyc('pop', ['Pop, pop, pop! Popcorn is a snack for people. The animals have their own special food.', 'Popcorn goes up, and popcorn comes down!'])); } },
          { id: 'ban', x: 42, y: 132, w: 46, h: 38, act: async () => {
            if (!has('banana') && !F().monkeys) { addItem('banana'); await line('beep', 'A big bunch of bananas! Into my glovebox they go.'); }
            else await line('rosie', F().monkeys ? 'The monkeys already had their bananas. They were very happy!' : 'You already have bananas in your glovebox, Beep!'); } },
          { id: 'let', x: 234, y: 136, w: 48, h: 34, act: async () => {
            if (!has('lettuce') && !F().moss) { addItem('lettuce'); await line('beep', 'Fresh, crunchy lettuce! I\'ll keep it in my glovebox.'); }
            else await line('rosie', F().moss ? 'Old Moss already ate his lettuce. What a happy tortoise!' : 'You already have some lettuce, Beep!'); } },
          { id: 'cards', x: 2, y: 132, w: 42, h: 38, act: async () => { poke('cards'); await line('rosie', 'Let\'s play my Animal Match game! Find two cards that are the same.'); startMemory(); } },
          { id: 'parrot', x: 284, y: 100, w: 32, h: 32, who: 'pepper', act: async () => { snap('parrot'); snd.squawk(); await line('pepper', cyc('parrot', ['Squawk! Beep beep! Beep beep!', 'Hello! Hello! I\'m Pepper! Pretty Beep!', 'Squawk! Honk honk! I can copy sounds!'])); } }
        ];
      }
    };
    async function talkRosie() {
      if (!cnt.rosie) { cnt.rosie = 1; await line('rosie', 'Hi, Beep! I\'m Rosie. The Snack Shack is ready for the parade.'); await line('rosie', 'The bananas and the lettuce are for the animals. Help yourself!'); return; }
      await line('rosie', cyc('rosie2', ['What do you call a banana that likes to dance? A banana split!', 'Want to play my Animal Match game? Click the cards on the little table!', 'Everybody needs a good snack. Even a little car like you!']));
    }

    // REPTILE HOUSE
    const CHAM = ['#5cc84a', '#ffb52e', '#e8352e', '#2e9fe2', '#b04ae0', '#ffd23f'];
    SC.reptile = {
      name: 'Reptile House',
      bg(t) {
        R(0, 0, LW, 150, '#2d6a4f'); for (let y = 12; y < 150; y += 14) for (let x = (y / 14 % 2) * 16; x < LW; x += 32) R(x + 1, y + 1, 30, 12, '#357a5b');
        R(0, 0, LW, 10, '#1b4332');
        // lamp
        L(150, 10, 150, 20, '#222', 1); P([141, 28, 159, 28, 154, 20, 146, 20], '#555');
        const glow = 0.25 + A.lamp * 0.3 + Math.sin(t * 3) * 0.03; g.fillStyle = `rgba(255,220,120,${glow})`; g.beginPath(); g.moveTo(143, 28); g.lineTo(157, 28); g.lineTo(190, 100); g.lineTo(110, 100); g.closePath(); g.fill();
        C(150, 29, 3, '#fff6b0');
        // snake tank
        R(14, 56, 82, 66, '#6b4a2a'); R(18, 60, 74, 58, '#9fd8c8'); R(18, 106, 74, 12, '#d8b56a'); E(36, 106, 10, 5, '#888');
        // branch
        L(100, 98, 186, 88, '#6b4a2a', 4); L(170, 90, 182, 78, '#6b4a2a', 2); E(182, 76, 5, 3, '#3fae4a'); E(104, 94, 5, 3, '#3fae4a', 0.5);
        // floor
        R(0, 150, LW, 20, '#d9b36e'); R(196, 146, 124, 5, '#b08050');
        road('#caa36a');
        if (F().moss && !has('crank') && !F().ice) { L(246, 166, 256, 156, '#9aa0a8', 3); L(256, 156, 260, 160, '#9aa0a8', 3); C(261, 162, 2.5, '#e8352e', OL); }
        else if (!F().moss) { L(222, 164, 228, 160, '#9aa0a8', 3); C(221, 165, 2.5, '#e8352e', OL); }
      },
      fg(t) {
        spr(snakeS, 64, 110, 1, 1, t, { hiss: talking === 'sid' });
        g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(22, 62, 4, 50); g.fillRect(30, 62, 2, 50);
        spr(chamS, 140, 94, 1.3, 1, t, { c: CHAM[A.cham % CHAM.length], roll: talking === 'kiki' || jig('cham') > 0 });
        spr(tortoiseS, A.mossX, 166 - bounce('moss'), 1.3, 1, t, { walk: A.mossWalk, munch: F().moss && jig('moss') > 0 });
      },
      spots() {
        const s = [
          { id: 'lamp', x: 136, y: 10, w: 28, h: 26, act: async () => { tween(A, 'lamp', 1, 0.3).then(() => tween(A, 'lamp', 0, 1.2)); snd.tick(); await line('beep', 'Reptiles like to warm up under a warm lamp, or in the sunshine.'); } },
          { id: 'snake', x: 14, y: 56, w: 82, h: 66, who: 'sid', act: async () => { snap('snake'); snd.hiss(); await line('sid', cyc('sid', ['Hisss-ello, Beep! I\'m Sid.', 'What\'s my favorite subject at school? Hisss-tory!', 'I don\'t have legs, but I can still get around. I slither!'])); } },
          { id: 'cham', x: 112, y: 74, w: 60, h: 28, who: 'kiki', act: async () => { snap('chameleon'); A.cham++; poke('cham'); snd.note(76 + A.cham % 5); await line('kiki', cyc('kiki', ['Hi! I\'m Kiki. Watch me change color! Ta-da!', 'I can look at you and at the lamp at the same time!', 'Click me again for a brand new color!'])); } },
          { id: 'moss', x: A.mossX - 26, y: 136, w: 56, h: 32, who: 'moss', act: talkMoss, use: { lettuce: feedMoss } }
        ];
        if (F().moss && !has('crank') && !F().ice) s.push({ id: 'crank', x: 238, y: 148, w: 30, h: 24, act: async () => { addItem('crank'); await line('beep', 'A crank handle! It looks like a piece of a machine. Into the glovebox!'); } });
        return s;
      }
    };
    async function talkMoss() {
      snap('tortoise');
      if (!F().moss) {
        await line('moss', cyc('moss1', ['Hello there, young Beep. I\'m Old Moss. I\'m sitting on something lumpy, but I\'m too hungry to move.', 'Mmm... I would love some crunchy, green lettuce.', 'My tummy is rumbling. Rumble, rumble.']));
        return;
      }
      poke('moss');
      await line('moss', cyc('moss2', ['That lettuce was delicious. Thank you, Beep!', 'I\'m not slow. I\'m just enjoying the view.', 'I\'ll be in the parade too. I might be the last one to arrive!']));
    }
    async function feedMoss() {
      takeItem('lettuce'); snap('tortoise'); snd.munch(); poke('moss');
      await line('moss', 'Crunchy lettuce! My favorite! Thank you, Beep!');
      A.mossWalk = true; await tween(A, 'mossX', 292, 2.6); A.mossWalk = false;
      F().moss = true; save();
      await line('beep', 'Look! Old Moss was sitting on a crank handle!');
    }

    // PENGUIN POOL
    const SLIDERS = [0, 1.3, 2.6];
    SC.penguin = {
      name: 'Penguin Pool',
      bg(t) {
        sky('#8fd3ff', '#eefaff', 116); clouds(t, 16);
        P([0, 112, 40, 70, 80, 112], '#d8ecfa'); P([50, 112, 100, 60, 150, 112], '#e8f6ff'); P([120, 112, 170, 80, 210, 112], '#d8ecfa'); P([90, 72, 100, 60, 110, 72], '#fff');
        R(0, 112, LW, 58, '#f4fbff'); for (let i = 0; i < 8; i++) E(20 + i * 42, 120 + (i % 3) * 6, 12, 2, '#dcecf8');
        E(110, 148, 72, 14, '#2e8ee0'); E(110, 146, 64, 10, '#5cb4f4');
        for (let i = 0; i < 3; i++) { const r = ((t * 12 + i * 20) % 60); g.strokeStyle = `rgba(255,255,255,${1 - r / 60})`; g.lineWidth = 1; g.beginPath(); g.ellipse(100, 147, r, r / 5, 0, 0, TAU); g.stroke(); }
        // snowman
        const hj = jig('snowman') * 8;
        C(30, 150, 12, '#fff', '#b8d0e8'); C(30, 132, 9, '#fff', '#b8d0e8'); C(27, 130, 1, '#222'); C(33, 130, 1, '#222'); P([30, 133, 37, 134, 30, 135], '#ff8a1a');
        R(24, 118 - hj, 12, 8, '#222'); R(21, 125 - hj, 18, 2, '#222'); R(24, 123 - hj, 12, 2, '#e8352e');
        if (!F().ice) { C(22, 160, 3, '#bfe8ff'); }
        // machine
        const ice = F().ice;
        if (ice) { P([210, 136, 220, 136, 174, 153, 160, 153], '#9fd8f8', '#5a98c8'); for (let i = 0; i < 6; i++) { const p = ((t * 0.8 + i / 6) % 1); R(214 - p * 44, 133 + p * 15, 3, 3, '#fff'); } }
        RR(222, 82, 48, 86, 5, '#4aa3df', '#1a4a7a'); R(226, 86, 40, 4, '#1a4a7a');
        C(246, 104, 9, '#fff', '#1a4a7a'); const ang = ice ? -0.4 + Math.sin(t * 2) * 0.6 : 2.4 + Math.sin(t * 12) * 0.1; L(246, 104, 246 + Math.cos(ang - Math.PI / 2) * 7, 104 + Math.sin(ang - Math.PI / 2) * 7, '#e8352e', 1.5);
        TX('ICE', 246, 124, 11, '#fff', '#1a4a7a');
        R(210, 128, 14, 9, '#8aa0b8'); R(208, 136, 16, 2, '#6a8098');
        C(270, 118, 3, '#333');
        if (ice) { const a = A.crank; L(270, 118, 270 + Math.cos(a) * 10, 118 + Math.sin(a) * 10, '#9aa0a8', 3); C(270 + Math.cos(a) * 10, 118 + Math.sin(a) * 10, 2.5, '#e8352e'); A.crank += 0.04; }
        else { for (let i = 0; i < 3; i++) { const p = (t * 0.5 + i / 3) % 1; C(236 + i * 8, 80 - p * 30, 3 + p * 4, `rgba(150,150,160,${0.6 * (1 - p)})`); } }
        if (ice) for (let i = 0; i < 14; i++) { const x = (i * 23 + t * 8) % LW, y = (i * 37 + t * 20) % 110; R(x, y, 2, 2, '#fff'); }
        road('#dce8f0'); for (let i = 0; i < 10; i++) R((i * 41) % LW, 178 + (i * 5) % 16, 4, 2, '#fff');
      },
      fg(t) {
        const ice = F().ice;
        if (ice) {
          SLIDERS.forEach(o => { const p = ((t + o) % 4) / 4; if (p < 0.5) { const q = p * 2; g.save(); g.translate(212 - q * 48, 134 + q * 16); g.rotate(-1.2); penguinS(t, {}); g.restore(); } else if (p < 0.6) { const s = (p - 0.5) * 10; C(158, 150, 3 + s * 6, `rgba(255,255,255,${1 - s})`); if (Math.abs(p - 0.5) < 0.004) { /* splash */ } } });
          spr(penguinS, 70, 138, 1, 1, t, { flap: true }); spr(penguinS, 186, 132, 1, -1, t + 1, { flap: jig('peng') > 0 });
        } else {
          spr(penguinS, 64, 138, 1, 1, t, { sweat: true, walk: jig('peng') > 0 }); spr(penguinS, 82, 136, 1, 1, t + 0.5, { sweat: true, walk: jig('peng') > 0 }); spr(penguinS, 186, 134, 1, -1, t + 1, { sweat: true, walk: jig('peng') > 0 });
        }
        spr(penguinS, 150, 136 - bounce('pip'), 1.15, 1, t, { tie: true, flap: talking === 'pip', sweat: !ice });
      },
      spots() {
        return [
          { id: 'snowman', x: 16, y: 114, w: 30, h: 50, act: async () => { poke('snowman'); snd.whee(); await line('beep', F().ice ? 'Brrr! The snowman is happy the ice machine works again.' : cyc('snow', ['Oh no, the snowman is getting drippy! It\'s too warm today.', 'Hop, hop! The snowman\'s hat jumped!'])); } },
          { id: 'peng', x: 54, y: 114, w: 40, h: 28, who: 'pip', act: async () => { snap('penguin'); poke('peng'); snd.squawk(); await line('pip', F().ice ? cyc('peng2', ['Wheee! Sliding is the best!', 'What do penguins wear on their heads? Ice caps!']) : 'Phew! It\'s so hot! We need our ice!'); } },
          { id: 'pip', x: 138, y: 108, w: 28, h: 32, who: 'pip', act: talkPip },
          { id: 'pool', x: 90, y: 140, w: 50, h: 18, act: async () => { snd.splash(); fx(0.8, p => { for (let i = 0; i < 6; i++) C(115 + Math.cos(i) * 14 * p, 146 - Math.sin(p * Math.PI) * 14 - i % 2 * 4, 2, 'rgba(255,255,255,.9)'); }); await line('beep', 'Splash! Penguins are great swimmers.'); } },
          { id: 'mach', x: 206, y: 80, w: 70, h: 88, act: async () => { if (F().ice) { snd.crank(); await line('beep', 'Whirr, whirr! The ice machine is making lots of ice now.'); } else { snd.boop(); await line('beep', cyc('mach', ['The ice machine is broken! There is an empty hole on its side. A piece is missing.', 'Clunk, clunk. This machine needs a crank handle to turn.'])); } }, use: { crank: fixIce } }
        ];
      }
    };
    async function talkPip() {
      snap('penguin');
      if (!F().ice) {
        await line('pip', cyc('pip1', ['Hi, Beep! I\'m Pip. Our ice machine is broken, and it\'s way too warm! We need ice for our parade float.', 'The ice machine needs its crank handle. We lost it somewhere!']));
        return;
      }
      if (!F().seals && !has('fish')) { addItem('fish'); await line('pip', 'Here\'s a bucket of fish for the seals at Seal Cove. They\'re very hungry!'); return; }
      await line('pip', cyc('pip2', ['Thanks again, Beep! We\'re ready for the parade!', 'What do penguins wear on their heads? Ice caps!', 'Penguins can\'t fly, but we sure can swim and slide!']));
    }
    async function fixIce() {
      takeItem('crank'); snd.crank();
      await line('beep', 'The crank handle fits! Turn, turn, turn...');
      F().ice = true; save(); snd.slide(); burst(246, 90, 20);
      await line('pip', 'Ice! Ice! Hooray! Thank you, Beep! Now we can slide!');
      addItem('fish');
      await line('pip', 'Please take this bucket of fish to the seals at Seal Cove. They\'re very hungry!');
      await line('beep', 'Next stop, Seal Cove! Beep beep!');
    }

    // SEAL COVE
    const SX = [60, 160, 260];
    SC.seal = {
      name: 'Seal Cove',
      bg(t) {
        sky('#7cc8ff', '#dff6ff', 90); sunS(40, 22, t, 0); clouds(t, 26);
        R(0, 86, LW, 84, '#1f78c8'); R(0, 86, LW, 6, '#4aa0e8');
        for (let i = 0; i < 16; i++) { const x = (i * 43 + t * 10) % 340 - 10, y = 96 + (i * 13) % 60; L(x, y, x + 8, y, 'rgba(255,255,255,.55)', 1); }
        E(230, 86, 30, 5, '#3a8a4a');
        R(294, 58, 10, 30, '#fff'); R(294, 66, 10, 5, '#e8352e'); R(294, 78, 10, 5, '#e8352e'); R(292, 52, 14, 6, '#333'); C(299, 55, 3, Math.sin(t * 2) > 0 || jig('light') > 0 ? '#fff38a' : '#886');
        if (jig('light') > 0) { g.fillStyle = 'rgba(255,240,120,.35)'; g.beginPath(); g.moveTo(299, 55); g.lineTo(200, 40); g.lineTo(200, 70); g.fill(); }
        const gx = ((t * 18) % 400) - 40, gy = 44 + Math.sin(t * 2) * 5; L(gx - 6, gy, gx, gy + 3, '#fff', 1.5); L(gx, gy + 3, gx + 6, gy, '#fff', 1.5);
        SX.forEach(x => { E(x, 164, 42, 14, '#7a8088'); E(x, 156, 34, 10, '#a0a6b0'); E(x - 10, 152, 8, 3, '#b8bec8'); });
        R(0, 164, LW, 6, '#e9d3a0'); road('#e3c68e');
      },
      fg(t) {
        const cols = ['#e8352e', '#2e6fe8', '#f5c518'];
        SX.forEach((x, i) => {
          const mid = i === 1, j = jig('seal' + i);
          spr(sealS, x - 4, 152 - (mid ? bounce('sandy') : 0) - j * Math.abs(Math.sin(t * 12)) * 4, 1, i === 2 ? -1 : 1, t + i, mid && !F().seals ? { scarf: true, clap: mid && talking === 'sandy' } : { ball: cols[i], clap: j > 0 });
        });
      },
      spots() {
        const s = SX.map((x, i) => ({ id: 'seal' + i, x: x - 32, y: 104, w: 64, h: 58, who: 'sandy', act: () => talkSeal(i), use: { fish: feedSeals } }));
        s.push({ id: 'light', x: 284, y: 44, w: 30, h: 46, act: async () => { poke('light'); snd.tick(); await line('beep', 'A lighthouse shines a bright light to help boats find their way at night.'); } });
        return s;
      }
    };
    async function talkSeal(i) {
      snap('seal'); poke('seal' + i); snd.arf();
      if (!F().seals) {
        if (has('fish')) { await line('sandy', 'Arf! Is that FISH I smell? Please give us the bucket of fish, Beep!'); return; }
        await line('sandy', cyc('sandy1', ['Arf arf! Hi, Beep! I\'m Sandy. I found this pretty stripy scarf floating in the water.', 'We\'re too hungry to play. If only we had some fish! Arf!']));
        return;
      }
      if (!F().scarf && !has('scarf')) { addItem('scarf'); await line('sandy', 'Don\'t forget the stripy scarf! Here you go.'); return; }
      await line('sandy', 'Arf arf! Let\'s play the fish game again!');
      startSeals(false);
    }
    async function feedSeals() { snap('seal'); snd.arf(); await line('sandy', 'Fish! Yippee! Let\'s play a feeding game!'); startSeals(true); }

    // GIRAFFE YARD
    SC.giraffe = {
      name: 'Giraffe Yard',
      bg(t) {
        sky('#ffb85a', '#fff3c4', 118); sunS(40, 30, t, jig('sun2')); clouds(t, 50);
        E(60, 118, 90, 20, '#c8c060'); E(250, 120, 110, 18, '#b8b050');
        R(0, 116, LW, 54, '#b8d85a'); tufts(124, '#8ab03a');
        for (let x = 4; x < LW; x += 26) R(x, 134, 4, 30, '#8a5a2a'); R(0, 140, LW, 3, '#a0703a'); R(0, 152, LW, 3, '#a0703a');
        R(58, 62, 4, 106, '#6b4a2a'); RR(44, 50, 32, 16, 3, '#b8804a', '#6a3a00'); for (let i = 0; i < 5; i++) E(50 + i * 5, 50, 4, 3, '#3fae4a');
        P([262, 168, 272, 168, 268, 50, 264, 50], '#7a4a2a'); L(266, 80, 240, 56, '#7a4a2a', 3); L(267, 70, 292, 50, '#7a4a2a', 3);
        const j = jig('tree');
        E(266 + j * Math.sin(t * 30), 42, 50, 12, '#3f8a2a'); E(246, 36, 26, 8, '#4c9a2a'); E(290, 35, 24, 8, '#4c9a2a');
        if (!F().scarf && A.map === null) { g.save(); g.translate(258, 26); g.rotate(Math.sin(t * 5) * 0.15); spr(ITEMS.map.d, -8, -7, 0.55); g.restore(); }
        road();
      },
      fg(t) {
        spr(giraffeS, 185, 166, 1, 1, t, { sad: !F().scarf, scarf: F().scarf, reach: A.reach, rx: 68, ry: -140, chew: jig('tall') > 0 });
        if (A.map !== null) { g.save(); g.translate(258 - A.map * 30, 26 + A.map * 146); g.rotate(A.map * 6); spr(ITEMS.map.d, -8, -7, 0.55); g.restore(); }
        else if (F().scarf && !F().map) spr(ITEMS.map.d, 220, 162, 0.6);
        const bx = 120 + Math.sin(t * 0.7) * 40, by = 100 + Math.sin(t * 1.9) * 12, w = Math.abs(Math.sin(t * 14)) * 4;
        E(bx - w / 2 - 1, by, w / 2 + 0.5, 3, '#ff5a8a'); E(bx + w / 2 + 1, by, w / 2 + 0.5, 3, '#ff5a8a'); R(bx - 0.5, by - 2, 1, 4, '#222');
      },
      spots() {
        const s = [
          { id: 'feed', x: 40, y: 46, w: 40, h: 40, act: async () => { snd.tick(); await line('beep', 'This basket holds leaves up high, so the giraffes can reach them. Giraffes love to eat leaves!'); } },
          { id: 'tree', x: 222, y: 30, w: 90, h: 138, act: async () => { poke('tree'); snd.tick(); await line('beep', !F().scarf ? 'Something is stuck at the top of the tree! It\'s too high for me. Someone very tall could reach it.' : 'What a tall tree! Giraffes can eat leaves from the very top.'); } },
          { id: 'tall', x: 158, y: F().scarf ? 30 : 56, w: 70, h: F().scarf ? 138 : 112, who: 'tall', act: talkTall, use: { scarf: giveScarf } }
        ];
        if (!F().scarf) s.push({ id: 'mapup', x: 244, y: 14, w: 30, h: 24, act: async () => { snd.boop(); await line('beep', 'It looks like a paper map! But it\'s way too high for me. Beep cars can\'t fly!'); } });
        if (F().scarf && !F().map && A.map === null) s.push({ id: 'mapdn', x: 212, y: 154, w: 32, h: 26, act: async () => { F().map = true; addItem('map'); await line('beep', 'Opal\'s zoo map! Let\'s take it back to her at the Front Gate.'); } });
        return s;
      }
    };
    async function talkTall() {
      snap('giraffe'); poke('tall');
      if (!F().scarf) { await line('tall', cyc('tall1', ['Hello, Beep. I\'m Tallulah. I lost my favorite stripy scarf in the wind. My long neck is so chilly!', 'The wind blew my scarf far away. Maybe all the way to the water!'])); return; }
      await line('tall', cyc('tall2', ['I love my stripy scarf. Thank you, Beep!', 'Being tall is great. I can see the whole zoo from up here!', 'I\'m so tall, I say good morning to the birds every day!']));
    }
    async function giveScarf() {
      takeItem('scarf'); snap('giraffe'); F().scarf = true; save(); snd.yay(); burst(210, 80, 18);
      await line('tall', 'My stripy scarf! You found it! Thank you, Beep! My neck feels so cozy.');
      await line('tall', 'Oh! Something is stuck at the top of that tree. Let me get it for you.');
      await tween(A, 'reach', 1, 1.2); snd.whee();
      A.map = 0; await tween(A, 'map', 1, 1.1); A.map = null;
      await tween(A, 'reach', 0, 1);
      await line('tall', 'It\'s a map! I think it belongs to Zookeeper Opal.');
    }

    // MONKEY HOUSE
    const MSP = [[62, 104, 1], [112, 104, 1], [176, 126, 1], [232, 126, 1], [284, 126, 1], [96, 166, 0], [146, 166, 0]];
    SC.monkey = {
      name: 'Monkey House',
      bg(t) {
        sky('#a8e8a0', '#e8ffe0', 120);
        for (let i = 0; i < 16; i++) C((i * 47) % LW, 20 + (i * 29) % 70, 18, i % 3 ? '#3f9a3a' : '#4fb04a');
        R(0, 112, LW, 58, '#7ac85a'); tufts(120, '#5aa840');
        R(18, 30, 18, 140, '#6b4a2a'); R(22, 30, 3, 140, '#8a6a4a');
        L(34, 70, 150, 70, '#6b4a2a', 5); L(140, 92, 316, 92, '#6b4a2a', 5); L(300, 92, 316, 40, '#6b4a2a', 5);
        for (let i = 0; i < 5; i++) { const x = 60 + i * 55; Q(x, i < 2 ? 70 : 92, x + 6 + Math.sin(t + i) * 3, 110, x + Math.sin(t * 1.3 + i) * 4, 124, '#3a8a2a', 1.5); }
        const sw = Math.sin(t * 1.6) * (0.2 + jig('tire') * 0.4);
        g.save(); g.translate(262, 92); g.rotate(sw); L(0, 0, 0, 40, '#8a6a4a', 1.5); g.strokeStyle = '#222'; g.lineWidth = 4; g.beginPath(); g.ellipse(0, 46, 9, 6, 0, 0, TAU); g.stroke(); g.restore();
        road();
      },
      fg(t) {
        if (mode === 'count') return;
        const done = F().monkeys;
        spr(monkeyS, 62 + Math.sin(t * 2) * 3, 104, 1, 1, t, { hang: true, cheer: false, banana: done });
        spr(monkeyS, 118 + Math.sin(t * 2 + 1) * 3, 104, 1, -1, t, { hang: true });
        spr(monkeyS, 262 + Math.sin(t * 1.6) * 20, 140, 1, 1, t, { banana: done, cheer: jig('tire') > 0 });
        if (!done) {
          R(186, 148, 30, 20, '#d0312d'); E(201, 148, 15, 4, '#f5e6c8', 0, OL); R(186, 164, 30, 3, '#ffd23f'); for (let i = 0; i < 5; i++) L(188 + i * 6, 151, 192 + i * 6, 164, '#ffd23f', 1);
          spr(monkeyS, 226, 166 - bounce('mango'), 1.1, -1, t, { drum: true });
        } else spr(monkeyS, 212, 166 - bounce('mango'), 1.1, -1, t, { banana: true, cheer: talking === 'mango' });
      },
      spots() {
        return [
          { id: 'tree', x: 14, y: 30, w: 26, h: 100, act: async () => { snd.tick(); await line('beep', 'A big climbing tree! Monkeys are super climbers.'); } },
          { id: 'hang', x: 44, y: 66, w: 94, h: 44, who: 'mango', act: async () => { snap('monkey'); snd.ooh(); await line('mango', cyc('hang', ['Ooh ooh, ah ah! Look at us swing!', 'What\'s a monkey\'s favorite cookie? Chocolate chimp!'])); }, use: { banana: feedMonkeys } },
          { id: 'tire', x: 244, y: 118, w: 40, h: 50, who: 'mango', act: async () => { snap('monkey'); poke('tire'); snd.whee(); await line('beep', 'Wheee! The tire swing goes back and forth!'); }, use: { banana: feedMonkeys } },
          { id: 'mango', x: 182, y: 124, w: 62, h: 46, who: 'mango', act: talkMango, use: { banana: feedMonkeys } }
        ];
      }
    };
    snd.ooh = () => { tn(500, 0.15, { type: 'triangle', vol: 0.06, to: 800 }); tn(700, 0.15, { type: 'triangle', vol: 0.06, to: 1000, at: 0.16 }); };
    async function talkMango() {
      snap('monkey');
      if (!F().monkeys) {
        snd.boom(); later(snd.boom, 250); later(snd.boom, 500);
        await line('mango', cyc('mango1', ['Boom, boom, boom! Hi, Beep! I\'m Mango. We found this big drum. It\'s so much fun!', 'We might trade the drum for a yummy snack. Monkeys love bananas!']));
        return;
      }
      if (!F().drum && !has('drum')) { addItem('drum'); await line('mango', 'Here\'s the drum! Take it to Captain Trumpet at the Parade Ground!'); return; }
      await line('mango', 'Want to play the counting game again? Ooh ooh!');
      startCount(false);
    }
    async function feedMonkeys() { snap('monkey'); snd.ooh(); await line('mango', 'Bananas! Ooh ooh! But first, can you count us? Let\'s play!'); startCount(true); }

    // PARADE GROUND
    SC.parade = {
      name: 'Parade Ground',
      bg(t) {
        sky('#5ec8ff', '#d8f4ff', 118); clouds(t, 40);
        for (let i = 0; i < 12; i++) C(i * 30 + 4, 112, 15, i % 2 ? '#2e8b3e' : '#35a046');
        R(0, 112, LW, 58, '#6fd05a'); tufts(122, '#4fb03a'); flowers(158);
        R(236, 124, 84, 10, '#a0703a'); R(244, 114, 76, 10, '#b8804a'); R(252, 104, 68, 10, '#a0703a'); R(236, 134, 84, 34, '#7a4a2a');
        for (let i = 0; i < 6; i++) C(262 + i * 10, 98 + Math.sin(t * 4 + i) * 1, 3, ['#e8352e', '#2e6fe2', '#ffd23f'][i % 3]);
        R(16, 124, 88, 8, '#fff'); R(16, 132, 88, 36, '#e8e0d0'); for (let i = 0; i < 4; i++) R(20 + i * 26, 88, 4, 36, '#fff');
        P([10, 90, 60, 60, 110, 90], '#e8352e', '#6a1010'); for (let i = 0; i < 5; i++) P([10 + i * 20, 90, 20 + i * 20, 90, 60, 60], i % 2 ? '#fff' : '#e8352e'); C(60, 58, 3, '#ffd23f');
        const j = jig('flags');
        for (let k = 0; k < 2; k++) {
          const y0 = 12 + k * 14;
          Q(0, y0, 160, y0 + 18, 320, y0, '#555', 0.8);
          for (let i = 0; i < 16; i++) { const x = 10 + i * 20, y = y0 + 18 * (1 - Math.pow((x - 160) / 160, 2)) * 0.5 + 1, w = Math.sin(t * 6 + i) * (1 + j * 3); P([x - 4, y, x + 4, y, x + w, y + 9], ['#e8352e', '#ffd23f', '#2e6fe2', '#3fae4a', '#b04ae0'][(i + k) % 5]); }
        }
        road();
      },
      fg(t) {
        if (mode === 'parade' || mode === 'end') return;
        spr(elephantS, 180, 166 - bounce('trumpet'), 1, 1, t, { hat: true, drum: F().drum, toot: talking === 'trumpet' && Math.sin(t * 3) > 0 });
        if (F().opal) spr(opalS, 252, 168 - bounce('opal'), 1, -1, t, { wave: talking === 'opal', map: true });
      },
      spots() {
        if (mode !== 'scene') return [];
        const s = [
          { id: 'flags', x: 0, y: 8, w: 320, h: 26, act: async () => { poke('flags'); snd.whee(); await line('beep', 'Flags flapping in the wind! The zoo looks ready for a party.'); } },
          { id: 'band', x: 8, y: 58, w: 100, h: 110, act: async () => { [72, 74, 76, 77, 79].forEach((n, i) => snd.note(n, i * 0.14)); await line('beep', cyc('band', ['The bandstand! Da, da, da, da, daaa!', 'This is where the band plays music for the parade.'])); } },
          { id: 'stands', x: 236, y: 94, w: 84, h: 36, act: async () => { snd.yay(); await line('beep', 'The zoo visitors are waiting for the parade. Hello, everybody!'); } },
          { id: 'trumpet', x: 150, y: 96, w: 76, h: 72, who: 'trumpet', act: talkTrumpet, use: { drum: giveDrum } }
        ];
        if (F().opal) s.push({ id: 'opal', x: 238, y: 104, w: 28, h: 66, who: 'opal', act: async () => { await line('opal', ready() ? 'Everything is ready! Talk to Captain Trumpet to start the parade!' : 'My map shows the parade route. We\'re almost ready, Beep!'); } });
        return s;
      }
    };
    const ready = () => F().ice && F().scarf && F().opal && F().drum;
    async function talkTrumpet() {
      snap('elephant'); snd.toot();
      if (S.done && ready()) { await line('trumpet', 'Toot toot! Want to see the parade again? Here we go!'); await parade(); return; }
      if (!F().drum) { await line('trumpet', cyc('tr1', ['Toot toot! Hello, Beep! I\'m Captain Trumpet, the leader of the Animal Parade.', 'Oh dear. I can\'t lead a parade without my big drum! I hope somebody finds it.'])); return; }
      await checkReady();
    }
    async function giveDrum() {
      takeItem('drum'); snap('elephant'); F().drum = true; save(); snd.boom(); later(snd.boom, 300); later(snd.boom, 600);
      await line('trumpet', 'My big drum! Boom, boom, BOOM! Thank you, Beep!');
      await checkReady();
    }
    async function checkReady() {
      if (ready()) { await line('trumpet', 'Everyone is here and ready! Let\'s start the Animal Parade!'); await parade(); return; }
      const need = [];
      if (!F().ice) need.push('The penguins need ice for their float.');
      if (!F().scarf) need.push('Tallulah needs her stripy scarf.');
      if (!F().opal) need.push('Zookeeper Opal needs her map to show us the way.');
      await line('trumpet', 'We\'re almost ready, but we\'re still waiting for a few friends.');
      for (const n of need) await line('trumpet', n);
    }

    /* ---------- the parade ending ---------- */
    let parT0 = 0;
    const MARCHERS = [
      { gap: 0, k: 'trumpet', d: (x, t) => spr(elephantS, x, 180, 1, 1, t, { hat: true, drum: true, walk: true, toot: Math.sin(t * 2) > 0.5 }) },
      { gap: 62, k: 'opal', d: (x, t) => spr(opalS, x, 182, 1, 1, t, { walk: true, wave: true }) },
      { gap: 46, d: (x, t) => spr(giraffeS, x, 182, 0.72, 1, t, { scarf: true, walk: true }) },
      { gap: 58, d: (x, t) => { for (let i = 0; i < 3; i++) spr(penguinS, x - i * 14, 182, 1, 1, t + i, { walk: true, tie: i === 0 }); } },
      { gap: 56, d: (x, t) => { spr(sealS, x, 184 - Math.abs(Math.sin(t * 5)) * 4, 0.8, 1, t, { ball: '#e8352e' }); spr(sealS, x - 38, 184 - Math.abs(Math.sin(t * 5 + 1)) * 4, 0.8, 1, t + 1, { ball: '#2e6fe8' }); } },
      { gap: 80, d: (x, t) => { for (let i = 0; i < 3; i++) spr(monkeyS, x - i * 16, 182, 1, 1, t + i * 0.3, { cheer: true, banana: i === 1 }); } },
      { gap: 60, d: (x, t) => spr(flamingoS, x, 182, 0.9, 1, t, { nod: true }) },
      { gap: 30, d: (x, t) => spr(tortoiseS, x, 182, 1, 1, t, { walk: true }) },
      { gap: 48, k: 'beep', d: (x, t) => spr(beepS, x, 190, 1, 1, t, { moving: true, rot: t * 8, hat: S.hat, happy: true, talk: talking === 'beep' }) }
    ];
    const PSPD = 34;
    const marchX = i => { let off = 0; for (let k = 0; k <= i; k++) off += MARCHERS[k].gap; return -30 + (T - parT0) * PSPD - off; };
    async function parade() {
      mode = 'parade'; updNav(); selItem = null; renderInv(); tip('');
      parT0 = T; music(MARCH);
      const sl = ms => settling ? Promise.resolve() : sleep(ms);
      await sl(1200); await line('trumpet', 'Welcome, everybody, to the Pebble Park Zoo Animal Parade!');
      await sl(3500); await line('opal', 'Thank you, Beep! You helped everyone get ready!');
      await sl(4000); burst(160, 60, 30); snd.yay();
      await sl(3500); await line('beep', 'Wheely wonderful! Thank you for helping me, friend!');
      const total = MARCHERS.reduce((a, m) => a + m.gap, 0) + 30 + LW + 40;
      while (!dead && !settling && (T - parT0) * PSPD < total) await sleep(300);
      if (settling || dead) return;
      burst(80, 80, 30); burst(240, 80, 30); snd.yay();
      mode = 'end';
      let bonus = 0;
      if (!S.done) { S.done = true; save(); bonus = api.earn(6, 'finishing the Animal Parade'); }
      showEnd(bonus);
    }
    function showEnd() {
      ov.className = 'bz-ov bz-end'; ov.hidden = false;
      ov.innerHTML = `<div class="bz-panel"><h2>Hooray! The Animal Parade was a big success!</h2>
        <p>Beep found the map, the drum, the ice machine crank and Tallulah's scarf. Everybody at Pebble Park Zoo says THANK YOU!</p>
        <p>Photo Album: ${album.length} of ${ANIMALS.length} animals</p>
        <div class="bz-tb"><button class="btn bz-go" data-a="again">Watch again</button><button class="btn" data-a="explore">Keep exploring</button><button class="btn" data-a="album">Photo Album</button><button class="btn" data-a="new">Start over</button></div></div>`;
      speak('Hooray! The Animal Parade was a big success! Everybody at the zoo says thank you!', 'beep');
    }

    /* ---------- mini-game: feed the seals ---------- */
    const SCOL = [{ n: 'red', c: '#e8352e' }, { n: 'blue', c: '#2e6fe8' }, { n: 'yellow', c: '#f5c518' }];
    let sg = null;
    function startSeals(story) {
      mode = 'seals'; selItem = null; renderInv();
      sg = { story, n: 0, goal: 6, cols: shuffle([0, 1, 2]), fish: 0, last: -1, fly: null, drag: null, wrong: [-9, -9, -9], jump: [-9, -9, -9], done: false };
      newFish(); showMG();
      tip('Feed the hungry seals! Give each fish to the seal with the same color ball.');
    }
    function newFish() { let k; do k = rnd(3); while (k === sg.last && Math.random() < 0.6); sg.fish = k; sg.last = k; }
    function feedSeal(i) {
      if (!sg || sg.fly || sg.done) return;
      const want = sg.cols[i];
      if (want === sg.fish) {
        sg.fly = { i, t0: T }; snd.pop();
        later(() => {
          sg.fly = null; sg.jump[i] = T; snd.arf(); sg.n++; burst(SX[i], 110, 10);
          if (sg.n >= sg.goal) sealsWin();
          else { newFish(); tip(`${api.pick(['Yum!', 'Great job!', 'Arf arf! Thank you!', 'You got it!', 'Super!'])} Now a ${SCOL[sg.fish].n} fish!`); }
        }, 520);
      } else {
        sg.wrong[i] = T; snd.boop();
        tip(`That seal has a ${SCOL[want].n} ball. This fish is ${SCOL[sg.fish].n}! Find the ${SCOL[sg.fish].n} ball.`);
      }
    }
    function sealsWin() {
      sg.done = true; snd.yay(); burst(160, 80, 30); earnMini();
      tip('All the seals are full! Hooray!', true);
      later(() => {
        endMG();
        const first = sg.story && !F().seals;
        run(async () => {
          if (first) {
            F().seals = true; takeItem('fish'); addItem('scarf'); save();
            await line('sandy', 'Thank you, Beep! Our tummies are full! Arf arf!');
            await line('sandy', 'Here\'s the stripy scarf we found in the water. I think it belongs to a very tall friend!');
            await line('beep', 'Tallulah\'s scarf! Thank you, Sandy!');
          } else await line('sandy', 'Arf arf! That was fun! Thank you, Beep!');
        });
      }, 1600);
    }
    function drawSealGame(t) {
      SC.seal.bg(t);
      SX.forEach((x, i) => {
        const w = Math.max(0, 1 - (T - sg.wrong[i]) / 0.7), jp = Math.max(0, 1 - (T - sg.jump[i]) / 0.7);
        spr(sealS, x - 4 + Math.sin(T * 40) * 3 * w, 152 - Math.sin(jp * Math.PI) * 14, 1.05, i === 2 ? -1 : 1, t + i, { ball: SCOL[sg.cols[i]].c, clap: jp > 0 });
        if (w > 0) { L(x - 8, 100, x + 8, 100, '#fff', 2); }
      });
      P([140, 182, 180, 182, 176, 199, 144, 199], '#3b7dd8', OL); R(140, 182, 40, 3, '#6aa0f0');
      if (!sg.done) {
        const c = SCOL[sg.fish].c;
        if (sg.fly) { const p = Math.min(1, (T - sg.fly.t0) / 0.5), sx = 160, sy = 176, tx = SX[sg.fly.i] + 14, ty = 124; spr(fishS, sx + (tx - sx) * p, sy + (ty - sy) * p - Math.sin(p * Math.PI) * 40, 1.8, 1, c); }
        else if (sg.drag) spr(fishS, sg.drag.x, sg.drag.y, 1.8, 1, c);
        else spr(fishS, 160, 176 + Math.sin(T * 4) * 2, 1.8, 1, c);
      }
      for (let i = 0; i < sg.goal; i++) spr(fishS, 118 + i * 17, 36, 0.8, 1, i < sg.n ? '#ff9f1a' : 'rgba(255,255,255,.45)');
    }

    /* ---------- mini-game: count the monkeys ---------- */
    let cg = null;
    function startCount(story) {
      mode = 'count'; selItem = null; renderInv();
      cg = { story, round: 0, n: 0, sp: [], hi: -1, lock: false, cheer: -9 };
      nums.innerHTML = [1, 2, 3, 4, 5, 6].map(n => `<button class="btn" data-n="${n}" aria-label="${n}">${n}<small>${'&#8226;'.repeat(n)}</small></button>`).join('');
      nums.hidden = false; showMG(); newRound();
    }
    function newRound() {
      const rg = [[2, 3], [3, 4], [4, 6]][cg.round];
      cg.n = rg[0] + rnd(rg[1] - rg[0] + 1);
      cg.sp = shuffle(MSP.map((_, i) => i)).slice(0, cg.n).sort((a, b) => MSP[a][0] - MSP[b][0]);
      cg.hi = -1; cg.lock = false;
      nums.querySelectorAll('.btn').forEach(b => b.classList.remove('bz-hint'));
      tip(`Round ${cg.round + 1} of 3: How many monkeys? Count them, then tap the number!`, true);
      speak('How many monkeys do you see? Count them, then tap the number!', 'beep');
    }
    function answer(k) {
      if (!cg || cg.lock) return;
      if (k === cg.n) {
        cg.lock = true; cg.cheer = T; snd.yay(); burst(160, 90, 16);
        nums.querySelectorAll('.btn').forEach(b => b.classList.remove('bz-hint'));
        tip(`Yes! ${WORDS[cg.n][0].toUpperCase() + WORDS[cg.n].slice(1)} monkeys! Great counting!`);
        later(() => { cg.round++; if (cg.round >= 3) countWin(); else newRound(); }, 2200);
      } else {
        cg.lock = true; snd.boop();
        tip('Good try! Let\'s count them together.');
        for (let i = 0; i < cg.n; i++) later(() => { cg.hi = i; snd.tick(); speak(WORDS[i + 1], 'beep'); }, 2300 + i * 900);
        later(() => {
          cg.lock = false; const b = nums.querySelector(`[data-n="${cg.n}"]`); b && b.classList.add('bz-hint');
          tip(`${WORDS[cg.n][0].toUpperCase() + WORDS[cg.n].slice(1)}! Tap the number ${cg.n}.`);
        }, 2300 + cg.n * 900 + 300);
      }
    }
    function countWin() {
      snd.yay(); burst(160, 60, 30); earnMini(); cg.lock = true; cg.cheer = T + 100;
      tip('You counted all the monkeys! Hooray!', true);
      later(() => {
        endMG();
        const first = cg.story && !F().monkeys;
        run(async () => {
          if (first) {
            F().monkeys = true; takeItem('banana'); addItem('drum'); save();
            await line('mango', 'You\'re a great counter! Thank you for the bananas, Beep!');
            await line('mango', 'Here\'s the big drum. Please take it to Captain Trumpet at the Parade Ground!');
            await line('beep', 'The parade drum! Wheely wonderful!');
          } else await line('mango', 'Ooh ooh, ah ah! You\'re the best counter in the zoo!');
        });
      }, 1600);
    }
    function drawCountGame(t) {
      SC.monkey.bg(t);
      const ch = T - cg.cheer < 2.2 || cg.cheer > T;
      cg.sp.forEach((si, k) => {
        const [x, y, hang] = MSP[si];
        if (k === cg.hi || (cg.hi > k)) { g.strokeStyle = k === cg.hi ? '#ffd23f' : 'rgba(255,210,63,.6)'; g.lineWidth = 2; g.beginPath(); g.arc(x, y - (hang ? 18 : 14), 17, 0, TAU); g.stroke(); }
        spr(monkeyS, x + (hang ? Math.sin(t * 2 + k) * 2 : 0), y, 1.1, k % 2 ? -1 : 1, t + k, { hang: !!hang && !ch, cheer: ch, banana: ch });
        if (k <= cg.hi) TX(String(k + 1), x, y - (hang ? 46 : 42), 14, '#fff', '#000');
      });
    }

    /* ---------- mini-game: animal match (memory) ---------- */
    let mg = null;
    const MEMIDS = ['penguin', 'monkey', 'giraffe', 'seal', 'elephant', 'flamingo'];
    function startMemory() {
      mode = 'memory'; selItem = null; renderInv(); updNav();
      const deck = shuffle([...MEMIDS, ...MEMIDS]);
      mg = { deck, open: [], got: new Set(), lock: false, moves: 0 };
      const k = api.era.id === '2000' ? ['#7a3ad0', '#a070f0'] : api.era.id === '1990' ? ['#1d4a8a', '#3b7dd8'] : ['#0a8a8a', '#2fc4bd'];
      ov.className = 'bz-ov'; ov.hidden = false;
      ov.innerHTML = `<div class="bz-panel bz-mpanel" style="--bzk1:${k[0]};--bzk2:${k[1]}"><div class="bz-ph"><h2>Rosie's Animal Match</h2><button class="btn" data-a="mdone">Done</button></div>
        <div class="bz-mgrid">${deck.map((id, i) => `<button class="btn bz-card" data-c="${i}" aria-label="Card ${i + 1}"><div class="bz-back"></div></button>`).join('')}</div>
        <div class="bz-fact" aria-live="polite">Find two cards that match! Tap a card to flip it over.</div></div>`;
      speak('Find two cards that match! Tap a card to flip it over.', 'rosie');
    }
    function cardFace(i, up) {
      const b = ov.querySelector(`[data-c="${i}"]`); if (!b) return;
      if (up) { const c = document.createElement('canvas'); c.width = 64; c.height = 48; const a = ANIMALS.find(x => x.id === mg.deck[i]); portrait(c, a.id, true, a.bg); b.innerHTML = ''; b.appendChild(c); b.setAttribute('aria-label', a.n); }
      else { b.innerHTML = '<div class="bz-back"></div>'; b.setAttribute('aria-label', 'Card ' + (i + 1)); }
    }
    function flipCard(i) {
      if (!mg || mg.lock || mg.got.has(i) || mg.open.includes(i)) return;
      cardFace(i, true); snd.tick();
      const a = ANIMALS.find(x => x.id === mg.deck[i]);
      mg.open.push(i);
      const info = ov.querySelector('.bz-fact');
      if (mg.open.length === 1) { speak(a.n, 'rosie'); info.textContent = a.n + '! Now find the other ' + a.n.toLowerCase() + '.'; return; }
      mg.moves++;
      const [x, y] = mg.open;
      if (mg.deck[x] === mg.deck[y]) {
        mg.got.add(x); mg.got.add(y); mg.open = [];
        [x, y].forEach(k => ov.querySelector(`[data-c="${k}"]`).classList.add('bz-got'));
        snd.yay(); info.textContent = `Two ${a.n.toLowerCase()}s! A match!`; speak(`Two ${a.n.toLowerCase()}s! A match!`, 'rosie');
        if (mg.got.size === mg.deck.length) memoryWin();
      } else {
        mg.lock = true; speak(a.n, 'rosie'); info.textContent = 'Not a match. Try again!';
        later(() => { cardFace(x, false); cardFace(y, false); mg.open = []; mg.lock = false; }, 1100);
      }
    }
    function memoryWin() {
      earnMini(); burst(160, 80, 30);
      const first = !S.hat; S.hat = true; save();
      const msg = first ? `You matched them all in ${mg.moves} tries! Rosie gives Beep a sparkly party hat to wear in the parade!` : `You matched them all in ${mg.moves} tries! Great memory!`;
      const info = ov.querySelector('.bz-fact');
      info.innerHTML = esc(msg) + '<div class="bz-tb" style="margin:8px 0 0"><button class="btn bz-go" data-a="mplay">Play again</button><button class="btn" data-a="mdone">Done</button></div>';
      speak(msg, 'rosie');
    }

    /* ---------- mini-game plumbing ---------- */
    function showMG() { xBtn.hidden = false; photo.hidden = true; root.classList.add('bz-mg'); updNav(); }
    function endMG() {
      mode = 'scene'; xBtn.hidden = true; nums.hidden = true; tip(''); root.classList.remove('bz-mg'); sg = sg && Object.assign(sg, { drag: null });
      if (!ov.classList.contains('bz-end')) { ov.hidden = true; ov.innerHTML = ''; }
      updNav(); hush();
    }

    /* ---------- photo album ---------- */
    function openAlbum() {
      if (mode === 'title' || mode === 'parade') return;
      if (skipFn) skipFn();
      const prev = mode; mode = mode === 'end' ? 'end' : 'album';
      ov.className = 'bz-ov'; ov.hidden = false; ov.dataset.prev = prev;
      ov.innerHTML = `<div class="bz-panel"><div class="bz-ph"><h2>Beep's Photo Album (${album.length} of ${ANIMALS.length})</h2><button class="btn" data-a="aclose">Close</button></div>
        <div class="bz-grid">${ANIMALS.map(a => `<button class="btn bz-pc" data-p="${a.id}"><canvas width="64" height="48"></canvas><span>${album.includes(a.id) ? esc(a.n) : '???'}</span></button>`).join('')}</div>
        <div class="bz-fact" aria-live="polite">${album.length ? 'Tap a photo to hear a fun fact!' : 'Click on animals to take their photos!'}</div></div>`;
      ANIMALS.forEach(a => portrait(ov.querySelector(`[data-p="${a.id}"] canvas`), a.id, album.includes(a.id), a.bg));
      speak(album.length ? 'My photo album! Tap a photo to hear a fun fact.' : 'My photo album is empty. Click on animals to take their photos!', 'beep');
    }
    function closeAlbum() {
      const prev = ov.dataset.prev;
      if (prev === 'end') { showEnd(); return; }
      ov.hidden = true; ov.innerHTML = ''; mode = 'scene'; hush(); updNav();
    }

    /* ---------- hints (the honk horn) ---------- */
    const hintLv = {};
    function goal() {
      const f = F();
      if (has('crank')) return ['crank', ['That crank handle looks like part of a machine. Which machine is broken?', 'The penguins\' ice machine is missing a piece. Maybe the crank handle fits!', 'Drive to the Penguin Pool. Then drag the crank handle onto the blue ice machine.']];
      if (has('fish')) return ['fish', ['Who at the zoo would love a bucket of fish?', 'The seals at Seal Cove are very hungry!', 'Drive to Seal Cove. Then drag the bucket of fish onto a seal.']];
      if (has('scarf')) return ['scarf', ['Whose neck is chilly without a scarf?', 'Tallulah the giraffe lost her stripy scarf!', 'Drive to the Giraffe Yard. Then drag the scarf onto Tallulah.']];
      if (has('map')) return ['map', ['Who lost a map?', 'Zookeeper Opal lost her map. She\'s at the Front Gate.', 'Drive to the Front Gate. Then drag the zoo map onto Opal.']];
      if (has('drum')) return ['drum', ['Who needs a drum for the parade?', 'Captain Trumpet the elephant leads the parade. He needs his drum!', 'Drive to the Parade Ground. Then drag the drum onto Captain Trumpet.']];
      if (!f.ice) {
        if (f.moss) return ['getcrank', ['Old Moss moved! Was he sitting on something?', 'There\'s a crank handle in the sand in the Reptile House.', 'Go to the Reptile House and click the crank handle to pick it up.']];
        if (has('lettuce')) return ['moss', ['Who at the zoo loves crunchy lettuce?', 'Old Moss the tortoise is hungry. He\'s in the Reptile House.', 'Drive to the Reptile House. Then drag the lettuce onto Old Moss.']];
        return ['lettuce', ['The penguins\' ice machine is missing a piece. Let\'s explore the zoo and talk to everyone!', 'Old Moss the tortoise in the Reptile House is sitting on something. A snack might help him move.', 'Go to the Snack Shack and click the lettuce to pick it up. Then give it to Old Moss.']];
      }
      if (!f.seals) return ['getfish', ['The penguins have something for the seals.', 'Talk to Pip the penguin at the Penguin Pool.', 'Go to the Penguin Pool and click Pip, the penguin with the red bow tie.']];
      if (!f.scarf) return ['getscarf', ['The seals have something stripy.', 'Talk to the seals at Seal Cove.', 'Go to Seal Cove and click a seal.']];
      if (!f.map) return ['getmap', ['Tallulah got something down from the tree.', 'The map fell down in the Giraffe Yard!', 'Go to the Giraffe Yard and click the map on the ground.']];
      if (!f.monkeys) {
        if (has('banana')) return ['monkeys', ['Who loves bananas?', 'The monkeys in the Monkey House love bananas! They have the drum.', 'Drive to the Monkey House. Then drag the bananas onto Mango, the monkey with the drum.']];
        return ['banana', ['Somebody at the zoo is making a lot of noise. Boom, boom, boom!', 'The monkeys have the drum! They would trade it for a yummy snack.', 'Go to the Snack Shack and click the bananas. Then give them to the monkeys.']];
      }
      if (!f.drum) return ['getdrum', ['Mango has something for the parade.', 'Talk to Mango in the Monkey House.', 'Go to the Monkey House and click Mango.']];
      if (!S.done) return ['parade', ['Everybody is ready for the parade!', 'Captain Trumpet is waiting at the Parade Ground.', 'Go to the Parade Ground and click Captain Trumpet to start the parade!']];
      const miss = ANIMALS.length - album.length;
      return ['free', [miss ? `You saved the parade! There are ${miss} more animal photos to find for your album.` : 'You saved the parade and found every animal photo! You\'re a super zoo explorer!', 'You can play the seal, monkey and card games again any time!', 'Click Captain Trumpet at the Parade Ground to watch the parade again!']];
    }
    function honk() {
      snd.honk(); beep.hop = 1; later(() => { beep.hop = 0; }, 200);
      if (mode === 'seals') { tip(`Find the seal with the ${SCOL[sg.fish].n} ball, and tap it!`); return; }
      if (mode === 'count') { if (!cg.lock) tip('Point at each monkey and count out loud: one, two, three... Then tap the number!'); return; }
      if (mode === 'memory') { speak('Remember where each animal is hiding, then find its twin!', 'rosie'); return; }
      if (mode !== 'scene') return;
      if (busy) { if (skipFn) skipFn(); return; }
      const [k, lines] = goal(); const lv = hintLv[k] || 0; hintLv[k] = lv + 1;
      run(() => line('beep', lines[Math.min(lv, 2)]));
    }

    /* ---------- scene flow ---------- */
    function setScene(id) {
      S.scene = id; A.opalX = 252; A.mossX = F().moss ? 292 : 250; A.reach = 0; A.map = null; A.mossWalk = false; kbd = -1;
      updNav(); save();
    }
    const nb = d => RING[(RING.indexOf(S.scene) + d + RING.length) % RING.length];
    function updNav() {
      const show = mode === 'scene';
      root.dataset.mode = mode; root.dataset.busy = busy ? '1' : '';
      navL.hidden = navR.hidden = !show; scn.hidden = !show;
      if (show) {
        navL.lastChild.textContent = SC[nb(-1)].name; navR.lastChild.textContent = SC[nb(1)].name;
        navL.setAttribute('aria-label', 'Drive to ' + SC[nb(-1)].name); navR.setAttribute('aria-label', 'Drive to ' + SC[nb(1)].name);
        scn.textContent = SC[S.scene].name;
      }
    }
    async function travel(d) {
      snd.vroom(); selItem = null; renderInv();
      await driveTo(d > 0 ? 350 : -30);
      await tween({ get v() { return fade; }, set v(x) { fade = x; } }, 'v', 1, 0.2);
      setScene(nb(d)); beep.x = beep.tx = d > 0 ? -30 : 350;
      tween({ get v() { return fade; }, set v(x) { fade = x; } }, 'v', 0, 0.25);
      await driveTo(d > 0 ? 50 : 270);
    }
    function go(d) { if (mode !== 'scene') return; if (busy) { if (skipFn) skipFn(); return; } run(() => travel(d)); }
    function startGame() {
      ov.hidden = true; ov.innerHTML = ''; mode = 'scene'; setScene(S.scene); music(TUNE);
      if (!F().intro) run(intro);
      else run(async () => { beep.x = beep.tx = -30; snd.vroom(); await driveTo(80); await line('beep', S.done ? 'Beep beep! Welcome back to the zoo! Let\'s explore!' : 'Beep beep! Welcome back! Let\'s get the zoo ready for the parade!'); });
    }
    function showTitle() {
      mode = 'title'; tip(''); bub.hidden = true; xBtn.hidden = true; nums.hidden = true; updNav(); music(TUNE);
      const saved = F().intro;
      ov.className = 'bz-ov bz-ttl'; ov.hidden = false;
      ov.innerHTML = `<div class="bz-logo"><span>Beep</span><small>Goes to the</small><span class="bz-z">Zoo</span></div>
        <div><div class="bz-tb">${saved ? '<button class="btn bz-go" data-a="go">Keep playing</button><button class="btn" data-a="new">New adventure</button>' : '<button class="btn bz-go" data-a="go">Play!</button>'}</div>
        <div class="bz-pub" style="text-align:center">Little Lantern Software</div></div>`;
    }
    async function settle() {
      settling = true; let n = 0;
      const flush = () => { g = ctx; if (skipFn) skipFn(); fxs.splice(0).forEach(f => { f.draw(1); f.res(); }); if (beep.res) { beep.x = beep.tx; const r = beep.res; beep.res = null; r(); } };
      while (busy && n++ < 150 && !dead) { flush(); await new Promise(r => setTimeout(r, 30)); }
      flush(); settling = false; busy = 0; fade = 0;
    }
    async function startOver() {
      const r = await api.msgBox('Start over', 'Start a brand-new zoo adventure? Your Photo Album will be kept.', ['Start over', 'Cancel'], 'warn');
      if (r !== 'Start over' || dead) return;
      await settle(); hush();
      const hat = S.hat; S = fresh(); S.hat = hat; save();
      Object.keys(hintLv).forEach(k => delete hintLv[k]); Object.keys(cnt).forEach(k => delete cnt[k]);
      busy = 0; sg = cg = mg = null; selItem = null; renderInv(); xBtn.hidden = true; nums.hidden = true; tip(''); root.classList.remove('bz-mg');
      beep.x = beep.tx = 60; startGame();
    }
    const HOWTO = 'Help Beep get Pebble Park Zoo ready for the Animal Parade!\n\n' +
      '- Click or tap anything to see what happens. Beep drives over to it.\n' +
      '- Click an animal to meet it and add its photo to your Photo Album.\n' +
      '- Things you pick up go in Beep\'s glovebox at the bottom. Drag an item onto someone (or tap the item, then tap them) to give it.\n' +
      '- Use the wooden signs on the sides to drive to other parts of the zoo.\n' +
      '- Stuck? Click the horn to honk for a hint. Honk again for a bigger hint!\n\n' +
      'Keyboard: Left and Right arrows drive, Up and Down pick a thing, Enter clicks it, H honks, P opens the album, 1 to 7 pick an item.';

    /* ---------- inventory ---------- */
    function renderInv() {
      itemsEl.innerHTML = '';
      if (!S.inv.length) { itemsEl.innerHTML = '<span class="bz-empty">Glovebox is empty</span>'; return; }
      S.inv.forEach(id => {
        const b = document.createElement('button'); b.className = 'btn bz-it' + (selItem === id ? ' bz-on' : ''); b.dataset.i = id; b.title = ITEMS[id].n; b.setAttribute('aria-label', ITEMS[id].n);
        const c = document.createElement('canvas'); c.width = 32; c.height = 32; g = c.getContext('2d'); ITEMS[id].d(); b.appendChild(c);
        itemsEl.appendChild(b);
      });
    }
    function selectItem(id) {
      if (mode !== 'scene') return;
      if (busy) { if (skipFn) skipFn(); return; }
      selItem = selItem === id ? null : id; renderInv(); snd.tick();
      if (selItem) tip(`Who needs the ${ITEMS[id].n}? Tap them!`); else tip('');
    }
    let drag = null;
    itemsEl.addEventListener('pointerdown', e => {
      const b = e.target.closest('.bz-it'); if (!b) return;
      e.preventDefault();
      drag = { id: b.dataset.i, x: e.clientX, y: e.clientY, moved: false, pid: e.pointerId, el: null, b };
      try { b.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ }
    });
    itemsEl.addEventListener('pointermove', e => {
      if (!drag || e.pointerId !== drag.pid) return;
      if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 8 && mode === 'scene' && !busy) {
        drag.moved = true; const c = drag.b.querySelector('canvas'); const gh = document.createElement('canvas'); gh.width = 32; gh.height = 32; gh.getContext('2d').drawImage(c, 0, 0); gh.className = 'bz-ghost'; document.body.appendChild(gh); drag.el = gh;
      }
      if (drag.el) { drag.el.style.left = e.clientX + 'px'; drag.el.style.top = e.clientY + 'px'; }
    });
    const endDrag = e => {
      if (!drag || e.pointerId !== drag.pid) return;
      const d = drag; drag = null;
      if (d.el) d.el.remove();
      if (!d.moved) { if (e.type === 'pointerup') selectItem(d.id); return; }
      if (e.type !== 'pointerup') return;
      const r = cv.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return;
      const x = (e.clientX - r.left) / r.width * LW, y = (e.clientY - r.top) / r.height * LH;
      const sp = hit(x, y, true);
      if (sp) activate(sp, d.id);
    };
    itemsEl.addEventListener('pointerup', endDrag);
    itemsEl.addEventListener('pointercancel', endDrag);
    itemsEl.addEventListener('keydown', e => { const b = e.target.closest('.bz-it'); if (b && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); e.stopPropagation(); selectItem(b.dataset.i); } });

    /* ---------- scene interaction ---------- */
    function beepSpot() { return { id: 'beep', x: beep.x - 22, y: GY - 48, w: 44, h: 50, self: true, act: async () => { beep.hop = 1; snd.honk(); later(() => { beep.hop = 0; }, 250); await line('beep', cyc('beep', ['Beep beep! That tickles my bumper!', 'I\'m a little robot car. I run on sunshine!', 'My antenna blinks when I\'m happy. Blink, blink!', 'Honk honk! Where should we drive next?'])); } }; }
    function spotsNow() { return mode === 'scene' ? SC[S.scene].spots() : []; }
    function hit(x, y, noBeep) {
      const s = spotsNow();
      for (let i = s.length - 1; i >= 0; i--) { const p = s[i]; if (x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h) return p; }
      const bs = beepSpot();
      if (!noBeep && x >= bs.x && x <= bs.x + bs.w && y >= bs.y && y <= bs.y + bs.h && y > 150) return bs;
      return null;
    }
    function activate(sp, item) {
      if (mode !== 'scene') return;
      if (busy) { if (skipFn) skipFn(); return; }
      run(async () => {
        tip('');
        if (!sp.self) {
          const cx = sp.x + sp.w / 2, side = beep.x <= cx ? -1 : 1;
          let px = cx + side * (sp.w / 2 + 16);
          if (px < 28 || px > 292) px = cx - side * (sp.w / 2 + 16);
          if (px < 28 || px > 292) px = cx;
          px = clamp(px, 28, 292);
          if (Math.abs(px - beep.x) > 6) await driveTo(px);
          beep.dir = cx >= beep.x ? 1 : -1;
        }
        if (item) {
          selItem = null; renderInv();
          const fn = sp.use && sp.use[item];
          if (fn) { await fn(); return; }
          snd.boop();
          if (sp.who) await line(sp.who, api.pick([`No, thank you, Beep. I don't need the ${ITEMS[item].n}.`, `Hmm, the ${ITEMS[item].n}? That's not what I need. But thank you!`, `The ${ITEMS[item].n}? Maybe somebody else needs that!`]));
          else await line('beep', `The ${ITEMS[item].n} doesn't go here. Let's try somewhere else!`);
          return;
        }
        await sp.act();
      });
    }
    function bounce(k) { return talking === k ? Math.abs(Math.sin(T * 10)) * 1.5 : 0; }
    const toL = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * LW, (e.clientY - r.top) / r.height * LH]; };
    cv.addEventListener('pointerdown', e => {
      e.preventDefault(); kbd = -1;
      const [x, y] = toL(e);
      if (mode === 'seals') {
        if (!sg || sg.done || sg.fly) return;
        if (Math.hypot(x - 160, y - 178) < 26) { sg.drag = { x, y, pid: e.pointerId }; try { cv.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ } return; }
        const i = SX.findIndex(sx => Math.abs(x - sx) < 48 && y > 90 && y < 172); if (i >= 0) feedSeal(i);
        return;
      }
      if (mode === 'parade' || mode === 'end') { burst(x, y, 12); snd.pop(); if (skipFn) skipFn(); return; }
      if (mode === 'count') { if (skipFn) skipFn(); return; }
      if (mode !== 'scene') return;
      if (busy) { if (skipFn) skipFn(); return; }
      const sp = hit(x, y);
      if (sp) { activate(sp, selItem); return; }
      if (selItem) { selItem = null; renderInv(); tip(''); }
      if (y > 150) run(() => driveTo(clamp(x, 28, 292)));
    });
    cv.addEventListener('pointermove', e => { if (mode === 'seals' && sg && sg.drag) { const [x, y] = toL(e); sg.drag.x = x; sg.drag.y = y; } });
    const cvUp = e => {
      if (mode === 'seals' && sg && sg.drag) {
        const [x, y] = toL(e); sg.drag = null;
        if (e.type !== 'pointerup') return;
        const i = SX.findIndex(sx => Math.abs(x - sx) < 48 && y > 90 && y < 172); if (i >= 0) feedSeal(i);
      }
    };
    cv.addEventListener('pointerup', cvUp); cv.addEventListener('pointercancel', cvUp);
    navL.addEventListener('click', () => { navL.blur(); go(-1); }); navR.addEventListener('click', () => { navR.blur(); go(1); });
    honkBtn.addEventListener('click', () => { honkBtn.blur(); honk(); });
    albBtn.addEventListener('click', () => { if (mode === 'album') closeAlbum(); else if (mode === 'scene' || mode === 'end') openAlbum(); else if (mode === 'title') speak('Start playing, then click on animals to take their photos!', 'beep'); });
    xBtn.addEventListener('click', () => { if (mode === 'seals' || mode === 'count') endMG(); });
    nums.addEventListener('click', e => { const b = e.target.closest('[data-n]'); if (b) answer(+b.dataset.n); });
    ov.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      const a = b.dataset.a;
      if (a === 'go') { snd.honk(); startGame(); }
      else if (a === 'new') startOver();
      else if (a === 'again') { ov.hidden = true; ov.innerHTML = ''; mode = 'scene'; run(parade); }
      else if (a === 'explore') { ov.hidden = true; ov.innerHTML = ''; mode = 'scene'; music(TUNE); setScene('parade'); beep.x = beep.tx = 100; }
      else if (a === 'album') openAlbum();
      else if (a === 'aclose') closeAlbum();
      else if (a === 'mdone') endMG();
      else if (a === 'mplay') startMemory();
      else if (b.dataset.c !== undefined) flipCard(+b.dataset.c);
      else if (b.dataset.p) {
        const an = ANIMALS.find(x => x.id === b.dataset.p), info = ov.querySelector('.bz-fact');
        if (album.includes(an.id)) { info.textContent = an.n + ': ' + an.fact; speak(an.n + '! ' + an.fact, 'beep'); }
        else { info.textContent = 'You haven\'t met this animal yet. Keep exploring the zoo!'; speak('You haven\'t met this animal yet. Keep exploring the zoo!', 'beep'); }
      }
    });

    /* ---------- menus ---------- */
    api.menubar([
      { label: 'Game', items: () => [
        { label: 'Title screen', fn: async () => { if (mode === 'parade') return; await settle(); hush(); if (mode === 'seals' || mode === 'count' || mode === 'memory') endMG(); showTitle(); } },
        { label: 'Start over...', fn: startOver },
        '-',
        { label: 'Photo Album', fn: () => { if (mode === 'scene' || mode === 'end') openAlbum(); }, disabled: !(mode === 'scene' || mode === 'end') },
        { label: 'Honk for a hint', fn: honk },
        '-',
        { label: 'Exit', fn: () => api.close() }
      ] },
      { label: 'Options', items: () => [
        { label: (opt.music ? '[x] ' : '[  ] ') + 'Music', fn: () => { opt.music = !opt.music; api.save('opt', opt); music(curTune || TUNE); } },
        { label: (opt.talk ? '[x] ' : '[  ] ') + 'Talking', fn: () => { opt.talk = !opt.talk; api.save('opt', opt); if (!opt.talk) hush(); } }
      ] },
      { label: 'Help', items: [
        { label: 'How to play', fn: () => { speak('Help Beep get the zoo ready for the Animal Parade! Click on anything to explore. Drag things from the glovebox onto animals to help them. Honk the horn for a hint!', 'beep'); api.msgBox('How to play', HOWTO); } },
        { label: 'About Beep Goes to the Zoo', fn: () => api.msgBox('About', 'Beep Goes to the Zoo\nVersion 1.0 (1995)\n\nA Pebble Park Zoo adventure from Little Lantern Software.\nFor explorers ages 4 to 8.') }
      ] }
    ]);

    /* ---------- keyboard ---------- */
    W.onKey = e => {
      const k = e.key;
      if ((k === 'Enter' || k === ' ') && e.target && e.target.tagName === 'BUTTON' && !e.target.classList.contains('bz-it')) return;
      if (mode === 'title') { if (k === 'Enter' || k === ' ') { e.preventDefault(); snd.honk(); startGame(); } return; }
      if (k === 'h' || k === 'H') { honk(); return; }
      if (mode === 'album') { if (k === 'Escape' || k === 'p' || k === 'P') closeAlbum(); return; }
      if (mode === 'memory') { if (k === 'Escape') endMG(); return; }
      if (mode === 'seals') { if (/^[123]$/.test(k)) { const pos = +k - 1; feedSeal(pos); } else if (k === 'Escape') endMG(); return; }
      if (mode === 'count') { if (/^[1-6]$/.test(k)) answer(+k); else if (k === 'Escape') endMG(); else if (k === 'Enter' || k === ' ') { if (skipFn) skipFn(); } return; }
      if (mode === 'parade' || mode === 'end') { if ((k === 'Enter' || k === ' ') && skipFn) { e.preventDefault(); skipFn(); } return; }
      if (mode !== 'scene') return;
      if (k === 'p' || k === 'P') { openAlbum(); return; }
      if (k === 'ArrowLeft') { e.preventDefault(); go(-1); return; }
      if (k === 'ArrowRight') { e.preventDefault(); go(1); return; }
      if (/^[1-7]$/.test(k)) { const id = S.inv[+k - 1]; if (id) selectItem(id); return; }
      if (k === 'Escape') { if (skipFn) skipFn(); selItem = null; renderInv(); tip(''); kbd = -1; return; }
      if (k === 'ArrowUp' || k === 'ArrowDown' || k === 'Tab') {
        e.preventDefault(); const s = spotsNow(); if (!s.length) return;
        const dir = k === 'ArrowUp' || (k === 'Tab' && e.shiftKey) ? -1 : 1;
        kbd = kbd < 0 || kbd >= s.length ? (dir > 0 ? 0 : s.length - 1) : (kbd + dir + s.length) % s.length; snd.tick(); return;
      }
      if (k === 'Enter' || k === ' ') {
        e.preventDefault();
        if (busy) { if (skipFn) skipFn(); return; }
        const s = spotsNow(); if (kbd >= 0 && s[kbd]) activate(s[kbd], selItem);
      }
    };

    /* ---------- render loop ---------- */
    let lastT = 0;
    function drawTitle(t) {
      sky('#4fb6ff', '#c8f0ff', 120); sunS(28, 24, t, 0); clouds(t, 20);
      for (let i = 0; i < 12; i++) C(i * 30 + 8, 112, 16, i % 2 ? '#2e8b3e' : '#35a046');
      R(0, 112, LW, 58, '#5cc84a'); tufts(120, '#3fae4a'); flowers(160);
      E(44, 152, 40, 11, '#3aa0e0'); E(44, 150, 33, 7, '#6cc4f4');
      spr(flamingoS, 30, 152, 1, 1, t, { nod: true }); spr(flamingoS, 58, 150, 0.9, -1, t + 1, {});
      spr(giraffeS, 280, 166, 0.8, -1, t, { scarf: true, chew: true });
      spr(penguinS, 96, 166, 1, 1, t, { walk: true }); spr(monkeyS, 244, 166, 1, 1, t, { cheer: true });
      road();
      spr(beepS, 175 + Math.sin(t * 0.8) * 60, 196 - Math.abs(Math.sin(t * 3)) * 6, 2, Math.cos(t * 0.8) >= 0 ? 1 : -1, t, { moving: true, rot: t * 6, hat: S.hat, happy: Math.sin(t * 2) > 0.5 });
    }
    function frame(ts) {
      if (dead) return;
      raf = requestAnimationFrame(frame);
      const now = ts / 1000, dt = Math.min(0.05, lastT ? now - lastT : 0.016); lastT = now; T += dt;
      if (beep.x !== beep.tx) {
        const d = beep.tx - beep.x, st = Math.sign(d) * Math.min(Math.abs(d), 150 * dt);
        beep.x += st; beep.rot += st / 5.5; beep.dir = Math.sign(d) || beep.dir;
        if (Math.abs(beep.tx - beep.x) < 0.5) { beep.x = beep.tx; const r = beep.res; beep.res = null; if (r) r(); }
      }
      g = ctx; g.setLineDash([]);
      if (mode === 'title') drawTitle(T);
      else if (mode === 'seals' && sg) drawSealGame(T);
      else if (mode === 'count' && cg) drawCountGame(T);
      else if (mode === 'parade' || mode === 'end') {
        SC.parade.bg(T);
        for (let i = MARCHERS.length - 1; i >= 0; i--) { const x = marchX(i); if (x > -80 && x < LW + 80) MARCHERS[i].d(x, T); const k = MARCHERS[i].k; if (k) parX[k] = [clamp(x, 20, 300), k === 'beep' ? 146 : k === 'trumpet' ? 110 : 124]; }
        if (mode === 'parade' && Math.random() < 0.15) conf.push({ x: Math.random() * LW, y: -4, vx: (Math.random() - 0.5) * 20, vy: 20 + Math.random() * 20, c: ['#e8352e', '#ffd23f', '#3fae4a', '#2e6fe2', '#b04ae0'][rnd(5)], life: 6 });
      } else {
        const s = SC[S.scene]; s.bg(T); s.fg(T);
        spr(beepS, Math.round(beep.x), GY, 1, beep.dir, T, { talk: talking === 'beep', moving: beep.x !== beep.tx, rot: beep.rot, hat: S.hat, hop: beep.hop * 4 });
        if (kbd >= 0 && mode === 'scene') { const sp = spotsNow()[kbd]; if (sp) { g.setLineDash([3, 2]); g.strokeStyle = '#ffd23f'; g.lineWidth = 1.5; g.strokeRect(sp.x + 0.5, sp.y + 0.5, sp.w, sp.h); g.setLineDash([]); } }
      }
      for (let i = fxs.length - 1; i >= 0; i--) { const f = fxs[i], p = (T - f.t0) / f.dur; if (p >= 1) { fxs.splice(i, 1); f.draw(1); f.res(); } else f.draw(Math.max(0, p)); }
      for (let i = conf.length - 1; i >= 0; i--) { const c = conf[i]; c.vy += 90 * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.life -= dt; if (c.life <= 0 || c.y > LH + 5) { conf.splice(i, 1); continue; } R(c.x, c.y, 3, 2, c.c); }
      if (fade > 0) { g.fillStyle = `rgba(0,0,0,${fade})`; g.fillRect(0, 0, LW, LH); }
      if (talking && !bub.hidden) placeBubble(talking);
    }

    W.onResize = () => { layout(); };
    W.onMin = () => { hush(); };
    W.onClose = () => {
      dead = true; cancelAnimationFrame(raf); timers.forEach(clearTimeout); timers.clear();
      if (ro) ro.disconnect(); if (drag && drag.el) drag.el.remove(); hush(); api.stopMusic();
    };

    renderInv(); updNav(); showTitle();
    raf = requestAnimationFrame(frame);
  }

  const ICON = '<svg viewBox="0 0 32 32" shape-rendering="crispEdges" aria-hidden="true"><rect x="15" y="2" width="2" height="6" fill="#333"/><rect x="14" y="1" width="4" height="3" fill="#ff3b3b"/><rect x="8" y="7" width="16" height="10" fill="#2fc4bd" stroke="#12524f"/><rect x="10" y="9" width="12" height="6" fill="#10262c"/><rect x="12" y="10" width="2" height="3" fill="#8ff"/><rect x="18" y="10" width="2" height="3" fill="#8ff"/><rect x="15" y="17" width="2" height="2" fill="#555"/><path d="M3 29V21l4-3h18l5 4v7z" fill="#ffb52e" stroke="#6a3a00"/><rect x="3" y="23" width="27" height="2" fill="#ff7a1a"/><rect x="5" y="26" width="6" height="5" fill="#222"/><rect x="21" y="26" width="6" height="5" fill="#222"/><rect x="7" y="27" width="2" height="2" fill="#ccc"/><rect x="23" y="27" width="2" height="2" fill="#ccc"/><rect x="27" y="20" width="2" height="2" fill="#fffbd0"/></svg>';

  (window.RETRO_APPS = window.RETRO_APPS || []).push({
    id: 'beepzoo', label: 'Beep Goes to the Zoo', kind: 'store', cat: 'game', year: 1995, price: 24.95,
    publisher: 'Little Lantern Software', genre: 'Kids adventure (ages 4-8)', sizeKB: 38000,
    tagline: 'A little robot car. A big zoo. One very important parade!',
    blurb: 'Today is the Animal Parade at Pebble Park Zoo, but the drum is missing, the penguins\' ice machine is broken, Tallulah the giraffe lost her scarf and the zookeeper\'s map blew away! Drive Beep, the friendly talking robot car, through eight colorful zoo scenes. Click on everything for surprises, collect helpful things in Beep\'s glovebox, feed the seals, count the monkeys, play Animal Match and fill your Photo Album with fun animal facts. Honk the horn any time for a hint. For explorers ages 4 to 8.',
    box: { bg: '#1e9be0', fg: '#ffffff', accent: '#ffb52e' },
    icon: ICON,
    window: { w: 680, h: 560 },
    css: CSS,
    open: openZoo
  });
})();
