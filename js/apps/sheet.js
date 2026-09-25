/* Horizon Sheet: a built-in spreadsheet for every year (1985 text mode, 1990 gray grid, 1995 toolbar, 2000 charts). */
(function () {
  const COLS = 26, ROWS = 99, MAXFILES = 10, DEFW = 9;
  const colName = c => String.fromCharCode(65 + c);
  const A = (c, r) => colName(c) + (r + 1);
  const colIdx = L => L.toUpperCase().split('').reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;
  const parseA = s => { const m = /^\$?([A-Za-z]+)\$?(\d+)$/.exec(s); if (!m) return null; const c = colIdx(m[1]), r = +m[2] - 1; return (c >= 0 && c < COLS && r >= 0 && r < ROWS) ? { c, r } : null; };
  const coarse = () => !!(window.matchMedia && matchMedia('(pointer:coarse)').matches);

  /* ================= formula engine ================= */
  function Err(e) { this.e = e; }
  const isErr = v => v instanceof Err;
  const ER = e => new Err(e);
  const FUNCS = ['SUM', 'AVERAGE', 'MIN', 'MAX', 'COUNT', 'ROUND', 'IF', 'ABS'];

  function tokenize(s) {
    const out = []; let i = 0;
    while (i < s.length) {
      const ch = s[i], rest = s.slice(i); let m;
      if (/\s/.test(ch)) { i++; continue; }
      if ((m = /^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i.exec(rest))) { out.push({ t: 'num', v: parseFloat(m[0]) }); i += m[0].length; continue; }
      if (ch === '"') { const j = s.indexOf('"', i + 1); if (j < 0) throw ER('#ERR!'); out.push({ t: 'str', v: s.slice(i + 1, j) }); i = j + 1; continue; }
      if (/^#REF!/i.test(rest)) { out.push({ t: 'referr' }); i += 5; continue; }
      if ((m = /^(\$?)([A-Za-z]+)(\$?)(\d+)(?![A-Za-z0-9_(.])/.exec(rest))) { out.push({ t: 'ref', c: colIdx(m[2]), r: +m[4] - 1 }); i += m[0].length; continue; }
      if ((m = /^[A-Za-z_][A-Za-z0-9_.]*/.exec(rest))) { out.push({ t: 'id', v: m[0].toUpperCase() }); i += m[0].length; continue; }
      if ((m = /^(<=|>=|<>)/.exec(rest))) { out.push({ t: 'op', v: m[0] }); i += 2; continue; }
      if ('+-*/^&(),:=<>%'.includes(ch)) { out.push({ t: 'op', v: ch }); i++; continue; }
      throw ER('#ERR!');
    }
    return out;
  }
  function parse(src) {
    const tk = tokenize(src); let p = 0;
    const peek = () => tk[p], isOp = v => tk[p] && tk[p].t === 'op' && tk[p].v === v;
    const eat = v => { if (!isOp(v)) throw ER('#ERR!'); p++; };
    function cmp() { let l = cat(); while (tk[p] && tk[p].t === 'op' && ['=', '<>', '<', '>', '<=', '>='].includes(tk[p].v)) { const op = tk[p++].v; l = { t: 'bin', op, l, r: cat() }; } return l; }
    function cat() { let l = add(); while (isOp('&')) { p++; l = { t: 'bin', op: '&', l, r: add() }; } return l; }
    function add() { let l = mul(); while (isOp('+') || isOp('-')) { const op = tk[p++].v; l = { t: 'bin', op, l, r: mul() }; } return l; }
    function mul() { let l = pow(); while (isOp('*') || isOp('/')) { const op = tk[p++].v; l = { t: 'bin', op, l, r: pow() }; } return l; }
    function pow() { let l = un(); while (isOp('^')) { p++; l = { t: 'bin', op: '^', l, r: un() }; } return l; }
    function un() { if (isOp('-')) { p++; return { t: 'neg', x: un() }; } if (isOp('+')) { p++; return un(); } let x = prim(); while (isOp('%')) { p++; x = { t: 'pct', x }; } return x; }
    function prim() {
      const t = peek(); if (!t) throw ER('#ERR!');
      if (t.t === 'num' || t.t === 'str') { p++; return t; }
      if (t.t === 'referr') { p++; return { t: 'err', v: '#REF!' }; }
      if (t.t === 'ref') { p++; if (isOp(':')) { p++; const b = peek(); if (!b || b.t !== 'ref') throw ER('#ERR!'); p++; return { t: 'rng', c1: Math.min(t.c, b.c), r1: Math.min(t.r, b.r), c2: Math.max(t.c, b.c), r2: Math.max(t.r, b.r) }; } return t; }
      if (t.t === 'id') {
        p++;
        if (isOp('(')) { p++; const args = []; if (!isOp(')')) { args.push(cmp()); while (isOp(',')) { p++; args.push(cmp()); } } eat(')'); return { t: 'fn', name: t.v, args }; }
        if (t.v === 'TRUE' || t.v === 'FALSE') return { t: 'bool', v: t.v === 'TRUE' };
        return { t: 'err', v: '#NAME?' };
      }
      if (isOp('(')) { p++; const x = cmp(); eat(')'); return x; }
      throw ER('#ERR!');
    }
    const x = cmp(); if (p < tk.length) throw ER('#ERR!');
    return x;
  }
  const NUMRX = /^[-+]?\$?(\d{1,3}(,\d{3})+|\d*)(\.\d+)?%?$/;
  function literal(raw) {
    if (raw[0] === "'") return raw.slice(1);
    const s = raw.trim();
    if (s && /\d/.test(s) && NUMRX.test(s)) { let n = parseFloat(s.replace(/[$,%+]/g, '')); if (s.endsWith('%')) n /= 100; return n; }
    return raw;
  }
  const inGrid = (c, r) => c >= 0 && c < COLS && r >= 0 && r < ROWS;
  const pcache = new Map();
  function getAst(src) { if (!pcache.has(src)) { let a; try { a = parse(src); } catch (x) { a = { t: 'err', v: isErr(x) ? x.e : '#ERR!' }; } pcache.set(src, a); if (pcache.size > 3000) pcache.clear(); } return pcache.get(src); }

  function makeCalc(cells) {
    const val = {}, state = {};
    function cell(a) {
      if (state[a] === 2) return val[a];
      if (state[a] === 1) return ER('#CIRC!');
      const raw = cells[a];
      if (raw == null || raw === '') return null;
      state[a] = 1;
      let v;
      if (raw[0] === '=' && raw.length > 1) {
        try { v = ev(getAst(raw.slice(1))); } catch (x) { v = isErr(x) ? x : ER('#ERR!'); }
        if (v === null) v = 0;
        if (typeof v === 'number' && !isFinite(v)) v = ER('#NUM!');
      } else v = literal(raw);
      val[a] = v; state[a] = 2; return v;
    }
    function num(v) {
      if (isErr(v)) throw v;
      if (v === null) return 0;
      if (typeof v === 'number') return v;
      if (typeof v === 'boolean') return v ? 1 : 0;
      const s = String(v).trim(); if (s && /\d/.test(s) && NUMRX.test(s)) return literal(s);
      throw ER('#VALUE!');
    }
    const str = v => { if (isErr(v)) throw v; return v === null ? '' : typeof v === 'boolean' ? (v ? 'TRUE' : 'FALSE') : typeof v === 'number' ? String(+v.toPrecision(12)) : String(v); };
    function refv(n) { if (!inGrid(n.c, n.r)) throw ER('#REF!'); const v = cell(A(n.c, n.r)); if (isErr(v)) throw v; return v; }
    function cmpv(a, b) {
      if (a === null) a = typeof b === 'string' ? '' : 0; if (b === null) b = typeof a === 'string' ? '' : 0;
      if (typeof a === 'boolean') a = a ? 1 : 0; if (typeof b === 'boolean') b = b ? 1 : 0;
      if (typeof a === 'number' && typeof b === 'number') return a - b;
      if (typeof a === 'number') return -1; if (typeof b === 'number') return 1;
      const x = a.toLowerCase(), y = b.toLowerCase(); return x < y ? -1 : x > y ? 1 : 0;
    }
    function nums(args, skipErr) {
      const out = [];
      args.forEach(n => {
        if (n.t === 'rng') {
          if (!inGrid(n.c1, n.r1) || !inGrid(n.c2, n.r2)) throw ER('#REF!');
          for (let r = n.r1; r <= n.r2; r++) for (let c = n.c1; c <= n.c2; c++) { const v = cell(A(c, r)); if (isErr(v)) { if (!skipErr) throw v; } else if (typeof v === 'number') out.push(v); }
        } else if (n.t === 'ref') {
          let v; try { v = refv(n); } catch (x) { if (skipErr) return; throw x; }
          if (typeof v === 'number') out.push(v);
        } else {
          let v; try { v = ev(n); } catch (x) { if (skipErr) return; throw x; }
          if (v !== null) out.push(num(v));
        }
      });
      return out;
    }
    function ev(n) {
      switch (n.t) {
        case 'num': case 'str': case 'bool': return n.v;
        case 'err': throw ER(n.v);
        case 'ref': return refv(n);
        case 'rng': throw ER('#VALUE!');
        case 'neg': return -num(ev(n.x));
        case 'pct': return num(ev(n.x)) / 100;
        case 'bin': {
          const l = ev(n.l), r = ev(n.r);
          switch (n.op) {
            case '+': return num(l) + num(r);
            case '-': return num(l) - num(r);
            case '*': return num(l) * num(r);
            case '/': { const d = num(r); if (d === 0) throw ER('#DIV/0!'); return num(l) / d; }
            case '^': return Math.pow(num(l), num(r));
            case '&': return str(l) + str(r);
          }
          if (isErr(l)) throw l; if (isErr(r)) throw r;
          const k = cmpv(l, r);
          return n.op === '=' ? k === 0 : n.op === '<>' ? k !== 0 : n.op === '<' ? k < 0 : n.op === '>' ? k > 0 : n.op === '<=' ? k <= 0 : k >= 0;
        }
        case 'fn': {
          const a = n.args;
          switch (n.name) {
            case 'SUM': return nums(a).reduce((s, x) => s + x, 0);
            case 'AVERAGE': { const v = nums(a); if (!v.length) throw ER('#DIV/0!'); return v.reduce((s, x) => s + x, 0) / v.length; }
            case 'MIN': { const v = nums(a); return v.length ? Math.min(...v) : 0; }
            case 'MAX': { const v = nums(a); return v.length ? Math.max(...v) : 0; }
            case 'COUNT': return nums(a, true).length;
            case 'ABS': if (a.length !== 1) throw ER('#ERR!'); return Math.abs(num(ev(a[0])));
            case 'ROUND': {
              if (a.length < 1 || a.length > 2) throw ER('#ERR!');
              const x = num(ev(a[0])), d = a[1] ? Math.trunc(num(ev(a[1]))) : 0, p = Math.pow(10, d);
              return Math.sign(x) * Math.round(Math.abs(x) * p + 1e-9) / p;
            }
            case 'IF': {
              if (a.length < 2 || a.length > 3) throw ER('#ERR!');
              const c = ev(a[0]); if (isErr(c)) throw c;
              let t; if (typeof c === 'string') throw ER('#VALUE!'); else t = !!(c === null ? 0 : c);
              if (t) return ev(a[1]);
              return a[2] ? ev(a[2]) : false;
            }
          }
          throw ER('#NAME?');
        }
      }
      throw ER('#ERR!');
    }
    return { cell, val };
  }

  // Shift relative references in a formula by (dc, dr); refs that fall off the sheet become #REF!.
  function shiftF(raw, dc, dr) {
    if (!raw || raw[0] !== '=' || (!dc && !dr)) return raw;
    return raw.split('"').map((part, i) => i % 2 ? part : part.replace(/(\$?)([A-Za-z]+)(\$?)(\d+)(?![A-Za-z0-9_(.])/g, (m, d1, L, d2, n, off, whole) => {
      if (off > 0 && /[A-Za-z0-9_.$]/.test(whole[off - 1])) return m;
      let c = colIdx(L), r = +n - 1;
      if (!d1) c += dc; if (!d2) r += dr;
      if (!inGrid(c, r)) return '#REF!';
      return d1 + colName(c) + d2 + (r + 1);
    })).join('"');
  }
  const normF = raw => raw[0] !== '=' ? raw : raw.split('"').map((part, i) => i % 2 ? part : part.toUpperCase()).join('"');

  /* ================= display formatting ================= */
  const commas = s => s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  function show(v, f, max) {
    if (v === null || v === undefined) return '';
    if (isErr(v)) return v.e;
    if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
    if (typeof v === 'string') return v;
    const n = f && f.n;
    if (n === 'cur') { const s = Math.abs(v).toFixed(2).split('.'); return (v < 0 ? '-' : '') + '$' + commas(s[0]) + '.' + s[1]; }
    if (n === 'pct') return String(+(v * 100).toFixed(2)) + '%';
    if (Number.isInteger(v) && Math.abs(v) < 1e12 && (!max || String(v).length <= max)) return String(v);
    let s = String(+v.toPrecision(10));
    if (max) { for (let p = 9; s.length > max && p >= 1; p--) s = String(+v.toPrecision(p)); if (s.length > max) s = v.toExponential(Math.max(0, max - 6)); if (s.length > max) s = '#'.repeat(max); }
    else if (s.length > 12) s = v.toExponential(4);
    return s;
  }
  const plainVal = v => isErr(v) ? v.e : (v === null ? '' : v);

  /* ================= templates ================= */
  const T = (name, file, widths, rows, start) => ({ name, file, widths, rows, start });
  const TEMPLATES = [
    T('Allowance budget', 'ALLOWANC', { 0: 18, 1: 11, 2: 34 }, [
      ['A1', 'My Allowance Budget', { b: 1 }],
      ['A2', 'Type your own numbers in column B. The totals update by themselves!'],
      ['A4', 'Allowance per week'], ['B4', '10', { n: 'cur' }], ['C4', '<- type your allowance here'],
      ['A5', 'Number of weeks'], ['B5', '4'], ['C5', '<- how many weeks to plan'],
      ['A6', 'Money coming in', { b: 1 }], ['B6', '=B4*B5', { n: 'cur', b: 1 }], ['C6', "'=B4*B5 multiplies (* means times)"],
      ['A8', 'Spending plan', { b: 1 }], ['B8', 'Amount', { b: 1, a: 'r' }],
      ['A9', 'Snacks'], ['B9', '6', { n: 'cur' }],
      ['A10', 'Toys and games'], ['B10', '12', { n: 'cur' }],
      ['A11', 'Books and comics'], ['B11', '8', { n: 'cur' }],
      ['A12', 'Gifts'], ['B12', '5', { n: 'cur' }],
      ['A13', 'Total spending', { b: 1 }], ['B13', '=SUM(B9:B12)', { n: 'cur', b: 1 }], ['C13', "'=SUM(B9:B12) adds B9 through B12"],
      ['A15', 'Money left to save', { b: 1 }], ['B15', '=B6-B13', { n: 'cur', b: 1 }], ['C15', 'Money in minus spending'],
      ['A16', 'Part you save'], ['B16', '=B15/B6', { n: 'pct' }], ['C16', 'Divide to find the part (a percent)'],
      ['A17', 'Average spend'], ['B17', '=ROUND(AVERAGE(B9:B12),2)', { n: 'cur' }], ['C17', 'AVERAGE finds the typical amount'],
      ['A18', 'Biggest spend'], ['B18', '=MAX(B9:B12)', { n: 'cur' }], ['C18', 'MAX finds the largest number'],
      ['A19', 'Plan OK?'], ['B19', '=IF(B15>=0,"Yes!","Too much")', { a: 'r' }], ['C19', 'IF checks a rule: is money left 0 or more?']
    ], [1, 3]),
    T('Lemonade stand sales', 'LEMONADE', { 0: 11, 1: 8, 2: 9, 3: 9, 4: 9, 5: 3, 6: 34 }, [
      ['A1', 'Lemonade Stand Sales', { b: 1 }],
      ['A2', 'Price/cup'], ['B2', '0.5', { n: 'cur' }], ['C2', '<- change the price or cost and watch the totals change'],
      ['A3', 'Cost/cup'], ['B3', '0.2', { n: 'cur' }],
      ['A5', 'Day', { b: 1 }], ['B5', 'Cups', { b: 1, a: 'r' }], ['C5', 'Sales', { b: 1, a: 'r' }], ['D5', 'Costs', { b: 1, a: 'r' }], ['E5', 'Profit', { b: 1, a: 'r' }],
      ...['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].flatMap((d, i) => {
        const r = 6 + i;
        return [['A' + r, d], ['B' + r, String([12, 18, 9, 22, 30, 41, 35][i])], ['C' + r, `=B${r}*$B$2`, { n: 'cur' }], ['D' + r, `=B${r}*$B$3`, { n: 'cur' }], ['E' + r, `=C${r}-D${r}`, { n: 'cur' }]];
      }),
      ['G6', 'Sales = cups x price. The $ in $B$2 locks it'], ['G7', 'so Fill Down always uses the price cell.'],
      ['A13', 'Total', { b: 1 }], ['B13', '=SUM(B6:B12)', { b: 1 }], ['C13', '=SUM(C6:C12)', { n: 'cur', b: 1 }], ['D13', '=SUM(D6:D12)', { n: 'cur', b: 1 }], ['E13', '=SUM(E6:E12)', { n: 'cur', b: 1 }],
      ['G13', 'SUM adds up each column'],
      ['A14', 'Average'], ['B14', '=ROUND(AVERAGE(B6:B12),1)'], ['G14', 'AVERAGE: cups on a typical day'],
      ['A15', 'Best day'], ['B15', '=MAX(B6:B12)'], ['A16', 'Slow day'], ['B16', '=MIN(B6:B12)'], ['G15', 'MAX and MIN find the most and least'],
      ['A18', 'Goal'], ['B18', '50', { n: 'cur' }], ['C18', '<- profit you hope to make'],
      ['A19', 'Made it?', { b: 1 }], ['B19', '=IF(E13>=B18,"Yes!","Not yet")', { b: 1, a: 'r' }], ['C19', 'IF compares profit with the goal']
    ], [1, 5]),
    T('Class bake sale', 'BAKESALE', { 0: 13, 1: 8, 2: 7, 3: 7, 4: 7, 5: 10, 6: 34 }, [
      ['A1', 'Class Bake Sale', { b: 1 }],
      ['A3', 'Treat', { b: 1 }], ['B3', 'Price', { b: 1, a: 'r' }], ['C3', 'Baked', { b: 1, a: 'r' }], ['D3', 'Sold', { b: 1, a: 'r' }], ['E3', 'Left', { b: 1, a: 'r' }], ['F3', 'Money', { b: 1, a: 'r' }],
      ...[['Cookies', 0.5, 48, 40], ['Brownies', 1, 24, 22], ['Cupcakes', 1.25, 30, 27], ['Muffins', 1, 20, 12], ['Lemon bars', 0.75, 24, 18]].flatMap(([n, p, b, s], i) => {
        const r = 4 + i;
        return [['A' + r, n], ['B' + r, String(p), { n: 'cur' }], ['C' + r, String(b)], ['D' + r, String(s)], ['E' + r, `=C${r}-D${r}`], ['F' + r, `=B${r}*D${r}`, { n: 'cur' }]];
      }),
      ['G4', 'Left = baked minus sold'], ['G5', 'Money = price times sold'],
      ['A9', 'Totals', { b: 1 }], ['C9', '=SUM(C4:C8)', { b: 1 }], ['D9', '=SUM(D4:D8)', { b: 1 }], ['E9', '=SUM(E4:E8)', { b: 1 }], ['F9', '=SUM(F4:F8)', { n: 'cur', b: 1 }],
      ['G9', 'SUM adds each column'],
      ['A11', 'Class goal'], ['B11', '100', { n: 'cur' }], ['C11', '<- how much the class wants to raise'],
      ['A12', 'Part of goal'], ['B12', '=F9/B11', { n: 'pct' }],
      ['A13', 'Goal met?', { b: 1 }], ['B13', '=IF(F9>=B11,"Hooray!","Keep selling")', { b: 1 }],
      ['A14', 'Kinds of treat'], ['B14', '=COUNT(B4:B8)'], ['C14', 'COUNT counts the cells with numbers'],
      ['A15', 'Most sold'], ['B15', '=MAX(D4:D8)'],
      ['A16', 'Sold out'], ['B16', '=ROUND(D9/C9,2)', { n: 'pct' }], ['C16', 'ROUND keeps 2 decimal places']
    ], [3, 3])
  ];

  const HELP_HTML = `
    <h4>Cells</h4><p>Each box is a <b>cell</b>. Its name is its column letter and row number, like <b>B3</b>. Click or tap a cell, then type a number, some words, or a formula. Press Enter to store it.</p>
    <h4>Formulas start with =</h4><p>A formula does math for you and updates by itself when numbers change.</p>
    <pre>=2+3          adds: 5
=A1*4         A1 times 4
=(A1+A2)/2    parentheses go first
=B2^2         B2 squared (^ means power)
=C1-C2        subtract</pre>
    <h4>Ranges</h4><p>A range is a block of cells: <b>A1:A5</b> means A1 down to A5. <b>A1:C2</b> is a rectangle.</p>
    <h4>Functions</h4>
    <pre>=SUM(A1:A5)          add them all
=AVERAGE(B1:B4)      the typical value
=MIN(A1:A9)  =MAX(A1:A9)
=COUNT(A1:A9)        how many numbers
=ROUND(A1/3,2)       2 decimal places
=IF(A1>=10,"Big","Small")</pre>
    <p>IF compares with = &lt;&gt; &lt; &gt; &lt;= &gt;= and picks the first answer when the test is true.</p>
    <h4>Copy and Fill Down</h4><p>When a formula is copied or filled down, its cell names move with it: =A1+B1 in row 1 becomes =A2+B2 in row 2. Put $ in front to lock a name: <b>$B$2</b> never moves.</p>
    <h4>Error codes</h4>
    <pre>#DIV/0!  divided by zero (or an empty cell)
#REF!    points to a cell that isn't there
#NAME?   a function name is misspelled
#CIRC!   the formula uses its own answer
#VALUE!  tried to do math with words
#ERR!    the formula has a typo</pre>
    <h4>Try it</h4><p>Open <b>File, Templates</b> for a ready-made budget, lemonade stand or bake sale. Change the numbers and watch the totals change.</p>`;

  const ICON = '<svg viewBox="0 0 32 32" shape-rendering="crispEdges" aria-hidden="true"><rect x="3" y="4" width="26" height="24" fill="#fff" stroke="#000"/><rect x="4" y="5" width="24" height="4" fill="#3a8a3a"/><rect x="4" y="9" width="4" height="18" fill="#c0c0c0"/><g fill="#808080"><rect x="4" y="13" width="24" height="1"/><rect x="4" y="17" width="24" height="1"/><rect x="4" y="21" width="24" height="1"/><rect x="14" y="9" width="1" height="18"/><rect x="21" y="9" width="1" height="18"/></g><rect x="15" y="14" width="6" height="3" fill="#000080"/><g fill="#c00"><rect x="23" y="23" width="2" height="4"/><rect x="26" y="20" width="2" height="7"/></g></svg>';

  const I16 = {
    new: '<path d="M3 1h7l3 3v11H3z" fill="#fff" stroke="#000"/><path d="M10 1v3h3" fill="none" stroke="#000"/>',
    open: '<path d="M1 4h5l1 2h7v8H1z" fill="#ffd966" stroke="#000"/><path d="M1 14l3-6h11l-3 6" fill="#e6b800" stroke="#000"/>',
    save: '<rect x="1.5" y="1.5" width="13" height="13" fill="#3a5a9a" stroke="#000"/><rect x="4" y="2" width="8" height="5" fill="#fff"/><rect x="4" y="10" width="8" height="4" fill="#c0c0c0"/>',
    cut: '<circle cx="4.5" cy="12" r="2.5" fill="none" stroke="#000"/><circle cx="11.5" cy="12" r="2.5" fill="none" stroke="#000"/><path d="M6 10L11 1M10 10L5 1" stroke="#000"/>',
    copy: '<rect x="1.5" y="1.5" width="8" height="10" fill="#fff" stroke="#000"/><rect x="6.5" y="4.5" width="8" height="10" fill="#fff" stroke="#000"/>',
    paste: '<rect x="2.5" y="2.5" width="11" height="12" fill="#c99a4a" stroke="#000"/><rect x="5" y="1" width="6" height="3" fill="#c0c0c0" stroke="#000"/><rect x="6.5" y="6.5" width="8" height="8" fill="#fff" stroke="#000"/>',
    undo: '<path d="M4 6h7a3 3 0 010 6H6" fill="none" stroke="#000" stroke-width="1.6"/><path d="M1 6l4-4v8z" fill="#000"/>',
    left: '<path d="M2 3h12M2 6h8M2 9h12M2 12h8" stroke="#000"/>',
    center: '<path d="M2 3h12M4 6h8M2 9h12M4 12h8" stroke="#000"/>',
    right: '<path d="M2 3h12M6 6h8M2 9h12M6 12h8" stroke="#000"/>',
    fill: '<rect x="3.5" y="1.5" width="9" height="4" fill="#fff" stroke="#000"/><path d="M8 6v6" stroke="#000" stroke-width="1.6"/><path d="M4 10h8l-4 5z" fill="#000080"/>',
    chart: '<path d="M1.5 1v13.5H15" fill="none" stroke="#000"/><rect x="3" y="8" width="3" height="6" fill="#3a6ea5"/><rect x="7" y="4" width="3" height="10" fill="#e0762c"/><rect x="11" y="6" width="3" height="8" fill="#5aa845"/>'
  };
  const ico = k => `<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">${I16[k]}</svg>`;
  const PAL = ['#3a6ea5', '#e0762c', '#5aa845', '#c43c3c', '#8a5cc2', '#d4b030', '#2aa6a6', '#b0588a', '#7a7a7a', '#6b8e23'];

  const CSS = `
.hs{display:flex;flex-direction:column;height:100%;min-height:0;font:13px var(--ui);background:#c0c0c0;color:#000;position:relative;overflow:hidden;user-select:none;-webkit-user-select:none}
.hs input{user-select:text;-webkit-user-select:text}
.hs-tbar{display:flex;gap:2px;padding:3px 4px;overflow-x:auto;flex:none;border-bottom:1px solid #808080;scrollbar-width:thin}
.hs-tbar button{flex:none;min-width:26px;height:26px;padding:0 4px;display:flex;align-items:center;justify-content:center;gap:3px;font:bold 13px var(--ui);background:#c0c0c0;color:#000;border:2px solid;border-color:#fff #000 #000 #fff;box-shadow:inset -1px -1px #808080;cursor:pointer}
.hs-tbar button:active,.hs-tbar button.on{border-color:#000 #fff #fff #000;box-shadow:inset 1px 1px #808080;background:#d4d4d4}
.hs-tbar .hs-sep{flex:none;width:2px;margin:2px 3px;border-left:1px solid #808080;border-right:1px solid #fff}
.hs-tbar .hs-wide{padding:0 7px;font-size:12px}
.hs-fb{display:flex;align-items:center;gap:3px;padding:3px 4px;flex:none}
.hs-nm{flex:none;width:58px;height:22px;line-height:18px;background:#fff;border:2px solid;border-color:#808080 #fff #fff #808080;padding:0 4px;box-sizing:border-box;overflow:hidden;white-space:nowrap;font-size:12px}
.hs-fx{flex:none;font:italic bold 13px Georgia,serif;padding:0 3px;color:#000080}
.hs-kb{flex:none;min-width:30px;height:24px;padding:0 5px;font:bold 13px var(--ui);background:#c0c0c0;color:#000;border:2px solid;border-color:#fff #000 #000 #fff;cursor:pointer}
.hs-kb:active{border-color:#000 #fff #fff #000}
.hs-in{flex:1;min-width:0;height:22px;box-sizing:border-box;font:13px var(--ui);padding:0 4px;background:#fff;color:#000;border:2px solid;border-color:#808080 #fff #fff #808080;outline:none;border-radius:0}
.hs-wrap{flex:1;min-height:0;overflow:auto;background:#fff;position:relative;outline:none;border:2px solid;border-color:#808080 #fff #fff #808080;margin:0 2px;touch-action:pan-x pan-y}
.hs-t{border-collapse:separate;border-spacing:0;table-layout:fixed}
.hs-t th,.hs-t td{height:20px;padding:0 3px;white-space:nowrap;overflow:hidden;box-sizing:border-box;border-right:1px solid #c0c0c0;border-bottom:1px solid #c0c0c0;font-weight:normal;cursor:cell;line-height:18px}
.hs-t thead th{position:sticky;top:0;z-index:3;background:#c0c0c0;text-align:center;border-color:#808080;box-shadow:inset 1px 1px #fff;cursor:default;position:sticky}
.hs-t tbody th{position:sticky;left:0;z-index:2;background:#c0c0c0;text-align:center;border-color:#808080;box-shadow:inset 1px 1px #fff;cursor:default}
.hs-t thead th:first-child{left:0;z-index:4}
.hs-t td.hs-b{font-weight:bold}
.hs-t td{position:relative}
.hs-t td.hs-ovc{overflow:visible}
.hs .hs-t td.hs-ovc.sel,.hs .hs-t td.hs-ovc.cur{overflow:hidden}
.hs-ovt{position:absolute;left:3px;top:0;z-index:1;white-space:nowrap;overflow:hidden;pointer-events:none}
.hs-y1985 .hs-ovt{left:.5ch}
.hs-t td.sel{background:#000080;color:#fff}
.hs-t td.cur{background:#fff;color:#000;outline:2px solid #000;outline-offset:-2px}
.hs-t th.hl{font-weight:bold}
.hs .hs-t td.sel.cur{background:#fff;color:#000;outline:2px solid #000;outline-offset:-2px}
.hs-rz{position:absolute;right:-3px;top:0;bottom:0;width:7px;cursor:col-resize;z-index:4;touch-action:none}
.hs-t thead th{overflow:visible}
.hs-thi{position:relative;display:block;height:100%}
.hs-touch{display:flex;gap:4px;padding:4px;flex:none;overflow-x:auto}
.hs-touch .btn{min-width:0;flex:1 0 auto;padding:6px 8px;min-height:36px}
.hs-touch .btn.on{border-color:#000 #fff #fff #000;background:#d8d8d8}
.hs-sb{display:flex;gap:4px;padding:2px 4px;flex:none;font-size:12px}
.hs-sb span{border:1px solid;border-color:#808080 #fff #fff #808080;padding:1px 6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hs-sb .hs-st{flex:1;min-width:0}
.hs-ov{position:absolute;inset:0;z-index:20;display:flex;align-items:center;justify-content:center;padding:8px;background:rgba(0,0,0,.15)}
.hs-dlg{background:#c0c0c0;border:2px solid;border-color:#fff #000 #000 #fff;box-shadow:inset -1px -1px #808080,2px 2px 0 rgba(0,0,0,.4);width:min(460px,100%);max-height:100%;display:flex;flex-direction:column;padding:2px;box-sizing:border-box}
.hs-dt{background:#000080;color:#fff;font-weight:bold;padding:3px 6px;flex:none}
.hs-dc{padding:8px;overflow:auto;min-height:0;flex:1 1 auto;user-select:text;-webkit-user-select:text}
.hs-db{display:flex;gap:6px;justify-content:flex-end;padding:6px 8px;flex:none;flex-wrap:wrap}
.hs-dc h4{margin:10px 0 4px;font-size:13px}.hs-dc h4:first-child{margin-top:0}
.hs-dc p{margin:0 0 6px;line-height:1.35}
.hs-dc pre{margin:0 0 6px;background:#fff;border:1px solid #808080;padding:4px 6px;font:12px "Courier New",monospace;white-space:pre-wrap}
.hs-list{display:flex;flex-direction:column;gap:3px;background:#fff;border:2px solid;border-color:#808080 #fff #fff #808080;padding:3px;max-height:260px;overflow:auto}
.hs-li{display:flex;align-items:center;gap:6px;padding:4px 6px;cursor:pointer;min-height:30px}
.hs-li.on{background:#000080;color:#fff}
.hs-li .hs-lm{flex:1;min-width:0}.hs-li small{display:block;opacity:.8}
.hs-li .btn{min-width:0;padding:2px 8px}
.hs-dc label{display:block;margin-bottom:4px}
.hs-dc .hs-din{width:100%;box-sizing:border-box;font:14px var(--ui);padding:4px;border:2px solid;border-color:#808080 #fff #fff #808080}
.hs-chart svg{display:block;width:100%;height:auto;background:#fff;border:1px solid #808080}
.hs-empty{padding:12px;text-align:center;color:#555}
/* 1995 */
.hs-y1995 .hs-t td.sel{background:#0a246a;color:#fff}
.hs-y1995 .hs-t th.hl{background:#d4d0c8;font-weight:bold}
/* 2000 */
.hs-y2000{background:#d4d0c8}
.hs-y2000 .hs-tbar{background:#d4d0c8}
.hs-y2000 .hs-tbar button{background:transparent;border:1px solid transparent;box-shadow:none;border-radius:0}
.hs-y2000 .hs-tbar button:hover{border-color:#fff #808080 #808080 #fff}
.hs-y2000 .hs-tbar button:active,.hs-y2000 .hs-tbar button.on{border-color:#808080 #fff #fff #808080;background:#e8e6e0}
.hs-y2000 .hs-tbar .hs-chartb{background:linear-gradient(#fdf6d8,#f1d68a);border-color:#b08a2a}
.hs-y2000 .hs-t thead th,.hs-y2000 .hs-t tbody th{background:#ece9d8;border-color:#aca899;box-shadow:none}
.hs-y2000 .hs-t th.hl{background:#f9d58a;font-weight:bold}
.hs-y2000 .hs-t td{border-color:#d8d8d8}
.hs-y2000 .hs-t td.sel{background:#c9d8f2;color:#000}
.hs-y2000 .hs-t td.cur{background:#fff;outline:2px solid #000}
.hs-y2000 .hs-dt{background:linear-gradient(90deg,#0a246a,#a6caf0)}
/* touch sizes */
.hs-touchy .hs-t th,.hs-touchy .hs-t td{height:28px;line-height:26px}
.hs-touchy .hs-kb{min-width:40px;height:34px}
.hs-touchy .hs-in,.hs-touchy .hs-nm{height:34px;line-height:30px;font-size:16px}
.hs-touchy .hs-tbar button{min-width:36px;height:36px}
/* 1985 text mode */
.hs-y1985{background:#000;color:var(--phos,#33ff66);font:18px var(--dos)}
.hs-y1985 .hs-fb{padding:0 4px;gap:6px}
.hs-y1985 .hs-nm{background:#000;border:0;color:var(--phos,#33ff66);font:18px var(--dos);width:auto;min-width:4ch;height:22px;line-height:22px;padding:0}
.hs-y1985 .hs-in{background:#000;color:var(--phos,#33ff66);border:0;font:18px var(--dos);padding:0;caret-color:var(--phos,#33ff66);height:22px}
.hs-y1985 .hs-mode{flex:none;background:var(--phos,#33ff66);color:#000;padding:0 6px;line-height:20px}
.hs-y1985 .hs-kb{background:#000;color:var(--phos,#33ff66);border:1px solid var(--phos,#33ff66);font:18px var(--dos)}
.hs-l2,.hs-l3{flex:none;padding:0 4px;height:22px;line-height:22px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hs-l2 .hs-mi{cursor:pointer;padding:0 .5ch;margin-right:.5ch}
.hs-l2 .hs-mi.on{background:var(--phos,#33ff66);color:#000}
.hs-y1985 .hs-wrap{background:#000;border:0;margin:0;border-top:1px solid var(--phos,#33ff66)}
.hs-y1985 .hs-t th,.hs-y1985 .hs-t td{border:0;height:22px;line-height:22px;padding:0 .5ch}
.hs-y1985 .hs-t thead th,.hs-y1985 .hs-t tbody th{background:var(--phos,#33ff66);color:#000;box-shadow:none}
.hs-y1985 .hs-t tbody th{text-align:right}
.hs-y1985 .hs-t td.hs-b{font-weight:bold}
.hs-y1985 .hs-t td.sel{background:color-mix(in srgb,var(--phos,#33ff66) 28%,#000);color:var(--phos,#33ff66)}
.hs-y1985 .hs-t td.cur,.hs-y1985 .hs-t td.sel.cur{background:var(--phos,#33ff66);color:#000;outline:0}
.hs-y1985 .hs-t th.hl{background:#000;color:var(--phos,#33ff66)}
.hs-y1985 .hs-bot{display:flex;flex:none;background:var(--phos,#33ff66);color:#000;padding:0 4px;height:22px;line-height:22px;white-space:nowrap;overflow:hidden;gap:2ch}
.hs-y1985 .hs-bot span:last-child{margin-left:auto}
.hs-y1985 .hs-touch .btn{font:18px var(--dos)}
.hs-y1985 .hs-ov{background:transparent}
.hs-y1985 .hs-dlg{background:#000;color:var(--phos,#33ff66);border:3px double var(--phos,#33ff66);box-shadow:none}
.hs-y1985 .hs-dt{background:var(--phos,#33ff66);color:#000;font-weight:normal;text-align:center}
.hs-y1985 .hs-dc pre,.hs-y1985 .hs-list,.hs-y1985 .hs-dc .hs-din{background:#000;color:var(--phos,#33ff66);border:1px solid var(--phos,#33ff66);font:17px var(--dos)}
.hs-y1985 .hs-dc h4{font-weight:normal;text-decoration:underline}
.hs-y1985 .hs-li.on{background:var(--phos,#33ff66);color:#000}
.hs-y1985 .hs-chart svg{background:#000}
.hs-y1985 .hs-empty{color:inherit}
`;

  function open(W, api) {
    const era = api.era.id, dos = era === '1985', touch = coarse(), E = api.esc;
    const root = document.createElement('div');
    root.className = `hs hs-y${era}${touch ? ' hs-touchy' : ''}`;
    W.body.appendChild(root);
    if (dos) W.keepEsc = true;

    /* ---------- state ---------- */
    let doc = blankDoc();
    let sel = { ac: 0, ar: 0, cc: 0, cr: 0 };
    let editing = false, editMode = 'enter', inpIntent = 'enter';
    let undoStack = [], clip = null, rangeMode = false, overlay = null, slash = null, dirty = false, calc = null;
    let workTimer = 0;
    function blankDoc() { return { name: null, cells: {}, fmt: {}, w: {} }; }
    const saved = api.load('work', null);
    if (saved && saved.doc && saved.doc.cells) { doc = Object.assign(blankDoc(), saved.doc); dirty = !!saved.dirty; }

    /* ---------- layout ---------- */
    const TB = [
      ['new', 'New sheet', () => fileNew()], ['open', 'Open', () => fileOpen()], ['save', 'Save', () => fileSave()], '|',
      ['cut', 'Cut', () => doCopy(true)], ['copy', 'Copy', () => doCopy(false)], ['paste', 'Paste', () => doPaste()], ['undo', 'Undo', () => undo()], '|',
      ['B', 'Bold', () => toggleFmt('b')], ['$', 'Currency', () => setNum('cur')], ['%', 'Percent', () => setNum('pct')], ['left', 'Align left', () => setAlign('l')], ['center', 'Center', () => setAlign('c')], ['right', 'Align right', () => setAlign('r')], '|',
      ['Σ Sum', 'Sum', () => autoSum()], ['fill', 'Fill down', () => fillDown()]
    ];
    if (era === '2000') TB.push('|', ['chart', 'Chart', () => openChart()]);
    const tbHtml = TB.map(t => t === '|' ? '<span class="hs-sep"></span>' : `<button type="button" title="${t[1]}" aria-label="${t[1]}" data-tb="${t[1]}" class="${t[0] === 'chart' ? 'hs-chartb hs-wide' : t[0].length > 2 && !I16[t[0]] ? 'hs-wide' : ''}">${I16[t[0]] ? ico(t[0]) + (t[0] === 'chart' ? 'Chart' : '') : E(t[0])}</button>`).join('');
    const showKb = !dos || touch;
    root.innerHTML = `
      ${era === '1995' || era === '2000' ? `<div class="hs-tbar" role="toolbar">${tbHtml}</div>` : ''}
      <div class="hs-fb">
        <div class="hs-nm" aria-label="Cell name"></div>
        ${era === '2000' ? '<span class="hs-fx">fx</span>' : ''}
        ${showKb ? '<button type="button" class="hs-kb hs-keep" data-k="eq" title="Start a formula">=</button><button type="button" class="hs-kb hs-keep" data-k="sum" title="Add up numbers">SUM</button>' : ''}
        <input class="hs-in" aria-label="Formula bar" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="done">
        ${showKb ? '<button type="button" class="hs-kb hs-keep" data-k="ok" title="Enter">OK</button>' : ''}
        ${dos ? '<span class="hs-mode">READY</span>' : ''}
      </div>
      ${dos ? '<div class="hs-l2"></div><div class="hs-l3"></div>' : ''}
      <div class="hs-wrap" tabindex="0"><table class="hs-t"><colgroup></colgroup><thead></thead><tbody></tbody></table></div>
      ${touch ? `<div class="hs-touch">${dos ? '<button class="btn hs-keep" data-t="menu">/ Menu</button>' : ''}<button class="btn" data-t="range">Select range</button><button class="btn" data-t="copy">Copy</button><button class="btn" data-t="paste">Paste</button><button class="btn" data-t="fill">Fill down</button><button class="btn" data-t="undo">Undo</button>${era === '2000' ? '<button class="btn" data-t="chart">Chart</button>' : ''}</div>` : ''}
      ${dos ? '<div class="hs-bot"><span>HORIZON SHEET 1.0</span><span>/=Menu  F1=Help  Esc=Exit</span><span class="hs-fn"></span></div>' : '<div class="hs-sb"><span class="hs-st">Ready</span><span class="hs-agg"></span></div>'}`;
    const $ = s => root.querySelector(s);
    const nm = $('.hs-nm'), inp = $('.hs-in'), wrap = $('.hs-wrap'), table = $('.hs-t'), cg = $('colgroup'), thead = $('thead'), tbody = $('tbody');
    const modeEl = $('.hs-mode'), l2 = $('.hs-l2'), l3 = $('.hs-l3'), stEl = $('.hs-st'), aggEl = $('.hs-agg'), fnEl = $('.hs-fn');

    // measure a text-mode character
    let chPx = 8;
    if (dos) { const pr = document.createElement('span'); pr.style.cssText = 'position:absolute;visibility:hidden;white-space:pre;font:18px var(--dos)'; pr.textContent = '0000000000'; root.appendChild(pr); chPx = pr.getBoundingClientRect().width / 10 || 9; pr.remove(); }
    const colPx = c => { const n = doc.w[c] || DEFW; return Math.round(dos ? n * chPx + chPx : n * 7 + 10); };
    const hdrPx = dos ? Math.round(chPx * 4) : touch ? 40 : 36;

    // build grid
    const cols = [], ths = [], rowThs = [], tds = [], shown = [];
    { const c0 = document.createElement('col'); c0.style.width = hdrPx + 'px'; cg.appendChild(c0);
      const tr = document.createElement('tr'); const corner = document.createElement('th'); corner.dataset.all = '1'; tr.appendChild(corner);
      for (let c = 0; c < COLS; c++) {
        const col = document.createElement('col'); cg.appendChild(col); cols.push(col);
        const th = document.createElement('th'); th.dataset.col = c;
        th.innerHTML = `<span class="hs-thi">${colName(c)}${dos ? '' : `<span class="hs-rz" data-rz="${c}"></span>`}</span>`;
        tr.appendChild(th); ths.push(th);
      }
      thead.appendChild(tr);
      const frag = document.createDocumentFragment();
      for (let r = 0; r < ROWS; r++) {
        const row = document.createElement('tr'); const th = document.createElement('th'); th.textContent = r + 1; th.dataset.row = r; row.appendChild(th); rowThs.push(th);
        const line = [];
        for (let c = 0; c < COLS; c++) { const td = document.createElement('td'); td.dataset.c = c; td.dataset.r = r; row.appendChild(td); line.push(td); }
        tds.push(line); shown.push(new Array(COLS).fill(null));
        frag.appendChild(row);
      }
      tbody.appendChild(frag);
    }
    function layoutCols() {
      let tot = hdrPx;
      for (let c = 0; c < COLS; c++) { const w = colPx(c); cols[c].style.width = w + 'px'; tot += w; }
      table.style.width = tot + 'px';
    }

    /* ---------- recalc + render ---------- */
    function recalc() {
      calc = makeCalc(doc.cells);
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        const a = A(c, r), raw = doc.cells[a], f = doc.fmt[a];
        if (raw === undefined && !f && shown[r][c] === null) continue;
        const v = raw === undefined ? null : calc.cell(a);
        const txt = show(v, f, doc.w[c] || DEFW);
        const al = (f && f.a) || (typeof v === 'number' || typeof v === 'boolean' || isErr(v) ? 'r' : 'l');
        let ov = 0;
        if (typeof v === 'string' && al === 'l' && txt.length > (doc.w[c] || DEFW) - 1) for (let c2 = c + 1; c2 < COLS && doc.cells[A(c2, r)] === undefined && ov < 700; c2++) ov += colPx(c2);
        const key = txt + '|' + al + '|' + (f && f.b ? 1 : 0) + '|' + ov;
        if (shown[r][c] === key) continue;
        const td = tds[r][c];
        if (ov) { td.textContent = ''; const sp = document.createElement('span'); sp.className = 'hs-ovt'; sp.style.width = (colPx(c) + ov - 4) + 'px'; sp.textContent = txt; td.appendChild(sp); }
        else td.textContent = txt;
        td.classList.toggle('hs-ovc', !!ov);
        td.style.textAlign = al === 'r' ? 'right' : al === 'c' ? 'center' : '';
        td.classList.toggle('hs-b', !!(f && f.b));
        shown[r][c] = (raw === undefined && !f) ? null : key;
      }
      renderSel();
    }
    const rng = () => ({ c1: Math.min(sel.ac, sel.cc), r1: Math.min(sel.ar, sel.cr), c2: Math.max(sel.ac, sel.cc), r2: Math.max(sel.ar, sel.cr) });
    const rngText = g => g.c1 === g.c2 && g.r1 === g.r2 ? A(g.c1, g.r1) : A(g.c1, g.r1) + ':' + A(g.c2, g.r2);
    let prevSel = [];
    function renderSel() {
      prevSel.forEach(el => el.classList.remove('sel', 'cur', 'hl'));
      prevSel = [];
      const g = rng();
      for (let r = g.r1; r <= g.r2; r++) for (let c = g.c1; c <= g.c2; c++) { const td = tds[r][c]; td.classList.add('sel'); prevSel.push(td); }
      const cur = tds[sel.cr][sel.cc]; cur.classList.add('cur'); prevSel.push(cur);
      for (let c = g.c1; c <= g.c2; c++) { ths[c].classList.add('hl'); prevSel.push(ths[c]); }
      for (let r = g.r1; r <= g.r2; r++) { rowThs[r].classList.add('hl'); prevSel.push(rowThs[r]); }
      const a = A(sel.cc, sel.cr);
      nm.textContent = dos ? a + ':' : rngText(g);
      if (!editing) inp.value = doc.cells[a] || '';
      status();
    }
    function status() {
      const g = rng(), multi = g.c1 !== g.c2 || g.r1 !== g.r2;
      let agg = '';
      if (multi && calc) {
        const v = []; for (let r = g.r1; r <= g.r2; r++) for (let c = g.c1; c <= g.c2; c++) { const x = calc.cell(A(c, r)); if (typeof x === 'number') v.push(x); }
        if (v.length) agg = `Sum=${show(v.reduce((s, x) => s + x, 0))}  Count=${v.length}`;
      }
      const mode = slash ? 'MENU' : editing ? (editMode === 'edit' ? 'EDIT' : pointable() ? 'POINT' : (inp.value[0] === '=' ? 'VALUE' : 'LABEL')) : 'READY';
      if (dos) {
        modeEl.textContent = mode;
        if (fnEl) fnEl.textContent = (doc.name || 'UNTITLED') + (dirty ? '*' : '') + (agg ? '  ' + agg.replace(/  /g, ' ') : '');
        if (!slash) {
          l2.textContent = editing ? (pointable() ? 'Click a cell to put its name in the formula.' : 'Enter=store  Esc=cancel  Arrows=store and move') : 'Type a number, words, or =formula.  Press / for commands.';
          l3.textContent = editing ? '' : (clip ? 'Copied ' + clip.label + '. /Paste to put it somewhere.' : 'Try /Template for a ready-made sheet.');
        }
      } else {
        stEl.textContent = editing ? (pointable() ? 'Point: click a cell to add it to the formula' : 'Enter: press Enter or OK to store') : (clip ? `Copied ${clip.label}. Select a cell and Paste.` : rangeMode ? 'Select range: tap the other corner' : 'Ready');
        aggEl.textContent = agg || (doc.name || 'Untitled') + (dirty ? ' *' : '');
      }
    }
    function title() { api.setTitle('Horizon Sheet - ' + (doc.name || 'Untitled') + (dirty ? ' *' : '')); }
    function ensureVisible(c, r) {
      const td = tds[r][c], wr = wrap.getBoundingClientRect(), tr = td.getBoundingClientRect();
      const top = tr.top - wr.top + wrap.scrollTop, left = tr.left - wr.left + wrap.scrollLeft, hh = thead.offsetHeight;
      if (top - hh < wrap.scrollTop) wrap.scrollTop = top - hh;
      else if (top + tr.height > wrap.scrollTop + wrap.clientHeight) wrap.scrollTop = top + tr.height - wrap.clientHeight;
      if (left - hdrPx < wrap.scrollLeft) wrap.scrollLeft = left - hdrPx;
      else if (left + tr.width > wrap.scrollLeft + wrap.clientWidth) wrap.scrollLeft = Math.min(left - hdrPx, left + tr.width - wrap.clientWidth);
    }
    function select(c, r, extend) {
      c = Math.max(0, Math.min(COLS - 1, c)); r = Math.max(0, Math.min(ROWS - 1, r));
      if (extend) { sel.cc = c; sel.cr = r; } else sel = { ac: c, ar: r, cc: c, cr: r };
      renderSel(); ensureVisible(c, r);
    }

    /* ---------- editing ---------- */
    function snapshot() { undoStack.push(JSON.stringify({ cells: doc.cells, fmt: doc.fmt, w: doc.w })); if (undoStack.length > 60) undoStack.shift(); }
    function changed() {
      dirty = true; title(); recalc();
      clearTimeout(workTimer); workTimer = setTimeout(saveWork, 400);
    }
    function saveWork() { clearTimeout(workTimer); api.save('work', { doc, dirty }); }
    function setRaw(a, raw) {
      if (raw === '' || raw == null) delete doc.cells[a]; else doc.cells[a] = raw;
    }
    function commit() {
      if (!editing) return;
      editing = false;
      let raw = inp.value.replace(/\s+$/, '');
      const a = A(sel.cc, sel.cr), old = doc.cells[a] || '';
      if (raw[0] === '=') raw = normF(raw);
      if (raw !== old) {
        snapshot();
        if (raw && raw[0] !== '=' && raw[0] !== "'") {
          const s = raw.trim();
          if (/\d/.test(s) && NUMRX.test(s)) {
            const f = doc.fmt[a] = Object.assign({}, doc.fmt[a]);
            if (s.includes('$')) f.n = 'cur'; else if (s.endsWith('%')) f.n = 'pct';
            if (s.endsWith('%')) raw = String(literal(s)); else raw = s.replace(/[$,+]/g, '');
          }
        }
        setRaw(a, raw);
        api.sfx.key && api.sfx.key();
        changed();
        const v = calc.cell(a);
        if (isErr(v)) api.sfx.ding();
      } else renderSel();
    }
    function cancelEdit() { editing = false; inp.value = doc.cells[A(sel.cc, sel.cr)] || ''; blurInp(); status(); }
    function blurInp() { if (document.activeElement === inp) { if (touch) inp.select(); else focusGrid(); } }
    function focusGrid() { if (!overlay) wrap.focus({ preventScroll: true }); }
    function startEdit(initial, mode) {
      if (slash) closeSlash();
      editing = true; editMode = mode || 'enter';
      if (initial !== null && initial !== undefined) inp.value = initial;
      inp.focus({ preventScroll: true });
      const n = inp.value.length; try { inp.setSelectionRange(n, n); } catch (e) { }
      status();
    }
    function pointable() {
      if (!editing || inp.value[0] !== '=') return false;
      const pos = inp.selectionStart == null ? inp.value.length : inp.selectionStart;
      return /[=+\-*/^(,:<>&]\s*$/.test(inp.value.slice(0, pos));
    }
    function insertAtCaret(t) {
      const s = inp.selectionStart == null ? inp.value.length : inp.selectionStart, e = inp.selectionEnd == null ? s : inp.selectionEnd;
      inp.value = inp.value.slice(0, s) + t + inp.value.slice(e);
      const p = s + t.length; inp.focus({ preventScroll: true }); try { inp.setSelectionRange(p, p); } catch (x) { }
      status();
    }
    inp.addEventListener('pointerdown', () => { inpIntent = 'edit'; });
    inp.addEventListener('focus', () => { if (slash) closeSlash(); });
    inp.addEventListener('input', () => { if (!editing) { editing = true; editMode = inpIntent === 'edit' ? 'edit' : 'enter'; } status(); });
    inp.addEventListener('blur', () => { if (editing && !overlay) { commit(); } inpIntent = 'enter'; });
    inp.addEventListener('keyup', () => editing && status());

    function move(dc, dr) { commit(); select(sel.cc + dc, sel.cr + dr); if (touch && document.activeElement === inp) inp.select(); }

    /* ---------- cell operations ---------- */
    function forRange(fn) { const g = rng(); for (let r = g.r1; r <= g.r2; r++) for (let c = g.c1; c <= g.c2; c++) fn(A(c, r), c, r); }
    function clearCells() { commit(); snapshot(); forRange(a => { delete doc.cells[a]; }); changed(); }
    function toggleFmt(k) {
      commit(); snapshot();
      const on = !(doc.fmt[A(sel.cc, sel.cr)] || {})[k];
      forRange(a => { const f = Object.assign({}, doc.fmt[a]); if (on) f[k] = 1; else delete f[k]; setFmt(a, f); });
      changed();
    }
    function setFmt(a, f) { if (Object.keys(f).length) doc.fmt[a] = f; else delete doc.fmt[a]; }
    function setNum(n) { commit(); snapshot(); forRange(a => { const f = Object.assign({}, doc.fmt[a]); if (n === 'gen') delete f.n; else f.n = n; setFmt(a, f); }); changed(); }
    function setAlign(al) { commit(); snapshot(); forRange(a => { const f = Object.assign({}, doc.fmt[a]); if (al) f.a = al; else delete f.a; setFmt(a, f); }); changed(); }
    function setWidth(delta, abs) {
      commit(); snapshot();
      const g = rng();
      for (let c = g.c1; c <= g.c2; c++) { const n = abs ? abs : (doc.w[c] || DEFW) + delta; const v = Math.max(3, Math.min(40, n)); if (v === DEFW) delete doc.w[c]; else doc.w[c] = v; }
      layoutCols(); changed();
    }
    function doCopy(cut) {
      commit();
      const g = rng(), cells = [];
      for (let r = g.r1; r <= g.r2; r++) { const line = []; for (let c = g.c1; c <= g.c2; c++) { const a = A(c, r); line.push({ raw: doc.cells[a], f: doc.fmt[a] }); } cells.push(line); }
      clip = { c: g.c1, r: g.r1, w: g.c2 - g.c1 + 1, h: g.r2 - g.r1 + 1, cells, cut, label: rngText(g) };
      try { navigator.clipboard && navigator.clipboard.writeText(cells.map(l => l.map(x => x.raw || '').join('\t')).join('\n')).catch(() => { }); } catch (e) { }
      api.sfx.click(); status();
    }
    function doPaste() {
      commit();
      if (!clip) { api.sfx.beep(); return; }
      snapshot();
      const g = rng();
      const single = clip.w === 1 && clip.h === 1 && !clip.cut;
      const tw = single ? g.c2 - g.c1 + 1 : clip.w, th = single ? g.r2 - g.r1 + 1 : clip.h;
      const puts = [];
      for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) {
        const c = g.c1 + x, r = g.r1 + y; if (!inGrid(c, r)) continue;
        const src = clip.cells[single ? 0 : y][single ? 0 : x];
        const raw = clip.cut ? src.raw : shiftF(src.raw, c - (clip.c + (single ? 0 : x)), r - (clip.r + (single ? 0 : y)));
        puts.push([A(c, r), raw, src.f]);
      }
      if (clip.cut) for (let y = 0; y < clip.h; y++) for (let x = 0; x < clip.w; x++) { const a = A(clip.c + x, clip.r + y); delete doc.cells[a]; delete doc.fmt[a]; }
      puts.forEach(([a, raw, f]) => { setRaw(a, raw); if (f) doc.fmt[a] = Object.assign({}, f); else delete doc.fmt[a]; });
      if (!single) { sel = { ac: g.c1, ar: g.r1, cc: Math.min(COLS - 1, g.c1 + tw - 1), cr: Math.min(ROWS - 1, g.r1 + th - 1) }; }
      if (clip.cut) clip = null;
      changed();
    }
    function fillDown() {
      commit();
      let g = rng();
      if (g.r1 === g.r2) { if (g.r1 === 0) return; g = { c1: g.c1, c2: g.c2, r1: g.r1 - 1, r2: g.r2 }; }
      snapshot();
      for (let c = g.c1; c <= g.c2; c++) {
        const a0 = A(c, g.r1), raw = doc.cells[a0], f = doc.fmt[a0];
        for (let r = g.r1 + 1; r <= g.r2; r++) { const a = A(c, r); setRaw(a, shiftF(raw, 0, r - g.r1)); if (f) doc.fmt[a] = Object.assign({}, f); else delete doc.fmt[a]; }
      }
      changed();
    }
    function undo() {
      commit();
      if (!undoStack.length) { api.sfx.beep(); return; }
      const s = JSON.parse(undoStack.pop()); doc.cells = s.cells; doc.fmt = s.fmt; doc.w = s.w;
      layoutCols(); changed();
    }
    function autoSum() {
      if (editing && /^=?\s*$/.test(inp.value)) editing = false;
      if (editing) { insertAtCaret('SUM('); return; }
      const g = rng(), multi = g.c1 !== g.c2 || g.r1 !== g.r2;
      if (multi) {
        snapshot();
        if (g.r2 > g.r1 && g.r2 + 1 < ROWS) { for (let c = g.c1; c <= g.c2; c++) setRaw(A(c, g.r2 + 1), `=SUM(${A(c, g.r1)}:${A(c, g.r2)})`); changed(); select(g.c1, g.r2 + 1); }
        else if (g.c2 + 1 < COLS) { for (let r = g.r1; r <= g.r2; r++) setRaw(A(g.c2 + 1, r), `=SUM(${A(g.c1, r)}:${A(g.c2, r)})`); changed(); select(g.c2 + 1, g.r1); }
        api.sfx.click(); return;
      }
      const isNum = (c, r) => calc && typeof calc.cell(A(c, r)) === 'number';
      let r0 = sel.cr;
      while (r0 > 0 && isNum(sel.cc, r0 - 1)) r0--;
      if (r0 < sel.cr) { startEdit(`=SUM(${A(sel.cc, r0)}:${A(sel.cc, sel.cr - 1)})`); return; }
      let c0 = sel.cc;
      while (c0 > 0 && isNum(c0 - 1, sel.cr)) c0--;
      if (c0 < sel.cc) { startEdit(`=SUM(${A(c0, sel.cr)}:${A(sel.cc - 1, sel.cr)})`); return; }
      startEdit('=SUM(');
    }
    function eqKey() { if (editing) insertAtCaret('='); else { inpIntent = 'enter'; startEdit('='); } }

    /* ---------- files ---------- */
    const files = () => api.load('files', []);
    const values = () => { const out = {}; const k = makeCalc(doc.cells); Object.keys(doc.cells).forEach(a => { out[a] = plainVal(k.cell(a)); }); return out; };
    function writeFile(name) {
      const list = files(), i = list.findIndex(f => f.name.toLowerCase() === name.toLowerCase());
      const entry = { name, cells: doc.cells, fmt: doc.fmt, w: doc.w, t: Date.now() };
      if (i >= 0) list[i] = entry;
      else { if (list.length >= MAXFILES) { api.msgBox('Horizon Sheet', `The disk holds ${MAXFILES} sheets. Use File, Open to delete one first.`, ['OK'], 'warn'); return false; } list.push(entry); }
      api.save('files', list);
      doc.name = name; dirty = false; title(); saveWork(); status();
      api.sfx.floppy ? api.sfx.floppy() : api.sfx.ding();
      api.task('sheet-save', { cells: Object.assign({}, doc.cells), values: values() });
      flash(`Saved ${name}.`);
      return true;
    }
    function flash(t) { if (dos) { l3.textContent = t; } else stEl.textContent = t; }
    function fileSave() { commit(); if (doc.name) return writeFile(doc.name); fileSaveAs(); }
    function fileSaveAs(after) {
      commit();
      const body = document.createElement('div');
      body.innerHTML = `<label>Name for this sheet${dos ? ' (up to 8 letters or numbers)' : ''}:</label><input class="hs-din" maxlength="${dos ? 8 : 24}" autocomplete="off" spellcheck="false">`;
      const fi = body.querySelector('input'); fi.value = doc.name || doc.suggest || '';
      const ok = () => {
        let n = fi.value.trim(); if (dos) n = n.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
        n = n.replace(/[^\w .\-]/g, '').slice(0, 24);
        if (!n) { fi.focus(); api.sfx.beep(); return; }
        const exists = files().some(f => f.name.toLowerCase() === n.toLowerCase()) && n !== doc.name;
        closeOverlay();
        const go = () => { if (writeFile(n) && after) after(); };
        if (exists) api.msgBox('Save As', `A sheet named ${n} already exists. Replace it?`, ['Yes', 'No'], 'warn').then(b => b === 'Yes' && go());
        else go();
      };
      dialog('Save As', body, [['Save', ok, true], ['Cancel', closeOverlay]]);
      fi.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); ok(); } });
      setTimeout(() => { fi.focus(); fi.select(); }, 30);
    }
    async function checkDirty() {
      if (!dirty || !Object.keys(doc.cells).length) return true;
      const b = await api.msgBox('Horizon Sheet', `Save changes to ${doc.name || 'Untitled'}?`, ['Yes', 'No', 'Cancel'], 'warn');
      if (b === 'Yes') { if (doc.name) return writeFile(doc.name); return new Promise(res => fileSaveAs(() => res(true))); }
      return b === 'No';
    }
    function loadDoc(d) {
      doc = Object.assign(blankDoc(), JSON.parse(JSON.stringify(d)));
      undoStack = []; dirty = false; editing = false;
      layoutCols(); sel = { ac: 0, ar: 0, cc: 0, cr: 0 }; wrap.scrollTop = wrap.scrollLeft = 0;
      recalc(); title(); saveWork(); focusGrid();
    }
    async function fileNew() { commit(); if (!(await checkDirty())) return; loadDoc(blankDoc()); flash('New sheet.'); }
    function fileOpen() {
      commit();
      const body = document.createElement('div');
      const draw = () => {
        const list = files().slice().sort((a, b) => b.t - a.t);
        body.innerHTML = list.length ? `<div class="hs-list" role="listbox">${list.map((f, i) => `<div class="hs-li" data-i="${i}" role="option" tabindex="0"><span class="hs-lm">${E(f.name)}<small>${Object.keys(f.cells).length} cells, saved ${new Date(f.t).toLocaleDateString()}</small></span><button class="btn" data-del="${i}">Delete</button></div>`).join('')}</div><p style="margin:6px 0 0">${list.length} of ${MAXFILES} sheets used.</p>` : `<div class="hs-empty">No saved sheets yet. Use File, Save to keep one.</div>`;
        body.querySelectorAll('[data-i]').forEach(el => {
          const f = list[+el.dataset.i];
          el.onclick = async e => {
            if (e.target.closest('[data-del]')) {
              e.stopPropagation();
              const b = await api.msgBox('Delete', `Delete the sheet ${f.name}?`, ['Yes', 'No'], 'warn');
              if (b === 'Yes') { api.save('files', files().filter(x => x.name !== f.name)); if (doc.name === f.name) { doc.name = null; title(); } draw(); }
              return;
            }
            closeOverlay();
            if (!(await checkDirty())) return;
            loadDoc(f); flash(`Opened ${f.name}.`);
          };
          el.onkeydown = e => { if (e.key === 'Enter') el.click(); };
        });
        const first = body.querySelector('.hs-li'); first && setTimeout(() => first.focus(), 30);
      };
      draw();
      dialog('Open', body, [['Cancel', closeOverlay]]);
    }
    function fileTemplates() {
      commit();
      const body = document.createElement('div');
      const desc = ['Plan how to spend and save your allowance.', 'Track cups sold, costs and profit for a week.', 'Count treats baked, sold and money raised.'];
      body.innerHTML = `<p>Pick a ready-made sheet. It is full of formulas you can study and change.</p><div class="hs-list">${TEMPLATES.map((t, i) => `<div class="hs-li" data-t="${i}" tabindex="0"><span class="hs-lm">${dos ? (i + 1) + '. ' : ''}${E(t.name)}<small>${desc[i]}</small></span></div>`).join('')}</div>`;
      body.querySelectorAll('[data-t]').forEach(el => {
        const go = async () => { closeOverlay(); if (!(await checkDirty())) return; loadTemplate(TEMPLATES[+el.dataset.t]); };
        el.onclick = go; el.onkeydown = e => { if (e.key === 'Enter') go(); };
      });
      dialog('Templates', body, [['Cancel', closeOverlay]]);
      setTimeout(() => { const f = body.querySelector('.hs-li'); f && f.focus(); }, 30);
    }
    function loadTemplate(t) {
      const d = blankDoc();
      t.rows.forEach(([a, raw, f]) => { d.cells[a] = raw; if (f) d.fmt[a] = Object.assign({}, f); });
      d.w = Object.assign({}, t.widths); d.suggest = dos ? t.file : t.name;
      loadDoc(d); dirty = true; title(); saveWork();
      select(t.start[0], t.start[1]);
      flash(`Template: ${t.name}. Change the numbers and watch the totals!`);
      api.sfx.tada ? api.sfx.tada() : null;
    }

    /* ---------- dialogs ---------- */
    function dialog(ttl, bodyEl, buttons) {
      closeOverlay();
      if (slash) closeSlash();
      const ov = document.createElement('div'); ov.className = 'hs-ov';
      ov.innerHTML = `<div class="hs-dlg" role="dialog" aria-label="${E(ttl)}"><div class="hs-dt">${E(ttl)}</div><div class="hs-dc"></div><div class="hs-db"></div></div>`;
      ov.querySelector('.hs-dc').appendChild(bodyEl);
      const db = ov.querySelector('.hs-db');
      let def = null;
      buttons.forEach(([lab, fn, isDef]) => { const b = document.createElement('button'); b.className = 'btn'; b.textContent = lab; b.onclick = fn; db.appendChild(b); if (isDef) def = fn; });
      ov.addEventListener('pointerdown', e => { if (e.target === ov) closeOverlay(); });
      root.appendChild(ov);
      overlay = { el: ov, def };
      if (!bodyEl.querySelector('input,.hs-li')) setTimeout(() => { const b = db.querySelector('.btn'); b && b.focus(); }, 30);
      status();
    }
    function closeOverlay() { if (!overlay) return; overlay.el.remove(); overlay = null; focusGrid(); status(); }
    function openHelpDlg() { const b = document.createElement('div'); b.innerHTML = HELP_HTML; dialog('How formulas work', b, [['OK', closeOverlay, true]]); }
    function widthDlg() {
      const b = document.createElement('div');
      b.innerHTML = `<label>Column width (3 to 40 characters):</label><input class="hs-din" type="number" min="3" max="40" inputmode="numeric">`;
      const fi = b.querySelector('input'); fi.value = doc.w[sel.cc] || DEFW;
      const ok = () => { const n = Math.round(+fi.value); closeOverlay(); if (n >= 3 && n <= 40) setWidth(0, n); };
      fi.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); ok(); } });
      dialog('Column Width', b, [['OK', ok, true], ['Cancel', closeOverlay]]);
      setTimeout(() => { fi.focus(); fi.select(); }, 30);
    }
    function about() {
      const b = document.createElement('div');
      b.innerHTML = `<p><b>Horizon Sheet</b> ${dos ? '1.0' : era === '1990' ? '3.0' : era === '1995' ? '95' : '2000'}</p><p>${COLS} columns by ${ROWS} rows. Save up to ${MAXFILES} sheets.</p><p>Keys: arrows move, Shift+arrows select, F2 edits, Enter stores, Ctrl+C / Ctrl+V copy and paste, Ctrl+D fills down, Ctrl+Z undoes.</p>`;
      dialog('About Horizon Sheet', b, [['OK', closeOverlay, true]]);
    }

    /* ---------- chart (2000) ---------- */
    function chartData() {
      const g = rng(); if (!calc) return null;
      const w = g.c2 - g.c1 + 1, h = g.r2 - g.r1 + 1;
      const txt = (c, r) => { if (!inGrid(c, r)) return null; const v = calc.cell(A(c, r)); return typeof v === 'string' && v.trim() ? v : null; };
      const numAt = (c, r) => { const v = calc.cell(A(c, r)); return typeof v === 'number' ? v : null; };
      const items = [];
      if (w >= 2 && [...Array(h)].some((_, i) => txt(g.c1, g.r1 + i))) {
        let vc = g.c1 + 1; while (vc <= g.c2 && ![...Array(h)].some((_, i) => numAt(vc, g.r1 + i) !== null)) vc++;
        if (vc > g.c2) return null;
        for (let r = g.r1; r <= g.r2; r++) { const v = numAt(vc, r); if (v !== null) items.push({ l: txt(g.c1, r) || A(g.c1, r), v }); }
      } else if (h >= 2 && w >= 2 && [...Array(w)].some((_, i) => txt(g.c1 + i, g.r1))) {
        for (let c = g.c1; c <= g.c2; c++) { const v = numAt(c, g.r1 + 1); if (v !== null) items.push({ l: txt(c, g.r1) || A(c, g.r1), v }); }
      } else if (w === 1) {
        for (let r = g.r1; r <= g.r2; r++) { const v = numAt(g.c1, r); if (v !== null) items.push({ l: txt(g.c1 - 1, r) || A(g.c1, r), v }); }
      } else {
        for (let c = g.c1; c <= g.c2; c++) for (let r = g.r1; r <= g.r2; r++) { const v = numAt(c, r); if (v !== null) items.push({ l: (h === 1 ? txt(c, g.r1 - 1) : null) || A(c, r), v }); }
      }
      return items.length ? items.slice(0, 24) : null;
    }
    function svgBar(items) {
      const W0 = 400, H0 = 250, L = 44, B = 40, T = 14, Rm = 10, pw = W0 - L - Rm, ph = H0 - T - B;
      const hi = Math.max(0, ...items.map(i => i.v)), lo = Math.min(0, ...items.map(i => i.v));
      const rawStep = ((hi - lo) || 1) / 4, mag = Math.pow(10, Math.floor(Math.log10(rawStep))), step = [1, 2, 5, 10].map(m => m * mag).find(x => x >= rawStep * 0.999);
      const mx = Math.ceil(hi / step - 1e-9) * step, mn = Math.floor(lo / step + 1e-9) * step;
      const span = (mx - mn) || 1, y = v => T + ph - (v - mn) / span * ph, bw = pw / items.length;
      let s = `<svg viewBox="0 0 ${W0} ${H0}" font-family="Tahoma,Verdana,sans-serif" font-size="10">`;
      for (let v = mn; v <= mx + step / 2; v += step) { const yy = y(v); s += `<line x1="${L}" x2="${W0 - Rm}" y1="${yy}" y2="${yy}" stroke="#ddd"/><text x="${L - 4}" y="${yy + 3}" text-anchor="end" fill="#333">${E(show(+v.toPrecision(3)))}</text>`; }
      items.forEach((it, i) => {
        const x = L + i * bw + bw * 0.15, y0 = y(Math.max(0, it.v)), hh = Math.abs(y(it.v) - y(0));
        s += `<rect x="${x}" y="${y0}" width="${bw * 0.7}" height="${Math.max(hh, 0.5)}" fill="${PAL[i % PAL.length]}" stroke="#000" stroke-width=".5"/>`;
        s += `<text x="${x + bw * 0.35}" y="${y0 - 3}" text-anchor="middle" fill="#000">${E(show(+it.v.toPrecision(4)))}</text>`;
        s += `<text x="${x + bw * 0.35}" y="${H0 - B + 14}" text-anchor="middle" fill="#000">${E(it.l.slice(0, Math.max(3, Math.floor(bw / 6))))}</text>`;
      });
      s += `<line x1="${L}" x2="${W0 - Rm}" y1="${y(0)}" y2="${y(0)}" stroke="#000"/><line x1="${L}" x2="${L}" y1="${T}" y2="${T + ph}" stroke="#000"/></svg>`;
      return s;
    }
    function svgPie(items) {
      const pos = items.filter(i => i.v > 0), tot = pos.reduce((s, i) => s + i.v, 0);
      if (!tot) return '<div class="hs-empty">A pie chart needs numbers bigger than zero.</div>';
      const cx = 120, cy = 120, R = 100; let a0 = -Math.PI / 2;
      let s = `<svg viewBox="0 0 400 250" font-family="Tahoma,Verdana,sans-serif" font-size="11">`;
      pos.forEach((it, i) => {
        const frac = it.v / tot, a1 = a0 + frac * Math.PI * 2, col = PAL[items.indexOf(it) % PAL.length];
        if (frac >= 0.9999) s += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="${col}" stroke="#000" stroke-width=".6"/>`;
        else s += `<path d="M${cx} ${cy}L${cx + R * Math.cos(a0)} ${cy + R * Math.sin(a0)}A${R} ${R} 0 ${frac > 0.5 ? 1 : 0} 1 ${cx + R * Math.cos(a1)} ${cy + R * Math.sin(a1)}Z" fill="${col}" stroke="#000" stroke-width=".6"/>`;
        a0 = a1;
      });
      pos.slice(0, 12).forEach((it, i) => { const y = 20 + i * 18; s += `<rect x="240" y="${y - 9}" width="11" height="11" fill="${PAL[items.indexOf(it) % PAL.length]}" stroke="#000" stroke-width=".5"/><text x="256" y="${y}" fill="#000">${E(it.l.slice(0, 14))} ${Math.round(it.v / tot * 100)}%</text>`; });
      return s + '</svg>';
    }
    function openChart() {
      commit();
      if (era !== '2000') return;
      const items = chartData();
      if (!items) { api.msgBox('Chart', 'First select some cells with numbers (drag across them, or use Select range), then click Chart. Tip: include the labels next to the numbers.', ['OK'], 'info'); return; }
      let kind = 'bar';
      const b = document.createElement('div'); b.className = 'hs-chart';
      const draw = () => { b.innerHTML = `<p style="margin:0 0 6px">Chart of ${rngText(rng())}</p>` + (kind === 'bar' ? svgBar(items) : svgPie(items)); };
      draw();
      dialog('Chart Wizard', b, [['Bar', () => { kind = 'bar'; draw(); api.sfx.click(); }], ['Pie', () => { kind = 'pie'; draw(); api.sfx.click(); }], ['Close', closeOverlay, true]]);
      api.sfx.blip ? api.sfx.blip(660) : null;
    }

    /* ---------- 1985 slash menu ---------- */
    const SLASH = [
      { l: 'Copy', d: 'Copy the selected cells', fn: () => doCopy(false) },
      { l: 'Paste', d: 'Paste copied cells at the cursor', fn: doPaste },
      { l: 'Blank', d: 'Erase the selected cells', fn: clearCells },
      { l: 'Replicate', d: 'Fill down: copy the top cell down the selection (names shift)', fn: fillDown },
      { l: 'Undo', d: 'Take back the last change', fn: undo },
      { l: 'Format', d: 'Bold, money, percent, alignment', sub: [
        { l: 'Bold', d: 'Bright text on or off', fn: () => toggleFmt('b') },
        { l: 'Money', d: 'Show as dollars and cents: $1.50', fn: () => setNum('cur') },
        { l: 'Percent', d: 'Show 0.25 as 25%', fn: () => setNum('pct') },
        { l: 'General', d: 'Plain numbers', fn: () => setNum('gen') },
        { l: 'Left', d: 'Line up on the left', fn: () => setAlign('l') },
        { l: 'Center', d: 'Line up in the middle', fn: () => setAlign('c') },
        { l: 'Right', d: 'Line up on the right', fn: () => setAlign('r') }] },
      { l: 'Width', d: 'Change column width', sub: [
        { l: 'Wider', d: 'Two characters wider', fn: () => setWidth(2) },
        { l: 'Narrower', d: 'Two characters narrower', fn: () => setWidth(-2) },
        { l: 'Set', d: 'Type a width', fn: widthDlg }] },
      { l: 'Disk', d: 'New, Open, Save sheets', sub: [
        { l: 'Save', d: 'Save this sheet to disk', fn: fileSave },
        { l: 'Open', d: 'Load a saved sheet', fn: fileOpen },
        { l: 'New', d: 'Start a blank sheet', fn: fileNew },
        { l: 'Title', d: 'Save under a new name', fn: () => fileSaveAs() }] },
      { l: 'Template', d: 'Allowance budget, lemonade stand, bake sale', fn: fileTemplates },
      { l: 'Help', d: 'How formulas work', fn: openHelpDlg },
      { l: 'Quit', d: 'Leave Horizon Sheet', fn: () => api.close() }
    ];
    function openSlash() { if (!dos) return; commit(); slash = { items: SLASH, i: 0, stack: [] }; drawSlash(); api.sfx.click(); }
    function closeSlash() { slash = null; if (dos) status(); }
    function drawSlash() {
      if (!slash) return;
      l2.innerHTML = slash.items.map((it, i) => `<span class="hs-mi${i === slash.i ? ' on' : ''}" data-mi="${i}">${E(it.l)}</span>`).join('');
      const it = slash.items[slash.i];
      l3.textContent = it.sub ? it.sub.map(s => s.l).join('  ') + '   (' + it.d + ')' : it.d;
      modeEl.textContent = 'MENU';
    }
    function pickSlash(i) {
      const it = slash.items[i];
      if (it.sub) { slash.stack.push(slash.items); slash.items = it.sub; slash.i = 0; drawSlash(); return; }
      closeSlash(); it.fn();
    }
    if (dos) l2.addEventListener('click', e => { const m = e.target.closest('[data-mi]'); if (m && slash) pickSlash(+m.dataset.mi); });
    function slashKey(e) {
      const k = e.key;
      e.preventDefault();
      if (k === 'ArrowRight' || k === 'Tab') { slash.i = (slash.i + 1) % slash.items.length; drawSlash(); }
      else if (k === 'ArrowLeft') { slash.i = (slash.i + slash.items.length - 1) % slash.items.length; drawSlash(); }
      else if (k === 'Home') { slash.i = 0; drawSlash(); }
      else if (k === 'End') { slash.i = slash.items.length - 1; drawSlash(); }
      else if (k === 'Enter') pickSlash(slash.i);
      else if (k === 'Escape') { if (slash.stack.length) { slash.items = slash.stack.pop(); slash.i = 0; drawSlash(); } else closeSlash(); }
      else if (k.length === 1) { const i = slash.items.findIndex(it => it.l[0].toLowerCase() === k.toLowerCase()); if (i >= 0) pickSlash(i); else api.sfx.beep(); }
    }

    /* ---------- menubar ---------- */
    const menus = [
      { label: 'File', items: [{ label: 'New', fn: fileNew }, { label: 'Open...', fn: fileOpen }, { label: 'Templates...', fn: fileTemplates }, '-', { label: 'Save', fn: fileSave }, { label: 'Save As...', fn: () => fileSaveAs() }, '-', { label: 'Exit', fn: () => api.close() }] },
      { label: 'Edit', items: () => [{ label: 'Undo', fn: undo, disabled: !undoStack.length }, '-', { label: 'Cut', fn: () => doCopy(true) }, { label: 'Copy', fn: () => doCopy(false) }, { label: 'Paste', fn: doPaste, disabled: !clip }, { label: 'Clear', fn: clearCells }, '-', { label: 'Fill Down', fn: fillDown }, { label: 'AutoSum', fn: autoSum }, { label: 'Select All', fn: () => { sel = { ac: 0, ar: 0, cc: COLS - 1, cr: ROWS - 1 }; renderSel(); } }] },
      { label: 'Format', items: [{ label: 'Bold', fn: () => toggleFmt('b') }, '-', { label: 'Currency ($)', fn: () => setNum('cur') }, { label: 'Percent (%)', fn: () => setNum('pct') }, { label: 'General', fn: () => setNum('gen') }, '-', { label: 'Align Left', fn: () => setAlign('l') }, { label: 'Align Center', fn: () => setAlign('c') }, { label: 'Align Right', fn: () => setAlign('r') }, '-', { label: 'Wider Column', fn: () => setWidth(2) }, { label: 'Narrower Column', fn: () => setWidth(-2) }, { label: 'Column Width...', fn: widthDlg }] }
    ];
    if (era === '2000') menus.push({ label: 'Insert', items: [{ label: 'Chart...', fn: openChart }, { label: 'SUM Function', fn: autoSum }] });
    menus.push({ label: 'Help', items: [{ label: 'How Formulas Work', fn: openHelpDlg }, { label: 'About Horizon Sheet', fn: about }] });
    api.menubar(menus);

    /* ---------- pointer input ---------- */
    const hit = e => { const el = document.elementFromPoint(e.clientX, e.clientY); return el && el.closest ? el.closest('td[data-c]') : null; };
    function cellClick(td, extend) {
      const c = +td.dataset.c, r = +td.dataset.r;
      if (editing && pointable()) { insertAtCaret(A(c, r)); return 'point'; }
      const same = c === sel.cc && r === sel.cr && !extend;
      if (editing) commit();
      if (slash) closeSlash();
      if (rangeMode) { select(c, r, true); rangeMode = false; syncRange(); return; }
      select(c, r, extend);
      if (same && touch) { inpIntent = 'edit'; startEdit(null, 'edit'); }
    }
    let drag = false, touchStart = null;
    wrap.addEventListener('mousedown', e => { if (e.target.closest('td,th')) e.preventDefault(); });
    wrap.addEventListener('pointerdown', e => {
      if (e.target.closest('[data-rz]')) return;
      const th = e.target.closest('th');
      if (e.pointerType !== 'mouse') { touchStart = { x: e.clientX, y: e.clientY }; return; }
      if (e.button !== 0) return;
      if (th) { headerClick(th, e.shiftKey); if (!editing) focusGrid(); return; }
      const td = e.target.closest('td[data-c]'); if (!td) return;
      const res = cellClick(td, e.shiftKey);
      if (res !== 'point') { drag = true; if (!editing) focusGrid(); }
    });
    wrap.addEventListener('pointermove', e => {
      if (!drag || e.pointerType !== 'mouse') return;
      const td = hit(e); if (td && (+td.dataset.c !== sel.cc || +td.dataset.r !== sel.cr)) select(+td.dataset.c, +td.dataset.r, true);
    });
    window.addEventListener('pointerup', onUp);
    function onUp(e) {
      drag = false;
      if (e.pointerType === 'mouse' || !touchStart) return;
      const moved = Math.hypot(e.clientX - touchStart.x, e.clientY - touchStart.y); touchStart = null;
      if (moved > 10 || !root.contains(e.target)) return;
      const th = e.target.closest('th'); if (th && wrap.contains(th)) { headerClick(th, rangeMode); return; }
      const td = e.target.closest('td[data-c]'); if (td && wrap.contains(td)) cellClick(td, false);
    }
    wrap.addEventListener('pointercancel', () => { touchStart = null; });
    wrap.addEventListener('dblclick', e => { const td = e.target.closest('td[data-c]'); if (td && !editing) { inpIntent = 'edit'; startEdit(null, 'edit'); } });
    function headerClick(th, extend) {
      commit();
      if (th.dataset.all) { sel = { ac: 0, ar: 0, cc: COLS - 1, cr: ROWS - 1 }; renderSel(); return; }
      if (th.dataset.col !== undefined) { const c = +th.dataset.col; sel = extend ? { ac: sel.ac, ar: 0, cc: c, cr: ROWS - 1 } : { ac: c, ar: 0, cc: c, cr: ROWS - 1 }; }
      else if (th.dataset.row !== undefined) { const r = +th.dataset.row; sel = extend ? { ac: 0, ar: sel.ar, cc: COLS - 1, cr: r } : { ac: 0, ar: r, cc: COLS - 1, cr: r }; }
      renderSel();
    }
    // column resize by dragging the header edge (1990+)
    thead.addEventListener('pointerdown', e => {
      const g = e.target.closest('[data-rz]'); if (!g) return;
      e.preventDefault(); e.stopPropagation();
      const c = +g.dataset.rz, sx = e.clientX, w0 = colPx(c);
      snapshot();
      g.setPointerCapture(e.pointerId);
      const mv = ev => { const px = Math.max(24, w0 + ev.clientX - sx); doc.w[c] = Math.max(3, Math.min(40, Math.round((px - 10) / 7))); layoutCols(); };
      const up = () => { g.removeEventListener('pointermove', mv); g.removeEventListener('pointerup', up); if (doc.w[c] === DEFW) delete doc.w[c]; changed(); };
      g.addEventListener('pointermove', mv); g.addEventListener('pointerup', up);
    });

    // formula bar buttons keep the input focused
    root.querySelectorAll('.hs-keep').forEach(b => { b.addEventListener('pointerdown', e => e.preventDefault()); b.addEventListener('mousedown', e => e.preventDefault()); });
    root.querySelectorAll('.hs-kb').forEach(b => b.addEventListener('click', () => {
      const k = b.dataset.k;
      if (k === 'eq') eqKey(); else if (k === 'sum') autoSum();
      else if (k === 'ok') { if (editing) move(0, 1); else move(0, 1); }
    }));
    const tbar = $('.hs-tbar');
    if (tbar) tbar.addEventListener('click', e => { const b = e.target.closest('[data-tb]'); if (!b) return; const t = TB.find(x => x !== '|' && x[1] === b.dataset.tb); api.sfx.click(); t && t[2](); if (!editing && !overlay && !touch) focusGrid(); });
    function syncRange() { const b = root.querySelector('[data-t="range"]'); if (b) b.classList.toggle('on', rangeMode); status(); }
    const tr = $('.hs-touch');
    if (tr) {
      tr.querySelectorAll('.hs-keep').forEach(b => b.addEventListener('mousedown', e => e.preventDefault()));
      tr.addEventListener('click', e => {
        const b = e.target.closest('[data-t]'); if (!b) return;
        const k = b.dataset.t;
        if (k === 'range') { commit(); rangeMode = !rangeMode; syncRange(); }
        else if (k === 'copy') doCopy(false); else if (k === 'paste') doPaste(); else if (k === 'fill') fillDown(); else if (k === 'undo') undo(); else if (k === 'chart') openChart();
        else if (k === 'menu') { if (slash) closeSlash(); else openSlash(); }
      });
    }

    /* ---------- keyboard ---------- */
    W.onKey = e => {
      const k = e.key, ctrl = e.ctrlKey || e.metaKey;
      if (overlay) {
        if (k === 'Escape') { e.preventDefault(); closeOverlay(); }
        else if (k === 'Enter' && overlay.def && !e.target.closest('input,button,.hs-li')) { e.preventDefault(); overlay.def(); }
        return;
      }
      if (e.target && e.target.closest && e.target.closest('.menu')) return;
      if (slash) { slashKey(e); return; }
      if (k === 'F1') { e.preventDefault(); openHelpDlg(); return; }
      if (editing) {
        if (k === 'Enter') { e.preventDefault(); move(0, e.shiftKey ? -1 : 1); }
        else if (k === 'Tab') { e.preventDefault(); move(e.shiftKey ? -1 : 1, 0); }
        else if (k === 'Escape') { e.preventDefault(); cancelEdit(); }
        else if (editMode === 'enter' && !pointable() && /^Arrow/.test(k)) { e.preventDefault(); move(k === 'ArrowLeft' ? -1 : k === 'ArrowRight' ? 1 : 0, k === 'ArrowUp' ? -1 : k === 'ArrowDown' ? 1 : 0); }
        else if (k === 'F2') { e.preventDefault(); editMode = editMode === 'edit' ? 'enter' : 'edit'; status(); }
        return;
      }
      if (ctrl) {
        const kk = k.toLowerCase();
        const map = { z: undo, c: () => doCopy(false), x: () => doCopy(true), v: doPaste, d: fillDown, b: () => toggleFmt('b'), s: fileSave, o: fileOpen, a: () => { sel = { ac: 0, ar: 0, cc: COLS - 1, cr: ROWS - 1 }; renderSel(); } };
        if (e.target === inp && (kk === 'c' || kk === 'x' || kk === 'v' || kk === 'a')) return;
        if (map[kk]) { e.preventDefault(); map[kk](); }
        return;
      }
      const ext = e.shiftKey;
      const nav = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], PageUp: [0, -15], PageDown: [0, 15] };
      if (nav[k]) { e.preventDefault(); const [dc, dr] = nav[k]; select(sel.cc + dc, sel.cr + dr, ext); return; }
      if (k === 'Home') { e.preventDefault(); select(0, ext ? sel.cr : 0, ext); return; }
      if (k === 'Enter') { e.preventDefault(); select(sel.cc, sel.cr + (e.shiftKey ? -1 : 1)); return; }
      if (k === 'Tab') { e.preventDefault(); select(sel.cc + (e.shiftKey ? -1 : 1), sel.cr); return; }
      if (k === 'F2') { e.preventDefault(); startEdit(null, 'edit'); return; }
      if (k === 'Delete' || k === 'Backspace') { if (e.target === inp) return; e.preventDefault(); clearCells(); return; }
      if (k === 'Escape') { e.preventDefault(); if (rangeMode) { rangeMode = false; syncRange(); } else if (clip) { clip = null; status(); } else if (dos) api.close(); return; }
      if (dos && k === '/') { e.preventDefault(); openSlash(); return; }
      if (k.length === 1 && !e.altKey) {
        if (e.target === inp) return;
        e.preventDefault(); inpIntent = 'enter'; startEdit(k, 'enter');
      }
    };

    W.onClose = () => { commit(); saveWork(); window.removeEventListener('pointerup', onUp); };
    W.onResize = () => ensureVisible(sel.cc, sel.cr);

    layoutCols(); recalc(); title();
    if (!touch) setTimeout(focusGrid, 50);
    if (!Object.keys(doc.cells).length) flash(dos ? 'Type a number, words, or =formula.  Press / for commands.' : 'Ready. Tip: File, Templates has ready-made sheets.');
  }

  (window.RETRO_APPS = window.RETRO_APPS || []).push({
    id: 'sheet',
    label: 'Horizon Sheet',
    help: 'A spreadsheet: type numbers and formulas like =SUM(A1:A5) into a grid, try the budget and lemonade templates, and save your sheets.',
    kind: 'builtin',
    eras: ['1985', '1990', '1995', '2000'],
    cmd: 'SHEET',
    cat: 'acc',
    icon: ICON,
    window: { w: 720, h: 500 },
    css: CSS,
    open
  });
})();
