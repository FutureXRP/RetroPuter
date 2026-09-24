/* Tiny Town: a store game (2000). A small city-building simulation on a canvas tile map.
   Everything is drawn procedurally. The simulation ticks once per in-game month and the view
   only redraws when something changes (or while fires / the hamster / fireworks animate). */
(function () {
  'use strict';
  const N = 80, T = 16, Y0 = 1950;
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const ZOOMS = [6, 8, 12, 16, 24, 32];
  const SPEEDS = [0, 2400, 1100, 380];
  const SPEED_NAMES = ['Pause', 'Slow', 'Normal', 'Fast'];
  const MS = [[500, 'Village'], [2000, 'Town'], [10000, 'City'], [50000, 'Capital']];
  const DIFF = [['Easy', 30000], ['Normal', 20000], ['Hard', 10000]];
  const TOOLS = [
    { id: 'hand', name: 'Hand', key: 'h', tip: 'drag to move the map, tap to inspect' },
    { id: 'query', name: 'Query', key: 'q', tip: 'click a tile to inspect it' },
    { id: 'doze', name: 'Bulldoze', key: 'b', cost: 1, line: 1, tip: '$1 per tile, buildings $2 per tile' },
    { id: 'road', name: 'Road', key: 'd', cost: 10, line: 1, tip: '$10 per tile, bridges $50' },
    { id: 'wire', name: 'Power line', key: 'l', cost: 5, line: 1, tip: '$5 per tile, $25 over water' },
    { id: 'R', name: 'Residential zone', key: 'r', cost: 100, tip: '3x3, homes' },
    { id: 'C', name: 'Commercial zone', key: 'c', cost: 100, tip: '3x3, shops and offices' },
    { id: 'I', name: 'Industrial zone', key: 'i', cost: 100, tip: '3x3, factories' },
    { id: 'coal', name: 'Coal power plant', key: 'p', cost: 3000, tip: 'cheap, powers 50 buildings, smoky' },
    { id: 'sun', name: 'Sun farm', key: 'u', cost: 6000, tip: 'clean, powers 40 buildings' },
    { id: 'park', name: 'Park', key: 'k', cost: 50, tip: 'raises land value nearby' },
    { id: 'police', name: 'Police station', key: 'e', cost: 500, tip: 'lowers crime nearby' },
    { id: 'firest', name: 'Fire station', key: 'f', cost: 500, tip: 'stops fires nearby' },
    { id: 'school', name: 'School', key: 's', cost: 600, tip: 'raises land value nearby' }
  ];
  const TOOL = {}; TOOLS.forEach(t => TOOL[t.id] = t);
  const SIZE = { R: 3, C: 3, I: 3, coal: 3, sun: 3, park: 1, police: 2, firest: 2, school: 2 };
  const ZONE = { R: 1, C: 1, I: 1 };
  const POP = { R: [0, 20, 60, 160, 360], C: [0, 10, 30, 80, 180], I: [0, 15, 40, 90, 160] };
  const CAP = { coal: 50, sun: 40 };
  const UPKEEP = { coal: 400, sun: 250, police: 300, firest: 300, school: 400, park: 10 };
  const ZC = { R: '#40e040', C: '#4a8cff', I: '#f0d020' };
  const STAGES = {
    R: ['Empty lot', 'Cottages', 'Neighborhood', 'Apartments', 'Tower block'],
    C: ['Empty lot', 'Corner shops', 'Shopping row', 'Offices', 'Skyscraper'],
    I: ['Empty lot', 'Workshops', 'Factory', 'Big factory', 'Heavy industry']
  };
  const NAME_A = ['Maple', 'Puddle', 'Bramble', 'Clover', 'Pebble', 'Willow', 'Honey', 'Thistle', 'Button', 'Acorn', 'Juniper', 'Muffin'];
  const NAME_B = ['ton', ' Hollow', 'bury', ' Falls', 'ville', ' Creek', 'field', ' Bend', 'wick', ' Springs'];

  /* ---------- small helpers ---------- */
  const mulberry = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const hashStr = s => { let h = 2166136261; const str = String(s); for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const hash2 = (x, y) => { let h = Math.imul(x * 374761393 + y * 668265263, 1274126177); h ^= h >>> 13; return (h >>> 0) % 1000; };
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const fmt = n => Math.round(n).toLocaleString('en-US');
  const money = n => (n < 0 ? '-$' : '$') + fmt(Math.abs(n));
  const dateStr = m => MON[m % 12] + ' ' + (Y0 + Math.floor(m / 12));

  /* ---------- pixel painting ---------- */
  const R = (g, c, x, y, w, h) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  function disc(g, c, cx, cy, r) { for (let dy = -r; dy <= r; dy++) { const w = Math.floor(Math.sqrt(r * r - dy * dy + r * 0.8)); R(g, c, cx - w, cy + dy, w * 2 + 1, 1); } }
  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16); let r = n >> 16, gg = n >> 8 & 255, b = n & 255;
    const m = f < 0 ? 0 : 255, t = Math.abs(f);
    r = Math.round(r + (m - r) * t); gg = Math.round(gg + (m - gg) * t); b = Math.round(b + (m - b) * t);
    return `rgb(${r},${gg},${b})`;
  }
  function mk(w, h, fn) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d'); fn(g, w, h); return cv; }
  function speck(g, w, h, col, n, seed) { const r = mulberry(seed); for (let i = 0; i < n; i++) R(g, col, r() * w | 0, r() * h | 0, 1, 1); }
  function tree(g, x, y, r) { r = r || 4; R(g, '#5a3a18', x - 1, y + r - 1, 2, 3); disc(g, '#1f5f1f', x, y, r); disc(g, '#2f8a2c', x - 1, y - 1, r - 1); R(g, '#5cb84a', x - r + 2, y - r + 2, 2, 1); }
  function gnd(g, w, h, c1, c2, seed) { R(g, c1, 0, 0, w, h); speck(g, w, h, c2, (w * h / 9) | 0, seed); }
  function corners(g, w, h, col) {
    R(g, col, 0, 0, 5, 1); R(g, col, 0, 0, 1, 5); R(g, col, w - 5, 0, 5, 1); R(g, col, w - 1, 0, 1, 5);
    R(g, col, 0, h - 1, 5, 1); R(g, col, 0, h - 5, 1, 5); R(g, col, w - 5, h - 1, 5, 1); R(g, col, w - 1, h - 5, 1, 5);
  }
  function house(g, x, y, w, h, roof, wall) {
    const rh = Math.round(h * 0.58);
    R(g, 'rgba(0,0,0,0.28)', x + 2, y + 2, w, h);
    R(g, wall, x, y + rh, w, h - rh);
    R(g, roof, x, y, w, rh);
    R(g, shade(roof, 0.3), x, y, w, 1);
    R(g, shade(roof, -0.25), x, y + (rh >> 1), w, 1);
    R(g, shade(roof, -0.45), x, y + rh - 1, w, 1);
    R(g, '#6a4020', x + (w >> 1) - 1, y + h - 4, 3, 4);
    R(g, '#a8d8f8', x + 2, y + rh + 1, 2, 2); R(g, '#a8d8f8', x + w - 4, y + rh + 1, 2, 2);
    R(g, '#7a3a2a', x + w - 5, y - 2, 2, 3);
  }
  function block(g, x, y, w, rh, fh, wall, win, roof) {
    R(g, 'rgba(0,0,0,0.3)', x + 3, y + 3, w, rh + fh);
    R(g, roof, x, y, w, rh); R(g, shade(roof, 0.3), x, y, w, 1); R(g, shade(roof, 0.3), x, y, 1, rh); R(g, shade(roof, -0.3), x, y + rh - 1, w, 1);
    R(g, wall, x, y + rh, w, fh); R(g, shade(wall, -0.25), x + w - 2, y + rh, 2, fh);
    for (let fy = y + rh + 2; fy + 2 <= y + rh + fh - 1; fy += 4) for (let fx = x + 2; fx + 2 <= x + w - 3; fx += 3) R(g, win, fx, fy, 2, 2);
  }
  function shop(g, x, y, w, h, wall, awn) {
    R(g, 'rgba(0,0,0,0.3)', x + 2, y + 2, w, h);
    R(g, '#8a8a8a', x, y, w, 6); R(g, '#b0b0b0', x, y, w, 1); R(g, '#6a6a6a', x, y + 5, w, 1);
    R(g, wall, x, y + 6, w, h - 6);
    for (let i = 0; i < w; i += 2) R(g, (i >> 1) % 2 ? '#fff' : awn, x + i, y + 6, 2, 3);
    R(g, '#a8e0ff', x + 2, y + 10, w - 9, 3);
    R(g, '#5a3a1a', x + w - 5, y + h - 5, 3, 5);
  }
  function shed(g, x, y, w, h, col) {
    const rh = Math.round(h * 0.55);
    R(g, 'rgba(0,0,0,0.3)', x + 2, y + 2, w, h);
    R(g, col, x, y, w, rh);
    for (let i = 1; i < w; i += 2) R(g, shade(col, -0.18), x + i, y, 1, rh);
    R(g, shade(col, -0.35), x, y + rh, w, h - rh);
    R(g, '#3a3a3a', x + 3, y + rh + 2, Math.min(8, w - 6), h - rh - 2);
  }
  function car(g, x, y, col) { R(g, '#202020', x, y + 3, 6, 1); R(g, col, x, y, 6, 3); R(g, '#bfe3ff', x + 2, y, 2, 1); }
  function chimney(g, x, y, w, h, c1, c2) { R(g, 'rgba(0,0,0,0.3)', x + 2, y + 2, w, h); for (let k = 0; k < h; k += 4) R(g, (k >> 2) % 2 ? c2 : c1, x, y + k, w, Math.min(4, h - k)); R(g, '#202020', x, y, w, 1); }
  function smoke(g, x, y, col) { disc(g, col, x, y, 3); disc(g, col, x - 4, y - 1, 2); }
  const FONT = { R: ['111', '101', '110', '101', '101'], C: ['111', '100', '100', '100', '111'], I: ['111', '010', '010', '010', '111'] };
  function letter(g, ch, x, y, s, col) { FONT[ch].forEach((row, j) => { for (let i = 0; i < 3; i++) if (row[i] === '1') R(g, col, x + i * s, y + j * s, s, s); }); }

  function paint(g, t, lvl, v, burnt) {
    const G1 = '#48a23a', G2 = '#3d8f31';
    if (ZONE[t] && lvl === 0) {
      if (burnt) {
        R(g, '#5a4a3a', 0, 0, 48, 48); speck(g, 48, 48, '#2a2220', 240, 3); speck(g, 48, 48, '#8a8a80', 90, 4);
        R(g, '#2a1a10', 8, 12, 16, 2); R(g, '#2a1a10', 26, 28, 2, 12); R(g, '#3a2a1a', 14, 30, 10, 2); R(g, '#1a1410', 30, 10, 8, 8);
      } else {
        R(g, '#b89868', 0, 0, 48, 48); speck(g, 48, 48, '#a08050', 150, 7); speck(g, 48, 48, '#c8ac7c', 80, 9);
        for (let i = 0; i < 48; i += 4) { R(g, ZC[t], i, 0, 2, 2); R(g, ZC[t], i, 46, 2, 2); R(g, ZC[t], 0, i, 2, 2); R(g, ZC[t], 46, i, 2, 2); }
        letter(g, t, 19, 15, 4, '#000'); letter(g, t, 18, 14, 4, ZC[t]);
      }
      if (burnt) corners(g, 48, 48, ZC[t]);
      return;
    }
    if (t === 'R') {
      gnd(g, 48, 48, G1, G2, 11 + lvl);
      if (lvl === 1) {
        house(g, 5, 6, 15, 12, '#c83828', '#ece0c4'); house(g, 27, 26, 15, 12, '#3a5cb8', '#f4ecd8');
        for (let i = 3; i < 22; i += 3) R(g, '#f0f0f0', i, 21, 1, 3); R(g, '#f0f0f0', 3, 22, 19, 1);
        tree(g, 37, 11, 4); tree(g, 11, 33, 4); tree(g, 22, 41, 3);
      } else if (lvl === 2) {
        R(g, '#b8b098', 0, 20, 48, 3);
        house(g, 3, 4, 14, 12, '#c83828', '#ece0c4'); house(g, 28, 4, 15, 12, '#7a5a3a', '#e8e0c8');
        house(g, 4, 27, 15, 12, '#3a5cb8', '#f4ecd8'); house(g, 29, 28, 14, 12, '#b8641c', '#efe6d0');
        tree(g, 22, 10, 3); tree(g, 24, 42, 3);
      } else if (lvl === 3) {
        R(g, '#b0a890', 0, 42, 48, 6);
        block(g, 3, 4, 19, 6, 27, '#b4643c', '#fff0a0', '#6c6c6c');
        block(g, 26, 9, 19, 6, 25, '#c89058', '#fff0a0', '#707070');
        tree(g, 12, 43, 2); tree(g, 40, 44, 2);
      } else {
        R(g, '#c8c0b0', 3, 41, 42, 6); R(g, '#60b0f0', 34, 42, 9, 4); R(g, '#a0d8ff', 35, 42, 3, 1);
        block(g, 9, 1, 30, 9, 33, '#e4dccc', '#5c94d4', '#8c8c8c');
        R(g, '#6a6a6a', 14, 3, 6, 4); R(g, '#9a9a9a', 28, 3, 5, 3);
        tree(g, 4, 8, 3); tree(g, 44, 10, 3); tree(g, 5, 28, 3);
      }
      corners(g, 48, 48, ZC.R);
    } else if (t === 'C') {
      gnd(g, 48, 48, '#a8a8a8', '#949494', 21 + lvl);
      if (lvl === 1) {
        shop(g, 4, 8, 18, 16, '#e8d8a8', '#d02828'); shop(g, 26, 22, 18, 16, '#d0e0e8', '#20a040');
        car(g, 6, 38, '#d02020'); car(g, 30, 8, '#2040c0');
      } else if (lvl === 2) {
        shop(g, 2, 3, 14, 18, '#e8d8a8', '#d02828'); shop(g, 17, 3, 14, 18, '#f0c8d0', '#2050c0'); shop(g, 32, 3, 14, 18, '#d8ecd0', '#e0a000');
        for (let x = 4; x < 46; x += 8) R(g, '#f0f0f0', x, 30, 1, 9);
        car(g, 6, 33, '#d02020'); car(g, 22, 33, '#e0e0e0'); car(g, 38, 33, '#208040');
      } else if (lvl === 3) {
        block(g, 3, 3, 19, 6, 33, '#8ca0b8', '#d8f4ff', '#5c6878');
        block(g, 26, 9, 19, 6, 27, '#b0a88c', '#fff8c0', '#6c6c6c');
        car(g, 30, 43, '#c02020');
      } else {
        block(g, 10, 0, 28, 7, 40, '#3c6898', '#a8e4ff', '#2c4868');
        R(g, '#e0e0e0', 23, 1, 2, 4); R(g, '#ff3030', 23, 1, 2, 1);
        disc(g, '#c0c0c0', 5, 42, 3); disc(g, '#60a8f0', 5, 42, 1); car(g, 40, 42, '#e0c020');
      }
      corners(g, 48, 48, ZC.C);
    } else if (t === 'I') {
      gnd(g, 48, 48, '#b0a894', '#9a927e', 31 + lvl);
      if (lvl === 1) {
        shed(g, 4, 6, 22, 16, '#a8a8a8'); shed(g, 26, 26, 18, 14, '#8898a8');
        [[8, 30], [14, 34], [8, 36]].forEach(([x, y]) => { R(g, '#9a6a30', x, y, 5, 5); R(g, '#6a4418', x, y + 2, 5, 1); });
      } else if (lvl === 2) {
        R(g, 'rgba(0,0,0,0.3)', 5, 10, 42, 28);
        for (let k = 0; k < 7; k++) { R(g, '#9aa0a8', 3 + k * 6, 8, 4, 14); R(g, '#a8d8f0', 7 + k * 6, 8, 2, 14); R(g, '#c8ccd0', 3 + k * 6, 8, 4, 1); }
        R(g, '#c8b890', 3, 22, 42, 14); for (let x = 5; x < 43; x += 5) R(g, '#404850', x, 26, 3, 3); R(g, '#3a3a3a', 20, 30, 8, 6);
        R(g, '#e0e0e0', 6, 40, 12, 5); R(g, '#2050a0', 18, 41, 4, 4); R(g, '#202020', 7, 45, 14, 1);
      } else if (lvl === 3) {
        R(g, 'rgba(0,0,0,0.3)', 5, 18, 30, 26);
        for (let k = 0; k < 5; k++) { R(g, '#9aa0a8', 3 + k * 6, 16, 4, 12); R(g, '#a8d8f0', 7 + k * 6, 16, 2, 12); }
        R(g, '#b8a878', 3, 28, 30, 14); for (let x = 5; x < 31; x += 5) R(g, '#404850', x, 32, 3, 3);
        chimney(g, 37, 6, 5, 32, '#d03020', '#f0f0f0'); smoke(g, 36, 3, '#d8d8d8');
        disc(g, '#c8d0d0', 41, 42, 4); R(g, '#e8f0f0', 39, 39, 2, 1);
        R(g, '#707070', 3, 6, 30, 2); disc(g, '#c8d0d0', 10, 8, 4); disc(g, '#c8d0d0', 22, 8, 4);
      } else {
        gnd(g, 48, 48, '#9a927e', '#86806c', 39);
        R(g, 'rgba(0,0,0,0.3)', 4, 22, 30, 26);
        R(g, '#5a5a5a', 2, 20, 30, 10); for (let x = 4; x < 30; x += 6) R(g, '#3a3a3a', x, 22, 4, 3);
        R(g, '#7a7060', 2, 30, 30, 16); for (let x = 4; x < 30; x += 4) R(g, '#f0c040', x, 34, 2, 2);
        chimney(g, 34, 8, 5, 32, '#8a8a8a', '#a0a0a0'); R(g, '#d03020', 34, 8, 5, 2); smoke(g, 36, 4, '#c8c8c8');
        chimney(g, 42, 12, 5, 28, '#8a8a8a', '#a0a0a0'); R(g, '#d03020', 42, 12, 5, 2); smoke(g, 43, 8, '#b8b8b8');
        disc(g, '#c0c8c8', 9, 9, 6); disc(g, '#d8e0e0', 7, 7, 2); disc(g, '#c0c8c8', 23, 9, 5);
        R(g, '#606060', 15, 9, 3, 2); R(g, '#606060', 22, 14, 2, 6); R(g, '#606060', 9, 15, 2, 5);
      }
      corners(g, 48, 48, ZC.I);
    } else if (t === 'coal') {
      gnd(g, 48, 48, '#6a5a48', '#50443a', 41);
      R(g, 'rgba(0,0,0,0.35)', 4, 22, 30, 25);
      R(g, '#4a3a30', 2, 20, 30, 8); R(g, '#6a5a48', 2, 20, 30, 1);
      R(g, '#8a4a32', 2, 28, 30, 17); for (let y = 30; y < 44; y += 3) R(g, '#6a3422', 2, y, 30, 1);
      for (let x = 5; x < 30; x += 6) R(g, '#f0c040', x, 33, 3, 3);
      chimney(g, 34, 6, 6, 34, '#a0a0a0', '#8a8a8a'); chimney(g, 42, 10, 5, 30, '#a0a0a0', '#8a8a8a');
      smoke(g, 36, 3, '#606060'); smoke(g, 44, 6, '#707070'); disc(g, '#808080', 28, 2, 2);
      disc(g, '#181818', 10, 10, 6); disc(g, '#303030', 8, 8, 2); disc(g, '#181818', 22, 8, 5); disc(g, '#383838', 21, 6, 1);
      R(g, '#707070', 12, 15, 18, 2);
    } else if (t === 'sun') {
      gnd(g, 48, 48, G1, G2, 51);
      for (let r = 0; r < 3; r++) for (let q = 0; q < 3; q++) {
        const x = 2 + q * 15, y = 3 + r * 15;
        R(g, 'rgba(0,0,0,0.3)', x + 1, y + 2, 13, 11);
        R(g, '#c8c8c8', x, y, 13, 11); R(g, '#1c3470', x + 1, y + 1, 11, 9);
        R(g, '#4a74c8', x + 4, y + 1, 1, 9); R(g, '#4a74c8', x + 8, y + 1, 1, 9); R(g, '#4a74c8', x + 1, y + 5, 11, 1);
        R(g, '#9ab8ff', x + 2, y + 2, 2, 1);
      }
    } else if (t === 'police') {
      gnd(g, 32, 32, '#a8a8a8', '#949494', 61);
      block(g, 2, 3, 24, 7, 15, '#dcdce4', '#80b0ff', '#2848a0');
      R(g, '#f0d020', 13, 3, 2, 6); R(g, '#f0d020', 10, 5, 8, 2); R(g, '#f0d020', 11, 8, 2, 2); R(g, '#f0d020', 15, 8, 2, 2);
      R(g, '#2848a0', 11, 15, 6, 3);
      R(g, '#202020', 21, 29, 8, 1); R(g, '#f0f0f0', 21, 26, 8, 3); R(g, '#2040c0', 23, 26, 4, 1); R(g, '#ff2020', 22, 25, 2, 1); R(g, '#2060ff', 26, 25, 2, 1);
    } else if (t === 'firest') {
      gnd(g, 32, 32, '#a8a8a8', '#949494', 71);
      block(g, 2, 3, 28, 7, 17, '#c83228', '#ffe080', '#7a1c18');
      [5, 17].forEach(x => { R(g, '#3a2a2a', x, 17, 9, 9); for (let y = 18; y < 26; y += 2) R(g, '#5a4a4a', x, y, 9, 1); });
      R(g, '#202020', 5, 31, 14, 1); R(g, '#d02020', 4, 27, 15, 4); R(g, '#e0e0e0', 5, 27, 9, 1); R(g, '#a8e0ff', 16, 27, 2, 2);
    } else if (t === 'school') {
      gnd(g, 32, 32, G1, G2, 81);
      block(g, 3, 5, 25, 7, 14, '#e8c890', '#80c0ff', '#b03020');
      R(g, '#6a4020', 14, 22, 4, 4); R(g, '#f0f0f0', 14, 7, 4, 3); R(g, '#202020', 15, 8, 1, 1);
      R(g, '#888', 29, 0, 1, 12); R(g, '#d02020', 30, 0, 2, 3); R(g, '#fff', 30, 1, 2, 1);
      R(g, '#e0d090', 3, 26, 11, 5);
      R(g, '#606060', 17, 25, 9, 1); R(g, '#606060', 17, 25, 1, 6); R(g, '#606060', 25, 25, 1, 6); R(g, '#c03030', 20, 29, 3, 1);
    } else if (t === 'park') {
      gnd(g, 16, 16, '#58b84a', '#4aa83c', 91 + v);
      if (!v) {
        R(g, '#d8c890', 0, 12, 16, 2); tree(g, 5, 5, 4);
        R(g, '#8a5a2a', 10, 8, 5, 2); R(g, '#5a3a1a', 10, 10, 1, 1); R(g, '#5a3a1a', 14, 10, 1, 1);
        R(g, '#ff4060', 12, 3, 1, 1); R(g, '#ffe040', 14, 5, 1, 1); R(g, '#ff4060', 2, 14, 1, 1);
      } else {
        disc(g, '#2a60c0', 8, 9, 5); disc(g, '#3a78d8', 8, 9, 4); R(g, '#a0c8ff', 6, 7, 3, 1);
        tree(g, 13, 3, 2); R(g, '#ffe040', 2, 2, 1, 1); R(g, '#ff4060', 3, 4, 1, 1); R(g, '#ffffff', 14, 14, 1, 1);
      }
    }
  }
  const SPR = {};
  function spr(t, lvl, v, burnt) {
    const key = t + lvl + (v ? 'v' : '') + (burnt ? 'b' : '');
    if (SPR[key]) return SPR[key];
    const z = SIZE[t] * T;
    let cv = mk(z, z, g => paint(g, t, lvl, v, burnt));
    if (v && ZONE[t] && lvl > 0) { const src = cv; cv = mk(z, z, g => { g.translate(z, 0); g.scale(-1, 1); g.drawImage(src, 0, 0); }); }
    return (SPR[key] = cv);
  }
  const TS = {};
  function tileSprites() {
    if (TS.g) return;
    TS.g = [0, 1, 2, 3].map(v => mk(16, 16, g => { R(g, '#48a23a', 0, 0, 16, 16); speck(g, 16, 16, '#3d8f31', 10, v * 7 + 1); speck(g, 16, 16, '#5ab84a', 6, v * 7 + 3); }));
    TS.w = [0, 1].map(v => mk(16, 16, g => { R(g, '#2a5cc8', 0, 0, 16, 16); const r = mulberry(v + 11); for (let k = 0; k < 3; k++) R(g, '#5a8ae8', r() * 12 | 0, r() * 15 | 0, 3, 1); }));
    TS.t = [0, 1, 2].map(v => mk(16, 16, g => { g.drawImage(TS.g[v], 0, 0); const r = mulberry(v + 21); tree(g, 4 + (r() * 2 | 0), 4, 3); tree(g, 11 + (r() * 2 | 0), 5 + (r() * 2 | 0), 3); tree(g, 7 + (r() * 2 | 0), 10, 3); }));
    TS.r = mk(16, 16, g => { R(g, '#8a7a64', 0, 0, 16, 16); speck(g, 16, 16, '#5a5048', 22, 5); speck(g, 16, 16, '#b0a080', 10, 6); R(g, '#3a3028', 3, 9, 7, 2); R(g, '#3a3028', 9, 4, 2, 6); });
    TS.ham = [0, 1].map(f => mk(32, 32, g => {
      disc(g, '#f090a0', 8, 7, 3); disc(g, '#f090a0', 24, 7, 3); disc(g, '#b06a30', 8, 7, 2); disc(g, '#b06a30', 24, 7, 2);
      disc(g, '#2a1a0a', 16, 18, 12); disc(g, '#d08a40', 16, 18, 11); disc(g, '#e8a860', 12, 14, 5);
      disc(g, '#fff0dc', 16, 23, 6); disc(g, '#f0c890', 7, 20, 4); disc(g, '#f0c890', 25, 20, 4);
      R(g, '#000', 11, 13, 2, 3); R(g, '#000', 19, 13, 2, 3); R(g, '#fff', 11, 13, 1, 1); R(g, '#fff', 19, 13, 1, 1);
      R(g, '#e05070', 15, 17, 2, 2); R(g, '#fff', 15, 20, 1, 2); R(g, '#fff', 16, 20, 1, 2);
      R(g, '#404040', 3, 17, 6, 1); R(g, '#404040', 23, 17, 6, 1);
      R(g, '#f090a0', f ? 9 : 11, 28, 4, 2); R(g, '#f090a0', f ? 19 : 17, 28, 4, 2);
    }));
  }

  /* ---------- toolbar icons (10x10 maps) ---------- */
  const IPAL = { k: '#000', w: '#fff', g: '#a0a0a0', d: '#505050', y: '#f0d020', r: '#d02020', G: '#30b030', D: '#106010', b: '#2050c0', B: '#7a4a1a', o: '#f08020', c: '#80d0f0', s: '#e0c090', p: '#f090a0', n: '#48a23a' };
  const ROADI = []; for (let i = 0; i < 10; i++) ROADI.push((i % 4 < 2) ? 'ngddyyddgn' : 'ngddddddgn');
  const ICONS = {
    hand: ['....k....', '...kkk...', '....k....', '.k..k..k.', 'kkkkkkkkk', '.k..k..k.', '....k....', '...kkk...', '....k....'],
    query: ['..kkk.....', '.kcwck....', 'kcwccck...', 'kccccck...', 'kccccck...', '.kccck....', '..kkkBk...', '......BB..', '.......BB.', '........BB'],
    doze: ['..........', '...kkkk...', '...kcck...', '...kyyk...', 'g.kyyyyyk.', 'gkyyyyyyk.', 'gkyyyyyyk.', 'g.kkkkkk..', 'g.kdkdkdk.', '..kkkkkk..'],
    road: ROADI,
    wire: ['k........k', '.k......k.', '..BBBBBB..', '..k.BB.k..', '....BB....', '....BB....', '....BB....', '....BB....', '....BB....', '...BBBB...'],
    R: ['....GG....', '...GGGG...', '..GGGGGG..', '.GGGGGGGG.', 'GGGGGGGGGG', '.wwwwwwww.', '.wcwwwwcw.', '.wwwBBwww.', '.wwwBBwww.', '.kkkkkkkk.'],
    C: ['..........', 'bbbbbbbbbb', 'bwbwbwbwbw', '.gggggggg.', '.gcccgccg.', '.gcccgccg.', '.gggggggg.', '.gccggBBg.', '.gccggBBg.', 'kkkkkkkkkk'],
    I: ['.......dd.', '.......dd.', 'y..y...dd.', 'yy.yy..dd.', 'yyyyyyyyyy', 'yyyyyyyyyy', 'ydydydydyy', 'yyyyyyyyyy', 'yyyyyyyyyy', 'kkkkkkkkkk'],
    coal: ['.gg.......', 'gggg.gg...', '.gg.gggg..', '.dd..gg...', '.dd..dd...', '.dd..dd...', 'BBBBBBBBBB', 'ByBByBByBB', 'BBBBBBBBBB', 'kkkkkkkkkk'],
    sun: ['....y.....', '.y.yyy.y..', '..yyyyy...', '.yyyyyyy..', '..yyyyy...', '.y.yyy.y..', 'bbbbbbbbbb', 'bcbbcbbcbb', 'bbbbbbbbbb', '..k....k..'],
    park: ['...DDDD...', '..DGGGGD..', '.DGGGGGGD.', '.DGGGGGGD.', '.DGGGGGGD.', '..DGGGGD..', '...DDDD...', '....BB....', '....BB....', 'nnnnnnnnnn'],
    police: ['....y.....', '....y.....', '...yyy....', 'yyyyyyyyy.', '.yyybyyy..', '..yyyyy...', '..yy.yy...', '.yy...yy..', '.y.....y..', '..........'],
    firest: ['....r.....', '...rr.....', '...rrr.r..', '..rrrr.rr.', '.rrryrrrr.', '.rryyyrrr.', '.ryyyyyrr.', '.ryywyyyr.', '..ryyyyr..', '...rrrr...'],
    school: ['....rk....', '....k.....', '...rrrr...', '..rrrrrr..', '.rrrrrrrr.', 'rrrrrrrrrr', '.ssssssss.', '.scssssc s', '.sssBBsss.', 'kkkkBBkkkk']
  };
  function iconCanvas(id) {
    const m = ICONS[id];
    return mk(10, 10, g => { const oy = (10 - m.length) >> 1; m.forEach((row, j) => { const ox = (10 - row.length) >> 1; for (let i = 0; i < row.length; i++) { const c = IPAL[row[i]]; if (c) R(g, c, ox + i, oy + j, 1, 1); } }); });
  }

  /* ---------- terrain ---------- */
  function genTerrain(seed) {
    const r = mulberry(hashStr(seed));
    const noise = sc => {
      const gs = Math.ceil(N / sc) + 2, v = new Float32Array(gs * gs); for (let i = 0; i < v.length; i++) v[i] = r();
      return (x, y) => {
        const gx = x / sc, gy = y / sc, x0 = gx | 0, y0 = gy | 0; let fx = gx - x0, fy = gy - y0;
        fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
        const a = v[y0 * gs + x0], b = v[y0 * gs + x0 + 1], c = v[(y0 + 1) * gs + x0], d = v[(y0 + 1) * gs + x0 + 1];
        return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
      };
    };
    const n1 = noise(18), n2 = noise(8), n3 = noise(9), n4 = noise(4);
    const h = new Float32Array(N * N), tr = new Float32Array(N * N), terr = new Uint8Array(N * N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const i = y * N + x, d = Math.hypot(x - N / 2 + 0.5, y - N / 2 + 0.5) / (N * 0.5);
      h[i] = n1(x, y) * 0.65 + n2(x, y) * 0.35 + Math.max(0, 0.5 - d) * 0.35;
      tr[i] = n3(x, y) * 0.7 + n4(x, y) * 0.3;
    }
    const wt = Array.from(h).sort((a, b) => a - b)[Math.floor(N * N * (0.07 + r() * 0.08))];
    for (let i = 0; i < N * N; i++) terr[i] = h[i] < wt ? 1 : 0;
    if (r() < 0.75) {
      const side = r() < 0.5 ? 0 : 1, a0 = side ? Math.PI / 2 : 0;
      let x = side ? N * (0.2 + 0.6 * r()) : 0, y = side ? 0 : N * (0.2 + 0.6 * r()), ang = a0;
      const rad = 1 + r() * 0.8;
      for (let k = 0; k < N * 2; k++) {
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
          const xx = Math.round(x) + dx, yy = Math.round(y) + dy;
          if (xx >= 0 && yy >= 0 && xx < N && yy < N && dx * dx + dy * dy <= rad * rad) terr[yy * N + xx] = 1;
        }
        ang = a0 + clamp(ang - a0 + (r() - 0.5) * 0.5, -0.9, 0.9);
        x += Math.cos(ang); y += Math.sin(ang);
        if (x < -2 || y < -2 || x > N + 1 || y > N + 1) break;
      }
    }
    const land = []; for (let i = 0; i < N * N; i++) if (!terr[i]) land.push(tr[i]);
    land.sort((a, b) => a - b);
    const tt = land[Math.floor(land.length * 0.78)];
    for (let i = 0; i < N * N; i++) if (!terr[i] && tr[i] >= tt) terr[i] = 2;
    return terr;
  }
  function terrPreview(cv, terr) {
    const g = cv.getContext('2d'), id = g.createImageData(N, N), d = id.data;
    for (let i = 0; i < N * N; i++) { const c = terr[i] === 1 ? [40, 88, 200] : terr[i] === 2 ? [30, 100, 30] : [72, 162, 58]; d[i * 4] = c[0]; d[i * 4 + 1] = c[1]; d[i * 4 + 2] = c[2]; d[i * 4 + 3] = 255; }
    g.putImageData(id, 0, 0);
  }

  /* ---------- headlines ---------- */
  function headlines(P) {
    const L = [], a = (w, t) => L.push([w, t]);
    if (!P.zones) a(8, 'Mayor {m} stares at an empty field, sees "potential"');
    if (P.zones && !P.plants) a(9, 'Residents ask: what is this "electricity" everyone keeps talking about?');
    if (P.unpow > 0) { a(6, 'Candle sales soar as some neighborhoods sit in the dark'); a(3, 'Lamp owners demand power lines, promise to stop complaining after'); }
    if (P.noRoad > 0) { a(6, 'Local man walks to work across three fields, calls it "invigorating"'); a(3, 'Homeowners report their driveway leads nowhere. "Very peaceful," says one.'); }
    if (P.short > 0) a(9, 'Brownouts! Power plant working overtime, asks for a friend');
    if (P.avgPol > 28) { a(6, 'Pigeons file formal complaint about the air'); a(4, 'Laundry hung outside comes back gray; residents call it "smoky chic"'); }
    if (P.avgCrime > 22) { a(6, 'Garden gnome thefts reach record high'); a(4, 'Suspicious raccoon spotted near the bank; police stretched thin'); }
    if (P.police && P.avgCrime < 6 && P.rP > 800) a(4, 'Police chief so bored she has taken up competitive knitting');
    if (P.tax >= 12) a(7, 'Citizens hold bake sale to protest taxes; bake sale gets taxed');
    if (P.tax <= 3) a(5, 'Tax cut popular with everyone except the pothole repair crew');
    if (P.dR > 0.4 && P.zones) a(6, 'Housing shortage! Families spotted living in very large cardboard boxes');
    if (P.dC > 0.4 && P.rP > 100) a(5, 'Residents drive two towns over to buy socks. Shop owners take note.');
    if (P.dI > 0.4 && P.rP > 100) a(5, 'Job seekers line up with their own hard hats, just in case');
    if (P.dR < -0.3) a(6, 'Jobs scarce in {c}; local cat still has steady work catching mice');
    if (P.dC < -0.3) a(4, 'Shopkeepers wave at the same three customers again');
    if (P.rP > 1500 && !P.school) a(6, 'Kids demand a school, immediately regret it');
    if (P.school) a(2, 'School spelling bee won with the word "municipality"');
    if (P.park >= 3) a(3, 'New park voted "Best Place to Sit" for the third year running');
    if (P.rP > 2000 && !P.park) a(4, 'Residents petition for a park; current best tree is a lamp post');
    if (P.rP > 1500 && !P.fireSt) a(5, 'Town fire brigade is currently one bucket and a very brave dog');
    if (P.coal >= 2) a(4, 'Coal plant smoke rings impress some, alarm others');
    if (P.sun) a(3, 'Sun Farm workers report the sun is still shining. Output excellent.');
    if (P.funds < 2000) a(6, 'Town treasury now consists mostly of buttons and lint');
    if (P.funds > 60000) a(3, 'Mayor {m} seen diving into a pile of coins; officials say "please stop"');
    if (P.rP >= 10000) a(3, 'Traffic report: a duck crossed Main Street. All lanes open again.');
    [
      'Weather: sunny with a chance of zoning',
      'Local pumpkin weighs as much as a small car, refuses to comment',
      'Town council debates official town bird for ninth straight hour',
      'Mayor {m} spotted squinting at a map again',
      'Library reports record number of overdue books about bridges',
      'Scientists confirm {c} has "quite a lot of ground"',
      'Ice cream truck jingle voted catchiest song of the year',
      'Dog named honorary dogcatcher; nobody sure how that works',
      'Survey: 9 out of 10 residents like living in {c}. The tenth was a cat.',
      'Bus timetable finally printed; bus still being built',
      'Bakery unveils the "Mayor Muffin", tastes mostly of paperwork',
      'Council approves one new lamp post, holds ribbon-cutting for it',
      'Mystery of the missing traffic cone solved: it was in the pond',
      'Yodeling contest ends in a tie; both finalists still yodeling',
      'Kite festival postponed due to too much wind, then due to no wind',
      'Man trains parrot to say "{c}"; parrot prefers "cracker"'
    ].forEach(t => a(1, t));
    return L;
  }

  /* ---------- the app ---------- */
  (window.RETRO_APPS = window.RETRO_APPS || []).push({
    id: 'tinytown',
    label: 'Tiny Town',
    kind: 'store',
    cat: 'game',
    year: 2000,
    price: 39.95,
    sizeKB: 12000,
    publisher: 'Brickwork Pixel Co.',
    genre: 'City builder',
    tagline: 'Zone it. Power it. Watch it grow.',
    blurb: 'Be the mayor of your very own town! Lay roads, zone homes, shops and factories, keep the lights on and the taxes fair, and grow a sleepy village into a bustling Capital. Features fires, floods, a daily newspaper and at least one Giant Hamster.',
    box: { bg: '#1f6f3f', fg: '#ffffff', accent: '#f0d020' },
    icon: '<svg viewBox="0 0 32 32" shape-rendering="crispEdges" aria-hidden="true"><rect x="0" y="22" width="32" height="10" fill="#48a23a"/><rect x="0" y="26" width="32" height="3" fill="#4a4a4a"/><rect x="2" y="27" width="4" height="1" fill="#f0d020"/><rect x="12" y="27" width="4" height="1" fill="#f0d020"/><rect x="22" y="27" width="4" height="1" fill="#f0d020"/><rect x="3" y="14" width="9" height="8" fill="#ece0c4" stroke="#000"/><path d="M2 14h11l-5.5-6z" fill="#c83828" stroke="#000"/><rect x="6" y="18" width="3" height="4" fill="#6a4020"/><rect x="15" y="4" width="8" height="18" fill="#5c94d4" stroke="#000"/><g fill="#d8f4ff"><rect x="17" y="6" width="2" height="2"/><rect x="20" y="6" width="2" height="2"/><rect x="17" y="10" width="2" height="2"/><rect x="20" y="10" width="2" height="2"/><rect x="17" y="14" width="2" height="2"/><rect x="20" y="14" width="2" height="2"/></g><rect x="25" y="12" width="5" height="10" fill="#f0d020" stroke="#000"/><rect x="27" y="7" width="2" height="5" fill="#8a8a8a"/></svg>',
    window: { w: 720, h: 560 },
    css: `
      .tt{position:relative;display:flex;flex-direction:column;height:100%;font:12px var(--ui);user-select:none;-webkit-user-select:none}
      .tt-tools{display:flex;flex-wrap:wrap;gap:2px;padding:2px 2px 3px;flex:none}
      .tt .tt-tb.btn,.tt .tt-tb.btn:active{min-width:0;width:30px;height:28px;padding:0;display:flex;align-items:center;justify-content:center}
      .tt .tt-tb.btn.down{background:#dcdcdc;border-color:#000 #fff #fff #000;box-shadow:inset 1px 1px var(--dk)}
      .tt-tb canvas{width:20px;height:20px;image-rendering:pixelated;pointer-events:none}
      .tt .tt-tb.tt-lock canvas{opacity:.3}
      .tt-info{display:flex;flex-wrap:wrap;align-items:center;gap:3px;padding:0 2px 3px;flex:none}
      .tt-fld{background:#fff;padding:0 5px;white-space:nowrap;line-height:20px;height:24px;box-sizing:border-box}
      .tt-fld.tt-neg{color:#c00000;font-weight:bold}
      .tt-rci{width:48px;height:30px;background:#000;image-rendering:pixelated;box-sizing:border-box}
      .tt-sp{display:flex;gap:1px}
      .tt .tt-sb.btn,.tt .tt-sb.btn:active{min-width:0;padding:0 5px;font:bold 11px var(--ui);height:24px}
      .tt .tt-sb.btn.down{background:#dcdcdc}
      .tt .tt-bud.btn{min-width:0;padding:0 8px;height:24px}
      .tt-map{position:relative;flex:1;min-height:150px;overflow:hidden;background:#10204a}
      .tt-cv{position:absolute;left:0;top:0;width:100%;height:100%;touch-action:none;image-rendering:pixelated;cursor:crosshair}
      .tt-cv.tt-grab{cursor:grab}
      .tt-mini{position:absolute;right:4px;top:4px;padding:2px;line-height:0}
      .tt-mini canvas{width:120px;height:120px;image-rendering:pixelated;touch-action:none;cursor:pointer}
      .tt-mini i{position:absolute;border:1px solid #fff;outline:1px solid #000;pointer-events:none;box-sizing:border-box}
      .tt-zoom{position:absolute;right:4px;bottom:4px;display:flex;flex-direction:column;gap:2px}
      .tt .tt-zoom .btn,.tt .tt-zoom .btn:active{min-width:0;width:30px;height:28px;padding:0;font:bold 16px var(--ui)}
      .tt-status{position:absolute;left:4px;bottom:4px;max-width:calc(100% - 50px);background:#ffffe1;border:1px solid #000;padding:1px 5px;font-size:11px;pointer-events:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .tt-news{flex:none;display:flex;align-items:center;height:22px;margin-top:3px;background:#fffbe8;overflow:hidden;box-sizing:border-box}
      .tt-news b{flex:none;background:#000;color:#fffbe8;font:bold 11px Georgia,'Times New Roman',serif;padding:0 6px;line-height:16px;margin:0 4px 0 1px;letter-spacing:1px}
      .tt-tk{position:relative;flex:1;height:100%;overflow:hidden}
      .tt-tk span{position:absolute;left:100%;top:1px;white-space:nowrap;font:italic 13px Georgia,'Times New Roman',serif;color:#201000;will-change:transform}
      @keyframes tt-scroll{from{transform:translateX(0)}to{transform:translateX(calc(-1 * var(--tt-d, 2000px)))}}
      .tt-layer{position:absolute;inset:0;pointer-events:none;z-index:6}
      .tt-veil{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.3);pointer-events:auto;padding:6px;box-sizing:border-box}
      .tt-dlg{width:100%;max-width:390px;max-height:100%;overflow:auto;padding:3px;box-sizing:border-box}
      .tt-dh{display:flex;align-items:center;background:var(--navy,#000080);color:#fff;font-weight:bold;padding:2px 3px 2px 5px;margin-bottom:6px}
      .tt-dh span{flex:1}
      .tt .tt-dx.btn,.tt .tt-dx.btn:active{min-width:0;width:18px;height:16px;padding:0;font:bold 11px var(--ui);line-height:10px}
      .tt-dc{padding:0 6px 6px}
      .tt-dc p{margin:0 0 8px;line-height:1.4}
      .tt-l{display:block;margin:0 0 6px}
      .tt-in{font:12px var(--ui);padding:2px 3px;border:2px solid;border-color:#808080 #fff #fff #808080;background:#fff;max-width:100%;box-sizing:border-box}
      .tt-seed{width:90px}
      .tt-bts{display:flex;justify-content:flex-end;gap:6px;margin-top:8px;flex-wrap:wrap}
      .tt-prev{display:flex;gap:10px;align-items:flex-start;flex-wrap:wrap}
      .tt-prev canvas{width:112px;height:112px;image-rendering:pixelated;flex:none}
      .tt-r{display:block;margin-bottom:2px}
      .tt-tab{width:100%;border-collapse:collapse;margin:4px 0;background:#fff}
      .tt-tab th,.tt-tab td{padding:1px 4px;text-align:right;border-bottom:1px solid #ddd;white-space:nowrap}
      .tt-tab th:first-child,.tt-tab td:first-child{text-align:left}
      .tt-tab tr.tt-tot td{font-weight:bold;border-top:1px solid #000}
      .tt-range{width:100%}
      .tt-slot{background:#fff;padding:4px 6px;margin-bottom:5px}
      .tt-slot div{display:flex;gap:4px;margin-top:4px;flex-wrap:wrap}
      .tt .tt-sm.btn{min-width:0;padding:2px 8px}
      .tt .tt-sm.btn:active{padding:3px 7px 1px 9px}
      .tt-hint{color:#404040;font-size:11px;margin-bottom:4px}
      .tt-q{position:absolute;left:4px;top:4px;width:220px;max-width:calc(100% - 8px);padding:3px;z-index:3;font-size:11px;box-sizing:border-box}
      .tt-q .tt-dh{margin-bottom:3px}
      .tt-q table{width:100%;border-collapse:collapse;background:#fff}
      .tt-q td{padding:0 4px}
      .tt-q td+td{text-align:right}
      .tt-q p{margin:3px 2px 0;color:#303030}
      .tt-ban{position:absolute;left:50%;top:10%;transform:translateX(-50%);width:max-content;max-width:88%;padding:8px 14px;text-align:center;z-index:4;box-sizing:border-box}
      .tt-ban h3{margin:0 0 4px;font:bold 18px Georgia,'Times New Roman',serif;color:#800000}
      .tt-ban p{margin:0 0 6px}
    `,
    open(W, api) {
      tileSprites();
      W.body.innerHTML = `<div class="tt">
        <div class="tt-tools" role="toolbar" aria-label="Tools"></div>
        <div class="tt-info">
          <span class="tt-fld sunken" data-f="date"></span>
          <span class="tt-fld sunken" data-f="funds"></span>
          <span class="tt-fld sunken" data-f="pop"></span>
          <canvas class="tt-rci sunken" width="44" height="26" title="Demand: Residential, Commercial, Industrial"></canvas>
          <span class="tt-sp">${SPEED_NAMES.map((n, i) => `<button class="btn tt-sb" data-sp="${i}" title="${n} (${i})">${['II', '&gt;', '&gt;&gt;', '&gt;&gt;&gt;'][i]}</button>`).join('')}</span>
          <button class="btn tt-bud" data-bud>Budget</button>
        </div>
        <div class="tt-map sunken">
          <canvas class="tt-cv"></canvas>
          <div class="tt-mini raised"><canvas width="${N}" height="${N}" aria-label="Mini-map"></canvas><i></i></div>
          <div class="tt-zoom"><button class="btn" data-z="1" aria-label="Zoom in">+</button><button class="btn" data-z="-1" aria-label="Zoom out">-</button></div>
          <div class="tt-status"></div>
        </div>
        <div class="tt-news sunken"><b>TINY TIMES</b><div class="tt-tk"><span></span></div></div>
        <div class="tt-layer"></div>
      </div>`;
      const $ = s => W.body.querySelector(s);
      const root = $('.tt'), mapEl = $('.tt-map'), cv = $('.tt-cv'), g = cv.getContext('2d');
      const miniWrap = $('.tt-mini'), mini = miniWrap.querySelector('canvas'), mg = mini.getContext('2d'), vbox = miniWrap.querySelector('i');
      const layer = $('.tt-layer'), statusEl = $('.tt-status'), tk = $('.tt-tk'), tkSpan = tk.querySelector('span');
      const rci = $('.tt-rci'), rg = rci.getContext('2d');
      const bg = document.createElement('canvas'); bg.width = bg.height = N * T; const bgc = bg.getContext('2d');
      const F = {}; W.body.querySelectorAll('[data-f]').forEach(e => F[e.dataset.f] = e);

      let prefs = { snd: true, mini: true, dis: false };
      try { prefs = Object.assign(prefs, api.load('prefs', {}) || {}); } catch (e) { /* keep defaults */ }
      const snd = {
        click: () => prefs.snd && api.sfx.click(),
        road: () => prefs.snd && api.tone(170 + Math.random() * 40, 0.03, { type: 'square', vol: 0.04 }),
        doze: () => prefs.snd && api.noise(0.12, { vol: 0.07, f: 600 }),
        build: () => { if (!prefs.snd) return; api.tone(392, 0.06, { type: 'square', vol: 0.05 }); api.tone(523, 0.08, { type: 'square', vol: 0.05, at: 0.07 }); },
        bad: () => prefs.snd && api.tone(110, 0.14, { type: 'square', vol: 0.05 }),
        fire: () => prefs.snd && api.noise(0.5, { vol: 0.06, f: 1200 }),
        boom: () => prefs.snd && api.sfx.boom(),
        tada: () => prefs.snd && api.sfx.tada(),
        cash: () => { if (!prefs.snd) return; api.tone(1320, 0.05, { vol: 0.05 }); api.tone(1760, 0.08, { vol: 0.05, at: 0.06 }); },
        squeak: () => prefs.snd && api.tone(1800, 0.12, { type: 'sine', vol: 0.06, to: 2600 }),
        query: () => prefs.snd && api.sfx.blip(880)
      };

      /* ----- state ----- */
      let c = null, terr, tile, sid, S, flood = new Uint8Array(N * N);
      const pol = new Float32Array(N * N), crime = new Float32Array(N * N), lv = new Float32Array(N * N), pc = new Float32Array(N * N),
        fc = new Float32Array(N * N), sc = new Float32Array(N * N), pk = new Float32Array(N * N), cr = new Float32Array(N * N),
        wB = new Float32Array(N * N), nature = new Float32Array(N * N), center = new Float32Array(N * N), pwT = new Uint8Array(N * N);
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) center[y * N + x] = 8 * Math.max(0, 1 - Math.hypot(x - N / 2, y - N / 2) / (N * 0.6));
      let st = { rP: 0, cJ: 0, iJ: 0, zones: 0, plants: 0, unpow: 0, noRoad: 0, short: 0, coal: 0, sun: 0, police: 0, fireSt: 0, school: 0, park: 0, avgPol: 0, avgCrime: 0, dR: 0, dC: 0, dI: 0, tax: 7, funds: 0 };
      let speed = 2, timer = 0, raf = 0, alive = true, dlgPause = false, minPaused = false, minSpeed = 2;
      let ts = 16, dpr = 1, cam = { x: 0, y: 0 }, cw = 1, ch = 1;
      let tool = 'hand', overlay = 'none', hover = null, lastDraw = 0, lastT = 0, dirty = true, miniDirty = true, natDirty = true;
      let hamster = null, parts = [], bursts = [], nFire = 0, flashT = 0, flashTimer = 0, dlgOpen = null, qPanel = null, banner = null, bannerTimer = 0;
      let newsQ = [], recent = [];
      const zeroYr = () => ({ tax: 0, other: 0, roads: 0, power: 0, police: 0, fire: 0, school: 0, park: 0 });

      /* ----- toolbar ----- */
      const toolsEl = $('.tt-tools');
      TOOLS.forEach(t => {
        const b = document.createElement('button');
        b.className = 'btn tt-tb'; b.dataset.t = t.id;
        b.title = `${t.name} (${t.key.toUpperCase()})${t.cost ? ' - ' + money(t.cost) : ''}`;
        b.setAttribute('aria-label', t.name);
        b.appendChild(iconCanvas(t.id));
        toolsEl.appendChild(b);
      });
      toolsEl.addEventListener('click', e => { const b = e.target.closest('[data-t]'); if (b) { snd.click(); setTool(b.dataset.t); } });
      $('.tt-sp').addEventListener('click', e => { const b = e.target.closest('[data-sp]'); if (b) { snd.click(); setSpeed(+b.dataset.sp); } });
      $('[data-bud]').onclick = () => { snd.click(); budgetDlg(); };
      $('.tt-zoom').addEventListener('click', e => { const b = e.target.closest('[data-z]'); if (b) { snd.click(); zoomStep(+b.dataset.z); } });

      /* ----- menus ----- */
      const chk = (on, label) => (on ? '✓ ' : '    ') + label;
      const OVERLAYS = [['none', 'Normal view'], ['power', 'Power grid'], ['pol', 'Pollution'], ['crime', 'Crime'], ['lv', 'Land value'], ['police', 'Police coverage'], ['firec', 'Fire coverage'], ['school', 'School coverage']];
      api.menubar([
        { label: 'Game', items: () => [
          { label: 'New city...', fn: () => newCityDlg(false) },
          { label: 'Open or save city...', fn: filesDlg },
          { label: 'Save city', fn: () => { if (c) saveCity(false); }, disabled: !c || c.over },
          '-',
          { label: 'How to play', fn: help },
          { label: 'Exit', fn: () => api.close() }
        ] },
        { label: 'City', items: () => [
          { label: 'Budget...', fn: budgetDlg },
          { label: 'City report...', fn: reportDlg },
          '-',
          ...SPEED_NAMES.map((n, i) => ({ label: chk(speed === i, 'Speed: ' + n), fn: () => setSpeed(i) }))
        ] },
        { label: 'View', items: () => [
          ...OVERLAYS.map(([k, n]) => ({ label: chk(overlay === k, n), fn: () => { overlay = k; refreshStatus(); need(); } })),
          '-',
          { label: chk(prefs.mini, 'Mini-map'), fn: () => { prefs.mini = !prefs.mini; savePrefs(); applyMini(); } },
          { label: 'Zoom in', fn: () => zoomStep(1) },
          { label: 'Zoom out', fn: () => zoomStep(-1) }
        ] },
        { label: 'Options', items: () => [
          { label: chk(prefs.dis, 'Disasters'), fn: () => { prefs.dis = !prefs.dis; savePrefs(); flash(prefs.dis ? 'Disasters are ON. Brace yourself (and your hamster feeder).' : 'Disasters are OFF. Fires can still start on their own.'); } },
          { label: chk(prefs.snd, 'Sound effects'), fn: () => { prefs.snd = !prefs.snd; savePrefs(); } },
          '-',
          { label: 'Summon: Fire', fn: () => disaster('fire'), disabled: !c || c.over },
          { label: 'Summon: Flood', fn: () => disaster('flood'), disabled: !c || c.over },
          { label: 'Summon: Giant Hamster', fn: () => disaster('hamster'), disabled: !c || c.over }
        ] }
      ]);
      function savePrefs() { try { api.save('prefs', prefs); } catch (e) { /* ignore */ } }
      function help() {
        api.msgBox('How to play Tiny Town', 'You are the mayor. Build a place people want to live in!\n\n' +
          '1. Build a Coal Power Plant (a clean Sun Farm unlocks at Town size or in 1975).\n' +
          '2. Draw Roads, then place Residential (R), Commercial (C) and Industrial (I) zones next to them. Zones are 3x3.\n' +
          '3. Connect zones to the plant with Power Lines. Buildings that touch pass power along.\n' +
          '4. The R C I bars show what people want. Residents need jobs (C and I). Shops need residents.\n' +
          '5. Parks, water and schools raise land value so buildings grow taller. Pollution and crime lower it.\n' +
          '6. Police stations cut crime. Fire stations stop fires.\n' +
          '7. Taxes pay the upkeep. Use Budget to set the rate. Stay in debt for a whole year and the council takes over.\n\n' +
          'Milestones: Village 500, Town 2,000, City 10,000, Capital 50,000.\n\n' +
          'Controls: drag with the Hand (or right-drag, or arrow keys) to move. Wheel or +/- to zoom. Space pauses, 0-3 set the speed. Tool keys: H Q B D L R C I P U K E F S. Use Query (or tap with the Hand) to see why a zone is not growing.');
      }

      /* ----- save / load ----- */
      const enc = a => { let s = ''; for (let i = 0; i < a.length; i++) s += String.fromCharCode(48 + a[i]); return s; };
      const dec = s => { const a = new Uint8Array(N * N); for (let i = 0; i < a.length; i++) a[i] = Math.max(0, (s.charCodeAt(i) || 48) - 48); return a; };
      function pack() {
        return { v: 1, name: c.name, seed: c.seed, diff: c.diff, m: c.m, funds: Math.round(c.funds), tax: c.tax, ms: c.ms, earned: c.earned, brokeM: c.brokeM, warned: c.warned,
          over: c.over, yr: c.yr, last: c.last, sunSaid: c.sunSaid, pop: st.rP, cam: { x: cam.x, y: cam.y, ts }, terr: enc(terr), tile: enc(tile),
          S: [...S.values()].map(s => [s.t, s.x, s.y, s.lvl, s.burnt ? 1 : 0]) };
      }
      function readSlot(n) { try { const d = api.load('slot' + n, null); return d && d.v === 1 && d.terr ? d : null; } catch (e) { return null; } }
      function saveCity(quiet) {
        if (!c || c.temp) return;
        try { api.save('slot' + c.slot, pack()); api.save('last', c.slot); } catch (e) { if (!quiet) flash('Could not save: the disk is full.'); return; }
        if (!quiet) { flash(`Saved "${c.name}" to slot ${c.slot}.`); api.sfx.floppy && prefs.snd && api.sfx.floppy(); }
      }
      function loadSlot(n) {
        const d = readSlot(n); if (!d) return false;
        c = { name: d.name, seed: d.seed, slot: n, diff: d.diff || 1, m: d.m || 0, funds: d.funds, tax: d.tax ?? 7, ms: d.ms || 0, earned: d.earned || 0, brokeM: d.brokeM || 0, warned: !!d.warned,
          over: !!d.over, yr: d.yr || zeroYr(), last: d.last || null, sunSaid: !!d.sunSaid, nid: 1 };
        setup(dec(d.terr), dec(d.tile), d.S || []);
        if (d.cam && ZOOMS.includes(d.cam.ts)) { ts = d.cam.ts; cam.x = d.cam.x; cam.y = d.cam.y; clampCam(); }
        try { api.save('last', n); } catch (e) { /* ignore */ }
        newsQ = [`Welcome back to ${c.name}, Mayor ${api.user}!`];
        tickNext();
        if (c.over) setTimeout(gameOverDlg, 50);
        return true;
      }
      function newCity(o) {
        c = { name: o.name, seed: o.seed, slot: o.slot, diff: o.diff, m: 0, funds: DIFF[o.diff][1], tax: 7, ms: 0, earned: 0, brokeM: 0, warned: false, over: false, yr: zeroYr(), last: null, sunSaid: false, nid: 1 };
        setup(genTerrain(o.seed), new Uint8Array(N * N), []);
        ts = cw < 480 ? 12 : 16; cam.x = N / 2 - cw / ts / 2; cam.y = N / 2 - ch / ts / 2; clampCam();
        hamster = null; parts = []; bursts = [];
        newsQ = [`Welcome to ${o.name}! Population: one mayor, one map, and a dream.`, 'Tip from the Tiny Times: start with a power plant, some roads and a few zones.'];
        tickNext();
      }
      function setup(terrA, tileA, list) {
        terr = terrA; tile = tileA; sid = new Int32Array(N * N).fill(-1); S = new Map(); flood = new Uint8Array(N * N); nFire = 0;
        hamster = null;
        for (const e of list) if (SIZE[e[0]]) addStruct(e[0], e[1], e[2], e[3] || 0, e[4]);
        calcWater(); natDirty = true; calcNature();
        simPower(); simRoads(); simMaps(); stats();
        fullRedraw(); miniDirty = true;
        api.setTitle('Tiny Town - ' + c.name);
        closeQuery(); hud(); refreshStatus(); need();
        if (!c.over && speed === 0) setSpeed(2); else schedule();
      }

      /* ----- structures ----- */
      function addStruct(t, x, y, lvl, burnt) {
        const s = { id: c.nid++, t, x, y, z: SIZE[t], lvl: lvl || 0, burnt: !!burnt, pw: false, rd: false, fire: 0, fl: 0 };
        S.set(s.id, s);
        for (let dy = 0; dy < s.z; dy++) for (let dx = 0; dx < s.z; dx++) { const i = (y + dy) * N + x + dx; tile[i] = 4; sid[i] = s.id; if (terr[i] !== 1) terr[i] = 0; }
        return s;
      }
      function removeStruct(s, rubble) {
        S.delete(s.id); if (s.fire) nFire = Math.max(0, nFire - 1);
        for (let dy = 0; dy < s.z; dy++) for (let dx = 0; dx < s.z; dx++) { const i = (s.y + dy) * N + s.x + dx; tile[i] = 0; sid[i] = -1; terr[i] = rubble ? 3 : 0; }
        redrawRect(s.x - 1, s.y - 1, s.x + s.z, s.y + s.z);
      }
      const ci = s => (s.y + (s.z >> 1)) * N + s.x + (s.z >> 1);
      const structAt = (x, y) => (x < 0 || y < 0 || x >= N || y >= N || tile[y * N + x] !== 4) ? null : S.get(sid[y * N + x]);
      const isRoad = (x, y) => x >= 0 && y >= 0 && x < N && y < N && (tile[y * N + x] === 1 || tile[y * N + x] === 3);
      const cond = (x, y) => x >= 0 && y >= 0 && x < N && y < N && tile[y * N + x] >= 2;
      function hasRoad(s) { for (let k = 0; k < s.z; k++) if (isRoad(s.x + k, s.y - 1) || isRoad(s.x + k, s.y + s.z) || isRoad(s.x - 1, s.y + k) || isRoad(s.x + s.z, s.y + k)) return true; return false; }
      function neighborsOf(s) {
        const out = new Set();
        for (let k = -1; k <= s.z; k++) [[s.x + k, s.y - 1], [s.x + k, s.y + s.z], [s.x - 1, s.y + k], [s.x + s.z, s.y + k]].forEach(([x, y]) => { const o = structAt(x, y); if (o && o !== s) out.add(o); });
        return [...out];
      }

      /* ----- background buffer drawing ----- */
      function drawTile(x, y) {
        if (x < 0 || y < 0 || x >= N || y >= N) return;
        const i = y * N + x, k = tile[i]; if (k === 4) return;
        const px = x * T, py = y * T, t = terr[i], h = hash2(x, y);
        const wat = (xx, yy) => xx >= 0 && yy >= 0 && xx < N && yy < N && terr[yy * N + xx] === 1;
        if (t === 1) {
          bgc.drawImage(TS.w[h & 1], px, py);
          if (y > 0 && !wat(x, y - 1)) R(bgc, '#7aa4f0', px, py, 16, 1);
          if (y < N - 1 && !wat(x, y + 1)) R(bgc, '#7aa4f0', px, py + 15, 16, 1);
          if (x > 0 && !wat(x - 1, y)) R(bgc, '#7aa4f0', px, py, 1, 16);
          if (x < N - 1 && !wat(x + 1, y)) R(bgc, '#7aa4f0', px + 15, py, 1, 16);
        } else {
          bgc.drawImage(t === 2 && !k ? TS.t[h % 3] : t === 3 && !k ? TS.r : TS.g[h & 3], px, py);
          if (wat(x, y - 1)) R(bgc, '#d8c880', px, py, 16, 2);
          if (wat(x, y + 1)) R(bgc, '#d8c880', px, py + 14, 16, 2);
          if (wat(x - 1, y)) R(bgc, '#d8c880', px, py, 2, 16);
          if (wat(x + 1, y)) R(bgc, '#d8c880', px + 14, py, 2, 16);
        }
        if (k === 1 || k === 3) drawRoad(x, y, px, py, t === 1);
        if (k === 2 || k === 3) drawWire(x, y, px, py, k === 3, t === 1);
      }
      function drawRoad(x, y, px, py, bridge) {
        const m = (isRoad(x, y - 1) ? 1 : 0) | (isRoad(x + 1, y) ? 2 : 0) | (isRoad(x, y + 1) ? 4 : 0) | (isRoad(x - 1, y) ? 8 : 0);
        const curb = bridge ? '#8a6a3a' : '#9a9a9a', asph = bridge ? '#5a5048' : '#4a4a4a', gg = bgc;
        R(gg, curb, px + 2, py + 2, 12, 12);
        if (m & 1) R(gg, curb, px + 2, py, 12, 2); if (m & 2) R(gg, curb, px + 14, py + 2, 2, 12);
        if (m & 4) R(gg, curb, px + 2, py + 14, 12, 2); if (m & 8) R(gg, curb, px, py + 2, 2, 12);
        R(gg, asph, px + 3, py + 3, 10, 10);
        if (m & 1) R(gg, asph, px + 3, py, 10, 3); if (m & 2) R(gg, asph, px + 13, py + 3, 3, 10);
        if (m & 4) R(gg, asph, px + 3, py + 13, 10, 3); if (m & 8) R(gg, asph, px, py + 3, 3, 10);
        const Y = '#e8c838';
        if (m === 1 || m === 4 || m === 5) { R(gg, Y, px + 7, py + 1, 2, 4); R(gg, Y, px + 7, py + 9, 2, 4); }
        else if (m === 2 || m === 8 || m === 10) { R(gg, Y, px + 1, py + 7, 4, 2); R(gg, Y, px + 9, py + 7, 4, 2); }
        else if (m === 15) { for (let k = 4; k < 12; k += 2) { R(gg, '#e0e0e0', px + k, py + 1, 1, 2); R(gg, '#e0e0e0', px + k, py + 13, 1, 2); } }
      }
      function drawWire(x, y, px, py, onRoad, water) {
        const m = (cond(x, y - 1) ? 1 : 0) | (cond(x + 1, y) ? 2 : 0) | (cond(x, y + 1) ? 4 : 0) | (cond(x - 1, y) ? 8 : 0);
        const W1 = '#202020', gg = bgc;
        if (m & 1) { R(gg, W1, px + 6, py, 1, 7); R(gg, W1, px + 9, py, 1, 7); }
        if (m & 4) { R(gg, W1, px + 6, py + 7, 1, 9); R(gg, W1, px + 9, py + 7, 1, 9); }
        if (m & 2) { R(gg, W1, px + 8, py + 5, 8, 1); R(gg, W1, px + 8, py + 8, 8, 1); }
        if (m & 8) { R(gg, W1, px, py + 5, 8, 1); R(gg, W1, px, py + 8, 8, 1); }
        if (water) R(gg, '#3a2a1a', px + 6, py + 12, 4, 2);
        R(gg, 'rgba(0,0,0,0.35)', px + 9, py + 7, 2, 7);
        R(gg, '#7a4a24', px + 7, py + 4, 2, 9); R(gg, '#7a4a24', px + 5, py + 4, 6, 2); R(gg, '#c8c8c8', px + 5, py + 4, 1, 1); R(gg, '#c8c8c8', px + 10, py + 4, 1, 1);
        if (onRoad) R(gg, '#9a6a3a', px + 7, py + 4, 1, 9);
      }
      function drawStruct(s) {
        bgc.drawImage(spr(s.t, s.lvl, s.id % 2, s.burnt && s.lvl === 0), s.x * T, s.y * T);
        miniDirty = true; need();
      }
      function redrawRect(x0, y0, x1, y1) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) drawTile(x, y); miniDirty = true; need(); }
      function fullRedraw() { for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) drawTile(x, y); for (const s of S.values()) drawStruct(s); }

      /* ----- simulation ----- */
      function calcWater() {
        const d = new Uint8Array(N * N).fill(255), q = [];
        for (let i = 0; i < N * N; i++) if (terr[i] === 1) { d[i] = 0; q.push(i); }
        for (let h = 0; h < q.length; h++) {
          const i = q[h], x = i % N, y = (i / N) | 0; if (d[i] >= 6) continue;
          [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]].forEach(([xx, yy]) => { if (xx >= 0 && yy >= 0 && xx < N && yy < N) { const j = yy * N + xx; if (d[j] === 255) { d[j] = d[i] + 1; q.push(j); } } });
        }
        for (let i = 0; i < N * N; i++) wB[i] = d[i] <= 6 && d[i] > 0 ? (7 - d[i]) * 3 : 0;
      }
      function calcNature() {
        if (!natDirty) return; natDirty = false;
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          let n = 0;
          for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < N && yy < N && terr[yy * N + xx] === 2) n++; }
          nature[y * N + x] = Math.min(10, n * 1.5);
        }
      }
      function simPower() {
        pwT.fill(0); for (const s of S.values()) s.pw = false;
        const seen = new Uint8Array(N * N); let short = 0;
        for (const p of S.values()) {
          if (!CAP[p.t] || seen[p.y * N + p.x]) continue;
          const q = [p.y * N + p.x]; seen[q[0]] = 1;
          const found = [], fs = new Set(); let cap = 0;
          for (let h = 0; h < q.length; h++) {
            const i = q[h]; pwT[i] = 1;
            if (tile[i] === 4) { const s = S.get(sid[i]); if (!fs.has(s)) { fs.add(s); if (CAP[s.t]) { if (!s.fire) cap += CAP[s.t]; s.pw = true; } else if (s.t !== 'park') found.push(s); } }
            const x = i % N, y = (i / N) | 0;
            if (x > 0 && !seen[i - 1] && tile[i - 1] >= 2) { seen[i - 1] = 1; q.push(i - 1); }
            if (x < N - 1 && !seen[i + 1] && tile[i + 1] >= 2) { seen[i + 1] = 1; q.push(i + 1); }
            if (y > 0 && !seen[i - N] && tile[i - N] >= 2) { seen[i - N] = 1; q.push(i - N); }
            if (y < N - 1 && !seen[i + N] && tile[i + N] >= 2) { seen[i + N] = 1; q.push(i + N); }
          }
          let n = 0; for (const s of found) { if (n < cap) { s.pw = true; n++; } else short++; }
        }
        st.short = short;
      }
      function simRoads() { for (const s of S.values()) s.rd = hasRoad(s); }
      function rad(arr, s, amt, r) {
        const cx = s.x + s.z / 2, cy = s.y + s.z / 2;
        const xa = Math.max(0, Math.floor(cx - r)), xb = Math.min(N - 1, Math.ceil(cx + r)), ya = Math.max(0, Math.floor(cy - r)), yb = Math.min(N - 1, Math.ceil(cy + r));
        for (let y = ya; y <= yb; y++) for (let x = xa; x <= xb; x++) { const dx = x + 0.5 - cx, dy = y + 0.5 - cy, d = Math.sqrt(dx * dx + dy * dy); if (d < r) arr[y * N + x] += amt * (1 - d / r); }
      }
      function simMaps() {
        pol.fill(0); cr.fill(0); pc.fill(0); fc.fill(0); sc.fill(0); pk.fill(0);
        for (const s of S.values()) {
          const L = s.lvl;
          switch (s.t) {
            case 'R': if (L) rad(cr, s, L * 4, 6); break;
            case 'C': if (L) { rad(cr, s, L * 6, 6); rad(pol, s, L * 4, 4); } break;
            case 'I': if (L) { rad(pol, s, L * 18, 7); rad(cr, s, L * 3, 6); } break;
            case 'coal': rad(pol, s, 100, 11); break;
            case 'police': if (s.pw) rad(pc, s, 100, 14); break;
            case 'firest': if (s.pw) rad(fc, s, 100, 14); break;
            case 'school': if (s.pw) rad(sc, s, 25, 13); break;
            case 'park': rad(pk, s, 22, 5); break;
          }
        }
        for (let i = 0; i < N * N; i++) {
          pol[i] = Math.min(100, pol[i]); pc[i] = Math.min(100, pc[i]); fc[i] = Math.min(100, fc[i]); sc[i] = Math.min(20, sc[i]);
          crime[i] = clamp(cr[i] - pc[i], 0, 100);
          lv[i] = terr[i] === 1 ? 0 : clamp(38 + wB[i] + nature[i] + center[i] + Math.min(30, pk[i]) + sc[i] - pol[i] * 0.6 - crime[i] * 0.3, 0, 100);
        }
      }
      function totals() { const t = { R: 0, C: 0, I: 0 }; for (const s of S.values()) if (ZONE[s.t]) t[s.t] += POP[s.t][s.lvl]; return t; }
      function dem(t) {
        const jobs = t.C + t.I, tm = (7 - c.tax) * 0.03;
        return {
          R: clamp((jobs * 2.5 + 80 - t.R) / Math.max(150, t.R * 0.25), -1, 1) + tm,
          C: clamp((t.R * 0.16 + 25 - t.C) / Math.max(60, t.C * 0.3 + t.R * 0.05), -1, 1) + tm,
          I: clamp((t.R * 0.24 + 50 - t.I) / Math.max(60, t.I * 0.3 + t.R * 0.05), -1, 1) + tm
        };
      }
      function maxLevel(s) { if (s.t === 'I') return 4; const L = lv[ci(s)]; return L < 25 ? 1 : L < 40 ? 2 : L < 58 ? 3 : 4; }
      function score(s, d) {
        const i = ci(s);
        if (s.t === 'R') return d.R + (lv[i] - 40) / 120 - pol[i] / 120 - crime[i] / 200;
        if (s.t === 'C') return d.C + (lv[i] - 40) / 150 - crime[i] / 250;
        return d.I + 0.05 - crime[i] / 300;
      }
      function growth() {
        const zs = []; for (const s of S.values()) if (ZONE[s.t]) zs.push(s);
        for (let i = zs.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; const tmp = zs[i]; zs[i] = zs[j]; zs[j] = tmp; }
        const t = totals();
        for (const s of zs) {
          if (s.fire || s.fl) continue;
          const old = s.lvl;
          if (!s.pw || !s.rd) { if (s.lvl > 0 && Math.random() < 0.1) s.lvl--; }
          else {
            const sc2 = score(s, dem(t)), mx = maxLevel(s);
            if (s.lvl < mx && sc2 > 0 && Math.random() < 0.05 + sc2 * 0.3) s.lvl++;
            else if (s.lvl > 0 && ((sc2 < -0.3 && Math.random() < 0.08) || (s.lvl > mx && Math.random() < 0.1))) s.lvl--;
          }
          if (s.lvl !== old) { t[s.t] += POP[s.t][s.lvl] - POP[s.t][old]; if (s.lvl > old) s.burnt = false; drawStruct(s); }
        }
      }
      function stats() {
        const P = { rP: 0, cJ: 0, iJ: 0, zones: 0, plants: 0, unpow: 0, noRoad: 0, short: st.short || 0, coal: 0, sun: 0, police: 0, fireSt: 0, school: 0, park: 0, avgPol: 0, avgCrime: 0 };
        let np = 0, ncr = 0;
        for (const s of S.values()) {
          if (ZONE[s.t]) {
            P.zones++; P[s.t === 'R' ? 'rP' : s.t === 'C' ? 'cJ' : 'iJ'] += POP[s.t][s.lvl];
            if (!s.pw) P.unpow++; if (!s.rd) P.noRoad++;
            if (s.t === 'R' && s.lvl) { P.avgPol += pol[ci(s)]; np++; }
            if (s.t !== 'I' && s.lvl) { P.avgCrime += crime[ci(s)]; ncr++; }
          } else if (CAP[s.t]) { P.plants++; P[s.t]++; }
          else { if (s.t === 'firest') P.fireSt++; else P[s.t]++; if (s.t !== 'park' && !s.pw) P.unpow++; }
        }
        P.avgPol = np ? P.avgPol / np : 0; P.avgCrime = ncr ? P.avgCrime / ncr : 0;
        const d = dem({ R: P.rP, C: P.cJ, I: P.iJ });
        P.dR = d.R; P.dC = d.C; P.dI = d.I; P.tax = c.tax; P.funds = c.funds;
        st = P;
      }
      function upkeep() {
        const u = { roads: 0, power: 0, police: 0, fire: 0, school: 0, park: 0 };
        for (let i = 0; i < N * N; i++) { const k = tile[i]; if (k === 1) u.roads += terr[i] === 1 ? 6 : 2; else if (k === 2) u.roads += terr[i] === 1 ? 2 : 0.5; else if (k === 3) u.roads += 2.5; }
        for (const s of S.values()) {
          if (CAP[s.t]) u.power += UPKEEP[s.t];
          else if (s.t === 'police') u.police += UPKEEP.police;
          else if (s.t === 'firest') u.fire += UPKEEP.firest;
          else if (s.t === 'school') u.school += UPKEEP.school;
          else if (s.t === 'park') u.park += UPKEEP.park;
        }
        return u;
      }
      const taxYear = () => c.tax * 0.35 * (st.rP + st.cJ + st.iJ);
      function finances() {
        const inc = taxYear() / 12, u = upkeep();
        c.funds += inc; c.yr.tax += inc;
        for (const k in u) { c.funds -= u[k] / 12; c.yr[k] += u[k] / 12; }
        if (hamster) { c.funds += 150; c.yr.other += 150; }
      }
      const sunOK = () => !!(c && ((c.ms & 2) || Y0 + Math.floor(c.m / 12) >= 1975));

      function month() {
        if (!c || c.over) return;
        c.m++;
        simPower(); simRoads(); calcNature(); simMaps();
        growth();
        simPower();
        firesTick();
        floodTick();
        stats();
        finances();
        st.funds = c.funds;
        if (prefs.dis && c.m > 24 && Math.random() < 1 / 40) { const r = Math.random(); disaster(r < 0.4 ? 'fire' : r < 0.72 ? 'flood' : 'hamster'); }
        milestones();
        if (!c.sunSaid && sunOK()) { c.sunSaid = true; say('Scientists unveil the Sun Farm: like a regular farm, but for sunshine. (New building unlocked!)', true); refreshTools(); }
        if (c.m % 12 === 0) yearEnd();
        if (c.funds < 0) {
          c.brokeM++;
          if (!c.warned) { c.warned = true; say('City coffers empty! Mayor {m} checks the couch cushions at City Hall.', true); api.msgBox('Tiny Town', `${c.name} is out of money!\n\nRaise taxes in the Budget window, or bulldoze things you don't need. If the town stays in debt for 12 months, the council will take over.`, ['OK'], 'warn'); }
          if (c.brokeM >= 12) { gameOver(); return; }
        } else { c.brokeM = 0; if (c.funds > 1000) c.warned = false; }
        miniDirty = true; hud(); need();
      }
      function yearEnd() {
        c.last = c.yr; c.yr = zeroYr();
        const L = c.last, net = L.tax + L.other - L.roads - L.power - L.police - L.fire - L.school - L.park;
        say(`Year-end report: ${c.name} finishes ${Y0 + c.m / 12 - 1} with a ${net >= 0 ? 'surplus' : 'deficit'} of ${money(Math.abs(net))}.`);
        saveCity(true); flash(`Happy New Year! ${c.name} was auto-saved to slot ${c.slot}.`);
      }
      function milestones() {
        for (let i = 0; i < MS.length; i++) {
          if (st.rP >= MS[i][0] && !(c.ms & (1 << i))) {
            c.ms |= 1 << i;
            let got = 0;
            if (c.earned < 12) { got = api.earn(3, `${c.name} becoming a ${MS[i][1]}`) || 0; c.earned += 3; }
            celebrate(i, got);
            if (i === 1) refreshTools();
          }
        }
      }

      /* ----- fires, floods, hamster ----- */
      const burnables = () => { const a = []; for (const s of S.values()) if (s.t !== 'park' && !CAP[s.t] && (!ZONE[s.t] || s.lvl > 0)) a.push(s); return a; };
      function ignite(s) {
        if (!s || s.fire || s.t === 'park' || CAP[s.t] || (ZONE[s.t] && !s.lvl)) return false;
        s.fire = 1; nFire++; snd.fire(); miniDirty = true; need();
        return true;
      }
      function firesTick() {
        const list = burnables();
        if (c.m > 18 && list.length && Math.random() < Math.min(0.12, list.length * 0.0015)) {
          const s = list[Math.random() * list.length | 0];
          if (Math.random() > fc[ci(s)] * 0.009 && ignite(s)) { say(api.pick(['Fire reported in {c}! Residents gather to point at it.', 'Smoke spotted downtown; marshmallow sales briefly spike.']), true); flash('Fire! A fire station nearby would help.'); }
        }
        const burning = list.filter(s => s.fire);
        for (const s of burning) {
          const f = fc[ci(s)] / 100;
          s.fire++;
          if (Math.random() < 0.25 + f * 0.6) { s.fire = 0; nFire = Math.max(0, nFire - 1); say(api.pick(['Firefighters save the day, and one very startled cat.', 'Fire put out! Brave crew celebrates with lemonade.']), true); }
          else if (s.fire > 3) destroy(s);
          else for (const o of neighborsOf(s)) if (!o.fire && Math.random() < 0.12 * (1 - f)) ignite(o);
        }
      }
      function destroy(s) {
        snd.boom();
        if (s.fire) { s.fire = 0; nFire = Math.max(0, nFire - 1); }
        if (ZONE[s.t]) { s.lvl = 0; s.burnt = true; drawStruct(s); }
        else { removeStruct(s, true); simPower(); }
        say('A building burned down. Neighbors bring casseroles and a strongly worded letter about fire stations.', true);
        miniDirty = true;
      }
      function startFlood() {
        const shore = [];
        for (let i = 0; i < N * N; i++) if (terr[i] !== 1) { const x = i % N, y = (i / N) | 0; if ((x > 0 && terr[i - 1] === 1) || (x < N - 1 && terr[i + 1] === 1) || (y > 0 && terr[i - N] === 1) || (y < N - 1 && terr[i + N] === 1)) shore.push(i); }
        if (!shore.length) { say('Weather service predicted a flood, but {c} has no water to flood with. Forecaster embarrassed.', true); return; }
        let best = shore[0], bs = -1;
        for (let k = 0; k < 30; k++) { const i = shore[Math.random() * shore.length | 0], x = i % N, y = (i / N) | 0; let n = 0; for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < N && yy < N && tile[yy * N + xx]) n++; } if (n > bs) { bs = n; best = i; } }
        const q = [[best, 0]], seen = new Set([best]); let cnt = 0;
        for (let h = 0; h < q.length && cnt < 40; h++) {
          const [i, d] = q[h]; flood[i] = 4; cnt++;
          if (d >= 4) continue;
          const x = i % N, y = (i / N) | 0;
          [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]].forEach(([xx, yy]) => { if (xx >= 0 && yy >= 0 && xx < N && yy < N) { const j = yy * N + xx; if (!seen.has(j) && terr[j] !== 1 && Math.random() < 0.8) { seen.add(j); q.push([j, d + 1]); } } });
        }
        const hit = new Set(); for (const i of seen) if (flood[i] && tile[i] === 4) hit.add(S.get(sid[i]));
        for (const s of hit) { s.fl = 1; if (ZONE[s.t] && s.lvl > 0) { s.lvl--; drawStruct(s); } }
        say('Flood waters rise! Rubber duck sales go through the roof.', true); flash('Flood! Buildings in the water will not grow until it drains.');
        if (prefs.snd) api.noise(1.2, { vol: 0.06, f: 400 });
        miniDirty = true; need();
      }
      function floodTick() {
        let any = false, was = false;
        for (let i = 0; i < N * N; i++) if (flood[i]) { was = true; flood[i]--; if (flood[i]) any = true; }
        if (!was) return;
        for (const s of S.values()) if (s.fl) { let f = 0; for (let dy = 0; dy < s.z; dy++) for (let dx = 0; dx < s.z; dx++) if (flood[(s.y + dy) * N + s.x + dx]) f = 1; s.fl = f; }
        if (!any) say('Flood recedes. Residents find three extra fish in the basement.');
        miniDirty = true;
      }
      function startHamster() {
        let i = 0; for (let k = 0; k < 200; k++) { i = Math.random() * N * N | 0; if (terr[i] !== 1) break; }
        hamster = { x: i % N + 0.5, y: ((i / N) | 0) + 0.5, tx: 0, ty: 0, t: 40000, f: 0, ci: -1, chewed: false };
        pickHamsterTarget();
        say('GIANT HAMSTER SIGHTED! Experts advise: "Do not look like a sunflower seed."', true);
        flash('A Giant Hamster is visiting! It eats trees and chews power lines, but tourists love it.');
        snd.squeak(); need();
        cam.x = hamster.x - cw / ts / 2; cam.y = hamster.y - ch / ts / 2; clampCam();
      }
      function pickHamsterTarget() {
        const h = hamster;
        for (let k = 0; k < 30; k++) {
          const tx = clamp(h.x + (Math.random() - 0.5) * 24, 1, N - 1), ty = clamp(h.y + (Math.random() - 0.5) * 24, 1, N - 1);
          if (terr[(ty | 0) * N + (tx | 0)] !== 1) { h.tx = tx; h.ty = ty; return; }
        }
        h.tx = N / 2; h.ty = N / 2;
      }
      function hamsterStep(dt) {
        const h = hamster, dx = h.tx - h.x, dy = h.ty - h.y, d = Math.hypot(dx, dy), sp = 1.6 * dt / 1000;
        if (d <= sp) { h.x = h.tx; h.y = h.ty; pickHamsterTarget(); if (Math.random() < 0.3) snd.squeak(); }
        else { h.x += dx / d * sp; h.y += dy / d * sp; }
        h.f += dt; h.t -= dt;
        const i = (h.y | 0) * N + (h.x | 0);
        if (i !== h.ci && i >= 0 && i < N * N) {
          h.ci = i; const x = i % N, y = (i / N) | 0;
          if (terr[i] === 2 && !tile[i]) { terr[i] = 0; natDirty = true; redrawRect(x, y, x, y); }
          if ((tile[i] === 2 || tile[i] === 3) && Math.random() < 0.4) {
            tile[i] = tile[i] === 3 ? 1 : 0; redrawRect(x - 1, y - 1, x + 1, y + 1); simPower();
            if (!h.chewed) { h.chewed = true; say('Giant Hamster chews through a power line, looks extremely pleased.', true); }
          }
        }
        if (h.t <= 0) { hamster = null; say('Giant Hamster waddles off into the hills. Tourists sad, trees relieved.', true); miniDirty = true; }
      }
      function disaster(kind) {
        if (!c || c.over) return;
        if (kind === 'fire') {
          const list = burnables();
          if (!list.length) { say('Fire drill held in {c}. There was nothing to burn, so everyone went home early.', true); return; }
          let n = 0; for (let k = 0; k < 3; k++) if (ignite(list[Math.random() * list.length | 0])) n++;
          if (n) { say('Big fire breaks out! Firefighters asked to please hurry.', true); flash('Big fire! Fire stations nearby put fires out faster.'); }
        } else if (kind === 'flood') startFlood();
        else if (kind === 'hamster') { if (hamster) hamster.t += 20000; else startHamster(); }
        hud(); need();
      }

      /* ----- building ----- */
      function flash(msg) { statusEl.textContent = msg; flashT = Date.now() + 3000; clearTimeout(flashTimer); flashTimer = setTimeout(refreshStatus, 3100); }
      function refreshStatus() {
        if (Date.now() < flashT) return;
        const t = TOOL[tool];
        let s = t.name + (t.cost ? ': ' + (t.line ? t.tip : money(t.cost) + ', ' + t.tip) : ' - ' + t.tip);
        if (tool === 'sun' && !sunOK()) s = 'Sun farm: unlocks when you reach Town size (2,000) or in 1975';
        if (overlay !== 'none') s += '  |  View: ' + OVERLAYS.find(o => o[0] === overlay)[1];
        statusEl.textContent = s;
      }
      function spend(cost) {
        if (c.over) return false;
        if (c.funds < cost) { flash(c.funds < 0 ? 'The town is in debt! Raise taxes in the Budget window.' : 'Not enough money for that!'); snd.bad(); return false; }
        c.funds -= cost; return true;
      }
      function footprint(t, x, y) { const z = SIZE[t] || 1, o = (z - 1) >> 1; return { x0: x - o, y0: y - o, z }; }
      function canPlace(t, x, y) {
        const f = footprint(t, x, y);
        if (f.x0 < 0 || f.y0 < 0 || f.x0 + f.z > N || f.y0 + f.z > N) return false;
        for (let dy = 0; dy < f.z; dy++) for (let dx = 0; dx < f.z; dx++) { const i = (f.y0 + dy) * N + f.x0 + dx; if (terr[i] === 1 || tile[i] || flood[i]) return false; }
        return true;
      }
      function placeStruct(t, x, y) {
        if (t === 'sun' && !sunOK()) { flash('The Sun Farm unlocks when you reach Town size (2,000) or in 1975.'); snd.bad(); return; }
        if (!canPlace(t, x, y)) { flash(`Can't build there. ${TOOL[t].name} needs ${SIZE[t]}x${SIZE[t]} clear land.`); snd.bad(); return; }
        if (!spend(TOOL[t].cost)) return;
        const f = footprint(t, x, y), s = addStruct(t, f.x0, f.y0, 0, 0);
        drawStruct(s); redrawRect(f.x0 - 1, f.y0 - 1, f.x0 + f.z, f.y0 + f.z);
        natDirty = true; snd.build(); afterBuild();
      }
      function afterBuild() { simPower(); simRoads(); stats(); miniDirty = true; hud(); need(); }
      function doLineTile(x, y) {
        if (x < 0 || y < 0 || x >= N || y >= N) return false;
        const i = y * N + x, k = tile[i];
        if (tool === 'road') {
          if (k === 1 || k === 3 || k === 4 || flood[i]) return false;
          if (!spend(terr[i] === 1 ? 50 : 10)) return false;
          tile[i] = k === 2 ? 3 : 1; if (terr[i] !== 1) { if (terr[i] === 2) natDirty = true; terr[i] = 0; }
          snd.road();
        } else if (tool === 'wire') {
          if (k === 2 || k === 3 || k === 4) return false;
          if (!spend(terr[i] === 1 ? 25 : 5)) return false;
          tile[i] = k === 1 ? 3 : 2; if (terr[i] !== 1) { if (terr[i] === 2) natDirty = true; terr[i] = 0; }
          snd.road();
        } else {
          if (k === 4) {
            const s = S.get(sid[i]); if (!spend(s.z * s.z * 2)) return false;
            removeStruct(s, false); natDirty = true;
          } else if (k) { if (!spend(1)) return false; tile[i] = 0; }
          else if (terr[i] === 2 || terr[i] === 3) { if (!spend(1)) return false; if (terr[i] === 2) natDirty = true; terr[i] = 0; }
          else return false;
          snd.doze();
        }
        redrawRect(x - 1, y - 1, x + 1, y + 1);
        return true;
      }
      let lineLast = null;
      function lineTo(p) {
        if (!p) return;
        let changed = false;
        if (!lineLast) changed = doLineTile(p.x, p.y);
        else {
          let { x, y } = lineLast;
          while (x !== p.x || y !== p.y) {
            if (Math.abs(p.x - x) >= Math.abs(p.y - y)) x += Math.sign(p.x - x); else y += Math.sign(p.y - y);
            if (doLineTile(x, y)) changed = true;
          }
        }
        lineLast = { x: p.x, y: p.y };
        if (changed) afterBuild();
      }
      function act(p) {
        if (!p || !c || c.over) return;
        if (p.x < 0 || p.y < 0 || p.x >= N || p.y >= N) return;
        if (tool === 'query' || tool === 'hand') { query(p.x, p.y); return; }
        if (TOOL[tool].line) { lineLast = null; lineTo(p); lineLast = null; return; }
        placeStruct(tool, p.x, p.y);
      }
      function setTool(t) {
        tool = t; lineLast = null;
        toolsEl.querySelectorAll('[data-t]').forEach(b => b.classList.toggle('down', b.dataset.t === t));
        cv.classList.toggle('tt-grab', t === 'hand');
        refreshStatus(); need();
      }
      function refreshTools() { const b = toolsEl.querySelector('[data-t=sun]'); b.classList.toggle('tt-lock', !sunOK()); b.title = sunOK() ? 'Sun farm (U) - $6,000' : 'Sun farm - unlocks at Town size (2,000) or in 1975'; }

      /* ----- query ----- */
      function closeQuery() { if (qPanel) { qPanel.remove(); qPanel = null; } }
      const word = v => v < 10 ? 'None' : v < 35 ? 'Low' : v < 65 ? 'Medium' : 'High';
      function query(x, y) {
        snd.query();
        const i = y * N + x, k = tile[i], rows = []; let title, note = '';
        if (k === 4) {
          const s = S.get(sid[i]);
          title = TOOL[s.t].name;
          if (ZONE[s.t]) {
            rows.push(['Stage', STAGES[s.t][s.lvl] + (s.lvl ? ` (${s.lvl}/4)` : '')]);
            rows.push([s.t === 'R' ? 'Residents' : 'Jobs', fmt(POP[s.t][s.lvl])]);
            rows.push(['Road', s.rd ? 'Yes' : 'No']); rows.push(['Power', s.pw ? 'Yes' : 'No']);
            const d = dem({ R: st.rP, C: st.cJ, I: st.iJ }), scv = score(s, d), mx = maxLevel(s);
            note = !s.pw ? 'Needs power: connect it to a power plant with power lines.' : !s.rd ? 'Needs a road right next to it.'
              : s.fl ? 'Flooded! It will recover when the water drains.'
              : (s.t === 'R' && d.R <= 0) ? 'Not enough jobs in town. Build Commercial or Industrial zones.'
              : (s.t === 'C' && d.C <= 0) ? 'Not enough shoppers. More homes would help.'
              : (s.t === 'I' && d.I <= 0) ? 'Not enough workers. More homes would help.'
              : (s.t === 'R' && pol[i] > 40) ? 'Too much pollution for families. Keep industry and coal away.'
              : crime[i] > 40 ? 'Crime is scaring people off. Build a police station.'
              : s.lvl >= mx && s.lvl < 4 ? 'Needs higher land value to grow taller: add parks and schools, or build near water.'
              : scv <= 0 ? 'Growth is slow here. High taxes or low demand?' : s.lvl === 4 ? 'Fully grown. Lovely!' : 'Growing nicely.';
          } else if (CAP[s.t]) {
            rows.push(['Powers', 'up to ' + CAP[s.t] + ' buildings']); rows.push(['Upkeep', money(UPKEEP[s.t]) + '/yr']);
            if (st.short) note = `${st.short} building(s) are waiting for power. Build another plant.`;
          } else {
            rows.push(['Upkeep', money(UPKEEP[s.t]) + '/yr']);
            if (s.t !== 'park') { rows.push(['Power', s.pw ? 'Yes' : 'No']); if (!s.pw) note = 'Services only work with power.'; }
          }
          if (s.fire) note = 'ON FIRE! Fire stations nearby help put it out.';
        } else {
          title = k === 1 ? (terr[i] === 1 ? 'Bridge' : 'Road') : k === 2 ? 'Power line' : k === 3 ? 'Road with power line' : ['Grassland', 'Water', 'Forest', 'Rubble'][terr[i]];
          if (k >= 2) rows.push(['Powered', pwT[i] ? 'Yes' : 'No']);
        }
        if (flood[i]) note = note || 'Flooded.';
        if (terr[i] !== 1) {
          rows.push(['Land value', word(lv[i]) + ' (' + Math.round(lv[i]) + ')']);
          rows.push(['Pollution', word(pol[i])]); rows.push(['Crime', word(crime[i])]);
          rows.push(['Police', Math.round(pc[i]) + '%']); rows.push(['Fire cover', Math.round(fc[i]) + '%']); rows.push(['Schooling', Math.round(sc[i] * 5) + '%']);
        }
        closeQuery();
        qPanel = document.createElement('div'); qPanel.className = 'tt-q raised';
        qPanel.innerHTML = `<div class="tt-dh"><span></span><button class="btn tt-dx" aria-label="Close">x</button></div><table class="sunken">${rows.map(r => `<tr><td>${r[0]}</td><td>${api.esc(String(r[1]))}</td></tr>`).join('')}</table>${note ? `<p>${api.esc(note)}</p>` : ''}`;
        qPanel.querySelector('.tt-dh span').textContent = `${title} (${x},${y})`;
        qPanel.querySelector('.tt-dx').onclick = () => { snd.click(); closeQuery(); };
        qPanel.addEventListener('pointerdown', e => e.stopPropagation());
        mapEl.appendChild(qPanel);
      }

      /* ----- dialogs ----- */
      function dlg(title, html, opts) {
        opts = opts || {};
        closeDlg();
        const v = document.createElement('div'); v.className = 'tt-veil';
        v.innerHTML = `<div class="tt-dlg raised" role="dialog"><div class="tt-dh"><span></span>${opts.x !== false ? '<button class="btn tt-dx" aria-label="Close">x</button>' : ''}</div><div class="tt-dc">${html}</div></div>`;
        v.querySelector('.tt-dh span').textContent = title;
        layer.appendChild(v);
        dlgOpen = { el: v, closable: opts.x !== false, onClose: opts.onClose };
        const x = v.querySelector('.tt-dx'); if (x) x.onclick = () => { snd.click(); closeDlg(); };
        dlgPause = true; schedule();
        return v.querySelector('.tt-dc');
      }
      function closeDlg() {
        if (!dlgOpen) return;
        const d = dlgOpen; dlgOpen = null; d.el.remove(); dlgPause = false;
        if (d.onClose) d.onClose();
        schedule(); hud(); need();
        if (c && c.over) setTimeout(() => { if (alive && c.over && !dlgOpen) gameOverDlg(); }, 0);
      }
      function slotLabel(n) { const d = readSlot(n); return d ? `Slot ${n}: ${d.name}, pop ${fmt(d.pop || 0)}, ${dateStr(d.m || 0)}${d.over ? ' (closed)' : ''}` : `Slot ${n}: (empty)`; }
      function newCityDlg(first) {
        const name = api.pick(NAME_A) + api.pick(NAME_B), seed = String(10000 + Math.floor(Math.random() * 89999));
        let slot = 1; for (let n = 3; n >= 1; n--) if (!readSlot(n)) slot = n;
        if (readSlot(1) && readSlot(2) && readSlot(3)) slot = c ? c.slot : 1;
        const b = dlg(first ? 'Welcome to Tiny Town' : 'Found a New City', `
          ${first ? '<p>Every great city starts as an empty field. Pick a name and a map, then press <b>Found city</b>.</p>' : ''}
          <label class="tt-l">City name<br><input class="tt-in" data-n maxlength="18"></label>
          <div class="tt-l">Map seed<br><input class="tt-in tt-seed" data-s maxlength="10" inputmode="numeric"> <button class="btn tt-sm" data-rs>Random</button></div>
          <div class="tt-prev"><canvas width="${N}" height="${N}" class="sunken" aria-label="Map preview"></canvas><div>
            <div class="tt-l"><b>Difficulty</b></div>
            ${DIFF.map((d, i) => `<label class="tt-r"><input type="radio" name="tt-diff" value="${i}" ${i === 1 ? 'checked' : ''}> ${d[0]} (${money(d[1])})</label>`).join('')}
          </div></div>
          <label class="tt-l" style="margin-top:6px">Save in<br><select class="tt-in" data-slot>${[1, 2, 3].map(n => `<option value="${n}" ${n === slot ? 'selected' : ''}>${api.esc(slotLabel(n))}</option>`).join('')}</select></label>
          <div class="tt-bts"><button class="btn" data-go>Found city</button>${first ? '' : '<button class="btn" data-cancel>Cancel</button>'}</div>`, { x: !first });
        const nIn = b.querySelector('[data-n]'), sIn = b.querySelector('[data-s]'), pv = b.querySelector('canvas');
        nIn.value = name; sIn.value = seed;
        let pt = 0; const prev = () => terrPreview(pv, genTerrain(sIn.value.trim() || '1'));
        prev();
        sIn.addEventListener('input', () => { clearTimeout(pt); pt = setTimeout(prev, 150); });
        b.querySelector('[data-rs]').onclick = () => { snd.click(); sIn.value = String(10000 + Math.floor(Math.random() * 89999)); prev(); };
        const cancel = b.querySelector('[data-cancel]'); if (cancel) cancel.onclick = () => { snd.click(); closeDlg(); };
        b.querySelector('[data-go]').onclick = () => {
          snd.click();
          const o = { name: (nIn.value.trim() || name).slice(0, 18), seed: sIn.value.trim() || seed, slot: +b.querySelector('[data-slot]').value, diff: +(b.querySelector('input[name=tt-diff]:checked') || { value: 1 }).value };
          if (c && !c.over && c.slot !== o.slot) saveCity(true);
          closeDlg(); newCity(o); saveCity(true); setTool('hand');
          if (speed === 0) setSpeed(2);
        };
        setTimeout(() => { try { nIn.focus(); nIn.select(); } catch (e) { /* ignore */ } }, 50);
      }
      function filesDlg() {
        const b = dlg('City Files', `<p>Tiny Town keeps up to three cities. It saves on its own every January and when you close the game.</p><div data-rows></div><div class="tt-bts"><button class="btn" data-ok>Close</button></div>`);
        const rows = b.querySelector('[data-rows]');
        const draw = () => {
          rows.innerHTML = [1, 2, 3].map(n => { const d = readSlot(n); return `<div class="tt-slot sunken"><b>Slot ${n}</b>${c && c.slot === n ? ' (current)' : ''}: ${d ? `${api.esc(d.name)}, pop ${fmt(d.pop || 0)}, ${dateStr(d.m || 0)}${d.over ? ' (closed)' : ''}` : '(empty)'}
            <div><button class="btn tt-sm" data-load="${n}" ${d ? '' : 'disabled'}>Load</button><button class="btn tt-sm" data-save="${n}" ${c && !c.over ? '' : 'disabled'}>Save here</button><button class="btn tt-sm" data-del="${n}" ${d ? '' : 'disabled'}>Delete</button></div></div>`; }).join('');
        };
        draw();
        rows.addEventListener('click', async e => {
          const bt = e.target.closest('button'); if (!bt) return; snd.click();
          if (bt.dataset.load) { const n = +bt.dataset.load; if (c && !c.over && c.slot !== n) saveCity(true); closeDlg(); loadSlot(n); }
          else if (bt.dataset.save) {
            const n = +bt.dataset.save, d = readSlot(n);
            if (d && c.slot !== n) { const r = await api.msgBox('Tiny Town', `Replace "${d.name}" in slot ${n} with ${c.name}?`, ['Replace', 'Cancel'], 'warn'); if (r !== 'Replace') return; }
            c.slot = n; saveCity(false); draw();
          } else if (bt.dataset.del) {
            const n = +bt.dataset.del, d = readSlot(n); if (!d) return;
            const r = await api.msgBox('Tiny Town', `Delete "${d.name}" from slot ${n}? This can't be undone.`, ['Delete', 'Cancel'], 'warn');
            if (r !== 'Delete') return;
            try { api.save('slot' + n, null); } catch (e2) { /* ignore */ }
            draw();
          }
        });
        b.querySelector('[data-ok]').onclick = () => { snd.click(); closeDlg(); };
      }
      function budgetDlg() {
        if (!c) return;
        const b = dlg('Budget', `<div class="tt-l">Tax rate: <b data-tv></b><input type="range" min="0" max="20" step="1" class="tt-range" data-tax aria-label="Tax rate"></div>
          <div class="tt-hint" data-th></div>
          <table class="tt-tab sunken"><thead><tr><th></th><th>So far this year</th><th>Per year (est.)</th></tr></thead><tbody data-tb></tbody></table>
          <div class="tt-l" data-fund></div>
          <div class="tt-bts"><button class="btn" data-ok>OK</button></div>`);
        const rng = b.querySelector('[data-tax]');
        rng.value = c.tax;
        const upd = () => {
          const u = upkeep(), y = c.yr, est = taxYear();
          const lines = [['Taxes', y.tax + y.other, est], ['Roads and lines', -y.roads, -u.roads], ['Power plants', -y.power, -u.power], ['Police', -y.police, -u.police], ['Fire', -y.fire, -u.fire], ['Schools', -y.school, -u.school], ['Parks', -y.park, -u.park]];
          const tot = lines.reduce((a, l) => [a[0] + l[1], a[1] + l[2]], [0, 0]);
          b.querySelector('[data-tv]').textContent = c.tax + '%';
          b.querySelector('[data-th]').textContent = c.tax >= 12 ? 'Ouch! High taxes make people and businesses stay away.' : c.tax <= 3 ? 'Very low taxes attract people, but will they pay for the roads?' : 'Higher taxes bring in money but slow growth. 7% is typical.';
          b.querySelector('[data-tb]').innerHTML = lines.map(l => `<tr><td>${l[0]}</td><td>${money(l[1])}</td><td>${money(l[2])}</td></tr>`).join('') + `<tr class="tt-tot"><td>Net</td><td>${money(tot[0])}</td><td>${money(tot[1])}</td></tr>`;
          let last = '';
          if (c.last) { const L = c.last; last = ` Last year: ${money(L.tax + L.other - L.roads - L.power - L.police - L.fire - L.school - L.park)}.`; }
          b.querySelector('[data-fund]').innerHTML = `Funds: <b style="color:${c.funds < 0 ? '#c00000' : '#000'}">${money(c.funds)}</b>.${last}`;
        };
        rng.addEventListener('input', () => { c.tax = +rng.value; st.tax = c.tax; upd(); hud(); });
        upd();
        b.querySelector('[data-ok]').onclick = () => { snd.click(); closeDlg(); };
      }
      function reportDlg() {
        if (!c) return;
        stats();
        const P = st, next = MS.find(m => P.rP < m[0]);
        const rows = [['Population', fmt(P.rP)], ['Jobs', fmt(P.cJ + P.iJ) + ` (${fmt(P.cJ)} C, ${fmt(P.iJ)} I)`], ['Zones', P.zones], ['Power plants', P.plants + (P.short ? `, ${P.short} waiting` : '')],
          ['Without power', P.unpow], ['Without road', P.noRoad], ['Police / Fire / Schools', `${P.police} / ${P.fireSt} / ${P.school}`], ['Parks', P.park],
          ['Pollution at home', word(P.avgPol)], ['Crime', word(P.avgCrime)], ['Next milestone', next ? `${next[1]} at ${fmt(next[0])}` : 'You built a Capital!']];
        const b = dlg('City Report: ' + c.name, `<table class="tt-tab sunken">${rows.map(r => `<tr><td>${r[0]}</td><td>${api.esc(String(r[1]))}</td></tr>`).join('')}</table><div class="tt-bts"><button class="btn" data-ok>OK</button></div>`);
        b.querySelector('[data-ok]').onclick = () => { snd.click(); closeDlg(); };
      }
      function gameOver() {
        c.over = true; setSpeed(0); hud(); saveCity(true); snd.bad();
        say(`${c.name} goes bankrupt. The council kindly takes back the keys to City Hall.`, true);
        gameOverDlg();
      }
      function gameOverDlg() {
        const b = dlg('City Hall is closed', `<p>${api.esc(c.name)} stayed in debt for a whole year, so the town council has gently taken back the keys to City Hall.</p>
          <p>Don't feel bad! The ${fmt(st.rP)} residents made you a thank-you card, and it only has a few spelling mistakes.</p>
          <p>Tip: keep an eye on the Budget. Raise taxes a little, and don't build services faster than the town can pay for them.</p>
          <div class="tt-bts"><button class="btn" data-new>New city</button><button class="btn" data-open>Open city</button></div>`, { x: false });
        b.querySelector('[data-new]').onclick = () => { snd.click(); closeDlg(); newCityDlg(false); };
        b.querySelector('[data-open]').onclick = () => { snd.click(); closeDlg(); filesDlg(); };
      }
      function celebrate(i, got) {
        snd.tada();
        say(`${c.name} is officially a ${MS[i][1]}! The brass band plays so loudly nobody hears the mayor's speech.`, true);
        if (banner) banner.remove();
        clearTimeout(bannerTimer);
        banner = document.createElement('div'); banner.className = 'tt-ban raised';
        banner.innerHTML = `<h3></h3><p></p><button class="btn tt-sm">Hooray!</button>`;
        banner.querySelector('h3').textContent = `${c.name} is now a ${MS[i][1]}!`;
        banner.querySelector('p').textContent = `Population ${fmt(MS[i][0])}+ reached.` + (got ? ` You earned $${got}!` : '') + (i === 3 ? ' You built a Capital. Well done, Mayor!' : ` Next: ${MS[i + 1][1]} at ${fmt(MS[i + 1][0])}.`);
        const done = () => { if (banner) { banner.remove(); banner = null; } };
        banner.querySelector('button').onclick = () => { snd.click(); done(); };
        banner.addEventListener('pointerdown', e => e.stopPropagation());
        mapEl.appendChild(banner);
        bannerTimer = setTimeout(done, 9000);
        const now = performance.now();
        for (let k = 0; k < 7 + i * 2; k++) bursts.push({ at: now + k * 380, x: cw * (0.15 + Math.random() * 0.7), y: ch * (0.15 + Math.random() * 0.45) });
        need();
      }

      /* ----- news ticker ----- */
      function fill(t) { return t.replace(/\{c\}/g, c ? c.name : 'Tiny Town').replace(/\{m\}/g, api.user); }
      function say(t, urgent) { const s = fill(t); if (urgent) { newsQ.unshift(s); tickNext(); } else newsQ.push(s); }
      function headline() {
        const L = headlines(st).filter(h => !recent.includes(h[1]));
        let tot = 0; L.forEach(h => tot += h[0]);
        let r = Math.random() * tot, pick = L[0];
        for (const h of L) { r -= h[0]; if (r <= 0) { pick = h; break; } }
        recent.push(pick[1]); if (recent.length > 6) recent.shift();
        return fill(pick[1]);
      }
      function tickNext() {
        if (!alive) return;
        const txt = newsQ.shift() || headline();
        tkSpan.textContent = txt;
        const d = (tk.clientWidth || 300) + (tkSpan.scrollWidth || txt.length * 7);
        tkSpan.style.setProperty('--tt-d', d + 'px');
        tkSpan.style.animation = 'none'; void tkSpan.offsetWidth;
        tkSpan.style.animation = `tt-scroll ${(d / 60).toFixed(1)}s linear 1 forwards`;
      }
      tkSpan.addEventListener('animationend', tickNext);

      /* ----- HUD ----- */
      function hud() {
        if (!c) return;
        F.date.textContent = dateStr(c.m);
        F.funds.textContent = money(c.funds); F.funds.classList.toggle('tt-neg', c.funds < 0);
        F.pop.textContent = 'Pop ' + fmt(st.rP);
        W.body.querySelectorAll('[data-sp]').forEach(b => b.classList.toggle('down', +b.dataset.sp === speed));
        rg.fillStyle = '#000'; rg.fillRect(0, 0, 44, 26);
        rg.fillStyle = '#404040'; rg.fillRect(2, 10, 40, 1);
        [['R', st.dR], ['C', st.dC], ['I', st.dI]].forEach(([k, v], j) => {
          const hgt = Math.round(clamp(v, -1, 1) * 9), x = 5 + j * 13;
          rg.fillStyle = ZC[k];
          if (hgt > 0) rg.fillRect(x, 10 - hgt, 8, hgt); else if (hgt < 0) rg.fillRect(x, 11, 8, -hgt);
          letter(rg, k, x + 2, 20, 1, ZC[k]);
        });
        refreshTools();
      }
      function setSpeed(n) {
        if (c && c.over) n = 0;
        speed = n; minPaused = false; hud(); schedule();
        if (n === 0) flash('Paused. Press a speed button (or Space) to continue.');
      }
      function schedule() {
        clearTimeout(timer); timer = 0;
        if (!alive || !speed || dlgPause || !c || c.over) return;
        timer = setTimeout(() => { timer = 0; try { month(); } catch (e) { console.error(e); } schedule(); }, SPEEDS[speed]);
      }

      /* ----- view ----- */
      function clampCam() {
        const vw = cw / ts, vh = ch / ts;
        cam.x = vw >= N ? (N - vw) / 2 : clamp(cam.x, -vw * 0.3, N - vw * 0.7);
        cam.y = vh >= N ? (N - vh) / 2 : clamp(cam.y, -vh * 0.3, N - vh * 0.7);
      }
      function zoomStep(d, px, py) {
        const zi = ZOOMS.indexOf(ts), nz = clamp(zi + d, 0, ZOOMS.length - 1);
        if (nz === zi) return;
        if (px == null) { px = cw / 2; py = ch / 2; }
        const wx = cam.x + px / ts, wy = cam.y + py / ts;
        ts = ZOOMS[nz]; cam.x = wx - px / ts; cam.y = wy - py / ts; clampCam(); need();
      }
      function resize() {
        cw = Math.max(1, mapEl.clientWidth); ch = Math.max(1, mapEl.clientHeight);
        dpr = Math.min(2, Math.max(1, Math.round(window.devicePixelRatio || 1)));
        cv.width = cw * dpr; cv.height = ch * dpr;
        applyMini(); clampCam(); dirty = true; need();
      }
      function applyMini() {
        miniWrap.style.display = prefs.mini ? '' : 'none';
        const m = cw < 420 ? 80 : 120; mini.style.width = mini.style.height = m + 'px';
        miniDirty = true; need();
      }
      function need() { dirty = true; if (!raf && alive) raf = requestAnimationFrame(frame); }
      const animating = () => !!(hamster || parts.length || bursts.length || nFire > 0);
      function frame(now) {
        raf = 0;
        if (!alive || W.minimized) { lastT = 0; return; }
        const dt = lastT ? Math.min(100, now - lastT) : 16; lastT = now;
        const anim = animating();
        if (hamster && speed && !dlgPause) hamsterStep(dt);
        if (bursts.length || parts.length) stepParts(now, dt);
        if (dirty || (anim && now - lastDraw > 70)) { draw(now); lastDraw = now; dirty = false; }
        if (animating()) raf = requestAnimationFrame(frame); else lastT = 0;
      }
      function stepParts(now, dt) {
        const cols = ['#ff4040', '#ffe040', '#40ff80', '#40c0ff', '#ff80ff', '#ffffff'];
        bursts = bursts.filter(b => {
          if (now < b.at) return true;
          const col = cols[Math.random() * cols.length | 0];
          for (let k = 0; k < 36; k++) { const a = k / 36 * Math.PI * 2, v = 40 + Math.random() * 60; parts.push({ x: b.x, y: b.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1.2 + Math.random() * 0.5, col }); }
          if (prefs.snd) api.noise(0.25, { vol: 0.04, f: 900 });
          return false;
        });
        const s = dt / 1000;
        parts = parts.filter(p => { p.x += p.vx * s; p.y += p.vy * s; p.vy += 50 * s; p.life -= s; return p.life > 0; });
        dirty = true;
      }
      const BOLT = ['...##', '..##.', '.##..', '#####', '..##.', '.##..', '##...'];
      function pix(map, x, y, u, col) { g.fillStyle = col; map.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (row[i] === '#') g.fillRect(x + i * u, y + j * u, u, u); }); }
      function draw(now) {
        const s = ts * dpr, w = cv.width, h = cv.height;
        g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = false;
        g.fillStyle = '#10204a'; g.fillRect(0, 0, w, h);
        if (!c) return;
        const ox = Math.round(cam.x * s), oy = Math.round(cam.y * s);
        const x0 = Math.max(0, Math.floor(ox / s)), y0 = Math.max(0, Math.floor(oy / s)), x1 = Math.min(N, Math.ceil((ox + w) / s)), y1 = Math.min(N, Math.ceil((oy + h) / s));
        if (x1 > x0 && y1 > y0) g.drawImage(bg, x0 * T, y0 * T, (x1 - x0) * T, (y1 - y0) * T, x0 * s - ox, y0 * s - oy, (x1 - x0) * s, (y1 - y0) * s);
        const X = x => x * s - ox, Y = y => y * s - oy, u = Math.max(1, Math.round(s / 16));
        // floods
        for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (flood[y * N + x]) { g.fillStyle = 'rgba(40,90,210,0.6)'; g.fillRect(X(x), Y(y), s, s); if ((x + y) % 3 === 0) { g.fillStyle = 'rgba(200,225,255,0.8)'; g.fillRect(X(x) + 4 * u, Y(y) + 6 * u, 4 * u, u); } }
        // data overlays
        if (overlay !== 'none') {
          const src = { pol, crime, lv, police: pc, firec: fc, school: sc }[overlay];
          for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
            const i = y * N + x; let col = null;
            if (overlay === 'power') { if (tile[i] === 4) { const st2 = S.get(sid[i]); col = st2.t === 'park' ? null : st2.pw ? 'rgba(255,230,0,0.45)' : 'rgba(255,0,0,0.5)'; } else if (tile[i] >= 2) col = pwT[i] ? 'rgba(255,230,0,0.6)' : 'rgba(255,0,0,0.5)'; }
            else if (terr[i] !== 1) {
              let v = src[i]; if (overlay === 'school') v *= 5;
              if (overlay === 'lv') col = `hsla(${Math.round(v * 1.2)},90%,50%,0.5)`;
              else if (v > 3) col = (overlay === 'pol' ? 'rgba(140,90,0,' : overlay === 'crime' ? 'rgba(230,0,0,' : overlay === 'police' ? 'rgba(0,60,255,' : overlay === 'firec' ? 'rgba(255,120,0,' : 'rgba(170,0,220,') + (v / 100 * 0.7).toFixed(2) + ')';
            }
            if (col) { g.fillStyle = col; g.fillRect(X(x), Y(y), s, s); }
          }
        }
        // structure icons and fires
        const t = now / 110;
        for (const st2 of S.values()) {
          if (st2.x + st2.z < x0 || st2.x > x1 || st2.y + st2.z < y0 || st2.y > y1) continue;
          const bx = X(st2.x), by = Y(st2.y);
          if (st2.fire) {
            for (let dy = 0; dy < st2.z; dy++) for (let dx = 0; dx < st2.z; dx++) for (let f = 0; f < 2; f++) {
              const ph = Math.sin(t + dx * 3 + dy * 5 + f * 2.1), hh = Math.round(7 + ph * 3), fx = bx + dx * s + (2 + f * 7) * u, fy = by + dy * s + (15 - hh) * u;
              g.fillStyle = '#d02010'; g.fillRect(fx, fy, 6 * u, hh * u);
              g.fillStyle = '#ff8010'; g.fillRect(fx + u, fy + 2 * u, 4 * u, (hh - 2) * u);
              g.fillStyle = '#ffe040'; g.fillRect(fx + 2 * u, fy + 4 * u, 2 * u, Math.max(1, hh - 4) * u);
            }
          } else if (st2.t !== 'park' && !CAP[st2.t] && (!st2.pw || (ZONE[st2.t] && !st2.rd)) && ts >= 8) {
            const ix = bx + 2 * u, iy = by + 2 * u;
            g.fillStyle = '#000'; g.fillRect(ix - u, iy - u, 7 * u, 9 * u);
            if (!st2.pw) { g.fillStyle = '#c00000'; g.fillRect(ix, iy, 5 * u, 7 * u); pix(BOLT, ix, iy, u, '#ffe040'); }
            else { g.fillStyle = '#fff'; g.fillRect(ix, iy, 5 * u, 7 * u); g.fillStyle = '#505050'; g.fillRect(ix + u, iy, 3 * u, 7 * u); g.fillStyle = '#ffe040'; g.fillRect(ix + 2 * u, iy + u, u, 2 * u); g.fillRect(ix + 2 * u, iy + 4 * u, u, 2 * u); }
          }
        }
        // hamster
        if (hamster) { const fr = TS.ham[Math.floor(hamster.f / 180) % 2]; g.drawImage(fr, X(hamster.x - 1), Y(hamster.y - 1.3), 2 * s, 2 * s); }
        // hover preview (mouse)
        if (hover && tool !== 'hand' && !c.over && !dlgOpen) {
          const z = TOOL[tool].line || tool === 'query' ? 1 : SIZE[tool], o = (z - 1) >> 1, hx = hover.x - o, hy = hover.y - o;
          const ok = tool === 'query' || TOOL[tool].line ? true : canPlace(tool, hover.x, hover.y) && (tool !== 'sun' || sunOK());
          g.fillStyle = ok ? 'rgba(255,255,255,0.25)' : 'rgba(255,0,0,0.35)'; g.fillRect(X(hx), Y(hy), z * s, z * s);
          g.strokeStyle = ok ? '#ffffff' : '#ff2020'; g.lineWidth = Math.max(1, dpr); g.strokeRect(X(hx) + 0.5, Y(hy) + 0.5, z * s - 1, z * s - 1);
        }
        // fireworks
        for (const p of parts) { g.fillStyle = p.col; g.globalAlpha = Math.min(1, p.life); g.fillRect(Math.round(p.x * dpr), Math.round(p.y * dpr), 2 * dpr, 2 * dpr); }
        g.globalAlpha = 1;
        // minimap
        if (prefs.mini) {
          if (miniDirty) drawMini();
          const m = mini.clientWidth || 120, k = m / N;
          vbox.style.left = (2 + clamp(cam.x, 0, N) * k) + 'px'; vbox.style.top = (2 + clamp(cam.y, 0, N) * k) + 'px';
          vbox.style.width = Math.min(m, (cw / ts) * k) + 'px'; vbox.style.height = Math.min(m, (ch / ts) * k) + 'px';
        }
      }
      const MC = { R: [60, 210, 60], C: [70, 130, 255], I: [235, 205, 40], coal: [110, 70, 50], sun: [40, 60, 150], park: [140, 230, 110], police: [40, 70, 200], firest: [220, 40, 40], school: [230, 190, 120] };
      function drawMini() {
        miniDirty = false;
        const id = mg.createImageData(N, N), d = id.data;
        for (let i = 0; i < N * N; i++) {
          let col; const k = tile[i];
          if (flood[i]) col = [80, 130, 240];
          else if (k === 4) { const s = S.get(sid[i]); col = s.fire ? [255, 120, 0] : MC[s.t]; if (ZONE[s.t]) { const f = 1.25 - s.lvl * 0.14; col = col.map(v => Math.min(255, v * f)); } }
          else if (k === 1 || k === 3) col = [70, 70, 70];
          else if (k === 2) col = [200, 170, 90];
          else col = terr[i] === 1 ? [40, 88, 200] : terr[i] === 2 ? [30, 100, 30] : terr[i] === 3 ? [120, 100, 80] : [72, 162, 58];
          d[i * 4] = col[0]; d[i * 4 + 1] = col[1]; d[i * 4 + 2] = col[2]; d[i * 4 + 3] = 255;
        }
        mg.putImageData(id, 0, 0);
      }

      /* ----- input ----- */
      const ptrs = new Map();
      let mode = null, moved = 0, downTile = null, tapAct = false, pinch = null;
      function tileAt(e) {
        const r = cv.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
        return { x: Math.floor(cam.x + px / ts), y: Math.floor(cam.y + py / ts), px, py };
      }
      cv.addEventListener('contextmenu', e => e.preventDefault());
      cv.addEventListener('pointerdown', e => {
        if (!c) return;
        try { cv.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (ptrs.size === 2) {
          const [a, b] = [...ptrs.values()];
          pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1 }; mode = 'pinch'; lineLast = null; return;
        }
        if (ptrs.size > 2) return;
        moved = 0; tapAct = false; downTile = tileAt(e);
        const mouse = e.pointerType === 'mouse';
        if (mouse && e.button !== 0) { mode = 'pan'; return; }
        if (c.over) { mode = 'pan'; return; }
        if (tool === 'hand') { mode = 'pan'; tapAct = !mouse; }
        else if (TOOL[tool].line) { mode = 'line'; lineLast = null; lineTo(downTile); }
        else if (mouse) { mode = null; act(downTile); }
        else { mode = 'pan'; tapAct = true; }
      });
      cv.addEventListener('pointermove', e => {
        const p = ptrs.get(e.pointerId);
        if (e.pointerType === 'mouse') { const t = tileAt(e); if (!hover || hover.x !== t.x || hover.y !== t.y) { hover = t; need(); } }
        if (!p) return;
        const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
        if (mode === 'pinch' && ptrs.size === 2) {
          const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y) || 1, r = cv.getBoundingClientRect();
          const mx = (a.x + b.x) / 2 - r.left, my = (a.y + b.y) / 2 - r.top;
          cam.x -= dx / 2 / ts; cam.y -= dy / 2 / ts; clampCam(); need();
          if (d / pinch.d > 1.35) { zoomStep(1, mx, my); pinch.d = d; } else if (d / pinch.d < 0.74) { zoomStep(-1, mx, my); pinch.d = d; }
        } else if (mode === 'pan') {
          moved += Math.abs(dx) + Math.abs(dy);
          cam.x -= dx / ts; cam.y -= dy / ts; clampCam(); need();
        } else if (mode === 'line') lineTo(tileAt(e));
      });
      const up = e => {
        if (!ptrs.has(e.pointerId)) return;
        ptrs.delete(e.pointerId);
        if (mode === 'pan' && tapAct && moved < 10 && e.type === 'pointerup') act(downTile);
        if (mode === 'pinch') { mode = ptrs.size ? 'none' : null; return; }
        if (!ptrs.size) { mode = null; lineLast = null; }
      };
      cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
      cv.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse' && hover) { hover = null; need(); } });
      cv.addEventListener('wheel', e => { e.preventDefault(); const t = tileAt(e); zoomStep(e.deltaY < 0 ? 1 : -1, t.px, t.py); }, { passive: false });
      const miniJump = e => { const r = mini.getBoundingClientRect(), k = N / r.width; cam.x = (e.clientX - r.left) * k - cw / ts / 2; cam.y = (e.clientY - r.top) * k - ch / ts / 2; clampCam(); need(); };
      mini.addEventListener('pointerdown', e => { e.stopPropagation(); try { mini.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ } miniJump(e); });
      mini.addEventListener('pointermove', e => { if (e.buttons) miniJump(e); });
      root.addEventListener('pointerdown', () => { if (minPaused) setSpeed(minSpeed); need(); }, true);

      W.onKey = e => {
        if (e.target && e.target.closest && e.target.closest('input,select,textarea')) return;
        const k = e.key;
        if (k === 'Escape') { if (dlgOpen && dlgOpen.closable) closeDlg(); else if (qPanel) closeQuery(); else setTool('hand'); return; }
        if (dlgOpen || !c) return;
        const step = Math.max(2, Math.round(80 / ts));
        if (k === 'ArrowLeft') cam.x -= step; else if (k === 'ArrowRight') cam.x += step; else if (k === 'ArrowUp') cam.y -= step; else if (k === 'ArrowDown') cam.y += step;
        else if (k === '+' || k === '=') zoomStep(1); else if (k === '-' || k === '_') zoomStep(-1);
        else if (k === ' ') setSpeed(speed ? 0 : 2);
        else if (/^[0-3]$/.test(k)) setSpeed(+k);
        else { const t = TOOLS.find(t2 => t2.key === k.toLowerCase()); if (t && !e.ctrlKey && !e.metaKey && !e.altKey) setTool(t.id); else return; }
        e.preventDefault(); clampCam(); need();
      };

      /* ----- lifecycle ----- */
      const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => resize()) : null;
      if (ro) ro.observe(mapEl);
      W.onResize = resize;
      W.onMin = () => { if (speed) { minSpeed = speed; speed = 0; minPaused = true; schedule(); hud(); } };
      W.onClose = () => {
        alive = false; clearTimeout(timer); clearTimeout(flashTimer); clearTimeout(bannerTimer);
        if (raf) cancelAnimationFrame(raf); raf = 0;
        if (ro) ro.disconnect();
        tkSpan.removeEventListener('animationend', tickNext);
        if (c) saveCity(true);
        savePrefs();
      };

      resize();
      setTool('hand');
      const last = +api.load('last', 0) || 0;
      if (!(last && loadSlot(last))) {
        newCity({ name: 'Tiny Town', seed: '12345', slot: 1, diff: 1 });
        c.temp = true;
        newCityDlg(true);
      }
      setTimeout(resize, 0);
    }
  });
})();
