/* Horizon BASIC: a GW-BASIC style interpreter for the 1985 computer.
   80-column (40 on narrow screens) color text mode drawn on a canvas, immediate mode plus numbered program lines.
   Programs run in time slices (a limited number of statements per animation frame), so an endless loop can
   always be stopped with Esc, Ctrl+C or the BREAK button and never freezes the page. */
(function () {
  'use strict';

  /* ================= character set and colors ================= */
  const CGA = ['#000000', '#0000aa', '#00aa00', '#00aaaa', '#aa0000', '#aa00aa', '#aa5500', '#aaaaaa', '#555555', '#5555ff', '#55ff55', '#55ffff', '#ff5555', '#ff55ff', '#ffff55', '#ffffff'];
  const CP_LO = ' ☺☻♥♦♣♠•◘○◙♂♀♪♫☼►◄↕‼¶§▬↨↑↓→←∟↔▲▼';
  const CP_HI = 'ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥₧ƒáíóúñÑªº¿⌐¬½¼¡«»░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀αßΓπΣσµτΦΘΩδ∞φε∩≡±≥≤⌠⌡÷≈°∙·√ⁿ²■ ';
  const chrOf = n => n >= 32 && n < 127 ? String.fromCharCode(n) : n === 127 ? '⌂' : n >= 128 ? CP_HI[n - 128] : String.fromCharCode(n);
  function ascOf(c) {
    const n = c.charCodeAt(0);
    if (n < 128) return n;
    if (c === '⌂') return 127;
    const i = CP_HI.indexOf(c); if (i >= 0) return 128 + i;
    const j = CP_LO.indexOf(c); if (j > 0) return j;
    return 63;
  }
  const BOXC = {
    '─': [0, 1, 0, 1], '│': [1, 0, 1, 0], '┌': [0, 1, 1, 0], '┐': [0, 0, 1, 1], '└': [1, 1, 0, 0], '┘': [1, 0, 0, 1],
    '├': [1, 1, 1, 0], '┤': [1, 0, 1, 1], '┬': [0, 1, 1, 1], '┴': [1, 1, 0, 1], '┼': [1, 1, 1, 1],
    '═': [0, 2, 0, 2], '║': [2, 0, 2, 0], '╔': [0, 2, 2, 0], '╗': [0, 0, 2, 2], '╚': [2, 2, 0, 0], '╝': [2, 0, 0, 2],
    '╠': [2, 2, 2, 0], '╣': [2, 0, 2, 2], '╦': [0, 2, 2, 2], '╩': [2, 2, 0, 2], '╬': [2, 2, 2, 2]
  };
  const coarse = () => !!(window.matchMedia && matchMedia('(pointer:coarse)').matches);

  /* ================= errors ================= */
  const MSG = {
    SN: 'Syntax error', UL: 'Undefined line number', NF: 'NEXT without FOR', FN: 'FOR without NEXT', RG: 'RETURN without GOSUB',
    WE: 'WEND without WHILE', WW: 'WHILE without WEND', TM: 'Type mismatch', DZ: 'Division by zero', SR: 'Subscript out of range',
    FC: 'Illegal function call', OD: 'Out of DATA', OV: 'Overflow', DD: 'Duplicate Definition', CN: 'Can\'t continue',
    OM: 'Out of memory', FF: 'File not found', BN: 'Bad file name', DF: 'Disk full', ID: 'Illegal direct', LS: 'String too long'
  };
  const HINT = {
    SN: 'BASIC didn\'t understand that. Check the spelling, the "quotes" and the (brackets).',
    UL: 'There is no line with that number. Type LIST to see your line numbers.',
    NF: 'Every NEXT needs a FOR before it, like FOR I = 1 TO 10 ... NEXT I.',
    FN: 'This FOR loop has no NEXT. Add a NEXT where the loop should end.',
    RG: 'RETURN only works after a GOSUB. Put END before your subroutines.',
    WE: 'Every WEND needs a WHILE before it.',
    WW: 'This WHILE has no WEND. Add WEND where the loop should end.',
    TM: 'You mixed words and numbers. Word variables end in $, like NAME$, and words go in "quotes".',
    DZ: 'You can\'t divide by zero! Check the number after the / sign.',
    SR: 'That list number is too big. Use DIM to make the list bigger, like DIM A(100).',
    FC: 'A number here is out of range. For example, COLOR takes 0 to 15.',
    OD: 'READ ran out of DATA. Add more DATA, or use RESTORE to start again.',
    OV: 'That number is too big for BASIC.',
    DD: 'This list was already made. Use DIM once, near the start of the program.',
    CN: 'There is nothing to continue. Type RUN to start from the top.',
    OM: 'Too many GOSUBs or FORs that never finished with RETURN or NEXT.',
    FF: 'No program has that name. Type FILES to see yours, or EXAMPLES for samples.',
    BN: 'Names are 1 to 8 letters or numbers in quotes, like SAVE "GAME1".',
    DF: 'The disk holds 20 programs. Delete one first with KILL "NAME".',
    ID: 'That command only works when you type it, not inside a program.',
    LS: 'That text is too long. 255 letters is the most.'
  };
  function BErr(code, hint) { this.code = code; this.hint = hint; }
  const fail = (code, hint) => { throw new BErr(code, hint); };

  /* ================= values ================= */
  const num = v => { if (typeof v !== 'number') fail('TM'); return v; };
  const str = v => { if (typeof v !== 'string') fail('TM'); return v; };
  const ival = v => { v = Math.round(num(v)); if (v < -32768 || v > 65535) fail('OV'); return v; };
  const NUMRE = /^[+-]?(\d+\.?\d*|\.\d+)(E[+-]?\d+)?$/i;
  function expFmt(v) {
    let [m, e] = v.toExponential(6).split('e');
    if (m.includes('.')) m = m.replace(/\.?0+$/, '');
    const n = +e; return m + 'E' + (n < 0 ? '-' : '+') + String(Math.abs(n)).padStart(2, '0');
  }
  function fmt(v) {
    if (!isFinite(v)) fail('OV');
    if (Object.is(v, -0)) v = 0;
    if (Number.isInteger(v) && Math.abs(v) < 1e15) return String(v);
    const a = Math.abs(v);
    let s;
    if (a >= 1e15 || a < 1e-7) s = expFmt(v);
    else {
      s = v.toPrecision(7);
      if (s.includes('e')) s = expFmt(v);
      else if (s.includes('.')) s = s.replace(/\.?0+$/, '');
    }
    return s.replace(/^(-?)0\./, '$1.');
  }
  const numOut = v => (v < 0 ? '' : ' ') + fmt(v) + ' ';
  function seeded(x) {
    let t = (Math.floor(Math.abs(x) * 1000) ^ 0x9e3779b9) >>> 0;
    return () => { t = (t + 0x6D2B79F5) >>> 0; let r = Math.imul(t ^ t >>> 15, 1 | t); r ^= r + Math.imul(r ^ r >>> 7, 61 | r); return ((r ^ r >>> 14) >>> 0) / 4294967296; };
  }
  function splitData(raw) {
    const out = []; let i = 0; const n = raw.length;
    for (;;) {
      while (raw[i] === ' ') i++;
      let item;
      if (raw[i] === '"') { let j = raw.indexOf('"', i + 1); if (j < 0) j = n; item = raw.slice(i + 1, j); i = j + 1; while (i < n && raw[i] !== ',') i++; }
      else { let j = raw.indexOf(',', i); if (j < 0) j = n; item = raw.slice(i, j).trim(); i = j; }
      out.push(item);
      if (i >= n) break;
      i++;
    }
    return out;
  }

  /* ================= tokenizer ================= */
  const KW = new Set(('PRINT LET DIM IF THEN ELSE GOTO GOSUB RETURN FOR TO STEP NEXT WHILE WEND END STOP CLS COLOR LOCATE BEEP SOUND ' +
    'RANDOMIZE DATA READ RESTORE ON INPUT LINE SLEEP SWAP CLEAR AND OR NOT XOR MOD KEY SCREEN ' +
    'RUN LIST NEW DELETE RENUM SAVE LOAD FILES KILL EXAMPLES HELP CONT SYSTEM EXIT EDIT WIDTH').split(' '));
  const GLUED = /^(GOTO|GOSUB|THEN|ELSE|RUN|LIST|RESTORE|RETURN|DELETE|EDIT)(\d+)$/;
  function tokenize(src) {
    const T = []; let i = 0; const n = src.length;
    while (i < n) {
      const c = src[i];
      if (c === ' ' || c === '\t') { i++; continue; }
      if (c === '"') { let j = src.indexOf('"', i + 1); if (j < 0) j = n; T.push({ t: 's', v: src.slice(i + 1, j) }); i = j + 1; continue; }
      if (/[0-9.]/.test(c)) {
        const m = /^(\d*\.?\d*)(E[+-]?\d+)?[!#%]?/i.exec(src.slice(i));
        if (!m[1] || m[1] === '.') fail('SN');
        T.push({ t: 'n', v: parseFloat(m[1] + (m[2] || '')) }); i += m[0].length; continue;
      }
      if (c === '&' && /[Hh]/.test(src[i + 1] || '')) {
        const m = /^&H([0-9A-F]+)/i.exec(src.slice(i)); if (!m) fail('SN');
        T.push({ t: 'n', v: parseInt(m[1], 16) }); i += m[0].length; continue;
      }
      if (/[A-Za-z]/.test(c)) {
        const m = /^[A-Za-z][A-Za-z0-9.]*[$%!#]?/.exec(src.slice(i)); const w = m[0].toUpperCase();
        if (w.startsWith('REM')) { T.push({ t: 'k', v: 'REM' }); i = n; break; }
        i += m[0].length;
        if (w === 'DATA') {
          let j = i, q = false; while (j < n && (q || src[j] !== ':')) { if (src[j] === '"') q = !q; j++; }
          T.push({ t: 'k', v: 'DATA' }, { t: 'r', v: src.slice(i, j) }); i = j; continue;
        }
        const g = GLUED.exec(w);
        if (g) { T.push({ t: 'k', v: g[1] }, { t: 'n', v: +g[2] }); continue; }
        T.push({ t: KW.has(w) ? 'k' : 'i', v: w }); continue;
      }
      if (c === "'") { T.push({ t: 'k', v: 'REM' }); break; }
      if (c === '?') { T.push({ t: 'k', v: 'PRINT' }); i++; continue; }
      const two = src.slice(i, i + 2);
      if (['<=', '>=', '<>', '=<', '=>', '><'].includes(two)) { T.push({ t: 'o', v: two }); i += 2; continue; }
      if ('+-*/^\\=<>(),;:#'.includes(c)) { T.push({ t: 'o', v: c }); i++; continue; }
      fail('SN', `BASIC doesn't use the ${c} sign here.`);
    }
    T.push({ t: 'e' });
    return T;
  }
  // Upper-case a typed line, but keep "strings", REM remarks and DATA as typed.
  function normalize(s) {
    let out = '', q = false;
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (c === '"') { q = !q; out += c; continue; }
      if (q) { out += c; continue; }
      if (c === "'") return out + s.slice(i);
      if (/[A-Za-z]/.test(c) && !/[A-Za-z0-9.$]/.test(s[i - 1] || '')) {
        const w = /^[A-Za-z]+/.exec(s.slice(i))[0].toUpperCase();
        if (w.startsWith('REM')) return out + 'REM' + s.slice(i + 3);
        if (w === 'DATA') return out + 'DATA' + s.slice(i + 4);
      }
      out += c.toUpperCase();
    }
    return out;
  }
  const SUGGEST = 'PRINT INPUT GOTO GOSUB RETURN FOR NEXT WHILE WEND COLOR LOCATE SOUND BEEP LIST RUN SAVE LOAD FILES EXAMPLES HELP RENUM DELETE RANDOMIZE CLS END STOP DIM READ DATA RESTORE SLEEP SYSTEM NEW EDIT CONT KILL WIDTH THEN ELSE'.split(' ');
  function lev(a, b) {
    const d = []; for (let i = 0; i <= a.length; i++) { d[i] = [i]; for (let j = 1; j <= b.length; j++) d[i][j] = i ? Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)) : j; }
    return d[a.length][b.length];
  }
  function unknownHint(w) {
    let best = null, bd = 3;
    SUGGEST.forEach(k => { const d = lev(w, k); if (d < bd) { bd = d; best = k; } });
    if (best && (bd <= 1 || (bd === 2 && w.length > 4))) return `BASIC doesn't know the word ${w}. Did you mean ${best}?`;
    return `BASIC doesn't know the word ${w}. To show words on the screen, use PRINT, like PRINT "${w}".`;
  }

  /* ================= sample programs ================= */
  const EXAMPLES = [
    ['GUESS', 'Guess my secret number', `10 REM GUESS MY NUMBER
20 RANDOMIZE TIMER
30 CLS : COLOR 14
40 PRINT "*** GUESS MY NUMBER ***"
50 COLOR 7 : PRINT
60 PRINT "I'M THINKING OF A NUMBER"
70 PRINT "FROM 1 TO 100. CAN YOU GUESS IT?"
80 N = INT(RND * 100) + 1 : T = 0
90 PRINT
100 INPUT "YOUR GUESS"; G
110 T = T + 1
120 IF G < N THEN COLOR 11 : PRINT "TOO LOW! GO HIGHER." : SOUND 220, 3 : COLOR 7 : GOTO 100
130 IF G > N THEN COLOR 13 : PRINT "TOO HIGH! GO LOWER." : SOUND 180, 3 : COLOR 7 : GOTO 100
140 COLOR 10 : PRINT "YOU GOT IT IN"; T; "TRIES!"
150 SOUND 523, 3 : SOUND 659, 3 : SOUND 784, 6
160 IF T <= 7 THEN PRINT "WOW, THAT WAS FAST!"
170 COLOR 7 : PRINT
180 INPUT "PLAY AGAIN (Y/N)"; A$
190 IF UCASE$(LEFT$(A$, 1)) = "Y" THEN GOTO 30
200 PRINT "THANKS FOR PLAYING!"
210 END`],
    ['SPIRAL', 'A spiral of colored blocks', `10 REM COLOR SPIRAL
20 WIDTH 40 : KEY OFF : CLS
30 T = 1 : L = 1 : B = 22 : R = 40 : C = 0
40 WHILE T <= B AND L <= R
50 GOSUB 300 : FOR X = L TO R : Y = T : GOSUB 200 : NEXT X
60 T = T + 1
70 GOSUB 300 : FOR Y = T TO B : X = R : GOSUB 200 : NEXT Y
80 R = R - 1
90 GOSUB 300 : FOR X = R TO L STEP -1 : Y = B : GOSUB 200 : NEXT X
100 B = B - 1
110 GOSUB 300 : FOR Y = B TO T STEP -1 : X = L : GOSUB 200 : NEXT Y
120 L = L + 1
130 WEND
140 COLOR 15, 1 : LOCATE 12, 15 : PRINT " SPIRAL! "
150 COLOR 7, 0 : LOCATE 23, 1 : KEY ON : SOUND 523, 4 : SOUND 784, 8
160 END
200 REM DRAW ONE BLOCK, THEN WAIT A MOMENT
210 LOCATE Y, X : PRINT CHR$(219);
220 FOR D = 1 TO 60 : NEXT D
230 RETURN
300 REM NEXT COLOR (SKIP BLACK) AND A LITTLE BLIP
310 C = C + 1 : IF C > 15 THEN C = 1
320 COLOR C : SOUND 300 + C * 40, 1
330 RETURN`],
    ['TIMES', 'Times-table quiz', `10 REM TIMES TABLE QUIZ
20 RANDOMIZE TIMER
30 CLS : COLOR 11 : PRINT "*** TIMES TABLE QUIZ ***" : COLOR 7
40 PRINT
50 INPUT "WHICH TABLE (2 TO 12)"; T
60 IF T < 2 OR T > 12 THEN PRINT "PICK 2 TO 12, PLEASE." : GOTO 50
70 S = 0
80 FOR Q = 1 TO 5
90 N = INT(RND * 12) + 1
100 PRINT : PRINT "QUESTION"; Q; "OF 5"
110 PRINT "WHAT IS"; T; "X"; N;
120 INPUT A
130 IF A = T * N THEN COLOR 10 : PRINT "RIGHT! GREAT JOB!" : S = S + 1 : SOUND 880, 2 ELSE COLOR 12 : PRINT "NOT QUITE."; T; "X"; N; "="; T * N : SOUND 150, 4
140 COLOR 7
150 NEXT Q
160 PRINT : PRINT "YOU GOT"; S; "OUT OF 5 RIGHT."
170 IF S = 5 THEN COLOR 14 : PRINT "PERFECT! YOU ARE A MATH STAR!" : COLOR 7
180 IF S < 5 THEN PRINT "PRACTICE MAKES PERFECT. RUN IT AGAIN!"
190 END`],
    ['STORY', 'Silly story maker', `10 REM SILLY STORY MAKER
20 CLS : COLOR 13 : PRINT "*** SILLY STORY MAKER ***"
30 COLOR 7 : PRINT "ANSWER MY QUESTIONS, THEN READ"
40 PRINT "THE STORY WE MADE TOGETHER!" : PRINT
50 INPUT "A FRIEND'S NAME"; N$
60 INPUT "AN ANIMAL"; A$
70 INPUT "A FOOD"; F$
80 INPUT "A PLACE"; P$
90 INPUT "A COLOR"; C$
100 INPUT "A SILLY SOUND"; S$
110 INPUT "A NUMBER"; X
120 CLS : COLOR 14 : PRINT "THE AMAZING DAY" : COLOR 7 : PRINT
130 PRINT "ONE MORNING, "; N$; " WENT TO "; P$
140 PRINT "AND MET A "; C$; " "; A$; "."
150 PRINT "THE "; A$; " SAID "; CHR$(34); S$; "! "; S$; "!"; CHR$(34)
160 PRINT "THEN IT ATE"; X; "BOWLS OF "; F$; "!"
170 PRINT N$; " LAUGHED SO HARD THAT"
180 PRINT "EVERYONE IN "; P$; " SAID "; CHR$(34); S$; "!"; CHR$(34)
190 PRINT : COLOR 11 : PRINT "THE END." : COLOR 7
200 SOUND 392, 2 : SOUND 523, 4
210 END`],
    ['MUSIC', 'Music box: play 3 songs', `10 REM MUSIC BOX
20 CLS : COLOR 11 : PRINT "*** HORIZON MUSIC BOX ***" : COLOR 7
30 PRINT : PRINT "1  TWINKLE TWINKLE LITTLE STAR"
40 PRINT "2  ODE TO JOY"
50 PRINT "3  MARY HAD A LITTLE LAMB"
60 PRINT : INPUT "PICK A SONG (1-3)"; K
70 IF K < 1 OR K > 3 THEN GOTO 60
80 ON K GOSUB 300, 310, 320
90 PRINT
100 READ F, D
110 IF F = 0 THEN GOTO 150
120 COLOR 9 + (F MOD 7) : PRINT CHR$(14); " ";
130 SOUND F, D
140 GOTO 100
150 COLOR 7 : PRINT : PRINT : PRINT "THE END! RUN ME AGAIN FOR ANOTHER SONG."
160 END
300 RESTORE 1000 : RETURN
310 RESTORE 2000 : RETURN
320 RESTORE 3000 : RETURN
1000 REM TWINKLE TWINKLE LITTLE STAR (FREQUENCY, LENGTH)
1010 DATA 262,5,262,5,392,5,392,5,440,5,440,5,392,10
1020 DATA 349,5,349,5,330,5,330,5,294,5,294,5,262,10
1030 DATA 0,0
2000 REM ODE TO JOY
2010 DATA 330,5,330,5,349,5,392,5,392,5,349,5,330,5,294,5
2020 DATA 262,5,262,5,294,5,330,5,330,7,294,3,294,10
2030 DATA 0,0
3000 REM MARY HAD A LITTLE LAMB
3010 DATA 330,5,294,5,262,5,294,5,330,5,330,5,330,10
3020 DATA 294,5,294,5,294,10,330,5,392,5,392,10
3030 DATA 0,0`],
    ['DICE', 'Dice duel against me', `10 REM DICE DUEL
20 RANDOMIZE TIMER
30 CLS : COLOR 14 : PRINT "*** DICE DUEL ***" : COLOR 7
40 PRINT "5 ROUNDS. THE HIGHEST ROLL WINS."
50 Y = 0 : C = 0
60 FOR R = 1 TO 5
70 PRINT : COLOR 11 : PRINT "ROUND"; R : COLOR 7
80 INPUT "PRESS ENTER TO ROLL YOUR DICE"; K$
90 GOSUB 500 : A = D1 : B = D2
100 PRINT "YOU ROLLED"; A; "AND"; B; "="; A + B
110 GOSUB 500 : D = D1 : E = D2
120 PRINT "I ROLLED"; D; "AND"; E; "="; D + E
130 IF A + B > D + E THEN COLOR 10 : PRINT "YOU WIN THIS ROUND!" : Y = Y + 1 : SOUND 660, 2 : SOUND 880, 3
140 IF A + B < D + E THEN COLOR 12 : PRINT "I WIN THIS ROUND!" : C = C + 1 : SOUND 200, 4
150 IF A + B = D + E THEN COLOR 14 : PRINT "IT'S A TIE!"
160 COLOR 7
170 NEXT R
180 PRINT : PRINT "FINAL SCORE: YOU"; Y; " ME"; C
190 IF Y > C THEN COLOR 10 : PRINT "YOU ARE THE DICE CHAMPION!" ELSE IF Y < C THEN COLOR 12 : PRINT "I WIN! RUN ME FOR A REMATCH!" ELSE PRINT "A DRAW! WELL PLAYED."
200 COLOR 7 : END
500 REM ROLL TWO DICE WITH A LITTLE ANIMATION
510 W = CSRLIN
520 FOR I = 1 TO 8
530 D1 = INT(RND * 6) + 1 : D2 = INT(RND * 6) + 1
540 LOCATE W, 1 : PRINT "  ["; D1; "]   ["; D2; "]  ";
550 SOUND 300 + I * 60, 1
560 NEXT I
570 LOCATE W, 1 : PRINT SPACE$(20); : LOCATE W, 1
580 RETURN`],
    ['HELLO', 'Say hello in 15 colors', `10 REM HELLO IN COLORS
20 CLS
30 INPUT "WHAT IS YOUR NAME"; N$
40 FOR C = 1 TO 15
50 COLOR C : PRINT TAB(C); "HELLO, "; N$; "!"
60 SOUND 200 + C * 50, 1
70 NEXT C
80 COLOR 7`]
  ];
  const exampleLines = name => {
    const e = EXAMPLES.find(x => x[0] === name); if (!e) return null;
    return e[2].split('\n').map(l => { const m = /^(\d+) (.*)$/.exec(l); return [+m[1], normalize(m[2])]; });
  };

  /* ================= help pages (each line fits 40 columns) ================= */
  const HELP = [null, [
    ['HORIZON BASIC COMMANDS', null, 11],
    ['RUN          start your program'], ['LIST         show your program'], ['LIST 10-50   show some lines'],
    ['NEW          erase the program'], ['EDIT 20      change line 20'], ['DELETE 20    remove line 20'],
    ['RENUM        number lines 10, 20, 30'], ['SAVE "NAME"  save to disk'], ['LOAD "NAME"  load from disk'],
    ['FILES        list your saved programs', 'FILES'], ['KILL "NAME"  delete a saved program'],
    ['EXAMPLES     sample programs to try', 'EXAMPLES'], ['CONT         keep going after a BREAK'],
    ['CLS          clear the screen'], ['SYSTEM       leave BASIC'],
    ['Esc or Ctrl+C stops a program.', null, 14],
    ['More: HELP 2  statements', 'HELP 2'], ['      HELP 3  functions and math', 'HELP 3'], ['      HELP 4  your first program', 'HELP 4']
  ], [
    ['STATEMENTS (the words in a program)', null, 11],
    ['PRINT "HI"; A    show words and numbers'], ['INPUT "NAME"; N$ ask a question'],
    ['LET A = 5        (the LET is optional)'], ['IF A > 5 THEN ... ELSE ...'],
    ['GOTO 100         jump to line 100'], ['GOSUB 500        run a subroutine,'], ['RETURN           ...then come back'],
    ['FOR I = 1 TO 10 STEP 2 ... NEXT I'], ['WHILE A < 10 ... WEND'], ['DIM A(20)        make a list'],
    ['COLOR 14, 1      colors 0 to 15'], ['LOCATE 5, 10     go to row, column'], ['SOUND 440, 9     pitch, length'],
    ['BEEP  CLS  SLEEP 1  END  STOP'], ['READ A  DATA 1,2,3  RESTORE'], ['RANDOMIZE TIMER  new random numbers'],
    ['REM or \'         a note to yourself'], ['Numbers: A, SCORE   Words: N$, NAME$', null, 14],
    ['More: HELP 3  functions and math', 'HELP 3']
  ], [
    ['FUNCTIONS AND MATH', null, 11],
    ['RND              random, 0 up to 1'], ['INT(X)           whole number part'],
    ['ABS SQR SIN COS TAN ATN LOG EXP SGN'], ['LEN(A$)          how many letters'],
    ['LEFT$(A$,2)      first 2 letters'], ['RIGHT$(A$,2)     last 2 letters'], ['MID$(A$,3,2)     2 letters from 3rd'],
    ['STR$(5) VAL("5") number <-> words'], ['CHR$(65) ASC("A") character codes'], ['INSTR(A$,"X")    find text'],
    ['UCASE$ LCASE$    change case'], ['INKEY$           key pressed, or ""'], ['TIMER            seconds since midnight'],
    ['TAB(10) SPC(3)   spacing in PRINT'], ['Math:    + - * / ^ MOD \\'], ['Compare: = <> < > <= >='], ['Logic:   AND OR NOT'],
    ['Roll a die:  INT(RND * 6) + 1', null, 14], ['More: HELP 4  your first program', 'HELP 4']
  ], [
    ['YOUR FIRST PROGRAM', null, 11],
    ['Lines that start with a number are'], ['saved as your program. Type these,'], ['pressing Enter after each one:'],
    ['  10 PRINT "WHAT IS YOUR NAME";', null, 15], ['  20 INPUT N$', null, 15], ['  30 PRINT "HELLO, "; N$', null, 15], ['  40 GOTO 30', null, 15],
    ['Now type RUN and press Enter. It says'], ['hello forever! Press Esc or BREAK to'], ['stop it. Type LIST to see it again.'],
    ['To fix a line, type it again with the'], ['same number. Type 40 alone to erase'], ['line 40. Lines with no number run at'],
    ['once. Try:  PRINT 2 + 2'], ['Save your work:  SAVE "HELLO"'], ['More ideas: EXAMPLES', 'EXAMPLES'], ['All commands: HELP', 'HELP']
  ]];

  const KEYS = [['1', 'HELP'], ['2', 'RUN'], ['3', 'LIST'], ['4', 'EXAMPLES'], ['5', 'CONT'], ['6', 'FILES'], ['7', 'SAVE'], ['8', 'CLS']];

  /* ================= text screen ================= */
  function Screen(host) {
    const cv = document.createElement('canvas'); cv.className = 'bas-cv'; host.appendChild(cv);
    const ctx = cv.getContext('2d');
    const S = { cols: 80, rows: 25, T: 24, row: 0, col: 0, fg: 7, bg: 0, force: 0, tap: null, keyOn: true, dirty: true, cv, onBell: null, keyHit: [] };
    let ch = [], fg = new Uint8Array(0), bg = new Uint8Array(0), tp = [];
    let cw = 8, chh = 16, dpr = 1, lastW = 0, lastH = 0;
    function alloc(cols) {
      const n = S.T * cols, nc = new Array(n).fill(' '), nf = new Uint8Array(n).fill(7), nb = new Uint8Array(n), nt = new Array(n).fill(null);
      if (ch.length) for (let y = 0; y < S.T; y++) for (let x = 0; x < Math.min(cols, S.cols); x++) { const a = y * S.cols + x, b = y * cols + x; nc[b] = ch[a]; nf[b] = fg[a]; nb[b] = bg[a]; nt[b] = tp[a]; }
      ch = nc; fg = nf; bg = nb; tp = nt; S.cols = cols; if (S.col > cols) S.col = cols;
    }
    S.fit = again => {
      const Wd = host.clientWidth, Ht = host.clientHeight; if (!Wd || !Ht) return false;
      if (!again && Wd === lastW && Ht === lastH && ch.length) return true;
      lastW = Wd; lastH = Ht;
      const cols = S.force || (Wd >= 620 ? 80 : 40);
      if (cols !== S.cols || !ch.length) alloc(cols);
      let a = Wd / cols, b = Ht / S.rows;
      if (b > a * 2.3) b = a * 2.3;
      if (b < a * 1.45) a = b / 1.45;
      cw = a; chh = b; dpr = window.devicePixelRatio || 1;
      cv.width = Math.round(cols * cw * dpr); cv.height = Math.round(S.rows * chh * dpr);
      cv.style.width = cols * cw + 'px'; cv.style.height = S.rows * chh + 'px';
      S.dirty = true; return true;
    };
    S.cls = () => { ch.fill(' '); fg.fill(S.fg); bg.fill(S.bg); tp.fill(null); S.row = 0; S.col = 0; S.dirty = true; };
    S.scroll = () => {
      const c = S.cols, n = ch.length;
      ch.splice(0, c); for (let i = 0; i < c; i++) ch.push(' ');
      tp.splice(0, c); for (let i = 0; i < c; i++) tp.push(null);
      fg.copyWithin(0, c); fg.fill(S.fg, n - c); bg.copyWithin(0, c); bg.fill(S.bg, n - c);
      S.dirty = true;
    };
    S.nl = () => { S.col = 0; S.row++; if (S.row >= S.T) { S.scroll(); S.row = S.T - 1; } };
    S.put = c => {
      if (S.col >= S.cols) S.nl();
      const i = S.row * S.cols + S.col; ch[i] = c; fg[i] = S.fg; bg[i] = S.bg; tp[i] = S.tap; S.col++; S.dirty = true;
    };
    S.out = s => {
      for (const c of String(s)) {
        const n = c.charCodeAt(0);
        if (n >= 32) S.put(c);
        else if (n === 13 || n === 10) S.nl();
        else if (n === 7) { if (S.onBell) S.onBell(); }
        else if (n === 9) { do S.put(' '); while (S.col % 8 && S.col < S.cols); }
        else if (n === 12) S.cls();
        else S.put(CP_LO[n] || ' ');
      }
    };
    S.line = (s, tap) => { S.tap = tap || null; S.out(s); S.tap = null; S.nl(); };
    const phos = () => (getComputedStyle(host).getPropertyValue('--phos') || '').trim() || '#33ff66';
    const color = f => f === 7 ? phos() : CGA[f];
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
    function glyph(c, x, y, col) {
      if (BOXC[c]) { drawBox(BOXC[c], x, y, col); return; }
      ctx.fillStyle = col;
      if (c === '█') ctx.fillRect(x, y, cw + 0.5, chh + 0.5);
      else if (c === '▀') ctx.fillRect(x, y, cw + 0.5, chh / 2);
      else if (c === '▄') ctx.fillRect(x, y + chh / 2, cw + 0.5, chh / 2 + 0.5);
      else if (c === '▌') ctx.fillRect(x, y, cw / 2, chh + 0.5);
      else if (c === '▐') ctx.fillRect(x + cw / 2, y, cw / 2 + 0.5, chh + 0.5);
      else if (c === '░' || c === '▒' || c === '▓') { ctx.globalAlpha = c === '░' ? 0.25 : c === '▒' ? 0.5 : 0.75; ctx.fillRect(x, y, cw + 0.5, chh + 0.5); ctx.globalAlpha = 1; }
      else ctx.fillText(c, x + cw / 2, y + chh * 0.54, cw * 1.02);
    }
    // ov: the line being typed { start, text, caret, show } drawn over the buffer.
    S.draw = ov => {
      if (!ch.length) return;
      const P = phos();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, S.cols * cw, S.rows * chh);
      ctx.font = `${Math.round(chh * 0.98)}px VT323,"Courier New",monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const n = S.T * S.cols, os = ov ? ov.start : -1, oe = ov ? ov.start + ov.text.length : -1;
      for (let i = 0; i < n; i++) {
        let c = ch[i], f = fg[i], b = bg[i];
        if (i >= os && i < oe) { c = ov.text[i - os]; f = S.fg; b = S.bg; }
        const x = (i % S.cols) * cw, y = Math.floor(i / S.cols) * chh;
        if (b) { ctx.fillStyle = CGA[b]; ctx.fillRect(Math.floor(x), Math.floor(y), Math.ceil(cw) + 1, Math.ceil(chh) + 1); }
        if (c === ' ' || c === ' ') continue;
        glyph(c, x, y, f === 7 ? P : CGA[f]);
      }
      // function-key line
      S.keyHit = [];
      if (S.keyOn) {
        let x = 0; const y = S.T * chh;
        for (const [d, lab] of KEYS) {
          const w = d.length + lab.length;
          if (x + w > S.cols) break;
          const x0 = x;
          ctx.fillStyle = P; ctx.fillText(d, x * cw + cw / 2, y + chh * 0.54, cw);
          x += d.length;
          ctx.fillRect(x * cw, y + 1, lab.length * cw, chh - 2);
          ctx.fillStyle = '#000';
          for (let k = 0; k < lab.length; k++) ctx.fillText(lab[k], (x + k) * cw + cw / 2, y + chh * 0.54, cw);
          x += lab.length;
          S.keyHit.push([x0, x, lab]);
          x += 1;
        }
      }
      if (ov && ov.show) {
        const i = ov.start + ov.caret, x = (i % S.cols) * cw, y = Math.floor(i / S.cols) * chh;
        if (i < n) { ctx.fillStyle = color(S.fg === S.bg ? 7 : S.fg); ctx.fillRect(x, y + chh * 0.78, cw, Math.max(2, chh * 0.14)); }
      }
      S.dirty = false;
    };
    S.text = () => { const out = []; for (let y = 0; y < S.T; y++) out.push(ch.slice(y * S.cols, (y + 1) * S.cols).join('').replace(/\s+$/, '')); return out.join('\n'); };
    S.cellAt = e => {
      const r = cv.getBoundingClientRect();
      const x = Math.floor((e.clientX - r.left) / (r.width / S.cols)), y = Math.floor((e.clientY - r.top) / (r.height / S.rows));
      if (y === S.T) { const k = S.keyHit.find(h => x >= h[0] && x < h[1]); return k ? { key: k[2] } : null; }
      if (x < 0 || y < 0 || x >= S.cols || y >= S.T) return null;
      return { tap: tp[y * S.cols + x] };
    };
    if (document.fonts && document.fonts.load) document.fonts.load('20px VT323').then(() => { S.dirty = true; }, () => {});
    return S;
  }

  /* ================= the app ================= */
  function openBasic(W, api) {
    const touch = coarse();
    W.keepEsc = true;
    W.body.innerHTML = `<div class="bas${touch ? ' touch' : ''}">
      <div class="bas-scr"></div><pre class="bas-sr" aria-label="Screen text"></pre>
      <div class="bas-kb"><span class="bas-pr">&gt;</span><input class="bas-in" type="text" maxlength="250" placeholder="TAP HERE TO TYPE" autocomplete="off" autocorrect="off" autocapitalize="characters" spellcheck="false" enterkeyhint="go" aria-label="Type a BASIC line"><button class="bas-b" data-a="enter">ENTER</button></div>
      <div class="bas-tb"><button class="bas-b" data-a="run">RUN</button><button class="bas-b" data-a="list">LIST</button><button class="bas-b bas-brk" data-a="break">BREAK</button><button class="bas-b" data-a="examples">EXAMPLES</button><button class="bas-b" data-a="help">HELP</button></div>
    </div>`;
    const root = W.body.firstElementChild, host = root.querySelector('.bas-scr'), inp = root.querySelector('.bas-in'), mirror = root.querySelector('.bas-sr');
    if (!touch) host.appendChild(inp); // desktop: invisible input over the screen; typing shows on the canvas
    const S = Screen(host);
    S.onBell = () => api.tone(800, 0.2, { vol: 0.06 });

    /* ---------- machine state ---------- */
    const M = {
      prog: [], name: '', state: 'idle', cur: null, cont: null, inProg: false, t0: 0, runLines: 0,
      V: new Map(), A: new Map(), fs: [], gs: [], ws: [], dp: 0, keys: [], rng: Math.random, lastRnd: 0.5,
      inp: null, inPos: null, waitUntil: 0, waitKey: false, sndEnd: 0, osc: [], anchor: { r: 0, c: 0 }, prefill: null, hist: [], hi: 0
    };
    let C = null; // compiled program
    const work = api.load('work', null);
    if (work && Array.isArray(work.lines)) { M.prog = work.lines.filter(l => Array.isArray(l) && typeof l[1] === 'string'); M.name = work.name || ''; }
    const saveWork = () => api.save('work', { lines: M.prog, name: M.name });
    const setTitle = () => api.setTitle(M.name ? `Horizon BASIC - ${M.name}.BAS` : 'Horizon BASIC');
    setTitle();
    function progChanged() { C = null; M.cont = null; saveWork(); setTitle(); }

    /* ---------- variables and arrays ---------- */
    const getVar = n => M.V.has(n) ? M.V.get(n) : (n.endsWith('$') ? '' : 0);
    function coerce(name, v) {
      if (name.endsWith('$')) { if (typeof v !== 'string') fail('TM'); if (v.length > 255) fail('LS'); return v; }
      if (typeof v !== 'number') fail('TM');
      if (!isFinite(v)) fail('OV');
      if (name.endsWith('%')) { v = Math.round(v); if (v < -32768 || v > 32767) fail('OV'); }
      return v;
    }
    function mkArr(name, dims) {
      let size = 1; dims.forEach(d => { if (d < 0) fail('FC'); size *= d + 1; });
      if (size > 200000) fail('OM', 'That list is too big for memory. Try a smaller DIM.');
      const a = { d: dims, v: new Array(size).fill(name.endsWith('$') ? '' : 0) }; M.A.set(name, a); return a;
    }
    function arr(name, n) { let a = M.A.get(name); if (!a) a = mkArr(name, new Array(n).fill(10)); if (a.d.length !== n) fail('SR'); return a; }
    function offs(a, idx) { let o = 0; for (let k = 0; k < idx.length; k++) { const i = Math.round(num(idx[k])); if (i < 0 || i > a.d[k]) fail('SR'); o = o * (a.d[k] + 1) + i; } return o; }
    function rnd(a) {
      if (a !== undefined) { a = num(a); if (a < 0) M.rng = seeded(a); else if (a === 0) return M.lastRnd; }
      return (M.lastRnd = M.rng());
    }
    const timer = () => { const d = new Date(); return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds() + Math.floor(d.getMilliseconds() / 10) / 100; };

    /* ---------- functions ---------- */
    const FUNCS = {
      ABS: [1, 1, a => Math.abs(num(a))], INT: [1, 1, a => Math.floor(num(a))], FIX: [1, 1, a => Math.trunc(num(a))],
      SGN: [1, 1, a => Math.sign(num(a))],
      SQR: [1, 1, a => { if (num(a) < 0) fail('FC', 'SQR only works on numbers that are 0 or bigger.'); return Math.sqrt(a); }],
      SIN: [1, 1, a => Math.sin(num(a))], COS: [1, 1, a => Math.cos(num(a))], TAN: [1, 1, a => Math.tan(num(a))], ATN: [1, 1, a => Math.atan(num(a))],
      EXP: [1, 1, a => { const v = Math.exp(num(a)); if (!isFinite(v)) fail('OV'); return v; }],
      LOG: [1, 1, a => { if (num(a) <= 0) fail('FC', 'LOG only works on numbers bigger than 0.'); return Math.log(a); }],
      RND: [0, 1, a => rnd(a)],
      LEN: [1, 1, a => str(a).length],
      LEFT$: [2, 2, (a, n) => { n = ival(n); if (n < 0) fail('FC'); return str(a).slice(0, n); }],
      RIGHT$: [2, 2, (a, n) => { n = ival(n); if (n < 0) fail('FC'); return n ? str(a).slice(-n) : (str(a), ''); }],
      MID$: [2, 3, (a, s, l) => { s = ival(s); if (s < 1) fail('FC', 'MID$ starts counting letters at 1.'); l = l === undefined ? 255 : ival(l); if (l < 0) fail('FC'); return str(a).substr(s - 1, l); }],
      STR$: [1, 1, a => (num(a) < 0 ? '' : ' ') + fmt(a)],
      VAL: [1, 1, a => { const m = /^\s*[+-]?(\d+\.?\d*|\.\d+)(E[+-]?\d+)?/i.exec(str(a)); return m ? parseFloat(m[0]) : 0; }],
      CHR$: [1, 1, a => { a = ival(a); if (a < 0 || a > 255) fail('FC', 'CHR$ takes a code from 0 to 255.'); return chrOf(a); }],
      ASC: [1, 1, a => { if (!str(a)) fail('FC', 'ASC needs at least one letter.'); return ascOf(a[0]); }],
      INSTR: [2, 3, (...a) => {
        let st = 1, s, t; if (a.length === 3) { st = ival(a[0]); s = str(a[1]); t = str(a[2]); } else { s = str(a[0]); t = str(a[1]); }
        if (st < 1) fail('FC'); if (st > s.length) return 0; return s.indexOf(t, st - 1) + 1;
      }],
      STRING$: [2, 2, (n, c) => { n = ival(n); if (n < 0 || n > 255) fail('FC'); const k = typeof c === 'string' ? c[0] : chrOf(ival(c)); if (!k) fail('FC'); return k.repeat(n); }],
      SPACE$: [1, 1, n => { n = ival(n); if (n < 0 || n > 255) fail('FC'); return ' '.repeat(n); }],
      UCASE$: [1, 1, a => str(a).toUpperCase()], LCASE$: [1, 1, a => str(a).toLowerCase()],
      HEX$: [1, 1, a => (ival(a) & 0xffff).toString(16).toUpperCase()],
      POS: [1, 1, () => Math.min(S.col, S.cols - 1) + 1]
    };
    const NOPAREN = { RND: () => rnd(), 'INKEY$': () => M.keys.shift() || '', TIMER: timer, CSRLIN: () => S.row + 1 };
    const RESERVED = new Set(['TAB', 'SPC', 'USING', 'FN', 'OFF']);

    /* ---------- expression compiler: returns closures ---------- */
    const isO = (t, v) => t.t === 'o' && t.v === v;
    const isK = (t, v) => t.t === 'k' && t.v === v;
    const pk = P => P.T[P.p];
    const nx = P => P.T[P.p++];
    const endTok = t => t.t === 'e' || isO(t, ':') || isK(t, 'ELSE');
    function want(P, v, hint) { const t = nx(P); if (!((t.t === 'o' || t.t === 'k') && t.v === v)) fail('SN', hint || `BASIC expected ${v === ')' ? 'a closing bracket )' : v === '(' ? 'an opening bracket (' : v === '=' ? 'an = sign' : v} here.`); }
    const pExpr = P => pXor(P);
    function pXor(P) { let a = pOr(P); while (isK(pk(P), 'XOR')) { P.p++; const l = a, r = pOr(P); a = () => ival(l()) ^ ival(r()); } return a; }
    function pOr(P) { let a = pAnd(P); while (isK(pk(P), 'OR')) { P.p++; const l = a, r = pAnd(P); a = () => ival(l()) | ival(r()); } return a; }
    function pAnd(P) { let a = pNot(P); while (isK(pk(P), 'AND')) { P.p++; const l = a, r = pNot(P); a = () => ival(l()) & ival(r()); } return a; }
    function pNot(P) { if (isK(pk(P), 'NOT')) { P.p++; const r = pNot(P); return () => ~ival(r()); } return pRel(P); }
    const close = (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
    const REL = {
      '=': (a, b) => typeof a === 'number' ? close(a, b) : a === b, '<>': (a, b) => typeof a === 'number' ? !close(a, b) : a !== b,
      '<': (a, b) => a < b, '>': (a, b) => a > b, '<=': (a, b) => a <= b, '>=': (a, b) => a >= b
    };
    REL['><'] = REL['<>']; REL['=<'] = REL['<=']; REL['=>'] = REL['>='];
    function pRel(P) {
      let a = pAdd(P);
      for (;;) {
        const t = pk(P); if (t.t !== 'o' || !REL[t.v]) return a;
        P.p++; const op = REL[t.v], l = a, r = pAdd(P);
        a = () => { const x = l(), y = r(); if (typeof x !== typeof y) fail('TM'); return op(x, y) ? -1 : 0; };
      }
    }
    function pAdd(P) {
      let a = pMod(P);
      for (;;) {
        const t = pk(P);
        if (isO(t, '+')) { P.p++; const l = a, r = pMod(P); a = () => { const x = l(), y = r(); if (typeof x !== typeof y) fail('TM'); if (typeof x === 'string') { if (x.length + y.length > 255) fail('LS'); return x + y; } return x + y; }; }
        else if (isO(t, '-')) { P.p++; const l = a, r = pMod(P); a = () => num(l()) - num(r()); }
        else return a;
      }
    }
    function pMod(P) { let a = pIdiv(P); while (isK(pk(P), 'MOD')) { P.p++; const l = a, r = pIdiv(P); a = () => { const x = ival(l()), y = ival(r()); if (!y) fail('DZ'); return x % y; }; } return a; }
    function pIdiv(P) { let a = pMul(P); while (isO(pk(P), '\\')) { P.p++; const l = a, r = pMul(P); a = () => { const x = ival(l()), y = ival(r()); if (!y) fail('DZ'); return Math.trunc(x / y); }; } return a; }
    function pMul(P) {
      let a = pUn(P);
      for (;;) {
        const t = pk(P);
        if (isO(t, '*')) { P.p++; const l = a, r = pUn(P); a = () => { const v = num(l()) * num(r()); if (!isFinite(v)) fail('OV'); return v; }; }
        else if (isO(t, '/')) { P.p++; const l = a, r = pUn(P); a = () => { const x = num(l()), y = num(r()); if (y === 0) fail('DZ'); const v = x / y; if (!isFinite(v)) fail('OV'); return v; }; }
        else return a;
      }
    }
    function pUn(P) {
      if (isO(pk(P), '-')) { P.p++; const r = pUn(P); return () => -num(r()); }
      if (isO(pk(P), '+')) { P.p++; return pUn(P); }
      return pPow(P);
    }
    function pPow(P) {
      let a = pAtom(P);
      while (isO(pk(P), '^')) {
        P.p++; let r;
        if (isO(pk(P), '-')) { P.p++; const q = pAtom(P); r = () => -num(q()); } else r = pAtom(P);
        const l = a;
        a = () => { const v = Math.pow(num(l()), num(r())); if (Number.isNaN(v)) fail('FC'); if (!isFinite(v)) fail('OV'); return v; };
      }
      return a;
    }
    function pArgs(P) { want(P, '('); const a = [pExpr(P)]; while (isO(pk(P), ',')) { P.p++; a.push(pExpr(P)); } want(P, ')'); return a; }
    function pAtom(P) {
      const t = nx(P);
      if (t.t === 'n') { const v = t.v; return () => v; }
      if (t.t === 's') { const v = t.v; return () => v; }
      if (isO(t, '(')) { const e = pExpr(P); want(P, ')'); return e; }
      if (t.t === 'i') {
        const name = t.v;
        if (RESERVED.has(name)) fail('SN', name === 'TAB' || name === 'SPC' ? `${name}( only works inside PRINT.` : null);
        if (FUNCS[name] && (isO(pk(P), '(') || !NOPAREN[name])) {
          const [mn, mx, f] = FUNCS[name];
          if (!isO(pk(P), '(')) fail('SN', `${name} needs brackets, like ${name}(X).`);
          const args = pArgs(P);
          if (args.length < mn || args.length > mx) fail('SN', `${name} got the wrong number of things in its brackets.`);
          return () => f(...args.map(g => g()));
        }
        if (NOPAREN[name]) return NOPAREN[name];
        if (isO(pk(P), '(')) { const idx = pArgs(P); return () => { const a = arr(name, idx.length); return a.v[offs(a, idx.map(g => g()))]; }; }
        return () => getVar(name);
      }
      if (t.t === 'e' || isO(t, ':')) fail('SN', 'Something is missing at the end, like a number or a word in "quotes".');
      if (t.t === 'k') fail('SN', `${t.v} can't go here.`);
      fail('SN');
    }
    function pLval(P) {
      const t = nx(P);
      if (t.t !== 'i' || FUNCS[t.v] || NOPAREN[t.v] || RESERVED.has(t.v)) fail('SN', t.t === 'k' || FUNCS[t.v] || NOPAREN[t.v] ? `${t.v} is a BASIC word, so it can't be a variable name.` : 'BASIC expected a variable name here, like A or NAME$.');
      const name = t.v;
      if (isO(pk(P), '(')) {
        const idx = pArgs(P);
        const ref = () => { const a = arr(name, idx.length); return [a, offs(a, idx.map(g => g()))]; };
        return { name, get: () => { const [a, o] = ref(); return a.v[o]; }, set: v => { v = coerce(name, v); const [a, o] = ref(); a.v[o] = v; } };
      }
      return { name, simple: true, get: () => getVar(name), set: v => M.V.set(name, coerce(name, v)) };
    }
    function lineNum(P) { const t = nx(P); if (t.t !== 'n' || !Number.isInteger(t.v)) fail('SN', 'BASIC expected a line number here, like GOTO 100.'); return t.v; }
    function optArgs(P) {
      const a = [];
      if (endTok(pk(P))) return a;
      for (;;) {
        if (isO(pk(P), ',')) { a.push(null); P.p++; if (endTok(pk(P))) { a.push(null); return a; } continue; }
        a.push(pExpr(P));
        if (!isO(pk(P), ',')) return a;
        P.p++;
        if (endTok(pk(P))) return a;
      }
    }
    function pRange(P) {
      let a = 0, b = Infinity;
      const t = pk(P);
      if (t.t === 'n') { a = lineNum(P); if (isO(pk(P), '-')) { P.p++; if (pk(P).t === 'n') b = lineNum(P); } else b = a; }
      else if (isO(t, '-')) { P.p++; b = lineNum(P); }
      return [a, b];
    }
    function pName(P) {
      const t = pk(P), u = P.T[P.p + 1];
      if (t.t === 's') { P.p++; return () => t.v; }
      if (t.t === 'i' && (endTok(u) || isO(u, ','))) { P.p++; return () => t.v; }
      if (endTok(t)) fail('SN', 'Put the program name in quotes, like SAVE "GAME".');
      const e = pExpr(P); return () => str(e());
    }

    /* ---------- statement compiler: a line becomes a flat list of steps ---------- */
    const emit = (code, k, x, extra) => { const s = Object.assign({ k, x }, extra); code.push(s); return s; };
    const direct = () => { if (M.cur && M.cur.li >= 0) fail('ID'); };
    function pStmts(P, code, inIf) {
      for (;;) {
        let t = pk(P);
        while (isO(t, ':')) { P.p++; t = pk(P); }
        if (t.t === 'e' || (inIf && isK(t, 'ELSE'))) return;
        pStmt(P, code);
        t = pk(P);
        if (t.t === 'e' || (inIf && isK(t, 'ELSE'))) return;
        if (!isO(t, ':')) fail('SN', isK(t, 'ELSE') ? 'ELSE only goes after IF ... THEN.' : 'Put a : between two commands on the same line.');
      }
    }
    function pGotoTarget(P, code) { const n = lineNum(P); emit(code, 'GOTO', () => jump(n)); }
    function pStmt(P, code) {
      const t = pk(P);
      if (t.t === 'i') {
        const u = P.T[P.p + 1];
        if (!(isO(u, '=') || isO(u, '('))) fail('SN', unknownHint(t.v));
        const lv = pLval(P); want(P, '=', 'To set a variable, use =, like A = 5.'); const e = pExpr(P);
        emit(code, 'LET', () => lv.set(e())); return;
      }
      if (t.t !== 'k') fail('SN', t.t === 'n' ? 'Line numbers go at the very start of a line.' : t.t === 's' ? 'To show words on the screen, use PRINT, like PRINT "HELLO".' : null);
      P.p++;
      switch (t.v) {
        case 'REM': return;
        case 'LET': { const lv = pLval(P); want(P, '='); const e = pExpr(P); emit(code, 'LET', () => lv.set(e())); return; }
        case 'PRINT': {
          const items = [];
          for (;;) {
            const u = pk(P);
            if (endTok(u)) break;
            if (isO(u, ';') || isO(u, ',')) { P.p++; items.push({ s: u.v }); continue; }
            if (u.t === 'i' && (u.v === 'TAB' || u.v === 'SPC') && isO(P.T[P.p + 1], '(')) { P.p += 2; const e = pExpr(P); want(P, ')'); items.push(u.v === 'TAB' ? { tab: e } : { spc: e }); continue; }
            items.push({ e: pExpr(P) });
          }
          emit(code, 'PRINT', () => doPrint(items)); return;
        }
        case 'INPUT': case 'LINE': {
          const line = t.v === 'LINE'; if (line) want(P, 'INPUT', 'Did you mean LINE INPUT?');
          if (isO(pk(P), ';')) P.p++;
          let prompt = '', q = !line;
          if (pk(P).t === 's' && (isO(P.T[P.p + 1], ';') || isO(P.T[P.p + 1], ','))) { prompt = nx(P).v; q = nx(P).v === ';' && !line; }
          else if (pk(P).t === 's') fail('SN', 'Put a ; after the question, like INPUT "NAME"; N$.');
          const vars = [pLval(P)]; while (isO(pk(P), ',')) { P.p++; vars.push(pLval(P)); }
          if (line && (vars.length > 1 || !vars[0].name.endsWith('$'))) fail('TM');
          emit(code, 'INPUT', () => askInput({ prompt, q, vars, line })); return;
        }
        case 'DIM': {
          const list = [];
          do {
            const n = nx(P); if (n.t !== 'i' || FUNCS[n.v] || NOPAREN[n.v]) fail('SN', 'DIM needs a list name, like DIM A(20).');
            list.push([n.v, pArgs(P)]);
          } while (isO(pk(P), ',') && ++P.p);
          emit(code, 'DIM', () => list.forEach(([n, d]) => { if (M.A.has(n)) fail('DD'); mkArr(n, d.map(g => ival(g()))); })); return;
        }
        case 'IF': {
          const cond = pExpr(P);
          const s = emit(code, 'IF', null);
          const u = pk(P);
          if (isK(u, 'THEN')) { P.p++; if (pk(P).t === 'n') pGotoTarget(P, code); else pStmts(P, code, true); }
          else if (isK(u, 'GOTO')) { P.p++; pGotoTarget(P, code); }
          else fail('SN', 'IF needs THEN, like IF A = 5 THEN PRINT "FIVE".');
          if (isK(pk(P), 'ELSE')) {
            P.p++;
            const j = emit(code, 'JMP', null); s.at = code.length;
            if (pk(P).t === 'n') pGotoTarget(P, code); else pStmts(P, code, true);
            const to = code.length; j.x = () => { M.cur.si = to; };
          } else s.at = code.length;
          const at = s.at;
          s.x = () => { const v = cond(); if (typeof v !== 'number') fail('TM'); if (v === 0) M.cur.si = at; };
          return;
        }
        case 'GOTO': pGotoTarget(P, code); return;
        case 'GOSUB': { const n = lineNum(P); emit(code, 'GOSUB', () => { pushGosub(); jump(n); }); return; }
        case 'RETURN': {
          const n = pk(P).t === 'n' ? lineNum(P) : null;
          emit(code, 'RETURN', () => { const r = M.gs.pop(); if (!r) fail('RG'); if (n != null) jump(n); else M.cur = Object.assign({}, r); }); return;
        }
        case 'FOR': {
          const lv = pLval(P); if (!lv.simple) fail('SN', 'FOR needs a plain variable, like FOR I = 1 TO 10.');
          if (lv.name.endsWith('$')) fail('TM');
          want(P, '=', 'FOR needs an = sign, like FOR I = 1 TO 10.'); const from = pExpr(P);
          want(P, 'TO', 'FOR needs TO, like FOR I = 1 TO 10.'); const to = pExpr(P);
          let step = null; if (isK(pk(P), 'STEP')) { P.p++; step = pExpr(P); }
          const name = lv.name;
          emit(code, 'FOR', () => {
            const a = num(from()), lim = num(to()), st = step ? num(step()) : 1;
            lv.set(a);
            const i = M.fs.findIndex(f => f.v === name); if (i >= 0) M.fs.length = i;
            if (st >= 0 ? getVar(name) > lim : getVar(name) < lim) {
              const p = scanFwd('FOR', 'NEXT'); if (!p) fail('FN'); M.cur = p; return;
            }
            if (M.fs.length > 200) fail('OM');
            M.fs.push({ v: name, lim, st, pos: { L: M.cur.L, li: M.cur.li, si: M.cur.si } });
          });
          return;
        }
        case 'NEXT': {
          const vars = [];
          while (pk(P).t === 'i') { vars.push(nx(P).v); if (!isO(pk(P), ',')) break; P.p++; }
          emit(code, 'NEXT', () => {
            const names = vars.length ? vars : [null];
            for (const nm of names) {
              let f;
              if (nm === null) f = M.fs[M.fs.length - 1];
              else { let i = M.fs.length - 1; while (i >= 0 && M.fs[i].v !== nm) i--; if (i < 0) fail('NF'); M.fs.length = i + 1; f = M.fs[i]; }
              if (!f) fail('NF');
              const v = getVar(f.v) + f.st; M.V.set(f.v, coerce(f.v, v));
              if (f.st >= 0 ? v <= f.lim + 1e-9 : v >= f.lim - 1e-9) { M.cur = Object.assign({}, f.pos); return; }
              M.fs.pop();
            }
          }, { vars });
          return;
        }
        case 'WHILE': {
          const cond = pExpr(P);
          emit(code, 'WHILE', () => {
            const c = M.cur, here = { L: c.L, li: c.li, si: c.si - 1 }, top = M.ws[M.ws.length - 1];
            const same = top && top.L === here.L && top.si === here.si;
            const v = cond(); if (typeof v !== 'number') fail('TM');
            if (v !== 0) { if (!same) { if (M.ws.length > 200) fail('OM'); M.ws.push(here); } }
            else { if (same) M.ws.pop(); const p = scanFwd('WHILE', 'WEND'); if (!p) fail('WW'); M.cur = p; }
          });
          return;
        }
        case 'WEND': emit(code, 'WEND', () => { const top = M.ws[M.ws.length - 1]; if (!top) fail('WE'); M.cur = Object.assign({}, top); }); return;
        case 'END': emit(code, 'END', () => finish('end')); return;
        case 'STOP': emit(code, 'STOP', () => finish('stop')); return;
        case 'CLS': emit(code, 'CLS', () => S.cls()); return;
        case 'COLOR': {
          const a = optArgs(P);
          emit(code, 'COLOR', () => {
            if (a[0]) { const v = ival(a[0]()); if (v < 0 || v > 31) fail('FC', 'Text colors go from 0 to 15.'); S.fg = v & 15; }
            if (a[1]) { const v = ival(a[1]()); if (v < 0 || v > 15) fail('FC', 'Background colors go from 0 to 15.'); S.bg = v; }
          });
          return;
        }
        case 'LOCATE': {
          const a = optArgs(P);
          emit(code, 'LOCATE', () => {
            if (a[0]) { const r = ival(a[0]()); if (r < 1 || r > S.T) fail('FC', `LOCATE rows go from 1 to ${S.T}.`); S.row = r - 1; }
            if (a[1]) { const c = ival(a[1]()); if (c < 1 || c > S.cols) fail('FC', `LOCATE columns go from 1 to ${S.cols} on this screen.`); S.col = c - 1; }
            if (S.col >= S.cols) S.col = S.cols - 1;
          });
          return;
        }
        case 'BEEP': emit(code, 'BEEP', () => sound(800, 4.5)); return;
        case 'SOUND': {
          const f = pExpr(P); want(P, ',', 'SOUND needs a pitch and a length, like SOUND 440, 9.'); const d = pExpr(P);
          emit(code, 'SOUND', () => {
            const hz = num(f()), len = num(d());
            if (hz < 37 || hz > 32767) fail('FC', 'SOUND pitch goes from 37 to 32767. Try 440.');
            if (len < 0 || len > 65535) fail('FC', 'SOUND length goes from 0 to 65535. 18 is about one second.');
            sound(hz, len);
          });
          return;
        }
        case 'SLEEP': {
          const e = endTok(pk(P)) ? null : pExpr(P);
          emit(code, 'SLEEP', () => {
            const s = e ? num(e()) : 0;
            M.state = 'wait';
            if (s > 0) { M.waitKey = false; M.waitUntil = performance.now() + Math.min(s, 3600) * 1000; } else { M.waitKey = true; M.waitUntil = Infinity; }
          });
          return;
        }
        case 'RANDOMIZE': { const e = endTok(pk(P)) ? null : pExpr(P); emit(code, 'RANDOMIZE', () => { M.rng = seeded(e ? num(e()) : Math.random() * 1e6); }); return; }
        case 'DATA': { const r = nx(P); emit(code, 'DATA', () => {}, { items: r.t === 'r' ? splitData(r.v) : [] }); return; }
        case 'READ': {
          const vars = [pLval(P)]; while (isO(pk(P), ',')) { P.p++; vars.push(pLval(P)); }
          emit(code, 'READ', () => {
            ensureProg();
            vars.forEach(v => {
              if (M.dp >= C.data.length) fail('OD');
              const item = C.data[M.dp++];
              if (v.name.endsWith('$')) v.set(item);
              else { const s = item.trim(); if (s !== '' && !NUMRE.test(s)) fail('SN', `READ wanted a number but the DATA has "${s}".`); v.set(s === '' ? 0 : parseFloat(s)); }
            });
          });
          return;
        }
        case 'RESTORE': {
          const n = pk(P).t === 'n' ? lineNum(P) : null;
          emit(code, 'RESTORE', () => {
            ensureProg();
            if (n == null) { M.dp = 0; return; }
            if (!C.idx.has(n)) fail('UL');
            const d = C.dataAt.find(x => x[0] >= n); M.dp = d ? d[1] : C.data.length;
          });
          return;
        }
        case 'ON': {
          const e = pExpr(P), k = nx(P);
          if (!isK(k, 'GOTO') && !isK(k, 'GOSUB')) fail('SN', 'ON needs GOTO or GOSUB, like ON K GOTO 100, 200.');
          const list = [lineNum(P)]; while (isO(pk(P), ',')) { P.p++; list.push(lineNum(P)); }
          const sub = k.v === 'GOSUB';
          emit(code, 'ON', () => {
            const v = Math.round(num(e())); if (v < 0 || v > 255) fail('FC');
            if (v >= 1 && v <= list.length) { if (sub) pushGosub(); jump(list[v - 1]); }
          });
          return;
        }
        case 'SWAP': {
          const a = pLval(P); want(P, ','); const b = pLval(P);
          emit(code, 'SWAP', () => { const x = a.get(), y = b.get(); if (typeof x !== typeof y) fail('TM'); a.set(y); b.set(x); }); return;
        }
        case 'CLEAR': emit(code, 'CLEAR', () => clearVars()); return;
        case 'KEY': {
          const u = nx(P); const on = isK(u, 'ON'); if (!on && !(u.t === 'i' && u.v === 'OFF')) fail('SN', 'Use KEY ON or KEY OFF.');
          emit(code, 'KEY', () => { S.keyOn = on; S.dirty = true; }); return;
        }
        case 'SCREEN': { const e = pExpr(P); optArgs(P); emit(code, 'SCREEN', () => { if (num(e()) !== 0) fail('FC', 'This computer only has text mode, SCREEN 0.'); }); return; }
        case 'WIDTH': {
          const e = pExpr(P);
          emit(code, 'WIDTH', () => { const n = ival(e()); if (n !== 40 && n !== 80) fail('FC', 'Use WIDTH 40 for big letters or WIDTH 80 for small ones.'); S.force = n === 40 ? 40 : 0; S.fit(true); S.cls(); });
          return;
        }
        /* ---- commands ---- */
        case 'RUN': {
          let n = null, file = null;
          if (pk(P).t === 'n') n = lineNum(P); else if (!endTok(pk(P))) file = pName(P);
          emit(code, 'RUN', () => { if (file) loadProgram(file()); runProgram(n); }); return;
        }
        case 'LIST': {
          const [a, b] = pRange(P);
          emit(code, 'LIST', () => { M.prog.forEach(([n, x]) => { if (n >= a && n <= b) S.line(n + ' ' + x); }); }); return;
        }
        case 'NEW': emit(code, 'NEW', () => { direct(); M.prog = []; M.name = ''; clearVars(); progChanged(); }); return;
        case 'DELETE': {
          if (endTok(pk(P))) fail('SN', 'Say which line to delete, like DELETE 20 or DELETE 20-50.');
          const [a, b] = pRange(P);
          emit(code, 'DELETE', () => {
            direct(); const before = M.prog.length; M.prog = M.prog.filter(([n]) => n < a || n > b);
            if (M.prog.length === before) fail('FC', 'There are no lines with those numbers. Type LIST to check.');
            progChanged();
          });
          return;
        }
        case 'RENUM': {
          const a = optArgs(P);
          emit(code, 'RENUM', () => { direct(); renum(a[0] ? ival(a[0]()) : 10, a[1] ? ival(a[1]()) : 0, a[2] ? ival(a[2]()) : 10); }); return;
        }
        case 'SAVE': { const f = pName(P); emit(code, 'SAVE', () => saveProgram(f())); return; }
        case 'LOAD': {
          const f = pName(P); let run = false;
          if (isO(pk(P), ',')) { P.p++; const r = nx(P); if (!(r.t === 'i' && r.v === 'R')) fail('SN'); run = true; }
          emit(code, 'LOAD', () => { direct(); loadProgram(f()); if (run) runProgram(null); else hint('Type RUN to start it, or LIST to look inside.'); }); return;
        }
        case 'FILES': emit(code, 'FILES', () => listFiles()); return;
        case 'KILL': {
          const f = pName(P);
          emit(code, 'KILL', () => { const n = cleanName(f()), all = api.load('files', {}); if (!all[n]) fail('FF'); delete all[n]; api.save('files', all); S.line(`Deleted ${n}.BAS`); }); return;
        }
        case 'EXAMPLES': emit(code, 'EXAMPLES', () => listExamples()); return;
        case 'HELP': {
          const e = endTok(pk(P)) ? null : pExpr(P);
          emit(code, 'HELP', () => { const n = e ? ival(e()) : 1; if (!HELP[n]) fail('FC', 'Help pages are HELP 1, HELP 2, HELP 3 and HELP 4.'); showHelp(n); }); return;
        }
        case 'CONT': emit(code, 'CONT', () => { direct(); if (!M.cont) fail('CN'); M.cur = M.cont; M.cont = null; if (M.cur.li >= 0) enterProg(); }); return;
        case 'SYSTEM': case 'EXIT': emit(code, 'SYSTEM', () => { finish('end'); setTimeout(() => api.close(), 0); }); return;
        case 'EDIT': {
          const n = lineNum(P);
          emit(code, 'EDIT', () => { direct(); const l = M.prog.find(x => x[0] === n); if (!l) fail('UL'); M.prefill = `${n} ${l[1]}`; }); return;
        }
        default: fail('SN', `${t.v} can't start a command.`);
      }
    }
    function compile(text) {
      const P = { T: tokenize(text), p: 0 }, code = [];
      pStmts(P, code, false);
      if (pk(P).t !== 'e') fail('SN');
      return code;
    }
    function ensureProg() {
      if (C) return;
      C = { lines: [], idx: new Map(), data: [], dataAt: [] };
      M.prog.forEach(([n, t], li) => {
        let code;
        try { code = compile(t); } catch (e) { if (!(e instanceof BErr)) throw e; code = [{ k: 'ERR', x: () => { throw e; } }]; }
        C.lines.push({ n, code }); C.idx.set(n, li);
        code.forEach(s => { if (s.k === 'DATA') { C.dataAt.push([n, C.data.length]); C.data.push(...s.items); } });
      });
    }

    /* ---------- running ---------- */
    function enterProg() { if (!M.inProg) { M.inProg = true; M.t0 = performance.now(); M.runLines = M.prog.length; } }
    function jump(n) { ensureProg(); const li = C.idx.get(n); if (li === undefined) fail('UL', `There is no line ${n}. Type LIST to see your line numbers.`); enterProg(); M.cur = { L: C.lines[li], li, si: 0 }; }
    function pushGosub() { if (M.gs.length > 250) fail('OM'); M.gs.push({ L: M.cur.L, li: M.cur.li, si: M.cur.si }); }
    function clearVars() { M.V.clear(); M.A.clear(); M.fs = []; M.gs = []; M.ws = []; M.dp = 0; }
    function scanFwd(open, closeK) {
      let depth = 1, L = M.cur.L, li = M.cur.li, si = M.cur.si;
      for (;;) {
        if (si >= L.code.length) { if (li < 0 || !C || li + 1 >= C.lines.length) return null; li++; L = C.lines[li]; si = 0; continue; }
        const s = L.code[si++];
        if (s.k === open) depth++;
        else if (s.k === closeK) { depth -= closeK === 'NEXT' ? Math.max(1, s.vars.length) : 1; if (depth <= 0) return { L, li, si }; }
      }
    }
    function runProgram(n) {
      stopSounds(); ensureProg(); clearVars(); M.keys = []; M.rng = Math.random; M.cont = null;
      if (!C.lines.length) { hint('There is no program yet. Type a line like 10 PRINT "HI", then RUN.'); return; }
      let li = 0;
      if (n != null) { li = C.idx.get(n); if (li === undefined) fail('UL'); }
      M.inProg = false; enterProg();
      M.cur = { L: C.lines[li], li, si: 0 };
    }
    function step() {
      const c = M.cur;
      if (c.si >= c.L.code.length) {
        if (c.li < 0 || !C || c.li + 1 >= C.lines.length) { finish('end'); return; }
        c.li++; c.L = C.lines[c.li]; c.si = 0; return;
      }
      c.L.code[c.si++].x();
    }
    const BUDGET = 1000;
    function runSlice() {
      const t0 = performance.now(); let n = 0;
      try {
        while (M.state === 'run') {
          step();
          if (++n >= BUDGET) break;
          if ((n & 127) === 0 && performance.now() - t0 > 12) break;
        }
      } catch (e) { runError(e); }
    }
    function doPrint(items) {
      let last = null;
      for (const it of items) {
        if (it.e) { const v = it.e(); S.out(typeof v === 'number' ? numOut(v) : v); }
        else if (it.s === ',') { if (S.col >= S.cols) S.nl(); const z = (Math.floor(S.col / 14) + 1) * 14; if (z >= S.cols) S.nl(); else S.out(' '.repeat(z - S.col)); }
        else if (it.tab) { let n = ival(it.tab()); if (n < 1) n = 1; const target = (n - 1) % S.cols; if (S.col >= S.cols) S.nl(); if (S.col > target) S.nl(); S.out(' '.repeat(target - S.col)); }
        else if (it.spc) { const n = ival(it.spc()); S.out(' '.repeat(Math.max(0, Math.min(255, n)))); }
        last = it;
      }
      if (!last || !last.s) S.nl();
    }
    function sound(f, d) {
      const now = performance.now() / 1000;
      if (M.sndEnd > now + 0.04) { M.cur.si--; M.state = 'wait'; M.waitKey = false; M.waitUntil = (M.sndEnd - 0.04) * 1000; return; }
      if (d === 0) { stopSounds(); return; }
      const start = Math.max(now, M.sndEnd), dur = d / 18.2;
      if (f < 20000) { const o = api.tone(f, Math.max(0.03, dur * 0.9), { at: start - now, vol: 0.06 }); if (o) M.osc.push(o); }
      M.sndEnd = start + dur;
      if (M.osc.length > 40) M.osc.splice(0, 20);
    }
    function stopSounds() { M.osc.forEach(o => { try { o.stop(); } catch (e) { /* already stopped */ } }); M.osc = []; M.sndEnd = 0; }
    function askInput(o) {
      S.out(o.prompt + (o.q ? '? ' : ''));
      M.inp = o; M.inPos = { L: M.cur.L, li: M.cur.li, si: M.cur.si - 1 }; M.state = 'input';
      startEdit(); focusIn(true);
    }
    function gotInput(text) {
      const o = M.inp;
      if (o.line) { o.vars[0].set(text.slice(0, 255)); M.inp = null; M.state = 'run'; return; }
      let parts;
      if (o.vars.length === 1 && o.vars[0].name.endsWith('$')) { let s = text.trim(); if (/^".*"$/.test(s)) s = s.slice(1, -1); parts = [s]; }
      else parts = splitData(text);
      const redo = h => { S.line('?Redo from start'); hint(h); S.out(o.prompt + (o.q ? '? ' : '')); startEdit(); };
      if (parts.length !== o.vars.length) return redo(o.vars.length > 1 ? `Type ${o.vars.length} answers with commas between them.` : 'Type just one answer, with no commas.');
      const vals = [];
      for (let k = 0; k < parts.length; k++) {
        if (o.vars[k].name.endsWith('$')) vals.push(parts[k].slice(0, 255));
        else { const s = parts[k].trim(); if (s !== '' && !NUMRE.test(s)) return redo('This question wants a number. Type digits, like 42.'); vals.push(s === '' ? 0 : parseFloat(s)); }
      }
      try { o.vars.forEach((v, k) => v.set(vals[k])); } catch (e) { runError(e); return; }
      M.inp = null; M.state = 'run';
    }
    function hint(text) {
      if (S.col > 0) S.nl();
      const f = S.fg, b = S.bg; S.fg = 14; S.bg = 0;
      wrap(text, S.cols - 1).forEach(l => S.line(l));
      S.fg = f; S.bg = b;
    }
    function wrap(text, width) {
      const out = []; let line = '';
      String(text).split(' ').forEach(w => { if ((line + (line ? ' ' : '') + w).length > width) { if (line) out.push(line); line = w; } else line += (line ? ' ' : '') + w; });
      if (line) out.push(line); return out;
    }
    function reward(completed) {
      if (!M.inProg) return;
      const secs = (performance.now() - M.t0) / 1000;
      M.inProg = false;
      if (!completed && secs < 1) return;
      if (M.runLines >= 2) api.stamp('basic-run');
      if (M.runLines >= 1 && !api.load('earned', false)) {
        api.save('earned', true);
        const got = api.earn(3, 'running your first BASIC program');
        if (got) hint(`You ran your first program and earned $${got}! Well done, programmer.`);
      }
    }
    // Program or direct line finished: 'end' (END, or ran off the end) or 'stop' (STOP statement).
    function finish(kind) {
      const c = M.cur;
      if (kind === 'stop') { M.cont = { L: c.L, li: c.li, si: c.si }; if (S.col > 0) S.nl(); S.line(c.li >= 0 ? `Break in ${c.L.n}` : 'Break'); }
      else if (M.inProg || c.li >= 0) M.cont = null; // a plain direct line (like PRINT X) keeps CONT possible
      reward(true);
      goIdle();
    }
    function doBreak() {
      if (M.state === 'idle') return;
      stopSounds();
      const pos = M.state === 'input' ? M.inPos : { L: M.cur.L, li: M.cur.li, si: M.cur.si };
      if (M.state === 'input') { commitEcho(inp.value + '^C'); }
      else { if (S.col > 0) S.nl(); S.line('^C'); }
      inp.value = '';
      S.line(pos.li >= 0 ? `Break in ${pos.L.n}` : 'Break');
      M.cont = pos; M.inp = null; M.waitKey = false;
      reward(false);
      goIdle();
    }
    function runError(e) {
      if (!(e instanceof BErr)) { console.error(e); e = new BErr('SN', 'Something went wrong inside BASIC. Try that line a different way.'); }
      const c = M.cur, n = c && c.li >= 0 ? c.L.n : null;
      if (S.col > 0) S.nl();
      S.line(MSG[e.code] + (n != null ? ' in ' + n : ''));
      hint(e.hint || HINT[e.code]);
      if (e.code === 'SN' && n != null) { const l = M.prog.find(x => x[0] === n); if (l) { M.prefill = `${n} ${l[1]}`; hint('Fix the line below, then press Enter.'); } }
      M.cont = null; M.inProg = false; M.inp = null; M.waitKey = false;
      goIdle();
    }
    function goIdle() {
      M.state = 'idle'; M.inProg = false; M.cur = null;
      if (S.col > 0) S.nl();
      S.line('Ok');
      startEdit();
      if (M.prefill) { inp.value = M.prefill; M.prefill = null; ensureRoom(); try { inp.setSelectionRange(inp.value.length, inp.value.length); } catch (e) { /* ignore */ } }
      S.dirty = true;
      focusIn();
    }

    /* ---------- typing ---------- */
    function startEdit() { if (S.col >= S.cols) S.nl(); M.anchor = { r: S.row, c: S.col }; ensureRoom(); S.dirty = true; }
    function ensureRoom() {
      const len = inp.value.length + 1, cap = S.T * S.cols;
      if (M.anchor.c >= S.cols) M.anchor.c = S.cols - 1;
      while (M.anchor.r * S.cols + M.anchor.c + len > cap && M.anchor.r > 0) { S.scroll(); M.anchor.r--; if (S.row > 0) S.row--; }
    }
    function commitEcho(text) { S.row = M.anchor.r; S.col = Math.min(M.anchor.c, S.cols - 1); S.out(text); S.nl(); }
    function focusIn(forInput) { if (!touch || forInput) setTimeout(() => { if (document.activeElement !== inp && !W.el.querySelector('.menu')) inp.focus({ preventScroll: true }); }, 0); }
    function submit() {
      const text = inp.value; inp.value = '';
      if (M.state === 'idle') {
        commitEcho(text);
        if (text.trim()) { if (M.hist[M.hist.length - 1] !== text) M.hist.push(text); if (M.hist.length > 50) M.hist.shift(); }
        M.hi = M.hist.length;
        enterLine(text);
      } else if (M.state === 'input') { commitEcho(text); gotInput(text); }
      else if (M.keys.length < 16) M.keys.push('\r');
      S.dirty = true;
    }
    function enterLine(text) {
      const t = text.trim();
      if (!t) { startEdit(); return; }
      const m = /^(\d+)\s?(.*)$/.exec(t);
      if (m) {
        const n = +m[1];
        if (n > 65529) { M.cur = null; runError(new BErr('SN', 'Line numbers go from 0 to 65529.')); return; }
        storeLine(n, m[2]); startEdit(); return;
      }
      let code;
      M.cur = null;
      try { code = compile(normalize(t)); } catch (e) { runError(e); return; }
      M.cur = { L: { n: null, code }, li: -1, si: 0 };
      M.inProg = false; M.state = 'run';
      runSlice();
    }
    function storeLine(n, rest) {
      const t = normalize(rest.replace(/\s+$/, ''));
      const i = M.prog.findIndex(l => l[0] >= n);
      if (!t.trim()) { if (i >= 0 && M.prog[i][0] === n) M.prog.splice(i, 1); }
      else if (M.prog.length >= 1000 && !(i >= 0 && M.prog[i][0] === n)) { runError(new BErr('OM', 'Your program has 1000 lines, the most BASIC can hold.')); return; }
      else if (i < 0) M.prog.push([n, t]);
      else if (M.prog[i][0] === n) M.prog[i][1] = t;
      else M.prog.splice(i, 0, [n, t]);
      progChanged();
    }
    function renumText(t, map) {
      let stop = false;
      return (t.match(/"[^"]*("|$)|[^"]+/g) || []).map(s => {
        if (stop || s[0] === '"') return s;
        const m = /(\bREM|'|\bDATA\b)/.exec(s); let code = s, rest = '';
        if (m) { code = s.slice(0, m.index); rest = s.slice(m.index); stop = true; }
        code = code.replace(/\b(GOTO|GOSUB|THEN|ELSE|RESTORE|RUN|RETURN)(\s*)(\d+(?:\s*,\s*\d+)*)/g, (all, kw, sp, nums) => kw + sp + nums.replace(/\d+/g, d => map.has(+d) ? String(map.get(+d)) : d));
        return code + rest;
      }).join('');
    }
    function renum(start, old, inc) {
      if (inc < 1) fail('FC');
      if (!M.prog.length) return;
      const map = new Map(); let k = start;
      M.prog.forEach(([n]) => { if (n >= old) { map.set(n, k); k += inc; } });
      if (k - inc > 65529) fail('FC', 'The new line numbers would be too big.');
      const low = M.prog.filter(([n]) => n < old).map(([n]) => n);
      if (low.length && Math.max(...low) >= start) fail('FC', 'The new numbers would bump into lines you are keeping.');
      M.prog = M.prog.map(([n, t]) => [map.has(n) ? map.get(n) : n, renumText(t, map)]).sort((a, b) => a[0] - b[0]);
      progChanged();
    }

    /* ---------- disk ---------- */
    function cleanName(s) { s = String(s).trim().toUpperCase().replace(/\.BAS$/, ''); if (!/^[A-Z0-9_-]{1,8}$/.test(s)) fail('BN'); return s; }
    function saveProgram(raw) {
      const n = cleanName(raw), all = api.load('files', {});
      if (!all[n] && Object.keys(all).length >= 20) fail('DF');
      if (!M.prog.length) fail('FC', 'There is no program to save yet. Type some numbered lines first.');
      all[n] = { lines: M.prog, t: Date.now() }; api.save('files', all);
      M.name = n; saveWork(); setTitle();
      api.sfx.floppy && api.sfx.floppy();
      S.line(`Saved ${n}.BAS (${M.prog.length} line${M.prog.length === 1 ? '' : 's'}).`);
    }
    function loadProgram(raw) {
      const n = cleanName(raw), all = api.load('files', {});
      const lines = all[n] ? all[n].lines : exampleLines(n);
      if (!lines) fail('FF');
      stopSounds();
      M.prog = lines.map(l => [l[0], l[1]]); M.name = n; clearVars(); progChanged();
      api.sfx.floppy && api.sfx.floppy();
      S.line(`Loaded ${n}.BAS (${M.prog.length} lines).`);
    }
    function listFiles() {
      const all = api.load('files', {}), names = Object.keys(all).sort();
      if (!names.length) S.line('No programs saved yet.');
      names.forEach(nm => S.line(` ${nm.padEnd(8)}.BAS  ${String(all[nm].lines.length).padStart(4)} lines`, `LOAD "${nm}"`));
      S.line(`${names.length} of 20 programs saved.`);
      hint(names.length ? 'Tap a name, or type LOAD "NAME". Samples: EXAMPLES' : 'Save yours with SAVE "NAME". Samples: EXAMPLES');
    }
    function listExamples() {
      const f = S.fg; S.fg = 11; S.line('SAMPLE PROGRAMS'); S.fg = f;
      EXAMPLES.forEach(([n, d]) => S.line(` ${n.padEnd(8)} ${d}`, `LOAD "${n}"`));
      hint('Tap one, or type LOAD "GUESS". Then RUN it!');
    }
    function showHelp(n) {
      const f = S.fg, b = S.bg; S.bg = 0;
      HELP[n].forEach(([t, tap, col]) => { S.fg = col || 7; S.line(t, tap); });
      S.fg = f; S.bg = b;
    }
    function bytesFree() { return 60300 - M.prog.reduce((a, l) => a + l[1].length + 5, 0); }

    /* ---------- buttons, keys, taps ---------- */
    function typeCmd(cmd) {
      if (M.state === 'input' && cmd !== 'RUN') return;
      if (M.state !== 'idle') doBreak();
      inp.value = cmd; submit(); focusIn();
    }
    function menuSave() {
      if (M.state !== 'idle') return;
      if (M.name) { typeCmd(`SAVE "${M.name}"`); return; }
      inp.value = 'SAVE "'; ensureRoom(); S.dirty = true;
      setTimeout(() => { inp.focus({ preventScroll: true }); try { inp.setSelectionRange(6, 6); } catch (e) { /* ignore */ } }, 0);
    }
    function keyCmd(cmd) {
      if (cmd === 'RUN') { typeCmd('RUN'); return; }
      if (M.state !== 'idle') { api.sfx.beep && api.sfx.beep(); return; }
      if (cmd === 'SAVE') menuSave(); else typeCmd(cmd);
    }
    root.querySelector('.bas-tb').addEventListener('click', e => {
      const b = e.target.closest('[data-a]'); if (!b) return;
      ({ run: () => typeCmd('RUN'), list: () => keyCmd('LIST'), break: () => { doBreak(); focusIn(); }, examples: () => keyCmd('EXAMPLES'), help: () => keyCmd('HELP') })[b.dataset.a]();
    });
    root.querySelector('.bas-kb [data-a=enter]').addEventListener('click', () => { submit(); inp.focus({ preventScroll: true }); });
    S.cv.addEventListener('click', e => {
      const hit = S.cellAt(e);
      if (hit && hit.key) { keyCmd(hit.key); return; }
      if (hit && hit.tap && M.state === 'idle') { typeCmd(hit.tap); return; }
      inp.focus({ preventScroll: true });
    });
    inp.addEventListener('input', () => {
      if (M.state === 'run' || M.state === 'wait') {
        for (const c of inp.value) if (M.keys.length < 16) M.keys.push(c);
        inp.value = '';
        if (M.waitKey) { M.waitKey = false; M.keys.length = 0; M.state = 'run'; }
        return;
      }
      ensureRoom(); S.dirty = true;
    });
    ['keyup', 'click', 'select'].forEach(ev => inp.addEventListener(ev, () => { S.dirty = true; }));
    const KEYMAP = { Enter: '\r', Backspace: '\b', Tab: '\t', ArrowUp: '\0H', ArrowDown: '\0P', ArrowLeft: '\0K', ArrowRight: '\0M', Home: '\0G', End: '\0O', Delete: '\0S' };
    // The engine closes open menus on Esc before W.onKey runs, so note it first (capture phase).
    let menuOpen = false;
    const noteMenu = () => { menuOpen = !!W.el.querySelector('.menubar .mi.open'); };
    window.addEventListener('keydown', noteMenu, true);
    W.onKey = e => {
      if (menuOpen) return;
      const k = e.key, busy = M.state === 'run' || M.state === 'wait';
      const ctrlC = e.ctrlKey && (k === 'c' || k === 'C');
      if (k === 'Escape' || k === 'Pause' || k === 'Cancel' || (ctrlC && M.state !== 'idle')) {
        e.preventDefault();
        if (M.state !== 'idle') doBreak();
        else if (k === 'Escape') { if (inp.value) { inp.value = ''; S.dirty = true; } else api.close(); }
        return;
      }
      const f = /^F([1-8])$/.exec(k);
      if (f) { e.preventDefault(); keyCmd(KEYS[+f[1] - 1][1]); return; }
      if (busy) {
        let s = null;
        if (k.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) s = k; else s = KEYMAP[k] || null;
        if (s != null) {
          e.preventDefault();
          if (M.waitKey) { M.waitKey = false; M.state = 'run'; return; }
          if (M.keys.length < 16) M.keys.push(s);
        }
        return;
      }
      const ae = document.activeElement;
      if (ae !== inp && !(ae && /^(INPUT|TEXTAREA|BUTTON)$/.test(ae.tagName) && !W.body.contains(ae)) && !e.ctrlKey && !e.metaKey && (k.length === 1 || k === 'Backspace' || k === 'Enter')) inp.focus({ preventScroll: true });
      if (k === 'Enter') { e.preventDefault(); submit(); return; }
      if (M.state === 'idle' && (k === 'ArrowUp' || k === 'ArrowDown')) {
        e.preventDefault();
        M.hi = Math.max(0, Math.min(M.hist.length, M.hi + (k === 'ArrowUp' ? -1 : 1)));
        inp.value = M.hist[M.hi] || ''; ensureRoom(); S.dirty = true;
        setTimeout(() => { try { inp.setSelectionRange(inp.value.length, inp.value.length); } catch (err) { /* ignore */ } S.dirty = true; }, 0);
      }
    };

    api.menubar([
      { label: 'File', items: [
        { label: 'New', fn: () => typeCmd('NEW') },
        { label: 'Load example...', fn: () => typeCmd('EXAMPLES') },
        { label: 'Save', fn: () => { if (M.state !== 'idle') doBreak(); menuSave(); } },
        '-',
        { label: 'Exit', fn: () => api.close() }
      ] },
      { label: 'Help', items: [
        { label: 'How to use BASIC', fn: () => typeCmd('HELP 4') },
        { label: 'Command list', fn: () => typeCmd('HELP') }
      ] }
    ]);

    /* ---------- main loop ---------- */
    let raf = 0, ready = false, blink = true;
    function boot() {
      S.line('Horizon BASIC Version 1.10');
      S.line('(C) Copyright Horizon Software 1985');
      S.line(`${bytesFree()} Bytes free`);
      S.nl();
      S.line(' HELP      list of commands', 'HELP');
      S.line(' HELP 4    write your first program', 'HELP 4');
      S.line(' EXAMPLES  sample programs to try', 'EXAMPLES');
      if (M.prog.length) hint(`Your program${M.name ? ' ' + M.name : ''} is still in memory (${M.prog.length} line${M.prog.length === 1 ? '' : 's'}). Type LIST to see it.`);
      goIdle();
    }
    function pump(t) {
      raf = requestAnimationFrame(pump);
      if (!ready) { if (S.fit()) { ready = true; boot(); } else return; }
      if (M.state === 'wait' && !M.waitKey && performance.now() >= M.waitUntil) M.state = 'run';
      if (M.state === 'run') runSlice();
      const b = Math.floor(t / 400) % 2 === 0;
      if (b !== blink) { blink = b; if (M.state === 'idle' || M.state === 'input') S.dirty = true; }
      if (S.dirty) {
        const editing = M.state === 'idle' || M.state === 'input';
        const start = M.anchor.r * S.cols + Math.min(M.anchor.c, S.cols - 1);
        let caret = inp.value.length; try { if (document.activeElement === inp) caret = inp.selectionStart; } catch (e) { /* ignore */ }
        S.draw(editing ? { start, text: inp.value, caret, show: blink } : null);
        const txt = S.text(); if (mirror.textContent !== txt) mirror.textContent = txt; // off-screen copy for screen readers
      }
    }
    raf = requestAnimationFrame(pump);
    W.onResize = () => { if (ready) { S.fit(); ensureRoom(); S.dirty = true; } };
    W.onClose = () => { cancelAnimationFrame(raf); window.removeEventListener('keydown', noteMenu, true); stopSounds(); saveWork(); };
  }

  const CSS = `
    .bas{position:relative;height:100%;display:flex;flex-direction:column;background:#000;color:var(--phos,#33ff66);font-family:var(--dos);overflow:hidden}
    .bas-scr{position:relative;flex:1;min-height:0;display:flex;align-items:center;justify-content:center;overflow:hidden;margin:4px}
    .bas-cv{display:block;touch-action:manipulation;cursor:text;filter:drop-shadow(0 0 2px color-mix(in srgb,var(--phos,#33ff66) 45%,transparent))}
    .bas-scr .bas-in{position:absolute;left:0;top:0;width:2px;height:2px;opacity:0;border:0;padding:0;margin:0;font-size:16px;caret-color:transparent;background:transparent;color:transparent;pointer-events:none}
    .bas-sr{position:absolute;left:-9999px;top:0;width:1px;height:1px;overflow:hidden;margin:0}
    .bas-kb{display:none}
    .bas.touch .bas-kb{display:flex;gap:4px;align-items:center;padding:0 4px 4px;flex:none}
    .bas-pr{font:22px var(--dos)}
    .bas-kb .bas-in{flex:1;min-width:0;min-height:44px;box-sizing:border-box;background:#000;color:var(--phos,#33ff66);border:1px solid var(--phos,#33ff66);font:20px var(--dos);padding:6px 8px;border-radius:0}
    .bas-kb .bas-in::placeholder{color:var(--phos,#33ff66);opacity:.6}
    .bas-tb{display:flex;gap:4px;padding:0 4px 4px;flex:none;flex-wrap:wrap}
    .bas-b{flex:1 1 auto;min-width:44px;min-height:44px;background:#000;color:var(--phos,#33ff66);border:1px solid var(--phos,#33ff66);font:clamp(15px,4.4vw,19px) var(--dos);cursor:pointer;padding:2px 4px;border-radius:0;white-space:nowrap}
    .bas-kb .bas-b{flex:none}
    .bas-b:active,.bas-b:focus-visible{background:var(--phos,#33ff66);color:#000;outline:none}
    @media (hover:hover){.bas-b:hover{background:var(--phos,#33ff66);color:#000}}
    .bas-brk{border-style:double;border-width:3px}
  `;
  const ICON = '<svg viewBox="0 0 32 32" shape-rendering="crispEdges" aria-hidden="true"><rect x="1" y="2" width="30" height="23" fill="#000"/><rect x="2" y="3" width="28" height="21" fill="#c8c0a8"/><rect x="4" y="5" width="24" height="17" fill="#000"/><rect x="6" y="7" width="4" height="2" fill="#3f3"/><rect x="11" y="7" width="13" height="2" fill="#ff5"/><rect x="6" y="11" width="4" height="2" fill="#3f3"/><rect x="11" y="11" width="8" height="2" fill="#5ff"/><rect x="6" y="15" width="3" height="2" fill="#3f3"/><rect x="10" y="15" width="10" height="2" fill="#f5f"/><rect x="6" y="19" width="3" height="2" fill="#fff"/><rect x="12" y="25" width="8" height="2" fill="#8a8470"/><rect x="6" y="27" width="20" height="4" fill="#000"/><rect x="7" y="28" width="18" height="2" fill="#c8c0a8"/></svg>';

  (window.RETRO_APPS = window.RETRO_APPS || []).push({
    id: 'basic', label: 'Horizon BASIC', kind: 'builtin', cat: 'acc', cmd: 'BASIC', eras: ['1985'],
    help: 'Write and run your own programs in BASIC; type EXAMPLES for games to load and try.',
    icon: ICON, window: { w: 720, h: 560 }, css: CSS, open: openBasic
  });
})();
