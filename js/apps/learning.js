/* Built-in learning programs for kids: Keyboard Critters (typing), Code Turtle (LOGO-style turtle graphics),
   Clock & Coins (telling time and counting money) and Spelling Bee.
   In 1985 each program draws itself as an 80-column (or, on narrow screens, 40-column) text-mode screen on a canvas,
   so box-drawing borders and block graphics stay on an exact character grid. Later years use DOM/SVG graphics. */
(function () {
  'use strict';

  /* ================= shared helpers ================= */
  const R = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pickA = a => a[Math.floor(Math.random() * a.length)];
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const coarse = () => !!(window.matchMedia && matchMedia('(pointer:coarse)').matches);
  const today = () => new Date().toDateString();
  // $1 per achievement, with this program's own daily cap (the engine has a global one too).
  function dailyEarn(api, cap, why) {
    let e = api.load('earn', { day: today(), n: 0 });
    if (e.day !== today()) e = { day: today(), n: 0 };
    if (e.n >= cap) return 0;
    e.n++; api.save('earn', e);
    return api.earn(1, why) || 0;
  }
  const starStr = n => '★'.repeat(n) + '☆'.repeat(3 - n);
  const starsFor = (good, total) => { const p = total ? good / total : 0; return p >= 0.95 ? 3 : p >= 0.7 ? 2 : 1; };
  // Escape key: go back one screen; at the program's main screen Esc exits (in 1985 the engine closes the window).
  // W.keepEsc is updated a tick later so the same Esc press that goes "home" doesn't also close the program.
  function escKeeper(W) { return home => setTimeout(() => { W.keepEsc = !home; }, 0); }

  /* ---------- Text mode screen (1985) ----------
     A cell buffer drawn on a canvas. Cells carry an attribute string (b bright, d dim, i inverse, k blink)
     and an optional tap key. Box-drawing and block characters are drawn as shapes so the grid is exact. */
  const BOXC = {
    '─': [0, 1, 0, 1], '│': [1, 0, 1, 0], '┌': [0, 1, 1, 0], '┐': [0, 0, 1, 1], '└': [1, 1, 0, 0], '┘': [1, 0, 0, 1],
    '├': [1, 1, 1, 0], '┤': [1, 0, 1, 1], '┬': [0, 1, 1, 1], '┴': [1, 1, 0, 1], '┼': [1, 1, 1, 1],
    '═': [0, 2, 0, 2], '║': [2, 0, 2, 0], '╔': [0, 2, 2, 0], '╗': [0, 0, 2, 2], '╚': [2, 2, 0, 0], '╝': [2, 0, 0, 2],
    '╠': [2, 2, 2, 0], '╣': [2, 0, 2, 2], '╦': [0, 2, 2, 2], '╩': [2, 2, 0, 2], '╬': [2, 2, 2, 2]
  };
  function TM(host) {
    const cv = document.createElement('canvas'); cv.className = 'lrn-tm'; host.appendChild(cv);
    const ctx = cv.getContext('2d');
    const S = { cols: 80, rows: 25, onTap: null, phase: true, canvas: cv };
    let cw = 8, chh = 16, dpr = 1, buf = [], hasBlink = false;
    let lastW = 0, lastH = 0;
    S.fit = () => {
      const Wd = host.clientWidth, Ht = host.clientHeight; if (!Wd || !Ht) return false;
      if (Wd === lastW && Ht === lastH && buf.length) { S.clear(); return true; }
      lastW = Wd; lastH = Ht;
      S.cols = Wd >= 600 ? 80 : 40;
      let a = Wd / S.cols, b = Ht / S.rows;
      if (b > a * 2.3) b = a * 2.3;
      if (b < a * 1.45) a = b / 1.45;
      cw = a; chh = b; dpr = window.devicePixelRatio || 1;
      cv.width = Math.round(S.cols * cw * dpr); cv.height = Math.round(S.rows * chh * dpr);
      cv.style.width = S.cols * cw + 'px'; cv.style.height = S.rows * chh + 'px';
      S.clear(); return true;
    };
    S.clear = () => { buf = []; for (let i = 0; i < S.rows * S.cols; i++) buf.push({ c: ' ', a: '', k: null }); };
    S.put = (x, y, str, a = '', k = null) => {
      str = String(str); if (y < 0 || y >= S.rows) return;
      for (let i = 0; i < str.length; i++) { const X = x + i; if (X < 0 || X >= S.cols) continue; const c = buf[y * S.cols + X]; c.c = str[i]; c.a = a; c.k = k; }
    };
    S.attr = (x, y, w, a, k) => { for (let i = 0; i < w; i++) { const X = x + i; if (X < 0 || X >= S.cols || y < 0 || y >= S.rows) continue; const c = buf[y * S.cols + X]; c.a = a; if (k !== undefined) c.k = k; } };
    S.center = (y, str, a, k) => S.put(Math.floor((S.cols - String(str).length) / 2), y, str, a, k);
    S.fill = (x, y, w, h, ch = ' ', a = '', k = null) => { for (let j = 0; j < h; j++) S.put(x, y + j, ch.repeat(Math.max(0, w)), a, k); };
    S.box = (x, y, w, h, dbl, a = '', k = null) => {
      const c = dbl ? '╔╗╚╝═║' : '┌┐└┘─│';
      S.put(x, y, c[0] + c[4].repeat(w - 2) + c[1], a, k);
      for (let j = 1; j < h - 1; j++) { S.put(x, y + j, c[5] + ' '.repeat(w - 2) + c[5], a, k); }
      S.put(x, y + h - 1, c[2] + c[4].repeat(w - 2) + c[3], a, k);
    };
    // A 3-row button with a border, text centered.
    S.button = (x, y, w, label, k, on) => { S.box(x, y, w, 3, false, on ? 'i' : '', k); S.put(x + Math.max(1, Math.floor((w - label.length) / 2)), y + 1, label.slice(0, w - 2), on ? 'i' : 'b', k); };
    S.wrap = (text, width) => {
      const out = [];
      String(text).split('\n').forEach(par => {
        let line = '';
        par.split(' ').forEach(w => { if ((line + (line ? ' ' : '') + w).length > width) { if (line) out.push(line); line = w; } else line += (line ? ' ' : '') + w; });
        out.push(line);
      });
      return out;
    };
    S.title = (left, right) => { S.fill(0, 0, S.cols, 1, ' ', 'i'); S.put(1, 0, left, 'i'); if (right) S.put(S.cols - right.length - 1, 0, right, 'i'); };
    // Bottom status bar made of tappable items [[label, key], ...]
    S.status = items => {
      S.fill(0, S.rows - 1, S.cols, 1, ' ', 'i');
      let x = 1;
      items.forEach(([lab, k]) => { if (x + lab.length > S.cols) return; S.put(x, S.rows - 1, lab, 'i', k); x += lab.length + 2; });
    };
    const phos = () => (getComputedStyle(host).getPropertyValue('--phos') || '').trim() || '#33ff66';
    const mixC = (hex, a) => { const m = /^#?([0-9a-f]{6})$/i.exec(hex); const n = m ? parseInt(m[1], 16) : 0x33ff66; return `rgb(${Math.round((n >> 16 & 255) * a)},${Math.round((n >> 8 & 255) * a)},${Math.round((n & 255) * a)})`; };
    function drawBox(sp, x, y, col) {
      const lw = Math.max(1, Math.round(cw / 7)), g = Math.max(1.5, lw * 1.4), cx = x + cw / 2, cy = y + chh / 2, R2 = x + cw, B = y + chh;
      const [u, r, d, l] = sp; ctx.fillStyle = col;
      const rr = (x1, y1, x2, y2) => { const a = Math.round(Math.min(x1, x2)), b = Math.round(Math.min(y1, y2)); ctx.fillRect(a, b, Math.max(1, Math.round(Math.max(x1, x2)) - a), Math.max(1, Math.round(Math.max(y1, y2)) - b)); };
      const hl = (x1, x2, yy) => rr(x1, yy - lw / 2, x2, yy + lw / 2);
      const vl = (y1, y2, xx) => rr(xx - lw / 2, y1, xx + lw / 2, y2);
      if (r === 1) hl(u || d ? cx - lw / 2 : cx, R2, cy);
      if (l === 1) hl(x, u || d ? cx + lw / 2 : cx, cy);
      if (u === 1) vl(y, cy + lw / 2, cx);
      if (d === 1) vl(cy - lw / 2, B, cx);
      if (r === 2) { hl(u ? cx + g : cx - g, R2, cy - g); hl(d ? cx + g : cx - g, R2, cy + g); }
      if (l === 2) { hl(x, u ? cx - g : cx + g, cy - g); hl(x, d ? cx - g : cx + g, cy + g); }
      if (d === 2) { vl(l ? cy + g : cy - g, B, cx - g); vl(r ? cy + g : cy - g, B, cx + g); }
      if (u === 2) { vl(y, l ? cy - g : cy + g, cx - g); vl(y, r ? cy - g : cy + g, cx + g); }
    }
    S.flush = () => {
      if (!buf.length) return;
      const P = phos(), cols = [mixC(P, 0.5), mixC(P, 0.8), mixC(P, 1)];
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalAlpha = 1; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, S.cols * cw, S.rows * chh);
      ctx.font = `${Math.round(chh * 0.98)}px VT323,"Courier New",monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      hasBlink = false;
      for (let y = 0; y < S.rows; y++) for (let x = 0; x < S.cols; x++) {
        const c = buf[y * S.cols + x], a = c.a, px = x * cw, py = y * chh;
        const blink = a.includes('k'); if (blink) hasBlink = true;
        let inv = a.includes('i');
        if (blink && !S.phase) { if (inv) inv = false; else continue; }
        const alpha = a.includes('d') ? 0.5 : (a.includes('b') || inv) ? 1 : 0.8;
        if (inv) { ctx.fillStyle = cols[a.includes('d') ? 0 : 2]; ctx.fillRect(Math.floor(px), Math.floor(py), Math.ceil(cw) + 1, Math.ceil(chh) + 1); }
        const fg = inv ? '#000' : cols[alpha === 0.5 ? 0 : alpha === 1 ? 2 : 1], ch = c.c;
        if (ch === ' ') continue;
        if (BOXC[ch]) { drawBox(BOXC[ch], px, py, fg); continue; }
        ctx.fillStyle = fg;
        if (ch === '█') ctx.fillRect(px, py, cw + 0.5, chh + 0.5);
        else if (ch === '▀') ctx.fillRect(px, py, cw + 0.5, chh / 2);
        else if (ch === '▄') ctx.fillRect(px, py + chh / 2, cw + 0.5, chh / 2 + 0.5);
        else if (ch === '▌') ctx.fillRect(px, py, cw / 2, chh + 0.5);
        else if (ch === '▐') ctx.fillRect(px + cw / 2, py, cw / 2 + 0.5, chh + 0.5);
        else if (ch === '░' || ch === '▒' || ch === '▓') { ctx.globalAlpha = ch === '░' ? 0.25 : ch === '▒' ? 0.5 : 0.75; ctx.fillRect(px, py, cw + 0.5, chh + 0.5); ctx.globalAlpha = 1; }
        else ctx.fillText(ch, px + cw / 2, py + chh * 0.54, cw * 1.02);
      }
      ctx.globalAlpha = 1;
    };
    S.cellAt = e => { const r = cv.getBoundingClientRect(); const x = Math.floor((e.clientX - r.left) / (r.width / S.cols)), y = Math.floor((e.clientY - r.top) / (r.height / S.rows)); return buf[y * S.cols + x]; };
    cv.addEventListener('click', e => { const c = S.cellAt(e); if (c && c.k != null && S.onTap) S.onTap(c.k); });
    cv.addEventListener('pointermove', e => { if (e.pointerType !== 'mouse') return; const c = S.cellAt(e); cv.style.cursor = c && c.k != null ? 'pointer' : 'default'; });
    const bt = setInterval(() => { S.phase = !S.phase; if (hasBlink) S.flush(); }, 450);
    S.stop = () => clearInterval(bt);
    if (document.fonts && document.fonts.load) document.fonts.load('20px VT323').then(() => S.flush(), () => {});
    return S;
  }
  // Wrap a program's 1985 screen: canvas area + (on touch screens) a text box to bring up the keyboard.
  function dosShell(W, withInput) {
    W.body.innerHTML = `<div class="lrn-dos"><div class="lrn-dscr"></div>${withInput ? '<input class="lrn-tin" type="text" placeholder="TAP HERE TO TYPE" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="go">' : ''}</div>`;
    const S = TM(W.body.querySelector('.lrn-dscr'));
    return { S, input: W.body.querySelector('.lrn-tin') };
  }
  // Soft keyboard helper: feed characters from a text box to onChar; Enter to onEnter.
  function hookInput(inp, onChar, onEnter, onBack) {
    if (!inp) return;
    inp.addEventListener('input', () => { const v = inp.value; inp.value = ''; for (const ch of v) onChar(ch); });
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); onEnter && onEnter(); }
      else if (e.key === 'Backspace') { onBack && onBack(); }
    });
  }
  const CSS_SHARED = `
    .lrn-dos{height:100%;display:flex;flex-direction:column;background:#000;color:var(--phos,#33ff66)}
    .lrn-dscr{flex:1;min-height:0;display:flex;align-items:center;justify-content:center;overflow:hidden}
    .lrn-tm{display:block;filter:drop-shadow(0 0 3px color-mix(in srgb,var(--phos,#33ff66) 50%,transparent));touch-action:manipulation}
    .lrn-tin{flex:none;margin:4px;background:#000;color:var(--phos,#33ff66);border:1px solid var(--phos,#33ff66);font:20px var(--dos);padding:8px;text-transform:uppercase;min-height:44px;box-sizing:border-box}
    .lrn-tin::placeholder{color:var(--phos,#33ff66);opacity:.6}
  `;

  /* ================= KEYBOARD CRITTERS ================= */
  const KROWS = ['qwertyuiop', 'asdfghjkl;', 'zxcvbnm,./'];
  const FINGER = {};
  [['qaz', 0], ['wsx', 1], ['edc', 2], ['rfvtgb', 3], ['yhnujm', 4], ['ik,', 5], ['ol.', 6], ['p;/', 7], [' ', 8]].forEach(([s, f]) => [...s].forEach(k => { FINGER[k] = f; }));
  const FNAMES = ['left pinky', 'left ring finger', 'left middle finger', 'left pointer finger', 'right pointer finger', 'right middle finger', 'right ring finger', 'right pinky', 'thumb'];
  const FCOL = ['#ff8fc0', '#ffc24d', '#7fdc5a', '#5fb8ff', '#5fb8ff', '#7fdc5a', '#ffc24d', '#ff8fc0', '#d8d8d8'];
  const LESSONS = [['f', 'j'], ['d', 'k'], ['s', 'l'], ['a', ';'], ['g', 'h'], ['e', 'i'], ['r', 'u'], ['t', 'y'], ['o', 'w'], ['n', 'm'], ['c', 'v'], ['p', 'q'], ['b', 'x'], ['z', '.']];
  const CRIT = {
    f: ['Fern', 'Frog', '#5cc84a'], j: ['Jojo', 'Jellyfish', '#e98ce0'], d: ['Dot', 'Duck', '#ffd83a'], k: ['Kip', 'Koala', '#a9a9b8'],
    s: ['Sunny', 'Snail', '#f2d36b'], l: ['Lulu', 'Ladybug', '#ee3b3b'], a: ['Ace', 'Ant', '#d0643c'], ';': ['Wiggles', 'Worm', '#ff9fb2'],
    g: ['Gus', 'Goat', '#efe6d2'], h: ['Hazel', 'Hedgehog', '#c9975e'], e: ['Echo', 'Elephant', '#9fb4c8'], i: ['Iggy', 'Iguana', '#7bd06a'],
    r: ['Rosie', 'Rabbit', '#f4f0f0'], u: ['Uno', 'Unicorn', '#fbf6ff'], t: ['Toby', 'Turtle', '#9fe07a'], y: ['Yuki', 'Yak', '#8a6446'],
    o: ['Ollie', 'Owl', '#a4764c'], w: ['Wally', 'Walrus', '#b98a6a'], n: ['Nico', 'Narwhal', '#8fb0d8'], m: ['Mimi', 'Mouse', '#c4c0c8'],
    c: ['Coco', 'Cat', '#ffa94a'], v: ['Val', 'Vole', '#a7825e'], p: ['Penny', 'Penguin', '#3a3f4a'], q: ['Queenie', 'Quail', '#b8875a'],
    b: ['Benny', 'Bear', '#9b6a42'], x: ['Xavi', 'X-ray Fish', '#bfe8ff'], z: ['Ziggy', 'Zebra', '#ffffff'], '.': ['Pip', 'Pill Bug', '#9aa0aa']
  };
  const keyName = k => k === ';' ? 'semicolon' : k === '.' ? 'period' : k === ',' ? 'comma' : k === ' ' ? 'space bar' : k.toUpperCase();
  const keyWord = k => k === ' ' ? 'the space bar' : `the ${keyName(k)} key`;
  const critName = k => `${CRIT[k][0]} the ${CRIT[k][1]}`;
  const HOMES = {
    ';': 'curl up on the semicolon key. It looks like a little wiggly worm, just like me!',
    '.': 'live on the period key. I can roll up into a tiny ball, just like a period!'
  };
  const WORDS = ('a as ad add dad sad lad fad all fall falls ask asks flask salad alas ' +
    'had has gas glad flag flags half hall dash flash shall gag ' +
    'he she is if hi hid kid kids lid did said side hide like lake file fish dish idea egg eggs leg legs sled head heel feel seed seek fed less deal lead safe sail dial field shelf glass ' +
    'rug hug jug dug sure rule ride fire hair ear far jar huge fur read dear deer rise fries sugar real hurry ' +
    'yes yet try fry dry day say stay tail tray tree turtle tiger dirty yard fast list sit it the they that this tea eat little silly jelly key ' +
    'owl low slow how word work wow do go so to too look took for four we will wet what water flower yellow show who two dog frog good wolf ' +
    'no on in man moon nine name mom mine and not now know many money lemon melon sun fun run ant hand rain train green mouse lion animal snow ' +
    'cat cake cow can five van have love vine over voice clock candy cookie nice ice mice car duck ' +
    'pig pup pen apple play happy puppy quiet queen quick quilt pond pink map ' +
    'box fox six bed big bus bee bear bird baby books bat web ' +
    'zoo zebra zip lazy pizza buzz fuzzy dizzy zigzag').split(' ');

  // Critter pictures: simple cartoon SVGs in a 48x48 box.
  const OL = 'stroke="#3b2a1e" stroke-width="1.4" stroke-linejoin="round"';
  const eyes = (x1, x2, y, r = 3.2) => [x1, x2].map(x => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" ${OL}/><circle cx="${x + r * 0.2}" cy="${y + r * 0.15}" r="${r * 0.52}" fill="#1b1b1b"/><circle cx="${x + r * 0.42}" cy="${y - r * 0.2}" r="${r * 0.2}" fill="#fff"/>`).join('');
  const smile = (y, w = 4, x = 24) => `<path d="M${x - w} ${y}Q${x} ${y + w} ${x + w} ${y}" fill="none" stroke="#3b2a1e" stroke-width="1.5" stroke-linecap="round"/>`;
  const cheeks = (y, dx = 9, x = 24) => `<circle cx="${x - dx}" cy="${y}" r="2.3" fill="#ff7f9a" opacity=".6"/><circle cx="${x + dx}" cy="${y}" r="2.3" fill="#ff7f9a" opacity=".6"/>`;
  const face = (y = 26, dx = 5, r = 3.2) => eyes(24 - dx, 24 + dx, y, r) + smile(y + 6) + cheeks(y + 5, dx + 4);
  const blob = (c, r = 15, cy = 29) => `<circle cx="24" cy="${cy}" r="${r}" fill="${c}" ${OL}/>`;
  const ART = {
    Frog: c => `<ellipse cx="24" cy="32" rx="18" ry="12" fill="${c}" ${OL}/><circle cx="15" cy="21" r="6.5" fill="${c}" ${OL}/><circle cx="33" cy="21" r="6.5" fill="${c}" ${OL}/>${eyes(15, 33, 21, 3.8)}${smile(33, 9)}${cheeks(35, 12)}<ellipse cx="13" cy="43" rx="5" ry="2.4" fill="${c}" ${OL}/><ellipse cx="35" cy="43" rx="5" ry="2.4" fill="${c}" ${OL}/>`,
    Jellyfish: c => `${[12, 19, 29, 36].map(x => `<path d="M${x} 30q-3 4 0 8t0 8" fill="none" stroke="${c}" stroke-width="2.6" stroke-linecap="round"/>`).join('')}<path d="M6 31A18 18 0 0 1 42 31Q38 34 34 31Q29 34 24 31Q19 34 14 31Q10 34 6 31Z" fill="${c}" ${OL}/>${face(22)}`,
    Duck: c => `<path d="M22 12q2-5 6-3" fill="none" stroke="#3b2a1e" stroke-width="1.5"/>${blob(c, 15, 28)}<ellipse cx="10" cy="32" rx="4" ry="7" fill="${c}" ${OL} transform="rotate(20 10 32)"/><ellipse cx="38" cy="32" rx="4" ry="7" fill="${c}" ${OL} transform="rotate(-20 38 32)"/>${eyes(19, 29, 24)}<ellipse cx="24" cy="31" rx="6.5" ry="3" fill="#ff9a1f" ${OL}/>${cheeks(29, 10)}`,
    Koala: c => `<circle cx="9" cy="17" r="8" fill="${c}" ${OL}/><circle cx="39" cy="17" r="8" fill="${c}" ${OL}/><circle cx="9" cy="17" r="4" fill="#f4c6d0"/><circle cx="39" cy="17" r="4" fill="#f4c6d0"/>${blob(c, 15, 28)}${eyes(18, 30, 25, 2.8)}<ellipse cx="24" cy="30" rx="4" ry="5" fill="#2f2f38"/>${smile(36, 3)}${cheeks(32, 10)}`,
    Snail: c => `<path d="M4 42Q4 34 12 34H40Q46 34 46 42Z" fill="${c}" ${OL}/><circle cx="29" cy="25" r="12" fill="#c7813a" ${OL}/><path d="M29 25m-2 0a2 2 0 1 1 4 0a4 4 0 1 1-8 0a6 6 0 1 1 12 0a8 8 0 1 1-16 0" fill="none" stroke="#7a4a1e" stroke-width="1.5"/><path d="M10 34L7 22M14 34L15 22" stroke="#3b2a1e" stroke-width="1.4"/>${eyes(7, 15, 21, 2.8)}${smile(38, 3, 10)}`,
    Ladybug: c => `<circle cx="24" cy="15" r="8" fill="#2a2a2a" ${OL}/><path d="M20 8L16 3M28 8L32 3" stroke="#2a2a2a" stroke-width="1.5"/><circle cx="24" cy="30" r="15" fill="${c}" ${OL}/><path d="M24 16V45" stroke="#3b2a1e" stroke-width="1.4"/>${[[16, 26], [32, 26], [15, 36], [33, 36], [24, 40]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3" fill="#2a2a2a"/>`).join('')}${eyes(20.5, 27.5, 14, 2.6)}<path d="M21 19Q24 21 27 19" fill="none" stroke="#fff" stroke-width="1.3"/>`,
    Ant: c => `<ellipse cx="36" cy="36" rx="9" ry="7" fill="${c}" ${OL}/><circle cx="26" cy="34" r="5" fill="${c}" ${OL}/><path d="M16 10Q12 4 8 5M26 10Q30 4 34 5" fill="none" stroke="#3b2a1e" stroke-width="1.5"/><circle cx="19" cy="21" r="12" fill="${c}" ${OL}/>${eyes(14, 24, 19, 3)}${smile(26, 3.5, 19)}${cheeks(25, 8, 19)}<path d="M22 39l-3 7M30 41l0 6M38 42l3 5" stroke="#3b2a1e" stroke-width="1.5"/>`,
    Worm: c => `<path d="M6 40Q12 30 18 40T30 40Q34 36 34 30" fill="none" stroke="#3b2a1e" stroke-width="10.5" stroke-linecap="round"/><path d="M6 40Q12 30 18 40T30 40Q34 36 34 30" fill="none" stroke="${c}" stroke-width="8" stroke-linecap="round"/><circle cx="34" cy="21" r="10" fill="${c}" ${OL}/>${eyes(30, 38, 19, 2.7)}${smile(24, 3, 34)}${cheeks(24, 7, 34)}`,
    Goat: c => `<path d="M16 14Q10 4 5 8M32 14Q38 4 43 8" fill="none" stroke="#8b7a5a" stroke-width="3" stroke-linecap="round"/><ellipse cx="8" cy="22" rx="6" ry="3" fill="${c}" ${OL}/><ellipse cx="40" cy="22" rx="6" ry="3" fill="${c}" ${OL}/>${blob(c, 14, 26)}<path d="M20 38L24 47L28 38Z" fill="#d9ccb0" ${OL}/>${face(24)}`,
    Hedgehog: c => `<path d="M6 34L3 26L9 24L7 15L15 16L17 7L24 12L31 7L33 16L41 15L39 24L45 26L42 34Z" fill="#6b4a2a" ${OL}/><circle cx="24" cy="31" r="13" fill="${c}" ${OL}/>${face(28, 4.5, 2.9)}<circle cx="24" cy="31.5" r="1.8" fill="#1b1b1b"/>`,
    Elephant: c => `<ellipse cx="9" cy="25" rx="8" ry="11" fill="${c}" ${OL}/><ellipse cx="39" cy="25" rx="8" ry="11" fill="${c}" ${OL}/><ellipse cx="9" cy="25" rx="4.5" ry="7" fill="#f2c4cf"/><ellipse cx="39" cy="25" rx="4.5" ry="7" fill="#f2c4cf"/>${blob(c, 13, 26)}${eyes(19, 29, 23, 2.8)}<path d="M24 28Q22 38 27 44" fill="none" stroke="#3b2a1e" stroke-width="7" stroke-linecap="round"/><path d="M24 28Q22 38 27 44" fill="none" stroke="${c}" stroke-width="4.4" stroke-linecap="round"/>${cheeks(30, 9)}`,
    Iguana: c => `<path d="M34 38Q46 40 44 30" fill="none" stroke="#3b2a1e" stroke-width="5" stroke-linecap="round"/><path d="M34 38Q46 40 44 30" fill="none" stroke="${c}" stroke-width="3" stroke-linecap="round"/><path d="M12 16L15 10L18 15L21 8L24 14L27 8L30 15L33 10L36 16Z" fill="#f2a53a" ${OL}/><ellipse cx="24" cy="29" rx="15" ry="13" fill="${c}" ${OL}/>${face(26)}`,
    Rabbit: c => `<ellipse cx="17" cy="11" rx="4.5" ry="11" fill="${c}" ${OL}/><ellipse cx="31" cy="11" rx="4.5" ry="11" fill="${c}" ${OL}/><ellipse cx="17" cy="12" rx="2" ry="7.5" fill="#f7b8c8"/><ellipse cx="31" cy="12" rx="2" ry="7.5" fill="#f7b8c8"/>${blob(c, 14, 31)}${eyes(19, 29, 28, 3)}<path d="M22.5 33h3l-1.5 2z" fill="#f78aa3"/>${smile(36, 3)}${cheeks(34, 10)}`,
    Unicorn: c => `<path d="M20 16L24 1L28 16Z" fill="#ffd34a" ${OL}/><path d="M22 11L26 9M21.5 14L26.5 12" stroke="#c99a10" stroke-width="1"/><path d="M11 20L9 12L16 15Z" fill="${c}" ${OL}/><path d="M37 20L39 12L32 15Z" fill="${c}" ${OL}/>${blob(c, 14, 29)}<path d="M36 20Q46 26 40 40" fill="none" stroke="#b58cff" stroke-width="4" stroke-linecap="round"/><path d="M34 18Q42 20 44 30" fill="none" stroke="#ff8fc0" stroke-width="3.5" stroke-linecap="round"/>${face(28)}`,
    Turtle: c => `<path d="M6 34A18 16 0 0 1 42 34Z" fill="#3c9a4a" ${OL}/><path d="M16 22L24 18L32 22L32 30L24 33L16 30Z" fill="#62c060" stroke="#2a6a30" stroke-width="1.2"/><circle cx="24" cy="36" r="10" fill="${c}" ${OL}/>${eyes(20, 28, 34, 2.7)}${smile(39.5, 3)}${cheeks(39, 7)}<ellipse cx="9" cy="42" rx="4" ry="2.4" fill="${c}" ${OL}/><ellipse cx="39" cy="42" rx="4" ry="2.4" fill="${c}" ${OL}/>`,
    Yak: c => `<path d="M14 16Q4 16 5 6M34 16Q44 16 43 6" fill="none" stroke="#efe4c8" stroke-width="3.5" stroke-linecap="round"/><path d="M8 30Q8 14 24 14Q40 14 40 30L42 42L37 39L34 44L30 40L26 45L22 40L18 45L14 40L11 44L6 42Z" fill="${c}" ${OL}/><path d="M14 22Q24 16 34 22" fill="none" stroke="#6a4a30" stroke-width="3"/>${face(26)}<ellipse cx="24" cy="33" rx="5" ry="3" fill="#c9a488"/>`,
    Owl: c => `<path d="M11 14L13 4L19 11Z" fill="${c}" ${OL}/><path d="M37 14L35 4L29 11Z" fill="${c}" ${OL}/><ellipse cx="24" cy="28" rx="15" ry="17" fill="${c}" ${OL}/><ellipse cx="24" cy="35" rx="9" ry="9" fill="#f2dcb2"/><circle cx="18" cy="21" r="5.5" fill="#ffd34a" ${OL}/><circle cx="30" cy="21" r="5.5" fill="#ffd34a" ${OL}/>${eyes(18, 30, 21, 3.6)}<path d="M22 26L26 26L24 30Z" fill="#ff9a1f" ${OL}/>`,
    Walrus: c => `${blob(c, 16, 28)}${eyes(18, 30, 21, 2.6)}<circle cx="20" cy="29" r="5" fill="#e6c0a0" ${OL}/><circle cx="28" cy="29" r="5" fill="#e6c0a0" ${OL}/><circle cx="24" cy="25.5" r="2" fill="#3b2a1e"/><path d="M19 33L19 44L22 44L22 33M26 33L26 44L29 44L29 33" fill="#fffdf0" ${OL}/>`,
    Narwhal: c => `<path d="M16 16L4 3" stroke="#f3ecd2" stroke-width="3" stroke-linecap="round"/><path d="M16 16L4 3" stroke="#b9ad86" stroke-width="1" stroke-dasharray="2 2"/><path d="M8 30Q8 16 24 16Q38 16 40 28L46 22L45 36L40 34Q36 44 22 43Q8 42 8 30Z" fill="${c}" ${OL}/><ellipse cx="22" cy="36" rx="10" ry="5" fill="#dfe9f5"/>${eyes(15, 25, 26, 2.8)}${smile(32, 3, 20)}${cheeks(31, 8, 20)}`,
    Mouse: c => `<path d="M38 40Q48 42 44 32" fill="none" stroke="#f0a0b8" stroke-width="2" stroke-linecap="round"/><circle cx="11" cy="16" r="9" fill="${c}" ${OL}/><circle cx="37" cy="16" r="9" fill="${c}" ${OL}/><circle cx="11" cy="16" r="5" fill="#f7b8c8"/><circle cx="37" cy="16" r="5" fill="#f7b8c8"/>${blob(c, 14, 30)}${eyes(19, 29, 27, 3)}<circle cx="24" cy="33" r="2" fill="#f07896"/><path d="M14 33H4M14 35L5 38M34 33H44M34 35L43 38" stroke="#3b2a1e" stroke-width="0.9"/>${smile(37, 2.5)}`,
    Cat: c => `<path d="M10 22L10 6L21 15Z" fill="${c}" ${OL}/><path d="M38 22L38 6L27 15Z" fill="${c}" ${OL}/><path d="M12 18L12 10L17 14Z" fill="#f7b8c8"/><path d="M36 18L36 10L31 14Z" fill="#f7b8c8"/>${blob(c, 15, 28)}<path d="M20 14L21 19M24 13V19M28 14L27 19" stroke="#c96a18" stroke-width="1.6"/>${eyes(18, 30, 26, 3)}<path d="M22.5 31h3l-1.5 2z" fill="#f07896"/>${smile(35, 2.5)}<path d="M14 31H4M14 33L5 36M34 31H44M34 33L43 36" stroke="#3b2a1e" stroke-width="0.9"/>`,
    Vole: c => `<circle cx="13" cy="19" r="5" fill="${c}" ${OL}/><circle cx="35" cy="19" r="5" fill="${c}" ${OL}/><ellipse cx="24" cy="31" rx="17" ry="13" fill="${c}" ${OL}/><ellipse cx="24" cy="37" rx="10" ry="6" fill="#e3cfae"/>${eyes(19, 29, 27, 2.6)}<circle cx="24" cy="32" r="2" fill="#3b2a1e"/>${smile(36, 2.5)}${cheeks(33, 9)}`,
    Penguin: c => `<ellipse cx="24" cy="28" rx="15" ry="17" fill="${c}" ${OL}/><ellipse cx="24" cy="31" rx="10" ry="13" fill="#fff"/><path d="M14 20Q24 12 34 20Q34 28 24 28Q14 28 14 20Z" fill="#fff"/>${eyes(19, 29, 21, 2.7)}<path d="M21 25L27 25L24 29Z" fill="#ff9a1f" ${OL}/>${cheeks(27, 9)}<ellipse cx="18" cy="45" rx="4" ry="2" fill="#ff9a1f" ${OL}/><ellipse cx="30" cy="45" rx="4" ry="2" fill="#ff9a1f" ${OL}/>`,
    Quail: c => `<path d="M24 14Q22 4 28 3Q26 8 26 14" fill="#3b2a1e"/>${blob(c, 15, 29)}<ellipse cx="24" cy="36" rx="9" ry="6" fill="#e8d2ae"/>${[[14, 32], [34, 32], [18, 40], [30, 40]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.4" fill="#fff"/>`).join('')}${eyes(19, 29, 25, 2.8)}<path d="M22 29L26 29L24 32Z" fill="#f0b030" ${OL}/>${cheeks(30, 10)}`,
    Bear: c => `<circle cx="12" cy="15" r="6" fill="${c}" ${OL}/><circle cx="36" cy="15" r="6" fill="${c}" ${OL}/><circle cx="12" cy="15" r="3" fill="#e0b48a"/><circle cx="36" cy="15" r="3" fill="#e0b48a"/>${blob(c, 15, 28)}<ellipse cx="24" cy="33" rx="7" ry="5.5" fill="#e0b48a" ${OL}/>${eyes(18, 30, 25, 2.8)}<ellipse cx="24" cy="31" rx="2.6" ry="1.8" fill="#2a2a2a"/>${smile(35, 2.5)}`,
    'X-ray Fish': c => `<path d="M36 28L46 18L46 38Z" fill="${c}" ${OL} opacity=".9"/><ellipse cx="22" cy="28" rx="17" ry="12" fill="${c}" ${OL} opacity=".9"/><path d="M12 28H38" stroke="#6a90b0" stroke-width="1.6"/>${[18, 23, 28, 33].map(x => `<path d="M${x} 21Q${x - 2} 28 ${x} 35" fill="none" stroke="#6a90b0" stroke-width="1.2"/>`).join('')}<path d="M22 16L27 10L30 17Z" fill="${c}" ${OL}/>${eyes(12, 12, 24, 3.2)}${smile(31, 2.5, 11)}`,
    Zebra: c => `<path d="M16 12L20 6L24 11L28 5L32 12" fill="#2a2a2a" ${OL}/><path d="M12 18L11 9L18 14Z" fill="${c}" ${OL}/><path d="M36 18L37 9L30 14Z" fill="${c}" ${OL}/><ellipse cx="24" cy="27" rx="13" ry="15" fill="${c}" ${OL}/><path d="M12 22H18M11 28H16M30 22H36M32 28H37M18 15L21 19M30 15L27 19" stroke="#2a2a2a" stroke-width="2.4" stroke-linecap="round"/><ellipse cx="24" cy="36" rx="8.5" ry="6" fill="#3a3a3a" ${OL}/><circle cx="21" cy="36" r="1.2" fill="#fff"/><circle cx="27" cy="36" r="1.2" fill="#fff"/>${eyes(19, 29, 26, 2.8)}`,
    'Pill Bug': c => `<path d="M16 12Q10 4 6 6M32 12Q38 4 42 6" fill="none" stroke="#3b2a1e" stroke-width="1.4"/><path d="M5 38A19 22 0 0 1 43 38Z" fill="${c}" ${OL}/>${[12, 18, 30, 36].map(x => `<path d="M${x} ${x < 24 ? 38 - (24 - x) * 0.1 : 38}Q${x + (x < 24 ? -2 : 2)} 27 ${x + (x < 24 ? 3 : -3)} 18" fill="none" stroke="#6a707a" stroke-width="1.2"/>`).join('')}${eyes(19, 29, 29, 2.8)}${smile(34, 3)}${cheeks(33, 9)}<path d="M10 38l-2 5M18 38l-1 5M30 38l1 5M38 38l2 5" stroke="#3b2a1e" stroke-width="1.4"/>`
  };
  const critSvg = (k, cls = '') => { const C = CRIT[k]; return `<svg class="${cls}" viewBox="0 0 48 48" aria-hidden="true">${ART[C[1]](C[2])}</svg>`; };
  // 1985 text-mode critters: [ears, body-with-letter, feet]
  const TTOP = { Frog: '@ @', Jellyfish: '___', Duck: ' ~ ', Koala: 'O O', Snail: '\\ /', Ladybug: '\\ /', Ant: '\\ /', Worm: ' ~ ', Goat: '\\ /', Hedgehog: '^^^', Elephant: 'O O', Iguana: '^^^', Rabbit: '| |', Unicorn: ' ^ ', Turtle: '___', Yak: '^ ^', Owl: 'V V', Walrus: ' _ ', Narwhal: ' / ', Mouse: 'O O', Cat: '^ ^', Vole: 'o o', Penguin: ' _ ', Quail: ' ? ', Bear: 'o o', 'X-ray Fish': ' ><', Zebra: '/// ', 'Pill Bug': '\\ /' };
  const tmCrit = (k, frame) => [' ' + (TTOP[CRIT[k][1]] || '^ ^').slice(0, 3) + ' ', '( ' + k.toUpperCase() + ' )', frame ? ' / \\ ' : ' | | '];
  const TROPHIES = [
    ['home', 'Home Row Hero', 'Finish lessons 1 to 4 (the home row)'],
    ['half', 'Halfway There', 'Finish 7 lessons'],
    ['all', 'Critter Keeper', 'Meet all 28 critter friends'],
    ['sharp', 'Sharp Eyes', 'Finish a lesson with no mistakes'],
    ['speedy', 'Speedy Paws', 'Type 10 words per minute in a lesson'],
    ['zoom', 'Zoom Zoom', 'Type 20 words per minute in a lesson'],
    ['catch10', 'Critter Catcher', 'Catch 10 critters in one game'],
    ['catchall', 'Perfect Catch', 'Catch all 20 critters in one game'],
    ['catch100', 'Big Basket', 'Catch 100 critters in all']
  ];
  const trophySvg = on => `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M9 4H23V12Q23 20 16 20Q9 20 9 12Z" fill="${on ? '#ffc93a' : '#ccc'}" stroke="${on ? '#9a6a00' : '#999'}" stroke-width="1.4"/><path d="M9 7H4Q4 14 10 15M23 7H28Q28 14 22 15" fill="none" stroke="${on ? '#9a6a00' : '#999'}" stroke-width="1.6"/><rect x="14" y="20" width="4" height="5" fill="${on ? '#e0a820' : '#bbb'}"/><rect x="9" y="25" width="14" height="4" rx="1" fill="${on ? '#8a5a2a' : '#aaa'}"/>${on ? '<path d="M16 7l1.5 3 3.3.4-2.4 2.3.6 3.3-3-1.6-3 1.6.6-3.3-2.4-2.3 3.3-.4z" fill="#fff6c0"/>' : ''}</svg>`;

  function drillLines(li) {
    const nw = LESSONS[li], known = LESSONS.slice(0, li + 1).flat(), set = new Set(known);
    const keys = known.filter(k => k !== '.');
    const words = WORDS.filter(w => [...w].every(c => set.has(c)));
    const fav = words.filter(w => nw.some(k => w.includes(k)));
    const [a, b] = nw;
    const lines = [[a + a + a, b + b + b, a + b + a, b + a + b, a + ' ' + b].join(' ')];
    const g = [];
    while (g.join(' ').length < 18) { let s = ''; const n = R(2, 3); for (let j = 0; j < n; j++) s += Math.random() < 0.55 ? pickA(nw.filter(k => k !== '.')) : pickA(keys); g.push(s); }
    lines.push(g.join(' '));
    if (words.length >= 4) {
      for (let n = 0; n < (li >= 6 ? 2 : 1); n++) {
        const ws = [];
        while (ws.join(' ').length < 16) { const w = fav.length && Math.random() < 0.6 ? pickA(fav) : pickA(words); if (ws[ws.length - 1] !== w) ws.push(w); }
        let s = ws.join(' '); if (a === 'z') s += '.';
        lines.push(s);
      }
    } else {
      const g2 = []; while (g2.join(' ').length < 16) { let s = ''; const n = R(3, 4); for (let j = 0; j < n; j++) s += pickA(keys); g2.push(s); }
      lines.push(g2.join(' '));
    }
    return lines;
  }

  function openCritters(W, api) {
    const dosMode = api.era.id === '1985', E = api.esc, touch = coarse();
    const P = Object.assign({ done: {}, trophies: [], cbest: 0, ctotal: 0, speed: 1, talk: true, showSpeed: true }, api.load('prog', {}));
    const saveP = () => api.save('prog', P);
    const say = t => { if (P.talk) api.say(t); };
    const setHome = escKeeper(W);
    let view = 'home', sel = 0, L = null, C = null, raf = 0, lastT = 0, msg = '', timers = [];
    const later = (fn, ms) => { const id = setTimeout(fn, ms); timers.push(id); };
    const nDone = () => Object.keys(P.done).length;
    const unlocked = i => i === 0 || !!P.done[i - 1] || !!P.done[i];
    const nextLesson = () => { const i = LESSONS.findIndex((_, j) => !P.done[j]); return i < 0 ? LESSONS.length - 1 : i; };
    const metKeys = () => LESSONS.filter((_, i) => P.done[i]).flat();
    const catchKeys = () => { const k = metKeys().filter(x => /[a-z]/.test(x)); return k.length >= 2 ? k : ['f', 'j', 'd', 'k']; };
    const award = id => { if (!P.trophies.includes(id)) { P.trophies.push(id); return TROPHIES.find(t => t[0] === id); } return null; };

    let S = null, inp = null, root = null;
    if (dosMode) { const d = dosShell(W, touch); S = d.S; inp = d.input; S.onTap = act; }
    else { W.body.innerHTML = '<div class="kcr"></div>'; root = W.body.firstChild; }

    api.menubar([
      { label: 'Game', items: [
        { label: 'Main menu', fn: () => go('home') }, { label: 'Lessons', fn: () => go('lessons') },
        { label: 'Critter Catch', fn: startCatch }, { label: 'Sticker shelf', fn: () => go('shelf') },
        '-', { label: 'Exit', fn: () => api.close() }] },
      { label: 'Options', items: () => [
        { label: (P.talk ? '[x] ' : '[ ] ') + 'Read aloud', fn: () => { P.talk = !P.talk; saveP(); } },
        { label: (P.showSpeed ? '[x] ' : '[ ] ') + 'Show speed (for big kids)', fn: () => { P.showSpeed = !P.showSpeed; saveP(); render(); } },
        '-', { label: 'Start over...', fn: () => api.msgBox('Keyboard Critters', 'Start over? This clears finished lessons, stickers and trophies.', ['Start over', 'Cancel'], 'warn').then(b => { if (b === 'Start over') { P.done = {}; P.trophies = []; P.cbest = 0; P.ctotal = 0; P.speed = 1; saveP(); go('home'); } }) }] },
      { label: 'Help', items: [{ label: 'How to play', fn: howTo }, { label: 'About', fn: () => api.msgBox('About', 'Keyboard Critters\nFree with Horizon.\n\nTwenty-eight critter friends live on your keyboard. Meet them all!') }] }
    ]);
    function howTo() {
      api.msgBox('How to play', 'Sit up tall and put your fingers on the home row: A S D F for your left hand and J K L ; for your right hand. Feel the little bumps on F and J? Your pointer fingers live there!\n\nLESSONS: every lesson has 2 new critter friends. Press their keys, then type the short lines. The glowing key shows where to go, and its color shows which finger to use.\n\nCRITTER CATCH: critters walk by holding letters. Type a letter to catch that critter. They speed up when you do well and slow down when you need time.\n\nSTICKER SHELF: see the friends you met and the trophies you won.\n\nFinish a new lesson to earn $1 (up to $5 a day).' + (touch ? '\n\nOn a tablet or phone, tap the typing box to bring up the keyboard.' : ''));
    }

    function go(v) {
      stopCatch(); view = v; sel = 0; msg = '';
      setHome(v === 'home');
      if (v === 'home') say('Welcome to Keyboard Critters! Pick Lessons to meet your critter friends.');
      if (v === 'lessons') { sel = nextLesson(); say('Pick a lesson.'); }
      if (v === 'shelf') say(`You have met ${metKeys().length} critter friends.`);
      render();
    }

    /* ---- lessons ---- */
    function startLesson(i) {
      if (!unlocked(i)) { msg = 'Finish the lesson before it first!'; api.sfx.beep(); render(); return; }
      stopCatch(); view = 'lesson'; setHome(false);
      L = { i, phase: 'meet', mi: 0, presses: 0, lines: drillLines(i), li: 0, pos: 0, ok: 0, bad: 0, t0: 0, t1: 0, hop: 0, fb: '', fbBad: false };
      introKey(); render(); focusInput();
    }
    function introKey() {
      const k = LESSONS[L.i][L.mi], C2 = CRIT[k], hm = HOMES[k] || `live on the ${keyName(k)} key.`;
      L.fb = `Hi! I'm ${C2[0]} the ${C2[1]}. I ${hm} Use your ${FNAMES[FINGER[k]]}. Press ${keyName(k)} three times to say hi!`;
      L.fbBad = false;
      say(L.fb);
    }
    function lessonChar(ch) {
      if (L.phase === 'meet') {
        const k = LESSONS[L.i][L.mi];
        if (ch === k) {
          L.presses++; L.hop++; api.tone(520 + L.presses * 120, 0.09, { type: 'square', vol: 0.06 });
          if (L.presses >= 3) {
            L.mi++; L.presses = 0;
            if (L.mi >= 2) { L.phase = 'drill'; L.fb = 'Great! Now type the line. Watch the glowing key.'; L.fbBad = false; say('Great job! Now type the letters in the line.'); api.sfx.ding(); }
            else { api.sfx.ding(); later(() => { if (L && L.phase === 'meet') { introKey(); render(); } }, 500); L.fb = 'Hooray! Here comes another friend...'; L.fbBad = false; }
          } else { L.fb = ['One!', 'Two!', 'Three!'][L.presses - 1] + ' ' + (L.presses < 3 ? `Press ${keyName(k)} again!` : ''); L.fbBad = false; }
        } else if (ch.trim()) {
          L.fbBad = true; L.fb = `That was ${keyName(ch)}. ${CRIT[k][0]} lives on ${keyWord(k)}. Try again!`; api.tone(220, 0.12, { type: 'triangle', vol: 0.06 });
        }
        render(); return;
      }
      if (L.phase !== 'drill') return;
      const line = L.lines[L.li], want = line[L.pos];
      if (!L.t0) L.t0 = performance.now();
      if (ch === want) {
        L.ok++; L.pos++; L.fbBad = false; L.fb = ''; api.sfx.key();
        if (L.pos >= line.length) {
          L.li++; L.pos = 0; L.hop++;
          if (L.li >= L.lines.length) { finishLesson(); return; }
          L.fb = pickA(['Nice line!', 'Super typing!', 'You got it!', 'Wonderful!', 'Keep going!']); api.tone(880, 0.08, { type: 'square', vol: 0.05 });
        }
      } else {
        L.bad++; L.fbBad = true; api.tone(200, 0.1, { type: 'triangle', vol: 0.06 });
        L.fb = `Oops! That was ${keyName(ch)}. Find ${keyWord(want)} with your ${FNAMES[FINGER[want]]}.`;
      }
      render();
    }
    function finishLesson() {
      L.t1 = performance.now();
      const mins = Math.max(0.05, (L.t1 - L.t0) / 60000), chars = L.lines.join(' ').length;
      const acc = Math.round(100 * L.ok / Math.max(1, L.ok + L.bad)), wpm = Math.round(chars / 5 / mins);
      const stars = acc >= 97 ? 3 : acc >= 85 ? 2 : 1, first = !P.done[L.i];
      const prev = P.done[L.i] || { stars: 0, acc: 0, wpm: 0 };
      P.done[L.i] = { stars: Math.max(prev.stars, stars), acc: Math.max(prev.acc, acc), wpm: Math.max(prev.wpm, wpm) };
      const got = [];
      if (nDone() >= 4 && [0, 1, 2, 3].every(j => P.done[j])) got.push(award('home'));
      if (nDone() >= 7) got.push(award('half'));
      if (nDone() >= LESSONS.length) got.push(award('all'));
      if (L.bad === 0) got.push(award('sharp'));
      if (wpm >= 10) got.push(award('speedy'));
      if (wpm >= 20) got.push(award('zoom'));
      saveP();
      L.res = { acc, wpm, stars, first, earned: first ? dailyEarn(api, 5, 'finishing a typing lesson') : 0, trophies: got.filter(Boolean) };
      L.phase = 'done'; view = 'done';
      api.sfx.tada();
      const nw = LESSONS[L.i];
      say(`You did it! ${stars === 3 ? 'Three stars!' : stars === 2 ? 'Two stars!' : 'One star!'} ${first ? `${CRIT[nw[0]][0]} and ${CRIT[nw[1]][0]} stickers go on your shelf!` : 'Super practice!'}`);
      render();
    }

    /* ---- Critter Catch ---- */
    function startCatch() {
      stopCatch(); view = 'catch'; setHome(false);
      C = { list: [], spawned: 0, total: 20, caught: 0, missed: 0, streak: 0, t: 0, next: 0.6, keys: catchKeys(), fb: 'Type the letter a critter is holding to catch it!', id: 0, paused: false, pops: [] };
      say('Critter Catch! Type the letter a critter is holding to catch it.');
      lastT = 0; raf = requestAnimationFrame(tick); render(); focusInput();
    }
    function stopCatch() { cancelAnimationFrame(raf); raf = 0; }
    function tick(t) {
      raf = requestAnimationFrame(tick);
      if (!C || view !== 'catch') return;
      const dt = lastT ? Math.min(0.1, (t - lastT) / 1000) : 0; lastT = t;
      if (C.paused) { draw(); return; }
      C.t += dt;
      const sp = 0.075 * P.speed;
      C.list.forEach(c => {
        if (c.st === 'walk') { c.x += sp * dt; if (c.x >= 1) { c.st = 'gone'; c.at = C.t; C.missed++; C.streak = 0; P.speed = Math.max(0.5, P.speed * 0.9); C.fb = `Bye bye, ${CRIT[c.k][0]}! See you next time.`; } }
      });
      C.list = C.list.filter(c => c.st === 'walk' || C.t - c.at < 0.7);
      const walking = C.list.filter(c => c.st === 'walk');
      if (C.spawned < C.total && C.t >= C.next && walking.length < 3) {
        const lanes = [0, 1, 2].filter(l => !walking.some(c => c.lane === l && c.x < 0.3));
        if (lanes.length) {
          let k = pickA(C.keys); if (walking.some(c => c.k === k)) k = pickA(C.keys);
          C.list.push({ id: ++C.id, k, lane: pickA(lanes), x: -0.02, st: 'walk', at: 0 }); C.spawned++;
          C.next = C.t + Math.max(0.9, 2.6 / Math.sqrt(P.speed));
        }
      }
      if (C.spawned >= C.total && !C.list.some(c => c.st === 'walk') && C.t - (C.list.reduce((m, c) => Math.max(m, c.at), 0)) > 0.6) { endCatch(); return; }
      draw();
    }
    function catchChar(ch) {
      if (!C) return;
      if (C.paused) { C.paused = false; C.fb = 'Here they come!'; render(); return; }
      const cands = C.list.filter(c => c.st === 'walk' && c.k === ch).sort((a, b) => b.x - a.x);
      if (cands.length) {
        const c = cands[0]; c.st = 'caught'; c.at = C.t; C.caught++; C.streak++;
        P.speed = Math.min(3, P.speed * 1.06);
        api.tone(660, 0.07, { type: 'square', vol: 0.06 }); api.tone(990, 0.09, { type: 'square', vol: 0.06, at: 0.07 });
        C.fb = C.streak >= 3 ? `${C.streak} in a row! Amazing!` : pickA(['Got one!', 'Caught ' + CRIT[c.k][0] + '!', 'Nice catch!', 'Yay!']);
      } else if (ch.trim()) {
        C.fb = `Nobody is holding ${keyName(ch)} right now. Look again!`; api.tone(260, 0.06, { type: 'triangle', vol: 0.04 });
      }
      draw();
    }
    function endCatch() {
      stopCatch();
      P.ctotal += C.caught; P.cbest = Math.max(P.cbest, C.caught);
      const got = [];
      if (C.caught >= 10) got.push(award('catch10'));
      if (C.caught >= C.total) got.push(award('catchall'));
      if (P.ctotal >= 100) got.push(award('catch100'));
      saveP();
      C.trophies = got.filter(Boolean); view = 'catchEnd';
      api.sfx.tada();
      say(`You caught ${C.caught} critters! ${C.caught >= 15 ? 'Wow!' : 'Great job!'}`);
      render();
    }

    /* ---- input ---- */
    function onChar(ch) {
      ch = ch.toLowerCase();
      if (view === 'lesson' && L) return lessonChar(ch);
      if (view === 'catch') return catchChar(ch);
      if (view === 'home' && '123'.includes(ch)) return act(['lessons', 'catch', 'shelf'][+ch - 1]);
      if (ch === ' ' || ch === '\n') return act('enter');
    }
    function act(k) {
      if (k == null) return;
      api.sfx.click();
      if (k === 'lessons' || k === 'home' || k === 'shelf') return go(k);
      if (k === 'catch') return startCatch();
      if (k === 'help') return howTo();
      if (k === 'next') return startLesson(Math.min(LESSONS.length - 1, L ? L.i + 1 : nextLesson()));
      if (k === 'again') return startLesson(L ? L.i : 0);
      if (k === 'hear') { if (view === 'lesson' && L) say(L.fb); return; }
      if (k === 'exit') return api.close();
      if (/^L\d+$/.test(k)) return startLesson(+k.slice(1));
      if (/^key:/.test(k)) return onChar(k.slice(4));
      if (k === 'enter') {
        if (view === 'home') return act(['lessons', 'catch', 'shelf', 'help'][sel]);
        if (view === 'lessons') return startLesson(sel);
        if (view === 'done') return act(L && L.i < LESSONS.length - 1 ? 'next' : 'lessons');
        if (view === 'catchEnd') return startCatch();
        if (view === 'shelf') return go('home');
      }
    }
    const opened = performance.now();
    W.onKey = e => {
      if (e.ctrlKey || e.metaKey || e.altKey || performance.now() - opened < 300) return;
      if (e.target && e.target.classList && (e.target.classList.contains('lrn-tin') || e.target.classList.contains('kcr-in'))) { if (e.key === 'Escape') back(); return; }
      if (e.key === 'Escape') { back(); return; }
      if (e.key === 'Enter') { e.preventDefault(); if (view !== 'lesson' && view !== 'catch') act('enter'); return; }
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        const n = view === 'home' ? 4 : view === 'lessons' ? LESSONS.length : 0;
        if (n) { e.preventDefault(); const cols = view === 'lessons' && !dosMode ? lessonCols() : 1; const d = e.key === 'ArrowDown' ? cols : e.key === 'ArrowUp' ? -cols : e.key === 'ArrowRight' ? 1 : -1; sel = clamp(sel + d, 0, n - 1); render(); }
        return;
      }
      if (e.key.length === 1) { e.preventDefault(); onChar(e.key); }
    };
    function back() {
      if (view === 'home') return;
      if (view === 'lesson' || view === 'done') go('lessons'); else go('home');
    }
    function lessonCols() { const g = root && root.querySelector('.kcr-lgrid'); if (!g) return 1; return Math.max(1, getComputedStyle(g).gridTemplateColumns.split(' ').length); }
    function focusInput() {
      if (!touch) return;
      setTimeout(() => { const i = dosMode ? inp : root.querySelector('.kcr-in'); if (i) i.focus({ preventScroll: true }); }, 50);
    }
    if (dosMode) hookInput(inp, onChar, () => act('enter'));

    /* ================= DOM view (1990+) ================= */
    function kbHTML(next, known) {
      const key = k => `<button class="kcr-k${k === next ? ' on' : ''}${known.has(k) ? '' : ' dim'}" data-a="key:${k}" style="--fc:${FCOL[FINGER[k]]}" tabindex="-1">${E(k.toUpperCase())}${(k === 'f' || k === 'j') ? '<i></i>' : ''}</button>`;
      return `<div class="kcr-kb" aria-hidden="true">${KROWS.map((r, i) => `<div class="kcr-kr" style="padding-left:${i * 4}%">${[...r].map(key).join('')}</div>`).join('')}<div class="kcr-kr kcr-spr"><button class="kcr-k kcr-sp${next === ' ' ? ' on' : ''}" data-a="key: " style="--fc:${FCOL[8]}" tabindex="-1">space</button></div></div>`;
    }
    function handsSVG(f) {
      const fx = [[4, 18, 11], [16, 9, 11], [28, 5, 11], [40, 11, 11]];
      let s = '';
      fx.forEach(([x, y, w], i) => {
        s += `<rect x="${x}" y="${y}" width="${w}" height="${36 - y}" rx="5.5" fill="${FCOL[i]}" class="${f === i ? 'on' : ''}"/>`;
        s += `<rect x="${170 - x - w}" y="${y}" width="${w}" height="${36 - y}" rx="5.5" fill="${FCOL[7 - i]}" class="${f === 7 - i ? 'on' : ''}"/>`;
      });
      s += `<rect x="3" y="30" width="50" height="22" rx="7" fill="#f5d6b8" stroke="#8a6a50"/><rect x="117" y="30" width="50" height="22" rx="7" fill="#f5d6b8" stroke="#8a6a50"/>`;
      s += `<rect x="50" y="34" width="20" height="10" rx="5" fill="${FCOL[8]}" class="${f === 8 ? 'on' : ''}"/><rect x="100" y="34" width="20" height="10" rx="5" fill="${FCOL[8]}" class="${f === 8 ? 'on' : ''}"/>`;
      return `<svg class="kcr-hands" viewBox="0 0 170 54" aria-hidden="true">${s}</svg>`;
    }
    const touchBox = () => touch ? '<input class="kcr-in" type="text" placeholder="Tap here to bring up the keyboard" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">' : '';
    const header = (title, extra = '') => `<div class="kcr-hd">${view === 'home' ? '' : '<button class="kcr-back" data-a="' + (view === 'lesson' || view === 'done' ? 'lessons' : 'home') + '" aria-label="Back">&#9666; Back</button>'}<b>${E(title)}</b>${extra}</div>`;
    function render() {
      if (dosMode) return tmRender();
      const known = new Set(metKeys());
      if (L && (view === 'lesson')) LESSONS[L.i].forEach(k => known.add(k));
      let h = '';
      if (view === 'home') {
        const met = metKeys();
        const parade = (met.length ? met.slice(-6) : ['f', 'j', 'd', 'k', 's', 'l']).map((k, i) => `<div class="kcr-pc" style="animation-delay:${i * 0.18}s">${critSvg(k)}</div>`).join('');
        h = `<div class="kcr-home">
          <div class="kcr-logo">Keyboard <span>Critters</span></div>
          <div class="kcr-parade">${parade}</div>
          <div class="kcr-menu">
            ${[['lessons', 'Lessons', 'Meet new critter friends', 'f'], ['catch', 'Critter Catch', 'Type letters to catch critters', 'j'], ['shelf', 'Sticker Shelf', `${met.length} of 28 friends met`, 'd']].map(([a, t, s, k], i) => `<button class="kcr-big${sel === i ? ' sel' : ''}" data-a="${a}">${critSvg(k)}<span><b>${t}</b><small>${s}</small></span></button>`).join('')}
          </div>
          <p class="kcr-tip">Put your fingers on the home row: <b>A S D F</b> and <b>J K L ;</b></p></div>`;
      } else if (view === 'lessons') {
        h = `${header('Lessons', `<span>${nDone()} of ${LESSONS.length} done</span>`)}<div class="kcr-scroll"><div class="kcr-lgrid">${LESSONS.map((ks, i) => {
          const d = P.done[i], ok = unlocked(i);
          return `<button class="kcr-lc${sel === i ? ' sel' : ''}${ok ? '' : ' lock'}${d ? ' done' : ''}" data-a="L${i}"><span class="kcr-ln">${i + 1}</span><span class="kcr-lcr">${ks.map(k => critSvg(k)).join('')}</span><b>${ks.map(k => E(k.toUpperCase())).join(' ')}</b><small>${ok ? E(CRIT[ks[0]][1] + ' & ' + CRIT[ks[1]][1]) : 'Locked'}</small><span class="kcr-st">${d ? starStr(d.stars) : ok ? 'New!' : ''}</span></button>`;
        }).join('')}</div>${msg ? `<p class="kcr-msg">${E(msg)}</p>` : ''}</div>`;
      } else if (view === 'lesson') {
        const nw = LESSONS[L.i], meet = L.phase === 'meet';
        const k = meet ? nw[L.mi] : null;
        const line = meet ? '' : L.lines[L.li], want = meet ? k : line[L.pos];
        const star = meet ? k : (nw.includes(want) ? want : nw[L.li % 2]);
        const acc = L.ok + L.bad ? Math.round(100 * L.ok / (L.ok + L.bad)) : 100;
        const wpm = L.t0 ? Math.round(L.ok / 5 / Math.max(0.05, (performance.now() - L.t0) / 60000)) : 0;
        h = `${header(`Lesson ${L.i + 1}: ${nw.map(x => x.toUpperCase()).join(' and ')}`, meet ? '' : `<span class="kcr-meter">Line ${L.li + 1} of ${L.lines.length}${P.showSpeed ? ` &middot; ${acc}% right &middot; ${wpm} WPM` : ''}</span>`)}
          <div class="kcr-les">
            <div class="kcr-stage"><div class="kcr-cr hop${L.hop % 2}">${critSvg(star)}</div><div class="kcr-bub${L.fbBad ? ' bad' : ''}"><p>${E(L.fb || `Type the line! Next: ${keyWord(want)}.`)}</p><button class="kcr-hear" data-a="hear" aria-label="Hear it again">Hear it</button></div></div>
            ${meet ? `<div class="kcr-meet"><div class="kcr-bigkey" style="--fc:${FCOL[FINGER[k]]}">${E(k.toUpperCase())}</div><div class="kcr-dots">${[0, 1, 2].map(n => `<i class="${n < L.presses ? 'on' : ''}"></i>`).join('')}</div></div>`
              : `<div class="kcr-line">${[...line].map((c, j) => `<span class="${j < L.pos ? 'ok' : j === L.pos ? 'cur' : ''}${c === ' ' ? ' sp' : ''}">${c === ' ' ? '&nbsp;' : E(c)}</span>`).join('')}</div>`}
            <div class="kcr-finger" style="--fc:${FCOL[FINGER[want]]}">Use your <b>${FNAMES[FINGER[want]]}</b> for ${E(keyWord(want))}</div>
            <div class="kcr-kbw">${kbHTML(want, known)}${handsSVG(FINGER[want])}</div>
            ${touchBox()}
          </div>`;
      } else if (view === 'done') {
        const r = L.res, nw = LESSONS[L.i];
        h = `${header('Lesson ' + (L.i + 1) + ' done!')}<div class="kcr-done">
          <div class="kcr-conf">${Array.from({ length: 18 }, (_, i) => `<i style="left:${(i * 37) % 100}%;animation-delay:${(i % 6) * 0.15}s;background:${FCOL[i % 8]}"></i>`).join('')}</div>
          <div class="kcr-stk">${nw.map(k => `<div class="kcr-sticker">${critSvg(k)}<span>${E(critName(k))}</span></div>`).join('')}</div>
          <div class="kcr-stars">${starStr(r.stars)}</div>
          <p class="kcr-cheer">${r.stars === 3 ? 'Perfect paws!' : r.stars === 2 ? 'Great typing!' : 'You finished! Practice makes it easier.'}</p>
          ${P.showSpeed ? `<p class="kcr-stats"><span>${r.acc}% right</span><span>${r.wpm} words per minute</span></p>` : ''}
          ${r.first ? `<p class="kcr-new">New stickers for your shelf!${r.earned ? ' You earned $1.' : ''}</p>` : ''}
          ${r.trophies.map(t => `<p class="kcr-tro">${trophySvg(true)}<b>Trophy: ${E(t[1])}</b></p>`).join('')}
          <div class="kcr-row">${L.i < LESSONS.length - 1 ? '<button class="kcr-btn go" data-a="next">Next lesson</button>' : ''}<button class="kcr-btn" data-a="again">Again</button><button class="kcr-btn" data-a="catch">Critter Catch</button></div></div>`;
      } else if (view === 'catch') {
        h = `${header('Critter Catch', '<span class="kcr-meter kcr-cc"></span>')}<div class="kcr-catch">
          <div class="kcr-field"><div class="kcr-lane"></div><div class="kcr-lane"></div><div class="kcr-lane"></div><div class="kcr-basket"><svg viewBox="0 0 40 30" aria-hidden="true"><path d="M3 10H37L33 28H7Z" fill="#c98a3a" stroke="#6a4418" stroke-width="1.5"/><path d="M8 10Q20 -4 32 10" fill="none" stroke="#6a4418" stroke-width="2.5"/><path d="M6 16H34M8 22H32M14 10V28M20 10V28M26 10V28" stroke="#8a5a20"/></svg><b class="kcr-cnum">0</b></div><div class="kcr-ps"></div></div>
          <div class="kcr-cfb"></div>
          <div class="kcr-kbw">${kbHTML(null, new Set(C.keys))}</div>${touchBox()}</div>`;
      } else if (view === 'catchEnd') {
        h = `${header('Critter Catch')}<div class="kcr-done">
          <div class="kcr-conf">${Array.from({ length: 14 }, (_, i) => `<i style="left:${(i * 41) % 100}%;animation-delay:${(i % 5) * 0.2}s;background:${FCOL[i % 8]}"></i>`).join('')}</div>
          <div class="kcr-bignum">${C.caught}</div><p class="kcr-cheer">critters caught out of ${C.total}!</p>
          <p class="kcr-stats"><span>Best: ${P.cbest}</span><span>All-time: ${P.ctotal}</span></p>
          ${C.trophies.map(t => `<p class="kcr-tro">${trophySvg(true)}<b>Trophy: ${E(t[1])}</b></p>`).join('')}
          <div class="kcr-row"><button class="kcr-btn go" data-a="catch">Play again</button><button class="kcr-btn" data-a="lessons">Lessons</button></div></div>`;
      } else if (view === 'shelf') {
        const met = new Set(metKeys());
        h = `${header('Sticker Shelf', `<span>${met.size} of 28 friends</span>`)}<div class="kcr-scroll"><div class="kcr-shelf">${LESSONS.flat().map(k => met.has(k) ? `<div class="kcr-sticker">${critSvg(k)}<span>${E(CRIT[k][0])}<small>${E(keyName(k))} key</small></span></div>` : `<div class="kcr-sticker no"><svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="28" r="15" fill="#0002"/><text x="24" y="34" text-anchor="middle" font-size="16" font-weight="700" fill="#0005">?</text></svg><span>${E(keyName(k))} key</span></div>`).join('')}</div>
          <h3 class="kcr-h3">Trophies</h3><div class="kcr-trs">${TROPHIES.map(t => `<div class="kcr-tr${P.trophies.includes(t[0]) ? '' : ' no'}">${trophySvg(P.trophies.includes(t[0]))}<b>${E(t[1])}</b><small>${E(t[2])}</small></div>`).join('')}</div></div>`;
      }
      root.className = 'kcr e' + api.era.id + ' v-' + view;
      root.innerHTML = h;
      root.querySelectorAll('[data-a]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); const a = b.dataset.a; if (a.startsWith('key:')) onChar(a.slice(4)); else act(a); }));
      const ti = root.querySelector('.kcr-in');
      if (ti) { hookInput(ti, onChar, () => {}); }
      if (view === 'catch') draw();
      const s = root.querySelector('.sel'); if (s && s.scrollIntoView && view === 'lessons') s.scrollIntoView({ block: 'nearest' });
    }
    // Catch field drawing (DOM): reuse critter nodes by id.
    function draw() {
      if (dosMode) return tmRender();
      const f = root.querySelector('.kcr-field'); if (!f) return;
      const Wf = f.clientWidth, laneH = f.clientHeight / 3, sz = Math.min(64, laneH * 0.9);
      const have = new Map([...f.querySelectorAll('.kcr-wc')].map(n => [+n.dataset.id, n]));
      C.list.forEach(c => {
        let n = have.get(c.id);
        if (!n) { n = document.createElement('div'); n.className = 'kcr-wc'; n.dataset.id = c.id; n.innerHTML = `<div class="kcr-sign">${E(c.k.toUpperCase())}</div>${critSvg(c.k)}`; f.appendChild(n); }
        have.delete(c.id);
        n.style.width = sz + 'px'; n.style.height = sz + 'px';
        const x = c.x * (Wf - sz * 1.9), y = laneH * c.lane + laneH - sz - 2;
        n.style.transform = `translate(${x}px,${y}px)`;
        n.classList.toggle('got', c.st === 'caught'); n.classList.toggle('gone', c.st === 'gone');
      });
      have.forEach(n => n.remove());
      root.querySelector('.kcr-cnum').textContent = C.caught;
      root.querySelector('.kcr-cc').textContent = `Critter ${Math.min(C.total, C.spawned)} of ${C.total}`;
      const fb = root.querySelector('.kcr-cfb'); if (fb.textContent !== C.fb) fb.textContent = C.paused ? 'Paused. Press any key to keep playing.' : C.fb;
      const walking = C.list.filter(c => c.st === 'walk').sort((a, b) => b.x - a.x);
      const nk = walking.length ? walking[0].k : null;
      root.querySelectorAll('.kcr-k').forEach(b => b.classList.toggle('on', b.dataset.a === 'key:' + nk));
    }

    /* ================= TEXT MODE view (1985) ================= */
    function tmRender() {
      if (!S) return;
      if (!S.fit()) return;
      const w = S.cols, wide = w >= 80;
      S.title('KEYBOARD CRITTERS' + (wide ? '  v1.0' : ''), view === 'home' ? 'Esc=Exit' : 'Esc=Back');
      if (view === 'home') {
        const art = ['█ █ █▀▀ █ █ █▀▄ ▄▀▄ ▄▀▄ █▀▄ █▀▄', '█▀▄ █▀  ▀█▀ █▀▄ █ █ █▀█ █▀▄ █ █', '▀ ▀ ▀▀▀  ▀  ▀▀  ▀▀  ▀ ▀ ▀ ▀ ▀▀ '];
        if (wide) art.forEach((l, i) => S.center(2 + i, l, 'b')); else S.center(3, 'K E Y B O A R D', 'b');
        S.center(wide ? 6 : 5, '~ C R I T T E R S ~', 'b');
        const met = metKeys(), show = (met.length ? met.slice(-6) : ['f', 'j', 'd', 'k', 's', 'l']).slice(0, wide ? 6 : 4);
        const cx = Math.floor((w - show.length * 8) / 2);
        show.forEach((k, i) => tmCrit(k, (i + (S.phase ? 1 : 0)) % 2).forEach((r, j) => S.put(cx + i * 8 + 1, 8 + j, r, 'b')));
        const items = [['1  LESSONS', 'lessons'], ['2  CRITTER CATCH', 'catch'], ['3  STICKER SHELF', 'shelf'], ['4  HOW TO PLAY', 'help']];
        const bw = wide ? 30 : 26, bx = Math.floor((w - bw) / 2);
        items.forEach(([t, k], i) => S.button(bx, 11 + i * 3, bw, t, k, sel === i));
        S.center(24 - 1, 'Fingers on A S D F  and  J K L ;', 'd');
        S.status([['1-4 Pick', null], ['Enter=Go', 'enter'], ['Esc=Exit', 'exit']]);
      } else if (view === 'lessons') {
        S.center(2, 'PICK A LESSON', 'b');
        LESSONS.forEach((ks, i) => {
          const d = P.done[i], ok = unlocked(i), y = 4 + i;
          const name = wide ? `${critName(ks[0])} & ${critName(ks[1])}` : `${CRIT[ks[0]][1]} & ${CRIT[ks[1]][1]}`;
          let s = `${String(i + 1).padStart(2)}. ${ks[0].toUpperCase()} ${ks[1].toUpperCase()}  ${name}`.padEnd(wide ? 60 : 30).slice(0, wide ? 60 : 30);
          s += d ? ' ' + starStr(d.stars).replace(/★/g, '*').replace(/☆/g, '.') : ok ? ' NEW' : ' ---';
          const x = Math.floor((w - s.length) / 2);
          S.put(x, y, ' ' + s + ' ', sel === i ? 'i' : ok ? '' : 'd', 'L' + i);
        });
        if (msg) S.center(20, msg, 'bk');
        S.center(21, `${nDone()} of ${LESSONS.length} lessons done.  * = star`, 'd');
        S.status([['Arrows=Move', null], ['Enter=Start', 'enter'], ['Esc=Back', 'home']]);
      } else if (view === 'lesson') {
        tmLesson(w, wide);
      } else if (view === 'done') {
        const r = L.res, nw = LESSONS[L.i];
        S.box(Math.floor(w / 2) - (wide ? 25 : 18), 2, wide ? 50 : 36, 17, true, 'b');
        S.center(4, `LESSON ${L.i + 1} COMPLETE!`, 'bk');
        nw.forEach((k, i) => tmCrit(k, i).forEach((row, j) => S.put(Math.floor(w / 2) - 9 + i * 12, 6 + j, row, 'b')));
        S.center(10, starStr(r.stars).replace(/★/g, '*').replace(/☆/g, '.').split('').join(' '), 'b');
        S.center(11, r.stars === 3 ? 'PERFECT PAWS!' : r.stars === 2 ? 'GREAT TYPING!' : 'YOU FINISHED! GOOD PRACTICE!');
        if (P.showSpeed) S.center(12, `${r.acc}% right   ${r.wpm} words per minute`);
        if (r.first) S.center(13, 'New stickers for your shelf!' + (r.earned ? ' +$1' : ''), 'b');
        r.trophies.slice(0, 2).forEach((t, i) => S.center(14 + i, 'TROPHY: ' + t[1], 'bk'));
        const bw = wide ? 16 : 11, gx = Math.floor((w - bw * 3 - 2) / 2);
        if (L.i < LESSONS.length - 1) S.button(gx, 20, bw, 'NEXT', 'next', true);
        S.button(gx + bw + 1, 20, bw, 'AGAIN', 'again');
        S.button(gx + (bw + 1) * 2, 20, bw, 'CATCH', 'catch');
        S.status([['Enter=Next', 'enter'], ['Esc=Lessons', 'lessons']]);
      } else if (view === 'catch') {
        tmCatch(w, wide);
      } else if (view === 'catchEnd') {
        S.box(Math.floor(w / 2) - 17, 4, 34, 12, true, 'b');
        S.center(6, 'CRITTER CATCH', 'b');
        S.center(8, `YOU CAUGHT ${C.caught} OF ${C.total}!`, 'bk');
        S.center(10, `Best: ${P.cbest}   All-time: ${P.ctotal}`);
        C.trophies.slice(0, 2).forEach((t, i) => S.center(12 + i, 'TROPHY: ' + t[1], 'b'));
        S.button(Math.floor(w / 2) - 16, 18, 16, 'PLAY AGAIN', 'catch', true);
        S.button(Math.floor(w / 2) + 1, 18, 15, 'LESSONS', 'lessons');
        S.status([['Enter=Again', 'enter'], ['Esc=Menu', 'home']]);
      } else if (view === 'shelf') {
        const met = new Set(metKeys());
        S.center(2, `STICKER SHELF  (${met.size} of 28 friends)`, 'b');
        const all = LESSONS.flat(), per = wide ? 4 : 2, cwid = wide ? 19 : 19;
        all.forEach((k, i) => {
          const x = 1 + (i % per) * cwid, y = 4 + Math.floor(i / per);
          if (y > (wide ? 11 : 17)) return;
          S.put(x, y, (met.has(k) ? `[${k.toUpperCase()}] ${critName(k)}` : `[${k.toUpperCase()}] ??????`).slice(0, cwid - 1), met.has(k) ? 'b' : 'd');
        });
        const ty = wide ? 13 : 19;
        S.put(1, ty, 'TROPHIES:', 'b');
        TROPHIES.forEach((t, i) => {
          const on = P.trophies.includes(t[0]);
          if (wide) S.put(1 + (i % 3) * 26, ty + 1 + Math.floor(i / 3) * 2, (on ? '* ' : '- ') + t[1], on ? 'b' : 'd');
          else if (i < 6) S.put(1 + (i % 2) * 19, ty + 1 + Math.floor(i / 2), ((on ? '* ' : '- ') + t[1]).slice(0, 18), on ? 'b' : 'd');
        });
        if (wide) S.put(1, 21, 'Win trophies by finishing lessons and catching critters!', 'd');
        S.status([['Esc=Back', 'home']]);
      }
      S.flush();
    }
    function tmKeyboard(y, want, known, wide) {
      const w = S.cols, kw = wide ? 5 : 3, x0 = Math.floor((w - (10 * kw + kw)) / 2);
      KROWS.forEach((r, ri) => [...r].forEach((k, i) => {
        const x = x0 + Math.floor(ri * kw / 2) + i * kw, on = k === want, yy = y + ri * 3;
        S.box(x, yy, kw, 3, false, on ? 'i' : known.has(k) ? '' : 'd', 'key:' + k);
        S.put(x + Math.floor(kw / 2), yy + 1, k.toUpperCase(), on ? 'ik' : known.has(k) ? 'b' : 'd', 'key:' + k);
        if (wide && (k === 'f' || k === 'j')) S.put(x + 2, yy + 2, '─', on ? 'i' : 'b', 'key:' + k);
      }));
      const sw = kw * 5, sx = Math.floor((w - sw) / 2);
      const lp = Math.floor((sw - 2 - 7) / 2);
      S.put(sx, y + 9, '[' + ' '.repeat(lp) + ' SPACE ' + ' '.repeat(sw - 2 - 7 - lp) + ']', want === ' ' ? 'ik' : '', 'key: ');
    }
    function tmLesson(w, wide) {
      const nw = LESSONS[L.i], meet = L.phase === 'meet', k = meet ? nw[L.mi] : null;
      const line = meet ? '' : L.lines[L.li], want = meet ? k : line[L.pos];
      const star = meet ? k : (nw.includes(want) ? want : nw[L.li % 2]);
      S.put(1, 1, `LESSON ${L.i + 1}: ${nw.map(x => keyName(x)).join(' and ')}`, 'b');
      if (!meet) {
        const acc = L.ok + L.bad ? Math.round(100 * L.ok / (L.ok + L.bad)) : 100;
        S.put(w - (wide ? 30 : 12), 1, (wide && P.showSpeed ? `${acc}% right  ` : '') + `Line ${L.li + 1}/${L.lines.length}`, 'd');
      }
      tmCrit(star, L.hop % 2).forEach((r, j) => S.put(2, 3 + j, r, 'b'));
      const bw = w - 10;
      S.box(8, 2, bw, 5, false);
      S.wrap(L.fb || `Type the line! Next: ${keyWord(want)}.`, bw - 4).slice(0, 3).forEach((l, i) => S.put(10, 3 + i, l, L.fbBad ? 'b' : ''));
      if (meet) {
        S.center(8, `PRESS  ${keyName(k)}`, 'b');
        S.center(9, [0, 1, 2].map(n => n < L.presses ? '\x07' : '.').join(' ').replace(/\x07/g, '*'), 'b');
      } else {
        const lw = Math.min(w - 2, line.length * (wide ? 2 : 1) + 4), lx = Math.floor((w - lw) / 2);
        S.box(lx, 7, lw, 3, true);
        [...line].forEach((c, j) => {
          const x = lx + 2 + j * (wide ? 2 : 1);
          S.put(x, 8, c === ' ' && j === L.pos ? '_' : c, j < L.pos ? 'd' : j === L.pos ? 'ik' : 'b');
        });
      }
      tmKeyboard(11, want, new Set(metKeys().concat(nw)), wide);
      S.center(22, `Use your ${FNAMES[FINGER[want]].toUpperCase()}`, 'b');
      S.status([['Esc=Lessons', 'lessons'], ['F1=Hear it', 'hear']]);
    }
    function tmCatch(w, wide) {
      S.put(1, 1, `Caught: ${C.caught}`, 'b');
      S.put(w - 16, 1, `Critter ${Math.min(C.total, C.spawned)}/${C.total}`, 'd');
      const lanes = [4, 8, 12];
      lanes.forEach(y => S.fill(0, y + 3, w, 1, '▀', 'd'));
      C.list.forEach(c => {
        const x = Math.round(c.x * (w - 7)), y = lanes[c.lane];
        if (c.st === 'walk') { S.put(x + 1, y - 1, '[' + c.k.toUpperCase() + ']', 'i'); tmCrit(c.k, Math.floor(c.x * 60) % 2).forEach((r, j) => S.put(x, y + j, r, 'b')); }
        else if (c.st === 'caught') S.put(x, y + 1 - Math.floor((C.t - c.at) * 4), '*YAY*', 'b');
        else S.put(Math.min(w - 6, x), y + 1, 'bye!', 'd');
      });
      S.wrap(C.paused ? 'PAUSED. PRESS ANY KEY.' : C.fb, w - 2).slice(0, 2).forEach((l, i) => S.center(16 + i, l, 'b'));
      const walking = C.list.filter(c => c.st === 'walk').sort((a, b) => b.x - a.x), nk = walking.length ? walking[0].k : null, known = new Set(C.keys);
      const kw = wide ? 4 : 3, x0 = Math.floor((w - 11 * kw) / 2);
      KROWS.forEach((r, ri) => [...r].forEach((k, i) => {
        const x = x0 + Math.floor(ri * kw / 2) + i * kw;
        S.put(x, 19 + ri, ' ' + k.toUpperCase() + ' ', k === nk ? 'i' : known.has(k) ? 'b' : 'd', 'key:' + k);
      }));
      S.status([['Esc=Stop', 'home'], ['Type the letters!', null]]);
    }
    let tmLast = 0;
    const origDraw = draw;
    draw = function () { if (dosMode) { const n = performance.now(); if (n - tmLast < 60) return; tmLast = n; tmRender(); } else origDraw(); };

    W.onResize = () => render();
    W.onMin = () => { if (C && view === 'catch') C.paused = true; };
    W.onClose = () => { stopCatch(); timers.forEach(clearTimeout); if (S) S.stop(); };
    go('home');
    if (dosMode) requestAnimationFrame(() => render());
  }

  const CSS_KCR = `
    .kcr{height:100%;display:flex;flex-direction:column;background:linear-gradient(#bfe9ff,#e6f8d8 60%,#a8dc80);color:#223;font-family:var(--ui);user-select:none;-webkit-user-select:none;overflow:hidden}
    .kcr.e1990{background:#aee6ff}
    .kcr-hd{display:flex;align-items:center;gap:8px;padding:4px 8px;background:#2a7a3a;color:#fff;flex:none;min-height:34px}
    .kcr.e1990 .kcr-hd{background:#008000}
    .kcr-hd b{font:400 24px/1 var(--dos);letter-spacing:1px;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .kcr-hd span{font-size:13px;white-space:nowrap}
    .kcr-back{min-height:36px;min-width:64px;background:#ffd84a;color:#503000;border:2px solid #8a6a00;border-radius:8px;font:700 14px var(--ui);cursor:pointer}
    .kcr-home{flex:1;min-height:0;overflow:auto;display:flex;flex-direction:column;align-items:center;gap:8px;padding:8px}
    .kcr-logo{font:400 clamp(32px,8vw,54px)/1 var(--dos);color:#1a5a9a;text-shadow:2px 2px #fff,4px 4px #7fc0ff;text-align:center}
    .kcr-logo span{color:#e04a1a;text-shadow:2px 2px #fff,4px 4px #ffb080}
    .kcr-parade{display:flex;gap:4px;justify-content:center;flex-wrap:wrap}
    .kcr-pc{width:52px;height:52px;animation:kcr-bob 1s ease-in-out infinite alternate}
    .kcr-pc svg,.kcr-big svg,.kcr-sticker svg,.kcr-cr svg,.kcr-wc svg{width:100%;height:100%;display:block}
    @keyframes kcr-bob{to{transform:translateY(-6px)}}
    .kcr-menu{display:flex;flex-direction:column;gap:8px;width:100%;max-width:420px}
    .kcr-big{display:flex;align-items:center;gap:12px;min-height:64px;padding:6px 14px;background:#fff;border:3px solid #2a7a3a;border-radius:14px;cursor:pointer;text-align:left;font-family:var(--ui);box-shadow:0 4px 0 #1a5a2a}
    .kcr-big:active{transform:translateY(3px);box-shadow:0 1px 0 #1a5a2a}
    .kcr-big.sel,.kcr-big:focus-visible{background:#fff6b0;outline:none}
    .kcr-big svg{width:50px;height:50px;flex:none}
    .kcr-big b{display:block;font-size:20px;color:#1a4a2a}
    .kcr-big small{font-size:13px;color:#456}
    .kcr-tip{margin:4px 0 0;font-size:14px;text-align:center}
    .kcr-scroll{flex:1;min-height:0;overflow:auto;padding:8px}
    .kcr-lgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}
    .kcr-lc{position:relative;display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 4px;background:#fff;border:3px solid #5fb8ff;border-radius:12px;cursor:pointer;font-family:var(--ui);min-height:44px}
    .kcr-lc.done{border-color:#2a9a3a;background:#f0fff0}
    .kcr-lc.sel,.kcr-lc:focus-visible{outline:3px solid #ff9a1f;outline-offset:1px}
    .kcr-lc.lock{opacity:.5;filter:grayscale(1)}
    .kcr-ln{position:absolute;left:6px;top:4px;font:400 20px var(--dos);color:#678}
    .kcr-lcr{display:flex}.kcr-lcr svg{width:44px;height:44px}
    .kcr-lc b{font:400 26px/1 var(--dos);color:#1a4a8a}
    .kcr-lc small{font-size:11px;color:#456;text-align:center}
    .kcr-st{color:#f0a000;font-size:17px;min-height:20px;font-weight:700}
    .kcr-msg{text-align:center;font-weight:700;color:#a04000}
    .kcr-les{flex:1;min-height:0;overflow:auto;display:flex;flex-direction:column;gap:6px;padding:6px 8px;align-items:center}
    .kcr-stage{display:flex;gap:8px;align-items:center;width:100%;max-width:640px}
    .kcr-cr{width:76px;height:76px;flex:none}
    .kcr-cr.hop1{animation:kcr-hop .35s}.kcr-cr.hop0{animation:kcr-hop2 .35s}
    @keyframes kcr-hop{40%{transform:translateY(-14px) rotate(-6deg)}}
    @keyframes kcr-hop2{40%{transform:translateY(-14px) rotate(6deg)}}
    .kcr-bub{position:relative;flex:1;background:#fff;border:2px solid #3b2a1e;border-radius:14px;padding:6px 10px;font-size:15px;line-height:1.3;display:flex;gap:6px;align-items:center;min-height:52px}
    .kcr-bub.bad{background:#fff3d8}
    .kcr-bub p{margin:0;flex:1}
    .kcr-bub::before{content:"";position:absolute;left:-10px;top:18px;border:8px solid transparent;border-right-color:#3b2a1e;border-left:0}
    .kcr-hear{flex:none;min-height:44px;min-width:56px;border-radius:10px;border:2px solid #1a5a9a;background:#dff0ff;color:#1a4a8a;font:700 13px var(--ui);cursor:pointer}
    .kcr-meet{display:flex;flex-direction:column;align-items:center;gap:4px}
    .kcr-bigkey{width:76px;height:70px;border-radius:12px;background:var(--fc);border:3px solid #3b2a1e;border-bottom-width:8px;font:400 52px/62px var(--dos);text-align:center;color:#222;animation:kcr-glow 1s infinite alternate}
    @keyframes kcr-glow{to{box-shadow:0 0 0 6px #fff8,0 0 18px #ff0}}
    .kcr-dots{display:flex;gap:10px}.kcr-dots i{width:18px;height:18px;border-radius:50%;border:2px solid #3b2a1e;background:#fff}.kcr-dots i.on{background:#ffc93a}
    .kcr-line{display:flex;flex-wrap:wrap;justify-content:center;gap:3px;background:#fffdf0;border:2px solid #3b2a1e;border-radius:10px;padding:8px;max-width:100%}
    .kcr-line span{min-width:26px;height:38px;display:flex;align-items:center;justify-content:center;font:400 34px/1 var(--dos);color:#345;border-bottom:3px solid transparent}
    .kcr-line span.sp{min-width:18px}
    .kcr-line span.ok{color:#2a9a3a}
    .kcr-line span.cur{background:#ffe04a;border-radius:6px;border-bottom-color:#e04a1a;animation:kcr-cur .6s infinite alternate}
    .kcr-line span.cur.sp{background:#ffe04a repeating-linear-gradient(90deg,transparent 0 3px,#e04a1a22 3px 6px)}
    @keyframes kcr-cur{to{transform:translateY(-3px)}}
    .kcr-finger{font-size:14px;padding:2px 10px;border-radius:12px;background:var(--fc);border:1px solid #0003}
    .kcr-kbw{display:flex;flex-direction:column;align-items:center;gap:4px;width:100%;max-width:560px}
    .kcr-kb{width:100%;background:#556;padding:5px;border-radius:8px;display:flex;flex-direction:column;gap:4px;box-sizing:border-box}
    .kcr-kr{display:flex;gap:3px}
    .kcr-k{position:relative;flex:1 1 0;min-width:0;height:36px;border-radius:6px;background:var(--fc);border:1px solid #333;border-bottom-width:4px;font:400 22px/1 var(--dos);color:#222;cursor:pointer;padding:0;touch-action:manipulation}
    .kcr-k.dim{filter:saturate(.35) brightness(1.1);color:#555}
    .kcr-k i{position:absolute;left:35%;right:35%;bottom:4px;height:2px;background:#333}
    .kcr-k.on{outline:3px solid #fff;z-index:1;animation:kcr-kon .5s infinite alternate;filter:none;color:#000}
    @keyframes kcr-kon{to{outline-color:#ff0;transform:translateY(-2px)}}
    .kcr-spr{justify-content:center}.kcr-sp{flex:0 1 55%;font:400 18px var(--dos)}
    .kcr-hands{width:220px;height:70px}
    .kcr-hands rect.on{stroke:#e00;stroke-width:3}
    .kcr-in{width:100%;max-width:560px;min-height:44px;font:18px var(--ui);padding:6px 10px;box-sizing:border-box;border:3px solid #ff9a1f;border-radius:10px;background:#fffbe0}
    .kcr-done{position:relative;flex:1;min-height:0;overflow:auto;display:flex;flex-direction:column;align-items:center;gap:6px;padding:10px;text-align:center}
    .kcr-conf{position:absolute;inset:0;pointer-events:none;overflow:hidden}
    .kcr-conf i{position:absolute;top:-12px;width:8px;height:12px;animation:kcr-fall 2.4s linear 2 forwards}
    @keyframes kcr-fall{to{transform:translateY(420px) rotate(540deg);opacity:0}}
    .kcr-stk{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}
    .kcr-sticker{display:flex;flex-direction:column;align-items:center;width:96px;padding:6px;background:#fff;border-radius:50% 50% 14px 14px;border:3px dashed #ff9a1f;box-shadow:2px 3px 0 #0002;animation:kcr-pop .5s}
    .kcr-sticker svg{width:64px;height:64px}
    .kcr-sticker span{font-size:12px;font-weight:700}
    .kcr-sticker small{display:block;font-weight:400;color:#567}
    .kcr-sticker.no{border-color:#bbb;background:#f4f4f4;animation:none;color:#888}
    @keyframes kcr-pop{0%{transform:scale(.3) rotate(-20deg)}70%{transform:scale(1.1)}}
    .kcr-stars{font-size:44px;color:#ffb400;text-shadow:1px 2px #a06000;letter-spacing:4px}
    .kcr-cheer{font:400 26px/1.1 var(--dos);color:#1a4a8a;margin:0}
    .kcr-stats{display:flex;gap:8px;justify-content:center;margin:0;flex-wrap:wrap}
    .kcr-stats span{background:#fff;border:2px solid #5fb8ff;border-radius:10px;padding:3px 10px;font-weight:700}
    .kcr-new{margin:0;font-weight:700;color:#2a7a3a}
    .kcr-tro{display:flex;align-items:center;gap:6px;margin:0}.kcr-tro svg{width:32px;height:32px}
    .kcr-row{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:6px}
    .kcr-btn{min-height:48px;min-width:110px;padding:6px 16px;border-radius:12px;border:3px solid #1a5a9a;background:#fff;color:#1a4a8a;font:700 16px var(--ui);cursor:pointer;box-shadow:0 3px 0 #1a4a8a}
    .kcr-btn.go{background:#2a9a3a;border-color:#1a5a2a;color:#fff;box-shadow:0 3px 0 #1a5a2a}
    .kcr-bignum{font:400 90px/1 var(--dos);color:#e04a1a;text-shadow:3px 3px #fff}
    .kcr-catch{flex:1;min-height:0;display:flex;flex-direction:column;gap:6px;padding:6px 8px;align-items:center;overflow:auto}
    .kcr-field{position:relative;width:100%;flex:1 1 auto;min-height:180px;max-height:330px;border-radius:10px;overflow:hidden;border:2px solid #3b6a2a;background:#8fd66a}
    .kcr-lane{height:33.33%;border-bottom:3px dashed #6ab04a;box-sizing:border-box;background:linear-gradient(#9fe07a,#86cc62)}
    .kcr-lane:nth-child(2){background:linear-gradient(#94d870,#7cc45a)}
    .kcr-basket{position:absolute;right:6px;top:6px;width:64px;text-align:center;background:#fff9;border-radius:10px;padding:2px}
    .kcr-basket svg{width:44px;height:33px;display:block;margin:auto}
    .kcr-cnum{font:400 26px/1 var(--dos);color:#6a3a00}
    .kcr-wc{position:absolute;left:0;top:0;transition:none;animation:kcr-walk .4s ease-in-out infinite alternate}
    .kcr-wc svg{animation:inherit}
    .kcr-wc.got{animation:kcr-got .7s forwards}
    .kcr-wc.gone{opacity:0;transition:opacity .6s}
    @keyframes kcr-walk{to{margin-top:-4px}}
    @keyframes kcr-got{to{margin-top:-120px;opacity:0;transform:scale(.4)}}
    .kcr-sign{position:absolute;right:-26px;top:-4px;width:30px;height:30px;background:#fff;border:2px solid #6a4418;border-radius:6px;font:400 26px/28px var(--dos);text-align:center;color:#222;z-index:1}
    .kcr-sign::after{content:"";position:absolute;left:12px;top:28px;width:3px;height:14px;background:#6a4418}
    .kcr-cfb{min-height:22px;font-weight:700;color:#1a4a2a;text-align:center}
    .kcr-shelf{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:14px 8px;justify-items:center;padding-bottom:6px}
    .kcr-shelf .kcr-sticker::after{content:"";position:absolute;left:-10px;right:-10px;bottom:-11px;height:6px;background:#b07840;border-radius:2px;box-shadow:0 2px 0 #7a4a20}
    .kcr-shelf .kcr-sticker{position:relative}
    .kcr-shelf .kcr-sticker{width:88px;animation:none}
    .kcr-h3{font:400 26px var(--dos);margin:10px 0 4px;color:#1a4a8a}
    .kcr-trs{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:6px}
    .kcr-tr{display:grid;grid-template-columns:36px 1fr;column-gap:6px;align-items:center;background:#fff;border-radius:10px;padding:4px 8px;border:2px solid #ffc93a}
    .kcr-tr svg{width:36px;height:36px;grid-row:span 2}
    .kcr-tr b{font-size:13px}.kcr-tr small{font-size:11px;color:#567}
    .kcr-tr.no{border-color:#ccc;color:#888}
    @media (max-width:480px){.kcr-hd{flex-wrap:wrap}.kcr-hd b{min-width:50%}.kcr-meter{font-size:11px}}
    @media (max-height:520px){.kcr-hands{display:none}.kcr-cr{width:56px;height:56px}.kcr-k{height:30px}}
  `;
  const ICON_KCR = '<svg viewBox="0 0 32 32" shape-rendering="crispEdges" aria-hidden="true"><rect x="1" y="17" width="30" height="13" fill="#c0c0c0" stroke="#000"/><g stroke="#333" stroke-width=".6"><rect x="3" y="19" width="4" height="4" fill="#ff8fc0"/><rect x="8" y="19" width="4" height="4" fill="#ffc24d"/><rect x="13" y="19" width="4" height="4" fill="#7fdc5a"/><rect x="18" y="19" width="4" height="4" fill="#5fb8ff"/><rect x="23" y="19" width="4" height="4" fill="#5fb8ff"/><rect x="8" y="25" width="16" height="3" fill="#ddd"/></g><rect x="7" y="7" width="12" height="9" fill="#5cc84a" stroke="#000"/><rect x="6" y="4" width="5" height="5" fill="#5cc84a" stroke="#000"/><rect x="15" y="4" width="5" height="5" fill="#5cc84a" stroke="#000"/><rect x="7" y="5" width="3" height="3" fill="#fff"/><rect x="16" y="5" width="3" height="3" fill="#fff"/><rect x="8" y="6" width="1" height="1" fill="#000"/><rect x="17" y="6" width="1" height="1" fill="#000"/><rect x="10" y="12" width="6" height="1" fill="#000"/><rect x="22" y="9" width="8" height="7" fill="#fff" stroke="#000"/><rect x="25" y="10" width="2" height="5" fill="#000"/></svg>';

  /* ================= CODE TURTLE ================= */
  const PAL16 = ['#000000', '#0000aa', '#00aa00', '#00aaaa', '#aa0000', '#aa00aa', '#aa5500', '#aaaaaa', '#555555', '#5555ff', '#55ff55', '#55ffff', '#ff5555', '#ff55ff', '#ffff55', '#ffffff'];
  const PALN = ['black', 'blue', 'green', 'cyan', 'red', 'magenta', 'brown', 'light gray', 'dark gray', 'light blue', 'light green', 'light cyan', 'light red', 'pink', 'yellow', 'white'];
  const TCMD = { FORWARD: 'FD', FD: 'FD', BACK: 'BK', BK: 'BK', BACKWARD: 'BK', RIGHT: 'RT', RT: 'RT', LEFT: 'LT', LT: 'LT', PENUP: 'PU', PU: 'PU', PENDOWN: 'PD', PD: 'PD', CLEARSCREEN: 'CS', CS: 'CS', HOME: 'HOME', SETCOLOR: 'SETPC', SETPC: 'SETPC', SETPENCOLOR: 'SETPC', REPEAT: 'REPEAT', HIDETURTLE: 'HT', HT: 'HT', SHOWTURTLE: 'ST', ST: 'ST', CLEAN: 'CLEAN', SETHEADING: 'SETH', SETH: 'SETH', IF: 'IF', STOP: 'STOP', PRINT: 'PRINT', PR: 'PRINT', SETXY: 'SETXY' };
  const TLONG = { FD: 'FORWARD', BK: 'BACK', RT: 'RIGHT', LT: 'LEFT', SETPC: 'SETCOLOR', SETH: 'SETHEADING', PRINT: 'PRINT', SETXY: 'SETXY', REPEAT: 'REPEAT', IF: 'IF' };
  const TEX = { FD: 'FORWARD 50', BK: 'BACK 50', RT: 'RIGHT 90', LT: 'LEFT 90', SETPC: 'SETCOLOR 4', SETH: 'SETHEADING 90', PRINT: 'PRINT 2 + 2', SETXY: 'SETXY 50 100', REPEAT: 'REPEAT 4 [FD 50 RT 90]', IF: 'IF :SIZE > 100 [STOP]' };
  const TNAMES = Object.keys(TCMD).concat(['TO', 'END', 'REPCOUNT', 'RANDOM']);
  const KIDWORDS = { JUMP: 'Try FORWARD 50.', WALK: 'Try FORWARD 50.', MOVE: 'Try FORWARD 50.', GO: 'Try FORWARD 50.', UP: 'Try FORWARD 50.', DOWN: 'Try BACK 50.', TURN: 'Try RIGHT 90 or LEFT 90.', SPIN: 'Try RIGHT 360.', CLEAR: 'Try CLEARSCREEN (or CS).', ERASE: 'Try CLEARSCREEN (or CS).', DRAW: 'Try PENDOWN, then FORWARD 50.', COLOR: 'Try SETCOLOR 4.', COLOUR: 'Try SETCOLOR 4.', LOOP: 'Try REPEAT 4 [FD 50 RT 90].', SQUARE: 'Try REPEAT 4 [FD 50 RT 90], or teach me with TO SQUARE.', CIRCLE: 'Try REPEAT 36 [FD 10 RT 10], or teach me with TO CIRCLE.', STAR: 'Try REPEAT 5 [FD 100 RT 144].', HELLO: 'Hello to you too! Try FORWARD 50.', HI: 'Hi there! Try FORWARD 50.' };
  const TLESS = [
    ['Corner', 'FD 100 RT 90 FD 100', 'Go FORWARD 100. Turn RIGHT 90. Go FORWARD 100 again.'],
    ['Square', 'FD 100 RT 90 FD 100 RT 90 FD 100 RT 90 FD 100 RT 90', 'A square has 4 sides that are all the same length. Go FORWARD 100, then turn RIGHT 90. Do that 4 times.'],
    ['Magic REPEAT', 'REPEAT 4 [FD 100 RT 90]', 'Draw the square again, but let REPEAT do the work. REPEAT 4 [ ... ] does what is in the brackets 4 times.', 'REPEAT'],
    ['Triangle', 'REPEAT 3 [FD 100 RT 120]', 'A triangle has 3 sides. The turtle turns 360 degrees to go all the way around, and 360 divided by 3 is 120.'],
    ['Stairs', 'REPEAT 4 [FD 30 RT 90 FD 30 LT 90]', 'One step is: FORWARD 30, RIGHT 90, FORWARD 30, LEFT 90. REPEAT that 4 times to climb the stairs.'],
    ['Star', 'REPEAT 5 [FD 150 RT 144]', 'A star has 5 points. Go FORWARD 150 and turn RIGHT 144. Do that 5 times.'],
    ['House', 'REPEAT 4 [FD 100 RT 90] FD 100 RT 30 REPEAT 3 [FD 100 RT 120]', 'First draw a square with sides of 100. Then go FORWARD 100 to the top corner, turn RIGHT 30, and draw a triangle roof.'],
    ['Circle', 'REPEAT 36 [FD 10 RT 10]', 'A circle is lots of tiny steps and tiny turns. REPEAT 36 times: FORWARD 10 and RIGHT 10.'],
    ['Flower', 'REPEAT 12 [REPEAT 4 [FD 60 RT 90] RT 30]', 'Draw a square with sides of 60, then turn RIGHT 30. Do that 12 times. You can put a REPEAT inside a REPEAT!'],
    ['Spiral', 'TO SPIRAL :SIZE\n  IF :SIZE > 150 [STOP]\n  FD :SIZE RT 90\n  SPIRAL :SIZE + 10\nEND\nSPIRAL 10', 'Teach the turtle a procedure with an input: TO SPIRAL :SIZE. It goes FORWARD :SIZE, turns RIGHT 90, then calls SPIRAL :SIZE + 10. Add IF :SIZE > 150 [STOP] so it knows when to stop. Finish with END, then type SPIRAL 10.', 'TO']
  ];
  function editDist(a, b) {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i].concat(Array(b.length).fill(0)));
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[a.length][b.length];
  }
  class LogoErr extends Error {}
  const lerr = m => new LogoErr(m);
  function ltok(src) {
    const T = []; let i = 0; const n = src.length;
    while (i < n) {
      const c = src[i];
      if (/\s/.test(c)) { i++; continue; }
      if (c === ';') { while (i < n && src[i] !== '\n') i++; continue; }
      if ('[]()+-*/<>='.includes(c)) { T.push({ t: c }); i++; continue; }
      if (/[0-9.]/.test(c)) {
        let j = i; while (j < n && /[0-9.]/.test(src[j])) j++;
        const s = src.slice(i, j), v = Number(s);
        if (!isFinite(v)) throw lerr(`I don't understand the number ${s}.`);
        if (j < n && /[A-Za-z]/.test(src[j])) throw lerr(`Put a space after ${s}.`);
        T.push({ t: 'num', v }); i = j; continue;
      }
      if (c === ':') {
        let j = i + 1; while (j < n && /[A-Za-z0-9_]/.test(src[j])) j++;
        if (j === i + 1) throw lerr('A : needs a name right after it, like :SIZE.');
        T.push({ t: 'var', v: src.slice(i + 1, j).toUpperCase() }); i = j; continue;
      }
      if (/[A-Za-z_]/.test(c)) {
        let j = i; while (j < n && /[A-Za-z0-9_?]/.test(src[j])) j++;
        const w = src.slice(i, j).toUpperCase(), m = /^([A-Z]+)(\d+)$/.exec(w);
        if (m && TCMD[m[1]]) throw lerr(`Put a space between ${m[1]} and ${m[2]}, like this: ${m[1]} ${m[2]}`);
        T.push({ t: 'word', v: w }); i = j; continue;
      }
      if (c === '"' || c === "'") throw lerr('I don\'t need quote marks. Try it without them.');
      if (c === ',') throw lerr('I don\'t need commas. Just put spaces between things, like FD 50 RT 90.');
      throw lerr(`I don't understand the symbol ${c}`);
    }
    return T;
  }
  const detok = T => T.map(t => t.t === 'num' ? String(t.v) : t.t === 'var' ? ':' + t.v : t.t === 'word' ? t.v : t.t).join(' ').replace(/\[ /g, '[').replace(/ \]/g, ']').replace(/\( /g, '(').replace(/ \)/g, ')');
  const procSrc = (name, P) => `TO ${name}${P.params.map(p => ' :' + p).join('')}\n  ${detok(P.body)}\nEND`;
  // Run source text. M is the model: { t: turtle, procs, segs, flags }. Returns { ops, err }.
  function logoRun(src, M) {
    const ops = []; let steps = 0; const rep = [];
    const T = M.t;
    const STOP = {};
    const toks = ltok(src);
    const move = (x1, y1) => {
      if (Math.hypot(x1 - T.x, y1 - T.y) > 1e-9) {
        ops.push({ t: 'mv', x0: T.x, y0: T.y, x1, y1, pen: T.pen, col: T.col });
        if (T.pen) { M.segs.push([T.x, T.y, x1, y1]); if (M.segs.length > 40000) throw lerr('That drawing has so many lines that I ran out of room! Try smaller numbers.'); }
      }
      T.x = x1; T.y = y1;
    };
    const turn = h1 => { ops.push({ t: 'tn', h0: T.h, h1 }); T.h = h1; };
    function exec(tk, scope, depth) {
      let p = 0;
      const need = name => lerr(`${TLONG[name] || name} needs ${name === 'REPEAT' ? 'a number and a list in [ brackets ]' : name === 'SETXY' ? 'two numbers' : 'a number'} after it, like ${TEX[name] || name + ' 50'}.`);
      const isVal = t => t && (t.t === 'num' || t.t === 'var' || t.t === '(' || t.t === '-' || (t.t === 'word' && (t.v === 'REPCOUNT' || t.v === 'RANDOM' || t.v === 'HEADING')));
      function expr(name) { if (!isVal(tk[p])) throw need(name); let a = sum(name); while (tk[p] && '<>='.includes(tk[p].t) && tk[p].t.length === 1) { const o = tk[p++].t, b = sum(name); a = o === '<' ? +(a < b) : o === '>' ? +(a > b) : +(Math.abs(a - b) < 1e-9); } return a; }
      function sum(name) { let a = term(name); while (tk[p] && (tk[p].t === '+' || tk[p].t === '-')) { const o = tk[p++].t, b = term(name); a = o === '+' ? a + b : a - b; } return a; }
      function term(name) { let a = un(name); while (tk[p] && (tk[p].t === '*' || tk[p].t === '/')) { const o = tk[p++].t, b = un(name); if (o === '/' && b === 0) throw lerr('Oops! Nobody can divide by zero, not even a turtle.'); a = o === '*' ? a * b : a / b; } return a; }
      function un(name) { if (tk[p] && tk[p].t === '-') { p++; return -un(name); } return prim(name); }
      function prim(name) {
        const t = tk[p];
        if (!t) throw need(name);
        if (t.t === 'num') { p++; return t.v; }
        if (t.t === 'var') { p++; if (!(t.v in scope)) throw lerr(`I don't know what :${t.v} is. Words like :${t.v} only work inside a procedure that starts with TO NAME :${t.v}.`); return scope[t.v]; }
        if (t.t === '(') { p++; const v = expr(name); if (!tk[p] || tk[p].t !== ')') throw lerr('I see a ( without a ). Every ( needs a ) to close it.'); p++; return v; }
        if (t.t === 'word' && t.v === 'REPCOUNT') { p++; return rep.length ? rep[rep.length - 1] : 0; }
        if (t.t === 'word' && t.v === 'HEADING') { p++; return ((T.h % 360) + 360) % 360; }
        if (t.t === 'word' && t.v === 'RANDOM') { p++; const n = Math.floor(un('RANDOM')); return Math.floor(Math.random() * Math.max(1, n)); }
        throw need(name);
      }
      function block(name) {
        if (!tk[p] || tk[p].t !== '[') throw need(name);
        let d = 0; const s = p;
        for (; p < tk.length; p++) { if (tk[p].t === '[') d++; else if (tk[p].t === ']') { d--; if (d === 0) { p++; return tk.slice(s + 1, p - 1); } } }
        throw lerr('I see a [ without a ]. Every [ needs a ] to close it.');
      }
      while (p < tk.length) {
        if (++steps > 60000) throw lerr('Phew! That was more than 60,000 steps, so I stopped. Does your procedure have a STOP?');
        const t = tk[p];
        if (t.t === 'num') throw lerr(`You gave me ${t.v}, but what should I do with it? Try FORWARD ${t.v}.`);
        if (t.t === ']') throw lerr('There\'s an extra ] here. Every ] needs a [ before it.');
        if (t.t === '[') throw lerr('A [ list ] needs a command in front of it, like REPEAT 4 [FD 50 RT 90].');
        if (t.t === 'var') throw lerr(`You gave me :${t.v}, but what should I do with it? Try FORWARD :${t.v}.`);
        if (t.t !== 'word') throw lerr(`I don't know what to do with ${t.t} here.`);
        p++;
        const w = t.v, c = TCMD[w];
        if (w === 'TO') {
          const nm = tk[p]; if (!nm || nm.t !== 'word') throw lerr('TO needs a name for your procedure, like TO SQUARE.');
          if (TCMD[nm.v] || nm.v === 'TO' || nm.v === 'END') throw lerr(`${nm.v} is already one of my commands. Pick another name, like TO MY${nm.v}.`);
          p++; const params = [];
          while (tk[p] && tk[p].t === 'var') params.push(tk[p++].v);
          const s = p; while (p < tk.length && !(tk[p].t === 'word' && tk[p].v === 'END')) { if (tk[p].t === 'word' && tk[p].v === 'TO') throw lerr('Oops, a TO inside a TO. Finish the first procedure with END.'); p++; }
          if (p >= tk.length) throw lerr(`Your procedure ${nm.v} needs END at the end.`);
          M.procs[nm.v] = { params, body: tk.slice(s, p) }; p++;
          ops.push({ t: 'say', text: `Now I know how to ${nm.v}!`, ok: true });
          continue;
        }
        if (w === 'END') throw lerr('END goes at the end of a procedure that starts with TO.');
        if (c) {
          if (c === 'FD' || c === 'BK') { const n = expr(c) * (c === 'BK' ? -1 : 1), r = T.h * Math.PI / 180; move(T.x + n * Math.sin(r), T.y + n * Math.cos(r)); }
          else if (c === 'RT' || c === 'LT') { const n = expr(c); turn(T.h + (c === 'RT' ? n : -n)); }
          else if (c === 'SETH') { const n = expr(c); turn(n); }
          else if (c === 'PU') { T.pen = false; }
          else if (c === 'PD') { T.pen = true; }
          else if (c === 'CS') { T.x = 0; T.y = 0; T.h = 0; T.pen = true; M.segs.length = 0; M.flags = {}; ops.push({ t: 'cs' }); }
          else if (c === 'CLEAN') { M.segs.length = 0; M.flags = {}; ops.push({ t: 'clean' }); }
          else if (c === 'HOME') { move(0, 0); turn(0); }
          else if (c === 'SETXY') { const x = expr(c), y = expr(c); move(x, y); }
          else if (c === 'SETPC') { const n = Math.round(expr(c)); if (n < 0 || n > 15) throw lerr(`I only have colors 0 to 15. Try SETCOLOR 4 for red.`); T.col = n; ops.push({ t: 'pc', col: n }); }
          else if (c === 'HT' || c === 'ST') { T.shown = c === 'ST'; ops.push({ t: 'vis', v: T.shown }); }
          else if (c === 'PRINT') { const v = expr(c); ops.push({ t: 'say', text: String(+v.toFixed(4)) }); }
          else if (c === 'STOP') { return STOP; }
          else if (c === 'REPEAT') {
            M.flags.repeat = true;
            const n = Math.round(expr(c)), b = block(c);
            if (n > 10000) throw lerr('That is too many repeats for me! Try a number smaller than 10000.');
            for (let i = 1; i <= n; i++) { rep.push(i); const r = exec(b, scope, depth); rep.pop(); if (r === STOP) return STOP; }
          } else if (c === 'IF') {
            const v = expr(c), b = block(c);
            if (v) { const r = exec(b, scope, depth); if (r === STOP) return STOP; }
          }
          continue;
        }
        const P = M.procs[w];
        if (P) {
          const sc = {}; P.params.forEach(n => { if (!isVal(tk[p])) throw lerr(`${w} needs ${P.params.length === 1 ? 'a number' : P.params.length + ' numbers'} after it, like ${w} ${P.params.map(() => 50).join(' ')}.`); sc[n] = expr(w); });
          if (depth > 400) throw lerr(`${w} called itself so many times that I got dizzy! Add a line like IF :SIZE > 150 [STOP] so it knows when to stop.`);
          M.flags.proc = true;
          exec(P.body, sc, depth + 1);
          continue;
        }
        let hint = KIDWORDS[w];
        if (!hint) { const best = TNAMES.map(n => [editDist(w, n), n]).sort((a, b) => a[0] - b[0])[0]; hint = best && best[0] <= (w.length > 4 ? 2 : 1) ? `Did you mean ${best[1]}?` : 'Try FORWARD 50.'; }
        throw lerr(`I don't know how to ${w}. ${hint}`);
      }
      return null;
    }
    try { exec(toks, {}, 0); return { ops }; }
    catch (e) { if (e instanceof LogoErr) return { ops, err: e.message }; throw e; }
  }
  // Compare two drawings, ignoring position, size, rotation by 90s and mirroring.
  function shapeMatch(A, B) {
    if (!A.length || !B.length) return false;
    const N = 28;
    const norm = S2 => {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      S2.forEach(s => { x0 = Math.min(x0, s[0], s[2]); x1 = Math.max(x1, s[0], s[2]); y0 = Math.min(y0, s[1], s[3]); y1 = Math.max(y1, s[1], s[3]); });
      const sz = Math.max(x1 - x0, y1 - y0) || 1, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      return { segs: S2.map(s => [(s[0] - cx) / sz, (s[1] - cy) / sz, (s[2] - cx) / sz, (s[3] - cy) / sz]), ratio: (x1 - x0 + 1e-6) / (y1 - y0 + 1e-6) };
    };
    const rast = (segs, f) => {
      const g = new Uint8Array(N * N);
      segs.forEach(s => {
        const [ax, ay] = f(s[0], s[1]), [bx, by] = f(s[2], s[3]);
        const n = Math.ceil(Math.hypot(bx - ax, by - ay) * N * 2) + 1;
        for (let i = 0; i <= n; i++) { const x = ax + (bx - ax) * i / n, y = ay + (by - ay) * i / n; const gx = clamp(Math.round((x + 0.5) * (N - 1)), 0, N - 1), gy = clamp(Math.round((y + 0.5) * (N - 1)), 0, N - 1); g[gy * N + gx] = 1; }
      });
      return g;
    };
    const dil = g => { const o = new Uint8Array(N * N); for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (g[y * N + x]) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < N && Y < N) o[Y * N + X] = 1; } return o; };
    const cover = (a, b) => { let n = 0, k = 0; for (let i = 0; i < a.length; i++) if (a[i]) { n++; if (b[i]) k++; } return n ? k / n : 0; };
    const nA = norm(A), nB = norm(B), gB = rast(nB.segs, (x, y) => [x, y]), dB = dil(gB);
    const TF = [(x, y) => [x, y], (x, y) => [-x, y], (x, y) => [x, -y], (x, y) => [-x, -y], (x, y) => [y, x], (x, y) => [-y, x], (x, y) => [y, -x], (x, y) => [-y, -x]];
    return TF.some(f => { const gA = rast(nA.segs, f); return cover(gA, dB) >= 0.9 && cover(gB, dil(gA)) >= 0.9; });
  }
  function goalSegs(src) { const M = { t: { x: 0, y: 0, h: 0, pen: true, col: 0, shown: true }, procs: {}, segs: [], flags: {} }; logoRun(src, M); return M.segs; }
  function drawThumb(cv, segs, col, bg) {
    const r = cv.getBoundingClientRect(), dpr = window.devicePixelRatio || 1, w = Math.max(40, r.width || 80), h = Math.max(40, r.height || 80);
    cv.width = w * dpr; cv.height = h * dpr;
    const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.fillStyle = bg; c.fillRect(0, 0, w, h);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    segs.forEach(s => { x0 = Math.min(x0, s[0], s[2]); x1 = Math.max(x1, s[0], s[2]); y0 = Math.min(y0, s[1], s[3]); y1 = Math.max(y1, s[1], s[3]); });
    const sc = Math.min((w - 12) / Math.max(1, x1 - x0), (h - 12) / Math.max(1, y1 - y0)), ox = w / 2 - (x0 + x1) / 2 * sc, oy = h / 2 + (y0 + y1) / 2 * sc;
    c.strokeStyle = col; c.lineWidth = 1.6; c.lineCap = 'round'; c.beginPath();
    segs.forEach(s => { c.moveTo(ox + s[0] * sc, oy - s[1] * sc); c.lineTo(ox + s[2] * sc, oy - s[3] * sc); });
    c.stroke();
  }

  function openTurtle(W, api) {
    const dosMode = api.era.id === '1985', paper = !dosMode && api.era.id !== '1990', E = api.esc;
    const defCol = paper ? 0 : 15, BG = paper ? '#ffffff' : '#000000';
    const ST = Object.assign({ procs: {}, hist: [], speed: 1, solved: {}, helped: {}, progs: {}, talk: true, les: -1 }, api.load('state', {}));
    const M = { t: { x: 0, y: 0, h: 0, pen: true, col: defCol, shown: true }, procs: {}, segs: [], flags: {} };
    Object.entries(ST.procs).forEach(([n, s]) => { try { logoRun(s, M); } catch (e) { /* ignore bad saved procedure */ } });
    M.segs = []; M.flags = {};
    const saveST = () => { ST.procs = Object.fromEntries(Object.entries(M.procs).map(([n, P]) => [n, procSrc(n, P)])); ST.hist = ST.hist.slice(-60); api.save('state', ST); };
    const say = t => { if (ST.talk) api.say(t); };
    const SPEEDS = [['Slow', 90, 200], ['Medium', 400, 900], ['Fast', 1600, 4000], ['Instant', Infinity, Infinity]];
    const setEsc = escKeeper(W);
    let defining = null, hi = ST.hist.length, overlay = null, raf = 0, lastT = 0, queue = [], drawn = [], cmdsSinceCS = [];
    const disp = { x: 0, y: 0, h: 0, pen: true, col: defCol, shown: true };
    const phosCol = () => (getComputedStyle(W.body).getPropertyValue('--phos') || '').trim() || '#33ff66';
    const colOf = n => dosMode ? (n === 0 ? '#000000' : phosCol()) : (paper && n === 15 ? '#ffffff' : PAL16[n]);

    W.body.innerHTML = `<div class="ctl${dosMode ? ' dos' : ''} e${api.era.id}">
      ${dosMode ? '<div class="ctl-bar"><span>CODE TURTLE  Logo 1.0</span><span class="ctl-fk"><button data-a="help">F1 Help</button><button data-a="les">F2 Lessons</button><button data-a="speed">F3 Speed</button><button data-a="edit">F4 Edit</button><button data-a="save">F5 Save</button></span></div>' : ''}
      <div class="ctl-main">
        <div class="ctl-cvw"><canvas class="ctl-paper"></canvas><canvas class="ctl-tur"></canvas><div class="ctl-goal" hidden></div></div>
        <div class="ctl-side" hidden></div>
      </div>
      <div class="ctl-quick">${['FD 50', 'BK 50', 'RT 90', 'LT 90', 'PU', 'PD', 'CS'].map(c => `<button class="ctl-q" data-q="${c}">${c}</button>`).join('')}<button class="ctl-q ctl-lb" data-a="les">Lessons</button></div>
      <div class="ctl-con" aria-live="polite"></div>
      <div class="ctl-inrow"><span class="ctl-pr">?</span><input class="ctl-in" type="text" autocomplete="off" autocorrect="off" autocapitalize="characters" spellcheck="false" enterkeyhint="go" aria-label="Type a turtle command" placeholder="Type a command, like FD 50"><button class="ctl-run" data-a="run">Run</button><button class="ctl-sp" data-a="speed"></button></div>
      <div class="ctl-ov" hidden></div>
    </div>`;
    const root = W.body.firstChild, $ = s => root.querySelector(s);
    const cvP = $('.ctl-paper'), cvT = $('.ctl-tur'), con = $('.ctl-con'), inp = $('.ctl-in'), side = $('.ctl-side'), ov = $('.ctl-ov');
    const cP = cvP.getContext('2d'), cT = cvT.getContext('2d');
    let VW = 100, VH = 100, SC = 1, dpr = 1;

    api.menubar([
      { label: 'File', items: [
        { label: 'New (clear everything)', fn: () => { runLine('CS'); } },
        { label: 'Save program...', fn: showSave }, { label: 'Open program...', fn: showSave },
        '-', { label: 'Exit', fn: () => api.close() }] },
      { label: 'Turtle', items: () => [
        ...SPEEDS.map((s, i) => ({ label: (ST.speed === i ? '(o) ' : '( ) ') + s[0] + ' speed', fn: () => { ST.speed = i; saveST(); showSpeed(); } })),
        '-', { label: 'Edit procedures...', fn: showEdit }, { label: 'Clear screen', fn: () => runLine('CS') },
        { label: (ST.talk ? '[x] ' : '[ ] ') + 'Read aloud', fn: () => { ST.talk = !ST.talk; saveST(); } }] },
      { label: 'Lessons', items: () => TLESS.map((L, i) => ({ label: `${ST.solved[i] ? '[x]' : '[ ]'} ${i + 1}. ${L[0]}`, fn: () => openLesson(i) })).concat(['-', { label: 'Show lesson list', fn: showLessons }]) },
      { label: 'Help', items: [{ label: 'How to play', fn: howTo }, { label: 'Command list', fn: cmdList }, { label: 'Colors', fn: () => api.msgBox('Colors', PALN.map((n, i) => `${i} ${n}`).join('\n') + (dosMode ? '\n\nThis monitor shows every color in one color, except 0 (black) which erases.' : paper ? '\n\n15 (white) is the same as the paper, so it erases.' : '\n\n0 (black) is the same as the screen, so it erases.')) }] }
    ]);
    function howTo() {
      api.msgBox('How to play', 'The turtle carries a pen. Type commands and press Enter (or tap Run) to make it move and draw.\n\nFD 50 goes forward 50 steps. RT 90 turns right. Try the buttons above the typing line too!\n\nREPEAT 4 [FD 50 RT 90] draws a square.\n\nTeach the turtle new words:\nTO SQUARE\n  REPEAT 4 [FD 50 RT 90]\nEND\nThen type SQUARE.\n\nOpen Lessons for 10 challenges. Solve one without "Show me" to earn $1 (up to $5 a day). Use the up arrow to bring back what you typed before.');
    }
    function cmdList() {
      api.msgBox('Commands', 'FORWARD n (FD)    BACK n (BK)\nRIGHT deg (RT)    LEFT deg (LT)\nPENUP (PU)        PENDOWN (PD)\nCLEARSCREEN (CS)  HOME   CLEAN\nSETCOLOR n (SETPC)  colors 0 to 15\nSETHEADING deg (SETH)  SETXY x y\nHIDETURTLE (HT)   SHOWTURTLE (ST)\nREPEAT n [ ... ]  REPCOUNT\nTO NAME :INPUT ... END\nIF :X > 10 [ ... ]   STOP\nPRINT n   RANDOM n\n\nMath works too: FD 20 * 3, RT 360 / 5');
    }

    /* ---- console ---- */
    function out(text, cls = '') {
      const d = document.createElement('div'); d.className = 'ctl-l ' + cls; d.textContent = text; con.appendChild(d);
      while (con.children.length > 150) con.firstChild.remove();
      con.scrollTop = con.scrollHeight;
    }
    function showSpeed() { $('.ctl-sp').textContent = (dosMode ? '' : 'Speed: ') + SPEEDS[ST.speed][0]; }

    /* ---- canvas ---- */
    function fit() {
      const w = $('.ctl-cvw'), r = w.getBoundingClientRect();
      VW = Math.max(50, r.width); VH = Math.max(50, r.height); dpr = window.devicePixelRatio || 1;
      [cvP, cvT].forEach(c => { c.width = Math.round(VW * dpr); c.height = Math.round(VH * dpr); c.style.width = VW + 'px'; c.style.height = VH + 'px'; });
      SC = Math.min(VW, VH) / 380;
      redraw();
    }
    const sx = x => VW / 2 + x * SC, sy = y => VH / 2 - y * SC;
    function seg(x0, y0, x1, y1, col) {
      cP.setTransform(dpr, 0, 0, dpr, 0, 0);
      cP.strokeStyle = colOf(col); cP.lineWidth = dosMode ? 2 : Math.max(1.5, SC * 1.6); cP.lineCap = 'round';
      cP.beginPath(); cP.moveTo(sx(x0), sy(y0)); cP.lineTo(sx(x1), sy(y1)); cP.stroke();
    }
    let ghost = null;
    function redraw() {
      cP.setTransform(dpr, 0, 0, dpr, 0, 0); cP.fillStyle = BG; cP.fillRect(0, 0, VW, VH);
      if (ghost) {
        cP.save(); cP.setLineDash([4, 5]); cP.globalAlpha = paper ? 0.35 : 0.4;
        ghost.forEach(s => seg(s[0], s[1], s[2], s[3], dosMode ? 1 : paper ? 9 : 7)); cP.restore();
      }
      drawn.forEach(s => seg(s[0], s[1], s[2], s[3], s[4]));
      drawTurtle();
    }
    function drawTurtle() {
      cT.setTransform(dpr, 0, 0, dpr, 0, 0); cT.clearRect(0, 0, VW, VH);
      if (!disp.shown) return;
      const r = disp.h * Math.PI / 180, x = sx(disp.x), y = sy(disp.y), s = dosMode ? 11 : 13;
      const pt = (a, d) => [x + Math.sin(r + a) * d, y - Math.cos(r + a) * d];
      cT.beginPath(); const p1 = pt(0, s), p2 = pt(2.5, s * 0.75), p3 = pt(-2.5, s * 0.75);
      cT.moveTo(...p1); cT.lineTo(...p2); cT.lineTo(...p3); cT.closePath();
      if (dosMode) { cT.strokeStyle = phosCol(); cT.lineWidth = 2; cT.stroke(); }
      else { cT.fillStyle = paper ? '#2a9a3a' : '#55ff55'; cT.globalAlpha = 0.85; cT.fill(); cT.globalAlpha = 1; cT.strokeStyle = paper ? '#0a4a1a' : '#fff'; cT.lineWidth = 1.5; cT.stroke(); cT.fillStyle = colOf(disp.col); cT.beginPath(); cT.arc(x, y, 2.6, 0, 7); cT.fill(); }
    }

    /* ---- player ---- */
    function play(ops) { queue.push(...ops); if (!raf) { lastT = 0; raf = requestAnimationFrame(step); } }
    function step(t) {
      raf = 0;
      const dt = lastT ? Math.min(0.1, (t - lastT) / 1000) : 1 / 60; lastT = t;
      const sp = SPEEDS[ST.speed];
      let bd = sp[1] * dt, ba = sp[2] * dt;
      if (queue.length > 3000 && ST.speed < 3) { bd *= queue.length / 3000; ba *= queue.length / 3000; }
      while (queue.length && (bd > 0 || ba > 0)) {
        const o = queue[0];
        if (o.t === 'mv') {
          const L = Math.hypot(o.x1 - o.x0, o.y1 - o.y0), d0 = o.d || 0;
          const need = (L - d0) / (o.pen ? 1 : 3);
          if (bd <= 0) break;
          const adv = Math.min(need, bd); bd -= adv;
          const d1 = d0 + adv * (o.pen ? 1 : 3), f0 = d0 / L, f1 = Math.min(1, d1 / L);
          const ax = o.x0 + (o.x1 - o.x0) * f0, ay = o.y0 + (o.y1 - o.y0) * f0, bx = o.x0 + (o.x1 - o.x0) * f1, by = o.y0 + (o.y1 - o.y0) * f1;
          if (o.pen) seg(ax, ay, bx, by, o.col);
          disp.x = bx; disp.y = by; o.d = d1;
          if (f1 >= 1) { if (o.pen) drawn.push([o.x0, o.y0, o.x1, o.y1, o.col]); queue.shift(); }
        } else if (o.t === 'tn') {
          if (ba <= 0) break;
          const rem = o.h1 - (o.c == null ? o.h0 : o.c), adv = Math.sign(rem) * Math.min(Math.abs(rem), ba); ba -= Math.abs(adv);
          o.c = (o.c == null ? o.h0 : o.c) + adv; disp.h = o.c;
          if (Math.abs(o.h1 - o.c) < 1e-9) queue.shift();
        } else {
          queue.shift();
          if (o.t === 'cs') { drawn = []; disp.x = 0; disp.y = 0; disp.h = 0; redraw(); }
          else if (o.t === 'clean') { drawn = []; redraw(); }
          else if (o.t === 'pc') disp.col = o.col;
          else if (o.t === 'vis') disp.shown = o.v;
          else if (o.t === 'say') out(o.text, o.ok ? 'ok' : 'pr');
          else if (o.t === 'done') o.fn();
        }
        if (sp[1] === Infinity) { bd = Infinity; ba = Infinity; }
      }
      drawTurtle();
      if (queue.length) raf = requestAnimationFrame(step);
    }

    /* ---- running commands ---- */
    function runLine(line, quiet) {
      line = String(line).trim(); if (!line) return;
      const up = line.toUpperCase();
      if (defining) {
        out('> ' + line, 'cmd');
        if (/^END\b/.test(up)) { const src = defining.join('\n') + '\nEND'; defining = null; $('.ctl-pr').textContent = '?'; exec(src, false); }
        else defining.push(line);
        return;
      }
      if (!quiet) { out('? ' + line, 'cmd'); ST.hist.push(line); hi = ST.hist.length; }
      if (/^TO\s/.test(up) && !/\bEND\b/.test(up)) {
        try { const tk = ltok(line); if (!tk[1] || tk[1].t !== 'word') throw lerr('TO needs a name for your procedure, like TO SQUARE.'); if (TCMD[tk[1].v]) throw lerr(`${tk[1].v} is already one of my commands. Pick another name.`); }
        catch (e) { if (e instanceof LogoErr) { out(e.message, 'err'); api.sfx.beep(); return; } throw e; }
        defining = [line]; $('.ctl-pr').textContent = '>';
        out('Now type the steps, one line at a time. Type END when you are done.', 'pr');
        return;
      }
      exec(line, true);
    }
    function exec(src, record) {
      let res;
      try { res = logoRun(src, M); } catch (e) { if (e instanceof LogoErr) res = { ops: [], err: e.message }; else throw e; }
      if (record) { if (res.ops.some(o => o.t === 'cs')) cmdsSinceCS = []; cmdsSinceCS.push(src); }
      play(res.ops);
      if (res.err) play([{ t: 'done', fn: () => { out(res.err, 'err'); api.tone(300, 0.12, { type: 'triangle', vol: 0.06 }); } }]);
      play([{ t: 'done', fn: checkLesson }]);
      saveST();
    }

    /* ---- lessons ---- */
    const thumbs = TLESS.map(L => goalSegs(L[1]));
    function showLessons() {
      side.hidden = false; root.classList.add('side-on');
      const cur = ST.les;
      side.innerHTML = `<div class="ctl-sh"><b>Lessons</b><span>${Object.keys(ST.solved).length} of ${TLESS.length} solved</span><button class="ctl-x" data-a="closeside" aria-label="Close lessons">X</button></div>
        ${cur >= 0 ? lessonCard(cur) : '<p class="ctl-tip">Pick a challenge. Try to draw the picture!</p>'}
        <div class="ctl-ll">${TLESS.map((L, i) => `<button class="ctl-li${i === cur ? ' on' : ''}" data-l="${i}"><canvas data-th="${i}"></canvas><span>${i + 1}. ${E(L[0])}</span><i>${ST.solved[i] ? (dosMode ? '[OK]' : '&#10003;') : ''}</i></button>`).join('')}</div>`;
      bind(side);
      side.querySelectorAll('[data-l]').forEach(b => b.onclick = () => openLesson(+b.dataset.l));
      requestAnimationFrame(() => { side.querySelectorAll('canvas[data-th]').forEach(c => drawThumb(c, thumbs[+c.dataset.th], dosMode ? phosCol() : paper ? '#000' : '#fff', dosMode ? '#000' : BG)); const g = side.querySelector('canvas.ctl-gl'); if (g) drawThumb(g, thumbs[cur], dosMode ? phosCol() : paper ? '#1a5acc' : '#55ffff', dosMode ? '#000' : BG); fit(); });
      setEsc(false);
    }
    function lessonCard(i) {
      const L = TLESS[i];
      return `<div class="ctl-card"><div class="ctl-ct">Challenge ${i + 1}: ${E(L[0])}${ST.solved[i] ? ' <em>Solved!</em>' : ''}</div><canvas class="ctl-gl"></canvas>
        <p>${E(L[2])}</p>${L[3] === 'REPEAT' ? '<p class="ctl-need">Use REPEAT for this one.</p>' : L[3] === 'TO' ? '<p class="ctl-need">Use a procedure (TO ... END) for this one.</p>' : ''}
        <div class="ctl-cb"><button data-a="ghost">${ghost ? 'Hide' : 'Show'} guide</button><button data-a="showme">Show me</button><button data-a="hear">Hear it</button></div>
        <div class="ctl-ans" hidden><pre>${E(L[1])}</pre><button data-a="useans">Type it for me</button></div></div>`;
    }
    function openLesson(i) {
      ST.les = i; saveST();
      ghost = thumbs[i];
      runLine('CS', true); cmdsSinceCS = [];
      say(`Challenge ${i + 1}: ${TLESS[i][0]}. ${TLESS[i][2]}`);
      out(`Challenge ${i + 1}: ${TLESS[i][0]}. Draw the picture! The dotted guide shows where it goes.`, 'pr');
      showLessons(); redraw();
      if (!coarse()) inp.focus();
    }
    function checkLesson() {
      const i = ST.les; if (i < 0 || queue.length > 1) return;
      const L = TLESS[i];
      if (!M.segs.length) return;
      if (!shapeMatch(M.segs, thumbs[i])) return;
      if (L[3] === 'REPEAT' && !M.flags.repeat) { out('That looks right! Now can you draw it using REPEAT?', 'pr'); return; }
      if (L[3] === 'TO' && !M.flags.proc) { out('That looks right! Now teach the turtle a procedure with TO ... END and use it.', 'pr'); return; }
      if (ST.solved[i]) { out(`You solved ${L[0]} again! Great drawing.`, 'ok'); api.sfx.ding(); return; }
      ST.solved[i] = true;
      const got = ST.helped[i] ? 0 : dailyEarn(api, 5, 'solving a Code Turtle challenge');
      saveST(); api.sfx.tada();
      out(`YOU DID IT! Challenge ${i + 1} solved!${got ? ' You earned $1.' : ''}${i < TLESS.length - 1 ? ' Open Lessons for the next one.' : ' You solved every challenge!'}`, 'ok big');
      say(`You did it! Challenge ${i + 1} is solved!`);
      celebrate();
      if (!side.hidden) showLessons();
    }
    function celebrate() {
      const g = $('.ctl-goal'); g.hidden = false; g.textContent = dosMode ? '*** SOLVED! ***' : 'Solved!';
      setTimeout(() => { g.hidden = true; }, 2200);
    }

    /* ---- overlays: editor and save/open ---- */
    function closeOv() { ov.hidden = true; overlay = null; ov.innerHTML = ''; setEsc(side.hidden); if (!coarse()) inp.focus(); }
    function showEdit() {
      overlay = 'edit'; ov.hidden = false; setEsc(false);
      const txt = Object.entries(M.procs).map(([n, P]) => procSrc(n, P)).join('\n\n');
      ov.innerHTML = `<div class="ctl-box"><div class="ctl-bt">Procedures</div><p>Write procedures here with TO ... END. Press Define to teach them to the turtle.</p><textarea class="ctl-ta" spellcheck="false">${E(txt || 'TO SQUARE\n  REPEAT 4 [FD 50 RT 90]\nEND')}</textarea><div class="ctl-cb"><button data-a="define">Define</button><button data-a="closeov">Cancel</button></div></div>`;
      bind(ov); setTimeout(() => ov.querySelector('textarea').focus(), 30);
    }
    function showSave() {
      overlay = 'save'; ov.hidden = false; setEsc(false);
      const names = Object.keys(ST.progs);
      ov.innerHTML = `<div class="ctl-box"><div class="ctl-bt">Save and open programs</div>
        <p>Saving keeps your procedures and the commands that made the picture on the screen.</p>
        <div class="ctl-sv"><input class="ctl-nm" type="text" maxlength="12" placeholder="Name" value="${E(names[names.length - 1] || 'MYART')}"><button data-a="dosave">Save</button></div>
        <div class="ctl-pl">${names.length ? names.map(n => `<div><span>${E(n)}</span><button data-o="${E(n)}">Open</button><button data-d="${E(n)}">Delete</button></div>`).join('') : '<p>No saved programs yet.</p>'}</div>
        <div class="ctl-cb"><button data-a="closeov">Close</button></div></div>`;
      bind(ov);
      ov.querySelectorAll('[data-o]').forEach(b => b.onclick = () => openProg(b.dataset.o));
      ov.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { delete ST.progs[b.dataset.d]; saveST(); showSave(); });
    }
    function openProg(n) {
      const P = ST.progs[n]; if (!P) return;
      closeOv(); ghost = null; ST.les = -1;
      exec(P.procs || '', false);
      out(`Opened ${n}.`, 'ok');
      exec('CS', true);
      (P.cmds || []).forEach(c => exec(c, true));
    }
    function bind(el) {
      el.querySelectorAll('[data-a]').forEach(b => b.onclick = () => act(b.dataset.a));
    }
    function act(a) {
      api.sfx.click();
      if (a === 'run') { const v = inp.value; inp.value = ''; runLine(v); }
      else if (a === 'speed') { ST.speed = (ST.speed + 1) % SPEEDS.length; saveST(); showSpeed(); }
      else if (a === 'les') { if (side.hidden) showLessons(); else act('closeside'); }
      else if (a === 'closeside') { side.hidden = true; root.classList.remove('side-on'); setEsc(!overlay); requestAnimationFrame(fit); }
      else if (a === 'help') howTo();
      else if (a === 'edit') showEdit();
      else if (a === 'save') showSave();
      else if (a === 'closeov') closeOv();
      else if (a === 'ghost') { ghost = ghost ? null : thumbs[ST.les]; redraw(); showLessons(); }
      else if (a === 'hear') { if (ST.les >= 0) say(TLESS[ST.les][2]); }
      else if (a === 'showme') { const x = side.querySelector('.ctl-ans'); if (x) { x.hidden = false; ST.helped[ST.les] = true; saveST(); } }
      else if (a === 'useans') {
        const src = TLESS[ST.les][1];
        if (src.includes('\n')) { out('? ' + src.replace(/\n/g, ' / '), 'cmd'); exec(src, true); ST.hist.push(src.replace(/\n\s*/g, ' ')); hi = ST.hist.length; }
        else { inp.value = src; inp.focus(); out('I typed it for you. Press Enter (or Run) to try it!', 'pr'); }
      }
      else if (a === 'define') { const t = ov.querySelector('textarea').value; closeOv(); out('Defining procedures...', 'pr'); exec(t, false); }
      else if (a === 'dosave') {
        const n = (ov.querySelector('.ctl-nm').value || 'MYART').toUpperCase().replace(/[^A-Z0-9 _-]/g, '').slice(0, 12) || 'MYART';
        ST.progs[n] = { procs: Object.entries(M.procs).map(([k, P]) => procSrc(k, P)).join('\n'), cmds: cmdsSinceCS.slice(-200) };
        saveST(); api.sfx.floppy ? api.sfx.floppy() : 0; out(`Saved ${n}.`, 'ok'); showSave();
      }
    }
    root.querySelectorAll('.ctl-bar [data-a], .ctl-inrow [data-a], .ctl-lb').forEach(b => b.onclick = () => act(b.dataset.a));
    root.querySelectorAll('[data-q]').forEach(b => b.onclick = () => { api.sfx.click(); runLine(b.dataset.q); });
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); const v = inp.value; inp.value = ''; runLine(v); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); if (hi > 0) inp.value = ST.hist[--hi] || ''; }
      else if (e.key === 'ArrowDown') { e.preventDefault(); hi = Math.min(ST.hist.length, hi + 1); inp.value = ST.hist[hi] || ''; }
    });
    const opened = performance.now();
    W.onKey = e => {
      if (performance.now() - opened < 300) { if (e.key === 'Enter') e.preventDefault(); return; }
      if (e.key === 'Escape') { if (overlay) closeOv(); else if (!side.hidden) act('closeside'); return; }
      if (/^F[1-5]$/.test(e.key)) { e.preventDefault(); act({ F1: 'help', F2: 'les', F3: 'speed', F4: 'edit', F5: 'save' }[e.key]); return; }
      const tg = e.target && e.target.tagName;
      if (tg === 'INPUT' || tg === 'TEXTAREA') return;
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !overlay) { inp.focus(); }
    };
    W.onResize = () => requestAnimationFrame(fit);
    W.onClose = () => { cancelAnimationFrame(raf); raf = 0; queue = []; saveST(); };
    showSpeed();
    requestAnimationFrame(() => {
      fit();
      out(dosMode ? 'CODE TURTLE Logo 1.0. Welcome!' : 'Welcome to Code Turtle!', 'ok');
      out('Type FD 50 and press Enter to move the turtle. Open Lessons for challenges.', 'pr');
      if (Object.keys(M.procs).length) out('I remember your procedures: ' + Object.keys(M.procs).join(', '), 'pr');
      if (ST.les >= 0 && root.clientWidth > 620) showLessons();
      if (!coarse()) inp.focus();
    });
    setEsc(true);
    say('Welcome to Code Turtle! Type F D 50 and press Enter.');
  }
  const CSS_CTL = `
    .ctl{height:100%;display:flex;flex-direction:column;background:#c0c0c0;font-family:var(--ui);font-size:13px;position:relative}
    .ctl-main{flex:1;min-height:0;display:flex;gap:4px;padding:4px}
    .ctl-cvw{position:relative;flex:1;min-width:0;min-height:120px;border:2px solid;border-color:#808080 #fff #fff #808080;background:#000;overflow:hidden}
    .ctl.e1995 .ctl-cvw,.ctl.e2000 .ctl-cvw{background:#fff}
    .ctl-cvw canvas{position:absolute;left:0;top:0}
    .ctl-goal{position:absolute;left:50%;top:40%;transform:translate(-50%,-50%);background:#ffe04a;color:#6a3a00;font:400 40px var(--dos);padding:6px 20px;border:3px solid #6a3a00;border-radius:10px;animation:ctl-pop .5s;pointer-events:none}
    @keyframes ctl-pop{0%{transform:translate(-50%,-50%) scale(.2)}70%{transform:translate(-50%,-50%) scale(1.15)}}
    .ctl-side{width:230px;flex:none;overflow:auto;background:#fff;border:2px solid;border-color:#808080 #fff #fff #808080;padding:4px;box-sizing:border-box}
    .ctl-sh{display:flex;align-items:center;gap:6px;margin-bottom:4px}.ctl-sh b{font-size:15px}.ctl-sh span{flex:1;font-size:11px;color:#555}
    .ctl-x{min-width:36px;min-height:36px}
    .ctl-tip{margin:4px 0}
    .ctl-card{background:#ffffe0;border:1px solid #808000;padding:6px;margin-bottom:6px}
    .ctl-ct{font-weight:700}.ctl-ct em{color:#008000;font-style:normal}
    .ctl-gl{display:block;width:100%;height:110px;margin:4px 0;border:1px solid #888}
    .ctl-card p{margin:4px 0;line-height:1.3}.ctl-need{font-weight:700;color:#800000}
    .ctl-cb{display:flex;flex-wrap:wrap;gap:4px}
    .ctl-cb button,.ctl-x,.ctl-q,.ctl-run,.ctl-sp,.ctl-ans button,.ctl-sv button,.ctl-pl button{min-height:36px;padding:2px 10px;background:#c0c0c0;border:2px solid;border-color:#fff #404040 #404040 #fff;font:inherit;cursor:pointer;color:#000}
    .ctl-cb button:active,.ctl-q:active,.ctl-run:active{border-color:#404040 #fff #fff #404040}
    .ctl-ans pre{background:#000;color:#5f5;padding:6px;font:15px/1.2 var(--dos);white-space:pre-wrap;margin:4px 0}
    .ctl-ll{display:flex;flex-direction:column;gap:2px}
    .ctl-li{display:flex;align-items:center;gap:6px;min-height:44px;background:#fff;border:1px solid #ccc;cursor:pointer;text-align:left;font:inherit;padding:2px 4px;color:#000}
    .ctl-li.on{background:#000080;color:#fff}
    .ctl-li canvas{width:40px;height:40px;flex:none;border:1px solid #999}
    .ctl-li span{flex:1}.ctl-li i{font-style:normal;color:#080;font-weight:700}.ctl-li.on i{color:#8f8}
    .ctl-quick{display:flex;flex-wrap:wrap;gap:3px;padding:0 4px}
    .ctl-q{min-height:40px;min-width:48px;font:15px var(--dos)}
    .ctl-lb{margin-left:auto;font:700 13px var(--ui);background:#ffe04a}
    .ctl-con{height:92px;flex:none;overflow:auto;margin:4px 4px 0;background:#fff;border:2px solid;border-color:#808080 #fff #fff #808080;padding:2px 6px;font:16px/1.15 var(--dos);color:#000}
    .ctl.e1990 .ctl-con{background:#000;color:#aaa}
    .ctl-l.cmd{color:#000080}.ctl.e1990 .ctl-l.cmd{color:#fff}
    .ctl-l.err{color:#c00000}.ctl.e1990 .ctl-l.err{color:#f55}
    .ctl-l.ok{color:#007000;font-weight:700}.ctl.e1990 .ctl-l.ok{color:#5f5}
    .ctl-l.pr{color:#505050}.ctl.e1990 .ctl-l.pr{color:#5ff}
    .ctl-l.big{font-size:20px}
    .ctl-inrow{display:flex;gap:4px;align-items:center;padding:4px}
    .ctl-pr{font:22px var(--dos);width:14px}
    .ctl-in{flex:1;min-width:0;min-height:36px;font:18px var(--dos);padding:2px 6px;box-sizing:border-box;text-transform:uppercase;border:2px solid;border-color:#808080 #fff #fff #808080}
    .ctl-sp{white-space:nowrap}
    .ctl-ov{position:absolute;inset:0;background:#0006;display:flex;align-items:center;justify-content:center;z-index:5;padding:8px}
    .ctl-ov[hidden],.ctl-side[hidden],.ctl-goal[hidden],.ctl-ans[hidden]{display:none}
    .ctl-box{background:#c0c0c0;border:2px solid;border-color:#fff #404040 #404040 #fff;padding:8px;width:100%;max-width:460px;max-height:100%;overflow:auto;box-sizing:border-box;display:flex;flex-direction:column;gap:6px}
    .ctl-bt{background:#000080;color:#fff;font-weight:700;padding:2px 6px}
    .ctl-box p{margin:0}
    .ctl-ta{height:200px;font:16px/1.2 var(--dos);resize:vertical;text-transform:uppercase}
    .ctl-sv{display:flex;gap:4px}.ctl-nm{flex:1;min-height:36px;font:16px var(--dos);text-transform:uppercase}
    .ctl-pl{display:flex;flex-direction:column;gap:2px;max-height:160px;overflow:auto;background:#fff;padding:4px}
    .ctl-pl div{display:flex;gap:4px;align-items:center}.ctl-pl span{flex:1;font:16px var(--dos)}
    @media (max-width:620px){
      .ctl-main{flex-direction:column}
      .ctl.side-on .ctl-side{position:absolute;left:4px;right:4px;top:4px;bottom:4px;width:auto;z-index:4}
      .ctl-con{height:70px}
    }
    .ctl.dos{background:#000;color:var(--phos,#33ff66);font:17px var(--dos)}
    .ctl-bar{display:flex;justify-content:space-between;flex-wrap:wrap;gap:4px;background:var(--phos,#33ff66);color:#000;padding:0 6px;font:18px var(--dos)}
    .ctl-fk{display:flex;flex-wrap:wrap;gap:2px}
    .ctl-fk button{background:#000;color:var(--phos,#33ff66);border:0;font:16px var(--dos);padding:2px 6px;min-height:28px;cursor:pointer}
    .ctl.dos .ctl-cvw{border:2px double var(--phos,#33ff66);background:#000}
    .ctl.dos .ctl-side,.ctl.dos .ctl-card,.ctl.dos .ctl-li,.ctl.dos .ctl-box,.ctl.dos .ctl-pl,.ctl.dos .ctl-con{background:#000;color:var(--phos,#33ff66);border:1px solid var(--phos,#33ff66)}
    .ctl.dos .ctl-li.on,.ctl.dos .ctl-bt{background:var(--phos,#33ff66);color:#000}
    .ctl.dos .ctl-li.on i{color:#000}
    .ctl.dos .ctl-li i,.ctl.dos .ctl-need,.ctl.dos .ctl-ct em,.ctl.dos .ctl-sh span{color:inherit}
    .ctl.dos .ctl-gl,.ctl.dos .ctl-li canvas{border-color:var(--phos,#33ff66)}
    .ctl.dos button{background:#000;color:var(--phos,#33ff66);border:1px solid var(--phos,#33ff66);font:17px var(--dos)}
    .ctl.dos button:hover,.ctl.dos button:focus-visible{background:var(--phos,#33ff66);color:#000;outline:0}
    .ctl.dos .ctl-lb{background:#000}
    .ctl.dos .ctl-con{font:18px/1.15 var(--dos)}
    .ctl.dos .ctl-l{color:inherit;opacity:.8}.ctl.dos .ctl-l.cmd,.ctl.dos .ctl-l.ok,.ctl.dos .ctl-l.err{opacity:1}
    .ctl.dos .ctl-l.err::before{content:"! "}
    .ctl.dos .ctl-in,.ctl.dos .ctl-ta,.ctl.dos .ctl-nm{background:#000;color:var(--phos,#33ff66);border:0;border-bottom:1px solid var(--phos,#33ff66);caret-color:var(--phos,#33ff66)}
    .ctl.dos .ctl-in::placeholder{color:var(--phos,#33ff66);opacity:.5}
    .ctl.dos .ctl-ans pre{background:#000;color:inherit;border:1px dashed var(--phos,#33ff66)}
    .ctl.dos .ctl-goal{background:#000;color:var(--phos,#33ff66);border:2px double var(--phos,#33ff66);border-radius:0;font-size:32px}
    .ctl.dos .ctl-ov{background:#000c}
  `;
  const ICON_CTL = '<svg viewBox="0 0 32 32" shape-rendering="crispEdges" aria-hidden="true"><rect x="1" y="2" width="30" height="24" fill="#000" stroke="#808080"/><path d="M5 22V8H13V22H21V8H27" fill="none" stroke="#ffff55" stroke-width="1.5"/><path d="M24 22l3-6 3 6z" fill="#55ff55"/><rect x="4" y="27" width="24" height="4" fill="#c0c0c0" stroke="#000"/></svg>';
  /* ================= CLOCK & COINS ================= */
  const COINS = { 1: ['penny', '#c8763a', '#8a4a1a', 19, '1¢'], 5: ['nickel', '#c9ccd0', '#7a7e84', 21, '5¢'], 10: ['dime', '#d4d7db', '#80848a', 17.5, '10¢'], 25: ['quarter', '#dadde1', '#7a7e84', 24, '25¢'] };
  const fmtT = t => { t = ((t % 720) + 720) % 720; const h = Math.floor(t / 60) || 12, m = t % 60; return `${h}:${String(m).padStart(2, '0')}`; };
  const sayT = t => { t = ((t % 720) + 720) % 720; const h = Math.floor(t / 60) || 12, m = t % 60; return m === 0 ? `${h} o'clock` : m < 10 ? `${h} oh ${m}` : `${h} ${m}`; };
  const phraseT = t => { t = ((t % 720) + 720) % 720; const h = Math.floor(t / 60) || 12, m = t % 60, nh = (h % 12) + 1; return m === 0 ? `${h} o'clock` : m === 30 ? `half past ${h}` : m === 15 ? `quarter past ${h}` : m === 45 ? `quarter to ${nh}` : ''; };
  const fmtDur = m => { const h = Math.floor(m / 60), r = m % 60; return [h ? `${h} hour${h > 1 ? 's' : ''}` : '', r ? `${r} minutes` : ''].filter(Boolean).join(' '); };
  const fmtM = c => c < 100 ? `${c}¢` : `$${Math.floor(c / 100)}.${String(c % 100).padStart(2, '0')}`;
  const sayM = c => { const d = Math.floor(c / 100), r = c % 100; return [d ? `${d} dollar${d > 1 ? 's' : ''}` : '', r ? `${r} cent${r > 1 ? 's' : ''}` : ''].filter(Boolean).join(' and ') || 'zero cents'; };
  const fewest = c => { let n = 0; [25, 10, 5, 1].forEach(v => { n += Math.floor(c / v); c %= v; }); return n; };
  function coinSvg(v, px) {
    if (v >= 100) {
      const five = v === 500;
      return `<svg class="clc-bill" viewBox="0 0 120 52" style="width:${px * 2.4}px" aria-label="${five ? 'five dollar bill' : 'one dollar bill'}"><rect x="1" y="1" width="118" height="50" rx="3" fill="${five ? '#cfe3c0' : '#d8e8c8'}" stroke="#3a6a2a" stroke-width="2"/><rect x="6" y="6" width="108" height="40" rx="2" fill="none" stroke="#5a8a4a"/><ellipse cx="60" cy="26" rx="14" ry="17" fill="#b8d4a4" stroke="#3a6a2a"/><text x="60" y="33" text-anchor="middle" font-size="20" font-weight="700" fill="#2a5a1a" font-family="Georgia,serif">${five ? 5 : 1}</text><text x="14" y="20" font-size="13" font-weight="700" fill="#2a5a1a" font-family="Georgia,serif">$${five ? 5 : 1}</text><text x="106" y="44" text-anchor="end" font-size="13" font-weight="700" fill="#2a5a1a" font-family="Georgia,serif">$${five ? 5 : 1}</text><text x="92" y="20" text-anchor="middle" font-size="8" fill="#2a5a1a" font-family="Georgia,serif">${five ? 'FIVE' : 'ONE'}</text></svg>`;
    }
    const [name, f, s, mm, lab] = COINS[v], d = px * mm / 21;
    return `<svg class="clc-coin" viewBox="0 0 40 40" style="width:${d}px;height:${d}px" aria-label="${name}"><circle cx="20" cy="20" r="18.5" fill="${f}" stroke="${s}" stroke-width="2" ${v === 10 || v === 25 ? 'stroke-dasharray="1.6 1.2"' : ''}/><circle cx="20" cy="20" r="14.5" fill="none" stroke="${s}" stroke-width="1" opacity=".7"/><text x="20" y="25" text-anchor="middle" font-size="${lab.length > 2 ? 12 : 14}" font-weight="700" fill="${v === 1 ? '#5a2a00' : '#3a3e44'}" font-family="Arial,sans-serif">${lab}</text></svg>`;
  }
  const TOCK = '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M10 14a8 8 0 0 1 14-6M54 14a8 8 0 0 0-14-6" fill="#ffd34a" stroke="#6a4a00" stroke-width="2"/><path d="M16 56l-5 6M48 56l5 6" stroke="#6a4a00" stroke-width="3" stroke-linecap="round"/><circle cx="32" cy="34" r="24" fill="#ff6a4a" stroke="#6a2a1a" stroke-width="2.5"/><circle cx="32" cy="34" r="19" fill="#fffbe8" stroke="#6a2a1a" stroke-width="1.5"/><circle cx="25" cy="29" r="3.5" fill="#222"/><circle cx="39" cy="29" r="3.5" fill="#222"/><circle cx="26" cy="28" r="1.2" fill="#fff"/><circle cx="40" cy="28" r="1.2" fill="#fff"/><path d="M24 39q8 7 16 0" fill="none" stroke="#222" stroke-width="2.4" stroke-linecap="round"/><circle cx="20" cy="37" r="2.5" fill="#ff9a9a"/><circle cx="44" cy="37" r="2.5" fill="#ff9a9a"/></svg>';
  const OINK = '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M14 20l2-10 9 7M50 20l-2-10-9 7" fill="#ff9ac0" stroke="#8a3a5a" stroke-width="2"/><ellipse cx="32" cy="36" rx="25" ry="21" fill="#ffb3d0" stroke="#8a3a5a" stroke-width="2.5"/><rect x="26" y="15" width="12" height="3" rx="1.5" fill="#8a3a5a"/><ellipse cx="32" cy="42" rx="9" ry="6.5" fill="#ff8ab4" stroke="#8a3a5a" stroke-width="2"/><circle cx="29" cy="42" r="1.8" fill="#8a3a5a"/><circle cx="35" cy="42" r="1.8" fill="#8a3a5a"/><circle cx="23" cy="31" r="3.3" fill="#222"/><circle cx="41" cy="31" r="3.3" fill="#222"/><circle cx="24" cy="30" r="1.1" fill="#fff"/><circle cx="42" cy="30" r="1.1" fill="#fff"/><path d="M20 56v5M44 56v5" stroke="#8a3a5a" stroke-width="4" stroke-linecap="round"/></svg>';
  const TOYS = [
    ['bouncy ball', '<circle cx="24" cy="24" r="18" fill="#ff4a4a" stroke="#6a1a1a" stroke-width="2"/><path d="M8 20q16 8 32 0M10 32q14-8 28 0" fill="none" stroke="#fff" stroke-width="3"/>'],
    ['toy car', '<path d="M6 30v-8l8-2 6-8h12l6 8 6 2v8z" fill="#3a8aff" stroke="#1a3a6a" stroke-width="2"/><rect x="22" y="14" width="8" height="7" fill="#bde"/><circle cx="14" cy="32" r="5" fill="#333"/><circle cx="36" cy="32" r="5" fill="#333"/>'],
    ['yo-yo', '<path d="M24 4v14" stroke="#555" stroke-width="1.5"/><circle cx="24" cy="30" r="15" fill="#ffb400" stroke="#6a4a00" stroke-width="2"/><circle cx="24" cy="30" r="5" fill="#ff6a00"/>'],
    ['box of crayons', '<path d="M12 18l3-10h3l3 10M20 18l3-12h3l3 12M28 18l3-10h3l3 10" fill="#e33" stroke="#333"/><path d="M20 18l3-12h3l3 12" fill="#3a3"/><path d="M28 18l3-10h3l3 10" fill="#36f"/><rect x="10" y="18" width="28" height="24" fill="#ffd34a" stroke="#6a4a00" stroke-width="2"/>'],
    ['kite', '<path d="M24 4l14 16-14 18-14-18z" fill="#ff5ab0" stroke="#6a1a4a" stroke-width="2"/><path d="M24 4v34M10 20h28" stroke="#6a1a4a"/><path d="M24 38q-6 4 0 8" fill="none" stroke="#555"/>'],
    ['teddy bear', '<circle cx="13" cy="12" r="6" fill="#b87a42" stroke="#5a3a1a" stroke-width="1.5"/><circle cx="35" cy="12" r="6" fill="#b87a42" stroke="#5a3a1a" stroke-width="1.5"/><circle cx="24" cy="22" r="14" fill="#c98a52" stroke="#5a3a1a" stroke-width="2"/><ellipse cx="24" cy="27" rx="6" ry="4.5" fill="#e8c09a"/><circle cx="19" cy="19" r="2" fill="#222"/><circle cx="29" cy="19" r="2" fill="#222"/><circle cx="24" cy="25.5" r="2" fill="#222"/><rect x="14" y="36" width="20" height="10" rx="5" fill="#c98a52" stroke="#5a3a1a" stroke-width="2"/>'],
    ['rubber duck', '<ellipse cx="26" cy="32" rx="17" ry="11" fill="#ffd83a" stroke="#6a5a00" stroke-width="2"/><circle cx="17" cy="17" r="9" fill="#ffd83a" stroke="#6a5a00" stroke-width="2"/><path d="M6 18l-5 2 5 2z" fill="#ff8a1a" stroke="#6a3a00"/><circle cx="15" cy="15" r="1.8" fill="#222"/>'],
    ['jump rope', '<path d="M10 12q14 44 28 0" fill="none" stroke="#3aaa3a" stroke-width="3"/><rect x="6" y="4" width="7" height="12" rx="3" fill="#ff4a4a" stroke="#6a1a1a"/><rect x="35" y="4" width="7" height="12" rx="3" fill="#ff4a4a" stroke="#6a1a1a"/>']
  ];
  const toySvg = i => `<svg viewBox="0 0 48 48" aria-hidden="true">${TOYS[i][1]}</svg>`;
  const CLEV = [
    ['O\'clock', 'Hours: 3:00, 7:00', 60], ['Half past', 'Half hours: 3:30', 30], ['Quarter hours', 'Quarter past and quarter to', 15], ['Five minutes', 'Every 5 minutes: 3:25', 5], ['Elapsed time', 'How much later? How long?', 15]
  ];
  const MLEV = [
    ['Pennies and nickels', 'Count 1¢ and 5¢', [1, 5], 25], ['Dimes too', 'Count 1¢, 5¢ and 10¢', [1, 5, 10], 60], ['Quarters too', 'Count all four coins', [1, 5, 10, 25], 99], ['Fewest coins', 'Make an amount with the fewest coins', [1, 5, 10, 25], 99], ['Dollars', 'Count bills and coins', [100, 500, 1, 5, 10, 25], 999], ['Toy store', 'Pay for toys and get change', [1, 5, 10, 25, 100], 100]
  ];
  const EVENTS = ['The movie', 'Soccer practice', 'The bus ride', 'Art class', 'Baking cookies', 'The birthday party', 'Swimming lessons', 'The puppet show'];

  function openClocks(W, api) {
    const E = api.esc;
    const P = Object.assign({ c: {}, m: {}, talk: true }, api.load('prog', {}));
    const saveP = () => api.save('prog', P);
    const setHome = escKeeper(W);
    let view = 'home', S = null, drag = null, timers = [];
    const later = (fn, ms) => { timers.push(setTimeout(fn, ms)); };
    const say = t => { if (P.talk) api.say(t); };
    W.body.innerHTML = `<div class="clc e${api.era.id}"></div>`;
    const root = W.body.firstChild;
    api.menubar([
      { label: 'Game', items: [{ label: 'Main menu', fn: () => go('home') }, { label: 'Clock levels', fn: () => go('clock') }, { label: 'Coin levels', fn: () => go('money') }, '-', { label: 'Exit', fn: () => api.close() }] },
      { label: 'Options', items: () => [{ label: (P.talk ? '[x] ' : '[ ] ') + 'Read aloud', fn: () => { P.talk = !P.talk; saveP(); } }, '-', { label: 'Start over...', fn: () => api.msgBox('Clock & Coins', 'Clear all stars?', ['Clear', 'Cancel'], 'warn').then(b => { if (b === 'Clear') { P.c = {}; P.m = {}; saveP(); go('home'); } }) }] },
      { label: 'Help', items: [{ label: 'How to play', fn: howTo }] }
    ]);
    function howTo() {
      api.msgBox('How to play', 'CLOCK: the short red hand shows the HOUR. The long blue hand shows the MINUTES. Drag the hands to set the clock (or use the + and - buttons), then press Check. When a question asks "What time is it?", tap the right answer.\n\nCOINS: penny 1¢, nickel 5¢, dime 10¢, quarter 25¢. A dollar is 100¢. Count the money, or tap coins to put them in the tray.\n\nEvery level has 5 questions. Answer on the first try to earn stars. Finish a level to earn $1 (up to $4 a day).');
    }
    function go(v) { view = v; S = null; setHome(v === 'home'); render(); if (v === 'home') say('Hi! I\'m Tock. Pick the clock or the coins!'); if (v === 'clock') say('Pick a clock level.'); if (v === 'money') say('Pick a money level.'); }
    const stars = rec => rec ? starStr(rec) : '';
    function render() {
      let h = '';
      const back = `<button class="clc-back" data-a="${view === 'clock' || view === 'money' ? 'home' : S && S.kind === 'c' ? 'clock' : 'money'}">&#9666; Back</button>`;
      if (view === 'home') {
        h = `<div class="clc-home"><div class="clc-logo"><span>Clock</span> &amp; <span>Coins</span></div>
          <div class="clc-pals"><div class="clc-pal">${TOCK}</div><div class="clc-pal">${OINK}</div></div>
          <div class="clc-two"><button class="clc-big" data-a="clock"><div class="clc-mini">${clockSvg(3 * 60 + 30, true)}</div><b>Telling Time</b><small>${Object.keys(P.c).length} of ${CLEV.length} levels</small></button>
          <button class="clc-big" data-a="money"><div class="clc-mini clc-coins">${coinSvg(25, 34)}${coinSvg(10, 34)}${coinSvg(5, 34)}${coinSvg(1, 34)}</div><b>Counting Money</b><small>${Object.keys(P.m).length} of ${MLEV.length} levels</small></button></div></div>`;
      } else if (view === 'clock' || view === 'money') {
        const L = view === 'clock' ? CLEV : MLEV, rec = view === 'clock' ? P.c : P.m;
        h = `<div class="clc-hd">${back}<b>${view === 'clock' ? 'Telling Time' : 'Counting Money'}</b></div><div class="clc-scroll"><div class="clc-levels">${L.map((l, i) => `<button class="clc-lv" data-lv="${i}"><span class="clc-n">${i + 1}</span><b>${E(l[0])}</b><small>${E(l[1])}</small><em>${stars(rec[i]) || 'Play!'}</em></button>`).join('')}</div></div>`;
      } else if (view === 'q') {
        const q = S.q;
        h = `<div class="clc-hd">${back}<b>${E(S.name)}</b><span class="clc-dots">${[0, 1, 2, 3, 4].map(i => `<i class="${i < S.n ? (S.first[i] ? 'ok' : 'meh') : i === S.n ? 'now' : ''}"></i>`).join('')}</span></div>
          <div class="clc-q"><div class="clc-say"><div class="clc-pal">${S.kind === 'c' ? TOCK : OINK}</div><div class="clc-bub"><p>${E(q.text)}</p><button class="clc-hear" data-a="hear">Hear it</button></div></div>
          <div class="clc-act">${q.html()}</div>
          <div class="clc-fb ${S.fbCls || ''}">${E(S.fb || '')}</div>
          <div class="clc-ans">${q.answers ? q.answers.map((a, i) => `<button class="clc-opt${S.locked && i === q.correct ? ' yes' : S.picked.has(i) ? ' no' : ''}" data-o="${i}"${S.locked ? ' disabled' : ''}>${E(a)}</button>`).join('') : ''}${q.check && !S.locked ? '<button class="clc-go" data-a="check">Check</button>' : ''}${S.locked ? '<button class="clc-go" data-a="next">Next &#9656;</button>' : ''}</div></div>`;
      } else if (view === 'end') {
        h = `<div class="clc-hd">${back}<b>${E(S.name)}</b></div><div class="clc-end"><div class="clc-conf">${Array.from({ length: 16 }, (_, i) => `<i style="left:${(i * 43) % 100}%;animation-delay:${(i % 5) * 0.2}s;background:${['#ff5a5a', '#ffc93a', '#5ac85a', '#5ab4ff'][i % 4]}"></i>`).join('')}</div>
          <div class="clc-pal big">${S.kind === 'c' ? TOCK : OINK}</div><div class="clc-stars">${starStr(S.stars)}</div><p class="clc-cheer">${S.stars === 3 ? 'Perfect! You got them all!' : S.stars === 2 ? 'Great job!' : 'You finished the level!'}</p>${S.earned ? '<p class="clc-earn">You earned $1!</p>' : ''}
          <div class="clc-row">${S.lv < (S.kind === 'c' ? CLEV : MLEV).length - 1 ? '<button class="clc-go" data-a="nextlv">Next level</button>' : ''}<button class="clc-opt" data-a="again">Play again</button></div></div>`;
      }
      root.innerHTML = h;
      root.querySelectorAll('[data-a]').forEach(b => b.onclick = () => act(b.dataset.a));
      root.querySelectorAll('[data-lv]').forEach(b => b.onclick = () => startLevel(view === 'clock' ? 'c' : 'm', +b.dataset.lv));
      root.querySelectorAll('[data-o]').forEach(b => b.onclick = () => answer(+b.dataset.o));
      if (view === 'q' && S.q.bind) S.q.bind(root);
    }
    function act(a) {
      api.sfx.click();
      if (a === 'home' || a === 'clock' || a === 'money') return go(a);
      if (a === 'hear') return say(S.q.speak || S.q.text);
      if (a === 'check') return check();
      if (a === 'next') return nextQ();
      if (a === 'again') return startLevel(S.kind, S.lv);
      if (a === 'nextlv') return startLevel(S.kind, S.lv + 1);
    }
    function startLevel(kind, lv) {
      S = { kind, lv, n: 0, first: [], name: (kind === 'c' ? CLEV : MLEV)[lv][0], tries: 0, locked: false, fb: '', used: new Set() };
      view = 'q'; setHome(false); makeQ();
    }
    function makeQ() {
      S.tries = 0; S.locked = false; S.fb = ''; S.fbCls = ''; S.picked = new Set();
      let q, k = 0; do { q = S.kind === 'c' ? clockQ(S.lv, S.n) : moneyQ(S.lv, S.n); } while (S.used.has(q.key) && ++k < 20);
      S.used.add(q.key); S.q = q;
      render(); say(q.speak || q.text);
    }
    function nextQ() { S.n++; if (S.n >= 5) return finish(); makeQ(); }
    function right(msg) {
      if (S.tries === 0) S.first[S.n] = true;
      S.locked = true; S.fbCls = 'good';
      S.fb = msg || pickA(['Yes! That\'s right!', 'Great job!', 'You got it!', 'Super!', 'Terrific!']);
      api.tone(660, 0.08, { type: 'square', vol: 0.06 }); api.tone(880, 0.1, { type: 'square', vol: 0.06, at: 0.08 }); api.tone(1320, 0.14, { type: 'square', vol: 0.05, at: 0.18 });
      say(S.fb); render();
    }
    function wrong(hint, show) {
      S.tries++; S.fbCls = 'try';
      api.tone(300, 0.12, { type: 'triangle', vol: 0.06 });
      if (S.tries >= 2 && show) { S.locked = true; S.fb = 'Here is the answer. ' + show() + ' You\'ll get the next one!'; }
      else S.fb = hint;
      say(S.fb); render();
    }
    function finish() {
      const good = S.first.filter(Boolean).length, st = good >= 5 ? 3 : good >= 3 ? 2 : 1;
      const rec = S.kind === 'c' ? P.c : P.m; rec[S.lv] = Math.max(rec[S.lv] || 0, st); saveP();
      S.stars = st; S.earned = dailyEarn(api, 4, 'finishing a Clock & Coins level');
      view = 'end'; api.sfx.tada(); render();
      say(st === 3 ? 'Perfect! You got them all!' : st === 2 ? 'Great job! Level complete!' : 'You finished the level! Nice work!');
    }
    function answer(i) {
      if (S.locked) return;
      const q = S.q;
      if (i !== q.correct) S.picked.add(i);
      if (i === q.correct) right(q.praise); else wrong(q.hint(i), q.showAns);
    }
    function check() { if (S.locked) return; const r = S.q.check(); if (r === true) right(S.q.praise); else wrong(r, S.q.showAns); }
    const opts = (correct, cands, fmt) => { const set = [correct]; shuffle(cands.filter(c => c !== correct)).forEach(c => { if (set.length < 3 && !set.includes(c)) set.push(c); }); shuffle(set); return { answers: set.map(fmt), correct: set.indexOf(correct), vals: set }; };

    /* ---- clock questions ---- */
    function randTime(lv) { const g = CLEV[lv][2]; return R(0, 11) * 60 + (g === 60 || Math.random() < 0.2 ? 0 : g === 15 ? pickA([15, 30, 45, 15, 45]) : R(1, 60 / g - 1) * g); }
    function clockQ(lv, n) {
      if (lv === 4) return elapsedQ(n);
      const t = randTime(lv), ph = phraseT(t);
      if (n % 2 === 0) {
        const cur = { t: lv === 0 ? ((t / 60 + R(3, 8)) % 12) * 60 : (t + R(2, 9) * 35) % 720 };
        return {
          key: 's' + t, text: `Set the clock to ${fmtT(t)}.${ph && ph.indexOf('o\'clock') < 0 ? ' That\'s ' + ph + '.' : ''}`, speak: `Set the clock to ${sayT(t)}.${ph && ph.indexOf('o\'clock') < 0 ? ' That\'s ' + ph + '.' : ''}`,
          check: () => {
            const h = Math.floor(cur.t / 60) % 12, m = cur.t % 60, th = Math.floor(t / 60) % 12, tm = t % 60;
            if (h === th && m === tm) return true;
            if (m !== tm && h === th) return `The hour is right! Now move the long blue hand. For ${fmtT(t)} it points to ${tm === 0 ? 'the 12' : 'the ' + (tm / 5)}.`;
            if (m === tm) return `The minutes are right! Now the short red hand. It should point ${tm >= 30 ? 'between the ' + (th || 12) + ' and the ' + (th % 12 + 1) : 'at the ' + (th || 12)}.`;
            return `Not yet. The short red hand shows the hour (${Math.floor(t / 60) || 12}). The long blue hand shows the minutes (${tm}). Try again!`;
          },
          showAns: () => { cur.t = t; return `This is ${fmtT(t)}.`; },
          html: () => `<div class="clc-clock">${clockSvg(cur.t)}</div><div class="clc-adj"><span>Hour</span><button data-k="h-">&minus;</button><button data-k="h+">+</button><span>Minute</span><button data-k="m-">&minus;</button><button data-k="m+">+</button></div>`,
          bind: r => bindClock(r, cur, 5),
          adjust: (k) => adjust(cur, k, lv)
        };
      }
      const cands = [swapHands(t), t + 60, t - 60, t + 30, t + CLEV[lv][2], t - CLEV[lv][2], t + 120].map(x => ((x % 720) + 720) % 720);
      const o = opts(t, cands, fmtT);
      return {
        key: 'r' + t, text: 'What time is it?', speak: 'What time is it? Look at the short hand and the long hand.', answers: o.answers, correct: o.correct,
        hint: i => { const v = o.vals[i]; return Math.floor(v / 60) !== Math.floor(t / 60) ? 'Look at the short red hand for the hour. Which number did it pass last?' : 'Look at the long blue hand for the minutes. Count by 5s from the 12!'; },
        showAns: () => `It's ${fmtT(t)}${ph && ph.indexOf('o\'clock') < 0 ? ', ' + ph : ''}.`,
        praise: `Yes! It's ${fmtT(t)}${ph && ph.indexOf('o\'clock') < 0 ? ', ' + ph : ''}!`,
        html: () => `<div class="clc-clock">${clockSvg(t, true)}</div>`
      };
    }
    function swapHands(t) { const h = Math.floor(t / 60) % 12, m = t % 60; if (m % 5) return t + 60; const nh = (m / 5) % 12, nm = (h * 5) % 60; return nh * 60 + nm; }
    function elapsedQ(n) {
      const start = R(1, 10) * 60 + pickA([0, 15, 30, 45]), dur = pickA([15, 30, 45, 60, 90, 120]);
      if (n % 3 === 0) {
        const cur = { t: start };
        return {
          key: 'es' + start + dur, text: `It is ${fmtT(start)}. Set the clock to show ${fmtDur(dur)} later.`, speak: `It is ${sayT(start)}. Set the clock to show ${fmtDur(dur)} later.`,
          check: () => cur.t % 720 === (start + dur) % 720 ? true : `Not yet. Start at ${fmtT(start)} and move ahead ${fmtDur(dur)}. One whole trip around the clock by the long hand is 1 hour.`,
          showAns: () => { cur.t = start + dur; return `${fmtDur(dur)} after ${fmtT(start)} is ${fmtT(start + dur)}.`; },
          html: () => `<div class="clc-clock">${clockSvg(cur.t)}</div><div class="clc-adj"><span>Hour</span><button data-k="h-">&minus;</button><button data-k="h+">+</button><span>Minute</span><button data-k="m-">&minus;</button><button data-k="m+">+</button></div>`,
          bind: r => bindClock(r, cur, 5), adjust: k => adjust(cur, k, 4)
        };
      }
      if (n % 3 === 1) {
        const ans = start + dur, o = opts(ans % 720, [start + dur + 15, start + dur - 15, start + dur + 60, start - dur, start + dur - 60].map(x => ((x % 720) + 720) % 720), fmtT);
        return {
          key: 'ep' + start + dur, text: `The clock says ${fmtT(start)}. What time will it be in ${fmtDur(dur)}?`, speak: `The clock says ${sayT(start)}. What time will it be in ${fmtDur(dur)}?`,
          answers: o.answers, correct: o.correct, hint: () => `Count ahead from ${fmtT(start)}. Each hour, the long hand goes all the way around once.`,
          showAns: () => `${fmtDur(dur)} after ${fmtT(start)} is ${fmtT(ans)}.`, html: () => `<div class="clc-clock">${clockSvg(start, true)}</div>`
        };
      }
      const ev = pickA(EVENTS), o = opts(dur, [15, 30, 45, 60, 90, 120, 150], fmtDur);
      return {
        key: 'ed' + start + dur, text: `${ev} starts at ${fmtT(start)} and ends at ${fmtT(start + dur)}. How long is it?`, speak: `${ev} starts at ${sayT(start)} and ends at ${sayT(start + dur)}. How long is it?`,
        answers: o.answers, correct: o.correct, hint: () => `Start at ${fmtT(start)}. How far do you need to go to reach ${fmtT(start + dur)}? Try hours first, then minutes.`,
        showAns: () => `From ${fmtT(start)} to ${fmtT(start + dur)} is ${fmtDur(dur)}.`,
        html: () => `<div class="clc-two-clocks"><div><div class="clc-clock sm">${clockSvg(start, true)}</div><span>Starts</span></div><div><div class="clc-clock sm">${clockSvg(start + dur, true)}</div><span>Ends</span></div></div>`
      };
    }
    function clockSvg(t, still) {
      t = ((t % 720) + 720) % 720;
      const ma = (t % 60) * 6, ha = t / 2;
      let s = `<svg class="clc-face${still ? '' : ' live'}" viewBox="0 0 200 200" role="img" aria-label="Clock showing ${fmtT(t)}"><circle cx="100" cy="100" r="96" fill="#ffd34a" stroke="#6a4a00" stroke-width="4"/><circle cx="100" cy="100" r="86" fill="#fffdf2" stroke="#6a4a00" stroke-width="2"/>`;
      for (let i = 0; i < 60; i++) { const a = i * 6 * Math.PI / 180, r1 = i % 5 ? 80 : 75; s += `<line x1="${100 + Math.sin(a) * r1}" y1="${100 - Math.cos(a) * r1}" x2="${100 + Math.sin(a) * 84}" y2="${100 - Math.cos(a) * 84}" stroke="#555" stroke-width="${i % 5 ? 1 : 2.5}"/>`; }
      for (let i = 1; i <= 12; i++) { const a = i * 30 * Math.PI / 180; s += `<text x="${100 + Math.sin(a) * 63}" y="${100 - Math.cos(a) * 63 + 8}" text-anchor="middle" font-size="22" font-weight="700" fill="#223" font-family="Arial,sans-serif">${i}</text>`; }
      s += `<g class="clc-hh" transform="rotate(${ha} 100 100)"><line x1="100" y1="112" x2="100" y2="54" stroke="#d8322a" stroke-width="9" stroke-linecap="round"/></g>`;
      s += `<g class="clc-mh" transform="rotate(${ma} 100 100)"><line x1="100" y1="114" x2="100" y2="24" stroke="#2a62d8" stroke-width="5.5" stroke-linecap="round"/>${still ? '' : '<circle cx="100" cy="30" r="9" fill="#2a62d8" opacity=".25"/>'}</g>`;
      s += `${still ? '' : '<circle cx="100" cy="62" r="9" fill="#d8322a" opacity=".22" transform="rotate(' + ha + ' 100 100)"/>'}<circle cx="100" cy="100" r="7" fill="#223"/></svg>`;
      return s;
    }
    function setHands(r, cur) {
      const t = ((cur.t % 720) + 720) % 720;
      const svg = r.querySelector('.clc-face.live'); if (!svg) return;
      svg.querySelector('.clc-hh').setAttribute('transform', `rotate(${t / 2} 100 100)`);
      svg.querySelector('.clc-mh').setAttribute('transform', `rotate(${(t % 60) * 6} 100 100)`);
      svg.querySelectorAll('circle[opacity=".22"]').forEach(c => c.setAttribute('transform', `rotate(${t / 2} 100 100)`));
      svg.setAttribute('aria-label', 'Clock showing ' + fmtT(t));
    }
    function adjust(cur, k, lv) {
      const g = 5;
      if (k === 'h+') cur.t += 60; else if (k === 'h-') cur.t -= 60; else if (k === 'm+') cur.t += g; else if (k === 'm-') cur.t -= g;
      cur.t = ((cur.t % 720) + 720) % 720; api.sfx.click();
      setHands(root, cur);
    }
    function bindClock(r, cur, snap) {
      r.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { if (!S.locked) S.q.adjust(b.dataset.k); });
      const svg = r.querySelector('.clc-face.live'); if (!svg) return;
      const ang = e => { const b = svg.getBoundingClientRect(); const x = e.clientX - b.left - b.width / 2, y = e.clientY - b.top - b.height / 2; return { a: (Math.atan2(x, -y) * 180 / Math.PI + 360) % 360, d: Math.hypot(x, y) / (b.width / 2) }; };
      svg.addEventListener('pointerdown', e => {
        if (S.locked) return;
        const { a, d } = ang(e), t = cur.t, ma = (t % 60) * 6, ha = (t / 2) % 360;
        const dm = Math.min(Math.abs(a - ma), 360 - Math.abs(a - ma)), dh = Math.min(Math.abs(a - ha), 360 - Math.abs(a - ha));
        drag = (dh + (d > 0.62 ? 25 : 0) < dm + (d < 0.55 ? 25 : 0)) ? 'h' : 'm';
        svg.setPointerCapture(e.pointerId); e.preventDefault(); move(e);
      });
      const move = e => {
        if (!drag || S.locked) return;
        const { a } = ang(e);
        if (drag === 'm') {
          const m = Math.round(a / 6 / snap) * snap % 60, pm = cur.t % 60; let h = Math.floor(cur.t / 60);
          if (pm >= 45 && m < 15) h++; else if (pm < 15 && m >= 45) h--;
          cur.t = ((h * 60 + m) % 720 + 720) % 720;
        } else {
          const m = cur.t % 60, h = Math.round(a / 30 - m / 60 + 12) % 12;
          cur.t = h * 60 + m;
        }
        setHands(r, cur);
      };
      svg.addEventListener('pointermove', move);
      const up = () => { if (drag) api.sfx.click(); drag = null; };
      svg.addEventListener('pointerup', up); svg.addEventListener('pointercancel', up);
    }

    /* ---- money questions ---- */
    function coinSet(kinds, max, minCoins = 2) {
      let c, tot;
      for (let k = 0; k < 50; k++) {
        c = []; tot = 0; const n = R(minCoins, Math.min(8, minCoins + 5));
        for (let i = 0; i < n; i++) { const v = pickA(kinds); if (tot + v <= max) { c.push(v); tot += v; } }
        if (c.length >= minCoins && new Set(c).size >= Math.min(2, kinds.length)) break;
      }
      return c.sort((a, b) => b - a);
    }
    const coinsHTML = list => `<div class="clc-pile">${list.map(v => `<span class="clc-c">${coinSvg(v, v >= 100 ? 44 : 46)}</span>`).join('')}</div>`;
    function moneyQ(lv, n) {
      const L = MLEV[lv];
      if (lv <= 2 || lv === 4) {
        const set = lv === 4 ? [pickA([100, 500]), ...(Math.random() < 0.5 ? [100] : []), ...coinSet([1, 5, 10, 25], 99, 2)] : coinSet(L[2], L[3], lv === 0 ? 2 : 3);
        const tot = set.reduce((a, b) => a + b, 0);
        const o = opts(tot, [tot + 1, tot - 1, tot + 5, tot - 5, tot + 10, tot - 10, tot + (lv >= 2 ? 25 : 2), tot + (lv === 4 ? 100 : 3)].filter(x => x > 0), fmtM);
        return {
          key: 'c' + set.join(','), text: 'How much money is this?', speak: 'How much money is this? Count the biggest coins first!', answers: o.answers, correct: o.correct,
          hint: () => `Start with the biggest ${lv === 4 ? 'bills and ' : ''}coins and count up. ${set.includes(25) ? 'Quarters count by 25s. ' : ''}${set.includes(10) ? 'Dimes count by 10s. ' : ''}${set.includes(5) ? 'Nickels count by 5s. ' : ''}Pennies count by 1s.`,
          showAns: () => `It's ${fmtM(tot)}. ${countStr(set)}`, praise: `Yes! That's ${fmtM(tot)}!`, html: () => coinsHTML(set)
        };
      }
      if (lv === 3 || (lv === 5 && n % 2 === 0)) {
        const toy = R(0, TOYS.length - 1);
        const amt = lv === 3 ? R(6, 19) * 5 + (Math.random() < 0.5 ? R(1, 4) : 0) : R(3, 19) * 5;
        const tray = [];
        const q = {
          key: 'm' + amt, text: lv === 3 ? `Make ${fmtM(amt)} with the fewest coins you can.` : `The ${TOYS[toy][0]} costs ${fmtM(amt)}. Tap coins to pay exactly ${fmtM(amt)}.`,
          speak: lv === 3 ? `Make ${sayM(amt)} with the fewest coins you can.` : `The ${TOYS[toy][0]} costs ${sayM(amt)}. Tap coins to pay exactly ${sayM(amt)}.`, check: () => {
            const tot = tray.reduce((a, b) => a + b, 0);
            if (tot < amt) return `You have ${fmtM(tot)}. You need ${fmtM(amt - tot)} more.`;
            if (tot > amt) return `You have ${fmtM(tot)}. That's ${fmtM(tot - amt)} too much. Tap a coin in the tray to take it back.`;
            if (lv === 3 && tray.length > fewest(amt)) return `That's exactly ${fmtM(amt)}! Can you do it with fewer coins? Try using bigger coins.`;
            return true;
          },
          showAns: () => { tray.length = 0; let c = amt; [25, 10, 5, 1].forEach(v => { while (c >= v) { tray.push(v); c -= v; } }); return `${fmtM(amt)} is ${countStr(tray)}`; },
          html: () => `${lv === 5 ? `<div class="clc-toy">${toySvg(toy)}<span class="clc-tag">${fmtM(amt)}</span></div>` : ''}<div class="clc-tray"><div class="clc-tl">Tray: <b>${fmtM(tray.reduce((a, b) => a + b, 0))}</b> <small>(${tray.length} coin${tray.length === 1 ? '' : 's'})</small></div><div class="clc-tc">${tray.map((v, i) => `<button class="clc-c" data-t="${i}" aria-label="Take back ${COINS[v][0]}">${coinSvg(v, 40)}</button>`).join('') || '<span class="clc-empty">Tap coins below to add them</span>'}</div></div>
            <div class="clc-bank">${[1, 5, 10, 25].map(v => `<button class="clc-c" data-add="${v}" aria-label="Add a ${COINS[v][0]}">${coinSvg(v, 46)}<small>${COINS[v][0]}</small></button>`).join('')}</div>`,
          bind: r => {
            r.querySelectorAll('[data-add]').forEach(b => b.onclick = () => { if (S.locked || tray.length >= 20) return; tray.push(+b.dataset.add); tray.sort((a, b2) => b2 - a); api.tone(1200 + +b.dataset.add * 10, 0.05, { type: 'triangle', vol: 0.06 }); S.fb = ''; render(); });
            r.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { if (S.locked) return; tray.splice(+b.dataset.t, 1); api.sfx.click(); render(); });
          }
        };
        return q;
      }
      // toy store: change from $1
      const toy = R(0, TOYS.length - 1), price = R(4, 19) * 5, ch = 100 - price;
      const o = opts(ch, [ch + 5, ch - 5, ch + 10, ch - 10, price, ch + 25].filter(x => x > 0 && x < 100), fmtM);
      return {
        key: 'ch' + price, text: `The ${TOYS[toy][0]} costs ${fmtM(price)}. You pay with $1. How much change do you get back?`, speak: `The ${TOYS[toy][0]} costs ${sayM(price)}. You pay with 1 dollar. How much change do you get back?`,
        answers: o.answers, correct: o.correct, hint: () => `A dollar is 100¢. Count up from ${fmtM(price)} to 100¢.`,
        showAns: () => `100¢ minus ${fmtM(price)} is ${fmtM(ch)}.`, praise: `Yes! Your change is ${fmtM(ch)}.`,
        html: () => `<div class="clc-store"><div class="clc-toy">${toySvg(toy)}<span class="clc-tag">${fmtM(price)}</span></div><div class="clc-paid"><span>You pay:</span>${coinSvg(100, 30)}</div></div>`
      };
    }
    function countStr(list) {
      const n = {}; list.forEach(v => { n[v] = (n[v] || 0) + 1; });
      const nm = { 500: ['five-dollar bill', 'five-dollar bills'], 100: ['one-dollar bill', 'one-dollar bills'], 25: ['quarter', 'quarters'], 10: ['dime', 'dimes'], 5: ['nickel', 'nickels'], 1: ['penny', 'pennies'] };
      return Object.keys(n).sort((a, b) => b - a).map(v => `${n[v]} ${nm[v][n[v] > 1 ? 1 : 0]}`).join(', ') + '.';
    }
    const opened = performance.now();
    W.onKey = e => {
      if (performance.now() - opened < 300) return;
      if (e.key === 'Escape') { if (view !== 'home') go(view === 'q' || view === 'end' ? (S.kind === 'c' ? 'clock' : 'money') : 'home'); return; }
      if (view === 'q' && S) {
        if (/^[1-3]$/.test(e.key) && S.q.answers) { answer(+e.key - 1); return; }
        if (e.key === 'Enter') { e.preventDefault(); if (S.locked) nextQ(); else if (S.q.check) check(); return; }
        if (S.q.adjust && !S.locked) { const k = { ArrowUp: 'h+', ArrowDown: 'h-', ArrowRight: 'm+', ArrowLeft: 'm-' }[e.key]; if (k) { e.preventDefault(); S.q.adjust(k); } }
      } else if (view === 'end' && e.key === 'Enter') { e.preventDefault(); act(S.lv < (S.kind === 'c' ? CLEV : MLEV).length - 1 ? 'nextlv' : 'again'); }
      else if ((view === 'clock' || view === 'money') && /^[1-6]$/.test(e.key)) { const i = +e.key - 1; if (i < (view === 'clock' ? CLEV : MLEV).length) startLevel(view === 'clock' ? 'c' : 'm', i); }
      else if (view === 'home' && (e.key === '1' || e.key === '2')) go(e.key === '1' ? 'clock' : 'money');
    };
    W.onClose = () => { timers.forEach(clearTimeout); };
    go('home');
  }
  const CSS_CLC = `
    .clc{height:100%;display:flex;flex-direction:column;background:linear-gradient(#fff4d0,#ffe0b0);color:#223;font-family:var(--ui);user-select:none;-webkit-user-select:none;overflow:hidden}
    .clc.e1990{background:#ffffa8}
    .clc-hd{display:flex;align-items:center;gap:8px;padding:4px 8px;background:#c8401a;color:#fff;min-height:36px;flex:none}
    .clc.e1990 .clc-hd{background:#a80000}
    .clc-hd b{flex:1;font:400 24px/1 var(--dos);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .clc-back{min-height:38px;min-width:64px;background:#ffd84a;color:#503000;border:2px solid #8a6a00;border-radius:8px;font:700 14px var(--ui);cursor:pointer}
    .clc-dots{display:flex;gap:5px}.clc-dots i{width:14px;height:14px;border-radius:50%;background:#fff5;border:2px solid #fff}.clc-dots i.ok{background:#ffd84a}.clc-dots i.meh{background:#9fd8ff}.clc-dots i.now{background:#fff;box-shadow:0 0 0 2px #ffd84a}
    .clc-home{flex:1;overflow:auto;display:flex;flex-direction:column;align-items:center;gap:8px;padding:10px}
    .clc-logo{font:400 clamp(34px,8vw,56px)/1 var(--dos);color:#c8401a;text-shadow:2px 2px #fff,4px 4px #ffb080;text-align:center}
    .clc-logo span:last-child{color:#2a8a3a;text-shadow:2px 2px #fff,4px 4px #a0e0a0}
    .clc-pals{display:flex;gap:18px}.clc-pal{width:64px;height:64px;flex:none}.clc-pal svg{width:100%;height:100%}
    .clc-pals .clc-pal{animation:clc-bob 1.1s ease-in-out infinite alternate}.clc-pals .clc-pal:last-child{animation-delay:.5s}
    @keyframes clc-bob{to{transform:translateY(-6px) rotate(3deg)}}
    .clc-pal.big{width:96px;height:96px;animation:clc-bob .6s infinite alternate}
    .clc-two{display:flex;gap:12px;flex-wrap:wrap;justify-content:center;width:100%}
    .clc-big{flex:1 1 200px;max-width:280px;min-height:170px;display:flex;flex-direction:column;align-items:center;gap:4px;background:#fff;border:3px solid #c8401a;border-radius:16px;padding:10px;cursor:pointer;box-shadow:0 4px 0 #8a2a0a;font-family:var(--ui)}
    .clc-big:active{transform:translateY(3px);box-shadow:0 1px 0 #8a2a0a}
    .clc-big b{font-size:20px}.clc-big small{color:#666}
    .clc-mini{width:110px;height:110px;display:flex;align-items:center;justify-content:center}.clc-mini svg.clc-face{width:110px;height:110px}
    .clc-coins{flex-wrap:wrap;gap:2px;align-content:center}
    .clc-scroll{flex:1;overflow:auto;padding:10px}
    .clc-levels{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px}
    .clc-lv{position:relative;display:flex;flex-direction:column;align-items:flex-start;gap:2px;min-height:84px;padding:8px 10px 8px 52px;background:#fff;border:3px solid #2a8a3a;border-radius:12px;cursor:pointer;text-align:left;font-family:var(--ui)}
    .clc-lv b{font-size:16px}.clc-lv small{font-size:12px;color:#555}.clc-lv em{font-style:normal;color:#e8a000;font-weight:700;font-size:16px}
    .clc-n{position:absolute;left:8px;top:50%;transform:translateY(-50%);width:34px;height:34px;border-radius:50%;background:#2a8a3a;color:#fff;font:400 24px/34px var(--dos);text-align:center}
    .clc-q{flex:1;min-height:0;overflow:auto;display:flex;flex-direction:column;align-items:center;gap:8px;padding:8px}
    .clc-say{display:flex;gap:8px;align-items:center;width:100%;max-width:620px}
    .clc-say .clc-pal{width:56px;height:56px}
    .clc-bub{flex:1;display:flex;gap:6px;align-items:center;background:#fff;border:2px solid #6a4a00;border-radius:14px;padding:6px 10px;font-size:17px;line-height:1.3;min-height:48px}
    .clc-bub p{margin:0;flex:1;font-weight:700}
    .clc-hear{flex:none;min-height:44px;min-width:56px;border-radius:10px;border:2px solid #1a5a9a;background:#dff0ff;color:#1a4a8a;font:700 13px var(--ui);cursor:pointer}
    .clc-act{display:flex;flex-direction:column;align-items:center;gap:6px;width:100%}
    .clc-clock{width:min(240px,62vw);aspect-ratio:1}.clc-clock svg{width:100%;height:100%;display:block}
    .clc-clock.sm{width:min(150px,38vw)}
    .clc-face.live{touch-action:none;cursor:grab}
    .clc-two-clocks{display:flex;gap:14px}.clc-two-clocks>div{display:flex;flex-direction:column;align-items:center;font-weight:700}
    .clc-adj{display:flex;gap:4px;align-items:center;flex-wrap:wrap;justify-content:center}
    .clc-adj span{font-weight:700;margin:0 2px 0 8px}
    .clc-adj button{min-width:48px;min-height:44px;border-radius:10px;border:2px solid #6a4a00;background:#fff;font:700 22px var(--ui);cursor:pointer}
    .clc-fb{min-height:24px;font-weight:700;text-align:center;max-width:620px;font-size:16px}
    .clc-fb.good{color:#1a7a2a;font-size:20px}.clc-fb.try{color:#a04a00}
    .clc-ans{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}
    .clc-opt,.clc-go{min-height:52px;min-width:100px;padding:6px 16px;border-radius:12px;border:3px solid #1a5a9a;background:#fff;color:#1a3a6a;font:700 20px var(--ui);cursor:pointer;box-shadow:0 3px 0 #1a4a8a}
    .clc-opt.yes{background:#7ee07e;border-color:#1a7a2a}.clc-opt.no{background:#ffd0c0;border-color:#c04a2a}
    .clc-opt:disabled{opacity:.7;cursor:default}
    .clc-go{background:#2a9a3a;border-color:#1a5a2a;color:#fff;box-shadow:0 3px 0 #1a5a2a}
    .clc-pile{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;align-items:center;background:#e8d0a8;border:3px solid #a07040;border-radius:14px;padding:10px;max-width:460px}
    .clc-c{display:inline-flex;flex-direction:column;align-items:center;background:none;border:0;padding:2px;cursor:pointer;font:12px var(--ui);color:#333}
    .clc-coin{filter:drop-shadow(1px 2px 0 #0004)}
    .clc-tray{width:100%;max-width:460px;background:#fff;border:3px dashed #a07040;border-radius:14px;padding:6px}
    .clc-tl{font-size:16px}.clc-tl b{font-size:20px;color:#1a5a2a}
    .clc-tc{display:flex;flex-wrap:wrap;gap:2px;min-height:48px;align-items:center}
    .clc-empty{color:#888;font-style:italic}
    .clc-bank{display:flex;gap:6px;justify-content:center;flex-wrap:wrap}
    .clc-bank .clc-c{min-width:60px;min-height:60px;background:#fff8;border-radius:12px;border:2px solid #a07040}
    .clc-store{display:flex;gap:16px;align-items:center;flex-wrap:wrap;justify-content:center}
    .clc-toy{position:relative;width:110px;height:110px;background:#fff;border-radius:14px;border:3px solid #a07040;display:flex;align-items:center;justify-content:center}.clc-toy svg{width:80px;height:80px}
    .clc-tag{position:absolute;right:-12px;top:-10px;background:#fff64a;border:2px solid #6a5a00;border-radius:8px;padding:0 6px;font:400 24px var(--dos);transform:rotate(8deg)}
    .clc-paid{display:flex;flex-direction:column;align-items:center;font-weight:700}
    .clc-end{position:relative;flex:1;overflow:auto;display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px;text-align:center}
    .clc-stars{font-size:48px;color:#ffb400;text-shadow:1px 2px #a06000;letter-spacing:4px}
    .clc-cheer{font:400 28px/1.1 var(--dos);color:#1a4a8a;margin:0}.clc-earn{margin:0;font-weight:700;color:#1a7a2a}
    .clc-row{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}
    .clc-conf{position:absolute;inset:0;pointer-events:none;overflow:hidden}
    .clc-conf i{position:absolute;top:-12px;width:9px;height:13px;animation:clc-fall 2.4s linear 2 forwards}
    @keyframes clc-fall{to{transform:translateY(420px) rotate(540deg);opacity:0}}
  `;
  const ICON_CLC = '<svg viewBox="0 0 32 32" shape-rendering="crispEdges" aria-hidden="true"><circle cx="13" cy="13" r="11" fill="#fffbe0" stroke="#000" stroke-width="2" shape-rendering="auto"/><path d="M13 13V6M13 13h5" stroke="#c00" stroke-width="2"/><circle cx="24" cy="24" r="7" fill="#c9ccd0" stroke="#555" stroke-width="1.5" shape-rendering="auto"/><circle cx="18" cy="27" r="4.5" fill="#c8763a" stroke="#6a3a10" shape-rendering="auto"/></svg>';
  /* ================= SPELLING BEE ================= */
  const SPW = [
    ['K', `cat|The ___ says meow.
dog|The ___ wags its tail.
sun|The ___ is hot and bright.
hat|I wear a ___ on my head.
bed|I sleep in my ___.
pig|The ___ rolls in the mud.
run|I can ___ very fast.
big|An elephant is very ___.
red|A fire truck is ___.
cup|I drink milk from a ___.
box|The toys go in the ___.
bus|We ride the ___ to school.
fox|The ___ has a bushy tail.
hen|The ___ lays an egg.
map|A ___ shows us where to go.
top|The bird sat on ___ of the tree.
sit|Please ___ down in your chair.
mom|My ___ reads me a story.
dad|My ___ makes pancakes.
yes|Do you like ice cream? ___, I do!
pen|I write with a ___.
bug|A ladybug is a little ___.
egg|The chick hatched from an ___.
fan|The ___ blows cool air.
jam|I like ___ on my toast.
log|The frog sat on a ___.
mud|The pig is covered in ___.
van|We packed the ___ for our trip.
web|The spider spins a ___.
ten|I have ___ fingers.
six|Three plus three is ___.
zoo|We saw a lion at the ___.
see|I can ___ with my eyes.
and|I like peanut butter ___ jelly.`],
    ['1', `fish|A ___ swims in the water.
frog|The ___ hops into the pond.
jump|Can you ___ over the puddle?
ship|The ___ sails across the sea.
tree|A bird built a nest in the ___.
duck|The ___ says quack.
milk|Cows give us ___.
nest|The bird sits on its ___.
cake|We ate birthday ___.
bike|I ride my ___ to the park.
rain|Take an umbrella because of the ___.
play|Let's ___ a game!
green|Grass is ___.
blue|The sky is ___.
home|After school I go ___.
kite|The ___ flew high in the wind.
snow|We built a snowman in the ___.
boat|The ___ floats on the lake.
ball|Throw the ___ to me!
book|I love to read a ___.
moon|The ___ shines at night.
star|I made a wish on a ___.
said|"Hello," ___ the teacher.
they|___ are my best friends.
come|Please ___ to my party.
what|___ is your name?
have|I ___ a little puppy.
friend|My ___ and I play tag.
happy|I feel ___ when I see my dog.
little|A mouse is a ___ animal.
water|Fish live in the ___.
hand|Raise your ___ to ask a question.`],
    ['2', `apple|An ___ is a healthy snack.
before|Wash your hands ___ you eat.
chair|Sit in the ___ at the table.
clock|The ___ says it is time for lunch.
dream|I had a funny ___ last night.
farmer|The ___ feeds the cows.
garden|We grow carrots in our ___.
horse|The ___ ran across the field.
kitten|The ___ plays with yarn.
lunch|We eat ___ at noon.
mouse|The ___ ate a piece of cheese.
number|Seven is my favorite ___.
orange|An ___ is a juicy fruit.
party|We had a ___ for my birthday.
pretty|The butterfly has ___ wings.
queen|The ___ wore a gold crown.
rabbit|The ___ has long ears.
school|I learn to read at ___.
sleep|Bears ___ all winter.
smile|Your ___ makes me happy.
table|Set the plates on the ___.
teacher|My ___ helps me learn.
thank|Always ___ people who help you.
turtle|The ___ has a hard shell.
under|The cat hid ___ the bed.
window|Look out the ___ at the rain.
winter|It snows in the ___.
yellow|A banana is ___.
because|I wore a coat ___ it was cold.
circle|A ball is round like a ___.
people|Many ___ came to the parade.
flower|A bee sat on the ___.
again|That was fun! Let's do it ___.`],
    ['3', `animal|A giraffe is a very tall ___.
answer|Raise your hand to ___ the question.
beautiful|The sunset was ___.
bridge|We walked across the ___ over the river.
brother|My little ___ likes trucks.
careful|Be ___ when you cross the street.
different|Every snowflake is ___.
enough|Do we have ___ cookies for everyone?
family|My ___ eats dinner together.
favorite|Pizza is my ___ food.
finally|The rain ___ stopped.
forest|Many trees grow in the ___.
giant|The ___ lived at the top of the beanstalk.
healthy|Vegetables help keep you ___.
island|An ___ has water all around it.
library|We borrow books from the ___.
minute|There are sixty seconds in a ___.
morning|I eat breakfast in the ___.
neighbor|Our ___ lives next door.
ocean|Whales swim in the ___.
picture|I drew a ___ of my house.
planet|Earth is the ___ we live on.
question|Can I ask you a ___?
remember|I always ___ to brush my teeth.
sister|My big ___ helps me with homework.
special|Today is a ___ day.
surprise|The party was a big ___.
thought|I ___ hard about my answer.
together|Let's work ___ as a team.
tomorrow|Today is Monday, so ___ is Tuesday.
weather|The ___ is sunny today.
whistle|The coach blew her ___.`],
    ['4', `adventure|Camping in the woods was an ___.
although|I finished my homework, ___ it was hard.
astronaut|The ___ floated inside the space station.
balance|I can ___ on one foot.
breathe|Fish use gills to ___ underwater.
calendar|Mark the party on the ___.
celebrate|We ___ birthdays with cake.
climate|A desert has a hot, dry ___.
curious|The ___ kitten looked in every box.
dinosaur|A ___ lived millions of years ago.
discover|Scientists ___ new things every day.
eighty|Forty plus forty is ___.
electricity|Lamps need ___ to light up.
experiment|We did a science ___ with magnets.
February|___ is the second month of the year.
fortunate|We were ___ to see a rainbow.
imagine|Close your eyes and ___ a castle.
journey|The ship's ___ took many weeks.
knowledge|Reading books gives you ___.
language|Spanish is a ___ spoken in many countries.
machine|A washing ___ cleans clothes.
measure|Use a ruler to ___ the line.
mountain|We hiked to the top of the ___.
nervous|I felt ___ before the big game.
ordinary|It was an ___ day until the parade came.
popular|Soccer is a ___ sport.
receive|Did you ___ my letter?
science|In ___ class we learned about plants.
straight|Draw a ___ line with a ruler.
temperature|The ___ outside is very cold.
thousand|Ten hundreds make one ___.
vegetable|A carrot is a ___.`],
    ['5', `accident|Spilling the milk was an ___.
achieve|Practice will help you ___ your goals.
ancient|The pyramids of Egypt are ___.
apparent|It was ___ that the puppy was hungry.
appreciate|I ___ your help.
atmosphere|Earth's ___ is the air around it.
boundary|The river forms a ___ between the two towns.
committee|The ___ met to plan the school fair.
conscience|My ___ told me to tell the truth.
continent|Africa is a large ___.
definitely|I will ___ come to your game.
disappear|The magician made the coin ___.
embarrass|I did not mean to ___ you.
environment|Recycling helps protect the ___.
exaggerate|Don't ___! The fish was not a mile long.
fascinate|Stars and planets ___ me.
government|The ___ makes laws for the country.
guarantee|I ___ you will love this book.
hygiene|Washing your hands is good ___.
independent|An ___ person can do many things alone.
laboratory|The scientist works in a ___.
mischievous|The ___ puppy chewed my shoe.
necessary|Water is ___ for life.
occasion|A wedding is a special ___.
parallel|The two train tracks are ___.
possession|My bike is my favorite ___.
recommend|I ___ this book to everyone.
rhythm|Clap your hands to the ___ of the music.
schedule|Check the ___ to see when the bus comes.
separate|___ the red blocks from the blue blocks.
thorough|Give your room a ___ cleaning.
vacuum|Use the ___ to clean the rug.`]
  ].map(([g, t]) => ({ g, words: t.split('\n').map(l => { const [w, s] = l.split('|'); return { w, s }; }) }));
  const GRADES = ['Kindergarten', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5'];
  const BEE = '<svg viewBox="0 0 64 56" aria-hidden="true"><ellipse cx="22" cy="12" rx="11" ry="8" fill="#e8f6ff" stroke="#5a7a9a" stroke-width="1.5" opacity=".9"/><ellipse cx="40" cy="12" rx="11" ry="8" fill="#e8f6ff" stroke="#5a7a9a" stroke-width="1.5" opacity=".9"/><ellipse cx="32" cy="34" rx="22" ry="17" fill="#ffd21a" stroke="#3a2a00" stroke-width="2"/><path d="M24 18q-3 17 0 32M38 18q3 17 0 32" fill="none" stroke="#2a2010" stroke-width="6"/><path d="M53 34l8 2-8 3" fill="#3a2a00"/><circle cx="18" cy="30" r="10" fill="#ffe46a" stroke="#3a2a00" stroke-width="2"/><circle cx="14" cy="28" r="2.6" fill="#222"/><circle cx="21" cy="28" r="2.6" fill="#222"/><circle cx="15" cy="27" r=".9" fill="#fff"/><circle cx="22" cy="27" r=".9" fill="#fff"/><path d="M13 33q4 4 8 0" fill="none" stroke="#222" stroke-width="1.6" stroke-linecap="round"/><path d="M14 21q-4-9-8-8M20 21q1-9 6-10" fill="none" stroke="#3a2a00" stroke-width="1.5"/><circle cx="6" cy="13" r="2" fill="#3a2a00"/><circle cx="26" cy="11" r="2" fill="#3a2a00"/><circle cx="11" cy="33" r="2" fill="#ff9aa0" opacity=".7"/></svg>';
  const POT = on => `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M6 12q0-4 4-4h12q4 0 4 4v10q0 7-10 7T6 22z" fill="${on ? '#e8a020' : '#ccc'}" stroke="${on ? '#6a4a00' : '#999'}" stroke-width="2"/><rect x="8" y="4" width="16" height="5" rx="2" fill="${on ? '#c87a10' : '#bbb'}" stroke="${on ? '#6a4a00' : '#999'}" stroke-width="1.5"/>${on ? '<path d="M10 10q2 6 4 1q2 5 4 0" fill="#ffd84a"/><path d="M11 18h10" stroke="#ffd84a" stroke-width="3" stroke-linecap="round"/>' : ''}</svg>`;
  const AUD = ['r', 'b', 'f', 'c', 'o', 'e', 'm', 'p'];
  const blankS = s => s.replace('___', '______');

  function openSpell(W, api) {
    const dosMode = api.era.id === '1985', E = api.esc, touch = coarse();
    const P = Object.assign({ grade: 0, right: 0, paid: 0, best: 0, talk: true, rounds: 0, seen: {} }, api.load('prog', {}));
    const saveP = () => api.save('prog', P);
    const say = (t, o) => { if (P.talk) return api.say(t, o); return false; };
    const setHome = escKeeper(W);
    let view = 'home', sel = 0, R0 = null, typed = '', timers = [];
    const later = (fn, ms) => { timers.push(setTimeout(fn, ms)); };
    let S = null, tin = null, root = null;
    if (dosMode) { const d = dosShell(W, touch); S = d.S; tin = d.input; S.onTap = act; hookInput(tin, ch => onChar(ch), () => act('enter'), () => onBack()); }
    else { W.body.innerHTML = `<div class="spb e${api.era.id}"></div>`; root = W.body.firstChild; }

    api.menubar([
      { label: 'Game', items: [{ label: 'Main menu', fn: () => go('home') }, { label: 'Practice', fn: () => start('practice') }, { label: 'Spelling Bee contest', fn: () => start('contest') }, { label: 'Word Scramble', fn: () => start('scramble') }, '-', { label: 'Exit', fn: () => api.close() }] },
      { label: 'Grade', items: () => GRADES.map((g, i) => ({ label: (P.grade === i ? '(o) ' : '( ) ') + g, fn: () => { P.grade = i; saveP(); render(); } })) },
      { label: 'Options', items: () => [{ label: (P.talk ? '[x] ' : '[ ] ') + 'Read words aloud', fn: () => { P.talk = !P.talk; saveP(); } }] },
      { label: 'Help', items: [{ label: 'How to play', fn: howTo }] }
    ]);
    function howTo() {
      api.msgBox('How to play', 'Bea the Bee says a word. Type how to spell it, then press Enter (or Check).\n\nCan\'t hear? Read the sentence: the blank ______ is the word.\n\nHINTS: Hear it again, see the first letter, or see how many letters.\n\nPRACTICE: 10 words from your grade. You get more tries.\nCONTEST: spell as many words as you can! A miss costs a honey pot. You have 3. The words get harder as you go.\nWORD SCRAMBLE: put the mixed-up letters in order.\n\nEvery 10 words you spell right (without seeing the answer) earns $1, up to $4 a day.');
    }
    function pool(g) { return SPW[g].words; }
    function pickWord(g) {
      const L = pool(g), seen = P.seen[g] || [];
      let c = L.filter(x => !seen.includes(x.w) && !(R0 && R0.used.has(x.w)));
      if (!c.length) { P.seen[g] = []; c = L.filter(x => !(R0 && R0.used.has(x.w))); }
      if (!c.length) c = L;
      const w = pickA(c); (P.seen[g] = P.seen[g] || []).push(w.w); if (P.seen[g].length > L.length - 3) P.seen[g] = P.seen[g].slice(-5);
      return Object.assign({ g }, w);
    }
    function go(v) { view = v; sel = 0; R0 = null; typed = ''; setHome(v === 'home'); render(); if (v === 'home') say('Hi, I\'m Bea the Bee! Let\'s spell some words!'); }
    function start(mode) {
      R0 = { mode, n: 0, total: mode === 'practice' ? 10 : mode === 'scramble' ? 5 : Infinity, good: 0, lives: 3, streak: 0, used: new Set(), g: P.grade, word: null, tries: 0, hints: {}, fb: '', fbCls: '', locked: false, revealed: false, tiles: [], picks: [], moods: 0 };
      view = mode; setHome(false); nextWord();
    }
    function nextWord() {
      if (R0.n >= R0.total) return finish();
      if (R0.mode === 'contest') R0.g = Math.min(5, P.grade + Math.floor(R0.good / 5));
      R0.word = pickWord(R0.g); R0.used.add(R0.word.w);
      R0.tries = 0; R0.hints = {}; R0.fb = ''; R0.fbCls = ''; R0.locked = false; R0.revealed = false; typed = '';
      if (R0.mode === 'scramble') {
        let t; let k = 0; do { t = shuffle([...R0.word.w.toLowerCase()]); } while (t.join('') === R0.word.w.toLowerCase() && ++k < 20);
        R0.tiles = t.map((c, i) => ({ c, i, used: false })); R0.picks = [];
      }
      render(); speakWord(); focusIn();
    }
    function speakWord() {
      const w = R0.word;
      if (R0.mode === 'scramble') { say(`Unscramble the letters to make a word. ${w.s.replace('___', 'blank')}`); return; }
      say(`${w.w}. ${w.s.replace('___', w.w)} ${w.w}.`, { rate: 0.85 });
    }
    function norm(s) { return s.trim().toLowerCase().replace(/\s+/g, ''); }
    function check() {
      if (R0.locked) { advance(); return; }
      const w = R0.word.w, ans = R0.mode === 'scramble' ? R0.picks.map(i => R0.tiles[i].c).join('') : typed;
      if (!norm(ans)) { R0.fb = R0.mode === 'scramble' ? 'Tap the letters in order to make the word.' : 'Type the word first, then press Enter.'; R0.fbCls = 'try'; render(); return; }
      if (norm(ans) === w.toLowerCase()) return correct();
      R0.tries++;
      api.tone(300, 0.12, { type: 'triangle', vol: 0.06 });
      if (R0.mode === 'contest') {
        R0.lives--; R0.streak = 0; R0.locked = true; R0.revealed = true; R0.moods = -1;
        R0.fb = `Ooh, so close! It's spelled ${w.toUpperCase().split('').join('-')}.${R0.lives ? ' Keep going!' : ''}`; R0.fbCls = 'try';
        say(`So close! ${w} is spelled ${w.split('').join(', ')}.`, { rate: 0.9 });
        R0.n++;
        render(); return;
      }
      if (R0.mode === 'scramble') {
        const good = [...ans].filter((c, i) => c === w.toLowerCase()[i]).length;
        R0.fb = `Not quite! ${good ? `${good} letter${good > 1 ? 's are' : ' is'} in the right spot (green).` : 'Try a different first letter.'} Tap a red letter to take it back.`;
        R0.fbCls = 'try'; say('Not quite. Try again!'); render(); return;
      }
      if (R0.tries >= 3) { R0.revealed = true; R0.fb = `This word is spelled ${w.toUpperCase()}. Type it to practice!`; R0.fbCls = 'try'; say(`${w} is spelled ${w.split('').join(', ')}. Now you type it.`, { rate: 0.9 }); typed = ''; render(); return; }
      R0.fb = diffHint(norm(ans), w.toLowerCase()); R0.fbCls = 'try';
      R0.last = norm(ans); typed = '';
      say(R0.fb); render();
    }
    function diffHint(a, w) {
      let same = 0; while (same < a.length && same < w.length && a[same] === w[same]) same++;
      if (a.length !== w.length && same >= a.length) return `Good start! ${w.length > a.length ? 'The word is longer.' : 'The word is shorter.'} Try again.`;
      if (same > 0) return `Almost! The first ${same} letter${same > 1 ? 's are' : ' is'} right. Check the ${['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth'][same] || 'next'} letter.`;
      return `Nice try! ${w.length !== a.length ? `The word has ${w.length} letters. ` : ''}Listen again and try once more.`;
    }
    function correct() {
      R0.good += R0.revealed ? 0 : 1; R0.locked = true; R0.streak++; R0.moods = 1;
      if (!R0.revealed && R0.mode !== 'scramble') {
        P.right++;
        if (Math.floor(P.right / 10) > P.paid) { P.paid = Math.floor(P.right / 10); R0.earned = (R0.earned || 0) + dailyEarn(api, 4, 'spelling 10 words right'); }
      }
      saveP();
      const praise = pickA(['You spelled it!', 'Bee-autiful spelling!', 'Buzz-tastic!', 'Hooray, that\'s right!', 'Sweet as honey!', 'Great spelling!']);
      R0.fb = `${praise} ${R0.word.w.toUpperCase()}`; R0.fbCls = 'good';
      api.tone(660, 0.08, { type: 'square', vol: 0.06 }); api.tone(880, 0.08, { type: 'square', vol: 0.06, at: 0.08 }); api.tone(1175, 0.12, { type: 'square', vol: 0.05, at: 0.16 });
      say(praise);
      R0.n++;
      render();
    }
    function advance() {
      if (R0.mode === 'contest' && R0.lives <= 0) return finish();
      nextWord();
    }
    function finish() {
      view = 'end'; R0.locked = true;
      if (R0.mode === 'contest') { R0.newBest = R0.good > P.best; P.best = Math.max(P.best, R0.good); }
      P.rounds++; saveP(); api.sfx.tada();
      say(R0.mode === 'contest' ? `The contest is over! You spelled ${R0.good} words! The audience loved it!` : `You finished! You got ${R0.good} out of ${R0.total} right!`);
      render();
    }
    function hint(k) {
      if (!R0 || R0.locked) return;
      R0.hints[k] = true;
      if (k === 'hear') speakWord();
      if (k === 'first') { R0.fb = `It starts with ${R0.word.w[0].toUpperCase()}.`; say(`It starts with ${R0.word.w[0]}.`); }
      if (k === 'count') { R0.fb = `It has ${R0.word.w.length} letters.`; say(R0.fb); }
      if (k === 'tile' && R0.mode === 'scramble') {
        // put the next correct letter in place
        const w = R0.word.w.toLowerCase();
        while (R0.picks.length && R0.picks.some((ti, j) => R0.tiles[ti].c !== w[j])) { const ti = R0.picks.pop(); R0.tiles[ti].used = false; }
        const need = w[R0.picks.length], t = R0.tiles.find(x => !x.used && x.c === need);
        if (t) { t.used = true; R0.picks.push(t.i); }
        R0.revealed = true;
        if (R0.picks.length === w.length) return check();
      }
      R0.fbCls = ''; render(); focusIn();
    }
    function pickTile(i) {
      if (R0.locked) return; const t = R0.tiles[i]; if (!t || t.used) return;
      t.used = true; R0.picks.push(i); api.tone(700 + R0.picks.length * 60, 0.05, { type: 'square', vol: 0.05 });
      R0.fb = ''; if (R0.picks.length === R0.tiles.length) return check();
      render();
    }
    function unpick(j) { if (R0.locked) return; const rem = R0.picks.splice(j); rem.forEach(i => { R0.tiles[i].used = false; }); api.sfx.click(); render(); }
    function onChar(ch) {
      if (view === 'home' || view === 'end') { if (ch === ' ') act('enter'); else if (view === 'home' && /[1-5]/.test(ch)) act(['practice', 'contest', 'scramble', 'grade', 'help'][+ch - 1]); return; }
      if (!R0 || R0.locked) { if (ch === ' ') act('enter'); return; }
      if (!/[a-zA-Z]/.test(ch)) return;
      if (R0.mode === 'scramble') { const t = R0.tiles.find(x => !x.used && x.c === ch.toLowerCase()); if (t) pickTile(t.i); return; }
      if (typed.length < 16) { typed += ch.toLowerCase(); api.sfx.key(); if (dosMode) render(); }
    }
    function onBack() {
      if (!R0 || R0.locked) return;
      if (R0.mode === 'scramble') { if (R0.picks.length) unpick(R0.picks.length - 1); return; }
      typed = typed.slice(0, -1); if (dosMode) render();
    }
    function act(a) {
      if (a == null) return;
      api.sfx.click();
      if (a === 'practice' || a === 'contest' || a === 'scramble') return start(a);
      if (a === 'home') return go('home');
      if (a === 'help') return howTo();
      if (a === 'grade') { P.grade = (P.grade + 1) % 6; saveP(); say(GRADES[P.grade]); return render(); }
      if (/^g\d$/.test(a)) { P.grade = +a[1]; saveP(); say(GRADES[P.grade]); return render(); }
      if (a === 'hear' || a === 'first' || a === 'count' || a === 'tile') return hint(a);
      if (a === 'check') { if (!dosMode) { const i = root.querySelector('.spb-in'); if (i) typed = i.value; } return check(); }
      if (a === 'again') return start(R0.mode);
      if (/^t\d+$/.test(a)) return pickTile(+a.slice(1));
      if (/^u\d+$/.test(a)) return unpick(+a.slice(1));
      if (a === 'enter') {
        if (view === 'home') return act(['practice', 'contest', 'scramble', 'grade', 'help'][sel]);
        if (view === 'end') return start(R0.mode);
        if (R0) { if (!dosMode && !R0.locked) { const i = root.querySelector('.spb-in'); if (i) typed = i.value; } return check(); }
      }
    }
    function focusIn() {
      if (dosMode) { if (touch && tin) setTimeout(() => tin.focus({ preventScroll: true }), 50); return; }
      if (touch && R0 && R0.mode === 'scramble') return;
      setTimeout(() => { const i = root.querySelector('.spb-in'); if (i) i.focus({ preventScroll: true }); }, 30);
    }
    const opened = performance.now();
    W.onKey = e => {
      if (e.ctrlKey || e.metaKey || e.altKey || performance.now() - opened < 300) return;
      const inField = e.target && e.target.classList && (e.target.classList.contains('spb-in') || e.target.classList.contains('lrn-tin'));
      if (e.key === 'Escape') { if (view !== 'home') go('home'); return; }
      if (/^F[1-3]$/.test(e.key)) { e.preventDefault(); if (R0 && !R0.locked) hint(R0.mode === 'scramble' ? ['hear', 'tile', 'tile'][+e.key[1] - 1] : ['hear', 'first', 'count'][+e.key[1] - 1]); return; }
      if (inField) { if (e.key === 'Enter' && !dosMode) { e.preventDefault(); typed = e.target.value; act('enter'); } return; }
      if (e.key === 'Enter') { e.preventDefault(); act('enter'); return; }
      if (e.key === 'Backspace') { e.preventDefault(); onBack(); return; }
      if (view === 'home' && /^Arrow(Up|Down)$/.test(e.key)) { e.preventDefault(); sel = (sel + (e.key === 'ArrowDown' ? 1 : 4)) % 5; render(); return; }
      if (view === 'home' && /^Arrow(Left|Right)$/.test(e.key)) { e.preventDefault(); P.grade = (P.grade + (e.key === 'ArrowRight' ? 1 : 5)) % 6; saveP(); render(); return; }
      if (e.key.length === 1) { e.preventDefault(); onChar(e.key); if (!dosMode && R0 && !R0.locked && R0.mode !== 'scramble') { const i = root.querySelector('.spb-in'); if (i) { i.value = typed; i.focus(); } } }
    };

    /* ---- DOM view ---- */
    function render() {
      if (dosMode) return tmRender();
      let h = '';
      const back = '<button class="spb-back" data-a="home">&#9666; Back</button>';
      if (view === 'home') {
        h = `<div class="spb-home"><div class="spb-bee big">${BEE}</div><div class="spb-logo">Spelling <span>Bee</span></div>
          <div class="spb-gr"><span>Pick your grade:</span>${GRADES.map((g, i) => `<button class="spb-g${P.grade === i ? ' on' : ''}" data-a="g${i}">${i === 0 ? 'K' : i}</button>`).join('')}</div>
          <div class="spb-menu">${[['practice', 'Practice', '10 words with lots of help'], ['contest', 'Spelling Bee Contest', `3 honey pots. Best: ${P.best} words`], ['scramble', 'Word Scramble', 'Bonus game: unmix the letters']].map(([a, t, s], i) => `<button class="spb-big${sel === i ? ' sel' : ''}" data-a="${a}"><b>${t}</b><small>${E(s)}</small></button>`).join('')}</div>
          <p class="spb-tot">Words spelled right: <b>${P.right}</b></p></div>`;
      } else if (view === 'end') {
        const c = R0.mode === 'contest';
        h = `<div class="spb-hd">${back}<b>${c ? 'Contest over!' : R0.mode === 'scramble' ? 'Word Scramble' : 'Practice done!'}</b></div><div class="spb-end">
          <div class="spb-conf">${Array.from({ length: 16 }, (_, i) => `<i style="left:${(i * 43) % 100}%;animation-delay:${(i % 5) * 0.2}s;background:${['#ffd21a', '#ff7a4a', '#7ac85a', '#5ab4ff'][i % 4]}"></i>`).join('')}</div>
          <div class="spb-ribbon"><svg viewBox="0 0 80 100" aria-hidden="true"><path d="M22 50L10 96l18-10 8 14 6-44zM58 50l12 46-18-10-8 14-6-44z" fill="#2a62d8" stroke="#1a3a8a" stroke-width="2"/><circle cx="40" cy="36" r="30" fill="#ffd21a" stroke="#8a6a00" stroke-width="3"/><circle cx="40" cy="36" r="22" fill="#ffe46a" stroke="#8a6a00" stroke-width="1.5"/><text x="40" y="45" text-anchor="middle" font-size="26" font-weight="700" fill="#6a4a00" font-family="Arial">${R0.good}</text></svg></div>
          <p class="spb-cheer">${c ? `You spelled ${R0.good} word${R0.good === 1 ? '' : 's'}!${R0.newBest ? ' A new record!' : ''}` : `${R0.good} of ${R0.total} right!`}</p>
          ${c ? `<div class="spb-aud cheer">${AUD.map(k => `<span>${critSvg(k)}</span>`).join('')}</div>` : `<div class="spb-stars">${starStr(starsFor(R0.good, R0.total))}</div>`}
          ${R0.earned ? `<p class="spb-earn">You earned $${R0.earned}!</p>` : ''}
          <p class="spb-tot">Words spelled right in all: <b>${P.right}</b>. ${10 - P.right % 10} more to your next $1!</p>
          <div class="spb-row"><button class="spb-go" data-a="again">Play again</button><button class="spb-btn" data-a="home">Menu</button></div></div>`;
      } else {
        const w = R0.word, sc = R0.mode === 'scramble', c = R0.mode === 'contest';
        const top = c ? `<div class="spb-stand"><div class="spb-aud ${R0.moods > 0 ? 'cheer' : R0.moods < 0 ? 'ooh' : ''}">${AUD.map(k => `<span>${critSvg(k)}</span>`).join('')}</div><div class="spb-lives">${[0, 1, 2].map(i => POT(i < R0.lives)).join('')}<b>Score: ${R0.good}</b><small>${GRADES[R0.g]}</small></div></div>` : '';
        const prog = c ? '' : `<span class="spb-dots">${Array.from({ length: R0.total }, (_, i) => `<i class="${i < R0.n ? 'ok' : i === R0.n ? 'now' : ''}"></i>`).join('')}</span>`;
        const shown = R0.locked || R0.revealed && !sc;
        h = `<div class="spb-hd">${back}<b>${c ? 'Spelling Bee Contest' : sc ? 'Word Scramble' : 'Practice'}</b>${prog}</div>${top}
          <div class="spb-play">
            <div class="spb-say"><div class="spb-bee">${BEE}</div><div class="spb-bub"><p>${sc ? 'Unscramble the letters!' : 'Listen, then spell the word.'}</p><p class="spb-sent">${E(shown ? w.s.replace('___', w.w) : blankS(w.s)).replace('______', '<u>&nbsp;?&nbsp;</u>')}</p></div></div>
            ${sc ? `<div class="spb-slots">${w.w.split('').map((_, j) => { const ti = R0.picks[j]; const ch = ti != null ? R0.tiles[ti].c : ''; const ok = ch && ch === w.w.toLowerCase()[j]; return `<button class="spb-slot${ch ? (R0.fbCls === 'try' ? (ok ? ' ok' : ' bad') : ' on') : ''}" data-a="u${j}"${ch ? '' : ' disabled'}>${E(ch.toUpperCase())}</button>`; }).join('')}</div>
              <div class="spb-tiles">${R0.tiles.map(t => `<button class="spb-tile" data-a="t${t.i}"${t.used || R0.locked ? ' disabled' : ''}>${E(t.c.toUpperCase())}</button>`).join('')}</div>`
            : `<div class="spb-inrow">${R0.hints.count || R0.hints.first ? `<div class="spb-boxes">${w.w.split('').map((ch, j) => `<i>${j === 0 && R0.hints.first ? E(ch.toUpperCase()) : R0.hints.count ? '_' : ''}</i>`).join('')}</div>` : ''}
              <input class="spb-in" type="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="done" placeholder="Type the word here" value="${E(typed)}"${R0.locked ? ' disabled' : ''} aria-label="Type the word">
              ${R0.revealed && !R0.locked ? `<div class="spb-copy">${E(w.w.toUpperCase())}</div>` : ''}</div>`}
            <div class="spb-fb ${R0.fbCls}">${E(R0.fb)}</div>
            <div class="spb-row">${R0.locked ? `<button class="spb-go" data-a="check">${c && R0.lives <= 0 ? 'See score' : 'Next word'} &#9656;</button>`
              : `<button class="spb-btn" data-a="hear">Hear it</button>${sc ? '<button class="spb-btn" data-a="tile">Hint</button>' : `<button class="spb-btn" data-a="first">First letter</button><button class="spb-btn" data-a="count">How many letters?</button><button class="spb-go" data-a="check">Check</button>`}`}</div>
          </div>`;
      }
      root.innerHTML = h;
      root.querySelectorAll('[data-a]').forEach(b => b.onclick = () => act(b.dataset.a));
      const inp = root.querySelector('.spb-in');
      if (inp) { inp.addEventListener('input', () => { typed = inp.value.replace(/[^a-zA-Z]/g, '').toLowerCase(); }); if (!touch) inp.focus({ preventScroll: true }); inp.setSelectionRange && inp.setSelectionRange(inp.value.length, inp.value.length); }
    }

    /* ---- 1985 text mode ---- */
    function tmRender() {
      if (!S || !S.fit()) return;
      const w = S.cols, wide = w >= 80;
      S.title('SPELLING BEE' + (wide ? '  v1.0' : ''), view === 'home' ? 'Esc=Exit' : 'Esc=Menu');
      const bee = [' \\ /  ', '(o o)=', ' ~~~  '];
      if (view === 'home') {
        const art = ['▄▀▀ █▀▄ █▀▀ █   █   █ █▄ █ █▀▀   █▀▄ █▀▀ █▀▀', ' ▀▄ █▀  █▀  █   █   █ █ ▀█ █ ▄   █▀▄ █▀  █▀ ', '▀▀  ▀   ▀▀▀ ▀▀▀ ▀▀▀ ▀ ▀  ▀ ▀▀▀   ▀▀  ▀▀▀ ▀▀▀'];
        if (wide) art.forEach((l, i) => S.center(2 + i, l, 'b')); else { S.center(2, 'S P E L L I N G', 'b'); S.center(3, 'B E E', 'b'); }
        ['  \\ /         ', ' (o o)~~ BZZZ!', '  ^ ^         '].forEach((l, i) => S.put(Math.floor((w - 14) / 2), 5 + i, l, i === 1 ? 'b' : ''));
        const items = [['1  PRACTICE', 'practice'], ['2  CONTEST', 'contest'], ['3  WORD SCRAMBLE', 'scramble'], [`4  GRADE: ${GRADES[P.grade].toUpperCase()}`, 'grade'], ['5  HOW TO PLAY', 'help']];
        const bw = wide ? 32 : 28, bx = Math.floor((w - bw) / 2);
        items.forEach(([t, k], i) => S.button(bx, 8 + i * 3, bw, t, k, sel === i));
        S.center(24 - 1, wide ? `Words spelled right: ${P.right}   Contest best: ${P.best}` : `Right: ${P.right}   Contest best: ${P.best}`, 'd');
        S.status([['1-5 Pick', null], ['Enter=Go', 'enter'], ['Esc=Exit', null]]);
      } else if (view === 'end') {
        const c = R0.mode === 'contest';
        S.box(Math.floor(w / 2) - 18, 3, 36, 14, true, 'b');
        S.center(5, c ? 'THE CONTEST IS OVER!' : 'ROUND COMPLETE!', 'bk');
        S.center(7, c ? `YOU SPELLED ${R0.good} WORD${R0.good === 1 ? '' : 'S'}!` : `${R0.good} OF ${R0.total} RIGHT!`, 'b');
        if (c && R0.newBest) S.center(8, 'A NEW RECORD!', 'b');
        if (!c) S.center(8, starStr(starsFor(R0.good, R0.total)).replace(/★/g, '*').replace(/☆/g, '.').split('').join(' '), 'b');
        if (c) S.center(10, '(^o^) (^.^) (^_^) (^o^)  CLAP CLAP!', '');
        S.center(12, `Words spelled right in all: ${P.right}`);
        if (R0.earned) S.center(13, `You earned $${R0.earned}!`, 'b');
        S.button(Math.floor(w / 2) - 16, 18, 16, 'PLAY AGAIN', 'again', true);
        S.button(Math.floor(w / 2) + 1, 18, 14, 'MENU', 'home');
        S.status([['Enter=Again', 'enter'], ['Esc=Menu', 'home']]);
      } else {
        const wd = R0.word, sc = R0.mode === 'scramble', c = R0.mode === 'contest';
        S.put(1, 1, (c ? 'CONTEST' : sc ? (wide ? 'WORD SCRAMBLE' : 'SCRAMBLE') : 'PRACTICE') + '  ' + (wide ? GRADES[R0.g].toUpperCase() : 'GRADE ' + SPW[R0.g].g), 'b');
        S.put(w - 17, 1, c ? `HONEY ${'[*]'.repeat(R0.lives)}${'[ ]'.repeat(3 - R0.lives)}` : `Word ${Math.min(R0.n + 1, R0.total)}/${R0.total}`, 'b');
        if (c) { S.put(1, 2, `Score: ${R0.good}`); S.center(3, R0.moods > 0 ? '(^o^) (^.^) YAY! (^_^) (^o^)' : R0.moods < 0 ? '(o.o) (O_O) OOOH (o.o) (O_O)' : '(-.-) (o.o) ..... (o.o) (-.-)', R0.moods ? 'b' : 'd'); }
        bee.forEach((l, i) => S.put(wide ? 2 : 1, 5 + i, l, 'b'));
        const bx0 = wide ? 10 : 7, bw = w - bx0 - 1, tx = bx0 + 2;
        S.box(bx0, 4, bw, 6, false);
        S.put(tx, 5, sc ? (wide ? 'Unscramble the letters!' : 'Unscramble it!') : (wide ? 'Listen, then spell the word:' : 'Spell the word:'), 'b');
        const sent = R0.locked || R0.revealed && !sc ? wd.s.replace('___', wd.w.toUpperCase()) : blankS(wd.s);
        S.wrap(sent, bw - 4).slice(0, 3).forEach((l, i) => S.put(tx, 6 + i, l));
        if (sc) {
          const n = wd.w.length, x0 = Math.floor((w - n * 4) / 2);
          for (let j = 0; j < n; j++) { const ti = R0.picks[j]; S.box(x0 + j * 4, 11, 3, 3, false, '', ti != null ? 'u' + j : null); if (ti != null) S.put(x0 + j * 4 + 1, 12, R0.tiles[ti].c.toUpperCase(), 'b', 'u' + j); }
          R0.tiles.forEach((t, j) => { if (!t.used) { S.box(x0 + j * 4, 15, 3, 3, false, 'i', 't' + t.i); S.put(x0 + j * 4 + 1, 16, t.c.toUpperCase(), 'i', 't' + t.i); } });
        } else {
          const n = Math.max(wd.w.length, typed.length + 1), bw2 = Math.min(w - 4, n * 2 + 6), bx = Math.floor((w - bw2) / 2);
          S.box(bx, 11, bw2, 3, true);
          const shown = typed.toUpperCase().split('');
          for (let j = 0; j < n; j++) {
            const x = bx + 3 + j * 2; if (x >= bx + bw2 - 1) break;
            if (j < shown.length) S.put(x, 12, shown[j], 'b');
            else if (j === shown.length && !R0.locked) S.put(x, 12, '_', 'bk');
            else if (R0.hints.count && j < wd.w.length) S.put(x, 12, '.', 'd');
          }
          if (R0.hints.first) S.center(14, `Starts with ${wd.w[0].toUpperCase()}` + (R0.hints.count ? `, ${wd.w.length} letters` : ''), 'd');
          else if (R0.hints.count) S.center(14, `${wd.w.length} letters`, 'd');
          if (R0.revealed && !R0.locked) S.center(15, 'COPY IT: ' + wd.w.toUpperCase(), 'b');
        }
        S.wrap(R0.fb, w - 4).slice(0, 2).forEach((l, i) => S.center(18 + i, l, R0.fbCls === 'good' ? 'bk' : 'b'));
        if (R0.locked) S.button(Math.floor(w / 2) - 10, 20, 20, c && R0.lives <= 0 ? 'SEE SCORE' : 'NEXT WORD', 'check', true);
        S.status(R0.locked ? [['Enter=Next', 'check'], ['Esc=Menu', 'home']] : sc ? [['F1=Hear', 'hear'], ['F2=Hint', 'tile'], ['Bksp=Undo', null], ['Esc=Menu', 'home']] : [['F1=Hear', 'hear'], ['F2=1st letter', 'first'], ['F3=Length', 'count'], ['Enter=Check', 'check'], ['Esc', 'home']]);
      }
      S.flush();
    }
    W.onResize = () => render();
    W.onClose = () => { timers.forEach(clearTimeout); if (S) S.stop(); };
    go('home');
    if (dosMode) requestAnimationFrame(() => render());
  }
  const CSS_SPB = `
    .spb{height:100%;display:flex;flex-direction:column;background:linear-gradient(#fff6c8,#ffe38a);color:#2a2000;font-family:var(--ui);overflow:hidden}
    .spb.e1990{background:#ffff80}
    .spb-hd{display:flex;align-items:center;gap:8px;padding:4px 8px;background:#3a2a00;color:#ffd21a;min-height:36px;flex:none}
    .spb-hd b{flex:1;font:400 24px/1 var(--dos);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .spb-back{min-height:38px;min-width:64px;background:#ffd21a;color:#3a2a00;border:2px solid #8a6a00;border-radius:8px;font:700 14px var(--ui);cursor:pointer}
    .spb-dots{display:flex;gap:3px;flex-wrap:wrap;max-width:45%}.spb-dots i{width:11px;height:11px;border-radius:50%;border:2px solid #ffd21a}.spb-dots i.ok{background:#ffd21a}.spb-dots i.now{background:#fff}
    .spb-home{flex:1;overflow:auto;display:flex;flex-direction:column;align-items:center;gap:8px;padding:10px}
    .spb-bee{width:64px;height:56px;flex:none}.spb-bee svg{width:100%;height:100%}
    .spb-bee.big{width:110px;height:96px;animation:spb-fly 1.6s ease-in-out infinite alternate}
    @keyframes spb-fly{0%{transform:translate(-14px,4px) rotate(-5deg)}100%{transform:translate(14px,-6px) rotate(5deg)}}
    .spb-logo{font:400 clamp(36px,9vw,58px)/1 var(--dos);color:#3a2a00;text-shadow:2px 2px #fff,4px 4px #ffb400}
    .spb-logo span{color:#e07a00}
    .spb-gr{display:flex;flex-wrap:wrap;gap:5px;align-items:center;justify-content:center}
    .spb-gr span{font-weight:700;margin-right:4px}
    .spb-g{min-width:44px;min-height:44px;border-radius:50%;border:3px solid #8a6a00;background:#fff;font:400 24px var(--dos);cursor:pointer;color:#3a2a00}
    .spb-g.on{background:#3a2a00;color:#ffd21a}
    .spb-menu{display:flex;flex-direction:column;gap:8px;width:100%;max-width:420px}
    .spb-big{min-height:62px;padding:6px 14px;background:#fff;border:3px solid #3a2a00;border-radius:14px;cursor:pointer;text-align:left;font-family:var(--ui);box-shadow:0 4px 0 #8a6a00;background-image:repeating-linear-gradient(90deg,transparent 0 92%,#ffd21a33 92% 100%)}
    .spb-big.sel,.spb-big:focus-visible{background-color:#fff6b0;outline:none}
    .spb-big b{display:block;font-size:19px}.spb-big small{color:#6a5a2a}
    .spb-tot{margin:0;text-align:center}
    .spb-stand{flex:none;background:linear-gradient(#8a5a2a,#6a4018);padding:4px 6px;display:flex;align-items:center;gap:6px;flex-wrap:wrap;justify-content:space-between}
    .spb-aud{display:flex;gap:2px;flex-wrap:wrap}.spb-aud span{width:34px;height:34px;display:block}.spb-aud svg{width:100%;height:100%}
    .spb-aud.cheer span{animation:spb-jump .4s ease-in-out 3 alternate}.spb-aud.cheer span:nth-child(odd){animation-delay:.15s}
    .spb-aud.ooh span{animation:spb-ooh .5s}
    @keyframes spb-jump{to{transform:translateY(-8px)}}
    @keyframes spb-ooh{50%{transform:scale(.85) rotate(-6deg)}}
    .spb-lives{display:flex;align-items:center;gap:2px;color:#ffe46a}.spb-lives svg{width:30px;height:30px}.spb-lives b{margin-left:6px;font:400 22px var(--dos)}.spb-lives small{margin-left:6px}
    .spb-play{flex:1;min-height:0;overflow:auto;display:flex;flex-direction:column;align-items:center;gap:8px;padding:8px}
    .spb-say{display:flex;gap:8px;align-items:center;width:100%;max-width:620px}
    .spb-bub{flex:1;background:#fff;border:2px solid #3a2a00;border-radius:14px;padding:6px 10px}
    .spb-bub p{margin:0 0 2px}
    .spb-sent{font:400 26px/1.15 var(--dos);color:#1a3a6a}
    .spb-sent u{text-decoration:none;border-bottom:3px solid #e07a00;color:#e07a00;padding:0 10px}
    .spb-inrow{display:flex;flex-direction:column;align-items:center;gap:6px;width:100%;max-width:420px}
    .spb-boxes{display:flex;gap:4px;flex-wrap:wrap;justify-content:center}.spb-boxes i{width:26px;height:32px;border-bottom:3px solid #3a2a00;font:400 28px/32px var(--dos);text-align:center;font-style:normal}
    .spb-in{width:100%;min-height:52px;box-sizing:border-box;font:400 34px var(--dos);letter-spacing:4px;text-align:center;padding:4px 10px;border:3px solid #3a2a00;border-radius:12px;background:#fffdf0;text-transform:lowercase}
    .spb-in::placeholder{letter-spacing:0;font-size:22px}
    .spb-copy{font:400 34px var(--dos);letter-spacing:6px;color:#1a7a2a}
    .spb-fb{min-height:22px;font-weight:700;text-align:center;max-width:620px;font-size:16px}
    .spb-fb.good{color:#1a7a2a;font-size:20px}.spb-fb.try{color:#a04a00}
    .spb-row{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}
    .spb-btn,.spb-go{min-height:48px;padding:6px 14px;border-radius:12px;border:3px solid #3a2a00;background:#fff;color:#3a2a00;font:700 15px var(--ui);cursor:pointer;box-shadow:0 3px 0 #8a6a00}
    .spb-go{background:#2a9a3a;border-color:#1a5a2a;color:#fff;box-shadow:0 3px 0 #1a5a2a;font-size:18px}
    .spb-slots,.spb-tiles{display:flex;gap:5px;flex-wrap:wrap;justify-content:center}
    .spb-slot{width:44px;height:52px;border:3px dashed #8a6a00;border-radius:8px;background:#fff8;font:400 34px var(--dos);color:#3a2a00;padding:0}
    .spb-slot.on{border-style:solid;background:#fff;cursor:pointer}.spb-slot.ok{border-style:solid;background:#b8f0b8}.spb-slot.bad{border-style:solid;background:#ffd0c0;cursor:pointer}
    .spb-tile{width:48px;height:52px;border:3px solid #8a6a00;border-radius:10px;background:#ffd21a;font:400 34px var(--dos);color:#3a2a00;cursor:pointer;box-shadow:0 3px 0 #8a6a00;padding:0}
    .spb-tile:disabled{visibility:hidden}
    .spb-end{position:relative;flex:1;overflow:auto;display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px;text-align:center}
    .spb-ribbon{width:96px;height:120px;animation:spb-pop .6s}.spb-ribbon svg{width:100%;height:100%}
    .spb-cheer{font:400 30px/1.1 var(--dos);margin:0;color:#1a3a6a}
    .spb-stars{font-size:44px;color:#ffb400;text-shadow:1px 2px #a06000;letter-spacing:4px}
    .spb-earn{margin:0;font-weight:700;color:#1a7a2a}
    .spb-conf{position:absolute;inset:0;pointer-events:none;overflow:hidden}
    .spb-conf i{position:absolute;top:-12px;width:9px;height:13px;animation:spb-fall 2.4s linear 2 forwards}
    @keyframes spb-fall{to{transform:translateY(420px) rotate(540deg);opacity:0}}
    @keyframes spb-pop{0%{transform:scale(.3) rotate(-20deg)}70%{transform:scale(1.1)}}
  `;
  const ICON_SPB = '<svg viewBox="0 0 32 32" shape-rendering="crispEdges" aria-hidden="true"><rect x="2" y="20" width="9" height="10" fill="#fff" stroke="#000"/><rect x="12" y="20" width="9" height="10" fill="#fff" stroke="#000"/><rect x="22" y="20" width="9" height="10" fill="#fff" stroke="#000"/><path d="M4 28l2.5-7 2.5 7M5 26h3" stroke="#c00" fill="none"/><path d="M14 21v7h3q2 0 2-2t-2-2h-3M14 21h3q2 0 2 1.5T17 24" stroke="#060" fill="none"/><path d="M29 22q-2-1-3.5 0t0 5 3.5 1" stroke="#008" fill="none"/><ellipse cx="12" cy="6" rx="4" ry="3" fill="#dff" stroke="#000"/><ellipse cx="19" cy="6" rx="4" ry="3" fill="#dff" stroke="#000"/><ellipse cx="16" cy="12" rx="8" ry="5" fill="#ffd21a" stroke="#000"/><rect x="13" y="7" width="2" height="10" fill="#000"/><rect x="18" y="7" width="2" height="10" fill="#000"/><circle cx="9.5" cy="11" r="1" fill="#000"/></svg>';

  (window.RETRO_APPS = window.RETRO_APPS || []).push(
    { id: 'critters', label: 'Keyboard Critters', kind: 'builtin', cat: 'game', cmd: 'TYPING', eras: ['1985', '1990', '1995', '2000'], icon: ICON_KCR, window: { w: 680, h: 560 }, css: CSS_SHARED + CSS_KCR, open: openCritters },
    { id: 'turtle', label: 'Code Turtle', kind: 'builtin', cat: 'game', cmd: 'TURTLE', eras: ['1985', '1990', '1995', '2000'], icon: ICON_CTL, window: { w: 720, h: 560 }, css: CSS_CTL, open: openTurtle },
    { id: 'lifeskills', label: 'Clock & Coins', kind: 'builtin', cat: 'game', cmd: 'CLOCKS', eras: ['1990', '1995', '2000'], icon: ICON_CLC, window: { w: 640, h: 580 }, css: CSS_CLC, open: openClocks },
    { id: 'spellbee', label: 'Spelling Bee', kind: 'builtin', cat: 'game', cmd: 'SPELL', eras: ['1985', '1990', '1995', '2000'], icon: ICON_SPB, window: { w: 640, h: 560 }, css: CSS_SPB, open: openSpell }
  );
})();
