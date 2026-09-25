/* Calculator: a built-in accessory in every year. Also the reference example for js/apps/README.md. */
(window.RETRO_APPS = window.RETRO_APPS || []).push({
  id: 'calc', help: 'A calculator for everyday math.',
  label: 'Calculator',
  kind: 'builtin',
  eras: ['1985', '1990', '1995', '2000'],
  cmd: 'CALC',
  cat: 'acc',
  icon: '<svg viewBox="0 0 32 32" shape-rendering="crispEdges" aria-hidden="true"><rect x="6" y="2" width="20" height="28" fill="#c0c0c0" stroke="#000"/><rect x="9" y="5" width="14" height="6" fill="#9c9" stroke="#000"/><g fill="#fff" stroke="#000"><rect x="9" y="14" width="4" height="3"/><rect x="14" y="14" width="4" height="3"/><rect x="19" y="14" width="4" height="3"/><rect x="9" y="19" width="4" height="3"/><rect x="14" y="19" width="4" height="3"/><rect x="19" y="19" width="4" height="8" fill="#f66"/><rect x="9" y="24" width="9" height="3"/></g></svg>',
  window: { w: 230, fixed: true, autoH: true },
  css: `
    .calc{padding:8px;display:flex;flex-direction:column;gap:8px}
    .calc .scr{background:#fff;text-align:right;font:20px "Courier New",monospace;padding:4px 6px;overflow:hidden;white-space:nowrap}
    .calc .keys{display:grid;grid-template-columns:repeat(4,1fr);gap:4px}
    .calc .keys .btn{min-width:0;padding:6px 0}
    .calc .keys .op{color:#800000}
  `,
  open(W, api) {
    api.menubar([{ label: 'Edit', items: [{ label: 'Copy', fn: () => navigator.clipboard && navigator.clipboard.writeText(cur) }, { label: 'Clear', fn: () => press('C') }] }]);
    W.body.innerHTML = `<div class="calc"><div class="scr sunken" role="status">0</div><div class="keys">${['C', '±', '%', '/', '7', '8', '9', '*', '4', '5', '6', '-', '1', '2', '3', '+', '0', '.', '⌫', '='].map(k => `<button class="btn${'/*-+='.includes(k) ? ' op' : ''}" data-k="${k}">${k === '*' ? '×' : k === '/' ? '÷' : k}</button>`).join('')}</div></div>`;
    const scr = W.body.querySelector('.scr');
    let cur = '0', acc = null, op = null, fresh = true;
    const calc = (a, b, o) => o === '+' ? a + b : o === '-' ? a - b : o === '*' ? a * b : b === 0 ? NaN : a / b;
    const show = v => { cur = String(Number.isFinite(+v) ? +(+v).toPrecision(12) : 'Error'); scr.textContent = cur; };
    function press(k) {
      api.sfx.click();
      if (/\d/.test(k)) { cur = fresh || cur === '0' ? k : cur + k; fresh = false; scr.textContent = cur; }
      else if (k === '.') { if (fresh) { cur = '0.'; fresh = false; } else if (!cur.includes('.')) cur += '.'; scr.textContent = cur; }
      else if (k === 'C') { cur = '0'; acc = null; op = null; fresh = true; scr.textContent = cur; }
      else if (k === '⌫') { cur = cur.length > 1 ? cur.slice(0, -1) : '0'; scr.textContent = cur; }
      else if (k === '±') show(-cur);
      else if (k === '%') show(acc !== null ? acc * cur / 100 : cur / 100);
      else if (k === '=') { if (op) { const expr = `${+(+acc).toPrecision(12)} ${op} ${cur}`; show(calc(acc, +cur, op)); acc = null; op = null; fresh = true; if (cur !== 'Error') api.task('calc-result', { value: +cur, expr }); } }
      else { if (op && !fresh) show(calc(acc, +cur, op)); acc = +cur; op = k; fresh = true; }
    }
    W.body.querySelector('.keys').addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (b) press(b.dataset.k); });
    W.onKey = e => {
      const k = e.key === 'Enter' ? '=' : e.key === 'Backspace' ? '⌫' : e.key === 'Escape' ? 'C' : e.key;
      if ('0123456789.+-*/=%C⌫'.includes(k) && k.length) { e.preventDefault(); press(k); }
    };
  }
});
