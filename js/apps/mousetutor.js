/* Mouse Tutorial: a built-in 1990 program that teaches the brand-new mouse, one playful lesson at a time.
   The host is Clicky, an original pixel-art mouse whose tail is a mouse cord with a plug on the end.
   Seven lessons: pointing, clicking, double-clicking, dragging, windows, menus and scroll bars, and a
   final treasure hunt that uses everything. Drawn with DOM, inline SVG and a tiny canvas. Mouse and touch
   both work everywhere; the keyboard handles navigation (Enter, Esc, 1-7, R). */
(function () {
  'use strict';
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const now = () => performance.now();

  /* ---------- Clicky: a 32x32 pixel sprite rasterized from simple shapes, outlined automatically ---------- */
  const CK_COL = [null, '#000000', '#a8a8a8', '#e4e4e4', '#ff7fae', '#505050', '#ffffff', '#d40000', '#6c6c6c', '#ffd200'];
  const NO_OUTLINE = new Set([0, 1, 5]);
  const ckCache = {};
  function clickyImage(f) {
    const key = [f.mouth ? 1 : 0, f.blink ? 1 : 0, f.happy ? 1 : 0, f.wave || 0].join('');
    if (ckCache[key]) return ckCache[key];
    const N = 32, g = new Uint8Array(N * N);
    const set = (x, y, c) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < N && y < N) g[y * N + x] = c; };
    const ell = (cx, cy, rx, ry, c) => { for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const a = (x + 0.5 - cx) / rx, b = (y + 0.5 - cy) / ry; if (a * a + b * b <= 1) g[y * N + x] = c; } };
    const rect = (x, y, w, h, c) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(x + i, y + j, c); };
    const line = (x0, y0, x1, y1, c) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)); for (let i = 0; i <= n; i++) set(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, c); };
    // the tail is a mouse cord that ends in a plug
    for (let t = 0; t <= 1; t += 0.02) set(21 + 8 * t, 28 - 8 * t * t + Math.sin(t * 7) * 0.8, 8);
    rect(27, 18, 4, 3, 3); rect(28, 16, 1, 2, 9); rect(30, 16, 1, 2, 9);
    ell(9, 8, 6, 6, 2); ell(23, 8, 6, 6, 2); ell(9, 8.5, 3.6, 3.6, 4); ell(23, 8.5, 3.6, 3.6, 4);
    ell(16, 25.5, 7.5, 5.5, 2); ell(16, 26.5, 4.5, 3.8, 3);
    ell(11.5, 30.6, 3, 1.5, 4); ell(20.5, 30.6, 3, 1.5, 4);
    if (f.wave) { line(22, 24, 25, 20, 2); line(23, 24, 26, 20, 2); ell(f.wave === 2 ? 27.5 : 26.5, 18.5, 2, 2, 4); }
    ell(16, 15, 10, 7.5, 2); ell(16, 18, 5.5, 3.5, 3);
    line(11, 17, 2, 15, 5); line(11, 19, 2, 20, 5); line(21, 17, 30, 15, 5); line(21, 19, 30, 20, 5);
    if (f.happy) { [11, 18].forEach(x => { set(x, 14, 1); set(x + 1, 13, 1); set(x + 2, 14, 1); }); }
    else if (f.blink) { rect(11, 14, 3, 1, 1); rect(18, 14, 3, 1, 1); }
    else { rect(11, 12, 3, 4, 1); set(12, 13, 6); rect(18, 12, 3, 4, 1); set(19, 13, 6); }
    rect(15, 16, 2, 2, 4);
    if (f.mouth) { rect(14, 19, 4, 3, 1); rect(15, 20, 2, 1, 4); }
    else { set(14, 19, 1); set(15, 20, 1); set(16, 20, 1); set(17, 19, 1); }
    rect(12, 22, 3, 3, 7); rect(17, 22, 3, 3, 7); rect(15, 22, 2, 2, 7);
    const o = g.slice();
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      if (g[y * N + x]) continue;
      const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const X = x + dx, Y = y + dy; return X >= 0 && Y >= 0 && X < N && Y < N && !NO_OUTLINE.has(g[Y * N + X]); });
      if (nb) o[y * N + x] = 1;
    }
    const img = new ImageData(N, N);
    for (let i = 0; i < N * N; i++) {
      const c = CK_COL[o[i]]; if (!c) continue;
      img.data[i * 4] = parseInt(c.slice(1, 3), 16); img.data[i * 4 + 1] = parseInt(c.slice(3, 5), 16); img.data[i * 4 + 2] = parseInt(c.slice(5, 7), 16); img.data[i * 4 + 3] = 255;
    }
    return (ckCache[key] = img);
  }
  const drawClicky = (cv, f) => { const x = cv.getContext('2d'); x.clearRect(0, 0, 32, 32); x.putImageData(clickyImage(f), 0, 0); };

  /* ---------- pictures ---------- */
  const STAR_PTS = '12,1 15,8.5 23,9 17,14.5 19,22.5 12,18 5,22.5 7,14.5 1,9 9,8.5';
  const starSVG = on => `<svg viewBox="0 0 24 24" aria-hidden="true"><polygon points="${STAR_PTS}" fill="${on ? '#ffd700' : '#9a9a9a'}" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
  const giftSVG = (body, rib) => `<svg viewBox="0 0 48 48" shape-rendering="crispEdges" aria-hidden="true"><g class="mt-lid"><rect x="12" y="4" width="10" height="8" fill="${rib}" stroke="#000"/><rect x="26" y="4" width="10" height="8" fill="${rib}" stroke="#000"/><rect x="21" y="7" width="6" height="5" fill="${rib}" stroke="#000"/><rect x="3" y="12" width="42" height="10" fill="${body}" stroke="#000"/><rect x="21" y="12" width="6" height="10" fill="${rib}"/></g><rect x="6" y="22" width="36" height="23" fill="${body}" stroke="#000"/><rect x="21" y="22" width="6" height="23" fill="${rib}"/><rect x="7" y="23" width="34" height="3" fill="#000" opacity=".25"/></svg>`;
  const PRIZES = [
    '<polygon points="2,20 22,20 22,8" fill="#ffd200" stroke="#000"/><circle cx="17" cy="16" r="2" fill="#c89600"/><circle cx="12" cy="18" r="1.3" fill="#c89600"/><circle cx="19" cy="12" r="1.2" fill="#c89600"/>',
    `<polygon points="${STAR_PTS}" fill="#ffd700" stroke="#000"/>`,
    '<path d="M12 21 L3 12 A4.5 4.5 0 0 1 12 6 A4.5 4.5 0 0 1 21 12 Z" fill="#e00000" stroke="#000"/>',
    '<polygon points="6,4 18,4 22,10 12,21 2,10" fill="#55ffff" stroke="#000"/><polyline points="2,10 22,10" stroke="#000" fill="none"/>',
    '<polygon points="3,19 3,7 8,12 12,4 16,12 21,7 21,19" fill="#ffd700" stroke="#000"/><rect x="10" y="13" width="4" height="4" fill="#e00000"/>',
    '<circle cx="12" cy="12" r="9" fill="#ff5555" stroke="#000"/><path d="M3 12h18" stroke="#fff" stroke-width="3"/><circle cx="8" cy="7" r="1.6" fill="#fff"/>'
  ];
  const prizeSVG = i => `<svg viewBox="0 0 24 24" aria-hidden="true">${PRIZES[i % PRIZES.length]}</svg>`;
  const sockSVG = (c, s) => `<svg viewBox="0 0 40 52" aria-hidden="true"><path d="M12 2h16v26l9 9v9a4 4 0 0 1-4 4H19l-7-9z" fill="${c}" stroke="#000" stroke-width="1.5"/><rect x="13" y="3" width="14" height="6" fill="${s}"/><rect x="13" y="14" width="14" height="3" fill="${s}"/><rect x="13" y="21" width="14" height="3" fill="${s}"/><path d="M28 42a5 5 0 0 1 5-5" stroke="${s}" stroke-width="3" fill="none"/></svg>`;
  const basketSVG = '<svg viewBox="0 0 120 90" preserveAspectRatio="none" aria-hidden="true"><path d="M10 26h100l-9 60H19z" fill="#e0a060" stroke="#000" stroke-width="2"/><g stroke="#8a5020" stroke-width="2"><path d="M13 40h94M15 54h90M17 68h86"/><path d="M30 26l3 60M50 26l1 60M70 26l-1 60M90 26l-3 60"/></g><rect x="4" y="18" width="112" height="10" fill="#c07830" stroke="#000" stroke-width="2"/></svg>';
  const bugSVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle class="mt-glow" cx="12" cy="17" r="5" fill="#ffff55"/><ellipse cx="6.5" cy="9" rx="4.5" ry="2.5" fill="#aaffff" opacity=".85"/><ellipse cx="17.5" cy="9" rx="4.5" ry="2.5" fill="#aaffff" opacity=".85"/><ellipse cx="12" cy="10" rx="3" ry="6" fill="#553311" stroke="#000"/><circle cx="12" cy="4" r="2.2" fill="#000"/></svg>';
  const balloonSVG = c => `<svg viewBox="0 0 30 52" aria-hidden="true"><path d="M15 32q-4 6 0 10t0 9" fill="none" stroke="#000"/><ellipse cx="15" cy="15" rx="13" ry="14" fill="${c}" stroke="#000"/><polygon points="12,29 18,29 15,33" fill="${c}" stroke="#000"/><rect x="7" y="7" width="4" height="6" fill="#fff" opacity=".7"/></svg>`;
  const jarSVG = '<svg viewBox="0 0 40 50" aria-hidden="true"><rect x="8" y="2" width="24" height="6" fill="#aa5500" stroke="#000"/><path d="M6 10h28v34a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4z" fill="#aaddff" fill-opacity=".35" stroke="#fff" stroke-width="2"/></svg>';
  const chestSVG = open => `<svg viewBox="0 0 48 40" shape-rendering="crispEdges" aria-hidden="true">${open
    ? '<rect x="4" y="0" width="40" height="9" fill="#8a4a10" stroke="#000"/><rect x="4" y="10" width="40" height="6" fill="#ffd700"/><circle cx="12" cy="11" r="4" fill="#ffd700" stroke="#a07000"/><circle cx="24" cy="10" r="4" fill="#ffd700" stroke="#a07000"/><circle cx="35" cy="11" r="4" fill="#ffd700" stroke="#a07000"/><rect x="21" y="6" width="6" height="6" fill="#55ffff" stroke="#000"/>'
    : '<rect x="4" y="5" width="40" height="12" fill="#8a4a10" stroke="#000"/><rect x="4" y="9" width="40" height="2" fill="#ffd700"/>'}<rect x="4" y="16" width="40" height="22" fill="#a85a18" stroke="#000"/><rect x="4" y="22" width="40" height="3" fill="#ffd700"/><rect x="10" y="16" width="3" height="22" fill="#ffd700"/><rect x="35" y="16" width="3" height="22" fill="#ffd700"/>${open ? '' : '<rect x="20" y="14" width="8" height="10" fill="#ffd700" stroke="#000"/><rect x="23" y="17" width="2" height="4" fill="#000"/>'}</svg>`;
  const keySVG = '<svg viewBox="0 0 40 20" aria-hidden="true"><circle cx="8" cy="10" r="6" fill="none" stroke="#000" stroke-width="5"/><circle cx="8" cy="10" r="6" fill="none" stroke="#ffd700" stroke-width="3"/><rect x="13" y="8" width="25" height="4" fill="#ffd700" stroke="#000"/><rect x="29" y="12" width="3" height="5" fill="#ffd700" stroke="#000"/><rect x="34" y="12" width="3" height="4" fill="#ffd700" stroke="#000"/></svg>';
  const winIconSVG = c => `<svg viewBox="0 0 32 32" shape-rendering="crispEdges" aria-hidden="true"><rect x="3" y="5" width="26" height="22" fill="#fff" stroke="#000"/><rect x="4" y="6" width="24" height="5" fill="${c}"/><rect x="7" y="15" width="16" height="2" fill="#808080"/><rect x="7" y="20" width="12" height="2" fill="#808080"/></svg>`;
  const houseSVG = p => `<svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><rect width="160" height="100" fill="#aaffff"/><rect y="78" width="160" height="22" fill="#55aa55"/>
    ${p.sun ? '<circle cx="136" cy="18" r="11" fill="#ffff55" stroke="#aa5500" stroke-width="2"/>' : ''}
    ${p.tree ? '<rect x="18" y="52" width="7" height="28" fill="#804000"/><circle cx="21" cy="46" r="15" fill="#00aa00" stroke="#005500" stroke-width="2"/>' : ''}
    <rect x="52" y="42" width="56" height="38" fill="${p.wall}" stroke="#000" stroke-width="2"/><polygon points="46,44 80,16 114,44" fill="#aa0000" stroke="#000" stroke-width="2"/>
    <rect x="74" y="58" width="13" height="22" fill="#aa5500" stroke="#000"/><rect x="58" y="50" width="11" height="10" fill="#fff" stroke="#000"/><rect x="92" y="50" width="11" height="10" fill="#fff" stroke="#000"/>
    ${p.cheese ? '<polygon points="118,88 142,88 142,74" fill="#ffd200" stroke="#000"/><circle cx="136" cy="84" r="2" fill="#c89600"/>' : ''}</svg>`;
  const triSVG = up => `<svg viewBox="0 0 12 12" aria-hidden="true"><polygon points="${up ? '2,8 10,8 6,3' : '2,4 10,4 6,9'}" fill="#000"/></svg>`;
  const speakSVG = '<svg viewBox="0 0 24 24" width="22" height="22" shape-rendering="crispEdges" aria-hidden="true"><rect x="3" y="9" width="5" height="6" fill="#000"/><polygon points="8,9 14,4 14,20 8,15" fill="#000"/><path d="M17 8q3 4 0 8M19 5q6 7 0 14" stroke="#000" stroke-width="2" fill="none"/></svg>';
  const checkSVG = '<svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M2 6l3 3 5-7" stroke="#000" stroke-width="2" fill="none"/></svg>';
  const TOOLS = {
    tree: '<svg viewBox="0 0 20 24"><rect x="8" y="14" width="4" height="9" fill="#804000"/><circle cx="10" cy="9" r="8" fill="#00aa00" stroke="#004400"/></svg>',
    rock: '<svg viewBox="0 0 24 16"><path d="M2 15l4-9 6-4 7 3 3 10z" fill="#9a9a9a" stroke="#333"/></svg>',
    pond: '<svg viewBox="0 0 40 16"><ellipse cx="20" cy="8" rx="19" ry="7" fill="#5555ff" stroke="#0000aa"/><path d="M10 7h6M24 10h6" stroke="#aaffff"/></svg>',
    flower: '<svg viewBox="0 0 16 20"><rect x="7" y="9" width="2" height="11" fill="#00aa00"/><circle cx="8" cy="7" r="5" fill="#ff55ff"/><circle cx="8" cy="7" r="2" fill="#ffff55"/></svg>',
    hill: '<svg viewBox="0 0 40 18"><path d="M0 18q20-30 40 0z" fill="#00aa00" stroke="#005500"/></svg>'
  };

  const CSS = `
  .mt-root{display:flex;flex-direction:column;height:100%;min-height:0;background:var(--gray);user-select:none;-webkit-user-select:none}
  .mt-host{position:relative;display:flex;align-items:flex-end;gap:4px;padding:4px 4px 2px;flex:none}
  .mt-ck{width:72px;height:72px;image-rendering:pixelated;flex:none}
  .mt-bub{position:relative;flex:1;min-width:0;min-height:44px;max-height:104px;overflow:auto;background:#ffffe1;border:2px solid #000;border-radius:10px;padding:5px 9px;margin:0 0 6px 10px;font:700 14px/1.32 var(--ui);color:#000}
  .mt-tail{position:absolute;left:78px;bottom:22px;width:0;height:0;border:7px solid transparent;border-right:11px solid #000}
  .mt-tail::after{content:'';position:absolute;left:-4px;top:-5px;border:5px solid transparent;border-right:8px solid #ffffe1}
  .mt-hwrapx{position:relative;display:flex;flex:1;min-width:0;align-items:flex-end}
  .mt-again{flex:none;min-width:44px !important;min-height:44px;padding:4px !important;margin-bottom:6px;display:grid;place-items:center}
  .mt-stagew{flex:1;min-height:0;margin:2px 4px;position:relative}
  .mt-play{position:absolute;inset:0;overflow:hidden;touch-action:none;cursor:default;background:#00aaaa}
  .mt-play.mt-scrolly{overflow:auto;touch-action:pan-y;background:#c0c0c0}
  .mt-foot{display:flex;align-items:center;gap:8px;padding:3px 4px 4px;flex:none;min-height:36px}
  .mt-lt{font-weight:700;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .mt-fs{display:flex;gap:2px}.mt-fs svg{width:22px;height:22px;display:block}
  .mt-fs .mt-new{animation:mt-grow .6s}
  .mt-pg{text-align:right;white-space:nowrap}
  .mt-foot .btn{min-height:32px}
  .mt-bg-bubble{background:#00aaaa;background-image:radial-gradient(#55ffff 1.5px,transparent 2px);background-size:36px 36px}
  .mt-bg-night{background:#000040;background-image:radial-gradient(#ffffff 1px,transparent 1.5px),radial-gradient(#aaaaff 1px,transparent 1.5px);background-size:57px 43px,83px 71px;background-position:0 0,20px 30px}
  .mt-bg-sky{background:linear-gradient(#55aaff,#aaffff)}
  .mt-bg-gift{background:#aa00aa;background-image:repeating-linear-gradient(45deg,transparent 0 14px,rgba(255,255,255,.08) 14px 28px)}
  .mt-bg-laundry{background:linear-gradient(#ffdd99 0 78%,#aa5500 78%)}
  .mt-bg-desk{background:#008080}
  .mt-bubble{position:absolute;border-radius:50%;border:3px solid #fff;background:rgba(170,255,255,.35);box-shadow:inset -5px -5px 0 rgba(0,0,170,.25);pointer-events:none;animation:mt-in .3s}
  .mt-bubble::after{content:'';position:absolute;left:22%;top:18%;width:18%;height:18%;background:#fff}
  .mt-bubble.mt-popping{animation:mt-pop .25s forwards}
  .mt-burst{position:absolute;font:700 18px var(--ui);color:#fff;text-shadow:2px 2px #000;pointer-events:none;animation:mt-up .8s forwards;white-space:nowrap;transform:translate(-50%,-50%)}
  .mt-ring{position:absolute;width:40px;height:40px;margin:-20px 0 0 -20px;border:3px solid #fff;border-radius:50%;pointer-events:none;animation:mt-ring .4s forwards}
  .mt-ent{position:absolute;pointer-events:none}.mt-ent svg{width:100%;height:100%;display:block}
  .mt-bug .mt-glow{opacity:.55;transition:opacity .15s}
  .mt-bug.mt-lit .mt-glow{opacity:1}
  .mt-bug.mt-lit{filter:drop-shadow(0 0 6px #ffff55)}
  .mt-bug{animation:mt-flap .25s steps(2) infinite}
  .mt-jar{position:absolute;right:10px;bottom:8px;width:64px;height:80px;pointer-events:none}
  .mt-jar svg{width:100%;height:100%}
  .mt-jar i{position:absolute;width:8px;height:8px;background:#ffff55;box-shadow:0 0 6px #ffff55;border-radius:50%}
  .mt-gift{position:absolute;width:var(--gs,96px);pointer-events:none}
  .mt-gift>svg{width:var(--gs,96px);height:var(--gs,96px);display:block;overflow:visible}
  .mt-gift.mt-wig>svg{animation:mt-wig .3s}
  .mt-gift .mt-lid{transition:transform .5s}
  .mt-gift.mt-open .mt-lid{transform:translate(-8px,-16px) rotate(-20deg)}
  .mt-meter{height:12px;margin:6px 10px 0;background:#000;border:2px solid #fff;visibility:hidden}
  .mt-meter i{display:block;height:100%;background:#55ff55;width:100%}
  .mt-gift.mt-armed .mt-meter{visibility:visible}
  .mt-gift.mt-open .mt-meter{visibility:hidden}
  .mt-prize{position:absolute;left:25%;top:18%;width:50%;height:auto;aspect-ratio:1;animation:mt-rise .6s forwards}
  .mt-prize svg{width:100%;height:100%}
  .mt-lift{filter:drop-shadow(4px 6px 0 rgba(0,0,0,.35));z-index:5}
  .mt-slot{position:absolute;pointer-events:none}.mt-slot svg{width:100%;height:100%}
  .mt-frame{position:absolute;background:#fff;border:3px solid #000;box-shadow:4px 4px 0 rgba(0,0,0,.3)}
  .mt-label{position:absolute;font:700 13px var(--ui);color:#000;background:#ffffe1;border:1px solid #000;padding:1px 6px;pointer-events:none;white-space:nowrap}
  .mt-target{position:absolute;border:3px dashed #ffff55;background:rgba(255,255,85,.12);display:grid;place-items:center;text-align:center;color:#ffff55;font:700 13px var(--ui);text-shadow:1px 1px #000;pointer-events:none}
  .mt-target.mt-near{background:rgba(255,255,85,.35)}
  .mt-mw{position:absolute;background:#c0c0c0;border:2px solid;border-color:#dfdfdf #000 #000 #dfdfdf;box-shadow:inset -1px -1px #808080,inset 1px 1px #fff;display:flex;flex-direction:column;padding:2px}
  .mt-mwtb{height:34px;flex:none;display:flex;align-items:center;gap:2px;background:#000080;color:#fff;font:700 13px var(--ui);padding:0 2px;touch-action:none;cursor:move}
  .mt-mwt{flex:1;text-align:center;white-space:nowrap;overflow:hidden}
  .mt-mwb{width:34px;height:28px;padding:0;background:#c0c0c0;color:#000;border:2px solid;border-color:#fff #000 #000 #fff;font:700 15px/1 var(--ui);cursor:pointer;flex:none}
  .mt-mwb:active{border-color:#000 #fff #fff #000}
  .mt-mwbody{flex:1;min-height:0;background:#fff;border:1px solid #000;margin-top:2px;overflow:hidden;position:relative}
  .mt-mwgrip{position:absolute;right:-2px;bottom:-2px;width:34px;height:34px;cursor:nwse-resize;touch-action:none;background:linear-gradient(135deg,transparent 40%,#000 40%,#000 46%,#fff 46%,#fff 52%,transparent 52%,transparent 62%,#000 62%,#000 68%,#fff 68%,#fff 74%,transparent 74%),#c0c0c0;border:2px solid;border-color:#fff #000 #000 #fff}
  .mt-mw.mt-gone{animation:mt-shrink .3s forwards}
  .mt-note{padding:8px;font:700 13px var(--ui);color:#000080}
  .mt-dicon{position:absolute;width:80px;display:flex;flex-direction:column;align-items:center;gap:2px;color:#fff;font:13px var(--ui);text-align:center;cursor:pointer;touch-action:none}
  .mt-dicon svg{width:48px;height:48px}
  .mt-dicon span{padding:0 3px}
  .mt-dicon.mt-sel span{background:#000080}
  .mt-dicon.mt-sel svg{filter:brightness(.6) sepia(1) hue-rotate(190deg)}
  .mt-mbar{display:flex;flex:none;background:#fff;border-bottom:1px solid #000;margin-top:2px}
  .mt-mt{background:none;border:0;font:14px var(--ui);padding:5px 10px;min-height:32px;cursor:pointer;color:#000}
  .mt-mt.mt-on{background:#000080;color:#fff}
  .mt-dd{position:absolute;z-index:6;background:#fff;border:1px solid #000;box-shadow:3px 3px 0 rgba(0,0,0,.4);min-width:150px;display:flex;flex-direction:column;padding:2px 0}
  .mt-mitem{display:flex;align-items:center;gap:8px;background:none;border:0;text-align:left;font:14px var(--ui);padding:0 12px;min-height:40px;cursor:pointer;color:#000}
  .mt-mitem:hover,.mt-mitem:focus-visible{background:#000080;color:#fff;outline:none}
  .mt-mitem:hover svg path{stroke:#fff}
  .mt-mitem span{flex:1}
  .mt-sw{width:16px;height:16px;border:1px solid #000;flex:none}
  .mt-mitem:disabled{color:#808080;background:none}
  .mt-pic{width:100%;height:100%;display:block}
  .mt-pic svg{width:100%;height:100%;display:block}
  .mt-scrollhost{display:flex;height:100%}
  .mt-sv{flex:1;min-width:0;overflow:hidden;position:relative;touch-action:none}
  .mt-sc{position:absolute;left:0;right:0;top:0}
  .mt-sb{width:34px;flex:none;display:flex;flex-direction:column;background:#c0c0c0;border-left:1px solid #000}
  .mt-sba{height:34px;flex:none;padding:0;background:#c0c0c0;border:2px solid;border-color:#fff #000 #000 #fff;display:grid;place-items:center;cursor:pointer;touch-action:none}
  .mt-sba:active{border-color:#000 #fff #fff #000}
  .mt-sba svg{width:14px;height:14px}
  .mt-sbt{flex:1;position:relative;background:repeating-conic-gradient(#c0c0c0 0 25%,#fff 0 50%) 0 0/4px 4px;touch-action:none}
  .mt-sbh{position:absolute;left:0;right:0;background:#c0c0c0;border:2px solid;border-color:#fff #000 #000 #fff;touch-action:none;cursor:pointer}
  .mt-row{height:44px;display:flex;align-items:center;gap:10px;padding:0 10px;border-bottom:1px dotted #aaa;font:14px var(--ui);color:#000}
  .mt-row i{width:18px;height:18px;border:1px solid #000;flex:none}
  .mt-row.mt-gold{height:64px;background:#ffff99;font-weight:700;cursor:pointer}
  .mt-row.mt-gold svg{width:56px;height:46px}
  .mt-maprow{height:56px;display:flex;align-items:center;justify-content:space-around;background:#55aa55;border-bottom:2px dashed #aa7733}
  .mt-maprow svg{height:34px;width:auto}
  .mt-keyspot{width:74px;height:44px;display:grid;place-items:center;background:rgba(255,255,85,.35);border:2px dashed #ffff55;cursor:pointer}
  .mt-keyspot svg{width:60px;height:30px}
  .mt-key{position:absolute;width:76px;height:40px;cursor:grab;touch-action:none;z-index:4;animation:mt-in .3s}
  .mt-key svg{width:100%;height:100%}
  .mt-chest{position:absolute;width:96px;height:80px;pointer-events:none}.mt-chest svg{width:100%;height:100%}
  .mt-panel{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:12px;text-align:center;overflow:auto;background:#000080;color:#fff}
  .mt-panel h2{margin:0;font:700 22px var(--ui);color:#ffff55}
  .mt-bigstars{display:flex;gap:8px}.mt-bigstars svg{width:52px;height:52px;animation:mt-grow .5s both}
  .mt-bigstars svg:nth-child(2){animation-delay:.2s}.mt-bigstars svg:nth-child(3){animation-delay:.4s}
  .mt-panel .btn,.mt-home .btn{min-height:44px;font:700 14px var(--ui);color:#000}
  .mt-btns{display:flex;flex-wrap:wrap;gap:8px;justify-content:center}
  .mt-hw{padding:10px;display:flex;flex-direction:column;gap:10px;max-width:760px;margin:0 auto}
  .mt-ht{font:700 20px var(--ui);color:#000080;text-align:center}
  .mt-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:8px}
  .mt-card{display:flex !important;align-items:center;gap:8px;text-align:left;padding:6px 8px !important;min-height:64px;position:relative}
  .mt-card .mt-cn{font:700 20px var(--ui);color:#800000;width:20px;text-align:center;flex:none}
  .mt-card .mt-ci{width:40px;height:40px;flex:none;display:grid;place-items:center}
  .mt-card .mt-ci svg{max-width:40px;max-height:40px}
  .mt-card .mt-ct{flex:1;min-width:0;display:flex;flex-direction:column}
  .mt-card small{font-weight:400;color:#333}
  .mt-card .mt-cs{display:flex;flex:none}.mt-card .mt-cs svg{width:16px;height:16px}
  .mt-card.mt-rec{outline:3px dashed #000080;outline-offset:1px}
  .mt-card.mt-rec::after{content:'Next';position:absolute;right:4px;top:2px;font:700 10px var(--ui);color:#fff;background:#000080;padding:0 4px}
  .mt-tip{background:#ffffe1;padding:8px 10px;font:13px/1.4 var(--ui);color:#000}
  .mt-cert{background:#fffbe6;color:#000;border:10px solid #000080;outline:4px solid #ffd700;outline-offset:-16px;padding:24px 18px;text-align:center;max-width:560px;margin:10px auto;font:14px/1.45 Georgia,"Times New Roman",serif;box-shadow:6px 6px 0 rgba(0,0,0,.35)}
  .mt-cert h2{margin:4px 0 6px;font:700 24px Georgia,"Times New Roman",serif;color:#800000;letter-spacing:1px}
  .mt-cert .mt-cname{font:italic 700 28px Georgia,"Times New Roman",serif;color:#000080;border-bottom:2px solid #000;display:inline-block;padding:0 16px;margin:6px 0;word-break:break-word}
  .mt-cert .mt-cfoot{display:flex;justify-content:space-between;align-items:flex-end;gap:10px;margin-top:14px;text-align:left;flex-wrap:wrap}
  .mt-cert canvas{width:64px;height:64px;image-rendering:pixelated}
  .mt-cert .mt-cstars{display:flex;justify-content:center;gap:2px;flex-wrap:wrap;margin:8px 0}.mt-cert .mt-cstars svg{width:18px;height:18px}
  .mt-seal{width:64px;height:64px;border-radius:50%;background:#ffd700;border:3px double #800000;display:grid;place-items:center;font:700 11px/1.1 var(--ui);color:#800000;text-align:center}
  @keyframes mt-in{from{transform:scale(0)}}
  @keyframes mt-pop{to{transform:scale(1.5);opacity:0}}
  @keyframes mt-up{to{margin-top:-40px;opacity:0}}
  @keyframes mt-ring{from{transform:scale(.3);opacity:1}to{transform:scale(1.4);opacity:0}}
  @keyframes mt-flap{50%{transform:translateY(-2px)}}
  @keyframes mt-wig{25%{transform:rotate(-8deg)}75%{transform:rotate(8deg)}}
  @keyframes mt-rise{from{transform:translateY(30px) scale(.3)}to{transform:translateY(-34px) scale(1)}}
  @keyframes mt-grow{0%{transform:scale(0)}70%{transform:scale(1.35)}100%{transform:scale(1)}}
  @keyframes mt-shrink{to{transform:scale(.1);opacity:0}}
  @media (max-width:480px){.mt-ck{width:52px;height:52px}.mt-tail{left:58px}.mt-bub{font-size:13px;max-height:132px;margin-left:6px}.mt-ln{display:none}.mt-foot .btn{min-width:0;padding:4px 8px}.mt-fs svg{width:18px;height:18px}}
  `;

  const LESSONS = [
    { name: 'Pointing', sub: 'Pop the bubbles', icon: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#aaffff" stroke="#0000aa" stroke-width="2"/><rect x="7" y="6" width="4" height="4" fill="#fff"/></svg>' },
    { name: 'Clicking', sub: 'Catch the fireflies', icon: '<svg viewBox="0 0 24 24"><rect width="24" height="24" fill="#000040"/>' + bugSVG.replace(/^<svg[^>]*>|<\/svg>$/g, '') + '</svg>' },
    { name: 'Double-clicking', sub: 'Open the presents', icon: giftSVG('#ff5555', '#ffff55') },
    { name: 'Dragging', sub: 'Tidy up the socks', icon: sockSVG('#5555ff', '#fff') },
    { name: 'Windows', sub: 'Move, size, shrink and grow', icon: winIconSVG('#000080') },
    { name: 'Menus & scroll bars', sub: 'Paint a house, find a treasure', icon: '<svg viewBox="0 0 24 24" shape-rendering="crispEdges"><rect x="2" y="3" width="20" height="18" fill="#fff" stroke="#000"/><rect x="2" y="3" width="20" height="5" fill="#000080"/><rect x="5" y="11" width="10" height="2" fill="#000"/><rect x="5" y="15" width="8" height="2" fill="#000"/><rect x="18" y="8" width="4" height="13" fill="#c0c0c0" stroke="#000"/></svg>' },
    { name: 'Final challenge', sub: 'The treasure hunt', icon: chestSVG(false) }
  ];
  const PRAISE = ['Great job!', 'Nice work!', 'You\'re a natural!', 'Wonderful!', 'Super!', 'Well done!', 'Terrific!'];

  function open(W, api) {
    const esc = api.esc;
    const S = Object.assign({ stars: {}, part: {}, done: {}, grad: false, visited: false }, api.load('progress', {}));
    const opts = Object.assign({ talk: true, dbl: 1000 }, api.load('opts', {}));
    const paid = () => api.load('paid', false);
    const saveS = () => api.save('progress', S);
    let touchy = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
    const L = (m, t) => touchy && t ? t : m;

    W.body.innerHTML = `<div class="mt-root">
      <div class="mt-host"><canvas class="mt-ck" width="32" height="32" role="img" aria-label="Clicky the mouse"></canvas><span class="mt-tail" aria-hidden="true"></span>
        <div class="mt-bub" aria-live="polite"></div><button class="btn mt-again" title="Say it again" aria-label="Say it again">${speakSVG}</button></div>
      <div class="mt-stagew sunken"><div class="mt-play"></div></div>
      <div class="mt-foot"><span class="mt-lt"></span><span class="mt-fs"></span><span class="mt-pg"></span><button class="btn mt-hb">Lessons</button></div>
    </div>`;
    const $ = s => W.body.querySelector(s);
    const cv = $('.mt-ck'), bub = $('.mt-bub'), play = $('.mt-play'), ltEl = $('.mt-lt'), fsEl = $('.mt-fs'), pgEl = $('.mt-pg'), homeBtn = $('.mt-hb');

    /* ---------- sounds ---------- */
    const snd = {
      pop() { api.tone(520, 0.09, { type: 'square', to: 1300, vol: 0.06, decay: 1 }); api.noise(0.05, { f: 3000, vol: 0.08, decay: 1 }); },
      catch() { api.tone(988, 0.07, { vol: 0.06 }); api.tone(1319, 0.1, { vol: 0.06, at: 0.07 }); },
      miss() { api.tone(196, 0.08, { type: 'triangle', vol: 0.06, decay: 1 }); },
      click() { api.sfx.click(); },
      tick() { api.tone(1200, 0.02, { vol: 0.03 }); },
      open() { [60, 64, 67, 72].forEach((n, i) => api.tone(api.midi(n), 0.12, { type: 'triangle', vol: 0.08, at: i * 0.07 })); },
      drop() { api.noise(0.08, { ft: 'lowpass', f: 500, vol: 0.2, decay: 1 }); api.tone(330, 0.08, { type: 'triangle', vol: 0.06, at: 0.02 }); },
      star() { [72, 76, 79, 84].forEach((n, i) => api.tone(api.midi(n), 0.14, { type: 'square', vol: 0.05, at: i * 0.08 })); },
      win() { [60, 64, 67, 72, 67, 72, 76, 79].forEach((n, i) => api.tone(api.midi(n), 0.16, { type: 'square', vol: 0.05, at: i * 0.1 })); }
    };

    /* ---------- Clicky talks ---------- */
    let talkUntil = 0, waveUntil = 0, blinkAt = now() + 2500, lastFace = '', spoke = false, lastLine = '';
    function say(text) {
      lastLine = text; bub.textContent = text; bub.scrollTop = 0;
      talkUntil = now() + Math.min(7000, 500 + text.length * 55);
      if (opts.talk) spoke = api.say(text, { pitch: 1.5, rate: 1.02 }) || spoke;
    }
    function face(t) {
      const f = { mouth: t < talkUntil && Math.floor(t / 130) % 2 === 0, blink: t > blinkAt && t < blinkAt + 150, happy: t < waveUntil, wave: t < waveUntil ? 1 + Math.floor(t / 180) % 2 : 0 };
      if (t > blinkAt + 150) blinkAt = t + rnd(2000, 4500);
      const k = JSON.stringify(f); if (k !== lastFace) { lastFace = k; drawClicky(cv, f); }
    }
    const cheer = ms => { waveUntil = now() + (ms || 1600); };

    /* ---------- the stage: parts, timers, pointer routing ---------- */
    let view = 'home', lessonIdx = 0, partIdx = 0, runStars = 0, part = null, token = 0, finishing = false;
    const timers = new Set(); let cleanups = [];
    const hinted = {};
    function clearStage() {
      token++; timers.forEach(clearTimeout); timers.clear();
      cleanups.forEach(f => { try { f(); } catch (e) { /* ignore */ } }); cleanups = [];
      part = null; finishing = false; play.innerHTML = ''; play.className = 'mt-play'; play.scrollTop = 0; pgEl.textContent = '';
    }
    const scaleK = () => { const r = play.getBoundingClientRect(); return (r.width / (play.clientWidth || 1)) || 1; };
    function pt(e) { const r = play.getBoundingClientRect(), k = scaleK(); return { x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k }; }
    function mk(cls, html, parent) { const d = document.createElement('div'); d.className = cls; if (html) d.innerHTML = html; (parent || play).appendChild(d); return d; }
    const put = (el, x, y, w, h) => { Object.assign(el.style, { left: (x - w / 2) + 'px', top: (y - h / 2) + 'px', width: w + 'px', height: h + 'px' }); };
    function burst(x, y, text) {
      const r = mk('mt-ring'); r.style.left = x + 'px'; r.style.top = y + 'px';
      const t = text ? mk('mt-burst', '') : null; if (t) { t.textContent = text; t.style.left = x + 'px'; t.style.top = y + 'px'; }
      setTimeout(() => { r.remove(); t && t.remove(); }, 820);
    }
    function dragOn(el, fns) {
      el.addEventListener('pointerdown', e => {
        if (e.button > 0) return;
        e.preventDefault();
        if (fns.can && !fns.can(e)) return;
        const sx = e.clientX, sy = e.clientY, k = scaleK();
        try { el.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        fns.start && fns.start(e);
        const mv = ev => fns.move && fns.move((ev.clientX - sx) / k, (ev.clientY - sy) / k, ev);
        const up = ev => { el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); fns.end && fns.end((ev.clientX - sx) / k, (ev.clientY - sy) / k, ev); };
        el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
      });
    }
    // a forgiving double-click detector (double-tap on touch) that works on any element
    function doubleOn(el, onDouble, onFirst, onSlow) {
      let last = 0;
      el.addEventListener('pointerdown', e => {
        if (e.button > 0) return;
        const t = now();
        if (last && t - last <= opts.dbl) { last = 0; onDouble(e); return; }
        last = t; onFirst && onFirst(e);
        const my = last, tk = token;
        setTimeout(() => { if (tk === token && last === my) { last = 0; onSlow && onSlow(); } }, opts.dbl + 60);
      });
    }
    play.addEventListener('pointerdown', e => { touchy = e.pointerType === 'touch' || (e.pointerType === 'pen' ? touchy : false); if (part && part.down) part.down(pt(e), e); });
    play.addEventListener('pointermove', e => { if (part && part.move) part.move(pt(e), e); });
    play.addEventListener('pointerup', e => { if (part && part.up) part.up(pt(e), e); });
    play.addEventListener('pointercancel', e => { if (part && part.up) part.up(pt(e), e); });
    play.addEventListener('contextmenu', e => { if (view === 'lesson') e.preventDefault(); });

    function makeCtx() {
      const tk = token;
      return {
        play, W: () => play.clientWidth, H: () => play.clientHeight,
        later(fn, ms) { const id = setTimeout(() => { timers.delete(id); if (tk === token) fn(); }, ms); timers.add(id); return id; },
        onEnd(fn) { cleanups.push(fn); },
        live: () => tk === token,
        bg(cls) { play.className = 'mt-play ' + cls; },
        say(m, t) { say(L(m, t)); },
        hint(key, m, t) { if (hinted[key] && now() - hinted[key] < 6000) return; hinted[key] = now(); say(L(m, t)); },
        progress(n, total, word) { pgEl.textContent = `${word || 'Done'}: ${n} of ${total}`; },
        star() { awardStar(); },
        done() { partDone(); }
      };
    }
    function spot(c, r, avoid) {
      let best = null;
      for (let i = 0; i < 60; i++) {
        const p = { x: rnd(r, Math.max(r + 1, c.W() - r)), y: rnd(r, Math.max(r + 1, c.H() - r)) };
        const ok = avoid.every(o => o.rect ? (p.x + r < o.x || p.x - r > o.x + o.w || p.y + r < o.y || p.y - r > o.y + o.h) : Math.hypot(p.x - o.x, p.y - o.y) > r + (o.r || 30) + 8);
        best = p; if (ok) break;
      }
      return best;
    }

    /* ---------- Lesson 1: pointing ---------- */
    function partBubbles(n, r, mode) {
      return c => {
        c.bg('mt-bg-bubble');
        let popped = 0, made = 0; const live = [];
        function spawn() {
          if (made >= n || !c.live()) return; made++;
          const p = spot(c, r + 4, live);
          const a = Math.random() * TAU;
          const b = { r, x: p.x, y: p.y, vx: mode === 'wander' ? Math.cos(a) * 45 : 0, vy: mode === 'wander' ? Math.sin(a) * 45 : mode === 'float' ? -rnd(24, 36) : 0, ph: Math.random() * TAU };
          b.el = mk('mt-bubble'); put(b.el, b.x, b.y, r * 2, r * 2); live.push(b);
        }
        for (let i = 0; i < (mode === 'still' ? 2 : 3); i++) spawn();
        c.progress(0, n, 'Popped');
        function hit(p) {
          for (let i = live.length - 1; i >= 0; i--) {
            const b = live[i];
            if (Math.hypot(p.x - b.x, p.y - b.y) > b.r + 6) continue;
            live.splice(i, 1); b.el.classList.add('mt-popping'); c.later(() => b.el.remove(), 260);
            burst(b.x, b.y, 'POP!'); snd.pop(); popped++; c.progress(popped, n, 'Popped');
            if (popped >= n) c.done(); else c.later(spawn, 380);
          }
        }
        return {
          down: hit, move: hit,
          tick(dt, t) {
            const Wd = c.W(), Hd = c.H();
            live.forEach(b => {
              if (mode === 'float') { b.y += b.vy * dt; b.x += Math.sin(t / 700 + b.ph) * 18 * dt; if (b.y < -b.r) { b.y = Hd + b.r; b.x = rnd(b.r, Wd - b.r); } }
              if (mode === 'wander') {
                b.x += b.vx * dt; b.y += b.vy * dt;
                if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx); } if (b.x > Wd - b.r) { b.x = Wd - b.r; b.vx = -Math.abs(b.vx); }
                if (b.y < b.r) { b.y = b.r; b.vy = Math.abs(b.vy); } if (b.y > Hd - b.r) { b.y = Hd - b.r; b.vy = -Math.abs(b.vy); }
              }
              b.x = clamp(b.x, b.r, Math.max(b.r, Wd - b.r));
              b.el.style.left = (b.x - b.r) + 'px'; b.el.style.top = (b.y - b.r) + 'px';
            });
          }
        };
      };
    }

    /* ---------- Lesson 2: clicking ---------- */
    function partFlyers(n, speed, kind) {
      return c => {
        c.bg(kind === 'bug' ? 'mt-bg-night' : 'mt-bg-sky');
        const R = kind === 'bug' ? 28 : 30, live = [];
        let caught = 0, hover = 0, mouse = null;
        const jar = kind === 'bug' ? mk('mt-jar', jarSVG) : null;
        const COLORS = ['#ff5555', '#5555ff', '#ffff55', '#55ff55', '#ff55ff', '#ffaa00'];
        for (let i = 0; i < n; i++) {
          const p = spot(c, 40, live.concat(jar ? [{ rect: 1, x: c.W() - 90, y: c.H() - 100, w: 90, h: 100 }] : []));
          const f = { x: p.x, y: kind === 'bug' ? p.y : c.H() * (0.3 + 0.75 * i / n) + rnd(0, 30), a: Math.random() * TAU, s: speed * rnd(0.8, 1.2), ph: Math.random() * TAU };
          f.el = mk('mt-ent ' + (kind === 'bug' ? 'mt-bug' : 'mt-balloon'), kind === 'bug' ? bugSVG : balloonSVG(COLORS[i % COLORS.length]));
          f.w = kind === 'bug' ? 56 : 52; f.h = kind === 'bug' ? 56 : 88;
          live.push(f);
        }
        c.progress(0, n, kind === 'bug' ? 'Caught' : 'Popped');
        const cy = f => kind === 'bug' ? f.y : f.y - 14;   // a balloon's hit spot is its round part
        function catchIt(f) {
          live.splice(live.indexOf(f), 1); caught++;
          c.progress(caught, n, kind === 'bug' ? 'Caught' : 'Popped');
          if (kind === 'bug') {
            snd.catch(); f.el.classList.remove('mt-lit');
            f.el.style.transition = 'left .5s, top .5s, width .5s, height .5s';
            put(f.el, c.W() - 42, c.H() - 40, 16, 16);
            c.later(() => { f.el.remove(); const d = document.createElement('i'); d.style.left = rnd(12, 44) + 'px'; d.style.top = rnd(30, 64) + 'px'; jar.appendChild(d); }, 520);
          } else { snd.pop(); burst(f.x, cy(f), 'POP!'); f.el.remove(); }
          if (caught >= n) c.later(() => c.done(), 400);
        }
        return {
          down(p) {
            let best = null, bd = 1e9;
            live.forEach(f => { const d = Math.hypot(p.x - f.x, p.y - cy(f)); if (d < R + 12 && d < bd) { bd = d; best = f; } });
            if (best) catchIt(best); else { snd.miss(); burst(p.x, p.y, ''); }
          },
          move(p, e) { mouse = e.pointerType === 'mouse' ? p : null; },
          tick(dt, t) {
            const Wd = c.W(), Hd = c.H(); let over = false;
            live.forEach(f => {
              if (kind === 'bug') {
                f.a += (Math.random() - 0.5) * dt * 4;
                f.x += Math.cos(f.a) * f.s * dt; f.y += Math.sin(f.a) * f.s * dt;
                if (f.x < R) { f.x = R; f.a = Math.PI - f.a; } if (f.x > Wd - R) { f.x = Wd - R; f.a = Math.PI - f.a; }
                if (f.y < R) { f.y = R; f.a = -f.a; } if (f.y > Hd - R) { f.y = Hd - R; f.a = -f.a; }
              } else {
                f.y -= f.s * dt; f.x += Math.sin(t / 600 + f.ph) * 14 * dt;
                if (f.y < -50) { f.y = Hd + 50; f.x = rnd(30, Math.max(31, Wd - 30)); }
                f.x = clamp(f.x, 26, Math.max(26, Wd - 26));
              }
              const lit = !!mouse && Math.hypot(mouse.x - f.x, mouse.y - cy(f)) < R + 12;
              if (lit) over = true;
              f.el.classList.toggle('mt-lit', lit);
              f.el.style.left = (f.x - f.w / 2) + 'px'; f.el.style.top = (f.y - f.h / 2) + 'px'; f.el.style.width = f.w + 'px'; f.el.style.height = f.h + 'px';
            });
            hover = over ? hover + dt : 0;
            if (hover > 1.6) { hover = 0; c.hint('click-now', 'You\'re pointing at it! Now press the mouse button and let go. That\'s a click.'); }
          }
        };
      };
    }

    /* ---------- Lesson 3: double-clicking ---------- */
    const GIFT_COL = [['#ff5555', '#ffff55'], ['#5555ff', '#ff55ff'], ['#55ff55', '#ff5555'], ['#ffaa00', '#5555ff']];
    function partGifts(n) {
      return c => {
        c.bg('mt-bg-gift');
        const boxes = []; let opened = 0, slow = 0;
        const cols = Math.max(1, Math.min(n, Math.floor((c.W() - 10) / 118))), rows = Math.ceil(n / cols);
        const cw = c.W() / cols, ch = Math.min(220, c.H() / rows), top = (c.H() - ch * rows) / 2;
        const gs = Math.round(clamp(Math.min(cw, ch - 30) * 0.62, 90, 150));
        for (let i = 0; i < n; i++) {
          const col = i % cols, row = Math.floor(i / cols);
          const inRow = Math.min(cols, n - row * cols), off = (cols - inRow) * cw / 2;
          const [bc, rc] = GIFT_COL[(i + n) % GIFT_COL.length];
          const b = { x: off + cw * (col + 0.5), y: top + ch * (row + 0.5), t: 0, open: false, prize: (i + n * 2) % PRIZES.length };
          b.el = mk('mt-gift', giftSVG(bc, rc) + '<div class="mt-meter"><i></i></div>');
          b.el.style.setProperty('--gs', gs + 'px'); b.el.style.left = (b.x - gs / 2) + 'px'; b.el.style.top = (b.y - gs / 2 - 12) + 'px';
          boxes.push(b);
        }
        c.progress(0, n, 'Opened');
        function openBox(b) {
          b.open = true; b.t = 0; b.el.classList.add('mt-open'); b.el.classList.remove('mt-armed');
          mk('mt-prize', prizeSVG(b.prize), b.el); snd.open(); burst(b.x, b.y - gs / 2, 'Hooray!');
          opened++; c.progress(opened, n, 'Opened');
          if (opened >= n) c.later(() => c.done(), 700);
        }
        return {
          down(p) {
            const b = boxes.find(q => !q.open && Math.abs(p.x - q.x) < gs / 2 + 10 && Math.abs(p.y - q.y) < gs / 2 + 22);
            if (!b) { snd.miss(); burst(p.x, p.y, ''); return; }
            const t = now();
            if (b.t && t - b.t <= opts.dbl) { openBox(b); return; }
            b.t = t; snd.click();
            b.el.classList.remove('mt-wig'); void b.el.offsetWidth; b.el.classList.add('mt-wig', 'mt-armed');
          },
          tick() {
            const t = now();
            boxes.forEach(b => {
              if (!b.t) return;
              const f = 1 - (t - b.t) / opts.dbl;
              if (f <= 0) {
                b.t = 0; b.el.classList.remove('mt-armed'); slow++;
                if (slow === 1 || slow % 3 === 0) c.hint('dbl-slow', 'Almost! Click two times, a bit quicker: click-click! Before the green bar runs out.', 'Almost! Tap two times, a bit quicker: tap-tap! Before the green bar runs out.');
                return;
              }
              const fill = b.el.querySelector('.mt-meter i'); fill.style.width = (f * 100) + '%'; fill.style.background = f > 0.35 ? '#55ff55' : '#ffff55';
            });
          }
        };
      };
    }

    /* ---------- Lesson 4: dragging ---------- */
    const SOCKS = [['#5555ff', '#ffffff'], ['#ff5555', '#ffff55'], ['#55ff55', '#5555ff'], ['#ff55ff', '#ffffff'], ['#ffaa00', '#aa0000']];
    function partDrag(kind, n) {
      return c => {
        c.bg('mt-bg-laundry');
        const Wd = c.W(), Hd = c.H(), items = []; let placed = 0, drag = null;
        const puzzle = kind === 'puzzle', narrow = Wd < 440;
        let targets = [];
        if (!puzzle) {
          const bw = Math.min(150, Wd * 0.4), bh = bw * 0.75;
          const bx = narrow ? (Wd - bw) / 2 : Wd - bw - 14, by = Hd - bh - 6;
          const bk = mk('mt-ent', basketSVG); Object.assign(bk.style, { left: bx + 'px', top: by + 'px', width: bw + 'px', height: bh + 'px' });
          const lb = mk('mt-label', 'Laundry basket'); lb.style.left = (bx + 6) + 'px'; lb.style.top = (by - 22) + 'px';
          targets = [{ x: bx, y: by, w: bw, h: bh }];
        } else {
          const SH = ['<rect x="4" y="4" width="40" height="40" fill="F" stroke="S" stroke-width="3" D/>', '<circle cx="24" cy="24" r="20" fill="F" stroke="S" stroke-width="3" D/>', '<polygon points="24,3 45,44 3,44" fill="F" stroke="S" stroke-width="3" D/>'];
          const COL = ['#ff5555', '#ffff55', '#5555ff'];
          const fw = narrow ? Wd - 20 : 110, fh = narrow ? 96 : Math.min(Hd - 20, 330);
          const fx = narrow ? 10 : Wd - fw - 12, fy = narrow ? Hd - fh - 8 : (Hd - fh) / 2;
          const fr = mk('mt-frame'); Object.assign(fr.style, { left: fx + 'px', top: fy + 'px', width: fw + 'px', height: fh + 'px' });
          const order = [2, 0, 1];
          order.forEach((s, i) => {
            const cx = narrow ? fx + fw * (i + 0.5) / 3 : fx + fw / 2, cy = narrow ? fy + fh / 2 : fy + fh * (i + 0.5) / 3;
            const sl = mk('mt-slot', `<svg viewBox="0 0 48 48">${SH[s].replace('fill="F"', 'fill="#eee"').replace('S', '#808080').replace('D', 'stroke-dasharray="5 4"')}</svg>`);
            put(sl, cx, cy, 70, 70);
            targets.push({ x: cx - 35, y: cy - 35, w: 70, h: 70, shape: s, cx, cy });
          });
          SH.forEach((sh, s) => { items.push({ w: 70, h: 70, shape: s, html: `<svg viewBox="0 0 48 48">${sh.replace('F', COL[s]).replace('S', '#000').replace('D', '')}</svg>` }); });
        }
        if (!puzzle) for (let i = 0; i < n; i++) { const [a, b] = SOCKS[(i + n) % SOCKS.length]; items.push({ w: 56, h: 72, html: sockSVG(a, b) }); }
        const avoid = targets.map(t => ({ rect: 1, x: t.x - 20, y: t.y - (puzzle ? 20 : 34), w: t.w + 40, h: t.h + 54 }));
        if (puzzle) { const t0 = targets[0], t2 = targets[2]; avoid.length = 0; avoid.push({ rect: 1, x: Math.min(t0.x, t2.x) - 24, y: Math.min(t0.y, t2.y) - 24, w: Math.abs(t2.x - t0.x) + 118, h: Math.abs(t2.y - t0.y) + 118 }); }
        items.forEach(it => {
          const p = spot(c, 46, avoid.concat(items.filter(o => o.x != null)));
          it.x = p.x; it.y = p.y; it.r = 40;
          it.el = mk('mt-ent', it.html); put(it.el, it.x, it.y, it.w, it.h);
          it.el.style.transform = `rotate(${rnd(-20, 20)}deg)`;
        });
        c.progress(0, items.length, puzzle ? 'Fitted' : 'In the basket');
        const inside = (it, t, pad) => it.x > t.x - pad && it.x < t.x + t.w + pad && it.y > t.y - pad && it.y < t.y + t.h + pad;
        return {
          down(p, e) {
            const it = items.slice().reverse().find(q => !q.done && Math.abs(p.x - q.x) < q.w / 2 + 10 && Math.abs(p.y - q.y) < q.h / 2 + 10);
            if (!it) return;
            try { play.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
            drag = { it, dx: p.x - it.x, dy: p.y - it.y, sx: p.x, sy: p.y, moved: false, id: e.pointerId };
            it.el.classList.add('mt-lift'); it.el.style.transform = 'scale(1.12)'; play.appendChild(it.el); snd.click();
          },
          move(p, e) {
            if (!drag || e.pointerId !== drag.id) return;
            const it = drag.it;
            if (Math.hypot(p.x - drag.sx, p.y - drag.sy) > 6) drag.moved = true;
            it.x = clamp(p.x - drag.dx, it.w / 2, c.W() - it.w / 2); it.y = clamp(p.y - drag.dy, it.h / 2, c.H() - it.h / 2);
            it.el.style.left = (it.x - it.w / 2) + 'px'; it.el.style.top = (it.y - it.h / 2) + 'px';
          },
          up(p, e) {
            if (!drag || e.pointerId !== drag.id) return;
            const { it, moved } = drag; drag = null;
            it.el.classList.remove('mt-lift'); it.el.style.transform = '';
            let t = puzzle ? targets.find(q => inside(it, q, 12)) : (inside(it, targets[0], 18) ? targets[0] : null);
            if (t && puzzle && t.shape !== it.shape) { c.hint('wrong-shape', 'That shape doesn\'t fit there. Find the outline that matches it.'); t = null; snd.miss(); }
            if (t) {
              it.done = true; placed++; snd.drop();
              if (puzzle) { it.x = t.cx; it.y = t.cy; it.el.style.transition = 'left .15s, top .15s'; put(it.el, it.x, it.y, it.w, it.h); burst(it.x, it.y - 30, 'Fits!'); }
              else { it.el.style.transition = 'all .35s'; put(it.el, t.x + t.w / 2 + rnd(-20, 20), t.y + t.h * 0.45, it.w * 0.6, it.h * 0.6); it.el.style.opacity = '0.9'; burst(t.x + t.w / 2, t.y, 'Plop!'); c.later(() => { it.el.style.opacity = '0'; }, 500); }
              c.progress(placed, items.length, puzzle ? 'Fitted' : 'In the basket');
              if (placed >= items.length) c.later(() => c.done(), 500);
            } else if (!moved) {
              c.hint('hold', 'Keep the button pressed down while you move the mouse. Let go over the basket.', 'Keep your finger pressed down and slide it. Lift your finger over the basket.');
            }
          }
        };
      };
    }

    /* ---------- mini windows, menus and scroll bars (lessons 5 to 7) ---------- */
    function makeWin(o) {
      const lab = { min: ['Minimize', '_'], max: ['Maximize', '□'], close: ['Close', '×'] };
      const el = mk('mt-mw', `<div class="mt-mwtb"><span class="mt-mwt"></span>${(o.btns || []).map(b => `<button class="mt-mwb" data-a="${b}" aria-label="${lab[b][0]}" title="${lab[b][0]}">${lab[b][1]}</button>`).join('')}</div><div class="mt-mwbody"></div>${o.grip ? '<div class="mt-mwgrip" aria-hidden="true"></div>' : ''}`);
      el.querySelector('.mt-mwt').textContent = o.title;
      const w = {
        el, tb: el.querySelector('.mt-mwtb'), body: el.querySelector('.mt-mwbody'), grip: el.querySelector('.mt-mwgrip'),
        btn: a => el.querySelector(`[data-a="${a}"]`), x: 0, y: 0, w: 0, h: 0,
        set(x, y, ww, hh) { if (x != null) { w.x = x; w.y = y; } if (ww != null) { w.w = ww; w.h = hh; } Object.assign(el.style, { left: w.x + 'px', top: w.y + 'px', width: w.w + 'px', height: w.h + 'px' }); }
      };
      w.set(o.x, o.y, o.w, o.h);
      return w;
    }
    function makeMenus(win, spec, onPick, onOpen) {
      const bar = document.createElement('div'); bar.className = 'mt-mbar'; win.el.insertBefore(bar, win.body);
      let dd = null, openIdx = -1;
      function close() { if (dd) { dd.remove(); dd = null; } openIdx = -1; bar.querySelectorAll('.mt-on').forEach(b => b.classList.remove('mt-on')); }
      function openM(i, b) {
        close(); openIdx = i; b.classList.add('mt-on'); snd.click();
        dd = document.createElement('div'); dd.className = 'mt-dd'; dd.setAttribute('role', 'menu');
        const items = typeof spec[i].items === 'function' ? spec[i].items() : spec[i].items;
        items.forEach(it => {
          const ib = document.createElement('button'); ib.className = 'mt-mitem'; ib.setAttribute('role', 'menuitem');
          ib.innerHTML = `${it.sw ? `<i class="mt-sw" style="background:${it.sw}"></i>` : ''}<span>${esc(it.label)}</span>${it.check ? checkSVG : ''}`;
          if (it.disabled) ib.disabled = true;
          ib.onclick = e => { e.stopPropagation(); close(); snd.click(); onPick(it.id); };
          dd.appendChild(ib);
        });
        dd.style.left = b.offsetLeft + 'px'; dd.style.top = (bar.offsetTop + bar.offsetHeight) + 'px';
        win.el.appendChild(dd);
        onOpen && onOpen(spec[i].label);
      }
      spec.forEach((m, i) => {
        const b = document.createElement('button'); b.className = 'mt-mt'; b.textContent = m.label;
        b.onclick = e => { e.stopPropagation(); if (openIdx === i) close(); else openM(i, b); };
        b.addEventListener('pointerenter', e => { if (openIdx >= 0 && openIdx !== i && e.pointerType === 'mouse') openM(i, b); });
        bar.appendChild(b);
      });
      return { close, isOpen: () => openIdx >= 0 };
    }
    function makeScroller(c, host, html, onTap) {
      host.classList.add('mt-scrollhost');
      host.innerHTML = `<div class="mt-sv"><div class="mt-sc">${html}</div></div><div class="mt-sb"><button class="mt-sba" data-d="-1" aria-label="Scroll up">${triSVG(true)}</button><div class="mt-sbt"><div class="mt-sbh"></div></div><button class="mt-sba" data-d="1" aria-label="Scroll down">${triSVG(false)}</button></div>`;
      const vw = host.querySelector('.mt-sv'), cont = host.querySelector('.mt-sc'), track = host.querySelector('.mt-sbt'), thumb = host.querySelector('.mt-sbh');
      let sy = 0, th = 30;
      const max = () => Math.max(0, cont.offsetHeight - vw.clientHeight);
      function set(v) {
        sy = clamp(v, 0, max()); cont.style.transform = `translateY(${-sy}px)`;
        const tH = track.clientHeight;
        th = Math.max(30, Math.min(tH, tH * vw.clientHeight / Math.max(1, cont.offsetHeight)));
        thumb.style.height = th + 'px'; thumb.style.top = ((tH - th) * (max() ? sy / max() : 0)) + 'px';
      }
      host.querySelectorAll('.mt-sba').forEach(b => {
        let hold = 0, rep = 0;
        const d = +b.dataset.d, stop = () => { clearTimeout(hold); clearInterval(rep); };
        c.onEnd(stop);
        b.addEventListener('pointerdown', e => { e.preventDefault(); stop(); set(sy + d * 40); snd.tick(); hold = setTimeout(() => { rep = setInterval(() => set(sy + d * 16), 50); }, 380); });
        ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, stop));
        b.addEventListener('click', e => { if (e.detail === 0) set(sy + d * 40); });
      });
      track.addEventListener('pointerdown', e => {
        if (e.target === thumb) return;
        const r = track.getBoundingClientRect(), y = (e.clientY - r.top) / scaleK();
        set(sy + (y < parseFloat(thumb.style.top) ? -1 : 1) * vw.clientHeight * 0.8); snd.tick();
      });
      let s0 = 0;
      dragOn(thumb, { start() { s0 = sy; }, move(dx, dy) { const room = track.clientHeight - th; set(s0 + (room > 0 ? dy * max() / room : 0)); } });
      vw.addEventListener('wheel', e => { e.preventDefault(); set(sy + (e.deltaMode === 1 ? e.deltaY * 20 : e.deltaY)); }, { passive: false });
      vw.addEventListener('pointerdown', e => {
        if (e.button > 0) return;
        const y0 = e.clientY, st = sy, tgt = e.target, k = scaleK(); let moved = false;
        try { vw.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        const mv = ev => { const dy = (ev.clientY - y0) / k; if (Math.abs(dy) > 8) moved = true; if (moved) set(st - dy); };
        const up = () => {
          vw.removeEventListener('pointermove', mv); vw.removeEventListener('pointerup', up); vw.removeEventListener('pointercancel', up);
          if (!moved) { const t = tgt.closest && tgt.closest('[data-tap]'); onTap(t ? t.dataset.tap : null, t); }
        };
        vw.addEventListener('pointermove', mv); vw.addEventListener('pointerup', up); vw.addEventListener('pointercancel', up);
      });
      set(0);
      return { set, get: () => sy, max, refresh: () => set(sy) };
    }

    /* ---------- Lesson 5: windows ---------- */
    function partWinMove(c) {
      c.bg('mt-bg-desk');
      const w = Math.min(190, Math.round(c.W() * 0.48)), h = 120;
      const tx = c.W() - w - 14, ty = c.H() - h - 14;
      const tg = mk('mt-target', '<span>Put the<br>window here</span>'); Object.assign(tg.style, { left: tx + 'px', top: ty + 'px', width: w + 'px', height: h + 'px' });
      const win = makeWin({ title: 'Notes', x: 14, y: 14, w, h });
      win.body.innerHTML = '<div class="mt-note">Drag me by my title bar!</div>';
      let ox = 0, oy = 0, done = false;
      const near = () => Math.abs(win.x - tx) < 30 && Math.abs(win.y - ty) < 30;
      dragOn(win.tb, {
        can: () => !done,
        start() { ox = win.x; oy = win.y; win.el.classList.add('mt-lift'); },
        move(dx, dy) { win.set(clamp(ox + dx, 0, c.W() - w), clamp(oy + dy, 0, c.H() - h)); tg.classList.toggle('mt-near', near()); },
        end() {
          win.el.classList.remove('mt-lift');
          if (near()) { done = true; win.set(tx, ty); snd.drop(); burst(tx + w / 2, ty, 'Perfect!'); c.later(() => c.done(), 300); }
        }
      });
      win.body.addEventListener('pointerdown', () => c.hint('grab-tb', 'Grab the window by its title bar: the dark blue strip at the top that says Notes.'));
      return {};
    }
    function partWinSize(c) {
      c.bg('mt-bg-desk');
      const x = 14, y = 14, tw = Math.min(c.W() - 28, 320), th = Math.min(c.H() - 28, 230);
      const tg = mk('mt-target', ''); Object.assign(tg.style, { left: x + 'px', top: y + 'px', width: tw + 'px', height: th + 'px' });
      const lb = mk('mt-label', 'Make the window this big'); lb.style.right = (c.W() - x - tw + 6) + 'px'; lb.style.top = (y + th - 28) + 'px';
      const win = makeWin({ title: 'Notes', x, y, w: Math.min(150, tw - 70), h: Math.min(100, th - 60), grip: true });
      win.body.innerHTML = '<div class="mt-note">Drag my bottom-right corner to make me bigger.</div>';
      let ow = 0, oh = 0, done = false;
      const big = () => win.w >= tw - 16 && win.h >= th - 16;
      dragOn(win.grip, {
        can: () => !done,
        start() { ow = win.w; oh = win.h; },
        move(dx, dy) { win.set(null, null, clamp(ow + dx, 110, c.W() - x - 2), clamp(oh + dy, 80, c.H() - y - 2)); tg.classList.toggle('mt-near', big()); },
        end() { if (big()) { done = true; win.set(null, null, tw, th); snd.drop(); burst(x + tw / 2, y + th / 2, 'Just right!'); c.later(() => c.done(), 300); } }
      });
      win.tb.addEventListener('pointerdown', () => c.hint('use-corner', 'This time, use the corner! Drag the striped square at the bottom right of the window.'));
      return {};
    }
    function partWinMinMax(c) {
      c.bg('mt-bg-desk');
      const LINES = [
        ['Click the Minimize button, the one with a little line, to shrink the window down to an icon.', 'Tap the Minimize button, the one with a little line, to shrink the window down to an icon.'],
        ['The window is hiding as an icon at the bottom. Double-click the icon to open it again.', 'The window is hiding as an icon at the bottom. Double-tap the icon to open it again.'],
        ['Now click the Maximize button, the one with a box, to make the window fill the whole screen.', 'Now tap the Maximize button, the one with a box, to make the window fill the whole screen.'],
        ['Big! To put it back the way it was, click the Restore button, the same button with two boxes.', 'Big! To put it back the way it was, tap the Restore button, the same button with two boxes.']
      ];
      let step = 0, maxed = false, prev = null;
      const go = s => { step = s; c.say(...LINES[s]); c.progress(s, 4, 'Step'); };
      const w = Math.min(210, c.W() - 40), h = 130;
      const win = makeWin({ title: 'Notes', x: (c.W() - w) / 2, y: Math.max(8, (c.H() - h) / 2 - 30), w, h, btns: ['min', 'max'] });
      win.body.innerHTML = '<div class="mt-note">Every window has these buttons in its top corner.</div>';
      const icon = mk('mt-dicon', winIconSVG('#000080') + '<span>Notes</span>'); icon.style.left = '10px'; icon.style.top = (c.H() - 84) + 'px'; icon.style.display = 'none';
      win.btn('min').onclick = () => {
        snd.click(); win.el.classList.add('mt-gone');
        c.later(() => { win.el.style.display = 'none'; win.el.classList.remove('mt-gone'); icon.style.display = ''; }, 280);
        if (step === 0) go(1); else if (step > 1) { c.say('It went back to an icon. Double-click it to bring it back.', 'It went back to an icon. Double-tap it to bring it back.'); step = 1; }
      };
      doubleOn(icon, () => {
        icon.classList.remove('mt-sel'); icon.style.display = 'none'; win.el.style.display = ''; snd.open();
        if (step === 1) go(maxed ? 3 : 2);
      }, () => { icon.classList.add('mt-sel'); snd.click(); }, () => c.hint('icon-slow', 'Good, you picked it. Now click twice, quickly, to open it.', 'Good, you picked it. Now tap twice, quickly, to open it.'));
      win.btn('max').onclick = () => {
        snd.click();
        if (!maxed) {
          prev = [win.x, win.y, win.w, win.h]; win.set(0, 0, c.W(), c.H()); maxed = true; win.btn('max').textContent = '❐'; win.btn('max').title = 'Restore';
          if (step === 2) go(3);
        } else {
          win.set(...prev); maxed = false; win.btn('max').textContent = '□'; win.btn('max').title = 'Maximize';
          if (step === 3) { c.progress(4, 4, 'Step'); burst(win.x + win.w / 2, win.y + 20, 'Nice!'); c.later(() => c.done(), 300); }
        }
      };
      go(0);
      return { quiet: true };
    }

    /* ---------- Lesson 6: menus and scroll bars ---------- */
    let pic = { wall: '#ffffff', sun: false, tree: false, cheese: false };
    function partMenus(which) {
      return c => {
        c.bg('mt-bg-desk');
        if (which === 0) pic = { wall: '#ffffff', sun: false, tree: false, cheese: false };
        const w = Math.min(c.W() - 16, 420), h = Math.min(c.H() - 16, 300);
        const win = makeWin({ title: 'Picture', x: (c.W() - w) / 2, y: (c.H() - h) / 2, w, h });
        const draw = () => { win.body.innerHTML = `<div class="mt-pic">${houseSVG(pic)}</div>`; };
        draw();
        const COLORS = [['Red', '#ff5555'], ['Blue', '#5555ff'], ['Yellow', '#ffff55'], ['Green', '#55ff55'], ['Pink', '#ff99cc']];
        let opened = false;
        const menus = makeMenus(win, [
          { label: 'File', items: [{ id: 'new', label: 'New picture' }, { id: 'print', label: 'Print', disabled: true }] },
          { label: 'Paint', items: () => COLORS.map(([n, col]) => ({ id: 'paint:' + col, label: n, sw: col, check: pic.wall === col })) },
          { label: 'Picture', items: () => [{ id: 'sun', label: 'Add the sun', check: pic.sun }, { id: 'tree', label: 'Add a tree', check: pic.tree }, { id: 'cheese', label: 'Add some cheese', check: pic.cheese }] },
          { label: 'Help', items: [{ id: 'about', label: 'About Picture' }] }
        ], id => {
          if (id === 'new') { pic = { wall: '#ffffff', sun: false, tree: false, cheese: false }; draw(); return; }
          if (id === 'about') { c.say('Picture: a tiny paint program for practicing menus. Some menu items are gray, like Print. Gray items can\'t be picked right now.'); return; }
          if (id.startsWith('paint:')) {
            pic.wall = id.slice(6); draw(); burst(c.W() / 2, c.H() / 2, 'Painted!');
            if (which === 0) c.later(() => c.done(), 300);
            return;
          }
          pic[id] = true; draw();
          if (id === 'cheese') c.hint('cheese', 'Cheese! My favorite. Thank you!');
          if (which === 1) {
            c.progress((pic.sun ? 1 : 0) + (pic.tree ? 1 : 0), 2, 'Added');
            if (pic.sun && pic.tree) c.later(() => c.done(), 300);
            else if (id === 'sun' || id === 'tree') c.say(`Now open the Picture menu again and add ${pic.sun ? 'a tree' : 'the sun'}.`);
          }
        }, label => {
          if (!opened && which === 0 && label === 'Paint') { opened = true; c.say('The menu is open! Now click a color.', 'The menu is open! Now tap a color.'); }
          else if (which === 0 && label !== 'Paint') c.hint('not-paint', 'That\'s a different menu. Look for the word Paint.');
          else if (which === 1 && label !== 'Picture') c.hint('not-pic', 'That\'s a different menu. Look for the word Picture.');
        });
        if (which === 1) c.progress((pic.sun ? 1 : 0) + (pic.tree ? 1 : 0), 2, 'Added');
        return { down(p, e) { if (!e.target.closest('.mt-mbar') && !e.target.closest('.mt-dd')) menus.close(); } };
      };
    }
    const TOYS = [['ball', '#ff5555'], ['blocks', '#5555ff'], ['yo-yo', '#ff55ff'], ['kite', '#55ffff'], ['spinning top', '#ffaa00'], ['drum', '#aa0000'], ['toy boat', '#0000aa'], ['toy car', '#ff5555'], ['train', '#00aa00'], ['robot', '#808080'], ['teddy bear', '#aa5500'], ['jump rope', '#ff55ff'], ['crayons', '#ffff55'], ['marbles', '#55ff55'], ['whistle', '#c0c0c0'], ['puzzle', '#5555ff'], ['rocket', '#ff5555'], ['dinosaur', '#00aa00'], ['bell', '#ffd700'], ['paint set', '#aa00aa'], ['sock', '#ffffff'], ['toy piano', '#000000']];
    function partScroll(c) {
      c.bg('mt-bg-desk');
      const w = Math.min(c.W() - 16, 330), h = Math.min(c.H() - 16, 300);
      const win = makeWin({ title: 'Toy Box', x: (c.W() - w) / 2, y: (c.H() - h) / 2, w, h });
      const GOLD = 18;
      const rows = TOYS.map(([n, col], i) => (i === GOLD ? `<div class="mt-row mt-gold" data-tap="gold">${chestSVG(false)}<span>Treasure chest!</span></div>` : '') + `<div class="mt-row" data-tap="toy:${n}"><i style="background:${col}"></i>${esc(n)}</div>`).join('');
      let found = false;
      const sc = makeScroller(c, win.body, rows, (id, el) => {
        if (found) return;
        if (id === 'gold') { found = true; el.innerHTML = chestSVG(true) + '<span>You found it!</span>'; snd.win(); c.progress(1, 1, 'Found'); c.later(() => c.done(), 700); }
        else if (id) c.hint('toy', `That's the ${id.slice(4)}. Keep scrolling down to find the treasure!`);
      });
      c.progress(0, 1, 'Found');
      let told = false;
      return {
        tick() { if (!told && sc.get() > 200) { told = true; c.hint('scroll-ok', 'That\'s it, the list is moving! Keep going down.'); } },
        resize() { sc.refresh(); }
      };
    }

    /* ---------- Lesson 7: the treasure hunt ---------- */
    function partFinal(c) {
      c.bg('mt-bg-desk');
      const LINES = [
        ['Final challenge: the treasure hunt! First, point at the three bubbles to pop them.', 'Final challenge: the treasure hunt! First, touch the three bubbles to pop them.'],
        ['Now double-click the Map icon to open the map.', 'Now double-tap the Map icon to open the map.'],
        ['The map is so small! Open the View menu and choose Bigger.', 'The map is so small! Tap View at the top of the map, then tap Bigger.'],
        ['Scroll down the map to find the golden key, then click the key.', 'Scroll down the map to find the golden key, then tap the key.'],
        ['You have the key! Now close the map with the Close button, the X in the top corner.', 'You have the key! Now close the map with the Close button, the X in the top corner.'],
        ['Last step! Drag the key onto the treasure chest to unlock it.', 'Last step! Press and hold the key, then slide it onto the treasure chest.']
      ];
      let step = 0, popped = 0, mapWin = null, menus = null, sc = null, keyTaken = false;
      const go = s => { step = s; c.say(...LINES[s]); c.progress(s, 6, 'Step'); };
      const Wd = c.W(), Hd = c.H();
      const icon = mk('mt-dicon', winIconSVG('#008000') + '<span>Map</span>'); icon.style.left = '8px'; icon.style.top = '8px';
      const chest = mk('mt-chest', chestSVG(false)); const chx = Wd - 110, chy = Hd - 92;
      chest.style.left = chx + 'px'; chest.style.top = chy + 'px';
      const bubs = [];
      for (let i = 0; i < 3; i++) {
        const p = spot(c, 34, bubs.concat([{ rect: 1, x: 0, y: 0, w: 100, h: 100 }, { rect: 1, x: chx - 10, y: chy - 10, w: 120, h: 110 }]));
        const b = { x: p.x, y: p.y, r: 30, ox: p.x, oy: p.y, ph: Math.random() * TAU };
        b.el = mk('mt-bubble'); put(b.el, b.x, b.y, 60, 60); bubs.push(b);
      }
      function hit(p) {
        if (step !== 0) return;
        for (let i = bubs.length - 1; i >= 0; i--) {
          const b = bubs[i]; if (Math.hypot(p.x - b.x, p.y - b.y) > b.r + 6) continue;
          bubs.splice(i, 1); b.el.classList.add('mt-popping'); c.later(() => b.el.remove(), 260); burst(b.x, b.y, 'POP!'); snd.pop(); popped++;
          if (popped >= 3) go(1);
        }
      }
      const MAP = ['tree rock tree', 'flower flower hill', 'pond tree', 'rock flower rock', 'hill tree hill', 'tree pond', 'flower rock flower', 'tree tree hill', 'pond flower', 'rock tree rock', 'hill flower', 'tree KEY rock', 'flower pond'];
      function openMap() {
        const w = Math.min(230, Wd - 20), h = Math.min(170, Hd - 20);
        mapWin = makeWin({ title: 'Map', x: (Wd - w) / 2, y: Math.max(6, (Hd - h) / 2 - 20), w, h, btns: ['close'] });
        const small = [mapWin.x, mapWin.y, w, h];
        menus = makeMenus(mapWin, [{ label: 'View', items: [{ id: 'big', label: 'Bigger' }, { id: 'small', label: 'Smaller' }] }], id => {
          if (id === 'big') { mapWin.set(6, 6, Wd - 12, Hd - 12); if (step === 2) go(3); }
          else mapWin.set(...small);
          sc.refresh();
        }, () => { if (step === 2) c.hint('view-open', 'Now choose Bigger.', 'Now tap Bigger.'); });
        const html = MAP.map(r => `<div class="mt-maprow">${r.split(' ').map(k => k === 'KEY' ? (keyTaken ? '<div class="mt-keyspot"></div>' : `<div class="mt-keyspot" data-tap="key">${keySVG}</div>`) : TOOLS[k]).join('')}</div>`).join('');
        sc = makeScroller(c, mapWin.body, html, (id, el) => {
          if (id === 'key' && !keyTaken && step >= 2) {
            keyTaken = true; el.innerHTML = ''; el.removeAttribute('data-tap'); snd.catch(); burst(Wd / 2, Hd / 2, 'Got the key!'); c.star(); go(4);
          } else if (id === 'key') c.hint('key-early', 'Shh, not yet! First open the View menu and choose Bigger.');
          else if (!keyTaken) c.hint('map-tap', 'No key there. Keep scrolling down!');
        });
        mapWin.btn('close').onclick = () => {
          snd.click(); menus.close(); mapWin.el.remove(); mapWin = null; menus = null; sc = null;
          if (keyTaken) { showKey(); go(5); }
          else { c.say('Oops, the map closed. Double-click the Map icon to open it again.', 'Oops, the map closed. Double-tap the Map icon to open it again.'); step = 1; c.progress(1, 6, 'Step'); }
        };
        if (step === 1) { c.star(); go(2); }
      }
      doubleOn(icon, () => { icon.classList.remove('mt-sel'); if (step < 1) { c.hint('early', 'First, pop the three bubbles!'); return; } if (!mapWin) { snd.open(); openMap(); } },
        () => { icon.classList.add('mt-sel'); snd.click(); },
        () => { if (step === 1 && !mapWin) c.hint('map-slow', 'Click twice, quickly, to open it.', 'Tap twice, quickly, to open it.'); });
      function showKey() {
        const k = mk('mt-key', keySVG); let kx = 20, ky = 110; k.style.left = kx + 'px'; k.style.top = ky + 'px';
        let ox = 0, oy = 0, done = false;
        const over = () => kx + 38 > chx - 16 && kx + 38 < chx + 112 && ky + 20 > chy - 16 && ky + 20 < chy + 96;
        dragOn(k, {
          can: () => !done,
          start() { ox = kx; oy = ky; k.classList.add('mt-lift'); },
          move(dx, dy) { kx = clamp(ox + dx, 0, Wd - 76); ky = clamp(oy + dy, 0, Hd - 40); k.style.left = kx + 'px'; k.style.top = ky + 'px'; },
          end(dx, dy) {
            k.classList.remove('mt-lift');
            if (over()) { done = true; k.remove(); chest.innerHTML = chestSVG(true); snd.win(); burst(chx + 48, chy, 'Treasure!'); c.progress(6, 6, 'Step'); c.later(() => c.done(), 900); }
            else if (Math.hypot(dx, dy) < 6) c.hint('key-hold', 'Keep the button held down while you move the key.', 'Keep your finger down while you slide the key.');
          }
        });
      }
      go(0);
      return {
        quiet: true,
        down(p, e) { hit(p); if (menus && !e.target.closest('.mt-mbar') && !e.target.closest('.mt-dd')) menus.close(); },
        move: hit,
        tick(dt, t) { bubs.forEach(b => { b.x = b.ox + Math.sin(t / 900 + b.ph) * 12; b.y = b.oy + Math.cos(t / 1100 + b.ph) * 10; b.el.style.left = (b.x - 30) + 'px'; b.el.style.top = (b.y - 30) + 'px'; }); },
        resize() { if (sc) sc.refresh(); }
      };
    }

    /* ---------- the lesson plan ---------- */
    const PARTS = [
      [[partBubbles(5, 36, 'still'), 'Lesson 1: Pointing. When you slide the mouse on your desk, the arrow on the screen, called the pointer, slides too. Point at a bubble to pop it. No clicking needed!', 'Lesson 1: Pointing. On a computer you slide the mouse to move the pointer. On a touch screen, your finger is the pointer! Touch the bubbles, or slide your finger over them, to pop them.'],
        [partBubbles(6, 32, 'float'), 'These bubbles float up. Chase them with the pointer!', 'These bubbles float up. Chase them with your finger!'],
        [partBubbles(6, 28, 'wander'), 'Now they bounce around. Point at each one. Take your time, there\'s no hurry.', 'Now they bounce around. Touch each one. Take your time, there\'s no hurry.']],
      [[partFlyers(3, 28, 'bug'), 'Lesson 2: Clicking. Point at a firefly, then press the mouse button and let go. Click! That catches it in the jar.', 'Lesson 2: Clicking. On a touch screen, a quick tap is the same as a click. Tap a firefly to catch it in the jar.'],
        [partFlyers(5, 46, 'bug'), 'More fireflies, a little faster this time. Point, then click!', 'More fireflies, a little faster this time. Tap to catch them!'],
        [partFlyers(5, 34, 'balloon'), 'Balloons! Click each one to pop it. If one floats away, don\'t worry, it comes back around.', 'Balloons! Tap each one to pop it. If one floats away, don\'t worry, it comes back around.']],
      [[partGifts(1), 'Lesson 3: Double-clicking. That means two clicks, close together: click-click! Double-click the present to open it. The green bar shows how long you have for the second click.', 'Lesson 3: Double-tapping. That means two taps, close together: tap-tap! On a touch screen, that\'s a double-click. Double-tap the present to open it. The green bar shows how long you have for the second tap.'],
        [partGifts(2), 'Two presents! Double-click each one.', 'Two presents! Double-tap each one.'],
        [partGifts(3), 'Three presents! Double-click them all.', 'Three presents! Double-tap them all.']],
      [[partDrag('socks', 2), 'Lesson 4: Dragging. Point at a sock, then press the button and hold it down. Move the mouse to carry the sock, and let go over the basket.', 'Lesson 4: Dragging. On a touch screen, press and hold on a sock, then slide your finger to carry it. Lift your finger over the basket to drop it.'],
        [partDrag('socks', 4), 'More socks! Drag them all into the basket.', 'More socks! Slide them all into the basket.'],
        [partDrag('puzzle', 3), 'A puzzle! Drag each shape to the outline it fits.', 'A puzzle! Slide each shape to the outline it fits.']],
      [[partWinMove, 'Lesson 5: Windows. Every program lives in a window. To move one, drag its title bar, the dark strip at the top. Drop this window on the dotted box.', 'Lesson 5: Windows. Every program lives in a window. To move one, press and hold its title bar, the dark strip at the top, and slide. Put this window on the dotted box.'],
        [partWinSize, 'You can change a window\'s size, too. Drag the striped corner at the bottom right until the window fills the dotted box.', 'You can change a window\'s size, too. Slide the striped corner at the bottom right until the window fills the dotted box.'],
        [partWinMinMax, '', '']],
      [[partMenus(0), 'Lesson 6: Menus. A menu is a list of choices hiding under a word. Click the word Paint at the top of the window to open its menu. Then click a color.', 'Lesson 6: Menus. A menu is a list of choices hiding under a word. Tap the word Paint at the top of the window to open its menu. Then tap a color.'],
        [partMenus(1), 'Now open the Picture menu and add the sun. Then open it again and add a tree.', 'Now tap Picture to open that menu and add the sun. Then open it again and add a tree.'],
        [partScroll, 'Scroll bars show things that don\'t fit in a window. Click the down arrow, or drag the gray box on the bar, to look down the list. Find the treasure and click it!', 'Scroll bars show things that don\'t fit in a window. Tap the down arrow, drag the gray box on the bar, or slide the list with your finger. Find the treasure and tap it!']],
      [[partFinal, '', '']]
    ];

    function footStars() { fsEl.innerHTML = [0, 1, 2].map(i => starSVG(i < runStars)).join(''); fsEl.setAttribute('aria-label', `${runStars} of 3 stars`); }
    function awardStar() {
      runStars = Math.min(3, runStars + 1);
      S.stars[lessonIdx] = Math.max(S.stars[lessonIdx] || 0, runStars); saveS();
      footStars(); const s = fsEl.children[runStars - 1]; s && s.classList.add('mt-new');
      snd.star(); cheer(1200);
    }
    function startLesson(i, fresh) {
      clearStage(); view = 'lesson'; lessonIdx = i;
      const parts = PARTS[i];
      partIdx = fresh || S.done[i] ? 0 : clamp(S.part[i] || 0, 0, parts.length - 1);
      runStars = i === 6 ? 0 : partIdx;
      ltEl.innerHTML = `<span class="mt-ln">Lesson ${i + 1}: </span>${esc(LESSONS[i].name)}`; homeBtn.textContent = 'Lessons';
      startPart(partIdx > 0);
    }
    function startPart(resumed) {
      clearStage(); footStars();
      const [fn, m, t] = PARTS[lessonIdx][partIdx];
      if (m) say(L((resumed ? 'Welcome back! ' : '') + m, (resumed ? 'Welcome back! ' : '') + t));
      part = fn(makeCtx()) || {};
    }
    function partDone() {
      if (finishing) return; finishing = true;
      awardStar(); cheer(1800);
      const parts = PARTS[lessonIdx];
      const next = partIdx + 1;
      S.part[lessonIdx] = next < parts.length ? next : 0; saveS();
      say(api.pick(PRAISE) + (next < parts.length ? ' Here comes the next one.' : ''));
      const tk = token;
      const id = setTimeout(() => { timers.delete(id); if (tk !== token) return; if (next < parts.length) { partIdx = next; startPart(); } else lessonDone(); }, 1900);
      timers.add(id);
    }
    const allDone = () => LESSONS.every((l, i) => S.done[i]);
    function lessonDone() {
      clearStage();
      S.done[lessonIdx] = true; S.part[lessonIdx] = 0; saveS();
      api.sfx.tada ? api.sfx.tada() : snd.win(); cheer(3000);
      runStars = 3; footStars();
      const nx = lessonIdx + 1 < LESSONS.length ? lessonIdx + 1 : -1;
      const grad = allDone();
      if (grad) graduate();
      const pn = mk('mt-panel', `<h2>Lesson ${lessonIdx + 1} complete!</h2><div class="mt-bigstars">${starSVG(true).repeat(3)}</div><div>${esc(LESSONS[lessonIdx].name)}: you've got it.</div><div class="mt-btns"></div>`);
      const bx = pn.querySelector('.mt-btns');
      const btn = (label, fn, go) => { const b = document.createElement('button'); b.className = 'btn' + (go ? ' mt-go' : ''); b.textContent = label; b.onclick = () => { snd.click(); fn(); }; bx.appendChild(b); };
      if (grad) btn('See my certificate', showCert, true);
      if (nx >= 0 && !(grad && S.done[nx])) btn(`Next: ${LESSONS[nx].name}`, () => startLesson(nx, true), !grad);
      btn('All lessons', showHome, false);
      say(grad ? `Hooray! You finished every lesson. You're a real mouse expert, ${api.user}! Here's your certificate.` : nx >= 0 ? `Lesson ${lessonIdx + 1} complete! Three stars for you. Ready for ${LESSONS[nx].name}?` : 'Lesson complete! Three stars for you.');
      if (grad) { const tk = token, id = setTimeout(() => { timers.delete(id); if (tk === token && view === 'lesson') showCert(); }, 5000); timers.add(id); }
    }
    function graduate() {
      S.grad = true; saveS();
      api.stamp('mouse-grad');
      if (!paid()) { api.save('paid', true); api.earn(5, 'finishing the Mouse Tutorial'); }
    }

    /* ---------- home and certificate ---------- */
    function nextRec() { for (let i = 0; i < LESSONS.length; i++) if (!S.done[i]) return i; return -1; }
    function showHome() {
      clearStage(); view = 'home'; runStars = 0;
      play.className = 'mt-play mt-scrolly';
      ltEl.textContent = 'Mouse Tutorial'; fsEl.innerHTML = ''; homeBtn.textContent = S.grad ? 'Certificate' : 'Start';
      const rec = nextRec();
      const total = LESSONS.reduce((a, l, i) => a + (S.stars[i] || 0), 0);
      pgEl.textContent = `Stars: ${total} of 21`;
      play.innerHTML = `<div class="mt-hw"><div class="mt-ht">Welcome to the Mouse Tutorial</div><div class="mt-cards">${LESSONS.map((l, i) => `<button class="btn mt-card${i === rec ? ' mt-rec' : ''}" data-l="${i}"><span class="mt-cn">${i + 1}</span><span class="mt-ci">${l.icon}</span><span class="mt-ct"><b>${esc(l.name)}</b><small>${esc(l.sub)}</small></span><span class="mt-cs">${[0, 1, 2].map(k => starSVG(k < (S.stars[i] || 0))).join('')}</span></button>`).join('')}</div>
        <div class="mt-tip sunken"><b>Using a touch screen?</b> Your finger does the mouse's job. A tap is a click. Tap twice quickly for a double-click. To drag, press and hold, then slide your finger.</div>
        ${S.grad ? '<div class="mt-btns"><button class="btn mt-certb">See my certificate</button></div>' : ''}</div>`;
      play.querySelectorAll('.mt-card').forEach(b => b.addEventListener('click', () => { snd.click(); startLesson(+b.dataset.l); }));
      const cb = play.querySelector('.mt-certb'); if (cb) cb.onclick = showCert;
      if (!S.visited) { S.visited = true; saveS(); say(L('Hi! I\'m Clicky. That thing on your desk with a cord for a tail is a mouse, just like me! Slide it and the arrow on the screen moves too. Click Lesson 1 to begin.', 'Hi! I\'m Clicky. Computers like this come with a mouse, just like me! On a touch screen your finger does the mouse\'s job: a tap is a click, and press-and-hold lets you drag. Tap Lesson 1 to begin.')); }
      else if (rec >= 0) say(`Welcome back, ${api.user}! Ready for lesson ${rec + 1}, ${LESSONS[rec].name}? Pick any lesson you like.`);
      else say(`Hi again, ${api.user}! You finished every lesson. Play any of them again, or look at your certificate.`);
    }
    function showCert() {
      clearStage(); view = 'cert'; play.className = 'mt-play mt-scrolly';
      ltEl.textContent = 'Certificate'; fsEl.innerHTML = ''; homeBtn.textContent = 'Lessons';
      const total = LESSONS.reduce((a, l, i) => a + (S.stars[i] || 0), 0);
      const d = new Date(), MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const day = Math.min(d.getDate(), 28);
      play.innerHTML = `<div class="mt-hw"><div class="mt-cert"><div>~ Horizon Mouse Tutorial ~</div><h2>Certificate of Mouse Mastery</h2><div>This is to certify that</div><div class="mt-cname"></div>
        <div>has learned to point, click, double-click and drag, and can use windows, menus and scroll bars like a pro.</div>
        <div class="mt-cstars">${Array.from({ length: total }, () => starSVG(true)).join('')}</div><div>${total} stars earned</div>
        <div class="mt-cfoot"><div style="display:flex;align-items:flex-end;gap:6px"><canvas width="32" height="32" aria-hidden="true"></canvas><div><i>Clicky</i><br><small>Head Mouse Teacher</small></div></div><div class="mt-seal">MOUSE<br>MASTER<br>${api.era.year}</div><div><small>Awarded</small><br>${MONTHS[d.getMonth()]} ${day}, ${api.era.year}</div></div></div>
        <div class="mt-btns"><button class="btn mt-go">Back to lessons</button></div></div>`;
      play.querySelector('.mt-cname').textContent = api.user;
      drawClicky(play.querySelector('.mt-cert canvas'), { happy: true, wave: 1 });
      play.querySelector('.mt-go').onclick = () => { snd.click(); showHome(); };
      cheer(2500); snd.win();
      say(`Congratulations, ${api.user}! You are officially a Mouse Master.`);
    }

    homeBtn.onclick = () => { snd.click(); if (view === 'home') { if (S.grad) showCert(); else startLesson(Math.max(0, nextRec())); } else showHome(); };
    $('.mt-again').onclick = () => { if (lastLine) { const t = opts.talk; opts.talk = true; say(lastLine); opts.talk = t; } };

    /* ---------- menus ---------- */
    api.menubar([
      { label: 'Lesson', items: () => LESSONS.map((l, i) => ({ label: `${i + 1}. ${l.name}${S.done[i] ? '  (done)' : ''}`, fn: () => startLesson(i, true) })).concat(['-',
        { label: 'All lessons', fn: showHome },
        { label: 'Certificate', fn: showCert, disabled: !S.grad }, '-',
        { label: 'Start over...', fn: async () => {
          const r = await api.msgBox('Mouse Tutorial', 'Start all the lessons over from the beginning? Your stars will be cleared. (Your certificate stays yours.)', ['Start over', 'Cancel'], 'warn');
          if (r !== 'Start over') return;
          S.stars = {}; S.part = {}; S.done = {}; S.visited = false; saveS(); showHome();
        } }]) },
      { label: 'Options', items: () => [
        { label: `${opts.talk ? '• ' : '\u00a0\u00a0\u00a0'}Clicky talks out loud`, fn: () => { opts.talk = !opts.talk; api.save('opts', opts); if (!opts.talk && window.speechSynthesis) speechSynthesis.cancel(); } }, '-',
        ...[[700, 'Normal'], [1000, 'Slow'], [1500, 'Very slow']].map(([ms, n]) => ({ label: `${opts.dbl === ms ? '• ' : '\u00a0\u00a0\u00a0'}Double-click speed: ${n}`, fn: () => { opts.dbl = ms; api.save('opts', opts); } }))
      ] },
      { label: 'Help', items: [
        { label: 'Using a touch screen', fn: () => api.msgBox('Touch screens', 'Your finger does the mouse\'s job.\n\nPoint: touch the screen or slide your finger.\nClick: tap once.\nDouble-click: tap twice, quickly.\nDrag: press and hold, then slide your finger. Lift it to drop.') },
        { label: 'About Mouse Tutorial', fn: () => api.msgBox('About Mouse Tutorial', `Mouse Tutorial\nfor Horizon ${api.era.year}\n\nSeven lessons with Clicky the mouse: pointing, clicking, double-clicking, dragging, windows, menus and scroll bars, and a treasure hunt.\n\nKeys: Enter continues, Esc goes back to the lessons, R repeats what Clicky said.`) }
      ] }
    ]);

    /* ---------- keyboard, lifecycle ---------- */
    W.onKey = e => {
      if (e.key === 'Escape' && view !== 'home') { e.preventDefault(); showHome(); }
      else if (e.key === 'Enter') { const g = play.querySelector('.mt-go'); if (g) { e.preventDefault(); g.click(); } else if (view === 'home' && !(document.activeElement && W.body.contains(document.activeElement) && document.activeElement.tagName === 'BUTTON')) { e.preventDefault(); homeBtn.click(); } }
      else if (view === 'home' && /^[1-7]$/.test(e.key)) { e.preventDefault(); startLesson(+e.key - 1); }
      else if ((e.key === 'r' || e.key === 'R') && !e.ctrlKey && !e.metaKey) { e.preventDefault(); $('.mt-again').click(); }
    };
    let raf = 0, last = now(), rsT = 0, lastSize = '';
    function frame(t) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (t - last) / 1000); last = t;
      if (W.el.classList.contains('min')) return;
      face(t);
      if (part && part.tick) part.tick(dt, t);
    }
    raf = requestAnimationFrame(frame);
    W.onResize = () => {
      clearTimeout(rsT);
      rsT = setTimeout(() => {
        const sz = play.clientWidth + 'x' + play.clientHeight; if (sz === lastSize) return;
        const old = lastSize; lastSize = sz;
        if (view !== 'lesson' || !part || finishing || !old) return;
        if (part.resize) { part.resize(); return; }
        const [ow, oh] = old.split('x').map(Number);
        if (Math.abs(ow - play.clientWidth) > 24 || Math.abs(oh - play.clientHeight) > 24) startPart();
      }, 220);
    };
    W.onMin = () => { if (spoke && window.speechSynthesis) speechSynthesis.cancel(); };
    W.onClose = () => {
      cancelAnimationFrame(raf); clearTimeout(rsT); token++;
      timers.forEach(clearTimeout); timers.clear(); cleanups.forEach(f => { try { f(); } catch (e) { /* ignore */ } });
      if (spoke && window.speechSynthesis) speechSynthesis.cancel();
    };
    drawClicky(cv, {});
    showHome();
    setTimeout(() => { lastSize = play.clientWidth + 'x' + play.clientHeight; }, 50);
  }

  (window.RETRO_APPS = window.RETRO_APPS || []).push({
    id: 'mousetutor',
    label: 'Mouse Tutorial',
    help: 'Learn to use the new mouse with Clicky: point, click, double-click, drag, and use windows, menus and scroll bars.',
    kind: 'builtin',
    eras: ['1990'],
    cat: 'acc',
    icon: '<svg viewBox="0 0 32 32" shape-rendering="crispEdges" aria-hidden="true"><rect x="15" y="1" width="2" height="8" fill="#000"/><rect x="6" y="7" width="8" height="8" fill="#a8a8a8" stroke="#000"/><rect x="8" y="9" width="4" height="4" fill="#ff7fae"/><rect x="18" y="7" width="8" height="8" fill="#a8a8a8" stroke="#000"/><rect x="20" y="9" width="4" height="4" fill="#ff7fae"/><rect x="9" y="10" width="14" height="20" fill="#c0c0c0" stroke="#000"/><rect x="9" y="10" width="7" height="8" fill="#fff" stroke="#000"/><rect x="16" y="10" width="7" height="8" fill="#fff" stroke="#000"/><rect x="12" y="21" width="2" height="2" fill="#000"/><rect x="18" y="21" width="2" height="2" fill="#000"/><rect x="15" y="24" width="2" height="2" fill="#ff7fae"/></svg>',
    window: { w: 660, h: 540 },
    css: CSS,
    open
  });
})();
