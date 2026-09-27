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
  const BT0 = 'HAPPY BIRTHDAY!';                  // default words on the Birthday Banner backdrop
  const FONTS = [
    ['Comic', 'bold', '"Comic Sans MS","Chalkboard SE",cursive'],
    ['Impact', '', 'Impact,"Arial Black",sans-serif'],
    ['Arial Black', '', '"Arial Black",Arial,sans-serif'],
    ['Typewriter', 'bold', '"Courier New",Courier,monospace'],
    ['Times Italic', 'italic bold', '"Times New Roman",Times,serif'],
    ['Verdana', 'bold', 'Verdana,Tahoma,sans-serif']
  ];
  const LOOKS = ['Starfield', 'Sunset', 'Chrome', 'Blue Screen'];
  // Sound ids are saved in movies: never rename one. `pack` marks sounds that come with an Extras pack.
  const SOUNDS = [['', '(none)'], ['bday', 'Happy Birthday tune (part 1)'], ['bday2', 'Happy Birthday tune (part 2)'], ['horn', 'Party horn'], ['cheer', 'Cheer'], ['clap', 'Clapping'],
    ['boing', 'Boing'], ['whoosh', 'Whoosh'], ['drum', 'Drum roll'], ['laugh', 'Laugh'], ['pop', 'Pop'], ['ding', 'Ding'], ['splash', 'Splash'], ['zap', 'Zap'], ['honk', 'Honk'],
    ['jingle', 'Sleigh bells', 'holiday'], ['ooo', 'Friendly ghost', 'spooky'], ['fanfare', 'Fanfare', 'adventure'], ['roar', 'Dino roar', 'dino'], ['beam', 'UFO beam', 'space'],
    ['whistle', 'Whistle', 'sports'], ['bubbles', 'Bubbles', 'sea'], ['magic', 'Magic sparkle', 'fantasy']];
  const MAXF = 60, MAXM = 10, MAXFIG = 3, MAXPROP = 12;
  const BUBF = '8px "Comic Sans MS","Chalkboard SE",cursive';

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const norm = a => { a = ((a + 180) % 360 + 360) % 360 - 180; return a === -180 ? 180 : a; };
  const lerp = (a, b, t) => a + (b - a) * t;
  const lerpA = (a, b, t) => a + (((b - a) % 360 + 540) % 360 - 180) * t;
  function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  /* ---------- model ---------- */
  const mkFig = (id, c, x, y, pose) => ({ id, c, x, y, a: (Array.isArray(pose) ? pose : POSE[pose || 'stand']).slice() });
  const mkProp = (id, k, x, y, o = {}) => { const D = PR[k], p = { id, k, x, y, s: o.s || 1, c: o.c ?? D.c0, t: o.t || '', a: o.a || 0 }; if (D.n0) p.n = o.n || D.n0; return p; };
  // A frame's own `bg` marks a scene change; frames without one use the latest earlier change (or movie.bg). Copies never carry it.
  const cloneFrame = fr => ({ snd: fr.snd || '', figs: fr.figs.map(g => ({ ...g, a: g.a.slice() })), props: fr.props.map(p => ({ ...p })) });
  function newMovie(user) {
    return {
      bg: 'park', fps: 8, loop: false, nid: 2, bt: BT0,
      title: { on: true, text: 'My First Movie', sub: 'A stick figure picture', font: 0, look: 0 },
      credits: { on: true, text: `Directed by ${user}\n\nStarring\nThe Stick Figures\n\nThe End`, font: 0 },
      frames: [{ snd: '', figs: [mkFig(1, 0, 160, 161, 'stand')], props: [] }]
    };
  }
  const r0 = v => Math.round(v);
  const isBg = v => typeof v === 'string' && Object.prototype.hasOwnProperty.call(BG, v);
  const isKind = k => Number.isInteger(k) && Object.prototype.hasOwnProperty.call(PR, k);
  const bgName = v => (BG[v] || BG.plain).n;
  // Background of every frame, in order (frame 0 may carry a marker only while loading).
  function bgList(m) { let b = m.bg; return m.frames.map(fr => (b = fr.bg || b)); }
  function bgAt(m, i) { for (let k = Math.min(i, m.frames.length - 1); k >= 0; k--) if (m.frames[k].bg) return m.frames[k].bg; return m.bg; }
  // Store a full per-frame list back as the starting background plus change markers only where it changes.
  function setBgs(m, arr) { m.bg = arr[0] || m.bg; m.frames.forEach((fr, i) => { if (i && arr[i] !== arr[i - 1]) fr.bg = arr[i]; else delete fr.bg; }); }
  function pack(m) {
    return {
      b: m.bg, r: m.fps, l: m.loop ? 1 : 0, i: m.nid, ...(m.bt && m.bt !== BT0 ? { bt: m.bt } : {}),
      t: [m.title.on ? 1 : 0, m.title.text, m.title.sub, m.title.font, m.title.look],
      c: [m.credits.on ? 1 : 0, m.credits.text, m.credits.font],
      f: m.frames.map(fr => { const a = [fr.snd || 0,
        fr.figs.map(g => [g.id, g.c, r0(g.x), r0(g.y), ...g.a.map(r0)]),
        // [id, kind, x, y, size*10, color, text, angle, count]; trailing empty values are left off (older movies stop after color, text or angle).
        fr.props.map(p => { const D = PR[p.k] || {}, a = [p.id, p.k, r0(p.x), r0(p.y), r0(p.s * 10), p.c, D.tb ? p.t : '', r0(p.a || 0), D.n0 ? p.n : 0]; while (a.length > 6 && !a[a.length - 1]) a.pop(); return a; })];
        if (fr.bg) a.push(fr.bg); // 4th item only on frames where the scene changes; older movies simply don't have it
        return a; })
    };
  }
  // Loading is defensive: saved drafts, old movies and shared links all come through here, so every field is checked and capped.
  const num = (v, d, lo, hi) => { v = +v; return Number.isFinite(v) ? clamp(v, lo, hi) : d; };
  const arrOf = v => Array.isArray(v) ? v : [];
  const txt = (v, n) => (typeof v === 'string' || typeof v === 'number') ? String(v).slice(0, n) : '';
  function unpack(d) {
    const m = newMovie('you');
    const F = d && arrOf(d.f).filter(Array.isArray);
    if (!F || !F.length) return m;
    if (isBg(d.b)) m.bg = d.b;
    m.fps = num(d.r, 8, 4, 12) | 0; m.loop = !!d.l;
    if (d.bt) m.bt = txt(d.bt, 24);
    if (Array.isArray(d.t)) m.title = { on: !!d.t[0], text: txt(d.t[1], 28), sub: txt(d.t[2], 40), font: num(d.t[3], 0, 0, FONTS.length - 1) | 0, look: num(d.t[4], 0, 0, LOOKS.length - 1) | 0 };
    if (Array.isArray(d.c)) m.credits = { on: !!d.c[0], text: txt(d.c[1], 240).split('\n').slice(0, 12).join('\n'), font: num(d.c[2], 0, 0, FONTS.length - 1) | 0 };
    let top = 1;
    const id = v => { v = num(v, 1, 1, 1e6) | 0; top = Math.max(top, v); return v; };
    m.frames = F.slice(0, MAXF).map(fr => ({
      snd: SOUNDS.some(s => s[0] && s[0] === fr[0]) ? fr[0] : '',
      figs: arrOf(fr[1]).filter(Array.isArray).slice(0, MAXFIG).map(g => ({ id: id(g[0]), c: num(g[1], 0, 0, FIGC.length - 1) | 0, x: num(g[2], 160, -60, VW + 60), y: num(g[3], 161, -60, VH + 60), a: g.slice(4, 14).map(v => norm(num(v, 0, -720, 720))) })).filter(g => g.a.length === 10),
      // Unknown prop kinds (from a newer Movie Maker) are skipped. Pack props always load: watching never needs the pack.
      props: arrOf(fr[2]).filter(p => Array.isArray(p) && isKind(+p[1])).slice(0, MAXPROP).map(p => {
        const k = +p[1], D = PR[k], o = { id: id(p[0]), k, x: num(p[2], 160, -60, VW + 60), y: num(p[3], 120, -60, VH + 60), s: num(p[4] || 10, 10, 4, 30) / 10, c: num(p[5], D.c0, 0, PROPC.length - 1) | 0, t: txt(p[6], 40), a: norm(num(p[7], 0, -720, 720)) };
        if (D.n0) o.n = num(p[8], D.n0, 1, 10) | 0;
        return o;
      }),
      ...(isBg(fr[3]) ? { bg: fr[3] } : {})
    }));
    m.nid = Math.max(num(d.i, 0, 0, 1e6) | 0, top + 1);
    setBgs(m, bgList(m));
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
      fr.props.forEach(p => { const q = B.props.find(x => x.id === p.id); if (!q) return; p.x = lerp(p.x, q.x, t); p.y = lerp(p.y, q.y, t); p.s = lerp(p.s, q.s, t); p.a = norm(lerpA(p.a || 0, q.a || 0, t)); });
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
    const D = PR[p.k] || PR[0], b = D.tb ? D.tb(p) : D.box;
    if (!p.a) return [p.x + b[0] * p.s, p.y + b[1] * p.s, p.x + b[2] * p.s, p.y + b[3] * p.s];
    const r = p.a * Math.PI / 180, c = Math.cos(r), sn = Math.sin(r);
    const pts = [[b[0], b[1]], [b[2], b[1]], [b[0], b[3]], [b[2], b[3]]].map(([x, y]) => [p.x + (x * c - y * sn) * p.s, p.y + (x * sn + y * c) * p.s]);
    return [Math.min(...pts.map(q => q[0])), Math.min(...pts.map(q => q[1])), Math.max(...pts.map(q => q[0])), Math.max(...pts.map(q => q[1]))];
  }
  // The round rotate handle sits just above a selected prop's box.
  const rotHandle = p => { const b = propBox(p); return [(b[0] + b[2]) / 2, b[1] - 14]; };
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
  // Painted backdrops are cached per size: a few stage-sized ones, plenty of small thumbnails.
  const bgCache = new Map(), bgSmall = new Map();
  function bgImage(bg, w, h, bt) {
    const key = bg + ':' + w + 'x' + h + (bt ? ':' + bt : ''), M = w * h > 40000 ? bgCache : bgSmall;
    let c = M.get(key);
    if (!c) {
      if (M.size > (M === bgCache ? 10 : 120)) M.clear();
      c = document.createElement('canvas'); c.width = w; c.height = h;
      const x = c.getContext('2d'); x.scale(w / VW, h / VH); x.lineCap = 'round'; x.lineJoin = 'round';
      (BG[bg] || BG.plain).d(x, { bt });
      M.set(key, c);
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
  const propPal = k => (PR[k] && PR[k].pal) || PROPC;
  const propCol = p => { const L = propPal(p.k); return L[p.c % L.length]; };
  function drawProp(ctx, p, T = 0) {
    const D = PR[p.k]; if (!D) return;
    ctx.save(); ctx.translate(p.x, p.y); if (p.a) ctx.rotate(p.a * Math.PI / 180); ctx.scale(p.s, p.s);
    ctx.lineWidth = 0.9; ctx.strokeStyle = '#000'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    D.d(ctx, propCol(p), p, T);
    ctx.restore();
  }
  // Does this frame have anything that moves on its own (candle flames, fireworks)? Then playback redraws it every tick.
  const frameAnim = (bg, fr) => !!((BG[bg] && BG[bg].over) || fr.props.some(p => PR[p.k] && PR[p.k].anim));
  // o: { T: seconds (for flames and sparkles), bt: banner words, onion: the frame before, shown faintly }
  function drawFrame(ctx, bg, fr, w, h, o = {}) {
    const B = BG[bg] || BG.plain, T = o.T || 0;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(bgImage(B.id, w, h, B.txt ? (o.bt || BT0) : ''), 0, 0);
    ctx.setTransform(w / VW, 0, 0, h / VH, 0, 0);
    if (B.over) { ctx.save(); B.over(ctx, T); ctx.restore(); }
    if (o.onion) { ctx.globalAlpha = 0.28; o.onion.figs.forEach(g => drawFig(ctx, g)); o.onion.props.forEach(p => drawProp(ctx, p, T)); ctx.globalAlpha = 1; }
    fr.figs.forEach(g => drawFig(ctx, g));
    fr.props.forEach(p => drawProp(ctx, p, T));
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

  /* ---------- drawing helpers for the prop and scenery catalog ---------- */
  const TAU = Math.PI * 2;
  function paint(x, f, s) { if (f) { x.fillStyle = f; x.fill(); } if (s) x.stroke(); }
  function E(x, cx, cy, rx, ry, f, s) { x.beginPath(); x.ellipse(cx, cy, Math.abs(rx), Math.abs(ry), 0, 0, TAU); paint(x, f, s); }
  function EL(x, cx, cy, rx, ry, r, f, s) { x.beginPath(); x.ellipse(cx, cy, Math.abs(rx), Math.abs(ry), r, 0, TAU); paint(x, f, s); }
  function C(x, cx, cy, r, f, s) { E(x, cx, cy, r, r, f, s); }
  function PL(x, p, f, s) { x.beginPath(); x.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) x.lineTo(p[i], p[i + 1]); x.closePath(); paint(x, f, s); }
  function RR(x, X, Y, w, h, r, f, s) { rrect(x, X, Y, w, h, r); paint(x, f, s); }
  function R(x, X, Y, w, h, f, s) { x.beginPath(); x.rect(X, Y, w, h); paint(x, f, s); }
  function LN(x, p, c, lw) { const s0 = x.strokeStyle, w0 = x.lineWidth; x.beginPath(); x.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) x.lineTo(p[i], p[i + 1]); x.strokeStyle = c; x.lineWidth = lw; x.stroke(); x.strokeStyle = s0; x.lineWidth = w0; }
  function QL(x, x0, y0, cx, cy, x1, y1, c, lw) { const s0 = x.strokeStyle, w0 = x.lineWidth; x.beginPath(); x.moveTo(x0, y0); x.quadraticCurveTo(cx, cy, x1, y1); x.strokeStyle = c; x.lineWidth = lw; x.stroke(); x.strokeStyle = s0; x.lineWidth = w0; }
  // A path traced twice: a dark outline, then the color on top (ropes, tails, handles).
  function band(x, path, c, w, o = '#000') { const s0 = x.strokeStyle, w0 = x.lineWidth; path(); x.strokeStyle = o; x.lineWidth = w + 1.3; x.stroke(); x.strokeStyle = c; x.lineWidth = w; x.stroke(); x.strokeStyle = s0; x.lineWidth = w0; }
  // Several shapes filled as one outlined silhouette: outline all of them first, then fill all of them.
  function blob(x, shapes, f) { const w0 = x.lineWidth; x.lineWidth = w0 * 2; shapes.forEach(s => { s(); x.stroke(); }); x.lineWidth = w0; x.fillStyle = f; shapes.forEach(s => { s(); x.fill(); }); }
  const pE = (x, cx, cy, rx, ry, r = 0) => () => { x.beginPath(); x.ellipse(cx, cy, rx, ry, r, 0, TAU); };
  const pP = (x, p) => () => { x.beginPath(); x.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) x.lineTo(p[i], p[i + 1]); x.closePath(); };
  const pR = (x, X, Y, w, h, r) => () => rrect(x, X, Y, w, h, r);
  function eyes(x, cx, cy, d, r = 1.4) { [-d, d].forEach(o => { C(x, cx + o, cy, r, '#000'); C(x, cx + o + r * 0.35, cy - r * 0.4, r * 0.38, '#fff'); }); }
  function eye(x, cx, cy, r = 1.4) { C(x, cx, cy, r, '#000'); C(x, cx + r * 0.35, cy - r * 0.4, r * 0.38, '#fff'); }
  function arcL(x, cx, cy, r, a0, a1, c = '#000', lw = 0.8) { const s0 = x.strokeStyle, w0 = x.lineWidth; x.beginPath(); x.arc(cx, cy, r, a0, a1); x.strokeStyle = c; x.lineWidth = lw; x.stroke(); x.strokeStyle = s0; x.lineWidth = w0; }
  const smile = (x, cx, cy, r, c = '#000', lw = 0.8) => arcL(x, cx, cy, r, 0.18 * Math.PI, 0.82 * Math.PI, c, lw);
  function shade(hex, k) {
    const n = parseInt(hex.slice(1), 16), f = v => Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k);
    return '#' + ((1 << 24) | (f(n >> 16) << 16) | (f(n >> 8 & 255) << 8) | f(n & 255)).toString(16).slice(1);
  }
  const lum = h => { const n = parseInt(h.slice(1), 16); return ((n >> 16) * 0.3 + (n >> 8 & 255) * 0.59 + (n & 255) * 0.11) / 255; };
  const ink = c => lum(c) < 0.55 ? '#fff' : '#000';
  // A candle flame standing on (cx, cy), about 9 units tall at s = 1. T (seconds) makes it flicker.
  function flame(x, cx, cy, s, T, seed = 0) {
    const k = 1 + 0.16 * Math.sin(T * 21 + seed * 2.3) + 0.08 * Math.sin(T * 34 + seed * 5.1), sw = Math.sin(T * 17 + seed * 3.7);
    x.save(); x.translate(cx, cy); x.scale(s, s * k);
    C(x, 0, -3.5, 5.5, 'rgba(255,210,90,.28)');
    const drop = (w, h, f) => { x.beginPath(); x.moveTo(sw * w * 0.35, -h); x.bezierCurveTo(w, -h * 0.45, w, 0, 0, 0.6); x.bezierCurveTo(-w, 0, -w, -h * 0.45, sw * w * 0.35, -h); x.fillStyle = f; x.fill(); };
    drop(3.2, 9, '#ff8a00'); drop(1.8, 5.5, '#ffe95a');
    x.restore();
  }
  function heartPath(x, cx, cy, s) {
    x.beginPath(); x.moveTo(cx, cy + 9 * s);
    x.bezierCurveTo(cx - 3 * s, cy + 6 * s, cx - 11 * s, cy + s, cx - 11 * s, cy - 4 * s); x.bezierCurveTo(cx - 11 * s, cy - 9.5 * s, cx - 3.5 * s, cy - 11 * s, cx, cy - 5 * s);
    x.bezierCurveTo(cx + 3.5 * s, cy - 11 * s, cx + 11 * s, cy - 9.5 * s, cx + 11 * s, cy - 4 * s); x.bezierCurveTo(cx + 11 * s, cy + s, cx + 3 * s, cy + 6 * s, cx, cy + 9 * s);
  }
  function wrapLines(text, font, maxW, maxL) {
    mctx.font = font;
    const words = String(text || '').split(/\s+/).filter(Boolean), lines = [];
    let cur = '';
    words.forEach(w => { const t = cur ? cur + ' ' + w : w; if (mctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; });
    if (cur) lines.push(cur);
    const ls = lines.slice(0, maxL);
    return { ls, w: Math.max(0, ...ls.map(l => mctx.measureText(l).width)) };
  }
  const SIGNF = 'bold 10px "Comic Sans MS","Chalkboard SE",cursive';
  function signLines(t) { const L = wrapLines(t || 'Hooray!', SIGNF, 120, 2); return { ls: L.ls.length ? L.ls : ['Hooray!'], w: Math.max(40, L.w + 16), h: Math.max(1, L.ls.length) * 12 + 8 }; }

  /* ---------- the prop catalog ---------- */
  // Each prop kind has a stable number that is saved in movies and links: never renumber, only add.
  // Fields: n name, cat picker group, pack (Extras pack id, '' = free), box [x0,y0,x1,y1] for picking, c0 first color,
  // pal own color list (max 8), nc no Color button, tb text box (text props), n0 default count (cake candles), anim, pos, d(x, color, prop, T).
  const PR = {};
  const P = (k, o) => { PR[k] = Object.assign({ k, cat: 'basic', pack: '', box: [-10, -10, 10, 10], c0: 0, pos: [160, 120] }, o); };
  const RAINBOW = ['#e00000', '#f4c400', '#0050e0', '#00a000', '#a000c0', '#ff7f00', '#ff5fa0', '#ffffff'];
  const CAKE = ['#ff9ec8', '#8fd0ff', '#fff1a8', '#b8f0a0', '#d9b3ff', '#ffffff', '#8a5230', '#ffb870'];
  const SCOOP = ['#ffb6d0', '#fff4d8', '#7a4a2a', '#b8f0a0', '#ffe066', '#c8a0ff', '#8fd0ff', '#ff9a50'];
  const PETAL = ['#ff5fa0', '#e00000', '#f4c400', '#a000c0', '#ffffff', '#ff7f00', '#0050e0', '#ff9ec8'];
  const GOLD = ['#f4c400', '#d4d8e0', '#e0955a', '#ff9ec8'];

  // The original six (0-5).
  P(0, { n: 'Ball', box: [-9, -9, 9, 9], pos: [160, 120], d(x, c) {
    ell(x, 0, 0, 8.5, 8.5, c); x.stroke();
    x.strokeStyle = '#fff'; x.lineWidth = 1.6; x.beginPath(); x.arc(-9, 0, 9, -0.9, 0.9); x.stroke(); x.beginPath(); x.arc(9, 0, 9, Math.PI - 0.9, Math.PI + 0.9); x.stroke();
    ell(x, -3, -4, 2, 1.4, 'rgba(255,255,255,.8)');
  } });
  P(1, { n: 'Top hat', box: [-12, -15, 12, 3], pos: [150, 190], d(x, c) {
    ell(x, 0, 0, 12, 3, '#1a1a1a'); x.fillStyle = '#1a1a1a'; x.fillRect(-7, -15, 14, 15);
    x.fillStyle = c === '#202020' ? '#e00000' : c; x.fillRect(-7, -5, 14, 3.5);
    x.fillStyle = 'rgba(255,255,255,.25)'; x.fillRect(-5, -14, 2, 8);
  } });
  P(2, { n: 'Balloon', box: [-10, -12, 10, 34], c0: 1, pos: [100, 80], d(x, c) {
    x.strokeStyle = '#555'; x.lineWidth = 0.7; x.beginPath(); x.moveTo(0, 11); x.bezierCurveTo(5, 18, -5, 26, 0, 34); x.stroke();
    ell(x, 0, 0, 9, 11, c); x.strokeStyle = 'rgba(0,0,0,.5)'; x.stroke();
    x.fillStyle = c; x.beginPath(); x.moveTo(0, 10); x.lineTo(-2.5, 13); x.lineTo(2.5, 13); x.fill();
    ell(x, -3.5, -4.5, 2, 3, 'rgba(255,255,255,.7)');
  } });
  P(3, { n: 'Skateboard', box: [-19, -4, 19, 5], c0: 5, pos: [160, 199], d(x, c) {
    x.fillStyle = c; rrect(x, -18, -4, 36, 4, 2); x.fill(); x.stroke();
    x.fillStyle = '#888'; x.fillRect(-13, 0, 6, 1.5); x.fillRect(7, 0, 6, 1.5);
    ell(x, -10, 2.8, 2.6, 2.6, '#222'); ell(x, 10, 2.8, 2.6, 2.6, '#222');
  } });
  P(4, { n: 'Star', box: [-12, -12, 12, 12], c0: 3, pos: [250, 60], d(x, c) {
    star(x, 0, 0, 11.5, 4.8); x.fillStyle = c; x.fill(); x.strokeStyle = '#6a4a00'; x.stroke();
    ell(x, -2, -3, 1.6, 1.6, 'rgba(255,255,255,.8)');
  } });
  P(5, { n: 'Speech bubble', c0: 7, pos: [200, 50], tb(p) { const L = bubbleLines(p.t); return [-L.w / 2, -L.h / 2, L.w / 2, L.h / 2 + 9]; }, d(x, c, p) {
    const L = bubbleLines(p.t);
    x.fillStyle = c; x.beginPath();
    x.moveTo(-L.w / 2 + 8, L.h / 2 - 1); x.lineTo(-L.w / 2 + 3, L.h / 2 + 9); x.lineTo(-L.w / 2 + 16, L.h / 2 - 1); x.fill(); x.stroke();
    rrect(x, -L.w / 2, -L.h / 2, L.w, L.h, 6); x.fill(); x.stroke();
    x.fillRect(-L.w / 2 + 8.5, L.h / 2 - 2, 7, 2);
    x.fillStyle = (c === '#202020' || c === '#0050e0' || c === '#a000c0') ? '#fff' : '#000';
    x.font = BUBF; x.textAlign = 'center'; x.textBaseline = 'middle';
    L.ls.forEach((l, i) => x.fillText(l, 0, -L.h / 2 + 9 + i * 10));
  } });

  // Party (free)
  P(6, { n: 'Birthday cake', cat: 'party', box: [-24, -26, 24, 16], pal: CAKE, n0: 5, anim: 1, pos: [160, 150], d(x, c, p, T) {
    E(x, 0, 11.5, 24, 4.5, '#f4f4f4', 1);
    const top = -6, bot = 9;
    x.beginPath(); x.moveTo(-18, top); x.lineTo(-18, bot); x.ellipse(0, bot, 18, 4.5, 0, Math.PI, 0, true); x.lineTo(18, top); x.closePath(); paint(x, c, 1);
    for (let i = 0; i < 8; i++) C(x, -14 + i * 4, 5 + Math.sin(i) * 0.3, 1.2, shade(c, -0.3));
    LN(x, [-18, 1.5, 18, 1.5], shade(c, -0.18), 0.8);
    E(x, 0, top, 18, 4.5, '#fffaf2', 1);
    [-15, -9, -3, 3, 9, 15].forEach((X, i) => { const Y = top + 4.5 * Math.sqrt(1 - (X / 18) * (X / 18)); E(x, X, Y + 1.2 + (i % 2), 2.2, 2.8 + (i % 2), '#fffaf2'); });
    E(x, 0, top, 17, 4, '#fffaf2');
    const n = clamp(p.n || 5, 1, 10), CC = ['#ff5fa0', '#4aa0ff', '#ffd23a', '#6ac05a', '#b070f0'];
    const rows = n > 5 ? [[Math.ceil(n / 2), -1.8], [Math.floor(n / 2), 1.6]] : [[n, 0]];
    let ci = 0;
    rows.forEach(([m, dy], ri) => {
      for (let i = 0; i < m; i++) {
        const X = m === 1 ? 0 : -12 + 24 * i / (m - 1) + (ri ? 2.4 : 0) - (rows.length > 1 && !ri ? 1.2 : 0), Y = top + dy;
        R(x, X - 1.2, Y - 9, 2.4, 9, CC[ci % 5]); x.lineWidth = 0.5; x.strokeRect(X - 1.2, Y - 9, 2.4, 9); x.lineWidth = 0.9;
        R(x, X - 1.2, Y - 7, 2.4, 1.2, 'rgba(255,255,255,.75)'); R(x, X - 1.2, Y - 3.5, 2.4, 1.2, 'rgba(255,255,255,.75)');
        LN(x, [X, Y - 9, X, Y - 10.2], '#333', 0.6);
        flame(x, X, Y - 10, 0.72, T, ci++);
      }
    });
  } });
  P(7, { n: 'Cupcake', cat: 'party', box: [-10, -20, 10, 11], c0: 1, pos: [120, 170], d(x, c) {
    PL(x, [-8, -1, 8, -1, 6, 10, -6, 10], c, 1);
    [-5, -2.5, 0, 2.5, 5].forEach(X => LN(x, [X, -0.5, X * 0.75, 9.5], shade(c, -0.3), 0.6));
    E(x, 0, -3, 9.5, 3.5, '#ffc6de', 1); E(x, 0, -6.8, 7.2, 3.2, '#ffd6e8', 1); E(x, 0, -10.2, 4.6, 2.6, '#ffe4f0', 1);
    [[-5, -4, '#e00000'], [3, -5, '#0050e0'], [-1, -8, '#00a000'], [5, -2.5, '#f4c400'], [-3, -10.5, '#a000c0'], [1.5, -11, '#ff7f00']].forEach(([X, Y, f]) => R(x, X, Y, 1.6, 0.9, f));
    LN(x, [1, -15, 3, -19], '#2a6a2a', 0.7); C(x, 1, -14, 2.4, '#d00010', 1); C(x, 0.3, -14.8, 0.7, '#ff8a8a');
  } });
  P(8, { n: 'Present', cat: 'party', box: [-12, -16, 12, 11], pos: [240, 190], d(x, c) {
    const rb = lum(c) > 0.7 ? '#e00000' : '#ffe040';
    R(x, -10, -5, 20, 15, c, 1); R(x, -11.5, -9, 23, 5, shade(c, 0.22), 1);
    R(x, -2, -9, 4, 19, rb); R(x, -10, 1, 20, 3, rb);
    x.lineWidth = 0.6; x.strokeRect(-2, -9, 4, 19); x.lineWidth = 0.9;
    PL(x, [-1, -10, -5, -5.5, -3, -5.5], rb, 1); PL(x, [1, -10, 5, -5.5, 3, -5.5], rb, 1);
    EL(x, -4.2, -12, 4.4, 2.5, -0.35, rb, 1); EL(x, 4.2, -12, 4.4, 2.5, 0.35, rb, 1); C(x, 0, -10.6, 1.8, rb, 1);
    R(x, -8.5, -3.5, 1.4, 11, 'rgba(255,255,255,.25)');
  } });
  P(9, { n: 'Party hat', cat: 'party', box: [-9, -17, 9, 9.5], c0: 1, pos: [160, 106], d(x, c) {
    PL(x, [0, -14, 8, 7, -8, 7], c, 1);
    x.save(); PL(x, [0, -14, 8, 7, -8, 7]); x.clip();
    [[-2, -3], [3, 1], [-4, 4], [1, -8], [4.5, 5], [-0.5, 3], [0.5, -2.5]].forEach(([X, Y], i) => C(x, X, Y, 1.2, i % 2 ? '#ffe040' : '#fff'));
    x.restore();
    E(x, 0, 7.2, 8.6, 2, shade(c, -0.25), 1);
    [0, 1, 2, 3, 4, 5].forEach(i => { const a = i * Math.PI / 3; LN(x, [0, -14, Math.cos(a) * 3.2, -14 + Math.sin(a) * 3.2], '#ffe040', 1.2); });
    C(x, 0, -14, 1.6, '#fff', 1);
  } });
  P(10, { n: 'Balloon bunch', cat: 'party', box: [-18, -33, 18, 25], pal: RAINBOW, pos: [60, 90], d(x, c, p) {
    const B = [[-7, -24], [8, -22], [-11, -10], [0, -13], [11, -9]], k0 = p.c;
    B.forEach(([X, Y]) => QL(x, X, Y + 8.5, X * 0.3, 8, 0, 22, '#666', 0.6));
    B.forEach(([X, Y], i) => {
      const f = RAINBOW[(k0 + i) % RAINBOW.length];
      E(x, X, Y, 7, 8.5, f); x.strokeStyle = 'rgba(0,0,0,.55)'; x.stroke(); x.strokeStyle = '#000';
      PL(x, [X, Y + 8, X - 1.8, Y + 10.3, X + 1.8, Y + 10.3], f);
      EL(x, X - 2.6, Y - 3.4, 1.5, 2.4, 0.3, 'rgba(255,255,255,.7)');
    });
    PL(x, [0, 22, -3.5, 20, -3.5, 24.5], '#e00000', 1); PL(x, [0, 22, 3.5, 20, 3.5, 24.5], '#e00000', 1);
  } });
  P(11, { n: 'Confetti', cat: 'party', box: [-22, -20, 22, 20], nc: 1, pos: [160, 60], d(x) {
    const r = rng(9);
    for (let i = 0; i < 38; i++) {
      const a = r() * TAU, dd = 3 + r() * 19, X = Math.cos(a) * dd, Y = Math.sin(a) * dd * 0.88, f = RAINBOW[i % 7];
      x.save(); x.translate(X, Y); x.rotate(r() * 3);
      if (i % 3) R(x, -1.7, -0.8, 3.4, 1.6, f); else C(x, 0, 0, 1.2, f);
      x.restore();
    }
    [[-15, -9, 0], [12, -13, 2], [3, 13, 3], [-8, 10, 5]].forEach(([X, Y, k]) => { const s0 = x.strokeStyle; x.beginPath(); x.moveTo(X, Y); x.bezierCurveTo(X + 3, Y - 4, X + 5, Y + 4, X + 8, Y); x.strokeStyle = RAINBOW[k]; x.lineWidth = 1; x.stroke(); x.strokeStyle = s0; x.lineWidth = 0.9; });
  } });
  P(12, { n: 'Streamer', cat: 'party', box: [-32, -5, 32, 22], c0: 4, pos: [160, 30], d(x, c) {
    const N = 26, pt = i => { const t = -1 + 2 * i / N; return [t * 30, 12 * (1 - t * t) - 2]; };
    for (let i = 0; i < N; i++) {
      const [x0, y0] = pt(i), [x1, y1] = pt(i + 1), w0 = 2.6 * Math.abs(Math.cos(i * 0.85)) + 0.5, w1 = 2.6 * Math.abs(Math.cos((i + 1) * 0.85)) + 0.5;
      PL(x, [x0, y0 - w0, x1, y1 - w1, x1, y1 + w1, x0, y0 + w0], (i % 2) ? c : shade(c, 0.35));
    }
    const s0 = x.strokeStyle; x.strokeStyle = shade(c, -0.4); x.lineWidth = 0.5;
    x.beginPath(); for (let i = 0; i <= N; i++) { const [X, Y] = pt(i); x.lineTo(X, Y); } x.stroke(); x.strokeStyle = s0; x.lineWidth = 0.9;
    band(x, () => { x.beginPath(); x.moveTo(-30, -2); x.quadraticCurveTo(-33, 8, -29, 18); }, c, 1.8);
    band(x, () => { x.beginPath(); x.moveTo(30, -2); x.quadraticCurveTo(33, 8, 29, 18); }, c, 1.8);
  } });
  P(13, { n: 'Party horn', cat: 'party', box: [-21, -8, 19, 8], c0: 0, pos: [180, 120], d(x, c) {
    band(x, () => { x.beginPath(); x.moveTo(5.5, 0); x.lineTo(8, 0); for (let a = 0; a < 1.7 * Math.PI; a += 0.2) { const r = 5.5 - a * 0.5; x.lineTo(13.5 + r * Math.cos(Math.PI / 2 + a), -5.5 + r * Math.sin(Math.PI / 2 + a)); } }, c, 2);
    PL(x, [-15, -2.5, 6, -4.5, 6, 4.5, -15, 2.5], c, 1);
    x.save(); PL(x, [-15, -2.5, 6, -4.5, 6, 4.5, -15, 2.5]); x.clip(); [-11, -5, 1].forEach(X => R(x, X, -6, 2.8, 12, '#fff')); x.restore();
    PL(x, [-15, -2.5, 6, -4.5, 6, 4.5, -15, 2.5], null, 1);
    RR(x, -20.5, -2.2, 6, 4.4, 1.2, '#f4f4f4', 1);
    [-3, -1, 1, 3].forEach(Y => LN(x, [6, Y, 8.5, Y * 1.6], '#ffd23a', 0.8));
  } });
  P(14, { n: 'Pizza', cat: 'party', box: [-15, -15, 15, 15], nc: 1, pos: [160, 160], d(x) {
    C(x, 0, 0, 14, '#d9953c', 1); C(x, 0, 0, 11.6, '#ffcf40');
    [[-6, 3, 3], [5, -5, 2.5], [2, 7, 2.2], [-4, -7, 2]].forEach(([X, Y, r]) => C(x, X, Y, r, '#ffe27a'));
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + 0.3; LN(x, [0, 0, Math.cos(a) * 13.6, Math.sin(a) * 13.6], '#b8782a', 0.6); }
    [[-5, -4], [4, -6.5], [6.5, 3], [-3, 6], [0.5, -0.5], [-8.5, 1.5], [2.5, 9]].forEach(([X, Y]) => { C(x, X, Y, 2.3, '#c62a1a'); C(x, X - 0.5, Y - 0.6, 0.6, '#e8604a'); });
    [[-1, 4], [7, -2], [-7, -2], [3, -9]].forEach(([X, Y]) => R(x, X, Y, 2, 1, '#2a9a3a'));
  } });
  P(15, { n: 'Ice cream cone', cat: 'party', box: [-8.5, -24, 8.5, 18], pal: SCOOP, pos: [200, 130], d(x, c) {
    PL(x, [-7, -2, 7, -2, 0, 17], '#e3a857', 1);
    x.save(); PL(x, [-7, -2, 7, -2, 0, 17]); x.clip(); for (let i = -3; i < 5; i++) { LN(x, [-8 + i * 4, -3, 2 + i * 4, 17], '#b77a30', 0.5); LN(x, [8 - i * 4, -3, -2 - i * 4, 17], '#b77a30', 0.5); } x.restore();
    const bot = c === SCOOP[1] ? SCOOP[0] : SCOOP[1];
    C(x, 0, -5, 7.5, bot, 1); E(x, -3, 0.5, 1.6, 2.4, bot); E(x, 4, 0, 1.3, 2, bot);
    C(x, 0, -13, 6.5, c, 1); E(x, -2.5, -15, 1.8, 1.2, 'rgba(255,255,255,.55)');
    LN(x, [0, -21, 1.5, -24], '#2a6a2a', 0.7); C(x, 0, -20, 2.2, '#d00010', 1);
  } });
  P(16, { n: 'Lollipop', cat: 'party', box: [-9, -9, 9, 25], c0: 4, pos: [110, 120], d(x, c) {
    R(x, -0.9, 6, 1.8, 18.5, '#fafafa', 1);
    C(x, 0, 0, 8.5, c, 1);
    const s0 = x.strokeStyle; x.beginPath(); for (let a = 0; a < 4.2 * Math.PI; a += 0.2) { const r = a * 0.6; x.lineTo(r * Math.cos(a), r * Math.sin(a)); } x.strokeStyle = '#fff'; x.lineWidth = 1.7; x.stroke(); x.strokeStyle = s0; x.lineWidth = 0.9;
    C(x, 0, 0, 8.5, null, 1); EL(x, -3.5, -4, 1.6, 2.6, 0.6, 'rgba(255,255,255,.6)');
  } });
  P(17, { n: 'Candle', cat: 'party', box: [-7, -24, 7, 12], c0: 7, anim: 1, pos: [100, 170], d(x, c, p, T) {
    E(x, 0, 9, 7, 2.2, '#d8d8e0', 1);
    RR(x, -3.5, -11, 7, 20, 1, c, 1); R(x, -2.3, -10, 1.2, 17, 'rgba(255,255,255,.35)'); E(x, 1.6, -9.6, 1.3, 2.6, shade(c, 0.3));
    LN(x, [0, -11, 0, -13], '#222', 0.8); flame(x, 0, -12.5, 1.05, T, 3);
  } });
  P(18, { n: 'Crown', cat: 'party', box: [-12.5, -12, 12.5, 7], pal: GOLD, pos: [160, 106], d(x, c) {
    PL(x, [-11, 6, -11, -7, -7.5, 0, -5.5, -9, -2.5, 0, 0, -10.5, 2.5, 0, 5.5, -9, 7.5, 0, 11, -7, 11, 6], c, 1);
    R(x, -11, 2, 22, 4, shade(c, -0.2), 1);
    [[-11, -7], [-5.5, -9], [0, -10.5], [5.5, -9], [11, -7]].forEach(([X, Y]) => C(x, X, Y, 1.3, shade(c, 0.35), 1));
    C(x, 0, 4, 1.5, '#e00000', 1); E(x, -6, 4, 1.4, 1.1, '#0050e0', 1); E(x, 6, 4, 1.4, 1.1, '#00a000', 1);
    PL(x, [-9, -3, -8, -1, -9, 1], 'rgba(255,255,255,.5)');
  } });
  // Pets & toys (free)
  P(19, { n: 'Cat', cat: 'pets', box: [-11, -20, 18, 15], pal: ['#ff9a3c', '#404040', '#b8b8c0', '#ffffff', '#a06a40', '#f0d8a8'], pos: [220, 190], d(x, c) {
    const dk = shade(c, -0.3), wh = lum(c) < 0.35 ? '#bbb' : '#333';
    band(x, () => { x.beginPath(); x.moveTo(6, 11); x.bezierCurveTo(16, 12, 17, 2, 13, -3); }, c, 3);
    blob(x, [pE(x, 0, 4, 9, 10), pP(x, [-7, -12, -6, -19.5, -1.5, -15]), pP(x, [7, -12, 6, -19.5, 1.5, -15]), pE(x, 0, -9, 8, 7.2), pE(x, -4, 13, 3.2, 2.2), pE(x, 4, 13, 3.2, 2.2)], c);
    PL(x, [-5.8, -13, -5.4, -17.5, -2.8, -14.8], '#ff9ab8'); PL(x, [5.8, -13, 5.4, -17.5, 2.8, -14.8], '#ff9ab8');
    E(x, 0, 6, 5, 6.5, shade(c, 0.35));
    if (c === '#ff9a3c' || c === '#a06a40') [-3, 0, 3].forEach(X => LN(x, [X, -15.5, X * 0.8, -12.8], dk, 1));
    [-3.2, 3.2].forEach(X => { E(x, X, -10, 1.8, 2.1, '#8ad040'); E(x, X, -10, 0.6, 1.8, '#000'); });
    PL(x, [-1.1, -6.8, 1.1, -6.8, 0, -5.6], '#ff7fa0');
    arcL(x, -1, -5.6, 1, 0.1, Math.PI - 0.3, wh, 0.6); arcL(x, 1, -5.6, 1, 0.3, Math.PI - 0.1, wh, 0.6);
    [[-2.5, -6.5, -9, -8], [-2.5, -5.8, -9, -5], [2.5, -6.5, 9, -8], [2.5, -5.8, 9, -5]].forEach(q => LN(x, q, wh, 0.4));
    LN(x, [-4, 9, -4, 13], dk, 0.6); LN(x, [4, 9, 4, 13], dk, 0.6);
  } });
  P(20, { n: 'Dog', cat: 'pets', box: [-18, -18, 18, 15], pal: ['#c08040', '#f0e0c0', '#6a4428', '#ffffff', '#404040', '#e0b060'], pos: [100, 190], d(x, c) {
    const lt = shade(c, 0.3), dk = shade(c, -0.35);
    band(x, () => { x.beginPath(); x.moveTo(-9, 5); x.quadraticCurveTo(-16, 2, -15, -6); }, c, 2.6);
    blob(x, [pE(x, -3, 4, 10, 8.5), pE(x, -7, 8, 5.5, 5.5), pR(x, 1.5, 3, 3.6, 10.5, 1.5), pR(x, 6, 3, 3.6, 10.5, 1.5), pE(x, 3.5, 13.5, 3, 1.6), pE(x, 8, 13.5, 3, 1.6), pE(x, -8, 13, 4, 1.8), pE(x, 5, -9, 7, 6.5), pE(x, 11, -7, 5.5, 3.8)], c);
    E(x, 3, 3, 4, 6, lt); E(x, 12, -6, 4, 2.6, lt);
    EL(x, 1, -7, 3, 6.5, 0.35, dk, 1);
    C(x, 16, -8, 1.7, '#222'); C(x, 15.6, -8.6, 0.5, '#888');
    arcL(x, 13, -6, 2.4, 0.5, 1.9, '#222', 0.7);
    eye(x, 7.5, -11, 1.3);
    band(x, () => { x.beginPath(); x.moveTo(0.5, -3.2); x.quadraticCurveTo(5, -1.5, 10, -3.5); }, '#e00000', 1.8);
    C(x, 6, -1.6, 1.4, '#f4c400', 1);
  } });
  P(21, { n: 'Bunny', cat: 'pets', box: [-10, -29, 10, 15], pal: ['#ffffff', '#d8c8b8', '#a08060', '#8a8a90', '#fff0f6'], pos: [260, 190], d(x, c) {
    const lt = lum(c) > 0.9 ? '#fff' : shade(c, 0.45);
    blob(x, [pE(x, -3.6, -19, 2.8, 8.5, -0.14), pE(x, 3.6, -19, 2.8, 8.5, 0.14), pE(x, 0, 5, 8.5, 8), pE(x, 0, -7, 6.6, 6.2), pE(x, -5, 12.5, 3.6, 1.9), pE(x, 5, 12.5, 3.6, 1.9)], c);
    EL(x, -3.6, -19, 1.3, 6, -0.14, '#ffb0c8'); EL(x, 3.6, -19, 1.3, 6, 0.14, '#ffb0c8');
    E(x, 0, 7, 5, 5, lt);
    eyes(x, 0, -8, 2.6, 1.2);
    C(x, -4, -5, 1.3, 'rgba(255,120,160,.35)'); C(x, 4, -5, 1.3, 'rgba(255,120,160,.35)');
    PL(x, [-1, -5.8, 1, -5.8, 0, -4.8], '#ff7fa0');
    R(x, -1, -4, 2, 1.8, '#fff'); x.lineWidth = 0.4; x.strokeRect(-1, -4, 2, 1.8); x.lineWidth = 0.9;
    [[-2, -5, -8, -6], [-2, -4.6, -8, -3.6], [2, -5, 8, -6], [2, -4.6, 8, -3.6]].forEach(q => LN(x, q, '#666', 0.35));
  } });
  P(22, { n: 'Flower', cat: 'basic', box: [-10, -10, 10, 25], pal: PETAL, pos: [60, 190], d(x, c) {
    QL(x, 0, 0, 3, 12, 0, 24, '#2a8a2a', 1.6);
    EL(x, 4, 14, 4, 1.8, -0.5, '#3aa83a', 1); EL(x, -4, 18, 4, 1.8, 0.5, '#3aa83a', 1);
    for (let i = 0; i < 6; i++) { const a = i * TAU / 6; EL(x, Math.cos(a) * 5.4, Math.sin(a) * 5.4, 4.3, 2.7, a, c, 1); }
    C(x, 0, 0, 3.3, '#ffd000', 1); C(x, -0.8, -0.8, 0.8, '#fff3a0');
  } });
  P(23, { n: 'Heart', cat: 'basic', box: [-11.5, -10.5, 11.5, 10], pal: ['#e00000', '#ff5fa0', '#a000c0', '#ff9ec8', '#ffffff', '#f4c400', '#0050e0', '#202020'], pos: [160, 70], d(x, c) {
    heartPath(x, 0, 0, 1); paint(x, c, 1);
    EL(x, -5.5, -5, 2.2, 1.3, -0.6, 'rgba(255,255,255,.6)');
  } });
  P(24, { n: 'Music notes', cat: 'basic', box: [-10, -16, 11, 9], c0: 6, pos: [220, 70], d(x, c) {
    EL(x, -6.5, 6, 3.3, 2.3, -0.4, c, 1); EL(x, 6.5, 3, 3.3, 2.3, -0.4, c, 1);
    R(x, -3.9, -12, 1.3, 18, c); R(x, 9.1, -15, 1.3, 18, c);
    PL(x, [-3.9, -12, 10.4, -15.2, 10.4, -11.6, -3.9, -8.4], c, 1);
  } });
  P(25, { n: 'Sign', cat: 'basic', c0: 0, pos: [160, 40], tb(p) { const L = signLines(p.t); return [-L.w / 2 - 11, -L.h / 2, L.w / 2 + 11, L.h / 2 + 4]; }, d(x, c, p) {
    const L = signLines(p.t), hw = L.w / 2, hh = L.h / 2, dk = shade(c, -0.35);
    PL(x, [-hw + 4, -hh + 4, -hw - 11, -hh + 4, -hw - 6, 2, -hw - 11, hh + 4, -hw + 4, hh + 4], dk, 1);
    PL(x, [hw - 4, -hh + 4, hw + 11, -hh + 4, hw + 6, 2, hw + 11, hh + 4, hw - 4, hh + 4], dk, 1);
    PL(x, [-hw, hh, -hw + 4, hh + 4, -hw + 4, hh], shade(c, -0.6)); PL(x, [hw, hh, hw - 4, hh + 4, hw - 4, hh], shade(c, -0.6));
    R(x, -hw, -hh, L.w, L.h, c, 1); R(x, -hw + 2, -hh + 2, L.w - 4, 1.2, 'rgba(255,255,255,.4)');
    x.fillStyle = ink(c); x.font = SIGNF; x.textAlign = 'center'; x.textBaseline = 'middle';
    L.ls.forEach((l, i) => x.fillText(l, 0, -hh + 10 + i * 12));
  } });
  P(26, { n: 'Camera', cat: 'basic', box: [-13.5, -10.5, 13.5, 8.5], c0: 1, pos: [200, 120], d(x, c) {
    R(x, -9, -10, 4, 2, '#e00000', 1);
    RR(x, -13, -8, 26, 16, 2.5, '#d0d0d8', 1); R(x, -13, -3, 26, 6, c); RR(x, -13, -8, 26, 16, 2.5, null, 1);
    C(x, 2, 0, 6.5, '#333', 1); C(x, 2, 0, 4.3, '#111'); C(x, 2, 0, 2.6, '#3a4a8a'); C(x, 0.9, -1.2, 1, '#fff');
    R(x, -11.5, -6.5, 5, 3, '#fffde0', 1); R(x, 8, -6.5, 3.5, 2.5, '#222');
  } });
  P(27, { n: 'Teddy bear', cat: 'pets', box: [-13, -19, 13, 14.5], c0: 0, pos: [240, 185], d(x, c) {
    const f = '#b07a44', l = '#e6c49a';
    blob(x, [pE(x, -6, -15, 3.3, 3.3), pE(x, 6, -15, 3.3, 3.3), pE(x, -9, 1, 3, 5.5, 0.5), pE(x, 9, 1, 3, 5.5, -0.5), pE(x, 0, 3, 7.5, 8.5), pE(x, -5, 10, 4.2, 4.2), pE(x, 5, 10, 4.2, 4.2), pE(x, 0, -10, 7, 6.6)], f);
    C(x, -6, -15, 1.8, l); C(x, 6, -15, 1.8, l); E(x, 0, 5, 4.5, 5, l); C(x, -5, 11, 2.3, l); C(x, 5, 11, 2.3, l);
    E(x, 0, -7.5, 3.6, 2.6, l, 1); E(x, 0, -8.6, 1.4, 0.95, '#222'); smile(x, 0, -8, 1.8, '#222', 0.6);
    C(x, -2.8, -11.5, 1.1, '#000'); C(x, 2.8, -11.5, 1.1, '#000'); C(x, -2.5, -11.9, 0.35, '#fff'); C(x, 3.1, -11.9, 0.35, '#fff');
    PL(x, [0, -3, -4.5, -5.5, -4.5, -0.5], c, 1); PL(x, [0, -3, 4.5, -5.5, 4.5, -0.5], c, 1); C(x, 0, -3, 1.3, c, 1);
  } });

  // ---- Extras pack props (each pack has its own number range) ----
  const DINO = ['#5ab04a', '#e07a40', '#5a8ad0', '#a068c8', '#e0c040', '#40a8a0'];
  const PK = (pack, k, o) => P(k, Object.assign({ cat: pack, pack }, o));
  // Winter Holidays 100-
  PK('holiday', 100, { n: 'Snowman', box: [-16, -29, 16, 21], pos: [230, 176], d(x, c) {
    LN(x, [-6, -6, -15, -12, -17, -11], '#6b3b10', 1.1); LN(x, [-12, -10, -13, -14], '#6b3b10', 0.9); LN(x, [6, -6, 15, -11, 17, -13], '#6b3b10', 1.1);
    blob(x, [pE(x, 0, 10, 10, 10), pE(x, 0, -5, 7.5, 7.5), pE(x, 0, -17, 5.5, 5.5)], '#fff');
    E(x, 2, 13, 6, 5, '#e6eefa'); E(x, 2, -3, 4.5, 4, '#e6eefa');
    R(x, -4.5, -28, 9, 6.5, '#222'); R(x, -6.5, -22.5, 13, 1.6, '#222'); R(x, -4.5, -24.2, 9, 1.6, c);
    C(x, -2, -18.5, 0.9, '#000'); C(x, 2, -18.5, 0.9, '#000'); PL(x, [0, -16.8, 6.5, -15.8, 0, -15], '#ff7f00');
    [-2.4, -1.2, 0, 1.2, 2.4].forEach((X, i) => C(x, X, -13.6 + Math.abs(i - 2) * -0.4 + 0.8, 0.45, '#333'));
    R(x, -6.2, -12.6, 12.4, 3, c, 1); R(x, 1.8, -11, 3, 7.5, c, 1);
    C(x, 0, -6, 1, '#222'); C(x, 0, -2.5, 1, '#222'); C(x, 0, 1.5, 1, '#222');
  } });
  PK('holiday', 101, { n: 'Sled', box: [-20, -4, 20, 9], pos: [160, 196], d(x, c) {
    const s0 = x.strokeStyle; x.strokeStyle = '#555'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(-18, 7); x.lineTo(12, 7); x.quadraticCurveTo(19, 7, 18, 1); x.stroke(); x.strokeStyle = s0; x.lineWidth = 0.9;
    [-12, 0, 10].forEach(X => LN(x, [X, 1, X, 7], '#555', 1.2));
    RR(x, -17, -2, 30, 4, 1.5, c, 1); [-10, -3, 4].forEach(X => LN(x, [X, -1.5, X, 1.5], shade(c, -0.35), 0.5));
    QL(x, 13, 0, 18, -7, 20, -2, '#8a5424', 0.8);
  } });
  PK('holiday', 102, { n: 'Candy cane', box: [-11, -14, 5, 19], nc: 1, pos: [200, 150], d(x) {
    const path = () => { x.beginPath(); x.moveTo(2, 18); x.lineTo(2, -6); x.arc(-3, -6, 5, 0, Math.PI, true); x.lineTo(-8, -2); };
    band(x, path, '#fff', 3.8); const s0 = x.strokeStyle; path(); x.setLineDash([2.6, 2.6]); x.strokeStyle = '#e00000'; x.lineWidth = 3.8; x.lineCap = 'butt'; x.stroke(); x.setLineDash([]); x.lineCap = 'round'; x.strokeStyle = s0; x.lineWidth = 0.9;
  } });
  PK('holiday', 103, { n: 'Snowflake', box: [-13, -13, 13, 13], pal: ['#ffffff', '#9ad8ff', '#c8e8ff', '#f4c400', '#e0d0ff'], pos: [120, 60], d(x, c) {
    const arms = () => { x.beginPath(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3, ca = Math.cos(a), sa = Math.sin(a), P2 = (u, v) => [u * ca - v * sa, u * sa + v * ca]; const L = (p, q) => { x.moveTo(...P2(...p)); x.lineTo(...P2(...q)); }; L([0, 0], [12, 0]); L([7, 0], [10, 3.5]); L([7, 0], [10, -3.5]); L([4, 0], [6, 2.5]); L([4, 0], [6, -2.5]); } };
    const s0 = x.strokeStyle; arms(); x.strokeStyle = '#4a6a98'; x.lineWidth = 2.8; x.stroke(); x.strokeStyle = c; x.lineWidth = 1.5; x.stroke(); x.strokeStyle = s0; x.lineWidth = 0.9;
    C(x, 0, 0, 1.8, c, 1);
  } });
  PK('holiday', 104, { n: 'Mitten', box: [-9, -11, 12, 12], pos: [120, 120], d(x, c) {
    EL(x, 7, -2, 3, 5, 0.6, c, 1); RR(x, -7, -10, 13, 16, 6, c, 1); EL(x, 6, -2.5, 1.8, 3.6, 0.6, c);
    R(x, -7, -2, 13, 1.6, '#fff'); [-4, 0, 4].forEach(X => C(x, X, 1.5, 0.8, '#fff'));
    RR(x, -8, 5, 15, 6, 1.5, '#fff', 1); [-5, -2, 1, 4].forEach(X => LN(x, [X, 6, X, 10], '#ddd', 0.6));
  } });
  PK('holiday', 105, { n: 'Holiday tree', box: [-17.5, -31, 17.5, 22], nc: 1, anim: 1, pos: [60, 160], d(x, c, p, T) {
    R(x, -3, 16, 6, 6, '#6b3b10', 1);
    PL(x, [0, -4, 17, 17, -17, 17], '#1e7a34', 1); PL(x, [0, -14, 13, 5, -13, 5], '#23893a', 1); PL(x, [0, -24, 9, -7, -9, -7], '#2a9a44', 1);
    QL(x, -10, 1, 0, 6, 11, 0, '#f4c400', 1); QL(x, -14, 12, 0, 18, 14, 11, '#f4c400', 1);
    [[-6, -2, '#e00000'], [6, -6, '#0050e0'], [-10, 12, '#f4c400'], [9, 11, '#e00000'], [0, 8, '#a000c0'], [-3, -14, '#ff7f00'], [3, 14, '#0050e0'], [4, -12, '#e00000']].forEach(([X, Y, f]) => C(x, X, Y, 1.7, f, 1));
    [[-4, 3], [5, 3], [-8, 8], [8, 6], [0, -9], [-12, 15], [12, 15], [1, 1]].forEach(([X, Y], i) => C(x, X, Y, 0.9, (Math.floor(T * 3) + i) % 3 ? '#fff6a0' : '#ff8a8a'));
    star(x, 0, -25, 5, 2); paint(x, '#ffd400', 1);
  } });
  PK('holiday', 106, { n: 'Hot cocoa', box: [-9, -19, 14, 9.5], pos: [200, 160], d(x, c) {
    [-3, 2.5].forEach(X => { const s0 = x.strokeStyle; x.beginPath(); x.moveTo(X, -11); x.bezierCurveTo(X - 3, -13, X + 3, -15, X, -18); x.strokeStyle = 'rgba(160,160,170,.8)'; x.lineWidth = 1; x.stroke(); x.strokeStyle = s0; x.lineWidth = 0.9; });
    band(x, () => { x.beginPath(); x.arc(8, 0.5, 4.5, -1.3, 1.3); }, c, 1.8);
    RR(x, -8, -8, 16, 17, 2, c, 1); E(x, 0, -8, 8, 2.2, '#6b3b20', 1);
    RR(x, -4.5, -10, 3.2, 2.4, 0.6, '#fff', 1); RR(x, 0.8, -10.5, 3.2, 2.4, 0.6, '#fff', 1);
    heartPath(x, 0, 1, 0.3); paint(x, ink(c) === '#fff' ? '#fff' : '#e00000');
  } });
  PK('holiday', 107, { n: 'Wreath', box: [-15, -15, 15, 18], pos: [160, 70], d(x, c) {
    band(x, () => { x.beginPath(); x.arc(0, 0, 11, 0, TAU); }, '#1e7a34', 6);
    for (let i = 0; i < 20; i++) { const a = i * TAU / 20; EL(x, Math.cos(a) * 11, Math.sin(a) * 11, 3.2, 1.6, a + 0.8, i % 2 ? '#2a9a44' : '#16602a'); }
    [0.4, 1.3, 2.4, 3.6, 4.3, 5.4].forEach(a => C(x, Math.cos(a) * 11, Math.sin(a) * 11, 1.3, '#e00000', 1));
    PL(x, [0, 11, -3, 18, -1, 17.5, 0, 12], c, 1); PL(x, [0, 11, 3, 18, 1, 17.5, 0, 12], c, 1);
    EL(x, -3.5, 10, 3.6, 2.2, -0.3, c, 1); EL(x, 3.5, 10, 3.6, 2.2, 0.3, c, 1); C(x, 0, 10.5, 1.5, c, 1);
  } });
  PK('holiday', 108, { n: 'Gingerbread cookie', box: [-13, -17, 13, 16], nc: 1, pos: [120, 160], d(x) {
    blob(x, [pE(x, 0, -10, 5.8, 5.8), pE(x, 0, 1, 6, 8), pE(x, -8, -2, 5.2, 2.7, -0.35), pE(x, 8, -2, 5.2, 2.7, 0.35), pE(x, -3.6, 9, 2.9, 5.6, 0.3), pE(x, 3.6, 9, 2.9, 5.6, -0.3)], '#c47a3a');
    C(x, -2.1, -11, 0.9, '#3a1a0a'); C(x, 2.1, -11, 0.9, '#3a1a0a'); smile(x, 0, -9.5, 2.2, '#fff', 0.8);
    [[-11.5, -3.5, -11.5, -0.5], [11.5, -3.5, 11.5, -0.5], [-6.5, 12, -4.5, 13.5], [6.5, 12, 4.5, 13.5]].forEach(q => LN(x, q, '#fff', 0.9));
    C(x, 0, -2, 1.2, '#e00000'); C(x, 0, 2, 1.2, '#00a000'); C(x, 0, 6, 1.2, '#e00000');
  } });
  PK('holiday', 109, { n: 'Ornament', box: [-9.5, -16, 9.5, 9.5], pos: [200, 90], d(x, c) {
    arcL(x, 0, -14, 1.6, 0, TAU, '#888', 0.7);
    R(x, -2.5, -12.5, 5, 3.2, '#c8a030', 1); C(x, 0, 0, 9, c, 1);
    x.save(); C(x, 0, 0, 9); x.clip(); R(x, -9, -3, 18, 2.2, '#fff'); R(x, -9, 2.4, 18, 1.3, '#f4c400'); x.restore();
    C(x, 0, 0, 9, null, 1); EL(x, -3.5, -3.5, 2.4, 1.5, -0.7, 'rgba(255,255,255,.7)');
  } });
  PK('holiday', 110, { n: 'Stocking', box: [-7, -16, 14, 13], pos: [230, 90], d(x, c) {
    x.beginPath(); x.moveTo(-5, -11); x.lineTo(5, -11); x.lineTo(5, 1); x.bezierCurveTo(7, 2, 13, 2, 13, 7); x.bezierCurveTo(13, 11, 9, 12, 6, 12); x.lineTo(0, 12); x.bezierCurveTo(-5, 12, -6, 8, -5, 4); x.closePath(); paint(x, c, 1);
    [-6, -2, 2].forEach(Y => LN(x, [-5, Y, 5, Y], 'rgba(255,255,255,.55)', 1));
    RR(x, -6.5, -15, 13, 5.5, 1.5, '#fff', 1);
  } });

  // Spooky Fun 120-
  PK('spooky', 120, { n: 'Pumpkin face', box: [-12.5, -14, 12.5, 10.5], pal: ['#ff8a1a', '#f4f0e0', '#f4c400', '#8ac040'], anim: 1, pos: [120, 188], d(x, c, p, T) {
    R(x, -1.5, -13, 3, 4.5, '#3a7a2a', 1);
    E(x, -5, 0, 7, 9.5, shade(c, -0.08), 1); E(x, 5, 0, 7, 9.5, shade(c, -0.08), 1); E(x, 0, 0, 7.5, 10, c, 1);
    const g = `rgb(255,${Math.round(205 + 30 * Math.sin(T * 9))},60)`;
    PL(x, [-6.5, -2, -2.5, -2, -4.5, -5.5], g); PL(x, [6.5, -2, 2.5, -2, 4.5, -5.5], g); PL(x, [-1, 0.5, 1, 0.5, 0, -1.2], g);
    x.beginPath(); x.moveTo(-6, 2.5); x.quadraticCurveTo(0, 10, 6, 2.5); x.quadraticCurveTo(0, 6, -6, 2.5); x.fillStyle = g; x.fill();
  } });
  PK('spooky', 121, { n: 'Friendly ghost', box: [-11.5, -13, 11.5, 13], nc: 1, pos: [220, 90], d(x) {
    x.beginPath(); x.moveTo(-10, 12); x.lineTo(-10, -2); x.arc(0, -2, 10, Math.PI, 0); x.lineTo(10, 12);
    for (let i = 0; i < 4; i++) { const X = 10 - i * 5; x.quadraticCurveTo(X - 2.5, 8, X - 5, 12); }
    x.closePath(); const s0 = x.strokeStyle; x.fillStyle = 'rgba(255,255,255,.95)'; x.fill(); x.strokeStyle = '#6a6a8a'; x.stroke(); x.strokeStyle = s0;
    EL(x, -11, 2, 2, 3.5, 0.6, '#fff'); EL(x, 11, 2, 2, 3.5, -0.6, '#fff');
    E(x, -3.5, -3, 1.6, 2.4, '#222'); E(x, 3.5, -3, 1.6, 2.4, '#222'); C(x, -3, -3.8, 0.5, '#fff'); C(x, 4, -3.8, 0.5, '#fff');
    E(x, 0, 3, 1.8, 2.3, '#222'); C(x, -6, 0.5, 1.4, 'rgba(255,130,170,.4)'); C(x, 6, 0.5, 1.4, 'rgba(255,130,170,.4)');
  } });
  PK('spooky', 122, { n: 'Bat', box: [-17, -10, 17, 7], pal: ['#4a2a6a', '#303030', '#6a4a3a', '#7a3aa0'], pos: [240, 60], d(x, c) {
    [-1, 1].forEach(s => { x.beginPath(); x.moveTo(3 * s, -3); x.quadraticCurveTo(9 * s, -10, 16.5 * s, -6); x.quadraticCurveTo(13 * s, -2.5, 14 * s, 2); x.quadraticCurveTo(11 * s, -0.5, 9 * s, 3); x.quadraticCurveTo(6 * s, 0, 3 * s, 3); x.closePath(); paint(x, c, 1); });
    blob(x, [pE(x, 0, 0, 5, 6), pP(x, [-4, -3, -4, -9, -1, -5]), pP(x, [4, -3, 4, -9, 1, -5])], c);
    C(x, -1.9, -1, 1.7, '#fff'); C(x, 1.9, -1, 1.7, '#fff'); C(x, -1.6, -0.8, 0.8, '#000'); C(x, 2.2, -0.8, 0.8, '#000');
    PL(x, [-1.2, 2.2, -0.6, 2.2, -0.9, 3.4], '#fff'); PL(x, [1.2, 2.2, 0.6, 2.2, 0.9, 3.4], '#fff');
  } });
  PK('spooky', 123, { n: 'Candy bucket', box: [-10.5, -15, 10.5, 11.5], pal: ['#ff8a1a', '#a000c0', '#f4f0e0', '#00a000'], pos: [200, 190], d(x, c) {
    arcL(x, 0, -4, 10, Math.PI, 0, '#333', 1.2);
    C(x, -4, -6.5, 2.2, '#e00000', 1); RR(x, 0, -8.5, 5, 2.6, 1, '#0050e0', 1); C(x, 4.5, -6, 1.8, '#f4c400', 1);
    E(x, 0, 2, 10, 9, c, 1); E(x, 0, -5, 9, 2.4, shade(c, -0.35), 1);
    const f = shade(c, -0.55); PL(x, [-5, -1, -2, -1, -3.5, -3.5], f); PL(x, [5, -1, 2, -1, 3.5, -3.5], f);
    x.beginPath(); x.moveTo(-5, 3); x.quadraticCurveTo(0, 9, 5, 3); x.quadraticCurveTo(0, 5.5, -5, 3); x.fillStyle = f; x.fill();
  } });
  PK('spooky', 124, { n: 'Witch hat', box: [-15.5, -18, 15.5, 12], pal: ['#303048', '#5a2a80', '#1e6a34', '#202020'], pos: [160, 106], d(x, c) {
    E(x, 0, 8, 15, 3.5, c, 1);
    x.beginPath(); x.moveTo(-8, 7.5); x.lineTo(-2, -7); x.quadraticCurveTo(2, -15, 9, -17); x.quadraticCurveTo(3, -9, 8, 7.5); x.closePath(); paint(x, c, 1);
    R(x, -7.4, 2.5, 15, 3.2, '#a000c0'); RR(x, -2, 2, 4, 4.2, 0.5, null); const s0 = x.strokeStyle; x.strokeStyle = '#f4c400'; x.lineWidth = 1; x.stroke(); x.strokeStyle = s0; x.lineWidth = 0.9;
    star(x, 3, -4, 2, 0.8); paint(x, '#f4c400');
  } });
  PK('spooky', 125, { n: 'Spider', box: [-11, -24, 11, 8], pal: ['#303030', '#6a3aa0', '#8a5a2a', '#1e7a34'], pos: [260, 80], d(x, c) {
    LN(x, [0, -24, 0, -5], '#bbb', 0.6);
    [-1, 1].forEach(s => [[-2, -8, -6], [0, -9, -1], [2, -9, 4], [4, -7, 8]].forEach(([y0, xm, ye]) => { band(x, () => { x.beginPath(); x.moveTo(3 * s, y0 * 0.5); x.quadraticCurveTo(-xm * s, y0 - 3, 10 * s, ye); }, c, 0.9); }));
    C(x, 0, 0, 5.5, c, 1);
    C(x, -2, -1, 1.9, '#fff'); C(x, 2, -1, 1.9, '#fff'); C(x, -1.7, -0.7, 0.9, '#000'); C(x, 2.3, -0.7, 0.9, '#000');
    smile(x, 0, 1, 1.6, '#fff', 0.6);
  } });
  PK('spooky', 126, { n: 'Wrapped candy', box: [-12.5, -6, 12.5, 6], pal: RAINBOW, pos: [140, 190], d(x, c) {
    PL(x, [-6, 0, -12, -5, -12, 5], c, 1); PL(x, [6, 0, 12, -5, 12, 5], c, 1);
    E(x, 0, 0, 7, 5, c, 1);
    x.save(); E(x, 0, 0, 7, 5); x.clip(); [-6, -2, 2, 6].forEach(X => LN(x, [X - 3, 6, X + 3, -6], 'rgba(255,255,255,.7)', 1.2)); x.restore();
    E(x, 0, 0, 7, 5, null, 1);
  } });
  PK('spooky', 127, { n: 'Broomstick', box: [-23, -8, 24, 8], nc: 1, pos: [160, 150], d(x) {
    band(x, () => { x.beginPath(); x.moveTo(-22, 0); x.lineTo(6, 0); }, '#8a5a2a', 2.2);
    PL(x, [6, -2.5, 22, -7, 23.5, 7, 6, 2.5], '#e8c860', 1);
    [-4, -1.5, 1, 3.5].forEach(Y => LN(x, [9, Y * 0.6, 22, Y * 1.6], '#c8a040', 0.6));
    R(x, 4, -3, 3.5, 6, '#a02020', 1);
  } });
  PK('spooky', 128, { n: 'Owl', box: [-10.5, -15, 10.5, 15], pal: ['#8a5a3a', '#a0a0a8', '#d8c090', '#6a4a8a'], pos: [260, 120], d(x, c) {
    blob(x, [pE(x, 0, 2, 9, 11.5), pP(x, [-8, -6, -7.5, -14, -3, -8]), pP(x, [8, -6, 7.5, -14, 3, -8])], c);
    E(x, 0, 5, 6, 7, shade(c, 0.4)); [[-2.5, 3], [2.5, 3], [0, 6], [-2.5, 9], [2.5, 9]].forEach(([X, Y]) => arcL(x, X, Y, 1.2, 0.2, Math.PI - 0.2, shade(c, -0.2), 0.6));
    EL(x, -8.5, 3, 2.4, 6, 0.15, shade(c, -0.2), 1); EL(x, 8.5, 3, 2.4, 6, -0.15, shade(c, -0.2), 1);
    [-3.8, 3.8].forEach(X => { C(x, X, -4, 3.6, '#fff', 1); C(x, X, -4, 2, '#f4a000'); C(x, X, -4, 1.1, '#000'); C(x, X + 0.5, -4.6, 0.4, '#fff'); });
    PL(x, [-1.3, -1.5, 1.3, -1.5, 0, 1.3], '#f4a000', 1);
    [-3, 3].forEach(X => [-1, 0, 1].forEach(k => LN(x, [X, 12.5, X + k * 1.2, 14.5], '#f4a000', 0.8)));
  } });
  PK('spooky', 129, { n: 'Bubbling pot', box: [-12.5, -15, 12.5, 13], pal: ['#6ad040', '#b050e0', '#ff8a1a', '#40a0ff'], anim: 1, pos: [160, 186], d(x, c, p, T) {
    R(x, -9, 8, 2.5, 5, '#333'); R(x, 6.5, 8, 2.5, 5, '#333');
    E(x, 0, 2, 12, 9.5, '#2e2e36', 1); E(x, 0, -6, 11, 2.8, '#50505a', 1); E(x, 0, -6, 9.2, 1.9, c);
    for (let i = 0; i < 3; i++) { const ph = (T * 0.9 + i * 0.33) % 1; C(x, -4 + i * 4, -7 - ph * 8, 1 + ph * 1.2, c, 1); }
    EL(x, -6, 0, 1.5, 4, 0.3, 'rgba(255,255,255,.15)');
  } });

  // Adventure 140-
  PK('adventure', 140, { n: 'Treasure chest', box: [-15, -19, 15, 12], nc: 1, pos: [200, 188], d(x) {
    PL(x, [-14, -4, -12, -18, 12, -18, 14, -4], '#6a3a18', 1); R(x, -10, -16, 20, 11, '#4a2810');
    [[-8, -5], [-3, -7], [3, -6.5], [8, -5], [0, -9], [-5, -10], [5, -10], [0, -12.5]].forEach(([X, Y]) => { C(x, X, Y, 3, '#ffd23a'); const s0 = x.strokeStyle; x.strokeStyle = '#a07000'; x.lineWidth = 0.6; x.stroke(); x.strokeStyle = s0; x.lineWidth = 0.9; });
    C(x, -2, -7, 1.6, '#e00000', 1); C(x, 5, -8.5, 1.4, '#00a0e0', 1);
    R(x, -14, -4, 28, 15.5, '#9a6430', 1); [-8.5, 5.5].forEach(X => R(x, X, -4, 3, 15.5, '#e8b828', 1));
    RR(x, -2.5, -3, 5, 6, 1, '#e8b828', 1); C(x, 0, -0.8, 0.9, '#333'); R(x, -0.4, -0.5, 0.8, 2, '#333');
    star(x, 11, -14, 3, 0.9, 4); paint(x, '#fff');
  } });
  PK('adventure', 141, { n: 'Parrot', box: [-8.5, -16, 12, 22], pal: ['#e00000', '#00a000', '#0050e0', '#f4c400'], pos: [250, 110], d(x, c) {
    PL(x, [-2.5, 7, 2, 7, 3.5, 21, -1.5, 21.5], '#0050e0', 1); PL(x, [0, 7, 2.5, 7, 6, 20, 2, 21], '#f4c400', 1);
    band(x, () => { x.beginPath(); x.moveTo(-8, 9.5); x.lineTo(10, 9.5); }, '#8a5424', 1.8);
    EL(x, 0.5, 0, 6, 10, 0.15, c, 1);
    EL(x, -1.5, 2, 4, 8, 0.2, shade(c, -0.2), 1); EL(x, -2, 6, 2.6, 3.5, 0.2, '#0050e0'); EL(x, -1.5, 3, 2.8, 2, 0.2, '#f4c400');
    C(x, 1.5, -10, 5.5, c, 1); E(x, 3.5, -11, 2.5, 2.3, '#fff'); eye(x, 3.8, -11, 1);
    x.beginPath(); x.moveTo(5.5, -12); x.quadraticCurveTo(12, -12, 9.5, -5); x.quadraticCurveTo(8, -7.5, 5.5, -7.5); x.closePath(); paint(x, '#f0e0b0', 1);
    [-1.5, 2.5].forEach(X => LN(x, [X, 8.5, X - 1, 10.5], '#777', 0.8));
  } });
  PK('adventure', 142, { n: 'Treasure map', box: [-17.5, -11.5, 17.5, 11.5], nc: 1, pos: [160, 130], d(x) {
    x.beginPath(); x.moveTo(-15, -10); for (let X = -15; X <= 15; X += 5) x.lineTo(X, -10 + (X % 10 ? 0.8 : -0.4)); x.lineTo(15, 10); for (let X = 15; X >= -15; X -= 5) x.lineTo(X, 10 + (X % 10 ? -0.6 : 0.5)); x.closePath();
    paint(x, '#f2dca0'); const s0 = x.strokeStyle; x.strokeStyle = '#8a6a2a'; x.stroke(); x.strokeStyle = s0;
    E(x, -15, 0, 2.2, 10.5, '#e2c888', 1); E(x, 15, 0, 2.2, 10.5, '#e2c888', 1);
    x.beginPath(); x.moveTo(-2, 2); x.bezierCurveTo(-7, -6, 6, -9, 9, -3); x.bezierCurveTo(12, 3, 4, 8, -2, 2); paint(x, '#8ac860');
    x.setLineDash([1.6, 1.4]); QL(x, -11, 7, -6, -6, 3, -1, '#c02020', 0.9); x.setLineDash([]);
    LN(x, [1.5, -2.5, 4.5, 0.5], '#c02020', 1.3); LN(x, [4.5, -2.5, 1.5, 0.5], '#c02020', 1.3);
    star(x, -9, -5, 2.5, 0.8, 4); paint(x, '#8a6a2a');
  } });
  PK('adventure', 143, { n: 'Spyglass', box: [-16.5, -4.7, 18, 4.7], nc: 1, pos: [170, 110], d(x) {
    R(x, -16, -2.5, 10, 5, '#8a5424', 1); R(x, -6, -3.3, 10, 6.6, '#b8862e', 1); R(x, 4, -4.2, 12, 8.4, '#8a5424', 1);
    [-7, 3, 14].forEach(X => R(x, X, -4.4, 1.8, 8.8, '#e8b828', 1));
    E(x, 16.3, 0, 1.4, 4, '#9ad8ff', 1);
  } });
  PK('adventure', 144, { n: 'Compass', box: [-11.5, -15.5, 11.5, 11.5], nc: 1, pos: [140, 120], d(x) {
    arcL(x, 0, -12.8, 2, 0, TAU, '#c09020', 1);
    C(x, 0, 0, 11, '#e8b828', 1); C(x, 0, 0, 8.6, '#fffbe8', 1);
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r1 = i % 2 ? 7 : 6; LN(x, [Math.cos(a) * r1, Math.sin(a) * r1, Math.cos(a) * 8.3, Math.sin(a) * 8.3], '#8a6a2a', 0.6); }
    PL(x, [0, -7, 2, 0, -2, 0], '#e00000'); PL(x, [0, 7, 2, 0, -2, 0], '#445'); C(x, 0, 0, 1, '#333');
  } });
  PK('adventure', 145, { n: 'Anchor', box: [-12.5, -19, 12.5, 13], pal: ['#707888', '#303848', '#e8b828', '#8a5424'], pos: [220, 180], d(x, c) {
    band(x, () => { x.beginPath(); x.arc(0, -15, 3, 0, TAU); x.moveTo(0, -12); x.lineTo(0, 11); x.moveTo(-7, -7); x.lineTo(7, -7); x.moveTo(-10, 2); x.arc(0, 1, 10, Math.PI * 1.05, Math.PI * 1.95, true); }, c, 2.6);
    PL(x, [-12, 1, -8.5, -1.5, -9, 4], c, 1); PL(x, [12, 1, 8.5, -1.5, 9, 4], c, 1);
  } });
  PK('adventure', 146, { n: 'Gold coins', box: [-11.5, -8, 12, 10.5], nc: 1, pos: [120, 196], d(x) {
    for (let i = 0; i < 5; i++) { E(x, -5, 7 - i * 2.6, 6, 2.3, '#e0a800', 1); E(x, -5, 6.3 - i * 2.6, 5.6, 1.8, '#ffd23a'); }
    C(x, 7, 5.5, 4.8, '#ffd23a', 1); C(x, 7, 5.5, 3.3, null, 1); star(x, 7, 5.5, 2, 0.8); paint(x, '#e0a800');
    star(x, -9, -6, 2.4, 0.7, 4); paint(x, '#fff');
  } });
  PK('adventure', 147, { n: 'Shield', box: [-10.5, -11.5, 10.5, 14.5], c0: 1, pos: [120, 150], d(x, c) {
    const sh = k => { x.beginPath(); x.moveTo(-10 * k, -11 * k); x.lineTo(10 * k, -11 * k); x.lineTo(10 * k, 0); x.quadraticCurveTo(10 * k, 9 * k, 0, 14 * k); x.quadraticCurveTo(-10 * k, 9 * k, -10 * k, 0); x.closePath(); };
    sh(1); paint(x, '#c8ccd4', 1); x.save(); x.translate(0, 0.6); sh(0.82); paint(x, c, 1); x.restore();
    PL(x, [-6, 1, 0, -4, 6, 1, 6, 4, 0, -1, -6, 4], '#f4c400', 1);
    [[-8, -9], [8, -9], [0, 11]].forEach(([X, Y]) => C(x, X, Y, 0.8, '#888'));
  } });
  PK('adventure', 148, { n: 'Knight helmet', box: [-8.5, -22, 9, 10.5], c0: 0, pos: [160, 110], d(x, c) {
    EL(x, 1, -15, 3, 6.5, 0.35, c, 1); EL(x, 3, -17.5, 1.5, 3.2, 0.5, shade(c, 0.35));
    x.beginPath(); x.moveTo(-8, 10); x.lineTo(-8, -3); x.arc(0, -3, 8, Math.PI, 0); x.lineTo(8, 10); x.closePath(); paint(x, '#c0c4cc', 1);
    LN(x, [0, -11, 0, -4], '#888', 0.8); R(x, -6, -3, 12, 1.7, '#222'); R(x, -6, 0.5, 12, 1.3, '#222');
    [[-3, 5], [0, 5], [3, 5], [-1.5, 7.5], [1.5, 7.5]].forEach(([X, Y]) => C(x, X, Y, 0.55, '#333'));
    EL(x, -4, -6, 1.4, 3, 0.3, 'rgba(255,255,255,.55)');
  } });
  PK('adventure', 149, { n: 'Torch', box: [-7, -22, 7, 16.5], nc: 1, anim: 1, pos: [60, 120], d(x, c, p, T) {
    PL(x, [-2, -2, 2, -2, 1, 16, -1, 16], '#8a5424', 1); R(x, -3, -4.5, 6, 4, '#6a3a18', 1);
    flame(x, 0, -4, 1.7, T, 1);
  } });
  PK('adventure', 150, { n: 'Flag', box: [-10, -23, 16.5, 20], c0: 0, pos: [250, 150], d(x, c) {
    R(x, -9, -20, 2, 40, '#8a5424', 1); C(x, -8, -21, 1.8, '#e8b828', 1);
    x.beginPath(); x.moveTo(-7, -18); x.quadraticCurveTo(0, -22, 6, -18); x.quadraticCurveTo(12, -14, 16, -17); x.lineTo(16, -3); x.quadraticCurveTo(12, 0, 6, -3); x.quadraticCurveTo(0, -7, -7, -3); x.closePath(); paint(x, c, 1);
    star(x, 3, -10.5, 3.4, 1.4); paint(x, ink(c) === '#fff' ? '#fff' : '#202020');
  } });

  // Dinosaurs 160-
  PK('dino', 160, { n: 'T. rex', box: [-26, -34, 26, 29], pal: DINO, pos: [230, 158], d(x, c) {
    const lt = shade(c, 0.4), dk = shade(c, -0.25);
    blob(x, [pP(x, [-6, 0, -25, 16, -24, 20, -3, 12]), pE(x, 0, 4, 11, 14, -0.35), pE(x, -3, 14, 6, 8), pE(x, 5, 16, 5, 7), pE(x, -3, 25, 6.5, 3), pE(x, 6, 25, 5.5, 3), pP(x, [2, -10, 7, -22, 14, -18, 10, -4]), pR(x, 4, -33, 21, 13, 6), pR(x, 7, -24, 17, 6, 3)], c);
    EL(x, 4, 7, 5, 9, -0.35, lt);
    [[-6, -2], [-9, 5], [-4, -7], [-14, 10]].forEach(([X, Y]) => C(x, X, Y, 1.6, dk));
    band(x, () => { x.beginPath(); x.moveTo(8, -2); x.lineTo(13, 1); x.lineTo(14.5, 3.5); }, c, 1.8);
    C(x, 15, -28, 2.6, '#fff'); C(x, 15.8, -28, 1.3, '#000'); C(x, 16.2, -28.6, 0.4, '#fff');
    C(x, 22.5, -29.5, 0.6, '#000'); arcL(x, 17, -26, 5.5, 0.3, 1.25, '#000', 0.8);
    [[8, -21.2], [11, -21.2], [14, -21.2]].forEach(([X, Y]) => PL(x, [X, Y, X + 1.5, Y, X + 0.75, Y + 1.8], '#fff'));
  } });
  PK('dino', 161, { n: 'Stegosaurus', box: [-34, -15, 27, 21], pal: DINO, c0: 2, pos: [160, 176], d(x, c) {
    const pl = '#f09030';
    [[-12, -5, 5], [-5, -10, 6], [3, -10, 6], [10, -6, 5], [-18, 0, 4]].forEach(([X, Y, s]) => PL(x, [X - s, Y + 5, X, Y - s, X + s, Y + 5], pl, 1));
    PL(x, [-31, 9, -34, 5, -30, 7], '#fff', 1); PL(x, [-28, 8, -30, 3, -26, 7], '#fff', 1);
    blob(x, [pE(x, 0, 4, 16, 10), pP(x, [-13, 1, -32, 8, -13, 10]), pE(x, 20, 7, 6.5, 4.5), pP(x, [12, 1, 17, 3, 16, 9, 12, 8]), pR(x, -11, 9, 5, 11, 2), pR(x, -3, 10, 5, 10, 2), pR(x, 5, 10, 5, 10, 2), pR(x, 11, 9, 5, 11, 2)], c);
    E(x, 0, 9, 11, 3.5, shade(c, 0.3));
    eye(x, 22, 5.5, 1.1); arcL(x, 22, 7, 3, 0.4, 1.5, '#000', 0.7);
  } });
  PK('dino', 162, { n: 'Long-neck', box: [-35, -34, 25, 23], pal: DINO, c0: 5, pos: [120, 170], d(x, c) {
    blob(x, [pE(x, -4, 8, 15, 10), pP(x, [3, 4, 12, -26, 20, -26, 12, 8]), pE(x, 18, -28, 6.5, 4.5), pP(x, [-16, 5, -34, 16, -17, 13]), pR(x, -15, 12, 5, 11, 2), pR(x, -8, 13, 5, 10, 2), pR(x, 1, 13, 5, 10, 2), pR(x, 7, 12, 5, 11, 2)], c);
    [[-9, 3], [-2, 1], [-12, 9], [5, 5], [9, -8]].forEach(([X, Y]) => C(x, X, Y, 1.8, shade(c, -0.2)));
    E(x, -4, 13, 10, 3, shade(c, 0.3));
    eye(x, 19, -30, 1.1); arcL(x, 20, -28.5, 3, 0.3, 1.4, '#000', 0.7);
  } });
  PK('dino', 163, { n: 'Triceratops', box: [-23, -14, 28, 20], pal: DINO, c0: 1, pos: [210, 175], d(x, c) {
    C(x, 11, -3, 9, shade(c, 0.25), 1); for (let a = -2.4; a < 0.8; a += 0.55) C(x, 11 + Math.cos(a) * 9, -3 + Math.sin(a) * 9, 1.2, shade(c, -0.2));
    blob(x, [pE(x, -2, 5, 14, 10), pP(x, [-13, 3, -23, 10, -13, 11]), pE(x, 16, 3, 8, 6), pR(x, -12, 10, 5, 10, 2), pR(x, -4, 11, 5, 9, 2), pR(x, 4, 11, 5, 9, 2), pR(x, 10, 10, 5, 10, 2)], c);
    PL(x, [13, -3, 24, -10, 15.5, 0], '#fff6e0', 1); PL(x, [17, -2, 27, -6, 19, 1], '#fff6e0', 1); PL(x, [21.5, 1, 26, -2, 23, 3.5], '#fff6e0', 1);
    PL(x, [23, 4, 28, 5.5, 23, 7], shade(c, -0.3));
    eye(x, 17, 1.5, 1.1); arcL(x, 19, 3.5, 3, 0.4, 1.5, '#000', 0.7);
    E(x, -2, 10, 10, 3, shade(c, 0.3));
  } });
  PK('dino', 164, { n: 'Pterodactyl', box: [-29, -17, 29, 9], pal: DINO, c0: 3, pos: [160, 60], d(x, c) {
    [-1, 1].forEach(s => { x.beginPath(); x.moveTo(2 * s, -3); x.lineTo(28 * s, -11); x.quadraticCurveTo(22 * s, -4, 23 * s, 2); x.quadraticCurveTo(15 * s, -2, 12 * s, 3); x.quadraticCurveTo(7 * s, 0, 3 * s, 4); x.closePath(); paint(x, shade(c, 0.15), 1); });
    blob(x, [pE(x, 0, 0, 4, 8), pE(x, 2, -9, 4.2, 4), pP(x, [0, -10, -9, -16, 1, -6])], c);
    PL(x, [5, -10.5, 15, -8.5, 5, -7], '#e8c060', 1);
    eye(x, 3, -10, 0.9);
  } });
  PK('dino', 165, { n: 'Dino egg', box: [-11.5, -11, 11.5, 12.5], pal: ['#f4ecd8', '#b8e0a0', '#a0d0f0', '#f0c0d8'], pos: [120, 190], d(x, c) {
    E(x, 0, 9, 11, 3.2, '#b08a40', 1); [-8, -4, 0, 4, 8].forEach(X => LN(x, [X - 2, 8, X + 2, 11], '#8a6a2a', 0.6));
    EL(x, 0, 0, 8, 10.5, 0, c, 1);
    [[-3, -4, 1.6], [3, 1, 1.9], [-2, 5, 1.2], [4, -6, 1.1]].forEach(([X, Y, r]) => C(x, X, Y, r, shade(c, -0.2)));
    EL(x, -3.5, -5, 1.6, 3, 0.3, 'rgba(255,255,255,.6)');
  } });
  PK('dino', 166, { n: 'Baby dino', box: [-9.5, -17, 9.5, 11], pal: DINO, pos: [150, 190], d(x, c) {
    C(x, 0, -7, 6.5, c, 1); eyes(x, 0, -8.5, 2.5, 1.3); smile(x, 0, -6.5, 2, '#000', 0.7);
    PL(x, [-6.5, -10, -4, -15, -1, -12, 2, -16, 5, -12, 6.8, -10, 3, -12.5, 0, -11, -3, -12], '#f4ecd8', 1);
    x.beginPath(); x.moveTo(-8.5, 0); x.lineTo(-6, -3); x.lineTo(-3, 0); x.lineTo(0, -3); x.lineTo(3, 0); x.lineTo(6, -3); x.lineTo(8.5, 0); x.ellipse(0, 1, 8.5, 9.5, 0, 0, Math.PI); x.closePath(); paint(x, '#f4ecd8', 1);
    C(x, -3, 5, 1.2, '#d8c8a8'); C(x, 3, 3, 1.4, '#d8c8a8');
  } });
  PK('dino', 167, { n: 'Bone', box: [-14.5, -6, 14.5, 6], nc: 1, pos: [180, 196], d(x) {
    blob(x, [pR(x, -11, -2, 22, 4, 1), pE(x, -11, -2.8, 2.9, 2.9), pE(x, -11, 2.8, 2.9, 2.9), pE(x, 11, -2.8, 2.9, 2.9), pE(x, 11, 2.8, 2.9, 2.9)], '#f4ecd8');
  } });
  PK('dino', 168, { n: 'Fern', box: [-19, -17, 19, 15], pal: ['#2a9a3a', '#5ab04a', '#1e6a34', '#8ac040'], pos: [40, 180], d(x, c) {
    [[-17, -6], [-10, -15], [0, -17], [10, -15], [17, -6]].forEach(([X, Y]) => {
      QL(x, 0, 14, X * 0.3, Y * 0.2, X, Y, shade(c, -0.25), 1);
      for (let t = 0.25; t < 1; t += 0.15) { const q = (1 - t) * (1 - t), m = 2 * (1 - t) * t, u = t * t, px = m * X * 0.3 + u * X, py = q * 14 + m * Y * 0.2 + u * Y; EL(x, px, py, 3 * (1.1 - t), 1.2, Math.atan2(Y, X) + 1.2, c); EL(x, px, py, 3 * (1.1 - t), 1.2, Math.atan2(Y, X) - 1.2, c); }
    });
  } });
  PK('dino', 169, { n: 'Fossil', box: [-14.5, -10.5, 14.5, 10.5], nc: 1, pos: [120, 196], d(x) {
    PL(x, [-14, -3, -9, -10, 4, -10, 14, -5, 13, 6, 5, 10, -8, 9, -14, 4], '#c8b090', 1);
    const s0 = x.strokeStyle; x.beginPath(); for (let a = 0; a < 5 * Math.PI; a += 0.2) { const r = 0.6 + a * 0.45; x.lineTo(r * Math.cos(a), r * Math.sin(a)); } x.strokeStyle = '#806040'; x.lineWidth = 1.2; x.stroke(); x.strokeStyle = s0; x.lineWidth = 0.9;
    for (let a = 1; a < 5 * Math.PI; a += 0.7) { const r = 0.6 + a * 0.45; LN(x, [r * Math.cos(a), r * Math.sin(a), (r + 1.6) * Math.cos(a), (r + 1.6) * Math.sin(a)], '#9a7a58', 0.5); }
  } });

  // Deep Space 180-
  PK('space', 180, { n: 'UFO', box: [-18.5, -13, 18.5, 6.5], pal: ['#c0c4cc', '#e04040', '#4a80e0', '#a060d0', '#f4c400'], anim: 1, pos: [200, 60], d(x, c, p, T) {
    x.beginPath(); x.ellipse(0, -3, 8, 9, 0, Math.PI, 0); x.closePath(); paint(x, 'rgba(190,240,255,.85)', 1);
    C(x, 0, -5, 3, '#7ad050', 1); C(x, -1.1, -5.5, 0.7, '#000'); C(x, 1.1, -5.5, 0.7, '#000');
    E(x, 0, 0, 18, 5, c, 1); E(x, 0, 2, 12, 2.5, shade(c, -0.3), 1);
    for (let i = 0; i < 6; i++) C(x, -14 + i * 5.6, 0.3, 1.3, (Math.floor(T * 4) + i) % 2 ? '#fff6a0' : '#ff6060');
  } });
  PK('space', 181, { n: 'Robot', box: [-16, -28, 16, 17], pal: ['#c0c4cc', '#e0a030', '#5a8ad0', '#e04040', '#60c060'], pos: [120, 176], d(x, c) {
    LN(x, [0, -22, 0, -26], '#555', 1); C(x, 0, -26.5, 1.6, '#e00000', 1);
    band(x, () => { x.beginPath(); x.moveTo(-9, -7); x.lineTo(-14, 2); }, c, 2.4); band(x, () => { x.beginPath(); x.moveTo(9, -7); x.lineTo(14, 2); }, c, 2.4);
    C(x, -14, 3, 2, '#555', 1); C(x, 14, 3, 2, '#555', 1);
    R(x, -6, 5, 4, 10, shade(c, -0.2), 1); R(x, 2, 5, 4, 10, shade(c, -0.2), 1); R(x, -7.5, 14, 6, 2.5, '#555', 1); R(x, 1.5, 14, 6, 2.5, '#555', 1);
    RR(x, -9, -10, 18, 16, 2, c, 1); R(x, -2, -12, 4, 2.5, '#888', 1);
    RR(x, -5.5, -6, 11, 7, 1, '#2a2a3a', 1); C(x, -3, -2.5, 1, '#e00000'); C(x, 0, -2.5, 1, '#f4c400'); C(x, 3, -2.5, 1, '#00c000');
    RR(x, -7, -22, 14, 11, 2, c, 1); C(x, -3, -18, 2, '#6ff', 1); C(x, 3, -18, 2, '#6ff', 1); C(x, -3, -18, 0.8, '#000'); C(x, 3, -18, 0.8, '#000');
    [-3, -1, 1, 3].forEach(X => LN(x, [X, -14.5, X, -12.5], '#333', 0.6));
  } });
  PK('space', 182, { n: 'Astronaut', box: [-12.5, -22, 12.5, 19], pos: [200, 176], d(x, c) {
    blob(x, [pE(x, -9, -1, 2.8, 6.5, 0.3), pE(x, 9, -1, 2.8, 6.5, -0.3), pR(x, -6.5, 5, 5.5, 12, 2), pR(x, 1, 5, 5.5, 12, 2), pR(x, -7, -7, 14, 14, 3)], '#fff');
    R(x, -7, 15, 6.5, 3.2, '#999', 1); R(x, 0.5, 15, 6.5, 3.2, '#999', 1); C(x, -9.5, 5, 2, '#ddd', 1); C(x, 9.5, 5, 2, '#ddd', 1);
    R(x, -3.5, -4, 7, 4.5, c, 1); C(x, -1.5, -1.8, 0.7, '#fff'); C(x, 1.5, -1.8, 0.7, '#ff0');
    R(x, -7, 2, 14, 1.4, c);
    C(x, 0, -14, 7.5, '#fff', 1); E(x, 0, -14, 5.3, 4.3, '#223366', 1); EL(x, -2, -15.5, 1.8, 1, -0.5, 'rgba(255,255,255,.8)');
  } });
  PK('space', 183, { n: 'Rocket', box: [-13.5, -25, 13.5, 19], c0: 0, anim: 1, pos: [80, 150], d(x, c, p, T) {
    x.save(); x.translate(0, 7.2); x.scale(1, -1); flame(x, 0, 0, 1.3, T, 2); x.restore();
    PL(x, [-7, -4, -13, 8, -7, 4], c, 1); PL(x, [7, -4, 13, 8, 7, 4], c, 1);
    R(x, -4, 4, 8, 3.2, '#666', 1);
    x.beginPath(); x.moveTo(0, -24); x.quadraticCurveTo(8, -14, 7, 4); x.lineTo(-7, 4); x.quadraticCurveTo(-8, -14, 0, -24); paint(x, '#f4f4f8', 1);
    x.beginPath(); x.moveTo(0, -24); x.quadraticCurveTo(4.3, -19.5, 5.9, -15); x.lineTo(-5.9, -15); x.quadraticCurveTo(-4.3, -19.5, 0, -24); paint(x, c, 1);
    C(x, 0, -7, 3.2, '#8fd0ff', 1); C(x, -1, -8, 0.9, '#fff');
    LN(x, [0, 0, 0, 4], shade(c, -0.1), 0.5);
  } });
  PK('space', 184, { n: 'Planet', box: [-19, -12, 19, 12], pal: ['#e0892e', '#5a8ad0', '#a060c0', '#60b060', '#e04040'], pos: [250, 60], d(x, c) {
    band(x, () => { x.beginPath(); x.ellipse(0, 0, 18, 5, -0.25, Math.PI, TAU); }, '#f5d28a', 1.8);
    C(x, 0, 0, 11, c, 1);
    x.save(); C(x, 0, 0, 11); x.clip(); R(x, -12, -6, 24, 2.2, shade(c, -0.2)); R(x, -12, 2, 24, 3, shade(c, 0.25)); E(x, -4, -3, 3, 1.4, shade(c, -0.3)); x.restore();
    C(x, 0, 0, 11, null, 1);
    band(x, () => { x.beginPath(); x.ellipse(0, 0, 18, 5, -0.25, 0, Math.PI); }, '#f5d28a', 1.8);
  } });
  PK('space', 185, { n: 'Friendly alien', box: [-11, -23, 11, 14], pal: ['#7ad050', '#50c0e0', '#c080f0', '#f080b0', '#f0d040'], pos: [220, 180], d(x, c) {
    LN(x, [-3, -14, -6, -21], shade(c, -0.3), 1); LN(x, [3, -14, 6, -21], shade(c, -0.3), 1); C(x, -6, -21.5, 1.6, '#ff5fa0', 1); C(x, 6, -21.5, 1.6, '#ff5fa0', 1);
    blob(x, [pE(x, -7, 5, 4, 1.8, 0.8), pE(x, 7, 5, 4, 1.8, -0.8), pE(x, 0, 5, 5, 7), pE(x, -3, 12, 3, 1.8), pE(x, 3, 12, 3, 1.8), pE(x, 0, -9, 8.5, 7)], c);
    EL(x, -3.3, -9, 2.4, 3.2, -0.3, '#000'); EL(x, 3.3, -9, 2.4, 3.2, 0.3, '#000'); C(x, -2.6, -10.2, 0.8, '#fff'); C(x, 4, -10.2, 0.8, '#fff');
    smile(x, 0, -5.5, 2.4, '#000', 0.8); E(x, 0, 6, 3, 4, shade(c, 0.3));
  } });
  PK('space', 186, { n: 'Satellite', box: [-21, -13.5, 21, 7], nc: 1, pos: [100, 60], d(x) {
    [-20, 8].forEach(X => { R(x, X, -4, 12, 8, '#2a4aa0', 1); LN(x, [X + 4, -4, X + 4, 4], '#8ab0ff', 0.5); LN(x, [X + 8, -4, X + 8, 4], '#8ab0ff', 0.5); LN(x, [X, 0, X + 12, 0], '#8ab0ff', 0.5); });
    LN(x, [-8, 0, 8, 0], '#888', 1.2);
    RR(x, -6, -6, 12, 12, 1, '#e8b828', 1); LN(x, [-6, -2, 6, -2], '#b88a10', 0.5); LN(x, [-6, 2, 6, 2], '#b88a10', 0.5);
    x.beginPath(); x.ellipse(0, -9, 5, 2.5, 0, 0, Math.PI); x.closePath(); paint(x, '#ddd', 1); LN(x, [0, -6, 0, -9], '#888', 1); LN(x, [0, -9, 0, -13], '#888', 0.6);
  } });
  PK('space', 187, { n: 'Meteor', box: [-24, -20, 8, 8], nc: 1, pos: [220, 60], d(x) {
    const g = x.createLinearGradient(-22, -18, 0, 0); g.addColorStop(0, 'rgba(255,200,60,0)'); g.addColorStop(1, 'rgba(255,140,40,.9)');
    x.beginPath(); x.moveTo(-23, -19); x.lineTo(4, -4); x.lineTo(-4, 4); x.closePath(); x.fillStyle = g; x.fill();
    PL(x, [-6, -2, -3, -6, 3, -6, 7, -1, 5, 5, -1, 7, -5, 4], '#8a7a6a', 1);
    C(x, 0, -2, 1.6, '#6a5a4a'); C(x, 3, 2.5, 1.2, '#6a5a4a'); C(x, -3, 2, 0.9, '#6a5a4a');
  } });
  PK('space', 188, { n: 'Moon rover', box: [-15, -18, 15, 7], c0: 7, pos: [160, 196], d(x, c) {
    LN(x, [8, -8, 8, -15], '#666', 1); x.beginPath(); x.ellipse(8, -15, 3.5, 1.8, -0.4, 0, Math.PI); x.closePath(); paint(x, '#ddd', 1);
    R(x, -9, -12, 13, 3, '#2a4aa0', 1); LN(x, [-3, -9, -3, -8], '#666', 1);
    RR(x, -14, -8, 28, 7.5, 2, c, 1); R(x, -10, -6, 5, 3, '#8fd0ff', 1);
    [-10, 0, 10].forEach(X => { C(x, X, 2, 4.2, '#333', 1); C(x, X, 2, 1.6, '#999'); });
  } });
  PK('space', 189, { n: 'Crescent moon', box: [-11, -12.5, 11, 12.5], pal: ['#f4e27a', '#e8e8f0', '#ffc070', '#c0e0ff'], pos: [260, 50], d(x, c) {
    x.beginPath(); x.arc(0, 0, 12, 0.35 * Math.PI, 1.65 * Math.PI, false); x.arc(5, -1, 9.5, 1.5 * Math.PI, 0.45 * Math.PI, true); x.closePath(); paint(x, c, 1);
    C(x, -6, -3, 1.6, shade(c, -0.15)); C(x, -4, 5, 1.2, shade(c, -0.15));
  } });

  // Sports Day 200-
  PK('sports', 200, { n: 'Trophy', box: [-13, -16, 13, 16], pal: ['#f4c400', '#d4d8e0', '#e0955a'], pos: [160, 150], d(x, c) {
    band(x, () => { x.beginPath(); x.arc(-9, -9, 4, 0.5 * Math.PI, 1.5 * Math.PI); }, c, 1.6); band(x, () => { x.beginPath(); x.arc(9, -9, 4, 1.5 * Math.PI, 0.5 * Math.PI); }, c, 1.6);
    x.beginPath(); x.moveTo(-9, -14); x.lineTo(9, -14); x.quadraticCurveTo(9, 0, 0, 2); x.quadraticCurveTo(-9, 0, -9, -14); paint(x, c, 1);
    R(x, -1.5, 2, 3, 5, shade(c, -0.15), 1); R(x, -5, 7, 10, 2.5, c, 1);
    R(x, -8, 9.5, 16, 6.5, '#5a3218', 1); R(x, -4.5, 11, 9, 3, c);
    E(x, 0, -14, 9, 1.8, shade(c, -0.25), 1); EL(x, -4.5, -8, 1.3, 4, 0.2, 'rgba(255,255,255,.55)');
    star(x, 0, -7.5, 2.8, 1.1); paint(x, shade(c, 0.4));
  } });
  PK('sports', 201, { n: 'Medal', box: [-8, -18, 8, 12.5], c0: 1, pos: [160, 120], d(x, c) {
    PL(x, [-7, -18, -2, -18, 3, -2, -2, -2], c, 1); PL(x, [7, -18, 2, -18, -3, -2, 2, -2], shade(c, -0.25), 1);
    C(x, 0, 4, 7.5, '#f4c400', 1); C(x, 0, 4, 5.5, '#e0a800', 1); star(x, 0, 4, 3.6, 1.5); paint(x, '#ffe070');
  } });
  PK('sports', 202, { n: 'Soccer goal', box: [-28, -20, 28, 18], nc: 1, pos: [270, 176], d(x) {
    x.save(); x.beginPath(); x.rect(-25, -17, 50, 35); x.clip();
    for (let X = -25; X <= 25; X += 4) LN(x, [X, -17, X, 18], 'rgba(200,200,210,.9)', 0.4);
    for (let Y = -17; Y <= 18; Y += 4) LN(x, [-25, Y, 25, Y], 'rgba(200,200,210,.9)', 0.4);
    x.restore();
    band(x, () => { x.beginPath(); x.moveTo(-26, 18); x.lineTo(-26, -18); x.lineTo(26, -18); x.lineTo(26, 18); }, '#fff', 2.2);
  } });
  PK('sports', 203, { n: 'Basketball', box: [-8.5, -8.5, 8.5, 8.5], nc: 1, pos: [180, 120], d(x) {
    C(x, 0, 0, 8, '#f07a20', 1);
    LN(x, [-8, 0, 8, 0], '#402010', 0.7); LN(x, [0, -8, 0, 8], '#402010', 0.7);
    arcL(x, -9, 0, 6.5, -0.95, 0.95, '#402010', 0.7); arcL(x, 9, 0, 6.5, Math.PI - 0.95, Math.PI + 0.95, '#402010', 0.7);
    EL(x, -3, -4, 1.8, 1.1, -0.5, 'rgba(255,255,255,.4)');
  } });
  PK('sports', 204, { n: 'Basketball hoop', box: [-12.5, -24.5, 12.5, 27], nc: 1, pos: [260, 150], d(x) {
    R(x, -1.5, -8, 3, 35, '#888', 1);
    R(x, -12, -24, 24, 16, '#fff', 1); R(x, -5, -18, 10, 7, null, 1);
    x.lineWidth = 0.5; x.strokeStyle = '#999';
    for (let i = 0; i <= 4; i++) { LN(x, [-7 + i * 3.5, -7, -4.5 + i * 2.25, 3], '#bbb', 0.5); }
    LN(x, [-6.5, -4, 6.5, -4], '#bbb', 0.5); LN(x, [-5.5, -0.5, 5.5, -0.5], '#bbb', 0.5); LN(x, [-4.5, 3, 4.5, 3], '#bbb', 0.5);
    x.strokeStyle = '#000'; x.lineWidth = 0.9;
    band(x, () => { x.beginPath(); x.ellipse(0, -7, 7, 1.8, 0, 0, TAU); }, '#ff5010', 1.4);
  } });
  PK('sports', 205, { n: 'Football', box: [-11.5, -7, 11.5, 7], nc: 1, pos: [170, 120], d(x) {
    E(x, 0, 0, 11, 6.5, '#8a4a1e', 1);
    LN(x, [-8, -3.5, -8, 3.5], '#fff', 0.9); LN(x, [8, -3.5, 8, 3.5], '#fff', 0.9);
    LN(x, [-4, -2.5, 4, -2.5], '#fff', 0.9); [-3, -1, 1, 3].forEach(X => LN(x, [X, -3.8, X, -1.2], '#fff', 0.7));
  } });
  PK('sports', 206, { n: 'Bat and ball', box: [-18, -6, 17, 11], nc: 1, pos: [140, 190], d(x) {
    PL(x, [-17, -1, -5, -1.6, 13, -4.2, 14.5, -2.5, 14.5, 2.5, 13, 4.2, -5, 1.6, -17, 1], '#d8a860', 1);
    E(x, -17, 0, 1.2, 2.2, '#b8864a', 1);
    C(x, 10, 6.5, 4, '#fff', 1); arcL(x, 6.5, 6.5, 3.2, -0.9, 0.9, '#e00000', 0.6); arcL(x, 13.5, 6.5, 3.2, Math.PI - 0.9, Math.PI + 0.9, '#e00000', 0.6);
  } });
  PK('sports', 207, { n: 'Tennis racket', box: [-8.5, -18, 8.5, 16.5], c0: 0, pos: [120, 150], d(x, c) {
    band(x, () => { x.beginPath(); x.moveTo(0, 0); x.lineTo(0, 15); }, '#333', 2.4);
    x.save(); E(x, 0, -8, 6.5, 8.5); x.clip(); for (let i = -6; i <= 6; i += 2) { LN(x, [i, -17, i, 1], '#ccc', 0.4); LN(x, [-7, -8 + i * 1.3, 7, -8 + i * 1.3], '#ccc', 0.4); } x.restore();
    band(x, () => { x.beginPath(); x.ellipse(0, -8, 7, 9, 0, 0, TAU); }, c, 1.6);
    C(x, 7, 12, 3, '#d8f040', 1);
  } });
  PK('sports', 208, { n: 'Pennant', box: [-3.5, -10, 25, 21], c0: 1, pos: [100, 150], d(x, c) {
    R(x, -3, -9, 2, 30, '#8a5424', 1);
    PL(x, [-1, -8, 24.5, -2, -1, 4.5], c, 1); PL(x, [-1, -8, 3, -7.1, 3, 3.6, -1, 4.5], '#fff', 1);
    star(x, 10, -1.8, 2.6, 1); paint(x, ink(c) === '#fff' ? '#fff' : '#202020');
  } });
  PK('sports', 209, { n: 'Cone', box: [-9, -13, 9, 8], pal: ['#ff7f00', '#f4c400', '#0050e0', '#e00000'], pos: [200, 196], d(x, c) {
    R(x, -9, 5, 18, 3, c, 1);
    PL(x, [-2, -12, 2, -12, 7, 5, -7, 5], c, 1);
    PL(x, [-3.3, -6, 3.3, -6, 4.3, -2.5, -4.3, -2.5], '#fff'); PL(x, [-5.4, 0, 5.4, 0, 6.2, 3, -6.2, 3], '#fff');
    PL(x, [-2, -12, 2, -12, 7, 5, -7, 5], null, 1);
  } });
  PK('sports', 210, { n: 'Whistle', box: [-10, -9, 13, 8], c0: 0, pos: [180, 120], d(x, c) {
    QL(x, -6, -2, -12, -10, -4, -8, c, 1.4);
    R(x, 2, -4, 10, 5, '#b8bcc8', 1);
    C(x, -1, 1, 6, '#c8ccd8', 1); C(x, -1, 1, 3, '#888', 1); R(x, 4, -4, 2, 1.5, '#555');
    EL(x, -3, -2, 1.5, 0.9, -0.6, 'rgba(255,255,255,.8)');
  } });

  // Ocean Explorer 220-
  const FISH = ['#ff8a1a', '#f4c400', '#40a0ff', '#ff5fa0', '#60c060', '#a060e0', '#e04040', '#ffffff'];
  PK('sea', 220, { n: 'Fish', box: [-15, -9, 12.5, 9], pal: FISH, pos: [200, 100], d(x, c) {
    PL(x, [-8, 0, -15, -7, -13, 0, -15, 7], shade(c, -0.15), 1);
    PL(x, [-3, -6, 3, -9, 5, -5], shade(c, -0.15), 1);
    E(x, 0, 0, 12, 7, c, 1);
    x.save(); E(x, 0, 0, 12, 7); x.clip(); R(x, -4, -8, 2.5, 16, ink(c) === '#fff' ? 'rgba(255,255,255,.55)' : 'rgba(255,255,255,.8)'); R(x, 2, -8, 2, 16, 'rgba(255,255,255,.55)'); x.restore();
    E(x, 0, 0, 12, 7, null, 1); eye(x, 6.5, -1.5, 1.5); arcL(x, 9, 2, 1.8, 1.9, 3, '#000', 0.6);
  } });
  PK('sea', 221, { n: 'Octopus', box: [-15.5, -15, 15.5, 14.5], pal: ['#b060e0', '#e04040', '#ff8a3a', '#ff7fb0', '#40a0c0'], pos: [120, 170], d(x, c) {
    [-12, -7.5, -3, 3, 7.5, 12].forEach((X, i) => band(x, () => { x.beginPath(); x.moveTo(X * 0.5, 0); x.bezierCurveTo(X * 0.9, 6, X * 1.2 + (i % 2 ? 3 : -3), 8, X * 1.1, 12); x.quadraticCurveTo(X * 1.1 + (X < 0 ? -3 : 3), 14, X * 1.1 + (X < 0 ? -3 : 3), 11.5); }, c, 2.6));
    E(x, 0, -5, 9.5, 9.5, c, 1);
    [[-5, -10, 1.4], [4, -11, 1], [6, -7, 1.2]].forEach(([X, Y, r]) => C(x, X, Y, r, shade(c, 0.35)));
    eyes(x, 0, -4, 3.3, 1.6); smile(x, 0, -1.5, 2.2, '#000', 0.8);
  } });
  PK('sea', 222, { n: 'Crab', box: [-18, -12, 18, 9], c0: 0, pos: [220, 198], d(x, c) {
    [-1, 1].forEach(s => { [0, 1, 2].forEach(i => band(x, () => { x.beginPath(); x.moveTo(6 * s, 2 + i * 1.5); x.quadraticCurveTo((11 + i) * s, 1 + i * 2, (13 + i) * s, 7 + i * 0.6); }, c, 1.1)); band(x, () => { x.beginPath(); x.moveTo(7 * s, -1); x.lineTo(12 * s, -5); }, c, 1.4); });
    [-1, 1].forEach(s => { C(x, 13 * s, -7, 4, c, 1); PL(x, [13 * s, -7, 17.5 * s, -11, 17.5 * s, -5], '#fff0e0'); });
    LN(x, [-3, -4, -3.5, -8], '#000', 0.8); LN(x, [3, -4, 3.5, -8], '#000', 0.8);
    E(x, 0, 0, 10, 6, c, 1); C(x, -3.5, -9, 1.9, '#fff', 1); C(x, 3.5, -9, 1.9, '#fff', 1); C(x, -3.2, -8.8, 0.9, '#000'); C(x, 3.8, -8.8, 0.9, '#000');
    smile(x, 0, 0, 2.5, '#000', 0.8);
  } });
  PK('sea', 223, { n: 'Sea turtle', box: [-14.5, -10, 18, 10], pal: ['#3aa060', '#6ab04a', '#2a8a8a', '#a08040'], pos: [160, 100], d(x, c) {
    const sk = '#9ad08a';
    EL(x, 7, -7.5, 5.5, 2.4, -0.6, sk, 1); EL(x, 7, 7.5, 5.5, 2.4, 0.6, sk, 1); EL(x, -9, -6, 3.5, 1.8, 0.6, sk, 1); EL(x, -9, 6, 3.5, 1.8, -0.6, sk, 1);
    C(x, 13.5, -0.5, 4.2, sk, 1); eye(x, 14.8, -1.8, 1); smile(x, 15, 0, 1.6);
    E(x, 0, 0, 11, 8.5, c, 1);
    [[0, 0], [-5.5, -3.5], [5.5, -3.5], [-5.5, 3.5], [5.5, 3.5]].forEach(([X, Y]) => { x.beginPath(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; x.lineTo(X + Math.cos(a) * 2.8, Y + Math.sin(a) * 2.8); } x.closePath(); paint(x, shade(c, 0.25)); });
  } });
  PK('sea', 224, { n: 'Whale', box: [-31, -23, 21.5, 12], pal: ['#4a7ac8', '#6a8aa8', '#3a5a9a', '#8a6ad0'], pos: [180, 100], d(x, c) {
    [[-2, -20, 5, -15], [2, -21, 3, -15], [6, -20, 1, -15]].forEach(([X, Y, x2, y2]) => QL(x, x2, y2, (X + x2) / 2, Y + 1, X, Y, '#8ad8ff', 1.2));
    blob(x, [pE(x, 0, 0, 20, 11.5), pP(x, [-16, -2, -27, -9, -30, -8, -24, 0, -30, 7, -27, 8, -16, 4])], c);
    x.save(); E(x, 0, 0, 20, 11.5); x.clip(); E(x, 2, 9, 19, 6.5, shade(c, 0.5)); for (let X = -10; X <= 14; X += 3) LN(x, [X, 4, X + 1, 11], shade(c, 0.2), 0.5); x.restore();
    EL(x, -2, 5, 5.5, 2.4, 0.5, shade(c, -0.2), 1);
    eye(x, 12, -1.5, 1.4); smile(x, 13, 1.5, 3.5, '#000', 0.8); C(x, 16, 1.5, 1.4, 'rgba(255,130,170,.4)');
  } });
  PK('sea', 225, { n: 'Jellyfish', box: [-10.5, -10, 10.5, 21], pal: ['#ff9ad8', '#b0a0ff', '#8ad8ff', '#ffd07a'], anim: 1, pos: [240, 80], d(x, c, p, T) {
    for (let i = 0; i < 5; i++) { const X = -6 + i * 3, w = Math.sin(T * 3 + i) * 2; const s0 = x.strokeStyle; x.beginPath(); x.moveTo(X, 2); x.bezierCurveTo(X + w, 8, X - w, 13, X + w * 0.6, 20); x.strokeStyle = shade(c, -0.15); x.lineWidth = 1; x.stroke(); x.strokeStyle = s0; x.lineWidth = 0.9; }
    x.beginPath(); x.ellipse(0, 1, 10, 11, 0, Math.PI, 0); for (let i = 0; i < 5; i++) x.quadraticCurveTo(8 - i * 4, 4, 6 - i * 4, 1); x.closePath();
    x.globalAlpha *= 0.9; paint(x, c, 1); x.globalAlpha /= 0.9;
    EL(x, -4, -5, 2, 3.4, 0.5, 'rgba(255,255,255,.55)'); eyes(x, 0, -3, 3, 1.2); smile(x, 0, -1.5, 1.6);
  } });
  PK('sea', 226, { n: 'Seahorse', box: [-9, -17, 10.5, 17.5], pal: ['#f4c400', '#ff8a3a', '#ff7fb0', '#60c0a0'], pos: [100, 110], d(x, c) {
    band(x, () => { x.beginPath(); x.moveTo(0, 6); x.bezierCurveTo(0, 12, -3, 16, -6, 15); x.bezierCurveTo(-9, 14, -8, 10, -5, 11); }, c, 3);
    PL(x, [-4, -4, -8.5, -1, -8.5, 4, -4, 3], shade(c, 0.3), 1);
    blob(x, [pE(x, 0, 0, 5, 8, 0.15), pE(x, 2, -11, 5, 4.5), pR(x, 4.5, -12.5, 6, 3, 1.5)], c);
    [-6, -2, 2].forEach(Y => arcL(x, 1, Y, 3.5, -0.2, 1.2, shade(c, -0.25), 0.6));
    PL(x, [0, -15, -1.5, -18, 2, -15.5], shade(c, -0.2), 1);
    eye(x, 2.5, -12, 1.2);
  } });
  PK('sea', 227, { n: 'Starfish', box: [-12, -12, 12, 10.5], pal: ['#ff8a3a', '#e04040', '#ff7fb0', '#f4c400'], pos: [140, 205], d(x, c) {
    x.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 5 : 11.5, a = -Math.PI / 2 + i * Math.PI / 5; x.lineTo(r * Math.cos(a), r * Math.sin(a) + 0.5); } x.closePath(); paint(x, c, 1);
    for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * 2 * Math.PI / 5; [4, 7].forEach(r => C(x, r * Math.cos(a), r * Math.sin(a) + 0.5, 0.8, shade(c, 0.45))); }
    eyes(x, 0, -0.5, 1.8, 0.9); smile(x, 0, 1, 1.4, '#000', 0.6);
  } });
  PK('sea', 228, { n: 'Pearl clam', box: [-12.5, -15, 12.5, 7.5], pal: ['#ff9ec8', '#c8b0f0', '#f0e0c0', '#8ad8ff'], pos: [200, 204], d(x, c) {
    x.beginPath(); x.moveTo(-12, -1); x.quadraticCurveTo(-12, -16, 0, -14.5); x.quadraticCurveTo(12, -16, 12, -1); x.closePath(); paint(x, shade(c, -0.12), 1);
    for (let i = -2; i <= 2; i++) LN(x, [0, -1, i * 5, -13.5 + Math.abs(i)], shade(c, -0.3), 0.6);
    E(x, 0, 0, 10, 3, shade(c, -0.45));
    x.beginPath(); x.moveTo(-12, -1); x.quadraticCurveTo(0, 3, 12, -1); x.quadraticCurveTo(12, 8, 0, 7); x.quadraticCurveTo(-12, 8, -12, -1); paint(x, c, 1);
    C(x, 0, -3, 3.4, '#fbfbff', 1); C(x, -1, -4.1, 1, '#fff');
    for (let i = -2; i <= 2; i++) LN(x, [i * 2, 6.5, i * 5, 1], shade(c, -0.25), 0.6);
  } });
  PK('sea', 229, { n: 'Submarine', box: [-23, -18, 18, 7], c0: 3, pos: [160, 110], d(x, c) {
    LN(x, [3, -11, 3, -17, 7, -17], '#555', 1.2);
    EL(x, -20.5, 0, 1.8, 4.5, 0, '#888', 1); R(x, -19, -1, 2, 2, '#666');
    RR(x, -4, -12, 11, 7, 2, c, 1);
    RR(x, -18, -6.5, 34, 13, 6.5, c, 1);
    [-9, -1, 7].forEach(X => { C(x, X, 0, 2.6, '#bbb', 1); C(x, X, 0, 1.7, '#8fd0ff'); C(x, X - 0.6, -0.6, 0.5, '#fff'); });
    R(x, -12, 4, 24, 1, shade(c, -0.25));
  } });

  // Fantasy 240-
  PK('fantasy', 240, { n: 'Friendly dragon', box: [-31, -27, 23, 18], pal: ['#5ab04a', '#e05050', '#5a8ad0', '#a068c8', '#e0b030'], pos: [220, 170], d(x, c) {
    const dk = shade(c, -0.25), lt = shade(c, 0.45);
    x.beginPath(); x.moveTo(-2, -6); x.lineTo(-18, -24); x.quadraticCurveTo(-17, -16, -24, -13); x.quadraticCurveTo(-18, -11, -21, -5); x.quadraticCurveTo(-14, -6, -12, 0); x.closePath(); paint(x, dk, 1);
    band(x, () => { x.beginPath(); x.moveTo(-8, 12); x.bezierCurveTo(-18, 16, -26, 12, -26, 5); }, c, 3.4);
    PL(x, [-26, 5, -30, 1, -26, -1, -23, 2], dk, 1);
    blob(x, [pE(x, -2, 4, 10, 12), pP(x, [0, -6, 4, -16, 12, -14, 7, -3]), pE(x, 9, -15, 7.5, 6.5), pE(x, 15, -13, 5.5, 4), pE(x, -7, 15, 4.5, 2.5), pE(x, 4, 15, 4.5, 2.5)], c);
    EL(x, 0, 6, 5.5, 9, 0, lt); [0, 3, 6, 9].forEach(Y => LN(x, [-4, Y, 4, Y], shade(c, 0.1), 0.5));
    PL(x, [5, -20, 4, -26, 8, -21], '#fff6e0', 1); PL(x, [10, -21, 11, -27, 13, -20.5], '#fff6e0', 1);
    [[-1, -5], [-5, -1], [-9, 4]].forEach(([X, Y]) => PL(x, [X, Y, X - 3.5, Y - 2.5, X - 1, Y + 3], dk));
    C(x, 10, -17, 2.8, '#fff', 1); C(x, 11, -17, 1.5, '#000'); C(x, 11.5, -17.6, 0.5, '#fff');
    C(x, 18.5, -14, 0.6, '#000'); smile(x, 15, -12.5, 3.2, '#000', 0.8); C(x, 12, -11.5, 1.4, 'rgba(255,130,170,.45)');
    EL(x, 5, 3, 1.8, 3.5, -0.5, c, 1);
  } });
  PK('fantasy', 241, { n: 'Unicorn', box: [-23, -25, 22, 15], pal: ['#ff7fbf', '#a060e0', '#50a0f0', '#f4a020', '#60c060'], pos: [120, 176], d(x, c) {
    const W = '#fff';
    [0, 1, 2].forEach(i => band(x, () => { x.beginPath(); x.moveTo(-13, -3 + i); x.bezierCurveTo(-20, -4 + i * 2, -22, 4 + i * 2, -18 + i, 9 + i); }, i === 1 ? shade(c, 0.3) : c, 2));
    blob(x, [pE(x, -2, 0, 13, 7.5), pR(x, -12, 3, 4, 11, 1.5), pR(x, -6, 3, 4, 11, 1.5), pR(x, 3, 3, 4, 11, 1.5), pR(x, 8, 3, 4, 11, 1.5), pP(x, [5, -5, 10, -15, 17, -12, 12, 2]), pE(x, 14, -12, 6, 4.2, 0.35)], W);
    [-12, -6, 3, 8].forEach(X => R(x, X, 12.5, 4, 2.2, '#f4c400', 1));
    PL(x, [13, -15.5, 16.5, -25, 15.5, -14], '#f4c400', 1); LN(x, [14.2, -18, 15.9, -18.7], '#c89000', 0.5); LN(x, [14.8, -21, 16.2, -21.5], '#c89000', 0.5);
    [[8, -14], [6, -10], [5, -6], [4.5, -2], [11, -16]].forEach(([X, Y], i) => C(x, X, Y, 2.6, i % 2 ? shade(c, 0.3) : c, 1));
    arcL(x, 15, -12.5, 1.4, 0.2, Math.PI - 0.2, '#000', 0.8); LN(x, [14, -11.2, 13.5, -10.2], '#000', 0.5); LN(x, [15.5, -11, 15.5, -10], '#000', 0.5);
    C(x, 18.8, -9.5, 0.5, '#555'); C(x, 16, -9.8, 1.2, 'rgba(255,130,170,.45)');
  } });
  PK('fantasy', 242, { n: 'Magic wand', box: [-14, -17, 16, 14], pal: GOLD, anim: 1, pos: [200, 120], d(x, c, p, T) {
    band(x, () => { x.beginPath(); x.moveTo(-12, 12); x.lineTo(5, -5); }, '#222', 1.8); LN(x, [-12, 12, -10, 10], '#fff', 1.8);
    star(x, 8, -8, 7, 3); paint(x, c, 1); C(x, 6.5, -9.5, 1, 'rgba(255,255,255,.8)');
    [[-2, -12], [14, 4], [15, -14], [-6, -3]].forEach(([X, Y], i) => { const k = 0.5 + 0.5 * Math.sin(T * 6 + i * 1.7); star(x, X, Y, 1 + 2 * k, 0.5, 4); paint(x, '#fff8a0'); });
  } });
  PK('fantasy', 243, { n: 'Crystal', box: [-12, -16.5, 12, 10], pal: ['#a0e0ff', '#e080ff', '#80ffc0', '#ff80a0', '#ffe060'], pos: [120, 190], d(x, c) {
    const pr = (X, Y, w, h, a) => { x.save(); x.translate(X, Y); x.rotate(a); PL(x, [-w, 0, -w, -h, 0, -h - w, w, -h, w, 0], c, 1); PL(x, [0, 0, 0, -h - w, w, -h, w, 0], shade(c, -0.18)); PL(x, [-w * 0.55, -2, -w * 0.55, -h + 1, -w * 0.2, -h - 1, -w * 0.2, -2], 'rgba(255,255,255,.55)'); PL(x, [-w, 0, -w, -h, 0, -h - w, w, -h, w, 0], null, 1); x.restore(); };
    pr(-6, 8, 3.5, 9, -0.35); pr(6, 8, 3.5, 8, 0.35); pr(0, 9, 4.5, 15, 0);
    E(x, 0, 9, 11, 1.6, 'rgba(120,120,140,.5)');
  } });
  PK('fantasy', 244, { n: 'Potion', box: [-8.5, -15.5, 8.5, 12.5], pal: ['#e040a0', '#40c0ff', '#60d060', '#a060e0', '#f4a020'], pos: [180, 186], d(x, c) {
    x.save(); C(x, 0, 4, 8); x.clip(); R(x, -9, 1, 18, 12, c); E(x, 0, 1, 8, 1.8, shade(c, 0.3)); [[-3, 5, 1], [2, 8, 0.8], [3, 3.5, 0.6]].forEach(([X, Y, r]) => C(x, X, Y, r, 'rgba(255,255,255,.6)')); x.restore();
    C(x, 0, 4, 8, 'rgba(210,240,255,.18)', 1); R(x, -2.5, -9, 5, 6, 'rgba(210,240,255,.4)', 1);
    RR(x, -3, -14, 6, 5, 1, '#b8864a', 1);
    EL(x, -4.5, 0, 1.4, 3, 0.4, 'rgba(255,255,255,.7)');
    R(x, -3.5, 5, 7, 4, '#fff6d8', 1); star(x, 0, 7, 1.5, 0.6); paint(x, c);
  } });
  PK('fantasy', 245, { n: 'Wizard hat', box: [-15.5, -21, 15.5, 11.5], pal: ['#2a3aa0', '#6a2aa0', '#a02a60', '#1e6a6a'], pos: [160, 106], d(x, c) {
    E(x, 0, 8, 15, 3.4, c, 1);
    x.beginPath(); x.moveTo(-9, 7.5); x.lineTo(-1, -12); x.quadraticCurveTo(4, -21, 10, -16); x.quadraticCurveTo(4, -15, 3, -10); x.lineTo(9, 7.5); x.closePath(); paint(x, c, 1);
    [[-3, 1], [3, -3], [1, 4.5], [-1.5, -6]].forEach(([X, Y], i) => { star(x, X, Y, i % 2 ? 1.6 : 2.2, 0.8); paint(x, '#f4d000'); });
    x.beginPath(); x.arc(5, -3.5, 1.8, 0.6, 5, false); x.arc(5.9, -4, 1.4, 4.6, 1.1, true); x.closePath(); paint(x, '#fff6a0');
    C(x, 10, -16, 1.4, '#f4d000', 1);
  } });
  PK('fantasy', 246, { n: 'Toadstool', box: [-12.5, -12, 12.5, 12.5], pal: ['#e02020', '#a060e0', '#40a0e0', '#f4a020'], pos: [60, 190], d(x, c) {
    RR(x, -4.5, -2, 9, 14, 3, '#fff4e0', 1); LN(x, [-4, 3, 4, 3], '#e8d8c0', 0.8);
    x.beginPath(); x.ellipse(0, -1, 12, 10.5, 0, Math.PI, 0); x.quadraticCurveTo(0, 2, -12, -1); x.closePath(); paint(x, c, 1);
    [[-6, -5, 2], [1, -8, 2.4], [7, -4, 1.7], [-1, -3, 1.3], [-9, -2, 1]].forEach(([X, Y, r]) => C(x, X, Y, r, '#fff'));
    eyes(x, 0, 5, 1.8, 0.8); smile(x, 0, 6.5, 1.2, '#000', 0.6);
  } });
  PK('fantasy', 247, { n: 'Fairy', box: [-14, -15, 14, 13], pal: ['#ff7fbf', '#80c0ff', '#a0e080', '#c8a0ff'], anim: 1, pos: [240, 90], d(x, c, p, T) {
    C(x, 0, 0, 13, 'rgba(255,250,200,.25)');
    const f = 0.85 + 0.15 * Math.sin(T * 20);
    [-1, 1].forEach(s => { EL(x, 6 * s * f, -5, 6 * f, 3.6, s * -0.5, 'rgba(210,240,255,.75)', 1); EL(x, 5 * s * f, 2, 4 * f, 2.4, s * 0.5, 'rgba(210,240,255,.75)', 1); });
    PL(x, [0, -3, 4, 9, -4, 9], c, 1);
    LN(x, [-1.5, 9, -2, 12], '#e8b890', 0.9); LN(x, [1.5, 9, 2, 12], '#e8b890', 0.9);
    LN(x, [2, 0, 7, 2], '#e8b890', 0.9); LN(x, [7, 2, 10, -4], '#555', 0.6); star(x, 10, -5, 2, 0.8, 4); paint(x, '#fff6a0');
    C(x, 0, -6, 3.5, '#ffd9b0', 1); x.beginPath(); x.arc(0, -6.5, 3.8, Math.PI * 1.05, Math.PI * 1.95); x.closePath(); paint(x, '#f4c400');
    C(x, -1.2, -5.8, 0.5, '#000'); C(x, 1.2, -5.8, 0.5, '#000'); smile(x, 0, -5.3, 1, '#000', 0.4);
  } });
  PK('fantasy', 248, { n: 'Spell book', box: [-13, -10, 13, 10], c0: 4, pos: [160, 180], d(x, c) {
    PL(x, [-11, -7, 9, -9, 12, 5, -8, 8], '#fff6d8', 1); [2, 4].forEach(k => LN(x, [-11 + k * 0.2, -7 + k, 9, -9 + k], '#d8c8a0', 0.5));
    PL(x, [-13, -9, 8, -10, 11, 7, -10, 9], c, 1);
    PL(x, [-13, -9, -10, 9, -12, 9.5, -14.5, -8.5], shade(c, -0.3), 1);
    star(x, -1, -0.5, 4, 1.6); paint(x, '#f4d000', 1);
    x.beginPath(); x.rect(-10, -7, 18, 14); const s0 = x.strokeStyle; x.strokeStyle = '#f4d000'; x.lineWidth = 0.6; x.setLineDash([1.5, 1]); x.stroke(); x.setLineDash([]); x.strokeStyle = s0; x.lineWidth = 0.9;
  } });
  PK('fantasy', 249, { n: 'Rainbow', box: [-27, -17, 27, 7], nc: 1, pos: [160, 60], d(x) {
    ['#e02020', '#ff8a1a', '#f4d000', '#40b040', '#2a70e0', '#8a40c0'].forEach((f, i) => arcL(x, 0, 6, 20 - i * 2.2, Math.PI, 0, f, 2.3));
    [[-19, 5], [19, 5]].forEach(([X, Y]) => { [[-5, 0, 4], [0, -2, 4.5], [5, 0, 4], [0, 1.5, 4.5]].forEach(([dx, dy, r]) => C(x, X + dx, Y + dy, r, '#fff')); });
  } });

  /* ---------- scenery catalog ---------- */
  // Background ids are saved in movies: never rename one. d(x, { bt }) paints the still picture (cached);
  // over(x, T) paints moving bits on top every frame (sparkles, flames, snow); txt: the picture shows the banner words.
  const BG = {}, BGS = [];
  const B = (id, n, cat, d, o) => { BG[id] = Object.assign({ id, n, cat, pack: '', d }, o); BGS.push(id); };
  const PB = (pack, id, n, d, o) => B(id, n, pack, d, Object.assign({ pack }, o));
  function sky(x, cols, y1 = VH) { x.fillStyle = grad(x, 0, y1, cols); x.fillRect(0, 0, VW, VH); }
  function wallp(x, base, st, w, y1 = 192) { R(x, 0, 0, VW, y1, base); if (st) { x.fillStyle = st; for (let X = 0; X < VW; X += w * 2) x.fillRect(X, 0, w, y1); } }
  function woodFloor(x, a, b, y = 190, bb = '#fff') {
    R(x, 0, y, VW, VH - y, a); x.fillStyle = b; for (let Y = y + 7; Y < VH; Y += 8) x.fillRect(0, Y, VW, 1);
    const r = rng(y + 3); for (let i = 0; i < 26; i++) { const Y = y + Math.floor(r() * 6) * 8; x.fillRect(r() * VW | 0, Y, 1, 8); }
    if (bb) { R(x, 0, y - 5, VW, 6, bb); R(x, 0, y, VW, 1, 'rgba(0,0,0,.2)'); }
  }
  function winBox(x, X, Y, w, h, top = '#6cc0ff', bot = '#d8f0ff', fr = '#fff') {
    R(x, X - 4, Y - 4, w + 8, h + 8, fr); x.fillStyle = grad(x, Y, Y + h, [top, bot]); x.fillRect(X, Y, w, h);
    R(x, X + w / 2 - 1.5, Y, 3, h, fr); R(x, X, Y + h / 2 - 1.5, w, 3, fr); R(x, X - 7, Y + h + 3, w + 14, 4, fr); R(x, X - 7, Y + h + 6, w + 14, 1, 'rgba(0,0,0,.2)');
  }
  function drape(x, X, Y, w, h, c) { for (let i = 0; i < 4; i++) R(x, X + i * w / 4, Y, w / 4, h, i % 2 ? c : shade(c, -0.15)); x.fillStyle = shade(c, -0.3); x.beginPath(); x.moveTo(X, Y + h); x.lineTo(X + w, Y + h); x.lineTo(X + w / 2, Y + h + 4); x.fill(); }
  function swag(x, x0, x1, y, sag, c) {
    x.beginPath(); x.moveTo(x0, y); x.quadraticCurveTo((x0 + x1) / 2, y + sag * 2, x1, y);
    x.strokeStyle = c; x.lineWidth = 5; x.stroke(); x.setLineDash([2.5, 3.5]); x.strokeStyle = shade(c, 0.45); x.stroke(); x.setLineDash([]); x.lineWidth = 1;
  }
  function bunting(x, x0, x1, y, sag, n, cols) {
    x.beginPath(); x.moveTo(x0, y); x.quadraticCurveTo((x0 + x1) / 2, y + sag * 2, x1, y); x.strokeStyle = '#555'; x.lineWidth = 0.8; x.stroke();
    for (let i = 0; i < n; i++) { const t = (i + 0.5) / n, X = x0 + (x1 - x0) * t, Y = y + 4 * sag * t * (1 - t); PL(x, [X - 6, Y - 0.5, X + 6, Y + 0.5, X, Y + 12], cols[i % cols.length]); }
  }
  function bgBalloon(x, X, Y, r, c, len) { QL(x, X, Y + r * 1.2, X + 6, Y + len * 0.5, X, Y + len, '#777', 0.6); E(x, X, Y, r, r * 1.2, c); PL(x, [X, Y + r * 1.15, X - 2, Y + r * 1.2 + 3, X + 2, Y + r * 1.2 + 3], c); EL(x, X - r * 0.35, Y - r * 0.45, r * 0.2, r * 0.32, 0.4, 'rgba(255,255,255,.65)'); }
  function pine(x, X, Y, h, c = '#1e6a34', snow) {
    R(x, X - h * 0.05, Y - h * 0.12, h * 0.1, h * 0.12, '#5a3a1a');
    [[0.75, 0.42], [0.45, 0.33], [0.2, 0.24]].forEach(([t, w], i) => { PL(x, [X, Y - h * (t + 0.28), X + h * w, Y - h * (t - 0.62) - h * 0.5, X - h * w, Y - h * (t - 0.62) - h * 0.5], i % 2 ? shade(c, 0.12) : c); });
    if (snow) [[0.75, 0.42], [0.45, 0.33], [0.2, 0.24]].forEach(([t, w]) => { const ty = Y - h * (t + 0.28); PL(x, [X, ty, X + h * w * 0.35, ty + h * 0.2, X, ty + h * 0.14, X - h * w * 0.35, ty + h * 0.2], '#fff'); });
  }
  function leafTree(x, X, Y, s, c = '#2f8a2a', trunk = '#6b4020') {
    R(x, X - 4 * s, Y - 50 * s, 8 * s, 50 * s, trunk);
    [[0, -58, 22], [-16, -46, 15], [16, -46, 15], [0, -74, 16], [-10, -66, 13], [11, -66, 13]].forEach(([dx, dy, r], i) => E(x, X + dx * s, Y + dy * s, r * s, r * s * 0.85, i % 2 ? shade(c, 0.12) : c));
  }
  function bareTree(x, X, Y, h, c, seed = 1) {
    const r = rng(seed);
    const br = (x0, y0, a, L, w, d) => { const x1 = x0 + Math.cos(a) * L, y1 = y0 + Math.sin(a) * L; x.beginPath(); x.moveTo(x0, y0); x.quadraticCurveTo((x0 + x1) / 2 + (r() - 0.5) * L * 0.4, (y0 + y1) / 2, x1, y1); x.strokeStyle = c; x.lineWidth = w; x.stroke(); if (d > 0) { br(x1, y1, a - 0.5 - r() * 0.3, L * 0.68, w * 0.62, d - 1); br(x1, y1, a + 0.45 + r() * 0.3, L * 0.62, w * 0.62, d - 1); } };
    br(X, Y, -Math.PI / 2 + (r() - 0.5) * 0.2, h * 0.42, h * 0.08, 4); x.lineWidth = 1;
  }
  function hill(x, y, amp, fq, ph, c) { x.beginPath(); x.moveTo(0, VH); for (let X = 0; X <= VW; X += 8) x.lineTo(X, y + Math.sin(X * fq + ph) * amp); x.lineTo(VW, VH); x.closePath(); x.fillStyle = c; x.fill(); }
  function starsBg(x, seed, n, ymax, col = '#fff') { const r = rng(seed); for (let i = 0; i < n; i++) { x.fillStyle = r() < 0.15 ? '#bde' : col; const s = r() < 0.1 ? 2 : 1; x.fillRect(r() * VW | 0, r() * ymax | 0, s, s); } }
  function glow(x, X, Y, r, c) { const g = x.createRadialGradient(X, Y, 0, X, Y, r); g.addColorStop(0, c); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(X - r, Y - r, r * 2, r * 2); }
  function moonBg(x, X, Y, r, c = '#fff6c8') { glow(x, X, Y, r * 2.2, 'rgba(255,250,200,.35)'); C(x, X, Y, r, c); C(x, X - r * 0.3, Y - r * 0.2, r * 0.18, shade(c, -0.08)); C(x, X + r * 0.35, Y + r * 0.3, r * 0.13, shade(c, -0.08)); }
  function bricks(x, X, Y, w, h, base, mortar, bw = 12, bh = 6) { R(x, X, Y, w, h, base); x.fillStyle = mortar; for (let yy = Y; yy < Y + h; yy += bh) { x.fillRect(X, yy, w, 1); for (let xx = X + ((yy - Y) / bh % 2 ? bw / 2 : 0); xx < X + w; xx += bw) x.fillRect(xx, yy, 1, bh); } }
  function house(x, X, Y, w, h, wall, roof, o = {}) {
    R(x, X, Y, w, h, wall); PL(x, [X - 5, Y, X + w / 2, Y - h * 0.6, X + w + 5, Y], roof);
    if (o.snow) PL(x, [X - 6, Y + 1, X + w / 2, Y - h * 0.6 - 2, X + w + 6, Y + 1, X + w + 2, Y + 3, X + w / 2, Y - h * 0.6 + 3, X - 2, Y + 3], '#fff');
    R(x, X + w / 2 - 5, Y + h - 16, 10, 16, shade(wall, -0.45));
    [[X + 5, Y + 7], [X + w - 17, Y + 7]].forEach(([wx, wy]) => { R(x, wx, wy, 12, 10, o.lit || '#bfe6ff'); R(x, wx + 5.5, wy, 1, 10, shade(wall, -0.3)); R(x, wx, wy + 4.5, 12, 1, shade(wall, -0.3)); });
  }
  const sparkleSet = (x, pts, T, col, sz = 2.5) => pts.forEach(([X, Y], i) => { const k = 0.5 + 0.5 * Math.sin(T * 5 + i * 2.1); if (k < 0.15) return; x.globalAlpha = k; star(x, X, Y, sz * k + 0.5, 0.5, 4); x.fillStyle = col; x.fill(); x.globalAlpha = 1; });

  // The original seven.
  B('park', 'Park', 'out', x => BGDRAW.park(x));
  B('beach', 'Beach', 'out', x => BGDRAW.beach(x));
  B('city', 'City Street', 'out', x => BGDRAW.city(x));
  B('space', 'Outer Space', 'out', x => BGDRAW.space(x));
  B('sea', 'Under the Sea', 'out', x => BGDRAW.sea(x));
  B('stage', 'Theater Stage', 'in', x => BGDRAW.stage(x));
  B('plain', 'Plain White', 'in', x => BGDRAW.plain(x));

  // Party scenes (free)
  B('party', 'Birthday Party', 'party', x => {
    wallp(x, '#fde3ee', '#fbd2e2', 10); woodFloor(x, '#d9a066', '#b9824c', 192);
    const r = rng(21); for (let i = 0; i < 60; i++) { x.fillStyle = RAINBOW[i % 7]; x.fillRect(r() * VW, 194 + r() * 44, 2.5, 1.5); }
    winBox(x, 128, 70, 64, 56);
    [['#ff5fa0', 0, 110], ['#4aa0ff', 105, 215], ['#ffd23a', 210, 320]].forEach(([c, a, b]) => swag(x, a, b, 6, 14, c));
    [['#7ad06a', -10, 90], ['#b070f0', 90, 230], ['#ff8a3a', 230, 330]].forEach(([c, a, b]) => swag(x, a, b, 2, 22, c));
    bunting(x, 14, 306, 52, 10, 17, ['#e00000', '#f4c400', '#0050e0', '#00a000', '#a000c0', '#ff7f00']);
    [[30, 92, 13, '#e00000', 96], [52, 80, 12, '#0050e0', 108], [18, 110, 11, '#f4c400', 78], [42, 112, 10, '#a000c0', 76]].forEach(a => bgBalloon(x, ...a));
    [[290, 92, 13, '#00a000', 96], [268, 80, 12, '#ff5fa0', 108], [302, 110, 11, '#ff7f00', 78], [278, 112, 10, '#0050e0', 76]].forEach(a => bgBalloon(x, ...a));
  });
  B('banner', 'Birthday Banner', 'party', (x, o) => {
    R(x, 0, 0, VW, 192, '#e2f0ff'); const r = rng(4); for (let yy = 8; yy < 190; yy += 18) for (let xx = (yy / 18 % 2) * 9; xx < VW; xx += 18) C(x, xx, yy, 3, '#cfe4ff');
    woodFloor(x, '#caa27a', '#aa8258', 192);
    PL(x, [24, 36, 6, 36, 16, 52, 6, 68, 34, 68], '#a0102a'); PL(x, [296, 36, 314, 36, 304, 52, 314, 68, 286, 68], '#a0102a');
    PL(x, [30, 64, 34, 70, 34, 64], '#600010'); PL(x, [290, 64, 286, 70, 286, 64], '#600010');
    x.fillStyle = grad(x, 26, 66, ['#ff3a5a', '#d81a3a']); x.fillRect(30, 26, 260, 40);
    R(x, 30, 28, 260, 2, '#ffd23a'); R(x, 30, 62, 260, 2, '#ffd23a');
    const t = String(o.bt || BT0).slice(0, 24); let s = 30; x.font = `bold ${s}px "Comic Sans MS","Chalkboard SE",cursive`; while (s > 10 && x.measureText(t).width > 244) { s--; x.font = `bold ${s}px "Comic Sans MS","Chalkboard SE",cursive`; }
    x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round'; x.strokeStyle = '#7a0018'; x.lineWidth = 3; x.strokeText(t, 160, 47); x.fillStyle = '#fff'; x.fillText(t, 160, 47); x.lineWidth = 1;
    [[20, 100, 12, '#f4c400', 90], [44, 88, 12, '#00a000', 102], [300, 100, 12, '#0050e0', 90], [276, 88, 12, '#ff5fa0', 102]].forEach(a => bgBalloon(x, ...a));
    R(x, 96, 166, 128, 6, '#fff'); x.fillStyle = '#fff'; x.beginPath(); x.moveTo(96, 170); x.lineTo(96, 196); for (let X = 96; X < 224; X += 8) x.quadraticCurveTo(X + 4, 201, X + 8, 196); x.lineTo(224, 170); x.fill();
    x.fillStyle = '#ff9ec8'; for (let X = 102; X < 222; X += 12) for (let Y = 176; Y < 196; Y += 9) C(x, X + ((Y - 176) / 9 % 2) * 6, Y, 2, '#ff9ec8');
    R(x, 96, 170, 128, 1, 'rgba(0,0,0,.15)');
  }, { txt: 1 });
  B('backyard', 'Backyard Party', 'party', x => {
    sky(x, ['#5cb4ff', '#d8f0ff'], 150); cloud(x, 110, 24, 0.8); cloud(x, 230, 40, 0.6); ell(x, 290, 26, 14, 14, '#ffe23a');
    [[20, 118, 40], [90, 112, 34], [200, 116, 38], [300, 110, 40]].forEach(([X, Y, r]) => E(x, X, Y, r, r * 0.6, '#5aa04a'));
    for (let X = 0; X < VW; X += 12) { PL(x, [X + 1, 128, X + 5.5, 122, X + 10, 128, X + 10, 190, X + 1, 190], '#f0dcb0'); R(x, X + 9, 128, 1, 62, '#c8b088'); }
    R(x, 0, 140, VW, 4, '#d8c090'); R(x, 0, 172, VW, 4, '#d8c090');
    R(x, 0, 188, VW, 52, '#58b048'); x.fillStyle = '#4ea03f'; for (let X = 0; X < VW; X += 16) x.fillRect(X, 188, 8, 52);
    leafTree(x, 32, 196, 1.25);
    const lp = t => [44 + t * 270, 24 + 30 * 4 * t * (1 - t) * 0.5];
    x.beginPath(); for (let t = 0; t <= 1.001; t += 0.05) { const [X, Y] = lp(t); x.lineTo(X, Y); } x.strokeStyle = '#333'; x.lineWidth = 0.8; x.stroke();
    R(x, 312, 20, 4, 170, '#8a5424');
    ['#ff5f7a', '#ffd23a', '#7ad06a', '#4aa0ff', '#ff8a3a', '#b070f0', '#ff5f7a'].forEach((c, i) => { const [X, Y] = lp((i + 0.6) / 7.4); glow(x, X, Y + 8, 14, 'rgba(255,240,180,.5)'); LN(x, [X, Y, X, Y + 3], '#333', 0.6); E(x, X, Y + 9, 6, 7, c); [-3, 0, 3].forEach(d => LN(x, [X + d, Y + 3, X + d * 1.3, Y + 15], shade(c, -0.25), 0.5)); R(x, X - 3, Y + 2, 6, 2, '#333'); R(x, X - 3, Y + 15, 6, 1.6, '#333'); });
    R(x, 196, 166, 108, 6, '#b5652e'); x.save(); x.beginPath(); x.rect(196, 160, 108, 12); x.clip(); for (let X = 196; X < 304; X += 6) for (let Y = 160; Y < 172; Y += 6) R(x, X, Y, 6, 6, ((X - 196) / 6 + (Y - 160) / 6) % 2 ? '#fff' : '#e03030'); x.restore();
    R(x, 196, 160, 108, 1, 'rgba(0,0,0,.2)');
    LN(x, [212, 172, 236, 206], '#8a4a1e', 4); LN(x, [236, 172, 212, 206], '#8a4a1e', 4); LN(x, [266, 172, 290, 206], '#8a4a1e', 4); LN(x, [290, 172, 266, 206], '#8a4a1e', 4);
    R(x, 190, 188, 120, 4, '#9a5424');
    [[120, 214, '#ff5fa0'], [150, 226, '#fff45a'], [90, 230, '#ffffff'], [170, 208, '#ff5fa0']].forEach(([X, Y, c]) => ell(x, X, Y, 2.5, 2.5, c));
  });
  B('fireworks', 'Fireworks Night', 'party', x => {
    sky(x, ['#040828', '#141a58', '#3a2a70']); starsBg(x, 13, 90, 150);
    x.fillStyle = '#0c0c26'; [[0, 140, 30], [30, 118, 22], [52, 150, 30], [82, 126, 20], [102, 108, 16], [118, 140, 34], [152, 122, 24], [176, 146, 30], [206, 112, 20], [226, 136, 28], [254, 120, 22], [276, 144, 44]].forEach(([X, Y, w]) => x.fillRect(X, Y, w, 200 - Y));
    const r = rng(8); for (let i = 0; i < 70; i++) { x.fillStyle = r() < 0.5 ? '#ffe070' : '#2a2a50'; x.fillRect(r() * VW | 0, 112 + r() * 80 | 0, 2, 3); }
    x.fillStyle = '#0c0c26'; [[0, 140, 30], [52, 150, 30], [118, 140, 34], [176, 146, 30], [276, 144, 44]].forEach(([X, Y, w]) => { x.fillRect(X, Y + 30, w, 200 - Y); });
    hill(x, 196, 3, 0.03, 1, '#123a22'); R(x, 0, 204, VW, 36, '#0e2e1a');
    x.fillStyle = '#081a10'; for (let i = 0; i < 26; i++) { const X = 8 + i * 12 + (i % 3) * 2; C(x, X, 208 + (i % 2) * 3, 4, '#081a10'); x.fillRect(X - 4, 208 + (i % 2) * 3, 8, 30); }
  }, { over(x, T) {
    const P = [[70, 52, '#ff5f7a'], [240, 44, '#7affc0'], [160, 78, '#ffe05a'], [110, 32, '#8ab0ff'], [272, 88, '#ff9aff'], [40, 90, '#ffb040']];
    for (let i = 0; i < 3; i++) {
      const per = 2.1, t = T + i * 0.7, cyc = Math.floor(t / per), ph = (t % per) / per, [X, Y, col] = P[(cyc * 3 + i * 2) % P.length];
      const rr = 5 + ph * 32, a = clamp(1.15 - ph * 1.15, 0, 1);
      x.globalAlpha = a; x.fillStyle = col; x.strokeStyle = col; x.lineWidth = 0.8;
      for (let k = 0; k < 18; k++) { const an = k * TAU / 18 + i, ex = X + Math.cos(an) * rr, ey = Y + Math.sin(an) * rr * 0.9 + ph * ph * 12; x.beginPath(); x.moveTo(X + Math.cos(an) * rr * 0.6, Y + Math.sin(an) * rr * 0.54 + ph * ph * 10); x.lineTo(ex, ey); x.stroke(); x.fillRect(ex - 1, ey - 1, 2, 2); }
      if (ph < 0.15) { x.globalAlpha = 1 - ph / 0.15; C(x, X, Y, 6, '#fff'); }
    }
    x.globalAlpha = 1; x.lineWidth = 1;
  } });
  // Indoors (free)
  B('living', 'Living Room', 'in', x => {
    wallp(x, '#f3e2c0', '#ecd6ae', 8); R(x, 0, 0, VW, 8, '#fff6e0'); R(x, 0, 8, VW, 2, '#d8c49a');
    woodFloor(x, '#a86c3c', '#8a5428', 190);
    E(x, 160, 214, 118, 18, '#b83a3a'); E(x, 160, 214, 104, 14, '#d85a4a'); E(x, 160, 214, 88, 10, '#b83a3a');
    winBox(x, 30, 42, 64, 70); drape(x, 18, 32, 20, 96, '#3a6ab0'); drape(x, 86, 32, 20, 96, '#3a6ab0'); R(x, 12, 30, 100, 4, '#6a4020');
    R(x, 196, 44, 60, 42, '#8a5a2a'); R(x, 200, 48, 52, 34, '#ffd08a'); x.fillStyle = grad(x, 48, 82, ['#ff9a5a', '#ffe0a0']); x.fillRect(200, 48, 52, 34); PL(x, [200, 82, 220, 62, 236, 76, 244, 68, 252, 82], '#5a8a4a'); C(x, 230, 60, 5, '#fff6b0');
    RR(x, 118, 132, 104, 36, 8, '#4a6ab0'); RR(x, 110, 150, 18, 36, 5, '#3a5aa0'); RR(x, 212, 150, 18, 36, 5, '#3a5aa0');
    RR(x, 124, 158, 92, 20, 4, '#5a7ac0'); LN(x, [170, 160, 170, 178], '#3a5aa0', 1); R(x, 116, 184, 6, 6, '#3a2a1a'); R(x, 218, 184, 6, 6, '#3a2a1a');
    RR(x, 132, 140, 20, 16, 4, '#f4c400'); RR(x, 190, 140, 20, 16, 4, '#e05a5a');
    R(x, 262, 150, 50, 40, '#6a4020'); R(x, 262, 150, 50, 3, '#8a5a30'); R(x, 266, 160, 42, 1, '#4a2a10');
    RR(x, 266, 110, 42, 38, 4, '#303030'); RR(x, 271, 115, 32, 26, 6, '#3a6a8a'); PL(x, [273, 118, 285, 118, 275, 134], 'rgba(255,255,255,.25)'); C(x, 300, 144, 1.2, '#e00');
    LN(x, [52, 190, 52, 150], '#555', 2); PL(x, [42, 150, 62, 150, 58, 134, 46, 134], '#f4e2a0'); R(x, 44, 188, 16, 3, '#555');
  });
  B('kitchen', 'Kitchen', 'in', x => {
    R(x, 0, 0, VW, 192, '#fff6dc');
    x.fillStyle = '#d8ecff'; for (let X = 0; X < 250; X += 10) for (let Y = 108; Y < 150; Y += 10) if ((X + Y) / 10 % 2) x.fillRect(X, Y, 10, 10);
    x.fillStyle = '#b8d0e8'; for (let X = 0; X < 250; X += 10) x.fillRect(X, 108, 1, 42); for (let Y = 108; Y < 150; Y += 10) x.fillRect(0, Y, 250, 1);
    [[0, 16, 50], [120, 16, 130]].forEach(([X, Y, w]) => { R(x, X, Y, w, 66, '#c8904a'); for (let dx = 4; dx < w - 4; dx += 31) { R(x, X + dx, Y + 4, 27, 58, '#d8a060'); C(x, X + dx + 23, Y + 50, 1.6, '#6a4020'); } R(x, X, Y + 66, w, 3, '#a8703a'); });
    winBox(x, 62, 26, 46, 52);
    R(x, 0, 150, 250, 6, '#e8e8ec'); R(x, 0, 156, 250, 36, '#c8904a');
    for (let X = 4; X < 246; X += 40) { R(x, X, 160, 36, 28, '#d8a060'); R(x, X + 14, 164, 8, 2, '#6a4020'); }
    R(x, 60, 150, 48, 4, '#b8bcc8'); LN(x, [84, 150, 84, 136, 92, 136, 92, 140], '#8a8e98', 2.2);
    R(x, 138, 150, 60, 42, '#e8e8f0'); R(x, 138, 150, 60, 2, '#999'); R(x, 144, 162, 48, 22, '#303038'); R(x, 144, 162, 48, 3, '#8a8a90'); [148, 160, 172, 184].forEach(X => C(x, X, 157, 1.6, '#333'));
    E(x, 154, 150, 7, 1.5, '#222'); E(x, 178, 150, 7, 1.5, '#222');
    R(x, 256, 32, 58, 160, '#f4f6fa'); R(x, 256, 32, 58, 1, '#bbb'); R(x, 256, 94, 58, 2, '#c8ccd4'); R(x, 256, 32, 1, 160, '#c8ccd4'); R(x, 313, 32, 1, 160, '#c8ccd4');
    R(x, 262, 70, 3, 18, '#999'); R(x, 262, 104, 3, 24, '#999');
    [[280, 50, '#e00000'], [296, 60, '#0050e0'], [288, 116, '#f4c400']].forEach(([X, Y, c]) => C(x, X, Y, 3, c)); R(x, 290, 110, 14, 18, '#fff'); R(x, 292, 114, 10, 1, '#999'); R(x, 292, 118, 8, 1, '#999');
    C(x, 196, 40, 12, '#fff'); arcL(x, 196, 40, 12, 0, TAU, '#333', 1.5); LN(x, [196, 40, 196, 32], '#333', 1.2); LN(x, [196, 40, 202, 43], '#333', 1.2);
    for (let X = 0; X < VW; X += 16) for (let Y = 192; Y < VH; Y += 16) R(x, X, Y, 16, 16, (X + Y) / 16 % 2 ? '#303848' : '#f0f0f0');
  });
  B('bedroom', 'Bedroom', 'in', x => {
    R(x, 0, 0, VW, 192, '#e6e0ff'); const r = rng(6); for (let i = 0; i < 26; i++) { star(x, r() * VW, r() * 180, 3, 1.3); x.fillStyle = '#d4ccf8'; x.fill(); }
    woodFloor(x, '#c89868', '#a87848', 190);
    E(x, 180, 214, 70, 14, '#6ac0a0'); E(x, 180, 214, 56, 10, '#8ad0b8');
    winBox(x, 160, 36, 70, 60, '#1a2a6a', '#5a6ab8'); C(x, 212, 52, 6, '#fff6c0');
    [[170, 44], [184, 70], [222, 80], [200, 44]].forEach(([X, Y]) => R(x, X, Y, 1.5, 1.5, '#fff'));
    drape(x, 148, 28, 16, 80, '#ff8aa0'); drape(x, 226, 28, 16, 80, '#ff8aa0'); R(x, 142, 26, 106, 4, '#8a5a30');
    R(x, 8, 118, 10, 76, '#8a5424'); RR(x, 4, 110, 18, 12, 4, '#8a5424'); R(x, 124, 150, 8, 44, '#8a5424');
    R(x, 16, 150, 112, 22, '#fff'); RR(x, 16, 146, 110, 40, 4, '#ff8a5a'); for (let X = 24; X < 124; X += 14) C(x, X, 164, 2.5, '#ffd0a0'); RR(x, 20, 136, 32, 14, 5, '#fff'); R(x, 16, 183, 112, 3, '#c85a3a');
    R(x, 256, 140, 56, 50, '#b07a44'); [146, 162, 176].forEach(Y => { R(x, 260, Y, 48, 12, '#c89060'); C(x, 284, Y + 6, 1.6, '#6a4020'); });
    LN(x, [276, 140, 276, 120], '#555', 1.6); PL(x, [266, 120, 286, 120, 282, 108, 270, 108], '#ffd060');
    R(x, 262, 36, 40, 56, '#fff'); R(x, 264, 38, 36, 52, '#2a3a8a'); PL(x, [282, 44, 290, 70, 274, 70], '#e0e0e8'); PL(x, [276, 70, 272, 78, 280, 70], '#e04040'); PL(x, [288, 70, 292, 78, 284, 70], '#e04040'); C(x, 282, 58, 3, '#8fd0ff');
    RR(x, 60, 70, 40, 30, 3, '#f4c400'); x.fillStyle = '#b07000'; x.font = 'bold 9px "Comic Sans MS",cursive'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('MY ROOM', 80, 85);
  });
  B('classroom', 'Classroom', 'in', x => {
    R(x, 0, 0, VW, 192, '#f4ecd0'); R(x, 0, 132, VW, 60, '#a8c8a0'); R(x, 0, 130, VW, 3, '#7a9a72');
    for (let X = 0; X < VW; X += 16) for (let Y = 192; Y < VH; Y += 12) R(x, X, Y, 15, 11, (X / 16 + Y / 12) % 2 ? '#d8d0c0' : '#e4dccc');
    R(x, 56, 38, 208, 88, '#a06a30'); R(x, 62, 44, 196, 76, '#2a5a3a'); R(x, 58, 124, 204, 4, '#a06a30'); R(x, 90, 122, 8, 2, '#fff'); R(x, 104, 122, 6, 2, '#ffd0d0');
    x.fillStyle = 'rgba(255,255,255,.9)'; x.font = 'bold 18px "Comic Sans MS","Chalkboard SE",cursive'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('A B C', 118, 68); x.fillText('1 2 3', 204, 68);
    x.font = '14px "Comic Sans MS","Chalkboard SE",cursive'; x.fillText('2 + 2 = 4', 160, 100); LN(x, [72, 84, 250, 84], 'rgba(255,255,255,.25)', 1);
    'ABCDEFGHIJKLMNOP'.split('').forEach((ch, i) => { R(x, 6 + i * 19.4, 10, 17, 18, i % 2 ? '#fff' : '#fff8d8'); R(x, 6 + i * 19.4, 10, 17, 3, RAINBOW[i % 6]); x.fillStyle = '#333'; x.font = 'bold 10px Arial,sans-serif'; x.fillText(ch, 14.5 + i * 19.4, 21); });
    C(x, 290, 58, 14, '#fff'); arcL(x, 290, 58, 14, 0, TAU, '#333', 2); for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; R(x, 290 + Math.cos(a) * 11 - 0.8, 58 + Math.sin(a) * 11 - 0.8, 1.6, 1.6, '#333'); } LN(x, [290, 58, 290, 49], '#333', 1.5); LN(x, [290, 58, 296, 60], '#333', 1.5);
    R(x, 8, 48, 38, 66, '#c8945a'); [[12, 54, '#fff'], [26, 60, '#ffe080'], [14, 80, '#bfe0ff'], [28, 88, '#ffd0e0']].forEach(([X, Y, c]) => R(x, X, Y, 14, 16, c)); [[19, 54], [33, 60], [21, 80], [35, 88]].forEach(([X, Y]) => C(x, X, Y, 1.5, '#e00000'));
    R(x, 234, 150, 80, 8, '#b07a40'); R(x, 238, 158, 72, 34, '#9a6630'); R(x, 244, 164, 60, 1, '#7a4a20');
    C(x, 256, 138, 9, '#4a90e0'); PL(x, [252, 134, 258, 131, 262, 138, 255, 142], '#5ab04a'); R(x, 255, 147, 2, 4, '#555'); R(x, 250, 150, 12, 2, '#555');
    R(x, 284, 140, 12, 10, '#e00000'); PL(x, [290, 140, 292, 136, 290, 137], '#2a6a2a');
  });

  // ---- Extras pack scenery ----
  PB('holiday', 'village', 'Winter Village', x => {
    sky(x, ['#0a1840', '#24357a', '#4a5aa0'], 190); starsBg(x, 17, 60, 110); moonBg(x, 270, 36, 13);
    hill(x, 150, 6, 0.02, 0, '#c8d8f0'); hill(x, 168, 4, 0.035, 2, '#dde8fa');
    [[18, 150, 46, 30, '#b85a3a', '#7a2a2a'], [86, 144, 54, 36, '#5a7ab0', '#2a3a6a'], [168, 152, 44, 28, '#c89a4a', '#6a3a1a'], [236, 146, 56, 34, '#a04a6a', '#5a1a3a']].forEach(([X, Y, w, h, wl, rf]) => house(x, X, Y, w, h, wl, rf, { snow: 1, lit: '#ffd86a' }));
    [[70, 190, 40], [150, 186, 34], [304, 190, 44], [224, 188, 26]].forEach(([X, Y, h]) => pine(x, X, Y, h, '#1a5a34', 1));
    R(x, 0, 186, VW, 54, '#eef4ff'); x.fillStyle = '#d4e0f4'; for (let i = 0; i < 10; i++) E(x, 20 + i * 34, 200 + (i % 3) * 12, 18, 3, '#d4e0f4');
    [[98, 170, '#e00000'], [110, 170, '#00a000']].forEach(([X, Y, c]) => C(x, X, Y, 1.5, c));
  }, { over(x, T) { x.fillStyle = '#fff'; const r = rng(31); for (let i = 0; i < 46; i++) { const X = (r() * VW + Math.sin(T * 1.3 + i) * 6 + VW) % VW, Y = (r() * VH + T * (14 + r() * 12)) % VH; x.fillRect(X, Y, i % 5 ? 1.5 : 2.5, i % 5 ? 1.5 : 2.5); } } });
  PB('holiday', 'fireplace', 'Cozy Fireplace', x => {
    wallp(x, '#7a2a30', '#6c2228', 12); R(x, 0, 0, VW, 10, '#5a1a1e'); woodFloor(x, '#8a5428', '#6a3a18', 192, '#f0e0c0');
    E(x, 170, 216, 110, 16, '#2a6a3a'); E(x, 170, 216, 96, 12, '#3a8a4a');
    bricks(x, 176, 86, 124, 106, '#b0503a', '#7a3020'); R(x, 168, 80, 140, 10, '#6a3a18'); R(x, 164, 78, 148, 4, '#8a5428');
    x.beginPath(); x.moveTo(200, 192); x.lineTo(200, 130); x.quadraticCurveTo(238, 108, 276, 130); x.lineTo(276, 192); x.fillStyle = '#1a0e0a'; x.fill();
    R(x, 212, 180, 52, 6, '#6a3a18'); R(x, 216, 174, 44, 6, '#8a5428');
    [[190, '#e00000'], [236, '#00a000'], [282, '#e00000']].forEach(([X, c]) => { x.beginPath(); x.moveTo(X - 5, 90); x.lineTo(X + 5, 90); x.lineTo(X + 5, 104); x.quadraticCurveTo(X + 12, 104, X + 12, 110); x.lineTo(X - 1, 110); x.quadraticCurveTo(X - 5, 110, X - 5, 104); x.closePath(); x.fillStyle = c; x.fill(); R(x, X - 6, 88, 12, 5, '#fff'); });
    [[196, 66], [214, 70], [260, 68]].forEach(([X, Y], i) => { R(x, X, Y, 8, 12, ['#fff6d8', '#ffe0a0', '#fff'][i]); });
    pine(x, 70, 196, 150, '#1e7a34');
    [[52, 150, '#e00000'], [86, 140, '#f4c400'], [66, 118, '#0050e0'], [80, 100, '#e00000'], [58, 170, '#a000c0'], [96, 172, '#0050e0'], [70, 84, '#ff7f00'], [44, 180, '#f4c400']].forEach(([X, Y, c]) => C(x, X, Y, 3.4, c));
    star(x, 70, 50, 9, 4); x.fillStyle = '#ffd400'; x.fill();
    [[40, 186, 18, 12, '#e00000'], [62, 184, 16, 14, '#0050e0'], [86, 188, 20, 10, '#00a000']].forEach(([X, Y, w, h, c]) => { R(x, X, Y, w, h, c); R(x, X + w / 2 - 1.5, Y, 3, h, '#ffd23a'); });
    winBox(x, 120, 40, 38, 50, '#1a2a6a', '#4a5aa0'); [[126, 50], [150, 60], [134, 76], [142, 46]].forEach(([X, Y]) => R(x, X, Y, 2, 2, '#fff'));
  }, { over(x, T) { glow(x, 238, 168, 42, 'rgba(255,160,40,.35)'); [[222, 0.9, 0], [238, 1.3, 1], [254, 0.95, 2], [230, 0.7, 3], [247, 0.75, 4]].forEach(([X, s, k]) => flame(x, X, 176, s * 2.1, T, k)); } });
  PB('holiday', 'snowhill', 'Sledding Hill', x => {
    sky(x, ['#7cc4ff', '#e0f4ff'], 150); ell(x, 60, 36, 14, 14, '#fff6b0');
    PL(x, [0, 120, 40, 70, 80, 100, 130, 50, 190, 104, 240, 76, 320, 120, 320, 140, 0, 140], '#c8d8ee'); PL(x, [40, 70, 50, 82, 30, 84], '#fff'); PL(x, [130, 50, 144, 66, 116, 66], '#fff'); PL(x, [240, 76, 252, 90, 228, 90], '#fff');
    [[16, 140, 30], [40, 138, 26], [290, 136, 34], [270, 140, 24]].forEach(([X, Y, h]) => pine(x, X, Y, h, '#2a6a4a', 1));
    x.beginPath(); x.moveTo(0, 110); x.quadraticCurveTo(120, 118, 200, 170); x.quadraticCurveTo(250, 200, 320, 200); x.lineTo(320, 240); x.lineTo(0, 240); x.fillStyle = '#fbfdff'; x.fill();
    x.beginPath(); x.moveTo(0, 124); x.quadraticCurveTo(120, 132, 200, 184); x.quadraticCurveTo(250, 212, 320, 212); x.strokeStyle = '#d8e4f4'; x.lineWidth = 3; x.stroke(); x.lineWidth = 1;
    LN(x, [10, 118, 190, 172], '#cfdcf0', 1); LN(x, [14, 122, 194, 176], '#cfdcf0', 1);
    [[18, 112, 28], [46, 114, 22], [236, 190, 26]].forEach(([X, Y, h]) => pine(x, X, Y, h, '#2a6a4a', 1));
    R(x, 262, 150, 36, 26, '#8a5424'); PL(x, [258, 152, 280, 136, 302, 152], '#fff'); R(x, 276, 164, 8, 12, '#4a2a10'); R(x, 266, 156, 8, 7, '#ffd86a');
    R(x, 288, 132, 6, 12, '#6a4a3a'); [0, 1, 2].forEach(i => C(x, 293 + i * 4, 124 - i * 8, 3 + i, 'rgba(255,255,255,.7)'));
    [[70, 60, 34], [210, 30, 24]].forEach(([X, Y, s]) => cloud(x, X + 60, Y, s / 30));
  });
  PB('spooky', 'pumpkins', 'Pumpkin Patch', x => {
    sky(x, ['#2a1a4a', '#8a3a6a', '#ff9a5a'], 170); moonBg(x, 250, 44, 20, '#fff0b0');
    [[40, 30], [120, 50], [180, 22]].forEach(([X, Y]) => { x.fillStyle = '#1a1030'; x.beginPath(); x.moveTo(X, Y); x.quadraticCurveTo(X + 4, Y - 4, X + 8, Y); x.quadraticCurveTo(X + 12, Y - 4, X + 16, Y); x.lineTo(X + 8, Y + 2); x.fill(); });
    hill(x, 150, 5, 0.02, 1, '#3a2a3a'); R(x, 0, 170, VW, 70, '#5a3a22'); x.fillStyle = '#4a2e1a'; for (let Y = 176; Y < VH; Y += 10) x.fillRect(0, Y, VW, 2);
    for (let X = 0; X < VW; X += 26) { R(x, X + 10, 146, 5, 30, '#6a4a2a'); } R(x, 0, 152, VW, 4, '#6a4a2a'); R(x, 0, 164, VW, 4, '#6a4a2a');
    const r = rng(12); for (let i = 0; i < 12; i++) { const X = 10 + r() * 300, Y = 184 + r() * 50; QL(x, X - 20, Y + 4, X, Y - 6, X + 20, Y + 2, '#3a8a3a', 1.5); }
    [[30, 196, 14], [96, 210, 10], [150, 190, 8], [210, 222, 13], [276, 200, 16], [56, 230, 9], [250, 236, 8], [180, 234, 7]].forEach(([X, Y, s]) => { E(x, X - s * 0.45, Y, s * 0.7, s * 0.8, '#e0701a'); E(x, X + s * 0.45, Y, s * 0.7, s * 0.8, '#e0701a'); E(x, X, Y, s * 0.75, s * 0.85, '#ff8a1a'); R(x, X - 1.5, Y - s * 0.85 - 4, 3, 5, '#3a6a2a'); });
  });
  PB('spooky', 'haunted', 'Silly Haunted House', x => {
    sky(x, ['#1a0e3a', '#4a2a7a', '#8a5ab0'], 190); starsBg(x, 5, 50, 120); moonBg(x, 60, 46, 22);
    R(x, 0, 180, VW, 60, '#2a4a3a'); x.fillStyle = '#23402f'; for (let X = 0; X < VW; X += 14) x.fillRect(X, 180, 7, 60);
    PL(x, [150, 190, 170, 190, 190, 240, 130, 240], '#8a7a6a');
    x.save(); x.translate(160, 180); x.rotate(0.03);
    R(x, -70, -80, 140, 80, '#5a4a70'); PL(x, [-80, -78, -40, -120, 0, -104, 40, -128, 80, -78], '#2a1a3a');
    R(x, 30, -140, 30, 64, '#4a3a60'); PL(x, [24, -138, 45, -168, 66, -138], '#2a1a3a');
    [[-56, -64], [-20, -64], [16, -64], [38, -126]].forEach(([X, Y], i) => { R(x, X, Y, 18, 20, '#ffd84a'); R(x, X + 8, Y, 2, 20, '#5a4a70'); R(x, X, Y + 9, 18, 2, '#5a4a70'); if (i === 1) { C(x, X + 5, Y + 5, 1.6, '#3a2a10'); C(x, X + 13, Y + 5, 1.6, '#3a2a10'); } });
    x.beginPath(); x.moveTo(-10, 0); x.lineTo(-10, -26); x.quadraticCurveTo(0, -36, 10, -26); x.lineTo(10, 0); x.fillStyle = '#3a2210'; x.fill(); C(x, 6, -12, 1.4, '#ffd84a');
    x.restore();
    bareTree(x, 272, 186, 110, '#1a1428', 3); bareTree(x, 22, 190, 80, '#1a1428', 5);
    for (let X = 0; X < VW; X += 10) { if (X > 136 && X < 184) continue; R(x, X + 3, 186, 4, 18, '#101018'); PL(x, [X + 3, 186, X + 5, 182, X + 7, 186], '#101018'); } R(x, 0, 192, 134, 2, '#101018'); R(x, 186, 192, 134, 2, '#101018');
    [[210, 40], [236, 56], [110, 30]].forEach(([X, Y]) => { x.fillStyle = '#120a20'; x.beginPath(); x.moveTo(X - 7, Y); x.quadraticCurveTo(X - 3, Y - 4, X, Y); x.quadraticCurveTo(X + 3, Y - 4, X + 7, Y); x.lineTo(X, Y + 3); x.fill(); });
  });
  PB('spooky', 'spookwoods', 'Spooky Woods', x => {
    sky(x, ['#0a2230', '#16404a', '#2a5a5a']); moonBg(x, 160, 40, 16, '#e8fff0');
    [[20, 200, 150, 7], [80, 204, 120, 9], [250, 200, 160, 11], [300, 206, 110, 13], [150, 208, 90, 15]].forEach(([X, Y, h, s]) => bareTree(x, X, Y, h, '#0a1418', s));
    R(x, 0, 196, VW, 44, '#12261e'); hill(x, 196, 3, 0.05, 0, '#16302a');
    [[0, 150], [0, 176]].forEach(([_, Y], i) => { x.fillStyle = `rgba(220,255,240,${0.12 + i * 0.06})`; x.beginPath(); x.moveTo(0, Y); for (let X = 0; X <= VW; X += 20) x.quadraticCurveTo(X + 10, Y - 8, X + 20, Y); x.lineTo(VW, Y + 18); x.lineTo(0, Y + 18); x.fill(); });
    [[40, 212, '#6af0ff'], [58, 216, '#ff8af0'], [230, 210, '#6af0ff'], [276, 220, '#b0ff6a'], [180, 222, '#ff8af0']].forEach(([X, Y, c]) => { glow(x, X, Y - 3, 12, 'rgba(200,255,255,.3)'); R(x, X - 1, Y - 3, 2, 6, '#e8e0d0'); x.beginPath(); x.ellipse(X, Y - 3, 5, 4, 0, Math.PI, 0); x.fillStyle = c; x.fill(); });
    [[100, 120], [212, 96], [300, 140]].forEach(([X, Y]) => { C(x, X, Y, 2.2, '#ffe04a'); C(x, X + 6, Y, 2.2, '#ffe04a'); C(x, X, Y, 1, '#000'); C(x, X + 6, Y, 1, '#000'); });
  }, { over(x, T) { const r = rng(44); for (let i = 0; i < 14; i++) { const X = r() * VW + Math.sin(T * 0.8 + i) * 8, Y = 90 + r() * 110 + Math.cos(T * 0.6 + i * 2) * 5, k = 0.5 + 0.5 * Math.sin(T * 3 + i * 1.9); x.globalAlpha = k; glow(x, X, Y, 5, 'rgba(230,255,120,.8)'); x.globalAlpha = 1; } } });
  PB('adventure', 'castle', 'Castle', x => {
    sky(x, ['#5aaaf0', '#cfeaff'], 160); cloud(x, 30, 30, 0.9); cloud(x, 250, 22, 0.7);
    hill(x, 170, 4, 0.02, 0, '#6ab04a'); R(x, 0, 186, VW, 54, '#5aa040'); x.fillStyle = '#50963a'; for (let X = 0; X < VW; X += 16) x.fillRect(X, 186, 8, 54);
    bricks(x, 60, 80, 200, 110, '#a8a8b0', '#88888f', 14, 8);
    for (let X = 60; X < 260; X += 16) R(x, X, 72, 10, 10, '#a8a8b0');
    [[36, 50, 40], [244, 50, 40], [140, 30, 40]].forEach(([X, Y, w]) => { bricks(x, X, Y, w, 190 - Y, '#b4b4bc', '#90909a', 14, 8); for (let k = 0; k < w; k += 10) R(x, X + k, Y - 8, 6, 8, '#b4b4bc'); PL(x, [X - 4, Y - 8, X + w / 2, Y - 44, X + w + 4, Y - 8], '#3a5ab0'); LN(x, [X + w / 2, Y - 44, X + w / 2, Y - 60], '#555', 1.2); PL(x, [X + w / 2, Y - 60, X + w / 2 + 12, Y - 56, X + w / 2, Y - 52], '#e00000'); R(x, X + w / 2 - 4, Y + 16, 8, 14, '#3a2a4a'); });
    x.beginPath(); x.moveTo(136, 190); x.lineTo(136, 146); x.quadraticCurveTo(160, 122, 184, 146); x.lineTo(184, 190); x.fillStyle = '#3a2a1a'; x.fill();
    x.fillStyle = '#6a6a70'; for (let X = 140; X < 182; X += 7) x.fillRect(X, 132, 2, 58); for (let Y = 146; Y < 190; Y += 9) x.fillRect(136, Y, 48, 2);
    [[96, 110], [210, 110]].forEach(([X, Y]) => { x.beginPath(); x.moveTo(X, Y + 20); x.lineTo(X, Y + 6); x.quadraticCurveTo(X + 6, Y - 2, X + 12, Y + 6); x.lineTo(X + 12, Y + 20); x.fillStyle = '#3a2a4a'; x.fill(); });
    R(x, 0, 196, VW, 10, '#3a8ad0'); R(x, 130, 194, 60, 14, '#8a5424'); for (let X = 132; X < 190; X += 6) R(x, X, 194, 1, 14, '#6a3a18');
  });
  PB('adventure', 'ship', 'Pirate Ship Deck', x => {
    sky(x, ['#5aaaf0', '#d8f0ff'], 120); cloud(x, 40, 30, 0.8); cloud(x, 180, 18, 0.6);
    R(x, 0, 110, VW, 50, '#2a7ac8'); x.strokeStyle = 'rgba(255,255,255,.6)'; for (let Y = 118; Y < 158; Y += 10) { x.beginPath(); for (let X = (Y % 20); X < VW; X += 26) { x.moveTo(X, Y); x.quadraticCurveTo(X + 5, Y - 3, X + 10, Y); } x.stroke(); }
    R(x, 0, 176, VW, 64, '#b07a44'); x.fillStyle = '#8a5a2a'; for (let Y = 182; Y < VH; Y += 9) x.fillRect(0, Y, VW, 1); const r = rng(9); for (let i = 0; i < 20; i++) x.fillRect(r() * VW, 182 + Math.floor(r() * 6) * 9, 1, 9);
    R(x, 0, 140, VW, 6, '#6a3a18'); R(x, 0, 170, VW, 8, '#6a3a18'); for (let X = 6; X < VW; X += 18) RR(x, X, 146, 8, 24, 3, '#8a5424');
    R(x, 238, 0, 10, 176, '#6a3a18'); R(x, 180, 30, 128, 5, '#6a3a18'); R(x, 190, 100, 110, 5, '#6a3a18');
    x.beginPath(); x.moveTo(184, 35); x.quadraticCurveTo(244, 60, 304, 35); x.lineTo(296, 100); x.quadraticCurveTo(244, 112, 194, 100); x.closePath(); x.fillStyle = '#fff8e8'; x.fill(); x.strokeStyle = '#c8b898'; x.stroke();
    R(x, 226, 6, 34, 12, '#8a5424'); R(x, 226, 6, 34, 2, '#6a3a18');
    LN(x, [243, 20, 150, 140], '#8a6a4a', 1); LN(x, [243, 20, 320, 140], '#8a6a4a', 1); LN(x, [243, 40, 170, 140], '#8a6a4a', 1);
    R(x, 20, 150, 26, 30, '#8a5424'); R(x, 20, 156, 26, 3, '#555'); R(x, 20, 172, 26, 3, '#555'); E(x, 33, 150, 13, 3, '#6a3a18');
    band(x, () => { x.beginPath(); x.arc(80, 186, 9, 0, TAU); x.moveTo(89, 186); x.arc(80, 186, 5, 0, TAU); }, '#c8a870', 2);
  });
  PB('adventure', 'jungle', 'Jungle', x => {
    sky(x, ['#8ad890', '#d8f8c0'], 200);
    [[30, 60], [110, 40], [200, 70], [290, 50]].forEach(([X, w], i) => R(x, X, 0, w * 0.3, 200, i % 2 ? '#5a4a2a' : '#6a5a36'));
    const leaf = (X, Y, L, a, c) => { x.save(); x.translate(X, Y); x.rotate(a); x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(L * 0.5, -L * 0.3, L, 0); x.quadraticCurveTo(L * 0.5, L * 0.3, 0, 0); x.fillStyle = c; x.fill(); LN(x, [0, 0, L, 0], shade(c, -0.25), 0.8); x.restore(); };
    const r = rng(15); for (let i = 0; i < 26; i++) leaf(r() * VW, r() * 60, 30 + r() * 26, r() * TAU, i % 2 ? '#2a8a3a' : '#1e6a2e');
    [[40, 0, 120], [140, 0, 90], [230, 0, 140], [300, 0, 80]].forEach(([X, Y, L]) => { QL(x, X, Y, X + 12, Y + L / 2, X - 4, Y + L, '#3a7a2a', 2); for (let t = 20; t < L; t += 16) EL(x, X + 3 + Math.sin(t) * 3, t, 5, 2.4, (t % 32 ? 0.5 : -0.5), '#4aa03a'); });
    R(x, 0, 190, VW, 50, '#6a5a2a'); R(x, 0, 204, VW, 16, '#3a8ac0'); x.strokeStyle = 'rgba(255,255,255,.5)'; for (let X = 10; X < VW; X += 30) { x.beginPath(); x.moveTo(X, 212); x.quadraticCurveTo(X + 6, 209, X + 12, 212); x.stroke(); }
    for (let i = 0; i < 14; i++) leaf(i * 24, 196, 24 + (i % 3) * 6, -Math.PI / 2 - 0.5 + (i % 5) * 0.25, i % 2 ? '#2a9a3a' : '#1e7a30');
    [[60, 184], [180, 180], [270, 186]].forEach(([X, Y]) => { for (let k = 0; k < 5; k++) EL(x, X + Math.cos(k * 1.26) * 4, Y + Math.sin(k * 1.26) * 4, 3.5, 2, k * 1.26, '#ff4a6a'); C(x, X, Y, 2, '#ffe04a'); });
  });
  PB('adventure', 'island', 'Treasure Island', x => {
    sky(x, ['#3aaef0', '#c8ecff'], 130); cloud(x, 40, 30, 1); cloud(x, 220, 20, 0.7); ell(x, 270, 44, 16, 16, '#fff27a');
    R(x, 0, 120, VW, 120, '#1a8ad0'); x.fillStyle = '#29a6d8'; x.fillRect(0, 150, VW, 90);
    x.beginPath(); x.moveTo(-10, 240); x.quadraticCurveTo(20, 160, 160, 164); x.quadraticCurveTo(300, 160, 330, 240); x.fillStyle = '#f2d48a'; x.fill();
    x.beginPath(); x.moveTo(-10, 240); x.quadraticCurveTo(20, 164, 160, 168); x.quadraticCurveTo(300, 164, 330, 240); x.strokeStyle = 'rgba(255,255,255,.8)'; x.lineWidth = 2; x.stroke(); x.lineWidth = 1;
    palm(x, 60, 204); palm(x, 250, 196);
    LN(x, [196, 212, 208, 224], '#c02020', 3); LN(x, [208, 212, 196, 224], '#c02020', 3);
    [[110, 210, 10], [290, 220, 12], [150, 230, 6]].forEach(([X, Y, s]) => { E(x, X, Y, s, s * 0.6, '#8a8a90'); E(x, X - 2, Y - 2, s * 0.6, s * 0.3, '#a8a8b0'); });
    x.fillStyle = '#fff'; x.beginPath(); x.moveTo(170, 128); x.lineTo(182, 108); x.lineTo(184, 128); x.fill(); R(x, 166, 128, 22, 4, '#6a3a18');
  });
  PB('dino', 'volcano', 'Volcano Valley', x => {
    sky(x, ['#ff8a5a', '#ffc890', '#fff0c0'], 180);
    [[70, 30, 1.2], [110, 20, 0.9], [150, 36, 0.8]].forEach(([X, Y, s]) => { [[0, 0, 14], [12, -6, 12], [24, 0, 13]].forEach(([dx, dy, rr]) => E(x, X + dx * s, Y + dy * s, rr * s, rr * s * 0.8, 'rgba(110,90,90,.75)')); });
    PL(x, [40, 170, 110, 60, 140, 60, 220, 170], '#6a4a3a'); PL(x, [110, 60, 140, 60, 134, 66, 116, 66], '#ff5a1a');
    [[118, 66, 104, 120], [126, 66, 132, 110], [134, 66, 150, 130]].forEach(([a, b, c, d]) => QL(x, a, b, (a + c) / 2 + 4, (b + d) / 2, c, d, '#ff7a1a', 3));
    hill(x, 150, 6, 0.03, 0, '#8a9a4a'); R(x, 0, 186, VW, 54, '#8a7a3a'); x.fillStyle = '#7a6a30'; for (let i = 0; i < 20; i++) E(x, 10 + i * 17, 200 + (i % 3) * 12, 8, 2, '#7a6a30');
    [[20, 190], [300, 186], [240, 196]].forEach(([X, Y]) => { R(x, X - 2, Y - 34, 4, 34, '#6a4a2a'); for (let k = 0; k < 7; k++) { const a = -Math.PI + k * Math.PI / 6; EL(x, X + Math.cos(a) * 12, Y - 34 + Math.sin(a) * 8, 12, 3, a, '#3a8a2a'); } });
    [[80, 200], [180, 204]].forEach(([X, Y]) => { for (let k = 0; k < 5; k++) EL(x, X + (k - 2) * 5, Y - 6, 3, 10, (k - 2) * 0.35, '#2a7a2a'); });
  });
  PB('dino', 'swamp', 'Prehistoric Swamp', x => {
    sky(x, ['#9ad0a0', '#e0f0c8'], 150);
    [[10, 150, 90], [70, 154, 70], [240, 150, 100], [300, 154, 80]].forEach(([X, Y, h]) => { R(x, X - 3, Y - h, 6, h, '#5a4a2a'); for (let k = 0; k < 8; k++) { const a = -Math.PI + k * Math.PI / 7; EL(x, X + Math.cos(a) * 16, Y - h + Math.sin(a) * 10, 16, 3.5, a, '#2a7a3a'); } });
    hill(x, 150, 4, 0.04, 0, '#5a8a4a'); R(x, 0, 166, VW, 74, '#3a6a5a');
    x.fillStyle = 'rgba(255,255,255,.2)'; for (let Y = 172; Y < 230; Y += 12) for (let X = (Y % 24); X < VW; X += 40) x.fillRect(X, Y, 18, 1);
    [[60, 190], [140, 206], [230, 196], [290, 222]].forEach(([X, Y]) => { x.beginPath(); x.ellipse(X, Y, 12, 4, 0, 0.3, TAU - 0.1); x.lineTo(X, Y); x.fillStyle = '#4aa04a'; x.fill(); });
    E(x, 20, 226, 80, 30, '#5a7a3a'); E(x, 300, 236, 80, 26, '#5a7a3a');
    [[20, 200], [36, 204], [270, 212], [300, 214]].forEach(([X, Y]) => { LN(x, [X, Y, X, Y - 30], '#4a7a2a', 1.4); RR(x, X - 2, Y - 34, 4, 12, 2, '#6a4a2a'); });
    x.fillStyle = 'rgba(230,255,230,.35)'; x.fillRect(0, 150, VW, 10);
  });
  PB('dino', 'dig', 'Fossil Dig', x => {
    sky(x, ['#8acaff', '#fff0d0'], 120); ell(x, 60, 40, 15, 15, '#fff27a');
    [['#d89a5a', 70], ['#c8844a', 90], ['#e0aa6a', 110], ['#b87440', 130], ['#d09058', 150]].forEach(([c, Y]) => { x.beginPath(); x.moveTo(0, Y); for (let X = 0; X <= VW; X += 20) x.lineTo(X, Y + Math.sin(X * 0.04 + Y) * 4); x.lineTo(VW, 200); x.lineTo(0, 200); x.fillStyle = c; x.fill(); });
    const bone = (X, Y, a, L) => { x.save(); x.translate(X, Y); x.rotate(a); R(x, -L / 2, -1.5, L, 3, '#f4ecd8'); [-1, 1].forEach(s => { C(x, s * L / 2, -2, 2.3, '#f4ecd8'); C(x, s * L / 2, 2, 2.3, '#f4ecd8'); }); x.restore(); };
    bone(60, 100, 0.2, 20); bone(230, 124, -0.3, 16); bone(150, 142, 0.1, 24);
    for (let k = 0; k < 6; k++) arcL(x, 200 + k * 6, 96, 10 - k * 0.8, Math.PI, TAU, '#f4ecd8', 2);
    x.beginPath(); for (let a = 0; a < 5 * Math.PI; a += 0.2) { const rr = 0.5 + a * 0.5; x.lineTo(110 + rr * Math.cos(a), 80 + rr * Math.sin(a)); } x.strokeStyle = '#f4ecd8'; x.lineWidth = 1.6; x.stroke(); x.lineWidth = 1;
    R(x, 0, 192, VW, 48, '#f0c888'); const r = rng(5); for (let i = 0; i < 40; i++) R(x, r() * VW, 196 + r() * 40, 2, 1, '#d8a868');
    R(x, 20, 180, 30, 14, '#e0e0e0'); LN(x, [22, 180, 35, 170, 48, 180], '#999', 1); LN(x, [270, 200, 290, 160], '#8a5424', 2.5); PL(x, [264, 200, 276, 200, 274, 212, 266, 212], '#999');
    LN(x, [200, 180, 200, 210], '#8a5424', 1.5); LN(x, [240, 180, 240, 210], '#8a5424', 1.5); LN(x, [200, 184, 240, 184], '#ffd000', 1.5);
  });
  PB('space', 'moonbase', 'Moon Base', x => {
    sky(x, ['#000008', '#0a0a2a']); starsBg(x, 23, 120, 170);
    C(x, 250, 50, 24, '#2a6ad0'); x.save(); C(x, 250, 50, 24); x.clip(); [[240, 40, 10, 6], [262, 58, 9, 7], [246, 64, 6, 3]].forEach(([X, Y, a, b]) => E(x, X, Y, a, b, '#4ab04a')); E(x, 256, 34, 12, 3, 'rgba(255,255,255,.7)'); x.restore();
    x.fillStyle = '#9a9aa8'; x.beginPath(); x.moveTo(0, 180); for (let X = 0; X <= VW; X += 20) x.lineTo(X, 176 + Math.sin(X * 0.05) * 5); x.lineTo(VW, VH); x.lineTo(0, VH); x.fill();
    [[30, 206, 16], [150, 224, 10], [280, 214, 20]].forEach(([X, Y, w]) => { E(x, X, Y, w, w * 0.3, '#7a7a8a'); E(x, X, Y - 1, w * 0.8, w * 0.2, '#686878'); });
    [[70, 180, 34], [150, 180, 24]].forEach(([X, Y, rr]) => { x.beginPath(); x.arc(X, Y, rr, Math.PI, 0); x.fillStyle = 'rgba(190,230,255,.8)'; x.fill(); x.strokeStyle = '#d0d4dc'; x.lineWidth = 2; x.stroke(); x.lineWidth = 1; LN(x, [X, Y - rr, X, Y], 'rgba(255,255,255,.5)', 1); arcL(x, X, Y, rr * 0.6, Math.PI, 0, 'rgba(255,255,255,.5)', 1); });
    R(x, 100, 170, 30, 10, '#d0d4dc'); R(x, 100, 172, 30, 2, '#9a9aa8');
    LN(x, [220, 180, 220, 120], '#c0c4cc', 2); LN(x, [210, 180, 220, 140, 230, 180], '#c0c4cc', 1); x.beginPath(); x.ellipse(220, 118, 12, 5, -0.4, 0, Math.PI); x.fillStyle = '#e0e0e8'; x.fill(); C(x, 220, 120, 1.8, '#e00');
    [[56, 160], [72, 150], [86, 164]].forEach(([X, Y]) => R(x, X, Y, 4, 4, '#ffe070'));
  });
  PB('space', 'alienworld', 'Alien Planet', x => {
    sky(x, ['#ff9ad0', '#b060c0', '#4a2a8a'], 190); starsBg(x, 19, 30, 80); C(x, 60, 40, 18, '#ffe0a0'); C(x, 96, 60, 8, '#a0f0e0');
    hill(x, 160, 10, 0.02, 1, '#6a3aa0'); R(x, 0, 184, VW, 56, '#2aa090'); x.fillStyle = '#239080'; for (let i = 0; i < 16; i++) E(x, 10 + i * 20, 196 + (i % 3) * 14, 10, 2.5, '#239080');
    [[40, 186, 60, '#ff5fa0'], [120, 188, 40, '#ffe04a'], [220, 184, 70, '#6affd0'], [290, 190, 46, '#ff8a3a']].forEach(([X, Y, h, c]) => { QL(x, X, Y, X - 8, Y - h / 2, X + 2, Y - h, '#3a6a3a', 3); C(x, X + 2, Y - h, 7, c); C(x, X, Y - h - 2, 2.5, 'rgba(255,255,255,.6)'); });
    [[170, 200], [80, 214], [256, 220]].forEach(([X, Y]) => { PL(x, [X - 6, Y, X - 3, Y - 16, X, Y], '#b080ff'); PL(x, [X, Y, X + 4, Y - 22, X + 7, Y], '#d0a0ff'); PL(x, [X + 5, Y, X + 9, Y - 12, X + 12, Y], '#9060e0'); });
    [[150, 120, 30], [260, 110, 40]].forEach(([X, Y, rr]) => { x.beginPath(); x.ellipse(X, Y + 40, rr, rr * 0.6, 0, Math.PI, 0); x.fillStyle = '#8a4ab8'; x.fill(); });
  });
  PB('space', 'bridge', 'Spaceship Bridge', x => {
    R(x, 0, 0, VW, VH, '#1c2230');
    x.beginPath(); x.moveTo(30, 18); x.lineTo(290, 18); x.lineTo(270, 120); x.lineTo(50, 120); x.closePath(); x.fillStyle = '#02030e'; x.fill();
    x.save(); x.clip(); starsBg(x, 29, 90, 130); C(x, 220, 70, 30, '#e0892e'); x.fillStyle = 'rgba(120,40,0,.35)'; x.fillRect(190, 62, 60, 5); x.fillRect(192, 76, 56, 6); x.restore();
    x.lineWidth = 6; x.strokeStyle = '#8a92a8'; x.beginPath(); x.moveTo(30, 18); x.lineTo(290, 18); x.lineTo(270, 120); x.lineTo(50, 120); x.closePath(); x.stroke(); x.lineWidth = 1;
    LN(x, [160, 18, 160, 120], '#8a92a8', 4);
    R(x, 0, 150, VW, 90, '#4a5268'); x.fillStyle = '#3a4258'; for (let X = 0; X < VW; X += 20) x.fillRect(X, 190, 1, 50); for (let Y = 190; Y < VH; Y += 16) x.fillRect(0, Y, VW, 1);
    PL(x, [10, 150, 110, 150, 120, 186, 0, 186], '#6a7288'); PL(x, [210, 150, 310, 150, 320, 186, 200, 186], '#6a7288');
    [[20, 156], [214, 156]].forEach(([X, Y]) => { R(x, X, Y, 40, 16, '#0a2a1a'); LN(x, [X + 2, Y + 10, X + 10, Y + 4, X + 20, Y + 12, X + 38, Y + 5], '#40ff80', 1); for (let k = 0; k < 6; k++) C(x, X + 50 + k * 7, Y + 5, 2, ['#e00', '#fc0', '#0c0', '#08f', '#f0f', '#fff'][k]); for (let k = 0; k < 5; k++) R(x, X + 48 + k * 9, Y + 11, 6, 4, '#aab'); });
    R(x, 130, 176, 60, 10, '#6a7288'); R(x, 146, 146, 28, 32, '#8a92a8'); R(x, 150, 150, 20, 20, '#5a6278');
  });
  PB('space', 'launchpad', 'Launch Pad', x => {
    sky(x, ['#5aa8f0', '#e0f4ff'], 190); cloud(x, 200, 30, 0.8); cloud(x, 40, 50, 0.6);
    R(x, 0, 180, VW, 60, '#9a9a90'); R(x, 0, 180, VW, 3, '#7a7a70'); x.fillStyle = '#8a8a80'; for (let X = 0; X < VW; X += 40) x.fillRect(X, 183, 1, 57);
    for (let Y = 40; Y < 180; Y += 14) { LN(x, [60, Y, 84, Y + 14], '#c83a2a', 1.2); LN(x, [84, Y, 60, Y + 14], '#c83a2a', 1.2); } LN(x, [60, 40, 60, 180], '#c83a2a', 2.4); LN(x, [84, 40, 84, 180], '#c83a2a', 2.4);
    R(x, 84, 70, 40, 3, '#c83a2a'); R(x, 84, 120, 40, 3, '#c83a2a');
    x.beginPath(); x.moveTo(146, 36); x.quadraticCurveTo(166, 60, 166, 90); x.lineTo(166, 160); x.lineTo(126, 160); x.lineTo(126, 90); x.quadraticCurveTo(126, 60, 146, 36); x.fillStyle = '#f4f4f8'; x.fill(); x.strokeStyle = '#999'; x.stroke();
    x.beginPath(); x.moveTo(146, 36); x.quadraticCurveTo(158, 50, 162, 64); x.lineTo(130, 64); x.quadraticCurveTo(134, 50, 146, 36); x.fillStyle = '#e03030'; x.fill();
    PL(x, [126, 130, 110, 166, 126, 160], '#e03030'); PL(x, [166, 130, 182, 166, 166, 160], '#e03030'); C(x, 146, 96, 8, '#8fd0ff'); arcL(x, 146, 96, 8, 0, TAU, '#999', 2);
    R(x, 116, 160, 60, 20, '#6a6a70'); R(x, 230, 140, 70, 40, '#e8e8e0'); R(x, 236, 150, 58, 10, '#5a8ac0'); R(x, 256, 124, 4, 16, '#999'); C(x, 258, 122, 5, '#ddd');
  });
  PB('sports', 'stadium', 'Soccer Stadium', x => {
    sky(x, ['#1a2a6a', '#4a6ab8'], 90);
    [[20, 20], [300, 20]].forEach(([X]) => { R(x, X - 2, 20, 4, 80, '#888'); R(x, X - 14, 10, 28, 12, '#ddd'); for (let k = 0; k < 4; k++) C(x, X - 9 + k * 6, 16, 2.2, '#fffbe0'); glow(x, X, 16, 30, 'rgba(255,255,220,.35)'); });
    for (let row = 0; row < 7; row++) { const Y = 60 + row * 14; R(x, 0, Y, VW, 14, row % 2 ? '#5a5a6a' : '#6a6a7a'); const r = rng(row + 3); for (let X = 3; X < VW; X += 7) C(x, X + r() * 2, Y + 6, 2.6, RAINBOW[Math.floor(r() * 8)] === '#ffffff' ? '#f0d0b0' : RAINBOW[Math.floor(r() * 7)]); }
    R(x, 0, 156, VW, 6, '#2a5ab0'); R(x, 0, 162, VW, 78, '#3aa040'); x.fillStyle = '#34943a'; for (let X = 0; X < VW; X += 40) x.fillRect(X, 162, 20, 78);
    x.strokeStyle = '#fff'; x.lineWidth = 2; x.beginPath(); x.moveTo(160, 162); x.lineTo(160, 240); x.stroke(); x.beginPath(); x.ellipse(160, 206, 40, 14, 0, 0, TAU); x.stroke(); x.lineWidth = 1;
  });
  PB('sports', 'gym', 'Basketball Court', x => {
    bricks(x, 0, 0, VW, 170, '#e8d8a8', '#d4c490', 20, 10);
    R(x, 110, 16, 100, 40, '#202020'); R(x, 112, 18, 96, 36, '#101010'); x.fillStyle = '#ff4020'; x.font = 'bold 14px "Courier New",monospace'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('12', 138, 42); x.fillText('10', 182, 42); x.fillStyle = '#ffd000'; x.font = 'bold 7px Arial,sans-serif'; x.fillText('HOME', 138, 26); x.fillText('GUEST', 182, 26);
    for (let k = 0; k < 4; k++) { R(x, 0, 110 + k * 16, 90 - k * 10, 16, k % 2 ? '#c89060' : '#b88050'); const r = rng(k + 11); for (let X = 4; X < 86 - k * 10; X += 8) C(x, X + r() * 2, 112 + k * 16, 2.6, RAINBOW[Math.floor(r() * 7)]); }
    R(x, 272, 70, 40, 28, '#fff'); R(x, 272, 70, 40, 28, null); R(x, 284, 82, 16, 12, null); x.strokeStyle = '#e00'; x.strokeRect(284, 82, 16, 12); x.strokeStyle = '#333'; x.strokeRect(272, 70, 40, 28); R(x, 312, 76, 8, 6, '#888');
    x.beginPath(); x.ellipse(292, 100, 10, 2.5, 0, 0, TAU); x.strokeStyle = '#ff5010'; x.lineWidth = 2; x.stroke(); x.lineWidth = 1; for (let k = 0; k < 5; k++) LN(x, [283 + k * 4.5, 100, 286 + k * 3, 114], '#ddd', 0.6);
    R(x, 0, 170, VW, 70, '#d8a060'); x.fillStyle = '#c89050'; for (let X = 0; X < VW; X += 12) x.fillRect(X, 170, 1, 70);
    x.strokeStyle = '#fff'; x.lineWidth = 2; x.beginPath(); x.moveTo(0, 176); x.lineTo(VW, 176); x.stroke(); x.beginPath(); x.moveTo(160, 176); x.lineTo(160, 240); x.stroke(); x.beginPath(); x.ellipse(160, 210, 34, 12, 0, 0, TAU); x.stroke();
    x.strokeStyle = '#c02020'; x.beginPath(); x.moveTo(320, 186); x.lineTo(250, 186); x.lineTo(250, 230); x.lineTo(320, 230); x.stroke(); x.lineWidth = 1;
  });
  PB('sports', 'track', 'Running Track', x => {
    sky(x, ['#5aaaf0', '#d8f0ff'], 130); cloud(x, 60, 30, 0.8); cloud(x, 240, 20, 0.6);
    for (let row = 0; row < 4; row++) { const Y = 90 + row * 12; R(x, 0, Y, VW, 12, row % 2 ? '#7a7a8a' : '#8a8a9a'); const r = rng(row + 40); for (let X = 3; X < VW; X += 7) C(x, X, Y + 5, 2.4, RAINBOW[Math.floor(r() * 7)]); }
    R(x, 0, 138, VW, 36, '#4aa848'); R(x, 0, 174, VW, 66, '#c8583a');
    for (let Y = 186; Y < VH; Y += 14) R(x, 0, Y, VW, 1.5, '#fff'); R(x, 0, 174, VW, 2, '#fff');
    for (let Y = 174; Y < VH; Y += 5) for (let k = 0; k < 2; k++) R(x, 250 + k * 5 + ((Y - 174) / 5 % 2) * 5, Y, 5, 5, '#fff'); for (let Y = 174; Y < VH; Y += 5) for (let k = 0; k < 2; k++) R(x, 255 + k * 5 - ((Y - 174) / 5 % 2) * 5, Y, 5, 5, '#111');
    LN(x, [246, 174, 246, 120], '#ddd', 2); LN(x, [274, 174, 274, 120], '#ddd', 2); R(x, 240, 116, 40, 12, '#fff'); x.fillStyle = '#e00'; x.font = 'bold 9px Arial,sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('FINISH', 260, 122);
  });
  PB('sea', 'reef', 'Coral Reef', x => {
    sky(x, ['#4ad0f0', '#1a88c8', '#0a5aa0']);
    x.fillStyle = 'rgba(255,255,255,.1)'; [[30, 24], [140, 40], [240, 30]].forEach(([X, w]) => { x.beginPath(); x.moveTo(X, 0); x.lineTo(X + w, 0); x.lineTo(X + w + 40, 190); x.lineTo(X + 20, 190); x.fill(); });
    x.beginPath(); x.moveTo(0, 200); x.quadraticCurveTo(160, 190, VW, 204); x.lineTo(VW, VH); x.lineTo(0, VH); x.fillStyle = '#f0dca0'; x.fill();
    const coral = (X, Y, h, c, seed) => { const r = rng(seed); const br = (x0, y0, a, L, w, d) => { const x1 = x0 + Math.cos(a) * L, y1 = y0 + Math.sin(a) * L; LN(x, [x0, y0, x1, y1], c, w); if (d) { br(x1, y1, a - 0.45 - r() * 0.2, L * 0.72, w * 0.72, d - 1); br(x1, y1, a + 0.45 + r() * 0.2, L * 0.72, w * 0.72, d - 1); } else C(x, x1, y1, w * 0.7, c); }; br(X, Y, -Math.PI / 2, h * 0.35, 5, 3); };
    coral(40, 204, 70, '#ff6a8a', 1); coral(250, 206, 80, '#ff9a3a', 2); coral(290, 208, 50, '#b060e0', 3); coral(110, 204, 44, '#ffd04a', 4);
    [[180, 204, 28, '#e04a8a'], [70, 210, 20, '#40c0a0']].forEach(([X, Y, rr, c]) => { x.beginPath(); x.moveTo(X, Y); x.arc(X, Y - 4, rr, Math.PI * 1.1, Math.PI * 1.9); x.closePath(); x.fillStyle = c; x.fill(); for (let k = -3; k <= 3; k++) LN(x, [X, Y, X + k * rr / 3.5, Y - rr * 0.9 + Math.abs(k) * 2], shade(c, -0.25), 0.8); });
    [[140, 214], [210, 222], [24, 226]].forEach(([X, Y]) => { for (let k = 0; k < 7; k++) { const a = -Math.PI + k * Math.PI / 6; QL(x, X, Y, X + Math.cos(a) * 6, Y + Math.sin(a) * 10 - 4, X + Math.cos(a) * 9, Y + Math.sin(a) * 12, '#ff80c0', 1.8); } });
    const fish = (X, Y, c, d) => { ell(x, X, Y, 7, 4, c); x.fillStyle = c; x.beginPath(); x.moveTo(X - 6 * d, Y); x.lineTo(X - 11 * d, Y - 4); x.lineTo(X - 11 * d, Y + 4); x.fill(); ell(x, X + 3.5 * d, Y - 1, 1.2, 1.2, '#000'); };
    fish(80, 90, '#ffe020', 1); fish(96, 100, '#ffe020', 1); fish(230, 70, '#ff60b0', -1); fish(200, 130, '#60e0ff', -1);
    x.strokeStyle = 'rgba(255,255,255,.7)'; [[160, 150, 3], [164, 136, 2], [158, 122, 2.5]].forEach(([X, Y, rr]) => { x.beginPath(); x.arc(X, Y, rr, 0, TAU); x.stroke(); });
  });
  PB('sea', 'wreck', 'Sunken Ship', x => {
    sky(x, ['#2a90c8', '#12508a', '#082a5a']);
    x.beginPath(); x.moveTo(0, 206); x.quadraticCurveTo(160, 196, VW, 208); x.lineTo(VW, VH); x.lineTo(0, VH); x.fillStyle = '#c8b888'; x.fill();
    x.save(); x.translate(170, 190); x.rotate(-0.12);
    x.beginPath(); x.moveTo(-100, -40); x.lineTo(90, -40); x.lineTo(70, 10); x.lineTo(-80, 10); x.closePath(); x.fillStyle = '#5a3a22'; x.fill();
    x.fillStyle = '#4a2e18'; for (let Y = -32; Y < 10; Y += 8) x.fillRect(-96, Y, 186, 1.5);
    [[-60, -22], [-30, -22], [0, -22], [30, -22]].forEach(([X, Y]) => { C(x, X, Y, 5, '#1a2a3a'); arcL(x, X, Y, 5, 0, TAU, '#b8a060', 1.5); });
    PL(x, [-40, -40, 10, -40, 20, -60, -30, -60], '#4a2e18'); LN(x, [-6, -60, 10, -140], '#4a2e18', 5); LN(x, [-6, -120, 30, -112], '#4a2e18', 3);
    PL(x, [10, -130, 40, -120, 36, -96, 12, -104], 'rgba(240,230,210,.5)');
    x.restore();
    [[30, 210], [70, 216], [290, 214], [260, 220]].forEach(([X, Y], i) => { x.lineWidth = 3; x.strokeStyle = i % 2 ? '#1e7a4a' : '#2a9a5a'; x.beginPath(); x.moveTo(X, Y); for (let yy = Y - 10; yy > Y - 70; yy -= 10) x.quadraticCurveTo(X + ((yy / 10) % 2 ? 7 : -7), yy + 5, X, yy); x.stroke(); x.lineWidth = 1; });
    R(x, 200, 214, 18, 10, '#8a5424'); x.beginPath(); x.ellipse(209, 214, 9, 5, 0, Math.PI, 0); x.fillStyle = '#9a6430'; x.fill(); glow(x, 209, 212, 14, 'rgba(255,220,80,.5)');
    x.strokeStyle = 'rgba(255,255,255,.6)'; [[120, 120, 3], [124, 104, 2], [118, 90, 2.5]].forEach(([X, Y, rr]) => { x.beginPath(); x.arc(X, Y, rr, 0, TAU); x.stroke(); });
  });
  PB('sea', 'deep', 'Deep Sea', x => {
    sky(x, ['#0a2a5a', '#04122e', '#020818']);
    PL(x, [0, 240, 0, 140, 30, 150, 50, 190, 80, 200, 90, 240], '#0a1a30'); PL(x, [320, 240, 320, 120, 290, 140, 270, 180, 240, 206, 230, 240], '#0a1a30');
    x.beginPath(); x.moveTo(0, 226); x.quadraticCurveTo(160, 214, VW, 228); x.lineTo(VW, VH); x.lineTo(0, VH); x.fillStyle = '#16223a'; x.fill();
    const r = rng(51); for (let i = 0; i < 40; i++) { const X = r() * VW, Y = r() * 210, c = ['#6affff', '#ff8af0', '#b0ff6a', '#8ab0ff'][i % 4]; glow(x, X, Y, 3 + r() * 4, c.replace(/^#(..)(..)(..)$/, (m, a, b, cc) => `rgba(${parseInt(a, 16)},${parseInt(b, 16)},${parseInt(cc, 16)},.6)`)); x.fillStyle = c; x.fillRect(X, Y, 1, 1); }
    [[60, 214, '#6affff'], [260, 216, '#ff8af0']].forEach(([X, Y, c]) => { for (let k = -2; k <= 2; k++) QL(x, X + k * 3, Y, X + k * 5, Y - 14, X + k * 6, Y - 24, c, 1.2); });
  });
  PB('fantasy', 'forest', 'Enchanted Forest', x => {
    sky(x, ['#2a1a5a', '#5a3a8a', '#8a70b0'], 190);
    [[20, 26], [80, 20], [150, 30], [220, 22], [290, 28]].forEach(([X, w], i) => { R(x, X - w / 2, 0, w, 200, i % 2 ? '#3a2a4a' : '#4a3a5a'); E(x, X, 20, w * 1.6, 34, i % 2 ? '#2a5a4a' : '#1e4a3a'); });
    R(x, 0, 190, VW, 50, '#2a4a3a'); x.beginPath(); x.moveTo(130, 240); x.quadraticCurveTo(150, 210, 160, 190); x.lineTo(176, 190); x.quadraticCurveTo(190, 210, 210, 240); x.fillStyle = '#6a5a7a'; x.fill();
    [[40, 204, '#6affff', 10], [70, 214, '#ff8af0', 7], [250, 208, '#6affff', 12], [290, 222, '#ffe04a', 8], [110, 226, '#ff8af0', 6]].forEach(([X, Y, c, s]) => { glow(x, X, Y - s * 0.4, s * 2.2, 'rgba(200,240,255,.35)'); R(x, X - s * 0.2, Y - s * 0.5, s * 0.4, s * 0.8, '#f0e8f0'); x.beginPath(); x.ellipse(X, Y - s * 0.5, s * 0.8, s * 0.6, 0, Math.PI, 0); x.fillStyle = c; x.fill(); });
    [[30, 230], [220, 230], [300, 200]].forEach(([X, Y]) => { for (let k = 0; k < 5; k++) EL(x, X + Math.cos(k * 1.26) * 3, Y + Math.sin(k * 1.26) * 3, 2.6, 1.6, k * 1.26, '#ffd0f0'); C(x, X, Y, 1.4, '#ffe04a'); });
  }, { over(x, T) { sparkleSet(x, [[60, 80], [120, 120], [200, 60], [270, 110], [100, 170], [240, 160], [160, 100], [30, 140]], T, '#fff8b0', 2.6); } });
  PB('fantasy', 'rainbowland', 'Rainbow Meadow', x => {
    sky(x, ['#8ad0ff', '#e0f4ff'], 170);
    ['#e02020', '#ff8a1a', '#f4d000', '#40b040', '#2a70e0', '#8a40c0'].forEach((c, i) => arcL(x, 160, 190, 150 - i * 8, Math.PI, TAU, c, 8));
    cloud(x, 0, 150, 1.4); cloud(x, 290, 150, 1.4); cloud(x, 120, 30, 0.7);
    hill(x, 160, 8, 0.02, 2, '#8ad06a'); PL(x, [226, 150, 226, 120, 232, 112, 238, 120, 238, 150], '#ff9ad0'); PL(x, [240, 150, 240, 110, 248, 100, 256, 110, 256, 150], '#ffb0e0'); PL(x, [224, 122, 232, 104, 240, 122], '#a060e0'); PL(x, [238, 112, 248, 92, 258, 112], '#a060e0');
    R(x, 0, 180, VW, 60, '#6ac050'); x.fillStyle = '#5ab040'; for (let X = 0; X < VW; X += 14) x.fillRect(X, 180, 7, 60);
    const r = rng(33); for (let i = 0; i < 40; i++) C(x, r() * VW, 186 + r() * 52, 2, ['#ff5fa0', '#fff', '#ffe04a', '#b070f0'][i % 4]);
  });
  PB('fantasy', 'crystalcave', 'Crystal Cave', x => {
    R(x, 0, 0, VW, VH, '#1a1030');
    x.fillStyle = '#2a1a44'; x.beginPath(); x.moveTo(0, 0); for (let X = 0; X <= VW; X += 20) x.lineTo(X, 30 + Math.sin(X * 0.08) * 16 + (X % 40 ? 10 : 0)); x.lineTo(VW, 0); x.fill();
    PL(x, [0, 0, 40, 60, 20, 120, 50, 200, 0, 220], '#2a1a44'); PL(x, [320, 0, 280, 70, 300, 130, 270, 200, 320, 220], '#2a1a44');
    R(x, 0, 196, VW, 44, '#3a2a54'); x.fillStyle = '#4a3a64'; for (let i = 0; i < 12; i++) E(x, 20 + i * 28, 206 + (i % 2) * 12, 12, 3, '#4a3a64');
    const cr = (X, Y, h, c, a = 0) => { x.save(); x.translate(X, Y); x.rotate(a); glow(x, 0, -h / 2, h, c + '55'); PL(x, [-h * 0.18, 0, -h * 0.18, -h * 0.8, 0, -h, h * 0.18, -h * 0.8, h * 0.18, 0], c); PL(x, [0, 0, 0, -h, h * 0.18, -h * 0.8, h * 0.18, 0], shade(c, -0.25)); x.restore(); };
    [[40, 200, 40, '#6af0ff', -0.3], [60, 202, 60, '#6af0ff', 0], [80, 200, 34, '#6af0ff', 0.35], [250, 200, 54, '#ff7af0', -0.2], [272, 202, 36, '#ff7af0', 0.3], [160, 204, 26, '#b0ff8a', 0]].forEach(a => cr(...a));
    [[120, 40, 24, '#6af0ff', Math.PI], [200, 44, 30, '#ff7af0', Math.PI], [160, 36, 18, '#fff08a', Math.PI]].forEach(a => cr(...a));
  });
  PB('fantasy', 'cloudkingdom', 'Cloud Kingdom', x => {
    sky(x, ['#ffc0e0', '#c0d8ff', '#e0f0ff']); ell(x, 60, 50, 18, 18, '#fff6a0'); glow(x, 60, 50, 40, 'rgba(255,250,200,.5)');
    PL(x, [190, 190, 190, 90, 200, 80, 210, 90, 210, 190], '#fff0f8'); PL(x, [220, 190, 220, 70, 234, 56, 248, 70, 248, 190], '#fff8ff'); PL(x, [258, 190, 258, 96, 266, 88, 274, 96, 274, 190], '#fff0f8'); R(x, 210, 130, 48, 60, '#f8e8f8');
    PL(x, [186, 92, 200, 66, 214, 92], '#c080f0'); PL(x, [216, 72, 234, 38, 252, 72], '#c080f0'); PL(x, [254, 98, 266, 76, 278, 98], '#c080f0');
    x.beginPath(); x.moveTo(227, 176); x.lineTo(227, 150); x.arc(234, 150, 7, Math.PI, 0); x.lineTo(241, 176); x.fillStyle = '#e0b0ff'; x.fill(); [[196, 106], [262, 110], [230, 90]].forEach(([X, Y]) => R(x, X, Y, 6, 9, '#ffe0a0'));
    [[0, 180, 2], [80, 196, 1.7], [170, 176, 2.2], [250, 194, 1.8], [310, 180, 1.6], [40, 222, 2.2], [150, 226, 2.4], [260, 230, 2.2]].forEach(([X, Y, s]) => cloud(x, X - 11 * s, Y, s));
    R(x, 0, 214, VW, 26, '#fff');
  });

  /* ---------- Extras packs (bought with play money) ---------- */
  const PACKS = [
    { id: 'holiday', n: 'Winter Holidays', price: 3.95, blurb: 'Snowy streets, a crackling fireplace and a sledding hill. Build a snowman and trim the tree.', demo: ['village', [[100, 90, 176, 1.3], [105, 250, 168, 1.4], [101, 160, 204, 1.2], [103, 170, 70, 1]]] },
    { id: 'spooky', n: 'Spooky Fun', price: 3.95, blurb: 'Not-too-scary fun: a silly haunted house, a pumpkin patch and a friendly ghost or two.', demo: ['haunted', [[121, 240, 110, 1.4], [120, 70, 200, 1.4], [122, 110, 60, 1.1], [123, 180, 204, 1.2]]] },
    { id: 'adventure', n: 'Adventure', price: 3.95, blurb: 'Set sail for treasure! A castle, a pirate ship deck, a jungle and a desert island.', demo: ['island', [[140, 200, 204, 1.4], [141, 80, 150, 1.3], [142, 140, 110, 1.3]]] },
    { id: 'dino', n: 'Dinosaurs', price: 3.95, blurb: 'Stomp through a volcano valley with friendly dinosaurs, eggs and fossils.', demo: ['volcano', [[160, 230, 170, 1.5], [161, 90, 190, 1.2], [166, 170, 212, 1.3], [164, 180, 50, 1]]] },
    { id: 'space', n: 'Deep Space', price: 4.95, blurb: 'A moon base, an alien planet, a spaceship bridge and a launch pad, with robots, rockets and UFOs.', demo: ['moonbase', [[180, 110, 60, 1.4], [181, 240, 178, 1.3], [182, 180, 180, 1.3], [185, 60, 196, 1.2]]] },
    { id: 'sports', n: 'Sports Day', price: 2.95, blurb: 'Take the field: a stadium, a basketball court and a running track, with trophies and medals.', demo: ['stadium', [[202, 270, 184, 1.4], [200, 110, 176, 1.4], [201, 170, 176, 1.3], [203, 210, 120, 1.2]]] },
    { id: 'sea', n: 'Ocean Explorer', price: 2.95, blurb: 'Dive to a coral reef, a sunken ship and the deep sea. Meet an octopus, a whale and more.', demo: ['reef', [[221, 90, 170, 1.3], [224, 200, 80, 1.1], [220, 250, 150, 1.2], [229, 110, 70, 1]]] },
    { id: 'fantasy', n: 'Fantasy', price: 4.95, blurb: 'An enchanted forest, a crystal cave, a rainbow meadow and a cloud kingdom, with a friendly dragon and a unicorn.', demo: ['forest', [[240, 230, 170, 1.4], [241, 90, 180, 1.3], [242, 170, 90, 1.2], [247, 140, 60, 1.2]]] }
  ];
  // Props that sit on a head: distance from the head's center to the prop's center (the Cast puts them on the picked figure).
  [[1, 8.5], [9, 13.5], [18, 12.5], [124, 15], [245, 15], [148, -3]].forEach(([k, d]) => { PR[k].hat = d; });
  const BUNDLE = { id: 'bundle', n: 'Everything Bundle', price: 19.95 };
  const packOf = id => PACKS.find(p => p.id === id);
  const packProps = id => Object.keys(PR).map(Number).filter(k => PR[k].pack === id);
  const packBgs = id => BGS.filter(b => BG[b].pack === id);
  const packSnds = id => SOUNDS.filter(s => s[2] === id);
  const money = v => '$' + v.toFixed(2);
  const PCATS = [['party', 'Party'], ['basic', 'Basics'], ['pets', 'Pets & Toys']];
  const BCATS = [['party', 'Party'], ['out', 'Outdoors'], ['in', 'Indoors']];

  /* ---------- sound effects ---------- */
  const mf = n => 440 * Math.pow(2, (n - 69) / 12);
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
      honk() { tone(233, 0.35, { type: 'square', vol: 0.06 }); tone(236, 0.35, { type: 'sawtooth', vol: 0.05 }); tone(233, 0.2, { at: 0.42, type: 'square', vol: 0.06 }); },
      horn() { tone(466, 0.1, { type: 'sawtooth', to: 560, vol: 0.06 }); tone(470, 0.1, { type: 'square', to: 566, vol: 0.03 }); tone(560, 0.55, { at: 0.1, type: 'sawtooth', to: 530, vol: 0.06 }); tone(566, 0.55, { at: 0.1, type: 'square', to: 538, vol: 0.03 }); noise(0.65, { ft: 'bandpass', f: 2400, q: 3, vol: 0.025 }); },
      clap() { noise(1.8, { ft: 'bandpass', f: 1500, q: 0.5, vol: 0.03, attack: 0.1, release: 0.7 }); for (let i = 0; i < 34; i++) noise(0.05, { at: Math.random() * 1.6, ft: 'bandpass', f: 900 + Math.random() * 1600, q: 1.4, vol: 0.1, decay: 1 }); },
      // "Happy Birthday to You" (the melody is in the public domain), in two halves so it can span a scene.
      bday() { song(0); }, bday2() { song(1); },
      jingle() { for (let i = 0; i < 10; i++) { const at = i * 0.12 + (i % 2) * 0.02; noise(0.08, { at, ft: 'highpass', f: 6000, vol: 0.07, decay: 1 }); tone(2600 + (i % 3) * 300, 0.12, { at, type: 'sine', vol: 0.03, decay: 1 }); } },
      ooo() { tone(300, 1.3, { type: 'sine', to: 440, vol: 0.07, attack: 0.3, release: 0.5 }); tone(304, 1.3, { type: 'triangle', to: 380, vol: 0.04, attack: 0.3, release: 0.5, at: 0.05 }); },
      fanfare() { [[72, 0, 0.14], [76, 0.15, 0.14], [79, 0.3, 0.14], [84, 0.45, 0.6]].forEach(([n, at, d]) => { tone(mf(n), d, { at, type: 'sawtooth', vol: 0.05 }); tone(mf(n), d, { at, type: 'square', vol: 0.03 }); }); },
      roar() { noise(1.0, { ft: 'lowpass', f: 600, vol: 0.12, attack: 0.08, release: 0.5 }); tone(120, 1.0, { type: 'sawtooth', to: 70, vol: 0.07, attack: 0.08, release: 0.4 }); },
      beam() { for (let i = 0; i < 6; i++) tone(i % 2 ? 1300 : 650, 0.14, { at: i * 0.14, type: 'sine', to: i % 2 ? 650 : 1300, vol: 0.06 }); },
      whistle() { for (let i = 0; i < 14; i++) tone(i % 2 ? 2900 : 2700, 0.035, { at: i * 0.035, type: 'sine', vol: 0.06 }); tone(2800, 0.3, { at: 0.5, type: 'sine', vol: 0.06 }); },
      bubbles() { for (let i = 0; i < 8; i++) tone(300 + Math.random() * 400, 0.08, { at: i * 0.1, type: 'sine', to: 900 + Math.random() * 600, vol: 0.07, decay: 1 }); },
      magic() { [84, 88, 91, 96, 100, 103].forEach((n, i) => tone(mf(n), 0.25, { at: i * 0.07, type: 'sine', vol: 0.05, decay: 1 })); noise(0.8, { ft: 'highpass', f: 7000, vol: 0.03, attack: 0.2, release: 0.5 }); }
    };
    function song(part) {
      const M = part ? [[67, 0.75], [67, 0.25], [79, 1], [76, 1], [72, 1], [71, 1], [69, 2], [77, 0.75], [77, 0.25], [76, 1], [72, 1], [74, 1], [72, 2.5]]
        : [[67, 0.75], [67, 0.25], [69, 1], [67, 1], [72, 1], [71, 2], [67, 0.75], [67, 0.25], [69, 1], [67, 1], [74, 1], [72, 2]];
      const BS = part ? [[1, 48, 3], [4, 41, 3], [8, 48, 2], [10, 43, 1], [11, 48, 2.5]] : [[1, 48, 3], [4, 43, 3], [7, 43, 3], [10, 48, 2]];
      const b = 0.3; let t = 0;
      M.forEach(([n, d]) => { tone(mf(n), d * b * 0.92, { at: t, type: 'triangle', vol: 0.11 }); tone(mf(n + 12), d * b * 0.8, { at: t, type: 'square', vol: 0.012 }); t += d * b; });
      BS.forEach(([at, n, d]) => tone(mf(n), d * b * 0.9, { at: at * b, type: 'triangle', vol: 0.06 }));
    }
    if (S[id]) S[id]();
  }
  // The same sound recipes, played into any AudioContext node (used to record sound into a video file).
  function synth(ac, dest) {
    const nb = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), d = nb.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    function env(g, t, dur, v, o) {
      g.gain.setValueAtTime(0.0001, t);
      if (o.decay) { g.gain.linearRampToValueAtTime(v, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); }
      else { const a = o.attack || 0.004, r = o.release || 0.02; g.gain.linearRampToValueAtTime(v, t + a); g.gain.setValueAtTime(v, t + Math.max(dur - r, a + 0.001)); g.gain.linearRampToValueAtTime(0.0001, t + dur); }
    }
    const tone = (f, dur, o = {}) => {
      const t = ac.currentTime + (o.at || 0), osc = ac.createOscillator(), g = ac.createGain();
      osc.type = o.type || 'square'; osc.frequency.setValueAtTime(f, t); if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + dur);
      env(g, t, dur, o.vol ?? 0.1, o); osc.connect(g); g.connect(dest); osc.start(t); osc.stop(t + dur + 0.05);
    };
    const noise = (dur, o = {}) => {
      const t = ac.currentTime + (o.at || 0), src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
      src.buffer = nb; src.loop = true; f.type = o.ft || 'bandpass'; f.frequency.value = o.f || 2000; f.Q.value = o.q || 1;
      env(g, t, dur, o.vol ?? 0.2, o); src.connect(f); f.connect(g); g.connect(dest); src.start(t, Math.random()); src.stop(t + dur + 0.05);
    };
    return { tone, noise, sfx: { ding() { tone(1318.5, 0.7, { type: 'triangle', vol: 0.12, decay: 1 }); tone(1975.5, 0.5, { type: 'sine', vol: 0.05, decay: 1, at: 0.01 }); } } };
  }

  /* ---------- whole-movie timeline (shared player and video export) ---------- */
  // Title card, the frames (a looping movie plays a few times, so it still ends), credits, then a short hold.
  function mkSeq(m) {
    const seq = []; let t = 0;
    const add = (k, d, x) => { seq.push({ k, t0: t, d, ...x }); t += d; };
    if (m.title.on && (m.title.text || m.title.sub)) add('title', 2.4);
    const n = m.frames.length, reps = m.loop ? clamp(Math.ceil(6 * m.fps / n), 1, 3) : 1;
    add('frames', n * reps / m.fps, { n: n * reps });
    if (m.credits.on && m.credits.text.trim()) add('credits', creditsDur(m));
    return { seq, total: t + 0.4 };
  }
  // Draws the movie at time t (seconds). Returns { i: frame index or -1, g: frame counter for sounds }.
  function renderAt(ctx, m, S, t, w, h) {
    const st = S.seq.find(s => t < s.t0 + s.d) || S.seq[S.seq.length - 1], lt = clamp(t - st.t0, 0, st.d);
    if (st.k === 'frames') {
      const n = m.frames.length, g = Math.min(st.n - 1, Math.floor(lt * m.fps)), i = g % n;
      drawFrame(ctx, bgAt(m, i), m.frames[i], w, h, { T: t, bt: m.bt });
      return { i, g };
    }
    if (st.k === 'title') drawTitle(ctx, m, Math.min(1, lt / st.d), w, h); else drawCredits(ctx, m, Math.min(1, lt / st.d), w, h);
    return { i: -1, g: -1 };
  }

  /* ---------- share links: packed movie -> (deflate) -> base64url, with a version letter in front ---------- */
  // 'z' = deflate-raw compressed JSON, 'j' = plain JSON (browsers without CompressionStream).
  function b64u(bytes) { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function unb64u(s) {
    if (!/^[A-Za-z0-9_-]+$/.test(s)) throw new Error('bad chars');
    s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '=';
    const bin = atob(s), out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out;
  }
  async function pipeBytes(bytes, T, limit) {
    const r = new Blob([bytes]).stream().pipeThrough(T).getReader(), parts = []; let n = 0;
    for (;;) { const { done, value } = await r.read(); if (done) break; n += value.length; if (n > limit) { r.cancel().catch(() => {}); throw new Error('too big'); } parts.push(value); }
    const out = new Uint8Array(n); let o = 0; parts.forEach(p => { out.set(p, o); o += p.length; }); return out;
  }
  async function encodeMovie(m) {
    const json = new TextEncoder().encode(JSON.stringify(pack(m)));
    if (window.CompressionStream) { try { return 'z' + b64u(await pipeBytes(json, new CompressionStream('deflate-raw'), 4e6)); } catch (e) { /* fall back to plain */ } }
    return 'j' + b64u(json);
  }
  // Data only: the link is parsed as JSON and every field goes through unpack(); nothing in it is ever run.
  async function decodeMovie(s) {
    if (typeof s !== 'string' || s.length < 8 || s.length > 400000) throw new Error('bad length');
    const v = s[0], bytes = unb64u(s.slice(1));
    let raw;
    if (v === 'z') { if (!window.DecompressionStream) throw new Error('old browser'); raw = await pipeBytes(bytes, new DecompressionStream('deflate-raw'), 2e6); }
    else if (v === 'j') raw = bytes;
    else throw new Error('unknown version');
    const d = JSON.parse(new TextDecoder().decode(raw));
    if (!d || typeof d !== 'object' || !arrOf(d.f).some(Array.isArray)) throw new Error('no frames');
    return unpack(d);
  }
  // Kid safety for movies from other people: run their words through the chat filter before showing them.
  function safeText(s) {
    const BB = window.BuddyBrain;
    if (!s || !BB || typeof BB.filter !== 'function') return s;
    try { const f = BB.filter(s); return (f.flagged || f.pii) ? String(f.clean || '').slice(0, s.length + 8) : s; } catch (e) { return s; }
  }
  function cleanMovie(m) {
    m.title.text = safeText(m.title.text); m.title.sub = safeText(m.title.sub); if (m.bt) m.bt = safeText(m.bt);
    m.credits.text = m.credits.text.split('\n').map(safeText).join('\n');
    m.frames.forEach(fr => fr.props.forEach(p => { if (p.t) p.t = safeText(p.t); }));
    return m;
  }
  const fileName = s => (String(s || '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'My-Movie');

  /* ---------- example movies (built from key poses + tweens) ---------- */
  function build(opts, keys) {
    const m = newMovie('you');
    Object.assign(m, { bg: opts.bg, fps: opts.fps, loop: false, nid: opts.nid || 20, bt: opts.bt || BT0 });
    m.title = { on: true, text: opts.title, sub: opts.sub, font: opts.font, look: opts.look };
    m.credits = { on: true, text: opts.credits, font: opts.font };
    m.frames = [];
    keys.forEach(([fr, n], i) => { m.frames.push(fr); const nx = keys[i + 1]; if (nx && n) m.frames.push(...tween(fr, nx[0], n)); });
    setBgs(m, bgList(m));
    return m;
  }
  // A key frame; `bg` switches the scenery from this frame on.
  const K = (snd, figs, props = [], bg) => ({ snd, figs, props, ...(bg ? { bg } : {}) });
  // A hat-like prop placed on a figure's head, tilted with the head. d = distance from the head's center to the prop's center.
  function onHead(g, k, id, o = {}) {
    const P = joints(g), u = g.a[1] * RAD, d = PR[k].hat * (o.s || 1);
    return mkProp(id, k, P[2][0] + Math.cos(u) * d, P[2][1] + Math.sin(u) * d, Object.assign({}, o, { a: norm(g.a[1] + 90) }));
  }
  function birthdayMovie() {
    const F = (id, c, x, pose, y = 161) => mkFig(id, c, x, y, pose);
    const kid = (x, pose, y) => F(1, 2, x, pose, y), red = (x, pose, y) => F(2, 1, x, pose, y), grn = (x, pose, y) => F(3, 3, x, pose, y);
    // Every key frame: the birthday kid wears a crown, the friends wear party hats.
    const KH = (snd, figs, props, bg) => K(snd, figs, [...figs.map(g => g.id === 1 ? onHead(g, 18, 11) : onHead(g, 9, 10 + g.id, { c: g.id === 2 ? 4 : 0 })), ...props], bg);
    const gift = mkProp(20, 8, 246, 196, { c: 1, s: 0.9 });
    const table = () => [mkProp(23, 6, 160, 148, { s: 1.25, n: 7 }), mkProp(24, 8, 26, 198, { c: 4, s: 0.9 }), mkProp(25, 8, 206, 158, { c: 2, s: 0.85 })];
    const wish = () => mkProp(26, 5, 236, 66, { t: 'Make a wish!' });
    return build({ bg: 'party', fps: 5, nid: 40, title: 'Happy Birthday!', sub: 'A party in Stick Town', font: 0, look: 1, credits: 'Happy Birthday!\n\nBirthday Star ..... Sam\nParty Pals ..... Rosa and Gus\nCake ..... Delicious\n\nMake a wish!\n\nThe End' }, [
      [KH('horn', [kid(30, 'walk1'), red(214, 'stand'), grn(272, 'stand')], [gift]), 1],
      [KH('', [kid(96, 'walk2'), red(214, 'stand'), grn(272, 'stand')], [gift]), 1],
      [KH('cheer', [kid(138, 'stand'), red(214, 'cheer'), grn(272, 'cheer', 152)], [gift, mkProp(21, 11, 176, 70), mkProp(22, 5, 246, 60, { t: 'Surprise!' })]), 0],
      [KH('clap', [kid(138, 'cheer', 152), red(214, 'cheer', 152), grn(272, 'cheer')], [gift, mkProp(21, 11, 176, 92, { s: 1.4 }), mkProp(22, 5, 246, 60, { t: 'Surprise!' })]), 0],
      [KH('bday', [kid(66, 'stand'), red(250, 'stand'), grn(294, 'stand')], table(), 'banner'), 2],
      [KH('', [kid(66, 'dance1'), red(250, 'dance2'), grn(294, 'dance1')], table()), 2],
      [KH('', [kid(66, 'dance2'), red(250, 'dance1'), grn(294, 'dance2')], table()), 2],
      [KH('', [kid(66, 'dance1'), red(250, 'dance2'), grn(294, 'dance1')], table()), 2],
      [KH('', [kid(66, 'dance2'), red(250, 'dance1'), grn(294, 'dance2')], table()), 2],
      [KH('', [kid(70, 'cheer'), red(250, 'stand'), grn(294, 'cheer')], table()), 0],
      [KH('ding', [kid(76, 'stand'), red(250, 'wave'), grn(294, 'stand')], [...table(), wish()]), 1],
      [KH('cheer', [kid(84, 'bow'), red(250, 'cheer'), grn(294, 'cheer')], [...table(), wish()]), 0],
      [KH('', [kid(84, 'bow'), red(250, 'cheer', 152), grn(294, 'cheer', 152)], [...table(), wish()]), 0]
    ]);
  }
  const EXAMPLES = [
    ['Happy Birthday!', birthdayMovie],
    ['Kick Off!', () => build({ bg: 'park', fps: 8, title: 'Kick Off!', sub: 'A short film about a big kick', font: 0, look: 1, credits: 'Kick Off!\n\nKicker ..... Stick Sam\nBall ..... Itself\n\nFilmed in the Park\nand in Outer Space\n\nThe End' }, [
      [K('', [mkFig(1, 2, 60, 161, 'stand')], [mkProp(2, 0, 150, 196)]), 3],
      [K('', [mkFig(1, 2, 100, 161, 'walk1')], [mkProp(2, 0, 150, 196)]), 2],
      [K('', [mkFig(1, 2, 118, 158, 'windup')], [mkProp(2, 0, 150, 196)]), 1],
      [K('boing', [mkFig(1, 2, 124, 163, 'kick')], [mkProp(2, 0, 152, 194)]), 0],
      [K('whoosh', [mkFig(1, 2, 124, 163, 'kick')], [mkProp(2, 0, 190, 140)]), 1],
      [K('', [mkFig(1, 2, 126, 161, 'stand')], [mkProp(2, 0, 250, 70)]), 1],
      [K('', [mkFig(1, 2, 126, 161, 'wave')], [mkProp(2, 0, 300, 20)]), 0],
      [K('whoosh', [], [mkProp(2, 0, 20, 225, { s: 0.8 })], 'space'), 2],
      [K('', [], [mkProp(2, 0, 150, 130, { s: 0.8 })]), 2],
      [K('zap', [], [mkProp(2, 0, 250, 20, { s: 0.7 }), mkProp(4, 4, 262, 28, { s: 0.7 })]), 0],
      [K('', [mkFig(1, 2, 126, 161, 'wave')], [mkProp(3, 5, 190, 80, { t: 'Where did it go?' })], 'park'), 0],
      [K('', [mkFig(1, 2, 126, 161, 'wave')], [mkProp(3, 5, 190, 80, { t: 'Where did it go?' })]), 0],
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
    share: svg(16, '<rect x="1" y="4" width="9" height="8" fill="#fff" stroke="#000"/><rect x="2" y="5" width="7" height="3" fill="#8fd0ff"/><rect x="2" y="8" width="7" height="3" fill="#4a4"/><path d="M11 5h2V3l3 3-3 3V7h-2z" fill="#06c"/>'),
    titles: svg(16, '<rect x="1" y="2" width="14" height="12" fill="#000"/><rect x="3" y="5" width="10" height="2" fill="#fc0"/><rect x="5" y="9" width="6" height="1" fill="#fff"/>'),
    extras: svg(16, '<rect x="2" y="7" width="12" height="8" fill="#c00" stroke="#000"/><rect x="1" y="5" width="14" height="3" fill="#e33" stroke="#000"/><rect x="7" y="5" width="2" height="10" fill="#fc0"/><path d="M8 5L5 2H4v2l3 1M8 5l3-3h1v2l-3 1" fill="#fc0" stroke="#000" stroke-width=".6"/>'),
    lock: svg(12, '<rect x="3" y="7" width="10" height="8" fill="#fc0" stroke="#000"/><path d="M5 7V4.5a3 3 0 0 1 6 0V7" fill="none" stroke="#000" stroke-width="1.6"/><rect x="7" y="9" width="2" height="3" fill="#000"/>')
  };

  const APP_ICON = '<svg viewBox="0 0 32 32" shape-rendering="crispEdges" aria-hidden="true"><rect x="2" y="7" width="28" height="20" fill="#222" stroke="#000"/><g fill="#eee"><rect x="3" y="8" width="2" height="2"/><rect x="3" y="24" width="2" height="2"/><rect x="27" y="8" width="2" height="2"/><rect x="27" y="24" width="2" height="2"/><rect x="3" y="12" width="2" height="2"/><rect x="3" y="20" width="2" height="2"/><rect x="27" y="12" width="2" height="2"/><rect x="27" y="20" width="2" height="2"/></g><rect x="7" y="9" width="18" height="16" fill="#8fd0ff"/><rect x="7" y="21" width="18" height="4" fill="#4a4"/><rect x="15" y="10" width="3" height="3" fill="#000"/><rect x="16" y="13" width="1" height="5" fill="#000"/><rect x="13" y="14" width="2" height="1" fill="#000"/><rect x="18" y="14" width="2" height="1" fill="#000"/><rect x="12" y="15" width="1" height="1" fill="#000"/><rect x="20" y="13" width="1" height="1" fill="#000"/><rect x="15" y="18" width="1" height="3" fill="#000"/><rect x="17" y="18" width="1" height="3" fill="#000"/><rect x="21" y="18" width="3" height="3" fill="#e00"/><rect x="0" y="2" width="12" height="4" fill="#fc0" stroke="#000"/><rect x="2" y="3" width="2" height="2" fill="#000"/><rect x="6" y="3" width="2" height="2" fill="#000"/></svg>';

  (window.RETRO_APPS = window.RETRO_APPS || []).push({
    id: 'moviemaker',
    label: 'Movie Maker',
    help: 'Make stick-figure cartoons frame by frame (like a Happy Birthday movie) with dozens of backgrounds, props and sounds, titles and credits, share them as a video or a link, and buy Extras packs with play money.',
    kind: 'builtin',
    eras: ['2000'],
    cat: 'acc',
    icon: APP_ICON,
    window: { w: 780, h: 580 },
    css: `
      .mvm{display:flex;flex-direction:column;height:100%;min-height:340px;gap:3px;padding:2px;box-sizing:border-box;user-select:none;-webkit-user-select:none;position:relative}
      .mvm button{font:inherit}
      .mvm [hidden]{display:none!important}
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
      .mvm-side{flex:none;width:132px;display:flex;flex-direction:column;gap:3px;min-height:0}
      .mvm-side>.mvm-fig{justify-content:center;height:30px;flex:none}
      .mvm-side>select{flex:none;height:24px}
      .mvm-props{flex:1;min-height:84px;overflow-y:auto;overflow-x:hidden;display:grid;grid-template-columns:repeat(3,1fr);grid-auto-rows:40px;gap:2px;padding:2px;background:#fff;align-content:start}
      .mvm-pt{position:relative;padding:0;min-width:0;display:flex;align-items:center;justify-content:center}
      .mvm-pt canvas{width:34px;height:34px;display:block;pointer-events:none}
      .mvm-pt.lock canvas{opacity:.4;filter:grayscale(.8)}
      .mvm-pt .mvm-lk{position:absolute;right:1px;bottom:1px;line-height:0;pointer-events:none}
      .mvm-pt.more{grid-column:1/-1;font-size:11px;font-weight:700;gap:4px}
      .mvm-scn{gap:5px!important;padding:3px!important;flex:none;justify-content:flex-start!important;text-align:left}
      .mvm-scn canvas{width:48px;height:36px;flex:none;display:block;box-shadow:0 0 0 1px #000;pointer-events:none}
      .mvm-scn span{white-space:normal;font-size:11px;line-height:1.15;min-width:0}
      .mvm-side>.mvm-b{flex:none}
      .mvm-tabs{display:flex;flex-wrap:wrap;gap:3px}
      .mvm-tabs .btn{padding:3px 7px;min-height:28px;display:inline-flex;align-items:center;gap:3px}
      .mvm-tabs .btn.down{font-weight:700}
      .mvm-scg{display:grid;grid-template-columns:repeat(auto-fill,minmax(112px,1fr));gap:6px;padding:6px;background:#fff;max-height:300px;overflow:auto}
      .mvm-sct{position:relative;padding:3px;display:flex;flex-direction:column;align-items:center;gap:3px;font-size:11px;min-width:0}
      .mvm-sct canvas{width:100%;max-width:128px;aspect-ratio:4/3;height:auto;display:block;box-shadow:0 0 0 1px #000;pointer-events:none}
      .mvm-sct span{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .mvm-sct.cur{outline:2px solid #0a246a;outline-offset:-1px;font-weight:700}
      .mvm-sct.lock canvas{opacity:.45;filter:grayscale(.8)}
      .mvm-sct .mvm-lk{position:absolute;right:4px;top:4px;line-height:0}
      .mvm-tip{margin:0;background:#ffffe1;border:1px solid #000;padding:3px 6px;display:flex;align-items:center;gap:6px;flex-wrap:wrap}
      .mvm-dlg.wide{max-width:640px}
      .mvm-shop{display:flex;gap:8px;min-height:0}
      .mvm-shl{flex:none;width:188px;background:#fff;display:flex;flex-direction:column;overflow:auto;max-height:360px}
      .mvm-shi{display:flex;flex-direction:column;align-items:flex-start;text-align:left;padding:4px 6px;border:0;border-bottom:1px solid #ddd;background:#fff;cursor:pointer;font:inherit;color:#000}
      .mvm-shi small{color:#555}
      .mvm-shi small.own{color:#1e7a2e;font-weight:700}
      .mvm-shi.on{background:#0a246a;color:#fff}
      .mvm-shi.on small{color:#dde}
      .mvm-shi.bun{background:#fff6c8}
      .mvm-shi.bun.on{background:#0a246a}
      .mvm-shd{flex:1;min-width:0;display:flex;flex-direction:column;gap:5px}
      .mvm-shd canvas{width:100%;max-width:256px;aspect-ratio:4/3;height:auto;display:block;box-shadow:0 0 0 1px #000;background:#000}
      .mvm-shd p{margin:0}
      .mvm-shn{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;font-size:14px}
      .mvm-shn .mvm-pr{color:#a00;font-weight:700}
      .mvm-shc{font-size:11px;line-height:1.4;color:#222}
      .mvm-shb{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
      .mvm-shb .btn{min-height:32px;padding:4px 12px}
      .mvm-inst{color:#1e7a2e;font-weight:700}
      .mvm-wal{font-size:11px;color:#333}
      .mvm-cnd{display:grid;grid-template-columns:repeat(5,1fr);gap:4px}
      .mvm-cnd .btn{min-height:36px}
      .mvm-cap{background:linear-gradient(90deg,#0a246a,#a6caf0);color:#fff;font-weight:700;padding:2px 5px;font-size:11px}
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
      .mvm-th em{position:absolute;right:0;top:0;background:#1e8c2a;color:#fff;font:bold 8px/1 var(--ui);padding:1px 2px;font-style:normal;border-left:1px solid #000;border-bottom:1px solid #000}
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
      .mvm-shr{display:flex;gap:6px}
      .mvm-shr .btn{flex:1;min-height:34px;padding:4px 6px;display:flex;align-items:center;justify-content:center;gap:5px}
      .mvm-shr .btn.down{font-weight:700}
      .mvm-pane{display:flex;flex-direction:column;gap:6px;min-height:90px}
      .mvm-pane p{margin:0}
      .mvm-pane .mvm-acts{display:flex;flex-wrap:wrap;gap:6px}
      .mvm-pane .mvm-acts .btn{min-height:28px;padding:3px 10px;display:inline-flex;align-items:center;text-decoration:none;color:#000}
      .mvm-pv{display:block;width:192px;height:144px;margin:0 auto;background:#000;box-shadow:0 0 0 1px #000}
      .mvm-pb{height:18px;background:#fff;padding:2px;box-sizing:border-box}
      .mvm-pb i{display:block;height:100%;width:0;background:repeating-linear-gradient(90deg,#0a246a 0 8px,transparent 8px 10px)}
      .mvm-link{font:11px/1.3 "Courier New",monospace;width:100%;height:58px;resize:none;box-sizing:border-box;word-break:break-all}
      .mvm-warn{background:#ffffe1;border:1px solid #000;padding:3px 5px}
      .mvm-sp{position:absolute;inset:0;z-index:4;background:#d4d0c8;display:flex;flex-direction:column;gap:4px;padding:4px;box-sizing:border-box}
      .mvm-sp[hidden]{display:none}
      .mvm-spt{font-weight:700;font-size:15px;padding:2px 4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .mvm-sps{flex:1;min-height:0;display:flex;align-items:center;justify-content:center;background:#000;overflow:hidden}
      .mvm-sps canvas{display:block}
      .mvm-spm{min-height:16px;padding:0 4px;color:#222}
      .mvm-spb{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;padding:2px}
      .mvm-spb .btn{min-height:34px;padding:4px 12px;display:inline-flex;align-items:center;gap:5px}
      .mvm-spe{margin:auto;max-width:320px;padding:12px;background:#fff;text-align:center;line-height:1.4}
      .mvm.narrow .mvm-main{flex-direction:column}
      .mvm.narrow .mvm-side{width:auto;flex-direction:row;flex-wrap:wrap;overflow:visible;align-items:stretch;order:2}
      .mvm.narrow .mvm-cap{display:none}
      .mvm.narrow .mvm-side>.mvm-fig{height:40px;width:44px;padding:2px}
      .mvm.narrow .mvm-side>.mvm-fig span{display:none}
      .mvm.narrow .mvm-side select{width:auto;flex:1;min-width:0;height:40px}
      .mvm.narrow .mvm-side>.mvm-b{height:40px}
      .mvm.narrow .mvm-props{order:5;flex:1 1 100%;display:flex;overflow-x:auto;overflow-y:hidden;min-height:0;height:50px;padding:2px}
      .mvm.narrow .mvm-pt{flex:none;width:46px;height:44px}
      .mvm.narrow .mvm-pt.more{width:auto;padding:0 8px}
      .mvm.narrow .mvm-scn{flex-direction:row}
      .mvm.narrow .mvm-scn canvas{width:44px;height:33px}
      .mvm.narrow .mvm-scn span{display:none}
      .mvm.narrow .mvm-side .mvm-b span.mvm-lbl{display:none}
      .mvm.narrow .mvm-shop{flex-direction:column}
      .mvm.narrow .mvm-shl{width:auto;max-height:150px}
      .mvm.narrow .mvm-shd canvas{max-width:240px}
      .mvm.narrow .mvm-scg{grid-template-columns:repeat(auto-fill,minmax(96px,1fr));max-height:none}
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
      // Extras packs this player bought (ids). Only adding new things from the Cast or Scene lists needs them; movies always play.
      const owned = new Set(arrOf(api.load('packs', [])).filter(id => packOf(id)));
      const has = pk => !pk || owned.has(pk);
      let pcat = api.load('pcat', 'party');
      if (!PCATS.some(c => c[0] === pcat) && !packOf(pcat)) pcat = 'party';

      W.body.innerHTML = `<div class="mvm">
        <div class="mvm-tb">
          <button class="btn mvm-b" data-a="add" title="Add the next frame (a copy of this one)">${IC.add}<span>Add frame</span></button>
          <button class="btn mvm-b" data-a="tween" title="Make in-between frames up to the next frame">${IC.tween}<span>Tween</span></button>
          <button class="btn mvm-b mvm-play" data-a="play">${IC.play}<span>Play</span></button>
          <button class="btn mvm-b" data-a="share" title="Share your movie with friends">${IC.share}<span>Share</span></button>
          <button class="btn mvm-b" data-a="extras" title="Get more scenes, props and sounds with play money">${IC.extras}<span>Extras</span></button>
          <span class="mvm-sep"></span>
          <label class="mvm-spd"><span class="mvm-lbl">Speed</span><input type="range" min="4" max="12" step="1" class="mvm-fpsr" aria-label="Frames per second"><b class="mvm-fps">8 fps</b></label>
          <label class="mvm-ck"><input type="checkbox" class="mvm-onion">Onion</label>
          <label class="mvm-ck"><input type="checkbox" class="mvm-loop">Loop</label>
        </div>
        <div class="mvm-main">
          <div class="mvm-side">
            <div class="mvm-cap">Cast</div>
            <button class="btn mvm-b mvm-fig" data-add="fig" title="Add a stick figure">${IC.fig}<span>Stick figure</span></button>
            <select class="mvm-pcat" aria-label="Which props to show" title="Which props to show"></select>
            <div class="mvm-props sunken" aria-label="Props: tap one to add it"></div>
            <div class="mvm-cap">Scene</div>
            <button class="btn mvm-b mvm-scn" data-a="scene" title="Pick the background for this frame and the frames after it"><canvas width="96" height="72"></canvas><span class="mvm-scnn"></span></button>
            <button class="btn mvm-b mvm-bnr" data-a="banner" title="Change the words on the birthday banner" hidden><span>Banner words<span class="mvm-lbl">...</span></span></button>
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
        <div class="mvm-sp" hidden></div>
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
        draw(); spLayout();
      }
      let animT = 0;
      function draw(noThumb) {
        if (playing) return;
        const fr = frame();
        drawFrame(ctx, bgAt(movie, cur), fr, cw, ch, { onion: onion && cur > 0 ? movie.frames[cur - 1] : null, T: animT, bt: movie.bt });
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
          if (p) { const b = propBox(p); ctx.setLineDash([3 / pxu, 2 / pxu]); ctx.strokeStyle = '#000'; ctx.lineWidth = 1 / pxu; ctx.strokeRect(b[0] - 2, b[1] - 2, b[2] - b[0] + 4, b[3] - b[1] + 4); ctx.strokeStyle = '#fff'; ctx.lineDashOffset = 2.5 / pxu; ctx.strokeRect(b[0] - 2, b[1] - 2, b[2] - b[0] + 4, b[3] - b[1] + 4); ctx.setLineDash([]); ctx.lineDashOffset = 0;
            const h = rotHandle(p), rr = (coarse ? 6.5 : 4.5) / Math.max(0.6, pxu / 2); ctx.strokeStyle = '#000'; ctx.lineWidth = 1 / pxu; ctx.beginPath(); ctx.moveTo(h[0], b[1] - 2); ctx.lineTo(h[0], h[1] + rr); ctx.stroke(); ctx.beginPath(); ctx.arc(h[0], h[1], rr, 0, Math.PI * 2); ctx.fillStyle = '#ffd400'; ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.arc(h[0], h[1], rr * 0.5, -2.2, 1.3); ctx.stroke(); }
        }
        badge.textContent = `Frame ${cur + 1}/${movie.frames.length}`;
        if (!noThumb) queueThumb();
      }

      /* ----- timeline ----- */
      function thumbDraw(c, i) {
        const x = c.getContext('2d');
        drawFrame(x, bgAt(movie, i), movie.frames[i], c.width, c.height, { bt: movie.bt });
      }
      function renderStrip() {
        strip.innerHTML = '';
        const bgs = bgList(movie);
        movie.frames.forEach((fr, i) => {
          const b = document.createElement('button'); b.className = 'mvm-th' + (i === cur ? ' cur' : ''); b.dataset.i = i;
          const chg = i > 0 && bgs[i] !== bgs[i - 1], bn = bgName(bgs[i]);
          b.setAttribute('aria-label', 'Frame ' + (i + 1) + (chg ? ', new scene: ' + bn : ''));
          if (chg) b.title = 'New scene: ' + bn;
          const c = document.createElement('canvas'); c.width = 96; c.height = 72; b.appendChild(c);
          b.insertAdjacentHTML('beforeend', `<i>${i + 1}</i>${chg ? '<em>BG</em>' : ''}${fr.snd ? '<u>SND</u>' : ''}`);
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
        syncSounds(); updateScene();
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
        updateScene();
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
        // The next frame takes over a scene change made on the deleted frame, so later scenery stays put.
        pushUndo(); const bgs = bgList(movie); bgs.splice(cur, 1); movie.frames.splice(cur, 1); setBgs(movie, bgs); cur = Math.min(cur, movie.frames.length - 1);
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

      // Picking a background on frame `cur` changes it from here up to (not including) the next frame where the scene already changes.
      function setBg(v) {
        if (!isBg(v) || v === bgAt(movie, cur)) return;
        pushUndo();
        const old = bgList(movie), arr = old.slice();
        let k = cur;
        for (; k < arr.length; k++) { if (k > cur && old[k] !== old[k - 1]) break; arr[k] = v; }
        setBgs(movie, arr);
        renderStrip(); draw(); touch(); api.sfx.click();
        const bn = bgName(v);
        status(movie.frames.length < 2 ? `Background: ${bn}.` : k - 1 === cur ? `${bn} on frame ${cur + 1} only (the next frame has its own scene).` : k >= arr.length ? `${bn} from frame ${cur + 1} to the end.` : `${bn} for frames ${cur + 1} to ${k}. Frame ${k + 1} keeps its own scene.`);
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
        const id = movie.nid++, n = fr.props.length, D = PR[k], pos = D.pos;
        let p = mkProp(id, k, clamp(pos[0] + (n % 3) * 14 - 14, 20, 300), pos[1], { t: text });
        // Hats and crowns go straight onto a head: the picked figure's, or the first one's.
        const g = D.hat != null && ((sel && sel.t === 'fig' && fr.figs.find(q => q.id === sel.id)) || fr.figs[0]);
        if (g) p = onHead(g, k, id);
        for (let i = cur; i < movie.frames.length; i++) if (movie.frames[i].props.length < MAXPROP) movie.frames[i].props.push({ ...p });
        sel = { t: 'prop', id }; draw(); renderSel(); touch(); api.sfx.blip(760);
        if (g) status(`${D.n} on the ${FIGN[g.c].toLowerCase()} figure's head. Drag it to move it.`);
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
          const D = PR[it.k];
          selBar.innerHTML = `<b>${D.nc ? '' : `<span class="mvm-sw2" style="background:${propCol(it)}"></span>`}${api.esc(D.n)}</b>
            ${D.nc ? '' : '<button class="btn mvm-b" data-s="color">Color</button>'}${D.n0 ? `<button class="btn mvm-b" data-s="count">Candles: ${it.n}</button>` : ''}${D.tb ? '<button class="btn mvm-b" data-s="text">Text...</button>' : ''}<button class="btn mvm-b" data-s="small" aria-label="Smaller">Smaller</button><button class="btn mvm-b" data-s="big" aria-label="Bigger">Bigger</button><button class="btn mvm-b" data-s="rotl" aria-label="Tilt left">&#10226; Tilt</button><button class="btn mvm-b" data-s="rotr" aria-label="Tilt right">Tilt &#10227;</button>${it.a ? '<button class="btn mvm-b" data-s="rot0">Straighten</button>' : ''}<button class="btn mvm-b" data-s="rm">Remove</button>
            <span class="mvm-hint">${api.esc(statusMsg)}</span>`;
        }
      }
      selBar.addEventListener('click', e => {
        const b = e.target.closest('[data-s]'); if (!b) return;
        const s = b.dataset.s; api.sfx.click();
        if (s === 'rm') removeSel();
        else if (s === 'color') editSel(x => { x.c = (x.c + 1) % (sel.t === 'fig' ? FIGC.length : propPal(x.k).length); }, true);
        else if (s === 'flip') editSel(g => { g.a = g.a.map(a => norm(180 - a)); });
        else if (s === 'pose') editSel(g => { g.a = POSE.stand.slice(); });
        else if (s === 'small') editSel(p => { p.s = Math.max(0.5, +(p.s - 0.25).toFixed(2)); });
        else if (s === 'big') editSel(p => { p.s = Math.min(2.5, +(p.s + 0.25).toFixed(2)); });
        else if (s === 'rotl') editSel(p => { p.a = norm((p.a || 0) - 15); });
        else if (s === 'rotr') editSel(p => { p.a = norm((p.a || 0) + 15); });
        else if (s === 'rot0') editSel(p => { p.a = 0; });
        else if (s === 'text') { const it = findSel(); askText(it.k === 5 ? 'Speech bubble' : 'Sign', it.k === 5 ? 'What does it say?' : 'What does the sign say?', it.t, 40, t => { if (t) editSel(p => { p.t = t; }, true); }); }
        else if (s === 'count') candlesDlg();
      });


      /* ----- cast and scene pickers, Extras shop ----- */
      const pcatSel = $('.mvm-pcat'), propsEl = $('.mvm-props'), scnBtn = $('.mvm-scn');
      function renderCats() {
        const mine = PACKS.filter(p => owned.has(p.id)), more = PACKS.filter(p => !owned.has(p.id));
        pcatSel.innerHTML = PCATS.map(c => `<option value="${c[0]}">${c[1]}</option>`).join('')
          + (mine.length ? `<optgroup label="My Extras">${mine.map(p => `<option value="${p.id}">${api.esc(p.n)}</option>`).join('')}</optgroup>` : '')
          + (more.length ? `<optgroup label="In the Extras Shop">${more.map(p => `<option value="${p.id}">${api.esc(p.n)} (${money(p.price)})</option>`).join('')}</optgroup>` : '');
        pcatSel.value = pcat;
      }
      // Draws a prop, centered and scaled to fit, into a small canvas (the Cast buttons).
      function propIcon(c, k) {
        const D = PR[k], x = c.getContext('2d'), p = { k, x: 0, y: 0, s: 1, c: D.c0, t: k === 5 ? 'Hi!' : 'Yay!', a: 0, n: D.n0 };
        const b = D.tb ? D.tb(p) : D.box, sc = Math.min((c.width - 6) / (b[2] - b[0]), (c.height - 6) / (b[3] - b[1]));
        x.setTransform(sc, 0, 0, sc, c.width / 2 - (b[0] + b[2]) / 2 * sc, c.height / 2 - (b[1] + b[3]) / 2 * sc);
        drawProp(x, p, 0.3);
      }
      function renderProps() {
        const pk = packOf(pcat), lock = pk && !owned.has(pk.id);
        const ks = Object.keys(PR).map(Number).filter(k => pk ? PR[k].pack === pk.id : (!PR[k].pack && PR[k].cat === pcat));
        propsEl.innerHTML = ks.map(k => `<button class="btn mvm-pt${lock ? ' lock' : ''}" data-k="${k}" title="${api.esc(PR[k].n)}${lock ? ' (in the ' + api.esc(pk.n) + ' pack)' : ''}" aria-label="${lock ? 'Locked: ' : 'Add '}${api.esc(PR[k].n)}"><canvas width="68" height="68"></canvas>${lock ? `<span class="mvm-lk">${IC.lock}</span>` : ''}</button>`).join('')
          + (owned.size < PACKS.length ? `<button class="btn mvm-pt more" data-more="1" title="Get more props, scenes and sounds">${IC.extras}${lock ? 'Get this pack...' : 'Get more...'}</button>` : '');
        propsEl.querySelectorAll('[data-k]').forEach(b => propIcon(b.querySelector('canvas'), +b.dataset.k));
        propsEl.scrollTop = 0; propsEl.scrollLeft = 0;
      }
      propsEl.addEventListener('click', e => {
        const b = e.target.closest('.mvm-pt'); if (!b || playing) return;
        if (b.dataset.more) { api.sfx.click(); shopDlg(packOf(pcat) && !owned.has(pcat) ? pcat : null); return; }
        const k = +b.dataset.k, D = PR[k];
        if (!has(D.pack)) { api.sfx.click(); shopDlg(D.pack); return; }
        if (k === 5) askText('Speech bubble', 'What does it say?', 'Hello!', 40, t => { if (t) addProp(5, t); });
        else if (D.tb) askText('Sign', 'What does the sign say?', 'Happy Birthday!', 40, t => { if (t) addProp(k, t); });
        else addProp(k);
      });
      pcatSel.addEventListener('change', () => { pcat = pcatSel.value; api.save('pcat', pcat); renderProps(); api.sfx.click(); });
      function updateScene() {
        const bg = bgAt(movie, cur), c = scnBtn.querySelector('canvas'), x = c.getContext('2d');
        x.setTransform(1, 0, 0, 1, 0, 0); drawFrame(x, bg, { figs: [], props: [] }, c.width, c.height, { bt: movie.bt });
        $('.mvm-scnn').textContent = bgName(bg); scnBtn.setAttribute('aria-label', 'Scene: ' + bgName(bg) + '. Pick a different background');
        $('.mvm-bnr').hidden = !(BG[bg] && BG[bg].txt);
      }
      function syncSounds() {
        const sel = $('.mvm-snd'), v = frame().snd || '';
        const list = SOUNDS.filter(x => !x[2] || owned.has(x[2]) || x[0] === v);
        const key = list.map(x => x[0]).join();
        if (sel.dataset.k !== key) {
          sel.dataset.k = key;
          const free = list.filter(x => !x[2]), ext = list.filter(x => x[2]);
          sel.innerHTML = free.map(x => `<option value="${x[0]}">${x[1]}</option>`).join('') + (ext.length ? `<optgroup label="Extras">${ext.map(x => `<option value="${x[0]}">${x[1]}</option>`).join('')}</optgroup>` : '');
        }
        sel.value = v;
      }
      function sceneDlg(tab) {
        if (playing) stop();
        const bg0 = bgAt(movie, cur);
        let tabNow = tab || (BG[bg0] ? BG[bg0].cat : 'party');
        const tabs = [...BCATS, ...PACKS.map(p => [p.id, p.n])];
        dialog('Pick a Scene', `<div class="mvm-tabs" role="tablist">${tabs.map(([id, n]) => `<button class="btn" role="tab" data-tab="${id}">${packOf(id) && !owned.has(id) ? IC.lock : ''}${api.esc(n)}</button>`).join('')}</div>
          <div class="mvm-tipw"></div><div class="mvm-scg sunken"></div>
          <p style="margin:0;color:#444">The scene you pick shows from frame ${cur + 1} on, up to the next scene change.</p>`, ['Extras Shop...', 'Close'], d => {
          const grid = d.querySelector('.mvm-scg'), tip = d.querySelector('.mvm-tipw');
          const show = t => {
            tabNow = t;
            d.querySelectorAll('[data-tab]').forEach(b => { b.classList.toggle('down', b.dataset.tab === t); b.setAttribute('aria-selected', b.dataset.tab === t); });
            const pk = packOf(t), lock = pk && !owned.has(pk.id);
            tip.innerHTML = lock ? `<p class="mvm-tip">${IC.lock}<span>These scenes come with the <b>${api.esc(pk.n)}</b> pack (${money(pk.price)}).</span><button class="btn" data-see="${pk.id}">See it in the shop</button></p>` : '';
            const ids = BGS.filter(b => BG[b].cat === t);
            grid.innerHTML = ids.map(b => `<button class="btn mvm-sct${b === bg0 ? ' cur' : ''}${lock ? ' lock' : ''}" data-bg="${b}" aria-label="${lock ? 'Locked: ' : ''}${api.esc(BG[b].n)}"><canvas width="128" height="96"></canvas><span>${api.esc(BG[b].n)}</span>${lock ? `<span class="mvm-lk">${IC.lock}</span>` : ''}</button>`).join('');
            grid.querySelectorAll('[data-bg]').forEach(b => { const c = b.querySelector('canvas'); drawFrame(c.getContext('2d'), b.dataset.bg, { figs: [], props: [] }, c.width, c.height, { bt: movie.bt }); });
            const see = tip.querySelector('[data-see]'); if (see) see.onclick = () => { api.sfx.click(); shopDlg(see.dataset.see); };
          };
          d.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { api.sfx.click(); show(b.dataset.tab); });
          grid.addEventListener('click', e => {
            const b = e.target.closest('[data-bg]'); if (!b) return;
            const id = b.dataset.bg;
            if (!has(BG[id].pack)) { api.sfx.click(); shopDlg(BG[id].pack); return; }
            closeDlg(); setBg(id); if (id === bg0) api.sfx.click();
            if (BG[id].txt) setTimeout(() => status('Tip: press Banner words to change what the banner says.'), 60);
          });
          show(tabNow);
        }, b => { if (b === 'Extras Shop...') { shopDlg(packOf(tabNow) && !owned.has(tabNow) ? tabNow : null); return false; } }, 'wide');
      }
      function bannerDlg() {
        if (playing) stop();
        askText('Birthday Banner', 'What does the banner say?', movie.bt || BT0, 24, t => {
          if (t === null) return;
          pushUndo(); movie.bt = t || BT0; renderStrip(); draw(); touch(); status('Banner changed. It shows in every scene with the Birthday Banner.');
        });
      }
      function candlesDlg() {
        const it = findSel(); if (!it || !PR[it.k].n0) return;
        dialog('Candles', `<p style="margin:0">How many candles on the cake?</p><div class="mvm-cnd">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => `<button class="btn${n === it.n ? ' down' : ''}" data-n="${n}">${n}</button>`).join('')}</div>`, ['Cancel'], d => {
          d.querySelectorAll('[data-n]').forEach(b => b.onclick = () => { closeDlg(); api.sfx.blip(900); editSel(p => { p.n = +b.dataset.n; }, true); });
        });
      }
      const bundlePrice = () => { const left = PACKS.filter(p => !owned.has(p.id)).reduce((a, p) => a + p.price, 0); return Math.round(Math.min(BUNDLE.price, left) * 100) / 100; };
      function packPreview(c, pk) {
        const x = c.getContext('2d'), [bg, props] = pk.demo;
        drawFrame(x, bg, { figs: [], props: props.map(([k, X, Y, sz], i) => mkProp(i + 1, k, X, Y, { s: sz })) }, c.width, c.height, { T: 0.4 });
      }
      function shopDlg(focus) {
        if (playing) stop();
        let pick = focus === 'bundle' || packOf(focus) ? focus : ((PACKS.find(p => !owned.has(p.id)) || PACKS[0]).id);
        let busy = false;
        dialog('Movie Maker Extras', `<p style="margin:0">Add-on packs of scenes, props and sounds for your movies. Pay with play money; each pack is yours to keep. Friends can watch your movies without buying anything.</p>
          <div class="mvm-shop"><div class="mvm-shl sunken" role="listbox" aria-label="Packs"></div><div class="mvm-shd"></div></div>`, ['Close'], d => {
          const list = d.querySelector('.mvm-shl'), det = d.querySelector('.mvm-shd');
          const render = () => {
            const bp = bundlePrice(), save = Math.round((PACKS.reduce((a, p) => a + p.price, 0) - BUNDLE.price) * 100) / 100;
            list.innerHTML = `<button class="mvm-shi bun${pick === 'bundle' ? ' on' : ''}" data-pk="bundle" role="option"><b>${BUNDLE.n}</b><small${bp ? '' : ' class="own"'}>${bp ? `All ${PACKS.length} packs: ${money(bp)}` : 'Installed'}</small></button>`
              + PACKS.map(p => `<button class="mvm-shi${pick === p.id ? ' on' : ''}" data-pk="${p.id}" role="option" aria-selected="${pick === p.id}"><b>${api.esc(p.n)}</b><small${owned.has(p.id) ? ' class="own"' : ''}>${owned.has(p.id) ? 'Installed' : money(p.price)}</small></button>`).join('');
            const wal = `<p class="mvm-wal">Your play money: <b>${money(api.wallet ? api.wallet() : 0)}</b></p>`;
            if (pick === 'bundle') {
              const nB = PACKS.reduce((a, p) => a + packBgs(p.id).length, 0), nP = PACKS.reduce((a, p) => a + packProps(p.id).length, 0);
              det.innerHTML = `<canvas width="320" height="240"></canvas><div class="mvm-shn"><b>${BUNDLE.n}</b>${bp ? `<span class="mvm-pr">${money(bp)}</span>` : ''}</div>
                <p>Every pack at once: ${nB} scenes, ${nP} props and ${PACKS.length} sounds. ${bp === BUNDLE.price ? `You save ${money(save)}.` : bp ? `That's the price of the packs you don't have yet.` : ''}</p>
                <div class="mvm-shb">${bp ? `<button class="btn" data-buy="bundle"><b>Buy all for ${money(bp)}</b></button>` : '<span class="mvm-inst">Everything is installed. Enjoy!</span>'}</div>${wal}`;
              const c = det.querySelector('canvas'), x = c.getContext('2d'), tmp = document.createElement('canvas'); tmp.width = 80; tmp.height = 60;
              x.fillStyle = '#000'; x.fillRect(0, 0, 320, 240);
              PACKS.forEach((p, i) => { packPreview(tmp, p); x.drawImage(tmp, (i % 4) * 80, Math.floor(i / 4) * 60 + 60); });
              x.fillStyle = '#ffd23a'; x.font = 'bold 22px "Comic Sans MS","Chalkboard SE",cursive'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('EVERYTHING BUNDLE', 160, 30); x.fillStyle = '#fff'; x.font = 'bold 14px Arial,sans-serif'; x.fillText(`${PACKS.length} packs in one box!`, 160, 204);
            } else {
              const pk = packOf(pick), own = owned.has(pk.id), sn = packSnds(pk.id);
              det.innerHTML = `<canvas width="320" height="240"></canvas><div class="mvm-shn"><b>${api.esc(pk.n)}</b><span class="${own ? 'mvm-inst' : 'mvm-pr'}">${own ? 'Installed' : money(pk.price)}</span></div>
                <p>${api.esc(pk.blurb)}</p>
                <p class="mvm-shc"><b>Scenes:</b> ${packBgs(pk.id).map(b => api.esc(BG[b].n)).join(', ')}<br><b>Props (${packProps(pk.id).length}):</b> ${packProps(pk.id).map(k => api.esc(PR[k].n)).join(', ')}${sn.length ? `<br><b>Sound:</b> ${sn.map(x => api.esc(x[1])).join(', ')}` : ''}</p>
                <div class="mvm-shb">${own ? `<span class="mvm-inst">Installed</span><button class="btn" data-use="${pk.id}">Use it now</button>` : `<button class="btn" data-buy="${pk.id}"><b>Buy for ${money(pk.price)}</b></button><button class="btn" data-hear="${pk.id}">Hear the sound</button>`}</div>${wal}`;
              packPreview(det.querySelector('canvas'), pk);
            }
            const bb = det.querySelector('[data-buy]'); if (bb) bb.onclick = () => buy(bb.dataset.buy, render);
            const ub = det.querySelector('[data-use]'); if (ub) ub.onclick = () => { api.sfx.click(); pcat = ub.dataset.use; api.save('pcat', pcat); renderCats(); renderProps(); closeDlg(); status(`${packOf(pcat).n} props are in the Cast list. Press the Scene button for its backgrounds.`); };
            const hb = det.querySelector('[data-hear]'); if (hb) hb.onclick = () => { const x = packSnds(hb.dataset.hear)[0]; if (x) playSnd(api, x[0]); };
          };
          list.addEventListener('click', e => { const b = e.target.closest('[data-pk]'); if (!b || busy) return; api.sfx.click(); pick = b.dataset.pk; render(); });
          const buy = async (id, done) => {
            if (busy) return; busy = true;
            const pk = id === 'bundle' ? BUNDLE : packOf(id), price = id === 'bundle' ? bundlePrice() : pk.price;
            let ok = false;
            try { ok = await api.spend(price, id === 'bundle' ? 'the Movie Maker Everything Bundle' : `${pk.n} (Movie Maker Extras)`); } catch (e) { ok = false; }
            busy = false;
            if (ok) {
              (id === 'bundle' ? PACKS.map(p => p.id) : [id]).forEach(x => owned.add(x));
              api.save('packs', [...owned]);
              if (id !== 'bundle') pcat = id;
              renderCats(); renderProps(); syncSounds();
              status(id === 'bundle' ? 'All Extras packs installed! Look in the Cast list and the Scene picker.' : `${pk.n} installed! Its props are in the Cast list and its scenes are under Scene.`);
            }
            if (list.isConnected) done();
          };
          render();
        }, null, 'wide');
      }

      /* ----- pointer editing ----- */
      function toV(e) { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * VW, (e.clientY - r.top) / r.height * VH]; }
      function hitTest(pt) {
        const fr = frame(), pxu = cv.getBoundingClientRect().width / VW || 1, hr = (coarse ? 18 : 10) / pxu;
        const figs = fr.figs.slice().reverse().sort((a, b) => (sel && sel.id === b.id ? 1 : 0) - (sel && sel.id === a.id ? 1 : 0));
        if (sel && sel.t === 'prop') { const sp = fr.props.find(q => q.id === sel.id); if (sp) { const h = rotHandle(sp); if (Math.hypot(h[0] - pt[0], h[1] - pt[1]) < hr + 2) return { t: 'prop', id: sp.id, rot: true }; } }
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
        if (drag.hit.rot) {
          // Angle from the prop's center to the pointer; snaps to the nearest 15 degrees when close, for neat angles.
          let a = Math.atan2(pt[1] - it.y, pt[0] - it.x) / RAD + 90, snap = Math.round(a / 15) * 15;
          if (Math.abs(a - snap) < 4) a = snap; it.a = norm(Math.round(a));
        } else if (drag.hit.t === 'prop' || drag.hit.j === 0) {
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
        const wasRot = drag.hit.rot; drag = null; draw(); if (wasRot) renderSel();
      };
      cv.addEventListener('pointerup', endDrag);
      cv.addEventListener('pointercancel', endDrag);
      cv.addEventListener('lostpointercapture', endDrag);

      /* ----- playback ----- */
      let raf = 0;
      function play() {
        if (playing) { stop(); return; }
        if (sp) { spPlay(); return; }
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
            P.fi = fi; P.anim = frameAnim(bgAt(movie, i), movie.frames[i]);
            drawFrame(ctx, bgAt(movie, i), movie.frames[i], cw, ch, { T: now / 1000, bt: movie.bt });
            if (movie.frames[i].snd) playSnd(api, movie.frames[i].snd);
            badge.textContent = `Frame ${i + 1}/${n}`;
            [...strip.children].forEach((b, k) => b.classList.toggle('cur', k === i));
          } else if (P.anim) drawFrame(ctx, bgAt(movie, i), movie.frames[i], cw, ch, { T: now / 1000, bt: movie.bt });
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
      let dlgKey = null, dlgClean = null;
      function runClean() { if (dlgClean) { const f = dlgClean; dlgClean = null; try { f(); } catch (e) { /* ignore */ } } }
      function dialog(title, html, buttons, init, onBtn, cls) {
        runClean();
        ov.innerHTML = `<div class="mvm-dlg raised${cls ? ' ' + cls : ''}" role="dialog" aria-label="${api.esc(title)}"><div class="mvm-dt">${api.esc(title)}</div><div class="mvm-dc">${html}</div><div class="mvm-db">${buttons.map(b => `<button class="btn" data-b="${api.esc(b)}">${api.esc(b)}</button>`).join('')}</div></div>`;
        ov.hidden = false;
        ov.querySelectorAll('[data-b]').forEach(b => b.onclick = () => { api.sfx.click(); const r = onBtn ? onBtn(b.dataset.b, ov) : undefined; if (r !== false) closeDlg(); });
        dlgKey = e => { if (e.key === 'Escape') { e.preventDefault(); onBtn && onBtn('Cancel', ov); closeDlg(); } else if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'BUTTON') { const f = ov.querySelector('[data-b]'); if (f && buttons[0] !== 'Cancel' && buttons[0] !== 'Close') { e.preventDefault(); f.click(); } } };
        init && init(ov);
        const first = ov.querySelector('input,textarea,select,button'); first && setTimeout(() => { first.focus(); first.select && first.select(); }, 30);
      }
      function closeDlg() { runClean(); ov.hidden = true; ov.innerHTML = ''; dlgKey = null; }
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
          <p><b>1. Set the scene.</b> Press the <b>Scene</b> picture to pick a background (Party, Outdoors, Indoors and more). Add stick figures (up to 3) and props from the <b>Cast</b>: pick a group (Party, Basics, Pets &amp; Toys) in the list above the props, then tap a prop. Hats and crowns jump onto the picked figure's head. You can change the scenery partway through: go to a frame and pick a new background. It changes that frame and the frames after it, up to the next place where you already changed it. A green BG tag in the film strip marks each scene change.</p>
          <p><b>Birthday movies.</b> Try the <b>Birthday Banner</b> scene and press <b>Banner words</b> to put a name on it. Tap a cake, then <b>Candles</b> to choose 1 to 10 candles. The <i>Happy Birthday tune</i> is in the Sound list (part 1 and part 2), next to Party horn, Cheer and Clapping. See File, Example Movies, <i>Happy Birthday!</i></p>
          <p><b>2. Pose.</b> Drag the white dots to bend heads, arms and legs. Drag the red hip dot (or a limb) to move the whole figure. Drag props to move them. To tilt a prop (like an angled skateboard), drag its round yellow handle, or use the Tilt buttons or the [ and ] keys.</p>
          <p><b>3. Animate.</b> Press <b>Add frame</b> to copy this frame, then change the pose a little. Onion skin shows the last frame faintly so you can line things up.</p>
          <p><b>4. Tween.</b> Make two very different frames next to each other, pick the first one and press <b>Tween</b>. Movie Maker draws the in-between frames.</p>
          <p><b>5. Sound.</b> Pick a sound effect for any frame. It plays when that frame appears.</p>
          <p><b>6. Titles.</b> Add a title card and rolling credits, then press <b>Play</b>. Save your movie from the File menu.</p>
          <p><b>Extras.</b> Press <b>Extras</b> (or File, Extras Shop) to buy packs of scenes, props and a sound with play money: Winter Holidays, Spooky Fun, Adventure, Dinosaurs, Deep Space, Sports Day, Ocean Explorer and Fantasy, or the Everything Bundle. Locked packs show a padlock. Anyone can watch a movie that uses a pack, even without buying it.</p>
          <p><b>7. Share.</b> Press <b>Share</b> (or File, Share). <i>Share as a video</i> makes a video file with sound that you can save or send. <i>Share a link</i> makes a web link with the whole movie inside it: copy it into an email or a message, and your friend's computer plays it in Movie Maker.</p>
          <p><b>Keys:</b> Left/Right = change frame, Space = play/stop, N = add frame, Delete = remove the picked item, Ctrl+Z = undo.</p>
          <p>Stuck? Open an example movie (File, Example Movies) and see how it was made.</p></div>`, ['Close']);
      }

      /* ----- sharing ----- */
      const movieName = () => name || movie.title.text || 'My Movie';
      const canVideo = () => !!(window.MediaRecorder && window.HTMLCanvasElement && HTMLCanvasElement.prototype.captureStream);
      function pickMime(withAudio) {
        // MP4 with H.264 plays almost everywhere, so try that first.
        const L = withAudio ? ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
          : ['video/mp4;codecs=avc1.42E01E', 'video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
        try { return L.find(t => MediaRecorder.isTypeSupported(t)) || ''; } catch (e) { return ''; }
      }
      let exp = null; // the video being recorded right now
      function cancelExport() {
        const E = exp; exp = null; if (!E) return;
        E.cancelled = true; clearTimeout(E.timer);
        try { if (E.rec && E.rec.state !== 'inactive') E.rec.stop(); } catch (e) { /* ignore */ }
        try { E.stream && E.stream.getTracks().forEach(t => t.stop()); } catch (e) { /* ignore */ }
        try { E.ac && E.ac.close(); } catch (e) { /* ignore */ }
      }
      let vidURL = null;
      const dropURL = () => { if (vidURL) { URL.revokeObjectURL(vidURL); vidURL = null; } };
      // Plays the movie onto a 640x480 canvas in real time and records it (plus the frame sound effects) with MediaRecorder.
      async function recordVideo(pv, onProgress, mute) {
        const c = document.createElement('canvas'); c.width = 640; c.height = 480;
        const x = c.getContext('2d'), m = movie, S = mkSeq(m);
        renderAt(x, m, S, 0, 640, 480);
        const E = exp = { cancelled: false };
        let ac = null, snd = null;
        if (!mute) try {
          const C = window.AudioContext || window.webkitAudioContext;
          ac = new C(); E.ac = ac;
          const dest = ac.createMediaStreamDestination();
          if (ac.state !== 'running') await Promise.race([ac.resume(), new Promise(r => setTimeout(r, 600))]);
          if (ac.state === 'running') {
            // Keep a silent signal flowing, or some recorders wait for the first sound effect before writing anything.
            const hum = ac.createConstantSource ? ac.createConstantSource() : ac.createOscillator(), g = ac.createGain();
            if (hum.offset) hum.offset.value = 0; g.gain.value = hum.offset ? 1 : 0.00001; hum.connect(g); g.connect(dest); hum.start();
            snd = { dest, s: synth(ac, dest) };
          } else { ac.close(); ac = E.ac = null; }
        } catch (e) { try { ac && ac.close(); } catch (_) { /* ignore */ } ac = E.ac = null; }
        if (E.cancelled) throw new Error('cancel');
        const stream = c.captureStream(30); E.stream = stream;
        if (snd) snd.dest.stream.getAudioTracks().forEach(t => stream.addTrack(t));
        const mime = pickMime(!!snd);
        const rec = E.rec = new MediaRecorder(stream, { ...(mime ? { mimeType: mime } : {}), videoBitsPerSecond: 2500000 });
        const chunks = [];
        rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
        const done = new Promise((res, rej) => { rec.onstop = () => res(); rec.onerror = e => rej(e.error || new Error('recorder')); });
        if (pv) { const px = pv.getContext('2d'); E.pv = () => px.drawImage(c, 0, 0, pv.width, pv.height); }
        rec.start(500);
        const t0 = performance.now(); let lastG = -1;
        await new Promise(res => {
          const step = () => {
            if (E.cancelled) { res(); return; }
            const t = Math.min(S.total, (performance.now() - t0) / 1000), r = renderAt(x, m, S, t, 640, 480);
            if (r.g >= 0 && r.g !== lastG) { lastG = r.g; const f = m.frames[r.i]; if (f.snd && snd) playSnd(snd.s, f.snd); }
            E.pv && E.pv(); onProgress(t / S.total);
            if (t >= S.total) { res(); return; }
            E.timer = setTimeout(step, 1000 / 30);
          };
          step();
        });
        if (E.cancelled) throw new Error('cancel');
        try { rec.requestData(); } catch (e) { /* ignore */ }
        rec.stop(); await done;
        stream.getTracks().forEach(t => t.stop()); try { ac && ac.close(); } catch (e) { /* ignore */ }
        if (exp === E) exp = null;
        if (E.cancelled) throw new Error('cancel');
        const type = (rec.mimeType || mime || 'video/webm').split(';')[0];
        return { blob: new Blob(chunks, { type }), type, ext: type === 'video/mp4' ? 'mp4' : 'webm', audio: !!snd, secs: S.total };
      }
      function shareDlg(tab) {
        if (playing) stop();
        sel = null; renderSel();
        dialog(`Share "${movieName()}"`, `<p style="margin:0">Show your movie to a friend. No sign-up needed.</p>
          <div class="mvm-shr"><button class="btn" data-t="video">${IC.play}Share as a video</button><button class="btn" data-t="link">${IC.share}Share a link</button></div>
          <div class="mvm-pane sunken" style="background:#d4d0c8;padding:6px"></div>`, ['Close'], d => {
          const pane = d.querySelector('.mvm-pane');
          let tabNow = '';
          const show = t => {
            if (exp) return; // finish or cancel the recording first
            tabNow = t; dropURL();
            d.querySelectorAll('[data-t]').forEach(b => b.classList.toggle('down', b.dataset.t === t));
            (t === 'video' ? videoPane : linkPane)(pane, show);
          };
          d.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { api.sfx.click(); if (b.dataset.t !== tabNow) show(b.dataset.t); });
          show(tab || (canVideo() ? 'video' : 'link'));
          dlgClean = () => { cancelExport(); dropURL(); };
        });
      }
      function videoPane(pane, show) {
        if (!canVideo()) {
          pane.innerHTML = `<p>Sorry, this web browser can't make video files. You can still share your movie as a link: your friend opens it and watches it right here in Movie Maker.</p>
            <div class="mvm-acts"><button class="btn" data-v="link">Share a link instead</button></div>`;
          pane.querySelector('[data-v]').onclick = () => show('link');
          return;
        }
        const S = mkSeq(movie);
        pane.innerHTML = `<p>Movie Maker plays your movie and records it as a video file (640 x 480) with the title, the sound effects and the credits. It takes about ${Math.ceil(S.total)} seconds.</p>
          <div class="mvm-acts"><button class="btn" data-v="go"><b>Make video</b></button></div>`;
        pane.querySelector('[data-v="go"]').onclick = () => { api.sfx.click(); startVideo(pane, show); };
      }
      function startVideo(pane, show, mute) {
        pane.innerHTML = `<canvas class="mvm-pv" width="192" height="144"></canvas>
          <div class="mvm-pb sunken"><i></i></div><p class="mvm-vs" aria-live="polite">Recording... 0%</p>
          <div class="mvm-acts"><button class="btn" data-v="cancel">Cancel</button></div>`;
        const bar = pane.querySelector('.mvm-pb i'), vs = pane.querySelector('.mvm-vs');
        pane.querySelector('[data-v="cancel"]').onclick = () => { api.sfx.click(); cancelExport(); videoPane(pane, show); };
        recordVideo(pane.querySelector('.mvm-pv'), p => { const n = Math.round(p * 100); bar.style.width = n + '%'; vs.textContent = `Recording... ${n}%`; }, mute).then(r => {
          if (!pane.isConnected) return;
          if (!r.blob.size) { if (r.audio) { startVideo(pane, show, true); return; } throw new Error('empty'); } // nothing recorded: try once more without sound
          dropURL(); vidURL = URL.createObjectURL(r.blob);
          const fn = fileName(movieName()) + '.' + r.ext, file = new File([r.blob], fn, { type: r.type });
          let canSend = false; try { canSend = !!(navigator.canShare && navigator.share && navigator.canShare({ files: [file] })); } catch (e) { /* no */ }
          const mb = r.blob.size / 1048576;
          pane.innerHTML = `<p><b>Your video is ready!</b> ${api.esc(fn)} (${mb < 0.1 ? Math.max(1, Math.round(r.blob.size / 1024)) + ' KB' : mb.toFixed(1) + ' MB'}, ${Math.round(r.secs)} seconds).</p>
            ${r.audio ? '' : "<p>This computer couldn't record sound, so the video is silent.</p>"}
            <div class="mvm-acts">${canSend ? '<button class="btn" data-v="send"><b>Send to a friend...</b></button>' : ''}<a class="btn" data-v="save" href="${vidURL}" download="${api.esc(fn)}">Save video file</a><button class="btn" data-v="again">Make it again</button></div>
            <p style="color:#444">${canSend ? 'Send it by email or a messaging app, or save the file and send it yourself.' : 'Save the file, then send it to a friend by email or a messaging app.'}</p>`;
          api.sfx.ding();
          const send = pane.querySelector('[data-v="send"]');
          if (send) send.onclick = () => { api.sfx.click(); navigator.share({ files: [file], title: movie.title.text || 'My movie', text: 'I made a cartoon in Movie Maker! Watch it:' }).catch(() => {}); };
          pane.querySelector('[data-v="save"]').addEventListener('click', () => api.sfx.click());
          pane.querySelector('[data-v="again"]').onclick = () => { api.sfx.click(); startVideo(pane, show); };
        }).catch(e => {
          if (!pane.isConnected || String(e && e.message) === 'cancel') return;
          pane.innerHTML = `<p>Oops, the video couldn't be made on this computer. Try again, or share a link instead.</p>
            <div class="mvm-acts"><button class="btn" data-v="again">Try again</button><button class="btn" data-v="link">Share a link</button></div>`;
          pane.querySelector('[data-v="again"]').onclick = () => startVideo(pane, show);
          pane.querySelector('[data-v="link"]').onclick = () => show('link');
        });
      }
      function linkBase() { return (location.origin && location.origin !== 'null' ? location.origin : location.protocol + '//') + location.pathname; }
      function linkPane(pane, show) {
        pane.innerHTML = '<p>Making your link...</p>';
        encodeMovie(movie).then(data => {
          if (!pane.isConnected) return;
          const url = `${linkBase()}#2000&movie=${data}`, long = url.length > 8000;
          pane.innerHTML = `<p>Anyone who opens this link sees your movie play in Movie Maker. The whole movie is inside the link, so nothing is uploaded.</p>
            <textarea class="mvm-link sunken" readonly aria-label="Link to your movie"></textarea>
            <div class="mvm-acts"><button class="btn" data-l="copy"><b>Copy</b></button>${navigator.share ? '<button class="btn" data-l="send">Send link...</button>' : ''}<span class="mvm-ls" style="align-self:center">${url.length.toLocaleString()} characters</span></div>
            ${long ? `<p class="mvm-warn">This is a long link. Some email and chat programs cut long links short, and then it won't work. For a long movie, ${canVideo() ? '<a href="#" data-l="video">sharing it as a video</a>' : 'sharing it as a video'} is safer.</p>` : ''}`;
          const ta = pane.querySelector('.mvm-link'); ta.value = url;
          ta.addEventListener('focus', () => ta.select());
          const msg = t => { pane.querySelector('.mvm-ls').textContent = t; };
          pane.querySelector('[data-l="copy"]').onclick = () => {
            api.sfx.click();
            const fallback = () => { ta.focus(); ta.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (e) { /* no */ } msg(ok ? 'Copied!' : 'Press Ctrl+C to copy.'); };
            if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(() => msg('Copied! Paste it in an email or a message.'), fallback); else fallback();
          };
          const snd = pane.querySelector('[data-l="send"]');
          if (snd) snd.onclick = () => { api.sfx.click(); navigator.share({ title: movie.title.text || 'My movie', text: 'I made a cartoon in Movie Maker! Watch it here:', url }).catch(() => {}); };
          const v = pane.querySelector('[data-l="video"]'); if (v) v.onclick = e => { e.preventDefault(); show('video'); };
        }).catch(() => { if (pane.isConnected) pane.innerHTML = "<p>Oops, the link couldn't be made. Try again.</p>"; });
      }

      /* ----- shared movie player (opened from a link) ----- */
      const spEl = $('.mvm-sp');
      let sp = null;
      function spStop() { if (sp && sp.raf) { cancelAnimationFrame(sp.raf); sp.raf = 0; } }
      function spClose() {
        spStop(); sp = null; spEl.hidden = true; spEl.innerHTML = '';
        layout(); renderSel();
      }
      function spLayout() {
        if (!sp || !sp.cv) return;
        const box = spEl.querySelector('.mvm-sps'), aw = box.clientWidth - 4, ah = box.clientHeight - 4;
        const w = Math.floor(Math.max(120, Math.min(aw, ah * 4 / 3))), h = Math.floor(w * 3 / 4), dpr = Math.min(2, window.devicePixelRatio || 1);
        sp.cv.style.width = w + 'px'; sp.cv.style.height = h + 'px';
        const W2 = Math.round(w * dpr), H2 = Math.round(h * dpr);
        if (sp.cv.width !== W2 || sp.cv.height !== H2) { sp.cv.width = W2; sp.cv.height = H2; }
        if (!sp.raf) renderAt(sp.ctx, sp.m, sp.S, sp.at || 0, W2, H2);
      }
      function spPlay() {
        if (!sp || !sp.cv) return;
        spStop(); sp.t0 = performance.now(); sp.lastG = -1; sp.at = 0;
        spEl.querySelector('.mvm-spm').textContent = 'Now playing...';
        const tick = now => {
          if (!sp) return;
          const t = Math.min(sp.S.total, (now - sp.t0) / 1000), r = renderAt(sp.ctx, sp.m, sp.S, t, sp.cv.width, sp.cv.height);
          sp.at = t;
          if (r.g >= 0 && r.g !== sp.lastG) { sp.lastG = r.g; const f = sp.m.frames[r.i]; if (f.snd) playSnd(api, f.snd); }
          if (t >= sp.S.total) { sp.raf = 0; spEl.querySelector('.mvm-spm').textContent = 'The End. Press Play again to watch it again.'; return; }
          sp.raf = requestAnimationFrame(tick);
        };
        sp.raf = requestAnimationFrame(tick);
      }
      function openShared(data) {
        if (playing) stop();
        closeDlg(); sel = null;
        spEl.hidden = false;
        spEl.innerHTML = '<div class="mvm-cap">Shared Movie</div><div class="mvm-spe sunken">Opening the movie your friend sent...</div>';
        sp = { m: null };
        decodeMovie(data).then(m => {
          api.clearParam('movie');
          if (!sp) return;
          cleanMovie(m);
          sp = { m, S: mkSeq(m), raf: 0, saved: false };
          spEl.innerHTML = `<div class="mvm-cap">Shared Movie</div><div class="mvm-spt"></div>
            <div class="mvm-sps sunken"><canvas></canvas></div><div class="mvm-spm" aria-live="polite"></div>
            <div class="mvm-spb"><button class="btn" data-p="again">${IC.play}Play again</button><button class="btn" data-p="save">Save a copy to my movies</button><button class="btn" data-p="own">Make my own</button></div>`;
          spEl.querySelector('.mvm-spt').textContent = (m.title.text || 'A movie') + (m.title.sub ? ' - ' + m.title.sub : '');
          sp.cv = spEl.querySelector('canvas'); sp.ctx = sp.cv.getContext('2d');
          spLayout(); spPlay(); api.sfx.ding();
        }).catch(() => {
          api.clearParam('movie');
          if (!sp) return;
          spEl.innerHTML = `<div class="mvm-cap">Shared Movie</div>
            <div class="mvm-spe sunken"><b>Hmm, this movie link doesn't work.</b><br>It may have been cut short when it was sent, or copied only part of the way. Ask your friend to send it again, or to share it as a video.</div>
            <div class="mvm-spb"><button class="btn" data-p="own">Make my own movie</button></div>`;
          api.sfx.beep && api.sfx.beep();
        });
      }
      function spSave() {
        if (!sp || !sp.m) return;
        const m = sp.m;
        askText('Save a Copy', 'Name for this movie:', (m.title.text || 'Shared Movie').slice(0, 24), 24, t => {
          if (!t) return;
          const list = listMovies(), i = list.findIndex(x => x.n.toLowerCase() === t.toLowerCase());
          const put = () => {
            const l = listMovies(), j = l.findIndex(x => x.n.toLowerCase() === t.toLowerCase()), entry = { n: t, d: Date.now(), m: pack(m) };
            if (j >= 0) l[j] = entry; else l.push(entry);
            try { api.save('movies', l); } catch (e) { api.msgBox('Movie Maker', 'The disk is full. Delete an old movie and try again.', ['OK'], 'stop'); return; }
            api.sfx.floppy ? api.sfx.floppy() : api.sfx.ding();
            if (sp) { sp.saved = true; spEl.querySelector('.mvm-spm').textContent = `Saved as "${t}". Open it any time from File > Open.`; }
          };
          if (i >= 0) { api.msgBox('Save a Copy', `"${list[i].n}" already exists. Replace it?`, ['Yes', 'No'], 'warn').then(r => { if (r === 'Yes') put(); }); return; }
          if (list.length >= MAXM) { api.msgBox('Movie Maker', `You can keep ${MAXM} movies. Choose Make my own, then File > Open, and delete one to make room.`, ['OK'], 'warn'); return; }
          put();
        });
      }
      spEl.addEventListener('click', e => {
        const b = e.target.closest('[data-p]'); if (!b) return;
        api.sfx.click();
        if (b.dataset.p === 'again') spPlay(); else if (b.dataset.p === 'save') spSave(); else spClose();
      });

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
        stop(); if (sp) spClose(); movie = m; name = n; cur = clamp(at, 0, movie.frames.length - 1); sel = null; undoStack = []; dirty = false;
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
          { label: 'Extras Shop...', fn: () => { if (!sp) shopDlg(); } },
          '-',
          { label: 'Share...', fn: () => { if (!sp) shareDlg(); } },
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
        if (a === 'add') addFrame(false); else if (a === 'tween') tweenDlg(); else if (a === 'play') play(); else if (a === 'share') { api.sfx.click(); shareDlg(); }
        else if (a === 'extras') { api.sfx.click(); shopDlg(); }
      });
      $('.mvm-side').addEventListener('click', e => {
        const b = e.target.closest('.mvm-side>[data-add],.mvm-side>[data-a]'); if (!b) return;
        const a = b.dataset.a;
        if (a === 'titles') { api.sfx.click(); titlesDlg(); }
        else if (a === 'scene') { api.sfx.click(); sceneDlg(); }
        else if (a === 'banner') { api.sfx.click(); bannerDlg(); }
        else if (b.dataset.add === 'fig') addFig();
      });
      $('.mvm-tlh').addEventListener('click', e => {
        const b = e.target.closest('[data-a]'); if (!b) return;
        if (b.dataset.a === 'dup') addFrame(false); else if (b.dataset.a === 'del') delFrame();
      });
      strip.addEventListener('click', e => { const b = e.target.closest('.mvm-th'); if (b) { if (playing) stop(); go(+b.dataset.i); } });
      $('.mvm-fpsr').addEventListener('input', e => setFps(+e.target.value));
      $('.mvm-loop').addEventListener('change', e => { movie.loop = e.target.checked; touch(); });
      $('.mvm-onion').addEventListener('change', e => { onion = e.target.checked; api.save('onion', onion); draw(); });
      $('.mvm-snd').addEventListener('change', e => { if (playing) return; pushUndo(); frame().snd = e.target.value; playSnd(api, e.target.value); queueThumb(); touch(); });

      W.onKey = e => {
        if (dlgKey) { dlgKey(e); return; }
        if (sp) { if (e.key === 'Escape') { e.preventDefault(); spClose(); } else if (e.key === ' ' && sp.cv && e.target.tagName !== 'BUTTON') { e.preventDefault(); spPlay(); } return; }
        const tg = e.target && e.target.tagName;
        if (tg === 'INPUT' && e.target.type === 'text' || tg === 'TEXTAREA' || tg === 'SELECT') return;
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); return; }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(false); return; }
        if (e.key === ' ') { e.preventDefault(); play(); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); if (playing) stop(); go(cur - 1, true); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); if (playing) stop(); go(cur + 1, true); }
        else if ((e.key === '[' || e.key === ']') && sel && sel.t === 'prop') { e.preventDefault(); const d = e.key === '[' ? -15 : 15; editSel(p => { p.a = norm((p.a || 0) + d); }); }
        else if (e.key === 'Home') go(0, true);
        else if (e.key === 'End') go(movie.frames.length - 1, true);
        else if (e.key === 'Delete' || e.key === 'Backspace') { if (sel) { e.preventDefault(); removeSel(); } }
        else if (e.key.toLowerCase() === 'n' && !e.ctrlKey && !e.metaKey) addFrame(false);
        else if (e.key.toLowerCase() === 't' && !e.ctrlKey && !e.metaKey) tweenDlg();
      };
      W.onResize = () => layout();
      W.onMin = () => { stop(); spStop(); };
      // Candle flames and fireworks keep moving while you edit (only when the frame has something that moves).
      const animTimer = setInterval(() => {
        if (playing || sp || drag || document.hidden || !cv.isConnected || !cv.offsetParent || !movie) return;
        if (frameAnim(bgAt(movie, cur), frame())) { animT = performance.now() / 1000; draw(true); }
      }, 110);
      W.onClose = () => { clearInterval(animTimer); stop(); spStop(); sp = null; runClean(); cancelExport(); dropURL(); clearTimeout(statusT); if (thumbT) cancelAnimationFrame(thumbT); saveDraft(); };
      let ro = null;
      if (window.ResizeObserver) { ro = new ResizeObserver(() => layout()); ro.observe(sw); ro.observe(W.body); }
      const oc = W.onClose; W.onClose = () => { ro && ro.disconnect(); return oc(); };

      /* ----- start ----- */
      onion = api.load('onion', true) !== false;
      renderCats(); renderProps();
      const dr = api.load('draft', null);
      if (dr && dr.m) { load(unpack(dr.m), dr.n || null, dr.at || 0); dirty = !!dr.d; setTitle(); }
      else { load(newMovie(api.user), null); if (!listMovies().length) setTimeout(() => status('Welcome! Try File > Example Movies, or pose the figure and press Add frame.'), 50); }
      requestAnimationFrame(layout);
      // A friend's link (#2000&movie=...): show it in the player on top of the editor.
      const shared = api.param && api.param('movie');
      if (shared) openShared(shared);
    }
  });
})();
