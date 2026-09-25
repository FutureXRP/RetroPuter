/* Movie Maker: a stick-figure animation studio that ships with Horizon 2000.
   Pose up to 3 stick figures frame by frame on a painted backdrop, add props,
   sound effects, a title card and rolling credits, then play it back. */
(function () {
  const VW = 320, VH = 240;                       // virtual stage size (4:3)
  const RAD = Math.PI / 180;
  // Joints: 0 hip, 1 neck, 2 head, 3 left elbow, 4 left hand, 5 right elbow, 6 right hand, 7 left knee, 8 left foot, 9 right knee, 10 right foot.
  // Figure angle a[j-1] is the absolute direction (degrees, 0 = right, 90 = down) of the bone from PAR[j] to joint j.
  const BL = [30, 10, 18, 17, 18, 17, 22, 22, 22, 22];
  const PAR = [-1, 0, 1, 1, 3, 1, 5, 0, 7, 0, 9];
  const DESC = { 1: [2, 3, 4, 5, 6], 3: [4], 5: [6], 7: [8], 9: [10] };
  const SEGS = [[0, 1], [1, 2], [1, 3], [3, 4], [1, 5], [5, 6], [0, 7], [7, 8], [0, 9], [9, 10]];
  const JN = ['hip', 'neck', 'head', 'elbow', 'hand', 'elbow', 'hand', 'knee', 'foot', 'knee', 'foot'];
  const POSE = {
    stand: [-90, -90, 115, 100, 65, 80, 100, 92, 80, 88],
    cheer: [-90, -90, -140, -115, -40, -65, 100, 92, 80, 88],
    wave: [-90, -90, 115, 100, -35, -80, 100, 92, 80, 88],
    windup: [-100, -95, 150, 125, 30, 60, 95, 90, 125, 150],
    kick: [-78, -80, 150, 120, 20, 45, 100, 92, 12, 0],
    walk1: [-88, -88, 70, 85, 115, 95, 70, 95, 112, 100],
    walk2: [-88, -88, 115, 95, 70, 85, 112, 100, 70, 95],
    tuck: [-85, -85, -150, -110, -30, -70, 20, 110, 5, 100],
    float1: [-75, -70, -160, -125, -25, 10, 60, 100, 25, 70],
    float2: [-105, -110, 170, 205, -10, -45, 120, 150, 85, 110],
    dance1: [-100, -95, -150, -100, 30, -20, 115, 80, 60, 95],
    dance2: [-80, -85, 150, 200, -30, -80, 120, 100, 65, 85],
    bow: [-25, -15, 95, 90, 80, 90, 100, 92, 80, 88],
    skate: [-80, -80, 160, 170, 20, 10, 60, 110, 115, 70],
    sit: [-90, -90, 60, 20, 60, 20, 0, 90, 5, 90]
  };
  const FIGC = ['#000000', '#c80000', '#0038c8', '#007a00', '#8000a0', '#d86000'];
  const FIGN = ['Black', 'Red', 'Blue', 'Green', 'Purple', 'Orange'];
  const PROPC = ['#e00000', '#0050e0', '#00a000', '#f4c400', '#a000c0', '#ff7f00', '#202020', '#ffffff'];
  const PROPN = ['Ball', 'Hat', 'Balloon', 'Skateboard', 'Star', 'Speech bubble'];
  const PROPC0 = [0, 0, 1, 5, 3, 7];
  const BGS = [['park', 'Park'], ['space', 'Outer Space'], ['beach', 'Beach'], ['city', 'City Street'], ['stage', 'Theater Stage'], ['sea', 'Under the Sea'], ['plain', 'Plain White']];
  const FONTS = [
    ['Comic', 'bold', '"Comic Sans MS","Chalkboard SE",cursive'],
    ['Impact', '', 'Impact,"Arial Black",sans-serif'],
    ['Arial Black', '', '"Arial Black",Arial,sans-serif'],
    ['Typewriter', 'bold', '"Courier New",Courier,monospace'],
    ['Times Italic', 'italic bold', '"Times New Roman",Times,serif'],
    ['Verdana', 'bold', 'Verdana,Tahoma,sans-serif']
  ];
  const LOOKS = ['Starfield', 'Sunset', 'Chrome', 'Blue Screen'];
  const SOUNDS = [['', '(none)'], ['boing', 'Boing'], ['whoosh', 'Whoosh'], ['cheer', 'Cheer'], ['drum', 'Drum roll'], ['laugh', 'Laugh'], ['pop', 'Pop'], ['ding', 'Ding'], ['splash', 'Splash'], ['zap', 'Zap'], ['honk', 'Honk']];
  const MAXF = 60, MAXM = 10, MAXFIG = 3, MAXPROP = 8;
  const BUBF = '8px "Comic Sans MS","Chalkboard SE",cursive';

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const norm = a => { a = ((a + 180) % 360 + 360) % 360 - 180; return a === -180 ? 180 : a; };
  const lerp = (a, b, t) => a + (b - a) * t;
  const lerpA = (a, b, t) => a + (((b - a) % 360 + 540) % 360 - 180) * t;
  function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  /* ---------- model ---------- */
  const mkFig = (id, c, x, y, pose) => ({ id, c, x, y, a: (Array.isArray(pose) ? pose : POSE[pose || 'stand']).slice() });
  const mkProp = (id, k, x, y, o = {}) => ({ id, k, x, y, s: o.s || 1, c: o.c ?? PROPC0[k], t: o.t || '' });
  const cloneFrame = fr => ({ snd: fr.snd || '', figs: fr.figs.map(g => ({ ...g, a: g.a.slice() })), props: fr.props.map(p => ({ ...p })) });
  function newMovie(user) {
    return {
      bg: 'park', fps: 8, loop: false, nid: 2,
      title: { on: true, text: 'My First Movie', sub: 'A stick figure picture', font: 0, look: 0 },
      credits: { on: true, text: `Directed by ${user}\n\nStarring\nThe Stick Figures\n\nThe End`, font: 0 },
      frames: [{ snd: '', figs: [mkFig(1, 0, 160, 161, 'stand')], props: [] }]
    };
  }
  const r0 = v => Math.round(v);
  function pack(m) {
    return {
      b: m.bg, r: m.fps, l: m.loop ? 1 : 0, i: m.nid,
      t: [m.title.on ? 1 : 0, m.title.text, m.title.sub, m.title.font, m.title.look],
      c: [m.credits.on ? 1 : 0, m.credits.text, m.credits.font],
      f: m.frames.map(fr => [fr.snd || 0,
        fr.figs.map(g => [g.id, g.c, r0(g.x), r0(g.y), ...g.a.map(r0)]),
        fr.props.map(p => { const a = [p.id, p.k, r0(p.x), r0(p.y), r0(p.s * 10), p.c]; if (p.k === 5) a.push(p.t); return a; })])
    };
  }
  function unpack(d) {
    const m = newMovie('you');
    if (!d || !Array.isArray(d.f) || !d.f.length) return m;
    if (BGS.some(b => b[0] === d.b)) m.bg = d.b;
    m.fps = clamp(+d.r || 8, 4, 12); m.loop = !!d.l;
    if (Array.isArray(d.t)) m.title = { on: !!d.t[0], text: String(d.t[1] || ''), sub: String(d.t[2] || ''), font: clamp(+d.t[3] || 0, 0, FONTS.length - 1), look: clamp(+d.t[4] || 0, 0, LOOKS.length - 1) };
    if (Array.isArray(d.c)) m.credits = { on: !!d.c[0], text: String(d.c[1] || ''), font: clamp(+d.c[2] || 0, 0, FONTS.length - 1) };
    let top = 1;
    m.frames = d.f.slice(0, MAXF).map(fr => ({
      snd: SOUNDS.some(s => s[0] === fr[0]) ? fr[0] : '',
      figs: (fr[1] || []).slice(0, MAXFIG).map(g => { top = Math.max(top, g[0]); return { id: g[0], c: clamp(g[1] | 0, 0, FIGC.length - 1), x: +g[2], y: +g[3], a: g.slice(4, 14).map(Number) }; }).filter(g => g.a.length === 10),
      props: (fr[2] || []).slice(0, MAXPROP).map(p => { top = Math.max(top, p[0]); return { id: p[0], k: clamp(p[1] | 0, 0, 5), x: +p[2], y: +p[3], s: clamp((+p[4] || 10) / 10, 0.4, 3), c: clamp(p[5] | 0, 0, PROPC.length - 1), t: String(p[6] || '') }; })
    }));
    m.nid = Math.max(+d.i || 0, top + 1);
    return m;
  }
  function joints(g) {
    const P = [[g.x, g.y]];
    for (let j = 1; j <= 10; j++) { const p = P[PAR[j]], a = g.a[j - 1] * RAD; P[j] = [p[0] + BL[j - 1] * Math.cos(a), p[1] + BL[j - 1] * Math.sin(a)]; }
    return P;
  }
  function tween(A, B, n) {
    const out = [];
    for (let k = 1; k <= n; k++) {
      const t = k / (n + 1), fr = cloneFrame(A); fr.snd = '';
      fr.figs.forEach(g => { const h = B.figs.find(x => x.id === g.id); if (!h) return; g.x = lerp(g.x, h.x, t); g.y = lerp(g.y, h.y, t); g.a = g.a.map((a, i) => norm(lerpA(a, h.a[i], t))); });
      fr.props.forEach(p => { const q = B.props.find(x => x.id === p.id); if (!q) return; p.x = lerp(p.x, q.x, t); p.y = lerp(p.y, q.y, t); p.s = lerp(p.s, q.s, t); });
      out.push(fr);
    }
    return out;
  }

  /* ---------- drawing ---------- */
  const mctx = document.createElement('canvas').getContext('2d');
  function bubbleLines(text) {
    mctx.font = BUBF;
    const words = String(text || '...').split(/\s+/).filter(Boolean), lines = [];
    let cur = '';
    words.forEach(w => { const t = cur ? cur + ' ' + w : w; if (mctx.measureText(t).width > 78 && cur) { lines.push(cur); cur = w; } else cur = t; });
    if (cur) lines.push(cur);
    const ls = lines.slice(0, 4), w = Math.max(24, ...ls.map(l => mctx.measureText(l).width)) + 12;
    return { ls, w, h: ls.length * 10 + 8 };
  }
  function propBox(p) {
    let b;
    if (p.k === 5) { const L = bubbleLines(p.t); b = [-L.w / 2, -L.h / 2, L.w / 2, L.h / 2 + 9]; }
    else b = [[-9, -9, 9, 9], [-12, -15, 12, 3], [-10, -12, 10, 34], [-19, -4, 19, 5], [-12, -12, 12, 12]][p.k];
    return [p.x + b[0] * p.s, p.y + b[1] * p.s, p.x + b[2] * p.s, p.y + b[3] * p.s];
  }
  function star(ctx, x, y, ro, ri, n = 5) {
    ctx.beginPath();
    for (let i = 0; i < n * 2; i++) { const r = i % 2 ? ri : ro, a = -Math.PI / 2 + i * Math.PI / n; ctx.lineTo(x + r * Math.cos(a), y + r * Math.sin(a)); }
    ctx.closePath();
  }
  function rrect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function ell(ctx, x, y, rx, ry, fill) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill(); }
  function grad(ctx, y0, y1, stops) { const g = ctx.createLinearGradient(0, y0, 0, y1); stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c)); return g; }
  function cloud(ctx, x, y, s) { [[0, 0, 12], [11, -5, 10], [22, 0, 11], [11, 3, 11]].forEach(([dx, dy, r]) => ell(ctx, x + dx * s, y + dy * s, r * s, r * s * 0.75, '#fff')); }
  function palm(ctx, x, y) {
    ctx.strokeStyle = '#7a4a1c'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x - 8, y - 40, x + 4, y - 80); ctx.stroke();
    ctx.fillStyle = '#1e8c2a';
    [-160, -120, -60, -20, 20, 200].forEach(a => { ctx.save(); ctx.translate(x + 4, y - 80); ctx.rotate(a * RAD); ctx.beginPath(); ctx.ellipse(18, 0, 20, 5, 0.25, 0, Math.PI * 2); ctx.fill(); ctx.restore(); });
    ell(ctx, x + 1, y - 76, 3, 3, '#6b3b10'); ell(ctx, x + 7, y - 75, 3, 3, '#6b3b10');
  }
  const BGDRAW = {
    park(ctx) {
      ctx.fillStyle = grad(ctx, 0, 190, ['#5cb4ff', '#bfe6ff']); ctx.fillRect(0, 0, VW, VH);
      ell(ctx, 272, 38, 18, 18, '#ffe23a'); ell(ctx, 272, 38, 24, 24, 'rgba(255,226,58,.25)');
      cloud(ctx, 40, 40, 1.1); cloud(ctx, 160, 26, 0.8); cloud(ctx, 205, 62, 0.6);
      ell(ctx, 70, 200, 130, 45, '#58b84a'); ell(ctx, 260, 205, 140, 40, '#4fae42');
      ctx.fillStyle = '#48a23a'; ctx.fillRect(0, 192, VW, 48);
      ctx.fillStyle = '#3f9433'; for (let x = 0; x < VW; x += 20) ctx.fillRect(x, 192, 10, 48);
      ctx.fillStyle = '#6b4020'; ctx.fillRect(34, 120, 10, 76);
      [[39, 110, 26], [22, 124, 18], [58, 124, 18], [39, 96, 18]].forEach(([x, y, r]) => ell(ctx, x, y, r, r * 0.85, '#2f8a2a'));
      [[30, 104], [50, 118], [26, 128], [44, 92]].forEach(([x, y]) => ell(ctx, x, y, 2.2, 2.2, '#e02020'));
      ctx.fillStyle = '#fff'; for (let x = 230; x < 318; x += 9) ctx.fillRect(x, 176, 4, 18);
      ctx.fillRect(228, 180, 92, 3); ctx.fillRect(228, 188, 92, 3);
      [[120, 214, '#ff5fa0'], [140, 226, '#fff45a'], [200, 218, '#ffffff'], [288, 230, '#ff5fa0']].forEach(([x, y, c]) => ell(ctx, x, y, 2.5, 2.5, c));
    },
    space(ctx) {
      ctx.fillStyle = grad(ctx, 0, VH, ['#000010', '#16003a', '#2a0050']); ctx.fillRect(0, 0, VW, VH);
      const r = rng(7);
      for (let i = 0; i < 110; i++) { ctx.fillStyle = r() < 0.2 ? '#aee' : '#fff'; const s = r() < 0.1 ? 2 : 1; ctx.fillRect(r() * VW | 0, r() * 200 | 0, s, s); }
      ell(ctx, 250, 62, 26, 26, '#e0892e'); ctx.fillStyle = 'rgba(120,40,0,.35)'; ctx.fillRect(224, 56, 52, 4); ctx.fillRect(226, 68, 48, 5);
      ctx.strokeStyle = '#f5d28a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(250, 62, 44, 9, -0.3, 0, Math.PI * 2); ctx.stroke();
      ell(ctx, 60, 50, 10, 10, '#9ad0ff'); ell(ctx, 57, 47, 3, 3, '#dff');
      ctx.fillStyle = '#9a9aa8'; ctx.beginPath(); ctx.moveTo(0, 205); for (let x = 0; x <= VW; x += 20) ctx.lineTo(x, 200 + Math.sin(x * 0.05) * 4); ctx.lineTo(VW, VH); ctx.lineTo(0, VH); ctx.fill();
      [[40, 220, 14], [150, 228, 9], [230, 216, 18], [300, 232, 8]].forEach(([x, y, w]) => { ell(ctx, x, y, w, w * 0.3, '#78788a'); ell(ctx, x, y - 1, w * 0.8, w * 0.2, '#666676'); });
      ctx.fillStyle = '#ddd'; ctx.fillRect(286, 170, 2, 34); ctx.fillStyle = '#e00'; ctx.fillRect(288, 170, 16, 10); ctx.fillStyle = '#fff'; ctx.fillRect(288, 174, 16, 2);
    },
    beach(ctx) {
      ctx.fillStyle = grad(ctx, 0, 130, ['#3aaef0', '#bfeaff']); ctx.fillRect(0, 0, VW, VH);
      ell(ctx, 70, 48, 20, 20, '#fff27a'); cloud(ctx, 170, 34, 0.9);
      ctx.fillStyle = grad(ctx, 128, 178, ['#1a78c8', '#29a6d8']); ctx.fillRect(0, 128, VW, 50);
      ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 1.5;
      for (let y = 140; y < 176; y += 12) { ctx.beginPath(); for (let x = (y % 24); x < VW; x += 24) { ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 5, y - 3, x + 10, y); } ctx.stroke(); }
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(210, 128); ctx.lineTo(222, 104); ctx.lineTo(224, 128); ctx.fill(); ctx.fillStyle = '#c33'; ctx.fillRect(206, 128, 22, 4);
      ctx.fillStyle = '#f2d48a'; ctx.beginPath(); ctx.moveTo(0, 178); ctx.quadraticCurveTo(160, 170, VW, 180); ctx.lineTo(VW, VH); ctx.lineTo(0, VH); ctx.fill();
      ctx.fillStyle = '#e4c070'; const r = rng(3); for (let i = 0; i < 40; i++) ctx.fillRect(r() * VW | 0, 186 + r() * 54 | 0, 2, 1);
      palm(ctx, 288, 206);
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(30, 150); ctx.lineTo(70, 150); ctx.lineTo(50, 120); ctx.fill();
      ctx.fillStyle = '#e24'; ctx.beginPath(); ctx.moveTo(18, 200); ctx.quadraticCurveTo(40, 170, 62, 200); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillRect(39, 190, 2, 30);
    },
    city(ctx) {
      ctx.fillStyle = grad(ctx, 0, 190, ['#3b2a7a', '#b0508a', '#ffa25a']); ctx.fillRect(0, 0, VW, VH);
      ell(ctx, 240, 150, 26, 26, '#ffd070');
      const r = rng(11);
      [[0, 90, 34], [36, 60, 30], [68, 110, 40], [110, 40, 26], [138, 84, 44], [184, 70, 30], [216, 116, 36], [254, 50, 28], [284, 96, 36]].forEach(([x, y, w], i) => {
        ctx.fillStyle = i % 2 ? '#2a2248' : '#1e1a38'; ctx.fillRect(x, y, w, 200 - y);
        for (let wy = y + 6; wy < 188; wy += 10) for (let wx = x + 4; wx < x + w - 5; wx += 8) { ctx.fillStyle = r() < 0.55 ? '#ffe070' : '#3a3260'; ctx.fillRect(wx, wy, 4, 5); }
      });
      ctx.fillStyle = '#9a9aa0'; ctx.fillRect(0, 196, VW, 10); ctx.fillStyle = '#7a7a80'; for (let x = 0; x < VW; x += 16) ctx.fillRect(x, 196, 1, 10);
      ctx.fillStyle = '#3c3c44'; ctx.fillRect(0, 206, VW, 34);
      ctx.fillStyle = '#f0d020'; for (let x = 4; x < VW; x += 28) ctx.fillRect(x, 222, 14, 2);
      ctx.fillStyle = '#333'; ctx.fillRect(40, 150, 3, 46); ctx.fillRect(40, 150, 12, 3); ell(ctx, 52, 154, 4, 3, '#ffec9a');
    },
    stage(ctx) {
      ctx.fillStyle = '#2a0a12'; ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = 'rgba(255,240,170,.16)'; ctx.beginPath(); ctx.moveTo(140, 0); ctx.lineTo(180, 0); ctx.lineTo(250, 205); ctx.lineTo(70, 205); ctx.fill();
      ctx.fillStyle = grad(ctx, 190, VH, ['#c07a3c', '#8a4e22']); ctx.fillRect(0, 192, VW, 48);
      ctx.fillStyle = '#6e3c18'; for (let y = 198; y < VH; y += 9) ctx.fillRect(0, y, VW, 1);
      ell(ctx, 160, 206, 90, 8, 'rgba(255,240,170,.25)');
      const curtain = (x0, dir) => { for (let i = 0; i < 6; i++) { const x = x0 + dir * i * 9; ctx.fillStyle = i % 2 ? '#a0101c' : '#c8202c'; ctx.fillRect(Math.min(x, x + dir * 9), 0, 9, 196 - (5 - i) * 4); } };
      curtain(0, 1); curtain(VW - 9, -1);
      ctx.fillStyle = '#b0141e'; ctx.fillRect(0, 0, VW, 22); ctx.fillStyle = '#e8b828';
      for (let x = 0; x < VW; x += 16) { ctx.beginPath(); ctx.arc(x + 8, 22, 8, 0, Math.PI); ctx.fillStyle = '#b0141e'; ctx.fill(); ctx.fillStyle = '#e8b828'; ctx.fillRect(x + 7, 28, 2, 4); }
      ctx.fillStyle = '#e8b828'; ctx.fillRect(0, 20, VW, 2);
      ctx.fillStyle = '#111'; for (let x = 0; x < VW; x += 22) ell(ctx, x + 11, 244, 11, 12, '#111');
    },
    sea(ctx) {
      ctx.fillStyle = grad(ctx, 0, VH, ['#46c4f0', '#1a6fb8', '#0a3a7a']); ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = 'rgba(255,255,255,.08)'; [[40, 20], [120, 40], [220, 30]].forEach(([x, w]) => { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + w, 0); ctx.lineTo(x + w + 50, 200); ctx.lineTo(x + 30, 200); ctx.fill(); });
      ctx.fillStyle = '#e2c98c'; ctx.beginPath(); ctx.moveTo(0, 204); ctx.quadraticCurveTo(160, 196, VW, 206); ctx.lineTo(VW, VH); ctx.lineTo(0, VH); ctx.fill();
      ell(ctx, 270, 204, 28, 14, '#6b6a7a'); ell(ctx, 262, 198, 14, 8, '#7d7c8c');
      ctx.lineWidth = 4; ctx.lineCap = 'round';
      [[20, '#1e9a4a'], [34, '#2cb85a'], [300, '#1e9a4a'], [236, '#2cb85a']].forEach(([x, c]) => { ctx.strokeStyle = c; ctx.beginPath(); ctx.moveTo(x, 210); for (let y = 200; y > 130; y -= 10) ctx.quadraticCurveTo(x + ((y / 10) % 2 ? 8 : -8), y + 5, x, y); ctx.stroke(); });
      const fish = (x, y, c, d) => { ell(ctx, x, y, 10, 6, c); ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x - 8 * d, y); ctx.lineTo(x - 16 * d, y - 6); ctx.lineTo(x - 16 * d, y + 6); ctx.fill(); ell(ctx, x + 5 * d, y - 1, 1.6, 1.6, '#000'); };
      fish(90, 60, '#ff9020', 1); fish(250, 100, '#ffe020', -1); fish(200, 40, '#ff60b0', 1);
      ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1; [[60, 120, 3], [64, 106, 2], [58, 94, 2.5], [180, 150, 3], [184, 136, 2]].forEach(([x, y, r]) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke(); });
      ctx.fillStyle = '#f07050'; star(ctx, 140, 222, 7, 3); ctx.fill();
    },
    plain(ctx) {
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = '#eef2ff'; for (let x = 0; x < VW; x += 16) ctx.fillRect(x, 0, 1, VH); for (let y = 0; y < VH; y += 16) ctx.fillRect(0, y, VW, 1);
      ctx.fillStyle = '#bbb'; ctx.fillRect(0, 205, VW, 1);
    }
  };
  const bgCache = new Map();
  function bgImage(bg, w, h) {
    const key = bg + ':' + w + 'x' + h;
    let c = bgCache.get(key);
    if (!c) {
      if (bgCache.size > 24) bgCache.clear();
      c = document.createElement('canvas'); c.width = w; c.height = h;
      const x = c.getContext('2d'); x.scale(w / VW, h / VH); (BGDRAW[bg] || BGDRAW.plain)(x);
      bgCache.set(key, c);
    }
    return c;
  }
  function drawFig(ctx, g) {
    const P = joints(g);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    [['rgba(255,255,255,.6)', 5.4], [FIGC[g.c], 3.2]].forEach(([col, lw]) => {
      ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath();
      SEGS.forEach(([a, b]) => { ctx.moveTo(P[a][0], P[a][1]); ctx.lineTo(P[b][0], P[b][1]); });
      ctx.stroke();
      ctx.beginPath(); ctx.arc(P[2][0], P[2][1], 7.5, 0, Math.PI * 2); ctx.stroke();
    });
    ctx.fillStyle = FIGC[g.c]; ctx.beginPath(); ctx.arc(P[2][0], P[2][1], 7.5, 0, Math.PI * 2); ctx.fill();
    return P;
  }
  function drawProp(ctx, p) {
    const c = PROPC[p.c];
    ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.s, p.s);
    ctx.lineWidth = 0.9; ctx.strokeStyle = '#000'; ctx.lineCap = 'round';
    if (p.k === 0) {
      ell(ctx, 0, 0, 8.5, 8.5, c); ctx.stroke();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(-9, 0, 9, -0.9, 0.9); ctx.stroke(); ctx.beginPath(); ctx.arc(9, 0, 9, Math.PI - 0.9, Math.PI + 0.9); ctx.stroke();
      ell(ctx, -3, -4, 2, 1.4, 'rgba(255,255,255,.8)');
    } else if (p.k === 1) {
      ell(ctx, 0, 0, 12, 3, '#1a1a1a'); ctx.fillStyle = '#1a1a1a'; ctx.fillRect(-7, -15, 14, 15);
      ctx.fillStyle = c === '#202020' ? '#e00000' : c; ctx.fillRect(-7, -5, 14, 3.5);
      ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(-5, -14, 2, 8);
    } else if (p.k === 2) {
      ctx.strokeStyle = '#555'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(0, 11); ctx.bezierCurveTo(5, 18, -5, 26, 0, 34); ctx.stroke();
      ell(ctx, 0, 0, 9, 11, c); ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.stroke();
      ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(0, 10); ctx.lineTo(-2.5, 13); ctx.lineTo(2.5, 13); ctx.fill();
      ell(ctx, -3.5, -4.5, 2, 3, 'rgba(255,255,255,.7)');
    } else if (p.k === 3) {
      ctx.fillStyle = c; rrect(ctx, -18, -4, 36, 4, 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#888'; ctx.fillRect(-13, 0, 6, 1.5); ctx.fillRect(7, 0, 6, 1.5);
      ell(ctx, -10, 2.8, 2.6, 2.6, '#222'); ell(ctx, 10, 2.8, 2.6, 2.6, '#222');
    } else if (p.k === 4) {
      star(ctx, 0, 0, 11.5, 4.8); ctx.fillStyle = c; ctx.fill(); ctx.strokeStyle = '#6a4a00'; ctx.stroke();
      ell(ctx, -2, -3, 1.6, 1.6, 'rgba(255,255,255,.8)');
    } else {
      const L = bubbleLines(p.t);
      ctx.fillStyle = c; ctx.beginPath();
      ctx.moveTo(-L.w / 2 + 8, L.h / 2 - 1); ctx.lineTo(-L.w / 2 + 3, L.h / 2 + 9); ctx.lineTo(-L.w / 2 + 16, L.h / 2 - 1); ctx.fill(); ctx.stroke();
      rrect(ctx, -L.w / 2, -L.h / 2, L.w, L.h, 6); ctx.fill(); ctx.stroke();
      ctx.fillRect(-L.w / 2 + 8.5, L.h / 2 - 2, 7, 2);
      ctx.fillStyle = (c === '#202020' || c === '#0050e0' || c === '#a000c0') ? '#fff' : '#000';
      ctx.font = BUBF; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      L.ls.forEach((l, i) => ctx.fillText(l, 0, -L.h / 2 + 9 + i * 10));
    }
    ctx.restore();
  }
  function drawFrame(ctx, m, fr, w, h, o = {}) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(bgImage(m.bg, w, h), 0, 0);
    ctx.setTransform(w / VW, 0, 0, h / VH, 0, 0);
    if (o.onion) { ctx.globalAlpha = 0.28; o.onion.figs.forEach(g => drawFig(ctx, g)); o.onion.props.forEach(p => drawProp(ctx, p)); ctx.globalAlpha = 1; }
    fr.figs.forEach(g => drawFig(ctx, g));
    fr.props.forEach(p => drawProp(ctx, p));
  }
  const fontCss = (i, px) => { const f = FONTS[i] || FONTS[0]; return `${f[1]} ${px}px ${f[2]}`.trim(); };
  function lookBg(ctx, look, p) {
    if (look === 1) { ctx.fillStyle = grad(ctx, 0, VH, ['#ffcf5a', '#ff5e62', '#5b2a86']); ctx.fillRect(0, 0, VW, VH); ell(ctx, 160, 200, 60, 60, 'rgba(255,240,150,.35)'); }
    else if (look === 2) {
      ctx.fillStyle = grad(ctx, 0, VH, ['#f4f6fa', '#a8b0c0', '#e8ecf4', '#7a8298']); ctx.fillRect(0, 0, VW, VH);
      const x = -120 + p * 560; ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 40, 0); ctx.lineTo(x - 40, VH); ctx.lineTo(x - 80, VH); ctx.fill();
    } else if (look === 3) {
      ctx.fillStyle = '#0000a8'; ctx.fillRect(0, 0, VW, VH); ctx.fillStyle = 'rgba(0,0,0,.22)'; for (let y = 0; y < VH; y += 3) ctx.fillRect(0, y, VW, 1);
    } else {
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, VW, VH); const r = rng(5);
      for (let i = 0; i < 90; i++) { const x = r() * VW, y = r() * VH, tw = 0.5 + 0.5 * Math.sin(p * 20 + i); ctx.fillStyle = `rgba(255,255,255,${0.3 + tw * 0.7})`; ctx.fillRect(x | 0, y | 0, 1, 1); }
    }
  }
  function fitFont(ctx, text, font, px, max) { let s = px; ctx.font = fontCss(font, s); while (s > 8 && ctx.measureText(text).width > max) { s--; ctx.font = fontCss(font, s); } return s; }
  function drawTitle(ctx, m, p, w, h) {
    ctx.setTransform(w / VW, 0, 0, h / VH, 0, 0);
    const T = m.title, look = T.look;
    lookBg(ctx, look, p);
    ctx.save(); ctx.globalAlpha = clamp(Math.min(p * 5, (1 - p) * 6), 0, 1);
    const z = 0.86 + 0.14 * Math.min(1, p * 3); ctx.translate(160, 112); ctx.scale(z, z);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const text = T.text || 'Untitled', s = fitFont(ctx, text, T.font, 32, 280);
    ctx.lineJoin = 'round';
    if (look === 0) { const g = ctx.createLinearGradient(0, -s / 2, 0, s / 2); g.addColorStop(0, '#fff6a0'); g.addColorStop(0.5, '#ffc000'); g.addColorStop(1, '#ff6000'); ctx.strokeStyle = '#602000'; ctx.lineWidth = 3; ctx.strokeText(text, 0, 0); ctx.fillStyle = g; }
    else if (look === 1) { ctx.fillStyle = 'rgba(60,0,60,.6)'; ctx.fillText(text, 2, 2); ctx.fillStyle = '#fff'; }
    else if (look === 2) { const g = ctx.createLinearGradient(0, -s / 2, 0, s / 2); g.addColorStop(0, '#2a4ab8'); g.addColorStop(0.5, '#0a1a60'); g.addColorStop(0.55, '#6a8ae8'); g.addColorStop(1, '#0a246a'); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.strokeText(text, 0, 0); ctx.fillStyle = g; }
    else { ctx.fillStyle = '#fff'; }
    ctx.fillText(text, 0, 0);
    if (T.sub) { fitFont(ctx, T.sub, T.font, 12, 280); ctx.fillStyle = look === 2 ? '#0a246a' : look === 0 ? '#9ad0ff' : '#fff'; ctx.fillText(T.sub, 0, s / 2 + 16); }
    ctx.restore();
    if (look !== 3) { ctx.fillStyle = look === 2 ? '#fff' : '#fffbd0'; for (let i = 0; i < 4; i++) { const a = p * 6 + i * 1.7, k = 0.5 + 0.5 * Math.sin(a * 2); star(ctx, 40 + i * 80 + Math.sin(a) * 10, 60 + (i % 2) * 110, 5 * k + 1, 1.2, 4); ctx.fill(); } }
    else { ctx.fillStyle = '#fff'; ctx.font = '10px "Courier New",monospace'; ctx.textAlign = 'left'; ctx.fillText('PLAY >', 14, 20); }
  }
  function creditsDur(m) { return 2.2 + m.credits.text.split('\n').length * 0.45; }
  function drawCredits(ctx, m, p, w, h) {
    ctx.setTransform(w / VW, 0, 0, h / VH, 0, 0);
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, VW, VH);
    const lines = m.credits.text.split('\n'), lh = 18, total = lines.length * lh;
    const y0 = VH + 8 - p * (VH + total + 16);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    lines.forEach((l, i) => { const y = y0 + i * lh; if (y < -20 || y > VH + 20) return; fitFont(ctx, l, m.credits.font, i === 0 ? 15 : 13, 290); ctx.fillStyle = i === 0 ? '#ffd040' : '#fff'; ctx.fillText(l, 160, y); });
    ctx.fillStyle = 'rgba(0,0,0,1)'; const gt = ctx.createLinearGradient(0, 0, 0, 30); gt.addColorStop(0, '#000'); gt.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = gt; ctx.fillRect(0, 0, VW, 30);
  }

  /* ---------- sound effects ---------- */
  function playSnd(api, id) {
    const { tone, noise } = api;
    const S = {
      boing() { tone(95, 0.55, { type: 'triangle', to: 380, vol: 0.12, decay: 1 }); [0, 1, 2, 3].forEach(i => tone(260 - i * 30, 0.08, { at: 0.12 + i * 0.08, type: 'sine', to: 380 - i * 40, vol: 0.06 - i * 0.012, decay: 1 })); },
      whoosh() { noise(0.6, { ft: 'bandpass', f: 500, q: 0.8, vol: 0.12, attack: 0.28, release: 0.3 }); noise(0.45, { ft: 'bandpass', f: 1600, q: 1.2, vol: 0.06, at: 0.1, attack: 0.2, release: 0.22 }); },
      cheer() {
        noise(1.4, { ft: 'bandpass', f: 1500, q: 0.6, vol: 0.1, attack: 0.15, release: 0.8 });
        for (let i = 0; i < 16; i++) noise(0.03, { ft: 'highpass', f: 1800, vol: 0.12, decay: 1, at: Math.random() * 1.1 });
        [0, 0.08, 0.15].forEach((at, i) => tone(420 + i * 90, 0.5, { at, type: 'sawtooth', to: 620 + i * 100, vol: 0.025 }));
      },
      drum() { for (let i = 0; i < 22; i++) noise(0.05, { at: i * 0.045, ft: 'bandpass', f: 260, q: 1.1, vol: 0.12 - (21 - i) * 0.003, decay: 1 }); noise(0.9, { at: 1.02, ft: 'highpass', f: 5000, vol: 0.1, decay: 1 }); tone(80, 0.35, { at: 1.0, type: 'sine', vol: 0.12, decay: 1 }); },
      laugh() { for (let i = 0; i < 5; i++) { tone(440 - i * 24, 0.11, { at: i * 0.15, type: 'sawtooth', to: 380 - i * 24, vol: 0.045 }); noise(0.1, { at: i * 0.15, f: 1300, q: 1, vol: 0.04 }); } },
      pop() { tone(760, 0.09, { type: 'sine', to: 170, vol: 0.12, decay: 1 }); noise(0.03, { f: 3000, vol: 0.08, decay: 1 }); },
      ding() { api.sfx.ding(); },
      splash() { noise(0.8, { ft: 'lowpass', f: 1500, vol: 0.12, decay: 1 }); for (let i = 0; i < 6; i++) tone(1100 + Math.random() * 900, 0.06, { at: 0.15 + i * 0.07, type: 'sine', to: 2200, vol: 0.04, decay: 1 }); },
      zap() { tone(1500, 0.32, { type: 'sawtooth', to: 110, vol: 0.06, decay: 1 }); tone(1520, 0.32, { type: 'square', to: 100, vol: 0.03, decay: 1 }); },
      honk() { tone(233, 0.35, { type: 'square', vol: 0.06 }); tone(236, 0.35, { type: 'sawtooth', vol: 0.05 }); tone(233, 0.2, { at: 0.42, type: 'square', vol: 0.06 }); }
    };
    if (S[id]) S[id]();
  }

  /* ---------- example movies (built from key poses + tweens) ---------- */
  function build(opts, keys) {
    const m = newMovie('you');
    Object.assign(m, { bg: opts.bg, fps: opts.fps, loop: false, nid: 20 });
    m.title = { on: true, text: opts.title, sub: opts.sub, font: opts.font, look: opts.look };
    m.credits = { on: true, text: opts.credits, font: opts.font };
    m.frames = [];
    keys.forEach(([fr, n], i) => { m.frames.push(fr); const nx = keys[i + 1]; if (nx && n) m.frames.push(...tween(fr, nx[0], n)); });
    return m;
  }
  const K = (snd, figs, props = []) => ({ snd, figs, props });
  const EXAMPLES = [
    ['Kick Off!', () => build({ bg: 'park', fps: 8, title: 'Kick Off!', sub: 'A short film about a big kick', font: 0, look: 1, credits: 'Kick Off!\n\nKicker ..... Stick Sam\nBall ..... Itself\n\nFilmed in the Park\n\nThe End' }, [
      [K('', [mkFig(1, 2, 60, 161, 'stand')], [mkProp(2, 0, 150, 196)]), 3],
      [K('', [mkFig(1, 2, 100, 161, 'walk1')], [mkProp(2, 0, 150, 196)]), 2],
      [K('', [mkFig(1, 2, 118, 158, 'windup')], [mkProp(2, 0, 150, 196)]), 1],
      [K('boing', [mkFig(1, 2, 124, 163, 'kick')], [mkProp(2, 0, 152, 194)]), 0],
      [K('whoosh', [mkFig(1, 2, 124, 163, 'kick')], [mkProp(2, 0, 190, 140)]), 1],
      [K('', [mkFig(1, 2, 126, 161, 'stand')], [mkProp(2, 0, 250, 70)]), 1],
      [K('', [mkFig(1, 2, 126, 161, 'wave')], [mkProp(2, 0, 300, 20)]), 0],
      [K('cheer', [mkFig(1, 2, 126, 150, 'cheer')], [mkProp(3, 5, 170, 90, { t: 'What a kick!' })]), 0],
      [K('', [mkFig(1, 2, 126, 161, 'cheer')], [mkProp(3, 5, 170, 90, { t: 'What a kick!' })]), 0],
      [K('', [mkFig(1, 2, 126, 150, 'cheer')], [mkProp(3, 5, 170, 90, { t: 'What a kick!' })]), 0]
    ])],
    ['Star Hopper', () => build({ bg: 'space', fps: 6, title: 'STAR HOPPER', sub: 'Lost in space... and loving it', font: 1, look: 0, credits: 'STAR HOPPER\n\nSpace Walker ..... Astro Al\nStar ..... A real star\n\nNo planets were harmed\n\nThe End' }, [
      [K('', [mkFig(1, 1, 40, 161, 'stand')], [mkProp(2, 4, 250, 140)]), 1],
      [K('zap', [mkFig(1, 1, 50, 150, 'tuck')], [mkProp(2, 4, 250, 140)]), 2],
      [K('whoosh', [mkFig(1, 1, 110, 100, 'float1')], [mkProp(2, 4, 250, 130)]), 3],
      [K('', [mkFig(1, 1, 190, 80, 'float2')], [mkProp(2, 4, 250, 110)]), 2],
      [K('ding', [mkFig(1, 1, 235, 110, 'cheer')], [mkProp(2, 4, 235, 55, { s: 1.3 })]), 2],
      [K('', [mkFig(1, 1, 235, 110, 'float1')], [mkProp(2, 4, 235, 55, { s: 1.6 }), mkProp(3, 5, 150, 60, { t: 'I caught a star!' })]), 0],
      [K('laugh', [mkFig(1, 1, 235, 104, 'cheer')], [mkProp(2, 4, 235, 55, { s: 1.6 }), mkProp(3, 5, 150, 60, { t: 'I caught a star!' })]), 0]
    ])],
    ['The Big Show', () => build({ bg: 'stage', fps: 6, title: 'The Big Show', sub: 'Live on stage, one night only', font: 4, look: 2, credits: 'The Big Show\n\nDancer ..... Dot\nDancer ..... Dash\nDrums ..... The Band\n\nThank you, good night!\n\nThe End' }, [
      [K('drum', [mkFig(1, 4, 110, 161, 'stand'), mkFig(2, 3, 210, 161, 'stand')], [mkProp(3, 1, 210, 111)]), 0],
      [K('', [mkFig(1, 4, 110, 161, 'stand'), mkFig(2, 3, 210, 161, 'stand')], [mkProp(3, 1, 210, 111)]), 0],
      [K('ding', [mkFig(1, 4, 110, 161, 'dance1'), mkFig(2, 3, 210, 161, 'dance2')], [mkProp(3, 1, 210, 111)]), 1],
      [K('', [mkFig(1, 4, 112, 158, 'dance2'), mkFig(2, 3, 208, 158, 'dance1')], [mkProp(3, 1, 209, 108)]), 1],
      [K('ding', [mkFig(1, 4, 110, 161, 'dance1'), mkFig(2, 3, 210, 161, 'dance2')], [mkProp(3, 1, 210, 111)]), 1],
      [K('', [mkFig(1, 4, 112, 158, 'dance2'), mkFig(2, 3, 208, 158, 'dance1')], [mkProp(3, 1, 209, 108)]), 1],
      [K('', [mkFig(1, 4, 110, 161, 'stand'), mkFig(2, 3, 210, 161, 'stand')], [mkProp(3, 1, 210, 111)]), 2],
      [K('cheer', [mkFig(1, 4, 110, 161, 'bow'), mkFig(2, 3, 210, 161, 'bow')], [mkProp(3, 1, 238, 150), mkProp(4, 5, 160, 60, { t: 'Thank you!' })]), 0],
      [K('', [mkFig(1, 4, 110, 161, 'bow'), mkFig(2, 3, 210, 161, 'bow')], [mkProp(3, 1, 238, 150), mkProp(4, 5, 160, 60, { t: 'Thank you!' })]), 0]
    ])],
    ['Skate City', () => build({ bg: 'city', fps: 8, title: 'SKATE CITY', sub: 'Big air after school', font: 2, look: 3, credits: 'SKATE CITY\n\nSkater ..... Kat\n\nStunts performed by\na trained stick figure\n\nThe End' }, [
      [K('', [mkFig(1, 5, 30, 150, 'skate')], [mkProp(2, 3, 32, 196)]), 3],
      [K('whoosh', [mkFig(1, 5, 110, 150, 'skate')], [mkProp(2, 3, 112, 196)]), 1],
      [K('pop', [mkFig(1, 5, 140, 144, 'tuck')], [mkProp(2, 3, 142, 184)]), 1],
      [K('', [mkFig(1, 5, 170, 100, 'tuck')], [mkProp(2, 3, 172, 146)]), 1],
      [K('', [mkFig(1, 5, 200, 140, 'tuck')], [mkProp(2, 3, 202, 184)]), 0],
      [K('boing', [mkFig(1, 5, 215, 150, 'skate')], [mkProp(2, 3, 217, 196)]), 2],
      [K('cheer', [mkFig(1, 5, 280, 150, 'cheer')], [mkProp(2, 3, 282, 196), mkProp(3, 5, 220, 90, { t: 'Radical!' })]), 0],
      [K('', [mkFig(1, 5, 280, 150, 'cheer')], [mkProp(2, 3, 282, 196), mkProp(3, 5, 220, 90, { t: 'Radical!' })]), 0]
    ])]
  ];

  /* ---------- icons ---------- */
  const svg = (w, body) => `<svg viewBox="0 0 16 16" width="${w}" height="${w}" shape-rendering="crispEdges" aria-hidden="true">${body}</svg>`;
  const IC = {
    add: svg(16, '<rect x="2" y="3" width="10" height="10" fill="#fff" stroke="#000"/><rect x="10" y="6" width="5" height="4" fill="#0a0"/><rect x="11" y="4" width="3" height="8" fill="#0a0"/>'),
    tween: svg(16, '<rect x="1" y="4" width="4" height="8" fill="#fff" stroke="#000"/><rect x="11" y="4" width="4" height="8" fill="#fff" stroke="#000"/><rect x="6" y="6" width="1" height="4" fill="#06c"/><rect x="8" y="6" width="1" height="4" fill="#06c"/><rect x="10" y="7" width="1" height="2" fill="#06c"/>'),
    play: svg(16, '<path d="M4 2h2v1h2v1h2v1h2v1h1v4h-1v1h-2v1h-2v1h-2v1h-2z" fill="#080"/>'),
    stop: svg(16, '<rect x="3" y="3" width="10" height="10" fill="#c00"/>'),
    fig: svg(18, '<g fill="none" stroke="#000" stroke-width="1.6" shape-rendering="auto"><circle cx="8" cy="3.5" r="2.2" fill="#000"/><path d="M8 6v5M8 7l-4 3M8 7l4 3M8 11l-3 4M8 11l3 4"/></g>'),
    ball: svg(18, '<g shape-rendering="auto"><circle cx="8" cy="8" r="6" fill="#e00" stroke="#000"/><path d="M3 5q4 3 0 6M13 5q-4 3 0 6" stroke="#fff" fill="none"/></g>'),
    hat: svg(18, '<rect x="5" y="3" width="6" height="8" fill="#111"/><rect x="5" y="8" width="6" height="2" fill="#e00"/><rect x="2" y="11" width="12" height="2" fill="#111"/>'),
    balloon: svg(18, '<g shape-rendering="auto"><ellipse cx="8" cy="6" rx="4.5" ry="5.3" fill="#05e" stroke="#000" stroke-width=".6"/><path d="M8 11.5q2 2 0 4" stroke="#555" fill="none"/></g>'),
    skate: svg(18, '<rect x="1" y="8" width="14" height="2" fill="#f70" stroke="#000" stroke-width=".5"/><rect x="3" y="11" width="2" height="2" fill="#222"/><rect x="11" y="11" width="2" height="2" fill="#222"/>'),
    star: svg(18, '<path shape-rendering="auto" d="M8 1l2 4.6 5 .5-3.8 3.3 1.1 5L8 11.8 3.7 14.4l1.1-5L1 6.1l5-.5z" fill="#fc0" stroke="#850" stroke-width=".7"/>'),
    bubble: svg(18, '<g shape-rendering="auto"><rect x="1" y="2" width="14" height="9" rx="3" fill="#fff" stroke="#000"/><path d="M4 11l-1 4 4-4" fill="#fff" stroke="#000"/><path d="M4 6h8M4 8h5" stroke="#000" stroke-width=".8"/></g>'),
    titles: svg(16, '<rect x="1" y="2" width="14" height="12" fill="#000"/><rect x="3" y="5" width="10" height="2" fill="#fc0"/><rect x="5" y="9" width="6" height="1" fill="#fff"/>')
  };
  const PICON = ['ball', 'hat', 'balloon', 'skate', 'star', 'bubble'];

  const APP_ICON = '<svg viewBox="0 0 32 32" shape-rendering="crispEdges" aria-hidden="true"><rect x="2" y="7" width="28" height="20" fill="#222" stroke="#000"/><g fill="#eee"><rect x="3" y="8" width="2" height="2"/><rect x="3" y="24" width="2" height="2"/><rect x="27" y="8" width="2" height="2"/><rect x="27" y="24" width="2" height="2"/><rect x="3" y="12" width="2" height="2"/><rect x="3" y="20" width="2" height="2"/><rect x="27" y="12" width="2" height="2"/><rect x="27" y="20" width="2" height="2"/></g><rect x="7" y="9" width="18" height="16" fill="#8fd0ff"/><rect x="7" y="21" width="18" height="4" fill="#4a4"/><rect x="15" y="10" width="3" height="3" fill="#000"/><rect x="16" y="13" width="1" height="5" fill="#000"/><rect x="13" y="14" width="2" height="1" fill="#000"/><rect x="18" y="14" width="2" height="1" fill="#000"/><rect x="12" y="15" width="1" height="1" fill="#000"/><rect x="20" y="13" width="1" height="1" fill="#000"/><rect x="15" y="18" width="1" height="3" fill="#000"/><rect x="17" y="18" width="1" height="3" fill="#000"/><rect x="21" y="18" width="3" height="3" fill="#e00"/><rect x="0" y="2" width="12" height="4" fill="#fc0" stroke="#000"/><rect x="2" y="3" width="2" height="2" fill="#000"/><rect x="6" y="3" width="2" height="2" fill="#000"/></svg>';

  (window.RETRO_APPS = window.RETRO_APPS || []).push({
    id: 'moviemaker',
    label: 'Movie Maker',
    help: 'Make your own stick-figure cartoons frame by frame, with backgrounds, props, sound effects, titles and credits.',
    kind: 'builtin',
    eras: ['2000'],
    cat: 'acc',
    icon: APP_ICON,
    window: { w: 780, h: 580 },
    css: `
      .mvm{display:flex;flex-direction:column;height:100%;min-height:340px;gap:3px;padding:2px;box-sizing:border-box;user-select:none;-webkit-user-select:none;position:relative}
      .mvm button{font:inherit}
      .mvm .mvm-b{min-width:0;padding:3px 8px;display:inline-flex;align-items:center;gap:4px;white-space:nowrap}
      .mvm .mvm-b.down{padding:4px 7px 2px 9px}
      .mvm .mvm-b svg{flex:none}
      .mvm-tb{display:flex;flex-wrap:wrap;align-items:center;gap:4px;padding:3px 4px;background:linear-gradient(180deg,#f4f3ee,#d4d0c8);border:1px solid #fff;border-right-color:#808080;border-bottom-color:#808080;flex:none}
      .mvm-sep{width:2px;align-self:stretch;border-left:1px solid #808080;border-right:1px solid #fff;margin:0 2px}
      .mvm-spd{display:inline-flex;align-items:center;gap:4px;white-space:nowrap}
      .mvm-spd input{width:80px;margin:0}
      .mvm-ck{display:inline-flex;align-items:center;gap:3px;white-space:nowrap;cursor:pointer}
      .mvm-ck input{margin:0}
      .mvm-main{flex:1;min-height:0;display:flex;gap:4px}
      .mvm-side{flex:none;width:118px;display:flex;flex-direction:column;gap:3px;overflow:auto}
      .mvm-cap{background:linear-gradient(90deg,#0a246a,#a6caf0);color:#fff;font-weight:700;padding:2px 5px;font-size:11px}
      .mvm-cast{display:grid;grid-template-columns:1fr 1fr;gap:3px}
      .mvm-cast .mvm-b{justify-content:center;padding:3px 2px;height:30px}
      .mvm-cast .mvm-fig{grid-column:1/3}
      .mvm-side select{width:100%;font:inherit}
      .mvm-sw{flex:1;min-width:0;min-height:0;display:flex;align-items:center;justify-content:center;background:#3a3a3a;position:relative;overflow:hidden}
      .mvm-cv{display:block;touch-action:none;background:#fff;cursor:crosshair;box-shadow:0 0 0 1px #000}
      .mvm-cv.grab{cursor:grabbing}
      .mvm-badge{position:absolute;left:6px;top:5px;background:rgba(0,0,0,.6);color:#fff;font:bold 11px var(--ui);padding:1px 6px;pointer-events:none}
      .mvm-rec{position:absolute;right:6px;top:5px;color:#fff;background:#b00;font:bold 11px var(--ui);padding:1px 6px;pointer-events:none;display:none}
      .mvm.playing .mvm-rec{display:block}
      .mvm-sel{flex:none;display:flex;flex-wrap:wrap;align-items:center;gap:4px;min-height:26px;padding:1px 2px}
      .mvm-sel .mvm-hint{color:#333;font-size:11px;flex:1;min-width:150px}
      .mvm-sel b{margin-right:2px}
      .mvm-sw2{display:inline-block;width:10px;height:10px;border:1px solid #000;vertical-align:-1px;margin-right:3px}
      .mvm-tl{flex:none;display:flex;flex-direction:column;gap:2px}
      .mvm-tlh{display:flex;flex-wrap:wrap;align-items:center;gap:4px}
      .mvm-fno{font-weight:700;min-width:92px}
      .mvm-tlh select{font:inherit}
      .mvm-strip{display:flex;gap:6px;overflow-x:auto;overflow-y:hidden;padding:11px 6px;background:#1c1c1c repeating-linear-gradient(90deg,#1c1c1c 0 6px,#e8e8e0 6px 11px,#1c1c1c 11px 18px) 0 3px/100% 5px no-repeat;position:relative;height:78px;box-sizing:border-box}
      .mvm-strip::after{content:"";position:absolute;left:0;right:0;bottom:3px;height:5px;background:repeating-linear-gradient(90deg,#1c1c1c 0 6px,#e8e8e0 6px 11px,#1c1c1c 11px 18px)}
      .mvm-th{flex:none;position:relative;border:2px solid #555;background:#000;padding:0;cursor:pointer;line-height:0}
      .mvm-th canvas{width:64px;height:48px;display:block}
      .mvm-th.cur{border-color:#ffd000;box-shadow:0 0 0 1px #000}
      .mvm-th i{position:absolute;left:0;top:0;background:rgba(0,0,0,.65);color:#fff;font:bold 9px/1 var(--ui);padding:1px 3px;font-style:normal}
      .mvm-th u{position:absolute;right:0;bottom:0;background:#ffd000;color:#000;font:bold 8px/1 var(--ui);padding:1px 2px;text-decoration:none}
      .mvm-ov{position:absolute;inset:0;background:rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;z-index:5;padding:8px}
      .mvm-ov[hidden]{display:none}
      .mvm-dlg{background:#d4d0c8;max-width:440px;width:100%;max-height:100%;display:flex;flex-direction:column;box-sizing:border-box}
      .mvm-dt{background:linear-gradient(90deg,#0a246a,#a6caf0);color:#fff;font-weight:700;padding:3px 6px;flex:none}
      .mvm-dc{padding:8px;overflow:auto;display:flex;flex-direction:column;gap:6px}
      .mvm-dc label{display:flex;flex-direction:column;gap:2px}
      .mvm-dc input[type=text],.mvm-dc textarea,.mvm-dc select{font:inherit;padding:2px 3px;box-sizing:border-box;width:100%}
      .mvm-dc textarea{height:84px;resize:none}
      .mvm-row2{display:flex;gap:6px}
      .mvm-row2>*{flex:1;min-width:0}
      .mvm-db{display:flex;justify-content:flex-end;gap:6px;flex-wrap:wrap;padding:0 8px 8px}
      .mvm-list{background:#fff;max-height:220px;overflow:auto}
      .mvm-li{display:flex;align-items:center;gap:4px;padding:3px 4px;border-bottom:1px solid #ddd}
      .mvm-li span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .mvm-li small{color:#666}
      .mvm-li .mvm-b{padding:2px 6px}
      .mvm-help{line-height:1.45}
      .mvm-help p{margin:0 0 6px}
      .mvm-tws{display:flex;gap:6px;flex-wrap:wrap}
      .mvm-tws .btn{min-width:44px}
      .mvm.narrow .mvm-main{flex-direction:column}
      .mvm.narrow .mvm-side{width:auto;flex-direction:row;flex-wrap:wrap;overflow:visible;align-items:stretch;order:2}
      .mvm.narrow .mvm-cap{display:none}
      .mvm.narrow .mvm-cast{display:flex;gap:3px;flex-wrap:wrap}
      .mvm.narrow .mvm-cast .mvm-b{height:40px;min-width:40px;padding:2px 6px}
      .mvm.narrow .mvm-cast .mvm-fig span{display:none}
      .mvm.narrow .mvm-side select{width:auto;flex:1;height:36px}
      .mvm.narrow .mvm-side>.mvm-b{height:36px}
      .mvm.narrow .mvm-tb .mvm-b{height:36px}
      .mvm.narrow .mvm-sel .mvm-b,.mvm.narrow .mvm-tlh .mvm-b{height:34px}
      .mvm.narrow .mvm-tlh select{height:32px}
      .mvm.narrow .mvm-spd input{width:70px}
      .mvm.narrow .mvm-lbl{display:none}
      .mvm.narrow .mvm-sep{display:none}
    `,
    open(W, api) {
      const $ = s => W.body.querySelector(s);
      const coarseMQ = window.matchMedia && matchMedia('(pointer: coarse)').matches;
      let coarse = coarseMQ;
      let movie, cur = 0, name = null, sel = null, drag = null, dirty = false;
      let onion = true, playing = null, undoStack = [], saveT = 0, thumbT = 0;

      W.body.innerHTML = `<div class="mvm">
        <div class="mvm-tb">
          <button class="btn mvm-b" data-a="add" title="Add the next frame (a copy of this one)">${IC.add}<span>Add frame</span></button>
          <button class="btn mvm-b" data-a="tween" title="Make in-between frames up to the next frame">${IC.tween}<span>Tween</span></button>
          <button class="btn mvm-b mvm-play" data-a="play">${IC.play}<span>Play</span></button>
          <span class="mvm-sep"></span>
          <label class="mvm-spd"><span class="mvm-lbl">Speed</span><input type="range" min="4" max="12" step="1" class="mvm-fpsr" aria-label="Frames per second"><b class="mvm-fps">8 fps</b></label>
          <label class="mvm-ck"><input type="checkbox" class="mvm-onion">Onion</label>
          <label class="mvm-ck"><input type="checkbox" class="mvm-loop">Loop</label>
        </div>
        <div class="mvm-main">
          <div class="mvm-side">
            <div class="mvm-cap">Cast</div>
            <div class="mvm-cast">
              <button class="btn mvm-b mvm-fig" data-add="fig" title="Add a stick figure">${IC.fig}<span>Stick figure</span></button>
              ${PROPN.map((n, k) => `<button class="btn mvm-b" data-add="${k}" title="Add a ${n.toLowerCase()}" aria-label="Add ${n}">${IC[PICON[k]]}</button>`).join('')}
            </div>
            <div class="mvm-cap">Scene</div>
            <select class="mvm-bg" aria-label="Background">${BGS.map(b => `<option value="${b[0]}">${b[1]}</option>`).join('')}</select>
            <button class="btn mvm-b" data-a="titles">${IC.titles}<span>Titles</span></button>
          </div>
          <div class="mvm-sw sunken"><canvas class="mvm-cv"></canvas><span class="mvm-badge"></span><span class="mvm-rec">PLAYING</span></div>
        </div>
        <div class="mvm-sel"></div>
        <div class="mvm-tl">
          <div class="mvm-tlh">
            <span class="mvm-fno"></span>
            <label class="mvm-ck"><span class="mvm-lbl">Sound:</span><select class="mvm-snd" aria-label="Sound effect for this frame">${SOUNDS.map(s => `<option value="${s[0]}">${s[1]}</option>`).join('')}</select></label>
            <button class="btn mvm-b" data-a="dup">Duplicate</button>
            <button class="btn mvm-b" data-a="del">Delete frame</button>
          </div>
          <div class="mvm-strip sunken"></div>
        </div>
        <div class="mvm-ov" hidden></div>
      </div>`;
      const root = $('.mvm'), cv = $('.mvm-cv'), ctx = cv.getContext('2d'), sw = $('.mvm-sw'), strip = $('.mvm-strip'), ov = $('.mvm-ov');
      const selBar = $('.mvm-sel'), badge = $('.mvm-badge');

      const frame = () => movie.frames[cur];
      function setTitle() { api.setTitle(`Movie Maker - ${name || 'Untitled'}${dirty ? ' *' : ''}`); }
      function touch() {
        dirty = true; setTitle();
        clearTimeout(saveT); saveT = setTimeout(saveDraft, 700);
      }
      function saveDraft() { clearTimeout(saveT); try { api.save('draft', { n: name, m: pack(movie), at: cur, d: dirty ? 1 : 0 }); } catch (e) { /* storage full */ } }
      function pushUndo() { undoStack.push({ m: JSON.stringify(pack(movie)), cur }); if (undoStack.length > 30) undoStack.shift(); }
      function undo() {
        if (playing) return;
        const u = undoStack.pop(); if (!u) { api.sfx.beep(); return; }
        movie = unpack(JSON.parse(u.m)); cur = Math.min(u.cur, movie.frames.length - 1); sel = null;
        syncControls(); renderStrip(); draw(); renderSel(); touch();
      }

      /* ----- stage sizing & drawing ----- */
      let cw = 320, ch = 240;
      function layout() {
        root.classList.toggle('narrow', W.body.clientWidth < 560);
        const aw = sw.clientWidth - 6, ah = sw.clientHeight - 6;
        let w = Math.max(120, Math.min(aw, ah * 4 / 3)); w = Math.floor(w); const h = Math.floor(w * 3 / 4);
        cv.style.width = w + 'px'; cv.style.height = h + 'px';
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        cw = Math.round(w * dpr); ch = Math.round(h * dpr);
        if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; }
        draw();
      }
      function draw() {
        if (playing) return;
        const fr = frame();
        drawFrame(ctx, movie, fr, cw, ch, { onion: onion && cur > 0 ? movie.frames[cur - 1] : null });
        // joint handles
        const pxu = cv.getBoundingClientRect().width / VW || 1;
        const r = (coarse ? 6.5 : 4.5) / pxu;
        const order = fr.figs.slice().sort((a, b) => (sel && sel.t === 'fig' && sel.id === a.id ? 1 : 0) - (sel && sel.t === 'fig' && sel.id === b.id ? 1 : 0));
        order.forEach(g => {
          const P = joints(g), on = sel && sel.t === 'fig' && sel.id === g.id;
          ctx.globalAlpha = on ? 1 : 0.55; ctx.lineWidth = 1 / pxu; ctx.strokeStyle = '#000';
          P.forEach((p, j) => {
            ctx.beginPath(); ctx.arc(p[0], p[1], j === 0 ? r * 1.25 : r, 0, Math.PI * 2);
            ctx.fillStyle = j === 0 ? '#ff2020' : j === 1 ? '#ffe000' : '#ffffff'; ctx.fill(); ctx.stroke();
            if (j > 1 && on) { ctx.beginPath(); ctx.arc(p[0], p[1], r * 0.4, 0, Math.PI * 2); ctx.fillStyle = '#ff8800'; ctx.fill(); }
          });
        });
        ctx.globalAlpha = 1;
        if (sel && sel.t === 'prop') {
          const p = fr.props.find(q => q.id === sel.id);
          if (p) { const b = propBox(p); ctx.setLineDash([3 / pxu, 2 / pxu]); ctx.strokeStyle = '#000'; ctx.lineWidth = 1 / pxu; ctx.strokeRect(b[0] - 2, b[1] - 2, b[2] - b[0] + 4, b[3] - b[1] + 4); ctx.strokeStyle = '#fff'; ctx.lineDashOffset = 2.5 / pxu; ctx.strokeRect(b[0] - 2, b[1] - 2, b[2] - b[0] + 4, b[3] - b[1] + 4); ctx.setLineDash([]); ctx.lineDashOffset = 0; }
        }
        badge.textContent = `Frame ${cur + 1}/${movie.frames.length}`;
        queueThumb();
      }

      /* ----- timeline ----- */
      function thumbDraw(c, i) {
        const x = c.getContext('2d');
        drawFrame(x, movie, movie.frames[i], c.width, c.height);
      }
      function renderStrip() {
        strip.innerHTML = '';
        movie.frames.forEach((fr, i) => {
          const b = document.createElement('button'); b.className = 'mvm-th' + (i === cur ? ' cur' : ''); b.dataset.i = i;
          b.setAttribute('aria-label', 'Frame ' + (i + 1));
          const c = document.createElement('canvas'); c.width = 96; c.height = 72; b.appendChild(c);
          b.insertAdjacentHTML('beforeend', `<i>${i + 1}</i>${fr.snd ? '<u>SND</u>' : ''}`);
          strip.appendChild(b); thumbDraw(c, i);
        });
        syncFrameUI();
      }
      function queueThumb() {
        if (thumbT) return;
        thumbT = requestAnimationFrame(() => {
          thumbT = 0;
          const b = strip.children[cur]; if (!b) return;
          thumbDraw(b.querySelector('canvas'), cur);
          const fr = frame(), u = b.querySelector('u');
          if (fr.snd && !u) b.insertAdjacentHTML('beforeend', '<u>SND</u>'); else if (!fr.snd && u) u.remove();
        });
      }
      function syncFrameUI() {
        [...strip.children].forEach((b, i) => b.classList.toggle('cur', i === cur));
        const b = strip.children[cur];
        if (b) { const L = b.offsetLeft, R = L + b.offsetWidth; if (L < strip.scrollLeft) strip.scrollLeft = L - 8; else if (R > strip.scrollLeft + strip.clientWidth) strip.scrollLeft = R - strip.clientWidth + 8; }
        $('.mvm-fno').textContent = `Frame ${cur + 1} of ${movie.frames.length}`;
        $('.mvm-snd').value = frame().snd || '';
      }
      function go(i, silent) {
        if (playing) return;
        cur = clamp(i, 0, movie.frames.length - 1);
        if (sel && !findSel()) sel = null;
        syncFrameUI(); draw(); renderSel();
        if (!silent) api.sfx.click();
      }
      function syncControls() {
        $('.mvm-fpsr').value = movie.fps; $('.mvm-fps').textContent = movie.fps + ' fps';
        $('.mvm-loop').checked = movie.loop; $('.mvm-onion').checked = onion;
        $('.mvm-bg').value = movie.bg;
      }

      /* ----- frame operations ----- */
      function addFrame(blank) {
        if (playing) return;
        if (movie.frames.length >= MAXF) { api.msgBox('Movie Maker', `A movie can have up to ${MAXF} frames. Delete some frames to make room.`, ['OK'], 'warn'); return; }
        pushUndo();
        const fr = blank ? { snd: '', figs: [], props: [] } : cloneFrame(frame()); fr.snd = '';
        movie.frames.splice(cur + 1, 0, fr); cur++;
        renderStrip(); draw(); renderSel(); touch(); api.sfx.blip(880);
      }
      function delFrame() {
        if (playing) return;
        if (movie.frames.length < 2) { api.msgBox('Movie Maker', 'A movie needs at least one frame.', ['OK'], 'info'); return; }
        pushUndo(); movie.frames.splice(cur, 1); cur = Math.min(cur, movie.frames.length - 1);
        if (sel && !findSel()) sel = null;
        renderStrip(); draw(); renderSel(); touch(); api.sfx.blip(330);
      }
      function doTween(n) {
        const A = movie.frames[cur], B = movie.frames[cur + 1];
        if (!B) return;
        n = Math.min(n, MAXF - movie.frames.length);
        if (n < 1) { api.msgBox('Movie Maker', `A movie can have up to ${MAXF} frames.`, ['OK'], 'warn'); return; }
        pushUndo();
        movie.frames.splice(cur + 1, 0, ...tween(A, B, n));
        renderStrip(); draw(); touch(); api.sfx.blip(1200);
        status(`Added ${n} in-between frame${n > 1 ? 's' : ''}. Press Play to see it move!`);
      }
      function tweenDlg() {
        if (playing) return;
        if (cur >= movie.frames.length - 1) { api.msgBox('Tween', 'Tween fills in the frames between this frame and the next one.\n\nPick the first of two frames (not the last frame), then choose Tween.', ['OK'], 'info'); return; }
        dialog('Tween: make in-between frames', `<p style="margin:0">Movie Maker will draw the in-between poses from frame ${cur + 1} to frame ${cur + 2} for you. How many new frames?</p>
          <div class="mvm-tws">${[1, 2, 3, 4, 6].map(n => `<button class="btn" data-n="${n}">${n}</button>`).join('')}</div>
          <p style="margin:0;color:#444">More frames = smoother and slower movement.</p>`, ['Cancel'], d => {
          d.querySelectorAll('[data-n]').forEach(b => b.onclick = () => { closeDlg(); doTween(+b.dataset.n); });
        });
      }

      /* ----- cast ----- */
      function addFig() {
        if (playing) return;
        const fr = frame();
        if (fr.figs.length >= MAXFIG) { api.msgBox('Movie Maker', `There's room for ${MAXFIG} stick figures in a scene.`, ['OK'], 'info'); return; }
        pushUndo();
        const used = fr.figs.map(g => g.c), c = [0, 1, 2, 3, 4, 5].find(i => !used.includes(i)) ?? 0;
        const xs = [160, 80, 240, 120, 200], x = xs.find(x => !fr.figs.some(g => Math.abs(g.x - x) < 30)) ?? 160;
        const id = movie.nid++;
        for (let i = cur; i < movie.frames.length; i++) if (movie.frames[i].figs.length < MAXFIG) movie.frames[i].figs.push(mkFig(id, c, x, 161, 'stand'));
        sel = { t: 'fig', id }; draw(); renderSel(); touch(); api.sfx.blip(660);
        if (cur < movie.frames.length - 1) renderStrip();
      }
      function addProp(k, text) {
        if (playing) return;
        const fr = frame();
        if (fr.props.length >= MAXPROP) { api.msgBox('Movie Maker', `There's room for ${MAXPROP} props in a scene.`, ['OK'], 'info'); return; }
        pushUndo();
        const id = movie.nid++, n = fr.props.length;
        const pos = [[160, 120], [150, 190], [100, 80], [160, 199], [250, 60], [200, 50]][k];
        const p = mkProp(id, k, clamp(pos[0] + (n % 3) * 14 - 14, 20, 300), pos[1], { t: text });
        for (let i = cur; i < movie.frames.length; i++) if (movie.frames[i].props.length < MAXPROP) movie.frames[i].props.push({ ...p });
        sel = { t: 'prop', id }; draw(); renderSel(); touch(); api.sfx.blip(760);
        if (cur < movie.frames.length - 1) renderStrip();
      }
      function findSel() {
        if (!sel) return null;
        const fr = frame();
        return sel.t === 'fig' ? fr.figs.find(g => g.id === sel.id) : fr.props.find(p => p.id === sel.id);
      }
      function removeSel() {
        const it = findSel(); if (!it || playing) return;
        pushUndo();
        const key = sel.t === 'fig' ? 'figs' : 'props';
        let n = 0;
        for (let i = cur; i < movie.frames.length; i++) { const a = movie.frames[i][key], j = a.findIndex(x => x.id === sel.id); if (j >= 0) { a.splice(j, 1); n++; } }
        sel = null; draw(); renderSel(); touch(); renderStrip(); api.sfx.blip(300);
        status(n > 1 ? `Removed from frame ${cur + 1} to the end.` : 'Removed from this frame.');
      }
      function editSel(fn, allFrames) {
        const it = findSel(); if (!it || playing) return;
        pushUndo();
        if (allFrames) movie.frames.forEach(fr => { const x = (sel.t === 'fig' ? fr.figs : fr.props).find(q => q.id === sel.id); if (x) fn(x); });
        else fn(it);
        draw(); renderSel(); touch(); if (allFrames) renderStrip();
      }
      let statusMsg = '', statusT = 0;
      function status(t) { statusMsg = t; clearTimeout(statusT); statusT = setTimeout(() => { statusMsg = ''; renderSel(); }, 3500); renderSel(); }
      function renderSel() {
        const it = findSel();
        if (!it) {
          sel = null;
          selBar.innerHTML = `<span class="mvm-hint">${api.esc(statusMsg || (frame().figs.length ? `Drag the white dots to pose a figure. Drag the red hip dot (or a limb) to move it. Tap a prop to pick it.` : 'Add a stick figure or a prop from the Cast.'))}</span>`;
          return;
        }
        if (sel.t === 'fig') {
          selBar.innerHTML = `<b><span class="mvm-sw2" style="background:${FIGC[it.c]}"></span>${FIGN[it.c]} figure</b>
            <button class="btn mvm-b" data-s="color">Color</button><button class="btn mvm-b" data-s="flip">Flip</button><button class="btn mvm-b" data-s="pose">Stand up</button><button class="btn mvm-b" data-s="rm">Remove</button>
            <span class="mvm-hint">${api.esc(statusMsg)}</span>`;
        } else {
          selBar.innerHTML = `<b><span class="mvm-sw2" style="background:${PROPC[it.c]}"></span>${PROPN[it.k]}</b>
            <button class="btn mvm-b" data-s="color">Color</button><button class="btn mvm-b" data-s="small" aria-label="Smaller">Smaller</button><button class="btn mvm-b" data-s="big" aria-label="Bigger">Bigger</button>${it.k === 5 ? '<button class="btn mvm-b" data-s="text">Text...</button>' : ''}<button class="btn mvm-b" data-s="rm">Remove</button>
            <span class="mvm-hint">${api.esc(statusMsg)}</span>`;
        }
      }
      selBar.addEventListener('click', e => {
        const b = e.target.closest('[data-s]'); if (!b) return;
        const s = b.dataset.s; api.sfx.click();
        if (s === 'rm') removeSel();
        else if (s === 'color') editSel(x => { x.c = (x.c + 1) % (sel.t === 'fig' ? FIGC.length : PROPC.length); }, true);
        else if (s === 'flip') editSel(g => { g.a = g.a.map(a => norm(180 - a)); });
        else if (s === 'pose') editSel(g => { g.a = POSE.stand.slice(); });
        else if (s === 'small') editSel(p => { p.s = Math.max(0.5, +(p.s - 0.25).toFixed(2)); });
        else if (s === 'big') editSel(p => { p.s = Math.min(2.5, +(p.s + 0.25).toFixed(2)); });
        else if (s === 'text') { const it = findSel(); askText('Speech bubble', 'What does it say?', it.t, 40, t => { if (t) editSel(p => { p.t = t; }, true); }); }
      });

      /* ----- pointer editing ----- */
      function toV(e) { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * VW, (e.clientY - r.top) / r.height * VH]; }
      function hitTest(pt) {
        const fr = frame(), pxu = cv.getBoundingClientRect().width / VW || 1, hr = (coarse ? 18 : 10) / pxu;
        const figs = fr.figs.slice().reverse().sort((a, b) => (sel && sel.id === b.id ? 1 : 0) - (sel && sel.id === a.id ? 1 : 0));
        let best = null;
        figs.forEach(g => { joints(g).forEach((p, j) => { const d = Math.hypot(p[0] - pt[0], p[1] - pt[1]) - (j === 0 ? 1.5 / pxu : 0); if (d < hr && (!best || d < best.d - 0.01)) best = { t: 'fig', id: g.id, j, d }; }); });
        if (best) return best;
        for (let i = fr.props.length - 1; i >= 0; i--) { const p = fr.props[i], b = propBox(p); if (pt[0] >= b[0] - 3 && pt[0] <= b[2] + 3 && pt[1] >= b[1] - 3 && pt[1] <= b[3] + 3) return { t: 'prop', id: p.id }; }
        for (const g of figs) {
          const P = joints(g);
          if (Math.hypot(P[2][0] - pt[0], P[2][1] - pt[1]) < 9) return { t: 'fig', id: g.id, j: 2 };
          for (const [a, b] of SEGS) { if (segDist(pt, P[a], P[b]) < Math.max(5, hr * 0.5)) return { t: 'fig', id: g.id, j: 0 }; }
        }
        return null;
      }
      function segDist(p, a, b) { const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy || 1, t = clamp(((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L, 0, 1); return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy); }
      cv.addEventListener('pointerdown', e => {
        if (playing) { stop(); return; }
        const was = coarse; coarse = e.pointerType === 'touch' || (e.pointerType === 'pen' && coarseMQ);
        const pt = toV(e), hit = hitTest(pt);
        if (!hit) { const had = !!sel; sel = null; if (had || was !== coarse) { draw(); } renderSel(); return; }
        e.preventDefault();
        try { cv.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
        sel = { t: hit.t, id: hit.id };
        const it = findSel();
        drag = { pid: e.pointerId, hit, pushed: false, dx: pt[0] - it.x, dy: pt[1] - it.y, sx: pt[0], sy: pt[1] };
        cv.classList.add('grab');
        draw(); renderSel();
      });
      cv.addEventListener('pointermove', e => {
        if (!drag || e.pointerId !== drag.pid) return;
        const pt = toV(e), it = findSel(); if (!it) return;
        if (!drag.pushed) { if (Math.hypot(pt[0] - drag.sx, pt[1] - drag.sy) < 0.8) return; pushUndo(); drag.pushed = true; }
        if (drag.hit.t === 'prop' || drag.hit.j === 0) {
          it.x = clamp(pt[0] - drag.dx, -10, VW + 10); it.y = clamp(pt[1] - drag.dy, -10, VH + 10);
        } else {
          const j = drag.hit.j, P = joints(it), par = P[PAR[j]];
          const ang = Math.atan2(pt[1] - par[1], pt[0] - par[0]) / RAD, delta = ang - it.a[j - 1];
          it.a[j - 1] = norm(ang); (DESC[j] || []).forEach(d => { it.a[d - 1] = norm(it.a[d - 1] + delta); });
        }
        draw();
      });
      const endDrag = e => {
        if (!drag || e.pointerId !== drag.pid) return;
        cv.classList.remove('grab');
        if (drag.pushed) touch();
        drag = null; draw();
      };
      cv.addEventListener('pointerup', endDrag);
      cv.addEventListener('pointercancel', endDrag);
      cv.addEventListener('lostpointercapture', endDrag);

      /* ----- playback ----- */
      let raf = 0;
      function play() {
        if (playing) { stop(); return; }
        sel = null; renderSel();
        const seq = [];
        if (movie.title.on && (movie.title.text || movie.title.sub)) seq.push({ k: 'title', d: 2.4 });
        seq.push({ k: 'frames' });
        if (movie.credits.on && movie.credits.text.trim()) seq.push({ k: 'credits', d: creditsDur(movie) });
        playing = { seq, si: 0, t0: performance.now(), fi: -1, home: cur };
        root.classList.add('playing');
        const pb = $('.mvm-play'); pb.innerHTML = `${IC.stop}<span>Stop</span>`; pb.classList.add('down');
        raf = requestAnimationFrame(tick);
      }
      function tick(now) {
        const P = playing; if (!P) return;
        const st = P.seq[P.si], el = (now - P.t0) / 1000;
        if (!st) { stop(); return; }
        if (st.k === 'frames') {
          const n = movie.frames.length, fi = Math.floor(el * movie.fps);
          if (fi >= n && !movie.loop) { P.si++; P.t0 = now; P.fi = -1; raf = requestAnimationFrame(tick); return; }
          const i = fi % n;
          if (fi !== P.fi) {
            P.fi = fi;
            drawFrame(ctx, movie, movie.frames[i], cw, ch);
            if (movie.frames[i].snd) playSnd(api, movie.frames[i].snd);
            badge.textContent = `Frame ${i + 1}/${n}`;
            [...strip.children].forEach((b, k) => b.classList.toggle('cur', k === i));
          }
        } else {
          const p = Math.min(1, el / st.d);
          if (st.k === 'title') drawTitle(ctx, movie, p, cw, ch); else drawCredits(ctx, movie, p, cw, ch);
          badge.textContent = st.k === 'title' ? 'Title' : 'Credits';
          if (p >= 1) { P.si++; P.t0 = now; }
        }
        raf = requestAnimationFrame(tick);
      }
      function stop() {
        if (!playing) return;
        cancelAnimationFrame(raf); raf = 0;
        cur = Math.min(playing.home, movie.frames.length - 1); playing = null;
        root.classList.remove('playing');
        const pb = $('.mvm-play'); pb.innerHTML = `${IC.play}<span>Play</span>`; pb.classList.remove('down');
        syncFrameUI(); draw(); renderSel();
      }

      /* ----- overlays ----- */
      let dlgKey = null;
      function dialog(title, html, buttons, init, onBtn) {
        ov.innerHTML = `<div class="mvm-dlg raised" role="dialog" aria-label="${api.esc(title)}"><div class="mvm-dt">${api.esc(title)}</div><div class="mvm-dc">${html}</div><div class="mvm-db">${buttons.map(b => `<button class="btn" data-b="${api.esc(b)}">${api.esc(b)}</button>`).join('')}</div></div>`;
        ov.hidden = false;
        ov.querySelectorAll('[data-b]').forEach(b => b.onclick = () => { api.sfx.click(); const r = onBtn ? onBtn(b.dataset.b, ov) : undefined; if (r !== false) closeDlg(); });
        dlgKey = e => { if (e.key === 'Escape') { e.preventDefault(); onBtn && onBtn('Cancel', ov); closeDlg(); } else if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') { const f = ov.querySelector('[data-b]'); if (f && buttons[0] !== 'Cancel' && buttons[0] !== 'Close') { e.preventDefault(); f.click(); } } };
        init && init(ov);
        const first = ov.querySelector('input,textarea,select,button'); first && setTimeout(() => { first.focus(); first.select && first.select(); }, 30);
      }
      function closeDlg() { ov.hidden = true; ov.innerHTML = ''; dlgKey = null; }
      function askText(title, label, val, max, cb) {
        dialog(title, `<label>${api.esc(label)}<input type="text" maxlength="${max}" value="${api.esc(val || '')}"></label>`, ['OK', 'Cancel'], null, (b, d) => {
          cb(b === 'OK' ? d.querySelector('input').value.trim() : null);
        });
      }
      function titlesDlg() {
        if (playing) return;
        const T = movie.title, C = movie.credits;
        const fontOpts = v => FONTS.map((f, i) => `<option value="${i}"${i === v ? ' selected' : ''}>${f[0]}</option>`).join('');
        dialog('Title Card and Credits', `
          <label class="mvm-ck" style="flex-direction:row"><input type="checkbox" class="mvm-ton"${T.on ? ' checked' : ''}> Show a title card at the start</label>
          <label>Title<input type="text" class="mvm-tt" maxlength="28" value="${api.esc(T.text)}"></label>
          <label>Tagline<input type="text" class="mvm-ts" maxlength="40" value="${api.esc(T.sub)}"></label>
          <div class="mvm-row2"><label>Font<select class="mvm-tf">${fontOpts(T.font)}</select></label><label>Look<select class="mvm-tlk">${LOOKS.map((l, i) => `<option value="${i}"${i === T.look ? ' selected' : ''}>${l}</option>`).join('')}</select></label></div>
          <label class="mvm-ck" style="flex-direction:row"><input type="checkbox" class="mvm-con"${C.on ? ' checked' : ''}> Roll credits at the end</label>
          <label>Credits (one name per line)<textarea class="mvm-ct" maxlength="240">${api.esc(C.text)}</textarea></label>
          <label>Credits font<select class="mvm-cf">${fontOpts(C.font)}</select></label>`, ['OK', 'Cancel'], null, (b, d) => {
          if (b !== 'OK') return;
          pushUndo();
          movie.title = { on: d.querySelector('.mvm-ton').checked, text: d.querySelector('.mvm-tt').value.trim(), sub: d.querySelector('.mvm-ts').value.trim(), font: +d.querySelector('.mvm-tf').value, look: +d.querySelector('.mvm-tlk').value };
          movie.credits = { on: d.querySelector('.mvm-con').checked, text: d.querySelector('.mvm-ct').value.split('\n').slice(0, 12).join('\n').slice(0, 240), font: +d.querySelector('.mvm-cf').value };
          touch(); status('Titles saved. Press Play to see them.');
        });
      }
      function helpDlg() {
        dialog('How to use Movie Maker', `<div class="mvm-help">
          <p><b>1. Set the scene.</b> Pick a background under Scene. Add stick figures (up to 3) and props from the Cast.</p>
          <p><b>2. Pose.</b> Drag the white dots to bend heads, arms and legs. Drag the red hip dot (or a limb) to move the whole figure. Drag props to move them.</p>
          <p><b>3. Animate.</b> Press <b>Add frame</b> to copy this frame, then change the pose a little. Onion skin shows the last frame faintly so you can line things up.</p>
          <p><b>4. Tween.</b> Make two very different frames next to each other, pick the first one and press <b>Tween</b>. Movie Maker draws the in-between frames.</p>
          <p><b>5. Sound.</b> Pick a sound effect for any frame. It plays when that frame appears.</p>
          <p><b>6. Titles.</b> Add a title card and rolling credits, then press <b>Play</b>. Save your movie from the File menu.</p>
          <p><b>Keys:</b> Left/Right = change frame, Space = play/stop, N = add frame, Delete = remove the picked item, Ctrl+Z = undo.</p>
          <p>Stuck? Open an example movie (File, Example Movies) and see how it was made.</p></div>`, ['Close']);
      }

      /* ----- files ----- */
      const listMovies = () => { const l = api.load('movies', []); return Array.isArray(l) ? l : []; };
      function confirmLose() {
        if (!dirty) return Promise.resolve(true);
        return api.msgBox('Movie Maker', `Save changes to "${name || 'Untitled'}"?`, ['Save', "Don't Save", 'Cancel'], 'warn').then(r => {
          if (r === 'Save') return new Promise(res => save(false, ok => res(ok)));
          return r === "Don't Save";
        });
      }
      function load(m, n, at = 0) {
        stop(); movie = m; name = n; cur = clamp(at, 0, movie.frames.length - 1); sel = null; undoStack = []; dirty = false;
        syncControls(); renderStrip(); layout(); renderSel(); setTitle(); saveDraft();
      }
      function newFile() { confirmLose().then(ok => { if (!ok) return; load(newMovie(api.user), null); status('New movie. Add frames and start animating!'); }); }
      function save(as, done) {
        stop();
        const finish = n => {
          const list = listMovies(), i = list.findIndex(x => x.n.toLowerCase() === n.toLowerCase());
          const entry = { n, d: Date.now(), m: pack(movie) };
          if (i >= 0) {
            if (as && n !== name) {
              api.msgBox('Save As', `"${list[i].n}" already exists. Replace it?`, ['Yes', 'No'], 'warn').then(r => { if (r === 'Yes') { list[i] = entry; commit(list, n); done && done(true); } else done && done(false); });
              return;
            }
            list[i] = entry;
          } else {
            if (list.length >= MAXM) { api.msgBox('Movie Maker', `You can keep ${MAXM} movies. Open File > Open and delete one to make room.`, ['OK'], 'warn'); done && done(false); return; }
            list.push(entry);
          }
          commit(list, n); done && done(true);
        };
        if (!as && name && listMovies().some(x => x.n === name)) { finish(name); return; }
        askText('Save Movie', 'Movie name:', name || movie.title.text || 'My Movie', 24, t => { if (t) finish(t); else done && done(false); });
      }
      function commit(list, n) {
        try { api.save('movies', list); } catch (e) { api.msgBox('Movie Maker', 'The disk is full. Delete an old movie and try again.', ['OK'], 'stop'); return; }
        name = n; dirty = false; setTitle(); saveDraft(); api.sfx.floppy ? api.sfx.floppy() : api.sfx.ding();
        status(`Saved "${n}" (${movie.frames.length} frames).`);
        if (movie.frames.length >= 5) api.stamp('movie-make');
        api.task('movie-save', { frames: movie.frames.length });
      }
      function openDlg(examplesFirst) {
        stop();
        const list = listMovies().slice().sort((a, b) => b.d - a.d);
        const rows = list.length ? list.map(x => `<div class="mvm-li"><span>${api.esc(x.n)} <small>${(x.m.f || []).length} frames, ${new Date(x.d).toLocaleDateString()}</small></span>
            <button class="btn mvm-b" data-o="${api.esc(x.n)}">Open</button><button class="btn mvm-b" data-r="${api.esc(x.n)}">Rename</button><button class="btn mvm-b" data-x="${api.esc(x.n)}">Delete</button></div>`).join('')
          : '<div class="mvm-li"><span><small>No saved movies yet. Use File &gt; Save.</small></span></div>';
        const ex = EXAMPLES.map((e, i) => `<div class="mvm-li"><span>${api.esc(e[0])} <small>example</small></span><button class="btn mvm-b" data-e="${i}">Open</button></div>`).join('');
        const mine = `<b>My Movies (${list.length} of ${MAXM})</b><div class="mvm-list sunken">${rows}</div>`, exs = `<b>Example Movies</b><div class="mvm-list sunken">${ex}</div>`;
        dialog(examplesFirst ? 'Example Movies' : 'Open Movie', examplesFirst ? exs + mine : mine + exs, ['Close'], d => {
          d.querySelectorAll('[data-o]').forEach(b => b.onclick = () => { const x = listMovies().find(y => y.n === b.dataset.o); closeDlg(); if (x) confirmLose().then(ok => { if (ok) { load(unpack(x.m), x.n); status(`Opened "${x.n}".`); api.sfx.ding(); } }); });
          d.querySelectorAll('[data-e]').forEach(b => b.onclick = () => { const e = EXAMPLES[+b.dataset.e]; closeDlg(); confirmLose().then(ok => { if (ok) { load(e[1](), null); name = null; setTitle(); status(`Example "${e[0]}" loaded. Press Play, then look at each frame.`); } }); });
          d.querySelectorAll('[data-r]').forEach(b => b.onclick = () => {
            const old = b.dataset.r;
            askText('Rename Movie', 'New name:', old, 24, t => {
              if (!t || t === old) { setTimeout(() => openDlg(), 0); return; }
              const l = listMovies();
              if (l.some(y => y.n.toLowerCase() === t.toLowerCase() && y.n !== old)) { api.msgBox('Rename', `There's already a movie called "${t}".`, ['OK'], 'warn'); return; }
              const y = l.find(z => z.n === old); if (y) y.n = t; api.save('movies', l);
              if (name === old) { name = t; setTitle(); }
              setTimeout(() => openDlg(), 0);
            });
          });
          d.querySelectorAll('[data-x]').forEach(b => b.onclick = () => {
            const n = b.dataset.x;
            api.msgBox('Delete Movie', `Delete "${n}"? This can't be undone.`, ['Delete', 'Cancel'], 'warn').then(r => {
              if (r !== 'Delete') return;
              api.save('movies', listMovies().filter(y => y.n !== n));
              if (name === n) { name = null; dirty = true; setTitle(); }
              openDlg();
            });
          });
        });
      }

      /* ----- menus ----- */
      api.menubar([
        { label: 'File', items: [
          { label: 'New Movie', fn: newFile },
          { label: 'Open...', fn: () => openDlg(false) },
          { label: 'Save', fn: () => save(false) },
          { label: 'Save As...', fn: () => save(true) },
          '-',
          { label: 'Example Movies...', fn: () => openDlg(true) },
          '-',
          { label: 'Exit', fn: () => api.close() }
        ] },
        { label: 'Edit', items: () => [
          { label: 'Undo', fn: undo, disabled: !undoStack.length },
          '-',
          { label: 'Add Frame', fn: () => addFrame(false) },
          { label: 'Duplicate Frame', fn: () => addFrame(false) },
          { label: 'Add Blank Frame', fn: () => addFrame(true) },
          { label: 'Delete Frame', fn: delFrame },
          '-',
          { label: 'Tween...', fn: tweenDlg },
          { label: 'Titles and Credits...', fn: titlesDlg }
        ] },
        { label: 'Play', items: () => [
          { label: playing ? 'Stop' : 'Play Movie', fn: play },
          '-',
          { label: movie.loop ? 'Loop: On' : 'Loop: Off', fn: () => { movie.loop = !movie.loop; syncControls(); touch(); } },
          { label: onion ? 'Onion Skin: On' : 'Onion Skin: Off', fn: () => { onion = !onion; syncControls(); draw(); } },
          { label: 'Faster', fn: () => setFps(movie.fps + 1), disabled: movie.fps >= 12 },
          { label: 'Slower', fn: () => setFps(movie.fps - 1), disabled: movie.fps <= 4 }
        ] },
        { label: 'Help', items: [
          { label: 'How to Use Movie Maker', fn: helpDlg },
          { label: 'About Movie Maker', fn: () => api.msgBox('About Movie Maker', 'Movie Maker 2000\nStick-figure animation studio for Horizon 2000.\n\nPose it. Frame it. Play it.', ['OK'], 'info') }
        ] }
      ]);
      function setFps(v) { movie.fps = clamp(v, 4, 12); syncControls(); touch(); }

      /* ----- wiring ----- */
      $('.mvm-tb').addEventListener('click', e => {
        const b = e.target.closest('[data-a]'); if (!b) return;
        const a = b.dataset.a;
        if (a === 'add') addFrame(false); else if (a === 'tween') tweenDlg(); else if (a === 'play') play();
      });
      $('.mvm-side').addEventListener('click', e => {
        const b = e.target.closest('[data-add],[data-a]'); if (!b) return;
        if (b.dataset.a === 'titles') { api.sfx.click(); titlesDlg(); return; }
        const k = b.dataset.add;
        if (k === 'fig') addFig();
        else if (k === '5') { if (playing) return; askText('Speech bubble', 'What does it say?', 'Hello!', 40, t => { if (t) addProp(5, t); }); }
        else addProp(+k);
      });
      $('.mvm-tlh').addEventListener('click', e => {
        const b = e.target.closest('[data-a]'); if (!b) return;
        if (b.dataset.a === 'dup') addFrame(false); else if (b.dataset.a === 'del') delFrame();
      });
      strip.addEventListener('click', e => { const b = e.target.closest('.mvm-th'); if (b) { if (playing) stop(); go(+b.dataset.i); } });
      $('.mvm-fpsr').addEventListener('input', e => setFps(+e.target.value));
      $('.mvm-loop').addEventListener('change', e => { movie.loop = e.target.checked; touch(); });
      $('.mvm-onion').addEventListener('change', e => { onion = e.target.checked; api.save('onion', onion); draw(); });
      $('.mvm-bg').addEventListener('change', e => { if (playing) stop(); pushUndo(); movie.bg = e.target.value; renderStrip(); draw(); touch(); });
      $('.mvm-snd').addEventListener('change', e => { if (playing) return; pushUndo(); frame().snd = e.target.value; playSnd(api, e.target.value); queueThumb(); touch(); });

      W.onKey = e => {
        if (dlgKey) { dlgKey(e); return; }
        const tg = e.target && e.target.tagName;
        if (tg === 'INPUT' && e.target.type === 'text' || tg === 'TEXTAREA' || tg === 'SELECT') return;
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); return; }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(false); return; }
        if (e.key === ' ') { e.preventDefault(); play(); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); if (playing) stop(); go(cur - 1, true); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); if (playing) stop(); go(cur + 1, true); }
        else if (e.key === 'Home') go(0, true);
        else if (e.key === 'End') go(movie.frames.length - 1, true);
        else if (e.key === 'Delete' || e.key === 'Backspace') { if (sel) { e.preventDefault(); removeSel(); } }
        else if (e.key.toLowerCase() === 'n' && !e.ctrlKey && !e.metaKey) addFrame(false);
        else if (e.key.toLowerCase() === 't' && !e.ctrlKey && !e.metaKey) tweenDlg();
      };
      W.onResize = () => layout();
      W.onMin = () => stop();
      W.onClose = () => { stop(); clearTimeout(statusT); if (thumbT) cancelAnimationFrame(thumbT); saveDraft(); };
      let ro = null;
      if (window.ResizeObserver) { ro = new ResizeObserver(() => layout()); ro.observe(sw); ro.observe(W.body); }
      const oc = W.onClose; W.onClose = () => { ro && ro.disconnect(); return oc(); };

      /* ----- start ----- */
      onion = api.load('onion', true) !== false;
      const dr = api.load('draft', null);
      if (dr && dr.m) { load(unpack(dr.m), dr.n || null, dr.at || 0); dirty = !!dr.d; setTitle(); }
      else { load(newMovie(api.user), null); if (!listMovies().length) setTimeout(() => status('Welcome! Try File > Example Movies, or pose the figure and press Add frame.'), 50); }
      requestAnimationFrame(layout);
    }
  });
})();
