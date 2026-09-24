/* Games Room: Horizon 2000's pretend online game lobby. Needs the modem connection.
   Rooms, matchmaking and preset-phrase chat with computer characters, plus three complete games:
   Backgammon, Spades (you and a computer partner) and Dots and Boxes. Every opponent is a computer player. */
(function () {
  'use strict';

  const DEV = /[?&]dev\b/.test(location.search);
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pickA = a => a[Math.floor(Math.random() * a.length)];
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const GAMES = {
    bg: { name: 'Backgammon', blurb: 'Race your 15 checkers home and bear them off.' },
    sp: { name: 'Spades', blurb: 'Bid and take tricks with a computer partner.' },
    db: { name: 'Dots and Boxes', blurb: 'Draw lines, close boxes, take the most.' }
  };
  const SKILL = ['Easy', 'Medium', 'Hard'];
  const ROOMS = [
    { g: 'bg', lvl: 0, name: 'Rookie Lounge', n: 184 }, { g: 'bg', lvl: 1, name: 'Friendly Tables', n: 322 }, { g: 'bg', lvl: 2, name: 'Champions\' Hall', n: 97 },
    { g: 'sp', lvl: 0, name: 'Rookie Lounge', n: 263 }, { g: 'sp', lvl: 1, name: 'Friendly Tables', n: 471 }, { g: 'sp', lvl: 2, name: 'Champions\' Hall', n: 138 },
    { g: 'db', lvl: 0, name: 'Rookie Lounge', n: 129 }, { g: 'db', lvl: 1, name: 'Friendly Tables', n: 208 }, { g: 'db', lvl: 2, name: 'Champions\' Hall', n: 61 }
  ];

  /* ---------- computer characters ---------- */
  const NA = ['Dice', 'Lucky', 'Captain', 'Pixel', 'Turbo', 'Sunny', 'Mighty', 'Cosmic', 'Rocket', 'Quiet', 'Jolly', 'Clever', 'Speedy', 'Snowy', 'Gizmo', 'Maple', 'Pebble', 'Waffle', 'Noodle', 'Biscuit'];
  const NB = ['Fox', 'Owl', 'Moose', 'Otter', 'Llama', 'Gecko', 'Ace', 'Wizard', 'Badger', 'Panda', 'Comet', 'Toad', 'Heron', 'Walrus', 'Bean', 'Nugget', 'Yeti', 'Robot'];
  const TOWNS = ['Button Bay', 'Gravy Flats', 'Sprocket City', 'Upper Widget', 'Muffin Ridge', 'Pinecone Point', 'Lake Noodle', 'Teapot Hills', 'Biscuit Junction', 'Port Pickle', 'Mount Mitten', 'Walrus Harbor'];
  const QUIRKS = ['Likes pancakes and rainy days.', 'Collects bottle caps.', 'Has a very loud parrot.', 'Plays best after lunch.', 'Says the dice are rigged.', 'Practicing for the big tournament.', 'Always says hi first.', 'Owns 14 board games.', 'Keeps a lucky pencil.', 'Hums while thinking.', 'Never skips breakfast.', 'Builds model rockets.'];
  const COLORS = ['#c0392b', '#2e86de', '#27ae60', '#8e44ad', '#e67e22', '#16a085', '#d35400', '#2c3e50', '#b8860b', '#c2185b'];
  function makeBot(lvl, others = []) {
    const taken = others.map(b => b.name), q = QUIRKS.filter(x => !others.some(b => b.quirk === x)), tw = TOWNS.filter(x => !others.some(b => b.town === x)), cl = COLORS.filter(x => !others.some(b => b.color === x));
    let name;
    do {
      const a = pickA(NA), b = pickA(NB), f = rnd(0, 4);
      name = f === 0 ? `${a}${b}${rnd(2, 99)}` : f === 1 ? `${a.toLowerCase()}_${b.toLowerCase()}` : f === 2 ? `xX${a}${b}Xx` : f === 3 ? `${a}${b}_2000` : `The${a}${b}`;
    } while (taken.includes(name));
    const base = [950, 1250, 1550][lvl];
    const g = rnd(40, 900);
    return { name, rating: base + rnd(0, 230), town: pickA(tw), quirk: pickA(q), games: g, won: Math.round(g * (0.35 + lvl * 0.08 + Math.random() * 0.1)), color: pickA(cl), eye: pickA(['#ff0', '#0ff', '#f80', '#8f8']), chat: 0.45 + Math.random() * 0.45, ant: rnd(0, 2) };
  }
  function botFace(b, size = 32) {
    const ant = b.ant === 0 ? '<rect x="15" y="1" width="2" height="5" fill="#666"/><rect x="14" y="0" width="4" height="3" fill="#e33"/>' : b.ant === 1 ? '<rect x="9" y="2" width="2" height="4" fill="#666"/><rect x="21" y="2" width="2" height="4" fill="#666"/>' : '<rect x="12" y="4" width="8" height="2" fill="#666"/>';
    return `<svg class="gmr-face" width="${size}" height="${size}" viewBox="0 0 32 32" shape-rendering="crispEdges" aria-hidden="true">${ant}<rect x="5" y="6" width="22" height="20" fill="${b.color}" stroke="#000"/><rect x="2" y="12" width="3" height="8" fill="#888" stroke="#000"/><rect x="27" y="12" width="3" height="8" fill="#888" stroke="#000"/><rect x="9" y="11" width="5" height="5" fill="${b.eye}" stroke="#000"/><rect x="18" y="11" width="5" height="5" fill="${b.eye}" stroke="#000"/><rect x="10" y="20" width="12" height="3" fill="#222"/><rect x="12" y="20" width="2" height="3" fill="#ddd"/><rect x="16" y="20" width="2" height="3" fill="#ddd"/><rect x="8" y="26" width="16" height="4" fill="#555" stroke="#000"/></svg>`;
  }
  function botCard(b, role) {
    return `<div class="gmr-ocard raised">${botFace(b, 40)}<div class="gmr-oinfo"><div><b>${esc(b.name)}</b> <span class="gmr-cpu">COMPUTER</span>${role ? ` <span class="gmr-role">${esc(role)}</span>` : ''}</div>` +
      `<div>Rating <b>${b.rating}</b> · ${b.won}-${b.games - b.won}</div><div>Home: ${esc(b.town)}</div><div class="gmr-quirk">${esc(b.quirk)}</div></div></div>`;
  }

  /* ---------- chat phrase banks ---------- */
  const LINES = {
    hi: ['hi', 'hello!', 'hey there', 'hi from {town}', 'gl hf', 'gl hf :)', 'good luck!', 'hiya'],
    good: ['nice move', 'nice one', 'wow', 'good one', 'ooh nice move', 'nice move!', 'hmm, sneaky'],
    bad: ['argh', 'oops', 'doh', 'hmm', 'oh no', 'uh oh', 'noooo'],
    lucky: ['lucky!', 'wow lucky roll', 'nice roll'],
    gloat: ['hehe', 'sorry!', 'ha', 'oops, sorry', 'gotcha'],
    ggWin: ['gg', 'gg wp', 'good game!', 'gg, close one', 'gg! rematch?'],
    ggLose: ['gg', 'gg wp', 'well played', 'gg, you got me', 'gg, nice game'],
    brb: ['brb', 'brb, snack'], back: ['back', 'ok back', 'sorry, back'],
    partner: ['nice!', 'good one partner', 'we got this', 'nice trick'],
    lag: ['lag!', 'sorry, lag', 'my modem is slow today']
  };
  const PHRASES = [
    ['Hi!', 'hi'], ['Good luck, have fun!', ['you too!', 'gl hf', 'u2', 'thanks, you too']], ['Nice move!', ['ty', 'thanks!', 'thx']],
    ['Thanks!', ['np', 'you\'re welcome', ':)']], ['Oops!', ['happens to everyone', 'lol', 'no worries']], ['Wow!', ['hehe', ':)', 'right?']],
    ['Be right back', ['ok', 'k', 'no prob']], ['I\'m back', ['wb', 'welcome back']], ['Good game!', ['gg', 'gg!', 'thanks, gg']],
    ['Well played!', ['ty', 'thanks!', 'you too']]
  ];

  /* ================= Backgammon rules (mover's view: my checkers positive, moving 24 -> 1, bar = 25, off = 0) ================= */
  function bgStartPos() {
    const pt = new Array(25).fill(0);
    pt[24] = 2; pt[13] = 5; pt[8] = 3; pt[6] = 5; pt[1] = -2; pt[12] = -5; pt[17] = -3; pt[19] = -5;
    return { pt, bar: [0, 0], off: [0, 0] };
  }
  const bgClone = p => ({ pt: p.pt.slice(), bar: p.bar.slice(), off: p.off.slice() });
  function bgFlip(p) { const pt = new Array(25).fill(0); for (let i = 1; i <= 24; i++) pt[i] = -p.pt[25 - i]; return { pt, bar: [p.bar[1], p.bar[0]], off: [p.off[1], p.off[0]] }; }
  function bgCanBear(p) { if (p.bar[0]) return false; for (let i = 7; i <= 24; i++) if (p.pt[i] > 0) return false; return true; }
  function bgStepTo(p, from, d) {
    if (p.bar[0] > 0 && from !== 25) return -1;
    if (from === 25) { if (!p.bar[0]) return -1; } else if (p.pt[from] <= 0) return -1;
    const to = from - d;
    if (to >= 1) return p.pt[to] >= -1 ? to : -1;
    if (!bgCanBear(p)) return -1;
    if (to === 0) return 0;
    for (let i = from + 1; i <= 6; i++) if (p.pt[i] > 0) return -1;
    return 0;
  }
  function bgApply(p, from, to) {
    if (from === 25) p.bar[0]--; else p.pt[from]--;
    if (to === 0) { p.off[0]++; return false; }
    let hit = false;
    if (p.pt[to] === -1) { p.pt[to] = 0; p.bar[1]++; hit = true; }
    p.pt[to]++;
    return hit;
  }
  function bgSeqs(p, dice) {
    const out = []; let maxLen = 0;
    const rec = (pos, rem, seq) => {
      let moved = false; const tried = new Set();
      for (let k = 0; k < rem.length; k++) {
        const d = rem[k]; if (tried.has(d)) continue; tried.add(d);
        const froms = [];
        if (pos.bar[0]) froms.push(25); else for (let i = 24; i >= 1; i--) if (pos.pt[i] > 0) froms.push(i);
        for (const f of froms) {
          const to = bgStepTo(pos, f, d); if (to < 0) continue;
          moved = true;
          const np = bgClone(pos), hit = bgApply(np, f, to);
          rec(np, rem.slice(0, k).concat(rem.slice(k + 1)), seq.concat([{ from: f, to, d, hit }]));
        }
      }
      if (!moved) { if (seq.length > maxLen) maxLen = seq.length; out.push({ seq, pos }); }
    };
    rec(p, dice, []);
    let res = out.filter(o => o.seq.length === maxLen);
    if (maxLen === 1 && dice.length === 2 && dice[0] !== dice[1]) {
      const hi = Math.max(dice[0], dice[1]), h = res.filter(o => o.seq[0].d === hi);
      if (h.length) res = h;
    }
    return res;
  }
  const SHOT = [0, 11, 12, 14, 15, 15, 17, 6, 6, 5, 3, 2, 3, 0, 0, 1, 1, 0, 1, 0, 1, 0, 0, 0, 1, 0];
  const HOMEW = [0, 1.2, 1.6, 2.0, 2.6, 3.0, 3.2];
  function bgEval(p) {
    const pt = p.pt;
    let my = p.bar[0] * 25, op = p.bar[1] * 25, myBack = p.bar[0] ? 25 : 0, opBack = p.bar[1] ? 0 : 25;
    for (let i = 1; i <= 24; i++) {
      const n = pt[i];
      if (n > 0) { my += n * i; if (i > myBack) myBack = i; } else if (n < 0) { op += -n * (25 - i); if (i < opBack) opBack = i; }
    }
    let s = (op - my) * 0.35 + p.off[0] * 1.5;
    if (myBack < opBack) return s + p.off[0] * 0.5; // pure race
    let homePts = 0, opHome = 0, run = 0, bestRun = 0;
    for (let i = 1; i <= 24; i++) {
      const n = pt[i];
      if (n >= 2) {
        run++; if (run > bestRun) bestRun = run;
        if (i <= 6) { homePts++; s += HOMEW[i]; } else if (i === 7) s += 3; else if (i <= 11) s += 1.2; else if (i >= 18 && i <= 21) s += 2; else s += 0.6;
        if (n > 4) s -= (n - 4) * 0.6;
      } else run = 0;
      if (n <= -2 && i >= 19) opHome++;
    }
    if (bestRun >= 3) s += (bestRun - 2) * (bestRun - 2) * 1.2;
    for (let i = 1; i <= 24; i++) {
      if (pt[i] !== 1 || i <= opBack) continue;
      let shots = p.bar[1] ? SHOT[i] || 0 : 0;
      for (let q = 1; q < i; q++) if (pt[q] < 0) shots += SHOT[i - q] || 0;
      shots = Math.min(36, shots);
      s -= shots / 36 * (6 + (25 - i) * 0.35) * (1 + opHome * 0.25);
    }
    s += p.bar[1] * (3 + homePts * 1.2);
    s -= p.bar[0] * (3 + opHome * 1.2);
    return s;
  }
  function bgChoose(pos, dice, lvl) {
    const seqs = bgSeqs(pos, dice);
    if (!seqs.length || !seqs[0].seq.length) return [];
    const seen = new Map();
    for (const o of seqs) { const k = o.pos.pt.join(',') + '|' + o.pos.bar + '|' + o.pos.off; if (!seen.has(k)) seen.set(k, o); }
    const c = [...seen.values()];
    if (lvl === 0 && Math.random() < 0.3) return pickA(c).seq;
    const noise = [6, 2, 0][lvl];
    let best = null, bv = -Infinity;
    for (const o of c) { const v = bgEval(o.pos) + (Math.random() - 0.5) * noise; if (v > bv) { bv = v; best = o; } }
    return best.seq;
  }

  /* ================= card helpers (Spades) ================= */
  const SUITP = [
    '<path d="M5 0C3.5 2.5 0 4.2 0 6.6 0 8 1.1 9 2.4 9c.9 0 1.6-.4 2-1L3.6 10h2.8L5.6 8c.4.6 1.1 1 2 1C8.9 9 10 8 10 6.6 10 4.2 6.5 2.5 5 0Z"/>',
    '<path d="M5 9.6C3.4 8 0 5.7 0 3 0 1.3 1.2 0 2.7 0 3.8 0 4.6.7 5 1.7 5.4.7 6.2 0 7.3 0 8.8 0 10 1.3 10 3c0 2.7-3.4 5-5 6.6Z"/>',
    '<path d="M5 0l3.8 5L5 10 1.2 5Z"/>',
    '<circle cx="5" cy="2.7" r="2.3"/><circle cx="2.6" cy="6" r="2.3"/><circle cx="7.4" cy="6" r="2.3"/><path d="M4.3 5.5 3.5 10h3L5.7 5.5Z"/>'
  ];
  const SUITN = ['spades', 'hearts', 'diamonds', 'clubs'];
  const RANKS = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };
  const rk = r => RANKS[r] || String(r);
  const suitSvg = (s, cls) => `<svg class="${cls}" viewBox="0 0 10 10" aria-hidden="true" fill="${s === 1 || s === 2 ? '#c41e1e' : '#111'}">${SUITP[s]}</svg>`;
  const cardName = c => `${({ 11: 'jack', 12: 'queen', 13: 'king', 14: 'ace' })[c.r] || c.r} of ${SUITN[c.s]}`;
  function cardHtml(c, extra = '') {
    return `<div class="gmr-card${c.s === 1 || c.s === 2 ? ' gmr-red' : ''}${extra}" data-id="${c.id}" aria-label="${cardName(c)}"><span class="gmr-cr">${rk(c.r)}</span>${suitSvg(c.s, 'gmr-cs')}${suitSvg(c.s, 'gmr-cb')}</div>`;
  }
  const SORTS = [0, 1, 3, 2]; // display order: spades, hearts, clubs, diamonds
  const sortHand = h => h.sort((a, b) => SORTS.indexOf(a.s) - SORTS.indexOf(b.s) || a.r - b.r);

  /* ================= the app ================= */
  function open(W, api) {
    const blank = () => ({ bg: 1200, sp: 1200, db: 1200 }), zero = () => ({ bg: 0, sp: 0, db: 0 });
    const saved = api.load('profile', {}) || {};
    const prof = {
      r: Object.assign(blank(), saved.r), w: Object.assign(zero(), saved.w), l: Object.assign(zero(), saved.l), d: Object.assign(zero(), saved.d),
      opt: Object.assign({ spTarget: 500, spNil: true, dbSize: 4 }, saved.opt)
    };
    const saveProf = () => api.save('profile', prof);
    const me = () => String(api.user || 'You').slice(0, 16);
    const dev = { auto: false, fast: false, forfeit: false };

    let dead = false, screen = '', sess = 0, chatSess = 0, game = null, lag = 0, ping = 180, roomCounts = ROOMS.map(r => r.n);
    const timers = new Set();
    const clear = t => { clearTimeout(t); timers.delete(t); };
    function rawLater(fn, ms) { const t = setTimeout(() => { timers.delete(t); if (!dead) fn(); }, ms); timers.add(t); return t; }
    // game timers: dropped when the game ends or you leave; held while offline or a dialog is up
    function later(fn, ms) {
      const my = sess;
      const run = () => { if (my !== sess) return; if (!api.online() || (game && game.hold)) { rawLater(run, 400); return; } fn(); };
      return rawLater(run, ms);
    }
    const speed = ms => dev.fast ? Math.max(15, ms * 0.05) : ms;

    W.body.innerHTML = `<div class="gmr"><div class="gmr-top"><span class="gmr-logo">${LOGO}<span>Horizon <b>Games Room</b></span></span><span class="gmr-who"></span>` +
      `<span class="gmr-net" title="Connection"><span class="gmr-bars"><i></i><i></i><i></i><i></i></span><em>--</em></span></div><div class="gmr-main"></div><div class="gmr-ov" hidden></div></div>`;
    const root = W.body.querySelector('.gmr'), main = root.querySelector('.gmr-main'), ov = root.querySelector('.gmr-ov');
    const whoEl = root.querySelector('.gmr-who'), netEl = root.querySelector('.gmr-net');

    function setWho() {
      const g = game ? game.g : null;
      whoEl.innerHTML = `<b>${esc(me())}</b>` + (g ? ` · ${GAMES[g].name} rating ${prof.r[g]}` : '');
    }
    function netTick() {
      const on = api.online();
      if (on) ping = Math.max(90, Math.min(320, ping + rnd(-40, 40)));
      const shown = lag > Date.now() ? rnd(1400, 2600) : ping, bars = !on ? 0 : shown < 160 ? 4 : shown < 300 ? 3 : shown < 900 ? 2 : 1;
      netEl.querySelectorAll('i').forEach((b, k) => b.classList.toggle('gmr-on', k < bars));
      netEl.classList.toggle('gmr-lag', on && lag > Date.now());
      netEl.querySelector('em').textContent = !on ? 'offline' : lag > Date.now() ? 'LAG ' + shown + ' ms' : shown + ' ms';
    }
    function checkNet() {
      if (dead) return;
      const on = api.online();
      if (!on && (screen === 'lobby' || screen === 'match')) showOffline();
      else if (on && screen === 'offline') showLobby();
      if (screen === 'game' && game) {
        const lost = root.querySelector('.gmr-lost');
        if (!on && !lost) {
          const d = document.createElement('div'); d.className = 'gmr-lost';
          d.innerHTML = `<div class="gmr-dlg raised"><div class="gmr-dt">Connection lost</div><p>Your modem hung up, so the game is paused. Connect again to keep playing.</p><div class="gmr-dbtns"><button class="btn" data-a="dial">Connect...</button><button class="btn" data-a="lobby">Leave table</button></div></div>`;
          d.addEventListener('click', e => { const a = e.target.closest('[data-a]'); if (!a) return; if (a.dataset.a === 'dial') api.openApp('dial'); else { quitGame(); showOffline(); } });
          root.appendChild(d);
        } else if (on && lost) { lost.remove(); sys('Reconnected. The game continues.'); }
      }
      netTick();
    }
    const netIv = setInterval(checkNet, 1500);
    W.onNet = () => setTimeout(checkNet, 50);

    /* ---------- overlay dialog inside the window ---------- */
    function dialog(title, html, buttons) {
      return new Promise(res => {
        ov.hidden = false;
        ov.innerHTML = `<div class="gmr-dlg raised" role="dialog"><div class="gmr-dt">${esc(title)}</div><div class="gmr-dc">${html}</div><div class="gmr-dbtns">${buttons.map((b, k) => `<button class="btn" data-k="${k}">${esc(b)}</button>`).join('')}</div></div>`;
        const first = ov.querySelector('.gmr-dbtns .btn'); if (first) first.focus();
        ov.onclick = e => { const b = e.target.closest('[data-k]'); if (!b) return; ov.hidden = true; ov.innerHTML = ''; ov.onclick = null; api.sfx.click(); res(buttons[+b.dataset.k]); };
      });
    }
    const closeDialog = () => { ov.hidden = true; ov.innerHTML = ''; ov.onclick = null; };

    /* ---------- offline screen ---------- */
    function showOffline() {
      sess++; chatSess++; screen = 'offline'; game = null; setWho(); closeDialog();
      main.innerHTML = `<div class="gmr-off"><div class="gmr-offbox raised"><svg width="64" height="48" viewBox="0 0 32 24" shape-rendering="crispEdges" aria-hidden="true"><rect x="1" y="6" width="30" height="12" fill="#c0c0c0" stroke="#000"/><rect x="4" y="9" width="3" height="2" fill="#555"/><rect x="9" y="9" width="3" height="2" fill="#555"/><rect x="14" y="9" width="3" height="2" fill="#555"/><rect x="24" y="10" width="4" height="4" fill="#600"/><rect x="3" y="18" width="4" height="3" fill="#000"/><rect x="25" y="18" width="4" height="3" fill="#000"/></svg>` +
        `<h2>You need to be online</h2><p>The Games Room is on the Internet. Connect your modem first, then come right back: this screen will notice when you are online.</p>` +
        `<button class="btn gmr-big" data-a="dial">Connect...</button><p class="gmr-small">Waiting for a connection<span class="gmr-dots3"><i>.</i><i>.</i><i>.</i></span></p></div></div>`;
      main.querySelector('[data-a="dial"]').onclick = () => { api.sfx.click(); api.openApp('dial'); };
    }

    /* ---------- lobby ---------- */
    let lobbyIv = null;
    function showLobby() {
      sess++; chatSess++; screen = 'lobby'; game = null; setWho(); closeDialog();
      const total = () => roomCounts.reduce((a, b) => a + b, 0) + 1412;
      const rows = ['bg', 'sp', 'db'].map(g => `<tr class="gmr-gh"><th colspan="4">${GAMES[g].name} <span>${GAMES[g].blurb}</span></th></tr>` +
        ROOMS.map((r, k) => r.g !== g ? '' : `<tr><td>${esc(r.name)}</td><td class="gmr-skill gmr-sk${r.lvl}">${SKILL[r.lvl]}</td><td class="gmr-cnt" data-k="${k}">${roomCounts[k]}</td><td><button class="btn gmr-join" data-room="${k}">Join</button></td></tr>`).join('')).join('');
      const rec = g => `${prof.w[g]}-${prof.l[g]}${prof.d[g] ? '-' + prof.d[g] : ''}`;
      main.innerHTML = `<div class="gmr-lobby"><div class="gmr-welcome"><span>Welcome, <b>${esc(me())}</b>! Pick a room and we will find you a game.</span> <span class="gmr-total">${total().toLocaleString('en-US')} players online</span></div>` +
        `<div class="gmr-lcols"><div class="gmr-rooms sunken"><table><thead><tr><th>Room</th><th>Skill</th><th>Players</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>` +
        `<div class="gmr-side"><fieldset><legend>Your ratings</legend><table class="gmr-rt">${['bg', 'sp', 'db'].map(g => `<tr><td>${GAMES[g].name}</td><td><b>${prof.r[g]}</b></td><td>${rec(g)}</td></tr>`).join('')}</table><div class="gmr-small">Win to raise your rating. Everyone starts at 1200.</div></fieldset>` +
        `<fieldset><legend>Table options</legend><label>Spades game to <select data-o="spTarget"><option value="500">500 points</option><option value="200">200 points (short)</option></select></label>` +
        `<label><input type="checkbox" data-o="spNil"> Allow Nil bids in Spades</label><label>Dots and Boxes board <select data-o="dbSize"><option value="4">4 x 4 boxes</option><option value="6">6 x 6 boxes</option></select></label></fieldset>` +
        `<fieldset><legend>Tip of the day</legend><div class="gmr-small">${esc(pickA(TIPS))}</div></fieldset></div></div>` +
        `<div class="gmr-foot">All players here are computer characters. Chat uses friendly preset phrases only. Winning a game earns play money.</div></div>`;
      main.querySelector('[data-o="spTarget"]').value = String(prof.opt.spTarget);
      main.querySelector('[data-o="dbSize"]').value = String(prof.opt.dbSize);
      main.querySelector('[data-o="spNil"]').checked = !!prof.opt.spNil;
      main.querySelectorAll('[data-o]').forEach(el => el.onchange = () => {
        const k = el.dataset.o; prof.opt[k] = el.type === 'checkbox' ? el.checked : +el.value; saveProf(); api.sfx.click();
      });
      main.querySelectorAll('.gmr-join').forEach(b => b.onclick = () => { api.sfx.click(); findMatch(ROOMS[+b.dataset.room]); });
      clearInterval(lobbyIv);
      lobbyIv = setInterval(() => {
        if (screen !== 'lobby') return;
        roomCounts = roomCounts.map((n, k) => Math.max(20, n + rnd(-6, 6) + (ROOMS[k].n - n > 30 ? 3 : ROOMS[k].n - n < -30 ? -3 : 0)));
        main.querySelectorAll('.gmr-cnt').forEach(td => { td.textContent = roomCounts[+td.dataset.k]; });
        const t = main.querySelector('.gmr-total'); if (t) t.textContent = total().toLocaleString('en-US') + ' players online';
      }, 4000);
    }
    const TIPS = [
      'In Backgammon, two or more of your checkers on a point make it safe from being hit.',
      'In Spades, a Nil bid scores 100 points if you take no tricks at all.',
      'In Dots and Boxes, try not to draw the third side of a box.',
      'Chat is preset phrases only, so everybody stays friendly.',
      'In Spades, extra tricks are called bags. Ten bags cost your team 100 points.',
      'In Backgammon, you must bring every checker home before you can bear off.'
    ];

    /* ---------- matchmaking ---------- */
    async function findMatch(room, again) {
      if (!api.online()) { showOffline(); return; }
      sess++; chatSess++; screen = 'match'; const my = sess;
      const n = room.g === 'sp' ? 3 : 1, bots = again || [];
      if (!again) for (let k = 0; k < n; k++) bots.push(makeBot(room.lvl, bots));
      main.innerHTML = `<div class="gmr-match"><div class="gmr-mbox raised"><div class="gmr-mt">${esc(GAMES[room.g].name)} · ${esc(room.name)}</div>` +
        `<div class="gmr-mh">Finding ${n > 1 ? 'players' : 'an opponent'}...</div><div class="gmr-mbar sunken"><div class="gmr-mfill"></div></div><div class="gmr-mlog"></div>` +
        `<div class="gmr-mcards"></div><div class="gmr-dbtns"><button class="btn" data-a="cancel">Cancel</button></div></div></div>`;
      const fill = main.querySelector('.gmr-mfill'), log = main.querySelector('.gmr-mlog'), btns = main.querySelector('.gmr-dbtns');
      btns.querySelector('[data-a="cancel"]').onclick = () => { api.sfx.click(); showLobby(); };
      const steps = again ? ['Asking for a rematch...', 'They said yes!'] : ['Contacting game server...', `Joining ${room.name} (${roomCounts[ROOMS.indexOf(room)]} players)...`, `Looking for ${n > 1 ? 'players' : 'someone'} near your rating (${prof.r[room.g]})...`, n > 1 ? 'Found a table!' : 'Found a match!'];
      for (let k = 0; k < steps.length; k++) {
        if (dead || my !== sess) return;
        const p = document.createElement('div'); p.textContent = steps[k]; log.appendChild(p);
        fill.style.width = Math.round((k + 1) / steps.length * 100) + '%';
        for (let b = 0; b < 3; b++) api.tone(rnd(1100, 2500), 0.06, { type: 'square', vol: 0.03, at: b * 0.09 });
        if (k === 1) api.noise(0.35, { ft: 'bandpass', f: 1800, q: 2, vol: 0.03 });
        await api.sleep(speed(k === steps.length - 1 ? 300 : rnd(700, 1300)));
        if (!api.online() && my === sess) { showOffline(); return; }
      }
      if (dead || my !== sess) return;
      api.sfx.ding();
      main.querySelector('.gmr-mh').textContent = n > 1 ? 'Your table' : 'Your opponent';
      const roles = n > 1 ? ['Opponent', 'Your partner', 'Opponent'] : [''];
      const order = n > 1 ? [1, 0, 2] : [0];
      main.querySelector('.gmr-mcards').innerHTML = order.map(k => botCard(bots[k], roles[k])).join('');
      btns.innerHTML = '<button class="btn gmr-big" data-a="play">Play</button><button class="btn" data-a="other">Find someone else</button><button class="btn" data-a="cancel">Lobby</button>';
      btns.querySelector('[data-a="play"]').onclick = () => { api.sfx.click(); startGame(room, bots); };
      btns.querySelector('[data-a="other"]').onclick = () => { api.sfx.click(); findMatch(room); };
      btns.querySelector('[data-a="cancel"]').onclick = () => { api.sfx.click(); showLobby(); };
      btns.querySelector('[data-a="play"]').focus();
    }

    /* ---------- the game screen: board + chat ---------- */
    let chatQ = Promise.resolve(), chatLog = null, typingEl = null;
    function chatLine(who, text, kind) {
      if (!chatLog) return;
      const d = document.createElement('div'); d.className = 'gmr-cl gmr-cl-' + kind;
      d.innerHTML = kind === 'sys' ? esc(text) : `<b>${esc(who)}:</b> ${esc(text)}`;
      chatLog.appendChild(d);
      while (chatLog.children.length > 80) chatLog.firstChild.remove();
      chatLog.scrollTop = chatLog.scrollHeight;
    }
    const sys = t => chatLine('', '*** ' + t + ' ***', 'sys');
    function botSay(bot, text, pre = 0) {
      const my = chatSess;
      text = text.replace('{town}', bot.town);
      chatQ = chatQ.then(async () => {
        await api.sleep(pre);
        if (dead || my !== chatSess || !typingEl) return;
        typingEl.textContent = `${bot.name} is typing...`;
        await api.sleep(dev.fast ? 20 : 500 + text.length * 60 + rnd(0, 500));
        if (dead || my !== chatSess || !typingEl) return;
        typingEl.textContent = '';
        chatLine(bot.name, text, 'bot');
        api.tone(1320, 0.05, { type: 'sine', vol: 0.04 });
      });
    }
    function react(kind, bot, chance = 1) {
      if (!game) return;
      const bots = bot ? [bot] : game.bots;
      const b = bot || pickA(bots);
      if (Math.random() < b.chat * chance) botSay(b, pickA(LINES[kind]), rnd(100, 700));
    }

    function startGame(room, bots) {
      if (!api.online()) { showOffline(); return; }
      sess++; chatSess++; screen = 'game'; chatQ = Promise.resolve();
      const g = room.g;
      const oppR = g === 'sp' ? Math.round((bots[0].rating + bots[2].rating) / 2) : bots[0].rating;
      game = { g, room, bots, oppR, done: false, hold: false, cpuTurns: 0, forfeitAt: g !== 'sp' && Math.random() < 0.04 ? rnd(6, 18) : 0, mod: null, brb: Math.random() < 0.3 };
      setWho();
      main.innerHTML = `<div class="gmr-game"><div class="gmr-gbar"><button class="btn gmr-lob" title="Back to the lobby">Lobby</button><span class="gmr-gname"><b>${esc(GAMES[g].name)}</b> · ${esc(room.name)}</span>` +
        `<span class="gmr-vs">${g === 'sp' ? `Partner: <b>${esc(bots[1].name)}</b>` : `vs <b>${esc(bots[0].name)}</b> (${bots[0].rating})`} <span class="gmr-cpu">COMPUTER</span></span></div>` +
        `<div class="gmr-gbody"><div class="gmr-board"></div><div class="gmr-chat"><div class="gmr-clog sunken" aria-live="polite"></div><div class="gmr-typing"></div>` +
        `<div class="gmr-say"><select aria-label="Chat phrase">${PHRASES.map((p, k) => `<option value="${k}">${esc(p[0])}</option>`).join('')}</select><button class="btn">Send</button></div></div></div></div>`;
      chatLog = main.querySelector('.gmr-clog'); typingEl = main.querySelector('.gmr-typing');
      main.querySelector('.gmr-lob').onclick = () => { api.sfx.click(); toLobby(); };
      const sel = main.querySelector('.gmr-say select');
      main.querySelector('.gmr-say .btn').onclick = () => {
        const p = PHRASES[+sel.value]; if (!p) return;
        chatLine(me(), p[0], 'me'); api.sfx.sent ? api.sfx.sent() : api.sfx.click();
        const b = pickA(game ? game.bots : bots);
        if (game && !game.done && Math.random() < 0.3 + b.chat * 0.7) botSay(b, pickA(Array.isArray(p[1]) ? p[1] : LINES[p[1]]), 300);
        else if (game && game.done) botSay(b, pickA(Array.isArray(p[1]) ? p[1] : LINES[p[1]]), 300);
      };
      sys(`You joined ${room.name}. All players here are computer characters.`);
      bots.forEach((b, k) => { if (Math.random() < 0.85 || k === 0) botSay(b, pickA(LINES.hi), rnd(200, 900)); });
      const ctx = {
        api, el: main.querySelector('.gmr-board'), lvl: room.lvl, bots, me: me(), opt: prof.opt,
        later, delay: ms => speed(ms) + (lag > Date.now() ? rnd(1200, 2400) : 0),
        auto: () => dev.auto, react, sys, botSay,
        cpuTick() {
          if (!game || game.done) return true;
          game.cpuTurns++;
          if (!dev.fast && Math.random() < 0.05) { lag = Date.now() + rnd(2500, 4500); netTick(); if (Math.random() < 0.5) react('lag', bots[0], 0.8); }
          if (game.brb && game.cpuTurns === 5) { game.brb = false; botSay(bots[bots.length > 1 ? rnd(0, 2) : 0], pickA(LINES.brb)); const b = bots; rawLater(() => { if (game && game.bots === b && !game.done) botSay(pickA(b), pickA(LINES.back)); }, speed(rnd(6000, 11000))); }
          if (dev.forfeit || (game.forfeitAt && game.cpuTurns >= game.forfeitAt)) { dev.forfeit = false; forfeit(); return true; }
          return false;
        },
        finish
      };
      game.mod = g === 'bg' ? bgGame(ctx) : g === 'sp' ? spGame(ctx) : dbGame(ctx);
    }
    function forfeit() {
      const b = game.bots[0]; game.done = true; sess++;
      if (typingEl) typingEl.textContent = '';
      sys(`${b.name} has disconnected`);
      rawLater(() => { if (game && game.bots[0] === b) { sys('Waiting for them to come back...'); } }, speed(1500));
      rawLater(() => { if (game && game.bots[0] === b) { game.done = false; finish({ res: 'win', forfeit: true, detail: 'Player disconnected, you win by forfeit.' }); } }, speed(4000));
    }
    function finish(r) {
      if (!game || game.done) return;
      game.done = true; sess++;
      const g = game.g, old = prof.r[g], score = r.res === 'win' ? 1 : r.res === 'draw' ? 0.5 : 0;
      let delta = Math.round(32 * (r.mult || 1) * (score - 1 / (1 + Math.pow(10, (game.oppR - old) / 400))));
      if (r.forfeit) delta = Math.round(delta / 2);
      if (score === 1) delta = Math.max(1, delta); else if (score === 0) delta = Math.min(-1, delta);
      prof.r[g] = Math.max(100, old + delta);
      if (score === 1) prof.w[g]++; else if (score === 0) prof.l[g]++; else prof.d[g]++;
      saveProf(); setWho();
      let got = 0;
      if (score === 1) {
        api.sfx.tada(); api.stamp('games-room-win');
        got = api.earn(Math.min(6, 3 + game.room.lvl + rnd(0, 1)), 'winning in the Games Room') || 0;
      } else if (score === 0) api.tone(260, 0.5, { type: 'triangle', vol: 0.07, to: 150 });
      else api.sfx.ding();
      if (!r.forfeit && !r.resign) game.bots.forEach((b, k) => { if (k === 0 || Math.random() < 0.6) botSay(b, pickA(score === 1 && (game.g !== 'sp' || k !== 1) ? LINES.ggLose : LINES.ggWin), 400 + k * 500); });
      const head = score === 1 ? 'You win!' : score === 0 ? (r.resign ? 'You resigned.' : 'You lost this one.') : 'It\'s a draw!';
      const html = `<p class="gmr-rh gmr-r${score === 1 ? 'w' : score === 0 ? 'l' : 'd'}">${head}</p>${r.detail ? `<p>${esc(r.detail)}</p>` : ''}` +
        `<p>${GAMES[g].name} rating: ${old} &rarr; <b>${prof.r[g]}</b> (${delta >= 0 ? '+' : ''}${delta})</p>` +
        (score === 1 ? `<p>${got ? `You earned <b>$${got}</b> of play money!` : 'You have earned all the play money you can today, but the win still counts.'}</p>` : '<p>Good try! Rematch to win it back.</p>');
      const bots = game.bots, room = game.room;
      rawLater(async () => {
        if (!game || game.bots !== bots) return;
        game.hold = true;
        const b = await dialog(score === 1 ? 'Winner!' : 'Game over', html, r.forfeit ? ['Back to Lobby', 'Stay here'] : ['Rematch', 'Back to Lobby', 'Stay here']);
        if (dead) return;
        if (b === 'Rematch') { if (!api.online()) showOffline(); else findMatch(room, bots); }
        else if (b === 'Back to Lobby') showLobby();
        else if (game) game.hold = false;
      }, speed(r.forfeit ? 300 : 1200));
    }
    function quitGame() { if (game && !game.done) finish({ res: 'loss', resign: true, detail: 'You left the table.' }); closeDialog(); }
    async function resign() {
      if (screen !== 'game' || !game || game.done) return;
      const b = await api.msgBox('Games Room', 'Resign this game? It counts as a loss.', ['Resign', 'Cancel'], 'warn');
      if (b !== 'Resign' || !game || game.done) return;
      finish({ res: 'loss', resign: true, detail: 'You resigned the game.' });
    }
    async function toLobby() {
      if (screen === 'game' && game && !game.done) {
        const b = await api.msgBox('Games Room', 'Leave this table? The game is not finished, so it counts as a loss.', ['Leave', 'Stay'], 'warn');
        if (b !== 'Leave' || !game || game.done) return;
        quitGame();
      }
      if (!api.online()) showOffline(); else showLobby();
    }

    /* ================= Backgammon ================= */
    function bgGame(ctx) {
      const bot = ctx.bots[0];
      let pos = bgStartPos(), phase = 'opening', dice = [], seqs = [], prefix = [], hist = [], sel = null, turn = 0, lastCpu = [], cur = 0, cpuDice = [], showDice = [], who = 0, msgT = '';
      ctx.el.innerHTML = `<div class="gmr-bg"><div class="gmr-info"><span class="gmr-pips"></span><span class="gmr-ttl"></span></div><div class="gmr-svgbox"><svg class="gmr-bgsvg" viewBox="0 0 400 300" role="img" aria-label="Backgammon board"></svg></div>` +
        `<div class="gmr-ctl"><button class="btn gmr-roll">Roll</button><button class="btn gmr-undo">Undo</button><button class="btn gmr-done">Done</button></div><div class="gmr-status" role="status"></div></div>`;
      const svg = ctx.el.querySelector('svg'), stEl = ctx.el.querySelector('.gmr-status'), pipEl = ctx.el.querySelector('.gmr-pips'), ttl = ctx.el.querySelector('.gmr-ttl');
      const bRoll = ctx.el.querySelector('.gmr-roll'), bUndo = ctx.el.querySelector('.gmr-undo'), bDone = ctx.el.querySelector('.gmr-done');
      const cx = i => i <= 6 ? 190 + (6 - i) * 26 + 13 : i <= 12 ? 10 + (12 - i) * 26 + 13 : i <= 18 ? 10 + (i - 13) * 26 + 13 : 190 + (i - 19) * 26 + 13;
      const same = (a, b) => a.from === b.from && a.to === b.to && a.d === b.d;
      function stepsAfter(pref) {
        const out = [], keys = new Set();
        for (const o of seqs) {
          if (o.seq.length <= pref.length) continue;
          let ok = true; for (let k = 0; k < pref.length; k++) if (!same(o.seq[k], pref[k])) { ok = false; break; }
          if (!ok) continue;
          const t = o.seq[pref.length], key = t.from + ':' + t.to + ':' + t.d;
          if (!keys.has(key)) { keys.add(key); out.push(t); }
        }
        return out;
      }
      const sources = () => [...new Set(stepsAfter(prefix).map(s => s.from))].sort((a, b) => b - a);
      function targets(src) {
        const res = new Map();
        const walk = (pref, at, path) => {
          for (const st of stepsAfter(pref)) {
            if (st.from !== at) continue;
            const np = path.concat([st]), ex = res.get(st.to);
            if (!ex || ex.length > np.length || (ex.length === np.length && st.d < ex[ex.length - 1].d)) res.set(st.to, np);
            if (st.to !== 0) walk(pref.concat([st]), st.to, np);
          }
        };
        walk(prefix, src, []);
        return res;
      }
      function pips() {
        let a = pos.bar[0] * 25, b = pos.bar[1] * 25;
        for (let i = 1; i <= 24; i++) { if (pos.pt[i] > 0) a += pos.pt[i] * i; else b += -pos.pt[i] * (25 - i); }
        return [a, b];
      }
      function remaining() { const r = dice.slice(); prefix.forEach(s => { const k = r.indexOf(s.d); if (k >= 0) r.splice(k, 1); }); return r; }
      function status(t) { msgT = t; stEl.textContent = t; }
      function die(x, y, v, s, used, red) {
        const P = { 1: [[.5, .5]], 2: [[.25, .25], [.75, .75]], 3: [[.25, .25], [.5, .5], [.75, .75]], 4: [[.25, .25], [.75, .25], [.25, .75], [.75, .75]], 5: [[.25, .25], [.75, .25], [.5, .5], [.25, .75], [.75, .75]], 6: [[.25, .22], [.75, .22], [.25, .5], [.75, .5], [.25, .78], [.75, .78]] }[v] || [];
        return `<g opacity="${used ? 0.35 : 1}"><rect x="${x}" y="${y}" width="${s}" height="${s}" rx="3" fill="${red ? '#b3261e' : '#fbfaf2'}" stroke="#000"/>${P.map(([a, b]) => `<circle cx="${x + a * s}" cy="${y + b * s}" r="${s * 0.09}" fill="${red ? '#fff' : '#000'}"/>`).join('')}</g>`;
      }
      function render() {
        const [a, b] = pips(), srcs = phase === 'move' && turn === 0 ? sources() : [], tg = sel !== null ? targets(sel) : new Map();
        const opts = sel !== null ? [...tg.keys()] : srcs; if (cur >= opts.length) cur = 0;
        pipEl.innerHTML = `Pips: you <b>${a}</b> · ${esc(bot.name)} <b>${b}</b>`;
        ttl.textContent = `Off: you ${pos.off[0]}/15 · them ${pos.off[1]}/15`;
        let o = '<rect x="0" y="0" width="400" height="300" fill="#6b4423"/><rect x="10" y="10" width="156" height="280" fill="#2e6b3f"/><rect x="190" y="10" width="156" height="280" fill="#2e6b3f"/><rect x="352" y="10" width="40" height="280" fill="#3e2612"/><line x1="352" y1="150" x2="392" y2="150" stroke="#6b4423" stroke-width="3"/>';
        for (let i = 1; i <= 24; i++) {
          const x = cx(i), top = i >= 13, y0 = top ? 10 : 290, y1 = top ? 130 : 170;
          const col = i % 2 ? '#d9b36c' : '#8e2a22';
          o += `<polygon points="${x - 13},${y0} ${x + 13},${y0} ${x},${y1}" fill="${col}" stroke="#2b1a0b" stroke-width=".5"/>`;
          if (tg.has(i)) o += `<polygon points="${x - 13},${y0} ${x + 13},${y0} ${x},${y1}" fill="#ffe800" opacity=".55"/>`;
          o += `<text x="${x}" y="${top ? 7.5 : 298}" font-size="7" fill="#f3e2b8" text-anchor="middle" font-family="Tahoma,sans-serif">${i}</text>`;
        }
        // checkers
        for (let i = 1; i <= 24; i++) {
          const n = Math.abs(pos.pt[i]); if (!n) continue;
          const mine = pos.pt[i] > 0, x = cx(i), top = i >= 13, show = Math.min(n, 5);
          for (let k = 0; k < show; k++) {
            const y = top ? 22 + k * 23 : 278 - k * 23, isSel = sel === i && k === show - 1, src = srcs.includes(i) && k === show - 1 && sel === null;
            o += `<circle cx="${x}" cy="${y}" r="11.3" fill="${mine ? '#f4f0e0' : '#b3261e'}" stroke="${isSel ? '#ffe800' : src ? '#ffe800' : mine ? '#333' : '#3a0a08'}" stroke-width="${isSel ? 3 : src ? 1.8 : 1}"/><circle cx="${x}" cy="${y}" r="6.5" fill="none" stroke="${mine ? '#cfc8b0' : '#8a1a14'}"/>`;
          }
          if (n > 5) o += `<text x="${x}" y="${(top ? 22 + 4 * 23 : 278 - 4 * 23) + 4}" font-size="11" font-weight="bold" text-anchor="middle" fill="${mine ? '#000' : '#fff'}" font-family="Tahoma,sans-serif">${n}</text>`;
          if (lastCpu.includes(i) && !mine) o += `<circle cx="${x}" cy="${top ? 138 : 162}" r="3" fill="#7fd7ff"/>`;
        }
        // bar
        for (let k = 0; k < pos.bar[0]; k++) { const y = 175 + Math.min(k, 4) * 22; o += `<circle cx="178" cy="${y}" r="10.5" fill="#f4f0e0" stroke="${sel === 25 || (srcs.includes(25) && sel === null) ? '#ffe800' : '#333'}" stroke-width="${sel === 25 ? 3 : srcs.includes(25) ? 1.8 : 1}"/>`; }
        if (pos.bar[0] > 5) o += `<text x="178" y="${175 + 4 * 22 + 4}" font-size="10" text-anchor="middle" font-weight="bold">${pos.bar[0]}</text>`;
        for (let k = 0; k < pos.bar[1]; k++) { const y = 125 - Math.min(k, 4) * 22; o += `<circle cx="178" cy="${y}" r="10.5" fill="#b3261e" stroke="#3a0a08"/>`; }
        // bear-off tray
        for (let k = 0; k < pos.off[0]; k++) o += `<rect x="357" y="${282 - k * 8.5}" width="30" height="7" fill="#f4f0e0" stroke="#333" stroke-width=".6"/>`;
        for (let k = 0; k < pos.off[1]; k++) o += `<rect x="357" y="${11 + k * 8.5}" width="30" height="7" fill="#b3261e" stroke="#3a0a08" stroke-width=".6"/>`;
        if (tg.has(0)) o += `<rect x="353.5" y="151.5" width="37" height="137" fill="#ffe800" opacity=".45" stroke="#ffe800" stroke-width="2"/><text x="372" y="222" font-size="9" text-anchor="middle" font-family="Tahoma,sans-serif" font-weight="bold">OFF</text>`;
        // dice
        if (showDice.length) {
          const red = who === 1, s = showDice.length > 2 ? 20 : 26, gap = 6, wd = showDice.length * s + (showDice.length - 1) * gap;
          const x0 = (red ? 88 : 268) - wd / 2, used = red ? [] : remaining();
          const usedFlags = showDice.map(() => false);
          if (!red && (phase === 'move' || phase === 'done')) { const left = used.slice(); showDice.forEach((v, k) => { const j = left.indexOf(v); if (j >= 0) left.splice(j, 1); else usedFlags[k] = true; }); }
          showDice.forEach((v, k) => { o += die(x0 + k * (s + gap), 150 - s / 2, v, s, usedFlags[k], red); });
        }
        // keyboard cursor
        if (opts.length && kbMode) {
          const t = opts[cur];
          if (t === 0) o += `<rect x="353" y="151" width="38" height="138" fill="none" stroke="#fff" stroke-dasharray="3 2" stroke-width="1.5"/>`;
          else if (t === 25) o += `<rect x="167" y="152" width="22" height="136" fill="none" stroke="#fff" stroke-dasharray="3 2" stroke-width="1.5"/>`;
          else { const top = t >= 13; o += `<rect x="${cx(t) - 13}" y="${top ? 10 : 150}" width="26" height="140" fill="none" stroke="#fff" stroke-dasharray="3 2" stroke-width="1.5"/>`; }
        }
        // hit areas
        for (let i = 1; i <= 24; i++) o += `<rect data-pt="${i}" x="${cx(i) - 13}" y="${i >= 13 ? 10 : 150}" width="26" height="140" fill="transparent"/>`;
        o += '<rect data-pt="25" x="166" y="150" width="24" height="140" fill="transparent"/><rect data-pt="0" x="352" y="150" width="40" height="140" fill="transparent"/>';
        svg.innerHTML = o;
        bRoll.textContent = phase === 'opening' ? 'Roll to start' : 'Roll';
        bRoll.disabled = !(turn === 0 && (phase === 'roll' || phase === 'opening'));
        bUndo.disabled = !(turn === 0 && (phase === 'move' || phase === 'done') && prefix.length);
        bDone.disabled = !(turn === 0 && phase === 'done');
        bDone.classList.toggle('gmr-pulse', phase === 'done');
      }
      let kbMode = false;
      function rollAnim(cb, red) {
        let n = 0; who = red ? 1 : 0;
        const spin = () => {
          showDice = [rnd(1, 6), rnd(1, 6)]; render(); api.tone(rnd(300, 500), 0.03, { type: 'square', vol: 0.03 });
          if (++n < 6) ctx.later(spin, ctx.delay(55)); else cb();
        };
        spin();
      }
      const roll2 = () => { const a = rnd(1, 6), b = rnd(1, 6); return a === b ? [a, a, a, a] : [a, b]; };
      function openingRoll() {
        if (phase !== 'opening' || turn !== 0) return;
        api.sfx.click(); phase = 'rolling';
        rollAnim(() => {
          const a = rnd(1, 6), b = rnd(1, 6);
          who = 0; showDice = [a]; render();
          status(`You rolled ${a}. ${bot.name} rolled ${b}.`);
          if (a === b) { phase = 'opening'; status(`You both rolled ${a}. Roll again!`); render(); if (ctx.auto()) ctx.later(openingRoll, ctx.delay(400)); return; }
          ctx.later(() => {
            if (a > b) { status(`You rolled ${a}, ${bot.name} rolled ${b}. You go first!`); beginMove([a, b]); }
            else { status(`${bot.name} rolled ${b}, you rolled ${a}. ${bot.name} goes first.`); cpuTurn([b, a]); }
          }, ctx.delay(900));
        });
      }
      function playerRoll() {
        if (phase !== 'roll' || turn !== 0) return;
        api.sfx.click(); phase = 'rolling';
        rollAnim(() => beginMove(roll2()));
      }
      function beginMove(d) {
        turn = 0; dice = d; who = 0; showDice = d.slice(); prefix = []; hist = []; sel = null; cur = 0;
        seqs = bgSeqs(pos, d);
        if (d.length === 4 && Math.random() < 0.4) react('lucky', bot, 0.5);
        if (!seqs[0].seq.length) {
          phase = 'nomove'; status(`You rolled ${d.slice(0, 2).join(' and ')}. No legal moves, so your turn passes.`); render();
          ctx.later(endTurn, ctx.delay(1800)); return;
        }
        phase = 'move';
        status(`You rolled ${d.length === 4 ? 'double ' + d[0] + 's (four moves)' : d.join(' and ')}. ${pos.bar[0] ? 'Enter your checker from the bar first.' : 'Tap a checker, then where it should go.'}`);
        render();
        if (ctx.auto()) ctx.later(autoMove, ctx.delay(300));
      }
      function autoMove() {
        if (phase !== 'move' || turn !== 0) return;
        const seq = bgChoose(pos, dice, 2);
        seq.forEach(st => { hist.push(bgClone(pos)); bgApply(pos, st.from, st.to); prefix.push(st); });
        afterStep();
        if (phase === 'done') ctx.later(endTurn, ctx.delay(300));
      }
      function tap(i) {
        if (turn !== 0 || phase !== 'move') { if (phase === 'roll' || phase === 'opening') status(phase === 'opening' ? 'Press Roll to start.' : 'Press Roll (or Space) to roll the dice.'); return; }
        if (sel !== null) {
          const tg = targets(sel);
          if (tg.has(i)) { doPath(tg.get(i)); return; }
          if (i === sel) { sel = null; render(); return; }
        }
        if (sources().includes(i)) { sel = i; cur = 0; api.sfx.click(); render(); const t = targets(i); if (!t.size) status('That checker cannot move.'); return; }
        if (i !== 0 && sel === null) {
          if (pos.bar[0]) status('You have a checker on the bar. It must come back in first.');
          else if (pos.pt[i] > 0) status('That checker has no legal move with these dice.');
        }
        sel = null; render();
      }
      function doPath(path) {
        for (const st of path) {
          hist.push(bgClone(pos));
          const hit = bgApply(pos, st.from, st.to); prefix.push(st);
          if (hit) { api.sfx.knock ? api.sfx.knock() : api.tone(200, 0.1, { vol: 0.08 }); ctx.react(Math.random() < 0.5 ? 'bad' : 'good', bot, 0.7); }
          else api.tone(st.to === 0 ? 880 : 520, 0.05, { type: 'triangle', vol: 0.06 });
        }
        sel = null; cur = 0; afterStep();
      }
      function afterStep() {
        if (pos.off[0] === 15) { phase = 'over'; render(); gameOver(0); return; }
        if (!stepsAfter(prefix).length) { phase = 'done'; status('All moves made. Press Done to end your turn, or Undo to change them.'); }
        else status(`Moves left: ${remaining().join(', ')}.`);
        render();
      }
      function undo() {
        if (turn !== 0 || !prefix.length || (phase !== 'move' && phase !== 'done')) return;
        pos = hist.pop(); prefix.pop(); phase = 'move'; sel = null; api.sfx.click();
        status(`Moves left: ${remaining().join(', ')}.`); render();
      }
      function endTurn() {
        if (turn !== 0 || (phase !== 'done' && phase !== 'nomove')) return;
        api.sfx.click(); sel = null; cpuTurn();
      }
      function cpuTurn(pre) {
        turn = 1; phase = 'cpu'; sel = null; render();
        if (ctx.cpuTick()) return;
        status(`${bot.name} is rolling...`);
        const go = d => {
          who = 1; showDice = d.slice(); render();
          const fp = bgFlip(pos), seq = bgChoose(fp, d, ctx.lvl);
          if (d.length === 4) ctx.react('gloat', bot, 0.25);
          lastCpu = [];
          if (!seq.length) { status(`${bot.name} rolled ${d.slice(0, 2).join(' and ')} and cannot move.`); ctx.later(toPlayer, ctx.delay(1500)); return; }
          status(`${bot.name} rolled ${d.length === 4 ? 'double ' + d[0] + 's' : d.join(' and ')}.`);
          let k = 0;
          const step = () => {
            const st = seq[k], f = bgFlip(pos), hit = bgApply(f, st.from, st.to);
            pos = bgFlip(f);
            if (st.to !== 0) lastCpu.push(25 - st.to);
            if (hit) { api.tone(180, 0.12, { type: 'square', vol: 0.06 }); ctx.react('gloat', bot, 0.5); } else api.tone(st.to === 0 ? 700 : 420, 0.05, { type: 'triangle', vol: 0.05 });
            render();
            if (pos.off[1] === 15) { phase = 'over'; gameOver(1); return; }
            if (++k < seq.length) ctx.later(step, ctx.delay(520)); else ctx.later(toPlayer, ctx.delay(650));
          };
          ctx.later(step, ctx.delay(700));
        };
        if (pre) go(pre); else ctx.later(() => rollAnim(() => go(roll2()), true), ctx.delay(rnd(500, 1000)));
      }
      function toPlayer() {
        turn = 0; phase = 'roll'; sel = null;
        status(`Your turn. Press Roll${kbMode ? ' (Space)' : ''}.`); render();
        if (ctx.auto()) ctx.later(playerRoll, ctx.delay(200));
      }
      function gameOver(winner) {
        const loserOff = pos.off[1 - winner];
        let mult = 1, kind = '';
        if (loserOff === 0) {
          mult = 1.5; kind = 'Gammon';
          const back = winner === 0 ? (pos.bar[1] > 0 || [1, 2, 3, 4, 5, 6].some(i => pos.pt[i] < 0)) : (pos.bar[0] > 0 || [19, 20, 21, 22, 23, 24].some(i => pos.pt[i] > 0));
          if (back) { mult = 2; kind = 'Backgammon'; }
        }
        status(winner === 0 ? 'You bore off all 15 checkers!' : `${bot.name} bore off all 15 checkers.`);
        render();
        ctx.finish({ res: winner === 0 ? 'win' : 'loss', mult, detail: (kind ? `${kind}! ` : '') + (winner === 0 ? 'You bore off all your checkers first.' : `${bot.name} bore off first.`) });
      }
      svg.addEventListener('click', e => { const t = e.target.closest('[data-pt]'); if (t) { kbMode = false; tap(+t.dataset.pt); } });
      bRoll.onclick = () => phase === 'opening' ? openingRoll() : playerRoll();
      bUndo.onclick = undo; bDone.onclick = endTurn;
      status(`Welcome! You play the white checkers and move them toward point 1, then bear off. ${bot.name} plays red. Press Roll to start.`);
      render();
      if (ctx.auto()) ctx.later(openingRoll, ctx.delay(300));
      return {
        kick() { if (turn !== 0) return; if (phase === 'opening') openingRoll(); else if (phase === 'roll') playerRoll(); else if (phase === 'move') autoMove(); else if (phase === 'done') endTurn(); },
        onKey(e) {
          const k = e.key;
          if ((k === ' ' || k === 'r' || k === 'R') && (phase === 'roll' || phase === 'opening')) { e.preventDefault(); kbMode = true; phase === 'opening' ? openingRoll() : playerRoll(); return; }
          if (k === 'u' || k === 'U' || k === 'Backspace') { e.preventDefault(); undo(); return; }
          if (k === 'Enter' && phase === 'done') { e.preventDefault(); endTurn(); return; }
          if (phase !== 'move') return;
          const opts = sel !== null ? [...targets(sel).keys()] : sources();
          if (k === 'ArrowLeft' || k === 'ArrowRight' || k === 'ArrowUp' || k === 'ArrowDown') { e.preventDefault(); kbMode = true; if (opts.length) cur = (cur + (k === 'ArrowRight' || k === 'ArrowDown' ? 1 : opts.length - 1)) % opts.length; render(); }
          else if ((k === ' ' || k === 'Enter') && opts.length) { e.preventDefault(); kbMode = true; tap(opts[cur % opts.length]); }
          else if (k === 'Escape' && sel !== null) { e.preventDefault(); sel = null; render(); }
        }
      };
    }

    /* ================= Spades ================= */
    function spGame(ctx) {
      const target = ctx.opt.spTarget === 200 ? 200 : 500, nilOK = !!ctx.opt.spNil, lvl = ctx.lvl;
      const names = [ctx.me, ctx.bots[0].name, ctx.bots[1].name, ctx.bots[2].name];
      const bots = [null, ctx.bots[0], ctx.bots[1], ctx.bots[2]];
      const S = { scores: [0, 0], bags: [0, 0], dealer: rnd(0, 3), hist: [], hands: [[], [], [], []], bids: [null, null, null, null], tricks: [0, 0, 0, 0], trick: [], turn: 0, broken: false, played: new Set(), phase: 'bid', lastWin: -1, kb: 0 };
      ctx.el.innerHTML = `<div class="gmr-sp"><div class="gmr-sptop"><span class="gmr-spus"></span><span class="gmr-spthem"></span><span class="gmr-spgoal">Game to ${target}</span></div>` +
        `<div class="gmr-sptbl"><div class="gmr-seat gmr-s2"></div><div class="gmr-seat gmr-s1"></div><div class="gmr-spmid">${[0, 1, 2, 3].map(p => `<div class="gmr-slot gmr-sl${p}"></div>`).join('')}</div><div class="gmr-seat gmr-s3"></div>` +
        `<div class="gmr-bidp" hidden></div></div><div class="gmr-seat gmr-s0"></div><div class="gmr-hand"></div><div class="gmr-status" role="status"></div></div>`;
      const q = s => ctx.el.querySelector(s);
      const root2 = q('.gmr-sp'), handEl = q('.gmr-hand'), bidP = q('.gmr-bidp'), stEl = q('.gmr-status');
      const seatEl = [0, 1, 2, 3].map(p => q('.gmr-s' + p)), slotEl = [0, 1, 2, 3].map(p => q('.gmr-sl' + p));
      const status = t => { stEl.textContent = t; };
      const team = p => p % 2;
      const beats = (a, b) => a.s === b.s ? a.r > b.r : a.s === 0;
      function winnerOf(tr) { let w = tr[0]; for (const t of tr) if (beats(t.c, w.c)) w = t; return w; }
      function legal(p) {
        const h = S.hands[p], tr = S.trick;
        if (!tr.length) { if (!S.broken) { const ns = h.filter(c => c.s !== 0); if (ns.length) return ns; } return h.slice(); }
        const f = h.filter(c => c.s === tr[0].c.s); return f.length ? f : h.slice();
      }
      function layout() {
        const w = root2.clientWidth || 360, h = root2.clientHeight || 400;
        const cw = Math.round(Math.max(34, Math.min(64, w / 8.5, (h - 110) / 5.6)));
        root2.style.setProperty('--cw', cw + 'px');
        const n = S.hands[0].length, hw = handEl.clientWidth || w;
        const step = n > 1 ? Math.min(cw + 4, (hw - cw - 6) / (n - 1)) : 0, x0 = Math.max(3, (hw - (cw + step * Math.max(0, n - 1))) / 2);
        [...handEl.children].forEach((d, k) => { d.style.left = Math.round(x0 + k * step) + 'px'; });
      }
      function render() {
        const [us, them] = [0, 1].map(t => `${S.scores[t]} <small>(${S.bags[t]} bag${S.bags[t] === 1 ? '' : 's'})</small>`);
        q('.gmr-spus').innerHTML = `<b>You + ${esc(names[2])}:</b> ${us}`;
        q('.gmr-spthem').innerHTML = `<b>Them:</b> ${them}`;
        for (let p = 0; p < 4; p++) {
          const b = S.bids[p], role = p === 0 ? 'You' : p === 2 ? 'Partner' : 'Opponent';
          seatEl[p].innerHTML = `${p ? botFace(bots[p], 22) : ''}<div><b>${esc(names[p])}</b> <small>${role}</small><br>Bid ${b === null ? '-' : b === 0 ? 'Nil' : b} · Took ${S.tricks[p]}</div>`;
          seatEl[p].classList.toggle('gmr-turn', (S.phase === 'play' || S.phase === 'bid') && S.turn === p);
          seatEl[p].classList.toggle('gmr-team', team(p) === 0);
        }
        slotEl.forEach((el, p) => {
          const t = S.trick.find(x => x.p === p), win = !!t && S.trick.length === 4 && winnerOf(S.trick).p === p, key = t ? t.c.id + (win ? 'w' : '') : '';
          if (el.dataset.k === key) return;
          const was = el.dataset.k || ''; el.dataset.k = key;
          if (t && was && parseInt(was, 10) === t.c.id) { el.firstChild.classList.toggle('gmr-win', win); return; }
          el.innerHTML = t ? cardHtml(t.c, win ? ' gmr-win' : '') : '';
        });
        const my = S.phase === 'play' && S.turn === 0, ok = my ? legal(0) : [];
        if (S.kb >= S.hands[0].length) S.kb = Math.max(0, S.hands[0].length - 1);
        handEl.innerHTML = S.hands[0].map((c, k) => cardHtml(c, (my && !ok.includes(c) ? ' gmr-dim' : '') + (my && ok.includes(c) ? ' gmr-can' : '') + (my && kbOn && k === S.kb ? ' gmr-kb' : ''))).join('');
        layout();
      }
      let kbOn = false;
      function deal() {
        const deck = [];
        for (let s = 0; s < 4; s++) for (let r = 2; r <= 14; r++) deck.push({ s, r, id: s * 13 + r - 2 });
        shuffle(deck);
        S.hands = [0, 1, 2, 3].map(p => sortHand(deck.slice(p * 13, p * 13 + 13)));
        S.bids = [null, null, null, null]; S.tricks = [0, 0, 0, 0]; S.trick = []; S.broken = false; S.played = new Set();
        S.turn = (S.dealer + 1) % 4; S.phase = 'bid';
        api.noise(0.25, { ft: 'bandpass', f: 1400, vol: 0.05 });
        status(`${names[S.dealer]} deals. Time to bid: how many tricks will you take?`);
        render(); nextBid();
      }
      function estTricks(h) {
        let t = 0;
        const by = [0, 1, 2, 3].map(s => h.filter(c => c.s === s).map(c => c.r).sort((a, b) => b - a));
        const sp = by[0];
        for (let s = 1; s <= 3; s++) {
          const cs = by[s], n = cs.length;
          if (cs.includes(14)) t += n <= 5 ? 1 : 0.6;
          if (cs.includes(13)) t += n >= 2 && n <= 5 ? 0.75 : n === 1 ? 0.15 : 0.35;
          if (cs.includes(12) && n >= 3 && n <= 4 && (cs.includes(14) || cs.includes(13))) t += 0.3;
          if (sp.length >= 2) { if (n === 0) t += Math.min(2, sp.length - 1) * 0.7; else if (n === 1 && !cs.includes(14)) t += 0.55; }
        }
        sp.forEach((r, k) => { if (r === 14) t += 1; else if (r === 13) t += sp.length >= 2 ? 0.9 : 0.4; else if (r === 12) t += sp.length >= 3 ? 0.7 : 0.25; else if (k >= 3) t += 0.75; });
        return t;
      }
      const canNil = h => { const sp = h.filter(c => c.s === 0); return sp.length <= 3 && !sp.some(c => c.r >= 11) && !h.some(c => c.r === 14) && h.filter(c => c.r >= 12).length <= 1; };
      function aiBid(p) {
        const h = S.hands[p], est = estTricks(h), part = (p + 2) % 4;
        if (nilOK && S.bids[part] !== 0 && est < 1.4 && canNil(h) && (lvl > 0 || Math.random() < 0.5)) return 0;
        let b = Math.round(est + (lvl === 0 ? (Math.random() - 0.5) * 2 : lvl === 1 ? (Math.random() - 0.5) * 0.8 : -0.1));
        const others = S.bids.reduce((a, x, k) => a + (k !== p && x ? x : 0), 0);
        b = Math.max(1, Math.min(b, 13 - others, 13));
        return Math.max(1, b);
      }
      function nextBid() {
        if (S.bids.every(b => b !== null)) {
          S.phase = 'play'; S.turn = (S.dealer + 1) % 4;
          const tb = t => [t, t + 2].reduce((a, p) => a + S.bids[p], 0);
          status(`Bids are in: your team ${tb(0)}${S.bids[0] === 0 || S.bids[2] === 0 ? ' (with a Nil)' : ''}, them ${tb(1)}${S.bids[1] === 0 || S.bids[3] === 0 ? ' (with a Nil)' : ''}.`);
          render(); ctx.later(nextPlay, ctx.delay(900)); return;
        }
        const p = S.turn;
        if (p === 0) {
          if (ctx.auto()) { ctx.later(() => setBid(0, aiBid(0)), ctx.delay(300)); return; }
          showBid(); return;
        }
        if (p === 1 && S.bids.every(b => b === null) && ctx.cpuTick()) return;
        ctx.later(() => setBid(p, aiBid(p)), ctx.delay(rnd(600, 1100)));
      }
      function showBid() {
        const sug = Math.max(1, Math.min(13, Math.round(estTricks(S.hands[0]))));
        const pb = S.bids[2];
        bidP.hidden = false;
        bidP.innerHTML = `<div class="gmr-bidbox raised"><div class="gmr-dt">Your bid</div><div class="gmr-small">${pb === null ? 'Your partner has not bid yet.' : `${esc(names[2])} bid ${pb === 0 ? 'Nil' : pb}.`} A good guess for this hand: <b>${sug}</b>.</div>` +
          `<div class="gmr-bidg">${nilOK ? '<button class="btn" data-b="0" title="Take no tricks at all for 100 points">Nil</button>' : ''}${Array.from({ length: 13 }, (_, k) => `<button class="btn${k + 1 === sug ? ' gmr-sug' : ''}" data-b="${k + 1}">${k + 1}</button>`).join('')}</div></div>`;
        bidP.onclick = e => { const b = e.target.closest('[data-b]'); if (b) { bidP.hidden = true; bidP.onclick = null; api.sfx.click(); setBid(0, +b.dataset.b); } };
        const s = bidP.querySelector('.gmr-sug'); if (s) s.focus();
        status('Your turn to bid. Count your aces, kings and high spades.');
        render();
      }
      function setBid(p, b) {
        if (S.phase !== 'bid' || S.turn !== p || S.bids[p] !== null) return;
        if (b === 0 && S.bids[(p + 2) % 4] === 0) b = 1;
        S.bids[p] = b;
        status(`${p === 0 ? 'You bid' : names[p] + ' bids'} ${b === 0 ? 'Nil' : b}.`);
        api.tone(p === 0 ? 660 : 520, 0.06, { type: 'triangle', vol: 0.05 });
        if (p && b === 0) ctx.react('gloat', bots[p], 0.3);
        S.turn = (p + 1) % 4; render();
        ctx.later(nextBid, ctx.delay(250));
      }
      function nextPlay() {
        if (S.phase !== 'play') return;
        if (S.trick.length === 4) { ctx.later(endTrick, ctx.delay(1000)); return; }
        const p = S.turn; render();
        if (p === 0) {
          if (ctx.auto()) { ctx.later(() => play(0, aiPlay(0)), ctx.delay(250)); return; }
          status(S.trick.length ? `Your turn. ${legal(0).length < S.hands[0].length ? 'Follow suit if you can.' : 'Play any card.'}` : `Your lead.${!S.broken ? ' Spades are not broken yet.' : ''}`);
          return;
        }
        if (p === 1 && ctx.cpuTick()) return;
        status(`${names[p]} is thinking...`);
        ctx.later(() => play(p, aiPlay(p)), ctx.delay(rnd(500, 1000)));
      }
      function play(p, c) {
        if (S.phase !== 'play' || S.turn !== p || !c) return;
        const h = S.hands[p]; const k = h.indexOf(c); if (k < 0) return;
        h.splice(k, 1); S.trick.push({ p, c });
        if (c.s === 0 && !S.broken) { S.broken = true; if (S.trick.length > 1) status(`${p ? names[p] : 'You'} broke spades!`); }
        api.noise(0.08, { ft: 'highpass', f: 2500, vol: 0.05 });
        S.turn = (p + 1) % 4;
        nextPlay();
      }
      function endTrick() {
        const w = winnerOf(S.trick).p;
        S.tricks[w]++;
        S.trick.forEach(t => S.played.add(t.c.id));
        const prevNil = [0, 1, 2, 3].filter(p => S.bids[p] === 0 && S.tricks[p] === 1 && p === w);
        S.trick = []; S.turn = w;
        if (w === 0) api.tone(740, 0.08, { type: 'triangle', vol: 0.05 });
        status(`${w === 0 ? 'You take' : names[w] + ' takes'} the trick.`);
        if (prevNil.length) { const p = prevNil[0]; if (p) ctx.react('bad', bots[p], 0.9); else ctx.react('gloat', bots[pickA([1, 3])], 0.6); status(`${p ? names[p] : 'You'} took a trick, so that Nil bid is broken.`); }
        else if (w === 0 && Math.random() < 0.2) ctx.react('partner', bots[2], 0.8);
        else if (w === 2 && Math.random() < 0.1) ctx.react('gloat', bots[2], 0.5);
        render();
        if (!S.hands[0].length) ctx.later(endHand, ctx.delay(900)); else ctx.later(nextPlay, ctx.delay(500));
      }
      async function endHand() {
        S.phase = 'score';
        const rows = [];
        for (let t = 0; t < 2; t++) {
          const seats = [t, t + 2]; let pts = 0, bags = 0, notes = [];
          seats.forEach(p => { if (S.bids[p] === 0) { if (S.tricks[p] === 0) { pts += 100; notes.push(`${p ? names[p] : 'You'}: Nil made +100`); } else { pts -= 100; bags += S.tricks[p]; pts += S.tricks[p]; notes.push(`${p ? names[p] : 'You'}: Nil failed -100`); } } });
          const contract = seats.reduce((a, p) => a + (S.bids[p] || 0), 0), took = seats.reduce((a, p) => a + (S.bids[p] ? S.tricks[p] : 0), 0);
          if (contract > 0) {
            if (took >= contract) { pts += contract * 10 + (took - contract); bags += took - contract; notes.push(`Made ${contract}: +${contract * 10}${took > contract ? `, ${took - contract} bag${took - contract > 1 ? 's' : ''}` : ''}`); }
            else { pts -= contract * 10; notes.push(`Set! Bid ${contract}, took ${took}: -${contract * 10}`); }
          }
          S.bags[t] += bags;
          if (S.bags[t] >= 10) { S.bags[t] -= 10; pts -= 100; notes.push('10 bags: -100'); }
          S.scores[t] += pts;
          rows.push({ pts, notes, took: seats.reduce((a, p) => a + S.tricks[p], 0), bid: contract });
        }
        S.hist.push(rows.map(r => r.pts));
        if (rows[0].pts > rows[1].pts && rows[0].pts > 0) ctx.react('partner', bots[2], 0.5); else if (rows[1].pts > rows[0].pts) ctx.react('gloat', bots[pickA([1, 3])], 0.4);
        render();
        const [a, b] = S.scores, lose = -Math.round(target * 0.4);
        const over = ((a >= target || b >= target) && a !== b) || a <= lose || b <= lose;
        const html = `<table class="gmr-sheet"><tr><th></th><th>Your team</th><th>Them</th></tr><tr><td>Bid / took</td><td>${rows[0].bid} / ${rows[0].took}</td><td>${rows[1].bid} / ${rows[1].took}</td></tr>` +
          `<tr><td>This hand</td><td>${rows[0].pts > 0 ? '+' : ''}${rows[0].pts}</td><td>${rows[1].pts > 0 ? '+' : ''}${rows[1].pts}</td></tr><tr><td>Total</td><td><b>${a}</b></td><td><b>${b}</b></td></tr><tr><td>Bags</td><td>${S.bags[0]}</td><td>${S.bags[1]}</td></tr></table>` +
          `<div class="gmr-small">${rows[0].notes.map(esc).join('<br>') || '-'}</div><div class="gmr-small gmr-them">Them: ${rows[1].notes.map(esc).join('; ') || '-'}</div>`;
        if (over) {
          const win = a > b;
          ctx.finish({ res: win ? 'win' : 'loss', detail: `Final score: your team ${a}, them ${b}.` });
          return;
        }
        game.hold = true;
        const r = await dialog(`Hand ${S.hist.length} results`, html, ctx.auto() ? ['Next hand'] : ['Next hand']);
        void r;
        if (!game || dead) return;
        game.hold = false;
        S.dealer = (S.dealer + 1) % 4; deal();
      }
      function isTop(c, p) {
        for (let r = c.r + 1; r <= 14; r++) { const id = c.s * 13 + r - 2; if (!S.played.has(id) && !S.hands[p].some(x => x.id === id) && !S.trick.some(t => t.c.id === id)) return false; }
        return true;
      }
      const val = c => c.r + (c.s === 0 ? 20 : 0);
      const low = a => a.slice().sort((x, y) => val(x) - val(y))[0];
      const high = a => a.slice().sort((x, y) => val(y) - val(x))[0];
      function aiPlay(p) {
        const ok = legal(p); if (ok.length === 1) return ok[0];
        const part = (p + 2) % 4, h = S.hands[p], tr = S.trick;
        const nil = S.bids[p] === 0, pNil = S.bids[part] === 0 && S.tricks[part] === 0;
        const need = (S.bids[p] || 0) + (S.bids[part] || 0) - ((S.bids[p] ? S.tricks[p] : 0) + (S.bids[part] ? S.tricks[part] : 0));
        const oppNil = [1, 3].map(k => (p + k) % 4).filter(o => S.bids[o] === 0 && S.tricks[o] === 0);
        const sloppy = lvl === 0 && Math.random() < 0.25;
        if (sloppy) return pickA(ok);
        const nonSp = a => { const r = a.filter(c => c.s !== 0); return r.length ? r : a; };
        if (!tr.length) {
          if (nil) { const bySuit = [1, 2, 3, 0].map(s => ok.filter(c => c.s === s)).filter(a => a.length); return low(bySuit.map(a => low(a))); }
          if (need > 0 || pNil) {
            const tops = ok.filter(c => c.r >= 12 && isTop(c, p) && (c.s !== 0 || S.broken));
            const side = tops.filter(c => c.s !== 0 && h.filter(x => x.s === c.s).length <= 5);
            if (side.length) return high(side);
            if (tops.length && lvl > 0) return high(tops);
          }
          if (oppNil.length) { const lows = ok.filter(c => c.r <= 5 && c.s !== 0); if (lows.length) return low(lows); }
          const cnt = s => h.filter(c => c.s === s).length;
          const pool = nonSp(ok);
          const longest = pool.slice().sort((a, b) => cnt(b.s) - cnt(a.s) || a.r - b.r)[0];
          return low(pool.filter(c => c.s === longest.s));
        }
        const w = winnerOf(tr), led = tr[0].c.s;
        const canWin = ok.filter(c => beats(c, w.c)), lose = ok.filter(c => !beats(c, w.c));
        const last = tr.length === 3, partnerPlayed = tr.some(t => t.p === part);
        if (nil) return lose.length ? high(lose) : high(ok);
        if (pNil) {
          if (w.p === part && canWin.length) return last ? low(canWin) : high(canWin);
          if (!partnerPlayed && canWin.length) return high(canWin);
          if (w.p !== part) return lose.length ? low(lose) : low(ok);
        }
        if (oppNil.includes(w.p) && lose.length) return high(lose);
        if (w.p === part) {
          const safe = last || isTop(w.c, part) || (w.c.s === 0 && w.c.s !== led);
          if (safe || need <= 0) return low(nonSp(lose.length ? lose : ok));
          if (canWin.length && tr.length === 2 && !isTop(w.c, part)) { const t = canWin.filter(c => isTop(c, p)); if (t.length) return low(t); }
          return low(nonSp(lose.length ? lose : ok));
        }
        if (canWin.length && (need > 0 || lvl < 2 || oppNil.length)) {
          if (last) return low(canWin);
          const tops = canWin.filter(c => isTop(c, p));
          if (tops.length) return low(tops);
          if (canWin[0].s === 0 && led !== 0) return low(canWin);
          if (tr.length === 2) return high(canWin);
          return lose.length ? low(nonSp(lose)) : low(canWin);
        }
        if (need <= 0 && lose.length) return high(lose);
        return low(nonSp(lose.length ? lose : ok));
      }
      handEl.addEventListener('click', e => {
        const d = e.target.closest('[data-id]'); if (!d) return;
        const c = S.hands[0].find(x => x.id === +d.dataset.id); if (!c) return;
        kbOn = false; tryPlay(c);
      });
      function tryPlay(c) {
        if (S.phase === 'bid') { status('First choose your bid.'); return; }
        if (S.phase !== 'play' || S.turn !== 0) { status('Wait for your turn.'); return; }
        if (!legal(0).includes(c)) { api.sfx.beep(); status(S.trick.length ? `You must follow suit and play ${SUITN[S.trick[0].c.s]}.` : 'Spades are not broken yet, so lead another suit.'); return; }
        play(0, c);
      }
      const ro = window.ResizeObserver ? new ResizeObserver(() => layout()) : null;
      if (ro) ro.observe(root2);
      deal();
      return {
        kick() { if (S.turn !== 0) return; if (S.phase === 'bid' && !bidP.hidden) { bidP.hidden = true; setBid(0, aiBid(0)); } else if (S.phase === 'play') play(0, aiPlay(0)); },
        onKey(e) {
          const k = e.key;
          if (S.phase === 'play' && S.turn === 0) {
            const n = S.hands[0].length;
            if (k === 'ArrowLeft' || k === 'ArrowRight') { e.preventDefault(); kbOn = true; S.kb = (S.kb + (k === 'ArrowRight' ? 1 : n - 1)) % n; render(); }
            else if ((k === ' ' || k === 'Enter') && kbOn) { e.preventDefault(); tryPlay(S.hands[0][S.kb]); }
          } else if (S.phase === 'bid' && S.turn === 0 && !bidP.hidden) {
            const btns = [...bidP.querySelectorAll('[data-b]')], i = btns.indexOf(document.activeElement);
            if (k === 'ArrowLeft' || k === 'ArrowRight') { e.preventDefault(); const j = i < 0 ? 0 : (i + (k === 'ArrowRight' ? 1 : btns.length - 1)) % btns.length; btns[j].focus(); }
          }
        },
        close() { if (ro) ro.disconnect(); }
      };
    }

    /* ================= Dots and Boxes ================= */
    function dbGame(ctx) {
      const n = ctx.opt.dbSize === 6 ? 6 : 4, bot = ctx.bots[0], lvl = ctx.lvl;
      const NH = (n + 1) * n, NL = NH + n * (n + 1);
      const hId = (r, c) => r * n + c, vId = (r, c) => NH + r * (n + 1) + c;
      const boxLines = [], lineBoxes = Array.from({ length: NL }, () => []);
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) { const b = r * n + c, ls = [hId(r, c), hId(r + 1, c), vId(r, c), vId(r, c + 1)]; boxLines.push(ls); ls.forEach(l => lineBoxes[l].push(b)); }
      const L = new Int8Array(NL), B = new Int8Array(n * n), score = [0, 0];
      let turn = Math.random() < 0.5 ? 0 : 1, last = -1, cur = 0, kbOn = false, over = false, run = 0;
      const sides = (Lx, b) => boxLines[b].reduce((a, l) => a + (Lx[l] ? 1 : 0), 0);
      const S0 = 50, P = 16, size = n * S0 + 2 * P;
      ctx.el.innerHTML = `<div class="gmr-db"><div class="gmr-info gmr-dbsc"></div><div class="gmr-svgbox"><svg class="gmr-dbsvg" viewBox="0 0 ${size} ${size}" role="img" aria-label="Dots and Boxes board"></svg></div><div class="gmr-status" role="status"></div></div>`;
      const svg = ctx.el.querySelector('svg'), scEl = ctx.el.querySelector('.gmr-dbsc'), stEl = ctx.el.querySelector('.gmr-status');
      const status = t => { stEl.textContent = t; };
      function geo(l) {
        if (l < NH) { const r = Math.floor(l / n), c = l % n; return { x1: P + c * S0, y1: P + r * S0, x2: P + (c + 1) * S0, y2: P + r * S0, h: true }; }
        const k = l - NH, r = Math.floor(k / (n + 1)), c = k % (n + 1); return { x1: P + c * S0, y1: P + r * S0, x2: P + c * S0, y2: P + (r + 1) * S0, h: false };
      }
      const openLines = () => { const o = []; for (let l = 0; l < NL; l++) if (!L[l]) o.push(l); return o; };
      function render() {
        scEl.innerHTML = `<span class="gmr-chip gmr-c0"></span>You <b>${score[0]}</b> &nbsp; <span class="gmr-chip gmr-c1"></span>${esc(bot.name)} <b>${score[1]}</b> &nbsp; <small>${n * n - score[0] - score[1]} boxes left</small>`;
        let o = `<rect x="0" y="0" width="${size}" height="${size}" fill="#fffbe6"/>`;
        for (let b = 0; b < n * n; b++) if (B[b]) {
          const r = Math.floor(b / n), c = b % n;
          o += `<rect x="${P + c * S0 + 2}" y="${P + r * S0 + 2}" width="${S0 - 4}" height="${S0 - 4}" fill="${B[b] === 1 ? '#a9c8ff' : '#ffb3a8'}"/><text x="${P + c * S0 + S0 / 2}" y="${P + r * S0 + S0 / 2 + 7}" font-size="20" font-weight="bold" text-anchor="middle" fill="${B[b] === 1 ? '#1d3f9a' : '#9a1d1d'}" font-family="Tahoma,sans-serif">${B[b] === 1 ? 'Y' : esc(bot.name[0].toUpperCase())}</text>`;
        }
        const ol = openLines(); if (cur >= ol.length) cur = 0;
        for (let l = 0; l < NL; l++) {
          const g = geo(l);
          if (L[l]) o += `<line x1="${g.x1}" y1="${g.y1}" x2="${g.x2}" y2="${g.y2}" stroke="${L[l] === 1 ? '#1d4fd6' : '#d6261d'}" stroke-width="${l === last ? 7 : 5}" stroke-linecap="square"/>`;
          else o += `<line x1="${g.x1}" y1="${g.y1}" x2="${g.x2}" y2="${g.y2}" stroke="#d9d2b8" stroke-width="1.5" stroke-dasharray="3 4"/>`;
        }
        if (kbOn && turn === 0 && ol.length) { const g = geo(ol[cur]); o += `<line x1="${g.x1}" y1="${g.y1}" x2="${g.x2}" y2="${g.y2}" stroke="#ffcc00" stroke-width="7" opacity=".8"/>`; }
        for (let r = 0; r <= n; r++) for (let c = 0; c <= n; c++) o += `<rect x="${P + c * S0 - 4}" y="${P + r * S0 - 4}" width="8" height="8" fill="#222"/>`;
        for (let l = 0; l < NL; l++) if (!L[l]) { const g = geo(l); o += g.h ? `<rect data-l="${l}" x="${g.x1 + 5}" y="${g.y1 - 12}" width="${S0 - 10}" height="24" fill="transparent"/>` : `<rect data-l="${l}" x="${g.x1 - 12}" y="${g.y1 + 5}" width="24" height="${S0 - 10}" fill="transparent"/>`; }
        svg.innerHTML = o;
      }
      function take(Lx, Bx, l, who) {
        Lx[l] = who + 1; let got = 0;
        for (const b of lineBoxes[l]) if (!Bx[b] && sides(Lx, b) === 4) { Bx[b] = who + 1; got++; }
        return got;
      }
      function greedy(Lx, Bx) {
        let got = 0, found = true;
        while (found) {
          found = false;
          for (let b = 0; b < n * n; b++) if (!Bx[b] && sides(Lx, b) === 3) { const l = boxLines[b].find(x => !Lx[x]); got += take(Lx, Bx, l, 0); found = true; }
        }
        return got;
      }
      function aiLine(level) {
        const ol = openLines();
        const cap = ol.filter(l => lineBoxes[l].some(b => sides(L, b) === 3));
        const safe = ol.filter(l => lineBoxes[l].every(b => sides(L, b) < 2));
        if (cap.length) {
          if (level === 0 && safe.length && Math.random() < 0.3) return pickA(safe);
          if (level === 2 && !safe.length) {
            for (const l of cap) {
              const A = lineBoxes[l].find(b => sides(L, b) === 3), others = lineBoxes[l].filter(b => b !== A);
              if (others.length !== 1) continue;
              const Bb = others[0]; if (sides(L, Bb) !== 2) continue;
              const bo = boxLines[Bb].filter(x => !L[x] && x !== l); if (bo.length !== 1) continue;
              const beyond = lineBoxes[bo[0]].filter(b => b !== Bb);
              if (beyond.length && sides(L, beyond[0]) >= 2) continue;
              if (cap.length > 1) return cap.find(x => x !== l);
              let unowned = 0; for (let b = 0; b < n * n; b++) if (!B[b]) unowned++;
              if (unowned - 2 >= 3) return bo[0];
            }
          }
          const two = cap.find(l => lineBoxes[l].filter(b => sides(L, b) === 3).length === 2);
          return two !== undefined ? two : cap[0];
        }
        if (safe.length) return level === 0 && Math.random() < 0.2 ? pickA(ol) : pickA(safe);
        if (level === 0 && Math.random() < 0.5) return pickA(ol);
        let best = ol[0], bc = Infinity;
        for (const l of ol) {
          const L2 = L.slice(), B2 = B.slice(); L2[l] = 3;
          const cost = greedy(L2, B2) + Math.random() * 0.1;
          if (cost < bc) { bc = cost; best = l; }
        }
        return best;
      }
      function draw(l, who) {
        if (over || L[l] || turn !== who) return;
        const got = take(L, B, l, who); last = l; score[who] += got;
        if (got) { api.tone(who === 0 ? 880 : 660, 0.1, { type: 'square', vol: 0.05 }); run += got; }
        else api.tone(who === 0 ? 520 : 400, 0.04, { type: 'triangle', vol: 0.05 });
        if (score[0] + score[1] === n * n) { over = true; render(); endGame(); return; }
        if (!got) {
          if (run >= 3) ctx.react(who === 0 ? 'bad' : 'gloat', bot, 0.8);
          run = 0; turn = 1 - who;
        }
        render(); next();
      }
      function next() {
        if (over) return;
        if (turn === 1) {
          if (run === 0 && ctx.cpuTick()) return;
          status(run ? `${bot.name} takes another turn.` : `${bot.name} is thinking...`);
          ctx.later(() => draw(aiLine(lvl), 1), ctx.delay(run ? rnd(300, 500) : rnd(600, 1100)));
        } else {
          status(run ? 'You closed a box! Go again.' : 'Your turn. Draw a line.');
          if (ctx.auto()) ctx.later(() => draw(aiLine(2), 0), ctx.delay(200));
        }
      }
      function endGame() {
        const [a, b] = score;
        status(a > b ? `You win ${a} to ${b}!` : a < b ? `${bot.name} wins ${b} to ${a}.` : `A tie, ${a} to ${b}.`);
        ctx.finish({ res: a > b ? 'win' : a < b ? 'loss' : 'draw', detail: `Boxes: you ${a}, ${bot.name} ${b}.` });
      }
      svg.addEventListener('click', e => {
        const t = e.target.closest('[data-l]'); if (!t) return;
        kbOn = false;
        if (turn !== 0) { status(`Wait: it is ${bot.name}'s turn.`); return; }
        draw(+t.dataset.l, 0);
      });
      status(turn === 0 ? 'You go first. Tap between two dots to draw a line.' : `${bot.name} goes first.`);
      render(); next();
      return {
        kick() { if (turn === 0 && !over) draw(aiLine(2), 0); },
        onKey(e) {
          if (turn !== 0 || over) return;
          const ol = openLines(); if (!ol.length) return;
          const k = e.key;
          if (k.startsWith('Arrow')) {
            e.preventDefault();
            if (!kbOn) { kbOn = true; render(); return; }
            const g0 = geo(ol[cur]), mx = (g0.x1 + g0.x2) / 2, my = (g0.y1 + g0.y2) / 2;
            const dx = k === 'ArrowRight' ? 1 : k === 'ArrowLeft' ? -1 : 0, dy = k === 'ArrowDown' ? 1 : k === 'ArrowUp' ? -1 : 0;
            let bi = -1, bd = Infinity;
            ol.forEach((l, i) => {
              const g = geo(l), x = (g.x1 + g.x2) / 2 - mx, y = (g.y1 + g.y2) / 2 - my, along = x * dx + y * dy;
              if (along <= 0) return;
              const d = along + Math.abs(x * dy + y * dx) * 2;
              if (d < bd) { bd = d; bi = i; }
            });
            if (bi >= 0) cur = bi;
            render();
          } else if ((k === ' ' || k === 'Enter') && kbOn) { e.preventDefault(); draw(ol[cur], 0); }
        }
      };
    }

    /* ---------- menus, keys, lifecycle ---------- */
    const HOW = {
      bg: 'You play the white checkers. Move all 15 of them around the board toward point 1 (your home is points 1 to 6, bottom right), then bear them off. The first player to bear off all 15 wins.\n\n' +
        'Roll two dice and move one checker for each die, or one checker twice. Doubles give you four moves. You must use both dice if you can; if only one can be used, use the bigger one when possible.\n\n' +
        'You cannot land on a point holding two or more red checkers. Landing on a single red checker hits it and sends it to the bar. If you have a checker on the bar, you must bring it back in first.\n\n' +
        'Winning before your opponent bears off any checkers is a Gammon (a bigger rating boost). Tap a checker, then a yellow point. Keys: Space roll, arrows and Space to pick, U undo, Enter done.',
      sp: 'Four players, two teams: you and your computer partner (across from you) against two computer opponents. Spades are always trump.\n\n' +
        'Bid how many tricks you think you will take. Your bid and your partner\'s bid add up to the team\'s contract. Make it and score 10 points per trick bid, plus 1 per extra trick (a "bag"). Miss it and lose 10 per trick bid. Every 10 bags costs 100 points.\n\n' +
        'Nil (if allowed): bid to take no tricks at all. Success is +100, failure is -100.\n\n' +
        'Follow the suit that was led if you can. You cannot lead spades until a spade has been played. The highest spade wins a trick, otherwise the highest card of the suit led. First team to the target score wins. Keys: Left and Right to pick a card, Space to play.',
      db: 'Take turns drawing a line between two dots next to each other. When your line closes the fourth side of a box, you win that box and must draw again.\n\n' +
        'When every box is taken, the player with more boxes wins. Try not to draw the third side of a box, because then your opponent can close it!\n\n' +
        'Tap between two dots to draw. Keys: arrows to move the yellow line, Space to draw it.'
    };
    const devItems = () => DEV ? ['-',
      { label: (dev.auto ? '[x] ' : '[ ] ') + 'Dev: autopilot', fn: () => { dev.auto = !dev.auto; if (dev.auto && screen === 'game' && game && game.mod && !game.done) { sys('dev autopilot on'); game.mod.kick(); } } },
      { label: (dev.fast ? '[x] ' : '[ ] ') + 'Dev: fast', fn: () => { dev.fast = !dev.fast; } },
      { label: 'Dev: force forfeit', fn: () => { dev.forfeit = true; } }] : [];
    api.menubar([
      { label: 'Game', items: () => [
        { label: 'Lobby', fn: toLobby },
        { label: 'Resign', fn: resign, disabled: !(screen === 'game' && game && !game.done) },
        '-',
        { label: 'How to play Backgammon', fn: () => api.msgBox('How to play Backgammon', HOW.bg) },
        { label: 'How to play Spades', fn: () => api.msgBox('How to play Spades', HOW.sp) },
        { label: 'How to play Dots and Boxes', fn: () => api.msgBox('How to play Dots and Boxes', HOW.db) },
        '-',
        { label: 'Exit', fn: () => api.close() }
      ].concat(devItems()) },
      { label: 'Help', items: [
        { label: 'About the Games Room', fn: () => api.msgBox('About the Games Room', 'Horizon Games Room is a pretend online game service. Connect with your modem, pick a room, and play Backgammon, Spades or Dots and Boxes.\n\nAll players here are computer characters, not real people. Chat uses preset friendly phrases only, so nobody can type anything unkind.\n\nWin games to raise your rating and earn play money.') },
        { label: 'Staying safe online', fn: () => api.msgBox('Staying safe online', 'In real online games, never share your real name, address, school, phone number or passwords. Be kind, and tell a grown-up if anything makes you feel uncomfortable.\n\nIn this Games Room everyone is a computer character, and chat uses preset phrases only.') }
      ] }
    ]);
    W.onKey = e => {
      if (!ov.hidden) return;
      if (screen === 'game' && game && game.mod && game.mod.onKey && !game.done) {
        const t = e.target; if (t && (t.tagName === 'SELECT' || t.tagName === 'INPUT')) return;
        game.mod.onKey(e);
      } else if (screen === 'lobby' && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        const bs = [...main.querySelectorAll('.gmr-join')], i = bs.indexOf(document.activeElement);
        e.preventDefault(); bs[i < 0 ? 0 : (i + (e.key === 'ArrowDown' ? 1 : bs.length - 1)) % bs.length].focus();
      }
    };
    W.onClose = () => {
      dead = true; sess++; chatSess++;
      clearInterval(netIv); clearInterval(lobbyIv);
      timers.forEach(clearTimeout); timers.clear();
      if (game && game.mod && game.mod.close) game.mod.close();
    };
    const pingIv = setInterval(() => { if (!dead) netTick(); }, 2000);
    const oc = W.onClose; W.onClose = () => { clearInterval(pingIv); return oc(); };

    if (api.online()) showLobby(); else showOffline();
    netTick();
  }

  const LOGO = '<svg width="18" height="18" viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true"><rect x="1" y="3" width="10" height="10" fill="#fff" stroke="#000"/><rect x="3" y="5" width="2" height="2"/><rect x="7" y="9" width="2" height="2"/><rect x="9" y="1" width="6" height="8" fill="#ffd200" stroke="#000"/><rect x="11" y="4" width="2" height="2" fill="#c00"/></svg>';

  const CSS = `
    .gmr{position:relative;display:flex;flex-direction:column;height:100%;min-height:340px;background:#eef1f7;font:12px/1.35 var(--ui)}
    .gmr-top{display:flex;align-items:center;gap:8px;padding:4px 8px;background:linear-gradient(90deg,#0a246a,#3a6ea5);color:#fff;flex:none;flex-wrap:wrap}
    .gmr-logo{display:flex;align-items:center;gap:5px;font-size:13px;color:#ffd200;white-space:nowrap}
    .gmr-logo b{color:#fff}
    .gmr-who{flex:1;text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
    .gmr-net{display:flex;align-items:center;gap:4px;white-space:nowrap}
    .gmr-net em{font-style:normal;font-size:11px;min-width:48px}
    .gmr-bars{display:flex;align-items:flex-end;gap:1px;height:12px}
    .gmr-bars i{width:3px;background:#4a5e86;display:block}
    .gmr-bars i:nth-child(1){height:3px}.gmr-bars i:nth-child(2){height:6px}.gmr-bars i:nth-child(3){height:9px}.gmr-bars i:nth-child(4){height:12px}
    .gmr-bars i.gmr-on{background:#5f5}
    .gmr-lag .gmr-bars i.gmr-on{background:#f44}
    .gmr-lag em{color:#ff8a80;font-weight:bold;animation:gmr-blink .5s steps(2) infinite}
    @keyframes gmr-blink{50%{opacity:.3}}
    .gmr-main{flex:1;min-height:0;overflow:auto;position:relative;background:#eef1f7}
    .gmr-small{font-size:11px;color:#333}
    .gmr-cpu{display:inline-block;font-size:9px;font-weight:bold;background:#0a246a;color:#fff;padding:0 3px;letter-spacing:.5px;vertical-align:1px}
    .gmr-role{font-size:10px;color:#555}
    .gmr-big{font-weight:bold;padding:6px 18px}
    /* offline */
    .gmr-off{display:flex;align-items:center;justify-content:center;min-height:100%;padding:12px;box-sizing:border-box}
    .gmr-offbox{max-width:360px;padding:16px 18px;text-align:center}
    .gmr-offbox h2{font-size:16px;margin:8px 0 6px;color:#0a246a}
    .gmr-offbox p{margin:0 0 12px}
    .gmr-dots3 i{font-style:normal;animation:gmr-blink 1.2s steps(2) infinite}
    .gmr-dots3 i:nth-child(2){animation-delay:.4s}.gmr-dots3 i:nth-child(3){animation-delay:.8s}
    /* lobby */
    .gmr-lobby{padding:8px;display:flex;flex-direction:column;gap:8px}
    .gmr-welcome{background:#fff;border:1px solid #9aa8c8;padding:6px 8px;display:flex;flex-wrap:wrap;gap:4px 10px;align-items:center}
    .gmr-total{margin-left:auto;color:#0a6a2a;font-weight:bold}
    .gmr-lcols{display:flex;gap:8px;align-items:flex-start}
    .gmr-rooms{flex:1.6;background:#fff;min-width:0}
    .gmr-rooms table{width:100%;border-collapse:collapse}
    .gmr-rooms th,.gmr-rooms td{padding:3px 6px;text-align:left}
    .gmr-rooms thead th{background:#d4d0c8;border-bottom:1px solid #808080;font-weight:normal}
    .gmr-gh th{background:linear-gradient(90deg,#0a246a,#a6caf0);color:#fff;font-size:12px}
    .gmr-gh th span{font-weight:normal;font-size:11px;color:#dfe8ff;margin-left:6px}
    .gmr-rooms tbody tr:not(.gmr-gh):nth-child(even){background:#f0f4fc}
    .gmr-cnt{font-family:"Courier New",monospace}
    .gmr-join{min-width:0;padding:2px 10px}
    .gmr-skill{font-weight:bold}.gmr-sk0{color:#0a7a2a}.gmr-sk1{color:#a06000}.gmr-sk2{color:#a01010}
    .gmr-side{flex:1;display:flex;flex-direction:column;gap:6px;min-width:180px}
    .gmr-side fieldset{margin:0;border:1px solid #9aa8c8;background:#fff;padding:4px 8px 6px}
    .gmr-side legend{color:#0a246a;font-weight:bold;padding:0 3px}
    .gmr-side label{display:block;margin:3px 0}
    .gmr-rt{width:100%;border-collapse:collapse}.gmr-rt td{padding:1px 2px}
    .gmr-foot{text-align:center;font-size:11px;color:#333;background:#fff8d0;border:1px solid #d8c060;padding:4px}
    /* matchmaking */
    .gmr-match{display:flex;justify-content:center;padding:14px 8px}
    .gmr-mbox{width:100%;max-width:520px;padding:10px 12px}
    .gmr-mt{font-weight:bold;color:#0a246a;font-size:13px}
    .gmr-mh{margin:6px 0 4px}
    .gmr-mbar{height:14px;background:#fff;padding:1px}
    .gmr-mfill{height:100%;width:0;background:repeating-linear-gradient(90deg,#0a246a 0 8px,transparent 8px 10px);transition:width .4s}
    .gmr-mlog{font-family:"Courier New",monospace;font-size:11px;margin:6px 0;min-height:48px}
    .gmr-mcards{display:flex;flex-direction:column;gap:6px;margin-bottom:8px}
    .gmr-ocard{display:flex;gap:8px;align-items:flex-start;padding:6px}
    .gmr-oinfo{min-width:0}
    .gmr-quirk{font-style:italic;color:#444}
    .gmr-face{flex:none;background:#dde6f5;border:1px solid #808080}
    .gmr-dbtns{display:flex;gap:6px;justify-content:flex-end;flex-wrap:wrap}
    .gmr-dbtns .btn{min-width:70px}
    /* game screen */
    .gmr-game{display:flex;flex-direction:column;height:100%;min-height:330px}
    .gmr-gbar{display:flex;align-items:center;gap:8px;padding:3px 6px;background:#d4d0c8;border-bottom:1px solid #808080;flex:none;flex-wrap:wrap}
    .gmr-lob{min-width:0;padding:2px 10px}
    .gmr-vs{margin-left:auto;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
    .gmr-gbody{flex:1;min-height:0;display:flex}
    .gmr-board{flex:1;min-width:0;min-height:0;display:flex;flex-direction:column}
    .gmr-chat{width:190px;flex:none;display:flex;flex-direction:column;gap:3px;padding:4px;background:#d4d0c8;border-left:1px solid #808080}
    .gmr-clog{flex:1;min-height:0;overflow-y:auto;background:#fff;padding:3px;font-size:11px}
    .gmr-cl{margin:1px 0;word-wrap:break-word}
    .gmr-cl-me b{color:#1d4fd6}.gmr-cl-bot b{color:#a01010}.gmr-cl-sys{color:#0a7a2a;font-style:italic}
    .gmr-typing{height:14px;font-size:10px;color:#555;font-style:italic;white-space:nowrap;overflow:hidden}
    .gmr-say{display:flex;gap:3px}
    .gmr-say select{flex:1;min-width:0;font:inherit}
    .gmr-say .btn{min-width:0;padding:2px 8px}
    .gmr.gmr-narrow .gmr-gbody{flex-direction:column}
    .gmr.gmr-narrow .gmr-chat{width:auto;height:118px;border-left:0;border-top:1px solid #808080}
    .gmr.gmr-narrow .gmr-lcols{flex-direction:column;align-items:stretch}
    .gmr.gmr-narrow .gmr-side{min-width:0}
    .gmr.gmr-narrow .gmr-logo span{display:none}
    .gmr.gmr-narrow .gmr-s1 .gmr-face,.gmr.gmr-narrow .gmr-s3 .gmr-face{display:none}
    .gmr.gmr-narrow .gmr-s1,.gmr.gmr-narrow .gmr-s3{font-size:10px;padding:2px 3px}
    .gmr.gmr-narrow .gmr-s1 b,.gmr.gmr-narrow .gmr-s3 b{white-space:normal;overflow-wrap:anywhere}
    .gmr-status{flex:none;padding:3px 6px;min-height:30px;background:#fff;border-top:1px solid #9aa8c8;font-size:12px;box-sizing:border-box}
    .gmr-info{flex:none;display:flex;justify-content:space-between;flex-wrap:wrap;gap:2px 10px;padding:3px 6px;background:#e4e9f4;border-bottom:1px solid #9aa8c8}
    .gmr-svgbox{flex:1;min-height:0;display:flex;align-items:center;justify-content:center;padding:4px;background:#394a6a}
    .gmr-svgbox svg{width:100%;height:100%;display:block;touch-action:manipulation;user-select:none;-webkit-user-select:none}
    .gmr-ctl{flex:none;display:flex;gap:6px;justify-content:center;padding:4px;background:#d4d0c8}
    .gmr-ctl .btn{min-width:64px;padding:5px 10px}
    .gmr-pulse:not(:disabled){font-weight:bold;animation:gmr-pl 1s steps(2) infinite}
    @keyframes gmr-pl{50%{background:#ffe97a}}
    /* dots */
    .gmr-db .gmr-svgbox{background:#e8e0c0}
    .gmr-db{display:flex;flex-direction:column;height:100%}
    .gmr-bg{display:flex;flex-direction:column;height:100%}
    .gmr-chip{display:inline-block;width:10px;height:10px;border:1px solid #000;margin-right:3px;vertical-align:-1px}
    .gmr-c0{background:#1d4fd6}.gmr-c1{background:#d6261d}
    /* spades */
    .gmr-sp{--cw:52px;display:flex;flex-direction:column;height:100%;min-height:300px;background:#1c6e3d;color:#fff}
    .gmr-sptop{flex:none;display:flex;flex-wrap:wrap;gap:2px 12px;padding:3px 6px;background:#124a28;font-size:12px}
    .gmr-sptop small{color:#b8e0c0}.gmr-spgoal{margin-left:auto;color:#ffe97a}
    .gmr-sptbl{flex:1;min-height:0;position:relative;display:grid;grid-template-columns:minmax(64px,1fr) 3fr minmax(64px,1fr);grid-template-rows:auto 1fr;grid-template-areas:"n n n" "w c e";gap:2px;padding:3px}
    .gmr-s2{grid-area:n;justify-self:center}.gmr-s1{grid-area:w;align-self:center}.gmr-s3{grid-area:e;align-self:center}
    .gmr-seat{display:flex;gap:4px;align-items:center;padding:2px 5px;background:rgba(0,0,0,.25);border:1px solid rgba(255,255,255,.25);font-size:11px;line-height:1.25;min-width:0;overflow:hidden}
    .gmr-seat b{overflow-wrap:anywhere}
    .gmr-seat small{color:#b8e0c0}
    .gmr-seat.gmr-team{border-color:#8fc4ff}
    .gmr-seat.gmr-turn{background:#ffe97a;color:#000;border-color:#fff}.gmr-seat.gmr-turn small{color:#333}
    .gmr-s0{flex:none;align-self:center;margin:2px 0}
    .gmr-spmid{grid-area:c;position:relative;min-height:calc(var(--cw)*2.6)}
    .gmr-slot{position:absolute;width:var(--cw);height:calc(var(--cw)*1.4)}
    .gmr-sl0{left:calc(50% - var(--cw)/2);bottom:0}.gmr-sl2{left:calc(50% - var(--cw)/2);top:0}
    .gmr-sl1{left:calc(50% - var(--cw)*1.75);top:calc(50% - var(--cw)*.7)}.gmr-sl3{left:calc(50% + var(--cw)*.75);top:calc(50% - var(--cw)*.7)}
    .gmr-card{position:absolute;box-sizing:border-box;width:var(--cw);height:calc(var(--cw)*1.4);background:#fff;border:1px solid #000;border-radius:4px;color:#111;box-shadow:1px 1px 0 rgba(0,0,0,.4);cursor:pointer;transition:top .12s}
    .gmr-slot .gmr-card{left:0;top:0;cursor:default;animation:gmr-pop .15s ease-out}
    @keyframes gmr-pop{from{transform:scale(.7);opacity:.3}}
    .gmr-card.gmr-red{color:#c41e1e}
    .gmr-cr{position:absolute;left:3px;top:1px;font:bold calc(var(--cw)*.3) Arial,Helvetica,sans-serif;line-height:1}
    .gmr-cs{position:absolute;left:3px;top:calc(var(--cw)*.33);width:calc(var(--cw)*.24);height:calc(var(--cw)*.24)}
    .gmr-cb{position:absolute;right:calc(var(--cw)*.1);bottom:calc(var(--cw)*.12);width:calc(var(--cw)*.46);height:calc(var(--cw)*.46)}
    .gmr-card.gmr-win{box-shadow:0 0 0 3px #ffe97a}
    .gmr-hand{flex:none;position:relative;height:calc(var(--cw)*1.4 + 14px);margin:0 4px}
    .gmr-hand .gmr-card{top:10px}
    .gmr-hand .gmr-card.gmr-can{top:4px}
    .gmr-hand .gmr-card.gmr-dim{filter:brightness(.7);cursor:not-allowed}
    .gmr-hand .gmr-card.gmr-kb{top:0;box-shadow:0 0 0 3px #ffe97a}
    .gmr-sp .gmr-status{background:#0e3a20;color:#fff;border-top-color:#2a6a40}
    .gmr-bidp{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,40,20,.35);z-index:2}
    .gmr-bidbox{color:#000;padding:8px;max-width:340px;margin:4px}
    .gmr-bidg{display:grid;grid-template-columns:repeat(7,1fr);gap:3px;margin-top:6px}
    .gmr-bidg .btn{min-width:0;padding:6px 0;min-height:30px}
    .gmr-bidg .gmr-sug{font-weight:bold;background:#ffe97a}
    /* dialogs */
    .gmr-ov,.gmr-lost{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,40,.3);z-index:5;padding:8px;box-sizing:border-box}
    .gmr-ov[hidden],.gmr-bidp[hidden]{display:none}
    .gmr-dlg{max-width:380px;width:100%;padding:3px;max-height:100%;overflow:auto;box-sizing:border-box}
    .gmr-dt{background:linear-gradient(90deg,#0a246a,#a6caf0);color:#fff;font-weight:bold;padding:2px 6px;margin-bottom:6px}
    .gmr-bidbox .gmr-dt{margin:-4px -4px 6px}
    .gmr-dc{padding:0 8px}
    .gmr-dc p,.gmr-dlg p{margin:0 0 8px}
    .gmr-dlg .gmr-dbtns{padding:4px 6px 6px}
    .gmr-lost p{padding:0 8px}
    .gmr-rh{font-size:18px;font-weight:bold}.gmr-rw{color:#0a7a2a}.gmr-rl{color:#a01010}.gmr-rd{color:#a06000}
    .gmr-sheet{border-collapse:collapse;width:100%;margin-bottom:6px;background:#fff}
    .gmr-sheet td,.gmr-sheet th{border:1px solid #9aa8c8;padding:2px 5px;text-align:center}
    .gmr-sheet td:first-child{text-align:left}
    .gmr-them{margin-top:4px}
  `;

  const ICON = '<svg viewBox="0 0 32 32" shape-rendering="crispEdges" aria-hidden="true"><rect x="1" y="3" width="30" height="22" fill="#c0c0c0" stroke="#000"/><rect x="4" y="6" width="24" height="16" fill="#0a246a"/><rect x="6" y="9" width="9" height="9" fill="#fff" stroke="#000"/><rect x="8" y="11" width="2" height="2"/><rect x="11" y="14" width="2" height="2"/><rect x="17" y="8" width="8" height="11" fill="#fff" stroke="#000"/><rect x="19" y="10" width="4" height="4" fill="#c00"/><rect x="20" y="15" width="2" height="2" fill="#c00"/><rect x="11" y="25" width="10" height="3" fill="#808080" stroke="#000"/><rect x="7" y="28" width="18" height="3" fill="#c0c0c0" stroke="#000"/><rect x="26" y="1" width="2" height="4" fill="#5f5"/><rect x="29" y="0" width="2" height="5" fill="#5f5"/></svg>';

  (window.RETRO_APPS = window.RETRO_APPS || []).push({
    id: 'gamesroom', label: 'Games Room', kind: 'builtin', eras: ['2000'], cat: 'game',
    help: 'Go online to play Backgammon, Spades or Dots and Boxes in a pretend game lobby and win money; all players here are computer characters.',
    icon: ICON, window: { w: 780, h: 580 }, css: CSS,
    open(W, api) {
      open(W, api);
      const r = W.body.querySelector('.gmr');
      const fit = () => { if (r) r.classList.toggle('gmr-narrow', W.body.clientWidth < 600); };
      fit();
      const ro = window.ResizeObserver ? new ResizeObserver(fit) : null;
      if (ro) ro.observe(W.body);
      const prevR = W.onResize; W.onResize = () => { fit(); if (prevR) prevR(); };
      const prevC = W.onClose; W.onClose = () => { if (ro) ro.disconnect(); return prevC && prevC(); };
    }
  });
})();
