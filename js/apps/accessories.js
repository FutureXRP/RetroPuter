/* Accessories: Write / Horizon Writer, Calendar, Cardfile, Clock, CD Player and Music Maker.
   Built-in programs (cat 'acc') for Horizon 3.0 (1990), Horizon 95 and Horizon 2000. */
(function () {
  const APPS = (window.RETRO_APPS = window.RETRO_APPS || []);
  const p2 = n => String(n).padStart(2, '0');
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dim = (y, m) => new Date(y, m + 1, 0).getDate();
  const escH = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const screenEra = () => { const s = document.getElementById('screen'); const m = s && s.className.match(/era-(\d{4})/); return m ? m[1] : '1995'; };
  const typing = e => { const t = e.target; return !!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)); };
  const hasDlg = W => !!W.el.querySelector('.acx-ov');
  const fmt12 = (h, m) => `${(h % 12) || 12}:${p2(m)} ${h < 12 ? 'AM' : 'PM'}`;
  const fmtHM = t => { const [h, m] = t.split(':').map(Number); return fmt12(h, m); };
  // Today's month and day, in the year the computer lives in.
  function eraToday(year) {
    const n = new Date(), m = n.getMonth();
    return { y: year, m, d: Math.min(n.getDate(), dim(year, m)) };
  }

  // A small modal dialog inside the app's window. Resolves { btn, el } (btn is null on Escape).
  function dlg(W, title, html, buttons, setup) {
    return new Promise(res => {
      const ov = document.createElement('div'); ov.className = 'acx-ov';
      ov.style.top = W.body.offsetTop + 'px';
      ov.innerHTML = `<div class="acx-box raised" role="dialog" aria-label="${escH(title)}"><div class="acx-tb">${escH(title)}</div><div class="acx-in">${html}</div><div class="acx-btns">${buttons.map((b, i) => `<button class="btn" data-i="${i}">${escH(b)}</button>`).join('')}</div></div>`;
      W.el.appendChild(ov);
      const box = ov.firstChild;
      let done = false;
      const finish = b => { if (done) return; done = true; ov.remove(); res({ btn: b, el: box }); };
      box.querySelectorAll('.acx-btns .btn').forEach(b => { b.onclick = () => finish(buttons[+b.dataset.i]); });
      ov.addEventListener('keydown', e => {
        if (e.key === 'Escape') { e.stopPropagation(); finish(null); }
        else if (e.key === 'Enter' && !/^(TEXTAREA|BUTTON)$/.test(e.target.tagName)) { e.preventDefault(); e.stopPropagation(); finish(buttons[0]); }
        else e.stopPropagation();
      });
      if (setup) setup(box, finish);
      setTimeout(() => { const f = box.querySelector('[data-focus]') || box.querySelector('input,select,textarea') || box.querySelector('.acx-btns .btn'); if (f) { f.focus(); if (f.select && f.tagName === 'INPUT') f.select(); } }, 30);
    });
  }
  const SHARED_CSS = `
    .acx-ov{position:absolute;left:0;right:0;bottom:0;z-index:50;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.18);padding:8px}
    .acx-box{padding:3px;min-width:220px;max-width:100%;max-height:100%;display:flex;flex-direction:column;overflow:auto}
    .acx-tb{background:var(--navy);color:#fff;font-weight:700;padding:2px 6px;flex:none}
    .era-2000 .acx-tb{background:linear-gradient(90deg,#0a246a,#a6caf0)}
    .acx-in{padding:10px 10px 4px;display:flex;flex-direction:column;gap:8px}
    .acx-in label{display:flex;flex-direction:column;gap:3px}
    .acx-in input[type=text],.acx-in select,.acx-in textarea{font:inherit;padding:3px 4px;border:2px solid;border-color:var(--dk) #fff #fff var(--dk);background:#fff;min-height:28px;width:100%}
    .acx-in textarea{font:12px "Courier New",monospace;min-height:70px;resize:vertical;word-break:break-all}
    .acx-list{background:#fff;height:140px;overflow:auto;display:flex;flex-direction:column}
    .acx-list button{background:none;border:0;text-align:left;padding:4px 6px;cursor:pointer;min-height:28px;display:flex;justify-content:space-between;gap:10px}
    .acx-list button.on{background:var(--navy);color:#fff}
    .acx-list .acx-empty{padding:8px;color:#808080}
    .acx-btns{display:flex;gap:6px;justify-content:center;flex-wrap:wrap;padding:8px}
    .acx-btns .btn{min-width:72px}
    .acx-note{font-size:12px;color:#404040}
  `;

  /* =====================================================================
     WRITE / WORDPRO: a word processor
     ===================================================================== */
  const WR_FONTS = {
    '1990': [['Tms Rmn', '"Times New Roman",Times,serif'], ['Helv', 'Arial,Helvetica,sans-serif'], ['Courier', '"Courier New",Courier,monospace'], ['Script', '"Brush Script MT","Comic Sans MS",cursive']],
    '1995': [['Times New Roman', '"Times New Roman",Times,serif'], ['Arial', 'Arial,Helvetica,sans-serif'], ['Courier New', '"Courier New",Courier,monospace'], ['Comic Sans MS', '"Comic Sans MS",cursive']],
    '2000': [['Times New Roman', '"Times New Roman",Times,serif'], ['Arial', 'Arial,Helvetica,sans-serif'], ['Courier New', '"Courier New",Courier,monospace'], ['Comic Sans MS', '"Comic Sans MS",cursive'], ['Georgia', 'Georgia,serif'], ['Verdana', 'Verdana,sans-serif'], ['Tahoma', 'Tahoma,sans-serif'], ['Trebuchet MS', '"Trebuchet MS",sans-serif'], ['Impact', 'Impact,sans-serif']]
  };
  const WR_SIZES = [[1, 8], [2, 10], [3, 12], [4, 14], [5, 18], [6, 24], [7, 36]];
  const I16 = inner => `<svg viewBox="0 0 16 16" width="16" height="16" shape-rendering="crispEdges" aria-hidden="true">${inner}</svg>`;
  const WR_ICONS = {
    new: I16('<path d="M3 1h7l3 3v11H3z" fill="#fff" stroke="#000"/><path d="M10 1v3h3" fill="none" stroke="#000"/>'),
    open: I16('<path d="M1 4h5l1 2h7v8H1z" fill="#ff0" stroke="#000"/><path d="M1 14l3-6h12l-3 6z" fill="#c8a000" stroke="#000"/>'),
    save: I16('<rect x="1.5" y="1.5" width="13" height="13" fill="#000080" stroke="#000"/><rect x="4" y="2" width="8" height="5" fill="#fff"/><rect x="4" y="10" width="8" height="4" fill="#c0c0c0"/>'),
    print: I16('<rect x="4.5" y="1.5" width="7" height="5" fill="#fff" stroke="#000"/><rect x="1.5" y="6.5" width="13" height="6" fill="#c0c0c0" stroke="#000"/><rect x="4.5" y="10.5" width="7" height="5" fill="#fff" stroke="#000"/><rect x="12" y="8" width="1" height="1" fill="#0a0"/>'),
    left: I16('<g fill="#000"><rect x="1" y="2" width="14" height="1"/><rect x="1" y="5" width="9" height="1"/><rect x="1" y="8" width="14" height="1"/><rect x="1" y="11" width="9" height="1"/><rect x="1" y="14" width="12" height="1"/></g>'),
    center: I16('<g fill="#000"><rect x="1" y="2" width="14" height="1"/><rect x="4" y="5" width="8" height="1"/><rect x="1" y="8" width="14" height="1"/><rect x="4" y="11" width="8" height="1"/><rect x="2" y="14" width="12" height="1"/></g>'),
    right: I16('<g fill="#000"><rect x="1" y="2" width="14" height="1"/><rect x="6" y="5" width="9" height="1"/><rect x="1" y="8" width="14" height="1"/><rect x="6" y="11" width="9" height="1"/><rect x="3" y="14" width="12" height="1"/></g>'),
    bullets: I16('<g fill="#000"><rect x="1" y="2" width="3" height="3"/><rect x="6" y="3" width="9" height="1"/><rect x="1" y="7" width="3" height="3"/><rect x="6" y="8" width="9" height="1"/><rect x="1" y="12" width="3" height="3"/><rect x="6" y="13" width="9" height="1"/></g>')
  };
  function wrTemplate(which, era, year) {
    const t = eraToday(year), date = `${MONTHS[t.m]} ${t.d}, ${year}`;
    const list = items => era === '1990' ? items.map(i => `<p>&nbsp;&nbsp;* ${i}</p>`).join('') : `<ul>${items.map(i => `<li>${i}</li>`).join('')}</ul>`;
    if (which === 'letter') return `<p style="text-align:right">${date}</p><p><br></p><p>Dear Grandma,</p><p><br></p><p>How are you? I hope you are having a wonderful week! I wanted to write you a real letter on my computer. Here is what I have been up to:</p>${list(['At school we are learning about ...', 'My favorite thing this week was ...', 'Next time I see you, I want to ...'])}<p>I made this letter all by myself, and I even picked the font. Thank you for ...</p><p><br></p><p>Love and big hugs,</p><p><br></p><p><b>(your name)</b></p><p><br></p><p><i>P.S. Please write back!</i></p>`;
    return `<p><br></p><p><br></p><p style="text-align:center"><font size="7"><b>MY REPORT</b></font></p><p style="text-align:center"><font size="5"><i>All About (your topic)</i></font></p><p><br></p><p style="text-align:center"><font size="6">* * * * *</font></p><p><br></p><p style="text-align:center"><font size="4">By (your name)</font></p><p style="text-align:center">Grade: ____&nbsp;&nbsp;&nbsp; Teacher: ______________</p><p style="text-align:center">Date due: ${date}</p><p><br></p><p><br></p><p style="text-align:center"><font size="2">Made with a word processor on my Horizon computer</font></p>`;
  }
  function wrSound(api, dot) {
    if (dot) {
      // dot-matrix: a buzzy burst of pin strikes per line, then a line-feed clunk
      for (let l = 0; l < 12; l++) {
        const base = l * 0.27;
        for (let i = 0; i < 16; i++) api.noise(0.012, { at: base + i * 0.012, ft: 'bandpass', f: 2600 + (i % 3) * 500, q: 4, vol: 0.09, decay: 1 });
        api.tone(70, 0.05, { at: base + 0.21, type: 'square', vol: 0.04 });
      }
      api.tone(110, 0.3, { at: 3.3, type: 'square', vol: 0.035, to: 60 });
    } else {
      // inkjet: a gronk, then the print head swishing back and forth
      api.tone(95, 0.35, { type: 'sawtooth', vol: 0.03, to: 140 });
      for (let p = 0; p < 8; p++) {
        const at = 0.4 + p * 0.36;
        api.noise(0.3, { at, ft: 'bandpass', f: p % 2 ? 900 : 1300, q: 3, vol: 0.05 });
        api.tone(p % 2 ? 180 : 240, 0.3, { at, type: 'triangle', vol: 0.015 });
        api.tone(130, 0.04, { at: at + 0.31, type: 'square', vol: 0.03 });
      }
    }
  }
  function openWrite(W, api) {
    const E = api.era.id, NAME = E === '1990' ? 'Write' : 'Horizon Writer', EXT = E === '1990' ? '.WRI' : '.wpr';
    const FONTS = WR_FONTS[E] || WR_FONTS['1995'];
    const baseFont = FONTS[0][1];
    let files = api.load('files', {});
    let docName = null, dirty = false, printing = false, saved = null, draftT = 0, wcT = 0;
    const tb = E === '1990' ? '' : `<div class="acw-tool">
      <button class="btn acw-tb" data-c="new" title="New">${WR_ICONS.new}</button><button class="btn acw-tb" data-c="open" title="Open">${WR_ICONS.open}</button><button class="btn acw-tb" data-c="save" title="Save">${WR_ICONS.save}</button><button class="btn acw-tb" data-c="print" title="Print">${WR_ICONS.print}</button>
      <span class="acw-sep"></span>
      <select class="acw-font" aria-label="Font">${FONTS.map(f => `<option value="${escH(f[1])}">${escH(f[0])}</option>`).join('')}</select>
      <select class="acw-size" aria-label="Size">${WR_SIZES.map(s => `<option value="${s[0]}"${s[0] === 3 ? ' selected' : ''}>${s[1]}</option>`).join('')}</select>
      <span class="acw-sep"></span>
      <button class="btn acw-tb" data-c="bold" title="Bold"><b>B</b></button><button class="btn acw-tb" data-c="italic" title="Italic"><i style="font-family:serif">I</i></button><button class="btn acw-tb" data-c="underline" title="Underline"><u>U</u></button>
      <span class="acw-sep"></span>
      <button class="btn acw-tb" data-c="justifyLeft" title="Align left">${WR_ICONS.left}</button><button class="btn acw-tb" data-c="justifyCenter" title="Center">${WR_ICONS.center}</button><button class="btn acw-tb" data-c="justifyRight" title="Align right">${WR_ICONS.right}</button><button class="btn acw-tb" data-c="insertUnorderedList" title="Bullets">${WR_ICONS.bullets}</button>
    </div>`;
    let ruler = '';
    for (let i = 0; i <= 6; i++) ruler += `<span style="left:${i * 96}px">${i || ''}</span>`;
    W.body.innerHTML = `<div class="acw e${E}">${tb}
      <div class="acw-find" hidden><span>Find:</span><input type="text" aria-label="Find what"><button class="btn" data-f="next">Find Next</button><button class="btn" data-f="x" aria-label="Close find">X</button></div>
      <div class="acw-ruler"><div class="acw-rin">${ruler}</div></div>
      <div class="acw-desk"><div class="acw-page" contenteditable="true" spellcheck="false" role="textbox" aria-multiline="true" aria-label="Document"></div></div>
      <div class="acw-stat"><span class="acw-fn"></span><span class="acw-wc"></span></div>
      <div class="acw-prn" hidden><div class="acw-pwrap"><div class="acw-slot"><div class="acw-paper"><div class="acw-pdoc"></div></div></div><div class="acw-pbox"><i></i><b></b></div><div class="acw-pmsg"></div></div></div>
    </div>`;
    const R = W.body.firstElementChild, $ = s => R.querySelector(s);
    const pg = $('.acw-page'), findBar = $('.acw-find'), findIn = findBar.querySelector('input');
    pg.style.fontFamily = baseFont;
    try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch (e) { }
    const title = () => docName || 'Untitled';
    const setT = () => { api.setTitle(`${NAME} - ${title()}${dirty ? ' *' : ''}`); $('.acw-fn').textContent = title(); };
    function words() {
      const t = pg.innerText.trim();
      const w = t ? t.split(/\s+/).length : 0;
      $('.acw-wc').textContent = `${w} word${w === 1 ? '' : 's'}, ${t.replace(/\s/g, '').length} letters`;
    }
    function changed() {
      if (!dirty) { dirty = true; setT(); }
      clearTimeout(wcT); wcT = setTimeout(words, 250);
      clearTimeout(draftT); draftT = setTimeout(saveDraft, 800);
    }
    function saveDraft() { api.save('draft', { html: pg.innerHTML, name: docName, dirty }); }
    function setDoc(html, name, isDirty) {
      pg.innerHTML = html || '<p><br></p>'; docName = name; dirty = !!isDirty; saved = null;
      setT(); words(); saveDraft(); pg.scrollTop = 0;
    }
    // keep the selection when toolbar buttons or menus take focus
    const onSel = () => {
      const s = getSelection();
      if (s.rangeCount && pg.contains(s.anchorNode)) { saved = s.getRangeAt(0).cloneRange(); refresh(); }
    };
    document.addEventListener('selectionchange', onSel);
    function focusEd() {
      pg.focus();
      if (saved && pg.contains(saved.startContainer)) { const s = getSelection(); s.removeAllRanges(); s.addRange(saved); }
    }
    function cmd(c, v) { focusEd(); try { document.execCommand(c, false, v); } catch (e) { } changed(); refresh(); }
    function refresh() {
      if (E === '1990') return;
      R.querySelectorAll('.acw-tb[data-c]').forEach(b => {
        const c = b.dataset.c;
        if (/^(bold|italic|underline|justify|insertUnorderedList)/.test(c)) { let on = false; try { on = document.queryCommandState(c); } catch (e) { } b.classList.toggle('down', on); }
      });
      try {
        const f = String(document.queryCommandValue('fontName') || '').replace(/["']/g, '').split(',')[0].trim().toLowerCase();
        const fs = $('.acw-font'); const i = FONTS.findIndex(x => x[1].replace(/["']/g, '').split(',')[0].trim().toLowerCase() === f);
        if (i >= 0) fs.selectedIndex = i;
        const sz = +document.queryCommandValue('fontSize'); if (sz >= 1 && sz <= 7) $('.acw-size').value = sz;
      } catch (e) { }
    }
    pg.addEventListener('input', changed);
    pg.addEventListener('keydown', e => { if (!e.ctrlKey && !e.metaKey && (e.key.length === 1 || e.key === 'Enter' || e.key === 'Backspace')) api.sfx.key(); });
    // toolbar
    if (E !== '1990') {
      const T = $('.acw-tool');
      T.addEventListener('pointerdown', e => { if (e.target.closest('button')) e.preventDefault(); });
      T.addEventListener('click', e => {
        const b = e.target.closest('button[data-c]'); if (!b) return;
        const c = b.dataset.c;
        if (c === 'new') newDoc(); else if (c === 'open') openDlg(); else if (c === 'save') save(); else if (c === 'print') print();
        else cmd(c);
      });
      $('.acw-font').addEventListener('change', e => cmd('fontName', e.target.value));
      $('.acw-size').addEventListener('change', e => cmd('fontSize', e.target.value));
    }
    // files
    async function discardOk() {
      if (!dirty) return true;
      const r = await api.msgBox(NAME, `Save changes to ${title()}?`, ['Yes', 'No', 'Cancel'], 'warn');
      if (r === 'Yes') return save();
      return r === 'No';
    }
    async function newDoc(tpl) {
      if (!(await discardOk())) return;
      setDoc(tpl ? wrTemplate(tpl, E, api.era.year) : '', null, !!tpl);
      focusEd();
    }
    function cleanName(n) {
      n = String(n || '').trim();
      if (E === '1990') {
        n = n.toUpperCase().replace(/\.[A-Z0-9]*$/, '').replace(/[^A-Z0-9_-]/g, '').slice(0, 8);
        return n ? n + EXT : '';
      }
      n = n.replace(/[\\/:*?"<>|]/g, '').slice(0, 40).trim();
      if (!n) return '';
      return /\.[a-z0-9]{2,4}$/i.test(n) ? n : n + EXT;
    }
    const fileList = () => Object.keys(files).sort((a, b) => a.localeCompare(b));
    const listHtml = sel => { const L = fileList(); return L.length ? L.map(n => `<button data-n="${escH(n)}" class="${n === sel ? 'on' : ''}"><span>${escH(n)}</span><span>${new Date(files[n].t).toLocaleDateString()}</span></button>`).join('') : '<div class="acx-empty">(no documents yet)</div>'; };
    function write(name) {
      files = api.load('files', {});
      files[name] = { html: pg.innerHTML, t: Date.now() };
      api.save('files', files);
      docName = name; dirty = false; setT(); saveDraft();
      api.sfx.seek(3);
      const txt = pg.innerText.trim(); api.task('write-save', { text: txt, words: txt ? txt.split(/\s+/).length : 0 });
      return true;
    }
    async function save() { return docName ? write(docName) : saveAs(); }
    async function saveAs() {
      const r = await dlg(W, 'Save As', `<label>File name:<input type="text" class="acw-nm" value="${escH(docName || (E === '1990' ? 'MYDOC' : 'My Document'))}"></label><div class="acx-list sunken">${listHtml(docName)}</div><div class="acx-note">${E === '1990' ? 'Names can be up to 8 letters or numbers.' : 'Documents are saved on this computer.'}</div>`, ['Save', 'Cancel'], (box, finish) => {
        box.querySelector('.acx-list').addEventListener('click', e => { const b = e.target.closest('[data-n]'); if (b) { box.querySelector('.acw-nm').value = b.dataset.n; } });
      });
      if (r.btn !== 'Save') return false;
      const n = cleanName(r.el.querySelector('.acw-nm').value);
      if (!n) { await api.msgBox(NAME, 'Please type a name for your document.', ['OK'], 'warn'); return saveAs(); }
      if (files[n] && n !== docName) {
        const o = await api.msgBox(NAME, `${n} already exists. Replace it?`, ['Yes', 'No'], 'warn');
        if (o !== 'Yes') return saveAs();
      }
      return write(n);
    }
    async function openDlg() {
      if (!(await discardOk())) return;
      files = api.load('files', {});
      let pick = null;
      const r = await dlg(W, 'Open', `<div>Documents:</div><div class="acx-list sunken">${listHtml(null)}</div>`, ['Open', 'Delete', 'Cancel'], (box, finish) => {
        const L = box.querySelector('.acx-list');
        L.addEventListener('click', e => {
          const b = e.target.closest('[data-n]'); if (!b) return;
          if (pick === b.dataset.n) { finish('Open'); return; }
          pick = b.dataset.n; L.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
        });
      });
      if (!pick || !files[pick]) { if (r.btn === 'Open' || r.btn === 'Delete') { if (!fileList().length) return; await api.msgBox(NAME, 'Click a document in the list first.'); return openDlg(); } return; }
      if (r.btn === 'Open') { setDoc(files[pick].html, pick, false); api.sfx.seek(4); }
      else if (r.btn === 'Delete') {
        if ((await api.msgBox(NAME, `Delete ${pick}?`, ['Yes', 'No'], 'warn')) === 'Yes') { delete files[pick]; api.save('files', files); if (docName === pick) { docName = null; dirty = true; setT(); } }
        return openDlg();
      }
    }
    // edit
    async function paste() {
      focusEd();
      try { const t = await navigator.clipboard.readText(); if (t) { document.execCommand('insertText', false, t); changed(); } }
      catch (e) { api.msgBox(NAME, 'Press Ctrl+V to paste (or long-press and choose Paste on a touch screen).'); }
    }
    function showFind() { findBar.hidden = false; findIn.focus(); findIn.select(); }
    function findNext() {
      const q = findIn.value; if (!q) { showFind(); return; }
      const nodes = [], w = document.createTreeWalker(pg, NodeFilter.SHOW_TEXT); let text = '';
      while (w.nextNode()) { nodes.push([w.currentNode, text.length]); text += w.currentNode.nodeValue; }
      let start = 0;
      if (saved && saved.endContainer.nodeType === 3) { const f = nodes.find(n => n[0] === saved.endContainer); if (f) start = f[1] + saved.endOffset; }
      const T = text.toLowerCase(), Q = q.toLowerCase();
      let i = T.indexOf(Q, start); if (i < 0) i = T.indexOf(Q);
      if (i < 0) { api.msgBox(NAME, `Cannot find "${q}".`); return; }
      const at = (pos, end) => { for (let j = nodes.length - 1; j >= 0; j--) if (end ? nodes[j][1] < pos : nodes[j][1] <= pos) return [nodes[j][0], pos - nodes[j][1]]; return [nodes[0][0], 0]; };
      const r = document.createRange(); r.setStart(...at(i, false)); r.setEnd(...at(i + q.length, true));
      saved = r; focusEd();
      const el = r.startContainer.parentElement; if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
    }
    findBar.addEventListener('click', e => { const b = e.target.closest('[data-f]'); if (!b) return; if (b.dataset.f === 'x') { findBar.hidden = true; focusEd(); } else findNext(); });
    findIn.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); findNext(); } else if (e.key === 'Escape') { findBar.hidden = true; focusEd(); } });
    // format dialogs
    async function fontDlg() {
      const r = await dlg(W, 'Font', `<label>Font:<select class="acw-df">${FONTS.map(f => `<option value="${escH(f[1])}">${escH(f[0])}</option>`).join('')}</select></label><label>Size:<select class="acw-ds">${WR_SIZES.map(s => `<option value="${s[0]}"${s[0] === 3 ? ' selected' : ''}>${s[1]} point</option>`).join('')}</select></label><div class="acw-prev sunken">AaBbYyZz 123</div>`, ['OK', 'Cancel'], box => {
        const pv = box.querySelector('.acw-prev'), f = box.querySelector('.acw-df'), s = box.querySelector('.acw-ds');
        const up = () => { pv.style.fontFamily = f.value; pv.style.fontSize = [0, 10, 13, 16, 18, 24, 32, 48][s.value] + 'px'; };
        f.onchange = s.onchange = up; up();
      });
      if (r.btn !== 'OK') return;
      cmd('fontName', r.el.querySelector('.acw-df').value); cmd('fontSize', r.el.querySelector('.acw-ds').value);
    }
    // printing
    async function print() {
      if (printing) return; printing = true;
      const P = $('.acw-prn'), paper = $('.acw-paper'), dot = E === '1990';
      $('.acw-pdoc').innerHTML = pg.innerHTML; $('.acw-pdoc').style.fontFamily = baseFont;
      $('.acw-pmsg').textContent = `Printing "${title()}" on ${dot ? 'the dot-matrix printer (LPT1)' : 'the color inkjet printer'}...`;
      P.hidden = false; R.classList.toggle('acw-dot', dot);
      paper.style.transition = 'none'; paper.style.transform = 'translateY(100%)';
      void paper.offsetHeight;
      paper.style.transition = `transform ${dot ? '3.3s steps(22)' : '3.3s steps(9)'}`;
      paper.style.transform = 'translateY(0)';
      wrSound(api, dot);
      await api.sleep(3700);
      if (!W.el.isConnected) { printing = false; return; }
      $('.acw-pmsg').textContent = 'Done! Opening the Print dialog so you can print for real or save a PDF...';
      await api.sleep(700);
      P.hidden = true; printing = false;
      realPrint();
    }
    function realPrint() {
      const ifr = document.createElement('iframe');
      ifr.setAttribute('aria-hidden', 'true');
      ifr.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0';
      document.body.appendChild(ifr);
      const d = ifr.contentDocument;
      d.open();
      d.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escH(title())}</title><style>
        @page{margin:0.9in}
        html,body{margin:0;background:#fff;color:#000}
        body{font:16px/1.35 ${baseFont};word-wrap:break-word}
        p{margin:0 0 .5em} ul{margin:0 0 .5em} font[size="7"]{line-height:1.1}
      </style></head><body>${pg.innerHTML}</body></html>`);
      d.close();
      setTimeout(() => {
        try { ifr.contentWindow.focus(); ifr.contentWindow.print(); } catch (e) { }
        setTimeout(() => ifr.remove(), 2000);
      }, 120);
    }
    const about = () => api.msgBox(`About ${NAME}`, `${NAME} ${E === '1990' ? '3.0' : E === '1995' ? '95' : '2000'}\nA word processor for Horizon.\n\nTip: try File > New Letter to Grandma. When you Print, you can pick "Save as PDF" in the Print dialog.`);
    api.menubar([
      { label: 'File', items: [
        { label: 'New', fn: () => newDoc() },
        { label: 'New Letter to Grandma', fn: () => newDoc('letter') },
        { label: 'New "My Report" Cover', fn: () => newDoc('report') },
        { label: 'Open... (Ctrl+O)', fn: openDlg },
        { label: 'Save (Ctrl+S)', fn: save },
        { label: 'Save As...', fn: saveAs },
        '-',
        { label: 'Print... (Ctrl+P)', fn: print },
        '-',
        { label: 'Exit', fn: () => api.close() }
      ] },
      { label: 'Edit', items: [
        { label: 'Undo (Ctrl+Z)', fn: () => cmd('undo') },
        '-',
        { label: 'Cut (Ctrl+X)', fn: () => cmd('cut') },
        { label: 'Copy (Ctrl+C)', fn: () => { focusEd(); try { document.execCommand('copy'); } catch (e) { } } },
        { label: 'Paste (Ctrl+V)', fn: paste },
        '-',
        { label: 'Select All (Ctrl+A)', fn: () => { pg.focus(); const r = document.createRange(); r.selectNodeContents(pg); const s = getSelection(); s.removeAllRanges(); s.addRange(r); saved = r.cloneRange(); } },
        { label: 'Find... (Ctrl+F)', fn: showFind },
        { label: 'Find Next (F3)', fn: findNext }
      ] },
      { label: 'Format', items: () => [
        { label: 'Bold (Ctrl+B)', fn: () => cmd('bold') },
        { label: 'Italic (Ctrl+I)', fn: () => cmd('italic') },
        { label: 'Underline (Ctrl+U)', fn: () => cmd('underline') },
        { label: 'Plain Text', fn: () => cmd('removeFormat') },
        '-',
        { label: 'Fonts...', fn: fontDlg },
        { label: 'Bigger Text', fn: () => { let s = 3; try { s = +document.queryCommandValue('fontSize') || 3; } catch (e) { } cmd('fontSize', Math.min(7, s + 1)); } },
        { label: 'Smaller Text', fn: () => { let s = 3; try { s = +document.queryCommandValue('fontSize') || 3; } catch (e) { } cmd('fontSize', Math.max(1, s - 1)); } },
        '-',
        { label: 'Align Left', fn: () => cmd('justifyLeft') },
        { label: 'Center', fn: () => cmd('justifyCenter') },
        { label: 'Align Right', fn: () => cmd('justifyRight') }
      ].concat(E === '1990' ? [] : [{ label: 'Bullet List', fn: () => cmd('insertUnorderedList') }]) },
      { label: 'Help', items: [{ label: `About ${NAME}`, fn: about }] }
    ]);
    W.onKey = e => {
      if (hasDlg(W)) return;
      const c = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
      if (c && k === 's') { e.preventDefault(); e.shiftKey ? saveAs() : save(); }
      else if (c && k === 'o') { e.preventDefault(); openDlg(); }
      else if (c && k === 'p') { e.preventDefault(); print(); }
      else if (c && k === 'f') { e.preventDefault(); showFind(); }
      else if (c && k === 'n') { e.preventDefault(); newDoc(); }
      else if (e.key === 'F3') { e.preventDefault(); findNext(); }
    };
    W.onClose = () => {
      document.removeEventListener('selectionchange', onSel);
      clearTimeout(wcT); clearTimeout(draftT); saveDraft();
    };
    const dr = api.load('draft', null);
    if (dr && dr.html) setDoc(dr.html, dr.name, dr.dirty); else setDoc('', null, false);
    setTimeout(() => { pg.focus(); }, 60);
  }
  const WRITE_CSS = SHARED_CSS + `
    .acw{height:100%;display:flex;flex-direction:column;position:relative;min-width:0}
    .acw-tool{display:flex;flex-wrap:wrap;align-items:center;gap:2px;padding:2px 3px 3px;border-bottom:1px solid var(--dk);flex:none}
    .acw-tool .acw-tb{min-width:0;width:28px;height:28px;padding:0;display:grid;place-items:center;font:14px/1 "Times New Roman",serif}
    .acw-tool .acw-tb:active,.acw-tool .acw-tb.down{padding:1px 0 0 1px}
    .acw-tool .acw-tb.down{background:#e8e8e8 repeating-conic-gradient(#c0c0c0 0 25%,#fff 0 50%) 0 0/2px 2px}
    .acw-tool select{font:inherit;height:26px;border:2px solid;border-color:var(--dk) #fff #fff var(--dk);background:#fff;max-width:132px}
    .acw-tool .acw-size{width:52px}
    .acw-sep{width:6px}
    .acw.e2000 .acw-tool{background:linear-gradient(#f4f3ee,#d8d4c8)}
    .acw.e2000 .acw-tool .acw-tb{background:transparent;border-color:transparent;box-shadow:none}
    .acw.e2000 .acw-tool .acw-tb:hover{border-color:#fff #808080 #808080 #fff}
    .acw.e2000 .acw-tool .acw-tb.down,.acw.e2000 .acw-tool .acw-tb:active{border-color:#808080 #fff #fff #808080}
    .acw-find{display:flex;align-items:center;gap:4px;padding:3px;flex:none;flex-wrap:wrap}
    .acw-find[hidden]{display:none}
    .acw-find input{flex:1;min-width:90px;font:inherit;height:26px;border:2px solid;border-color:var(--dk) #fff #fff var(--dk)}
    .acw-find .btn{min-width:0;padding:3px 10px}
    .acw-ruler{flex:none;background:#fff;border-top:1px solid var(--dk);border-bottom:1px solid var(--dk);height:20px;overflow:hidden;padding:0 12px}
    .acw.e1990 .acw-ruler{background:var(--gray)}
    .acw-rin{position:relative;max-width:624px;margin:0 auto;height:100%;font-size:10px;
      background:repeating-linear-gradient(90deg,#000 0 1px,transparent 1px 12px) 0 100%/100% 3px no-repeat,repeating-linear-gradient(90deg,#000 0 1px,transparent 1px 48px) 0 100%/100% 6px no-repeat}
    .acw-rin span{position:absolute;top:0;transform:translateX(-50%)}
    .acw-desk{flex:1;min-height:0;overflow:auto;background:var(--dk);padding:10px;display:flex}
    .acw.e1990 .acw-desk{background:#fff;padding:0}
    .acw-page{background:#fff;flex:1;max-width:648px;margin:0 auto;min-height:100%;height:max-content;padding:24px 12px 60px;outline:none;font-size:16px;line-height:1.35;box-shadow:2px 2px 0 #000;word-wrap:break-word;overflow-wrap:anywhere;width:100%;cursor:text;user-select:text;-webkit-user-select:text}
    .acw.e1990 .acw-page{box-shadow:none}
    .acw-page p{margin:0 0 .5em}
    .acw-page ul{margin:0 0 .5em;padding-left:1.6em}
    .acw-stat{flex:none;display:flex;justify-content:space-between;gap:10px;padding:2px 4px;font-size:12px;border-top:1px solid #fff}
    .acw-stat span{border:1px solid;border-color:var(--dk) #fff #fff var(--dk);padding:0 6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .acw-prn{position:absolute;inset:0;z-index:40;background:rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center}
    .acw-prn[hidden]{display:none}
    .acw-pwrap{display:flex;flex-direction:column;align-items:center;width:230px;max-width:90%}
    .acw-slot{width:150px;height:170px;overflow:hidden;position:relative;margin-bottom:-6px}
    .acw-paper{position:absolute;left:10px;right:10px;bottom:0;height:170px;background:#fff;border:1px solid #000;border-bottom:0;overflow:hidden;transform:translateY(100%)}
    .acw-dot .acw-paper{left:0;right:0;background:#fff;border-left:12px solid #f4f4f4;border-right:12px solid #f4f4f4;box-shadow:inset 1px 0 #999,inset -1px 0 #999}
    .acw-dot .acw-paper::before,.acw-dot .acw-paper::after{content:"";position:absolute;top:4px;bottom:0;width:6px;background:radial-gradient(circle,#666 1.6px,transparent 2px) 0 0/6px 12px}
    .acw-dot .acw-paper::before{left:-9px}.acw-dot .acw-paper::after{right:-9px}
    .acw-pdoc{width:520px;transform:scale(.24);transform-origin:0 0;padding:20px;font-size:16px;line-height:1.35;color:#000}
    .acw-dot .acw-pdoc{font-family:"Courier New",monospace !important;filter:contrast(.8)}
    .acw-pdoc p{margin:0 0 .5em}
    .acw-pbox{width:200px;height:56px;background:linear-gradient(#e8e4d8,#b8b4a8);border:2px solid;border-color:#fff #404040 #404040 #fff;position:relative;box-shadow:2px 3px 0 rgba(0,0,0,.4)}
    .acw-dot .acw-pbox{background:linear-gradient(#d8d0b8,#a89c80)}
    .acw-pbox::before{content:"";position:absolute;left:24px;right:24px;top:6px;height:5px;background:#202020}
    .acw-pbox i{position:absolute;right:12px;bottom:10px;width:6px;height:6px;background:#0c0;border:1px solid #040}
    .acw-pbox b{position:absolute;left:12px;bottom:10px;width:40px;height:6px;background:#888;border:1px solid #444}
    .acw-pmsg{margin-top:10px;background:var(--gray);border:2px solid;border-color:#fff #000 #000 #fff;padding:6px 10px;text-align:center;font-size:12px}
    .acw-prev{background:#fff;padding:6px;height:60px;overflow:hidden;white-space:nowrap}
  `;

  /* =====================================================================
     CALENDAR
     ===================================================================== */
  const HOLIDAYS = { '0-1': "New Year's Day", '1-14': "Valentine's Day", '2-17': "St. Patrick's Day", '3-1': "April Fools' Day", '5-14': 'Flag Day', '6-4': 'Independence Day', '9-31': 'Halloween', '10-11': 'Veterans Day', '11-24': 'Christmas Eve', '11-25': 'Christmas Day', '11-31': "New Year's Eve" };
  const dkey = (y, m, d) => `${y}-${p2(m + 1)}-${p2(d)}`;
  function openCalendar(W, api) {
    const E = api.era.id;
    let data = api.load('days', {});
    let today = eraToday(api.era.year);
    let sel = Object.assign({}, today), view = { y: today.y, m: today.m };
    const fired = {};
    W.body.innerHTML = `<div class="acl e${E}">
      <div class="acl-mon">
        <div class="acl-head"><button class="btn acl-nav" data-n="-1" aria-label="Previous month">&lt;</button><b class="acl-title"></b><button class="btn acl-nav" data-n="1" aria-label="Next month">&gt;</button></div>
        <div class="acl-grid sunken" role="grid"></div>
        <div class="acl-foot"><button class="btn" data-a="today">Today</button><span class="acl-now"></span></div>
      </div>
      <div class="acl-day">
        <div class="acl-dt"></div>
        <div class="acl-list sunken"></div>
        <div class="acl-add">
          <input type="time" class="acl-t" value="09:00" aria-label="Time">
          <input type="text" class="acl-x" maxlength="60" placeholder="New appointment..." aria-label="Appointment">
          <label class="acl-al"><input type="checkbox" class="acl-a"> Alarm</label>
          <button class="btn" data-a="add">Add</button>
        </div>
        <textarea class="acl-note sunken" placeholder="Notes for this day..." aria-label="Notes for this day"></textarea>
      </div>
    </div>`;
    const R = W.body.firstElementChild, $ = s => R.querySelector(s);
    const day = (k, make) => { if (!data[k] && make) data[k] = { note: '', appts: [] }; return data[k]; };
    const store = () => {
      Object.keys(data).forEach(k => { const d = data[k]; if (!d.note && !d.appts.length) delete data[k]; });
      api.save('days', data);
    };
    function renderMonth() {
      $('.acl-title').textContent = `${MONTHS[view.m]} ${view.y}`;
      const first = new Date(view.y, view.m, 1).getDay(), n = dim(view.y, view.m);
      let h = DAYS.map(d => `<div class="acl-wd" role="columnheader">${d[0]}<span>${d.slice(1, 3)}</span></div>`).join('');
      for (let i = 0; i < first; i++) h += '<div class="acl-blank"></div>';
      for (let d = 1; d <= n; d++) {
        const k = dkey(view.y, view.m, d), hol = HOLIDAYS[`${view.m}-${d}`], it = data[k];
        const isT = view.y === today.y && view.m === today.m && d === today.d, isS = view.y === sel.y && view.m === sel.m && d === sel.d;
        const dow = (first + d - 1) % 7;
        h += `<button class="acl-c${isT ? ' today' : ''}${isS ? ' sel' : ''}${hol ? ' hol' : ''}${dow === 0 ? ' sun' : ''}" data-d="${d}" role="gridcell" aria-label="${MONTHS[view.m]} ${d}${hol ? ', ' + hol : ''}${it && it.appts.length ? ', ' + it.appts.length + ' appointments' : ''}"><span class="acl-num">${d}</span>${hol ? `<span class="acl-hn">${escH(hol)}</span>` : ''}${it && (it.appts.length || it.note) ? '<i class="acl-dot"></i>' : ''}</button>`;
      }
      $('.acl-grid').innerHTML = h;
    }
    function renderDay() {
      const k = dkey(sel.y, sel.m, sel.d), it = day(k), hol = HOLIDAYS[`${sel.m}-${sel.d}`];
      const dow = new Date(sel.y, sel.m, sel.d).getDay();
      $('.acl-dt').innerHTML = `<b>${DAYS[dow]}, ${MONTHS[sel.m]} ${sel.d}, ${sel.y}</b>${hol ? `<span class="acl-hday">${escH(hol)}</span>` : ''}`;
      const A = it ? it.appts.slice().sort((a, b) => (a.t || '').localeCompare(b.t || '')) : [];
      $('.acl-list').innerHTML = A.length ? A.map(a => `<div class="acl-ap"><span class="acl-at">${a.t ? fmtHM(a.t) : ''}</span><span class="acl-ax">${a.alarm ? '<i class="acl-bell" title="Alarm set"></i>' : ''}${escH(a.text)}</span><button class="btn acl-del" data-id="${a.id}" aria-label="Delete ${escH(a.text)}">X</button></div>`).join('') : '<div class="acl-none">No appointments. Type one below and press Add.</div>';
      $('.acl-note').value = it ? it.note : '';
    }
    const render = () => { renderMonth(); renderDay(); };
    function go(y, m, d) {
      const dt = new Date(y, m, d);
      sel = { y: dt.getFullYear(), m: dt.getMonth(), d: dt.getDate() };
      view = { y: sel.y, m: sel.m };
      render();
    }
    function moveMonth(n) {
      const t = new Date(view.y, view.m + n, 1);
      go(t.getFullYear(), t.getMonth(), Math.min(sel.d, dim(t.getFullYear(), t.getMonth())));
      api.sfx.click();
    }
    function add() {
      const x = $('.acl-x').value.trim();
      if (!x) { $('.acl-x').focus(); return; }
      const t = $('.acl-t').value || '';
      day(dkey(sel.y, sel.m, sel.d), true).appts.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5), t, text: x, alarm: $('.acl-a').checked && !!t });
      store(); $('.acl-x').value = ''; $('.acl-a').checked = false; render(); api.sfx.blip ? api.sfx.blip(900) : api.sfx.click();
      api.task('calendar-add', { month: sel.m + 1, day: sel.d, text: x });
    }
    R.addEventListener('click', e => {
      const c = e.target.closest('.acl-c'); if (c) { go(view.y, view.m, +c.dataset.d); return; }
      const n = e.target.closest('.acl-nav'); if (n) { moveMonth(+n.dataset.n); return; }
      const del = e.target.closest('.acl-del');
      if (del) { const it = day(dkey(sel.y, sel.m, sel.d)); if (it) { it.appts = it.appts.filter(a => a.id !== del.dataset.id); store(); render(); } return; }
      const a = e.target.closest('[data-a]'); if (!a) return;
      if (a.dataset.a === 'today') { today = eraToday(api.era.year); go(today.y, today.m, today.d); }
      else if (a.dataset.a === 'add') add();
    });
    $('.acl-x').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); add(); } });
    let nt = 0;
    $('.acl-note').addEventListener('input', e => {
      const k = dkey(sel.y, sel.m, sel.d), it = day(k, true); it.note = e.target.value;
      clearTimeout(nt); nt = setTimeout(() => { store(); renderMonth(); }, 600);
    });
    async function gotoDlg() {
      const r = await dlg(W, 'Go To Date', `<label>Month:<select class="acl-gm">${MONTHS.map((m, i) => `<option value="${i}"${i === view.m ? ' selected' : ''}>${m}</option>`).join('')}</select></label><label>Day:<input type="text" inputmode="numeric" class="acl-gd" value="${sel.d}"></label><label>Year:<input type="text" inputmode="numeric" class="acl-gy" value="${view.y}"></label>`, ['OK', 'Cancel']);
      if (r.btn !== 'OK') return;
      const m = +r.el.querySelector('.acl-gm').value, y = Math.max(1900, Math.min(2099, parseInt(r.el.querySelector('.acl-gy').value, 10) || view.y));
      const d = Math.max(1, Math.min(dim(y, m), parseInt(r.el.querySelector('.acl-gd').value, 10) || 1));
      go(y, m, d);
    }
    async function clearDay() {
      const k = dkey(sel.y, sel.m, sel.d);
      if (!data[k]) return;
      if ((await api.msgBox('Calendar', `Remove all appointments and notes for ${MONTHS[sel.m]} ${sel.d}?`, ['Yes', 'No'], 'warn')) === 'Yes') { delete data[k]; store(); render(); }
    }
    api.menubar([
      { label: 'Show', items: [
        { label: 'Today (Home)', fn: () => { today = eraToday(api.era.year); go(today.y, today.m, today.d); } },
        { label: 'Previous Month (PgUp)', fn: () => moveMonth(-1) },
        { label: 'Next Month (PgDn)', fn: () => moveMonth(1) },
        { label: 'Go To Date...', fn: gotoDlg }
      ] },
      { label: 'Edit', items: [
        { label: 'New Appointment (Enter)', fn: () => $('.acl-x').focus() },
        { label: 'Remove Everything This Day', fn: clearDay }
      ] },
      { label: 'Help', items: [{ label: 'How to use Calendar', fn: () => api.msgBox('Calendar', 'Click a day to see it. Type an appointment, pick a time and press Add.\n\nTick "Alarm" and Calendar will beep and remind you when that time comes (while Calendar is open).\n\nKeys: arrow keys move between days, Page Up / Page Down change the month, Home goes to today.') }] }
    ]);
    W.onKey = e => {
      if (hasDlg(W) || typing(e)) return;
      const mv = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
      if (mv) { e.preventDefault(); go(sel.y, sel.m, sel.d + mv); api.sfx.click(); }
      else if (e.key === 'PageUp') { e.preventDefault(); moveMonth(-1); }
      else if (e.key === 'PageDown') { e.preventDefault(); moveMonth(1); }
      else if (e.key === 'Home') { e.preventDefault(); today = eraToday(api.era.year); go(today.y, today.m, today.d); }
      else if (e.key === 'Enter') { e.preventDefault(); $('.acl-x').focus(); }
    };
    function ring(a) {
      for (let i = 0; i < 6; i++) { api.tone(1046, 0.12, { at: i * 0.3, vol: 0.07 }); api.tone(1318, 0.12, { at: i * 0.3 + 0.14, vol: 0.07 }); }
      api.msgBox('Calendar Reminder', `${fmtHM(a.t)}\n\n${a.text}`, ['OK'], 'info');
    }
    function tick() {
      const n = new Date();
      $('.acl-now').textContent = fmt12(n.getHours(), n.getMinutes());
      const t = eraToday(api.era.year);
      if (t.d !== today.d || t.m !== today.m) { today = t; renderMonth(); }
      const hm = `${p2(n.getHours())}:${p2(n.getMinutes())}`, it = data[dkey(today.y, today.m, today.d)];
      if (it) it.appts.forEach(a => { if (a.alarm && a.t === hm && !fired[a.id + hm]) { fired[a.id + hm] = 1; ring(a); } });
    }
    const iv = setInterval(tick, 1000);
    W.onClose = () => { clearInterval(iv); clearTimeout(nt); store(); };
    render(); tick();
  }
  const CAL_CSS = `
    .acl{display:flex;flex-wrap:wrap;gap:8px;padding:8px;min-height:100%;align-content:flex-start}
    .acl-mon{flex:1 1 300px;display:flex;flex-direction:column;gap:4px;min-width:0}
    .acl-day{flex:1 1 220px;display:flex;flex-direction:column;gap:6px;min-width:0}
    .acl-head{display:flex;align-items:center;gap:6px}
    .acl-head .btn{min-width:0;width:36px;height:30px;padding:0;font-weight:700}
    .acl-title{flex:1;text-align:center;font-size:15px}
    .acl-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));background:#fff}
    .acl-wd{text-align:center;font-weight:700;font-size:11px;padding:2px 0;border-bottom:1px solid #808080;background:#e0e0e0}
    .acl-c{position:relative;background:#fff;border:0;border-right:1px solid #d0d0d0;border-bottom:1px solid #d0d0d0;min-height:40px;padding:2px 3px;text-align:left;vertical-align:top;cursor:pointer;display:flex;flex-direction:column;align-items:flex-start;overflow:hidden;font:inherit}
    .acl-num{font-weight:700;font-size:13px}
    .acl-hn{font-size:9px;line-height:1.1;color:#a00000;max-width:100%}
    .acl-c.hol .acl-num,.acl-c.sun .acl-num{color:#c00000}
    .acl-c.today{box-shadow:inset 0 0 0 2px #c00000}
    .acl-c.sel{background:var(--navy);color:#fff}
    .acl-c.sel .acl-num,.acl-c.sel .acl-hn{color:#fff}
    .acl-dot{position:absolute;right:3px;top:4px;width:6px;height:6px;background:#008000;border:1px solid #004000}
    .acl-foot{display:flex;align-items:center;justify-content:space-between;gap:6px}
    .acl-foot .btn{min-width:0}
    .acl-now{font-family:var(--dos);font-size:18px;padding:0 6px}
    .acl-dt{display:flex;flex-direction:column;background:#fff;border:1px solid #808080;padding:4px 8px}
    .acl-hday{color:#a00000;font-weight:700}
    .acl-list{background:#fff;min-height:96px;max-height:180px;overflow:auto}
    .acl-ap{display:flex;align-items:center;gap:6px;padding:2px 4px;border-bottom:1px dotted #a0a0a0}
    .acl-at{flex:none;width:66px;font-weight:700;font-size:12px}
    .acl-ax{flex:1;min-width:0;word-break:break-word}
    .acl-del{min-width:0;width:28px;height:26px;padding:0;font-size:11px}
    .acl-bell{display:inline-block;width:9px;height:10px;margin-right:4px;background:#c08000;border-radius:4px 4px 1px 1px;vertical-align:-1px;box-shadow:0 2px 0 -1px #804000}
    .acl-none{padding:8px;color:#606060;font-size:12px}
    .acl-add{display:flex;flex-wrap:wrap;gap:4px;align-items:center}
    .acl-add input[type=time]{width:112px}
    .acl-add input[type=time],.acl-add input[type=text]{font:inherit;height:30px;border:2px solid;border-color:var(--dk) #fff #fff var(--dk);background:#fff;padding:2px 4px}
    .acl-x{flex:1 1 120px;min-width:0}
    .acl-add .btn{min-width:0;padding:4px 12px}
    .acl-al{display:flex;align-items:center;gap:3px;white-space:nowrap}
    .acl-al input{width:18px;height:18px}
    .acl-note{font:inherit;min-height:64px;resize:vertical;padding:4px;background:#fff;flex:1}
    .acl.e1990 .acl-c.sel{background:#000}
    .acl.e1990 .acl-wd{background:#fff}
    .acl.e2000 .acl-wd{background:linear-gradient(#fff,#d4d0c8)}
    .acl.e2000 .acl-title{color:#0a246a}
    .acl.e2000 .acl-c.sel{background:#316ac5}
    .acl-wd span{display:inline}
    @media (max-width:520px){.acl-wd span{display:none}.acl-hn{display:none}.acl-c{min-height:36px}}
  `;

  /* =====================================================================
     CARDFILE
     ===================================================================== */
  const CF_SAMPLE = [
    { name: 'Clubhouse Rules', text: '1. No grown-ups (except with snacks).\n2. Secret knock: knock, knock-knock, knock.\n3. Everybody helps clean up.' },
    { name: 'Goldfish - Bubbles', text: 'Feed a tiny pinch of flakes every morning.\nClean the bowl on Saturdays.\nFavorite thing: hiding in the castle.' },
    { name: 'Library Books', text: 'Due back Friday!\n- The big book about volcanoes\n- The joke book\n- A mystery story' },
    { name: 'Pancakes', text: '1 cup flour\n1 cup milk\n1 egg\n1 tablespoon sugar\n2 teaspoons baking powder\nA pinch of salt\n(Ask a grown-up to help at the stove.)' }
  ];
  function openCardfile(W, api) {
    const E = api.era.id;
    let cards = api.load('cards', null);
    if (!cards) cards = CF_SAMPLE.map((c, i) => Object.assign({ id: 'c' + i }, c));
    let cur = 0, mode = 'card', saveT = 0, lastFind = '';
    const sortCards = () => cards.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    sortCards();
    W.body.innerHTML = `<div class="acf e${E}">
      <div class="acf-bar">
        <button class="btn acf-nb" data-a="prev" aria-label="Previous card">&lt;</button><button class="btn acf-nb" data-a="next" aria-label="Next card">&gt;</button>
        <span class="acf-count"></span>
        <button class="btn" data-a="add">Add</button><button class="btn" data-a="del">Delete</button><button class="btn" data-a="view">List</button>
        <input type="text" class="acf-q" placeholder="Search..." aria-label="Search cards">
      </div>
      <div class="acf-area"><div class="acf-stack"></div><div class="acf-listv sunken" hidden></div></div>
    </div>`;
    const R = W.body.firstElementChild, $ = s => R.querySelector(s);
    const persist = c => { clearTimeout(saveT); saveT = setTimeout(() => { api.save('cards', cards); if (c) api.task('cardfile-add', { title: c.name, text: c.text }); }, 400); };
    function flipSound() { api.noise(0.05, { ft: 'bandpass', f: 3000, q: 1, vol: 0.12, decay: 1 }); }
    function render(anim) {
      const n = cards.length;
      $('.acf-count').textContent = `${n} Card${n === 1 ? '' : 's'}`;
      $('.acf-stack').hidden = mode !== 'card'; $('.acf-listv').hidden = mode !== 'list';
      $('[data-a=view]').textContent = mode === 'card' ? 'List' : 'Cards';
      if (mode === 'list') {
        $('.acf-listv').innerHTML = n ? cards.map((c, i) => `<button class="${i === cur ? 'on' : ''}" data-i="${i}">${escH(c.name || '(untitled)')}</button>`).join('') : '<div class="acf-empty">No cards yet.</div>';
        return;
      }
      if (!n) { $('.acf-stack').innerHTML = '<div class="acf-empty">No cards yet. Press Add to make your first card.</div>'; return; }
      const behind = Math.min(n - 1, 4);
      let h = '';
      for (let i = behind; i >= 1; i--) {
        const c = cards[(cur + i) % n];
        h += `<button class="acf-card acf-back" style="--i:${i}" data-i="${(cur + i) % n}" aria-label="Go to ${escH(c.name)}"><span class="acf-idx">${escH(c.name || '(untitled)')}</span></button>`;
      }
      const c = cards[cur];
      h += `<div class="acf-card acf-front${anim ? ' acf-flip' : ''}" style="--i:0"><input class="acf-idx acf-name" maxlength="40" value="${escH(c.name)}" aria-label="Index line"><textarea class="acf-text" aria-label="Card text">${escH(c.text)}</textarea></div>`;
      const S = $('.acf-stack'); S.style.setProperty('--b', behind); S.innerHTML = h;
    }
    function go(i, anim) { if (!cards.length) return; cur = (i + cards.length) % cards.length; render(anim); if (anim) flipSound(); }
    async function add() {
      const r = await dlg(W, 'Add', `<label>Index line (the card's name):<input type="text" class="acf-nn" maxlength="40" value=""></label>`, ['OK', 'Cancel']);
      if (r.btn !== 'OK') return;
      const name = r.el.querySelector('.acf-nn').value.trim() || 'New Card';
      const c = { id: 'c' + Date.now().toString(36), name, text: '' };
      cards.push(c); sortCards(); cur = cards.indexOf(c); mode = 'card'; persist(c); render(true); flipSound();
      setTimeout(() => { const t = $('.acf-text'); t && t.focus(); }, 50);
    }
    async function del() {
      if (!cards.length) return;
      const c = cards[cur];
      if ((await api.msgBox('Cardfile', `Delete "${c.name}"?`, ['OK', 'Cancel'], 'warn')) !== 'OK') return;
      cards.splice(cur, 1); if (cur >= cards.length) cur = 0; persist(); render(true);
    }
    function find(q, fromNext) {
      q = (q || '').trim().toLowerCase(); if (!q || !cards.length) return false;
      for (let k = fromNext ? 1 : 0; k <= cards.length; k++) {
        const i = (cur + k) % cards.length, c = cards[i];
        if ((c.name + '\n' + c.text).toLowerCase().includes(q)) { if (i !== cur || mode !== 'card') { mode = 'card'; go(i, true); } return true; }
      }
      return false;
    }
    async function gotoDlg() {
      const r = await dlg(W, 'Go To', `<label>Go to the card whose index line has:<input type="text" class="acf-gt"></label>`, ['OK', 'Cancel']);
      if (r.btn !== 'OK') return;
      const q = r.el.querySelector('.acf-gt').value.trim().toLowerCase();
      const i = cards.findIndex(c => c.name.toLowerCase().includes(q));
      if (i < 0) api.msgBox('Cardfile', `No card's index line has "${q}".`); else { mode = 'card'; go(i, true); }
    }
    async function findDlg() {
      const r = await dlg(W, 'Find', `<label>Find text on any card:<input type="text" class="acf-ft" value="${escH(lastFind)}"></label>`, ['Find Next', 'Cancel']);
      if (r.btn !== 'Find Next') return;
      lastFind = r.el.querySelector('.acf-ft').value;
      if (!find(lastFind, true)) api.msgBox('Cardfile', `Cannot find "${lastFind}".`);
    }
    R.addEventListener('click', e => {
      const b = e.target.closest('.acf-back'); if (b) { go(+b.dataset.i, true); return; }
      const l = e.target.closest('.acf-listv [data-i]'); if (l) { cur = +l.dataset.i; mode = 'card'; render(true); flipSound(); return; }
      const a = e.target.closest('[data-a]'); if (!a) return;
      const k = a.dataset.a;
      if (k === 'prev') go(cur - 1, true); else if (k === 'next') go(cur + 1, true);
      else if (k === 'add') add(); else if (k === 'del') del();
      else if (k === 'view') { mode = mode === 'card' ? 'list' : 'card'; render(); }
    });
    R.addEventListener('input', e => {
      if (!cards[cur]) return;
      if (e.target.classList.contains('acf-text')) { cards[cur].text = e.target.value; persist(cards[cur]); }
      else if (e.target.classList.contains('acf-name')) { cards[cur].name = e.target.value; persist(cards[cur]); }
      else if (e.target.classList.contains('acf-q')) { if (e.target.value.trim()) find(e.target.value, false); }
    });
    R.addEventListener('change', e => {
      if (e.target.classList.contains('acf-name')) {
        const c = cards[cur]; c.name = c.name.trim() || 'Untitled'; sortCards(); cur = cards.indexOf(c); persist(); render();
      }
    });
    $('.acf-q').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); if (!find(e.target.value, true)) api.sfx.beep(); } });
    R.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.classList.contains('acf-name')) { e.preventDefault(); e.target.blur(); } });
    api.menubar([
      { label: 'Card', items: [
        { label: 'Add... (F7)', fn: add },
        { label: 'Delete', fn: del },
        '-',
        { label: 'Previous (PgUp)', fn: () => go(cur - 1, true) },
        { label: 'Next (PgDn)', fn: () => go(cur + 1, true) },
        '-',
        { label: 'Exit', fn: () => api.close() }
      ] },
      { label: 'View', items: () => [
        { label: (mode === 'card' ? '✓ ' : '') + 'Card', fn: () => { mode = 'card'; render(); } },
        { label: (mode === 'list' ? '✓ ' : '') + 'List', fn: () => { mode = 'list'; render(); } }
      ] },
      { label: 'Search', items: [
        { label: 'Go To... (F4)', fn: gotoDlg },
        { label: 'Find...', fn: findDlg },
        { label: 'Find Next (F3)', fn: () => { if (lastFind && !find(lastFind, true)) api.msgBox('Cardfile', `Cannot find "${lastFind}".`); else if (!lastFind) findDlg(); } }
      ] },
      { label: 'Help', items: [{ label: 'How to use Cardfile', fn: () => api.msgBox('Cardfile', 'Cardfile keeps a stack of index cards, sorted A to Z by the top line (the index line).\n\nClick a card in the back of the stack to bring it to the front. Type right on the card to change it.\n\nKeys: Page Up / Page Down flip cards, F7 adds a card, F4 goes to a card, F3 finds the next match.') }] }
    ]);
    W.onKey = e => {
      if (hasDlg(W)) return;
      if (e.key === 'PageUp') { e.preventDefault(); go(cur - 1, true); }
      else if (e.key === 'PageDown') { e.preventDefault(); go(cur + 1, true); }
      else if (e.key === 'F7') { e.preventDefault(); add(); }
      else if (e.key === 'F4') { e.preventDefault(); gotoDlg(); }
      else if (e.key === 'F3') { e.preventDefault(); if (lastFind) find(lastFind, true); else findDlg(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') { e.preventDefault(); findDlg(); }
      else if (!typing(e) && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { e.preventDefault(); go(cur + (e.key === 'ArrowLeft' ? -1 : 1), true); }
    };
    W.onClose = () => { clearTimeout(saveT); api.save('cards', cards); };
    render();
  }
  const CF_CSS = `
    .acf{height:100%;display:flex;flex-direction:column;min-height:260px}
    .acf-bar{display:flex;flex-wrap:wrap;align-items:center;gap:4px;padding:4px;flex:none;border-bottom:1px solid var(--dk)}
    .acf-bar .btn{min-width:0;padding:4px 10px;min-height:30px}
    .acf-bar .acf-nb{width:34px;padding:0;font-weight:700}
    .acf-count{padding:0 6px;font-weight:700;white-space:nowrap}
    .acf-q{flex:1 1 100px;min-width:80px;font:inherit;height:30px;border:2px solid;border-color:var(--dk) #fff #fff var(--dk);padding:2px 4px}
    .acf-area{flex:1;min-height:0;position:relative;background:var(--teal,#008080);overflow:auto;padding:12px}
    .acf.e1990 .acf-area{background:#fff}
    .acf.e2000 .acf-area{background:linear-gradient(#3a6ea5,#6c96c4)}
    .acf-stack{position:relative;height:100%;min-height:230px;max-width:640px;margin:0 auto;--b:0}
    .acf-card{position:absolute;left:calc(var(--i) * 14px);top:calc((var(--b) - var(--i)) * 24px);right:calc((var(--b) - var(--i)) * 14px);bottom:calc(var(--i) * 24px);background:#fff;border:1px solid #000;box-shadow:2px 2px 0 rgba(0,0,0,.35);display:flex;flex-direction:column;text-align:left;padding:0;font:inherit;color:#000}
    .acf-back{cursor:pointer;justify-content:flex-start}
    .acf-idx{display:block;width:100%;border:0;border-bottom:3px double #c00000;padding:3px 8px;font:700 14px/1.3 var(--ui);background:transparent;min-height:26px;color:#000;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .acf-name{outline:none}
    .acf-name:focus{background:#ffffe0}
    .acf-text{flex:1;border:0;resize:none;outline:none;padding:0 8px;font:15px/22px "Courier New",Courier,monospace;background:repeating-linear-gradient(#fff 0 21px,#9cc0e8 21px 22px);background-attachment:local;min-height:120px}
    .acf.e1990 .acf-text{background:#fff}
    .acf-flip{animation:acf-flip .28s ease-out}
    @keyframes acf-flip{0%{transform:perspective(600px) rotateX(70deg) translateY(-20px);opacity:.3}100%{transform:none;opacity:1}}
    .acf-listv{position:absolute;inset:8px;background:#fff;overflow:auto;display:flex;flex-direction:column}
    .acf-listv[hidden],.acf-stack[hidden]{display:none}
    .acf-listv button{background:none;border:0;border-bottom:1px solid #e0e0e0;text-align:left;padding:6px 8px;min-height:32px;cursor:pointer;font:inherit}
    .acf-listv button.on{background:var(--navy);color:#fff}
    .acf-empty{padding:16px;color:#fff;font-weight:700}
    .acf.e1990 .acf-empty,.acf-listv .acf-empty{color:#404040}
  `;

  /* =====================================================================
     CLOCK
     ===================================================================== */
  function clockFace(E) {
    let s = '<svg viewBox="0 0 200 200" class="ack-svg" aria-hidden="true">';
    if (E === '2000') s += '<defs><radialGradient id="ack-g" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#c8d8f0"/></radialGradient></defs><circle cx="100" cy="100" r="96" fill="#0a246a"/><circle cx="100" cy="100" r="90" fill="url(#ack-g)"/>';
    else if (E === '1995') s += '<circle cx="100" cy="100" r="95" fill="#fff" stroke="#000" stroke-width="3"/>';
    else s += '<circle cx="100" cy="100" r="95" fill="#c0c0c0"/>';
    for (let i = 0; i < 60; i++) {
      const big = i % 5 === 0, rot = `transform="rotate(${i * 6} 100 100)"`;
      if (E === '1990') s += big ? `<rect x="95" y="8" width="10" height="10" fill="#008080" stroke="#000" ${rot}/>` : `<rect x="98.5" y="11" width="3" height="3" fill="#000" ${rot}/>`;
      else if (E === '1995') s += big ? `<rect x="97.5" y="9" width="5" height="14" fill="#000" ${rot}/>` : `<rect x="99" y="9" width="2" height="6" fill="#000" ${rot}/>`;
      else s += big ? `<rect x="98" y="14" width="4" height="12" fill="#0a246a" ${rot}/>` : `<circle cx="100" cy="17" r="1.3" fill="#3a5a9a" ${rot}/>`;
    }
    if (E === '2000') [[12, 100, 44], [3, 160, 106], [6, 100, 166], [9, 40, 106]].forEach(([n, x, y]) => { s += `<text x="${x}" y="${y}" text-anchor="middle" font-family="Tahoma,Verdana,sans-serif" font-size="18" font-weight="700" fill="#0a246a">${n}</text>`; });
    const hc = E === '1990' ? '#008080' : E === '1995' ? '#000080' : '#0a246a';
    s += `<polygon class="ack-hh" points="100,50 107,100 100,114 93,100" fill="${hc}" stroke="#000" stroke-width="1.5"/>`;
    s += `<polygon class="ack-mh" points="100,24 105,100 100,114 95,100" fill="${hc}" stroke="#000" stroke-width="1.5"/>`;
    s += `<g class="ack-sh"><line x1="100" y1="118" x2="100" y2="18" stroke="${E === '1990' ? '#000' : '#c00000'}" stroke-width="2"/></g>`;
    s += `<circle cx="100" cy="100" r="5" fill="${E === '1990' ? '#000' : '#c00000'}"/></svg>`;
    return s;
  }
  function openClock(W, api) {
    const E = api.era.id;
    const P = Object.assign({ mode: 'analog', secs: true, date: true, h24: false, alarm: { on: false, t: '07:00', label: 'Wake up!' } }, api.load('prefs', {}));
    let tab = 'clock', sw = { run: false, acc: 0, t0: 0, laps: [] }, lastAlarm = '', snooze = 0, ringing = false;
    W.body.innerHTML = `<div class="ack e${E}">
      <div class="ack-tabs" role="tablist"><button class="btn" data-t="clock" role="tab">Clock</button><button class="btn" data-t="alarm" role="tab">Alarm</button><button class="btn" data-t="sw" role="tab">Stopwatch</button></div>
      <div class="ack-pane ack-clock">
        <div class="ack-an">${clockFace(E)}</div>
        <div class="ack-dig"><span class="ack-dt"></span></div>
        <div class="ack-date"></div>
        <div class="ack-row"><button class="btn" data-a="mode"></button><button class="btn" data-a="secs"></button></div>
      </div>
      <div class="ack-pane ack-alarm" hidden>
        <div class="ack-big ack-alt"></div>
        <label class="ack-f">Alarm time <input type="time" class="ack-at"></label>
        <label class="ack-f">Message <input type="text" class="ack-al" maxlength="40"></label>
        <label class="ack-chk"><input type="checkbox" class="ack-on"> Alarm is on</label>
        <div class="ack-row"><button class="btn" data-a="test">Test sound</button></div>
        <div class="ack-hint">The alarm rings while Clock is open (it can be minimized).</div>
      </div>
      <div class="ack-pane ack-sw" hidden>
        <div class="ack-big ack-swt">00:00.00</div>
        <div class="ack-row"><button class="btn" data-a="sw-go">Start</button><button class="btn" data-a="sw-lap">Reset</button></div>
        <ol class="ack-laps sunken"></ol>
      </div>
    </div>`;
    const R = W.body.firstElementChild, $ = s => R.querySelector(s);
    const persist = () => api.save('prefs', P);
    const swNow = () => sw.acc + (sw.run ? performance.now() - sw.t0 : 0);
    const fmtSW = ms => { const cs = Math.floor(ms / 10); const h = Math.floor(cs / 360000); return `${h ? h + ':' : ''}${p2(Math.floor(cs / 6000) % 60)}:${p2(Math.floor(cs / 100) % 60)}.${p2(cs % 100)}`; };
    function showTab(t) {
      tab = t;
      R.querySelectorAll('.ack-tabs .btn').forEach(b => { b.classList.toggle('down', b.dataset.t === t); b.setAttribute('aria-selected', b.dataset.t === t); });
      $('.ack-clock').hidden = t !== 'clock'; $('.ack-alarm').hidden = t !== 'alarm'; $('.ack-sw').hidden = t !== 'sw';
      sync();
    }
    function sync() {
      $('.ack-an').hidden = P.mode !== 'analog'; $('.ack-dig').hidden = P.mode === 'analog';
      $('[data-a=mode]').textContent = P.mode === 'analog' ? 'Digital' : 'Analog';
      $('[data-a=secs]').textContent = P.secs ? 'Hide seconds' : 'Show seconds';
      $('.ack-sh').style.display = P.secs ? '' : 'none';
      $('.ack-date').hidden = !P.date;
      $('.ack-at').value = P.alarm.t; $('.ack-al').value = P.alarm.label; $('.ack-on').checked = P.alarm.on;
      $('.ack-alt').textContent = P.alarm.on ? `Alarm: ${fmtHM(P.alarm.t)}` : 'Alarm is off';
      $('[data-a=sw-go]').textContent = sw.run ? 'Stop' : 'Start';
      $('[data-a=sw-lap]').textContent = sw.run ? 'Lap' : 'Reset';
      $('.ack-laps').innerHTML = sw.laps.map((l, i) => `<li><span>Lap ${i + 1}</span><span>${fmtSW(l)}</span></li>`).reverse().join('');
      $('.ack-laps').hidden = !sw.laps.length;
      last = '';
    }
    let last = '';
    function tick() {
      const n = new Date(), h = n.getHours(), m = n.getMinutes(), s = n.getSeconds();
      const key = `${h}:${m}:${s}:${P.mode}:${P.secs}:${P.h24}`;
      if (key !== last) {
        last = key;
        if (P.mode === 'analog') {
          $('.ack-hh').setAttribute('transform', `rotate(${(h % 12) * 30 + m / 2} 100 100)`);
          $('.ack-mh').setAttribute('transform', `rotate(${m * 6 + s / 10} 100 100)`);
          $('.ack-sh').setAttribute('transform', `rotate(${s * 6} 100 100)`);
        } else {
          const hh = P.h24 ? p2(h) : String((h % 12) || 12);
          $('.ack-dt').innerHTML = `${hh}<i>:</i>${p2(m)}${P.secs ? `<i>:</i>${p2(s)}` : ''}${P.h24 ? '' : `<small>${h < 12 ? 'AM' : 'PM'}</small>`}`;
        }
        const t = eraToday(api.era.year);
        $('.ack-date').textContent = `${DAYS[new Date(t.y, t.m, t.d).getDay()]}, ${MONTHS[t.m]} ${t.d}, ${t.y}`;
        const hm = `${p2(h)}:${p2(m)}`;
        if (P.alarm.on && !ringing && ((hm === P.alarm.t && lastAlarm !== hm + n.toDateString()) || (snooze && Date.now() >= snooze))) {
          lastAlarm = hm + n.toDateString(); snooze = 0; ring();
        }
      }
      if (tab === 'sw') $('.ack-swt').textContent = fmtSW(swNow());
    }
    function bell(n) { for (let i = 0; i < n; i++) { api.tone(1568, 0.08, { at: i * 0.5, vol: 0.07 }); api.tone(1568, 0.08, { at: i * 0.5 + 0.12, vol: 0.07 }); api.tone(1568, 0.08, { at: i * 0.5 + 0.24, vol: 0.07 }); } }
    async function ring() {
      ringing = true; bell(8);
      const r = await api.msgBox('Alarm', `${fmtHM(P.alarm.t)}\n\n${P.alarm.label || 'Alarm!'}`, ['OK', 'Snooze 5 min'], 'info');
      ringing = false;
      if (r === 'Snooze 5 min') snooze = Date.now() + 5 * 60000;
    }
    function swGo() {
      if (sw.run) { sw.acc += performance.now() - sw.t0; sw.run = false; } else { sw.t0 = performance.now(); sw.run = true; }
      api.sfx.click(); sync();
    }
    function swLap() {
      if (sw.run) sw.laps.push(swNow()); else { sw.acc = 0; sw.laps = []; }
      api.sfx.click(); sync();
    }
    R.addEventListener('click', e => {
      const t = e.target.closest('[data-t]'); if (t) { showTab(t.dataset.t); return; }
      const a = e.target.closest('[data-a]'); if (!a) return;
      const k = a.dataset.a;
      if (k === 'mode') { P.mode = P.mode === 'analog' ? 'digital' : 'analog'; persist(); sync(); }
      else if (k === 'secs') { P.secs = !P.secs; persist(); sync(); }
      else if (k === 'test') bell(2);
      else if (k === 'sw-go') swGo(); else if (k === 'sw-lap') swLap();
    });
    R.addEventListener('change', e => {
      if (e.target.classList.contains('ack-at')) { P.alarm.t = e.target.value || '07:00'; P.alarm.on = true; lastAlarm = ''; }
      else if (e.target.classList.contains('ack-al')) P.alarm.label = e.target.value.trim();
      else if (e.target.classList.contains('ack-on')) { P.alarm.on = e.target.checked; lastAlarm = ''; snooze = 0; }
      else return;
      persist(); sync();
    });
    const chk = (on, l) => (on ? '✓ ' : '') + l;
    api.menubar([
      { label: 'Settings', items: () => [
        { label: chk(P.mode === 'analog', 'Analog'), fn: () => { P.mode = 'analog'; persist(); sync(); } },
        { label: chk(P.mode === 'digital', 'Digital'), fn: () => { P.mode = 'digital'; persist(); sync(); } },
        '-',
        { label: chk(P.secs, 'Seconds'), fn: () => { P.secs = !P.secs; persist(); sync(); } },
        { label: chk(P.date, 'Date'), fn: () => { P.date = !P.date; persist(); sync(); } },
        { label: chk(P.h24, '24-Hour Time'), fn: () => { P.h24 = !P.h24; persist(); sync(); } }
      ] },
      { label: 'Alarm', items: () => [
        { label: 'Set Alarm...', fn: () => showTab('alarm') },
        { label: P.alarm.on ? 'Turn Alarm Off' : 'Turn Alarm On', fn: () => { P.alarm.on = !P.alarm.on; snooze = 0; lastAlarm = ''; persist(); sync(); } }
      ] },
      { label: 'Stopwatch', items: () => [
        { label: 'Show Stopwatch', fn: () => showTab('sw') },
        { label: sw.run ? 'Stop (Space)' : 'Start (Space)', fn: () => { showTab('sw'); swGo(); } },
        { label: sw.run ? 'Lap (L)' : 'Reset (R)', fn: () => { showTab('sw'); swLap(); } }
      ] },
      { label: 'Help', items: [{ label: 'About Clock', fn: () => api.msgBox('Clock', 'Clock shows the time, rings an alarm and times things with its stopwatch.\n\nKeys: A = analog, D = digital, S = seconds on/off. On the Stopwatch tab: Space starts and stops, L records a lap, R resets.') }] }
    ]);
    W.onKey = e => {
      if (hasDlg(W) || typing(e) || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === 'a') { P.mode = 'analog'; persist(); sync(); }
      else if (k === 'd') { P.mode = 'digital'; persist(); sync(); }
      else if (k === 's') { P.secs = !P.secs; persist(); sync(); }
      else if (tab === 'sw' && k === ' ') { e.preventDefault(); swGo(); }
      else if (tab === 'sw' && k === 'l' && sw.run) swLap();
      else if (tab === 'sw' && k === 'r' && !sw.run) swLap();
    };
    const iv = setInterval(tick, 50);
    W.onClose = () => clearInterval(iv);
    showTab('clock'); tick();
  }
  const CLOCK_CSS = `
    .ack{height:100%;display:flex;flex-direction:column;padding:6px;gap:6px;min-height:280px}
    .ack-tabs{display:flex;gap:3px;flex:none}
    .ack-tabs .btn{flex:1;min-width:0;padding:5px 4px;min-height:32px}
    .ack-pane{flex:1;min-height:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:6px;overflow:auto}
    .ack-pane[hidden]{display:none}
    .ack-an{width:min(100%,260px);flex:1 1 auto;min-height:120px;max-height:260px;display:flex;justify-content:center}
    .ack-an[hidden],.ack-dig[hidden],.ack-date[hidden],.ack-laps[hidden]{display:none}
    .ack-svg{height:100%;width:100%;max-width:260px;max-height:260px}
    .ack-dig{font:400 56px/1 var(--dos);padding:10px 16px;background:#000;color:#00e000;border:2px solid;border-color:var(--dk) #fff #fff var(--dk);white-space:nowrap;max-width:100%;text-align:center}
    .ack-dig i{font-style:normal;animation:ack-blink 1s steps(1) infinite}
    .ack-dig small{font-size:22px;margin-left:6px}
    @keyframes ack-blink{50%{opacity:.35}}
    .ack.e1995 .ack-dig{background:#9aa888;color:#1a2410;text-shadow:2px 2px 0 rgba(0,0,0,.15)}
    .ack.e2000 .ack-dig{background:linear-gradient(#0a1a40,#0a246a);color:#8fd8ff}
    .ack-date{font-weight:700;text-align:center}
    .ack.e1990 .ack-date{font-family:var(--dos);font-size:18px;font-weight:400}
    .ack-row{display:flex;gap:6px;flex-wrap:wrap;justify-content:center}
    .ack-row .btn{min-width:96px;min-height:32px}
    .ack-big{font:400 40px/1.1 var(--dos);text-align:center}
    .ack-swt{background:#000;color:#ffb000;padding:6px 14px;border:2px solid;border-color:var(--dk) #fff #fff var(--dk);font-size:48px}
    .ack.e2000 .ack-swt{background:linear-gradient(#0a1a40,#0a246a);color:#fff}
    .ack-alt{font-size:30px}
    .ack-f{display:flex;flex-direction:column;gap:2px;width:min(100%,240px)}
    .ack-f input{font:inherit;height:32px;border:2px solid;border-color:var(--dk) #fff #fff var(--dk);padding:2px 6px;background:#fff}
    .ack-chk{display:flex;align-items:center;gap:6px;font-weight:700}
    .ack-chk input{width:20px;height:20px}
    .ack-hint{font-size:11px;color:#404040;text-align:center}
    .ack-laps{background:#fff;margin:0;padding:4px 8px 4px 8px;list-style:none;width:min(100%,240px);max-height:130px;overflow:auto;font:18px var(--dos)}
    .ack-laps li{display:flex;justify-content:space-between}
  `;

  /* =====================================================================
     CD PLAYER: an original album, synthesized live
     ===================================================================== */
  const ALBUM = { artist: 'The Beepers', title: 'Songs in the Key of Beep' };
  const TRACKS = [
    { name: 'Boot Up Boogie', len: 58, song: { mel: [72, 0, 76, 79, 0, 76, 72, 0, 74, 0, 77, 81, 0, 77, 74, 0], bass: [48, 48, 53, 55], step: 0.13, lead: 'square', leadVol: 0.03, drums: 'four' } },
    { name: 'Screensaver Dreams', len: 72, song: { mel: [79, 0, 83, 0, 86, 0, 83, 0, 76, 0, 79, 0, 84, 0, 79, 0, 74, 0, 78, 0, 81, 0, 78, 0, 79, 0, 0, 0, 74, 0, 0, 0], bass: [43, 40, 36, 38, 43, 40, 38, 38], step: 0.2, lead: 'triangle', leadVol: 0.07, harm: 7, hold: 1.4 } },
    { name: 'Dial Tone Disco', len: 64, song: { mel: [69, 0, 72, 69, 76, 0, 74, 72, 71, 0, 74, 71, 76, 0, 72, 71], bass: [45, 41, 43, 40], step: 0.125, lead: 'sawtooth', leadVol: 0.022, bassType: 'square', bassVol: 0.05, drums: 'four' } },
    { name: 'Recess Rocket', len: 50, song: { mel: [60, 64, 67, 72, 67, 64, 60, 64, 65, 69, 72, 77, 72, 69, 65, 69, 67, 71, 74, 79, 74, 71, 67, 71, 72, 76, 79, 84, 79, 76, 72, 0], bass: [48, 53, 55, 48], step: 0.11, lead: 'square', leadVol: 0.028, drums: 'four' } },
    { name: 'Rainy Day Pixels', len: 70, song: { mel: [69, 0, 67, 0, 64, 0, 62, 64, 0, 0, 60, 0, 62, 0, 64, 0, 69, 0, 72, 0, 71, 0, 67, 69, 0, 0, 64, 0, 0, 0, 0, 0], bass: [45, 43, 41, 40, 45, 43, 41, 40], step: 0.19, lead: 'triangle', leadVol: 0.07, harm: 12 } },
    { name: 'Victory Lap', len: 55, song: { mel: [67, 67, 72, 0, 67, 72, 76, 0, 74, 72, 74, 76, 79, 0, 0, 0, 77, 76, 74, 0, 72, 74, 76, 0, 74, 72, 71, 72, 67, 0, 0, 0], bass: [48, 43, 45, 43, 41, 43, 48, 43], step: 0.12, lead: 'square', leadVol: 0.028, harm: 7, drums: 'four' } }
  ];
  const CD_I = {
    play: '<polygon points="4,2 13,8 4,14" fill="currentColor"/>',
    pause: '<rect x="3" y="3" width="4" height="10" fill="currentColor"/><rect x="9" y="3" width="4" height="10" fill="currentColor"/>',
    stop: '<rect x="3" y="3" width="10" height="10" fill="currentColor"/>',
    prev: '<rect x="2" y="3" width="2" height="10" fill="currentColor"/><polygon points="14,3 5,8 14,13" fill="currentColor"/>',
    next: '<polygon points="2,3 11,8 2,13" fill="currentColor"/><rect x="12" y="3" width="2" height="10" fill="currentColor"/>',
    eject: '<polygon points="8,2 14,9 2,9" fill="currentColor"/><rect x="2" y="11" width="12" height="3" fill="currentColor"/>',
    rnd: '<path d="M1 4h3l7 8h3M1 12h3l7-8h3" fill="none" stroke="currentColor" stroke-width="1.6"/><polygon points="12,1 15,4 12,7" fill="currentColor"/><polygon points="12,9 15,12 12,15" fill="currentColor"/>'
  };
  const cdIco = k => `<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">${CD_I[k]}</svg>`;
  const mmss = s => `${p2(Math.floor(s / 60))}:${p2(Math.floor(s % 60))}`;
  function openCD(W, api) {
    const E = api.era.id;
    const P = Object.assign({ vol: 70, random: false, cont: true }, api.load('prefs', {}));
    let tr = 0, state = 'stop', el = 0, t0 = 0, ejected = false, mus = null, order = [0, 1, 2, 3, 4, 5], vt = 0, lastShown = '';
    W.body.innerHTML = `<div class="acd e${E}">
      <div class="acd-top">
        <div class="acd-lcd"><div class="acd-tn">[01]</div><div class="acd-tm">00:00</div><div class="acd-vu">${'<i></i>'.repeat(10)}</div></div>
        <div class="acd-tray"><div class="acd-disc"><span></span></div></div>
      </div>
      <div class="acd-ctl">
        <button class="btn" data-a="play" aria-label="Play">${cdIco('play')}</button><button class="btn" data-a="pause" aria-label="Pause">${cdIco('pause')}</button><button class="btn" data-a="stop" aria-label="Stop">${cdIco('stop')}</button>
        <button class="btn" data-a="prev" aria-label="Previous track">${cdIco('prev')}</button><button class="btn" data-a="next" aria-label="Next track">${cdIco('next')}</button>
        <button class="btn" data-a="rnd" aria-label="Random order">${cdIco('rnd')}</button><button class="btn" data-a="eject" aria-label="Eject">${cdIco('eject')}</button>
      </div>
      <div class="acd-info"><div><b>Artist:</b> <span class="acd-ar"></span></div><div><b>Title:</b> <span class="acd-ti"></span></div></div>
      ${E === '2000' ? '<div class="acd-rip"><button class="btn" data-rip>Copy track to Jukebox (MP3)</button><span class="acd-ripst"></span></div>' : ''}
      <div class="acd-vol"><label for="acd-v">Volume</label><input id="acd-v" type="range" min="0" max="100" step="5"></div>
      <div class="acd-list sunken" role="listbox" aria-label="Tracks"></div>
    </div>`;
    const R = W.body.firstElementChild, $ = s => R.querySelector(s);
    $('#acd-v').value = P.vol;
    const persist = () => api.save('prefs', P);
    const now = () => el + (state === 'play' ? (performance.now() - t0) / 1000 : 0);
    function shuffle() { order = [0, 1, 2, 3, 4, 5]; if (P.random) for (let i = 5; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; } }
    function startMusic() {
      api.stopMusic(); mus = null;
      if (P.vol > 0) mus = api.playMusic(Object.assign({}, TRACKS[tr].song, { gain: 0.9 * P.vol / 100 }));
    }
    function render() {
      $('.acd-tn').textContent = ejected ? '' : `[${p2(tr + 1)}]`;
      $('.acd-ar').textContent = ejected ? '(no disc)' : ALBUM.artist;
      $('.acd-ti').textContent = ejected ? 'Please insert a compact disc' : ALBUM.title;
      $('.acd-list').innerHTML = ejected ? '<div class="acd-none">Tray open. Press Eject again to close it.</div>' : TRACKS.map((t, i) => `<button role="option" aria-selected="${i === tr}" class="${i === tr ? 'on' : ''}" data-tr="${i}"><span>${p2(i + 1)}. ${escH(t.name)}</span><span>${mmss(t.len)}</span></button>`).join('');
      $('.acd-disc').classList.toggle('spin', state === 'play');
      R.classList.toggle('acd-out', ejected);
      $('[data-a=play]').classList.toggle('down', state === 'play');
      $('[data-a=pause]').classList.toggle('down', state === 'pause');
      $('[data-a=rnd]').classList.toggle('down', P.random);
      R.querySelectorAll('.acd-ctl .btn:not([data-a=eject])').forEach(b => { b.disabled = ejected; });
      lastShown = ''; tick();
    }
    function play() { if (ejected) return; if (state === 'play') return; if (state === 'stop') el = 0; state = 'play'; t0 = performance.now(); startMusic(); render(); }
    function pause() { if (ejected) return; if (state === 'play') { el = now(); state = 'pause'; api.stopMusic(); mus = null; } else if (state === 'pause') play(); render(); }
    function stop() { state = 'stop'; el = 0; api.stopMusic(); mus = null; render(); }
    function select(i, keepPlaying = state === 'play') {
      tr = (i + TRACKS.length) % TRACKS.length; el = 0; t0 = performance.now();
      if (keepPlaying) { state = 'play'; startMusic(); } else if (state === 'pause') { state = 'stop'; }
      render();
    }
    function step(d) {
      if (ejected) return;
      if (d < 0 && now() > 3) { select(tr); return; }
      const k = order.indexOf(tr), nk = k + d;
      if (nk >= order.length || nk < 0) { if (!P.cont && d > 0) { stop(); select(order[0], false); return; } if (P.random && nk >= order.length) shuffle(); }
      select(order[(nk + order.length) % order.length]);
    }
    async function eject() {
      if (ejected) { ejected = false; api.sfx.cdrom && api.sfx.cdrom(); select(0, false); return; }
      stop(); ejected = true; render(); api.tone(180, 0.5, { type: 'sawtooth', vol: 0.025, to: 90 });
      await api.sleep(500);
      if (!W.el.isConnected) return;
      api.msgBox('CD Player', api.pick([
        'The tray slides open... and a tiny sandwich falls out. Please do not use the CD tray as a cup holder!',
        'The disc flies across the room and lands in the fish bowl. The fish now owns a CD. Press Eject again to put it back.',
        'Eject! The CD tray opened so fast it scared the cat. Press Eject again to close the tray.'
      ]));
    }
    function tick() {
      if (state === 'play' && now() >= TRACKS[tr].len) step(1);
      const s = ejected ? 'NO DISC' : state === 'stop' ? '00:00' : mmss(now());
      if (s !== lastShown) { lastShown = s; $('.acd-tm').textContent = s; $('.acd-tm').classList.toggle('blink', state === 'pause'); }
      const bars = R.querySelectorAll('.acd-vu i');
      if (state === 'play' && mus && mus.an) {
        const d = new Uint8Array(mus.an.frequencyBinCount); mus.an.getByteFrequencyData(d);
        bars.forEach((b, i) => { b.style.height = Math.min(100, (d[i + 1] || 0) / 2.2) + '%'; });
      } else bars.forEach(b => { b.style.height = '4%'; });
    }
    R.addEventListener('click', e => {
      const t = e.target.closest('[data-tr]'); if (t) { select(+t.dataset.tr, true); return; }
      const a = e.target.closest('[data-a]'); if (!a) return;
      const k = a.dataset.a;
      if (k === 'play') play(); else if (k === 'pause') pause(); else if (k === 'stop') stop();
      else if (k === 'prev') step(-1); else if (k === 'next') step(1);
      else if (k === 'rnd') { P.random = !P.random; shuffle(); persist(); render(); }
      else if (k === 'eject') eject();
    });
    // 2000: "rip" a track to MP3 so it shows up in the Jukebox (the engine reads app:cdplayer:ripped).
    let ripT = 0;
    const ripped = () => api.load('ripped', []);
    function rip() {
      if (ripT || ejected) return;
      const t = TRACKS[tr], st = $('.acd-ripst'), btn = $('[data-rip]');
      if (ripped().some(r => r.t === t.name)) { st.textContent = `"${t.name}" is already in the Jukebox.`; return; }
      const secs = Math.max(3, Math.round(t.len / 8)); let n = 0; btn.disabled = true;
      ripT = setInterval(() => {
        n++; if (n % 2) api.sfx.seek(1);
        st.textContent = `Ripping "${t.name}" at 8x... ${Math.min(100, Math.round(n / (secs * 4) * 100))}%`;
        if (n >= secs * 4) {
          clearInterval(ripT); ripT = 0; btn.disabled = false;
          api.save('ripped', ripped().concat([{ a: ALBUM.artist, t: t.name, len: mmss(t.len).replace(/^0/, ''), song: t.song }]));
          st.textContent = `Done! "${t.name}" is now an MP3 in your Jukebox.`; api.sfx.ding(); api.stamp('mp3-rip');
        }
      }, 250);
    }
    if (E === '2000') $('[data-rip]').onclick = rip;
    $('#acd-v').addEventListener('input', e => {
      P.vol = +e.target.value; persist();
      clearTimeout(vt); vt = setTimeout(() => { if (state === 'play') startMusic(); }, 180);
    });
    const chk = (on, l) => (on ? '✓ ' : '') + l;
    api.menubar([
      { label: 'Disc', items: () => [
        { label: state === 'play' ? 'Pause (Space)' : 'Play (Space)', fn: () => state === 'play' ? pause() : play(), disabled: ejected },
        { label: 'Stop (S)', fn: stop, disabled: ejected },
        { label: ejected ? 'Close Tray (E)' : 'Eject (E)', fn: eject },
        ...(E === '2000' ? [{ label: 'Copy Track to Jukebox (MP3)', fn: rip, disabled: ejected || !!ripT }] : []),
        '-',
        { label: 'Exit', fn: () => api.close() }
      ] },
      { label: 'Options', items: () => [
        { label: chk(P.random, 'Random Order (R)'), fn: () => { P.random = !P.random; shuffle(); persist(); render(); } },
        { label: chk(P.cont, 'Continuous Play'), fn: () => { P.cont = !P.cont; persist(); } }
      ] },
      { label: 'Help', items: [{ label: 'About CD Player', fn: () => api.msgBox('CD Player', `Now in the drive: "${ALBUM.title}" by ${ALBUM.artist}, six brand-new tunes played live by your sound card.\n\nKeys: Space play/pause, S stop, Left/Right arrows change track, R random order, E eject.`) }] }
    ]);
    W.onKey = e => {
      if (hasDlg(W) || typing(e) || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === ' ') { e.preventDefault(); state === 'play' ? pause() : play(); }
      else if (k === 's') stop();
      else if (k === 'arrowright') { e.preventDefault(); step(1); }
      else if (k === 'arrowleft') { e.preventDefault(); step(-1); }
      else if (k === 'r') { P.random = !P.random; shuffle(); persist(); render(); }
      else if (k === 'e') eject();
    };
    const iv = setInterval(tick, 100);
    W.onClose = () => { clearInterval(iv); clearTimeout(vt); clearInterval(ripT); api.stopMusic(); };
    W.onMin = () => { };
    shuffle(); render();
  }
  const CD_CSS = `
    .acd{display:flex;flex-direction:column;gap:6px;padding:8px;min-height:100%}
    .acd-top{display:flex;gap:8px;align-items:stretch}
    .acd-lcd{flex:1;min-width:0;background:#000;border:2px solid;border-color:var(--dk) #fff #fff var(--dk);color:#ffd000;font-family:var(--dos);padding:4px 10px;display:grid;grid-template-columns:auto 1fr;grid-template-rows:auto 1fr;align-items:center;column-gap:10px}
    .acd-tn{font-size:28px}
    .acd-tm{font-size:44px;line-height:1;text-align:right}
    .acd-tm.blink{animation:acd-bl 1s steps(1) infinite}
    @keyframes acd-bl{50%{opacity:0}}
    .acd-vu{grid-column:1/3;display:flex;gap:2px;height:16px;align-items:flex-end}
    .acd-vu i{flex:1;background:linear-gradient(0deg,#00c000,#c0c000 70%,#e00000);height:4%;transition:height .08s}
    .acd.e2000 .acd-lcd{background:linear-gradient(#000820,#001848);color:#7fe0ff}
    .acd-tray{flex:none;width:96px;height:96px;display:grid;place-items:center;background:#202020;border:2px solid;border-color:var(--dk) #fff #fff var(--dk);overflow:hidden}
    .acd-disc{width:84px;height:84px;border-radius:50%;background:radial-gradient(circle,#202020 0 7px,#e8e8e8 8px 13px,transparent 14px),conic-gradient(#c8c8d0,#f0f0ff,#a8d8ff,#f8c8f0,#fff8c0,#c8f8d0,#c8c8d0);display:grid;place-items:center;transition:transform .5s}
    .acd-disc span{width:60px;height:14px;background:repeating-linear-gradient(90deg,#000080 0 3px,transparent 3px 6px);opacity:.25;border-radius:3px;transform:translateY(-20px)}
    .acd-disc.spin{animation:acd-spin .9s linear infinite}
    @keyframes acd-spin{to{transform:rotate(360deg)}}
    .acd-out .acd-disc{transform:translateX(120px)}
    .acd-ctl{display:flex;gap:3px;flex-wrap:wrap}
    .acd-ctl .btn{min-width:0;flex:1 1 40px;height:36px;padding:0;display:grid;place-items:center}
    .acd-ctl .btn:disabled svg{opacity:.35}
    .acd-ctl [data-a=play]{color:#006000}
    .acd-ctl [data-a=stop],.acd-ctl [data-a=eject]{color:#000080}
    .acd-rip{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:12px}
    .acd-info{background:#fff;border:1px solid var(--dk);padding:3px 8px;font-size:12px}
    .acd-info div{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .acd-vol{display:flex;align-items:center;gap:8px}
    .acd-vol input{flex:1;min-width:0;height:28px;accent-color:#000080}
    .acd-list{background:#fff;flex:1;min-height:110px;overflow:auto;display:flex;flex-direction:column}
    .acd-list button{background:none;border:0;display:flex;justify-content:space-between;gap:10px;text-align:left;padding:4px 8px;min-height:30px;cursor:pointer;font:inherit}
    .acd-list button.on{background:var(--navy);color:#fff}
    .acd.e2000 .acd-list button.on{background:#316ac5}
    .acd-none{padding:10px;color:#606060}
  `;

  /* =====================================================================
     MUSIC MAKER: a step sequencer
     ===================================================================== */
  const MM_NOTES = [60, 62, 64, 65, 67, 69, 71, 72, 74, 76, 77, 79, 81, 83, 84]; // C4..C6, C major
  const MM_NN = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const MM_NC = ['#e03030', '#f08020', '#e0c000', '#30a030', '#20a0a0', '#3060e0', '#9040c0'];
  const MM_DRUMS = ['Kick', 'Snare', 'Hi-hat', 'Clap'];
  const MM_INST = [
    { name: 'Square', type: 'square', oct: 0, vol: 0.035, col: '#e03030' },
    { name: 'Triangle', type: 'triangle', oct: -12, vol: 0.1, col: '#2080e0' },
    { name: 'Sawtooth', type: 'sawtooth', oct: 0, vol: 0.025, col: '#20a040' },
    { name: 'Drums', drums: true, col: '#c08000' }
  ];
  const MM_ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  const mmEmpty = (steps = 16) => ({ name: 'My Song', bpm: 120, steps, g: [0, 1, 2, 3].map(() => new Array(32).fill(0)) });
  function mmSong(name, bpm, steps, notes) {
    const s = mmEmpty(steps); s.name = name; s.bpm = bpm;
    notes.forEach(([i, st, r]) => { s.g[i][st] |= 1 << r; });
    return s;
  }
  function mmExamples() {
    const n = [];
    // 1. Twinkle, Twinkle, Little Star (traditional)
    [7, 7, 11, 11, 12, 12, 11, -1, 10, 10, 9, 9, 8, 8, 7, -1].forEach((r, k) => { if (r >= 0) n.push([0, k * 2, r]); });
    [[0, 0], [8, 3], [12, 0], [16, 3], [20, 0], [24, 4], [28, 0]].forEach(([st, r]) => n.push([1, st, r]));
    [0, 8, 16, 24].forEach(st => n.push([3, st, 0])); [4, 12, 20, 28].forEach(st => n.push([3, st, 2]));
    const twinkle = mmSong('Twinkle, Twinkle', 100, 32, n.splice(0));
    // 2. Ode to Joy (Beethoven)
    [9, 9, 10, 11, 11, 10, 9, 8, 7, 7, 8, 9].forEach((r, k) => n.push([0, k * 2, r]));
    n.push([0, 24, 9], [0, 27, 8], [0, 28, 8]);
    [[0, 0], [8, 4], [16, 0], [24, 4]].forEach(([st, r]) => n.push([1, st, r], [1, st + 4, r]));
    [0, 8, 16, 24].forEach(st => n.push([3, st, 0], [3, st + 4, 1]));
    for (let st = 2; st < 32; st += 4) n.push([3, st, 2]);
    const ode = mmSong('Ode to Joy', 110, 32, n.splice(0));
    // 3. Robot Groove (original)
    [[0, 9], [2, 11], [3, 9], [6, 8], [8, 7], [10, 8], [11, 9], [14, 4]].forEach(([st, r]) => n.push([0, st, r]));
    [[0, 0], [3, 0], [6, 4], [8, 5], [11, 5], [12, 3], [14, 4]].forEach(([st, r]) => n.push([1, st, r]));
    [4, 12].forEach(st => n.push([2, st, 2], [2, st, 4]));
    [0, 4, 8, 12].forEach(st => n.push([3, st, 0])); [4, 12].forEach(st => n.push([3, st, 1])); for (let st = 0; st < 16; st += 2) n.push([3, st, 2]); n.push([3, 14, 3], [3, 15, 3]);
    const robot = mmSong('Robot Groove', 118, 16, n.splice(0));
    return [twinkle, ode, robot];
  }
  function mmEncode(s) {
    let out = MM_ALPHA[s.steps === 32 ? 1 : 0] + MM_ALPHA[s.bpm >> 6] + MM_ALPHA[s.bpm & 63];
    for (let i = 0; i < 4; i++) for (let st = 0; st < s.steps; st++) for (let r = 0; r < 15; r++) if (s.g[i][st] & (1 << r)) {
      const v = (i << 10) | (st << 4) | r; out += MM_ALPHA[v >> 6] + MM_ALPHA[v & 63];
    }
    return 'TUNE1:' + out;
  }
  function mmDecode(code) {
    const m = String(code || '').replace(/\s+/g, '').match(/TUNE1:([A-Za-z0-9_-]+)/);
    if (!m || m[1].length < 3 || (m[1].length - 3) % 2) return null;
    const c = m[1], v = ch => MM_ALPHA.indexOf(ch);
    const s = mmEmpty(v(c[0]) === 1 ? 32 : 16);
    s.bpm = Math.max(60, Math.min(200, (v(c[1]) << 6) | v(c[2])));
    s.name = 'Shared Tune';
    for (let k = 3; k < c.length; k += 2) {
      const x = (v(c[k]) << 6) | v(c[k + 1]), i = x >> 10, st = (x >> 4) & 31, r = x & 15;
      if (i > 3 || st >= s.steps || r > 14 || (i === 3 && r > 3)) return null;
      s.g[i][st] |= 1 << r;
    }
    return s;
  }
  function openMusic(W, api) {
    const E = api.era.id;
    let song = api.load('cur', null) || mmExamples()[2];
    if (!song.g || song.g.length !== 4) song = mmExamples()[2];
    let inst = 0, playing = false, iv = 0, next = 0, stepI = 0, queue = [], shown = -1, saveT = 0;
    W.body.innerHTML = `<div class="acm e${E}">
      <div class="acm-bar">
        <button class="btn acm-play" data-a="play">Play</button>
        <label class="acm-tempo">Tempo <input type="range" min="60" max="200" step="2" class="acm-bpm" aria-label="Tempo"><b class="acm-bv"></b></label>
        <button class="btn" data-a="steps"></button>
        <button class="btn" data-a="clear">Clear</button>
      </div>
      <div class="acm-tabs" role="tablist">${MM_INST.map((t, i) => `<button class="btn" data-i="${i}" role="tab" style="--c:${t.col}"><i></i>${t.name}</button>`).join('')}</div>
      <div class="acm-wrap sunken"><div class="acm-grid"></div></div>
      <div class="acm-stat"><span class="acm-nm"></span><span class="acm-tip">Tap squares to add notes, then press Play.</span></div>
    </div>`;
    const R = W.body.firstElementChild, $ = s => R.querySelector(s), G = $('.acm-grid');
    const persist = () => { clearTimeout(saveT); saveT = setTimeout(() => api.save('cur', song), 300); };
    const rowsOf = i => MM_INST[i].drums ? 4 : 15;
    function drum(r, at) {
      if (r === 0) api.tone(150, 0.16, { at, to: 45, type: 'sine', vol: 0.12, decay: 1 });
      else if (r === 1) { api.noise(0.13, { at, ft: 'bandpass', f: 1800, q: 0.7, vol: 0.12, decay: 1 }); api.tone(190, 0.08, { at, type: 'triangle', vol: 0.05, decay: 1 }); }
      else if (r === 2) api.noise(0.04, { at, ft: 'highpass', f: 7000, vol: 0.07, decay: 1 });
      else { [0, 0.012, 0.024].forEach(d => api.noise(0.05, { at: at + d, ft: 'bandpass', f: 1200, q: 1.2, vol: 0.09, decay: 1 })); }
    }
    function note(i, r, at, len) {
      const t = MM_INST[i];
      if (t.drums) drum(r, at);
      else api.tone(api.midi(MM_NOTES[r] + t.oct), len, { at, type: t.type, vol: t.vol, release: 0.04 });
    }
    function build() {
      const n = rowsOf(inst), S = song.steps;
      G.style.setProperty('--n', S);
      let h = '<div class="acm-corner"></div>';
      for (let st = 0; st < S; st++) h += `<div class="acm-hd${st % 4 === 0 ? ' beat' : ''}" data-hs="${st}">${st % 4 === 0 ? st / 4 + 1 : ''}</div>`;
      for (let r = n - 1; r >= 0; r--) {
        const lab = MM_INST[inst].drums ? MM_DRUMS[r] : MM_NN[r % 7] + (4 + Math.floor(r / 7));
        const col = MM_INST[inst].drums ? MM_INST[3].col : MM_NC[r % 7];
        h += `<div class="acm-lab" style="--c:${col}" data-r="${r}">${lab}</div>`;
        for (let st = 0; st < S; st++) h += `<div class="acm-c${st % 4 === 0 ? ' beat' : ''}${song.g[inst][st] & (1 << r) ? ' on' : ''}" data-r="${r}" data-s="${st}" style="--c:${col}"></div>`;
      }
      G.innerHTML = h; shown = -1;
      R.querySelectorAll('.acm-tabs .btn').forEach(b => {
        const i = +b.dataset.i; b.classList.toggle('down', i === inst); b.setAttribute('aria-selected', i === inst);
        const cnt = song.g[i].slice(0, S).reduce((a, m) => a + (m.toString(2).split('1').length - 1), 0);
        b.querySelector('i').textContent = cnt ? cnt : '';
      });
      $('.acm-bpm').value = song.bpm; $('.acm-bv').textContent = song.bpm;
      $('[data-a=steps]').textContent = `${S} steps`;
      $('.acm-nm').textContent = song.name;
    }
    // painting notes with mouse, pen or finger
    let paint = null;
    const cellAt = (x, y) => { const el = document.elementFromPoint(x, y); return el && el.classList && el.classList.contains('acm-c') && G.contains(el) ? el : null; };
    function setCell(c, on) {
      const r = +c.dataset.r, st = +c.dataset.s, bit = 1 << r;
      if (!!(song.g[inst][st] & bit) === on) return;
      song.g[inst][st] = on ? song.g[inst][st] | bit : song.g[inst][st] & ~bit;
      c.classList.toggle('on', on);
      if (on && !playing) note(inst, r, 0, 0.18);
      persist();
    }
    // Mouse and pen paint while dragging. Touch toggles on tap, so a swipe can still scroll the grid.
    G.addEventListener('pointerdown', e => {
      const c = e.target.closest('.acm-c'); if (!c) return;
      paint = { on: !c.classList.contains('on'), id: e.pointerId, moved: false, x: e.clientX, y: e.clientY, first: c, touch: e.pointerType === 'touch' };
      if (paint.touch) return;
      e.preventDefault();
      setCell(c, paint.on);
    });
    G.addEventListener('pointermove', e => {
      if (!paint || e.pointerId !== paint.id) return;
      if (!paint.moved && Math.hypot(e.clientX - paint.x, e.clientY - paint.y) < 8) return;
      paint.moved = true;
      if (paint.touch) { paint = null; return; }
      const c = cellAt(e.clientX, e.clientY); if (c) setCell(c, paint.on);
    });
    G.addEventListener('pointerup', e => {
      if (!paint) return;
      if (paint.touch && !paint.moved) setCell(paint.first, paint.on);
      paint = null; build();
    });
    G.addEventListener('pointercancel', () => { paint = null; });
    G.addEventListener('click', e => { const l = e.target.closest('.acm-lab'); if (l) note(inst, +l.dataset.r, 0, 0.25); });
    function showStep(st) {
      if (shown >= 0) G.querySelectorAll(`[data-s="${shown}"],[data-hs="${shown}"]`).forEach(c => c.classList.remove('ph'));
      shown = st;
      if (st >= 0) G.querySelectorAll(`[data-s="${st}"],[data-hs="${st}"]`).forEach(c => c.classList.add('ph'));
      if (st >= 0 && st % 4 === 0) { const h = G.querySelector(`[data-hs="${st}"]`), wr = $('.acm-wrap'); if (h && (h.offsetLeft < wr.scrollLeft || h.offsetLeft > wr.scrollLeft + wr.clientWidth - 30)) wr.scrollLeft = h.offsetLeft - 40; }
    }
    function sched() {
      const now = performance.now(), dur = 60000 / song.bpm / 4;
      if (next < now - 60) next = now + 20;
      while (next < now + 120) {
        const at = Math.max(0, (next - now) / 1000);
        for (let i = 0; i < 4; i++) { const m = song.g[i][stepI]; if (m) for (let r = 0; r < 15; r++) if (m & (1 << r)) note(i, r, at, dur / 1000 * 0.9); }
        queue.push([next, stepI]);
        stepI = (stepI + 1) % song.steps; next += dur;
      }
      while (queue.length && queue[0][0] <= now) showStep(queue.shift()[1]);
    }
    function play() {
      if (playing) return stop();
      playing = true; stepI = 0; queue = []; next = performance.now() + 40;
      iv = setInterval(sched, 25); sched();
      $('.acm-play').textContent = 'Stop'; $('.acm-play').classList.add('down');
    }
    function stop() {
      playing = false; clearInterval(iv); queue = []; showStep(-1);
      $('.acm-play').textContent = 'Play'; $('.acm-play').classList.remove('down');
    }
    function load(s) {
      stop(); song = JSON.parse(JSON.stringify(s));
      song.g = song.g.map(a => { const b = a.slice(0, 32); while (b.length < 32) b.push(0); return b; });
      persist(); build();
    }
    R.addEventListener('click', e => {
      const t = e.target.closest('.acm-tabs [data-i]'); if (t) { inst = +t.dataset.i; build(); api.sfx.click(); return; }
      const a = e.target.closest('[data-a]'); if (!a) return;
      const k = a.dataset.a;
      if (k === 'play') play();
      else if (k === 'steps') setSteps(song.steps === 16 ? 32 : 16);
      else if (k === 'clear') clearInst();
    });
    $('.acm-bpm').addEventListener('input', e => { song.bpm = +e.target.value; $('.acm-bv').textContent = song.bpm; persist(); });
    function setSteps(n) {
      if (n === 16 && song.g.some(a => a.slice(16).some(Boolean))) {
        api.msgBox('Music Maker', 'Switching to 16 steps hides the notes in steps 17 to 32 (they come back if you switch to 32 again).');
      }
      if (n === 32 && song.steps === 16) song.g.forEach(a => { if (!a.slice(16).some(Boolean)) for (let st = 0; st < 16; st++) a[st + 16] = a[st]; });
      song.steps = n; stepI %= n; persist(); build();
    }
    async function clearInst() {
      const r = await api.msgBox('Music Maker', `Clear the ${MM_INST[inst].name} notes, or the whole song?`, [MM_INST[inst].name, 'Whole song', 'Cancel'], 'warn');
      if (r === 'Whole song') { song.g = [0, 1, 2, 3].map(() => new Array(32).fill(0)); }
      else if (r === MM_INST[inst].name) song.g[inst] = new Array(32).fill(0);
      else return;
      persist(); build();
    }
    async function newSong() {
      const r = await api.msgBox('Music Maker', 'Start a new, empty song?', ['OK', 'Cancel']);
      if (r === 'OK') { load(mmEmpty(16)); inst = 0; build(); }
    }
    const slotsList = () => { const s = api.load('slots', []); while (s.length < 5) s.push(null); return s.slice(0, 5); };
    async function slotDlg(saving) {
      const slots = slotsList(); let pick = -1;
      const r = await dlg(W, saving ? 'Save Song' : 'Open Song', `${saving ? `<label>Song name:<input type="text" class="acm-sn" maxlength="24" value="${escH(song.name)}"></label>` : ''}<div>${saving ? 'Pick a slot to save into:' : 'Pick a saved song:'}</div><div class="acx-list sunken">${slots.map((s, i) => `<button data-k="${i}"><span>${i + 1}. ${s ? escH(s.name) : '(empty)'}</span><span>${s ? s.steps + ' steps' : ''}</span></button>`).join('')}</div>`, [saving ? 'Save' : 'Open', 'Cancel'], (box, finish) => {
        const L = box.querySelector('.acx-list');
        L.addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (!b) return; if (pick === +b.dataset.k) { finish(saving ? 'Save' : 'Open'); return; } pick = +b.dataset.k; L.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); });
      });
      if (!r.btn || r.btn === 'Cancel') return;
      if (pick < 0) { await api.msgBox('Music Maker', 'Click one of the 5 slots first.'); return slotDlg(saving); }
      if (saving) {
        song.name = (r.el.querySelector('.acm-sn').value.trim() || 'My Song').slice(0, 24);
        if (slots[pick] && (await api.msgBox('Music Maker', `Replace "${slots[pick].name}"?`, ['Yes', 'No'], 'warn')) !== 'Yes') return;
        slots[pick] = JSON.parse(JSON.stringify(song)); api.save('slots', slots); persist(); build(); api.sfx.seek(3);
        api.task('music-save', { notes: song.g.reduce((a, g) => a + g.slice(0, song.steps).reduce((b, m) => b + (m.toString(2).split('1').length - 1), 0), 0) });
      } else {
        if (!slots[pick]) { await api.msgBox('Music Maker', 'That slot is empty.'); return slotDlg(false); }
        load(slots[pick]);
      }
    }
    async function share() {
      const code = mmEncode(song);
      let copied = false;
      try { if (navigator.clipboard) { await navigator.clipboard.writeText(code); copied = true; } } catch (e) { }
      await dlg(W, 'Share Tune', `<div>${copied ? 'The tune code is copied! Paste it in a message to a friend.' : 'Copy this tune code and send it to a friend:'} They can use File &gt; Load Tune to play it.</div><textarea class="acm-code" readonly>${code}</textarea>`, ['OK'], box => { const t = box.querySelector('.acm-code'); t.addEventListener('focus', () => t.select()); t.setAttribute('data-focus', ''); });
    }
    async function loadCode() {
      const r = await dlg(W, 'Load Tune', `<label>Paste a tune code (it starts with TUNE1:)<textarea class="acm-lc" placeholder="TUNE1:..."></textarea></label>`, ['Load', 'Cancel']);
      if (r.btn !== 'Load') return;
      const s = mmDecode(r.el.querySelector('.acm-lc').value);
      if (!s) { api.msgBox('Music Maker', 'Hmm, that code does not look like a tune. Make sure you copied all of it.', ['OK'], 'warn'); return; }
      load(s); play();
    }
    const EX = mmExamples();
    api.menubar([
      { label: 'File', items: [
        { label: 'New Song', fn: newSong },
        { label: 'Open Song...', fn: () => slotDlg(false) },
        { label: 'Save Song...', fn: () => slotDlg(true) },
        '-',
        { label: 'Share Tune...', fn: share },
        { label: 'Load Tune...', fn: loadCode },
        '-',
        { label: 'Exit', fn: () => api.close() }
      ] },
      { label: 'Songs', items: EX.map(s => ({ label: s.name, fn: () => { load(s); play(); } })) },
      { label: 'Options', items: () => [
        { label: (song.steps === 16 ? '✓ ' : '') + '16 Steps', fn: () => setSteps(16) },
        { label: (song.steps === 32 ? '✓ ' : '') + '32 Steps', fn: () => setSteps(32) }
      ] },
      { label: 'Help', items: [{ label: 'How to use Music Maker', fn: () => api.msgBox('Music Maker', 'Pick an instrument with the colored buttons: Square, Triangle (a low bass), Sawtooth or Drums.\n\nTap squares on the grid to add notes. Drag to paint lots of notes. Tap a note again to remove it.\n\nPress Play (or Space) to hear your song loop. Try the Songs menu for examples!\n\nFile > Share Tune gives you a code to send to a friend.\n\nKeys: Space play/stop, 1-4 pick an instrument.') }] }
    ]);
    W.onKey = e => {
      if (hasDlg(W) || typing(e) || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === ' ') { e.preventDefault(); play(); }
      else if (/^[1-4]$/.test(e.key)) { inst = +e.key - 1; build(); }
    };
    W.onClose = () => { stop(); clearTimeout(saveT); api.save('cur', song); };
    W.onMin = () => stop();
    build();
  }
  const MM_CSS = `
    .acm{height:100%;display:flex;flex-direction:column;gap:4px;padding:4px;min-height:300px}
    .acm-bar{display:flex;flex-wrap:wrap;gap:4px;align-items:center;flex:none}
    .acm-bar .btn{min-width:0;padding:4px 10px;min-height:32px}
    .acm-play{min-width:70px !important;font-weight:700}
    .acm-tempo{display:flex;align-items:center;gap:4px;flex:1 1 150px}
    .acm-tempo input{flex:1;min-width:60px;accent-color:#000080}
    .acm-bv{width:30px;text-align:right}
    .acm-tabs{display:flex;gap:3px;flex:none}
    .acm-tabs .btn{flex:1;min-width:0;padding:4px 2px;min-height:34px;display:flex;align-items:center;justify-content:center;gap:4px;font-size:12px}
    .acm-tabs .btn i{font-style:normal;min-width:14px;height:14px;background:var(--c);color:#fff;font-size:10px;line-height:14px;padding:0 2px;display:inline-block;border:1px solid #000}
    .acm-tabs .btn i:empty{padding:0;min-width:10px;height:10px}
    .acm-tabs .btn.down{font-weight:700;background:#fff}
    .acm-wrap{flex:1;min-height:0;overflow:auto;background:#fff}
    .acm-grid{display:grid;grid-template-columns:40px repeat(var(--n),minmax(20px,1fr));grid-template-rows:18px;grid-auto-rows:minmax(20px,1fr);min-height:100%;touch-action:pan-x pan-y;user-select:none;-webkit-user-select:none}
    .acm-corner,.acm-hd{position:sticky;top:0;background:#d8d8d8;font-size:10px;text-align:left;padding-left:2px;border-bottom:1px solid #808080;z-index:1;height:16px;line-height:16px;min-height:0}
    .acm-corner{left:0;z-index:2}
    .acm-hd.ph{background:#ffe060}
    .acm-lab{position:sticky;left:0;z-index:1;background:#f0f0f0;border-right:2px solid var(--c);border-bottom:1px solid #d0d0d0;font:700 11px/1 var(--ui);display:flex;align-items:center;padding-left:3px;cursor:pointer;color:#000}
    .acm-c{border-right:1px solid #e0e0e0;border-bottom:1px solid #e0e0e0;cursor:pointer;position:relative}
    .acm-c.beat{border-left:1px solid #a0a0a0}
    .acm-c.on{background:var(--c);box-shadow:inset 1px 1px rgba(255,255,255,.6),inset -1px -1px rgba(0,0,0,.45)}
    .acm-c.ph{background-color:#fff4b0}
    .acm-c.on.ph{background:#fff;box-shadow:inset 0 0 0 3px var(--c)}
    .acm.e1990 .acm-c.on{background:#000;box-shadow:none}
    .acm.e1990 .acm-c.on.ph{background:#fff;box-shadow:inset 0 0 0 3px #000}
    .acm.e1990 .acm-lab{border-right-color:#000}
    .acm.e2000 .acm-c.on{background:radial-gradient(circle at 35% 30%,#fff 0 12%,var(--c) 45%)}
    .acm.e2000 .acm-hd,.acm.e2000 .acm-corner{background:linear-gradient(#fff,#d4d0c8)}
    .acm-stat{display:flex;gap:8px;justify-content:space-between;font-size:11px;flex:none;padding:0 2px}
    .acm-nm{font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .acm-tip{color:#404040;text-align:right}
    .acm-code,.acm-lc{min-height:80px}
  `;

  /* =====================================================================
     ICONS + REGISTRATION
     ===================================================================== */
  const SVG = s => `<svg viewBox="0 0 32 32" shape-rendering="crispEdges" aria-hidden="true">${s}</svg>`;
  const ICON = {
    write: SVG('<rect x="5" y="2" width="20" height="27" fill="#fff" stroke="#000"/><g fill="#000080"><rect x="8" y="6" width="14" height="2"/><rect x="8" y="10" width="11" height="1"/><rect x="8" y="13" width="14" height="1"/><rect x="8" y="16" width="9" height="1"/><rect x="8" y="19" width="12" height="1"/></g><path d="M20 26l8-12 2 2-8 12-3 1z" fill="#ff0" stroke="#000"/><rect x="19" y="27" width="2" height="2" fill="#000"/>'),
    calendar: SVG('<rect x="3" y="5" width="26" height="24" fill="#fff" stroke="#000"/><rect x="3" y="5" width="26" height="6" fill="#c00000" stroke="#000"/><rect x="8" y="2" width="2" height="6" fill="#404040"/><rect x="22" y="2" width="2" height="6" fill="#404040"/><g fill="#808080"><rect x="6" y="14" width="3" height="3"/><rect x="11" y="14" width="3" height="3"/><rect x="16" y="14" width="3" height="3"/><rect x="21" y="14" width="3" height="3"/><rect x="6" y="19" width="3" height="3"/><rect x="16" y="19" width="3" height="3"/><rect x="21" y="19" width="3" height="3"/><rect x="6" y="24" width="3" height="3"/><rect x="11" y="24" width="3" height="3"/></g><rect x="11" y="19" width="3" height="3" fill="#000080"/>'),
    cardfile: SVG('<rect x="10" y="3" width="19" height="13" fill="#fff" stroke="#000"/><rect x="6" y="8" width="19" height="13" fill="#fff" stroke="#000"/><rect x="2" y="13" width="20" height="15" fill="#fff" stroke="#000"/><rect x="3" y="17" width="18" height="1" fill="#c00000"/><g fill="#6090d0"><rect x="3" y="21" width="18" height="1"/><rect x="3" y="24" width="18" height="1"/></g><rect x="4" y="14" width="9" height="2" fill="#000"/>'),
    clock: SVG('<circle cx="16" cy="16" r="13" fill="#fff" stroke="#000" stroke-width="2" shape-rendering="auto"/><g fill="#000"><rect x="15" y="4" width="2" height="3"/><rect x="15" y="25" width="2" height="3"/><rect x="4" y="15" width="3" height="2"/><rect x="25" y="15" width="3" height="2"/></g><rect x="15" y="8" width="2" height="9" fill="#000080"/><rect x="15" y="15" width="8" height="2" fill="#000080"/><rect x="15" y="15" width="2" height="2" fill="#c00000"/>'),
    cdplayer: SVG('<rect x="1" y="17" width="30" height="12" fill="#c0c0c0" stroke="#000"/><rect x="4" y="20" width="10" height="5" fill="#000"/><rect x="5" y="21" width="2" height="3" fill="#ff0"/><rect x="8" y="21" width="2" height="3" fill="#ff0"/><polygon points="18,20 23,22.5 18,25" fill="#006000"/><rect x="25" y="20" width="4" height="5" fill="#000080"/><circle cx="16" cy="10" r="9" fill="#d8d8e8" stroke="#000" shape-rendering="auto"/><path d="M16 1a9 9 0 0 1 9 9h-6a3 3 0 0 0-3-3z" fill="#a8d8ff" shape-rendering="auto"/><circle cx="16" cy="10" r="2" fill="#fff" stroke="#000" shape-rendering="auto"/>'),
    music: SVG('<rect x="2" y="3" width="28" height="26" fill="#fff" stroke="#000"/><g fill="#c0c0c0"><rect x="2" y="9" width="28" height="1"/><rect x="2" y="15" width="28" height="1"/><rect x="2" y="21" width="28" height="1"/><rect x="9" y="3" width="1" height="26"/><rect x="16" y="3" width="1" height="26"/><rect x="23" y="3" width="1" height="26"/></g><rect x="3" y="22" width="6" height="6" fill="#e03030"/><rect x="10" y="16" width="6" height="5" fill="#f08020"/><rect x="17" y="10" width="6" height="5" fill="#30a030"/><rect x="24" y="4" width="5" height="5" fill="#3060e0"/><rect x="17" y="22" width="6" height="6" fill="#c08000"/>')
  };
  APPS.push(
    { id: 'write', help: 'A word processor: type letters and stories with bold, italics and fonts.', get label() { return screenEra() === '1990' ? 'Write' : 'Horizon Writer'; }, kind: 'builtin', cat: 'acc', eras: ['1990', '1995', '2000'], icon: ICON.write, window: { w: 660, h: 480 }, css: WRITE_CSS, open: openWrite },
    { id: 'calendar', help: 'Keep track of birthdays and plans, month by month.', label: 'Calendar', kind: 'builtin', cat: 'acc', eras: ['1990', '1995', '2000'], icon: ICON.calendar, window: { w: 600, h: 440 }, css: CAL_CSS, open: openCalendar },
    { id: 'cardfile', help: 'Index cards for addresses, recipes or anything you want to remember.', label: 'Cardfile', kind: 'builtin', cat: 'acc', eras: ['1990', '1995'], icon: ICON.cardfile, window: { w: 520, h: 400 }, css: CF_CSS, open: openCardfile },
    { id: 'clock', help: 'A clock with an alarm and a stopwatch.', label: 'Clock', kind: 'builtin', cat: 'acc', eras: ['1990', '1995', '2000'], icon: ICON.clock, window: { w: 320, h: 400 }, css: CLOCK_CSS, open: openClock },
    { id: 'cdplayer', get help() { return screenEra() === '2000' ? 'Play the music CD, or copy its songs to the Jukebox as MP3s.' : 'Play the music CD in the drive, with shuffle and repeat.'; }, label: 'CD Player', kind: 'builtin', cat: 'acc', eras: ['1995', '2000'], icon: ICON.cdplayer, window: { w: 420, h: 440 }, css: CD_CSS, open: openCD },
    { id: 'music', help: 'Compose your own songs on a grid of notes and play them back.', label: 'Music Maker', kind: 'builtin', cat: 'acc', eras: ['1990', '1995', '2000'], icon: ICON.music, window: { w: 660, h: 470 }, css: MM_CSS, open: openMusic }
  );
})();
