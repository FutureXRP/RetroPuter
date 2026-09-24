/* Board games: Reversi (1990, 1995) and Online Checkers (2000). Both are played against a computer opponent. */
(function () {
  const APPS = (window.RETRO_APPS = window.RETRO_APPS || []);
  const D8 = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];

  /* small timer bag so everything can be cancelled on close / new game */
  function timers() {
    const set = new Set();
    return {
      later(fn, ms) { const t = setTimeout(() => { set.delete(t); fn(); }, ms); set.add(t); return t; },
      clear() { set.forEach(t => clearTimeout(t)); set.clear(); }
    };
  }

  /* ================================================================
     REVERSI
     ================================================================ */
  const RV_W = [
    100, -20, 10, 5, 5, 10, -20, 100,
    -20, -50, -2, -2, -2, -2, -50, -20,
    10, -2, 1, 1, 1, 1, -2, 10,
    5, -2, 1, 0, 0, 1, -2, 5,
    5, -2, 1, 0, 0, 1, -2, 5,
    10, -2, 1, 1, 1, 1, -2, 10,
    -20, -50, -2, -2, -2, -2, -50, -20,
    100, -20, 10, 5, 5, 10, -20, 100
  ];
  // corner -> the three squares next to it whose penalty disappears once the corner is taken
  const RV_CORNERS = [[0, [1, 8, 9]], [7, [6, 15, 14]], [56, [48, 57, 49]], [63, [55, 62, 54]]];

  function rvFlips(b, i, p) {
    if (b[i]) return null;
    const o = 3 - p, r0 = i >> 3, c0 = i & 7;
    let out = null;
    for (const [dr, dc] of D8) {
      let r = r0 + dr, c = c0 + dc, n = 0;
      while (r >= 0 && r < 8 && c >= 0 && c < 8 && b[r * 8 + c] === o) { r += dr; c += dc; n++; }
      if (n && r >= 0 && r < 8 && c >= 0 && c < 8 && b[r * 8 + c] === p) {
        out = out || [];
        for (let k = 1; k <= n; k++) out.push((r0 + dr * k) * 8 + c0 + dc * k);
      }
    }
    return out;
  }
  function rvMoves(b, p) {
    const m = [];
    for (let i = 0; i < 64; i++) if (!b[i]) { const f = rvFlips(b, i, p); if (f) m.push({ i, f }); }
    return m;
  }
  function rvApply(b, m, p) { const nb = b.slice(); nb[m.i] = p; m.f.forEach(k => { nb[k] = p; }); return nb; }
  const rvCount = (b, p) => b.reduce((n, v) => n + (v === p ? 1 : 0), 0);
  function rvEval(b, p) {
    const o = 3 - p; let s = 0;
    for (let i = 0; i < 64; i++) { if (b[i] === p) s += RV_W[i]; else if (b[i] === o) s -= RV_W[i]; }
    for (const [c, nb] of RV_CORNERS) if (b[c]) nb.forEach(k => { if (b[k] === p) s -= RV_W[k]; else if (b[k] === o) s += RV_W[k]; });
    s += 6 * (rvMoves(b, p).length - rvMoves(b, o).length);
    return s;
  }
  function rvNegamax(b, p, depth, a, beta) {
    const moves = rvMoves(b, p);
    if (!moves.length) {
      if (!rvMoves(b, 3 - p).length) return 10000 * Math.sign(rvCount(b, p) - rvCount(b, 3 - p)) + (rvCount(b, p) - rvCount(b, 3 - p));
      return -rvNegamax(b, 3 - p, depth, -beta, -a);
    }
    if (depth <= 0) return rvEval(b, p);
    moves.sort((x, y) => RV_W[y.i] - RV_W[x.i]);
    for (const m of moves) {
      const v = -rvNegamax(rvApply(b, m, p), 3 - p, depth - 1, -beta, -a);
      if (v > a) a = v;
      if (a >= beta) break;
    }
    return a;
  }
  function rvBest(b, p, level) {
    const moves = rvMoves(b, p);
    if (moves.length <= 1) return moves[0];
    if (level === 'beginner') {
      if (Math.random() < 0.35) return moves[Math.random() * moves.length | 0];
      let best = null, bs = -1e9;
      moves.forEach(m => { const s = m.f.length + (RV_W[m.i] === 100 ? 3 : 0) + Math.random() * 2; if (s > bs) { bs = s; best = m; } });
      return best;
    }
    const empty = 64 - rvCount(b, 1) - rvCount(b, 2);
    const depth = empty <= 12 ? empty : 5;
    moves.sort(() => Math.random() - 0.5); // variety between equally good moves
    moves.sort((x, y) => RV_W[y.i] - RV_W[x.i]);
    let best = moves[0], a = -1e9;
    for (const m of moves) {
      const v = -rvNegamax(rvApply(b, m, p), 3 - p, depth - 1, -1e9, -a);
      if (v > a) { a = v; best = m; }
    }
    return best;
  }

  APPS.push({
    id: 'reversi', help: 'Flip your opponent\'s pieces to your color. Win to earn money.',
    label: 'Reversi',
    kind: 'builtin',
    eras: ['1990', '1995'],
    cat: 'game',
    icon: '<svg viewBox="0 0 32 32" shape-rendering="crispEdges" aria-hidden="true"><rect x="2" y="2" width="28" height="28" fill="#008000" stroke="#000"/><path d="M9 2v28M16 2v28M23 2v28M2 9h28M2 16h28M2 23h28" stroke="#004000"/><rect x="10" y="10" width="5" height="5" fill="#fff"/><rect x="17" y="17" width="5" height="5" fill="#fff"/><rect x="17" y="10" width="5" height="5" fill="#000"/><rect x="10" y="17" width="5" height="5" fill="#000"/><rect x="17" y="3" width="5" height="5" fill="#000"/></svg>',
    window: { w: 400, h: 500 },
    css: `
      .rv{display:flex;flex-direction:column;height:100%;padding:6px;gap:6px;user-select:none;-webkit-user-select:none}
      .rv-top{display:flex;align-items:center;gap:6px;flex:none}
      .rv-sc{display:flex;align-items:center;gap:5px;background:#fff;padding:2px 8px;font:700 16px var(--ui);min-width:62px}
      .rv-sc i{width:14px;height:14px;border-radius:50%;border:1px solid #000;flex:none}
      .rv-sc.rv-on{background:#ffffc0}
      .rv-st{flex:1;text-align:center;font-weight:700;min-height:1.3em;line-height:1.2}
      .rv-bw{flex:1;min-height:0;display:grid;place-items:center;position:relative}
      .rv-board{display:grid;grid-template-columns:repeat(8,1fr);background:#000;gap:1px;padding:1px;border:3px solid;border-color:#404040 #fff #fff #404040;touch-action:manipulation}
      .rv-c{background:#008000;border:0;padding:0;display:grid;place-items:center;cursor:pointer;position:relative;min-width:0}
      .rv-e1995 .rv-c{background:#007a3a}
      .rv-c:focus{outline:none}
      .rv-c.rv-cur{outline:2px dotted #ff0;outline-offset:-3px}
      .rv-d{width:80%;height:80%;border-radius:50%;display:block;box-shadow:1px 2px 0 rgba(0,0,0,.5)}
      .rv-d.rv-1{background:radial-gradient(circle at 35% 30%,#666 0,#111 45%,#000 100%)}
      .rv-d.rv-2{background:radial-gradient(circle at 35% 30%,#fff 0,#eee 45%,#aaa 100%)}
      .rv-e1990 .rv-d.rv-1{background:#000;box-shadow:inset -2px -2px 0 #555}
      .rv-e1990 .rv-d.rv-2{background:#fff;box-shadow:inset -2px -2px 0 #aaa}
      .rv-d.rv-new{animation:rvpop .25s ease-out}
      .rv-d.rv-flip{animation:rvflip .35s ease-in-out}
      @keyframes rvpop{0%{transform:scale(.2)}70%{transform:scale(1.1)}100%{transform:scale(1)}}
      @keyframes rvflip{0%{transform:scaleX(1)}50%{transform:scaleX(.05)}100%{transform:scaleX(1)}}
      .rv-hint{width:22%;height:22%;border-radius:50%;background:rgba(255,255,160,.75);display:block}
      .rv-c.rv-last::after{content:"";position:absolute;width:12%;height:12%;background:#f00;border-radius:50%;left:44%;top:44%}
      .rv-ban{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);background:#ffffc0;border:2px solid #000;padding:8px 14px;font-weight:700;box-shadow:3px 3px 0 rgba(0,0,0,.5);pointer-events:none;text-align:center;max-width:90%}
      .rv-bot{display:flex;flex-wrap:wrap;align-items:center;gap:6px;flex:none;justify-content:center}
      .rv-bot .btn{min-width:0;padding:3px 10px}
      .rv-bot label{display:flex;align-items:center;gap:3px}
      .rv-bot select{font:inherit}
    `,
    open(W, api) {
      const T = timers();
      const H = 1, C = 2; // human = black, computer = white
      let b, turn, over, hist, busy = false, last = -1, earned = false, cur = 27, kbd = false, gen = 0;
      let level = api.load('level', 'beginner'), hints = api.load('hints', true);
      let stats = api.load('stats', { w: 0, l: 0, d: 0 });

      W.body.innerHTML = `<div class="rv rv-e${api.era.id}">
        <div class="rv-top"><span class="rv-sc sunken" data-s1><i style="background:#000"></i><span>2</span></span><span class="rv-st" role="status"></span><span class="rv-sc sunken" data-s2><i style="background:#fff"></i><span>2</span></span></div>
        <div class="rv-bw"><div class="rv-board" role="grid" aria-label="Reversi board"></div></div>
        <div class="rv-bot"><button class="btn" data-undo>Undo</button><button class="btn" data-new>New game</button><label><input type="checkbox" data-hints> Hints</label><label>Level <select data-level><option value="beginner">Beginner</option><option value="expert">Expert</option></select></label></div>
      </div>`;
      const $ = s => W.body.querySelector(s);
      const board = $('.rv-board'), bw = $('.rv-bw'), st = $('.rv-st'), s1 = $('[data-s1]'), s2 = $('[data-s2]');
      const undoB = $('[data-undo]'), hintsC = $('[data-hints]'), levelS = $('[data-level]');
      const cells = [];
      for (let i = 0; i < 64; i++) {
        const c = document.createElement('button');
        c.className = 'rv-c'; c.dataset.i = i; c.setAttribute('role', 'gridcell'); c.tabIndex = -1;
        board.appendChild(c); cells.push(c);
      }
      hintsC.checked = hints; levelS.value = level;

      function fit() {
        const r = bw.getBoundingClientRect();
        const s = Math.max(160, Math.floor(Math.min(r.width, r.height) - 4));
        board.style.width = board.style.height = s + 'px';
      }
      function save() { api.save('game', over ? null : { b, turn, hist: hist.slice(-40), last }); }
      function banner(text, ms = 1500) {
        const d = document.createElement('div'); d.className = 'rv-ban'; d.textContent = text; bw.appendChild(d);
        T.later(() => d.remove(), ms);
      }
      function newGame() {
        T.clear(); gen++;
        b = new Array(64).fill(0); b[27] = b[36] = C; b[28] = b[35] = H;
        turn = H; over = false; hist = []; busy = false; last = -1; earned = false;
        bw.querySelectorAll('.rv-ban').forEach(x => x.remove());
        render(); save();
      }
      function render(placed = -1, flipped = []) {
        const legal = !over && turn === H && !busy ? rvMoves(b, H) : [];
        const legalSet = new Set(legal.map(m => m.i));
        for (let i = 0; i < 64; i++) {
          const c = cells[i], v = b[i];
          let html = '';
          if (v) html = `<i class="rv-d rv-${v}${i === placed ? ' rv-new' : flipped.includes(i) ? ' rv-flip' : ''}"></i>`;
          else if (hints && legalSet.has(i)) html = '<i class="rv-hint"></i>';
          c.innerHTML = html;
          c.classList.toggle('rv-last', i === last && !!v);
          c.classList.toggle('rv-cur', kbd && i === cur);
          const col = 'ABCDEFGH'[i & 7] + (8 - (i >> 3));
          c.setAttribute('aria-label', col + ': ' + (v === H ? 'black' : v === C ? 'white' : legalSet.has(i) ? 'empty, legal move' : 'empty'));
        }
        const n1 = rvCount(b, H), n2 = rvCount(b, C);
        s1.lastElementChild.textContent = n1; s2.lastElementChild.textContent = n2;
        s1.classList.toggle('rv-on', !over && turn === H); s2.classList.toggle('rv-on', !over && turn === C);
        if (over) st.textContent = n1 > n2 ? 'You win!' : n1 < n2 ? 'Computer wins' : 'Draw game';
        else st.textContent = turn === H ? 'Your move (black)' : 'Computer is thinking...';
        undoB.disabled = !hist.length || busy;
      }
      function place(m, p) {
        b = rvApply(b, m, p); last = m.i;
        api.sfx.blip(p === H ? 520 : 390);
        render(m.i, m.f);
        m.f.forEach((k, j) => T.later(() => api.tone(700 + j * 40, 0.03, { type: 'triangle', vol: 0.04 }), 80 + j * 25));
      }
      function human(i) {
        if (over || turn !== H || busy) return;
        const m = rvMoves(b, H).find(x => x.i === i);
        if (!m) { api.sfx.beep(); return; }
        hist.push({ b: b.slice(), last });
        place(m, H);
        advance();
      }
      function advance() {
        const next = 3 - turn;
        if (rvMoves(b, next).length) turn = next;
        else if (rvMoves(b, turn).length) {
          banner(next === H ? 'You have no legal moves. You must pass.' : 'The computer has no legal moves and passes.', 1700);
          api.sfx.beep();
        } else { end(); return; }
        save(); render();
        if (turn === C) think(next === H ? 1400 : 450);
      }
      function think(delay) {
        busy = true; render();
        const g = gen;
        T.later(() => {
          if (g !== gen || over) return;
          const m = rvBest(b, C, level);
          busy = false;
          if (m) place(m, C);
          advance();
        }, delay + Math.random() * 250);
      }
      function end() {
        over = true; busy = false; save(); render();
        const n1 = rvCount(b, H), n2 = rvCount(b, C);
        let text;
        if (n1 > n2) {
          api.sfx.tada(); stats.w++; text = `You win, ${n1} to ${n2}!`;
          if (!earned) { earned = true; api.earn(3, 'winning at Reversi'); }
        } else if (n1 < n2) { api.sfx.crash(); stats.l++; text = `The computer wins, ${n2} to ${n1}.`; }
        else { api.sfx.ding(); stats.d++; text = `It's a draw, ${n1} to ${n2}.`; }
        api.save('stats', stats);
        T.later(() => api.msgBox('Reversi', `${text}\n\nLevel: ${level === 'expert' ? 'Expert' : 'Beginner'}\nWins ${stats.w}   Losses ${stats.l}   Draws ${stats.d}`, ['Play again', 'OK']).then(r => { if (r === 'Play again') newGame(); }), 700);
      }
      function undo() {
        if (!hist.length || busy) return;
        T.clear(); gen++;
        const h = hist.pop(); b = h.b; last = h.last; turn = H; over = false; busy = false;
        bw.querySelectorAll('.rv-ban').forEach(x => x.remove());
        api.sfx.click(); save(); render();
      }
      function setLevel(v) { level = v; levelS.value = v; api.save('level', v); }
      function setHints(v) { hints = v; hintsC.checked = v; api.save('hints', v); render(); }
      const howTo = () => api.msgBox('How to play Reversi', 'You are Black and move first. The computer plays White.\n\nPlace a disc so that it traps one or more of the computer\'s discs in a straight line (across, down or diagonally) between your new disc and another of yours. All the trapped discs flip to your color.\n\nIf you can\'t make a legal move you must pass. The game ends when neither side can move. Whoever has more discs wins.\n\nTips: corners can never be flipped back, so they are very valuable. Avoid the squares right next to an empty corner.\n\nMouse or touch: click a square. Keyboard: arrow keys and Enter. U = undo, H = hints.\n\nWin a game to earn $3.');

      api.menubar([
        { label: 'Game', items: () => [{ label: 'New game', fn: newGame }, { label: 'Undo move', fn: undo, disabled: !hist.length || busy }, '-', { label: 'Statistics', fn: () => api.msgBox('Reversi statistics', `Wins: ${stats.w}\nLosses: ${stats.l}\nDraws: ${stats.d}`) }, { label: 'How to play', fn: howTo }, '-', { label: 'Exit', fn: () => api.close() }] },
        { label: 'Options', items: () => [{ label: (level === 'beginner' ? '* ' : '   ') + 'Beginner', fn: () => setLevel('beginner') }, { label: (level === 'expert' ? '* ' : '   ') + 'Expert', fn: () => setLevel('expert') }, '-', { label: (hints ? '* ' : '   ') + 'Show legal moves', fn: () => setHints(!hints) }] }
      ]);

      board.addEventListener('click', e => { const c = e.target.closest('.rv-c'); if (!c) return; kbd = false; cur = +c.dataset.i; human(cur); });
      undoB.onclick = undo;
      $('[data-new]').onclick = () => { if (!over && hist.length) api.msgBox('Reversi', 'Start a new game? The current game will be lost.', ['Yes', 'No'], 'warn').then(r => { if (r === 'Yes') newGame(); }); else newGame(); };
      hintsC.onchange = () => setHints(hintsC.checked);
      levelS.onchange = () => setLevel(levelS.value);
      W.onKey = e => {
        const mv = { ArrowUp: -8, ArrowDown: 8, ArrowLeft: -1, ArrowRight: 1 }[e.key];
        if (mv) {
          e.preventDefault(); kbd = true;
          const r = (cur >> 3) + (mv === 8 ? 1 : mv === -8 ? -1 : 0), c = (cur & 7) + (mv === 1 ? 1 : mv === -1 ? -1 : 0);
          if (r >= 0 && r < 8 && c >= 0 && c < 8) cur = r * 8 + c;
          render();
        } else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); kbd = true; human(cur); }
        else if (e.key === 'u' || e.key === 'U' || ((e.ctrlKey || e.metaKey) && e.key === 'z')) { e.preventDefault(); undo(); }
        else if (e.key === 'h' || e.key === 'H') setHints(!hints);
        else if (e.key === 'F2') { e.preventDefault(); newGame(); }
      };
      W.onResize = fit;
      const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
      if (ro) ro.observe(bw);
      W.onClose = () => { T.clear(); gen++; if (ro) ro.disconnect(); };

      const saved = api.load('game', null);
      if (saved && Array.isArray(saved.b) && saved.b.length === 64) {
        b = saved.b; turn = saved.turn === C ? C : H; hist = saved.hist || []; last = saved.last ?? -1; over = false;
        render();
        if (!rvMoves(b, H).length && !rvMoves(b, C).length) end();
        else if (turn === C) think(500);
        else if (!rvMoves(b, H).length) { turn = C; think(1200); banner('You have no legal moves. You must pass.'); }
      } else newGame();
      requestAnimationFrame(fit);
    }
  });

  /* ================================================================
     ONLINE CHECKERS (American rules, computer opponent)
     ================================================================ */
  // pieces: 1 black man (you), 2 black king, 3 red man (opponent), 4 red king
  const ckSide = p => p === 0 ? 0 : p <= 2 ? 1 : 2;
  const ckKing = p => p === 2 || p === 4;
  const ckDirs = p => ckKing(p) ? [[-1, -1], [-1, 1], [1, -1], [1, 1]] : ckSide(p) === 1 ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]];
  function ckJumps(b, from, at, p, path, caps, out) {
    let any = false; const r = at >> 3, c = at & 7, foe = 3 - ckSide(p);
    for (const [dr, dc] of ckDirs(p)) {
      const lr = r + 2 * dr, lc = c + 2 * dc;
      if (lr < 0 || lr > 7 || lc < 0 || lc > 7) continue;
      const mid = (r + dr) * 8 + c + dc, land = lr * 8 + lc;
      if (ckSide(b[mid]) !== foe || caps.includes(mid) || (b[land] !== 0 && land !== from)) continue;
      any = true;
      const np = path.concat(land), nc = caps.concat(mid);
      if (!ckKing(p) && lr === (ckSide(p) === 1 ? 0 : 7)) out.push({ from, path: np, caps: nc }); // crowning ends the move
      else ckJumps(b, from, land, p, np, nc, out);
    }
    if (!any && path.length) out.push({ from, path, caps });
  }
  function ckMoves(b, s) {
    const caps = [], steps = [];
    for (let i = 0; i < 64; i++) {
      const p = b[i]; if (ckSide(p) !== s) continue;
      ckJumps(b, i, i, p, [], [], caps);
      if (caps.length) continue;
      const r = i >> 3, c = i & 7;
      for (const [dr, dc] of ckDirs(p)) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && !b[nr * 8 + nc]) steps.push({ from: i, path: [nr * 8 + nc], caps: [] });
      }
    }
    return caps.length ? caps : steps;
  }
  function ckApply(b, m) {
    const nb = b.slice(); let p = nb[m.from]; nb[m.from] = 0;
    m.caps.forEach(x => { nb[x] = 0; });
    const to = m.path[m.path.length - 1], r = to >> 3;
    if (p === 1 && r === 0) p = 2; if (p === 3 && r === 7) p = 4;
    nb[to] = p; return nb;
  }
  function ckEval(b, s) {
    let sc = 0;
    for (let i = 0; i < 64; i++) {
      const p = b[i]; if (!p) continue;
      const r = i >> 3, c = i & 7;
      let v = ckKing(p) ? 170 : 100;
      if (!ckKing(p)) {
        const adv = ckSide(p) === 1 ? 7 - r : r;
        v += adv * 4;
        if (adv === 0) v += 10; // back row guard
      } else v += (r >= 2 && r <= 5 && c >= 2 && c <= 5) ? 8 : 0;
      if (r >= 3 && r <= 4 && c >= 2 && c <= 5) v += 5;
      sc += ckSide(p) === s ? v : -v;
    }
    return sc;
  }
  function ckSearch(b, s, depth, a, beta, ply, ext) {
    const moves = ckMoves(b, s);
    if (!moves.length) return -100000 + ply;
    const forcing = moves[0].caps.length > 0;
    if (depth <= 0 && (!forcing || ext <= 0)) return ckEval(b, s);
    if (depth <= 0) ext--;
    moves.sort((x, y) => y.caps.length - x.caps.length);
    for (const m of moves) {
      const v = -ckSearch(ckApply(b, m), 3 - s, depth - 1, -beta, -a, ply + 1, ext);
      if (v > a) a = v;
      if (a >= beta) break;
    }
    return a;
  }
  function ckBest(b, s, level) {
    const moves = ckMoves(b, s);
    if (moves.length <= 1) return moves[0];
    const casual = level === 'casual';
    if (casual && Math.random() < 0.2) return moves[Math.random() * moves.length | 0];
    const depth = casual ? 2 : (b.filter(Boolean).length <= 8 ? 9 : 7);
    let best = moves[0], a = -1e9;
    moves.sort(() => Math.random() - 0.5);
    for (const m of moves) {
      const v = casual ? -ckSearch(ckApply(b, m), 3 - s, depth - 1, -1e9, 1e9, 1, 4) + Math.random() * 40
        : -ckSearch(ckApply(b, m), 3 - s, depth - 1, -1e9, -a, 1, 4);
      if (v > a) { a = v; best = m; }
    }
    return best;
  }
  const CK_NAMES = ['JumpStreet77', 'KingMe_2000', 'DiagonalDude', 'CheckerChomp', 'RedRocket88', 'SlyFox_42', 'BoardWalker9', 'DoubleHop99', 'CrownChaser', 'MoveMaster64', 'PorchSwing_Al', 'CornerPiece', 'MapleLeaf_Kid', 'TripleJumpTim', 'QuietRiver', 'CoolBeans_01', 'SkyHopper', 'PieceKeeper'];
  const CK_STATES = ['Ohio', 'Texas', 'Oregon', 'Maine', 'Iowa', 'Florida', 'Nevada', 'Kansas', 'Vermont', 'Georgia', 'Arizona', 'Montana', 'Utah', 'Idaho', 'Alabama', 'Michigan', 'Colorado', 'Nebraska'];
  const CK_SAY = ['Hi!', 'Good move', 'Nice try', 'Oops', 'Thinking...', 'Good game'];
  const CK_REPLY = {
    'Hi!': ['hi there', 'hey! good luck', 'hello :)', 'hi, have fun'],
    'Good move': ['thx', 'thanks :)', 'lucky i guess', 'ty'],
    'Nice try': ['heh', 'almost had it', 'lol thx'],
    'Oops': ['no worries', 'happens to me all the time', 'hehe'],
    'Thinking...': ['take your time', 'np', 'ok'],
    'Good game': ['gg', 'gg! that was fun', 'good game :)']
  };
  const CROWN = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 12 L3 5 L6 8 L8 3 L10 8 L13 5 L14 12 Z" fill="#ffd700" stroke="#000" stroke-width="1"/></svg>';

  APPS.push({
    id: 'checkers', help: 'Play checkers against a computer opponent. Win to earn money.',
    label: 'Online Checkers',
    kind: 'builtin',
    eras: ['2000'],
    cat: 'game',
    icon: '<svg viewBox="0 0 32 32" shape-rendering="crispEdges" aria-hidden="true"><rect x="2" y="4" width="28" height="24" fill="#e8d8a8" stroke="#000"/><g fill="#3a7a3a"><rect x="3" y="5" width="7" height="6"/><rect x="17" y="5" width="7" height="6"/><rect x="10" y="11" width="7" height="6"/><rect x="24" y="11" width="5" height="6"/><rect x="3" y="17" width="7" height="6"/><rect x="17" y="17" width="7" height="6"/><rect x="10" y="23" width="7" height="4"/><rect x="24" y="23" width="5" height="4"/></g><rect x="4" y="6" width="5" height="4" fill="#c00"/><rect x="18" y="6" width="5" height="4" fill="#c00"/><rect x="11" y="18" width="5" height="4" fill="#222"/><rect x="18" y="18" width="5" height="4" fill="#222"/><circle cx="26" cy="7" r="4" fill="#1084d0" stroke="#000"/><path d="M24 7h4M26 5v4" stroke="#fff"/></svg>',
    window: { w: 640, h: 520 },
    css: `
      .ck-game[hidden],.ck-lobby[hidden]{display:none!important}
      .ck{height:100%;display:flex;flex-direction:column;user-select:none;-webkit-user-select:none;background:#d4d0c8}
      .ck-head{flex:none;background:linear-gradient(90deg,#0a246a,#3a6ea5);color:#fff;padding:3px 8px;font-weight:700;display:flex;gap:8px;align-items:center}
      .ck-head small{font-weight:400;opacity:.85;margin-left:auto}
      .ck-lobby{flex:1;display:grid;place-items:center;padding:10px}
      .ck-lob{background:#fff;padding:14px 16px;max-width:360px;width:100%;text-align:center}
      .ck-lob h3{margin:0 0 8px;font-size:14px;color:#0a246a}
      .ck-lob p{margin:6px 0}
      .ck-prog{height:14px;border:1px solid #808080;background:#fff;margin:10px 0;overflow:hidden;display:flex;gap:2px;padding:1px}
      .ck-prog i{width:10px;background:#0a246a;flex:none}
      .ck-found{font-size:15px;font-weight:700;color:#006000}
      .ck-lob .btn{margin:4px}
      .ck-game{flex:1;min-height:0;display:flex;flex-direction:column;gap:6px;padding:6px}
      .ck-wide .ck-game{flex-direction:row}
      .ck-main{flex:1;min-width:0;min-height:0;display:flex;flex-direction:column;gap:4px}
      .ck-bar{flex:none;display:flex;align-items:center;gap:6px;background:#fff;padding:2px 6px;min-height:24px}
      .ck-bar b{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .ck-bar .ck-dot{width:12px;height:12px;border-radius:50%;border:1px solid #000;flex:none}
      .ck-bar .ck-cap{margin-left:auto;white-space:nowrap;font-size:11px;color:#444}
      .ck-bar.ck-on{background:#ffffd0}
      .ck-st{flex:none;text-align:center;font-weight:700;min-height:1.3em}
      .ck-bw{flex:1;min-height:0;display:grid;place-items:center}
      .ck-board{display:grid;grid-template-columns:repeat(8,1fr);grid-template-rows:repeat(8,1fr);border:4px solid #5a3a1a;box-shadow:0 0 0 1px #000;touch-action:manipulation}
      .ck-sq{border:0;padding:0;display:grid;place-items:center;position:relative;min-width:0;min-height:0}
      .ck-sq.ck-l{background:#e8d8a8}
      .ck-sq.ck-d{background:#3a7a3a;cursor:pointer}
      .ck-sq.ck-last{background:#5a9a4a}
      .ck-sq.ck-cur{outline:2px dotted #ff0;outline-offset:-3px}
      .ck-sq:focus{outline:none}
      .ck-p{width:78%;height:78%;border-radius:50%;display:grid;place-items:center;box-shadow:1px 3px 0 rgba(0,0,0,.55);position:relative}
      .ck-p.ck-b{background:radial-gradient(circle at 50% 45%,#444 0,#222 55%,#111 58%,#333 70%,#000 100%);border:2px solid #555}
      .ck-p.ck-r{background:radial-gradient(circle at 50% 45%,#e33 0,#b00 55%,#900 58%,#d22 70%,#700 100%);border:2px solid #f66}
      .ck-p svg{width:60%;height:60%}
      .ck-p.ck-sel{box-shadow:0 0 0 3px #ff0,1px 3px 0 rgba(0,0,0,.55)}
      .ck-p.ck-must{box-shadow:0 0 0 2px #fff,1px 3px 0 rgba(0,0,0,.55)}
      .ck-p.ck-ghost{opacity:.35}
      .ck-p.ck-in{animation:ckin .22s ease-out}
      @keyframes ckin{0%{transform:scale(1.25)}100%{transform:scale(1)}}
      .ck-dst{width:30%;height:30%;border-radius:50%;background:rgba(255,255,120,.8);border:1px solid #000}
      .ck-side{flex:none;display:flex;flex-direction:column;gap:4px;height:118px}
      .ck-wide .ck-side{width:200px;height:auto}
      .ck-log{flex:1;min-height:0;overflow-y:auto;background:#fff;padding:3px 5px;font-size:11px;line-height:1.35}
      .ck-log div{word-wrap:break-word}
      .ck-log .ck-me{color:#00007f}
      .ck-log .ck-them{color:#7f0000}
      .ck-log .ck-sys{color:#606060;font-style:italic}
      .ck-say{flex:none;display:flex;flex-wrap:wrap;gap:3px}
      .ck-say .btn{min-width:0;padding:2px 6px;font-size:11px;flex:1 1 auto}
    `,
    open(W, api) {
      const T = timers();
      const ME = 1, OPP = 2;
      let b, turn, over, quiet, sel = -1, partial = [], legal = [], last = [], busy = false, gen = 0, cur = 45, kbd = false, earned = false;
      let opp = null, level = api.load('level', 'casual'), stats = api.load('stats', { w: 0, l: 0, d: 0 }), lastChat = 0;

      W.body.innerHTML = `<div class="ck"><div class="ck-head">Horizon Game Zone <span style="font-weight:400">- Checkers Room</span><small data-net></small></div><div class="ck-lobby"></div><div class="ck-game" hidden>
        <div class="ck-main">
          <div class="ck-bar sunken" data-ob><i class="ck-dot" style="background:#c00"></i><b data-on></b><span class="ck-cap" data-oc></span></div>
          <div class="ck-bw"><div class="ck-board" role="grid" aria-label="Checkers board"></div></div>
          <div class="ck-bar sunken" data-mb><i class="ck-dot" style="background:#222"></i><b data-mn></b><span class="ck-cap" data-mc></span></div>
          <div class="ck-st" role="status"></div>
        </div>
        <div class="ck-side"><div class="ck-log sunken" aria-live="polite"></div><div class="ck-say">${CK_SAY.map(s => `<button class="btn" data-say="${s}">${s}</button>`).join('')}</div></div>
      </div></div>`;
      const $ = s => W.body.querySelector(s);
      const root = $('.ck'), lobby = $('.ck-lobby'), game = $('.ck-game'), boardEl = $('.ck-board'), bw = $('.ck-bw'), st = $('.ck-st'), log = $('.ck-log');
      $('[data-net]').textContent = api.online() ? 'Connected' : 'Local play';
      const sqs = [];
      for (let i = 0; i < 64; i++) {
        const d = document.createElement('button');
        const dark = ((i >> 3) + (i & 7)) % 2 === 1;
        d.className = 'ck-sq ' + (dark ? 'ck-d' : 'ck-l'); d.dataset.i = i; d.tabIndex = -1;
        if (!dark) d.disabled = true;
        boardEl.appendChild(d); sqs.push(d);
      }

      function fit() {
        root.classList.toggle('ck-wide', W.body.clientWidth >= 560);
        const r = bw.getBoundingClientRect();
        const s = Math.max(160, Math.floor(Math.min(r.width, r.height) - 2));
        boardEl.style.width = boardEl.style.height = s + 'px';
      }
      function chat(who, text) {
        const d = document.createElement('div');
        if (who === 'sys') { d.className = 'ck-sys'; d.textContent = '*** ' + text; }
        else { d.className = who === 'me' ? 'ck-me' : 'ck-them'; d.innerHTML = `<b>${api.esc(who === 'me' ? api.user : opp.name)}:</b> ${api.esc(text)}`; }
        log.appendChild(d);
        while (log.children.length > 60) log.firstChild.remove();
        log.scrollTop = log.scrollHeight;
      }
      function oppSays(text, delay = 900) {
        const g = gen;
        T.later(() => { if (g === gen && opp) { chat('them', text); api.sfx.msg(); } }, delay + Math.random() * 700);
      }
      function maybeBanter(lines, chance) {
        const now = Date.now();
        if (now - lastChat < 12000 || Math.random() > chance) return;
        lastChat = now; oppSays(api.pick(lines), 600);
      }
      function save() { api.save('game', over || !opp ? null : { b, turn, quiet, opp, last }); }

      /* ---- lobby / matchmaking ---- */
      function findOpponent() {
        T.clear(); gen++; opp = null;
        game.hidden = true; lobby.hidden = false;
        const g = gen;
        lobby.innerHTML = `<div class="ck-lob raised"><h3>Checkers - ${level === 'casual' ? 'Casual' : 'Advanced'} Room</h3><p data-msg>Searching for an opponent on the Game Zone...</p><div class="ck-prog sunken"></div><p style="font-size:11px;color:#555" data-cnt></p><button class="btn" data-cancel>Cancel</button></div>`;
        const prog = lobby.querySelector('.ck-prog'), cnt = lobby.querySelector('[data-cnt]');
        cnt.textContent = `${(900 + Math.random() * 600 | 0).toLocaleString()} players in ${40 + (Math.random() * 30 | 0)} rooms`;
        lobby.querySelector('[data-cancel]').onclick = () => { gen++; T.clear(); lobbyIdle(); };
        let n = 0;
        const tick = () => {
          if (g !== gen) return;
          n++; prog.innerHTML = '<i></i>'.repeat(n % 24);
          if (n % 3 === 0) api.sfx.blip(300 + (n % 9) * 30);
          if (n < 18 + (Math.random() * 10 | 0)) { T.later(tick, 120); return; }
          const rating = level === 'casual' ? 1100 + (Math.random() * 250 | 0) : 1600 + (Math.random() * 250 | 0);
          opp = { name: api.pick(CK_NAMES), st: api.pick(CK_STATES), rating };
          prog.innerHTML = '<i></i>'.repeat(30);
          lobby.querySelector('[data-msg]').innerHTML = `<span class="ck-found">Found: ${api.esc(opp.name)} (${api.esc(opp.st)})</span><br>Rating ${rating}`;
          api.sfx.ding();
          lobby.querySelector('[data-cancel]').remove();
          T.later(() => { if (g === gen) startGame(true); }, 1400);
        };
        T.later(tick, 200);
      }
      function lobbyIdle() {
        game.hidden = true; lobby.hidden = false; opp = null;
        lobby.innerHTML = `<div class="ck-lob raised"><h3>Welcome to the Checkers Room</h3><p>Play American checkers against another player.</p><p style="font-size:11px">Opponent skill: <b>${level === 'casual' ? 'Casual' : 'Advanced'}</b> (change it in Options)</p><p style="font-size:11px">Record: ${stats.w} wins, ${stats.l} losses, ${stats.d} draws</p><button class="btn" data-go>Find opponent</button></div>`;
        lobby.querySelector('[data-go]').onclick = findOpponent;
      }

      /* ---- game ---- */
      function startGame(fresh) {
        T.clear(); gen++;
        lobby.hidden = true; game.hidden = false;
        if (fresh) {
          b = new Array(64).fill(0);
          for (let i = 0; i < 64; i++) if (((i >> 3) + (i & 7)) % 2 === 1) { if (i < 24) b[i] = 3; else if (i >= 40) b[i] = 1; }
          turn = ME; quiet = 0; last = [];
          log.innerHTML = '';
          chat('sys', `${opp.name} (${opp.st}) has joined the table.`);
          chat('sys', 'You play Black and move first.');
          oppSays(api.pick(['hi! good luck', 'hello from ' + opp.st + '!', 'hey, ready?', 'hi :)']), 1200);
        } else {
          log.innerHTML = '';
          chat('sys', `Rejoined your table with ${opp.name} (${opp.st}).`);
        }
        over = false; busy = false; sel = -1; partial = []; earned = false;
        $('[data-on]').textContent = `${opp.name} (${opp.st}) - ${opp.rating}`;
        $('[data-mn]').textContent = `${api.user} (you)`;
        api.setTitle('Online Checkers - vs ' + opp.name);
        fit(); refresh(); save();
        if (turn === OPP) oppTurn();
      }
      function counts() { let m = 0, o = 0; b.forEach(p => { if (ckSide(p) === ME) m++; else if (ckSide(p) === OPP) o++; }); return [m, o]; }
      function refresh() {
        legal = !over && turn === ME && !busy ? ckMoves(b, ME) : [];
        render();
      }
      function render(anim = -1) {
        const cands = sel >= 0 ? legal.filter(m => m.from === sel && partial.every((x, k) => m.path[k] === x)) : [];
        const dsts = new Set(cands.map(m => m.path[partial.length]).filter(x => x !== undefined));
        const ghosts = new Set(); if (sel >= 0 && partial.length) cands[0].caps.slice(0, partial.length).forEach(x => ghosts.add(x));
        const pos = sel >= 0 && partial.length ? partial[partial.length - 1] : sel;
        const forced = legal.length && legal[0].caps.length ? new Set(legal.map(m => m.from)) : null;
        for (let i = 0; i < 64; i++) {
          const q = sqs[i]; if (q.disabled) continue;
          let p = b[i];
          if (sel >= 0 && partial.length) { if (i === sel) p = 0; if (i === pos) p = b[sel]; }
          let h = '';
          if (p) {
            const cls = ['ck-p', ckSide(p) === ME ? 'ck-b' : 'ck-r'];
            if (i === pos && sel >= 0) cls.push('ck-sel');
            else if (forced && forced.has(i) && sel < 0) cls.push('ck-must');
            if (ghosts.has(i)) cls.push('ck-ghost');
            if (i === anim) cls.push('ck-in');
            h = `<i class="${cls.join(' ')}">${ckKing(p) ? CROWN : ''}</i>`;
          } else if (dsts.has(i)) h = '<i class="ck-dst"></i>';
          q.innerHTML = h;
          q.classList.toggle('ck-last', last.includes(i));
          q.classList.toggle('ck-cur', kbd && i === cur);
          q.setAttribute('aria-label', 'ABCDEFGH'[i & 7] + (8 - (i >> 3)) + ': ' + (!p ? (dsts.has(i) ? 'empty, you can move here' : 'empty') : (ckSide(p) === ME ? 'your ' : 'opponent ') + (ckKing(p) ? 'king' : 'piece')));
        }
        const [m, o] = counts();
        $('[data-mc]').textContent = `${m} pieces`; $('[data-oc]').textContent = `${o} pieces`;
        $('[data-mb]').classList.toggle('ck-on', !over && turn === ME);
        $('[data-ob]').classList.toggle('ck-on', !over && turn === OPP);
        if (!over) st.textContent = turn === OPP ? `${opp.name} is thinking...` : partial.length ? 'Keep jumping!' : legal.length && legal[0].caps.length ? 'You must jump!' : 'Your move';
      }
      function tap(i) {
        if (over || turn !== ME || busy) return;
        const own = ckSide(b[i]) === ME && legal.some(m => m.from === i);
        if (!partial.length && own) { sel = i; api.sfx.click(); render(); return; }
        if (sel < 0) { if (ckSide(b[i]) === ME) { api.sfx.beep(); if (legal[0] && legal[0].caps.length) flash('You must take a jump when one is available.'); } return; }
        const cands = legal.filter(m => m.from === sel && partial.every((x, k) => m.path[k] === x) && m.path[partial.length] === i);
        if (!cands.length) {
          if (!partial.length) { sel = -1; render(); }
          else api.sfx.beep();
          return;
        }
        partial.push(i);
        const done = cands.find(m => m.path.length === partial.length);
        if (done) { const m = done; sel = -1; partial = []; play(m, ME); }
        else { api.sfx.blip(600); render(i); }
      }
      function flash(t) { st.textContent = t; }
      function play(m, who) {
        const was = b[m.from];
        const progress = m.caps.length > 0 || !ckKing(was);
        b = ckApply(b, m);
        last = [m.from, ...m.path];
        quiet = progress ? 0 : quiet + 1;
        const to = m.path[m.path.length - 1];
        if (m.caps.length) { api.tone(220, 0.08, { type: 'square', vol: 0.06 }); m.caps.forEach((x, k) => api.tone(330 + k * 110, 0.07, { at: 0.06 + k * 0.08, type: 'triangle', vol: 0.07 })); }
        else api.noise(0.05, { ft: 'lowpass', f: 700, vol: 0.35, decay: 1 });
        const crowned = !ckKing(was) && ckKing(b[to]);
        if (crowned) T.later(() => { api.sfx.ding(); if (who === OPP) maybeBanter(['king me!', 'got a king :)', 'crowned!'], 0.8); else maybeBanter(['nice, a king', 'uh oh, a king'], 0.5); }, 150);
        if (who === OPP && m.caps.length >= 2) maybeBanter(['ha, double jump!', 'saw that coming?', ':)'], 0.9);
        if (who === ME && m.caps.length >= 2) maybeBanter(['wow nice jump', 'ouch', 'didnt see that'], 0.9);
        turn = 3 - who; busy = false;
        refresh(); render(to);
        if (checkEnd()) return;
        save();
        if (turn === OPP) oppTurn();
      }
      function oppTurn() {
        busy = true; refresh();
        const g = gen;
        T.later(() => {
          if (g !== gen || over) return;
          const m = ckBest(b, OPP, level);
          if (!m) { busy = false; checkEnd(); return; }
          // animate hop by hop
          const hops = m.path.slice();
          let k = 0;
          const hop = () => {
            if (g !== gen) return;
            if (k < hops.length - 1) {
              sel = m.from; partial = hops.slice(0, k + 1);
              const cands = [m]; legal = cands; render(partial[partial.length - 1]); legal = [];
              api.tone(330 + k * 110, 0.06, { type: 'triangle', vol: 0.06 });
              k++; T.later(hop, 330); return;
            }
            sel = -1; partial = [];
            play(m, OPP);
          };
          hop();
        }, (level === 'casual' ? 700 : 900) + Math.random() * 900);
      }
      function checkEnd() {
        const mine = ckMoves(b, ME).length, theirs = ckMoves(b, OPP).length;
        let res = null;
        if (turn === ME && !mine) res = 'l';
        else if (turn === OPP && !theirs) res = 'w';
        else if (quiet >= 80) res = 'd';
        if (!res) return false;
        finish(res);
        return true;
      }
      function finish(res, resigned) {
        over = true; busy = false; sel = -1; partial = []; T.clear(); gen++;
        api.save('game', null);
        stats[res]++; api.save('stats', stats);
        render();
        let text;
        if (res === 'w') {
          text = 'You win!'; api.sfx.tada();
          if (!earned) { earned = true; api.earn(4, 'winning at Checkers'); }
          chat('sys', `${api.user} wins the game.`);
          oppSays(api.pick(['gg, you got me', 'good game! well played', 'gg. rematch?']), 700);
        } else if (res === 'l') {
          text = resigned ? 'You resigned.' : `${opp.name} wins.`; api.sfx.crash();
          chat('sys', `${opp.name} wins the game.`);
          oppSays(api.pick(['gg!', 'good game :)', 'gg, close one']), 700);
        } else {
          text = 'Draw: 40 moves each with no capture and no man moved.'; api.sfx.ding();
          chat('sys', 'The game is a draw.'); oppSays('gg, a draw', 700);
        }
        st.textContent = text;
        const g = gen;
        T.later(() => {
          if (g !== gen) return;
          api.msgBox('Online Checkers', `${text}\n\nYour record: ${stats.w} wins, ${stats.l} losses, ${stats.d} draws.`, ['Rematch', 'New opponent', 'Close']).then(r => {
            if (r === 'Rematch' && opp) { chat('sys', `${opp.name} accepted the rematch.`); startGame(true); }
            else if (r === 'New opponent') findOpponent();
          });
        }, 1600);
      }
      function resign() {
        if (!opp || over || game.hidden) return;
        api.msgBox('Online Checkers', 'Resign this game? It will count as a loss.', ['Resign', 'Cancel'], 'warn').then(r => { if (r === 'Resign' && !over && opp) finish('l', true); });
      }
      function newMatch() {
        if (opp && !over && !game.hidden) api.msgBox('Online Checkers', 'Leave this table and find a new opponent? The current game counts as a loss.', ['Yes', 'No'], 'warn').then(r => { if (r === 'Yes') { stats.l++; api.save('stats', stats); api.save('game', null); findOpponent(); } });
        else findOpponent();
      }
      function setLevel(v) { level = v; api.save('level', v); if (!lobby.hidden && !opp) lobbyIdle(); }
      const howTo = () => api.msgBox('How to play Online Checkers', 'The Game Zone matches you with an opponent for a game of American checkers. (Between you and me: in this version every opponent is a computer program running right here on your PC, so you do not need a modem. The names and the chat are just for fun.)\n\nYou play Black at the bottom and move first. Pieces move one square diagonally forward onto an empty dark square.\n\nJump an enemy piece by hopping over it into the empty square just beyond. Jumps are required: if you can jump, you must. If after a jump you can jump again with the same piece, you must keep going (a multi-jump). Tap each landing square in turn.\n\nA piece that reaches the far row is crowned a King and can move and jump backward too. Being crowned ends the move.\n\nYou win when your opponent has no pieces left or cannot move. If 40 moves each go by with no capture and no ordinary piece moving, the game is a draw.\n\nKeyboard: arrow keys and Enter, Esc to cancel a selection.\n\nWin a game to earn $4.');

      api.menubar([
        { label: 'Game', items: () => [{ label: 'Find new opponent', fn: newMatch }, { label: 'Resign', fn: resign, disabled: !opp || over || game.hidden }, '-', { label: 'Statistics', fn: () => api.msgBox('Checkers record', `Wins: ${stats.w}\nLosses: ${stats.l}\nDraws: ${stats.d}`) }, { label: 'How to play', fn: howTo }, '-', { label: 'Exit', fn: () => api.close() }] },
        { label: 'Options', items: () => [{ label: (level === 'casual' ? '* ' : '   ') + 'Casual opponents', fn: () => setLevel('casual') }, { label: (level === 'advanced' ? '* ' : '   ') + 'Advanced opponents', fn: () => setLevel('advanced') }] }
      ]);

      boardEl.addEventListener('click', e => { const q = e.target.closest('.ck-sq'); if (!q || q.disabled) return; kbd = false; cur = +q.dataset.i; tap(cur); });
      W.body.querySelector('.ck-say').addEventListener('click', e => {
        const bt = e.target.closest('[data-say]'); if (!bt || !opp) return;
        const s = bt.dataset.say;
        chat('me', s); api.sfx.sent();
        if (Math.random() < 0.85) oppSays(api.pick(CK_REPLY[s] || ['ok']), 1200);
      });
      W.onKey = e => {
        if (game.hidden) { if (e.key === 'Enter') { const g = lobby.querySelector('[data-go]'); if (g) { e.preventDefault(); g.click(); } } return; }
        const d = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[e.key];
        if (d) {
          e.preventDefault(); kbd = true;
          const r = (cur >> 3) + d[0], c = (cur & 7) + d[1];
          if (r >= 0 && r < 8 && c >= 0 && c < 8) cur = r * 8 + c;
          render();
        } else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); kbd = true; if (!sqs[cur].disabled) tap(cur); }
        else if (e.key === 'Escape') { if (!partial.length) { sel = -1; render(); } }
      };
      W.onResize = fit;
      const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
      if (ro) { ro.observe(bw); ro.observe(W.body); }
      W.onClose = () => { T.clear(); gen++; if (ro) ro.disconnect(); };

      const saved = api.load('game', null);
      if (saved && Array.isArray(saved.b) && saved.b.length === 64 && saved.opp) {
        opp = saved.opp; b = saved.b; turn = saved.turn === OPP ? OPP : ME; quiet = saved.quiet || 0; last = saved.last || [];
        startGame(false);
      } else lobbyIdle();
    }
  });
})();
