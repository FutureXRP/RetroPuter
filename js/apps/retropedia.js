/* RetroPedia 95: an original multimedia encyclopedia on CD-ROM, built into the 1995 computer.
   49 illustrated articles with sounds and animations, category browser, A-Z index, search,
   history, a timeline of inventions and a quiz. */
(function () {
  let quizPaid = false; // the quiz prize pays at most once per session (page load)

  /* ---------- tiny SVG helpers (viewBox 0 0 120 80) ---------- */
  const r = (x, y, w, h, f, e = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${f}"${e}/>`;
  const c = (x, y, rad, f, e = '') => `<circle cx="${x}" cy="${y}" r="${rad}" fill="${f}"${e}/>`;
  const el = (x, y, rx, ry, f, e = '') => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${f}"${e}/>`;
  const pg = (pts, f, e = '') => `<polygon points="${pts}" fill="${f}"${e}/>`;
  const pa = (d, f, e = '') => `<path d="${d}" fill="${f}"${e}/>`;
  const ln = (d, s, w = 2, e = '') => `<path d="${d}" fill="none" stroke="${s}" stroke-width="${w}" stroke-linecap="round"${e}/>`;
  const g = (cls, inner, e = '') => `<g class="${cls}"${e}>${inner}</g>`;
  const STARS = [[8, 8], [20, 62], [34, 14], [50, 72], [70, 6], [96, 66], [110, 22], [104, 48], [14, 36], [84, 26], [40, 50], [116, 8]].map(([x, y]) => r(x, y, 1, 1, '#fff')).join('');
  const SPACE = r(0, 0, 120, 80, '#070b24') + STARS;
  const rays = (cx, cy, r1, r2, n, f) => { let s = ''; for (let i = 0; i < n; i++) { const a = i * 2 * Math.PI / n, d = 0.16; const p = [[r1, a - d], [r2, a], [r1, a + d]].map(([rr, aa]) => (cx + rr * Math.cos(aa)).toFixed(1) + ',' + (cy + rr * Math.sin(aa)).toFixed(1)).join(' '); s += pg(p, f); } return s; };
  const OUT = ' stroke="#333" stroke-width="1"';

  const ART = {
    elephant: () => r(0, 0, 120, 80, '#9fd8ff') + r(0, 60, 120, 20, '#d8b26a') + c(106, 14, 7, '#ffe066') +
      ln('M33 38 q-6 6 -4 14', '#7d7d88', 2) + r(38, 48, 9, 20, '#7d7d88') + r(50, 52, 9, 17, '#737380') + r(64, 52, 9, 17, '#737380') + r(74, 48, 9, 20, '#7d7d88') +
      el(58, 42, 26, 16, '#8c8c96') + c(86, 32, 13, '#8c8c96') + el(80, 34, 9, 13, '#767682') + c(92, 28, 1.6, '#111') +
      g('mv', pa('M94 34 q10 4 9 18 q0 6 4 10 l-5 2 q-5 -5 -5 -12 q1 -10 -6 -14z', '#8c8c96'), ' style="transform-origin:96px 34px;transform-box:view-box"') + pa('M94 40 q4 6 10 4 q-6 -1 -8 -6z', '#fffbe8'),
    whale: () => r(0, 0, 120, 80, '#1f5fa8') + r(0, 0, 120, 8, '#4d8fd6') + pg('20,0 30,0 10,80 0,80', '#3a7cc4', ' opacity=".5"') + pg('70,0 78,0 64,80 54,80', '#3a7cc4', ' opacity=".4"') +
      g('mv', pa('M14 44 Q34 26 74 30 Q100 32 106 42 Q100 52 74 54 Q40 58 14 44z', '#5d7fa8') + pa('M40 52 Q70 56 100 46 Q98 50 74 54 Q54 56 40 52z', '#9bb3cc') + pg('16,44 2,34 6,44 2,54', '#5d7fa8') + pg('66,50 60,62 76,52', '#4b6b92') + c(94, 42, 1.5, '#111') + ln('M60 52 Q80 52 98 47', '#7f9bbb', 1)) +
      c(108, 26, 2, 'none', ' stroke="#cfe8ff"') + c(112, 18, 1.5, 'none', ' stroke="#cfe8ff"') + c(106, 12, 2.5, 'none', ' stroke="#cfe8ff"'),
    cheetah: () => r(0, 0, 120, 80, '#ffe39a') + r(0, 58, 120, 22, '#c9a64a') + r(12, 30, 3, 28, '#6b4a2a') + el(14, 28, 14, 5, '#5c7d2a') +
      g('mv', ln('M37 40 q-14 2 -18 12', '#e3b04b', 3) + r(40, 44, 4, 16, '#e3b04b') + r(48, 46, 4, 14, '#d6a23f') + r(68, 46, 4, 14, '#d6a23f') + r(76, 44, 4, 16, '#e3b04b') +
        el(58, 40, 22, 8, '#e8b651') + el(58, 44, 16, 3, '#f7e2b0') + c(80, 27, 2.5, '#e8b651') + c(88, 27, 2.5, '#e8b651') + c(84, 34, 8, '#e8b651') + el(89, 37, 4, 3, '#f7e2b0') + c(92, 35, 1.2, '#222') + c(86, 32, 1.2, '#222') + ln('M86 33 q1 4 3 6', '#222', 1) +
        [[44, 37], [50, 40], [56, 36], [62, 41], [68, 37], [74, 40], [52, 34], [64, 34], [46, 42], [70, 43], [79, 38]].map(([x, y]) => c(x, y, 1.3, '#3b2a12')).join('')),
    penguin: () => r(0, 0, 120, 80, '#bfe3ff') + pg('0,60 20,48 44,60 70,46 100,58 120,50 120,80 0,80', '#e6f4ff') + r(0, 64, 120, 16, '#fff') +
      g('mv', el(45, 42, 4, 13, '#1c1c2b') + el(75, 42, 4, 13, '#1c1c2b') + el(60, 42, 15, 24, '#1c1c2b') + el(60, 46, 10, 19, '#fbfbf5') + c(60, 20, 10, '#1c1c2b') + el(52, 25, 3, 5, '#f5b400') + el(68, 25, 3, 5, '#f5b400') +
        c(56, 18, 1.4, '#fff') + c(64, 18, 1.4, '#fff') + pg('58,22 66,25 58,26', '#e07b00') + el(55, 66, 5, 2, '#e07b00') + el(65, 66, 5, 2, '#e07b00'), ' style="transform-origin:60px 68px;transform-box:view-box"') +
      el(90, 64, 6, 6, '#9a9aa6') + c(90, 55, 5, '#9a9aa6') + c(90, 56, 3, '#fff') + c(89, 55, .8, '#111') + c(91.5, 55, .8, '#111'),
    honeybee: () => r(0, 0, 120, 80, '#bfeaff') + r(0, 62, 120, 18, '#5caa3a') + ln('M18 62 v-6', '#2e7d32', 1.5) + c(18, 54, 5, '#ff6fa8') + c(18, 54, 2, '#ffe000') + ln('M100 64 v-4', '#2e7d32', 1.5) + c(100, 58, 5, '#fff') + c(100, 58, 2, '#fc0') + c(78, 70, 4, '#b36bff') + c(78, 70, 1.5, '#ffe000') +
      g('mv', el(58, 22, 7, 11, '#eaf7ff', ' opacity=".9" stroke="#8fb3c7"') + el(69, 23, 6, 10, '#eaf7ff', ' opacity=".9" stroke="#8fb3c7"'), ' style="transform-origin:62px 32px;transform-box:view-box"') +
      r(46, 33, 6, 14, '#f2c200') + r(52, 30, 6, 20, '#222') + r(58, 29, 6, 22, '#f2c200') + r(64, 29, 6, 22, '#222') + r(70, 31, 6, 18, '#f2c200') + r(76, 35, 4, 10, '#222') + pg('80,38 85,40 80,42', '#222') +
      c(42, 40, 7, '#333') + c(40, 38, 2.2, '#555') + ln('M40 34 l-6 -8', '#222', 1.5) + ln('M44 34 l-2 -9', '#222', 1.5) + ln('M52 50 l-3 6 M60 51 l0 6 M68 50 l3 6', '#222', 1.2),
    owl: () => r(0, 0, 120, 80, '#16204a') + STARS + c(100, 16, 8, '#f6f0c8') + r(16, 64, 90, 6, '#6b4423') +
      pg('44,12 50,24 40,24', '#7a4d24') + pg('76,12 80,24 70,24', '#7a4d24') + el(60, 44, 19, 22, '#8a5a2b') + el(60, 32, 16, 12, '#c79a63') + el(60, 52, 11, 12, '#d9b88a') +
      ln('M55 48 l2 2 l2 -2 M61 48 l2 2 l2 -2 M58 55 l2 2 l2 -2', '#8a5a2b', 1) +
      c(53, 32, 6, '#ffd23f') + c(67, 32, 6, '#ffd23f') + c(53, 32, 3, '#111') + c(67, 32, 3, '#111') + c(52, 31, 1, '#fff') + c(66, 31, 1, '#fff') +
      g('mv rp-lid', el(53, 32, 6.6, 6.6, '#9a6a3b') + el(67, 32, 6.6, 6.6, '#9a6a3b')) + pg('57,37 63,37 60,43', '#e3a21a') + r(52, 64, 6, 3, '#e3a21a') + r(62, 64, 6, 3, '#e3a21a'),
    frog: () => r(0, 0, 120, 80, '#b6e6ff') + r(0, 54, 120, 26, '#2f7fbf') + ln('M10 54 v-20 M14 54 v-14 M108 54 v-18', '#3d8b3d', 2) + el(10, 32, 2, 5, '#7a4a22') + el(108, 34, 2, 5, '#7a4a22') + el(60, 68, 36, 6, '#3f9e3a') + pg('60,68 76,62 80,66', '#2f7fbf') +
      g('mv', el(46, 58, 9, 5, '#2e9e3e') + el(74, 58, 9, 5, '#2e9e3e') + el(60, 54, 16, 10, '#39b54a') + el(60, 58, 10, 5, '#bff0a0') + c(52, 44, 5.5, '#39b54a') + c(68, 44, 5.5, '#39b54a') +
        c(52, 43, 3.5, '#fff') + c(68, 43, 3.5, '#fff') + c(52, 43, 1.8, '#111') + c(68, 43, 1.8, '#111') + ln('M50 53 q10 5 20 0', '#1c6b28', 1.2) + el(52, 63, 4, 2, '#2e9e3e') + el(68, 63, 4, 2, '#2e9e3e')),
    octopus: () => r(0, 0, 120, 80, '#12608f') + r(0, 68, 120, 12, '#e0c483') + ln('M12 80 q-4 -10 2 -20 q4 -10 -2 -20', '#2e8b57', 3) + ln('M108 80 q4 -10 -2 -20 q-4 -8 2 -16', '#2e8b57', 3) +
      g('mv', ['M50 40 q-12 12 -22 14', 'M52 42 q-8 14 -16 22', 'M55 44 q-4 14 -8 24', 'M58 44 q-1 14 -2 26', 'M62 44 q1 14 2 26', 'M65 44 q4 14 8 24', 'M68 42 q8 14 16 22', 'M70 40 q12 12 22 14'].map(d => ln(d, '#d9534f', 5)).join(''), ' style="transform-origin:60px 40px;transform-box:view-box"') +
      el(60, 28, 16, 17, '#e0605b') + c(54, 22, 2, '#c94844') + c(66, 18, 1.5, '#c94844') + el(54, 33, 3, 4, '#fff') + el(66, 33, 3, 4, '#fff') + r(53, 33, 2, 3, '#111') + r(65, 33, 2, 3, '#111') +
      c(84, 16, 2, 'none', ' stroke="#bfe6ff"') + c(88, 8, 3, 'none', ' stroke="#bfe6ff"'),
    sun: () => SPACE + c(60, 40, 34, '#ff9a1a', ' opacity=".3"') + g('mv', rays(60, 40, 23, 36, 12, '#ffb81f')) + c(60, 40, 23, '#ffd21f') + c(60, 40, 16, '#ffe766') + c(52, 36, 2, '#e0a000') + c(66, 46, 1.5, '#e0a000'),
    moon: () => r(0, 0, 120, 80, '#05051a') + STARS + c(98, 16, 8, '#2d6fd1') + el(96, 14, 3, 4, '#3fa34d') + el(101, 19, 2, 2, '#3fa34d') + el(94, 11, 3, 1, '#fff', ' opacity=".8"') +
      pa('M0 56 Q30 50 60 56 T120 54 V80 H0z', '#a9a9a9') + el(20, 66, 8, 2, '#8d8d8d') + el(84, 72, 10, 2.5, '#8d8d8d') + el(58, 62, 5, 1.5, '#8d8d8d') +
      ln('M20 48 l-4 10 M32 48 l4 10', '#bbb', 1.5) + r(18, 38, 16, 10, '#e0b000') + r(20, 32, 12, 6, '#ccc') + r(14, 58, 4, 1, '#ccc') + r(34, 58, 4, 1, '#ccc') +
      ln('M70 30 v26', '#ddd', 1) + r(71, 30, 12, 7, '#fff') + r(71, 31, 12, 1, '#c22') + r(71, 33, 12, 1, '#c22') + r(71, 35, 12, 1, '#c22') + r(71, 30, 5, 4, '#23408e') +
      g('mv', r(84, 46, 4, 8, '#ddd') + r(87, 45, 10, 10, '#f4f4f4') + c(92, 40, 5, '#fff') + el(93, 40, 3, 2.5, '#d4a017') + r(88, 55, 3, 6, '#f4f4f4') + r(93, 55, 3, 6, '#f4f4f4') + r(97, 46, 5, 2, '#f4f4f4')),
    mars: () => SPACE + c(60, 40, 28, '#c1440e') + el(50, 34, 8, 4, '#9c3208') + el(70, 50, 10, 4, '#a43a0c') + el(66, 28, 5, 3, '#e06a2a') + el(60, 14, 9, 3, '#fff5ee') + c(46, 48, 3, '#8a2e08') +
      g('mv rp-orb', c(100, 40, 2, '#9e8b7a') + c(24, 30, 1.5, '#b0a090')),
    jupiter: () => SPACE + c(60, 40, 30, '#d9a86c') + el(60, 22, 23, 2.5, '#b5793f') + el(60, 31, 28, 2.5, '#f0d6a8') + el(60, 37, 29.5, 2, '#a86a35') + el(60, 46, 29, 2.5, '#c48850') + el(60, 55, 25, 2, '#f0d6a8') + el(60, 62, 19, 2, '#b5793f') +
      el(72, 50, 6, 3.5, '#b8412a') + g('mv rp-orb', c(100, 38, 2, '#e9d98a') + c(18, 44, 2, '#ccc') + c(108, 44, 1.5, '#b89c7a') + c(12, 36, 2, '#9aa')),
    saturn: () => SPACE + c(104, 16, 3, '#d99b3a') + g('mv', g('', el(60, 40, 44, 10, 'none', ' stroke="#cdb98a" stroke-width="4"') + el(60, 40, 36, 7, 'none', ' stroke="#a8966a" stroke-width="2"') + c(60, 40, 20, '#e3c16f') + el(60, 34, 18, 2, '#cfa956') + el(60, 45, 19, 2, '#d8b25f') +
      ln('M16 40 A44 10 0 0 0 104 40', '#cdb98a', 4) + ln('M24 40 A36 7 0 0 0 96 40', '#a8966a', 2), ' transform="rotate(-15 60 40)"'), ' style="transform-origin:60px 40px;transform-box:view-box"'),
    pluto: () => SPACE + c(12, 12, 5, '#fff7c0', ' opacity=".35"') + c(12, 12, 2.5, '#fff7c0') + c(52, 44, 20, '#cbb79c') + el(46, 40, 7, 5, '#a58c6c') + el(60, 52, 6, 3, '#e8ddd0') + el(58, 34, 4, 3, '#b39d80') +
      c(94, 26, 9, '#9d9d9d') + el(92, 24, 3, 2, '#7d7d7d') + g('mv', c(30, 70, 1.2, '#fff') + c(80, 60, 1.2, '#fff') + c(110, 40, 1.2, '#fff') + c(28, 22, 1.2, '#fff')),
    shuttle: () => r(0, 0, 120, 80, '#6fb6ff') + r(0, 40, 120, 30, '#9fd0ff') + r(0, 70, 120, 10, '#6b6b6b') + r(88, 22, 6, 48, '#b33') + ln('M88 30 l6 6 M88 40 l6 6 M88 50 l6 6 M88 60 l6 6', '#822', 1) +
      g('mv', g('rp-fx', pg('52,64 60,80 68,64', '#ffcc00') + pg('43,64 47,80 51,64', '#ff8800') + pg('69,64 73,80 77,64', '#ff8800')) + pa('M54 26 Q60 10 66 26 V64 H54z', '#d9731f') +
        r(44, 24, 6, 40, '#f4f4f4') + pg('44,24 47,15 50,24', '#f4f4f4') + r(70, 24, 6, 40, '#f4f4f4') + pg('70,24 73,15 76,24', '#f4f4f4') +
        pa('M55 32 Q60 20 65 32 V60 H55z', '#fff', OUT) + pa('M56 29 Q60 20 64 29z', '#222') + pg('55,48 46,62 55,62', '#fff', OUT) + pg('65,48 74,62 65,62', '#fff', OUT) + r(57, 32, 6, 2, '#223') + r(56, 60, 8, 3, '#555')),
    milkyway: () => r(0, 0, 120, 80, '#050318') + STARS + g('mv rp-orb', c(60, 40, 22, '#6a5acd', ' opacity=".2"') + ln('M60 40 Q84 22 104 36', '#cbbcff', 6, ' opacity=".35"') + ln('M60 40 Q36 58 16 44', '#cbbcff', 6, ' opacity=".35"') +
      ln('M60 40 Q78 62 96 56', '#9f8cff', 4, ' opacity=".35"') + ln('M60 40 Q42 18 24 24', '#9f8cff', 4, ' opacity=".35"') + [[92, 30], [30, 52], [84, 56], [34, 22], [72, 34], [48, 46]].map(([x, y]) => c(x, y, .9, '#fff')).join('') + c(60, 40, 11, '#ffd98a', ' opacity=".5"') + c(60, 40, 6, '#fff6d0')),
    wheel: () => r(0, 0, 120, 80, '#f2dca8') + r(0, 66, 120, 14, '#b08850') + g('mv', c(60, 38, 26, 'none', ' stroke="#7a4a1c" stroke-width="7"') + [0, 45, 90, 135].map(a => ln(`M${(60 - 24 * Math.cos(a * Math.PI / 180)).toFixed(1)} ${(38 - 24 * Math.sin(a * Math.PI / 180)).toFixed(1)} L${(60 + 24 * Math.cos(a * Math.PI / 180)).toFixed(1)} ${(38 + 24 * Math.sin(a * Math.PI / 180)).toFixed(1)}`, '#8b5a2b', 3)).join('') + c(60, 38, 6, '#5a3512') + c(60, 38, 2, '#2a1a08')),
    printing: () => r(0, 0, 120, 80, '#e8d3a2') + r(0, 70, 120, 10, '#8b6a3a') + r(26, 8, 6, 62, '#6b4423') + r(88, 8, 6, 62, '#6b4423') + r(26, 8, 68, 6, '#6b4423') + r(26, 56, 68, 6, '#7a5230') +
      r(58, 14, 4, 12, '#777') + r(46, 18, 28, 3, '#555') + r(42, 46, 36, 10, '#fffdf0') + r(45, 48, 30, 1, '#222') + r(45, 51, 26, 1, '#222') + r(45, 54, 28, 1, '#222') + g('mv', r(40, 26, 40, 8, '#8b5a2b') + r(58, 24, 4, 3, '#777')),
    telephone: () => r(0, 0, 120, 80, '#f4e6c8') + [10, 30, 50, 70, 90, 110].map(x => r(x, 0, 6, 66, '#ecd8b0')).join('') + r(0, 66, 120, 14, '#8b5a2b') +
      g('rp-fx', ln('M34 18 l-8 -4 M32 28 l-9 0 M86 18 l8 -4 M88 28 l9 0', '#c22', 2)) +
      g('mv', el(52, 64, 14, 4, '#222') + r(50, 26, 5, 38, '#222') + pa('M44 16 h16 l-4 8 h-8z', '#222') + r(55, 32, 9, 2, '#444') + r(64, 30, 4, 16, '#222') + el(66, 46, 5, 3, '#222') + ln('M66 48 q12 12 -6 16', '#222', 1.5), ' style="transform-origin:52px 66px;transform-box:view-box"'),
    lightbulb: () => r(0, 0, 120, 80, '#1d1d3a') + g('mv', c(60, 32, 34, '#fff3a0', ' opacity=".45"') + c(60, 32, 26, '#fff7c2', ' opacity=".6"'), ' style="opacity:.12"') +
      c(60, 32, 18, '#f6f6ff', ' opacity=".85"') + pa('M50 44 Q54 50 53 54 H67 Q66 50 70 44z', '#f6f6ff', ' opacity=".85"') + ln('M56 54 L56 34 M64 54 L64 34', '#888', 1) + ln('M56 34 l2 -3 l2 3 l2 -3 l2 3', '#ff9d00', 1.5) +
      r(53, 54, 14, 4, '#aaa') + r(53, 58, 14, 3, '#888') + r(53, 61, 14, 3, '#aaa') + r(56, 64, 8, 3, '#555'),
    airplane: () => r(0, 0, 120, 80, '#a8d8ff') + el(20, 14, 12, 4, '#fff') + el(96, 10, 14, 4, '#fff') + pa('M0 64 Q30 56 60 64 T120 62 V80 H0z', '#e8d49a') +
      g('mv', r(24, 28, 72, 3, '#f3ead2', ' stroke="#8a7a5a" stroke-width=".6"') + r(24, 40, 72, 3, '#f3ead2', ' stroke="#8a7a5a" stroke-width=".6"') + ln('M28 31 v9 M40 31 v9 M52 31 v9 M68 31 v9 M80 31 v9 M92 31 v9', '#6b5a3a', 1) +
        r(6, 32, 12, 2, '#f3ead2', ' stroke="#8a7a5a" stroke-width=".5"') + r(6, 37, 12, 2, '#f3ead2', ' stroke="#8a7a5a" stroke-width=".5"') + ln('M18 33 L28 34 M18 38 L28 40', '#6b5a3a', .8) + r(102, 30, 2, 12, '#f3ead2', ' stroke="#8a7a5a" stroke-width=".5"') + ln('M96 34 L102 36', '#6b5a3a', .8) +
        el(58, 39, 5, 1.8, '#333') + el(70, 36, 1.5, 6, '#6b5a3a') + el(78, 36, 1.5, 6, '#6b5a3a')),
    television: () => r(0, 0, 120, 80, '#e9d7b4') + r(0, 70, 120, 10, '#a67c52') + ln('M60 18 L46 4 M60 18 L76 4', '#444', 1.5) + c(60, 18, 3, '#333') +
      r(28, 18, 64, 48, '#7a4a22', ' rx="4"') + r(34, 24, 40, 32, '#333', ' rx="6"') +
      g('mv', ['#fff', '#ff0', '#0ff', '#0f0', '#f0f', '#f00', '#00f'].map((col, i) => r(36 + i * 5.2, 26, 5.2, 28, col)).join('')) +
      c(82, 30, 3, '#d9c08a') + c(82, 40, 3, '#d9c08a') + r(78, 48, 10, 1, '#3a220f') + r(78, 51, 10, 1, '#3a220f') + r(78, 54, 10, 1, '#3a220f') + r(34, 66, 4, 6, '#5a3515') + r(82, 66, 4, 6, '#5a3515'),
    computer: () => { let s = r(0, 0, 120, 80, '#d8d4c4') + r(0, 68, 120, 12, '#9a8f78'); for (let i = 0; i < 4; i++) { s += r(6 + i * 28, 8, 26, 60, '#2b2b2b') + r(8 + i * 28, 10, 22, 56, '#3a3a3a') + c(14 + i * 28, 56, 3, '#ccc') + c(24 + i * 28, 56, 3, '#ccc'); for (let y = 0; y < 5; y++) for (let x = 0; x < 4; x++) s += c(12 + i * 28 + x * 5, 16 + y * 7, 1.6, (x + y) % 3 ? '#ffcc33' : '#ff5a3a', ` class="${(x + y + i) % 2 ? 'mv' : 'mv2'}"`); } return s + ln('M20 66 q10 8 30 0 M70 66 q10 8 30 0', '#111', 1.5); },
    cd: () => r(0, 0, 120, 80, '#1b1b4a') + STARS + g('mv', c(60, 40, 32, '#d9dbe6') + c(60, 40, 26, 'none', ' stroke="#ff7ad9" stroke-width="4" opacity=".5" stroke-dasharray="22 60"') + c(60, 40, 21, 'none', ' stroke="#7af0ff" stroke-width="4" opacity=".5" stroke-dasharray="18 40"') + c(60, 40, 16, 'none', ' stroke="#ffe97a" stroke-width="3" opacity=".55" stroke-dasharray="12 30"') + c(60, 40, 10, '#eef', ' stroke="#bbb"') + c(60, 40, 5, '#1b1b4a')),
    internet: () => r(0, 0, 120, 80, '#0d1b3d') + STARS + [[20, 18, 44, 30], [100, 14, 74, 24], [108, 56, 82, 48], [14, 62, 40, 52], [60, 6, 60, 14], [60, 76, 60, 66]].map(([a, b, x, y]) => ln(`M${a} ${b} L${x} ${y}`, '#7fb2ff', 1)).join('') +
      c(60, 40, 26, '#2a6fdb') + el(50, 32, 8, 6, '#3fa34d') + el(68, 46, 7, 9, '#3fa34d') + el(70, 28, 5, 4, '#3fa34d') + el(46, 50, 4, 5, '#3fa34d') + el(60, 40, 26, 10, 'none', ' stroke="#9cc4ff" opacity=".5"') + el(60, 40, 10, 26, 'none', ' stroke="#9cc4ff" opacity=".5"') +
      g('mv', [[20, 18], [100, 14], [108, 56], [14, 62], [60, 6], [60, 76]].map(([x, y]) => c(x, y, 2.5, '#ffe000')).join('')),
    everest: () => r(0, 0, 120, 80, '#7ec0ff') + el(22, 16, 12, 3, '#fff') + el(96, 22, 10, 3, '#fff') + pg('0,70 22,40 40,58 60,14 80,52 96,34 120,62 120,80 0,80', '#6f7c8f') + pg('52,28 60,14 68,28 64,26 60,31 56,26', '#fff') +
      pg('17,47 22,40 27,47', '#fff') + pg('91,41 96,34 101,41', '#fff') + pa('M0 72 Q40 62 80 72 T120 70 V80 H0z', '#4d5a4a') + ln('M60 14 V5', '#333', 1) + g('mv', r(60, 5, 7, 4, '#e33'), ' style="transform-origin:60px 7px;transform-box:view-box"') +
      g('rp-fx', ln('M70 12 h10 M74 18 h12 M40 20 h-10', '#fff', 1)),
    volcano: () => r(0, 0, 120, 80, '#ffcf9a') + r(0, 68, 120, 12, '#5a4a3a') + c(56, 14, 6, '#9a9a9a') + c(64, 9, 7, '#aaa') + c(71, 15, 5, '#999') + pg('14,72 50,24 70,24 106,72', '#6b4a35') + el(60, 24, 10, 2.5, '#3a2618') +
      pa('M56 24 L52 40 L55 38 L50 56 L54 52 Z', '#ff5a1f') + pa('M64 24 L68 36 L66 36 L72 50 Z', '#ff7a1f') + g('mv', c(58, 18, 2.5, '#ff5a1f') + c(63, 14, 2, '#ffb000') + c(54, 12, 2, '#ff7a1f') + c(66, 20, 2, '#ff5a1f')),
    ocean: () => { let w = 'M-20 36'; for (let x = -20; x < 140; x += 10) w += ' q2.5 -3 5 0 t5 0'; return r(0, 0, 120, 34, '#9fd8ff') + c(98, 14, 7, '#ffe066') + r(0, 34, 120, 46, '#1e6fb8') + r(0, 60, 120, 20, '#155a99') + g('mv', ln(w, '#e6f6ff', 1.5) + ln(w.replace('M-20 36', 'M-15 44'), '#8cc6f2', 1)) +
      el(40, 56, 6, 3, '#ffb000') + pg('34,56 30,53 30,59', '#ffb000') + c(43, 55, .8, '#111') + el(82, 68, 5, 2.5, '#ff6f61') + pg('87,68 91,65 91,71', '#ff6f61') + c(79, 67.5, .7, '#111'); },
    rainforest: () => r(0, 0, 120, 80, '#2f6b2f') + r(0, 72, 120, 8, '#3d2a14') + r(20, 24, 5, 50, '#5a3a1a') + r(90, 20, 6, 54, '#5a3a1a') + r(56, 32, 4, 42, '#5a3a1a') +
      c(12, 14, 14, '#1f5a1f') + c(36, 10, 14, '#2e7d32') + c(60, 16, 14, '#1b5e20') + c(86, 8, 14, '#388e3c') + c(110, 16, 14, '#1f5a1f') + pg('0,72 10,58 20,72', '#43a047') + pg('30,72 40,56 50,72', '#43a047') + pg('66,72 76,60 86,72', '#43a047') +
      el(96, 40, 4, 7, '#e02b2b') + c(96, 33, 3.5, '#e02b2b') + pg('98,32 102,34 98,35', '#ffcc00') + c(95, 32, .8, '#111') + pg('95,46 97,46 96,56', '#2b62e0') + el(98, 41, 2, 5, '#ffcc00') +
      g('mv', [[10, 30], [30, 40], [46, 28], [70, 36], [80, 50], [108, 34], [40, 56], [14, 50]].map(([x, y]) => ln(`M${x} ${y} l-1 4`, '#bfe6ff', 1)).join('')),
    desert: () => r(0, 0, 120, 80, '#ffd98a') + g('mv', c(94, 16, 9, '#fff3b0')) + pa('M0 56 Q30 44 60 56 T120 52 V80 H0z', '#e8b865') + pa('M0 66 Q40 56 80 66 T120 64 V80 H0z', '#d9a24f') +
      r(26, 34, 6, 34, '#3b8f3b', ' rx="3"') + r(18, 46, 10, 4, '#3b8f3b') + r(18, 36, 4, 14, '#3b8f3b', ' rx="2"') + r(30, 42, 10, 4, '#3b8f3b') + r(36, 32, 4, 14, '#3b8f3b', ' rx="2"') +
      r(76, 54, 2, 12, '#9a6a30') + r(80, 54, 2, 12, '#9a6a30') + r(88, 54, 2, 12, '#9a6a30') + r(92, 54, 2, 12, '#9a6a30') + el(84, 50, 12, 6, '#b07a3a') + el(82, 44, 6, 5, '#b07a3a') + pa('M94 48 Q100 40 100 34 L104 34 Q104 42 97 52z', '#b07a3a') + el(104, 34, 4, 2.5, '#b07a3a') + c(105, 33, .7, '#111'),
    river: () => r(0, 0, 120, 80, '#7cc86a') + r(0, 0, 120, 14, '#a8dcff') + pg('20,16 34,4 48,16', '#8a9aa8') + pg('30,8 34,4 38,8', '#fff') + pg('60,16 72,6 84,16', '#8a9aa8') +
      ln('M40 14 C 30 30, 80 30, 70 46 S 20 60, 40 80', '#2f86d6', 10) + g('mv', ln('M40 14 C 30 30, 80 30, 70 46 S 20 60, 40 80', '#cfeaff', 1.5, ' stroke-dasharray="4 8"')) +
      [[14, 40], [96, 30], [100, 60], [20, 66], [86, 72]].map(([x, y]) => r(x - 1, y, 2, 5, '#6b4423') + c(x, y - 2, 5, '#2e7d32')).join(''),
    rainbow: () => r(0, 0, 120, 80, '#8fcfff') + pa('M0 70 Q60 60 120 70 V80 H0z', '#5cb85c') + g('mv', ['#e52b2b', '#ff8c1a', '#ffe01a', '#3cc43c', '#2b6fe5', '#4b2bb0', '#8f2bd0'].map((col, i) => { const rr = 46 - i * 4; return ln(`M${60 - rr} 70 A${rr} ${rr} 0 0 1 ${60 + rr} 70`, col, 4, ' stroke-linecap="butt"'); }).join('')) +
      c(14, 68, 8, '#fff') + c(22, 66, 7, '#fff') + c(98, 68, 8, '#fff') + c(106, 66, 7, '#fff'),
    continents: () => r(0, 0, 120, 80, '#2a78c8') + ln('M0 20 H120 M0 40 H120 M0 60 H120 M30 0 V80 M60 0 V80 M90 0 V80', '#5a98dc', .5) +
      g('mvl', pa('M26 18 L44 16 L56 28 L52 42 L44 54 L38 70 L34 60 L32 44 L24 30z', '#4caf50', ' stroke="#2e7d32"')) +
      g('mvr', pa('M64 14 L86 12 L98 22 L96 34 L90 48 L82 62 L76 64 L72 50 L66 36 L58 28 L58 20z', '#8bc34a', ' stroke="#558b2f"')) +
      `<text x="30" y="36" font-size="6" fill="#fff" font-family="Arial">S. America</text><text x="70" y="30" font-size="6" fill="#1b3a0b" font-family="Arial">Africa</text>`,
    heart: () => r(0, 0, 120, 80, '#ffe3ea') + ln('M4 74 H40 l4 -8 l4 14 l4 -10 l3 4 H116', '#2b9e4a', 1.5) + g('mv', r(46, 8, 6, 18, '#3b62c9', ' rx="3"') + ln('M60 24 Q60 8 72 8 Q80 8 80 18', '#d62b3b', 6) +
      pa('M60 68 C 30 50, 30 22, 48 22 C 56 22, 60 28, 60 32 C 60 28, 64 22, 72 22 C 90 22, 90 50, 60 68z', '#d62b3b') + el(48, 32, 5, 3, '#ff7a86')),
    brain: () => r(0, 0, 120, 80, '#dff1ff') + pa('M62 58 Q66 66 64 72 H70 Q70 64 72 58z', '#e7899e') + el(80, 58, 8, 5, '#e7899e') + pa('M34 44 Q30 24 50 20 Q60 12 72 18 Q90 18 90 36 Q96 50 82 56 Q70 64 56 58 Q40 60 34 44z', '#f4a6b8') +
      ln('M44 30 q6 -4 10 2 q6 6 12 0 M40 44 q8 -6 14 2 q6 6 14 -2 q6 -4 12 2 M60 22 q-2 10 4 14 M50 52 q6 -6 12 0 M76 26 q4 6 -2 10', '#d97f95', 1.5) +
      g('mv', [[24, 18], [98, 18], [102, 50], [22, 56]].map(([x, y]) => pg(`${x},${y - 4} ${x + 1.2},${y - 1.2} ${x + 4},${y} ${x + 1.2},${y + 1.2} ${x},${y + 4} ${x - 1.2},${y + 1.2} ${x - 4},${y} ${x - 1.2},${y - 1.2}`, '#ffd000')).join('')),
    bones: () => r(0, 0, 120, 80, '#1d2b52') + g('mv', c(60, 14, 8, '#f4f1e4') + r(55, 19, 10, 5, '#f4f1e4') + c(57, 13, 2, '#1d2b52') + c(63, 13, 2, '#1d2b52') + pg('60,15 59,18 61,18', '#1d2b52') +
      r(59, 24, 2, 28, '#f4f1e4') + ln('M60 28 q-10 0 -10 6 M60 28 q10 0 10 6 M60 33 q-9 0 -9 6 M60 33 q9 0 9 6 M60 38 q-8 0 -8 5 M60 38 q8 0 8 5', '#f4f1e4', 1.8) + el(60, 52, 8, 4, '#f4f1e4') +
      ln('M60 26 L46 30 L40 44 M60 26 L74 30 L80 44', '#f4f1e4', 2.5) + c(40, 45, 2, '#f4f1e4') + c(80, 45, 2, '#f4f1e4') + ln('M56 54 L52 66 L50 75 M64 54 L68 66 L70 75', '#f4f1e4', 3) + r(45, 74, 6, 2, '#f4f1e4') + r(69, 74, 6, 2, '#f4f1e4'), ' style="transform-origin:60px 76px;transform-box:view-box"'),
    teeth: () => r(0, 0, 120, 80, '#d6f0ff') + pa('M44 18 Q52 12 60 18 Q68 12 76 18 Q84 26 78 44 Q74 60 70 66 Q66 68 64 58 Q62 48 60 48 Q58 48 56 58 Q54 68 50 66 Q46 60 42 44 Q36 26 44 18z', '#fffdf6', ' stroke="#b9c7d6" stroke-width="1.5"') + ln('M48 22 q-4 6 -2 14', '#fff', 3) +
      g('', g('mv', r(84, 40, 30, 5, '#2b8be0', ' rx="2"') + r(84, 34, 10, 6, '#fff', ' stroke="#9bb"')), ' transform="rotate(-30 99 42)"') +
      g('mv2', [[30, 20], [90, 16], [34, 60]].map(([x, y]) => pg(`${x},${y - 4} ${x + 1},${y - 1} ${x + 4},${y} ${x + 1},${y + 1} ${x},${y + 4} ${x - 1},${y + 1} ${x - 4},${y} ${x - 1},${y - 1}`, '#fff')).join('')),
    lungs: () => r(0, 0, 120, 80, '#e8f6ff') + r(58, 6, 4, 20, '#c9c9d6') + ln('M60 26 L48 34 M60 26 L72 34', '#c9c9d6', 3) +
      g('mv', pa('M56 28 Q40 22 34 40 Q30 62 42 68 Q54 70 56 60z', '#f28a9a') + pa('M64 28 Q80 22 86 40 Q90 62 78 68 Q66 70 64 60z', '#f28a9a') + ln('M52 34 L44 44 M48 40 L40 40 M68 34 L76 44 M72 40 L80 40', '#d9607a', 1.2)) + ln('M30 72 Q60 62 90 72', '#c0506a', 3),
    eyes: () => r(0, 0, 120, 80, '#f7dcc0') + ln('M26 16 Q60 2 94 16', '#6b4a3a', 3) + el(60, 40, 34, 18, '#fff', ' stroke="#6b4a3a" stroke-width="2"') + c(60, 40, 13, '#2e7fd6') + c(60, 40, 13, 'none', ' stroke="#1d4f8a" stroke-width="2"') + c(60, 40, 6, '#111') + c(55, 35, 2.5, '#fff') +
      g('mv rp-lid', el(60, 40, 35.5, 19.5, '#f0caa8', ' stroke="#6b4a3a"')),
    ears: () => r(0, 0, 120, 80, '#fff4dc') + g('mv', ln('M12 30 q-4 10 0 20 M7 26 q-6 14 0 28', '#2b6fe5', 1.5)) + pa('M40 14 Q20 14 20 38 Q20 52 30 60 Q34 66 40 66 Q46 66 44 58 Q42 52 48 46 Q56 38 54 26 Q52 14 40 14z', '#f2c49b', ' stroke="#c98e5f" stroke-width="1.5"') + ln('M40 22 Q30 22 30 36 Q30 44 36 48', '#c98e5f', 2) +
      ln('M46 40 H70', '#c98e5f', 3) + el(71, 40, 1.5, 5, '#e59a6a') + c(76, 36, 2, '#fff', OUT) + c(80, 38, 2, '#fff', OUT) + c(83, 41, 1.5, '#fff', OUT) + ln('M92 42 a6 6 0 1 1 -6 -6 a4 4 0 1 1 4 4 a2 2 0 1 1 -2 -2', '#d9608a', 2) +
      `<text x="80" y="62" font-size="6" fill="#6b4a3a" font-family="Arial">cochlea</text>`,
    skin: () => r(0, 0, 120, 80, '#fbe3cf') + [0, 1, 2, 3, 4, 5, 6].map(i => el(50, 42, 5 + i * 4, 7 + i * 4.5, 'none', ' stroke="#b77b55" stroke-width="1.5"')).join('') +
      g('mv', c(84, 30, 14, '#fff', ' opacity=".35" stroke="#555" stroke-width="3"') + ln('M94 40 L108 56', '#6b4423', 5)),
    piano: () => { let s = r(0, 0, 120, 80, '#3a1f14') + r(0, 20, 120, 10, '#5a2f1c'); for (let i = 0; i < 14; i++) s += r(4 + i * 8, 30, 7.5, 40, '#fff', ` stroke="#999" stroke-width=".5" class="rp-k" style="animation-delay:${(i % 8) * .25}s"`); [0, 1, 3, 4, 5, 7, 8, 10, 11, 12].forEach(i => { s += r(4 + i * 8 + 5.5, 30, 5, 24, '#111'); }); return s + g('rp-fx', `<text x="40" y="15" font-size="10" fill="#ffe066">&#9835; &#9834; &#9835;</text>`); },
    orchestra: () => r(0, 0, 120, 80, '#5a1a2a') + r(0, 0, 10, 60, '#8a1e2e') + r(110, 0, 10, 60, '#8a1e2e') + r(0, 60, 120, 20, '#8b5a2b') +
      [0, 1, 2, 3, 4, 5].map(i => c(20 + i * 16, 36, 3, '#222') + r(17 + i * 16, 39, 6, 10, '#222') + ln(`M${26 + i * 16} 50 v-8`, '#999', 1) + r(24 + i * 16, 40, 5, 3, '#ddd')).join('') +
      c(60, 44, 5, '#f2c49b') + r(55, 49, 10, 14, '#111') + r(50, 63, 20, 5, '#6b4423') + g('mv', ln('M64 51 L74 42', '#111', 2.5) + ln('M74 42 L84 34', '#fff', 1), ' style="transform-origin:64px 51px;transform-box:view-box"') +
      g('rp-fx', `<text x="84" y="22" font-size="10" fill="#ffe066">&#9834;</text><text x="24" y="20" font-size="10" fill="#ffe066">&#9835;</text>`),
    drums: () => r(0, 0, 120, 80, '#2a1a40') + el(60, 76, 50, 6, '#3a2a58') + ln('M22 26 V70 M98 22 V70', '#aaa', 1.2) +
      g('mv2', el(22, 26, 14, 3, '#e8c34a'), ' style="transform-origin:22px 26px;transform-box:view-box"') + g('mv2', el(98, 22, 14, 3, '#e8c34a'), ' style="transform-origin:98px 22px;transform-box:view-box"') +
      r(18, 46, 22, 10, '#c62828') + el(29, 46, 11, 3, '#eee') + r(82, 44, 22, 20, '#c62828') + el(93, 44, 11, 3, '#eee') +
      g('mv', c(60, 52, 20, '#c62828') + c(60, 52, 16, '#f4f1e4') + c(60, 52, 6, '#c62828')),
    guitar: () => r(0, 0, 120, 80, '#1f5f7a') + g('', c(38, 44, 16, '#d9953b') + c(58, 44, 12, '#d9953b') + c(48, 44, 5, '#3a200d') + r(30, 41, 4, 6, '#3a200d') + r(60, 41, 46, 6, '#6b3e1c') +
      [66, 72, 78, 84, 90, 96, 102].map(x => r(x, 41, .8, 6, '#ccc')).join('') + r(104, 39, 10, 10, '#3a200d') + g('mv', [0, 1, 2, 3, 4, 5].map(i => r(32, 41.8 + i * .9, 76, .35, '#f4f4f4')).join('')), ' transform="rotate(-25 60 44)"'),
    mozart: () => { let s = r(0, 0, 120, 80, '#f4e6c0') + [30, 34, 38, 42, 46].map(y => r(8, y, 104, .8, '#5a4630')).join('') + ln('M16 52 q-5 -10 2 -22 q4 -8 0 -12 q-4 4 0 16 q4 12 -4 16', '#5a4630', 1.5);
      [42, 48, 42, 48, 42, 48, 42, 38, 34].forEach((y, i) => { const x = 30 + i * 9; s += g('rp-k', el(x, y, 3, 2.2, '#2a1a08', ` transform="rotate(-20 ${x} ${y})"`) + r(x + 2.4, y - 14, .9, 14, '#2a1a08'), ` style="animation-delay:${i * .2}s"`) + (y === 48 ? r(x - 5, 50, 10, .8, '#5a4630') : ''); });
      return s + pa('M92 72 L112 52 Q116 58 104 64z', '#fff', ' stroke="#999"') + ln('M92 72 L86 76', '#333', 1); },
    colors: () => r(0, 0, 120, 80, '#fffaf0') + g('mvl', c(46, 32, 18, '#f23b3b', ' style="mix-blend-mode:multiply"')) + c(74, 32, 18, '#ffd400', ' style="mix-blend-mode:multiply"') + g('mvr', c(60, 54, 18, '#2b6ff0', ' style="mix-blend-mode:multiply"')) +
      ln('M100 76 L112 60', '#8b5a2b', 3) + pg('110,62 116,54 114,64', '#333'),
    leonardo: () => r(0, 0, 120, 80, '#ecd9a8') + el(20, 70, 10, 4, '#e0c890') + [62, 66, 70, 74].map(y => ln(`M${10 + (y % 3) * 4} ${y} h${40 - y % 7 * 3} M70 ${y} h${36 - y % 5 * 3}`, '#8a6a3a', .8)).join('') +
      g('mv', pa('M60 36 Q40 14 10 24 Q22 28 18 34 Q30 32 32 42 Q44 36 60 40z', '#d8bf88', ' stroke="#6b4a22"') + pa('M60 36 Q80 14 110 24 Q98 28 102 34 Q90 32 88 42 Q76 36 60 40z', '#d8bf88', ' stroke="#6b4a22"') + ln('M60 36 L22 26 M60 37 L30 38 M60 36 L98 26 M60 37 L90 38', '#6b4a22', .7), ' style="transform-origin:60px 38px;transform-box:view-box"') + el(60, 40, 4, 9, '#8a6a3a'),
    cave: () => r(0, 0, 120, 80, '#b98a55') + el(20, 14, 16, 8, '#a67644') + el(96, 66, 20, 9, '#a67644') + el(80, 12, 12, 5, '#c99a64') + el(30, 70, 14, 6, '#c99a64') +
      r(34, 44, 2.5, 14, '#3a1405') + r(40, 45, 2.5, 13, '#3a1405') + r(58, 44, 2.5, 14, '#3a1405') + r(64, 44, 2.5, 14, '#3a1405') + el(52, 40, 18, 9, '#7a2e12') + el(42, 34, 10, 8, '#5a1e0a') + el(30, 42, 7, 6, '#3a1405') + ln('M26 37 q-3 -4 0 -7 M32 36 q2 -4 5 -4', '#3a1405', 1.5) + ln('M70 38 q6 2 6 10', '#3a1405', 1.5) +
      g('', c(98, 30, 5, '#c2552a') + r(92, 20, 2, 8, '#c2552a') + r(95, 17, 2, 10, '#c2552a') + r(98, 16, 2, 10, '#c2552a') + r(101, 18, 2, 9, '#c2552a') + r(104, 26, 5, 2, '#c2552a'), ' opacity=".7"') +
      g('mv', el(60, 40, 70, 50, '#ffcc66', ' opacity=".2"'))
  };

  /* ---------- the articles (facts as known in 1995, notes "From the future" where things changed) ---------- */
  const CATS = [
    { id: 'animals', name: 'Animals', col: '#2e7d32', pic: 'elephant' },
    { id: 'space', name: 'Space', col: '#1a237e', pic: 'saturn' },
    { id: 'tech', name: 'Inventions & Technology', col: '#8b1a1a', pic: 'lightbulb' },
    { id: 'earth', name: 'Earth & Geography', col: '#0d6e8a', pic: 'volcano' },
    { id: 'body', name: 'Human Body', col: '#9c2764', pic: 'heart' },
    { id: 'arts', name: 'Music & Art', col: '#6a3fa0', pic: 'piano' }
  ];
  const A = [];
  const add = (id, cat, t, p, dyk, rel, fx, q, x = {}) => A.push(Object.assign({ id, cat, t, p, dyk, rel, fx, q }, x));

  // Animals
  add('elephant', 'animals', 'African Elephant', [
    "The African elephant is the biggest animal that lives on land. A large male can stand more than 3 metres tall at the shoulder and weigh around 6 tonnes, about as much as a big truck.",
    "An elephant's trunk is its nose and upper lip joined together. It has tens of thousands of muscles and no bones, so it can pick up a single peanut or pull down a tree branch. Elephants use their trunks to breathe, smell, suck up water to drink, spray themselves and greet each other.",
    "Those huge ears work like fans: elephants flap them to cool down on hot days. Elephants live in family groups led by the oldest female, called the matriarch."
  ], "An elephant mother is pregnant for about 22 months, almost two years. That is longer than any other land animal.", ['whale', 'cheetah', 'bones'], { s: 'trumpet', a: 'shake', label: 'Hear an elephant trumpet' },
  ["What is an elephant's trunk?", "Its nose and upper lip joined together", "A very long tooth", "An extra leg"]);
  add('whale', 'animals', 'Blue Whale', [
    "The blue whale is the largest animal known to have ever lived, even bigger than the biggest dinosaurs. It can grow to about 30 metres long, longer than two school buses parked end to end.",
    "Even though it is a giant, the blue whale eats some of the smallest animals in the sea: krill, tiny shrimp-like creatures. It gulps a huge mouthful of water, then pushes the water out through bristly plates called baleen, which trap the krill like a sieve. In summer a blue whale can eat around 4 tonnes of krill a day.",
    "Whales are mammals, not fish. They breathe air through blowholes on top of their heads, and mothers feed their babies milk. Blue whales make deep, rumbling calls that can travel hundreds of kilometres through the ocean."
  ], "A blue whale's tongue can weigh as much as an elephant.", ['ocean', 'elephant', 'octopus'], { s: 'whale', a: 'swim', label: 'Hear a whale call' },
  ["What do blue whales mostly eat?", "Tiny krill", "Sharks", "Seaweed"]);
  add('cheetah', 'animals', 'Cheetah', [
    "The cheetah is the fastest animal on land. In a short sprint it can reach about 100 kilometres per hour (more than 60 miles per hour), as fast as a car on a highway.",
    "Its body is built for speed: long legs, a bendy back that stretches like a spring, and a long tail that helps it balance and turn. A cheetah can only keep up its top speed for a short dash, so it creeps up close before it runs.",
    "Cheetahs live mostly on the grasslands of Africa. They have black spots and a black 'tear mark' running from each eye down to the mouth, which may help cut down the glare of the bright sun."
  ], "Cheetahs cannot roar like lions. Instead they purr, and make high chirping sounds that sound a lot like a bird.", ['elephant', 'desert', 'owl'], { s: 'chirp', a: 'run', label: 'Hear a cheetah chirp' },
  ["What is the fastest animal on land?", "The cheetah", "The horse", "The elephant"]);
  add('penguin', 'animals', 'Emperor Penguin', [
    "The emperor penguin is the biggest penguin in the world. It can stand more than a metre tall. It lives in Antarctica, the coldest place on Earth.",
    "Penguins are birds, but they cannot fly. Their wings work as flippers instead, making them superb swimmers. Emperor penguins can dive more than 500 metres deep to catch fish, squid and krill.",
    "In the freezing Antarctic winter, the mother lays one egg and goes to sea to feed. The father balances the egg on his feet, under a warm flap of skin, for about two months without eating at all. Thousands of fathers huddle together and take turns standing in the warm middle of the crowd."
  ], "Among thousands of noisy penguins, a chick can pick out its own parent's call.", ['continents', 'whale', 'owl'], { s: 'penguin', a: 'waddle', label: 'Hear a penguin call' },
  ["Who keeps an emperor penguin's egg warm through the winter?", "The father", "The mother", "The grandparents"]);
  add('honeybee', 'animals', 'Honeybee', [
    "Honeybees are small flying insects that live together in a big family called a colony. One colony can have tens of thousands of bees, but only one queen, who lays the eggs.",
    "Most bees in a hive are worker bees, and they are all female. Workers collect sweet nectar and pollen from flowers. Back at the hive they turn the nectar into honey and store it in six-sided wax cells called honeycomb.",
    "When a worker finds good flowers, she tells the others with a 'waggle dance'. The direction and length of her dance show which way to fly and how far to go. As bees visit flowers they carry pollen from one to another, which helps plants make seeds and fruit."
  ], "Honeybees have five eyes: two big ones on the sides of the head and three tiny ones on top.", ['rainforest', 'frog', 'eyes'], { s: 'buzz', a: 'flutter', label: 'Hear the buzz' },
  ["How does a honeybee tell the others where to find flowers?", "She does a waggle dance", "She draws a map", "She sings a song"]);
  add('owl', 'animals', 'Owl', [
    "Owls are birds of prey, and most of them hunt at night. Their big eyes gather lots of light so they can see in the dark, and their hearing is so sharp that some owls can catch a mouse hidden under snow just by listening.",
    "An owl cannot roll its eyes around like you can. Instead it turns its whole head, and it can twist it about three-quarters of the way around.",
    "Owls fly almost silently. Their wing feathers have soft, fringed edges that muffle the sound of the air. Owls often swallow small prey whole, then later cough up the fur and bones they cannot digest as a tidy lump called a pellet."
  ], "A group of owls is called a parliament.", ['eyes', 'ears', 'cheetah'], { s: 'hoot', a: 'blink', label: 'Hear an owl hoot' },
  ["About how far can an owl turn its head?", "About three-quarters of the way around", "All the way around twice", "It cannot turn its head"]);
  add('frog', 'animals', 'Frog', [
    "Frogs are amphibians. That word means 'double life', because most frogs begin life in water and later live on land as well.",
    "A frog starts as a tiny egg in a clump called frogspawn. The egg hatches into a tadpole, which swims with a tail and breathes with gills. Slowly it grows legs, its tail shrinks away, and it becomes a frog with lungs. This big change is called metamorphosis.",
    "Frogs catch insects with a long, sticky tongue. There are thousands of kinds of frogs. Some tiny poison dart frogs of the rainforest have very bright colours that warn other animals: do not eat me!"
  ], "Frogs do not drink with their mouths. They soak up water through their skin.", ['rainforest', 'river', 'honeybee'], { s: 'croak', a: 'hop', label: 'Hear a frog croak' },
  ["What is a young frog that swims with a tail called?", "A tadpole", "A cub", "A foal"]);
  add('octopus', 'animals', 'Octopus', [
    "The octopus is a sea animal with eight arms, a soft body and no bones at all. Because it has no skeleton, an octopus can squeeze through any gap bigger than its beak, the only hard part of its body.",
    "Octopuses are masters of disguise. Special cells in their skin let them change colour in a flash to blend in with rocks and coral. If a hungry enemy comes close, an octopus can squirt a cloud of dark ink and jet away.",
    "Octopuses are very clever. Scientists have watched them solve puzzles and even unscrew the lids of jars to reach food inside."
  ], "An octopus has three hearts and blue blood.", ['ocean', 'whale', 'heart'], { s: 'bubble', a: 'sway', label: 'Hear the bubbles' },
  ["How many hearts does an octopus have?", "Three", "One", "Eight"]);

  // Space
  add('sun', 'space', 'The Sun', [
    "The Sun is a star: a giant glowing ball of hot gas, mostly hydrogen and helium. It is the closest star to Earth and the centre of our Solar System. All the planets travel around it.",
    "Deep in its core, the Sun squeezes hydrogen together to make helium. This is called nuclear fusion, and it gives off enormous amounts of light and heat. The Sun's surface is about 5,500 degrees Celsius, and its core is around 15 million degrees.",
    "The Sun is about 150 million kilometres away, and its light takes about 8 minutes to reach us. Never look straight at the Sun, not even with sunglasses: it can badly hurt your eyes."
  ], "The Sun is so big that more than a million Earths could fit inside it.", ['moon', 'milkyway', 'rainbow'], { s: 'hum', a: 'spin', label: 'Play the solar hum' },
  ["About how long does sunlight take to reach Earth?", "About 8 minutes", "About 8 seconds", "About 8 days"]);
  add('moon', 'space', 'The Moon', [
    "The Moon is Earth's natural satellite: it travels around our planet about once a month, about 384,000 kilometres away. The Moon does not make its own light. It shines by reflecting sunlight.",
    "As the Moon travels around Earth, we see different amounts of its sunlit side. These changing shapes, from new moon to full moon and back again, are called phases. The Moon always keeps the same side facing Earth.",
    "On 20 July 1969, the Apollo 11 astronauts Neil Armstrong and Buzz Aldrin became the first people to walk on the Moon. Between 1969 and 1972, twelve astronauts walked there. With no wind or rain on the Moon, their footprints are probably still there today."
  ], "Gravity on the Moon is only about one-sixth as strong as on Earth, so astronauts could bound along in big, bouncy hops.", ['sun', 'shuttle', 'mars'], { s: 'beeps', a: 'bob', label: 'Hear radio beeps from the Moon' },
  ["In what year did people first walk on the Moon?", "1969", "1959", "1979"], { year: 1969, tl: 'Apollo 11: people walk on the Moon' });
  add('mars', 'space', 'Mars', [
    "Mars is the fourth planet from the Sun. It is often called the Red Planet because its dusty ground contains lots of iron oxide, the same stuff that makes rust red.",
    "Mars has Olympus Mons, the biggest volcano known in the Solar System. It is about two and a half times as tall as Mount Everest. Mars also has giant dust storms that can cover the whole planet, and two small, lumpy moons called Phobos and Deimos.",
    "A day on Mars lasts only about 40 minutes longer than a day on Earth, but its year is almost twice as long. In 1976, two Viking spacecraft landed on Mars and sent back pictures from its surface."
  ], "Mars is only about half as wide as Earth.", ['jupiter', 'volcano', 'moon'], { s: 'wind', a: 'orbit', label: 'Hear a Martian dust storm' },
  ["Why is Mars red?", "Its dust contains iron oxide, like rust", "It is burning hot", "It is covered in red plants"],
  { future: "Starting in 1997, a series of robot rovers began driving across Mars, studying its rocks and soil." });
  add('jupiter', 'space', 'Jupiter', [
    "Jupiter is the fifth planet from the Sun and by far the biggest. It is so large that all the other planets could fit inside it. Jupiter is a gas giant: it is made mostly of hydrogen and helium and has no solid ground to stand on.",
    "Jupiter's colourful stripes are bands of clouds blown by powerful winds. The Great Red Spot is a giant storm, bigger than the whole Earth, that has been swirling for more than 150 years.",
    "In 1610 the astronomer Galileo Galilei spotted Jupiter's four biggest moons: Io, Europa, Ganymede and Callisto. Scientists know of 16 moons around Jupiter so far. A spacecraft named Galileo is on its way and should arrive in December 1995."
  ], "A day on Jupiter lasts less than 10 hours, the shortest day of any planet.", ['saturn', 'mars', 'sun'], { s: 'whoosh', a: 'orbit', label: 'Hear the stormy winds' },
  ["What is Jupiter's Great Red Spot?", "A giant storm", "A huge volcano", "A red ocean"],
  { future: "Galileo arrived on time and studied Jupiter until 2003. Astronomers have now found more than 90 moons around Jupiter." });
  add('saturn', 'space', 'Saturn', [
    "Saturn is the sixth planet from the Sun and the second biggest. It is famous for its beautiful rings, which are made of billions of pieces of ice and rock. Some pieces are as small as grains of sand; others are as big as a house.",
    "Like Jupiter, Saturn is a gas giant. It is so light for its size that, if you could find a bathtub big enough, Saturn would float in the water!",
    "Scientists know of 18 moons around Saturn. The biggest, Titan, is larger than the planet Mercury and is wrapped in a thick, hazy atmosphere."
  ], "Saturn takes about 29 Earth years to travel once around the Sun.", ['jupiter', 'pluto', 'milkyway'], { s: 'shimmer', a: 'tilt', label: 'Play the ring music' },
  ["What are Saturn's rings made of?", "Pieces of ice and rock", "Gold dust", "Clouds of steam"],
  { future: "Astronomers have since found well over 100 more moons around Saturn, and in 2005 a probe called Huygens landed on Titan." });
  add('pluto', 'space', 'Pluto', [
    "Pluto is the ninth planet from the Sun and the smallest planet in our Solar System. It was discovered in 1930 by a young American astronomer named Clyde Tombaugh. Pluto is even smaller than our own Moon.",
    "Pluto is a frozen world, far out in the dark. From Pluto, the Sun would look like a very bright star. One year on Pluto, one trip around the Sun, takes about 248 Earth years.",
    "Pluto's path around the Sun is a stretched-out oval. From 1979 until 1999, Pluto is actually closer to the Sun than Neptune is! Pluto has one known moon, Charon, found in 1978. No spacecraft has visited Pluto yet."
  ], "Pluto was named in 1930 by Venetia Burney, an 11-year-old schoolgirl in England.", ['saturn', 'moon', 'milkyway'], { s: 'ping', a: 'twinkle', label: 'Play the sounds of deep space' },
  ["In 1995, Pluto was known as which planet from the Sun?", "The ninth", "The third", "The fifth"],
  { future: "In 2006, astronomers decided that Pluto is a 'dwarf planet', so today we say the Solar System has eight planets. In 2015 the New Horizons spacecraft flew past Pluto and photographed a giant heart-shaped region on its surface." });
  add('shuttle', 'space', 'Space Shuttle', [
    "The Space Shuttle is a spaceship that can be used again and again. The first Shuttle flight was on 12 April 1981, when Columbia blasted off from Florida.",
    "At launch, the white Shuttle, called the orbiter, rides on a giant orange fuel tank with two rocket boosters on its sides. The boosters drop off after about two minutes and fall into the ocean on parachutes, so they can be collected and used again. The big tank is dropped just before the orbiter reaches space.",
    "In orbit, astronauts float around the cabin, launch satellites and do experiments. When the mission is over, the orbiter comes back through the atmosphere and lands on a runway like a giant glider, with no engines running."
  ], "In 1990 the Shuttle Discovery carried the Hubble Space Telescope into orbit, and in 1993 astronauts aboard Endeavour visited Hubble to fix its blurry eyesight.", ['moon', 'airplane', 'computer'], { s: 'rocket', a: 'launch', label: 'Launch the Shuttle' },
  ["How does the Space Shuttle orbiter come back to Earth?", "It lands on a runway like a glider", "It splashes into the ocean", "It lands standing on its tail"],
  { year: 1981, tl: 'First Space Shuttle flight', future: "The Space Shuttle made its last flight in 2011, after 135 missions." });
  add('milkyway', 'space', 'The Milky Way', [
    "On a dark night far from city lights, you can see a faint, milky band of light across the sky. That band is our galaxy, the Milky Way, seen from the inside. A galaxy is a gigantic family of stars, gas and dust held together by gravity.",
    "The Milky Way is shaped like a flat spiral with curving arms, and it contains hundreds of billions of stars. Our Sun is just one of them, out in one of the spiral arms.",
    "Space is so big that we measure it in light-years. A light-year is the distance light travels in one year: about 9.5 million million kilometres. The nearest star to the Sun, Proxima Centauri, is about 4.2 light-years away."
  ], "The Milky Way is so wide that light takes about 100,000 years to cross it.", ['sun', 'pluto', 'saturn'], { s: 'twinkle', a: 'galaxy', label: 'Spin the galaxy' },
  ["What is a light-year?", "The distance light travels in a year", "How long a year lasts in space", "A very bright star"]);

  // Inventions & Technology
  add('wheel', 'tech', 'The Wheel', [
    "The wheel is one of the most important inventions ever. People in Mesopotamia, in the area of modern Iraq, were making wheels about 5,500 years ago, around 3500 BC. Some of the earliest wheels were used by potters to shape clay, and soon people put wheels on carts.",
    "The first cart wheels were solid wooden disks, which were very heavy. Later, people invented wheels with spokes, which were much lighter and let chariots go faster.",
    "Today wheels are everywhere: in cars, bicycles, clocks and skateboards, and even spinning inside your computer's disk drives."
  ], "Before the wheel, people moved heavy loads by dragging them on sledges or rolling them along on logs.", ['printing', 'cd', 'airplane'], { s: 'roll', a: 'spin', label: 'Roll the wheel' },
  ["About how long ago were the first wheels made?", "About 5,500 years ago", "About 500 years ago", "About 50,000 years ago"], { year: -3500, tl: 'The wheel, in Mesopotamia' });
  add('printing', 'tech', 'Printing Press', [
    "Long ago, every book had to be copied out by hand, which could take months. Around 1440 in Germany, Johannes Gutenberg built a printing press that used metal letters, called movable type. The letters could be arranged into pages, inked, and pressed onto paper again and again.",
    "Suddenly books could be made quickly and cheaply. Around 1455, Gutenberg printed a famous Bible. Within 50 years, printing presses had spread across Europe and millions of books had been printed. More people learned to read, and ideas spread faster than ever before.",
    "Gutenberg was not the very first to print with movable type. In China, an inventor named Bi Sheng made movable type out of baked clay around the year 1040."
  ], "The letters in movable type were made backwards, like a mirror image, so they would print the right way round.", ['leonardo', 'computer', 'wheel'], { s: 'clunk', a: 'press', label: 'Work the press' },
  ["Who built a famous printing press around 1440?", "Johannes Gutenberg", "Thomas Edison", "Wolfgang Amadeus Mozart"], { year: 1440, tl: "Gutenberg's printing press" });
  add('telephone', 'tech', 'Telephone', [
    "In 1876, Alexander Graham Bell received a patent for the telephone, a machine that could send the sound of a voice along a wire as an electric signal.",
    "The first words Bell spoke on his telephone were to his assistant in the next room: 'Mr. Watson, come here, I want to see you.'",
    "Early telephones had no dials. You turned a crank or lifted the receiver, and an operator connected your call by plugging wires into a big switchboard. Today, telephone lines even carry computer data: your modem uses the phone line to go online!"
  ], "Before he invented the telephone, Bell worked as a teacher of deaf students, and he studied how sound and speech work.", ['internet', 'ears', 'television'], { s: 'ring', a: 'shake', label: 'Ring the telephone' },
  ["Who received the patent for the telephone in 1876?", "Alexander Graham Bell", "The Wright brothers", "Johannes Gutenberg"], { year: 1876, tl: 'Telephone patented by Alexander Graham Bell' });
  add('lightbulb', 'tech', 'Light Bulb', [
    "Before electric lights, people used candles, oil lamps and gas lamps after dark. In 1879, Thomas Edison and his team made a light bulb that could glow for many hours, long-lasting enough to be useful in homes.",
    "Inside the glass is a thin thread called a filament. When electricity flows through it, the filament gets so hot that it glows. The air is pumped out of the bulb so the filament does not burn up.",
    "Edison was not the only inventor working on light bulbs. In England, Joseph Swan made a working bulb at about the same time, and the two later went into business together."
  ], "Edison's team tested thousands of materials to find a good filament. One of the best was a thread of scorched bamboo.", ['telephone', 'sun', 'television'], { s: 'bulb', a: 'glow', label: 'Switch on the light' },
  ["What is the thin glowing thread inside a light bulb called?", "The filament", "The fuse", "The plug"], { year: 1879, tl: "Edison's long-lasting light bulb" });
  add('airplane', 'tech', 'Airplane', [
    "On 17 December 1903, near Kitty Hawk, North Carolina, the brothers Orville and Wilbur Wright made the first powered, controlled flight in an airplane. Orville was the pilot. The flight lasted just 12 seconds and covered 37 metres, less than the wingspan of a modern jumbo jet!",
    "The Wright brothers ran a bicycle shop in Dayton, Ohio. They studied birds and tested wing shapes in a homemade wind tunnel. Their big idea was a way to steer the airplane by twisting, or 'warping', its wings.",
    "Their Flyer made four flights that day. The longest, with Wilbur at the controls, went 260 metres in 59 seconds. Less than 70 years later, people were flying to the Moon."
  ], "The brothers tossed a coin to decide who would fly first. Wilbur won, but his try three days earlier ended with a stall and a bumpy landing, so Orville made the famous first flight.", ['shuttle', 'leonardo', 'wheel'], { s: 'prop', a: 'fly', label: 'Watch the Flyer fly' },
  ["Where did the Wright brothers make their first flight?", "Near Kitty Hawk, North Carolina", "In Paris, France", "In London, England"], { year: 1903, tl: 'First airplane flight by the Wright brothers' });
  add('television', 'tech', 'Television', [
    "Television sends moving pictures and sound through the air, or along cables, into your home. In 1926 in London, a Scottish inventor named John Logie Baird showed a working television to a group of scientists. His pictures were small, blurry and orange, but they moved!",
    "Baird's television used a spinning disk full of holes. In America, a young inventor named Philo Farnsworth built an all-electronic television in 1927, with no spinning parts. Modern TVs grew from ideas like his.",
    "A TV picture is made of hundreds of lines drawn across the screen by a beam inside the picture tube. The whole picture is drawn again many times every second, and your eyes blend it all together into one smooth moving picture."
  ], "A TV screen shows about 25 to 30 new pictures every second, depending on the country.", ['computer', 'telephone', 'eyes'], { s: 'static', a: 'flicker', label: 'Tune in the TV' },
  ["Who showed a working television in London in 1926?", "John Logie Baird", "Alexander Graham Bell", "Galileo Galilei"], { year: 1926, tl: 'John Logie Baird shows television' });
  add('computer', 'tech', 'Computers', [
    "One of the first electronic computers, ENIAC, was shown to the public in 1946 in the United States. It filled a whole room, weighed about 27 tonnes and used about 18,000 glowing vacuum tubes.",
    "In the late 1950s, inventors worked out how to put many electronic parts onto one tiny chip of silicon, called an integrated circuit or microchip. Chips made computers smaller, cheaper and faster.",
    "In the late 1970s, the first popular personal computers appeared, small enough to sit on a desk at home. Today, in 1995, a home computer with a CD-ROM drive can do far more than ENIAC ever could."
  ], "The word 'computer' used to mean a person whose job was doing sums by hand.", ['cd', 'internet', 'brain'], { s: 'compute', a: 'lights', label: 'Run the computer' },
  ["About how many vacuum tubes did ENIAC use?", "About 18,000", "About 18", "About 18 million"], { year: 1946, tl: 'ENIAC electronic computer' });
  add('cd', 'tech', 'Compact Disc', [
    "The compact disc, or CD, went on sale in 1982. It was developed by the companies Sony and Philips. A music CD can hold up to about 74 minutes of sound.",
    "A CD stores information as millions and millions of tiny bumps called pits, arranged in one long spiral track that would stretch more than 5 kilometres if you unwound it. A laser beam shines on the spinning disc, and a sensor reads the reflected light as numbers: ones and zeros.",
    "A CD-ROM is a compact disc for computers. It can hold about 650 megabytes, as much as about 450 floppy disks. That is how this whole encyclopedia, with its pictures and sounds, fits on one shiny disc!"
  ], "A CD spins faster when the laser is reading near the centre and slower near the edge, so the track passes the laser at a steady speed.", ['computer', 'rainbow', 'wheel'], { s: 'whir', a: 'spin', label: 'Spin the disc' },
  ["About how many floppy disks hold as much as one CD-ROM?", "About 450", "About 4", "About 45,000"], { year: 1982, tl: 'Compact disc goes on sale' });
  add('internet', 'tech', 'The Internet', [
    "The Internet is a giant network that links computers all around the world. It began in 1969 as ARPANET, a small network connecting computers at a few American universities and research centres.",
    "In 1989, a British scientist named Tim Berners-Lee, working at a physics laboratory in Switzerland called CERN, came up with the World Wide Web: pages of words and pictures linked together, so you can click from one page to the next. The first websites went online in 1991.",
    "In 1995, millions of people are joining the Internet from home using a modem, which turns computer data into screechy sounds that travel over a phone line. With it you can send electronic mail, called e-mail, and visit web pages about almost anything."
  ], "The @ sign in e-mail addresses was first used in 1971 by Ray Tomlinson, who sent the first e-mail between computers on a network.", ['telephone', 'computer', 'cd'], { s: 'modem', a: 'twinkle', label: 'Hear a modem connect' },
  ["What did Tim Berners-Lee invent?", "The World Wide Web", "The telephone", "The light bulb"], { year: 1969, tl: 'ARPANET, the start of the Internet', future: "By the 2020s, more than 5 billion people were using the Internet, many of them on phones that fit in a pocket." });

  // Earth & Geography
  add('everest', 'earth', 'Mount Everest', [
    "Mount Everest is the highest mountain on Earth. Its peak is 8,848 metres above sea level. It stands in the Himalaya mountains, on the border between Nepal and Tibet, in China.",
    "The Himalayas formed when the land that is now India slowly crashed into the rest of Asia, crumpling the ground upward. India is still pushing north, so the mountains are still growing a tiny bit each year.",
    "At the top of Everest the air is so thin that most climbers carry bottled oxygen. In 1953, Edmund Hillary from New Zealand and Tenzing Norgay, a Sherpa mountaineer, became the first people known to reach the summit."
  ], "Mount Everest is called Sagarmatha in Nepal and Chomolungma in Tibet.", ['volcano', 'continents', 'mars'], { s: 'wind', a: 'flag', label: 'Hear the mountain wind' },
  ["Which mountain range is Mount Everest in?", "The Himalayas", "The Alps", "The Rocky Mountains"],
  { future: "In 2020, Nepal and China announced a new, more exact height: 8,848.86 metres." });
  add('volcano', 'earth', 'Volcanoes', [
    "A volcano is an opening in Earth's crust where hot melted rock, gas and ash come up from deep underground. Melted rock under the ground is called magma. Once it pours out onto the surface, it is called lava.",
    "Lava can be hotter than 1,000 degrees Celsius. When it cools, it hardens into new rock. Over thousands of years, layer upon layer of lava and ash can build up a mountain.",
    "Many volcanoes form a huge loop around the Pacific Ocean called the Ring of Fire. The islands of Hawaii were built by volcanoes rising from the sea floor. Scientists called volcanologists watch volcanoes closely so they can warn people before an eruption."
  ], "Measured from its base on the ocean floor, Mauna Kea in Hawaii is taller than Mount Everest.", ['everest', 'ocean', 'mars'], { s: 'rumble', a: 'rise', label: 'Hear the volcano rumble' },
  ["What is melted rock called once it reaches the surface?", "Lava", "Magma", "Granite"]);
  add('ocean', 'earth', 'Oceans', [
    "Oceans cover about 71 percent of Earth's surface, which is why Earth looks blue from space. Most maps show four oceans: the Pacific, the Atlantic, the Indian and the Arctic. The Pacific is the biggest of all.",
    "The deepest place in the ocean is the Challenger Deep, in the Mariana Trench in the Pacific. It is about 11 kilometres deep. If you put Mount Everest there, its peak would still be about 2 kilometres under water!",
    "Ocean water is salty because rivers carry tiny amounts of minerals from rocks into the sea, where they build up over millions of years. Tiny ocean living things called phytoplankton make a large share of the oxygen we breathe."
  ], "The Pacific Ocean is bigger than all of Earth's land put together.", ['whale', 'octopus', 'river'], { s: 'waves', a: 'wave', label: 'Hear the waves' },
  ["Which is the biggest ocean?", "The Pacific", "The Atlantic", "The Arctic"],
  { future: "In 2000, many geographers began to count a fifth ocean: the Southern Ocean, which surrounds Antarctica." });
  add('rainforest', 'earth', 'Rainforests', [
    "Tropical rainforests grow near the equator, where it is warm all year and rains almost every day. The Amazon rainforest in South America is the biggest in the world.",
    "Rainforests have layers, like floors in a building. The tallest trees poke out at the top, the leafy canopy forms a green roof, the understory below is shady, and the forest floor is dark and damp. Different animals live on each layer.",
    "Rainforests cover only a small part of Earth's land, yet about half of all the kinds of plants and animals in the world live in them. Many foods first came from rainforest plants, including bananas, chocolate (from cacao beans) and vanilla."
  ], "A sloth moves so slowly that tiny green algae grow in its fur, helping it hide among the leaves.", ['frog', 'river', 'honeybee'], { s: 'rain', a: 'drip', label: 'Hear the rainforest' },
  ["Where is the biggest rainforest in the world?", "South America (the Amazon)", "Antarctica", "Europe"]);
  add('desert', 'earth', 'Deserts', [
    "A desert is a place that gets very little rain or snow, usually less than 25 centimetres in a whole year. Deserts can be hot or cold. The Sahara in northern Africa is the largest hot desert in the world, almost as big as the United States.",
    "Less than a third of the Sahara is covered in sand dunes. Much of it is rock, gravel and mountains. Days can be scorching, but nights can be surprisingly cold, because there are no clouds to hold in the heat.",
    "Desert plants and animals have clever ways to survive. A cactus stores water in its thick stem. A camel's hump is full of fat, not water, which its body can use for energy when food is scarce."
  ], "Because it gets so little snow or rain, the icy continent of Antarctica counts as the biggest desert of all.", ['rainforest', 'cheetah', 'continents'], { s: 'breeze', a: 'pulse', label: 'Hear the desert breeze' },
  ["What is stored in a camel's hump?", "Fat", "Water", "Sand"]);
  add('river', 'earth', 'Rivers', [
    "A river is fresh water flowing downhill in a channel toward a lake, a sea or the ocean. Rivers begin at a source, such as a spring, a lake or melting snow high in the mountains, and end at a mouth.",
    "The Nile in Africa is usually said to be the longest river in the world, at about 6,650 kilometres. The Amazon in South America is almost as long, and it carries more water than any other river: more than the next several biggest rivers put together.",
    "Rivers carve valleys, carry soil that makes rich farmland, and give people water, food and a way to travel. Ancient Egypt grew up along the Nile, where yearly floods left fertile mud on the fields."
  ], "The Grand Canyon in the USA was carved mostly by the Colorado River over millions of years.", ['ocean', 'rainforest', 'everest'], { s: 'water', a: 'flow', label: 'Hear the river flow' },
  ["Which river is usually called the longest in the world?", "The Nile", "The Thames", "The Seine"]);
  add('rainbow', 'earth', 'Rainbows', [
    "A rainbow appears when sunlight shines through raindrops. Sunlight looks white, but it is really a mixture of many colours. Each raindrop bends the light and splits it into its colours, then reflects it back toward you.",
    "The colours always come in the same order: red, orange, yellow, green, blue, indigo and violet. Some people remember them with the made-up name 'Roy G. Biv'.",
    "To see a rainbow, the Sun must be behind you and the rain in front of you. That is why rainbows are often seen in the early morning or late afternoon, after a shower. You can make your own with a garden hose on a sunny day."
  ], "From an airplane, you can sometimes see a rainbow as a complete circle.", ['colors', 'sun', 'eyes'], { s: 'chime', a: 'reveal', label: 'Make a rainbow' },
  ["To see a rainbow, where should the Sun be?", "Behind you", "In front of you", "Right under your feet"]);
  add('continents', 'earth', 'Continents', [
    "The land on Earth is divided into seven continents: Asia, Africa, North America, South America, Antarctica, Europe and Australia. Asia is the largest, and Australia is the smallest.",
    "The continents sit on huge slabs of rock called plates, which slowly drift across Earth's surface, about as fast as your fingernails grow.",
    "About 250 million years ago, all the continents were joined together in one giant supercontinent called Pangaea. Over millions of years it broke apart. Look at a map and you can see that South America and Africa still fit together like puzzle pieces!"
  ], "Nobody lives in Antarctica all the time. Scientists stay there for a while at research stations.", ['everest', 'volcano', 'penguin'], { s: 'grind', a: 'apart', label: 'Watch the continents drift' },
  ["What was the giant supercontinent called?", "Pangaea", "Atlantis", "Antarctica"]);

  // Human Body
  add('heart', 'body', 'The Heart', [
    "Your heart is a strong muscle about the size of your fist. It sits in your chest, a little to the left of the middle, and it pumps blood all around your body, day and night, for your whole life.",
    "Blood carries oxygen from your lungs, and energy from your food, to every part of your body. The heart has four rooms called chambers. The right side pumps blood to the lungs to pick up oxygen, and the left side pumps it out to the rest of your body.",
    "Your heart beats about 100,000 times a day. The 'lub-dub' sound a doctor hears through a stethoscope is made by little doors inside your heart, called valves, snapping shut."
  ], "Your heart pumps blood all the way around your body and back again in about one minute.", ['lungs', 'brain', 'octopus'], { s: 'heartbeat', a: 'pulse', label: 'Hear a heartbeat' },
  ["About how many times does your heart beat each day?", "About 100,000", "About 100", "About 1,000"]);
  add('brain', 'body', 'The Brain', [
    "Your brain is the control centre of your body. It lets you think, learn, remember, feel and dream, and it keeps your heart beating and your lungs breathing even while you sleep. An adult's brain weighs about 1.4 kilograms.",
    "The brain is made of billions of nerve cells called neurons. They pass messages to each other with tiny electrical signals, and send messages to and from your body along nerves, faster than you can blink.",
    "The biggest part of the brain, the cerebrum, is split into left and right halves. Curiously, the left half mostly controls the right side of your body, and the right half controls the left!"
  ], "Your brain uses about a fifth of all your body's energy, even though it is only about 2 percent of your weight.", ['eyes', 'heart', 'computer'], { s: 'zap', a: 'twinkle', label: 'Fire the neurons' },
  ["What are the brain's nerve cells called?", "Neurons", "Pixels", "Crystals"]);
  add('bones', 'body', 'The Skeleton', [
    "Your skeleton is the frame that holds your body up. It also protects soft parts inside: your skull guards your brain, and your ribs form a cage around your heart and lungs. Muscles pull on bones so you can move.",
    "An adult has 206 bones. A newborn baby has around 300, but as the baby grows, some of them join together. More than half of your bones are in your hands and feet.",
    "Bones are alive! They grow, and they can mend themselves when they break. The inside of many bones holds bone marrow, which makes new blood cells."
  ], "The smallest bone in your body is the stirrup, deep inside your ear. It is about the size of a grain of rice.", ['ears', 'teeth', 'heart'], { s: 'xylo', a: 'dance', label: 'Make the skeleton dance' },
  ["How many bones does an adult have?", "206", "52", "1,000"]);
  add('teeth', 'body', 'Teeth', [
    "Teeth help you bite and chew your food, and they help you speak clearly. Children have 20 baby teeth. From about age 6, these fall out one by one and are replaced by bigger adult teeth. Adults have up to 32.",
    "Different teeth do different jobs. Sharp front teeth called incisors cut food, pointy canines tear it, and wide, bumpy molars at the back grind it up.",
    "The outside of each tooth is covered in enamel, the hardest substance in your body. But germs that feed on sugar make acids that can cause holes called cavities. Brushing twice a day keeps your teeth strong and healthy."
  ], "Your teeth start growing inside your jaw before you are even born.", ['bones', 'skin', 'heart'], { s: 'brush', a: 'scrub', label: 'Brush your teeth' },
  ["What is the hardest substance in your body?", "Tooth enamel", "Hair", "Fingernails"]);
  add('lungs', 'body', 'The Lungs', [
    "Every cell in your body needs oxygen, a gas in the air. Your two lungs bring oxygen into your body each time you breathe in, and get rid of a waste gas called carbon dioxide each time you breathe out.",
    "When you breathe in, a dome-shaped muscle under your lungs called the diaphragm pulls down. Air rushes in through your nose or mouth, down your windpipe and into smaller and smaller tubes. These end in millions of tiny air sacs, where oxygen passes into your blood.",
    "Your two lungs are not the same size. The left lung is a little smaller, to leave room for your heart."
  ], "Hiccups happen when your diaphragm suddenly twitches. The 'hic' sound is your vocal cords snapping shut.", ['heart', 'brain', 'whale'], { s: 'breath', a: 'inflate', label: 'Take a deep breath' },
  ["Which muscle helps you breathe in?", "The diaphragm", "The biceps", "The tongue"]);
  add('eyes', 'body', 'Eyes and Seeing', [
    "Your eyes let you see the world. Light enters through the pupil, the black circle in the middle of your eye. The coloured ring around it, the iris, makes the pupil bigger in dim light and smaller in bright light.",
    "Behind the pupil, a clear lens focuses the light onto the retina at the back of your eye. The retina turns the light into signals that travel along the optic nerve to your brain. The picture on your retina is actually upside down, and your brain turns it the right way up!",
    "Blinking keeps your eyes clean and moist. Tears wash away dust and help fight germs."
  ], "Each of your eyes has a blind spot where the optic nerve leaves it, but your brain fills in the gap so you never notice.", ['brain', 'owl', 'rainbow'], { s: 'blink', a: 'blink', label: 'Blink!' },
  ["What is the coloured ring of your eye called?", "The iris", "The pupil", "The eyelash"]);
  add('ears', 'body', 'Ears and Hearing', [
    "Sounds are vibrations travelling through the air. Your outer ear collects these sound waves and funnels them into your ear canal, where they make a thin skin called the eardrum vibrate.",
    "The eardrum passes the vibrations to three tiny bones: the hammer, the anvil and the stirrup. They pass them on to the cochlea, a snail-shaped tube filled with liquid and lined with tiny hairs. The hairs turn the vibrations into signals for your brain.",
    "Your ears also help you balance. Loops of fluid in your inner ear sense when your head moves. That is why spinning around makes you dizzy: the fluid keeps swirling for a moment after you stop."
  ], "Sound travels through air at about 340 metres per second, which is about one kilometre every three seconds.", ['bones', 'telephone', 'owl'], { s: 'sweep', a: 'twinkle', label: 'Play a hearing sweep' },
  ["What shape is the cochlea?", "Like a snail shell", "Like a star", "Like a cube"]);
  add('skin', 'body', 'Skin', [
    "Skin is the largest organ of your body. It keeps germs out, keeps water in, and lets you feel touch, heat, cold and pain.",
    "Skin helps control your temperature. When you are hot, you sweat, and as the sweat dries it cools you down. When you are cold, tiny muscles make your hairs stand up, giving you goosebumps.",
    "Your skin is always renewing itself. You shed tiny flakes of old skin all the time, and new cells grow underneath to take their place. A natural colouring called melanin gives skin its colour and helps protect it from the Sun."
  ], "Nobody else has the same fingerprints as you, not even an identical twin.", ['teeth', 'heart', 'sun'], { s: 'tap', a: 'scrub', label: 'Look closer' },
  ["What is the largest organ of your body?", "Your skin", "Your heart", "Your brain"]);

  // Music & Art
  add('piano', 'arts', 'Piano', [
    "The piano was invented around 1700 in Italy by Bartolomeo Cristofori. Its full name, pianoforte, means 'soft-loud' in Italian, because it can play both softly and loudly depending on how hard you press the keys. Earlier keyboard instruments could not do that.",
    "A modern piano has 88 keys: 52 white and 36 black. When you press a key, a felt-covered hammer inside strikes strings, making them vibrate and sing.",
    "Pedals change the sound. The right pedal lets the notes ring on after you lift your fingers, and the left pedal makes the sound softer."
  ], "A grand piano has more than 200 strings, because most of its notes use two or three strings each.", ['mozart', 'orchestra', 'guitar'], { s: 'piano', a: 'keys', label: 'Play a scale' },
  ["How many keys does a modern piano have?", "88", "52", "100"], { year: 1700, tl: 'Cristofori invents the piano' });
  add('orchestra', 'arts', 'Orchestra', [
    "An orchestra is a large group of musicians who play together. A full symphony orchestra can have around 100 players!",
    "The instruments are grouped into four families. Strings, like violins and cellos, are played with a bow or plucked. Woodwinds, like flutes and clarinets, are blown. Brass instruments, like trumpets and tubas, are played by buzzing your lips into a mouthpiece. Percussion instruments, like drums and cymbals, are hit or shaken.",
    "The conductor stands at the front and uses a thin stick called a baton to show the players when to start, how fast to go and how loud to play."
  ], "Before a concert, the whole orchestra tunes up to the note A, played by the oboe.", ['piano', 'drums', 'mozart'], { s: 'orch', a: 'conduct', label: 'Hear the orchestra' },
  ["Which family does the trumpet belong to?", "Brass", "Strings", "Woodwinds"]);
  add('drums', 'arts', 'Drums and Percussion', [
    "Percussion instruments make sounds when you hit, shake or scrape them. Drums are among the oldest instruments in the world, and people play them in almost every culture.",
    "A drum has a tight skin, called a head, stretched over a hollow body. When you hit the head, it vibrates, and the body makes the sound louder. Big drums make low booms, and small drums make higher sounds.",
    "A drum kit puts several drums and cymbals together for one player: a big bass drum played with a foot pedal, a snappy snare drum, tom-toms and shiny cymbals. Other percussion instruments include the xylophone, maracas, the triangle and the tambourine."
  ], "The word 'xylophone' comes from Greek words meaning 'wood sound'.", ['orchestra', 'guitar', 'ears'], { s: 'drums', a: 'drums', label: 'Play a drum beat' },
  ["How do you play the bass drum in a drum kit?", "With a foot pedal", "By blowing into it", "With a bow"]);
  add('guitar', 'arts', 'Guitar', [
    "A guitar is a string instrument, usually with six strings. You play it by strumming or plucking the strings with your fingers or a small pick, while your other hand presses the strings against the neck to change the notes.",
    "On an acoustic guitar, the hollow wooden body makes the sound louder. An electric guitar usually has a solid body, so it needs an amplifier: small magnets wrapped in wire, called pickups, turn the vibrating strings into an electrical signal, and the amplifier makes it loud.",
    "Thin metal strips called frets run across the guitar's neck. Pressing a string just behind a fret makes the vibrating part of the string shorter, and shorter strings play higher notes."
  ], "Thick, heavy strings vibrate more slowly and play low notes. Thin strings vibrate faster and play high notes.", ['piano', 'drums', 'ears'], { s: 'strum', a: 'vibrate', label: 'Strum a chord' },
  ["What does an electric guitar need so it can be heard loudly?", "An amplifier", "A bow", "A mouthpiece"]);
  add('mozart', 'arts', 'Wolfgang Amadeus Mozart', [
    "Wolfgang Amadeus Mozart was one of the greatest composers of all time. He was born in 1756 in Salzburg, in what is now Austria, and he wrote his first little pieces of music when he was only five years old.",
    "As a child, Mozart toured Europe with his father and his older sister, Nannerl, playing for kings and queens. He played the keyboard and the violin brilliantly.",
    "In his short life (he died in 1791, aged 35) Mozart wrote more than 600 works, including symphonies, concertos and operas such as The Magic Flute. People all over the world still play and love his music."
  ], "Press Play to hear the opening notes of Mozart's 'Eine kleine Nachtmusik', which is German for 'a little night music'.", ['piano', 'orchestra', 'leonardo'], { s: 'mozart', a: 'keys', label: 'Play Mozart' },
  ["How old was Mozart when he wrote his first pieces of music?", "Five", "Fifteen", "Thirty"]);
  add('colors', 'arts', 'Colour Mixing', [
    "Painters have long used three primary colours: red, yellow and blue. By mixing them, you can make many other colours.",
    "Mixing two primary colours makes a secondary colour: red and yellow make orange, yellow and blue make green, and blue and red make purple. Artists arrange all these colours in a circle called the colour wheel.",
    "Light mixes differently from paint! On your computer screen, every colour is made from tiny dots of red, green and blue light. Turn all three up to full brightness and you get white."
  ], "Colours opposite each other on the colour wheel, like red and green, are called complementary colours. Side by side, they make each other look brighter.", ['rainbow', 'leonardo', 'cave'], { s: 'mix', a: 'apart', label: 'Mix the paints' },
  ["What colour do you get by mixing yellow and blue paint?", "Green", "Orange", "Purple"]);
  add('leonardo', 'arts', 'Leonardo da Vinci', [
    "Leonardo da Vinci was an Italian artist, scientist and inventor who lived from 1452 to 1519. He painted the Mona Lisa, perhaps the most famous painting in the world. Today it hangs in the Louvre museum in Paris.",
    "Leonardo was curious about everything. He filled thousands of notebook pages with drawings of plants, animals, the human body, flowing water and machines.",
    "He sketched ideas for flying machines, a parachute and a diving suit, hundreds of years before such things were really built. Most of his inventions stayed on paper, but they show his amazing imagination."
  ], "Leonardo often wrote his notes in mirror writing, from right to left, so they are easiest to read in a mirror.", ['airplane', 'printing', 'colors'], { s: 'harp', a: 'flutter', label: 'Flap the flying machine' },
  ["Which famous painting did Leonardo da Vinci paint?", "The Mona Lisa", "The Starry Night", "Sunflowers"]);
  add('cave', 'arts', 'Cave Paintings', [
    "Long before writing was invented, people painted pictures on the walls of caves. The paintings show animals such as horses, bison, deer and wild cattle, drawn with charcoal and colourful earth pigments called ochre.",
    "In 1940, four teenagers exploring near Lascaux in France found a cave covered in amazing paintings about 17,000 years old. So many visitors came that the paintings began to be damaged, so the cave was closed and a copy was built nearby for people to see.",
    "Just last December, in 1994, explorers discovered the Chauvet Cave in southern France. Its paintings of lions, horses and rhinoceroses are more than 30,000 years old, among the oldest known anywhere."
  ], "Some cave artists blew paint around their hands, through hollow bones or reeds, leaving hand outlines on the walls.", ['colors', 'leonardo', 'elephant'], { s: 'drip', a: 'flicker', label: 'Light a torch in the cave' },
  ["What animals do cave paintings often show?", "Horses, bison and deer", "Cats and dogs", "Dinosaurs"]);

  const BY = {}; A.forEach(a => { BY[a.id] = a; });
  const TIMELINE = [
    { y: -3500, t: 'The wheel, in Mesopotamia', id: 'wheel' },
    { y: 105, t: 'Cai Lun improves paper-making in China (traditional date)' },
    { y: 1040, t: 'Bi Sheng makes movable type from clay in China', id: 'printing' },
    { y: 1440, t: "Gutenberg's printing press", id: 'printing' },
    { y: 1608, t: 'The telescope is invented in the Netherlands' },
    { y: 1700, t: 'Cristofori invents the piano', id: 'piano' },
    { y: 1804, t: 'First steam railway locomotive, built by Richard Trevithick' },
    { y: 1826, t: 'Nicephore Niepce makes the oldest surviving camera photograph (about 1826-27)' },
    { y: 1876, t: 'Telephone patented by Alexander Graham Bell', id: 'telephone' },
    { y: 1879, t: "Edison's long-lasting light bulb", id: 'lightbulb' },
    { y: 1886, t: "Karl Benz patents his motor car" },
    { y: 1895, t: 'Guglielmo Marconi sends signals by radio' },
    { y: 1903, t: 'First airplane flight by the Wright brothers', id: 'airplane' },
    { y: 1926, t: 'John Logie Baird shows television', id: 'television' },
    { y: 1946, t: 'ENIAC electronic computer', id: 'computer' },
    { y: 1957, t: 'Sputnik 1, the first artificial satellite, is launched' },
    { y: 1958, t: 'Jack Kilby builds the first microchip', id: 'computer' },
    { y: 1969, t: 'ARPANET, the start of the Internet', id: 'internet' },
    { y: 1969, t: 'Apollo 11: people walk on the Moon', id: 'moon' },
    { y: 1971, t: 'The first e-mail between networked computers', id: 'internet' },
    { y: 1977, t: 'Ready-built home computers become popular', id: 'computer' },
    { y: 1981, t: 'First Space Shuttle flight', id: 'shuttle' },
    { y: 1982, t: 'Compact disc goes on sale', id: 'cd' },
    { y: 1990, t: 'The Hubble Space Telescope is launched', id: 'shuttle' },
    { y: 1991, t: 'The World Wide Web goes online', id: 'internet' }
  ];
  const sortKey = t => t.replace(/^The /, '').toUpperCase();
  const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const yearTxt = y => y < 0 ? `${-y} BC` : y < 1000 ? `AD ${y}` : String(y);

  const ICON = '<svg viewBox="0 0 32 32" shape-rendering="crispEdges" aria-hidden="true"><rect x="3" y="5" width="18" height="24" fill="#1a237e" stroke="#000"/><rect x="5" y="5" width="2" height="24" fill="#3949ab"/><rect x="9" y="9" width="10" height="3" fill="#ffd21f"/><rect x="9" y="14" width="8" height="1" fill="#9fa8da"/><rect x="9" y="17" width="9" height="1" fill="#9fa8da"/><circle cx="22" cy="20" r="9" fill="#d9dbe6" stroke="#000"/><path d="M22 12 A8 8 0 0 1 30 20" fill="none" stroke="#ff7ad9" stroke-width="2"/><path d="M14 20 A8 8 0 0 0 22 28" fill="none" stroke="#7af0ff" stroke-width="2"/><circle cx="22" cy="20" r="3" fill="#fff" stroke="#000"/></svg>';

  (window.RETRO_APPS = window.RETRO_APPS || []).push({
    id: 'retropedia',
    label: 'RetroPedia 95',
    help: 'A multimedia encyclopedia on CD-ROM with pictures, sounds, a timeline and a quiz: read five articles for a passport stamp and ace the quiz to earn money.',
    kind: 'builtin',
    eras: ['1995'],
    cat: 'acc',
    icon: ICON,
    window: { w: 800, h: 540 },
    css: `
      .rp{height:100%;display:flex;flex-direction:column;background:#c0c0c0;font:13px/1.35 var(--ui);position:relative;min-height:0}
      .rp-tb{display:flex;flex-wrap:wrap;gap:3px;padding:3px;align-items:center;flex:none;border-bottom:1px solid #808080}
      .rp-tb .btn{min-width:0;padding:3px 8px;display:flex;align-items:center;gap:4px;min-height:28px}
      .rp-tb .btn:active{padding:4px 7px 2px 9px}
      .rp-tb svg{width:16px;height:16px;flex:none}
      .rp-srch{display:flex;gap:3px;margin-left:auto;align-items:center}
      .rp-srch input{width:120px;font:13px var(--ui);padding:3px 4px;background:#fff;min-height:22px}
      .rp-main{flex:1;display:flex;min-height:0;gap:3px;padding:3px}
      .rp-side{width:178px;flex:none;background:#fff;overflow:auto;padding:4px 0}
      .rp-side h4{margin:2px 6px 4px;font-size:11px;color:#555;text-transform:uppercase;letter-spacing:.05em}
      .rp-side button{display:block;width:100%;text-align:left;background:none;border:0;font:13px var(--ui);padding:4px 6px 4px 8px;cursor:pointer;color:#000}
      .rp-side button.rp-c{font-weight:bold;display:flex;align-items:center;gap:6px}
      .rp-side .rp-sw{width:10px;height:10px;flex:none;border:1px solid #000}
      .rp-side button.rp-a{padding-left:24px;font-size:12px}
      .rp-side button.rp-sel{background:#000080;color:#fff}
      .rp-view{flex:1;min-width:0;overflow:auto;background:#fffdf5;position:relative;-webkit-overflow-scrolling:touch}
      .rp-status{flex:none;display:flex;gap:6px;padding:2px 4px 3px;font-size:12px}
      .rp-status>div{padding:1px 6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .rp-status>div:first-child{flex:1}
      .rp-svg{display:block;width:100%;height:100%}
      .rp-pad{padding:12px 16px 20px}
      .rp-hdr{color:#fff;padding:10px 16px;background:linear-gradient(90deg,var(--rpc,#000080),#000 140%);display:flex;align-items:center;gap:10px;flex-wrap:wrap}
      .rp-hdr h1{margin:0;font:bold 24px/1.15 "Times New Roman",Times,serif;flex:1;min-width:160px}
      .rp-hdr .rp-tag{font-size:11px;background:rgba(255,255,255,.18);padding:2px 6px;border:1px solid rgba(255,255,255,.5)}
      .rp-body{font:15px/1.55 Arial,Helvetica,sans-serif;color:#111}
      .rp-body p{margin:0 0 .8em}
      .rp-fig{float:right;width:250px;margin:0 0 10px 14px;background:#c0c0c0;padding:4px}
      .rp-fig .rp-pic{height:167px;background:#000;overflow:hidden}
      .rp-fig .btn{width:100%;margin-top:4px;min-height:34px;display:flex;align-items:center;justify-content:center;gap:6px;font:12px var(--ui)}
      .rp-cap{font:11px var(--ui);text-align:center;padding:3px 2px 0}
      .rp-tools{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 10px}
      .rp-tools .btn{min-height:32px;font:12px var(--ui)}
      .rp-dyk{clear:both;background:#fff8c4;border:2px solid #c9a400;padding:8px 10px;margin:12px 0 8px}
      .rp-dyk b{display:block;color:#7a5a00;font:bold 13px var(--ui);margin-bottom:2px}
      .rp-fut{background:#eef0ff;border:2px dashed #5a5acd;padding:8px 10px;margin:8px 0}
      .rp-fut b{display:block;color:#3a3a9a;font:bold 13px var(--ui);margin-bottom:2px}
      .rp-rel{margin-top:10px;font:13px var(--ui)}
      .rp-rel b{display:block;margin-bottom:4px}
      .rp-lnk{background:none;border:0;padding:3px 2px;margin:0 8px 2px 0;color:#0000c0;text-decoration:underline;font:inherit;cursor:pointer;text-align:left}
      .rp-lnk:visited,.rp-lnk.rp-seen{color:#6a1b9a}
      .rp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}
      .rp-card{background:#c0c0c0;padding:3px;cursor:pointer;text-align:left;font:bold 13px var(--ui);display:flex;flex-direction:column;gap:3px;border:2px solid;border-color:#fff #000 #000 #fff}
      .rp-card:active{border-color:#000 #fff #fff #000}
      .rp-card .rp-pic{aspect-ratio:3/2;background:#000;overflow:hidden;pointer-events:none}
      .rp-card span{padding:2px 3px;display:flex;justify-content:space-between;gap:4px}
      .rp-card i{font-style:normal;color:#060;font-weight:normal}
      .rp-welcome{background:linear-gradient(135deg,#000060,#3a0070 60%,#006070);color:#fff;padding:16px;display:flex;gap:14px;align-items:center}
      .rp-welcome h1{margin:0;font:bold 28px/1.1 "Times New Roman",Times,serif;color:#ffe066;text-shadow:2px 2px #000}
      .rp-welcome p{margin:6px 0 0}
      .rp-disc{width:70px;height:70px;flex:none}
      .rp-quick{display:flex;flex-wrap:wrap;gap:6px;margin:12px 0}
      .rp-quick .btn{min-height:34px}
      .rp-meter{height:12px;background:#fff;margin-top:4px}
      .rp-meter i{display:block;height:100%;background:repeating-linear-gradient(90deg,#000080 0 8px,#fff 8px 10px)}
      .rp-letters{display:flex;flex-wrap:wrap;gap:2px;margin-bottom:10px;position:sticky;top:0;background:#fffdf5;padding:4px 0;z-index:1}
      .rp-letters .btn{min-width:30px;padding:3px 0;min-height:30px}
      .rp-ix h3{margin:10px 0 4px;font:bold 18px "Times New Roman",serif;border-bottom:1px solid #999}
      .rp-ix .rp-lnk{display:block}
      .rp-ix small{color:#555;margin-left:6px;text-decoration:none}
      .rp-res{margin:0 0 12px}
      .rp-res .rp-lnk{font-weight:bold;font-size:14px}
      .rp-res div{font:13px/1.4 Arial,sans-serif;color:#333}
      .rp-res mark{background:#ffe066}
      .rp-tl{position:relative;margin:4px 0 0 4px;padding-left:18px;border-left:4px solid #000080}
      .rp-tl>div{position:relative;margin:0 0 10px;display:grid;grid-template-columns:72px 1fr;gap:8px;align-items:baseline}
      .rp-tl>div:before{content:"";position:absolute;left:-26px;top:4px;width:10px;height:10px;background:#ffd21f;border:2px solid #000080}
      .rp-tl .rp-lnk{padding:0;margin:0}
      .rp-tl .rp-yr{font:bold 15px "Times New Roman",serif;min-width:64px;color:#8b1a1a}
      .rp-quiz{max-width:560px;margin:0 auto}
      .rp-qhead{display:flex;justify-content:space-between;font:bold 13px var(--ui);margin-bottom:8px}
      .rp-quiz .rp-pic{width:180px;max-width:60%;aspect-ratio:3/2;margin:0 auto 10px;background:#000}
      .rp-quiz h2{font:bold 19px/1.3 Arial,sans-serif;margin:0 0 12px;text-align:center}
      .rp-ans{display:flex;flex-direction:column;gap:6px}
      .rp-ans .btn{text-align:left;min-height:44px;font:15px Arial,sans-serif;padding:6px 12px}
      .rp-ans .btn.rp-ok{background:#9fe39f}
      .rp-ans .btn.rp-no{background:#f3b0b0}
      .rp-fb{min-height:44px;margin:10px 0;font:14px Arial,sans-serif;text-align:center}
      .rp-big .rp-body{font-size:19px}
      .rp-big .rp-hdr h1{font-size:30px}
      .rp-big .rp-quiz h2{font-size:23px}
      .rp-big .rp-ans .btn{font-size:18px}
      .rp-big .rp-dyk,.rp-big .rp-fut{font-size:18px}
      .rp-big .rp-rel,.rp-big .rp-lnk{font-size:16px}
      .rp-big .rp-side button{font-size:15px}
      .rp-narrow .rp-side{display:none}
      .rp-narrow .rp-srch{margin-left:0;flex:1 1 100%}
      .rp-narrow .rp-srch input{flex:1;width:auto;min-width:0;min-height:28px}
      .rp-narrow .rp-tb .rp-lbl{display:none}
      .rp-narrow .rp-tb .btn{padding:3px 9px;min-height:34px}
      .rp-narrow .rp-fig{float:none;width:auto;margin:0 0 10px}
      .rp-narrow .rp-fig .rp-pic{height:auto;aspect-ratio:3/2}
      .rp-narrow .rp-pad{padding:10px 10px 18px}
      .rp-narrow .rp-grid{grid-template-columns:repeat(auto-fill,minmax(130px,1fr))}
      .rp-narrow .rp-welcome{padding:12px}
      .rp-narrow .rp-welcome h1{font-size:23px}
      .rp-narrow .rp-disc{width:48px;height:48px}
      /* boot + splash */
      .rp-boot{position:absolute;inset:0;z-index:5;background:#000;color:#c0c0c0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;cursor:pointer;text-align:center;padding:12px;overflow:hidden}
      .rp-boot svg.rp-drv{width:min(320px,86%);height:auto}
      .rp-boot .rp-msg{font:15px var(--ui);color:#fff;min-height:20px}
      .rp-boot .rp-prog{width:min(260px,80%);height:14px;background:#000;border:1px solid #888;padding:1px}
      .rp-boot .rp-prog i{display:block;height:100%;width:0;background:repeating-linear-gradient(90deg,#00a 0 8px,#000 8px 10px);transition:width 1.7s linear}
      .rp-boot small{color:#888;font:11px var(--ui)}
      .rp-cdin{animation:rp-cdin 1s ease-out forwards}
      @keyframes rp-cdin{from{transform:translate(0,-60px)}to{transform:translate(0,0)}}
      .rp-tray{transition:transform .5s}
      .rp-spin{animation:rp-spin .35s linear infinite;transform-box:fill-box;transform-origin:center}
      .rp-led{animation:rp-blinkled .25s steps(1) infinite}
      @keyframes rp-blinkled{50%{fill:#330}}
      .rp-splash{position:absolute;inset:0;z-index:6;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;text-align:center;padding:16px;background:radial-gradient(circle at 50% 40%,#3a1a8a,#000030 70%);color:#fff;overflow:hidden}
      .rp-splash h1{margin:0;font:bold clamp(30px,8vw,54px)/1 "Times New Roman",Times,serif;color:#ffe066;text-shadow:3px 3px #b0306a,6px 6px #000;letter-spacing:1px;animation:rp-zoom 1s ease-out}
      .rp-splash h1 span{color:#7af0ff}
      .rp-splash p{margin:0;font:italic 16px "Times New Roman",serif;color:#cfd8ff}
      .rp-splash small{font:12px var(--ui);color:#aab;margin-top:14px;animation:rp-blinkled2 1s steps(1) infinite}
      .rp-splash svg{width:120px;height:120px}
      @keyframes rp-zoom{from{transform:scale(.2);opacity:0}to{transform:scale(1);opacity:1}}
      @keyframes rp-blinkled2{50%{opacity:.3}}
      /* multimedia animations: run while .rp-on is set on the picture */
      .rp-pic .mv,.rp-pic .mv2,.rp-pic .mvl,.rp-pic .mvr,.rp-pic .rp-k{transform-box:fill-box;transform-origin:center}
      .rp-pic .rp-orb{transform-box:view-box;transform-origin:60px 40px}
      .rp-pic .rp-lid{transform:scaleY(0);transform-origin:50% 0}
      .rp-pic .rp-fx{opacity:0;transition:opacity .2s}
      .rp-on .rp-fx{opacity:1}
      .rp-on-shake .mv{animation:rp-shake .4s ease-in-out infinite alternate}
      .rp-on-swim .mv{animation:rp-swim 1.2s ease-in-out infinite alternate}
      .rp-on-run .mv{animation:rp-run 1s linear infinite}
      .rp-on-waddle .mv{animation:rp-shake .3s ease-in-out infinite alternate}
      .rp-on-flutter .mv{animation:rp-flut .09s linear infinite alternate}
      .rp-on-blink .mv{animation:rp-blink .9s ease-in-out infinite}
      .rp-on-hop .mv{animation:rp-hop .7s ease-in-out infinite}
      .rp-on-sway .mv{animation:rp-shake 1s ease-in-out infinite alternate}
      .rp-on-spin .mv{animation:rp-rot 1.2s linear infinite}
      .rp-on-orbit .mv{animation:rp-rot 3s linear infinite}
      .rp-on-galaxy .mv{animation:rp-rot 6s linear infinite}
      .rp-on-tilt .mv{animation:rp-shake 1.4s ease-in-out infinite alternate}
      .rp-on-twinkle .mv{animation:rp-twk .5s steps(2) infinite}
      .rp-on-bob .mv{animation:rp-bob .8s ease-in-out infinite alternate}
      .rp-on-launch .mv{animation:rp-launch 5.2s ease-in forwards}
      .rp-on-press .mv{animation:rp-press .6s ease-in-out infinite alternate}
      .rp-on-glow .mv{animation:rp-glow .5s ease-out forwards}
      .rp-on-fly .mv{animation:rp-fly 2.6s ease-in-out infinite}
      .rp-on-flicker .mv{animation:rp-flick .15s steps(2) infinite}
      .rp-on-lights .mv{animation:rp-twk .3s steps(2) infinite}
      .rp-on-lights .mv2{animation:rp-twk .3s steps(2) .15s infinite}
      .rp-on-flag .mv{animation:rp-flut .15s linear infinite alternate}
      .rp-on-rise .mv{animation:rp-rise .9s ease-out infinite}
      .rp-on-wave .mv{animation:rp-wave 1.2s ease-in-out infinite alternate}
      .rp-on-drip .mv{animation:rp-drip .5s linear infinite}
      .rp-on-pulse .mv{animation:rp-pulse .8s ease-in-out infinite}
      .rp-on-flow .mv{animation:rp-flow .6s linear infinite}
      .rp-on-reveal .mv{animation:rp-reveal 2s ease-out}
      .rp-on-apart .mvl{animation:rp-left 1.4s ease-in-out infinite alternate}
      .rp-on-apart .mvr{animation:rp-right 1.4s ease-in-out infinite alternate}
      .rp-on-dance .mv{animation:rp-shake .25s ease-in-out infinite alternate}
      .rp-on-scrub .mv{animation:rp-swim .18s linear infinite alternate}
      .rp-on-scrub .mv2{animation:rp-twk .4s steps(2) infinite}
      .rp-on-inflate .mv{animation:rp-infl 2.8s ease-in-out infinite}
      .rp-on-keys .rp-k{animation:rp-key 2s ease-in-out infinite}
      .rp-on-conduct .mv{animation:rp-shake .45s ease-in-out infinite alternate}
      .rp-on-drums .mv{animation:rp-pulse .36s ease-out infinite}
      .rp-on-drums .mv2{animation:rp-shake .18s ease-in-out infinite alternate}
      .rp-on-vibrate .mv{animation:rp-vib .05s linear infinite alternate}
      @keyframes rp-shake{from{transform:rotate(-7deg)}to{transform:rotate(7deg)}}
      @keyframes rp-swim{from{transform:translateX(-6px)}to{transform:translateX(6px)}}
      @keyframes rp-run{from{transform:translateX(-70px)}to{transform:translateX(70px)}}
      @keyframes rp-flut{from{transform:scaleY(1)}to{transform:scaleY(.35)}}
      @keyframes rp-blink{0%,35%,65%,100%{transform:scaleY(0)}50%{transform:scaleY(1)}}
      @keyframes rp-hop{0%,100%{transform:translateY(0)}50%{transform:translateY(-16px)}}
      @keyframes rp-rot{to{transform:rotate(360deg)}}
      @keyframes rp-twk{50%{opacity:.15}}
      @keyframes rp-bob{from{transform:translateY(3px)}to{transform:translateY(-6px)}}
      @keyframes rp-launch{0%,40%{transform:translate(0,0)}43%{transform:translate(1px,0)}46%{transform:translate(-1px,0)}100%{transform:translate(0,-120px)}}
      @keyframes rp-press{from{transform:translateY(0)}to{transform:translateY(11px)}}
      @keyframes rp-glow{from{opacity:.12}to{opacity:1}}
      @keyframes rp-fly{0%{transform:translate(90px,8px)}50%{transform:translate(0,-6px)}100%{transform:translate(-110px,4px)}}
      @keyframes rp-flick{50%{opacity:.55}}
      @keyframes rp-rise{from{transform:translateY(0);opacity:1}to{transform:translateY(-14px);opacity:0}}
      @keyframes rp-wave{from{transform:translateX(-10px)}to{transform:translateX(0)}}
      @keyframes rp-drip{from{transform:translateY(-6px)}to{transform:translateY(8px)}}
      @keyframes rp-pulse{0%,100%{transform:scale(1)}30%{transform:scale(1.12)}}
      @keyframes rp-flow{to{stroke-dashoffset:-24}}
      @keyframes rp-reveal{from{opacity:0}to{opacity:1}}
      @keyframes rp-left{from{transform:translateX(0)}to{transform:translateX(-14px)}}
      @keyframes rp-right{from{transform:translateX(0)}to{transform:translateX(14px)}}
      @keyframes rp-infl{0%,100%{transform:scale(.92)}45%,55%{transform:scale(1.08)}}
      @keyframes rp-key{0%,8%{transform:translateY(0)}3%{transform:translateY(3px);opacity:.6}}
      @keyframes rp-vib{from{transform:translateY(-.4px)}to{transform:translateY(.4px)}}
      @media (prefers-reduced-motion:reduce){.rp-cdin,.rp-spin,.rp-splash h1{animation:none}}
    `,
    open(W, api) {
      const $ = s => W.body.querySelector(s);
      const esc = api.esc;
      const timers = new Set();
      const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); return t; };
      let read = api.load('read', []); if (!Array.isArray(read)) read = [];
      let big = !!api.load('big', false);
      let hist = [], pos = -1, cur = null, quiz = null, booting = true, spoke = false;
      if (read.length >= 5) api.stamp('pedia-look');

      /* ---------- sound design ---------- */
      const T = (f, d, o = {}) => api.tone(f, d, Object.assign({ vol: .08 }, o));
      const N = (d, o = {}) => api.noise(d, Object.assign({ vol: .08 }, o));
      const M = n => api.midi ? api.midi(n) : 440 * Math.pow(2, (n - 69) / 12);
      const pluck = (n, at, d = .8, type = 'triangle', vol = .09) => T(M(n), d, { at, type, vol, decay: 1 });
      const SND = {
        trumpet() { T(300, .15, { type: 'sawtooth', to: 420, vol: .06 }); T(420, .9, { type: 'sawtooth', at: .12, to: 640, vol: .07, attack: .1, release: .2 }); T(640, .5, { type: 'square', at: .95, to: 470, vol: .04, decay: 1 }); N(1.1, { f: 900, q: 2, vol: .04 }); return 1.6; },
        whale() { T(170, 1.4, { type: 'sine', to: 95, vol: .11, attack: .3, release: .4 }); T(100, 1.6, { type: 'sine', at: 1.5, to: 160, vol: .11, attack: .3, release: .4 }); T(250, 1.2, { type: 'triangle', at: .3, to: 140, vol: .03, attack: .3, release: .3 }); return 3.2; },
        chirp() { for (let i = 0; i < 5; i++) T(2100, .09, { type: 'sine', at: i * .28, to: 2900, vol: .07 }); return 1.5; },
        penguin() { for (let i = 0; i < 6; i++) T(i % 2 ? 760 : 560, .13, { type: 'square', at: i * .14, to: i % 2 ? 620 : 700, vol: .04 }); T(500, .5, { type: 'sawtooth', at: .9, to: 700, vol: .04 }); return 1.5; },
        buzz() { for (let i = 0; i < 8; i++) T(i % 2 ? 230 : 214, .2, { type: 'sawtooth', at: i * .18, vol: .035 }); return 1.6; },
        hoot() { T(420, .32, { type: 'sine', to: 380, vol: .1, attack: .05, release: .12 }); T(420, .18, { type: 'sine', at: .55, vol: .08, attack: .03, release: .08 }); T(430, .5, { type: 'sine', at: .8, to: 370, vol: .1, attack: .05, release: .2 }); return 1.8; },
        croak() { for (let k = 0; k < 2; k++) for (let i = 0; i < 7; i++) T(115, .03, { type: 'square', at: k * .7 + i * .045, vol: .09, decay: 1 }); N(.3, { ft: 'lowpass', f: 500, vol: .05 }); return 1.6; },
        bubble() { for (let i = 0; i < 9; i++) T(300 + Math.random() * 500, .08, { type: 'sine', at: i * .15 + Math.random() * .05, to: 900 + Math.random() * 700, vol: .07 }); return 1.6; },
        hum() { T(110, 2.2, { type: 'sine', vol: .1, attack: .5, release: .6 }); T(165, 2.2, { type: 'sine', vol: .05, attack: .8, release: .6 }); N(2.2, { ft: 'lowpass', f: 300, vol: .05, attack: .5, release: .6 }); return 2.4; },
        beeps() { N(2, { ft: 'bandpass', f: 1800, q: .7, vol: .025 }); T(2525, .25, { type: 'sine', vol: .06 }); T(2475, .25, { type: 'sine', at: 1.2, vol: .06 }); return 2; },
        wind() { N(2.4, { ft: 'bandpass', f: 500, q: .8, vol: .1, attack: .7, release: .9 }); N(1.6, { ft: 'bandpass', f: 900, q: 2, at: .6, vol: .05, attack: .5, release: .6 }); return 2.6; },
        breeze() { N(2, { ft: 'bandpass', f: 1400, q: 1.2, vol: .06, attack: .8, release: .8 }); return 2.2; },
        whoosh() { for (let i = 0; i < 5; i++) N(.7, { ft: 'bandpass', f: 300 + i * 250, q: 1.5, at: i * .35, vol: .08, attack: .3, release: .3 }); return 2.4; },
        shimmer() { [72, 76, 79, 84, 88, 91, 96].forEach((n, i) => pluck(n, i * .12, 1.2, 'sine', .05)); return 2; },
        ping() { [0, .6, 1.3].forEach((at, i) => T(1500 - i * 200, 1, { type: 'sine', at, vol: .06, decay: 1 })); return 2.3; },
        twinkle() { for (let i = 0; i < 10; i++) T(1200 + Math.random() * 1800, .12, { type: 'sine', at: i * .16, vol: .045, decay: 1 }); return 1.8; },
        rocket() { [0, .5, 1, 1.5, 2].forEach((at, i) => T(i === 4 ? 1320 : 880, .12, { type: 'square', at, vol: .05 })); N(3, { ft: 'lowpass', f: 600, at: 2.3, vol: .12, attack: .4, release: 1.2 }); T(55, 3, { type: 'sawtooth', at: 2.3, vol: .05, attack: .3, release: 1 }); return 5.4; },
        roll() { N(1.8, { ft: 'lowpass', f: 240, vol: .1, attack: .3, release: .4 }); for (let i = 0; i < 8; i++) N(.03, { f: 600, q: 3, at: i * .22, vol: .07, decay: 1 }); return 2; },
        clunk() { for (let i = 0; i < 3; i++) { T(90, .2, { type: 'sine', at: i * .6, to: 50, vol: .12, decay: 1 }); N(.08, { ft: 'lowpass', f: 700, at: i * .6, vol: .1, decay: 1 }); } return 1.8; },
        ring() { for (let k = 0; k < 2; k++) for (let i = 0; i < 18; i++) T(i % 2 ? 1250 : 1000, .045, { type: 'square', at: k * 1.4 + i * .05, vol: .035 }); return 2.4; },
        bulb() { N(.02, { ft: 'highpass', f: 2600, vol: .12, decay: 1 }); T(120, 1.6, { type: 'sine', at: .05, vol: .04, attack: .2, release: .5 }); T(240, 1.6, { type: 'sine', at: .05, vol: .015, attack: .2, release: .5 }); return 2; },
        prop() { for (let i = 0; i < 40; i++) T(80 + (i % 2) * 6, .04, { type: 'sawtooth', at: i * .06, vol: .05 }); N(2.4, { ft: 'lowpass', f: 400, vol: .04, attack: .3, release: .5 }); return 2.6; },
        static() { N(1.6, { ft: 'highpass', f: 1500, vol: .06 }); T(15734 / 16, .2, { type: 'sine', at: 1.6, vol: .04 }); return 2; },
        compute() { for (let i = 0; i < 16; i++) T(api.pick([440, 660, 880, 990, 1320]), .06, { type: 'square', at: i * .1, vol: .035 }); return 1.8; },
        whir() { N(2, { f: 380, q: 4, vol: .1, attack: .6, release: .5 }); T(90, 2, { type: 'sine', to: 260, vol: .05, attack: .6, release: .4 }); return 2.2; },
        modem() { [0, .15, .3, .45].forEach((at, i) => T([697, 770, 852, 941][i], .1, { type: 'sine', at, vol: .05 })); T(2100, .8, { type: 'sine', at: .8, vol: .05 }); N(1.2, { ft: 'bandpass', f: 1800, q: 1, at: 1.7, vol: .07 }); T(1200, .6, { type: 'square', at: 1.8, to: 2400, vol: .025 }); return 3; },
        rumble() { N(2.2, { ft: 'lowpass', f: 140, vol: .12, attack: .5, release: .7 }); T(45, 2.2, { type: 'sine', vol: .1, attack: .5, release: .7 }); N(.4, { ft: 'lowpass', f: 400, at: 1.6, vol: .09, decay: 1 }); return 2.4; },
        waves() { N(1.4, { ft: 'lowpass', f: 900, vol: .1, attack: .6, release: .7 }); N(1.4, { ft: 'lowpass', f: 1100, at: 1.4, vol: .1, attack: .6, release: .7 }); return 2.8; },
        rain() { N(2.6, { ft: 'highpass', f: 3000, vol: .05, attack: .3, release: .5 }); [.3, .9, 1.7].forEach(at => { T(2600, .08, { type: 'sine', at, to: 3400, vol: .05 }); T(3000, .08, { type: 'sine', at: at + .12, to: 2400, vol: .05 }); }); return 2.8; },
        water() { N(2.2, { ft: 'bandpass', f: 700, q: .7, vol: .05, attack: .3, release: .4 }); for (let i = 0; i < 12; i++) T(400 + Math.random() * 400, .06, { type: 'sine', at: i * .17, to: 800 + Math.random() * 500, vol: .04 }); return 2.4; },
        chime() { [72, 74, 76, 79, 81, 84, 88].forEach((n, i) => pluck(n, i * .18, 1, 'triangle', .07)); return 2.4; },
        grind() { N(2.4, { ft: 'lowpass', f: 180, vol: .1, attack: .6, release: .6 }); T(38, 2.4, { type: 'triangle', vol: .08, attack: .6, release: .6 }); return 2.8; },
        heartbeat() { for (let i = 0; i < 4; i++) { T(62, .12, { type: 'sine', at: i * .85, vol: .12, decay: 1 }); T(50, .1, { type: 'sine', at: i * .85 + .2, vol: .1, decay: 1 }); } return 3.4; },
        zap() { for (let i = 0; i < 6; i++) T(1400 + i * 100, .07, { type: 'square', at: i * .2 + Math.random() * .05, to: 300, vol: .035 }); return 1.4; },
        xylo() { [67, 71, 74, 79, 74, 71, 67, 62].forEach((n, i) => { pluck(n, i * .16, .35, 'sine', .09); pluck(n + 24, i * .16, .1, 'sine', .02); }); return 1.6; },
        brush() { for (let i = 0; i < 8; i++) N(.14, { ft: 'highpass', f: 3500, at: i * .18, vol: .06, attack: .04, release: .08 }); return 1.6; },
        breath() { N(1.3, { f: 800, q: .6, vol: .06, attack: 1, release: .2 }); N(1.5, { f: 600, q: .6, at: 1.4, vol: .06, attack: .1, release: 1.2 }); return 3; },
        blink() { T(1800, .05, { type: 'sine', vol: .05 }); T(1200, .05, { type: 'sine', at: .9, vol: .05 }); return 1.8; },
        sweep() { T(200, 2.4, { type: 'sine', to: 4000, vol: .06, attack: .2, release: .3 }); return 2.6; },
        tap() { for (let i = 0; i < 4; i++) N(.05, { f: 1200, q: 2, at: i * .3, vol: .08, decay: 1 }); return 1.4; },
        piano() { [60, 62, 64, 65, 67, 69, 71, 72].forEach((n, i) => { pluck(n, i * .25, 1.1, 'triangle', .1); pluck(n + 12, i * .25, .5, 'sine', .02); }); return 2.4; },
        orch() { [48, 55, 60, 64, 67, 72].forEach(n => T(M(n), 2, { type: 'sawtooth', vol: .02, attack: .4, release: .6 })); [60, 64, 67, 72].forEach((n, i) => pluck(n + 12, 1 + i * .15, .8, 'triangle', .06)); T(M(36), .5, { type: 'sine', at: 1.9, vol: .12, decay: 1 }); return 2.6; },
        drums() { const st = .18; for (let i = 0; i < 16; i++) { const at = i * st; N(.04, { ft: 'highpass', f: 7000, at, vol: .04, decay: 1 }); if (i % 8 === 0 || i % 8 === 3 || i % 8 === 5) T(150, .2, { type: 'sine', at, to: 45, vol: .12, decay: 1 }); if (i % 4 === 2) N(.14, { ft: 'highpass', f: 1400, at, vol: .1, decay: 1 }); } N(.9, { ft: 'highpass', f: 5000, at: 16 * st, vol: .06, decay: 1 }); return 3.8; },
        strum() { [43, 47, 50, 55, 59, 67].forEach((n, i) => { pluck(n, i * .03, 2, 'sawtooth', .025); pluck(n, i * .03, 1.5, 'triangle', .04); }); [43, 47, 50, 55, 59, 67].forEach((n, i) => pluck(n, 1.1 + i * .02, 1.4, 'triangle', .035)); return 2.6; },
        mozart() { const q = .38, e = q / 2; [[67, 0, q], [62, q + e, e], [67, 2 * q, q], [62, 3 * q + e, e], [67, 4 * q, e], [62, 4 * q + e, e], [67, 5 * q, e], [71, 5 * q + e, e], [74, 6 * q, q * 1.5]].forEach(([n, at, d]) => { T(M(n), d * .95, { type: 'triangle', at, vol: .1, release: .05 }); T(M(n - 12), d * .9, { type: 'sine', at, vol: .03 }); }); return 3.2; },
        mix() { [60, 64, 67].forEach((n, i) => T(M(n), 1.4, { type: 'sine', at: i * .3, vol: .05, attack: .1, release: .5 })); T(M(72), 1, { type: 'triangle', at: 1.1, vol: .06, decay: 1 }); return 2.4; },
        harp() { [62, 66, 69, 74, 78, 81, 86, 81, 78, 74].forEach((n, i) => pluck(n, i * .11, 1, 'triangle', .06)); return 2; },
        drip() { [0, .7, 1.5].forEach(at => { for (let k = 0; k < 3; k++) T(1100, .15, { type: 'sine', at: at + k * .18, to: 1600, vol: .07 / (k + 1), decay: 1 }); }); N(2.2, { ft: 'lowpass', f: 200, vol: .03 }); return 2.4; }
      };
      const cdWhir = () => { N(2.2, { f: 380, q: 4, vol: .11, attack: .6, release: .5 }); T(90, 2.2, { type: 'sine', to: 260, vol: .05, attack: .6, release: .4 }); later(() => api.sfx.seek && api.sfx.seek(7), 900); };
      const jingle = () => { [[72, 0], [76, .15], [79, .3], [84, .45], [83, .75], [88, .9]].forEach(([n, at]) => { T(M(n), .5, { type: 'triangle', at, vol: .09, decay: 1 }); T(M(n) * 2, .2, { type: 'sine', at, vol: .02, decay: 1 }); }); [60, 64, 67, 72].forEach(n => T(M(n), 1.2, { type: 'sine', at: .9, vol: .04, attack: .05, release: .6 })); };

      /* ---------- shell ---------- */
      const ico = {
        back: '<svg viewBox="0 0 16 16" shape-rendering="crispEdges"><path d="M2 8 L8 2 V5 H14 V11 H8 V14z" fill="#008000" stroke="#000"/></svg>',
        fwd: '<svg viewBox="0 0 16 16" shape-rendering="crispEdges"><path d="M14 8 L8 2 V5 H2 V11 H8 V14z" fill="#008000" stroke="#000"/></svg>',
        home: '<svg viewBox="0 0 16 16" shape-rendering="crispEdges"><path d="M1 8 L8 1 L15 8 H13 V15 H3 V8z" fill="#ffd21f" stroke="#000"/><rect x="7" y="10" width="3" height="5" fill="#8b1a1a"/></svg>',
        index: '<svg viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="2" y="1" width="12" height="14" fill="#fff" stroke="#000"/><text x="4" y="11" font-size="8" font-family="Arial" font-weight="bold">AZ</text></svg>',
        time: '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="7" fill="#fff" stroke="#000"/><path d="M8 3 V8 H12" fill="none" stroke="#000" stroke-width="1.5"/></svg>',
        quiz: '<svg viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="1" y="1" width="14" height="14" fill="#ffd21f" stroke="#000"/><text x="5" y="13" font-size="12" font-family="Arial" font-weight="bold">?</text></svg>',
        rand: '<svg viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="2" y="2" width="12" height="12" fill="#fff" stroke="#000"/><rect x="4" y="4" width="2" height="2"/><rect x="10" y="4" width="2" height="2"/><rect x="7" y="7" width="2" height="2"/><rect x="4" y="10" width="2" height="2"/><rect x="10" y="10" width="2" height="2"/></svg>'
      };
      W.body.innerHTML = `<div class="rp${big ? ' rp-big' : ''}">
        <div class="rp-tb">
          <button class="btn" data-act="back" title="Back">${ico.back}<span class="rp-lbl">Back</span></button>
          <button class="btn" data-act="fwd" title="Forward">${ico.fwd}<span class="rp-lbl">Forward</span></button>
          <button class="btn" data-act="home" title="Contents">${ico.home}<span class="rp-lbl">Contents</span></button>
          <button class="btn" data-act="index" title="A-Z Index">${ico.index}<span class="rp-lbl">Index</span></button>
          <button class="btn" data-act="time" title="Timeline">${ico.time}<span class="rp-lbl">Timeline</span></button>
          <button class="btn" data-act="quiz" title="Quiz">${ico.quiz}<span class="rp-lbl">Quiz</span></button>
          <button class="btn" data-act="rand" title="Random article">${ico.rand}<span class="rp-lbl">Random</span></button>
          <form class="rp-srch"><input class="sunken" type="search" placeholder="Search RetroPedia" aria-label="Search RetroPedia" enterkeyhint="search"><button class="btn" type="submit">Find</button></form>
        </div>
        <div class="rp-main"><div class="rp-side sunken" role="navigation"></div><div class="rp-view sunken" tabindex="-1"></div></div>
        <div class="rp-status"><div class="sunken rp-st1">Ready</div><div class="sunken rp-st2"></div></div>
      </div>`;
      const root = $('.rp'), view = $('.rp-view'), side = $('.rp-side'), input = $('.rp-srch input');

      const fit = () => { const w = root.clientWidth; root.classList.toggle('rp-narrow', w > 0 && w < 600); };
      const ro = window.ResizeObserver ? new ResizeObserver(fit) : null; ro && ro.observe(root); fit();
      W.onResize = fit;

      const pic = (id, cls = '') => `<div class="rp-pic${cls}"><svg class="rp-svg" viewBox="0 0 120 80" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${ART[id] ? ART[id]() : ''}</svg></div>`;
      const catOf = id => CATS.find(c => c.id === id);
      const status = () => { $('.rp-st2').textContent = `Articles read: ${read.length} of ${A.length}`; };
      const shush = () => { try { if (spoke && window.speechSynthesis) speechSynthesis.cancel(); } catch (e) { /* no speech */ } spoke = false; };

      function renderSide() {
        const cc = cur && (cur.v === 'cat' ? cur.id : cur.v === 'art' ? BY[cur.id].cat : null);
        side.innerHTML = '<h4>Subjects</h4>' + CATS.map(ct => `<button class="rp-c${cur && cur.v === 'cat' && cur.id === ct.id ? ' rp-sel' : ''}" data-go="cat:${ct.id}"><span class="rp-sw" style="background:${ct.col}"></span>${esc(ct.name)}</button>` +
          (cc === ct.id ? A.filter(a => a.cat === ct.id).map(a => `<button class="rp-a${cur.v === 'art' && cur.id === a.id ? ' rp-sel' : ''}" data-go="art:${a.id}">${esc(a.t)}</button>`).join('') : '')).join('');
        const sel = side.querySelector('.rp-sel'); if (sel && sel.scrollIntoView) { const top = sel.offsetTop; if (top < side.scrollTop || top > side.scrollTop + side.clientHeight - 30) side.scrollTop = top - 60; }
      }

      function go(st, push = true) {
        shush();
        if (push) { hist = hist.slice(0, pos + 1); hist.push(st); pos = hist.length - 1; if (hist.length > 60) { hist.shift(); pos--; } }
        cur = st; render();
      }
      const back = () => { if (pos > 0) { pos--; go(hist[pos], false); api.sfx.click(); } };
      const fwd = () => { if (pos < hist.length - 1) { pos++; go(hist[pos], false); api.sfx.click(); } };
      const randomArt = () => { const pool = A.filter(a => !cur || cur.id !== a.id); const unread = pool.filter(a => !read.includes(a.id)); go({ v: 'art', id: api.pick(unread.length && Math.random() < .7 ? unread : pool).id }); };

      function render() {
        const v = cur.v;
        root.querySelector('[data-act=back]').disabled = pos <= 0;
        root.querySelector('[data-act=fwd]').disabled = pos >= hist.length - 1;
        let title = 'Contents';
        if (v === 'home') view.innerHTML = homeHTML();
        else if (v === 'cat') { const ct = catOf(cur.id); title = ct.name; view.innerHTML = catHTML(ct); }
        else if (v === 'art') { const a = BY[cur.id]; title = a.t; view.innerHTML = artHTML(a); markRead(a.id); }
        else if (v === 'index') { title = 'A-Z Index'; view.innerHTML = indexHTML(); }
        else if (v === 'search') { title = 'Search'; view.innerHTML = searchHTML(cur.q); }
        else if (v === 'time') { title = 'Timeline'; view.innerHTML = timeHTML(); }
        else if (v === 'quiz') { title = 'Quiz'; if (!quiz) newQuiz(); view.innerHTML = quizHTML(); }
        else if (v === 'help') { title = 'How to use'; view.innerHTML = helpHTML(); }
        api.setTitle(`RetroPedia 95 - ${title}`);
        $('.rp-st1').textContent = v === 'art' ? `${catOf(BY[cur.id].cat).name} > ${BY[cur.id].t}` : title;
        view.scrollTop = 0; renderSide(); status();
      }

      function markRead(id) {
        if (read.includes(id)) return;
        read.push(id); api.save('read', read);
        if (read.length === 5) { api.stamp('pedia-look'); }
        else if (read.length > 5) api.stamp('pedia-look');
        if (read.length === A.length) later(() => api.msgBox('RetroPedia 95', `Wow! You have read all ${A.length} articles. You are a real encyclopedia explorer!`), 400);
      }

      /* ---------- pages ---------- */
      function homeHTML() {
        const day = A[Math.floor(Date.now() / 864e5) % A.length];
        const pct = Math.round(read.length / A.length * 100);
        return `<div class="rp-welcome"><svg class="rp-disc" viewBox="0 0 120 80" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${ART.cd()}</svg><div><h1>RetroPedia 95</h1><p>The multimedia encyclopedia on CD-ROM. ${A.length} articles with pictures, sounds and animations about our amazing world.</p></div></div>
        <div class="rp-pad"><b>Choose a subject:</b><div class="rp-grid" style="margin-top:6px">${CATS.map(ct => `<button class="rp-card" data-go="cat:${ct.id}">${pic(ct.pic)}<span style="color:${ct.col}">${esc(ct.name)}<i>${A.filter(a => a.cat === ct.id && read.includes(a.id)).length}/${A.filter(a => a.cat === ct.id).length}</i></span></button>`).join('')}</div>
        <div class="rp-quick"><button class="btn" data-go="art:${day.id}">Article of the day: ${esc(day.t)}</button><button class="btn" data-act="rand">Random article</button><button class="btn" data-act="index">A-Z Index</button><button class="btn" data-act="time">Timeline of inventions</button><button class="btn" data-act="quiz">Take the quiz</button><button class="btn" data-act="help">How to use</button></div>
        <div>You have explored <b>${read.length}</b> of ${A.length} articles.${read.length < 5 ? ` Read ${5 - read.length} more to earn the "Explored the CD-ROM" passport stamp!` : ''}</div><div class="rp-meter sunken"><i style="width:${pct}%"></i></div></div>`;
      }
      const cardsHTML = list => `<div class="rp-grid">${list.map(a => `<button class="rp-card" data-go="art:${a.id}">${pic(a.id)}<span>${esc(a.t)}${read.includes(a.id) ? '<i title="Read">&#10003;</i>' : ''}</span></button>`).join('')}</div>`;
      function catHTML(ct) {
        return `<div class="rp-hdr" style="--rpc:${ct.col}"><h1>${esc(ct.name)}</h1><span class="rp-tag">${A.filter(a => a.cat === ct.id).length} articles</span></div><div class="rp-pad">${cardsHTML(A.filter(a => a.cat === ct.id))}</div>`;
      }
      function artHTML(a) {
        const ct = catOf(a.cat);
        return `<div class="rp-hdr" style="--rpc:${ct.col}"><h1>${esc(a.t)}</h1><button class="rp-lnk rp-tag" style="color:#fff;margin:0" data-go="cat:${ct.id}">${esc(ct.name)}</button></div>
        <div class="rp-pad rp-body">
          <div class="rp-fig raised">${pic(a.id, ' sunken')}<button class="btn" data-act="play">&#9654; ${esc(a.fx.label)}</button><div class="rp-cap">Multimedia: sound and animation</div></div>
          <div class="rp-tools"><button class="btn" data-act="say">Read aloud</button>${a.year ? `<button class="btn" data-act="time">See it on the Timeline (${yearTxt(a.year)})</button>` : ''}</div>
          ${a.p.map(t => `<p>${esc(t)}</p>`).join('')}
          <div class="rp-dyk"><b>Did you know?</b>${esc(a.dyk)}</div>
          ${a.future ? `<div class="rp-fut"><b>From the future</b>${esc(a.future)}</div>` : ''}
          <div class="rp-rel"><b>See also:</b>${a.rel.map(id => `<button class="rp-lnk${read.includes(id) ? ' rp-seen' : ''}" data-go="art:${id}">${esc(BY[id].t)}</button>`).join('')}</div>
        </div>`;
      }
      function indexHTML() {
        const sorted = A.slice().sort((x, y) => sortKey(x.t).localeCompare(sortKey(y.t)));
        const groups = {}; sorted.forEach(a => { const L = sortKey(a.t)[0]; (groups[L] = groups[L] || []).push(a); });
        return `<div class="rp-hdr"><h1>A-Z Index</h1><span class="rp-tag">${A.length} articles</span></div><div class="rp-pad rp-ix">
          <div class="rp-letters">${'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(L => `<button class="btn" data-letter="${L}"${groups[L] ? '' : ' disabled'}>${L}</button>`).join('')}</div>
          ${Object.keys(groups).map(L => `<h3 data-l="${L}">${L}</h3>` + groups[L].map(a => `<button class="rp-lnk${read.includes(a.id) ? ' rp-seen' : ''}" data-go="art:${a.id}">${esc(a.t)}<small>${esc(catOf(a.cat).name)}</small></button>`).join('')).join('')}</div>`;
      }
      function search(q) {
        const words = norm(q).split(/[^a-z0-9]+/).filter(Boolean);
        if (!words.length) return [];
        return A.map(a => {
          const tt = norm(a.t), body = norm(a.p.join(' ') + ' ' + a.dyk + ' ' + (a.future || '') + ' ' + catOf(a.cat).name);
          let score = 0;
          for (const w of words) { if (tt.includes(w)) score += 10; else if (body.includes(w)) score += 1; else return null; }
          return { a, score };
        }).filter(Boolean).sort((x, y) => y.score - x.score).map(x => x.a);
      }
      function snippet(a, q) {
        const words = norm(q).split(/[^a-z0-9]+/).filter(Boolean);
        const text = a.p.join(' '), nt = norm(text);
        let i = -1; for (const w of words) { i = nt.indexOf(w); if (i >= 0) break; }
        let s = i < 0 ? text.slice(0, 130) : text.slice(Math.max(0, i - 50), i + 90);
        s = (i > 50 ? '...' : '') + esc(s) + '...';
        words.forEach(w => { if (w.length > 1) s = s.replace(new RegExp(`(${w})`, 'gi'), '<mark>$1</mark>'); });
        return s;
      }
      function searchHTML(q) {
        const res = search(q);
        return `<div class="rp-hdr"><h1>Search: "${esc(q)}"</h1><span class="rp-tag">${res.length} found</span></div><div class="rp-pad">` +
          (res.length ? res.map(a => `<div class="rp-res"><button class="rp-lnk" data-go="art:${a.id}">${esc(a.t)}</button> <small>(${esc(catOf(a.cat).name)})</small><div>${snippet(a, q)}</div></div>`).join('')
            : `<p>Sorry, RetroPedia could not find any articles about "<b>${esc(q)}</b>".</p><p>Tips: check the spelling, try a shorter word (like <i>planet</i> or <i>music</i>), or browse the <button class="rp-lnk" data-act="index">A-Z Index</button>.</p>`) + '</div>';
      }
      function timeHTML() {
        return `<div class="rp-hdr" style="--rpc:#8b1a1a"><h1>Timeline of Inventions and Discoveries</h1></div><div class="rp-pad"><p style="margin-top:0">From the first wheels to the World Wide Web. Click a blue link to read the full article.</p><div class="rp-tl">` +
          TIMELINE.map(e => `<div><span class="rp-yr">${yearTxt(e.y)}</span>${e.id ? `<button class="rp-lnk" data-go="art:${e.id}">${esc(e.t)}</button>` : `<span>${esc(e.t)}</span>`}</div>`).join('') +
          `<div><span class="rp-yr">1995</span><span><b>You are here!</b> Exploring RetroPedia 95 on CD-ROM.</span></div></div></div>`;
      }
      function helpHTML() {
        return `<div class="rp-hdr"><h1>How to use RetroPedia 95</h1></div><div class="rp-pad rp-body">
          <p><b>Browse:</b> pick a subject on the Contents page or in the list on the left, then click a picture to open an article.</p>
          <p><b>Find:</b> type a word in the search box at the top and press Enter. Or use the <b>A-Z Index</b> to see every article in alphabetical order.</p>
          <p><b>Multimedia:</b> every article has a picture with a play button. Press it to hear a sound and see an animation. Press <b>Read aloud</b> to have the computer read the article to you.</p>
          <p><b>Back and Forward</b> take you through the pages you have visited, just like turning pages. <b>Random</b> opens a surprise article.</p>
          <p><b>Timeline</b> shows inventions and discoveries in order, from the wheel to the World Wide Web.</p>
          <p><b>Quiz:</b> answer 10 questions about the articles. Get 8 or more right to win a prize of $4 in play money (once each time you use the computer).</p>
          <p><b>Big text:</b> choose View, then Large text, if the words are too small.</p>
          <p><b>Keyboard:</b> Alt+Left = Back, Alt+Right = Forward, Ctrl+F = Search, 1/2/3 = quiz answers.</p>
          <p><b>Passport stamp:</b> read 5 different articles to earn the "Explored the CD-ROM" stamp.</p></div>`;
      }

      /* ---------- quiz ---------- */
      function newQuiz() {
        const pool = A.slice(); for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
        quiz = { i: 0, score: 0, picked: null, done: false, items: pool.slice(0, 10).map(a => { const opts = [a.q[1], a.q[2], a.q[3]]; for (let i = 2; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [opts[i], opts[j]] = [opts[j], opts[i]]; } return { a, opts, right: opts.indexOf(a.q[1]) }; }) };
      }
      function quizHTML() {
        if (quiz.done) {
          const s = quiz.score, won = s >= 8;
          const best = api.load('bestQuiz', 0);
          return `<div class="rp-hdr" style="--rpc:#6a3fa0"><h1>Quiz results</h1></div><div class="rp-pad rp-quiz" style="text-align:center">
            <h2 style="font-size:28px">You scored ${s} out of 10!</h2>
            <p class="rp-body">${s === 10 ? 'A perfect score! You are a RetroPedia genius!' : won ? 'Excellent work! You really know your stuff.' : s >= 5 ? 'Good effort! Read a few more articles and try again.' : 'Nice try! Every expert started somewhere. Explore some articles and have another go.'}</p>
            ${won ? `<p class="rp-body"><b>${quiz.paid ? 'You won $4 in play money!' : 'You already won the quiz prize this session, but great job!'}</b></p>` : '<p class="rp-body">Get 8 or more right to win a $4 prize.</p>'}
            <p>Best score: ${best} / 10</p>
            <div class="rp-quick" style="justify-content:center"><button class="btn" data-act="quiz">Play again</button><button class="btn" data-act="home">Back to Contents</button></div></div>`;
        }
        const it = quiz.items[quiz.i], answered = quiz.picked !== null;
        return `<div class="rp-hdr" style="--rpc:#6a3fa0"><h1>RetroPedia Quiz</h1><span class="rp-tag">Question ${quiz.i + 1} of 10</span></div><div class="rp-pad rp-quiz">
          <div class="rp-qhead"><span>Score: ${quiz.score}</span><span>Topic: ${esc(catOf(it.a.cat).name)}</span></div>
          ${pic(it.a.id, ' sunken')}
          <h2>${esc(it.a.q[0])}</h2>
          <div class="rp-ans">${it.opts.map((o, i) => `<button class="btn${answered ? (i === it.right ? ' rp-ok' : i === quiz.picked ? ' rp-no' : '') : ''}" data-ans="${i}"${answered ? ' disabled' : ''}>${i + 1}. ${esc(o)}</button>`).join('')}</div>
          <div class="rp-fb" role="status">${answered ? (quiz.picked === it.right ? '<b style="color:#060">Correct! Well done!</b>' : `Not quite. The answer is <b>${esc(it.opts[it.right])}</b>.`) + ` <button class="rp-lnk" data-go="art:${it.a.id}">Read about ${esc(it.a.t)}</button>` : 'Choose an answer.'}</div>
          ${answered ? `<div style="text-align:center"><button class="btn" data-act="next" style="min-height:40px;min-width:140px">${quiz.i < 9 ? 'Next question' : 'See my score'}</button></div>` : ''}</div>`;
      }
      function answer(i) {
        if (!quiz || quiz.done || quiz.picked !== null) return;
        const it = quiz.items[quiz.i]; quiz.picked = i;
        if (i === it.right) { quiz.score++; api.sfx.ding ? api.sfx.ding() : api.sfx.beep(); } else T(220, .25, { type: 'triangle', vol: .07 });
        view.innerHTML = quizHTML(); const nb = view.querySelector('[data-act=next]'); nb && nb.focus();
      }
      function nextQ() {
        if (!quiz || quiz.picked === null) return;
        if (quiz.i < 9) { quiz.i++; quiz.picked = null; view.innerHTML = quizHTML(); view.scrollTop = 0; return; }
        quiz.done = true; quiz.paid = false;
        if (quiz.score > api.load('bestQuiz', 0)) api.save('bestQuiz', quiz.score);
        if (quiz.score >= 8) {
          if (!quizPaid) { quizPaid = true; quiz.paid = true; api.earn(4, 'acing the RetroPedia quiz'); }
          api.sfx.tada();
        } else api.sfx.chime ? api.sfx.chime() : api.sfx.ding();
        view.innerHTML = quizHTML(); view.scrollTop = 0;
      }

      /* ---------- multimedia + read aloud ---------- */
      let playT = null;
      function play() {
        const a = cur && cur.v === 'art' && BY[cur.id]; if (!a) return;
        const p = view.querySelector('.rp-fig .rp-pic'); if (!p) return;
        const fn = SND[a.fx.s]; const dur = fn ? fn() : 1.5;
        p.className = p.className.replace(/\s?rp-on(-\w+)?/g, '');
        void p.offsetWidth;
        p.classList.add('rp-on', 'rp-on-' + a.fx.a);
        if (playT) { clearTimeout(playT); timers.delete(playT); }
        playT = later(() => { p.classList.remove('rp-on', 'rp-on-' + a.fx.a); playT = null; }, dur * 1000 + 200);
      }
      function readAloud() {
        const a = cur && cur.v === 'art' && BY[cur.id]; if (!a) return;
        try { if (spoke && window.speechSynthesis && speechSynthesis.speaking) { shush(); return; } } catch (e) { /* ignore */ }
        const ok = api.say(`${a.t}. ${a.p.join(' ')} Did you know? ${a.dyk}`, { rate: .95 });
        if (ok === false) api.msgBox('Read aloud', 'Sorry, this computer cannot speak right now. Check that the sound is turned on.', ['OK'], 'info');
        else spoke = true;
      }

      /* ---------- events ---------- */
      root.addEventListener('click', e => {
        const t = e.target.closest('[data-go],[data-act],[data-ans],[data-letter]'); if (!t || t.disabled) return;
        if (t.dataset.go) { api.sfx.click(); const [v, id] = t.dataset.go.split(':'); go({ v, id }); return; }
        if (t.dataset.ans) { answer(+t.dataset.ans); return; }
        if (t.dataset.letter) { const h = view.querySelector(`[data-l="${t.dataset.letter}"]`); if (h) view.scrollTop = h.offsetTop - 50; return; }
        act(t.dataset.act);
      });
      function act(a) {
        if (a === 'back') back(); else if (a === 'fwd') fwd();
        else if (a === 'home') go({ v: 'home' });
        else if (a === 'index') go({ v: 'index' });
        else if (a === 'time') go({ v: 'time' });
        else if (a === 'quiz') { quiz = null; go({ v: 'quiz' }); }
        else if (a === 'rand') { api.sfx.click(); randomArt(); }
        else if (a === 'help') go({ v: 'help' });
        else if (a === 'play') play();
        else if (a === 'say') readAloud();
        else if (a === 'next') nextQ();
      }
      $('.rp-srch').addEventListener('submit', e => {
        e.preventDefault(); const q = input.value.trim(); if (!q) { input.focus(); return; }
        const hits = search(q);
        input.blur();
        if (hits.length === 1 || (hits.length && norm(hits[0].t) === norm(q))) go({ v: 'art', id: hits[0].id }); else go({ v: 'search', q });
      });

      W.onKey = e => {
        if (booting) { skipBoot(); e.preventDefault(); return; }
        const inField = e.target && /INPUT|TEXTAREA/.test(e.target.tagName);
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') { e.preventDefault(); input.focus(); input.select(); return; }
        if (inField) return;
        if (e.altKey && e.key === 'ArrowLeft') { e.preventDefault(); back(); return; }
        if (e.altKey && e.key === 'ArrowRight') { e.preventDefault(); fwd(); return; }
        if (e.key === 'Backspace') { e.preventDefault(); back(); return; }
        if (e.key === '/') { e.preventDefault(); input.focus(); return; }
        if (cur && cur.v === 'quiz' && quiz && !quiz.done) {
          const n = '123'.indexOf(e.key) >= 0 ? '123'.indexOf(e.key) : 'abc'.indexOf(e.key.toLowerCase());
          if (n >= 0 && e.key.length === 1) { e.preventDefault(); answer(n); return; }
          if (e.key === 'Enter' && quiz.picked !== null) { e.preventDefault(); nextQ(); return; }
        }
        if (cur && cur.v === 'art' && (e.key === 'p' || e.key === 'P')) { e.preventDefault(); play(); }
      };

      /* ---------- menus ---------- */
      api.menubar([
        { label: 'File', items: [{ label: 'Contents', fn: () => act('home') }, '-', { label: 'Exit', fn: () => api.close() }] },
        { label: 'View', items: () => [{ label: big ? 'Normal text' : 'Large text', fn: () => { big = !big; root.classList.toggle('rp-big', big); api.save('big', big); } }] },
        { label: 'Go', items: () => [
          { label: 'Back', fn: back, disabled: pos <= 0 }, { label: 'Forward', fn: fwd, disabled: pos >= hist.length - 1 }, '-',
          { label: 'Contents', fn: () => act('home') }, { label: 'A-Z Index', fn: () => act('index') }, { label: 'Random Article', fn: () => act('rand') },
          { label: 'Quiz', fn: () => act('quiz') }, { label: 'Timeline', fn: () => act('time') }, '-', { label: 'Search...', fn: () => { input.focus(); } }] },
        { label: 'Help', items: [{ label: 'How to use', fn: () => act('help') }, '-', { label: 'About RetroPedia 95', fn: () => api.msgBox('About RetroPedia 95', `RetroPedia 95\nThe Multimedia Encyclopedia on CD-ROM\n\n${A.length} articles, ${A.length} pictures, sounds and animations.\nFacts as known in 1995, with a few notes "from the future".`) }] }
      ]);

      /* ---------- CD boot + splash ---------- */
      const boot = document.createElement('div'); boot.className = 'rp-boot';
      boot.innerHTML = `<svg class="rp-drv" viewBox="0 0 200 110" aria-hidden="true">
          <rect x="10" y="40" width="180" height="60" fill="#c8c4b8" stroke="#555"/><rect x="18" y="48" width="164" height="8" fill="#a8a498"/>
          <g class="rp-tray" style="transform:translateY(10px)"><rect x="40" y="56" width="120" height="10" fill="#333"/></g>
          <rect x="140" y="80" width="30" height="8" fill="#999" stroke="#555"/><rect class="rp-ledel" x="24" y="82" width="6" height="4" fill="#330"/>
          <text x="40" y="88" font-size="9" font-family="Arial" fill="#555">CD-ROM  4X</text>
          <g class="rp-cdg"><g class="rp-cdin"><circle cx="100" cy="30" r="26" fill="#d9dbe6" stroke="#888"/><circle cx="100" cy="30" r="20" fill="none" stroke="#ff7ad9" stroke-width="4" opacity=".5" stroke-dasharray="16 40"/><circle cx="100" cy="30" r="14" fill="none" stroke="#7af0ff" stroke-width="3" opacity=".6" stroke-dasharray="12 26"/><circle cx="100" cy="30" r="5" fill="#000"/><text x="85" y="12" font-size="6" font-family="Arial" fill="#1a237e" font-weight="bold">RetroPedia</text></g></g>
        </svg><div class="rp-msg">Please insert the RetroPedia 95 CD into drive D:</div><div class="rp-prog"><i></i></div><small>Click to skip</small>`;
      root.appendChild(boot);
      let stage = 0;
      function toSplash() {
        if (stage >= 2) return; stage = 2;
        boot.remove();
        const sp = document.createElement('div'); sp.className = 'rp-splash';
        sp.innerHTML = `<svg viewBox="0 0 120 80" aria-hidden="true"><g class="rp-spin">${ART.cd()}</g></svg><h1>Retro<span>Pedia</span> 95</h1><p>The Multimedia Encyclopedia for Curious Minds</p><small>Click or press any key to begin</small>`;
        sp.querySelector('svg').innerHTML = `<circle cx="60" cy="40" r="32" fill="#d9dbe6"/><g class="rp-spin"><circle cx="60" cy="40" r="26" fill="none" stroke="#ff7ad9" stroke-width="4" opacity=".6" stroke-dasharray="22 60"/><circle cx="60" cy="40" r="20" fill="none" stroke="#7af0ff" stroke-width="4" opacity=".6" stroke-dasharray="18 40"/><circle cx="60" cy="40" r="14" fill="none" stroke="#ffe97a" stroke-width="3" opacity=".7" stroke-dasharray="12 30"/></g><circle cx="60" cy="40" r="9" fill="#eef" stroke="#bbb"/><circle cx="60" cy="40" r="4" fill="#3a1a8a"/>`;
        root.appendChild(sp); jingle();
        sp.addEventListener('click', finishBoot);
        later(finishBoot, 3600);
      }
      function finishBoot() {
        if (stage >= 3) return; stage = 3; booting = false;
        const sp = root.querySelector('.rp-splash'); sp && sp.remove();
        go({ v: 'home' });
      }
      function skipBoot() { if (stage < 2) toSplash(); else finishBoot(); }
      boot.addEventListener('click', skipBoot);
      stage = 1;
      later(() => {
        if (stage !== 1) return;
        boot.querySelector('.rp-tray').style.transform = 'translateY(0)';
        N(.05, { ft: 'lowpass', f: 600, vol: .1, decay: 1 });
        boot.querySelector('.rp-ledel').classList.add('rp-led');
        boot.querySelector('.rp-cdg').style.opacity = '0'; boot.querySelector('.rp-cdg').style.transition = 'opacity .3s';
        boot.querySelector('.rp-msg').textContent = 'Reading CD-ROM... spinning up';
        boot.querySelector('.rp-prog i').style.width = '100%';
        cdWhir();
      }, 1050);
      later(() => { if (stage === 1) toSplash(); }, 3000);

      W.onClose = () => { timers.forEach(clearTimeout); timers.clear(); ro && ro.disconnect(); shush(); };
      W.onMin = () => { shush(); };
    }
  });
})();
