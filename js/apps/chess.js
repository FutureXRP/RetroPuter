/* Chess: a built-in game in every year (1985 text mode, 1990, 1995, 2000).
   Full rules (castling, en passant, promotion, check, mate, stalemate and the draw rules), a computer
   opponent with four levels (alpha-beta search in a Web Worker made from a Blob, so the page never freezes),
   a two-player hot-seat mode, an animated "How to play" tutorial, save/resume and per-level records. */
(function () {
  'use strict';

  /*ENGINE-START*/
  // The chess engine. Self-contained so it can also run inside a Web Worker (its source is turned into a Blob).
  // Board: 0x88 array. Square = rank * 16 + file (rank 0 = rank 1). Pieces: 1 P, 2 N, 3 B, 4 R, 5 Q, 6 K; +8 = black.
  // Move: from | to << 7 | promo << 14 | flags << 18.
  function ENGINE() {
    'use strict';
    const PAWN = 1, KNIGHT = 2, BISHOP = 3, ROOK = 4, QUEEN = 5, KING = 6, BL = 8;
    const F_CAP = 1, F_EP = 2, F_CASTLE = 4, F_DBL = 8, F_PROMO = 16;
    const N_OFF = [33, 31, 18, 14, -33, -31, -18, -14], K_OFF = [1, -1, 16, -16, 17, 15, -17, -15];
    const B_OFF = [17, 15, -17, -15], R_OFF = [1, -1, 16, -16];
    const VAL = [0, 100, 320, 330, 500, 900, 0];
    const MATE = 30000, INF = 32000;
    let seed = 0x2545f491;
    const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed | 0; };
    const ZL = new Int32Array(16 * 128), ZH = new Int32Array(16 * 128);
    for (let i = 0; i < ZL.length; i++) { ZL[i] = rnd(); ZH[i] = rnd(); }
    const ZSL = rnd(), ZSH = rnd(), ZCL = [], ZCH = [], ZEL = [], ZEH = [];
    for (let i = 0; i < 16; i++) { ZCL.push(rnd()); ZCH.push(rnd()); }
    for (let i = 0; i < 128; i++) { ZEL.push(rnd()); ZEH.push(rnd()); }
    // Castling rights: 1 white O-O, 2 white O-O-O, 4 black O-O, 8 black O-O-O. CR[sq] keeps the rights still possible after a move touches sq.
    const CR = new Array(128).fill(15);
    CR[0] = 13; CR[7] = 14; CR[4] = 12; CR[112] = 7; CR[119] = 11; CR[116] = 3;
    const FILES = 'abcdefgh';
    const sqName = sq => FILES[sq & 7] + ((sq >> 4) + 1);
    const parseSq = s => { const f = FILES.indexOf(s[0]), r = +s[1] - 1; return f < 0 || !(r >= 0 && r < 8) ? -1 : r * 16 + f; };

    function fromFEN(fen) {
      const P = { b: new Int8Array(128), side: 0, castle: 0, ep: -1, half: 0, full: 1, king: [-1, -1], lo: 0, hi: 0, hist: [], keys: [] };
      const [bd, s, c0, e, h, f] = String(fen).trim().split(/\s+/);
      let r = 7, fl = 0;
      for (const ch of bd) {
        if (ch === '/') { r--; fl = 0; }
        else if (ch >= '1' && ch <= '8') fl += +ch;
        else {
          const t = 'pnbrqk'.indexOf(ch.toLowerCase()) + 1, col = ch === ch.toLowerCase() ? BL : 0, sq = r * 16 + fl;
          if (t && !(sq & 0x88)) { P.b[sq] = t | col; if (t === KING) P.king[col ? 1 : 0] = sq; }
          fl++;
        }
      }
      P.side = s === 'b' ? 1 : 0;
      const c = c0 || '-';
      P.castle = (c.includes('K') ? 1 : 0) | (c.includes('Q') ? 2 : 0) | (c.includes('k') ? 4 : 0) | (c.includes('q') ? 8 : 0);
      P.ep = e && e !== '-' ? parseSq(e) : -1;
      P.half = +h || 0; P.full = +f || 1;
      rehash(P);
      return P;
    }
    function rehash(P) {
      let lo = 0, hi = 0;
      for (let sq = 0; sq < 120; sq++) { if (sq & 0x88) { sq += 7; continue; } const p = P.b[sq]; if (p) { lo ^= ZL[p * 128 + sq]; hi ^= ZH[p * 128 + sq]; } }
      if (P.side) { lo ^= ZSL; hi ^= ZSH; }
      lo ^= ZCL[P.castle]; hi ^= ZCH[P.castle];
      if (P.ep >= 0) { lo ^= ZEL[P.ep]; hi ^= ZEH[P.ep]; }
      P.lo = lo; P.hi = hi;
    }
    function boardFEN(P) {
      let out = '';
      for (let r = 7; r >= 0; r--) {
        let n = 0;
        for (let f = 0; f < 8; f++) {
          const p = P.b[r * 16 + f];
          if (!p) { n++; continue; }
          if (n) { out += n; n = 0; }
          const ch = ' pnbrqk'[p & 7]; out += p & BL ? ch : ch.toUpperCase();
        }
        if (n) out += n;
        if (r) out += '/';
      }
      return out;
    }
    const castleStr = c => ((c & 1 ? 'K' : '') + (c & 2 ? 'Q' : '') + (c & 4 ? 'k' : '') + (c & 8 ? 'q' : '')) || '-';
    const toFEN = P => `${boardFEN(P)} ${P.side ? 'b' : 'w'} ${castleStr(P.castle)} ${P.ep >= 0 ? sqName(P.ep) : '-'} ${P.half} ${P.full}`;

    function attacked(b, sq, by) {
      const c = by ? BL : 0;
      if (by) { if (!((sq + 15) & 0x88) && b[sq + 15] === (PAWN | BL)) return true; if (!((sq + 17) & 0x88) && b[sq + 17] === (PAWN | BL)) return true; }
      else { if (!((sq - 15) & 0x88) && b[sq - 15] === PAWN) return true; if (!((sq - 17) & 0x88) && b[sq - 17] === PAWN) return true; }
      for (let i = 0; i < 8; i++) {
        let t = sq + N_OFF[i]; if (!(t & 0x88) && b[t] === (KNIGHT | c)) return true;
        t = sq + K_OFF[i]; if (!(t & 0x88) && b[t] === (KING | c)) return true;
      }
      for (let i = 0; i < 4; i++) {
        let d = B_OFF[i], t = sq + d;
        while (!(t & 0x88)) { const q = b[t]; if (q) { if (q === (BISHOP | c) || q === (QUEEN | c)) return true; break; } t += d; }
        d = R_OFF[i]; t = sq + d;
        while (!(t & 0x88)) { const q = b[t]; if (q) { if (q === (ROOK | c) || q === (QUEEN | c)) return true; break; } t += d; }
      }
      return false;
    }
    const inCheck = P => attacked(P.b, P.king[P.side], P.side ^ 1);

    function addPromos(out, from, to, fl) { for (let pr = QUEEN; pr >= KNIGHT; pr--) out.push(from | to << 7 | pr << 14 | (fl | F_PROMO) << 18); }
    // Pseudo-legal moves (may leave the king in check). caps = captures and promotions only.
    function gen(P, out, caps) {
      const b = P.b, us = P.side, col = us ? BL : 0;
      for (let sq = 0; sq < 120; sq++) {
        if (sq & 0x88) { sq += 7; continue; }
        const p = b[sq]; if (!p || (p & BL) !== col) continue;
        const t = p & 7;
        if (t === PAWN) {
          const dir = us ? -16 : 16, last = us ? 0 : 7, startR = us ? 6 : 1;
          let to = sq + dir;
          if (!(to & 0x88) && !b[to]) {
            if ((to >> 4) === last) addPromos(out, sq, to, 0);
            else if (!caps) { out.push(sq | to << 7); const t2 = to + dir; if ((sq >> 4) === startR && !b[t2]) out.push(sq | t2 << 7 | F_DBL << 18); }
          }
          for (let k = -1; k <= 1; k += 2) {
            to = sq + dir + k; if (to & 0x88) continue;
            const q = b[to];
            if (q && (q & BL) !== col) { if ((to >> 4) === last) addPromos(out, sq, to, F_CAP); else out.push(sq | to << 7 | F_CAP << 18); }
            else if (to === P.ep && !q) out.push(sq | to << 7 | (F_CAP | F_EP) << 18);
          }
        } else if (t === KNIGHT || t === KING) {
          const offs = t === KNIGHT ? N_OFF : K_OFF;
          for (let i = 0; i < 8; i++) {
            const to = sq + offs[i]; if (to & 0x88) continue;
            const q = b[to];
            if (!q) { if (!caps) out.push(sq | to << 7); } else if ((q & BL) !== col) out.push(sq | to << 7 | F_CAP << 18);
          }
          if (t === KING && !caps) {
            const them = us ^ 1;
            if (us === 0 && sq === 4) {
              if ((P.castle & 1) && !b[5] && !b[6] && b[7] === ROOK && !attacked(b, 4, them) && !attacked(b, 5, them)) out.push(4 | 6 << 7 | F_CASTLE << 18);
              if ((P.castle & 2) && !b[3] && !b[2] && !b[1] && b[0] === ROOK && !attacked(b, 4, them) && !attacked(b, 3, them)) out.push(4 | 2 << 7 | F_CASTLE << 18);
            } else if (us === 1 && sq === 116) {
              if ((P.castle & 4) && !b[117] && !b[118] && b[119] === (ROOK | BL) && !attacked(b, 116, them) && !attacked(b, 117, them)) out.push(116 | 118 << 7 | F_CASTLE << 18);
              if ((P.castle & 8) && !b[115] && !b[114] && !b[113] && b[112] === (ROOK | BL) && !attacked(b, 116, them) && !attacked(b, 115, them)) out.push(116 | 114 << 7 | F_CASTLE << 18);
            }
          }
        } else {
          const offs = t === BISHOP ? B_OFF : t === ROOK ? R_OFF : K_OFF, n = offs.length;
          for (let i = 0; i < n; i++) {
            const d = offs[i]; let to = sq + d;
            while (!(to & 0x88)) {
              const q = b[to];
              if (!q) { if (!caps) out.push(sq | to << 7); }
              else { if ((q & BL) !== col) out.push(sq | to << 7 | F_CAP << 18); break; }
              to += d;
            }
          }
        }
      }
      return out;
    }

    function make(P, m) {
      const b = P.b, from = m & 127, to = (m >> 7) & 127, pr = (m >> 14) & 15, fl = m >>> 18, us = P.side, col = us ? BL : 0;
      const p = b[from];
      let capSq = to, cap = b[to];
      if (fl & F_EP) { capSq = to + (us ? 16 : -16); cap = b[capSq]; }
      P.hist.push(m, cap, P.castle, P.ep, P.half, P.lo, P.hi);
      P.keys.push(P.lo);
      let lo = P.lo, hi = P.hi;
      if (cap) { b[capSq] = 0; lo ^= ZL[cap * 128 + capSq]; hi ^= ZH[cap * 128 + capSq]; }
      b[from] = 0; lo ^= ZL[p * 128 + from]; hi ^= ZH[p * 128 + from];
      const np = pr ? (pr | col) : p;
      b[to] = np; lo ^= ZL[np * 128 + to]; hi ^= ZH[np * 128 + to];
      if (fl & F_CASTLE) {
        const rf = to > from ? from + 3 : from - 4, rt = to > from ? from + 1 : from - 1, rk = b[rf];
        b[rf] = 0; b[rt] = rk;
        lo ^= ZL[rk * 128 + rf] ^ ZL[rk * 128 + rt]; hi ^= ZH[rk * 128 + rf] ^ ZH[rk * 128 + rt];
      }
      if ((p & 7) === KING) P.king[us] = to;
      lo ^= ZCL[P.castle]; hi ^= ZCH[P.castle];
      P.castle &= CR[from] & CR[to];
      lo ^= ZCL[P.castle]; hi ^= ZCH[P.castle];
      if (P.ep >= 0) { lo ^= ZEL[P.ep]; hi ^= ZEH[P.ep]; }
      P.ep = (fl & F_DBL) ? (from + to) >> 1 : -1;
      if (P.ep >= 0) { lo ^= ZEL[P.ep]; hi ^= ZEH[P.ep]; }
      P.half = ((p & 7) === PAWN || cap) ? 0 : P.half + 1;
      if (us) P.full++;
      P.side = us ^ 1; lo ^= ZSL; hi ^= ZSH;
      P.lo = lo; P.hi = hi;
    }
    function unmake(P) {
      const h = P.hist;
      const hi = h.pop(), lo = h.pop(), half = h.pop(), ep = h.pop(), castle = h.pop(), cap = h.pop(), m = h.pop();
      P.keys.pop();
      P.side ^= 1;
      const us = P.side, b = P.b, from = m & 127, to = (m >> 7) & 127, pr = (m >> 14) & 15, fl = m >>> 18;
      if (us) P.full--;
      let p = b[to]; if (pr) p = PAWN | (us ? BL : 0);
      b[from] = p;
      if (fl & F_EP) { b[to] = 0; b[to + (us ? 16 : -16)] = cap; } else b[to] = cap;
      if (fl & F_CASTLE) {
        const rf = to > from ? from + 3 : from - 4, rt = to > from ? from + 1 : from - 1;
        b[rf] = b[rt]; b[rt] = 0;
      }
      if ((p & 7) === KING) P.king[us] = from;
      P.castle = castle; P.ep = ep; P.half = half; P.lo = lo; P.hi = hi;
    }
    function makeNull(P) {
      P.hist.push(0, P.ep, P.half, P.lo, P.hi); P.keys.push(P.lo);
      if (P.ep >= 0) { P.lo ^= ZEL[P.ep]; P.hi ^= ZEH[P.ep]; }
      P.ep = -1; P.half = 0; P.side ^= 1; P.lo ^= ZSL; P.hi ^= ZSH;
    }
    function unmakeNull(P) {
      const h = P.hist; P.hi = h.pop(); P.lo = h.pop(); P.half = h.pop(); P.ep = h.pop(); h.pop(); P.keys.pop(); P.side ^= 1;
    }
    function legalMoves(P) {
      const all = gen(P, [], false), out = [];
      for (let i = 0; i < all.length; i++) {
        make(P, all[i]);
        if (!attacked(P.b, P.king[P.side ^ 1], P.side)) out.push(all[i]);
        unmake(P);
      }
      return out;
    }
    function perft(P, d) {
      if (d === 0) return 1;
      const ms = gen(P, [], false); let n = 0;
      for (let i = 0; i < ms.length; i++) {
        make(P, ms[i]);
        if (!attacked(P.b, P.king[P.side ^ 1], P.side)) n += d === 1 ? 1 : perft(P, d - 1);
        unmake(P);
      }
      return n;
    }
    // Not enough material for anyone to checkmate: K v K, K+minor v K, or only bishops all on one color.
    function insufficient(P) {
      let minors = 0, knights = 0, bcol = -1, mixed = false;
      for (let sq = 0; sq < 120; sq++) {
        if (sq & 0x88) { sq += 7; continue; }
        const t = P.b[sq] & 7;
        if (!t || t === KING) continue;
        if (t === PAWN || t === ROOK || t === QUEEN) return false;
        minors++;
        if (t === KNIGHT) knights++;
        else { const c = ((sq >> 4) + (sq & 7)) & 1; if (bcol < 0) bcol = c; else if (bcol !== c) mixed = true; }
      }
      if (minors <= 1) return true;
      return knights === 0 && !mixed;
    }
    const uci = m => sqName(m & 127) + sqName((m >> 7) & 127) + ((m >> 14) & 15 ? ' nbrq'[((m >> 14) & 15) - 1] : '');
    function san(P, m, legal) {
      const from = m & 127, to = (m >> 7) & 127, pr = (m >> 14) & 15, fl = m >>> 18, p = P.b[from], t = p & 7;
      let s;
      if (fl & F_CASTLE) s = to > from ? 'O-O' : 'O-O-O';
      else if (t === PAWN) s = (fl & F_CAP ? FILES[from & 7] + 'x' : '') + sqName(to) + (pr ? '=' + ' PNBRQK'[pr] : '');
      else {
        let amb = false, sameF = false, sameR = false;
        for (const o of legal) {
          const of = o & 127;
          if (o === m || ((o >> 7) & 127) !== to || P.b[of] !== p) continue;
          amb = true; if ((of & 7) === (from & 7)) sameF = true; if ((of >> 4) === (from >> 4)) sameR = true;
        }
        const dis = !amb ? '' : !sameF ? FILES[from & 7] : !sameR ? String((from >> 4) + 1) : sqName(from);
        s = ' PNBRQK'[t] + dis + (fl & F_CAP ? 'x' : '') + sqName(to);
      }
      make(P, m);
      const chk = inCheck(P), mate = chk && legalMoves(P).length === 0;
      unmake(P);
      return s + (mate ? '#' : chk ? '+' : '');
    }
    // Position key for threefold repetition: en passant only counts when a capture is really possible.
    function posKey(P, legal) {
      const epOk = P.ep >= 0 && legal.some(m => (m >>> 18) & F_EP);
      return `${boardFEN(P)} ${P.side} ${P.castle} ${epOk ? P.ep : '-'}`;
    }

    /* ---- evaluation ---- */
    const T = {
      1: [0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0],
      2: [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50],
      3: [-20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20],
      4: [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0],
      5: [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5, 0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20],
      6: [-30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20],
      7: [-50, -40, -30, -20, -20, -30, -40, -50, -30, -20, -10, 0, 0, -10, -20, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -30, 0, 0, 0, 0, -30, -30, -50, -30, -30, -30, -30, -30, -30, -50]
    };
    // PS[piece][sq]: material + square bonus from white's point of view (black pieces negative). Index 7 = king endgame table.
    const PS = [], KE = [new Int16Array(128), new Int16Array(128)];
    for (let p = 0; p < 16; p++) PS.push(new Int16Array(128));
    for (let sq = 0; sq < 120; sq++) {
      if (sq & 0x88) { sq += 7; continue; }
      const r = sq >> 4, f = sq & 7, wi = (7 - r) * 8 + f, bi = r * 8 + f;
      for (let t = 1; t <= 6; t++) { PS[t][sq] = VAL[t] + T[t][wi]; PS[t | BL][sq] = -(VAL[t] + T[t][bi]); }
      KE[0][sq] = T[7][wi]; KE[1][sq] = -T[7][bi];
    }
    const PHASE = [0, 0, 1, 1, 2, 4, 0];
    function evaluate(P) {
      const b = P.b;
      let s = 0, phase = 0, wb = 0, bb = 0, wmat = 0, bmat = 0;
      for (let sq = 0; sq < 120; sq++) {
        if (sq & 0x88) { sq += 7; continue; }
        const p = b[sq]; if (!p) continue;
        const t = p & 7;
        if (t === KING) continue;
        s += PS[p][sq]; phase += PHASE[t];
        if (p & BL) { bmat += VAL[t]; if (t === BISHOP) bb++; } else { wmat += VAL[t]; if (t === BISHOP) wb++; }
      }
      if (phase > 24) phase = 24;
      const wk = P.king[0], bk = P.king[1];
      s += ((PS[KING][wk] * phase + KE[0][wk] * (24 - phase)) / 24) | 0;
      s += ((PS[KING | BL][bk] * phase + KE[1][bk] * (24 - phase)) / 24) | 0;
      if (wb >= 2) s += 30; if (bb >= 2) s -= 30;
      // Mop-up: when one side is well ahead in the endgame, drive the lone king to the edge and bring the own king closer.
      const diff = wmat - bmat;
      if (phase <= 8 && Math.abs(diff) >= 300) {
        const lose = diff > 0 ? bk : wk, win = diff > 0 ? wk : bk;
        const lr = lose >> 4, lf = lose & 7;
        const cd = Math.max(3 - lr, lr - 4) + Math.max(3 - lf, lf - 4);
        const kd = Math.abs((win >> 4) - lr) + Math.abs((win & 7) - lf);
        const bonus = cd * 10 + (14 - kd) * 4;
        s += diff > 0 ? bonus : -bonus;
      }
      return P.side ? -s : s;
    }

    /* ---- search ---- */
    const TTN = 1 << 18, TTM = TTN - 1;
    let ttLo = null, ttHi, ttMove, ttScore, ttDepth, ttFlag;
    function ttInit() { if (ttLo) return; ttLo = new Int32Array(TTN); ttHi = new Int32Array(TTN); ttMove = new Int32Array(TTN); ttScore = new Int16Array(TTN); ttDepth = new Int8Array(TTN); ttFlag = new Int8Array(TTN); }
    const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
    let S = null;
    function isRep(P) {
      const k = P.keys, n = k.length, stop = Math.max(0, n - P.half);
      for (let i = n - 2; i >= stop; i -= 2) if (k[i] === P.lo) return true;
      return false;
    }
    function hasPieces(P) {
      const col = P.side ? BL : 0;
      for (let sq = 0; sq < 120; sq++) { if (sq & 0x88) { sq += 7; continue; } const p = P.b[sq]; if (p && (p & BL) === col && (p & 7) !== PAWN && (p & 7) !== KING) return true; }
      return false;
    }
    function orderScore(P, m, ttm, ply) {
      if (m === ttm) return 1e7;
      const fl = m >>> 18;
      if (fl & F_CAP) { const v = (fl & F_EP) ? PAWN : (P.b[(m >> 7) & 127] & 7); return 1e6 + v * 10 - (P.b[m & 127] & 7) + ((m >> 14) & 15 ? 5 : 0); }
      if (fl & F_PROMO) return 9e5 + ((m >> 14) & 15);
      if (S.killers[ply * 2] === m) return 8e5;
      if (S.killers[ply * 2 + 1] === m) return 7e5;
      return S.hist[m & 16383];
    }
    function qsearch(P, alpha, beta, ply, qd) {
      if ((++S.nodes & 1023) === 0 && now() > S.deadline) S.stop = true;
      if (S.stop) return 0;
      const stand = evaluate(P);
      if (stand >= beta) return stand;
      if (stand > alpha) alpha = stand;
      if (qd > 7) return stand;
      const ms = gen(P, [], true), sc = ms.map(m => orderScore(P, m, 0, 0));
      for (let i = 0; i < ms.length; i++) {
        let bi = i; for (let j = i + 1; j < ms.length; j++) if (sc[j] > sc[bi]) bi = j;
        const m = ms[bi]; ms[bi] = ms[i]; sc[bi] = sc[i];
        const fl = m >>> 18;
        if (!(fl & F_PROMO)) { const v = (fl & F_EP) ? 100 : VAL[P.b[(m >> 7) & 127] & 7]; if (stand + v + 200 < alpha) continue; }
        else if (((m >> 14) & 15) !== QUEEN) continue;
        make(P, m);
        if (attacked(P.b, P.king[P.side ^ 1], P.side)) { unmake(P); continue; }
        const s = -qsearch(P, -beta, -alpha, ply + 1, qd + 1);
        unmake(P);
        if (S.stop) return 0;
        if (s >= beta) return s;
        if (s > alpha) alpha = s;
      }
      return alpha;
    }
    function search(P, depth, alpha, beta, ply, allowNull) {
      if ((++S.nodes & 1023) === 0 && now() > S.deadline) S.stop = true;
      if (S.stop) return 0;
      if (ply > 0 && (P.half >= 100 || isRep(P) || insufficient(P))) return 0;
      const chk = inCheck(P);
      if (chk && ply < 40) depth++;
      if (depth <= 0) return S.qs ? qsearch(P, alpha, beta, ply, 0) : evaluate(P);
      if (ply >= 60) return evaluate(P);
      const idx = P.lo & TTM;
      let ttm = 0;
      if (ttLo[idx] === P.lo && ttHi[idx] === P.hi) {
        ttm = ttMove[idx];
        if (ply > 0 && ttDepth[idx] >= depth) {
          let s = ttScore[idx]; if (s > MATE - 500) s -= ply; else if (s < -MATE + 500) s += ply;
          const f = ttFlag[idx];
          if (f === 0 || (f === 1 && s >= beta) || (f === 2 && s <= alpha)) return s;
        }
      }
      if (allowNull && !chk && depth >= 3 && ply > 0 && beta < MATE - 500 && hasPieces(P) && evaluate(P) >= beta) {
        makeNull(P);
        const s = -search(P, depth - 3, -beta, -beta + 1, ply + 1, false);
        unmakeNull(P);
        if (S.stop) return 0;
        if (s >= beta) return beta;
      }
      const ms = gen(P, [], false), sc = new Array(ms.length);
      for (let i = 0; i < ms.length; i++) sc[i] = orderScore(P, ms[i], ttm, ply);
      let best = -INF, bestM = 0, legal = 0;
      const a0 = alpha;
      for (let i = 0; i < ms.length; i++) {
        let bi = i; for (let j = i + 1; j < ms.length; j++) if (sc[j] > sc[bi]) bi = j;
        const m = ms[bi]; ms[bi] = ms[i]; sc[bi] = sc[i];
        make(P, m);
        if (attacked(P.b, P.king[P.side ^ 1], P.side)) { unmake(P); continue; }
        legal++;
        let s;
        if (legal === 1) s = -search(P, depth - 1, -beta, -alpha, ply + 1, true);
        else {
          s = -search(P, depth - 1, -alpha - 1, -alpha, ply + 1, true);
          if (s > alpha && s < beta && !S.stop) s = -search(P, depth - 1, -beta, -alpha, ply + 1, true);
        }
        unmake(P);
        if (S.stop) return 0;
        if (s > best) { best = s; bestM = m; if (ply === 0) S.best = m; }
        if (s > alpha) alpha = s;
        if (alpha >= beta) {
          if (!((m >>> 18) & (F_CAP | F_PROMO))) {
            if (S.killers[ply * 2] !== m) { S.killers[ply * 2 + 1] = S.killers[ply * 2]; S.killers[ply * 2] = m; }
            S.hist[m & 16383] += depth * depth;
          }
          break;
        }
      }
      if (!legal) return chk ? -MATE + ply : 0;
      let st = best; if (st > MATE - 500) st += ply; else if (st < -MATE + 500) st -= ply;
      ttLo[idx] = P.lo; ttHi[idx] = P.hi; ttMove[idx] = bestM; ttScore[idx] = st; ttDepth[idx] = depth;
      ttFlag[idx] = best <= a0 ? 2 : best >= beta ? 1 : 0;
      return best;
    }

    // Opening book: a few common, sound lines so the computer varies its openings.
    const BOOK = [
      'e2e4 e7e5 g1f3 b8c6 f1b5 a7a6 b5a4 g8f6 e1g1 f8e7',
      'e2e4 e7e5 g1f3 b8c6 f1c4 f8c5 c2c3 g8f6 d2d3 d7d6',
      'e2e4 e7e5 g1f3 b8c6 d2d4 e5d4 f3d4 g8f6 d4c6 b7c6',
      'e2e4 e7e5 b1c3 g8f6 g1f3 b8c6 f1b5 f8b4',
      'e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6 b1c3 a7a6',
      'e2e4 c7c5 g1f3 b8c6 d2d4 c5d4 f3d4 g8f6 b1c3 e7e5',
      'e2e4 e7e6 d2d4 d7d5 b1c3 g8f6 c1g5 f8e7',
      'e2e4 c7c6 d2d4 d7d5 b1c3 d5e4 c3e4 c8f5',
      'e2e4 d7d5 e4d5 d8d5 b1c3 d5a5 d2d4 g8f6',
      'd2d4 d7d5 c2c4 e7e6 b1c3 g8f6 c1g5 f8e7',
      'd2d4 d7d5 c2c4 c7c6 g1f3 g8f6 b1c3 d5c4',
      'd2d4 g8f6 c2c4 e7e6 b1c3 f8b4 e2e3 e8g8',
      'd2d4 g8f6 c2c4 g7g6 b1c3 f8g7 e2e4 d7d6 g1f3 e8g8',
      'c2c4 e7e5 b1c3 g8f6 g1f3 b8c6 g2g3 d7d5',
      'g1f3 d7d5 d2d4 g8f6 c2c4 e7e6 b1c3 f8e7'
    ].map(l => l.split(' '));
    function bookMove(P, legal) {
      const played = []; for (let i = 0; i < P.hist.length; i += 7) played.push(uci(P.hist[i]));
      const cands = [];
      BOOK.forEach(line => { if (line.length > played.length && played.every((u, i) => line[i] === u)) cands.push(line[played.length]); });
      while (cands.length) {
        const i = Math.floor(Math.random() * cands.length), u = cands.splice(i, 1)[0];
        const m = legal.find(x => uci(x) === u); if (m) return m;
      }
      return 0;
    }

    // Levels: 0 Beginner, 1 Easy, 2 Medium, 3 Hard, 4 = hint helper.
    const LEVELS = [
      { depth: 2, qs: false, noise: 170, rand: 0.28, time: 700 },
      { depth: 2, qs: true, noise: 45, rand: 0.06, time: 900 },
      { depth: 5, qs: true, time: 1000, book: true },
      { depth: 40, qs: true, time: 2200, book: true },
      { depth: 5, qs: true, time: 700 }
    ];
    // Pick a move for the side to move. fromStart: the game began at the normal start (so the book applies). cap: optional time cap in ms.
    function think(P, level, fromStart, cap) {
      const L = LEVELS[level] || LEVELS[1];
      const legal = legalMoves(P);
      if (legal.length <= 1) return legal[0] || 0;
      if (L.book && fromStart && P.hist.length / 7 < 12) { const bm = bookMove(P, legal); if (bm) return bm; }
      ttInit();
      const t0 = now(), time = cap ? Math.min(cap, L.time) : L.time;
      S = { nodes: 0, deadline: t0 + time, stop: false, qs: L.qs, killers: new Int32Array(160), hist: new Int32Array(16384), best: 0 };
      if (L.noise) {
        if (Math.random() < L.rand) return legal[Math.floor(Math.random() * legal.length)];
        let best = legal[0], bs = -Infinity;
        for (const m of legal) {
          make(P, m);
          let s = -search(P, L.depth - 1, -INF, INF, 1, false);
          unmake(P);
          if (S.stop) break;
          if (Math.abs(s) < MATE - 500) s += (Math.random() * 2 - 1) * L.noise;
          if (s > bs) { bs = s; best = m; }
        }
        return best;
      }
      let best = legal[0];
      for (let d = 1; d <= L.depth; d++) {
        S.best = 0;
        const s = search(P, d, -INF, INF, 0, false);
        if (S.stop) { break; }
        if (S.best) best = S.best;
        if (Math.abs(s) > MATE - 500) break;
        if (now() - t0 > time * 0.5) break;
      }
      return best;
    }

    return {
      fromFEN, toFEN, gen, legalMoves, make, unmake, inCheck, attacked, perft, insufficient, san, uci, posKey, sqName, parseSq,
      think, evaluate, F_CAP, F_EP, F_CASTLE, F_DBL, F_PROMO, BL
    };
  }
  /*ENGINE-END*/

  const E = ENGINE();
  const WORKER_SRC = 'var E=(' + ENGINE.toString() + ')();onmessage=function(e){var d=e.data,P=E.fromFEN(d.fen);for(var i=0;i<d.moves.length;i++)E.make(P,d.moves[i]);postMessage({id:d.id,move:E.think(P,d.level,d.fromStart)});};';

  const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const LEVELS = ['Beginner', 'Easy', 'Medium', 'Hard'];
  const PAY = [2, 3, 4, 6];
  const PNAME = ['', 'pawn', 'knight', 'bishop', 'rook', 'queen', 'king'];
  const LETTER = ' PNBRQK';
  const SIDE = ['White', 'Black'];
  const TIPS = ['', 'Pawns move straight ahead and capture one square diagonally.', 'Knights move in an L shape: two squares, then one to the side.', 'Bishops move diagonally, as far as they like.', 'Rooks move in straight lines: up, down, left or right.', 'The queen moves in any straight line or diagonal.', 'The king moves one square in any direction.'];
  const ANIM_MS = 260;
  const coarse = () => !!(window.matchMedia && matchMedia('(pointer:coarse)').matches);

  /* ---------- piece art ---------- */
  // 1990: 16x16 pixel pieces. o = outline, x = body, e = detail (eye, slit).
  const PIX = {
    1: ['................', '................', '......oooo......', '.....oxxxxo.....', '.....oxxxxo.....', '.....oxxxxo.....', '......oxxo......', '.....oxxxxo.....', '......oxxo......', '......oxxo......', '.....oxxxxo.....', '....oxxxxxxo....', '...oxxxxxxxxo...', '..oxxxxxxxxxxo..', '..oooooooooooo..', '................'],
    2: ['................', '......oo........', '.....oxxoo......', '....oxxxxxoo....', '...oxxexxxxxo...', '..oxxxxxxxxxxo..', '.oxxxxxxxxxxxo..', '.oxexooxxxxxxo..', '..ooo.oxxxxxxo..', '.....oxxxxxxo...', '....oxxxxxxxo...', '....oxxxxxxxo...', '...oooooooooo...', '..oxxxxxxxxxxo..', '..oooooooooooo..', '................'],
    3: ['.......oo.......', '......oxxo......', '.......oo.......', '......oxxo......', '.....oxxxxo.....', '....oxxxxexo....', '....oxxxexxo....', '....oxxexxxo....', '.....oxxxxo.....', '......oxxo......', '.....oooooo.....', '....oxxxxxxo....', '...oxxxxxxxxo...', '..oxxxxxxxxxxo..', '..oooooooooooo..', '................'],
    4: ['................', '..ooo.oooo.ooo..', '..oxo.oxxo.oxo..', '..oxooooooooxo..', '..oxxxxxxxxxxo..', '...oooooooooo...', '....oxxxxxxo....', '....oxxxxxxo....', '....oxxxxxxo....', '....oxxxxxxo....', '....oxxxxxxo....', '...oooooooooo...', '..oxxxxxxxxxxo..', '..oxxxxxxxxxxo..', '..oooooooooooo..', '................'],
    5: ['................', '..o....oo....o..', '.oxo..oxxo..oxo.', '..ox..oxxo..xo..', '..oxo.oxxo.oxo..', '..oxxoxxxxoxxo..', '..oxxxxxxxxxxo..', '...oxxxxxxxxo...', '...oooooooooo...', '....oxxxxxxo....', '....oxxxxxxo....', '...oooooooooo...', '..oxxxxxxxxxxo..', '..oxxxxxxxxxxo..', '..oooooooooooo..', '................'],
    6: ['.......oo.......', '.....ooxxoo.....', '.....oxxxxo.....', '.....ooxxoo.....', '......oxxo......', '..ooooooooooo...', '.oxxxxxxxxxxxo..', '.oxxxxxexxxxxo..', '..oxxxxexxxxo...', '...oxxxexxxo....', '...ooooooooo....', '...oxxxxxxxo....', '..oxxxxxxxxxo...', '..oxxxxxxxxxo...', '..ooooooooooo...', '................']
  };
  function pixSvg(t, black) {
    const rows = PIX[t], col = black ? { o: '#000', x: '#262626', e: '#fff' } : { o: '#000', x: '#fff', e: '#000' };
    let r = '';
    rows.forEach((row, y) => {
      let x = 0;
      while (x < 16) {
        const c = row[x]; if (!col[c]) { x++; continue; }
        let n = 1; while (x + n < 16 && row[x + n] === c) n++;
        r += `<rect x="${x}" y="${y}" width="${n}" height="1" fill="${col[c]}"/>`; x += n;
      }
    });
    return `<svg class="chs-pc" viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true">${r}</svg>`;
  }
  // 1995 and 2000: smooth vector pieces (original shapes). .dt = detail lines.
  const BASE = '<path d="M22 82h56a4 4 0 0 1 4 4v4a2 2 0 0 1-2 2H20a2 2 0 0 1-2-2v-4a4 4 0 0 1 4-4z"/>';
  const VEC = {
    1: '<circle cx="50" cy="26" r="13"/><path d="M38 41h24a4 4 0 0 1 0 8H38a4 4 0 0 1 0-8z"/><path d="M40 49C40 63 30 72 28 82h44c-2-10-12-19-12-33z"/>' + BASE,
    2: '<path d="M30 82c-2-16 6-24 14-30-6-1-12 3-19 4-7 1-11-6-7-12 6-8 14-14 20-22l-2-12c6 2 10 6 12 8 6-4 12-4 14-4l-2 6c12 6 20 20 18 38-1 10-6 18-6 24z"/><circle class="dt2" cx="44" cy="30" r="3.5"/><path class="dt" d="M62 22c8 10 10 24 8 38"/>' + BASE,
    3: '<circle cx="50" cy="12" r="6"/><path d="M50 18c14 10 20 26 12 40H38c-8-14-2-30 12-40z"/><path class="dt" d="M56 30L46 44"/><path d="M36 58h28a4 4 0 0 1 0 8H36a4 4 0 0 1 0-8z"/><path d="M40 66c0 8-8 12-12 16h44c-4-4-12-8-12-16z"/>' + BASE,
    4: '<path d="M26 12h10v8h7v-8h14v8h7v-8h10v22l-6 6H32l-6-6z"/><path d="M34 40h32l3 36H31z"/><path d="M26 76h48v6H26z"/><path class="dt" d="M30 34h40"/>' + BASE,
    5: '<path d="M28 64L16 30l20 16 4-24 10 20 10-20 4 24 20-16-12 34z"/><circle cx="16" cy="28" r="5"/><circle cx="40" cy="19" r="5"/><circle cx="60" cy="19" r="5"/><circle cx="84" cy="28" r="5"/><path d="M28 64h44l-2 8H30z"/><path d="M32 72h36l4 10H28z"/>' + BASE,
    6: '<path d="M46 4h8v8h8v8h-8v10h-8V20h-8v-8h8z"/><path d="M50 34c-10-6-28-2-28 12 0 12 10 18 12 24h32c2-6 12-12 12-24 0-14-18-18-28-12z"/><path class="dt" d="M50 36v32"/><path d="M32 70h36l-2 6H34z"/><path d="M34 76h32l4 6H30z"/>' + BASE
  };
  const vecSvg = (t, black) => `<svg class="chs-pc chs-v ${black ? 'chs-bp' : 'chs-wp'}" viewBox="0 0 100 100" aria-hidden="true">${VEC[t]}</svg>`;
  const DEFS = '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><linearGradient id="chs-gw" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#e9e6df"/><stop offset="1" stop-color="#b9b3a8"/></linearGradient><linearGradient id="chs-gb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7a7f8a"/><stop offset=".45" stop-color="#2c2f36"/><stop offset="1" stop-color="#0c0d10"/></linearGradient></defs></svg>';

  const ICON = '<svg viewBox="0 0 32 32" shape-rendering="crispEdges" aria-hidden="true"><rect x="2" y="2" width="28" height="28" fill="#e8c890" stroke="#000"/><g fill="#9a5a2a"><rect x="9" y="3" width="7" height="7"/><rect x="23" y="3" width="6" height="7"/><rect x="3" y="10" width="6" height="7"/><rect x="16" y="10" width="7" height="7"/><rect x="9" y="17" width="7" height="6"/><rect x="23" y="17" width="6" height="6"/><rect x="3" y="23" width="6" height="6"/><rect x="16" y="23" width="7" height="6"/></g><path d="M10 28h13v-3h-2v-3l2-3v-5l-3-4h-2l-1-2h-2v2l-4 3-2 4 1 2 3-1 2-1-3 5v3h-2z" fill="#fff" stroke="#000"/><rect x="14" y="11" width="1" height="1" fill="#000"/></svg>';

  const CSS = `
    .chs{position:relative;height:100%;display:flex;flex-direction:column;overflow:hidden;user-select:none;-webkit-user-select:none;font:13px var(--ui);color:#000;background:#c0c0c0}
    .chs-e2000{background:linear-gradient(#f5f7fb,#dce3ee)}
    .chs-main{flex:1;min-height:0;display:grid;grid-template-columns:auto var(--side,220px);grid-template-rows:auto 1fr;gap:6px 10px;padding:8px;align-content:center;justify-content:center}
    .chs-bw{grid-row:1/3;position:relative;align-self:center}
    .chs-narrow .chs-main{display:flex;flex-direction:column;align-items:stretch;justify-content:flex-start;gap:5px;padding:5px}
    .chs-narrow .chs-bw{align-self:center}
    .chs-board{position:relative;display:grid;grid-template-columns:repeat(8,var(--sq,48px));grid-template-rows:repeat(8,var(--sq,48px));touch-action:none;cursor:pointer}
    .chs-sq{position:relative;display:grid;place-items:center;overflow:visible}
    .chs-pc{width:86%;height:86%;display:block;pointer-events:none}
    .chs-v path,.chs-v circle{stroke-width:3;stroke-linejoin:round}
    .chs-v .dt{fill:none!important}
    .chs-lift .chs-pc{opacity:.3}
    .chs-ghost{position:absolute;left:0;top:0;z-index:6;width:var(--sq);height:var(--sq);display:grid;place-items:center;pointer-events:none}
    .chs-ghost .chs-pc{transform:scale(1.15);filter:drop-shadow(2px 4px 2px rgba(0,0,0,.35))}
    .chs-dot{position:absolute;left:35%;top:35%;width:30%;height:30%;border-radius:50%;background:rgba(0,0,0,.3);pointer-events:none}
    .chs-ring{position:absolute;inset:3%;border-radius:50%;border:calc(var(--sq)*.07) solid rgba(0,0,0,.32);pointer-events:none}
    .chs-co{position:absolute;font:700 max(9px,calc(var(--sq)*.2))/1 var(--ui);pointer-events:none;opacity:.75}
    .chs-co.chs-r{left:2px;top:2px}.chs-co.chs-f{right:3px;bottom:2px}
    .chs-cur::after{content:'';position:absolute;inset:2px;outline:3px dashed #1060ff;outline-offset:-3px;pointer-events:none}
    .chs-hint::before{content:'';position:absolute;inset:0;box-shadow:inset 0 0 0 4px #c000c0;pointer-events:none}
    /* 1990: gray, Windows 3 style */
    .chs-e1990 .chs-board{border:3px solid;border-color:#fff #404040 #404040 #fff;outline:1px solid #000}
    .chs-e1990 .chs-l{background:#e0e0e0}.chs-e1990 .chs-d{background:#808080}
    .chs-e1990 .chs-d .chs-co{color:#fff}.chs-e1990 .chs-pc{width:84%;height:84%}
    .chs-e1990 .chs-last{box-shadow:inset 0 0 0 3px #000080}
    .chs-e1990 .chs-sel{background:#ffff00!important}
    .chs-e1990 .chs-chk{background:#ff0000!important}
    .chs-e1990 .chs-dot{border-radius:0;background:#000080;left:40%;top:40%;width:20%;height:20%}
    .chs-e1990 .chs-ring{border-radius:0;border:3px dotted #000080;inset:2px}
    /* 1995: wood */
    .chs-e1995 .chs-board{padding:0;border:12px solid #6b3810;border-image:linear-gradient(135deg,#a8662c,#5a2c0a) 12;box-shadow:inset 0 0 0 1px #2a1204,2px 3px 0 rgba(0,0,0,.5)}
    .chs-e1995 .chs-l{background:#ecd29f repeating-linear-gradient(100deg,rgba(150,90,30,.0) 0 7px,rgba(150,90,30,.12) 7px 9px)}
    .chs-e1995 .chs-d{background:#b3733b repeating-linear-gradient(80deg,rgba(60,25,0,.0) 0 6px,rgba(60,25,0,.16) 6px 8px)}
    .chs-e1995 .chs-l .chs-co{color:#7a4a1c}.chs-e1995 .chs-d .chs-co{color:#f6e2b8}
    .chs-e1995 .chs-last{box-shadow:inset 0 0 0 100vmax rgba(255,230,60,.38)}
    .chs-e1995 .chs-sel{box-shadow:inset 0 0 0 100vmax rgba(60,170,60,.5)}
    .chs-e1995 .chs-chk{box-shadow:inset 0 0 0 100vmax rgba(230,20,20,.6)}
    .chs-e1995 .chs-wp path,.chs-e1995 .chs-wp circle{fill:#f7f1e3;stroke:#2a1a0a}.chs-e1995 .chs-wp .dt{stroke:#8a7a60}.chs-e1995 .chs-wp .dt2{fill:#2a1a0a}
    .chs-e1995 .chs-bp path,.chs-e1995 .chs-bp circle{fill:#302824;stroke:#000}.chs-e1995 .chs-bp .dt{stroke:#9a8a80}.chs-e1995 .chs-bp .dt2{fill:#e8e0d0}
    .chs-e1995 .chs-pc{filter:drop-shadow(1px 2px 0 rgba(0,0,0,.35))}
    /* 2000: glossy */
    .chs-e2000 .chs-board{border-radius:10px;padding:0;border:10px solid #2b3a55;box-shadow:0 8px 22px rgba(20,30,60,.4),inset 0 0 0 1px rgba(255,255,255,.35);overflow:hidden;background:#2b3a55}
    .chs-e2000 .chs-board::after{content:'';position:absolute;inset:0;background:linear-gradient(160deg,rgba(255,255,255,.28),rgba(255,255,255,0) 42%);pointer-events:none;z-index:4}
    .chs-e2000 .chs-l{background:linear-gradient(135deg,#f4f7fb,#dde5ef)}.chs-e2000 .chs-d{background:linear-gradient(135deg,#8ca6c9,#6b88b0)}
    .chs-e2000 .chs-l .chs-co{color:#5a7090}.chs-e2000 .chs-d .chs-co{color:#eef3fa}
    .chs-e2000 .chs-last{box-shadow:inset 0 0 0 3px rgba(255,190,40,.95),inset 0 0 0 100vmax rgba(255,236,150,.4)}
    .chs-e2000 .chs-sel{box-shadow:inset 0 0 0 100vmax rgba(80,200,255,.55)}
    .chs-e2000 .chs-chk{background:radial-gradient(circle,#ff4040 0,rgba(255,60,60,.85) 40%,rgba(255,60,60,0) 72%),linear-gradient(#f4f7fb,#dde5ef)}
    .chs-e2000 .chs-dot{background:rgba(20,40,90,.35);box-shadow:0 0 0 2px rgba(255,255,255,.5)}
    .chs-e2000 .chs-ring{border-color:rgba(20,40,90,.4)}
    .chs-e2000 .chs-wp path,.chs-e2000 .chs-wp circle{fill:url(#chs-gw);stroke:#4a4a4a;stroke-width:2.5}.chs-e2000 .chs-wp .dt{stroke:#9a958a}.chs-e2000 .chs-wp .dt2{fill:#333}
    .chs-e2000 .chs-bp path,.chs-e2000 .chs-bp circle{fill:url(#chs-gb);stroke:#000;stroke-width:2.5}.chs-e2000 .chs-bp .dt{stroke:#8890a0}.chs-e2000 .chs-bp .dt2{fill:#dde}
    .chs-e2000 .chs-pc{filter:drop-shadow(1px 3px 2px rgba(0,0,0,.35))}
    /* side panel */
    .chs-st{padding:5px 7px;background:#fff;line-height:1.3;min-height:5.6em;box-sizing:border-box}
    .chs-e2000 .chs-st{border-radius:6px;background:rgba(255,255,255,.85);box-shadow:inset 0 1px 3px rgba(0,0,0,.25)}
    .chs-turn{display:flex;align-items:center;gap:6px;font-weight:700}
    .chs-sw{width:13px;height:13px;border:1px solid #000;flex:none}
    .chs-msg{margin-top:2px}.chs-msg.chs-warn{color:#b00000;font-weight:700}.chs-msg.chs-good{color:#006000;font-weight:700}
    .chs-think::after{content:'...';display:inline-block;width:1.4em;overflow:hidden;vertical-align:bottom;animation:chs-dots 1.2s steps(4) infinite}
    @keyframes chs-dots{0%{width:0}100%{width:1.4em}}
    .chs-side{display:flex;flex-direction:column;gap:6px;min-height:0;min-width:0}
    .chs-tray{display:flex;align-items:center;flex-wrap:wrap;min-height:22px;gap:0 1px;font-size:12px}
    .chs-tray .chs-pc{width:20px;height:20px}
    .chs-tray b{margin-left:4px}
    .chs-tl{font-size:11px;margin-right:4px;opacity:.8;min-width:0}
    .chs-ml{flex:1;min-height:48px;overflow-y:auto;background:#fff;font:12px/1.45 "Courier New",monospace;padding:3px 6px}
    .chs-e2000 .chs-ml{border-radius:6px}
    .chs-ml div{white-space:nowrap}.chs-ml span{display:inline-block;min-width:6.5ch}.chs-ml .chs-n{min-width:3.5ch;opacity:.6}.chs-ml .chs-now{background:#000080;color:#fff}
    .chs-btns{display:grid;grid-template-columns:1fr 1fr;gap:4px}
    .chs-btns .btn{min-height:30px;padding:3px 4px;min-width:0}
    .chs-rec{font-size:11px;opacity:.8}
    .chs-narrow .chs-st{min-height:0}
    .chs-narrow .chs-side{flex:1}
    .chs-narrow .chs-btns{grid-template-columns:repeat(4,1fr)}
    .chs-narrow .chs-btns .btn{min-height:40px}
    .chs-narrow .chs-trays{display:flex;gap:8px;justify-content:space-between}
    .chs-narrow .chs-ml{min-height:40px}
    /* overlays */
    .chs-ov{position:absolute;inset:0;display:grid;place-items:center;background:rgba(0,0,0,.35);z-index:8}
    .chs-box{background:#c0c0c0;padding:10px 12px;text-align:center;max-width:92%;box-sizing:border-box}
    .chs-e2000 .chs-box{background:linear-gradient(#fff,#e4e9f1);border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.4)}
    .chs-box h3{margin:0 0 6px;font-size:16px}.chs-box p{margin:0 0 8px}
    .chs-box .btn{min-height:36px;margin:2px}
    .chs-pro{display:flex;gap:6px;justify-content:center;margin-top:6px}
    .chs-pro button{width:calc(var(--sq)*1.1);height:calc(var(--sq)*1.1);min-width:44px;min-height:44px;display:grid;place-items:center;padding:2px}
    .chs-pro button.chs-on{outline:3px solid #1060ff}
    .chs-e1995 .chs-pro button{background:#ecd29f}
    /* tutorial */
    .chs-tut{position:absolute;inset:0;z-index:20;display:flex;flex-direction:column;background:inherit;padding:8px;gap:6px;overflow:auto;box-sizing:border-box}
    .chs-e2000 .chs-tut{background:linear-gradient(#f5f7fb,#dce3ee)}
    .chs-tut h3{margin:0;font-size:17px}
    .chs-tb{display:flex;gap:12px;align-items:flex-start;flex:1;min-height:0}
    .chs-narrow .chs-tb,.chs-tut.chs-tn .chs-tb{flex-direction:column;align-items:center}
    .chs-tt{flex:1;font-size:14px;line-height:1.45;background:#fff;padding:8px 10px;align-self:stretch;white-space:pre-line}
    .chs-e2000 .chs-tt{border-radius:8px}
    .chs-mini{display:grid;flex:none;border:3px solid #404040}
    .chs-mini .chs-sq{width:var(--ms);height:var(--ms)}
    .chs-mini .chs-pc{transition:none}
    .chs-mini .chs-hop .chs-pc{animation:chs-hop .35s ease-out}
    @keyframes chs-hop{0%{transform:scale(.6);opacity:.3}100%{transform:scale(1);opacity:1}}
    .chs-cap{text-align:center;font-weight:700;min-height:1.3em}
    .chs-tnav{display:flex;gap:6px;align-items:center;justify-content:center}
    .chs-tnav .btn{min-height:38px;min-width:80px}
    /* 1985 text mode */
    .chs-dos{position:absolute;inset:0;background:#000;color:var(--phos,#33ff66);font-family:var(--dos);display:flex;flex-direction:column;overflow:hidden;--dm:color-mix(in srgb,var(--phos,#33ff66) 55%,#000);--dk:color-mix(in srgb,var(--phos,#33ff66) 20%,#000);text-shadow:0 0 4px color-mix(in srgb,var(--phos,#33ff66) 45%,transparent)}
    .chs-dos pre{margin:0;font:inherit;line-height:1.12;white-space:pre}
    .chs-dscr{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;display:flex;flex-direction:column;align-items:center}
    .chs-dhd{width:100%;background:var(--phos,#33ff66);color:#000;text-shadow:none;white-space:pre;overflow:hidden;flex:none}
    .chs-drow{display:flex;gap:2ch;justify-content:center;align-items:flex-start}
    .chs-dnarrow .chs-drow{flex-direction:column;align-items:center;gap:0}
    .chs-dbd{width:37ch;cursor:pointer;touch-action:manipulation}
    .chs-dsd{width:38ch;white-space:pre-wrap;line-height:1.12}
    .chs-dnarrow .chs-dsd{width:38ch}
    .chs-q{color:color-mix(in srgb,var(--phos,#33ff66) 85%,#000)}
    .chs-q.chs-dk{background:var(--dk)}
    .chs-q.chs-inv{background:var(--phos,#33ff66);color:#000;text-shadow:none}
    .chs-q.chs-lm{text-decoration:underline}
    .chs-q.chs-cur{outline:2px solid var(--phos,#33ff66);outline-offset:0}
    .chs-q.chs-bl{animation:chs-blink .9s steps(2) infinite}
    @keyframes chs-blink{50%{opacity:.25}}
    .chs-dim{color:var(--dm)}.chs-br{color:var(--phos,#33ff66);font-weight:700}
    .chs-rv{background:var(--phos,#33ff66);color:#000;text-shadow:none}
    .chs-tap{cursor:pointer}
    .chs-dcmd{flex:none;display:flex;align-items:center;gap:1ch;padding:2px 1ch;border-top:1px solid var(--dm)}
    .chs-din{flex:1;min-width:0;background:#000!important;color:var(--phos,#33ff66)!important;border:1px solid var(--dm)!important;font:inherit!important;padding:2px 4px!important;min-height:1.6em;text-transform:none;outline:none}
    .chs-dbar{flex:none;background:var(--phos,#33ff66);color:#000;text-shadow:none;display:flex;flex-wrap:wrap;gap:0 2ch;padding:0 1ch}
    .chs-dbar span{cursor:pointer;padding:6px 0}
    .chs-dos .chs-tnav .chs-tap{padding:.5em 1ch;margin:0 .5ch}
    .chs-dsd .chs-tap{display:inline-block;padding:.2em 0}
    .chs-dos .chs-tut{background:#000}
    .chs-dos .chs-tt{background:#000;color:var(--phos,#33ff66);white-space:pre-wrap;font-size:inherit;line-height:1.2;padding:0 1ch}
  `;

  /* ---------- tutorial pages (mini boards: files a.., ranks 1..) ---------- */
  const TUT = [
    { t: 'The goal: checkmate', w: 5, h: 5, x: 'Each player starts with 16 pieces. White moves first, then you take turns, one move each.\n\nYou win by trapping the other king so it cannot escape. That is called CHECKMATE.\n\nHere the white queen slides over and traps the black king in the corner.',
      f: [{ p: { a5: 'bK', c4: 'wK', e1: 'wQ' } }, { p: { a5: 'bK', c4: 'wK', a1: 'wQ' }, chk: 'a5', cap: 'Checkmate!' }] },
    { t: 'The king', w: 5, h: 5, x: 'The king moves one square in any direction.\n\nHe is the most important piece: keep him safe! A king can never move to a square where he could be captured.',
      f: [{ p: { c3: 'wK' }, dots: 'c3' }, { p: { d4: 'wK' } }, { p: { c3: 'wK' }, dots: 'c3' }, { p: { b2: 'wK' } }] },
    { t: 'The queen', w: 5, h: 5, x: 'The queen is the strongest piece. She moves as far as she likes in a straight line: up, down, sideways or diagonally.\n\nShe cannot jump over other pieces.',
      f: [{ p: { c3: 'wQ' }, dots: 'c3' }, { p: { e5: 'wQ' } }, { p: { c3: 'wQ' }, dots: 'c3' }, { p: { a3: 'wQ' } }] },
    { t: 'The rook', w: 5, h: 5, x: 'The rook (it looks like a castle tower) moves as far as it likes up, down, left or right.\n\nIt cannot jump over other pieces.',
      f: [{ p: { c3: 'wR' }, dots: 'c3' }, { p: { c5: 'wR' } }, { p: { c3: 'wR' }, dots: 'c3' }, { p: { e3: 'wR' } }] },
    { t: 'The bishop', w: 5, h: 5, x: 'The bishop moves as far as it likes diagonally.\n\nThat means a bishop always stays on squares of the same color. Each player has one bishop for the light squares and one for the dark squares.',
      f: [{ p: { c3: 'wB' }, dots: 'c3' }, { p: { a5: 'wB' } }, { p: { c3: 'wB' }, dots: 'c3' }, { p: { e1: 'wB' } }] },
    { t: 'The knight', w: 5, h: 5, x: 'The knight (the horse) moves in an L shape: two squares one way, then one square to the side.\n\nIt is the only piece that can jump over other pieces!',
      f: [{ p: { c3: 'wN', b3: 'wP', c2: 'wP', d3: 'wP', c4: 'bP' }, dots: 'c3' }, { p: { d5: 'wN', b3: 'wP', c2: 'wP', d3: 'wP', c4: 'bP' } }, { p: { c3: 'wN', b3: 'wP', c2: 'wP', d3: 'wP', c4: 'bP' }, dots: 'c3' }, { p: { a2: 'wN', b3: 'wP', c2: 'wP', d3: 'wP', c4: 'bP' } }] },
    { t: 'The pawn', w: 5, h: 5, x: 'Pawns move straight ahead one square. On its very first move a pawn may move two squares.\n\nPawns capture differently: one square diagonally forward.\n\nWhen a pawn reaches the far side of the board it becomes a new piece, usually a queen!',
      f: [{ p: { b1: 'wP', c3: 'bN' }, dots: 'b1' }, { p: { b2: 'wP', c3: 'bN' }, dots: 'b2', cap: 'Capture diagonally' }, { p: { c3: 'wP' } }, { p: { c4: 'wP' } }, { p: { c5: 'wQ' }, cap: 'A new queen!' }] },
    { t: 'Castling', w: 8, h: 1, x: 'Once per game your king can CASTLE: the king moves two squares toward a rook, and that rook hops over to the king\'s other side.\n\nYou may castle only if the king and that rook have not moved yet, the squares between them are empty, and the king is not in check and does not pass through or land on a square the enemy attacks.\n\nTo castle here, move your king two squares.',
      f: [{ p: { a1: 'wR', e1: 'wK', h1: 'wR' } }, { p: { a1: 'wR', f1: 'wR', g1: 'wK' }, cap: 'Short castling (O-O)' }, { p: { a1: 'wR', e1: 'wK', h1: 'wR' } }, { p: { c1: 'wK', d1: 'wR', h1: 'wR' }, cap: 'Long castling (O-O-O)' }] },
    { t: 'En passant', w: 5, h: 5, x: 'A special pawn capture. If an enemy pawn moves two squares and lands right beside your pawn, you may capture it as if it had moved only one square.\n\nYou must do it on your very next move, or the chance is gone.',
      f: [{ p: { b3: 'wP', c5: 'bP' } }, { p: { b3: 'wP', c3: 'bP' }, cap: 'Black moves two squares...' }, { p: { c4: 'wP' }, cap: '...and White captures en passant!' }] },
    { t: 'Check', w: 5, h: 5, x: 'When a king is attacked, it is in CHECK. The player in check must fix it right away:\n\n- move the king to a safe square,\n- block the attack with another piece, or\n- capture the attacking piece.\n\nIf there is no way out, it is checkmate.',
      f: [{ p: { c1: 'wK', c5: 'bR', e2: 'wN' }, chk: 'c1', cap: 'Check!' }, { p: { b1: 'wK', c5: 'bR', e2: 'wN' }, cap: 'Move away...' }, { p: { c1: 'wK', c5: 'bR', e2: 'wN' }, chk: 'c1' }, { p: { c1: 'wK', c5: 'bR', c3: 'wN' }, cap: '...or block!' }] },
    { t: 'Draws', w: 5, h: 5, x: 'Sometimes nobody wins. The game is a draw when:\n\n- STALEMATE: the player to move has no legal move but is not in check (like Black here),\n- the same position happens three times,\n- 50 moves by each player pass with no capture and no pawn move, or\n- there are not enough pieces left to checkmate.',
      f: [{ p: { a5: 'bK', b3: 'wQ', c4: 'wK' }, cap: 'Black to move: stalemate' }] },
    { t: 'Tips for winning', w: 5, h: 5, x: 'Move your center pawns and bring out your knights and bishops early. Castle to keep your king safe.\n\nBefore every move, ask: can the other side capture something of mine? Could I capture something?\n\nPieces are worth about: pawn 1, knight 3, bishop 3, rook 5, queen 9.\n\nOn Beginner and Easy, press Hint if you get stuck!',
      f: [{ p: { a1: 'wP', b1: 'wN', c1: 'wB', d1: 'wR', e1: 'wQ' } }] }
  ];
  const T_ORDER = { K: 6, Q: 5, R: 4, B: 3, N: 2, P: 1 };
  function miniDots(pg, fr) {
    const out = []; if (!fr.dots) return out;
    const s = fr.dots, f0 = s.charCodeAt(0) - 97, r0 = +s[1] - 1, t = fr.p[s][1];
    const occ = (f, r) => fr.p[String.fromCharCode(97 + f) + (r + 1)];
    const add = (f, r) => { if (f >= 0 && r >= 0 && f < pg.w && r < pg.h) { const o = occ(f, r); if (!o || o[0] !== fr.p[s][0]) out.push(String.fromCharCode(97 + f) + (r + 1)); return !o; } return false; };
    const slide = dirs => dirs.forEach(([df, dr]) => { let f = f0 + df, r = r0 + dr; while (add(f, r)) { f += df; r += dr; } });
    if (t === 'K') [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([a, b]) => add(f0 + a, r0 + b));
    if (t === 'N') [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]].forEach(([a, b]) => add(f0 + a, r0 + b));
    if (t === 'R' || t === 'Q') slide([[1, 0], [-1, 0], [0, 1], [0, -1]]);
    if (t === 'B' || t === 'Q') slide([[1, 1], [1, -1], [-1, 1], [-1, -1]]);
    if (t === 'P') { if (!occ(f0, r0 + 1)) { out.push(String.fromCharCode(97 + f0) + (r0 + 2)); if (r0 === 0 && !occ(f0, r0 + 2)) out.push(String.fromCharCode(97 + f0) + (r0 + 3)); } [-1, 1].forEach(d => { const o = occ(f0 + d, r0 + 1); if (o && o[0] !== 'w') out.push(String.fromCharCode(97 + f0 + d) + (r0 + 2)); }); }
    return out;
  }

  function openChess(W, api) {
    const era = api.era.id, dos = era === '1985', E2 = api.esc;
    const OPT = Object.assign({ level: 1, color: 'w', twoP: false, sound: true, legal: true }, api.load('opts', {}));
    const STATS = Object.assign({}, api.load('stats', {}));
    const saveOpt = () => api.save('opts', OPT);
    const stat = i => STATS[i] || (STATS[i] = { w: 0, l: 0, d: 0 });
    const timers = new Set();
    const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); return t; };
    let G = null, P = null, legal = [], sanCache = null, keys = [], last = 0;
    let sel = -1, cursor = 20, showCur = false, hintM = 0, msg = '', msgKind = '', thinking = false, reqId = 0, anim = null;
    let promo = null, tut = null, tutTimer = 0, drag = null, closed = false;
    let worker = null, wurl = null;
    const pend = {};

    /* ---------- sounds ---------- */
    const snd = {
      move() { if (OPT.sound) { api.sfx.click(); api.tone(dos ? 660 : 330, 0.04, { type: dos ? 'square' : 'triangle', vol: 0.05, decay: 1 }); } },
      cap() { if (OPT.sound) { api.noise(0.09, { ft: 'bandpass', f: 700, q: 1.2, vol: 0.12, decay: 1 }); api.tone(220, 0.09, { type: dos ? 'square' : 'triangle', vol: 0.07, to: 140, decay: 1 }); } },
      check() { if (OPT.sound) { api.tone(880, 0.14, { type: dos ? 'square' : 'sine', vol: 0.07 }); api.tone(1320, 0.22, { type: dos ? 'square' : 'sine', vol: 0.06, at: 0.13 }); } },
      bad() { if (OPT.sound) api.tone(180, 0.12, { type: 'square', vol: 0.05 }); },
      win() { if (OPT.sound) api.sfx.tada(); },
      lose() { if (OPT.sound) [523, 440, 349].forEach((f, i) => api.tone(f, 0.22, { type: 'triangle', vol: 0.07, at: i * 0.2 })); },
      draw() { if (OPT.sound) api.sfx.ding(); }
    };

    /* ---------- game state ---------- */
    const vsCpu = () => G.mode === 'cpu';
    const humanTurn = () => !G.over && (!vsCpu() || P.side === G.human);
    const sanOf = m => { if (!sanCache) sanCache = new Map(); if (!sanCache.has(m)) sanCache.set(m, E.san(P, m, legal)); return sanCache.get(m); };
    function applyCore(m) {
      const s = E.san(P, m, legal), fl = m >>> 18, to = (m >> 7) & 127;
      let capP = 0;
      if (fl & E.F_EP) capP = 1; else if (fl & E.F_CAP) capP = P.b[to] & 7;
      if (capP) G.caps[P.side].push(capP);
      E.make(P, m);
      G.moves.push(m); G.sans.push(s);
      legal = E.legalMoves(P); sanCache = null;
      keys.push(E.posKey(P, legal));
      last = m;
      return capP;
    }
    function replay(ucis) {
      P = E.fromFEN(G.start); G.moves = []; G.sans = []; G.caps = [[], []];
      legal = E.legalMoves(P); sanCache = null; keys = [E.posKey(P, legal)]; last = 0;
      for (const u of ucis) { const m = legal.find(x => E.uci(x) === u); if (!m) break; applyCore(m); }
    }
    function status() {
      if (!legal.length) return E.inCheck(P) ? { kind: 'mate', winner: P.side ^ 1 } : { kind: 'stalemate' };
      if (E.insufficient(P)) return { kind: 'material' };
      if (P.half >= 100) return { kind: 'fifty' };
      const k = keys[keys.length - 1]; let n = 0; keys.forEach(x => { if (x === k) n++; });
      if (n >= 3) return { kind: 'repeat' };
      return null;
    }
    function save() {
      if (!G) return;
      api.save('game', G.over ? null : { start: G.start, moves: G.moves.map(E.uci), mode: G.mode, level: G.level, minLevel: G.minLevel, human: G.human, flipped: G.flipped });
    }
    function newGame(quiet) {
      cancelThink(); closePromo();
      const human = OPT.color === 'r' ? (Math.random() < 0.5 ? 0 : 1) : OPT.color === 'b' ? 1 : 0;
      G = { start: START, mode: OPT.twoP ? '2p' : 'cpu', level: OPT.level, minLevel: OPT.level, human, flipped: !OPT.twoP && human === 1, over: null };
      replay([]);
      sel = -1; hintM = 0; cursor = G.flipped ? 100 : 20;
      startMsg();
      if (!quiet && OPT.sound) api.sfx.blip ? api.sfx.blip(660) : 0;
      save(); render();
      if (vsCpu() && P.side !== G.human) cpuMove();
    }
    function startMsg() {
      if (!vsCpu()) setMsg(`Two players: take turns on this computer. ${SIDE[P.side]} moves first.`);
      else if (P.side === G.human) setMsg(`You play ${SIDE[G.human]} against the ${LEVELS[G.level]} computer. Your move!`);
      else setMsg(`You play ${SIDE[G.human]} against the ${LEVELS[G.level]} computer. The computer moves first.`);
    }
    function askNew() {
      if (G && G.moves.length && !G.over) api.msgBox('Chess', 'Start a new game? The game you are playing will be lost.', ['New game', 'Cancel'], 'warn').then(b => { if (b === 'New game') newGame(); });
      else newGame();
    }
    function setMsg(t, kind) { msg = t || ''; msgKind = kind || ''; }

    function playMove(m, o = {}) {
      const mover = P.side, from = m & 127, to = (m >> 7) & 127, fl = m >>> 18, moverWasHuman = !vsCpu() || mover === G.human;
      const capP = applyCore(m);
      sel = -1; hintM = 0; closePromo();
      anim = o.anim && era === '2000' ? { m, t0: performance.now() } : null;
      const chk = E.inCheck(P), st = status();
      if (st) { if (capP) snd.cap(); else snd.move(); finish(st); return; }
      if (chk) snd.check(); else if (capP) snd.cap(); else snd.move();
      if (vsCpu()) {
        if (chk && P.side === G.human) setMsg('Your king is in check! Protect it.', 'warn');
        else if (chk) setMsg('Check! You are attacking the king.', 'good');
        else if (capP && moverWasHuman) setMsg(`Nice! You captured a ${PNAME[capP]}.`, 'good');
        else if (capP) setMsg(`The computer took your ${PNAME[capP]}.`);
        else if (fl & E.F_CASTLE) setMsg(moverWasHuman ? 'You castled. Your king is safer now!' : 'The computer castled.');
        else if ((m >> 14) & 15) setMsg(moverWasHuman ? `Your pawn became a ${PNAME[(m >> 14) & 15]}!` : `The computer's pawn became a ${PNAME[(m >> 14) & 15]}.`);
        else if (moverWasHuman) setMsg('');
        else setMsg(`The computer moved ${G.sans[G.sans.length - 1]}. Your turn!`);
      } else {
        if (chk) setMsg(`${SIDE[P.side]}'s king is in check! Protect it.`, 'warn');
        else if (capP) setMsg(`${SIDE[mover]} captured a ${PNAME[capP]}.`);
        else setMsg('');
      }
      void from; void to;
      save(); render();
      if (vsCpu() && P.side !== G.human) cpuMove();
    }
    function finish(st, resigned) {
      cancelThink();
      const w = st.winner;
      let title, why, res;
      if (st.kind === 'mate') { title = 'Checkmate!'; why = `The ${SIDE[w ^ 1].toLowerCase()} king is in check and has no way to escape.`; res = w; }
      else if (st.kind === 'resign') { title = vsCpu() ? 'You resigned.' : `${SIDE[w ^ 1]} resigned.`; why = vsCpu() ? 'The computer wins this game.' : `${SIDE[w]} wins.`; res = w; }
      else {
        res = -1;
        title = { stalemate: 'Stalemate: a draw.', material: 'Draw: not enough pieces.', fifty: 'Draw: the 50-move rule.', repeat: 'Draw by repetition.' }[st.kind];
        why = { stalemate: `${SIDE[P.side]} has no legal move, but the king is not in check.`, material: 'Neither side has enough pieces left to checkmate.', fifty: 'Each player made 50 moves in a row with no capture and no pawn move.', repeat: 'The same position happened three times.' }[st.kind];
      }
      let sub = '', earned = 0;
      if (vsCpu()) {
        const S = stat(G.minLevel);
        if (res === -1) { S.d++; sub = 'Nobody wins this time. Well played!'; snd.draw(); }
        else if (res === G.human) {
          S.w++;
          earned = api.earn(PAY[G.minLevel], 'winning at chess') || 0;
          api.task('chess-win', { level: LEVELS[G.minLevel].toLowerCase() });
          sub = `You beat the ${LEVELS[G.minLevel]} computer!` + (earned ? ` You earned $${earned}.` : '');
          snd.win();
        } else { S.l++; sub = st.kind === 'resign' ? 'Try again: every game makes you better!' : 'The computer wins this time. Good try! Want to play again?'; snd.lose(); }
        api.save('stats', STATS);
      } else {
        sub = res === -1 ? 'It\'s a draw.' : `${SIDE[res]} wins!`;
        if (res === -1) snd.draw(); else snd.win();
      }
      if (st.kind === 'mate') title = vsCpu() ? (res === G.human ? 'Checkmate! You win!' : 'Checkmate. The computer wins.') : `Checkmate! ${SIDE[res]} wins!`;
      G.over = { title, why, sub, res, win: vsCpu() && res === G.human, show: true };
      setMsg(why, res === -1 ? '' : (vsCpu() && res !== G.human ? 'warn' : 'good'));
      save(); render();
      void resigned;
    }

    /* ---------- computer opponent (Web Worker from a Blob; falls back to short searches on the page) ---------- */
    function getWorker() {
      if (worker !== null) return worker;
      try {
        wurl = URL.createObjectURL(new Blob([WORKER_SRC], { type: 'text/javascript' }));
        worker = new Worker(wurl);
        worker.onmessage = e => { const cb = pend[e.data.id]; delete pend[e.data.id]; if (cb) cb(e.data.move); };
        worker.onerror = ev => { if (ev && ev.preventDefault) ev.preventDefault(); killWorker(); worker = false; Object.keys(pend).forEach(id => { const cb = pend[id]; delete pend[id]; cb(null); }); };
      } catch (e) { worker = false; }
      return worker;
    }
    function killWorker() { try { if (worker) worker.terminate(); } catch (e) { /* ignore */ } if (wurl) { URL.revokeObjectURL(wurl); wurl = null; } worker = null; }
    function localThink(req) { const Q = E.fromFEN(req.fen); req.moves.forEach(m => E.make(Q, m)); return E.think(Q, req.level, req.fromStart, 250); }
    function ask(level, cb) {
      const req = { id: ++reqId, fen: G.start, moves: G.moves.slice(), level, fromStart: G.start === START };
      const done = mv => { if (closed || req.id !== reqId) return; if (!mv) mv = localThink(req); cb(mv); };
      const w = getWorker();
      if (w) {
        pend[req.id] = done; w.postMessage(req);
        later(() => { if (pend[req.id]) { delete pend[req.id]; killWorker(); done(null); } }, 8000);
      } else later(() => done(null), 30);
    }
    function cancelThink() { if (thinking || hintM === -1) { reqId++; } thinking = false; }
    function cpuMove() {
      if (G.over) return;
      thinking = true; render();
      const t0 = Date.now(), minWait = [900, 700, 500, 300][G.level];
      ask(G.level, mv => {
        later(() => {
          if (!thinking || closed) return;
          thinking = false;
          const m = legal.includes(mv) ? mv : legal[0];
          if (m) playMove(m, { anim: true });
        }, Math.max(0, minWait - (Date.now() - t0)));
      });
    }
    const canHint = () => vsCpu() && G.level <= 1 && humanTurn() && !thinking && !G.over;
    const canUndo = () => G.moves.length > 0 && !(G.over && G.over.win) && (!vsCpu() || G.moves.length > (G.human === 1 ? 1 : 0));
    function hint() {
      if (!canHint()) { if (vsCpu() && G.level > 1) setMsg('Hints are for Beginner and Easy levels.'); render(); return; }
      setMsg('Thinking of a good move for you'); hintM = -1; render();
      ask(4, mv => {
        if (!legal.includes(mv) || !humanTurn()) { hintM = 0; render(); return; }
        hintM = mv;
        const from = mv & 127, to = (mv >> 7) & 127, t = P.b[from] & 7;
        setMsg(`Hint: try moving your ${PNAME[t]} from ${E.sqName(from)} to ${E.sqName(to)}.`, 'good');
        if (OPT.sound) api.sfx.blip ? api.sfx.blip(990) : 0;
        render();
      });
    }
    function undo() {
      if (!canUndo()) { snd.bad(); return; }
      cancelThink(); closePromo();
      const ucis = G.moves.map(E.uci);
      let n = 1;
      if (vsCpu()) { const sideAfter = k => (ucis.length - k) % 2 === 0 ? 0 : 1; n = 1; while (n < ucis.length && sideAfter(n) !== G.human) n++; if (sideAfter(n) !== G.human) n = ucis.length; }
      G.over = null;
      replay(ucis.slice(0, ucis.length - n));
      sel = -1; hintM = 0;
      setMsg('Move taken back. Try something else!');
      snd.move(); save(); render();
      if (vsCpu() && P.side !== G.human && !G.over) cpuMove();
    }
    function resign() {
      if (G.over || !G.moves.length) return;
      api.msgBox('Chess', vsCpu() ? 'Give up this game? It will count as a loss.' : `${SIDE[P.side]} gives up this game?`, ['Resign', 'Keep playing'], 'warn').then(b => {
        if (b !== 'Resign' || G.over) return;
        finish({ kind: 'resign', winner: vsCpu() ? G.human ^ 1 : P.side ^ 1 });
      });
    }
    function flip() { G.flipped = !G.flipped; save(); render(); }
    function setLevel(i) {
      OPT.level = i; saveOpt();
      if (OPT.twoP) { OPT.twoP = false; saveOpt(); askNew(); return; }
      if (!G.over) { G.level = i; G.minLevel = Math.min(G.minLevel, i); save(); }
      setMsg(`Level: ${LEVELS[i]}.` + (G.over ? '' : i > G.minLevel ? ' (Winning this game pays the ' + LEVELS[G.minLevel] + ' prize.)' : ''));
      render();
    }
    function setColor(c) {
      OPT.color = c; saveOpt();
      if (!G.moves.length || G.over) { newGame(); return; }
      api.msgBox('Chess', `Start a new game now to play ${c === 'r' ? 'a random color' : c === 'w' ? 'White' : 'Black'}?`, ['New game', 'Later'], 'info').then(b => { if (b === 'New game') newGame(); });
    }
    function setTwoP(on) {
      OPT.twoP = on; saveOpt();
      if (!G.moves.length || G.over) { newGame(); return; }
      api.msgBox('Chess', on ? 'Start a new two-player game?' : 'Start a new game against the computer?', ['New game', 'Later'], 'info').then(b => { if (b === 'New game') newGame(); });
    }

    /* ---------- player input ---------- */
    function pieceAt(sq) { return sq >= 0 ? P.b[sq] : 0; }
    const own = sq => { const p = pieceAt(sq); return p && ((p & 8) ? 1 : 0) === P.side; };
    const movesFrom = sq => legal.filter(m => (m & 127) === sq);
    function tapSquare(sq, fromDrag) {
      if (sq < 0 || !G) return;
      if (G.over) { if (G.over.show) return; setMsg(G.over.title + ' Choose New game to play again.'); render(); return; }
      if (promo) return;
      if (!humanTurn()) { setMsg(thinking ? 'Wait a moment: the computer is thinking.' : ''); render(); return; }
      if (sel >= 0 && sq !== sel) {
        const ms = legal.filter(m => (m & 127) === sel && ((m >> 7) & 127) === sq);
        if (ms.length) { tryMoves(ms, fromDrag); return; }
      }
      if (own(sq)) {
        if (sq === sel && !fromDrag) { sel = -1; render(); return; }
        sel = sq; hintM = hintM > 0 && (hintM & 127) === sq ? hintM : 0;
        const n = movesFrom(sq).length, t = P.b[sq] & 7;
        if (!n) { setMsg(E.inCheck(P) ? 'Your king is in check! This piece can\'t help. Protect your king.' : `That ${PNAME[t]} has no moves right now. Try another piece.`, 'warn'); snd.bad(); }
        else if (E.inCheck(P)) setMsg('Your king is in check! Protect it.', 'warn');
        else if (msgKind === 'warn') setMsg('');
        render(); return;
      }
      if (sel >= 0) {
        const t = P.b[sel] & 7;
        const pseudo = E.gen(P, [], false).some(m => (m & 127) === sel && ((m >> 7) & 127) === sq);
        if (pseudo) setMsg(E.inCheck(P) ? 'Your king is in check! That move doesn\'t protect it.' : 'That move would put your king in danger. Try another one.', 'warn');
        else setMsg(`A ${PNAME[t]} can't move there. ${OPT.legal ? 'The dots show where it can go.' : TIPS[t]}`, 'warn');
        snd.bad(); sel = -1; render(); return;
      }
      const p = pieceAt(sq);
      if (p) setMsg(vsCpu() ? 'That\'s the computer\'s piece. Pick one of your own.' : `It's ${SIDE[P.side]}'s turn.`);
      render();
    }
    function tryMoves(ms, fromDrag) {
      if (ms.length > 1) { openPromo(ms); return; }
      playMove(ms[0], { anim: !fromDrag });
    }
    function openPromo(ms) {
      promo = { ms, pick: 0 };
      if (OPT.sound) api.sfx.beep();
      render();
    }
    function closePromo() { promo = null; }
    function choosePromo(i) {
      if (!promo) return;
      const want = [5, 4, 3, 2][i], m = promo.ms.find(x => ((x >> 14) & 15) === want);
      promo = null; if (m) playMove(m, { anim: true }); else render();
    }
    function moveCursor(dx, dy) {
      showCur = true;
      let c = cursor & 7, r = cursor >> 4;
      const f = G.flipped ? -1 : 1;
      c = Math.max(0, Math.min(7, c + dx * f)); r = Math.max(0, Math.min(7, r - dy * f));
      cursor = r * 16 + c; render();
    }

    // Typed moves (1985 and anywhere via keyboard): e2e4, e7e8q, Nf3, exd5, O-O, plus a few commands.
    function parseMove(s) {
      let t = s.trim().replace(/[+#!?]/g, '').replace(/\s+/g, '');
      if (/^(0-0-0|o-o-o|ooo)$/i.test(t)) t = 'O-O-O'; else if (/^(0-0|o-o|oo)$/i.test(t)) t = 'O-O';
      const c = /^([a-h][1-8])[-x:]?([a-h][1-8])=?([qrbn])?$/i.exec(t);
      if (c) {
        const f = E.parseSq(c[1].toLowerCase()), to = E.parseSq(c[2].toLowerCase()), pr = c[3] ? ' pnbrqk'.indexOf(c[3].toLowerCase()) : 5;
        const ms = legal.filter(m => (m & 127) === f && ((m >> 7) & 127) === to);
        if (ms.length > 1) return ms.find(m => ((m >> 14) & 15) === pr) || 0;
        return ms[0] || (f >= 0 && to >= 0 ? -1 : 0);
      }
      const clean = x => x.replace(/[+#=]/g, '');
      const tt = clean(t);
      let m = legal.find(x => clean(sanOf(x)) === tt);
      if (m) return m;
      const low = legal.filter(x => clean(sanOf(x)).toLowerCase() === tt.toLowerCase());
      if (low.length === 1) return low[0];
      if (low.length > 1) return low.find(x => (P.b[x & 127] & 7) === 1) || low[0];
      if (/^[a-h][1-8][qrbn]$/i.test(tt)) { m = legal.find(x => clean(sanOf(x)).toLowerCase() === tt.toLowerCase().slice(0, 2) + tt.toLowerCase()[2]); if (m) return m; }
      return 0;
    }
    function typed(s) {
      const u = s.trim().toUpperCase();
      if (!u) return;
      const cmds = { NEW: askNew, UNDO: undo, TAKEBACK: undo, FLIP: flip, HINT: hint, HELP: openTut, '?': openTut, RESIGN: resign, QUIT: () => api.close(), EXIT: () => api.close() };
      if (cmds[u]) { cmds[u](); return; }
      const lv = /^LEVEL\s*([1-4])$/.exec(u); if (lv) { setLevel(+lv[1] - 1); return; }
      if (G.over) { setMsg('This game is over. Type NEW for a new game.'); render(); return; }
      if (/^[A-H][1-8]$/.test(u) && (own(E.parseSq(u.toLowerCase())) || sel >= 0)) { tapSquare(E.parseSq(u.toLowerCase())); return; }
      if (!humanTurn()) { setMsg('Wait a moment: the computer is thinking.'); render(); return; }
      const m = parseMove(s);
      if (m > 0) { playMove(m, { anim: true }); return; }
      snd.bad();
      setMsg(m === -1 ? `"${s.trim()}" is not a legal move here.` + (E.inCheck(P) ? ' Your king is in check! Protect it.' : '') : `I don't understand "${s.trim()}". Type a move like e2e4 or Nf3, or HELP.`, 'warn');
      render();
    }

    /* ---------- tutorial ---------- */
    function openTut() { tut = { page: 0, frame: 0 }; startTutTimer(); render(); }
    function closeTut() { tut = null; clearInterval(tutTimer); tutTimer = 0; render(); }
    function tutGo(d) { if (!tut) return; tut.page = Math.max(0, Math.min(TUT.length - 1, tut.page + d)); tut.frame = 0; if (OPT.sound) api.sfx.click(); startTutTimer(); render(); }
    function startTutTimer() {
      clearInterval(tutTimer);
      tutTimer = setInterval(() => { if (!tut) return; const pg = TUT[tut.page]; if (pg.f.length < 2) return; tut.frame = (tut.frame + 1) % pg.f.length; tut.hop = true; renderTut(); }, 1300);
    }

    /* ---------- menus ---------- */
    const mark = on => (on ? '[x] ' : '[ ] ');
    api.menubar([
      { label: 'Game', items: () => [
        { label: 'New game', fn: askNew },
        { label: 'Undo move', fn: undo, disabled: !canUndo() },
        { label: 'Flip board', fn: flip },
        { label: 'Hint', fn: hint, disabled: !canHint() },
        { label: 'Resign', fn: resign, disabled: !!G.over || !G.moves.length },
        '-', { label: 'How to play', fn: openTut },
        '-', { label: 'Exit', fn: () => api.close() }] },
      { label: 'Options', items: () => [
        ...LEVELS.map((n, i) => ({ label: mark(!OPT.twoP && OPT.level === i) + `${n} ($${PAY[i]} a win)`, fn: () => setLevel(i) })),
        '-',
        { label: mark(OPT.color === 'w') + 'Play White', fn: () => setColor('w') },
        { label: mark(OPT.color === 'b') + 'Play Black', fn: () => setColor('b') },
        { label: mark(OPT.color === 'r') + 'Random color', fn: () => setColor('r') },
        '-',
        { label: mark(OPT.twoP) + '2 players (same computer)', fn: () => setTwoP(!OPT.twoP) },
        '-',
        { label: mark(OPT.sound) + 'Sounds', fn: () => { OPT.sound = !OPT.sound; saveOpt(); } },
        { label: mark(OPT.legal) + 'Show legal moves', fn: () => { OPT.legal = !OPT.legal; saveOpt(); render(); } }] },
      { label: 'Help', items: [
        { label: 'How to play', fn: openTut },
        { label: 'Statistics', fn: showStats },
        { label: 'About Chess', fn: () => api.msgBox('About Chess', `Chess\nFree with ${era === '1985' ? 'Horizon DOS' : era === '1990' ? 'Horizon 3.0' : era === '1995' ? 'Horizon 95' : 'Horizon 2000'}.\n\nPlay the computer at four levels, or play a friend on the same computer. Win against the computer to earn play money: $2 Beginner, $3 Easy, $4 Medium, $6 Hard.`) }] }
    ]);
    function showStats() {
      const lines = LEVELS.map((n, i) => { const s = stat(i); return `${n}: ${s.w} won, ${s.l} lost, ${s.d} drawn`; });
      api.msgBox('Statistics', 'Your games against the computer:\n\n' + lines.join('\n'), ['OK', 'Clear']).then(b => {
        if (b === 'Clear') api.msgBox('Statistics', 'Clear all your chess records?', ['Clear', 'Cancel'], 'warn').then(c => { if (c === 'Clear') { Object.keys(STATS).forEach(k => delete STATS[k]); api.save('stats', STATS); render(); } });
      });
    }

    /* ---------- DOM ---------- */
    const root = document.createElement('div');
    root.className = `chs chs-e${era}`;
    W.body.appendChild(root);
    if (dos) {
      root.innerHTML = `<div class="chs-dos"><div class="chs-dhd"></div><div class="chs-dscr"><div class="chs-drow"><pre class="chs-dbd"></pre><div class="chs-dsd"></div></div></div>
        <div class="chs-dcmd"><span>MOVE&gt;</span><input class="chs-din" type="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="go" placeholder="${coarse() ? 'tap here to type e2e4' : 'e2e4, Nf3 or HELP'}" aria-label="Type a move"></div>
        <div class="chs-dbar"></div></div>`;
    } else {
      root.innerHTML = `${DEFS}<div class="chs-main"><div class="chs-st" role="status"></div><div class="chs-bw"><div class="chs-board" role="grid" aria-label="Chess board"></div></div>
        <div class="chs-side"><div class="chs-trays"><div class="chs-tray chs-t0"></div><div class="chs-tray chs-t1"></div></div><div class="chs-btns">
        <button class="btn" data-a="new">New</button><button class="btn" data-a="undo">Undo</button><button class="btn" data-a="hint">Hint</button><button class="btn" data-a="flip">Flip</button></div>
        <div class="chs-ml sunken"></div><div class="chs-rec"></div></div></div>`;
      root.querySelector('.chs-st').classList.add('sunken');
    }
    const $ = s => root.querySelector(s);
    const boardEl = $(dos ? '.chs-dbd' : '.chs-board');
    const dinp = dos ? $('.chs-din') : null;
    let charW = 0.6;

    const pieceSvg = (p) => { const t = p & 7, b = !!(p & 8); return era === '1990' ? pixSvg(t, b) : vecSvg(t, b); };
    const svgCache = {};
    const pieceHTML = p => svgCache[p] || (svgCache[p] = pieceSvg(p));

    // display row/col -> square
    const sqAt = (c, r) => G.flipped ? (r * 16 + (7 - c)) : ((7 - r) * 16 + c);

    /* ---------- layout ---------- */
    function fit() {
      if (closed) return;
      if (dos) return fitDos();
      const bw = root.clientWidth, bh = root.clientHeight; if (!bw || !bh) return;
      const narrow = bw < 440 || bh > bw * 1.05;
      root.classList.toggle('chs-narrow', narrow);
      const frame = era === '1990' ? 8 : era === '1995' ? 26 : 22;
      let size;
      if (!narrow) {
        const side = Math.round(Math.max(150, Math.min(240, bw * 0.32)));
        root.style.setProperty('--side', side + 'px');
        size = Math.min(bw - side - 30, bh - 18);
      } else size = Math.min(bw - 12, bh - 178);
      const sq = Math.max(26, Math.floor((size - frame) / 8));
      root.style.setProperty('--sq', sq + 'px');
    }
    function fitDos() {
      const scr = $('.chs-dos'); const w = scr.clientWidth, h = scr.clientHeight; if (!w || !h) return;
      if (!charW || charW === 0.6) {
        const m = document.createElement('span'); m.style.cssText = 'position:absolute;visibility:hidden;font:100px var(--dos);white-space:pre'; m.textContent = 'M'.repeat(20); scr.appendChild(m); charW = (m.getBoundingClientRect().width / 2000) || 0.6; m.remove();
        const r = boardEl.getBoundingClientRect(); if (r.width && boardEl.offsetWidth) charW *= boardEl.offsetWidth / r.width; // undo screen scaling
      }
      const wide = w >= 600;
      scr.classList.toggle('chs-dnarrow', !wide);
      const cols = wide ? 80 : 40, rows = wide ? 25 : 26;
      let fs = w / (cols * charW) * 0.98;
      fs = Math.min(fs, h / (rows * 1.12));
      if (!wide) fs = Math.max(fs, Math.min(w / (40 * charW) * 0.98, 13));
      scr.style.fontSize = Math.max(9, Math.floor(fs * 10) / 10) + 'px';
    }

    /* ---------- render ---------- */
    function targets() { return sel >= 0 ? movesFrom(sel).map(m => (m >> 7) & 127) : []; }
    function render() {
      if (closed || !G) return;
      setTimeout(() => { W.keepEsc = !!(sel >= 0 || promo || tut || (G && G.over && G.over.show)); }, 0);
      if (dos) renderDos(); else renderDom();
      renderTut();
    }
    // [move number, index of White's move (-1 when the game started with Black to move)]
    function movePairs() {
      const f = G.start.split(' '), blackFirst = f[1] === 'b', out = [];
      let num = +f[5] || 1, i = 0;
      if (blackFirst && G.sans.length) { out.push([num++, -1]); i = 1; }
      for (; i < G.sans.length; i += 2) out.push([num++, i]);
      return out;
    }
    function statusLine() {
      if (G.over) return G.over.title;
      if (thinking) return 'The computer is thinking';
      if (vsCpu()) return P.side === G.human ? `Your move (${SIDE[G.human]})` : 'Computer\'s move';
      return `${SIDE[P.side]} to move`;
    }
    function renderDom() {
      const tg = targets(), chkSq = E.inCheck(P) ? P.king[P.side] : -1;
      const lf = last ? last & 127 : -1, lt = last ? (last >> 7) & 127 : -1;
      const hf = hintM > 0 ? hintM & 127 : -1, ht = hintM > 0 ? (hintM >> 7) & 127 : -1;
      let h = '';
      for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
        const sq = sqAt(c, r), p = P.b[sq], dark = ((sq >> 4) + (sq & 7)) % 2 === 0;
        let cls = 'chs-sq ' + (dark ? 'chs-d' : 'chs-l');
        if (sq === lf || sq === lt) cls += ' chs-last';
        if (sq === sel) cls += ' chs-sel';
        if (sq === chkSq) cls += ' chs-chk';
        if (sq === hf || sq === ht) cls += ' chs-hint';
        if (showCur && sq === cursor) cls += ' chs-cur';
        if (drag && drag.on && sq === drag.sq) cls += ' chs-lift';
        let inner = '';
        if (c === 0) inner += `<span class="chs-co chs-r">${(sq >> 4) + 1}</span>`;
        if (r === 7) inner += `<span class="chs-co chs-f">${'abcdefgh'[sq & 7]}</span>`;
        if (p) inner += pieceHTML(p);
        if (OPT.legal && tg.includes(sq)) inner += p || (legal.find(m => (m & 127) === sel && ((m >> 7) & 127) === sq) >>> 18) & E.F_EP ? '<i class="chs-ring"></i>' : '<i class="chs-dot"></i>';
        h += `<div class="${cls}" data-sq="${sq}" role="gridcell" aria-label="${E.sqName(sq)}${p ? ' ' + SIDE[(p & 8) ? 1 : 0] + ' ' + PNAME[p & 7] : ''}">${inner}</div>`;
      }
      boardEl.innerHTML = h;
      // overlays on the board
      const bw = $('.chs-bw');
      bw.querySelectorAll('.chs-ov').forEach(x => x.remove());
      if (promo) {
        const col = P.side ? 8 : 0;
        const ov = document.createElement('div'); ov.className = 'chs-ov';
        ov.innerHTML = `<div class="chs-box raised"><h3>Your pawn made it!</h3><p>Pick its new piece:</p><div class="chs-pro">${[5, 4, 3, 2].map((t, i) => `<button class="btn${promo.pick === i ? ' chs-on' : ''}" data-pro="${i}" aria-label="${PNAME[t]}" title="${PNAME[t]}">${pieceHTML(t | col)}</button>`).join('')}</div></div>`;
        bw.appendChild(ov);
      } else if (G.over && G.over.show) {
        const ov = document.createElement('div'); ov.className = 'chs-ov';
        ov.innerHTML = `<div class="chs-box raised"><h3>${E2(G.over.title)}</h3><p>${E2(G.over.why)}</p><p><b>${E2(G.over.sub)}</b></p><button class="btn" data-a="new">New game</button><button class="btn" data-a="look">Look at board</button></div>`;
        bw.appendChild(ov);
      }
      // status
      const st = $('.chs-st');
      const sw = G.over ? '' : `<span class="chs-sw" style="background:${P.side ? '#000' : '#fff'}"></span>`;
      st.innerHTML = `<div class="chs-turn">${sw}<span class="${thinking ? 'chs-think' : ''}">${E2(statusLine())}</span></div>${msg ? `<div class="chs-msg ${msgKind ? 'chs-' + msgKind : ''}">${E2(msg)}</div>` : ''}`;
      // trays: pieces captured by each side
      const top = G.flipped ? 0 : 1;
      [0, 1].forEach(i => {
        const side = i === 0 ? top : top ^ 1, caps = G.caps[side].slice().sort((a, b) => b - a);
        const worth = [0, 1, 3, 3, 5, 9], diff = G.caps[side].reduce((s, t) => s + worth[t], 0) - G.caps[side ^ 1].reduce((s, t) => s + worth[t], 0);
        const who = vsCpu() ? (side === G.human ? 'You' : 'Computer') : SIDE[side];
        $('.chs-t' + i).innerHTML = `<span class="chs-tl">${who}:</span>${caps.map(t => pieceHTML(t | (side ? 0 : 8))).join('')}${diff > 0 ? `<b>+${diff}</b>` : ''}`;
      });
      // move list
      const ml = $('.chs-ml'); let mh = '';
      const n = G.sans.length - 1;
      movePairs().forEach(([num, ia]) => {
        const a = ia < 0 ? '...' : G.sans[ia], b = G.sans[ia + 1];
        mh += `<div><span class="chs-n">${num}.</span><span class="${ia === n ? 'chs-now' : ''}">${E2(a)}</span>${b ? `<span class="${ia + 1 === n ? 'chs-now' : ''}">${E2(b)}</span>` : ''}</div>`;
      });
      ml.innerHTML = mh || '<div style="opacity:.6">No moves yet.</div>';
      ml.scrollTop = ml.scrollHeight;
      const S = stat(G.minLevel);
      $('.chs-rec').textContent = vsCpu() ? `${LEVELS[G.level]} level. Record: ${S.w} won, ${S.l} lost, ${S.d} drawn.` : 'Two players.';
      const hb = $('[data-a="hint"]'); hb.disabled = !canHint();
      $('[data-a="undo"]').disabled = !canUndo();
      if (anim) { const el = performance.now() - anim.t0; if (el < ANIM_MS) animate(anim.m, el); else anim = null; }
    }
    // 2000: pieces glide to their new square. Survives re-renders by resuming at the elapsed time.
    function animate(m, elapsed) {
      const from = m & 127, to = (m >> 7) & 127, sqPx = boardEl.offsetWidth / 8 || 48;
      const disp = sq => { const f = sq & 7, r = sq >> 4; return G.flipped ? [7 - f, r] : [f, 7 - r]; };
      const pairs = [[from, to]];
      if ((m >>> 18) & E.F_CASTLE) pairs.push(to > from ? [from + 3, from + 1] : [from - 4, from - 1]);
      pairs.forEach(([a, b]) => {
        const el = boardEl.querySelector(`[data-sq="${b}"] .chs-pc`); if (!el || !el.animate) return;
        const [ac, ar] = disp(a), [bc, br] = disp(b);
        el.parentNode.style.zIndex = 3;
        const an = el.animate([{ transform: `translate(${(ac - bc) * sqPx}px,${(ar - br) * sqPx}px)` }, { transform: 'none' }], { duration: ANIM_MS, easing: 'cubic-bezier(.3,.7,.3,1)' });
        an.currentTime = elapsed;
        an.onfinish = () => { if (el.parentNode) el.parentNode.style.zIndex = ''; };
      });
    }

    /* 1985 text-mode rendering */
    function renderDos() {
      const tg = targets(), chkSq = E.inCheck(P) ? P.king[P.side] : -1;
      const lf = last ? last & 127 : -1, lt = last ? (last >> 7) & 127 : -1;
      const hf = hintM > 0 ? hintM & 127 : -1, ht = hintM > 0 ? (hintM >> 7) & 127 : -1;
      const files = G.flipped ? 'hgfedcba' : 'abcdefgh';
      const lab = '    ' + files.split('').join('   ') + '    ';
      const sep = '  +' + '---+'.repeat(8) + '  ';
      const L = [`<span class="chs-dim">${lab}</span>`, sep];
      for (let r = 0; r < 8; r++) {
        const rank = G.flipped ? r + 1 : 8 - r;
        let line = `<span class="chs-br">${rank}</span> `;
        for (let c = 0; c < 8; c++) {
          const sq = sqAt(c, r), p = P.b[sq], dark = ((sq >> 4) + (sq & 7)) % 2 === 0, isT = OPT.legal && tg.includes(sq);
          const ch = p ? LETTER[p & 7] : ' ';
          let txt = ` ${ch} `, cls = 'chs-q';
          if (dark) cls += ' chs-dk';
          if (p & 8) cls += ' chs-inv';
          if (sq === lf || sq === lt) cls += ' chs-lm';
          if (sq === sel) txt = `[${ch}]`;
          else if (isT) txt = p ? `>${ch}<` : ' * ';
          else if (sq === hf) txt = `{${ch}}`;
          else if (sq === ht) txt = p ? `?${ch}?` : ' ? ';
          if (sq === chkSq) { txt = `!${ch}!`; cls += ' chs-bl'; }
          if (showCur && sq === cursor) cls += ' chs-cur';
          line += '|' + `<span class="${cls}">${E2(txt)}</span>`;
        }
        line += `| <span class="chs-br">${rank}</span>`;
        L.push(line, sep);
      }
      L.push(`<span class="chs-dim">${lab}</span>`);
      boardEl.innerHTML = L.join('\n');
      const wide = !$('.chs-dos').classList.contains('chs-dnarrow');
      $('.chs-dhd').textContent = (' CHESS 1.0' + (wide ? '   Horizon DOS' : '')).padEnd(wide ? 46 : 18) + (vsCpu() ? `LEVEL ${G.level + 1}: ${LEVELS[G.level].toUpperCase()}` : '2 PLAYERS') + ' ';
      // side panel
      const S = [];
      const wrap = (t, cls) => S.push(cls ? `<span class="${cls}">${E2(t)}</span>` : E2(t));
      wrap(vsCpu() ? `YOU: ${SIDE[G.human].toUpperCase()}   COMPUTER: ${SIDE[G.human ^ 1].toUpperCase()}` : 'WHITE vs BLACK (hot seat)', 'chs-dim');
      wrap('White = K  Black = ', 'chs-dim'); S[S.length - 1] += '<span class="chs-rv">K</span>';
      S.push('');
      if (promo) {
        S.push('<span class="chs-br">PAWN PROMOTION! PICK A PIECE:</span>');
        S.push([['Q', 'QUEEN'], ['R', 'ROOK'], ['B', 'BISHOP'], ['N', 'KNIGHT']].map(([k, n], i) => `<span class="chs-tap ${promo.pick === i ? 'chs-rv' : ''}" data-pro="${i}">[${k}] ${n}</span>`).join(' '));
        S.push('<span class="chs-dim">Q/R/B/N or Enter = queen</span>');
      } else if (G.over) {
        S.push(`<span class="chs-rv"> *** ${E2(G.over.title.toUpperCase())} *** </span>`);
        wrap(G.over.why); wrap(G.over.sub, 'chs-br');
        S.push('<span class="chs-tap chs-rv" data-a="new"> NEW GAME (F2) </span>');
      } else {
        S.push(`<span class="chs-br${thinking ? ' chs-bl' : ''}">${E2(statusLine().toUpperCase())}${thinking ? '...' : ''}</span>`);
        if (msg) wrap('> ' + msg, msgKind === 'warn' ? 'chs-br chs-bl' : 'chs-br'); else S.push('');
      }
      S.push('');
      [0, 1].forEach(side => {
        const who = vsCpu() ? (side === G.human ? 'YOU TOOK' : 'CPU TOOK') : SIDE[side].toUpperCase() + ' TOOK';
        const caps = G.caps[side].slice().sort((a, b) => b - a).map(t => side === 0 ? `<span class="chs-rv">${LETTER[t]}</span>` : LETTER[t]).join(' ');
        S.push(`<span class="chs-dim">${who.padEnd(9)}:</span> ${caps || '-'}`);
      });
      S.push('');
      S.push('<span class="chs-dim">MOVES</span>');
      const rowsAvail = wide ? 7 : 5, pairs = [];
      movePairs().forEach(([num, ia]) => pairs.push(`${String(num).padStart(3)}. ${(ia < 0 ? '...' : G.sans[ia]).padEnd(8)}${G.sans[ia + 1] || ''}`));
      pairs.slice(-rowsAvail).forEach(x => wrap(x));
      if (!pairs.length) wrap('  (none yet)', 'chs-dim');
      if (vsCpu()) { const st = stat(G.minLevel); S.push(''); wrap(`RECORD: ${st.w}W ${st.l}L ${st.d}D`, 'chs-dim'); }
      $('.chs-dsd').innerHTML = S.join('\n');
      $('.chs-dbar').innerHTML = [['F1 HELP', 'help'], ['F2 NEW', 'new'], ['F3 UNDO', 'undo'], ['F4 FLIP', 'flip'], ['F6 HINT', 'hint'], ['ESC EXIT', 'exit']].map(([t, a]) => `<span data-a="${a}">${t}</span>`).join('');
    }

    /* tutorial rendering */
    let tutEl = null;
    function renderTut() {
      if (!tut) { if (tutEl) { tutEl.remove(); tutEl = null; } return; }
      const pg = TUT[tut.page], fr = pg.f[tut.frame % pg.f.length];
      if (!tutEl) { tutEl = document.createElement('div'); tutEl.className = 'chs-tut'; (dos ? $('.chs-dos') : root).appendChild(tutEl); }
      const dots = miniDots(pg, fr), hop = tut.hop; tut.hop = false;
      let board;
      if (dos) {
        const sep = ' +' + '---+'.repeat(pg.w);
        const L = [sep];
        for (let r = pg.h - 1; r >= 0; r--) {
          let line = '|';
          for (let c = 0; c < pg.w; c++) {
            const n = String.fromCharCode(97 + c) + (r + 1), pc = fr.p[n], dark = (r + c) % 2 === 0;
            let txt = pc ? ` ${pc[1]} ` : dots.includes(n) ? ' * ' : '   ';
            if (pc && dots.includes(n)) txt = `>${pc[1]}<`;
            if (fr.chk === n) txt = `!${pc[1]}!`;
            line += `<span class="chs-q${dark ? ' chs-dk' : ''}${pc && pc[0] === 'b' ? ' chs-inv' : ''}${fr.chk === n ? ' chs-bl' : ''}">${txt}</span>|`;
          }
          L.push(' ' + line, sep);
        }
        board = `<pre style="margin:0 auto">${L.join('\n')}</pre>`;
      } else {
        const ms = Math.max(28, Math.min(56, Math.floor(((root.clientWidth || 360) - 40) / Math.max(pg.w, 6)), Math.floor(((root.clientHeight || 400) - 150) / pg.h)));
        let h = '';
        for (let r = pg.h - 1; r >= 0; r--) for (let c = 0; c < pg.w; c++) {
          const n = String.fromCharCode(97 + c) + (r + 1), pc = fr.p[n], dark = (r + c) % 2 === 0;
          const p = pc ? T_ORDER[pc[1]] | (pc[0] === 'b' ? 8 : 0) : 0;
          h += `<div class="chs-sq ${dark ? 'chs-d' : 'chs-l'}${fr.chk === n ? ' chs-chk' : ''}${hop && pc ? ' chs-hop' : ''}">${p ? pieceHTML(p) : ''}${dots.includes(n) ? (pc ? '<i class="chs-ring"></i>' : '<i class="chs-dot"></i>') : ''}</div>`;
        }
        board = `<div class="chs-mini" style="--ms:${ms}px;--sq:${ms}px;grid-template-columns:repeat(${pg.w},${ms}px)">${h}</div>`;
      }
      const narrowT = (root.clientWidth || 0) < 520, key = tut.page + ':' + narrowT;
      if (tutEl.dataset.key !== key) {
        tutEl.dataset.key = key;
        tutEl.classList.toggle('chs-tn', narrowT);
        tutEl.innerHTML = `<h3>${dos ? '<span class="chs-rv"> HOW TO PLAY </span> ' : ''}${E2(pg.t)} <small style="font-weight:400">(${tut.page + 1} of ${TUT.length})</small></h3>
        <div class="chs-tb"><div class="chs-tbd"></div><div class="chs-tt${dos ? '' : ' sunken'}">${E2(pg.x)}</div></div>
        <div class="chs-tnav">${dos ? `<span class="chs-tap chs-rv" data-t="-1"> &lt; BACK </span> <span class="chs-tap chs-rv" data-t="1"> NEXT &gt; </span> <span class="chs-tap chs-rv" data-t="0"> ESC = PLAY </span>` : `<button class="btn" data-t="-1"${tut.page ? '' : ' disabled'}>&lt; Back</button><button class="btn" data-t="1"${tut.page < TUT.length - 1 ? '' : ' disabled'}>Next &gt;</button><button class="btn" data-t="0">Play!</button>`}</div>`;
      }
      tutEl.querySelector('.chs-tbd').innerHTML = `${board}<div class="chs-cap">${E2(fr.cap || '')}</div>`;
    }

    /* ---------- events ---------- */
    function hit(e) {
      const r = boardEl.getBoundingClientRect(); if (!r.width) return -1;
      if (dos) {
        const col = Math.floor((e.clientX - r.left) / (r.width / 37)), row = Math.floor((e.clientY - r.top) / (r.height / 19));
        if (col < 2 || col > 34 || row < 1 || row > 17) return -1;
        return sqAt(Math.min(7, Math.floor((col - 2) / 4)), Math.min(7, Math.floor((row - 1) / 2)));
      }
      const c = Math.floor((e.clientX - r.left) / r.width * 8), rr = Math.floor((e.clientY - r.top) / r.height * 8);
      if (c < 0 || c > 7 || rr < 0 || rr > 7) return -1;
      return sqAt(c, rr);
    }
    let ghost = null;
    boardEl.addEventListener('pointerdown', e => {
      if (e.button > 0 || tut) return;
      const sq = hit(e); if (sq < 0) return;
      showCur = false; cursor = sq;
      if (dos) { tapSquare(sq); return; }
      e.preventDefault();
      const canDrag = humanTurn() && !promo && own(sq);
      tapSquare(sq);
      if (canDrag && sel === sq) {
        drag = { sq, id: e.pointerId, x0: e.clientX, y0: e.clientY, on: false };
        try { boardEl.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ }
      }
    });
    boardEl.addEventListener('pointermove', e => {
      if (!drag || e.pointerId !== drag.id) return;
      const r = boardEl.getBoundingClientRect(), k = boardEl.offsetWidth / r.width, sqPx = boardEl.offsetWidth / 8;
      if (!drag.on) {
        if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 6) return;
        drag.on = true;
        const cell = boardEl.querySelector(`[data-sq="${drag.sq}"]`); if (cell) cell.classList.add('chs-lift');
        ghost = document.createElement('div'); ghost.className = 'chs-ghost'; ghost.innerHTML = pieceHTML(P.b[drag.sq]); boardEl.appendChild(ghost);
      }
      ghost.style.transform = `translate(${(e.clientX - r.left) * k - sqPx / 2}px,${(e.clientY - r.top) * k - sqPx / 2}px)`;
    });
    const endDrag = (e, cancel) => {
      if (!drag || e.pointerId !== drag.id) return;
      const d = drag; drag = null;
      if (ghost) { ghost.remove(); ghost = null; }
      if (!d.on) return;
      const sq = cancel ? -1 : hit(e);
      if (sq >= 0 && sq !== d.sq && sel === d.sq) tapSquare(sq, true);
      else render();
    };
    boardEl.addEventListener('pointerup', e => endDrag(e, false));
    boardEl.addEventListener('pointercancel', e => endDrag(e, true));

    root.addEventListener('click', e => {
      const a = e.target.closest('[data-a]'), pr = e.target.closest('[data-pro]'), t = e.target.closest('[data-t]');
      if (t) { const d = +t.dataset.t; if (d) tutGo(d); else closeTut(); return; }
      if (pr) { choosePromo(+pr.dataset.pro); return; }
      if (!a) return;
      const act = a.dataset.a;
      if (act === 'new') { if (G.over) newGame(); else askNew(); }
      else if (act === 'look') { G.over.show = false; render(); }
      else if (act === 'undo') undo();
      else if (act === 'hint') hint();
      else if (act === 'flip') flip();
      else if (act === 'help') openTut();
      else if (act === 'exit') api.close();
    });
    if (dinp) {
      dinp.addEventListener('keydown', e => {
        if (e.key === 'Enter' && dinp.value.trim()) { e.preventDefault(); e.stopPropagation(); const v = dinp.value; dinp.value = ''; typed(v); }
      });
    }
    const opened = performance.now();
    W.onKey = e => {
      if (e.ctrlKey || e.metaKey || e.altKey || performance.now() - opened < 250) return;
      const k = e.key, inInput = dinp && e.target === dinp;
      const fk = { F1: openTut, F2: () => (G.over ? newGame() : askNew()), F3: undo, F4: flip, F6: hint };
      if (fk[k]) { e.preventDefault(); if (tut && k !== 'F1') closeTut(); fk[k](); return; }
      if (tut) {
        if (k === 'ArrowRight' || k === 'ArrowDown' || k === 'PageDown' || (k === 'Enter' && tut.page < TUT.length - 1) || k === ' ') { e.preventDefault(); tutGo(1); }
        else if (k === 'ArrowLeft' || k === 'ArrowUp' || k === 'PageUp') { e.preventDefault(); tutGo(-1); }
        else if (k === 'Escape' || k === 'Enter') { e.preventDefault(); closeTut(); }
        return;
      }
      if (promo) {
        const i = 'qrbn'.indexOf(k.toLowerCase());
        if (i >= 0 && k.length === 1) { e.preventDefault(); choosePromo(i); }
        else if (k === 'ArrowRight' || k === 'ArrowLeft') { e.preventDefault(); promo.pick = (promo.pick + (k === 'ArrowRight' ? 1 : 3)) % 4; render(); }
        else if (k === 'Enter' || k === ' ') { e.preventDefault(); choosePromo(promo.pick); }
        else if (k === 'Escape') { e.preventDefault(); promo = null; sel = -1; render(); }
        return;
      }
      if (G.over && G.over.show && (k === 'Enter' || k === 'Escape')) { e.preventDefault(); if (k === 'Enter') newGame(); else { G.over.show = false; render(); } return; }
      const arrows = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
      if (arrows[k] && (!inInput || !dinp.value)) { e.preventDefault(); moveCursor(...arrows[k]); return; }
      if ((k === 'Enter' || (k === ' ' && !inInput)) && (!inInput || !dinp.value)) { e.preventDefault(); if (showCur) tapSquare(cursor); else { showCur = true; render(); } return; }
      if (k === 'Escape' && sel >= 0) { e.preventDefault(); sel = -1; render(); return; }
      if (inInput) return;
      if (dos && dinp && k.length === 1 && /[a-z0-9?\-=]/i.test(k)) { dinp.focus(); return; }
      if (!dos && k.length === 1) {
        const lk = k.toLowerCase();
        if (lk === 'u') undo(); else if (lk === 'h') hint(); else if (lk === 'f') flip(); else if (lk === 'n') askNew(); else if (k === '?') openTut();
      }
    };
    W.onResize = () => { fit(); render(); };
    W.onClose = () => {
      closed = true;
      timers.forEach(t => clearTimeout(t)); timers.clear(); clearInterval(tutTimer);
      killWorker();
    };
    let ro = null;
    if (window.ResizeObserver) { ro = new ResizeObserver(() => { if (!closed) { fit(); if (!dos && G) renderTut(); } }); ro.observe(root); }
    const oc = W.onClose; W.onClose = () => { if (ro) ro.disconnect(); return oc(); };

    /* ---------- start: resume a saved game or begin a new one ---------- */
    const sv = api.load('game', null);
    if (sv && Array.isArray(sv.moves) && sv.start) {
      G = { start: sv.start, mode: sv.mode === '2p' ? '2p' : 'cpu', level: sv.level | 0, minLevel: Math.min(sv.minLevel ?? sv.level, sv.level) | 0, human: sv.human ? 1 : 0, flipped: !!sv.flipped, over: null };
      replay(sv.moves);
      if (status()) newGame(true);
      else {
        if (sv.moves.length) setMsg('Welcome back! Here is the game you were playing.', 'good'); else startMsg();
        fit(); render();
        if (vsCpu() && P.side !== G.human) cpuMove();
      }
    } else newGame(true);
    fit(); render();
    requestAnimationFrame(() => { fit(); render(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (!closed && dos) { charW = 0; fit(); render(); } });
    if (dos && dinp && !coarse()) later(() => { try { dinp.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }, 80);
    if (!api.load('seenTut', false)) { api.save('seenTut', true); openTut(); }
  }

  (window.RETRO_APPS = window.RETRO_APPS || []).push({
    id: 'chess',
    help: 'Play chess against the computer at four levels or with a friend, and learn how every piece moves.',
    label: 'Chess',
    kind: 'builtin',
    eras: ['1985', '1990', '1995', '2000'],
    cat: 'game',
    cmd: 'CHESS',
    icon: ICON,
    window: { w: 720, h: 560 },
    css: CSS,
    open: openChess
  });
})();
