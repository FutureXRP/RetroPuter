/* Media Player and Sound Recorder: built-in accessories for Horizon 95 (1995) and Horizon 2000 (2000).
   Media Player plays a pretend "CD-ROM sampler" of short clips drawn live on a canvas, each with a
   synthesized soundtrack. Sound Recorder records from the microphone (session only, never saved) and
   plays it back with silly effects. */
(function () {
  const APPS = (window.RETRO_APPS = window.RETRO_APPS || []);
  const screenEra = () => { const s = document.getElementById('screen'); const m = s && s.className.match(/era-(\d{4})/); return m ? m[1] : '1995'; };
  const rnd = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const lerp = (a, b, k) => a + (b - a) * k;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const mixc = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
  const rgb = (c, al) => al == null ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})` : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${al})`;
  const ease = k => k * k * (3 - 2 * k);
  const cross = (a, b, x) => a < x && x <= b;
  const every = (a, b, p, ph = 0) => b > a && Math.floor((b - ph) / p) > Math.floor((a - ph) / p);
  const fmt = s => { s = Math.max(0, Math.floor(s)); return `${s / 60 | 0}:${String(s % 60).padStart(2, '0')}`; };
  function vgrad(g, y0, y1, c0, c1) { const gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, rgb(c0)); gr.addColorStop(1, rgb(c1)); return gr; }
  function circ(g, x, y, r, fill) { g.beginPath(); g.arc(x, y, Math.max(0.1, r), 0, Math.PI * 2); g.fillStyle = fill; g.fill(); }
  function txt(g, s, x, y, size, fill, align = 'center') { g.font = `bold ${size}px "Courier New",monospace`; g.textAlign = align; g.textBaseline = 'middle'; g.fillStyle = '#000'; g.fillText(s, x + 1, y + 1); g.fillStyle = fill; g.fillText(s, x, y); }
  const ico = (d, s = 14) => `<svg viewBox="0 0 14 14" width="${s}" height="${s}" aria-hidden="true" shape-rendering="crispEdges"><path d="${d}" fill="currentColor"/></svg>`;
  const IC = {
    play: ico('M3 1h2v1h1v1h1v1h1v1h1v1h1v2h-1v1h-1v1h-1v1h-1v1h-1v1h-2z'),
    pause: ico('M3 2h3v10h-3zM8 2h3v10h-3z'),
    stop: ico('M3 3h8v8h-8z'),
    prev: ico('M2 2h2v10h-2zM11 2v10h-1v-1h-1v-1h-1v-1h-1v-1h-1v-2h1v-1h1v-1h1v-1h1v-1z'),
    next: ico('M10 2h2v10h-2zM3 2v10h1v-1h1v-1h1v-1h1v-1h1v-2h-1v-1h-1v-1h-1v-1h-1v-1z'),
    rew: ico('M1 7l6-5v10zM7 7l6-5v10z'),
    ffw: ico('M13 7l-6-5v10zM7 7l-6-5v10z'),
    rec: `<svg viewBox="0 0 14 14" width="14" height="14" aria-hidden="true"><circle cx="7" cy="7" r="5" fill="#d00000"/></svg>`,
    loop: ico('M2 4h8v-2l3 3-3 3v-2h-6v2h-2zM12 10h-8v2l-3-3 3-3v2h6v-2h2z'),
    full: ico('M1 1h5v2h-3v3h-2zM8 1h5v5h-2v-3h-3zM1 8h2v3h3v2h-5zM11 8h2v5h-5v-2h3z')
  };

  /* ================= Media Player clips (drawn in a 160x120 coordinate space) ================= */
  function drawRocket(g, x, yb, stages, t) {
    const top = stages === 2 ? yb - 40 : yb - 24, base = stages === 2 ? yb : yb - 16;
    // flame
    if (t >= 5) {
      const fl = (t < 5.5 ? (t - 5) * 2 : 1) * (7 + rnd(Math.floor(t * 24)) * 7);
      g.fillStyle = '#ffd040'; g.beginPath(); g.moveTo(x - 4, base); g.lineTo(x + 4, base); g.lineTo(x, base + fl); g.fill();
      g.fillStyle = '#fff6c0'; g.beginPath(); g.moveTo(x - 2, base); g.lineTo(x + 2, base); g.lineTo(x, base + fl * 0.55); g.fill();
    }
    if (stages === 2) {
      g.fillStyle = '#e8e8e8'; g.fillRect(x - 5, yb - 16, 10, 16);
      g.fillStyle = '#c02020'; g.beginPath(); g.moveTo(x - 5, yb - 6); g.lineTo(x - 9, yb); g.lineTo(x - 5, yb); g.fill();
      g.beginPath(); g.moveTo(x + 5, yb - 6); g.lineTo(x + 9, yb); g.lineTo(x + 5, yb); g.fill();
      g.fillStyle = '#303030'; g.fillRect(x - 5, yb - 17, 10, 1);
    }
    g.fillStyle = '#f4f4f4'; g.fillRect(x - 4, top + 8, 8, base - top - 8 - (stages === 2 ? 16 : 0));
    g.fillStyle = '#c02020'; g.beginPath(); g.moveTo(x - 4, top + 8); g.lineTo(x, top); g.lineTo(x + 4, top + 8); g.fill();
    g.fillStyle = '#2050c0'; g.fillRect(x - 4, top + 12, 8, 2);
    g.fillStyle = '#202040'; g.fillRect(x - 1, top + 16, 2, 2);
  }

  function rocketClip() {
    return {
      title: 'Rocket Launch', dur: 20, desc: 'Countdown, liftoff and staging',
      song: { mel: [60, 0, 67, 0, 72, 71, 72, 74, 76, 0, 74, 72, 67, 0, 0, 0, 65, 0, 69, 72, 77, 76, 74, 72, 74, 0, 0, 0, 67, 0, 0, 0], bass: [48, 48, 43, 43, 41, 41, 43, 43], step: 0.2, leadVol: 0.025 },
      draw(g, t) {
        if (t < 11) {
          const alt = t > 5.5 ? 3.2 * (t - 5.5) * (t - 5.5) : 0, k = clamp(alt / 260, 0, 1);
          g.fillStyle = vgrad(g, 0, 100, mixc([70, 140, 225], [20, 30, 90], k), mixc([175, 212, 245], [70, 110, 190], k)); g.fillRect(0, 0, 160, 100);
          // clouds
          for (let i = 0; i < 3; i++) { const cx = (i * 61 + t * 3) % 190 - 15, cy = 22 + i * 14 + alt * 0.3; circ(g, cx, cy, 6, 'rgba(255,255,255,.85)'); circ(g, cx + 7, cy - 2, 7, 'rgba(255,255,255,.85)'); circ(g, cx + 14, cy, 5, 'rgba(255,255,255,.85)'); }
          g.fillStyle = '#4c7a3a'; g.fillRect(0, 100, 160, 20);
          g.fillStyle = '#707070'; g.fillRect(58, 100, 44, 4);
          // gantry tower
          g.strokeStyle = '#b04020'; g.lineWidth = 1; g.strokeRect(62, 52, 6, 48);
          g.beginPath(); for (let y = 52; y < 100; y += 6) { g.moveTo(62, y); g.lineTo(68, y + 6); g.moveTo(68, y); g.lineTo(62, y + 6); } g.stroke();
          if (t < 5.5) { g.fillStyle = '#b04020'; g.fillRect(68, 66, 8, 2); }
          drawRocket(g, 80, 100 - alt, 2, t);
          if (t > 5) {
            for (let i = 0; i < 28; i++) {
              const born = 5 + i * 0.2; if (born > t) break;
              const age = t - born, side = rnd(i) - 0.5;
              circ(g, 80 + side * age * 36, 101 - age * 2.5 - rnd(i + 7) * 4, Math.min(16, 3 + age * 4), `rgba(235,235,235,${clamp(1 - age / 7, 0.2, 0.9)})`);
            }
          }
          if (t < 5.5) txt(g, 'T-' + Math.max(0, 5 - Math.floor(t)), 124, 16, 14, '#fff');
          else if (t < 8.5) txt(g, 'LIFTOFF!', 80, 16, 16, '#ffe040');
        } else {
          const tb = t - 11;
          g.fillStyle = vgrad(g, 0, 120, [0, 0, 12], mixc([30, 60, 150], [4, 6, 30], clamp(tb / 8, 0, 1))); g.fillRect(0, 0, 160, 120);
          for (let i = 0; i < 44; i++) {
            const y = (rnd(i + 50) * 140 + tb * 26 * (0.5 + rnd(i + 9))) % 140 - 10;
            g.fillStyle = `rgba(255,255,255,${clamp(tb / 3, 0, 1) * (0.4 + rnd(i + 3) * 0.6)})`; g.fillRect(rnd(i) * 160, y, 1, 1);
          }
          const ey = 196 + tb * 10;
          circ(g, 80, ey, 96, 'rgba(120,180,255,.35)'); circ(g, 80, ey, 92, '#1f5fb0');
          g.fillStyle = '#3a8a3a'; g.beginPath(); g.ellipse(60, ey - 84, 22, 6, 0.2, 0, Math.PI * 2); g.fill();
          const bob = Math.sin(tb * 3);
          if (tb < 5) drawRocket(g, 80, 72 + bob, 2, t);
          else {
            drawRocket(g, 80, 72 + bob - (tb - 5) * 3, 1, t);
            const fy = 72 + (tb - 5) * (tb - 5) * 9 + (tb - 5) * 6;
            g.save(); g.translate(80 + (tb - 5) * 5, fy - 8); g.rotate((tb - 5) * 1.6);
            g.fillStyle = '#e8e8e8'; g.fillRect(-5, -8, 10, 16); g.fillStyle = '#c02020'; g.fillRect(-8, 3, 3, 5); g.fillRect(5, 3, 3, 5);
            g.restore();
          }
          if (t > 16 && t < 18) txt(g, 'STAGE SEPARATION', 80, 12, 10, '#9fe0ff');
          if (t > 18.3) txt(g, 'ORBIT!', 80, 12, 14, '#ffe040');
        }
      },
      fx(a, b, T) {
        for (let s = 0; s < 5; s++) if (cross(a, b, s)) T.tone(880, 0.12, { vol: 0.06 });
        if (cross(a, b, 5)) { T.tone(1320, 0.3, { vol: 0.06 }); T.noise(0.6, { ft: 'lowpass', f: 700, vol: 0.12, decay: 1 }); }
        if (b > 5 && b < 15 && every(a, b, 0.5)) T.noise(0.75, { ft: 'lowpass', f: 180 + (b - 5) * 20, vol: 0.12 * clamp(1.2 - (b - 5) / 10, 0.2, 1), attack: 0.2, release: 0.3 });
        if (cross(a, b, 16)) { T.tone(110, 0.5, { to: 40, type: 'sine', vol: 0.12, decay: 1 }); T.noise(0.4, { ft: 'lowpass', f: 900, vol: 0.1, decay: 1 }); }
        if (cross(a, b, 18.3)) T.sfx.tada();
      }
    };
  }

  function surfClip() {
    const surf = (x, t) => 78 + 7 * Math.sin(x * 0.05 - t * 1.6) + 3 * Math.sin(x * 0.11 + t * 2.3);
    return {
      title: "Surf's Up", dur: 22, desc: 'A surfer rides the afternoon waves',
      song: { mel: [64, 67, 69, 71, 0, 71, 69, 67, 64, 0, 62, 64, 0, 0, 0, 0, 64, 67, 69, 71, 74, 0, 71, 69, 71, 0, 69, 67, 64, 0, 0, 0], bass: [40, 40, 45, 45, 40, 40, 47, 47], step: 0.16, leadVol: 0.022, drums: 'four' },
      draw(g, t) {
        g.fillStyle = vgrad(g, 0, 62, [250, 150, 90], [255, 225, 160]); g.fillRect(0, 0, 160, 62);
        circ(g, 118, 34, 13, '#fff0a0'); circ(g, 118, 34, 10, '#ffe060');
        for (let i = 0; i < 2; i++) { const cx = (i * 90 + t * 4) % 200 - 20, cy = 14 + i * 10; circ(g, cx, cy, 5, 'rgba(255,255,255,.8)'); circ(g, cx + 7, cy - 1, 6, 'rgba(255,255,255,.8)'); circ(g, cx + 13, cy + 1, 4, 'rgba(255,255,255,.8)'); }
        g.fillStyle = vgrad(g, 60, 120, [40, 110, 170], [10, 50, 110]); g.fillRect(0, 60, 160, 60);
        g.fillStyle = 'rgba(255,230,140,.6)'; for (let y = 62; y < 76; y += 3) { const w = 4 + (y - 62) * 0.8 + Math.sin(t * 3 + y) * 2; g.fillRect(118 - w / 2, y, w, 1); }
        g.strokeStyle = 'rgba(200,235,255,.6)'; g.lineWidth = 1;
        for (let k = 0; k < 3; k++) { g.beginPath(); for (let x = 0; x <= 160; x += 4) g.lineTo(x, 64 + k * 4 + Math.sin(x * 0.2 + t * (1 + k * 0.4) + k) * 0.8); g.stroke(); }
        g.beginPath(); g.moveTo(0, 120); for (let x = 0; x <= 160; x += 2) g.lineTo(x, surf(x, t)); g.lineTo(160, 120); g.closePath();
        g.fillStyle = vgrad(g, 66, 120, [40, 170, 190], [10, 80, 130]); g.fill();
        g.strokeStyle = '#f4ffff'; g.lineWidth = 1.5; g.beginPath(); for (let x = 0; x <= 160; x += 2) g.lineTo(x, surf(x, t) + 0.5); g.stroke();
        g.fillStyle = 'rgba(255,255,255,.8)';
        for (let i = 0; i < 26; i++) { const x = (rnd(i) * 160 + t * 9) % 160; g.fillRect(x, surf(x, t) + 2 + rnd(i + 4) * 20, 2, 1); }
        const xs = 80 + 45 * Math.sin(t * 0.35), ys = surf(xs, t), ang = Math.atan((surf(xs + 1, t) - surf(xs - 1, t)) / 2), arm = Math.sin(t * 3) * 0.4;
        g.fillStyle = 'rgba(255,255,255,.85)';
        for (let i = 0; i < 8; i++) { const age = (t * 4 + i / 8) % 1, dir = Math.cos(t * 0.35) >= 0 ? -1 : 1; g.fillRect(xs + dir * (8 + age * 12), ys - 1 - age * 6 + age * age * 8, 1.5, 1.5); }
        g.save(); g.translate(xs, ys - 1); g.rotate(ang);
        g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(0, 0, 11, 1.6, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#e03030'; g.fillRect(-10, -0.5, 20, 1);
        g.strokeStyle = '#6a3a20'; g.lineWidth = 1.6;
        g.beginPath(); g.moveTo(-3, -1); g.lineTo(-1, -7); g.lineTo(3, -1); g.stroke();
        g.fillStyle = '#e8b048'; g.fillRect(-2.5, -13, 4, 7);
        g.strokeStyle = '#c8905a'; g.beginPath(); g.moveTo(-1, -12); g.lineTo(-7, -10 + arm * 6); g.moveTo(1, -12); g.lineTo(7, -10 - arm * 6); g.stroke();
        circ(g, -0.5, -15.5, 2.2, '#c8905a'); g.fillStyle = '#5a3010'; g.fillRect(-2.5, -18, 4, 1.5);
        g.restore();
        g.strokeStyle = '#303030'; g.lineWidth = 1;
        for (let i = 0; i < 3; i++) { const x = (t * 12 + i * 60) % 200 - 20, y = 18 + i * 9 + Math.sin(t * 2 + i) * 2, f = Math.sin(t * 8 + i) * 2; g.beginPath(); g.moveTo(x - 4, y - f); g.lineTo(x, y); g.lineTo(x + 4, y - f); g.stroke(); }
      },
      fx(a, b, T) {
        if (every(a, b, 2.4)) T.noise(2.3, { ft: 'lowpass', f: 900, vol: 0.09, attack: 0.9, release: 1.1 });
        if (every(a, b, 5.3, 1)) { T.tone(1800, 0.14, { to: 1200, type: 'sine', vol: 0.03 }); T.tone(1900, 0.14, { to: 1300, type: 'sine', vol: 0.03, at: 0.2 }); }
      }
    };
  }

  function volcanoClip() {
    return {
      title: 'Volcano Island', dur: 18, desc: 'An island volcano erupts at dusk',
      song: { mel: [62, 0, 65, 0, 69, 0, 68, 69, 70, 0, 69, 0, 65, 0, 0, 0, 62, 0, 65, 0, 69, 0, 72, 70, 69, 0, 0, 0, 61, 0, 62, 0], bass: [38, 38, 34, 34, 36, 36, 33, 33], step: 0.22, leadVol: 0.022, bassType: 'sawtooth', bassVol: 0.05 },
      draw(g, t) {
        const blast = Math.max(0, 1 - Math.abs(t - 6)) + Math.max(0, 1 - Math.abs(t - 12)), k = 0.35 + 0.65 * clamp((t - 1) / 6, 0, 1) + blast * 0.5;
        const fl = rnd(Math.floor(t * 10)) * 0.15 + blast * 0.4;
        g.fillStyle = vgrad(g, 0, 96, [20, 10, 34], mixc([140, 50, 30], [220, 110, 40], clamp(fl, 0, 1))); g.fillRect(0, 0, 160, 96);
        for (let i = 0; i < 16; i++) { g.fillStyle = `rgba(255,255,255,${0.3 + rnd(i + Math.floor(t * 3)) * 0.5})`; g.fillRect(rnd(i + 20) * 160, rnd(i + 40) * 40, 1, 1); }
        for (let i = 0; i < 34; i++) {
          const born = i * 0.5 - 4, age = t - born; if (age <= 0 || age > 16) continue;
          const x = 80 + age * 4.5 + Math.sin(age + i) * 3, y = 42 - age * 5.5, r = 3 + age * 1.8;
          circ(g, x, y, r, `rgba(${60 + blast * 60 | 0},55,55,${clamp(0.85 - age / 18, 0.1, 0.8)})`);
        }
        g.fillStyle = '#1e1428'; g.beginPath(); g.moveTo(0, 96); g.lineTo(18, 88); g.lineTo(34, 92); g.lineTo(34, 96); g.fill();
        g.fillStyle = '#4a2c24'; g.beginPath(); g.moveTo(14, 98); g.lineTo(70, 44); g.lineTo(90, 44); g.lineTo(148, 98); g.fill();
        g.fillStyle = '#3a221c'; g.beginPath(); g.moveTo(90, 44); g.lineTo(148, 98); g.lineTo(110, 98); g.fill();
        g.fillStyle = `rgba(255,${140 + fl * 200 | 0},40,.9)`; g.beginPath(); g.ellipse(80, 45, 10, 2.5, 0, 0, Math.PI * 2); g.fill();
        for (let j = 0; j < 3; j++) {
          const L = clamp((t - 2 - j * 2.5) / 7, 0, 1); if (!L) continue;
          const sx = [74, 84, 79][j], dir = [-1, 1, 0.25][j];
          g.strokeStyle = '#d83010'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(sx, 46);
          for (let s = 1; s <= 20 * L; s++) g.lineTo(sx + dir * s * 2.4 + Math.sin(s * 0.9 + j) * 1.5, 46 + s * 2.6);
          g.stroke(); g.strokeStyle = '#ffc040'; g.lineWidth = 0.8; g.stroke();
        }
        const P = 2.2;
        for (let i = 0; i < 70; i++) {
          const u = t + rnd(i) * P, ph = u % P, c = Math.floor(u / P), s = i * 13 + c * 7;
          if (rnd(s + 5) > 0.35 + 0.65 * clamp(k, 0, 1)) continue;
          const vx = (rnd(s) - 0.5) * 34 * k, vy = -(28 + rnd(s + 1) * 42) * k;
          const x = 80 + vx * ph, y = 44 + vy * ph + 30 * ph * ph; if (y > 96) continue;
          g.fillStyle = ph < 0.6 ? '#fff080' : ph < 1.2 ? '#ffa020' : '#d03010'; g.fillRect(x, y, 1.8, 1.8);
        }
        g.fillStyle = vgrad(g, 96, 120, [30, 20, 50], [10, 10, 30]); g.fillRect(0, 96, 160, 24);
        for (let y = 98; y < 120; y += 2) { const w = 10 + (y - 96) * 1.2 + Math.sin(t * 4 + y) * 4; g.fillStyle = `rgba(255,${120 + fl * 150 | 0},40,${0.45 - (y - 96) / 70})`; g.fillRect(80 - w / 2 + Math.sin(t * 2 + y * 0.7) * 2, y, w, 1); }
      },
      fx(a, b, T) {
        if (every(a, b, 1.8)) T.noise(2, { ft: 'lowpass', f: 120, vol: 0.12, attack: 0.4, release: 0.8 });
        [6, 12].forEach(x => { if (cross(a, b, x)) { T.tone(80, 0.9, { to: 30, type: 'sine', vol: 0.12, decay: 1 }); T.noise(0.9, { ft: 'lowpass', f: 500, vol: 0.12, decay: 1 }); } });
        if (every(a, b, 0.37)) T.noise(0.03, { ft: 'highpass', f: 3000, vol: 0.05, decay: 1 });
      }
    };
  }

  function robotClip() {
    return {
      title: 'Robot Boogie', dur: 16, desc: 'A pixel robot shows off its dance moves',
      song: { mel: [60, 0, 60, 63, 0, 65, 0, 67, 0, 70, 67, 0, 65, 63, 60, 0, 60, 0, 60, 63, 0, 65, 0, 67, 72, 0, 70, 0, 67, 0, 65, 0], bass: [36, 36, 41, 41, 36, 36, 43, 41], step: 0.15, leadVol: 0.022, drums: 'four' },
      draw(g, t) {
        const beat = t / 0.3, bp = beat % 1, bounce = Math.abs(Math.sin(beat * Math.PI));
        g.fillStyle = vgrad(g, 0, 80, [24, 8, 44], [60, 20, 80]); g.fillRect(0, 0, 160, 80);
        const PAL = [[255, 60, 120], [60, 200, 255], [255, 220, 60], [120, 255, 120]];
        for (let r = 0; r < 4; r++) {
          const y0 = 80 + r * r * 2 + r * 6, y1 = 80 + (r + 1) * (r + 1) * 2 + (r + 1) * 6;
          for (let c = 0; c < 8; c++) {
            const col = PAL[(r + c + Math.floor(beat)) % 4], lit = (r + c + Math.floor(beat)) % 2 === 0;
            const sp = (w, y) => 80 + (w - 4) * (20 + (y - 80) * 0.9);
            g.fillStyle = rgb(lit ? col : mixc(col, [20, 10, 30], 0.75));
            g.beginPath(); g.moveTo(sp(c, y0), y0); g.lineTo(sp(c + 1, y0), y0); g.lineTo(sp(c + 1, y1), y1); g.lineTo(sp(c, y1), y1); g.fill();
          }
        }
        for (let s = 0; s < 2; s++) {
          const sx = s ? 150 : 10, a = Math.sin(t * 1.3 + s * 2) * 0.5 + (s ? -0.6 : 0.6);
          g.fillStyle = s ? 'rgba(120,200,255,.18)' : 'rgba(255,120,200,.18)';
          g.beginPath(); g.moveTo(sx, 0); g.lineTo(80 + Math.sin(a) * 90 - 18, 110); g.lineTo(80 + Math.sin(a) * 90 + 18, 110); g.fill();
        }
        circ(g, 80, 8, 7, '#c8c8d8');
        for (let i = 0; i < 6; i++) { const on = rnd(i + Math.floor(t * 6)) > 0.6; g.fillStyle = on ? '#fff' : '#8888a0'; g.fillRect(76 + (i % 3) * 3, 5 + (i / 3 | 0) * 3, 2, 2); }
        const move = Math.floor(t / 4) % 4;
        let x = 80, y = 0, aL = 0.4, aR = -0.4, lean = 0;
        if (move === 0) { aL = 1.2 + Math.sin(beat * Math.PI) * 0.9; aR = -0.4; }
        if (move === 1) { x += Math.sin(beat * Math.PI / 2) * 16; aL = 0.6; aR = -0.6; lean = Math.sin(beat * Math.PI / 2) * 0.15; }
        if (move === 2) { const up = Math.floor(beat) % 2; aL = up ? 2.6 : 0.3; aR = up ? -0.3 : -2.6; }
        if (move === 3) { y = -bounce * 9; aL = 2.4; aR = -2.4; }
        y -= bounce * 2;
        g.save(); g.translate(x, 92 + y); g.rotate(lean);
        g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(0, 1 - y, 13, 2.5, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#707888'; const lk = move === 1 ? Math.sin(beat * Math.PI) * 2 : 0; g.fillRect(-7, -14 - lk, 4, 14 + lk); g.fillRect(3, -14 + lk, 4, 14 - lk);
        g.fillStyle = '#404858'; g.fillRect(-9, -2, 7, 3); g.fillRect(2, -2, 7, 3);
        g.fillStyle = '#b8c0d0'; g.fillRect(-10, -36, 20, 23);
        g.fillStyle = '#8890a0'; g.fillRect(-10, -15, 20, 2);
        for (let i = 0; i < 3; i++) { g.fillStyle = rgb(PAL[(i + Math.floor(beat * 2)) % 4]); g.fillRect(-6 + i * 5, -30, 3, 3); }
        g.fillStyle = '#303848'; g.fillRect(-5, -23, 10, 4);
        const arm = (sx, ang) => { g.save(); g.translate(sx, -33); g.rotate(ang); g.fillStyle = '#9aa2b4'; g.fillRect(-2, 0, 4, 13); g.fillStyle = '#e0c040'; g.fillRect(-3, 12, 6, 3); g.restore(); };
        arm(-11, aL); arm(11, aR);
        g.fillStyle = '#c8d0e0'; g.fillRect(-8, -50, 16, 13);
        const blink = (t % 3) < 0.12;
        g.fillStyle = '#20ffe0'; if (blink) { g.fillRect(-6, -45, 4, 1); g.fillRect(2, -45, 4, 1); } else { g.fillRect(-6, -47, 4, 4); g.fillRect(2, -47, 4, 4); }
        g.fillStyle = '#303848'; g.fillRect(-4, -41, 8, 2);
        g.fillStyle = '#9098a8'; g.fillRect(-1, -56, 2, 6); circ(g, 0, -57, 2, bp < 0.5 ? '#ff4040' : '#ffd0d0');
        g.restore();
        for (let i = 0; i < 4; i++) {
          const ph = (t * 0.5 + i / 4) % 1, nx = 30 + i * 34 + Math.sin(ph * 6 + i) * 4, ny = 70 - ph * 60;
          g.fillStyle = `rgba(255,255,160,${1 - ph})`; g.fillRect(nx, ny, 3, 2); g.fillRect(nx + 2, ny - 7, 1, 7); g.fillRect(nx + 2, ny - 7, 3, 1);
        }
      },
      fx(a, b, T) {
        if (every(a, b, 4)) { T.tone(1200, 0.07, { vol: 0.05 }); T.tone(900, 0.07, { vol: 0.05, at: 0.09 }); T.tone(1500, 0.09, { vol: 0.05, at: 0.18 }); }
      }
    };
  }

  function flowerClip() {
    return {
      title: 'Time-Lapse Flower', dur: 15, desc: 'Five days of growing, in fifteen seconds',
      song: { mel: [65, 69, 72, 69, 70, 74, 77, 74, 72, 0, 69, 0, 67, 0, 0, 0, 65, 69, 72, 69, 70, 74, 77, 79, 77, 0, 72, 0, 65, 0, 0, 0], bass: [41, 41, 46, 46, 48, 48, 41, 41], step: 0.25, lead: 'triangle', leadVol: 0.05 },
      draw(g, t) {
        const ph = (t % 3) / 3, day = Math.sin(ph * Math.PI * 2), k = clamp(day * 1.6 + 0.2, 0, 1);
        g.fillStyle = vgrad(g, 0, 96, mixc([8, 10, 40], [90, 170, 245], k), mixc([30, 30, 80], [200, 230, 250], k)); g.fillRect(0, 0, 160, 96);
        for (let i = 0; i < 24; i++) { g.fillStyle = `rgba(255,255,255,${(1 - k) * (0.4 + rnd(i) * 0.6)})`; g.fillRect(rnd(i + 3) * 160, rnd(i + 8) * 70, 1, 1); }
        if (ph < 0.5) { const a = ph * 2; circ(g, a * 180 - 10, 80 - Math.sin(a * Math.PI) * 66, 8, '#ffe040'); }
        else { const a = ph * 2 - 1, mx = a * 180 - 10, my = 80 - Math.sin(a * Math.PI) * 60; circ(g, mx, my, 6, '#f0f0d8'); circ(g, mx + 2.5, my - 1.5, 5, rgb(mixc([8, 10, 40], [90, 170, 245], k))); }
        g.fillStyle = rgb(mixc([30, 50, 20], [80, 150, 60], k)); g.fillRect(0, 96, 160, 24);
        g.fillStyle = rgb(mixc([60, 30, 20], [190, 90, 50], k)); g.beginPath(); g.moveTo(64, 94); g.lineTo(96, 94); g.lineTo(92, 118); g.lineTo(68, 118); g.fill();
        g.fillStyle = rgb(mixc([70, 36, 24], [210, 110, 60], k)); g.fillRect(62, 92, 36, 5);
        g.fillStyle = '#3a2412'; g.fillRect(65, 92, 30, 2);
        const gr = ease(clamp(t / 6, 0, 1)), H = 58 * gr, sway = Math.sin(t * 2) * 1.5 * gr, topX = 80 + sway, topY = 92 - H;
        const green = rgb(mixc([20, 60, 20], [60, 170, 60], k));
        if (H > 0.5) { g.strokeStyle = green; g.lineWidth = 2; g.beginPath(); g.moveTo(80, 92); g.quadraticCurveTo(78, 92 - H / 2, topX, topY); g.stroke(); }
        [[0.35, 2, -1], [0.6, 3.5, 1]].forEach(([h, st, side]) => {
          const s = ease(clamp((t - st) / 3, 0, 1)); if (!s) return;
          const ly = 92 - H * h, lx = 80 + sway * h;
          g.save(); g.translate(lx, ly); g.rotate(side * (0.6 + Math.sin(t * 2 + side) * 0.08)); g.fillStyle = green;
          g.beginPath(); g.ellipse(side * 7 * s, 0, 8 * s, 3 * s, 0, 0, Math.PI * 2); g.fill(); g.restore();
        });
        const bud = clamp((t - 6) / 3, 0, 1), open = ease(clamp((t - 8.5) / 4, 0, 1));
        if (bud > 0 && open < 0.3) { g.fillStyle = green; g.beginPath(); g.ellipse(topX, topY - 3 * bud, 3 * bud, 5 * bud, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#e05a9a'; g.fillRect(topX - 1, topY - 7 * bud, 2, 3 * bud); }
        if (open > 0) {
          for (let i = 0; i < 8; i++) {
            const a = i / 8 * Math.PI * 2 + t * 0.05, L = 3 + 10 * open;
            g.save(); g.translate(topX, topY - 2); g.rotate(a);
            g.fillStyle = i % 2 ? rgb(mixc([90, 30, 60], [240, 90, 160], k)) : rgb(mixc([100, 40, 70], [255, 130, 190], k));
            g.beginPath(); g.ellipse(L / 2 + 1, 0, L / 2 + 1, 2.2 + open * 1.8, 0, 0, Math.PI * 2); g.fill(); g.restore();
          }
          circ(g, topX, topY - 2, 2 + 2.5 * open, rgb(mixc([120, 100, 20], [255, 210, 40], k)));
        }
        if (t > 11) {
          const bt = t - 11, bx = topX + Math.cos(bt * 2) * 24, by = topY - 6 + Math.sin(bt * 4) * 7;
          g.fillStyle = 'rgba(255,255,255,.8)'; const w = Math.sin(t * 40) > 0 ? 3 : 1.5; g.fillRect(bx - 1, by - 2 - w, 3, w);
          g.fillStyle = '#ffd020'; g.fillRect(bx - 3, by - 2, 6, 4); g.fillStyle = '#202020'; g.fillRect(bx - 1, by - 2, 1, 4); g.fillRect(bx + 1, by - 2, 1, 4);
        }
        txt(g, 'DAY ' + (Math.floor(t / 3) + 1), 4, 8, 9, '#fff', 'left');
      },
      fx(a, b, T) {
        if (every(a, b, 3, 0.1)) T.tone(1568, 0.5, { type: 'sine', vol: 0.03, decay: 1 });
        if (b > 11 && every(a, b, 0.8)) T.tone(210, 0.5, { type: 'sawtooth', vol: 0.015, to: 240 });
      }
    };
  }

  function cityClip() {
    const B = []; let bx = -4, i = 0;
    while (bx < 164) { const w = 12 + rnd(i * 3) * 14, h = 26 + rnd(i * 3 + 1) * 46; B.push({ x: bx, w, h, i }); bx += w + 1; i++; }
    return {
      title: 'City at Night', dur: 20, desc: 'Lights come on across the skyline',
      song: { mel: [67, 0, 70, 72, 0, 74, 0, 72, 70, 0, 67, 0, 65, 0, 67, 0, 0, 62, 65, 67, 0, 70, 0, 69, 67, 0, 0, 0, 0, 0, 0, 0], bass: [43, 43, 41, 41, 39, 39, 38, 38], step: 0.18, lead: 'triangle', leadVol: 0.05, hold: 0.7 },
      draw(g, t, S) {
        g.fillStyle = vgrad(g, 0, 86, [4, 4, 24], [50, 30, 80]); g.fillRect(0, 0, 160, 86);
        for (let i = 0; i < 30; i++) { g.fillStyle = `rgba(255,255,255,${0.25 + rnd(i + Math.floor(t * 4) * 31) * 0.7})`; g.fillRect(rnd(i) * 160, rnd(i + 70) * 40, 1, 1); }
        circ(g, 132, 20, 8, '#f4f0d0'); circ(g, 129, 18, 1.5, '#d8d0b0'); circ(g, 134, 23, 1.2, '#d8d0b0');
        const px = (t * 14) % 220 - 30; g.fillStyle = '#202030'; g.fillRect(px - 5, 30, 10, 1.5);
        g.fillStyle = Math.floor(t * 2) % 2 ? '#ff3030' : '#ffffff'; g.fillRect(px + 5, 29.5, 1.5, 1.5);
        const lightOn = clamp(t / 4, 0.2, 1);
        B.forEach(b => {
          const top = 86 - b.h;
          g.fillStyle = rgb(mixc([16, 16, 34], [30, 26, 50], rnd(b.i * 5))); g.fillRect(b.x, top, b.w, b.h);
          let wi = 0;
          for (let y = top + 3; y < 82; y += 4) for (let x = b.x + 2; x < b.x + b.w - 2; x += 3) {
            wi++; const seed = b.i * 131 + wi, on = rnd(seed + Math.floor(t * 0.7 + rnd(seed) * 5) * 17) < 0.55 * lightOn + (rnd(seed + 2) < 0.1 ? 0.3 : 0);
            if (on) { g.fillStyle = rnd(seed + 3) < 0.2 ? '#a0d0ff' : '#ffdc78'; g.fillRect(x, y, 1.5, 2); }
          }
          if (b.h > 64) { g.fillStyle = '#404050'; g.fillRect(b.x + b.w / 2, top - 8, 1, 8); if (Math.floor(t * 1.5) % 2) { g.fillStyle = '#ff2020'; g.fillRect(b.x + b.w / 2 - 0.5, top - 9, 2, 2); } }
        });
        g.strokeStyle = '#506080'; g.lineWidth = 1;
        g.beginPath(); g.moveTo(0, 79); g.lineTo(160, 79); g.stroke();
        g.beginPath(); for (let x = 0; x <= 160; x += 40) { g.moveTo(x, 79); g.lineTo(x + 20, 64); g.lineTo(x + 40, 79); } g.stroke();
        for (let i = 0; i < 6; i++) {
          const hx = (t * 30 + i * 37) % 200 - 20; g.fillStyle = '#fff8d0'; g.fillRect(hx, 77.5, 2, 1);
          const tx = 180 - (t * 24 + i * 47) % 200; g.fillStyle = '#ff3030'; g.fillRect(tx, 78.5, 2, 1);
        }
        g.fillStyle = '#060818'; g.fillRect(0, 86, 160, 34);
        for (let yy = 0; yy < 34; yy += 2) {
          const off = Math.sin(yy * 0.7 + t * 3) * (0.5 + yy * 0.06);
          g.globalAlpha = 0.55 - yy / 90;
          g.drawImage(g.canvas, 0, Math.max(0, (86 - yy - 2)) * S, 160 * S, 2 * S, off, 86 + yy, 160, 2);
        }
        g.globalAlpha = 1;
        g.fillStyle = 'rgba(10,20,60,.35)'; g.fillRect(0, 86, 160, 34);
      },
      fx(a, b, T) {
        if (every(a, b, 2)) T.noise(2.1, { ft: 'lowpass', f: 380, vol: 0.04, attack: 0.6, release: 0.6 });
        if (every(a, b, 7, 3)) { T.tone(392, 0.18, { type: 'sawtooth', vol: 0.02 }); T.tone(330, 0.25, { type: 'sawtooth', vol: 0.02, at: 0.22 }); }
      }
    };
  }

  function logoClip() {
    const LW = 64, LH = 24, RX = 160 - LW, RY = 120 - LH, VX = 4 * RX / 11, VY = 3 * RY / 11;
    const tri = (u, R) => { const m = u % (2 * R); return m < R ? m : 2 * R - m; };
    const COLS = ['#ff4040', '#40ff60', '#4080ff', '#ffe040', '#ff40ff', '#40ffff', '#ff9020'];
    const hits = t => Math.floor(VX * t / RX + 1e-9) + Math.floor(VY * t / RY + 1e-9);
    return {
      title: 'Bouncing Logo', dur: 12, desc: 'Will it hit the corner? Watch and see',
      song: { mel: [72, 76, 79, 84, 0, 79, 0, 0, 74, 77, 81, 86, 0, 81, 0, 0, 72, 76, 79, 84, 0, 88, 0, 86, 84, 0, 79, 0, 76, 0, 0, 0], bass: [48, 48, 50, 50, 48, 48, 43, 43], step: 0.14, leadVol: 0.02 },
      draw(g, t, S, hi) {
        g.fillStyle = '#000'; g.fillRect(0, 0, 160, 120);
        const x = tri(VX * t, RX), y = tri(VY * t, RY), col = COLS[hits(t) % COLS.length];
        const corner = t >= 11 && t < 12;
        if (corner) for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2, r = (t - 11) * 70 * (0.5 + rnd(i) * 0.5); g.fillStyle = COLS[i % COLS.length]; g.fillRect(x + LW / 2 + Math.cos(a) * r, y + LH / 2 + Math.sin(a) * r, 2, 2); }
        g.strokeStyle = col; g.lineWidth = 2; g.strokeRect(x + 1, y + 1, LW - 2, LH - 2);
        g.fillStyle = col; g.font = 'bold 11px Arial,Helvetica,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText('HORIZON', x + LW / 2, y + 9);
        g.font = 'bold 7px Arial,sans-serif'; g.fillText(hi ? 'VIDEO 2000' : 'VIDEO 95', x + LW / 2, y + 18);
        if (corner) txt(g, 'CORNER!', 80, 60, 16, '#fff');
      },
      fx(a, b, T) {
        if (b > a && hits(b) > hits(a) && !cross(a, b, 11)) T.tone(660 + (hits(b) % 5) * 110, 0.08, { vol: 0.05 });
        if (cross(a, b, 11)) T.sfx.tada();
      }
    };
  }

  function wireClip() {
    const cube = { v: [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]], e: [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]] };
    const oct = { v: [[1.4, 0, 0], [-1.4, 0, 0], [0, 1.4, 0], [0, -1.4, 0], [0, 0, 1.4], [0, 0, -1.4]], e: [[0, 2], [0, 3], [0, 4], [0, 5], [1, 2], [1, 3], [1, 4], [1, 5], [2, 4], [4, 3], [3, 5], [5, 2]] };
    const globe = { v: [], e: [] };
    const LAT = 5, LON = 12;
    globe.v.push([0, -1.3, 0], [0, 1.3, 0]);
    for (let j = 1; j <= LAT; j++) { const th = j / (LAT + 1) * Math.PI; for (let i = 0; i < LON; i++) { const ph = i / LON * Math.PI * 2; globe.v.push([1.3 * Math.sin(th) * Math.cos(ph), -1.3 * Math.cos(th), 1.3 * Math.sin(th) * Math.sin(ph)]); } }
    const gi = (j, i) => 2 + (j - 1) * LON + (i % LON);
    for (let j = 1; j <= LAT; j++) for (let i = 0; i < LON; i++) { globe.e.push([gi(j, i), gi(j, i + 1)]); if (j < LAT) globe.e.push([gi(j, i), gi(j + 1, i)]); }
    for (let i = 0; i < LON; i += 2) { globe.e.push([0, gi(1, i)]); globe.e.push([1, gi(LAT, i)]); }
    const SH = [cube, oct, globe];
    return {
      title: 'Wireframe World', dur: 15, desc: 'Spinning 3D shapes over a neon grid',
      song: { mel: [57, 60, 64, 69, 64, 60, 57, 60, 53, 57, 60, 65, 60, 57, 53, 57, 55, 59, 62, 67, 62, 59, 55, 59, 52, 56, 59, 64, 59, 56, 52, 56], bass: [45, 45, 41, 41, 43, 43, 40, 40], step: 0.12, lead: 'sawtooth', leadVol: 0.018, drums: 'four' },
      draw(g, t, S, hi) {
        g.fillStyle = vgrad(g, 0, 70, [0, 0, 20], [70, 0, 80]); g.fillRect(0, 0, 160, 70);
        g.save(); g.beginPath(); g.rect(0, 0, 160, 70); g.clip(); circ(g, 80, 70, 26, '#ff8030');
        for (let y = 50; y < 70; y += 4) { g.fillStyle = 'rgba(40,0,60,1)'; g.fillRect(50, y + (y - 50) * 0.1, 60, 1 + (y - 50) / 8); }
        g.restore();
        g.fillStyle = '#0a0018'; g.fillRect(0, 70, 160, 50);
        g.strokeStyle = hi ? '#ff30c0' : '#c000c0'; g.lineWidth = 1; g.beginPath();
        for (let i = -9; i <= 9; i++) { g.moveTo(80 + i * 2.5, 70); g.lineTo(80 + i * 22, 120); }
        for (let k = 0; k < 12; k++) { const d = ((k - t * 2.5) % 12 + 12) % 12 + 0.6, y = 70 + 50 / d; g.moveTo(0, y); g.lineTo(160, y); }
        g.stroke();
        const si = Math.floor(t / 5) % 3, lt = t % 5, sc = Math.min(1, lt * 3, (5 - lt) * 3) * 1;
        const sh = SH[si], ax = t * 0.9, ay = t * 0.6, az = t * 0.25;
        const P = sh.v.map(([x, y, z]) => {
          let c = Math.cos(ay), s = Math.sin(ay); [x, z] = [x * c - z * s, x * s + z * c];
          c = Math.cos(ax); s = Math.sin(ax); [y, z] = [y * c - z * s, y * s + z * c];
          c = Math.cos(az); s = Math.sin(az); [x, y] = [x * c - y * s, x * s + y * c];
          const f = 70 / (z * sc + 4); return [80 + x * sc * f, 44 + y * sc * f];
        });
        g.strokeStyle = hi ? '#40ffff' : '#40ff40'; g.lineWidth = hi ? 1 : 1.2; g.beginPath();
        sh.e.forEach(([p, q]) => { g.moveTo(P[p][0], P[p][1]); g.lineTo(P[q][0], P[q][1]); }); g.stroke();
        if (hi) { g.fillStyle = '#fff'; P.forEach(p => g.fillRect(p[0] - 0.5, p[1] - 0.5, 1, 1)); }
        txt(g, ['CUBE', 'OCTAHEDRON', 'GLOBE'][si], 80, 112, 8, '#ffff80');
      },
      fx(a, b, T) {
        [5, 10].forEach(x => { if (cross(a, b, x - 0.3)) T.noise(0.6, { ft: 'bandpass', f: 1400, q: 0.8, vol: 0.07, attack: 0.25, release: 0.25 }); });
      }
    };
  }

  const CLIPS = [rocketClip(), surfClip(), volcanoClip(), robotClip(), flowerClip(), cityClip(), logoClip(), wireClip()];

  /* ================= Media Player ================= */
  const MP_CSS = `
    .mpx{display:flex;gap:6px;padding:4px;box-sizing:border-box;height:100%;min-height:0;user-select:none;-webkit-user-select:none}
    .mpx-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px;min-height:0}
    .mpx-stage{flex:1;min-height:130px;position:relative;background:#000;overflow:hidden;display:flex;align-items:center;justify-content:center}
    .mpx-cv{display:block;image-rendering:pixelated;image-rendering:crisp-edges}
    .mpx-msg{position:absolute;left:0;right:0;top:50%;transform:translateY(-50%);text-align:center;color:#c0c0c0;font:14px var(--dos);pointer-events:none}
    .mpx-osd{position:absolute;left:8px;top:6px;color:#fff;font:bold 13px var(--ui);text-shadow:1px 1px 2px #000;opacity:0;transition:opacity .6s;pointer-events:none}
    .mpx-osd.on{opacity:1}
    .mpx-fsx{display:none;position:absolute;right:8px;top:8px;z-index:2}
    .mpx-fsbar{display:none;position:absolute;left:0;right:0;bottom:0;padding:8px;gap:8px;justify-content:center;align-items:center;background:linear-gradient(transparent,rgba(0,0,0,.7));z-index:2}
    .mpx-stage.mpx-fs{position:fixed;left:0;top:0;right:0;bottom:0;z-index:100000;min-height:0}
    .mpx-fs .mpx-fsx,.mpx-fs .mpx-fsbar{display:flex}
    .mpx-seek{width:100%;margin:0;height:24px;background:transparent;-webkit-appearance:none;appearance:none;cursor:pointer;touch-action:none}
    .mpx-seek::-webkit-slider-runnable-track{height:4px;background:#fff;border:1px solid;border-color:#808080 #fff #fff #808080;box-shadow:inset 1px 1px #000}
    .mpx-seek::-moz-range-track{height:4px;background:#fff;border:1px solid;border-color:#808080 #fff #fff #808080}
    .mpx-seek::-webkit-slider-thumb{-webkit-appearance:none;width:11px;height:20px;margin-top:-9px;background:#c0c0c0;border:2px solid;border-color:#fff #000 #000 #fff;border-radius:0}
    .mpx-seek::-moz-range-thumb{width:9px;height:18px;background:#c0c0c0;border:2px solid;border-color:#fff #000 #000 #fff;border-radius:0}
    .mpx-ctl{display:flex;align-items:center;gap:3px;flex-wrap:wrap}
    .mpx-b{min-width:0;width:34px;height:30px;padding:0;display:inline-flex;align-items:center;justify-content:center}
    .mpx-b:active{padding:2px 0 0 2px}
    .mpx-b.mpx-on{border-color:#000 #fff #fff #000;box-shadow:inset 1px 1px var(--dk);background:#dcdcdc}
    .mpx-gap{width:6px}
    .mpx-time{margin-left:auto;padding:3px 6px;background:#fff;font:12px "Courier New",monospace;white-space:nowrap}
    .mpx-status{display:flex;gap:4px;font-size:11px}
    .mpx-status span{padding:1px 4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .mpx-status span:first-child{width:70px;flex:none}
    .mpx-status span:last-child{flex:1}
    .mpx-side{width:190px;display:flex;flex-direction:column;min-height:0;gap:3px}
    .mpx-plh{font-weight:bold;padding:2px 2px 0}
    .mpx-list{flex:1;overflow:auto;margin:0;padding:0;list-style:none;background:#fff;min-height:60px}
    .mpx-list li{display:flex;gap:6px;justify-content:space-between;padding:5px 6px;cursor:pointer;line-height:1.2}
    .mpx-list li small{opacity:.75}
    .mpx-list li.mpx-sel{background:var(--navy,#000080);color:#fff}
    .mpx-disc{font-size:11px;padding:2px}
    .mpx.mpx-narrow{flex-direction:column;height:auto}
    .mpx-narrow .mpx-stage{flex:none}
    .mpx-narrow .mpx-side{width:auto}
    .mpx-narrow .mpx-list{max-height:none;flex:none}
    .mpx-viz{display:none}
    /* Horizon 2000 skin */
    .mpx-2k{background:linear-gradient(#34507e,#16213e);color:#dfe8ff;border-radius:6px}
    .mpx-2k .mpx-cv{image-rendering:auto}
    .mpx-2k .mpx-stage{border:1px solid #000;border-radius:3px;box-shadow:0 0 0 1px #6f8cc0}
    .mpx-2k .mpx-viz{display:flex;flex-direction:column;gap:3px}
    .mpx-vtop{display:flex;align-items:center;gap:4px;font-size:11px}
    .mpx-vtop b{margin-right:auto;color:#9fd0ff}
    .mpx-vb{background:linear-gradient(#5a78b0,#2c4270);color:#fff;border:1px solid #0e1a33;border-radius:9px;padding:2px 9px;font:11px var(--ui);cursor:pointer;min-height:22px}
    .mpx-vb.mpx-on{background:linear-gradient(#ffe070,#e09a10);color:#301800}
    .mpx-vcv{display:block;width:100%;height:64px;background:#000;border:1px solid #000;border-radius:3px}
    .mpx-2k .mpx-b{width:36px;height:36px;border-radius:50%;border:1px solid #0e1a33;background:radial-gradient(circle at 35% 30%,#fff,#a9bde0 40%,#4a6aa8);color:#0c1a38;box-shadow:0 1px 2px rgba(0,0,0,.6);cursor:pointer}
    .mpx-2k .mpx-b.mpx-big{width:44px;height:44px}
    .mpx-2k .mpx-b:active{padding:0;background:radial-gradient(circle at 35% 30%,#dfe8ff,#7f98c8 50%,#2e4a88)}
    .mpx-2k .mpx-b.mpx-on{background:radial-gradient(circle at 35% 30%,#fff8c0,#ffd040 45%,#c07800);box-shadow:0 0 6px #ffd040}
    .mpx-2k .mpx-time{background:#000;color:#8fe8ff;border:1px solid #6f8cc0;border-radius:3px;font:bold 13px "Courier New",monospace}
    .mpx-2k .mpx-fsb{width:auto;border-radius:12px;padding:0 10px;height:28px;gap:4px;font:11px var(--ui)}
    .mpx-2k .mpx-seek::-webkit-slider-runnable-track{height:6px;background:#0a1224;border:1px solid #6f8cc0;border-radius:3px;box-shadow:none}
    .mpx-2k .mpx-seek::-webkit-slider-thumb{width:16px;height:16px;margin-top:-6px;border-radius:50%;border:1px solid #0e1a33;background:radial-gradient(circle at 35% 30%,#fff,#ffd040 50%,#c07800)}
    .mpx-2k .mpx-seek::-moz-range-track{height:6px;background:#0a1224;border:1px solid #6f8cc0;border-radius:3px}
    .mpx-2k .mpx-seek::-moz-range-thumb{width:14px;height:14px;border-radius:50%;border:1px solid #0e1a33;background:#ffd040}
    .mpx-2k .mpx-status span{color:#b8c8e8}
    .mpx-2k .mpx-plh{color:#9fd0ff}
    .mpx-2k .mpx-list{background:#0c1428;color:#dfe8ff;border:1px solid #6f8cc0;border-radius:3px}
    .mpx-2k .mpx-list li.mpx-sel{background:linear-gradient(#3a6fd8,#244a9a);color:#fff}
    .mpx-2k .mpx-disc{color:#b8c8e8}
  `;

  function openMediaPlayer(W, api) {
    const hi = api.era.id === '2000';
    const VW = hi ? 320 : 160, VH = hi ? 240 : 120, S = hi ? 2 : 1, FPS = hi ? 30 : 12;
    let idx = 0, t = 0, playing = false, loop = api.load('loop', false), last = 0, lastFrame = 0, raf = 0, loading = 0, mus = null, musTimer = 0, osdTimer = 0, vizMode = api.load('viz', 'bars'), isFs = false, alive = true, dirty = true;
    const B = (a, icon, title, extra = '') => `<button class="${hi ? '' : 'btn '}mpx-b ${extra}" data-a="${a}" title="${title}" aria-label="${title}">${icon}</button>`;
    W.body.innerHTML = `<div class="mpx ${hi ? 'mpx-2k' : 'mpx-95'}">
      <div class="mpx-main">
        <div class="mpx-stage${hi ? '' : ' sunken'}"><canvas class="mpx-cv" width="${VW}" height="${VH}"></canvas><div class="mpx-msg"></div><div class="mpx-osd"></div>
          <button class="${hi ? 'mpx-vb' : 'btn'} mpx-fsx" data-a="fs">Exit full screen</button>
          <div class="mpx-fsbar">${B('play', IC.play, 'Play / Pause', 'mpx-big')}${B('prev', IC.prev, 'Previous clip')}${B('next', IC.next, 'Next clip')}</div>
        </div>
        <div class="mpx-viz"><div class="mpx-vtop"><b>Visualization</b><button class="mpx-vb" data-v="bars">Bars</button><button class="mpx-vb" data-v="scope">Scope</button><button class="mpx-vb" data-v="stars">Starfield</button></div><canvas class="mpx-vcv" width="300" height="64"></canvas></div>
        <input type="range" class="mpx-seek" min="0" max="100" step="1" value="0" aria-label="Seek">
        <div class="mpx-ctl">${B('play', IC.play, 'Play / Pause', 'mpx-big')}${B('stop', IC.stop, 'Stop')}<span class="mpx-gap"></span>${B('prev', IC.prev, 'Previous clip')}${B('next', IC.next, 'Next clip')}${B('loop', IC.loop, 'Loop this clip')}${hi ? `<button class="mpx-b mpx-fsb" data-a="fs" title="Full screen">${IC.full} Full screen</button>` : ''}<span class="mpx-time${hi ? '' : ' sunken'}">0:00 / 0:00</span></div>
        <div class="mpx-status"><span class="sunken">Stopped</span><span class="sunken"></span></div>
      </div>
      <div class="mpx-side"><div class="mpx-plh">${hi ? 'Playlist: CD-ROM Sampler 2000' : 'CD-ROM Sampler (D:)'}</div><ol class="mpx-list${hi ? '' : ' sunken'}"></ol><div class="mpx-disc">${CLIPS.length} clips${hi ? ', 320x240 video, 30 fps' : ', 160x120 video, 12 fps'}</div></div>
    </div>`;
    const $ = s => W.body.querySelector(s), $$ = s => [...W.body.querySelectorAll(s)];
    const root = $('.mpx'), stage = $('.mpx-stage'), cv = $('.mpx-cv'), g = cv.getContext('2d'), msg = $('.mpx-msg'), osd = $('.mpx-osd');
    const seek = $('.mpx-seek'), timeEl = $('.mpx-time'), list = $('.mpx-list'), [stEl, infoEl] = $$('.mpx-status span');
    const vcv = $('.mpx-vcv'), vg = vcv.getContext('2d');
    const T = { tone: api.tone, noise: api.noise, sfx: api.sfx };

    list.innerHTML = CLIPS.map((c, i) => `<li data-i="${i}" role="button" tabindex="0"><span>${i + 1}. ${api.esc(c.title)}</span><small>${fmt(c.dur)}</small></li>`).join('');
    list.addEventListener('click', e => { const li = e.target.closest('li'); if (li) choose(+li.dataset.i, true); });
    list.addEventListener('keydown', e => { if (e.key === 'Enter') { const li = e.target.closest('li'); if (li) choose(+li.dataset.i, true); } });

    // ---- rendering ----
    const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => v / 16 - 0.47);
    function dither() {
      const im = g.getImageData(0, 0, VW, VH), d = im.data;
      for (let y = 0; y < VH; y++) for (let x = 0; x < VW; x++) {
        const o = (y * VW + x) * 4, b = BAYER[(y & 3) * 4 + (x & 3)];
        d[o] = Math.round(clamp(d[o] / 255 * 7 + b, 0, 7)) * 255 / 7;
        d[o + 1] = Math.round(clamp(d[o + 1] / 255 * 7 + b, 0, 7)) * 255 / 7;
        d[o + 2] = Math.round(clamp(d[o + 2] / 255 * 3 + b, 0, 3)) * 255 / 3;
      }
      g.putImageData(im, 0, 0);
    }
    function render() {
      g.setTransform(S, 0, 0, S, 0, 0);
      try { CLIPS[idx].draw(g, t, S, hi); } catch (e) { console.error(e); }
      g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1;
      if (!hi) dither();
    }
    function fit() {
      const narrow = W.body.clientWidth < 560;
      root.classList.toggle('mpx-narrow', narrow);
      if (narrow && !isFs) stage.style.height = Math.round(Math.min(W.body.clientWidth - 12, hi ? 520 : 330) * 0.75) + 'px';
      else stage.style.height = '';
      const w = stage.clientWidth, h = stage.clientHeight;
      let s = Math.min(w / 160, h / 120);
      if (!hi && !isFs) s = clamp(s, 1, 2);
      if (!hi) s = Math.max(1, Math.floor(s * 2) / 2);
      cv.style.width = Math.floor(160 * s) + 'px'; cv.style.height = Math.floor(120 * s) + 'px';
      if (hi) { const vw = Math.max(100, vcv.clientWidth | 0); if (vcv.width !== vw) vcv.width = vw; }
      dirty = true;
    }

    // ---- sound ----
    function startMusic() {
      stopMus();
      const c = CLIPS[idx], s = c.song, n = s.mel.length;
      const k4 = Math.floor(t / s.step / 4) * 4;
      const rot = (arr, k) => arr.slice(k % arr.length).concat(arr.slice(0, k % arr.length));
      mus = api.playMusic(Object.assign({}, s, { mel: rot(s.mel, k4 % n), bass: rot(s.bass, (k4 / 4) % s.bass.length) }));
    }
    function stopMus() { clearTimeout(musTimer); if (mus) { api.stopMusic(); mus = null; } }

    // ---- transport ----
    function setStatus() {
      stEl.textContent = loading ? 'Loading' : playing ? 'Playing' : t > 0 ? 'Paused' : 'Stopped';
      const c = CLIPS[idx];
      infoEl.textContent = `${c.title}: ${c.desc}`;
      $$('[data-a=play]').forEach(b => { b.innerHTML = playing ? IC.pause : IC.play; b.title = playing ? 'Pause' : 'Play'; });
      $$('[data-a=loop]').forEach(b => b.classList.toggle('mpx-on', loop));
      $$('.mpx-list li').forEach((li, i) => { li.classList.toggle('mpx-sel', i === idx); });
      api.setTitle(`Media Player - ${c.title}${playing ? '' : t > 0 ? ' (Paused)' : ' (Stopped)'}`);
      updTime();
    }
    function updTime() {
      const c = CLIPS[idx];
      timeEl.textContent = `${fmt(t)} / ${fmt(c.dur)}`;
      if (!seeking) { seek.max = c.dur * 10; seek.value = Math.round(t * 10); }
    }
    function showOsd() {
      if (!hi) return;
      osd.textContent = 'Now playing: ' + CLIPS[idx].title; osd.classList.add('on');
      clearTimeout(osdTimer); osdTimer = setTimeout(() => osd.classList.remove('on'), 2200);
    }
    function play() {
      if (loading) return;
      if (t >= CLIPS[idx].dur - 0.05) t = 0;
      playing = true; last = performance.now(); lastFrame = 0;
      startMusic(); showOsd(); setStatus();
    }
    function pause() { playing = false; stopMus(); setStatus(); dirty = true; }
    function stop() { playing = false; stopMus(); t = 0; dirty = true; setStatus(); }
    function toggle() { if (playing) pause(); else play(); }
    function choose(i, autoplay) {
      const was = playing; playing = false; stopMus();
      idx = (i + CLIPS.length) % CLIPS.length; t = 0;
      const li = list.children[idx]; if (li && li.scrollIntoView) li.scrollIntoView({ block: 'nearest' });
      const go = autoplay || was;
      if (!hi) {
        // Horizon 95: a 2x CD-ROM has to spin up and seek first.
        const tok = ++loadTok; loading = 1; setStatus();
        g.fillStyle = '#000'; g.fillRect(0, 0, VW, VH); msg.textContent = 'Reading CD-ROM...';
        if (api.sfx.cdrom) api.sfx.cdrom(); else api.sfx.seek(4);
        setTimeout(() => { if (!alive || tok !== loadTok) return; loading = 0; msg.textContent = ''; dirty = true; if (go) play(); else setStatus(); }, 900);
      } else { msg.textContent = ''; dirty = true; if (go) play(); else setStatus(); }
    }
    let loadTok = 0;
    function ended() {
      if (loop) { t = 0; startMusic(); showOsd(); return; }
      if (idx < CLIPS.length - 1) { choose(idx + 1, true); return; }
      playing = false; stopMus(); t = 0; dirty = true; setStatus();
      stEl.textContent = 'End of disc';
    }
    function setLoop(v) { loop = v; api.save('loop', loop); setStatus(); }

    // ---- seek bar ----
    let seeking = false;
    seek.addEventListener('pointerdown', () => { seeking = true; });
    const endSeek = () => { if (!seeking) return; seeking = false; if (playing) startMusic(); };
    seek.addEventListener('input', () => {
      const c = CLIPS[idx]; t = clamp(+seek.value / 10, 0, c.dur - 0.01); dirty = true;
      timeEl.textContent = `${fmt(t)} / ${fmt(c.dur)}`;
      if (playing) { last = performance.now(); if (!seeking) { clearTimeout(musTimer); musTimer = setTimeout(startMusic, 200); } else stopMus(); }
      if (!playing && t > 0) stEl.textContent = 'Paused';
    });
    seek.addEventListener('change', endSeek);
    seek.addEventListener('pointerup', endSeek);
    seek.addEventListener('pointercancel', endSeek);
    function jump(d) { const c = CLIPS[idx]; t = clamp(t + d, 0, c.dur - 0.01); dirty = true; if (playing) startMusic(); updTime(); }

    // ---- full screen (2000) ----
    function enterFs() {
      if (!hi || isFs) return;
      isFs = true; stage.classList.add('mpx-fs'); api.sfx.click();
      try { const p = stage.requestFullscreen && stage.requestFullscreen(); if (p && p.catch) p.catch(() => {}); } catch (e) {}
      setTimeout(fit, 60); fit();
    }
    function exitFs() {
      if (!isFs) return;
      isFs = false; stage.classList.remove('mpx-fs');
      try { if (document.fullscreenElement === stage) document.exitFullscreen(); } catch (e) {}
      setTimeout(fit, 60); fit();
    }
    const onFsChange = () => { if (isFs && document.fullscreenElement !== stage && !document.fullscreenElement) exitFs(); else fit(); };
    document.addEventListener('fullscreenchange', onFsChange);
    stage.addEventListener('dblclick', () => { if (hi) (isFs ? exitFs : enterFs)(); });

    W.body.addEventListener('click', e => {
      const b = e.target.closest('[data-a]');
      if (b) {
        const a = b.dataset.a;
        if (a === 'play') toggle(); else if (a === 'stop') stop(); else if (a === 'prev') choose(t > 2 && playing ? idx : idx - 1, playing);
        else if (a === 'next') choose(idx + 1, playing); else if (a === 'loop') setLoop(!loop);
        else if (a === 'fs') isFs ? exitFs() : enterFs();
        return;
      }
      const v = e.target.closest('[data-v]'); if (v) setViz(v.dataset.v);
    });

    // ---- visualizations (2000) ----
    const bars = new Float32Array(20), peaks = new Float32Array(20);
    const stars = Array.from({ length: 90 }, () => ({ x: Math.random() * 2 - 1, y: Math.random() * 2 - 1, z: Math.random() }));
    let fdata = new Uint8Array(32), tdata = new Uint8Array(64);
    function setViz(m) { vizMode = m; api.save('viz', m); $$('[data-v]').forEach(b => b.classList.toggle('mpx-on', b.dataset.v === m)); }
    function drawViz(dt) {
      const w = vcv.width, h = vcv.height, an = mus && mus.an;
      let level = 0;
      if (an) { if (fdata.length !== an.frequencyBinCount) { fdata = new Uint8Array(an.frequencyBinCount); tdata = new Uint8Array(an.fftSize); } an.getByteFrequencyData(fdata); an.getByteTimeDomainData(tdata); for (let i = 0; i < fdata.length; i++) level += fdata[i]; level /= fdata.length * 255; }
      else { fdata.fill(0); tdata.fill(128); }
      if (vizMode === 'stars') { vg.fillStyle = 'rgba(0,0,0,.35)'; vg.fillRect(0, 0, w, h); }
      else { vg.fillStyle = '#000'; vg.fillRect(0, 0, w, h); }
      if (vizMode === 'bars') {
        const n = bars.length, bw = w / n;
        for (let i = 0; i < n; i++) {
          const v = (fdata[Math.min(fdata.length - 1, 1 + Math.floor(i * (fdata.length - 2) / n))] || 0) / 255;
          bars[i] = Math.max(v, bars[i] - dt * 1.6); peaks[i] = Math.max(bars[i], peaks[i] - dt * 0.5);
          const bh = bars[i] * (h - 4);
          for (let y = 0; y < bh; y += 3) { const f = y / h; vg.fillStyle = f > 0.75 ? '#ff4040' : f > 0.5 ? '#ffe040' : '#40ff60'; vg.fillRect(i * bw + 1, h - 2 - y - 2, bw - 2, 2); }
          vg.fillStyle = '#fff'; vg.fillRect(i * bw + 1, h - 3 - peaks[i] * (h - 4), bw - 2, 1);
        }
      } else if (vizMode === 'scope') {
        vg.strokeStyle = '#123a12'; vg.lineWidth = 1; vg.beginPath(); vg.moveTo(0, h / 2); vg.lineTo(w, h / 2); vg.stroke();
        vg.strokeStyle = '#60ff60'; vg.lineWidth = 2; vg.shadowColor = '#60ff60'; vg.shadowBlur = 6; vg.beginPath();
        const N = tdata.length;
        for (let i = 0; i < N; i++) { const x = i / (N - 1) * w, y = h / 2 + ((tdata[i] - 128) / 128) * (h / 2 - 3) * 2.2; i ? vg.lineTo(x, clamp(y, 1, h - 1)) : vg.moveTo(x, clamp(y, 1, h - 1)); }
        vg.stroke(); vg.shadowBlur = 0;
      } else {
        const sp = (0.15 + level * 4) * dt;
        stars.forEach(s => {
          s.z -= sp; if (s.z <= 0.02) { s.x = Math.random() * 2 - 1; s.y = Math.random() * 2 - 1; s.z = 1; }
          const x = w / 2 + s.x / s.z * w * 0.25, y = h / 2 + s.y / s.z * h * 0.4;
          if (x < 0 || x > w || y < 0 || y > h) { s.z = 1; return; }
          const b = clamp(1 - s.z, 0.2, 1); vg.fillStyle = `rgba(${200 + level * 55 | 0},${220},255,${b})`; const sz = b * 2.5; vg.fillRect(x, y, sz, sz);
        });
      }
      if (!playing) { vg.fillStyle = 'rgba(160,190,255,.7)'; vg.font = '11px Tahoma,sans-serif'; vg.textAlign = 'center'; vg.textBaseline = 'middle'; vg.fillText(t > 0 ? 'Paused' : 'Press Play to start the visualization', w / 2, h / 2); }
    }

    // ---- main loop ----
    let lastViz = 0;
    function frame(now) {
      if (!alive) return;
      raf = requestAnimationFrame(frame);
      if (playing && !loading) {
        let dt = Math.min(0.25, (now - last) / 1000); last = now;
        if (seeking) dt = 0;
        const a = t; t += dt;
        const c = CLIPS[idx];
        if (dt > 0) try { c.fx(a, Math.min(t, c.dur), T); } catch (e) { console.error(e); }
        if (t >= c.dur) { t = c.dur; ended(); }
        // Horizon 95 drops the odd frame, like a 2x CD-ROM on a 486.
        const need = 1000 / FPS * (hi ? 1 : (rnd(Math.floor(now / 500)) < 0.2 ? 1.8 : 1));
        if (!loading && now - lastFrame >= need - 2) { lastFrame = now; render(); updTime(); }
      } else if (dirty && !loading) { render(); updTime(); }
      dirty = false;
      if (hi && now - lastViz > 30) { drawViz(Math.min(0.1, (now - lastViz) / 1000)); lastViz = now; }
    }

    // ---- menus ----
    api.menubar([
      { label: 'File', items: () => [
        { label: 'Open clip...', fn: () => { const li = list.children[idx]; li && li.focus(); api.msgBox('Open', `Pick a clip from the ${hi ? 'playlist' : 'CD-ROM Sampler list'} on the ${root.classList.contains('mpx-narrow') ? 'bottom' : 'right'}. There are ${CLIPS.length} clips on this disc.`); } },
        { label: 'Properties', fn: () => { const c = CLIPS[idx]; api.msgBox('Properties', `${c.title}\n${c.desc}\n\nLength: ${fmt(c.dur)}\nVideo: ${VW} x ${VH}, ${FPS} frames per second, ${hi ? 'millions of colors' : '256 colors (dithered)'}\nAudio: ${hi ? '44 kHz stereo' : '22 kHz mono'}, synthesized`); } },
        '-', { label: 'Exit', fn: () => api.close() }] },
      { label: 'Play', items: () => [
        { label: playing ? 'Pause' : 'Play', fn: toggle }, { label: 'Stop', fn: stop },
        { label: 'Previous clip', fn: () => choose(idx - 1, playing) }, { label: 'Next clip', fn: () => choose(idx + 1, playing) }, '-',
        { label: (loop ? '✓ ' : '') + 'Loop this clip', fn: () => setLoop(!loop) },
        ...(hi ? ['-', { label: 'Full screen', fn: enterFs }, '-',
          { label: (vizMode === 'bars' ? '✓ ' : '') + 'Visualization: Bars', fn: () => setViz('bars') },
          { label: (vizMode === 'scope' ? '✓ ' : '') + 'Visualization: Scope', fn: () => setViz('scope') },
          { label: (vizMode === 'stars' ? '✓ ' : '') + 'Visualization: Starfield', fn: () => setViz('stars') }] : [])] },
      { label: 'Help', items: [
        { label: 'How to use', fn: () => api.msgBox('Media Player Help', `Pick a clip from the list, then press Play.\n\nPause stops the picture where it is. Stop goes back to the start. Drag the slider to jump anywhere in the clip. The Loop button plays the same clip over and over; with Loop off the player moves on to the next clip.\n\nKeys: Space play/pause, Left/Right jump 2 seconds, N next, P previous, L loop${hi ? ', F full screen (Esc to leave)' : ''}.${hi ? '\n\nThe Visualization panel dances to the music: try Bars, Scope and Starfield.' : '\n\nVideo on a 1995 PC is small and a little jumpy: the CD-ROM can only read so fast.'}`) },
        { label: 'About Media Player', fn: () => api.msgBox('About Media Player', `Media Player for ${hi ? 'Horizon 2000' : 'Horizon 95'}\nCD-ROM Sampler: ${CLIPS.length} clips of original animation and music.`) }] }
    ]);

    W.onKey = e => {
      if (e.target && /^(INPUT|SELECT)$/.test(e.target.tagName) && e.target !== seek) return;
      const k = e.key;
      if (k === ' ' || k === 'k') { e.preventDefault(); toggle(); }
      else if (k === 'ArrowRight') { e.preventDefault(); jump(2); } else if (k === 'ArrowLeft') { e.preventDefault(); jump(-2); }
      else if (k === 'n' || k === 'N') choose(idx + 1, playing); else if (k === 'p' || k === 'P') choose(idx - 1, playing);
      else if (k === 'l' || k === 'L') setLoop(!loop); else if (k === 's' || k === 'S') stop();
      else if ((k === 'f' || k === 'F') && hi) isFs ? exitFs() : enterFs();
      else if (k === 'Escape' && isFs) exitFs();
    };
    const onDocKey = e => { if (isFs && e.key === 'Escape') exitFs(); };
    document.addEventListener('keydown', onDocKey);
    W.onResize = fit;
    const ro = window.ResizeObserver ? new ResizeObserver(() => fit()) : null;
    if (ro) ro.observe(W.body);
    W.onMin = () => { if (playing) pause(); exitFs(); };
    W.onClose = () => {
      alive = false; playing = false; cancelAnimationFrame(raf); clearTimeout(osdTimer); clearTimeout(musTimer); loadTok++;
      stopMus(); api.stopMusic();
      if (ro) ro.disconnect();
      document.removeEventListener('fullscreenchange', onFsChange); document.removeEventListener('keydown', onDocKey);
      try { if (document.fullscreenElement === stage) document.exitFullscreen(); } catch (e) {}
    };
    setViz(vizMode);
    fit(); render(); setStatus();
    raf = requestAnimationFrame(frame);
    setTimeout(fit, 50);
  }

  /* ================= Sound Recorder ================= */
  const SR_CSS = `
    .srx{display:flex;flex-direction:column;gap:6px;padding:8px;box-sizing:border-box;min-height:100%;user-select:none;-webkit-user-select:none}
    .srx-top{display:flex;align-items:stretch;gap:8px}
    .srx-lbl{width:74px;flex:none;font-size:12px;display:flex;flex-direction:column;justify-content:center}
    .srx-lbl b{font-weight:normal;white-space:nowrap}
    .srx-lbl:last-child{text-align:right}
    .srx-scope{flex:1;min-width:0;height:84px;background:#000;display:block;box-sizing:border-box}
    .srx-seek{width:100%;margin:0;height:26px;background:transparent;-webkit-appearance:none;appearance:none;cursor:pointer;touch-action:none}
    .srx-seek::-webkit-slider-runnable-track{height:4px;background:#fff;border:1px solid;border-color:#808080 #fff #fff #808080;box-shadow:inset 1px 1px #000}
    .srx-seek::-moz-range-track{height:4px;background:#fff;border:1px solid;border-color:#808080 #fff #fff #808080}
    .srx-seek::-webkit-slider-thumb{-webkit-appearance:none;width:11px;height:21px;margin-top:-9px;background:#c0c0c0;border:2px solid;border-color:#fff #000 #000 #fff;border-radius:0}
    .srx-seek::-moz-range-thumb{width:9px;height:19px;background:#c0c0c0;border:2px solid;border-color:#fff #000 #000 #fff;border-radius:0}
    .srx-btns{display:flex;gap:4px;justify-content:center}
    .srx-b{min-width:0;flex:1;max-width:64px;height:36px;padding:0;display:inline-flex;align-items:center;justify-content:center}
    .srx-b:active{padding:2px 0 0 2px}
    .srx-b:disabled{color:#808080}
    .srx-b:disabled svg circle{fill:#808080}
    .srx-b.srx-live{border-color:#000 #fff #fff #000;box-shadow:inset 1px 1px var(--dk);background:#dcdcdc}
    .srx-row{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
    .srx-row select{flex:1;min-width:150px;height:28px;font:inherit}
    .srx-fx{display:grid;grid-template-columns:repeat(auto-fill,minmax(88px,1fr));gap:4px}
    .srx-fx .btn{min-width:0;padding:6px 4px;min-height:32px}
    .srx-fx .btn:active{padding:6px 7px 4px 9px}
    .srx-cap{font-size:11px;margin:2px 0 -2px}
    .srx-stat{padding:3px 6px;font-size:12px;background:var(--gray);min-height:17px}
    .srx-dot{display:inline-block;width:9px;height:9px;border-radius:50%;background:#d00000;margin-right:5px;vertical-align:-1px;animation:srxblink 1s steps(2) infinite}
    @keyframes srxblink{50%{visibility:hidden}}
  `;

  // Built-in sample sounds, synthesized at 22,050 Hz (so everyone can play, even without a microphone).
  const SSR = 22050;
  function normalize(d, peak = 0.8) { let m = 0; for (let i = 0; i < d.length; i++) m = Math.max(m, Math.abs(d[i])); if (m > 0) { const k = peak / m; for (let i = 0; i < d.length; i++) d[i] *= k; } return d; }
  function mkSamples() {
    const gen = (sec, fn) => { const n = Math.floor(sec * SSR), d = new Float32Array(n); fn(d, n); return normalize(d); };
    const TAU = Math.PI * 2;
    return [
      { name: 'Singing vowels (aah-eee-ooh)', data: gen(2.4, (d, n) => {
        const F = [[800, 1150], [270, 2300], [450, 800], [325, 700]], st = [[0, 0, 0], [0, 0, 0]];
        let ph = 0;
        for (let i = 0; i < n; i++) {
          const s = i / SSR, seg = Math.min(3, Math.floor(s / 0.6)), k = clamp((s - seg * 0.6) / 0.15, 0, 1), nx = Math.min(3, seg), pv = Math.max(0, seg - 1);
          const f0 = 150 + 20 * Math.sin(s * TAU * 5) * Math.min(1, s) + seg * 8;
          ph += f0 / SSR; if (ph >= 1) ph -= 1;
          const src = ph < 0.08 ? 1 : 0;
          let out = 0;
          for (let j = 0; j < 2; j++) {
            const fc = lerp(F[seg ? pv : 0][j], F[nx][j], seg ? k : 1), bw = 80 + j * 40, r = Math.exp(-Math.PI * bw / SSR), c = 2 * r * Math.cos(TAU * fc / SSR);
            const y = src * (1 - r) + c * st[j][0] - r * r * st[j][1]; st[j][1] = st[j][0]; st[j][0] = y; out += y * (j ? 0.6 : 1);
          }
          d[i] = out * Math.min(1, s * 10, (n - i) / SSR * 6);
        }
      }) },
      { name: 'Doorbell', data: gen(2, (d, n) => { for (let i = 0; i < n; i++) { const s = i / SSR; let v = 0; [[659.3, 0], [523.3, 0.55]].forEach(([f, at]) => { if (s >= at) { const u = s - at; v += Math.exp(-u * 2.2) * (Math.sin(TAU * f * u) + 0.4 * Math.sin(TAU * f * 2.76 * u) * Math.exp(-u * 4)); } }); d[i] = v; } }) },
      { name: 'Drum beat', data: gen(3.2, (d, n) => {
        const step = 0.2, pat = 'k-h-s-h-k-k-s-h-';
        for (let i = 0; i < n; i++) {
          const s = i / SSR, b = Math.floor(s / step), u = s - b * step, c = pat[b % 16]; let v = 0;
          if (c === 'k') v = Math.sin(TAU * (55 * u + 60 * (1 - Math.exp(-u * 30)) / 30)) * Math.exp(-u * 12);
          else if (c === 's') v = (rnd(i) * 2 - 1) * Math.exp(-u * 18) * 0.7 + Math.sin(TAU * 190 * u) * Math.exp(-u * 20) * 0.4;
          if (c === 'h' || c === '-' ) { if (u < 0.04) v += (rnd(i + 99) * 2 - 1) * Math.exp(-u * 90) * 0.25 * (c === 'h' ? 1 : 0.5); }
          d[i] = v;
        }
      }) },
      { name: 'Bird song', data: gen(2.6, (d, n) => {
        let ph = 0;
        const chirps = [[0, 0.12, 3200, 4200], [0.18, 0.12, 3200, 4400], [0.5, 0.25, 4800, 2600], [0.95, 0.08, 3600, 4000], [1.08, 0.08, 3600, 4100], [1.21, 0.08, 3600, 4200], [1.6, 0.35, 2800, 5000], [2.1, 0.2, 5000, 3000]];
        for (let i = 0; i < n; i++) {
          const s = i / SSR, c = chirps.find(q => s >= q[0] && s < q[0] + q[1]);
          if (!c) { d[i] = 0; continue; }
          const u = (s - c[0]) / c[1], f = lerp(c[2], c[3], u) + Math.sin(s * TAU * 40) * 150;
          ph += f / SSR; d[i] = Math.sin(TAU * ph) * Math.sin(Math.PI * u);
        }
      }) },
      { name: 'Whistle tune', data: gen(3, (d, n) => {
        const notes = [[72, 0.3], [76, 0.3], [79, 0.3], [84, 0.6], [81, 0.3], [79, 0.3], [76, 0.9]]; let ph = 0, at = 0;
        const sched = notes.map(([m, l]) => { const o = { f: 440 * Math.pow(2, (m - 69) / 12), s: at, l }; at += l; return o; });
        for (let i = 0; i < n; i++) {
          const s = i / SSR, nt = sched.find(q => s >= q.s && s < q.s + q.l) || sched[sched.length - 1], u = (s - nt.s) / nt.l;
          ph += nt.f * (1 + 0.012 * Math.sin(s * TAU * 6)) / SSR;
          d[i] = (Math.sin(TAU * ph) + (rnd(i) - 0.5) * 0.06) * Math.min(1, u * 20, (1 - u) * 12) * (s > at ? 0 : 1);
        }
      }) },
      { name: 'Laser zaps', data: gen(1.8, (d, n) => { let ph = 0; for (let i = 0; i < n; i++) { const s = i / SSR, u = (s % 0.45) / 0.45, f = 2400 * Math.exp(-u * 3.5) + 200; ph += f / SSR; d[i] = (ph % 1 < 0.5 ? 1 : -1) * Math.exp(-u * 3) * (s < 1.8 ? 1 : 0); } }) }
    ].map(s => ({ ...s, sr: SSR, sample: true }));
  }

  const EFFECTS = [
    { id: 'fast', label: 'Speed up (chipmunk)', short: 'Chipmunk' },
    { id: 'slow', label: 'Slow down', short: 'Slow' },
    { id: 'rev', label: 'Reverse', short: 'Reverse' },
    { id: 'echo', label: 'Add echo', short: 'Echo' },
    { id: 'robot', label: 'Robot voice', short: 'Robot' },
    { id: 'loud', label: 'Louder', short: 'Louder' },
    { id: 'quiet', label: 'Quieter', short: 'Quieter' }
  ];
  function resample(d, rate) { const n = Math.floor(d.length / rate), o = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i * rate, j = Math.floor(x), f = x - j; o[i] = (d[j] || 0) * (1 - f) + (d[j + 1] || 0) * f; } return o; }
  function applyFx(id, d, sr) {
    if (id === 'fast') return resample(d, 1.5);
    if (id === 'slow') return resample(d, 0.67);
    if (id === 'rev') return d.slice().reverse();
    if (id === 'echo') {
      const D = Math.floor(sr * 0.22), o = new Float32Array(d.length + Math.floor(sr * 1.2));
      for (let i = 0; i < o.length; i++) o[i] = (d[i] || 0) + (i >= D ? o[i - D] * 0.45 : 0);
      let m = 0; for (let i = 0; i < o.length; i++) m = Math.max(m, Math.abs(o[i]));
      if (m > 0.98) for (let i = 0; i < o.length; i++) o[i] *= 0.98 / m;
      return o;
    }
    if (id === 'robot') {
      const o = new Float32Array(d.length), D = Math.floor(sr * 0.009);
      for (let i = 0; i < d.length; i++) o[i] = d[i] * Math.sin(2 * Math.PI * 55 * i / sr) * 1.6 + (i >= D ? o[i - D] * 0.5 : 0);
      for (let i = 0; i < o.length; i++) o[i] = Math.tanh(o[i]);
      return o;
    }
    if (id === 'loud') { const o = new Float32Array(d.length); for (let i = 0; i < d.length; i++) o[i] = Math.tanh(d[i] * 1.8) ; return o; }
    if (id === 'quiet') return d.map(v => v * 0.6);
    return d;
  }

  function openSoundRec(W, api) {
    const MAX = 30;
    const SAMPLES = mkSamples();
    const recs = [], uid = Math.random().toString(36).slice(2, 8);
    let cur = null, pos = 0, mode = 'idle', ac = null, out = null, an = null, src = null, playStart = 0, playFrom = 0, raf = 0, alive = true;
    let stream = null, msrc = null, proc = null, sink = null, recAn = null, chunks = [], recLen = 0, recSr = 44100, recN = 0, micState = 'ask', undo = [], busy = false;
    W.body.innerHTML = `<div class="srx">
      <div class="srx-top"><div class="srx-lbl">Position:<b data-pos>0.00 sec.</b></div><canvas class="srx-scope sunken" width="240" height="80"></canvas><div class="srx-lbl">Length:<b data-len>0.00 sec.</b></div></div>
      <input type="range" class="srx-seek" min="0" max="1000" value="0" aria-label="Position">
      <div class="srx-btns">
        <button class="btn srx-b" data-a="start" title="Seek to start" aria-label="Seek to start">${IC.rew}</button>
        <button class="btn srx-b" data-a="end" title="Seek to end" aria-label="Seek to end">${IC.ffw}</button>
        <button class="btn srx-b" data-a="play" title="Play" aria-label="Play">${IC.play}</button>
        <button class="btn srx-b" data-a="stop" title="Stop" aria-label="Stop">${IC.stop}</button>
        <button class="btn srx-b" data-a="rec" title="Record" aria-label="Record">${IC.rec}</button>
      </div>
      <div class="srx-row"><label for="srx-sel-${uid}">Sound:</label><select class="srx-sel" id="srx-sel-${uid}"></select></div>
      <div class="srx-cap">Effects:</div>
      <div class="srx-fx">${EFFECTS.map(f => `<button class="btn" data-fx="${f.id}">${f.short}</button>`).join('')}</div>
      <div class="srx-stat sunken" role="status"></div>
    </div>`;
    const $ = s => W.body.querySelector(s);
    const cv = $('.srx-scope'), g = cv.getContext('2d'), seek = $('.srx-seek'), sel = $('.srx-sel'), stat = $('.srx-stat'), posEl = $('[data-pos]'), lenEl = $('[data-len]');
    const btn = a => $(`[data-a=${a}]`);
    const say = (html) => { stat.innerHTML = html; };
    const len = () => cur ? cur.data.length / cur.sr : 0;
    const vol = () => { try { const s = JSON.parse(localStorage.getItem('r1990:settings') || '{}'); return s.vol == null ? 0.6 : +s.vol; } catch (e) { return 0.6; } };

    function getAC() {
      if (!ac) {
        const C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
        ac = new C(); out = ac.createGain(); out.gain.value = Math.min(1, vol() * 1.3); out.connect(ac.destination);
        an = ac.createAnalyser(); an.fftSize = 1024; an.connect(out);
      }
      if (ac.state === 'suspended') ac.resume();
      return ac;
    }
    function fillSel() {
      const o = (v, t, s) => `<option value="${v}"${s ? ' selected' : ''}>${api.esc(t)}</option>`;
      const key = cur ? (cur.sample ? 's' + SAMPLES.indexOf(cur.base || cur) : 'r' + recs.indexOf(cur.base || cur)) : '';
      sel.innerHTML = `<option value=""${key ? '' : ' selected'}>(new, empty)</option>` +
        (recs.length ? `<optgroup label="My recordings (this session only)">${recs.map((r, i) => o('r' + i, `${r.name} (${(r.data.length / r.sr).toFixed(1)} sec.)`, key === 'r' + i)).join('')}</optgroup>` : '') +
        `<optgroup label="Sample sounds">${SAMPLES.map((s, i) => o('s' + i, s.name, key === 's' + i)).join('')}</optgroup>`;
    }
    function load(base) {
      stopAll();
      cur = base ? { name: base.name, data: base.data, sr: base.sr, sample: !!base.sample, base, fx: [] } : null;
      undo = []; pos = 0; fillSel(); upd();
      say(cur ? `Loaded "${api.esc(cur.name)}". Press Play, or try an effect.` : 'Ready. Press the red button to record (up to 30 seconds).');
    }
    sel.addEventListener('change', () => { const v = sel.value; load(!v ? null : v[0] === 's' ? SAMPLES[+v.slice(1)] : recs[+v.slice(1)]); });

    function upd() {
      const L = mode === 'rec' ? recLen / recSr : len();
      const P = mode === 'rec' ? L : curPos();
      posEl.textContent = P.toFixed(2) + ' sec.'; lenEl.textContent = L.toFixed(2) + ' sec.';
      if (!seeking) seek.value = L ? Math.round(P / L * 1000) : 0;
      seek.disabled = mode === 'rec' || !cur;
      btn('play').disabled = !cur || mode !== 'idle' || busy; btn('stop').disabled = mode === 'idle';
      btn('start').disabled = btn('end').disabled = !cur || mode === 'rec';
      btn('rec').disabled = mode !== 'idle' || busy; btn('rec').classList.toggle('srx-live', mode === 'rec'); btn('play').classList.toggle('srx-live', mode === 'play');
      W.body.querySelectorAll('[data-fx]').forEach(b => { b.disabled = !cur || mode !== 'idle' || busy; });
      sel.disabled = mode !== 'idle' || busy;
      api.setTitle(`${cur ? cur.name + (cur.fx.length ? ' (' + cur.fx.join(', ') + ')' : '') : 'Untitled'} - Sound Recorder`);
    }
    function curPos() { return mode === 'play' && ac ? Math.min(len(), playFrom + (ac.currentTime - playStart)) : pos; }

    // ---- playback ----
    function play() {
      if (!cur || mode !== 'idle') return;
      const a = getAC(); if (!a) { say('Sorry, this browser cannot play sounds.'); return; }
      if (pos >= len() - 0.01) pos = 0;
      const buf = a.createBuffer(1, cur.data.length, cur.sr); buf.getChannelData(0).set(cur.data);
      const s = a.createBufferSource(); s.buffer = buf; s.connect(an);
      s.onended = () => { if (src !== s) return; src = null; if (mode === 'play') { pos = len(); mode = 'idle'; upd(); say('Done. Press Play to hear it again.'); } };
      src = s; playFrom = pos; playStart = a.currentTime; s.start(0, pos); mode = 'play'; upd();
      say(`Playing "${api.esc(cur.name)}"...`);
    }
    function stopPlay() { if (src) { const s = src; src = null; try { s.onended = null; s.stop(); } catch (e) {} try { s.disconnect(); } catch (e) {} } if (mode === 'play') { pos = curPos(); mode = 'idle'; } }
    function stopAll() { if (mode === 'rec') finishRec(); stopPlay(); mode = 'idle'; }

    // ---- recording ----
    async function askMic() {
      if (micState === 'granted') return true;
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        await api.msgBox('Sound Recorder', 'This browser does not let Sound Recorder reach a microphone here. You can still play with the sample sounds: pick one from the Sound list and try the effects!', ['OK'], 'warn');
        offerSamples(); return false;
      }
      if (micState === 'ask') {
        const r = await api.msgBox('Use your microphone?', 'Sound Recorder needs your microphone to record. Your browser will ask you to allow it next.\n\nYour recordings stay in this window only. They are never saved or sent anywhere, and they are forgotten when you close Sound Recorder.', ['Continue', 'Not now'], 'info');
        if (!alive) return false;
        if (r !== 'Continue') { offerSamples(true); return false; }
      }
      return true;
    }
    function offerSamples(quiet) {
      if (!cur) load(SAMPLES[0]);
      say(quiet ? 'No microphone? No problem. Pick a sample sound from the Sound list and try the effects.' : 'The microphone is off, so here is a sample sound to play with. Pick others from the Sound list.');
    }
    async function record() {
      if (mode !== 'idle' || busy) return;
      busy = true; upd();
      try {
        if (!(await askMic()) || !alive) return;
        const a = getAC(); if (!a) { say('Sorry, this browser cannot record sounds.'); return; }
        say('Waiting for the microphone...');
        let st;
        try { st = await navigator.mediaDevices.getUserMedia({ audio: true }); }
        catch (e) {
          if (!alive) return;
          const denied = e && (e.name === 'NotAllowedError' || e.name === 'SecurityError' || e.name === 'PermissionDeniedError');
          const first = micState !== 'denied'; micState = 'denied';
          if (first) await api.msgBox('Microphone is off', denied
            ? "That's OK! Sound Recorder isn't allowed to use the microphone, so nothing was recorded.\n\nYou can still play: we've loaded a sample sound. Pick others from the Sound list and try Chipmunk, Echo or Robot.\n\n(To record later, allow the microphone in your browser's site settings and press Record again.)"
            : "Sound Recorder couldn't find a microphone, so nothing was recorded.\n\nYou can still play: we've loaded a sample sound. Pick others from the Sound list and try the effects.", ['OK'], 'info');
          if (!alive) return;
          if (first) offerSamples(); else say("The microphone is still off. Allow it in your browser's site settings, or play with the sample sounds in the Sound list.");
          return;
        }
        if (!alive) { st.getTracks().forEach(tr => tr.stop()); return; }
        micState = 'granted'; stopPlay();
        stream = st; recSr = a.sampleRate; chunks = []; recLen = 0;
        msrc = a.createMediaStreamSource(st);
        recAn = a.createAnalyser(); recAn.fftSize = 1024; msrc.connect(recAn);
        proc = a.createScriptProcessor(2048, 1, 1); sink = a.createGain(); sink.gain.value = 0;
        msrc.connect(proc); proc.connect(sink); sink.connect(a.destination);
        proc.onaudioprocess = ev => {
          if (mode !== 'rec') return;
          const d = ev.inputBuffer.getChannelData(0), room = MAX * recSr - recLen;
          if (room <= 0) return;
          const c = d.length > room ? d.slice(0, room) : new Float32Array(d);
          chunks.push(c); recLen += c.length;
          if (recLen >= MAX * recSr) setTimeout(() => { if (mode === 'rec') { finishRec(); say('Stopped at the 30 second limit.' + savedMsg()); } }, 0);
        };
        mode = 'rec';
        say(`<span class="srx-dot"></span>Recording... speak now! Press Stop when you're done (30 seconds max).`);
      } finally { busy = false; if (alive) upd(); }
    }
    function killStream() {
      try { if (proc) { proc.onaudioprocess = null; proc.disconnect(); } } catch (e) {}
      try { if (msrc) msrc.disconnect(); } catch (e) {}
      try { if (sink) sink.disconnect(); } catch (e) {}
      if (stream) stream.getTracks().forEach(tr => { try { tr.stop(); } catch (e) {} });
      stream = msrc = proc = sink = recAn = null;
    }
    let lastSaved = null;
    function savedMsg() { return lastSaved ? ` Saved as "${lastSaved.name}" (kept until you close Sound Recorder).` : ''; }
    function finishRec() {
      const wasRec = mode === 'rec';
      mode = 'idle'; killStream(); lastSaved = null;
      if (!wasRec) return;
      if (recLen < recSr * 0.1) { chunks = []; recLen = 0; say('That was too short to keep. Try again!'); upd(); return; }
      const d = new Float32Array(recLen); let o = 0; chunks.forEach(c => { d.set(c, o); o += c.length; }); chunks = []; recLen = 0;
      const r = { name: 'Recording ' + (++recN), data: d, sr: recSr };
      recs.unshift(r); if (recs.length > 5) recs.pop();
      lastSaved = r; load(r); pos = 0; upd();
      say(`Recorded ${(d.length / r.sr).toFixed(1)} seconds.${savedMsg()}`);
    }
    function stop() { if (mode === 'rec') finishRec(); else if (mode === 'play') { stopPlay(); upd(); say('Stopped.'); } }

    // ---- effects ----
    function fx(id) {
      if (!cur || mode !== 'idle') return;
      const f = EFFECTS.find(e => e.id === id), d = applyFx(id, cur.data, cur.sr);
      if (d.length / cur.sr > 60) { api.msgBox('Sound Recorder', 'That would make the sound longer than 60 seconds. Try Speed up first.', ['OK'], 'warn'); return; }
      undo.push({ data: cur.data, fx: cur.fx.slice() }); if (undo.length > 8) undo.shift();
      cur.data = d; cur.fx.push(f.short); pos = 0; upd(); play();
      say(`${f.label}: done! Playing it now. (Effects > Undo to go back.)`);
    }
    function undoFx() { const u = undo.pop(); if (!u || mode !== 'idle') return; cur.data = u.data; cur.fx = u.fx; pos = 0; upd(); say('Undone.'); }
    function revert() { if (!cur || mode !== 'idle') return; cur.data = cur.base.data; cur.fx = []; undo = []; pos = 0; upd(); say('Back to the original sound.'); }
    function keepCopy() {
      if (!cur || mode !== 'idle') return;
      const r = { name: 'Recording ' + (++recN), data: cur.data, sr: cur.sr };
      recs.unshift(r); if (recs.length > 5) recs.pop();
      load(r); say(`Kept a copy as "${r.name}". Only the last 5 recordings are kept, and only until you close Sound Recorder.`);
    }

    // ---- seek ----
    let seeking = false;
    seek.addEventListener('pointerdown', () => { seeking = true; });
    const endSeek = () => { seeking = false; };
    seek.addEventListener('pointerup', endSeek); seek.addEventListener('pointercancel', endSeek); seek.addEventListener('change', endSeek);
    seek.addEventListener('input', () => {
      if (!cur) return;
      const wasPlaying = mode === 'play'; if (wasPlaying) stopPlay();
      pos = +seek.value / 1000 * len(); upd(); if (wasPlaying && !seeking) play();
    });

    W.body.addEventListener('click', e => {
      const b = e.target.closest('[data-a]'), f = e.target.closest('[data-fx]');
      if (f && !f.disabled) { fx(f.dataset.fx); return; }
      if (!b || b.disabled) return;
      const a = b.dataset.a;
      if (a === 'play') play(); else if (a === 'stop') stop(); else if (a === 'rec') record();
      else if (a === 'start') { stopPlay(); pos = 0; upd(); } else if (a === 'end') { stopPlay(); pos = len(); upd(); }
    });

    // ---- oscilloscope ----
    const tbuf = new Float32Array(1024);
    function draw() {
      if (!alive) return;
      raf = requestAnimationFrame(draw);
      const w = cv.clientWidth | 0; if (w > 0 && cv.width !== w) cv.width = w;
      const want = clamp(W.body.clientHeight - 300, 84, 240) | 0; if (Math.abs(cv.clientHeight - want) > 1) cv.style.height = want + 'px';
      const h = cv.clientHeight | 0; if (h > 0 && cv.height !== h) cv.height = h;
      const W2 = cv.width, H = cv.height;
      g.fillStyle = '#000'; g.fillRect(0, 0, W2, H);
      g.strokeStyle = '#003800'; g.lineWidth = 1; g.beginPath();
      for (let x = 0; x < W2; x += 16) { g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, H); }
      for (let y = 0; y < H; y += 16) { g.moveTo(0, y + 0.5); g.lineTo(W2, y + 0.5); }
      g.stroke();
      let data = null;
      const live = mode === 'rec' ? recAn : mode === 'play' ? an : null;
      if (live) { live.getFloatTimeDomainData(tbuf); data = tbuf; }
      else if (cur) {
        const c = Math.floor(pos * cur.sr), n = 1024, s0 = clamp(c - n / 2, 0, Math.max(0, cur.data.length - n));
        data = cur.data.subarray(s0, s0 + n);
      }
      g.strokeStyle = '#00ff40'; g.lineWidth = 1.5; g.beginPath();
      const N = data ? data.length : 0;
      if (!N) { g.moveTo(0, H / 2); g.lineTo(W2, H / 2); }
      else for (let x = 0; x < W2; x++) { const v = data[Math.floor(x / W2 * N)] || 0; const y = H / 2 - clamp(v * (mode === 'rec' ? 2.5 : 1.2), -1, 1) * (H / 2 - 2); x ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.stroke();
      if (mode !== 'idle') upd();
      if (mode === 'play' && ac && curPos() >= len()) { /* onended will tidy up */ }
      if (mode === 'rec') { g.fillStyle = '#ff3030'; g.font = '11px "Courier New",monospace'; g.textAlign = 'right'; g.textBaseline = 'top'; g.fillText(`REC ${(recLen / recSr).toFixed(1)}/${MAX}s`, W2 - 4, 3); }
    }

    // ---- menus ----
    api.menubar([
      { label: 'File', items: () => [
        { label: 'New', fn: () => load(null), disabled: mode !== 'idle' },
        { label: 'Revert to original', fn: revert, disabled: !cur || !cur.fx.length || mode !== 'idle' },
        { label: 'Keep a copy in the list', fn: keepCopy, disabled: !cur || mode !== 'idle' },
        '-', ...SAMPLES.slice(0, 6).map(s => ({ label: 'Sample: ' + s.name, fn: () => load(s), disabled: mode !== 'idle' })),
        '-', { label: 'Exit', fn: () => api.close() }] },
      { label: 'Effects', items: () => [
        ...EFFECTS.map(f => ({ label: f.label, fn: () => fx(f.id), disabled: !cur || mode !== 'idle' })),
        '-', { label: 'Undo last effect', fn: undoFx, disabled: !undo.length || mode !== 'idle' }] },
      { label: 'Help', items: [
        { label: 'How to use', fn: () => api.msgBox('Sound Recorder Help', `Press the red Record button and speak into your microphone (up to ${MAX} seconds). Press Stop when you're done, then Play to hear it.\n\nTry the Effects: Chipmunk, Slow, Reverse, Echo, Robot, Louder and Quieter. Effects > Undo takes the last one back.\n\nNo microphone? Pick a sample sound from the Sound list.\n\nPrivacy: your last 5 recordings are kept in this window only. They are never saved to the computer or sent anywhere, and they are gone when you close Sound Recorder.`) },
        { label: 'About Sound Recorder', fn: () => api.msgBox('About Sound Recorder', `Sound Recorder for ${api.era.id === '2000' ? 'Horizon 2000' : 'Horizon 95'}\n${MAX} seconds, mono.`) }] }
    ]);

    W.onKey = e => {
      if (e.target && e.target.tagName === 'SELECT') return;
      if (e.key === ' ') { e.preventDefault(); mode === 'idle' ? play() : stop(); }
      else if (e.key === 'r' || e.key === 'R') record();
      else if (e.key === 'Escape') stop();
    };
    W.onMin = () => { stop(); };
    W.onClose = () => {
      alive = false; cancelAnimationFrame(raf);
      mode = 'idle'; killStream(); stopPlay();
      try { if (an) an.disconnect(); if (out) out.disconnect(); } catch (e) {}
      if (ac) { try { ac.close(); } catch (e) {} ac = null; }
      recs.length = 0; cur = null;
    };
    fillSel(); load(null); upd();
    raf = requestAnimationFrame(draw);
  }

  const ICON_MP = '<svg viewBox="0 0 32 32" shape-rendering="crispEdges" aria-hidden="true"><rect x="3" y="5" width="26" height="20" fill="#c0c0c0" stroke="#000"/><rect x="5" y="7" width="22" height="13" fill="#000080"/><rect x="5" y="15" width="22" height="5" fill="#208020"/><rect x="18" y="9" width="4" height="4" fill="#ffe040"/><rect x="5" y="21" width="22" height="2" fill="#808080"/><rect x="12" y="21" width="3" height="2" fill="#fff"/><path d="M12 26h8v2h-8z" fill="#404040"/><path d="M9 9h1v1h1v1h1v1h-1v1h-1v1h-1z" fill="#fff"/></svg>';
  const ICON_SR = '<svg viewBox="0 0 32 32" shape-rendering="crispEdges" aria-hidden="true"><rect x="2" y="7" width="28" height="18" fill="#c0c0c0" stroke="#000"/><rect x="4" y="9" width="24" height="10" fill="#000"/><path d="M4 14h3v-3h2v6h2v-4h2v2h2v-5h2v8h2v-5h2v3h2v-2h3" stroke="#00ff40" fill="none"/><circle cx="24" cy="22" r="2" fill="#d00000"/><rect x="6" y="21" width="12" height="2" fill="#808080"/></svg>';

  APPS.push({
    id: 'mediaplayer', label: 'Media Player', kind: 'builtin', cat: 'acc', eras: ['1995', '2000'],
    help: 'Watch short video clips from a CD-ROM sampler with play, pause, stop, a seek slider and loop (the 2000 version adds full screen and music visualizations).',
    icon: ICON_MP,
    window: { get w() { return screenEra() === '2000' ? 700 : 600; }, get h() { return screenEra() === '2000' ? 540 : 440; } },
    css: MP_CSS, open: openMediaPlayer
  });
  APPS.push({
    id: 'soundrec', label: 'Sound Recorder', kind: 'builtin', cat: 'acc', eras: ['1995', '2000'],
    help: 'Record your voice with the microphone (up to 30 seconds) and play it back with silly effects like chipmunk, echo and robot; your last 5 recordings are kept only until you close it and are never saved.',
    icon: ICON_SR,
    window: { w: 420, h: 400 },
    css: SR_CSS, open: openSoundRec
  });
})();
