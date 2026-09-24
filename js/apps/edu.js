/* Educational store games: Number Muncher (math grid arcade) and Type Rider (typing tutor with a road race). */
(function () {
  const R = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pickA = a => a[Math.floor(Math.random() * a.length)];
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const isPrime = n => { if (n < 2) return false; for (let i = 2; i * i <= n; i++) if (n % i === 0) return false; return true; };
  const sf = n => { for (let i = 2; i * i <= n; i++) if (n % i === 0) return i; return n; };
  // Turn a character map into run-length <rect>s for a pixel-art SVG.
  function pix(rows, pal) {
    const w = Math.max(...rows.map(r => r.length)); let s = '';
    rows.forEach((row, y) => {
      const r = row.padEnd(w, '.');
      for (let x = 0; x < w;) {
        const ch = r[x]; if (!pal[ch]) { x++; continue; }
        let e = x + 1; while (e < w && r[e] === ch) e++;
        s += `<rect x="${x}" y="${y}" width="${e - x}" height="1" fill="${pal[ch]}"/>`; x = e;
      }
    });
    return s;
  }

  /* ================= NUMBER MUNCHER ================= */
  const MB = ['....o......o....', '...oOo....oOo...', '...oOOooooOOo...', '..oOOOOOOOOOOo..', '.oOOwwOOOOwwOOo.', '.oOOwkOOOOwkOOo.', 'oOOOwkOOOOwkOOOo', 'oOOOOOOOOOOOOOOo'];
  const MC = ['oOpOOOOOOOOOOpOo', 'oOOOkOOOOOOkOOOo', 'oOOOOkkkkkkOOOOo', '.oOOOOOOOOOOOOo.', '.oOOOOOOOOOOOOo.'];
  const MO = ['oOpkkkkkkkkkkpOo', 'oOkwkkkkkkkkwkOo', 'oOkkkkkkkkkkkkOo', '.oOkkkrrrrkkkOo.', '.oOOkkkkkkkkOOo.'];
  const MF = ['..ooOOOOOOOOoo..', '...yy......yy...', '..yyy......yyy..'];
  const MPAL = { o: '#7a2c00', O: '#ff9a28', w: '#fff', k: '#000', p: '#ff78b0', y: '#ffd800', r: '#e02848' };
  const MUNCH_C = pix(MB.concat(MC, MF), MPAL), MUNCH_O = pix(MB.concat(MO, MF), MPAL);
  const MUNCHER = `<svg viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true"><g class="nmu-c">${MUNCH_C}</g><g class="nmu-o">${MUNCH_O}</g></svg>`;
  const GLB = ['..g..g....g..g..', '..gGgG....GgGg..', '...GGGGGGGGGG...', '..GGGGGGGGGGGG..', '.GGwwwGGGGwwwGG.', 'gGGwkwGGGGwkwGGg', '.GGwwwGGGGwwwGG.', 'GGGGGGGGGGGGGGGG', 'gGGkGkGkGkGkGGGg', '.GGGGGGGGGGGGGG.', 'GGgGGGGgGGGGgGGG', '.GGGGGGGGGGGGGG.', '..GgGG.GG.GGgG..', '..G..G.GG.G..G..', '.g...g....g...g.'];
  const GTYPES = {
    wander: { name: 'Wobbler', col: '#48e848', dk: '#0c700c', per: 1100, desc: 'Wobblers wander around at random.', rows: {} },
    chaser: { name: 'Chaser', col: '#ff4a4a', dk: '#801010', per: 1500, desc: 'Chasers follow you wherever you go.', rows: { 3: '..GkkGGGGGGkkG..' } },
    zoomer: { name: 'Zoomer', col: '#48e0ff', dk: '#0c5880', per: 520, desc: 'Zoomers race straight across the board.', rows: { 9: 'gGgGgGgGgGgGgGgG', 11: '.gGgGgGgGgGgGgG.' } },
    scram: { name: 'Scrambler', col: '#ff66ff', dk: '#800c80', per: 1000, desc: 'Scramblers put new numbers in empty squares.', rows: { 8: 'gGGkkkkkkkkkkGGg' } }
  };
  const glitchSvg = t => { const T = GTYPES[t], rows = GLB.map((r, i) => T.rows[i] || r); return `<svg viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true">${pix(rows, { G: T.col, g: T.dk, w: '#fff', k: '#000' })}</svg>`; };

  const num = (v, ok) => ({ t: String(v), v, ok });
  const RULES = {
    multiples(d) {
      const n = pickA([[2, 5, 10], [2, 3, 4, 5, 10], [3, 4, 6, 7, 8, 9], [6, 7, 8, 9, 11, 12], [7, 8, 9, 11, 12, 13, 15], [12, 13, 14, 15, 16, 17, 18, 19]][d]);
      const k = d < 2 ? 10 : 12, top = n * k;
      return {
        title: 'Multiples of ' + n,
        make: ok => { if (ok) return num(n * R(1, k), true); let v; do v = R(1, top); while (v % n === 0); return num(v, false); },
        yes: it => `${n} × ${it.v / n} = ${it.v}`,
        why: it => { const q = Math.floor(it.v / n); return q < 1 ? `${it.v} is not a multiple of ${n}. The smallest multiple of ${n} is ${n}.` : `${it.v} is not a multiple of ${n}. ${n} × ${q} = ${n * q} and ${n} × ${q + 1} = ${n * (q + 1)}.`; }
      };
    },
    factors(d) {
      const N = pickA([[6, 8, 10, 12], [12, 16, 18, 20], [18, 24, 30, 32], [36, 40, 42, 48], [48, 54, 60, 64, 72], [72, 80, 84, 90, 96, 100]][d]);
      const divs = []; for (let i = 1; i <= N; i++) if (N % i === 0) divs.push(i);
      const top = Math.max(N, 20);
      return {
        title: 'Factors of ' + N,
        make: ok => { if (ok) return num(pickA(divs), true); let v; do v = R(2, top); while (N % v === 0); return num(v, false); },
        yes: it => `${it.v} × ${N / it.v} = ${N}`,
        why: it => it.v > N ? `${it.v} is not a factor of ${N}. A factor of ${N} can't be bigger than ${N}.` : `${it.v} is not a factor of ${N}. ${N} ÷ ${it.v} = ${Math.floor(N / it.v)} remainder ${N % it.v}.`
      };
    },
    primes(d) {
      const top = [20, 30, 50, 70, 100, 100][d], P = [], C = [];
      for (let i = 1; i <= top; i++) (isPrime(i) ? P : C).push(i);
      return {
        title: 'Prime numbers',
        make: ok => num(pickA(ok ? P : C), ok),
        yes: it => `${it.v} is prime. Its only factors are 1 and ${it.v}.`,
        why: it => it.v === 1 ? '1 is not a prime number. A prime has exactly two factors: 1 and itself.' : `${it.v} is not prime, because ${sf(it.v)} × ${it.v / sf(it.v)} = ${it.v}.`
      };
    },
    equals(d) {
      const [lo, hi] = [[5, 10], [6, 15], [8, 24], [10, 30], [12, 40], [20, 60]][d];
      const ops = [['+'], ['+', '-'], ['+', '-', '×'], ['+', '-', '×', '÷'], ['+', '-', '×', '÷'], ['+', '-', '×', '÷']][d];
      let T = R(lo, hi);
      if (ops.includes('×')) while (isPrime(T)) T = R(lo, hi);
      const ex = v => {
        for (let i = 0; i < 12; i++) {
          const op = pickA(ops);
          if (op === '+' && v >= 2) { const a = R(1, v - 1); return `${a} + ${v - a}`; }
          if (op === '-') { const b = R(1, d < 2 ? 9 : 20); return `${v + b} - ${b}`; }
          if (op === '×') { const f = []; for (let a = 2; a * a <= v; a++) if (v % a === 0) f.push(a); if (f.length) { const a = pickA(f); return Math.random() < 0.5 ? `${a} × ${v / a}` : `${v / a} × ${a}`; } }
          if (op === '÷') { const b = R(2, d < 4 ? 5 : 9); if (v * b <= 150) return `${v * b} ÷ ${b}`; }
        }
        return v >= 2 ? `${v - 1} + 1` : `${v + 1} - 1`;
      };
      return {
        title: 'Equals ' + T, long: true,
        make: ok => { let v = T; if (!ok) do v = T + pickA([-4, -3, -2, -1, 1, 2, 3, 4]); while (v < 1); return { t: ex(v), v, ok }; },
        yes: it => `${it.t} = ${T}`,
        why: it => `${it.t} = ${it.v}, not ${T}.`
      };
    },
    greater(d) {
      const N = pickA([[10, 12, 15], [20, 25, 30], [40, 50, 60], [50, 75, 100], [100, 150, 200], [250, 500, 750]][d]), sp = Math.max(9, Math.round(N * 0.4));
      return {
        title: 'Greater than ' + N,
        make: ok => num(ok ? R(N + 1, N + sp) : R(Math.max(0, N - sp), N), ok),
        yes: it => `${it.v} is greater than ${N}.`,
        why: it => it.v === N ? `${it.v} is equal to ${N}, not greater than ${N}.` : `${it.v} is less than ${N}, not greater.`
      };
    },
    less(d) {
      const N = pickA([[10, 12, 15], [20, 25, 30], [40, 50, 60], [50, 75, 100], [100, 150, 200], [250, 500, 750]][d]), sp = Math.max(9, Math.round(N * 0.4));
      return {
        title: 'Less than ' + N,
        make: ok => num(ok ? R(Math.max(0, N - sp), N - 1) : R(N, N + sp), ok),
        yes: it => `${it.v} is less than ${N}.`,
        why: it => it.v === N ? `${it.v} is equal to ${N}, not less than ${N}.` : `${it.v} is greater than ${N}, not less.`
      };
    },
    even(d) {
      const top = [20, 30, 50, 100, 200, 500][d];
      return {
        title: 'Even numbers',
        make: ok => { let v; do v = R(1, top); while ((v % 2 === 0) !== ok); return num(v, ok); },
        yes: it => `${it.v} = 2 × ${it.v / 2}, so it is even.`,
        why: it => `${it.v} is odd. Even numbers end in 0, 2, 4, 6 or 8.`
      };
    },
    odd(d) {
      const top = [20, 30, 50, 100, 200, 500][d];
      return {
        title: 'Odd numbers',
        make: ok => { let v; do v = R(1, top); while ((v % 2 === 1) !== ok); return num(v, ok); },
        yes: it => `${it.v} ends in ${it.v % 10}, so it is odd.`,
        why: it => `${it.v} is even. Odd numbers end in 1, 3, 5, 7 or 9.`
      };
    }
  };
  const MODES = [
    { id: 'multiples', label: 'Multiples', desc: 'Munch every multiple of the number shown.' },
    { id: 'factors', label: 'Factors', desc: 'Munch every number that divides evenly into the number shown.' },
    { id: 'primes', label: 'Primes', desc: 'Munch every prime number: numbers with exactly two factors.' },
    { id: 'equals', label: 'Equality', desc: 'Munch every problem whose answer equals the target.' },
    { id: 'mixed', label: 'Mixed', desc: 'A new rule every level: multiples, factors, primes, equality, greater than, less than, even and odd.' }
  ];
  const GRADES = ['Grades 1-2', 'Grades 3-4', 'Grades 5-6', 'Math Whiz'];

  (window.RETRO_APPS = window.RETRO_APPS || []).push({
    id: 'muncher',
    label: 'Number Muncher',
    kind: 'store', cat: 'game', year: 1990, price: 19.95,
    publisher: 'Brightleaf Learning Co.',
    genre: 'Educational / Math',
    tagline: 'Chomp your way to math mastery!',
    blurb: 'Guide Nibbs the hungry Muncher around a grid of numbers and gobble up only the right answers: multiples, factors, primes and tricky equations. Watch out for the Glitches, four kinds of mischievous bugs that roam the board. Five game modes and four grade levels, from first grade to Math Whiz.',
    sizeKB: 900,
    box: { bg: '#1a2a8a', fg: '#ffff55', accent: '#ff9a28' },
    icon: `<svg viewBox="0 0 32 32" shape-rendering="crispEdges" aria-hidden="true"><rect x="1" y="1" width="30" height="30" fill="#0000a8" stroke="#000"/><g fill="#55ffff"><rect x="2" y="11" width="28" height="1"/><rect x="2" y="21" width="28" height="1"/><rect x="11" y="2" width="1" height="28"/><rect x="21" y="2" width="1" height="28"/></g><g transform="translate(4 4) scale(1.5)">${MUNCH_O}</g></svg>`,
    window: { w: 560, h: 500 },
    css: `
      .nmu{height:100%;display:flex;flex-direction:column;background:#0000a8;color:#fff;user-select:none;-webkit-user-select:none}
      .nmu .btn{color:#000}
      .nmu-title{flex:1;overflow:auto;padding:10px 12px;display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center}
      .nmu-logo{display:flex;align-items:center;gap:10px}
      .nmu-logo b{font:400 38px/.85 var(--dos);color:#ffff55;text-shadow:3px 3px #a800a8;letter-spacing:2px;text-align:left}
      .nmu-logo svg{width:64px;height:64px}
      .nmu-sect{font:20px/1 var(--dos);color:#55ffff;margin-top:4px}
      .nmu-opts{display:flex;flex-wrap:wrap;gap:4px;justify-content:center}
      .nmu-opts .btn{min-width:0;padding:4px 10px}
      .nmu-desc{font-size:12px;color:#fff;min-height:2.6em;max-width:420px}
      .nmu-go{font-weight:700;padding:6px 22px !important}
      .nmu-hs{background:#000;border:2px solid #55ffff;padding:4px 10px;font:18px/1.1 var(--dos);min-width:260px;max-width:100%;margin-top:4px}
      .nmu-hs h4{margin:0 0 2px;font:400 20px var(--dos);color:#ffff55}
      .nmu-hs div{display:flex;justify-content:space-between;gap:10px;color:#aaa}
      .nmu-hs div b{color:#fff;font-weight:400}
      .nmu-play{flex:1;display:flex;flex-direction:column;min-height:0;padding:6px;gap:4px}
      .nmu-rule{background:#000;color:#ffff55;font:28px/1.05 var(--dos);text-align:center;padding:2px 6px;border:2px solid #55ffff}
      .nmu-info{display:flex;justify-content:space-between;align-items:center;font:19px/1 var(--dos);color:#55ffff;gap:6px}
      .nmu-info b{color:#fff;font-weight:400}
      .nmu-lives{display:flex;gap:2px;min-height:16px}
      .nmu-lives svg{width:16px;height:16px}
      .nmu-gw{flex:1;position:relative;min-height:150px}
      .nmu-grid{position:absolute;inset:0;display:grid;grid-template-columns:repeat(6,1fr);grid-template-rows:repeat(5,1fr);border:2px solid #55ffff;background:#000070;touch-action:none}
      .nmu-cell{border:1px solid #1c3ca8;display:flex;align-items:center;justify-content:center;font-size:var(--fs,20px);font-family:var(--dos);line-height:1;color:#fff;cursor:pointer;white-space:nowrap;overflow:hidden;min-width:0}
      .nmu-cell.here{align-items:flex-end;padding-bottom:3%;font-size:calc(var(--fs,20px)*.62);color:#ffff55}
      .nmu-cell.warn{animation:nmu-blink .25s steps(2) infinite}
      .nmu-cell.pop{animation:nmu-pop .4s}
      @keyframes nmu-blink{50%{background:#a80000}}
      @keyframes nmu-pop{0%{background:#a800a8}}
      .nmu-spr{position:absolute;inset:2px;pointer-events:none;overflow:hidden}
      .nmu-sp{position:absolute;width:16.6667%;height:20%;display:flex;align-items:center;justify-content:center;transition:left .14s linear,top .14s linear}
      .nmu-sp svg{height:78%;width:auto;aspect-ratio:1;max-width:92%}
      .nmu-me{align-items:flex-start;z-index:2}
      .nmu-me svg{height:56%;margin-top:2%}
      .nmu-me .nmu-o,.nmu-me.chomp .nmu-c{display:none}
      .nmu-me.chomp .nmu-o{display:inline}
      .nmu-me.hurt svg{animation:nmu-hurt .12s steps(2) infinite}
      @keyframes nmu-hurt{50%{opacity:.2}}
      .nmu-gl svg{animation:nmu-jit .5s steps(2) infinite}
      @keyframes nmu-jit{50%{transform:translate(1px,-1px)}}
      .nmu-ov{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,40,.6);z-index:5;padding:8px}
      .nmu-ov[hidden]{display:none}
      .nmu-box{color:#000;max-width:360px;width:100%;padding:10px 14px;text-align:center;display:flex;flex-direction:column;gap:8px}
      .nmu-box h3{margin:0;font:400 28px/1 var(--dos);color:#000080}
      .nmu-box p{margin:0;white-space:pre-line;font-size:13px}
      .nmu-box .nmu-bb{display:flex;gap:6px;justify-content:center;flex-wrap:wrap}
      .nmu-say{background:#000;color:#55ff55;font:18px/1 var(--dos);padding:3px 6px;min-height:24px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .nmu-ctl{display:flex;gap:4px;justify-content:center}
      .nmu-ctl .btn{min-width:46px;padding:6px 0;font-size:14px;touch-action:manipulation}
      .nmu-ctl .nmu-mb{min-width:90px;font-weight:700}
    `,
    open(W, api) {
      let opts = Object.assign({ mode: 'multiples', grade: 0, sound: true }, api.load('opts', {}));
      let hi = api.load('hi', []);
      let st = null, tick = null, el = null, ov = null, timers = [];
      const later = (fn, ms) => { const id = setTimeout(fn, ms); timers.push(id); return id; };
      W.body.innerHTML = '<div class="nmu"></div>';
      const root = W.body.firstChild;
      const snd = fn => { if (opts.sound) try { fn(); } catch (e) {} };
      const SND = {
        move: () => snd(() => api.tone(520, 0.03, { vol: 0.03 })),
        munch: () => snd(() => { api.noise(0.06, { f: 900, q: 2, vol: 0.12, decay: 1 }); api.tone(300, 0.08, { to: 600, vol: 0.05, at: 0.05 }); }),
        yum: () => snd(() => { api.tone(660, 0.07, { vol: 0.05, at: 0.1 }); api.tone(990, 0.1, { vol: 0.05, at: 0.17 }); }),
        wrong: () => snd(() => { api.tone(150, 0.4, { type: 'sawtooth', vol: 0.07, to: 70 }); }),
        caught: () => snd(() => { [700, 560, 420, 280, 180].forEach((f, i) => api.tone(f, 0.09, { vol: 0.06, at: i * 0.08 })); }),
        warn: () => snd(() => { api.tone(1300, 0.04, { vol: 0.03 }); api.tone(1300, 0.04, { vol: 0.03, at: 0.1 }); }),
        clear: () => snd(() => api.sfx.tada()),
        empty: () => snd(() => api.tone(200, 0.05, { vol: 0.04 }))
      };

      api.menubar([
        { label: 'Game', items: () => [
          { label: 'New game', fn: showTitle },
          { label: ov && ov.kind === 'pause' ? 'Resume' : 'Pause', fn: togglePause, disabled: !st || st.over },
          '-', { label: 'Exit', fn: () => api.close() }
        ] },
        { label: 'Options', items: () => [
          { label: (opts.sound ? '[x] ' : '[ ] ') + 'Sound', fn: () => { opts.sound = !opts.sound; api.save('opts', opts); } },
          { label: 'Clear high scores', fn: () => api.msgBox('Number Muncher', 'Erase all high scores?', ['Yes', 'No'], 'warn').then(b => { if (b === 'Yes') { hi = []; api.save('hi', hi); if (!st) showTitle(); } }) }
        ] },
        { label: 'Help', items: [
          { label: 'How to play', fn: howTo },
          { label: 'Meet the Glitches', fn: () => api.msgBox('Meet the Glitches', Object.values(GTYPES).map(g => `${g.name}: ${g.desc}`).join('\n') + '\n\nIf a Glitch reaches your square, you lose a life. New kinds of Glitches show up as the levels go on.') },
          { label: 'About Number Muncher', fn: () => api.msgBox('About Number Muncher', 'Number Muncher 1.0\nBrightleaf Learning Co., 1990\n\nMath practice for hungry minds.') }
        ] }
      ]);
      function howTo() {
        api.msgBox('How to play', 'The rule at the top tells you which squares to munch, like "Multiples of 4".\n\nMove Nibbs with the arrow keys or W A S D, the arrow buttons, or by tapping a square next to him. Press Space or Enter, the Munch! button, or tap Nibbs again to munch the number he is standing on.\n\nMunch every right answer to clear the level. Munching a wrong answer costs a life, and so does getting caught by a Glitch.\n\nYou earn $1 for every level you clear (up to $6 a game). Press P to pause.');
      }

      /* ---- title screen ---- */
      function showTitle() {
        stopGame();
        const modeDesc = () => (MODES.find(m => m.id === opts.mode) || MODES[0]).desc;
        root.innerHTML = `<div class="nmu-title">
          <div class="nmu-logo">${MUNCHER}<b>NUMBER<br>MUNCHER</b></div>
          <div class="nmu-sect">Game mode</div>
          <div class="nmu-opts" data-g="mode">${MODES.map(m => `<button class="btn${m.id === opts.mode ? ' down' : ''}" data-v="${m.id}">${m.label}</button>`).join('')}</div>
          <div class="nmu-desc">${modeDesc()}</div>
          <div class="nmu-sect">Grade level</div>
          <div class="nmu-opts" data-g="grade">${GRADES.map((g, i) => `<button class="btn${i === opts.grade ? ' down' : ''}" data-v="${i}">${g}</button>`).join('')}</div>
          <button class="btn nmu-go">Start Munching!</button>
          <div class="nmu-hs"><h4>TOP MUNCHERS</h4>${hi.length ? hi.map((h, i) => `<div><span>${i + 1}. ${api.esc(h.n)}</span><span>${api.esc(h.m)} L${h.l}</span><b>${h.s}</b></div>`).join('') : '<div><span>No scores yet. Be the first!</span></div>'}</div>
        </div>`;
        root.querySelectorAll('.nmu-opts').forEach(g => g.addEventListener('click', e => {
          const b = e.target.closest('[data-v]'); if (!b) return;
          api.sfx.click();
          g.querySelectorAll('.btn').forEach(x => x.classList.toggle('down', x === b));
          if (g.dataset.g === 'mode') { opts.mode = b.dataset.v; root.querySelector('.nmu-desc').textContent = modeDesc(); } else opts.grade = +b.dataset.v;
          api.save('opts', opts);
        }));
        root.querySelector('.nmu-go').onclick = newGame;
      }

      /* ---- play screen ---- */
      function renderPlay() {
        root.innerHTML = `<div class="nmu-play">
          <div class="nmu-rule"></div>
          <div class="nmu-info"><span>LEVEL <b data-f="lv"></b></span><span class="nmu-lives" data-f="li"></span><span>SCORE <b data-f="sc"></b></span></div>
          <div class="nmu-gw"><div class="nmu-grid">${Array.from({ length: 30 }, (_, i) => `<div class="nmu-cell" data-i="${i}"></div>`).join('')}</div><div class="nmu-spr"><div class="nmu-sp nmu-me">${MUNCHER}</div></div><div class="nmu-ov" hidden></div></div>
          <div class="nmu-say" role="status"></div>
          <div class="nmu-ctl"><button class="btn" data-m="l" aria-label="Left">&#9668;</button><button class="btn" data-m="u" aria-label="Up">&#9650;</button><button class="btn" data-m="d" aria-label="Down">&#9660;</button><button class="btn" data-m="r" aria-label="Right">&#9658;</button><button class="btn nmu-mb" data-m="m">Munch!</button></div>
        </div>`;
        const q = s => root.querySelector(s);
        el = { rule: q('.nmu-rule'), lv: q('[data-f=lv]'), sc: q('[data-f=sc]'), li: q('[data-f=li]'), gw: q('.nmu-gw'), grid: q('.nmu-grid'), spr: q('.nmu-spr'), me: q('.nmu-me'), ov: q('.nmu-ov'), say: q('.nmu-say'), cells: [...root.querySelectorAll('.nmu-cell')] };
        el.grid.addEventListener('pointerdown', e => {
          const c = e.target.closest('[data-i]'); if (!c) return;
          e.preventDefault();
          if (ov) { if (ov.kind === 'pause') closeOv(0); return; }
          const i = +c.dataset.i, cx = i % 6, cy = (i / 6) | 0;
          if (cx === st.px && cy === st.py) { munch(); return; }
          const dx = cx - st.px, dy = cy - st.py;
          if (Math.abs(dx) >= Math.abs(dy)) move(Math.sign(dx), 0); else move(0, Math.sign(dy));
        });
        root.querySelector('.nmu-ctl').addEventListener('pointerdown', e => {
          const b = e.target.closest('[data-m]'); if (!b) return;
          e.preventDefault();
          b.classList.add('down'); later(() => b.classList.remove('down'), 120);
          if (ov) { if (ov.kind === 'pause') closeOv(0); return; }
          const m = b.dataset.m;
          if (m === 'm') munch(); else move(...{ l: [-1, 0], r: [1, 0], u: [0, -1], d: [0, 1] }[m]);
        });
        fit();
      }
      function fit() {
        if (!el || !el.gw.isConnected) return;
        const cw = el.gw.clientWidth / 6, ch = el.gw.clientHeight / 5;
        const n = Math.max(2.5, ...(st ? st.board : []).map(it => it ? it.t.length : 0));
        el.grid.style.setProperty('--fs', Math.max(10, Math.min(ch * 0.55, cw * 0.9 / (n * 0.6))) + 'px');
      }
      const place = (node, x, y) => { node.style.left = (x * 100 / 6) + '%'; node.style.top = (y * 20) + '%'; };
      function drawCell(i) {
        const it = st.board[i], c = el.cells[i];
        c.textContent = it ? it.t : '';
        c.classList.toggle('here', i === st.py * 6 + st.px);
      }
      const drawBoard = () => { for (let i = 0; i < 30; i++) drawCell(i); };
      function drawInfo() {
        el.lv.textContent = st.level; el.sc.textContent = st.score;
        el.li.innerHTML = Array.from({ length: st.lives }, () => `<svg viewBox="0 0 16 16" shape-rendering="crispEdges">${MUNCH_C}</svg>`).join('');
      }
      const say = t => { if (el) el.say.textContent = t; };

      /* ---- overlay (level start/clear, mistakes, pause, game over) ---- */
      function showOv(kind, title, text, buttons) {
        ov = { kind, buttons, ready: Date.now() + (kind === 'pause' ? 0 : 450) };
        el.ov.innerHTML = `<div class="nmu-box raised"><h3></h3><p></p><div class="nmu-bb">${buttons.map((b, i) => `<button class="btn" data-b="${i}">${b[0]}</button>`).join('')}</div></div>`;
        el.ov.querySelector('h3').textContent = title;
        el.ov.querySelector('p').textContent = text;
        el.ov.hidden = false;
        el.ov.querySelectorAll('[data-b]').forEach(b => b.onclick = () => closeOv(+b.dataset.b, true));
      }
      function closeOv(i, force) {
        if (!ov || (!force && Date.now() < ov.ready)) return;
        const fn = ov.buttons[i] && ov.buttons[i][1];
        ov = null; if (el) { el.ov.hidden = true; el.ov.innerHTML = ''; }
        fn && fn();
      }
      function togglePause() {
        if (!st || st.over) return;
        if (ov && ov.kind === 'pause') closeOv(0, true);
        else if (!ov) showOv('pause', 'Paused', 'Nibbs is taking a snack break.\nPress P or tap Resume to keep playing.', [['Resume', null]]);
      }

      /* ---- game flow ---- */
      const maxEn = () => Math.min(4, 1 + Math.floor(st.level / 2));
      const slow = () => st.grade === 0 ? 1.25 : 1;
      const spd = () => Math.max(0.5, 1 - (st.level - 1) * 0.06) * slow();
      const spawnDelay = () => Math.max(2500, 8000 - st.level * 500) * slow();
      const kinds = () => ['wander', 'chaser', 'zoomer', 'scram'].slice(0, Math.min(4, st.level));
      function stopGame() { clearInterval(tick); tick = null; timers.forEach(clearTimeout); timers = []; st = null; ov = null; el = null; }
      function newGame() {
        stopGame();
        st = { mode: opts.mode, grade: opts.grade, level: 0, score: 0, lives: 3, earned: 0, px: 2, py: 2, enemies: [], warns: [], board: [], rule: null, spawnT: 0, over: false, lastKind: null };
        renderPlay();
        setupLevel();
        showOv('start', 'Level 1', `Munch all the:\n${st.rule.title}\n\n${GRADES[st.grade]}. Watch out for Glitches!`, [['Go!', null]]);
        tick = setInterval(step, 50);
      }
      function setupLevel() {
        st.level++;
        const d = clamp(st.grade + Math.floor((st.level - 1) / 3), 0, 5);
        let kind = st.mode;
        if (kind === 'mixed') kind = pickA(['multiples', 'factors', 'primes', 'equals', 'greater', 'less', 'even', 'odd'].filter(k => k !== st.lastKind));
        st.lastKind = kind;
        st.rule = RULES[kind](d);
        const nOk = R(9, 13), items = [];
        for (let i = 0; i < 30; i++) items.push(st.rule.make(i < nOk));
        st.board = shuffle(items);
        clearEnemies();
        st.spawnT = (st.level === 1 ? 6000 : 4000) * slow();
        el.rule.textContent = st.rule.title;
        place(el.me, st.px, st.py);
        drawBoard(); drawInfo(); fit();
        say(`Level ${st.level}. Munch: ${st.rule.title}`);
      }
      function clearEnemies() {
        st.enemies.forEach(e => e.node.remove()); st.enemies = [];
        st.warns.forEach(w => el.cells[w.i].classList.remove('warn')); st.warns = [];
      }
      const inside = (x, y) => x >= 0 && x < 6 && y >= 0 && y < 5;
      function step() {
        if (!st || st.over || ov || st.busy) return;
        if (!W.el.classList.contains('active')) { togglePause(); return; }
        st.spawnT -= 50;
        if (st.spawnT <= 0) { st.spawnT = spawnDelay(); if (st.enemies.length + st.warns.length < maxEn()) beginSpawn(); }
        for (const w of st.warns.slice()) {
          w.t -= 50;
          if (w.t <= 0) { st.warns.splice(st.warns.indexOf(w), 1); el.cells[w.i].classList.remove('warn'); spawn(w); if (ov || !st) return; }
        }
        for (const e of st.enemies.slice()) {
          e.acc += 50;
          if (e.acc >= e.per) { e.acc = 0; moveEnemy(e); if (!st || ov) return; }
        }
      }
      function beginSpawn() {
        for (let tries = 0; tries < 30; tries++) {
          const side = R(0, 3);
          let x, y, dir;
          if (side === 0) { x = -1; y = R(0, 4); dir = [1, 0]; } else if (side === 1) { x = 6; y = R(0, 4); dir = [-1, 0]; }
          else if (side === 2) { x = R(0, 5); y = -1; dir = [0, 1]; } else { x = R(0, 5); y = 5; dir = [0, -1]; }
          const ex = x + dir[0], ey = y + dir[1];
          if (Math.abs(ex - st.px) + Math.abs(ey - st.py) < 2) continue;
          if (st.warns.some(w => w.i === ey * 6 + ex)) continue;
          const i = ey * 6 + ex;
          st.warns.push({ i, x, y, dir, t: 1300, type: pickA(kinds()) });
          el.cells[i].classList.add('warn');
          SND.warn();
          return;
        }
      }
      function spawn(w) {
        const node = document.createElement('div');
        node.className = 'nmu-sp nmu-gl';
        node.innerHTML = glitchSvg(w.type);
        node.style.transition = 'none';
        place(node, w.x, w.y);
        el.spr.appendChild(node);
        void node.offsetWidth; node.style.transition = '';
        const e = { type: w.type, x: w.x, y: w.y, dir: w.dir, per: GTYPES[w.type].per * spd(), acc: 0, node };
        st.enemies.push(e);
        e.x += e.dir[0]; e.y += e.dir[1]; place(node, e.x, e.y);
        if (e.x === st.px && e.y === st.py) caught(e);
      }
      const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      function moveEnemy(e) {
        let [dx, dy] = e.dir;
        if (e.type === 'chaser') {
          const ddx = st.px - e.x, ddy = st.py - e.y;
          if (Math.random() < 0.2) [dx, dy] = pickA(DIRS.filter(d => inside(e.x + d[0], e.y + d[1])));
          else if (Math.abs(ddx) > Math.abs(ddy) || (Math.abs(ddx) === Math.abs(ddy) && Math.random() < 0.5)) { dx = Math.sign(ddx); dy = 0; }
          else { dx = 0; dy = Math.sign(ddy); }
        } else if (e.type !== 'zoomer') {
          if (Math.random() < 0.45 || !inside(e.x + dx, e.y + dy)) [dx, dy] = pickA(DIRS.filter(d => inside(e.x + d[0], e.y + d[1])));
        }
        const ox = e.x, oy = e.y;
        e.x += dx; e.y += dy; e.dir = [dx, dy];
        place(e.node, e.x, e.y);
        if (!inside(e.x, e.y)) { st.enemies.splice(st.enemies.indexOf(e), 1); later(() => e.node.remove(), 200); return; }
        if (e.type === 'scram' && !st.board[oy * 6 + ox] && Math.random() < 0.4) {
          const i = oy * 6 + ox;
          st.board[i] = st.rule.make(Math.random() < 0.3); drawCell(i); fit();
          el.cells[i].classList.remove('pop'); void el.cells[i].offsetWidth; el.cells[i].classList.add('pop');
        }
        if (e.x === st.px && e.y === st.py) caught(e);
      }
      function move(dx, dy) {
        if (!st || st.over || ov || st.busy) return;
        const nx = st.px + dx, ny = st.py + dy;
        if (!inside(nx, ny)) { SND.empty(); return; }
        const old = st.py * 6 + st.px;
        st.px = nx; st.py = ny;
        place(el.me, nx, ny); drawCell(old); drawCell(ny * 6 + nx);
        SND.move();
        const e = st.enemies.find(e => e.x === nx && e.y === ny);
        if (e) caught(e);
      }
      function chomp() {
        el.me.classList.add('chomp');
        later(() => el && el.me.classList.remove('chomp'), 110);
        later(() => el && el.me.classList.add('chomp'), 220);
        later(() => el && el.me.classList.remove('chomp'), 330);
      }
      function munch() {
        if (!st || st.over || ov || st.busy) return;
        const i = st.py * 6 + st.px, it = st.board[i];
        if (!it) { SND.empty(); say('Nothing left to munch here. Try another square!'); return; }
        chomp(); SND.munch();
        st.board[i] = null; drawCell(i);
        if (it.ok) {
          st.score += 10 * st.level; drawInfo(); SND.yum();
          say('Yum! ' + st.rule.yes(it));
          if (!st.board.some(x => x && x.ok)) { st.busy = true; later(levelClear, 350); }
        } else {
          SND.wrong();
          loseLife('Oops!', st.rule.why(it));
        }
      }
      function caught(e) {
        SND.caught();
        loseLife('Gotcha!', `A ${GTYPES[e.type].name} Glitch caught Nibbs! ${GTYPES[e.type].desc}`);
      }
      function loseLife(title, text) {
        st.lives--; drawInfo();
        el.me.classList.add('hurt');
        clearEnemies();
        st.spawnT = spawnDelay();
        const done = () => el && el.me.classList.remove('hurt');
        if (st.lives <= 0) { later(() => { done(); gameOver(text); }, 600); st.over = true; return; }
        say(text);
        showOv('oops', title, text + `\n\nLives left: ${st.lives}`, [['Keep munching', done]]);
      }
      function levelClear() {
        if (!st || st.over) return;
        st.busy = false;
        const bonus = 50 * st.level;
        st.score += bonus;
        let extra = '';
        if (st.level % 3 === 0 && st.lives < 5) { st.lives++; extra = '\nBonus: an extra life!'; }
        drawInfo(); clearEnemies(); SND.clear();
        if (st.earned < 6) { st.earned++; api.earn(1, 'clearing a Number Muncher level'); }
        const lv = st.level;
        // Preview the next rule so the player knows what is coming.
        setupLevel();
        showOv('clear', `Level ${lv} cleared!`, `Level bonus: ${bonus} points.${extra}\n\nNext up, level ${st.level}:\n${st.rule.title}`, [['Next level', null]]);
      }
      function gameOver(why) {
        if (!st) return;
        st.over = true;
        const entry = { n: api.user, s: st.score, l: st.level, m: (MODES.find(m => m.id === st.mode) || {}).label || '' };
        if (entry.s > 0) hi.push(entry); hi.sort((a, b) => b.s - a.s); hi = hi.slice(0, 8); api.save('hi', hi);
        const rank = hi.indexOf(entry);
        snd(() => [392, 330, 262, 196].forEach((f, i) => api.tone(f, 0.22, { type: 'triangle', vol: 0.07, at: i * 0.2 })));
        showOv('over', 'Game Over', `${why}\n\nFinal score: ${st.score}\nYou reached level ${st.level}.` + (rank >= 0 ? `\nNew high score! You are number ${rank + 1}.` : ''), [['Play again', newGame], ['Main menu', showTitle]]);
      }

      W.onKey = e => {
        const k = e.key;
        if (!st) { if (k === 'Enter' || k === ' ') { e.preventDefault(); newGame(); } return; }
        if (ov) {
          if (k === ' ' || k === 'Enter') { e.preventDefault(); closeOv(0); }
          else if ((k === 'p' || k === 'P') && ov.kind === 'pause') closeOv(0, true);
          return;
        }
        const m = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1], a: [-1, 0], d: [1, 0], w: [0, -1], s: [0, 1], A: [-1, 0], D: [1, 0], W: [0, -1], S: [0, 1] }[k];
        if (m) { e.preventDefault(); move(...m); }
        else if (k === ' ' || k === 'Enter') { e.preventDefault(); munch(); }
        else if (k === 'p' || k === 'P') togglePause();
      };
      W.onMin = () => { if (st && !st.over && !ov) togglePause(); };
      W.onResize = fit;
      W.onClose = () => stopGame();
      showTitle();
    }
  });

  /* ================= TYPE RIDER ================= */
  const WORDS = ('a as ad add adds dad dads sad fad fads lad lads all fall falls flask salad alas ask asks lass ' +
    'glad gas had has half dash flash shall hash flag flags lag sag hall halls gash ' +
    'see sea seed feed deed fee jade side hide slide said sail lake like kid kids hike life file fish dish is his if did desk fell fill hill shelf field ideal jeep fake leaf safe skill sell self she he aside glide slide ' +
    'the red tree try fry yes yet you your true sure use user rude rust fruit juice tired tiger trail truck rule duty hurry sturdy style day dry her their three street tray art dirt first fast just rest test trees seat eat treat great tasty sky key keys fly shy stay yard year hat heat gate late state skate kite rider ride right light sight tight life jury ' +
    'we who what with was wow owl old go got good food pool top top stop shop hop pop word world work people pie power quiet quick quiz queen equal square quilt of for from so to too two open paper pepper apple swap wipe slow snow ' +
    'can come cub cube cave move many man men name vine van via mom box? ' +
    'bus but back bag ball big blue brown bike book boat cake camp cap car cat city clock cloud come cool cup cut dance dog down drum duck even ever every farm fine frog fun game give green grow hand happy help home hop horse house jump king kitten lamp learn lemon letter long lunch magic map milk moon music nice night nine number ocean orange park party piano pink plan plant play pony race rain river robot rock room run seven shape ship shoe sing smile snack soup space spin star story summer sun swim table team time today town toy train turn under up visit wagon walk warm water wave win window winter wish wonder yellow zebra zoo zip zero six fox wax box next extra mix exit fizz lazy puzzle maze prize dozen ' +
    "it's don't can't let's we're you're I'm that's").split(' ').filter(w => w && !w.includes('?'));
  const SENTS = ['The quick brown fox jumps over the lazy dog.', 'Sphinx of black quartz, judge my vow.', 'How vexingly quick daft zebras jump!', 'The five boxing wizards jump quickly.', 'Jackdaws love my big sphinx of quartz.', 'We packed 12 boxes of books and 3 bags of toys.', 'Can you type 25 words a minute? Keep trying!', 'My friend Zoe has 2 cats, 4 fish and 1 very quiet dog.', 'Practice every day, and your fingers will fly.', 'On June 9, our class visited the science museum.'];
  const PASSAGES = [
    'The little red car raced down the open road. It zoomed past fields of corn and a sleepy herd of cows. The driver held the wheel tight and smiled, because the finish line was just ahead.',
    'Every morning the baker wakes up early to make fresh bread. She mixes flour, water and yeast, then waits for the dough to rise. Soon the whole street smells warm and wonderful.',
    'Our town has a big park with a pond in the middle. Ducks swim in circles while kids feed them crumbs. On sunny days people fly kites high above the tall green trees.',
    'The rocket stood on the launch pad, ready to go. Ten, nine, eight, the countdown began. With a mighty roar it climbed into the sky and left a long white trail behind it.',
    'A good typist keeps both hands on the home row and looks at the screen, not the keys. Each finger has its own job. With practice, the words start to flow like water.',
    'The library is one of the best places in town. You can borrow books about dinosaurs, planets, pirates or puppies. All you need is a library card and a little curiosity.',
    'Snow fell all night, and by morning the yard was white. We built a snowman with a carrot nose and two buttons for eyes. Then we went inside for hot cocoa by the fire.'
  ];
  const LESSONS = [
    { name: 'Home Row: Left Hand', nw: 'asdf', tip: 'Rest your left fingers on A S D F. Feel the little bump on F? That is your home base.' },
    { name: 'Home Row: Right Hand', nw: 'jkl;', tip: 'Rest your right fingers on J K L ;. J has a bump too. Thumbs float over the space bar.' },
    { name: 'Reach for G and H', nw: 'gh', tip: 'Stretch your index fingers toward the middle, then hop back home.' },
    { name: 'Top Row: E and I', nw: 'ei', tip: 'Your middle fingers reach up for E and I.' },
    { name: 'Top Row: R T Y U', nw: 'rtyu', tip: 'Index fingers reach up and in. Return to F and J after every key.' },
    { name: 'Top Row: Q W O P', nw: 'qwop', tip: 'Pinkies and ring fingers reach up. Keep your wrists relaxed.' },
    { name: 'Bottom Row: C V B N M', nw: 'cvbnm', tip: 'Curl your fingers down for the bottom row.' },
    { name: 'X, Z, Comma and Period', nw: 'xz,.', tip: 'Ring and pinky fingers curl down for X, Z and the period.' },
    { name: 'Capital Letters', nw: '', caps: 1, tip: 'Hold Shift with the pinky of the OTHER hand, then press the letter.' },
    { name: 'Punctuation', nw: "'?!", punct: 1, tip: 'Question and exclamation marks need Shift. The apostrophe is next to ;.' },
    { name: 'Numbers 1 to 5', nw: '12345', nums: 1, tip: 'Reach up two rows. Keep one finger anchored on the home row.' },
    { name: 'Numbers 6 to 0', nw: '67890', nums: 1, tip: 'The right hand takes 6 through 0.' },
    { name: 'The Whole Keyboard', nw: '', full: 1, tip: 'Put it all together. Slow and steady wins the race!' }
  ];
  (function () { let set = ''; LESSONS.forEach(L => { set += L.nw; L.set = set; }); })();
  const KB = ['1234567890-=', 'qwertyuiop[]', "asdfghjkl;'", 'zxcvbnm,./'];
  const SHIFTED = { '!': '1', '@': '2', '#': '3', '$': '4', '%': '5', '^': '6', '&': '7', '*': '8', '(': '9', ')': '0', '_': '-', '+': '=', '{': '[', '}': ']', ':': ';', '"': "'", '<': ',', '>': '.', '?': '/' };
  const UNSHIFT = {}; Object.entries(SHIFTED).forEach(([s, k]) => { UNSHIFT[k] = s; });
  const FING = {};
  ['qaz1', 'wsx2', 'edc3', 'rfvtgb45', 'yhnujm67', 'ik,8', 'ol.9', "p;/0-=[]'", ' '].forEach((s, f) => [...s].forEach(k => { FING[k] = f; }));
  const FNAME = ['left pinky', 'left ring finger', 'left middle finger', 'left index finger', 'right index finger', 'right middle finger', 'right ring finger', 'right pinky', 'thumb'];
  const keyFor = ch => ch === ' ' ? { k: ' ', sh: false } : /[A-Z]/.test(ch) ? { k: ch.toLowerCase(), sh: true } : SHIFTED[ch] ? { k: SHIFTED[ch], sh: true } : { k: ch, sh: false };
  const DIFFS = [{ id: 'easy', label: 'Easy', wpm: 15 }, { id: 'medium', label: 'Medium', wpm: 25 }, { id: 'hard', label: 'Hard', wpm: 35 }, { id: 'expert', label: 'Expert', wpm: 50 }];
  const CERTS = [
    { id: 'home', name: 'Home Row Hero', text: 'for mastering the home row keys', test: p => [0, 1, 2].every(i => p.l[i] && p.l[i].passed) },
    { id: 'letters', name: 'Letter Keys Master', text: 'for learning every letter on the keyboard', test: p => [0, 1, 2, 3, 4, 5, 6, 7].every(i => p.l[i] && p.l[i].passed) },
    { id: 'speed', name: 'Speedy Fingers', text: 'for passing a lesson at 25 words per minute or faster', test: p => Object.values(p.l).some(x => x.passed && x.pw >= 25) },
    { id: 'all', name: 'Keyboard Graduate', text: 'for completing every Type Rider lesson', test: p => LESSONS.every((_, i) => p.l[i] && p.l[i].passed) },
    { id: 'race', name: 'Road Race Champion', text: 'for winning a Road Race on Hard or Expert', test: p => (p.r.hard || 0) + (p.r.expert || 0) > 0 }
  ];
  const CAR = ['..kkk.....kkk...', '.rrrrrrrrrrrrr..', 'rRRwwRRRRRbbbRr.', 'rRRwwRRRRRbbbRRy', 'rRRwwRRRRRbbbRRy', 'rRRwwRRRRRbbbRr.', '.rrrrrrrrrrrrr..', '..kkk.....kkk...'];
  const carSvg = (c, d) => `<svg viewBox="0 0 16 8" shape-rendering="crispEdges" aria-hidden="true">${pix(CAR, { k: '#111', r: d, R: c, w: '#9cf', b: '#bdf', y: '#ff0' })}</svg>`;
  const SEAL = '<svg viewBox="0 0 60 60" aria-hidden="true"><g fill="#c8a020" stroke="#8a6a10">' + Array.from({ length: 16 }, (_, i) => `<polygon points="30,2 34,14 26,14" transform="rotate(${i * 22.5} 30 30)"/>`).join('') + '<circle cx="30" cy="30" r="20"/></g><circle cx="30" cy="30" r="15" fill="none" stroke="#fff4c0" stroke-width="1.5"/><text x="30" y="35" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="14" fill="#5a3a00">TR</text><path d="M20 48l-6 12 7-3 4 6 4-13zM40 48l6 12-7-3-4 6-4-13z" fill="#b01818"/></svg>';

  function lessonText(L) {
    if (L.full) return shuffle(SENTS.slice()).slice(0, 3).join(' ');
    const set = new Set((L.set + (L.punct || L.nums ? "'?!" : '')).split(''));
    const caps = L.caps || L.punct || L.nums;
    const okW = w => [...w].every(c => set.has(c.toLowerCase())) && (caps || w === w.toLowerCase());
    const words = WORDS.filter(okW);
    const fav = L.nw ? words.filter(w => [...L.nw].some(c => w.toLowerCase().includes(c))) : [];
    const out = [];
    const target = 130;
    const len = () => out.join(' ').length;
    if (!L.caps && !L.punct && !L.nums) {
      const src = [...L.nw.replace(/[,.]/g, '') || 'fj'];
      const anchors = src.length < 3 ? src.concat(['f', 'j']) : src;
      src.forEach(k => out.push(k + k + k));
      for (let i = 0; i < 4; i++) { let g = ''; const n = R(2, 4); for (let j = 0; j < n; j++) g += pickA(anchors); out.push(g); }
      if (L.nw.includes(',')) out.push('a, b, c.'.replace(/[bc]/g, m => set.has(m) ? m : 'a'));
    }
    let sentence = 0;
    while (len() < target) {
      let w = (fav.length && Math.random() < 0.55) ? pickA(fav) : words.length > 3 ? pickA(words) : pickA([...L.set.replace(/[;,.]/g, '')]).repeat(R(2, 3));
      if (L.nums && Math.random() < 0.4) { out.push(Array.from({ length: R(1, 3) }, () => pickA([...L.nw])).join('')); }
      if (L.caps && Math.random() < 0.5) w = w[0].toUpperCase() + w.slice(1);
      if (L.punct || L.nums) {
        if (sentence === 0) w = w[0].toUpperCase() + w.slice(1);
        sentence++;
        if (sentence >= R(3, 6)) { w += pickA(['.', '.', '?', '!', ',']); if (!w.endsWith(',')) sentence = 0; }
      }
      out.push(w);
    }
    let s = out.join(' ').trim();
    if (L.punct && !/[.?!]$/.test(s)) s += pickA(['.', '!', '?']);
    return s;
  }

  (window.RETRO_APPS = window.RETRO_APPS || []).push({
    id: 'typerider',
    label: 'Type Rider',
    kind: 'store', cat: 'game', year: 1990, price: 19.95,
    publisher: 'Keyline Educational Software',
    genre: 'Educational / Typing',
    tagline: 'Learn to type. Then race to win!',
    blurb: 'Thirteen friendly lessons take you from the home row to capitals, punctuation and numbers. A color-coded on-screen keyboard shows exactly which finger to use, while live speed and accuracy meters track your progress. Then take the wheel in the Road Race, where every correct keystroke pushes your car toward the finish line. Earn printable certificates as you go!',
    sizeKB: 700,
    box: { bg: '#b01818', fg: '#ffffff', accent: '#ffd000' },
    icon: `<svg viewBox="0 0 32 32" shape-rendering="crispEdges" aria-hidden="true"><rect x="1" y="14" width="30" height="16" fill="#c0c0c0" stroke="#000"/><g fill="#fff" stroke="#555" stroke-width=".5">${[0, 1, 2, 3, 4, 5].map(i => `<rect x="${3 + i * 4.5}" y="16" width="3.5" height="3"/><rect x="${4.5 + i * 4.3}" y="20.5" width="3.3" height="3"/>`).join('')}<rect x="8" y="25" width="16" height="3"/></g><g transform="translate(4 3) scale(1.5)">${pix(CAR, { k: '#111', r: '#800', R: '#e22', w: '#9cf', b: '#bdf', y: '#ff0' })}</g></svg>`,
    window: { w: 620, h: 560 },
    css: `
      .tyr{height:100%;display:flex;flex-direction:column;background:#008080;color:#000;user-select:none;-webkit-user-select:none}
      .tyr-scr{flex:1;min-height:0;overflow:auto;padding:8px;display:flex;flex-direction:column;gap:6px}
      .tyr-panel{background:#c0c0c0;padding:6px 8px}
      .tyr-logo{display:flex;align-items:center;gap:10px;background:#000080;color:#fff;padding:6px 10px}
      .tyr-logo b{font:400 34px/1 var(--dos);color:#ffd000;text-shadow:2px 2px #b01818;letter-spacing:1px}
      .tyr-logo span{font-size:12px;display:block}
      .tyr-logo svg{width:64px;height:32px;flex:none}
      .tyr-cols{display:flex;flex-wrap:wrap;gap:6px;align-items:flex-start}
      .tyr-cols>*{flex:1 1 260px;min-width:0}
      .tyr-h{font-weight:700;margin:0 0 4px}
      .tyr-ls{display:flex;flex-direction:column;gap:2px;background:#fff;padding:2px}
      .tyr-ls button{display:flex;gap:6px;align-items:center;text-align:left;background:#fff;border:0;padding:3px 4px;cursor:pointer;font:inherit;color:#000}
      .tyr-ls button:hover,.tyr-ls button:focus-visible{background:#000080;color:#fff;outline:0}
      .tyr-ls .n{width:20px;text-align:right;flex:none}
      .tyr-ls .t{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .tyr-ls .s{flex:none;font-size:11px;text-align:right;white-space:nowrap}
      .tyr-ls .ok{color:#008000;font-weight:700}
      .tyr-ls button:hover .ok{color:#8f8}
      .tyr-btns{display:flex;flex-wrap:wrap;gap:4px}
      .tyr-btns .btn{min-width:0;padding:4px 10px}
      .tyr-small{font-size:11px;color:#333;margin:4px 0 0}
      .tyr-tv{flex:1;min-height:0;display:flex;flex-direction:column;gap:5px;padding:6px;overflow:auto}
      .tyr-hd{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;background:#000080;color:#fff;padding:3px 8px;font-weight:700}
      .tyr-hd span{font-weight:400;color:#ffd000}
      .tyr-stats{display:flex;gap:6px}
      .tyr-stats>div{flex:1;background:#000;color:#0f0;font:20px/1 var(--dos);padding:3px 6px;display:flex;justify-content:space-between;gap:4px;white-space:nowrap}
      .tyr-stats>div span{color:#0a0}
      .tyr-txt{background:#fff;padding:6px 8px;font:24px/1.25 var(--dos);white-space:pre-wrap;word-break:break-word;min-height:70px;max-height:40%;overflow:auto;color:#808080}
      .tyr-txt span.d{color:#000}
      .tyr-txt span.e{background:#ffb0b0;color:#a00000}
      .tyr-txt span.c{background:#000080;color:#fff;animation:tyr-cur 1s steps(2) infinite}
      @keyframes tyr-cur{50%{background:#4060ff}}
      .tyr-txt.shake{animation:tyr-shake .15s}
      @keyframes tyr-shake{33%{transform:translateX(-3px)}66%{transform:translateX(3px)}}
      .tyr-in{font:16px var(--ui);padding:6px;width:100%;box-sizing:border-box;border:2px solid;border-color:#808080 #fff #fff #808080;background:#ffffe0}
      .tyr-hint{background:#ffffc0;border:1px solid #808000;padding:3px 8px;font-size:12px;min-height:18px}
      .tyr-hint b{font-size:14px}
      .tyr-kbw{display:flex;flex-direction:column;align-items:center;gap:4px}
      .tyr-kb{width:100%;max-width:560px;display:flex;flex-direction:column;gap:3px;background:#a8a8a8;padding:4px;border:2px solid;border-color:#fff #555 #555 #fff}
      .tyr-kr{display:flex;gap:3px}
      .tyr-k,.tyr-sp{flex:1 1 0;min-width:0}
      .tyr-k{height:24px;border:1px solid #444;border-bottom-width:3px;border-radius:2px;display:flex;flex-direction:column;align-items:center;justify-content:center;font:700 11px/1 var(--ui);color:#222;position:relative;overflow:hidden}
      .tyr-k small{font-size:8px;font-weight:400;line-height:1;color:#555}
      .tyr-k.bump::after{content:"";position:absolute;bottom:2px;width:6px;height:1px;background:#000}
      .tyr-f0,.tyr-f7{background:#f8c4c4}.tyr-f1,.tyr-f6{background:#f8e8a0}.tyr-f2,.tyr-f5{background:#c4ecc4}.tyr-f3,.tyr-f4{background:#c4d4f8}.tyr-f8{background:#e0e0e0}
      .tyr-k.on{background:#000080;color:#fff;border-color:#000;transform:translateY(1px)}
      .tyr-k.on small{color:#ccc}
      .tyr-k.bad{background:#e00000;color:#fff}
      .tyr-hands{width:200px;height:52px}
      .tyr-hands rect{opacity:.55;stroke:#555;stroke-width:1}
      .tyr-hands rect.on{opacity:1;stroke:#d00000;stroke-width:3}
      .tyr-bar{display:flex;gap:6px;justify-content:flex-end;flex-wrap:wrap}
      .tyr-bar .btn{min-width:0}
      .tyr-road{position:relative;height:80px;flex:none;background:#3a3a3a;border-top:8px solid #2a8a2a;border-bottom:8px solid #2a8a2a;overflow:hidden}
      .tyr-road::before{content:"";position:absolute;left:0;right:0;top:50%;height:2px;margin-top:-1px;background:repeating-linear-gradient(90deg,#ffd000 0 14px,transparent 14px 28px)}
      .tyr-fin{position:absolute;right:10px;top:0;bottom:0;width:12px;background:repeating-conic-gradient(#000 0 25%,#fff 0 50%) 0 0/12px 12px}
      .tyr-car{position:absolute;width:56px;height:28px;transition:left .15s linear}
      .tyr-car svg{width:100%;height:100%}
      .tyr-car.you{top:6px}.tyr-car.cpu{top:46px}
      .tyr-tag{position:absolute;right:28px;font:14px/1 var(--dos);color:#fff;text-shadow:1px 1px #000;z-index:1}
      .tyr-cd{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:56px/1 var(--dos);color:#ffd000;text-shadow:3px 3px #000;pointer-events:none}
      .tyr-res{background:#c0c0c0;padding:10px 14px;display:flex;flex-direction:column;gap:8px;max-width:440px;margin:auto;width:100%;box-sizing:border-box;text-align:center}
      .tyr-res h3{margin:0;font:400 30px/1 var(--dos);color:#000080}
      .tyr-big{display:flex;justify-content:center;gap:10px}
      .tyr-big div{background:#000;color:#0f0;font:28px/1 var(--dos);padding:6px 10px;min-width:110px}
      .tyr-big small{display:block;font-size:16px;color:#0a0}
      .tyr-res p{margin:0}
      .tyr-res .tyr-bar{justify-content:center}
      .tyr-cw{flex:1;min-height:0;overflow:auto;padding:10px;display:flex;flex-direction:column;align-items:center;gap:8px;background:#505050}
      .tyr-paper{position:relative;background:#fdfbf2;width:100%;max-width:520px;padding:10px 30px;box-sizing:border-box;box-shadow:3px 3px 0 #222;background-image:repeating-linear-gradient(0deg,transparent 0 22px,#eef4ea 22px 24px)}
      .tyr-holes{position:absolute;top:0;bottom:0;width:18px;background:radial-gradient(circle at 9px 10px,#505050 4px,transparent 4.5px) 0 0/18px 20px}
      .tyr-holes.l{left:2px;border-right:1px dashed #bbb}.tyr-holes.r{right:2px;border-left:1px dashed #bbb}
      .tyr-cert{border:6px double #8a6a10;outline:2px solid #c8a020;outline-offset:-12px;padding:18px 14px;text-align:center;font:14px/1.4 Georgia,"Times New Roman",serif;color:#3a2a00;background:#fffdf4}
      .tyr-ct{font:700 clamp(18px,5vw,28px)/1.1 Georgia,"Times New Roman",serif;color:#8a1010;letter-spacing:1px;text-transform:uppercase}
      .tyr-cs{font-style:italic;margin-bottom:8px}
      .tyr-cn{font:italic 700 clamp(22px,6vw,32px)/1.2 "Brush Script MT","Lucida Handwriting",cursive;color:#000080;border-bottom:1px solid #8a6a10;display:inline-block;padding:0 16px;margin:4px 0;max-width:100%;overflow:hidden;text-overflow:ellipsis}
      .tyr-cb{font:700 clamp(16px,4.5vw,22px)/1.2 Georgia,serif;margin:4px 0}
      .tyr-cf{display:flex;justify-content:space-between;align-items:flex-end;margin-top:12px;font-size:12px;gap:6px}
      .tyr-cf>div{flex:1}
      .tyr-cf svg{width:60px;height:60px;flex:none}
      .tyr-sig{font:italic 18px "Brush Script MT","Lucida Handwriting",cursive;border-bottom:1px solid #3a2a00}
    `,
    open(W, api) {
      const blank = { l: {}, r: {}, c: {} };
      let prog = Object.assign({}, blank, api.load('prog', blank));
      let opts = Object.assign({ kb: true, clicks: true }, api.load('opts', {}));
      const coarse = window.matchMedia && matchMedia('(pointer:coarse)').matches;
      let ses = null, timer = null, timers = [], view = 'menu', resKeys = null;
      const later = (fn, ms) => { const id = setTimeout(fn, ms); timers.push(id); return id; };
      const stopAll = () => { clearInterval(timer); timer = null; timers.forEach(clearTimeout); timers = []; ses = null; };
      const saveProg = () => api.save('prog', prog);
      W.body.innerHTML = '<div class="tyr"></div>';
      const root = W.body.firstChild;
      const E = api.esc;

      api.menubar([
        { label: 'Game', items: [
          { label: 'Lesson menu', fn: showMenu },
          { label: 'Road Race...', fn: () => { showMenu(); api.msgBox('Road Race', 'Pick a difficulty under Road Race on the main screen. Your rival drives at a steady speed: Easy 15, Medium 25, Hard 35 or Expert 50 words per minute.'); } },
          { label: 'My certificates', fn: showMenu },
          '-', { label: 'Exit', fn: () => api.close() }
        ] },
        { label: 'Options', items: () => [
          { label: (opts.kb ? '[x] ' : '[ ] ') + 'Show keyboard guide', fn: () => { opts.kb = !opts.kb; api.save('opts', opts); const k = root.querySelector('.tyr-kbw'); if (k) k.hidden = !opts.kb; } },
          { label: (opts.clicks ? '[x] ' : '[ ] ') + 'Key click sounds', fn: () => { opts.clicks = !opts.clicks; api.save('opts', opts); } },
          '-',
          { label: 'Reset my progress', fn: () => api.msgBox('Type Rider', 'Erase all lesson progress, race wins and certificates?', ['Yes', 'No'], 'warn').then(b => { if (b === 'Yes') { prog = { l: {}, r: {}, c: {} }; saveProg(); showMenu(); } }) }
        ] },
        { label: 'Help', items: [
          { label: 'How to play', fn: () => api.msgBox('How to play', 'Pick a lesson and type the text you see. The next key glows on the keyboard, and the colors show which finger to use.\n\nIf you press a wrong key it turns red. Just press the right one to keep going.\n\nFinish a lesson with 90% accuracy or better to pass it and earn $2 (first time only).\n\nIn the Road Race, every correct key moves your car forward. Beat the computer car to win $3.' + (coarse ? '\n\nOn a phone or tablet, tap the yellow box to bring up the keyboard.' : '')) },
          { label: 'About Type Rider', fn: () => api.msgBox('About Type Rider', 'Type Rider 1.0\nKeyline Educational Software, 1990\n\nTeaching fingers to fly since 1990.') }
        ] }
      ]);

      /* ---- menu ---- */
      function showMenu() {
        stopAll(); view = 'menu';
        const lp = i => prog.l[i] || {};
        const first = LESSONS.findIndex((_, i) => !lp(i).passed);
        root.innerHTML = `<div class="tyr-scr">
          <div class="tyr-logo raised">${carSvg('#e22', '#800')}<div><b>TYPE RIDER</b><span>Typing school and Road Race. Welcome, ${E(api.user)}!</span></div></div>
          <div class="tyr-cols">
            <div class="tyr-panel raised"><p class="tyr-h">Lessons</p><div class="tyr-ls sunken">${LESSONS.map((L, i) => `<button data-l="${i}"><span class="n">${i + 1}.</span><span class="t">${E(L.name)}</span><span class="s">${lp(i).passed ? `<span class="ok">PASSED</span> ${lp(i).best || 0} wpm` : lp(i).tries ? `best ${lp(i).acc || 0}%` : i === first ? 'start here' : ''}</span></button>`).join('')}</div></div>
            <div>
              <div class="tyr-panel raised"><p class="tyr-h">Road Race</p><div class="tyr-btns">${DIFFS.map(d => `<button class="btn" data-r="${d.id}">${d.label} (${d.wpm})</button>`).join('')}</div><p class="tyr-small">Beat the computer car to the finish line. Wins: ${DIFFS.map(d => `${d.label} ${prog.r[d.id] || 0}`).join(', ')}.</p></div>
              <div class="tyr-panel raised" style="margin-top:6px"><p class="tyr-h">Certificates</p><div class="tyr-btns">${CERTS.map(c => `<button class="btn" data-c="${c.id}"${prog.c[c.id] ? '' : ' disabled'}>${E(c.name)}</button>`).join('')}</div><p class="tyr-small">Earn certificates by passing lessons and winning races.</p></div>
            </div>
          </div></div>`;
        root.querySelectorAll('[data-l]').forEach(b => b.onclick = () => startLesson(+b.dataset.l));
        root.querySelectorAll('[data-r]').forEach(b => b.onclick = () => startRace(b.dataset.r));
        root.querySelectorAll('[data-c]').forEach(b => b.onclick = () => showCert(b.dataset.c, showMenu));
      }

      /* ---- typing view ---- */
      function kbHtml() {
        const key = (k, extra = '') => `<div class="tyr-k tyr-f${FING[k]}${k === 'f' || k === 'j' ? ' bump' : ''}" data-k="${k === "'" ? 'q1' : k === '"' ? 'q2' : k}"${extra}>${UNSHIFT[k] ? `<small>${E(UNSHIFT[k])}</small>` : ''}${E(k.toUpperCase())}</div>`;
        const sp = f => `<div class="tyr-sp" style="flex:${f} 1 0"></div>`;
        return `<div class="tyr-kb" aria-hidden="true">
          <div class="tyr-kr">${[...KB[0]].map(k => key(k)).join('')}${sp(1)}</div>
          <div class="tyr-kr">${sp(0.5)}${[...KB[1]].map(k => key(k)).join('')}${sp(0.5)}</div>
          <div class="tyr-kr">${sp(0.75)}${[...KB[2]].map(k => key(k)).join('')}${sp(1.25)}</div>
          <div class="tyr-kr"><div class="tyr-k tyr-f0" data-k="ls" style="flex:1.75 1 0">Shift</div>${[...KB[3]].map(k => key(k)).join('')}<div class="tyr-k tyr-f7" data-k="rs" style="flex:1.25 1 0">Shift</div></div>
          <div class="tyr-kr">${sp(3)}<div class="tyr-k tyr-f8" data-k="sp" style="flex:7 1 0">space</div>${sp(3)}</div></div>`;
      }
      const kid = k => k === "'" ? 'q1' : k === ' ' ? 'sp' : k;
      function handsSvg() {
        // left hand: pinky, ring, middle, index, thumb; right hand mirrored
        const L = [[6, 16, 12, 0], [22, 8, 12, 1], [38, 4, 12, 2], [54, 10, 12, 3]], cols = ['#f8c4c4', '#f8e8a0', '#c4ecc4', '#c4d4f8'];
        let s = '';
        L.forEach(([x, y, w, f]) => { s += `<rect x="${x}" y="${y}" width="${w}" height="${34 - y}" rx="5" fill="${cols[f]}" data-f="${f}"/>`; s += `<rect x="${200 - x - w}" y="${y}" width="${w}" height="${34 - y}" rx="5" fill="${cols[f]}" data-f="${7 - f}"/>`; });
        s += '<rect x="6" y="30" width="62" height="20" rx="4" fill="#f0d8c0" data-f="p"/><rect x="132" y="30" width="62" height="20" rx="4" fill="#f0d8c0" data-f="p"/>';
        s += '<rect x="66" y="32" width="22" height="10" rx="5" fill="#e0e0e0" data-f="8"/><rect x="112" y="32" width="22" height="10" rx="5" fill="#e0e0e0" data-f="8"/>';
        return `<svg class="tyr-hands" viewBox="0 0 200 52" aria-hidden="true">${s}</svg>`;
      }
      function typingView(title, sub, race) {
        root.innerHTML = `<div class="tyr-tv">
          <div class="tyr-hd">${E(title)}<span>${E(sub)}</span></div>
          ${race ? `<div class="tyr-road"><span class="tyr-tag" style="top:2px">YOU</span><span class="tyr-tag" style="top:42px">RIVAL</span><div class="tyr-fin"></div><div class="tyr-car you">${carSvg('#e22', '#800')}</div><div class="tyr-car cpu">${carSvg('#26f', '#028')}</div><div class="tyr-cd"></div></div>` : ''}
          <div class="tyr-stats"><div><span>WPM</span><b data-s="wpm">--</b></div><div><span>ACC</span><b data-s="acc">100%</b></div><div><span>DONE</span><b data-s="pct">0%</b></div></div>
          <div class="tyr-txt sunken" aria-live="off"></div>
          ${coarse ? '<input class="tyr-in" type="text" placeholder="Tap here to bring up the keyboard" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="done">' : ''}
          <div class="tyr-hint"></div>
          <div class="tyr-kbw"${opts.kb ? '' : ' hidden'}>${kbHtml()}${race ? '' : handsSvg()}</div>
          <div class="tyr-bar"><button class="btn" data-a="again">Start over</button><button class="btn" data-a="menu">Menu</button></div>
        </div>`;
        root.querySelector('[data-a=menu]').onclick = showMenu;
        const inp = root.querySelector('.tyr-in');
        if (inp) {
          inp.addEventListener('input', () => { const v = inp.value; inp.value = ''; for (const ch of v) typeChar(ch); });
          inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); inp.blur(); } });
        }
        root.querySelector('.tyr-txt').addEventListener('pointerdown', () => { if (inp) inp.focus(); });
      }
      function startSession(text, extra) {
        const tx = root.querySelector('.tyr-txt');
        tx.innerHTML = [...text].map(c => `<span>${E(c)}</span>`).join('');
        ses = Object.assign({ text, pos: 0, ok: 0, bad: 0, errAt: new Set(), t0: 0, hold: false, spans: [...tx.children], tx, keys: {}, hands: [...root.querySelectorAll('.tyr-hands rect')] }, extra);
        root.querySelectorAll('.tyr-k[data-k]').forEach(k => { ses.keys[k.dataset.k] = k; });
        ses.stat = { wpm: root.querySelector('[data-s=wpm]'), acc: root.querySelector('[data-s=acc]'), pct: root.querySelector('[data-s=pct]') };
        ses.hint = root.querySelector('.tyr-hint');
        showCur();
        clearInterval(timer); timer = setInterval(liveTick, 200);
      }
      function showCur() {
        const s = ses; if (!s) return;
        s.spans.forEach(x => x.classList.remove('c'));
        Object.values(s.keys).forEach(k => k.classList.remove('on'));
        s.hands.forEach(h => h.classList.remove('on'));
        const ch = s.text[s.pos];
        if (ch === undefined) { s.hint.textContent = ''; return; }
        const sp = s.spans[s.pos]; sp.classList.add('c');
        const top = sp.offsetTop - s.tx.offsetTop;
        if (top < s.tx.scrollTop || top > s.tx.scrollTop + s.tx.clientHeight - 30) s.tx.scrollTop = Math.max(0, top - 30);
        const { k, sh } = keyFor(ch), f = FING[k];
        const kEl = s.keys[kid(k)]; if (kEl) kEl.classList.add('on');
        let shTxt = '';
        if (sh) { const left = f <= 3; const shEl = s.keys[left ? 'rs' : 'ls']; if (shEl) shEl.classList.add('on'); shTxt = ` + Shift (${left ? 'right' : 'left'} pinky)`; s.hands.forEach(h => { if (h.dataset.f === (left ? '7' : '0')) h.classList.add('on'); }); }
        s.hands.forEach(h => { if (h.dataset.f === String(f)) h.classList.add('on'); });
        const label = ch === ' ' ? 'SPACE' : ch;
        s.hint.innerHTML = (s.tip ? E(s.tip) + ' ' : '') + `Next key: <b>${E(label)}</b>${E(shTxt)}. Use your ${f === undefined ? 'nearest finger' : FNAME[f]}.`;
      }
      const elapsed = () => ses && ses.t0 ? (performance.now() - ses.t0) / 60000 : 0;
      const wpmNow = () => { const m = elapsed(); return m > 0 ? Math.round(ses.ok / 5 / m) : 0; };
      const accNow = () => ses.ok + ses.bad ? Math.round(100 * ses.ok / (ses.ok + ses.bad)) : 100;
      function liveTick() {
        if (!ses) return;
        ses.stat.wpm.textContent = ses.t0 && elapsed() > 0.03 ? wpmNow() : '--';
        ses.stat.acc.textContent = accNow() + '%';
        ses.stat.pct.textContent = Math.round(100 * ses.pos / ses.text.length) + '%';
        if (ses.race) raceTick();
      }
      function typeChar(ch) {
        const s = ses; if (!s || s.hold || s.done) return;
        if (ch === '’' || ch === '‘') ch = "'";
        if (ch === '\n' || ch === '\r') return;
        if (!s.t0) s.t0 = performance.now();
        const want = s.text[s.pos];
        if (ch === want) {
          s.spans[s.pos].classList.add('d'); s.ok++; s.pos++;
          if (opts.clicks) api.sfx.key();
        } else {
          s.bad++; s.errAt.add(s.pos); s.spans[s.pos].classList.add('e');
          const k = s.keys[kid(keyFor(ch).k)];
          if (k) { k.classList.add('bad'); later(() => k.classList.remove('bad'), 250); }
          s.tx.classList.remove('shake'); void s.tx.offsetWidth; s.tx.classList.add('shake');
          api.tone(130, 0.08, { vol: 0.05 });
        }
        showCur();
        if (s.race) moveCars();
        if (s.pos >= s.text.length) { liveTick(); finish(); }
      }
      function finish() {
        const s = ses; s.done = true; clearInterval(timer); timer = null;
        const wpm = wpmNow(), acc = accNow();
        const trouble = [...new Set([...s.errAt].map(i => s.text[i] === ' ' ? 'space' : s.text[i]))].slice(0, 8);
        if (s.race) return raceEnd(s.pos >= s.text.length, wpm, acc);
        const i = s.lesson, p = prog.l[i] || (prog.l[i] = { tries: 0 });
        const pass = acc >= 90, firstPass = pass && !p.passed;
        p.tries = (p.tries || 0) + 1; p.best = Math.max(p.best || 0, wpm); p.acc = Math.max(p.acc || 0, acc);
        if (pass) { p.passed = true; p.pw = Math.max(p.pw || 0, wpm); }
        const newCerts = checkCerts(wpm, acc);
        saveProg();
        if (firstPass) api.earn(2, 'passing a Type Rider lesson');
        if (pass) api.sfx.tada(); else api.tone(220, 0.3, { type: 'triangle', vol: 0.06 });
        const next = i + 1 < LESSONS.length;
        results(pass ? 'Lesson passed!' : 'Keep practicing!', wpm, acc,
          (pass ? (firstPass ? 'Great work! You passed and earned $2.' : 'You passed again. Nice and steady!') : `You need 90% accuracy to pass. You got ${acc}%. Slow down a little and aim for the right keys.`) +
          (trouble.length ? `\nKeys to practice: ${trouble.join(' ')}` : '\nNo mistakes at all. Perfect!'),
          [['Try again', () => startLesson(i)], ...(pass && next ? [['Next lesson', () => startLesson(i + 1)]] : []), ['Menu', showMenu]], newCerts, pass && next ? 1 : 0);
      }
      function results(title, wpm, acc, text, buttons, certs, primary = 0) {
        view = 'results';
        root.innerHTML = `<div class="tyr-scr"><div class="tyr-res raised"><h3>${E(title)}</h3>
          <div class="tyr-big"><div><small>SPEED</small>${wpm} WPM</div><div><small>ACCURACY</small>${acc}%</div></div>
          <p style="white-space:pre-line">${E(text)}</p>
          ${certs.length ? `<p><b>You earned a certificate: ${E(certs.map(c => c.name).join(', '))}!</b></p>` : ''}
          <div class="tyr-bar">${certs.length ? '<button class="btn" data-x="cert"><b>See certificate</b></button>' : ''}${buttons.map((b, i) => `<button class="btn" data-b="${i}">${i === primary && !certs.length ? `<b>${b[0]}</b>` : b[0]}</button>`).join('')}</div></div></div>`;
        const back = () => results(title, wpm, acc, text, buttons, [], primary);
        root.querySelectorAll('[data-b]').forEach(b => b.onclick = () => buttons[+b.dataset.b][1]());
        const cb = root.querySelector('[data-x=cert]');
        if (cb) cb.onclick = () => showCerts(certs.map(c => c.id), back);
        resKeys = () => cb ? cb.onclick() : buttons[primary][1]();
      }
      function checkCerts(wpm, acc) {
        const out = [];
        CERTS.forEach(c => { if (!prog.c[c.id] && c.test(prog)) { prog.c[c.id] = { d: Date.now(), wpm, acc, y: api.era.year }; out.push(c); } });
        return out;
      }
      function showCerts(ids, done) { if (!ids.length) return done(); showCert(ids[0], () => showCerts(ids.slice(1), done)); }
      function showCert(id, done) {
        stopAll(); view = 'cert';
        const c = CERTS.find(x => x.id === id), rec = prog.c[id] || { d: Date.now(), y: api.era.year };
        const dt = new Date(rec.d), date = `${dt.toLocaleString('en-US', { month: 'long' })} ${dt.getDate()}, ${rec.y || api.era.year}`;
        root.innerHTML = `<div class="tyr-cw"><div class="tyr-paper"><div class="tyr-holes l"></div><div class="tyr-holes r"></div><div class="tyr-cert">
          <div class="tyr-ct">Certificate of Achievement</div>
          <div class="tyr-cs">Type Rider Typing School</div>
          <div>This certifies that</div>
          <div class="tyr-cn">${E(api.user)}</div>
          <div>has earned the title of</div>
          <div class="tyr-cb">${E(c.name)}</div>
          <div>${E(c.text)}${rec.wpm ? `, typing ${rec.wpm} words per minute with ${rec.acc}% accuracy` : ''}.</div>
          <div class="tyr-cf"><div>${E(date)}<br><span style="border-top:1px solid #3a2a00">Date</span></div>${SEAL}<div><span class="tyr-sig">R. Rowe</span><br>Head Instructor</div></div>
        </div></div>
        <div class="tyr-bar"><button class="btn" data-a="print">Print</button><button class="btn" data-a="ok"><b>Continue</b></button></div></div>`;
        api.sfx.tada();
        root.querySelector('[data-a=ok]').onclick = done;
        root.querySelector('[data-a=print]').onclick = () => {
          for (let i = 0; i < 40; i++) api.noise(0.03, { at: i * 0.06, f: 2400 + (i % 3) * 400, q: 3, vol: 0.12, decay: 1 });
          api.tone(90, 0.3, { at: 2.5, vol: 0.05 });
          api.msgBox('Print', 'Printing certificate on LPT1...\nTear along the perforations and hang it on the fridge!');
        };
        resKeys = done;
      }

      /* ---- lessons ---- */
      function startLesson(i) {
        stopAll(); view = 'type';
        const L = LESSONS[i];
        typingView(`Lesson ${i + 1}: ${L.name}`, L.nw ? 'New keys: ' + [...L.nw].map(c => c.toUpperCase()).join(' ') : L.caps ? 'New key: Shift' : 'All keys');
        root.querySelector('[data-a=again]').onclick = () => startLesson(i);
        startSession(lessonText(L), { lesson: i, tip: L.tip });
      }

      /* ---- road race ---- */
      function startRace(id) {
        stopAll(); view = 'type';
        const D = DIFFS.find(d => d.id === id);
        typingView(`Road Race: ${D.label}`, `Rival speed: ${D.wpm} WPM`, true);
        root.querySelector('[data-a=again]').onclick = () => startRace(id);
        startSession(pickA(PASSAGES), { race: D, hold: true, cpu: 0, wob: 1 });
        const cd = root.querySelector('.tyr-cd'), s = ses;
        s.you = root.querySelector('.tyr-car.you'); s.cpuEl = root.querySelector('.tyr-car.cpu'); s.road = root.querySelector('.tyr-road');
        moveCars();
        [3, 2, 1].forEach((n, k) => later(() => { if (ses !== s) return; cd.textContent = n; api.tone(440, 0.15, { vol: 0.06 }); }, k * 800));
        later(() => {
          if (ses !== s) return;
          cd.textContent = 'GO!'; api.tone(880, 0.35, { vol: 0.07 });
          s.hold = false; s.t0 = performance.now(); s.tGo = s.t0;
          later(() => { cd.textContent = ''; }, 600);
          const inp = root.querySelector('.tyr-in'); if (inp) inp.focus();
        }, 2400);
      }
      function moveCars() {
        const s = ses; if (!s || !s.race) return;
        const span = Math.max(0, s.road.clientWidth - 56 - 26);
        s.you.style.left = (span * s.pos / s.text.length) + 'px';
        s.cpuEl.style.left = (span * Math.min(1, s.cpu / s.text.length)) + 'px';
      }
      function raceTick() {
        const s = ses; if (!s || s.hold || s.done) return;
        if (Math.random() < 0.1) s.wob = 0.85 + Math.random() * 0.3;
        s.cpu += s.race.wpm * 5 / 60 * 0.2 * s.wob;
        moveCars();
        if (Math.random() < 0.3) api.tone(70 + Math.random() * 10, 0.08, { type: 'sawtooth', vol: 0.015 });
        if (s.cpu >= s.text.length) { s.done = true; clearInterval(timer); timer = null; raceEnd(false, wpmNow(), accNow()); }
      }
      function raceEnd(won, wpm, acc) {
        const D = ses.race;
        let certs = [];
        if (won) {
          prog.r[D.id] = (prog.r[D.id] || 0) + 1;
          certs = checkCerts(wpm, acc); saveProg();
          api.earn(3, 'winning a Type Rider race');
          api.sfx.tada();
        } else [330, 262, 196].forEach((f, i) => api.tone(f, 0.25, { type: 'triangle', vol: 0.06, at: i * 0.22 }));
        const nextD = DIFFS[DIFFS.indexOf(D) + 1];
        later(() => results(won ? 'You win the race!' : 'Your rival wins!', wpm, acc,
          won ? `You crossed the finish line first! You earned $3.${nextD ? `\nReady for ${nextD.label}?` : '\nYou beat the fastest rival on the road!'}` : `The ${D.label} rival drives at ${D.wpm} WPM. You typed ${wpm} WPM. Practice a lesson or two and try again!`,
          [['Race again', () => startRace(D.id)], ...(won && nextD ? [[`Try ${nextD.label}`, () => startRace(nextD.id)]] : []), ['Menu', showMenu]], certs, won && nextD ? 1 : 0), 700);
      }

      W.onKey = e => {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        if (e.target && e.target.classList && e.target.classList.contains('tyr-in')) return;
        if (view === 'type' && ses) {
          if (e.key.length === 1) { e.preventDefault(); typeChar(e.key); }
          else if (e.key === 'Backspace' || e.key === 'Tab') e.preventDefault();
        } else if ((view === 'results' || view === 'cert') && e.key === 'Enter' && resKeys) { e.preventDefault(); resKeys(); }
      };
      W.onMin = () => { /* typing lessons simply wait; the timer only counts typed text */ };
      W.onResize = () => { if (ses && ses.race) moveCars(); };
      W.onClose = stopAll;
      showMenu();
    }
  });
})();
