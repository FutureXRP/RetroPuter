/* The Lighthouse at Gull Rock: a store game (1995).
   An original, gentle first-person CD-ROM mystery. Grandpa Tobias Wren, keeper of the Gull Rock Light,
   is missing; the lamp is dark and a ship is due at nine. Explore the island, solve his puzzles, relight the lamp.
   Every scene is painted procedurally on a 384x240 canvas, then ordered-dithered for that 256-color CD-ROM look. */
(function () {
  'use strict';
  const VW = 384, VH = 240, TAU = Math.PI * 2;

  /* ---------- small helpers ---------- */
  const rng = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const hashStr = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function hx(h) { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function sh(h, f) { const c = hx(h); return 'rgb(' + c.map(v => Math.round(f >= 0 ? v + (255 - v) * f : v * (1 + f))).join(',') + ')'; }
  function rgba(h, a) { const c = hx(h); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; }

  /* ---------- painting toolkit ---------- */
  function lin(g, x0, y0, x1, y1, cols) { const gr = g.createLinearGradient(x0, y0, x1, y1); cols.forEach((c, i) => gr.addColorStop(i / (cols.length - 1), c)); return gr; }
  function rad(g, x, y, r, cols, r0 = 0) { const gr = g.createRadialGradient(x, y, r0, x, y, r); cols.forEach((c, i) => gr.addColorStop(i / (cols.length - 1), c)); return gr; }
  function box(g, x, y, w, h, f) { g.fillStyle = f; g.fillRect(x, y, w, h); }
  function path(g, p) { g.beginPath(); g.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) g.lineTo(p[i], p[i + 1]); g.closePath(); }
  function poly(g, p, f, s, lw) { path(g, p); if (f) { g.fillStyle = f; g.fill(); } if (s) { g.strokeStyle = s; g.lineWidth = lw || 1; g.stroke(); } }
  function ell(g, x, y, rx, ry, f) { g.beginPath(); g.ellipse(x, y, Math.abs(rx), Math.abs(ry), 0, 0, TAU); g.fillStyle = f; g.fill(); }
  function line(g, x0, y0, x1, y1, s, lw) { g.strokeStyle = s; g.lineWidth = lw || 1; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); }
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function bbox(p) { let a = 1e9, b = 1e9, c = -1e9, d = -1e9; for (let i = 0; i < p.length; i += 2) { a = Math.min(a, p[i]); c = Math.max(c, p[i]); b = Math.min(b, p[i + 1]); d = Math.max(d, p[i + 1]); } return { x: a, y: b, w: c - a, h: d - b }; }
  function clipDo(g, p, fn) { g.save(); path(g, p); g.clip(); fn(bbox(p)); g.restore(); }
  function speck(g, R, x, y, w, h, n, cols, s = 1) { for (let i = 0; i < n; i++) { g.fillStyle = cols[(R() * cols.length) | 0]; g.fillRect((x + R() * w) | 0, (y + R() * h) | 0, s, s); } }
  function glow(g, x, y, r, col, a = 1) { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = a; g.fillStyle = rad(g, x, y, r, [col, rgba('#000000', 0)]); g.fillRect(x - r, y - r, r * 2, r * 2); g.restore(); }
  function txt(g, s, x, y, font, col, align = 'center') { g.font = font; g.fillStyle = col; g.textAlign = align; g.textBaseline = 'middle'; g.fillText(s, x, y); }

  function grass(g, R, p, c1 = '#8aa852', c2 = '#415f28', dens = 1) {
    clipDo(g, p, b => {
      g.fillStyle = lin(g, 0, b.y, 0, b.y + b.h, [c1, c2]); g.fillRect(b.x, b.y, b.w, b.h);
      const n = (b.w * b.h * 0.05 * dens) | 0;
      for (let i = 0; i < n; i++) {
        const x = b.x + R() * b.w, y = b.y + R() * b.h, t = (y - b.y) / (b.h || 1), l = 1 + t * 5 * R();
        g.fillStyle = R() < 0.5 ? sh(c1, 0.3 * R()) : sh(c2, -0.35 * R());
        g.fillRect(x | 0, (y - l) | 0, 1, Math.max(1, l | 0));
      }
    });
  }
  function rock(g, R, p, lt = '#a39d8c', dk = '#46413a') {
    clipDo(g, p, b => {
      g.fillStyle = lin(g, b.x, b.y, b.x + b.w * 0.4, b.y + b.h, [lt, dk]); g.fillRect(b.x, b.y, b.w, b.h);
      speck(g, R, b.x, b.y, b.w, b.h, (b.w * b.h * 0.07) | 0, [sh(lt, 0.2), sh(dk, -0.3), 'rgba(0,0,0,.25)', 'rgba(255,255,255,.12)']);
      const n = (b.w * b.h / 260) | 0;
      for (let i = 0; i < n; i++) {
        let x = b.x + R() * b.w, y = b.y + R() * b.h; g.strokeStyle = 'rgba(20,16,12,.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y);
        for (let k = 0; k < 3; k++) { x += (R() - 0.5) * 12; y += R() * 7; g.lineTo(x, y); } g.stroke();
        g.strokeStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.moveTo(x + 1, y - 1); g.lineTo(x + 5, y - 3); g.stroke();
      }
    });
  }
  function sea(g, R, y0, y1, x0 = 0, x1 = VW, c = ['#a4c0d2', '#5584aa', '#2a5378']) {
    g.fillStyle = lin(g, 0, y0, 0, y1, c); g.fillRect(x0, y0, x1 - x0, y1 - y0);
    const n = ((x1 - x0) * (y1 - y0) / 34) | 0;
    for (let i = 0; i < n; i++) {
      const t = R(), y = y0 + t * t * (y1 - y0), x = x0 + R() * (x1 - x0), l = 2 + t * 16 * R();
      g.fillStyle = R() < 0.5 ? `rgba(255,255,255,${0.06 + 0.2 * R()})` : `rgba(8,28,58,${0.1 + 0.22 * R()})`;
      g.fillRect(x | 0, y | 0, l | 0, t > 0.55 ? 2 : 1);
    }
    box(g, x0, y0, x1 - x0, 1, 'rgba(255,255,255,.35)');
  }
  function foam(g, R, p, w = 3) {
    for (let i = 0; i < p.length - 2; i += 2) {
      const x0 = p[i], y0 = p[i + 1], x1 = p[i + 2], y1 = p[i + 3], d = Math.hypot(x1 - x0, y1 - y0);
      for (let s = 0; s < d; s += 1.5) { const t = s / d; g.fillStyle = `rgba(255,255,255,${0.35 + 0.55 * R()})`; g.fillRect((x0 + (x1 - x0) * t + R() * 2 - 1) | 0, (y0 + (y1 - y0) * t + (R() - 0.5) * w) | 0, 1 + (R() * 3 | 0), 1); }
    }
  }
  function planks(g, R, x, y, w, h, base, vert = true, pw = 9) {
    box(g, x, y, w, h, base);
    const n = Math.ceil((vert ? w : h) / pw);
    for (let i = 0; i < n; i++) {
      const px = vert ? x + i * pw : x, py = vert ? y : y + i * pw, ww = vert ? Math.min(pw, x + w - px) : w, hh = vert ? h : Math.min(pw, y + h - py);
      box(g, px, py, ww, hh, sh(base, (R() - 0.5) * 0.28));
      for (let k = 0; k < 4; k++) { g.fillStyle = `rgba(0,0,0,${0.08 + R() * 0.1})`; if (vert) g.fillRect(px + 1 + R() * (ww - 2), py + R() * hh, 1, hh * R() * 0.5); else g.fillRect(px + R() * ww, py + 1 + R() * (hh - 2), ww * R() * 0.5, 1); }
      g.fillStyle = 'rgba(0,0,0,.5)'; if (vert) g.fillRect(px, py, 1, hh); else g.fillRect(px, py, ww, 1);
      g.fillStyle = 'rgba(255,255,255,.13)'; if (vert) g.fillRect(px + 1, py, 1, hh); else g.fillRect(px, py + 1, ww, 1);
    }
  }
  function stones(g, R, x, y, w, h, base = '#8d8a80', sz = 10) {
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); box(g, x, y, w, h, sh(base, -0.5));
    for (let yy = y; yy < y + h; yy += sz * 0.7) {
      let xx = x - R() * sz;
      while (xx < x + w) { const sw = sz * (0.7 + R() * 0.8), shh = sz * 0.7 - 1, f = (R() - 0.5) * 0.3; g.fillStyle = lin(g, xx, yy, xx, yy + shh, [sh(base, 0.18 + f), sh(base, -0.22 + f)]); rr(g, xx + 0.5, yy + 0.5, sw - 1, shh, 2); g.fill(); xx += sw; }
    }
    g.restore();
  }
  function winEx(g, x, y, w, h, o = {}) {
    const fr = o.frame || '#efeadc';
    box(g, x - 2, y - 2, w + 4, h + 4, fr);
    g.fillStyle = o.lit ? lin(g, x, y, x, y + h, ['#ffe9a8', '#e8a040']) : lin(g, x, y, x + w, y + h, ['#7c98b0', '#1d2a38', '#324a60']); g.fillRect(x, y, w, h);
    if (!o.lit) poly(g, [x + w * 0.25, y, x + w * 0.55, y, x + w * 0.2, y + h, x - w * 0.1 + 1, y + h], 'rgba(255,255,255,.16)');
    box(g, x + w / 2 - 1, y, 2, h, fr); box(g, x, y + h / 2 - 1, w, 2, fr); box(g, x - 4, y + h + 2, w + 8, 3, sh(fr, -0.35));
  }
  const GLOWS = []; // lantern glows registered while painting, drawn after tinting
  function tower(g, cx, by, h, bw, tw, o = {}) {
    const ty = by - h, body = [cx - bw / 2, by, cx - tw / 2, ty, cx + tw / 2, ty, cx + bw / 2, by];
    clipDo(g, body, () => {
      g.fillStyle = lin(g, cx - bw / 2, 0, cx + bw / 2, 0, ['#7c7970', '#f6f3ea', '#e4dfd2', '#a09c90', '#5e5b54']); g.fillRect(cx - bw / 2, ty, bw, h);
      for (let i = 0; i < 2; i++) { const y0 = ty + h * (0.14 + i * 0.38); g.fillStyle = lin(g, cx - bw / 2, 0, cx + bw / 2, 0, ['#4a100c', '#d24a3c', '#c03a2e', '#7a1c16', '#3a0c08']); g.fillRect(cx - bw / 2, y0, bw, h * 0.19); }
      if (h > 40) for (let i = 0; i < 3; i++) { const wy = ty + h * (0.08 + i * 0.3), ww = Math.max(2, tw * 0.14); box(g, cx - ww / 2, wy, ww, ww * 1.8, '#1c2024'); }
    });
    const gw = tw * 1.55, lw = tw * 0.8, lh = Math.max(4, h * 0.13), gy = ty - 1;
    box(g, cx - gw / 2, gy, gw, Math.max(2, h * 0.02), '#1e1e1e');
    for (let i = 0; i <= 6; i++) box(g, cx - gw / 2 + i * gw / 6 - 0.5, gy - lh * 0.45, 1, lh * 0.45, '#222');
    box(g, cx - gw / 2, gy - lh * 0.45, gw, 1, '#222');
    const ly = gy - lh;
    g.fillStyle = o.lit ? lin(g, 0, ly, 0, gy, ['#fff8d0', '#ffd860']) : lin(g, cx - lw / 2, 0, cx + lw / 2, 0, ['#1a222c', '#5a7086', '#26303c']);
    g.fillRect(cx - lw / 2, ly, lw, lh);
    for (let i = 1; i < 4; i++) box(g, cx - lw / 2 + i * lw / 4, ly, 1, lh, 'rgba(20,20,20,.8)');
    g.beginPath(); g.ellipse(cx, ly, lw * 0.62, lh * 0.75, 0, Math.PI, 0); g.fillStyle = lin(g, cx - lw / 2, 0, cx + lw / 2, 0, ['#3a0c08', '#b03a2c', '#5a1410']); g.fill();
    ell(g, cx, ly - lh * 0.8, Math.max(1, lw * 0.1), Math.max(1, lw * 0.1), '#222');
    if (o.door) { const dw = bw * 0.22, dh = h * 0.12; rr(g, cx - dw / 2, by - dh, dw, dh, dw / 2); g.fillStyle = '#6a1a14'; g.fill(); }
    if (o.lit) GLOWS.push([cx, ly + lh / 2, Math.max(14, lw * 3.2)]);
  }
  function cottage(g, R, x, y, w, h, o = {}) {
    const rh = o.rh || h * 0.7, sd = o.side || 0;
    if (sd) {
      poly(g, [x + w, y, x + w + sd, y - sd * 0.25, x + w + sd, y + h - sd * 0.15, x + w, y + h], lin(g, x + w, 0, x + w + sd, 0, ['#c2baa6', '#8f887a']));
      poly(g, [x + w + 4, y + 2, x + w * 0.86, y - rh, x + w * 0.86 + sd, y - rh - sd * 0.25, x + w + sd + 3, y - sd * 0.25 + 2], '#39414a');
    }
    g.fillStyle = lin(g, x, y, x, y + h, ['#f4f0e4', '#d4cebe']); g.fillRect(x, y, w, h);
    speck(g, R, x, y, w, h, (w * h * 0.05) | 0, ['rgba(120,110,90,.18)', 'rgba(255,255,255,.3)']);
    const roof = [x - 4, y + 2, x + w * 0.14, y - rh, x + w * 0.86, y - rh, x + w + 4, y + 2];
    clipDo(g, roof, b => {
      g.fillStyle = lin(g, 0, b.y, 0, b.y + b.h, ['#56616c', '#2e353e']); g.fillRect(b.x, b.y, b.w, b.h);
      const rows = Math.max(2, (rh / 4) | 0);
      for (let i = 0; i < rows; i++) { const yy = y - rh + i * rh / rows; box(g, b.x, yy, b.w, 1, 'rgba(0,0,0,.35)'); for (let xx = b.x + (i % 2) * 3; xx < b.x + b.w; xx += 6) box(g, xx, yy, 1, rh / rows, 'rgba(0,0,0,.2)'); }
    });
    if (o.chimney !== false) { const cxx = x + w * 0.22; stones(g, R, cxx, y - rh - h * 0.25, Math.max(4, w * 0.08), rh * 0.6 + h * 0.25, '#8a7a6a', Math.max(3, w * 0.03)); }
  }
  function person(g, x, y, s, o = {}) {
    // x,y = feet centre; s = height in px. o: coat, sil (silhouette colour), beard, cap, lantern, wave
    const c = k => o.sil || k, hd = s * 0.13;
    box(g, x - s * 0.1, y - s * 0.42, s * 0.08, s * 0.42, c('#2a2a34')); box(g, x + s * 0.02, y - s * 0.42, s * 0.08, s * 0.42, c('#2a2a34'));
    poly(g, [x - s * 0.17, y - s * 0.4, x - s * 0.14, y - s * 0.78, x + s * 0.14, y - s * 0.78, x + s * 0.17, y - s * 0.4], c(o.coat || '#e8c030'));
    ell(g, x, y - s * 0.78 - hd, hd, hd * 1.1, c('#e8b894'));
    if (o.beard) ell(g, x, y - s * 0.78 - hd * 0.4, hd * 0.9, hd * 0.7, c('#e8e8e8'));
    if (o.cap) { box(g, x - hd * 1.1, y - s * 0.78 - hd * 2.1, hd * 2.2, hd * 0.9, c('#1e2a44')); box(g, x - hd * 1.4, y - s * 0.78 - hd * 1.3, hd * 2.2, hd * 0.3, c('#10182a')); }
    else if (o.hair) ell(g, x, y - s * 0.78 - hd * 1.5, hd * 1.05, hd * 0.6, c(o.hair));
    const arm = o.wave ? -0.9 : 0.2;
    g.save(); g.translate(x + s * 0.14, y - s * 0.74); g.rotate(arm); box(g, -s * 0.04, 0, s * 0.08, s * 0.34, c(o.coat || '#e8c030')); if (o.lantern) { box(g, -s * 0.06, s * 0.34, s * 0.12, s * 0.12, '#ffd860'); } g.restore();
    if (o.lantern) { const la = arm, lx = x + s * 0.14 - Math.sin(la) * s * 0.4, ly = y - s * 0.74 + Math.cos(la) * s * 0.4; GLOWS.push([lx, ly, s * 0.6]); }
  }
  function cat(g, x, y, s, o = {}) {
    const c = '#e0892e', d = '#a85a18';
    if (o.sit) {
      ell(g, x, y - s * 0.35, s * 0.3, s * 0.38, c); ell(g, x, y - s * 0.82, s * 0.22, s * 0.2, c);
      poly(g, [x - s * 0.2, y - s * 0.9, x - s * 0.14, y - s * 1.1, x - s * 0.04, y - s * 0.96], c); poly(g, [x + s * 0.2, y - s * 0.9, x + s * 0.14, y - s * 1.1, x + s * 0.04, y - s * 0.96], c);
      box(g, x - s * 0.1, y - s * 0.86, 2, 2, '#1a3a10'); box(g, x + s * 0.06, y - s * 0.86, 2, 2, '#1a3a10');
      g.strokeStyle = c; g.lineWidth = s * 0.08; g.beginPath(); g.moveTo(x + s * 0.25, y - s * 0.1); g.quadraticCurveTo(x + s * 0.6, y - s * 0.05, x + s * 0.5, y - s * 0.4); g.stroke();
    } else {
      ell(g, x, y - s * 0.22, s * 0.5, s * 0.24, c); ell(g, x - s * 0.36, y - s * 0.3, s * 0.2, s * 0.18, c);
      poly(g, [x - s * 0.5, y - s * 0.38, x - s * 0.46, y - s * 0.56, x - s * 0.38, y - s * 0.44], c); poly(g, [x - s * 0.3, y - s * 0.42, x - s * 0.24, y - s * 0.58, x - s * 0.2, y - s * 0.42], c);
      for (let i = 0; i < 3; i++) box(g, x - s * 0.1 + i * s * 0.14, y - s * 0.4, s * 0.05, s * 0.3, d);
      line(g, x - s * 0.44, y - s * 0.3, x - s * 0.38, y - s * 0.3, '#3a2010'); line(g, x - s * 0.32, y - s * 0.3, x - s * 0.26, y - s * 0.3, '#3a2010');
      g.strokeStyle = c; g.lineWidth = s * 0.1; g.beginPath(); g.moveTo(x + s * 0.45, y - s * 0.15); g.quadraticCurveTo(x + s * 0.6, y, x + s * 0.1, y - s * 0.02); g.stroke();
    }
  }

  /* ---------- sky, tint, dither ---------- */
  const SKY = {
    day: ['#3a6fb0', '#7fb0dc', '#cfe2ee', '#f3e7cc'],
    sunset: ['#27306a', '#7a4f86', '#e0806a', '#ffc070'],
    dusk: ['#060a22', '#161c4c', '#34306a', '#7a4868'],
    night: ['#02040c', '#050a20', '#0c1434', '#182244'],
    dawn: ['#3a4a8a', '#a07ab0', '#f0a8a0', '#ffe0a8']
  };
  const TINT = { day: null, sunset: '#ffcfa8', dusk: '#6c74b0', night: '#3c4880', dawn: '#ffd8c8', iday: null, isunset: '#ffe2c8', idusk: '#aaa0c4', inight: '#7a80a8', idawn: '#ffe8d8' };
  function drawSky(g, hy, ph, R) {
    g.fillStyle = lin(g, 0, 0, 0, hy, SKY[ph]); g.fillRect(0, 0, VW, VH);
    if (ph === 'dusk' || ph === 'night') for (let i = 0; i < 110; i++) { const y = R() * hy * 0.85; g.fillStyle = `rgba(255,255,${220 + R() * 35 | 0},${(0.25 + R() * 0.75) * (1 - y / hy)})`; g.fillRect(R() * VW | 0, y | 0, 1, 1); }
    if (ph === 'day') { g.fillStyle = rad(g, 320, hy * 0.2, 90, ['rgba(255,252,230,.55)', 'rgba(255,252,230,0)']); g.fillRect(0, 0, VW, hy); }
    if (ph === 'sunset' || ph === 'dawn') { g.fillStyle = rad(g, ph === 'dawn' ? 90 : 300, hy - 4, 110, ['rgba(255,230,150,.95)', 'rgba(255,160,80,.35)', 'rgba(255,120,60,0)']); g.fillRect(0, 0, VW, hy); ell(g, ph === 'dawn' ? 90 : 300, hy - 3, 10, 10, '#fff4c8'); }
    if (ph === 'dusk' || ph === 'night') { g.fillStyle = rad(g, 64, 30, 30, ['rgba(240,240,220,.4)', 'rgba(240,240,220,0)']); g.fillRect(30, 0, 70, 70); ell(g, 64, 30, 6, 6, '#f4f0dc'); ell(g, 66, 28, 5, 5, SKY[ph][1]); }
    const cc = { day: ['#ffffff', '#aebcd2'], sunset: ['#ffd8a8', '#7a4a70'], dusk: ['#5a4a7a', '#1e1a3c'], night: ['#1e2444', '#0a0e22'], dawn: ['#ffe0d0', '#a07090'] }[ph];
    for (let i = 0; i < 6; i++) cloud(g, R, R() * VW, 10 + R() * hy * 0.5, 30 + R() * 70, cc);
  }
  function cloud(g, R, x, y, w, [lt, dk]) {
    for (let i = 0; i < 10; i++) { const cx = x + (R() - 0.5) * w, cy = y + (R() - 0.5) * w * 0.1, rx = w * (0.12 + R() * 0.2), ry = rx * 0.4; g.globalAlpha = 0.5; ell(g, cx, cy + ry * 0.35, rx, ry, dk); g.globalAlpha = 0.65; ell(g, cx - rx * 0.1, cy - ry * 0.2, rx * 0.85, ry * 0.7, lt); }
    g.globalAlpha = 1;
  }
  function applyTint(L, t) {
    const col = TINT[t]; if (!col) return;
    const g = L.getContext('2d'), keep = mk(L.width, L.height); keep.getContext('2d').drawImage(L, 0, 0);
    g.globalCompositeOperation = 'multiply'; g.fillStyle = col; g.fillRect(0, 0, L.width, L.height);
    g.globalCompositeOperation = 'destination-in'; g.drawImage(keep, 0, 0); g.globalCompositeOperation = 'source-over';
  }
  function vignette(g, a = 0.38) { g.fillStyle = rad(g, VW / 2, VH / 2, VW * 0.62, ['rgba(0,0,0,0)', `rgba(0,0,0,${a})`], VH * 0.42); g.fillRect(0, 0, VW, VH); }
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  function dither(g, w = VW, h = VH) {
    const im = g.getImageData(0, 0, w, h), d = im.data, st = 255 / 7;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4, b = (BAYER[(y & 3) * 4 + (x & 3)] / 16 - 0.47) * st;
      for (let c = 0; c < 3; c++) { let v = Math.round((d[i + c] + b) / st) * st; d[i + c] = v < 0 ? 0 : v > 255 ? 255 : v; }
    }
    g.putImageData(im, 0, 0);
  }

  /* ---------- the Wren family flag code (made up by Grandpa) ---------- */
  const FLAGS = { A: ['h3', '#c8302a', '#f4f2ea'], E: ['dot', '#1f4f9c', '#f0c828'], G: ['diag', '#2e7d3a', '#f4f2ea'], K: ['cross', '#f4f2ea', '#c8302a'], L: ['check', '#222222', '#f0c828'], N: ['h2', '#f0c828', '#1f4f9c'], O: ['border', '#c8302a', '#f4f2ea'], R: ['v2', '#1f4f9c', '#c8302a'], S: ['salt', '#1f4f9c', '#f4f2ea'], T: ['tri', '#f4f2ea', '#2e7d3a'], U: ['v3', '#f0c828', '#222222'], W: ['sq', '#2e7d3a', '#f0c828'] };
  function flagDraw(g, L, x, y, w, h) {
    const [p, a, b] = FLAGS[L]; box(g, x, y, w, h, a); g.fillStyle = b;
    if (p === 'h3') g.fillRect(x, y + h / 3, w, h / 3);
    else if (p === 'dot') ell(g, x + w / 2, y + h / 2, h * 0.28, h * 0.28, b);
    else if (p === 'diag') poly(g, [x + w, y, x + w, y + h, x, y + h], b);
    else if (p === 'cross') { g.fillRect(x + w * 0.4, y, w * 0.2, h); g.fillRect(x, y + h * 0.4, w, h * 0.2); }
    else if (p === 'check') { for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2) g.fillRect(x + i * w / 4, y + j * h / 4, w / 4, h / 4); }
    else if (p === 'h2') g.fillRect(x, y + h / 2, w, h / 2);
    else if (p === 'border') g.fillRect(x + w * 0.22, y + h * 0.22, w * 0.56, h * 0.56);
    else if (p === 'v2') g.fillRect(x + w / 2, y, w / 2, h);
    else if (p === 'salt') { g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); line(g, x, y, x + w, y + h, b, h * 0.2); line(g, x + w, y, x, y + h, b, h * 0.2); g.restore(); }
    else if (p === 'tri') poly(g, [x, y, x + w * 0.6, y + h / 2, x, y + h], b);
    else if (p === 'v3') g.fillRect(x + w / 3, y, w / 3, h);
    else if (p === 'sq') g.fillRect(x + w * 0.3, y + h * 0.25, w * 0.4, h * 0.5);
    g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = 1; g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }
  const flagCache = {};
  function flagCv(L, w = 22, h = 15) { const k = L + w + 'x' + h; if (!flagCache[k]) { const c = mk(w, h); flagDraw(c.getContext('2d'), L, 0, 0, w, h); flagCache[k] = c; } return flagCache[k]; }
  const flagImg = L => `<img class="lgh-flag" alt="Flag ${L}" src="${flagCv(L, 44, 30).toDataURL()}">`;
  const WORD = 'TERN';

  /* ---------- Grandpa's island chart (used by the map puzzle and for quick travel) ---------- */
  const MAPPLACES = [
    { id: 'dock', x: 92, y: 158, label: 'Dock' }, { id: 'boathouse_ext', x: 62, y: 150, label: 'Boathouse' },
    { id: 'cottage_ext', x: 48, y: 100, label: 'Cottage' }, { id: 'garden', x: 62, y: 78, label: '' },
    { id: 'fork', x: 96, y: 112, label: '' }, { id: 'lh_base', x: 100, y: 46, label: 'Light' },
    { id: 'cliff', x: 136, y: 100, label: 'Cliff' }, { id: 'foghorn_ext', x: 150, y: 80, label: 'Horn' },
    { id: 'cove', x: 146, y: 136, label: 'Cave' }
  ];
  let mapCanvas = null;
  function mapImg() {
    if (mapCanvas) return mapCanvas;
    const c = mk(180, 180), g = c.getContext('2d'), R = rng(77);
    g.fillStyle = lin(g, 0, 0, 180, 180, ['#efe0b8', '#e2cc96', '#d8bc84']); g.fillRect(0, 0, 180, 180);
    speck(g, R, 0, 0, 180, 180, 1400, ['rgba(120,80,30,.12)', 'rgba(255,255,255,.18)']);
    g.strokeStyle = 'rgba(40,80,120,.25)'; for (let y = 4; y < 180; y += 5) { g.beginPath(); for (let x = 0; x <= 180; x += 6) g.lineTo(x, y + Math.sin(x * 0.3 + y) * 1.2); g.stroke(); }
    const isl = [30, 60, 52, 40, 80, 26, 108, 24, 128, 38, 150, 58, 166, 80, 160, 104, 164, 126, 150, 146, 124, 160, 100, 172, 76, 166, 50, 158, 30, 140, 22, 118, 30, 96, 22, 80];
    poly(g, isl, '#e8d6a4', '#5a3a1a', 1.5);
    clipDo(g, isl, () => { speck(g, R, 0, 0, 180, 180, 500, ['rgba(80,110,40,.3)', 'rgba(90,60,20,.15)']); });
    poly(g, [168, 60, 176, 56, 180, 62, 172, 66], '#b8a070', '#5a3a1a'); txt(g, 'Tern', 168, 44, 'bold 8px Georgia', '#3a2410'); txt(g, 'Ledge', 168, 52, 'bold 8px Georgia', '#3a2410');
    g.setLineDash([2, 3]); g.strokeStyle = '#8a2a1a'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(92, 160); g.lineTo(96, 112); g.lineTo(60, 102); g.lineTo(62, 84); g.stroke(); g.setLineDash([]);
    const ic = (x, y, col) => { box(g, x - 3, y - 3, 6, 6, col); g.strokeStyle = '#3a2410'; g.strokeRect(x - 3.5, y - 3.5, 7, 7); };
    ic(92, 160, '#8a6a3a'); ic(62, 150, '#6a7a86'); ic(48, 100, '#f4f0e4'); ic(40, 72, '#5a4030'); ic(80, 70, '#bfe0e8'); ic(150, 80, '#a0522d');
    box(g, 98, 30, 5, 18, '#f4f0e4'); box(g, 98, 36, 5, 4, '#c03a2e'); box(g, 97, 27, 7, 3, '#3a2410');
    ell(g, 146, 136, 5, 4, '#3a2a1a');
    MAPPLACES.forEach(p => { if (p.label) txt(g, p.label, p.x, p.y + (p.id === 'lh_base' ? -24 : 10), 'bold 9px Georgia', '#3a2410'); });
    // the X at the sundial
    line(g, 57, 79, 67, 89, '#c0201a', 3); line(g, 67, 79, 57, 89, '#c0201a', 3);
    txt(g, 'KEY', 62, 96, 'bold 8px Georgia', '#c0201a');
    // compass rose
    g.save(); g.translate(22, 24); poly(g, [0, -14, 4, 0, 0, 14, -4, 0], '#3a2410'); poly(g, [0, -14, 4, 0, -4, 0], '#c0201a'); txt(g, 'N', 0, -19, 'bold 9px Georgia', '#3a2410'); g.restore();
    txt(g, 'GULL ROCK', 124, 174, 'italic bold 9px Georgia', '#5a3a1a');
    g.strokeStyle = '#6a4a20'; g.lineWidth = 2; g.strokeRect(1, 1, 178, 178);
    return (mapCanvas = c);
  }

  /* ---------- gears ---------- */
  function gear(g, x, y, r, teeth, ang, o = {}) {
    g.save(); g.translate(x, y); g.rotate(ang);
    const ro = r, ri = r - Math.max(2.5, 4);
    g.beginPath();
    for (let i = 0; i < teeth; i++) { const a = i / teeth * TAU, s = TAU / teeth; g.lineTo(Math.cos(a) * ri, Math.sin(a) * ri); g.lineTo(Math.cos(a + s * 0.2) * ro, Math.sin(a + s * 0.2) * ro); g.lineTo(Math.cos(a + s * 0.5) * ro, Math.sin(a + s * 0.5) * ro); g.lineTo(Math.cos(a + s * 0.7) * ri, Math.sin(a + s * 0.7) * ri); }
    g.closePath();
    g.fillStyle = rad(g, -r * 0.35, -r * 0.35, r * 1.4, o.col || ['#fff0b0', '#d8a444', '#8a5a18', '#4a3008']); g.fill();
    g.strokeStyle = o.bad ? '#ff3020' : 'rgba(40,24,4,.85)'; g.lineWidth = o.bad ? 2 : 1; g.stroke();
    if (r > 15) for (let k = 0; k < 4; k++) { const a = k * TAU / 4 + 0.4; ell(g, Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5, r * 0.17, r * 0.17, 'rgba(30,18,4,.75)'); }
    ell(g, 0, 0, Math.max(3, r * 0.2), Math.max(3, r * 0.2), '#6a4a18'); ell(g, 0, 0, Math.max(1.5, r * 0.08), Math.max(1.5, r * 0.08), '#1a1004');
    g.restore();
  }

  /* ---------- interiors ---------- */
  function room(g, R, o) {
    const { bx, by, bw, bh } = o, bx2 = bx + bw, by2 = by + bh;
    poly(g, [0, 0, VW, 0, bx2, by, bx, by], lin(g, 0, 0, 0, by, [sh(o.ceil, -0.45), o.ceil]));
    if (o.beams) for (let i = 1; i < 4; i++) { const t = i / 4, x0 = VW * t, x1 = bx + bw * t; poly(g, [x0 - 7, 0, x0 + 7, 0, x1 + 2, by, x1 - 2, by], lin(g, 0, 0, 0, by, ['#2a1c10', '#4a3420'])); }
    const fl = [bx, by2, bx2, by2, VW, VH, 0, VH];
    clipDo(g, fl, () => {
      box(g, 0, by2, VW, VH - by2, lin(g, 0, by2, 0, VH, [sh(o.floor, -0.4), o.floor, sh(o.floor, 0.08)]));
      if (o.tiles) { for (let j = 0; j < 8; j++) for (let i = -6; i < 16; i++) { if ((i + j) % 2) continue; const t0 = Math.pow(j / 8, 1.6), t1 = Math.pow((j + 1) / 8, 1.6), y0 = by2 + (VH - by2) * t0, y1 = by2 + (VH - by2) * t1; const xa = u => bx + bw * u / 10 + (u / 10 - 0.5) * (VW - bw) * 0; const px = (u, t) => { const xb = bx + bw * u / 10, xf = -VW * 0.25 + VW * 1.5 * u / 10; return xb + (xf - xb) * t; }; void xa; poly(g, [px(i, t0), y0, px(i + 1, t0), y0, px(i + 1, t1), y1, px(i, t1), y1], 'rgba(0,0,0,.28)'); } }
      else { const n = 16; for (let i = 0; i <= n; i++) { const x0 = bx + bw * i / n, x1 = -VW * 0.4 + VW * 1.8 * i / n; line(g, x0, by2, x1, VH, 'rgba(0,0,0,.35)'); } speck(g, R, 0, by2, VW, VH - by2, 300, ['rgba(0,0,0,.25)', 'rgba(255,255,255,.08)'], 2); }
    });
    const lw = [0, 0, bx, by, bx, by2, 0, VH], rw = [VW, 0, bx2, by, bx2, by2, VW, VH];
    poly(g, lw, lin(g, 0, 0, bx, 0, [sh(o.wall, -0.5), sh(o.wall, -0.18)]));
    poly(g, rw, lin(g, VW, 0, bx2, 0, [sh(o.wall, -0.55), sh(o.wall, -0.22)]));
    box(g, bx, by, bw, bh, lin(g, 0, by, 0, by2, [sh(o.wall, 0.06), sh(o.wall, -0.12)]));
    if (o.planks) {
      planks(g, R, bx, by, bw, bh, o.wall, true, 12);
      for (let i = 1; i < 7; i++) { const u = 1 - Math.pow(1 - i / 7, 1.6); let x = bx * u; line(g, x, by * x / bx, x, VH - (VH - by2) * x / bx, 'rgba(0,0,0,.35)'); x = VW - (VW - bx2) * u; line(g, x, by * (VW - x) / (VW - bx2), x, VH - (VH - by2) * (VW - x) / (VW - bx2), 'rgba(0,0,0,.35)'); }
    }
    if (o.paper) { for (let x = bx + 3; x < bx2; x += 9) box(g, x, by, 3, bh, 'rgba(255,255,255,.07)'); speck(g, R, bx, by, bw, bh, 400, ['rgba(120,40,40,.18)', 'rgba(255,240,200,.15)']); box(g, bx, by2 - 10, bw, 10, sh(o.wall, -0.45)); }
    if (o.bricks) stones(g, R, bx, by, bw, bh, o.wall, 9);
    speck(g, R, 0, 0, VW, VH, 900, ['rgba(0,0,0,.08)', 'rgba(255,255,255,.04)']);
  }
  function jetty(g, R, near, far, yN, yF, base = '#8a7258') {
    // near/far: [xl, xr] at the near (bottom) and far edge
    const n = 22;
    for (let i = 0; i < n; i++) {
      const t0 = Math.pow(i / n, 1.7), t1 = Math.pow((i + 1) / n, 1.7);
      const y0 = yF + (yN - yF) * t0, y1 = yF + (yN - yF) * t1;
      const xl0 = far[0] + (near[0] - far[0]) * t0, xr0 = far[1] + (near[1] - far[1]) * t0, xl1 = far[0] + (near[0] - far[0]) * t1, xr1 = far[1] + (near[1] - far[1]) * t1;
      poly(g, [xl0, y0, xr0, y0, xr1, y1, xl1, y1], sh(base, (R() - 0.5) * 0.3 - (1 - t1) * 0.25));
      line(g, xl1, y1, xr1, y1, 'rgba(0,0,0,.45)', Math.max(1, t1 * 2));
      for (let k = 0; k < 3; k++) { const u = R(); box(g, xl0 + (xr0 - xl0) * u, y0 + 1, (xr0 - xl0) * 0.2 * R(), 1, 'rgba(0,0,0,.14)'); }
    }
    for (let s = 0; s < 2; s++) for (let i = 0; i < 5; i++) {
      const t = Math.pow(i / 4, 1.7), y = yF + (yN - yF) * t, x = s ? far[1] + (near[1] - far[1]) * t : far[0] + (near[0] - far[0]) * t, w = 2 + t * 8, h = 8 + t * 34;
      box(g, x - w / 2, y - h * 0.5, w, h, lin(g, x - w / 2, 0, x + w / 2, 0, ['#3a2a1a', '#7a6048', '#2a1c10']));
    }
  }
  const sparkle = (g, x, y, w, h, n = 14) => { for (let i = 0; i < n; i++) { const t = Math.random(); g.fillStyle = `rgba(255,255,240,${0.3 + Math.random() * 0.5})`; g.fillRect((x + Math.random() * w) | 0, (y + t * t * h) | 0, 1 + (Math.random() * 3 | 0), 1); } };
  const gulls = (g, t, y0 = 40) => { for (let i = 0; i < 2; i++) { const x = ((t / (60 + i * 25) + i * 170) % 520) - 60, y = y0 + i * 18 + Math.sin(t / 700 + i) * 6, f = Math.sin(t / 120 + i * 2) * 2; g.strokeStyle = 'rgba(30,30,40,.8)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x - 4, y - f); g.lineTo(x, y); g.lineTo(x + 4, y - f); g.stroke(); } };
  function sunPath(g, R, x, y0, y1, col = 'rgba(255,190,100,') { for (let i = 0; i < 160; i++) { const t = R(), y = y0 + t * (y1 - y0), w = 2 + t * 24 * R(); g.fillStyle = col + (0.2 + 0.5 * R() * (1 - t * 0.5)) + ')'; g.fillRect((x + (R() - 0.5) * (8 + t * 60)) | 0, y | 0, w | 0, 1); } }
  function ledge(g, R, x, y, s) { rock(g, R, [x - 12 * s, y, x - 7 * s, y - 5 * s, x + 2 * s, y - 7 * s, x + 12 * s, y - 3 * s, x + 16 * s, y], '#6a6a66', '#2a2a28'); foam(g, R, [x - 14 * s, y, x + 17 * s, y], 1); box(g, x - 22 * s, y - 6 * s, 3 * s, 6 * s, '#a0301f'); box(g, x - 23 * s, y - 7 * s, 5 * s, 1.5 * s, '#502010'); }
  function lanternBlink(g, t, x, y) { const on = Math.floor(t / 450) % 6; if (on === 0 || on === 2 || on === 4) glow(g, x, y, 10, 'rgba(255,220,120,1)'); }

  /* hotspot builders */
  const F = (r, to, tip) => ({ r, c: 'fwd', to, tip }), Lt = (r, to, tip) => ({ r, c: 'left', to, tip }), Rt = (r, to, tip) => ({ r, c: 'right', to, tip });
  const B = (r, to, tip) => ({ r, c: 'back', to, tip: tip || 'Go back' }), H = (r, act, tip, acc) => ({ r, c: 'hand', act, tip, acc }), K = (r, act, tip) => ({ r, c: 'look', act, tip });
  const BACK = [0, 214, VW, 26];
  const ledgeLook = () => msg(S.solved.horn ? 'Tern Ledge. A tiny lantern glows out there: that is Grandpa!' : 'Tern Ledge, a low rock half a mile out. Beside it bobs the old bell buoy, silent since the storm.');

  /* ---------- the scenes ---------- */
  const SC = {
    dock: {
      name: 'The dock', amb: 'sea', sky: 112,
      draw(g, R, S) {
        sea(g, R, 112, VH);
        grass(g, R, [0, 124, 30, 112, 70, 100, 120, 86, 170, 70, 205, 58, 240, 56, 270, 66, 310, 84, 350, 100, 384, 108, 384, 130, 0, 132], '#94b25c', '#4b6a2e');
        rock(g, R, [0, 128, 60, 124, 120, 126, 200, 122, 260, 126, 330, 120, 384, 124, 384, 136, 0, 138], '#8d8878', '#3f3b33');
        foam(g, R, [0, 137, 120, 134, 260, 135, 384, 134]);
        g.strokeStyle = '#d4c49a'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(196, 124); g.quadraticCurveTo(170, 100, 205, 86); g.quadraticCurveTo(232, 74, 238, 60); g.stroke();
        cottage(g, R, 70, 92, 34, 14, { rh: 8, side: 6 });
        tower(g, 240, 60, 46, 14, 10, { lit: lit() });
        // boathouse on pilings
        for (let i = 0; i < 6; i++) box(g, 12 + i * 18, 176, 4, 26, '#2a2016');
        planks(g, R, 8, 118, 100, 62, '#6f7f86', true, 7);
        poly(g, [0, 122, 58, 90, 116, 122], lin(g, 0, 90, 0, 122, ['#4a3a30', '#241a14']));
        box(g, 32, 140, 46, 40, '#161a1e'); box(g, 40, 152, 30, 3, '#3a3024');
        box(g, 42, 104, 30, 8, '#e0d8c0'); txt(g, 'BOATS', 57, 108, 'bold 6px Georgia', '#3a3024');
        jetty(g, R, [96, 300], [174, 214], VH, 150);
        box(g, 262, 162, 8, 60, lin(g, 262, 0, 270, 0, ['#3a2a1a', '#7a6048', '#2a1c10']));
        poly(g, [256, 170, 272, 168, 274, 186, 258, 188], '#f4eed8', 'rgba(0,0,0,.3)');
        for (let i = 0; i < 4; i++) box(g, 259, 173 + i * 3.5, 12, 1, 'rgba(40,40,80,.55)');
        ell(g, 134, 222, 16, 6, '#a88a5a'); ell(g, 134, 222, 10, 4, '#6a5030'); ell(g, 134, 222, 5, 2, '#a88a5a');
        planks(g, R, 300, 196, 40, 26, '#8a6a42', false, 6); box(g, 300, 196, 40, 2, '#3a2a18');
      },
      anim(g, t) { sparkle(g, 0, 138, VW, 100, 10); gulls(g, t, 30); },
      hs: S => [H([252, 160, 28, 34], () => note('n_dock'), 'Read the note'), F([150, 110, 110, 42], 'path1', 'Walk up the island'), Lt([0, 96, 116, 92], 'boathouse_ext', 'The boathouse'), B(BACK, 'dock_sea', 'Turn around')]
    },
    dock_sea: {
      name: 'End of the dock', amb: 'sea', sky: 118,
      draw(g, R, S) {
        sea(g, R, 118, VH, 0, VW, ['#9cb8cc', '#4f7ea6', '#244a70']);
        ledge(g, R, 300, 121, 1);
        poly(g, [70, 118, 96, 118, 92, 123, 74, 123], '#f0ece0'); box(g, 78, 112, 10, 6, '#c03a2e'); box(g, 83, 106, 2, 6, '#333'); foam(g, R, [96, 122, 140, 121], 1);
        box(g, 0, 116, 60, 2, 'rgba(90,110,130,.6)');
        jetty(g, R, [40, 344], [160, 224], VH, 176);
        ell(g, 330, 222, 9, 5, '#2a2a2a'); box(g, 324, 205, 12, 17, lin(g, 324, 0, 336, 0, ['#1a1a1a', '#5a5a5a', '#1a1a1a']));
      },
      lights(g, R, S, ph) { if (ph === 'sunset') sunPath(g, R, 300, 120, 200); },
      anim(g, t, S) { sparkle(g, 0, 124, VW, 60, 14); gulls(g, t, 50); if (S.solved.horn) lanternBlink(g, t, 304, 112); },
      hs: S => [K([272, 104, 60, 24], ledgeLook, 'Tern Ledge'), K([60, 100, 90, 26], () => msg('The supply boat chugs away toward the mainland. Captain Maud will be back on Tuesday.'), 'The supply boat'), B(BACK, 'dock', 'Turn around')]
    },
    boathouse_ext: {
      name: 'The boathouse', amb: 'wood', sky: 70, key: S => S.solved.flags ? 'o' : 'c',
      draw(g, R, S) {
        sea(g, R, 70, 200);
        rock(g, R, [0, 150, 30, 120, 60, 140, 70, 230, 0, 230]); rock(g, R, [330, 230, 320, 150, 350, 120, 384, 130, 384, 230]);
        clipDo(g, [60, 66, 192, 10, 324, 66, 324, 212, 60, 212], () => planks(g, R, 60, 10, 264, 202, '#5f7680', true, 11));
        poly(g, [44, 70, 192, 4, 340, 70, 330, 74, 192, 14, 54, 74], lin(g, 0, 4, 0, 74, ['#5a4838', '#2a201a']));
        box(g, 150, 40, 84, 15, '#ece4cc'); txt(g, 'BOATHOUSE', 192, 48, 'bold 9px Georgia', '#2a3a44');
        if (S.solved.flags) {
          box(g, 112, 96, 160, 116, lin(g, 0, 96, 0, 212, ['#0e1216', '#1c2228']));
          poly(g, [150, 212, 234, 212, 214, 150, 170, 150], '#2a2620'); glow(g, 192, 130, 40, 'rgba(120,150,170,1)', 0.25);
          poly(g, [96, 92, 112, 96, 112, 212, 96, 218], lin(g, 96, 0, 112, 0, ['#2a3a40', '#4a6068']));
          poly(g, [288, 92, 272, 96, 272, 212, 288, 218], lin(g, 272, 0, 288, 0, ['#4a6068', '#2a3a40']));
        } else {
          planks(g, R, 112, 96, 80, 116, '#3f5560', true, 10); planks(g, R, 192, 96, 80, 116, '#3f5560', true, 10);
          line(g, 116, 200, 188, 108, '#2a3a40', 5); line(g, 196, 108, 268, 200, '#2a3a40', 5);
          box(g, 112, 96, 160, 3, '#22303a'); box(g, 191, 96, 2, 116, '#1a2228');
          box(g, 172, 140, 40, 6, '#2a2a2a');
          rr(g, 181, 144, 22, 26, 4); g.fillStyle = lin(g, 181, 0, 203, 0, ['#7a5a14', '#f0cc60', '#a07820']); g.fill();
          g.strokeStyle = '#3a2a08'; g.lineWidth = 2; g.beginPath(); g.arc(192, 144, 7, Math.PI, 0); g.stroke();
          for (let i = 0; i < 4; i++) box(g, 184 + i * 4.5, 152, 3, 10, '#2a1e08');
        }
        planks(g, R, 0, 212, VW, 28, '#7a6a52', false, 7);
        box(g, 186, 70, 12, 6, '#222'); ell(g, 192, 80, 5, 5, '#d8c890');
      },
      hs: S => S.solved.flags ? [F([112, 96, 160, 116], 'boathouse_in', 'Go inside'), B(BACK, 'dock', 'Back to the dock')]
        : [H([174, 132, 38, 42], () => openCU('letters'), 'The letter lock'), H([112, 96, 160, 116], () => { seen('flags'); msg('The doors are locked with a brass letter lock. Four letters.'); }, 'The doors'), B(BACK, 'dock', 'Back to the dock')]
    },
    boathouse_in: {
      name: 'Inside the boathouse', amb: 'wood', sky: null,
      draw(g, R, S) {
        room(g, R, { bx: 70, by: 40, bw: 244, bh: 120, wall: '#6a5a48', floor: '#4a3e30', ceil: '#2e261e', planks: true });
        box(g, 150, 62, 84, 98, lin(g, 0, 62, 0, 120, ['#8fb4d8', '#e8dcc0']));
        sea(g, R, 120, 160, 150, 234, ['#8ab0c8', '#3c6a90']);
        box(g, 146, 58, 92, 4, '#2a2016'); box(g, 146, 58, 4, 102, '#2a2016'); box(g, 234, 58, 4, 102, '#2a2016');
        poly(g, [150, 160, 234, 160, 300, 240, 84, 240], lin(g, 0, 160, 0, 240, ['#3a3a36', '#2a241c']));
        for (let i = 0; i < 9; i++) { const t = i / 9; line(g, 150 - 66 * t, 160 + 80 * t, 234 + 66 * t, 160 + 80 * t, 'rgba(0,0,0,.4)'); }
        line(g, 170, 160, 130, 240, '#5a4a36', 3); line(g, 214, 160, 254, 240, '#5a4a36', 3);
        for (const [y, s] of [[176, 0.6], [206, 1]]) { poly(g, [192 - 26 * s, y - 16 * s, 192 - 20 * s, y - 16 * s, 192, y, 192 + 20 * s, y - 16 * s, 192 + 26 * s, y - 16 * s, 192, y + 6 * s], '#6a4a2a', '#2a1a0a'); }
        g.save(); g.globalCompositeOperation = 'lighter'; poly(g, [150, 62, 234, 62, 330, 240, 60, 240], 'rgba(120,140,150,.12)'); g.restore();
        poly(g, [84, 64, 134, 64, 134, 128, 84, 128], '#efe6cc', 'rgba(0,0,0,.4)');
        txt(g, 'TIDES', 109, 71, 'bold 7px Georgia', '#2a2016');
        for (let i = 0; i < 6; i++) { box(g, 88, 79 + i * 8, 42, 1, 'rgba(40,40,80,.45)'); box(g, 88 + (i * 7 % 30), 81 + i * 8, 10, 3, 'rgba(40,40,80,.35)'); }
        box(g, 246, 98, 46, 4, '#3a2a18'); box(g, 252, 82, 22, 16, '#6a2a1a'); box(g, 254, 84, 18, 12, '#8a3a26'); box(g, 274, 86, 8, 12, '#2a3a5a');
        g.lineWidth = 6; g.strokeStyle = '#e8e4d8'; g.beginPath(); g.arc(300, 70, 12, 0, TAU); g.stroke();
        g.strokeStyle = '#c8302a'; for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(300, 70, 12, k * TAU / 4, k * TAU / 4 + 0.6); g.stroke(); }
        poly(g, [258, 132, 318, 128, 322, 190, 262, 192], lin(g, 258, 0, 322, 0, ['#5a3a1e', '#7a5230', '#4a2e16']), '#2a1a0a');
        for (let i = 0; i < 3; i++) { box(g, 266, 140 + i * 17, 50, 1, '#2a1a0a'); box(g, 286, 146 + i * 17, 10, 3, '#d8b860'); }
        for (let i = 0; i < 3; i++) line(g, 20 + i * 12, 60, 36 + i * 12, 200, '#8a6a42', 3);
        ell(g, 60, 214, 20, 7, '#a88a5a'); ell(g, 60, 214, 13, 4, '#5a4020');
        box(g, 190, 0, 2, 22, '#222'); rr(g, 184, 22, 14, 16, 2); g.fillStyle = '#2a2a2a'; g.fill();
      },
      hs: S => [K([82, 62, 56, 70], () => clue('tide'), 'Tide table'), K([246, 78, 44, 26], () => clue('boatlog'), 'Boat log'), H([256, 126, 68, 68], () => openCU('map'), 'Chart drawer'),
        K([150, 62, 84, 98], () => msg("The slipway runs down into the sea. Grandpa's rowboat, the Puffin, is gone!"), 'Slipway'), B(BACK, 'boathouse_ext', 'Go outside')]
    },
    path1: {
      name: 'The hill path', amb: 'sea', sky: 100,
      draw(g, R, S) {
        sea(g, R, 100, VH);
        grass(g, R, [0, 240, 0, 110, 60, 100, 130, 92, 200, 82, 250, 88, 290, 104, 320, 140, 330, 240], '#98b660', '#48662c');
        rock(g, R, [300, 120, 330, 150, 344, 200, 330, 240, 300, 240, 310, 180]);
        foam(g, R, [320, 220, 350, 190, 384, 200]);
        tower(g, 214, 88, 62, 16, 11, { lit: lit(), door: true });
        for (let i = 0; i < 12; i++) {
          const t = i / 12, y = 240 - Math.pow(t, 0.8) * 150, w = 110 - t * 90, x = 180 + Math.sin(t * 3) * 20 * (1 - t), hh = 12 - t * 9;
          stones(g, R, x - w / 2, y - hh, w, hh, '#a8a294', Math.max(3, 10 - t * 7)); box(g, x - w / 2, y - hh, w, 2, 'rgba(255,255,255,.2)');
        }
        for (let i = 0; i < 6; i++) { const t = i / 6, y = 236 - Math.pow(t, 0.8) * 150, x = 110 + t * 70; box(g, x, y - 30 * (1 - t) - 6, 3 - t * 2, 30 * (1 - t) + 6, '#6a4a2a'); }
        g.strokeStyle = '#8a6a42'; g.lineWidth = 2; g.beginPath(); for (let i = 0; i <= 6; i++) { const t = i / 6, y = 236 - Math.pow(t, 0.8) * 150, x = 110 + t * 70; g.lineTo(x + 1, y - 30 * (1 - t) - 6); } g.stroke();
        speck(g, R, 0, 130, 110, 110, 160, ['#f4e04a', '#ffffff', '#e888b0', '#b0a0f0'], 2);
        speck(g, R, 250, 120, 60, 60, 60, ['#f4e04a', '#ffffff'], 2);
      },
      anim(g, t) { sparkle(g, 300, 104, 84, 90, 6); gulls(g, t, 36); },
      hs: S => [F([130, 70, 120, 110], 'fork', 'Up the hill'), B(BACK, 'dock', 'Back down to the dock')]
    },
    fork: {
      name: 'The crossroads', amb: 'sea', sky: 96,
      draw(g, R, S) {
        sea(g, R, 96, 160);
        grass(g, R, [0, 240, 0, 118, 60, 112, 140, 106, 210, 100, 260, 104, 300, 112, 340, 124, 384, 140, 384, 240], '#98b660', '#48662c');
        tower(g, 196, 112, 94, 28, 19, { lit: lit(), door: true });
        cottage(g, R, 6, 100, 70, 26, { rh: 16 });
        winEx(g, 20, 108, 10, 9); winEx(g, 50, 108, 10, 9);
        const pth = (p) => clipDo(g, p, b => { box(g, b.x, b.y, b.w, b.h, lin(g, 0, b.y, 0, b.y + b.h, ['#b8a27a', '#8a7450'])); speck(g, R, b.x, b.y, b.w, b.h, (b.w * b.h * 0.08) | 0, ['#6a5a40', '#d8c8a0', '#9a8a6a'], 2); });
        pth([150, 240, 250, 240, 206, 170, 200, 118, 192, 118, 184, 170]);
        pth([170, 190, 190, 176, 100, 150, 60, 130, 50, 134, 90, 160]);
        pth([206, 180, 222, 192, 330, 160, 384, 150, 384, 160, 330, 172]);
        box(g, 118, 108, 5, 96, lin(g, 118, 0, 123, 0, ['#5a3a1a', '#8a6a42', '#4a2a10']));
        const board = (x, y, w, dir, s) => { const p = dir < 0 ? [x, y + 5, x + 8, y, x + w, y, x + w, y + 10, x + 8, y + 10] : dir > 0 ? [x, y, x + w - 8, y, x + w, y + 5, x + w - 8, y + 10, x, y + 10] : [x, y + 2, x + w / 2, y - 4, x + w, y + 2, x + w, y + 12, x, y + 12]; poly(g, p, '#e8dcb8', '#4a3418'); txt(g, s, x + w / 2 + (dir < 0 ? 3 : dir > 0 ? -3 : 0), y + 6, 'bold 7px Georgia', '#3a2410'); };
        board(100, 110, 42, 0, 'LIGHT'); board(76, 128, 48, -1, 'COTTAGE'); board(117, 146, 42, 1, 'CLIFF');
        rock(g, R, [330, 150, 350, 132, 384, 130, 384, 180]);
        speck(g, R, 0, 150, 384, 90, 140, ['#f4e04a', '#ffffff', '#e888b0'], 2);
      },
      anim(g, t) { gulls(g, t, 30); sparkle(g, 250, 100, 134, 30, 5); },
      hs: S => [F([168, 16, 60, 106], 'lh_base', 'To the lighthouse'), Lt([0, 70, 96, 100], 'cottage_ext', 'To the cottage'), Rt([290, 96, 94, 100], 'cliff', 'To the cliff'),
        K([96, 100, 66, 60], () => msg('The signpost: LIGHT straight ahead, COTTAGE to the left, CLIFF to the right.'), 'Signpost'), B(BACK, 'path1', 'Back down the path')]
    },
    cottage_ext: {
      name: 'The keeper\'s cottage', amb: 'sea', sky: 90,
      draw(g, R, S) {
        sea(g, R, 90, 120);
        grass(g, R, [0, 120, 384, 110, 384, 240, 0, 240], '#98b660', '#48662c');
        cottage(g, R, 62, 92, 236, 100, { rh: 56, side: 34 });
        winEx(g, 90, 112, 44, 36); winEx(g, 228, 112, 44, 36);
        for (const x of [88, 226]) { box(g, x - 2, 152, 52, 8, '#6a3a1e'); speck(g, R, x, 144, 48, 9, 60, ['#e04040', '#f080a0', '#40a040', '#ffe060'], 2); }
        rr(g, 160, 118, 42, 74, 3); g.fillStyle = lin(g, 160, 0, 202, 0, ['#1e4028', '#3a6a48', '#1e3a26']); g.fill();
        g.beginPath(); g.arc(181, 118, 21, Math.PI, 0); g.fillStyle = '#e8e0c0'; g.fill(); for (let i = 1; i < 5; i++) line(g, 181, 118, 181 - Math.cos(i * Math.PI / 5) * 20, 118 - Math.sin(i * Math.PI / 5) * 20, '#3a6a48');
        for (let i = 0; i < 2; i++) box(g, 166, 126 + i * 32, 30, 26, 'rgba(0,0,0,.15)');
        ell(g, 194, 156, 2.5, 2.5, '#e8c050'); box(g, 150, 192, 62, 6, '#a8a294');
        const pth = [150, 198, 212, 198, 260, 240, 110, 240];
        clipDo(g, pth, b => { box(g, b.x, b.y, b.w, b.h, '#b0a080'); stones(g, R, b.x, b.y, b.w, b.h, '#b8ae98', 9); });
        for (let x = 300; x < 384; x += 9) { box(g, x, 170, 5, 40, '#f0ece0'); poly(g, [x, 170, x + 2.5, 165, x + 5, 170], '#f0ece0'); }
        box(g, 300, 180, 84, 3, '#d8d4c8'); box(g, 300, 198, 84, 3, '#d8d4c8');
        g.strokeStyle = '#3a5a2a'; g.lineWidth = 4; g.beginPath(); g.arc(344, 170, 28, Math.PI, 0); g.stroke();
        speck(g, R, 312, 136, 64, 36, 90, ['#e04060', '#f08090', '#2a6a2a', '#3a7a3a'], 2);
        speck(g, R, 0, 200, 150, 40, 80, ['#f4e04a', '#ffffff'], 2);
      },
      anim(g, t) { for (let i = 0; i < 5; i++) { const p = ((t / 3000) + i / 5) % 1; g.fillStyle = `rgba(200,200,210,${0.3 * (1 - p)})`; ell(g, 115 + p * 18 + Math.sin(p * 6 + i) * 3, 12 - p * 40, 3 + p * 8, 2 + p * 5, g.fillStyle); } gulls(g, t, 20); },
      hs: S => [F([158, 112, 46, 82], 'cottage_in', 'Go inside'), Rt([306, 120, 78, 90], 'garden', 'Through the garden gate'), B(BACK, 'fork', 'Back to the crossroads')]
    },
    cottage_in: {
      name: 'The living room', amb: 'room', sky: null, key: S => (S.f.matches ? 'm' : '') + (S.solved.chest ? 'o' : ''),
      draw(g, R, S) {
        room(g, R, { bx: 90, by: 40, bw: 204, bh: 120, wall: '#b8986a', floor: '#6a4a2e', ceil: '#4a3a2a', paper: true, beams: true });
        stones(g, R, 104, 78, 86, 82, '#9a9080', 8);
        rr(g, 122, 102, 50, 58, 6); g.fillStyle = '#120a06'; g.fill();
        for (let i = 0; i < 6; i++) ell(g, 132 + i * 6, 156, 5, 2.5, i % 2 ? '#c84010' : '#7a2808');
        box(g, 98, 72, 98, 7, lin(g, 0, 72, 0, 79, ['#8a6034', '#4a3018']));
        box(g, 130, 50, 24, 22, '#5a3418'); ell(g, 142, 60, 8, 8, '#f4ecd0'); line(g, 142, 60, 142, 54, '#111', 1.5); line(g, 142, 60, 147, 60, '#111', 1.5);
        if (!S.f.matches) { box(g, 166, 65, 13, 7, '#c83020'); box(g, 166, 67, 13, 2, '#f0d040'); }
        box(g, 104, 64, 10, 8, '#3a5a8a'); box(g, 182, 62, 8, 10, '#e8e0c8');
        winEx(g, 214, 56, 58, 52, { frame: '#f0e8d4' });
        clipDo(g, [214, 56, 272, 56, 272, 108, 214, 108], () => { box(g, 214, 56, 58, 30, lin(g, 0, 56, 0, 86, ['#8ab0d8', '#e0e0d0'])); sea(g, R, 86, 108, 214, 272); ledge(g, R, 250, 88, 0.5); box(g, 242, 56, 2, 52, '#f0e8d4'); box(g, 214, 81, 58, 2, '#f0e8d4'); });
        poly(g, [206, 52, 220, 52, 216, 116, 204, 118], '#9a3a3a'); poly(g, [266, 52, 280, 52, 282, 118, 270, 116], '#9a3a3a');
        box(g, 200, 128, 50, 5, '#5a3418'); box(g, 204, 133, 4, 30, '#4a2a10'); box(g, 242, 133, 4, 30, '#4a2a10');
        box(g, 210, 116, 30, 12, lin(g, 0, 116, 0, 128, ['#a06a30', '#5a3414'])); box(g, 212, 118, 26, 1, '#e0b060'); ell(g, 225, 122, 3, 2, '#e0c070');
        ell(g, 180, 196, 90, 22, '#7a2a24'); ell(g, 180, 196, 76, 17, '#a04030'); ell(g, 180, 196, 56, 12, '#7a2a24');
        poly(g, [300, 118, 384, 108, 384, 132, 300, 136], lin(g, 0, 108, 0, 136, ['#8a5a2e', '#5a3818'])); poly(g, [300, 136, 384, 132, 384, 214, 304, 206], lin(g, 300, 0, 384, 0, ['#4a2e14', '#6a4422']));
        box(g, 320, 150, 40, 3, '#2a1808'); box(g, 336, 144, 8, 4, '#d8b060');
        box(g, 330, 88, 3, 22, '#2a2a2a'); poly(g, [322, 80, 342, 80, 346, 92, 318, 92], '#2a6a3a');
        poly(g, [18, 70, 62, 82, 62, 196, 18, 214], '#1e140c'); poly(g, [24, 78, 56, 88, 56, 190, 24, 204], lin(g, 24, 0, 56, 0, ['#302418', '#4a3420']));
        if (S.solved.chest) { poly(g, [26, 150, 122, 150, 118, 120, 30, 120], lin(g, 0, 120, 0, 150, ['#5a3a1e', '#3a2410'])); box(g, 30, 158, 90, 10, '#120a04'); }
        planks(g, R, 26, 160, 96, 50, '#6b4a2c', false, 12);
        box(g, 26, 158, 96, 5, '#3a3a3a'); box(g, 26, 204, 96, 6, '#3a3a3a'); box(g, 40, 158, 6, 52, '#3a3a3a'); box(g, 102, 158, 6, 52, '#3a3a3a');
        if (!S.solved.chest) { rr(g, 62, 168, 24, 18, 3); g.fillStyle = lin(g, 62, 0, 86, 0, ['#8a6414', '#f0cc60', '#a07820']); g.fill(); for (let i = 0; i < 3; i++) box(g, 65 + i * 7, 173, 5, 8, '#2a1e08'); }
      },
      lights(g) { glow(g, 147, 150, 50, 'rgba(255,110,30,1)', 0.55); g.save(); g.globalCompositeOperation = 'lighter'; poly(g, [214, 56, 272, 56, 250, 230, 150, 230], 'rgba(255,240,200,.08)'); g.restore(); },
      anim(g, t) { glow(g, 147, 152, 26 + Math.sin(t / 140) * 4, 'rgba(255,90,20,1)', 0.25 + Math.random() * 0.15); },
      hs: S => [K([128, 46, 30, 28], () => clue('clock'), 'Mantel clock'), ...(S.f.matches ? [] : [H([162, 60, 22, 16], () => take('matches'), 'Box of matches')]),
        H([24, 150, 100, 62], () => S.solved.chest ? msg('The sea chest is open. Inside: old blankets, and a smell of salt and wool.') : openCU('chest'), 'Sea chest'), H([204, 110, 44, 22], () => openCU('musicbox'), 'Music box'),
        F([298, 104, 86, 106], 'cottage_desk', "Grandpa's desk"), Lt([14, 66, 52, 84], 'kitchen', 'The kitchen'), K([212, 54, 62, 56], () => msg('Through the window the sea sparkles. Far out you can just see Tern Ledge.'), 'Window'), B(BACK, 'cottage_ext', 'Go outside')]
    },
    cottage_desk: {
      name: "Grandpa's desk", amb: 'room', sky: null,
      draw(g, R, S) {
        box(g, 0, 0, VW, 120, lin(g, 0, 0, 0, 120, ['#8a6a44', '#b8986a']));
        for (let x = 0; x < VW; x += 9) box(g, x, 0, 3, 120, 'rgba(255,255,255,.06)');
        poly(g, [0, 110, VW, 110, VW, VH, 0, VH], lin(g, 0, 110, 0, VH, ['#5a3818', '#7a5028', '#4a2c10']));
        for (let i = 0; i < 10; i++) line(g, 0, 118 + i * 13, VW, 116 + i * 13, 'rgba(0,0,0,.14)');
        poly(g, [96, 124, 190, 118, 192, 214, 88, 214], lin(g, 96, 0, 190, 0, ['#e8dcb8', '#f8f0d8'])); poly(g, [192, 118, 288, 124, 296, 214, 192, 214], lin(g, 192, 0, 296, 0, ['#f8f0d8', '#e0d4b0']));
        line(g, 192, 118, 192, 214, 'rgba(0,0,0,.35)', 2);
        for (let i = 0; i < 8; i++) { line(g, 102, 134 + i * 10, 184, 132 + i * 10, 'rgba(40,40,90,.3)'); line(g, 200, 132 + i * 10, 284, 134 + i * 10, 'rgba(40,40,90,.3)'); box(g, 104, 130 + i * 10, 14 + R() * 60, 2, 'rgba(30,30,70,.5)'); box(g, 202, 130 + i * 10, 14 + R() * 60, 2, 'rgba(30,30,70,.5)'); }
        txt(g, '★', 110, 131, 'bold 9px serif', '#c02020'); txt(g, '★', 208, 161, 'bold 9px serif', '#c02020');
        box(g, 40, 130, 34, 8, '#6a4a18'); poly(g, [46, 130, 68, 130, 64, 96, 50, 96], 'rgba(240,240,220,.35)'); box(g, 54, 60, 6, 40, 'rgba(240,240,220,.4)'); ell(g, 57, 110, 4, 7, '#ffcc40');
        box(g, 294, 60, 56, 70, lin(g, 294, 0, 350, 0, ['#6a4410', '#d8a840', '#6a4410'])); box(g, 300, 66, 44, 58, lin(g, 0, 66, 0, 124, ['#a8c0d0', '#c8b890']));
        person(g, 322, 122, 44, { coat: '#3a5a8a', beard: true, cap: true }); ell(g, 314, 90, 5, 4, '#f0e8e0');
        ell(g, 330, 200, 14, 5, '#3a2a1a'); box(g, 318, 176, 24, 24, lin(g, 318, 0, 342, 0, ['#2a4a7a', '#4a70a8', '#2a4a7a'])); ell(g, 330, 176, 12, 4, '#1a1008');
        line(g, 240, 200, 280, 170, '#1a1a1a', 2); ell(g, 60, 196, 10, 6, '#111'); ell(g, 60, 192, 6, 3, '#333');
      },
      lights(g) { glow(g, 57, 108, 70, 'rgba(255,200,90,1)', 0.45); },
      hs: S => [H([90, 116, 206, 98], () => clue('log'), "Grandpa's log"), K([290, 56, 64, 78], () => msg('A photo of Grandpa on the dock, holding you as a baby. On the back: "August 1985."'), 'Photo'),
        K([30, 60, 50, 90], () => msg('An oil lamp. Its brass is polished bright. Grandpa does love a lamp.'), 'Oil lamp'), B(BACK, 'cottage_in', 'Stand up')]
    },
    kitchen: {
      name: 'The kitchen', amb: 'room', sky: null, key: S => S.f.catfood ? 'c' : '',
      draw(g, R, S) {
        room(g, R, { bx: 70, by: 36, bw: 240, bh: 124, wall: '#d8d0b8', floor: '#8a3a2a', ceil: '#5a4a3a', tiles: true });
        box(g, 70, 100, 240, 60, 'rgba(0,0,0,.05)'); g.strokeStyle = 'rgba(0,0,0,.1)'; g.lineWidth = 1; for (let x = 70; x < 310; x += 10) for (let y = 100; y < 160; y += 10) g.strokeRect(x + 0.5, y + 0.5, 10, 10);
        box(g, 128, 90, 112, 70, lin(g, 128, 0, 240, 0, ['#1a1a1a', '#3a3a3a', '#1a1a1a']));
        box(g, 124, 86, 120, 6, '#4a4a4a'); for (let i = 0; i < 2; i++) { box(g, 136 + i * 52, 104, 44, 40, '#222'); box(g, 150 + i * 52, 110, 16, 3, '#b8b8b8'); }
        box(g, 216, 40, 14, 48, '#2a2a2a');
        ell(g, 170, 84, 16, 6, '#2a5a9a'); poly(g, [156, 84, 160, 68, 180, 68, 184, 84], lin(g, 156, 0, 184, 0, ['#1a4a8a', '#5a8ad0', '#1a4a8a'])); line(g, 182, 76, 192, 70, '#2a5a9a', 3); g.strokeStyle = '#111'; g.beginPath(); g.arc(170, 66, 8, Math.PI, 0); g.stroke();
        for (const y of [60, 84]) { box(g, 76, y, 44, 3, '#6a4a2a'); for (let i = 0; i < 4; i++) { const c = ['#c04040', '#e0c060', '#8a6a40', '#6a8a40'][(i + y) % 4]; box(g, 78 + i * 11, y - 13, 8, 13, c); box(g, 78 + i * 11, y - 15, 8, 3, '#e8e0d0'); } }
        box(g, 258, 56, 36, 50, '#f8f4e8'); box(g, 260, 58, 32, 18, lin(g, 0, 58, 0, 76, ['#6a90c0', '#4a6a40'])); box(g, 274, 60, 4, 14, '#f4f0e0'); box(g, 274, 60, 4, 3, '#c03a2e');
        for (let j = 0; j < 4; j++) for (let i = 0; i < 7; i++) { box(g, 261 + i * 4.3, 80 + j * 6, 3, 4, (j * 7 + i) < 18 ? 'rgba(160,20,20,.7)' : 'rgba(0,0,0,.25)'); }
        g.strokeStyle = '#d02020'; g.lineWidth = 1.5; g.beginPath(); g.ellipse(261 + 4 * 4.3 + 1.5, 80 + 2 * 6 + 2, 3.5, 3.5, 0, 0, TAU); g.stroke();
        poly(g, [310, 150, 384, 140, 384, 240, 316, 214], lin(g, 310, 0, 384, 0, ['#8a6a44', '#6a4a2a'])); poly(g, [300, 144, 384, 132, 384, 144, 310, 152], '#c8b898');
        if (!S.f.catfood) { box(g, 334, 124, 16, 14, lin(g, 334, 0, 350, 0, ['#8a8a8a', '#e0e0e0', '#8a8a8a'])); box(g, 334, 128, 16, 6, '#e08030'); }
        winEx(g, 330, 50, 34, 40, { frame: '#e8e0cc' });
      },
      lights(g) { glow(g, 347, 70, 60, 'rgba(255,245,210,1)', 0.25); },
      hs: S => [K([254, 52, 44, 58], () => clue('cal'), 'Calendar'), K([150, 60, 44, 30], () => msg('The kettle is stone cold. Grandpa must have left hours ago.'), 'Kettle'), ...(S.f.catfood ? [] : [H([328, 118, 28, 24], () => take('catfood'), 'Tin of cat food')]),
        K([74, 40, 50, 50], () => msg('Jars of jam, oats and tea, and a tin labelled EMERGENCY COCOA.'), 'Shelves'), B(BACK, 'cottage_in', 'Back to the living room')]
    },
    garden: {
      name: 'The garden', amb: 'sea', sky: 84, key: S => S.f.ws ? 'o' : '',
      draw(g, R, S) {
        sea(g, R, 84, 118);
        stones(g, R, 0, 112, VW, 16, '#9a9488', 7);
        grass(g, R, [0, 128, VW, 128, VW, VH, 0, VH], '#8aa852', '#415f28');
        for (let i = 0; i < 5; i++) { const y0 = 150 + i * 18, h = 6 + i * 2; poly(g, [60 - i * 20, y0, 150 - i * 4, y0, 150 - i * 4, y0 + h, 60 - i * 20, y0 + h], '#5a3a1e'); speck(g, R, 60 - i * 20, y0 - 4, 90 + i * 16, h, 40 + i * 10, ['#3a8a2a', '#5aaa3a', '#2a6a1a'], 2 + (i >> 1)); }
        planks(g, R, 0, 70, 110, 110, '#4a3a2a', true, 9);
        poly(g, [-6, 74, 55, 46, 116, 74], lin(g, 0, 46, 0, 74, ['#2a2a2a', '#111']));
        if (S.f.ws) { box(g, 40, 104, 34, 76, '#0e0a06'); poly(g, [74, 104, 86, 100, 86, 184, 74, 180], '#5a4a36'); } else { box(g, 40, 104, 34, 76, '#3a2e22'); box(g, 68, 136, 6, 8, '#8a8a8a'); }
        winEx(g, 14, 100, 16, 14, { frame: '#6a5a44' });
        const gx = 250, gy = 70;
        clipDo(g, [gx, gy + 30, gx + 67, gy, VW, gy + 30, VW, 180, gx, 180], b => {
          box(g, b.x, b.y, b.w, b.h, lin(g, gx, 0, VW, 0, ['#a8c8d8', '#e0f0f0', '#98b8c8']));
          speck(g, R, gx, 110, 134, 70, 200, ['#3a8a2a', '#5aaa3a', '#c83030'], 3);
          for (let x = gx; x < VW; x += 14) box(g, x, gy, 2, 120, '#f4f4ee'); for (let y = gy + 30; y < 180; y += 20) box(g, gx, y, 134, 2, '#f4f4ee');
          poly(g, [gx + 20, 100, gx + 50, 100, gx + 30, 180, gx, 180], 'rgba(255,255,255,.3)');
        });
        line(g, gx, gy + 30, gx + 67, gy, '#f4f4ee', 2); line(g, gx + 67, gy, VW, gy + 30, '#f4f4ee', 2);
        box(g, 172, 150, 18, 40, lin(g, 172, 0, 190, 0, ['#7a746a', '#c8c2b4', '#6a645a'])); ell(g, 181, 190, 16, 5, '#6a645a');
        ell(g, 181, 148, 20, 7, lin(g, 161, 0, 201, 0, ['#8a6a14', '#e8c060', '#8a6a14'])); poly(g, [181, 147, 192, 147, 181, 134], '#6a4a10');
        for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; box(g, 181 + Math.cos(a) * 16, 148 + Math.sin(a) * 5, 1, 1, '#3a2a08'); }
      },
      anim(g, t) { gulls(g, t, 24); },
      hs: S => [H([160, 128, 44, 66], sundial, 'The sundial', ['chart']), Rt([250, 70, 134, 110], 'greenhouse_in', 'The greenhouse'), Lt([0, 70, 116, 112], 'workshop_ext', 'The workshop shed'), B(BACK, 'cottage_ext', 'Back to the cottage')]
    },
    greenhouse_in: {
      name: 'The greenhouse', amb: 'glass', sky: null, key: S => S.f.fed ? 'f' : '',
      draw(g, R, S) {
        box(g, 0, 0, VW, 150, lin(g, 0, 0, 0, 150, ['#9cc4e4', '#d8ecf0', '#f0f0e0']));
        cloud(g, R, 90, 30, 80, ['#ffffff', '#c0d0e0']); cloud(g, R, 300, 50, 60, ['#ffffff', '#c0d0e0']);
        for (let i = 0; i <= 8; i++) { const x = i * 48; line(g, 192, 10, x, 0, '#f8f8f2', 2); line(g, x, 0, x < 192 ? x - 20 : x + 20, 150, '#f8f8f2', 2); }
        for (let y = 30; y < 150; y += 30) box(g, 0, y, VW, 2, '#f8f8f2');
        poly(g, [0, 150, VW, 150, VW, VH, 0, VH], lin(g, 0, 150, 0, VH, ['#7a6a54', '#5a4a36'])); speck(g, R, 0, 150, VW, 90, 400, ['#4a3a26', '#9a8a70'], 2);
        const bench = (x0, x1, y) => { box(g, x0, y, x1 - x0, 6, '#8a6a42'); box(g, x0 + 4, y + 6, 4, 40, '#5a4228'); box(g, x1 - 8, y + 6, 4, 40, '#5a4228'); for (let x = x0 + 8; x < x1 - 10; x += 22) { poly(g, [x, y, x + 14, y, x + 12, y - 12, x + 2, y - 12], '#b85a30'); ell(g, x + 7, y - 20, 11, 11, '#3a7a2a'); speck(g, R, x - 4, y - 32, 22, 22, 18, ['#5aaa3a', '#c83030', '#f0d040'], 2); } };
        bench(0, 130, 150); bench(254, VW, 150);
        for (let i = 0; i < 4; i++) { const x = 150 + i * 28; line(g, x, 40, x, 150, '#6a5a3a', 2); speck(g, R, x - 12, 44, 24, 106, 60, ['#2a6a1a', '#3a8a2a', '#4a9a3a'], 3); speck(g, R, x - 10, 70, 20, 70, 8, ['#e03020', '#f04030'], 3); }
        box(g, 188, 90, 6, 130, '#e8e8e0'); box(g, 184, 100, 16, 20, '#f8f4e0'); for (let i = 0; i < 4; i++) box(g, 186, 104 + i * 4, 12, 1, 'rgba(40,40,80,.5)');
        ell(g, 70, 186, 44, 10, '#a89060'); speck(g, R, 30, 178, 80, 16, 30, ['#8a7040', '#c8b080']);
        cat(g, 70, 186, 44, { sit: S.f.fed });
        if (S.f.fed) { ell(g, 110, 196, 9, 3, '#c0c0c8'); }
      },
      lights(g) { g.save(); g.globalCompositeOperation = 'lighter'; poly(g, [100, 0, 160, 0, 220, 240, 120, 240], 'rgba(255,250,210,.08)'); g.restore(); },
      anim(g, t, S) { if (!S.f.fed) { const z = (t / 900) % 3; txt(g, 'z', 44 - z * 2, 160 - z * 10, 'bold 8px Georgia', `rgba(255,255,255,${1 - z / 3})`); } },
      hs: S => [H([22, 150, 100, 46], catAct, 'Biscuit the cat', ['catfood']), K([180, 96, 26, 28], () => note('n_green'), 'A note'), K([140, 40, 110, 110], () => msg('Tomatoes, beans and a row of prize geraniums. Grandpa talks to them every morning.'), 'Plants'), B(BACK, 'garden', 'Back to the garden')]
    },
    workshop_ext: {
      name: 'The workshop shed', amb: 'wood', sky: 40, key: S => S.f.ws ? 'o' : '',
      draw(g, R, S) {
        grass(g, R, [0, 200, VW, 200, VW, VH, 0, VH], '#8aa852', '#415f28');
        planks(g, R, 30, 30, 324, 180, '#4a3a2a', true, 12);
        poly(g, [16, 34, 192, 0, 368, 34, 368, 40, 16, 40], '#1a1a1a');
        if (S.f.ws) { box(g, 150, 70, 84, 140, lin(g, 0, 70, 0, 210, ['#0a0806', '#1a140e'])); box(g, 170, 150, 50, 8, '#2a2016'); poly(g, [234, 70, 262, 64, 262, 216, 234, 210], lin(g, 234, 0, 262, 0, ['#3a2e22', '#5a4a36'])); }
        else {
          planks(g, R, 150, 70, 84, 140, '#3a2e22', true, 14); line(g, 154, 200, 230, 80, '#2a2016', 5); box(g, 150, 70, 84, 3, '#1a140e');
          box(g, 222, 132, 20, 5, '#5a5a5a'); rr(g, 224, 136, 18, 20, 3); g.fillStyle = lin(g, 224, 0, 242, 0, ['#4a4a4a', '#9a9a9a', '#3a3a3a']); g.fill(); g.strokeStyle = '#555'; g.lineWidth = 3; g.beginPath(); g.arc(233, 136, 6, Math.PI, 0); g.stroke(); box(g, 232, 144, 2, 6, '#111');
        }
        winEx(g, 56, 80, 50, 40, { frame: '#6a5a44' }); line(g, 56, 80, 76, 96, 'rgba(255,255,255,.3)');
        ell(g, 310, 196, 22, 6, '#2a1c10'); box(g, 290, 150, 40, 46, lin(g, 290, 0, 330, 0, ['#3a2a1a', '#6a5030', '#3a2a1a'])); for (const y of [158, 186]) box(g, 290, y, 40, 3, '#222'); ell(g, 310, 150, 20, 5, '#1a2a3a');
      },
      hs: S => S.f.ws ? [F([150, 70, 84, 140], 'workshop_in', 'Go inside'), B(BACK, 'garden', 'Back to the garden')]
        : [H([146, 66, 110, 146], wsDoor, 'The shed door', ['wkey']), B(BACK, 'garden', 'Back to the garden')]
    },
    workshop_in: {
      name: 'The workshop', amb: 'wood', sky: null, key: S => S.f.gears ? 'g' : '',
      draw(g, R, S) {
        room(g, R, { bx: 60, by: 30, bw: 264, bh: 110, wall: '#6a5238', floor: '#5a4a3a', ceil: '#3a2e22', planks: true });
        box(g, 76, 40, 120, 70, '#b89a70'); speck(g, R, 76, 40, 120, 70, 200, ['rgba(0,0,0,.25)'], 1);
        const tool = (x, y, w, h, c) => { box(g, x - 1, y - 1, w + 2, h + 2, 'rgba(255,255,255,.35)'); box(g, x, y, w, h, c); };
        tool(84, 50, 30, 6, '#8a8a8a'); tool(84, 56, 8, 4, '#6a4a2a'); tool(124, 48, 5, 26, '#6a4a2a'); tool(120, 46, 13, 7, '#5a5a5a'); tool(142, 50, 4, 30, '#9a9a9a');
        g.strokeStyle = '#fff'; g.setLineDash([2, 2]); g.strokeRect(160.5, 48.5, 8, 40); g.setLineDash([]);
        box(g, 176, 50, 12, 12, '#c83030');
        box(g, 250, 38, 66, 60, '#f4ecd4'); txt(g, 'FLAG CODE', 283, 45, 'bold 7px Georgia', '#2a2016');
        Object.keys(FLAGS).forEach((L, i) => { const x = 254 + (i % 4) * 16, y = 52 + ((i / 4) | 0) * 15; flagDraw(g, L, x, y, 11, 8); txt(g, L, x + 5.5, y + 11.5, 'bold 5px Arial', '#2a2016'); });
        winEx(g, 204, 44, 34, 30, { frame: '#5a4a36' });
        poly(g, [40, 132, 344, 132, 364, 150, 20, 150], lin(g, 0, 132, 0, 150, ['#9a7a50', '#6a4a2a'])); box(g, 20, 150, 344, 10, '#4a3218');
        for (const x of [30, 180, 340]) box(g, x, 160, 10, 60, '#3a2610');
        box(g, 50, 118, 26, 14, '#4a4a5a'); box(g, 56, 110, 14, 8, '#6a6a7a'); line(g, 48, 116, 78, 116, '#9a9aaa', 2);
        if (!S.f.gears) { box(g, 166, 112, 36, 20, lin(g, 166, 0, 202, 0, ['#8a1a1a', '#d84040', '#8a1a1a'])); box(g, 164, 110, 40, 4, '#a02020'); for (let i = 0; i < 4; i++) box(g, 170 + i * 8, 118, 4, 10, 'rgba(240,200,60,.8)'); }
        poly(g, [212, 124, 236, 122, 238, 132, 214, 134], '#f8f4e0'); for (let i = 0; i < 3; i++) box(g, 216, 125 + i * 3, 18, 1, 'rgba(40,40,80,.5)');
        ell(g, 270, 126, 10, 3, '#5a5a5a'); gear(g, 290, 124, 8, 8, 0.3);
        box(g, 190, 0, 2, 16, '#222'); rr(g, 184, 16, 14, 16, 2); g.fillStyle = '#2a2a2a'; g.fill(); box(g, 187, 19, 8, 10, '#8a7a4a');
      },
      lights(g) { g.save(); g.globalCompositeOperation = 'lighter'; poly(g, [204, 44, 238, 44, 280, 150, 180, 150], 'rgba(255,240,200,.1)'); g.restore(); },
      hs: S => [K([246, 34, 74, 68], () => clue('flagcode'), 'Flag code poster'), ...(S.f.gears ? [] : [H([160, 104, 48, 30], () => take('gears'), 'A biscuit tin')]), K([208, 118, 34, 20], () => note('n_work'), 'A note'),
        K([76, 40, 120, 70], () => msg('Tools, each hanging in its painted outline. One outline is empty: the big wrench. Grandpa must have taken it with him.'), 'Tool board'), B(BACK, 'workshop_ext', 'Go outside')]
    },
    cliff: {
      name: 'The cliff top', amb: 'cliff', sky: 92,
      draw(g, R, S) {
        sea(g, R, 92, VH, 0, VW, ['#9cb8cc', '#4a7aa2', '#1e4468']);
        ledge(g, R, 156, 96, 0.8);
        rock(g, R, [210, 240, 236, 176, 280, 160, 330, 156, 384, 152, 384, 240]);
        foam(g, R, [200, 240, 226, 206, 250, 186], 4);
        grass(g, R, [0, 240, 0, 150, 60, 146, 140, 146, 200, 150, 240, 158, 290, 150, 340, 146, 384, 144, 384, 170, 330, 176, 280, 182, 250, 196, 236, 240], '#9ab860', '#4a6a2a');
        brickHouse(g, R, 312, 116, 50, 34, 0.5);
        g.fillStyle = lin(g, 250, 0, 256, 0, ['#9a9a9a', '#ffffff', '#8a8a8a']); g.fillRect(250, 26, 5, 142); box(g, 238, 38, 30, 3, '#dddddd'); ell(g, 252, 25, 3, 3, '#e0c040');
        line(g, 256, 30, 262, 150, 'rgba(40,40,40,.6)');
        for (let i = 0; i < 3; i++) { const x = 20 + i * 20; box(g, x, 150 + i * 6, 3, 30, '#6a4a2a'); } line(g, 20, 150, 62, 162, '#6a4a2a', 2);
        speck(g, R, 0, 160, 220, 80, 150, ['#f4e04a', '#ffffff', '#e888b0', '#6a4a8a'], 2);
      },
      lights(g, R, S, ph) { if (ph === 'sunset') sunPath(g, R, 300, 94, 200); },
      anim(g, t, S) {
        WORD.split('').forEach((L, i) => { const c = flagCv(L), y = 40 + i * 20; for (let x = 0; x < c.width; x++) g.drawImage(c, x, 0, 1, c.height, 257 + x, y + Math.sin(t / 200 + x * 0.35 + i) * (x / 12), 1, c.height); });
        sparkle(g, 0, 100, 230, 120, 12); gulls(g, t, 60); if (S.solved.horn) lanternBlink(g, t, 160, 88);
      },
      hs: S => [K([240, 30, 50, 100], () => clue('pole'), 'The flags'), K([130, 84, 50, 18], ledgeLook, 'Tern Ledge'), Rt([296, 90, 88, 70], 'foghorn_ext', 'The foghorn house'), Lt([0, 136, 90, 70], 'cliff_steps', 'Steps down the cliff'), B(BACK, 'fork', 'Back to the crossroads')]
    },
    foghorn_ext: {
      name: 'The foghorn house', amb: 'cliff', sky: 110,
      draw(g, R, S) {
        sea(g, R, 110, 170);
        grass(g, R, [0, 170, VW, 164, VW, VH, 0, VH], '#9ab860', '#4a6a2a');
        brickHouse(g, R, 96, 96, 192, 110, 1);
        rr(g, 172, 138, 40, 68, 3); g.fillStyle = lin(g, 172, 0, 212, 0, ['#1a3a6a', '#3a5a9a', '#1a2a5a']); g.fill(); ell(g, 204, 174, 2.5, 2.5, '#e0c050');
        box(g, 156, 118, 72, 12, '#ece4cc'); txt(g, 'FOG SIGNAL', 192, 124, 'bold 8px Georgia', '#2a2016');
        winEx(g, 116, 136, 28, 26); winEx(g, 240, 136, 28, 26);
      },
      anim(g, t) { gulls(g, t, 20); sparkle(g, 0, 112, VW, 50, 6); },
      hs: S => [F([168, 134, 48, 74], 'foghorn_in', 'Go inside'), K([96, 20, 200, 60], () => msg('Two great horns point out to sea. On a foggy night you can hear them for miles.'), 'The horns'), B(BACK, 'cliff', 'Back to the cliff')]
    },
    foghorn_in: {
      name: 'Inside the foghorn house', amb: 'wood', sky: null,
      draw(g, R, S) {
        room(g, R, { bx: 60, by: 36, bw: 264, bh: 124, wall: '#8a5a44', floor: '#4a4a48', ceil: '#2e2a28', bricks: true });
        box(g, 104, 46, 180, 110, lin(g, 0, 46, 0, 156, ['#3a3a3a', '#222']));
        for (let i = 0; i < 5; i++) { const x = 120 + i * 34, top = 54 + i * 12; box(g, x, top, 14, 80 - i * 12, lin(g, x, 0, x + 14, 0, ['#7a5a14', '#f0cc60', '#8a6414'])); ell(g, x + 7, top, 10, 4, '#c8a040'); line(g, x + 7, 134, x + 7, 146, '#888', 1); box(g, x, 146, 14, 4, '#c8a040'); }
        box(g, 20, 120, 34, 80, lin(g, 20, 0, 54, 0, ['#1a4a2a', '#3a7a4a', '#1a3a20'])); ell(g, 37, 120, 17, 5, '#2a5a3a'); ell(g, 37, 140, 9, 9, '#f0ece0'); line(g, 37, 140, 42, 134, '#c00', 1.5);
        winEx(g, 330, 60, 30, 36, { frame: '#d8d0c0' });
      },
      hs: S => [H([100, 42, 190, 118], () => openCU('horn'), 'The horn valves'), K([16, 116, 44, 90], () => msg('An air tank with a pressure gauge. The horns run on compressed air.'), 'Air tank'), B(BACK, 'foghorn_ext', 'Go outside')]
    },
    cliff_steps: {
      name: 'The cliff steps', amb: 'cliff', sky: 50,
      draw(g, R, S) {
        sea(g, R, 50, VH, 0, VW, ['#8ab0c8', '#3a6a92', '#1a3e60']);
        rock(g, R, [0, 0, 150, 0, 170, 60, 140, 120, 160, 180, 130, 240, 0, 240], '#9a9282', '#3e3a32');
        rock(g, R, [150, 0, 230, 0, 262, 60, 290, 140, 316, 200, 320, 240, 130, 240, 160, 180, 140, 120, 170, 60], '#8a8272', '#3a342c');
        rock(g, R, [300, 240, 320, 200, 350, 210, 384, 204, 384, 240]);
        foam(g, R, [290, 180, 318, 198, 350, 208, 384, 202], 4);
        clipDo(g, [150, 170, 280, 180, 300, 240, 120, 240], b => { box(g, b.x, b.y, b.w, b.h, '#8a8478'); speck(g, R, b.x, b.y, b.w, b.h, 500, ['#6a6458', '#b8b0a0', '#4a4438'], 2); });
        for (let i = 0; i < 12; i++) { const t = i / 12, y = 30 + t * 190, x = 170 + Math.sin(t * 9) * 30 * t, w = 22 + t * 60; box(g, x, y, w, 3 + t * 5, lin(g, x, 0, x + w, 0, ['#5a4028', '#9a7a50', '#5a4028'])); box(g, x, y + 3 + t * 5, w, 2, 'rgba(0,0,0,.4)'); if (i % 2 === 0) box(g, x + w - 2, y - 12 - t * 10, 2 + t * 2, 14 + t * 10, '#4a3218'); }
        speck(g, R, 0, 0, 150, 240, 60, ['#ffffff', '#e0e0e0'], 2);
      },
      anim(g, t) { sparkle(g, 180, 60, 204, 130, 10); },
      hs: S => [F([120, 90, 170, 124], 'cove', 'Climb down to the beach'), B([0, 0, VW, 26], 'cliff', 'Climb back up'), B(BACK, 'cliff', 'Climb back up')]
    },
    cove: {
      name: 'The cove', amb: 'sea', sky: 80, key: S => S.solved.tide ? 'o' : '',
      draw(g, R, S) {
        sea(g, R, 80, 180);
        foam(g, R, [0, 176, 80, 170, 160, 176, 230, 172], 5); foam(g, R, [0, 150, 120, 146, 220, 150], 2);
        rock(g, R, [210, 240, 220, 110, 240, 40, 280, 0, 384, 0, 384, 240], '#9a9080', '#3a342c');
        poly(g, [278, 196, 280, 120, 300, 92, 326, 90, 346, 116, 350, 196], '#0a0806');
        for (let i = 0; i < 6; i++) line(g, 288 + i * 10, 112 - (i === 0 || i === 5 ? -10 : 0), 288 + i * 10, 196, S.solved.tide && i < 3 ? 'rgba(0,0,0,0)' : '#3a3a40', 2);
        clipDo(g, [0, 176, 230, 172, 290, 196, VW, 190, VW, VH, 0, VH], b => { box(g, b.x, b.y, b.w, b.h, lin(g, 0, 176, 0, VH, ['#8a8272', '#b0a894'])); speck(g, R, b.x, b.y, b.w, b.h, 1600, ['#6a6458', '#d0c8b8', '#4a4438', '#9a9080', '#e8e0d0'], 2); });
        for (const [x, y, rx] of [[90, 210, 34], [180, 226, 22]]) { ell(g, x, y, rx, rx * 0.25, '#3a5a70'); ell(g, x - 4, y - 1, rx * 0.7, rx * 0.15, '#7aa0b8'); speck(g, R, x - rx * 0.6, y - 2, rx * 1.2, 4, 6, ['#e04040', '#f08040'], 2); }
        poly(g, [120, 190, 210, 186, 212, 192, 122, 196], '#8a7a5a');
      },
      anim(g, t) { sparkle(g, 0, 90, 220, 80, 10); gulls(g, t, 30); },
      hs: S => [F([270, 84, 90, 116], 'cave_gate', 'To the cave'), K([56, 198, 70, 26], () => msg('A tide pool full of tiny crabs and red sea anemones.'), 'Tide pool'), B(BACK, 'cliff_steps', 'Back up the steps')]
    },
    cave_gate: {
      name: 'Gannet Cave', amb: 'cave', sky: null, key: S => S.solved.tide ? 'o' : '',
      draw(g, R, S) {
        box(g, 0, 0, VW, VH, '#0a0806');
        poly(g, [80, 230, 90, 90, 130, 36, 192, 22, 254, 36, 294, 90, 304, 230], lin(g, 0, 20, 0, 230, ['#050403', '#1a140e']));
        glow(g, 192, 170, 90, 'rgba(255,170,70,1)', 0.18);
        rock(g, R, [0, 0, VW, 0, VW, VH, 304, VH, 304, 230, 294, 90, 254, 36, 192, 22, 130, 36, 90, 90, 80, 230, 80, VH, 0, VH], '#8a8272', '#2e2a24');
        clipDo(g, [0, 216, VW, 206, VW, VH, 0, VH], b => { box(g, b.x, b.y, b.w, b.h, '#4a4438'); speck(g, R, b.x, b.y, b.w, b.h, 600, ['#6a6458', '#2a241c', '#8aa0b0'], 2); });
        speck(g, R, 60, 200, 260, 20, 40, ['#2a5a2a', '#3a7a3a'], 3);
        if (S.solved.tide) { for (let i = 0; i < 7; i++) line(g, 60 + i * 5, 60 + i * 2, 60 + i * 5, 226, '#2a2a30', 3); line(g, 60, 70, 92, 80, '#2a2a30', 3); }
        else {
          for (let i = 0; i < 11; i++) line(g, 100 + i * 18.4, 44, 100 + i * 18.4, 226, lin(g, 0, 0, 6, 0, ['#2a2a30', '#6a6a70']), 4);
          box(g, 92, 90, 200, 5, '#3a3a40'); box(g, 92, 180, 200, 5, '#3a3a40');
          ell(g, 192, 110, 30, 30, lin(g, 162, 0, 222, 0, ['#7a5a14', '#f0cc60', '#8a6414'])); ell(g, 192, 110, 24, 24, '#f4ecd0');
          for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; box(g, 192 + Math.sin(a) * 20 - 1, 110 - Math.cos(a) * 20 - 1, 2, 2, '#2a2016'); }
          line(g, 192, 110, 192, 94, '#111', 2); line(g, 192, 110, 204, 112, '#111', 2);
          box(g, 160, 146, 64, 12, lin(g, 160, 0, 224, 0, ['#7a5a14', '#e8c060', '#7a5a14']));
        }
      },
      lights(g, R, S) { if (S.solved.tide) glow(g, 200, 120, 60, 'rgba(255,190,90,1)', 0.35); },
      hs: S => S.solved.tide ? [F([96, 40, 190, 180], 'cave_in', 'Enter the cave'), B(BACK, 'cove', 'Back to the beach')]
        : [H([156, 76, 72, 88], () => openCU('tide'), 'The brass dial'), H([84, 36, 216, 180], () => { seen('tide'); msg('An iron gate bars the cave. A brass clock dial is fixed to the middle of it.'); }, 'The gate'), B(BACK, 'cove', 'Back to the beach')]
    },
    cave_in: {
      name: 'Inside Gannet Cave', amb: 'cave', sky: null, key: S => S.f.prism ? 'p' : '',
      draw(g, R, S) {
        box(g, 0, 0, VW, VH, '#0e0b08');
        rock(g, R, [0, 0, VW, 0, VW, 120, 330, 90, 280, 60, 200, 50, 120, 60, 60, 100, 0, 130], '#5a5044', '#1a1610');
        rock(g, R, [0, 130, 60, 100, 90, 160, 70, 240, 0, 240], '#6a6050', '#1a1610'); rock(g, R, [VW, 120, 330, 90, 300, 170, 320, 240, VW, 240], '#6a6050', '#1a1610');
        clipDo(g, [60, 100, 120, 60, 200, 50, 280, 60, 330, 90, 300, 170, 70, 180], b => box(g, b.x, b.y, b.w, b.h, rad(g, 192, 120, 160, ['#3a3026', '#16120c'])));
        poly(g, [0, 240, 80, 176, 320, 170, VW, 240], lin(g, 0, 170, 0, 240, ['#3a3228', '#5a5040'])); speck(g, R, 0, 170, VW, 70, 400, ['#2a241c', '#7a7060'], 2);
        ell(g, 110, 200, 56, 12, lin(g, 54, 0, 166, 0, ['#0a3a40', '#2a8a8a', '#0a3a40'])); ell(g, 120, 198, 24, 3, 'rgba(200,255,250,.3)');
        planks(g, R, 200, 150, 70, 40, '#7a5a34', true, 10); box(g, 200, 150, 70, 3, '#3a2a14'); planks(g, R, 280, 130, 44, 60, '#6a4a2a', false, 10);
        ell(g, 262, 120, 16, 20, '#4a3a22'); box(g, 246, 120, 32, 30, lin(g, 246, 0, 278, 0, ['#3a2a14', '#6a4a24', '#3a2a14']));
        box(g, 176, 138, 38, 14, '#8a6a3a'); speck(g, R, 176, 132, 38, 8, 40, ['#e0c060', '#c8a040'], 2);
        if (!S.f.prism) { poly(g, [188, 136, 196, 124, 204, 136], lin(g, 188, 124, 204, 136, ['#e0f8ff', '#80c0e0', '#ffffff'])); }
        poly(g, [226, 142, 246, 140, 247, 150, 227, 152], '#f8f4e0');
        box(g, 150, 60, 2, 30, '#333'); rr(g, 144, 90, 14, 18, 2); g.fillStyle = '#2a2a2a'; g.fill(); box(g, 147, 93, 8, 12, '#ffcc50');
      },
      lights(g, R, S) { glow(g, 151, 99, 110, 'rgba(255,180,80,1)', 0.55); glow(g, 110, 200, 50, 'rgba(60,200,200,1)', 0.2); },
      anim(g, t, S) { if (!S.f.prism && Math.sin(t / 300) > 0.6) glow(g, 198, 128, 8, 'rgba(220,250,255,1)', 0.9); if (Math.random() < 0.05) ell(g, 90 + Math.random() * 40, 196 + Math.random() * 6, 3, 1, 'rgba(200,255,250,.5)'); },
      hs: S => [...(S.f.prism ? [] : [H([172, 118, 46, 34], () => take('prism'), 'A straw-filled box')]), K([222, 136, 30, 20], () => note('n_cave'), 'A note'), K([56, 186, 110, 30], () => msg('A still pool. Something glows green-blue at the bottom: just sea glass.'), 'Pool'), B(BACK, 'cave_gate', 'Back outside')]
    },
    lh_base: {
      name: 'Foot of the lighthouse', amb: 'cliff', sky: 150, key: S => S.f.lh ? 'o' : '',
      draw(g, R, S) {
        sea(g, R, 150, 200);
        grass(g, R, [0, 196, VW, 196, VW, VH, 0, VH], '#9ab860', '#4a6a2a');
        tower(g, 192, 234, 320, 210, 150, {});
        stones(g, R, 70, 214, 244, 26, '#a8a294', 9);
        rr(g, 158, 138, 68, 80, 30); g.fillStyle = '#e8e4d8'; g.fill();
        if (S.f.lh) { rr(g, 164, 144, 56, 74, 26); g.fillStyle = lin(g, 0, 144, 0, 218, ['#0a0806', '#2a2016']); g.fill(); for (let i = 0; i < 4; i++) box(g, 176 + i * 6, 200 - i * 14, 30, 4, '#3a3a3a'); poly(g, [220, 150, 236, 146, 236, 218, 220, 218], '#6a1a14'); }
        else { rr(g, 164, 144, 56, 74, 26); g.fillStyle = lin(g, 164, 0, 220, 0, ['#4a100c', '#8a2a20', '#4a100c']); g.fill(); for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) ell(g, 172 + j * 20, 160 + i * 16, 1.5, 1.5, '#1a0a06'); box(g, 206, 176, 6, 10, '#c8a040'); box(g, 208, 178, 2, 6, '#111'); }
        box(g, 240, 168, 36, 22, lin(g, 240, 0, 276, 0, ['#7a5a14', '#e8c060', '#7a5a14'])); for (let i = 0; i < 3; i++) box(g, 245, 173 + i * 5, 26, 1, '#3a2a08');
      },
      anim(g, t) { gulls(g, t, 60); },
      hs: S => [S.f.lh ? F([158, 138, 68, 80], 'lh_stairs', 'Go inside') : H([156, 136, 72, 84], lhDoor, 'The lighthouse door', ['lhkey']), K([236, 164, 44, 30], () => msg('A brass plaque: GULL ROCK LIGHT. FIRST LIT 1887.'), 'Plaque'), B(BACK, 'fork', 'Back to the crossroads')]
    },
    lh_stairs: {
      name: 'The spiral stairs', amb: 'tower', sky: null,
      draw(g, R, S) {
        box(g, 0, 0, VW, VH, lin(g, 0, 0, VW, 0, ['#3a3832', '#b8b2a4', '#e8e2d4', '#b8b2a4', '#3a3832']));
        speck(g, R, 0, 0, VW, VH, 900, ['rgba(0,0,0,.08)', 'rgba(255,255,255,.08)']);
        ell(g, 192, 20, 30, 10, '#fff8e0'); glow(g, 192, 20, 60, 'rgba(255,250,220,1)', 0.4);
        const cx = 192;
        for (let i = 26; i >= 0; i--) {
          const t = i / 26, a = i * 0.55, r = 170 * (1 - t * 0.82), y = 236 - Math.pow(t, 0.85) * 214, da = 0.42, k = 0.16;
          const p0 = [cx + Math.cos(a - da / 2) * r, y + Math.sin(a - da / 2) * r * k], p1 = [cx + Math.cos(a + da / 2) * r, y + Math.sin(a + da / 2) * r * k];
          const front = Math.sin(a) > -0.2, th = 3 + (1 - t) * 6;
          poly(g, [cx, y + th, p0[0], p0[1] + th, p1[0], p1[1] + th], '#141414');
          poly(g, [cx, y, p0[0], p0[1], p1[0], p1[1]], lin(g, p0[0], 0, p1[0], 0, front ? ['#3a3a3a', '#8a8a86', '#4a4a48'] : ['#222', '#444', '#2a2a2a']));
          line(g, p1[0], p1[1], p1[0], p1[1] - 26 * (1 - t) - 5, front ? '#1a1a1a' : '#333', 1 + (1 - t) * 1.5);
        }
        box(g, cx - 5, 0, 10, 240, lin(g, cx - 5, 0, cx + 5, 0, ['#2a2a2a', '#6a6a66', '#1a1a1a']));
        box(g, 290, 60, 10, 40, '#fff8e8'); g.save(); g.globalCompositeOperation = 'lighter'; poly(g, [290, 60, 300, 60, 200, 220, 150, 220], 'rgba(255,240,200,.08)'); g.restore();
      },
      hs: S => [F([110, 10, 170, 190], 'watch_room', 'Climb the stairs'), B(BACK, 'lh_base', 'Go back outside')]
    },
    watch_room: {
      name: 'The watch room', amb: 'tower', sky: null, key: S => S.solved.gears ? 'g' : '',
      draw(g, R, S) {
        box(g, 0, 0, VW, VH, lin(g, 0, 0, VW, 0, ['#3a3630', '#a8a090', '#d8d0c0', '#a8a090', '#3a3630']));
        poly(g, [0, 190, VW, 190, VW, VH, 0, VH], lin(g, 0, 190, 0, VH, ['#4a3a2a', '#6a5238'])); for (let i = 0; i < 12; i++) line(g, 192 + (i - 6) * 20, 190, 192 + (i - 6) * 60, VH, 'rgba(0,0,0,.3)');
        box(g, 78, 56, 128, 130, lin(g, 78, 0, 206, 0, ['#3a2410', '#7a5230', '#3a2410'])); box(g, 86, 64, 112, 100, '#1a140c');
        const gp = S.solved.gears ? [[110, 110, 16], [142, 88, 14], [166, 120, 12], [120, 144, 10], [176, 150, 9]] : [[110, 110, 16], [176, 150, 9]];
        gp.forEach(([x, y, r]) => gear(g, x, y, r, r, 0.2));
        if (!S.solved.gears) for (const [x, y] of [[142, 88], [166, 120], [120, 144]]) ell(g, x, y, 2.5, 2.5, '#c8a040');
        g.fillStyle = 'rgba(200,230,255,.1)'; g.fillRect(86, 64, 112, 100); line(g, 90, 70, 120, 100, 'rgba(255,255,255,.2)', 2);
        for (let i = 0; i < 16; i++) box(g, 214, 30 + i * 8, 4, 6, '#555'); box(g, 208, 158, 16, 24, '#3a3a3a');
        winEx(g, 240, 70, 30, 44, { frame: '#d8d0c0' });
        for (let i = 0; i < 12; i++) box(g, 296, i * 17, 50, 3, '#2a2a2a'); box(g, 296, 0, 4, 200, '#2a2a2a'); box(g, 342, 0, 4, 200, '#2a2a2a');
        box(g, 20, 150, 50, 6, '#5a3a1a'); box(g, 24, 156, 4, 36, '#3a2410'); box(g, 60, 156, 4, 36, '#3a2410'); box(g, 30, 144, 20, 6, '#2a4a7a');
      },
      hs: S => [H([76, 54, 132, 134], () => openCU('gears'), 'The clockwork'), F([292, 0, 60, 196], 'lamp_room', 'Up the ladder to the lamp'), K([236, 66, 38, 52], () => msg('From up here the whole island looks like a map. The sea goes on forever.'), 'Window'), B(BACK, 'lh_stairs', 'Down the stairs')]
    },
    lamp_room: {
      name: 'The lamp room', amb: 'tower', sky: 150, key: S => (S.solved.lamp ? 'l' : '') + (S.f.prismIn ? 'p' : ''),
      draw(g, R, S) {
        sea(g, R, 150, 200);
        for (let i = 0; i < 6; i++) { const x = i * 76 - 20; line(g, x, 0, x + 60, 200, '#1a1a1a', 4); }
        box(g, 0, 196, VW, 8, '#1a1a1a');
        poly(g, [0, 204, VW, 204, VW, VH, 0, VH], '#2a2a2a'); for (let x = 0; x < VW; x += 6) line(g, x, 204, x - 30, VH, 'rgba(255,255,255,.08)');
        box(g, 172, 196, 40, 40, lin(g, 172, 0, 212, 0, ['#5a4010', '#c8a040', '#5a4010']));
        clipDo(g, [120, 40, 264, 40, 280, 120, 264, 196, 120, 196, 104, 120], () => {
          box(g, 100, 30, 184, 170, lin(g, 104, 0, 280, 0, ['rgba(120,160,170,.6)', 'rgba(230,250,255,.5)', 'rgba(120,160,170,.6)']));
          for (let i = 0; i < 14; i++) { const y = 42 + i * 11; if (y > 100 && y < 140) continue; box(g, 100, y, 184, 9, lin(g, 100, 0, 284, 0, ['rgba(60,90,100,.7)', 'rgba(255,255,255,.7)', 'rgba(160,200,210,.5)', 'rgba(60,90,100,.7)'])); box(g, 100, y + 8, 184, 1, 'rgba(20,40,40,.6)'); }
          for (let k = 3; k > 0; k--) ell(g, 192, 120, k * 14, k * 14, k % 2 ? 'rgba(170,210,220,.8)' : 'rgba(230,250,255,.8)');
        });
        for (const x of [120, 264]) box(g, x - 3, 36, 6, 162, lin(g, x - 3, 0, x + 3, 0, ['#5a4010', '#e0b850', '#5a4010']));
        box(g, 116, 34, 152, 6, '#8a6a20'); box(g, 116, 194, 152, 6, '#8a6a20');
        if (!S.f.prismIn) { box(g, 148, 64, 22, 9, '#101418'); }
        box(g, 330, 90, 44, 110, lin(g, 330, 0, 374, 0, ['#2a2a2a', '#4a4a4a'])); box(g, 336, 96, 32, 40, lin(g, 0, 96, 0, 136, ['#8ab0d8', '#d0e0e0']));
      },
      lights(g, R, S) { if (S.solved.lamp) { glow(g, 192, 120, 140, 'rgba(255,240,170,1)', 0.8); glow(g, 192, 120, 40, 'rgba(255,255,240,1)', 1); } },
      hs: S => [H([104, 36, 176, 164], () => openCU('lamp'), 'The great lens', ['prism', 'matches']), Rt([326, 86, 58, 118], 'gallery', 'Out onto the gallery'), B(BACK, 'watch_room', 'Down the ladder')]
    },
    gallery: {
      name: 'The lighthouse gallery', amb: 'cliff', sky: 140,
      draw(g, R, S) {
        sea(g, R, 140, VH, 0, VW, ['#9cb8cc', '#4a7aa2', '#1e4468']);
        box(g, 0, 138, 120, 3, 'rgba(90,100,120,.5)');
        ledge(g, R, 262, 143, 1.4);
        box(g, 0, 0, 70, VH, lin(g, 0, 0, 70, 0, ['#e8e4d8', '#b8b2a4', '#6a665c'])); box(g, 0, 0, 60, 100, lin(g, 0, 0, 60, 0, ['#2a3440', '#6a8098'])); for (let i = 0; i < 4; i++) box(g, i * 16, 0, 2, 100, '#1a1a1a');
        for (const y of [176, 204]) box(g, 60, y, VW, 3, '#1a1a1a'); for (let x = 70; x < VW; x += 44) box(g, x, 170, 4, 70, '#1a1a1a');
        box(g, 60, 226, VW, 14, '#2a2a2a');
      },
      lights(g, R, S, ph) { if (ph === 'sunset') sunPath(g, R, 300, 142, 220); },
      anim(g, t, S) { sparkle(g, 70, 150, 314, 70, 14); gulls(g, t, 60); if (S.solved.horn) lanternBlink(g, t, 266, 128); },
      hs: S => [K([234, 124, 70, 24], ledgeLook, 'Tern Ledge'), B(BACK, 'lamp_room', 'Back inside')]
    }
  };
  function brickHouse(g, R, x, y, w, h, s) {
    stones(g, R, x, y, w, h, '#9a5a44', 7 * s + 2);
    poly(g, [x - 6 * s, y + 2, x + w / 2, y - h * 0.35, x + w + 6 * s, y + 2], lin(g, 0, y - h * 0.35, 0, y, ['#4a5058', '#2a2e34']));
    for (const [hx0, hy0, dir] of [[x + w * 0.3, y - h * 0.4, -1], [x + w * 0.7, y - h * 0.45, 1]]) {
      const L = 40 * s, bell = 16 * s;
      poly(g, [hx0, hy0 - 4 * s, hx0 + dir * L, hy0 - bell, hx0 + dir * L, hy0 + bell * 0.6, hx0, hy0 + 4 * s], lin(g, 0, hy0 - bell, 0, hy0 + bell, ['#6a6a6a', '#2a2a2a', '#111']));
      ell(g, hx0 + dir * L, hy0 - bell * 0.2, 4 * s, bell * 0.8, '#050505');
      box(g, hx0 - 3 * s, hy0, 6 * s, (y - hy0) + 2, '#3a3a3a');
    }
  }

  /* ---------- journal entries ---------- */
  const TIDES = [['Wed 12', '3:10 am, 3:35 pm', '9:22 am, 9:47 pm'], ['Thu 13', '4:00 am, 4:25 pm', '10:12 am, 10:37 pm'], ['Fri 14', '4:50 am, 5:15 pm', '11:02 am, 11:27 pm'], ['Sat 15', '5:40 am, 6:05 pm', '11:52 am'], ['Sun 16', '6:30 am, 6:55 pm', '12:17 am, 12:42 pm']];
  const LOG = [['12 April 1961', 'Arrived on Gull Rock as assistant keeper. Rained sideways all day. Loved it at once.', 1], ['14 February 1968', 'Painted the tower, red and white again. My arms may never recover.'], ['3 June 1972', 'Made Head Keeper! Lit the great lamp all by myself for the first time.', 1], ['19 November 1979', 'Worst storm in thirty years. Lost half the boathouse roof. Not a favourite day.'], ['8 August 1985', 'Telegram from the mainland: I have a grandchild! Flew every flag we own.', 1], ['30 January 1990', 'A small orange kitten came over in the supply crates. Named him Biscuit.']];
  let mbCanvas = null;
  function mbImg() {
    if (mbCanvas) return mbCanvas.toDataURL();
    const c = mk(170, 120), g = c.getContext('2d'); box(g, 0, 0, 170, 120, '#f4ecd4');
    box(g, 20, 8, 130, 64, lin(g, 0, 8, 0, 72, ['#8a6a20', '#f0d070', '#8a6a20']));
    SEQ.forEach((col, k) => ell(g, 32 + col * 26, 64 - k * 10, 3, 3, '#2a1a04'));
    for (let i = 0; i < 5; i++) box(g, 26 + i * 26, 78, 12, 36 - i * 6, lin(g, 26 + i * 26, 0, 38 + i * 26, 0, ['#8a8a8a', '#e8e8e8', '#8a8a8a']));
    txt(g, 'first', 8, 64, 'bold 8px Arial', '#8a1a10', 'left'); line(g, 26, 64, 30, 64, '#8a1a10');
    mbCanvas = c; return c.toDataURL();
  }
  const JE = {
    intro: { t: 'Arrival', k: 'story', h: () => `<p>It is summer, 1995. The supply boat has dropped you at Gull Rock to spend the holidays with your grandfather, <b>Tobias Wren</b>, keeper of the Gull Rock Light.</p><p>But nobody met you on the dock. Last night's storm has blown over, the great lamp at the top of the tower is dark, and the cargo ship <b>Northern Lark</b> is due to pass the rocks at <b>nine o'clock tonight</b>.</p><p>Where is Grandpa?</p>` },
    n_dock: { t: 'Note on the dock', k: 'note', h: () => `<p>Sprout!</p><p>If you are reading this, I'm not back yet. Sorry! The storm knocked out the light: the clockwork jammed and one of the lens prisms cracked. I had to go and see to something that couldn't wait.</p><p>You know me and my puzzles. Everything you need is somewhere on this island. Start at the cottage. The kettle's on (well, it was).</p><p>Love, Grandpa</p><p>P.S. Please feed Biscuit!</p>` },
    log: { t: "Grandpa's log", k: 'clue', h: () => `<p class="lgh-dim">The keeper's log is full of Grandpa's tidy handwriting. He has drawn a red star beside some of the entries.</p>${LOG.map(([d, s, st]) => `<p>${st ? '<span class="lgh-star">★</span> ' : ''}<b>${d}.</b> ${s}</p>`).join('')}` },
    clock: { t: 'The mantel clock', k: 'clue', h: () => `<p>The clock on the mantelpiece says <b>ten past three</b> in the afternoon.</p>` },
    cal: { t: 'Kitchen calendar', k: 'clue', h: () => `<p><b>July 1995.</b> Every day up to <b>Thursday the 13th</b> has been crossed off.</p><p><b>Friday the 14th</b> is circled in red: "SPROUT ARRIVES!" Underneath, in smaller letters: "Northern Lark passes 9 pm."</p><p class="lgh-dim">So today is Friday the 14th.</p>` },
    n_chest: { t: 'Note in the sea chest', k: 'note', h: () => `<p>Clever sprout! Here's the key to my workshop.</p><p>The lamp's clockwork lost three gears in the storm. I put the spares in the biscuit tin on my workbench.</p><p>- G.</p>` },
    flagcode: { t: 'The Wren family flag code', k: 'clue', h: () => `<p class="lgh-dim">A poster on the workshop wall: "WREN FAMILY FLAG CODE (made up by Grandpa)".</p><div class="lgh-flags">${Object.keys(FLAGS).map(L => `<span>${flagImg(L)}<b>${L}</b></span>`).join('')}</div>` },
    n_work: { t: 'Note on the workbench', k: 'note', h: () => `<p>Sprout: I locked the boathouse with my letter lock. The word is flying from the flagpole on the cliff. Read it top to bottom with the flag code on the wall here.</p><p>- G.</p>` },
    pole: { t: 'Flags on the flagpole', k: 'clue', h: () => `<p class="lgh-dim">Four flags fly from the cliff flagpole, from top to bottom:</p><div class="lgh-flags lgh-col">${WORD.split('').map(L => `<span>${flagImg(L)}</span>`).join('')}</div>` },
    tide: { t: 'Tide table', k: 'clue', h: () => `<p class="lgh-dim">Pinned inside the boathouse: GULL ROCK TIDES, JULY 1995.</p><table class="lgh-tt"><tr><th>Day</th><th>Low water</th><th>High water</th></tr>${TIDES.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</table>` },
    boatlog: { t: 'Boathouse log', k: 'clue', h: () => `<p><b>Fri 14th, 10:30 am.</b> Took the Puffin out to Tern Ledge. The bell buoy has been silent since the storm, and ships need it. Taking the big wrench. Back by noon. - T.W.</p><p class="lgh-dim">It's after three o'clock now, and the Puffin's cradle is empty.</p>` },
    chart: { t: "Grandpa's island chart", k: 'clue', h: () => `<p>The chart is whole again. A red X beside the garden says <b>KEY</b>, and in tiny writing: "Spare lighthouse key. Twist the sundial's pointer."</p><p class="lgh-dim">Tip: use the Chart button to travel quickly to places you've been.</p>` },
    gate: { t: 'The cave gate', k: 'clue', h: () => `<p>A brass plate under the dial on the Gannet Cave gate says:</p><p><b>SET ME TO THE NEXT LOW WATER.</b></p>` },
    n_cave: { t: 'Note in the cave', k: 'note', h: () => `<p>The spare prism! One of the lens prisms cracked in the storm. Slot this one into the gap in the big lens, light the burner with a match, then turn the mirrors so they send the light into the lens.</p><p>- G.</p>` },
    n_green: { t: 'Note in the greenhouse', k: 'note', h: () => `<p>If ever I'm out on the water and you need me, play our family call on the foghorn. I'll answer with my lantern.</p><p>The tune is on the music box.</p><p>- G.</p>` },
    musicbox: { t: 'The music box', k: 'clue', h: () => `<p>The music box plays the Wren family call. Six pins on a brass cylinder pluck a comb of five teeth, from long (low) to short (high). The pin nearest the comb plays first.</p><img class="lgh-mb" alt="Music box pins" src="${mbImg()}">` },
    answered: { t: 'An answer from Tern Ledge!', k: 'story', h: () => `<p>Grandpa is on Tern Ledge! His lantern blinked three times: the family's "I'm fine" signal.</p><p>The Puffin must have drifted away while he was fixing the bell buoy. When the Northern Lark passes at nine, the light has to be burning, so the ship can steer clear of the rocks and see him.</p>` }
  };

  /* ---------- puzzles, hints ---------- */
  const PUZ = [
    { id: 'chest', t: 'The sea chest', h: ["Grandpa's log is on the desk in the cottage. Look at the starred entries.", 'The chest wants the day numbers of the three starred days, oldest first, two digits each.', '12 April 1961, 3 June 1972 and 8 August 1985: set the wheels to 1 2 0 3 0 8.'] },
    { id: 'flags', t: 'The boathouse lock', h: ['There is a flag code poster in the workshop. The workshop key is in the sea chest.', 'The flags on the cliff flagpole spell the lock word, read from top to bottom.', 'The word is TERN.'] },
    { id: 'map', t: 'The cut-up chart', h: ['The chart in the boathouse drawer is cut into nine squares. Tap a square to turn it.', 'Line up the coastline and the dotted path. The N on the compass should point up.', 'When the chart is fixed, the X marks the sundial in the garden. Tap the sundial.'] },
    { id: 'tide', t: 'The cave gate', h: ['The gate wants the time of the next low water. The tide table is in the boathouse.', 'The kitchen calendar says today is Friday the 14th, and the mantel clock says ten past three.', 'After 3:10 pm on Friday the 14th, the next low water is 5:15 pm. Set the hands to a quarter past five and pull the lever.'] },
    { id: 'gears', t: 'The clockwork', h: ['The spare gears are in the biscuit tin in the workshop. Each empty peg needs a gear that just touches its neighbours.', 'Start from the small drive gear on the left and work toward the big lens gear. Too big and they clash; too small and there is a gap.', 'From left to right the pegs need the 18, 10 and 22 tooth gears. Then press START.'] },
    { id: 'horn', t: 'The family call', h: ['The note in the greenhouse says the family call is on the music box in the cottage.', 'The long comb teeth play low notes, like the long horns. The pin nearest the comb plays first. Pump up the air before you play.', 'Counting horns from the longest (1) to the shortest (5), play 1, 3, 4, 5, 4, 3.'] },
    { id: 'lamp', t: 'The great light', h: ['You need the spare prism from Gannet Cave and the matches from the cottage mantelpiece.', 'Put the prism in the lens, light the burner, then tap the mirrors to steer the beam into the lens.', 'The first mirror the beam meets turns it down, the second sends it right, the third sends it up, and the fourth sends it right into the lens. Fix the clockwork too, so the light can turn.'] }
  ];
  const SEQ = [0, 2, 3, 4, 3, 2];
  const BOX_NOTES = [72, 74, 76, 79, 81], HORN_NOTES = [48, 50, 52, 55, 57];
  const MIRRORS = [[2, 1], [2, 3], [4, 3], [4, 0], [5, 3], [1, 0]], POSTS = [[1, 3], [3, 1], [5, 2], [6, 4], [0, 4], [3, 4]];
  const LG = { x: 65, y: 22, c: 34, w: 7, h: 5 };
  const GS = 2, GSIZES = [10, 14, 18, 22];
  const PEGS = (() => { const p = [{ x: 52, y: 104, r: 14 }]; [[32, -35], [28, 40], [32, -30], [48, 25]].forEach(([d, a]) => { const q = p[p.length - 1], r = a * Math.PI / 180; p.push({ x: q.x + Math.cos(r) * d * GS, y: q.y + Math.sin(r) * d * GS, d }); }); p[4].r = 26; return p; })();

  /* ---------- module state (one window at a time) ---------- */
  let S = null, api = null, W = null, E = {}, opt = {}, mode = 'title', cache = new Map(), cuCache = new Map();
  let cv, ctx, prevCv, trans = null, raf = 0, ambT = 0, paused = false, focusIdx = -1, gsel = -1, timers = [], endState = null, lastTick = 0, capT = 0, lastAmb = '';
  const later = (fn, ms) => { const t = setTimeout(() => { timers = timers.filter(x => x !== t); fn(); }, ms); timers.push(t); return t; };
  const has = id => S.items.includes(id);
  const lit = () => !!(S && S.solved.lamp && S.solved.gears);
  const solvedN = () => Object.keys(S.solved).length;
  const phase = () => { const n = solvedN(); return n >= 5 ? 'dusk' : n >= 3 ? 'sunset' : 'day'; };

  /* sound */
  const snd = {
    tone: (f, d, o) => { if (opt.sound) api.tone(f, d, o); },
    noise: (d, o) => { if (opt.sound) api.noise(d, o); },
    sfx: n => { if (opt.sound && api.sfx[n]) api.sfx[n](); },
    wave: (v = 0.05, f = 420) => snd.noise(3.4, { ft: 'lowpass', f: f + Math.random() * 200, vol: v, attack: 1.3, release: 1.8 }),
    gull: (v = 0.025) => { const f = 1300 + Math.random() * 500; snd.tone(f, 0.22, { type: 'sine', to: f * 0.62, vol: v }); snd.tone(f * 1.05, 0.18, { type: 'sine', to: f * 0.7, vol: v * 0.8, at: 0.28 }); },
    wind: (v = 0.015) => snd.noise(4.5, { ft: 'bandpass', f: 500 + Math.random() * 500, q: 0.6, vol: v, attack: 1.6, release: 2 }),
    creak: (v = 0.02) => { const f = 90 + Math.random() * 40; snd.tone(f, 0.5, { type: 'sawtooth', to: f * 0.8, vol: v, attack: 0.1, release: 0.2 }); },
    tick: () => snd.noise(0.015, { ft: 'highpass', f: 3200, vol: 0.05, decay: 1 }),
    crackle: () => { for (let i = 0; i < 3; i++) snd.noise(0.02, { ft: 'highpass', f: 1500 + Math.random() * 2000, vol: 0.03 + Math.random() * 0.03, decay: 1, at: Math.random() * 0.6 }); },
    drip: () => { const f = 1400 + Math.random() * 900; snd.tone(f, 0.09, { type: 'sine', to: f * 0.5, vol: 0.04, decay: 1 }); },
    rumble: () => snd.noise(3, { ft: 'lowpass', f: 140, vol: 0.05, attack: 1, release: 1.5 }),
    whistle: () => snd.noise(3, { ft: 'bandpass', f: 1100 + Math.random() * 400, q: 9, vol: 0.02, attack: 1.2, release: 1.4 }),
    whoosh: () => snd.noise(0.45, { ft: 'lowpass', f: 700, vol: 0.05, attack: 0.15, release: 0.3 }),
    box: n => { const f = api.midi(BOX_NOTES[n]); snd.tone(f, 0.7, { type: 'triangle', vol: 0.09, decay: 1 }); snd.tone(f * 2, 0.35, { type: 'sine', vol: 0.03, decay: 1 }); },
    horn: n => { const f = api.midi(HORN_NOTES[n]); snd.tone(f, 0.9, { type: 'sawtooth', vol: 0.06, attack: 0.08, release: 0.3 }); snd.tone(f * 1.006, 0.9, { type: 'square', vol: 0.025, attack: 0.1, release: 0.3 }); snd.noise(0.9, { ft: 'lowpass', f: 300, vol: 0.03, attack: 0.1, release: 0.3 }); },
    clank: () => { snd.tone(180, 0.25, { type: 'square', to: 90, vol: 0.06, decay: 1 }); snd.noise(0.2, { ft: 'bandpass', f: 900, q: 3, vol: 0.15, decay: 1 }); },
    click: () => snd.noise(0.02, { ft: 'bandpass', f: 2400, q: 2, vol: 0.18, decay: 1 }),
    chime: () => [0, 4, 7, 12].forEach((s, i) => snd.tone(api.midi(72 + s), 0.5, { type: 'triangle', vol: 0.07, decay: 1, at: i * 0.12 }))
  };
  const AMB = {
    sea: [['w', 3.8, () => snd.wave()], ['g', 9, () => snd.gull()], ['i', 5, () => snd.wind(0.01)]],
    cliff: [['w', 4.5, () => snd.wave(0.035)], ['i', 3.5, () => snd.wind(0.028)], ['g', 7, () => snd.gull()]],
    room: [['t', 1, () => snd.tick(), 1], ['c', 1.4, () => snd.crackle()], ['w', 5, () => snd.wave(0.012, 250)]],
    wood: [['c', 6, () => snd.creak()], ['w', 4, () => snd.wave(0.02, 300)]],
    glass: [['i', 5, () => snd.wind(0.008)], ['g', 10, () => snd.gull(0.012)]],
    cave: [['d', 1.7, () => snd.drip()], ['r', 4, () => snd.rumble()], ['w', 5, () => snd.wave(0.025, 200)]],
    tower: [['i', 3, () => snd.whistle()], ['c', 7, () => snd.creak(0.015)], ['w', 5, () => snd.wave(0.015, 260)]],
    night: [['w', 4, () => snd.wave(0.04)], ['i', 5, () => snd.wind(0.012)]]
  };
  const AMBCAP = { sea: '[Waves wash over the rocks. Gulls call overhead.]', cliff: '[The wind gusts. Waves boom far below.]', room: '[A clock ticks. Embers crackle in the fireplace.]', wood: '[Old timbers creak. Water laps underneath.]', glass: '[A soft breeze rattles the glass.]', cave: '[Water drips and echoes in the dark.]', tower: '[Wind whistles around the tower.]', night: '[Night waves. A gentle breeze.]' };
  const nextAt = {};
  function curAmb() { if (mode === 'title') return 'sea'; if (mode === 'end') return 'night'; return S.cu ? (CU[S.cu].amb || SC[S.scene].amb) : SC[S.scene].amb; }
  function ambTick() {
    if (paused) return;
    const now = performance.now() / 1000, a = curAmb();
    if (a !== lastAmb) { lastAmb = a; if (mode === 'play') cap(AMBCAP[a]); }
    if (!opt.sound) return;
    (AMB[a] || []).forEach(([n, every, fn, fixed]) => { const k = a + n; if (!(k in nextAt) || now >= nextAt[k]) { if (k in nextAt || n === 'w') fn(); nextAt[k] = now + every * (fixed ? 1 : 0.7 + Math.random() * 0.6); } });
    if (mode === 'play') S.t += 0.5;
  }

  /* ---------- close-up views (puzzles) ---------- */
  function wheel(g, x, y, w, h, cur, prev, next, foc) {
    box(g, x, y, w, h, lin(g, 0, y, 0, y + h, ['#2a2010', '#d8ceb0', '#fffaf0', '#d8ceb0', '#2a2010']));
    txt(g, cur, x + w / 2, y + h / 2 + 1, 'bold 22px Georgia', '#1a1208'); txt(g, prev, x + w / 2, y + 8, 'bold 10px Georgia', 'rgba(26,18,8,.3)'); txt(g, next, x + w / 2, y + h - 7, 'bold 10px Georgia', 'rgba(26,18,8,.3)');
    g.strokeStyle = '#2a1a04'; g.lineWidth = 2; g.strokeRect(x, y, w, h);
    poly(g, [x + w / 2, y - 12, x + w / 2 - 6, y - 5, x + w / 2 + 6, y - 5], '#3a2a08'); poly(g, [x + w / 2, y + h + 12, x + w / 2 - 6, y + h + 5, x + w / 2 + 6, y + h + 5], '#3a2a08');
  }
  function brassBtn(g, x, y, w, h, label, down) { rr(g, x, y, w, h, 5); g.fillStyle = lin(g, 0, y, 0, y + h, down ? ['#6a4a10', '#c8a040'] : ['#f8dc80', '#a07820', '#6a4a10']); g.fill(); g.strokeStyle = '#2a1a04'; g.lineWidth = 1.5; g.stroke(); txt(g, label, x + w / 2, y + h / 2 + 1, 'bold 13px Georgia', '#2a1a04'); }
  const CHEST_X = [100, 128, 166, 194, 232, 260], LOCK_X = [118, 156, 194, 232];
  const CU = {
    chest: {
      amb: 'room', name: 'The sea chest',
      bg(g, R) {
        planks(g, R, 0, 0, VW, VH, '#6b4a2c', false, 24);
        for (const y of [18, 200]) box(g, 0, y, VW, 16, lin(g, 0, y, 0, y + 16, ['#6a6a6a', '#2a2a2a', '#111']));
        rr(g, 70, 56, 244, 130, 10); g.fillStyle = lin(g, 70, 56, 314, 186, ['#f8dc80', '#b8902a', '#7a5a14', '#c8a040']); g.fill(); g.strokeStyle = '#3a2a08'; g.lineWidth = 2; g.stroke();
        for (const [x, y] of [[80, 66], [304, 66], [80, 176], [304, 176]]) ell(g, x, y, 3, 3, '#5a4010');
        txt(g, '★        ★        ★', 192, 70, 'bold 12px serif', '#5a3a08');
      },
      draw(g) { S.chest.forEach((v, i) => wheel(g, CHEST_X[i], 94, 26, 60, v, (v + 9) % 10, (v + 1) % 10)); },
      ctrls: () => S.chest.flatMap((v, i) => [{ r: [CHEST_X[i], 78, 26, 46], c: 'hand', tip: 'Turn the wheel up', act: () => turnWheel('chest', i, 1) }, { r: [CHEST_X[i], 124, 26, 46], c: 'hand', tip: 'Turn the wheel down', act: () => turnWheel('chest', i, -1) }]),
      enter() { seen('chest'); }
    },
    letters: {
      amb: 'wood', name: 'The letter lock',
      bg(g, R) {
        planks(g, R, 0, 0, VW, VH, '#3f5560', true, 16);
        g.strokeStyle = lin(g, 130, 0, 254, 0, ['#6a6a6a', '#e0e0e0', '#6a6a6a']); g.lineWidth = 14; g.beginPath(); g.arc(192, 76, 56, Math.PI, 0); g.stroke();
        rr(g, 96, 70, 192, 130, 14); g.fillStyle = lin(g, 96, 70, 288, 200, ['#f8dc80', '#b8902a', '#7a5a14', '#c8a040']); g.fill(); g.strokeStyle = '#3a2a08'; g.lineWidth = 2; g.stroke();
        txt(g, 'WREN & CO.', 192, 186, 'bold 10px Georgia', '#5a3a08');
      },
      draw(g) { S.letters.forEach((v, i) => wheel(g, LOCK_X[i], 102, 32, 60, String.fromCharCode(65 + v), String.fromCharCode(65 + (v + 25) % 26), String.fromCharCode(65 + (v + 1) % 26))); },
      ctrls: () => S.letters.flatMap((v, i) => [{ r: [LOCK_X[i], 86, 32, 46], c: 'hand', tip: 'Turn the wheel up', act: () => turnWheel('letters', i, 1) }, { r: [LOCK_X[i], 132, 32, 46], c: 'hand', tip: 'Turn the wheel down', act: () => turnWheel('letters', i, -1) }]),
      enter() { seen('flags'); },
      key(e) { if (/^[a-z]$/i.test(e.key)) { const i = Math.max(0, focusIdx) >> 1; S.letters[i] = e.key.toUpperCase().charCodeAt(0) - 65; snd.click(); focusIdx = Math.min(7, (i + 1) * 2); checkLetters(); return true; } }
    },
    map: {
      amb: 'wood', name: 'The chart drawer', anim: [0, 0, 0, 0, 0, 0, 0, 0, 0], rot: [0, 0, 0, 0, 0, 0, 0, 0, 0],
      bg(g, R) { planks(g, R, 0, 0, VW, VH, '#5a3a1e', false, 30); box(g, 92, 20, 200, 200, '#1e4a2a'); speck(g, R, 92, 20, 200, 200, 800, ['#16381e', '#2a5a36']); g.strokeStyle = '#2a1a0a'; g.lineWidth = 4; g.strokeRect(90, 18, 204, 204); },
      draw(g, t) {
        const A = this.anim;
        for (let i = 0; i < 9; i++) {
          const target = this.rot[i] * Math.PI / 2; A[i] += (target - A[i]) * 0.35; if (Math.abs(target - A[i]) < 0.01) A[i] = target;
          const sx = (i % 3) * 60, sy = ((i / 3) | 0) * 60;
          g.save(); g.translate(102 + sx + 30, 30 + sy + 30); g.rotate(A[i]); g.drawImage(mapImg(), sx, sy, 60, 60, -30, -30, 60, 60); g.strokeStyle = 'rgba(60,30,10,.8)'; g.lineWidth = 1; g.strokeRect(-30, -30, 60, 60); g.restore();
        }
        if (S.solved.map) { glow(g, 164, 114, 22, 'rgba(255,80,60,1)', 0.35 + Math.sin(t / 200) * 0.2); }
      },
      ctrls: () => S.solved.map ? [] : S.tiles.map((v, i) => ({ r: [102 + (i % 3) * 60, 30 + ((i / 3) | 0) * 60, 60, 60], c: 'hand', tip: 'Turn this square', act: () => { S.tiles[i] = (S.tiles[i] + 1) % 4; CU.map.rot[i]++; snd.click(); checkMap(); } })),
      enter() { seen('map'); this.rot = S.tiles.slice(); this.anim = S.tiles.map(v => v * Math.PI / 2); }
    },
    tide: {
      amb: 'cave', name: 'The tide dial',
      bg(g, R) {
        rock(g, R, [0, 0, VW, 0, VW, VH, 0, VH], '#7a7262', '#2a2620');
        for (let i = 0; i < 9; i++) line(g, 20 + i * 44, 0, 20 + i * 44, VH, '#2a2a30', 6);
        ell(g, 140, 108, 84, 84, lin(g, 56, 0, 224, 0, ['#6a4a10', '#f0cc60', '#8a6414'])); ell(g, 140, 108, 74, 74, lin(g, 0, 34, 0, 182, ['#fffaf0', '#e8dcc0']));
        for (let i = 1; i <= 12; i++) { const a = i / 12 * TAU; txt(g, String(i), 140 + Math.sin(a) * 60, 109 - Math.cos(a) * 60, 'bold 15px Georgia', '#2a1a04'); }
        for (let i = 0; i < 60; i++) { const a = i / 60 * TAU, r0 = i % 5 ? 70 : 67; line(g, 140 + Math.sin(a) * r0, 108 - Math.cos(a) * r0, 140 + Math.sin(a) * 73, 108 - Math.cos(a) * 73, '#3a2a10', i % 5 ? 1 : 2); }
        box(g, 20, 202, 244, 26, lin(g, 20, 0, 264, 0, ['#7a5a14', '#e8c060', '#7a5a14'])); txt(g, 'SET ME TO THE NEXT LOW WATER', 142, 216, 'bold 11px Georgia', '#2a1a04');
        box(g, 250, 20, 124, 200, 'rgba(20,16,12,.55)');
        txt(g, 'HOUR', 312, 34, 'bold 11px Georgia', '#f0dca0'); txt(g, 'MINUTES', 312, 98, 'bold 11px Georgia', '#f0dca0');
      },
      draw(g) {
        const { h, m } = S.clock, ha = ((h % 12) + m / 60) / 12 * TAU, ma = m / 60 * TAU;
        line(g, 140, 108, 140 + Math.sin(ha) * 38, 108 - Math.cos(ha) * 38, '#1a1208', 5); line(g, 140, 108, 140 + Math.sin(ma) * 58, 108 - Math.cos(ma) * 58, '#1a1208', 3);
        ell(g, 140, 108, 5, 5, '#6a4a10');
        brassBtn(g, 258, 44, 50, 34, '<'); brassBtn(g, 316, 44, 50, 34, '>'); brassBtn(g, 258, 108, 50, 34, '<'); brassBtn(g, 316, 108, 50, 34, '>');
        txt(g, `${h}:${String(m).padStart(2, '0')}`, 312, 158, 'bold 14px Georgia', '#f0dca0');
        box(g, 290, 172, 44, 8, '#3a3a3a'); box(g, 308, 176, 8, 28, lin(g, 308, 0, 316, 0, ['#4a4a4a', '#aaaaaa', '#4a4a4a'])); ell(g, 312, 204, 10, 8, '#8a1a10'); txt(g, 'PULL', 312, 190, 'bold 9px Arial', '#f0dca0');
      },
      ctrls: () => [
        { r: [258, 44, 50, 34], c: 'hand', tip: 'Hour hand back', act: () => setClock(-60) }, { r: [316, 44, 50, 34], c: 'hand', tip: 'Hour hand forward', act: () => setClock(60) },
        { r: [258, 108, 50, 34], c: 'hand', tip: 'Minute hand back', act: () => setClock(-5) }, { r: [316, 108, 50, 34], c: 'hand', tip: 'Minute hand forward', act: () => setClock(5) },
        { r: [284, 168, 56, 48], c: 'hand', tip: 'Pull the lever', act: pullGate }],
      enter() { seen('tide'); addJ('gate', true); }
    },
    gears: {
      amb: 'tower', name: 'The clockwork', t0: 0,
      bg(g, R) {
        box(g, 0, 0, VW, VH, lin(g, 0, 0, 0, VH, ['#2a2016', '#1a140c'])); rr(g, 10, 8, 364, 166, 8); g.fillStyle = lin(g, 10, 8, 374, 174, ['#c8a040', '#8a6414', '#5a4010']); g.fill();
        speck(g, R, 10, 8, 364, 166, 900, ['rgba(0,0,0,.12)', 'rgba(255,240,200,.1)']);
        box(g, 10, 180, 270, 56, '#3a2a18'); box(g, 12, 182, 266, 52, '#1a120a');
        txt(g, 'DRIVE', PEGS[0].x, PEGS[0].y + 38, 'bold 8px Arial', '#2a1a04'); txt(g, 'TO LENS', PEGS[4].x, PEGS[4].y + 62, 'bold 8px Arial', '#2a1a04');
      },
      draw(g, t) {
        const run = S.solved.gears, rs = [PEGS[0].r, ...S.gp, PEGS[4].r];
        let ang = run ? (t - this.t0) / 1000 : 0.3; const angs = [ang];
        for (let i = 1; i < 5; i++) { const r0 = rs[i - 1], r1 = rs[i]; if (r1 && r0) { ang = -ang * r0 / r1 + (i % 2 ? Math.PI / r1 : 0); } angs.push(ang); }
        for (let i = 1; i <= 3; i++) ell(g, PEGS[i].x, PEGS[i].y, 5, 5, '#2a1a04');
        const bad = [];
        for (let i = 0; i < 4; i++) { const a = rs[i], b = rs[i + 1]; if (a && b && a + b > PEGS[i + 1].d) { bad[i] = 1; bad[i + 1] = 1; } }
        for (let i = 0; i < 5; i++) if (rs[i]) gear(g, PEGS[i].x, PEGS[i].y, rs[i] * GS, rs[i], angs[i], { bad: bad[i], col: i === 0 || i === 4 ? ['#e8e8e0', '#a8a8a0', '#5a5a58', '#2a2a28'] : undefined });
        for (let i = 0; i < 4; i++) { const a = rs[i], b = rs[i + 1]; if (a && b && a + b < PEGS[i + 1].d) { const p = PEGS[i], q = PEGS[i + 1], u = a / PEGS[i + 1].d; ell(g, p.x + (q.x - p.x) * (a / PEGS[i + 1].d + (1 - (a + b) / PEGS[i + 1].d) / 2), p.y + (q.y - p.y) * (u + (1 - (a + b) / PEGS[i + 1].d) / 2), 4, 4, 'rgba(120,200,255,.9)'); } }
        const tray = trayGears();
        if (!tray.length && !S.gp.some(Boolean)) txt(g, 'No spare gears', 145, 208, 'italic 12px Georgia', '#8a7a5a');
        tray.forEach((r, k) => { const x = 48 + k * 64, y = 208; if (gsel === r) { rr(g, x - 30, 184, 60, 48, 5); g.fillStyle = 'rgba(255,220,100,.3)'; g.fill(); } gear(g, x, y - 4, r, r, 0.2); txt(g, r + ' teeth', x, 227, 'bold 9px Arial', '#f0dca0'); });
        brassBtn(g, 292, 186, 80, 44, run ? 'RUNNING' : 'START', run);
      },
      ctrls: () => {
        const c = [];
        if (!S.solved.gears) {
          trayGears().forEach((r, k) => c.push({ r: [18 + k * 64, 184, 60, 48], c: 'hand', tip: `Pick up the ${r}-tooth gear`, act: () => { gsel = gsel === r ? -1 : r; snd.click(); } }));
          for (let i = 1; i <= 3; i++) c.push({ r: [PEGS[i].x - 24, PEGS[i].y - 24, 48, 48], c: 'hand', tip: 'Peg ' + i, act: () => pegTap(i - 1) });
          c.push({ r: [292, 186, 80, 44], c: 'hand', tip: 'Start the clockwork', act: startClock });
        }
        return c;
      },
      enter() { seen('gears'); this.t0 = performance.now(); gsel = -1; }
    },
    musicbox: {
      amb: 'room', name: 'The music box', playing: 0,
      bg(g, R) {
        box(g, 0, 0, VW, VH, lin(g, 0, 0, VW, VH, ['#5a2e10', '#8a4a1e', '#4a2408'])); for (let i = 0; i < 30; i++) line(g, 0, i * 8 + R() * 4, VW, i * 8 + R() * 4, 'rgba(0,0,0,.12)');
        rr(g, 60, 20, 264, 200, 8); g.fillStyle = '#6a1a2a'; g.fill(); speck(g, R, 60, 20, 264, 200, 800, ['rgba(0,0,0,.15)', 'rgba(255,200,220,.06)']);
        box(g, 100, 36, 184, 110, lin(g, 0, 36, 0, 146, ['#5a4010', '#e8c460', '#fff0b0', '#c8a040', '#4a3008']));
        box(g, 90, 36, 10, 110, '#4a3008'); box(g, 284, 36, 10, 110, '#4a3008');
        box(g, 106, 148, 172, 8, '#5a5a5a');
        for (let i = 0; i < 5; i++) { const x = 118 + i * 36; box(g, x, 154, 14, 56 - i * 9, lin(g, x, 0, x + 14, 0, ['#8a8a8a', '#f0f0f0', '#8a8a8a'])); }
        txt(g, 'Tap the crank to play', 192, 11, 'italic 11px Georgia', '#f0dca0');
      },
      draw(g, t) {
        const p = this.playing ? (t - this.playing) / 450 : 0;
        g.save(); g.beginPath(); g.rect(100, 36, 184, 110); g.clip();
        SEQ.forEach((col, k) => { const y = 136 - k * 16 + p * 16; if (y > 150) return; ell(g, 125 + col * 36, y, 3.5, 3.5, '#2a1a04'); ell(g, 124 + col * 36, y - 1, 1.5, 1.5, '#fff8c0'); });
        g.restore();
        if (this.playing) { const k = Math.floor(p + 0.6) - 1; if (k >= 0 && k < SEQ.length && (p + 0.6) % 1 < 0.5) glow(g, 125 + SEQ[k] * 36, 160, 16, 'rgba(255,255,200,1)', 0.8); if (p > SEQ.length + 1) this.playing = 0; }
        const a = this.playing ? (t - this.playing) / 300 : 0.6;
        box(g, 294, 86, 16, 12, '#8a6414'); g.save(); g.translate(318, 92); g.rotate(a); box(g, -3, -3, 30, 6, '#c8a040'); ell(g, 27, 0, 6, 6, '#3a1a0a'); g.restore(); ell(g, 318, 92, 5, 5, '#6a4a10');
      },
      ctrls() { return [{ r: [290, 56, 72, 72], c: 'hand', tip: 'Turn the crank', act: () => playBox() }]; },
      enter() { seen('horn'); addJ('musicbox'); }
    },
    horn: {
      amb: 'wood', name: 'The foghorn valves', flash: 0,
      bg(g, R) {
        stones(g, R, 0, 0, VW, VH, '#8a5a44', 9); box(g, 76, 14, 228, 200, 'rgba(20,14,10,.75)');
        for (let i = 0; i < 5; i++) { const x = 96 + i * 44, top = 30 + i * 18; box(g, x, top, 22, 140 - i * 18, lin(g, x, 0, x + 22, 0, ['#6a4a10', '#f8dc80', '#8a6414'])); ell(g, x + 11, top, 16, 6, '#c8a040'); ell(g, x + 11, top, 11, 3, '#2a1a04'); txt(g, String(i + 1), x + 11, 162, 'bold 10px Georgia', '#2a1a04'); }
        winEx(g, 318, 20, 56, 42, { frame: '#d8d0c0' });
        g.save(); g.beginPath(); g.rect(318, 20, 56, 42); g.clip(); box(g, 318, 20, 56, 22, '#7aa0c8'); box(g, 318, 42, 56, 20, '#2a5a80'); ledge(g, R, 350, 44, 0.5); g.restore();
        box(g, 345, 20, 2, 42, '#d8d0c0'); box(g, 318, 40, 56, 2, '#d8d0c0');
        ell(g, 40, 60, 26, 26, lin(g, 14, 0, 66, 0, ['#6a4a10', '#f0cc60', '#6a4a10'])); ell(g, 40, 60, 21, 21, '#f4ecd0'); txt(g, 'AIR', 40, 72, 'bold 8px Arial', '#2a1a04');
      },
      draw(g, t) {
        const a = (-0.75 + (S.air / 12) * 1.5) * Math.PI; line(g, 40, 60, 40 + Math.sin(a) * 17, 60 - Math.cos(a) * 17, '#c00', 2); ell(g, 40, 60, 3, 3, '#2a1a04');
        box(g, 20, 110, 40, 90, '#2a2a2a'); const py = this.pump && t - this.pump < 300 ? 150 : 118; box(g, 36, py, 8, 200 - py, '#8a8a8a'); box(g, 18, py - 6, 44, 10, '#8a1a10'); txt(g, 'PUMP', 40, 212, 'bold 9px Arial', '#f0dca0');
        for (let i = 0; i < 5; i++) { const x = 96 + i * 44, pulled = this.pull === i && t - this.pullT < 500; line(g, x + 11, 170, x + 11, pulled ? 196 : 184, '#aaa', 1); box(g, x - 2, pulled ? 196 : 184, 26, 7, '#8a1a10'); }
        for (let k = 0; k < 6; k++) ell(g, 128 + k * 26, 222, 6, 6, k < S.prog ? '#ffd860' : '#3a2a18');
        if (S.solved.horn) lanternBlink(g, t, 352, 38);
      },
      ctrls: () => [...[0, 1, 2, 3, 4].map(i => ({ r: [88 + i * 44, 24 + i * 18, 38, 180 - i * 18], c: 'hand', tip: `Pull horn ${i + 1}`, act: () => blowHorn(i) })), { r: [14, 100, 52, 110], c: 'hand', tip: 'Pump the air', act: pumpAir }],
      enter() { seen('horn'); }
    },
    lamp: {
      amb: 'tower', name: 'The great lens',
      bg(g, R) {
        box(g, 0, 0, VW, VH, '#1a1a1c'); ell(g, 184, 107, 170, 100, lin(g, 0, 0, 0, VH, ['#4a4a4a', '#2a2a2a'])); speck(g, R, 0, 0, VW, VH, 700, ['rgba(255,255,255,.05)', 'rgba(0,0,0,.3)'], 2);
        for (let j = 0; j < LG.h; j++) for (let i = 0; i < LG.w; i++) { g.strokeStyle = 'rgba(255,255,255,.07)'; g.strokeRect(LG.x + i * LG.c + 0.5, LG.y + j * LG.c + 0.5, LG.c, LG.c); }
        POSTS.forEach(([i, j]) => { const x = LG.x + i * LG.c + LG.c / 2, y = LG.y + j * LG.c + LG.c / 2; ell(g, x, y + 3, 10, 6, 'rgba(0,0,0,.5)'); ell(g, x, y, 9, 9, lin(g, x - 9, 0, x + 9, 0, ['#4a4a4a', '#9a9a9a', '#3a3a3a'])); });
      },
      draw(g, t) {
        const c = LG.c, cx = i => LG.x + i * c + c / 2, cy = j => LG.y + j * c + c / 2;
        const lx = cx(6), ly = cy(0);
        ell(g, lx, ly, 22, 22, lin(g, lx - 22, 0, lx + 22, 0, ['#5a4010', '#e0b850', '#5a4010'])); for (let k = 3; k > 0; k--) ell(g, lx, ly, k * 6, k * 6, k % 2 ? '#a8d0dc' : '#e8f8ff');
        if (S.f.prismIn) poly(g, [lx - 4, ly - 12, lx + 4, ly - 12, lx, ly - 18], '#e0f8ff'); else poly(g, [lx - 4, ly - 12, lx + 4, ly - 12, lx, ly - 18], '#101418');
        const bx = cx(0), by = cy(1); rr(g, bx - 12, by - 10, 24, 20, 4); g.fillStyle = lin(g, bx - 12, 0, bx + 12, 0, ['#5a4010', '#e0b850', '#5a4010']); g.fill();
        if (S.f.lit) { ell(g, bx + 2, by - 2, 5, 7, '#ffcc40'); glow(g, bx, by, 24 + Math.sin(t / 90) * 2, 'rgba(255,190,80,1)', 0.8); } else box(g, bx - 3, by - 3, 6, 6, '#1a1a1a');
        MIRRORS.forEach(([i, j], k) => { const x = cx(i), y = cy(j), s = S.mirrors[k] ? 1 : -1; ell(g, x, y, 13, 13, '#3a3020'); g.strokeStyle = '#c8a040'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 13, 0, TAU); g.stroke(); line(g, x - 10, y - 10 * -s, x + 10, y + 10 * -s, '#e8f0f8', 4); line(g, x - 10, y - 10 * -s + 2, x + 10, y + 10 * -s + 2, '#6a7078', 1); });
        if (S.f.lit) {
          const pts = beamPath(); g.save(); g.lineJoin = 'round';
          g.strokeStyle = 'rgba(255,210,110,.35)'; g.lineWidth = 7; g.beginPath(); pts.forEach(([x, y], k) => k ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke();
          g.strokeStyle = '#fff4c0'; g.lineWidth = 2; g.stroke(); g.restore();
          if (pts.hit) glow(g, lx, ly, 34 + Math.sin(t / 150) * 4, 'rgba(255,240,170,1)', S.f.prismIn ? 1 : 0.5);
        }
        const st = (x, label, ok) => { txt(g, label, x, 212, 'bold 9px Arial', '#b8b0a0'); txt(g, ok[0], x, 226, 'bold 10px Arial', ok[1] ? '#8cf08c' : '#f0a060'); };
        st(70, 'BURNER', S.f.lit ? ['LIT', 1] : ['UNLIT', 0]); st(170, 'PRISM', S.f.prismIn ? ['IN PLACE', 1] : ['MISSING', 0]); st(270, 'CLOCKWORK', S.solved.gears ? ['RUNNING', 1] : ['JAMMED', 0]);
      },
      ctrls: () => [
        { r: [LG.x + 6 * LG.c - 8, LG.y - 6, LG.c + 16, LG.c + 12], c: 'hand', tip: 'The lens', act: lensTap },
        { r: [LG.x, LG.y + LG.c, LG.c, LG.c], c: 'hand', tip: 'The burner', act: burnerTap },
        ...MIRRORS.map(([i, j], k) => ({ r: [LG.x + i * LG.c, LG.y + j * LG.c, LG.c, LG.c], c: 'hand', tip: 'Turn this mirror', act: () => { S.mirrors[k] ^= 1; snd.click(); checkLamp(); } }))],
      enter() { seen('lamp'); }
    },
    chart: {
      amb: 'room', name: "Grandpa's chart",
      bg(g, R) { box(g, 0, 0, VW, VH, lin(g, 0, 0, VW, VH, ['#3a2410', '#5a3a1e'])); g.drawImage(mapImg(), 102, 30); g.strokeStyle = '#1a0e04'; g.lineWidth = 3; g.strokeRect(100, 28, 184, 184); txt(g, 'Tap a place you have visited to go there.', 192, 14, 'italic 11px Georgia', '#f0dca0'); },
      draw(g, t) { MAPPLACES.forEach(p => { if (!S.visited[p.id]) return; const x = 102 + p.x, y = 30 + p.y; ell(g, x, y, 6, 6, 'rgba(255,220,80,.5)'); g.strokeStyle = '#8a1a10'; g.lineWidth = 1.5; g.beginPath(); g.arc(x, y, 6 + Math.sin(t / 250) * 1.5, 0, TAU); g.stroke(); }); },
      ctrls: () => MAPPLACES.filter(p => S.visited[p.id]).map(p => ({ r: [102 + p.x - 12, 30 + p.y - 12, 24, 24], c: 'fwd', tip: 'Go to ' + (SC[p.id].name), act: () => go(p.id, 'f') }))
    }
  };

  /* ---------- puzzle logic ---------- */
  function turnWheel(kind, i, d) {
    snd.click();
    if (kind === 'chest') { S.chest[i] = (S.chest[i] + d + 10) % 10; if (S.chest.join('') === '120308') { solve('chest', 'Click! The sea chest springs open. Inside, on top of the blankets: a brass key and a folded note.'); give('wkey'); later(() => note('n_chest'), 900); later(() => closeCU(), 700); } }
    else { S.letters[i] = (S.letters[i] + d + 26) % 26; checkLetters(); }
  }
  function checkLetters() { if (S.letters.map(v => String.fromCharCode(65 + v)).join('') === WORD) { solve('flags', 'T-E-R-N. The shackle springs open and the big doors swing inward with a groan.'); snd.sfx('door'); later(() => closeCU(), 800); } }
  function checkMap() { if (S.tiles.every(v => v === 0)) { solve('map', "The chart is whole again! A red X beside the garden is labelled KEY."); give('chart'); later(() => clue('chart'), 1200); } }
  function setClock(d) { let t = (S.clock.h % 12) * 60 + S.clock.m + d; t = (t + 720) % 720; S.clock.h = Math.floor(t / 60) || 12; S.clock.m = t % 60; snd.tick(); }
  function pullGate() {
    snd.clank();
    if (S.clock.h === 5 && S.clock.m === 15) { solve('tide', 'A quarter past five: the next low water. Deep inside the gate something goes CLUNK, and the bars swing open.'); later(() => closeCU(), 900); }
    else if (S.clock.h === 4 && S.clock.m === 50) msg('The gate rattles but stays shut. 4:50 was this morning\'s low water. The plate says the NEXT one.');
    else msg('The gate rattles, but stays shut.');
  }
  function trayGears() { if (S.solved.gears || !has('gears')) return []; return GSIZES.filter(r => !S.gp.includes(r)); }
  function pegTap(i) {
    if (gsel > 0) { if (S.gp[i]) S.gp[i] = null; S.gp[i] = gsel; gsel = -1; snd.clank(); }
    else if (S.gp[i]) { S.gp[i] = null; snd.click(); }
    else msg(has('gears') ? 'Pick a gear from the tray first, then tap an empty peg.' : 'Three pegs stand empty. The spare gears must be somewhere else on the island.');
  }
  function startClock() {
    if (S.gp.some(v => !v)) { msg('The clockwork won\'t start with empty pegs.'); snd.clank(); return; }
    const rs = [PEGS[0].r, ...S.gp, PEGS[4].r];
    for (let i = 0; i < 4; i++) { const s = rs[i] + rs[i + 1], d = PEGS[i + 1].d; if (s > d) { msg('Clunk! Two gears are jammed together. One of them is too big.'); snd.clank(); return; } if (s < d) { msg('Whirr... one gear spins on its own. There is a gap: one of them is too small.'); snd.creak(0.04); return; } }
    CU.gears.t0 = performance.now(); S.items = S.items.filter(x => x !== 'gears');
    solve('gears', 'Tick, tock, tick. The clockwork runs smoothly again, and far above you the lens platform begins to turn.');
  }
  function playBox() {
    const mb = CU.musicbox; if (mb.playing) return; mb.playing = performance.now(); snd.creak(0.02);
    SEQ.forEach((n, k) => later(() => { snd.box(n); if (opt.subs) cap('[The music box plays: ' + ['C', 'D', 'E', 'G', 'A'][n] + ']', 600); }, (k + 1) * 450));
  }
  function pumpAir() { CU.horn.pump = performance.now(); S.air = Math.min(12, S.air + 4); snd.noise(0.3, { ft: 'highpass', f: 1500, vol: 0.06, attack: 0.05, release: 0.2 }); }
  function blowHorn(i) {
    const H_ = CU.horn; H_.pull = i; H_.pullT = performance.now();
    if (S.air <= 0) { snd.noise(0.5, { ft: 'bandpass', f: 400, q: 1, vol: 0.05, attack: 0.1, release: 0.3 }); msg('The horn only wheezes. Pump up the air first.'); cap('[A feeble wheeze]', 1200); return; }
    S.air--; snd.horn(i); cap('[FOGHORN: ' + ['lowest', 'low', 'middle', 'high', 'highest'][i] + ' note]', 900);
    if (S.solved.horn) return;
    if (i === SEQ[S.prog]) S.prog++; else S.prog = i === SEQ[0] ? 1 : 0;
    if (S.prog === SEQ.length) {
      later(() => { solve('horn', 'Far out on Tern Ledge, a tiny lantern blinks back: one, two, three. It\'s Grandpa! He\'s safe!'); addJ('answered', true); cap('[A lantern blinks three times from Tern Ledge]', 3000); }, 1400);
    }
  }
  function beamPath() {
    const c = LG.c, pts = [[LG.x + c / 2 + 12, LG.y + c * 1.5]]; let i = 0, j = 1, dx = 1, dy = 0; pts.hit = false;
    for (let n = 0; n < 40; n++) {
      i += dx; j += dy; const x = LG.x + i * c + c / 2, y = LG.y + j * c + c / 2;
      if (i < 0 || j < 0 || i >= LG.w || j >= LG.h) { pts.push([x - dx * c / 2, y - dy * c / 2]); break; }
      if (POSTS.some(p => p[0] === i && p[1] === j)) { pts.push([x - dx * 9, y - dy * 9]); break; }
      if (i === 6 && j === 0) { pts.push([x - dx * 14, y - dy * 14]); pts.hit = true; break; }
      const m = MIRRORS.findIndex(p => p[0] === i && p[1] === j);
      if (m >= 0) { pts.push([x, y]); if (S.mirrors[m]) [dx, dy] = [dy, dx]; else [dx, dy] = [-dy, -dx]; }
    }
    return pts;
  }
  function lensTap() {
    if (S.f.prismIn) { msg(S.solved.lamp ? 'The great lens blazes with light.' : 'Hundreds of glass rings, all waiting for light.'); return; }
    if (has('prism')) { S.f.prismIn = 1; S.items = S.items.filter(x => x !== 'prism'); S.sel = null; snd.chime(); msg('You slide the spare prism into the gap. It fits perfectly.'); renderInv(); checkLamp(); }
    else msg('There is a gap in the lens where a glass prism should be. It cracked in the storm.');
  }
  function burnerTap() {
    if (S.f.lit) { msg('The burner hisses softly with a bright flame.'); return; }
    if (has('matches')) { S.f.lit = 1; S.items = S.items.filter(x => x !== 'matches'); S.sel = null; snd.noise(0.6, { ft: 'lowpass', f: 900, vol: 0.12, attack: 0.02, release: 0.5 }); msg('You strike a match. WHOOMPH! The burner catches with a bright flame.'); renderInv(); checkLamp(); }
    else msg('The burner is ready, but you need something to light it with.');
  }
  function checkLamp() {
    if (S.solved.lamp || !S.f.lit) return;
    const p = beamPath();
    if (p.hit && S.f.prismIn) solve('lamp', S.solved.gears ? 'The beam pours into the lens and the whole lamp room blazes with light!' : 'The beam pours into the lens and it blazes with light! But it should be turning... the clockwork below must still be jammed.');
    else if (p.hit) msg('The beam reaches the lens, but light spills out of the gap where a prism is missing.');
  }
  function sundial() {
    if (S.f.sundial) { msg('The sundial reads about a quarter past three. Its secret drawer is empty now.'); return; }
    if (S.solved.map) { S.f.sundial = 1; snd.click(); give('lhkey'); msg("You twist the sundial's pointer, just like the chart says. Click! A little drawer slides out with a big iron key inside."); S.sel = null; }
    else msg('An old brass sundial. It reads about a quarter past three.');
  }
  function catAct() {
    if (S.f.fed) { msg('Biscuit purrs like a little outboard motor.'); snd.noise(1.2, { ft: 'lowpass', f: 120, vol: 0.06, attack: 0.2, release: 0.4 }); return; }
    if (has('catfood')) { S.f.fed = 1; S.items = S.items.filter(x => x !== 'catfood'); S.sel = null; msg('You feed Biscuit. He eats every bite, then purrs and rubs against your legs. Good cat.'); snd.noise(1.2, { ft: 'lowpass', f: 120, vol: 0.06, attack: 0.2, release: 0.4 }); renderInv(); invalidate(); autosave(); }
    else { msg('Biscuit opens one eye and meows. He looks hungry.'); snd.tone(700, 0.35, { type: 'sine', to: 500, vol: 0.04 }); }
  }
  function wsDoor() {
    if (has('wkey')) { S.f.ws = 1; S.items = S.items.filter(x => x !== 'wkey'); S.sel = null; snd.clank(); snd.sfx('door'); msg('The brass key turns. The padlock drops open and the shed door creaks wide.'); renderInv(); invalidate(); autosave(); }
    else { msg('The shed door is fastened with a heavy padlock.'); }
  }
  function lhDoor() {
    if (has('lhkey')) { S.f.lh = 1; S.items = S.items.filter(x => x !== 'lhkey'); S.sel = null; snd.clank(); snd.sfx('door'); msg('The big iron key turns with a satisfying clunk. The lighthouse door swings open.'); renderInv(); invalidate(); autosave(); }
    else msg('The lighthouse door is locked. There is a big old-fashioned keyhole.');
  }

  /* ---------- items ---------- */
  const ITEMS = {
    wkey: { n: 'Brass key', d: 'A small brass key from the sea chest.', svg: '<rect x="4" y="11" width="8" height="8" rx="4" fill="none" stroke="#e8c050" stroke-width="3"/><rect x="11" y="14" width="14" height="3" fill="#e8c050"/><rect x="20" y="17" width="2" height="4" fill="#e8c050"/><rect x="24" y="17" width="2" height="3" fill="#e8c050"/>' },
    lhkey: { n: 'Lighthouse key', d: 'A big iron key from the sundial.', svg: '<circle cx="8" cy="15" r="5" fill="none" stroke="#9aa0a8" stroke-width="3"/><rect x="13" y="13" width="15" height="4" fill="#9aa0a8"/><rect x="22" y="17" width="3" height="6" fill="#9aa0a8"/><rect x="26" y="17" width="2" height="4" fill="#9aa0a8"/>' },
    gears: { n: 'Brass gears', d: 'Four spare gears: 10, 14, 18 and 22 teeth.', svg: '<circle cx="11" cy="12" r="8" fill="#d8a444" stroke="#5a3a08" stroke-width="2" stroke-dasharray="3 2"/><circle cx="11" cy="12" r="2" fill="#5a3a08"/><circle cx="22" cy="22" r="6" fill="#e8c060" stroke="#5a3a08" stroke-width="2" stroke-dasharray="2 2"/><circle cx="22" cy="22" r="1.5" fill="#5a3a08"/>' },
    prism: { n: 'Glass prism', d: 'A spare prism for the great lens.', svg: '<polygon points="16,4 28,26 4,26" fill="#bfe8f8" stroke="#3a6a80" stroke-width="2"/><polygon points="16,9 20,22 12,22" fill="#ffffff" opacity=".7"/>' },
    matches: { n: 'Matches', d: 'A box of kitchen matches from the mantelpiece.', svg: '<rect x="5" y="10" width="22" height="13" fill="#c83020" stroke="#3a0a04" stroke-width="1.5"/><rect x="5" y="14" width="22" height="4" fill="#f0d040"/>' },
    catfood: { n: 'Cat food', d: 'A tin of fish supper for Biscuit.', svg: '<rect x="7" y="8" width="18" height="18" fill="#c8c8c8" stroke="#555" stroke-width="1.5"/><rect x="7" y="13" width="18" height="8" fill="#e08030"/><circle cx="16" cy="17" r="2" fill="#fff"/>' },
    chart: { n: 'Island chart', d: "Grandpa's chart of Gull Rock. Use the Chart button to travel.", svg: '<rect x="4" y="6" width="24" height="20" fill="#e8d6a4" stroke="#5a3a1a" stroke-width="1.5"/><path d="M9 20 L14 12 L20 15 L24 9" stroke="#8a2a1a" stroke-width="1.5" fill="none" stroke-dasharray="2 2"/><path d="M18 18 l4 4 M22 18 l-4 4" stroke="#c0201a" stroke-width="2"/>' }
  };
  const TAKE = { matches: 'You pocket the box of matches.', catfood: 'You take the tin of cat food. Biscuit will be pleased.', gears: 'Inside the biscuit tin: not biscuits, but four shiny brass gears. You take them.', prism: 'Nestled in the straw is a glass prism, cut like a jewel. You take it carefully.' };
  function take(id) { S.f[id] = 1; give(id); msg(TAKE[id]); invalidate(); if (id === 'gears') seen('gears'); if (id === 'prism') { seen('lamp'); later(() => note('n_cave'), 900); } }
  function give(id) { if (!has(id)) S.items.push(id); snd.chime(); renderInv(); autosave(); }

  /* ---------- journal, notes, hints ---------- */
  function addJ(id, show) { if (!S.journal.includes(id)) { S.journal.push(id); msg2('Added to your journal: ' + JE[id].t); autosave(); } if (show) later(() => openJournal(id), 500); }
  function note(id) { addJ(id); if (id === 'n_green') seen('horn'); if (id === 'n_work') seen('flags'); openJournal(id, true); snd.noise(0.25, { ft: 'highpass', f: 2000, vol: 0.05, attack: 0.05, release: 0.15 }); }
  function clue(id) { addJ(id); if (id === 'log') seen('chest'); if (id === 'tide') seen('tide'); if (id === 'flagcode' || id === 'pole') seen('flags'); openJournal(id, true); }
  function seen(p) { if (!S.seen[p]) { S.seen[p] = 1; autosave(); } }
  function overlay(html, cls = '') { E.ov.innerHTML = `<div class="lgh-pan ${cls}">${html}</div>`; E.ov.classList.add('on'); const f = E.ov.querySelector('[data-focus]') || E.ov.querySelector('button'); if (f) f.focus(); return E.ov.firstChild; }
  function closeOv() { E.ov.classList.remove('on'); E.ov.innerHTML = ''; E.ov.onclick = null; }
  function openJournal(id, single) {
    const list = S.journal.filter(k => JE[k]); let i = Math.max(0, id ? list.indexOf(id) : list.length - 1);
    const draw = () => {
      const k = list[i], e = JE[k];
      const p = overlay(`<div class="lgh-jh"><b>${single ? (e.k === 'note' ? 'A note from Grandpa' : 'You look closely...') : 'Journal'}</b>${single ? '' : `<select class="lgh-sel" aria-label="Journal page">${list.map((kk, n) => `<option value="${n}"${n === i ? ' selected' : ''}>${n + 1}. ${api.esc(JE[kk].t)}</option>`).join('')}</select>`}</div>
        <div class="lgh-page ${e.k === 'note' ? 'lgh-hand' : ''}"><h3>${api.esc(e.t)}</h3>${e.h()}</div>
        <div class="lgh-jf">${single ? '<span class="lgh-dim2">Saved in your journal</span>' : `<button class="btn" data-a="prev"${i ? '' : ' disabled'}>&lt; Back</button><span>Page ${i + 1} of ${list.length}</span><button class="btn" data-a="next"${i < list.length - 1 ? '' : ' disabled'}>Next &gt;</button>`}<button class="btn" data-a="close" data-focus>Close</button></div>`, 'lgh-book');
      p.onclick = ev => { const a = ev.target.closest('[data-a]'); if (!a) return; snd.click(); if (a.dataset.a === 'close') closeOv(); else { i += a.dataset.a === 'next' ? 1 : -1; draw(); } };
      const sel = p.querySelector('select'); if (sel) sel.onchange = () => { i = +sel.value; draw(); };
    };
    ovKeys = e => { if (e.key === 'ArrowRight' && i < list.length - 1 && !single) { i++; draw(); return true; } if (e.key === 'ArrowLeft' && i > 0 && !single) { i--; draw(); return true; } };
    draw();
  }
  let ovKeys = null;
  function nextStep() {
    const s = S.solved, f = S.f;
    if (!S.journal.includes('n_dock')) return "Read Grandpa's note pinned to the post at the end of the dock.";
    if (!s.chest) return S.journal.includes('log') ? 'Open the sea chest in the cottage living room. Grandpa\'s log has the answer.' : "Grandpa said to start at the cottage. Look at his log on the desk, and at the sea chest.";
    if (!f.ws) return 'Use the brass key on the workshop shed beside the garden.';
    if (!f.gears) return 'Look around the workshop. There is a biscuit tin on the bench.';
    if (!s.flags) return 'Read the note and the flag code in the workshop, then look at the flags on the cliff flagpole. The boathouse is by the dock.';
    if (!s.map) return 'Look in the chart drawer inside the boathouse.';
    if (!f.sundial) return "The chart's X marks the sundial in the garden.";
    if (!f.lh) return 'Use the lighthouse key on the lighthouse door.';
    if (!s.tide) return 'Gannet Cave is at the bottom of the cliff steps. Its gate wants a time.';
    if (!f.prism) return 'Look in the straw-filled box in Gannet Cave.';
    if (!s.gears) return 'Climb the lighthouse and fix the clockwork in the watch room.';
    if (!s.lamp) return (!f.matches && !f.lit ? 'You will need the matches from the cottage mantelpiece. ' : '') + 'Go to the lamp room at the top of the lighthouse.';
    if (!s.horn) return 'Where is Grandpa? Read the note in the greenhouse, then visit the foghorn house on the cliff.';
    return 'You did it!';
  }
  function openHints() {
    const list = PUZ.filter(p => S.seen[p.id] && !S.solved[p.id]);
    const draw = () => {
      const p = overlay(`<h3 class="lgh-h">Hints</h3><p class="lgh-next"><b>Where next?</b> ${api.esc(nextStep())}</p>
        ${list.length ? list.map(z => { const n = S.hints[z.id] || 0; return `<div class="lgh-hint"><b>${z.t}</b>${n ? `<ol>${z.h.slice(0, n).map(x => `<li>${api.esc(x)}</li>`).join('')}</ol>` : ''}${n < 3 ? `<button class="btn" data-h="${z.id}">Show hint ${n + 1} of 3</button>` : ''}</div>`; }).join('') : '<p class="lgh-dim">Hints for each puzzle appear here once you find it.</p>'}
        <div class="lgh-jf"><span></span><button class="btn" data-a="close" data-focus>Close</button></div>`, 'lgh-hints');
      p.onclick = ev => { const b = ev.target.closest('[data-h]'), c = ev.target.closest('[data-a]'); if (b) { S.hints[b.dataset.h] = (S.hints[b.dataset.h] || 0) + 1; S.hintsUsed++; snd.click(); autosave(); draw(); } else if (c) closeOv(); };
    };
    ovKeys = null; draw();
  }

  /* ---------- save / load ---------- */
  function autosave() { if (S && mode === 'play') api.save('auto', S); }
  function slotLabel(s) { if (!s) return 'Empty'; const sc = SC[s.data.scene]; return `${sc ? sc.name : '?'} - ${Object.keys(s.data.solved).length} of 7 puzzles - ${new Date(s.when).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`; }
  function openSlots(saving) {
    const slots = api.load('slots', [null, null, null]);
    const p = overlay(`<h3 class="lgh-h">${saving ? 'Save game' : 'Restore game'}</h3>${slots.map((s, i) => `<div class="lgh-slotrow"><span><b>Slot ${i + 1}:</b> ${api.esc(slotLabel(s))}</span><button class="btn" data-s="${i}"${!saving && !s ? ' disabled' : ''}>${saving ? 'Save here' : 'Restore'}</button></div>`).join('')}
      <div class="lgh-jf"><span></span><button class="btn" data-a="close" data-focus>Cancel</button></div>`, 'lgh-slots');
    ovKeys = null;
    p.onclick = ev => {
      const b = ev.target.closest('[data-s]'); if (ev.target.closest('[data-a]')) { closeOv(); return; } if (!b) return;
      const i = +b.dataset.s;
      if (saving) { slots[i] = { when: Date.now(), data: JSON.parse(JSON.stringify(S)) }; api.save('slots', slots); snd.chime(); closeOv(); msg(`Game saved in slot ${i + 1}.`); }
      else { closeOv(); loadState(slots[i].data); msg(`Game restored from slot ${i + 1}.`); }
    };
  }
  function fresh() { return { v: 1, scene: 'dock', cu: null, items: [], sel: null, journal: ['intro'], solved: {}, seen: {}, hints: {}, f: {}, visited: { dock: 1 }, chest: [0, 0, 0, 0, 0, 0], letters: [0, 0, 0, 0], clock: { h: 12, m: 0 }, tiles: [1, 3, 2, 0, 1, 2, 3, 2, 1], gp: [null, null, null], air: 0, prog: 0, mirrors: [0, 0, 1, 1, 0, 1], t: 0, hintsUsed: 0 }; }
  function loadState(d) { S = Object.assign(fresh(), JSON.parse(JSON.stringify(d))); S.cu = null; S.sel = null; if (S.done) { S.done = false; } mode = 'play'; E.title.classList.remove('on'); startTrans('f'); renderInv(); updateUI(); msg(S.cu ? '' : SC[S.scene].name); autosave(); checkEnd(); }

  /* ---------- rendering ---------- */
  function invalidate() { cache.clear(); }
  function sceneImg(id) {
    const sc = SC[id], ph = phase(), key = id + '|' + ph + '|' + (sc.key ? sc.key(S) : '') + (lit() ? 'L' : '');
    if (cache.has(key)) return cache.get(key);
    const c = mk(VW, VH), g = c.getContext('2d');
    if (sc.sky != null) drawSky(g, sc.sky, ph, rng(hashStr(id + 'sky'))); else box(g, 0, 0, VW, VH, '#000');
    const L = mk(VW, VH); GLOWS.length = 0; sc.draw(L.getContext('2d'), rng(hashStr(id)), S);
    applyTint(L, sc.sky != null ? ph : 'i' + ph); g.drawImage(L, 0, 0);
    GLOWS.forEach(([x, y, r]) => glow(g, x, y, r, 'rgba(255,230,140,1)', 0.9));
    if (sc.lights) sc.lights(g, rng(hashStr(id + 'L')), S, ph);
    vignette(g); dither(g);
    if (cache.size > 30) cache.delete(cache.keys().next().value);
    cache.set(key, c); return c;
  }
  function cuImg(id) {
    if (cuCache.has(id)) return cuCache.get(id);
    const c = mk(VW, VH), g = c.getContext('2d'); CU[id].bg(g, rng(hashStr(id))); vignette(g, 0.3); dither(g); cuCache.set(id, c); return c;
  }
  function hotspots() {
    if (mode !== 'play') return [];
    if (S.cu) { const c = CU[S.cu].ctrls(); return [...c, { r: [0, 0, 0, 0], c: 'back', tip: 'Step back', act: closeCU }]; }
    return SC[S.scene].hs(S);
  }
  function frame(ts) {
    raf = requestAnimationFrame(frame);
    if (paused || ts - lastTick < 40) return; lastTick = ts;
    const g = ctx;
    if (mode === 'title') drawTitle(g, ts);
    else if (mode === 'end') drawEnd(g, ts);
    else if (S.cu) { g.drawImage(cuImg(S.cu), 0, 0); CU[S.cu].draw(g, ts); }
    else { g.drawImage(sceneImg(S.scene), 0, 0); const sc = SC[S.scene]; if (sc.anim) sc.anim(g, ts, S); }
    if (mode === 'play') {
      const hs = hotspots();
      if (opt.spots) hs.forEach(h => { if (h.r[2]) { g.strokeStyle = 'rgba(255,230,120,.55)'; g.setLineDash([3, 3]); g.lineWidth = 1; g.strokeRect(h.r[0] + 0.5, h.r[1] + 0.5, h.r[2] - 1, h.r[3] - 1); g.setLineDash([]); } });
      const f = hs[focusIdx]; if (f && f.r[2]) { g.strokeStyle = '#ffe070'; g.lineWidth = 2; g.setLineDash([4, 3]); g.strokeRect(f.r[0] + 1, f.r[1] + 1, f.r[2] - 2, f.r[3] - 2); g.setLineDash([]); }
    }
    if (trans) {
      const p = (performance.now() - trans.t0) / 600;
      if (p >= 1) trans = null;
      else {
        const e = 1 - p, d = trans.dir; g.save(); g.globalAlpha = e;
        if (d === 'f') { const s = 1 + p * 0.18; g.drawImage(prevCv, VW / 2 - VW * s / 2, VH / 2 - VH * s / 2, VW * s, VH * s); }
        else if (d === 'b') { const s = 1 - p * 0.1; g.drawImage(prevCv, VW / 2 - VW * s / 2, VH / 2 - VH * s / 2, VW * s, VH * s); }
        else if (d === 'l') g.drawImage(prevCv, p * 60, 0); else if (d === 'r') g.drawImage(prevCv, -p * 60, 0); else g.drawImage(prevCv, 0, 0);
        g.restore();
      }
    }
  }
  function startTrans(dir) { prevCv.getContext('2d').drawImage(cv, 0, 0); trans = { t0: performance.now(), dir }; snd.whoosh(); }
  const DIRS = { fwd: 'f', back: 'b', left: 'l', right: 'r' };
  function go(id, dir = 'f') {
    if (!SC[id]) return;
    startTrans(dir); S.scene = id; S.cu = null; S.visited[id] = 1; focusIdx = -1; gsel = -1;
    if (id === 'cottage_in' || id === 'boathouse_in' || id === 'workshop_in' || id === 'foghorn_in' || id === 'lh_stairs') snd.creak(0.03);
    msg(SC[id].name); updateUI(); autosave();
  }
  function openCU(id) { if (CU[id].enter) CU[id].enter(); startTrans('f'); S.cu = id; focusIdx = -1; msg(CU[id].name); updateUI(); }
  function closeCU() { if (!S.cu) return; const was = S.cu; startTrans('b'); S.cu = null; focusIdx = -1; gsel = -1; if (was === 'musicbox') CU.musicbox.playing = 0; updateUI(); autosave(); }
  function activate(h) {
    if (!h) { if (S.sel) { S.sel = null; renderInv(); msg(''); } return; }
    if (h.to) { const dest = typeof h.to === 'function' ? h.to() : h.to; if (dest) go(dest, DIRS[h.c] || 'f'); return; }
    if (S.sel && (h.c === 'hand' || h.c === 'look') && !(h.acc || []).includes(S.sel)) { msg(`The ${ITEMS[S.sel].n.toLowerCase()} is no use there.`); S.sel = null; renderInv(); return; }
    if (h.act) h.act();
  }
  function hitAt(x, y) { const hs = hotspots(); for (const h of hs) { const [a, b, w, hh] = h.r; if (x >= a && y >= b && x < a + w && y < b + hh) return h; } return null; }

  /* ---------- solving, ending ---------- */
  function solve(id, text) {
    if (S.solved[id]) return; S.solved[id] = true; msg(text); snd.sfx('tada'); invalidate(); autosave(); updateUI();
    if ((id === 'lamp' && S.solved.gears) || (id === 'gears' && S.solved.lamp)) later(() => { if (!S.solved.horn) msg('The Gull Rock Light is burning and turning again! But where is Grandpa? The note in the greenhouse said something about the foghorn...'); }, 3500);
    if (id === 'horn' && !lit()) later(() => msg('Grandpa is safe on Tern Ledge. Now get the light burning before the Northern Lark passes at nine!'), 4000);
    checkEnd();
  }
  function checkEnd() { if (S.solved.lamp && S.solved.gears && S.solved.horn && !S.done) { S.done = true; autosave(); later(startEnding, 4200); } }
  const END = [
    { ph: 'night', cap: 'At a quarter to nine, the Gull Rock Light flashes out across the water, just as it has every night since 1887.' },
    { ph: 'night', cap: 'Out in the dark, the lookout on the Northern Lark sees the light, and the ship steers safely wide of the rocks.' },
    { ph: 'night', cap: 'Then the lookout spots something else: a small figure on Tern Ledge, waving a lantern. The crew lowers a boat.' },
    { ph: 'dawn', cap: '"The Puffin drifted off while I was fixing the bell buoy," Grandpa laughs the next morning, a little damp and very proud. "I knew you would work it all out, sprout."' }
  ];
  function startEnding() {
    closeOv(); mode = 'end'; S.cu = null; startTrans('f');
    api.earn(10, 'solving the Gull Rock mystery');
    const st = api.load('stats', { wins: 0 }); st.wins++; api.save('stats', st); api.save('auto', null);
    endState = { i: 0, t0: performance.now(), imgs: [] }; showEndCap(); updateUI();
    snd.chime(); if (opt.sound) api.playMusic({ mel: [64, 67, 69, 67, 64, 62, 60, null, 64, 67, 69, 72, 71, 69, 67, null], bass: [48, 45, 53, 55], bassVol: 0.06, step: 0.32, lead: 'triangle', leadVol: 0.05 });
  }
  function showEndCap() { cap(END[endState.i].cap, 60000, true); endState.t0 = performance.now(); clearTimeout(endState.tm); endState.tm = later(endNext, 9000); }
  function endNext() { if (!endState || endState.i < 0) return; startTrans('f'); endState.i++; if (endState.i >= END.length) { endState.i = -1; cap('', 1); credits(); } else showEndCap(); }
  function endImg(i) {
    if (endState.imgs[i]) return endState.imgs[i];
    const c = mk(VW, VH), g = c.getContext('2d'), R = rng(900 + i), ph = END[i].ph;
    drawSky(g, i === 2 ? 150 : 130, ph, R);
    const L = mk(VW, VH), l = L.getContext('2d'); GLOWS.length = 0;
    if (i === 0) { sea(l, R, 130, VH); grass(l, R, [100, VH, 120, 150, 170, 126, 230, 122, 280, 140, 300, VH], '#6a8a4a', '#2a4a1a'); rock(l, R, [80, VH, 110, 170, 140, 200, 300, 196, 330, VH]); tower(l, 205, 128, 96, 26, 18, { lit: true }); cottage(l, R, 130, 132, 30, 12, { rh: 8 }); }
    if (i === 1) { sea(l, R, 130, VH); poly(l, [60, 150, 300, 150, 290, 166, 76, 166], '#1a1a22'); box(l, 180, 128, 60, 22, '#22222a'); box(l, 210, 108, 8, 20, '#22222a'); for (let k = 0; k < 12; k++) box(l, 90 + k * 17, 156, 4, 3, '#ffe080'); box(l, 186, 134, 48, 3, '#ffe080'); rock(l, R, [300, 136, 330, 128, 384, 132, 384, 140]); }
    if (i === 2) { sea(l, R, 150, VH); ledge(l, R, 200, 200, 4.5); person(l, 214, 176, 50, { coat: '#e8c030', beard: true, cap: true, lantern: true, wave: true }); poly(l, [300, 196, 360, 196, 352, 208, 306, 208], '#e8e4d8'); person(l, 330, 198, 22, { coat: '#c83020' }); }
    if (i === 3) { sea(l, R, 130, VH); jetty(l, R, [20, 364], [150, 234], VH, 150); person(l, 170, 206, 70, { coat: '#e8c030', beard: true, cap: true }); person(l, 222, 210, 48, { coat: '#3a6ab0', hair: '#6a3a1a' }); cat(l, 262, 212, 26, { sit: true }); box(l, 196, 150, 12, 10, '#f4f0e0'); poly(l, [250, 150, 300, 150, 296, 158, 254, 158], '#c83020'); }
    applyTint(L, ph); g.drawImage(L, 0, 0); GLOWS.forEach(([x, y, r]) => glow(g, x, y, r, 'rgba(255,230,140,1)', 0.9));
    if (ph === 'dawn') sunPath(g, R, 90, 132, 200, 'rgba(255,200,150,');
    vignette(g); dither(g); endState.imgs[i] = c; return c;
  }
  function beam(g, x, y, t, len = 420) {
    const a = t / 1400; g.save(); g.globalCompositeOperation = 'lighter';
    for (const off of [0, Math.PI]) { const c = Math.cos(a + off), w = Math.abs(Math.sin(a + off)) * 16 + 4; if (Math.sin(a + off) < 0) continue; const ex = x + c * len; g.fillStyle = lin(g, x, y, ex, y, ['rgba(255,240,180,.55)', 'rgba(255,240,180,0)']); poly(g, [x, y - 2, ex, y - w * 2.5, ex, y + w * 2.5, x, y + 2], g.fillStyle); }
    g.restore(); glow(g, x, y, 22, 'rgba(255,245,200,1)', 0.9);
  }
  function drawEnd(g, t) {
    if (!endState || endState.i < 0) { g.drawImage(endImg(3), 0, 0); return; }
    const i = endState.i; g.drawImage(endImg(i), 0, 0);
    if (i === 0) beam(g, 205, 122, t);
    if (i === 1) { beam(g, 360, 120, t, 500); }
    if (i === 2) { const a = (t / 1400) % TAU; if (Math.cos(a) < -0.6) { g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(255,240,180,.18)'; g.fillRect(0, 0, VW, VH); g.restore(); } }
  }
  function credits() {
    const st = api.load('stats', { wins: 1 }), mins = Math.max(1, Math.round(S.t / 60));
    overlay(`<div class="lgh-credits"><div class="lgh-roll">
      <h2>The Lighthouse at Gull Rock</h2><p>THE END</p><p>You relit the Gull Rock Light and brought Grandpa home.</p>
      <p class="lgh-stat">Time on the island: about ${mins} minute${mins === 1 ? '' : 's'}<br>Hints used: ${S.hintsUsed}<br>${S.f.fed ? 'Biscuit was fed and is very happy.' : 'Biscuit is still hungry, but he forgives you.'}<br>You earned $10.00!</p>
      <h4>A Tidewater Interactive Production</h4><p>Story and Puzzles<br>The Tidewater Team</p><p>Painted Scenes<br>Tidewater Art Department</p><p>Sound of the Sea<br>Recorded Nowhere in Particular</p><p>Biscuit the Cat<br>as Himself</p><p>No keepers were harmed.<br>Grandpa was only a little damp.</p><p>Thank you for playing!</p></div></div>
      <div class="lgh-jf"><span></span><button class="btn" data-a="new">Play again</button><button class="btn" data-a="title" data-focus>Title screen</button></div>`, 'lgh-endpan');
    ovKeys = null;
    E.ov.firstChild.onclick = ev => { const a = ev.target.closest('[data-a]'); if (!a) return; closeOv(); api.stopMusic(); if (a.dataset.a === 'new') newGame(true); else toTitle(); };
  }

  /* ---------- title ---------- */
  let titleCv = null;
  function drawTitle(g, t) {
    if (!titleCv) {
      titleCv = mk(VW, VH); const c = titleCv.getContext('2d'), R = rng(5); drawSky(c, 150, 'dusk', R);
      const L = mk(VW, VH), l = L.getContext('2d'); sea(l, R, 150, VH); rock(l, R, [210, VH, 230, 170, 270, 150, 330, 146, 370, 164, 384, 200, 384, VH]); grass(l, R, [236, 168, 270, 152, 330, 148, 366, 164, 300, 170], '#6a8a4a', '#2a4a1a'); tower(l, 300, 152, 110, 26, 18, {}); foam(l, R, [200, 236, 230, 190, 260, 176], 4); ledge(l, R, 80, 156, 1.2);
      applyTint(L, 'dusk'); c.drawImage(L, 0, 0); vignette(c, 0.5); dither(c);
    }
    g.drawImage(titleCv, 0, 0); sparkle(g, 0, 156, 210, 80, 8);
  }
  function toTitle() { mode = 'title'; endState = null; closeOv(); E.title.classList.add('on'); const a = api.load('auto', null); E.title.querySelector('[data-t="cont"]').disabled = !a; cap('', 1); updateUI(); }
  function newGame(skipAsk) {
    const start = () => { closeOv(); S = fresh(); mode = 'play'; E.title.classList.remove('on'); invalidate(); startTrans('f'); renderInv(); updateUI(); autosave(); later(() => openJournal('intro', true), 700); };
    if (!skipAsk && mode === 'play' && solvedN()) api.msgBox('New game', 'Start a new game? Your current progress is kept only if you saved it.', ['Yes', 'No'], 'warn').then(r => { if (r === 'Yes') start(); }); else start();
  }

  /* ---------- UI chrome ---------- */
  const ARROWS = { fwd: '<polygon points="16,3 28,16 20,16 20,29 12,29 12,16 4,16"/>', left: '<polygon points="3,16 16,4 16,12 29,12 29,20 16,20 16,28"/>', right: '<polygon points="29,16 16,4 16,12 3,12 3,20 16,20 16,28"/>', back: '<path d="M22 28 V13 a6 6 0 0 0 -12 0 V17 h5 l-8 10 -8 -10 h5 V13 a12 12 0 0 1 24 0 V28 z" transform="translate(3 0) scale(.85)"/>', hand: '<path d="M11 29 L5 20 L8 17 L12 21 V5 a2 2 0 0 1 4 0 V14 h1 V11 a2 2 0 0 1 4 0 V15 h1 V13 a2 2 0 0 1 4 0 V16 h1 a2 2 0 0 1 3 1 V23 L25 29 Z"/>', look: '<circle cx="13" cy="13" r="8" fill="none" stroke-width="4"/><circle cx="13" cy="13" r="8" fill="none" stroke="#fff" stroke-width="2"/><rect x="18" y="20" width="5" height="11" transform="rotate(-45 20 25)"/>' };
  const svgOf = (k, fill = '#fff', stroke = '#000') => `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="${fill}" stroke="${stroke}" stroke-width="1.6" stroke-linejoin="round">${ARROWS[k]}</svg>`;
  const CURS = {}; Object.keys(ARROWS).forEach(k => { CURS[k] = `url("data:image/svg+xml,${encodeURIComponent(svgOf(k))}") 16 16, pointer`; });
  function msg(t) { if (E.msg) E.msg.textContent = t; }
  function msg2(t) { if (E.msg) E.msg.textContent = (E.msg.textContent ? E.msg.textContent + '  ' : '') + t + '.'; }
  function cap(t, ms = 3000, force) { if (!E.cap) return; if (!force && !opt.subs) return; E.cap.textContent = t; E.cap.classList.toggle('on', !!t); clearTimeout(capT); if (t) capT = setTimeout(() => E.cap.classList.remove('on'), ms); }
  function renderInv() {
    if (!E.inv) return;
    E.inv.innerHTML = S && mode === 'play' ? S.items.map(id => `<button class="lgh-slot${S.sel === id ? ' sel' : ''}" data-i="${id}" title="${ITEMS[id].n}" aria-label="${ITEMS[id].n}"><svg viewBox="0 0 32 32" shape-rendering="crispEdges">${ITEMS[id].svg}</svg></button>`).join('') || '<span class="lgh-empty">Your pockets are empty.</span>' : '';
  }
  function updateUI() {
    const play = mode === 'play';
    E.root.classList.toggle('lgh-cu', !!(play && S.cu));
    const hs = play ? hotspots() : [];
    ['left', 'fwd', 'right', 'back'].forEach(k => { const b = E.nav.querySelector(`[data-n="${k}"]`); b.disabled = !play || !hs.some(h => h.c === k && (h.to || k === 'back' || h.act)); });
    E.jb.disabled = !play; E.hb.disabled = !play; E.cb.style.display = play && has('chart') ? '' : 'none';
    renderInv();
  }
  function navDir(k) { const h = hotspots().find(x => x.c === k); if (h) activate(h); }
  function fit() {
    const r = E.stage.getBoundingClientRect(); if (!r.width) return;
    let w = r.width - 8, h = w * VH / VW; if (h > r.height - 8) { h = r.height - 8; w = h * VW / VH; }
    E.view.style.width = Math.floor(w) + 'px'; E.view.style.height = Math.floor(h) + 'px';
    cv.classList.toggle('lgh-px', w / VW >= 1.5);
    E.root.classList.toggle('lgh-narrow', r.width < 480);
  }

  /* ---------- the app ---------- */
  const ICON = '<svg viewBox="0 0 32 32" shape-rendering="crispEdges" aria-hidden="true"><rect width="32" height="32" fill="#1a2250"/><rect x="0" y="24" width="32" height="8" fill="#2a4a78"/><rect x="2" y="6" width="3" height="1" fill="#fff"/><rect x="26" y="4" width="1" height="1" fill="#fff"/><polygon points="4,10 13,13 13,15 4,18" fill="#ffe890" opacity=".7"/><polygon points="12,26 14,10 18,10 20,26" fill="#f4f0e4"/><rect x="13" y="14" width="6" height="3" fill="#c03a2e"/><rect x="12" y="20" width="8" height="3" fill="#c03a2e"/><rect x="13" y="6" width="6" height="4" fill="#ffd860"/><rect x="12" y="4" width="8" height="2" fill="#6a1a14"/><rect x="11" y="10" width="10" height="1" fill="#222"/><rect x="8" y="26" width="16" height="3" fill="#5a5448"/></svg>';
  (window.RETRO_APPS = window.RETRO_APPS || []).push({
    id: 'lighthouse',
    label: 'The Lighthouse at Gull Rock',
    help: 'A CD-ROM mystery: explore a little island, solve the keeper\'s puzzles and relight the lighthouse before the ship arrives. Solve it to earn money.',
    kind: 'store', cat: 'game', year: 1995, price: 29.95,
    publisher: 'Tidewater Interactive', genre: 'Adventure / Mystery',
    tagline: 'The light is dark. The ship is due at nine. Where is Grandpa?',
    blurb: 'Step onto Gull Rock, a windswept island with a lighthouse, a cottage, a cave and a keeper who has vanished. Explore more than twenty beautifully painted scenes, read Grandpa\'s notes, crack his puzzle locks, decode the family flag code, play the foghorn and relight the great lamp before the Northern Lark sails by. A gentle mystery for the whole family, on one CD-ROM.',
    sizeKB: 48000,
    box: { bg: '#10183a', fg: '#fff4d0', accent: '#ffcc40' },
    icon: ICON,
    window: { w: 720, h: 560 },
    css: `
      .lgh{position:absolute;inset:0;display:flex;flex-direction:column;background:#0b0d12;color:#e8dfc8;font:12px var(--ui);user-select:none;-webkit-user-select:none;overflow:hidden}
      .lgh-stage{flex:1;min-height:0;display:flex;align-items:center;justify-content:center;position:relative;background:radial-gradient(#1c2230,#06070a)}
      .lgh-view{position:relative;box-shadow:0 0 0 1px #000,0 0 0 3px #5a4a2a,0 0 0 4px #000}
      .lgh-view canvas{display:block;width:100%;height:100%;touch-action:manipulation;outline:none}
      .lgh-view canvas.lgh-px{image-rendering:pixelated;image-rendering:crisp-edges}
      .lgh-cap{position:absolute;left:5%;right:5%;bottom:6px;text-align:center;color:#fff;font:bold 13px/1.35 Arial,sans-serif;text-shadow:1px 1px 0 #000,-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000,0 0 6px #000;pointer-events:none;opacity:0;transition:opacity .5s}
      .lgh-cap.on{opacity:1}
      .lgh-cu .lgh-cap{bottom:auto;top:6px}
      .lgh-tap{position:absolute;width:32px;height:32px;margin:-16px 0 0 -16px;pointer-events:none;opacity:0;transition:opacity .4s}
      .lgh-tap.on{opacity:1;transition:none}
      .lgh-title{position:absolute;inset:0;display:none;flex-direction:column;align-items:flex-start;justify-content:center;padding:0 0 0 6%;gap:6px}
      .lgh-title.on{display:flex}
      .lgh-title h1{margin:0 0 4px;font:bold clamp(20px,5.2vw,38px)/1.05 Georgia,"Times New Roman",serif;color:#ffd870;text-shadow:2px 2px 0 #3a1a00,0 0 18px rgba(255,200,80,.55);letter-spacing:1px;max-width:62%}
      .lgh-title h1 small{display:block;font-size:.42em;color:#c8d8f0;letter-spacing:4px;text-shadow:1px 1px 0 #000}
      .lgh .btn{color:#000}
      .lgh-title .btn{min-width:150px;font-weight:bold}
      .lgh-title p{margin:6px 0 0;color:#a8b8d0;font:italic 11px Georgia,serif}
      .lgh-bar{flex:none;display:flex;align-items:center;gap:6px;padding:4px 6px;background:linear-gradient(#2e271c,#15120d);border-top:2px solid #6a5a3a}
      .lgh-inv{display:flex;gap:3px;flex:1;min-width:0;flex-wrap:wrap;align-items:center}
      .lgh-empty{color:#8a7a5a;font:italic 11px Georgia,serif;padding-left:4px}
      .lgh-slot{width:36px;height:36px;padding:0;display:flex;align-items:center;justify-content:center;background:#1a160f;border:2px solid;border-color:#0a0806 #6a5a3a #6a5a3a #0a0806;cursor:pointer}
      .lgh-slot.sel{background:#6a5220;border-color:#ffd870}
      .lgh-slot svg{width:30px;height:30px}
      .lgh-nav{display:flex;gap:2px;flex:none}
      .lgh-nav .btn,.lgh-tools .btn{min-width:0;height:34px;padding:0 6px;display:flex;align-items:center;justify-content:center}
      .lgh-nav .btn{width:36px}
      .lgh-nav svg{width:20px;height:20px}
      .lgh-nav .btn:disabled svg{opacity:.3}
      .lgh-tools{display:flex;gap:2px;flex:none}
      .lgh-msg{flex:none;min-height:34px;padding:3px 8px;background:#000;color:#f0e0b0;font:12px/1.4 var(--ui);border-top:1px solid #333;display:flex;align-items:center}
      .lgh-narrow .lgh-bar{flex-wrap:wrap}
      .lgh-narrow .lgh-inv{flex-basis:100%;order:2}
      .lgh-narrow .lgh-nav{order:1}
      .lgh-narrow .lgh-tools{order:1;margin-left:auto}
      .lgh-ov{position:absolute;inset:0;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.6);z-index:5;padding:8px}
      .lgh-ov.on{display:flex}
      .lgh-pan{background:#c0c0c0;color:#000;border:2px solid;border-color:#fff #000 #000 #fff;box-shadow:inset -1px -1px #808080;padding:8px;max-width:520px;width:100%;max-height:100%;display:flex;flex-direction:column;gap:6px;box-sizing:border-box}
      .lgh-jh{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
      .lgh-sel{flex:1;min-width:0;font:12px var(--ui)}
      .lgh-page{flex:1;min-height:0;overflow:auto;background:linear-gradient(#f8f0d8,#efe2bc);color:#2a2016;border:2px solid;border-color:#808080 #fff #fff #808080;padding:10px 14px;font:14px/1.45 Georgia,"Times New Roman",serif;user-select:text;-webkit-user-select:text}
      .lgh-page h3{margin:0 0 6px;font:bold 16px Georgia,serif;color:#5a2a10}
      .lgh-page p{margin:0 0 8px}
      .lgh-hand{font:16px/1.45 "Comic Sans MS","Segoe Print","Bradley Hand",cursive;color:#1a2a5a}
      .lgh-dim{color:#6a5a40;font-style:italic}
      .lgh-dim2{color:#555;font-style:italic;margin-right:auto}
      .lgh-star{color:#c02020;font-weight:bold}
      .lgh-flags{display:flex;flex-wrap:wrap;gap:8px}
      .lgh-flags span{display:flex;flex-direction:column;align-items:center;gap:2px;font:bold 13px Arial}
      .lgh-col{flex-direction:column;align-items:flex-start}
      .lgh-flag{width:44px;height:30px;image-rendering:pixelated;border:1px solid #000}
      .lgh-mb{display:block;margin:4px auto;width:170px;max-width:100%;image-rendering:pixelated;border:1px solid #6a5a40}
      .lgh-tt{border-collapse:collapse;width:100%;font:13px Georgia,serif}
      .lgh-tt th,.lgh-tt td{border:1px solid #8a7a5a;padding:3px 5px;text-align:left}
      .lgh-tt th{background:#e0d0a8}
      .lgh-jf{display:flex;align-items:center;gap:6px;justify-content:flex-end;flex-wrap:wrap}
      .lgh-jf .btn{min-width:64px}
      .lgh-jf span{margin-right:auto}
      .lgh-h{margin:0;font:bold 14px var(--ui)}
      .lgh-hints{overflow:auto}
      .lgh-next{margin:0;background:#ffffe0;border:1px solid #808080;padding:6px}
      .lgh-hint{background:#fff;border:2px solid;border-color:#808080 #fff #fff #808080;padding:6px}
      .lgh-hint ol{margin:4px 0 6px 18px;padding:0}
      .lgh-hint .btn{margin-top:4px}
      .lgh-slotrow{display:flex;align-items:center;gap:8px;background:#fff;border:2px solid;border-color:#808080 #fff #fff #808080;padding:6px}
      .lgh-slotrow span{flex:1;min-width:0}
      .lgh-endpan{background:#000;border-color:#5a4a2a;color:#ffe8b0;height:100%;max-height:520px}
      .lgh-credits{flex:1;min-height:0;overflow:hidden;position:relative;text-align:center;font:14px/1.5 Georgia,serif}
      .lgh-roll{position:absolute;left:0;right:0;top:0;animation:lgh-roll 38s linear forwards}
      .lgh-roll h2{font:bold 24px Georgia,serif;color:#ffd870;margin:10px 0}
      .lgh-roll h4{color:#ffd870;margin:22px 0 10px}
      .lgh-roll p{margin:0 0 16px}
      .lgh-stat{color:#c8d8f0}
      @keyframes lgh-roll{0%{transform:translateY(0)}8%{transform:translateY(0)}100%{transform:translateY(calc(-100% + 60px))}}
    `,
    open(win, a) {
      W = win; api = a; mode = 'title'; cache = new Map(); cuCache = new Map(); trans = null; timers = []; paused = false; focusIdx = -1; endState = null; lastAmb = ''; titleCv = null;
      opt = Object.assign({ sound: true, subs: true, spots: false }, api.load('opt', {}));
      S = api.load('auto', null) ? Object.assign(fresh(), api.load('auto')) : fresh(); S.cu = null; S.sel = null;
      W.body.innerHTML = `<div class="lgh"><div class="lgh-stage"><div class="lgh-view"><canvas width="${VW}" height="${VH}" tabindex="0" aria-label="Game view"></canvas><div class="lgh-cap" aria-live="polite"></div><div class="lgh-tap"></div>
        <div class="lgh-title"><h1>The Lighthouse at Gull Rock<small>A GULL ROCK MYSTERY</small></h1><button class="btn" data-t="new">New Game</button><button class="btn" data-t="cont">Continue</button><button class="btn" data-t="load">Restore Game</button><button class="btn" data-t="how">How to Play</button><p>Tidewater Interactive, 1995</p></div></div></div>
        <div class="lgh-bar"><div class="lgh-nav">${['left', 'fwd', 'right', 'back'].map(k => `<button class="btn" data-n="${k}" aria-label="${{ left: 'Turn left', fwd: 'Go forward', right: 'Turn right', back: 'Go back' }[k]}" title="${{ left: 'Left', fwd: 'Forward', right: 'Right', back: 'Back' }[k]}">${svgOf(k, '#000', 'none')}</button>`).join('')}</div>
        <div class="lgh-inv"></div><div class="lgh-tools"><button class="btn" data-b="chart">Chart</button><button class="btn" data-b="journal">Journal</button><button class="btn" data-b="hints">Hints</button></div></div>
        <div class="lgh-msg" role="status"></div><div class="lgh-ov"></div></div>`;
      const $ = s => W.body.querySelector(s);
      E = { root: $('.lgh'), stage: $('.lgh-stage'), view: $('.lgh-view'), cap: $('.lgh-cap'), tap: $('.lgh-tap'), title: $('.lgh-title'), inv: $('.lgh-inv'), nav: $('.lgh-nav'), msg: $('.lgh-msg'), ov: $('.lgh-ov'), jb: $('[data-b="journal"]'), hb: $('[data-b="hints"]'), cb: $('[data-b="chart"]') };
      cv = $('canvas'); ctx = cv.getContext('2d'); prevCv = mk(VW, VH);
      const menus = () => [
        { label: 'Game', items: () => [{ label: 'New Game', fn: () => newGame() }, { label: 'Save Game...', fn: () => openSlots(true), disabled: mode !== 'play' }, { label: 'Restore Game...', fn: () => openSlots(false) }, '-', { label: 'Journal', fn: () => openJournal(), disabled: mode !== 'play' }, { label: 'Hints', fn: openHints, disabled: mode !== 'play' }, { label: 'Island Chart', fn: () => openCU('chart'), disabled: mode !== 'play' || !has('chart') }, '-', { label: 'How to Play', fn: howTo }, { label: 'Title Screen', fn: toTitle }] },
        { label: 'Options', items: () => [{ label: (opt.sound ? '✓ ' : '   ') + 'Sound', fn: () => setOpt('sound') }, { label: (opt.subs ? '✓ ' : '   ') + 'Subtitles', fn: () => setOpt('subs') }, { label: (opt.spots ? '✓ ' : '   ') + 'Show hotspots', fn: () => setOpt('spots') }] }
      ];
      api.menubar(menus());
      function setOpt(k) { opt[k] = !opt[k]; api.save('opt', opt); msg(`${{ sound: 'Sound', subs: 'Subtitles', spots: 'Show hotspots' }[k]} ${opt[k] ? 'on' : 'off'}.`); }
      function howTo() {
        api.msgBox('How to play', 'Explore Gull Rock and find out what happened to Grandpa.\n\nMove the pointer over the picture: it turns into an arrow where you can walk or turn, a hand where you can use or take something, and a magnifying glass where you can look closely. On a touch screen, just tap. The arrow buttons and the keyboard arrow keys also move you around; Tab and Enter pick things in the picture.\n\nThings you pick up go in the bar at the bottom. Tap an item to hold it, then tap where to use it. Notes and clues are saved in your Journal.\n\nStuck? Open Hints for up to three hints per puzzle. Save your game from the Game menu (three slots).\n\nSolve the mystery to earn $10.');
      }
      E.title.onclick = ev => { const b = ev.target.closest('[data-t]'); if (!b) return; snd.click(); const k = b.dataset.t; if (k === 'new') newGame(true); else if (k === 'cont') { const d = api.load('auto', null); if (d) loadState(d); } else if (k === 'load') openSlots(false); else howTo(); };
      E.nav.onclick = ev => { const b = ev.target.closest('[data-n]'); if (b && !b.disabled) { snd.click(); navDir(b.dataset.n); } };
      E.inv.onclick = ev => { const b = ev.target.closest('[data-i]'); if (!b) return; const id = b.dataset.i; S.sel = S.sel === id ? null : id; snd.click(); msg(S.sel ? `${ITEMS[id].n}: ${ITEMS[id].d} Tap where you want to use it.` : ''); renderInv(); };
      E.jb.onclick = () => { snd.click(); openJournal(); }; E.hb.onclick = () => { snd.click(); openHints(); }; E.cb.onclick = () => { snd.click(); if (S.cu !== 'chart') openCU('chart'); };
      E.ov.addEventListener('pointerdown', ev => { if (ev.target === E.ov) closeOv(); });
      const pt = ev => { const r = cv.getBoundingClientRect(); return [(ev.clientX - r.left) * VW / r.width, (ev.clientY - r.top) * VH / r.height]; };
      let down = null;
      cv.addEventListener('pointermove', ev => {
        if (ev.pointerType !== 'mouse' || mode !== 'play') { cv.style.cursor = mode === 'end' ? 'pointer' : 'default'; return; }
        const h = hitAt(...pt(ev)); cv.style.cursor = h ? (CURS[h.c] || 'pointer') : 'default';
        E.view.title = h && h.tip ? h.tip : '';
      });
      cv.addEventListener('pointerdown', ev => { down = pt(ev); });
      cv.addEventListener('pointerup', ev => {
        if (!down) return; const p = pt(ev); if (Math.hypot(p[0] - down[0], p[1] - down[1]) > 12) { down = null; return; } down = null;
        if (mode === 'end') { if (endState && endState.i >= 0) endNext(); return; }
        if (mode !== 'play' || (trans && performance.now() - trans.t0 < 250)) return;
        const h = hitAt(...p);
        if (ev.pointerType !== 'mouse' && h) { E.tap.innerHTML = svgOf(h.c); E.tap.style.left = (p[0] / VW * 100) + '%'; E.tap.style.top = (p[1] / VH * 100) + '%'; E.tap.classList.add('on'); requestAnimationFrame(() => requestAnimationFrame(() => E.tap.classList.remove('on'))); }
        activate(h); updateUI();
      });
      W.onKey = e => {
        if (E.ov.classList.contains('on')) { if (e.key === 'Escape') { e.preventDefault(); closeOv(); } else if (ovKeys && ovKeys(e)) e.preventDefault(); return; }
        if (mode === 'end') { if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') { e.preventDefault(); endNext(); } return; }
        if (mode !== 'play') return;
        if (S.cu && CU[S.cu].key && CU[S.cu].key(e)) { e.preventDefault(); return; }
        const hs = hotspots().filter(h => h.r[2]), k = e.key;
        const cycle = d => { focusIdx = hs.length ? ((focusIdx < 0 ? (d > 0 ? -1 : 0) : focusIdx) + d + hs.length) % hs.length : -1; const f = hs[focusIdx]; if (f && f.tip) msg(f.tip); };
        if (k === 'Tab') { e.preventDefault(); cycle(e.shiftKey ? -1 : 1); }
        else if (k === 'Enter' || k === ' ') { e.preventDefault(); const f = hs[focusIdx]; if (f) { activate(f); updateUI(); } }
        else if (S.cu) { if (k === 'ArrowRight') { e.preventDefault(); cycle(1); } else if (k === 'ArrowLeft') { e.preventDefault(); cycle(-1); } else if (k === 'Escape' || k === 'ArrowDown' || k === 'Backspace') { e.preventDefault(); closeCU(); updateUI(); } else if (k === 'ArrowUp') { e.preventDefault(); const f = hs[focusIdx]; if (f) activate(f); } }
        else if (k === 'ArrowUp') { e.preventDefault(); navDir('fwd'); } else if (k === 'ArrowLeft') { e.preventDefault(); navDir('left'); } else if (k === 'ArrowRight') { e.preventDefault(); navDir('right'); }
        else if (k === 'ArrowDown' || k === 'Backspace' || k === 'Escape') { e.preventDefault(); navDir('back'); }
        else if (k === 'j' || k === 'J') openJournal(); else if (k === 'h' || k === 'H') openHints(); else if ((k === 'm' || k === 'M') && has('chart')) openCU('chart');
        else if (/^[1-7]$/.test(k) && S.items[+k - 1]) { const id = S.items[+k - 1]; S.sel = S.sel === id ? null : id; renderInv(); msg(S.sel ? ITEMS[id].n + ': tap or press Enter where you want to use it.' : ''); }
      };
      W.onResize = fit;
      W.onMin = () => { paused = true; };
      const unpause = () => { paused = false; }; W.body.addEventListener('pointerdown', unpause, true); W.body.addEventListener('keydown', unpause, true);
      W.onClose = () => { cancelAnimationFrame(raf); clearInterval(ambT); timers.forEach(clearTimeout); timers = []; clearTimeout(capT); if (mode === 'play') autosave(); api.stopMusic(); };
      const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => { paused = false; fit(); }) : null; if (ro) ro.observe(E.stage);
      const oc = W.onClose; W.onClose = () => { if (ro) ro.disconnect(); return oc(); };
      toTitle(); fit(); requestAnimationFrame(fit);
      raf = requestAnimationFrame(frame); ambT = setInterval(ambTick, 500);
    }
  });
})();
